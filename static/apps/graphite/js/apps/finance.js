/* Graphite GX — Finance app: the TVM Solver plus npv, irr, bal, ΣPrn, ΣInt.
   Sign convention: money you receive is positive, money you pay is negative. */
(function (GX) {
  'use strict';
  const { S, fail, chk, findRoot, toast, showError, openForm } = GX;

  // interest rate per payment period
  function rate(v) {
    if (!(v.PY > 0) || !(v.CY > 0)) fail('DOMAIN');
    const x = v.I / (100 * v.CY);
    if (x <= -1) fail('DOMAIN');
    return Math.exp((v.CY / v.PY) * Math.log(1 + x)) - 1;
  }
  // 0 = PV + (1+ik)·PMT·(1−(1+i)^−N)/i + FV·(1+i)^−N
  function residual(v) {
    const i = rate(v), k = v.begin ? 1 : 0;
    if (Math.abs(i) < 1e-15) return v.PV + v.PMT * v.N + v.FV;
    const g = Math.pow(1 + i, -v.N);
    return v.PV + (1 + i * k) * v.PMT * (1 - g) / i + v.FV * g;
  }
  function solve(which, v) {
    const i = rate(v), k = v.begin ? 1 : 0, zero = Math.abs(i) < 1e-15;
    const g = zero ? 1 : Math.pow(1 + i, -v.N), ann = zero ? v.N : (1 + i * k) * (1 - g) / i;
    switch (which) {
      case 'PV': return chk(-(v.PMT * ann + v.FV * g));
      case 'FV': return chk(-(v.PV + v.PMT * ann) / g);
      case 'PMT': if (ann === 0) fail('DIVIDE BY 0'); return chk(-(v.PV + v.FV * g) / ann);
      case 'N': {
        if (zero) { if (v.PMT === 0) fail('DIVIDE BY 0'); return chk(-(v.PV + v.FV) / v.PMT); }
        const A = (1 + i * k) * v.PMT / i, den = v.FV - A;
        if (den === 0) fail('DIVIDE BY 0');
        const ratio = -(v.PV + A) / den;
        if (!(ratio > 0)) fail('NO SIGN CHNG');
        return chk(-Math.log(ratio) / Math.log(1 + i));
      }
      case 'I': {
        const f = I => residual({ ...v, I });
        for (const [a, b] of [[-0.0001, 100], [-99.99, 0], [100, 10000]]) {
          try { return findRoot(f, a, b, v.I); } catch (e) { /* try the next range */ }
        }
        return fail('NO SIGN CHNG');
      }
    }
    return fail('SYNTAX');
  }
  // tvm_ functions take optional arguments in calculator order
  const ORDER = { PMT: ['N', 'I', 'PV', 'FV', 'PY', 'CY'], I: ['N', 'PV', 'PMT', 'FV', 'PY', 'CY'], PV: ['N', 'I', 'PMT', 'FV', 'PY', 'CY'], N: ['I', 'PV', 'PMT', 'FV', 'PY', 'CY'], FV: ['N', 'I', 'PV', 'PMT', 'PY', 'CY'] };
  function tvmFn(which, args) {
    const v = { ...S.fin };
    args.forEach((a, k) => { v[ORDER[which][k]] = a; });
    return solve(which, v);
  }
  function expandCF(list, freq) {
    if (!freq) return list;
    if (freq.length !== list.length) fail('DIM MISMATCH');
    const out = [];
    list.forEach((c, j) => { for (let k = 0; k < freq[j]; k++) out.push(c); });
    return out;
  }
  function npv(r, cf0, list, freq) {
    const cfs = expandCF(list, freq), i = r / 100;
    if (i <= -1) fail('DOMAIN');
    return chk(cfs.reduce((s, c, t) => s + c / Math.pow(1 + i, t + 1), cf0));
  }
  function irr(cf0, list, freq) {
    const f = r => npv(r, cf0, list, freq);
    for (const [a, b] of [[-99.99, 100], [100, 10000]]) {
      try { return findRoot(f, a, b, 10); } catch (e) { /* next range */ }
    }
    return fail('NO SIGN CHNG');
  }
  function bal(n, digits) {
    const v = S.fin, i = rate(v);
    let b = v.PV;
    const round = x => (digits === null || digits === undefined ? x : Math.round(x * Math.pow(10, digits)) / Math.pow(10, digits));
    for (let k = 0; k < Math.round(n); k++) b = round(b + (v.begin ? (b + v.PMT) * i : b * i) + v.PMT);
    return chk(b);
  }

  /* ---------- TVM Solver screen ---------- */
  let solved = null;
  const field = (label, key) => ({
    type: 'num', label, key, mark: () => solved === key,
    get: () => S.fin[key],
    set: v => { S.fin[key] = v; if (key === 'PY') S.fin.CY = v; solved = solved === key ? null : solved; },
  });
  const TVM = {
    title: 'TVM Solver',
    hint: 'ALPHA ENTER solves',
    fields: () => [field('N=', 'N'), field('I%=', 'I'), field('PV=', 'PV'), field('PMT=', 'PMT'), field('FV=', 'FV'),
      field('P/Y=', 'PY'), field('C/Y=', 'CY'),
      { type: 'choice', label: 'PMT:', opts: ['END', 'BEGIN'], get: () => (S.fin.begin ? 1 : 0), set: i => { S.fin.begin = !!i; } }],
    solve(f) {
      if (!['N', 'I', 'PV', 'PMT', 'FV'].includes(f.key)) { toast('Solve works on N, I%, PV, PMT or FV'); return; }
      try { S.fin[f.key] = solve(f.key, S.fin); solved = f.key; }
      catch (e) { showError(e.type || 'DOMAIN', { screen: 'form' }); }
    },
  };
  const openTVM = () => openForm(TVM);

  GX.finance = { rate, solve, tvmFn, npv, irr, bal };
  GX.openTVM = openTVM;
})(window.GX = window.GX || {});
