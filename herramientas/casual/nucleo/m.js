/* ══════════════════════ LA MANO POR LA CAMARA ══════════════════════
   MediaPipe lee la mano y de los veintiun puntos sale UNA cosa: que gesto es.
   No se dibuja la mano en 3D ni se apunta con ella —eso ya lo hacen RECREO y
   RezUno—: acá lo unico que hace falta es piedra, papel o tijera, o sea un
   simbolo, y un simbolo es mucho mas barato y mucho mas robusto que una
   posicion.

   ── TODO LO QUE SIGUE SALE DE DOS JUEGOS QUE YA COSTARON SUS VUELTAS ──
   1. LA CAMARA SE PIDE CON `exact` Y NO COMO PREFERENCIA. `facingMode:'user'` a
      secas es un DESEO: el navegador abre la que quiera. Con `exact`, si la
      peticion vuelve ES esa camara; si no hay, tira y se prueba la otra.
   2. LA ENTRADA VA A 640x480 Y NO A 256x192. Medido en RezUno: diez veces mas
      pixeles NO cuestan mas —MediaPipe redimensiona adentro al tamano de sus
      modelos— y bajarla es regalar deteccion a cambio de nada.
   3. LOS UMBRALES VAN BAJOS (0,4 / 0,4 / 0,3). Soltar una mano ya encontrada no
      cuesta un cuadro: la medicion siguiente tiene que volver a correr el
      buscador de palma, que es la parte cara. Dudar sale mas caro que seguir.
   4. LA MEDICION CUELGA DEL CUADRO DE CAMARA y no del de render: con
      `requestVideoFrameCallback` corre una vez por cuadro de camara, que es lo
      unico que puede traer datos nuevos.
   5. GPU PRIMERO Y CPU DE RESPALDO: en telefonos viejos el delegado de GPU tira
      al crear la tarea, y un detector a 15 por segundo en CPU sigue siendo
      jugable.
   6. DOS CDN: el detector es una descarga de un tercero, y si ese tercero no
      contesta el juego se queda sin manos y el jugador no puede hacer nada.
   7. EL GESTO NO SE TOMA, SE SOSTIENE. Un gesto mal leido en un juego donde el
      gesto es la jugada es una derrota que el jugador no entiende: cada lectura
      tiene que ganar tres cuadros seguidos para valer. */

