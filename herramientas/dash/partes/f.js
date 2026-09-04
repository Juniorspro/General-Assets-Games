
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
/* ── Y ES LARGO PORQUE SU BORDE LEJANO NO PUEDE VERSE ──
   Con 70 bloques, la niebla se come el 56 % en el borde y quedaba una LINEA DURA
   cruzando la pantalla: las torres de las tres capas cortaban todas en esa misma
   fila y se leian como apoyadas en una repisa, no a tres distancias. Con 140 la
   niebla se lleva el 96 % y el suelo se funde con el cielo en el horizonte, asi
   que cada torre corta donde le toca por su propia z. */
const PROF_PISO = 140;
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
   plano de juego (z ~ 0) no tiñe nada; a 46 bloques se lleva una cuarta parte y a
   125 —donde vive la capa lejana— casi todo, que es lo que la deja como una
   insinuacion en el horizonte en vez de un dibujo. */
const NIEBLA = new T.FogExp2(0x101c30, 0.013);
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
/* ── EL CIELO EN EL HORIZONTE VALE EXACTAMENTE LO QUE LA NIEBLA ──
   Y ese numero no se elige: se resuelve. El cielo es un gris multiplicado por
   `CIELO_K` veces el color del nivel, y la niebla es ese color a secas, asi que
   para que el borde lejano del suelo se funda con el cielo hace falta
   `gris_lineal · CIELO_K = 1`, o sea gris 0,4545 en lineal = 180 en sRGB. Con
   otro valor queda una LINEA DURA cruzando la pantalla a la altura del horizonte
   —medida en la captura— y las tres capas de torres cortan todas en esa misma
   fila, asi que se leen apoyadas en una repisa en vez de a tres distancias.
   Por debajo del horizonte el gris se queda quieto: ahi el suelo tapa todo, y si
   siguiera bajando el poco que asoma entre las torres delataria el empalme. */
