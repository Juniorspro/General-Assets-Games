
/* ══════════════════════════════════════════════════════════════════════════
   E · EL DIBUJO
   Camara ortografica isometrica, el diorama en una sola malla con la oclusion
   HORNEADA EN LOS VERTICES, y los mecanismos aparte porque se mueven.
   ══════════════════════════════════════════════════════════════════════════ */

let REN, ESC, CAM, LUZ, DIO = null;
let CAM_YAW = CAM_YAW_0, CAM_EL = CAM_EL_0;
let ENC_W = 10, ENC_H = 10;        /* medio ancho y medio alto del encuadre */
let ANCHO = 412, ALTO = 892;

/* ── LAS PALETAS: LO MISMO CON OTRA LUZ ───────────────────────────────────
   Un tinte sobre los colores de bloque y el mismo tinte en el degradado del
   fondo, asi que el cielo y el diorama pertenecen al mismo sitio. No cambia
   una sola regla: cambia que el nivel 9 no se vea igual que el 3.          */
const PALETAS = [
  { t: 0xffffff, k: 0.00, cielo: ['#a9cadd', '#cbdfe9', '#e6eee9', '#efeee6'] },
  { t: 0xffd7ad, k: 0.22, cielo: ['#e6b489', '#f0cfa8', '#f7e4c8', '#f6ecd8'] },
  { t: 0xbdd9f5, k: 0.20, cielo: ['#8fb4d4', '#b7d0e2', '#dbe7ee', '#e9eef0'] },
  { t: 0xd3f0c8, k: 0.16, cielo: ['#a5c8b4', '#c6dcc9', '#e2ecdd', '#eef0e6'] },
];

/* ── LAS SEIS CARAS, CON SUS EJES ─────────────────────────────────────────
   `u × w = n` en las seis, asi que la tira (o, o+u, o+u+w, o+w) sale con la
   normal hacia afuera SIEMPRE y no hay que acordarse del sentido cara por
   cara — que es de donde salen los agujeros negros en una malla de voxeles. */
const CARAS = [
  { n: [ 1, 0, 0], o: [1, 0, 0], u: [0, 1, 0], w: [0, 0, 1] },
  { n: [-1, 0, 0], o: [0, 0, 0], u: [0, 0, 1], w: [0, 1, 0] },
  { n: [ 0, 1, 0], o: [0, 1, 0], u: [0, 0, 1], w: [1, 0, 0] },
  { n: [ 0,-1, 0], o: [0, 0, 0], u: [1, 0, 0], w: [0, 0, 1] },
  { n: [ 0, 0, 1], o: [0, 0, 1], u: [1, 0, 0], w: [0, 1, 0] },
  { n: [ 0, 0,-1], o: [0, 0, 0], u: [0, 1, 0], w: [1, 0, 0] },
];
/* CUATRO ESCALONES DE OCLUSION Y NO UNA SOMBRA CONTINUA: la oclusion de un
   voxel sale de contar vecinos, o sea que hay exactamente cuatro casos. Y es
   lo unico que hace que un rincon se lea como un rincon con una sola luz. */
const AO_F = [0.50, 0.69, 0.86, 1.00];

/* ── LA JUNTA ENTRE BLOQUES ───────────────────────────────────────────────
   La oclusion sola no alcanza: una pared lisa de cuatro bloques no tiene
   ocluyentes en ninguna esquina, asi que sale de un color parejo y se lee a
   UNA caja de cuatro de alto. Y en este juego contar bloques ES el juego —
   se sube uno y se cae tres—, o sea que no poder contarlos no es un problema
   de estilo.
   Un mapa de 32 pixeles con el borde oscuro, estirado sobre CADA cara, pone
   la junta donde va y no cuesta un solo triangulo. Va en espacio LINEAL a
   proposito: es un multiplicador, no un color, asi que 0,86 tiene que llegar
   al shader como 0,86 y no convertido.                                     */
let TEX_TEJA = null;
function texTeja() {
  if (TEX_TEJA) return TEX_TEJA;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = 'rgba(0,0,0,.19)'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 31, 32, 1);
  g.fillRect(0, 0, 1, 32); g.fillRect(31, 0, 1, 32);
  g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(1, 1, 30, 1); g.fillRect(1, 30, 30, 1);
  g.fillRect(1, 1, 1, 30); g.fillRect(30, 1, 1, 30);
  TEX_TEJA = new T.CanvasTexture(c);
  TEX_TEJA.colorSpace = T.LinearSRGBColorSpace;
  TEX_TEJA.anisotropy = 4;
  return TEX_TEJA;
}

