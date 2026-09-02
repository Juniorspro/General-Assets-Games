/* Los muebles de verdad.
   ---------------------------------------------------------------------------
   Antes eran dos cajas por pieza. Ahora son mallas generadas con Tripo y
   horneadas a 1-2 mil triangulos con textura de 512: las siete juntas pesan
   652 KB, menos que una sola sin tocar.

   Dos cosas que hay que saber de lo que devuelve Tripo:

   1. Vienen NORMALIZADAS a un cubo de lado 1. El alto real lo pone el juego,
      no el archivo, asi que cada pieza lleva su altura en metros en la tabla.
   2. Todas miran a +X. Se comprobo girando cada una en cuatro y mirando en
      cual se le ve el frente: las siete dieron lo mismo. Asi que para que una
      pieza mire hacia (dx,dz) el giro es atan2(-dz, dx), no atan2(dz,dx). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    CELL, W, H, Rng, toWorld, esPiso, hayPared, PARED, SECTORES, sectorEn,
} from './map.js';

/* alto en metros · si va contra la pared · si se puede revisar por la llave */
export const CATALOGO = {
    armario:    { alto: 2.00, pared: true,  revisable: true },
    comoda:     { alto: 1.10, pared: true,  revisable: true },
    estanteria: { alto: 2.10, pared: true,  revisable: true },
    reloj:      { alto: 2.30, pared: true,  revisable: false },
    sofa:       { alto: 0.95, pared: true,  revisable: false },
    mesa:       { alto: 0.80, pared: false, revisable: false },
    silla:      { alto: 1.05, pared: false, revisable: false },
    sillon:     { alto: 1.15, pared: false, revisable: false },
    /* La segunda tanda, para la casa grande: el piano del salon, los bancos de
       la capilla, la mesa larga del comedor y la vitrina, que tambien se
       revisa buscando la llave. */
    piano:      { alto: 1.28, pared: true,  revisable: false },
    banco:      { alto: 0.98, pared: false, revisable: false },
    mesalarga:  { alto: 0.78, pared: false, revisable: false },
    vitrina:    { alto: 2.05, pared: true,  revisable: true },
};

/* Un mueble mira a +X, asi que para mirar hacia (dx,dz) hay que girar asi. */
export const miraHacia = (dx, dz) => Math.atan2(-dz, dx);

export function cargarMuebles(assets) {
    const L = new GLTFLoader();
    const listos = {};
    const tareas = [];
    for (const nombre of Object.keys(CATALOGO)) {
        const url = assets['mueble_' + nombre];
        if (!url) continue;
        tareas.push(L.loadAsync(url).then(g => {
            const o = g.scene;
            /* Normalizar una vez: al alto de la tabla y con el origen en el
               piso y centrado. Asi el que lo coloca solo pone x, z y giro. */
            const b = new THREE.Box3().setFromObject(o);
            const k = CATALOGO[nombre].alto / (b.max.y - b.min.y);
            o.scale.setScalar(k);
            const b2 = new THREE.Box3().setFromObject(o);
            const c = b2.getCenter(new THREE.Vector3());
            o.position.set(-c.x, -b2.min.y, -c.z);
            const cont = new THREE.Group();
            cont.add(o);
            o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true } });
            const b3 = new THREE.Box3().setFromObject(cont);
            listos[nombre] = { plantilla: cont, tam: b3.getSize(new THREE.Vector3()) };
        }).catch(() => { /* si una pieza no llega, el resto igual entra */ }));
    }
    return Promise.all(tareas).then(() => listos);
}

/* Coloca los muebles de un nivel, EN ORDEN.
   ---------------------------------------------------------------------------
   Antes iba todo al azar: celda al azar, giro al azar y un desplazamiento al
   azar encima. Una mesa a 37 grados en el medio de un cuarto no se lee como
   una casa, se lee como un volquete. Ahora:

   - los giros van pegados a la grilla, de a 90 grados, nunca en diagonal;
   - lo que va contra la pared se recorre EN ORDEN por el mapa, uno cada tantas
     celdas, y queda al ras y mirando al cuarto;
   - en las salas se arman JUEGOS: una mesa con sus sillas alrededor mirandola,
     o un sofa contra la pared con su sillon al lado.

   Devuelve las cajas para chocar y los muebles que se pueden revisar. */
