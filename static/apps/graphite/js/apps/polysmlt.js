/* Graphite GX — PlySmlt2 app: polynomial root finder (real and complex roots)
   and a simultaneous linear equation solver. The Y=…GRAPH keys are soft keys here. */
(function (GX) {
  'use strict';
  const { S, sub, fail, mkC, fmtC, toast, openForm, openResults, openMenu, showError } = GX;

  // Durand–Kerner iteration on the monic polynomial; returns numbers or complex values
  function polyRoots(coefHigh) {
    let a = coefHigh.slice();
    while (a.length && a[0] === 0) a.shift();
    if (a.length < 2) fail('DOMAIN');
    const c = a.map(x => x / a[0]);
    let zeros = 0;
    while (c.length > 1 && c[c.length - 1] === 0) { c.pop(); zeros++; }
    const m = c.length - 1, roots = [];
    if (m > 0) {
      const R = 1 + Math.max(...c.slice(1).map(Math.abs));
      let z = Array.from({ length: m }, (_, k) => { const t = 2 * Math.PI * k / m + 0.4; return [0.6 * R * Math.cos(t), 0.6 * R * Math.sin(t)]; });
      const p = ([x, y]) => { let re = 1, im = 0; for (let k = 1; k <= m; k++) [re, im] = [re * x - im * y + c[k], re * y + im * x]; return [re, im]; };
      for (let it = 0; it < 2000; it++) {
        let delta = 0;
        for (let k = 0; k < m; k++) {
          const [pr, pi] = p(z[k]);
          let dr = 1, di = 0;
          for (let j = 0; j < m; j++) if (j !== k) { const ar = z[k][0] - z[j][0], ai = z[k][1] - z[j][1]; [dr, di] = [dr * ar - di * ai, dr * ai + di * ar]; }
          const den = dr * dr + di * di;
          if (den === 0) { z[k] = [z[k][0] + 1e-7, z[k][1] + 1e-7]; continue; }
          const qr = (pr * dr + pi * di) / den, qi = (pi * dr - pr * di) / den;
          z[k] = [z[k][0] - qr, z[k][1] - qi];
          delta = Math.max(delta, Math.hypot(qr, qi) / Math.max(1, Math.hypot(...z[k])));
        }
        if (delta < 1e-16) break;
      }
      // repeated roots converge slowly; averaging a tight cluster recovers them accurately
      const used = new Array(m).fill(false);
      for (let k = 0; k < m; k++) {
        if (used[k]) continue;
        const grp = [k];
        for (let j = k + 1; j < m; j++) if (!used[j] && Math.hypot(z[k][0] - z[j][0], z[k][1] - z[j][1]) < 1e-5 * Math.max(1, Math.hypot(...z[k]))) grp.push(j);
        let mr = grp.reduce((s, j) => s + z[j][0], 0) / grp.length, mi = grp.reduce((s, j) => s + z[j][1], 0) / grp.length;
        // a root of multiplicity m is a simple root of the (m−1)th derivative: polish it with Newton there
        let d = c.slice();
        for (let q = 1; q < grp.length; q++) d = d.slice(0, -1).map((v, i) => v * (d.length - 1 - i));
        const dd = d.slice(0, -1).map((v, i) => v * (d.length - 1 - i));
        const horner = (co, x, y) => { let re = co[0], im = 0; for (let k = 1; k < co.length; k++) [re, im] = [re * x - im * y + co[k], re * y + im * x]; return [re, im]; };
        for (let it = 0; it < 30 && dd.length; it++) {
          const [fr, fi] = horner(d, mr, mi), [gr, gi] = horner(dd, mr, mi), den = gr * gr + gi * gi;
          if (den === 0) break;
          const sr = (fr * gr + fi * gi) / den, si = (fi * gr - fr * gi) / den;
          mr -= sr; mi -= si;
          if (Math.hypot(sr, si) < 1e-16 * Math.max(1, Math.hypot(mr, mi))) break;
        }
        grp.forEach(j => { used[j] = true; roots.push([mr, mi]); });
      }
    }
    for (let k = 0; k < zeros; k++) roots.push([0, 0]);
    return roots
      .map(([re, im]) => (Math.abs(im) < 1e-9 * Math.max(1, Math.abs(re)) ? [re, 0] : [re, im]))
      .sort((p, q) => q[0] - p[0] || q[1] - p[1])
      .map(([re, im]) => (im === 0 ? (Math.abs(re) < 1e-14 ? 0 : re) : mkC(re, im)));
  }

  // Gauss–Jordan on [A|b]; reports a unique solution, none, or infinitely many
  function solveSystem(A, b) {
    const n = A.length, M = A.map((r, i) => [...r, b[i]]);
    const scale = Math.max(1, ...M.flat().map(Math.abs));
    let rank = 0;
    const pivots = [];
    for (let col = 0; col < n && rank < n; col++) {
      let p = rank;
      for (let i = rank + 1; i < n; i++) if (Math.abs(M[i][col]) > Math.abs(M[p][col])) p = i;
      if (Math.abs(M[p][col]) < 1e-11 * scale) continue;
      [M[p], M[rank]] = [M[rank], M[p]];
      const pv = M[rank][col];
      M[rank] = M[rank].map(x => x / pv);
      for (let i = 0; i < n; i++) if (i !== rank) { const f = M[i][col]; M[i] = M[i].map((x, j) => x - f * M[rank][j]); }
      pivots.push(col);
      rank++;
    }
    for (let i = rank; i < n; i++) if (Math.abs(M[i][n]) > 1e-9 * scale) return { kind: 'none' };
    if (rank < n) return { kind: 'many' };
    const x = new Array(n);
    pivots.forEach((col, r) => { x[col] = Math.abs(M[r][n]) < 1e-13 * scale ? 0 : M[r][n]; });
    return { kind: 'one', x };
  }

  const P = () => S.ply;
  const soft = (...keys) => keys.map(k => (k ? { label: k[0], run: k[1] } : null));
  const toMain = ['MAIN', () => openMenu('plysmlt')];

  /* ---------- polynomial root finder ---------- */
  const POLY = {
    title: 'POLY ROOT FINDER',
    fields: () => {
      const d = P().deg, out = [
        { type: 'choice', label: 'DEGREE ', opts: ['2', '3', '4', '5', '6', '7', '8', '9', '10'], get: () => P().deg - 2, set: i => { P().deg = i + 2; } },
        { type: 'text', label: 'a' + sub(d) + 'x' + (d > 3 ? '^' + d : d === 3 ? '³' : '²') + '+…+a' + sub(1) + 'x+a' + sub(0) + '=0' },
      ];
      for (let k = d; k >= 0; k--) out.push({ type: 'num', label: 'a' + sub(k) + '=', get: () => P().coef[k] || 0, set: v => { P().coef[k] = v; } });
      return out;
    },
    soft: soft(toMain, null, ['CLR', () => { P().coef = new Array(11).fill(0); P().coef[P().deg] = 1; }], null, ['SOLVE', solvePoly]),
  };
  function solvePoly() {
    const d = P().deg, high = [];
    for (let k = d; k >= 0; k--) high.push(P().coef[k] || 0);
    if (high[0] === 0) { toast('The leading coefficient a' + sub(d) + ' can’t be 0'); return; }
    try {
      const roots = polyRoots(high);
      S.ans = roots.every(r => typeof r === 'number') ? roots : S.ans;
      openResults('ROOTS', roots.map((r, j) => 'x' + sub(j + 1) + '=' + fmtC(r)), POLY, soft(toMain, null, null, ['COEF', () => openForm(POLY, true)], null));
    } catch (e) { showError(e.type || 'DOMAIN', { screen: 'form' }); }
  }

  /* ---------- simultaneous equations ---------- */
  const SIMUL = {
    title: 'SIMULT EQN SOLVER',
    fields: () => {
      const n = P().n, out = [
        { type: 'choice', label: 'EQUATIONS ', opts: ['2', '3', '4', '5', '6'], get: () => P().n - 2, set: i => { P().n = i + 2; } },
        { type: 'text', label: 'a' + sub(11) + 'x' + sub(1) + '+a' + sub(12) + 'x' + sub(2) + '+…=b' + sub(1) },
      ];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) out.push({ type: 'num', label: 'a' + sub(i + 1) + sub(j + 1) + '=', get: () => P().a[i][j] || 0, set: v => { P().a[i][j] = v; } });
        out.push({ type: 'num', label: 'b' + sub(i + 1) + '=', get: () => P().a[i][6] || 0, set: v => { P().a[i][6] = v; } });
      }
      return out;
    },
    soft: soft(toMain, null, ['CLR', () => { P().a = P().a.map(r => r.map(() => 0)); }], null, ['SOLVE', solveSimul]),
  };
  function solveSimul() {
    const n = P().n, A = [], b = [];
    for (let i = 0; i < n; i++) { A.push(P().a[i].slice(0, n).map(x => x || 0)); b.push(P().a[i][6] || 0); }
    const r = solveSystem(A, b);
    const lines = r.kind === 'one' ? r.x.map((x, j) => 'x' + sub(j + 1) + '=' + fmtC(x))
      : r.kind === 'none' ? ['NO SOLUTION FOUND', '', 'The equations conflict.'] : ['INFINITE SOLUTIONS', '', 'Some equations repeat', 'information.'];
    if (r.kind === 'one') S.ans = r.x;
    openResults('SOLUTION', lines, SIMUL, soft(toMain, null, null, ['SYSM', () => openForm(SIMUL, true)], null));
  }

  GX.ply = { polyRoots, solveSystem, openPoly: () => openForm(POLY), openSimul: () => openForm(SIMUL) };
})(window.GX = window.GX || {});
