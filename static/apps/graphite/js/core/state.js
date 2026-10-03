/* Graphite GX — shared state, saving/loading, and graphing-function helpers. */
(function (GX) {
  'use strict';
  const { LETTERS, TOK, isToken, prgmToken, PRGM_NAME } = GX;

  // LCD geometry (logical pixels; the canvas is scaled up for sharpness)
  const GEO = { W: 320, H: 240, COLS: 26, ROWS: 10, SB: 18, RH: 22, GW: 319, GH: 221 };
  GEO.CW = GEO.W / GEO.COLS;
  GEO.GY = GEO.SB + 1;
  GEO.CX = Math.round((GEO.GW - 1) / 2);
  GEO.CY = Math.round((GEO.GH - 1) / 2);

  const TAU = 2 * Math.PI;
  const newPlot = () => ({ on: false, type: 0, x: 0, y: 1, mark: 0 });
  const S = {
    screen: 'home', off: false,
    mode: { notation: 'NORMAL', fix: -1, angle: 'RADIAN', graph: 'FUNC', style: 'CONNECTED', cplx: 'REAL' },
    fmt: { coord: true, grid: false, axes: true, labels: false },
    vars: {}, ans: 0, strs: {},
    y: Array.from({ length: 10 }, () => ({ t: [], on: true })),
    par: Array.from({ length: 6 }, () => ({ x: [], y: [], on: true })),
    pol: Array.from({ length: 6 }, () => ({ t: [], on: true })),
    win: { xmin: -10, xmax: 10, xscl: 1, ymin: -10, ymax: 10, yscl: 1, tmin: 0, tmax: TAU, tstep: Math.PI / 24, 'θmin': 0, 'θmax': TAU, 'θstep': Math.PI / 24 },
    prevWin: null, stoWin: null,
    tbl: { start: 0, step: 1 },
    lists: [[], [], [], [], [], []],
    mats: { A: null, B: null, C: null, D: null, E: null },
    plots: [newPlot(), newPlot(), newPlot()],
    stat: {},
    tst: {},
    fin: { N: 0, I: 0, PV: 0, PMT: 0, FV: 0, PY: 12, CY: 12, begin: false },
    ply: { deg: 2, coef: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], n: 2, a: [[1, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 1, 0]] },
    prgms: {},
    draw: [],
    solverEq: [],
    hi: {},
    hist: [], entries: [],
    ed: { t: [], c: 0 },
    second: false, alpha: false, alock: false, rcl: false,
    toast: null, err: null, menu: null, lastAct: '',
  };
  LETTERS.forEach(l => { S.vars[l] = 0; });

  /* ---------- turning plain text into tokens (used for the sample programs) ---------- */
  let sortedToks = null;
  function tokenize(src) {
    const keys = Object.keys(TOK);
    if (!sortedToks || sortedToks.length !== keys.length) sortedToks = keys.sort((a, b) => b.length - a.length);
    const out = [];
    let i = 0;
    while (i < src.length) {
      const hit = sortedToks.find(t => src.startsWith(t, i));
      if (!hit) throw new Error('Unknown text in program: ' + src.slice(i, i + 8));
      out.push(hit);
      i += hit.length;
    }
    return out;
  }
  const SAMPLES = {
    QUAD: ['ClrHome', 'Disp "AX²+BX+C=0"', 'Prompt A,B,C', 'B²-4AC→D', 'If D<0', 'Then', 'Disp "NO REAL ROOTS"', 'Else',
      'Disp "ROOTS:"', 'Disp (⁻B+√(D))/(2A)', 'Disp (⁻B-√(D))/(2A)', 'End'],
    GUESS: ['randInt(1,100)→N', '0→T', '0→G', 'Repeat G=N', 'Input "GUESS? ",G', 'T+1→T', 'If G>N:Disp "LOWER"',
      'If G<N:Disp "HIGHER"', 'End', 'Disp "GOT IT IN",T', 'Disp "TRIES"'],
    TARGET: ['ClrDraw', 'AxesOff', '⁻12→Xmin:12→Xmax', '⁻8.3→Ymin:8.3→Ymax', 'For(R,1,8)', 'Circle(0,0,R)', 'End',
      'Text(4,4,"TARGET")', 'Pause ', 'AxesOn'],
  };
  function installSamples() {
    for (const [name, lines] of Object.entries(SAMPLES)) {
      try { S.prgms[name] = lines.map(tokenize); prgmToken(name); } catch (e) { console.error(e); }
    }
  }

  /* ---------- persistence ---------- */
  const STORE = 'graphite-gx-v3';
  const fin = x => typeof x === 'number' && Number.isFinite(x);
  const cpx = v => !!v && v.cx === true && fin(v.re) && fin(v.im);
  const numArr = a => Array.isArray(a) && a.every(fin);
  const validMat = m => !!m && m.mat === true && Array.isArray(m.rows) && m.rows.length > 0 &&
    m.rows.every(r => numArr(r) && r.length > 0 && r.length === m.rows[0].length);
  const validVal = v => fin(v) || cpx(v) || numArr(v) || validMat(v);
  const validToks = a => Array.isArray(a) && a.every(isToken);

  function loadState() {
    let d;
    try { d = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') { installSamples(); return false; }
    try {
      if (d.prgms && typeof d.prgms === 'object') {
        for (const [name, lines] of Object.entries(d.prgms)) {
          if (!PRGM_NAME.test(name) || !Array.isArray(lines)) continue;
          prgmToken(name);
          S.prgms[name] = lines.filter(validToks);
          if (!S.prgms[name].length) S.prgms[name] = [[]];
        }
      }
      if (d.mode) Object.assign(S.mode, d.mode);
      if (d.fmt) Object.assign(S.fmt, d.fmt);
      if (d.vars) for (const k of LETTERS) if (fin(d.vars[k]) || cpx(d.vars[k])) S.vars[k] = d.vars[k];
      if (validVal(d.ans)) S.ans = d.ans;
      if (d.strs && typeof d.strs === 'object') for (const [k, v] of Object.entries(d.strs)) if (TOK[k] && typeof v === 'string') S.strs[k] = v;
      if (Array.isArray(d.y) && d.y.length === 10) S.y = d.y.map(f => ({ t: validToks(f && f.t) ? f.t : [], on: !(f && f.on === false) }));
      if (Array.isArray(d.par) && d.par.length === 6) S.par = d.par.map(f => ({ x: validToks(f && f.x) ? f.x : [], y: validToks(f && f.y) ? f.y : [], on: !(f && f.on === false) }));
      if (Array.isArray(d.pol) && d.pol.length === 6) S.pol = d.pol.map(f => ({ t: validToks(f && f.t) ? f.t : [], on: !(f && f.on === false) }));
      if (d.win) for (const k of Object.keys(S.win)) if (fin(d.win[k])) S.win[k] = d.win[k];
      if (d.tbl && fin(d.tbl.start) && fin(d.tbl.step)) Object.assign(S.tbl, d.tbl);
      if (Array.isArray(d.lists) && d.lists.length === 6) S.lists = d.lists.map(l => (numArr(l) ? l : []));
      if (d.mats) for (const k of 'ABCDE') S.mats[k] = validMat(d.mats[k]) ? d.mats[k] : null;
      if (Array.isArray(d.plots) && d.plots.length === 3) d.plots.forEach((p, i) => { if (p) Object.assign(S.plots[i], p); });
      for (const k of ['stat', 'tst', 'hi']) if (d[k] && typeof d[k] === 'object') S[k] = d[k];
      if (d.fin && typeof d.fin === 'object') Object.assign(S.fin, d.fin);
      if (d.ply && typeof d.ply === 'object' && Array.isArray(d.ply.coef) && Array.isArray(d.ply.a)) Object.assign(S.ply, d.ply);
      if (validToks(d.solverEq)) S.solverEq = d.solverEq;
      if (Array.isArray(d.hist)) {
        S.hist = d.hist.filter(h => h && validToks(h.i) && Array.isArray(h.lines) && h.lines.every(l => typeof l === 'string')).slice(-60);
      }
      if (Array.isArray(d.entries)) S.entries = d.entries.filter(validToks).slice(-30);
    } catch (e) { /* keep defaults for anything malformed */ }
    return true;
  }

  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({
          mode: S.mode, fmt: S.fmt, vars: S.vars, ans: S.ans, strs: S.strs, y: S.y, par: S.par, pol: S.pol,
          win: S.win, tbl: S.tbl, lists: S.lists, mats: S.mats, plots: S.plots, stat: S.stat, tst: S.tst,
          fin: S.fin, ply: S.ply, prgms: S.prgms, solverEq: S.solverEq, hi: S.hi,
          hist: S.hist.slice(-60), entries: S.entries.slice(-30),
        }));
      } catch (e) { /* storage unavailable or full */ }
    }, 300);
  }
  function resetAll() {
    try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
    if (typeof location !== 'undefined') location.reload();
  }

  /* ---------- graphing functions ---------- */
  const astCache = new Map();
  // parse a token array once and remember the tree (or the syntax error)
  function astOf(toks) {
    const key = toks.join('\u0001');
    let c = astCache.get(key);
    if (!c) {
      if (astCache.size > 400) astCache.clear();
      try { c = { ast: toks.length ? GX.parse(toks).node : null }; } catch (e) { c = { err: e }; }
      astCache.set(key, c);
    }
    if (c.err) throw c.err;
    return c.ast;
  }
  let yDepth = 0;
  const yAst = i => astOf(S.y[i].t);
  function evalAt(ast, name, v) {
    if (!ast) GX.fail('UNDEFINED');
    if (yDepth >= 10) GX.fail('MEMORY');
    yDepth++;
    try { return GX.ev(ast, { [name]: v }); } finally { yDepth--; }
  }
  const yEval = (i, x) => evalAt(yAst(i), 'X', x);
  // fast, error-swallowing evaluator for plotting: returns NaN where undefined
  function safeFn(ast, name) {
    if (!ast) return () => NaN;
    const b = { [name]: 0 };
    return v => {
      b[name] = v;
      try { const r = GX.ev(ast, b); return typeof r === 'number' && Number.isFinite(r) ? r : NaN; }
      catch (e) { return NaN; }
    };
  }
  function ySafe(i) { try { return safeFn(yAst(i), 'X'); } catch (e) { return () => NaN; } }
  const yFn = i => x => {
    const v = yEval(i, x);
    if (typeof v !== 'number') GX.fail('DATA TYPE');
    return GX.chk(v);
  };
  function activeFns() {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const f = S.y[i];
      if (!f.on || !f.t.length) continue;
      try { if (yAst(i)) out.push(i); } catch (e) { /* skip functions with syntax errors */ }
    }
    return out;
  }

  Object.assign(GX, { GEO, S, tokenize, installSamples, loadState, save, resetAll, astOf, evalAt, safeFn, yAst, yEval, ySafe, yFn, activeFns });
})(window.GX = window.GX || {});
