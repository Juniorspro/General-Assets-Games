/* Entrada: carga los assets, arma el mundo, corre la cinematica y despues
   entrega el control al jugador para la primera mision. */
import * as THREE from 'three';
import { Engine, Hud, Rng, sat, lerp, smooth, noise1 } from './core.js';
import { Road, Dust, wind, tex } from './world.js';
import { Car, loadRig, attachBat } from './actors.js';
import { House, toWorld, CELL } from './house.js';
import { Director } from './cine.js';
import { Escape } from './escape.js';
import { Audio } from './audio.js';

/* Los assets llegan como data URLs inyectadas por el empaquetador. */
const A = window.CRASH_ASSETS || {};
/* Punto de la cadera del conductor, en coordenadas del auto. El Bentley del
   que salio el modelo es ingles, asi que el volante cae a la derecha. */
const SEAT = { x: 0.45, y: 0.55, z: -0.35 };
/* Altura del ojo del conductor sobre el asfalto. */
const EYE_Y = 1.26;

class Game {
    constructor() {
        this.engine = new Engine(document.getElementById('view'));
        this.hud = new Hud();
        this.audio = new Audio({ music: A.music, ambience: A.ambience, crash: A.crash });
        this.rng = new Rng(90210);
        this.t = 0;
        this.phase = 'loading';
    }

    async load(onProgress) {
        const P = onProgress || (() => { });
        P(0.03, 'mirando el cielo');
        await this.loadSky();
        P(0.08, 'armando la carretera');
        this.road = new Road(this.engine.scene, A);
        this.dust = new Dust(this.engine.scene, 320);

        P(0.25, 'levantando la casa');
        this.house = new House(this.engine.scene, A, new Rng(4242));
        this.house.group.visible = false;

        P(0.4, 'trayendo el auto');
        this.car = new Car();
        await this.car.load(A.carBody, A.carWheel);
        this.engine.scene.add(this.car.group);

        P(0.65, 'buscando al chico');
        this.boy = await loadRig(A.boy, { height: 1.78 });
        this.engine.scene.add(this.boy.root);
        this.boy.root.visible = false;
        this.hideHead(this.boy);

        P(0.82, 'y a la vieja');
        this.lady = await loadRig(A.lady, { height: 1.62 });
        this.engine.scene.add(this.lady.root);
        this.lady.root.visible = false;
        attachBat(this.lady);

        P(0.92, 'ultimos detalles');
        await this.buildPhone();
        this.buildKey();
        this.buildTorch();

        const [wx, wz] = toWorld(4, 13);
        this.wakeSpot = new THREE.Vector3(wx, 0, wz);
        const [ax, az] = toWorld(3, 8), [bx] = toWorld(20, 8);
        this.ladyCross = { ax, az, bx, bz: az };

        this.director = new Director(this);
        this.escape = new Escape(this);
        P(1, 'listo');
    }

    loadSky() {
        return new Promise(res => {
            if (!A.skyDay) return res();
            new THREE.TextureLoader().load(A.skyDay, t => { this.engine.setSky(t); res() }, undefined, () => res());
        });
    }

    /* En POV la cabeza tapa la camara: se la achica a cero en vez de sacarla,
       asi el skinning del cuello no se rompe. */
    hideHead(rig) {
        const h = rig.bones.Head || rig.bones.head || rig.bones.mixamorigHead;
        if (h) { rig.headBone = h; rig.headScale = h.scale.clone() }
    }
    setHeadHidden(rig, hidden) {
        if (!rig.headBone) return;
        if (hidden) rig.headBone.scale.setScalar(0.001);
        else rig.headBone.scale.copy(rig.headScale);
    }

    async buildPhone() {
        if (!A.phone) return;
        const { loadGLB, fitModel } = await import('./actors.js');
        const g = await loadGLB(A.phone);
        const m = g.scene;
        fitModel(m, 0.148, 'y');
        const holder = new THREE.Group();
        holder.add(m);
        m.position.set(0, 0, 0);
        const hand = this.boy.bones.R_Hand || this.boy.bones.RightHand;
        if (hand) {
            hand.add(holder);
            hand.updateWorldMatrix(true, false);
            const ws = holder.getWorldScale(new THREE.Vector3());
            holder.scale.setScalar(1 / Math.max(ws.x, 1e-4));
            holder.position.set(0.03, 0.025, 0.05);
            holder.rotation.set(Math.PI, 0, 0);
        } else {
            this.engine.scene.add(holder);
        }
        // la pantalla ilumina la cara: luz corta y suave
        const glow = new THREE.PointLight(0x9fc7ff, 0.45, 1.1, 2);
        glow.position.set(0, 0.06, 0);
        holder.add(glow);
        this.phoneHolder = holder;
        this.phoneGlow = glow;
        this.phoneModel = m;
        holder.visible = false;
    }