const CIELO_K = 2.2;
function lienzoCielo(){
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  const gris = Math.round(255*Math.pow(1/CIELO_K, 1/2.2));
  const hex = '#' + gris.toString(16).padStart(2, '0').repeat(3);
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, hex);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  g.fillStyle = hex; g.fillRect(0, 64, 4, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const matCielo = new T.MeshBasicMaterial({ map: lienzoCielo(), depthWrite: false, fog: false });
const cielo = new T.Mesh(new T.PlaneGeometry(1, 1), matCielo);
cielo.renderOrder = -10; cielo.frustumCulled = false;
cam.add(cielo);

/* ══════════ EL TELON DE FOTO ══════════
   ── VA PEGADO A LA CAMARA, IGUAL QUE EL CIELO ──
   Puesto en el mundo habria que resolver la perspectiva: un punto en y = 0 a
   ciento noventa unidades NO cae en la misma linea de pantalla que el piso, que
   esta a diez — cae veinte veces mas cerca del centro. Pegado a la camara, el
   paralaje se hace corriendo la TEXTURA, y el borde de abajo se coloca resolviendo
   la unica ecuacion que hay: dos puntos caen en la misma linea de pantalla cuando
   `y/dist` coincide, o sea `y_telon = -190·camY/camZ`.

   ── Y SE REPITE EN ESPEJO ──
   Ninguna de estas fotos es continua por los bordes y coserlas ensucia el centro,
   que es lo que mas se mira. Con `MirroredRepeat` la copia de al lado va dada
   vuelta, o sea que los dos bordes que se tocan son EL MISMO borde: la costura no
   puede existir. Es la regla que ya ordeno las texturas de BARRIO. */
const TELON_Z = -190, TELON_COPIAS = 1.25, TELON_PARALAJE = 0.10;
const matTelon = new T.MeshBasicMaterial({ transparent: true, opacity: 0,
                                           depthWrite: false, fog: false });
const telon = new T.Mesh(new T.PlaneGeometry(1, 1), matTelon);
telon.renderOrder = -9; telon.frustumCulled = false; telon.visible = false;
cam.add(telon);
const TELON_TEX = {};
let telonProp = 2.36;
/* ── LA FOTO NO REEMPLAZA NADA HASTA QUE LLEGA ──
   Un data URI se decodifica de forma asincronica: el telon nace apagado y se
   enciende cuando la textura esta lista. Si una falla, ese nivel se dibuja como
   se dibujaba antes —cielo en degradado y las tres capas de rombos— y no hay un
   solo cuadro en negro. */
function telonCarga(){
  if (typeof IMG === 'undefined') return;
  for (const k of ['f0', 'f1', 'f2']){
    const t = new T.TextureLoader().load(IMG[k], () => { TELON_TEX[k].listo = true; });
    t.wrapS = T.MirroredRepeatWrapping; t.wrapT = T.ClampToEdgeWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.repeat.set(TELON_COPIAS, 1);
    TELON_TEX[k] = { tex: t, listo: false,
                     prop: (IMG_TAM[k][0]/IMG_TAM[k][1]) };
  }
}
function ponTelon(){
  const N = NIVELES[EST.nivel];
  const e = TELON_TEX['f' + N.id];
  if (!e || !e.listo){ telon.visible = false; return; }
  telon.visible = true;
  if (matTelon.map !== e.tex){ matTelon.map = e.tex; matTelon.needsUpdate = true;
                               telonProp = e.prop; }
  matTelon.opacity = Math.min(1, matTelon.opacity + 0.08);
  /* el corrimiento de la textura ES el paralaje: mover la camara un bloque tiene
     que correr la imagen `p` bloques de pantalla, o sea `p/VISTA_ANCHO` del ancho
     del plano, o sea eso por las copias que caben */
  e.tex.offset.x = -CAM.x*TELON_PARALAJE*TELON_COPIAS/VISTA_ANCHO;
  const H = Math.abs(TELON_Z)*Math.tan(FOV_Y*Math.PI/360);
  const w = 2*H*cam.aspect*1.02, h = w/telonProp;
  const abajo = -Math.abs(TELON_Z)*cam.position.y/Math.max(0.001, cam.position.z);
  telon.position.set(0, abajo + h*0.5, TELON_Z);
  telon.scale.set(w, h, 1);
}

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
const reja = new T.Mesh(new T.PlaneGeometry(2600, 300), matReja);
reja.position.set(600, 70, -175);
texReja.repeat.set(2600/4, 300/4);          /* una celda cada cuatro bloques: la grilla del compas */
esc3.add(reja);

/* ══════════ TRES CAPAS DE FONDO, Y LA SILUETA LA ELIGE EL NIVEL ══════════
   ── EL PARALAJE NO SE PROGRAMA: SALE DE LA PERSPECTIVA ──
   Las capas van PLANTADAS en el mundo a tres profundidades y su velocidad
   relativa es la que la camara les da. En 2D esto eran tres factores que habia
   que mantener a mano; en 3D es geometria y no puede desincronizarse.

   ── Y LO QUE SEPARA UN NIVEL DE OTRO ES LA SILUETA, NO EL TINTE ──
   Tres fondos del mismo dibujo con otro color son tres veces el mismo nivel.
   `ciudad` son torres con ventanas, `rocas` son bloques flotando y `cresta` es
   una cordillera de picos: se reconoce cual es de una ojeada, sin leer nada.

   Cada forma sale de la POSICION y no de un azar por cuadro — si no, parpadean. */
/* ── Y SE APOYAN EN EL PISO, NO FLOTAN DENTRO DE EL ──
   La primera version puso la capa cercana a 19 bloques, o sea ADENTRO de la losa
   del suelo, que llega a 70: el suelo le tapaba la base a una altura fija y las
   torres salian como una fila de bloques sueltos sobre una repisa. Apoyadas en
   y = 0 y detras del borde del suelo, la base se pierde en el horizonte y ahi si
   se leen a ciudad. El horizonte cae al 50 % del alto, porque la camara mira
   derecho: todo el fondo tiene que vivir en la mitad de arriba del cuadro. */
/* ── Y CADA ESTILO PESA DISTINTO, PORQUE NO OCUPA LO MISMO ──
   Una torre es angosta y deja ver el cielo entre una y otra; una cordillera es
   una masa continua. Con la misma opacidad, la cresta salia como una banda
   naranja de punta a punta y hasta se comia los rotulos del HUD. */
/* Y con el telon de foto puesto las capas pesan MENOS: la foto ya trae las rocas
   y la cordillera, asi que la geometria de encima suma poco y ensucia mucho. La
   ciudad es la excepcion —sus torres se leen a torres MAS CERCA que las de la
   foto— y ahi el paralaje se gana entero. */
const FONDO_OPA = { ciudad: 1.00, rocas: 0.55, cresta: 0.52 };
const CAPAS = [
  { z: -38,  mat: null, n: 170, paso: 7.0,  brillo: 0.42, esc: 1.00 },   /* cerca */
  { z: -72,  mat: null, n: 200, paso: 11.0, brillo: 0.30, esc: 1.90 },   /* medio */
  { z: -125, mat: null, n: 220, paso: 17.0, brillo: 0.22, esc: 3.40 }    /* lejos */
];
for (const c of CAPAS){
  c.mat = new T.MeshBasicMaterial({ color: 0x2de2a8, transparent: true,
                                    opacity: c.brillo, depthWrite: false });
  c.opa = c.brillo;
  c.malla = new T.InstancedMesh(new T.PlaneGeometry(1, 1), c.mat, c.n);
  c.malla.frustumCulled = false;
  c.malla.renderOrder = -5;
  esc3.add(c.malla);
}

/* ── LAS MOTAS LEJANAS ──
   Son lo unico del fondo que se mueve por su cuenta, y late con el compas: un
   cielo perfectamente quieto detras de un juego de ritmo se lee a papel tapiz.
   Van instanciadas y su posicion sale de una semilla, asi que no hay estado que
   guardar ni un array de doscientas cosas que recorrer en JavaScript. */
const matMotas = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true,
                                           opacity: 0.5, depthWrite: false });
