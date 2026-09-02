/* El mapa: tres niveles de laberinto denso como el plano dibujado, con salas
   grandes cuadradas encima, y escaleras que suben y bajan de verdad.

   La grilla se genera en vez de escribirse a mano: el plano es un laberinto de
   pasillos angostos, y un backtracker da exactamente eso sin riesgo de dejar
   un cuarto sin salida. Encima se recortan las salas y se abren atajos. */

/* La escala sale de MEDIR el juego original en las capturas de partida: el
   personaje de Roblox mide ~1,7 m, el pasillo entra como dos anchos de
   personaje y el techo queda como a tres alturas. Antes las paredes iban a
   7 m con el ojo a 55 cm —trece veces nuestra altura— y eso convertia cada
   cuarto en una nave de catedral. */
export const CELL = 2.2;          // ancho de pasillo, en metros
export const WALL_H = 4.6;        // techo de casa, no de catedral
export const LEVEL_H = 5.9;       // separacion entre pisos
export const W = 31, H = 31;      // impar: el laberinto se carva en celdas impares

export class Rng {
    constructor(seed) { this.s = seed >>> 0 || 1 }
    next() { this.s ^= this.s << 13; this.s ^= this.s >>> 17; this.s ^= this.s << 5; return (this.s >>> 0) / 4294967296 }
    range(a, b) { return a + this.next() * (b - a) }
    int(a, b) { return Math.floor(this.range(a, b + 1)) }
    pick(a) { return a[Math.floor(this.next() * a.length)] }
}

const key = (c, r) => r * W + c;

/* Laberinto perfecto sobre las celdas impares (backtracker iterativo). */
function carveMaze(g, rng, startC, startR) {
    const stack = [[startC, startR]];
    g[key(startC, startR)] = 1;
    while (stack.length) {
        const [c, r] = stack[stack.length - 1];
        const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        let moved = false;
        for (const [dc, dr] of dirs) {
            const nc = c + dc, nr = r + dr;
            if (nc <= 0 || nr <= 0 || nc >= W - 1 || nr >= H - 1) continue;
            if (g[key(nc, nr)]) continue;
            g[key(c + dc / 2, r + dr / 2)] = 1;
            g[key(nc, nr)] = 1;
            stack.push([nc, nr]);
            moved = true;
            break;
        }
        if (!moved) stack.pop();
    }
}

/* Vacia un rectangulo entero: son las salas grandes que pidio el plano. */
function carveRoom(g, c0, r0, w, h) {
    for (let r = r0; r < r0 + h; r++)
        for (let c = c0; c < c0 + w; c++)
            if (c > 0 && r > 0 && c < W - 1 && r < H - 1) g[key(c, r)] = 1;
}

/* Rompe paredes sueltas para que el laberinto tenga vueltas y no sea un arbol:
   un arbol perfecto obliga a desandar todo el tiempo y se hace pesado. */
function openLoops(g, rng, n) {
    let done = 0, guard = 0;
    while (done < n && guard++ < n * 60) {
        const c = rng.int(2, W - 3), r = rng.int(2, H - 3);
        if (g[key(c, r)]) continue;
        const h = g[key(c - 1, r)] && g[key(c + 1, r)];
        const v = g[key(c, r - 1)] && g[key(c, r + 1)];
        if (h !== v) { g[key(c, r)] = 1; done++ }
    }
}

/* Gira la grilla 90 grados. El plano se lee de costado, como pidio. */
function rotate90(g) {
    const out = new Uint8Array(W * H);
    for (let r = 0; r < H; r++)
        for (let c = 0; c < W; c++)
            out[key(H - 1 - r, c)] = g[key(c, r)];
    return out;
}

/* Cada nivel: laberinto + sus salas grandes propias. Las salas se recortan
   DESPUES de rotar para que sus coordenadas sean las mismas que usa todo el
   resto del juego: si se recortaran antes, la lista de salas de abajo estaria
   escrita en un sistema de coordenadas que no existe en ningun otro lado. */
