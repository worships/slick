/* Graphite GX — equation solver (MATH → B:Solver…).
   Type an expression that should equal 0 (or "left=right"), then pick
   which variable to solve for (ALPHA ENTER); every other variable keeps its stored value. */
(function (GX) {
  'use strict';
  const { S, str, SCREENS, C, UI, parse, ev, num, evalTokens, findRoot, fmtNum, toast, setScreen, showError, drawCol, drawCursor, charOff, edKey } = GX;
  const SV = { page: 'eq', ed: { t: [], c: 0 }, names: [], sel: 0, ved: null, solved: null, lr: null };
  const EW = 20; // equation characters per line

  function openSolver() {
    SV.page = 'eq';
    SV.ed = { t: S.solverEq.slice(), c: S.solverEq.length };
    setScreen('solver');
  }
  function collectVars(node, out) {
    if (!node || typeof node !== 'object') return out;
    if (node.k === 'var' && !out.includes(node.v)) out.push(node.v);
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) v.forEach(x => (Array.isArray(x) ? x.forEach(y => collectVars(y, out)) : collectVars(x, out)));
      else if (v && typeof v === 'object') collectVars(v, out);
    }
    return out;
  }
  function eqFn(ast, name) {
    const isEq = ast.k === 'bin' && ast.op === '=';
    return t => {
      const b = { [name]: t };
      return isEq ? num(ev(ast.l, b)) - num(ev(ast.r, b)) : num(ev(ast, b));
    };
  }
  function toVars() {
    let ast;
    try { ast = parse(SV.ed.t).node; } catch (e) { showError(e.type, { screen: 'solver' }); return; }
    const names = collectVars(ast, []);
    if (!names.length) { toast('Add a variable to solve for, like X'); return; }
    S.solverEq = SV.ed.t.slice();
    Object.assign(SV, { page: 'vars', names, sel: Math.max(0, names.indexOf('X')), ved: null, solved: null, lr: null });
  }
  function commitVar() {
    if (!SV.ved) return true;
    if (SV.ved.fresh || !SV.ved.t.length) { SV.ved = null; return true; }
    try { S.vars[SV.names[SV.sel]] = evalTokens(SV.ved.t); SV.ved = null; return true; }
    catch (e) { toast("That isn't a number"); return false; }
  }
  function solve() {
    if (!commitVar()) return;
    const name = SV.names[SV.sel], ast = parse(S.solverEq).node, f = eqFn(ast, name);
    const g = S.vars[name];
    for (const R of [1, 10, 100, 1e3, 1e5, 1e8, 1e12, 1e20, 1e50, 1e99]) {
      try {
        const x = findRoot(f, g - R, g + R, g);
        S.vars[name] = x;
        SV.solved = name;
        try { SV.lr = f(x); } catch (e) { SV.lr = null; }
        return;
      } catch (e) { /* widen the search */ }
    }
    showError('NO SIGN CHNG', { screen: 'solver' }, 'No solution near the guess');
  }

  SCREENS.solver = {
    leave() { if (SV.page === 'eq') S.solverEq = SV.ed.t.slice(); },
    draw(c) {
      if (SV.page === 'eq') {
        drawCol(c, str('EQUATION SOLVER'), 0, 0);
        drawCol(c, str('eqn:0='), 0, 1);
        const ch = str(SV.ed.t.join(''));
        for (let r = 0; r * EW <= ch.length && r < 6; r++) drawCol(c, ch.slice(r * EW, (r + 1) * EW), 6, 1 + r);
        const off = charOff(SV.ed.t, SV.ed.c);
        drawCursor(c, 6 + off % EW, 1 + Math.floor(off / EW));
        drawCol(c, str('X²=9 style works too.'), 0, 8, { color: C.dim });
        drawCol(c, str('ENTER picks the variable'), 0, 9, { color: C.dim });
        return;
      }
      const eq = S.solverEq.join('');
      drawCol(c, str(eq.includes('=') ? eq : '0=' + eq).slice(0, 26), 0, 0, { color: C.dim });
      SV.names.forEach((nm, k) => {
        const row = 1 + k;
        if (row > 6) return;
        if (SV.solved === nm) drawCol(c, ['▪'], 0, row);
        const lab = str(nm + '=');
        drawCol(c, lab, 1, row);
        if (k === SV.sel && SV.ved && !SV.ved.fresh) {
          drawCol(c, str(SV.ved.t.join('')), 1 + lab.length, row);
          drawCursor(c, 1 + lab.length + charOff(SV.ved.t, SV.ved.c), row);
        } else {
          const val = str(fmtNum(S.vars[nm]));
          drawCol(c, val, 1 + lab.length, row);
          if (k === SV.sel) drawCursor(c, 1 + lab.length, row, { block: true, ch: val[0] });
        }
      });
      const after = Math.min(7, 1 + SV.names.length);
      drawCol(c, str('bound={⁻1ᴇ99,1ᴇ99}'), 1, after, { color: C.dim });
      if (SV.lr !== null && after + 1 < 9) drawCol(c, str('left-rt=' + fmtNum(SV.lr)), 1, after + 1);
      drawCol(c, str('ALPHA ENTER solves'), 0, 9, { color: C.dim });
    },
    key(act) {
      if (SV.page === 'eq') {
        if (act === 'enter' || act === 'solve' || act === 'down') { toVars(); return true; }
        if (act === 'clear') { SV.ed = { t: [], c: 0 }; return true; }
        if (act === 'up') return true;
        return edKey(SV.ed, act);
      }
      switch (act) {
        case 'up':
          if (!commitVar()) return true;
          if (SV.sel === 0) { SV.page = 'eq'; SV.ed = { t: S.solverEq.slice(), c: S.solverEq.length }; }
          else SV.sel--;
          return true;
        case 'down': if (commitVar()) SV.sel = Math.min(SV.names.length - 1, SV.sel + 1); return true;
        case 'enter': if (commitVar()) SV.sel = Math.min(SV.names.length - 1, SV.sel + 1); return true;
        case 'solve': solve(); return true;
        case 'clear': SV.ved = { t: [], c: 0 }; return true;
      }
      if (act.startsWith('ins:') || ['left', 'right', 'del', 'bksp', 'home', 'end'].includes(act)) {
        if (!SV.ved || SV.ved.fresh) SV.ved = { t: [], c: 0 };
        edKey(SV.ved, act);
        return true;
      }
      return false;
    },
  };
  Object.assign(GX, { SV, openSolver });
})(window.GX = window.GX || {});
