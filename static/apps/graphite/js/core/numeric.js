/* Graphite GX — numeric routines.
   Arithmetic with calculator-style error rules, calculus helpers,
   probability distributions and statistics. */
(function (GX) {
  'use strict';
  const { S } = GX;

  class CalcError extends Error { constructor(type, pos) { super(type); this.type = type; this.pos = pos; } }
  const fail = (type, pos) => { throw new CalcError(type, pos); };
  const isInt = Number.isInteger;
  const cplxMode = () => S.mode.cplx !== 'REAL';

  function chk(x) {
    if (Number.isNaN(x)) fail('DOMAIN');
    if (!Number.isFinite(x) || Math.abs(x) >= 1e100) fail('OVERFLOW');
    if (Math.abs(x) < 1e-99) return 0;
    return x;
  }
  const near = (a, b) => a === b || Math.abs(a - b) <= 1e-12 * Math.max(Math.abs(a), Math.abs(b));
  // cancels floating-point dust like 0.1+0.2-0.3
  const addsub = (a, b, r) => (Math.abs(r) < 1e-13 * Math.max(Math.abs(a), Math.abs(b)) ? 0 : chk(r));

  /* ---------- elementary functions ---------- */
  const toRad = x => (S.mode.angle === 'DEGREE' ? (x % 360) * Math.PI / 180 : x);
  const fromRad = x => (S.mode.angle === 'DEGREE' ? x * 180 / Math.PI : x);
  const cleanTrig = (r, arg) => (Math.abs(r) < 1e-13 && Math.abs(arg) > 1e-6 ? 0 : r);
  function tsin(x) { if (Math.abs(x) >= 1e12) fail('DOMAIN'); const r = toRad(x); return cleanTrig(Math.sin(r), r); }
  function tcos(x) { if (Math.abs(x) >= 1e12) fail('DOMAIN'); const r = toRad(x); return cleanTrig(Math.cos(r), r); }
  function ttan(x) { const s = tsin(x), c = tcos(x); if (c === 0) fail('DOMAIN'); return chk(s / c); }
  function lnx(x) { if (x < 0) fail('NONREAL ANS'); if (x === 0) fail('DOMAIN'); return Math.log(x); }
  function logb(x, b) { const d = lnx(b); if (d === 0) fail('DIVIDE BY 0'); return chk(lnx(x) / d); }
  function oddDen(b) {
    for (let q = 3; q <= 999; q += 2) { const p = b * q; if (Math.abs(p - Math.round(p)) < 1e-9) return q; }
    return 0;
  }
  function power(a, b) {
    if (a === 0) { if (b > 0) return 0; if (b === 0) fail('DOMAIN'); fail('DIVIDE BY 0'); }
    if (a < 0 && !isInt(b)) {
      const q = oddDen(b); // (-8)^(1/3) = -2, like a real-mode calculator
      if (!q) { if (cplxMode()) return GX.cpow(a, b); fail('NONREAL ANS'); }
      const p = Math.round(b * q), r = Math.pow(-a, b);
      return chk(p % 2 === 0 ? r : -r);
    }
    return chk(Math.pow(a, b));
  }
  function xroot(n, x) {
    if (n === 0) fail('DOMAIN');
    if (x < 0) {
      if (isInt(n) && Math.abs(n) % 2 === 1) return chk(-Math.pow(-x, 1 / n));
      if (!isInt(n)) return power(x, 1 / n);
      if (cplxMode()) return GX.cpow(x, 1 / n);
      fail('NONREAL ANS');
    }
    return power(x, 1 / n);
  }
  function perm(n, r) {
    if (!isInt(n) || !isInt(r) || n < 0 || r < 0) fail('DOMAIN');
    if (r > n) return 0;
    let p = 1;
    for (let k = 0; k < r; k++) { p *= n - k; if (p >= 1e100) fail('OVERFLOW'); }
    return p;
  }
  function combi(n, r) {
    if (!isInt(n) || !isInt(r) || n < 0 || r < 0) fail('DOMAIN');
    if (r > n) return 0;
    r = Math.min(r, n - r);
    let c = 1;
    for (let k = 1; k <= r; k++) { c = c * (n - r + k) / k; if (c >= 1e100) fail('OVERFLOW'); }
    return c < 9e15 ? Math.round(c) : c;
  }
  function fact(x) {
    if (x < -0.5 || Math.abs(x * 2 - Math.round(x * 2)) > 1e-12) fail('DOMAIN');
    if (x > 69) fail('OVERFLOW');
    if (isInt(x)) { let r = 1; for (let k = 2; k <= x; k++) r *= k; return r; }
    const m = Math.round(x + 0.5);
    let r = Math.sqrt(Math.PI);
    for (let k = 1; k <= m; k++) r *= k - 0.5;
    return r;
  }
  function gcd2(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
  function roundTo(x, d) {
    const p = Math.pow(10, d), m = Math.abs(x) * p;
    return Math.sign(x) * Math.round(Number(m.toPrecision(15))) / p;
  }

  /* ---------- calculus ---------- */
  // adaptive Gauss–Kronrod (7/15); never evaluates the endpoints
  const XGK = [0.991455371120812639, 0.949107912342758525, 0.864864423359769073, 0.741531185599394440, 0.586087235467691130, 0.405845151377397167, 0.207784955007898468, 0];
  const WGK = [0.022935322010529225, 0.063092092629978553, 0.104790010322250184, 0.140653259715525919, 0.169004726639267903, 0.190350578064785410, 0.204432940075298892, 0.209482141084727828];
  const WG = [0.129484966168869693, 0.279705391489276668, 0.381830050505118945, 0.417959183673469388];
  function gk15(f, a, b) {
    const c = (a + b) / 2, h = (b - a) / 2, fc = f(c);
    let K = fc * WGK[7], G7 = fc * WG[3];
    for (let j = 0; j < 7; j++) {
      const dx = h * XGK[j], s = f(c - dx) + f(c + dx);
      K += WGK[j] * s;
      if (j % 2 === 1) G7 += WG[(j - 1) / 2] * s;
    }
    return [K * h, Math.abs((K - G7) * h)];
  }
  function integrate(f, a, b) {
    if (a === b) return 0;
    const iv = [[a, b, ...gk15(f, a, b)]];
    let total = 0;
    for (let it = 0; it < 400; it++) {
      let err = 0, worst = 0;
      total = 0;
      iv.forEach((q, k) => { total += q[2]; err += q[3]; if (q[3] > iv[worst][3]) worst = k; });
      if (err <= Math.max(1e-11, 1e-11 * Math.abs(total))) break;
      const [x0, x1] = iv[worst], m = (x0 + x1) / 2;
      iv.splice(worst, 1, [x0, m, ...gk15(f, x0, m)], [m, x1, ...gk15(f, m, x1)]);
    }
    return total;
  }
  function safeVal(f, x) { try { const y = f(x); return Number.isFinite(y) ? y : NaN; } catch (e) { return NaN; } }
  // sign = 1 finds a minimum, -1 a maximum (sampling + golden section)
  function extremum(f, a, b, sign) {
    if (a > b) [a, b] = [b, a];
    const g = x => { const y = safeVal(f, x); return Number.isFinite(y) ? sign * y : Infinity; };
    const N = 240, xs = [];
    let bk = -1, bv = Infinity;
    for (let k = 0; k <= N; k++) {
      const x = a + (b - a) * k / N, v = g(x);
      xs.push(x);
      if (v < bv) { bv = v; bk = k; }
    }
    if (bk < 0) fail('DOMAIN');
    let lo = xs[Math.max(0, bk - 1)], hi = xs[Math.min(N, bk + 1)];
    const gr = (Math.sqrt(5) - 1) / 2;
    let c = hi - gr * (hi - lo), d = lo + gr * (hi - lo), fc = g(c), fd = g(d);
    for (let it = 0; it < 200 && hi - lo > 1e-13 * Math.max(1, Math.abs(lo) + Math.abs(hi)); it++) {
      if (fc < fd) { hi = d; d = c; fd = fc; c = hi - gr * (hi - lo); fc = g(c); }
      else { lo = c; c = d; fc = fd; d = lo + gr * (hi - lo); fd = g(d); }
    }
    const x = (lo + hi) / 2;
    return g(x) <= bv ? x : xs[bk];
  }
  function bisect(f, lo, hi, flo, fhi) {
    for (let it = 0; it < 200; it++) {
      const m = (lo + hi) / 2;
      if (m === lo || m === hi) break;
      const fm = f(m);
      if (!Number.isFinite(fm)) return null;
      if (fm === 0) return m;
      if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
    }
    const r = (lo + hi) / 2, fr = f(r);
    // reject poles, where the sign flips but the value blows up
    if (!Number.isFinite(fr) || Math.abs(fr) > 1e-6 * Math.max(1, Math.abs(flo), Math.abs(fhi))) return null;
    return r;
  }
  function findRoot(f, a, b, guess) {
    if (a > b) [a, b] = [b, a];
    const sf = x => safeVal(f, x);
    const N = 400, xs = [], ys = [], cands = [];
    for (let k = 0; k <= N; k++) { const x = a + (b - a) * k / N; xs.push(x); ys.push(sf(x)); }
    for (let k = 0; k <= N; k++) {
      if (ys[k] === 0) { cands.push(xs[k]); continue; }
      if (k > 0 && Number.isFinite(ys[k - 1]) && Number.isFinite(ys[k]) && ys[k - 1] * ys[k] < 0) {
        const r = bisect(sf, xs[k - 1], xs[k], ys[k - 1], ys[k]);
        if (r !== null) cands.push(r);
      }
    }
    if (!cands.length) { // touching zeros such as x² at 0
      const scale = Math.max(1, Math.abs(ys[0]) || 0, Math.abs(ys[N]) || 0);
      for (let k = 1; k < N; k++) {
        const v = Math.abs(ys[k]);
        if (Number.isFinite(v) && v <= Math.abs(ys[k - 1]) && v <= Math.abs(ys[k + 1])) {
          const xm = extremum(t => Math.abs(f(t)), xs[k - 1], xs[k + 1], 1);
          if (Math.abs(sf(xm)) < 1e-9 * scale) cands.push(xm);
        }
      }
    }
    if (!cands.length) fail('NO SIGN CHNG');
    const gs = guess === undefined ? (a + b) / 2 : guess;
    cands.sort((p, q) => Math.abs(p - gs) - Math.abs(q - gs));
    return cands[0];
  }

  /* ---------- special functions ---------- */
  const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lnGamma(z) {
    if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lnGamma(1 - z);
    z -= 1;
    let x = LZ[0];
    for (let i = 1; i < 9; i++) x += LZ[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  // regularized incomplete gamma: returns [P(a,x), Q(a,x)], each computed without cancellation
  function gammaPQ(a, x) {
    if (x <= 0) return [0, 1];
    const lead = Math.exp(-x + a * Math.log(x) - lnGamma(a));
    if (x < a + 1) {
      let sum = 1 / a, del = sum, ap = a;
      for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; }
      const P = Math.min(1, sum * lead);
      return [P, 1 - P];
    }
    const TINY = 1e-300;
    let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
      c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    const Q = Math.min(1, lead * h);
    return [1 - Q, Q];
  }
  function betacf(a, b, x) {
    const TINY = 1e-300, qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < TINY) d = TINY;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 500; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
      c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
      c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  function betaI(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  // standard normal CDF, accurate far into both tails
  function phi(z) {
    if (z === Infinity) return 1;
    if (z === -Infinity) return 0;
    const q = 0.5 * gammaPQ(0.5, z * z / 2)[1];
    return z < 0 ? q : 1 - q;
  }
  function invNorm(p) {
    if (!(p > 0 && p < 1)) fail('DOMAIN');
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const lowTail = q => (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    let x;
    if (p < 0.02425) x = lowTail(Math.sqrt(-2 * Math.log(p)));
    else if (p <= 0.97575) {
      const q = p - 0.5, r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else x = -lowTail(Math.sqrt(-2 * Math.log(1 - p)));
    for (let k = 0; k < 2; k++) { // Halley refinement
      const e = phi(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
      x -= u / (1 + x * u / 2);
    }
    return x;
  }
  function tCDF(t, v) {
    const tail = 0.5 * betaI(v / 2, 0.5, v / (v + t * t));
    return t > 0 ? 1 - tail : tail;
  }

  /* ---------- distributions (DISTR menu) ---------- */
  const needPos = v => { if (!(v > 0)) fail('DOMAIN'); };
  const normalpdf = (x, m = 0, s = 1) => { needPos(s); const z = (x - m) / s; return Math.exp(-z * z / 2) / (s * Math.sqrt(2 * Math.PI)); };
  const normalcdf = (l, u, m = 0, s = 1) => {
    needPos(s);
    const zl = (l - m) / s, zu = (u - m) / s;
    return zl > 0 ? phi(-zl) - phi(-zu) : phi(zu) - phi(zl);
  };
  const invNormD = (p, m = 0, s = 1) => { needPos(s); return m + s * invNorm(p); };
  const tpdf = (x, v) => { needPos(v); return Math.exp(lnGamma((v + 1) / 2) - lnGamma(v / 2) - 0.5 * Math.log(v * Math.PI) - (v + 1) / 2 * Math.log(1 + x * x / v)); };
  const tcdf = (l, u, v) => { needPos(v); return tCDF(u, v) - tCDF(l, v); };
  function invT(p, v) {
    if (!(p > 0 && p < 1)) fail('DOMAIN');
    needPos(v);
    let lo = -1, hi = 1;
    while (tCDF(lo, v) > p && lo > -1e300) lo *= 2;
    while (tCDF(hi, v) < p && hi < 1e300) hi *= 2;
    for (let i = 0; i < 300; i++) {
      const mid = (lo + hi) / 2;
      if (tCDF(mid, v) < p) lo = mid; else hi = mid;
      if (hi - lo <= 1e-15 * Math.max(1, Math.abs(mid))) break;
    }
    return (lo + hi) / 2;
  }
  function chi2pdf(x, k) {
    needPos(k);
    if (x < 0) return 0;
    if (x === 0) { if (k < 2) fail('DOMAIN'); return k === 2 ? 0.5 : 0; }
    return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - lnGamma(k / 2));
  }
  const chi2cdf = (l, u, k) => { needPos(k); const P = x => (x <= 0 ? 0 : gammaPQ(k / 2, x / 2)[0]); return P(u) - P(l); };
  function Fpdf(x, d1, d2) {
    needPos(d1); needPos(d2);
    if (x <= 0) return 0;
    const lb = lnGamma(d1 / 2) + lnGamma(d2 / 2) - lnGamma((d1 + d2) / 2);
    return Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - lb);
  }
  const Fcdf = (l, u, d1, d2) => {
    needPos(d1); needPos(d2);
    const F = x => (x <= 0 ? 0 : betaI(d1 / 2, d2 / 2, d1 * x / (d1 * x + d2)));
    return F(u) - F(l);
  };
  function binomCheck(n, p) { if (!isInt(n) || n < 0 || !(p >= 0 && p <= 1)) fail('DOMAIN'); }
  function binomPdf(n, p, x) {
    binomCheck(n, p);
    if (!isInt(x)) fail('DOMAIN');
    if (x < 0 || x > n) return 0;
    if (p === 0) return x === 0 ? 1 : 0;
    if (p === 1) return x === n ? 1 : 0;
    const lc = n <= 300 ? Math.log(combi(n, x)) : lnGamma(n + 1) - lnGamma(x + 1) - lnGamma(n - x + 1);
    return Math.exp(lc + x * Math.log(p) + (n - x) * Math.log1p(-p));
  }
  function binomCdf(n, p, x) {
    binomCheck(n, p);
    x = Math.floor(x);
    if (x < 0) return 0;
    if (x >= n) return 1;
    let s = 0;
    for (let k = 0; k <= x; k++) s += binomPdf(n, p, k);
    return Math.min(1, s);
  }
  function poissonPdf(m, x) {
    needPos(m);
    if (!isInt(x)) fail('DOMAIN');
    return x < 0 ? 0 : Math.exp(-m + x * Math.log(m) - lnGamma(x + 1));
  }
  function poissonCdf(m, x) { needPos(m); x = Math.floor(x); return x < 0 ? 0 : gammaPQ(x + 1, m)[1]; }
  function geometPdf(p, x) {
    if (!(p > 0 && p <= 1) || !isInt(x)) fail('DOMAIN');
    return x < 1 ? 0 : p * Math.pow(1 - p, x - 1);
  }
  function geometCdf(p, x) {
    if (!(p > 0 && p <= 1)) fail('DOMAIN');
    x = Math.floor(x);
    return x < 1 ? 0 : 1 - Math.pow(1 - p, x);
  }

  /* ---------- statistics ---------- */
  const sortNum = a => a.slice().sort((p, q) => p - q);
  function median(sorted) {
    const n = sorted.length;
    return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  }
  function oneVar(xs) {
    const n = xs.length, s = sortNum(xs);
    let sum = 0, sumsq = 0;
    xs.forEach(x => { sum += x; sumsq += x * x; });
    const mean = sum / n;
    let ss = 0;
    xs.forEach(x => { ss += (x - mean) * (x - mean); });
    const h = Math.floor(n / 2);
    const lower = s.slice(0, h), upper = s.slice(n - h);
    return {
      n, sum, sumsq, mean, pop: Math.sqrt(ss / n), samp: n > 1 ? Math.sqrt(ss / (n - 1)) : NaN,
      min: s[0], max: s[n - 1], med: median(s),
      q1: lower.length ? median(lower) : s[0], q3: upper.length ? median(upper) : s[n - 1],
    };
  }
  function solveLinear(A, y) {
    const n = y.length, M = A.map((r, i) => [...r, y[i]]);
    for (let col = 0; col < n; col++) {
      let p = col;
      for (let i = col + 1; i < n; i++) if (Math.abs(M[i][col]) > Math.abs(M[p][col])) p = i;
      if (Math.abs(M[p][col]) < 1e-300) fail('SINGULAR MAT');
      [M[p], M[col]] = [M[col], M[p]];
      for (let i = 0; i < n; i++) {
        if (i === col) continue;
        const f = M[i][col] / M[col][col];
        for (let j = col; j <= n; j++) M[i][j] -= f * M[col][j];
      }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  // least-squares polynomial; returns coefficients from highest power down
  function polyfit(xs, ys, deg) {
    if (xs.length !== ys.length) fail('DIM MISMATCH');
    if (xs.length < deg + 1) fail('STAT');
    const k = deg + 1, A = [], v = [];
    for (let i = 0; i < k; i++) {
      A.push([]);
      for (let j = 0; j < k; j++) { let s = 0; xs.forEach(x => { s += Math.pow(x, i + j); }); A[i].push(s); }
      let t = 0;
      xs.forEach((x, m) => { t += ys[m] * Math.pow(x, i); });
      v.push(t);
    }
    let c;
    try { c = solveLinear(A, v); } catch (e) { fail('STAT'); }
    return c.reverse();
  }
  function corr(xs, ys) {
    const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    if (sxx === 0) fail('STAT');
    return syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  }
  function rsq(xs, ys, f) {
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let tot = 0, res = 0;
    ys.forEach((y, i) => { tot += (y - my) * (y - my); res += (y - f(xs[i])) * (y - f(xs[i])); });
    return tot === 0 ? 1 : 1 - res / tot;
  }

  Object.assign(GX, {
    CalcError, fail, isInt, chk, near, addsub, toRad, fromRad, tsin, tcos, ttan, lnx, logb, power, xroot,
    perm, combi, fact, gcd2, roundTo, integrate, safeVal, extremum, findRoot,
    cplxMode, lnGamma, gammaPQ, betaI, phi, invNorm, tCDF,
    normalpdf, normalcdf, invNormD, tpdf, tcdf, invT, chi2pdf, chi2cdf, Fpdf, Fcdf,
    binomCheck, binomPdf, binomCdf, poissonPdf, poissonCdf, geometPdf, geometCdf,
    sortNum, median, oneVar, polyfit, corr, rsq,
  });
})(window.GX = window.GX || {});