function buildLevel(seed, rooms, loops) {
    const g = new Uint8Array(W * H);
    const rng = new Rng(seed);
    carveMaze(g, rng, 1, 1);
    openLoops(g, rng, loops);
    const out = rotate90(g);
    for (const s of rooms) carveRoom(out, s.c, s.r, s.w, s.h);
    return out;
}


/* LAS SALAS, ESCRITAS A MANO.

   Antes eran cinco rectangulos anonimos por nivel, sacados al azar, y todos
   se veian igual: papel verde, alfombra, y adentro muebles sueltos. Eso es
   justo el mapa generico que no queremos. Ahora cada sala tiene NOMBRE y TEMA,
   y el tema decide el papel, el piso, la luz y que muebles entran.

   Los temas salen de mirar las capturas del juego original:
     pasillo    papel damasco verde salvia, zocalo naranja, alfombra roja
     pads       yeso blanco con tachas redondas, las tres baldosas de color
     biblioteca estanterias en las cuatro paredes, casi sin luz
     reloj      el reloj de pie, el sofa y el retrato de la senora
     deposito   cajones de madera apilados
     capilla    el crucifijo en la pared, un solo farol
     salida     blanco, techo de placas, la doble puerta gris con el cartel
     sotano     hormigon gris, columnas, bombitas sueltas
*/
export const SALAS = [
    [   // planta baja
        { id: 'vestibulo',  nombre: 'el vestibulo',   tema: 'pasillo',    c: 3,  r: 3,  w: 4, h: 4 },
        { id: 'pads',       nombre: 'la sala blanca', tema: 'pads',       c: 12, r: 3,  w: 7, h: 5 },
        { id: 'reloj',      nombre: 'el salon',       tema: 'reloj',      c: 23, r: 4,  w: 5, h: 5 },
        { id: 'biblioteca', nombre: 'la biblioteca',  tema: 'biblioteca', c: 3,  r: 12, w: 5, h: 5 },
        { id: 'deposito',   nombre: 'el deposito',    tema: 'deposito',   c: 22, r: 13, w: 5, h: 4 },
        { id: 'comedor',    nombre: 'el comedor',     tema: 'pasillo',    c: 12, r: 20, w: 5, h: 5 },
        { id: 'dormitorio', nombre: 'el cuarto',      tema: 'pasillo',    c: 3,  r: 24, w: 4, h: 4 },
        { id: 'salida',     nombre: 'la salida',      tema: 'salida',     c: 23, r: 23, w: 5, h: 5 },
    ],
    [   // nivel alto
        { id: 'galeria',    nombre: 'la galeria',     tema: 'pasillo',    c: 11, r: 11, w: 7, h: 5 },
        { id: 'capilla',    nombre: 'la capilla',     tema: 'capilla',    c: 23, r: 3,  w: 5, h: 5 },
        { id: 'desvan',     nombre: 'el desvan',      tema: 'deposito',   c: 3,  r: 21, w: 5, h: 5 },
        { id: 'estudio',    nombre: 'el estudio',     tema: 'biblioteca', c: 4,  r: 4,  w: 4, h: 4 },
        { id: 'costura',    nombre: 'el costurero',   tema: 'reloj',      c: 20, r: 21, w: 5, h: 5 },
    ],
    [   // cisternas
        { id: 'cisterna',   nombre: 'la cisterna',    tema: 'sotano',     c: 5,  r: 5,  w: 6, h: 6 },
        { id: 'calderas',   nombre: 'las calderas',   tema: 'sotano',     c: 18, r: 17, w: 6, h: 6 },
        { id: 'bodega',     nombre: 'la bodega',      tema: 'deposito',   c: 5,  r: 19, w: 5, h: 5 },
        { id: 'pozo',       nombre: 'el pozo',        tema: 'sotano',     c: 19, r: 5,  w: 5, h: 5 },
        { id: 'medio',      nombre: 'el cruce',       tema: 'sotano',     c: 12, r: 12, w: 4, h: 4 },
    ],
];

