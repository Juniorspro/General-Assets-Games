/* El mapa: UNA planta, paredes FINAS y sectores grandes.
   ---------------------------------------------------------------------------
   Lo de antes eran tres laberintos de 31x31 donde la pared ocupaba una celda
   ENTERA: 2,2 m de espesor. Por eso las salas parecian bunkers, los pasillos
   tuneles y no habia forma de que se leyera como una casa.

   Ahora:

     - una sola planta, como el juego original ("single-stage nest")
     - la pared es un tabique de 22 cm que vive en el BORDE entre dos celdas,
       no en la celda
     - el piso se reparte en SECTORES grandes: nueve salas de 24 a 31 m de lado
       y cuatro pasillos de 7,2 m de ancho que las cosen
     - entre dos sectores hay tabique, y el tabique se abre en PUERTAS; entre
       dos pasillos no hay nada, asi que los pasillos son un solo espacio

   Es la casa de algo que mide tres metros y pico: los cuartos tienen que
   dejarlo pasar. */

export const CELL = 2.4;            // lado de celda, en metros
export const WALL_H = 4.6;          // techo plano de las salas
export const GROSOR = 0.22;         // espesor del tabique
export const ARRANQUE = 2.95;       // donde arranca la boveda del pasillo
export const FLECHA = 1.50;         // cuanto sube la boveda por encima
export const ALTO_PUERTA = 2.85;    // dintel
/* La gatera: un hueco BAJO y ANGOSTO, no un portal. A 1,05 m de alto y 2,4 m
   de ancho se cruzaba caminando agachado sin pensarlo; a 78 cm y 1,15 m de
   ancho hay que apuntar y tirarse, que es de lo que se trata. */
export const HOLE_H = 0.78;         // alto de la gatera
export const HOLE_W = 1.15;         // ancho del hueco, centrado en la celda
export const W = 41, H = 33;

/* Queda UN nivel. El resto del juego pregunta por niveles, asi que la lista
   sigue existiendo con un solo elemento y LEVEL_H deja de tener sentido. */
export const LEVELS = [{ base: 0, name: 'La casa' }];
export const LEVEL_H = 0;

export class Rng {
    constructor(seed) { this.s = seed >>> 0 || 1 }
    next() { this.s ^= this.s << 13; this.s ^= this.s >>> 17; this.s ^= this.s << 5; return (this.s >>> 0) / 4294967296 }
    range(a, b) { return a + this.next() * (b - a) }
    int(a, b) { return Math.floor(this.range(a, b + 1)) }
    pick(a) { return a[Math.floor(this.next() * a.length)] }
}

/* ------------------------------------------------------------- los sectores */
/* Los pasillos van PRIMERO y el horizontal pisa al vertical en los cruces: asi
   la boveda que cruza es una sola y no dos que se pelean por el mismo techo.

   tema:  pasillo  papel damasco, zocalo y marco de madera, boveda de canon
          salon    la sala de las baldosas: yeso blanco con tachas, piso de baldosa
          libros   estanterias de pared a pared, casi sin luz
          reloj    el reloj de pie, el sofa, los cuadros
          deposito cajones apilados y tablones apoyados
          capilla  bancos y el crucifijo
          cocina   mesas largas
          salida   blanco, la doble puerta gris con el cartel
          taller   el sotano de antes, ahora un ala de hormigon */
export const SECTORES = [
    { id: 'pas-o', nombre: 'el ala oeste',   tema: 'pasillo', pasillo: true, eje: 'z', c: 11, r: 1,  w: 3,  h: 31 },
    { id: 'pas-e', nombre: 'el ala este',    tema: 'pasillo', pasillo: true, eje: 'z', c: 27, r: 1,  w: 3,  h: 31 },
    { id: 'pas-n', nombre: 'la galeria alta', tema: 'pasillo', pasillo: true, eje: 'x', c: 1, r: 9,  w: 39, h: 3 },
    { id: 'pas-s', nombre: 'la galeria baja', tema: 'pasillo', pasillo: true, eje: 'x', c: 1, r: 21, w: 39, h: 3 },

    { id: 'vestibulo',  nombre: 'el vestibulo',    tema: 'reloj',    c: 1,  r: 1,  w: 10, h: 8 },
    { id: 'salon',      nombre: 'la sala blanca',  tema: 'salon',    c: 14, r: 1,  w: 13, h: 8 },
    { id: 'biblioteca', nombre: 'la biblioteca',   tema: 'libros',   c: 30, r: 1,  w: 10, h: 8 },
    { id: 'comedor',    nombre: 'el comedor',      tema: 'cocina',   c: 1,  r: 12, w: 10, h: 9 },
    { id: 'galeria',    nombre: 'la galeria',      tema: 'reloj',    c: 14, r: 12, w: 13, h: 9 },
    { id: 'capilla',    nombre: 'la capilla',      tema: 'capilla',  c: 30, r: 12, w: 10, h: 9 },
    { id: 'deposito',   nombre: 'el deposito',     tema: 'deposito', c: 1,  r: 24, w: 10, h: 8 },
    { id: 'taller',     nombre: 'el taller',       tema: 'taller',   c: 14, r: 24, w: 13, h: 8 },
    { id: 'salida',     nombre: 'la salida',       tema: 'salida',   c: 30, r: 24, w: 10, h: 8 },
];

