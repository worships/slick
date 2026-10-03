/* Graphite GX — home screen: the entry line and scrolling history. */
(function (GX) {
  'use strict';
  const {
    S, GEO, TOK, ANS_TRIGGER, str, tyOf, parse, ev, chk, CalcError, isNum, isList, isMat, isC,
    formatValue, valueTokens, SCREENS, showError, drawCol, drawCursor, charOff, tokAt, edIns, edKey, wrapChars,
  } = GX;
  const { COLS, ROWS } = GEO;

  const HS = { sel: null, recall: -1 };
  function selSeq() {
    const s = [];
    for (let j = S.hist.length - 1; j >= 0; j--) s.push({ j, p: 'o' }, { j, p: 'i' });
    return s;
  }
  function pushEntry(t) { S.entries.push(t.slice()); if (S.entries.length > 30) S.entries.shift(); }

  function runEntry() {
    let toks = S.ed.t;
    if (!toks.length) {
      if (!S.entries.length) return;
      toks = S.entries[S.entries.length - 1].slice(); // ENTER on an empty line repeats the last entry
    }
    pushEntry(toks);
    // lines with program commands, ":" or prgm calls run through the program interpreter
    if (toks.some(t => ['ctl', 'colon', 'prgmcall', 'getkey'].includes(tyOf(t)))) { S.ed = { t: [], c: 0 }; GX.VM.runHome(toks); return; }
    try {
      const { node, cmd } = parse(toks);
      const v = ev(node, null);
      if (isNum(v)) chk(v);
      const keep = isNum(v) || isList(v) || isMat(v) || isC(v);
      if (keep) S.ans = v;
      const out = formatValue(v, cmd);
      S.hist.push({ i: toks.slice(), lines: out.lines, r: out.right, v: keep ? v : undefined });
      if (S.hist.length > 60) S.hist.shift();
      S.ed = { t: [], c: 0 };
    } catch (e) {
      if (!(e instanceof CalcError)) { console.error(e); e = new CalcError('SYNTAX', 0); }
      S.ed = { t: [], c: 0 };
      showError(e.type, { screen: 'home', tokens: toks.slice(), pos: e.pos });
    }
  }

  // the lines currently visible on the home screen (programs continue from here)
  function homeLines(entry = S.ed.t) {
    const L = [];
    S.hist.forEach(h => {
      wrapChars(str(h.i.join('')), COLS).forEach(ch => L.push({ ch, r: false }));
      h.lines.forEach(l => L.push({ ch: str(l), r: h.r }));
    });
    wrapChars(str(entry.join('')), COLS).forEach(ch => L.push({ ch, r: false }));
    return L.slice(-ROWS);
  }

  SCREENS.home = {
    draw(c) {
      const L = [];
      const seq = HS.sel !== null ? selSeq() : null;
      const si = seq ? seq[HS.sel] : null;
      S.hist.forEach((h, j) => {
        const sI = !!si && si.j === j && si.p === 'i', sO = !!si && si.j === j && si.p === 'o';
        wrapChars(str(h.i.join('')), COLS).forEach(ch => L.push({ ch, r: false, sel: sI }));
        h.lines.forEach(l => L.push({ ch: str(l), r: h.r, sel: sO }));
      });
      const ec = str(S.ed.t.join(''));
      const eRows = Math.floor(ec.length / COLS) + 1, eStart = L.length;
      for (let r = 0; r < eRows; r++) L.push({ ch: ec.slice(r * COLS, (r + 1) * COLS), r: false });
      let start = Math.max(0, L.length - ROWS);
      if (si) { const first = L.findIndex(l => l.sel); if (first >= 0 && first < start) start = first; }
      for (let r = 0; r < ROWS && start + r < L.length; r++) {
        const l = L[start + r];
        drawCol(c, l.ch, l.r ? Math.max(0, COLS - l.ch.length) : 0, r, { inv: l.sel });
      }
      if (!si) {
        const off = charOff(S.ed.t, S.ed.c);
        drawCursor(c, off % COLS, eStart + Math.floor(off / COLS) - start);
      }
    },
    key(act) {
      const ed = S.ed;
      if (HS.sel !== null) {
        const seq = selSeq();
        if (act === 'up') { HS.sel = Math.min(HS.sel + 1, seq.length - 1); return true; }
        if (act === 'down') { HS.sel--; if (HS.sel < 0) HS.sel = null; return true; }
        if (act === 'enter') {
          const it = seq[HS.sel];
          HS.sel = null;
          if (it) {
            const h = S.hist[it.j];
            const toks = it.p === 'i' ? h.i.slice() : (h.v !== undefined ? valueTokens(h.v) : []);
            toks.forEach(t => { if (TOK[t]) edIns(ed, t); });
          }
          return true;
        }
        HS.sel = null;
        if (act === 'clear') return true;
      }
      if (act.startsWith('ins:')) {
        const tok = act.slice(4);
        if (!TOK[tok]) return true;
        if (!ed.t.length && ANS_TRIGGER.has(tok)) edIns(ed, 'Ans');
        edIns(ed, tok);
        if (tok === '→' && !S.alock) S.alpha = true; // STO→ is usually followed by a letter
        return true;
      }
      switch (act) {
        case 'enter': case 'solve': runEntry(); return true;
        case 'clear': if (ed.t.length) { ed.t = []; ed.c = 0; } else S.hist = []; return true;
        case 'up': {
          const off = charOff(ed.t, ed.c);
          if (off >= COLS) ed.c = tokAt(ed.t, off - COLS);
          else if (S.hist.length) HS.sel = 0;
          return true;
        }
        case 'down': {
          const off = charOff(ed.t, ed.c), tot = charOff(ed.t, ed.t.length);
          if (off + COLS <= tot) ed.c = tokAt(ed.t, off + COLS);
          return true;
        }
        case 'entry': {
          if (!S.entries.length) return true;
          HS.recall = S.lastAct === 'entry' ? HS.recall - 1 : S.entries.length - 1;
          if (HS.recall < 0) HS.recall = S.entries.length - 1;
          const t = S.entries[HS.recall].slice();
          S.ed = { t, c: t.length };
          return true;
        }
      }
      return edKey(ed, act);
    },
  };

  Object.assign(GX, { HS, runEntry, homeLines, pushEntry });
})(window.GX = window.GX || {});