/* En que sala cae una celda, o null si es pasillo. La busqueda es lineal
   porque son ocho salas: una tabla indexada costaria mas de mantener que de
   recorrer. */
export function salaEn(lv, c, r) {
    for (const s of SALAS[lv])
        if (c >= s.c && c < s.c + s.w && r >= s.r && r < s.r + s.h) return s;
    return null;
}
export function salaPorId(lv, id) { return SALAS[lv].find(s => s.id === id) || null }
export const temaEn = (lv, c, r) => {
    if (lv === 2) { const s = salaEn(lv, c, r); return s ? s.tema : 'sotano' }
    const s = salaEn(lv, c, r);
    return s ? s.tema : 'pasillo';
};
/* Centro de una sala, en celdas. */
export const centroSala = s => [s.c + (s.w >> 1), s.r + (s.h >> 1)];

/* Las salas grandes van sobre coordenadas del dibujo; la rotacion las mueve
   junto con todo lo demas. */
export const LEVELS = [
    {   // planta baja: el piso empapelado, el que se ve en casi todas las fotos
        base: 0,
        name: 'Planta baja',
        /* Cuartos de casa, no patios: la mas grande es de 7x5 celdas, o sea
           15x11 m. Antes habia una de 9x9 (20 m) y una de 13x13 (29 m). */
        grid: buildLevel(0xC0FFEE, SALAS[0], 34),
    },
    {   // arriba: galeria, capilla y desvan
        base: LEVEL_H,
        name: 'Nivel alto',
        grid: buildLevel(0x51EED0, SALAS[1], 28),
    },
    {   // abajo: hormigon, columnas y bombitas
        base: -LEVEL_H,
        name: 'Cisternas',
        grid: buildLevel(0xBEEF11, SALAS[2], 30),
    },
];

/* Escaleras: rectangulo de `len` celdas de largo por `w` de ancho, que sube de
   `a` a `b`. Se marcan como piso en los dos niveles para poder entrar y salir. */
/* Las cuatro estan CORRIDAS de las salas con nombre a proposito: antes la del
   noreste subia por adentro de la capilla y te dejaba una baranda cruzando el
   cuarto, y la del sudeste desembocaba dentro de la sala de la salida. Los
   cuatro sitios de abajo salieron de barrer la grilla buscando rectangulos que
   no pisen ninguna sala de NINGUNO de los dos niveles que conectan. */
export const STAIRS = [
    { a: 0, b: 1, c: 8,  r: 8,  dir: [1, 0],  len: 7, w: 3 },
    { a: 0, b: 2, c: 8,  r: 25, dir: [1, 0],  len: 6, w: 3 },
    { a: 0, b: 1, c: 19, r: 8,  dir: [0, 1],  len: 6, w: 2 },
    { a: 0, b: 2, c: 26, r: 12, dir: [-1, 0], len: 6, w: 2 },
];

/* Las celdas de la rampa se marcan aparte. Si tambien fueran piso de cada
   nivel, el piso plano competiria con la rampa en el mismo XZ y ganaria
   siempre: la escalera no subiria nunca. Aca son transitables (sin pared)
   pero su altura sale solo de la escalera. */
export const STAIR_CELLS = new Uint8Array(W * H);

(function openStairCells() {
    for (const s of STAIRS) {
        const [dc, dr] = s.dir;
        const pc = dr, pr = dc;          // perpendicular, para el ancho
        for (let i = -1; i <= s.len; i++) {
            for (let k = 0; k < s.w; k++) {
                const c = s.c + dc * i + pc * k, r = s.r + dr * i + pr * k;
                if (c <= 0 || r <= 0 || c >= W - 1 || r >= H - 1) continue;
                if (i < 0) { LEVELS[s.a].grid[key(c, r)] = 1; continue }        // desembarco de abajo
                if (i >= s.len) { LEVELS[s.b].grid[key(c, r)] = 1; continue }   // y el de arriba
                LEVELS[s.a].grid[key(c, r)] = 1;
                LEVELS[s.b].grid[key(c, r)] = 1;
                STAIR_CELLS[key(c, r)] = 1;
            }
        }
    }
})();

