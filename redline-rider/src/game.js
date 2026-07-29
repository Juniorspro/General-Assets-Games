/* Reglas: fisica de la moto, trafico y puntuacion.

   Todo el riesgo se paga: la distancia da poco, adelantar da algo, y adelantar ROZANDO
   da mucho. Tres pases seguidos suben el multiplicador. Es lo que empuja al jugador a
   meterse entre los coches en vez de ir por el arcen. */

import { LANE_X, LANES, CLAMP_X, VIEW_Z, TRAFFIC_KINDS } from './world.js';
import { clamp, lerp } from './gfx.js';
import { state, bikeStats, finishRun } from './state.js';
import * as audio from './audio.js';
import * as controls from './controls.js';

const KMH = 1 / 3.6;                        // km/h -> m/s
const GEARS = [2.80, 1.95, 1.55, 1.30, 1.13, 1.00];
const UPSHIFT = 0.90, DOWNSHIFT = 0.42;     // fracciones de zona roja
const SHIFT_TIME = 0.22;                    // corte de gas al cambiar
const TORQUE_TOP = 0.65;                    // par que queda al llegar a la zona roja
const ROLL_DRAG = 0.35;                     // rozamiento constante (rodadura + transmision)

const PLAYER_HALF_W = 0.275, PLAYER_HALF_L = 0.95;   // colisionador 0,55 x 1,90 m
const CLOSE_TIERS = [1.20, 0.80, 0.45];              // holgura lateral, de flojo a rasante
const CLOSE_POINTS = [25, 60, 140];
/* Monedas por roce, por nivel de holgura. Antes salian de dividir los puntos entre 6, asi que
   el dinero era invisible: un roce flojo daba 4 monedas y no se anunciaba por ninguna parte.
   Ahora es una recompensa declarada, escalada por el multiplicador de combo igual que los
   puntos, porque arrimarse es LO que se quiere premiar. */
const CLOSE_CASH = [6, 16, 40];
const OVERTAKE_CASH = 2;
const COMBO_WINDOW = 2.0;
const BONUS_KMH = 100;

/* Camara lenta del choque. 0,28 es lo bastante lento para seguir el vuelo con la vista y lo
   bastante rapido para no aburrir; 1,1 s cubre el salto y el primer bote. */
const SLOWMO_SCALE = 0.28;
const SLOWMO_TIME = 1.1;

const TRAFFIC_MAX = 22;
const SPAWN_AHEAD = VIEW_Z - 20;
const TRAFFIC_KMH = { sedan:[75,105], suv:[70,98], van:[62,88], truck:[55,78], bus:[52,74] };

export class Game {
  constructor(world, hooks){
    this.world = world;
    this.hooks = hooks || {};
    this.mode = 'menu';
    this.pool = [];
    this.hornPrev = false;
    this.slowmo = 0;
    /* La entrada vive fuera, en controls.js. Aqui solo queda la pausa por teclado: el resto
       (teclado, mando, pedales, arrastre, giroscopio) escribe en un unico objeto y este
       modulo solo lo lee, de modo que anadir un esquema no toca la fisica. */
    addEventListener('keydown', e => {
      if ((e.code === 'Escape' || e.code === 'KeyP') && this.mode === 'play')
        this.hooks.onPause && this.hooks.onPause();
    });
  }

  /* ---------- ciclo ---------- */
  enterMenu(){
    this.mode = 'menu';
    controls.releaseAll();
    this.clearTraffic();
    this.world.setEnv('sunset');
    this.world.setPlayerBike(bikeStats(state.bike).color);
    this.world.setRider(0, 0, 0, 0, 0, 0);
    audio.engineStop();
  }

