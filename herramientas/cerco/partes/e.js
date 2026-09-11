/* ══════════════════════════════════════════════════════════════════════════
   E · EL DIBUJO — EL PLANETA
   EL TABLERO SE SUBE COMO TEXTURA, UNA POR CARA, Y NO COMO GEOMETRIA. Un
   planeta de n=58 son 20.184 celdas: una malla por celda serian veinte mil
   objetos para pintar cuadrados de color liso. Seis mallas de (n+1)² vertices
   con una `DataTexture` de n×n cada una y filtro NEAREST son SEIS ordenes de
   dibujo, y el escalon duro del vecino mas cercano es justo el estilo.
   Y LA ESTELA VA EN LA MISMA TEXTURA QUE EL TERRENO. Dibujada aparte serian
   ocho listas de celdas que hay que proyectar a la esfera cada cuadro; en la
   textura cuesta escribir cuatro bytes por celda que cambio, y el dia que se
   toque el color de una estela no hay un segundo dibujante que corregir.
   Lo unico que se dibuja aparte son los CUERPOS —una malla instanciada de
   ocho cubos— y las esquirlas.
   ══════════════════════════════════════════════════════════════════════════ */

const V = {
  ren: null, esc: null, cam: null, cv: null, dpr: 1,
  W: 0, H: 0, n: 0, N: 0,
  caras: [], tex: [], buf: [], suc: [],
  pz: null, pt: null, fl: null, flAct: null,
  cuer: null, cuerM: null, esq: null, esqG: null, esqP: [],
  cpos: null, cmira: null, carr: null, dist: 0, distT: 0,
  sac: 0,
  cort: null, viv: null, gan: new Int32Array(NJUG + 1),
  cuadros: 0, msDib: 0, mini: null, minR: null, miniCam: null,
  _v: null, _v2: null, _v3: null, _q: null, _m: null, _ob: null,
};

const vpRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const VP_Z = [], VP_T = [], VP_C = [];
const VP_ROCA = vpRGB(C_PIEDRA), VP_TABLA = vpRGB(C_TABLA);
for (let i = 0; i <= NJUG; i++) {
  VP_Z.push(COLS[i] ? vpRGB(COLS[i].z) : VP_TABLA);
  VP_T.push(COLS[i] ? vpRGB(COLS[i].t) : VP_TABLA);
  VP_C.push(COLS[i] ? vpRGB(COLS[i].c) : VP_TABLA);
}

/* EL RADIO ES UNO Y LA CAMARA SE ACERCA: con el radio saliendo de `n`, cambiar
   de mundo movería tambien las luces, el tamano de los cubos y el plano
   cercano. Con radio fijo lo unico que cambia entre mundos es cuanto arco
   entra en la pantalla, que es exactamente lo que `DISCO` ya dice.        */
/* Un THREE.Color por jugador, hecho UNA vez. setColorAt con un Color nuevo
   por cuerpo y por cuadro son ocho objetos por cuadro para decir siempre lo
   mismo, y encima parsea la cadena hexadecimal cada vez.               */
const VP_TC = [];
const VP_R = 1;
const VP_ALTO = 0.028;          /* cuanto sobresale un cuerpo de la superficie */
const VP_ATRAS = 0.62;          /* cuanto se corre la camara HACIA ATRAS       */
const VP_DPR = [1, 1.5, 2];

/* ── EL LIENZO ────────────────────────────────────────────────────────────
   La densidad la topa la calidad y no el aparato: a dpr 3 en un marco de
   412×892 serian 3,3 millones de pixeles por cuadro.                       */
function vpMide() {
  const m = $('marco'), r = m.getBoundingClientRect();
  const d = Math.min(window.devicePixelRatio || 1, VP_DPR[cl(PROG.cal | 0, 0, 2)]);
  const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
  if (W === V.W && H === V.H && d === V.dpr) return;
  V.W = W; V.H = H; V.dpr = d;
  V.ren.setPixelRatio(d);
  V.ren.setSize(W, H, false);
  V.cam.aspect = W / H; V.cam.updateProjectionMatrix();
  /* `sizeAttenuation:false` pide el tamano en pixeles DEL BUFER, no de CSS, asi
     que sin multiplicar por el dpr las estrellas salen a la mitad en cualquier
     telefono — que es justo donde se juega.                                 */
  if (V.est) for (const e of V.est) e.material.size = e.userData.px * d;
}

