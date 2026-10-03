/* Graphite GX — program editor (PRGM ▶ EDIT) and the new-program name prompt.
   Each line starts with ":". In the editor, PRGM pastes commands (CTL, I/O, EXEC)
   and 2nd PRGM pastes DRAW commands. Changes save automatically; QUIT leaves. */
(function (GX) {
  'use strict';
  const { S, GEO, TOK, PRGM_NAME, prgmToken, str, SCREENS, C, UI, toast, drawCol, drawCursor, charOff, tokAt } = GX;
  const { ROWS } = GEO;
  const PE = { name: '', ln: 0, c: 0, top: 0 };
  const W = 25; // characters per line after the ":"

  function openEditor(name, line) {
    if (!S.prgms[name]) { toast('No program named ' + name); S.screen = 'home'; return; }
    if (!S.prgms[name].length) S.prgms[name] = [[]];
    Object.assign(PE, { name, ln: Math.max(0, Math.min(line || 0, S.prgms[name].length - 1)), c: 0, top: 0 });
    S.second = false; S.alpha = false; S.alock = false;
    S.screen = 'pedit';
  }
  const lines = () => S.prgms[PE.name];

  SCREENS.pedit = {
    draw(c) {
      const L = lines();
      drawCol(c, str('PROGRAM:' + PE.name), 0, 0, { inv: true });
      const vis = [];
      let cur = 0;
      L.forEach((t, li) => {
        const ch = str(t.join('')), n = Math.floor(ch.length / W) + 1;
        if (li === PE.ln) cur = vis.length + Math.floor(charOff(t, PE.c) / W);
        for (let k = 0; k < n; k++) vis.push({ li, k, ch: ch.slice(k * W, (k + 1) * W) });
      });
      const rows = ROWS - 1;
      if (cur < PE.top) PE.top = cur;
      if (cur >= PE.top + rows) PE.top = cur - rows + 1;
      vis.slice(PE.top, PE.top + rows).forEach((v, r) => {
        if (v.k === 0) drawCol(c, [':'], 0, 1 + r, { color: C.dim });
        drawCol(c, v.ch, 1, 1 + r);
      });
      const off = charOff(L[PE.ln], PE.c);
      drawCursor(c, 1 + off % W, 1 + cur - PE.top);
    },
    key(act) {
      const L = lines(), t = L[PE.ln];
      if (act.startsWith('ins:')) {
        const tk = act.slice(4);
        if (!TOK[tk]) return true;
        t.splice(PE.c++, 0, tk);
        return true;
      }
      switch (act) {
        case 'left': if (PE.c > 0) PE.c--; else if (PE.ln > 0) { PE.ln--; PE.c = L[PE.ln].length; } return true;
        case 'right': if (PE.c < t.length) PE.c++; else if (PE.ln < L.length - 1) { PE.ln++; PE.c = 0; } return true;
        case 'home': PE.c = 0; return true;
        case 'end': PE.c = t.length; return true;
        case 'up': {
          const off = charOff(t, PE.c);
          if (off >= W) PE.c = tokAt(t, off - W);
          else if (PE.ln > 0) { PE.ln--; PE.c = Math.min(L[PE.ln].length, tokAt(L[PE.ln], off)); }
          return true;
        }
        case 'down': {
          const off = charOff(t, PE.c), tot = charOff(t, t.length);
          if (off + W <= tot) PE.c = tokAt(t, off + W);
          else if (PE.ln < L.length - 1) { PE.ln++; PE.c = Math.min(L[PE.ln].length, tokAt(L[PE.ln], off % W)); }
          return true;
        }
        case 'enter': L.splice(PE.ln + 1, 0, t.splice(PE.c)); PE.ln++; PE.c = 0; return true;
        case 'del':
          if (PE.c < t.length) t.splice(PE.c, 1);
          else if (!t.length && L.length > 1) { L.splice(PE.ln, 1); PE.ln = Math.min(PE.ln, L.length - 1); PE.c = 0; }
          else if (PE.ln < L.length - 1) { t.push(...L[PE.ln + 1]); L.splice(PE.ln + 1, 1); }
          return true;
        case 'bksp':
          if (PE.c > 0) t.splice(--PE.c, 1);
          else if (PE.ln > 0) { const p = L[PE.ln - 1], n = p.length; p.push(...t); L.splice(PE.ln, 1); PE.ln--; PE.c = n; }
          return true;
        case 'clear': t.length = 0; PE.c = 0; return true;
      }
      return false;
    },
  };

  /* ---------- PRGM ▶ NEW: name prompt (ALPHA lock is turned on for you) ---------- */
  const NP = { t: [] };
  SCREENS.pnew = {
    enter() { NP.t = []; S.alpha = true; S.alock = true; },
    leave() { S.alpha = false; S.alock = false; },
    draw(c) {
      drawCol(c, str('PROGRAM'), 0, 0);
      drawCol(c, str('Name='), 0, 1);
      drawCol(c, NP.t, 5, 1);
      drawCursor(c, 5 + NP.t.length, 1);
      drawCol(c, str('Up to 8 letters or digits,'), 0, 3, { color: C.dim });
      drawCol(c, str('starting with a letter.'), 0, 4, { color: C.dim });
      drawCol(c, str('ALPHA switches to digits.'), 0, 5, { color: C.dim });
    },
    key(act) {
      if (act.startsWith('ins:')) {
        const ch = act.slice(4);
        const ok = /^[A-Zθ]$/.test(ch) || (/^[0-9]$/.test(ch) && NP.t.length > 0);
        if (ok && NP.t.length < 8) NP.t.push(ch);
        else if (!ok) toast('Names use letters and digits only');
        return true;
      }
      if (act === 'del' || act === 'bksp' || act === 'left') { NP.t.pop(); return true; }
      if (act === 'clear') { NP.t = []; return true; }
      if (act === 'enter') {
        const name = NP.t.join('');
        if (!PRGM_NAME.test(name)) { toast('Type a name first'); return true; }
        if (S.prgms[name]) toast('prgm' + name + ' already exists, opening it');
        else { S.prgms[name] = [[]]; prgmToken(name); }
        S.alpha = false; S.alock = false;
        openEditor(name, 0);
        return true;
      }
      return ['up', 'down', 'right'].includes(act);
    },
  };

  Object.assign(GX, { PE, openEditor });
})(window.GX = window.GX || {});