const MANO_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MANO_CDN = [
  { js: MANO_URL, wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm' },
  { js: 'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
    wasm: 'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm' }];
const MANO_MODELO = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const MANO_ENT_W = 640, MANO_ENT_H = 480;

const MANO = {
  estado: 'no',      /* no · pidiendo · lista · permiso · camara · cdn · modelo · insegura */
  det: null, vid: null, usa: '', espejo: true, delegado: '',
  pts: null,         /* los 21 puntos crudos, para dibujar */
  dedos: -1,         /* cuantos estirados, crudo */
  gesto: null,       /* 'piedra' · 'papel' · 'tijera' · null, ya votado */
  gestoCrudo: null,
  n: 0, hz: 0,
  _votos: [], _ultT: 0, _huecos: 0
};
/* ── LA CAMARA FRONTAL, Y ACA SI ES LA CORRECTA ──
   Al reves de RECREO y RezUno, donde se mete la mano POR DETRAS del telefono
   para que entre en la escena. Piedra papel o tijera se juega mostrando la mano
   DE FRENTE, como se juega de verdad, y el jugador tiene que poder verse: con la
   trasera habria que apuntar el telefono para el otro lado y jugar a ciegas. */
const MANO_PREF = 'user';

function manoFallo(q){ MANO.estado = q; if (window.pintaMano) window.pintaMano(); }

async function manoPide(){
  if (MANO.estado === 'lista' || MANO.estado === 'pidiendo') return MANO.estado === 'lista';
  MANO.estado = 'pidiendo';
  if (window.pintaMano) window.pintaMano();
  /* sin HTTPS `navigator.mediaDevices` NO EXISTE, asi que no hay permiso que
     negar: el navegador ni pregunta */
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ manoFallo('insegura'); return false; }
  const pedir = (v) => navigator.mediaDevices.getUserMedia({
    video: Object.assign({ width: { ideal: MANO_ENT_W }, height: { ideal: MANO_ENT_H },
                           frameRate: { ideal: 60 } }, v), audio: false });
  let flujo = null, cierto = '';
  const otra = MANO_PREF === 'user' ? 'environment' : 'user';
  try { flujo = await pedir({ facingMode: { exact: MANO_PREF } }); cierto = MANO_PREF; }
  catch(e){
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')){ manoFallo('permiso'); return false; }
    try { flujo = await pedir({ facingMode: { exact: otra } }); cierto = otra; }
    catch(e2){
      if (e2 && (e2.name === 'NotAllowedError' || e2.name === 'SecurityError')){ manoFallo('permiso'); return false; }
      try { flujo = await pedir({}); }
      catch(e3){ manoFallo((e3 && (e3.name === 'NotFoundError' || e3.name === 'OverconstrainedError')) ? 'camara' : 'permiso'); return false; }
    }
  }
  const v = $('camVid');
  v.srcObject = flujo; MANO.vid = v;
  try { await v.play(); } catch(e){}
  try {
    const tr = flujo.getVideoTracks()[0];
    const s = tr.getSettings ? tr.getSettings() : {};
    /* ── EL ESPEJO SE LEE DEL TRACK Y LA REGLA ES ASIMETRICA ──
       Una camara que NO dice para donde mira no es la trasera: un telefono
       informa su `facingMode` y una webcam callada es de las que apuntan a la
       cara. Medido en el banco, `getSettings()` de una camara de notebook no
       trae la clave, y suponer «trasera» dejaba la imagen sin espejo. */
    MANO.usa = cierto || s.facingMode || 'user';
    MANO.espejo = (MANO.usa !== 'environment');
  } catch(e){ MANO.usa = cierto || 'user'; MANO.espejo = true; }

  let vision = null;
  for (const cdn of MANO_CDN){
    try { vision = await import(/* @vite-ignore */ cdn.js); MANO.cdn = cdn; break; } catch(e){}
  }
  if (!vision){ manoFallo('cdn'); return false; }
  try {
    const fs = await vision.FilesetResolver.forVisionTasks(MANO.cdn.wasm);
    for (const del of ['GPU','CPU']){
      try {
        MANO.det = await vision.HandLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetPath: MANO_MODELO, delegate: del },
          runningMode: 'VIDEO', numHands: 1,
          minHandDetectionConfidence: 0.4, minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.3 });
        MANO.delegado = del; break;
      } catch(e){}
    }
  } catch(e){}
  if (!MANO.det){ manoFallo('modelo'); return false; }
  MANO.estado = 'lista';
  if (window.pintaMano) window.pintaMano();
  manoLazo();
  return true;
}

/* la medicion cuelga del cuadro de CAMARA: es lo unico que puede traer datos
   nuevos, y colgada del render se mide dos veces el mismo cuadro */
function manoLazo(){
  const v = MANO.vid;
  if (!v || !MANO.det) return;
  const paso = () => {
    if (!MANO.det) return;
    try {
      const t = performance.now();
      const r = MANO.det.detectForVideo(v, t);
      manoLee(r && r.landmarks && r.landmarks[0] ? r.landmarks[0] : null);
      if (MANO._ultT) MANO.hz = Math.round(1000/Math.max(1, t - MANO._ultT));
      MANO._ultT = t;
      MANO.n++;
    } catch(e){}
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
    else setTimeout(paso, 40);
  };
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
  else setTimeout(paso, 40);
}

/* ══════════ DE VEINTIUN PUNTOS A UN SIMBOLO ══════════
   ── TODO SE MIDE EN PROPORCION AL TAMANO DE LA PALMA ──
   La mano puede estar a veinte centimetros o a un metro de la camara, asi que
   ninguna distancia en pixeles sirve. La palma —muñeca al nudillo del medio— es
   invariante a la distancia Y al tamano de la mano de quien juega. Es la misma
   regla que en RECREO.

   ── Y EL PULGAR NO SE MIDE COMO LOS DEMAS ──
   Los otros cuatro se estiran ALEJANDO la punta de la muñeca. El pulgar se abre
   hacia el COSTADO, y su punta puede quedar a la misma distancia de la muñeca
   abierto o cerrado: se mide contra el nudillo del MENIQUE, del que se aleja al
   abrirse y al que le cruza por delante al cerrarse. Sin esa distincion, «cinco
   dedos» no existe. */
