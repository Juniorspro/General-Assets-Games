
/* ══════════════════════════ EL DIBUJO, EN 3D ══════════════════════════
   ── LA JUGABILIDAD SIGUE SIENDO DEL PLANO XY, Y ESO NO ES UNA CONCESION ──
   El genero ES de dos ejes: se avanza y se salta, y nada mas. Lo que pasa a ser
   tridimensional es el MUNDO — los bloques se extruyen, el cubo tumbea de verdad,
   hay luz, sombra de contacto y perspectiva. Meter el juego en tres ejes seria
   otro juego, no este mejor dibujado.

   ── LA CAMARA MIRA DERECHO POR −Z, Y ESA ES LA DECISION QUE SOSTIENE TODO ──
   Con la camara inclinada, la proyeccion deja de ser lineal y la x de un pico en
   pantalla depende de su altura: en un juego donde hay que despegar en un bloque
   exacto, eso es injugable. Mirando derecho, x e y son EXACTAMENTE lineales sobre
   el plano de juego, y el volumen igual se lee: la camara va a la altura del
   medio de la banda visible, o sea POR ENCIMA de los bloques bajos, asi que se
   les ve la cara de arriba. Es el mismo encuadre de cualquier 2,5D.

   ── Y TODO COMPARTE EL PLANO z = 0 POR DELANTE ──
   Los solidos se extruyen hacia ATRAS (z de −PROF a 0) y el jugador tambien
   (z de −0,86 a 0). Si el cubo asomara hacia la camara, la perspectiva lo
   agrandaria un 4,5 % y con el a un 30 % del ancho eso lo correria 0,18 bloques
   respecto de los picos: se veria desalineado justo donde hay que medir. */

const cv = $('cv');
let ANCHO = 0, ALTO = 0, ESC = 1, U = 20;   /* U = pixeles por bloque, para las sondas */
const PROF = 1.6;                            /* cuanto se extruyen los solidos */
/* ── EL PISO SE EXTRUYE CUARENTA Y SEIS BLOQUES Y NO 1,6 ──
   Con la camara a 2,77 de alto, una superficie horizontal de 1,6 de fondo se ve
   como una FRANJA de dos centimetros y por encima aparece cielo a la altura del
   suelo: medido en la foto, el piso era una banda y arriba de ella el horizonte
   estaba roto. Extruido hasta la niebla, el suelo se pierde en el fondo y eso es
   justamente lo que hace que la escena se lea a profunda. */
const PROF_PISO = 46;
const FOV_Y = 50;

const ren = new T.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
ren.setClearColor(0x05060a, 1);
ren.outputColorSpace = T.SRGBColorSpace;
ren.toneMapping = T.ACESFilmicToneMapping;
ren.toneMappingExposure = 1.15;
ren.shadowMap.enabled = true;
ren.shadowMap.type = T.PCFSoftShadowMap;
ren.info.autoReset = false;

const esc3 = new T.Scene();
const cam = new T.PerspectiveCamera(FOV_Y, 2, 0.1, 260);
/* mira derecho por −Z: sin rotacion, y por eso la proyeccion es lineal */
esc3.add(cam);

/* ══════════ LA LUZ ══════════
   Una direccional con sombra —que es lo unico que apoya al cubo sobre el piso— y
   un hemisferico que le pone color al ambiente. Y el hemisferico NO puede tener
   el suelo negro: una cara que no mira al cielo recibiria cero, que es lo que en
   ECO dejo un ovalo malva plano y en BARRIO las casas en silueta. */
/* ── LA SOMBRA ES UNA PISTA, NO UN AGUJERO ──
   Con la direccional a 2,1 y poco ambiente, la zona sombreada quedaba casi negra
   y en el pasillo de la nave las sombras de las paredes de arriba se leian a
   manchones sueltos sobre el piso. Bajando la direccional y subiendo el ambiente,
   una sombra oscurece a la mitad en vez de borrar: la de contacto del cubo se
   sigue viendo —que es la que importa— y las otras pasan a ser un matiz. */
