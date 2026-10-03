/* Graphite GX — menus. A menu is a list of tabs; each item pastes tokens into
   the screen you came from, runs an action, or opens a submenu (sub). */
(function (GX) {
  'use strict';
  const {
    S, TOK, YN, WVARS, LISTS, MATS, STRS, STAT_XY, STAT_SUM, STAT_EQ, STAT_TEST, STATCMDS, CTL, IO, DRAW, FMTCMDS, FNS,
    prgmToken, str, SCREENS, C, toast, setScreen, drawCol, valueTokens,
  } = GX;

  const MKEYS = [...'1234567890ABCDEFGHIJKLMNOP'];
  const mi = (tok, label) => ({ label: label || tok.trim(), ins: [tok] });
  const ma = (label, fn) => ({ label, fn });
  const sm = (label, sub) => ({ label, sub });
  const ckey = s => (/^[A-Za-z]/.test(s) ? '0' : '1') + s.toLowerCase();
  const CATALOG_TOKS = [...Object.keys(FNS), ...STATCMDS, ...CTL, ...IO, ...DRAW, ...FMTCMDS, 'getKey', ' and ', 'Ans', 'e', 'i',
    ' nCr ', ' nPr ', ' or ', 'rand', ' xor ', '▶Dec', '▶Frac', '▶Rect', '▶Polar', '°', 'ʳ', '!', 'ᵀ', ...WVARS];
  const prgmNames = () => Object.keys(S.prgms).sort();
  const listOr = (items, empty) => (items.length ? items : [{ label: empty, na: 'Create one with PRGM ▶ NEW' }]);
  function confirm(title, lines, yes, run) {
    GX.openForm({ title, fields: () => [...lines.map(l => ({ type: 'text', label: l })), { type: 'action', label: 'No, go back', run: () => setScreen('home') }, { type: 'action', label: yes, run }] });
  }

  const MENUS = {
    math: () => [
      { title: 'MATH', items: [...['▶Frac', '▶Dec', '³', '³√(', 'ˣ√', 'fMin(', 'fMax(', 'nDeriv(', 'fnInt(', 'Σ(', 'logBASE('].map(t => mi(t)),
        ma('Solver…', () => GX.openSolver())] },
      { title: 'NUM', items: ['abs(', 'round(', 'iPart(', 'fPart(', 'int(', 'min(', 'max(', 'lcm(', 'gcd(', 'remainder('].map(t => mi(t)) },
      { title: 'CMPLX', items: ['conj(', 'real(', 'imag(', 'angle(', 'abs(', '▶Rect', '▶Polar'].map(t => mi(t)) },
      { title: 'PROB', items: [mi('rand'), mi(' nPr '), mi(' nCr '), mi('!'), mi('randInt(')] },
    ],
    test: () => [
      { title: 'TEST', items: ['=', '≠', '>', '≥', '<', '≤'].map(t => mi(t)) },
      { title: 'LOGIC', items: [mi(' and '), mi(' or '), mi(' xor '), mi('not(')] },
    ],
    angle: () => [{ title: 'ANGLE', items: ['°', 'ʳ', 'R▶Pr(', 'R▶Pθ(', 'P▶Rx(', 'P▶Ry('].map(t => mi(t)) }],
    vars: () => [
      { title: 'VARS', items: [sm('Window…', 'vwin'), sm('Statistics…', 'vstat'), sm('String…', 'vstr')] },
      { title: 'Y-VARS', items: YN.map(t => mi(t)) },
    ],
    vwin: () => [
      { title: 'X/Y', items: WVARS.slice(0, 6).map(t => mi(t)) },
      { title: 'T/θ', items: WVARS.slice(6).map(t => mi(t)) },
    ],
    vstat: () => [
      { title: 'XY', items: STAT_XY.map(t => mi(t)) },
      { title: 'Σ', items: STAT_SUM.map(t => mi(t)) },
      { title: 'EQ', items: [{ label: 'RegEQ', insFn: () => S.stat.eq, empty: 'Run a regression first (STAT ▶ CALC)' }, ...STAT_EQ.map(t => mi(t))] },
      { title: 'TEST', items: STAT_TEST.map(t => mi(t)) },
    ],
    vstr: () => [{ title: 'STRING', items: STRS.map(t => mi(t)) }],
    distr: () => [{ title: 'DISTR', items: ['normalpdf(', 'normalcdf(', 'invNorm(', 'tpdf(', 'tcdf(', 'invT(', 'χ²pdf(', 'χ²cdf(',
      'Fpdf(', 'Fcdf(', 'binompdf(', 'binomcdf(', 'poissonpdf(', 'poissoncdf(', 'geometpdf(', 'geometcdf('].map(t => mi(t)) }],
    stat: () => [
      { title: 'EDIT', items: [ma('Edit…', () => GX.openListEditor()), mi('SortA('), mi('SortD('), mi('ClrList ')] },
      { title: 'CALC', items: STATCMDS.filter(t => t !== 'ClrList ').map(t => mi(t)) },
      { title: 'TESTS', items: GX.TESTS.map(T => ma(T.title + '…', () => GX.openForm(T.spec))) },
    ],
    list: () => [
      { title: 'NAMES', items: LISTS.map(t => mi(t)) },
      { title: 'OPS', items: ['SortA(', 'SortD(', 'dim(', 'seq(', 'cumSum(', 'ΔList(', 'augment('].map(t => mi(t)) },
      { title: 'MATH', items: ['min(', 'max(', 'mean(', 'median(', 'sum(', 'prod(', 'stdDev(', 'variance('].map(t => mi(t)) },
    ],
    matrix: () => {
      const label = m => { const v = S.mats[m[1]]; return v ? m + ' ' + v.rows.length + '×' + v.rows[0].length : m; };
      return [
        { title: 'NAMES', items: MATS.map(m => mi(m, label(m))) },
        { title: 'MATH', items: ['det(', 'ᵀ', 'dim(', 'identity(', 'randM(', 'augment(', 'rref('].map(t => mi(t)) },
        { title: 'EDIT', items: MATS.map(m => ma(label(m), () => GX.openMatEditor(m[1]))) },
      ];
    },
    statplot: () => [{
      title: 'STAT PLOTS', items: [
        ...[0, 1, 2].map(k => ma('Plot' + (k + 1) + '…' + (S.plots[k].on ? 'On' : 'Off'), () => setScreen('plot' + k))),
        ma('PlotsOff', () => { S.plots.forEach(p => { p.on = false; }); toast('All stat plots off'); }),
        ma('PlotsOn', () => { S.plots.forEach(p => { p.on = true; }); toast('All stat plots on'); }),
      ],
    }],
    zoom: () => [
      { title: 'ZOOM', items: [
        ma('ZBox', () => GX.zoomMode('box')), ma('Zoom In', () => GX.zoomMode('in')), ma('Zoom Out', () => GX.zoomMode('out')),
        ma('ZDecimal', () => GX.preset({ xmin: -15.9, xmax: 15.9, xscl: 1, ymin: -11, ymax: 11, yscl: 1 })),
        ma('ZSquare', () => GX.zSquare()),
        ma('ZStandard', () => GX.preset({ xmin: -10, xmax: 10, xscl: 1, ymin: -10, ymax: 10, yscl: 1 }, true)),
        ma('ZTrig', () => {
          const deg = S.mode.angle === 'DEGREE', r = deg ? 352.5 : 352.5 * Math.PI / 180;
          GX.preset({ xmin: -r, xmax: r, xscl: deg ? 90 : Math.PI / 2, ymin: -4, ymax: 4, yscl: 1 }, true);
        }),
        ma('ZInteger', () => {
          const cx = Math.round((S.win.xmin + S.win.xmax) / 2), cy = Math.round((S.win.ymin + S.win.ymax) / 2);
          GX.preset({ xmin: cx - 159, xmax: cx + 159, xscl: 10, ymin: cy - 110, ymax: cy + 110, yscl: 10 });
        }),
        ma('ZoomStat', () => GX.zStat()),
        ma('ZoomFit', () => GX.zFit()),
      ] },
      { title: 'MEMORY', items: [
        ma('ZPrevious', () => GX.zPrev()),
        ma('ZoomSto', () => { S.stoWin = { ...S.win }; toast('Window stored'); }),
        ma('ZoomRcl', () => {
          if (!S.stoWin) { toast('Store a window with ZoomSto first'); return; }
          GX.enterGraphScreen(); GX.setWin(S.stoWin); GX.graphNow();
        }),
      ] },
    ],
    calc: () => [{ title: 'CALCULATE', items: [
      ma('value', () => GX.startCalc('value')), ma('zero', () => GX.startCalc('zero')),
      ma('minimum', () => GX.startCalc('minimum')), ma('maximum', () => GX.startCalc('maximum')),
      ma('intersect', () => GX.startCalc('intersect')), ma('dy/dx', () => GX.startCalc('dydx')),
      ma('∫f(x)dx', () => GX.startCalc('integral')),
    ] }],
    prgm: from => {
      const names = prgmNames();
      if (from === 'pedit') {
        return [
          { title: 'CTL', items: CTL.map(t => mi(t)) },
          { title: 'I/O', items: [...IO, 'getKey'].map(t => mi(t)) },
          { title: 'EXEC', items: listOr(names.map(n => mi(prgmToken(n), n)), '(no programs)') },
        ];
      }
      return [
        { title: 'EXEC', items: listOr(names.map(n => mi(prgmToken(n), n)), '(no programs)') },
        { title: 'EDIT', items: listOr(names.map(n => ma(n, () => GX.openEditor(n, 0))), '(no programs)') },
        { title: 'NEW', items: [ma('Create New', () => setScreen('pnew'))] },
      ];
    },
    draw: () => [
      { title: 'DRAW', items: DRAW.slice(0, 8).map(t => mi(t)) },
      { title: 'POINTS', items: DRAW.slice(8).map(t => mi(t)) },
      { title: 'FORMAT', items: FMTCMDS.map(t => mi(t)) },
    ],
    mem: () => [{ title: 'MEMORY', items: [
      ma('About', () => GX.openResults('ABOUT', ['Graphite GX  version 3', '', 'A TI-84 style graphing', 'calculator for the web.', '', 'Not affiliated with or', 'endorsed by Texas', 'Instruments.'], null)),
      ma('Clear Entries', () => { S.entries = []; toast('Entry history cleared'); }),
      ma('ClrAllLists', () => { S.lists = [[], [], [], [], [], []]; toast('All lists cleared'); }),
      sm('Delete Prgm…', 'delprgm'),
      ma('Reset All…', () => confirm('RESET ALL', ['Erases programs, lists,', 'matrices, settings and', 'history.', ''], 'Yes, reset everything', () => GX.resetAll())),
    ] }],
    delprgm: () => [{ title: 'DELETE PRGM', items: listOr(prgmNames().map(n => ma(n, () => confirm('DELETE', ['Delete prgm' + n + '?', 'This can’t be undone.', ''], 'Yes, delete it', () => {
      delete S.prgms[n];
      toast('Deleted prgm' + n);
      setScreen('home');
    }))), '(no programs)') }],
    apps: () => [{ title: 'APPLICATIONS', items: [sm('Finance…', 'finance'), sm('PlySmlt2', 'plysmlt'),
      ...GX.Games.list.map(g => ma(g.name, () => GX.Games.start(g.id)))] }],
    finance: () => [{ title: 'CALC', items: [ma('TVM Solver…', () => GX.openTVM()),
      ...['tvm_Pmt(', 'tvm_I%(', 'tvm_PV(', 'tvm_N(', 'tvm_FV('].map(t => mi(t, t.slice(0, -1))),
      ...['npv(', 'irr(', 'bal(', 'ΣPrn(', 'ΣInt(', '▶Nom(', '▶Eff('].map(t => mi(t))] }],
    plysmlt: () => [{ title: 'PlySmlt2', items: [ma('POLY ROOT FINDER', () => GX.ply.openPoly()), ma('SIMULT EQN SOLVER', () => GX.ply.openSimul()),
      ma('ABOUT', () => GX.openResults('PlySmlt2', ['Finds real and complex', 'roots of polynomials up', 'to degree 10, and solves', 'up to 6 linear equations.', '', 'Y= WINDOW ZOOM TRACE GRAPH', 'are the soft keys shown', 'at the bottom.'], null))] }],
    catalog: () => [{ title: 'CATALOG', items: [...new Set(CATALOG_TOKS)].map(t => mi(t)).sort((a, b) => (ckey(a.label) < ckey(b.label) ? -1 : 1)) }],
  };

  // RCL: when on, choosing a variable pastes its contents instead of its name
  function rclTokens(tok) {
    const info = TOK[tok];
    if (!info) return null;
    switch (info.t) {
      case 'var': return valueTokens(S.vars[tok]);
      case 'lvar': return valueTokens(S.lists[info.i]);
      case 'mvar': return S.mats[info.k] ? valueTokens(S.mats[info.k]) : null;
      case 'yvar': return S.y[info.i].t.slice();
      case 'svar': return typeof S.stat[tok] === 'number' ? valueTokens(S.stat[tok]) : null;
      case 'strvar': return S.strs[tok] !== undefined ? ['"', ...str(S.strs[tok]).filter(ch => TOK[ch]), '"'] : null;
    }
    return null;
  }

  function openMenu(name) {
    const from = S.screen === 'menu' ? S.menu.from : (S.screen === 'error' ? 'home' : S.screen);
    S.menu = { name, tabs: MENUS[name](from), tab: 0, sel: 0, top: 0, from, catalog: name === 'catalog' };
    S.screen = 'menu';
  }
  function closeMenu() { const from = S.menu.from; S.menu = null; S.screen = from; return from; }
  const PASTE_TARGETS = ['home', 'yeq', 'window', 'tblset', 'listedit', 'matedit', 'solver', 'pedit', 'form', 'run'];
  function pasteInto(from, toks) {
    if (S.rcl && toks.length === 1) { const r = rclTokens(toks[0]); S.rcl = false; if (r) toks = r; }
    const target = PASTE_TARGETS.includes(from) ? from : 'home';
    if (S.screen !== target) setScreen(target);
    toks.forEach(t => SCREENS[target].key('ins:' + t));
  }
  function chooseItem(it) {
    if (!it) return;
    if (it.na) { toast(it.na); return; }
    if (it.sub) { openMenu(it.sub); return; }
    if (it.insFn) {
      const toks = it.insFn();
      if (!toks || !toks.length) { toast(it.empty); return; }
      pasteInto(closeMenu(), toks);
      return;
    }
    const from = closeMenu();
    if (it.ins) pasteInto(from, it.ins);
    else if (it.fn) it.fn();
  }

  SCREENS.menu = {
    leave() { const f = S.menu && S.menu.from; S.menu = null; if (f && SCREENS[f].leave) SCREENS[f].leave(); },
    draw(c) {
      const m = S.menu;
      if (m.catalog) drawCol(c, str('CATALOG'), 0, 0);
      else {
        let col = 0;
        m.tabs.forEach((t, k) => { const ch = str(t.title); drawCol(c, ch, col, 0, { inv: k === m.tab }); col += ch.length + 1; });
      }
      const items = m.tabs[m.tab].items;
      if (m.sel < m.top) m.top = m.sel;
      if (m.sel >= m.top + 9) m.top = m.sel - 8;
      for (let r = 0; r < 9; r++) {
        const idx = m.top + r;
        if (idx >= items.length) break;
        const it = items[idx];
        if (m.catalog) {
          if (idx === m.sel) drawCol(c, ['▶'], 0, r + 1);
          drawCol(c, str(it.label), 1, r + 1);
        } else {
          const markc = r === 8 && idx < items.length - 1 ? '↓' : r === 0 && m.top > 0 ? '↑' : ':';
          drawCol(c, [MKEYS[idx] || ' ', markc], 0, r + 1, { inv: idx === m.sel });
          drawCol(c, str(it.label), 2, r + 1, it.na ? { color: C.dim } : {});
        }
      }
    },
    key(act) {
      const m = S.menu, items = m.tabs[m.tab].items, n = items.length;
      if (act === 'up') { m.sel = (m.sel - 1 + n) % n; return true; }
      if (act === 'down') { m.sel = (m.sel + 1) % n; return true; }
      if (act === 'left' || act === 'right') {
        if (m.tabs.length > 1) { m.tab = (m.tab + (act === 'right' ? 1 : -1) + m.tabs.length) % m.tabs.length; m.sel = 0; m.top = 0; }
        return true;
      }
      if (act === 'enter') { chooseItem(items[m.sel]); return true; }
      if (act === 'clear') { closeMenu(); return true; }
      if (act.startsWith('ins:')) {
        const ch = act.slice(4);
        if (m.catalog) {
          const idx = items.findIndex(it => it.label.toUpperCase().startsWith(ch));
          if (idx >= 0) m.sel = idx;
          return true;
        }
        const idx = MKEYS.indexOf(ch);
        if (idx >= 0 && idx < n) { m.sel = idx; chooseItem(items[idx]); }
        return true;
      }
      return ['del', 'bksp', 'home', 'end', 'entry', 'solve'].includes(act);
    },
  };

  Object.assign(GX, { MENUS, openMenu, closeMenu, rclTokens });
})(window.GX = window.GX || {});
