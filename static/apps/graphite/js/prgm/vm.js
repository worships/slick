/* Graphite GX — program interpreter (a TI-BASIC–style language).

   Programs are lists of token lines; ":" separates statements on a line.
   Supported: If/Then/Else/End, For(, While, Repeat, Lbl/Goto, Menu(, Pause, Wait,
   Stop, Return, prgm calls, DelVar, Input, Prompt, Disp, Output(, ClrHome, getKey,
   the DRAW commands, FnOn/FnOff, AxesOn/Off, GridOn/Off, and any expression or →store.

   The interpreter runs in small time slices so the page stays responsive;
   Input, Prompt, Pause, Menu( and Wait suspend it until the user responds. */
(function (GX) {
  'use strict';
  const {
    S, GEO, TOK, str, parse, ev, store, num, isInt, isNum, isStr, isList, isMat, isC, formatValue,
    CalcError, fail, showError, UI, SCREENS, C, drawCol, drawCursor, charOff, edKey, toast,
  } = GX;
  const { COLS, ROWS } = GEO;

  // getKey codes: row × 10 + column, counting keys from the top left
  const KEYCODES = {
    yeq: 11, window: 12, zoom: 13, trace: 14, graph: 15, '2nd': 21, mode: 22, del: 23, left: 24, up: 25, right: 26,
    alpha: 31, xt: 32, stat: 33, down: 34, math: 41, apps: 42, prgm: 43, vars: 44, clear: 45,
    inv: 51, sin: 52, cos: 53, tan: 54, pow: 55, sq: 61, comma: 62, lp: 63, rp: 64, div: 65,
    log: 71, 7: 72, 8: 73, 9: 74, mul: 75, ln: 81, 4: 82, 5: 83, 6: 84, sub: 85,
    sto: 91, 1: 92, 2: 93, 3: 94, add: 95, 0: 102, dot: 103, neg: 104, enter: 105,
  };
  const VM = { running: false, done: false, code: null, pc: 0, frames: [], wait: null, key: 0, buf: [], row: 0,
    view: 'home', log: [], entry: [], name: '', lastExpr: false, lastVal: null, timer: 0 };

  /* ---------- the program's home screen ---------- */
  const blank = () => new Array(COLS).fill(' ');
  const padLeft = s => ' '.repeat(Math.max(0, COLS - str(s).length)) + s;
  function clearBuf() { VM.buf = Array.from({ length: ROWS }, blank); VM.row = 0; }
  function scroll() { VM.buf.shift(); VM.buf.push(blank()); VM.row = ROWS - 1; }
  function putLine(text, right) {
    let ch = str(text);
    if (right && ch.length < COLS) ch = str(padLeft(text));
    for (let i = 0; i < Math.max(1, ch.length); i += COLS) {
      if (VM.row >= ROWS) scroll();
      const seg = ch.slice(i, i + COLS), line = blank();
      seg.forEach((c, k) => { line[k] = c; });
      VM.buf[VM.row++] = line;
      VM.log.push(seg.join('').replace(/\s+$/, ''));
      if (VM.log.length > 60) VM.log.shift();
    }
    VM.view = 'home';
  }
  function dispValue(v) {
    if (v && v.done) return;
    if (isStr(v)) { putLine(v.s, false); return; }
    const f = formatValue(v);
    f.lines.forEach(l => putLine(l, f.right));
  }
  function output(r, c, v) {
    const text = isStr(v) ? v.s : formatValue(v).lines[0];
    if (!isInt(r) || !isInt(c) || r < 1 || r > ROWS || c < 1 || c > COLS) fail('DOMAIN');
    let row = r - 1, col = c - 1;
    for (const ch of str(text)) {
      if (col >= COLS) { col = 0; row++; }
      if (row >= ROWS) break;
      VM.buf[row][col++] = ch;
    }
    VM.view = 'home';
  }
  function showGraph() { VM.view = 'graph'; if (GX.resetG) GX.resetG(); }

  /* ---------- compiling: split statements and match blocks ---------- */
  function splitStatements(line) {
    const out = [[]];
    let q = false;
    for (const t of line) {
      if (t === '"') q = !q;
      if (t === ':' && !q) out.push([]);
      else out[out.length - 1].push(t);
    }
    return out;
  }
  const BLOCK = { 'If ': 'if', 'Then': 'then', 'Else': 'else', 'For(': 'for', 'While ': 'while', 'Repeat ': 'repeat', 'End': 'end', 'Lbl ': 'lbl' };
  function compile(lines, prog) {
    const code = [];
    lines.forEach((line, ln) => splitStatements(line).forEach(t => {
      if (t.length) code.push({ t, kind: BLOCK[t[0]] || 'stmt', line: ln, prog });
    }));
    const stack = [];
    code.labels = {};
    code.forEach((st, i) => {
      if (st.kind === 'if' && code[i + 1] && code[i + 1].kind === 'then') stack.push(i);
      else if (st.kind === 'for' || st.kind === 'while' || st.kind === 'repeat') stack.push(i);
      else if (st.kind === 'else') {
        const top = stack[stack.length - 1];
        if (top !== undefined && code[top].kind === 'if') { code[top].elseIdx = i; st.open = top; }
      } else if (st.kind === 'end') {
        const top = stack.pop();
        if (top !== undefined) {
          st.open = top;
          code[top].endIdx = i;
          if (code[top].elseIdx !== undefined) code[code[top].elseIdx].endIdx = i;
        }
      } else if (st.kind === 'lbl') code.labels[st.t.slice(1).join('')] = i;
    });
    return code;
  }
  // splits command arguments on top-level commas (used by Menu()
  function splitTop(t) {
    const out = [[]];
    let depth = 0, q = false;
    for (const tok of t) {
      if (tok === '"') q = !q;
      if (!q) {
        if (tok === ',' && depth === 0) { out.push([]); continue; }
        if (tok.endsWith('(') || tok === '{' || tok === '[') depth++;
        else if (tok === ')' || tok === '}' || tok === ']') depth--;
      }
      out[out.length - 1].push(tok);
    }
    if (depth < 0) { const last = out[out.length - 1]; if (last[last.length - 1] === ')') last.pop(); }
    return out;
  }

  /* ---------- running ---------- */
  const truth = v => num(v) !== 0;
  const after = idx => (idx !== undefined ? idx + 1 : VM.code.length);
  const evn = n => ev(n, null);
  function exec(st) {
    const t = st.t, h = t[0], rest = t.slice(1);
    const P = () => (st.p || (st.p = parse(rest).node));
    const A = () => (st.p || (st.p = parse(rest, 'args').args));
    VM.lastExpr = false;
    switch (st.kind) {
      case 'if': {
        const c = truth(evn(P()));
        if (VM.code[VM.pc + 1] && VM.code[VM.pc + 1].kind === 'then') VM.pc = c ? VM.pc + 2 : after(st.elseIdx !== undefined ? st.elseIdx : st.endIdx);
        else VM.pc += c ? 1 : 2;
        return;
      }
      case 'then': case 'lbl': VM.pc++; return;
      case 'else': VM.pc = after(st.endIdx); return;
      case 'end': {
        if (st.open === undefined) fail('SYNTAX');
        const op = VM.code[st.open];
        if (op.kind === 'while') { VM.pc = st.open; return; }
        if (op.kind === 'repeat') { VM.pc = truth(evn(op.p)) ? VM.pc + 1 : st.open + 1; return; }
        if (op.kind === 'for') {
          const L = op.loop, v = num(S.vars[L.v]) + L.step;
          S.vars[L.v] = v;
          VM.pc = (L.step > 0 ? v <= L.end + 1e-12 : v >= L.end - 1e-12) ? st.open + 1 : VM.pc + 1;
          return;
        }
        VM.pc++;
        return;
      }
      case 'for': {
        const a = A();
        if (a.length < 3 || a.length > 4 || a[0].k !== 'var') fail('SYNTAX');
        const start = num(evn(a[1])), end = num(evn(a[2])), step = a[3] ? num(evn(a[3])) : 1;
        if (step === 0) fail('DOMAIN');
        S.vars[a[0].v] = start;
        st.loop = { v: a[0].v, end, step };
        VM.pc = (step > 0 ? start <= end : start >= end) ? VM.pc + 1 : after(st.endIdx);
        return;
      }
      case 'while': VM.pc = truth(evn(P())) ? VM.pc + 1 : after(st.endIdx); return;
      case 'repeat': P(); VM.pc++; return;
    }
    if (TOK[h] && TOK[h].t === 'prgmcall') { if (rest.length) fail('SYNTAX'); callProgram(TOK[h].name); return; }
    if (TOK[h] && TOK[h].t === 'ctl') { command(h, rest, st, P, A); return; }
    const pr = st.p || (st.p = parse(t));
    const v = evn(pr.node);
    if (isNum(v) || isC(v) || isList(v) || isMat(v)) S.ans = v;
    if (v && v.text) v.lines.forEach(l => putLine(l, false));
    else { VM.lastVal = { v, cmd: pr.cmd }; VM.lastExpr = pr.node.k !== 'sto' && !(v && v.done); }
    VM.pc++;
  }
  function command(h, rest, st, P, A) {
    const nums = (min, max) => { const a = A(); if (a.length < min || a.length > max) fail('ARGUMENT'); return a.map(n => num(evn(n))); };
    switch (h) {
      case 'Disp ': if (!rest.length) VM.view = 'home'; A().forEach(n => dispValue(evn(n))); break;
      case 'ClrHome': clearBuf(); VM.log = []; VM.view = 'home'; break;
      case 'Output(': { const a = A(); if (a.length !== 3) fail('ARGUMENT'); output(num(evn(a[0])), num(evn(a[1])), evn(a[2])); break; }
      case 'Pause ': if (rest.length) dispValue(evn(P())); VM.wait = { type: 'pause' }; break;
      case 'Wait ': { const s = num(evn(P())); if (s < 0) fail('DOMAIN'); VM.wait = { type: 'time', until: Date.now() + s * 1000 }; break; }
      case 'Input ': {
        const a = A();
        if (a.length > 2) fail('ARGUMENT');
        const tgt = a.length ? a[a.length - 1] : null;
        if (tgt && !['var', 'strvar', 'lvar', 'lidx'].includes(tgt.k)) fail('SYNTAX');
        const label = a.length === 2 ? (v => (isStr(v) ? v.s : formatValue(v).lines[0]))(evn(a[0])) : '?';
        startInput([{ tgt, label }]);
        break;
      }
      case 'Prompt ': {
        const a = A();
        if (!a.length || a.some(n => n.k !== 'var' && n.k !== 'strvar')) fail('SYNTAX');
        startInput(a.map(n => ({ tgt: n, label: n.v + '=?' })));
        break;
      }
      case 'Stop': VM.frames = []; VM.pc = VM.code.length; return;
      case 'Return': VM.pc = VM.code.length; return;
      case 'Goto ': {
        const idx = VM.code.labels[rest.join('')];
        if (idx === undefined) fail('LABEL');
        VM.pc = idx + 1;
        return;
      }
      case 'Menu(': startMenu(rest); break;
      case 'DelVar ': {
        const n = P();
        if (n.k === 'var') S.vars[n.v] = 0;
        else if (n.k === 'lvar') S.lists[n.i] = [];
        else if (n.k === 'mvar') S.mats[n.m] = null;
        else if (n.k === 'strvar') delete S.strs[n.v];
        else fail('SYNTAX');
        break;
      }
      case 'ClrDraw': S.draw = []; showGraph(); break;
      case 'Line(': { const a = nums(4, 5); S.draw.push({ k: 'line', x1: a[0], y1: a[1], x2: a[2], y2: a[3], erase: a[4] === 0 }); showGraph(); break; }
      case 'Horizontal ': S.draw.push({ k: 'h', y: num(evn(P())) }); showGraph(); break;
      case 'Vertical ': S.draw.push({ k: 'v', x: num(evn(P())) }); showGraph(); break;
      case 'Circle(': { const a = nums(3, 3); S.draw.push({ k: 'circle', x: a[0], y: a[1], r: a[2] }); showGraph(); break; }
      case 'Pt-On(': case 'Pt-Off(': { const a = nums(2, 3); S.draw.push({ k: 'pt', x: a[0], y: a[1], erase: h === 'Pt-Off(' }); showGraph(); break; }
      case 'Text(': {
        const a = A();
        if (a.length < 3) fail('ARGUMENT');
        const s = a.slice(2).map(n => { const v = evn(n); return isStr(v) ? v.s : formatValue(v).lines[0]; }).join('');
        S.draw.push({ k: 'text', row: num(evn(a[0])), col: num(evn(a[1])), s });
        showGraph();
        break;
      }
      case 'DrawF ': S.draw.push({ k: 'drawf', ast: P() }); showGraph(); break;
      case 'Shade(': {
        const a = A();
        if (a.length < 2 || a.length > 4) fail('ARGUMENT');
        const op = { k: 'shade', lo: a[0], hi: a[1] };
        if (a[2]) op.xl = num(evn(a[2]));
        if (a[3]) op.xr = num(evn(a[3]));
        S.draw.push(op);
        showGraph();
        break;
      }
      case 'FnOn ': case 'FnOff ': {
        const on = h === 'FnOn ', a = A();
        if (!a.length) S.y.forEach(f => { f.on = on; });
        a.forEach(n => { const k = num(evn(n)); if (!isInt(k) || k < 0 || k > 9) fail('DOMAIN'); S.y[(k + 9) % 10].on = on; });
        break;
      }
      case 'AxesOn': S.fmt.axes = true; break;
      case 'AxesOff': S.fmt.axes = false; break;
      case 'GridOn': S.fmt.grid = true; break;
      case 'GridOff': S.fmt.grid = false; break;
      default: fail('SYNTAX');
    }
    VM.pc++;
  }
  function callProgram(name) {
    if (!S.prgms[name]) fail('UNDEFINED PRGM');
    if (VM.frames.length > 40) fail('MEMORY');
    VM.frames.push({ code: VM.code, pc: VM.pc + 1 });
    VM.code = compile(S.prgms[name], name);
    VM.pc = 0;
  }

  /* ---------- waiting for the user ---------- */
  function startInput(items) {
    if (VM.row >= ROWS) scroll();
    VM.view = 'home';
    VM.wait = { type: 'input', items, idx: 0, ed: { t: [], c: 0 } };
  }
  function submitInput() {
    const w = VM.wait, it = w.items[w.idx];
    try {
      if (it.tgt) {
        if (it.tgt.k === 'strvar') store(it.tgt, { str: true, s: w.ed.t.join('') }, null);
        else {
          if (!w.ed.t.length) throw new CalcError('SYNTAX');
          store(it.tgt, ev(parse(w.ed.t).node, null), null);
        }
      }
    } catch (e) { toast('Enter a value that fits ' + (it.tgt ? it.label.replace(/=\?$/, '') : 'here')); w.ed = { t: [], c: 0 }; return; }
    putLine(it.label + w.ed.t.join(''), false);
    w.idx++;
    w.ed = { t: [], c: 0 };
    if (w.idx < w.items.length) { if (VM.row >= ROWS) scroll(); return; }
    VM.wait = null;
    schedule();
  }
  function startMenu(rest) {
    const parts = splitTop(rest);
    if (parts.length < 3 || parts.length % 2 === 0 || parts.length > 15) fail('ARGUMENT');
    const text = toks => { const v = evn(parse(toks).node); return isStr(v) ? v.s : formatValue(v).lines[0]; };
    const opts = [];
    for (let k = 1; k < parts.length; k += 2) opts.push({ text: text(parts[k]), label: parts[k + 1].join('') });
    VM.wait = { type: 'menu', title: text(parts[0]), opts, sel: 0 };
    VM.view = 'home';
  }
  function chooseMenu(i) {
    const o = VM.wait.opts[i];
    const idx = VM.code.labels[o.label];
    VM.wait = null;
    if (idx === undefined) { onError(new CalcError('LABEL'), VM.code[Math.max(0, VM.pc - 1)]); return; }
    VM.pc = idx + 1;
    schedule();
  }

  /* ---------- scheduler ---------- */
  function step() {
    if (VM.pc >= VM.code.length) {
      if (VM.frames.length) { const f = VM.frames.pop(); VM.code = f.code; VM.pc = f.pc; }
      else finish();
      return;
    }
    const st = VM.code[VM.pc];
    try { exec(st); } catch (e) { onError(e, st); }
  }
  function schedule() {
    if (!UI.live || !VM.running) return;
    clearTimeout(VM.timer);
    VM.timer = setTimeout(slice, 0);
  }
  function slice() {
    if (!VM.running) return;
    const t0 = Date.now();
    while (VM.running && !VM.wait && Date.now() - t0 < 14) step();
    GX.draw();
    if (!VM.running) return;
    if (!VM.wait) schedule();
    else if (VM.wait.type === 'time') VM.timer = setTimeout(() => { if (VM.wait && VM.wait.type === 'time') { VM.wait = null; slice(); } }, Math.max(0, VM.wait.until - Date.now()));
  }
  // run without the timer (used by tests); stops at the first wait
  function runSync(max = 1e6) {
    for (let n = 0; VM.running && n < max; n++) {
      if (VM.wait) { if (VM.wait.type === 'time') VM.wait = null; else break; }
      step();
    }
  }
  function status() {
    const w = VM.wait, name = VM.name ? 'prgm' + VM.name + '   ' : '';
    if (!w) return name + 'running   ON stops it';
    return name + ({ pause: 'paused: press ENTER', input: 'waiting for input', menu: 'choose an option', time: 'waiting' })[w.type];
  }
  function begin(code, entry, name) {
    Object.assign(VM, { running: true, done: false, code, pc: 0, frames: [], wait: null, key: 0, view: 'home', log: [], entry, name, lastExpr: false, lastVal: null });
    clearBuf();
    GX.homeLines(entry).forEach((l, i) => {
      const line = blank(), ch = l.ch.slice(0, COLS), start = l.r ? COLS - ch.length : 0;
      ch.forEach((c, k) => { line[start + k] = c; });
      VM.buf[i] = line;
      VM.row = i + 1;
    });
    S.screen = 'run';
    UI.statusOverride = status;
    schedule();
  }
  function runHome(tokens) {
    const single = tokens.length === 1 && TOK[tokens[0]] && TOK[tokens[0]].t === 'prgmcall';
    begin(compile([tokens], null), tokens.slice(), single ? TOK[tokens[0]].name : '');
  }
  function endRun(lines) {
    VM.running = false;
    VM.wait = null;
    clearTimeout(VM.timer);
    UI.statusOverride = null;
    if (lines.length) { S.hist.push({ i: VM.entry, lines, r: false }); if (S.hist.length > 60) S.hist.shift(); }
  }
  function finish() {
    let result = [padLeft('Done')];
    if (VM.lastExpr && VM.lastVal) {
      const f = formatValue(VM.lastVal.v, VM.lastVal.cmd);
      result = f.lines.map(l => (f.right ? padLeft(l) : l));
    }
    endRun(VM.log.slice(-40).concat(result));
    if (VM.view === 'graph') VM.done = true; // keep the drawing up until a key is pressed
    else S.screen = 'home';
    GX.draw();
    GX.save();
  }
  function onError(e, st) {
    if (!(e instanceof CalcError)) { console.error(e); e = new CalcError('SYNTAX'); }
    endRun(VM.log.slice(-40));
    showError(e.type, st && st.prog ? { screen: 'pedit', prog: st.prog, line: st.line } : { screen: 'home', tokens: VM.entry, pos: 0 });
  }
  function breakRun() {
    const st = VM.code && VM.code[Math.min(VM.pc, VM.code.length - 1)];
    endRun(VM.log.slice(-40));
    showError('BREAK', st && st.prog ? { screen: 'pedit', prog: st.prog, line: st.line } : null);
  }

  // a calculator key while the run screen is up; returns true when used here
  function rawKey(id) {
    if (VM.done) { VM.done = false; S.screen = 'home'; return id === 'clear' || id === 'enter'; }
    if (!VM.running) return false;
    if (id === 'on') { breakRun(); return true; }
    const w = VM.wait;
    if (w && w.type === 'input') return false;
    VM.key = KEYCODES[id] || 0;
    if (w && w.type === 'pause' && id === 'enter') { VM.wait = null; VM.key = 0; schedule(); }
    else if (w && w.type === 'menu') {
      const n = w.opts.length;
      if (id === 'up') w.sel = (w.sel - 1 + n) % n;
      else if (id === 'down') w.sel = (w.sel + 1) % n;
      else if (id === 'enter') { VM.key = 0; chooseMenu(w.sel); }
      else if (/^[1-9]$/.test(id) && +id <= n) { VM.key = 0; chooseMenu(+id - 1); }
    }
    return true;
  }
  function takeKey() { const k = VM.key; VM.key = 0; return k; }

  SCREENS.run = {
    draw(c) {
      if (VM.view === 'graph') { GX.drawGraphImage(c); return; }
      const w = VM.wait;
      if (w && w.type === 'menu') {
        drawCol(c, str(w.title), 0, 0, { inv: true });
        w.opts.forEach((o, i) => {
          drawCol(c, [String(i + 1), ':'], 0, 1 + i, { inv: i === w.sel });
          drawCol(c, str(o.text), 2, 1 + i);
        });
        return;
      }
      VM.buf.forEach((line, r) => drawCol(c, line, 0, r));
      if (w && w.type === 'input') {
        const it = w.items[w.idx], row = Math.min(VM.row, ROWS - 1), lab = str(it.label);
        c.fillStyle = C.lcd; c.fillRect(0, GX.rowY(row), GEO.W, GEO.RH);
        drawCol(c, lab, 0, row);
        drawCol(c, str(w.ed.t.join('')), lab.length, row);
        drawCursor(c, lab.length + charOff(w.ed.t, w.ed.c), row);
      }
    },
    key(act) {
      const w = VM.wait;
      if (w && w.type === 'input') {
        if (act === 'enter') submitInput();
        else if (act === 'clear') w.ed = { t: [], c: 0 };
        else if (act.startsWith('ins:') || ['left', 'right', 'del', 'bksp', 'home', 'end'].includes(act)) edKey(w.ed, act);
      }
      return true;
    },
  };

  Object.assign(VM, { compile, runHome, runSync, rawKey, takeKey, KEYCODES });
  GX.VM = VM;
})(window.GX = window.GX || {});
