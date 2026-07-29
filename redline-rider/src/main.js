/* Arranque: carga de assets -> idioma -> calidad -> menu -> conducir. */

import { load, save, state } from './state.js';
import { setLang, detectLang, t } from './i18n.js';
import * as audio from './audio.js';
import { World } from './world.js';
import { Game } from './game.js';
import { UI } from './ui.js';

const FIXED = 1 / 120;

function boot(){
  load();
  setLang(state.lang || detectLang());

  const canvas = document.getElementById('gl');
  let world;
  try {
    world = new World(canvas);
  } catch (e) {
    document.getElementById('nogl').style.display = 'grid';
    document.getElementById('ui').style.display = 'none';
    return;
  }
  world.setQuality(state.quality || 'high');

  const ui = new UI({});
  const game = new Game(world, {});

  /* ---------- flujo ---------- */
  const toMenu = () => {
    game.enterMenu();
    ui.show('menu');
    audio.playMusic('menu');
  };
  const ride = () => {
    // el ambiente rota por partida para que no sea siempre la misma autopista
    const envs = ['day', 'sunset', 'night'];
    game.start(envs[state.runs % envs.length]);
    ui.show('game');
    audio.playMusic(null, 500);
    audio.duck(false);
  };

  ui.h = {
    onBootDone: () => {
      if (!state.lang) ui.show('lang');
      else if (!state.quality) ui.show('quality');
      else toMenu();
    },
    onLangPicked: () => { if (!state.quality) ui.show('quality'); else toMenu(); },
    onQualityPicked: () => { if (ui.screen === 'quality') toMenu(); },
    onPlay: () => ride(),
    onPause: () => { game.pause(); ui.show('pause'); },
    onResume: () => { game.resume(); ui.show('game'); },
    onRestart: () => ride(),
    onMenu: () => toMenu(),
    onQuality: q => world.setQuality(q),
    onBike: () => { game.enterMenu(); ui.refreshGarage(); },
    onWipe: () => toMenu()
  };

  game.hooks = {
    onHud: d => ui.hud(d),
    onPause: () => ui.h.onPause(),
    onClose: (tier, pts) => ui.popup(t('hud.close'), pts),
    onOvertake: () => {},
    onDead: (r, rec) => setTimeout(() => ui.showResults(r, rec), 1100)
  };

  /* ---------- carga con progreso real ---------- */
  // la musica no bloquea: son megas frente a los kilobytes de los efectos
  audio.preloadMusic();
  const tasks = audio.sfxTasks().concat(world.modelTasks());
  tasks.push({ label:'scene', run: async () => {
    game.enterMenu();
    world.warmup();
    world.render();
  }});

  let done = 0;
  const total = tasks.length;
  ui.setProgress(0);

  (async () => {
    const queue = tasks.slice();
    const worker = async () => {
      while (queue.length){
        const task = queue.shift();
        try { await task.run(); } catch (e) { /* un asset que falle no bloquea el arranque */ }
        ui.setProgress(++done / total);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    ui.setProgress(1);
    ui.bootReady();
  })();

  // gancho de pruebas: con ?debug=1 se puede pilotar desde un script
  if (/[?&]debug=1/.test(location.search)) window.__rr = { game, world, ui, state, audio };

  /* ---------- bucle ---------- */
  let last = 0, acc = 0;
  const frame = ts => {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    // un frame largo recupera hasta 100 ms; colapsarlo a un paso congelaria el juego
    if (dt > 0.1) dt = 0.1;
    acc = Math.min(0.2, acc + dt);
    while (acc >= FIXED){ game.step(FIXED); acc -= FIXED; }
    world.update(dt, game.speed ? game.speed / game.vMax : 0);
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