const MOTAS_TOPE = 180;
const mMotas = new T.InstancedMesh(new T.PlaneGeometry(1, 1), matMotas, MOTAS_TOPE);
mMotas.frustumCulled = false; mMotas.renderOrder = -6;
esc3.add(mMotas);

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

const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _v = new T.Vector3(),
      _v2 = new T.Vector3(), _e = new T.Euler();
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

  armaCapas(N);

  REV3D = MUNDO.rev;
}

/* ── LAS TRES CAPAS SE ARMAN CON LA FORMA QUE EL NIVEL PIDE ──
   La `x` de cada pieza se separa `paso` bloques y la forma sale de dos hashes de
   esa x: uno decide el tamano y el otro la variante. Deterministico, asi que la
   silueta de un nivel es SIEMPRE la misma y se puede reconocer. */
function armaCapas(N){
  const est = N.fondo || 'ciudad';
  CAPAS.forEach((c, ci) => {
    let k = 0;
    for (let bx = -30; bx < MUNDO.largo + 60 && k < c.n; bx += c.paso){
      const h = ((((bx*2654435761) >>> 0) ^ (ci*0x9e3779b9)) >>> 0)/4294967296;
      const h2 = ((((bx*40503) >>> 0) ^ (ci*0x85ebca6b)) >>> 0)/4294967296;
      const E = c.esc;
      let w, alt, y, gir = 0;
      if (est === 'ciudad'){
        /* torres: angostas, altas y apoyadas en el suelo */
        w = (1.6 + h*2.6)*E; alt = (7 + h2*26)*E; y = alt*0.5;
      } else if (est === 'rocas'){
        /* rocas flotando: rombos sueltos repartidos en altura, y ninguno pegado
           al suelo — si tocaran el piso dejarian de leerse a flotando */
        w = (2.6 + h*4.6)*E; alt = w*(0.7 + h2*0.6);
        y = 4 + h2*16 + E*1.5; gir = Math.PI/4 + h*0.5;
      } else {
        /* ── LA CRESTA SE PLANTA POR SU PUNTA, NO POR SU CENTRO ──
           Rombos girados y metidos a medias en el suelo, o sea una cordillera; lo
           que asoma es una fila de picos y es mas barato que una geometria propia.
           Pero con `y = alt*0.18` la punta sube con el tamano: medido en la capa
           lejana —donde la escala es 3,4— un rombo medía sesenta y ocho bloques y
           su punta llegaba a doce, o sea que la «cordillera» era UNA pared naranja
           tapando la banda por donde vuela la nave. Se elige la ALTURA DE LA PUNTA
           y de ahi sale el centro: la media diagonal de un cuadrado girado
           cuarenta y cinco grados vale 0,707 del lado. */
        w = (5 + h*9)*E; alt = w; gir = Math.PI/4;
        y = (2.4 + h2*3.2) - w*0.7071;
      }
      _e.set(0, 0, gir);
      _m4.compose(new T.Vector3(bx + h*c.paso*0.7, y, c.z - h2*4),
                  _q.setFromEuler(_e), new T.Vector3(w, alt, 1));
      c.malla.setMatrixAt(k++, _m4);
    }
    c.malla.count = k;
    c.malla.instanceMatrix.needsUpdate = true;
  });

  /* las motas: repartidas por el nivel y a tres profundidades */
  const nm = Math.min(MOTAS_TOPE, N.motas || 90);
  for (let i = 0; i < MOTAS_TOPE; i++){
    if (i >= nm){ _m4.compose(_v.set(0, -999, 0), _q.identity(), _v2.set(0, 0, 0)); }
    else {
      const h = ((i*2246822519) >>> 0)/4294967296, h2 = ((i*3266489917) >>> 0)/4294967296;
      const s = (0.10 + h2*0.22)*3.2;
      _m4.compose(_v.set(-30 + h*(MUNDO.largo + 90), 3 + h2*22, -80 - h*70),
                  _q.identity(), _v2.set(s, s, 1));
    }
    mMotas.setMatrixAt(i, _m4);
  }
  mMotas.instanceMatrix.needsUpdate = true;
}

