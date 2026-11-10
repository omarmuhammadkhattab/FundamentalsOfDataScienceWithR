/* DS550 Fundamentals of Data Science with R — shared page logic: chrome, code blocks, quizzes, stats + plotting helpers, live R console */
(function () {
  'use strict';

  const PAGES = [
    { id: 'home', href: 'index.html', short: 'Home', title: 'Course home' },
    { id: 'l1', href: 'lecture1.html', short: 'L1', title: 'R Basics: Vectors & Matrices' },
    { id: 'l2', href: 'lecture2.html', short: 'L2', title: 'Regression Modeling: Home Prices' },
    { id: 'l3', href: 'lecture3.html', short: 'L3', title: 'Correlation & Simple Regression (OLS)' },
    { id: 'l4', href: 'lecture4.html', short: 'L4', title: 'Missing Data in Regression' },
    { id: 'ref', href: 'reference.html', short: 'Cheat sheet', title: 'Cheat sheet' }
  ];
  window.DS_PAGES = PAGES;

  /* ---------- storage (never required for the page to work) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ds550:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ds550:' + k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ } }
  };
  window.DS_STORE = store;

  /* ---------- theme ---------- */
  const savedTheme = store.get('theme', null);
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  function isDark() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  window.DS_ESC = esc;

  /* ---------- chrome: nav, footer, prev/next, TOC, progress ---------- */
  function buildChrome() {
    const pageId = document.body.dataset.page || 'home';
    const nav = document.createElement('nav');
    nav.className = 'topnav';
    nav.innerHTML =
      `<a class="brand" href="index.html"><span class="logo">DS550</span><span class="full">Fundamentals of Data Science with R</span></a>
       <div class="links">${PAGES.map(p => `<a href="${p.href}" class="${p.id === pageId ? 'active' : ''}">${p.short}</a>`).join('')}</div>
       <button class="theme-btn" title="Switch light / dark" aria-label="Switch light or dark theme">◐</button>`;
    document.body.prepend(nav);
    const bar = document.createElement('div'); bar.className = 'read-progress'; document.body.prepend(bar);
    $('.theme-btn', nav).addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      store.set('theme', next);
    });
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      bar.style.width = (p * 100).toFixed(1) + '%';
    }, { passive: true });

    // prev / next for lecture-like pages
    const idx = PAGES.findIndex(p => p.id === pageId);
    const holder = $('#lec-nav');
    if (holder && idx > 0) {
      const prev = PAGES[idx - 1], next = PAGES[idx + 1];
      holder.className = 'lec-nav';
      holder.innerHTML =
        (prev ? `<a class="prev" href="${prev.href}"><span>← Previous</span>${prev.title}</a>` : '') +
        (next ? `<a class="next" href="${next.href}"><span>Next →</span>${next.title}</a>` : '');
    }
    const foot = document.createElement('footer');
    foot.className = 'site';
    foot.innerHTML = `DS550 · Fundamentals of Data Science with R — interactive study notes built from the course scripts, handouts &amp; datasets.<br>Every R output on these pages was produced by actually running the code in R 4.6.`;
    document.body.appendChild(foot);

    // visited marker
    const visited = store.get('visited', {}); visited[pageId] = true; store.set('visited', visited);
  }

  function buildTOC() {
    const toc = $('.toc');
    if (!toc) return;
    const secs = $$('.content > .section[id]');
    toc.innerHTML = '<h4>in this lecture</h4>' + secs.map((s, i) => {
      const h = $('h2', s); const n = $('.sec-num', s);
      return `<a href="#${s.id}" data-id="${s.id}"><span class="n">${n ? n.textContent : i + 1}</span><span>${h ? h.textContent : s.id}</span></a>`;
    }).join('');
    const links = $$('a', toc);
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.dataset.id === e.target.id));
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    secs.forEach(s => io.observe(s));
  }

  /* ---------- R syntax highlighting ---------- */
  const R_KEYWORDS = new Set(['TRUE', 'FALSE', 'T', 'F', 'NA', 'NULL', 'Inf', 'NaN', 'function', 'if', 'else', 'for', 'while', 'in', 'return', 'library', 'repeat', 'break', 'next']);
  function highlightR(src) {
    let out = '', i = 0;
    const n = src.length;
    while (i < n) {
      const c = src[i];
      if (c === '#') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += `<span class="tk-c">${esc(src.slice(i, j))}</span>`; i = j; continue; }
      if (c === '"' || c === "'") {
        let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
        out += `<span class="tk-s">${esc(src.slice(i, j + 1))}</span>`; i = j + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const m = /^[0-9]*\.?[0-9]+(e[+-]?[0-9]+)?L?/i.exec(src.slice(i));
        out += `<span class="tk-n">${esc(m[0])}</span>`; i += m[0].length; continue;
      }
      if (/[A-Za-z_.]/.test(c)) {
        const m = /^[A-Za-z_.][A-Za-z0-9_.]*/.exec(src.slice(i));
        const w = m[0];
        let k = i + w.length; while (src[k] === ' ') k++;
        if (R_KEYWORDS.has(w)) out += `<span class="tk-k">${w}</span>`;
        else if (src[k] === '(') out += `<span class="tk-f">${esc(w)}</span>`;
        else out += esc(w);
        i += w.length; continue;
      }
      if (src.startsWith('<-', i) || src.startsWith('%*%', i) || src.startsWith('%in%', i)) {
        const t = src.startsWith('<-', i) ? '<-' : src.startsWith('%*%', i) ? '%*%' : '%in%';
        out += `<span class="tk-o">${esc(t)}</span>`; i += t.length; continue;
      }
      if ('$~'.includes(c)) { out += `<span class="tk-b">${esc(c)}</span>`; i++; continue; }
      out += esc(c); i++;
    }
    return out;
  }
  window.DS_HL = highlightR;

  /* ---------- code blocks ---------- */
  function enhanceCode() {
    $$('.code').forEach(block => {
      const pre = $('pre.r', block);
      if (!pre) return;
      const raw = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      block.dataset.src = raw;
      pre.innerHTML = highlightR(raw);
      const head = document.createElement('div');
      head.className = 'code-head';
      const runnable = block.dataset.run !== 'no';
      head.innerHTML = `<span class="lang">R</span><span class="label">${esc(block.dataset.label || '')}</span>` +
        `<button class="code-btn copy" type="button">copy</button>` +
        (runnable ? `<button class="code-btn run" type="button" title="Run this in the live R console">▶ run</button>` : '');
      block.prepend(head);
      $('.copy', head).addEventListener('click', e => {
        const b = e.currentTarget;
        const done = () => { b.textContent = 'copied ✓'; setTimeout(() => (b.textContent = 'copy'), 1400); };
        if (navigator.clipboard) navigator.clipboard.writeText(raw).then(done, done); else done();
      });
      if (runnable) $('.run', head).addEventListener('click', () => RConsole.runFromBlock(raw));
    });
    $$('.out').forEach(out => {
      const head = document.createElement('div');
      head.className = 'out-head';
      head.innerHTML = `<span>${esc(out.dataset.label || 'R output')}</span><span class="tog"></span>`;
      head.addEventListener('click', () => out.classList.toggle('collapsed'));
      out.prepend(head);
      const anns = $$('.ann', out);
      if (anns.length) {
        let panel = $('.ann-panel', out);
        if (!panel) { panel = document.createElement('div'); panel.className = 'ann-panel'; out.appendChild(panel); }
        panel.innerHTML = '<span class="muted">👆 Click any <span class="ann">highlighted</span> part of the output to see what it means.</span>';
        anns.forEach(a => a.addEventListener('click', () => {
          anns.forEach(x => x.classList.remove('on'));
          a.classList.add('on');
          panel.innerHTML = a.dataset.n;
          if (window.renderMathInElement) renderMath(panel);
        }));
      }
    });
  }

  /* ---------- quizzes ---------- */
  function setupQuizzes() {
    $$('.quiz').forEach(quiz => {
      const id = quiz.dataset.id || location.pathname;
      const qs = $$('.q', quiz);
      const scoreEl = $('.quiz-score', quiz);
      let answered = 0, right = 0;
      const update = () => {
        if (scoreEl) scoreEl.textContent = answered ? `${right} / ${qs.length}` : `${qs.length} questions`;
        if (answered === qs.length) {
          const best = store.get('quiz', {});
          best[id] = { right, total: qs.length };
          store.set('quiz', best);
        }
      };
      qs.forEach(q => {
        const correct = +q.dataset.a;
        const opts = $$('.q-opt', q);
        const fb = $('.q-fb', q);
        const why = fb ? fb.innerHTML : '';
        opts.forEach((b, i) => b.addEventListener('click', () => {
          opts.forEach(x => (x.disabled = true));
          opts[correct].classList.add('right');
          if (i !== correct) b.classList.add('wrong');
          answered++; if (i === correct) right++;
          if (fb) { fb.innerHTML = (i === correct ? '<b class="ok">Correct.</b> ' : '<b class="no">Not quite.</b> ') + why; fb.classList.add('show'); renderMath(fb); }
          update();
        }));
      });
      const reset = $('.quiz-reset', quiz);
      if (reset) reset.addEventListener('click', () => {
        answered = right = 0;
        qs.forEach(q => { $$('.q-opt', q).forEach(b => { b.disabled = false; b.classList.remove('right', 'wrong'); }); const fb = $('.q-fb', q); if (fb) fb.classList.remove('show'); });
        update();
      });
      update();
    });
  }

  /* ---------- KaTeX ---------- */
  function renderMath(el) {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(el || document.body, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
      throwOnError: false
    });
  }
  window.DS_MATH = renderMath;

  /* ===================================================================
     Stats toolkit (used by the interactive demos)
     =================================================================== */
  const S = {};
  S.sum = a => a.reduce((s, v) => s + v, 0);
  S.mean = a => S.sum(a) / a.length;
  S.var = a => { const m = S.mean(a); return S.sum(a.map(v => (v - m) ** 2)) / (a.length - 1); };
  S.sd = a => Math.sqrt(S.var(a));
  S.cor = (x, y) => {
    const mx = S.mean(x), my = S.mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < x.length; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return sxy / Math.sqrt(sxx * syy);
  };
  S.rank = a => {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(a.length);
    for (let i = 0; i < idx.length;) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1;
    }
    return r;
  };
  S.spearman = (x, y) => S.cor(S.rank(x), S.rank(y));
  S.ols = (x, y) => {
    const mx = S.mean(x), my = S.mean(y);
    let sxy = 0, sxx = 0;
    for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
    const b1 = sxy / sxx, b0 = my - b1 * mx;
    const fit = x.map(v => b0 + b1 * v), res = y.map((v, i) => v - fit[i]);
    const rss = S.sum(res.map(r => r * r)), tss = S.sum(y.map(v => (v - my) ** 2));
    const n = x.length, s = Math.sqrt(rss / (n - 2));
    const se1 = s / Math.sqrt(sxx), se0 = s * Math.sqrt(1 / n + mx * mx / sxx);
    return { b0, b1, fit, res, rss, tss, r2: 1 - rss / tss, s, se0, se1, n, mx, sxx };
  };
  // log-gamma (Lanczos)
  S.lgamma = z => {
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - S.lgamma(1 - z);
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  };
  function betacf(a, b, x) {
    const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  S.ibeta = (x, a, b) => { // regularized incomplete beta I_x(a,b)
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(S.lgamma(a + b) - S.lgamma(a) - S.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };
  S.pt = (t, df) => { const x = df / (df + t * t); const tail = 0.5 * S.ibeta(x, df / 2, 0.5); return t > 0 ? 1 - tail : tail; };
  S.p2 = (t, df) => S.ibeta(df / (df + t * t), df / 2, 0.5); // two-sided p-value
  S.qt = (p, df) => { let lo = -1e3, hi = 1e3; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (S.pt(m, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
  S.dt = (t, df) => Math.exp(S.lgamma((df + 1) / 2) - S.lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + t * t / df));
  S.pf = (f, d1, d2) => S.ibeta(d1 * f / (d1 * f + d2), d1 / 2, d2 / 2);
  S.qnorm = p => { // Acklam
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00],
      b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
      c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00],
      d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  S.fmt = (v, d = 3) => {
    if (!isFinite(v)) return v > 0 ? 'Inf' : v < 0 ? '-Inf' : 'NaN';
    if (v !== 0 && (Math.abs(v) < 1e-4 || Math.abs(v) >= 1e7)) return v.toExponential(2);
    return (+v.toFixed(d)).toString();
  };
  S.pfmt = p => p < 2.2e-16 ? '< 2.2e-16' : p < 1e-4 ? p.toExponential(2) : p.toFixed(4);
  S.strength = r => { const a = Math.abs(r); return a >= 0.7 ? 'strong' : a >= 0.3 ? 'moderate' : 'weak'; };
  S.parseCSV = txt => {
    const lines = txt.trim().split('\n');
    const head = lines[0].split(',').map(h => h.replace(/"/g, ''));
    return { head, rows: lines.slice(1).map(l => l.split(',').map(v => (v === 'NA' || v === '' ? null : isNaN(+v) ? v : +v))) };
  };
  window.S = S;

  /* ===================================================================
     Tiny SVG plotting helper
     =================================================================== */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceTicks(lo, hi, count = 5) {
    const span = hi - lo; if (span <= 0) return [lo];
    const step0 = span / count, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag; const step = (err >= 7.5 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function tickLabel(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6) + 'M'; if (a >= 1e4) return (v / 1e3) + 'k';
    return +v.toFixed(6) + '';
  }
  function makePlot(svg, o) {
    const w = o.w || 560, h = o.h || 360, m = Object.assign({ l: 52, r: 16, t: 14, b: 40 }, o.m || {});
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.classList.add('plot');
    svg.innerHTML = '';
    let [x0, x1] = o.x, [y0, y1] = o.y;
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r);
    const Y = v => h - m.b - (v - y0) / (y1 - y0) * (h - m.t - m.b);
    const invX = px => x0 + (px - m.l) / (w - m.l - m.r) * (x1 - x0);
    const invY = py => y0 + (h - m.b - py) / (h - m.t - m.b) * (y1 - y0);
    const ax = el('g', { class: 'axis' }, svg);
    niceTicks(x0, x1, o.xt || 6).forEach(t => {
      el('line', { x1: X(t), x2: X(t), y1: m.t, y2: h - m.b, class: 'gridl' }, ax);
      const tx = el('text', { x: X(t), y: h - m.b + 15, 'text-anchor': 'middle' }, ax); tx.textContent = (o.xfmt || tickLabel)(t);
    });
    niceTicks(y0, y1, o.yt || 5).forEach(t => {
      el('line', { x1: m.l, x2: w - m.r, y1: Y(t), y2: Y(t), class: 'gridl' }, ax);
      const ty = el('text', { x: m.l - 6, y: Y(t) + 4, 'text-anchor': 'end' }, ax); ty.textContent = (o.yfmt || tickLabel)(t);
    });
    el('line', { x1: m.l, x2: w - m.r, y1: h - m.b, y2: h - m.b }, ax);
    el('line', { x1: m.l, x2: m.l, y1: m.t, y2: h - m.b }, ax);
    if (o.xlab) { const t = el('text', { x: (m.l + w - m.r) / 2, y: h - 6, 'text-anchor': 'middle', style: 'fill:var(--ink2)' }, ax); t.textContent = o.xlab; }
    if (o.ylab) { const t = el('text', { x: 12, y: (m.t + h - m.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${(m.t + h - m.b) / 2})`, style: 'fill:var(--ink2)' }, ax); t.textContent = o.ylab; }
    const layer = el('g', {}, svg);
    const clip = 'c' + Math.random().toString(36).slice(2);
    const defs = el('defs', {}, svg); const cp = el('clipPath', { id: clip }, defs);
    el('rect', { x: m.l, y: m.t, width: w - m.l - m.r, height: h - m.t - m.b }, cp);
    layer.setAttribute('clip-path', `url(#${clip})`);
    const top = el('g', {}, svg);
    return {
      X, Y, invX, invY, layer, top, w, h, m, el: (t, a, p) => el(t, a, p || layer),
      clear() { layer.innerHTML = ''; top.innerHTML = ''; },
      // convert pointer event to data coords
      pointer(ev) {
        const r = svg.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width * w, py = (ev.clientY - r.top) / r.height * h;
        return { x: invX(px), y: invY(py), px, py };
      }
    };
  }
  window.DS_PLOT = makePlot;
  window.DS_SVG = el;
  window.DS_TICKS = niceTicks;

  /* ===================================================================
     Live R console (webR — real R compiled to WebAssembly)
     =================================================================== */
  const WEBR_URL = 'https://webr.r-wasm.org/v0.4.2/webr.mjs';
  const RConsole = {
    webR: null, shelter: null, loading: null, busy: false, queue: Promise.resolve(),
    build() {
      const fab = document.createElement('button');
      fab.className = 'r-fab'; fab.type = 'button';
      fab.innerHTML = '<span class="dot"></span><span class="lbl">Live R console</span><span aria-hidden="true">R&gt;</span>';
      const dr = document.createElement('aside');
      dr.className = 'r-drawer'; dr.setAttribute('aria-label', 'Live R console');
      const snips = (window.R_SNIPPETS || []);
      dr.innerHTML = `
        <div class="r-d-head"><span class="t">Live R console</span><button class="btn ghost r-reset" type="button" title="Clear the output">clear</button><button class="r-close" type="button" aria-label="Close">✕</button></div>
        <div class="r-status">Real R (webR) runs inside this page. It downloads once (~25 MB) the first time you press Run — needs internet.</div>
        ${snips.length ? `<div class="r-snips">${snips.map((s, i) => `<button type="button" data-i="${i}">${esc(s.label)}</button>`).join('')}</div>` : ''}
        <div class="r-out" aria-live="polite"><span class="sys">Type R code below and press Run (or Ctrl + Enter).\nThe course datasets for this page are already in R's working folder, so read.csv("…") works exactly like in RStudio.</span>\n</div>
        <div class="r-editor"><textarea spellcheck="false" aria-label="R code"></textarea>
          <div class="row"><button class="btn primary r-run" type="button">▶ Run</button><button class="btn ghost r-clearcode" type="button">clear code</button><span class="hint">Ctrl + Enter = run</span></div></div>`;
      document.body.append(fab, dr);
      this.fab = fab; this.dr = dr;
      this.out = $('.r-out', dr); this.ta = $('textarea', dr); this.status = $('.r-status', dr); this.dot = $('.dot', fab);
      this.ta.value = snips.length ? snips[0].code : 'x <- c(1, 3, 4, 3)\nmean(x)';
      fab.addEventListener('click', () => this.toggle(true));
      $('.r-close', dr).addEventListener('click', () => this.toggle(false));
      $('.r-reset', dr).addEventListener('click', () => (this.out.innerHTML = ''));
      $('.r-clearcode', dr).addEventListener('click', () => { this.ta.value = ''; this.ta.focus(); });
      $('.r-run', dr).addEventListener('click', () => this.run(this.ta.value));
      this.ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.run(this.ta.value); }
        if (e.key === 'Tab') { e.preventDefault(); const s = this.ta.selectionStart; this.ta.setRangeText('  ', s, this.ta.selectionEnd, 'end'); }
      });
      $$('.r-snips button', dr).forEach(b => b.addEventListener('click', () => { this.ta.value = snips[+b.dataset.i].code; this.ta.focus(); }));
      document.addEventListener('keydown', e => { if (e.key === 'Escape') this.toggle(false); });
    },
    toggle(open) { this.dr.classList.toggle('open', open); if (open) setTimeout(() => this.ta.focus(), 250); },
    setStatus(msg, err) { this.status.textContent = msg; this.status.classList.toggle('err', !!err); },
    print(text, cls) { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; this.out.appendChild(s); this.out.scrollTop = this.out.scrollHeight; },
    async ensure() {
      if (this.loading) return this.loading;
      this.loading = (async () => {
        this.dot.className = 'dot busy';
        this.setStatus('Starting R in your browser… (first time: downloading ~25 MB, can take 20–60 s)');
        const { WebR } = await import(WEBR_URL);
        const webR = new WebR();
        await webR.init();
        const enc = s => new TextEncoder().encode(s);
        const files = [];
        if (window.DS_HOME) { await webR.FS.writeFile('/home/web_user/Home Price.csv', enc(window.DS_HOME)); files.push('Home Price.csv'); }
        if (window.DS_MISSING) { await webR.FS.writeFile('/home/web_user/dataset with missing.csv', enc(window.DS_MISSING.csv)); files.push('dataset with missing.csv'); }
        this.webR = webR;
        this.shelter = await new webR.Shelter();
        this.dot.className = 'dot ready';
        this.setStatus('R is ready ✓' + (files.length ? '  ·  files in working folder: ' + files.join(', ') : ''));
      })().catch(err => {
        this.loading = null;
        this.dot.className = 'dot';
        this.setStatus('Could not start R in the browser: ' + (err && err.message ? err.message : err) +
          '. Check your internet connection. (All outputs shown on the page come from real R runs, so you can still study without it.)', true);
        throw err;
      });
      return this.loading;
    },
    runFromBlock(code) { this.toggle(true); this.ta.value = code; this.run(code); },
    run(code) {
      code = code.replace(/\s+$/, '');
      if (!code) return;
      this.queue = this.queue.then(() => this._run(code)).catch(() => {});
      return this.queue;
    },
    async _run(code) {
      this.print(code.split('\n').map(l => '> ' + l).join('\n') + '\n', 'in');
      try { await this.ensure(); } catch (e) { this.print('R is not available right now.\n', 'err'); return; }
      this.dot.className = 'dot busy';
      // windows() opens a plot window in desktop R; in the browser plots appear inline instead
      const src = code.replace(/^\s*windows\s*\([^)]*\)\s*$/gm, '# windows() not needed here');
      try {
        const res = await this.shelter.captureR(src, {
          withAutoprint: true, captureStreams: true, captureConditions: false,
          captureGraphics: { width: 640, height: 470 }
        });
        res.output.forEach(o => this.print(o.data + '\n', o.type === 'stderr' ? 'wrn' : ''));
        (res.images || []).forEach(img => {
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          c.getContext('2d').drawImage(img, 0, 0); this.out.appendChild(c);
        });
      } catch (e) {
        this.print('Error: ' + (e && e.message ? e.message : e) + '\n', 'err');
      } finally {
        try { await this.shelter.purge(); } catch (e) { }
        this.dot.className = 'dot ready';
        this.out.scrollTop = this.out.scrollHeight;
      }
    }
  };
  window.RConsole = RConsole;

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    buildChrome();
    buildTOC();
    enhanceCode();
    setupQuizzes();
    if (document.body.dataset.console !== 'off') RConsole.build();
    if (window.renderMathInElement) renderMath(); else window.addEventListener('load', () => renderMath());
    document.dispatchEvent(new Event('ds:ready'));
  });
})();