const sol = new T.DirectionalLight(0xffffff, 1.45);
sol.position.set(7, 12, 9);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
sol.shadow.camera.near = 1; sol.shadow.camera.far = 60;
sol.shadow.bias = -0.0012; sol.shadow.normalBias = 0.03;
esc3.add(sol);
esc3.add(sol.target);
const hemi = new T.HemisphereLight(0x9fc8ff, 0x2a2f3d, 0.70);
esc3.add(hemi);
/* ── Y UN AMBIENTE PARO, QUE HACE FALTA POR UNA RAZON DE JUEGO ──
   En gravedad invertida se camina sobre la CARA DE ABAJO del techo, y una cara
   que mira al piso no recibe nada de una direccional de arriba: sin ambiente,
   la superficie que hay que pisar sale negra. */
const amb = new T.AmbientLight(0x4a5570, 0.95);
esc3.add(amb);
/* la niebla es densa a proposito: es lo que come el borde lejano del suelo. En el
   plano de juego (z ~ 0) no tiñe nada; a 46 bloques se lleva mas de la mitad. */
const NIEBLA = new T.FogExp2(0x101c30, 0.020);
esc3.fog = NIEBLA;

/* ══════════ LOS MATERIALES ══════════
   Uno por familia y no uno por objeto: cada material es un programa compilado y
   una llamada de dibujo. El color del tema se reescribe al cambiar de nivel. */
const matSol  = new T.MeshLambertMaterial({ color: 0x171e2d });
const matPiso = new T.MeshLambertMaterial({ color: 0x2a3448 });
const matCanto = new T.MeshBasicMaterial({ color: 0x2de2a8 });
const matPico = new T.MeshLambertMaterial({ color: 0xeef4ff, emissive: 0x7f8fa6, emissiveIntensity: 0.35 });
const matPad  = new T.MeshBasicMaterial({ color: 0xffd447 });
const matOrbe = new T.MeshBasicMaterial({ color: 0xffd447 });
const matSierra = new T.MeshLambertMaterial({ color: 0xdfe7f2, emissive: 0x445064, emissiveIntensity: 0.4 });
const matMoneda = new T.MeshLambertMaterial({ color: 0xffd447, emissive: 0x8a6a10, emissiveIntensity: 0.7 });
const matFondo = new T.MeshBasicMaterial({ color: 0x2de2a8, transparent: true, opacity: 0.055,
                                           depthWrite: false });
/* ── EL FALDON DEL SUELO VA SIN LUZ, Y ESA ES LA RAZON DE QUE EXISTA ──
   La cara de adelante del piso, con Lambert y una luz casi vertical, medida en la
   captura daba (1, 3, 7): negra. Son ochenta y cinco pixeles de los 412 —el 21 %
   de la pantalla— sin un solo dato. Un material SIN LUZ no depende del angulo ni
   de la sombra y no puede salir negro; el degradado vertical le da el aire de
   estar iluminado desde arriba, que es lo que hace que se lea a canto de terreno. */
