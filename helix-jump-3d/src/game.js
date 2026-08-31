/* Reglas del juego. La pelota solo se mueve en vertical: se queda en el angulo frontal
   y es la torre la que gira, igual que en el original. */

import { TAU, norm2 } from './gfx.js';
import { makeLevel, solidAt, levelHFor, BALL_R } from './levelgen.js';
import { themeOf } from './palette.js';
import { state, save, bumpMissions, skinById } from './state.js';
import * as audio from './audio.js';

const FRONT = Math.PI / 2;
const GRAV = 66;
const BOUNCE = 15.5;            // altura de rebote ~1.8, siempre menor que la separacion
const VY_MAX = 26;              // velocidad terminal: sin ella la caida encadenada se descontrola
const TOL = 0.10;               // holgura angular de la pelota
const PICK_A = 0.30;            // apertura para recoger moneda o flecha
const FIRE_COMBO = 3;           // 3 anillos seguidos -> bola de fuego (como el original)

/* La bola de fuego se mide en PLATAFORMAS que puede romper, no en segundos. Por
   duracion se barria el nivel entero de una pasada; el original solo da invencibilidad
   "en el primer rebote". De base rompe una, y las mejoras suben esa cuenta.
   El temporizador solo evita que la carga quede colgada el resto del nivel. */
const FIRE_WINDOW = 5.0;
const ARROW_BONUS = 2;          // la flecha verde da algo mas que el combo

/** Plataformas que rompe la bola de fuego, segun la mejora comprada. */
const chargesFromUpgrade = () => Math.max(1, state.fireLevel | 0);

export class Game {
  constructor(world, hooks){
    this.world = world;
    this.hooks = hooks || {};
    this.mode = 'menu';
    this.rot = 0;
    this.rotVel = 0;
    this.drag = null;
    this.keys = new Set();
    this.t = 0;
    this.ball = { y:0, vy:0, squash:0 };
    this.installInput(world.canvas);
  }

