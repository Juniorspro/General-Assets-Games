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

/* Cada nivel: laberinto + sus salas grandes propias. */
function buildLevel(seed, rooms, loops) {
    const g = new Uint8Array(W * H);
    const rng = new Rng(seed);
    carveMaze(g, rng, 1, 1);
    for (const [c, r, w, h] of rooms) carveRoom(g, c, r, w, h);
    openLoops(g, rng, loops);
    return rotate90(g);
}

/* Las salas grandes van sobre coordenadas del dibujo; la rotacion las mueve
   junto con todo lo demas. */
export const LEVELS = [
    {   // planta baja: el patio grande y dos salas laterales
        base: 0,
        name: 'Planta baja',
        /* Cuartos de casa, no patios: la mas grande es de 5x5 celdas, o sea
           11 m de lado. Antes habia una de 9x9 (20 m) y una de 13x13 (29 m). */
        grid: buildLevel(0xC0FFEE, [[4, 4, 5, 5], [20, 6, 4, 4], [13, 20, 5, 5],
                                    [8, 13, 4, 4], [22, 20, 4, 4]], 34),
    },
    {   // arriba: una sola nave enorme y galerias
        base: LEVEL_H,
        name: 'Nivel alto',
        grid: buildLevel(0x51EED0, [[12, 12, 5, 5], [4, 21, 4, 4], [23, 4, 4, 4],
                                    [5, 5, 4, 4], [19, 21, 4, 4]], 28),
    },
    {   // abajo: cisternas cuadradas
        base: -LEVEL_H,
        name: 'Cisternas',
        grid: buildLevel(0xBEEF11, [[6, 6, 4, 4], [18, 18, 5, 5], [6, 20, 4, 4],
                                    [20, 6, 4, 4], [12, 12, 4, 4]], 30),
    },
];

/* Escaleras: rectangulo de `len` celdas de largo por `w` de ancho, que sube de
   `a` a `b`. Se marcan como piso en los dos niveles para poder entrar y salir. */
export const STAIRS = [
    { a: 0, b: 1, c: 14, r: 14, dir: [1, 0], len: 7, w: 3 },
    { a: 0, b: 2, c: 6, r: 24, dir: [0, 1], len: 6, w: 3 },
    { a: 0, b: 1, c: 24, r: 8, dir: [0, -1], len: 6, w: 2 },
    { a: 0, b: 2, c: 22, r: 22, dir: [1, 0], len: 6, w: 2 },
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
    // sobre la rampa no hay piso plano que valga
    if (!isStairCell(c, r)) {
        for (let lv = 0; lv < LEVELS.length; lv++) {
            if (!isOpen(lv, c, r) && !isHole(lv, c, r)) continue;
            const d = Math.abs(LEVELS[lv].base - yHint);
            if (d < bestD) { bestD = d; best = LEVELS[lv].base }
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

/* Un punto libre cualquiera del nivel, para arrancar la partida. */
export function spawnOn(lv, rng) {
    for (let i = 0; i < 4000; i++) {
        const c = rng.int(1, W - 2), r = rng.int(1, H - 2);
        if (isOpen(lv, c, r)) { const [x, z] = toWorld(c, r); return { x, z, c, r } }
    }
    const [x, z] = toWorld(1, 1);
    return { x, z, c: 1, r: 1 };
}