function lienzoFaldon(){
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#8a8a8a'); gr.addColorStop(1, '#1d1d1d');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const matFaldon = new T.MeshBasicMaterial({ map: lienzoFaldon(), color: 0x3d4a63 });

const GEO = {
  caja: new T.BoxGeometry(1, 1, 1),
  /* el pico es una piramide de cuatro caras: `ConeGeometry` con cuatro lados */
  pico: new T.ConeGeometry(0.72, 1, 4, 1),
  esfera: new T.SphereGeometry(0.5, 14, 10),
  aro: new T.TorusGeometry(0.40, 0.09, 8, 18),
  sierra: new T.CylinderGeometry(0.5, 0.5, 0.28, 12),
  part: new T.BoxGeometry(1, 1, 1)
};

/* ══════════ EL CIELO Y LA REJA ══════════
   El cielo va PEGADO A LA CAMARA, asi que no tiene paralaje: es un telon. La reja
   va PLANTADA EN EL MUNDO a z = −28 y su paralaje sale de la perspectiva, gratis
   y sin un solo numero que mantener — que es justo lo que en 2D habia que escribir
   a mano con un factor 0,5. */
function lienzoCielo(){
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#3b3b3b');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const matCielo = new T.MeshBasicMaterial({ map: lienzoCielo(), depthWrite: false, fog: false });
const cielo = new T.Mesh(new T.PlaneGeometry(1, 1), matCielo);
cielo.renderOrder = -10; cielo.frustumCulled = false;
cam.add(cielo);

function lienzoReja(){
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, n, n);
  g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  g.strokeRect(0.5, 0.5, n - 1, n - 1);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}
const texReja = lienzoReja();
const matReja = new T.MeshBasicMaterial({ map: texReja, color: 0x2de2a8, transparent: true,
                                          opacity: 0.16, depthWrite: false, alphaMap: texReja });
const reja = new T.Mesh(new T.PlaneGeometry(1400, 240), matReja);
reja.position.set(600, 60, -56);
texReja.repeat.set(1400/4, 240/4);          /* una celda cada cuatro bloques: la grilla del compas */
esc3.add(reja);

/* las formas grandes del fondo: instanciadas y PLANTADAS, asi que su paralaje es
   el de verdad. La forma sale de la POSICION y no de un azar por cuadro. */
const fondo = new T.InstancedMesh(new T.PlaneGeometry(1, 1), matFondo, 240);
fondo.frustumCulled = false; fondo.castShadow = false; fondo.receiveShadow = false;
esc3.add(fondo);

/* ══════════ LAS MALLAS DEL NIVEL ══════════
   Se rearman cuando cambia el nivel, y el disparador es una REVISION que
   `generaNivel` incrementa: con una llamada explicita, el dia que se agregue un
   camino que genere un nivel (el demo del menu, una sonda) se olvida y se dibuja
   el nivel anterior. */
let REV3D = -1;
const INST = { sol: null, piso: null, canto: null, pico: null, pad: null, orbe: null,
               faldon: null };
const SUELTOS = [];                          /* sierras, monedas y portales */

function tiraInst(k){
  if (INST[k]){ esc3.remove(INST[k]); INST[k].dispose(); INST[k] = null; }
}
function nuevaInst(k, geo, mat, n, sombra){
  tiraInst(k);
  if (!n) return null;
  const m = new T.InstancedMesh(geo, mat, n);
  m.frustumCulled = false;
  m.castShadow = !!sombra; m.receiveShadow = !!sombra;
  esc3.add(m); INST[k] = m; return m;
}

const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _v = new T.Vector3(), _e = new T.Euler();
function ponCaja(malla, i, x, y, w, h, z, d){
  _m4.compose(new T.Vector3(x + w/2, y + h/2, (z == null ? -PROF/2 : z)),
              _q.identity(), new T.Vector3(w, h, d == null ? PROF : d));
  malla.setMatrixAt(i, _m4);
}

function mundo3D(){
  const N = NIVELES[MUNDO.nivel];
  ponPaleta(N);

  /* los solidos van en DOS mallas —el piso y el resto— porque son dos colores y
     un `InstancedMesh` tiene un solo material */
  const pisos = MUNDO.sol.filter(r => r.t === 'piso' || r.t === 'techo');
  const cajas = MUNDO.sol.filter(r => r.t !== 'piso' && r.t !== 'techo');
  /* ── EL PISO RECIBE SOMBRA PERO NO LA PROYECTA ──
     Es una losa de cuarenta y seis bloques de fondo: proyectando, el techo del
     pasillo de la nave sombrea el suelo ENTERO y lo que aparece son manchones
     oscuros con el borde del mapa de sombra dibujado. Medido en la foto del
     tramo de nave, tres manchas en el medio del pasillo. Proyectan los bloques y
     el jugador, que son lo que hay que poder apoyar. */
  const mp = nuevaInst('piso', GEO.caja, matPiso, pisos.length, false);
  mp.receiveShadow = true;
  pisos.forEach((r, i) => ponCaja(mp, i, r.x, r.y, r.w, r.h, -PROF_PISO/2, PROF_PISO));
  mp.instanceMatrix.needsUpdate = true;

  /* el faldon: un plano por delante de la cara de adelante de cada piso */
  const mf = nuevaInst('faldon', new T.PlaneGeometry(1, 1), matFaldon, pisos.length, false);
  pisos.forEach((r, i) => {
    _m4.compose(new T.Vector3(r.x + r.w/2, r.y + r.h/2, 0.012), _q.identity(),
                new T.Vector3(r.w, r.h, 1));
    mf.setMatrixAt(i, _m4);
  });
  mf.instanceMatrix.needsUpdate = true;

  const mc = nuevaInst('sol', GEO.caja, matSol, cajas.length, true);
  cajas.forEach((r, i) => ponCaja(mc, i, r.x, r.y, r.w, r.h));
  if (mc) mc.instanceMatrix.needsUpdate = true;

  /* ── EL CANTO LUMINOSO VA EN LA CARA EN LA QUE SE APOYA ──
     Arriba en el piso y los bloques; ABAJO en un techo, porque ahi se apoya por
     debajo. Dibujado siempre arriba, el techo del tramo de gravedad invertida
     quedaba con su linea del lado que no se ve y el cubo colgaba de la nada. */
/* ── Y ES UN LABIO EN EL CANTO DE ADELANTE, NO UNA TAPA ──
     Cubriendo el fondo entero, lo que se ve desde arriba es una SUPERFICIE
     luminosa de bloque y medio: medido en la foto, el suelo salia como una losa
     de menta y el juego se leia a plataforma de otro color. El labio se ve de
     frente y de refilon, y la cara de arriba queda oscura, que es como se lee un
     borde encendido. */
  const gr = 0.14, lab = 0.22;
  const mk = nuevaInst('canto', GEO.caja, matCanto, MUNDO.sol.length, false);
  MUNDO.sol.forEach((r, i) => {
    const arriba = r.t !== 'techo';
    ponCaja(mk, i, r.x, arriba ? r.y + r.h - gr : r.y, r.w, gr, 0.01, lab);
  });
  mk.instanceMatrix.needsUpdate = true;

  /* los picos: una piramide, y los invertidos son la misma girada media vuelta */
  const picos = MUNDO.mat.filter(r => r.t === 'pico' || r.t === 'picoInv');
  const mi = nuevaInst('pico', GEO.pico, matPico, picos.length, true);
  picos.forEach((r, i) => {
    const inv = r.t === 'picoInv';
    _e.set(0, Math.PI/4, inv ? Math.PI : 0);
    _m4.compose(new T.Vector3(r.x + r.w/2, r.y + r.h/2, -PROF/2),
                _q.setFromEuler(_e), new T.Vector3(1, r.h, 1));
    mi.setMatrixAt(i, _m4);
  });
  if (mi) mi.instanceMatrix.needsUpdate = true;

  const mpa = nuevaInst('pad', GEO.caja, matPad, MUNDO.pads.length, false);
  MUNDO.pads.forEach((p, i) => ponCaja(mpa, i, p.x, p.y + 0.02, 1, 0.20, -PROF/2, PROF*0.8));
  if (mpa) mpa.instanceMatrix.needsUpdate = true;

  const mo = nuevaInst('orbe', GEO.aro, matOrbe, MUNDO.orbes.length, false);
  MUNDO.orbes.forEach((o, i) => {
    _m4.compose(new T.Vector3(o.x, o.y, -PROF/2 + 0.5), _q.identity(), new T.Vector3(1, 1, 1));
    mo.setMatrixAt(i, _m4);
  });
  if (mo) mo.instanceMatrix.needsUpdate = true;

  /* ── LAS SIERRAS, LAS MONEDAS Y LOS PORTALES VAN SUELTOS ──
     Son pocos —cinco, tres y ocho— y CADA UNO SE MUEVE POR SU CUENTA: girar una
     instancia obliga a reescribir su matriz cada cuadro y a subir el buffer
     entero, que para ocho objetos cuesta mas que ocho llamadas de dibujo. */
  for (const m of SUELTOS) esc3.remove(m);
  SUELTOS.length = 0;
  for (const s of MUNDO.sierras){
    const m = new T.Mesh(GEO.sierra, matSierra);
    m.position.set(s.x, s.y, -PROF/2);
    m.scale.set(s.r*2.1, 1, s.r*2.1);
    m.rotation.x = Math.PI/2;
    m.userData.sierra = s; m.castShadow = true;
    esc3.add(m); SUELTOS.push(m);
  }
  for (const c of MUNDO.monedas){
    const m = new T.Mesh(GEO.aro, matMoneda);
    m.position.set(c.x, c.y, -PROF/2 + 0.5);
    m.scale.setScalar(0.95);
    m.userData.moneda = c;
    esc3.add(m); SUELTOS.push(m);
  }
  for (const p of MUNDO.portales){
    const col = p.t === 'grav' ? 0xffd447 : p.t === 'norm' ? 0x5ad9ff
              : p.t === 'nave' ? 0xff6ad5 : 0x2de2a8;
    const mat = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 });
    const m = new T.Mesh(GEO.caja, mat);
    m.position.set(p.x, 5.2, -PROF/2);
    m.scale.set(0.30, 11.5, PROF*1.1);
    m.userData.portal = p;
    esc3.add(m); SUELTOS.push(m);
  }

  /* las formas del fondo, plantadas a lo largo del nivel */
  let k = 0;
  for (let bx = -20; bx < MUNDO.largo + 30 && k < 240; bx += 9){
    const h = ((bx*2654435761) >>> 0)/4294967296;
    const S = 3.0 + h*4.0;
    _e.set(0, 0, h < 0.45 ? Math.PI/4 : 0);
    /* van DETRAS del suelo y por encima del horizonte: metidas mas cerca se
       cruzaban con el plano del piso y aparecian como recortes */
    _m4.compose(new T.Vector3(bx + h*6, 4 + h*13, -50 - h*8),
                _q.setFromEuler(_e),
                new T.Vector3(h < 0.78 ? S*2.4 : S*1.2, S*(h < 0.78 ? 2.4 : 5.0), 1));
    fondo.setMatrixAt(k++, _m4);
  }
  fondo.count = k;
  fondo.instanceMatrix.needsUpdate = true;

  REV3D = MUNDO.rev;
}

