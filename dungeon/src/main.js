/* Recorrido en primera persona del plano: jugador chico, paredes altas,
   escaleras que suben y bajan, y camara que se inclina al moverse. */
import * as THREE from 'three';
import {
    CELL, WALL_H, LEVEL_H, W, H, LEVELS, STAIRS, STAIR_BOXES, Rng,
    toWorld, toCell, isOpen, isStairCell, surfaceAt, levelAt, collide, spawnOn,
} from './map.js';

const A = window.DUNGEON_ASSETS || {};

/* Somos chicos: el ojo va a 55 cm y las paredes miden 7 m, asi que un pasillo
   de 2,2 m se lee como una nave. Todo lo demas sale de esta escala. */
const EYE = 0.55, CROUCH_EYE = 0.34, RADIUS = 0.26;
const WALK = 2.3, RUN = 4.6, CROUCH_SPD = 1.2;
const FOV = 100;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sat = t => clamp(t, 0, 1);

function tex(url, repeat, srgb = true) {
    const t = new THREE.TextureLoader().load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/* UV desde la posicion de mundo: las cajas traen UV 0..1 por cara, asi que un
   tramo largo de pared estira la textura y uno corto la comprime. */
function worldUV(geo, scale) {
    const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal');
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
        let u, v;
        if (ny > nx && ny > nz) { u = x; v = z }
        else if (nx > nz) { u = z; v = y }
        else { u = x; v = y }
        uv[i * 2] = u / scale; uv[i * 2 + 1] = v / scale;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function mergeGeos(list) {
    let vc = 0, ic = 0;
    for (const g of list) { vc += g.getAttribute('position').count; ic += g.getIndex().count }
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2);
    const idx = new Uint32Array(ic);
    let vo = 0, io = 0;
    for (const g of list) {
        const p = g.getAttribute('position'), n = g.getAttribute('normal'), u = g.getAttribute('uv'), i = g.getIndex();
        pos.set(p.array, vo * 3); nor.set(n.array, vo * 3); uv.set(u.array, vo * 2);
        for (let k = 0; k < i.count; k++) idx[io + k] = i.array[k] + vo;
        vo += p.count; io += i.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
}

class Dungeon {
    constructor() {
        const canvas = document.getElementById('view');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05060a);
        this.scene.fog = new THREE.Fog(0x05060a, 6, 46);
        this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.02, 300);

        this.scene.add(new THREE.HemisphereLight(0x3a4a6b, 0x100c08, 0.5));
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.06));

        /* El farol del jugador. Como somos chicos, alcanza poco y las paredes
           se pierden hacia arriba en la oscuridad: eso es lo que las agranda. */
        this.lamp = new THREE.PointLight(0xffc98a, 26, 26, 1.7);
        this.lamp.castShadow = true;
        this.lamp.shadow.mapSize.set(1024, 1024);
        this.lamp.shadow.bias = -0.004;
        this.scene.add(this.lamp);

        this.build();
        this.initPlayer();
        this.bindInput();
        this.resize();
        addEventListener('resize', () => this.resize());

        this.t = 0; this.roll = 0; this.bob = 0; this.pitch = 0; this.yaw = 0;
        this.stamina = 1; this.running = false; this.crouch = false;
        this.visited = new Set();
    }

    resize() {
        this.renderer.setSize(innerWidth, innerHeight, false);
        this.camera.aspect = innerWidth / innerHeight;
        this.camera.updateProjectionMatrix();
    }

    build() {
        const wallMat = new THREE.MeshStandardMaterial({
            map: A.wall ? tex(A.wall, [1, 1]) : null,
            color: A.wall ? 0xffffff : 0x6b6b73, roughness: 0.95,
        });
        const floorMat = new THREE.MeshStandardMaterial({
            map: A.floor ? tex(A.floor, [1, 1]) : null,
            color: A.floor ? 0xffffff : 0x4c4a46, roughness: 0.96,
        });
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x14151b, roughness: 1 });

        for (let lv = 0; lv < LEVELS.length; lv++) this.buildLevel(lv, wallMat, floorMat, ceilMat);
        this.buildStairs(floorMat);
    }

    buildLevel(lv, wallMat, floorMat, ceilMat) {
        const base = LEVELS[lv].base;
        const boxes = [];
        // las paredes se juntan en tiras horizontales: una malla, no mil cajas
        for (let r = 0; r < H; r++) {
            let run = 0;
            for (let c = 0; c <= W; c++) {
                const solid = c < W && !isOpen(lv, c, r);
                if (solid) { run++; continue }
                if (run) {
                    const [x0] = toWorld(c - run, r), [x1] = toWorld(c - 1, r);
                    const [, z] = toWorld(c - run, r);
                    const g = new THREE.BoxGeometry(run * CELL, WALL_H, CELL);
                    g.translate((x0 + x1) / 2, base + WALL_H / 2, z);
                    boxes.push(g);
                    run = 0;
                }
            }
        }
        if (boxes.length) {
            const merged = mergeGeos(boxes);
            worldUV(merged, 2.4);
            const walls = new THREE.Mesh(merged, wallMat);
            walls.castShadow = walls.receiveShadow = true;
            this.scene.add(walls);
            boxes.forEach(g => g.dispose());
        }

        // piso y techo solo bajo las celdas abiertas, en tiras como las paredes
        const floors = [], ceils = [];
        for (let r = 0; r < H; r++) {
            let run = 0;
            for (let c = 0; c <= W; c++) {
                const open = c < W && isOpen(lv, c, r) && !isStairCell(c, r);
                if (open) { run++; continue }
                if (run) {
                    const [x0] = toWorld(c - run, r), [x1] = toWorld(c - 1, r);
                    const [, z] = toWorld(c - run, r);
                    const f = new THREE.PlaneGeometry(run * CELL, CELL);
                    f.rotateX(-Math.PI / 2);
                    f.translate((x0 + x1) / 2, base + 0.001, z);
                    floors.push(f);
                    const k = new THREE.PlaneGeometry(run * CELL, CELL);
                    k.rotateX(Math.PI / 2);
                    k.translate((x0 + x1) / 2, base + WALL_H, z);
                    ceils.push(k);
                    run = 0;
                }
            }
        }
        if (floors.length) {
            const fg = mergeGeos(floors);
            worldUV(fg, 2.4);
            const fm = new THREE.Mesh(fg, floorMat);
            fm.receiveShadow = true;
            this.scene.add(fm);
            floors.forEach(g => g.dispose());
            const cg = mergeGeos(ceils);
            worldUV(cg, 3);
            this.scene.add(new THREE.Mesh(cg, ceilMat));
            ceils.forEach(g => g.dispose());
        }

        this.placeTorches(lv, base);
    }

    /* Antorchas contra las paredes de las salas grandes: dan un punto de fuga
       y hacen leer la altura, que es lo que vende el tamano. */
    placeTorches(lv, base) {
        const rng = new Rng(0x7A0 + lv * 977);
        const flameGeo = new THREE.SphereGeometry(0.09, 8, 6);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb552 });
        let placed = 0;
        for (let i = 0; i < 3000 && placed < 26; i++) {
            const c = rng.int(1, W - 2), r = rng.int(1, H - 2);
            if (!isOpen(lv, c, r) || isStairCell(c, r)) continue;
            // que tenga pared al lado, para colgarla
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => !isOpen(lv, c + dc, r + dr));
            if (!dirs.length) continue;
            const [dc, dr] = dirs[Math.floor(rng.next() * dirs.length)];
            const [x, z] = toWorld(c, r);
            const px = x + dc * (CELL / 2 - 0.12), pz = z + dr * (CELL / 2 - 0.12);
            const y = base + 2.6;
            const L = new THREE.PointLight(0xff9d4a, 9, 13, 1.9);
            L.position.set(px, y, pz);
            this.scene.add(L);
            const f = new THREE.Mesh(flameGeo, flameMat);
            f.position.copy(L.position);
            this.scene.add(f);
            (this.torches || (this.torches = [])).push({ L, f, phase: rng.range(0, 9) });
            placed++;
        }
    }

    /* Escalones de verdad. El movimiento usa la rampa suave de surfaceAt, pero
       lo que se ve son peldanos: una rampa lisa no se lee como escalera. */
    buildStairs(floorMat) {
        const geos = [];
        for (const { s, box } of STAIR_BOXES) {
            const yA = LEVELS[s.a].base, yB = LEVELS[s.b].base;
            const rise = yB - yA;
            const steps = Math.max(6, Math.round(Math.abs(rise) / 0.34));
            const [dc, dr] = s.dir;
            const alongX = !!dc;
            const runLen = alongX ? box.maxX - box.minX : box.maxZ - box.minZ;
            const wide = alongX ? box.maxZ - box.minZ : box.maxX - box.minX;
            const stepRun = runLen / steps;
            for (let i = 0; i < steps; i++) {
                const t0 = i / steps, t1 = (i + 1) / steps;
                const top = yA + rise * t1;
                const h = Math.abs(top - yA) + 0.4;
                const g = new THREE.BoxGeometry(alongX ? stepRun : wide, h, alongX ? wide : stepRun);
                // desde el pie hacia arriba, segun el sentido de la escalera
                const f0 = (dc > 0 || dr > 0) ? t0 : 1 - t1;
                const cx = alongX ? box.minX + runLen * f0 + stepRun / 2 : (box.minX + box.maxX) / 2;
                const cz = alongX ? (box.minZ + box.maxZ) / 2 : box.minZ + runLen * f0 + stepRun / 2;
                g.translate(cx, Math.min(yA, top) - 0.4 + h / 2, cz);
                geos.push(g);
            }
        }
        if (!geos.length) return;
        const merged = mergeGeos(geos);
        worldUV(merged, 2.4);
        const m = new THREE.Mesh(merged, floorMat);
        m.castShadow = m.receiveShadow = true;
        this.scene.add(m);
        geos.forEach(g => g.dispose());
    }

    initPlayer() {
        const rng = new Rng(20260901);
        const s = spawnOn(0, rng);
        this.pos = new THREE.Vector3(s.x, 0, s.z);
        this.y = 0;
        this.pitch = 0;
        // arrancar mirando a un lado abierto, no contra la pared
        const dirs = [[0, -1, 0], [1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2]];
        this.yaw = 0;
        for (const [dc, dr, yaw] of dirs) {
            if (isOpen(0, s.c + dc, s.r + dr)) { this.yaw = yaw; break }
        }
    }

    bindInput() {
        this.keys = {};
        addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
        });
        addEventListener('keyup', e => { this.keys[e.code] = false });

        const canvas = this.renderer.domElement;
        canvas.addEventListener('click', () => {
            if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
        });
        addEventListener('mousemove', e => {
            if (document.pointerLockElement !== canvas) return;
            this.yaw -= e.movementX * 0.0022;
            this.pitch = clamp(this.pitch - e.movementY * 0.0022, -1.2, 1.2);
        });

        this.stick = { active: false, id: -1, x: 0, y: 0, cx: 0, cy: 0 };
        this.look = { active: false, id: -1, lx: 0, ly: 0 };
        const base = document.getElementById('stick');
        const knob = document.getElementById('knob');
        const R = 58;

        const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)` };

        const onStart = e => {
            for (const t of e.changedTouches) {
                const r = base.getBoundingClientRect();
                const inStick = t.clientX < innerWidth * 0.5;
                if (inStick && !this.stick.active) {
                    this.stick.active = true; this.stick.id = t.identifier;
                    this.stick.cx = r.left + r.width / 2; this.stick.cy = r.top + r.height / 2;
                } else if (!this.look.active) {
                    this.look.active = true; this.look.id = t.identifier;
                    this.look.lx = t.clientX; this.look.ly = t.clientY;
                }
            }
            e.preventDefault();
        };
        const onMove = e => {
            for (const t of e.changedTouches) {
                if (this.stick.active && t.identifier === this.stick.id) {
                    let dx = t.clientX - this.stick.cx, dy = t.clientY - this.stick.cy;
                    const d = Math.hypot(dx, dy);
                    if (d > R) { dx = dx / d * R; dy = dy / d * R }
                    this.stick.x = dx / R; this.stick.y = dy / R;
                    setKnob(dx, dy);
                } else if (this.look.active && t.identifier === this.look.id) {
                    this.yaw -= (t.clientX - this.look.lx) * 0.005;
                    this.pitch = clamp(this.pitch - (t.clientY - this.look.ly) * 0.005, -1.2, 1.2);
                    this.look.lx = t.clientX; this.look.ly = t.clientY;
                }
            }
            e.preventDefault();
        };
        const onEnd = e => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.stick.id) { this.stick.active = false; this.stick.id = -1; this.stick.x = this.stick.y = 0; setKnob(0, 0) }
                if (t.identifier === this.look.id) { this.look.active = false; this.look.id = -1 }
            }
        };
        addEventListener('touchstart', onStart, { passive: false });
        addEventListener('touchmove', onMove, { passive: false });
        addEventListener('touchend', onEnd);
        addEventListener('touchcancel', onEnd);
    }

    update(dt) {
        this.t += dt;
        const k = this.keys;

        // teclado y joystick suman; el stick manda si esta empujado
        let fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
        let str = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
        const sm = Math.hypot(this.stick.x, this.stick.y);
        if (sm > 0.12) { fwd = -this.stick.y; str = this.stick.x }

        /* Correr automatico: cuanto mas arriba va el joystick, mas rapido, y
           pasado el 70% del recorrido entra en carrera sin apretar nada. */
        const stickRun = sm > 0.7 && -this.stick.y > 0.55;
        this.crouch = !!(k.KeyC || k.ControlLeft || k.ControlRight);
        const wantRun = (!!(k.ShiftLeft || k.ShiftRight) || stickRun) && !this.crouch && this.stamina > 0.02;

        const moving = Math.hypot(fwd, str);
        let spd = this.crouch ? CROUCH_SPD : wantRun ? RUN : WALK;
        if (sm > 0.12 && !wantRun) spd *= clamp(sm, 0.35, 1);

        this.running = wantRun && moving > 0.05;
        if (this.running) this.stamina = Math.max(0, this.stamina - dt * 0.22);
        else this.stamina = Math.min(1, this.stamina + dt * 0.16);

        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        let vx = (-sin * fwd + cos * str), vz = (-cos * fwd - sin * str);
        const len = Math.hypot(vx, vz) || 1;
        const speed = spd * Math.min(moving, 1);
        vx = vx / len * speed; vz = vz / len * speed;

        let nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt;
        [nx, nz] = collide(nx, nz, this.y, RADIUS);
        this.pos.set(nx, 0, nz);

        // la altura sigue la superficie: escaleras arriba y abajo sin fisica
        const surf = surfaceAt(nx, nz, this.y);
        if (surf !== null) this.y = lerp(this.y, surf, sat(dt * 14));

        this.bob += dt * (moving > 0.05 ? (this.running ? 13 : 8.5) : 0);

        /* Inclinacion al moverse: rola hacia el lado al que se desplaza y un
           poco mas al girar, como si el cuerpo acompanara. */
        const turn = (this.lastYaw === undefined ? 0 : this.yaw - this.lastYaw);
        this.lastYaw = this.yaw;
        const wantRoll = clamp(-str * 0.055 - turn * 2.2, -0.11, 0.11)
            + Math.sin(this.bob * 0.5) * (this.running ? 0.016 : 0.009);
        this.roll = lerp(this.roll, wantRoll, sat(dt * 7));

        const eye = this.crouch ? CROUCH_EYE : EYE;
        this.eyeY = lerp(this.eyeY ?? eye, eye, sat(dt * 10));
        const bobY = Math.sin(this.bob) * (this.running ? 0.028 : 0.017);

        const cam = this.camera;
        cam.position.set(this.pos.x, this.y + this.eyeY + bobY, this.pos.z);
        cam.rotation.order = 'YXZ';
        cam.rotation.set(this.pitch, this.yaw, this.roll);
        // el FOV se abre un toque al correr
        const wantFov = FOV + (this.running ? 6 : 0);
        if (Math.abs(cam.fov - wantFov) > 0.05) { cam.fov = lerp(cam.fov, wantFov, sat(dt * 5)); cam.updateProjectionMatrix() }

        this.lamp.position.set(this.pos.x, this.y + this.eyeY + 0.12, this.pos.z);
        this.lamp.intensity = 26 + Math.sin(this.t * 9.1) * Math.sin(this.t * 3.3) * 2.2;

        for (const t of this.torches || []) {
            const f = 0.75 + 0.25 * Math.sin(this.t * 7 + t.phase) * Math.sin(this.t * 2.3 + t.phase);
            t.L.intensity = 9 * f;
            t.f.scale.setScalar(0.85 + f * 0.3);
        }

        this.updateHud();
        this.renderer.render(this.scene, this.camera);
    }

    updateHud() {
        const lv = levelAt(this.y);
        if (this._lv !== lv) {
            this._lv = lv;
            document.getElementById('level').textContent = LEVELS[lv].name;
        }
        const fill = document.getElementById('stam-fill');
        fill.style.width = (this.stamina * 100) + '%';
        fill.style.background = this.stamina < 0.25 ? '#b4483c' : '#c9c2ae';
        const st = document.getElementById('state');
        const want = this.crouch ? 'agachado' : this.running ? 'corriendo' : '';
        if (this._state !== want) { this._state = want; st.textContent = want }
        const p = document.getElementById('prompt');
        const locked = document.pointerLockElement === this.renderer.domElement;
        const show = !locked && !('ontouchstart' in window);
        if (this._prompt !== show) { this._prompt = show; p.style.display = show ? 'block' : 'none' }
    }
}

/* ------------------------------------------------------------------ arranque */
const game = new Dungeon();
const boot = document.getElementById('boot');
setTimeout(() => { boot.classList.add('gone'); setTimeout(() => boot.style.display = 'none', 700) }, 500);

let last = performance.now();
function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    game.update(dt);
    window.__DUNGEON = {
        x: +game.pos.x.toFixed(2), z: +game.pos.z.toFixed(2), y: +game.y.toFixed(2),
        level: levelAt(game.y), running: game.running, roll: +game.roll.toFixed(3),
        fov: +game.camera.fov.toFixed(1),
    };
}
requestAnimationFrame(loop);
window.__game = game;
window.__STAIRS = STAIR_BOXES;   // sondas para las pruebas
window.__LEVELS = LEVELS;