    buildKey() {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xb08636, metalness: 0.85, roughness: 0.42, emissive: 0x3a2a0c, emissiveIntensity: 0.8 });
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.19, 6), mat);
        shaft.rotation.z = Math.PI / 2;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.011, 6, 12), mat);
        ring.position.x = -0.115;
        const bit = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.012), mat);
        bit.position.set(0.07, -0.028, 0);
        g.add(shaft, ring, bit);
        g.scale.setScalar(1.5);
        const halo = new THREE.PointLight(0xffcf7a, 1.5, 2.4, 2);
        g.add(halo);
        g.visible = false;
        this.engine.scene.add(g);
        this.keyMesh = g;
    }

    buildTorch() {
        const L = new THREE.SpotLight(0xcfe0ff, 26, 16, 0.52, 0.62, 1.5);
        L.castShadow = true;
        L.shadow.mapSize.set(1024, 1024);
        L.shadow.bias = -0.003;
        L.visible = false;
        this.engine.scene.add(L, L.target);
        this.torch = L;

        /* El mismo celular que venia mirando en la ruta le queda en la mano
           como linterna. Va colgado de la camara, abajo a la derecha. */
        const cam = this.engine.camera;
        this.engine.scene.add(cam);          // si no, los hijos de la camara no se dibujan
        if (this.phoneModel) {
            const v = this.phoneModel.clone(true);
            v.scale.setScalar(1.9);
            v.position.set(0.26, -0.24, -0.45);
            v.rotation.set(-0.35, 0.22, 0.12);
            v.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false } });
            v.visible = false;
            cam.add(v);
            this.phoneView = v;
            const screen = new THREE.PointLight(0xa8c8ff, 0.5, 0.9, 2);
            screen.position.set(0, 0.05, 0);
            v.add(screen);
        }
    }

    /* ---------- poses del chico dentro del auto ---------- */
    boySeat(on, hideHead) {
        this.boy.root.visible = on;
        if (!on) return;
        this.setHeadHidden(this.boy, !!hideHead);
        this.seatPose(0);
        this.placeInSeat();
    }
    /* Lo ancla por la cadera y no por los pies. Sentado, el rig sigue midiendo
       1,78 m de pie: apoyarlo por los pies lo deja con la cabeza medio metro
       arriba del auto. Se mide donde quedo la pelvis y se corrige el root. */
    placeInSeat() {
        const c = this.car.group, r = this.boy.root;
        r.rotation.y = c.rotation.y;
        r.position.copy(c.position);
        r.updateMatrixWorld(true);
        const pelvis = this.boy.bones.Pelvis || this.boy.bones.Hip;
        if (!pelvis) { r.position.y += 0.34; return }
        const cur = pelvis.getWorldPosition(this._v1 || (this._v1 = new THREE.Vector3()));
        const seat = (this._v2 || (this._v2 = new THREE.Vector3())).set(SEAT.x, SEAT.y, SEAT.z);
        c.localToWorld(seat);
        r.position.add(seat.sub(cur));
    }
    seatPose(reach) {
        const b = this.boy.bones, set = (n, x, y, z) => b[n] && b[n].rotation.set(x, y, z);
        set('R_Thigh', -1.45, 0, -0.12); set('L_Thigh', -1.45, 0, 0.12);
        set('R_Calf', -1.25, 0, 0); set('L_Calf', -1.25, 0, 0);
        set('Spine01', -0.12, 0, 0);
        set('L_Upperarm', 0, 1.6, 1.6); set('L_Forearm', 0, 0, 0);
        const uy = lerp(-1.6, -1.0, reach), uz = lerp(-1.6, -1.8, reach), fx = lerp(0, 0.8, reach);
        set('R_Upperarm', 0, uy, uz);
        set('R_Forearm', fx, 0, 0);
    }
    boyPhone(k) { this.seatPose(sat(k)); if (this.phoneGlow) this.phoneGlow.intensity = 0.45 * sat(k) }
    phoneVisible(v) { if (this.phoneHolder) this.phoneHolder.visible = v }

    /* Ojo del conductor, en coordenadas del auto. Coincide con el cuerpo
       porque el rig se ancla por la cadera al mismo punto de asiento. */
    povEye(cam, sway, zoom) {
        const c = this.car.group, z = sat(zoom || 0);
        this.setHeadHidden(this.boy, true);
        c.updateMatrixWorld(true);

        // Punto fijo en coordenadas del auto. Va bastante adelante de la base
        // del craneo a proposito: el buzo tiene capucha y desde el hueso de la
        // cabeza la camara queda mirando el forro de adentro.
        const p = new THREE.Vector3(SEAT.x, EYE_Y, SEAT.z + 0.24);
        c.localToWorld(p);
        cam.position.copy(p);
        cam.position.y += Math.sin(this.t * 8.3) * 0.006 * sway;
        cam.position.x += Math.sin(this.t * 5.1) * 0.008 * sway;

        // al mirar el celular la vista va al teléfono; si no, a la ruta
        const look = new THREE.Vector3();
        if (z > 0.01 && this.phoneHolder) {
            this.phoneHolder.getWorldPosition(look);
            const far = new THREE.Vector3(0.45, 1.15, 22); c.localToWorld(far);
            look.lerp(far, 1 - z);
        } else {
            look.set(0.45, 1.15, 22); c.localToWorld(look);
        }
        cam.rotation.set(0, 0, 0);
        cam.lookAt(look);
        cam.rotateZ(Math.sin(this.t * 1.4) * 0.012 * sway);
    }

    /* La vieja parada en el medio del asfalto, de espaldas a los faros. */
    ladyOnRoad(z) {
        this.lady.root.position.set(0.4, 0, z);
        this.lady.root.rotation.y = Math.PI;
        this.lady.play('idle', { fade: 0.1 });
    }

    onCinematicDone() {
        this.phase = 'escape';
        this.car.group.visible = false;
        this.road.group.visible = false;
        this.boy.root.visible = false;
        this.phoneVisible(false);
        this.torch.visible = true;
        if (this.phoneView) this.phoneView.visible = true;
        this.house.group.visible = true;
        this.engine.look('house');
        this.engine.camera.fov = 72;
        this.engine.camera.updateProjectionMatrix();
        this.escape.begin();
    }

    startCinematic() {
        this.phase = 'cine';
        this.director.start();
    }

    frame(dt) {
        this.t += dt;
        wind.value += dt * (this.phase === 'cine' ? 1.6 : 0.4);
        if (this.phase === 'cine') {
            this.director.update(dt);
            this.boy.update(dt);
            // el rig sigue al auto mientras dura la parte de la ruta
            if (this.boy.root.visible && this.car.group.visible) this.placeInSeat();
        } else if (this.phase === 'escape') {
            this.escape.update(dt, this.t);
        }
        this.dust.update(dt, this.engine.camera);
        this.engine.applyShake(dt, this.t);
        this.engine.render();
    }
}

