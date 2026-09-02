/* Rig del bicho, por segmentos rigidos.
   ---------------------------------------------------------------------------
   Rezona devolvio el rig con `preset:walk` y `preset:run`, pero la malla vuelve
   APLASTADA — tambien la copia sin animar, asi que no es el clip: es que un
   esqueleto humanoide con pesos suaves no le entra a un bicho de zancos sin
   pies. Se comprobo renderizandolo aparte.

   Asi que el rig se hace aca, y de la unica forma que corresponde para esta
   criatura: **partiendola en varillas rigidas**. Es un titere de palos. Una
   pantorrilla que gira entera alrededor de la rodilla es exactamente lo que
   hace una pierna de zanco; el suavizado de un skin no aportaria nada y si
   metaria artefactos en las uniones.

   Los cortes salen de MEDIR el modelo, no de suponerlos: se recorrio el bicho
   en rebanadas horizontales mirando cuanto se ensancha en el eje lateral. A
   |z| > 0,105 aparecen los brazos; el ancho se derrumba en y = 0,27, que es el
   hombro; y abajo de y = -0,28 solo quedan las dos piernas. */
import * as THREE from 'three';

/* Todo en coordenadas del modelo, que va de y = -0,5 a y = +0,5. */
export const HUESOS = {
    zc: -0.0012,          // eje del cuerpo en el lateral
    yCuello: 0.300,
    yHombro: 0.270,
    yCodo: 0.000,
    yCadera: -0.020,
    yRodilla: -0.260,
    zBrazo: 0.105,        // mas afuera que esto es brazo, no torso
    zPierna: 0.030,       // separacion entre las dos piernas
    yOjos: 0.4257,        // medido: el pico de brillo de la cara
    zOjo: 0.0120,
    xCara: 0.050,
};

const centro = (a, b, c) => [(a[0]+b[0]+c[0])/3, (a[1]+b[1]+c[1])/3, (a[2]+b[2]+c[2])/3];

/* A que hueso pertenece un triangulo, segun donde cae su centro. */
function aQueHueso(p) {
    const H = HUESOS;
    const dz = p[2] - H.zc, az = Math.abs(dz), lado = dz < 0 ? 'I' : 'D';
    if (p[1] > H.yCuello) return 'cabeza';
    if (az > H.zBrazo) return (p[1] > H.yCodo ? 'brazo' : 'antebrazo') + lado;
    if (p[1] > H.yCadera) return 'torso';
    return (p[1] > H.yRodilla ? 'muslo' : 'pantorrilla') + (dz < 0 ? 'I' : 'D');
}

/* Donde pivota cada hueso, y de quien cuelga. */
function pivotes() {
    const H = HUESOS;
    const p = { torso: [0, H.yCadera, H.zc], cabeza: [0, H.yCuello, H.zc] };
    for (const [l, s] of [['I', -1], ['D', 1]]) {
        p['brazo' + l] = [0, H.yHombro, H.zc + s * 0.150];
        p['antebrazo' + l] = [0, H.yCodo, H.zc + s * 0.150];
        p['muslo' + l] = [0, H.yCadera, H.zc + s * H.zPierna];
        p['pantorrilla' + l] = [0, H.yRodilla, H.zc + s * H.zPierna];
    }
    return p;
}
const PADRE = {
    cabeza: 'torso', brazoI: 'torso', brazoD: 'torso',
    antebrazoI: 'brazoI', antebrazoD: 'brazoD',
    musloI: 'torso', musloD: 'torso',
    pantorrillaI: 'musloI', pantorrillaD: 'musloD',
};

