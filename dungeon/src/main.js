/* Recorrido en primera persona del plano: jugador chico, paredes altas,
   escaleras que suben y bajan, y camara que se inclina al moverse. */
import * as THREE from 'three';
import {
    CELL, WALL_H, LEVEL_H, W, H, LEVELS, STAIRS, STAIR_BOXES, Rng,
    toWorld, toCell, isOpen, isStairCell, isHole, HOLE_H, surfaceAt, levelAt, collide, spawnOn,
    medirParedes, rescatar,
} from './map.js';
import { iniciarPantalla, vistaAncho, vistaAlto, aMarco, deltaMarco } from './pantalla.js';
import { R15 } from './r15.js';
import { cargarMuebles, poblar, chocarMuebles } from './muebles.js';
import { Mision } from './langosta.js';
import { despertarAudio } from './sonido.js';

const A = window.DUNGEON_ASSETS || {};

/* La escala sale de medir el juego original. El ojo va a 1 m —seguimos algo
   bajos, pero no somos un raton— y el techo a 4,6 m: un pasillo de 2,2 m se
   lee como un pasillo de casa. Antes el ojo iba a 55 cm contra paredes de
   7 m y cada cuarto salia del tamano de una iglesia. */
const EYE = 1.00, CROUCH_EYE = 0.60, SLIDE_EYE = 0.34, RADIUS = 0.30;
const WALK = 2.9, RUN = 5.4, CROUCH_SPD = 1.5;
const FOV = 100;
/* El deslizamiento es corto y violento a proposito: mucha velocidad al
   principio, la camara se tira al piso y el FOV pega un tiron. */
const SLIDE_TIME = 0.85, SLIDE_SPEED = 9.2, SLIDE_COOLDOWN = 0.45;

/* Altura de las bandas de la pared, como en las fotos: zocalo crema, moldura
   de madera, papel rojo y cornisa arriba. */
/* La moldura va baja: desde 55 cm de altura, un zocalo de dos metros y medio
   se come toda la vista y no se ve el papel. Asi el rojo domina, que es como
   se ve en las fotos. */