/* EL LIENZO DEL CIELO, dibujado UNA vez: un degrade vertical y tres nebulosas
   muy flojas. LAS ESTRELLAS NO ESTAN ACA, y el motivo esta medido: la camara
   abre 46 grados sobre una esfera de cielo que envuelve 180 en el alto del
   lienzo, o sea que 512 pixeles de textura se estiran sobre 892 de pantalla
   con un aumento de 6,8 — una estrella de un pixel sale como una mancha
   cuadrada de diez. Un lienzo mas grande solo corre el problema: lo que hace
   falta es que la estrella NO se agrande con la distancia, y eso es un
   `Points` con `sizeAttenuation` apagado (`vpEstrellas`).                   */
function vpCielo() {
  const w = 1024, h = 512, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0.00, '#060a16');
  gr.addColorStop(0.40, '#101c40');
  gr.addColorStop(0.66, '#1d2d5e');
  gr.addColorStop(1.00, '#090f24');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  /* las nebulosas van por debajo del 9 % de opacidad a proposito: estan para
     que el cielo no sea un plano de un solo valor, no para competirle al
     planeta — que es lo unico que hay que mirar.                            */
  for (const [nx, ny, nr, col] of [[0.22, 0.30, 0.30, '#4d6bd8'],
                                   [0.74, 0.60, 0.26, '#8a4fc9'],
                                   [0.48, 0.82, 0.22, '#2f7fb8']]) {
    const r = g.createRadialGradient(nx * w, ny * h, 0, nx * w, ny * h, nr * w);
    r.addColorStop(0, col); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.085; g.fillStyle = r; g.fillRect(0, 0, w, h);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  /* un lienzo es sRGB; sin declararlo entra como lineal y el cielo sale el
     doble de claro, que es justo lo contrario de lo que tiene que hacer.    */
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* LAS ESTRELLAS SON UNA NUBE DE PUNTOS, no dibujo del lienzo, y eso arregla
   DOS cosas de una. Una: con `sizeAttenuation` apagado el tamano se pide EN
   PIXELES, asi que una estrella mide lo mismo este el cielo donde este —que es
   literalmente lo que hace una estrella—. Y dos: se reparten sobre la esfera
   con `z` uniforme, que es el reparto parejo de verdad, asi que el apelotonado
   de los polos que obligaba a estirar las elipses NO PUEDE EXISTIR.
   VAN EN DOS MALLAS Y NO EN UNA porque `PointsMaterial` tiene UN tamano para
   todos sus puntos: una nube fina y numerosa mas un punado de gordas es lo que
   hace que un cielo se lea a profundidad y no a ruido parejo. Dos ordenes de
   dibujo.
   EL COLOR VA EN ESPACIO DE TRABAJO: `vertexColors` no convierte nada, asi que
   sale de `setHex(..., sRGB)` —que si convierte— multiplicado por el brillo.
   Y con semilla fija, porque un cielo que cambia en cada partida deja de ser
   un sitio.                                                                 */
function vpEstrellas(n, brMin, col) {
  let sm = 20260911 + n;
  const az = () => (sm = (sm * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pos = new Float32Array(n * 3), rgb = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const z = az() * 2 - 1, a = az() * 6.2832, r = Math.sqrt(Math.max(0, 1 - z * z));
    pos[i * 3] = Math.cos(a) * r * 16; pos[i * 3 + 1] = z * 16;
    pos[i * 3 + 2] = Math.sin(a) * r * 16;
    const q = az();
    c.setHex(q > 0.90 ? 0xcfe0ff : q > 0.76 ? 0xffe7c4 : 0xffffff, THREE.SRGBColorSpace);
    const b = brMin + az() * (1 - brMin);
    rgb[i * 3] = c.r * b; rgb[i * 3 + 1] = c.g * b; rgb[i * 3 + 2] = c.b * b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
  const m = new THREE.PointsMaterial({ size: 2, sizeAttenuation: false,
    vertexColors: true, depthWrite: false });
  const p = new THREE.Points(g, m);
  p.renderOrder = -998; p.frustumCulled = false;
  p.userData.px = col;
  return p;
}

function vpInit() {
  /* EL COLOR SE CONSTRUYE CON `setHex` Y NO CON TRES FLOTANTES, y no es un
     detalle: en three r169 el constructor de tres numeros los toma en el
     espacio DE TRABAJO —o sea lineal— mientras que `setHex` los toma en sRGB
     y convierte. Metiendo bytes de sRGB como lineales y dejando que la salida
     los vuelva a codificar, todo sale lavado: el ambar del jugador pasa de
     `#f8b359` a un beige. Es el mismo defecto que el mapa de las caras.   */
  if (!VP_TC.length) for (let i = 0; i <= NJUG; i++) {
    const t = VP_T[i];
    VP_TC.push(new THREE.Color().setHex((t[0] << 16) | (t[1] << 8) | t[2], THREE.SRGBColorSpace));
  }
  V.cv = $('cv'); V.mini = $('mini');
  V.ren = new THREE.WebGLRenderer({ canvas: V.cv, antialias: false, alpha: false });
  /* NADA DE TONE MAPPING, Y ESO ES UNA DECISION. Este juego no tiene un solo
     valor por encima de uno —ni sol, ni emisivo, ni HDRI— asi que cualquier
     curva de exposicion solo puede AGACHAR los colores puros: medido, ACES
     baja el ambar del jugador un 18 % y lo acerca al resto. El espacio de
     salida si va declarado, porque es lo que convierte el lineal con el que
     three trabaja a los bytes que la pantalla espera.                     */
  V.ren.toneMapping = THREE.NoToneMapping;
  V.ren.outputColorSpace = THREE.SRGBColorSpace;
  V.ren.setClearColor(new THREE.Color().setHex(0x0d1526, THREE.SRGBColorSpace), 1);
  V.ren.autoClear = false;
  V.esc = new THREE.Scene();
  V.cam = new THREE.PerspectiveCamera(46, 1, 0.02, 24);
  /* EL PLANO LEJANO DEL MINIMAPA CORTA EN 8 Y ESO NO ES UN AHORRO: es lo que
     saca de el las estrellas y la esfera del cielo, que viven a radio 16 y 18.
     El minimapa mide setenta y cuatro pixeles y su camara abre 38 grados, o sea
     que le entran diez veces mas estrellas que a la vista de juego y a ese
     tamano eso no es un cielo, es ruido encima de lo unico que hay que leer.
     El planeta esta a 4,1 con radio 1, asi que 8 lo deja entero con margen.  */
  V.miniCam = new THREE.PerspectiveCamera(38, 1, 0.5, 8);

  /* DOS LUCES Y NINGUNA SOMBRA. Lo que hace que una esfera se lea a esfera no
     es una sombra proyectada —no hay nada que la reciba— sino el degrade de
     una direccional contra un hemisferico que NO deje el lado oscuro en
     negro: un planeta con la mitad negra se lee a agujero.

     LAS INTENSIDADES SALEN DE UNA CUENTA Y NO DE PROBAR. Desde r155 three no
     escala las luces por pi y el difuso de Lambert es `albedo/pi`, asi que el
     multiplicador que le llega a un color es `(hemi + dir·cos)/pi`. Con 1,55 y
     1,25 eso daba **0,891 en la cara iluminada**: o sea que el ambar #f8b359
     salia al 89 % de lo que es, los ocho colores se acercaban entre si y el
     cuadro entero se leia lavado. Con 2,05 y 1,15 la cara al sol llega a
     **1,019**, o sea el color puro, y ni un pelo mas: por encima de uno se
     recorta, y recortar un color saturado le corre el TONO.

     Y EL SUELO DEL HEMISFERICO SE ACLARA de `0x2a3350` a `0x46578f` por la
     misma cuenta: la cara de sombra recibe `hemi_suelo/pi`, y con el azul
     viejo eso eran 0,10 de luz —o sea el agujero que este comentario dice que
     hay que evitar—. Con el nuevo son 0,21 y el lado oscuro queda TENIDO de
     azul en vez de apagado, que es lo que hace una atmosfera de verdad.    */
  const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x46578f, 2.05);
  V.esc.add(hemi);
  /* EL SOL CUELGA DE LA CAMARA Y NO DEL MUNDO, y esto NO es una licencia: es
     lo unico que puede funcionar en un juego que recorre un planeta ENTERO.
     Con la direccional fija en el mundo, media esfera es el lado oscuro —y
     medido en la arena, el tablero sin dueno llegaba a la pantalla como un
     azul apagado en vez del gris claro que es—. En un juego cuya UNICA regla
     es «del mismo color», que el mismo color se lea distinto segun por donde
     uno ande es el peor defecto posible: mas grave que perder el degrade.
     Lo que se conserva es el degrade, que es lo que hace que una esfera se
     lea a esfera: el sol va CORRIDO del eje de la vista —0,30 hacia arriba y
     0,24 a la izquierda— asi que el centro del cuadro recibe 0,937 del maximo
     y el limbo se va apagando solo. O sea una luz de estudio atada al tripode,
     que es lo que hace cualquier visor de modelos.
     Medido: el centro llega a `(2,05 + 1,15·0,937)/pi = 0,996` del color, o
     sea el color puro sin recortar, y ese numero ya NO depende de donde este
     parado el jugador.                                                     */
  const sol = new THREE.DirectionalLight(0xfff4e2, 1.15);
  sol.position.set(0.85, 1.1, 0.7);
  V.esc.add(sol);
  V.sol = sol;

  /* el halo: una esfera apenas mas grande dibujada por dentro. Cuesta una
     orden de dibujo y es lo que despega el planeta del fondo.              */
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(VP_R * 1.10, 40, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color().setHex(0x5f8ff5, THREE.SRGBColorSpace), side: THREE.BackSide,
      transparent: true, opacity: 0.42, depthWrite: false }));
  V.esc.add(halo);

  /* EL CIELO ES UNA ESFERA DE VERDAD Y NO EL COLOR DE FONDO, y la razon es que
     un color plano no tiene nada que mirar: medido en la captura, el cuarto de
     arriba del cuadro era una banda de azul marino lisa de punta a punta. Y un
     cielo con estrellas ancladas AL MUNDO hace ademas que recorrer el planeta
     se vea: la camara orbita, asi que las estrellas se corren por detras, y
     eso —aparte del limbo— es lo unico que dice que uno esta viajando.

     VA COMO ESFERA Y NO COMO `scene.background` porque este juego dibuja con
     `autoClear = false` y dos pasadas con tijera propias: una esfera con
     `depthWrite:false` y `renderOrder` negativo se dibuja primero pase lo que
     pase, sin depender de como three decida tratar el fondo con el borrado
     manual. Cuesta UNA orden de dibujo y sale en las dos pasadas, o sea que el
     minimapa tambien tiene cielo. Radio 18: la camara nunca pasa de 4,1 y el
     plano lejano esta en 24, asi que la esfera entra entera por construccion. */
  const cielo = new THREE.Mesh(
    new THREE.SphereGeometry(18, 32, 20),
    new THREE.MeshBasicMaterial({ map: vpCielo(), side: THREE.BackSide, depthWrite: false }));
  cielo.renderOrder = -999;
  V.esc.add(cielo);
  /* LA CUENTA SALE DE UNA CUENTA Y NO DE UN NUMERO LINDO: el cono de la camara
     abre 46 grados de alto por 22 de ancho, o sea `4·asin(sin11,1·sin23)` =
     0,30 estereorradianes sobre los 12,57 de la esfera — el 2,4 % —, y de eso
     el planeta se come casi dos tercios: en pantalla cae el 0,84 % de la nube.
     Con las 640 que tenia el lienzo llegaban TRES, medido en la captura. Con
     5.400 llegan unas cuarenta y cinco, que es un cielo.                     */
  V.est = [vpEstrellas(5400, 0.16, 1.7), vpEstrellas(480, 0.55, 3.2)];
  for (const e of V.est) V.esc.add(e);

  V.cpos = new THREE.Vector3(0, 0, 3); V.cmira = new THREE.Vector3();
  V.carr = new THREE.Vector3(0, 1, 0);
  V._v = new THREE.Vector3(); V._v2 = new THREE.Vector3(); V._v3 = new THREE.Vector3();
  V._q = new THREE.Quaternion(); V._m = new THREE.Matrix4();
  V._ob = new THREE.Object3D();

  vpCuerpos();
  vpMide();
  addEventListener('resize', vpMide);
}

