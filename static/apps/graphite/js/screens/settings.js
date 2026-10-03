/* Graphite GX — settings screens built from two small factories:
   makeFields (numeric fields like WINDOW) and makeOptions (choice rows like MODE). */
(function (GX) {
  'use strict';
  const { S, LISTS, str, SCREENS, C, UI, CalcError, evalTokens, fmtNum, toast, drawCol, drawCursor, charOff, edKey } = GX;

  // fields may be an array or a function returning one (WINDOW changes with graph mode)
  function makeFields(title, fieldsArg, extra) {
    const st = { row: 0, ed: { t: [], c: 0 }, fresh: true };
    const F = () => (typeof fieldsArg === 'function' ? fieldsArg() : fieldsArg);
    let fields = F();
    const load = () => { st.ed = { t: str(fmtNum(fields[st.row].get(), { float: true })), c: 0 }; st.fresh = true; };
    const commit = () => {
      if (st.fresh) return;
      const fd = fields[st.row];
      try {
        const v = evalTokens(st.ed.t);
        if (fd.ok && !fd.ok(v)) throw new CalcError('DOMAIN');
        fd.set(v);
      } catch (e) { toast(fd.label + ' kept its old value: ' + (fd.why || 'enter a number')); }
      load();
    };
    return {
      fresh: () => st.fresh,
      ed: () => st.ed,
      enter() { fields = F(); if (st.row >= fields.length) st.row = 0; load(); },
      leave() { commit(); },
      draw(c) {
        drawCol(c, str(title), 0, 0);
        fields.forEach((fd, r) => {
          const lab = str(' ' + fd.label + '='), row = r + 1;
          drawCol(c, lab, 0, row);
          if (r === st.row) {
            const ch = str(st.ed.t.join(''));
            drawCol(c, ch, lab.length, row);
            if (st.fresh) drawCursor(c, lab.length, row, { block: true, ch: ch[0] });
            else drawCursor(c, lab.length + charOff(st.ed.t, st.ed.c), row);
          } else drawCol(c, str(fmtNum(fd.get(), { float: true })), lab.length, row);
        });
        (extra || []).forEach((t, k) => drawCol(c, str(t), 0, fields.length + 1 + k, { color: C.dim }));
      },
      key(act) {
        if (act === 'up' || act === 'down' || act === 'enter') {
          commit();
          st.row = Math.max(0, Math.min(fields.length - 1, st.row + (act === 'up' ? -1 : 1)));
          load();
          return true;
        }
        if (act === 'clear') { st.ed = { t: [], c: 0 }; st.fresh = false; return true; }
        if (act.startsWith('ins:')) {
          if (st.fresh) { st.ed = { t: [], c: 0 }; st.fresh = false; }
          edKey(st.ed, act);
          return true;
        }
        if (['left', 'right', 'del', 'bksp', 'home', 'end'].includes(act)) { st.fresh = false; edKey(st.ed, act); return true; }
        return false;
      },
    };
  }

  // rows: [{ label?, opts: [...], get() → index, set(index) }]
  function makeOptions(rows, title) {
    const st = { row: 0, col: 0 };
    const top = title ? 1 : 0;
    return {
      enter() { st.row = 0; st.col = rows[0].get(); },
      draw(c) {
        if (title) drawCol(c, str(title), 0, 0);
        rows.forEach((r, ri) => {
          let col = 0;
          if (r.label) { drawCol(c, str(r.label), 0, ri + top); col = str(r.label).length + 1; }
          r.opts.forEach((o, oi) => {
            const ch = str(o);
            let inv = r.get() === oi;
            if (st.row === ri && st.col === oi && UI.blink) inv = !inv;
            drawCol(c, ch, col, ri + top, { inv });
            col += ch.length + 1;
          });
        });
      },
      key(act) {
        const r = rows[st.row];
        switch (act) {
          case 'up': if (st.row > 0) { st.row--; st.col = rows[st.row].get(); } return true;
          case 'down': if (st.row < rows.length - 1) { st.row++; st.col = rows[st.row].get(); } return true;
          case 'left': if (st.col > 0) st.col--; return true;
          case 'right': if (st.col < r.opts.length - 1) st.col++; return true;
          case 'enter': r.set(st.col); return true;
        }
        return false;
      },
    };
  }

  const wf = (label, k, ok, why) => ({ label, get: () => S.win[k], set: v => { S.win[k] = v; if (GX.clearDrawings) GX.clearDrawings(); }, ok, why });
  const XY = [
    wf('Xmin', 'xmin'), wf('Xmax', 'xmax'), wf('Xscl', 'xscl', v => v >= 0, 'must be 0 or more'),
    wf('Ymin', 'ymin'), wf('Ymax', 'ymax'), wf('Yscl', 'yscl', v => v >= 0, 'must be 0 or more'),
  ];
  const STEP_OK = v => v > 0;
  SCREENS.window = makeFields('WINDOW', () => {
    if (S.mode.graph === 'PAR') return [wf('Tmin', 'tmin'), wf('Tmax', 'tmax'), wf('Tstep', 'tstep', STEP_OK, 'must be more than 0'), ...XY];
    if (S.mode.graph === 'POL') return [wf('θmin', 'θmin'), wf('θmax', 'θmax'), wf('θstep', 'θstep', STEP_OK, 'must be more than 0'), ...XY];
    return XY;
  });
  SCREENS.tblset = makeFields('TABLE SETUP', [
    { label: 'TblStart', get: () => S.tbl.start, set: v => { S.tbl.start = v; } },
    { label: 'ΔTbl', get: () => S.tbl.step, set: v => { S.tbl.step = v; }, ok: v => v !== 0, why: "can't be 0" },
  ], ['', ' Indpnt: Auto', ' Depend: Auto']);

  const NOTS = ['NORMAL', 'SCI', 'ENG'], GMODES = ['FUNC', 'PAR', 'POL'], CMODES = ['REAL', 'RECT', 'POLAR'];
  SCREENS.mode = makeOptions([
    { opts: NOTS, get: () => NOTS.indexOf(S.mode.notation), set: i => { S.mode.notation = NOTS[i]; } },
    { opts: ['FLOAT', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], get: () => S.mode.fix + 1, set: i => { S.mode.fix = i - 1; } },
    { opts: ['RADIAN', 'DEGREE'], get: () => (S.mode.angle === 'DEGREE' ? 1 : 0), set: i => { S.mode.angle = i ? 'DEGREE' : 'RADIAN'; } },
    { opts: ['FUNC', 'PAR', 'POL'], get: () => GMODES.indexOf(S.mode.graph), set: i => { S.mode.graph = GMODES[i]; if (GX.resetG) GX.resetG(); if (GX.clearDrawings) GX.clearDrawings(); } },
    { opts: ['CONNECTED', 'DOT'], get: () => (S.mode.style === 'DOT' ? 1 : 0), set: i => { S.mode.style = i ? 'DOT' : 'CONNECTED'; } },
    { opts: ['REAL', 'a+bi', 're^θi'], get: () => CMODES.indexOf(S.mode.cplx), set: i => { S.mode.cplx = CMODES[i]; } },
  ]);
  SCREENS.format = makeOptions([
    { opts: ['CoordOn', 'CoordOff'], get: () => (S.fmt.coord ? 0 : 1), set: i => { S.fmt.coord = !i; } },
    { opts: ['GridOff', 'GridOn'], get: () => (S.fmt.grid ? 1 : 0), set: i => { S.fmt.grid = !!i; } },
    { opts: ['AxesOn', 'AxesOff'], get: () => (S.fmt.axes ? 0 : 1), set: i => { S.fmt.axes = !i; } },
    { opts: ['LabelOff', 'LabelOn'], get: () => (S.fmt.labels ? 1 : 0), set: i => { S.fmt.labels = !!i; } },
  ]);
  [0, 1, 2].forEach(k => {
    const P = () => S.plots[k];
    SCREENS['plot' + k] = makeOptions([
      { opts: ['On', 'Off'], get: () => (P().on ? 0 : 1), set: i => { P().on = !i; } },
      { label: 'Type:', opts: ['Scatter', 'xyLine', 'Histo'], get: () => P().type, set: i => { P().type = i; } },
      { label: 'Xlist:', opts: LISTS, get: () => P().x, set: i => { P().x = i; } },
      { label: 'Ylist:', opts: LISTS, get: () => P().y, set: i => { P().y = i; } },
      { label: 'Mark:', opts: ['□', '+', '·'], get: () => P().mark, set: i => { P().mark = i; } },
    ], 'Plot' + (k + 1));
  });

  Object.assign(GX, { makeFields, makeOptions });
})(window.GX = window.GX || {});