/* ══════════ LA PALETA ══════════
   Los materiales son compartidos, asi que cambiar de nivel es reescribir seis
   colores y no reconstruir nada. */
const _c = new T.Color();
function ponPaleta(N){
  const c1 = N.col, c2 = N.col2;
  const a = (v) => (v[0] << 16) | (v[1] << 8) | v[2];
  matCanto.color.setHex(a(c2));
  matReja.color.setHex(a(c2));
  matFondo.color.setHex(a(c2));
  matPad.color.setHex(0xffd447);
  /* el cielo se tinta con el color del nivel, y el degradado ya trae la forma */
  matCielo.color.setHex(a(c1)).multiplyScalar(1);
  matCielo.color.multiplyScalar(2.2);
  /* el bloque NO se deriva del fondo: en el nivel 3, que es casi negro, un
     multiplicador del color del tema daba exactamente el color del cielo y los
     muros del pasillo se veian como rayas flotando */
  matSol.color.setHex(0x171e2d);
  matPiso.color.setHex(0x2a3448);
  matFaldon.color.setHex(a(c1)).multiplyScalar(1.0).lerp(_c.setHex(0x3d4a63), 0.55);
  hemi.color.setHex(a(c2)); hemi.groundColor.setHex(a(c1));
  /* la niebla se crea UNA vez: pasar de sin-niebla a con-niebla obliga a
     recompilar todos los shaders, y hacerlo al cambiar de nivel seria un tiron
     justo en el primer cuadro de la partida */
  NIEBLA.color.setHex(a(c1));
  sol.color.setHex(0xffffff);
}

