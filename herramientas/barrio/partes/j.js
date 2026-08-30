
/* ══════════════════════════ LA CINEMÁTICA ══════════════════════════
   Dos planos y un corte seco en el medio.

   PLANO A — primera persona, bajando por la calle. Es la cámara del juego pero
   filmada: el mismo cabeceo, la misma lluvia, los mismos faroles.
   PLANO B — la cámara se pone ENFRENTE, con lente largo pegado a la cara y el
   fondo desenfocado: abre los ojos, mira, y los vuelve a cerrar mientras el
   cuerpo sigue caminando.

   NO LLEVA BANDAS NEGRAS ARRIBA Y ABAJO. Es lo primero que se pidió y encima es
   lo correcto: en un marco que ya es apaisado y girado dentro de un teléfono,
   recortarlo más deja el barrio en una ranura. Lo que hace que se lea a
   cinemática no es el recorte sino lo que sí está — el desenfoque, la
   aberración del lente, el grano más alto, la viñeta cerrada y, sobre todo, que
   nadie tenga el control.

   Y ES UNA FUNCIÓN DEL TIEMPO, `pon(t)`, no una máquina de estados: por eso el
   banco puede fotografiar el segundo 17,4 con `__V.cine(17.4)` sin esperar
   diecisiete segundos. Es lo que en LEMI y en Vecindario encontró todos los
   defectos de encuadre, que son los que no se ven leyendo el código. */

/* ── LO ANALÍTICO ──
   `suave` es el smoothstep de siempre y hace de resorte: derivada cero en las
   dos puntas, o sea que un giro de cabeza arranca y termina frenando. Un
   resorte de verdad —integrado— leería igual y rompería la pureza de `pon(t)`. */
const suave = (a, b, t) => { const k = cl((t - a) / (b - a), 0, 1); return k*k*(3 - 2*k); };
const mez = (a, b, k) => a + (b - a) * k;

const CINE_DUR = 27.0;
const CINE_CORTE = 14.6;          /* el corte entre los dos planos */
const CINE_VEL = 1.28;            /* m/s: un paso de madrugada, no una marcha */
const CINE_ZANC = 0.80;           /* metros por medio paso */

/* ── HACIA DÓNDE MIRA EN EL PLANO A ──
   Cuatro miradas y la vuelta al frente. El detalle que hace que se lea a
   persona y no a cámara sobre rieles es que la cabeza NO vuelve exactamente al
   mismo sitio: cada tramo deja su propio residuo. */
const CINE_MIRA = [
  [0.0,  3.4,  0.00, -0.020],
  [3.4,  5.8,  0.42,  0.045],    /* una casa a la izquierda */
  [5.8,  7.3,  0.05, -0.010],
  [7.3,  9.2, -0.17,  0.300],    /* los cables */
  [9.2, 10.9, -0.04, -0.330],    /* el charco de la vereda */
  [10.9, 99.0, 0.02, -0.030]
];

/* ══════════════════════════ LA CABEZA ══════════════════════════
   No hay un modelo: es la misma familia de cajas, cilindros y esferas con la
   que está hecho el barrio, y va a la CAPA 1 — de eso depende todo lo demás,
   porque la cámara del mundo mira la capa 0 y la de la cabeza la 1, así que las
   dos pasadas salen de la misma escena y del MISMO encuadre sin tener que
   mantener dos cámaras sincronizadas.

   Y LAS LUCES DE LA CARA TAMBIÉN VAN EN LA CAPA 1. three.js junta las luces
   comparando `luz.layers` contra las de la CÁMARA, así que una luz en la capa 1
   no existe para el mundo: la cara se ilumina sola, sin que el farol de mentira
   le pinte las casas de atrás. */
let CARA = null, CARA_LUZ = null, CARA_REL = null, CARA_AMB = null;
const OJO_I = {}, OJO_D = {};
let LLUCARA = null;

