/* Los cuatro actos: la ruta feliz, la silueta, el choque y el despertar.
   Cada plano es {id, duration, enter, update} y el director los encadena. */
import * as THREE from 'three';
import { sat, lerp, smooth, easeOut, easeIn, decay, noise1 } from './core.js';
import { toWorld } from './house.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Director {
    constructor(game) {
        this.g = game;
        this.shots = this.build();
        let acc = 0;
        this.startAt = this.shots.map(s => { const a = acc; acc += s.duration; return a });
        this.index = 0; this.t = 0; this.elapsed = 0;
        this.done = false;
        this.started = false;
    }
    /* Entra a un plano dejando el reloj global donde ese plano espera. */
    goto(i) {
        this.index = i;
        this.t = 0;
        this.elapsed = this.startAt[i];
        this.shots[i].enter?.();
    }
    start() {
        this.started = true;
        this.goto(0);
    }
    skip() { if (!this.done) { this.shots[this.index]?.exit?.(); this.finish() } }
    finish() {
        this.done = true;
        this.g.onCinematicDone();
    }
    update(dt) {
        if (this.done || !this.started) return;
        this.t += dt; this.elapsed += dt;
        const sh = this.shots[this.index];
        sh.update?.(dt);
        if (this.t >= sh.duration) {
            sh.exit?.();
            if (this.index + 1 >= this.shots.length) return this.finish();
            this.goto(this.index + 1);
        }
    }

    build() {
        const g = this.g;
        const cam = () => g.engine.camera;
        const hud = g.hud;
        const car = () => g.car;
        const SPEED = 24;          // m/s de crucero

        /* posicion del auto en el tiempo global de la cinematica */
        const carAt = t => -170 + t * SPEED;

        /* Cada plano arma su propio escenario. Depender de lo que dejo el
           anterior hace que saltar (o entrar en frio desde la consola) muestre
           la escena equivocada o directamente negro. */
        const clearHud = () => hud.set({
            fade: 0, flash: 0, blur: 0, lids: 0, cardOn: false, hudOn: false,
            skipOn: true, sub: '',
        });
        const roadSetup = () => {
            clearHud();
            g.engine.look('road-day');
            g.road.group.visible = true;
            g.house.group.visible = false;
            g.torch.visible = false;
            if (g.phoneView) g.phoneView.visible = false;
            car().group.visible = true;
            car().group.rotation.set(0, 0, 0);
            g.keyMesh.visible = false;
        };
        const houseSetup = () => {
            clearHud();
            g.engine.look('house');
            g.house.group.visible = true;
            g.road.group.visible = false;
            car().group.visible = false;
            g.boy.root.visible = false;
            g.phoneVisible(false);
            g.torch.visible = false;
            if (g.phoneView) g.phoneView.visible = false;
            g.keyMesh.visible = false;
        };

        // ---------------------------------------------------------------- ACTO 1
        const drivePast = {
            id: 'drive-past',
            duration: 5.6,
            enter: () => {
                roadSetup();
                car().setHeadlights(false);
                g.boySeat(true, false);
                hud.set({ fade: 1, vignette: 0.25 });   // este si abre desde negro
                g.audio.playMusic(0.55);
                cam().fov = 46; cam().updateProjectionMatrix();
            },
            update: () => {
                const t = this.t, z = carAt(this.elapsed);
                car().group.position.set(0, 0, z);
                car().group.rotation.y = 0;
                car().update(1 / 60, SPEED, Math.sin(this.elapsed * 0.7) * 0.02);
                // travelling lateral: la camara acompana al auto un poco atras
                const k = smooth(t / 5.6);
                cam().position.set(lerp(9.5, 6.2, k), lerp(2.4, 1.35, k), z - lerp(5, 1.2, k));
                cam().lookAt(0, 0.95, z + lerp(2, 5, k));
                hud.set({ fade: Math.max(0, 1 - t / 1.4) });
                g.dust.emit(0.9, 0.05, z - 2.4, 1, 0.45);
            },
        };

        const drivePass = {
            id: 'drive-pass',
            duration: 3.9,
            enter: () => { roadSetup(); g.boySeat(true, false); cam().fov = 42; cam().updateProjectionMatrix() },
            update: () => {
                const t = this.t, z = carAt(this.elapsed);
                car().group.position.set(0, 0, z);
                car().update(1 / 60, SPEED, 0);
                // camara clavada al borde del asfalto: el auto le pasa al lado
                // a los 2 s, casi rozandola
                const anchor = carAt(5.6 + 2.0);
                cam().position.set(4.6, 0.86, anchor);
                cam().lookAt(0.2, 0.80, z);
                g.dust.emit(0.9, 0.05, z - 2.4, 1, 0.5);
            },
        };

        const povHappy = {
            id: 'pov-happy',
            duration: 6.5,
            enter: () => {
                roadSetup();
                g.boySeat(true, true);
                cam().fov = 62; cam().updateProjectionMatrix();
                g.phoneVisible(true);
                g.audio.playMusic(0.55);
                hud.set({ sub: '', fade: 0, blur: 0, lids: 0, cardOn: false, hudOn: false, skipOn: true });
            },
            update: () => {
                const t = this.t, z = carAt(this.elapsed);
                car().group.position.set(0, 0, z);
                car().update(1 / 60, SPEED, Math.sin(this.elapsed * 0.6) * 0.015);
                // el pibe cabecea con la musica y despues baja la vista al celular
                const bop = Math.sin(this.elapsed * 6.6) * 0.012 + Math.sin(this.elapsed * 3.1) * 0.008;
                const look = smooth(sat((t - 2.4) / 2.6));
                g.boyPhone(look);
                g.povEye(cam(), bop, look);
                if (t > 3.4) hud.set({ sub: '' });
            },
        };

        // ---------------------------------------------------------------- ACTO 2
        const lookUp = {
            id: 'look-up',
            duration: 1.5,
            enter: () => {
                roadSetup();
                g.boySeat(true, true);
                g.phoneVisible(true);
                g.audio.duckMusic(0.16, 0.35);
                g.audio.stinger();
                g.lady.root.visible = true;
                g.ladyOnRoad(carAt(this.elapsed) + 96);
                g.ladyPlaced = true;
            },
            update: () => {
                const t = this.t, z = carAt(this.elapsed);
                car().group.position.set(0, 0, z);
                car().update(1 / 60, SPEED, 0);
                const up = easeOut(t / 0.75);        // levanta la vista de golpe
                g.boyPhone(1 - up);
                g.povEye(cam(), 0.5, 1 - up);
                cam().fov = lerp(62, 55, up); cam().updateProjectionMatrix();
            },
        };

        const silhouette = {
            id: 'silhouette',
            duration: 2.2,
            enter: () => {
                roadSetup();
                g.boySeat(true, true);
                g.phoneVisible(false);
                cam().fov = 55; cam().updateProjectionMatrix();
                hud.set({ sub: '', fade: 0, blur: 0, lids: 0, cardOn: false });
                g.lady.root.visible = true;
                if (!g.ladyPlaced) g.ladyOnRoad(carAt(this.elapsed) + 60);
            },
            update: () => {
                const t = this.t, z = carAt(this.elapsed);
                car().group.position.set(0, 0, z);
                car().update(1 / 60, SPEED, 0);
                g.povEye(cam(), 0.35, 0);
                cam().fov = lerp(55, 44, smooth(t / 2.2)); cam().updateProjectionMatrix();
                hud.set({ vignette: lerp(0.25, 0.55, smooth(t / 2.2)) });
            },
        };

        const swerve = {
            id: 'swerve',
            duration: 2.5,
            enter: () => {
                roadSetup();
                g.boySeat(true, true);
                cam().fov = 46; cam().updateProjectionMatrix();
                g.audio.screech(); g.engine.shake(0.06, 2.4);
            },
            update: () => {
                const t = this.t, k = sat(t / 2.5);
                // el auto tira a la izquierda y se va de la ruta
                const z = carAt(this.elapsed);
                const off = -easeIn(k) * 13;
                const yaw = -easeIn(k) * 0.62;
                car().group.position.set(off, 0, z);
                car().group.rotation.y = yaw;
                car().update(1 / 60, SPEED * (1 - k * 0.25), -0.55);
                g.povEye(cam(), 1.4, 0);
                cam().rotateZ(easeIn(k) * 0.34);
                g.dust.emit(off, 0.05, z - 2, 3, 1.5);
                hud.set({ vignette: lerp(0.55, 0.7, k) });
            },
            exit: () => { g.lady.root.visible = false; g.ladyPlaced = false },
        };

        // ---------------------------------------------------------------- ACTO 3
        const offRoad = {
            id: 'off-road',
            duration: 1.9,
            enter: () => {
                roadSetup();
                g.boySeat(true, false);
                cam().fov = 50; cam().updateProjectionMatrix();
                // el arbol contra el que va a chocar, plantado donde termina
                this.crashZ = carAt(this.elapsed + 1.9) + 1.6;
                g.road.heroTree.position.set(-15.6, 0, this.crashZ + 3.1);
            },
            update: () => {
                const t = this.t, k = sat(t / 1.9);
                const z = carAt(this.elapsed);
                const off = -13 - k * 1.2;
                car().group.position.set(off, 0, z);
                car().group.rotation.y = lerp(-0.62, -0.44, k);
                car().update(1 / 60, 20 * (1 - k * 0.4), -0.4);
                // plano exterior: el auto derrapando hacia el arbol
                cam().position.set(off + 11, 3.1, z - 8);
                cam().lookAt(off, 1.0, z + 5);
                g.dust.emit(off, 0.05, z - 2, 4, 1.3);
            },
        };

        const impact = {
            id: 'impact',
            duration: 1.5,
            enter: () => {
                roadSetup();
                g.boySeat(true, false);
                this.crashZ = carAt(this.elapsed) + 1.6;
                g.road.heroTree.position.set(-15.6, 0, this.crashZ + 3.1);
                car().group.position.set(-14.2, 0, this.crashZ);
                g.audio.crash();
                g.engine.shake(0.55, 1.1);
                hud.set({ flash: 1 });
                g.dust.emit(-14.6, 0.5, this.crashZ + 2.6, 46, 1.4);
            },
            update: () => {
                const t = this.t, k = sat(t / 1.5);
                // frenazo seco contra el tronco y rebote
                const z = this.crashZ + easeOut(Math.min(k * 3, 1)) * 1.7 - decay(k, 5) * 0.5;
                car().group.position.set(-14.2, 0, z);
                car().group.rotation.y = -0.44 + noise1(k * 30) * 0.05 * decay(k, 4);
                car().group.rotation.z = noise1(k * 22 + 3) * 0.08 * decay(k, 4);
                car().update(1 / 60, 0, 0);
                cam().position.set(-14.2 + 10, 2.6, z - 7);
                cam().lookAt(-14.2, 1.1, z + 3);
                hud.set({ flash: Math.max(0, 1 - t / 0.5), vignette: 0.7 });
            },
        };

        const blackOut = {
            id: 'black-out',
            duration: 3.4,
            enter: () => {
                roadSetup();
                g.boySeat(true, true);          // la camara queda dentro de la cabeza
                cam().fov = 58; cam().updateProjectionMatrix();
                g.audio.heartbeat(true); g.audio.duckMusic(0, 1.2);
            },
            update: () => {
                const t = this.t, k = sat(t / 3.4);
                // adentro del auto, la cabeza caida sobre el volante
                const p = car().group.position;
                cam().position.set(p.x + 0.35, lerp(1.15, 0.86, easeOut(k)), p.z + 0.2);
                cam().rotation.set(0, 0, 0);
                cam().lookAt(p.x + 0.2, lerp(1.0, 0.55, k), p.z + 2.2);
                cam().rotateZ(lerp(0.05, 0.55, easeOut(k)));
                hud.set({ blur: lerp(0.2, 1, k), vignette: lerp(0.7, 0.95, k), fade: easeIn(sat((t - 1.5) / 1.9)) });
            },
            exit: () => { car().group.visible = false; g.road.group.visible = false },
        };

        // ---------------------------------------------------------------- ACTO 4
        const wakeBlink = {
            id: 'wake-blink',
            duration: 4.2,
            enter: () => {
                houseSetup();
                g.lady.root.visible = false;
                cam().fov = 68; cam().updateProjectionMatrix();
                cam().position.set(g.wakeSpot.x, 0.22, g.wakeSpot.z);
                g.audio.playAmbience(0.5);
                hud.set({ fade: 1, blur: 1, lids: 1, vignette: 0.9 });   // despierta en negro
            },
            update: () => {
                const t = this.t;
                // tres parpadeos antes de enfocar
                const blinks = [[0.6, 1.15], [1.75, 2.4], [3.0, 4.2]];
                let open = 0;
                for (const [a, b] of blinks) if (t >= a && t <= b) open = Math.sin(((t - a) / (b - a)) * Math.PI);
                const w = g.wakeSpot;
                cam().position.set(w.x, 0.22 + open * 0.05, w.z);
                cam().rotation.set(0, 0, 0);
                cam().lookAt(w.x + 0.3, 0.55, w.z + 2.2);
                cam().rotateZ(0.5 - open * 0.12);
                hud.set({
                    fade: Math.max(0, 1 - open * 1.15),
                    lids: 1 - open * 0.92,
                    blur: 1 - open * 0.55,
                });
                g.audio.heartbeat(t < 3.2);
            },
        };

        const sitUp = {
            id: 'sit-up',
            duration: 4.0,
            enter: () => {
                houseSetup();
                g.lady.root.visible = false;
                cam().fov = 68; cam().updateProjectionMatrix();
                g.audio.playAmbience(0.5);
                hud.set({ lids: 0.08, fade: 0, flash: 0, cardOn: false, hudOn: false, skipOn: true });
            },
            update: () => {
                const t = this.t, k = smooth(sat(t / 4.0));
                const w = g.wakeSpot;
                // se incorpora: la camara sube de 22 cm a la altura de los ojos
                cam().position.set(w.x, lerp(0.22, 1.62, k), w.z);
                cam().rotation.set(0, 0, 0);
                cam().lookAt(w.x + lerp(0.3, 0.1, k), lerp(0.55, 1.5, k), w.z + 2.2);
                cam().rotateZ(lerp(0.5, 0, k) + noise1(t * 2.2) * 0.02);
                hud.set({ blur: lerp(0.45, 0, k), vignette: lerp(0.9, 0.6, k), lids: lerp(0.08, 0, k) });
                g.house.flicker(this.elapsed);
            },
        };

        const reveal = {
            id: 'reveal',
            duration: 5.6,
            enter: () => {
                houseSetup();
                cam().fov = 68; cam().updateProjectionMatrix();
                g.audio.playAmbience(0.5);
                hud.set({ fade: 0, blur: 0, lids: 0, flash: 0, vignette: 0.6 });
                // cruza el pasillo justo por delante del vano de la sala:
                // es lo unico que se ve desde donde despierta
                const [ax, az] = toWorld(1, 8);
                const [bx, bz] = toWorld(8, 8);
                g.lady.root.visible = true;
                g.lady.root.position.set(ax, 0, az);
                g.ladyCross = { ax, az, bx, bz };
                g.lady.play('walk', { fade: 0.2 });
                g.audio.creak();
            },
            update: () => {
                const t = this.t, w = g.wakeSpot;
                const k = smooth(sat((t - 2.0) / 3.2));
                const c = g.ladyCross;
                g.lady.root.position.set(lerp(c.ax, c.bx, k), 0, c.az);
                g.lady.root.rotation.y = Math.PI / 2;
                g.lady.update(1 / 60);

                // la camara gira despacio hacia el pasillo
                const turn = smooth(sat((t - 0.5) / 2.2));
                cam().position.set(w.x, 1.62 + Math.sin(t * 1.4) * 0.01, w.z);
                cam().rotation.set(0, 0, 0);
                const door = toWorld(4, 10);       // el vano que da al pasillo
                const tx = lerp(w.x + 0.1, door[0], turn);
                const tz = lerp(w.z + 2.2, door[1] - 1.2, turn);
                cam().lookAt(tx, 1.45, tz);
                g.house.flicker(this.elapsed);

                if (t > 4.4) hud.set({ cardOn: true, cardTitle: 'MISIÓN 1', cardSub: 'Escapar de la casa' });
            },
            exit: () => { hud.set({ cardOn: false, vignette: 0.5 }) },
        };

        return [drivePast, drivePass, povHappy, lookUp, silhouette, swerve, offRoad, impact, blackOut, wakeBlink, sitUp, reveal];
    }
}