/* ══════════ LA PALETA ══════════
   Los materiales son compartidos, asi que cambiar de nivel es reescribir seis
   colores y no reconstruir nada. */
const _c = new T.Color();
const _p1 = new T.Color(), _p2 = new T.Color();
const _pa1 = new T.Color(), _pa2 = new T.Color();
const _pb1 = new T.Color(), _pb2 = new T.Color();
const palHex = (v) => (v[0] << 16) | (v[1] << 8) | v[2];

function ponColores(C1, C2){
  matCanto.color.copy(C2);
  matReja.color.copy(C2);
  /* las capas van del color del tema, y la de CERCA mas apagada: si las tres
     tuvieran el mismo brillo, la profundidad se perderia — lo que da distancia
     no es el tamano sino que lo lejano tenga menos contraste */
  CAPAS.forEach((c, i) => {
    c.mat.color.copy(C2).lerp(C1, i === 0 ? 0.62 : i === 1 ? 0.35 : 0.10);
  });
  matMotas.color.copy(C2).lerp(_c.setHex(0xffffff), 0.55);
  /* el telon se tinta con el acento del tramo, pero SOLO a medias: la foto ya
     trae su color y multiplicarla por un acento saturado la deja de barro. A
     medias, el cambio de tramo se ve tambien en el horizonte. */
  matTelon.color.copy(C2).lerp(_c.setHex(0xffffff), 0.58);
  matPad.color.setHex(0xffd447);
  /* el cielo se tinta con el color del nivel, y el degradado ya trae la forma */
  matCielo.color.copy(C1).multiplyScalar(CIELO_K);
  /* ── EL BLOQUE Y EL PISO SALEN DEL COLOR DEL TEMA, PERO POR DEBAJO DEL CIELO ──
     Estaban en dos azules grises escritos a mano, y eso se veia: en el nivel 3
     —que es rojo— el piso salia AZUL y el techo del pasillo de la nave se leia a
     un agujero negro con un labio rosa. Y no se pueden derivar multiplicando sin
     mas: el cielo es `C1 · 2,2`, asi que un multiplicador cerca de eso deja el
     bloque del color del cielo y los muros se ven como rayas flotando (eso ya
     paso). Y multiplicar tampoco sirve: el `C1` del nivel 3 es casi negro, asi
     que `C1 · 1,55` seguia siendo negro — medido en la foto del pasillo de la
     nave, el techo daba **(3, 0, 3)** sobre 255, o sea un agujero. Lo que
     funciona es MEZCLAR hacia un piso de gris: el bloque se queda con el tinte
     del tema y con un valor que no puede caer a cero, y el piso va un escalon
     por encima del bloque, que es lo que los separa. */
  matSol.color.copy(C1).lerp(_c.setHex(0x2b3448), 0.55);
  matPiso.color.copy(C1).lerp(_c.setHex(0x3d4a66), 0.60);
  matFaldon.color.copy(C1).lerp(_c.setHex(0x3d4a63), 0.55);
  hemi.color.copy(C2); hemi.groundColor.copy(C1);
  /* la niebla se crea UNA vez: pasar de sin-niebla a con-niebla obliga a
     recompilar todos los shaders, y hacerlo al cambiar de nivel seria un tiron
     justo en el primer cuadro de la partida */
  NIEBLA.color.copy(C1);
  sol.color.setHex(0xffffff);
}

