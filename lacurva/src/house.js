/* La casa abandonada: se arma desde una grilla de texto, que despues sirve
   igual para el colisionador del jugador y para el pathfinding de la vieja. */
import * as THREE from 'three';
import { Rng } from './core.js';
import { tex } from './world.js';

/* # pared · . piso · D puerta interna (piso) · E puerta de salida */
export const MAP = [
    '########################',
    '#......#........#......#',
    '#......#........#......#',
    '#......#........#......#',
    '#......D........#......#',
    '#......#........D......#',
    '#......#........#......#',
    '###D######D#######D#####',
    '#......................#',
    '#......................#',
    '####D#######D#######D###',
    '#......#..........#....#',
    '#......#..........#....#',
    '#......#..........#....#',
    '#......#..........#....#',
    '#......#..........#....#',
    '#......#..........#....#',
    '#########E##############',
];
export const CELL = 1.4;
export const WALL_H = 2.9;
export const ROWS = MAP.length, COLS = MAP[0].length;

export const cellAt = (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS) ? '#' : MAP[r][c];
export const isSolid = (c, r) => cellAt(c, r) === '#';
/* mundo <-> grilla, con la casa centrada en el origen */
export const toWorld = (c, r) => [(c - COLS / 2 + 0.5) * CELL, (r - ROWS / 2 + 0.5) * CELL];
export const toCell = (x, z) => [Math.floor(x / CELL + COLS / 2), Math.floor(z / CELL + ROWS / 2)];

export const ROOMS = {
    dormitorio: { c0: 1, c1: 6, r0: 1, r1: 6, name: 'el dormitorio' },
    bano: { c0: 8, c1: 15, r0: 1, r1: 6, name: 'el cuarto del fondo' },
    deposito: { c0: 17, c1: 22, r0: 1, r1: 6, name: 'el depósito' },
    pasillo: { c0: 1, c1: 22, r0: 8, r1: 9, name: 'el pasillo' },
    sala: { c0: 1, c1: 6, r0: 11, r1: 16, name: 'la sala' },
    cocina: { c0: 8, c1: 17, r0: 11, r1: 16, name: 'la cocina' },
    despensa: { c0: 19, c1: 22, r0: 11, r1: 16, name: 'la despensa' },
};
export const EXIT = { c: 9, r: 17 };

export class House {
    constructor(scene, assets, rng) {
        this.group = new THREE.Group();
        scene.add(this.group);
        this.assets = assets;
        this.rng = rng || new Rng(1234);
        this.props = [];
        this.build();
    }

