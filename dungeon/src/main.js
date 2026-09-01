/* Recorrido en primera persona del plano: jugador chico, paredes altas,
   escaleras que suben y bajan, y camara que se inclina al moverse. */
import * as THREE from 'three';
import {
    CELL, WALL_H, LEVEL_H, W, H, LEVELS, STAIRS, STAIR_BOXES, Rng,
    toWorld, toCell, isOpen, isStairCell, isHole, HOLE_H, surfaceAt, levelAt, collide, spawnOn,
} from './map.js';

const A = window.DUNGEON_ASSETS || {};

/* Somos chicos: el ojo va a 55 cm y las paredes miden 7 m, asi que un pasillo
   de 2,2 m se lee como una nave. Todo lo demas sale de esta escala. */
const EYE = 0.55, CROUCH_EYE = 0.34, SLIDE_EYE = 0.19, RADIUS = 0.26;
const WALK = 2.3, RUN = 4.6, CROUCH_SPD = 1.2;
const FOV = 100;
/* El deslizamiento es corto y violento a proposito: mucha velocidad al
   principio, la camara se tira al piso y el FOV pega un tiron. */
const SLIDE_TIME = 0.85, SLIDE_SPEED = 8.2, SLIDE_COOLDOWN = 0.45;

/* Altura de las bandas de la pared, como en las fotos: zocalo crema, moldura
   de madera, papel rojo y cornisa arriba. */
