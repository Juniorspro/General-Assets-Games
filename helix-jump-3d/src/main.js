/* Arranque: carga de assets -> idioma -> menu -> partida. */

import { load, save, state } from './state.js';
import { setLang, detectLang } from './i18n.js';
import * as audio from './audio.js';
import { World } from './world.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { themeOf } from './palette.js';

const FIXED = 1 / 120;

function boot(){
  load();
  setLang(state.lang || detectLang());
  // una pista guardada que no viaja en este build volveria muda: se cae a la que si esta
  if (!audio.trackAvailable(state.track)) state.track = audio.trackAvailable('aero') ? 'aero' : 'none';

  const canvas = document.getElementById('gl');
  let world;
  try {
    world = new World(canvas);
  } catch (e) {
    document.getElementById('nogl').style.display = 'grid';
    document.getElementById('ui').style.display = 'none';
    return;
  }
  world.setQuality(state.quality);
  world.setTheme(themeOf(state.level));

  const ui = new UI({});
  const game = new Game(world, {});
  ui.setAccent(themeOf(state.level).accent);

  /* ---------- flujo ---------- */
  const toMenu = () => {
    game.enterMenu();
    ui.setAccent(themeOf(state.level).accent);
    ui.show('menu');
    audio.playMusic('menu');
  };
  const startLevel = level => {
    ui.setAccent(themeOf(level).accent);
    game.startLevel(level);
    ui.show('game');
    audio.duck(false);
    audio.playMusic(state.track === 'none' ? null : state.track, 600);
  };

  ui.h = {
    onBootDone: () => { if (!state.lang) ui.show('lang'); else toMenu(); },
    onLangPicked: () => toMenu(),
    onPlay: () => startLevel(state.level),
    onPause: () => { game.pause(); ui.show('pause'); },
    onResume: () => { game.resume(); ui.show('game'); },
    onRestart: () => startLevel(game.level),
    onNext: () => startLevel(game.level + 1),
    onMenu: () => toMenu(),
    onSkin: skin => world.setSkin(skin),
    onQuality: q => world.setQuality(q),
    onTrack: track => { if (game.mode === 'play') audio.playMusic(track === 'none' ? null : track, 500); },
    onWipe: () => toMenu()
  };

  game.hooks = {
    onHud: d => ui.hud(d),
    onCombo: (n, bonus) => ui.combo(n, bonus),
    onFire: () => {},
    onPause: () => ui.h.onPause(),
    onDie: d => setTimeout(() => ui.showOver(d), 1000),
    onWin: d => setTimeout(() => ui.showWin(d), 900)
  };

  /* ---------- carga con progreso real ---------- */
  const tasks = audio.sfxTasks().concat(audio.musicTasks());
  tasks.push({ label:'scene', run: async () => {
    game.enterMenu();
    world.setMenuMode(true);
    world.warmup();                       // todas las variantes de shader, aqui y no en partida
    world.render();
  }});

  let done = 0;
  const total = tasks.length;
  ui.setProgress(0);

  const runAll = async () => {
    const queue = tasks.slice();
    const worker = async () => {
      while (queue.length){
        const task = queue.shift();
        try { await task.run(); } catch (e) { /* un asset que falle no bloquea el arranque */ }
        ui.setProgress(++done / total);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  };

  runAll().then(() => {
    ui.setProgress(1);
    ui.bootReady();
  });

  // gancho de pruebas: con ?debug=1 se puede pilotar el juego desde un script
  if (/[?&]debug=1/.test(location.search)) window.__hx = { game, world, ui, state, audio };

  /* ---------- bucle ---------- */
  let last = 0, acc = 0;
  const frame = ts => {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    // un frame largo recupera hasta 100 ms de simulacion; colapsarlo a un solo paso
    // congelaria el juego en cada tiron en vez de solo ralentizarlo
    if (dt > 0.1) dt = 0.1;
    acc = Math.min(0.2, acc + dt);
    while (acc >= FIXED){ game.step(FIXED); acc -= FIXED; }
    world.update(dt);
    world.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  addEventListener('resize', () => world.resize(), { passive:true });
  addEventListener('orientationchange', () => setTimeout(() => world.resize(), 150), { passive:true });
  document.addEventListener('visibilitychange', () => {
    last = 0; acc = 0;
    if (document.hidden && game.mode === 'play') ui.h.onPause();
  });
  addEventListener('pagehide', save);
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
