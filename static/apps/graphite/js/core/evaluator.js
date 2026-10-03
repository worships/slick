/* Graphite GX — evaluator.
   Walks the parse tree. Values are numbers, lists or matrices; most
   functions apply element-by-element to lists, like a real calculator. */
(function (GX) {
  'use strict';
  const {
    S, XBAR, fail, isInt, chk, near, addsub, tsin, tcos, ttan, fromRad, lnx, logb, power, xroot,
    perm, combi, fact, gcd2, roundTo, integrate, extremum,
    normalpdf, normalcdf, invNormD, tpdf, tcdf, invT, chi2pdf, chi2cdf, Fpdf, Fcdf,
    binomCheck, binomPdf, binomCdf, poissonPdf, poissonCdf, geometPdf, geometCdf,
    sortNum, median, oneVar, polyfit, corr, rsq,
    isList, isMat, isNum, num, mat, cloneMat, matMap, matAdd, matMul, matT,
    matIdentity, matDet, matInv, matRref, matPow, augment, randM,
    fmtNum, numTokens, yEval, parse,
    isC, mkC, cadd, csub, cmul, cdiv, cabs, carg, cconj, cexp, cln, csqrt, cpow, cplxMode, isStr,
  } = GX;

  const DONE = { done: true };
  const text = lines => ({ text: true, lines });

  /* ---------- operators ---------- */
  function scalarBin(op, a, b) {
    switch (op) {
      case '+': return addsub(a, b, a + b);
      case '-': return addsub(a, b, a - b);
      case '*': return chk(a * b);
      case '/': if (b === 0) fail('DIVIDE BY 0'); return chk(a / b);
      case '^': return power(a, b);
      case 'ˣ√': return xroot(a, b);
      case ' nPr ': return perm(a, b);
      case ' nCr ': return combi(a, b);
      case '=': return near(a, b) ? 1 : 0;
      case '≠': return near(a, b) ? 0 : 1;
      case '>': return a > b && !near(a, b) ? 1 : 0;
      case '≥': return a > b || near(a, b) ? 1 : 0;
      case '<': return a < b && !near(a, b) ? 1 : 0;
      case '≤': return a < b || near(a, b) ? 1 : 0;
      case ' and ': return a !== 0 && b !== 0 ? 1 : 0;
      case ' or ': return a !== 0 || b !== 0 ? 1 : 0;
      case ' xor ': return (a !== 0) !== (b !== 0) ? 1 : 0;
    }
    return fail('SYNTAX');
  }
  function map2(a, b, f) {
    if (isList(a) && isList(b)) {
      if (a.length !== b.length) fail('DIM MISMATCH');
      return a.map((x, i) => f(x, b[i]));
    }
    if (isList(a)) { num(b); return a.map(x => f(x, b)); }
    num(a);
    return b.map(y => f(a, y));
  }
  function matBin(op, a, b) {
    if (isList(a) || isList(b)) fail('DATA TYPE');
    if (isMat(a) && isMat(b)) {
      switch (op) {
        case '+': return matAdd(a, b, 1);
        case '-': return matAdd(a, b, -1);
        case '*': return matMul(a, b);
        case '=': case '≠': {
          const same = a.rows.length === b.rows.length && a.rows[0].length === b.rows[0].length &&
            a.rows.every((r, i) => r.every((x, j) => near(x, b.rows[i][j])));
          return (op === '=') === same ? 1 : 0;
        }
      }
      return fail('DATA TYPE');
    }
    if (isMat(a)) {
      const s = num(b);
      if (op === '*') return matMap(a, x => x * s);
      if (op === '/') { if (s === 0) fail('DIVIDE BY 0'); return matMap(a, x => x / s); }
      if (op === '^') return matPow(a, s);
      return fail('DATA TYPE');
    }
    const s = num(a);
    if (op === '*') return matMap(b, x => x * s);
    return fail('DATA TYPE');
  }
  function cBin(op, a, b) {
    if (isList(a) || isList(b)) fail('DATA TYPE');
    switch (op) {
      case '+': return cadd(a, b);
      case '-': return csub(a, b);
      case '*': return cmul(a, b);
      case '/': return cdiv(a, b);
      case '^': return cpow(a, b);
      case '=': case '≠': {
        const d = cabs(csub(a, b)) <= 1e-12 * Math.max(cabs(a), cabs(b));
        return (op === '=') === d ? 1 : 0;
      }
    }
    return fail('DATA TYPE');
  }
  function strBin(op, a, b) {
    if (!isStr(a) || !isStr(b)) fail('DATA TYPE');
    if (op === '+') return { str: true, s: a.s + b.s };
    if (op === '=') return a.s === b.s ? 1 : 0;
    if (op === '≠') return a.s !== b.s ? 1 : 0;
    return fail('DATA TYPE');
  }
  function binop(op, a, b) {
    if (isStr(a) || isStr(b)) return strBin(op, a, b);
    if (isC(a) || isC(b)) return cBin(op, a, b);
    if (isMat(a) || isMat(b)) return matBin(op, a, b);
    if (isList(a) || isList(b)) return map2(a, b, (x, y) => scalarBin(op, x, y));
    return scalarBin(op, num(a), num(b));
  }
  function postNum(op, a) {
    switch (op) {
      case '²': return chk(a * a);
      case '³': return chk(a * a * a);
      case '⁻¹': if (a === 0) fail('DIVIDE BY 0'); return chk(1 / a);
      case '!': return fact(a);
      case '°': return S.mode.angle === 'RADIAN' ? a * Math.PI / 180 : a;
      case 'ʳ': return S.mode.angle === 'DEGREE' ? a * 180 / Math.PI : a;
    }
    return fail('DATA TYPE');
  }
  function postop(op, a) {
    if (isMat(a)) {
      switch (op) {
        case '²': return matMul(a, a);
        case '³': return matMul(matMul(a, a), a);
        case '⁻¹': return matInv(a);
        case 'ᵀ': return matT(a);
      }
      return fail('DATA TYPE');
    }
    if (isC(a)) {
      if (op === '²') return cmul(a, a);
      if (op === '³') return cmul(cmul(a, a), a);
      if (op === '⁻¹') return cdiv(1, a);
      return fail('DATA TYPE');
    }
    if (isList(a)) return a.map(x => postNum(op, x));
    return postNum(op, num(a));
  }
  const negate = v => (isC(v) ? mkC(-v.re, -v.im) : isMat(v) ? matMap(v, x => -x) : isList(v) ? v.map(x => -x) : -num(v));

  /* ---------- functions ---------- */
  // apply a scalar function, mapping over any list arguments
  function applyScalar(f, args) {
    let len = -1;
    for (const a of args) {
      if (isMat(a)) fail('DATA TYPE');
      if (isList(a)) { if (len >= 0 && a.length !== len) fail('DIM MISMATCH'); len = a.length; }
      else if (a !== undefined && !isNum(a)) fail('DATA TYPE');
    }
    if (len < 0) return f(...args);
    const out = [];
    for (let i = 0; i < len; i++) out.push(f(...args.map(a => (isList(a) ? a[i] : a))));
    return out;
  }
  const inUnit = x => { if (x < -1 || x > 1) fail('DOMAIN'); return x; };
  const needInt = x => { if (!isInt(x)) fail('DOMAIN'); return x; };
  const SCALAR = {
    'sin(': tsin, 'cos(': tcos, 'tan(': ttan,
    'sin⁻¹(': x => fromRad(Math.asin(inUnit(x))),
    'cos⁻¹(': x => fromRad(Math.acos(inUnit(x))),
    'tan⁻¹(': x => fromRad(Math.atan(x)),
    'ln(': x => (x < 0 && cplxMode() ? cln(x) : lnx(x)),
    'log(': (x, b) => (b === undefined ? (x < 0 && cplxMode() ? cdiv(cln(x), Math.LN10) : (lnx(x), Math.log10(x))) : logb(x, b)),
    'logBASE(': (x, b) => logb(x, b),
    'e^(': x => chk(Math.exp(x)),
    '10^(': x => power(10, x),
    '√(': x => { if (x < 0) { if (cplxMode()) return csqrt(x); fail('NONREAL ANS'); } return Math.sqrt(x); },
    'real(': x => x, 'imag(': () => 0, 'conj(': x => x, 'angle(': x => fromRad(x < 0 ? Math.PI : 0),
    '³√(': Math.cbrt,
    'abs(': Math.abs,
    'iPart(': Math.trunc,
    'fPart(': x => Number((x - Math.trunc(x)).toPrecision(13)),
    'int(': Math.floor,
    'not(': x => (x === 0 ? 1 : 0),
    'round(': (x, d = 9) => { if (!isInt(d) || d < 0 || d > 9) fail('DOMAIN'); return roundTo(x, d); },
    'gcd(': (a, b) => { if (!isInt(a) || !isInt(b) || a < 0 || b < 0) fail('DOMAIN'); return gcd2(a, b); },
    'lcm(': (a, b) => {
      if (!isInt(a) || !isInt(b) || a < 0 || b < 0) fail('DOMAIN');
      const g = gcd2(a, b);
      return g === 0 ? 0 : chk(a / g * b);
    },
    'remainder(': (a, b) => { if (b === 0) fail('DIVIDE BY 0'); return addsub(a, b, a % b); },
    'randInt(': (lo, hi) => {
      needInt(lo); needInt(hi);
      if (lo > hi) [lo, hi] = [hi, lo];
      return lo + Math.floor(Math.random() * (hi - lo + 1));
    },
    'R▶Pr(': (x, y) => chk(Math.hypot(x, y)),
    'R▶Pθ(': (x, y) => fromRad(Math.atan2(y, x)),
    'P▶Rx(': (r, t) => chk(r * tcos(t)),
    'P▶Ry(': (r, t) => chk(r * tsin(t)),
    'normalpdf(': normalpdf, 'normalcdf(': normalcdf, 'invNorm(': invNormD,
    'tpdf(': tpdf, 'tcdf(': tcdf, 'invT(': invT,
    'χ²pdf(': chi2pdf, 'χ²cdf(': chi2cdf, 'Fpdf(': Fpdf, 'Fcdf(': Fcdf,
    'poissonpdf(': poissonPdf, 'poissoncdf(': poissonCdf, 'geometpdf(': geometPdf, 'geometcdf(': geometCdf,
  };
  function varFn(nd, b) {
    const vn = nd.args[1];
    if (!vn || vn.k !== 'var') fail('SYNTAX', nd.pos);
    const name = vn.v, body = nd.args[0];
    return x => num(ev(body, Object.assign({}, b, { [name]: x })));
  }
  function listArg(v) { if (!isList(v)) fail('DATA TYPE'); if (!v.length) fail('INVALID DIM'); return v; }
  const listRef = node => { if (!node || node.k !== 'lvar') fail('DATA TYPE'); return node.i; };

  // complex-aware versions used when the single argument is complex
  const COMPLEX = {
    'abs(': cabs, 'angle(': z => fromRad(carg(z)), 'real(': z => z.re, 'imag(': z => z.im, 'conj(': cconj,
    '√(': csqrt, 'ln(': cln, 'log(': z => cdiv(cln(z), Math.LN10), 'e^(': cexp, '10^(': z => cpow(10, z),
  };
  const FIN = { 'tvm_Pmt(': 'PMT', 'tvm_I%(': 'I', 'tvm_PV(': 'PV', 'tvm_N(': 'N', 'tvm_FV(': 'FV' };
  function callFn(nd, b) {
    const A = nd.args, f = nd.f;
    const v = k => ev(A[k], b);
    if (FIN[f]) return GX.finance.tvmFn(FIN[f], A.map((_, k) => num(v(k))));
    if (COMPLEX[f] && A.length === 1) { const x = v(0); if (isC(x)) return COMPLEX[f](x); }
    if (SCALAR[f]) return applyScalar(SCALAR[f], A.map((_, k) => v(k)));
    switch (f) {
      case 'min(': case 'max(': {
        const m = f === 'min(' ? Math.min : Math.max;
        if (A.length === 1) return m(...listArg(v(0)));
        return applyScalar(m, [v(0), v(1)]);
      }
      case 'nDeriv(': {
        const g = varFn(nd, b), x = num(v(2)), h = A.length > 3 ? num(v(3)) : 1e-3;
        if (h === 0) fail('DOMAIN');
        return chk((g(x + h) - g(x - h)) / (2 * h));
      }
      case 'fnInt(': return chk(integrate(varFn(nd, b), num(v(2)), num(v(3))));
      case 'fMin(': case 'fMax(': return extremum(varFn(nd, b), num(v(2)), num(v(3)), f === 'fMin(' ? 1 : -1);
      case 'Σ(': {
        const g = varFn(nd, b), s0 = num(v(2)), s1 = num(v(3));
        if (!isInt(s0) || !isInt(s1)) fail('DOMAIN');
        if (s1 - s0 > 1e6) fail('INVALID');
        let t = 0;
        for (let k = s0; k <= s1; k++) t += g(k);
        return chk(t);
      }
      case 'seq(': {
        const g = varFn(nd, b), s0 = num(v(2)), s1 = num(v(3)), st = A.length > 4 ? num(v(4)) : 1;
        if (st === 0 || (s1 - s0) / st < 0) fail('DOMAIN');
        const cnt = Math.floor((s1 - s0) / st + 1e-9) + 1;
        if (cnt > 999) fail('INVALID DIM');
        return Array.from({ length: cnt }, (_, k) => g(s0 + k * st));
      }
      case 'dim(': {
        if (A[0].k === 'lvar') return S.lists[A[0].i].length;
        const x = v(0);
        if (isList(x)) return x.length;
        if (isMat(x)) return [x.rows.length, x.rows[0].length];
        return fail('DATA TYPE');
      }
      case 'sum(': return chk(listArg(v(0)).reduce((s, x) => s + x, 0));
      case 'prod(': return chk(listArg(v(0)).reduce((s, x) => s * x, 1));
      case 'mean(': { const l = listArg(v(0)); return l.reduce((s, x) => s + x, 0) / l.length; }
      case 'median(': return median(sortNum(listArg(v(0))));
      case 'stdDev(': case 'variance(': {
        const l = listArg(v(0));
        if (l.length < 2) fail('INVALID DIM');
        const sd = oneVar(l).samp;
        return f === 'stdDev(' ? sd : sd * sd;
      }
      case 'cumSum(': { let s = 0; return listArg(v(0)).map(x => (s = chk(s + x))); }
      case 'ΔList(': {
        const l = listArg(v(0));
        if (l.length < 2) fail('INVALID DIM');
        return l.slice(1).map((x, k) => addsub(x, l[k], x - l[k]));
      }
      case 'augment(': return augment(v(0), v(1));
      case 'SortA(': case 'SortD(': {
        const k = listRef(A[0]), s = sortNum(S.lists[k]);
        S.lists[k] = f === 'SortA(' ? s : s.reverse();
        return DONE;
      }
      case 'det(': { const m = v(0); if (!isMat(m)) fail('DATA TYPE'); return matDet(m); }
      case 'identity(': return matIdentity(num(v(0)));
      case 'rref(': { const m = v(0); if (!isMat(m)) fail('DATA TYPE'); return matRref(m); }
      case 'randM(': return randM(num(v(0)), num(v(1)));
      case 'npv(': return GX.finance.npv(num(v(0)), num(v(1)), listArg(v(2)), A[3] ? listArg(v(3)) : null);
      case 'irr(': return GX.finance.irr(num(v(0)), listArg(v(1)), A[2] ? listArg(v(2)) : null);
      case 'bal(': return GX.finance.bal(num(v(0)), A[1] ? num(v(1)) : null);
      case 'ΣPrn(': case 'ΣInt(': {
        const a = num(v(0)), z = num(v(1)), r = A[2] ? num(v(2)) : null;
        const prn = GX.finance.bal(z, r) - GX.finance.bal(a - 1, r);
        return f === 'ΣPrn(' ? prn : (z - a + 1) * S.fin.PMT - prn;
      }
      case '▶Nom(': { const e = num(v(0)), c = num(v(1)); if (!(c > 0)) fail('DOMAIN'); return c * (Math.pow(1 + e / 100, 1 / c) - 1) * 100; }
      case '▶Eff(': { const r = num(v(0)), c = num(v(1)); if (!(c > 0)) fail('DOMAIN'); return (Math.pow(1 + r / (100 * c), c) - 1) * 100; }
      case 'binompdf(': case 'binomcdf(': {
        const n = num(v(0)), p = num(v(1)), pdf = f === 'binompdf(';
        binomCheck(n, p);
        if (A.length === 2) {
          if (n > 998) fail('INVALID DIM');
          let acc = 0;
          return Array.from({ length: n + 1 }, (_, k) => { const q = binomPdf(n, p, k); acc += q; return pdf ? q : Math.min(1, acc); });
        }
        return applyScalar(x => (pdf ? binomPdf(n, p, x) : binomCdf(n, p, x)), [v(2)]);
      }
    }
    return fail('SYNTAX');
  }

  /* ---------- statistics commands ---------- */
  const line = (k, x) => k + '=' + fmtNum(x);
  function getList(node, b, fallback) {
    if (!node) return S.lists[fallback].slice();
    const x = ev(node, b);
    if (!isList(x)) fail('DATA TYPE');
    return x;
  }
  function withFreq(xs, fr) {
    if (!fr) return xs;
    if (fr.length !== xs.length) fail('DIM MISMATCH');
    const out = [];
    xs.forEach((x, i) => { const c = fr[i]; if (!isInt(c) || c < 0) fail('DOMAIN'); for (let k = 0; k < c; k++) out.push(x); });
    return out;
  }
  const nt = numTokens;
  const lnAll = (arr, what) => arr.map(x => { if (!(x > 0)) fail('DOMAIN'); return Math.log(x); });
  const REG = {
    'LinReg(ax+b) ': (x, y) => {
      const [a, b] = polyfit(x, y, 1), r = corr(x, y);
      return { name: 'LinReg', form: 'y=ax+b', c: { a, b, 'r²': r * r, r }, eq: [...nt(a), 'X', '+', ...nt(b)] };
    },
    'QuadReg ': (x, y) => {
      const [a, b, c] = polyfit(x, y, 2);
      return { name: 'QuadReg', form: 'y=ax²+bx+c', c: { a, b, c, 'R²': rsq(x, y, t => (a * t + b) * t + c) }, eq: [...nt(a), 'X', '²', '+', ...nt(b), 'X', '+', ...nt(c)] };
    },
    'CubicReg ': (x, y) => {
      const [a, b, c, d] = polyfit(x, y, 3);
      return { name: 'CubicReg', form: 'y=ax³+bx²+cx+d', c: { a, b, c, d, 'R²': rsq(x, y, t => ((a * t + b) * t + c) * t + d) }, eq: [...nt(a), 'X', '³', '+', ...nt(b), 'X', '²', '+', ...nt(c), 'X', '+', ...nt(d)] };
    },
    'QuartReg ': (x, y) => {
      const [a, b, c, d, e] = polyfit(x, y, 4);
      return { name: 'QuartReg', form: 'y=ax⁴+bx³+…+e', c: { a, b, c, d, e, 'R²': rsq(x, y, t => (((a * t + b) * t + c) * t + d) * t + e) }, eq: [...nt(a), 'X', '^', '4', '+', ...nt(b), 'X', '³', '+', ...nt(c), 'X', '²', '+', ...nt(d), 'X', '+', ...nt(e)] };
    },
    'LinReg(a+bx) ': (x, y) => {
      const [b, a] = polyfit(x, y, 1), r = corr(x, y);
      return { name: 'LinReg', form: 'y=a+bx', c: { a, b, 'r²': r * r, r }, eq: [...nt(a), '+', ...nt(b), 'X'] };
    },
    'LnReg ': (x, y) => {
      const lx = lnAll(x), [b, a] = polyfit(lx, y, 1), r = corr(lx, y);
      return { name: 'LnReg', form: 'y=a+b ln x', c: { a, b, 'r²': r * r, r }, eq: [...nt(a), '+', ...nt(b), 'ln(', 'X', ')'] };
    },
    'ExpReg ': (x, y) => {
      const ly = lnAll(y), [m, k] = polyfit(x, ly, 1), r = corr(x, ly), a = Math.exp(k), b = Math.exp(m);
      return { name: 'ExpReg', form: 'y=a*b^x', c: { a, b, 'r²': r * r, r }, eq: [...nt(a), '*', ...nt(b), '^', 'X'] };
    },
    'PwrReg ': (x, y) => {
      const lx = lnAll(x), ly = lnAll(y), [m, k] = polyfit(lx, ly, 1), r = corr(lx, ly), a = Math.exp(k);
      return { name: 'PwrReg', form: 'y=a*x^b', c: { a, b: m, 'r²': r * r, r }, eq: [...nt(a), '*', 'X', '^', ...nt(m)] };
    },
  };
  function runStat(cmd, args, b) {
    if (cmd === 'ClrList ') {
      if (!args.length) fail('ARGUMENT');
      args.forEach(a => { S.lists[listRef(a)] = []; });
      return DONE;
    }
    if (cmd === '1-Var Stats ') {
      const xs = withFreq(getList(args[0], b, 0), args[1] ? getList(args[1], b) : null);
      if (!xs.length) fail('INVALID DIM');
      const s = oneVar(xs);
      S.stat = { n: s.n, [XBAR]: s.mean, 'Σx': s.sum, 'Σx²': s.sumsq, 'σx': s.pop, minX: s.min, 'Q₁': s.q1, Med: s.med, 'Q₃': s.q3, maxX: s.max };
      if (s.n > 1) S.stat.Sx = s.samp;
      return text(['1-Var Stats', line(XBAR, s.mean), line('Σx', s.sum), line('Σx²', s.sumsq),
        s.n > 1 ? line('Sx', s.samp) : 'Sx=', line('σx', s.pop), line('n', s.n), line('minX', s.min),
        line('Q₁', s.q1), line('Med', s.med), line('Q₃', s.q3), line('maxX', s.max)]);
    }
    const xs = getList(args[0], b, 0), ys = getList(args[1], b, 1);
    if (xs.length !== ys.length) fail('DIM MISMATCH');
    if (!xs.length) fail('INVALID DIM');
    if (cmd === '2-Var Stats ') {
      const sx = oneVar(xs), sy = oneVar(ys);
      let sxy = 0;
      xs.forEach((x, i) => { sxy += x * ys[i]; });
      S.stat = { n: sx.n, [XBAR]: sx.mean, 'Σx': sx.sum, 'Σx²': sx.sumsq, 'σx': sx.pop, 'ȳ': sy.mean, 'Σy': sy.sum,
        'Σy²': sy.sumsq, 'σy': sy.pop, 'Σxy': sxy, minX: sx.min, maxX: sx.max, minY: sy.min, maxY: sy.max };
      if (sx.n > 1) { S.stat.Sx = sx.samp; S.stat.Sy = sy.samp; }
      return text(['2-Var Stats', line(XBAR, sx.mean), line('Σx', sx.sum), line('Σx²', sx.sumsq),
        sx.n > 1 ? line('Sx', sx.samp) : 'Sx=', line('σx', sx.pop), line('ȳ', sy.mean), line('Σy', sy.sum),
        line('Σy²', sy.sumsq), sx.n > 1 ? line('Sy', sy.samp) : 'Sy=', line('σy', sy.pop), line('Σxy', sxy),
        line('n', sx.n), line('minX', sx.min), line('maxX', sx.max), line('minY', sy.min), line('maxY', sy.max)]);
    }
    const fit = REG[cmd];
    if (!fit) fail('SYNTAX');
    const R = fit(xs, ys);
    S.stat = Object.assign({}, R.c, { eq: R.eq });
    const out = [R.name, R.form, ...Object.keys(R.c).map(k => line(k, R.c[k]))];
    if (args[2]) {
      if (args[2].k !== 'yvar') fail('DATA TYPE');
      S.y[args[2].i] = { t: R.eq.slice(), on: true };
      out.push('Stored in ' + GX.YN[args[2].i]);
    }
    return text(out);
  }

  /* ---------- tree walk ---------- */
  function store(t, v, b) {
    switch (t.k) {
      case 'var': if (!isNum(v) && !isC(v)) fail('DATA TYPE'); S.vars[t.v] = v; return;
      case 'strvar': if (!isStr(v)) fail('DATA TYPE'); S.strs[t.v] = v.s; return;
      case 'wvar': S.win[t.v] = num(v); return;
      case 'lvar':
        if (!isList(v)) fail('DATA TYPE');
        if (v.length > 999) fail('INVALID DIM');
        S.lists[t.i] = v.slice();
        return;
      case 'lidx': {
        const L = S.lists[t.i], k = num(ev(t.a, b));
        if (!isInt(k) || k < 1 || k > L.length + 1 || k > 999) fail('INVALID DIM');
        L[k - 1] = num(v);
        return;
      }
      case 'mvar': if (!isMat(v)) fail('DATA TYPE'); S.mats[t.m] = cloneMat(v); return;
      case 'midx': {
        const M = S.mats[t.m];
        if (!M) fail('UNDEFINED');
        const r = num(ev(t.r, b)), c = num(ev(t.c, b));
        if (!isInt(r) || !isInt(c) || r < 1 || c < 1 || r > M.rows.length || c > M.rows[0].length) fail('INVALID DIM');
        M.rows[r - 1][c - 1] = num(v);
        return;
      }
    }
    fail('SYNTAX');
  }
  function ev(n, b) {
    switch (n.k) {
      case 'num': return n.v;
      case 'var': return b && n.v in b ? b[n.v] : S.vars[n.v];
      case 'wvar': return S.win[n.v];
      case 'ans': return S.ans;
      case 'rand': return Math.random();
      case 'neg': return negate(ev(n.e, b));
      case 'bin': return binop(n.op, ev(n.l, b), ev(n.r, b));
      case 'post': return postop(n.op, ev(n.e, b));
      case 'fn': return callFn(n, b);
      case 'yvar': return yEval(n.i, b && 'X' in b ? b.X : S.vars.X);
      case 'ycall': return yEval(n.i, num(ev(n.a, b)));
      case 'list': {
        const out = n.items.map(it => num(ev(it, b)));
        if (out.length > 999) fail('INVALID DIM');
        return out;
      }
      case 'matlit': return mat(n.rows.map(r => r.map(it => num(ev(it, b)))));
      case 'lvar': {
        const L = S.lists[n.i];
        if (!L.length) fail('INVALID DIM');
        return L.slice();
      }
      case 'lidx': {
        const L = S.lists[n.i], k = num(ev(n.a, b));
        if (!isInt(k) || k < 1 || k > L.length) fail('INVALID DIM');
        return L[k - 1];
      }
      case 'mvar': { const M = S.mats[n.m]; if (!M) fail('UNDEFINED'); return cloneMat(M); }
      case 'midx': {
        const M = S.mats[n.m];
        if (!M) fail('UNDEFINED');
        const r = num(ev(n.r, b)), c = num(ev(n.c, b));
        if (!isInt(r) || !isInt(c) || r < 1 || c < 1 || r > M.rows.length || c > M.rows[0].length) fail('INVALID DIM');
        return M.rows[r - 1][c - 1];
      }
      case 'str': return { str: true, s: n.s };
      case 'strvar': { const x = S.strs[n.v]; if (x === undefined) fail('UNDEFINED'); return { str: true, s: x }; }
      case 'getkey': return GX.VM ? GX.VM.takeKey() : 0;
      case 'svar': {
        const x = S.stat[n.v];
        if (typeof x !== 'number') fail('UNDEFINED');
        return x;
      }
      case 'sto': { const x = ev(n.e, b); store(n.tgt, x, b); return x; }
      case 'stat': return runStat(n.cmd, n.args, b);
    }
    return fail('SYNTAX');
  }
  function evalTokens(t) { return chk(num(ev(parse(t).node, null))); }

  Object.assign(GX, { ev, evalTokens, DONE, binop, store });
})(window.GX = window.GX || {});