    build() {
        const A = this.assets, G = this.group;
        const woodMap = A.wood ? tex(A.wood, { repeat: [COLS / 2, ROWS / 2] }) : null;
        const floorMat = new THREE.MeshStandardMaterial({ map: woodMap, color: woodMap ? 0xffffff : 0x3a2c20, roughness: 0.94 });
        const wallMat = new THREE.MeshStandardMaterial({
            map: A.wall ? tex(A.wall, { repeat: [3, 1.4] }) : null,
            color: A.wall ? 0xffffff : 0x51493d, roughness: 0.97,
        });
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x231c16, roughness: 1 });

        const W = COLS * CELL, D = ROWS * CELL;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        G.add(floor);

        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = WALL_H;
        G.add(ceil);

        /* Las paredes se juntan en tiras horizontales para no hacer 300 draw
           calls: se recorre cada fila y se emite una caja por tramo continuo. */
        const boxes = [];
        for (let r = 0; r < ROWS; r++) {
            let run = 0;
            for (let c = 0; c <= COLS; c++) {
                if (c < COLS && isSolid(c, r)) { run++; continue }
                if (run) {
                    const c0 = c - run;
                    const [x0] = toWorld(c0, r), [x1] = toWorld(c - 1, r);
                    const [, z] = toWorld(c0, r);
                    boxes.push({ x: (x0 + x1) / 2, z, w: run * CELL, d: CELL });
                    run = 0;
                }
            }
        }
        const wallGeos = boxes.map(b => {
            const g = new THREE.BoxGeometry(b.w, WALL_H, b.d);
            g.translate(b.x, WALL_H / 2, b.z);
            return g;
        });
        const merged = mergeGeos(wallGeos);
        const walls = new THREE.Mesh(merged, wallMat);
        walls.castShadow = walls.receiveShadow = true;
        G.add(walls);
        wallGeos.forEach(g => g.dispose());

        this.buildExitDoor(wallMat);
        this.buildProps();
        this.buildLights();
    }

    /* La puerta de salida: marco fijo y hoja con pivote en la bisagra. */
    buildExitDoor(wallMat) {
        const [x, z] = toWorld(EXIT.c, EXIT.r);
        const pivot = new THREE.Group();
        pivot.position.set(x - CELL / 2, 0, z);
        const leaf = new THREE.Mesh(
            new THREE.BoxGeometry(CELL * 0.94, 2.25, 0.09),
            new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.88 }));
        leaf.position.set(CELL * 0.47, 1.125, 0);
        leaf.castShadow = true;
        pivot.add(leaf);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8),
            new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 0.75, roughness: 0.4 }));
        knob.position.set(CELL * 0.86, 1.05, -0.09);
        pivot.add(knob);
        this.group.add(pivot);
        this.exitPivot = pivot;
        this.exitPos = new THREE.Vector3(x, 0, z);

        // tablones cruzados: la puerta esta clavada hasta que aparece la llave
        this.boards = new THREE.Group();
        const bm = new THREE.MeshStandardMaterial({ color: 0x5b452e, roughness: 0.95 });
        for (const a of [0.5, -0.5]) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.22, 0.06), bm);
            b.position.set(x, 1.2, z - 0.1);
            b.rotation.z = a;
            b.castShadow = true;
            this.boards.add(b);
        }
        this.group.add(this.boards);
    }

    buildProps() {
        const rng = this.rng, G = this.group;
        const wood = new THREE.MeshStandardMaterial({ color: 0x392a1d, roughness: 0.9 });
        const cloth = new THREE.MeshStandardMaterial({ color: 0x5d5648, roughness: 1 });
        const add = (geo, mat, x, y, z, ry = 0) => {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z); m.rotation.y = ry;
            m.castShadow = m.receiveShadow = true;
            G.add(m);
            this.props.push(m);
            return m;
        };

        const put = (room, geo, mat, y, ry) => {
            const R = ROOMS[room];
            for (let tries = 0; tries < 24; tries++) {
                const c = rng.int(R.c0, R.c1), r = rng.int(R.r0, R.r1);
                if (isSolid(c, r)) continue;
                const [x, z] = toWorld(c, r);
                return add(geo, mat, x, y, z, ry === undefined ? rng.range(0, Math.PI) : ry);
            }
            return null;
        };

        // cama, mesas, sillas, cajas y estanterias repartidas por las piezas
        const bed = new THREE.BoxGeometry(1.9, 0.45, 1.05);
        put('dormitorio', bed, cloth, 0.22, 0);
        put('dormitorio', new THREE.BoxGeometry(0.55, 0.7, 0.4), wood, 0.35);

        const table = new THREE.BoxGeometry(1.5, 0.08, 0.9);
        const t = put('cocina', table, wood, 0.78, 0);
        if (t) for (const [dx, dz] of [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]])
            add(new THREE.BoxGeometry(0.08, 0.78, 0.08), wood, t.position.x + dx, 0.39, t.position.z + dz);
        put('cocina', new THREE.BoxGeometry(0.5, 0.9, 0.5), wood, 0.45);

        put('sala', new THREE.BoxGeometry(1.7, 0.75, 0.8), cloth, 0.37, 0);
        put('sala', new THREE.BoxGeometry(0.9, 0.5, 0.5), wood, 0.25);

        for (const room of ['deposito', 'despensa', 'bano']) {
            for (let i = 0; i < 4; i++)
                put(room, new THREE.BoxGeometry(rng.range(0.4, 0.75), rng.range(0.35, 0.7), rng.range(0.4, 0.75)), wood, 0.3);
        }
        for (const room of ['deposito', 'despensa'])
            put(room, new THREE.BoxGeometry(1.1, 1.9, 0.35), wood, 0.95);
    }

    /* Ventana tapiada: tablones sobre un hueco y luz fria entrando entre ellos.
       Es la unica luz de las piezas y motiva que se vea algo antes de tener
       el celular en la mano. */
    buildWindow(c, r, facing) {
        const [x, z] = toWorld(c, r);
        const g = new THREE.Group();
        const inward = facing;                       // +1 mira a +Z, -1 a -Z
        const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(1.15, 1.35),
            new THREE.MeshBasicMaterial({ color: 0x8fb0e6, fog: false }));
        glow.position.set(0, 1.55, 0.02 * inward);
        glow.rotation.y = inward > 0 ? 0 : Math.PI;
        g.add(glow);
        const bm = new THREE.MeshStandardMaterial({ color: 0x3a2b1d, roughness: 0.95 });
        for (const [y, a] of [[1.15, 0.12], [1.55, -0.09], [1.95, 0.05]]) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.19, 0.05), bm);
            b.position.set(0, y, 0.05 * inward);
            b.rotation.z = a;
            b.castShadow = true;
            g.add(b);
        }
        const L = new THREE.PointLight(0x93b4e8, 3.4, 8.5, 2);
        L.position.set(0, 1.6, 0.75 * inward);
        g.add(L);
        g.position.set(x, 0, z + (CELL / 2 - 0.03) * inward);
        this.group.add(g);
        return g;
    }

    buildLights() {
        // luz de luna en las piezas grandes, para que nada quede en negro puro
        this.buildWindow(3, 1, 1);        // dormitorio
        this.buildWindow(12, 1, 1);       // cuarto del fondo
        this.buildWindow(20, 1, 1);       // deposito
        this.buildWindow(3, 16, -1);      // sala: es donde despierta
        this.buildWindow(13, 16, -1);     // cocina
        this.buildWindow(21, 16, -1);     // despensa

        // una bombita colgando en el pasillo, apenas viva
        const [hx, hz] = toWorld(11, 8);
        const bulb = new THREE.PointLight(0xffd9a0, 9, 16, 1.7);
        bulb.position.set(hx, WALL_H - 0.5, hz);
        bulb.castShadow = true;
        bulb.shadow.mapSize.set(512, 512);
        bulb.shadow.bias = -0.004;
        this.group.add(bulb);
        const glass = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
            new THREE.MeshBasicMaterial({ color: 0xffe6bd }));
        glass.position.copy(bulb.position);
        this.group.add(glass);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 4),
            new THREE.MeshBasicMaterial({ color: 0x121010 }));
        cord.position.set(hx, WALL_H - 0.25, hz);
        this.group.add(cord);
        this.bulb = bulb; this.bulbGlass = glass;

        // luz de luna entrando por la salida, para que se lea donde esta
        const exitGlow = new THREE.PointLight(0x93b4e8, 3.2, 7, 2);
        exitGlow.position.set(this.exitPos.x, 1.7, this.exitPos.z + 0.5);
        this.group.add(exitGlow);
    }

    flicker(t) {
        if (!this.bulb) return;
        const f = 0.72 + 0.28 * Math.sin(t * 11.3) * Math.sin(t * 3.1) + (Math.random() < 0.012 ? -0.5 : 0);
        this.bulb.intensity = Math.max(1.2, 9 * f);
        this.bulbGlass.material.color.setScalar(Math.min(1, 0.5 + f * 0.6));
    }

    openExit(k) { if (this.exitPivot) this.exitPivot.rotation.y = -1.5 * Math.min(1, Math.max(0, k)) }
    unboard() { if (this.boards) this.boards.visible = false }

    /* Punto libre aleatorio dentro de una pieza, en coordenadas de mundo. */
    randomSpotIn(room, rng) {
        const R = ROOMS[room];
        for (let i = 0; i < 40; i++) {
            const c = rng.int(R.c0, R.c1), r = rng.int(R.r0, R.r1);
            if (!isSolid(c, r)) return { c, r, pos: toWorld(c, r) };
        }
        const c = R.c0, r = R.r0;
        return { c, r, pos: toWorld(c, r) };
    }
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