const idx = (c, r) => c + r * W;
export const SEC = new Int16Array(W * H).fill(-1);
(function pintar() {
    for (let i = 0; i < SECTORES.length; i++) {
        const s = SECTORES[i];
        for (let r = s.r; r < s.r + s.h; r++)
            for (let c = s.c; c < s.c + s.w; c++)
                if (c > 0 && r > 0 && c < W && r < H) SEC[idx(c, r)] = i;
    }
})();

export const dentro = (c, r) => c >= 0 && r >= 0 && c < W && r < H;
export const sectorIdx = (c, r) => (dentro(c, r) ? SEC[idx(c, r)] : -1);
export const sectorEn = (c, r) => { const i = sectorIdx(c, r); return i < 0 ? null : SECTORES[i] };
export const sectorPorId = id => SECTORES.find(s => s.id === id) || null;
export const temaEn = (c, r) => { const s = sectorEn(c, r); return s ? s.tema : 'pasillo' };
export const centroSector = s => [s.c + (s.w >> 1), s.r + (s.h >> 1)];

/* --------------------------------------------------------------- las paredes */
/* NADA = pasa, PARED = tabique entero, PUERTA = hueco con marco y dintel,
   GATERA = tabique con un hueco de 1,05 m abajo (se cruza agachado). */
export const NADA = 0, PARED = 1, PUERTA = 2, GATERA = 3;

/* EV[c + r*(W+1)] : borde vertical en x = c, o sea entre (c-1,r) y (c,r).
   EH[c + r*W]     : borde horizontal en z = r, entre (c,r-1) y (c,r). */
export const EV = new Uint8Array((W + 1) * H);
export const EH = new Uint8Array(W * (H + 1));
const iv = (c, r) => c + r * (W + 1);
const ih = (c, r) => c + r * W;

export const paredV = (c, r) => (c < 0 || c > W || r < 0 || r >= H) ? PARED : EV[iv(c, r)];
export const paredH = (c, r) => (c < 0 || c >= W || r < 0 || r > H) ? PARED : EH[ih(c, r)];

/* El tabique entre (c,r) y su vecino en (dc,dr). */
export function hayPared(c, r, dc, dr) {
    if (dc > 0) return paredV(c + 1, r);
    if (dc < 0) return paredV(c, r);
    if (dr > 0) return paredH(c, r + 1);
    return paredH(c, r);
}

(function levantarParedes() {
    /* Un borde lleva tabique si separa dos sectores distintos, o si separa el
       piso del vacio. Dos pasillos NO se separan: es un solo espacio. */
    const parte = (a, b) => {
        if (a < 0 && b < 0) return NADA;
        if (a < 0 || b < 0) return PARED;
        if (a === b) return NADA;
        if (SECTORES[a].pasillo && SECTORES[b].pasillo) return NADA;
        return PARED;
    };
    for (let r = 0; r < H; r++)
        for (let c = 0; c <= W; c++)
            EV[iv(c, r)] = parte(sectorIdx(c - 1, r), sectorIdx(c, r));
    for (let r = 0; r <= H; r++)
        for (let c = 0; c < W; c++)
            EH[ih(c, r)] = parte(sectorIdx(c, r - 1), sectorIdx(c, r));
})();