/* ══════════ EL JUGADOR ══════════
   Se rearma al cambiar el icono, no cada cuadro. Y es EL MISMO objeto que se ve
   en el demo del menu, asi que el icono que se elige es el que se juega — no hay
   una segunda vista previa que pueda decir otra cosa. */
const FORMAS = ['cubo', 'diamante', 'redondo'];
const COLES = ['#2de2a8', '#5ad9ff', '#ffd447', '#ff6ad5', '#ff7a4a', '#b07aff'];
const ICONO = { forma: 0, c1: 0, c2: 1 };

const gJug = new T.Group();
esc3.add(gJug);
const matJugA = new T.MeshLambertMaterial({ color: 0x2de2a8, emissive: 0x0e5a44, emissiveIntensity: 0.55 });
const matJugB = new T.MeshBasicMaterial({ color: 0x5ad9ff });
let jugCuerpo = null;

function ponIcono(){
  while (gJug.children.length) gJug.remove(gJug.children[0]);
  matJugA.color.set(COLES[ICONO.c1]);
  matJugA.emissive.set(COLES[ICONO.c1]).multiplyScalar(0.30);
  matJugB.color.set(COLES[ICONO.c2]);
  const nave = JUG.modo === 'nave';
  const g = new T.Group();
  if (nave){
    const cu = new T.Mesh(new T.ConeGeometry(0.44, 1.05, 12), matJugA);
    cu.rotation.z = -Math.PI/2; cu.castShadow = true;
    g.add(cu);
    const ca = new T.Mesh(GEO.esfera, matJugB);
    ca.scale.setScalar(0.42); ca.position.set(-0.08, 0, 0.30);
    g.add(ca);
  } else if (FORMAS[ICONO.forma] === 'diamante'){
    const cu = new T.Mesh(new T.OctahedronGeometry(0.62), matJugA);
    cu.castShadow = true; g.add(cu);
    const nu = new T.Mesh(new T.OctahedronGeometry(0.30), matJugB);
    nu.position.z = 0.42; g.add(nu);
  } else if (FORMAS[ICONO.forma] === 'redondo'){
    const cu = new T.Mesh(GEO.esfera, matJugA);
    cu.scale.setScalar(JUG_LADO*1.08); cu.castShadow = true; g.add(cu);
    const nu = new T.Mesh(GEO.esfera, matJugB);
    nu.scale.setScalar(JUG_LADO*0.46); nu.position.z = 0.34; g.add(nu);
  } else {
    const cu = new T.Mesh(GEO.caja, matJugA);
    cu.scale.setScalar(JUG_LADO); cu.castShadow = true; g.add(cu);
    const nu = new T.Mesh(GEO.caja, matJugB);
    nu.scale.set(JUG_LADO*0.44, JUG_LADO*0.44, JUG_LADO*0.44);
    nu.position.z = JUG_LADO*0.36; g.add(nu);
  }
  jugCuerpo = g;
  gJug.add(g);
}