function armaCabeza(){
  if (CARA) return CARA;
  CARA = new T.Group();

  /* MOJADO, QUE ES LA MITAD DEL PERSONAJE. Todos los materiales de la cara
     llevan especular: bajo la lluvia lo que distingue una piel de un plástico
     mate es el brillo del farol resbalando por la frente y el pómulo. Con
     Lambert —que es lo que usa el resto del juego— no hay especular posible y
     la cara sale de cartón. */
  const mPiel  = new T.MeshPhongMaterial({ color: 0x8e7566, specular: 0x6d7480, shininess: 26, flatShading: true });
  const mPelo  = new T.MeshPhongMaterial({ color: 0x1c1715, specular: 0x59616e, shininess: 44, flatShading: true });
  const mCejas = new T.MeshPhongMaterial({ color: 0x1d1715, shininess: 8 });
  const mLabio = new T.MeshPhongMaterial({ color: 0x7a5551, specular: 0x60666f, shininess: 30 });
  const mCamp  = new T.MeshPhongMaterial({ color: 0x22303c, specular: 0x4a5764, shininess: 62, flatShading: true });
  /* LA ESCLERÓTICA LLEVA UN EMISIVO MÍNIMO. De noche y con una sola luz de
     costado, el blanco del ojo queda en sombra y los ojos desaparecen — que es
     justo lo único que este plano tiene que mostrar. Con 0x101216 se despegan
     sin quedar dos focos en la cara. */
  /* LA ESCLERÓTICA VA GRIS Y NO BLANCA, y el especular tampoco es blanco puro.
     Con blanco y brillo 160 el globo devolvía el farol entero: medido en la
     captura, dos bolas encendidas del tamaño de un pómulo y ninguna cara
     alrededor. Lo que se ve de un ojo de verdad no es una esfera: es la RANURA
     que dejan los párpados, y eso lo resuelven los casquetes de más abajo. */
  const mOjo   = new T.MeshPhongMaterial({ color: 0xa8adb8, emissive: 0x0d0f13, specular: 0x8e96a4, shininess: 70 });
  const mIris  = new T.MeshPhongMaterial({ color: 0x2f4550, specular: 0xc8d2e0, shininess: 150 });
  const mPupi  = new T.MeshBasicMaterial({ color: 0x07080a });

  const geoE = new T.SphereGeometry(1, 12, 9);
  const geoC = new T.BoxGeometry(1, 1, 1);
  const geoT = new T.CylinderGeometry(1, 1, 1, 10);
  /* ── LAS PIEZAS QUIETAS SE FUNDEN, IGUAL QUE UNA CUADRA ──
     Treinta y cinco mallas sueltas son treinta y cinco llamadas de dibujo en la
     segunda pasada, y de las treinta y cinco sólo se MUEVEN doce: los dos
     globos, los cuatro párpados y los cuatro discos del iris. Todo lo demás
     —cráneo, mandíbula, nariz, cejas, pelo, cuello y campera— está clavado a la
     cabeza, así que va por `fundir()`, que es la misma función que junta las
     doscientas piezas de una cuadra. Quedan cinco mallas y no veintitrés. */
  const CAP = new Map();
  const pieza = (mat, geo, p, s, r) => {
    if (!CAP.has(mat)) CAP.set(mat, []);
    CAP.get(mat).push({ g: geo, p, s, r });
  };

  /* ── LA REGLA QUE ORDENA TODA LA CABEZA ──
     Una cara hecha de bultos convexos no se compone «poniendo cada pieza donde
     va»: se compone contra la SUPERFICIE DEL CRÁNEO, porque cualquier cosa que
     quede por detrás de esa superficie NO SE VE — la esfera de adelante la tapa
     entera y no hay hueco que valga, que acá no hay cuenca excavada.

     Los ojos fueron exactamente eso. Con el globo en z 0,072 y el cráneo
     llegando a 0,094 a esa altura, los dos ojos estaban VEINTIDÓS MILÍMETROS
     ADENTRO de la cabeza: la sonda decía «cabeza en cuadro, delante de la
     cámara, 68 % del alto» —los tres ciertos— y en la captura no había ojos. Lo
     que se veía eran los pómulos, que sí sobresalían dos centímetros.

     Así que el cráneo se acható de frente (z 0,088 corrido a −0,012) y cada
     pieza lleva su cuenta: el ojo asoma 2,7 mm, el pómulo 2,7, la ceja 4,5 y la
     nariz veinte. Los números están calculados sobre el elipsoide, no probados
     a ojo — a esta resolución un error de cinco milímetros es un píxel y no se
     ve hasta que se acumula. */
  pieza(mPiel, geoE, [0, 0.010, -0.012], [0.094, 0.104, 0.088]);
  /* la mandíbula y el mentón: sin ellos una cabeza es una pelota con ojos */
  pieza(mPiel, geoE, [0, -0.055, 0.008], [0.070, 0.066, 0.062]);
  pieza(mPiel, geoE, [0, -0.090, 0.036], [0.038, 0.028, 0.024]);
  /* los pómulos, que son lo que atrapa la luz de costado */
  for (const s of [-1, 1]) pieza(mPiel, geoE, [s*0.043, -0.030, 0.036], [0.024, 0.021, 0.015]);
  /* la ceja: una tabla que TIRA SOMBRA SOBRE EL OJO, y es lo que hace que un
     ojo se lea hundido en vez de pegado en la superficie */
  pieza(mPiel, geoC, [0, 0.045, 0.052], [0.126, 0.017, 0.032]);
  /* DOS CEJAS Y NO UNA BARRA. Con 4,8 cm de ancho puestas a ±3,1 se pisaban en
     el medio y formaban un solo travesaño negro de once centímetros — medido en
     la ampliación, con el flequillo justo encima quedaban dos barras paralelas y
     la frente en el medio. Separadas, el hueco entre ellas es lo que las hace
     leer a cejas. */
  for (const s of [-1, 1]) pieza(mCejas, geoC, [s*0.033, 0.046, 0.068], [0.034, 0.008, 0.011], [0, 0, -0.14*s]);
  /* la nariz, en dos piezas: el caballete y la punta */
  pieza(mPiel, geoC, [0, 0.002, 0.072], [0.021, 0.052, 0.030], [0.16, 0, 0]);
  pieza(mPiel, geoE, [0, -0.026, 0.078], [0.014, 0.011, 0.013]);
  /* la boca: el labio de arriba y la línea, que es lo único que se lee */
  pieza(mPiel, geoC, [0, -0.050, 0.062], [0.054, 0.011, 0.014]);
  pieza(mLabio, geoC, [0, -0.059, 0.062], [0.054, 0.009, 0.014]);
  /* las orejas */
  for (const s of [-1, 1]) pieza(mPiel, geoE, [s*0.092, -0.004, -0.010], [0.011, 0.026, 0.017]);
  /* ── EL PELO, EMPAPADO ──
     El casquete se corta en 0,40π y no en 0,60π, y eso es una cuenta: con 0,60π
     el borde del casquete baja DIECIOCHO GRADOS POR DEBAJO DEL ECUADOR, o sea
     que la línea del pelo caía por debajo de los ojos y la mitad de arriba de la
     cara era una banda negra. Con 0,40π el nacimiento queda en y 0,051, justo
     encima de la ceja. Atrás va otra pieza, porque un casquete cortado ahí deja
     la nuca pelada. */
  const casq = new T.SphereGeometry(1, 12, 8, 0, Math.PI*2, 0, Math.PI*0.40);
  pieza(mPelo, casq, [0, 0.010, -0.012], [0.098, 0.108, 0.094]);
  pieza(mPelo, geoE, [0, -0.008, -0.046], [0.096, 0.098, 0.070]);
  pieza(mPelo, geoC, [0, 0.076, 0.048], [0.136, 0.020, 0.042], [0.42, 0, 0]);
  for (const s of [-1, 1]) pieza(mPelo, geoC, [s*0.084, 0.004, -0.004], [0.024, 0.086, 0.092], [0, 0, s*0.10]);

  /* ── LOS OJOS ──
     El globo va HUNDIDO y lo que asoma es un casquete de dos milímetros y
     medio: eso da un disco de un centímetro y medio, que es lo que mide la
     ranura de un ojo. Los párpados son casquetes de una esfera un pelo más
     grande y concéntrica, así que sobresalen cuatro milímetros y hacen el
     bulto del párpado por construcción. */
  const casqSup = new T.SphereGeometry(1, 12, 6, 0, Math.PI*2, 0, Math.PI*0.5);
  const casqInf = new T.SphereGeometry(1, 12, 6, 0, Math.PI*2, Math.PI*0.5, Math.PI*0.5);
  for (const [O, s] of [[OJO_I, -1], [OJO_D, 1]]){
    const g = new T.Group();
    g.position.set(s*0.030, 0.018, 0.0615);
    CARA.add(g);
    const globo = new T.Mesh(geoE, mOjo);
    globo.scale.set(0.0125, 0.0125, 0.0125);
    g.add(globo);
    /* el iris cuelga de un pivote: girando el pivote la mirada se mueve sobre
       la esfera por construcción, y no hay forma de que se despegue del globo */
    const mir = new T.Group(); g.add(mir);
    /* ── EL IRIS TIENE QUE CABER DEBAJO DEL PÁRPADO ──
       Éste es el defecto que hacía que cerrar los ojos no se viera: el iris
       estaba puesto en z 0,0097 con medio grosor 0,0049, o sea que llegaba a
       0,0146 — POR FUERA del casquete del párpado, que mide 0,0142, y hasta por
       fuera del propio globo, que mide 0,0125. Así que los párpados se cerraban
       de verdad y el iris los ATRAVESABA: en la ampliación, el ojo cerrado y el
       abierto salían idénticos. Los dos discos van aplastados y por dentro del
       globo, asomando tres décimas de milímetro. */
    const iris = new T.Mesh(geoE, mIris);
    iris.position.set(0, 0, 0.0098); iris.scale.set(0.0064, 0.0064, 0.0030);
    mir.add(iris);
    const pupi = new T.Mesh(geoE, mPupi);
    pupi.position.set(0, 0, 0.0112); pupi.scale.set(0.0030, 0.0030, 0.0018);
    mir.add(pupi);
    const sup = new T.Mesh(casqSup, mPiel); sup.scale.set(0.0142, 0.0142, 0.0142); g.add(sup);
    const inf = new T.Mesh(casqInf, mPiel); inf.scale.set(0.0140, 0.0140, 0.0140); g.add(inf);
    /* LA LÍNEA DE LAS PESTAÑAS ES UN ANILLO EN EL BORDE DEL CASQUETE, o sea un
       cilindro con el eje sobre el POLO del párpado y del radio del casquete: el
       globo, que es más chico, deja asomar un anillo de dos milímetros. Puesto
       girado noventa grados —que fue el primer intento— el cilindro queda de
       cara al frente y tapa el ojo entero con un disco negro. */
    const bor = new T.Mesh(geoT, mCejas);
    bor.scale.set(0.0144, 0.0022, 0.0144);
    sup.add(bor);
    O.g = g; O.mir = mir; O.sup = sup; O.inf = inf;
  }

  /* el cuello y los hombros: sólo asoma la franja de arriba, pero sin ellos la
     cabeza flota y el plano se lee a busto de museo */
  pieza(mPiel, geoT, [0, -0.148, -0.010], [0.041, 0.110, 0.041]);
  /* EL CUELLO DE LA CAMPERA SUBE, y no es un detalle de vestuario: con el
     cuello desnudo asomando siete centímetros, la cabeza se lee apoyada sobre
     un pedestal. Y encima alguien empapado a las tres de la mañana lo lleva
     levantado. */
  pieza(mCamp, geoT, [0, -0.192, -0.010], [0.070, 0.086, 0.070]);
  pieza(mCamp, geoE, [0, -0.320, -0.010], [0.180, 0.120, 0.120]);
  for (const s of [-1, 1]) pieza(mCamp, geoE, [s*0.175, -0.290, -0.010], [0.085, 0.075, 0.090]);

  for (const [mat, lista] of CAP) CARA.add(new T.Mesh(fundir(lista), mat));

  /* ── LAS TRES LUCES, Y LAS TRES TIENEN UN TRABAJO ──
     1. LA CLAVE sale del farol de verdad que tiene delante: la posición se lee
        de `FAROLES`, así que la sombra en la cara cae del mismo lado que el
        poste que se ve en el fondo. Si la dirección no coincidiera con lo que
        hay en pantalla, el ojo lo nota aunque no sepa por qué.
     2. EL CONTRA es lo que separa la silueta del fondo. Sin él, una cara de
        noche contra un barrio oscuro es una mancha — la lección que en LEMI
        costó una vuelta entera con el screamer adentro de la cueva.
     3. Y EL RELLENO NO PUEDE SER NEGRO ABAJO: con el suelo del hemisférico en
        negro, toda cara que no mire al cielo recibe cero, o sea la mitad de
        abajo del mentón y del cuello. */
  CARA_LUZ = new T.PointLight(0xffd2a0, 7.5, 12, 1.2);
  CARA_REL = new T.DirectionalLight(0x9dc0ea, 0.58);
  CARA_AMB = new T.HemisphereLight(0x2b3b52, 0x14161c, 0.22);
  for (const l of [CARA_LUZ, CARA_REL, CARA_AMB]){ l.layers.set(1); escena.add(l); }

  CARA.traverse(o => o.layers.set(1));
  CARA.visible = false;
  escena.add(CARA);
  return CARA;
}