(function abrirPuertas() {
    /* Cada lado de cada sala se recorre buscando tramos seguidos contra el
       MISMO vecino, y cada tramo recibe una puerta cada seis celdas. Una sala
       de veinticuatro metros con una sola puerta se recorre entera para nada;
       con tres, se atraviesa. */
    const abrir = (poner, largo, desde) => {
        const n = Math.max(1, Math.min(3, Math.floor(largo / 6)));
        for (let k = 0; k < n; k++) {
            const centro = desde + Math.round((largo * (k + 0.5)) / n) - 1;
            for (let d = 0; d < 2; d++) {
                const p = Math.min(desde + largo - 1, Math.max(desde, centro + d));
                poner(p);
            }
        }
    };
    const tramos = (n, vecino) => {
        const out = [];
        let ini = 0, act = vecino(0);
        for (let k = 1; k <= n; k++) {
            const v = k < n ? vecino(k) : -999;
            if (v !== act) { out.push([ini, k - ini, act]); ini = k; act = v }
        }
        return out;
    };
    for (let i = 0; i < SECTORES.length; i++) {
        const s = SECTORES[i];
        if (s.pasillo) continue;
        // oeste y este
        for (const [borde, fuera] of [[s.c, s.c - 1], [s.c + s.w, s.c + s.w]]) {
            for (const [ini, largo, vec] of tramos(s.h, k => sectorIdx(fuera, s.r + k))) {
                if (vec < 0 || largo < 2) continue;
                abrir(p => { if (EV[iv(borde, s.r + p)] === PARED) EV[iv(borde, s.r + p)] = PUERTA }, largo, ini);
            }
        }
        // norte y sur
        for (const [borde, fuera] of [[s.r, s.r - 1], [s.r + s.h, s.r + s.h]]) {
            for (const [ini, largo, vec] of tramos(s.w, k => sectorIdx(s.c + k, fuera))) {
                if (vec < 0 || largo < 2) continue;
                abrir(p => { if (EH[ih(s.c + p, borde)] === PARED) EH[ih(s.c + p, borde)] = GATERA_O_PUERTA(s.c + p, borde) }, largo, ini);
            }
        }
    }
    function GATERA_O_PUERTA() { return PUERTA }
})();

(function abrirGateras() {
    /* Las gateras: tabiques que quedaron cerrados y que estan LEJOS de una
       puerta. Son la salida de verdad cuando ya te vio, asi que tienen que
       estar donde no hay puerta, no al lado de una. */
    const rng = new Rng(0x9A7E4);
    const lejosV = (c, r) => {
        for (let k = -3; k <= 3; k++) if (paredV(c, r + k) === PUERTA) return false;
        return true;
    };
    const lejosH = (c, r) => {
        for (let k = -3; k <= 3; k++) if (paredH(c + k, r) === PUERTA) return false;
        return true;
    };
    let hechas = 0;
    for (let intento = 0; intento < 6000 && hechas < 14; intento++) {
        if (rng.next() < 0.5) {
            const c = rng.int(1, W - 1), r = rng.int(1, H - 2);
            if (EV[iv(c, r)] !== PARED || sectorIdx(c - 1, r) < 0 || sectorIdx(c, r) < 0) continue;
            if (!lejosV(c, r)) continue;
            EV[iv(c, r)] = GATERA; hechas++;
        } else {
            const c = rng.int(1, W - 2), r = rng.int(1, H - 1);
            if (EH[ih(c, r)] !== PARED || sectorIdx(c, r - 1) < 0 || sectorIdx(c, r) < 0) continue;
            if (!lejosH(c, r)) continue;
            EH[ih(c, r)] = GATERA; hechas++;
        }
    }
})();

/* ------------------------------------------------------------ coordenadas */
export const toWorld = (c, r) => [(c - W / 2 + 0.5) * CELL, (r - H / 2 + 0.5) * CELL];
export const toCell = (x, z) => [Math.floor(x / CELL + W / 2), Math.floor(z / CELL + H / 2)];
export const bordeX = c => (c - W / 2) * CELL;      // x del borde vertical c
export const bordeZ = r => (r - H / 2) * CELL;      // z del borde horizontal r

/* Compatibilidad: el resto del juego todavia pregunta por niveles. */
export const isOpen = (lv, c, r) => sectorIdx(c, r) >= 0;
export const esPiso = (c, r) => sectorIdx(c, r) >= 0;
export const isStairCell = () => false;
export const isHole = () => false;
export const STAIRS = [];
export const STAIR_BOXES = [];
export const levelAt = () => 0;
export const surfaceAt = () => 0;

/* ------------------------------------------------------------- la colision */
/* Un tabique es una caja fina. Se empuja al jugador por la cara mas cercana,
   igual que con los muebles: si entra dentro, la distancia no da direccion. */
function cajaV(c, r) { return { x: bordeX(c), z: bordeZ(r) + CELL / 2, hx: GROSOR / 2, hz: CELL / 2 } }
function cajaH(c, r) { return { x: bordeX(c) + CELL / 2, z: bordeZ(r), hx: CELL / 2, hz: GROSOR / 2 } }

/* Los dos machones que dejan el hueco angosto en el medio de la celda. Son
   sólidos SIEMPRE: agachado se pasa por el medio, no por el costado. */
