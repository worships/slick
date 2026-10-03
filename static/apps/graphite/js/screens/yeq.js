/* Graphite GX — Y= editor for function, parametric and polar modes.
   Row -1 is the Plot1/Plot2/Plot3 header. */
(function (GX) {
  'use strict';
  const { S, GEO, TOK, YN, sub, str, SCREENS, CURVE, UI, rowY, drawCol, drawCursor, charOff, tokAt, edKey } = GX;
  const { ROWS, COLS, CW, RH } = GEO;
  const YS = { row: 0, c: 0, top: 0, pc: 0 };

  // one entry per editable line for the current graph mode
  function yRows() {
    const m = S.mode.graph, out = [];
    if (m === 'PAR') {
      S.par.forEach((p, i) => {
        out.push({ label: 'X' + sub(i + 1) + 'T', toks: p.x, obj: p, color: CURVE[i], swatch: true });
        out.push({ label: 'Y' + sub(i + 1) + 'T', toks: p.y, obj: p, color: CURVE[i], swatch: false });
      });
    } else if (m === 'POL') {
      S.pol.forEach((p, i) => out.push({ label: 'r' + sub(i + 1), toks: p.t, obj: p, color: CURVE[i], swatch: true }));
    } else {
      S.y.forEach((f, i) => out.push({ label: YN[i], toks: f.t, obj: f, color: CURVE[i], swatch: true }));
    }
    out.forEach(r => { r.eq = 1 + str(r.label).length; r.x0 = r.eq + 1; r.w = COLS - r.x0; });
    return out;
  }

  SCREENS.yeq = {
    leave() { if (GX.clearDrawings) GX.clearDrawings(); },
    enter() {
      const rows = yRows();
      if (YS.row >= rows.length) { YS.row = 0; YS.c = 0; }
      if (YS.row >= 0 && YS.c > rows[YS.row].toks.length) YS.c = rows[YS.row].toks.length;
    },
    draw(c) {
      const rows = yRows();
      if (YS.row >= rows.length) YS.row = 0;
      const lines = [{ hdr: true }], start = [];
      rows.forEach((r, i) => {
        start[i] = lines.length;
        const n = Math.floor(str(r.toks.join('')).length / r.w) + 1;
        for (let k = 0; k < n; k++) lines.push({ i, k });
      });
      let cur = 0, off = 0;
      if (YS.row >= 0) {
        const r = rows[YS.row];
        if (YS.c > r.toks.length) YS.c = r.toks.length;
        off = YS.c < 0 ? 0 : charOff(r.toks, YS.c);
        cur = start[YS.row] + Math.floor(off / r.w);
      }
      if (cur < YS.top) YS.top = cur;
      if (cur >= YS.top + ROWS) YS.top = cur - ROWS + 1;
      for (let line = 0; line < ROWS; line++) {
        const L = lines[YS.top + line];
        if (!L) break;
        if (L.hdr) {
          [0, 1, 2].forEach(k => {
            let inv = S.plots[k].on;
            if (YS.row < 0 && YS.pc === k && UI.blink) inv = !inv;
            drawCol(c, str('Plot' + (k + 1)), 1 + k * 6, line, { inv });
          });
          continue;
        }
        const r = rows[L.i];
        if (L.k === 0) {
          if (r.swatch) { c.fillStyle = r.color; c.fillRect(3, rowY(line) + RH / 2 - 1.5, CW - 5, 4); }
          drawCol(c, str(r.label), 1, line);
          drawCol(c, ['='], r.eq, line, { inv: r.obj.on });
        }
        drawCol(c, str(r.toks.join('')).slice(L.k * r.w, (L.k + 1) * r.w), r.x0, line);
      }
      if (YS.row < 0) return;
      const r = rows[YS.row], cr = cur - YS.top;
      if (YS.c < 0) { if (UI.blink) drawCol(c, ['='], r.eq, cr, { inv: !r.obj.on }); }
      else drawCursor(c, r.x0 + off % r.w, cr);
    },
    key(act) {
      const rows = yRows();
      if (YS.row < 0) {
        switch (act) {
          case 'left': YS.pc = Math.max(0, YS.pc - 1); return true;
          case 'right': YS.pc = Math.min(2, YS.pc + 1); return true;
          case 'enter': S.plots[YS.pc].on = !S.plots[YS.pc].on; return true;
          case 'down': YS.row = 0; YS.c = rows[0].toks.length; return true;
          case 'up': case 'clear': case 'del': case 'bksp': return true;
        }
        if (!act.startsWith('ins:')) return false;
        YS.row = 0; YS.c = rows[0].toks.length;
      }
      const r = rows[YS.row], t = r.toks;
      if (YS.c > t.length) YS.c = t.length;
      if (act.startsWith('ins:')) {
        const tk = act.slice(4);
        if (!TOK[tk]) return true;
        if (YS.c < 0) YS.c = 0;
        t.splice(YS.c, 0, tk);
        YS.c++;
        return true;
      }
      const goRow = d => {
        const nr = YS.row + d;
        if (nr < 0) { YS.row = -1; return; }
        if (nr >= rows.length) return;
        YS.row = nr;
        YS.c = YS.c < 0 ? -1 : rows[nr].toks.length;
      };
      switch (act) {
        case 'up': {
          if (YS.c >= 0) { const off = charOff(t, YS.c); if (off >= r.w) { YS.c = tokAt(t, off - r.w); return true; } }
          goRow(-1);
          return true;
        }
        case 'down': {
          if (YS.c >= 0) {
            const off = charOff(t, YS.c), tot = charOff(t, t.length);
            if (off + r.w <= tot) { YS.c = tokAt(t, off + r.w); return true; }
          }
          goRow(1);
          return true;
        }
        case 'left': if (YS.c > -1) YS.c--; return true;
        case 'right': if (YS.c < t.length) YS.c++; return true;
        case 'home': YS.c = 0; return true;
        case 'end': YS.c = t.length; return true;
        case 'enter':
          if (YS.c < 0) r.obj.on = !r.obj.on;
          else if (YS.row < rows.length - 1) { YS.row++; YS.c = rows[YS.row].toks.length; }
          return true;
        case 'clear': t.length = 0; YS.c = 0; return true;
        case 'del': case 'bksp': {
          if (YS.c < 0) return true;
          const ed = { t, c: YS.c };
          edKey(ed, act);
          YS.c = ed.c;
          return true;
        }
      }
      return false;
    },
  };

  Object.assign(GX, { YS, yRows });
})(window.GX = window.GX || {});
