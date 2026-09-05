
/* ══════════════════════ EL DIBUJO ══════════════════════
   ── CAMARA ORTOGRAFICA, Y NO ES UN GUSTO ──
   En una picada con perspectiva una fila lejana se ve mas angosta que una
   cercana, asi que la misma columna cambia de sitio en pantalla segun donde
   este: en un juego de saltar de casilla en casilla eso es exactamente lo que no
   puede pasar. Con ortografica una columna es una columna en toda la pantalla.

   ── Y EL PIXELADO ES UN DESTINO DE RENDER CHICO, NO UN FILTRO ──
   La escena se dibuja en un destino reducido y se estira con NEAREST; encima va
   una pasada que sube la saturacion y cuantiza el color. Asi el estilo y el
   costo son la misma decision: bajar la calidad hace el juego MAS pixelado, que
   es para donde queria ir igual. */
const cv = document.getElementById('cv');
const render = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance' });
render.outputColorSpace = T.SRGBColorSpace;
render.toneMapping = T.ACESFilmicToneMapping; render.toneMappingExposure = 1.26;
render.info.autoReset = false;
const escena = new T.Scene();
const CIELO = new T.Color(0xb4e2f2);
escena.background = CIELO;
/* ── LA NIEBLA SE MIDE DESDE LA CAMARA, Y LA CAMARA ESTA LEJOS ──
   Con ortografica la distancia del lente no cambia el tamano, asi que uno la
   pone donde quiere — pero la niebla SI la mide. Con la camara a 26 unidades y
   la niebla de 15 a 30, la escena entera caia adentro: medido, todo el cuadro
   salia lavado de azul cielo, hasta el pasto de al lado del carpincho. Los dos
   numeros salen de la distancia: la fila del jugador esta a `DIST − 2` y cada
   fila hacia adelante suma `cos(EL)` = 0,62, asi que empezar en `DIST + 5` y
   cerrar en `DIST + 13` funde las filas 11 a 24 y no toca nada mas cerca. */
const DIST = 34;
escena.fog = new T.Fog(0xb4e2f2, DIST + 5, DIST + 13);

const ANCHO_VISTA = 9.3;        /* columnas que entran de ancho */
const EL = 0.90;                /* la elevacion de la camara, en radianes (51,6 grados) */
const cam = new T.OrthographicCamera(-5, 5, 5, -5, 1, 90);
const HUD_PX = { w: 412, h: 892 };
let RT = null, PIX = 2.6;
function medir(){
  const w = cv.clientWidth || 412, h = cv.clientHeight || 892;
  HUD_PX.w = w; HUD_PX.h = h;
  document.documentElement.style.setProperty('--mw', w + 'px');
  const C = CALIDADES[CALIDAD];
  PIX = C.pix;
  render.setPixelRatio(1);
  render.setSize(w, h, false);
  const rw = Math.max(120, Math.round(w/PIX)), rh = Math.max(200, Math.round(h/PIX));
  if (RT) RT.dispose();
  RT = new T.WebGLRenderTarget(rw, rh, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true });
  postMat.uniforms.uTex.value = RT.texture;
  const a = w/h, alto = ANCHO_VISTA/a;
  cam.left = -ANCHO_VISTA/2; cam.right = ANCHO_VISTA/2; cam.top = alto/2; cam.bottom = -alto/2;
  cam.updateProjectionMatrix();
  /* ── EL CARPINCHO VA AL 35 % DEL ALTO ──
     Con la camara mirando al jugador queda en el centro y la mitad de abajo del
     cuadro no muestra nada que importe. Corriendo el punto al que mira `ADEL`
     filas hacia adelante, el cuerpo baja `ADEL·sin(EL)` unidades de pantalla: se
     ve lo que viene, que es lo unico que hay que decidir. */
  ADEL = (alto*0.15)/Math.sin(EL);
  /* el mapa viejo hay que soltarlo a mano: three.js no lo recrea porque cambie `mapSize` */
  if (sombra){ sombra.shadow.mapSize.set(C.sombra || 512, C.sombra || 512); sombra.castShadow = !!C.sombra; if (sombra.shadow.map){ sombra.shadow.map.dispose(); sombra.shadow.map = null; } }
  render.shadowMap.enabled = !!C.sombra;
}
let ADEL = 3.6;
addEventListener('resize', medir);