export function poblar(modelos, lv, base, grupo, semilla, evitar) {
    const rng = new Rng(semilla);
    const cajas = [], revisables = [];
    const ocupadas = new Set(evitar || []);
    const hay = n => !!modelos[n];

    const poner = (nombre, c, r, giro, dx = 0, dz = 0) => {
        const m = modelos[nombre];
        if (!m) return false;
        const o = m.plantilla.clone(true);
        const [x, z] = toWorld(c, r);
        o.position.set(x + dx, base, z + dz);
        o.rotation.y = giro;
        grupo.add(o);
        ocupadas.add(c + ',' + r);
        const cs = Math.abs(Math.cos(giro)), sn = Math.abs(Math.sin(giro));
        const ax = m.tam.x * cs + m.tam.z * sn, az = m.tam.x * sn + m.tam.z * cs;
        const caja = {
            x: o.position.x, z: o.position.z,
            hx: ax / 2 * 0.86, hz: az / 2 * 0.86,
            base, alto: CATALOGO[nombre].alto,
        };
        cajas.push(caja);
        if (CATALOGO[nombre].revisable) revisables.push({ ...caja, nombre, obj: o, lv });
        return true;
    };

    const libre = (c, r) => esPiso(c, r) && !ocupadas.has(c + ',' + r);
    /* Sitio holgado: las nueve celdas son piso y ninguna de las cuatro caras
       tiene tabique. Con paredes finas ya no alcanza con mirar si la celda de
       al lado es piso — puede serlo y haber un tabique en el medio. */
    const ancho = (c, r) => {
        for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++)
                if (!esPiso(c + dc, r + dr)) return false;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
            if (hayPared(c, r, dc, dr)) return false;
        return true;
    };

    /* --- 0. LAS SALAS CON NOMBRE ---------------------------------------
       Cada sala del mapa tiene tema, y el tema decide que entra. La biblioteca
       va forrada de estanterias contra las cuatro paredes; el salon tiene el
       reloj de pie, el sofa y el sillon encarado; la sala de las baldosas y la
       salida quedan VACIAS a proposito, porque ahi hay que poder correr. Las
       celdas de estas salas se marcan ocupadas, asi que los pasos genericos de
       mas abajo no les meten nada encima. */
    /* Contra que pared esta una celda: ahora la pared es un tabique en el
       borde, asi que se pregunta por el borde y no por la celda vecina. */
    const pegadoA = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([dc, dr]) => hayPared(c, r, dc, dr) === PARED);
    const alRas = (nombre, c, r, dc, dr) => {
        const prof = modelos[nombre] ? modelos[nombre].tam.z : 0.5;
        return poner(nombre, c, r, miraHacia(-dc, -dr),
                     dc * (CELL / 2 - prof / 2 - 0.04), dr * (CELL / 2 - prof / 2 - 0.04));
    };

    for (const sala of SECTORES) {
        if (sala.pasillo) continue;
        const celdas = [];
        for (let r = sala.r; r < sala.r + sala.h; r++)
            for (let c = sala.c; c < sala.c + sala.w; c++)
                if (esPiso(c, r)) celdas.push([c, r]);
        if (!celdas.length) continue;
        const cc = sala.c + (sala.w >> 1), cr = sala.r + (sala.h >> 1);

        if (sala.tema === 'libros' && hay('estanteria')) {
            // pared a pared: es lo que se ve en la foto del cubo rojo
            let k = 0;
            for (const [c, r] of celdas) {
                const d = pegadoA(c, r);
                if (!d.length || ocupadas.has(c + ',' + r)) continue;
                // una vitrina cada cinco estanterias: rompe la pared repetida
                const pieza = (hay('vitrina') && (k++ % 5) === 4) ? 'vitrina' : 'estanteria';
                alRas(pieza, c, r, d[0][0], d[0][1]);
            }
        } else if (sala.tema === 'reloj') {
            // el reloj de pie contra la pared, el sofa en otra, el sillon mirandolo
            let hecho = 0;
            for (const [c, r] of celdas) {
                const d = pegadoA(c, r);
                if (!d.length || ocupadas.has(c + ',' + r)) continue;
                if (hecho === 0 && hay('reloj')) { alRas('reloj', c, r, d[0][0], d[0][1]); hecho++ }
                else if (hecho === 1 && hay('piano')) { alRas('piano', c, r, d[0][0], d[0][1]); hecho++ }
                else if (hecho === 2 && hay('sofa')) { alRas('sofa', c, r, d[0][0], d[0][1]); hecho++ }
                else if (hecho === 3 && hay('comoda')) { alRas('comoda', c, r, d[0][0], d[0][1]); hecho++ }
                else if (hecho === 4 && hay('vitrina')) { alRas('vitrina', c, r, d[0][0], d[0][1]); hecho++ }
            }
            /* El sillon va corrido del centro: el centro de la sala es por donde
               se entra y por donde pasa el bicho, y un sillon ahi te traba. */
            if (hay('sillon') && libre(cc + 1, cr)) poner('sillon', cc + 1, cr, miraHacia(-1, 0));
        } else if (sala.tema === 'capilla' && hay('silla')) {
            // dos filas de sillas encaradas al fondo, como bancos de iglesia
            const pasillo = sala.c + (sala.w >> 1);   // el pasillo del medio
            for (const [c, r] of celdas) {
                if (((r - sala.r) % 2) || c === pasillo || ocupadas.has(c + ',' + r)) continue;
                poner('silla', c, r, miraHacia(0, -1));
            }
        } else if (sala.tema === 'cocina' && hay('mesalarga')) {
            /* La mesa larga en el eje del comedor, con las sillas de los dos
               lados mirandola. Una casa de un bicho de tres metros come en una
               mesa de seis, no en una mesita cuadrada. */
            const fila = cr;
            for (let c = sala.c + 2; c < sala.c + sala.w - 2; c += 2) {
                if (!libre(c, fila)) continue;
                poner('mesalarga', c, fila, 0);
                for (const dr of [-1, 1])
                    if (libre(c, fila + dr) && hay('silla'))
                        poner('silla', c, fila + dr, miraHacia(0, -dr), 0, -dr * 0.22);
            }
        } else if (sala.tema === 'cocina') {
            // cuarto de casa: mesa con sus sillas, y un armario contra la pared
            if (hay('mesa') && libre(cc, cr)) {
                poner('mesa', cc, cr, 0);
                for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
                    if (libre(cc + dc, cr + dr) && hay('silla'))
                        poner('silla', cc + dc, cr + dr, miraHacia(-dc, -dr), -dc * 0.25, -dr * 0.25);
            }
            for (const [c, r] of celdas) {
                const d = pegadoA(c, r);
                if (!d.length || ocupadas.has(c + ',' + r)) continue;
                if (hay('armario')) { alRas('armario', c, r, d[0][0], d[0][1]); break }
            }
        }
        // vacias o ya vestidas: nadie mas mete nada acá
        for (const [c, r] of celdas) ocupadas.add(c + ',' + r);
    }

    /* --- 1. LAS SALAS: juegos de muebles, no piezas sueltas ------------- */
    const contraPared = ['armario', 'comoda', 'estanteria', 'reloj', 'vitrina', 'piano'].filter(hay);
    const salas = [];
    for (let r = 3; r < H - 3; r++) {
        for (let c = 3; c < W - 3; c++) {
            if (!ancho(c, r) || ocupadas.has(c + ',' + r)) continue;
            // una sala cada cinco celdas: sin esto se pisan entre si
            if (salas.some(([sc, sr]) => Math.abs(sc - c) < 5 && Math.abs(sr - r) < 5)) continue;
            salas.push([c, r]);
        }
    }
    for (const [c, r] of salas) {
        if (rng.next() < 0.55 && hay('mesa')) {
            /* Mesa al centro y las sillas alrededor MIRANDOLA. El giro de cada
               silla sale de la direccion hacia la mesa, asi que siempre da un
               multiplo de 90 y quedan encaradas de verdad. */
            poner('mesa', c, r, 0);
            const lados = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            let n = 0;
            for (const [dc, dr] of lados) {
                if (n >= 3 || rng.next() < 0.35) continue;
                if (!libre(c + dc, r + dr)) continue;
                poner('silla', c + dc, r + dr, miraHacia(-dc, -dr), -dc * 0.25, -dr * 0.25);
                n++;
            }
        } else if (hay('sillon')) {
            // dos sillones encarados, como un rincon de sentarse
            poner('sillon', c, r, miraHacia(0, 1), 0, -0.35);
            if (libre(c, r + 1)) poner('sillon', c, r + 1, miraHacia(0, -1), 0, 0.35);
        }
        ocupadas.add(c + ',' + r);
    }

    /* --- 2. CONTRA LA PARED: recorrido en orden, al ras ----------------- */
    let paso = 0, puestos = 0;
    for (let r = 1; r < H - 1 && puestos < 34; r++) {
        for (let c = 1; c < W - 1 && puestos < 34; c++) {
            if (!libre(c, r)) continue;
            const dirs = pegadoA(c, r);
            if (!dirs.length) continue;
            // uno cada cuatro sitios validos: apretados quedan como un deposito
            if (paso++ % 4) continue;
            const [dc, dr] = dirs[rng.int(0, dirs.length - 1)];
            const nombre = contraPared[puestos % contraPared.length];
            const prof = modelos[nombre].tam.z;
            if (poner(nombre, c, r, miraHacia(-dc, -dr),
                      dc * (CELL / 2 - prof / 2 - 0.04), dr * (CELL / 2 - prof / 2 - 0.04))) {
                puestos++;
                // dejar respirar: nada pegado al de al lado
                ocupadas.add((c + 1) + ',' + r);
                ocupadas.add(c + ',' + (r + 1));
            }
        }
    }

    /* --- 3. Los sofas, contra la pared y mirando al cuarto -------------- */
    if (hay('sofa')) {
        let n = 0;
        for (let r = 2; r < H - 2 && n < 6; r += 3) {
            for (let c = 2; c < W - 2 && n < 6; c += 3) {
                if (!libre(c, r) || !ancho(c, r)) continue;
                const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
                    .filter(([dc, dr]) => hayPared(c + dc, r + dr, dc, dr) === PARED);
                if (!dirs.length) continue;
                const [dc, dr] = dirs[0];
                poner('sofa', c, r, miraHacia(-dc, -dr), dc * 0.5, dr * 0.5);
                n++;
            }
        }
    }
    return { cajas, revisables };
}

/* Empuje contra los muebles. Es el mismo problema que con las paredes: si el
   jugador aparece DENTRO de una caja, la distancia no da direccion y no lo
   saca nadie. Se sale por la cara mas cercana. */
export function chocarMuebles(cajas, x, z, y, rad) {
    for (const b of cajas) {
        if (y < b.base - 0.6 || y > b.base + b.alto) continue;
        const dx = x - b.x, dz = z - b.z;
        const px = b.hx + rad - Math.abs(dx), pz = b.hz + rad - Math.abs(dz);
        if (px <= 0 || pz <= 0) continue;
        if (px < pz) x = b.x + Math.sign(dx || 1) * (b.hx + rad);
        else z = b.z + Math.sign(dz || 1) * (b.hz + rad);
    }
    return [x, z];
}
