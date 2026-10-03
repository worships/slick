/* Graphite GX — keypad layout and input handling (touch, mouse, keyboard).
   Each key has a main action (m), a 2nd action (sa) and an ALPHA letter (a).
   Actions: 'ins:<token>' types a token, 'go:<screen>' opens a screen or menu,
   'na:<name>' / 'msg:<text>' show a short note in the status bar. */
(function (GX) {
  'use strict';
  const { S, LISTS } = GX;

  const TOP = [
    { id: 'yeq', m: 'Y=', s: 'STAT PLOT', sa: 'go:statplot', act: 'go:yeq', cls: 'g' },
    { id: 'window', m: 'WINDOW', s: 'TBLSET', sa: 'go:tblset', act: 'go:window', cls: 'g' },
    { id: 'zoom', m: 'ZOOM', s: 'FORMAT', sa: 'go:format', act: 'go:zoom', cls: 'g' },
    { id: 'trace', m: 'TRACE', s: 'CALC', sa: 'go:calc', act: 'go:trace', cls: 'g' },
    { id: 'graph', m: 'GRAPH', s: 'TABLE', sa: 'go:table', act: 'go:graph', cls: 'g' },
  ];
  const NAV = [
    { id: '2nd', m: '2ND', cls: 'k2nd' },
    { id: 'mode', m: 'MODE', s: 'QUIT', sa: 'quit', act: 'go:mode' },
    { id: 'del', m: 'DEL', s: 'INS', sa: 'msg:Typing always inserts here', act: 'del' },
    { id: 'alpha', m: 'ALPHA', s: 'A-LOCK', cls: 'kalpha' },
    { id: 'xt', m: 'X,T,θ,n', s: 'LINK', sa: 'na:LINK', act: 'xt', aria: 'X, T or θ variable' },
    { id: 'stat', m: 'STAT', s: 'LIST', sa: 'go:list', act: 'go:stat' },
  ];
  const digit = (d, s, a) => ({ id: d, m: d, s: LISTS[s] || s, sa: LISTS[s] ? 'ins:' + LISTS[s] : 'na:' + s, a, cls: 'num' });
  const MAIN = [
    [
      { id: 'math', m: 'MATH', s: 'TEST', sa: 'go:test', a: 'A', act: 'go:math' },
      { id: 'apps', m: 'APPS', s: 'ANGLE', sa: 'go:angle', a: 'B', act: 'go:apps' },
      { id: 'prgm', m: 'PRGM', s: 'DRAW', sa: 'go:draw', a: 'C', act: 'go:prgm' },
      { id: 'vars', m: 'VARS', s: 'DISTR', sa: 'go:distr', act: 'go:vars' },
      { id: 'clear', m: 'CLEAR', act: 'clear' },
    ],
    [
      { id: 'inv', m: 'x⁻¹', s: 'MATRIX', sa: 'go:matrix', a: 'D', act: 'ins:⁻¹', aria: 'reciprocal' },
      { id: 'sin', m: 'SIN', s: 'SIN⁻¹', sa: 'ins:sin⁻¹(', a: 'E', act: 'ins:sin(' },
      { id: 'cos', m: 'COS', s: 'COS⁻¹', sa: 'ins:cos⁻¹(', a: 'F', act: 'ins:cos(' },
      { id: 'tan', m: 'TAN', s: 'TAN⁻¹', sa: 'ins:tan⁻¹(', a: 'G', act: 'ins:tan(' },
      { id: 'pow', m: '^', s: 'π', sa: 'ins:π', a: 'H', act: 'ins:^', aria: 'power' },
    ],
    [
      { id: 'sq', m: 'x²', s: '√', sa: 'ins:√(', a: 'I', act: 'ins:²', aria: 'square' },
      { id: 'comma', m: ',', s: 'EE', sa: 'ins:ᴇ', a: 'J', act: 'ins:,', aria: 'comma' },
      { id: 'lp', m: '(', s: '{', sa: 'ins:{', a: 'K', act: 'ins:(', aria: 'open parenthesis' },
      { id: 'rp', m: ')', s: '}', sa: 'ins:}', a: 'L', act: 'ins:)', aria: 'close parenthesis' },
      { id: 'div', m: '÷', s: 'e', sa: 'ins:e', a: 'M', act: 'ins:/', cls: 'op', aria: 'divide' },
    ],
    [
      { id: 'log', m: 'LOG', s: '10ˣ', sa: 'ins:10^(', a: 'N', act: 'ins:log(' },
      digit('7', 'u', 'O'), digit('8', 'v', 'P'), digit('9', 'w', 'Q'),
      { id: 'mul', m: '×', s: '[', sa: 'ins:[', a: 'R', act: 'ins:*', cls: 'op', aria: 'multiply' },
    ],
    [
      { id: 'ln', m: 'LN', s: 'eˣ', sa: 'ins:e^(', a: 'S', act: 'ins:ln(' },
      digit('4', 3, 'T'), digit('5', 4, 'U'), digit('6', 5, 'V'),
      { id: 'sub', m: '−', s: ']', sa: 'ins:]', a: 'W', act: 'ins:-', cls: 'op', aria: 'subtract' },
    ],
    [
      { id: 'sto', m: 'STO→', s: 'RCL', sa: 'rcl', a: 'X', act: 'ins:→', aria: 'store' },
      digit('1', 0, 'Y'), digit('2', 1, 'Z'), digit('3', 2, 'θ'),
      { id: 'add', m: '+', s: 'MEM', sa: 'go:mem', a: '"', act: 'ins:+', cls: 'op', aria: 'add' },
    ],
    [
      { id: 'on', m: 'ON', s: 'OFF', sa: 'off', act: 'on' },
      { id: '0', m: '0', s: 'CATALOG', sa: 'go:catalog', a: '␣', aa: 'ins: ', cls: 'num' },
      { id: 'dot', m: '.', s: 'i', sa: 'ins:i', a: ':', act: 'ins:.', cls: 'num', aria: 'decimal point' },
      { id: 'neg', m: '(−)', s: 'ANS', sa: 'ins:Ans', a: '?', act: 'ins:⁻', cls: 'num', aria: 'negative' },
      { id: 'enter', m: 'ENTER', s: 'ENTRY', sa: 'entry', a: 'SOLVE', act: 'enter', cls: 'op sm' },
    ],
  ];

  const KEYMAP = {
    up: { m: 'up', s: 'up' }, down: { m: 'down', s: 'down' },
    left: { m: 'left', s: 'home' }, right: { m: 'right', s: 'end' },
  };
  [...TOP, ...NAV, ...MAIN.flat()].forEach(k => {
    const m = k.act || (k.cls === 'num' ? 'ins:' + k.id : null);
    const a = k.id === 'enter' ? 'solve' : k.a ? (k.aa || 'ins:' + k.a) : null;
    KEYMAP[k.id] = { m, s: k.sa || null, a };
  });

  const REPEAT = new Set(['up', 'down', 'left', 'right', 'del']);
  const KB = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '.': 'dot', '+': 'add', '*': 'mul', '/': 'div', '^': 'pow', '(': 'lp', ')': 'rp', ',': 'comma',
    'Enter': 'enter', '=': 'enter', 'Escape': 'clear', 'Delete': 'del',
    'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
    'F1': 'yeq', 'F2': 'window', 'F3': 'zoom', 'F4': 'trace', 'F5': 'graph',
  };
  const GAME_KB = {
    'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
    'Enter': 'enter', ' ': '2nd', 'Shift': 'alpha', 'Escape': 'clear', 'Backspace': 'del', 'Delete': 'del', 'p': 'del', 'P': 'del',
  };
  const LETTER = { x: 'ins:X', s: 'ins:sin(', c: 'ins:cos(', t: 'ins:tan(', l: 'ins:ln(', g: 'ins:log(', r: 'ins:√(', p: 'ins:π', e: 'ins:e', a: 'ins:Ans' };

  function keyEl(k) {
    const wrap = document.createElement('div');
    wrap.className = 'k';
    const lab = document.createElement('div');
    lab.className = 'lab';
    const s = document.createElement('span');
    s.className = 's' + (k.sa && k.sa.startsWith('na:') ? ' na' : '');
    s.textContent = k.s || '';
    const a = document.createElement('span');
    a.className = 'a' + (k.aa && k.aa.startsWith('na:') ? ' na' : '');
    a.textContent = k.a || '';
    lab.append(s, a);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kb ' + (k.cls || 'fn');
    b.dataset.id = k.id;
    b.setAttribute('aria-label', k.aria || k.m);
    const sp = document.createElement('span');
    sp.textContent = k.m;
    b.append(sp);
    wrap.append(lab, b);
    return wrap;
  }

  function buildKeypad(root) {
    const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const top = document.createElement('div');
    top.className = 'row5 toprow';
    TOP.forEach(k => top.append(keyEl(k)));
    const nav = document.createElement('div');
    nav.className = 'nav';
    const dcell = document.createElement('div');
    dcell.className = 'dpad-cell';
    dcell.innerHTML = '<div class="dpad">' +
      ['up', 'down', 'left', 'right'].map(d => `<button type="button" class="dp dp-${d[0]}" data-id="${d}" aria-label="${d[0].toUpperCase() + d.slice(1)}">${chevron}</button>`).join('') +
      '</div>';
    nav.append(dcell);
    NAV.forEach(k => nav.append(keyEl(k)));
    const main = document.createElement('div');
    main.className = 'row5';
    MAIN.flat().forEach(k => main.append(keyEl(k)));
    root.append(top, nav, main);
    wireInput(root);
  }

  function wireInput(root) {
    const REP = GX.REP;
    let held = null, heldId = null, t1 = 0, t2 = 0;
    const inGame = () => S.screen === 'game';
    const stopRepeat = () => { clearTimeout(t1); clearInterval(t2); };
    const release = () => {
      stopRepeat();
      if (held) held.classList.remove('pressed');
      if (heldId && inGame()) GX.Games.up(heldId);
      held = null; heldId = null;
    };
    root.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-id]');
      if (!el) return;
      e.preventDefault();
      release();
      held = el; heldId = el.dataset.id;
      el.classList.add('pressed');
      if (inGame()) { GX.Games.down(heldId); return; }
      REP.n = 0;
      GX.press(heldId);
      if (REPEAT.has(heldId)) {
        const id = heldId;
        t1 = setTimeout(() => { t2 = setInterval(() => { REP.n++; GX.press(id); }, 60); }, 380);
      }
    });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', () => { release(); if (inGame()) GX.Games.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && inGame()) GX.Games.pause(); });
    root.addEventListener('click', e => { // keyboard activation of a focused key
      const el = e.target.closest('[data-id]');
      if (el && e.detail === 0) { if (inGame()) { GX.Games.down(el.dataset.id); GX.Games.up(el.dataset.id); } else GX.press(el.dataset.id); }
    });
    root.addEventListener('contextmenu', e => e.preventDefault());

    const flash = id => {
      const el = root.querySelector(`[data-id="${id}"]`);
      if (!el) return;
      el.classList.add('pressed');
      setTimeout(() => el.classList.remove('pressed'), 110);
    };
    window.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const ae = document.activeElement;
      if (ae && ae.closest && ae.closest('[data-id]') && (e.key === 'Enter' || e.key === ' ')) return;
      if (inGame()) {
        const id = GAME_KB[e.key] || KB[e.key];
        if (!id) return;
        e.preventDefault();
        if (!e.repeat) { flash(id); GX.Games.down(id); }
        return;
      }
      const k = e.key, id = KB[k];
      let act = null;
      if (!id) {
        if (k === 'Backspace') act = 'bksp';
        else if (k === '-') act = GX.smartMinus();
        else if (k === '!') act = 'ins:!';
        else if (/^[a-zA-Z]$/.test(k)) {
          if (S.screen === 'menu' && S.menu && S.menu.catalog) act = 'ins:' + k.toUpperCase();
          else if (k >= 'A' && k <= 'Z') act = 'ins:' + k;
          else act = LETTER[k] || null;
        }
      }
      if (k === 'Enter' && e.shiftKey) { e.preventDefault(); GX.typeAction('solve'); return; }
      if (!id && !act) return;
      e.preventDefault();
      REP.n = e.repeat ? REP.n + 1 : 0;
      if (id) { flash(id); GX.press(id); return; }
      GX.typeAction(act);
    });
    window.addEventListener('keyup', e => {
      if (!inGame()) return;
      const id = GAME_KB[e.key] || KB[e.key];
      if (id) GX.Games.up(id);
    });
  }

  Object.assign(GX, { KEYMAP, buildKeypad });
})(window.GX = window.GX || {});
