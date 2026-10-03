/* Graphite GX — TABLE: X values with the active Y= functions beside them. */
(function (GX) {
  'use strict';
  const { S, GEO, YN, sub, str, SCREENS, C, CURVE, rowY, drawAt, drawCol, sig, fmtNum, fmtShort, yEval, activeFns, astOf, evalAt } = GX;
  const { W, CW, RH } = GEO;
  const TS = { top: 0, sel: 0, col: 0, fc: 0 };
  const tblX = k => sig(S.tbl.start + k * S.tbl.step, 12);

  // shared by TABLE, the list editor and the matrix editor
  function drawGrid(c, headers) {
    const cw = W / 3, y0 = rowY(0), y1 = rowY(1), y9 = rowY(9);
    c.fillStyle = 'rgba(28,36,24,.1)'; c.fillRect(0, y0, W, RH);
    c.fillStyle = C.ink;
    c.fillRect(0, y1 - 0.5, W, 1); c.fillRect(0, y9 - 0.5, W, 1);
    c.fillRect(Math.round(cw) - 0.5, y0, 1, y9 - y0); c.fillRect(Math.round(2 * cw) - 0.5, y0, 1, y9 - y0);
    headers.forEach((h, k) => {
      if (!h) return;
      const ch = str(h.text);
      if (h.inv) { c.fillStyle = C.ink; c.fillRect(k * cw + 1.5, y0 + 1, cw - 3, RH - 2); }
      drawAt(c, ch, k * cw + (cw - ch.length * CW) / 2, 0, { color: h.inv ? C.lcd : (h.color || C.ink) });
    });
  }
  function drawCell(c, k, r, txt, sel) {
    const cw = W / 3;
    if (sel) { c.fillStyle = C.ink; c.fillRect(k * cw + 1.5, rowY(r + 1) + 1, cw - 3, RH - 2); }
    const ch = str(txt);
    drawAt(c, ch, (k + 1) * cw - 4 - ch.length * CW, r + 1, sel ? { color: C.lcd } : {});
  }

  // dependent columns for the current graph mode
  function columns() {
    const m = S.mode.graph, out = [];
    const ok = toks => { try { return !!astOf(toks); } catch (e) { return false; } };
    if (m === 'FUNC') return activeFns().map(i => ({ head: YN[i], color: CURVE[i], fn: x => yEval(i, x) }));
    if (m === 'PAR') {
      S.par.forEach((p, i) => {
        if (!p.on || !ok(p.x) || !ok(p.y)) return;
        out.push({ head: 'X' + sub(i + 1) + 'T', color: CURVE[i], fn: t => evalAt(astOf(p.x), 'T', t) });
        out.push({ head: 'Y' + sub(i + 1) + 'T', color: CURVE[i], fn: t => evalAt(astOf(p.y), 'T', t) });
      });
    } else S.pol.forEach((p, i) => { if (p.on && ok(p.t)) out.push({ head: 'r' + sub(i + 1), color: CURVE[i], fn: t => evalAt(astOf(p.t), 'θ', t) }); });
    return out;
  }
  const indep = () => ({ FUNC: 'X', PAR: 'T', POL: 'θ' })[S.mode.graph];

  SCREENS.table = {
    enter() { TS.top = 0; TS.sel = 0; TS.col = 0; TS.fc = 0; },
    draw(c) {
      const defs = columns(), iv = indep();
      TS.fc = Math.max(0, Math.min(TS.fc, defs.length - 2));
      const cols = [null, defs[TS.fc], defs[TS.fc + 1]];
      if (TS.col > 0 && !cols[TS.col]) TS.col = defs.length ? Math.min(TS.col, defs.length) : 0;
      drawGrid(c, cols.map((d, k) => (k === 0 ? { text: iv } : d ? { text: d.head, color: d.color } : null)));
      let detail = '';
      for (let r = 0; r < 8; r++) {
        const x = tblX(TS.top + r);
        cols.forEach((d, k) => {
          if (k > 0 && !d) return;
          let txt, full;
          if (k === 0) { txt = fmtShort(x, 7); full = iv + '=' + fmtNum(x); }
          else {
            let v;
            try { v = d.fn(x); } catch (e) { v = NaN; }
            const ok = typeof v === 'number' && Number.isFinite(v);
            txt = ok ? fmtShort(v, 7) : 'ERROR';
            full = d.head + '=' + (ok ? fmtNum(v) : 'ERROR');
          }
          const sel = r === TS.sel && k === TS.col;
          if (sel) detail = full;
          drawCell(c, k, r, txt, sel);
        });
      }
      drawCol(c, str(detail), 0, 9);
    },
    key(act) {
      const fns = columns(), maxCol = Math.min(2, fns.length);
      switch (act) {
        case 'up': if (TS.sel > 0) TS.sel--; else TS.top--; return true;
        case 'down': if (TS.sel < 7) TS.sel++; else TS.top++; return true;
        case 'left': if (TS.col === 1 && TS.fc > 0) TS.fc--; else if (TS.col > 0) TS.col--; return true;
        case 'right': if (TS.col === 2 && TS.fc + 2 < fns.length) TS.fc++; else if (TS.col < maxCol) TS.col++; return true;
        case 'enter': case 'del': case 'bksp': return true;
      }
      return false;
    },
  };

  Object.assign(GX, { TS, drawGrid, drawCell });
})(window.GX = window.GX || {});