  start(env){
    /* Se toma la postura actual como centro al arrancar: el jugador sujeta el movil de una
       forma distinta cada partida, y calibrar solo una vez al conceder el permiso deja la
       moto tirando hacia un lado el resto de la sesion. */
    controls.calibrateGyro();
    controls.releaseAll();
    this.hornPrev = false;
    this.stats = bikeStats(state.bike);
    this.world.setEnv(env || 'day');
    this.world.setPlayerBike(this.stats.color);

    this.vMax = this.stats.topKmh * KMH;
    /* La resistencia se DERIVA de la punta de esta moto, no se codifica: con un
       coeficiente fijo el empuje disponible en sexta se queda por debajo del arrastre y
       la moto nunca alcanza los km/h que anuncia el garaje. Se deja empuje de sobra a
       velocidad punta y es el limite duro el que fija el techo. */
    const thrustTop = this.stats.amax * (GEARS[GEARS.length - 1] / GEARS[0]) * 2.2 * TORQUE_TOP;
    this.dragK = Math.max(1e-5, (thrustTop * 0.55 - ROLL_DRAG) / (this.vMax * this.vMax));
    this.speed = 12;                 // arranca rodando: entrar parado en una autopista es peor
    this.x = LANE_X[1];
    this.steerInput = 0;
    this.lean = 0;
    this.gear = 0;
    this.shiftT = 0;
    this.rpm = 0;

    this.distance = 0;
    this.score = 0;
    this.cash = 0;
    this.overtakes = 0;
    this.closes = 0;
    this.combo = 0;
    this.comboT = 0;
    this.bestCombo = 0;
    this.topKmh = 0;
    this.hudAcc = 0;
    this.deadT = 0;
    this.slowmo = 0;
    this.world.endCrash();

    this.clearTraffic();
    for (let i = 0; i < 10; i++) this.spawn(-40 - Math.random() * SPAWN_AHEAD);

    this.mode = 'play';
    audio.engineStart();
    this.pushHud();
  }

  /* ---------- trafico ---------- */
  clearTraffic(){
    for (const v of this.pool){ v.obj.visible = false; v.alive = false; }
  }

  spawn(z){
    const kind = TRAFFIC_KINDS[(Math.random() * TRAFFIC_KINDS.length) | 0];
    const lane = (Math.random() * LANES) | 0;
    const [lo, hi] = TRAFFIC_KMH[kind];
    const speed = lerp(lo, hi, Math.random()) * KMH;

    let v = this.pool.find(p => !p.alive && p.kind === kind);
    if (!v){
      if (this.pool.length >= TRAFFIC_MAX){
        v = this.pool.find(p => !p.alive);
        if (!v) return null;
        v.obj.parent.remove(v.obj);
        v.obj = this.world.spawnVehicle(kind, TINTS[(Math.random() * TINTS.length) | 0]);
        v.kind = kind;
      } else {
        v = { obj:this.world.spawnVehicle(kind, TINTS[(Math.random() * TINTS.length) | 0]), kind };
        this.pool.push(v);
      }
    }
    const size = v.obj.userData.size;
    v.alive = true;
    v.lane = lane;
    v.x = LANE_X[lane];
    v.z = z;
    v.speed = speed;
    v.halfW = size.wid / 2;
    v.halfL = size.len / 2;
    v.passed = false;
    v.scored = false;
    v.laneT = 2 + Math.random() * 6;    // cuenta para pensar un cambio de carril
    v.obj.visible = true;
    v.obj.position.set(v.x, 0, v.z);
    return v;
  }

  /** Un hueco libre para colocar un coche sin solaparlo con otro. */
  freeAt(z, lane, halfL){
    for (const v of this.pool){
      if (!v.alive || v.lane !== lane) continue;
      if (Math.abs(v.z - z) < (v.halfL + halfL + 12)) return false;
    }
    return true;
  }

