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
import { CELL, W, H, Rng, toWorld, isOpen, isStairCell, isHole } from './map.js';

/* alto en metros · si va contra la pared · si se puede revisar por la llave */
export const CATALOGO = {
    armario:    { alto: 2.00, pared: true,  revisable: true },
    comoda:     { alto: 1.15, pared: true,  revisable: true },
    estanteria: { alto: 2.10, pared: true,  revisable: true },
    reloj:      { alto: 2.30, pared: true,  revisable: false },
    mesa:       { alto: 0.85, pared: false, revisable: false },
    silla:      { alto: 1.05, pared: false, revisable: false },
    sillon:     { alto: 1.15, pared: false, revisable: false },
    sofa:       { alto: 1.00, pared: false, revisable: false },
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

/* Coloca los muebles de un nivel. Devuelve las cajas para chocar y la lista
   de los que se pueden revisar, que es donde aparece la llave. */
export function poblar(modelos, lv, base, grupo, semilla, evitar) {
    const rng = new Rng(semilla);
    const contraPared = Object.keys(CATALOGO).filter(n => CATALOGO[n].pared && modelos[n]);
    const sueltos = Object.keys(CATALOGO).filter(n => !CATALOGO[n].pared && modelos[n]);
    const cajas = [], revisables = [];
    /* Las celdas donde no puede ir nada: la de aparicion y sus vecinas.
       Sin esto se aparece adentro de un ropero, que fue lo que paso. */
    const ocupadas = new Set(evitar || []);
    if (!contraPared.length && !sueltos.length) return { cajas, revisables };

    const poner = (nombre, c, r, giro, dentro) => {
        const m = modelos[nombre];
        const o = m.plantilla.clone(true);
        const [x, z] = toWorld(c, r);
        o.position.set(x + dentro[0], base, z + dentro[1]);
        o.rotation.y = giro;
        grupo.add(o);
        ocupadas.add(c + ',' + r);
        /* La caja para chocar se calcula del tamano YA girado, no del bbox del
           mundo: el bbox de un objeto girado 45° es mas grande que el objeto. */
        const cs = Math.abs(Math.cos(giro)), sn = Math.abs(Math.sin(giro));
        const ax = m.tam.x * cs + m.tam.z * sn, az = m.tam.x * sn + m.tam.z * cs;
        const caja = {
            x: o.position.x, z: o.position.z,
            hx: ax / 2 * 0.86, hz: az / 2 * 0.86,  // un pelo mas chico: rozar no es chocar
            base, alto: CATALOGO[nombre].alto,
        };
        cajas.push(caja);
        if (CATALOGO[nombre].revisable) revisables.push({ ...caja, nombre, obj: o, lv });
        return o;
    };

    // contra la pared, mirando hacia el lado abierto
    let n = 0;
    for (let i = 0; i < 9000 && n < 30 && contraPared.length; i++) {
        const c = rng.int(1, W - 2), r = rng.int(1, H - 2);
        if (!isOpen(lv, c, r) || isStairCell(c, r) || ocupadas.has(c + ',' + r)) continue;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .filter(([dc, dr]) => !isOpen(lv, c + dc, r + dr) && !isHole(lv, c + dc, r + dr));
        if (!dirs.length) continue;
        const [dc, dr] = dirs[rng.int(0, dirs.length - 1)];
        const nombre = contraPared[rng.int(0, contraPared.length - 1)];
        const prof = modelos[nombre].tam.z;
        // pegado a la pared y mirando al centro del cuarto: -dc, -dr
        poner(nombre, c, r, miraHacia(-dc, -dr),
            [dc * (CELL / 2 - prof / 2 - 0.05), dr * (CELL / 2 - prof / 2 - 0.05)]);
        n++;
    }

    // sueltos: solo donde hay 3x3 abierto, o sea en las salas
    let s = 0;
    for (let i = 0; i < 9000 && s < 22 && sueltos.length; i++) {
        const c = rng.int(2, W - 3), r = rng.int(2, H - 3);
        if (ocupadas.has(c + ',' + r) || isStairCell(c, r)) continue;
        let libre = true;
        for (let dr = -1; dr <= 1 && libre; dr++)
            for (let dc = -1; dc <= 1; dc++)
                if (!isOpen(lv, c + dc, r + dr)) { libre = false; break }
        if (!libre) continue;
        const nombre = sueltos[rng.int(0, sueltos.length - 1)];
        poner(nombre, c, r, rng.range(0, Math.PI * 2), [rng.range(-.25, .25), rng.range(-.25, .25)]);
        s++;
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
