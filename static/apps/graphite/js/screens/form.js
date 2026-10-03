/* Graphite GX — input forms and result screens, used by the apps and STAT TESTS.

   openForm(spec) where spec = {
     title, fields: () => [field...], soft?: [{ label, run }] (up to 5, on the Y=…GRAPH keys),
     solve?(field) (ALPHA ENTER), hint?: 'text on the bottom row'
   }
   field types: { type: 'num', label, get, set, mark?() }   — typed number
                { type: 'choice', label, opts, get, set }  — ◀ ▶ picks an option
                { type: 'action', label, run }             — ENTER runs it
                { type: 'text', label }                    — static line
   openResults(title, lines, back, soft?) shows output; ENTER or CLEAR returns to `back`. */
(function (GX) {
  'use strict';
  const { S, GEO, str, SCREENS, C, UI, CalcError, evalTokens, fmtNum, toast, setScreen, drawAt, drawCol, drawCursor, charOff, edKey } = GX;
  const { W, ROWS, CW } = GEO;
  const FS = { spec: null, sel: 0, top: 0, ed: null };
  const SOFT_KEYS = ['go:yeq', 'go:window', 'go:zoom', 'go:trace', 'go:graph'];

  const fieldsOf = () => (FS.spec.results ? [] : FS.spec.fields());
  const selectable = f => f.type !== 'text';
  function openForm(spec, keepSel) {
    FS.spec = spec; FS.ed = null;
    if (!keepSel) {
      FS.top = 0;
      const fs = spec.results ? [] : spec.fields();
      FS.sel = Math.max(0, fs.findIndex(selectable));
    }
    S.screen = 'form';
  }
  function openResults(title, lines, back, soft) { openForm({ results: true, title, lines, back, soft }); }
  const rowsFor = () => ROWS - 1 - (FS.spec.soft || FS.spec.hint ? 1 : 0);

  function commit() {
    if (!FS.ed) return true;
    const f = fieldsOf()[FS.sel];
    if (FS.ed.t.length) {
      try { f.set(evalTokens(FS.ed.t)); }
      catch (e) { toast(f.label.replace(/[:=]$/, '') + ' needs a number'); return false; }
    }
    FS.ed = null;
    return true;
  }
  function move(d) {
    if (!commit()) return;
    const fs = fieldsOf();
    let i = FS.sel;
    do { i += d; } while (i >= 0 && i < fs.length && !selectable(fs[i]));
    if (i >= 0 && i < fs.length) FS.sel = i;
  }

  SCREENS.form = {
    leave() { commit(); FS.ed = null; },
    draw(c) {
      const sp = FS.spec, nRows = rowsFor();
      drawCol(c, str(sp.title), 0, 0);
      if (sp.results) {
        sp.lines.slice(FS.top, FS.top + nRows).forEach((l, k) => drawCol(c, str(l), 0, 1 + k));
        if (sp.lines.length > FS.top + nRows) drawCol(c, ['↓'], 25, nRows);
        if (FS.top > 0) drawCol(c, ['↑'], 25, 1);
      } else {
        const fs = fieldsOf();
        if (FS.sel < FS.top) FS.top = FS.sel;
        if (FS.sel >= FS.top + nRows) FS.top = FS.sel - nRows + 1;
        fs.slice(FS.top, FS.top + nRows).forEach((f, k) => {
          const i = FS.top + k, row = 1 + k, on = i === FS.sel;
          const lab = str(f.label);
          if (f.type === 'action') { drawCol(c, lab, 0, row, { inv: on }); return; }
          if (f.type === 'text') { drawCol(c, lab, 0, row, { color: C.dim }); return; }
          if (f.mark && f.mark()) drawCol(c, ['▪'], 0, row);
          const x0 = f.mark ? 1 : 0;
          drawCol(c, lab, x0, row);
          const vx = x0 + lab.length;
          if (f.type === 'choice') {
            let col = vx;
            f.opts.forEach((o, oi) => {
              const ch = str(o);
              let inv = f.get() === oi;
              if (on && UI.blink && inv) inv = false;
              drawCol(c, ch, col, row, { inv });
              col += ch.length + 1;
            });
            return;
          }
          if (on && FS.ed) {
            drawCol(c, str(FS.ed.t.join('')), vx, row);
            drawCursor(c, vx + charOff(FS.ed.t, FS.ed.c), row);
          } else {
            const val = str(fmtNum(f.get()));
            drawCol(c, val, vx, row);
            if (on) drawCursor(c, vx, row, { block: true, ch: val[0] });
          }
        });
      }
      if (sp.soft) {
        const w = W / 5;
        sp.soft.forEach((k, i) => {
          if (!k) return;
          const ch = str(k.label);
          c.fillStyle = C.ink; c.fillRect(i * w + 2, GX.rowY(9) + 2, w - 4, GEO.RH - 4);
          drawAt(c, ch, i * w + (w - ch.length * CW) / 2, 9, { color: C.lcd });
        });
      } else if (sp.hint) drawCol(c, str(sp.hint), 0, 9, { color: C.dim });
    },
    key(act) {
      const sp = FS.spec;
      const si = SOFT_KEYS.indexOf(act);
      if (si >= 0 && sp.soft) { if (commit() && sp.soft[si]) sp.soft[si].run(); return true; }
      if (sp.results) {
        const nRows = rowsFor();
        if (act === 'up') { FS.top = Math.max(0, FS.top - 1); return true; }
        if (act === 'down') { FS.top = Math.max(0, Math.min(sp.lines.length - nRows, FS.top + 1)); return true; }
        if (act === 'enter' || act === 'clear') { if (sp.back) openForm(sp.back, true); else setScreen('home'); return true; }
        return !act.startsWith('go:') && act !== 'quit';
      }
      const fs = fieldsOf(), f = fs[FS.sel];
      if (!f) return false;
      if (act === 'up' || act === 'down') { move(act === 'up' ? -1 : 1); return true; }
      if (f.type === 'choice' && (act === 'left' || act === 'right')) {
        f.set(Math.max(0, Math.min(f.opts.length - 1, f.get() + (act === 'left' ? -1 : 1))));
        return true;
      }
      if (act === 'solve' && sp.solve) { if (commit()) sp.solve(f); return true; }
      if (act === 'enter' || act === 'solve') {
        if (f.type === 'action') f.run();
        else move(1);
        return true;
      }
      if (f.type === 'num') {
        if (act === 'clear') { FS.ed = { t: [], c: 0 }; return true; }
        if (act.startsWith('ins:') || (FS.ed && ['left', 'right', 'del', 'bksp', 'home', 'end'].includes(act))) {
          if (!FS.ed) FS.ed = { t: [], c: 0 };
          edKey(FS.ed, act);
          return true;
        }
      }
      if (act === 'clear') { if (sp.onClear) sp.onClear(); else setScreen('home'); return true; }
      return act.startsWith('ins:') || ['left', 'right', 'del', 'bksp'].includes(act);
    },
  };

  Object.assign(GX, { FS, openForm, openResults });
})(window.GX = window.GX || {});
