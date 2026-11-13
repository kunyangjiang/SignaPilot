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
  function field(host, setup, strength) {
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
      cs = W < 700 ? 30 : 38;
      const cols = Math.floor((W - 20) / cs), rows = Math.max(1, Math.floor((H - 10) / (cs * 1.25)));
      const ox = (W - cols * cs) / 2, oy = (H - rows * cs * 1.25) / 2, weight = setup(W, H, cv.getBoundingClientRect());
      cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = ox + c * cs, y = oy + r * cs * 1.25, a = weight(x + cs / 2, y + cs / 2) * (strength || 1);
        if (Math.random() > 0.12 && a > 0.05) cells.push({ x, y, a });
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
    // layout keeps settling as web fonts arrive, so re-apply a few times — but stop the moment the reader scrolls themselves
    let live = true; const stop = () => { live = false; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => addEventListener(ev, stop, { once: true, passive: true }));
    const go = () => { if (live) scrollTo(0, p.y); };
    go(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    addEventListener('load', go); setTimeout(go, 400); setTimeout(() => { go(); live = false; }, 900);
    return true;
  }

  const G = {
    home: '<circle cx="24" cy="24" r="15"/><path d="M24 24l10.5-10.5"/>', k: D.stages[0].glyph,
    c: '<rect x="11" y="7" width="26" height="34"/><path d="M17 7v34"/>', search: '<circle cx="21" cy="21" r="11"/><path d="M29 29l11 11"/>',
  };
  body.insertAdjacentHTML('afterbegin', `
    <header class="top"><div class="wrap">
      <a class="brand" href="index.html">SignaPilot</a>
      <a class="back" href="${parentHref}" data-back aria-label="返回上一页"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg><span>返回</span></a>
      <nav aria-label="主导航">
        <a href="knowledge.html" class="${dept === 'k' ? 'on' : ''}">Knowledge 知识</a>
        <a href="cases.html" class="${dept === 'c' ? 'on' : ''}">Cases 小说</a>
      </nav>
      <span class="sp"></span>
      <button class="search-btn" type="button" data-search>搜索<kbd>/</kbd></button>
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
  const figure = b => `<figure class="fig ill" data-src="content/cases/${esc(b.src)}"><div class="fig-frame"></div>${b.cap ? `<figcaption>${inline(b.cap)}</figcaption>` : ''}</figure>`;
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
      else if (b.t === 'ul') { if (!cur) { cur = { name: '', who: [] }; groups.push(cur); } b.it.forEach(x => { const m = x.match(/^\*\*(.+?)\*\*[：:]\s*(.+)$/); cur.who.push(m ? { n: m[1], d: m[2] } : { n: '', d: x }); }); }
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

  // The chapter list that stays at the left edge of a reading page (wide screens only). It is built from the
  // headings already on the page, marks the one being read, and is only shown while the text itself is on screen.
  // items: [{ el, n, label, sub }]
  function chapterNav(article, items) {
    const old = $('.chap-nav'); if (old) old.remove();
    if (!article || items.length < 2) return;
    const nav = document.createElement('nav');
    nav.className = 'chap-nav'; nav.setAttribute('aria-label', '章节目录');
    nav.innerHTML = `<p class="label">目录</p><ol>${items.map((it, k) => `<li class="${it.sub ? 'sub' : ''}"><a href="#" data-k="${k}">${it.n ? `<b>${esc(it.n)}</b>` : ''}${it.label ? `<span>${esc(it.label)}</span>` : ''}</a></li>`).join('')}</ol>`;
    body.append(nav);
    const links = $$('a', nav);
    nav.addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      const top = items[+a.dataset.k].el.getBoundingClientRect().top + scrollY - 110;
      scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    let cur = -2;
    const update = () => {
      const r = article.getBoundingClientRect();
      nav.classList.toggle('is-on', r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.45);
      let k = -1;
      items.forEach((it, j) => { if (it.el.getBoundingClientRect().top <= innerHeight * 0.4) k = j; });
      if (k === cur) return;
      cur = k;
      links.forEach((a, j) => { a.classList.toggle('on', j === k); if (j === k) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
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
        const mid = small ? around(c, rect, [1, 1.16], 0.85, 1.55) : around(c, rect, [Math.max(1.24, W * 0.4 / c.offsetWidth), Math.max(1.6, H * 0.4 / c.offsetHeight)], 0.7, 2.1);
        const spots = $$('.e-obj', home).filter(el => el.getBoundingClientRect().width > 0).map(el => around(el, rect, [1.2, 1.2], 0.75, 1.7));
        return (x, y) => spots.reduce((f, s) => f * s(x, y), mid(x, y));
      });

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
          return `<li class="${hooks[c.id] ? 'featured' : ''}"><div><span class="mono">${c.id}</span><h3><a href="${lessonHref(c.id)}">${esc(c.title)}</a></h3><p class="scope">${esc(c.scope)}</p>${hooks[c.id] ? `<p class="hook">${hooks[c.id]}</p>` : ''}</div></li>`;
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
      if (id !== '05-06') $('#l-note').hidden = false;
      const p = all[i - 1], n = all[i + 1];
      $('#l-pager').innerHTML = (p ? `<a href="${lessonHref(p.id)}"><span>上一课 · ${p.id}</span><b>${esc(p.title)}</b></a>` : '<span></span>') + (n ? `<a href="${lessonHref(n.id)}"><span>下一课 · ${n.id}</span><b>${esc(n.title)}</b></a>` : '<span></span>');
      chapterNav($('.prose'), $$('.prose h2').map(el => {
        const m = $('.mono', el), n = m ? m.textContent.trim() : '';
        return { el, n, label: el.textContent.trim().slice(n.length) };
      }));
      // citation marker: on narrow screens it unfolds its note under the paragraph; on wide screens it points at the reference
      $$('.cite').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const sn = $('#sn' + a.dataset.n);
        if (sn) { if (matchMedia('(max-width: 1060px)').matches) a.closest('p').after(sn); sn.classList.toggle('open'); }
        $$('.refs li').forEach(li => li.classList.toggle('hl', li.dataset.n === a.dataset.r));
      }));
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
          restorePosition();
        }).catch(() => { const n = $('#n-note'); n.textContent = '这篇的 Case Notes 暂时没有加载出来，下面显示的是示例结构。'; n.hidden = false; });
      } else if (c.id !== '01') $('#n-note').hidden = false;
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
