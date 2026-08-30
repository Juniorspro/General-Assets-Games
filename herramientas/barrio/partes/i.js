
/* ══════════════════════════ EL BUCLE ══════════════════════════ */
let ultimo = performance.now(), fps = 0, cuadros = 0, acum = 0, DIB = 0, TRI = 0;
let CONGELADO = false;
/* CONGELADO frena la SIMULACIÓN y deja el dibujo. Sin esto no se puede
   fotografiar un instante: entre el paso que pone la escena y la captura el
   navegador sigue corriendo su propio bucle, y la foto sale de dos segundos
   después. Ya pasó cuatro veces en este repo. */

/* ── APAGAR LAS CUADRAS QUE LA NIEBLA YA SE COMIÓ ──
   Veinticinco cuadras dibujadas siempre son doscientas llamadas para mostrar
   niebla. El recorte por frustum tira las que están detrás, pero no las que
   están adelante y lejos: eso lo tiene que decidir el juego, porque el motor no
   sabe que a ciento sesenta metros no queda un solo píxel visible. Es una
   distancia y una comparación por cuadra y por cuadro — veinticinco cuentas. */
/* CIENTO VEINTIOCHO METROS Y NO CIENTO SESENTA Y OCHO, y el número sale de la
   niebla y no del gusto. Con `FogExp2` en 0,0165, a 120 m el factor de niebla ya
   es 0,98: lo que hay más allá aporta el dos por ciento de su color. Con la
   vuelta de cuadras de borde el barrio pasó de veinticinco manzanas a cuarenta
   y nueve, y con el corte viejo se dibujaban veintiséis a la vez —336 llamadas—
   para mostrar gris. */
const VISTA = 116;
function pasoCuadras(){
  for (const g of GRUPOS){
    const dx = g.userData.cx - JUG.x, dz = g.userData.cz - JUG.z;
    g.visible = (dx*dx + dz*dz) < VISTA*VISTA;
  }
}

function bucle(){
  requestAnimationFrame(bucle);
  const ahora = performance.now();
  let dt = Math.min((ahora - ultimo)/1000, 0.08);
  ultimo = ahora;
  if (CONGELADO) dt = 0;
  RELOJ.value += dt;

  if (MODO === 'cine') CINEMA.paso(dt);
  else if (MODO === 'menu') CINE.paso(dt);
  else if (!PAUSA){ fisica(dt); ponCam(dt); }

  pasoCuadras();
  pasoFaroles();
  pasoHalos();
  pasoRayo(dt);
  pasoLluvia();
  pasoSalpicaduras(dt);
  if (cielo) cielo.position.set(cam.position.x, 0, cam.position.z);
  if (MODO === 'juego' && !PAUSA) ponCalle();
  if (!esPC) joyDibuja();
  postMat.uniforms.t.value = RELOJ.value;

  /* el reloj de la pantalla: son las tres de la mañana y corre lento, que es
     lo que hace una noche que no termina */
  if (MODO === 'juego'){
    const m = Math.floor(RELOJ.value * 0.5) % 60;
    $('reloj').textContent = '03:' + String(m).padStart(2, '0');
  }

  /* `ren.info.render` SE PONE A CERO AL EMPEZAR CADA `render()`, así que
     leyéndolo después del último se ven las llamadas de la pasada de color —una
     sola— y no las del cuadro. Con `autoReset` apagado se acumulan las dos
     pasadas más la de sombra, y se pone a cero a mano. Es la misma trampa que
     ya costó una medición en Z Force. */
  ren.info.autoReset = false;
  ren.info.reset();
  ren.setRenderTarget(rt);
  ren.render(escena, cam);
  /* ── LA SEGUNDA PASADA, SÓLO EN EL PLANO DE LA CARA ──
     La MISMA cámara con las capas cambiadas: el mundo vive en la capa 0 y la
     cabeza con sus tres luces en la 1, así que las dos pasadas comparten
     encuadre por construcción y no hay dos cámaras que puedan desincronizarse.
     Y se limpia con alfa CERO: lo que no es cabeza tiene que quedar
     transparente, porque el shader compone por el alfa. */
  if (postMat.uniforms.cara.value > 0.5){
    const al = ren.getClearAlpha();
    cam.layers.set(1);
    ren.setClearAlpha(0);
    ren.setRenderTarget(rtH);
    ren.render(escena, cam);
    ren.setClearAlpha(al);
    cam.layers.set(0);
  }
  ren.setRenderTarget(null);
  ren.render(postEsc, postCam);

  cuadros++; acum += dt;
  if (acum >= 0.5){
    fps = Math.round(cuadros/acum); cuadros = 0; acum = 0;
    DIB = ren.info.render.calls; TRI = ren.info.render.triangles;
  }
}

