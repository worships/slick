/* Graphite GX — graph screen: function, parametric and polar curves,
   stat plots, the DRAW layer, free cursor, TRACE, ZOOM and CALC. */
(function (GX) {
  'use strict';
  const {
    S, GEO, YN, sub, str, SCREENS, C, CURVE, PLOTC, UI, BIG, SMALL, CalcError, chk, sig, fmtShort,
    evalTokens, findRoot, extremum, integrate, astOf, safeFn, evalAt, ySafe, yFn, activeFns, toRad,
    toast, setScreen, showError, glyph, drawCol, drawCursor, charOff, edKey,
  } = GX;
  const { W, H, GY, GW, GH, CX, CY } = GEO;

  const G = { mode: 'none', fx: CX, fy: CY, tf: 0, tx: 0, tt: 0, calc: null, zoom: null, input: null, label: null, shade: null, markers: [] };
  const REP = { n: 0 }; // key-repeat counter, used to speed up held arrows
  function resetG() { Object.assign(G, { mode: 'none', calc: null, zoom: null, input: null, label: null, shade: null, markers: [] }); }
  const xToPx = x => (x - S.win.xmin) / (S.win.xmax - S.win.xmin) * (GW - 1);
  const yToPx = y => (S.win.ymax - y) / (S.win.ymax - S.win.ymin) * (GH - 1);
  const pxToX = p => S.win.xmin + p * (S.win.xmax - S.win.xmin) / (GW - 1);
  const pyToY = p => S.win.ymax - p * (S.win.ymax - S.win.ymin) / (GH - 1);
  const dX = () => (S.win.xmax - S.win.xmin) / (GW - 1);
  const isFunc = () => S.mode.graph === 'FUNC';
  const pvar = () => (S.mode.graph === 'POL' ? 'θ' : 'T');
  const prange = () => (S.mode.graph === 'POL'
    ? [S.win['θmin'], S.win['θmax'], S.win['θstep']] : [S.win.tmin, S.win.tmax, S.win.tstep]);

  /* ---------- the curves being graphed in the current mode ---------- */
  function curves() {
    const m = S.mode.graph, out = [];
    if (m === 'FUNC') return activeFns().map(i => ({ i, label: YN[i], color: CURVE[i], toks: S.y[i].t, f: ySafe(i) }));
    if (m === 'PAR') {
      S.par.forEach((p, i) => {
        if (!p.on || !p.x.length || !p.y.length) return;
        try {
          const fx = safeFn(astOf(p.x), 'T'), fy = safeFn(astOf(p.y), 'T');
          out.push({ i, label: 'X' + sub(i + 1) + 'T', color: CURVE[i], toks: p.x, xy: t => [fx(t), fy(t)],
            strict: t => [chk(evalAt(astOf(p.x), 'T', t)), chk(evalAt(astOf(p.y), 'T', t))] });
        } catch (e) { /* syntax errors are reported by gotoGraph */ }
      });
    } else {
      S.pol.forEach((p, i) => {
        if (!p.on || !p.t.length) return;
        try {
          const fr = safeFn(astOf(p.t), 'θ');
          const conv = (r, t) => [r * Math.cos(toRad(t)), r * Math.sin(toRad(t))];
          out.push({ i, label: 'r' + sub(i + 1), color: CURVE[i], toks: p.t, r: fr, xy: t => conv(fr(t), t),
            strict: t => conv(chk(evalAt(astOf(p.t), 'θ', t)), t) });
        } catch (e) { /* reported by gotoGraph */ }
      });
    }
    return out;
  }
  const curveAt = id => curves().find(c => c.i === id);

  /* ---------- window helpers ---------- */
  // like a real calculator, DRAW output is cleared when the window or functions change
  const clearDrawings = () => { if (!(GX.VM && GX.VM.running)) S.draw = []; };
  function setWin(w) {
    clearDrawings();
    S.prevWin = { ...S.win };
    for (const k in w) S.win[k] = sig(w[k], 10);
  }
  function syntaxCheck(toks, row) {
    if (!toks.length) return true;
    try { astOf(toks); return true; } catch (e) { showError(e.type || 'SYNTAX', { screen: 'yeq', row, pos: e.pos }); return false; }
  }
  function gotoGraph() {
    const w = S.win;
    if (!(w.xmin < w.xmax) || !(w.ymin < w.ymax)) { showError('WINDOW RANGE', { screen: 'window' }); return false; }
    const m = S.mode.graph;
    if (m !== 'FUNC') {
      const [a, b, st] = prange();
      if (!(a < b) || !(st > 0)) { showError('WINDOW RANGE', { screen: 'window' }, m === 'PAR' ? 'Need Tmin<Tmax, Tstep>0' : 'Need θmin<θmax, θstep>0'); return false; }
    }
    if (m === 'FUNC') { for (let i = 0; i < 10; i++) if (S.y[i].on && !syntaxCheck(S.y[i].t, i)) return false; }
    else if (m === 'PAR') { for (let i = 0; i < 6; i++) if (S.par[i].on && (!syntaxCheck(S.par[i].x, 2 * i) || !syntaxCheck(S.par[i].y, 2 * i + 1))) return false; }
    else { for (let i = 0; i < 6; i++) if (S.pol[i].on && !syntaxCheck(S.pol[i].t, i)) return false; }
    if (S.screen !== 'graph') setScreen('graph');
    return true;
  }
  function enterGraphScreen() { if (S.screen !== 'graph') setScreen('graph'); }
  function graphNow() { if (gotoGraph()) resetG(); }
  function paramWindow() {
    const deg = S.mode.angle === 'DEGREE', top = deg ? 360 : 2 * Math.PI, step = deg ? 7.5 : Math.PI / 24;
    return { tmin: 0, tmax: top, tstep: step, 'θmin': 0, 'θmax': top, 'θstep': step };
  }
  function preset(w, withParams) { enterGraphScreen(); setWin(withParams ? { ...w, ...paramWindow() } : w); graphNow(); }
  function zoomMode(t) {
    enterGraphScreen();
    if (!gotoGraph()) return;
    resetG();
    G.mode = 'free'; G.fx = CX; G.fy = CY; G.zoom = { type: t, c1: null };
  }
  function zSquare() {
    enterGraphScreen();
    const w = S.win, dx = (w.xmax - w.xmin) / (GW - 1), dy = (w.ymax - w.ymin) / (GH - 1);
    const cx = (w.xmin + w.xmax) / 2, cy = (w.ymin + w.ymax) / 2;
    if (dx > dy) { const h = dx * (GH - 1) / 2; setWin({ ymin: cy - h, ymax: cy + h }); }
    else { const h = dy * (GW - 1) / 2; setWin({ xmin: cx - h, xmax: cx + h }); }
    graphNow();
  }
  function samplePoints(cv, each) {
    const [a, b, st] = prange(), n = Math.min(20000, Math.floor((b - a) / st + 1e-9));
    for (let k = 0; k <= n; k++) each(cv.xy(a + k * st), a + k * st);
    if (a + n * st < b) each(cv.xy(b), b);
  }
  function zFit() {
    enterGraphScreen();
    let lo = Infinity, hi = -Infinity;
    const add = v => { if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } };
    curves().forEach(cv => {
      if (isFunc()) for (let k = 0; k < GW; k++) add(cv.f(pxToX(k)));
      else samplePoints(cv, ([, y]) => add(y));
    });
    if (lo === Infinity) { toast('Nothing to fit: turn on a Y= function'); graphNow(); return; }
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    setWin({ ymin: lo, ymax: hi });
    graphNow();
  }
  function niceStep(r) {
    if (!(r > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function zStat() {
    enterGraphScreen();
    const on = S.plots.filter(p => p.on);
    if (!on.length) { toast('Turn on a stat plot first (2nd Y=)'); graphNow(); return; }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, hist = null;
    on.forEach(p => {
      const X = S.lists[p.x], Y = S.lists[p.y];
      if (p.type === 2) { hist = X; X.forEach(v => { x0 = Math.min(x0, v); x1 = Math.max(x1, v); }); return; }
      for (let i = 0; i < Math.min(X.length, Y.length); i++) {
        x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]);
      }
    });
    if (x0 === Infinity) { toast('The plotted lists are empty'); graphNow(); return; }
    if (hist) {
      const step = niceStep((x1 - x0) / 8 || 1), counts = {};
      hist.forEach(v => { const b = Math.floor((v - x0) / step + 1e-9); counts[b] = (counts[b] || 0) + 1; });
      const mc = Math.max(1, ...Object.values(counts));
      setWin({ xmin: x0, xmax: x1 + step, xscl: step, ymin: -mc * 0.25, ymax: mc * 1.25, yscl: niceStep(mc / 5) });
    } else {
      if (y0 === Infinity) { y0 = -1; y1 = 1; }
      const px = (x1 - x0) * 0.1 || 1, py = (y1 - y0) * 0.1 || 1;
      setWin({ xmin: x0 - px, xmax: x1 + px, xscl: niceStep((x1 - x0) / 8 || 1), ymin: y0 - py, ymax: y1 + py, yscl: niceStep((y1 - y0) / 8 || 1) });
    }
    graphNow();
  }
  function zPrev() {
    enterGraphScreen();
    if (!S.prevWin) { toast('No previous window yet'); graphNow(); return; }
    const t = { ...S.win };
    Object.assign(S.win, S.prevWin);
    S.prevWin = t;
    graphNow();
  }

  /* ---------- trace and CALC ---------- */
  function startTrace() {
    const cs = curves();
    resetG();
    if (!cs.length) { G.mode = 'free'; G.fx = CX; G.fy = CY; return; }
    if (!cs.some(c => c.i === G.tf)) G.tf = cs[0].i;
    if (isFunc()) G.tx = pxToX(CX); else G.tt = prange()[0];
    G.mode = 'trace';
  }
  const FIRST_STEP = { value: 'x', zero: 'left', minimum: 'left', maximum: 'left', intersect: 'first', dydx: 'point', integral: 'lower' };
  const PROMPTS = { left: 'Left Bound?', right: 'Right Bound?', guess: 'Guess?', first: 'First curve?', second: 'Second curve?', lower: 'Lower Limit?', upper: 'Upper Limit?', point: 'ENTER for dy/dx', x: '' };
  function startCalc(type) {
    if (!gotoGraph()) return;
    const cs = curves();
    if (!cs.length) { toast('Enter a function in Y= first'); return; }
    if (!isFunc() && type !== 'value' && type !== 'dydx') { toast('In ' + S.mode.graph + ' mode CALC has value and dy/dx'); return; }
    if (type === 'intersect' && cs.length < 2) { toast('Intersect needs two Y= functions'); return; }
    const keepX = G.mode === 'trace' && G.tx >= S.win.xmin && G.tx <= S.win.xmax, tx = G.tx, tt = G.tt, wasTrace = G.mode === 'trace';
    resetG();
    if (!cs.some(c => c.i === G.tf)) G.tf = cs[0].i;
    G.tx = keepX ? tx : pxToX(CX);
    G.tt = wasTrace ? tt : prange()[0];
    G.mode = 'trace';
    G.calc = { type, step: FIRST_STEP[type] };
    if (type === 'value') G.input = { t: [], c: 0 };
  }
  function calcEnter() {
    const c = G.calc, x = G.tx;
    const run = fn => {
      try { fn(); }
      catch (e) {
        if (!(e instanceof CalcError)) { console.error(e); e = new CalcError('INVALID'); }
        G.calc = null; G.markers = [];
        showError(e.type, { screen: 'graph' });
      }
    };
    switch (c.step) {
      case 'left': c.a = x; G.markers = [{ x, d: '▶' }]; c.step = 'right'; return;
      case 'right': c.b = x; G.markers.push({ x, d: '◀' }); c.step = 'guess'; return;
      case 'first': {
        c.fa = G.tf; c.step = 'second';
        const ids = curves().map(cv => cv.i), k = ids.indexOf(G.tf);
        G.tf = ids[(k + 1) % ids.length];
        return;
      }
      case 'second':
        if (G.tf === c.fa) { toast('Pick a different curve with ▲ ▼'); return; }
        c.fb = G.tf; c.step = 'guess';
        return;
      case 'guess': return run(() => {
        if (c.type === 'intersect') {
          const fa = yFn(c.fa), fb = yFn(c.fb);
          G.tx = findRoot(t => fa(t) - fb(t), S.win.xmin, S.win.xmax, x);
          G.tf = c.fa; G.label = 'Intersection';
        } else {
          const a = Math.min(c.a, c.b), b = Math.max(c.a, c.b), f = yFn(G.tf);
          G.tx = c.type === 'zero' ? findRoot(f, a, b, x) : extremum(f, a, b, c.type === 'minimum' ? 1 : -1);
          G.label = c.type === 'zero' ? 'Zero' : c.type === 'minimum' ? 'Minimum' : 'Maximum';
        }
        G.calc = null; G.markers = [];
      });
      case 'point': return run(() => {
        const h = 1e-3;
        let d;
        if (isFunc()) { const f = yFn(G.tf); d = (f(x + h) - f(x - h)) / (2 * h); }
        else {
          const cv = curveAt(G.tf), [x1, y1] = cv.strict(G.tt - h), [x2, y2] = cv.strict(G.tt + h);
          if (x2 === x1) GX.fail('DIVIDE BY 0');
          d = (y2 - y1) / (x2 - x1);
        }
        G.label = 'dy/dx=' + fmtShort(chk(d), 18);
        G.calc = null;
      });
      case 'lower': c.a = x; G.markers = [{ x, d: '▶' }]; c.step = 'upper'; return;
      case 'upper': return run(() => {
        const f = G.tf, v = chk(integrate(yFn(f), c.a, x));
        G.shade = { f, a: Math.min(c.a, x), b: Math.max(c.a, x) };
        G.label = '∫f(x)dx=' + fmtShort(v, 17);
        G.calc = null; G.markers = [];
      });
    }
  }
  function zoomEnter() {
    const z = G.zoom;
    if (z.type === 'box') {
      if (!z.c1) { z.c1 = { x: G.fx, y: G.fy }; return; }
      if (z.c1.x === G.fx || z.c1.y === G.fy) { toast('Move to make a box first'); return; }
      setWin({
        xmin: pxToX(Math.min(z.c1.x, G.fx)), xmax: pxToX(Math.max(z.c1.x, G.fx)),
        ymin: pyToY(Math.max(z.c1.y, G.fy)), ymax: pyToY(Math.min(z.c1.y, G.fy)),
      });
      z.c1 = null; G.fx = CX; G.fy = CY;
      return;
    }
    const cx = pxToX(G.fx), cy = pyToY(G.fy), f = z.type === 'in' ? 0.25 : 4;
    const hw = (S.win.xmax - S.win.xmin) * f / 2, hh = (S.win.ymax - S.win.ymin) * f / 2;
    setWin({ xmin: cx - hw, xmax: cx + hw, ymin: cy - hh, ymax: cy + hh });
    G.fx = CX; G.fy = CY;
  }
  function traceStep(dir) {
    const st = REP.n > 8 ? 4 : 1;
    if (!isFunc()) {
      const [a, b, s] = prange();
      G.tt = Math.max(a, Math.min(b, sig(G.tt + dir * st * s, 12)));
      return;
    }
    const p = xToPx(G.tx), np = dir > 0 ? Math.floor(p + 1e-7) + st : Math.ceil(p - 1e-7) - st;
    let nx = pxToX(np);
    if (np > GW - 1 || np < 0) { // pan the window to follow the cursor
      const sh = dir * 80 * dX();
      S.win.xmin = sig(S.win.xmin + sh, 12); S.win.xmax = sig(S.win.xmax + sh, 12);
      nx = pxToX(Math.round(xToPx(nx)));
    }
    G.tx = nx;
  }
  const NUMSTART = new Set([...'0123456789.', '⁻', 'π', 'e', '(', 'ᴇ']);
  function graphInputEnter() {
    let x;
    const clearValue = () => { if (G.calc && G.calc.step === 'x') G.calc = null; };
    try { x = evalTokens(G.input.t); }
    catch (e) { G.input = null; clearValue(); showError(e.type || 'SYNTAX', { screen: 'graph' }); return; }
    G.input = null;
    if (!isFunc()) { G.tt = x; G.mode = 'trace'; clearValue(); return; }
    if (x < S.win.xmin || x > S.win.xmax) { clearValue(); showError('INVALID', { screen: 'graph' }, 'X must be inside window'); return; }
    G.tx = x; G.mode = 'trace';
    if (G.calc && G.calc.step === 'x') G.calc = null;
    else if (G.calc && !['first', 'second'].includes(G.calc.step)) calcEnter();
  }

  /* ---------- rendering ---------- */
  let gcan = null, gkey = '';
  function ensureGraph() {
    const key = JSON.stringify([GX.SC, S.win, S.fmt, S.mode, S.y, S.par, S.pol, S.vars, S.plots, S.lists, S.draw]);
    if (gcan && key === gkey) return;
    gkey = key;
    if (!gcan) gcan = document.createElement('canvas');
    gcan.width = W * GX.SC; gcan.height = H * GX.SC;
    const g = gcan.getContext('2d');
    g.setTransform(GX.SC, 0, 0, GX.SC, 0, 0);
    renderGraph(g);
  }
  function drawGraphImage(c) { ensureGraph(); c.drawImage(gcan, 0, 0, W, H); }
  function renderGraph(g) {
    const w = S.win;
    g.fillStyle = C.lcd; g.fillRect(0, 0, W, H);
    if (!(w.xmin < w.xmax) || !(w.ymin < w.ymax)) return;
    g.save();
    g.beginPath(); g.rect(0, GY, GW, GH); g.clip();
    g.translate(0, GY);
    const nx = w.xscl > 0 ? (w.xmax - w.xmin) / w.xscl : Infinity, ny = w.yscl > 0 ? (w.ymax - w.ymin) / w.yscl : Infinity;
    if (S.fmt.grid && nx < 160 && ny < 120) {
      g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath();
      for (let k = Math.ceil(w.xmin / w.xscl); k * w.xscl <= w.xmax; k++) { const p = Math.round(xToPx(k * w.xscl)) + 0.5; g.moveTo(p, 0); g.lineTo(p, GH); }
      for (let k = Math.ceil(w.ymin / w.yscl); k * w.yscl <= w.ymax; k++) { const p = Math.round(yToPx(k * w.yscl)) + 0.5; g.moveTo(0, p); g.lineTo(GW, p); }
      g.stroke();
    }
    if (S.fmt.axes) {
      g.strokeStyle = C.axis; g.lineWidth = 1; g.beginPath();
      const ax = xToPx(0), ay = yToPx(0);
      if (ay >= -0.5 && ay <= GH - 0.5) {
        const py = Math.round(ay) + 0.5;
        g.moveTo(0, py); g.lineTo(GW, py);
        if (nx < 300) for (let k = Math.ceil(w.xmin / w.xscl); k * w.xscl <= w.xmax; k++) { const p = Math.round(xToPx(k * w.xscl)) + 0.5; g.moveTo(p, py - 2.5); g.lineTo(p, py + 2.5); }
      }
      if (ax >= -0.5 && ax <= GW - 0.5) {
        const px = Math.round(ax) + 0.5;
        g.moveTo(px, 0); g.lineTo(px, GH);
        if (ny < 300) for (let k = Math.ceil(w.ymin / w.yscl); k * w.yscl <= w.ymax; k++) { const p = Math.round(yToPx(k * w.yscl)) + 0.5; g.moveTo(px - 2.5, p); g.lineTo(px + 2.5, p); }
      }
      g.stroke();
      if (S.fmt.labels) {
        g.fillStyle = C.ink; g.font = SMALL; g.textBaseline = 'middle';
        if (ay >= 0 && ay <= GH) { g.textAlign = 'right'; g.fillText('x', GW - 3, Math.min(GH - 8, Math.max(8, ay - 8))); }
        if (ax >= 0 && ax <= GW) { g.textAlign = 'left'; g.fillText('y', Math.min(GW - 10, ax + 5), 8); }
      }
    }
    drawPlots(g);
    g.lineJoin = 'round'; g.lineCap = 'round';
    curves().forEach(cv => (isFunc() ? plotFn(g, cv.f, cv.color) : plotParam(g, cv)));
    drawOps(g);
    g.restore();
  }
  function mark(g, x, y, m) {
    if (x < -5 || x > GW + 5 || y < -5 || y > GH + 5) return;
    if (m === 0) g.strokeRect(Math.round(x) - 2.5, Math.round(y) - 2.5, 5, 5);
    else if (m === 1) { g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.moveTo(x, y - 3); g.lineTo(x, y + 3); g.stroke(); }
    else g.fillRect(x - 1, y - 1, 2, 2);
  }
  function drawPlots(g) {
    S.plots.forEach((p, k) => {
      if (!p.on) return;
      const xs = S.lists[p.x], ys = S.lists[p.y];
      g.strokeStyle = g.fillStyle = PLOTC[k];
      g.lineWidth = 1;
      if (p.type === 2) {
        const w = S.win.xscl;
        if (!(w > 0) || !xs.length) return;
        const counts = new Map();
        xs.forEach(x => { const bin = Math.floor((x - S.win.xmin) / w + 1e-9); counts.set(bin, (counts.get(bin) || 0) + 1); });
        counts.forEach((cnt, bin) => {
          const x0 = xToPx(S.win.xmin + bin * w), x1 = xToPx(S.win.xmin + (bin + 1) * w), y0 = yToPx(0), y1 = yToPx(cnt);
          g.globalAlpha = 0.22; g.fillRect(x0, y1, x1 - x0, y0 - y1);
          g.globalAlpha = 1; g.strokeRect(Math.round(x0) + 0.5, Math.round(y1) + 0.5, Math.round(x1 - x0), Math.round(y0 - y1));
        });
        return;
      }
      const n = Math.min(xs.length, ys.length);
      if (p.type === 1 && n > 1) {
        g.lineWidth = 1.3;
        g.beginPath();
        for (let i = 0; i < n; i++) { const X = xToPx(xs[i]), Y = yToPx(ys[i]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
        g.stroke();
        g.lineWidth = 1;
      }
      for (let i = 0; i < n; i++) mark(g, xToPx(xs[i]), yToPx(ys[i]), p.mark);
    });
  }
  function plotFn(g, f, color) {
    const w = S.win, N = (GW - 1) * 2, span = w.xmax - w.xmin, LIM = GH * 40;
    const dot = S.mode.style === 'DOT';
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 1.7;
    g.beginPath();
    let pen = false, py = 0, pv = 0, pxv = 0;
    for (let k = 0; k <= N; k++) {
      const x = w.xmin + span * k / N, v = f(x);
      if (!Number.isFinite(v)) { pen = false; continue; }
      const sx = k / 2, sy = yToPx(v);
      if (dot) { if (k % 2 === 0 && sy > -2 && sy < GH + 2) g.rect(sx - 0.85, sy - 0.85, 1.7, 1.7); continue; }
      if (pen && Math.abs(sy - py) > GH * 0.35 && isJump(f, pxv, x, pv, v)) pen = false;
      const cy = Math.max(-LIM, Math.min(LIM, sy));
      if (pen) g.lineTo(sx, cy); else g.moveTo(sx, cy);
      pen = true; py = sy; pv = v; pxv = x;
    }
    if (dot) g.fill(); else g.stroke();
  }
  function plotParam(g, cv) {
    const LIM = GH * 40, clamp = v => Math.max(-LIM, Math.min(LIM, v)), dot = S.mode.style === 'DOT';
    g.strokeStyle = g.fillStyle = cv.color; g.lineWidth = 1.7;
    g.beginPath();
    let pen = false;
    samplePoints(cv, ([x, y]) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) { pen = false; return; }
      const px = clamp(xToPx(x)), py = clamp(yToPx(y));
      if (dot) { g.rect(px - 0.85, py - 0.85, 1.7, 1.7); return; }
      if (pen) g.lineTo(px, py); else g.moveTo(px, py);
      pen = true;
    });
    if (dot) g.fill(); else g.stroke();
  }
  // narrows a steep segment; a jump that stays big is a discontinuity, not a steep curve
  function isJump(f, x0, x1, y0, y1) {
    for (let d = 0; d < 10; d++) {
      const xm = (x0 + x1) / 2, m = f(xm);
      if (!Number.isFinite(m)) return true;
      if (Math.abs(m - y0) > Math.abs(y1 - m)) { x1 = xm; y1 = m; } else { x0 = xm; y0 = m; }
    }
    return Math.abs(y1 - y0) > (S.win.ymax - S.win.ymin) * 0.5;
  }
  // DRAW-menu output: lines, circles, points, text and shading added by commands
  function drawOps(g) {
    for (const op of S.draw) {
      const col = op.erase ? C.lcd : C.ink;
      g.strokeStyle = g.fillStyle = col;
      g.lineWidth = op.erase ? 2.5 : 1.2;
      switch (op.k) {
        case 'line': g.beginPath(); g.moveTo(xToPx(op.x1), yToPx(op.y1)); g.lineTo(xToPx(op.x2), yToPx(op.y2)); g.stroke(); break;
        case 'h': { const y = Math.round(yToPx(op.y)) + 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(GW, y); g.stroke(); break; }
        case 'v': { const x = Math.round(xToPx(op.x)) + 0.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GH); g.stroke(); break; }
        case 'circle': {
          const rx = Math.abs(op.r / (S.win.xmax - S.win.xmin) * (GW - 1)), ry = Math.abs(op.r / (S.win.ymax - S.win.ymin) * (GH - 1));
          g.beginPath(); g.ellipse(xToPx(op.x), yToPx(op.y), rx, ry, 0, 0, Math.PI * 2); g.stroke();
          break;
        }
        case 'pt': g.fillRect(Math.round(xToPx(op.x)) - 1, Math.round(yToPx(op.y)) - 1, 3, 3); break;
        case 'text':
          g.font = SMALL; g.textAlign = 'left'; g.textBaseline = 'top';
          g.fillStyle = C.lcd; g.fillRect(op.col, op.row, g.measureText(op.s).width + 1, 12);
          g.fillStyle = C.ink; g.fillText(op.s, op.col, op.row + 1);
          break;
        case 'drawf': plotFn(g, safeFn(op.ast, 'X'), C.ink); break;
        case 'shade': {
          const lo = safeFn(op.lo, 'X'), hi = safeFn(op.hi, 'X');
          const p0 = Math.max(0, Math.floor(xToPx(op.xl !== undefined ? op.xl : S.win.xmin))), p1 = Math.min(GW - 1, Math.ceil(xToPx(op.xr !== undefined ? op.xr : S.win.xmax)));
          g.globalAlpha = 0.3;
          for (let p = p0; p <= p1; p++) {
            const x = pxToX(p), a = lo(x), b = hi(x);
            if (Number.isFinite(a) && Number.isFinite(b) && b > a) g.fillRect(p, yToPx(b), 1, yToPx(a) - yToPx(b));
          }
          g.globalAlpha = 1;
          break;
        }
      }
    }
  }
  function coords(c, x, y) {
    drawCol(c, str('X=' + fmtShort(x, 10)), 0, 9, { bg: true });
    drawCol(c, str('Y=' + (Number.isFinite(y) ? fmtShort(y, 10) : '')), 13, 9, { bg: true });
  }
  function crosshair(c, x, y) {
    const px = x + 0.5, py = y + 0.5;
    c.strokeStyle = C.ink; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(px - 7, py); c.lineTo(px - 2, py); c.moveTo(px + 2, py); c.lineTo(px + 7, py);
    c.moveTo(px, py - 7); c.lineTo(px, py - 2); c.moveTo(px, py + 2); c.lineTo(px, py + 7);
    c.stroke();
    if (UI.blink) { c.fillStyle = C.ink; c.fillRect(x, y, 1, 1); }
  }
  function traceCursor(c, x, y) {
    if (y < -10 || y > GH + 10 || x < -10 || x > GW + 10) return;
    c.strokeStyle = C.ink; c.lineWidth = 1.2;
    c.strokeRect(Math.round(x) - 3.5, Math.round(y) - 3.5, 8, 8);
    if (UI.blink) { c.fillStyle = C.ink; c.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); }
  }
  function drawShade(c) {
    const { f, a, b } = G.shade, fn = ySafe(f);
    const p0 = xToPx(a), p1 = xToPx(b);
    const clampY = v => Math.max(-2, Math.min(GH + 2, v));
    const y0 = clampY(yToPx(0)), steps = Math.max(2, Math.ceil(Math.abs(p1 - p0) * 2));
    c.fillStyle = CURVE[f]; c.globalAlpha = 0.3;
    c.beginPath(); c.moveTo(p0, y0);
    for (let k = 0; k <= steps; k++) {
      const v = fn(a + (b - a) * k / steps);
      c.lineTo(p0 + (p1 - p0) * k / steps, Number.isFinite(v) ? clampY(yToPx(v)) : y0);
    }
    c.lineTo(p1, y0); c.closePath(); c.fill();
    c.globalAlpha = 1;
  }

  SCREENS.graph = {
    draw(c) {
      drawGraphImage(c);
      const cs = curves();
      if (G.mode === 'trace' && !cs.some(cv => cv.i === G.tf)) { if (cs.length) G.tf = cs[0].i; else { G.mode = 'free'; G.calc = null; } }
      const cv = G.mode === 'trace' ? cs.find(k => k.i === G.tf) : null;
      c.save();
      c.beginPath(); c.rect(0, GY, GW, GH); c.clip();
      c.translate(0, GY);
      if (G.shade) drawShade(c);
      c.fillStyle = C.ink;
      G.markers.forEach(m => { c.font = BIG; c.textAlign = 'center'; c.textBaseline = 'middle'; glyph(c, m.d, xToPx(m.x) + 0.5 - (m.d === '▶' ? 4 : -4), 30); });
      if (G.zoom && G.zoom.c1) {
        c.strokeStyle = C.ink; c.lineWidth = 1; c.setLineDash([3, 2]);
        c.strokeRect(Math.min(G.zoom.c1.x, G.fx) + 0.5, Math.min(G.zoom.c1.y, G.fy) + 0.5, Math.abs(G.fx - G.zoom.c1.x), Math.abs(G.fy - G.zoom.c1.y));
        c.setLineDash([]);
      }
      let px = NaN, py = NaN;
      if (G.mode === 'free') crosshair(c, G.fx, G.fy);
      else if (cv) {
        if (isFunc()) { px = G.tx; py = cv.f(G.tx); } else [px, py] = cv.xy(G.tt);
        if (Number.isFinite(px) && Number.isFinite(py)) traceCursor(c, xToPx(px), yToPx(py));
      }
      c.restore();
      if (cv) drawCol(c, str(cv.label + '=' + cv.toks.join('')), 0, 0, { bg: true, color: cv.color });
      let prompt = G.calc ? PROMPTS[G.calc.step]
        : G.zoom ? (G.zoom.type === 'box' ? (G.zoom.c1 ? 'Other corner, then ENTER' : 'Pick a corner, then ENTER') : (G.zoom.type === 'in' ? 'ENTER to zoom in' : 'ENTER to zoom out'))
          : G.label;
      if (cv && !isFunc() && !prompt) {
        prompt = pvar() + '=' + fmtShort(G.tt, 10);
        if (S.mode.graph === 'POL') { const r = cv.r(G.tt); drawCol(c, str('R=' + (Number.isFinite(r) ? fmtShort(r, 11) : '')), 13, 8, { bg: true }); }
      }
      if (prompt) drawCol(c, str(prompt), 0, 8, { bg: true });
      if (G.input) {
        const lab = isFunc() ? 'X=' : pvar() + '=';
        drawCol(c, str(lab), 0, 9, { bg: true });
        drawCol(c, str(G.input.t.join('')), 2, 9, { bg: true });
        drawCursor(c, 2 + charOff(G.input.t, G.input.c), 9);
      } else if (cv) coords(c, px, py);
      else if (G.mode === 'free' && S.fmt.coord) coords(c, pxToX(G.fx), pyToY(G.fy));
    },
    key(act) {
      const c = G.calc;
      if (G.input) {
        if (act === 'enter') { graphInputEnter(); return true; }
        if (act === 'clear') { G.input = null; if (c && c.step === 'x') G.calc = null; return true; }
        if (act.startsWith('ins:') || ['left', 'right', 'del', 'bksp', 'home', 'end', 'up', 'down'].includes(act)) { edKey(G.input, act); return true; }
        return false;
      }
      if (act.startsWith('ins:') && G.mode === 'trace' && !(c && (c.step === 'first' || c.step === 'second')) && NUMSTART.has(act.slice(4))) {
        G.input = { t: [], c: 0 };
        edKey(G.input, act);
        return true;
      }
      if (act === 'enter') {
        if (c) calcEnter();
        else if (G.zoom) zoomEnter();
        return true;
      }
      if (act === 'clear') {
        if (c || G.zoom || G.mode !== 'none' || G.label || G.shade) { resetG(); return true; }
        setScreen('home');
        return true;
      }
      if (['left', 'right', 'up', 'down'].includes(act)) {
        G.label = null; G.shade = null;
        if (G.mode === 'none') { G.mode = 'free'; G.fx = CX; G.fy = CY; }
        if (G.mode === 'free') {
          const st = REP.n > 8 ? 4 : 1;
          if (act === 'left') G.fx = Math.max(0, G.fx - st);
          if (act === 'right') G.fx = Math.min(GW - 1, G.fx + st);
          if (act === 'up') G.fy = Math.max(0, G.fy - st);
          if (act === 'down') G.fy = Math.min(GH - 1, G.fy + st);
          return true;
        }
        if (act === 'left' || act === 'right') { traceStep(act === 'right' ? 1 : -1); return true; }
        const ids = curves().map(cv => cv.i);
        if (ids.length) {
          let k = ids.indexOf(G.tf);
          k = (k + (act === 'down' ? 1 : -1) + ids.length) % ids.length;
          G.tf = ids[k];
        }
        return true;
      }
      return act === 'del' || act === 'bksp';
    },
  };

  Object.assign(GX, {
    G, REP, resetG, gotoGraph, graphNow, enterGraphScreen, preset, setWin, zoomMode, zSquare, zFit, zStat, zPrev,
    startTrace, startCalc, xToPx, yToPx, pxToX, pyToY, drawGraphImage, curves, clearDrawings,
  });
})(window.GX = window.GX || {});
