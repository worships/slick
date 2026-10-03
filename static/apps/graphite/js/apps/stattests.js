/* Graphite GX — STAT TESTS: hypothesis tests and confidence intervals.
   Each test is a form; Calculate shows the results and stores p, z, t, χ², df,
   lower and upper for VARS ▶ Statistics. */
(function (GX) {
  'use strict';
  const { S, LISTS, MATS, XBAR, fail, isInt, phi, invNorm, tCDF, invT, gammaPQ, Fcdf, oneVar, polyfit, corr, mat, fmtNum, fmtShort, openForm, openResults, showError } = GX;

  const PHAT = '\uE001'; // drawn as p̂
  const DEF = { inpt: 0, mu0: 0, sigma: 1, xbar: 0, sx: 1, n: 1, li: 0, fi: 0, alt: 0, C: 0.95, x: 0, p0: 0.5,
    s1: 1, s2: 1, xbar1: 0, sx1: 1, n1: 1, xbar2: 0, sx2: 1, n2: 1, l1: 0, l2: 1, f1: 0, f2: 0, pooled: 0,
    x1: 0, x2: 0, obs: 0, exp: 1, gobs: 0, gexp: 1, df: 1, xl: 0, yl: 1, fr: 0 };
  const get = k => (S.tst[k] !== undefined ? S.tst[k] : DEF[k]);
  const N = (k, label) => ({ type: 'num', label, get: () => get(k), set: v => { S.tst[k] = v; } });
  const CH = (k, label, opts) => ({ type: 'choice', label, opts, get: () => get(k), set: i => { S.tst[k] = i; } });
  const INPT = CH('inpt', 'Inpt:', ['Data', 'Stats']);
  const LST = (k, label) => CH(k, label, LISTS);
  const FRQ = (k, label) => CH(k, label, ['1', ...LISTS]);
  const ALT = (label, base) => CH('alt', label, ['≠' + base, '<' + base, '>' + base]);
  const POOL = CH('pooled', 'Pooled:', ['No', 'Yes']);
  const CL = N('C', 'C-Level:');
  const SYM = ['≠', '<', '>'];
  const data = () => get('inpt') === 0;
  const L = (k, v) => k + '=' + fmtNum(v);

  function sample(li, fi) {
    let xs = S.lists[li].slice();
    if (fi) {
      const fr = S.lists[fi - 1];
      if (fr.length !== xs.length) fail('DIM MISMATCH');
      const out = [];
      xs.forEach((x, i) => { if (!isInt(fr[i]) || fr[i] < 0) fail('DOMAIN'); for (let k = 0; k < fr[i]; k++) out.push(x); });
      xs = out;
    }
    if (!xs.length) fail('INVALID DIM');
    return oneVar(xs);
  }
  const pz = (z, a) => (a === 0 ? 2 * phi(-Math.abs(z)) : a === 1 ? phi(z) : phi(-z));
  const pt = (t, df, a) => (a === 0 ? 2 * tCDF(-Math.abs(t), df) : a === 1 ? tCDF(t, df) : tCDF(-t, df));
  const level = () => { const c = get('C'); const C = c > 1 ? c / 100 : c; if (!(C > 0 && C < 1)) fail('DOMAIN'); return C; };
  const interval = (lo, hi) => '(' + fmtShort(lo, 11) + ',' + fmtShort(hi, 11) + ')';
  const keep = vals => { S.stat = Object.assign({}, S.stat, vals); };
  function one() { return data() ? sample(get('li'), get('fi')) : { mean: get('xbar'), samp: get('sx'), n: get('n') }; }
  function two() {
    if (data()) return [sample(get('l1'), get('f1')), sample(get('l2'), get('f2'))];
    return [{ mean: get('xbar1'), samp: get('sx1'), n: get('n1') }, { mean: get('xbar2'), samp: get('sx2'), n: get('n2') }];
  }
  function tTwo(a, b) {
    if (get('pooled')) {
      const df = a.n + b.n - 2, sp = Math.sqrt(((a.n - 1) * a.samp ** 2 + (b.n - 1) * b.samp ** 2) / df);
      return { se: sp * Math.sqrt(1 / a.n + 1 / b.n), df, sp };
    }
    const va = a.samp ** 2 / a.n, vb = b.samp ** 2 / b.n;
    return { se: Math.sqrt(va + vb), df: (va + vb) ** 2 / (va * va / (a.n - 1) + vb * vb / (b.n - 1)) };
  }
  const xbarLines = s => [L(XBAR, s.mean), ...(data() && Number.isFinite(s.samp) ? [L('Sx', s.samp)] : []), L('n', s.n)];

  const TESTS = [
    { title: 'Z-Test', fields: () => [INPT, N('mu0', 'μ₀:'), N('sigma', 'σ:'), ...(data() ? [LST('li', 'List:'), FRQ('fi', 'Freq:')] : [N('xbar', XBAR + ':'), N('n', 'n:')]), ALT('μ:', 'μ₀')],
      run() { const s = one(), z = (s.mean - get('mu0')) / (get('sigma') / Math.sqrt(s.n)), p = pz(z, get('alt')); keep({ z, p }); return ['μ' + SYM[get('alt')] + fmtNum(get('mu0')), L('z', z), L('p', p), ...xbarLines(s)]; } },
    { title: 'T-Test', fields: () => [INPT, N('mu0', 'μ₀:'), ...(data() ? [LST('li', 'List:'), FRQ('fi', 'Freq:')] : [N('xbar', XBAR + ':'), N('sx', 'Sx:'), N('n', 'n:')]), ALT('μ:', 'μ₀')],
      run() { const s = one(), df = s.n - 1, t = (s.mean - get('mu0')) / (s.samp / Math.sqrt(s.n)), p = pt(t, df, get('alt')); keep({ t, p, df }); return ['μ' + SYM[get('alt')] + fmtNum(get('mu0')), L('t', t), L('p', p), L('df', df), L(XBAR, s.mean), L('Sx', s.samp), L('n', s.n)]; } },
    { title: '2-SampZTest', fields: () => [INPT, N('s1', 'σ₁:'), N('s2', 'σ₂:'), ...(data() ? [LST('l1', 'List1:'), LST('l2', 'List2:'), FRQ('f1', 'Freq1:'), FRQ('f2', 'Freq2:')] : [N('xbar1', XBAR + '₁:'), N('n1', 'n₁:'), N('xbar2', XBAR + '₂:'), N('n2', 'n₂:')]), ALT('μ₁:', 'μ₂')],
      run() { const [a, b] = two(), z = (a.mean - b.mean) / Math.sqrt(get('s1') ** 2 / a.n + get('s2') ** 2 / b.n), p = pz(z, get('alt')); keep({ z, p }); return ['μ₁' + SYM[get('alt')] + 'μ₂', L('z', z), L('p', p), L(XBAR + '₁', a.mean), L(XBAR + '₂', b.mean), L('n₁', a.n), L('n₂', b.n)]; } },
    { title: '2-SampTTest', fields: () => [INPT, ...(data() ? [LST('l1', 'List1:'), LST('l2', 'List2:'), FRQ('f1', 'Freq1:'), FRQ('f2', 'Freq2:')] : [N('xbar1', XBAR + '₁:'), N('sx1', 'Sx₁:'), N('n1', 'n₁:'), N('xbar2', XBAR + '₂:'), N('sx2', 'Sx₂:'), N('n2', 'n₂:')]), ALT('μ₁:', 'μ₂'), POOL],
      run() { const [a, b] = two(), r = tTwo(a, b), t = (a.mean - b.mean) / r.se, p = pt(t, r.df, get('alt')); keep({ t, p, df: r.df }); return ['μ₁' + SYM[get('alt')] + 'μ₂', L('t', t), L('p', p), L('df', r.df), L(XBAR + '₁', a.mean), L(XBAR + '₂', b.mean), L('Sx₁', a.samp), L('Sx₂', b.samp), L('n₁', a.n), L('n₂', b.n), ...(r.sp ? [L('Sxp', r.sp)] : [])]; } },
    { title: '1-PropZTest', fields: () => [N('p0', 'p₀:'), N('x', 'x:'), N('n', 'n:'), ALT('prop', 'p₀')],
      run() { const p0 = get('p0'), x = get('x'), n = get('n'); if (!(p0 > 0 && p0 < 1) || !(n > 0)) fail('DOMAIN'); const ph = x / n, z = (ph - p0) / Math.sqrt(p0 * (1 - p0) / n), p = pz(z, get('alt')); keep({ z, p }); return ['prop' + SYM[get('alt')] + fmtNum(p0), L('z', z), L('p', p), L(PHAT + '', ph), L('n', n)]; } },
    { title: '2-PropZTest', fields: () => [N('x1', 'x₁:'), N('n1', 'n₁:'), N('x2', 'x₂:'), N('n2', 'n₂:'), ALT('p₁:', 'p₂')],
      run() { const [x1, n1, x2, n2] = ['x1', 'n1', 'x2', 'n2'].map(get), a = x1 / n1, b = x2 / n2, pp = (x1 + x2) / (n1 + n2), z = (a - b) / Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2)), p = pz(z, get('alt')); keep({ z, p }); return ['p₁' + SYM[get('alt')] + 'p₂', L('z', z), L('p', p), L(PHAT + '₁', a), L(PHAT + '₂', b), L(PHAT + '', pp), L('n₁', n1), L('n₂', n2)]; } },
    { title: 'ZInterval', fields: () => [INPT, N('sigma', 'σ:'), ...(data() ? [LST('li', 'List:'), FRQ('fi', 'Freq:')] : [N('xbar', XBAR + ':'), N('n', 'n:')]), CL],
      run() { const s = one(), m = invNorm((1 + level()) / 2) * get('sigma') / Math.sqrt(s.n); keep({ lower: s.mean - m, upper: s.mean + m }); return [interval(s.mean - m, s.mean + m), ...xbarLines(s)]; } },
    { title: 'TInterval', fields: () => [INPT, ...(data() ? [LST('li', 'List:'), FRQ('fi', 'Freq:')] : [N('xbar', XBAR + ':'), N('sx', 'Sx:'), N('n', 'n:')]), CL],
      run() { const s = one(), df = s.n - 1, m = invT((1 + level()) / 2, df) * s.samp / Math.sqrt(s.n); keep({ lower: s.mean - m, upper: s.mean + m, df }); return [interval(s.mean - m, s.mean + m), L(XBAR, s.mean), L('df', df), L('Sx', s.samp), L('n', s.n)]; } },
    { title: '2-SampZInt', fields: () => [INPT, N('s1', 'σ₁:'), N('s2', 'σ₂:'), ...(data() ? [LST('l1', 'List1:'), LST('l2', 'List2:'), FRQ('f1', 'Freq1:'), FRQ('f2', 'Freq2:')] : [N('xbar1', XBAR + '₁:'), N('n1', 'n₁:'), N('xbar2', XBAR + '₂:'), N('n2', 'n₂:')]), CL],
      run() { const [a, b] = two(), d = a.mean - b.mean, m = invNorm((1 + level()) / 2) * Math.sqrt(get('s1') ** 2 / a.n + get('s2') ** 2 / b.n); keep({ lower: d - m, upper: d + m }); return [interval(d - m, d + m), L(XBAR + '₁', a.mean), L(XBAR + '₂', b.mean), L('n₁', a.n), L('n₂', b.n)]; } },
    { title: '2-SampTInt', fields: () => [INPT, ...(data() ? [LST('l1', 'List1:'), LST('l2', 'List2:'), FRQ('f1', 'Freq1:'), FRQ('f2', 'Freq2:')] : [N('xbar1', XBAR + '₁:'), N('sx1', 'Sx₁:'), N('n1', 'n₁:'), N('xbar2', XBAR + '₂:'), N('sx2', 'Sx₂:'), N('n2', 'n₂:')]), CL, POOL],
      run() { const [a, b] = two(), r = tTwo(a, b), d = a.mean - b.mean, m = invT((1 + level()) / 2, r.df) * r.se; keep({ lower: d - m, upper: d + m, df: r.df }); return [interval(d - m, d + m), L('df', r.df), L(XBAR + '₁', a.mean), L(XBAR + '₂', b.mean), L('Sx₁', a.samp), L('Sx₂', b.samp), L('n₁', a.n), L('n₂', b.n)]; } },
    { title: '1-PropZInt', fields: () => [N('x', 'x:'), N('n', 'n:'), CL],
      run() { const ph = get('x') / get('n'), m = invNorm((1 + level()) / 2) * Math.sqrt(ph * (1 - ph) / get('n')); keep({ lower: ph - m, upper: ph + m }); return [interval(ph - m, ph + m), L(PHAT + '', ph), L('n', get('n'))]; } },
    { title: '2-PropZInt', fields: () => [N('x1', 'x₁:'), N('n1', 'n₁:'), N('x2', 'x₂:'), N('n2', 'n₂:'), CL],
      run() { const a = get('x1') / get('n1'), b = get('x2') / get('n2'), d = a - b, m = invNorm((1 + level()) / 2) * Math.sqrt(a * (1 - a) / get('n1') + b * (1 - b) / get('n2')); keep({ lower: d - m, upper: d + m }); return [interval(d - m, d + m), L(PHAT + '₁', a), L(PHAT + '₂', b), L('n₁', get('n1')), L('n₂', get('n2'))]; } },
    { title: 'χ²-Test', fields: () => [CH('obs', 'Observed:', MATS), CH('exp', 'Expected:', MATS), { type: 'text', label: 'Expected is filled in for you' }],
      run() {
        const O = S.mats['ABCDE'[get('obs')]];
        if (!O) fail('UNDEFINED');
        const R = O.rows, rs = R.map(r => r.reduce((s, x) => s + x, 0)), cs = R[0].map((_, j) => R.reduce((s, r) => s + r[j], 0)), tot = rs.reduce((s, x) => s + x, 0);
        if (R.length < 2 || R[0].length < 2 || !(tot > 0)) fail('INVALID DIM');
        const E = R.map((r, i) => r.map((_, j) => rs[i] * cs[j] / tot));
        let x2 = 0;
        R.forEach((r, i) => r.forEach((o, j) => { x2 += (o - E[i][j]) ** 2 / E[i][j]; }));
        const df = (R.length - 1) * (R[0].length - 1), p = gammaPQ(df / 2, x2 / 2)[1];
        S.mats['ABCDE'[get('exp')]] = mat(E);
        keep({ 'χ²': x2, p, df });
        return [L('χ²', x2), L('p', p), L('df', df), 'Expected → ' + MATS[get('exp')]];
      } },
    { title: 'χ²GOF-Test', fields: () => [LST('gobs', 'Observed:'), LST('gexp', 'Expected:'), N('df', 'df:')],
      run() {
        const O = S.lists[get('gobs')], E = S.lists[get('gexp')];
        if (!O.length) fail('INVALID DIM');
        if (O.length !== E.length) fail('DIM MISMATCH');
        let x2 = 0;
        O.forEach((o, i) => { if (!(E[i] > 0)) fail('DOMAIN'); x2 += (o - E[i]) ** 2 / E[i]; });
        const df = get('df'), p = gammaPQ(df / 2, x2 / 2)[1];
        keep({ 'χ²': x2, p, df });
        return [L('χ²', x2), L('p', p), L('df', df)];
      } },
    { title: '2-SampFTest', fields: () => [INPT, ...(data() ? [LST('l1', 'List1:'), LST('l2', 'List2:'), FRQ('f1', 'Freq1:'), FRQ('f2', 'Freq2:')] : [N('sx1', 'Sx₁:'), N('n1', 'n₁:'), N('sx2', 'Sx₂:'), N('n2', 'n₂:')]), ALT('σ₁:', 'σ₂')],
      run() {
        const [a, b] = two(), F = a.samp ** 2 / b.samp ** 2, d1 = a.n - 1, d2 = b.n - 1, cdf = Fcdf(0, F, d1, d2), al = get('alt');
        const p = al === 0 ? 2 * Math.min(cdf, 1 - cdf) : al === 1 ? cdf : 1 - cdf;
        keep({ p });
        return ['σ₁' + SYM[al] + 'σ₂', L('F', F), L('p', p), L('Sx₁', a.samp), L('Sx₂', b.samp), L('n₁', a.n), L('n₂', b.n)];
      } },
    { title: 'LinRegTTest', fields: () => [LST('xl', 'Xlist:'), LST('yl', 'Ylist:'), ALT('β&ρ:', '0')],
      run() {
        const xs = S.lists[get('xl')], ys = S.lists[get('yl')];
        if (xs.length !== ys.length) fail('DIM MISMATCH');
        if (xs.length < 3) fail('STAT');
        const [b, a] = polyfit(xs, ys, 1), r = corr(xs, ys), n = xs.length, df = n - 2;
        let ss = 0;
        xs.forEach((x, i) => { ss += (ys[i] - (a + b * x)) ** 2; });
        const t = r * Math.sqrt(df / (1 - r * r)), p = pt(t, df, get('alt'));
        keep({ t, p, df, a, b, r, 'r²': r * r });
        return ['y=a+bx', 'β' + SYM[get('alt')] + '0 and ρ' + SYM[get('alt')] + '0', L('t', t), L('p', p), L('df', df), L('a', a), L('b', b), L('s', Math.sqrt(ss / df)), L('r²', r * r), L('r', r)];
      } },
  ];
  TESTS.forEach(T => {
    T.spec = {
      title: T.title,
      fields: () => [...T.fields(), { type: 'action', label: 'Calculate', run: () => {
        try { openResults(T.title, T.run(), T.spec); }
        catch (e) { showError(e.type || 'DOMAIN', { screen: 'form' }); }
      } }],
    };
  });

  GX.TESTS = TESTS;
})(window.GX = window.GX || {});
