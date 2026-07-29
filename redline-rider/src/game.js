/* Reglas: fisica de la moto, trafico y puntuacion.

   Todo el riesgo se paga: la distancia da poco, adelantar da algo, y adelantar ROZANDO
   da mucho. Tres pases seguidos suben el multiplicador. Es lo que empuja al jugador a
   meterse entre los coches en vez de ir por el arcen. */

import { LANE_X, LANES, CLAMP_X, VIEW_Z, TRAFFIC_KINDS } from './world.js';
import { clamp, lerp } from './gfx.js';
import { state, bikeStats, finishRun } from './state.js';
import * as audio from './audio.js';

const KMH = 1 / 3.6;                        // km/h -> m/s
const GEARS = [2.80, 1.95, 1.55, 1.30, 1.13, 1.00];
const UPSHIFT = 0.90, DOWNSHIFT = 0.42;     // fracciones de zona roja
const SHIFT_TIME = 0.22;                    // corte de gas al cambiar
const TORQUE_TOP = 0.65;                    // par que queda al llegar a la zona roja
const ROLL_DRAG = 0.35;                     // rozamiento constante (rodadura + transmision)

const PLAYER_HALF_W = 0.275, PLAYER_HALF_L = 0.95;   // colisionador 0,55 x 1,90 m
const CLOSE_TIERS = [1.20, 0.80, 0.45];              // holgura lateral, de flojo a rasante
const CLOSE_POINTS = [25, 60, 140];
const COMBO_WINDOW = 2.0;
const BONUS_KMH = 100;

const TRAFFIC_MAX = 22;
const SPAWN_AHEAD = VIEW_Z - 20;
const TRAFFIC_KMH = { sedan:[75,105], suv:[70,98], van:[62,88], truck:[55,78], bus:[52,74] };

export class Game {
  constructor(world, hooks){
    this.world = world;
    this.hooks = hooks || {};
    this.mode = 'menu';
    this.keys = new Set();
    this.drag = null;
    this.pool = [];
    this.installInput(world.canvas);
  }

  /* ---------- entrada ---------- */
  installInput(cv){
    cv.addEventListener('pointerdown', e => {
      if (this.mode !== 'play') return;
      // mitad derecha acelera, mitad izquierda frena; arrastrar en cualquiera gira
      this.drag = { id:e.pointerId, x:e.clientX, side: e.clientX > cv.clientWidth * 0.5 ? 1 : -1 };
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    });
    cv.addEventListener('pointermove', e => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dx = e.clientX - this.drag.x;
      this.drag.x = e.clientX;
      const k = (14 / Math.max(240, cv.clientWidth)) * state.sens * (state.invert ? -1 : 1);
      this.steerInput = clamp(this.steerInput + dx * k, -1, 1);
    });
    const end = e => { if (this.drag && e.pointerId === this.drag.id) this.drag = null; };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);

    addEventListener('keydown', e => {
      this.keys.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP'){
        if (this.mode === 'play') this.hooks.onPause && this.hooks.onPause();
      }
      if (e.code === 'KeyH' && this.mode === 'play') audio.play('horn');
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  padState(){
    if (!navigator.getGamepads) return null;
    for (const p of navigator.getGamepads()){
      if (!p) continue;
      const ax = p.axes && p.axes.length ? p.axes[0] : 0;
      const rt = p.buttons && p.buttons[7] ? p.buttons[7].value : 0;
      const lt = p.buttons && p.buttons[6] ? p.buttons[6].value : 0;
      if (Math.abs(ax) > 0.12 || rt > 0.05 || lt > 0.05)
        return { steer: Math.abs(ax) > 0.12 ? ax : 0, throttle: rt, brake: lt };
    }
    return null;
  }

  /* ---------- ciclo ---------- */
  enterMenu(){
    this.mode = 'menu';
    this.clearTraffic();
    this.world.setEnv('sunset');
    this.world.setPlayerBike(bikeStats(state.bike).color);
    this.world.setRider(0, 0, 0, 0, 0);
    audio.engineStop();
  }

  start(env){
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
      return;
    }

    const pad = this.padState();
    let throttle = 0, brake = 0;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) throttle = 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) brake = 1;
    let steer = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) steer -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) steer += 1;
    if (pad){
      throttle = Math.max(throttle, pad.throttle);
      brake = Math.max(brake, pad.brake);
      if (pad.steer) steer = pad.steer;
    }
    if (steer) this.steerInput = clamp(this.steerInput + steer * dt * 4.5, -1, 1);
    else if (!this.drag) this.steerInput *= Math.exp(-6 * dt);   // se autocentra al soltar
    // al arrastrar con la mitad derecha se acelera, con la izquierda se frena
    if (this.drag) { if (this.drag.side > 0) throttle = 1; else brake = 1; }
    if (state.invert) steer = -steer;

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

    this.world.setRider(this.x, this.lean, this.speed / this.vMax, accel * 60, dec * 20);
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
          this.score += pts;
          this.cash += Math.round(pts / 6);
          audio.play('nearmiss', { vol: 0.5 + tier * 0.25, rate: 0.95 + Math.random() * 0.1 });
          this.world.addShake(0.12 + tier * 0.12);
          if (state.haptics && navigator.vibrate) try { navigator.vibrate(8 + tier * 8); } catch (e) {}
          this.hooks.onClose && this.hooks.onClose(tier, pts, mult);
        } else {
          this.score += 12;
          this.cash += 2;
          this.hooks.onOvertake && this.hooks.onOvertake();
        }
      }

      // luces de freno cuando el jugador se le echa encima
      if (v.obj.userData.halo)
        v.obj.userData.halo.material.opacity = this.world.env.night ? 0.85 : (dz > -20 && dz < 0 ? 0.5 : 0.15);

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

  pause(){ if (this.mode === 'play'){ this.mode = 'pause'; audio.engineStop(); audio.duck(true); } }
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