const LADO = (CELL - HOLE_W) / 2;
function ladosV(c, r) {
    const z0 = bordeZ(r);
    return [{ x: bordeX(c), z: z0 + LADO / 2, hx: GROSOR / 2, hz: LADO / 2 },
            { x: bordeX(c), z: z0 + CELL - LADO / 2, hx: GROSOR / 2, hz: LADO / 2 }];
}
function ladosH(c, r) {
    const x0 = bordeX(c);
    return [{ x: x0 + LADO / 2, z: bordeZ(r), hx: LADO / 2, hz: GROSOR / 2 },
            { x: x0 + CELL - LADO / 2, z: bordeZ(r), hx: LADO / 2, hz: GROSOR / 2 }];
}

const bloquea = (v, agachado) => v === PARED || (v === GATERA && !agachado);

export function collide(x, z, y, rad, agachado) {
    const [c0, r0] = toCell(x, z);
    for (let r = r0 - 1; r <= r0 + 1; r++) {
        for (let c = c0 - 1; c <= c0 + 1; c++) {
            if (r < 0 || r >= H) continue;
            const bordes = [];
            const meterV = cc => {
                if (cc < 0 || cc > W) return;
                const v = paredV(cc, r);
                if (bloquea(v, agachado)) bordes.push(cajaV(cc, r));
                else if (v === GATERA) bordes.push(...ladosV(cc, r));
            };
            const meterH = rr => {
                if (c < 0 || c >= W) return;
                const v = paredH(c, rr);
                if (bloquea(v, agachado)) bordes.push(cajaH(c, rr));
                else if (v === GATERA) bordes.push(...ladosH(c, rr));
            };
            meterV(c); meterV(c + 1); meterH(r); meterH(r + 1);
            for (const b of bordes) {
                const dx = x - b.x, dz = z - b.z;
                const px = b.hx + rad - Math.abs(dx), pz = b.hz + rad - Math.abs(dz);
                if (px <= 0 || pz <= 0) continue;
                if (px < pz) x = b.x + Math.sign(dx || 1) * (b.hx + rad);
                else z = b.z + Math.sign(dz || 1) * (b.hz + rad);
            }
        }
    }
    return [x, z];
}

/* Si quedaste fuera del piso, volves a la celda de piso mas cercana. Con una
   sola planta y paredes finas esto casi no salta, pero es la red. */
export function rescatar(x, z) {
    const [c, r] = toCell(x, z);
    if (esPiso(c, r)) return null;
    let mejor = null, d = 1e9;
    for (let rad = 1; rad <= 6 && !mejor; rad++) {
        for (let dr = -rad; dr <= rad; dr++)
            for (let dc = -rad; dc <= rad; dc++) {
                if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
                if (!esPiso(c + dc, r + dr)) continue;
                const [wx, wz] = toWorld(c + dc, r + dr);
                const dd = (wx - x) ** 2 + (wz - z) ** 2;
                if (dd < d) { d = dd; mejor = [wx, wz] }
            }
    }
    return mejor;
}

export function spawnOn(lv, rng) {
    const s = sectorPorId('vestibulo');
    const [c, r] = centroSector(s);
    const [x, z] = toWorld(c + rng.int(-2, 2), r + rng.int(-2, 2));
    return { x, z, y: 0 };
}

/* ----------------------------------------------------- medir el espacio */
/* Cuanto hay hasta el tabique en cada direccion, en metros. Con sectores de
   veinticuatro metros esto es lo que te dice si estas en un pasillo o en una
   nave, y el juego lo usa para saber si podes esconderte. */
export function medirParedes(x, z, y, maxCeldas = 20) {
    const [c0, r0] = toCell(x, z);
    const tirar = (dc, dr) => {
        let c = c0, r = r0, n = 0;
        while (n < maxCeldas) {
            const v = hayPared(c, r, dc, dr);
            if (v === PARED || v === GATERA) break;
            c += dc; r += dr; n++;
            if (!esPiso(c, r)) break;
        }
        return n * CELL + CELL / 2;
    };
    const norte = tirar(0, -1), sur = tirar(0, 1), este = tirar(1, 0), oeste = tirar(-1, 0);
    const ancho = este + oeste, largo = norte + sur;
    const s = sectorEn(c0, r0);
    return {
        norte, sur, este, oeste, ancho, largo,
        encajonado: Math.max(0, 1 - Math.min(ancho, largo) / 6),
        enSala: !!(s && !s.pasillo),
        sector: s ? s.id : null,
    };
}

/* ------------------------------------------------- compatibilidad de salas */
/* El resto del juego habla de SALAS y de niveles; los sectores son lo mismo
   con otro nombre, asi que se expone la lista envuelta en un array de un
   nivel para no tener que tocar cada archivo. */
export const SALAS = [SECTORES];
export const salaEn = (lv, c, r) => sectorEn(c, r);
export const salaPorId = (lv, id) => sectorPorId(id);
export const centroSala = centroSector;
