/* ══════════════════════════════════════════════════════════════════════════
   EL RIG Y LAS ANIMACIONES — un esqueleto de pivotes y poses que son
   funciones del tiempo
   ══════════════════════════════════════════════════════════════════════════
   NO SE IMPORTA NINGÚN CLIP. Con un rig propio, ESCRIBIR la curva es más
   corto que describirla, y mezclar dos animaciones es evaluarlas y
   promediarlas — que es todo lo que un crossfade es. Es lo que ya funcionó
   en RECREO: cero descargas, cero retarget, y los ejes se saben porque los
   pusimos nosotros.

   CADA ARTICULACIÓN ES UN PIVOTE puesto DONDE ESTÁ LA ARTICULACIÓN, con la
   pieza colgando media longitud más abajo. Así girar el pivote gira el hueso
   alrededor de su punta de arriba, que es lo que hace un codo. Con la pieza
   centrada en el pivote, doblar el codo parte el antebrazo por la mitad.   */

/* ── UNA GEOMETRÍA POR PIEZA, CON VARIAS CAJAS FUNDIDAS ────────────────────
   Un esqueleto con costillas sueltas serían cinco mallas más POR bicho. Las
   costillas van fundidas adentro de la geometría del pecho y el color va en
   los vértices, así que el kit entero usa UN material.                     */
