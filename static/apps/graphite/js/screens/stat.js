/* Graphite GX — list editor for L₁–L₆ (STAT → 1:Edit…).
   Row -1 is the list name; the row after the last element appends. */
(function (GX) {
  'use strict';
  const { S, LISTS, str, SCREENS, evalTokens, fmtNum, fmtShort, toast, setScreen, drawGrid, drawCell, drawCol, drawCursor, charOff, edKey } = GX;
  const LE = { col: 0, left: 0, row: 0, top: 0, ed: null };

  function openListEditor() { LE.ed = null; setScreen('listedit'); }
  function commit() {
    if (!LE.ed) return true;
    const L = S.lists[LE.col];
    if (!LE.ed.t.length) { LE.ed = null; return true; }
    try {
      const v = evalTokens(LE.ed.t);
      if (LE.row >= 999) { toast('Lists hold up to 999 numbers'); return false; }
      L[LE.row] = v;
      LE.ed = null;
      return true;
    } catch (e) {
      toast("That isn't a number: " + (e.type || 'error').toLowerCase());
      return false;
    }
  }
  function moveCol(d) {
    if (!commit()) return;
    LE.col = Math.max(0, Math.min(5, LE.col + d));
    if (LE.col < LE.left) LE.left = LE.col;
    if (LE.col > LE.left + 2) LE.left = LE.col - 2;
    LE.row = Math.min(LE.row, S.lists[LE.col].length);
  }
  function moveRow(d) {
    if (!commit()) return;
    LE.row = Math.max(-1, Math.min(S.lists[LE.col].length, LE.row + d));
    if (LE.row >= 0 && LE.row < LE.top) LE.top = LE.row;
    if (LE.row >= LE.top + 8) LE.top = LE.row - 7;
  }

  SCREENS.listedit = {
    enter() { LE.ed = null; LE.row = Math.min(LE.row, S.lists[LE.col].length); },
    leave() { commit(); LE.ed = null; },
    draw(c) {
      drawGrid(c, [0, 1, 2].map(k => ({ text: LISTS[LE.left + k], inv: LE.row < 0 && LE.col === LE.left + k })));
      for (let r = 0; r < 8; r++) {
        const idx = LE.top + r;
        [0, 1, 2].forEach(k => {
          const li = LE.left + k, L = S.lists[li];
          const sel = LE.row === idx && LE.col === li;
          if (idx < L.length) drawCell(c, k, r, fmtShort(L[idx], 7), sel);
          else if (sel) drawCell(c, k, r, '', true);
        });
      }
      const L = S.lists[LE.col], name = LISTS[LE.col];
      if (LE.row < 0) {
        const s = name + '={' + L.map(x => fmtNum(x, { float: true })).join(',') + '}';
        const ch = str(s);
        drawCol(c, ch.length > 26 ? ch.slice(0, 25).concat('…') : ch, 0, 9);
        return;
      }
      const lab = str(name + '(' + (LE.row + 1) + ')=');
      drawCol(c, lab, 0, 9);
      if (LE.ed) {
        drawCol(c, str(LE.ed.t.join('')), lab.length, 9);
        drawCursor(c, lab.length + charOff(LE.ed.t, LE.ed.c), 9);
      } else if (LE.row < L.length) drawCol(c, str(fmtNum(L[LE.row])), lab.length, 9);
    },
    key(act) {
      const L = S.lists[LE.col];
      if (act.startsWith('ins:')) {
        if (LE.row < 0) { toast('Move down to a cell to type a value'); return true; }
        if (!LE.ed) LE.ed = { t: [], c: 0 };
        edKey(LE.ed, act);
        return true;
      }
      switch (act) {
        case 'up': moveRow(-1); return true;
        case 'down': moveRow(1); return true;
        case 'left': case 'right':
          if (LE.ed && LE.ed.t.length) { edKey(LE.ed, act); return true; }
          moveCol(act === 'left' ? -1 : 1);
          return true;
        case 'enter':
          if (LE.row < 0) { moveRow(1); return true; }
          if (commit()) moveRow(1);
          return true;
        case 'del':
          if (LE.ed) { edKey(LE.ed, act); return true; }
          if (LE.row >= 0 && LE.row < L.length) L.splice(LE.row, 1);
          return true;
        case 'bksp': if (LE.ed) edKey(LE.ed, act); return true;
        case 'clear':
          if (LE.row < 0) { S.lists[LE.col] = []; toast(LISTS[LE.col] + ' cleared'); }
          else LE.ed = { t: [], c: 0 };
          return true;
      }
      return false;
    },
  };

  Object.assign(GX, { LE, openListEditor });
})(window.GX = window.GX || {});