/* mete una caja con normales planas en los arreglos. La usan la escalera y
   los rieles: geometria chica que no vale una malla propia cada una.       */
function empujaCaja(A, cx, cy, cz, sx, sy, sz, col) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  for (const f of CARAS) {
    const ox = cx + f.o[0] * sx - hx, oy = cy + f.o[1] * sy - hy, oz = cz + f.o[2] * sz - hz;
    const ux = f.u[0] * sx, uy = f.u[1] * sy, uz = f.u[2] * sz;
    const wx = f.w[0] * sx, wy = f.w[1] * sy, wz = f.w[2] * sz;
    const b = A.p.length / 3;
    A.p.push(ox, oy, oz, ox + ux, oy + uy, oz + uz,
             ox + ux + wx, oy + uy + wy, oz + uz + wz, ox + wx, oy + wy, oz + wz);
    for (let k = 0; k < 4; k++) { A.n.push(f.n[0], f.n[1], f.n[2]); A.c.push(col.r, col.g, col.b); }
    A.u.push(0, 0, 1, 0, 1, 1, 0, 1);
    A.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
}

/* ── LA MALLA DE UN MONTON DE BLOQUES ─────────────────────────────────────
   Una sola geometria para todo lo que no se mueve: con un `Mesh` por bloque,
   un diorama de doscientos bloques son doscientas llamadas de dibujo para
   cubos que ni siquiera se mueven.                                         */
