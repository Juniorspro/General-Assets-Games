/* Tutorial guiado por Rezona saur.

   Se juega DENTRO de la partida de verdad, no en una pantalla aparte con dibujos: cada paso
   pide una accion real y no avanza hasta que el jugador la hace. Un tutorial que solo se lee
   se salta, y lo que ensena no se queda.

   Tres cosas que decide este modulo y conviene tener juntas:

   - El paso de direccion depende del esquema ACTIVO. Explicar "arrastra el dedo" a alguien que
     tiene el giroscopio puesto es peor que no explicar nada, asi que el texto y la condicion
     se eligen con controls.activeScheme().
   - Los pasos que ensenan algo que pasa rapido (el roce, el peligro) bajan el tiempo del juego
     mientras se explican. A velocidad normal el momento que hay que ver dura menos de lo que
     tarda la vista en encontrarlo.
   - El trafico se APAGA en los pasos de gas, freno y direccion. Morir mientras te explican como
     acelerar deja al jugador convencido de que el juego es injusto. */

import { t } from './i18n.js';
import { state, save } from './state.js';
import * as controls from './controls.js';
import { LANE_X } from './world.js';

/* Poses disponibles del personaje. Los nombres son los ficheros de assets/img/dino. */
export const POSES = ['hola', 'senala', 'celebra', 'alerta', 'explica'];

const KMH = 1 / 3.6;

/* Cada paso declara:
     pose     cual de las cinco poses acompana el texto
     key      clave de i18n del texto
     hl       id del mando que se resalta, si alguno
     slow     escala de tiempo mientras el paso esta activo (1 = normal)
     traffic  si hay trafico durante el paso
     setup    preparacion de la escena
     done     condicion para pasar al siguiente; si falta, se pasa con el boton
   El orden es el de aprendizaje: primero moverse, luego puntuar, luego el peligro. */
function buildSteps(){
  const scheme = controls.activeScheme();
  const steerKey = scheme === 'tilt' ? 'tut.steer.tilt'
                 : scheme === 'buttons' ? 'tut.steer.buttons'
                 : 'tut.steer.touch';
  const steerHl = scheme === 'buttons' ? 'p-left' : null;

  return [
    { pose:'hola', key:'tut.hello', traffic:false },

    { pose:'senala', key:'tut.gas', hl:'p-gas', traffic:false,
      done: g => g.speed > 55 * KMH },

    { pose:'senala', key:'tut.brake', hl:'p-brake', traffic:false,
      done: g => g.speed < 25 * KMH },

    { pose:'explica', key:steerKey, hl:steerHl, traffic:false,
      /* Se pide llegar a un carril distinto del inicial, no solo mover el manillar: girar un
         instante y volver no ensena a cambiar de carril. */
      setup: g => { g.tutLane = laneOf(g.x); },
      done: g => laneOf(g.x) !== g.tutLane },

    { pose:'explica', key:'tut.lanes', traffic:false,
      done: g => g.speed > 70 * KMH },

    /* Roce. Un solo coche, en el carril de al lado, CERCA y bastante mas lento.
       La primera version lo ponia a 45 m y solo un 18% mas lento que el jugador: alcanzarlo
       llevaba unos 13 s de juego y, con la camara lenta de este paso, mas de 20 s reales. Un
       paso de tutorial que se pasa esperando no ensena, aburre. A 20 m y al 55% de la
       velocidad del jugador el adelantamiento llega en un par de segundos. */
    { pose:'senala', key:'tut.close', traffic:false, slow:0.55,
      setup: (g, w) => {
        g.clearTraffic();
        g.tutCloses = g.closes;
        const v = g.spawn(-20);
        if (v){
          v.lane = laneOf(g.x) === 0 ? 1 : laneOf(g.x) - 1;
          v.x = LANE_X[v.lane];
          v.z = -20;
          v.speed = Math.max(12, g.speed * 0.55);
          v.laneT = 1e9;                       // que no cambie de carril mientras se explica
          v.obj.position.set(v.x, 0, v.z);
        }
      },
      done: g => g.closes > g.tutCloses },

    { pose:'celebra', key:'tut.coins', traffic:false },

    { pose:'explica', key:'tut.combo', traffic:true },

    { pose:'senala', key:'tut.horn', hl:'p-horn', traffic:true,
      done: () => controls.input.horn },

    /* Peligro. No se provoca un choque: se ensena la distancia a la que ya no se puede
       esquivar, en camara lenta, y se deja al jugador salir de ahi. */
    { pose:'alerta', key:'tut.danger', traffic:false, slow:0.4,
      setup: g => {
        g.clearTraffic();
        const v = g.spawn(-28);
        if (v){
          v.lane = laneOf(g.x);
          v.x = LANE_X[v.lane];
          v.z = -28;
          v.speed = Math.max(10, g.speed * 0.45);   // mas lento: se le echa encima
          v.laneT = 1e9;
          v.obj.position.set(v.x, 0, v.z);
        }
      } },

    { pose:'explica', key:'tut.rpm', traffic:true },
    { pose:'explica', key:'tut.cash', traffic:true },
    { pose:'celebra', key:'tut.done', traffic:true }
  ];
}