/* ══════════ LA PASADA DE PIXELADO Y SATURACION ══════════ */
const postMat = new T.ShaderMaterial({
  uniforms: { uTex: { value: null }, uSat: { value: 1.22 }, uPasos: { value: 26.0 }, uVin: { value: 0.18 } },
  depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D uTex; uniform float uSat, uPasos, uVin; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(uTex, vUv).rgb;
      /* la saturacion se hace contra la LUMA y no contra el promedio: con el
         promedio, subir la saturacion tambien cambia el brillo y los verdes del
         pasto se van a fosforescente */
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = clamp(mix(vec3(l), c, uSat), 0.0, 1.0);
      /* la cuantizacion va DESPUES de saturar: al reves los escalones se
         separan de nuevo al estirar el color y no se ve el corte */
      c = floor(c*uPasos + 0.5)/uPasos;
      float d = distance(vUv, vec2(0.5)); c *= 1.0 - uVin*d*d*2.2;
      gl_FragColor = vec4(c, 1.0);
    }`
});
const postEsc = new T.Scene(), postCam = new T.Camera();
postEsc.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));

/* ══════════ LAS LUCES ══════════ */
const sol = new T.DirectionalLight(0xfff4e2, 2.35); sol.position.set(6, 12, 5); escena.add(sol); escena.add(sol.target);
/* el color de abajo del hemisferico no puede ser oscuro: reparte segun hacia
   donde mira la cara, asi que con un verde apagado toda cara que mire al piso
   —los costados de los autos, la panza del carpincho— recibe casi nada */
escena.add(new T.HemisphereLight(0xdff2ff, 0x86a05e, 1.25));
/* ── LA SOMBRA LA PROYECTA EL SOL, NO UNA LUZ APARTE ──
   Empece con una direccional de intensidad CERO dedicada a la sombra, que es lo
   que uno escribiria: no funciona, y la razon es de three.js — la sombra de una
   luz solo puede oscurecer LO QUE ESA LUZ APORTA, asi que con intensidad cero no
   oscurece nada y la escena queda igual de plana. Proyecta el sol.
   La caja va CHICA y sigue al jugador: el mapa de sombra cubre un area fija y
   repartirlo sobre cien filas deja el contorno hecho un peine. */
const sombra = sol;
sol.castShadow = true; sol.shadow.camera.left = -8; sol.shadow.camera.right = 8;
sol.shadow.camera.top = 11; sol.shadow.camera.bottom = -11; sol.shadow.camera.near = 1; sol.shadow.camera.far = 44;
sol.shadow.bias = -0.0014; sol.shadow.normalBias = 0.03;

/* ══════════ FUNDIR PIEZAS ══════════ */
function fundir(piezas){
  const pos = [], nor = [], col = [];
  const c = new T.Color(), m = new T.Matrix4(), nm = new T.Matrix3(), v = new T.Vector3();
  for (const p of piezas){
    const g = p.g.index ? p.g.toNonIndexed() : p.g;
    m.compose(new T.Vector3(...(p.p || [0, 0, 0])), new T.Quaternion().setFromEuler(new T.Euler(...(p.r || [0, 0, 0]))), new T.Vector3(...(p.s || [1, 1, 1])));
    nm.getNormalMatrix(m); const P = g.attributes.position, N = g.attributes.normal; c.set(p.c);
    for (let i = 0; i < P.count; i++){
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
    }
  }
  const G = new T.BufferGeometry();
  G.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  G.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  G.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  return G;
}
const matVert = new T.MeshLambertMaterial({ vertexColors: true });

/* ══════════ LOS ASSETS DE REZONA ══════════
   ── NADA REEMPLAZA A LO DIBUJADO HASTA QUE LLEGA ──
   Los siete modelos y el titulo viven en `ASSETS_B64`. Mientras decodifican se ve
   la version por codigo, y cada uno pisa la suya cuando esta: un base64 roto
   cuesta una pieza y no la pantalla. */
const GLB = { fallas: [], listos: [] };
const cargadorGLTF = new GLTFLoader();
function cargaAssets(){
  if (typeof ASSETS_B64 === 'undefined') return;
  const A = ASSETS_B64;
  if (A.titulo){
    const im = document.getElementById('logo');
    im.onload = () => { im.style.display = 'block'; document.getElementById('mTit').style.display = 'none'; };
    im.onerror = () => GLB.fallas.push('titulo');
    im.src = A.titulo;
  }
  for (const k of ['carpincho', 'auto', 'camion', 'colectivo', 'tren', 'arbol', 'camalote']){
    if (!A[k]) continue;
    cargadorGLTF.load(A[k], (g) => {
      let m = null; g.scene.traverse(o => { if (o.isMesh && !m) m = o; });
      if (!m) return;
      m.geometry.computeBoundingBox();
      GLB[k] = m; GLB.listos.push(k);
      if (k === 'carpincho') armaCarpincho(); else ponModelo(k);
    }, undefined, () => GLB.fallas.push(k));
  }
}
/* ── EL MODELO SE ESCALA A LA MEDIDA QUE EL JUEGO YA USA ──
   Tripo devuelve la malla dentro de una caja de lado 2 y sin escala fisica: lo
   que decide el tamano es el juego, no el archivo. Se mide la caja y se lleva su
   eje largo a los metros que la casilla necesita, apoyando la base en el piso. */
function ajusta(m, largoObj, girar, caja){
  const bb = m.geometry.boundingBox, t = new T.Vector3(); bb.getSize(t);
  const ejeL = Math.max(t.x, t.z);
  const k = largoObj/Math.max(0.001, ejeL);
  const gr = new T.Group();
  const h = m.clone();
  /* ── LA LOCOMOTORA SE AJUSTA EJE POR EJE ──
     El generador devolvio una maquina de vapor de proporcion casi cubica
     (9,00 x 8,15 x 4,98 medido). Escalada de forma uniforme para que midiera
     los nueve de largo del choque, quedaba OCHO UNIDADES DE ALTO: doce veces
     el carpincho, tapando media pantalla. Lo que tiene que coincidir con la
     simulacion es la caja, no la proporcion de la malla. */
  if (caja){
    /* si el eje largo de la malla es Z, el objetivo de X y el de Z se
       intercambian ANTES de escalar: girar despues de un escalado por eje
       llevaria el largo al fondo */
    const gira = girar && t.z > t.x;
    const cx = gira ? caja[2] : caja[0], cz = gira ? caja[0] : caja[2];
    const kx = cx/Math.max(0.001, t.x), ky = caja[1]/Math.max(0.001, t.y), kz = cz/Math.max(0.001, t.z);
    h.scale.set(kx, ky, kz);
    h.position.set(-(bb.min.x + bb.max.x)/2*kx, -bb.min.y*ky, -(bb.min.z + bb.max.z)/2*kz);
    if (gira){ const g2 = new T.Group(); g2.add(h); g2.rotation.y = Math.PI/2; gr.add(g2); }
    else gr.add(h);
    gr.updateMatrixWorld(true); return gr;
  }
  h.scale.setScalar(k);
  h.position.set(-(bb.min.x + bb.max.x)/2*k, -bb.min.y*k, -(bb.min.z + bb.max.z)/2*k);
  /* si el modelo vino largo sobre Z y lo queremos sobre X (los vehiculos cruzan
     de costado), se lo gira un cuarto de vuelta */
  if (girar && t.z > t.x){ const g2 = new T.Group(); g2.add(h); g2.rotation.y = Math.PI/2; gr.add(g2); }
  else gr.add(h);
  gr.updateMatrixWorld(true);
  return gr;
}

/* ══════════ EL SUELO ══════════
   Una malla instanciada de cajas, una por fila visible, con el color por
   instancia. Con una malla por fila serian treinta llamadas de dibujo para
   pintar treinta rectangulos. */
const N_FILAS = FILAS_VISTA + 12;
const COL_FILA = { pasto: [0x86cc58, 0x7bbf4f], arena: [0xeadaa0, 0xe0cf92], ruta: [0x6a6a78, 0x63636f],
                   rio: [0x2f7ab0, 0x2a6fa0], via: [0xa8926c, 0x9c8763] };
/* el suelo cubre el ancho visible y un poco mas: con 25 de ancho los bordes
   quedaban a doce unidades del centro y la niebla los pintaba de otro color */
const ANCHO_M = 15;
const filasM = new T.InstancedMesh(new T.BoxGeometry(ANCHO_M, 0.42, 1), new T.MeshLambertMaterial({}), N_FILAS);
filasM.receiveShadow = true; filasM.instanceColor = new T.InstancedBufferAttribute(new Float32Array(N_FILAS*3), 3);
filasM.frustumCulled = false; escena.add(filasM);
/* las rayas de la ruta y los rieles de la via: la misma malla, otro color */
const N_RAYA = N_FILAS*12;
const rayasM = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.02, 0.09), new T.MeshBasicMaterial({}), N_RAYA);
rayasM.instanceColor = new T.InstancedBufferAttribute(new Float32Array(N_RAYA*3), 3);
rayasM.frustumCulled = false; escena.add(rayasM);
/* ── EL AGUA ──
   Un plano de color liso no se lee a agua: se lee a rectangulo azul. Lo que la
   hace agua son DOS cosas, y ninguna es el color: crestas horizontales y que se
   MUEVAN. Va como una textura chiquita de 32 px con filtro NEAREST — a proposito,
   porque el juego entero se dibuja a resolucion reducida y estirado con NEAREST:
   una textura suave seria lo unico liso del cuadro. */
function texAgua(){
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#3f93c8'; x.fillRect(0, 0, 32, 32);
  for (let j = 0; j < 32; j++){
    const s1 = Math.sin(j*0.71), s2 = Math.sin(j*0.29 + 1.7);
    const v = s1*0.6 + s2*0.4;
    x.fillStyle = v > 0.55 ? '#63b4de' : v > 0.1 ? '#4c9fce' : v < -0.6 ? '#2d7cae' : '#3f93c8';
    x.fillRect(0, j, 32, 1);
  }
  /* unas crestas cortas que cortan las bandas: sin ellas se lee a persiana */
  x.fillStyle = '#8fd2f0';
  for (let i = 0; i < 26; i++){
    const px = ((i*11 + (i*i)%7)*3)%32, py = ((i*13 + 5)%32);
    x.fillRect(px, py, 3, 1);
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;
  t.repeat.set(ANCHO_M/2.6, 1);
  return t;
}
const AGUA_TEX = texAgua();
const aguaMat = new T.MeshLambertMaterial({ map: AGUA_TEX, color: 0xffffff, transparent: true, opacity: 0.92 });

/* ══════════ LO QUE SE INSTANCIA ══════════ */
function geoArbol(){
  return fundir([
    { g: new T.CylinderGeometry(0.10, 0.14, 0.55, 7), c: '#6a4526', p: [0, 0.27, 0] },
    { g: new T.SphereGeometry(0.42, 9, 7), c: '#3f8a3a', p: [0, 0.78, 0], s: [1, 0.9, 1] },
    { g: new T.SphereGeometry(0.30, 9, 7), c: '#4a9c44', p: [0.08, 1.12, -0.05] }
  ]);
}
function geoPiedra(){
  return fundir([
    { g: new T.IcosahedronGeometry(0.34, 0), c: '#8f9099', p: [0, 0.24, 0], s: [1.15, 0.85, 1] },
    { g: new T.IcosahedronGeometry(0.18, 0), c: '#7d7e88', p: [0.24, 0.14, 0.12] }
  ]);
}
function geoAuto(V, cuerpo, techo){
  return fundir([
    { g: new T.BoxGeometry(V.largo, 0.34, V.ancho), c: cuerpo, p: [0, 0.29, 0] },
    { g: new T.BoxGeometry(V.largo*0.5, 0.26, V.ancho*0.88), c: techo, p: [-V.largo*0.08, 0.56, 0] },
    { g: new T.CylinderGeometry(0.13, 0.13, 0.09, 8), c: '#22242a', p: [V.largo*0.3, 0.13, V.ancho/2], r: [0, 0, 1.5708] },
    { g: new T.CylinderGeometry(0.13, 0.13, 0.09, 8), c: '#22242a', p: [-V.largo*0.3, 0.13, V.ancho/2], r: [0, 0, 1.5708] },
    { g: new T.CylinderGeometry(0.13, 0.13, 0.09, 8), c: '#22242a', p: [V.largo*0.3, 0.13, -V.ancho/2], r: [0, 0, 1.5708] },
    { g: new T.CylinderGeometry(0.13, 0.13, 0.09, 8), c: '#22242a', p: [-V.largo*0.3, 0.13, -V.ancho/2], r: [0, 0, 1.5708] }
  ]);
}
function geoCamalote(){
  return fundir([
    { g: new T.BoxGeometry(1, 0.16, 0.86), c: '#2f7a3a', p: [0, 0.10, 0] },
    { g: new T.SphereGeometry(0.24, 8, 6), c: '#48a04a', p: [0.22, 0.20, 0.14], s: [1.2, 0.55, 1.2] },
    { g: new T.SphereGeometry(0.22, 8, 6), c: '#3f9442', p: [-0.24, 0.20, -0.12], s: [1.2, 0.55, 1.2] },
    { g: new T.SphereGeometry(0.10, 7, 5), c: '#9a6ad0', p: [0.02, 0.28, 0.02] }
  ]);
}
function geoTren(){
  return fundir([
    { g: new T.BoxGeometry(TREN.largo, 0.78, 0.94), c: '#2a5a3a', p: [0, 0.62, 0] },
    { g: new T.BoxGeometry(TREN.largo, 0.10, 0.98), c: '#c8342a', p: [0, 0.52, 0] },
    { g: new T.BoxGeometry(TREN.largo*0.9, 0.28, 0.72), c: '#1e4a2e', p: [0, 1.12, 0] },
    { g: new T.CylinderGeometry(0.16, 0.16, 0.1, 8), c: '#12141a', p: [TREN.largo*0.42, 0.62, 0.5], r: [1.5708, 0, 0] }
  ]);
}
const PROC = {
  arbol: geoArbol(), piedra: geoPiedra(), camalote: geoCamalote(), tren: geoTren(),
  auto: geoAuto(VEHIS.auto, '#d8402e', '#b8331f'),
  camion: geoAuto(VEHIS.camion, '#e8eef2', '#7fbce0'),
  colectivo: geoAuto(VEHIS.colectivo, '#f2c422', '#2f9c5a')
};
/* los tamanos con los que se lleva cada modelo generado a la casilla */
const LARGO_MOD = { auto: VEHIS.auto.largo, camion: VEHIS.camion.largo, colectivo: VEHIS.colectivo.largo,
                    tren: TREN.largo, arbol: 0.9, camalote: 1.0 };
/* el largo sale del choque; el alto y el fondo, de que se lea a locomotora al
   lado de un carpincho de 0,68 */
const CAJA_TREN = [TREN.largo, 1.85, 1.40];
const N_INST = { arbol: 46, piedra: 22, auto: 38, camion: 18, colectivo: 16, camalote: 58, moneda: 16, tren: 4 };
const INST = {};
for (const k in N_INST){
  let g = PROC[k];
  if (k === 'moneda') g = new T.TorusGeometry(0.24, 0.09, 7, 14);
  const mat = k === 'moneda' ? new T.MeshStandardMaterial({ color: 0xffd447, metalness: 0.7, roughness: 0.32, emissive: 0x6a4a00 }) : matVert;
  const im = new T.InstancedMesh(g, mat, N_INST[k]);
  im.frustumCulled = false; im.count = 0; im.castShadow = k !== 'camalote' && k !== 'moneda';
  im.receiveShadow = k === 'camalote';
  escena.add(im); INST[k] = im;
}
/* ── UN MODELO GENERADO REEMPLAZA A SU MALLA INSTANCIADA ──
   Se conserva la cuenta y el sitio: lo unico que cambia es la geometria y el
   material, asi que la simulacion no se entera de nada. */
function ponModelo(k){
  /* ── EL CAMALOTE TAMBIEN SE GIRA ──
     `ajusta` normaliza el eje mas largo a `largoObj`. Si la malla vino larga
     sobre Z, la X queda mucho mas corta, y el `ex` de la instancia escala la X:
     medido, un camalote de dos columnas se dibujaba de una. Girandolo, el eje
     largo cae sobre X y ahi si `ex` lo ensancha de verdad. */
  const gr = ajusta(GLB[k], LARGO_MOD[k], k === 'auto' || k === 'camion' || k === 'colectivo' || k === 'tren' || k === 'camalote', k === 'tren' ? CAJA_TREN : null);
  let malla = null; gr.traverse(o => { if (o.isMesh && !malla) malla = o; });
  if (!malla) return;
  malla.updateMatrixWorld(true);
  const g = malla.geometry.clone(); g.applyMatrix4(malla.matrixWorld);
  const viejo = INST[k];
  const im = new T.InstancedMesh(g, malla.material, N_INST[k]);
  im.frustumCulled = false; im.count = 0; im.castShadow = k !== 'camalote'; im.receiveShadow = k === 'camalote';
  escena.remove(viejo); viejo.geometry.dispose(); escena.add(im); INST[k] = im;
}

/* ══════════ EL CARPINCHO ══════════ */
const carp = new T.Group(); escena.add(carp);
const cuerpoG = new T.Group(); carp.add(cuerpoG);
let CARP = { piel: null, glb: false };
function geoCarpincho(){
  return fundir([
    { g: new T.SphereGeometry(0.34, 10, 8), c: '#9a7448', p: [0, 0.34, 0], s: [0.86, 0.78, 1.15] },
    { g: new T.SphereGeometry(0.22, 9, 7), c: '#a67d4e', p: [0, 0.44, 0.34], s: [1, 0.9, 1.05] },
    { g: new T.BoxGeometry(0.16, 0.09, 0.09), c: '#8a6640', p: [0, 0.36, 0.52] },
    { g: new T.SphereGeometry(0.06, 6, 5), c: '#6a4e30', p: [0.13, 0.58, 0.30] },
    { g: new T.SphereGeometry(0.06, 6, 5), c: '#6a4e30', p: [-0.13, 0.58, 0.30] },
    { g: new T.SphereGeometry(0.045, 6, 5), c: '#221a12', p: [0.11, 0.50, 0.47] },
    { g: new T.SphereGeometry(0.045, 6, 5), c: '#221a12', p: [-0.11, 0.50, 0.47] },
    { g: new T.CylinderGeometry(0.07, 0.07, 0.16, 6), c: '#7d5c38', p: [0.17, 0.08, 0.22] },
    { g: new T.CylinderGeometry(0.07, 0.07, 0.16, 6), c: '#7d5c38', p: [-0.17, 0.08, 0.22] },
    { g: new T.CylinderGeometry(0.07, 0.07, 0.16, 6), c: '#7d5c38', p: [0.17, 0.08, -0.22] },
    { g: new T.CylinderGeometry(0.07, 0.07, 0.16, 6), c: '#7d5c38', p: [-0.17, 0.08, -0.22] }
  ]);
}
/* ── EL ACCESORIO ES LA PIEL, Y VA POR CODIGO ──
   El carpincho es UN modelo con su textura; catorce modelos serian catorce
   descargas para cambiar un sombrero. La piel multiplica el color y le cuelga
   una pieza de la cabeza, cuya altura sale de la caja del propio modelo: asi el
   gorro cae donde va tanto en el carpincho generado como en el de cajas. */
function armaAccesorio(tipo, alto, frente){
  const g = new T.Group(); if (!tipo) return g;
  const P = (piezas) => g.add(new T.Mesh(fundir(piezas), matVert));
  if (tipo === 'gorra') P([
    { g: new T.SphereGeometry(0.20, 9, 6, 0, 6.28, 0, 1.5), c: '#d8402e', p: [0, alto*0.97, frente*0.55] },
    { g: new T.BoxGeometry(0.30, 0.03, 0.20), c: '#b8331f', p: [0, alto*0.96, frente*0.55 + 0.20] }]);
  else if (tipo === 'paja') P([
    { g: new T.CylinderGeometry(0.36, 0.38, 0.03, 12), c: '#e0c274', p: [0, alto*0.99, frente*0.5] },
    { g: new T.CylinderGeometry(0.17, 0.20, 0.16, 10), c: '#d8b45e', p: [0, alto*1.06, frente*0.5] }]);
  else if (tipo === 'bufanda') P([
    { g: new T.TorusGeometry(0.20, 0.07, 6, 12), c: '#c8342a', p: [0, alto*0.62, frente*0.28], r: [1.5708, 0, 0] },
    { g: new T.BoxGeometry(0.12, 0.28, 0.06), c: '#c8342a', p: [0.16, alto*0.48, frente*0.22] }]);
  else if (tipo === 'vincha') P([
    { g: new T.TorusGeometry(0.21, 0.035, 6, 14), c: '#5aa8e0', p: [0, alto*0.90, frente*0.5], r: [1.4, 0, 0] }]);
  else if (tipo === 'lentes') P([
    { g: new T.BoxGeometry(0.34, 0.09, 0.04), c: '#1a1a22', p: [0, alto*0.78, frente*0.92] }]);
  else if (tipo === 'casco') P([
    { g: new T.SphereGeometry(0.22, 9, 6, 0, 6.28, 0, 1.5), c: '#f2b21a', p: [0, alto*0.97, frente*0.5] },
    { g: new T.CylinderGeometry(0.29, 0.29, 0.025, 12), c: '#e0a010', p: [0, alto*0.96, frente*0.5] }]);
  else if (tipo === 'corona') P([
    { g: new T.CylinderGeometry(0.20, 0.20, 0.10, 8), c: '#f2c422', p: [0, alto*1.02, frente*0.5] },
    { g: new T.ConeGeometry(0.05, 0.12, 5), c: '#f2c422', p: [0, alto*1.10, frente*0.5 + 0.16] },
    { g: new T.ConeGeometry(0.05, 0.12, 5), c: '#f2c422', p: [0.16, alto*1.10, frente*0.5] },
    { g: new T.ConeGeometry(0.05, 0.12, 5), c: '#f2c422', p: [-0.16, alto*1.10, frente*0.5] }]);
  else if (tipo === 'mate') P([
    { g: new T.SphereGeometry(0.14, 9, 7), c: '#6a4526', p: [0.24, alto*0.62, -0.02] },
    { g: new T.CylinderGeometry(0.02, 0.02, 0.28, 5), c: '#c8ced6', p: [0.30, alto*0.80, -0.02], r: [0, 0, -0.3] }]);
  return g;
}
function armaCarpincho(){
  const P = PIELES.find(p => p.id === PROG.piel) || PIELES[0];
  if (CARP.piel === P.id && CARP.glb === !!GLB.carpincho && cuerpoG.children.length) return;
  CARP = { piel: P.id, glb: !!GLB.carpincho };
  while (cuerpoG.children.length){ const c = cuerpoG.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  let alto = 0.68, frente = 0.5;
  if (GLB.carpincho){
    const gr = ajusta(GLB.carpincho, 1.02, false);
    let m = null; gr.traverse(o => { if (o.isMesh && !m) m = o; });
    const mat = m.material.clone();
    mat.color = new T.Color(P.tinte); mat.metalness = 0; mat.roughness = 0.7;
    if (P.fantasma){ mat.transparent = true; mat.opacity = 0.62; }
    m.material = mat; m.castShadow = true;
    gr.traverse(o => { if (o.isMesh) o.castShadow = true; });
    cuerpoG.add(gr);
    const bb = new T.Box3().setFromObject(gr), t = new T.Vector3(); bb.getSize(t);
    alto = t.y; frente = t.z/2;
  } else {
    const m = new T.Mesh(geoCarpincho(), new T.MeshLambertMaterial({ vertexColors: true, color: P.tinte,
      transparent: !!P.fantasma, opacity: P.fantasma ? 0.62 : 1 }));
    m.castShadow = true; cuerpoG.add(m); alto = 0.68; frente = 0.5;
  }
  cuerpoG.add(armaAccesorio(P.acc, alto, frente));
  carp.alto = alto;
}

/* ══════════ LA FICHA DE UNA PIEL ══════════
   Un cuadrado con el color no dice nada: lo que hay que ver es al carpincho con
   esa piel puesta, asi que la ficha lo dibuja de perfil con su accesorio. */
function pintaFicha(P, x, w, h){
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7bbf4f'); g.addColorStop(1, '#3f7a34');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const cx = w*0.5, cy = h*0.60, r = w*0.30;
  const t = new T.Color(P.tinte), base = new T.Color(0x9a7448).multiply(t);
  const hex = '#' + base.getHexString(), osc = '#' + base.clone().multiplyScalar(0.72).getHexString();
  if (P.fantasma) x.globalAlpha = 0.72;
  x.fillStyle = osc;
  for (const dx of [-0.62, -0.2, 0.28, 0.66]){ x.fillRect(cx + r*dx - w*0.035, cy + r*0.5, w*0.07, h*0.12); }
  x.fillStyle = hex;
  x.beginPath(); x.ellipse(cx - r*0.15, cy, r*1.05, r*0.78, 0, 0, 6.29); x.fill();
  x.beginPath(); x.ellipse(cx + r*0.82, cy - r*0.28, r*0.56, r*0.5, 0, 0, 6.29); x.fill();
  x.fillStyle = osc; x.beginPath(); x.ellipse(cx + r*1.24, cy - r*0.16, r*0.2, r*0.15, 0, 0, 6.29); x.fill();
  x.fillStyle = '#221a12'; x.beginPath(); x.arc(cx + r*0.98, cy - r*0.42, w*0.022, 0, 6.29); x.fill();
  x.globalAlpha = 1;
  /* el accesorio, en dos trazos: lo que importa es que se distinga de lejos */
  const a = P.acc, top = cy - r*0.78;
  if (a === 'gorra'){ x.fillStyle = '#d8402e'; x.beginPath(); x.arc(cx + r*0.82, top + r*0.1, r*0.42, Math.PI, 0); x.fill(); x.fillRect(cx + r*0.9, top + r*0.06, r*0.8, h*0.022); }
  else if (a === 'paja'){ x.fillStyle = '#e0c274'; x.fillRect(cx + r*0.05, top, r*1.6, h*0.028); x.beginPath(); x.arc(cx + r*0.85, top + r*0.02, r*0.34, Math.PI, 0); x.fill(); }
  else if (a === 'bufanda'){ x.fillStyle = '#c8342a'; x.fillRect(cx + r*0.44, cy - r*0.1, r*0.34, h*0.075); }
  else if (a === 'vincha'){ x.strokeStyle = '#5aa8e0'; x.lineWidth = h*0.028; x.beginPath(); x.arc(cx + r*0.82, top + r*0.2, r*0.42, Math.PI*1.08, Math.PI*1.92); x.stroke(); }
  else if (a === 'lentes'){ x.fillStyle = '#1a1a22'; x.fillRect(cx + r*0.72, cy - r*0.52, r*0.62, h*0.038); }
  else if (a === 'casco'){ x.fillStyle = '#f2b21a'; x.beginPath(); x.arc(cx + r*0.82, top + r*0.14, r*0.4, Math.PI, 0); x.fill(); x.fillRect(cx + r*0.3, top + r*0.1, r*1.05, h*0.026); }
  else if (a === 'corona'){ x.fillStyle = '#f2c422'; const bx = cx + r*0.5, by = top - r*0.05; x.fillRect(bx, by, r*0.66, h*0.05);
    for (let i = 0; i < 3; i++){ x.beginPath(); x.moveTo(bx + r*0.06 + i*r*0.27, by); x.lineTo(bx + r*0.19 + i*r*0.27, by - h*0.05); x.lineTo(bx + r*0.32 + i*r*0.27, by); x.fill(); } }
  else if (a === 'mate'){ x.fillStyle = '#6a4526'; x.beginPath(); x.arc(cx - r*0.9, cy - r*0.1, r*0.24, 0, 6.29); x.fill();
    x.strokeStyle = '#c8ced6'; x.lineWidth = h*0.02; x.beginPath(); x.moveTo(cx - r*0.86, cy - r*0.3); x.lineTo(cx - r*0.7, cy - r*0.8); x.stroke(); }
}

/* ══════════ COLOCAR TODO ══════════ */
const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _p3 = new T.Vector3(), _s3 = new T.Vector3(), _c3 = new T.Color();
const aguas = [];
for (let i = 0; i < 10; i++){
  const m = new T.Mesh(new T.PlaneGeometry(ANCHO_M, 1, 1, 1), aguaMat);
  m.rotation.x = -Math.PI/2; m.visible = false; m.frustumCulled = false; escena.add(m); aguas.push(m);
}
const EFE = { t: 0, fCam: 0, xCam: 0, sac: 0, giro: 0, menuT: 0 };
let F_DIB = 0, X_DIB = 0;

function pinta(dt){
  const R = RUN;
  EFE.t += dt;
  const enMenu = !R || R.fase !== 'juega' || PANTALLA !== '';
  const f = R ? R.sf : 0, x = R ? R.sx : 0;
  F_DIB = f; X_DIB = x;
  /* la camara sigue al jugador con un resorte: sin suavizar, cada salto es un
     tiron de una fila entera y el mundo parece que da saltos, no el carpincho */
  const kf = Math.min(1, dt*11);
  EFE.fCam += (f - EFE.fCam)*kf; EFE.xCam += (cl(x, -2.2, 2.2)*0.55 - EFE.xCam)*kf;
  /* ── EN EL MENU EL CARPINCHO SUBE AL HUECO DEL VELO ──
     Jugando conviene tenerlo bajo, porque lo que hay que ver es lo que viene;
     en el menu el velo se abre en la franja de arriba y ahi es donde tiene que
     estar el personaje, asi que el punto al que mira la camara pasa a estar
     DETRAS de el. */
  const adel = enMenu ? -(ANCHO_VISTA/(HUD_PX.w/HUD_PX.h))*0.14/Math.sin(EL) : ADEL;
  EFE.adel = EFE.adel == null ? adel : EFE.adel + (adel - EFE.adel)*Math.min(1, dt*5);
  const mz = -(EFE.fCam + EFE.adel), mx = EFE.xCam;
  /* el agua corre: la textura se desplaza, no la geometria */
  AGUA_TEX.offset.y = (EFE.t*0.11) % 1;
  AGUA_TEX.offset.x = (EFE.t*0.035) % 1;
  const sac = R ? R.sacude*0.16 : 0;
  const d = new T.Vector3(0, Math.sin(EL), Math.cos(EL)).multiplyScalar(DIST);
  cam.position.set(mx + d.x + (Math.random() - 0.5)*sac, d.y + (Math.random() - 0.5)*sac, mz + d.z);
  cam.lookAt(mx, 0, mz);
  sol.position.set(mx + 6, 16, mz + 7); sol.target.position.set(mx, 0, mz); sol.target.updateMatrixWorld();
  escena.fog.near = DIST + 5; escena.fog.far = DIST + 13;

  /* el carpincho: el arco del salto y el giro hacia donde mira */
  const arco = R && R.salta ? Math.sin(Math.min(1, R.ts/SALTO_T)*Math.PI)*SALTO_ALTO : 0;
  carp.position.set(x, 0.21 + arco, -f);
  const mira = R ? R.mira : 0;
  EFE.giro += (mira - EFE.giro)*Math.min(1, dt*16);
  carp.rotation.y = EFE.giro;
  /* aplastarse al aterrizar: es lo unico que hace que un salto se lea a salto y
     no a una traslacion */
  const kk = R && R.salta ? Math.min(1, R.ts/SALTO_T) : 1;
  const est = R && R.salta ? 1 + 0.22*Math.sin(kk*Math.PI) : 1;
  cuerpoG.scale.set(1/Math.sqrt(est), est, 1/Math.sqrt(est));
  if (enMenu){ EFE.menuT += dt; carp.position.set(0, 0.21 + Math.abs(Math.sin(EFE.menuT*1.7))*0.2, -f); carp.rotation.y = Math.sin(EFE.menuT*0.6)*0.8; }

  /* ══════ LAS FILAS ══════ */
  /* ── CUANTAS FILAS HAY QUE DIBUJAR SALE DE LA CAMARA, NO A OJO ──
     El borde de abajo del cuadro cae `alto/2` unidades de pantalla por debajo
     del punto al que mira la camara, y una unidad de pantalla son `1/sin(EL)`
     filas: son casi trece filas por detras. Con seis quedaba una franja de
     cielo pegada al borde de abajo. */
  const f0 = Math.floor(EFE.fCam) - 14, f1 = f0 + N_FILAS;
  let nF = 0, nR = 0, nA = 0;
  const cuenta = {}; for (const k in INST) cuenta[k] = 0;
  const t = R ? R.t : EFE.t;
  for (let ff = f0; ff < f1; ff++){
    /* ── LAS FILAS DE ATRAS DEL ARRANQUE TAMBIEN SE DIBUJAN ──
       El mundo empieza en la fila 0 pero la camara mira desde seis filas atras:
       salteandolas queda una franja de cielo pegada al borde de abajo, y eso no
       se lee a «ahi termina el mapa», se lee a que falta el suelo. */
    if (ff < 0){
      _c3.setHex(COL_FILA.pasto[((ff % 2) + 2) % 2]);
      _m4.compose(_p3.set(0, 0, -ff), _q.identity(), _s3.set(1, 1, 1));
      filasM.setMatrixAt(nF, _m4); filasM.setColorAt(nF, _c3); nF++;
      continue;
    }
    const F = generaFila(ff); if (!F) continue;
    const par = ff % 2 === 0 ? 0 : 1;
    _c3.setHex(COL_FILA[F.tipo][par]);
    _m4.compose(_p3.set(0, F.tipo === 'rio' ? -0.30 : 0, -ff), _q.identity(), _s3.set(1, 1, 1));
    filasM.setMatrixAt(nF, _m4); filasM.setColorAt(nF, _c3); nF++;
    if (F.tipo === 'rio' && nA < aguas.length){
      const m = aguas[nA++]; m.visible = true; m.position.set(0, 0.06 + Math.sin(EFE.t*2 + ff)*0.012, -ff);
    }
    if (F.tipo === 'ruta'){
      for (let i = -3; i <= 3; i++){
        if (nR >= N_RAYA) break;
        _c3.setHex(0xe8e2c8);
        _m4.compose(_p3.set(i*1.35 + ((ff*0.37) % 1), 0.212, -ff), _q.identity(), _s3.set(1, 1, 1));
        rayasM.setMatrixAt(nR, _m4); rayasM.setColorAt(nR, _c3); nR++;
      }
    } else if (F.tipo === 'via'){
      /* ── LA VIA SON DURMIENTES Y RIELES, Y LOS DURMIENTES SON LO QUE SE LEE ──
         Los rieles solos median 0,054 de fondo: a la resolucion a la que este
         juego dibuja —el destino de render mide 158x343— eso es MEDIO PIXEL, o
         sea que la fila del tren salia como una banda marron lisa y nada decia
         que por ahi pasa un tren. Los durmientes son cortos y CRUZADOS, asi que
         su lado largo cae sobre la profundidad y sobreviven al achique. */
      for (let i = -4; i <= 4; i++){
        if (nR >= N_RAYA) break;
        _c3.setHex(0x5b4530);
        _m4.compose(_p3.set(i*1.6, 0.213, -ff), _q.identity(), _s3.set(0.30/0.5, 1, 0.62/0.09));
        rayasM.setMatrixAt(nR, _m4); rayasM.setColorAt(nR, _c3); nR++;
      }
      /* los rieles: dos tiras a lo largo, y en aviso se ponen rojas */
      const rojo = F.tren && F.tren.estado !== 'espera';
      for (const zz of [-0.20, 0.20]){
        if (nR >= N_RAYA) break;
        _c3.setHex(rojo ? 0xff3a2a : 0xd8dee6);
        _m4.compose(_p3.set(0, 0.224, -ff + zz), _q.identity(), _s3.set(ANCHO_M/0.5, 1, 0.13/0.09));
        rayasM.setMatrixAt(nR, _m4); rayasM.setColorAt(nR, _c3); nR++;
      }
    }
    /* los arboles y las piedras */
    if (F.arboles) for (let i = 0; i < F.arboles.length; i++){
      const a = F.arbT ? F.arbT[i] : { e: 1, g: 0, tipo: 'arbol' };
      const k = a.tipo === 'piedra' ? 'piedra' : 'arbol';
      if (cuenta[k] >= N_INST[k]) continue;
      _q.setFromEuler(new T.Euler(0, a.g, 0));
      _m4.compose(_p3.set(F.arboles[i], 0.21, -ff), _q, _s3.set(a.e, a.e, a.e));
      INST[k].setMatrixAt(cuenta[k]++, _m4);
    }
    /* los moviles */
    for (const mv of F.moviles || []){
      const k = mv.k;
      if (cuenta[k] >= N_INST[k]) continue;
      const mx2 = xMovil(F, mv, t);
      if (Math.abs(mx2 - EFE.xCam) > ANCHO_M/2) continue;
      _q.setFromEuler(new T.Euler(0, F.vel > 0 ? 0 : Math.PI, 0));
      const bal = k === 'camalote' ? Math.sin(EFE.t*2.2 + mv.x0)*0.03 : 0;
      /* ── EL CAMALOTE SE ESTIRA A SU LARGO, Y ESE ERA UN DEFECTO DE BULTO ──
         Un camalote mide entre dos y cuatro columnas y la malla esta armada para
         una: dibujado sin escalar, el jugador se paraba sobre agua a la vista y
         se caia donde la pantalla decia que habia planta. Lo que choca y lo que
         se ve tienen que ser el mismo numero. */
      const ex = k === 'camalote' ? mv.largo/LARGO_MOD.camalote : 1;
      _m4.compose(_p3.set(mx2, (k === 'camalote' ? -0.05 : 0.21) + bal, -ff), _q, _s3.set(ex, 1, 1));
      INST[k].setMatrixAt(cuenta[k]++, _m4);
    }
    /* el tren */
    if (F.tipo === 'via' && F.tren && F.tren.estado === 'pasa' && cuenta.tren < N_INST.tren){
      _q.setFromEuler(new T.Euler(0, F.dir > 0 ? 0 : Math.PI, 0));
      _m4.compose(_p3.set(F.tren.x, 0.21, -ff), _q, _s3.set(1, 1, 1));
      INST.tren.setMatrixAt(cuenta.tren++, _m4);
    }
    /* la moneda */
    if (F.moneda != null && cuenta.moneda < N_INST.moneda){
      _q.setFromEuler(new T.Euler(1.35, EFE.t*2.4, 0));
      _m4.compose(_p3.set(F.moneda, 0.52 + Math.sin(EFE.t*3 + ff)*0.05, -ff), _q, _s3.set(1, 1, 1));
      INST.moneda.setMatrixAt(cuenta.moneda++, _m4);
    }
  }
  filasM.count = nF; filasM.instanceMatrix.needsUpdate = true; if (filasM.instanceColor) filasM.instanceColor.needsUpdate = true;
  rayasM.count = nR; rayasM.instanceMatrix.needsUpdate = true; if (rayasM.instanceColor) rayasM.instanceColor.needsUpdate = true;
  for (const k in INST){ INST[k].count = cuenta[k]; INST[k].instanceMatrix.needsUpdate = true; }
  for (let i = nA; i < aguas.length; i++) aguas[i].visible = false;

  render.info.reset();
  render.setRenderTarget(RT); render.render(escena, cam);
  render.setRenderTarget(null); render.render(postEsc, postCam);
}
