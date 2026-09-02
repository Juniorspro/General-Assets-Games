/* Recorrido en primera persona del plano: jugador chico, paredes altas,
   escaleras que suben y bajan, y camara que se inclina al moverse. */
import * as THREE from 'three';
import {
    CELL, WALL_H, GROSOR, ARRANQUE, FLECHA, ALTO_PUERTA, HOLE_H, W, H, LEVELS, Rng,
    SECTORES, SEC, sectorEn, sectorIdx, sectorPorId, temaEn, centroSector, esPiso,
    NADA, PARED, PUERTA, GATERA, paredV, paredH, hayPared, HOLE_W,
    toWorld, toCell, bordeX, bordeZ, isOpen, surfaceAt, levelAt, collide, spawnOn,
    medirParedes, rescatar, SALAS, salaEn, salaPorId, centroSala,
} from './map.js';
import { texAlfombra, texYeso, texHormigon, texBaldosa, texTabla, texFrase, FRASES, pilaDeCajones, tablon, crucifijo } from './deco.js';
import { iniciarPantalla, vistaAncho, vistaAlto, aMarco, deltaMarco } from './pantalla.js';
import { R15 } from './r15.js';
import { cargarMuebles, poblar, chocarMuebles } from './muebles.js';
import { Mision } from './langosta.js';
import { despertarAudio } from './sonido.js';
import * as S from './sonido.js';
import { Calidad } from './calidad.js';
import { Intro, ALTO_CAJA } from './intro.js';
import { precargar } from './carga.js';
import { cargarMuestras } from './muestras.js';
import { puente } from './sonido.js';
import * as MU from './muestras.js';

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

/* Las bandas de una cara de tabique, medidas sobre las capturas: zocalo de
   madera naranja abajo, papel damasco arriba, y un riel de la misma madera
   donde arranca la boveda. NO hay zocalo crema alto ni moldura a media altura:
   eso era de otra casa. */
