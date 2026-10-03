/* Graphite GX — screen registry, status messages and the error screen.
   Each screen is { draw(ctx), key(action) → handled?, enter?(), leave?() }. */
(function (GX) {
  'use strict';
  const { S, C, UI, str, drawCol } = GX;

  const SCREENS = {};
  let toastTimer = null;
  function toast(t) {
    S.toast = { t, until: Date.now() + 2400 };
    clearTimeout(toastTimer);
    if (UI.live) toastTimer = setTimeout(() => { S.toast = null; GX.draw(); }, 2450);
  }
  function setScreen(name) {
    const prev = S.screen;
    if (prev !== name && SCREENS[prev] && SCREENS[prev].leave) SCREENS[prev].leave();
    S.screen = name;
    if (prev !== name && SCREENS[name].enter) SCREENS[name].enter();
  }

  const ERR_MSG = {
    'SYNTAX': 'Misplaced symbol or paren', 'DIVIDE BY 0': 'Division by zero',
    'DOMAIN': 'Input outside valid range', 'NONREAL ANS': "Answer isn't a real number",
    'OVERFLOW': 'Result is too large', 'ARGUMENT': 'Wrong number of arguments',
    'UNDEFINED': 'Nothing stored there yet', 'WINDOW RANGE': 'Need Xmin<Xmax, Ymin<Ymax',
    'NO SIGN CHNG': 'No zero between bounds', 'INVALID': 'Not valid here',
    'MEMORY': 'Y-vars nest too deeply', 'DATA TYPE': 'Wrong kind of value here',
    'DIM MISMATCH': 'Sizes of lists/matrices differ', 'INVALID DIM': 'List or matrix is empty',
    'SINGULAR MAT': 'Matrix has no inverse', 'STAT': 'Not enough data points',
    'BREAK': 'Program stopped with ON', 'LABEL': 'No Lbl with that name',
    'UNDEFINED PRGM': 'No program with that name', 'NO SOLUTION': 'The system has no solution',
  };
  // go: where "Goto" returns to — { screen, ... } or null
  function showError(type, go, msg) {
    S.err = { type, go, sel: 0, msg: msg || ERR_MSG[type] || '' };
    S.screen = 'error';
  }
  function errorGoto() {
    const g = S.err.go;
    S.err = null;
    if (g.screen === 'home') { S.screen = 'home'; S.ed = { t: g.tokens, c: Math.min(g.pos || 0, g.tokens.length) }; }
    else if (g.screen === 'yeq') { S.screen = 'yeq'; GX.YS.row = g.row; GX.YS.c = 0; }
    else if (g.screen === 'pedit') GX.openEditor(g.prog, g.line);
    else if (SCREENS[g.screen].enter && g.screen !== 'graph') { S.screen = g.screen; SCREENS[g.screen].enter(); }
    else S.screen = g.screen;
  }
  SCREENS.error = {
    draw(c) {
      const e = S.err;
      drawCol(c, str('ERR:' + e.type), 0, 0, { inv: true });
      if (e.msg) drawCol(c, str(e.msg), 0, 1, { color: C.dim });
      const opts = e.go ? ['Quit', 'Goto'] : ['Quit'];
      opts.forEach((o, k) => {
        drawCol(c, [String(k + 1), ':'], 0, 3 + k, { inv: k === e.sel });
        drawCol(c, str(o), 2, 3 + k);
      });
    },
    key(act) {
      const e = S.err, hasGo = !!e.go;
      if ((act === 'up' || act === 'down') && hasGo) { e.sel ^= 1; return true; }
      if (act === 'ins:1' || act === 'clear' || act === 'quit' || (act === 'enter' && e.sel === 0)) { S.err = null; S.screen = 'home'; return true; }
      if (hasGo && (act === 'ins:2' || (act === 'enter' && e.sel === 1))) { errorGoto(); return true; }
      return !act.startsWith('go:');
    },
  };

  Object.assign(GX, { SCREENS, toast, setScreen, showError, ERR_MSG });
})(window.GX = window.GX || {});