function geoBloques(lista, ocupa, tinte, kt, blanco) {
  const A = { p: [], n: [], c: [], u: [], i: [] };
  const cbase = new T.Color(), ct = new T.Color(tinte);
  for (const b of lista) {
    const B = BLOQ[b.t];
    /* un tono por bloque, chiquito: sin esto una pared de veinte ladrillos
       iguales se lee a una lamina de un solo color y no a veinte ladrillos */
    const h = ((b.x * 73856093) ^ (b.y * 19349663) ^ (b.z * 83492791)) >>> 0;
    const jit = 1 + ((h % 1000) / 1000 - 0.5) * 0.075;
    for (const f of CARAS) {
      const ax = b.x + f.n[0], ay = b.y + f.n[1], az = b.z + f.n[2];
      if (ocupa(ax, ay, az)) continue;                 /* cara tapada: no existe */
      if (blanco) cbase.setRGB(1, 1, 1);
      else { cbase.setHex(f.n[1] === 1 ? B.top : B.col); if (kt > 0) cbase.lerp(ct, kt); }
      const cr = cbase.r * jit, cg = cbase.g * jit, cb = cbase.b * jit;
      const ao = [];
      for (let q = 0; q < 4; q++) {
        const a = (q === 1 || q === 2) ? 1 : -1, w = (q === 2 || q === 3) ? 1 : -1;
        const s1 = ocupa(ax + f.u[0] * a, ay + f.u[1] * a, az + f.u[2] * a) ? 1 : 0;
        const s2 = ocupa(ax + f.w[0] * w, ay + f.w[1] * w, az + f.w[2] * w) ? 1 : 0;
        const co = ocupa(ax + f.u[0] * a + f.w[0] * w, ay + f.u[1] * a + f.w[1] * w,
                         az + f.u[2] * a + f.w[2] * w) ? 1 : 0;
        ao.push(AO_F[(s1 && s2) ? 0 : 3 - (s1 + s2 + co)]);
      }
      const bi = A.p.length / 3;
      const ox = b.x + f.o[0], oy = b.y + f.o[1], oz = b.z + f.o[2];
      A.p.push(ox, oy, oz,
               ox + f.u[0], oy + f.u[1], oz + f.u[2],
               ox + f.u[0] + f.w[0], oy + f.u[1] + f.w[1], oz + f.u[2] + f.w[2],
               ox + f.w[0], oy + f.w[1], oz + f.w[2]);
      for (let q = 0; q < 4; q++) {
        A.n.push(f.n[0], f.n[1], f.n[2]);
        A.c.push(cr * ao[q], cg * ao[q], cb * ao[q]);
      }
      /* UNA UV POR CARA Y NO POR BLOQUE: el mapa de teja se estira sobre cada
         cara suelta, asi que la junta cae exactamente en el borde del bloque
         sea cual sea el tamano del diorama. */
      A.u.push(0, 0, 1, 0, 1, 1, 0, 1);
      /* LA DIAGONAL SE DA VUELTA CUANDO CONVIENE: con la diagonal fija, un
         rincon en el que dos esquinas opuestas estan ocluidas sale con un
         pliegue torcido que se ve como un error de malla y no como sombra. */
      if (ao[0] + ao[2] > ao[1] + ao[3]) A.i.push(bi + 1, bi + 2, bi + 3, bi + 1, bi + 3, bi);
      else A.i.push(bi, bi + 1, bi + 2, bi, bi + 2, bi + 3);
    }
  }
  return armaGeo(A);
}
function armaGeo(A) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(A.p, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(A.n, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(A.c, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(A.u, 2));
  /* Uint32 y no Uint16: un diorama grande pasa de 65.535 vertices y el
     desborde no avisa — dibuja triangulos que apuntan a cualquier lado. */
  g.setIndex(new T.Uint32BufferAttribute(A.i, 1));
  g.computeBoundingSphere();
  return g;
}

/* ══════════════════════ EL ESCENARIO ══════════════════════ */
function escInit() {
  REN = new T.WebGLRenderer({ canvas: $('cv'), antialias: true, alpha: true });
  /* `info` SE PONE A CERO AL EMPEZAR CADA `render()`, Y LA SOMBRA ES OTRA
     PASADA DENTRO DE LA MISMA LLAMADA: leyendolo sin apagar el reset, lo que
     queda es solo la ultima pasada y apagar las sombras PARECE no cambiar
     nada. Medido: las tres calidades daban 12 llamadas y 224 triangulos.
     Ya habia costado una medicion en Z Force.                              */
  REN.info.autoReset = false;
  REN.setClearColor(0x000000, 0);          /* el fondo lo pone el CSS */
  REN.outputColorSpace = T.SRGBColorSpace;
  REN.shadowMap.type = T.PCFSoftShadowMap;
  ESC = new T.Scene();
  CAM = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 220);

  /* EL HEMISFERICO NO PUEDE TENER EL SUELO NEGRO: reparte segun hacia donde
     mira cada cara, asi que con el suelo en negro toda cara que mire para
     abajo recibe CERO y la panza del diorama desaparece.                   */
  ESC.add(new T.HemisphereLight(0xd6e8f2, 0x6e6b60, 0.78));
  LUZ = new T.DirectionalLight(0xfff2dd, 1.06);
  LUZ.position.set(17, 30, 13);
  ESC.add(LUZ); ESC.add(LUZ.target);
  aplicaCalidad();
}

function aplicaCalidad() {
  const C = CALIDADES[PROG.cal] || CALIDADES.media;
  REN.setPixelRatio(Math.min(window.devicePixelRatio || 1, C.px));
  REN.shadowMap.enabled = C.sombra > 0;
  if (C.sombra > 0) {
    LUZ.castShadow = true;
    /* LA TEXTURA VIEJA HAY QUE SOLTARLA A MANO: three no la recrea porque
       cambie `mapSize`, se queda con la de antes y el ajuste no hace nada. */
    if (LUZ.shadow.map) { LUZ.shadow.map.dispose(); LUZ.shadow.map = null; }
    LUZ.shadow.mapSize.set(C.sombra, C.sombra);
    LUZ.shadow.bias = -0.0012;
    LUZ.shadow.normalBias = 0.03;
  } else LUZ.castShadow = false;
  if (DIO) ajustaSombra();
  REN.shadowMap.needsUpdate = true;
}

/* ── EL ENCUADRE SE MIDE SOBRE DIECISEIS ANGULOS Y NO SOBRE EL DE AHORA ───
   Midiendo la silueta del angulo actual, el diorama se agranda y se achica
   mientras uno lo gira: parece que la camara hace zoom sola. Tomando el peor
   de una vuelta entera, el tamano queda quieto — y sigue siendo mucho mas
   ajustado que la esfera envolvente, que con una caja de 14x12x14 daria un
   encuadre casi del doble.                                                */
