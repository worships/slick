/* Graphite GX — complex numbers, stored as { cx: true, re, im }.
   Results with a negligible imaginary part collapse back to plain numbers. */
(function (GX) {
  'use strict';
  const { fail, chk } = GX;

  const isC = v => !!(v && v.cx === true);
  function mk(re, im) {
    const s = Math.max(Math.abs(re), Math.abs(im));
    if (Math.abs(im) <= 1e-13 * s) return chk(re);
    if (Math.abs(re) <= 1e-13 * s) re = 0;
    return { cx: true, re: chk(re), im: chk(im) };
  }
  const parts = v => (isC(v) ? [v.re, v.im] : [v, 0]);
  const cadd = (a, b) => { const [p, q] = parts(a), [r, s] = parts(b); return mk(p + r, q + s); };
  const csub = (a, b) => { const [p, q] = parts(a), [r, s] = parts(b); return mk(p - r, q - s); };
  const cmul = (a, b) => { const [p, q] = parts(a), [r, s] = parts(b); return mk(p * r - q * s, p * s + q * r); };
  function cdiv(a, b) {
    const [p, q] = parts(a), [r, s] = parts(b), d = r * r + s * s;
    if (d === 0) fail('DIVIDE BY 0');
    return mk((p * r + q * s) / d, (q * r - p * s) / d);
  }
  const cabs = v => { const [p, q] = parts(v); return Math.hypot(p, q); };
  const carg = v => { const [p, q] = parts(v); return Math.atan2(q, p); };
  const cconj = v => { const [p, q] = parts(v); return mk(p, -q); };
  function cexp(v) { const [p, q] = parts(v), m = Math.exp(p); return mk(m * Math.cos(q), m * Math.sin(q)); }
  function cln(v) {
    const r = cabs(v);
    if (r === 0) fail('DOMAIN');
    return mk(Math.log(r), carg(v));
  }
  function csqrt(v) {
    const [x, y] = parts(v), r = Math.hypot(x, y);
    const re = Math.sqrt((r + x) / 2), im = Math.sqrt((r - x) / 2);
    return mk(re, y < 0 ? -im : im);
  }
  function cpow(a, b) {
    const [br, bi] = parts(b);
    if (cabs(a) === 0) { if (br > 0) return 0; fail(br === 0 && bi === 0 ? 'DOMAIN' : 'DIVIDE BY 0'); }
    if (bi === 0 && Number.isInteger(br) && Math.abs(br) <= 64) { // exact repeated multiplication
      let out = 1, base = a, e = Math.abs(br);
      while (e) { if (e & 1) out = cmul(out, base); base = cmul(base, base); e >>= 1; }
      return br < 0 ? cdiv(1, out) : out;
    }
    return cexp(cmul(b, cln(a)));
  }

  Object.assign(GX, { isC, mkC: mk, cadd, csub, cmul, cdiv, cabs, carg, cconj, cexp, cln, csqrt, cpow });
})(window.GX = window.GX || {});