/* ══════════════════════════ EL ARRANQUE ══════════════════════════ */
const PASOS = [
  ['cCalles',  () => { armaCalles(); }],
  ['cVeredas', () => { armaCielo(); }],
  ['cCasas',   null],       /* las veinticinco cuadras van de a poco: ver abajo */
  ['cCercas',  null],
  ['cLuces',   () => { armaFaroles(); armaCharcos(); armaAutos(); }],
  ['cLluvia',  () => { armaLluvia(); armaSalpicaduras(); indexaColisiones(); }]
];
function paso(p, txt){
  $('cBar').style.width = (p*100).toFixed(1) + '%';
  $('cTxt').textContent = txt;
  /* DOS CUADROS Y NO UNO. Con un solo `requestAnimationFrame` el navegador
     agenda el repintado pero todavía no lo hizo, así que la barra de carga se
     queda clavada mientras el hilo construye la cuadra siguiente: se ve como
     que el juego se colgó. Con dos, el cuadro anterior ya está en pantalla. */
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

let TOTALES = { casas: 0, faroles: 0 };
async function construir(){
  medir();
  await paso(0.05, TX('cCalles'));
  armaCalles(); armaCielo();
  await paso(0.14, TX('cVeredas'));
  /* LAS CUADRAS SE CONSTRUYEN DE A UNA Y CON UN RESPIRO CADA CINCO. Las
     veinticinco de un tirón son casi un segundo de hilo bloqueado: la barra no
     se mueve, el navegador no repinta y en un teléfono aparece el aviso de
     página que no responde. */
  for (let i = 0; i < CUADRAS; i++){
    for (let j = 0; j < CUADRAS; j++) TOTALES.casas += armaCuadra(i, j, [0, 1]).casas;
    await paso(0.14 + 0.44*(i+1)/CUADRAS,
               TX(i < 3 ? 'cCasas' : 'cCercas'));
  }
  /* ── LA VUELTA DE AFUERA ──
     Cada cuadra de borde lleva casas SÓLO en el lado que mira a la calle
     exterior: las otras tres caras dan al campo, y una casa mirando al campo es
     una casa que nadie va a ver nunca por su frente. */
  for (let i = 0; i < CUADRAS; i++){
    TOTALES.casas += armaCuadra(i, -1, [1]).casas;         /* arriba, miran al sur */
    TOTALES.casas += armaCuadra(i, CUADRAS, [0]).casas;    /* abajo, miran al norte */
    TOTALES.casas += armaCuadra(-1, i, [3]).casas;         /* izquierda, miran al este */
    TOTALES.casas += armaCuadra(CUADRAS, i, [2]).casas;    /* derecha, miran al oeste */
  }
  await paso(0.62, TX('cCercas'));
  /* las cuatro esquinas, con dos frentes cada una */
  TOTALES.casas += armaCuadra(-1, -1, [1, 3]).casas;
  TOTALES.casas += armaCuadra(CUADRAS, -1, [1, 2]).casas;
  TOTALES.casas += armaCuadra(-1, CUADRAS, [0, 3]).casas;
  TOTALES.casas += armaCuadra(CUADRAS, CUADRAS, [0, 2]).casas;
  armaArboleda();
  await paso(0.70, TX('cCercas'));
  await paso(0.74, TX('cLuces'));
  armaFaroles(); armaCharcos(); armaAutos();
  TOTALES.faroles = FAROLES.length;
  await paso(0.90, TX('cLluvia'));
  armaLluvia(); armaSalpicaduras(); indexaColisiones();
  await paso(1.0, TX('cListo'));
}

async function arranca(){
  /* el idioma guardado, y si no el del navegador; y si tampoco, inglés */
  let g = null;
  try { g = localStorage.getItem('barrio.idioma'); } catch(e){}
  if (!g){ const n = (navigator.language || 'en').slice(0,2); if (TXT[n]) g = n; }
  ponIdioma(g || 'en');
  try { const c = localStorage.getItem('barrio_cal'); if (c && CALIDADES[c]) CALIDAD = c; } catch(e){}

  /* la pantalla de idioma se muestra ENSEGUIDA y el barrio se construye
     mientras tanto: son segundos que no dependen de qué idioma se elija */
  $('idioma').classList.add('on');
  let elegido = false;
  for (const b of document.querySelectorAll('#idioma button')){
    b.onclick = () => {
      ponIdioma(b.getAttribute('data-lang'));
      $('idioma').classList.remove('on');
      elegido = true;
      audioIniciar();          /* el primer gesto: ningún navegador deja sonar antes */
      if (AUD && AUD.state === 'suspended') AUD.resume();
    };
  }
  $('cPista').textContent = TX('pistas')[Math.floor(Math.random()*TX('pistas').length)];

  armaPanel();
  /* las siete texturas generadas se decodifican acá y no al lado de los
     materiales: `TEX_B64` es un `const` de otra parte y un `const` leído
     mientras se evalúa el módulo está en su zona muerta — ni `typeof` lo salva.
     Acá el módulo ya terminó de evaluarse. */
  cargaTexturas();
  await construir();

  /* el gancho de repintado se cuelga ANTES de esperar al idioma. Puesto
     después, en el instante en que se elige todavía no existe y el pie del menú
     se queda en el idioma anterior para siempre — ya pasó en LEMI. */
  window.repintaJuego = () => {
    $('mPie').textContent = TXF('mPie', TOTALES.casas, TOTALES.faroles, LADO);
    _calleAnt = ''; if (MODO === 'juego') ponCalle();
  };
  window.repintaJuego();

  CINE.arranca();
  bucle();
  await new Promise(r => { const v = () => elegido ? r() : setTimeout(v, 120); v(); });
  $('menu').classList.add('on');
  $('carga').classList.add('ido');
  setTimeout(() => $('carga').style.display = 'none', 700);
  ponCalidad(CALIDAD);

  /* ══════════════════════ LAS SONDAS ══════════════════════
     Todo lo que el banco necesita para medir el juego sin mirarlo. */
  window.__V = {
    CFG, JUG, escena, ren, T, cam, EJES, LADO,
    idioma: (v) => { if (v) ponIdioma(v); return IDIOMA; },
    calidad: (v) => { if (v) ponCalidad(v); return CALIDAD; },
    modo: () => MODO,
    entrar: () => { const b = $('mJugar'); if (b) b.click(); return MODO; },
    pausar: (v) => { pausa(!!v); return PAUSA; },
    helar: (v) => { CONGELADO = !!v; return CONGELADO; },
    pix: (n) => { if (n){ CFG.pix = n; medir(); } return { pix: CFG.pix, rt: rt ? [rt.width, rt.height] : null }; },
    movil: () => { modoPC(false); return document.body.className; },
    pc: () => { modoPC(true); return document.body.className; },
    poner: (x, z, yaw, pitch) => {
      JUG.x = x; JUG.z = z; JUG.y = alturaSuelo(x, z);
      JUG.vx = JUG.vz = 0;
      if (yaw !== undefined) JUG.yaw = yaw;
      if (pitch !== undefined) JUG.pitch = pitch;
      ponCam(0);
      return { x: +JUG.x.toFixed(2), z: +JUG.z.toFixed(2), y: +JUG.y.toFixed(3) };
    },
    /* camina de verdad N cuadros, pasando por la física y por el choque: es la
       única forma honesta de probar que se puede recorrer el barrio */
    anda: (n, correr, giro) => new Promise(res => {
      let i = 0, pasos = 0, dentroCasa = 0;
      const x0 = JUG.x, z0 = JUG.z, t0 = RELOJ.value;
      const un = () => {
        teclas.KeyW = true; corre = !!correr;
        if (giro) JUG.yaw += giro;
        if (enCasa(JUG.x, JUG.z)) dentroCasa++;
        pasos++;
        if (++i < n) requestAnimationFrame(un);
        else { teclas.KeyW = false; corre = false;
               res(JSON.stringify({ cuadros: pasos, dentroCasa,
                 metros: +Math.hypot(JUG.x-x0, JUG.z-z0).toFixed(1),
                 seg: +(RELOJ.value-t0).toFixed(1),
                 x:+JUG.x.toFixed(1), z:+JUG.z.toFixed(1),
                 y:+JUG.y.toFixed(3), suelo: +alturaSuelo(JUG.x, JUG.z).toFixed(3) })); }
      };
      requestAnimationFrame(un);
    }),
    /* cuánto le está costando el cuadro y con qué */
    tex: () => ({ pedidas: TEXGEN.pedidas, puestas: TEXGEN.puestas,
                  mapas: TEX_DESTINO.map(([n, d]) => [n, !!d().map,
                    d().map ? [+d().map.repeat.x.toFixed(2), +d().map.repeat.y.toFixed(2)] : null,
                    d().map && d().map.image ? (d().map.image.width || 0) : 0]) }),
    est: () => ({ fps, pix: CFG.pix, calidad: CALIDAD,
                  rt: rt ? [rt.width, rt.height] : null, escenario: [W, H2], girado: GIRADO,
                  dib: DIB, tri: TRI,
                  cuadrasVisibles: GRUPOS.filter(g => g.visible).length,
                  casas: TOTALES.casas, faroles: TOTALES.faroles,
                  gotas: LLUVIA.malla ? LLUVIA.malla.geometry.instanceCount : 0,
                  x:+JUG.x.toFixed(1), z:+JUG.z.toFixed(1) }),
    /* los faroles con luz de verdad, y a qué distancia están: es lo único que
       prueba que las seis luces se mudan a las seis más cercanas */
    luces: () => LUCES.map(l => ({
      i: +l.intensity.toFixed(1),
      d: +Math.hypot(l.position.x - JUG.x, l.position.z - JUG.z).toFixed(1),
      sombra: l.castShadow })),
    /* el brillo del cuadro, leído del buffer. Un lienzo WebGL sin
       `preserveDrawingBuffer` sale en cero con `drawImage`, así que hay que
       pedirle los píxeles al contexto. */
    /* SE LEE DEL DESTINO DE RENDER Y NO DE LA PANTALLA. Un lienzo WebGL sin
       `preserveDrawingBuffer` no conserva el cuadro después de dibujarlo, así
       que una lectura hecha desde afuera del bucle —que es como llama el
       banco— devuelve CEROS: medido, `medio 0` con el barrio entero en
       pantalla. Y prender `preserveDrawingBuffer` para poder medir es pagar
       una copia por cuadro en el juego de verdad. El destino de render es un
       framebuffer propio y sus píxeles siguen ahí. */
    brillo: () => {
      const w = rt.width, h = rt.height;
      const px = new Uint8Array(w*h*4);
      ren.readRenderTargetPixels(rt, 0, 0, w, h, px);
      let s = 0, mx2 = 0, enc = 0;
      const fr = [0,0,0,0,0], cnt = [0,0,0,0,0];
      for (let i = 0; i < w*h; i++){
        const v = (px[i*4]*0.299 + px[i*4+1]*0.587 + px[i*4+2]*0.114);
        s += v; if (v > mx2) mx2 = v; if (v > 26) enc++;
        const f = Math.min(4, Math.floor((Math.floor(i/w)) / (h/5)));
        fr[f] += v; cnt[f]++;
      }
      return { medio: +(s/(w*h)).toFixed(1), max: mx2,
               pctEncendido: +(enc/(w*h)*100).toFixed(1),
               franjas: fr.map((v,k) => +(v/cnt[k]).toFixed(1)), tam: [w, h] };
    },
    /* ── LA CINEMÁTICA ──
       `pon(t)` es puro, así que el banco puede fotografiar cualquier segundo sin
       esperarlo. Y NO REARRANCA LA SECUENCIA si ya está corriendo: en LEMI una
       sonda que llamaba a `muere()` en vez de mirarla devolvió `t: 0` en las
       cuatro muestras y parecía que el reloj no avanzaba. */
    cine: (t) => {
      if (!CINEMA.on) CINEMA.arranca();
      CINEMA.t = t; CINEMA.pon(t);
      cam.updateMatrixWorld(true);
      return JSON.stringify({ t, modo: MODO, plano: t < CINE_CORTE ? 'A' : 'B',
        cara: postMat.uniforms.cara.value, dof: +postMat.uniforms.dof.value.toFixed(3),
        fov: +cam.fov.toFixed(1),
        cam: [+cam.position.x.toFixed(2), +cam.position.y.toFixed(2), +cam.position.z.toFixed(2)],
        neg: +($('cineNeg').style.opacity || 0) });
    },
    saltarCine: () => { CINEMA.saltar(); return MODO; },
    /* dónde cae la cabeza en la pantalla, EN FRACCIÓN DEL CUADRO, y si está
       delante de la cámara. Lo segundo no es un detalle: un punto que está
       DETRÁS proyecta igual, dado vuelta, y cae dentro del rectángulo — ya dio
       un «entero y centrado» falso en RECREO y otro en LEMI. */
    caraEnCuadro: () => {
      if (!CARA || !CARA.visible) return JSON.stringify({ visible: false });
      CARA.updateMatrixWorld(true); cam.updateMatrixWorld(true);
      const caj = new T.Box3().setFromObject(CARA);
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9, delante = true;
      for (let i = 0; i < 8; i++){
        const v = new T.Vector3(i&1 ? caj.max.x : caj.min.x,
                                i&2 ? caj.max.y : caj.min.y,
                                i&4 ? caj.max.z : caj.min.z);
        const l = v.clone().applyMatrix4(cam.matrixWorldInverse);
        if (l.z > -0.02) delante = false;
        v.project(cam);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
        y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      const f = (a) => +((a + 1) / 2).toFixed(3);
      return JSON.stringify({ visible: true, delante,
        x: [f(x0), f(x1)], y: [f(y0), f(y1)],
        altoPct: +(((y1 - y0) / 2) * 100).toFixed(1) });
    },
    /* los párpados, que es lo único que el plano B tiene que contar */
    ojos: () => JSON.stringify({
      sup: +OJO_I.sup.rotation.x.toFixed(3), inf: +OJO_I.inf.rotation.x.toFixed(3),
      simetrico: Math.abs(OJO_I.sup.rotation.x - OJO_D.sup.rotation.x) < 1e-6,
      mira: [+OJO_I.mir.rotation.x.toFixed(3), +OJO_I.mir.rotation.y.toFixed(3)] }),
    rayo: () => { RAYO.prox = 0; RAYO.t = 0; return 'ok'; },
    verRayo: () => ({ t: +RAYO.t.toFixed(2), luz: +rayoLuz.intensity.toFixed(2),
                      velo: +($('rayo').style.opacity || 0) }),
    linterna: (v) => { ponLinterna(!!v); return CFG.linterna; },
    audio: () => ({ ctx: AUD ? AUD.state : null, lluvia: CAMA.gLluvia ? +CAMA.gLluvia.gain.value.toFixed(4) : null }),
    /* el nivel que sale por el maestro: es lo ÚNICO que prueba que algo sonó —
       que una llamada no tire excepción no quiere decir que haya sonido */
    oir: (ms) => new Promise(res => {
      if (!ANAL) return res('sin audio');
      const buf = new Float32Array(ANAL.fftSize);
      let pico = 0, sum = 0, n = 0;
      const t0 = performance.now();
      const un = () => {
        ANAL.getFloatTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++){ const a = Math.abs(buf[i]); if (a > pico) pico = a; sum += buf[i]*buf[i]; n++; }
        if (performance.now() - t0 < (ms || 900)) requestAnimationFrame(un);
        else res(JSON.stringify({ pico: +pico.toFixed(4), rms: +Math.sqrt(sum/n).toFixed(4) }));
      };
      un();
    }),
    son: (t, v) => { son(t, v); return t; },
    /* ¿el jugador quedó adentro de una casa? Es la prueba del choque, y no se
       puede hacer mirando una captura: entrar en una pared se ve como estar
       adentro de un cuarto oscuro, que de noche es casi lo mismo que la niebla */
    enCasa: (x, z) => enCasa(x === undefined ? JUG.x : x, z === undefined ? JUG.z : z),
    /* recorre el barrio entero por una calle y cuenta cuántas veces se metió
       dentro de algo: mil metros de damero en una sola corrida */
    nan: () => {
      const malas = [];
      const v = { 'JUG.x':JUG.x, 'JUG.z':JUG.z, 'JUG.y':JUG.y, 'yaw':JUG.yaw, 'pitch':JUG.pitch,
                  'cam.x':cam.position.x, 'cam.y':cam.position.y, 'cam.z':cam.position.z,
                  'fov':cam.fov, 'AND.v':AND.v };
      for (const k of Object.keys(v)) if (!Number.isFinite(v[k])) malas.push(k);
      return malas;
    },
    /* dónde caen en la pantalla los elementos del HUD, para poder afirmar que
       no se pisan sin mirar una foto. Con el cuadro girado hay que medir con
       `offsetLeft/offsetTop`, que son coordenadas de la caja:
       `getBoundingClientRect` devuelve la caja alineada a los ejes y da falsos
       positivos. */
    hud: () => {
      const ids = ['reloj','calle','botones','acciones','teclas','joy'];
      const r = [];
      for (const id of ids){
        const e = $(id); if (!e || getComputedStyle(e).display === 'none') continue;
        r.push([id, e.offsetLeft, e.offsetTop, e.offsetWidth, e.offsetHeight]);
      }
      const ch = [];
      for (let i = 0; i < r.length; i++) for (let j = i+1; j < r.length; j++){
        const a = r[i], b = r[j];
        if (a[1] < b[1]+b[3] && b[1] < a[1]+a[3] && a[2] < b[2]+b[4] && b[2] < a[2]+a[4])
          ch.push(a[0]+'|'+b[0]);
      }
      return { cajas: r, choques: ch };
    }
  };
}

/* ¿el punto cae dentro de alguna casa? Se usa para probar el choque y va contra
   la MISMA lista que construyó las casas, no contra una copia. */
function enCasa(x, z){
  for (const c of CASAS){
    const co = Math.cos(-c.rot), si = Math.sin(-c.rot);
    const dx = x - c.x, dz = z - c.z;
    const lx = dx*co + dz*si, lz = -dx*si + dz*co;
    if (Math.abs(lx) < c.w/2 - 0.05 && Math.abs(lz) < c.d/2 - 0.05) return true;
  }
  return false;
}

function armaPanel(){
  $('bPanel').onclick = () => pausa(!PAUSA);
  $('pSeguir').onclick = () => pausa(false);
  $('pMenu').onclick = () => vuelveMenu();
  $('mJugar').onclick = async () => {
    audioIniciar();
    if (AUD && AUD.state === 'suspended') AUD.resume();
    await pantallaCompleta();
    /* LA CINEMÁTICA SE VE UNA VEZ SOLA POR SU CUENTA. La primera partida entra
       por la escena; de ahí en más JUGAR es JUGAR, y quien la quiera ver de
       nuevo la tiene en su propio botón. Una escena obligatoria repetida deja
       de ser una escena y pasa a ser un peaje. */
    let vista = false;
    try { vista = localStorage.getItem('barrio_cine') === '1'; } catch(e){}
    if (vista) entraJuego(); else CINEMA.arranca();
  };
  $('mCine').onclick = async () => {
    audioIniciar();
    if (AUD && AUD.state === 'suspended') AUD.resume();
    await pantallaCompleta();
    CINEMA.arranca();
  };
  $('bFull').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen(); else pantallaCompleta();
  };
  $('acCorre').ontouchstart = () => { corre = true; $('acCorre').classList.add('on'); };
  $('acCorre').ontouchend = () => { corre = false; $('acCorre').classList.remove('on'); };
  $('acLinterna').onclick = () => ponLinterna(!CFG.linterna);
  for (const b of document.querySelectorAll('#mCal .chip'))
    b.onclick = () => ponCalidad(b.dataset.cal);
  for (const b of document.querySelectorAll('#mIdi .chip'))
    b.onclick = () => { ponIdioma(b.dataset.lang); pintaAjustes(); };
  /* un toque en cualquier lado destraba el audio: ningún navegador deja sonar
     sin un gesto, y el gesto de la pantalla de idioma se pierde si alguien
     entra directo con el teclado */
  addEventListener('pointerdown', () => {
    audioIniciar();
    if (AUD && AUD.state === 'suspended') AUD.resume();
    if (MODO === 'cine') CINEMA.saltar();
  }, { once: false });
  addEventListener('keydown', (e) => {
    if (MODO === 'cine' && (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter'))
      CINEMA.saltar();
  });
}

window.__errs = [];
addEventListener('error', e => window.__errs.push(String(e.message || e)));
addEventListener('unhandledrejection', e => window.__errs.push('promesa: ' + String(e.reason)));
arranca();