function midePeorEncuadre(el) {
  if (!DIO) return;
  const bb = DIO.caja, cy = (bb.min[1] + bb.max[1]) / 2;
  let mw = 0, mh = 0;
  for (let k = 0; k < 16; k++) {
    const yaw = k * Math.PI / 8;
    const dx = Math.cos(el) * Math.sin(yaw), dy = Math.sin(el), dz = Math.cos(el) * Math.cos(yaw);
    /* LA BASE DE LA CAMARA TAL COMO LA ARMA `lookAt`, y no una inventada: z
       es `d` (de la mira hacia la camara), x = normalizar(cross(arriba, z)) y
       recien de ahi sale y = cross(z, x). Escribiendo la Y a ojo el encuadre
       queda medido sobre otra camara que la que despues dibuja. */
    let rx = dz, rz = -dx;                      /* cross([0,1,0], d), con ry=0 */
    const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    const ax = dy * rz, ay = dz * rx - dx * rz, az = -dy * rx;   /* cross(d, r) */
    for (let i = 0; i < 8; i++) {
      const px = (i & 1 ? bb.max[0] : bb.min[0]) + DIO.ox;
      const py = (i & 2 ? bb.max[1] : bb.min[1]) - cy;
      const pz = (i & 4 ? bb.max[2] : bb.min[2]) + DIO.oz;
      const cx = px * rx + pz * rz;
      const cyv = px * ax + py * ay + pz * az;
      if (Math.abs(cx) > mw) mw = Math.abs(cx);
      if (Math.abs(cyv) > mh) mh = Math.abs(cyv);
    }
  }
  ENC_W = mw * 1.06; ENC_H = mh * 1.16;
  DIO.mira = cy;
  DIO.radio = Math.hypot(mw, mh);
}
function encuadra() {
  const a = ANCHO / ALTO;
  let hw = ENC_W, hh = ENC_H;
  if (hw / hh > a) hh = hw / a; else hw = hh * a;
  CAM.left = -hw; CAM.right = hw; CAM.top = hh; CAM.bottom = -hh;
  CAM.near = 0.5; CAM.far = CAM_DIST * 2.6;
  CAM.updateProjectionMatrix();
}
function ponCam() {
  const cy = DIO ? DIO.mira : 4;
  const dx = Math.cos(CAM_EL) * Math.sin(CAM_YAW), dy = Math.sin(CAM_EL),
        dz = Math.cos(CAM_EL) * Math.cos(CAM_YAW);
  CAM.position.set(dx * CAM_DIST, cy + dy * CAM_DIST, dz * CAM_DIST);
  CAM.up.set(0, 1, 0);
  CAM.lookAt(0, cy, 0);
  CAM.updateMatrixWorld();
}
function medir() {
  const m = $('marco').getBoundingClientRect();
  ANCHO = Math.max(1, Math.round(m.width)); ALTO = Math.max(1, Math.round(m.height));
  /* `--mw` es el ANCHO DEL MARCO y no `vw`: en apaisado el marco es una
     columna angosta y `vw` es la ventana entera, o sea que el titulo se
     saldria de la columna. */
  document.documentElement.style.setProperty('--mw', ANCHO + 'px');
  REN.setSize(ANCHO, ALTO, false);
  encuadra(); ponCam();
}

/* la caja de sombra se ajusta al diorama: con una del tamano del mundo, la
   resolucion del mapa se reparte sobre metros que no se ven y el contorno
   de la sombra sale hecho un peine */
function ajustaSombra() {
  if (!LUZ.castShadow || !DIO) return;
  const r = DIO.radio * 1.12, cy = DIO.mira;
  LUZ.position.set(17, 30 + cy, 13);
  LUZ.target.position.set(0, cy, 0); LUZ.target.updateMatrixWorld();
  const s = LUZ.shadow.camera;
  s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.near = 1; s.far = 90;
  s.updateProjectionMatrix();
}

/* ══════════════════════ EL DIORAMA ══════════════════════ */
function soltaDiorama() {
  if (!DIO) return;
  DIO.grupo.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
  ESC.remove(DIO.grupo);
  DIO = null;
}