export function construirBicho(escena3d, alto) {
    /* Una sola malla con todo: se parte en pedazos por la posicion de cada
       triangulo y cada pedazo se cuelga de su articulacion. */
    let fuente = null;
    escena3d.updateWorldMatrix(true, true);
    escena3d.traverse(n => { if (n.isMesh && !fuente) fuente = n });
    if (!fuente) return null;

    const geo = fuente.geometry.index ? fuente.geometry.toNonIndexed() : fuente.geometry.clone();
    geo.applyMatrix4(fuente.matrixWorld);
    const pos = geo.getAttribute('position');
    const uv = geo.getAttribute('uv');
    const nor = geo.getAttribute('normal');

    const bolsas = {};
    const leer = (att, i, n) => { const o = []; for (let k = 0; k < n; k++) o.push(att.getComponent(i, k)); return o };
    for (let t = 0; t < pos.count; t += 3) {
        const a = leer(pos, t, 3), b = leer(pos, t+1, 3), c = leer(pos, t+2, 3);
        const h = aQueHueso(centro(a, b, c));
        const B = bolsas[h] || (bolsas[h] = { p: [], u: [], n: [] });
        for (let k = 0; k < 3; k++) {
            B.p.push(...leer(pos, t+k, 3));
            if (uv) B.u.push(...leer(uv, t+k, 2));
            if (nor) B.n.push(...leer(nor, t+k, 3));
        }
    }

    const piv = pivotes();
    const grupos = {}, mallas = {};
    const raiz = new THREE.Group();
    for (const h of Object.keys(bolsas)) {
        const B = bolsas[h];
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
        if (B.u.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
        if (B.n.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
        else g.computeVertexNormals();
        const P = piv[h] || [0, 0, 0];
        // el pivote al origen: asi girar el grupo gira alrededor de la articulacion
        g.translate(-P[0], -P[1], -P[2]);
        const m = new THREE.Mesh(g, fuente.material);
        m.castShadow = true;
        const grupo = new THREE.Group();
        grupo.position.set(P[0], P[1], P[2]);
        grupo.add(m);
        grupos[h] = grupo; mallas[h] = m;
    }
    // colgar cada hueso de su padre, restando el pivote del padre
    for (const h of Object.keys(grupos)) {
        const pa = PADRE[h];
        if (pa && grupos[pa]) {
            const P = piv[h], Q = piv[pa];
            grupos[h].position.set(P[0]-Q[0], P[1]-Q[1], P[2]-Q[2]);
            grupos[pa].add(grupos[h]);
        } else if (h !== 'torso') {
            raiz.add(grupos[h]);
        }
    }
    if (grupos.torso) raiz.add(grupos.torso);

    /* Las cuencas. La textura no se puede parchear: los islotes UV del atlas se
       pisan entre si, asi que pintar por posicion tapaba un ojo y el otro no
       —se comprobo con una banda roja—. Con geometria no hay ambiguedad: dos
       casquetes negros puestos donde estan los ojos, y listo. */
    const negro = new THREE.MeshBasicMaterial({ color: 0x050506 });
    const H = HUESOS;
    const cab = grupos.cabeza || raiz;
    const dy = grupos.cabeza ? H.yCuello : 0;

    /* Una BANDA que cruza toda la cara, no dos casquetes. La altura de los ojos
       esta medida y es firme (una banda roja de prueba cayo justo sobre el ojo),
       pero el z de cada ojo NO se pudo medir: los islotes UV del atlas se pisan
       entre si, asi que la lectura de brillo daba la posicion de uno solo. En
       vez de seguir midiendo se elimina el parametro dudoso — una banda tapa
       los dos ojos donde sea que esten, y ademas se lee como cuenca hundida,
       que es justo el efecto que se busca. */
    const banda = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), negro);
    banda.scale.set(0.010, 0.0125, 0.034);
    banda.position.set(H.xCara - 0.004, H.yOjos - dy, 0);
    cab.add(banda);

    // y un tajo por boca, mas abajo y mas angosto
    const boca = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), negro);
    boca.scale.set(0.008, 0.0055, 0.013);
    boca.position.set(H.xCara - 0.004, H.yOjos - 0.028 - dy, 0);
    cab.add(boca);

    /* Normalizar: alto real y origen en los pies, ya con todo colgado. */
    const caja = new THREE.Box3().setFromObject(raiz);
    const k = alto / (caja.max.y - caja.min.y);
    raiz.scale.setScalar(k);
    const caja2 = new THREE.Box3().setFromObject(raiz);
    const c = caja2.getCenter(new THREE.Vector3());
    raiz.position.set(-c.x, -caja2.min.y, -c.z);

    const cont = new THREE.Group();
    cont.add(raiz);
    return { cont, grupos, huesos: Object.keys(bolsas) };
}