  /* ---------- fisica ---------- */
  step(dt){
    if (this.mode === 'menu'){
      this.world.time += dt;
      return;
    }
    if (this.mode !== 'play'){
      this.deadT += dt;
      if (this.mode === 'dead') this.world.stepCrash(dt);
      return;
    }

    const throttle = controls.input.throttle;
    const brake = controls.input.brake;
    /* controls.input.steer ya es la posicion PEDIDA del manillar de -1 a 1, con la
       sensibilidad y la inversion aplicadas. Aqui solo se persigue con un limite de
       velocidad, para que el manillar tenga inercia y no salte de tope a tope. */
    const want = controls.input.steer;
    const rate = 5.5;
    this.steerInput = clamp(this.steerInput + clamp(want - this.steerInput, -rate * dt, rate * dt), -1, 1);

    if (controls.input.horn && !this.hornPrev) audio.play('horn');
    this.hornPrev = controls.input.horn;

    /* caja de cambios: la relacion define las revoluciones a esta velocidad, y el par
       cae al acercarse a la zona roja para que las marchas se noten */
    this.shiftT = Math.max(0, this.shiftT - dt);
    const ratio = GEARS[this.gear];
    const vGearMax = this.vMax / ratio * GEARS[GEARS.length - 1];
    this.rpm = clamp(this.speed / Math.max(0.5, vGearMax), 0, 1.05);
    if (this.shiftT <= 0){
      if (this.rpm > UPSHIFT && this.gear < GEARS.length - 1){ this.gear++; this.shiftT = SHIFT_TIME; }
      else if (this.rpm < DOWNSHIFT && this.gear > 0){ this.gear--; this.shiftT = SHIFT_TIME; }
    }
    const torque = this.shiftT > 0 ? 0 : (1 - Math.pow(clamp(this.rpm, 0, 1), 3) * (1 - TORQUE_TOP));
    const accel = throttle * this.stats.amax * ratio / GEARS[0] * 2.2 * torque;
    const drag = this.dragK * this.speed * this.speed + ROLL_DRAG;
    const dec = brake * this.stats.brake + (throttle > 0.05 ? 0 : this.stats.brake * 0.25);
    this.speed = clamp(this.speed + (accel - drag - dec) * dt, 0, this.vMax);

    const kmh = this.speed / KMH;
    this.topKmh = Math.max(this.topKmh, kmh);

    // el giro se estrecha con la velocidad: a 300 km/h no se cambia de carril de golpe
    const maxLat = lerp(9.0, 3.5, clamp((kmh - 60) / 270, 0, 1)) * this.stats.handling;
    const targetLat = this.steerInput * maxLat;
    const latLimit = (kmh < 80 ? 30 : 22) * dt;
    this.latV = clamp(targetLat, (this.latV || 0) - latLimit, (this.latV || 0) + latLimit);
    this.x = clamp(this.x + this.latV * dt, -CLAMP_X, CLAMP_X);
    this.lean = lerp(this.lean, clamp(this.latV / 9, -1, 1), 1 - Math.exp(-8 * dt));

    const advance = this.speed * dt;
    this.distance += advance;
    this.world.advance(advance);

    // puntos por distancia: por encima del umbral cada metro vale mas
    const spdBonus = kmh > BONUS_KMH ? 1 + (kmh - BONUS_KMH) / 160 : 0.45;
    this.score += advance * spdBonus * 0.6;

    this.updateTraffic(dt, advance);

    this.comboT -= dt;
    if (this.comboT <= 0 && this.combo > 0){ this.combo = 0; }

    this.world.setRider(this.x, this.lean, this.speed / this.vMax, throttle, brake, dt);
    audio.engine(this.rpm, this.speed / this.vMax, throttle);

    this.hudAcc += dt;
    if (this.hudAcc > 0.06){ this.hudAcc = 0; this.pushHud(); }
  }

  updateTraffic(dt, advance){
    const mult = 1 + Math.floor(this.combo / 3);
    for (const v of this.pool){
      if (!v.alive) continue;
      // el mundo se mueve hacia el jugador: los mas lentos retroceden en pantalla
      v.z += (this.speed - v.speed) * dt;

      // cambios de carril esporadicos, solo si el hueco esta libre
      v.laneT -= dt;
      if (v.laneT <= 0){
        v.laneT = 4 + Math.random() * 9;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const nl = v.lane + dir;
        if (nl >= 0 && nl < LANES && this.freeAt(v.z, nl, v.halfL)) v.lane = nl;
      }
      v.x = lerp(v.x, LANE_X[v.lane], 1 - Math.exp(-2.2 * dt));

      const dz = v.z;                       // el jugador esta en z=0
      const gap = Math.abs(this.x - v.x) - (PLAYER_HALF_W + v.halfW);

      // colision: solape en ambos ejes
      if (Math.abs(dz) < (PLAYER_HALF_L + v.halfL) && gap < 0){ this.crash(v); return; }

      // adelantamiento: el coche cruza de delante a detras del jugador
      if (!v.passed && dz > PLAYER_HALF_L + v.halfL){
        v.passed = true;
        this.overtakes++;
        let tier = -1;
        for (let i = CLOSE_TIERS.length - 1; i >= 0; i--) if (gap < CLOSE_TIERS[i]) { tier = i; break; }
        if (tier >= 0){
          this.closes++;
          this.combo++;
          this.comboT = COMBO_WINDOW;
          this.bestCombo = Math.max(this.bestCombo, this.combo);
          const pts = CLOSE_POINTS[tier] * mult;
          const coins = CLOSE_CASH[tier] * mult;
          this.score += pts;
          this.cash += coins;
          audio.play('nearmiss', { vol: 0.5 + tier * 0.25, rate: 0.95 + Math.random() * 0.1 });
          this.world.addShake(0.12 + tier * 0.12);
          if (state.haptics && navigator.vibrate) try { navigator.vibrate(8 + tier * 8); } catch (e) {}
          audio.play('coin', { vol: 0.5 + tier * 0.2 });
          this.hooks.onClose && this.hooks.onClose(tier, pts, mult, coins);
        } else {
          this.score += 12;
          this.cash += OVERTAKE_CASH;
          this.hooks.onOvertake && this.hooks.onOvertake();
        }
      }

      /* Pilotos siempre encendidos de noche; de dia solo frenan los que el jugador va a
         alcanzar de verdad, que es cuando la luz aporta informacion en vez de ruido. */
      if (v.obj.userData.halo){
        const closing = dz > -26 && dz < 0 && v.speed < this.speed * 0.92;
        v.obj.userData.halo.material.opacity =
          this.world.env.night ? 0.6 : (closing ? 0.34 : 0);
      }

      v.obj.position.set(v.x, 0, v.z);

      if (v.z > 40) v.alive = false, v.obj.visible = false;
    }

    // repone trafico por delante, siempre en huecos libres
    let live = 0;
    for (const v of this.pool) if (v.alive) live++;
    const want = 8 + Math.min(8, Math.floor(this.distance / 900));
    if (live < want){
      for (let tries = 0; tries < 6 && live < want; tries++){
        const lane = (Math.random() * LANES) | 0;
        const z = -SPAWN_AHEAD - Math.random() * 60;
        if (this.freeAt(z, lane, 7)){
          const v = this.spawn(z);
          if (v){ v.lane = lane; v.x = LANE_X[lane]; live++; }
        }
      }
    }
  }