function construyeDiorama(M) {
  soltaDiorama();
  const grupo = new T.Group();
  const pal = PALETAS[(M.paleta || 0) % PALETAS.length];

  /* lo que ocluye y tapa caras: los bloques enteros del mundo BASE. Los
     mecanismos NO entran — se mueven, asi que hornear su oclusion en la malla
     estatica seria hornear una sombra que despues no esta donde se dibujo. */
  const lleno = t => t !== VACIO && !BLOQ[t].fina && !BLOQ[t].vidrio;
  const ocupaOp = (x, y, z) => lleno(tipoBase(M, x, y, z));
  const ocupaVi = (x, y, z) => { const t = tipoBase(M, x, y, z); return t !== VACIO && !BLOQ[t].fina; };

  const op = [], vi = [], esc = [];
  const bb = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
  const met = c => { for (let k = 0; k < 3; k++) { if (c[k] < bb.min[k]) bb.min[k] = c[k]; if (c[k] + 1 > bb.max[k]) bb.max[k] = c[k] + 1; } };
  for (let y = 0; y < M.ny; y++) for (let z = 0; z < M.nz; z++) for (let x = 0; x < M.nx; x++) {
    const t = tipoBase(M, x, y, z);
    if (t === VACIO) continue;
    met([x, y, z]);
    if (t === ESCALERA) esc.push({ x, y, z });
    else if (BLOQ[t].vidrio) vi.push({ x, y, z, t });
    else op.push({ x, y, z, t });
  }
  for (const m of M.mec) for (const c of m.cel) { met(c); met([c[0] + m.dir[0] * m.pasos, c[1] + m.dir[1] * m.pasos, c[2] + m.dir[2] * m.pasos]); }
  if (bb.min[0] > bb.max[0]) { bb.min = [0, 0, 0]; bb.max = [M.nx, M.ny, M.nz]; }

  /* EL DIORAMA SE CENTRA EN SUS BLOQUES Y NO EN LA REJA. La camara mira al
     origen, asi que centrando en la reja —que casi nunca esta llena— la mitad
     del encuadre es aire: medido en el nivel 0, con la reja de 10x8x10 y los
     bloques ocupando 2x4x3, el diorama ocupaba el 25,7% del ancho del cuadro.
     Y no se puede hacer antes de recorrer la reja, porque la caja de los
     bloques es justamente lo que se acaba de medir.                        */
  const ox = -(bb.min[0] + bb.max[0]) / 2, oz = -(bb.min[2] + bb.max[2]) / 2;
  grupo.position.set(ox, 0, oz);

  const matOp = new T.MeshLambertMaterial({ vertexColors: true, map: texTeja() });
  const mOp = new T.Mesh(geoBloques(op, ocupaOp, pal.t, pal.k), matOp);
  mOp.castShadow = true; mOp.receiveShadow = true;
  grupo.add(mOp);

  let mVi = null;
  if (vi.length) {
    mVi = new T.Mesh(geoBloques(vi, ocupaVi, pal.t, pal.k),
      new T.MeshLambertMaterial({ vertexColors: true, map: texTeja(), transparent: true, opacity: 0.42 }));
    mVi.receiveShadow = true;
    grupo.add(mVi);
  }

  /* LA ESCALERA NO ES UN CUBO: si se dibujara llena, la unica cosa del juego
     que se atraviesa se veria como una pared. Un poste con travesanos dice
     «esto se trepa» sin una linea de reglas nueva.                         */
  let mEsc = null;
  if (esc.length) {
    const A = { p: [], n: [], c: [], u: [], i: [] };
    const cE = new T.Color(BLOQ[ESCALERA].col);
    if (pal.k > 0) cE.lerp(new T.Color(pal.t), pal.k);
    for (const c of esc) {
      empujaCaja(A, c.x + 0.5, c.y + 0.5, c.z + 0.5, 0.15, 1.0, 0.15, cE);
      for (const dy of [0.22, 0.55, 0.88])
        empujaCaja(A, c.x + 0.5, c.y + dy, c.z + 0.5, 0.62, 0.085, 0.085, cE);
    }
    mEsc = new T.Mesh(armaGeo(A), new T.MeshLambertMaterial({ vertexColors: true }));
    mEsc.castShadow = true; mEsc.receiveShadow = true;
    grupo.add(mEsc);
  }

  /* ── LOS MECANISMOS ───────────────────────────────────────────────────
     Naranja, que es el unico color de todo el diorama que no le toca a nada
     mas: cual es la pieza que se toca tiene que leerse de una ojeada y sin
     un rotulo. Y cada uno lleva su RIEL, que dice hasta donde llega — sin
     eso, tocarla es una apuesta.                                          */
  const mecs = [];
  const cMec = new T.Color(0xe08a34), cRiel = new T.Color(0x5b6670);
  for (let i = 0; i < M.mec.length; i++) {
    const m = M.mec[i];
    const g = new T.Group();
    const lista = m.cel.map(c => ({ x: c[0], y: c[1], z: c[2], t: m.bloq }));
    const set = new Set(m.cel.map(c => c[0] + ',' + c[1] + ',' + c[2]));
    const oc = (x, y, z) => set.has(x + ',' + y + ',' + z);
    /* LA GEOMETRIA SALE BLANCA Y EL COLOR LO PONE EL MATERIAL: three
       multiplica `material.color x vertexColor`, asi que con el color del
       bloque tambien en los vertices la pieza saldria color barro. Blanca,
       lo que viaja en los vertices es SOLO la oclusion, y el naranja la
       hereda con sus pliegues puestos. */
    const geo = geoBloques(lista, oc, 0xffffff, 0, true);
    const ml = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, map: texTeja(), color: cMec }));
    ml.castShadow = true; ml.receiveShadow = true;
    ml.userData.mec = i;
    g.add(ml);
    grupo.add(g);

    const A = { p: [], n: [], c: [], u: [], i: [] };
    for (const c of m.cel) {
      const cx = c[0] + 0.5, cy = c[1] + 0.5, cz = c[2] + 0.5;
      const lx = m.dir[0] * m.pasos, ly = m.dir[1] * m.pasos, lz = m.dir[2] * m.pasos;
      if (m.dir[1] !== 0) {
        empujaCaja(A, cx, cy + ly / 2, cz, 0.17, Math.abs(ly) + 0.17, 0.17, cRiel);
      } else {
        /* el riel horizontal cuelga por DEBAJO de la losa: adentro no se
           veria nunca, y el hueco es vacio hasta abajo, asi que ahi si */
        empujaCaja(A, cx + lx / 2, c[1] - 0.06, cz + lz / 2,
          Math.abs(lx) + 0.30, 0.12, Math.abs(lz) + 0.30, cRiel);
      }
    }
    const mr = new T.Mesh(armaGeo(A), new T.MeshLambertMaterial({ vertexColors: true }));
    mr.receiveShadow = true;
    grupo.add(mr);
    mecs.push({ g, malla: ml, dir: m.dir, eVis: 0 });
  }

  /* la meta: el bloque ya es dorado, pero a la distancia a la que se mira un
     diorama un color no alcanza. El rombo flotando es lo que dice «aca» */
  const metaG = new T.Group();
  metaG.position.set(M.meta[0] + 0.5, M.meta[1] + 0.62, M.meta[2] + 0.5);
  const rombo = new T.Mesh(new T.OctahedronGeometry(0.20),
    new T.MeshBasicMaterial({ color: 0xf3bb3e, toneMapped: false }));
  metaG.add(rombo);
  grupo.add(metaG);

  /* la marca del destino: un cuadro fino en el piso de la celda a la que el
     robot va. Un toque que no produce nada visible se lee a toque perdido. */
  const marA = { p: [], n: [], c: [], u: [], i: [] };
  const cMar = new T.Color(0xffffff);
  for (const [a, b, sx, sz] of [[0, -0.44, 0.88, 0.08], [0, 0.44, 0.88, 0.08],
                                [-0.44, 0, 0.08, 0.88], [0.44, 0, 0.08, 0.88]])
    empujaCaja(marA, a, 0.03, b, sx, 0.05, sz, cMar);
  const marca = new T.Mesh(armaGeo(marA),
    new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, toneMapped: false }));
  marca.visible = false;
  grupo.add(marca);

  ESC.add(grupo);
  DIO = { M, grupo, ox, oz, caja: bb, mOp, mVi, mEsc, mecs, metaG, rombo, marca, marT: 0,
          mira: 0, radio: 8, pal,
          blancos: [mOp, mEsc, mVi].filter(Boolean).concat(mecs.map(o => o.malla)) };
  midePeorEncuadre(CAM_EL);
  encuadra(); ponCam(); ajustaSombra();
  fondoDe(pal);
  for (let i = 0; i < mecs.length; i++) mecPone(i, 0);
  return DIO;
}
function fondoDe(pal) {
  $('marco').style.background = 'linear-gradient(180deg,' + pal.cielo[0] + ' 0%,' +
    pal.cielo[1] + ' 42%,' + pal.cielo[2] + ' 78%,' + pal.cielo[3] + ' 100%)';
}
function mecPone(i, e) {
  const o = DIO.mecs[i]; if (!o) return;
  o.eVis = e;
  o.g.position.set(o.dir[0] * e, o.dir[1] * e, o.dir[2] * e);
}