  /* ---------- entrada ---------- */
  installInput(cv){
    cv.addEventListener('pointerdown', e => {
      if (this.mode !== 'play') return;
      this.drag = { id:e.pointerId, x:e.clientX };
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    });
    cv.addEventListener('pointermove', e => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dx = e.clientX - this.drag.x;
      this.drag.x = e.clientX;
      const k = (2.6 / Math.max(240, cv.clientWidth)) * Math.PI * state.sens * (state.invert ? -1 : 1);
      this.rot -= dx * k;
      this.rotVel = -dx * k * 13;
    });
    const end = e => { if (this.drag && e.pointerId === this.drag.id) this.drag = null; };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);

    addEventListener('keydown', e => {
      this.keys.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP'){
        if (this.mode === 'play') this.hooks.onPause && this.hooks.onPause();
      }
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  padAxis(){
    if (!navigator.getGamepads) return 0;
    for (const p of navigator.getGamepads()){
      if (!p) continue;
      let a = p.axes && p.axes.length ? p.axes[0] : 0;
      if (Math.abs(a) < 0.18) a = 0;
      if (p.buttons){
        if (p.buttons[14] && p.buttons[14].pressed) a = -1;
        if (p.buttons[15] && p.buttons[15].pressed) a = 1;
      }
      if (a) return a;
    }
    return 0;
  }

  /* ---------- ciclo de nivel ---------- */
  enterMenu(){
    this.mode = 'menu';
    this.level = state.level;
    this.world.setTheme(themeOf(this.level));
    this.data = makeLevel(this.level);
    this.world.build(this.data);
    this.world.setMenuMode(true);
    this.world.setSkin(skinById(state.skin));
    this.world.camY = -levelHFor(this.level) * 2.5;
  }

  startLevel(level){
    this.level = level;
    this.data = makeLevel(level);
    this.world.setTheme(themeOf(level));
    this.world.build(this.data);
    this.world.setMenuMode(false);
    this.world.setSkin(skinById(state.skin));
    this.world.setFire(false);

    this.rot = 0; this.rotVel = 0;
    this.ball.y = this.data.startH; this.ball.vy = 0; this.ball.squash = 0;
    this.world.setBall(this.ball.y, 0);
    this.world.camY = this.ball.y;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.cleared = 0;
    this.coins = 0;
    this.smashes = 0;
    this.fireT = 0;
    this.fireCharges = 0;
    this.hudAcc = 0;
    this.fires = 0;
    this.deathT = 0;
    this.mode = 'play';
    this.hooks.onHud && this.hooks.onHud(this.hudData());
    audio.play('portal');
  }

  hudData(){
    return {
      level: this.level, score: this.score, combo: this.combo,
      progress: this.cleared / Math.max(1, this.data.count),
      fire: this.fireCharges > 0, fireCharges: this.fireCharges,
      fireFrac: this.fireT / FIRE_WINDOW, coins: this.coins
    };
  }

  pause(){ if (this.mode === 'play'){ this.mode = 'pause'; audio.duck(true); } }
  resume(){ if (this.mode === 'pause'){ this.mode = 'play'; audio.duck(false); } }

  /* ---------- fisica y reglas ---------- */
  step(dt){
    this.t += dt;
    this.spin(dt);

    if (this.mode === 'menu'){
      this.rot += dt * 0.18;
      this.world.setRot(this.rot);
      this.world.ball.position.y = -levelHFor(this.level) * 2.5 + Math.sin(this.t * 0.25) * 1.4;
      return;
    }
    if (this.mode !== 'play'){
      if (this.mode === 'dead' || this.mode === 'win'){
        // la pelota sigue cayendo/asentandose para que la escena no quede congelada
        this.deathT += dt;
      }
      this.world.setRot(this.rot);
      return;
    }

    // los anillos con giro propio se mueven aunque el jugador no toque nada
    for (const r of this.data.rings) if (r.spin) r.offset = norm2(r.offset + r.spin * dt);
    this.world.syncRings(this.data.rings);
    this.world.setRot(this.rot);

    if (this.fireCharges > 0){
      this.fireT -= dt;
      // el medidor se vacia de forma continua, pero sin tocar el DOM 120 veces por segundo
      this.hudAcc += dt;
      if (this.hudAcc > 0.08 || this.fireT <= 0){
        this.hudAcc = 0;
        if (this.fireT <= 0) this.endFire();
        this.hooks.onHud && this.hooks.onHud(this.hudData());
      }
    }

    const b = this.ball;
    const speed = 1 + Math.min(0.35, (this.level - 1) / 26);
    const prevBottom = b.y - BALL_R;
    b.vy -= GRAV * speed * speed * dt;
    if (b.vy < -VY_MAX * speed) b.vy = -VY_MAX * speed;
    b.y += b.vy * dt;
    const bottom = b.y - BALL_R;
    const local = norm2(FRONT - this.rot);

    if (b.vy < 0){
      // meta: cruzarla hacia abajo completa el nivel
      if (this.data.goalY < prevBottom && this.data.goalY >= bottom){
        b.y = this.data.goalY + BALL_R;
        b.vy = 0;
        this.win();
        return;
      }
      for (const ring of this.data.rings){
        if (ring.y >= prevBottom || ring.y < bottom) continue;   // solo el cruce de este paso
        this.crossRing(ring, local);
        if (this.mode !== 'play') return;
        if (this.landed){ this.landed = false; break; }
      }
    }

    b.squash *= Math.exp(-9 * dt);
    this.world.setBall(b.y, b.squash);
  }

  /** Distancia angular mas corta entre dos angulos. El resto de JS conserva el signo,
      asi que restar angulos sin normalizar falla en cuanto uno es negativo. */
  static arcDist(a, b){
    const d = norm2(a - b);
    return Math.min(d, TAU - d);
  }

  crossRing(ring, local){
    // premios: estan en el hueco, se cogen al cruzar el plano del anillo
    for (const c of ring.coins){
      if (c.taken) continue;
      const d = Game.arcDist(local - ring.offset, c.a);
      if (d < PICK_A){
        this.world.takeCoin(c);
        this.coins++; this.score += 5;
        state.coins++; state.totals.coins++;
        bumpMissions('coins', 1);
        audio.play('coin');
        this.hooks.onHud && this.hooks.onHud(this.hudData());
      }
    }
    if (ring.arrow && !ring.arrow.taken){
      const d = Game.arcDist(local - ring.offset, ring.arrow.a);
      if (d < PICK_A){
        this.world.takeArrow(ring.arrow);
        this.igniteFire(chargesFromUpgrade() + ARROW_BONUS);
      }
    }

    const sg = solidAt(ring, local, TOL);

    if (sg && this.fireCharges > 0){
      // bola de fuego: gasta una carga, rompe la plataforma (roja incluida) y sigue cayendo
      this.fireCharges--;
      this.world.smashRing(ring, true);
      this.world.addShake(0.5);
      this.smashes++; this.score += 2;
      state.totals.smash++;
      bumpMissions('smash', 1);
      audio.play('smash');
      this.passRing(ring, false);
      if (state.haptics && navigator.vibrate) try { navigator.vibrate(18); } catch (e) {}
      if (this.fireCharges <= 0) this.endFire();
      this.hooks.onHud && this.hooks.onHud(this.hudData());
      return;
    }

    if (sg){
      this.ball.y = ring.y + BALL_R;
      if (sg.danger){ this.die(); return; }
      const speed = 1 + Math.min(0.35, (this.level - 1) / 26);
      this.ball.vy = BOUNCE * speed;
      this.ball.squash = 1;
      this.landed = true;

      if (this.combo >= 2){
        const bonus = this.combo * 2;
        this.score += bonus;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        state.totals.bestCombo = Math.max(state.totals.bestCombo, this.combo);
        bumpMissions('combo', this.combo);
        this.hooks.onCombo && this.hooks.onCombo(this.combo, bonus);
        audio.play('bounceHard');
        this.world.addShake(0.35 + this.combo * 0.06);
        this.world.addPunch(0.5);
      } else {
        audio.play('bounce', { rate: 0.94 + Math.random() * 0.12 });
        this.world.addShake(0.12);
      }
      if (state.haptics && navigator.vibrate) try { navigator.vibrate(this.combo >= 2 ? 24 : 10); } catch (e) {}
      this.combo = 0;
      this.hooks.onHud && this.hooks.onHud(this.hudData());
      return;
    }

    this.passRing(ring, true);
  }

  passRing(ring, countCombo){
    if (ring.passed) return;
    ring.passed = true;
    this.cleared++;
    this.score++;
    state.totals.rings++;
    bumpMissions('rings', 1);
    if (countCombo){
      this.combo++;
      audio.play('pass', { vol: 0.6 + Math.min(0.4, this.combo * 0.1) });
      if (this.combo === FIRE_COMBO) this.igniteFire(chargesFromUpgrade());
    }
    this.hooks.onHud && this.hooks.onHud(this.hudData());
  }

  endFire(){
    this.fireCharges = 0;
    this.fireT = 0;
    this.world.setFire(false);
    audio.fireLoop(false);
  }

  igniteFire(charges){
    const fresh = this.fireCharges <= 0;
    this.fireCharges = Math.max(this.fireCharges, charges);
    this.fireT = FIRE_WINDOW;
    this.world.setFire(true);
    if (fresh){
      this.fires++;
      state.totals.fire++;
      bumpMissions('fire', 1);
      audio.fireLoop(true);
      audio.play('smash', { vol:0.5, rate:1.3 });
      this.world.addShake(0.5);
      this.world.addPunch(0.8);
      this.hooks.onFire && this.hooks.onFire();
    }
    this.hooks.onHud && this.hooks.onHud(this.hudData());
  }

  spin(dt){
    let kv = 0;
    if (this.keys.has('ArrowLeft')  || this.keys.has('KeyA')) kv += 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) kv -= 1;
    const ax = this.padAxis();
    if (ax) kv -= ax;
    if (state.invert) kv = -kv;
    if (kv) this.rotVel = kv * 3.4 * state.sens;
    if (this.mode !== 'play') return;
    if (!this.drag){ this.rot += this.rotVel * dt; this.rotVel *= Math.exp(-6 * dt); }
    else this.rotVel *= Math.exp(-10 * dt);
  }

  die(){
    this.mode = 'dead';
    this.deathT = 0;
    this.ball.vy = 0;
    this.world.addShake(1.2);
    this.endFire();
    audio.play('die');
    audio.duck(true);
    if (state.haptics && navigator.vibrate) try { navigator.vibrate([0, 60, 40, 90]); } catch (e) {}
    const newBest = this.score > state.best;
    if (newBest) state.best = this.score;
    save();
    this.hooks.onDie && this.hooks.onDie({ score:this.score, best:state.best, newBest, level:this.level });
  }

  win(){
    this.mode = 'win';
    this.deathT = 0;
    this.endFire();
    audio.play('win');
    audio.duck(true);
    this.world.addShake(0.5);
    for (let i = 0; i < 3; i++) this.world.addPunch(0.4);
    const bonus = 25 + this.level * 5;
    this.score += bonus;
    const coinReward = 10 + this.level * 2;
    state.coins += coinReward;
    state.totals.levels++;
    state.totals.coins += coinReward;
    bumpMissions('levels', 1);
    bumpMissions('coins', coinReward);
    if (this.score > state.best) state.best = this.score;
    state.level = Math.max(state.level, this.level + 1);
    save();
    this.hooks.onWin && this.hooks.onWin({
      level:this.level, score:this.score, rings:this.cleared, coins:this.coins + coinReward,
      bonus, next:this.level + 1, ringsTotal:this.data.count
    });
  }
}
