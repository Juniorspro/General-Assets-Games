/* Misión 1: encontrar la llave y salir de la casa antes de que la vieja te
   agarre. Jugador en primera persona; la vieja patrulla, sospecha y persigue. */
import * as THREE from 'three';
import { clamp, lerp, sat, Rng, noise1 } from './core.js';
import { CELL, WALL_H, ROOMS, EXIT, toWorld, toCell, isSolid, collide, findPath, hasLineOfSight } from './house.js';

const EYE = 1.62, CROUCH_EYE = 1.02;
const WALK = 2.5, RUN = 4.5, CROUCH_SPD = 1.35;
const LADY_PATROL = 1.25, LADY_CHASE = 3.15, LADY_HUNT = 2.1;
const CATCH_DIST = 0.95;
const KEY_ROOMS = ['dormitorio', 'deposito', 'despensa'];

export class Escape {
    constructor(game) {
        this.g = game;
        this.active = false;
        this.rng = new Rng((Date.now() & 0xffff) | 1);
        this.keys = {};
        this.yaw = 0; this.pitch = 0;
        this.stamina = 1; this.crouching = false;
        this.hasKey = false; this.won = false; this.lost = false;
        this.noise = 0;
        this.bindInput();
    }

    bindInput() {
        const dn = e => {
            this.keys[e.code] = true;
            if (e.code === 'KeyE') this.tryInteract();
            if (e.code === 'KeyR' && (this.lost || this.won)) this.restart();
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
        };
        const up = e => { this.keys[e.code] = false };
        addEventListener('keydown', dn); addEventListener('keyup', up);

        const canvas = this.g.engine.renderer.domElement;
        canvas.addEventListener('click', () => {
            if (this.active && !this.won && !this.lost && document.pointerLockElement !== canvas) canvas.requestPointerLock();
        });
        addEventListener('mousemove', e => {
            if (!this.active || document.pointerLockElement !== canvas) return;
            this.yaw -= e.movementX * 0.0022;
            this.pitch = clamp(this.pitch - e.movementY * 0.0022, -1.15, 1.15);
        });
    }

    /* Coloca al jugador, la llave y la vieja, y arranca la mision. */
    begin() {
        const g = this.g;
        this.active = true;
        this.won = this.lost = false;
        this.hasKey = false;
        this.stamina = 1;
        this.noise = 0;

        const [px, pz] = toWorld(4, 13);
        this.pos = new THREE.Vector3(px, 0, pz);
        this.yaw = Math.PI; this.pitch = 0;
        this.vel = new THREE.Vector3();

        // la llave cae en una de tres piezas, distinta en cada partida
        const room = this.rng.pick(KEY_ROOMS);
        const spot = g.house.randomSpotIn(room, this.rng);
        this.keyRoom = room;
        this.keyPos = new THREE.Vector3(spot.pos[0], 0.55, spot.pos[1]);
        g.keyMesh.position.copy(this.keyPos);
        g.keyMesh.visible = true;

        // la vieja arranca lejos, en el cuarto del fondo
        const ls = g.house.randomSpotIn('bano', this.rng);
        this.lady = {
            pos: new THREE.Vector3(ls.pos[0], 0, ls.pos[1]),
            state: 'patrol', path: null, node: 0, think: 0, yaw: 0, target: null, lostT: 0,
        };
        g.lady.root.visible = true;
        g.lady.play('walk', { fade: 0.2 });

        g.house.openExit(0);
        g.hud.set({
            hudOn: true, skipOn: false, cardOn: false, fade: 0, blur: 0, lids: 0, vignette: 0.5,
            obj: 'Encontrá la llave — la puerta está clavada',
            hasKey: false, stamina: 1, prompt: '',
        });
        g.audio.playAmbience(0.42);
    }

    restart() {
        this.g.hud.set({ cardOn: false, fade: 0 });
        this.begin();
    }

    tryInteract() {
        if (!this.active || this.won || this.lost) return;
        const g = this.g;
        if (!this.hasKey && this.pos.distanceTo(this.keyPos) < 1.5) {
            this.hasKey = true;
            g.keyMesh.visible = false;
            g.house.unboard();
            g.audio.pickup();
            g.hud.set({ hasKey: true, obj: 'Salí por la puerta del frente', prompt: '' });
            return;
        }
        const ex = g.house.exitPos;
        if (this.hasKey && this.pos.distanceTo(ex) < 2.2) this.escape();
    }

