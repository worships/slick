/* Graphite GX — matrix editor for [A]–[E]. Row -1 holds the dimensions. */
(function (GX) {
  'use strict';
  const { S, GEO, str, SCREENS, C, mat, evalTokens, fmtNum, fmtShort, toast, setScreen, rowY, drawCol, drawCell, drawCursor, charOff, edKey } = GX;
  const { W } = GEO;
  const ME = { name: 'A', row: -1, dim: 0, c: 0, top: 0, left: 0, ed: null };
  const M = () => S.mats[ME.name];

  function openMatEditor(name) {
    if (!S.mats[name]) S.mats[name] = mat([[0]]);
    Object.assign(ME, { name, row: -1, dim: 0, c: 0, top: 0, left: 0, ed: null });
    setScreen('matedit');
  }
  function resize(r, c) {
    const old = M().rows;
    S.mats[ME.name] = mat(Array.from({ length: r }, (_, i) => Array.from({ length: c }, (__, j) => (old[i] && old[i][j] !== undefined ? old[i][j] : 0))));
  }
  function commit() {
    if (!ME.ed) return true;
    if (!ME.ed.t.length) { ME.ed = null; return true; }
    let v;
    try { v = evalTokens(ME.ed.t); } catch (e) { toast("That isn't a number"); return false; }
    if (ME.row < 0) {
      if (!Number.isInteger(v) || v < 1 || v > 99) { toast('Size must be a whole number from 1 to 99'); return false; }
      const [r, c] = [M().rows.length, M().rows[0].length];
      if (ME.dim === 0) resize(v, c); else resize(r, v);
    } else M().rows[ME.row][ME.c] = v;
    ME.ed = null;
    return true;
  }
  function clampView() {
    const [r, c] = [M().rows.length, M().rows[0].length];
    ME.row = Math.min(ME.row, r - 1);
    ME.c = Math.max(0, Math.min(ME.c, c - 1));
    if (ME.row >= 0 && ME.row < ME.top) ME.top = ME.row;
    if (ME.row >= ME.top + 8) ME.top = ME.row - 7;
    if (ME.c < ME.left) ME.left = ME.c;
    if (ME.c > ME.left + 2) ME.left = ME.c - 2;
  }

  SCREENS.matedit = {
    leave() { commit(); ME.ed = null; },
    draw(c) {
      const m = M(), R = m.rows.length, K = m.rows[0].length;
      drawCol(c, str('MATRIX[' + ME.name + ']'), 0, 0);
      const dims = [String(R), String(K)];
      if (ME.row < 0 && ME.ed) dims[ME.dim] = ME.ed.t.join('');
      drawCol(c, str(dims[0]), 11, 0, { inv: ME.row < 0 && ME.dim === 0 && !ME.ed });
      drawCol(c, ['×'], 11 + dims[0].length, 0);
      drawCol(c, str(dims[1]), 12 + dims[0].length, 0, { inv: ME.row < 0 && ME.dim === 1 && !ME.ed });
      if (ME.row < 0 && ME.ed) drawCursor(c, (ME.dim === 0 ? 11 : 12 + dims[0].length) + ME.ed.c, 0);
      const cw = W / 3, y1 = rowY(1), y9 = rowY(9);
      c.fillStyle = C.ink;
      c.fillRect(0, y1 - 0.5, W, 1); c.fillRect(0, y9 - 0.5, W, 1);
      c.fillRect(Math.round(cw) - 0.5, y1, 1, y9 - y1); c.fillRect(Math.round(2 * cw) - 0.5, y1, 1, y9 - y1);
      for (let r = 0; r < 8; r++) {
        const i = ME.top + r;
        if (i >= R) break;
        for (let k = 0; k < 3; k++) {
          const j = ME.left + k;
          if (j >= K) break;
          drawCell(c, k, r, fmtShort(m.rows[i][j], 7), ME.row === i && ME.c === j);
        }
      }
      if (ME.row < 0) { drawCol(c, str(ME.dim === 0 ? 'Type rows, then ENTER' : 'Type columns, then ENTER'), 0, 9, { color: C.dim }); return; }
      const lab = str('[' + ME.name + '](' + (ME.row + 1) + ',' + (ME.c + 1) + ')=');
      drawCol(c, lab, 0, 9);
      if (ME.ed) { drawCol(c, str(ME.ed.t.join('')), lab.length, 9); drawCursor(c, lab.length + charOff(ME.ed.t, ME.ed.c), 9); }
      else drawCol(c, str(fmtNum(m.rows[ME.row][ME.c])), lab.length, 9);
    },
    key(act) {
      if (act.startsWith('ins:')) {
        if (!ME.ed) ME.ed = { t: [], c: 0 };
        edKey(ME.ed, act);
        return true;
      }
      const K = M().rows[0].length;
      switch (act) {
        case 'enter':
          if (!commit()) return true;
          if (ME.row < 0) { if (ME.dim === 0) ME.dim = 1; else { ME.row = 0; ME.c = 0; } }
          else if (ME.c < K - 1) ME.c++;
          else if (ME.row < M().rows.length - 1) { ME.row++; ME.c = 0; }
          clampView();
          return true;
        case 'left': case 'right': {
          if (ME.ed && ME.ed.t.length) { edKey(ME.ed, act); return true; }
          if (!commit()) return true;
          const d = act === 'left' ? -1 : 1;
          if (ME.row < 0) ME.dim = Math.max(0, Math.min(1, ME.dim + d));
          else ME.c = Math.max(0, Math.min(K - 1, ME.c + d));
          clampView();
          return true;
        }
        case 'up': if (!commit()) return true; ME.row = Math.max(-1, ME.row - 1); clampView(); return true;
        case 'down': if (!commit()) return true; ME.row = Math.min(M().rows.length - 1, ME.row + 1); clampView(); return true;
        case 'clear': ME.ed = { t: [], c: 0 }; return true;
        case 'del': case 'bksp': if (ME.ed) edKey(ME.ed, act); return true;
      }
      return false;
    },
  };

  Object.assign(GX, { ME, openMatEditor });
})(window.GX = window.GX || {});