const laneOf = x => {
  let best = 0;
  for (let i = 1; i < LANE_X.length; i++)
    if (Math.abs(x - LANE_X[i]) < Math.abs(x - LANE_X[best])) best = i;
  return best;
};

export class Tutorial {
  constructor(game, world, ui){
    this.game = game;
    this.world = world;
    this.ui = ui;
    this.active = false;
    this.i = 0;
    this.steps = [];
    this.holdT = 0;
    this.met = false;
  }

  start(){
    this.steps = buildSteps();
    this.active = true;
    this.i = -1;
    this.next();
  }

  get step(){ return this.steps[this.i] || null; }

  next(){
    const prev = this.step;
    if (prev && prev.hl) this.ui.highlight(null);
    this.i++;
    if (this.i >= this.steps.length){ this.finish(); return; }
    const s = this.step;
    this.holdT = 0;
    this.met = false;
    /* El trafico se apaga en los pasos que ensenan a moverse: morir mientras te explican como
       acelerar convence al jugador de que el juego es injusto, no de que tiene que aprender. */
    this.game.tutNoTraffic = !s.traffic;
    if (!s.traffic) this.game.clearTraffic();
    if (s.setup) s.setup(this.game, this.world);
    this.ui.tutorial({
      pose: s.pose,
      text: t(s.key),
      n: this.i + 1,
      total: this.steps.length,
      /* Los pasos con condicion no ensenan boton: el boton los dejaria saltar sin hacer la
         accion, que es justo lo que se quiere evitar. */
      manual: !s.done
    });
    if (s.hl) this.ui.highlight(s.hl);
  }

  /** Escala de tiempo que pide el paso activo, para la camara lenta didactica. */
  timeScale(){
    const s = this.step;
    return this.active && s && s.slow ? s.slow : 1;
  }

  update(dt){
    if (!this.active) return;
    const s = this.step;
    if (!s || !s.done) return;
    /* La condicion se ENGANCHA en cuanto se cumple una vez, y a partir de ahi corre el margen.
       Exigir que siga cumpliendose durante el margen rompe cualquier accion momentanea: el
       claxon solo esta pulsado un instante, asi que el jugador lo tocaba, no pasaba nada, y el
       paso se quedaba muerto. Tambien evita que soltar el gas justo al llegar a la velocidad
       pedida deshaga un paso ya logrado. */
    if (!this.met && s.done(this.game, this.world)) this.met = true;
    if (!this.met) return;
    /* Medio segundo de margen antes de pasar: encadenar el paso siguiente en el mismo instante
       en que se logra el anterior no deja ver que se ha logrado. */
    this.holdT += dt;
    if (this.holdT > 0.5) this.next();
  }

  finish(){
    this.active = false;
    this.game.tutNoTraffic = false;
    this.ui.highlight(null);
    this.ui.tutorial(null);
    state.tutorialDone = true;
    save();
    this.game.enterMenu();
    this.ui.show('menu');
  }

  skip(){ this.finish(); }
}
