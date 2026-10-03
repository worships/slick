/* Graphite GX — 2048. Slide with the arrows; equal tiles merge. */
(function (GX) {
  'use strict';
  GX.Games.register({
    id: '2048', name: '2048', help: 'Arrows slide the tiles. Reach 2048.',
    create(api) {
      const N = 4, CS = 48, GAP = 4, SIZE = N * CS + (N + 1) * GAP, OX = (api.W - SIZE) / 2, OY = api.T + 6;
      let grid, banner, reached;
      const g = { score: 0, over: false };

      function addTile() {
        const empty = [];
        grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
        if (!empty.length) return;
        const [r, c] = empty[api.rnd(empty.length)];
        grid[r][c] = Math.random() < 0.9 ? 2 : 4;
      }
      g.reset = () => {
        grid = Array.from({ length: N }, () => new Array(N).fill(0));
        g.score = 0; g.over = false; banner = 0; reached = false;
        addTile(); addTile();
      };
      function slideLine(line) {
        const vals = line.filter(Boolean), out = [];
        let gained = 0;
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); gained += vals[i] * 2; i++; }
          else out.push(vals[i]);
        }
        while (out.length < N) out.push(0);
        return { out, gained };
      }
      function canMove() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!grid[r][c]) return true;
          if (c < N - 1 && grid[r][c] === grid[r][c + 1]) return true;
          if (r < N - 1 && grid[r][c] === grid[r + 1][c]) return true;
        }
        return false;
      }
      g.down = k => {
        const d = { left: [0, 1], right: [0, -1], up: [1, 1], down: [1, -1] }[k];
        if (!d) return;
        const [vertical, forward] = d;
        let moved = false;
        for (let i = 0; i < N; i++) {
          const idx = Array.from({ length: N }, (_, j) => (forward > 0 ? j : N - 1 - j));
          const { out, gained } = slideLine(idx.map(j => (vertical ? grid[j][i] : grid[i][j])));
          idx.forEach((j, n) => {
            if ((vertical ? grid[j][i] : grid[i][j]) !== out[n]) moved = true;
            if (vertical) grid[j][i] = out[n]; else grid[i][j] = out[n];
          });
          g.score += gained;
        }
        if (!moved) return;
        addTile();
        if (!reached && grid.some(row => row.some(v => v >= 2048))) { reached = true; banner = 2500; }
        if (!canMove()) g.over = true;
      };
      g.update = dt => { if (banner > 0) banner -= dt; };
      g.draw = c => {
        const { ink, lcd } = api.C;
        c.strokeStyle = ink;
        for (let r = 0; r < N; r++) for (let col = 0; col < N; col++) {
          const v = grid[r][col], x = OX + GAP + col * (CS + GAP), y = OY + GAP + r * (CS + GAP);
          c.lineWidth = v ? 2 : 1;
          c.strokeRect(x + 0.5, y + 0.5, CS - 1, CS - 1);
          if (v) api.say(c, String(v), x + CS / 2, y + CS / 2 + 1, { size: [0, 20, 20, 17, 14, 12, 11][Math.min(6, String(v).length)], weight: 800 });
        }
        if (banner > 0) {
          c.fillStyle = ink; c.fillRect(0, OY + SIZE / 2 - 14, api.W, 28);
          api.say(c, '2048!', api.W / 2, OY + SIZE / 2 + 1, { size: 16, weight: 800, color: lcd });
        }
      };
      g.reset();
      return g;
    },
  });
})(window.GX = window.GX || {});
