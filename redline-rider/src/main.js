/* Arranque: carga de assets -> idioma -> calidad -> menu -> conducir. */

import { load, save, state } from './state.js';
import { setLang, detectLang, t } from './i18n.js';
import * as audio from './audio.js';
import * as controls from './controls.js';
import { World } from './world.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { Tutorial } from './tutorial.js';

const FIXED = 1 / 120;

function boot(){
  load();
  setLang(state.lang || detectLang());

  /* El escenario se coloca ANTES de crear el mundo: three.js mide el lienzo en su
     constructor, y si todavia no se ha girado el envoltorio mide al reves y arranca con la
     relacion de aspecto cambiada. */
  controls.setStage(document.getElementById('stage'));
  controls.layoutStage();

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

  controls.install(canvas);
  const ui = new UI({});
  const game = new Game(world, {});
  const tut = new Tutorial(game, world, ui);

  /* El esquema NO se resuelve aqui. Escribirlo en el estado lo persistia como si lo hubiera
     elegido el jugador, contra lo que dice el comentario de state.js: un movil que arranco sin
     permiso de sensor se quedaba con 'touch' guardado para siempre y el aparato no volvia a
     opinar nunca. Se deja en null y lo resuelve activeScheme() en cada arranque. */

  /* ---------- flujo ---------- */
  const toMenu = () => {
    game.enterMenu();
    ui.show('menu');
    audio.playMusic('menu');
  };
  /* El tutorial se juega DENTRO de una partida real, con el trafico gobernado por cada paso.
     Se arranca la partida primero y el tutorial despues, porque los pasos preparan la escena. */
  const teach = () => {
    game.start('day');
    ui.show('game');
    audio.playMusic(null, 400);
    audio.duck(false);
    tut.start();
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
      /* Este es el primer gesto real del jugador, y el unico sitio desde el que iOS acepta
         conceder el giroscopio. Si lo deniega, activeScheme() cae a arrastre por su cuenta. */
      if (controls.activeScheme() === 'tilt' || controls.defaultScheme() === 'tilt')
        controls.enableGyro().catch(() => {});
      if (!state.lang) ui.show('lang');
      else if (!state.quality) ui.show('quality');
      else if (!state.tutorialDone) teach();
      else toMenu();
    },
    onLangPicked: () => { if (!state.quality) ui.show('quality'); else toMenu(); },
    onQualityPicked: () => { if (ui.screen === 'quality'){ if (state.tutorialDone) toMenu(); else teach(); } },
    onPlay: () => ride(),
    onPause: () => { game.pause(); ui.show('pause'); },
    onResume: () => { game.resume(); ui.show('game'); },
    onRestart: () => ride(),
    onMenu: () => toMenu(),
    onQuality: q => world.setQuality(q),
    onBike: () => { game.enterMenu(); ui.refreshGarage(); },
    onWipe: () => toMenu(),
    onTutorial: () => teach(),
    onTutSkip: () => tut.skip()
  };

  game.hooks = {
    onHud: d => ui.hud(d),
    onPause: () => ui.h.onPause(),
    onClose: (tier, pts, mult, coins) => { ui.popup(t('hud.close'), pts); ui.coins(coins); },
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
  if (/[?&]debug=1/.test(location.search)) window.__rr = { game, world, ui, state, audio, controls, tut };

  /* ---------- bucle ---------- */
  let last = 0, acc = 0;
  const frame = ts => {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    // un frame largo recupera hasta 100 ms; colapsarlo a un paso congelaria el juego
    if (dt > 0.1) dt = 0.1;
    /* La entrada se resuelve UNA vez por fotograma, no por paso de fisica: el suavizado del
       giroscopio va en segundos reales y aplicarlo 120 veces por fotograma lo dispararia. */
    controls.update(dt);
    ui.tilt(controls.input.tiltDeg, controls.gyroLive());
    /* La camara lenta escala el tiempo del JUEGO, no el del bucle: la entrada y la interfaz
       siguen en tiempo real, que es lo que hace que responda igual de bien durante el efecto. */
    /* Se toma la MENOR de las dos escalas: si el tutorial pide camara lenta y encima hay un
       choque, manda la mas lenta, no el producto, que hundiria el juego casi a parado. */
    const scale = Math.min(game.timeScale(dt), tut.timeScale());
    const gdt = dt * scale;
    acc = Math.min(0.2, acc + gdt);
    while (acc >= FIXED){ game.step(FIXED); acc -= FIXED; }
    tut.update(gdt);
    world.update(gdt, game.speed ? game.speed / game.vMax : 0);
    world.render();
    ui.crashFx(world.crashBlur(), world.crashPhase());
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  const relayout = () => { controls.layoutStage(); world.resize(); };
  addEventListener('resize', relayout, { passive:true });
  /* orientationchange se dispara ANTES de que el navegador actualice clientWidth y
     clientHeight, y iOS anima la barra de herramientas durante un rato despues. Una sola
     medida en el evento devuelve el tamano viejo, asi que se repite en cascada. */
  addEventListener('orientationchange', () => {
    requestAnimationFrame(relayout);
    for (const ms of [60, 200, 450, 800]) setTimeout(relayout, ms);
  }, { passive:true });
  if (window.visualViewport) visualViewport.addEventListener('resize', relayout);
  document.addEventListener('visibilitychange', () => {
    last = 0; acc = 0;
    controls.releaseAll();
    if (document.hidden && game.mode === 'play') ui.h.onPause();
  });
  addEventListener('pagehide', save);
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