/* ── EL COLOR CAMBIA POR TRAMOS, Y EL TRAMO SALE DE LA X ──
   Es lo que hace el genero: cada tanto el fondo entero cambia de color, y eso es
   lo unico que hace que un tema de dos minutos no se sienta un pasillo. El tramo
   NO se cuenta con el reloj de audio sino con la x del jugador —128 bloques son
   32 tiempos, o sea ocho compases— por dos razones: sin audio (el bot, la sonda)
   el reloj de la musica no existe, y como la x SALE del reloj, contar bloques es
   contar compases. El fundido tambien va por x, asi que no depende del `dt` y
   sale igual a 30 y a 144 cuadros. */
const PAL_BLOQ = 128, PAL_FUNDE = 7;
const PAL = { i: -1, x0: 0, listo: false };
function paletaPaso(N){
  const P = (N.pals && N.pals.length) ? N.pals : [[N.col, N.col2]];
  const sec = Math.floor(Math.max(0, JUG.x)/PAL_BLOQ) % P.length;
  if (sec !== PAL.i){
    if (PAL.i < 0){ _pa1.setHex(palHex(P[sec][0])); _pa2.setHex(palHex(P[sec][1])); }
    else { _pa1.copy(_p1); _pa2.copy(_p2); }
    const nuevo = PAL.i >= 0;
    _pb1.setHex(palHex(P[sec][0])); _pb2.setHex(palHex(P[sec][1]));
    /* ── Y EL CAMBIO SE ANUNCIA CON UN DESTELLO DEL COLOR NUEVO ──
       Sin el destello el cambio se lee a que el juego cambio de nivel; con el, se
       lee a un cambio de tramo del tema. Va DESPUES de fijar el color de destino,
       porque el destello se pinta de ese color. */
    if (nuevo){ destella('#' + _pb2.getHexString(), 0.52); sacude(0.16); }
    PAL.i = sec; PAL.x0 = JUG.x; PAL.listo = false;
  }
  if (PAL.listo) return;
  const k = cl((JUG.x - PAL.x0)/PAL_FUNDE, 0, 1);
  _p1.copy(_pa1).lerp(_pb1, k); _p2.copy(_pa2).lerp(_pb2, k);
  ponColores(_p1, _p2);
  /* una vez terminado el fundido no se vuelve a escribir: son veinte materiales
     y el color no cambia hasta el tramo siguiente */
  if (k >= 1) PAL.listo = true;
}
function ponPaleta(N){
  const fo = FONDO_OPA[N.fondo] || 1;
  CAPAS.forEach((c) => { c.opa = c.brillo*fo; });
  PAL.i = -1;
  paletaPaso(N);
}