export const isStairCell = (c, r) =>
    c >= 0 && r >= 0 && c < W && r < H && !!STAIR_CELLS[key(c, r)];

export const toWorld = (c, r) => [(c - W / 2 + 0.5) * CELL, (r - H / 2 + 0.5) * CELL];
export const toCell = (x, z) => [Math.floor(x / CELL + W / 2), Math.floor(z / CELL + H / 2)];
export const isOpen = (lv, c, r) =>
    c >= 0 && r >= 0 && c < W && r < H && !!LEVELS[lv].grid[key(c, r)];

/* Agujeros: pared con un hueco rectangular abajo que comunica los dos lados.
   Solo se pasa agachado o deslizando, asi que son atajos para escapar.
   Se eligen paredes que separen dos espacios abiertos de verdad. */
export const HOLE_H = 1.02;              // alto del hueco, en metros
export const HOLES = LEVELS.map(() => new Uint8Array(W * H));

(function carveHoles() {
    for (let lv = 0; lv < LEVELS.length; lv++) {
        const rng = new Rng(0x40E5 + lv * 131);
        let made = 0;
        for (let i = 0; i < 9000 && made < 22; i++) {
            const c = rng.int(2, W - 3), r = rng.int(2, H - 3);
            if (isOpen(lv, c, r) || isStairCell(c, r)) continue;
            const horiz = isOpen(lv, c - 1, r) && isOpen(lv, c + 1, r)
                && !isOpen(lv, c, r - 1) && !isOpen(lv, c, r + 1);
            const vert = isOpen(lv, c, r - 1) && isOpen(lv, c, r + 1)
                && !isOpen(lv, c - 1, r) && !isOpen(lv, c + 1, r);
            if (!horiz && !vert) continue;
            HOLES[lv][key(c, r)] = 1;
            made++;
        }
    }
})();

export const isHole = (lv, c, r) =>
    c >= 0 && r >= 0 && c < W && r < H && !!HOLES[lv][key(c, r)];


/* Rectangulo de una escalera en coordenadas de mundo, mas su eje de subida. */
function stairBox(s) {
    const [dc, dr] = s.dir, pc = dr, pr = dc;
    const c0 = s.c, r0 = s.r;
    const c1 = s.c + dc * (s.len - 1) + pc * (s.w - 1);
    const r1 = s.r + dr * (s.len - 1) + pr * (s.w - 1);
    const [ax, az] = toWorld(Math.min(c0, c1), Math.min(r0, r1));
    const [bx, bz] = toWorld(Math.max(c0, c1), Math.max(r0, r1));
    return {
        minX: ax - CELL / 2, maxX: bx + CELL / 2,
        minZ: az - CELL / 2, maxZ: bz + CELL / 2,
    };
}
export const STAIR_BOXES = STAIRS.map(s => ({ s, box: stairBox(s) }));

/* Altura de la escalera en un punto: 0 al pie, 1 arriba. */
function stairT(s, box, x, z) {
    const [dc, dr] = s.dir;
    if (dc) {
        const t = (x - box.minX) / Math.max(box.maxX - box.minX, 1e-4);
        return dc > 0 ? t : 1 - t;
    }
    const t = (z - box.minZ) / Math.max(box.maxZ - box.minZ, 1e-4);
    return dr > 0 ? t : 1 - t;
}
const inBox = (b, x, z) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

/* Superficie caminable mas cercana a `yHint`. Los niveles se pisan en XZ, asi
   que la altura actual del jugador es la que desempata. */
