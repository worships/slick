/* Graphite GX — number and value formatting (10 significant digits,
   raised minus sign, no leading zero, ᴇ for powers of ten). */
(function (GX) {
  'use strict';
  const { S, GEO, str, isList, isMat, isNum, isC, cabs, carg, fromRad } = GX;
  const isStr = v => !!(v && v.str === true);
  const { COLS } = GEO;

  const sig = (x, p) => Number(x.toPrecision(p));
  const tiStr = s => s.replace(/^(-?)0\./, '$1.').replace(/-/g, '⁻');
  const expStr = e => 'ᴇ' + (e < 0 ? '⁻' + (-e) : String(e));

  function fmtSci(x, p, fix, eng) {
    const parts = x.toExponential(p - 1).split('e');
    let m = parseFloat(parts[0]), e = parseInt(parts[1], 10);
    if (eng) { const sh = ((e % 3) + 3) % 3; e -= sh; m = sig(m * Math.pow(10, sh), p); }
    return tiStr(fix >= 0 ? m.toFixed(fix) : String(m)) + expStr(e);
  }
  function fmtNum(x, opt) {
    if (!Number.isFinite(x)) return 'ERROR';
    const m = opt && opt.float ? { notation: 'NORMAL', fix: -1 } : S.mode;
    const r = sig(x, 10);
    if (r === 0) return '0';
    const a = Math.abs(r);
    if (m.notation !== 'NORMAL' || a >= 1e10 || a < 1e-3) return fmtSci(r, 10, m.fix, m.notation === 'ENG');
    if (m.fix >= 0) return tiStr(r.toFixed(m.fix));
    return tiStr(String(r));
  }
  // shortest representation that fits in `len` characters
  function fmtShort(x, len) {
    if (!Number.isFinite(x)) return 'ERROR';
    let s = fmtNum(x, { float: true });
    if (s.length <= len) return s;
    const a = Math.abs(x);
    if (a >= 1e-3 && a < 1e10) {
      const intD = a >= 1 ? Math.floor(Math.log10(a)) + 1 : 0;
      for (let p = 9; p >= Math.max(1, intD); p--) {
        s = tiStr(String(sig(x, p)));
        if (s.length <= len && !/e/.test(s)) return s;
      }
    }
    for (let p = 9; p >= 1; p--) { s = fmtSci(x, p, -1, false); if (s.length <= len) return s; }
    return s;
  }
  function toFrac(x) {
    if (Number.isInteger(x)) return null;
    const neg = x < 0, v = Math.abs(x);
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = v;
    for (let n = 0; n < 40; n++) {
      const a = Math.floor(b), h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > 9999) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(v - h1 / k1) < 1e-10 * Math.max(1, v)) return k1 === 1 ? null : (neg ? '⁻' : '') + h1 + '/' + k1;
      const fr = b - a;
      if (fr < 1e-15) break;
      b = 1 / fr;
    }
    return null;
  }

  // complex numbers as a+bi, or r·e^(θi) in polar form
  function fmtC(z, polar, opt) {
    if (!isC(z)) return fmtNum(z, opt);
    if (polar) {
      const r = cabs(z);
      return r === 0 ? '0' : fmtNum(r, opt) + 'e^(' + fmtNum(fromRad(carg(z)), opt) + 'i)';
    }
    const re = sig(z.re, 10), im = sig(z.im, 10);
    let s = re !== 0 ? fmtNum(re, opt) : '';
    if (im !== 0) {
      const mag = Math.abs(im) === 1 ? '' : fmtNum(Math.abs(im), opt);
      s += (im < 0 ? (s ? '-' : '⁻') : (s ? '+' : '')) + mag + 'i';
    }
    return s || '0';
  }

  // tokens that reproduce a value when pasted into an entry line
  const numTokens = v => str(fmtNum(v, { float: true }));
  function valueTokens(v) {
    if (isNum(v)) return numTokens(v);
    if (isC(v)) return str(fmtC(v, false, { float: true }));
    const seq = (arr, open, close) => {
      const t = [open];
      arr.forEach((x, i) => { if (i) t.push(','); t.push(...numTokens(x)); });
      t.push(close);
      return t;
    };
    if (isList(v)) return seq(v, '{', '}');
    if (isMat(v)) return ['[', ...v.rows.flatMap(r => seq(r, '[', ']')), ']'];
    return [];
  }

  function wrapLines(s) {
    const ch = str(s), out = [];
    for (let i = 0; i < ch.length; i += COLS) out.push(ch.slice(i, i + COLS).join(''));
    return out.length ? out : [''];
  }
  function matLines(m, f) {
    const R = m.rows;
    for (let len = 12; len >= 3; len--) {
      const cells = R.map(r => r.map(x => (len === 12 ? f(x) : fmtShort(x, len))));
      const w = cells[0].map((_, j) => Math.max(...cells.map(r => r[j].length)));
      const lines = cells.map((r, i) => (i === 0 ? '[[' : ' [') + r.map((s, j) => s.padStart(w[j])).join(' ') + (i === R.length - 1 ? ']]' : ']'));
      const width = Math.max(...lines.map(l => l.length));
      if (width <= COLS || len === 3) {
        return lines.map(l => {
          const p = l.padEnd(width);
          return p.length > COLS ? p.slice(0, COLS - 1) + '…' : p;
        });
      }
    }
    return [];
  }
  // returns { lines, right } describing how the home screen shows a result
  function formatValue(v, cmd) {
    if (v && v.done) return { lines: ['Done'], right: true };
    if (v && v.text) return { lines: v.lines, right: false };
    if (isStr(v)) return { lines: wrapLines(v.s), right: false };
    const frac = cmd === '▶Frac';
    const polar = cmd === '▶Polar' || (cmd !== '▶Rect' && S.mode.cplx === 'POLAR');
    const f = x => (isC(x) ? fmtC(x, polar) : (frac && toFrac(x)) || fmtNum(x));
    if (isList(v)) {
      const s = '{' + v.map(f).join(' ') + '}';
      return s.length <= COLS ? { lines: [s], right: true } : { lines: wrapLines(s), right: false };
    }
    if (isMat(v)) return { lines: matLines(v, f), right: true };
    const one = f(v);
    return one.length <= COLS ? { lines: [one], right: true } : { lines: wrapLines(one), right: false };
  }

  Object.assign(GX, { isStr, sig, tiStr, fmtSci, fmtNum, fmtShort, fmtC, toFrac, numTokens, valueTokens, formatValue, wrapLines });
})(window.GX = window.GX || {});