/* ── LOS CUERPOS ──────────────────────────────────────────────────────────
   Ocho cubos en UNA malla instanciada: sueltos serian ocho ordenes de dibujo
   para ocho cajas, y con `instanceColor` cada uno conserva su color sin un
   material propio.                                                         */
function vpCuerpos() {
  const g = new THREE.BoxGeometry(0.034, 0.034, 0.034);
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  V.cuer = new THREE.InstancedMesh(g, m, NJUG);
  V.cuer.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  V.cuer.frustumCulled = false;
  V.cuer.count = 0;
  V.esc.add(V.cuer);

  /* las esquirlas: un solo `Points`, con el buffer al maximo y el tope de
     dibujo moviendose. Crear geometria por muerte seria alojar y soltar en
     el peor cuadro posible.                                                */
  V.esqG = new THREE.BufferGeometry();
  V.esqG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 160), 3));
  V.esqG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(3 * 160), 3));
  V.esqG.setDrawRange(0, 0);
  V.esq = new THREE.Points(V.esqG, new THREE.PointsMaterial({
    size: 0.045, vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false }));
  V.esq.frustumCulled = false;
  V.esc.add(V.esq);
}

/* ── EL PLANETA ───────────────────────────────────────────────────────────
   Una malla por cara, con sus (n+1)² vertices puestos EXACTAMENTE donde
   `posCel` pone los centros de celda: `normalize(C + u·ex + v·ey)`. La UV va
   en `(vx/n, vy/n)`, asi la celda (x,y) cae en el texel (x+0.5, y+0.5)/n de
   una textura de n×n — que es por lo que NEAREST no puede desalinearse.    */