const ZOCALO = 0.34, RIEL = 0.20;

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
        /* La casa del original es CLARA: pasillos parejos, techos encendidos y
           sombra sólo debajo de los muebles. La nuestra venía de un dungeon y
           se notaba. Exposición, ambiente y hemisférica suben juntas. */
        this.renderer.toneMappingExposure = 1.24;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d0b08);
        /* La niebla arrancaba a 6 m y se comia el cuarto entero. Ahora empieza
           donde termina el alcance del farol y cierra mucho mas lejos: se ve
           el fondo del pasillo, que es lo que se pedia. */
        /* La niebla es CALIDA y arranca lejos. Antes era azul noche a 52 m y en una
           casa de cien metros el fondo de cada pasillo se veia celeste: parecia
           que la casa daba a la calle. */
        this.scene.fog = new THREE.Fog(0x0d0b08, 12, 70);
        this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.02, 300);

        /* Luz de relleno de verdad: antes el ambiente estaba en 0,06 y todo
           lo que el farol no tocaba era negro liso. Sube el piso de luz sin
           aplanar, porque el hemisferico sigue teniendo cielo y suelo. */
        this.scene.add(new THREE.HemisphereLight(0x8b8270, 0x3a2c1e, 0.95));
        this.scene.add(new THREE.AmbientLight(0xffeedd, 0.46));

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

        /* El arranque: el cajón de madera flotando y las nubes. Se crea antes
           que el jugador porque initPlayer necesita saber a qué altura poner
           la cámara. */
        this.intro = new Intro(this.scene);
        this.cuerpo = new R15(this.scene, EYE);
        this.farolesConSombra = 3;
        this.lucesVivas = 10;
        this.distPisos = 1.35;
        this.mision = new Mision(this.scene, { x: this.pos.x, z: this.pos.z }, A);
        /* Los cajones del deposito y las columnas del sotano ya son solidos:
           se arman con el nivel, asi que entran a la lista antes que nada. */
        this.enMenu = true;      // hasta que se apriete JUGAR
        this.cajasMuebles = [...(this.cajasDeco || [])];

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

        /* El menu de graficos va ULTIMO: aplica los ajustes apenas se crea, y
           si se creara antes, los valores por defecto de mas abajo del
           constructor le pisarian lo que acaba de poner. Ya paso: arrancaba en
           medio pero con los tres faroles de alto proyectando. */
        this.calidad = new Calidad(this);
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
        /* La pared de la casa, medida sobre las capturas: zocalo de madera
           naranja abajo, papel damasco verde-azulado, y una banda de madera
           arriba donde arranca la boveda. La madera es GRUESA y sobresale: es
           lo primero que se ve en las fotos del desvan. */
        const alfombra = texAlfombra(), yeso = texYeso();
        const hormigon = texHormigon(), baldosa = texBaldosa();
        this.mats = {
            papel: new THREE.MeshStandardMaterial({
                map: A.paper ? tex(A.paper, [1, 1]) : null,
                color: A.paper ? 0x93a79b : 0x64796d, roughness: 0.93,
            }),
            madera: new THREE.MeshStandardMaterial({
                map: A.ceil ? tex(A.ceil, [1, 1]) : null,
                color: A.ceil ? 0x9c6a30 : 0x8d5122, roughness: 0.62,
            }),
            yeso: new THREE.MeshStandardMaterial({ map: yeso, roughness: 0.95 }),
            hormigon: new THREE.MeshStandardMaterial({ map: hormigon, roughness: 0.98 }),
            // la baldosa gris de la sala blanca, no un piso de banco
            gris: new THREE.MeshStandardMaterial({ map: baldosa, color: 0xb9b5ab, roughness: 0.5 }),
            alfombra: new THREE.MeshStandardMaterial({ map: alfombra, roughness: 1 }),
            baldosa: new THREE.MeshStandardMaterial({ map: baldosa, color: 0xb2ada2, roughness: 0.45, metalness: 0.04 }),
            // la boveda y los techos planos: tabla clara, casi crema
            tabla: new THREE.MeshStandardMaterial({
                map: texTabla(), roughness: 0.88, side: THREE.DoubleSide,
            }),
            blanco: new THREE.MeshStandardMaterial({ color: 0xe6e4de, roughness: 0.7 }),
            dark: new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1 }),
        };
        // nombres viejos que todavia usan otros archivos
        this.mats.paper = this.mats.papel;
        this.mats.floor = this.mats.alfombra;
        this.mats.ceil = this.mats.tabla;
        this.mats.cornisa = this.mats.madera;
        this.mats.zocalo = this.mats.madera;

        const casa = new THREE.Group();
        this.scene.add(casa);
        this.casa = casa;
        this.levelGroups = [casa];

        this.construirTabiques(casa);
        this.construirPisoYTecho(casa);
        this.construirBovedas(casa);
        this.vestirSectores(0, 0, casa);
        this.pintarFrases(0, 0, casa);
        this.colgarCuadros(0, 0, casa);
        this.placeChandeliers(0, 0, casa);
    }

    /* Las bandas de una cara de tabique, de abajo hacia arriba. */
    bandas(tema) {
        if (tema === 'salon' || tema === 'salida') return [['yeso', WALL_H]];
        if (tema === 'taller') return [['hormigon', WALL_H]];
        return [['madera', ZOCALO], ['papel', WALL_H - ZOCALO - RIEL], ['madera', RIEL]];
    }

    /* Una cara de tabique: un tramo de `largo` metros, pegado al borde, con sus
       bandas. `y0` deja el hueco de la gatera; `y1` corta bajo el dintel. */
    caraTabique(out, cx, cz, largo, esp, horizontal, tema, y0, y1) {
        let y = 0;
        for (const [mat, alto] of this.bandas(tema)) {
            const a = Math.max(y, y0), b = Math.min(y + alto, y1);
            y += alto;
            if (b - a <= 0.002) continue;
            const g = new THREE.BoxGeometry(horizontal ? largo : esp, b - a, horizontal ? esp : largo);
            g.translate(cx, (a + b) / 2, cz);
            (out[mat] || (out[mat] = [])).push(g);
        }
    }

    /* Los tabiques. Cada uno se emite en DOS lozas de medio espesor, una por
       cara, con el tema del sector que tiene enfrente: por eso desde el pasillo
       ves papel y desde la sala blanca ves yeso, que es lo que pasa en la foto
       donde el yeso y el papel se tocan en la esquina. */
    construirTabiques(grupo) {
        const out = {}, marcos = [], oscuro = [];
        const S = GROSOR / 2;

        const emitir = (vertical, i, j0, j1, valor, tA, tB) => {
            const largo = (j1 - j0 + 1) * CELL;
            const cFijo = vertical ? bordeX(i) : bordeZ(i);
            const cMedio = vertical ? bordeZ(j0) + largo / 2 : bordeX(j0) + largo / 2;
            const y0 = valor === GATERA ? HOLE_H : 0;
            const y1 = valor === PUERTA ? WALL_H : WALL_H;
            const desde = valor === PUERTA ? ALTO_PUERTA : y0;

            for (const [tema, lado] of [[tA, -1], [tB, 1]]) {
                if (tema === null) continue;
                const off = (tA === null || tB === null) ? 0 : lado * S / 2;
                const esp = (tA === null || tB === null) ? GROSOR : S;
                const cx = vertical ? cFijo + off : cMedio;
                const cz = vertical ? cMedio : cFijo + off;
                this.caraTabique(out, cx, cz, largo, esp, !vertical, tema, desde, y1);
            }
            if (valor === GATERA) {
                /* El hueco no ocupa la celda entera: quedan dos machones a los
                   costados, de (CELL - HOLE_W)/2 cada uno. Así hay que apuntar
                   para meterse, en vez de cruzar de cualquier forma. */
                const lado = (CELL - HOLE_W) / 2;
                for (let j = j0; j <= j1; j++) {
                    const q0 = vertical ? bordeZ(j) : bordeX(j);
                    for (const off of [lado / 2, CELL - lado / 2]) {
                        const cq = q0 + off;
                        for (const [tema, ld] of [[tA, -1], [tB, 1]]) {
                            if (tema === null) continue;
                            const o2 = (tA === null || tB === null) ? 0 : ld * S / 2;
                            const e2 = (tA === null || tB === null) ? GROSOR : S;
                            this.caraTabique(out, vertical ? cFijo + o2 : cq, vertical ? cq : cFijo + o2,
                                lado, e2, !vertical, tema, 0, HOLE_H);
                        }
                    }
                }
            }
            if (valor === PUERTA) {
                /* Marco: dos jambas gruesas en las puntas y un dintel cruzado.
                   Sobresale del tabique porque en las fotos la madera es un
                   marco aplicado, no un canto de la pared. */
                const E = GROSOR * 2.1, J = 0.26;
                for (const p of [j0, j1 + 1]) {
                    const q = vertical ? bordeZ(p) : bordeX(p);
                    const g = new THREE.BoxGeometry(vertical ? E : J, ALTO_PUERTA, vertical ? J : E);
                    g.translate(vertical ? cFijo : q, ALTO_PUERTA / 2, vertical ? q : cFijo);
                    marcos.push(g);
                }
                const d = new THREE.BoxGeometry(vertical ? E : largo + J, J, vertical ? largo + J : E);
                d.translate(vertical ? cFijo : cMedio, ALTO_PUERTA - J / 2, vertical ? cMedio : cFijo);
                marcos.push(d);
            }
        };

        /* Se recorren los bordes juntando tramos seguidos con el mismo valor y
           los mismos dos temas: un tramo largo es una caja sola. */
        const recorrer = (vertical) => {
            const nI = vertical ? W + 1 : H + 1;
            const nJ = vertical ? H : W;
            for (let i = 0; i < nI; i++) {
                let ini = -1, val = 0, tA = null, tB = null;
                for (let j = 0; j <= nJ; j++) {
                    let v = 0, a = null, b = null;
                    if (j < nJ) {
                        v = vertical ? paredV(i, j) : paredH(j, i);
                        if (v !== NADA) {
                            const sa = vertical ? sectorEn(i - 1, j) : sectorEn(j, i - 1);
                            const sb = vertical ? sectorEn(i, j) : sectorEn(j, i);
                            a = sa ? sa.tema : null; b = sb ? sb.tema : null;
                        }
                    }
                    const igual = ini >= 0 && v === val && a === tA && b === tB;
                    if (!igual && ini >= 0) { emitir(vertical, i, ini, j - 1, val, tA, tB); ini = -1 }
                    if (v !== NADA && !igual) { ini = j; val = v; tA = a; tB = b }
                }
            }
        };
        recorrer(true); recorrer(false);

        for (const kind of Object.keys(out)) {
            const merged = mergeGeos(out[kind]);
            worldUV(merged, kind === 'papel' ? 0.95 : kind === 'yeso' ? 2.4
                          : kind === 'hormigon' ? 2.0 : 0.60);
            const m = new THREE.Mesh(merged, this.mats[kind]);
            m.castShadow = m.receiveShadow = true;
            grupo.add(m);
            out[kind].forEach(g => g.dispose());
        }
        if (marcos.length) {
            const mg = mergeGeos(marcos);
            worldUV(mg, 0.60);
            const mm = new THREE.Mesh(mg, this.mats.madera);
            mm.castShadow = mm.receiveShadow = true;
            grupo.add(mm);
            marcos.forEach(g => g.dispose());
        }
    }

    /* Piso y techo plano. El techo del pasillo NO se emite: ahi va la boveda. */
    construirPisoYTecho(grupo) {
        const PISO = { salon: 'baldosa', salida: 'blanco', taller: 'hormigon' };
        const pisos = {}, techos = {};
        for (let r = 0; r < H; r++) {
            let ini = -1, pt = null, tt = null;
            const cerrar = (c) => {
                if (ini < 0) return;
                const largo = (c - ini) * CELL;
                const cx = bordeX(ini) + largo / 2, cz = bordeZ(r) + CELL / 2;
                const f = new THREE.PlaneGeometry(largo, CELL);
                f.rotateX(-Math.PI / 2); f.translate(cx, 0.001, cz);
                (pisos[pt] || (pisos[pt] = [])).push(f);
                if (tt) {
                    const k = new THREE.PlaneGeometry(largo, CELL);
                    k.rotateX(Math.PI / 2); k.translate(cx, WALL_H, cz);
                    (techos[tt] || (techos[tt] = [])).push(k);
                }
                ini = -1;
            };
            for (let c = 0; c <= W; c++) {
                const s = c < W ? sectorEn(c, r) : null;
                const np = s ? (PISO[s.tema] || 'alfombra') : null;
                const nt = s ? (s.pasillo ? null : (s.tema === 'taller' ? 'hormigon' : 'tabla')) : null;
                if (!s) { cerrar(c); continue }
                if (ini >= 0 && (np !== pt || nt !== tt)) cerrar(c);
                if (ini < 0) { ini = c; pt = np; tt = nt }
            }
        }
        /* El techo TIENE que recibir sombra: la rueda de la araña se proyecta
           contra el, y es la firma visual del juego. Estaba en false y por eso
           el techo salia parejo por mas que las luces proyectaran. */
        for (const [tabla, esc, sombra] of [[pisos, 1.35, true], [techos, 0.78, true]]) {
            for (const kind of Object.keys(tabla)) {
                if (!kind || kind === 'null') continue;
                const g = mergeGeos(tabla[kind]);
                worldUV(g, esc);
                const m = new THREE.Mesh(g, this.mats[kind]);
                m.receiveShadow = sombra;
                grupo.add(m);
                tabla[kind].forEach(x => x.dispose());
            }
        }
    }

    /* La boveda de canon del pasillo. Es LA forma del juego original: el
       pasillo no tiene techo plano, tiene un tunel de tabla que arranca a
       2,95 m y sube 1,50 m mas en el eje. La araña cuelga del eje y su rueda
       se proyecta contra la curva — esa sombra es medio el juego. */
    arco(ejeX, uc, tA, tB, hw, base) {
        const N = 14;
        const pos = [], nor = [], uv = [], idxs = [];
        for (let i = 0; i <= N; i++) {
            const a = Math.PI * i / N;
            const u = -hw * Math.cos(a), v = FLECHA * Math.sin(a);
            // normal de la elipse, hacia adentro
            let nx = FLECHA * Math.cos(a), ny = -hw * Math.sin(a);
            const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
            for (let k = 0; k < 2; k++) {
                const t = k ? tB : tA;
                pos.push(ejeX ? t : uc + u, base + v, ejeX ? uc + u : t);
                nor.push(ejeX ? 0 : nx, ny, ejeX ? nx : 0);
                uv.push(a * hw / 0.78, t / 0.78);
            }
        }
        for (let i = 0; i < N; i++) {
            const p = i * 2;
            idxs.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
        g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
        g.setIndex(idxs);
        return g;
    }

    construirBovedas(grupo) {
        const bov = [], costillas = [];
        for (let i = 0; i < SECTORES.length; i++) {
            const s = SECTORES[i];
            if (!s.pasillo) continue;
            const ejeX = s.eje === 'x';
            const nLargo = ejeX ? s.w : s.h;      // a lo largo del pasillo
            const nAncho = ejeX ? s.h : s.w;      // el ancho, que es la luz del arco
            const hw = nAncho * CELL / 2;
            const uCentro = ejeX ? bordeZ(s.r) + hw : bordeX(s.c) + hw;
            /* Solo los tramos que este sector todavia posee: en los cruces el
               pasillo horizontal se quedo con las celdas, asi que el vertical
               corta ahi y la boveda que cruza es una sola. */
            let ini = -1;
            for (let k = 0; k <= nLargo; k++) {
                let mio = false;
                if (k < nLargo) {
                    mio = true;
                    for (let m = 0; m < nAncho && mio; m++) {
                        const c = ejeX ? s.c + k : s.c + m;
                        const r = ejeX ? s.r + m : s.r + k;
                        if (sectorIdx(c, r) !== i) mio = false;
                    }
                }
                if (mio && ini < 0) ini = k;
                if (!mio && ini >= 0) {
                    const tA = ejeX ? bordeX(s.c + ini) : bordeZ(s.r + ini);
                    const tB = ejeX ? bordeX(s.c + k) : bordeZ(s.r + k);
                    bov.push(this.arco(ejeX, uCentro, tA, tB, hw, ARRANQUE));
                    // costilla de madera en cada punta del tramo
                    for (const t of [tA, tB]) {
                        const d = t === tA ? 0.30 : -0.30;
                        costillas.push(this.arco(ejeX, uCentro, t, t + d, hw * 0.985, ARRANQUE - 0.04));
                    }
                    ini = -1;
                }
            }
        }
        if (bov.length) {
            const m = new THREE.Mesh(mergeGeos(bov), this.mats.tabla);
            m.receiveShadow = true;
            grupo.add(m);
            bov.forEach(g => g.dispose());
        }
        if (costillas.length) {
            const mat = this.mats.madera.clone();
            mat.side = THREE.DoubleSide;
            const m = new THREE.Mesh(mergeGeos(costillas), mat);
            m.receiveShadow = true;
            grupo.add(m);
            costillas.forEach(g => g.dispose());
        }
    }

    /* Lo que hace que un sector sea ESE sector y no un rectangulo mas. Los
       muebles de verdad los reparte poblar(); aca va lo que no es un mueble:
       cajones, tablones apoyados, columnas y el crucifijo. */
    vestirSectores(lv, base, grupo) {
        const rng = new Rng(0x5A1A97);
        this.cajasDeco = [];
        const bloquear = (x, z, hx, hz, alto) => this.cajasDeco.push({ x, z, hx, hz, base: 0, alto });
        const contraPared = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .find(([dc, dr]) => hayPared(c, r, dc, dr) === PARED);

        for (const s of SECTORES) {
            if (s.pasillo) continue;
            const celdas = [];
            for (let r = s.r; r < s.r + s.h; r++)
                for (let c = s.c; c < s.c + s.w; c++) celdas.push([c, r]);

            if (s.tema === 'deposito') {
                for (const [c, r] of celdas) {
                    const d = contraPared(c, r);
                    if (!d || rng.next() > 0.72) continue;
                    const [x, z] = toWorld(c, r);
                    if (rng.next() < 0.72) {
                        const p = pilaDeCajones(rng);
                        p.position.set(x + (rng.next() - .5) * .3, 0, z + (rng.next() - .5) * .3);
                        grupo.add(p);
                        bloquear(p.position.x, p.position.z, 0.55, 0.55, 2.8);
                    } else {
                        // el tablon de contrachapado apoyado contra la pared
                        const t = tablon();
                        t.position.set(x - d[0] * (CELL / 2 - 0.45), 0, z - d[1] * (CELL / 2 - 0.45));
                        t.rotation.y = Math.atan2(-d[0], -d[1]);
                        t.rotation.x = 0;
                        grupo.add(t);
                        bloquear(t.position.x, t.position.z, 0.7, 0.35, 2.0);
                    }
                }
            }

            if (s.tema === 'capilla') {
                for (const [c, r] of celdas) {
                    const d = contraPared(c, r);
                    if (!d) continue;
                    const [x, z] = toWorld(c, r);
                    const cru = crucifijo();
                    cru.position.set(x + d[0] * (CELL / 2 - .10), 2.45, z + d[1] * (CELL / 2 - .10));
                    cru.rotation.y = d[0] ? -d[0] * Math.PI / 2 : (d[1] > 0 ? Math.PI : 0);
                    grupo.add(cru);
                    break;
                }
            }

            if (s.tema === 'taller') {
                const col = new THREE.CylinderGeometry(.30, .34, WALL_H, 8);
                for (const [c, r] of celdas) {
                    if (((c - s.c) % 4) || ((r - s.r) % 4) || contraPared(c, r)) continue;
                    const [x, z] = toWorld(c, r);
                    const m = new THREE.Mesh(col, this.mats.hormigon);
                    m.position.set(x, WALL_H / 2, z);
                    m.castShadow = m.receiveShadow = true;
                    grupo.add(m);
                    bloquear(x, z, 0.36, 0.36, WALL_H);
                }
            }

            if (s.tema === 'salon') {
                /* Las dos columnas de la sala blanca. En la foto hay una
                   enorme con la baldosa roja encendida pegada: son la
                   referencia para saber donde estas en una nave de 31 m. */
                for (const [dc, dr] of [[3, 4], [s.w - 4, 4]]) {
                    const [x, z] = toWorld(s.c + dc, s.r + dr);
                    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, WALL_H, 1.5), this.mats.yeso);
                    m.position.set(x, WALL_H / 2, z);
                    m.castShadow = m.receiveShadow = true;
                    grupo.add(m);
                    bloquear(x, z, 0.80, 0.80, WALL_H);
                }
            }
        }
    }

    /* Las frases pintadas en la pared, en mayusculas negras. Son las mismas
       que se leen en las capturas y hacen dos cosas: te dicen que hacer sin un
       tutorial, y te dan una referencia en una casa que se repite. */
    pintarFrases(lv, base, grupo) {
        const rng = new Rng(0xF2A5B);
        const sitios = [];
        for (let r = 1; r < H - 1; r++) {
            for (let c = 1; c < W - 1; c++) {
                const s = sectorEn(c, r);
                if (!s || s.tema === 'taller') continue;
                const d = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => hayPared(c, r, dc, dr) === PARED);
                if (d.length !== 1) continue;
                sitios.push([c, r, d[0]]);
            }
        }
        for (let i = 0; i < Math.min(FRASES.length, sitios.length); i++) {
            const [c, r, [dc, dr]] = sitios[rng.int(0, sitios.length - 1)];
            const [x, z] = toWorld(c, r);
            const m = new THREE.Mesh(
                new THREE.PlaneGeometry(2.05, 1.03),
                new THREE.MeshBasicMaterial({ map: texFrase(FRASES[i]), transparent: true, depthWrite: false }));
            m.position.set(x + dc * (CELL / 2 - .06), 1.80, z + dr * (CELL / 2 - .06));
            m.rotation.y = dc ? -dc * Math.PI / 2 : (dr > 0 ? Math.PI : 0);
            grupo.add(m);
        }
    }

    /* Los cuadros. En el original son retratos con marco dorado y un dibujo a
       lapiz que mira de costado; son lo unico que le da personalidad a una
       casa que si no se repite. Los dibujos vienen generados y entran como
       textura; si no llegan, queda el lienzo oscuro y no se rompe nada. */
    colgarCuadros(lv, base, grupo) {
        const rng = new Rng(0xC0AD7);
        const marco = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: .42, metalness: .55 });
        const lienzos = [];
        for (let i = 1; i <= 4; i++) {
            const u = A['cuadro' + i];
            lienzos.push(new THREE.MeshStandardMaterial(
                u ? { map: tex(u, [1, 1]), roughness: .92 } : { color: 0x2a231c, roughness: .9 }));
        }
        let n = 0;
        for (let i = 0; i < 9000 && n < 26; i++) {
            const c = rng.int(1, W - 2), r = rng.int(1, H - 2);
            const s = sectorEn(c, r);
            if (!s || s.tema === 'taller' || s.tema === 'salon') continue;
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => hayPared(c, r, dc, dr) === PARED);
            if (!dirs.length) continue;
            const [dc, dr] = dirs[Math.floor(rng.next() * dirs.length)];
            const [x, z] = toWorld(c, r);
            const an = rng.range(.80, 1.15), al = an * rng.range(1.15, 1.35);
            const px = x + dc * (CELL / 2 - .07), pz = z + dr * (CELL / 2 - .07);
            const yaw = dc ? -dc * Math.PI / 2 : (dr > 0 ? Math.PI : 0);
            const m = new THREE.Mesh(new THREE.BoxGeometry(an, al, .07), marco);
            m.position.set(px, 2.15, pz);
            m.rotation.y = yaw;
            m.castShadow = true;
            grupo.add(m);
            const l = new THREE.Mesh(new THREE.PlaneGeometry(an * .82, al * .82),
                lienzos[n % lienzos.length]);
            l.position.set(px - dc * .042, 2.15, pz - dr * .042);
            l.rotation.y = yaw;
            grupo.add(l);
            n++;
        }
    }

    /* Las arañas de rueda. Hierro negro, ocho velas, y la luz DENTRO del aro:
       por eso el aro y los rayos se proyectan sobre la boveda y se ve la rueda
       de sombra que es la firma visual del juego. */
    placeChandeliers(lv, base, grupo) {
        const rng = new Rng(0x7A0FF);

        /* INSTANCIAS, NO NOVENTA GRUPOS.

           Cada araña son la cadena, dos aros, ocho rayos, ocho velas y ocho
           llamas: veintisiete mallas. Por noventa arañas eso daba DOS MIL
           CUATROCIENTAS llamadas de dibujo sólo en lámparas, y era de lejos lo
           que más pesaba de todo el juego.

           Ahora cada tamaño se hornea en UNA geometría —el metal por un lado y
           las llamas por otro— y se dibuja con InstancedMesh: cuatro llamadas
           en total para las noventa. El titileo sigue funcionando porque lo que
           parpadea es la luz, no la malla. */
        const armarPlantilla = (rad, caida, brazos) => {
            const metal = [], fuego = [];
            const yAro = -caida;
            const cad = new THREE.CylinderGeometry(.016, .016, caida, 5);
            cad.translate(0, -caida / 2, 0);
            metal.push(cad);
            const aro = new THREE.TorusGeometry(rad, .035, 5, 18);
            aro.rotateX(Math.PI / 2); aro.translate(0, yAro, 0);
            metal.push(aro);
            const aro2 = new THREE.TorusGeometry(rad * .55, .028, 5, 14);
            aro2.rotateX(Math.PI / 2); aro2.translate(0, yAro + .06, 0);
            metal.push(aro2);
            for (let k = 0; k < brazos; k++) {
                const ang = k / brazos * Math.PI * 2;
                const cs = Math.cos(ang), sn = Math.sin(ang);
                const b = new THREE.BoxGeometry(rad, .028, .045);
                b.rotateY(-ang);
                b.translate(cs * rad / 2, yAro, sn * rad / 2);
                metal.push(b);
                const v = new THREE.CylinderGeometry(.035, .04, .20, 6);
                v.translate(cs * rad, yAro + .13, sn * rad);
                metal.push(v);
                const f = new THREE.SphereGeometry(.055, 6, 4);
                f.translate(cs * rad, yAro + .27, sn * rad);
                fuego.push(f);
            }
            const unir = list => {
                for (const g of list) if (!g.getAttribute('uv')) {
                    const n = g.getAttribute('position').count;
                    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
                }
                const m = mergeGeos(list);
                list.forEach(g => g.dispose());
                return m;
            };
            return { metal: unir(metal), fuego: unir(fuego), yAro };
        };

        const hierro = new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: .52, metalness: .45 });
        const llama = new THREE.MeshBasicMaterial({ color: 0xffd79a });
        const P = {
            chico: armarPlantilla(0.46, 1.15, 6),
            grande: armarPlantilla(0.62, 1.45, 8),
        };
        const sitios = { chico: [], grande: [] };

        const anotar = (c, r, techo, grande) => {
            const [x, z] = toWorld(c, r);
            sitios[grande ? 'grande' : 'chico'].push([x, techo, z, grande]);
        };

        for (const s of SECTORES) {
            if (s.pasillo) {
                const ejeX = s.eje === 'x';
                const largo = ejeX ? s.w : s.h;
                const medio = ejeX ? s.r + (s.h >> 1) : s.c + (s.w >> 1);
                for (let k = 2; k < largo; k += 3) {
                    const c = ejeX ? s.c + k : medio, r = ejeX ? medio : s.r + k;
                    if (!esPiso(c, r)) continue;
                    anotar(c, r, ARRANQUE + FLECHA - 0.02, false);
                }
            } else {
                const paso = s.tema === 'salon' ? 3 : 4;
                for (let r = s.r + 1; r < s.r + s.h - 1; r += paso)
                    for (let c = s.c + 1; c < s.c + s.w - 1; c += paso)
                        anotar(c, r, WALL_H - 0.02, s.tema === 'salon');
            }
        }

        const M = new THREE.Matrix4();
        for (const tam of ['chico', 'grande']) {
            const lista = sitios[tam];
            if (!lista.length) continue;
            const plant = P[tam];
            for (const [geo, mat, sombra] of [[plant.metal, hierro, true], [plant.fuego, llama, false]]) {
                const im = new THREE.InstancedMesh(geo, mat, lista.length);
                im.castShadow = sombra;
                im.frustumCulled = false;
                lista.forEach(([x, y, z], i) => { M.makeTranslation(x, y, z); im.setMatrixAt(i, M) });
                im.instanceMatrix.needsUpdate = true;
                grupo.add(im);
            }
            /* Las luces sí son objetos sueltos: son lo único que no se puede
               instanciar, y por eso hay culling. */
            for (const [x, y, z, grande] of lista) {
                const L = new THREE.PointLight(0xffd7a8, grande ? 19 : 14, grande ? 26 : 21, 1.75);
                L.position.set(x, y + plant.yAro - 0.75, z);
                L.shadow.mapSize.set(1024, 1024);
                L.shadow.bias = -0.0016;
                L.shadow.camera.near = 0.05;
                L.shadow.camera.far = 13;
                L.shadow.radius = 2;
                grupo.add(L);
                (this.lamps || (this.lamps = [])).push({
                    L, base: grande ? 19 : 14, phase: rng.range(0, 9), malo: rng.next() < 0.15,
                });
            }
        }
    }

    initPlayer() {
        const rng = new Rng(20260901);
        const s = spawnOn(0, rng);
        /* No aparecés en la casa: aparecés ARRIBA, en el cajón. La casa
           empieza cuando te tirás por el hueco. */
        const c = this.intro ? this.intro.centro : [s.x, s.z];
        this.pos = new THREE.Vector3(c[0], 0, c[1] + CELL * 0.9);
        this.y = this.intro ? ALTO_CAJA : 0;
        this.pitch = 0;
        // arrancar mirando a un lado sin tabique, no contra la pared
        const [sc, sr] = toCell(s.x, s.z);
        this.yaw = 0;
        for (const [dc, dr, yaw] of [[0, -1, 0], [1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2]]) {
            if (!hayPared(sc, sr, dc, dr) && esPiso(sc + dc, sr + dr)) { this.yaw = yaw; break }
        }
        this.celdasVedadas = [];
        for (let dr = -2; dr <= 2; dr++)
            for (let dc = -2; dc <= 2; dc++)
                this.celdasVedadas.push((sc + dc) + ',' + (sr + dr));
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
        /* SI EL DEDO CAE SOBRE UN CONTROL, ESTE HANDLER NO EXISTE.

           Era el bug que dejaba el menú muerto en el celular: este `touchstart`
           está puesto en la ventana y hacía `preventDefault()` en CUALQUIER
           toque. Y `preventDefault()` en un touchstart CANCELA el `click`
           sintético que el navegador iba a mandar después — así que los
           botones del menú, que escuchaban `click`, no se enteraban nunca.

           En una computadora andaba, porque ahí el click viene de `mousedown`
           y no del toque. Por eso las pruebas en horizontal con el mouse lo
           daban por bueno. */
        const esControl = e => e.target && e.target.closest &&
            e.target.closest('#boot, #graficos, .tbtn, .niv, button');

        const onStart = e => {
            if (esControl(e)) return;
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
            if (esControl(e) && !this.stick.active && !this.look.active) return;
            for (const t of e.changedTouches) {
                if (this.stick.active && t.identifier === this.stick.id) {
                    const [mx, my] = aMarco(t.clientX, t.clientY);
                    let dx = mx - this.stick.cx, dy = my - this.stick.cy;
                    const d = Math.hypot(dx, dy);
                    if (d > R) { dx = dx / d * R; dy = dy / d * R }
                    this.stick.x = dx / R; this.stick.y = dy / R;
                    setKnob(dx, dy);
                } else if (this.menuAbierto) {
                    // con el menu abierto el dedo no mueve la camara
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
        /* Con el menu abierto no se camina. Y con la embestida encima
           tampoco: ya estas muerto, lo unico que corre es el susto. */
        const muerto = this.mision && this.mision.congelado && this.mision.congelado();
        if (this.menuAbierto || muerto || this.enMenu) { fwd = 0; str = 0; this.stick.x = this.stick.y = 0 }
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
            S.deslizar();          // tirarse al piso era mudo hasta ahora
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
        /* Cayendo no hay paredes: estás por encima de la casa. Y en el cajón
           tampoco, que tiene sus propios límites. */
        if (!this.intro || this.intro.estado === 'jugando')
            [nx, nz] = collide(nx, nz, this.y, sliding ? RADIUS * 0.7 : RADIUS, low);

        /* Y la red: si igual quedaste dentro de algo solido, se sale de una vez
           a la celda abierta mas cerca. Pasa al pararse adentro de un hueco de
           62 cm, o al reaparecer encima de una pared. */
        const salvado = (this.intro && this.intro.estado !== 'jugando') ? null : rescatar(nx, nz);
        if (salvado) { nx = salvado[0]; nz = salvado[1]; this.rescates = (this.rescates || 0) + 1 }
        this.pos.set(nx, 0, nz);
        if (this.intro && this.intro.estado === 'caja') this.intro.encerrar(this.pos);

        /* La casa es UNA planta, así que el piso es cero. Lo único que mueve
           la altura es el arranque: el cajón está a 16,5 m y la caída es
           gravedad de verdad —no una interpolación, que dura lo mismo desde
           cualquier altura y se lee como un ascensor—. */
        const I = this.enMenu ? null : this.intro;
        if (I && I.estado === 'caja') {
            this.y = ALTO_CAJA;
            if (I.encerrar(this.pos)) { I.soltar(); this.slideT = 0 }
        } else if (I && I.estado === 'cayendo') {
            const vy = I.caer(dt);
            this.y = Math.max(0, this.y + vy * dt);
            // las nubes suben mientras caés: es lo que da la sensación
            for (const n of I.nubes.children) {
                n.position.y += dt * Math.min(26, -vy) * 0.55;
                if (n.position.y > ALTO_CAJA) n.position.y = 0.5;
            }
            S.viento(Math.min(1, -vy / 22));
            if (this.y <= 0.001) {
                this.y = 0;
                I.aterrizar();
                this.mision.susto = 0.8;      // el golpe se siente
                this.aterrizoEn = this.t;
            }
        } else {
            this.y = 0;
        }

        /* LOS PASOS DEL JUGADOR. En el original se oyen todo el tiempo y
           cambian de superficie: madera en el cajón del arranque, alfombra
           en la casa. Van con el balanceo, así que caen donde cae el pie. */
        const bobAntes = this.bob;
        this.bob += dt * (moving > 0.05 ? (this.running ? 13 : 8.5) : 0);
        if (moving > 0.05 && Math.floor(bobAntes / Math.PI) !== Math.floor(this.bob / Math.PI)) {
            const enCaja = this.intro && this.intro.estado === 'caja';
            const v = (this.running ? 0.55 : 0.34) * (this.crouch ? 0.4 : 1);
            /* Correr tiene su propio sonido, no el de caminar mas fuerte: el
               juego dispara uno cada 0,242 s y el de caminar dura mas que eso. */
            if (enCaja) S.pasoMadera(v);
            else if (this.running) S.correr(v);
            else S.paso(v);
        }
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
        /* En la embestida el temblor es OTRO: cuatro veces mas grande y mas
           rapido. El temblor de verte a lo lejos y el de tenerlo en la cara no
           pueden ser el mismo, o el segundo no se siente. */
        const emb = this.mision.congelado && this.mision.congelado() ? 1 : 0;
        const amp = 1 + emb * 3.6, vel = 1 + emb * 0.7;
        const tx = su > 0 ? Math.sin(this.t * 47 * vel) * 0.045 * su * amp : 0;
        const tz = su > 0 ? Math.sin(this.t * 61 * vel + 1.3) * 0.055 * su * amp : 0;
        cam.rotation.set(this.pitch + (sliding ? -0.24 * slideK : 0) + tx,
                         this.yaw, this.roll + tz);
        // el FOV se abre al correr y pega un tiron al deslizar
        /* Y se usa para algo: en un pasillo angosto el FOV se cierra unos
           grados y el balanceo se achica. Un pasillo de 2,2 m con el mismo
           campo que una sala de 11 se lee como un tubo de ojo de pez. */
        const enc = this.espacio ? this.espacio.encajonado : 0;
        const wantFov = FOV - enc * 7 + (this.running ? 6 : 0) + (sliding ? 22 * slideK : 0) - emb * 18;
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
        if (!this.enMenu && (!this.intro || this.intro.estado === 'jugando')) this.mision.actualizar(dt, {
            x: this.pos.x, y: this.y, z: this.pos.z, yaw: this.yaw,
            // la embestida planta la cara sobre el rayo de la camara: le hace
            // falta la inclinacion y la altura del ojo, no solo el giro
            pitch: this.pitch, ojo: this.y + (this.eyeY || EYE),
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
            const near = this.lamps.slice().sort((a, b) => a.d - b.d).slice(0, this.farolesConSombra);
            const set = new Set(near);
            for (const l of this.lamps) {
                const want = set.has(l);
                if (l.L.castShadow !== want) l.L.castShadow = want;
            }
        }
        /* CULLING DE LUCES. La casa tiene noventa arañas y three evalua TODAS
           las luces en cada fragmento: con noventa point lights no dibuja ni
           un cuadro. Se dejan encendidas las N mas cercanas y nada mas. El
           numero es FIJO —siempre las mismas N— porque si cambia, three
           recompila el shader y el juego pega un tiron cada vez. */
        this._tLuz = (this._tLuz || 0) + dt;
        if (this._tLuz > 0.22 && this.lamps) {
            this._tLuz = 0;
            const px = this.pos.x, pz = this.pos.z;
            for (const l of this.lamps) {
                const p = l.L.getWorldPosition(this._vLuz || (this._vLuz = new THREE.Vector3()));
                l.d = (p.x - px) ** 2 + (p.z - pz) ** 2;
            }
            const orden = this.lamps.slice().sort((a, b) => a.d - b.d);
            const N = Math.min(this.lucesVivas || 10, orden.length);
            for (let i = 0; i < orden.length; i++) orden[i].L.visible = i < N;
        }

        for (const l of this.lamps || []) {
            if (!l.L.visible) continue;
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

        this.updateHud();
        this.calidad.tic(dt);
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
        /* Durante la embestida se apaga TODO el HUD. En la captura del juego
           no queda nada en pantalla salvo la mira: joystick, botones, tareas y
           inventario encima de la cara arruinan el unico cuadro que importa. */
        const emb = !!(M.congelado && M.congelado())
            || this.enMenu || (this.intro && this.intro.estado !== 'jugando');
        if (this._emb !== emb) {
            this._emb = emb;
            document.body.classList.toggle('embestida', emb);
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
            document.body.classList.add('gano');   // el HUD estorba en el final
        }
    }
}

/* ------------------------------------------------------------------ arranque */
/* ------------------------------------------------------ CARGA Y ARRANQUE */
/* El juego NO se construye hasta que los assets están. Antes se construía de
   una y las texturas iban entrando de a poco encima; con los archivos ahora
   fuera del HTML eso significaría arrancar con la casa gris. */
let game = null;
const A_MAN = window.DUNGEON_MANIFIESTO || {};

function pintarBarra(p, hecho, total) {
    const b = document.querySelector('#mbarra i');
    const t = document.getElementById('mcarga-txt');
    if (b) b.style.width = (p * 100).toFixed(1) + '%';
    if (t) t.textContent = total
        ? `CARGANDO ${(hecho / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(1)} MB`
        : 'CARGANDO…';
}

async function arrancar() {
    const t0 = performance.now();
    const r = await precargar(A, A_MAN, pintarBarra);
    const t = document.getElementById('mcarga-txt');
    if (r.corte) {
        if (t) t.textContent = 'LA RED VA LENTA — SE ENTRA IGUAL';
    } else if (r.fallados.length) {
        console.warn('no bajaron:', r.fallados.join(', '));
        if (t) t.textContent = 'FALTARON ' + r.fallados.length + ' ARCHIVOS — SE JUEGA IGUAL';
    } else if (t) {
        t.textContent = 'LISTO';
    }
    window.__CARGA = { ms: Math.round(performance.now() - t0), ...r, n: Object.keys(A_MAN).length };
    game = new Dungeon();
    window.__game = game;
    armarMenu();
    sonarBotones();
    /* Las muestras se enganchan al sintetizador: cada sonido que tenga
       archivo lo usa, y el que no, sigue sintetizado. Se decodifican con el
       primer gesto, porque antes no hay contexto de audio. */
    const engancharMuestras = async () => {
        despertarAudio();
        const ctx = S.contexto();
        if (!ctx) return;
        const n = await cargarMuestras(A, ctx);
        window.__MUESTRAS = n;
        if (n) { puente.tocar = MU.tocar; puente.bucle = MU.bucle }
    };
    for (const ev of ['pointerdown', 'touchstart', 'keydown'])
        addEventListener(ev, engancharMuestras, { once: true, passive: true });
    requestAnimationFrame(loop);
}

arrancar();
/* ------------------------------------------------------------------ EL MENU */
/* El juego arranca PAUSADO en el menú. El bucle corre igual —así el mapa
   termina de cargar y las texturas se suben a la GPU mientras mirás la
   pantalla— pero el jugador no se mueve y el bicho no ronda. */
const boot = document.getElementById('boot');
/* Un solo enganche para todos los botones del juego: cualquier cosa que se
   pueda apretar suena. Va por delegación en el documento, así los botones que
   aparecen después —los chips de gráficos, por ejemplo— también entran. */
/* Un botón que anda en el celular Y en la computadora.

   `click` no sirve: cualquier `preventDefault()` en el touchstart lo mata, y
   el juego necesita ese preventDefault para que arrastrar no scrollee la
   página. Así que se escucha el toque y el mouse directo, con un candado de
   300 ms para que un toque no dispare las dos veces. */
function alTocar(el, fn) {
    if (!el) return el;
    let ultimo = 0;
    const disparar = e => {
        const ahora = performance.now();
        if (ahora - ultimo < 300) return;
        ultimo = ahora;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        fn(e);
    };
    el.addEventListener('touchstart', disparar, { passive: false });
    el.addEventListener('mousedown', disparar);
    return el;
}

function sonarBotones() {
    const suena = e => {
        const t = e.target.closest('.tbtn, .niv, #mjugar, #btn-graficos, #graficos-cerrar');
        if (!t) return;
        despertarAudio();
        if (t.id === 'mjugar') S.confirmar();
        else if (t.id === 'graficos-cerrar') S.cancelar();
        else S.boton(t.classList.contains('tbtn') ? 0.75 : 1);
    };
    for (const ev of ['touchstart', 'mousedown'])
        addEventListener(ev, suena, { passive: true, capture: true });
}

function armarMenu() {
    const A2 = window.DUNGEON_ASSETS || {};
    const poner = (id, url, fondo) => {
        const e = document.getElementById(id);
        if (!e || !url) return;
        if (fondo) e.style.backgroundImage = `url(${url})`; else e.src = url;
    };
    poner('mfondo-a', A2.menu_fondo1, true);
    poner('mfondo-b', A2.menu_fondo2, true);
    poner('mbicho-i', A2.menu_bicho_lado);
    poner('mbicho-d', A2.menu_bicho_frente);
    poner('mlogo', A2.menu_logo);
    poner('fin-img', A2.menu_ganaste);
    /* Los botones: el disco de hierro y la placa van por variable de CSS
       —la URL recién se conoce al arrancar, porque es un blob— y los dibujos
       entran como imágenes sueltas. */
    const raiz = document.documentElement.style;
    if (A2.menu_btn_disco) raiz.setProperty('--disco', `url(${A2.menu_btn_disco})`);
    if (A2.menu_btn_placa) raiz.setProperty('--placa', `url(${A2.menu_btn_placa})`);
    for (const n of ['usar', 'agachar', 'correr', 'deslizar'])
        poner('ic-' + n, A2['menu_ic_' + n]);

    const carga = document.getElementById('mcarga');
    const jugar = document.getElementById('mjugar');
    /* El botón NO se esconde. Antes esperaba a que los muebles terminaran de
       entrar y, si alguno no llegaba, no aparecía nunca: quedabas mirando el
       menú sin forma de entrar. Ahora entra siempre y los muebles caen
       después si es que caen. */
    const listo = () => {
        if (!game.modelosMuebles) return setTimeout(listo, 250);
        carga.style.opacity = '0';
    };
    setTimeout(listo, 300);
    setTimeout(() => { carga.style.opacity = '0' }, 9000);   // por las dudas

    /* El mismo selector de calidad que el panel, pero en el menú: elegir
       ANTES de entrar evita el primer minuto a tres cuadros por segundo. */
    for (const n of ['bajo', 'medio', 'alto', 'ultra']) {
        const e = document.getElementById('mcal-' + n);
        if (!e) continue;
        alTocar(e, () => {
            game.calidad.aplicar(n);
            for (const m of ['bajo', 'medio', 'alto', 'ultra']) {
                const o = document.getElementById('mcal-' + m);
                if (o) o.classList.toggle('sel', m === n);
            }
        });
        e.classList.toggle('sel', game.calidad && game.calidad.nivel === n);
    }

    alTocar(jugar, () => {
        despertarAudio();
        S.callarMusica();
        game.enMenu = false;
        S.ambiente(1);       // el colchón de la casa, que no para nunca
        boot.classList.add('gone');
        setTimeout(() => { boot.style.display = 'none' }, 700);
    });
    // la música del menú necesita un gesto: se engancha al primero que haya
    const arrancarMusica = () => { despertarAudio(); S.musicaMenu() };
    for (const ev of ['pointerdown', 'keydown', 'touchstart'])
        addEventListener(ev, arrancarMusica, { once: true, passive: true });
}

let last = performance.now();
function loop(now) {
    requestAnimationFrame(loop);
    if (!game) return;
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
        calidad: game.calidad ? game.calidad.nivel : null,
        fps: game.calidad ? game.calidad.fps : 0,
        puestos: game.mision ? game.mision.puestos : 0,
        shadowing: (game.lamps || []).filter(l => l.L.castShadow).length,
        fov: +game.camera.fov.toFixed(1),
    };
}
window.__LEVELS = LEVELS;
window.__toWorld = toWorld;
import * as MAP from './map.js';
window.__MAP = MAP;
window.__SONIDO = S;   // el banco mide los sonidos desde afuera
