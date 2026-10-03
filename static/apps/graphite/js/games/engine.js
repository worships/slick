/* Graphite GX — game engine.
   Games register themselves and get the full LCD below the status bar.
   The engine owns the title / pause / game-over screens and best scores,
   so each game only implements its own rules.

   A game definition:
     GX.Games.register({
       id, name, help,            // help is one short line shown on the title screen
       lowerBetter: false,        // true when a lower score is better (e.g. a time)
       create(api) → game         // game: { score, over, won?, reset(), update(ms), draw(ctx), down(key), up?(key), status?() }
     });
   Keys are calculator key ids: 'up' 'down' 'left' 'right' 'enter' '2nd' 'alpha' and digits.
   Games draw only in ink (api.C.ink) on the LCD background, like a monochrome calculator. */
(function (GX) {
  'use strict';
  const { S, GEO, C, UI, SCREENS, say, setScreen, save } = GX;
  const { W, H, GY, GH } = GEO;

  const Games = { list: [], def: null, g: null, state: 'title', held: new Set(), raf: 0, last: 0, newBest: false };
  const api = { W, H, T: GY, AH: GH, C, say, held: Games.held, rnd: n => Math.floor(Math.random() * n) };
  const hasRAF = typeof requestAnimationFrame === 'function';

  Games.register = def => { Games.list.push(def); };
  Games.best = id => S.hi[id];

  Games.start = id => {
    const def = Games.list.find(d => d.id === id);
    if (!def) return;
    Games.def = def;
    Games.g = def.create(api);
    Games.state = 'title';
    Games.held.clear();
    S.second = false; S.alpha = false; S.alock = false;
    setScreen('game');
    UI.statusOverride = status;
    Games.last = 0;
    if (hasRAF) { cancelAnimationFrame(Games.raf); Games.raf = requestAnimationFrame(frame); }
  };
  Games.stop = () => {
    if (hasRAF) cancelAnimationFrame(Games.raf);
    UI.statusOverride = null;
    Games.def = null; Games.g = null;
    Games.held.clear();
  };
  Games.pause = () => { if (Games.g && Games.state === 'play') { Games.state = 'paused'; GX.draw(); } Games.held.clear(); };

  function status() {
    const d = Games.def, g = Games.g;
    if (!d) return '';
    const best = Games.best(d.id);
    return [d.name.toUpperCase(), g.status ? g.status() : 'SCORE ' + g.score, best !== undefined ? 'BEST ' + best : '', Games.state === 'paused' ? 'PAUSED' : '']
      .filter(Boolean).join('   ');
  }
  function begin() { Games.g.reset(); Games.state = 'play'; Games.last = 0; Games.newBest = false; }
  function finish() {
    const d = Games.def, g = Games.g, best = Games.best(d.id);
    Games.state = 'over';
    let isBest;
    if (d.lowerBetter) isBest = !!g.won && (best === undefined || g.score < best);
    else isBest = g.score > 0 && (best === undefined || g.score > best);
    if (isBest) { S.hi[d.id] = g.score; save(); }
    Games.newBest = isBest;
  }
  function quit() { setScreen('home'); GX.draw(); }

  Games.down = id => {
    if (!Games.g || Games.held.has(id)) return;
    Games.held.add(id);
    if (id === 'clear' || id === 'mode') { quit(); return; }
    if (Games.state === 'play') {
      if (id === 'del') Games.state = 'paused';
      else Games.g.down(id);
    } else if (Games.state === 'paused') {
      if (id === 'del' || id === 'enter' || id === '2nd') { Games.state = 'play'; Games.last = 0; }
    } else if (id === 'enter' || id === '2nd') begin();
    GX.draw();
  };
  Games.up = id => {
    Games.held.delete(id);
    if (Games.g && Games.state === 'play' && Games.g.up) Games.g.up(id);
  };
  // advance the game by `dt` ms (used by the animation loop and by tests)
  Games.step = dt => {
    if (!Games.g || Games.state !== 'play') return;
    Games.g.update(dt);
    if (Games.g.over) finish();
  };
  function frame(t) {
    if (!Games.g) return;
    const dt = Games.last ? Math.min(50, t - Games.last) : 16;
    Games.last = t;
    Games.step(dt);
    GX.draw();
    Games.raf = requestAnimationFrame(frame);
  }

  // plain overlays: a title page, and a solid band for pause and game over
  function band(c, lines) {
    const h = 14 + lines.length * 16, y = GY + (GH - h) / 2;
    c.fillStyle = C.ink; c.fillRect(0, y, W, h);
    lines.forEach((l, i) => say(c, l, W / 2, y + 15 + i * 16, { size: i === 0 ? 14 : 11, weight: i === 0 ? 800 : 600, color: C.lcd }));
  }
  function titlePage(c, d) {
    c.fillStyle = C.lcd; c.fillRect(0, GY, W, GH);
    const best = Games.best(d.id), top = GY + 34;
    say(c, d.name.toUpperCase(), W / 2, top, { size: 22, weight: 800 });
    say(c, d.help, W / 2, top + 34, { size: 11, weight: 600 });
    ['ENTER  play', 'DEL    pause', 'CLEAR  quit'].forEach((l, i) => say(c, l, W / 2, top + 72 + i * 18, { size: 12, weight: 700 }));
    if (best !== undefined) say(c, 'BEST ' + best + (d.lowerBetter ? 's' : ''), W / 2, top + 140, { size: 11, weight: 600, color: C.dim });
  }

  SCREENS.game = {
    draw(c) {
      const d = Games.def, g = Games.g;
      if (!g) return;
      if (Games.state === 'title') { titlePage(c, d); return; }
      c.save();
      c.beginPath(); c.rect(0, GY, W, GH); c.clip();
      g.draw(c);
      c.restore();
      const result = (g.status ? g.status() : 'SCORE ' + g.score) + (Games.newBest ? '  NEW BEST' : '');
      if (Games.state === 'paused') band(c, ['PAUSED', 'ENTER resumes   CLEAR quits']);
      else if (Games.state === 'over') band(c, [g.won ? 'YOU WIN' : 'GAME OVER', result, 'ENTER plays again']);
    },
    key() { return true; },
    leave() { Games.stop(); },
  };

  GX.Games = Games;
})(window.GX = window.GX || {});