const M_TIP = [4, 8, 12, 16, 20], M_PIP = [3, 6, 10, 14, 18];
function manoLee(pts){
  MANO.pts = pts;
  if (!pts){
    MANO.dedos = -1; MANO.gestoCrudo = null;
    MANO._huecos++;
    /* ── LA CADUCIDAD SE MIDE EN HUECOS Y NO EN MILISEGUNDOS ──
       280 ms fijos son once mediciones a 40 Hz y tres y media a 12: en un
       aparato lento, dos fallos seguidos borraban el gesto. */
    if (MANO._huecos > 5){ MANO.gesto = null; MANO._votos.length = 0; }
    return;
  }
  MANO._huecos = 0;
  const d = (a, b) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
  const palma = Math.max(0.0001, d(0, 9));
  const est = [];
  /* el pulgar: abierto se aleja del nudillo del meñique */
  est.push(d(4, 17)/palma > 0.92);
  for (let i = 1; i < 5; i++){
    /* la punta mas lejos de la muñeca que la falange de en medio */
    est.push(d(M_TIP[i], 0) > d(M_PIP[i], 0)*1.14);
  }
  const n = est.filter(Boolean).length;
  MANO.dedos = n;
  let g = null;
  if (n <= 1) g = 'piedra';
  else if (n >= 4) g = 'papel';
  else if (n === 2 && est[1] && est[2]) g = 'tijera';
  /* dos dedos que NO son el indice y el medio no son tijera: es una mano a
     medio cerrar, y tomarla por tijera es perder una ronda por una lectura */
  MANO.gestoCrudo = g;
  MANO._votos.push(g);
  if (MANO._votos.length > 3) MANO._votos.shift();
  if (MANO._votos.length === 3 && MANO._votos[0] === MANO._votos[1] &&
      MANO._votos[1] === MANO._votos[2]) MANO.gesto = MANO._votos[0];
}

function manoVer(){
  return { estado: MANO.estado, usa: MANO.usa, espejo: MANO.espejo,
           delegado: MANO.delegado, n: MANO.n, hz: MANO.hz,
           dedos: MANO.dedos, gesto: MANO.gesto, crudo: MANO.gestoCrudo,
           pts: MANO.pts ? MANO.pts.length : 0, huecos: MANO._huecos };
}
/* la sonda: una mano de mentira con los dedos que se pidan, para poder probar
   el camino entero sin una camara */
function manoFalsa(dedos, tijera){
  const p = [];
  for (let i = 0; i < 21; i++) p.push({ x: 0.5, y: 0.5, z: 0 });
  p[0] = { x: 0.5, y: 0.9, z: 0 };      /* muñeca */
  p[9] = { x: 0.5, y: 0.62, z: 0 };     /* nudillo del medio: la palma mide 0,28 */
  p[17] = { x: 0.40, y: 0.68, z: 0 };   /* nudillo del meñique */
  const abierto = [];
  if (tijera){ abierto.push(1, 2); }
  else if (dedos >= 4){ abierto.push(0, 1, 2, 3, 4); }
  else for (let i = 1; i <= dedos; i++) abierto.push(i);
  for (let i = 0; i < 5; i++){
    const ab = abierto.indexOf(i) >= 0;
    const bx = 0.34 + i*0.08;
    if (i === 0){
      /* el pulgar: abierto se va al costado y lejos del meñique */
      p[3] = { x: ab ? 0.72 : 0.50, y: 0.74, z: 0 };
      p[4] = { x: ab ? 0.82 : 0.46, y: 0.70, z: 0 };
    } else {
      p[M_PIP[i]] = { x: bx, y: 0.56, z: 0 };
      p[M_TIP[i]] = { x: bx, y: ab ? 0.30 : 0.66, z: 0 };
    }
  }
  manoLee(p);
  return manoVer();
}
