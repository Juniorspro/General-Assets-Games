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
import { PLAYER_HALF_W, CLOSE_TIERS } from './game.js';

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
/* El esquema se resuelve CUANDO SE LLEGA al paso, no al empezar el tutorial. Al arrancar, el
   sensor puede no haber entregado todavia su primera lectura, y decidir ahi dejaba a un movil
   con giroscopio aprendiendo a girar con botones. Al llegar al cuarto paso ya han pasado varios
   segundos y el sensor ha contestado si existe. */
const steerScheme = () => controls.activeScheme();
const steerKey = () => {
  const s = steerScheme();
  return s === 'tilt' ? 'tut.steer.tilt' : s === 'buttons' ? 'tut.steer.buttons' : 'tut.steer.touch';
};
const steerHl = () => steerScheme() === 'buttons' ? 'p-left' : null;

function buildSteps(){
  /* CINCO pasos, no trece, y ninguno se pasa con un boton: cada uno espera la accion. Trece
     mensajes seguidos se leen como una charla y el jugador aprende a cerrarlos sin mirarlos;
     lo que hay que dejar claro es como se mueve la moto y de que se saca dinero, y el resto se
     descubre jugando. El combo, el claxon, las revoluciones y el garaje se cayeron de aqui a
     proposito: ninguno hace falta para dar la primera vuelta.

     El unico paso sin accion es la despedida, y se va sola pasado un rato: un boton para
     cerrarla volveria a meter el boton por la puerta de atras. */
  /* El orden es gas, direccion, freno, roce. La direccion va ANTES del freno a proposito: con el
     freno en medio, el jugador aplicado llega al cambio de carril casi parado, y aprender a
     cambiar de carril con la moto detenida no se parece a nada de lo que va a hacer despues. */
  return [
    { pose:'senala', key:'tut.gas', hl:'p-gas', traffic:false,
      done: g => g.speed > 55 * KMH },

    { pose:'explica', key:steerKey, hl:steerHl, traffic:false,
      /* Se pide llegar a un carril distinto del inicial, no solo mover el manillar: girar un
         instante y volver no ensena a cambiar de carril. */
      setup: g => {
        g.tutLane = laneOf(g.x);
        // con giroscopio se retoma el centro aqui: es el momento en que el jugador va a inclinar
        if (steerScheme() === 'tilt') controls.calibrateGyro();
      },
      done: g => laneOf(g.x) !== g.tutLane },

    { pose:'senala', key:'tut.brake', hl:'p-brake', traffic:false,
      done: g => g.speed < 25 * KMH },

    /* Roce. Un solo coche, en el carril de al lado, CERCA y bastante mas lento.
       Ponerlo a 45 m y solo un 18% mas lento obligaba a perseguirlo unos 13 s de juego, y con
       la camara lenta de este paso mas de 20 s reales: un paso que se pasa esperando aburre. */
    { pose:'senala', key:'tut.close', traffic:false, slow:0.55,
      setup: (g, w) => {
        g.clearTraffic();
        g.tutCloses = g.closes;
        /* Este paso MONTA una escena, y tiene que montarla entera. El paso anterior es el freno,
           asi que aqui se llega casi parado; se devuelve la velocidad de marcha con la que
           arranca cualquier partida. Sin esto el coche sale por delante y no se le alcanza. */
        g.speed = Math.max(g.speed, 16);
        const mio = laneOf(g.x);
        const v = g.spawn(-22);
        if (v){
          v.lane = mio === 0 ? 1 : mio - 1;
          v.z = -22;
          /* La velocidad del coche se DERIVA de la del jugador. Con el suelo fijo de 12 m/s que
             habia antes, el coche corria mas que un jugador recien frenado y se escapaba: el paso
             no se podia terminar, solo perseguir. */
          v.speed = Math.max(3, g.speed * 0.5);
          v.laneT = 1e9;                       // que no cambie de carril mientras se explica

          /* El coche se ARRIMA al jugador dentro de su carril. Puesto en el centro del carril de
             al lado la holgura es de 2,4 m y el umbral de roce mas flojo es de 1,20: el paso
             contaba como adelantamiento, nunca como roce, y no habia forma de terminarlo sin
             salirse del carril. Se deja a tres cuartos del primer umbral, asi que pasar de largo
             ya cuenta y arrimarse aun mas sube de nivel. */
          /* La referencia es la x REAL del jugador, no el centro de su carril: el paso anterior es
             el cambio de carril y lo deja donde lo deje, hasta a 1,8 m del centro. Midiendo desde
             el centro, la holgura montada podia salir del doble de la pedida. */
          const centro = PLAYER_HALF_W + v.halfW + CLOSE_TIERS[0] * 0.75;
          const objetivo = g.x + (v.lane < mio ? -centro : centro);
          v.xOff = objetivo - LANE_X[v.lane];
          v.x = objetivo;
          v.obj.position.set(v.x, 0, v.z);
        }
      },
      done: g => g.closes > g.tutCloses },

    { pose:'celebra', key:'tut.done', traffic:true, dwell:3.2 }
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
    if (this.curHl) this.ui.highlight(null);
    this.i++;
    if (this.i >= this.steps.length){ this.finish(); return; }
    const s = this.step;
    this.holdT = 0;
    this.met = false;
    const key = typeof s.key === 'function' ? s.key() : s.key;
    const hl = typeof s.hl === 'function' ? s.hl() : s.hl;
    this.curHl = hl;
    /* El trafico se apaga en los pasos que ensenan a moverse: morir mientras te explican como
       acelerar convence al jugador de que el juego es injusto, no de que tiene que aprender. */
    this.game.tutNoTraffic = !s.traffic;
    if (!s.traffic) this.game.clearTraffic();
    if (s.setup) s.setup(this.game, this.world);
    /* Los mandos se repintan en cada paso: si el sensor contesta a mitad del tutorial, las
       flechas tienen que desaparecer en ese momento, no al terminar. */
    this.ui.paintPedals();
    this.ui.tutorial({
      pose: s.pose,
      text: t(key),
      n: this.i + 1,
      total: this.steps.length,
      /* Los pasos con condicion no ensenan boton: el boton los dejaria saltar sin hacer la
         accion, que es justo lo que se quiere evitar. */
      manual: !s.done
    });
    if (hl) this.ui.highlight(hl);
  }

  /** Escala de tiempo que pide el paso activo, para la camara lenta didactica. */
  timeScale(){
    const s = this.step;
    return this.active && s && s.slow ? s.slow : 1;
  }

  update(dt){
    if (!this.active) return;
    const s = this.step;
    if (!s) return;
    /* Paso sin accion: se va solo pasado su tiempo. Es la unica forma de cerrar un mensaje sin
       accion sin volver a poner un boton. */
    if (!s.done){
      if (!s.dwell) return;
      this.holdT += dt;
      if (this.holdT > s.dwell) this.next();
      return;
    }
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