/* ── DE LA REJA AL MUNDO Y DE VUELTA ──────────────────────────────────────
   Una sola pareja de funciones para los dos sentidos: con dos cuentas
   sueltas, el robot se dibuja en un sitio y el dedo apunta a otro.        */
function posDe(x, y, z) { return new T.Vector3(x + 0.5 + DIO.ox, y, z + 0.5 + DIO.oz); }

const RAY = new T.Raycaster();
const NDC = new T.Vector2();
function tocaEn(cx, cy) {
  if (!DIO) return null;
  /* LAS MATRICES SE PONEN AL DIA ACA Y NO SE HEREDAN DEL ULTIMO DIBUJO: three
     las recalcula al renderizar, asi que un rayo tirado antes del primer
     cuadro —o desde una sonda que no dibuja— apunta a donde estaban las cosas
     antes. Ya costo una vuelta en ROTOR. */
  ESC.updateMatrixWorld(true);
  const r = $('cv').getBoundingClientRect();
  NDC.x = ((cx - r.left) / r.width) * 2 - 1;
  NDC.y = -((cy - r.top) / r.height) * 2 + 1;
  RAY.setFromCamera(NDC, CAM);
  const hs = RAY.intersectObjects(DIO.blancos, false);
  if (!hs.length) return null;
  const h = hs[0];
  const n = h.face.normal.clone();
  /* el grupo del mecanismo solo se TRASLADA, asi que la normal local ya es la
     del mundo; igual se transforma, que es lo correcto y cuesta nada */
  n.transformDirection(h.object.matrixWorld).round();
  const p = h.point.clone().sub(DIO.grupo.position);
  /* medio bloque HACIA ADENTRO desde el punto de impacto cae siempre en el
     centro de la celda tocada, sea cual sea la cara */
  const cel = [Math.floor(p.x - n.x * 0.5), Math.floor(p.y - n.y * 0.5), Math.floor(p.z - n.z * 0.5)];
  return { cel, n: [n.x, n.y, n.z], mec: h.object.userData.mec != null ? h.object.userData.mec : -1 };
}