/* ══════════ LAS PARTICULAS ══════════
   Una sola malla instanciada con el tope de la calidad: las que no se usan van a
   escala cero, que cuesta una matriz y ni una llamada de dibujo. */
const PART = [];
const PART_TOPE = 160;
const matPart = new T.MeshBasicMaterial({ color: 0xffffff });
const mPart = new T.InstancedMesh(GEO.part, matPart, PART_TOPE);
mPart.frustumCulled = false;
mPart.instanceColor = new T.InstancedBufferAttribute(new Float32Array(PART_TOPE*3), 3);
esc3.add(mPart);

function chispas(x, y, n, c){
  const tope = Math.min(PART_TOPE, CALIDADES[CALIDAD].part);
  for (let i = 0; i < n && PART.length < tope; i++){
    const a = Math.random()*6.2832, v = 2 + Math.random()*9;
    PART.push({ x, y, z: -PROF/2 + Math.random()*1.2, vx: Math.cos(a)*v, vy: Math.sin(a)*v,
                t: 0.25 + Math.random()*0.35, t0: 0.6, s: 0.10 + Math.random()*0.20, c });
  }
}
function pasoPart(dt){
  for (let i = PART.length - 1; i >= 0; i--){
    const p = PART[i];
    p.t -= dt; if (p.t <= 0){ PART.splice(i, 1); continue; }
    p.vy -= 26*dt; p.x += p.vx*dt; p.y += p.vy*dt;
  }
}

/* ══════════ EL TAMANO ══════════ */
function mide(){
  /* ── EL MARCO SE GIRA SI LA PANTALLA ES VERTICAL ──
     Y adentro va todo, asi que el HUD y los menus quedan alineados por
     construccion. En una pantalla apaisada no se gira nada. */
  const W = innerWidth, H = innerHeight;
  const vert = H > W;
  const m = $('marco');
  const aw = vert ? H : W, ah = vert ? W : H;
  m.className = vert ? 'girado' : 'derecho';
  m.style.width = aw + 'px'; m.style.height = ah + 'px';
  const q = CALIDADES[CALIDAD].esc;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  ESC = q*dpr;
  ren.setPixelRatio(ESC);
  ren.setSize(aw, ah, false);
  ANCHO = ren.domElement.width; ALTO = ren.domElement.height;
  cam.aspect = aw/ah;
  cam.updateProjectionMatrix();
  U = ANCHO/VISTA_ANCHO;
  /* ── LA DISTANCIA DE LA CAMARA SALE DE UNA CUENTA ──
     Se quieren ver `VISTA_ANCHO` bloques de ancho sobre el plano z = 0:
     `D = (ancho/2) / (aspecto · tan(fov/2))`. Escrita a mano, cambiar el campo o
     la proporcion de pantalla cambiaria cuantos bloques de aviso hay. */
  CAM.d = (VISTA_ANCHO*0.5)/(cam.aspect*Math.tan(FOV_Y*Math.PI/360));
  CAM.alto = VISTA_ANCHO/cam.aspect;
  /* el telon del cielo, pegado a la camara y justo por delante del plano lejano */
  const zc = -200;
  cielo.position.set(0, 0, zc);
  cielo.scale.set(2*Math.abs(zc)*Math.tan(FOV_Y*Math.PI/360)*cam.aspect*1.05,
                  2*Math.abs(zc)*Math.tan(FOV_Y*Math.PI/360)*1.05, 1);
}
addEventListener('resize', mide);