/* ══════════ EL JUGADOR ══════════
   Se rearma al cambiar el icono, no cada cuadro. Y es EL MISMO objeto que se ve
   en el demo del menu, asi que el icono que se elige es el que se juega — no hay
   una segunda vista previa que pueda decir otra cosa. */
const FORMAS = ['cubo', 'diamante', 'redondo'];
const COLES = ['#2de2a8', '#5ad9ff', '#ffd447', '#ff6ad5', '#ff7a4a', '#b07aff'];
const ICONO = { forma: 0, c1: 0, c2: 1 };

/* ── EL APLASTE VA EN UN GRUPO DE AFUERA, Y LA RAZON ES EL ORDEN ──
   La matriz local de un objeto es T·R·S, o sea que la escala se aplica en los
   ejes YA GIRADOS: con el aplaste en el mismo grupo que el giro, un cubo tumbado
   noventa grados se aplastaria de costado. En un grupo padre la escala va
   despues de la rotacion y el aplaste sigue el eje Y del mundo, que es donde
   esta el piso. */
const gSq = new T.Group();
const gJug = new T.Group();
gSq.add(gJug);
esc3.add(gSq);
/* el resorte del aplaste: `sq` positivo es achatado y negativo estirado */
const SQ = { v: 0, x: 0 };
function golpeaSq(f){ SQ.v += f; }
/* ── Y LOS TRES NUMEROS DEL RESORTE SALEN DE UNA CUENTA, NO DE TANTEAR ──
   El pico de un resorte al que se le da un empujon `v0` vale `v0/ω` **sin
   amortiguamiento**, y el tiempo hasta ese pico es un cuarto de periodo. La
   primera version tenia ω = 7,6 con empujones de 0,18: medido, el pico daba
   **2,4 %** de deformacion, o sea invisible. Con ω = 13 (k = 169) y ζ = 0,35
   —que es lo que deja UN rebote, y es lo que separa la goma de la gelatina—
   quedo en 7,7 %, y ahi aparecio la parte que me faltaba de la cuenta: **el
   amortiguamiento se come el 36 % del pico**, porque el factor vale
   `exp(-ζ·arccos(ζ)/√(1-ζ²))` = 0,64. O sea que el empujon para un 14 % no es
   1,8 sino 3,2 — y ese numero se comprobo midiendo la curva, no derivandolo:
   pico **-14,0 %** a los 0,12 s. */
const SQ_W = 13, SQ_K = SQ_W*SQ_W, SQ_C = 2*0.35*SQ_W;
function sqPaso(dt){
  SQ.v += (-SQ_K*SQ.x - SQ_C*SQ.v)*dt;
  SQ.x += SQ.v*dt;
  SQ.x = cl(SQ.x, -0.34, 0.34);
}
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

/* ══════════════════════ LOS EFECTOS ══════════════════════
   ── EL SACUDON ES SOLO TRASLACION, Y ESO NO ES UN DETALLE ──
   Girar la camara rompe la linealidad de la x, que es la propiedad de la que
   depende que se pueda despegar en un bloque exacto. Una traslacion pura de una
   camara que mira derecho la conserva EXACTAMENTE, y un acercamiento tambien
   —escala a los dos por igual, asi que el cubo y el pico siguen alineados—. Por
   eso los dos efectos de camara de este juego son esos dos y ningun otro.

   ── Y EL LATIDO ES UN ACERCAMIENTO, NO UN TEMBLOR ──
   A 128 BPM el pulso son 2,1 Hz, y por encima de un hertz cualquier movimiento
   se lee a temblor por chico que sea: es la leccion que en BARRIO costo una
   vuelta entera. Un 0,8 % de acercamiento en el golpe no se lee a temblor, se
   lee a que el mundo respira con el tema. */