export function surfaceAt(x, z, yHint) {
    const [c, r] = toCell(x, z);
    let best = null, bestD = 1e9;
    for (const { s, box } of STAIR_BOXES) {
        if (!inBox(box, x, z)) continue;
        const t = Math.min(1, Math.max(0, stairT(s, box, x, z)));
        const y = LEVELS[s.a].base + (LEVELS[s.b].base - LEVELS[s.a].base) * t;
        const d = Math.abs(y - yHint);
        if (d < bestD) { bestD = d; best = y }
    }
    /* PISOS PLANOS. Antes, si la celda era de escalera se descartaban TODOS,
       y ahi estaba el agujero: una escalera marca sus celdas para los tres
       niveles, asi que caminando por el piso de arriba justo encima del hueco
       de una escalera te quedabas sin piso y caias a la rampa. Pasó de verdad.

       La regla correcta no es "hay escalera o no", es DONDE esta la rampa:
       la rampa manda solo si esta a la altura de tus pies o mas arriba —que es
       cuando la estas subiendo o bajando—, y si esta muy por debajo se ignora
       y vale el piso plano. Medio metro de tolerancia alcanza: bajando una
       escalera el escalon es mas chico que eso. */
    const rampaSirve = best !== null && best >= yHint - 0.5;
    if (!rampaSirve) {
        best = null; bestD = 1e9;
        for (let lv = 0; lv < LEVELS.length; lv++) {
            if (!isOpen(lv, c, r) && !isHole(lv, c, r)) continue;
            const d = Math.abs(LEVELS[lv].base - yHint);
            if (d < bestD) { bestD = d; best = LEVELS[lv].base }
        }
        /* Si no hay ningun piso plano —estas de verdad sobre el hueco— vuelve
           la rampa, que es mejor que quedarse sin superficie. */
        if (best === null) {
            for (const { s: e, box } of STAIR_BOXES) {
                if (!inBox(box, x, z)) continue;
                const t = Math.min(1, Math.max(0, stairT(e, box, x, z)));
                best = LEVELS[e.a].base + (LEVELS[e.b].base - LEVELS[e.a].base) * t;
            }
        }
    }
    return best;
}

/* En que nivel esta parado, para elegir contra que grilla chocar. */
export function levelAt(y) {
    let best = 0, bestD = 1e9;
    for (let lv = 0; lv < LEVELS.length; lv++) {
        const d = Math.abs(LEVELS[lv].base - y);
        if (d < bestD) { bestD = d; best = lv }
    }
    return best;
}

/* Empuja un circulo fuera de las paredes del nivel en el que esta. Dentro de
   una escalera no hay colision de grilla: la caja ya la delimita. */
export function collide(x, z, y, rad, lowProfile) {
    for (const { box } of STAIR_BOXES) if (inBox(box, x, z)) return [x, z];
    const lv = levelAt(y);
    const [c0, r0] = toCell(x, z);
    for (let r = r0 - 1; r <= r0 + 1; r++) {
        for (let c = c0 - 1; c <= c0 + 1; c++) {
            if (isOpen(lv, c, r)) continue;
            if (lowProfile && isHole(lv, c, r)) continue;   // se pasa por abajo
            const [cx, cz] = toWorld(c, r);
            const half = CELL / 2;
            const nx = Math.max(cx - half, Math.min(x, cx + half));
            const nz = Math.max(cz - half, Math.min(z, cz + half));
            const dx = x - nx, dz = z - nz;
            const d2 = dx * dx + dz * dz;
            if (d2 >= rad * rad) continue;
            if (d2 < 1e-8) {
                /* Quedo adentro de la caja: no hay direccion de salida que
                   sacar de la distancia, asi que se sale por el lado mas
                   cercano. Pasa al teletransportarse o entrando muy rapido. */
                const ex = x - cx, ez = z - cz;
                if (Math.abs(ex) > Math.abs(ez)) x = cx + Math.sign(ex || 1) * (half + rad);
                else z = cz + Math.sign(ez || 1) * (half + rad);
                continue;
            }
            const d = Math.sqrt(d2);
            const push = (rad - d) / d;
            x += dx * push; z += dz * push;
        }
    }
    return [x, z];
}