function vpPlaneta(n) {
  for (const c of V.caras) { V.esc.remove(c); c.geometry.dispose(); c.material.dispose(); }
  for (const t of V.tex) t.dispose();
  V.caras = []; V.tex = []; V.buf = []; V.suc = [];
  const L = n + 1;
  for (let f = 0; f < 6; f++) {
    const C = CARAS[f].C, ex = CARAS[f].ex, ey = CARAS[f].ey;
    const pos = new Float32Array(L * L * 3), uv = new Float32Array(L * L * 2);
    for (let vy = 0; vy < L; vy++) for (let vx = 0; vx < L; vx++) {
      const u = vx / n * 2 - 1, v = vy / n * 2 - 1, o = (vy * L + vx);
      let X = C[0] + u * ex[0] + v * ey[0];
      let Y = C[1] + u * ex[1] + v * ey[1];
      let Z = C[2] + u * ex[2] + v * ey[2];
      const r = VP_R / Math.hypot(X, Y, Z);
      pos[o * 3] = X * r; pos[o * 3 + 1] = Y * r; pos[o * 3 + 2] = Z * r;
      uv[o * 2] = vx / n; uv[o * 2 + 1] = vy / n;
    }
    const idx = new Uint32Array(n * n * 6);
    for (let y = 0, k = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const a = y * L + x, b = a + 1, c = b + L, d = a + L;
      idx[k++] = a; idx[k++] = b; idx[k++] = c;
      idx[k++] = a; idx[k++] = c; idx[k++] = d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    /* la normal de una esfera ES la posicion: calcularla promediando caras
       daria lo mismo con un barrido de mas.                                */
    geo.setAttribute('normal', new THREE.BufferAttribute(pos.slice(), 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const buf = new Uint8Array(n * n * 4);
    const tex = new THREE.DataTexture(buf, n, n, THREE.RGBAFormat);
    /* UNA `DataTexture` NACE EN `NoColorSpace`, o sea lineal, y esto es un
       mapa de COLOR: sin declararlo, los bytes de sRGB entran como si fueran
       lineales, la salida los vuelve a codificar y el planeta entero sale
       lavado. Es la causa de que los ocho colores se parecieran entre si. */
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false; tex.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    mesh.frustumCulled = false;
    V.esc.add(mesh);
    V.caras.push(mesh); V.tex.push(tex); V.buf.push(buf); V.suc.push(true);
  }
}

/* el color de una celda, con el damero y el destello del cercado adentro: un
   solo sitio decide de que color es una celda, asi el mapa chico y el planeta
   no pueden decir cosas distintas.                                         */
function vpPinta(M, i) {
  const n = M.n, f = (i / (n * n)) | 0, r = i - f * n * n;
  const x = r % n, y = (r / n) | 0;
  const t = M.t[i], z = M.z[i];
  let c;
  if (t) c = VP_T[t];
  else if (z === PIEDRA) c = VP_ROCA;
  else if (z > 0) c = VP_Z[z];
  else c = VP_TABLA;
  /* EL DAMERO ES LA REJA. Con una celda de 1 texel no hay linea que dibujar,
     asi que la cuadricula se hace moviendo el valor un 6 % de a una celda:
     se sigue pudiendo contar de una ojeada y no cuesta un solo triangulo. */
  const k = ((x + y + f) & 1) ? 1.055 : 0.945;
  let R = c[0] * k, G = c[1] * k, B = c[2] * k;
  const fl = V.fl[i];
  if (fl > 0) {
    const d = z > 0 && z < PIEDRA ? VP_C[z] : VP_C[1];
    R += (d[0] - R) * fl; G += (d[1] - G) * fl; B += (d[2] - B) * fl;
  }
  const b = V.buf[f], o = (y * n + x) * 4;
  b[o] = R > 255 ? 255 : R; b[o + 1] = G > 255 ? 255 : G;
  b[o + 2] = B > 255 ? 255 : B; b[o + 3] = 255;
  V.suc[f] = true;
}

function vpNuevo(M) {
  const n = M.n;
  if (V.n !== n) { V.n = n; vpPlaneta(n); }
  V.N = M.N;
  V.pz = new Uint8Array(M.N); V.pt = new Uint8Array(M.N);
  V.fl = new Float32Array(M.N); V.flAct = [];
  V.pz.set(M.z); V.pt.set(M.t);
  for (let i = 0; i < M.N; i++) vpPinta(M, i);
  V.cort = new Int32Array(NJUG + 1);
  V.viv = new Uint8Array(NJUG + 1);
  for (const p of M.jug) { V.cort[p.id] = p.cortes; V.viv[p.id] = 1; }
  V.esqP.length = 0; V.sac = 0;
  V.distT = V.dist = vpDist(M);
  /* la camara se PLANTA en el sitio de arranque en vez de viajar hasta el:
     con el suavizado corriendo desde el cuadro anterior, el primer segundo de
     cada nivel seria la camara cruzando el planeta.                        */
  vpCam(M, 1e3);
}

/* ── LO QUE CAMBIO ────────────────────────────────────────────────────────
   Un barrido del planeta por tic contra la copia anterior. Escribe la textura
   de las celdas que cambiaron, enciende el destello del cercado y dispara las
   esquirlas: los tres salen de UN solo sitio en vez de tres avisos que
   alguien tiene que acordarse de mandar.                                   */
function vpTras(M) {
  const z = M.z, t = M.t, pz = V.pz, pt = V.pt;
  V.gan.fill(0);
  for (let i = 0; i < V.N; i++) {
    if (z[i] === pz[i] && t[i] === pt[i]) continue;
    if (z[i] !== pz[i] && z[i] > 0 && z[i] < PIEDRA) {
      V.gan[z[i]]++;
      /* el destello vive en la celda y se apaga solo: una lista de cercos con
         su reloj seria un segundo estado que se puede desincronizar del
         tablero, y el tablero ya sabe de quien es cada celda.              */
      if (V.fl[i] <= 0) V.flAct.push(i);
      V.fl[i] = 1;
    }
    pz[i] = z[i]; pt[i] = t[i];
    vpPinta(M, i);
  }
  for (const p of M.jug) {
    if (p.cortes !== V.cort[p.id]) {
      V.cort[p.id] = p.cortes;
      vpEsquirlas(M, p.i, p.id);
      if (p.id === 1) V.sac = 1;
    }
    V.viv[p.id] = p.vivo ? 1 : 0;
  }
  return V.gan;
}

function vpEsquirlas(M, i, id) {
  const ct = VP_T[id] || VP_T[1], cc = VP_C[id] || VP_C[1];
  const P = M.POS, nx = P[i * 3], ny = P[i * 3 + 1], nz = P[i * 3 + 2];
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * Math.PI * 2, s = Math.sin(a), co = Math.cos(a);
    /* dos tangentes cualesquiera de la normal: la esquirla sale POR LA
       SUPERFICIE y no en una direccion del mundo, que en una esfera saldria
       para adentro la mitad de las veces.                                  */
    let tx, ty, tz;
    if (Math.abs(nz) < 0.9) { tx = -ny; ty = nx; tz = 0; } else { tx = 0; ty = -nz; tz = ny; }
    const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
    const ux = ny * tz - nz * ty, uy = nz * tx - nx * tz, uz = nx * ty - ny * tx;
    const v = 0.22 + Math.random() * 0.42;
    const cr = (k & 1) ? ct : cc;
    V.esqP.push({
      x: nx * VP_R, y: ny * VP_R, z: nz * VP_R,
      vx: (tx * co + ux * s) * v + nx * 0.30,
      vy: (ty * co + uy * s) * v + ny * 0.30,
      vz: (tz * co + uz * s) * v + nz * 0.30,
      r: cr[0] / 255, g: cr[1] / 255, b: cr[2] / 255,
      t: 0, vida: 0.42 + Math.random() * 0.3,
    });
  }
  if (V.esqP.length > 160) V.esqP.splice(0, V.esqP.length - 160);
}

/* ── LA CAMARA ────────────────────────────────────────────────────────────
   Va SOBRE LA NORMAL DEL JUGADOR, corrida hacia atras en el sentido del
   viaje. Con la camara en un punto fijo del mundo, al dar la vuelta al
   planeta el jugador terminaria mirandose la espalda desde el otro lado; con
   la camara colgada de su normal, el planeta es lo que gira — que es
   literalmente lo que se pidio.
   Y EL ARRIBA ES LA TANGENTE DEL VIAJE: sin eso, cruzar el borde de una cara
   da vuelta la pantalla de golpe, porque los ejes de las dos caras no son los
   mismos.                                                                  */
function vpDist(M) {
  /* LA DISTANCIA SALE DE CUANTO PLANETA SE QUIERE VER, y es una cuenta cerrada
     y no una estimacion. Una esfera de radio 1 a distancia `d` subtiende
     `asin(1/d)`, que proyectado sobre el plano de imagen mide `tan(asin(1/d))`
     medios cuadros de alto sobre `tan(fov/2)`. Pidiendo que el DIAMETRO sea
     `k` veces el alto del cuadro:
          tan(asin(1/d)) = k·tan(fov/2) = s   →   d = √(1+s²)/s
     LA VERSION ANTERIOR TRATABA EL ARCO COMO SI FUERA UNA CUERDA PLANA y lo
     topaba en 2,4 rad, que son 137 grados: mas de un hemisferio, o sea un
     encuadre que ninguna camara puede tener. Medido, dejaba el planeta a
     cuatro radios con un tercio del cuadro en cielo vacio.                 */
  const k = M.arena
    ? DISCO + (DISCO_MIN - DISCO) * Math.min(1, Math.sqrt(tajada(M, M.jug[0].id) / DISCO_SAT))
    : DISCO;
  const s = k * Math.tan(V.cam.fov * Math.PI / 360);
  /* el piso es geometrico y no de gusto: por debajo de un radio la camara
     estaria DENTRO del planeta, y `s` grande la lleva justo ahi.           */
  return Math.max(VP_R * 1.25, VP_R * Math.sqrt(1 + s * s) / s);
}

function vpPos(M, p, v) {
  const P = M.POS, i = p.i, j = M.NB[i * 4 + p.d], f = M.f;
  v.set(P[i * 3] + (P[j * 3] - P[i * 3]) * f,
        P[i * 3 + 1] + (P[j * 3 + 1] - P[i * 3 + 1]) * f,
        P[i * 3 + 2] + (P[j * 3 + 2] - P[i * 3 + 2]) * f).normalize();
  return v;
}

function vpCam(M, dt) {
  const p = M.jug[0];
  const nrm = vpPos(M, p, V._v);                       /* donde esta        */
  const j = M.NB[p.i * 4 + p.d];
  const ade = V._v2.set(M.POS[j * 3], M.POS[j * 3 + 1], M.POS[j * 3 + 2])
    .normalize().sub(nrm);
  ade.addScaledVector(nrm, -ade.dot(nrm));             /* tangente del viaje */
  if (ade.lengthSq() < 1e-9) ade.set(0, 0, 1).addScaledVector(nrm, -nrm.z);
  ade.normalize();

  V.distT = vpDist(M);
  V.dist += (V.distT - V.dist) * (1 - Math.exp(-dt * 1.2));

  const tp = V._v3.copy(nrm).addScaledVector(ade, -VP_ATRAS).normalize()
    .multiplyScalar(V.dist);
  const a = 1 - Math.exp(-dt * 9);
  V.cpos.lerp(tp, a);
  V.cmira.lerp(V._v3.copy(nrm).multiplyScalar(VP_R * 0.86).addScaledVector(ade, VP_R * 0.10), a);
  V.carr.lerp(ade, a).normalize();

  if (V.sac > 0) {
    V.sac = Math.max(0, V.sac - dt * 3.4);
    const s = V.sac * V.sac * 0.045;
    V.cpos.x += (Math.random() * 2 - 1) * s;
    V.cpos.y += (Math.random() * 2 - 1) * s;
  }
  V.cam.position.copy(V.cpos);
  V.cam.up.copy(V.carr);
  V.cam.lookAt(V.cmira);

  /* el sol se recoloca con la camara: `oj` es el eje de la vista, `carr` el
     arriba de pantalla y su producto cruzado la derecha. Una direccional de
     three apunta de su posicion al origen, y el origen ES el planeta, asi que
     alcanza con ponerla sobre esa direccion.                               */
  if (V.sol) {
    const oj = V._v.copy(V.cpos).normalize();
    const de = V._v2.crossVectors(V.carr, oj).normalize();
    V.sol.position.copy(oj).addScaledVector(V.carr, 0.30)
      .addScaledVector(de, -0.24).normalize().multiplyScalar(8);
  }
}

/* ══════════════════════════ EL CUADRO ══════════════════════════ */
function vpDibuja(M, dt) {
  const t0 = performance.now();

  /* el destello del cercado: solo las celdas encendidas, no el planeta. */
  if (V.flAct.length) {
    const q = [];
    for (const i of V.flAct) {
      V.fl[i] -= dt * 2.4;
      if (V.fl[i] > 0) q.push(i); else V.fl[i] = 0;
      vpPinta(M, i);
    }
    V.flAct = q;
  }
  for (let f = 0; f < 6; f++) if (V.suc[f]) { V.tex[f].needsUpdate = true; V.suc[f] = false; }

  /* los cuerpos */
  let c = 0;
  for (const p of M.jug) {
    if (!p.vivo) continue;
    const nrm = vpPos(M, p, V._v);
    V._ob.position.copy(nrm).multiplyScalar(VP_R + VP_ALTO);
    V._ob.quaternion.setFromUnitVectors(V._v2.set(0, 1, 0), nrm);
    V._ob.updateMatrix();
    V.cuer.setMatrixAt(c, V._ob.matrix);
    V.cuer.setColorAt(c, VP_TC[p.id] || VP_TC[1]);
    c++;
  }
  V.cuer.count = c;
  V.cuer.instanceMatrix.needsUpdate = true;
  if (V.cuer.instanceColor) V.cuer.instanceColor.needsUpdate = true;

  /* las esquirlas */
  const ap = V.esqG.attributes.position.array, ac = V.esqG.attributes.color.array;
  let k = 0;
  for (let i = 0; i < V.esqP.length; i++) {
    const s = V.esqP[i];
    s.t += dt;
    if (s.t >= s.vida) continue;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    s.vx *= 0.96; s.vy *= 0.96; s.vz *= 0.96;
    ap[k * 3] = s.x; ap[k * 3 + 1] = s.y; ap[k * 3 + 2] = s.z;
    ac[k * 3] = s.r; ac[k * 3 + 1] = s.g; ac[k * 3 + 2] = s.b;
    V.esqP[k++] = s;
  }
  V.esqP.length = k;
  V.esqG.setDrawRange(0, k);
  V.esqG.attributes.position.needsUpdate = true;
  V.esqG.attributes.color.needsUpdate = true;

  const ren = V.ren;
  ren.setScissorTest(false);
  ren.setViewport(0, 0, V.W, V.H);
  ren.clear();
  ren.render(V.esc, V.cam);
  vpMiniPinta(M);

  V.msDib = performance.now() - t0;
  V.cuadros++;
}

/* ── EL MAPA CHICO ────────────────────────────────────────────────────────
   UNA SEGUNDA PASADA EN EL MISMO LIENZO y no un segundo contexto: el planeta,
   sus texturas y sus luces ya estan subidos a la GPU, y un `<canvas>` aparte
   obligaria a mantener una copia entera del tablero del otro lado. El
   `<canvas id="mini">` se queda vacio y sirve de MEDIDA: la sonda de HUD
   sigue teniendo una caja que medir y el mapa se dibuja exactamente ahi.   */
function vpMiniPinta(M) {
  const el = V.mini;
  if (!el || el.classList.contains('off')) return;
  const rm = $('marco').getBoundingClientRect(), r = el.getBoundingClientRect();
  const w = Math.max(8, Math.round(r.width)), h = Math.max(8, Math.round(r.height));
  const x = Math.round(r.left - rm.left), y = Math.round(rm.bottom - r.bottom);
  const p = M.jug[0];
  const nrm = vpPos(M, p, V._v);
  V.miniCam.aspect = w / h; V.miniCam.updateProjectionMatrix();
  V.miniCam.position.copy(nrm).multiplyScalar(VP_R * 4.1);
  V.miniCam.up.copy(V.carr);
  V.miniCam.lookAt(0, 0, 0);
  const ren = V.ren;
  ren.setScissorTest(true);
  ren.setScissor(x, y, w, h);
  ren.setViewport(x, y, w, h);
  ren.clear();
  ren.render(V.esc, V.miniCam);
  ren.setScissorTest(false);
}