/* ══════════ LA CAMARA ══════════
   `CAM.y` es el CENTRO de la banda visible, no un desplazamiento: con la camara
   mirando derecho, el centro de la banda ES la altura de la camara, asi que la
   cuenta de «el piso al 80 % del alto» sale de una linea. */
const CAM = { x: 0, y: 3, d: 10, alto: 9.2 };
let CAM_OFS = 0.30;
function ponCam(dt){
  CAM.x = JUG.x - VISTA_ANCHO*CAM_OFS;
  const H = CAM.alto*0.5;
  /* ── EN NAVE Y EN GRAVEDAD INVERTIDA SE CENTRA EL PASILLO ──
     Los dos entran enteros en pantalla, asi que seguir al jugador en vertical
     solo hace que las paredes se muevan y cuesten mas de leer. */
  const obj = JUG.modo === 'nave' ? ALTO_PASILLO*0.5
            : JUG.grav < 0 ? ALTO_GRAV*0.5
            /* el piso queda al 80 % del alto: `centro = 0,6·semialto` */
            : cl(H*0.6 + JUG.y*0.20, H*0.6, H*0.6 + 3.2);
  CAM.y += (obj - CAM.y)*Math.min(1, dt*6);
  cam.position.set(CAM.x + VISTA_ANCHO*0.5, CAM.y, CAM.d);
  cam.rotation.set(0, 0, 0);
  /* la caja de sombra sigue al jugador: repartida sobre el nivel entero, la
     sombra de un cubo mediria dos texels y temblaria */
  /* ── LA LUZ VA CASI DE ARRIBA, Y ESO NO ES ESTETICA ──
     Con el foco corrido nueve bloques hacia la camara, la sombra de una pared
     salia larga y hacia atras: en perspectiva se veia DESPEGADA de su pared, y
     en el pasillo de la nave eran cuatro manchones sueltos sobre el piso. A 63
     grados de elevacion la sombra mide medio alto del objeto y queda debajo de
     el, que es lo que la vuelve informacion en vez de ruido. */
  sol.position.set(JUG.x + 7, CAM.y + 16, 3);
  sol.target.position.set(JUG.x, CAM.y, -PROF/2);
  const s = sol.shadow.camera;
  s.left = -13; s.right = 13; s.top = 13; s.bottom = -13;
  s.updateProjectionMatrix();
}

/* ══════════ UN CUADRO ══════════ */
const _v3 = new T.Vector3();
let MODO3D = '';
function pinta(){
  if (REV3D !== MUNDO.rev) mundo3D();
  /* la nave y el cubo son mallas distintas, asi que el icono se rearma al cambiar
     de modo — una vez, no en cada cuadro */
  if (MODO3D !== JUG.modo){ MODO3D = JUG.modo; ponIcono(); }
  const t = musTiempo();
  /* el pulso: 1 en el golpe y cae hasta el siguiente. Sale del reloj de la
     musica, asi que la imagen y el tema no pueden desincronizarse. */
  const pulso = t == null ? 0 : Math.pow(1 - (((t % 1) + 1) % 1), 3);

  /* el canto y la reja laten con el compas: es lo unico estetico del juego y no
     cuesta ni una llamada de dibujo, porque los materiales son compartidos */
  matReja.opacity = 0.11 + pulso*0.10;
  matFondo.opacity = 0.045 + pulso*0.045;
  ren.toneMappingExposure = 1.10 + pulso*0.12;

  /* el jugador */
  gJug.visible = JUG.vivo;
  if (JUG.vivo){
    gJug.position.set(JUG.x, JUG.y + JUG_LADO*0.5, -JUG_LADO*0.5);
    gJug.rotation.z = JUG.modo === 'nave' ? JUG.giro : -JUG.giro;
  }

  /* lo que se mueve por su cuenta */
  for (const m of SUELTOS){
    const u = m.userData;
    if (u.sierra) m.rotation.y = (t || 0)*2.4;
    else if (u.moneda){
      m.visible = !u.moneda.tomada;
      m.rotation.y = (t || 0)*1.9;
      m.position.y = u.moneda.y + Math.sin((t || 0)*2.2)*0.14;
    } else if (u.portal){
      m.material.opacity = 0.42 + pulso*0.30;
    }
  }
  if (INST.orbe){
    /* un orbe usado se apaga, y eso hay que poder verlo: es la diferencia entre
       «no llegue» y «ya lo gaste» */
    let algo = false;
    MUNDO.orbes.forEach((o, i) => { if (o.usado) algo = true; });
    matOrbe.color.setHex(0xffd447);
    matOrbe.opacity = 1; matOrbe.transparent = false;
    if (algo){
      MUNDO.orbes.forEach((o, i) => {
        const s = o.usado ? 0.55 : 1;
        _m4.compose(new T.Vector3(o.x, o.y, -PROF/2 + 0.5), _q.identity(),
                    new T.Vector3(s, s, s));
        INST.orbe.setMatrixAt(i, _m4);
      });
      INST.orbe.instanceMatrix.needsUpdate = true;
    }
  }

  /* las particulas */
  const n = Math.min(PART.length, PART_TOPE);
  for (let i = 0; i < PART_TOPE; i++){
    if (i < n){
      const p = PART[i], k = cl(p.t/p.t0, 0.15, 1), s = p.s*k;
      _m4.compose(_v3.set(p.x, p.y, p.z), _q.identity(), new T.Vector3(s, s, s));
      mPart.setMatrixAt(i, _m4);
      _c.set(p.c); mPart.setColorAt(i, _c);
    } else {
      _m4.compose(_v3.set(0, -999, 0), _q.identity(), new T.Vector3(0, 0, 0));
      mPart.setMatrixAt(i, _m4);
    }
  }
  mPart.instanceMatrix.needsUpdate = true;
  if (mPart.instanceColor) mPart.instanceColor.needsUpdate = true;

  ren.info.reset();
  ren.render(esc3, cam);
}