function cajas(lista) {
  const P = [], N = [], C = [];
  const CA = [   // las seis caras de un cubo unitario: normal y cuatro esquinas
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
    [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
  ];
  const c = new THREE.Color();
  for (const b of lista) {
    const hw = b.w / 2, hh = b.h / 2, hd = b.d / 2;
    c.setHex(b.c === undefined ? 0xffffff : b.c).convertSRGBToLinear();
    const rx = b.rx || 0, ry = b.ry || 0, rz = b.rz || 0;
    const e = new THREE.Euler(rx, ry, rz, 'YXZ'), m = new THREE.Matrix4().makeRotationFromEuler(e);
    const v = new THREE.Vector3(), nn = new THREE.Vector3();
    for (const [nor, esq] of CA) {
      nn.set(nor[0], nor[1], nor[2]).applyMatrix4(m).normalize();
      const q = esq.map(s => {
        v.set(s[0] * hw, s[1] * hh, s[2] * hd).applyMatrix4(m);
        return [v.x + (b.x || 0), v.y + (b.y || 0), v.z + (b.z || 0)];
      });
      for (const t of [[0, 1, 2], [0, 2, 3]]) for (const i of t) {
        P.push(q[i][0], q[i][1], q[i][2]);
        N.push(nn.x, nn.y, nn.z);
        C.push(c.r, c.g, c.b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}

/* ── LAS DOS RECETAS ───────────────────────────────────────────────────────
   Mismos nombres de hueso en las dos, así que UNA sola tabla de poses mueve
   al caballero y a los cuatro esqueletos. Lo que cambia son las cajas.     */
function recetaHeroe() {
  const PIEL = 0xb98a63, CUERO = 0x4a3526, ACERO = 0x7d848c, TELA = 0x6b2b2a, OSC = 0x2a2420;
  return {
    alto: 1.72, nombre: 'heroe',
    huesos: {
      pelvis: { padre: null, y: 0.94 },
      torso:  { padre: 'pelvis', y: 0.02 },
      pecho:  { padre: 'torso', y: 0.24 },
      cuello: { padre: 'pecho', y: 0.26 },
      hombroI:{ padre: 'pecho', y: 0.20, x: 0.21 },
      hombroD:{ padre: 'pecho', y: 0.20, x: -0.21 },
      anteI:  { padre: 'hombroI', y: -0.28 },
      anteD:  { padre: 'hombroD', y: -0.28 },
      musloI: { padre: 'pelvis', y: -0.06, x: 0.11 },
      musloD: { padre: 'pelvis', y: -0.06, x: -0.11 },
      pantI:  { padre: 'musloI', y: -0.44 },
      pantD:  { padre: 'musloD', y: -0.44 },
    },
    piezas: {
      pelvis: cajas([{ w: 0.30, h: 0.16, d: 0.20, y: -0.05, c: CUERO }]),
      torso:  cajas([{ w: 0.34, h: 0.26, d: 0.21, y: 0.12, c: TELA }]),
      pecho:  cajas([
        { w: 0.40, h: 0.30, d: 0.24, y: 0.13, c: ACERO },
        { w: 0.42, h: 0.05, d: 0.26, y: 0.25, c: 0x9aa2ab },     // hombrera de arriba
        { w: 0.10, h: 0.24, d: 0.26, y: 0.13, c: 0x8f979f },     // el filo del peto
        { w: 0.44, h: 0.06, d: 0.06, y: 0.06, z: 0.12, c: CUERO }, // correa
      ]),
      cuello: cajas([
        { w: 0.12, h: 0.08, d: 0.12, y: 0.04, c: PIEL },
        { w: 0.21, h: 0.22, d: 0.21, y: 0.19, c: PIEL },          // cabeza
        { w: 0.23, h: 0.10, d: 0.23, y: 0.28, c: 0x8d949c },      // el yelmo
        { w: 0.24, h: 0.05, d: 0.05, y: 0.20, z: 0.11, c: OSC },  // la ranura
        { w: 0.05, h: 0.13, d: 0.05, y: 0.24, z: 0.11, c: 0x8d949c }, // nasal
      ]),
      hombroI: cajas([{ w: 0.12, h: 0.30, d: 0.13, y: -0.15, c: TELA },
                      { w: 0.17, h: 0.10, d: 0.17, y: 0.01, c: 0x8f979f }]),
      hombroD: cajas([{ w: 0.12, h: 0.30, d: 0.13, y: -0.15, c: TELA },
                      { w: 0.17, h: 0.10, d: 0.17, y: 0.01, c: 0x8f979f }]),
      anteI:  cajas([{ w: 0.10, h: 0.26, d: 0.11, y: -0.13, c: PIEL },
                     { w: 0.12, h: 0.11, d: 0.13, y: -0.30, c: CUERO }]),
      /* LA ESPADA CUELGA DEL ANTEBRAZO DERECHO Y NO DE LA ESCENA. Así la
         lleva la mano por construcción y no hay dos animaciones que se
         puedan desincronizar — la lección del leño de LEMI.                */
      anteD:  cajas([{ w: 0.10, h: 0.26, d: 0.11, y: -0.13, c: PIEL },
                     { w: 0.12, h: 0.11, d: 0.13, y: -0.30, c: CUERO },
                     { w: 0.19, h: 0.05, d: 0.06, y: -0.36, c: 0x6a5238 },  // guarda
                     { w: 0.05, h: 0.09, d: 0.05, y: -0.44, c: 0x4a3a28 },  // puño
                     { w: 0.07, h: 0.86, d: 0.03, y: -0.83, c: 0xa9b2bb },  // hoja
                     { w: 0.03, h: 0.86, d: 0.035, y: -0.83, c: 0xd6dde3 }]), // el filo
      musloI: cajas([{ w: 0.14, h: 0.44, d: 0.15, y: -0.22, c: CUERO }]),
      musloD: cajas([{ w: 0.14, h: 0.44, d: 0.15, y: -0.22, c: CUERO }]),
      pantI:  cajas([{ w: 0.12, h: 0.42, d: 0.13, y: -0.21, c: 0x3b2b1e },
                     { w: 0.14, h: 0.09, d: 0.26, y: -0.44, z: 0.05, c: OSC }]),
      pantD:  cajas([{ w: 0.12, h: 0.42, d: 0.13, y: -0.21, c: 0x3b2b1e },
                     { w: 0.14, h: 0.09, d: 0.26, y: -0.44, z: 0.05, c: OSC }]),
    },
  };
}

function recetaEsq() {
  const HUE = 0xd6d0bd, OSC = 0x1a1714, OXI = 0x6a5a48, ORO = 0xc8a13a;
  const cost = [];
  for (let i = 0; i < 4; i++)                       // la caja torácica
    cost.push({ w: 0.26 - i * 0.018, h: 0.030, d: 0.19 - i * 0.012, y: 0.24 - i * 0.055, c: HUE });
  return {
    alto: 1.66, nombre: 'esq',
    huesos: recetaHeroe().huesos,                   // MISMO esqueleto de pivotes
    piezas: {
      pelvis: cajas([{ w: 0.24, h: 0.13, d: 0.15, y: -0.05, c: HUE },
                     { w: 0.06, h: 0.10, d: 0.10, y: -0.11, x: 0.08, c: HUE },
                     { w: 0.06, h: 0.10, d: 0.10, y: -0.11, x: -0.08, c: HUE }]),
      torso:  cajas([{ w: 0.07, h: 0.28, d: 0.07, y: 0.13, c: HUE }]),   // la columna
      pecho:  cajas(cost.concat([
        { w: 0.06, h: 0.30, d: 0.06, y: 0.13, c: HUE },                  // esternón
        { w: 0.34, h: 0.04, d: 0.05, y: 0.26, c: HUE },                  // clavículas
      ])),
      cuello: cajas([
        { w: 0.05, h: 0.09, d: 0.05, y: 0.04, c: HUE },
        { w: 0.19, h: 0.18, d: 0.20, y: 0.18, c: HUE },                  // el cráneo
        { w: 0.15, h: 0.07, d: 0.06, y: 0.09, z: 0.09, c: HUE },         // mandíbula
        /* LAS CUENCAS SON LO ÚNICO QUE HACE QUE UNA CAJA SEA UNA CALAVERA:
           dos huecos oscuros y la línea de los dientes. Sin eso, a diez
           metros y con niebla es un ladrillo claro.                       */
        { w: 0.055, h: 0.055, d: 0.04, y: 0.20, x: 0.045, z: 0.095, c: OSC },
        { w: 0.055, h: 0.055, d: 0.04, y: 0.20, x: -0.045, z: 0.095, c: OSC },
        { w: 0.03, h: 0.035, d: 0.03, y: 0.155, z: 0.10, c: OSC },       // nariz
      ]),
      hombroI: cajas([{ w: 0.055, h: 0.30, d: 0.055, y: -0.15, c: HUE },
                      { w: 0.10, h: 0.07, d: 0.10, y: 0.00, c: HUE }]),
      hombroD: cajas([{ w: 0.055, h: 0.30, d: 0.055, y: -0.15, c: HUE },
                      { w: 0.10, h: 0.07, d: 0.10, y: 0.00, c: HUE }]),
      anteI:  cajas([{ w: 0.048, h: 0.26, d: 0.048, y: -0.13, c: HUE },
                     { w: 0.09, h: 0.09, d: 0.05, y: -0.29, c: HUE }]),
      anteD:  cajas([{ w: 0.048, h: 0.26, d: 0.048, y: -0.13, c: HUE },
                     { w: 0.09, h: 0.09, d: 0.05, y: -0.29, c: HUE },
                     { w: 0.05, h: 0.05, d: 0.05, y: -0.34, c: OXI },
                     { w: 0.055, h: 0.62, d: 0.025, y: -0.66, c: 0x8d8574 }]),  // la hoja mellada
      musloI: cajas([{ w: 0.062, h: 0.44, d: 0.062, y: -0.22, c: HUE }]),
      musloD: cajas([{ w: 0.062, h: 0.44, d: 0.062, y: -0.22, c: HUE }]),
      pantI:  cajas([{ w: 0.052, h: 0.42, d: 0.052, y: -0.21, c: HUE },
                     { w: 0.09, h: 0.06, d: 0.20, y: -0.45, z: 0.04, c: HUE }]),
      pantD:  cajas([{ w: 0.052, h: 0.42, d: 0.052, y: -0.21, c: HUE },
                     { w: 0.09, h: 0.06, d: 0.20, y: -0.45, z: 0.04, c: HUE }]),
      /* ── LO QUE HACE QUE UN REY SE LEA A REY ──────────────────────────────
         Las cuatro clases comparten ESTA receta y sólo se distinguen por la
         escala y el tinte, así que el jefe del juego salía idéntico al primer
         bicho que uno mata — medido en la foto de la ceniza: la misma
         silueta, un 86 % más grande. Lo que separa una silueta de otra no es
         el tamaño (a diez metros no hay con qué compararlo) sino que tenga
         algo que las demás no tienen. Corona y capa cuelgan de huesos que ya
         existen, así que se mueven con la cabeza y con el pecho solos.
         Y NO CUESTAN UN BICHO MÁS: son dos mallas instanciadas de cupo 16
         cuyo matriz queda en CERO para todo el que no sea rey, o sea dos
         llamadas de dibujo en total y ni un triángulo para los peones.     */
      corona: cajas([
        { w: 0.23, h: 0.055, d: 0.23, y: 0.295, c: ORO },                  // el aro
        { w: 0.045, h: 0.12, d: 0.045, y: 0.375, z: 0.095, c: ORO },
        { w: 0.045, h: 0.12, d: 0.045, y: 0.375, z: -0.095, c: ORO },
        { w: 0.045, h: 0.12, d: 0.045, y: 0.375, x: 0.095, c: ORO },
        { w: 0.045, h: 0.12, d: 0.045, y: 0.375, x: -0.095, c: ORO },
        { w: 0.05, h: 0.05, d: 0.05, y: 0.445, z: 0.095, c: 0x7d1420 },    // la piedra
      ]),
      capa: cajas([
        { w: 0.40, h: 0.10, d: 0.06, y: 0.235, z: -0.085, c: 0x5e1420 },   // el cuello
        { w: 0.34, h: 0.52, d: 0.035, y: -0.05, z: -0.105, c: 0x4a1019 },
        { w: 0.13, h: 0.30, d: 0.03, y: -0.44, z: -0.115, x: -0.09, c: 0x3d0d15 },
        { w: 0.11, h: 0.22, d: 0.03, y: -0.50, z: -0.115, x: 0.08, c: 0x3d0d15 },
      ]),
    },
    /* una pieza cuyo nombre NO es un hueso dice de cuál cuelga */
    hueso: { corona: 'cuello', capa: 'pecho' },
  };
}

/* ── EL KIT: UNA MALLA INSTANCIADA POR PIEZA ───────────────────────────────
   Catorce esqueletos sueltos serían catorce por dieciocho = 252 llamadas de
   dibujo. Con un InstancedMesh por PIEZA son DIECIOCHO, haya uno o haya
   catorce, porque la pieza `pecho` del bicho 7 es la instancia 7 de la misma
   malla.                                                                  */
function armaKit(receta, cupo) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mallas = {};
  for (const k in receta.piezas) {
    const im = new THREE.InstancedMesh(receta.piezas[k], mat, cupo);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    im.count = 0;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cupo * 3).fill(1), 3);
    esc.add(im); mallas[k] = im;
  }
  return { receta, mat, mallas, cupo, n: 0 };
}

/* el cuerpo son PIVOTES y nada más: sin mallas, así que crear catorce cuesta
   catorce objetos vacíos y el dibujo lo hace el kit */
function armaCuerpo(receta) {
  const h = {}, raiz = new THREE.Object3D();
  for (const k in receta.huesos) {
    const d = receta.huesos[k], o = new THREE.Object3D();
    o.position.set(d.x || 0, d.y || 0, d.z || 0);
    o.rotation.order = 'YXZ';
    (d.padre ? h[d.padre] : raiz).add(o);
    h[k] = o;
  }
  /* la altura de la cadera es el CERO de la pose: `poseAplica` le suma el
     rebote encima, así que tiene que salir de la receta y no de un número
     escrito en la función de mezcla */
  return { raiz, h, baseY: receta.huesos.pelvis.y, alto: receta.alto };
}

/* escribe en el kit la pose de todos los cuerpos vivos; una pasada, sin
   crear un solo objeto */
const _KM = new THREE.Matrix4();
const _KCERO = new THREE.Matrix4().makeScale(0, 0, 0);
function kitPinta(kit, cuerpos) {
  const hs = kit.receta.hueso || {};
  let n = 0;
  for (const c of cuerpos) {
    if (!c.vive) continue;
    c.cuerpo.raiz.updateMatrixWorld(true);
    /* UNA PIEZA QUE NO LE TOCA A ESTE CUERPO VA CON MATRIZ CERO y no se
       saltea: las instancias de un InstancedMesh son un rango contiguo, así
       que saltear una correría el índice y el bicho 7 pintaría la cabeza del
       8. Una matriz de escala cero no dibuja un solo píxel.               */
    for (const k in kit.mallas)
      kit.mallas[k].setMatrixAt(n, (c.sin && c.sin[k]) ? _KCERO : c.cuerpo.h[hs[k] || k].matrixWorld);
    if (c.tinte !== undefined) for (const k in kit.mallas) kit.mallas[k].setColorAt(n, c.tinte);
    n++;
    if (n >= kit.cupo) break;
  }
  for (const k in kit.mallas) {
    const m = kit.mallas[k];
    m.count = n; m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  kit.n = n;
}

/* ══════════════════════════════════════════════════════════════════════════
   LAS POSES — cada una es una función del tiempo a doce rotaciones
   ══════════════════════════════════════════════════════════════════════════
   EL RITMO DEL CICLO NO ES UN NÚMERO AL LADO: sale de la velocidad y de la
   zancada (`ω = 2π·v / zancada`). Escrito a mano, el pie patina en cuanto
   cambia la velocidad — el defecto que en RECREO tenía a Baldi a 2,7 metros
   por paso.                                                                */
const POSE = {};
const _P = {};   // el destino de la pose: se rellena y se mezcla, sin alojar

function poseCero(p) {
  p.pelX = 0; p.pelY = 0; p.pelZ = 0; p.alt = 0;
  p.troX = 0; p.troY = 0; p.troZ = 0;
  p.pecX = 0; p.pecY = 0; p.pecZ = 0;
  p.cueX = 0; p.cueY = 0;
  p.hIX = 0.05; p.hIZ = 0.16; p.hIY = 0;
  p.hDX = 0.05; p.hDZ = -0.16; p.hDY = 0;
  p.aIX = -0.28; p.aDX = -0.28;
  p.mIX = 0; p.mDX = 0; p.pIX = 0; p.pDX = 0;
  return p;
}

/* quieto: respira, se balancea y CAMBIA EL PESO de una pierna a la otra. El
   cambio de peso es lo que más se nota y lo que menos se ve venir; sin él
   una pose de reposo se lee a maniquí que sube y baja.                     */
POSE.quieto = (p, t) => {
  poseCero(p);
  const r = Math.sin(t * 1.55), peso = Math.sin(t * 0.37);
  p.alt = r * 0.012;
  p.pecX = -0.05 + r * 0.035;
  p.cueX = 0.04 - r * 0.03;
  p.cueY = Math.sin(t * 0.29) * 0.22;
  p.pelZ = peso * 0.045;
  p.troZ = -peso * 0.030;
  p.hIZ += 0.05 + r * 0.020; p.hDZ -= 0.05 + r * 0.020;
  p.hIX += peso * 0.05; p.hDX -= peso * 0.05;
  p.aIX -= 0.16; p.aDX -= 0.20;
  p.mIX = -peso * 0.05; p.mDX = peso * 0.05;
};

/* caminar y correr son la MISMA curva con otra amplitud: son el mismo gesto
   a otra velocidad, y con dos curvas sueltas se separan al mezclarlas */
function poseAndar(p, f, k) {
  poseCero(p);
  const s = Math.sin(f), c = Math.cos(f);
  p.mIX = s * 0.86 * k; p.mDX = -s * 0.86 * k;
  p.pIX = Math.max(0, -Math.sin(f - 0.55)) * 1.28 * k;
  p.pDX = Math.max(0, -Math.sin(f + Math.PI - 0.55)) * 1.28 * k;
  p.hIX = 0.05 - s * 0.62 * k; p.hDX = 0.05 + s * 0.62 * k;
  p.aIX = -0.28 - (0.42 + s * 0.30) * k; p.aDX = -0.28 - (0.42 - s * 0.30) * k;
  /* el rebote va al DOBLE de la frecuencia del vaivén, porque hay DOS
     pisadas por ciclo; a la misma frecuencia el cuerpo cojea */
  p.alt = -Math.abs(c) * 0.055 * k;
  p.pelY = -s * 0.16 * k;         // la cadera bascula…
  p.troY = s * 0.13 * k;          // …y el tronco gira al revés
  p.pelZ = c * 0.045 * k;
  p.pecX = -0.10 * k - Math.abs(c) * 0.05 * k;
  p.cueX = 0.09 * k;              // la cabeza compensa el rebote
}
POSE.camina = (p, t, v) => poseAndar(p, t, 0.62);
POSE.corre = (p, t, v) => {
  poseAndar(p, t, 1.0);
  p.pecX -= 0.16; p.cueX += 0.13;   // inclinado hacia adelante
  p.troX = -0.10;
};

/* el combo: cada golpe es CARGA (se junta) → ACTIVO (el latigazo) → FIN
   (la recuperación). `u` va de 0 a 1 sobre el golpe entero.                */
function poseTajo(p, u, lado, alto) {
  poseCero(p);
  const car = 0.28, act = 0.46;
  let k;
  if (u < car) k = -suav(u / car);                       // atrás
  else if (u < act) k = mez(-1, 1, suav((u - car) / (act - car)));
  else k = mez(1, 0, suav((u - act) / (1 - act)));
  const s = lado;
  p.pelY = -k * 0.42 * s; p.troY = -k * 0.34 * s; p.pecY = -k * 0.30 * s;
  p.cueY = k * 0.30 * s;                                 // mira lo que corta
  p.pecX = -0.10 - k * 0.14;
  p.hDX = 0.05 - 0.30 - k * 1.15 - alto * 0.55;
  p.hDZ = -0.16 - 0.50 * (1 - k) * s;
  p.aDX = -0.28 - 0.90 * (1 - Math.abs(k)) - 0.15;
  p.hIX = 0.05 + k * 0.42; p.hIZ = 0.16 + 0.30;
  p.aIX = -0.28 - 0.70;
  p.mIX = -k * 0.30 * s * 0.4; p.mDX = k * 0.30 * s * 0.4;
  p.alt = -Math.abs(k) * 0.045;
}
POSE.golpe0 = (p, u) => poseTajo(p, u, +1, 0);
POSE.golpe1 = (p, u) => poseTajo(p, u, -1, 0);
/* el tercero es de arriba abajo y no de costado: si los tres fueran el mismo
   tajo espejado, el remate no se leería como remate */
POSE.golpe2 = (p, u) => {
  poseCero(p);
  const car = 0.36, act = 0.54;
  let k;
  if (u < car) k = -suav(u / car);
  else if (u < act) k = mez(-1, 1, suav((u - car) / (act - car)));
  else k = mez(1, 0, suav((u - act) / (1 - act)));
  p.pecX = -0.14 + k * 0.52;
  p.troX = k * 0.24;
  p.cueX = 0.10 - k * 0.20;
  p.hDX = 0.05 - 1.05 - k * 1.95;   // de por encima de la cabeza al piso
  p.hDZ = -0.16 - 0.12;
  p.hIX = 0.05 - 0.85 - k * 1.55; p.hIZ = 0.16 + 0.12;
  p.aDX = -0.10 - Math.max(0, -k) * 0.55;
  p.aIX = -0.10 - Math.max(0, -k) * 0.55;
  p.mIX = -0.22 - k * 0.16; p.mDX = 0.30 + k * 0.10;
  p.pIX = 0.30; p.pDX = 0.16;
  p.alt = -0.06 - Math.max(0, k) * 0.16;
};

/* esquive: se agacha y se tira; el cuerpo se cierra, que es lo único que lo
   distingue de "caminar rápido" en un cuadro suelto */
POSE.esquiva = (p, u) => {
  poseCero(p);
  const k = Math.sin(u * Math.PI);
  p.alt = -k * 0.42;
  p.pecX = -k * 0.95; p.troX = -k * 0.30; p.cueX = k * 0.75;
  p.mIX = k * 1.20; p.mDX = k * 0.95;
  p.pIX = k * 1.55; p.pDX = k * 1.30;
  p.hIX = 0.05 - k * 0.75; p.hDX = 0.05 - k * 0.60;
  p.aIX = -0.28 - k * 1.35; p.aDX = -0.28 - k * 1.20;
};

/* recibir: el tronco se va para atrás y los brazos se abren. Dura poco y por
   eso vale la pena que sea grande — un cuadro y medio de lectura */
POSE.dano = (p, u) => {
  poseCero(p);
  const k = Math.sin(Math.min(1, u) * Math.PI);
  p.pecX = k * 0.55; p.troX = k * 0.28; p.cueX = -k * 0.42;
  p.hIX = 0.05 + k * 0.85; p.hDX = 0.05 + k * 0.70;
  p.hIZ = 0.16 + k * 0.45; p.hDZ = -0.16 - k * 0.45;
  p.aIX = -0.28 - k * 0.35; p.aDX = -0.28 - k * 0.35;
  p.alt = -k * 0.10; p.pIX = k * 0.30; p.pDX = k * 0.22;
};

/* morirse: se DESARMA. Se le va la altura, se le abren las piernas y la
   cabeza cae al final — un fundido a invisible se lee a error de dibujo */
POSE.muere = (p, u) => {
  poseCero(p);
  const k = suav(Math.min(1, u));
  p.alt = -k * 1.05;
  p.pelX = k * 0.35; p.pecX = k * 0.95; p.troX = k * 0.55;
  p.cueX = -k * 0.30 + suav(Math.max(0, (u - 0.55) / 0.45)) * 1.35;
  p.mIX = -k * 1.45; p.mDX = -k * 1.15;
  p.pIX = k * 1.85; p.pDX = k * 1.55;
  p.hIX = 0.05 + k * 1.75; p.hDX = 0.05 + k * 1.55;
  p.hIZ = 0.16 + k * 0.60; p.hDZ = -0.16 - k * 0.60;
  p.pelZ = k * 0.42;
};

/* la carga del esqueleto: levanta el arma y SE QUEDA. El aviso es lo que
   hace justa la pelea, así que tiene que durar y verse desde atrás */
POSE.carga = (p, u) => {
  poseCero(p);
  const k = suav(Math.min(1, u));
  p.hDX = 0.05 - k * 2.35; p.hDZ = -0.16 - k * 0.30;
  p.aDX = -0.28 + k * 0.20;
  p.pecX = -k * 0.20; p.troY = k * 0.28; p.pelY = k * 0.20;
  p.cueX = k * 0.14;
  p.hIX = 0.05 - k * 0.55; p.hIZ = 0.16 + k * 0.42;
  p.alt = -k * 0.06;
};
POSE.tajo = (p, u) => poseTajo(p, u, +1, 0.35);

/* ── LA MEZCLA ─────────────────────────────────────────────────────────────
   Un corte entre dos poses se ve aunque el bicho esté a veinte metros. La
   mezcla es promediar las dos evaluaciones, que es todo lo que un crossfade
   es cuando las poses son funciones.                                       */
const _PA = poseCero({}), _PB = poseCero({});
function poseAplica(cuerpo, nom, arg, nom2, arg2, k) {
  POSE[nom](_PA, arg || 0);
  if (nom2 && k > 0.001) {
    POSE[nom2](_PB, arg2 || 0);
    for (const q in _PA) _PA[q] = mez(_PA[q], _PB[q], k);
  }
  const h = cuerpo.h, p = _PA;
  h.pelvis.position.y = cuerpo.baseY + p.alt;
  h.pelvis.rotation.set(p.pelX, p.pelY, p.pelZ);
  h.torso.rotation.set(p.troX, p.troY, p.troZ);
  h.pecho.rotation.set(p.pecX, p.pecY, p.pecZ);
  h.cuello.rotation.set(p.cueX, p.cueY, 0);
  h.hombroI.rotation.set(p.hIX, p.hIY, p.hIZ);
  h.hombroD.rotation.set(p.hDX, p.hDY, p.hDZ);
  h.anteI.rotation.x = p.aIX; h.anteD.rotation.x = p.aDX;
  h.musloI.rotation.x = p.mIX; h.musloD.rotation.x = p.mDX;
  h.pantI.rotation.x = p.pIX; h.pantD.rotation.x = p.pDX;
}

/* ── LA ZANCADA SE MIDE SOBRE EL PROPIO CICLO ──────────────────────────────
   `pasos/s = velocidad ÷ zancada`, y la zancada la trae la ANIMACIÓN: es
   cuánto barre el pie hacia atrás mientras está apoyado, por dos pasos que
   hay en un ciclo. Con un número escrito al lado, el pie patina en cuanto se
   toca la amplitud del ciclo — y eso no falla, se ve.                      */
const PASO_M = {};
function midePaso(nom) {
  const c = armaCuerpo(recetaHeroe());
  let mn = 1e9, mx = -1e9;
  const v = new THREE.Vector3();
  for (let i = 0; i <= 48; i++) {
    poseAplica(c, nom, i / 48 * Math.PI * 2, null, 0, 0);
    c.raiz.position.set(0, 0, 0); c.raiz.rotation.y = 0;
    c.raiz.updateMatrixWorld(true);
    v.set(0, -0.44, 0).applyMatrix4(c.h.pantI.matrixWorld);
    mn = Math.min(mn, v.z); mx = Math.max(mx, v.z);
  }
  return (mx - mn) * 2;          // dos pasos por ciclo
}
function midePasos() { PASO_M.camina = midePaso('camina'); PASO_M.corre = midePaso('corre'); }
/* la zancada de AHORA sale de mezclar las dos con la misma `k` con la que se
   mezclan las poses: si no, al pasar de caminar a correr el pie patina justo
   en la transición, que es cuando más se mira */
function zancada(k) { return mez(PASO_M.camina || 1.35, PASO_M.corre || 2.04, lim(k, 0, 1)); }
