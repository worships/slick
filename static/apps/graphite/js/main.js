/* Graphite GX — key dispatch, navigation, render loop and startup. */
(function (GX) {
  'use strict';
  const { S, GEO, C, UI, KEYMAP, SCREENS, MENUS, toast, setScreen, drawStatus, tyOf } = GX;
  const { W, H } = GEO;
  let ctx = null, blinkTimer = null;
  GX.SC = 3;

  function go(name) {
    switch (name) {
      case 'graph': GX.graphNow(); return;
      case 'trace': if (GX.gotoGraph()) GX.startTrace(); return;
      case 'yeq': case 'window': case 'tblset': case 'mode': case 'format': case 'table': setScreen(name); return;
      default: if (MENUS[name]) GX.openMenu(name);
    }
  }
  function dispatch(act) {
    if (act.startsWith('na:')) toast(act.slice(3) + " isn't available on this calculator");
    else if (act.startsWith('msg:')) toast(act.slice(4));
    else if (act === 'off') { S.off = true; S.second = false; S.alpha = false; S.alock = false; }
    else if (act === 'rcl') { S.rcl = !S.rcl; if (S.rcl) toast('Rcl: pick a variable to paste its value'); }
    else if (act !== 'on') {
      if (act === 'clear') S.rcl = false;
      if (S.rcl && act.startsWith('ins:')) {
        S.rcl = false;
        const toks = GX.rclTokens(act.slice(4));
        if (toks) { toks.forEach(t => SCREENS[S.screen].key('ins:' + t)); S.lastAct = act; draw(); GX.save(); return; }
      }
      let handled = false;
      try {
        handled = SCREENS[S.screen].key(act);
        if (!handled && act === 'solve') handled = SCREENS[S.screen].key('enter');
      } catch (e) { console.error(e); handled = true; }
      if (!handled) {
        if (act === 'quit') setScreen('home');
        else if (act.startsWith('go:')) go(act.slice(3));
        else if (act.startsWith('ins:') && S.screen !== 'home' && S.screen !== 'game') { setScreen('home'); SCREENS.home.key(act); }
        else if (act === 'clear' && S.screen !== 'home') setScreen('home');
      }
    }
    S.lastAct = act;
    draw();
    GX.save();
  }
  // a calculator key was pressed: apply 2nd / ALPHA and dispatch the action
  function press(id) {
    const k = KEYMAP[id];
    if (!k) return;
    if (S.screen === 'game') { GX.Games.down(id); GX.Games.up(id); return; }
    resetBlink();
    if (S.off) { if (id === 'on') S.off = false; draw(); return; }
    if (S.screen === 'run' && GX.VM.rawKey(id)) { draw(); return; }
    if (id === '2nd') { S.second = !S.second; draw(); return; }
    if (id === 'alpha') {
      if (S.second) { S.second = false; S.alock = !S.alock; S.alpha = S.alock; }
      else if (S.alpha) { S.alpha = false; S.alock = false; }
      else S.alpha = true;
      draw();
      return;
    }
    const cat = S.screen === 'menu' && S.menu && S.menu.catalog;
    let act;
    if (S.second) { act = k.s || k.m; S.second = false; }
    else if (id === 'enter') act = S.alpha && !S.alock ? 'solve' : 'enter';
    else if (id === 'xt') act = 'ins:' + ({ FUNC: 'X', PAR: 'T', POL: 'θ' })[S.mode.graph];
    else if ((S.alpha || cat) && k.a) act = k.a;
    else act = k.m;
    if (!S.alock) S.alpha = false;
    if (!act) { draw(); return; }
    dispatch(act);
  }
  // a typed shortcut from the physical keyboard (bypasses 2nd/ALPHA)
  function typeAction(act) {
    if (S.off) return;
    resetBlink();
    S.second = false;
    if (!S.alock) S.alpha = false;
    dispatch(act);
  }
  // keyboard "-" means negative at the start of a number, subtract otherwise
  function smartMinus() {
    let ed = null, fresh = false;
    if (S.screen === 'home') ed = S.ed;
    else if (S.screen === 'yeq' && GX.YS.row >= 0) ed = { t: S.y[GX.YS.row].t, c: Math.max(0, GX.YS.c) };
    else if (S.screen === 'window' || S.screen === 'tblset') { ed = SCREENS[S.screen].ed(); fresh = SCREENS[S.screen].fresh(); }
    else if (S.screen === 'graph') ed = GX.G.input;
    else if (S.screen === 'solver' && GX.SV.page === 'eq') ed = GX.SV.ed;
    else if (S.screen === 'pedit') ed = { t: S.prgms[GX.PE.name][GX.PE.ln], c: GX.PE.c };
    else if (S.screen === 'run' && GX.VM.wait && GX.VM.wait.type === 'input') ed = GX.VM.wait.ed;
    else if (['listedit', 'matedit'].includes(S.screen)) return 'ins:⁻';
    if (!ed) return 'ins:-';
    if (fresh || ed.c === 0) return 'ins:⁻';
    return ['bin', 'lp', 'lb', 'lsq', 'comma', 'sto', 'neg', 'fn'].includes(tyOf(ed.t[ed.c - 1])) ? 'ins:⁻' : 'ins:-';
  }

  function resetBlink() {
    UI.blink = true;
    if (!ctx) return;
    clearInterval(blinkTimer);
    blinkTimer = setInterval(() => { UI.blink = !UI.blink; if (S.screen !== 'game') draw(); }, 520);
  }
  function draw() {
    if (!ctx) return;
    ctx.setTransform(GX.SC, 0, 0, GX.SC, 0, 0);
    if (S.off) { ctx.fillStyle = C.off; ctx.fillRect(0, 0, W, H); return; }
    ctx.fillStyle = C.lcd; ctx.fillRect(0, 0, W, H);
    try { SCREENS[S.screen].draw(ctx); } catch (e) { console.error(e); }
    drawStatus(ctx);
  }

  function boot() {
    const lcd = document.getElementById('lcd');
    ctx = lcd.getContext('2d');
    UI.live = true;
    const firstRun = !GX.loadState();
    GX.buildKeypad(document.getElementById('keys'));
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      GX.SC = Math.max(1, Math.min(5, Math.ceil((lcd.clientWidth || W) * dpr / W)));
      lcd.width = W * GX.SC;
      lcd.height = H * GX.SC;
      draw();
    };
    if (window.ResizeObserver) new ResizeObserver(resize).observe(lcd);
    window.addEventListener('resize', resize);
    resize();
    if (document.fonts) document.fonts.ready.then(draw);
    if (firstRun) toast('Tip: APPS has games, PRGM has programs');
    resetBlink();
    draw();
  }

  Object.assign(GX, { dispatch, press, typeAction, smartMinus, draw, go });
  if (typeof document !== 'undefined' && document.getElementById('lcd')) boot();
})(window.GX = window.GX || {});
