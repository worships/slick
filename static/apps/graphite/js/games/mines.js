/* Graphite GX — Mines. Arrows move, ENTER opens a square, 2nd flags it.
   Your best score is your fastest clear, in seconds. */
(function (GX) {
  'use strict';
  GX.Games.register({
    id: 'mines', name: 'Mines', help: 'ENTER opens a square, 2nd flags it.', lowerBetter: true,
    create(api) {
      const NX = 16, NY = 11, CS = 20, MINES = 26, T = api.T;
      let grid, cx, cy, placed, time, opened, boom;
      const g = { score: 0, over: false, won: false };
      const at = (x, y) => (x >= 0 && y >= 0 && x < NX && y < NY ? grid[y * NX + x] : null);
      const around = (x, y) => {
        const out = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const c = at(x + dx, y + dy); if (c) out.push(c); }
        return out;
      };

      g.reset = () => {
        grid = [];
        for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) grid.push({ x, y, mine: false, n: 0, open: false, flag: false });
        cx = Math.floor(NX / 2); cy = Math.floor(NY / 2);
        placed = false; time = 0; opened = 0; boom = null;
        Object.assign(g, { score: 0, over: false, won: false });
      };
      function place(sx, sy) {
        const safe = new Set([at(sx, sy), ...around(sx, sy)]);
        let left = MINES;
        while (left > 0) {
          const c = grid[api.rnd(grid.length)];
          if (c.mine || safe.has(c)) continue;
          c.mine = true; left--;
        }
        grid.forEach(c => { c.n = around(c.x, c.y).filter(o => o.mine).length; });
        placed = true;
      }
      function open(c) {
        if (!c || c.open || c.flag) return;
        if (c.mine) { c.open = true; boom = c; g.over = true; grid.forEach(o => { if (o.mine) o.open = true; }); return; }
        const stack = [c];
        while (stack.length) {
          const o = stack.pop();
          if (o.open || o.flag) continue;
          o.open = true; opened++;
          if (o.n === 0) around(o.x, o.y).forEach(nb => { if (!nb.open && !nb.mine) stack.push(nb); });
        }
        if (opened === NX * NY - MINES) {
          g.won = true; g.over = true;
          g.score = Math.max(1, Math.round(time / 1000));
          grid.forEach(o => { if (o.mine) o.flag = true; });
        }
      }
      g.down = k => {
        if (k === 'left') cx = (cx + NX - 1) % NX;
        else if (k === 'right') cx = (cx + 1) % NX;
        else if (k === 'up') cy = (cy + NY - 1) % NY;
        else if (k === 'down') cy = (cy + 1) % NY;
        else if (k === 'enter') {
          const c = at(cx, cy);
          if (!placed) place(cx, cy);
          if (c.open && c.n > 0) { // open the neighbours of a number whose flags are all placed
            const nb = around(cx, cy);
            if (nb.filter(o => o.flag).length === c.n) nb.forEach(open);
          } else open(c);
        } else if (k === '2nd' || k === 'alpha') {
          const c = at(cx, cy);
          if (!c.open) c.flag = !c.flag;
        }
      };
      g.update = dt => { if (placed && !g.over) time += dt; };
      g.status = () => (g.won ? 'CLEARED IN ' + g.score + 's'
        : 'FLAGS ' + grid.filter(c => c.flag).length + '/' + MINES + '  TIME ' + Math.floor(time / 1000));
      g.draw = c => {
        const { ink, lcd } = api.C;
        grid.forEach(o => {
          const x = o.x * CS, y = T + o.y * CS;
          if (!o.open || (o.mine && o.flag && g.won)) {
            c.fillStyle = ink; c.fillRect(x + 1, y + 1, CS - 2, CS - 2);
            if (o.flag) api.say(c, 'F', x + 10, y + 11, { size: 12, weight: 800, color: lcd });
            return;
          }
          if (o === boom) { c.fillStyle = ink; c.fillRect(x + 1, y + 1, CS - 2, CS - 2); api.say(c, '*', x + 10, y + 13, { size: 16, weight: 800, color: lcd }); return; }
          if (o.mine) api.say(c, '*', x + 10, y + 13, { size: 16, weight: 800 });
          else if (o.n) api.say(c, String(o.n), x + 10, y + 11, { size: 13, weight: 800 });
        });
        const x = cx * CS, y = T + cy * CS, closed = !at(cx, cy).open;
        c.strokeStyle = closed ? lcd : ink; c.lineWidth = 2;
        c.strokeRect(x + 3, y + 3, CS - 6, CS - 6);
        if (!closed) { c.strokeStyle = ink; c.strokeRect(x + 1, y + 1, CS - 2, CS - 2); }
      };
      g.reset();
      return g;
    },
  });
})(window.GX = window.GX || {});
