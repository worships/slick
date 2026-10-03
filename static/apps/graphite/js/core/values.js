/* Graphite GX — value types.
   Numbers are plain JS numbers, lists are arrays of numbers,
   and matrices are { mat: true, rows: [[...], ...] }. */
(function (GX) {
  'use strict';
  const { fail, chk, addsub } = GX;

  const isList = Array.isArray;
  const isMat = v => !!(v && v.mat === true);
  const isNum = v => typeof v === 'number';
  const num = v => (isNum(v) ? v : fail('DATA TYPE'));
  const mat = rows => ({ mat: true, rows });
  const cloneMat = m => mat(m.rows.map(r => r.slice()));
  const mdims = m => [m.rows.length, m.rows[0].length];
  const matMap = (m, f) => mat(m.rows.map(r => r.map(x => chk(f(x)))));
  const tidy = (x, scale) => (Math.abs(x) < 1e-12 * Math.max(1, scale) ? 0 : x);
  const maxAbs = rows => rows.reduce((m, r) => Math.max(m, ...r.map(Math.abs)), 0);

  function matAdd(a, b, sign) {
    const [r, c] = mdims(a), [r2, c2] = mdims(b);
    if (r !== r2 || c !== c2) fail('DIM MISMATCH');
    return mat(a.rows.map((row, i) => row.map((x, j) => addsub(x, b.rows[i][j], x + sign * b.rows[i][j]))));
  }
  function matMul(a, b) {
    const [r, k] = mdims(a), [k2, c] = mdims(b);
    if (k !== k2) fail('DIM MISMATCH');
    const out = [];
    for (let i = 0; i < r; i++) {
      const row = [];
      for (let j = 0; j < c; j++) {
        let s = 0;
        for (let t = 0; t < k; t++) s += a.rows[i][t] * b.rows[t][j];
        row.push(chk(s));
      }
      out.push(row);
    }
    return mat(out);
  }
  const matT = m => mat(m.rows[0].map((_, j) => m.rows.map(r => r[j])));
  function matIdentity(n) {
    if (!Number.isInteger(n) || n < 1 || n > 99) fail('INVALID DIM');
    return mat(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0))));
  }
  function needSquare(m) { const [r, c] = mdims(m); if (r !== c) fail('INVALID DIM'); return r; }
  function matDet(m) {
    const n = needSquare(m), a = m.rows.map(r => r.slice());
    let d = 1;
    for (let col = 0; col < n; col++) {
      let p = col;
      for (let i = col + 1; i < n; i++) if (Math.abs(a[i][col]) > Math.abs(a[p][col])) p = i;
      if (a[p][col] === 0) return 0;
      if (p !== col) { [a[p], a[col]] = [a[col], a[p]]; d = -d; }
      d *= a[col][col];
      for (let i = col + 1; i < n; i++) {
        const f = a[i][col] / a[col][col];
        for (let j = col; j < n; j++) a[i][j] -= f * a[col][j];
      }
    }
    return chk(d);
  }
  // reduced row echelon form; with `inverse` it augments the identity and returns the inverse
  function gaussJordan(rows, cols, inverse) {
    const a = rows.map(r => r.slice()), n = a.length, scale = maxAbs(rows);
    let lead = 0;
    for (let r = 0; r < n && lead < cols; r++) {
      let p = r;
      for (let i = r + 1; i < n; i++) if (Math.abs(a[i][lead]) > Math.abs(a[p][lead])) p = i;
      if (Math.abs(a[p][lead]) <= 1e-12 * Math.max(1, scale)) {
        if (inverse) fail('SINGULAR MAT');
        lead++; r--; continue;
      }
      [a[p], a[r]] = [a[r], a[p]];
      const pv = a[r][lead];
      a[r] = a[r].map(x => x / pv);
      for (let i = 0; i < n; i++) {
        if (i === r) continue;
        const f = a[i][lead];
        if (f !== 0) a[i] = a[i].map((x, j) => x - f * a[r][j]);
      }
      lead++;
    }
    return a.map(r => r.map(x => tidy(x, scale)));
  }
  function matInv(m) {
    const n = needSquare(m);
    const aug = m.rows.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    return mat(gaussJordan(aug, n, true).map(r => r.slice(n).map(chk)));
  }
  const matRref = m => mat(gaussJordan(m.rows, m.rows[0].length, false));
  function matPow(m, k) {
    const n = needSquare(m);
    if (!Number.isInteger(k)) fail('DOMAIN');
    let base = k < 0 ? matInv(m) : m, e = Math.abs(k), out = matIdentity(n);
    while (e > 0) { if (e & 1) out = matMul(out, base); base = matMul(base, base); e >>= 1; }
    return out;
  }
  function augment(a, b) {
    if (isList(a) && isList(b)) { if (a.length + b.length > 999) fail('INVALID DIM'); return a.concat(b); }
    if (isMat(a) && isMat(b)) {
      if (a.rows.length !== b.rows.length) fail('DIM MISMATCH');
      return mat(a.rows.map((r, i) => r.concat(b.rows[i])));
    }
    return fail('DATA TYPE');
  }
  function randM(r, c) {
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 1 || c < 1 || r > 99 || c > 99) fail('INVALID DIM');
    return mat(Array.from({ length: r }, () => Array.from({ length: c }, () => Math.floor(Math.random() * 19) - 9)));
  }

  Object.assign(GX, {
    isList, isMat, isNum, num, mat, cloneMat, mdims, matMap, matAdd, matMul, matT,
    matIdentity, matDet, matInv, matRref, matPow, augment, randM,
  });
})(window.GX = window.GX || {});