/* ── LA LLUVIA DE CERCA ──
   La lluvia del juego se apaga por debajo de los 70 cm y termina de aparecer a
   los 2,20 m, que es lo correcto para primera persona: una gota a treinta
   centímetros del ojo sería una mancha blanca tapando media pantalla. Pero en
   el plano de la cara la cabeza está a setenta centímetros del lente, o sea
   JUSTO en la franja apagada — y una cara bajo la lluvia sin una sola gota
   pasándole por delante no está bajo la lluvia. Ésta es otra nube, chica,
   pegada al lente y en la capa 1. */
function armaLluviaCara(){
  if (LLUCARA) return;
  const n = 170, caja = 1.5, alto = 2.6;
  const g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array([
    -0.5,0,0,  0.5,0,0,  0.5,1,0,  -0.5,0,0,  0.5,1,0,  -0.5,1,0 ]), 3));
  const sem = new Float32Array(n*4);
  for (let i = 0; i < n; i++){
    sem[i*4]   = azr(-caja, caja);
    sem[i*4+1] = azr(0, alto);
    sem[i*4+2] = azr(-caja, caja);
    sem[i*4+3] = azr(0.75, 1.35);
  }
  g.setAttribute('semilla', new T.InstancedBufferAttribute(sem, 4));
  g.instanceCount = n;
  const mat = new T.ShaderMaterial({
    uniforms: { t: { value: 0 }, cen: { value: new T.Vector3() }, camPos: { value: new T.Vector3() },
                caja: { value: caja }, alto: { value: alto } },
    vertexShader: `
      attribute vec4 semilla;
      uniform float t, caja, alto;
      uniform vec3 cen, camPos;
      varying float vA;
      void main(){
        vec3 c = floor(cen * 4.0) / 4.0;
        float x = c.x + mod(semilla.x + 0.30*t*semilla.w, caja*2.0) - caja;
        float z = c.z + mod(semilla.z + 0.16*t*semilla.w, caja*2.0) - caja;
        float y = c.y + mod(semilla.y - t*semilla.w*13.0, alto) - alto*0.42;
        vec3 base = vec3(x, y, z);
        vec3 hacia = camPos - base;
        float d = length(hacia);
        vec3 lado = normalize(cross(vec3(0.0,1.0,0.0), hacia/max(d,0.001)));
        /* ── LA GOTA DE CERCA ES CHIQUITA, Y ES UNA CUENTA ──
           A sesenta centímetros del lente y con 26 grados de campo, el cuadro
           mide veintiocho centímetros de alto: una tira de dieciséis
           centímetros y dos de ancho sale de doscientos treinta píxeles por
           treinta, o sea UNA TABLA BLANCA CRUZANDO LA CARA. Medido en la
           captura, tapaba media frente. Con 4,5 cm de largo y 3 mm de ancho
           quedan unos sesenta píxeles por cuatro, que es una gota. */
        vec3 tira = vec3(0.30, -1.0, 0.16) * (0.045 * semilla.w);
        vec3 p = base + lado * position.x * 0.0016 + tira * position.y;
        /* se apaga pegada al lente y a partir de un metro: lo que tiene que
           hacer es cruzar el plano, no llenarlo */
        vA = 0.24 * smoothstep(0.16, 0.34, d) * (1.0 - smoothstep(0.62, 1.35, d));
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(0.66, 0.76, 0.92, vA); }',
    transparent: true, depthWrite: false, side: T.DoubleSide, fog: false
  });
  LLUCARA = new T.Mesh(g, mat);
  LLUCARA.frustumCulled = false;
  LLUCARA.layers.set(1);
  LLUCARA.visible = false;
  escena.add(LLUCARA);
}

/* ══════════════════════════ EL GUION ══════════════════════════ */
const CINEMA = {
  on: false, t: 0, x0: 0, z0: 0, yaw0: 0, adx: 0, adz: 0,
  faseAnt: 0, rayoHecho: false, listo: false,

  prepara(){
    if (this.listo) return;
    armaCabeza(); armaLluviaCara();
    this.listo = true;
  },

  arranca(){
    this.prepara();
    MODO = 'cine';
    this.t = 0; this.faseAnt = 0; this.rayoHecho = false;
    this.on = true;
    /* ── DÓNDE ARRANCA, Y ES UNA DECISIÓN DE FONDO ──
       En el plano B la cámara mira HACIA ATRÁS, o sea que el fondo desenfocado
       es la cuadra que acaba de pasar. Arrancando a dieciséis metros del cruce,
       el plano de la cara caía con la ESQUINA a seis metros por detrás de la
       cabeza — y el flanco de una casa de esquina, a fov 26, ocupa casi
       cincuenta grados: medido en la captura, una tapia negra detrás del
       personaje y ni un punto de luz. Arrancando tres metros ANTES del cruce se
       lo cruza en el segundo dos y para cuando empieza el plano B la esquina
       quedó a dieciséis metros: el fondo es la calle entera con sus faroles, que
       desenfocados son las manchas que un lente largo tiene que dar. */
    this.x0 = EJES[4] + 3.0; this.z0 = EJES[2];
    this.yaw0 = Math.PI/2;                       /* mirando hacia -X */
    this.adx = -Math.sin(this.yaw0); this.adz = -Math.cos(this.yaw0);
    $('menu').classList.remove('on');
    $('hud').classList.remove('on');
    $('cineNeg').classList.add('on');
    $('cineSalta').classList.add('on');
    camaVol(0.85);
    postMat.uniforms.abe.value = 0.018;
    postMat.uniforms.vig.value = 0.80;
    CARA.visible = false; LLUCARA.visible = false;
    this.pon(0);
  },

  /* ── DÓNDE ESTÁ EL CUERPO EN EL SEGUNDO t ──
     Una sola cuenta, y la usan los dos planos: en el A la cámara VA en la
     cabeza y en el B la MIRA. Con dos cuentas, el corte entre planos mostraría
     a alguien que se teletransporta medio metro. */
  cuerpo(t){
    const av = t * CINE_VEL;
    const f = Math.PI * av / CINE_ZANC;
    return {
      x: this.x0 + this.adx*av, z: this.z0 + this.adz*av, f,
      /* el ocho: el vertical va al DOBLE de frecuencia que el lateral, porque
         hay dos pisadas por ciclo y una sola oscilación de cadera */
      sy: Math.abs(Math.sin(f)) * 0.036,
      sx: Math.cos(f) * 0.030,
      rl: Math.cos(f) * 0.017,
      pt: Math.sin(f*2) * 0.007
    };
  },

  pon(t){
    const c = this.cuerpo(t);
    const der = { x: -this.adz, z: this.adx };

    if (t < CINE_CORTE){
      /* ═══ PLANO A: PRIMERA PERSONA ═══ */
      CARA.visible = false; LLUCARA.visible = false;
      postMat.uniforms.cara.value = 0;
      /* el desenfoque de la entrada: la vista se acomoda en el primer segundo y
         medio. Es lo mismo que hace un ojo al abrirse, y encima anuncia el
         recurso que el plano B va a usar entero. */
      postMat.uniforms.dof.value = (1 - suave(0.0, 1.7, t)) * 0.85;

      let yaw = 0, pit = 0, ant = [0, -0.02];
      for (let i = 0; i < CINE_MIRA.length; i++){
        const m = CINE_MIRA[i];
        if (t >= m[0] && t < m[1]){
          const k = suave(m[0], m[0] + (m[1]-m[0])*0.55, t);
          yaw = mez(ant[0], m[2], k); pit = mez(ant[1], m[3], k);
          break;
        }
        ant = [m[2], m[3]];
      }
      /* LA CABEZA NUNCA ESTÁ QUIETA. Tres senos de frecuencias que no son
         múltiplos entre sí: así el ciclo no se repite y no se lee a animación.
         Sin esto, los tramos en los que mira al frente parecen una cámara
         montada en un trípode que camina. */
      yaw += Math.sin(t*0.83)*0.013 + Math.sin(t*1.97 + 1.3)*0.0075;
      pit += Math.sin(t*0.61 + 2.1)*0.010 + Math.sin(t*1.43)*0.005;

      cam.position.set(c.x + der.x*c.sx, alturaSuelo(c.x, c.z) + OJO + c.sy,
                       c.z + der.z*c.sx);
      cam.rotation.set(pit + c.pt, this.yaw0 + yaw, c.rl);
      const fov = 70 + Math.sin(t*0.37)*0.9;
      if (Math.abs(cam.fov - fov) > 0.01){ cam.fov = fov; cam.updateProjectionMatrix(); }
      JUG.x = c.x; JUG.z = c.z;              /* los faroles y la lluvia lo siguen */
    } else {
      /* ═══ PLANO B: LA CARA ═══ */
      const u = t - CINE_CORTE;
      CARA.visible = true; LLUCARA.visible = true;
      postMat.uniforms.cara.value = 1;
      postMat.uniforms.dof.value = 0.88 + suave(0, 9.0, u)*0.12;

      const suelo = alturaSuelo(c.x, c.z);
      /* la cabeza va donde estaría el ojo, un pelo más abajo: el ojo no está en
         el centro del cráneo sino unos centímetros por delante y por encima */
      const hx = c.x + der.x*c.sx, hz = c.z + der.z*c.sx;
      const hy = suelo + OJO - 0.020 + c.sy;
      CARA.position.set(hx, hy, hz);
      /* ── MIRA AL LENTE ──
         La cara del modelo está sobre su +Z local, y un giro en Y lleva ese +Z a
         (sin ry, cos ry). La cámara está en `cabeza − adelante·dist`, así que la
         cara tiene que apuntar a `−adelante` — que es exactamente el mismo
         ángulo con el que se orienta la cámara, o sea `yaw0`. Con `yaw0 + π`
         —que es lo que parecía «darlo vuelta»— el plano entero mostraba LA NUCA:
         medido, la cabeza en cuadro, delante de la cámara y ocupando el 68 % del
         alto, y en la captura no había una sola cara. */
      CARA.rotation.set(c.pt*1.4 + Math.sin(u*0.53)*0.012,
                        this.yaw0 + Math.sin(c.f)*0.021 + Math.sin(u*0.41)*0.030,
                        -c.rl*1.6);

      /* ── LA CÁMARA VA MEDIO ENGANCHADA, Y ESO ES EL PEDIDO ──
         Enganchada del todo, la cara queda clavada en el cuadro y el balanceo
         no se ve en ninguna parte: se ve el fondo moviéndose y la cabeza
         quieta, que es el error clásico de un plano así. Siguiendo sólo el 66 %
         del cabeceo, en la cara queda un tercio de residuo —que es lo que se
         mira— y el fondo se mueve entero. */
      const dist = mez(0.92, 0.810, suave(0, 11.0, u));
      const px = hx - this.adx*dist - der.x*c.sx*0.34;
      const py = suelo + OJO + 0.012 + c.sy*0.66 + Math.sin(u*1.9)*0.0035;
      const pz = hz - this.adz*dist - der.z*c.sx*0.34;
      cam.position.set(px, py, pz);
      /* SE APUNTA UN POCO POR DEBAJO DE LOS OJOS. Apuntando justo a ellos
         quedan clavados en el medio del cuadro, que es donde no van: en un
         primer plano los ojos caen alrededor de los dos tercios del alto, y lo
         que sube el encuadre es bajar el punto al que se mira. Medido, con el
         punto en los ojos la coronilla tocaba el borde de arriba. */
      const ox = hx - px, oy = (hy - 0.018) - py, oz = hz - pz;
      cam.rotation.set(Math.atan2(oy, Math.hypot(ox, oz)),
                       Math.atan2(-ox, -oz),
                       Math.sin(u*0.77)*0.010 - c.rl*0.30);
      /* EL LENTE LARGO ES LA MITAD DEL PLANO. A 26 grados y setenta centímetros
         el cuadro mide 32 cm de alto, o sea que una cabeza de 22 ocupa el 68 %:
         eso es un primer plano. Con los 70 del juego habría que acercarse a
         12 cm y la nariz saldría deformada. */
      if (Math.abs(cam.fov - 26) > 0.01){ cam.fov = 26; cam.updateProjectionMatrix(); }
      JUG.x = c.x; JUG.z = c.z;

      /* ── LOS OJOS ──
         Cerrados · se abren · miran · se cierran. La apertura es LENTA (0,8 s) y
         el cierre del final más lento todavía: un párpado que baja en dos
         décimas es un parpadeo, y un parpadeo no dice lo mismo que cerrar los
         ojos. Los dos parpadeos del medio sí son rápidos, y ASIMÉTRICOS —bajan
         en 0,08 s y suben en 0,17—, que es como parpadea alguien. */
      let abre = suave(1.85, 2.65, u);
      abre *= 1 - 0.97*(suave(4.10, 4.19, u) - suave(4.19, 4.36, u));
      abre *= 1 - 0.97*(suave(6.35, 6.44, u) - suave(6.44, 6.62, u));
      abre *= 1 - suave(7.55, 9.65, u);
      /* ── EL SIGNO DEL PÁRPADO, QUE ESTABA AL REVÉS ──
         El casquete de arriba cubre el hemisferio de su POLO, y girándolo un
         ángulo `a` sobre X el borde queda `a` radianes POR DEBAJO del eje de la
         pupila. O sea que cualquier `a` positivo tapa la pupila: con el abierto
         escrito en +0,30 los dos párpados estaban cerrados SIEMPRE, y encima el
         de abajo con el signo cambiado hacía lo mismo desde el otro lado.
         Abierto es el borde de arriba POR ENCIMA del eje (a negativo) y el de
         abajo por debajo (b positivo); cerrado, los dos se cruzan. */
      /* Y ABIERTO ES UNA ALMENDRA, NO UN CÍRCULO. El casquete que asoma del
         cráneo es un disco de dieciséis milímetros; con los párpados en −0,55 y
         +0,45 apenas lo tocaban y el ojo salía redondo, o sea saltón. En ±0,23
         los bordes quedan a trece grados del eje y lo que queda es una franja de
         dieciséis por cinco y medio — que es la proporción de un ojo. */
      OJO_I.sup.rotation.x = mez(0.24, -0.23, abre);
      OJO_D.sup.rotation.x = mez(0.24, -0.23, abre);
      OJO_I.inf.rotation.x = mez(-0.08, 0.23, abre);
      OJO_D.inf.rotation.x = mez(-0.08, 0.23, abre);
      /* LA MIRADA SE MUEVE, y es lo que separa a alguien de un maniquí: un ojo
         humano hace microsacadas todo el tiempo. Los dos ojos comparten el
         ángulo, así que no pueden bizquear. */
      const gy = Math.sin(u*0.71)*0.10 + Math.sin(u*2.3 + 0.7)*0.035;
      const gx = Math.sin(u*0.53 + 1.9)*0.05;
      OJO_I.mir.rotation.set(gx, gy, 0);
      OJO_D.mir.rotation.set(gx, gy, 0);

      /* ── LA CLAVE SALE DEL FAROL QUE TIENE DELANTE ──
         La DIRECCIÓN es la del poste que de verdad está en el cuadro; el NIVEL
         se corrige por la distancia, porque un farol a doce metros deja una
         cara en penumbra y el plano no muestra nada. Es una decisión de imagen
         y va anotada como tal: lo que el ojo comprueba es de qué lado cae la
         sombra, no cuántos lux hay. */
      let mej = null, dm = 1e9;
      for (const f of FAROLES){
        const dx = f.x - hx, dz = f.z - hz;
        if (dx*this.adx + dz*this.adz < 0) continue;       /* sólo los de adelante */
        const d = dx*dx + dz*dz;
        if (d < dm){ dm = d; mej = f; }
      }
      /* ── LA CLAVE VA A TRES CUARTOS, Y EL FAROL SÓLO ELIGE DE QUÉ LADO ──
         Puesta sobre la recta al poste de verdad, la luz terminaba casi en el
         eje del lente —el farol más cercano está adelante y arriba, o sea
         detrás de la cámara— y una luz frontal NO MODELA: medido en la
         ampliación, la cara salía plana, sin sombra de nariz, sin ceja y sin
         pómulo. Lo que da forma es una clave a cuarenta grados de costado y
         treinta y cinco de alto, que es la posición de siempre.
         Así que el farol decide LO ÚNICO que el ojo puede comprobar contra el
         fondo —de qué lado viene la luz— y el ángulo lo pone el plano. */
      const lado = mej ? (((mej.x - hx)*der.x + (mej.z - hz)*der.z) >= 0 ? 1 : -1) : -1;
      const kx = -this.adx*0.55 + der.x*lado*0.72;
      const kz = -this.adz*0.55 + der.z*lado*0.72;
      const kn = Math.hypot(kx, 0.62, kz) || 1;
      CARA_LUZ.position.set(hx + (kx/kn)*2.0, hy + (0.62/kn)*2.0, hz + (kz/kn)*2.0);
      CARA_LUZ.intensity = 7.5;
      /* el contra viene de atrás y del lado CONTRARIO a la clave: es lo que
         dibuja el filo de la mejilla en sombra contra el fondo desenfocado */
      CARA_REL.position.set(hx + this.adx*2.4 - der.x*lado*1.8, hy + 2.0, hz + this.adz*2.4 - der.z*lado*1.8);
      CARA_REL.target.position.set(hx, hy, hz);
      CARA_REL.target.updateMatrixWorld();

      LLUCARA.material.uniforms.cen.value.set(hx, hy + 0.25, hz);
      LLUCARA.material.uniforms.camPos.value.copy(cam.position);
      LLUCARA.material.uniforms.t.value = RELOJ.value;
    }

    /* ── EL NEGRO DE LAS PUNTAS ──
       Entra desde negro y se va a negro, y el de la salida empieza ANTES de que
       termine el plano: cortar del último cuadro al menú en el mismo instante se
       lee a que el juego se cerró, no a que la escena terminó. */
    const neg = Math.max(1 - suave(0.15, 1.55, t), suave(CINE_DUR - 1.9, CINE_DUR - 0.15, t));
    $('cineNeg').style.opacity = neg.toFixed(3);
    /* el grano sube y la saturación baja: es la misma imagen del juego filmada
       con una cámara peor, que es exactamente lo que se quiere */
    postMat.uniforms.grano.value = CFG.grano * 1.75;
    postMat.uniforms.sat.value = CFG.sat * mez(0.72, 1.0, suave(0.4, 4.0, t));
  },

  paso(dt){
    if (!this.on) return;
    this.t += dt;
    const c = this.cuerpo(this.t);
    /* LA PISADA VA ATADA A LA FASE DEL PASO y no a un temporizador: es la misma
       regla que el juego, así que el sonido y el cabeceo no se pueden
       desincronizar por construcción. */
    if (Math.floor(c.f / Math.PI) !== Math.floor(this.faseAnt / Math.PI)) son('paso', 0.40);
    this.faseAnt = c.f;
    /* un relámpago puesto donde tiene que estar: a mitad del plano A, con la
       cámara mirando al frente y las casas de los dos lados en el cuadro */
    if (!this.rayoHecho && this.t > 11.3){ this.rayoHecho = true; RAYO.prox = 0; RAYO.t = 0; }
    if (this.t >= CINE_DUR){ this.termina(); return; }
    this.pon(this.t);
  },

  limpia(){
    this.on = false;
    if (CARA){ CARA.visible = false; }
    if (LLUCARA) LLUCARA.visible = false;
    postMat.uniforms.cara.value = 0;
    postMat.uniforms.dof.value = 0;
    postMat.uniforms.abe.value = 0;
    postMat.uniforms.vig.value = 0.62;
    postMat.uniforms.grano.value = CFG.grano;
    postMat.uniforms.sat.value = CFG.sat;
    if (CARA_LUZ) CARA_LUZ.intensity = 0;
    $('cineSalta').classList.remove('on');
  },

  /* ── SE PUEDE SALTEAR ──
     Una cinemática obligatoria que se ve una vez es una escena; vista cinco
     veces es un peaje. Es la lección de POMPOM. */
  saltar(){
    if (!this.on) return;
    /* MEDIO SEGUNDO DE GRACIA. El toque que abre la escena es un `click`, pero
       el que la saltea es un `pointerdown`: sin la guarda, un doble toque sobre
       JUGAR —que en un teléfono pasa todo el tiempo— arranca la cinemática y la
       saltea en el mismo gesto, y desde afuera se ve como que el botón se comió
       la escena. */
    if (this.t < 0.55) return;
    this.termina();
  },

  termina(){
    /* SE ENTRA AL JUEGO DONDE TERMINÓ LA CINEMÁTICA Y MIRANDO PARA EL MISMO
       LADO. Devolviendo al jugador a la esquina de siempre, el último cuadro de
       la escena y el primero del juego son dos sitios distintos y el corte se
       lee a error. */
    const c = this.cuerpo(Math.min(this.t, CINE_DUR));
    this.limpia();
    $('cineNeg').classList.remove('on');
    $('cineNeg').style.opacity = '0';
    try { localStorage.setItem('barrio_cine', '1'); } catch(e){}
    entraJuego({ x: c.x, z: c.z, yaw: this.yaw0 });
  }
};