const WAINSCOT = 2.55, RAIL_H = 0.16, CORNICE = 0.34;

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
        this.lamp = new THREE.PointLight(0xffc98a, 19, 30, 1.55);
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
        /* La pared no es una sola textura: son bandas, como en las fotos.
           Zocalo crema abajo, moldura de madera, papel rojo arriba y cornisa. */
        this.mats = {
            paper: new THREE.MeshStandardMaterial({
                map: A.paper ? tex(A.paper, [1, 1]) : null,
                color: A.paper ? 0xffffff : 0x6e1c22, roughness: 0.92,
            }),
            wainscot: new THREE.MeshStandardMaterial({
                map: A.wainscot ? tex(A.wainscot, [1, 1]) : null,
                color: A.wainscot ? 0xffffff : 0xcfc4ad, roughness: 0.88,
            }),
            wood: new THREE.MeshStandardMaterial({ color: 0x4a2e1c, roughness: 0.7 }),
            floor: new THREE.MeshStandardMaterial({
                map: A.floor ? tex(A.floor, [1, 1]) : null,
                color: A.floor ? 0xffffff : 0x3a2417, roughness: 0.72,
            }),
            ceil: new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.9 }),
            dark: new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1 }),
        };
        for (let lv = 0; lv < LEVELS.length; lv++) this.buildLevel(lv);
        this.buildStairs(this.mats.floor);
    }

    /* Una tira de pared, partida en sus bandas. `y0` permite arrancar arriba
       del piso: es lo que deja el hueco rectangular por el que se pasa. */
    wallStrip(out, cx, cz, w, d, base, y0) {
        const push = (bucket, h, yy) => {
            if (h <= 0.001) return;
            const g = new THREE.BoxGeometry(w, h, d);
            g.translate(cx, base + yy + h / 2, cz);
            out[bucket].push(g);
        };
        const wainTop = Math.max(y0, WAINSCOT);
        push('wainscot', wainTop - y0, y0);
        push('wood', RAIL_H, wainTop);
        push('paper', WALL_H - CORNICE - wainTop - RAIL_H, wainTop + RAIL_H);
        push('wainscot', CORNICE, WALL_H - CORNICE);
    }

    buildLevel(lv) {
        const base = LEVELS[lv].base;
        const group = new THREE.Group();
        this.scene.add(group);
        (this.levelGroups || (this.levelGroups = []))[lv] = group;

        const out = { paper: [], wainscot: [], wood: [], dark: [] };
        const solid = (c, r) => c < W && !isOpen(lv, c, r) && !isHole(lv, c, r);

        /* Tiras horizontales de pared, cortadas en los huecos. El hueco se
           emite aparte porque arranca a media altura, no en el piso. */
        for (let r = 0; r < H; r++) {
            let run = 0;
            for (let c = 0; c <= W; c++) {
                if (solid(c, r)) { run++; continue }
                if (run) {
                    const [x0] = toWorld(c - run, r), [x1] = toWorld(c - 1, r);
                    const [, z] = toWorld(c - run, r);
                    this.wallStrip(out, (x0 + x1) / 2, z, run * CELL, CELL, base, 0);
                    run = 0;
                }
                if (c < W && isHole(lv, c, r)) {
                    const [hx, hz] = toWorld(c, r);
                    this.wallStrip(out, hx, hz, CELL, CELL, base, HOLE_H);
                    // el fondo del hueco, para que no se vea el vacio al cruzar
                    const jamb = new THREE.BoxGeometry(CELL, HOLE_H, 0.06);
                    jamb.translate(hx, base + HOLE_H / 2, hz);
                    out.dark.push(jamb);
                }
            }
        }
        for (const kind of Object.keys(out)) {
            if (!out[kind].length) continue;
            const merged = mergeGeos(out[kind]);
            worldUV(merged, kind === 'paper' ? 0.95 : kind === 'wainscot' ? 1.25 : 0.7);
            const m = new THREE.Mesh(merged, this.mats[kind]);
            m.castShadow = m.receiveShadow = true;
            group.add(m);
            out[kind].forEach(g => g.dispose());
        }

        // piso y techo: bajo las celdas abiertas y tambien bajo los huecos
        const floors = [], ceils = [];
        for (let r = 0; r < H; r++) {
            let run = 0;
            for (let c = 0; c <= W; c++) {
                const open = c < W && (isOpen(lv, c, r) || isHole(lv, c, r)) && !isStairCell(c, r);
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
            worldUV(fg, 1.5);
            const fm = new THREE.Mesh(fg, this.mats.floor);
            fm.receiveShadow = true;
            group.add(fm);
            floors.forEach(g => g.dispose());
            const cg = mergeGeos(ceils);
            worldUV(cg, 2.2);
            group.add(new THREE.Mesh(cg, this.mats.ceil));
            ceils.forEach(g => g.dispose());
        }

        this.placeChandeliers(lv, base, group);
        this.placeFurniture(lv, base, group);
    }

    /* Arañas colgando del techo, como en las fotos. Son la unica luz fija:
       dan altura al espacio y dejan el piso en penumbra. */
    placeChandeliers(lv, base, group) {
        const rng = new Rng(0x7A0 + lv * 977);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: .6, metalness: .35 });
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffdda2 });
        const bulbGeo = new THREE.SphereGeometry(.055, 7, 5);
        const ringGeo = new THREE.TorusGeometry(.42, .035, 6, 14);
        const chainGeo = new THREE.CylinderGeometry(.02, .02, 1, 4);
        let placed = 0;
        for (let i = 0; i < 4000 && placed < 20; i++) {
            const c = rng.int(2, W - 3), r = rng.int(2, H - 3);
            if (!isOpen(lv, c, r) || isStairCell(c, r)) continue;
            // solo donde hay lugar: en un pasillo de una celda queda pegada
            let room = true;
            for (let dr = -1; dr <= 1 && room; dr++)
                for (let dc = -1; dc <= 1; dc++)
                    if (!isOpen(lv, c + dc, r + dr)) { room = false; break }
            if (!room) continue;

            const [x, z] = toWorld(c, r);
            const g = new THREE.Group();
            g.position.set(x, base, z);
            const chain = new THREE.Mesh(chainGeo, armMat);
            chain.scale.y = 1.1;
            chain.position.y = WALL_H - 0.55;
            g.add(chain);
            const ring = new THREE.Mesh(ringGeo, armMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = WALL_H - 1.1;
            g.add(ring);
            for (let k = 0; k < 6; k++) {
                const a = k / 6 * Math.PI * 2;
                const b = new THREE.Mesh(bulbGeo, bulbMat);
                b.position.set(Math.cos(a) * .42, WALL_H - 1.0, Math.sin(a) * .42);
                g.add(b);
            }
            const L = new THREE.PointLight(0xffca86, 13, 17, 1.7);
            L.position.y = WALL_H - 1.15;
            g.add(L);
            group.add(g);
            (this.lamps || (this.lamps = [])).push({ L, phase: rng.range(0, 9) });
            placed++;
        }
    }

    /* Roperos y comodas contra las paredes: llenan las salas grandes y de paso
       dan referencia de tamano, que es de lo que se trata todo esto. */
    placeFurniture(lv, base, group) {
        const rng = new Rng(0xF0E + lv * 313);
        const wood = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: .62 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x3a2415, roughness: .7 });
        const pieces = [];
        let placed = 0;
        for (let i = 0; i < 6000 && placed < 34; i++) {
            const c = rng.int(1, W - 2), r = rng.int(1, H - 2);
            if (!isOpen(lv, c, r) || isStairCell(c, r)) continue;
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
                .filter(([dc, dr]) => !isOpen(lv, c + dc, r + dr) && !isHole(lv, c + dc, r + dr));
            if (!dirs.length) continue;
            const [dc, dr] = dirs[Math.floor(rng.next() * dirs.length)];
            const [x, z] = toWorld(c, r);
            const tall = rng.next() < .45;
            const w = tall ? 1.15 : 1.25, hgt = tall ? 2.05 : 0.95, d = tall ? .62 : .55;
            const along = dc ? d : w, across = dc ? w : d;
            const px = x + dc * (CELL / 2 - (dc ? d : 0) / 2 - .06);
            const pz = z + dr * (CELL / 2 - (dr ? d : 0) / 2 - .06);
            const body = new THREE.BoxGeometry(along, hgt, across);
            body.translate(px, base + hgt / 2, pz);
            pieces.push({ g: body, m: wood });
            // dos puertas o cajones marcados con una caja fina mas oscura
            const inset = new THREE.BoxGeometry(along * .82, hgt * (tall ? .58 : .34), across * .82);
            inset.translate(px + dc * .02, base + hgt * (tall ? .62 : .55), pz + dr * .02);
            pieces.push({ g: inset, m: dark });
            placed++;
        }
        for (const mat of [wood, dark]) {
            const list = pieces.filter(p => p.m === mat).map(p => p.g);
            if (!list.length) continue;
            const merged = mergeGeos(list);
            worldUV(merged, .8);
            const m = new THREE.Mesh(merged, mat);
            m.castShadow = m.receiveShadow = true;
            group.add(m);
            list.forEach(g => g.dispose());
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
        // boton de deslizar, como el DESLIZAR de las fotos
        const slideBtn = document.getElementById('slide');
        const fire = e => { e.preventDefault(); e.stopPropagation(); this.slideRequested = true };
        slideBtn.addEventListener('touchstart', fire, { passive: false });
        slideBtn.addEventListener('mousedown', fire);

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

        /* Deslizamiento: corto, muy rapido y con la camara tirada al piso.
           Es la unica forma de cruzar los huecos sin frenar a agacharse. */
        this.slideCd = Math.max(0, (this.slideCd || 0) - dt);
        const wantSlide = !!(k.KeyX || k.Space) || this.slideRequested;
        this.slideRequested = false;
        if (this.slideT > 0) this.slideT -= dt;
        else if (wantSlide && this.slideCd <= 0 && Math.hypot(fwd, str) > 0.35) {
            this.slideT = SLIDE_TIME;
            this.slideCd = SLIDE_TIME + SLIDE_COOLDOWN;
            this.slideDir = null;
            this.slideSide = Math.random() < 0.5 ? -1 : 1;
        }
        const sliding = this.slideT > 0;

        const wantRun = (!!(k.ShiftLeft || k.ShiftRight) || stickRun) && !this.crouch && !sliding && this.stamina > 0.02;

        const moving = Math.hypot(fwd, str);
        let spd = this.crouch ? CROUCH_SPD : wantRun ? RUN : WALK;
        if (sm > 0.12 && !wantRun && !sliding) spd *= clamp(sm, 0.35, 1);
        // el envion arranca fuerte y se va apagando
        const slideK = sliding ? this.slideT / SLIDE_TIME : 0;
        if (sliding) spd = lerp(WALK * 0.9, SLIDE_SPEED, slideK * slideK);

        this.running = wantRun && moving > 0.05;
        if (this.running) this.stamina = Math.max(0, this.stamina - dt * 0.22);
        else this.stamina = Math.min(1, this.stamina + dt * 0.16);

        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        let vx = (-sin * fwd + cos * str), vz = (-cos * fwd - sin * str);
        const len = Math.hypot(vx, vz) || 1;
        vx /= len; vz /= len;
        // deslizando la direccion queda fijada al arrancar: no se dobla
        if (sliding) {
            if (!this.slideDir) this.slideDir = moving > 0.05 ? [vx, vz] : [-sin, -cos];
            [vx, vz] = this.slideDir;
        }
        const speed = spd * (sliding ? 1 : Math.min(moving, 1));
        vx *= speed; vz *= speed;

        // agachado o deslizando se pasa por los huecos de las paredes
        const low = sliding || this.crouch;
        let nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt;
        [nx, nz] = collide(nx, nz, this.y, sliding ? RADIUS * 0.7 : RADIUS, low);
        this.pos.set(nx, 0, nz);

        // la altura sigue la superficie: escaleras arriba y abajo sin fisica
        const surf = surfaceAt(nx, nz, this.y);
        if (surf !== null) this.y = lerp(this.y, surf, sat(dt * 14));

        this.bob += dt * (moving > 0.05 ? (this.running ? 13 : 8.5) : 0);

        /* Inclinacion al moverse: rola hacia el lado al que se desplaza y un
           poco mas al girar, como si el cuerpo acompanara. */
        const turn = (this.lastYaw === undefined ? 0 : this.yaw - this.lastYaw);
        this.lastYaw = this.yaw;
        let wantRoll = clamp(-str * 0.055 - turn * 2.2, -0.11, 0.11)
            + Math.sin(this.bob * 0.5) * (this.running ? 0.016 : 0.009);
        // el tiron del deslizamiento: rola fuerte y tiembla mientras dura
        if (sliding) wantRoll += this.slideSide * (0.16 * slideK + 0.03 * Math.sin(this.t * 41) * slideK);
        this.roll = lerp(this.roll, wantRoll, sat(dt * (sliding ? 18 : 7)));

        const eye = sliding ? SLIDE_EYE : this.crouch ? CROUCH_EYE : EYE;
        // al tirarse baja de golpe; al levantarse vuelve suave
        this.eyeY = lerp(this.eyeY ?? eye, eye, sat(dt * (sliding ? 26 : 9)));
        const bobY = sliding ? 0 : Math.sin(this.bob) * (this.running ? 0.028 : 0.017);

        const cam = this.camera;
        cam.position.set(this.pos.x, this.y + this.eyeY + bobY, this.pos.z);
        cam.rotation.order = 'YXZ';
        // deslizando la cabeza tambien se va para atras
        cam.rotation.set(this.pitch + (sliding ? -0.16 * slideK : 0), this.yaw, this.roll);
        // el FOV se abre al correr y pega un tiron al deslizar
        const wantFov = FOV + (this.running ? 6 : 0) + (sliding ? 22 * slideK : 0);
        if (Math.abs(cam.fov - wantFov) > 0.05) {
            cam.fov = lerp(cam.fov, wantFov, sat(dt * (sliding ? 22 : 5)));
            cam.updateProjectionMatrix();
        }

        this.lamp.position.set(this.pos.x, this.y + this.eyeY + 0.12, this.pos.z);
        this.lamp.intensity = 19 + Math.sin(this.t * 9.1) * Math.sin(this.t * 3.3) * 1.8;

        for (const l of this.lamps || []) {
            const f = 0.9 + 0.1 * Math.sin(this.t * 5.7 + l.phase) * Math.sin(this.t * 1.9 + l.phase);
            l.L.intensity = 13 * f;
        }

        /* Solo se dibuja el nivel en el que esta y el de al lado. Son tres
           laberintos enteros y el farol proyecta sombra en todo lo visible. */
        for (let i = 0; i < this.levelGroups.length; i++)
            this.levelGroups[i].visible = Math.abs(LEVELS[i].base - this.y) < LEVEL_H * 1.35;

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
        const want = this.slideT > 0 ? 'deslizando'
            : this.crouch ? 'agachado' : this.running ? 'corriendo' : '';
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
        sliding: (game.slideT || 0) > 0, eye: +(game.eyeY || 0).toFixed(2),
        fov: +game.camera.fov.toFixed(1),
    };
}
requestAnimationFrame(loop);
window.__game = game;
window.__STAIRS = STAIR_BOXES;   // sondas para las pruebas
window.__LEVELS = LEVELS;
window.__toWorld = toWorld;
import * as MAP from './map.js';
window.__MAP = MAP;