/* ── EL BRILLO SE LEE DEL BUFER, Y HAY QUE DIBUJAR PRIMERO ──
   Un lienzo WebGL sin `preserveDrawingBuffer` sale en cero si se lo copia con
   `drawImage`: la unica lectura honesta es `readPixels` justo despues de un
   render. Es la misma leccion que en ECO. */
function brilloDe(){
  pinta();
  const gl = ren.getContext();
  const w = ren.domElement.width, h = ren.domElement.height;
  const px = new Uint8Array(w*h*4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let m = 0, mx = 0;
  for (let i = 0; i < px.length; i += 4){
    const l = 0.2126*px[i] + 0.7152*px[i+1] + 0.0722*px[i+2];
    m += l; if (l > mx) mx = l;
  }
  return { medio: +(m/(w*h)).toFixed(1), max: Math.round(mx), w, h };
}

function partDe(){
  return { n: PART.length, count: mPart.count, vis: mPart.visible,
           cull: mPart.frustumCulled, mat: !!mPart.material,
           tope: Math.min(PART_TOPE, CALIDADES[CALIDAD].part),
           m0: Array.from(mPart.instanceMatrix.array.slice(0, 16)).map(v => +v.toFixed(2)),
           padre: mPart.parent ? mPart.parent.type : null };
}

function costoDe(){
  const r = ren.info.render, mm = ren.info.memory;
  return { llamadas: r.calls, triangulos: r.triangles, geo: mm.geometries, tex: mm.textures,
           programas: ren.info.programs ? ren.info.programs.length : -1 };
}

/* ── PROYECTAR UN PUNTO DEL MUNDO A FRACCIONES DE PANTALLA ──
   Es la sonda con la que se ajusta el encuadre: «el piso al 80 %» se mide, no se
   estima. Y con la camara mirando derecho tiene que salir LINEAL en x, que es la
   propiedad de la que depende que se pueda apuntar. */
function proy(x, y){
  /* ── LA MATRIZ SE PONE AL DIA ACA, Y NO ES UN DETALLE ──
     `Object3D.matrixWorld` se recalcula al DIBUJAR, asi que proyectar justo
     despues de mover la camara usa la matriz del cuadro anterior: medido, la
     sonda devolvia al jugador en −0,595 del ancho con la camara puesta donde
     corresponde. Es la cuarta vez en este repo que una medicion sale mal por
     esto — en PISTOLA y en RECREO costo una vuelta cada una. */
  cam.updateMatrixWorld(true);
  _v3.set(x, y, 0).project(cam);
  return [(_v3.x + 1)/2, (1 - _v3.y)/2];
}