    escape() {
        this.won = true;
        this.active = false;
        document.exitPointerLock?.();
        this.g.house.openExit(1);
        this.g.audio.doorOpen();
        this.g.hud.set({
            cardOn: true, cardTitle: 'ESCAPASTE', cardSub: 'Misión 1 completada — R para volver a jugar',
            prompt: '', obj: '',
        });
    }

    caught() {
        this.lost = true;
        this.active = false;
        document.exitPointerLock?.();
        this.g.audio.scream();
        this.g.engine.shake(0.4, 0.9);
        this.g.hud.set({
            cardOn: true, cardTitle: 'TE AGARRÓ', cardSub: 'R para intentarlo de nuevo',
            prompt: '', obj: '',
        });
    }

    update(dt, t) {
        const g = this.g, cam = g.engine.camera;
        g.house.flicker(t);
        if (this.won || this.lost) { this.placeCamera(cam, dt, t); g.lady.update(dt); return }
        if (!this.active) return;

        this.movePlayer(dt);
        this.moveLady(dt, t);
        this.placeCamera(cam, dt, t);
        this.updatePrompts();

        // la llave gira y flota para que se vea en la oscuridad
        if (g.keyMesh.visible) {
            g.keyMesh.rotation.y += dt * 1.6;
            g.keyMesh.position.y = this.keyPos.y + Math.sin(t * 2.2) * 0.05;
        }
    }

    movePlayer(dt) {
        const k = this.keys;
        const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
        const str = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
        this.crouching = !!(k.KeyC || k.ControlLeft || k.ControlRight);
        const wantRun = !!(k.ShiftLeft || k.ShiftRight) && !this.crouching && this.stamina > 0.02;

        let spd = this.crouching ? CROUCH_SPD : wantRun ? RUN : WALK;
        const moving = (fwd || str) ? 1 : 0;

        if (wantRun && moving) this.stamina = Math.max(0, this.stamina - dt * 0.34);
        else this.stamina = Math.min(1, this.stamina + dt * (this.crouching ? 0.32 : 0.19));

        // el ruido delata: correr mucho, agacharse casi nada
        const made = moving ? (wantRun ? 1 : this.crouching ? 0.12 : 0.42) : 0;
        this.noise = lerp(this.noise, made, sat(dt * 3));

        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        let vx = (-sin * fwd + cos * str), vz = (-cos * fwd - sin * str);
        const len = Math.hypot(vx, vz) || 1;
        vx = vx / len * spd * moving; vz = vz / len * spd * moving;

        let nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt;
        [nx, nz] = collide(nx, nz, 0.32);
        this.pos.set(nx, 0, nz);

        this.bob = (this.bob || 0) + dt * (moving ? (wantRun ? 11 : 7) : 0);
        this.g.hud.set({ stamina: this.stamina, lowStam: this.stamina < 0.25 });
    }

    placeCamera(cam, dt, t) {
        const eye = this.crouching ? CROUCH_EYE : EYE;
        this.eyeY = lerp(this.eyeY ?? eye, eye, sat(dt * 10));
        cam.position.set(this.pos.x, this.eyeY + Math.sin(this.bob || 0) * 0.035, this.pos.z);
        cam.rotation.set(0, 0, 0);
        cam.rotation.order = 'YXZ';
        cam.rotation.y = this.yaw;
        cam.rotation.x = this.pitch;
        cam.rotation.z = Math.sin((this.bob || 0) * 0.5) * 0.012;
        // el celular le hace de linterna: apunta a donde mira
        const L = this.g.torch;
        if (L) {
            L.position.set(cam.position.x, cam.position.y - 0.12, cam.position.z);
            const d = new THREE.Vector3(0, 0, -1).applyEuler(cam.rotation);
            L.target.position.copy(cam.position).add(d.multiplyScalar(9));
            L.target.updateMatrixWorld();
        }
    }

