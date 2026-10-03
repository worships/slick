/* Graphite GX — Snake. Eat the dots to grow; don't hit the walls or yourself. */
(function (GX) {
  'use strict';
  GX.Games.register({
    id: 'snake', name: 'Snake', help: 'Arrows steer. Eat the dots.',
    create(api) {
      const CELL = 10, NX = 32, NY = 22, T = api.T;
      const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      let body, dir, queue, food, acc, step;
      const g = { score: 0, over: false };

      function placeFood() {
        do food = [api.rnd(NX), api.rnd(NY)];
        while (body.some(s => s[0] === food[0] && s[1] === food[1]));
      }
      g.reset = () => {
        body = [[8, 11], [7, 11], [6, 11], [5, 11]];
        dir = [1, 0]; queue = []; acc = 0; step = 120;
        g.score = 0; g.over = false;
        placeFood();
      };
      g.down = k => {
        const d = DIRS[k];
        if (!d) return;
        const last = queue.length ? queue[queue.length - 1] : dir;
        if ((d[0] === -last[0] && d[1] === -last[1]) || (d[0] === last[0] && d[1] === last[1])) return;
        if (queue.length < 3) queue.push(d);
      };
      function tick() {
        if (queue.length) dir = queue.shift();
        const h = [body[0][0] + dir[0], body[0][1] + dir[1]];
        const eating = h[0] === food[0] && h[1] === food[1];
        const hitsSelf = body.some((s, i) => (eating || i < body.length - 1) && s[0] === h[0] && s[1] === h[1]);
        if (h[0] < 0 || h[1] < 0 || h[0] >= NX || h[1] >= NY || hitsSelf) { g.over = true; return; }
        body.unshift(h);
        if (eating) { g.score++; step = Math.max(55, 120 - g.score * 2); placeFood(); }
        else body.pop();
      }
      g.update = dt => {
        acc += dt;
        while (acc >= step && !g.over) { acc -= step; tick(); }
      };
      g.draw = c => {
        c.fillStyle = api.C.ink;
        body.forEach(s => c.fillRect(s[0] * CELL + 1, T + s[1] * CELL + 1, CELL - 2, CELL - 2));
        c.strokeStyle = api.C.ink; c.lineWidth = 2;
        c.strokeRect(food[0] * CELL + 2, T + food[1] * CELL + 2, CELL - 4, CELL - 4);
      };
      g.reset();
      return g;
    },
  });
})(window.GX = window.GX || {});
