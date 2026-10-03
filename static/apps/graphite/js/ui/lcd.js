/* Graphite GX — LCD rendering helpers.
   Text is drawn on a fixed 26×10 character grid; special glyphs
   (superscripts, subscripts, x̄, ᴇ, ▶) are drawn by hand so every
   browser renders them the same way. */
(function (GX) {
  'use strict';
  const { S, GEO, XBAR, TOK, tlen } = GX;
  const { W, COLS, ROWS, CW, SB, RH } = GEO;

  const FONT = '"JetBrains Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';
  const BIG = `500 17px ${FONT}`, SMALL = `700 11px ${FONT}`, MID = `700 12.5px ${FONT}`, TINY = `700 9.5px ${FONT}`;
  const C = { lcd: '#c5cfb9', lcd2: '#b7c2aa', ink: '#1c2418', dim: '#5f6b59', sb: '#b2bea5', grid: 'rgba(28,36,24,.17)', axis: '#28311f', off: '#8d9884', second: '#b97f0c', alpha: '#2c8a68' };
  const CURVE = ['#2346a8', '#b8322a', '#1d7a3c', '#7b3fae', '#b36400', '#0a7d8a', '#ad2e6c', '#55660f', '#6b4a2e', '#3b4b5b'];
  const PLOTC = ['#1c2418', '#8a3d12', '#1f5677'];
  const UI = { blink: true, live: false, statusOverride: null };

  const rowY = r => SB + 1 + r * RH;
  const SUP = { '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁻': '-', 'ˣ': 'x', 'ʳ': 'r', 'ᵀ': 'T' };
  const SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };

  function glyph(c, ch, cx, cy) {
    if (SUP[ch]) { c.font = SMALL; c.fillText(SUP[ch], cx, cy - 4.5); c.font = BIG; return; }
    if (SUBS[ch]) { c.font = SMALL; c.fillText(SUBS[ch], cx, cy + 4.5); c.font = BIG; return; }
    if (ch === 'ᴇ') { c.font = MID; c.fillText('E', cx, cy + 0.5); c.font = BIG; return; }
    if (ch === XBAR || ch === 'ȳ') {
      c.fillText(ch === XBAR ? 'x' : 'y', cx, cy);
      c.fillRect(cx - 4, cy - 9.5, 8, 1.4);
      return;
    }
    if (ch === '\uE001') { // p̂
      c.fillText('p', cx, cy);
      c.beginPath(); c.moveTo(cx - 3.5, cy - 7); c.lineTo(cx, cy - 10.5); c.lineTo(cx + 3.5, cy - 7);
      c.save(); c.strokeStyle = c.fillStyle; c.lineWidth = 1.3; c.stroke(); c.restore();
      return;
    }
    if (ch === '□') {
      c.save(); c.strokeStyle = c.fillStyle; c.lineWidth = 1.4;
      c.strokeRect(cx - 3.5, cy - 3.5, 7, 7);
      c.restore();
      return;
    }
    if (ch === '▶' || ch === '◀') {
      const d = ch === '▶' ? 1 : -1;
      c.beginPath(); c.moveTo(cx - 3.5 * d, cy - 5); c.lineTo(cx + 3.5 * d, cy); c.lineTo(cx - 3.5 * d, cy + 5); c.closePath(); c.fill();
      return;
    }
    c.fillText(ch, cx, cy);
  }
  // draw an array of characters starting at pixel x on text row `row`
  function drawAt(c, chars, x, row, o = {}) {
    const n = chars.length;
    if (!n) return;
    const y = rowY(row);
    if (o.inv) { c.fillStyle = C.ink; c.fillRect(x, y + 1, n * CW, RH - 2); }
    else if (o.bg) { c.fillStyle = C.lcd; c.fillRect(x - 1, y, n * CW + 2, RH); }
    c.fillStyle = o.inv ? C.lcd : (o.color || C.ink);
    c.font = BIG; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let j = 0; j < n; j++) glyph(c, chars[j], x + (j + 0.5) * CW, y + RH / 2 + 1);
  }
  const drawCol = (c, chars, col, row, o) => drawAt(c, chars.slice(0, Math.max(0, COLS - col)), col * CW, row, o);

  function drawCursor(c, col, row, o = {}) {
    if (!UI.blink || row < 0 || row >= ROWS || col >= COLS) return;
    const x = col * CW, y = rowY(row);
    const mod = S.second ? '↑' : S.alpha ? 'A' : null;
    c.font = BIG; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (mod) {
      c.fillStyle = S.second ? C.second : C.alpha;
      c.fillRect(x + 0.5, y + 1, CW - 1, RH - 2);
      c.fillStyle = '#fff';
      glyph(c, mod, x + CW / 2, y + RH / 2 + 1);
    } else if (o.block) {
      c.fillStyle = C.ink;
      c.fillRect(x + 0.5, y + 1, CW - 1, RH - 2);
      if (o.ch) { c.fillStyle = C.lcd; glyph(c, o.ch, x + CW / 2, y + RH / 2 + 1); }
    } else {
      c.fillStyle = C.ink;
      c.fillRect(x + 1, y + RH - 5, CW - 2, 3);
    }
  }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // free-positioned text for games and overlays
  function say(c, s, x, y, o = {}) {
    c.font = `${o.weight || 700} ${o.size || 12}px ${FONT}`;
    c.textAlign = o.align || 'center';
    c.textBaseline = 'middle';
    c.fillStyle = o.color || C.ink;
    c.fillText(s, x, y);
  }
  function drawStatus(c) {
    c.fillStyle = C.sb; c.fillRect(0, 0, W, SB);
    c.fillStyle = 'rgba(28,36,24,.28)'; c.fillRect(0, SB, W, 1);
    c.font = TINY; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = C.ink;
    let t;
    if (S.toast && Date.now() < S.toast.until) t = S.toast.t;
    else if (UI.statusOverride) t = UI.statusOverride();
    else t = [S.mode.notation, S.mode.fix < 0 ? 'FLOAT' : 'FIX ' + S.mode.fix, S.mode.angle, S.mode.style === 'DOT' ? 'DOT' : ''].join('  ');
    c.fillText(t, 5, SB / 2 + 0.5);
    let x = W - 4;
    const badge = (label, color) => {
      const w = c.measureText(label).width + 8;
      x -= w;
      c.fillStyle = color; rrect(c, x, 3, w, SB - 6, 3); c.fill();
      c.fillStyle = '#fff'; c.fillText(label, x + 4, SB / 2 + 0.5);
      x -= 4;
    };
    if (S.screen === 'game') return;
    if (S.rcl) badge('RCL', C.ink);
    if (S.second) badge('2ND', C.second);
    if (S.alock) badge('A-LOCK', C.alpha); else if (S.alpha) badge('ALPHA', C.alpha);
  }

  /* ---------- line editor helpers (token arrays with a cursor index) ---------- */
  function charOff(t, c) { let o = 0; for (let i = 0; i < c; i++) o += tlen(t[i]); return o; }
  function tokAt(t, off) {
    let o = 0;
    for (let i = 0; i < t.length; i++) { const l = tlen(t[i]); if (o + l > off) return i; o += l; }
    return t.length;
  }
  function edIns(ed, tok) { ed.t.splice(ed.c, 0, tok); ed.c++; }
  function edKey(ed, act) {
    if (act.startsWith('ins:')) { const tk = act.slice(4); if (TOK[tk]) edIns(ed, tk); return true; }
    switch (act) {
      case 'left': if (ed.c > 0) ed.c--; return true;
      case 'right': if (ed.c < ed.t.length) ed.c++; return true;
      case 'home': ed.c = 0; return true;
      case 'end': ed.c = ed.t.length; return true;
      case 'del':
        if (ed.c < ed.t.length) ed.t.splice(ed.c, 1);
        else if (ed.c > 0) { ed.t.splice(ed.c - 1, 1); ed.c--; }
        return true;
      case 'bksp': if (ed.c > 0) { ed.t.splice(ed.c - 1, 1); ed.c--; } return true;
    }
    return false;
  }
  function wrapChars(ch, n) {
    if (!ch.length) return [[]];
    const out = [];
    for (let i = 0; i < ch.length; i += n) out.push(ch.slice(i, i + n));
    return out;
  }

  Object.assign(GX, {
    FONT, BIG, SMALL, MID, TINY, C, CURVE, PLOTC, UI, rowY, glyph, drawAt, drawCol, drawCursor, rrect, say, drawStatus,
    charOff, tokAt, edIns, edKey, wrapChars,
  });
})(window.GX = window.GX || {});