const WAINSCOT = 1.12, RAIL_H = 0.12, CORNICE = 0.34;

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
        this.renderer.toneMappingExposure = 1.06;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d1018);
        /* La niebla arrancaba a 6 m y se comia el cuarto entero. Ahora empieza
           donde termina el alcance del farol y cierra mucho mas lejos: se ve
           el fondo del pasillo, que es lo que se pedia. */
        this.scene.fog = new THREE.Fog(0x0d1018, 8, 52);
        this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.02, 300);

        /* Luz de relleno de verdad: antes el ambiente estaba en 0,06 y todo
           lo que el farol no tocaba era negro liso. Sube el piso de luz sin
           aplanar, porque el hemisferico sigue teniendo cielo y suelo. */
        this.scene.add(new THREE.HemisphereLight(0x7d90b8, 0x2a1e14, 0.85));
        this.scene.add(new THREE.AmbientLight(0xffeedd, 0.16));

        /* El farol del jugador. Como somos chicos, alcanza poco y las paredes
           se pierden hacia arriba en la oscuridad: eso es lo que las agranda. */
        /* Caida 1,2 y no 1,55: con la caida fuerte, a treinta centimetros de
           una pared el farol la quemaba en blanco. Aplanando la curva, a dos
           metros alumbra casi lo mismo y de cerca pega menos de la mitad. */
        this.lamp = new THREE.PointLight(0xffdcb8, 11, 30, 1.2);
        this.lamp.castShadow = true;
        this.lamp.shadow.mapSize.set(1024, 1024);
        this.lamp.shadow.bias = -0.004;
        this.scene.add(this.lamp);

        iniciarPantalla();
        this.build();
        this.initPlayer();
        this.bindInput();
        this.resize();
        addEventListener('resize', () => this.resize());

        this.t = 0; this.roll = 0; this.bob = 0; this.pitch = 0; this.yaw = 0;
        this.running = false; this.crouch = false;
        this.visited = new Set();

        this.cuerpo = new R15(this.scene, EYE);
        this.mision = new Mision(this.scene, { x: this.pos.x, z: this.pos.z }, A);
        this.cajasMuebles = [];

        /* Los muebles llegan tarde y no pasa nada: el nivel ya esta armado y
           entran encima. Un base64 roto cuesta una comoda, no la pantalla. */
        cargarMuebles(A).then(modelos => {
            this.modelosMuebles = modelos;
            const revisables = [];
            for (let lv = 0; lv < LEVELS.length; lv++) {
                const r = poblar(modelos, lv, LEVELS[lv].base, this.levelGroups[lv],
                    0xF0E + lv * 313, lv === 0 ? this.celdasVedadas : null);
                this.cajasMuebles.push(...r.cajas);
                revisables.push(...r.revisables);
            }
            this.mision.esconderLlave(revisables);
        });
    }

    /* El tamano sale del MARCO girado, no de la ventana: en vertical el marco
       mide innerHeight de ancho. Si se usara innerWidth, el juego saldria
       apaisado pero con el aspecto de un telefono parado. */
    resize() {
        this.renderer.setSize(vistaAncho(), vistaAlto(), false);
        this.camera.aspect = vistaAncho() / vistaAlto();
        this.camera.updateProjectionMatrix();
    }

    build() {
        /* La pared no es una sola textura: son bandas, como en las fotos.
           Zocalo crema abajo, moldura de madera, papel rojo arriba y cornisa. */
        this.mats = {
            paper: new THREE.MeshStandardMaterial({
                map: A.paper ? tex(A.paper, [1, 1]) : null,
                color: A.paper ? 0x93bcac : 0x44584f, roughness: 0.92,
            }),
            wainscot: new THREE.MeshStandardMaterial({
                map: A.wainscot ? tex(A.wainscot, [1, 1]) : null,
                color: A.wainscot ? 0xffffff : 0xcfc4ad, roughness: 0.88,
            }),
            // listel y cornisa: madera miel, como el marco de las fotos
            wood: new THREE.MeshStandardMaterial({
                map: A.ceil ? tex(A.ceil, [1, 1]) : null,
                color: A.ceil ? 0x7c6f5c : 0x8a6034, roughness: 0.66,
            }),
            floor: new THREE.MeshStandardMaterial({
                map: A.floor ? tex(A.floor, [1, 1]) : null,
                color: A.floor ? 0xffffff : 0x4a1518, roughness: 0.94,
            }),
            // el techo es de tablas, no un color plano
            ceil: new THREE.MeshStandardMaterial({
                map: A.ceil ? tex(A.ceil, [1, 1]) : null,
                color: A.ceil ? 0x968c78 : 0x3b2717, roughness: 0.85,
            }),
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
            /* Metros que cubre cada foto: el damasco tiene unos dos motivos y
               medio por lado y un motivo real mide ~0,38 m, o sea 0,95 m; el
               listel de madera repite corto para que se le vea la veta. */
            worldUV(merged, kind === 'paper' ? 0.95 : kind === 'wainscot' ? 1.25 : 0.55);
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
            worldUV(fg, 1.35);
            const fm = new THREE.Mesh(fg, this.mats.floor);
            fm.receiveShadow = true;
            group.add(fm);
            floors.forEach(g => g.dispose());
            const cg = mergeGeos(ceils);
            worldUV(cg, 2.2);   // ~16 tablas por foto y la tabla mide ~14 cm
            group.add(new THREE.Mesh(cg, this.mats.ceil));
            ceils.forEach(g => g.dispose());
        }

        this.placeChandeliers(lv, base, group);
        this.colgarCuadros(lv, base, group);
    }

    /* Faroles colgando del techo. La luz va dentro del aro, asi que el aro y
       los brazos proyectan su sombra de rueda sobre el techo: es el detalle
       que hace que se lean como lamparas y no como bolitas flotando. */
    placeChandeliers(lv, base, group) {
        const rng = new Rng(0x7A0 + lv * 977);
        // hierro negro forjado, no bronce: es lo que cuelga en el juego original
        const armMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0c, roughness: .55, metalness: .3 });
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffdda2 });
        const bulbGeo = new THREE.SphereGeometry(.05, 7, 5);
        const chainGeo = new THREE.CylinderGeometry(.018, .018, 1, 4);
        const armGeo = new THREE.BoxGeometry(.44, .035, .05);

        const hang = (c, r, big) => {
            const [x, z] = toWorld(c, r);
            const g = new THREE.Group();
            g.position.set(x, base, z);
            const rad = big ? .46 : .3, drop = big ? 1.15 : .8;
            const arms = big ? 8 : 5;

            const chain = new THREE.Mesh(chainGeo, armMat);
            chain.scale.y = drop;
            chain.position.y = WALL_H - drop / 2;
            chain.castShadow = true;
            g.add(chain);

            const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, .03, 6, 16), armMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = WALL_H - drop;
            ring.castShadow = true;
            g.add(ring);

            for (let k = 0; k < arms; k++) {
                const a = k / arms * Math.PI * 2;
                // el brazo que va del centro al aro: es lo que dibuja la rueda
                const arm = new THREE.Mesh(armGeo, armMat);
                arm.scale.x = rad / .22;
                arm.position.set(Math.cos(a) * rad / 2, WALL_H - drop, Math.sin(a) * rad / 2);
                arm.rotation.y = -a;
                arm.castShadow = true;
                g.add(arm);

                const b = new THREE.Mesh(bulbGeo, bulbMat);
                b.position.set(Math.cos(a) * rad, WALL_H - drop + .09, Math.sin(a) * rad);
                g.add(b);
            }

            // la luz va justo debajo del aro: proyecta la rueda hacia arriba
            const L = new THREE.PointLight(0xffdcb0, big ? 20 : 12, big ? 28 : 20, 1.7);
            L.position.y = WALL_H - drop - .04;
            L.shadow.mapSize.set(512, 512);
            L.shadow.bias = -0.006;
            L.shadow.camera.near = 0.08;
            g.add(L);
            group.add(g);
            (this.lamps || (this.lamps = [])).push({ L, base: big ? 20 : 12, phase: rng.range(0, 9), malo: rng.next() < 0.2 });
        };

        /* Rejilla floja: un farol cada pocas celdas, en salas y en pasillos.
           Antes solo iban donde habia 3x3 libre, asi que los pasillos —que son
           casi todo el mapa— quedaban a oscuras. */
        const STEP = 4;
        for (let r = 1; r < H - 1; r++) {
            for (let c = 1; c < W - 1; c++) {
                if ((c % STEP) || (r % STEP)) continue;
                if (!isOpen(lv, c, r) || isStairCell(c, r) || isHole(lv, c, r)) continue;
                let open3 = true;
                for (let dr = -1; dr <= 1 && open3; dr++)
                    for (let dc = -1; dc <= 1; dc++)
                        if (!isOpen(lv, c + dc, r + dr)) { open3 = false; break }
                hang(c, r, open3);
            }
        }
    }

    /* Cuadros colgados. En el juego original las paredes tienen retratos con
       marco dorado, y son lo unico que le da personalidad a un pasillo que si
       no se repite. De paso sirven de referencia para saber por donde pasaste. */
    colgarCuadros(lv, base, group) {
        const rng = new Rng(0xC0AD + lv * 71);
        const marco = new THREE.MeshStandardMaterial({ color: 0x8a6a30, roughness: .55, metalness: .4 });
        const lienzo = new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: .9 });
        let n = 0;
        for (let i = 0; i < 5000 && n < 16; i++) {
            const c = rng.int(1, W - 2), r = rng.int(1, H - 2);
            if (!isOpen(lv, c, r) || isStairCell(c, r)) continue;
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
                .filter(([dc, dr]) => !isOpen(lv, c + dc, r + dr) && !isHole(lv, c + dc, r + dr));
            if (!dirs.length) continue;
            const [dc, dr] = dirs[Math.floor(rng.next() * dirs.length)];
            const [x, z] = toWorld(c, r);
            const an = rng.range(.55, .85), al = rng.range(.55, .95);
            const px = x + dc * (CELL / 2 - .06), pz = z + dr * (CELL / 2 - .06);
            const yaw = dc ? -dc * Math.PI / 2 : (dr > 0 ? Math.PI : 0);
            const m = new THREE.Mesh(new THREE.BoxGeometry(an, al, .05), marco);
            m.position.set(px, base + 2.05, pz);
            m.rotation.y = yaw;
            m.castShadow = true;
            group.add(m);
            const l = new THREE.Mesh(new THREE.PlaneGeometry(an * .84, al * .84), lienzo);
            l.position.set(px - dc * .033, base + 2.05, pz - dr * .033);
            l.rotation.y = yaw;
            group.add(l);
            n++;
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
        this.celdasVedadas = [];
        for (let dr = -2; dr <= 2; dr++)
            for (let dc = -2; dc <= 2; dc++)
                this.celdasVedadas.push((s.c + dc) + ',' + (s.r + dr));
    }

    bindInput() {
        this.keys = {};
        /* El navegador no deja sonar hasta que hay un gesto del usuario, asi
           que el audio se despierta con el primer toque, click o tecla. */
        const arranque = () => despertarAudio();
        // apenas hay un dedo, salen los controles tactiles
        addEventListener('touchstart', () => document.body.classList.add('tactil'),
            { once: true, passive: true });
        for (const ev of ['pointerdown', 'touchstart', 'keydown'])
            addEventListener(ev, arranque, { once: false, passive: true });
        addEventListener('keydown', e => {
            this.keys[e.code] = true;
            /* El deslizamiento se engancha en el keydown y no leyendo la tecla
               cada frame: un toque corto puede caer entero entre dos frames y
               perderse, justo cuando mas rapido va todo. */
            if (e.code === 'KeyX' || e.code === 'Space') this.slideRequested = true;
            if (e.code === 'KeyR' || e.code === 'CapsLock') this.autoRun = !this.autoRun;
            if (e.code === 'KeyE' || e.code === 'Enter') this.usarPedido = true;
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

        /* Los dedos vienen en coordenadas de PANTALLA y el juego vive en un
           marco girado 90°, asi que hay que traducirlos. Los botones no lo
           necesitan —estan adentro del marco y el navegador ya les acierta—
           pero el joystick y el arrastre para mirar se leen crudos.

           El centro del joystick sale de offsetLeft/offsetTop y no de
           getBoundingClientRect: el rect de un elemento girado es su caja
           alineada a los ejes de la pantalla, no la del elemento. */
        const onStart = e => {
            for (const t of e.changedTouches) {
                const [mx, my] = aMarco(t.clientX, t.clientY);
                const inStick = mx < vistaAncho() * 0.5;
                if (inStick && !this.stick.active) {
                    this.stick.active = true; this.stick.id = t.identifier;
                    this.stick.cx = base.offsetLeft + base.offsetWidth / 2;
                    this.stick.cy = base.offsetTop + base.offsetHeight / 2;
                } else if (!this.look.active) {
                    this.look.active = true; this.look.id = t.identifier;
                    this.look.lx = t.clientX; this.look.ly = t.clientY;
                    this.look.movio = 0;
                }
            }
            e.preventDefault();
        };
        const onMove = e => {
            for (const t of e.changedTouches) {
                if (this.stick.active && t.identifier === this.stick.id) {
                    const [mx, my] = aMarco(t.clientX, t.clientY);
                    let dx = mx - this.stick.cx, dy = my - this.stick.cy;
                    const d = Math.hypot(dx, dy);
                    if (d > R) { dx = dx / d * R; dy = dy / d * R }
                    this.stick.x = dx / R; this.stick.y = dy / R;
                    setKnob(dx, dy);
                } else if (this.look.active && t.identifier === this.look.id) {
                    const [dx, dy] = deltaMarco(t.clientX - this.look.lx, t.clientY - this.look.ly);
                    this.yaw -= dx * 0.005;
                    this.pitch = clamp(this.pitch - dy * 0.005, -1.2, 1.2);
                    this.look.lx = t.clientX; this.look.ly = t.clientY;
                    this.look.movio += Math.abs(dx) + Math.abs(dy);
                }
            }
            e.preventDefault();
        };
        const onEnd = e => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.stick.id) { this.stick.active = false; this.stick.id = -1; this.stick.x = this.stick.y = 0; setKnob(0, 0) }
                if (t.identifier === this.look.id) {
                    // un toque sin arrastre es "usar": en tactil nadie busca un boton chico
                    if (this.look.movio < 12) this.usarPedido = true;
                    this.look.active = false; this.look.id = -1;
                }
            }
        };
        /* Los tres botones de las fotos: agacharse, alternar carrera y
           deslizar. El de deslizar solo se enciende cuando vas corriendo. */
        const btn = (id, down, up) => {
            const el = document.getElementById(id);
            const a = e => { e.preventDefault(); e.stopPropagation(); down() };
            el.addEventListener('touchstart', a, { passive: false });
            el.addEventListener('mousedown', a);
            if (up) {
                const b = e => { e.preventDefault(); up() };
                el.addEventListener('touchend', b);
                el.addEventListener('touchcancel', b);
                el.addEventListener('mouseup', b);
                el.addEventListener('mouseleave', b);
            }
            return el;
        };
        this.slideBtn = btn('slide', () => { this.slideRequested = true });
        this.runBtn = btn('runtoggle', () => { this.autoRun = !this.autoRun });
        btn('crouch', () => { this.touchCrouch = true }, () => { this.touchCrouch = false });
        this.usarBtn = btn('usar', () => { this.usarPedido = true });

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
        this.crouch = !!(k.KeyC || k.ControlLeft || k.ControlRight || this.touchCrouch);

        /* Deslizamiento: corto, muy rapido y con la camara tirada al piso.
           Es la unica forma de cruzar los huecos sin frenar a agacharse. */
        this.slideCd = Math.max(0, (this.slideCd || 0) - dt);
        const wantSlide = !!this.slideRequested;
        this.slideRequested = false;
        if (this.slideT > 0) this.slideT -= dt;
        /* Alcanza con estar MOVIENDOSE. Antes pedia ir corriendo, y en el
           celular eso significa empujar el joystick pasado el 70%: el que
           tocaba DESLIZAR caminando no veia pasar nada y el boton parecia
           roto. */
        else if (wantSlide && this.slideCd <= 0 && Math.hypot(fwd, str) > 0.25) {
            this.slideT = SLIDE_TIME;
            this.slideCd = SLIDE_TIME + SLIDE_COOLDOWN;
            this.slideDir = null;
            this.slideSide = Math.random() < 0.5 ? -1 : 1;
        }
        const sliding = this.slideT > 0;

        /* Sin barra de aguante: se corre todo lo que uno quiera. El limite
           del juego es el RUIDO —correr lo trae— y no una barra que se vacia. */
        const wantRun = (!!(k.ShiftLeft || k.ShiftRight) || stickRun || this.autoRun)
            && !this.crouch && !sliding;

        const moving = Math.hypot(fwd, str);
        let spd = this.crouch ? CROUCH_SPD : wantRun ? RUN : WALK;
        if (sm > 0.12 && !wantRun && !sliding) spd *= clamp(sm, 0.35, 1);
        // el envion arranca fuerte y se va apagando
        const slideK = sliding ? this.slideT / SLIDE_TIME : 0;
        if (sliding) spd = lerp(WALK * 0.9, SLIDE_SPEED, slideK * slideK);

        this.running = wantRun && moving > 0.05;

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
        /* Los muebles PRIMERO y las paredes despues. Al reves, el mueble te
           empujaba adentro de una pared, la pared te devolvia al mueble y
           quedabas rebotando entre los dos sin poder salir. La pared tiene la
           ultima palabra porque es la que no se puede atravesar. */
        [nx, nz] = chocarMuebles(this.cajasMuebles, nx, nz, this.y, RADIUS * 0.8);
        [nx, nz] = collide(nx, nz, this.y, sliding ? RADIUS * 0.7 : RADIUS, low);

        /* Y la red: si igual quedaste dentro de algo solido, se sale de una vez
           a la celda abierta mas cerca. Pasa al pararse adentro de un hueco de
           62 cm, o al reaparecer encima de una pared. */
        const salvado = rescatar(nx, nz, this.y, low);
        if (salvado) { nx = salvado[0]; nz = salvado[1]; this.rescates = (this.rescates || 0) + 1 }
        this.pos.set(nx, 0, nz);

        /* La altura sigue la superficie. El salto entre niveles se hace de
           GOLPE y no interpolando: mientras interpolabas, `levelAt(y)` ya
           devolvia el otro nivel y la colision usaba la grilla equivocada —
           por eso habia paredes que se atravesaban y pisos por los que se
           caia. Solo se suaviza el escalon chico de una escalera. */
        const surf = surfaceAt(nx, nz, this.y);
        if (surf !== null) {
            this.y = Math.abs(surf - this.y) > LEVEL_H * 0.4
                ? surf
                : lerp(this.y, surf, sat(dt * 22));
        }

        this.bob += dt * (moving > 0.05 ? (this.running ? 13 : 8.5) : 0);
        // cuanto baja por segundo: con eso se sabe si esta cayendo
        this._caida = Math.max(0, ((this._yprev ?? this.y) - this.y) / Math.max(dt, 1e-4));
        this._yprev = this.y;

        /* Inclinacion al moverse: rola hacia el lado al que se desplaza y un
           poco mas al girar, como si el cuerpo acompanara. */
        const turn = (this.lastYaw === undefined ? 0 : this.yaw - this.lastYaw);
        this.lastYaw = this.yaw;
        const apretado = this.espacio ? this.espacio.encajonado : 0;
        let wantRoll = clamp(-str * 0.055 - turn * 2.2, -0.11, 0.11)
            + Math.sin(this.bob * 0.5) * (this.running ? 0.016 : 0.009) * (1 - apretado * 0.55);
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
        /* Al tirarse la cabeza cae y se mira las propias piernas: sin esto quedan
           abajo del borde de la pantalla y el deslizamiento no se ve. */
        /* El susto: la camara tiembla y la pantalla pega un flash rojo. Es la
           mitad del efecto de que te vea; sin eso, el grito suena solo. */
        const su = this.mision.susto || 0;
        const tx = su > 0 ? Math.sin(this.t * 47) * 0.045 * su : 0;
        const tz = su > 0 ? Math.sin(this.t * 61 + 1.3) * 0.055 * su : 0;
        cam.rotation.set(this.pitch + (sliding ? -0.24 * slideK : 0) + tx,
                         this.yaw, this.roll + tz);
        // el FOV se abre al correr y pega un tiron al deslizar
        /* Y se usa para algo: en un pasillo angosto el FOV se cierra unos
           grados y el balanceo se achica. Un pasillo de 2,2 m con el mismo
           campo que una sala de 11 se lee como un tubo de ojo de pez. */
        const enc = this.espacio ? this.espacio.encajonado : 0;
        const wantFov = FOV - enc * 7 + (this.running ? 6 : 0) + (sliding ? 22 * slideK : 0);
        if (Math.abs(cam.fov - wantFov) > 0.05) {
            cam.fov = lerp(cam.fov, wantFov, sat(dt * (sliding ? 22 : 5)));
            cam.updateProjectionMatrix();
        }

        this.cuerpo.actualizar({
            x: this.pos.x, y: this.y, z: this.pos.z, yaw: this.yaw,
            ojo: this.eyeY, vel: speed, corriendo: this.running,
            agachado: this.crouch, deslizando: sliding, k: slideK, t: this.t, dt,
            empujando: !!this.mision.empujando,
            cayendo: (this._caida || 0) > 0.9,
        });

        /* Las paredes se miden EN VIVO, no se leen de una tabla: cada cuadro se
           camina la grilla en las cuatro direcciones hasta chocar. Con eso el
           juego sabe si estás en un pasillo o en una sala, y lo usa. */
        this.espacio = medirParedes(this.pos.x, this.pos.z, this.y);

        /* La mision y el bicho. El ruido sale de COMO te movés, no de donde
           estás: correr y deslizarse lo hacen, agachado no. */
        if (this.usarPedido) {
            this.usarPedido = false;
            this.mision.usar(this.pos.x, this.y, this.pos.z);
        }
        this.mision.actualizar(dt, {
            x: this.pos.x, y: this.y, z: this.pos.z, yaw: this.yaw,
            corriendo: this.running, agachado: this.crouch, deslizando: sliding,
        });
        if (this.mision.reaparecer) {
            const [rx, rz] = this.mision.reaparecer;
            this.mision.reaparecer = null;
            this.pos.set(rx, 0, rz);
            this.slideT = 0;
            const sy = surfaceAt(rx, rz, this.y);
            if (sy !== null) this.y = sy;
        }

        /* El farol va 35 cm por DELANTE, no encima de la cabeza: pegado al
           cuerpo le quemaba los hombros en blanco y no se veia nada al mirar
           para abajo. Adelante alumbra el pasillo, que es para lo que esta. */
        this.lamp.position.set(this.pos.x - Math.sin(this.yaw) * 0.35, this.y + 1.15,
                               this.pos.z - Math.cos(this.yaw) * 0.35);
        this.lamp.intensity = 11 + Math.sin(this.t * 9.1) * Math.sin(this.t * 3.3) * 1.0;

        /* Una luz puntual con sombra cuesta seis caras de render, asi que solo
           las proyectan las mas cercanas: son las unicas cuya rueda en el techo
           se llega a ver. La lista se reordena cada pocos frames, no siempre. */
        // arranca en positivo para que la primera asignacion salga ya en el
        // primer frame y no despues de un cuarto de segundo a oscuras
        this.shadowTick = (this.shadowTick === undefined ? 1 : this.shadowTick) + dt;
        if (this.lamps && this.shadowTick > 0.25) {
            this.shadowTick = 0;
            const px = this.pos.x, py = this.y, pz = this.pos.z;
            for (const l of this.lamps) {
                l.L.getWorldPosition(this._lp || (this._lp = new THREE.Vector3()));
                l.d = this._lp.distanceToSquared({ x: px, y: py + 1, z: pz });
            }
            const near = this.lamps.slice().sort((a, b) => a.d - b.d).slice(0, 3);
            const set = new Set(near);
            for (const l of this.lamps) {
                const want = set.has(l);
                if (l.L.castShadow !== want) l.L.castShadow = want;
            }
        }
        for (const l of this.lamps || []) {
            const base = l.base;
            let f = 0.92 + 0.08 * Math.sin(this.t * 5.7 + l.phase) * Math.sin(this.t * 1.9 + l.phase);
            /* Una de cada cinco parpadea FUERTE, con cortes secos. Un titileo
               parejo en todas se lee como un error de render; unas pocas que se
               cortan se leen como una instalacion vieja. */
            if (l.malo) {
                const t = this.t * 7.3 + l.phase;
                f *= (Math.sin(t) * Math.sin(t * 2.7) > 0.45) ? 0.18 : 1;
            }
            l.L.intensity = base * f;
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
        // el boton de deslizar se enciende solo cuando hay carrera que aprovechar
        const canSlide = this.slideCd <= 0 && !this.crouch;
        if (this._canSlide !== canSlide) {
            this._canSlide = canSlide;
            this.slideBtn && this.slideBtn.classList.toggle('on', canSlide);
        }
        if (this._auto !== this.autoRun) {
            this._auto = this.autoRun;
            this.runBtn && this.runBtn.classList.toggle('on', !!this.autoRun);
        }
        const st = document.getElementById('state');
        const want = this.slideT > 0 ? 'deslizando'
            : this.crouch ? 'agachado'
                : this.running ? (this.autoRun ? 'corriendo · automático' : 'corriendo') : '';
        if (this._state !== want) { this._state = want; st.textContent = want }
        const p = document.getElementById('prompt');
        const locked = document.pointerLockElement === this.renderer.domElement;
        const show = !locked && !('ontouchstart' in window);
        if (this._prompt !== show) { this._prompt = show; p.style.display = show ? 'block' : 'none' }

        // la mision: el pendiente, lo que tengo delante y el ultimo aviso
        const M = this.mision;
        const tarea = M.tareas()[0];
        if (this._tarea !== tarea) {
            this._tarea = tarea;
            document.getElementById('tarea').textContent = tarea;
        }
        const foco = M.mirando(this.pos.x, this.y, this.pos.z);
        const txt = foco ? foco.texto : '';
        if (this._foco !== txt) {
            this._foco = txt;
            const el = document.getElementById('accion');
            el.textContent = txt;
            el.style.opacity = txt ? '1' : '0';
            this.usarBtn && this.usarBtn.classList.toggle('on', !!txt && foco.tipo !== 'nada');
        }
        const av = M.avisoT > 0 ? M.aviso : '';
        if (this._aviso !== av) {
            this._aviso = av;
            document.getElementById('aviso').textContent = av;
            document.getElementById('aviso').style.opacity = av ? '1' : '0';
        }
        const su = Math.min(1, M.susto || 0);
        if (this._susto !== (su > 0.02)) {
            this._susto = su > 0.02;
        }
        const fl = document.getElementById('flash');
        if (fl) fl.style.opacity = (su * 0.45).toFixed(3);
        const ng = document.getElementById('negro');
        if (ng) ng.style.opacity = Math.min(1, (M.negro || 0)).toFixed(3);

        // la bolsa: se enciende cada cosa cuando la tenés
        for (const [id, tiene] of [['i-pinza', M.tienePinza], ['i-llave', M.tieneLlave],
                                   ['i-tarjeta', M.tieneTarjeta]]) {
            if (this['_' + id] === tiene) continue;
            this['_' + id] = tiene;
            document.getElementById(id).classList.toggle('hay', !!tiene);
        }

        if (M.terminado === 'escapo' && !this._fin) {
            this._fin = true;
            document.getElementById('fin').classList.add('ver');
        }
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
        autoRun: !!game.autoRun, lamps: (game.lamps || []).length,
        bicho: game.mision ? {
            x: +game.mision.bicho.pos.x.toFixed(2), z: +game.mision.bicho.pos.y.toFixed(2),
            estado: game.mision.bicho.estado, ruido: +game.mision.ruido.toFixed(2),
            atrapadas: game.mision.atrapadas,
        } : null,
        cuerpo: game.cuerpo ? +game.cuerpo.raiz.scale.x.toFixed(3) : null,
        espacio: game.espacio ? {
            ancho: +game.espacio.ancho.toFixed(2), largo: +game.espacio.largo.toFixed(2),
            encajonado: +game.espacio.encajonado.toFixed(2), sala: game.espacio.enSala,
        } : null,
        muebles: (game.cajasMuebles || []).length,
        rescates: game.rescates || 0,
        puestos: game.mision ? game.mision.puestos : 0,
        shadowing: (game.lamps || []).filter(l => l.L.castShadow).length,
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