const EFE = { sac: 0, zoom: 0, hit: 0 };
let _sacX = 0, _sacY = 0;
function sacude(f){ if (f > EFE.sac) EFE.sac = Math.min(1.4, f); }
function acerca(f){ EFE.zoom = f; }

function efePaso(dt){
  EFE.sac = Math.max(0, EFE.sac - dt*3.4);
  EFE.zoom += (0 - EFE.zoom)*Math.min(1, dt*4.5);
  const a = EFE.sac*EFE.sac;                   /* al cuadrado: cae mas natural */
  _sacX = (Math.random()*2 - 1)*a*0.42;
  _sacY = (Math.random()*2 - 1)*a*0.42;
}

/* ── EL DESTELLO Y LA VIÑETA VIVEN EN EL DOM ──
   Cuestan cero triangulos y se componen en la GPU del navegador. Y el destello
   se escribe SOLO cuando cambia: en cero, no se toca el DOM. */
const elFlash = $('flash');
let FLA = 0, FLA_ANT = -1;
function destella(col, f){ FLA = Math.max(FLA, f); elFlash.style.setProperty('--fc', col); }
function flaPaso(dt){
  FLA = Math.max(0, FLA - dt*2.6);
  const v = +FLA.toFixed(3);
  if (v !== FLA_ANT){ FLA_ANT = v; elFlash.style.opacity = v; }
}

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
  const t = musTiempo();
  const pul = t == null ? 0 : Math.pow(1 - (((t % 1) + 1) % 1), 3);
  const d = CAM.d*(1 - 0.012*pul + EFE.zoom);
  cam.position.set(CAM.x + VISTA_ANCHO*0.5 + _sacX, CAM.y + _sacY, d);
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
/* ── EL JUGADOR SE COLOCA EN UNA FUNCION Y NO ADENTRO DEL PINTADO ──
   La sonda mide con el cuadro congelado y sin dibujar, asi que leyendo la
   posicion del grupo lo que se lee es la del ultimo cuadro dibujado: medido, el
   anclaje del aplaste daba 0,3171 de error, que es exactamente la altura a la
   que estaba el jugador cuando se dibujo por ultima vez. Con la colocacion
   aparte, la sonda la llama ella y mide el instante que pidio.
   Es la quinta vez en este repo que una medicion sale mal por leer un estado que
   solo se pone al dibujar. */
function ponJug(){
  gSq.visible = JUG.vivo;
  if (JUG.vivo){
    /* ── EL APLASTE SE ANCLA EN LA CARA QUE TOCA, NO EN EL CENTRO ──
       La escala de un grupo va alrededor de su origen, y el origen estaba en el
       centro del cubo: aplastado media deformacion, el cubo se HUNDE la mitad de
       eso en el piso y estirado flota. Anclando la cara de apoyo —la de abajo
       apoyado, la de arriba con la gravedad invertida— el contacto se queda
       quieto, que es lo unico que hace que la deformacion se lea a deformacion.
       Y el volumen se conserva: si no, el cubo cambia de tamano en vez de
       deformarse. */
    const k = SQ.x, alto = JUG_LADO*(1 - k);
    const cy = JUG.grav > 0 ? JUG.y + alto*0.5 : JUG.y + JUG_LADO - alto*0.5;
    gSq.position.set(JUG.x, cy, -JUG_LADO*0.5);
    gSq.scale.set(1 + k*0.55, 1 - k, 1 + k*0.25);
    gJug.rotation.z = JUG.modo === 'nave' ? JUG.giro : -JUG.giro;
  }
}

