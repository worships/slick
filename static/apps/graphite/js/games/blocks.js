/* Graphite GX — Blocks, a falling-block puzzle.
   ← → move, ▲ or ENTER rotate, ▼ drops faster, 2nd drops all the way. */
(function (GX) {
  'use strict';
  const SHAPES = [
    { n: 4, c: [[0, 1], [1, 1], [2, 1], [3, 1]] }, // I
    { n: 2, c: [[0, 0], [1, 0], [0, 1], [1, 1]] }, // O
    { n: 3, c: [[1, 0], [0, 1], [1, 1], [2, 1]] }, // T
    { n: 3, c: [[1, 0], [2, 0], [0, 1], [1, 1]] }, // S
    { n: 3, c: [[0, 0], [1, 0], [1, 1], [2, 1]] }, // Z
    { n: 3, c: [[0, 0], [0, 1], [1, 1], [2, 1]] }, // J
    { n: 3, c: [[2, 0], [0, 1], [1, 1], [2, 1]] }, // L
  ];

  GX.Games.register({
    id: 'blocks', name: 'Blocks', help: 'Fill rows to clear them.',
    create(api) {
      const BW = 10, BH = 20, CS = 10, OX = 110, OY = api.T + 10;
      let board, cur, next, bag, fallT, lockT, dasT, dasDir;
      const g = { score: 0, over: false, lines: 0, level: 1 };

      const cellsOf = p => {
        let cs = SHAPES[p.type].c.map(a => a.slice());
        const n = SHAPES[p.type].n;
        for (let r = 0; r < p.rot; r++) cs = cs.map(([x, y]) => [n - 1 - y, x]);
        return cs.map(([x, y]) => [x + p.x, y + p.y]);
      };
      const fits = p => cellsOf(p).every(([x, y]) => x >= 0 && x < BW && y < BH && (y < 0 || !board[y][x]));
      function nextPiece() {
        if (!bag.length) { bag = [0, 1, 2, 3, 4, 5, 6]; for (let i = 6; i > 0; i--) { const j = api.rnd(i + 1); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
        return bag.pop();
      }
      function spawn() {
        cur = { type: next, rot: 0, x: next === 1 ? 4 : 3, y: next === 0 ? -1 : 0 };
        next = nextPiece();
        fallT = 0; lockT = 0;
        if (!fits(cur)) g.over = true;
      }
      g.reset = () => {
        board = Array.from({ length: BH }, () => new Array(BW).fill(0));
        bag = []; next = nextPiece();
        Object.assign(g, { score: 0, over: false, lines: 0, level: 1 });
        dasT = 0; dasDir = 0;
        spawn();
      };
      function tryMove(dx, dy) {
        const p = { ...cur, x: cur.x + dx, y: cur.y + dy };
        if (!fits(p)) return false;
        cur = p; lockT = 0;
        return true;
      }
      function rotate() {
        for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
          const p = { ...cur, rot: (cur.rot + 1) % 4, x: cur.x + kx, y: cur.y + ky };
          if (fits(p)) { cur = p; lockT = 0; return; }
        }
      }
      function lock() {
        cellsOf(cur).forEach(([x, y]) => { if (y >= 0) board[y][x] = 1; });
        if (cellsOf(cur).some(([, y]) => y < 0)) { g.over = true; return; }
        let cleared = 0;
        for (let y = BH - 1; y >= 0; y--) {
          if (board[y].every(Boolean)) { board.splice(y, 1); board.unshift(new Array(BW).fill(0)); cleared++; y++; }
        }
        if (cleared) {
          g.score += [0, 100, 300, 500, 800][cleared] * g.level;
          g.lines += cleared;
          g.level = 1 + Math.floor(g.lines / 10);
        }
        spawn();
      }
      function hardDrop() {
        let d = 0;
        while (tryMove(0, 1)) d++;
        g.score += d * 2;
        lock();
      }
      g.down = k => {
        if (k === 'left' || k === 'right') { dasDir = k === 'left' ? -1 : 1; dasT = 0; tryMove(dasDir, 0); }
        else if (k === 'up' || k === 'enter') rotate();
        else if (k === '2nd' || k === 'alpha') hardDrop();
        else if (k === 'down') { if (tryMove(0, 1)) g.score++; fallT = 0; }
      };
      g.up = k => { if ((k === 'left' && dasDir < 0) || (k === 'right' && dasDir > 0)) dasDir = 0; };
      g.update = dt => {
        if (dasDir && api.held.has(dasDir < 0 ? 'left' : 'right')) {
          dasT += dt;
          while (dasT > 170) { tryMove(dasDir, 0); dasT -= 50; }
        }
        const soft = api.held.has('down');
        const interval = soft ? 35 : Math.max(60, 720 - (g.level - 1) * 65);
        fallT += dt;
        while (fallT >= interval && !g.over) {
          fallT -= interval;
          if (tryMove(0, 1)) { if (soft) g.score++; }
          else break;
        }
        if (!fits({ ...cur, y: cur.y + 1 })) { lockT += dt; if (lockT > 450) lock(); }
      };
      g.status = () => 'SCORE ' + g.score + '  LINES ' + g.lines;

      const block = (c, x, y, s = CS) => c.fillRect(x + 1, y + 1, s - 2, s - 2);
      g.draw = c => {
        const ink = api.C.ink;
        c.strokeStyle = ink; c.lineWidth = 1;
        c.strokeRect(OX - 2.5, OY - 2.5, BW * CS + 5, BH * CS + 5);
        c.fillStyle = ink;
        for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (board[y][x]) block(c, OX + x * CS, OY + y * CS);
        if (!g.over) cellsOf(cur).forEach(([x, y]) => { if (y >= 0) block(c, OX + x * CS, OY + y * CS); });
        const label = (t, v, y) => { api.say(c, t, 55, y, { size: 10 }); api.say(c, String(v), 55, y + 15, { size: 14, weight: 800 }); };
        label('SCORE', g.score, OY + 20);
        label('LINES', g.lines, OY + 70);
        label('LEVEL', g.level, OY + 120);
        api.say(c, 'NEXT', 265, OY + 20, { size: 10 });
        const sh = SHAPES[next];
        c.fillStyle = ink;
        sh.c.forEach(([x, y]) => block(c, 265 - sh.n * 5 + x * CS, OY + 34 + y * CS));
      };
      g.reset();
      return g;
    },
  });
})(window.GX = window.GX || {});
