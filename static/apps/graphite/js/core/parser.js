/* Graphite GX — parser.
   Turns a token array into a tree, following calculator precedence:
   postfix > ^ (left to right) > negation > nPr/nCr > ×÷ and implied × > +− > tests > and > or/xor.
   Closing parentheses and brackets may be left off at the end of a line. */
(function (GX) {
  'use strict';
  const { TOK, tyOf, fail } = GX;
  const OPERAND = new Set(['digit', 'ee', 'const', 'var', 'wvar', 'lvar', 'mvar', 'svar', 'strvar', 'getkey', 'quote', 'ans', 'rand', 'fn', 'yvar', 'lp', 'lb', 'lsq', 'neg']);

  // mode 'args' parses a bare comma-separated argument list, as used by program commands
  function parse(tokens, mode) {
    let i = 0;
    const n = tokens.length;
    const peek = () => tokens[i];
    const syn = () => fail('SYNTAX', Math.min(i, n));
    const atStop = () => i >= n || peek() === '→' || tyOf(peek()) === 'cmd';
    const closeWith = tok => { if (peek() === tok) i++; else if (!atStop()) syn(); };
    const binLoop = (next, ops) => {
      let l = next();
      while (ops.includes(peek())) { const op = peek(); i++; l = { k: 'bin', op, l, r: next() }; }
      return l;
    };
    const orE = () => binLoop(andE, [' or ', ' xor ']);
    const andE = () => binLoop(rel, [' and ']);
    const rel = () => binLoop(add, ['=', '≠', '>', '≥', '<', '≤']);
    const add = () => binLoop(mul, ['+', '-']);
    function mul() {
      let l = comb();
      for (;;) {
        const t = peek();
        if (t === '*' || t === '/') { i++; l = { k: 'bin', op: t, l, r: comb() }; }
        else if (t !== undefined && OPERAND.has(tyOf(t))) l = { k: 'bin', op: '*', l, r: comb() };
        else return l;
      }
    }
    const comb = () => binLoop(neg, [' nPr ', ' nCr ']);
    function neg() { if (peek() === '⁻') { i++; return { k: 'neg', e: neg() }; } return pow(); }
    function pow() {
      let l = post();
      while (peek() === '^' || peek() === 'ˣ√') { const op = peek(); i++; l = { k: 'bin', op, l, r: powArg() }; }
      return l;
    }
    function powArg() { if (peek() === '⁻') { i++; return { k: 'neg', e: powArg() }; } return post(); }
    function post() {
      let e = prim();
      while (tyOf(peek()) === 'post') { e = { k: 'post', op: peek(), e }; i++; }
      return e;
    }
    function args() {
      const out = [orE()];
      while (peek() === ',') { i++; out.push(orE()); }
      return out;
    }
    function prim() {
      const t = peek(), y = tyOf(t);
      switch (y) {
        case 'digit': case 'ee': return num();
        case 'const': i++; return { k: 'num', v: TOK[t].v };
        case 'var': i++; return { k: 'var', v: t };
        case 'wvar': i++; return { k: 'wvar', v: TOK[t].k };
        case 'svar': i++; return { k: 'svar', v: t };
        case 'strvar': i++; return { k: 'strvar', v: t };
        case 'getkey': i++; return { k: 'getkey' };
        case 'quote': {
          i++;
          let s = '';
          while (i < n && peek() !== '"') { s += peek(); i++; }
          if (peek() === '"') i++;
          return { k: 'str', s };
        }
        case 'ans': i++; return { k: 'ans' };
        case 'rand': i++; return { k: 'rand' };
        case 'lp': { i++; const e = orE(); closeWith(')'); return e; }
        case 'lb': { i++; const items = args(); closeWith('}'); return { k: 'list', items }; }
        case 'lsq': {
          i++;
          if (peek() !== '[') syn();
          const rows = [];
          while (peek() === '[') {
            i++;
            rows.push(args());
            closeWith(']');
            if (atStop()) break;
          }
          closeWith(']');
          if (rows.some(r => r.length !== rows[0].length)) fail('INVALID DIM', i);
          return { k: 'matlit', rows };
        }
        case 'lvar': {
          i++;
          if (peek() === '(') { i++; const a = orE(); closeWith(')'); return { k: 'lidx', i: TOK[t].i, a }; }
          return { k: 'lvar', i: TOK[t].i };
        }
        case 'mvar': {
          i++;
          const m = TOK[t].k;
          if (peek() === '(') {
            i++;
            const r = orE();
            if (peek() !== ',') syn();
            i++;
            const c = orE();
            closeWith(')');
            return { k: 'midx', m, r, c };
          }
          return { k: 'mvar', m };
        }
        case 'yvar': {
          i++;
          if (peek() === '(') { i++; const a = orE(); closeWith(')'); return { k: 'ycall', i: TOK[t].i, a }; }
          return { k: 'yvar', i: TOK[t].i };
        }
        case 'fn': {
          const pos = i;
          i++;
          const a = peek() === ')' || atStop() ? [] : args();
          closeWith(')');
          if (a.length < TOK[t].min || a.length > TOK[t].max) fail('ARGUMENT', pos);
          return { k: 'fn', f: t, args: a, pos };
        }
      }
      return syn();
    }
    function num() {
      let s = '';
      while (tyOf(peek()) === 'digit') { s += peek(); i++; }
      if (s === '.' || (s.match(/\./g) || []).length > 1) syn();
      if (peek() === 'ᴇ') {
        i++;
        let sg = '';
        if (peek() === '⁻') { sg = '-'; i++; }
        let es = '';
        while (/^[0-9]$/.test(peek() || '')) { es += peek(); i++; }
        if (!es) syn();
        return { k: 'num', v: parseFloat((s || '1') + 'e' + sg + es) };
      }
      return { k: 'num', v: parseFloat(s) };
    }
    function target() {
      const v = peek(), vy = tyOf(v);
      if (vy === 'var') { i++; return { k: 'var', v }; }
      if (vy === 'wvar') { i++; return { k: 'wvar', v: TOK[v].k }; }
      if (vy === 'strvar') { i++; return { k: 'strvar', v }; }
      if (vy === 'lvar' || vy === 'mvar') return prim();
      return syn();
    }

    if (mode === 'args') {
      if (!n) return { args: [] };
      const a = args();
      closeWith(')');
      if (i < n) syn();
      return { args: a };
    }
    if (!n) syn();
    // statistics commands take bare comma-separated arguments: LinReg(ax+b) L₁,L₂,Y₁
    if (tyOf(tokens[0]) === 'statcmd') {
      i = 1;
      const a = i < n ? args() : [];
      if (i < n) syn();
      return { node: { k: 'stat', cmd: tokens[0], args: a }, cmd: null };
    }
    let node = orE();
    if (peek() === '→') { i++; node = { k: 'sto', e: node, tgt: target() }; }
    let cmd = null;
    if (tyOf(peek()) === 'cmd') { cmd = peek(); i++; }
    if (i < n) syn();
    return { node, cmd };
  }

  GX.parse = parse;
})(window.GX = window.GX || {});