/* Rescate: si el jugador quedo DENTRO de algo solido, lo saca.
   ---------------------------------------------------------------------------
   El empuje normal saca de una caja, pero con dos cajas encontradas —una pared
   y un mueble, por ejemplo— cada una te devuelve a la otra y quedas trabado.
   Esto es la red: se comprueba si la celda donde estas es solida de verdad y,
   si lo es, se salta a la celda abierta mas cercana. No corrige de a poco: te
   pone donde se puede estar y listo. */
export function rescatar(x, z, y, lowProfile) {
    const lv = levelAt(y);
    const [c0, r0] = toCell(x, z);
    const bien = (c, r) => isOpen(lv, c, r) || (lowProfile && isHole(lv, c, r));
    if (bien(c0, r0)) return null;
    let mejor = null, dm = 1e9;
    for (let d = 1; d <= 3 && !mejor; d++) {
        for (let dr = -d; dr <= d; dr++) {
            for (let dc = -d; dc <= d; dc++) {
                if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue;
                const c = c0 + dc, r = r0 + dr;
                if (!isOpen(lv, c, r)) continue;
                const [wx, wz] = toWorld(c, r);
                const dd = (wx - x) ** 2 + (wz - z) ** 2;
                if (dd < dm) { dm = dd; mejor = [wx, wz] }
            }
        }
    }
    return mejor;
}

/* Distancias a las paredes, medidas EN VIVO.
   ---------------------------------------------------------------------------
   No son constantes del generador: se miden desde donde estas parado, cada
   cuadro, caminando la grilla celda por celda en las cuatro direcciones hasta
   chocar. Asi el juego sabe de verdad si esta en un pasillo angosto o en el
   medio de una sala, y no porque alguien lo escribio en una tabla.

   Devuelve metros: cuanto hay hasta la pared en cada sentido, el ancho y el
   largo del hueco en el que estas, y que tan encajonado estas (0 = sala
   abierta, 1 = pasillo de una celda).

   El hueco de 62 cm cuenta como pared: para medir el espacio en el que te
   movés, un agujero por el que solo pasás agachado no es una salida. */
export function medirParedes(x, z, y, maxCeldas = 14) {
    const lv = levelAt(y);
    const [c0, r0] = toCell(x, z);
    const libre = (c, r) => isOpen(lv, c, r) && !isHole(lv, c, r);
    const tirar = (dc, dr) => {
        let n = 0;
        while (n < maxCeldas && libre(c0 + dc * (n + 1), r0 + dr * (n + 1))) n++;
        // desde el punto exacto hasta la cara de la pared, no de centro a centro
        const [cx, cz] = toWorld(c0, r0);
        const desde = dc ? (dc > 0 ? x - cx : cx - x) : (dr > 0 ? z - cz : cz - z);
        return n * CELL + CELL / 2 - desde;
    };
    const este = tirar(1, 0), oeste = tirar(-1, 0);
    const sur = tirar(0, 1), norte = tirar(0, -1);
    const ancho = este + oeste, largo = norte + sur;
    const menor = Math.min(ancho, largo);
    return {
        norte, sur, este, oeste, ancho, largo,
        // 1 cuando el hueco mide una celda; 0 cuando mide cuatro o mas
        encajonado: Math.max(0, Math.min(1, (CELL * 4 - menor) / (CELL * 3))),
        enSala: menor > CELL * 2.5,
    };
}

/* Un punto libre cualquiera del nivel, para arrancar la partida. */
export function spawnOn(lv, rng) {
    for (let i = 0; i < 4000; i++) {
        const c = rng.int(1, W - 2), r = rng.int(1, H - 2);
        if (isOpen(lv, c, r)) { const [x, z] = toWorld(c, r); return { x, z, c, r } }
    }
    const [x, z] = toWorld(1, 1);
    return { x, z, c: 1, r: 1 };
}