/* ---- navegacion sobre la grilla ---- */

/* BFS: devuelve el camino en celdas desde (c0,r0) hasta (c1,r1). */
export function findPath(c0, r0, c1, r1) {
    if (isSolid(c1, r1)) return null;
    const key = (c, r) => r * COLS + c;
    const prev = new Int32Array(COLS * ROWS).fill(-1);
    const seen = new Uint8Array(COLS * ROWS);
    const q = [key(c0, r0)];
    seen[key(c0, r0)] = 1;
    const goal = key(c1, r1);
    for (let h = 0; h < q.length; h++) {
        const cur = q[h];
        if (cur === goal) break;
        const c = cur % COLS, r = (cur - c) / COLS;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = c + dc, nr = r + dr;
            if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
            if (isSolid(nc, nr)) continue;
            const k = key(nc, nr);
            if (seen[k]) continue;
            seen[k] = 1; prev[k] = cur; q.push(k);
        }
    }
    if (!seen[goal]) return null;
    const path = [];
    for (let k = goal; k !== -1; k = prev[k]) {
        const c = k % COLS;
        path.push([c, (k - c) / COLS]);
        if (k === key(c0, r0)) break;
    }
    return path.reverse();
}

/* Linea de vista sobre la grilla (DDA simple, paso corto). */
export function hasLineOfSight(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const dist = Math.hypot(dx, dz);
    const steps = Math.ceil(dist / (CELL * 0.35));
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const [c, r] = toCell(x0 + dx * t, z0 + dz * t);
        if (isSolid(c, r)) return false;
    }
    return true;
}

/* Empuja un circulo de radio `rad` fuera de las celdas solidas. */
export function collide(x, z, rad) {
    const [c0, r0] = toCell(x, z);
    for (let r = r0 - 1; r <= r0 + 1; r++) {
        for (let c = c0 - 1; c <= c0 + 1; c++) {
            if (!isSolid(c, r)) continue;
            const [cx, cz] = toWorld(c, r);
            const half = CELL / 2;
            const nx = Math.max(cx - half, Math.min(x, cx + half));
            const nz = Math.max(cz - half, Math.min(z, cz + half));
            const dx = x - nx, dz = z - nz;
            const d2 = dx * dx + dz * dz;
            if (d2 >= rad * rad) continue;
            const d = Math.sqrt(d2) || 1e-4;
            const push = (rad - d) / d;
            x += dx * push; z += dz * push;
        }
    }
    return [x, z];
}