    /* Maquina de estados: patrulla, va hacia el ruido, o persigue si te ve. */
    moveLady(dt, t) {
        const g = this.g, L = this.lady;
        const sees = this.ladySees();
        if (sees) { L.state = 'chase'; L.lostT = 0; L.target = this.pos.clone() }
        else if (L.state === 'chase') {
            L.lostT += dt;
            if (L.lostT > 3.5) { L.state = 'hunt'; L.think = 0 }
        }
        // el ruido la llama aunque no te vea
        if (!sees && this.noise > 0.6 && L.pos.distanceTo(this.pos) < 16 && L.state !== 'chase') {
            L.state = 'hunt'; L.target = this.pos.clone(); L.think = 0;
        }

        L.think -= dt;
        if (L.think <= 0 || !L.path || L.node >= (L.path?.length || 0)) {
            let goal;
            if (L.state === 'chase') goal = this.pos;
            else if (L.state === 'hunt' && L.target) goal = L.target;
            else {
                const rooms = Object.keys(ROOMS);
                const r = g.house.randomSpotIn(rooms[Math.floor(this.rng.next() * rooms.length)], this.rng);
                goal = new THREE.Vector3(r.pos[0], 0, r.pos[1]);
                L.state = L.state === 'chase' ? 'chase' : 'patrol';
            }
            const [c0, r0] = toCell(L.pos.x, L.pos.z);
            const [c1, r1] = toCell(goal.x, goal.z);
            L.path = findPath(c0, r0, c1, r1) || null;
            L.node = 1;
            L.think = L.state === 'chase' ? 0.35 : 1.6;
            if (L.state === 'hunt' && L.pos.distanceTo(L.target || L.pos) < 1.6) { L.state = 'patrol'; L.target = null }
        }

        const speed = L.state === 'chase' ? LADY_CHASE : L.state === 'hunt' ? LADY_HUNT : LADY_PATROL;
        if (L.path && L.node < L.path.length) {
            const [c, r] = L.path[L.node];
            const [wx, wz] = toWorld(c, r);
            const dx = wx - L.pos.x, dz = wz - L.pos.z;
            const d = Math.hypot(dx, dz);
            if (d < 0.28) L.node++;
            else {
                L.pos.x += dx / d * speed * dt;
                L.pos.z += dz / d * speed * dt;
                const want = Math.atan2(dx, dz);
                let diff = ((want - L.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                L.yaw += diff * sat(dt * 7);
            }
        }

        g.lady.root.position.set(L.pos.x, 0, L.pos.z);
        g.lady.root.rotation.y = L.yaw;
        g.lady.play(L.state === 'chase' ? 'run' : 'walk', { fade: 0.25, rate: L.state === 'chase' ? 1.25 : 0.9 });
        g.lady.update(dt);

        // pista sonora y visual de que viene: mas cerca, mas roja la vineta
        const dist = L.pos.distanceTo(this.pos);
        const near = sat(1 - dist / 12);
        g.hud.set({ vignette: +(0.5 + near * 0.4).toFixed(2) });
        g.audio.setTension(L.state === 'chase' ? 1 : near * 0.6);

        if (dist < CATCH_DIST) this.caught();
    }

    ladySees() {
        const L = this.lady;
        const dx = this.pos.x - L.pos.x, dz = this.pos.z - L.pos.z;
        const dist = Math.hypot(dx, dz);
        const range = this.crouching ? 7.5 : 12;
        if (dist > range) return false;
        if (!hasLineOfSight(L.pos.x, L.pos.z, this.pos.x, this.pos.z)) return false;
        const want = Math.atan2(dx, dz);
        let diff = Math.abs(((want - L.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        return diff < (L.state === 'chase' ? 1.5 : 0.95);   // cono de vision
    }

    updatePrompts() {
        const g = this.g;
        let p = '';
        if (document.pointerLockElement !== g.engine.renderer.domElement) p = 'Click para mirar alrededor';
        else if (!this.hasKey && this.pos.distanceTo(this.keyPos) < 1.5) p = 'E — agarrar la llave';
        else if (this.hasKey && this.pos.distanceTo(g.house.exitPos) < 2.2) p = 'E — abrir la puerta';
        g.hud.set({ prompt: p });
    }
}
