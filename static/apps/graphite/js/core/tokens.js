/* Graphite GX — token table.
   Every key press inserts one token, and the parser works on token arrays,
   so "sin(" or "L₁" or "Disp " is a single unit for the cursor and DEL. */
(function (GX) {
  'use strict';

  const YN = ['Y₁', 'Y₂', 'Y₃', 'Y₄', 'Y₅', 'Y₆', 'Y₇', 'Y₈', 'Y₉', 'Y₀'];
  const SUBN = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  const sub = n => String(n).split('').map(d => SUBN[d]).join('');
  const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'θ'];
  const WVARS = ['Xmin', 'Xmax', 'Xscl', 'Ymin', 'Ymax', 'Yscl', 'Tmin', 'Tmax', 'Tstep', 'θmin', 'θmax', 'θstep'];
  const LISTS = ['L₁', 'L₂', 'L₃', 'L₄', 'L₅', 'L₆'];
  const MATS = ['[A]', '[B]', '[C]', '[D]', '[E]'];
  const STRS = ['Str1', 'Str2', 'Str3', 'Str4', 'Str5', 'Str6', 'Str7', 'Str8', 'Str9', 'Str0'];
  const XBAR = '\uE000'; // private-use char, drawn as x̄ by the LCD renderer
  const STAT_XY = ['n', XBAR, 'Sx', 'σx', 'ȳ', 'Sy', 'σy', 'minX', 'maxX', 'minY', 'maxY', 'Q₁', 'Med', 'Q₃'];
  const STAT_SUM = ['Σx', 'Σx²', 'Σy', 'Σy²', 'Σxy'];
  const STAT_EQ = ['a', 'b', 'c', 'd', 'r', 'r²', 'R²'];
  const STAT_TEST = ['p', 'z', 't', 'χ²', 'df', 'lower', 'upper'];
  const STATVARS = [...STAT_XY, ...STAT_SUM, ...STAT_EQ, ...STAT_TEST];
  const STATCMDS = ['1-Var Stats ', '2-Var Stats ', 'LinReg(ax+b) ', 'QuadReg ', 'CubicReg ', 'QuartReg ',
    'LinReg(a+bx) ', 'LnReg ', 'ExpReg ', 'PwrReg ', 'ClrList '];
  // program commands, grouped as on the PRGM and DRAW menus
  const CTL = ['If ', 'Then', 'Else', 'For(', 'While ', 'Repeat ', 'End', 'Pause ', 'Lbl ', 'Goto ', 'Menu(', 'Return', 'Stop', 'DelVar ', 'Wait '];
  const IO = ['Input ', 'Prompt ', 'Disp ', 'Output(', 'ClrHome'];
  const DRAW = ['ClrDraw', 'Line(', 'Horizontal ', 'Vertical ', 'DrawF ', 'Shade(', 'Circle(', 'Text(', 'Pt-On(', 'Pt-Off('];
  const FMTCMDS = ['FnOn ', 'FnOff ', 'AxesOn', 'AxesOff', 'GridOn', 'GridOff'];

  const TOK = Object.create(null);
  const def = (t, o) => { TOK[t] = o; };
  [...'0123456789.'].forEach(d => def(d, { t: 'digit' }));
  def('ᴇ', { t: 'ee' });
  def('π', { t: 'const', v: Math.PI });
  def('e', { t: 'const', v: Math.E });
  def('i', { t: 'const', v: { cx: true, re: 0, im: 1 } });
  LETTERS.forEach(l => def(l, { t: 'var' }));
  WVARS.forEach(w => def(w, { t: 'wvar', k: w.toLowerCase() }));
  LISTS.forEach((l, i) => def(l, { t: 'lvar', i }));
  MATS.forEach(m => def(m, { t: 'mvar', k: m[1] }));
  STRS.forEach(s => def(s, { t: 'strvar' }));
  STATVARS.forEach(s => def(s, { t: 'svar' }));
  STATCMDS.forEach(s => def(s, { t: 'statcmd' }));
  [...CTL, ...IO, ...DRAW, ...FMTCMDS].forEach(c => def(c, { t: 'ctl' }));
  def('getKey', { t: 'getkey' });
  def('Ans', { t: 'ans' });
  def('rand', { t: 'rand' });
  YN.forEach((y, i) => def(y, { t: 'yvar', i }));
  ['+', '-', '*', '/', '^', 'ˣ√', ' nPr ', ' nCr ', '=', '≠', '>', '≥', '<', '≤', ' and ', ' or ', ' xor ']
    .forEach(b => def(b, { t: 'bin' }));
  def('⁻', { t: 'neg' });
  ['²', '³', '⁻¹', '!', '°', 'ʳ', 'ᵀ'].forEach(p => def(p, { t: 'post' }));
  def('(', { t: 'lp' }); def(')', { t: 'rp' }); def(',', { t: 'comma' });
  def('{', { t: 'lb' }); def('}', { t: 'rb' }); def('[', { t: 'lsq' }); def(']', { t: 'rsq' });
  def('"', { t: 'quote' }); def(' ', { t: 'space' }); def(':', { t: 'colon' }); def('?', { t: 'qmark' });
  def('→', { t: 'sto' });
  ['▶Frac', '▶Dec', '▶Rect', '▶Polar'].forEach(c => def(c, { t: 'cmd' }));

  // function tokens and their [min, max] argument counts
  const FNS = {
    'sin(': 1, 'cos(': 1, 'tan(': 1, 'sin⁻¹(': 1, 'cos⁻¹(': 1, 'tan⁻¹(': 1,
    'ln(': 1, 'e^(': 1, '10^(': 1, '√(': 1, '³√(': 1, 'abs(': 1, 'iPart(': 1, 'fPart(': 1, 'int(': 1, 'not(': 1,
    'log(': [1, 2], 'logBASE(': 2, 'round(': [1, 2], 'min(': [1, 2], 'max(': [1, 2],
    'lcm(': 2, 'gcd(': 2, 'remainder(': 2, 'randInt(': 2, 'R▶Pr(': 2, 'R▶Pθ(': 2, 'P▶Rx(': 2, 'P▶Ry(': 2,
    'nDeriv(': [3, 4], 'fnInt(': 4, 'fMin(': [4, 5], 'fMax(': [4, 5], 'Σ(': 4, 'seq(': [4, 5],
    'dim(': 1, 'sum(': 1, 'prod(': 1, 'mean(': 1, 'median(': 1, 'stdDev(': 1, 'variance(': 1,
    'cumSum(': 1, 'ΔList(': 1, 'augment(': 2, 'SortA(': 1, 'SortD(': 1,
    'det(': 1, 'identity(': 1, 'rref(': 1, 'randM(': 2,
    'normalpdf(': [1, 3], 'normalcdf(': [2, 4], 'invNorm(': [1, 3], 'tpdf(': 2, 'tcdf(': 3, 'invT(': 2,
    'χ²pdf(': 2, 'χ²cdf(': 3, 'Fpdf(': 3, 'Fcdf(': 4, 'binompdf(': [2, 3], 'binomcdf(': [2, 3],
    'poissonpdf(': 2, 'poissoncdf(': 2, 'geometpdf(': 2, 'geometcdf(': 2,
    'conj(': 1, 'real(': 1, 'imag(': 1, 'angle(': 1,
    'tvm_Pmt(': [0, 6], 'tvm_I%(': [0, 6], 'tvm_PV(': [0, 6], 'tvm_N(': [0, 6], 'tvm_FV(': [0, 6],
    'npv(': [3, 4], 'irr(': [2, 3], 'bal(': [1, 2], 'ΣPrn(': [2, 3], 'ΣInt(': [2, 3], '▶Nom(': 2, '▶Eff(': 2,
  };
  for (const [k, a] of Object.entries(FNS)) {
    def(k, { t: 'fn', min: Array.isArray(a) ? a[0] : a, max: Array.isArray(a) ? a[1] : a });
  }

  // programs get one token each, e.g. "prgmQUAD"
  const PRGM_NAME = /^[A-Zθ][A-Zθ0-9]{0,7}$/;
  function prgmToken(name) {
    const t = 'prgm' + name;
    if (!TOK[t]) def(t, { t: 'prgmcall', name });
    return t;
  }
  // accepts known tokens, registering program-call tokens on the fly
  function isToken(t) {
    if (typeof t !== 'string') return false;
    if (TOK[t]) return true;
    if (t.startsWith('prgm') && PRGM_NAME.test(t.slice(4))) { prgmToken(t.slice(4)); return true; }
    return false;
  }

  // typing one of these on an empty home line inserts "Ans" first
  const ANS_TRIGGER = new Set(['+', '-', '*', '/', '^', 'ˣ√', '²', '³', '⁻¹', '!', '→', ' nPr ', ' nCr ',
    '▶Frac', '▶Dec', '▶Rect', '▶Polar', '=', '≠', '>', '≥', '<', '≤', '°', 'ʳ', 'ᵀ', ' and ', ' or ', ' xor ']);

  const str = s => Array.from(s);
  const tlen = t => Array.from(t).length;
  const tyOf = t => (t === undefined ? null : (TOK[t] ? TOK[t].t : 'bad'));

  Object.assign(GX, {
    TOK, YN, SUBN, sub, LETTERS, WVARS, LISTS, MATS, STRS, XBAR, STAT_XY, STAT_SUM, STAT_EQ, STAT_TEST, STATVARS, STATCMDS,
    CTL, IO, DRAW, FMTCMDS, FNS, PRGM_NAME, prgmToken, isToken, ANS_TRIGGER, str, tlen, tyOf,
  });
})(window.GX = window.GX || {});