function pinta(){
  if (REV3D !== MUNDO.rev) mundo3D();
  /* la nave y el cubo son mallas distintas, asi que el icono se rearma al cambiar
     de modo — una vez, no en cada cuadro */
  if (MODO3D !== JUG.modo){ MODO3D = JUG.modo; ponIcono(); }
  const t = musTiempo();
  /* el pulso: 1 en el golpe y cae hasta el siguiente. Sale del reloj de la
     musica, asi que la imagen y el tema no pueden desincronizarse. */
  const pulso = t == null ? 0 : Math.pow(1 - (((t % 1) + 1) % 1), 3);

  /* el color del tramo: cambia solo con la x y funde en siete bloques */
  paletaPaso(NIVELES[EST.nivel]);
  ponTelon();

  /* el canto y la reja laten con el compas: es lo unico estetico del juego y no
     cuesta ni una llamada de dibujo, porque los materiales son compartidos */
  matReja.opacity = 0.11 + pulso*0.10;
  /* el fondo late con el compas, y CADA CAPA CON SU FUERZA: latiendo todas
     igual, las tres se leen como una sola imagen y el paralaje deja de contar */
  CAPAS[0].mat.opacity = CAPAS[0].opa + pulso*0.14;
  CAPAS[1].mat.opacity = CAPAS[1].opa + pulso*0.07;
  CAPAS[2].mat.opacity = CAPAS[2].opa + pulso*0.04;
  matMotas.opacity = 0.28 + pulso*0.42;
  ren.toneMappingExposure = 1.10 + pulso*0.12;

  /* el jugador */
  ponJug();

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
      /* el portal gira: es lo que dice que esta vivo y esperando */
      m.rotation.y = (t || 0)*1.4;
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

const _cajaCubo = new T.Box3();
function cuboDe(){
  ponJug();
  gSq.updateMatrixWorld(true);
  _cajaCubo.setFromObject(gSq);
  /* la caja envolvente crece con el GIRO, asi que para comprobar el anclaje hay
     que mirar la cara de apoyo sin el giro: sale de la posicion y la escala que
     el objeto tiene puestas, no de repetir la cuenta del dibujo */
  const eY = gSq.scale.y, py = gSq.position.y;
  const pie = py - JUG_LADO*eY*0.5, techo = py + JUG_LADO*eY*0.5;
  return { abajo: +_cajaCubo.min.y.toFixed(4), arriba: +_cajaCubo.max.y.toFixed(4),
           alto: +(_cajaCubo.max.y - _cajaCubo.min.y).toFixed(4),
           ancho: +(_cajaCubo.max.x - _cajaCubo.min.x).toFixed(4),
           pie: +pie.toFixed(4), techo: +techo.toFixed(4),
           ancla: +((JUG.grav > 0 ? pie - JUG.y : techo - (JUG.y + JUG_LADO))).toFixed(4),
           altoG: +(JUG_LADO*eY).toFixed(4), anchoG: +(JUG_LADO*gSq.scale.x).toFixed(4),
           pieJug: +JUG.y.toFixed(4), grav: JUG.grav, sq: +SQ.x.toFixed(4) };
}
function efeDe(){
  return { sac: +EFE.sac.toFixed(3), zoom: +EFE.zoom.toFixed(4), hit: +EFE.hit.toFixed(3),
           sq: +SQ.x.toFixed(3), sqv: +SQ.v.toFixed(3), flash: +FLA.toFixed(3),
           /* cuanto se corre la camara, en bloques, y cuanto cambia el encuadre */
           sacBloques: +Math.hypot(_sacX, _sacY).toFixed(3),
           camD: +cam.position.z.toFixed(3), camDBase: +CAM.d.toFixed(3),
           opacidades: CAPAS.map(c => +c.mat.opacity.toFixed(3)),
           motas: +matMotas.opacity.toFixed(3) };
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