function marcaEn(cel) {
  if (!DIO) return;
  DIO.marca.position.set(cel[0] + 0.5, cel[1], cel[2] + 0.5);
  DIO.marca.visible = true; DIO.marT = 0.55;
}

/* ── LA ORBITA ────────────────────────────────────────────────────────────
   La elevacion esta topada arriba y abajo: por debajo del minimo se ve el
   diorama de canto y no se distingue una altura de otra; por encima se ve de
   arriba y desaparece justo lo que este juego tiene, que es el alto.      */
function giraCam(dx, dy) {
  CAM_YAW -= dx * 0.0075;
  const e0 = CAM_EL;
  CAM_EL = cl(CAM_EL + dy * 0.0055, CAM_EL_MIN, CAM_EL_MAX);
  if (Math.abs(CAM_EL - e0) > 1e-6) { midePeorEncuadre(CAM_EL); encuadra(); }
  ponCam();
}

function escPaso(dt) {
  if (!DIO) return;
  DIO.rombo.rotation.y += dt * 1.7;
  DIO.metaG.position.y = DIO.M.meta[1] + 0.62 + Math.sin(performance.now() * 0.0026) * 0.09;
  if (DIO.marT > 0) {
    DIO.marT -= dt;
    DIO.marca.material.opacity = cl(DIO.marT / 0.55, 0, 1) * 0.85;
    if (DIO.marT <= 0) DIO.marca.visible = false;
  }
}
function escDibuja() { REN.info.reset(); REN.render(ESC, CAM); }
function escCosto() {
  const i = REN.info.render;
  return { llamadas: i.calls, triangulos: i.triangles, cal: PROG.cal,
           px: +REN.getPixelRatio().toFixed(2), w: ANCHO, h: ALTO };
}