/* ------------------------------------------------------------------ arranque */
const game = new Game();
const bootEl = document.getElementById('boot');
const barEl = document.getElementById('boot-bar');
const tipEl = document.getElementById('boot-tip');
const startEl = document.getElementById('start');

game.load((p, msg) => {
    barEl.style.width = (p * 100) + '%';
    if (msg) tipEl.textContent = msg;
}).then(() => {
    bootEl.classList.add('ready');
    startEl.style.display = 'block';
}).catch(err => {
    tipEl.textContent = 'error cargando: ' + (err && err.message ? err.message : err);
    console.error(err);
});

async function begin() {
    if (game.phase !== 'loading') return;
    startEl.style.display = 'none';
    bootEl.style.opacity = 0;
    setTimeout(() => bootEl.style.display = 'none', 600);
    await game.audio.unlock();
    game.startCinematic();
}
startEl.addEventListener('click', begin);
addEventListener('keydown', e => {
    if (e.code === 'Enter' || e.code === 'Space') { if (game.phase === 'loading') begin() }
    if (e.code === 'KeyM') game.audio.toggleMute();
    if ((e.code === 'Escape' || e.code === 'KeyK') && game.phase === 'cine') game.director.skip();
});
document.getElementById('skip').addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (game.phase === 'cine') game.director.skip();
});

let last = performance.now();
function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (game.phase !== 'loading') game.frame(dt);
    // sonda para las pruebas automaticas
    window.__CRASH = {
        phase: game.phase,
        shot: game.director ? game.director.shots[game.director.index]?.id : null,
        idx: game.director ? game.director.index : -1,
        t: game.director ? +game.director.t.toFixed(2) : 0,
        key: game.escape ? game.escape.hasKey : false,
        won: game.escape ? game.escape.won : false,
        lost: game.escape ? game.escape.lost : false,
    };
    if (window.__CRASH_JUMP != null && game.director && game.phase === 'cine') {
        const j = Math.max(0, Math.min(game.director.shots.length - 1, window.__CRASH_JUMP | 0));
        window.__CRASH_JUMP = null;
        game.director.shots[game.director.index]?.exit?.();
        game.director.goto(j);
    }
    // se consume solo cuando se puede actuar: pedirlo antes de que arranque
    // la cinematica no tiene que perder el pedido
    if (window.__CRASH_SKIP && game.phase === 'cine') { window.__CRASH_SKIP = false; game.director.skip() }
}
requestAnimationFrame(loop);
window.__game = game;
