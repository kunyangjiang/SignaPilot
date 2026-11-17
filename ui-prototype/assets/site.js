/* SignaPilot UI prototype — shared behaviour for every page. No dependencies. */
(function () {
  const D = window.SP;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const body = document.body, page = body.dataset.page, dept = body.dataset.dept || '';
  const qs = new URLSearchParams(location.search);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable: the preference just won't persist */ } },
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- fonts and shared SVG filters ---------- */
  // Open-licensed web fonts, served from this site (assets/fonts/). Every stack still falls back to system fonts.
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="assets/fonts.css">');
  body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="11"/></filter>
    <filter id="wob2" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
  </defs></svg>`);

  /* ---------- the nine hand-drawn objects (one per stage) ---------- */
  const WASH = ['#8fbcb1', '#e7a089', '#ecc56c', '#b3aed2'];
  const DRAW = [
    { w: '<ellipse cx="62" cy="64" rx="42" ry="24"/>', d: '<path d="M14 60c16-24 76-24 92 0c-16 24-76 24-92 0z"/><circle cx="60" cy="60" r="13"/><path d="M60 24v-10M36 30l-5-9M84 30l5-9"/>', dot: '<circle cx="60" cy="60" r="4.5"/>' },
    { w: '<circle cx="64" cy="62" r="32"/>', d: '<path d="M38 84c4-10 4-22 4-34a18 18 0 0 1 36 0c0 12 0 24 4 34z"/><path d="M52 92a8 8 0 0 0 16 0"/><path d="M60 32v-9"/><circle cx="60" cy="18" r="4.5"/>' },
    { w: '<rect x="30" y="34" width="62" height="60" rx="14"/>', d: '<path d="M30 30h52a8 8 0 0 1 8 8v48a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8z"/><path d="M30 38a8 8 0 0 1-8-8a8 8 0 0 1 8-8h52"/><path d="M42 48h36M42 60h36M42 72h24"/>' },
    { w: '<ellipse cx="62" cy="80" rx="30" ry="22"/>', d: '<path d="M50 18h20M54 18v28L34 86a10 10 0 0 0 9 14h34a10 10 0 0 0 9-14L66 46V18"/><path d="M42 76h36"/>', dot: '<circle cx="56" cy="88" r="3"/><circle cx="67" cy="83" r="2.2"/>' },
    { w: '<rect x="30" y="30" width="66" height="66" rx="16"/>', d: '<rect x="26" y="26" width="68" height="68" rx="6"/><path d="M40 46h40M40 60h16M64 60h16M40 74h40"/>' },
    { w: '<circle cx="62" cy="62" r="40"/>', d: '<circle cx="60" cy="60" r="38"/><path d="M60 26l30 52H30z"/><path d="M60 94L30 42h60z"/>', dot: '<circle cx="60" cy="60" r="4"/>' },
    { w: '<circle cx="44" cy="46" r="24"/>', d: '<circle cx="42" cy="42" r="16"/><circle cx="42" cy="42" r="5"/><path d="M54 54l40 40M80 80l10-10M88 88l8-8"/>' },
    { w: '<rect x="38" y="22" width="52" height="84" rx="12"/>', d: '<rect x="34" y="16" width="52" height="88" rx="6" transform="rotate(-6 60 60)"/><circle cx="60" cy="52" r="12"/><path d="M60 32v-6M60 78v-6M40 52h-5M85 52h-5M45 37l-4-4M75 37l4-4M45 67l-4 4M75 67l4 4M49 90h22"/>' },
    { w: '<ellipse cx="60" cy="58" rx="46" ry="20"/>', d: '<path d="M60 20v76M40 96h40M28 36h64"/><path d="M28 36l-12 30h24zM92 36l-12 30h24z"/><path d="M16 66a12 8 0 0 0 24 0M80 66a12 8 0 0 0 24 0"/>' },
  ];
  const draw = i => { const o = DRAW[i]; return `<svg class="draw" viewBox="0 0 120 120" aria-hidden="true"><g class="wash" fill="${WASH[i % 4]}" filter="url(#glow)">${o.w}</g><g class="ink" filter="url(#wob2)">${o.d}</g>${o.dot ? `<g class="dot">${o.dot}</g>` : ''}</svg>`; };
  const glyphSvg = g => `<svg class="glyph" viewBox="0 0 48 48" aria-hidden="true">${g}</svg>`;

  /* ---------- the generated writing ---------- */
  // One character: a few brush strokes in a cell, mostly verticals, horizontals and hooks. It belongs to no real script.
  function glyph(cx, x, y, s, alpha, rgb) {
    const n = 2 + (Math.random() * 4 | 0), pad = s * 0.16, w = s - pad * 2;
    cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = `rgba(${rgb},${alpha})`;
    for (let k = 0; k < n; k++) {
      const t = Math.random();
      let x0 = x + pad + rnd(0, w), y0 = y + pad + rnd(0, w), x1, y1;
      if (t < 0.38) { x1 = x0 + rnd(-w * .12, w * .12); y1 = y + pad + rnd(w * .5, w); y0 = y + pad + rnd(0, w * .35); }
      else if (t < 0.7) { x0 = x + pad + rnd(0, w * .3); x1 = x + pad + rnd(w * .6, w); y1 = y0 + rnd(-w * .1, w * .1); }
      else if (t < 0.9) { x1 = x0 + rnd(-w * .5, w * .5); y1 = y0 + rnd(w * .2, w * .6); }
      else { x1 = x0 + rnd(-3, 3); y1 = y0 + rnd(-3, 3); }
      const qx = (x0 + x1) / 2 + rnd(-w * .28, w * .28), qy = (y0 + y1) / 2 + rnd(-w * .28, w * .28);
      let px = x0, py = y0;
      for (let i = 1; i <= 10; i++) {
        const u = i / 10, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        const nx = a * x0 + b * qx + c * x1, ny = a * y0 + b * qy + c * y1;
        cx.beginPath(); cx.moveTo(px, py); cx.lineTo(nx, ny);
        cx.lineWidth = (0.6 + Math.sin(u * Math.PI) * 1.9) * (s / 38); cx.stroke();
        px = nx; py = ny;
      }
    }
  }
  // Fill a host element with writing. `setup(W, H, rect)` returns a weight function (x, y) -> 0..1 that says how
  // strongly the writing shows at each point, so it can thin out around titles and drawings.
  const fields = [];
  function field(host, setup, strength, opt = {}) {
    const cv = document.createElement('canvas'); cv.className = 'script'; cv.setAttribute('aria-hidden', 'true');
    host.prepend(cv);
    const cx = cv.getContext('2d'); let cells = [], cs = 38, timer = 0, rgb = '236,232,220';
    const write = c => {
      cx.clearRect(c.x - 1, c.y - 1, cs + 2, cs + 2);
      if (Math.random() < 0.03) { cx.fillStyle = `rgba(210,179,119,${0.9 * c.a})`; cx.beginPath(); cx.arc(c.x + cs / 2, c.y + cs / 2, 2.6, 0, 7); cx.fill(); }
      else glyph(cx, c.x, c.y, cs, rnd(0.28, 0.62) * c.a, rgb);
    };
    function start() {
      const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
      clearInterval(timer); if (!W || !H) return;
      rgb = getComputedStyle(cv).getPropertyValue('--script').trim() || rgb;
      cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // opt.cs / opt.lead / opt.skip let one page ask for tighter writing (smaller cells, closer rows, fewer gaps)
      cs = opt.cs ? opt.cs(W) : W < 700 ? 30 : 38;
      const lead = cs * (opt.lead || 1.25), skip = opt.skip ?? 0.12;
      const cols = Math.floor((W - 20) / cs), rows = Math.max(1, Math.floor((H - 10) / lead));
      const ox = (W - cols * cs) / 2, oy = (H - rows * lead) / 2, weight = setup(W, H, cv.getBoundingClientRect());
      cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = ox + c * cs, y = oy + r * lead, a = weight(x + cs / 2, y + cs / 2) * (strength || 1);
        if (Math.random() > skip && a > 0.05) cells.push({ x, y, a });
      }
      cells.forEach(write);
      // a few characters are rewritten every moment, so the page never quite settles
      if (!reduced) timer = setInterval(() => { if (cells.length) write(cells[Math.random() * cells.length | 0]); }, 70);
    }
    host.addEventListener('pointermove', e => {
      const b = cv.getBoundingClientRect(), mx = e.clientX - b.left, my = e.clientY - b.top;
      for (const c of cells) { const dx = c.x + cs / 2 - mx, dy = c.y + cs / 2 - my; if (dx * dx + dy * dy < 4900 && Math.random() < 0.25) write(c); }
    });
    fields.push(start); start();
    return start;
  }
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => fields.forEach(f => f()), 160); });
  // weight helpers: fade toward an element's box, measured in the canvas's own coordinates
  const around = (el, rect, grow, a, b) => {
    const r = el.getBoundingClientRect(); if (!r.width) return () => 1;
    const cx0 = r.left - rect.left + r.width / 2, cy0 = r.top - rect.top + r.height / 2, rx = r.width / 2 * grow[0], ry = r.height / 2 * grow[1];
    return (x, y) => smooth(a, b, Math.hypot((x - cx0) / rx, (y - cy0) / ry));
  };

  /* ---------- catalogue helpers ---------- */
  const caseById = id => D.cases.find(c => c.id === id);
  const lessonHref = id => `lesson.html?c=${id}`;
  const caseHref = id => `case.html?c=${id}`;

  /* ---------- the shape of the curriculum: four parts, nine stages ---------- */
  // Grouping follows the master plan's outer logic. It is navigation copy, not a change to the sealed catalogue.
  const PARTS = [
    { id: 'p1', n: '一', name: '学会读符号', note: '两个阶段的方法。之后读到的一切，都要用到它们。', groups: [{ id: 'g-method', stages: ['01', '02'] }] },
    { id: 'p2', n: '二', name: '走进历史世界', note: '三条历史线彼此平行，不分先后，可以任选一条开始。', groups: [{ id: 'g-west', name: '地中海与欧洲', stages: ['03', '04'] }, { id: 'g-china', name: '中国', stages: ['05'] }, { id: 'g-asia', name: '亚洲其他传统', stages: ['06'] }] },
    { id: 'p3', n: '三', name: '追踪现代的变化', note: '各条线在近现代汇合：旧的象征被重新组织，再进入今天的媒介。', groups: [{ id: 'g-modern', stages: ['07', '08'] }] },
    { id: 'p4', n: '四', name: '回到比较与判断', note: '最后一个阶段：一种解释，凭什么可信。', groups: [{ id: 'g-judge', stages: ['09'] }] },
  ];
  const partOf = sid => PARTS.find(p => p.groups.some(g => g.stages.includes(sid)));
  // The route rail: nine numbered stops in four groups. It appears on the overview, on every stage and on every lesson,
  // so a reader always sees how many stages there are and which one they are in.
  const rail = (current, named) => `<nav class="rail ${named ? 'rail--named' : ''}" aria-label="课程路线：四个部分，九个阶段">${PARTS.map(p => `<span class="rail-g"><span>${p.groups.flatMap(g => g.stages).map(sid => {
    const s = D.stages.find(x => x.id === sid);
    return `<a href="stage.html?s=${sid}" class="${sid === current ? 'on' : ''}" title="Stage ${Number(sid)} · ${esc(s.title)}"${sid === current ? ' aria-current="true"' : ''}>${Number(sid)}</a>`;
  }).join('')}</span>${named ? `<small>${p.name}</small>` : ''}</span>`).join('')}</nav>`;

  /* ---------- chrome ---------- */
  const isReader = page === 'lesson' || page === 'case';
  if (isReader) body.classList.add('reader');
  // day or night is one choice for the whole site (each page's <head> applies it before first paint)
  document.documentElement.classList.toggle('day', store.get('sp-day') === '1');
  /* back: go to the page the reader came from, at the place they left it */
  // Where "back" goes when there is no in-site page to return to (a link opened directly, a new tab).
  const parentHref = (() => {
    const c = qs.get('c') || '';
    if (page === 'lesson') return `stage.html?s=${(D.courseIndex[c] ? c : '05-06').slice(0, 2)}`;
    if (page === 'stage') return `knowledge.html#st-${qs.get('s') || '05'}`;
    if (page === 'case') return 'cases.html';
    if (page === 'notes') return `case.html?c=${c || '01'}`;
    return 'index.html';
  })();
  // Pages here are drawn by script, so the browser cannot be trusted to put the reader back where they were.
  // Each page records its own scroll position (and anything that changes its height) and restores it on a back/forward visit.
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const isBack = !!nav && nav.type === 'back_forward';
  const POS_KEY = 'sp-pos:' + location.pathname + location.search;
  const sess = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* position just won't be remembered */ } },
  };
  if (page !== 'home') {
    try { history.scrollRestoration = 'manual'; } catch (e) { /* older browsers keep their own behaviour */ }
    let st = 0;
    const save = () => sess.set(POS_KEY, { y: Math.round(scrollY), open: !!($('.all') && $('.all').open), filter: ($('#filters [aria-pressed="true"]') || {}).textContent || '' });
    addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(save, 120); }, { passive: true });
    addEventListener('pagehide', save);
    // phones do not always deliver the last scroll event or pagehide before leaving: record the place on the way out too
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
    document.addEventListener('click', e => { if (e.target.closest('a[href]')) { clearTimeout(st); save(); } }, true);
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-back]'); if (!b) return;
      let sameSite = false; try { sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (err) { /* no usable referrer */ }
      if (sameSite && history.length > 1) { e.preventDefault(); save(); history.back(); }
    });
  }
  /* reading position: lessons and stories remember how far the reader got, across visits */
  // Unlike the session memory above, this is kept in localStorage and applies however the reader arrives:
  // a refresh, a link from the home page, the back button. Pressing "back to top" or "从头读" clears it.
  const readerNow = page === 'lesson' || page === 'case';
  const readId = page === 'lesson' ? (D.courseIndex[qs.get('c')] ? qs.get('c') : '05-06') : (D.cases.some(c => c.id === qs.get('c')) ? qs.get('c') : '01');
  const READ_KEY = `sp-read:${page}:${readId}`;
  const reading = {
    get() { try { return JSON.parse(localStorage.getItem(READ_KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { if (v) localStorage.setItem(READ_KEY, JSON.stringify(v)); else localStorage.removeItem(READ_KEY); } catch (e) { /* not remembered */ } },
  };
  // Until the saved place has been restored, scrolling must not overwrite it (the page is still growing as text and fonts arrive).
  let holdSave = readerNow && !!reading.get();
  if (holdSave) setTimeout(() => { holdSave = false; }, 6000);
  // After "back to top" the page is still gliding upward; leaving mid-glide must not save a half-way position.
  let resetting = false;
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, () => { resetting = false; }, { passive: true }));
  function saveReading() {
    if (resetting) { if (scrollY <= 4) resetting = false; return; }
    if (!readerNow || holdSave) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    reading.set(scrollY <= 4 || max <= 0 ? null : { y: Math.round(scrollY), r: +(scrollY / max).toFixed(4), w: innerWidth });
  }
  function resumeNote() {
    const n = document.createElement('div');
    n.className = 'resume-note'; n.setAttribute('role', 'status');
    n.innerHTML = '<span>已回到上次读到的位置</span><button type="button">从头读</button>';
    body.appendChild(n);
    void n.offsetWidth; n.classList.add('is-on');           // reflow first, so it fades in
    const close = () => { n.classList.remove('is-on'); setTimeout(() => n.remove(), 400); };
    $('button', n).addEventListener('click', () => { reading.set(null); scrollTo({ top: 0, behavior: 'instant' }); close(); });
    setTimeout(close, 7000);
  }
  function resumeReading() {
    if (!readerNow) return;
    const p = reading.get();
    if (!p || location.hash || p.y < innerHeight * 0.5) { holdSave = false; return; }   // near the top is not worth a jump
    const max = () => document.documentElement.scrollHeight - innerHeight;
    // same window width: the exact pixel position; a different width reflows the text, so use the fraction read instead
    const where = () => Math.abs((p.w || 0) - innerWidth) < 40 ? Math.min(p.y, max()) : Math.round(p.r * max());
    let live = true; const stop = () => { live = false; holdSave = false; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => addEventListener(ev, stop, { once: true, passive: true }));
    const go = () => { if (live) scrollTo(0, where()); };
    go(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    addEventListener('load', go); setTimeout(go, 400); setTimeout(() => { go(); live = false; holdSave = false; }, 900);
    resumeNote();
  }

  function restorePosition() {
    if (readerNow) return false;                              // readers use the long-lived reading position instead
    const p = isBack && sess.get(POS_KEY); if (!p) return false;
    if (p.open && $('.all')) $('.all').open = true;
    if (p.filter) { const b = $$('#filters button').find(x => x.textContent === p.filter); if (b) b.click(); }
    holdPosition(p.y);
    return true;
  }
  // Layout keeps settling while web fonts and figures arrive, and on a phone that can take seconds, so keep putting the
  // page back while it is still growing. Stop the moment the reader scrolls themselves; a plain tap does not count.
  function holdPosition(y) {
    let live = true, fontsIn = !document.fonts, loaded = document.readyState === 'complete', t0 = Date.now();
    const stop = () => { live = false; if (ro) ro.disconnect(); };
    ['wheel', 'touchmove', 'keydown'].forEach(ev => addEventListener(ev, stop, { once: true, passive: true }));
    const go = () => { if (!live) return; if (Math.abs(scrollY - y) > 2) scrollTo(0, y); if ((fontsIn && loaded && Date.now() - t0 > 1200) || Date.now() - t0 > 5000) stop(); };
    const ro = window.ResizeObserver ? new ResizeObserver(go) : null;
    if (ro) ro.observe(document.documentElement);
    go();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fontsIn = true; go(); });
    addEventListener('load', () => { loaded = true; go(); });
    [200, 600, 1300, 2500, 5100].forEach(ms => setTimeout(go, ms));
  }
  // A page the browser kept whole in its back/forward cache does not run this script again. Phones may still hand it
  // back scrolled to the top (scroll restoration is manual here), so put it where the reader left it.
  addEventListener('pageshow', e => {
    if (!e.persisted || readerNow || page === 'home') return;
    const p = sess.get(POS_KEY);
    if (p && Math.abs(scrollY - p.y) > 2) holdPosition(p.y);
  });

  const G = {
    home: '<circle cx="24" cy="24" r="15"/><path d="M24 24l10.5-10.5"/>', k: D.stages[0].glyph,
    c: '<rect x="11" y="7" width="26" height="34"/><path d="M17 7v34"/>', search: '<circle cx="21" cy="21" r="11"/><path d="M29 29l11 11"/>',
  };
  body.insertAdjacentHTML('afterbegin', `
    <header class="top"><div class="wrap">
      <a class="brand" href="index.html">SignaPilot</a>
      <a class="back" href="${parentHref}" data-back aria-label="返回上一页"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg><span>返回</span></a>
      <nav aria-label="主导航">
        <a href="knowledge.html" class="${dept === 'k' ? 'on' : ''}"${dept === 'k' ? ' aria-current="page"' : ''}>Knowledge<small>知识</small></a>
        <a href="cases.html" class="${dept === 'c' ? 'on' : ''}"${dept === 'c' ? ' aria-current="page"' : ''}>Cases<small>小说</small></a>
      </nav>
      <span class="sp"></span>
      <button class="search-btn" type="button" data-search><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg><span>搜索</span><kbd>/</kbd></button>
    </div></header>`);
  body.insertAdjacentHTML('beforeend', `
    <nav class="tabbar" aria-label="底部导航">
      <a href="index.html">${glyphSvg(G.home)}首页</a>
      <a href="knowledge.html" class="${dept === 'k' ? 'on' : ''}">${glyphSvg(G.k)}Knowledge</a>
      <a href="cases.html" class="${dept === 'c' ? 'on' : ''}">${glyphSvg(G.c)}Cases</a>
      <button type="button" data-search>${glyphSvg(G.search)}搜索</button>
    </nav>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="搜索"><div class="wrap">
      <div class="sheet-head"><input type="search" placeholder="搜课程、小说、主题…" aria-label="搜索"><button type="button" data-close>关闭 Esc</button></div>
      <div class="res"></div>
    </div></div>`);

  /* the bar is see-through over the page head; once anything scrolls beneath it, it turns into a solid shelf */
  { const bar = $('.top'), stick = () => bar.classList.toggle('stuck', scrollY > 4); addEventListener('scroll', stick, { passive: true }); stick(); }

  /* search: a plain client-side filter over the 61 + 14 catalogue entries */
  const sheet = $('.sheet'), input = $('.sheet input'), res = $('.res');
  const items = D.allCourses.map(c => ({ k: 1, id: c.id, t: c.title, s: c.scope, href: lessonHref(c.id) }))
    .concat(D.cases.map(c => ({ k: 0, id: 'C' + c.id, t: c.title, s: c.genre + ' · ' + c.premise, href: caseHref(c.id) })));
  const row = i => `<a href="${i.href}"><span class="mono">${i.id}</span><span><span class="t">${esc(i.t)}</span><span class="s">${esc(i.s)}</span></span></a>`;
  function render(q) {
    q = q.trim().toLowerCase();
    if (!q) { res.innerHTML = `<h3 class="label">顺着一条线索读</h3>` + D.threads.map(t => `<a href="#" data-thread="${esc(t.name)}"><span class="mono">线索</span><span><span class="t">${esc(t.name)}</span><span class="s">${esc(t.note)}</span></span></a>`).join(''); return; }
    const hit = items.filter(i => (i.id + i.t + i.s).toLowerCase().includes(q));
    if (!hit.length) { res.innerHTML = `<p class="empty">没有找到“${esc(q)}”。试试课号（如 05-06）或一个主题词。</p>`; return; }
    const ks = hit.filter(i => i.k), cs = hit.filter(i => !i.k);
    res.innerHTML = (ks.length ? `<h3 class="label">Knowledge · ${ks.length}</h3>` + ks.map(row).join('') : '') + (cs.length ? `<h3 class="label">Cases · ${cs.length}</h3>` + cs.map(row).join('') : '');
  }
  function renderThread(name) {
    const t = D.threads.find(x => x.name === name); if (!t) return;
    res.innerHTML = `<h3 class="label">线索 · ${esc(t.name)}</h3>` + t.items.map(id => items.find(i => i.id === id)).filter(Boolean).map(row).join('');
  }
  const openSheet = () => { sheet.classList.add('open'); input.value = ''; render(''); input.focus(); };
  const closeSheet = () => sheet.classList.remove('open');
  document.addEventListener('click', e => {
    if (e.target.closest('[data-search]')) openSheet();
    if (e.target.closest('[data-close]')) closeSheet();
    const th = e.target.closest('[data-thread]');
    if (th) { e.preventDefault(); sheet.classList.add('open'); input.value = ''; renderThread(th.dataset.thread); }
  });
  input.addEventListener('input', () => render(input.value));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSheet(); }
  });

  /* day / night: the same button in the same corner of every page; the choice is kept for the whole site */
  body.insertAdjacentHTML('beforeend', '<div class="tools"><button type="button" data-day aria-label="切换日间与夜间"></button></div>');
  {
    const root = document.documentElement, dayBtn = $('[data-day]');
    const syncDay = () => { dayBtn.textContent = root.classList.contains('day') ? '夜' : '昼'; };
    syncDay();
    dayBtn.addEventListener('click', () => { store.set('sp-day', root.classList.toggle('day') ? '1' : '0'); syncDay(); fields.forEach(f => f()); });
    // another tab changed it, or this page came back from the back/forward cache
    const follow = () => { const on = store.get('sp-day') === '1'; if (on !== root.classList.contains('day')) { root.classList.toggle('day', on); syncDay(); fields.forEach(f => f()); } };
    addEventListener('storage', follow); addEventListener('pageshow', follow);
  }

  /* readers: hairline progress, chrome steps aside while reading down, type size and day/night */
  if (isReader) {
    body.insertAdjacentHTML('beforeend', '<div class="bar"></div>');
    $('.tools').insertAdjacentHTML('afterbegin', '<button type="button" data-fs="1" aria-label="放大字号">大</button><button type="button" data-fs="-1" aria-label="缩小字号">小</button>');
    const bar = $('.bar'), top = $('.top');
    let last = 0, readTimer = 0;
    const onScroll = () => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      top.classList.toggle('hide', y > last && y > 200); last = y;
      clearTimeout(readTimer); readTimer = setTimeout(saveReading, 150);
    };
    addEventListener('pagehide', saveReading);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    const target = $('.story') || $('.prose');
    let fs = parseFloat(store.get('sp-fs') || '0'), base = target ? parseFloat(getComputedStyle(target).fontSize) : 0;
    const applyFs = () => { if (target) target.style.fontSize = fs ? (base + fs) + 'px' : ''; };
    applyFs();
    $('.tools').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fs) { fs = Math.max(-2, Math.min(4, fs + Number(b.dataset.fs))); store.set('sp-fs', String(fs)); applyFs(); }
    });
  }

  // every page head carries a band of writing: dense at the far side, gone by the time it reaches the title
  const headField = el => field(el, (W, H, rect) => {
    const clear = $('.stage-num', el) ? around($('.stage-num', el), rect, [1.5, 1.5], 0.7, 1.5) : () => 1;
    // wide: the right half of the band. phone: only a small tuft in the top corner, above the title, never across it
    if (W < 700) return (x, y) => smooth(0.5, 1, x / W) * (1 - smooth(0.06, 0.24, y / H)) * 0.8;
    return (x, y) => smooth(0.48, 1, x / W) * (1 - smooth(0.62, 1, y / H)) * clear(x, y);
  }, 0.9);

  /* ---------- written content ---------- */
  // Finished manuscripts live as Markdown under content/. Cases not listed here still show the layout sample.
  const WRITTEN = {
    '01': { story: 'content/cases/c01.md', notes: 'content/cases/c01-notes.md' },
    '02': { story: 'content/cases/c02.md', notes: 'content/cases/c02-notes.md' },
    '03': { story: 'content/cases/c03.md', notes: 'content/cases/c03-notes.md' },
    '04': { story: 'content/cases/c04.md', notes: 'content/cases/c04-notes.md' },
    '05': { story: 'content/cases/c05.md', notes: 'content/cases/c05-notes.md' },
    '06': { story: 'content/cases/c06.md', notes: 'content/cases/c06-notes.md' },
    '07': { story: 'content/cases/c07.md', notes: 'content/cases/c07-notes.md' },
    '08': { story: 'content/cases/c08.md', notes: 'content/cases/c08-notes.md' },
    '09': { story: 'content/cases/c09.md', notes: 'content/cases/c09-notes.md' },
    '10': { story: 'content/cases/c10.md', notes: 'content/cases/c10-notes.md' },
    '11': { story: 'content/cases/c11.md', notes: 'content/cases/c11-notes.md' },
    '12': { story: 'content/cases/c12.md', notes: 'content/cases/c12-notes.md' },
    '13': { story: 'content/cases/c13.md', notes: 'content/cases/c13-notes.md' },
    '14': { story: 'content/cases/c14.md', notes: 'content/cases/c14-notes.md' },
    '15': { story: 'content/cases/c15.md', notes: 'content/cases/c15-notes.md' },
    '16': { story: 'content/cases/c16.md', notes: 'content/cases/c16-notes.md' },
    '17': { story: 'content/cases/c17.md', notes: 'content/cases/c17-notes.md' },
    '18': { story: 'content/cases/c18.md', notes: 'content/cases/c18-notes.md' },
    '19': { story: 'content/cases/c19.md', notes: 'content/cases/c19-notes.md' },
    '20': { story: 'content/cases/c20.md', notes: 'content/cases/c20-notes.md' },
    '21': { story: 'content/cases/c21.md', notes: 'content/cases/c21-notes.md' },
    '22': { story: 'content/cases/c22.md', notes: 'content/cases/c22-notes.md' },
    '23': { story: 'content/cases/c23.md', notes: 'content/cases/c23-notes.md' },
    '24': { story: 'content/cases/c24.md', notes: 'content/cases/c24-notes.md' },
    '25': { story: 'content/cases/c25.md', notes: 'content/cases/c25-notes.md' },
    '26': { story: 'content/cases/c26.md', notes: 'content/cases/c26-notes.md' },
    '27': { story: 'content/cases/c27.md', notes: 'content/cases/c27-notes.md' },
    '28': { story: 'content/cases/c28.md', notes: 'content/cases/c28-notes.md' },
  };
  const inline = s => esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="ext" href="$2" target="_blank" rel="noopener">$1</a>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  // A deliberately small Markdown reader: just the handful of block types the manuscripts use.
  function blocks(text) {
    const L = text.replace(/\r/g, '').split('\n'), out = []; let i = 0;
    const run = (re, strip) => { const b = []; while (i < L.length && re.test(L[i])) b.push(strip(L[i++])); return b; };
    while (i < L.length) {
      const l = L[i];
      if (!l.trim()) i++;
      else if (/^# /.test(l)) { out.push({ t: 'h1', s: l.slice(2) }); i++; }
      else if (/^## /.test(l)) { out.push({ t: 'h2', s: l.slice(3) }); i++; }
      else if (/^-{3,}\s*$/.test(l)) { out.push({ t: 'hr' }); i++; }
      else if (/^\*\s\*\s\*\s*$/.test(l)) { out.push({ t: 'gap' }); i++; }
      else if (/^>/.test(l)) out.push({ t: 'quote', s: run(/^>/, x => x.replace(/^>\s?/, '')) });
      else if (/^\|/.test(l)) out.push({ t: 'table', rows: run(/^\|/, x => x.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())).filter(r => !r.every(c => /^:?-+:?$/.test(c))) });
      else if (/^- /.test(l)) out.push({ t: 'ul', it: run(/^- /, x => x.slice(2)) });
      else if (/^!\[.*\]\(.+\)\s*$/.test(l)) { const m = l.match(/^!\[(.*)\]\((.+)\)/); out.push({ t: 'img', cap: m[1], src: m[2] }); i++; }
      else { out.push({ t: 'p', s: l }); i++; }
    }
    return out;
  }
  const table = b => `<div class="tblwrap"><table><thead><tr>${b.rows[0].map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.slice(1).map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  // Figures are original SVG drawings stored next to the manuscript. They are fetched and placed inline rather than
  // shown as <img>, so their lines follow the page's ink colour, day or night, and share its hand-drawn filter.
  const figure = (b, base = 'content/cases/', no = '') => `<figure class="fig ill" data-src="${base}${esc(b.src)}"><div class="fig-frame"></div>${b.cap ? `<figcaption>${no ? `<b>图 ${no}</b>` : ''}${inline(b.cap)}</figcaption>` : ''}</figure>`;
  const placeFigures = root => $$('figure.ill[data-src]', root).forEach(f => load(f.dataset.src)
    .then(svg => { if (/^\s*<svg[\s>]/.test(svg)) $('.fig-frame', f).innerHTML = svg; else f.remove(); })
    .catch(() => f.remove()));
  // Fiction: nothing but the story. Front matter is dropped; "## 一" becomes a chapter mark; lines the manuscript
  // indents with full-width spaces are documents quoted inside the story (a chart, a note, a log entry).
  function storyHtml(text) {
    const bs = blocks(text), start = bs.findIndex(b => b.t === 'h2' && b.s.trim() !== '人物');
    return bs.slice(start).map(b => {
      if (b.t === 'h2') return `<p class="chap"><span>${esc(b.s)}</span></p>`;
      if (b.t === 'gap') return '<div class="gap"></div>';
      if (b.t === 'table') return table(b);
      if (b.t === 'img') return figure(b);
      if (b.t !== 'p') return '';
      if (/^　　/.test(b.s)) return `<p class="rec">${inline(b.s.trim())}</p>`;
      if (/^\*\*[^*]+\*\*$/.test(b.s)) return `<p class="mark">${inline(b.s)}</p>`;
      return `<p>${inline(b.s)}</p>`;
    }).join('');
  }
  // Who is who: every story opens with a "## 人物" section in its manuscript. It is shown on its own, before and
  // outside the story text: a line of setup, then groups (a bold line) of people ("- **名字**：一句话").
  function castHtml(text) {
    const bs = blocks(text), a = bs.findIndex(b => b.t === 'h2' && b.s.trim() === '人物');
    if (a < 0) return '';
    let end = bs.findIndex((b, k) => k > a && b.t === 'h2'); if (end < 0) end = bs.length;
    let intro = '', groups = [], cur = null;
    bs.slice(a + 1, end).forEach(b => {
      if (b.t === 'p' && /^\*\*[^*]+\*\*$/.test(b.s)) { cur = { name: b.s.replace(/\*/g, ''), who: [] }; groups.push(cur); }
      else if (b.t === 'p') intro += `<p class="cast-intro">${inline(b.s)}</p>`;
      else if (b.t === 'ul') { if (!cur) { cur = { name: '', who: [] }; groups.push(cur); } b.it.forEach(x => { const m = x.match(/^\*\*(.+?)\*\*[：:]\s*(.+)$/); cur.who.push(m ? { n: m[1].replace(/\*\*/g, ''), d: m[2] } : { n: '', d: x }); }); }
    });
    return `<h2 class="label">本篇人物</h2>${intro}<div class="cast-groups">${groups.map(g => `<section>${g.name ? `<h3>${esc(g.name)}</h3>` : ''}<dl>${g.who.map(w => `<div><dt>${esc(w.n)}</dt><dd>${inline(w.d)}</dd></div>`).join('')}</dl></section>`).join('')}</div>`;
  }
  // Notes: sections come from "## 一、标题"; evidence tags in full-width brackets get their own style;
  // a list item that starts with a course number becomes a link to that lesson.
  function notesHtml(text) {
    const tag = h => h.replace(/［(已核|待核)([^］]*)］/g, '<span class="ev ev-$1">$1$2</span>');
    const secs = []; let cur = null;
    blocks(text).forEach(b => {
      if (b.t === 'h2') { const m = b.s.match(/^(.+?)、(.+)$/); cur = { n: m ? m[1] : '', title: m ? m[2] : b.s, html: '' }; secs.push(cur); return; }
      if (!cur) return;
      if (b.t === 'p') cur.html += /^　　/.test(b.s) ? `<p class="rec">${tag(inline(b.s.trim()))}</p>` : `<p>${tag(inline(b.s))}</p>`;
      else if (b.t === 'table') cur.html += tag(table(b));
      else if (b.t === 'img') cur.html += figure(b);
      else if (b.t === 'ul') cur.html += `<ul class="reading">${b.it.map(x => { const m = x.match(/^(\d\d-\d\d)\s+(.+)$/); return m && D.courseIndex[m[1]] ? `<li><a href="${lessonHref(m[1])}"><span class="mono">${m[1]}</span> ${esc(m[2])}</a></li>` : `<li>${tag(inline(x))}</li>`; }).join('')}</ul>`;
    });
    return {
      nav: secs.map((s, k) => `<a href="#n${k + 1}">${esc(s.title)}</a>`).join(''),
      body: secs.map((s, k) => `<section id="n${k + 1}"><h2>${s.n ? `<span class="mono">${esc(s.n)}</span>` : ''}${esc(s.title)}</h2>${s.html}</section>`).join(''),
    };
  }
  // 'no-cache' makes the browser check with the server each time, so an edited manuscript shows up on reload
  const load = url => fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); });

  // Knowledge courses that have their own manuscript, with the state shown for them: 'done' once the PO has sealed the
  // course, 'draft' while it waits for review. Every other course still shows the layout sample, labelled as such.
  const WRITTEN_K = {
    '01-01': { src: 'content/knowledge/01-01.md', state: 'done' },
    '01-02': { src: 'content/knowledge/01-02.md', state: 'done' },
    '01-03': { src: 'content/knowledge/01-03.md', state: 'done' },
    '01-04': { src: 'content/knowledge/01-04.md', state: 'done' },
    '01-05': { src: 'content/knowledge/01-05.md', state: 'done' },
    '01-06': { src: 'content/knowledge/01-06.md', state: 'done' },
    '01-07': { src: 'content/knowledge/01-07.md', state: 'done' },
    '02-01': { src: 'content/knowledge/02-01.md', state: 'done' },
    '02-02': { src: 'content/knowledge/02-02.md', state: 'done' },
    '02-03': { src: 'content/knowledge/02-03.md', state: 'done' },
    '02-04': { src: 'content/knowledge/02-04.md', state: 'done' },
    '02-05': { src: 'content/knowledge/02-05.md', state: 'done' },
    '03-01': { src: 'content/knowledge/03-01.md', state: 'done' },
    '03-02': { src: 'content/knowledge/03-02.md', state: 'done' },
    '03-03': { src: 'content/knowledge/03-03.md', state: 'done' },
    '03-04': { src: 'content/knowledge/03-04.md', state: 'done' },
    '03-05': { src: 'content/knowledge/03-05.md', state: 'done' },
    '03-06': { src: 'content/knowledge/03-06.md', state: 'done' },
    '04-01': { src: 'content/knowledge/04-01.md', state: 'done' },
    '04-02': { src: 'content/knowledge/04-02.md', state: 'done' },
    '04-03': { src: 'content/knowledge/04-03.md', state: 'done' },
    '04-04': { src: 'content/knowledge/04-04.md', state: 'done' },
    '04-05': { src: 'content/knowledge/04-05.md', state: 'done' },
    '04-06': { src: 'content/knowledge/04-06.md', state: 'done' },
    '04-07': { src: 'content/knowledge/04-07.md', state: 'done' },
    '05-01': { src: 'content/knowledge/05-01.md', state: 'done' },
    '05-02': { src: 'content/knowledge/05-02.md', state: 'done' },
    '05-03': { src: 'content/knowledge/05-03.md', state: 'done' },
    '05-04': { src: 'content/knowledge/05-04.md', state: 'done' },
    '05-05': { src: 'content/knowledge/05-05.md', state: 'done' },
    '05-06': { src: 'content/knowledge/05-06.md', state: 'done' },
    '05-07': { src: 'content/knowledge/05-07.md', state: 'done' },
    '05-08': { src: 'content/knowledge/05-08.md', state: 'done' },
    '05-09': { src: 'content/knowledge/05-09.md', state: 'done' },
    '06-01': { src: 'content/knowledge/06-01.md', state: 'done' },
    '06-02': { src: 'content/knowledge/06-02.md', state: 'done' },
    '06-03': { src: 'content/knowledge/06-03.md', state: 'done' },
    '06-04': { src: 'content/knowledge/06-04.md', state: 'done' },
    '06-05': { src: 'content/knowledge/06-05.md', state: 'done' },
    '06-06': { src: 'content/knowledge/06-06.md', state: 'done' },
    '06-07': { src: 'content/knowledge/06-07.md', state: 'done' },
    '07-01': { src: 'content/knowledge/07-01.md', state: 'done' },
    '07-02': { src: 'content/knowledge/07-02.md', state: 'done' },
    '07-03': { src: 'content/knowledge/07-03.md', state: 'done' },
    '07-04': { src: 'content/knowledge/07-04.md', state: 'done' },
    '07-05': { src: 'content/knowledge/07-05.md', state: 'done' },
    '07-06': { src: 'content/knowledge/07-06.md', state: 'done' },
    '07-07': { src: 'content/knowledge/07-07.md', state: 'done' },
    '07-08': { src: 'content/knowledge/07-08.md', state: 'done' },
    '08-01': { src: 'content/knowledge/08-01.md', state: 'done' },
    '08-02': { src: 'content/knowledge/08-02.md', state: 'done' },
    '08-03': { src: 'content/knowledge/08-03.md', state: 'done' },
  };
  const K_STATE = { done: '已完成', draft: '初稿 · 待审读' };
  // A course manuscript: "# 标题", an optional "> 初稿…" status line, a lead paragraph, "**…**" question lines,
  // "## 一、标题" sections, "> 引文" ending in "> —— 出处", figures, numbered notes ("[^3]" in the text, "[^3]: …" on
  // a line of its own, shown in the margin), one fenced ```widget block per interactive figure, and a closing
  // "## 参考与出处" list.
  function lessonHtml(text) {
    const widgets = [];
    text = text.replace(/\r/g, '').replace(/^```widget\n([\s\S]*?)\n```$/gm, (_, j) => `@@widget${widgets.push(JSON.parse(j)) - 1}@@`);
    const notes = {};
    text = text.replace(/^\[\^(\d+)\]:\s*(.+)$/gm, (_, n, s) => { notes[n] = s; return ''; });
    const seen = new Set();
    // a note sits in the margin beside the paragraph that first points to it
    const withNotes = s => {
      let pre = '';
      const body = inline(s).replace(/\[\^(\d+)\]/g, (_, n) => {
        if (!seen.has(n) && notes[n]) { seen.add(n); pre += `<span class="sn" id="sn${n}"><b>${n}</b>${inline(notes[n])}</span>`; }
        return `<a class="cite" href="#sn${n}" data-n="${n}" aria-label="注 ${n}">${n}</a>`;
      });
      return { pre, body };
    };
    let status = '', lead = true, fig = 0, refs = false, html = '';
    blocks(text).forEach(b => {
      if (b.t === 'h1') return;
      if (b.t === 'quote' && !html && /^(初稿|修订稿|定稿)/.test(b.s[0])) { status = b.s[0]; return; }
      if (b.t === 'h2') {
        if (b.s.trim() === '参考与出处') { refs = true; html += '<section class="refs" id="refs"><h2>参考与出处</h2>'; return; }
        const m = b.s.match(/^(.+?)、(.+)$/);
        html += `<h2>${m ? `<span class="mono">${esc(m[1])}</span>${esc(m[2])}` : esc(b.s)}</h2>`; return;
      }
      if (refs) { if (b.t === 'ul') html += `<ol>${b.it.map((x, k) => `<li data-n="${k + 1}"><b>${k + 1}</b><span>${inline(x)}</span></li>`).join('')}</ol>`; return; }
      if (b.t === 'img') { html += figure(b, 'content/knowledge/', ++fig); return; }
      if (b.t === 'quote') {
        const last = b.s[b.s.length - 1], src = /^——/.test(last) ? last.replace(/^——\s*/, '') : '';
        const lines = src ? b.s.slice(0, -1) : b.s;
        html += `<blockquote class="source">${lines.map(l => `<p>${inline(l)}</p>`).join('')}${src ? `<cite>${inline(src)}</cite>` : ''}</blockquote>`; return;
      }
      if (b.t === 'ul') { const parts = b.it.map(withNotes); html += parts.map(p => p.pre).join('') + `<ul>${parts.map(p => `<li>${p.body}</li>`).join('')}</ul>`; return; }
      if (b.t === 'table') { html += table(b); return; }
      if (b.t !== 'p') return;
      const w = b.s.match(/^@@widget(\d+)@@$/);
      if (w) { html += widgetHtml(widgets[w[1]], ++fig); return; }
      const { pre, body } = withNotes(b.s);
      if (/^\*\*[^*]+\*\*(\[\^\d+\])?$/.test(b.s)) html += `${pre}<p class="beat"><mark>${body.replace(/<\/?strong>/g, '')}</mark></p>`;
      // a drop cap suits a character, not the first digit of a date
      else { html += `${pre}<p${lead ? ` class="lead${/^\d/.test(b.s) ? ' nocap' : ''}"` : ''}>${body}</p>`; lead = false; }
    });
    if (refs) html += '</section>';
    return { html, status, widgets };
  }
  // Interactive figures, described as data in the manuscript (one fenced widget block each). Every type is used in
  // its own way, so that lessons do not end up with copies of one control:
  //  "context-shift" (01-01): one form, several situations, chosen with tabs; each situation rates every candidate
  //    reading 0 (no support), 1 (plausible, not enough evidence) or 2 (supported), with a reason.
  //  "system-shift" (01-02): one field of meaning shared out among a few terms. A term marked "toggle" can be switched
  //    off; the cells it covered then pass to the neighbour named in "to", so the neighbour's extent visibly grows.
  //  "grounds" (01-03): a drawn map with numbered points; choosing one shows how far each of three grounds holds for
  //    it (0 not relied on, 1 in part, 2 mainly) and what further sign it produces in a reader.
  //  "layers" (01-04): a two-tier diagram built one cell at a time with back / next; at the last step, a choice of
  //    readers shows how each one takes the finished whole.
  //  "signal" (01-05): a message built from a word list, reordered and trimmed word by word; it shows the flag hoists
  //    it needs and what the receiver reads, with or without the flag that says which book to use.
  //  "crossing" (01-06): a grid of stations by elements; each cell says what became of that element at that station
  //    (kept, rewritten, lost, added, or not recorded), with the grounds for it.
  //  "evidence" (01-07): evidence switched on and off; each competing reading lists what supports or challenges it,
  //    with counts only, and never a verdict.
  //  "reveal" (02-01): kinds of evidence uncovered one at a time, in a fixed order; each step changes the standing of
  //    every candidate reading, and a track of dots keeps its history, so a reading the reader picked can be revised.
  //  "rite" (02-02): a ritual in phases on a drawn ground plan; choosing a phase moves the participants' markers, and
  //    choosing a participant shows what that body does there, set beside what the explanatory text says.
  //  "readings" (02-03): one passage split into sentences; choosing an interpretation marks the sentences it uses,
  //    with the sense it gives each, dims the rest, and names what it brings in from outside the text.
  //  "voices" (02-04): one object, several questions about it; choosing a question lists what each party claims,
  //    what the claim rests on and where it stops, then what actually happened in the case.
  //  "square" (02-05): a 5 x 5 word square in its two orders; each way of reading lights the letters it uses, and
  //    the two Pompeii finds can be laid over it to show which letters survive and which are restored.
  const LEVELS = ['没有依据', '说得通，证据不足', '有依据'];
  function ctxHtml(w, no) {
    const id = 'ctx' + no;
    return `<figure class="fig ctx" data-widget="${no}">
      <div class="fig-frame">
        <p class="ctx-form"><span class="label">形状不变</span>${esc(w.form)}</p>
        <div class="layers-tabs ctx-tabs" role="tablist" aria-label="选择处境">${w.contexts.map((c, k) => `<button type="button" role="tab" id="${id}-t${k}" aria-controls="${id}-p" aria-selected="${k === 0}" tabindex="${k === 0 ? 0 : -1}">${esc(c.label)}</button>`).join('')}</div>
        <div class="ctx-body" id="${id}-p" role="tabpanel" aria-live="polite"></div>
      </div>
      <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption>
    </figure>`;
  }
  function ctxWire(fig, w) {
    const tabs = $$('[role=tab]', fig), out = $('.ctx-body', fig);
    const show = k => {
      const c = w.contexts[k];
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === k); t.tabIndex = j === k ? 0 : -1; });
      out.setAttribute('aria-labelledby', tabs[k].id);
      // strongest reading first, so the eye lands on what this situation supports
      const rows = w.readings.map((r, j) => ({ r, lv: c.levels[j], why: c.why[j] })).map((x, j) => ({ ...x, j })).sort((a, b) => b.lv - a.lv || a.j - b.j);
      out.innerHTML = `<p class="ctx-scene">${inline(c.scene)}</p><ul class="ctx-rows">${rows.map(x => `<li class="lv${x.lv}">
        <div class="ctx-r"><b>${esc(x.r)}</b><span class="ctx-lv"><span class="meter" aria-hidden="true">${[1, 2].map(d => `<i class="${d <= x.lv ? 'on' : ''}"></i>`).join('')}</span>${LEVELS[x.lv]}</span></div>
        <p>${inline(x.why)}</p></li>`).join('')}</ul>`;
    };
    fig.addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b) show(tabs.indexOf(b)); });
    fig.addEventListener('keydown', e => {
      const k = tabs.indexOf(document.activeElement); if (k < 0) return;
      const to = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault(); const t = (to + tabs.length) % tabs.length; tabs[t].focus(); show(t);
    });
    show(0);
  }
  // a row of radio buttons: click, or arrow keys / Home / End once one has focus
  function radios(box, pick) {
    const bs = $$('[role=radio]', box);
    const set = k => { bs.forEach((b, j) => { b.setAttribute('aria-checked', j === k); b.tabIndex = j === k ? 0 : -1; }); pick(k); };
    box.addEventListener('click', e => { const b = e.target.closest('[role=radio]'); if (b) set(bs.indexOf(b)); });
    box.addEventListener('keydown', e => {
      const k = bs.indexOf(document.activeElement); if (k < 0) return;
      const to = { ArrowRight: k + 1, ArrowDown: k + 1, ArrowLeft: k - 1, ArrowUp: k - 1, Home: 0, End: bs.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault(); const t = (to + bs.length) % bs.length; bs[t].focus(); set(t);
    });
    set(0);
  }
  const radioRow = (cls, label, names) => `<div class="${cls} wpick" role="radiogroup" aria-label="${esc(label)}">${names.map((n, k) => `<button type="button" role="radio" aria-checked="${k === 0}" tabindex="${k === 0 ? 0 : -1}">${esc(n)}</button>`).join('')}</div>`;
  const W = {
    'context-shift': { html: ctxHtml, wire: ctxWire },
    'system-shift': {
      html: (w, no) => `<figure class="fig sys" data-widget="${no}">
        <div class="fig-frame">${w.systems.length > 1 ? radioRow('sys-pick', '选择一块意思', w.systems.map(s => s.label)) : ''}<div class="sys-body"></div></div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const out = $('.sys-body', fig);
        const show = k => {
          const s = w.systems[k], on = {};
          s.terms.forEach(t => { on[t.id] = true; });
          out.innerHTML = `<p class="sys-field"><span class="label">这一块意思</span>${esc(s.field)}</p>
            <div class="sys-bar">${s.terms.map(t => `<div class="sys-seg" data-t="${t.id}"><b>${esc(t.name)}</b><span></span></div>`).join('')}</div>
            <div class="sys-sws">${s.terms.filter(t => t.toggle).map(t => `<button type="button" class="sys-sw" data-t="${t.id}" aria-pressed="true"><i aria-hidden="true"></i><span>这一种语言里有</span> <b>${esc(t.name)}</b></button>`).join('')}</div>
            <p class="sys-state" aria-live="polite"></p><p class="sys-note">${inline(s.note)}</p>`;
          // a cell belongs to the term that owns it, or, when that term is switched off, to the neighbour it passes to
          const owner = i => { let t = s.terms.find(x => x.own.includes(i)); while (t && !on[t.id]) t = s.terms.find(x => x.id === t.to); return t; };
          const draw = () => {
            const by = {};
            s.cells.forEach((c, i) => { const t = owner(i); (by[t.id] = by[t.id] || []).push(c); });
            $$('.sys-seg', out).forEach(seg => {
              const t = s.terms.find(x => x.id === seg.dataset.t), cs = by[t.id] || [];
              seg.style.flexGrow = cs.length;
              seg.classList.toggle('gone', !cs.length);
              seg.classList.toggle('grew', cs.length > t.own.length);
              $('span', seg).textContent = cs.join(' · ');
            });
            $('.sys-state', out).textContent = s.terms.every(t => on[t.id]) ? s.on : s.off;
          };
          $$('.sys-sw', out).forEach(b => b.addEventListener('click', () => {
            const id = b.dataset.t;
            on[id] = !on[id];
            b.setAttribute('aria-pressed', on[id]);
            $('span', b).textContent = on[id] ? '这一种语言里有' : '这一种语言里没有';
            draw();
          }));
          draw();
        };
        const pick = $('.sys-pick', fig);
        if (pick) radios(pick, show); else show(0);
      },
    },
    grounds: {
      html: (w, no) => `<figure class="fig gr" data-widget="${no}">
        <div class="fig-frame">
          <div class="gr-map ill"><div class="gr-pos"><div class="gr-svg" role="img" aria-label="${esc(w.alt)}"></div>${w.spots.map((p, k) => `<button type="button" class="gr-dot" style="left:${p.x}%;top:${p.y}%" data-k="${k}" tabindex="-1" aria-hidden="true">${k + 1}</button>`).join('')}</div></div>
          <ol class="gr-list" aria-label="图上的标记">${w.spots.map((p, k) => `<li><button type="button" data-k="${k}" aria-pressed="${k === 0}" aria-controls="gr${no}-p"><span>${k + 1}</span>${esc(p.label)}</button></li>`).join('')}</ol>
          <div class="gr-body" id="gr${no}-p" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const GLV = ['不靠这一条', '部分依据', '主要依据'];
        // the map is drawn like the other figures, so it is placed inline and follows the page's ink colour
        load('content/knowledge/' + w.img).then(svg => {
          if (!/^\s*<svg[\s>]/.test(svg)) return;
          $('.gr-svg', fig).innerHTML = svg;
          const el = $('.gr-svg svg', fig); el.removeAttribute('role'); el.removeAttribute('aria-label'); el.setAttribute('aria-hidden', 'true');
        }).catch(() => {});
        const show = k => {
          const p = w.spots[k];
          $$('[data-k]', fig).forEach(b => { const here = +b.dataset.k === k; b.classList.toggle('on', here); if (b.closest('.gr-list')) b.setAttribute('aria-pressed', here); });
          $('.gr-body', fig).innerHTML = `<p class="gr-head"><span>${k + 1}</span>${esc(p.label)}</p><ul class="gr-rows">${w.grounds.map((g, j) => `<li class="lv${p.levels[j]}">
            <div class="gr-r"><b>${esc(g)}</b><span class="gr-lv"><span class="meter" aria-hidden="true">${[1, 2].map(d => `<i class="${d <= p.levels[j] ? 'on' : ''}"></i>`).join('')}</span>${GLV[p.levels[j]]}</span></div>
            <p>${inline(p.why[j])}</p></li>`).join('')}</ul><p class="gr-interp"><span class="label">在读者那里生出的解释项</span>${inline(p.interp)}</p>`;
        };
        fig.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) show(+b.dataset.k); });
        show(0);
      },
    },
    layers: {
      html: (w, no) => `<figure class="fig lay" data-widget="${no}">
        <div class="fig-frame">${radioRow('lay-ex', '选择例子', w.examples.map(x => x.label))}
          <div class="lay-grid" aria-hidden="true">${w.cells.map((c, i) => `<div class="lay-cell c${i}"><span class="lay-n">${esc(c)}</span><span class="lay-t"></span></div>`).join('')}</div>
          <div class="lay-body" aria-live="polite"></div>
          <div class="lay-nav"><button type="button" class="lay-prev">上一步</button><span class="lay-count"></span><button type="button" class="lay-next">下一步</button></div>
          <div class="lay-readers" hidden><p class="label">换一个读者</p><div class="lay-rd"></div><p class="lay-read" aria-live="polite"></p></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        let ex = w.examples[0], step = 0;
        const cells = $$('.lay-cell', fig), prev = $('.lay-prev', fig), next = $('.lay-next', fig), rd = $('.lay-readers', fig);
        const draw = () => {
          const st = ex.steps[step];
          cells.forEach((c, i) => {
            const at = ex.steps.findIndex(x => x.cell === i), shown = at > -1 && at <= step;
            c.classList.toggle('shown', shown); c.classList.toggle('now', i === st.cell);
            $('.lay-t', c).textContent = shown ? ex.steps[at].title.replace(/^第.层的/, '') : '';
          });
          $('.lay-body', fig).innerHTML = `<p class="lay-h">${esc(st.title)}</p><p>${inline(st.text)}</p>`;
          $('.lay-count', fig).textContent = `${step + 1} / ${ex.steps.length}`;
          prev.disabled = step === 0; next.disabled = step === ex.steps.length - 1;
          rd.hidden = step < ex.steps.length - 1;
        };
        const readers = () => {
          $('.lay-rd', fig).innerHTML = radioRow('lay-rdp', '选择读者', ex.readers.map(r => r.label));
          radios($('.lay-rdp', fig), k => { $('.lay-read', fig).innerHTML = inline(ex.readers[k].text); });
        };
        // a button that has just been disabled would drop the keyboard focus, so it moves to the other one
        prev.addEventListener('click', () => { if (step > 0) { step--; draw(); if (prev.disabled) next.focus(); } });
        next.addEventListener('click', () => { if (step < ex.steps.length - 1) { step++; draw(); if (next.disabled) prev.focus(); } });
        radios($('.lay-ex', fig), k => { ex = w.examples[k]; step = 0; readers(); draw(); });
      },
    },
    signal: {
      html: (w, no) => `<figure class="fig sg" data-widget="${no}">
        <div class="fig-frame">
          <div class="sg-sec"><p class="label">要发的话</p><ol class="sg-msg" aria-label="要发的话，按顺序"></ol></div>
          <div class="sg-sec"><p class="label">词汇表与拼写（点一下加到句末）</p><div class="sg-pal">${w.words.map((x, k) => `<button type="button" data-w="${k}">${esc(x.w)}<span>${x.spell ? '要拼' : x.n}</span></button>`).join('')}</div></div>
          <div class="sg-ctl"><button type="button" class="sg-tel" aria-pressed="true"><i aria-hidden="true"></i>先升电报旗</button><button type="button" class="sg-reset">恢复 1805 年的原句</button></div>
          <div class="sg-out" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        // Popham's letters: 1–25, no J (read as I), V before U
        const ABC = 'abcdefghiklmnopqrstvuwxyz';
        const byW = {}, byN = {};
        w.words.forEach(x => { byW[x.w] = x; if (x.n) byN[x.n] = x.w; });
        let msg = w.start.slice(), tel = true;
        const hoists = () => msg.flatMap((t, i) => { const x = byW[t]; return x.spell ? [...t.toLowerCase().replace(/j/g, 'i')].map(c => ({ n: ABC.indexOf(c) + 1, l: true, i })) : [{ n: x.n, l: false, i }]; });
        const box = $('.sg-msg', fig), out = $('.sg-out', fig);
        const draw = focus => {
          box.innerHTML = msg.length ? msg.map((t, i) => `<li><span>${esc(t)}</span><button type="button" data-a="l" data-i="${i}" aria-label="把 ${esc(t)} 往前移" ${i ? '' : 'disabled'}>←</button><button type="button" data-a="r" data-i="${i}" aria-label="把 ${esc(t)} 往后移" ${i < msg.length - 1 ? '' : 'disabled'}>→</button><button type="button" data-a="x" data-i="${i}" aria-label="删去 ${esc(t)}">×</button></li>`).join('') : '<li class="sg-empty">（还没有要发的话）</li>';
          const hs = hoists();
          // what the receiving ship reads: with the telegraph flag, numbers above 25 are words and smaller numbers
          // are letters, kept together word by word (how spelled words were separated is left out of the model);
          // without the flag, every number is looked up in the other book
          let read;
          if (!hs.length) read = '';
          else if (tel) {
            const ws = [];
            hs.forEach(h => { ws[h.i] = h.l ? (ws[h.i] || '') + ABC[h.n - 1] : byN[h.n]; });
            read = esc(ws.join(' '));
          } else read = hs.map(h => `<span class="sg-cmd"><b>${h.n}</b>${esc(w.other[h.n] || '（本模型未设定）')}</span>`).join('');
          const same = msg.join(' ') === w.start.join(' ');
          const perm = !same && msg.length === w.start.length && [...msg].sort().join() === [...w.start].sort().join();
          const note = !tel ? w.notes.nocode : same ? w.notes.same : perm ? w.notes.order : hs.length > 12 ? w.notes.longer : w.notes.ok;
          out.innerHTML = `<p class="sg-h"><span class="label">升起的挂组</span><b>${hs.length}</b> 挂</p>
            <p class="sg-nums">${tel ? '<i class="tel">电报旗</i>' : ''}${hs.map(h => `<i class="${h.l ? 'l' : ''}">${h.n}</i>`).join('')}</p>
            <p class="sg-h"><span class="label">${tel ? '对方查词汇表，读出' : '对方查另一本书，读出'}</span></p>
            <p class="sg-read${tel ? '' : ' cmds'}">${read || '—'}</p>
            ${hs.length ? `<p class="sg-note">${inline(note)}</p>` : ''}`;
          if (focus) { const b = focus.map(f => $(f, box)).find(Boolean) || $('button:not(:disabled)', box); if (b) b.focus(); else $('.sg-pal button', fig).focus(); }
        };
        box.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b || b.disabled) return;
          const i = +b.dataset.i, a = b.dataset.a;
          if (a === 'x') { msg.splice(i, 1); draw([`[data-a="x"][data-i="${Math.min(i, msg.length - 1)}"]`]); return; }
          const j = a === 'l' ? i - 1 : i + 1;
          [msg[i], msg[j]] = [msg[j], msg[i]];
          // keep the keyboard on the word that moved, or on the other arrow once this one runs out
          draw([`[data-a="${a}"][data-i="${j}"]:not(:disabled)`, `[data-a="${a === 'l' ? 'r' : 'l'}"][data-i="${j}"]`]);
        });
        $('.sg-pal', fig).addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b && msg.length < 16) { msg.push(w.words[+b.dataset.w].w); draw(); } });
        const telB = $('.sg-tel', fig);
        telB.addEventListener('click', () => { tel = !tel; telB.setAttribute('aria-pressed', tel); draw(); });
        $('.sg-reset', fig).addEventListener('click', () => { msg = w.start.slice(); tel = true; telB.setAttribute('aria-pressed', true); draw(); });
        draw();
      },
    },
    crossing: {
      html: (w, no) => {
        const S = { start: '出发', keep: '保留', change: '改写', lose: '丢失', add: '新增', none: '资料未及' };
        return `<figure class="fig cr" data-widget="${no}">
        <div class="fig-frame">
          <div class="cr-grid" role="grid" aria-label="地图上的几样东西在每一站的遭遇">
            <div class="cr-row cr-head" role="row"><span role="columnheader" class="cr-st">站</span>${w.elements.map(x => `<span role="columnheader">${esc(x)}</span>`).join('')}</div>
            ${w.stations.map((s, r) => `<div class="cr-row" role="row"><span role="rowheader" class="cr-st">${esc(s)}</span>${w.cells[r].map((c, k) => `<span role="gridcell"><button type="button" class="s-${c.s}" data-r="${r}" data-c="${k}" tabindex="-1" aria-label="${esc(s)}，${esc(w.elements[k])}：${S[c.s]}">${S[c.s]}</button></span>`).join('')}</div>`).join('')}
          </div>
          <div class="cr-body" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`;
      },
      wire(fig, w) {
        const S = { start: '出发', keep: '保留', change: '改写', lose: '丢失', add: '新增', none: '资料未及' };
        const bs = $$('[data-r]', fig), at = (r, c) => bs.find(b => +b.dataset.r === r && +b.dataset.c === c);
        const R = w.stations.length, C = w.elements.length;
        const show = (r, c, focus) => {
          const b = at(r, c), x = w.cells[r][c];
          bs.forEach(o => { o.tabIndex = o === b ? 0 : -1; o.setAttribute('aria-pressed', o === b); });
          $('.cr-body', fig).innerHTML = `<p class="cr-h"><span>${esc(w.stations[r])}</span><span>${esc(w.elements[c])}</span><b class="s-${x.s}">${S[x.s]}</b></p><p>${inline(x.t)}</p>`;
          if (focus) b.focus();
        };
        fig.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) show(+b.dataset.r, +b.dataset.c); });
        // arrow keys move through the grid as in a table; Home / End go to the ends of a row
        fig.addEventListener('keydown', e => {
          const b = e.target.closest('[data-r]'); if (!b) return;
          let r = +b.dataset.r, c = +b.dataset.c;
          const mv = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
          if (mv) { r = Math.max(0, Math.min(R - 1, r + mv[0])); c = Math.max(0, Math.min(C - 1, c + mv[1])); }
          else if (e.key === 'Home') c = 0; else if (e.key === 'End') c = C - 1; else return;
          e.preventDefault(); show(r, c, true);
        });
        show(1, 1);
      },
    },
    evidence: {
      html: (w, no) => `<figure class="fig evx" data-widget="${no}">
        <div class="fig-frame">
          <div class="ev-sec"><p class="label">证据（可多选）</p><div class="ev-list">${w.evidence.map((x, k) => `<button type="button" data-k="${k}" aria-pressed="${k === 0}"><i aria-hidden="true"></i><span class="ev-id">${esc(x.id)}</span>${esc(x.t)}</button>`).join('')}</div>
            <div class="ev-all"><button type="button" data-all="1">全部选上</button><button type="button" data-all="0">全部清空</button></div>
            <p class="ev-d" aria-live="polite"></p></div>
          <div class="ev-hyp" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const REL = { '+': '支持', '-': '挑战', '0': '关系不大' };
        const on = w.evidence.map((_, k) => k === 0), bs = $$('[data-k]', fig);
        const draw = last => {
          bs.forEach((b, k) => b.setAttribute('aria-pressed', on[k]));
          const x = w.evidence[last];
          $('.ev-d', fig).innerHTML = x && on[last] ? `<b>${esc(x.id)}</b>${inline(x.d)}` : '';
          const sel = w.evidence.filter((_, k) => on[k]);
          $('.ev-hyp', fig).innerHTML = w.hypotheses.map(h => {
            const rows = sel.map(e => ({ e, r: e.rel[h.id] })), pro = rows.filter(x => x.r[0] === '+'), con = rows.filter(x => x.r[0] === '-'), mute = rows.length - pro.length - con.length;
            return `<div class="ev-h"><p class="ev-ht"><span class="ev-id">${esc(h.id)}</span>${esc(h.t)}</p>
              <p class="ev-n"><span class="p">支持 ${pro.length}</span><span class="c">挑战 ${con.length}</span>${mute ? `<span>另有 ${mute} 条关系不大</span>` : ''}</p>
              ${pro.length + con.length ? `<ul>${[...con, ...pro].map(x => `<li class="${x.r[0] === '+' ? 'p' : 'c'}"><b>${esc(x.e.id)} ${REL[x.r[0]]}</b>${inline(x.r[1])}</li>`).join('')}</ul>` : `<p class="ev-none">${sel.length ? '选中的证据与这一读法关系都不大。' : '还没有选证据。'}</p>`}</div>`;
          }).join('');
        };
        fig.addEventListener('click', e => {
          const b = e.target.closest('[data-k]'), a = e.target.closest('[data-all]');
          if (b) { const k = +b.dataset.k; on[k] = !on[k]; draw(k); }
          else if (a) { on.fill(a.dataset.all === '1'); draw(-1); }
        });
        draw(0);
      },
    },
    reveal: {
      html: (w, no) => `<figure class="fig rv" data-widget="${no}">
        <div class="fig-frame">
          <div class="rv-sec"><p class="label">先押一个解释（随时可以换）</p></div>${radioRow('rv-pick', '选择你押的解释', w.readings.map(r => r.s))}
          <ol class="rv-cats" aria-hidden="true">${w.steps.map(s => `<li>${esc(s.cat)}</li>`).join('')}</ol>
          <div class="rv-ev" aria-live="polite"></div>
          <div class="rv-nav"><button type="button" class="rv-prev">上一格</button><span class="rv-count"></span><button type="button" class="rv-next">揭开下一格</button></div>
          <p class="rv-you" aria-live="polite"></p>
          <ul class="rv-rows"></ul>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const ST = { open: '尚无约束', ok: '说得通', up: '得到支持', weak: '被削弱', out: '基本排除', na: '这一格说不上话' };
        let step = 0, mine = 0;
        const prev = $('.rv-prev', fig), next = $('.rv-next', fig), cats = $$('.rv-cats li', fig);
        // the last step at or before k where this reading's standing was actually judged
        const judged = (id, k) => { for (let j = k; j >= 0; j--) { const s = w.steps[j].st[id][0]; if (s !== 'na') return s; } return 'open'; };
        const draw = () => {
          const s = w.steps[step];
          cats.forEach((c, j) => { c.classList.toggle('seen', j <= step); c.classList.toggle('now', j === step); });
          $('.rv-ev', fig).innerHTML = `<p class="rv-cat"><span>${step + 1}</span>${esc(s.cat)}</p><p>${inline(s.ev)}</p>`;
          $('.rv-count', fig).textContent = `${step + 1} / ${w.steps.length}`;
          prev.disabled = step === 0; next.disabled = step === w.steps.length - 1;
          const r = w.readings[mine], now = s.st[r.id][0], was = step ? judged(r.id, step - 1) : 'open', cur = judged(r.id, step);
          $('.rv-you', fig).innerHTML = `<span class="label">你押的</span><b>${esc(r.t)}</b>：${now === 'na' ? `这一格对它说不上话，仍是“${ST[cur]}”。` : was === now ? `仍是“${ST[now]}”。` : `从“${ST[was]}”变成了“${ST[now]}”。${now === 'out' || now === 'weak' ? '要不要换一个？' : ''}`}`;
          $('.rv-rows', fig).innerHTML = w.readings.map((x, i) => {
            const [st, why] = s.st[x.id];
            return `<li class="s-${st}${i === mine ? ' mine' : ''}"><div class="rv-r"><b>${esc(x.t)}</b><span class="rv-track" aria-hidden="true">${w.steps.slice(0, step + 1).map(y => `<i class="s-${y.st[x.id][0]}"></i>`).join('')}</span><span class="rv-st">${ST[st]}</span></div><p>${inline(why)}</p></li>`;
          }).join('');
        };
        prev.addEventListener('click', () => { if (step > 0) { step--; draw(); if (prev.disabled) next.focus(); } });
        next.addEventListener('click', () => { if (step < w.steps.length - 1) { step++; draw(); if (next.disabled) prev.focus(); } });
        radios($('.rv-pick', fig), k => { mine = k; draw(); });
      },
    },
    rite: {
      html: (w, no) => `<figure class="fig rt" data-widget="${no}">
        <div class="fig-frame">
          <div class="rt-sec"><p class="label">站在谁的位置</p></div>${radioRow('rt-role', '选择参加者', w.roles)}
          <div class="rt-board ill"><div class="rt-pos"><div class="rt-svg" role="img" aria-label="${esc(w.alt)}"></div>${w.roles.map((r, k) => `<span class="rt-dot" data-r="${k}" aria-hidden="true">${esc((w.marks || [])[k] || r[0])}</span>`).join('')}</div></div>
          <div class="rt-sec"><p class="label">仪式的步骤</p></div>${radioRow('rt-phase', '选择步骤', w.phases.map((p, k) => `${k + 1} ${p.t}`))}
          <div class="rt-body" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        load('content/knowledge/' + w.img).then(svg => {
          if (!/^\s*<svg[\s>]/.test(svg)) return;
          $('.rt-svg', fig).innerHTML = svg;
          const el = $('.rt-svg svg', fig); el.removeAttribute('role'); el.removeAttribute('aria-label'); el.setAttribute('aria-hidden', 'true');
        }).catch(() => {});
        const [VW, VH] = [490, 400], dots = $$('.rt-dot', fig);
        let role = 0, ph = 0;
        const draw = () => {
          const p = w.phases[ph], name = w.roles[role], used = {};
          dots.forEach((d, k) => {
            const at = p.pos[w.roles[k]], xy = at && w.places[at];
            d.hidden = !xy;
            if (!xy) return;
            // people sharing one spot stand side by side rather than on top of each other
            const n = used[at] = (used[at] || 0) + 1;
            d.style.left = `${(xy[0] + (n - 1) * 30) / VW * 100}%`; d.style.top = `${xy[1] / VH * 100}%`;
            d.classList.toggle('on', k === role);
          });
          const here = p.pos[name];
          $('.rt-body', fig).innerHTML = `<p class="rt-h"><span>${ph + 1}</span>${esc(p.t)}<b>${esc(name)}${here ? ` · ${esc(here)}` : ' · 经文未写位置'}</b></p>
            <p class="rt-do">${inline(p.do[name])}</p>
            <p class="rt-yi"><span class="label">《冠义》怎么说</span>${inline(p.yi)}</p>
            ${p.song ? `<p class="rt-song"><span class="label">宋代的改写</span>${inline(p.song)}</p>` : ''}`;
        };
        radios($('.rt-role', fig), k => { role = k; draw(); });
        radios($('.rt-phase', fig), k => { ph = k; draw(); });
      },
    },
    readings: {
      html: (w, no) => `<figure class="fig rd" data-widget="${no}">
        <div class="fig-frame">
          <div class="rd-sec"><p class="label">选一段原文</p></div>${radioRow('rd-psg', '选择段落', w.passages.map(p => p.label))}
          <div class="rd-sec"><p class="label">选一种读法</p></div><div class="rd-who"></div>
          <div class="rd-text" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        let p = w.passages[0];
        const show = k => {
          const r = p.readings[k], keys = Object.keys(r.uses);
          $('.rd-text', fig).innerHTML = `<p class="rd-ref">${esc(p.ref)}<span>${esc(r.who)}，${esc(r.when)}</span></p>
            <ol class="rd-segs">${p.segs.map((s, i) => `<li class="${r.uses[s.k] ? 'on' : 'off'}"><span class="rd-n">${i + 1}</span><div><p class="rd-t">${inline(s.t)}</p>${r.uses[s.k] ? `<p class="rd-g">${inline(r.uses[s.k])}</p>` : ''}</div></li>`).join('')}</ol>
            <p class="rd-sum">${keys.length ? `用到 ${keys.length} 句，共 ${p.segs.length} 句。` : '这一段它一句也没有处理。'}</p>
            <p class="rd-x"><span class="label">从文本外带进来的</span>${inline(r.outside)}</p>
            <p class="rd-x"><span class="label">没有照顾到的</span>${inline(r.leaves)}</p>`;
        };
        radios($('.rd-psg', fig), k => {
          p = w.passages[k];
          $('.rd-who', fig).innerHTML = radioRow('rd-rdr', '选择读法', p.readings.map(r => r.who));
          radios($('.rd-rdr', fig), show);
        });
      },
    },
    voices: {
      html: (w, no) => `<figure class="fig vc" data-widget="${no}">
        <div class="fig-frame">
          <div class="vc-sec"><p class="label">选一个问题</p></div>${radioRow('vc-q', '选择问题', w.questions.map(q => q.q))}
          <div class="vc-body" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        radios($('.vc-q', fig), k => {
          const q = w.questions[k];
          $('.vc-body', fig).innerHTML = `<ul class="vc-rows">${w.voices.map(v => {
            const x = q.say[v.id];
            return x ? `<li><b class="vc-who">${esc(v.name)}</b><div><p class="vc-claim">${inline(x.claim)}</p>
              <p class="vc-x"><span class="label">凭什么</span>${inline(x.basis)}</p>
              <p class="vc-x"><span class="label">够不着的地方</span>${inline(x.limit)}</p></div></li>`
              : `<li class="none"><b class="vc-who">${esc(v.name)}</b><div><p class="vc-claim">本案材料里没有这一方对这个问题的说法。</p></div></li>`;
          }).join('')}</ul><p class="vc-out"><span class="label">${esc(w.outLabel || '这件事里实际发生的')}</span>${inline(q.outcome)}</p>`;
        });
      },
    },
    square: {
      html: (w, no) => `<figure class="fig sq" data-widget="${no}">
        <div class="fig-frame">
          <div class="sq-sec"><p class="label">选一种看法</p></div>${radioRow('sq-mode', '选择看法', w.modes.map(m => m.label))}
          <div class="sq-ordbox"><div class="sq-sec"><p class="label">方块的顺序</p></div>${radioRow('sq-ord', '选择顺序', ['ROTAS 在第一行', 'SATOR 在第一行'])}</div>
          <div class="sq-stage" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const ROT = ['ROTAS', 'OPERA', 'TENET', 'AREPO', 'SATOR'];
        let mode = 0, ord = 0;
        const rows = () => (ord ? ROT.slice().reverse() : ROT);
        const rev = t => t.split('').reverse().join('');
        const grid = (g, cls) => `<div class="sq-grid" role="img" aria-label="${esc(g.join(' '))}">${g.map((r, i) => r.split('').map((ch, j) => `<span class="sq-c ${cls ? cls(i, j) : ''}">${ch}</span>`).join('')).join('')}</div>`;
        const pass = (g, from, start) => g.slice(from, from + 3).map((r, k) => ((k + start) % 2 ? rev(r) : r)).join(' ');
        const draw = () => {
          const m = w.modes[mode], g = rows(), note = typeof m.note === 'string' ? m.note : m.note[ord ? 'SATOR' : 'ROTAS'];
          $('.sq-ordbox', fig).hidden = !m.order;
          let body = '';
          if (m.kind === 'dirs') {
            const cols = [0, 1, 2, 3, 4].map(j => g.map(r => r[j]).join(''));
            const ways = [['从左上角横读', g.join(' ')], ['从右下角倒着横读', g.slice().reverse().map(rev).join(' ')], ['从左上角竖读', cols.join(' ')], ['从右下角往上竖读', cols.slice().reverse().map(rev).join(' ')]];
            body = grid(g) + `<ul class="sq-lines">${ways.map(x => `<li><span class="label">${x[0]}</span><code>${x[1]}</code></li>`).join('')}</ul>`;
          } else if (m.kind === 'bous') {
            body = grid(g, i => (i < 3 ? 'on' : '')) + `<ul class="sq-lines">
              <li><span class="label">从左上角起，→ ← →</span><code>${pass(g, 0, 0)}</code></li>
              <li><span class="label">从右上角起，← → ←</span><code>${pass(g, 0, 1)}</code></li></ul>`;
          } else if (m.kind === 'pater') {
            const word = 'APATERNOSTERO', n = word.length, mid = (n - 1) / 2;
            const cells = [];
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
              const ch = j === mid ? word[i] : i === mid ? word[j] : '';
              cells.push(`<span class="sq-c ${ch ? ((i === 0 || i === n - 1 || j === 0 || j === n - 1) ? 'ao' : 'on') : 'nil'}">${ch}</span>`);
            }
            const tally = t => { const c = {}; t.replace(/[^A-Z]/g, '').split('').forEach(x => { c[x] = (c[x] || 0) + 1; }); return Object.keys(c).sort().map(k => k + '×' + c[k]).join('  '); };
            const crossText = word + word.slice(0, mid) + word.slice(mid + 1);
            body = `<div class="sq-cross" style="--n:${n}" role="img" aria-label="两行 PATERNOSTER 交叉成十字，共用中间的 N；两端各有一个 A 和一个 O">${cells.join('')}</div>
              <ul class="sq-lines"><li><span class="label">方块的 25 个字母</span><code>${tally(ROT.join(''))}</code></li>
              <li><span class="label">十字的 25 个字母</span><code>${tally(crossText)}</code></li></ul>`;
          } else if (m.kind === 'frag') {
            body = grid(ROT, (i, j) => 'f-' + w.frag[i][j]) + `<p class="sq-key"><span class="f-O">清楚可辨</span><span class="f-T">只剩残笔</span><span class="f-L">缺失，照完整的一件补出</span></p>`;
          } else if (m.kind === 'col') {
            body = `<div class="sq-col">${grid(ROT, i => (i === 4 ? 'on' : ''))}<p class="sq-tail"><span class="on">ANO</span><span>SAVTRAN</span><span>VALE</span></p></div>`;
          }
          $('.sq-stage', fig).innerHTML = body + `<p class="sq-note">${inline(note)}</p>`;
        };
        radios($('.sq-mode', fig), k => { mode = k; draw(); });
        radios($('.sq-ord', fig), k => { ord = k; draw(); });
      },
    },
    // 03-01: one set of objects, several rulers. Each ruler measures its own category and puts every object in one of
    // three bins (counted / not counted / not handled); each placement says whether the author discussed it or the
    // lesson inferred it from the author's criterion. w: { caption, bins, items: [{id,name}], rulers: [{who,cat,rule,asks,put:{id:[bin,note]}}] }
    sorter: {
      html: (w, no) => `<figure class="fig so" data-widget="${no}">
        <div class="fig-frame">
          <div class="so-sec"><p class="label">选一把尺子</p></div>${radioRow('so-pick', '选择尺子', w.rulers.map(r => r.who))}
          <div class="so-body" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const split = t => { const m = /^(.+?)：(.*)$/.exec(t); return m ? [m[1], m[2]] : ['', t]; };
        radios($('.so-pick', fig), k => {
          const r = w.rulers[k];
          const heads = [`算作“${r.cat}”`, '不算', '这把尺子不处理'];
          const col = b => {
            const xs = w.items.filter(it => r.put[it.id][0] === b);
            return `<div class="so-bin b${b}"><p class="so-h">${esc(heads[b])}<span>${xs.length}</span></p>${xs.length ? `<ul>${xs.map(it => {
              const [tag, why] = split(r.put[it.id][1]);
              return `<li><b>${esc(it.name)}</b>${tag ? `<span class="so-tag ${tag === '推出' ? 'inf' : 'own'}">${esc(tag)}</span>` : ''}<p>${inline(why)}</p></li>`;
            }).join('')}</ul>` : '<p class="so-empty">无</p>'}</div>`;
          };
          $('.so-body', fig).innerHTML = `<dl class="so-rule"><dt class="label">量的是</dt><dd>${esc(r.cat)}</dd><dt class="label">标准</dt><dd>${inline(r.rule)}</dd><dt class="label">想回答</dt><dd>${inline(r.asks)}</dd></dl>
            <div class="so-bins">${[0, 1, 2].map(col).join('')}</div>`;
        });
      },
    },
    // 03-02: what a text says about its own age beside what the evidence says. A self-description sits in a dashed
    // "远古" zone at the left (not to scale); evidence bars sit on a scaled axis by year.
    // w: { caption, axis: [from, to], ticks: [years], texts: [{ name, claim, ev: [{from,to,kind,label}], lang, verdict }] }
    dating: {
      html: (w, no) => `<figure class="fig dt" data-widget="${no}">
        <div class="fig-frame">
          <div class="dt-sec"><p class="label">选一篇文献</p></div>${radioRow('dt-pick', '选择文献', w.texts.map(t => t.name))}
          <div class="dt-body" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const [a0, a1] = w.axis, Z = 16; // the left Z% of the track is the unscaled "远古" zone
        const pos = y => Z + (y - a0) / (a1 - a0) * (100 - Z);
        const yr = y => (y < 0 ? `前 ${-y}` : y === 1 ? '公元 1' : `${y}`);
        const KIND = { orig: '原件或原文', copy: '译本或抄本', cite: '被引用' };
        radios($('.dt-pick', fig), k => {
          const t = w.texts[k];
          const bars = t.ev.map((e, i) => `<div class="dt-bar ${e.kind}" style="left:${pos(e.from)}%;width:max(10px, ${pos(Math.min(e.to, a1)) - pos(e.from)}%);top:${8 + i * 22}px" title="${esc(e.label)}"></div>`).join('');
          $('.dt-body', fig).innerHTML = `
            <div class="dt-claim"><span class="label">它自己说</span><p>${inline(t.claim)}</p></div>
            <div class="dt-track" style="height:${18 + t.ev.length * 22}px" role="img" aria-label="${esc(t.ev.map(e => e.label).join('；'))}">
              <div class="dt-zone" style="width:${Z}%"><span>远古</span></div>
              ${w.ticks.map(y => `<span class="dt-tick" style="left:${pos(y)}%"><i>${yr(y)}</i></span>`).join('')}${bars}
            </div>
            <ul class="dt-ev">${t.ev.map(e => `<li class="${e.kind}"><i aria-hidden="true"></i><span class="label">${KIND[e.kind]}</span>${inline(e.label)}</li>`).join('')}</ul>
            <p class="dt-lang">${inline(t.lang)}</p>
            <p class="dt-v"><span class="label">证据说</span>${inline(t.verdict)}</p>`;
        });
      },
    },
    // 03-03: one cosmic ladder read three ways. Choosing a thinker marks where the human soul sits and draws how it
    // rises (turning inward / two paths / help from above); choosing a rung shows what that thinker says about it.
    // w: { caption, levels: [{id,name}], views: [{ who, soul: [ids], soulNote, way, wayKind: in|split|down, notes: {id: text} }] }
    ladder: {
      html: (w, no) => `<figure class="fig ld" data-widget="${no}">
        <div class="fig-frame">
          <div class="ld-sec"><p class="label">选一个人</p></div>${radioRow('ld-who', '选择人物', w.views.map(v => v.who))}
          <div class="ld-main">
            <div class="ld-col"><svg class="ld-arrows" aria-hidden="true"></svg><ol class="ld-rungs" aria-label="宇宙的层级，从上到下">${w.levels.map((l, k) => `<li><button type="button" data-k="${k}" aria-pressed="false"><b>${esc(l.name)}</b><span class="ld-tag"></span></button></li>`).join('')}</ol></div>
            <div class="ld-side" aria-live="polite"></div>
          </div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        let v = w.views[0], at = w.levels.findIndex(l => l.id === 'soul');
        const rungs = $$('.ld-rungs button', fig), svg = $('.ld-arrows', fig), NS = 'http://www.w3.org/2000/svg';
        const TAG = { in: { nous: '一部分留在这里', soul: '向内转' }, split: { nous: '哲学：只有少数人', soul: '仪式：只到以太' }, down: { gods: '把符号留在下界', soul: '借符号上升' } };
        const draw = () => {
          const idx = id => w.levels.findIndex(l => l.id === id);
          rungs.forEach((b, k) => {
            const id = w.levels[k].id;
            b.classList.toggle('soul', v.soul.includes(id));
            b.setAttribute('aria-pressed', k === at);
            $('.ld-tag', b).textContent = (TAG[v.wayKind] || {})[id] || '';
          });
          // arrows are measured from the rendered rungs, so they follow the layout at any width
          const box = svg.getBoundingClientRect();
          const y = id => { const r = rungs[idx(id)].getBoundingClientRect(); return r.top - box.top + r.height / 2; };
          const mk = `ldm${fig.dataset.widget}`;
          svg.innerHTML = `<defs><marker id="${mk}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>`;
          const path = (d, cls) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('class', cls); p.setAttribute('marker-end', `url(#${mk})`); svg.appendChild(p); };
          if (v.wayKind === 'in') path(`M30 ${y('soul')}C6 ${y('soul') - 20} 6 ${y('nous') + 20} 30 ${y('nous') + 6}`, 'a');
          if (v.wayKind === 'split') { path(`M14 ${y('soul') - 12}L14 ${y('nous') + 10}`, 'a'); path(`M30 ${y('soul') - 12}L30 ${(y('soul') + y('gods')) / 2}`, 'a dash'); }
          if (v.wayKind === 'down') path(`M22 ${y('gods') + 10}L22 ${y('soul') - 12}`, 'a');
          const l = w.levels[at];
          $('.ld-side', fig).innerHTML = `<p class="ld-soul"><span class="label">人的灵魂在哪里</span>${inline(v.soulNote)}</p>
            <p class="ld-way"><span class="label">靠什么往上走</span>${inline(v.way)}</p>
            <p class="ld-note"><span class="label">${esc(v.who)}论“${esc(l.name)}”</span>${inline(v.notes[l.id] || '')}</p>`;
        };
        rungs.forEach((b, k) => b.addEventListener('click', () => { at = k; draw(); }));
        radios($('.ld-who', fig), k => { v = w.views[k]; draw(); });
        window.addEventListener('resize', draw);
      },
    },
    // 03-04: one statement at a time; the reader names the kind of inference (analogy / cause / sign / assignment).
    // Mixed statements accept any of their kinds; the reveal explains how they stack and how the link could be tested.
    // w: { caption, kinds: [{id,name,hint}], items: [{ text, src, ok: [kind ids], why, test }] }
    infer: {
      html: (w, no) => `<figure class="fig nf" data-widget="${no}">
        <div class="fig-frame">
          <div class="nf-top"><span class="label">第 <b class="nf-at">1</b> / ${w.items.length} 条</span><span class="nf-dots">${w.items.map((_, k) => `<button type="button" data-k="${k}" aria-label="第 ${k + 1} 条"></button>`).join('')}</span></div>
          <blockquote class="nf-text"></blockquote>
          <p class="nf-src"></p>
          <div class="nf-kinds" role="group" aria-label="选择推理的种类">${w.kinds.map(c => `<button type="button" data-id="${esc(c.id)}"><b>${esc(c.name)}</b><span>${esc(c.hint)}</span></button>`).join('')}</div>
          <div class="nf-out" aria-live="polite"></div>
          <div class="nf-nav"><button type="button" class="nf-prev">上一条</button><span class="nf-score"></span><button type="button" class="nf-next">下一条</button></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        let at = 0;
        const picked = w.items.map(() => null);
        const name = id => (w.kinds.find(c => c.id === id) || {}).name || id;
        const kinds = $$('.nf-kinds button', fig), dots = $$('.nf-dots button', fig);
        const draw = () => {
          const it = w.items[at], got = picked[at];
          $('.nf-at', fig).textContent = at + 1;
          $('.nf-text', fig).textContent = it.text;
          $('.nf-src', fig).textContent = `出处：${it.src}`;
          kinds.forEach(b => {
            const id = b.dataset.id;
            b.disabled = got !== null;
            b.className = got === null ? '' : it.ok.includes(id) ? 'ok' : id === got ? 'no' : '';
            b.setAttribute('aria-pressed', id === got);
          });
          $('.nf-out', fig).innerHTML = got === null ? '' : `<p class="nf-verdict ${it.ok.includes(got) ? 'ok' : 'no'}">${it.ok.includes(got) ? '对了' : '不太对'}：这一条主要是${it.ok.map(name).join(' + ')}。</p>
            <p><span class="label">为什么</span>${inline(it.why)}</p><p><span class="label">怎样检验</span>${inline(it.test)}</p>`;
          dots.forEach((d, k) => { d.className = k === at ? 'at' : picked[k] === null ? '' : w.items[k].ok.includes(picked[k]) ? 'ok' : 'no'; });
          const done = picked.filter(x => x !== null).length, right = picked.filter((x, k) => x !== null && w.items[k].ok.includes(x)).length;
          $('.nf-score', fig).textContent = done ? `已答 ${done} 条，对 ${right} 条` : '';
          $('.nf-prev', fig).disabled = at === 0;
          $('.nf-next', fig).disabled = at === w.items.length - 1;
        };
        kinds.forEach(b => b.addEventListener('click', () => { if (picked[at] === null) { picked[at] = b.dataset.id; draw(); } }));
        dots.forEach((d, k) => d.addEventListener('click', () => { at = k; draw(); }));
        $('.nf-prev', fig).addEventListener('click', () => { if (at > 0) { at--; draw(); } });
        $('.nf-next', fig).addEventListener('click', () => { if (at < w.items.length - 1) { at++; draw(); } });
        draw();
      },
    },
    // 03-05: step through how one text (or word) moved between languages. Columns are languages, time runs down;
    // each stop draws lines back to the stops it came from, so branches and merges show as the reader steps on.
    // w: { caption, routes: [{ name, lanes: [..], stops: [{ id, lane, when, where, title, who, what, change, from?: [ids], nameOnly? }] }] }
    relay: {
      html: (w, no) => `<figure class="fig rl" data-widget="${no}">
        <div class="fig-frame">
          ${radioRow('rl-pick', '选择线索', w.routes.map(r => r.name))}
          <div class="rl-board"><div class="rl-lanes"></div><svg class="rl-map" aria-hidden="true"></svg></div>
          <div class="rl-card" aria-live="polite"></div>
          <div class="rl-nav"><button type="button" class="rl-prev">上一站</button><span class="rl-count"></span><button type="button" class="rl-next">下一站</button></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        let r = w.routes[0], at = 0;
        const svg = $('.rl-map', fig), NS = 'http://www.w3.org/2000/svg';
        const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
        const draw = () => {
          $('.rl-lanes', fig).style.gridTemplateColumns = `repeat(${r.lanes.length}, minmax(0, 1fr))`;
          $('.rl-lanes', fig).innerHTML = r.lanes.map(l => `<span>${esc(l)}</span>`).join('');
          // stops sit on evenly spaced rows in order (exact years would make near-dated stops collide)
          svg.style.height = `${Math.max(220, r.stops.length * 36 + 24)}px`;
          const W = svg.clientWidth || 300, H = svg.clientHeight || 340;
          const x = i => W * (i + 0.5) / r.lanes.length;
          const y = k => 20 + (H - 40) * k / Math.max(1, r.stops.length - 1);
          const pos = {};
          r.stops.forEach((st, k) => { pos[st.id] = { x: x(st.lane), y: y(k), k }; });
          svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
          svg.innerHTML = '';
          r.lanes.forEach((_, i) => svg.appendChild(mk('line', { x1: x(i), x2: x(i), y1: 6, y2: H - 6, class: 'lane' })));
          r.stops.forEach((st, k) => (st.from || []).forEach(f => {
            const a = pos[f], b = pos[st.id];
            if (!a) return;
            const cls = `edge${st.nameOnly ? ' name' : ''}${k <= at ? ' on' : ''}${k === at ? ' now' : ''}`;
            svg.appendChild(mk('path', { d: `M${a.x} ${a.y}C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`, class: cls }));
          }));
          r.stops.forEach((st, k) => {
            const p = pos[st.id];
            const g = mk('g', { class: `stop${k < at ? ' seen' : ''}${k === at ? ' now' : ''}`, tabindex: '0', role: 'button', 'aria-label': `第 ${k + 1} 站：${st.title}` });
            g.appendChild(mk('circle', { cx: p.x, cy: p.y, r: k === at ? 11 : 9 }));
            const t = mk('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle' });
            t.textContent = k + 1;
            g.appendChild(t);
            const go = () => { at = k; draw(); };
            g.addEventListener('click', go);
            g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
            svg.appendChild(g);
          });
          const st = r.stops[at];
          const src = (st.from || []).map(f => r.stops.findIndex(z => z.id === f) + 1).filter(n => n > 0);
          $('.rl-card', fig).innerHTML = `<p class="rl-head"><b>${esc(st.title)}</b><span>${esc(st.when)} · ${esc(st.where)} · ${esc(r.lanes[st.lane])}</span></p>
            <p><span class="label">谁</span>${inline(st.who)}</p>
            <p><span class="label">做了什么</span>${inline(st.what)}${src.length ? `<span class="rl-from">材料来自第 ${src.join('、')} 站${st.nameOnly ? '（只传了名字）' : ''}</span>` : ''}</p>
            <p class="rl-change"><span class="label">这一站改变了什么</span>${inline(st.change)}</p>`;
          $('.rl-count', fig).textContent = `第 ${at + 1} / ${r.stops.length} 站`;
          $('.rl-prev', fig).disabled = at === 0;
          $('.rl-next', fig).disabled = at === r.stops.length - 1;
        };
        $('.rl-prev', fig).addEventListener('click', () => { if (at > 0) { at--; draw(); } });
        $('.rl-next', fig).addEventListener('click', () => { if (at < r.stops.length - 1) { at++; draw(); } });
        radios($('.rl-pick', fig), k => { r = w.routes[k]; at = 0; draw(); });
        window.addEventListener('resize', draw);
        draw();
      },
    },
    // 03-06: role-play scenes. Pick a year, look at what is on that reader's desk, answer the question; each answer gets
    // its own reply, and the first answer also unlocks what real readers did that year. Answers are kept per scene.
    // w: { caption, scenes: [{ tab, where, desk: [..], ask, options: [{ text, reply }], history }] }
    scene: {
      html: (w, no) => `<figure class="fig sc" data-widget="${no}">
        <div class="fig-frame">
          ${radioRow('sc-pick', '选择年份', w.scenes.map(s => s.tab))}
          <div class="sc-body"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const chosen = w.scenes.map(() => -1);
        const body = $('.sc-body', fig);
        let cur = 0;
        const draw = focusK => {
          const s = w.scenes[cur], c = chosen[cur];
          body.innerHTML = `<p class="sc-where"><span class="label">你是</span>${inline(s.where)}</p>
            <div class="sc-desk"><span class="label">你手边有</span><ul>${s.desk.map(d => `<li>${inline(d)}</li>`).join('')}</ul></div>
            <p class="sc-ask">${inline(s.ask)}</p>
            <div class="sc-opts">${s.options.map((o, k) => `<button type="button" aria-pressed="${k === c}">${inline(o.text)}</button>`).join('')}</div>
            <div class="sc-out" aria-live="polite">${c < 0 ? '<p class="sc-hint">选一个答案，看看会怎样。</p>' : `<p class="sc-reply">${inline(s.options[c].reply)}</p><p class="sc-hist"><span class="label">那一年真实发生的</span>${inline(s.history)}</p>`}</div>`;
          const bs = [...body.querySelectorAll('.sc-opts button')];
          bs.forEach((b, k) => b.addEventListener('click', () => { chosen[cur] = k; draw(k); }));
          if (focusK !== undefined) bs[focusK].focus();
        };
        radios($('.sc-pick', fig), k => { cur = k; draw(); });
      },
    },
    // 04-01: tag the sentences of a source. Pick a document, click a highlighted sentence, then say which kind of work it
    // does; the answer is checked and explained, and the sentence keeps its tag. Tags are kept per document.
    // w: { caption, labels: [{ name, hint }], docs: [{ tab, src, segs: [{ t, ans, why } | { t }] }] }
    tagger: {
      html: (w, no) => `<figure class="fig tg" data-widget="${no}">
        <div class="fig-frame">
          ${radioRow('tg-pick', '选择文献', w.docs.map(d => d.tab))}
          <div class="tg-body"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const got = w.docs.map(d => d.segs.map(() => -1));
        const body = $('.tg-body', fig);
        let cur = 0, sel = -1;
        const draw = focus => {
          const d = w.docs[cur], g = got[cur];
          const tagged = d.segs.filter((s, i) => s.ans !== undefined && g[i] >= 0);
          const total = d.segs.filter(s => s.ans !== undefined).length;
          const right = d.segs.filter((s, i) => s.ans !== undefined && g[i] === s.ans).length;
          const s = sel >= 0 ? d.segs[sel] : null;
          body.innerHTML = `<p class="tg-src">${inline(d.src)}</p>
            <div class="tg-doc">${d.segs.map((x, i) => x.ans === undefined ? `<span>${inline(x.t)}</span>`
              : `<button type="button" class="tg-seg${g[i] >= 0 ? ' tg-k' + g[i] : ''}" aria-pressed="${i === sel}" data-i="${i}">${inline(x.t)}${g[i] >= 0 ? `<small>${esc(w.labels[g[i]].name)}</small>` : ''}</button>`).join('')}</div>
            <div class="tg-key">${w.labels.map((l, k) => `<button type="button" class="tg-k${k}" data-k="${k}"${s ? '' : ' disabled'}><b>${esc(l.name)}</b><span>${inline(l.hint)}</span></button>`).join('')}</div>
            <div class="tg-out" aria-live="polite">${!s ? `<p class="tg-hint">先点上面一句带框的话，再选它在做哪种事。已标 ${tagged.length} / ${total}，标对 ${right}。</p>`
              : g[sel] < 0 ? '<p class="tg-hint">这一句在做哪种事？</p>'
              : `<p class="tg-reply">${g[sel] === s.ans ? '对。' : `这一句更像“${esc(w.labels[s.ans].name)}”。`}${inline(s.why)}</p><p class="tg-hint">已标 ${tagged.length} / ${total}，标对 ${right}。</p>`}</div>`;
          $$('.tg-seg', body).forEach(b => b.addEventListener('click', () => { sel = +b.dataset.i; draw('seg'); }));
          $$('.tg-key button', body).forEach(b => b.addEventListener('click', () => { if (sel >= 0) { got[cur][sel] = +b.dataset.k; draw('key'); } }));
          if (focus === 'seg') { const b = $(`.tg-seg[data-i="${sel}"]`, body); if (b) b.focus(); }
          if (focus === 'key') { const b = $(`.tg-seg[data-i="${sel}"]`, body); if (b) b.focus(); }
        };
        radios($('.tg-pick', fig), k => { cur = k; sel = -1; draw(); });
      },
    },
    // 04-02: code-word cards. Each card shows an alchemical code phrase; turning it over shows what historians think it
    // names on the bench, how they know, and how sure they are. No procedures: the back names materials, not steps.
    // w: { caption, cards: [{ code, who, plain, how, sure }] }
    decoder: {
      html: (w, no) => `<figure class="fig dc" data-widget="${no}">
        <div class="fig-frame"><div class="dc-grid">${w.cards.map((c, k) => `<div class="dc-card">
          <p class="dc-who">${inline(c.who)}</p>
          <p class="dc-code">${inline(c.code)}</p>
          <button type="button" aria-expanded="false" aria-controls="dc-${no}-${k}">翻到实验台那一面</button>
          <div class="dc-back" id="dc-${no}-${k}" hidden>
            <p class="dc-plain"><span class="label">指的是</span>${inline(c.plain)}</p>
            <p><span class="label">怎么知道的</span>${inline(c.how)}</p>
            <p class="dc-sure"><span class="label">把握</span>${inline(c.sure)}</p>
          </div></div>`).join('')}</div>
          <p class="dc-count" aria-live="polite">已翻开 0 / ${w.cards.length}</p></div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const count = () => { $('.dc-count', fig).textContent = `已翻开 ${$$('.dc-card button[aria-expanded="true"]', fig).length} / ${w.cards.length}`; };
        $$('.dc-card', fig).forEach(card => {
          const b = $('button', card), back = $('.dc-back', card);
          b.addEventListener('click', () => {
            const open = b.getAttribute('aria-expanded') !== 'true';
            b.setAttribute('aria-expanded', open); back.hidden = !open; card.classList.toggle('on', open);
            b.textContent = open ? '翻回谜语那一面' : '翻到实验台那一面'; count();
          });
        });
      },
    },
    // 04-03: one picture, several ways of reading it. Pick a reading (layer), then a part of the picture; a part the
    // chosen reading has nothing to say about is dimmed, and saying so is part of the lesson.
    // w: { caption, img, alt, layers: [{ name, hint }], spots: [{ x, y, label, notes: [text | null per layer] }] }
    emblem: {
      html: (w, no) => `<figure class="fig em" data-widget="${no}">
        <div class="fig-frame">
          <div class="em-sec"><p class="label">用哪一种眼光看</p></div>${radioRow('em-layer', '选择读法', w.layers.map(l => l.name))}
          <p class="em-hint"></p>
          <div class="gr-map ill"><div class="gr-pos"><div class="gr-svg" role="img" aria-label="${esc(w.alt)}"></div>${w.spots.map((p, k) => `<button type="button" class="gr-dot" style="left:${p.x}%;top:${p.y}%" data-k="${k}" tabindex="-1" aria-hidden="true">${k + 1}</button>`).join('')}</div></div>
          <ol class="gr-list em-list" aria-label="图上的部位">${w.spots.map((p, k) => `<li><button type="button" data-k="${k}" aria-pressed="${k === 0}" aria-controls="em${no}-p"><span>${k + 1}</span>${esc(p.label)}</button></li>`).join('')}</ol>
          <div class="em-body" id="em${no}-p" aria-live="polite"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        load('content/knowledge/' + w.img).then(svg => {
          if (!/^\s*<svg[\s>]/.test(svg)) return;
          $('.gr-svg', fig).innerHTML = svg;
          const el = $('.gr-svg svg', fig); el.removeAttribute('role'); el.removeAttribute('aria-label'); el.setAttribute('aria-hidden', 'true');
        }).catch(() => {});
        let L = 0, S = 0;
        const draw = () => {
          const p = w.spots[S], note = p.notes[L];
          $('.em-hint', fig).innerHTML = inline(w.layers[L].hint);
          $$('[data-k]', fig).forEach(b => {
            const k = +b.dataset.k, here = k === S;
            b.classList.toggle('on', here); b.classList.toggle('em-off', !w.spots[k].notes[L]);
            if (b.closest('.gr-list')) b.setAttribute('aria-pressed', here);
          });
          $('.em-body', fig).innerHTML = `<p class="gr-head"><span>${S + 1}</span>${esc(p.label)}<small>${esc(w.layers[L].name)}</small></p>`
            + (note ? `<p class="em-note">${inline(note)}</p>` : '<p class="em-none">这种眼光对这个部位没有说法。不硬找一个意思出来，也是读图的一部分。</p>');
        };
        fig.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { S = +b.dataset.k; draw(); } });
        radios($('.em-layer', fig), k => { L = k; draw(); });
      },
    },
    // 04-04: letter values, limited on purpose to examples the sources themselves give. Pick an example, add the
    // letters up one at a time (right to left, as Hebrew is read), then see what the source does with the number.
    // There is no free input: the point is how the rabbis used the sums, not to produce new ones.
    // w: { caption, lang?: 'he' | 'ar', hint?, examples: [{ tab, words: [{ he (or word), say, zh, letters: [[char, name, value]] }], src, use, note }] }
    // lang defaults to Hebrew; Arabic examples set lang 'ar' and a hint. Letters run right to left in both.
    gematria: {
      html: (w, no) => `<figure class="fig gm" data-widget="${no}">
        <div class="fig-frame">
          ${radioRow('gm-pick', '选择例子', w.examples.map(x => x.tab))}
          <div class="gm-body"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const body = $('.gm-body', fig), lang = esc(w.lang || 'he');
        let cur = 0, step = 0;
        const total = ex => ex.words.reduce((n, wd) => n + wd.letters.length, 0);
        const draw = focus => {
          const ex = w.examples[cur], all = total(ex);
          let seen = 0;
          const words = ex.words.map(wd => {
            let sum = 0;
            const tiles = wd.letters.map(([c, name, v]) => { const on = seen < step; seen++; if (on) sum += v;
              return `<li class="${on ? 'on' : ''}"><b lang="${lang}">${c}</b><span>${esc(name)}</span><i>${on ? v : '?'}</i></li>`; }).join('');
            const done = seen <= step;
            return `<div class="gm-word"><p class="gm-name"><b lang="${lang}">${wd.word || wd.he}</b> ${esc(wd.say)}，意思是“${esc(wd.zh)}”</p>
              <ol class="gm-tiles" dir="rtl">${tiles}</ol><p class="gm-sum">${done ? `合计 <b>${sum}</b>` : `已加到 ${sum}`}</p></div>`;
          }).join('');
          body.innerHTML = `<p class="gm-src">${inline(ex.src)}</p>${words}
            <div class="gm-ctl"><button type="button" class="gm-next"${step >= all ? ' disabled' : ''}>${step === 0 ? '从右往左，加第一个字母' : step >= all ? '已经加完' : '再加一个字母'}</button><button type="button" class="gm-all"${step >= all ? ' disabled' : ''}>一次加完</button></div>
            <div class="gm-out" aria-live="polite">${step >= all ? `<p class="gm-use"><span class="label">原文拿这个数做了什么</span>${inline(ex.use)}</p><p class="gm-note">${inline(ex.note)}</p>` : `<p class="gm-hint">${esc(w.hint || '希伯来文从右往左读。每个字母都有一个固定的数值。')}</p>`}</div>`;
          $('.gm-next', body).addEventListener('click', () => { step = Math.min(all, step + 1); draw('next'); });
          $('.gm-all', body).addEventListener('click', () => { step = all; draw('next'); });
          if (focus === 'next') { const b = $('.gm-next', body); if (!b.disabled) b.focus(); else $('.gm-out', body).setAttribute('tabindex', '-1'), $('.gm-out', body).focus(); }
        };
        radios($('.gm-pick', fig), k => { cur = k; step = 0; draw(); });
      },
    },
    // 05-03: change lines of a hexagram. Each case starts from the hexagram a source records; clicking a line turns it
    // yin <-> yang and the resulting hexagram is named from its two trigrams. When exactly the line the source names has
    // changed, the line statement and the readings recorded for it are shown. Lines are bits from the bottom (1 = yang).
    // w: { caption, cases: [{ tab, src, from, line, text, reading, other }] }
    hexagram: {
      html: (w, no) => `<figure class="fig hx" data-widget="${no}">
        <div class="fig-frame">
          <div class="hx-sec"><p class="label">选一个《左传》里的例子</p></div>${radioRow('hx-pick', '选择例子', w.cases.map(c => c.tab))}
          <div class="hx-body"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const TRI = { '111': '乾', '100': '震', '010': '坎', '001': '艮', '000': '坤', '011': '巽', '101': '离', '110': '兑' };
        const ORD = ['乾', '震', '坎', '艮', '坤', '巽', '离', '兑'];
        const NUM = [[1, 25, 6, 33, 12, 44, 13, 10], [34, 51, 40, 62, 16, 32, 55, 54], [5, 3, 29, 39, 8, 48, 63, 60], [26, 27, 4, 52, 23, 18, 22, 41],
          [11, 24, 7, 15, 2, 46, 36, 19], [9, 42, 59, 53, 20, 57, 37, 61], [14, 21, 64, 56, 35, 50, 30, 38], [43, 17, 47, 31, 45, 28, 49, 58]];
        const NAME = '乾 坤 屯 蒙 需 讼 师 比 小畜 履 泰 否 同人 大有 谦 豫 随 蛊 临 观 噬嗑 贲 剥 复 无妄 大畜 颐 大过 坎 离 咸 恒 遯 大壮 晋 明夷 家人 睽 蹇 解 损 益 夬 姤 萃 升 困 井 革 鼎 震 艮 渐 归妹 丰 旅 巽 兑 涣 节 中孚 小过 既济 未济'.split(' ');
        const POS = ['初', '二', '三', '四', '五', '上'];
        const hex = b => { const lo = TRI[b.slice(0, 3)], up = TRI[b.slice(3)], n = NUM[ORD.indexOf(up)][ORD.indexOf(lo)]; return { lo, up, n, name: NAME[n - 1] }; };
        const lineName = (b, i) => (i === 0 ? '初' + (b[i] === '1' ? '九' : '六') : i === 5 ? '上' + (b[i] === '1' ? '九' : '六') : (b[i] === '1' ? '九' : '六') + POS[i]);
        const body = $('.hx-body', fig);
        let c = w.cases[0], cur = c.from;
        const draw = focusI => {
          const a = hex(c.from), z = hex(cur), diff = [...cur].map((x, i) => (x !== c.from[i] ? i : -1)).filter(i => i >= 0);
          const lines = [5, 4, 3, 2, 1, 0].map(i => `<li><button type="button" class="hx-line${cur[i] === '1' ? ' yang' : ' yin'}${diff.includes(i) ? ' moved' : ''}" data-i="${i}" aria-label="${POS[i]}爻，原来是${c.from[i] === '1' ? '阳' : '阴'}爻，现在是${cur[i] === '1' ? '阳' : '阴'}爻。按一下让它变"><span class="hx-bar" aria-hidden="true"><i></i><i></i></span><span class="hx-tag">${lineName(c.from, i)}</span></button></li>`).join('');
          let out;
          if (!diff.length) out = `<p class="hx-hint">还没有爻变。按其中一爻，让它由阴变阳或由阳变阴。</p>`;
          else if (diff.length === 1 && diff[0] === c.line - 1) out = `<p class="hx-hit">变的是${lineName(c.from, diff[0])}：这正是《左传》记的“遇《${a.name}》之《${z.name}》”。</p>
            <p class="hx-text"><span class="label">《周易》这一爻的爻辞${c.uncited ? '（《左传》此处没有引用它）' : ''}</span>${inline(c.text)}</p>
            <p><span class="label">当时的人怎么读</span>${inline(c.reading)}</p>
            <p><span class="label">同一句话，也可以这样读</span>${inline(c.other)}</p>`;
          else out = `<p class="hx-hint">现在变了 ${diff.length} 爻（${diff.map(i => lineName(c.from, i)).join('、')}），得到《${z.name}》。这一例《左传》记的本卦和之卦只差一爻，是${lineName(c.from, c.line - 1)}。${diff.length > 1 ? '几爻同时变时该看哪一句，早期材料没有留下统一的规则，后世各家的说法也不一样。' : '换一爻，得到的就是另一个卦。这里只演示这条记载里的情形，不代表各个时代都按同一种办法读。'}</p>`;
          body.innerHTML = `<p class="hx-src">${inline(c.src)}</p>
            <div class="hx-main"><ol class="hx-lines" aria-label="六爻，从上到下：上、五、四、三、二、初">${lines}</ol>
              <div class="hx-read" aria-live="polite"><p class="hx-name"><span class="label">本卦</span><b>${a.name}</b><small>下${a.lo}上${a.up}</small></p>
                <p class="hx-name${diff.length ? ' on' : ''}"><span class="label">${diff.length ? '变成' : '还没变'}</span><b>${z.name}</b><small>下${z.lo}上${z.up}</small></p></div></div>
            <div class="hx-out" aria-live="polite">${out}</div>
            <div class="hx-ctl"><button type="button" class="hx-reset"${diff.length ? '' : ' disabled'}>回到本卦</button></div>`;
          $$('.hx-line', body).forEach(b => b.addEventListener('click', () => {
            const i = +b.dataset.i; cur = cur.slice(0, i) + (cur[i] === '1' ? '0' : '1') + cur.slice(i + 1); draw(i);
          }));
          $('.hx-reset', body).addEventListener('click', () => { cur = c.from; draw(c.line - 1); });
          if (focusI !== undefined) $(`.hx-line[data-i="${focusI}"]`, body).focus();
        };
        radios($('.hx-pick', fig), k => { c = w.cases[k]; cur = c.from; draw(); });
      },
    },
    // 05-04: step through the sixty-day cycle. The ten stems and the twelve branches each move one place per step; the
    // grid of sixty fills in as the reader goes, and notes keyed by step number say what that step shows.
    // w: { caption, stems: [10], branches: [12], notes: { step: text }, end }
    cycle: {
      html: (w, no) => `<figure class="fig cy" data-widget="${no}">
        <div class="fig-frame">
          <div class="cy-rows" aria-hidden="true"><ol class="cy-st">${w.stems.map(s => `<li>${s}</li>`).join('')}</ol><ol class="cy-br">${w.branches.map(s => `<li>${s}</li>`).join('')}</ol></div>
          <div class="cy-now" aria-live="polite"></div>
          <div class="cy-ctl"><button type="button" data-d="1">走 1 步</button><button type="button" data-d="10">走 10 步</button><button type="button" data-d="12">走 12 步</button><button type="button" data-d="-1">退 1 步</button><button type="button" data-d="0">回到甲子</button></div>
          <ol class="cy-grid" aria-label="六十个组合，已走到的标出"></ol>
          <p class="cy-note" aria-live="polite"></p>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const S = w.stems, B = w.branches, name = k => S[k % 10] + B[k % 12];
        let step = 0, seen = new Set([0]);
        const draw = () => {
          const k = step % 60, round = Math.floor(step / 60);
          $$('.cy-st li', fig).forEach((li, i) => li.classList.toggle('on', i === step % 10));
          $$('.cy-br li', fig).forEach((li, i) => li.classList.toggle('on', i === step % 12));
          $('.cy-now', fig).innerHTML = `<b>${name(step)}</b><span>第 ${step + 1} 个位置 · 从甲子起已走 ${step} 步${round ? `（已转完 ${round} 圈六十）` : ''}</span><span>天干第 ${step % 10 + 1} 个 · 地支第 ${step % 12 + 1} 个</span>`;
          $('.cy-grid', fig).innerHTML = Array.from({ length: 60 }, (_, j) => `<li class="${seen.has(j) ? 'seen' : ''}${j === k ? ' now' : ''}">${seen.has(j) ? name(j) : ''}</li>`).join('');
          const here = w.notes[step + 1];
          $('.cy-note', fig).innerHTML = here ? inline(here) : seen.size === 60 ? inline(w.end) : `已经走过 ${seen.size} 个不同的组合，还有 ${60 - seen.size} 个没出现。`;
        };
        $('.cy-ctl', fig).addEventListener('click', e => {
          const b = e.target.closest('[data-d]'); if (!b) return;
          const d = +b.dataset.d;
          if (d === 0) { step = 0; seen = new Set([0]); }
          else if (d < 0) step = Math.max(0, step - 1);
          else for (let i = 0; i < d; i++) { step++; seen.add(step % 60); }
          draw();
        });
        draw();
      },
    },
    // 06-02: inspect a magic square. Click one cell, then another, to swap them; every row, column and diagonal sum is
    // listed and checked against the constant, so the property can be seen to belong to the arrangement. A case may
    // give letters for its numbers (only where each number has a single abjad letter, 1-9). Cases say whether the square
    // is a documented arrangement or a mathematically valid illustration.
    // w: { caption, cases: [{ tab, kind, src, grid: [[n]], letters?: [char], math, hist }] }
    magicsq: {
      html: (w, no) => `<figure class="fig ms" data-widget="${no}">
        <div class="fig-frame">
          ${radioRow('ms-pick', '选择幻方', w.cases.map(c => c.tab))}
          <div class="ms-body"></div>
        </div>
        <figcaption><b>图 ${no}</b>${inline(w.caption)}</figcaption></figure>`,
      wire(fig, w) {
        const body = $('.ms-body', fig);
        let cur = 0, grid, sel = null, lit = -1, letters = false;
        const sums = g => {
          const n = g.length, L = [];
          for (let i = 0; i < n; i++) L.push({ name: `第 ${i + 1} 行`, cells: g[i].map((_, j) => [i, j]) });
          for (let j = 0; j < n; j++) L.push({ name: `第 ${j + 1} 列`, cells: g.map((_, i) => [i, j]) });
          L.push({ name: '对角线 ↘', cells: g.map((_, i) => [i, i]) }, { name: '对角线 ↙', cells: g.map((_, i) => [i, n - 1 - i]) });
          return L.map(l => ({ ...l, sum: l.cells.reduce((a, [i, j]) => a + g[i][j], 0) }));
        };
        const draw = focus => {
          const c = w.cases[cur], n = grid.length, K = n * (n * n + 1) / 2, L = sums(grid);
          const ok = L.filter(l => l.sum === K).length, hot = lit >= 0 ? new Set(L[lit].cells.map(([i, j]) => i * n + j)) : new Set();
          const label = v => (letters && c.letters ? c.letters[v - 1] : v);
          body.innerHTML = `<p class="ms-src"><span class="ms-kind ${c.kind === 'documented' ? 'doc' : 'ill'}">${c.kind === 'documented' ? '史料中有这种排法' : '数学示例，非某一件史料'}</span>${inline(c.src)}</p>
            <div class="ms-main"><div class="ms-grid" style="--n:${n}" role="group" aria-label="${n}×${n} 方阵，点一格再点另一格，交换它们">${grid.map((r, i) => r.map((v, j) => `<button type="button" class="ms-cell${hot.has(i * n + j) ? ' hot' : ''}${sel && sel[0] === i && sel[1] === j ? ' sel' : ''}" data-i="${i}" data-j="${j}" ${c.letters && letters ? 'lang="ar"' : ''} aria-label="第 ${i + 1} 行第 ${j + 1} 列，${v}">${label(v)}</button>`).join('')).join('')}</div>
              <ul class="ms-lines" aria-label="各行各列各对角线的和">${L.map((l, k) => `<li><button type="button" class="ms-line ${l.sum === K ? 'ok' : 'no'}${k === lit ? ' on' : ''}" data-k="${k}" aria-pressed="${k === lit}"><span>${l.name}</span><b>${l.sum}</b><i>${l.sum === K ? '✓' : '✗'}</i></button></li>`).join('')}</ul></div>
            <p class="ms-sum" aria-live="polite">应有的和：${n} × (${n}² + 1) ÷ 2 ＝ <b>${K}</b>。现在 ${L.length} 条线里有 <b>${ok}</b> 条符合。${ok === L.length ? '' : '交换过的方阵，已经不是幻方了。'}</p>
            <div class="ms-ctl">${c.letters ? `<button type="button" class="ms-let" aria-pressed="${letters}">${letters ? '改看数字' : '改看字母（abjad）'}</button>` : ''}<button type="button" class="ms-reset"${JSON.stringify(grid) === JSON.stringify(c.grid) ? ' disabled' : ''}>还原</button></div>
            <div class="ms-out"><p><span class="label">数学上能说的</span>${inline(c.math)}</p><p><span class="label">史料里的说法，要分开看</span>${inline(c.hist)}</p></div>`;
          $$('.ms-cell', body).forEach(b => b.addEventListener('click', () => {
            const i = +b.dataset.i, j = +b.dataset.j;
            if (!sel) sel = [i, j];
            else { if (sel[0] !== i || sel[1] !== j) { const t = grid[i][j]; grid[i][j] = grid[sel[0]][sel[1]]; grid[sel[0]][sel[1]] = t; } sel = null; }
            draw(`c${i}-${j}`);
          }));
          $$('.ms-line', body).forEach(b => b.addEventListener('click', () => { lit = lit === +b.dataset.k ? -1 : +b.dataset.k; draw(`l${b.dataset.k}`); }));
          const lb = $('.ms-let', body); if (lb) lb.addEventListener('click', () => { letters = !letters; draw('let'); });
          $('.ms-reset', body).addEventListener('click', () => { grid = c.grid.map(r => r.slice()); sel = null; draw('reset'); });
          if (focus && focus[0] === 'c') { const [i, j] = focus.slice(1).split('-'); const b = $(`.ms-cell[data-i="${i}"][data-j="${j}"]`, body); if (b) b.focus(); }
          else if (focus && focus[0] === 'l') { const b = $(`.ms-line[data-k="${focus.slice(1)}"]`, body); if (b) b.focus(); }
          else if (focus === 'let') { const b = $('.ms-let', body); if (b) b.focus(); }
        };
        radios($('.ms-pick', fig), k => { cur = k; grid = w.cases[k].grid.map(r => r.slice()); sel = null; lit = -1; letters = false; draw(); });
      },
    },
  };
  const widgetHtml = (w, no) => (w && W[w.type] ? W[w.type].html(w, no) : '');
  const widgetWire = (fig, w) => { if (w && W[w.type]) W[w.type].wire(fig, w); };
  const hanCount = el => (el.textContent.match(/[一-鿿]/g) || []).length;

  // The chapter list that stays at the left edge of a reading page (wide screens only). It is built from the
  // headings already on the page, marks the one being read, and is only shown while the text itself is on screen.
  // items: [{ el, n, label, sub }]
  // On narrower screens, where that list has no room, the same items fold into a "目" button among the corner tools;
  // a tap opens them as a panel from the bottom edge, and choosing one goes there and folds the panel away.
  function chapterNav(article, items) {
    ['.chap-nav', '.toc-sheet', '.toc-btn'].forEach(s => { const old = $(s); if (old) old.remove(); });
    if (!article || items.length < 2) return;
    const list = `<ol>${items.map((it, k) => `<li class="${it.sub ? 'sub' : ''}"><a href="#" data-k="${k}">${it.n ? `<b>${esc(it.n)}</b>` : ''}${it.label ? `<span>${esc(it.label)}</span>` : ''}</a></li>`).join('')}</ol>`;
    const nav = document.createElement('nav');
    nav.className = 'chap-nav'; nav.setAttribute('aria-label', '章节目录');
    nav.innerHTML = `<p class="label">目录</p>${list}`;
    body.append(nav);
    const sheetEl = document.createElement('div');
    sheetEl.className = 'toc-sheet'; sheetEl.id = 'toc-sheet'; sheetEl.hidden = true;
    sheetEl.innerHTML = `<div class="toc-scrim" data-toc-close></div><div class="toc-panel" role="dialog" aria-modal="true" aria-label="目录"><div class="toc-head"><span class="label">目录</span><button type="button" data-toc-close>收起</button></div>${list}</div>`;
    body.append(sheetEl);
    $('.tools').insertAdjacentHTML('afterbegin', '<button type="button" class="toc-btn" aria-label="目录" aria-controls="toc-sheet" aria-expanded="false">目</button>');
    const tocBtn = $('.toc-btn'), links = $$('a', nav), sheetLinks = $$('a', sheetEl);
    const go = k => {
      const top = items[k].el.getBoundingClientRect().top + scrollY - 110;
      scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    const openToc = () => {
      sheetEl.hidden = false; void sheetEl.offsetWidth; sheetEl.classList.add('open'); tocBtn.setAttribute('aria-expanded', 'true');
      const on = $('a.on', sheetEl) || sheetLinks[0], ol = $('ol', sheetEl);
      ol.scrollTop = Math.max(0, on.offsetTop - ol.clientHeight / 2); on.focus({ preventScroll: true });
    };
    const closeToc = (refocus = true) => {
      if (sheetEl.hidden) return;
      sheetEl.classList.remove('open'); tocBtn.setAttribute('aria-expanded', 'false');
      setTimeout(() => { if (!sheetEl.classList.contains('open')) sheetEl.hidden = true; }, 220);
      if (refocus) tocBtn.focus({ preventScroll: true });
    };
    tocBtn.addEventListener('click', () => (sheetEl.hidden ? openToc() : closeToc()));
    sheetEl.addEventListener('click', e => {
      if (e.target.closest('[data-toc-close]')) { closeToc(); return; }
      const a = e.target.closest('a'); if (!a) return;
      e.preventDefault(); closeToc(false); go(+a.dataset.k);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeToc(); });
    addEventListener('resize', () => { if (!tocBtn.offsetParent) closeToc(false); });   // widened past the point where the side list returns
    nav.addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a) return;
      e.preventDefault(); go(+a.dataset.k);
    });
    let cur = -2;
    const update = () => {
      const r = article.getBoundingClientRect();
      nav.classList.toggle('is-on', r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.45);
      let k = -1;
      items.forEach((it, j) => { if (it.el.getBoundingClientRect().top <= innerHeight * 0.4) k = j; });
      if (k === cur) return;
      cur = k;
      [links, sheetLinks].forEach(ls => ls.forEach((a, j) => { a.classList.toggle('on', j === k); if (j === k) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }));
      const on = links[k];
      if (on && nav.scrollHeight > nav.clientHeight) nav.scrollTop = on.offsetTop - nav.clientHeight / 2;
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update(); setTimeout(update, 500);
  }

  /* ---------- pages ---------- */
  const R = {
    home() {
      const door = (e, i) => `<a class="e-obj" href="${e.href || 'stage.html?s=' + e.to}" style="left:${e.x}%;top:${e.y}%;--r:${e.r}deg;--d:${-i * 0.7}s">${draw(e.o)}<span>${esc(e.t)}</span></a>`;
      // seven doors follow the route of the curriculum: method, three parallel histories, the modern turn, the present, judgement
      $('#e-objs').innerHTML = [
        // every door opens the same page, the overview, at its own place on the route. One way in, always.
        { o: 0, x: 50, y: 13, r: 0, t: '读符号的方法', href: 'knowledge.html#p1' }, { o: 2, x: 80, y: 24, r: 5, t: '地中海与欧洲', href: 'knowledge.html#g-west' },
        { o: 4, x: 90, y: 56, r: -4, t: '中国', href: 'knowledge.html#g-china' }, { o: 5, x: 70, y: 84, r: 4, t: '亚洲其他传统', href: 'knowledge.html#g-asia' },
        { o: 6, x: 30, y: 84, r: -6, t: '现代秘传运动', href: 'knowledge.html#st-07' }, { o: 7, x: 10, y: 56, r: 5, t: '当代符号文化', href: 'knowledge.html#st-08' },
        { o: 8, x: 20, y: 24, r: -4, t: '比较与证据', href: 'knowledge.html#p4' },
      ].map(door).join('');
      // phones: four small ones, one for each movement (learn to read, enter the histories, follow the modern turn, judge)
      $('#e-objs-m').innerHTML = [
        { o: 0, x: 23, y: 21, r: -5, t: '读符号', href: 'knowledge.html#p1' }, { o: 2, x: 77, y: 26, r: 5, t: '走进历史', href: 'knowledge.html#p2' },
        { o: 7, x: 24, y: 76, r: 5, t: '现代的变化', href: 'knowledge.html#p3' }, { o: 8, x: 77, y: 72, r: -4, t: '比较与判断', href: 'knowledge.html#p4' },
      ].map(door).join('');

      const home = $('.home');
      const restart = field(home, (W, H, rect) => {
        const small = W <= 700, c = $('.e-center');
        // the clear space hugs the title and the drawings; everything else is written edge to edge
        const mid = small ? around(c, rect, [0.86, 1.08], 0.62, 1.2) : around(c, rect, [Math.max(1.1, W * 0.34 / c.offsetWidth), Math.max(1.35, H * 0.32 / c.offsetHeight)], 0.66, 1.6);
        const spots = $$('.e-obj', home).filter(el => el.getBoundingClientRect().width > 0).map(el => around(el, rect, [1.1, 1.1], 0.75, 1.45));
        return (x, y) => spots.reduce((f, s) => f * s(x, y), mid(x, y));
      }, 1, { cs: W => W < 700 ? 24 : 30, lead: 1.12, skip: 0.03 });

      // The wordmark is deciphered: each slot flickers through the unreadable script, spins through candidate letters,
      // then locks, left to right. Driven by timers and the clock, so it always ends on the word.
      const word = $('#e-word'), FINAL = 'SignaPilot', POOL = 'abcdefghijklmnopqrstuvwxyzSPRQXZ';
      word.innerHTML = FINAL.split('').map(ch => `<span class="slot"><i>${ch}</i><canvas aria-hidden="true"></canvas></span>`).join('');
      const slots = $$('.slot', word).map(el => ({ el, i: $('i', el), cv: $('canvas', el) }));
      let timer = 0;
      function decode() {
        clearInterval(timer);
        const dpr = Math.min(devicePixelRatio || 1, 2), fsz = parseFloat(getComputedStyle(word).fontSize);
        slots.forEach((s, k) => {
          s.el.style.width = ''; s.i.textContent = FINAL[k]; s.el.className = 'slot';
          const w = s.i.getBoundingClientRect().width, h = s.el.getBoundingClientRect().height;
          s.el.style.width = (w / fsz).toFixed(4) + 'em';   // em, so spacing survives a change of window size
          s.w = w; s.h = h; s.state = 0;
          s.cv.width = Math.max(1, w * dpr); s.cv.height = Math.max(1, h * dpr); s.cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
          s.el.classList.add('cipher');
        });
        if (reduced) { slots.forEach(s => { s.el.className = 'slot'; }); return; }
        const t0 = performance.now(), CIPHER = 900, STEP = 170, SPIN = 420;
        timer = setInterval(() => {
          const t = performance.now() - t0; let done = 0;
          slots.forEach((s, k) => {
            const start = CIPHER + k * STEP;
            if (t < start) { const c2 = s.cv.getContext('2d'), g = Math.min(s.h * 0.62, Math.max(s.w, s.h * 0.42)); c2.clearRect(0, 0, s.w, s.h); glyph(c2, (s.w - g) / 2, (s.h - g) / 2 + s.h * 0.04, g, 0.9, '236,232,220'); }
            else if (t < start + SPIN) { if (s.state !== 1) { s.state = 1; s.el.className = 'slot spin'; } s.i.textContent = POOL[Math.random() * POOL.length | 0]; }
            else { if (s.state !== 2) { s.state = 2; s.i.textContent = FINAL[k]; s.el.className = 'slot lock'; } done++; }
          });
          if (done === slots.length) { clearInterval(timer); setTimeout(() => slots.forEach(s => s.el.classList.add('settled')), 500); }
        }, 55);
      }
      // play on every arrival: first load and the back button, including pages restored from the back/forward cache
      let fontsIn = false;
      addEventListener('pageshow', () => { if (fontsIn) { restart(); decode(); } });
      const ready = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
      ready.then(() => { fontsIn = true; restart(); decode(); });
    },

    knowledge() {
      headField($('.page-head'));
      // One structure, top to bottom: four parts, each listing its stages. Courses live one level down, on the stage page.
      $('#rail').innerHTML = rail(null, true);
      const srow = sid => {
        const s = D.stages.find(x => x.id === sid), i = D.stages.indexOf(s);
        return `<a class="srow" id="st-${sid}" href="stage.html?s=${sid}">${draw(i)}<div><span class="srow-n">Stage ${Number(sid)}</span><h3>${esc(s.title)}</h3><p>${esc(s.q)}</p></div><div class="srow-m"><span>${s.courses.length} 课</span></div><i class="srow-go">→</i></a>`;
      };
      $('#parts').innerHTML = PARTS.map(p => `<section class="part" id="${p.id}">
        <div class="part-h"><span class="label">第${p.n}部分</span><h2>${p.name}</h2><p>${p.note}</p></div>
        <div class="part-b">${p.groups.map(g => `<div class="grp" id="${g.id}">${g.name ? `<span class="grp-n">${g.name}</span>` : ''}${g.stages.map(srow).join('')}</div>`).join('')}</div>
      </section>`).join('');
      // arriving from a home-page door: the page is drawn by script, so go to the place and mark it ourselves
      const seg = location.hash && document.getElementById(location.hash.slice(1));
      if (seg) seg.classList.add('here');
      if (seg && !isBack) {   // on a back visit the reader's own position wins over the door's anchor
        // leave room for the sticky bar and the line that introduces the stretch; repeat once the web fonts have settled the layout
        const go = () => scrollTo(0, Math.max(0, seg.getBoundingClientRect().top + scrollY - 150));
        go(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
        addEventListener('load', go); setTimeout(go, 700);
      }
      // the flat list of all 61 courses is still here for people who want it, but folded away so it does not compete
      $('#toc').innerHTML = D.stages.map(s => `<section class="toc-stage" id="s${s.id}"><div><span class="mono">Stage ${Number(s.id)}</span><h3><a href="stage.html?s=${s.id}">${esc(s.title)}</a></h3></div><div class="toc-list">${s.courses.map(c => `<a href="${lessonHref(c.id)}"><span class="mono">${c.id}</span><span class="t">${esc(c.title)}</span></a>`).join('')}</div></section>`).join('');
    },

    stage() {
      const s = D.stages.find(x => x.id === qs.get('s')) || D.stages[4], i = D.stages.indexOf(s);
      document.title = `Stage ${s.id} ${s.title} · SignaPilot`;
      const hooks = { '05-06': '梁山一百单八将，为什么会出现在道士的秘本里？' };
      const pre = { '01': '无需先修', '02': '建议先读 Stage 01', '03': '先修 Stage 01–02', '04': '先修 Stage 03', '05': '先修 Stage 01–02，可与 03–04 并行', '06': '先修 Stage 01–02', '07': '建立在 03–06 的历史对象之上', '08': '与此前各阶段交叉引用', '09': '建议最后阅读' };
      $('#stage').innerHTML = `
        <div class="page-head"><div class="wrap">
          <div class="stage-head"><div>
            ${rail(s.id)}
            <p class="crumb"><a href="knowledge.html#${partOf(s.id).id}">第${partOf(s.id).n}部分 · ${partOf(s.id).name}</a> ／ Stage ${Number(s.id)}，共 9 个阶段</p>
            <h1>${esc(s.title)}</h1>
            <p class="stage-q">${esc(s.q)}</p>
            <div class="stage-meta"><span>${s.courses.length} 门课</span><span>${pre[s.id]}</span></div>
          </div><div class="stage-num" aria-hidden="true">${draw(i)}</div></div>
        </div></div>
        <div class="wrap"><ol class="seq">${s.courses.map(c => {
          return `<li class="${hooks[c.id] ? 'featured' : ''}"><div><span class="mono">${c.id}</span><h3><a href="${lessonHref(c.id)}">${esc(c.title)}</a>${WRITTEN_K[c.id] ? ` <span class="state">${K_STATE[WRITTEN_K[c.id].state]}</span>` : ''}</h3><p class="scope">${esc(c.scope)}</p>${hooks[c.id] ? `<p class="hook">${hooks[c.id]}</p>` : ''}</div></li>`;
        }).join('')}</ol>
        <nav class="stage-nav">${i > 0 ? `<a href="stage.html?s=${D.stages[i - 1].id}"><span class="label">上一阶段</span><b>${esc(D.stages[i - 1].title)}</b></a>` : '<span></span>'}${i < 8 ? `<a href="stage.html?s=${D.stages[i + 1].id}"><span class="label">下一阶段</span><b>${esc(D.stages[i + 1].title)}</b></a>` : '<span></span>'}</nav></div>`;
      headField($('.page-head'));
    },

    lesson() {
      const id = D.courseIndex[qs.get('c')] ? qs.get('c') : '05-06';
      const c = D.courseIndex[id], all = D.allCourses, i = all.findIndex(x => x.id === id);
      document.title = `${id} ${c.title} · SignaPilot`;
      $('#l-crumb').innerHTML = `<a href="knowledge.html#${partOf(c.stage.id).id}">第${partOf(c.stage.id).n}部分</a> ／ <a href="stage.html?s=${c.stage.id}">Stage ${Number(c.stage.id)} ${esc(c.stage.title)}</a>`;
      $('#l-crumb').insertAdjacentHTML('beforebegin', rail(c.stage.id));
      $('#l-id').textContent = `${id} · 第 ${c.n} / ${c.stage.courses.length} 课`;
      $('#l-title').textContent = c.title;
      const p = all[i - 1], n = all[i + 1];
      $('#l-pager').innerHTML = (p ? `<a href="${lessonHref(p.id)}"><span>上一课 · ${p.id}</span><b>${esc(p.title)}</b></a>` : '<span></span>') + (n ? `<a href="${lessonHref(n.id)}"><span>下一课 · ${n.id}</span><b>${esc(n.title)}</b></a>` : '<span></span>');
      const toc = () => chapterNav($('.prose'), $$('.prose h2').map(el => {
        const m = $('.mono', el), n = m ? m.textContent.trim() : '';
        return { el, n, label: el.textContent.trim().slice(n.length) };
      }));
      // citation marker: on narrow screens it unfolds its note under the paragraph; on wide screens it points at the reference
      const cites = () => $$('.prose .cite').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const sn = $('#sn' + a.dataset.n);
        if (sn) { if (matchMedia('(max-width: 1060px)').matches) a.closest('p, li').after(sn); sn.classList.toggle('open'); }
        $$('.refs li').forEach(li => li.classList.toggle('hl', !!a.dataset.r && li.dataset.n === a.dataset.r));
      }));
      const wk = WRITTEN_K[id], src = wk && wk.src, prose = $('.prose'), note = $('#l-note');
      if (src) {
        // a written course replaces the layout sample with its own manuscript; the sample is never shown in its place
        prose.innerHTML = '<p class="loading">正文载入中……</p>';
        load(src).then(text => {
          const L = lessonHtml(text);
          prose.innerHTML = L.html;
          placeFigures(prose);
          $$('figure[data-widget]', prose).forEach((f, k) => widgetWire(f, L.widgets[k]));
          // the length shown is the running text only: margin notes, references and figure text are left out
          const figs = $$('figure.fig', prose).length - L.widgets.length, main = prose.cloneNode(true);
          $$('.sn, .refs, figure', main).forEach(x => x.remove());
          const chars = Math.round(hanCount(main) / 100) * 100;
          $('.lesson-head .sub').innerHTML = `<span>约 ${chars.toLocaleString('en')} 字</span><span>${figs} 幅图${L.widgets.length ? ` · ${L.widgets.length} 个可操作图示` : ''}</span><span class="state">${K_STATE[wk.state]}</span>`;
          toc(); cites();
          fields.forEach(f => f());
          resumeReading();
        }).catch(() => {
          prose.innerHTML = '<p class="loading">这一课的正文暂时没有加载出来，请稍后刷新。</p>';
          resumeReading();
        });
        deferResume = true;
      } else {
        note.textContent = id === '05-06'
          ? '本课尚未写成：下面是版式样稿，内容与出处都未经核实。'
          : `本课尚未写成：下面是 05-06 的版式样稿，不是本课正文。`;
        note.hidden = false;
        $('.lesson-head .sub').innerHTML = '<span>尚未写成 · 版式样稿</span>';   // the sample's length and figure count are not this course's
        toc(); cites();
      }
      // a manuscript plate that is still waiting for its image shows faint writing instead of an empty box
      $$('.fig-frame').filter(f => $('.ph', f)).forEach(f => field(f, (W, H, rect) => around($('.ph div', f) || $('.ph', f), rect, [1.2, 1.5], 0.6, 1.6), 0.55));
      const layers = [
        { lv: '第一层 · 小说里写了什么', n: 4, t: '《水浒传》开篇：一座道观的殿内镇着一百零八个魔君，石碑上刻着旁人认不得的文字。这是文本本身，任何人翻开书都能核对。' },
        { lv: '第二层 · 手稿里有什么', n: 3, t: '一份十九世纪的道教授箓手册，为一百零八位好汉逐一配了“天书”符形。这是研究者报告的实物内容；我们读到的是他的描述与图版，不是手稿本身。' },
        { lv: '第三层 · 学者怎么解释', n: 2, t: '研究者据此主张：小说里的天书与仪式里的天书属于同一个意义世界，读这部小说不该脱离仪式。这是一种有依据的学术解释，也有人持不同看法。' },
        { lv: '第四层 · 仍然不能断言的', n: 1, t: '小说的情节“来自”某一种仪式？梁山好汉在各地都被当作神将召请？手稿比小说晚了几百年，这些更强的说法，现有材料撑不起来。' },
      ];
      const tabs = $('#layers-tabs'), out = $('#layers-body');
      if (tabs) {
        tabs.innerHTML = layers.map((l, k) => `<button type="button" role="tab" aria-selected="${k === 0}">${l.lv.split(' · ')[1]}</button>`).join('');
        const show = k => {
          const l = layers[k];
          out.innerHTML = `<span class="lv">${l.lv}</span><p>${l.t}</p><div class="meter">证据强度 ${[1, 2, 3, 4].map(x => `<i class="${x <= l.n ? 'on' : ''}"></i>`).join('')}</div>`;
          $$('button', tabs).forEach((b, j) => b.setAttribute('aria-selected', j === k));
        };
        tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show($$('button', tabs).indexOf(b)); });
        show(0);
      }
    },

    cases() {
      headField($('.page-head'));
      const tags = ['全部', '当代', '历史', '幻想', '喜剧', '恐怖', '爱情'];
      $('#filters').innerHTML = tags.map((t, i) => `<button type="button" aria-pressed="${i === 0}">${t}</button>`).join('');
      $('#shelf').innerHTML = D.cases.map(c => {
        return `<li data-tags="${c.tags.join(' ')}"><a href="${caseHref(c.id)}">
          <div class="em">${glyphSvg(c.glyph)}<span class="mono">${Number(c.id)}</span></div>
          <div><h3>${esc(c.title)}</h3><p class="genre">${esc(c.genre)}</p><p class="setting">${esc(c.setting)}</p></div>
          <p class="premise">${esc(c.premise)}</p>
          <div class="len"><b>约 ${c.len.toFixed(1)} 万字</b></div>
        </a></li>`;
      }).join('');
      $('#filters').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#filters button').forEach(x => x.setAttribute('aria-pressed', x === b));
        const t = b.textContent;
        $$('#shelf li').forEach(li => { li.hidden = t !== '全部' && !li.dataset.tags.split(' ').includes(t); });
      });
    },

    case() {
      const c = caseById(qs.get('c')) || D.cases[0], i = D.cases.indexOf(c), n = D.cases[(i + 1) % D.cases.length];
      document.title = `${c.title} · Cases · SignaPilot`;
      const cover = $('#c-cover');
      cover.innerHTML = `<div class="cover-in">${glyphSvg(c.glyph)}<h1 class="${c.title.length > 3 ? 'long' : ''}">${esc(c.title)}</h1><div class="cover-meta"><span class="label">Case ${Number(c.id)}</span><p>${esc(c.genre)}</p><p>${esc(c.setting)} · 约 ${c.len.toFixed(1)} 万字</p><a class="begin" href="#story">开始阅读 ↓</a></div></div>`;
      // the cover is the same writing as the home page, clearing around the title
      field(cover, (W, H, rect) => around($('.cover-in', cover), rect, W <= 700 ? [1, 1.05] : [1.3, 1.25], 0.8, W <= 700 ? 1.5 : 1.9));
      const after = $('.after');
      field(after, (W, H, rect) => { const f = around($('div', after), rect, [1.5, 2], 0.8, 2.2); return (x, y) => f(x, y) * smooth(0.1, 0.6, y / H); }, 0.5);
      const w = WRITTEN[c.id];
      if (w) {
        // a written case replaces the layout sample with its manuscript; if it cannot be fetched the sample stays and says so
        load(w.story).then(text => {
          $('#story').innerHTML = storyHtml(text);
          const cast = castHtml(text);
          if (cast) { $('#cast').innerHTML = cast; $('#cast').hidden = false; const b = $('.begin', cover); if (b) b.href = '#cast'; }
          placeFigures($('#story'));
          chapterNav($('#story'), $$('#story .chap, #story .mark').map(el => {
            const t = el.textContent.trim();
            return el.classList.contains('chap') ? { el, n: t, label: '' } : { el, sub: true, label: (t.match(/^第.{1,3}?[盏场幕夜天封]./) || [t.slice(0, 8)])[0] };
          }));
          fields.forEach(f => f());      // the page is much taller now, so the writing is laid out again
          resumeReading();
        }).catch(() => { const n = $('#c-note'); n.textContent = '这篇小说的正文暂时没有加载出来，下面显示的是版式示意。'; n.hidden = false; resumeReading(); });
        deferResume = true;              // the manuscript arrives later; resume once it is on the page
      } else if (c.id !== '01') $('#c-note').hidden = false;
      $('#c-notes').href = `notes.html?c=${c.id}`;
      $('#c-next').innerHTML = `下一篇 · <a href="${caseHref(n.id)}">${esc(n.title)}</a>`;
    },

    notes() {
      const c = caseById(qs.get('c')) || D.cases[0];
      document.title = `Case Notes · ${c.title} · SignaPilot`;
      $('#n-label').textContent = `Case Notes · ${Number(c.id)}`;
      $('#n-title').textContent = `《${c.title}》背后的档案`;
      $('#n-back').href = caseHref(c.id);
      const w = WRITTEN[c.id];
      if (w) {
        load(w.notes).then(text => {
          const n = notesHtml(text);
          $('.notes-nav').innerHTML = n.nav; $('.notes-body').innerHTML = n.body;
          placeFigures($('.notes-body'));
          notesToc();
          restorePosition();
        }).catch(() => { const n = $('#n-note'); n.textContent = '这篇的 Case Notes 暂时没有加载出来，下面显示的是示例结构。'; n.hidden = false; });
      } else if (c.id !== '01') $('#n-note').hidden = false;
      // the notes have their own section list at the top; the "目" button keeps it at hand further down the page
      function notesToc() {
        chapterNav($('.notes-body'), $$('.notes-body > section > h2').map(el => {
          const m = $('.mono', el), n = m ? m.textContent.trim() : '';
          return { el, n, label: el.textContent.trim().slice(n.length) };
        }));
      }
      if (!w) notesToc();
      headField($('.notes-head'));
      $('#n-links').innerHTML = ['01-03', '02-02', '02-04'].map(id => { const k = D.courseIndex[id]; return `<a href="${lessonHref(id)}"><span class="mono">${id}</span><span class="t">${esc(k.title)}</span><em>Stage ${Number(k.stage.id)}</em></a>`; }).join('');
    },
  };
  let deferResume = false;
  if (R[page]) R[page]();
  restorePosition();
  if (!deferResume) resumeReading();

  /* ---------- back to top ---------- */
  // Same behaviour as the sibling sites: it appears after one screen of scrolling and leaves only at the very top.
  // A tap scrolls to the top. A press held for 0.2 s lifts the button, pulses a ring twice and shows a label;
  // it can then be dragged anywhere, and the place is remembered as fractions of the viewport.
  if (page !== 'home') {
    const SIZE = 46, EDGE = 8, HOLD = 200, KEY = 'sp-btt-pos';
    body.insertAdjacentHTML('beforeend', '<button class="btt" type="button" aria-label="回到顶部" title="回到顶部（按住 0.2 秒可拖动）" tabindex="-1" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V6M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="btt-label" aria-hidden="true">拖动可以移动</span></button>');
    const btn = $('.btt'), clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    let pos = null, shown = false, press = null, swallow = false;
    try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p && typeof p.fx === 'number' && typeof p.fy === 'number') pos = p; } catch (e) { /* default corner */ }
    const place = () => {
      if (!pos) return;
      const x = EDGE + pos.fx * (innerWidth - SIZE - 2 * EDGE), y = EDGE + pos.fy * (innerHeight - SIZE - 2 * EDGE);
      btn.style.left = x + 'px'; btn.style.top = y + 'px'; btn.style.right = 'auto'; btn.style.bottom = 'auto';
      btn.classList.toggle('btt--label-right', x < innerWidth / 2);
    };
    const update = () => {
      shown = scrollY <= 4 ? false : (shown || scrollY > innerHeight);
      btn.classList.toggle('is-shown', shown); btn.tabIndex = shown ? 0 : -1; btn.setAttribute('aria-hidden', String(!shown));
    };
    // going back to the top is also the reader saying "start over": the saved reading position is cleared
    const toTop = () => { reading.set(null); resetting = true; scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); };
    // The floating back button: once the reader has scrolled down, "back" waits in the bottom-left corner,
    // opposite the back-to-top button. It is the same action as the one in the top bar, and it does not move.
    body.insertAdjacentHTML('beforeend', `<a class="to-back" href="${parentHref}" data-back aria-label="返回上一页" tabindex="-1" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 12H6M11.5 5.5 5 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span>返回</span></a>`);
    const fab = $('.to-back');
    const updateFab = () => { const on = scrollY > 240; fab.classList.toggle('is-on', on); fab.tabIndex = on ? 0 : -1; fab.setAttribute('aria-hidden', String(!on)); };
    place(); addEventListener('resize', place);
    addEventListener('scroll', () => { update(); updateFab(); }, { passive: true }); setTimeout(() => { update(); updateFab(); }, 400);
    btn.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const r = btn.getBoundingClientRect();
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      const p = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, armed: false, moved: false, cancelled: false, timer: 0 };
      p.timer = setTimeout(() => { p.armed = true; btn.classList.add('is-hint', 'is-dragging'); if (navigator.vibrate) navigator.vibrate(10); }, HOLD);
      press = p;
    });
    btn.addEventListener('pointermove', e => {
      const p = press; if (!p || p.id !== e.pointerId) return;
      if (!p.armed) { if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8) { p.cancelled = true; clearTimeout(p.timer); } return; }   // moving before the hold completes is neither a tap nor a drag
      p.moved = true;
      const x = clamp(e.clientX - p.ox, EDGE, innerWidth - SIZE - EDGE), y = clamp(e.clientY - p.oy, EDGE, innerHeight - SIZE - EDGE);
      pos = { fx: clamp((x - EDGE) / Math.max(1, innerWidth - SIZE - 2 * EDGE), 0, 1), fy: clamp((y - EDGE) / Math.max(1, innerHeight - SIZE - 2 * EDGE), 0, 1) };
      place();
    });
    const finish = (e, cancel) => {
      const p = press; if (!p || p.id !== e.pointerId) return;
      clearTimeout(p.timer); press = null; btn.classList.remove('is-hint', 'is-dragging'); swallow = true;
      if (p.armed) { if (p.moved && pos) { try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch (err) { /* not remembered */ } } return; }
      if (!p.cancelled && !cancel) toTop();
    };
    btn.addEventListener('pointerup', e => finish(e, false));
    btn.addEventListener('pointercancel', e => finish(e, true));
    // keyboard activation (Enter / Space) arrives as a click with no pointer press; pointer taps were handled above
    btn.addEventListener('click', () => { if (swallow) { swallow = false; return; } toTop(); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
})();