  crash(v){
    this.mode = 'dead';
    this.deadT = 0;
    /* Sale despedido hacia el lado CONTRARIO al del obstaculo: si el coche estaba a la
       derecha, el piloto vuela a la izquierda. Salir hacia el coche con el que acabas de
       chocar no se entiende. */
    const side = this.x < v.x ? -1 : 1;
    this.world.startCrash(this.speed, side);
    /* Camara lenta en el impacto. Es lo que deja ver el golpe: a velocidad normal el vuelo
       entero dura menos de lo que tarda el ojo en encontrar la moto. */
    this.slowmo = SLOWMO_TIME;
    audio.engineStop();
    audio.play('crash');
    audio.duck(true);
    this.world.addShake(1.5);
    if (state.haptics && navigator.vibrate) try { navigator.vibrate([0, 90, 50, 140]); } catch (e) {}
    const cashRun = this.cash + Math.round(this.distance / 30);
    const r = {
      score: Math.round(this.score), distance: Math.round(this.distance),
      overtakes: this.overtakes, closes: this.closes, topKmh: Math.round(this.topKmh),
      combo: this.bestCombo, cash: cashRun
    };
    const rec = finishRun(r);
    this.hooks.onDead && this.hooks.onDead(r, rec);
  }

  /** Escala de tiempo del juego. Consume el reloj de camara lenta con dt REAL: si se
      alimentara con el dt ya escalado, la camara lenta se alargaria sola. */
  timeScale(dtReal){
    if (this.slowmo > 0){
      this.slowmo = Math.max(0, this.slowmo - dtReal);
      // arranca muy lento y vuelve a la normalidad de forma suave, no de golpe
      const k = this.slowmo / SLOWMO_TIME;
      return lerp(1, SLOWMO_SCALE, Math.min(1, k * 1.6));
    }
    return 1;
  }

  /* Al pausar hay que soltar los mandos a mano: si el dedo estaba en el gas cuando salta la
     pausa, el boton no recibe el pointerup y al reanudar la moto sale acelerando sola. */
  pause(){ if (this.mode === 'play'){ this.mode = 'pause'; controls.releaseAll(); audio.engineStop(); audio.duck(true); } }
  resume(){ if (this.mode === 'pause'){ this.mode = 'play'; audio.engineStart(); audio.duck(false); } }

  pushHud(){
    this.hooks.onHud && this.hooks.onHud({
      kmh: Math.round(this.speed / KMH), gear: this.gear + 1, rpm: this.rpm,
      distance: this.distance, score: Math.round(this.score),
      combo: this.combo, mult: 1 + Math.floor(this.combo / 3), cash: this.cash
    });
  }
}

/* Colores de carroceria: neutros apagados, como pide la formula de estilo. Solo la moto
   del jugador lleva naranja de senal, para que se distinga del trafico de un vistazo. */
const TINTS = [0x9aa3ad, 0x6d7683, 0xb8bcc2, 0x4a5260, 0x8d9098, 0xd7d9dc, 0x5d6470];
