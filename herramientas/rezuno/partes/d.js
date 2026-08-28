/* =========================================================================================
   LA MANO

   Este juego necesita DOS cosas de la camara y nada mas: donde esta la mano en la pantalla, y si el
   pulgar y el indice se estan tocando. Todo lo demas —cuantos dedos, que gesto, la mano en 3D— es
   trabajo que no se usa, asi que no se hace: se pide UNA mano y se leen cuatro puntos.

   TRES COSAS QUE HAY QUE HACER BIEN Y NO SON OBVIAS, las tres aprendidas en RECREO:

   1. LA MEDICION NO VA EN EL BUCLE DE DIBUJO. detectForVideo() tarda entre 8 y 20 ms en un telefono,
      y con 16,6 ms de presupuesto para 60 fps cada cuadro pagaria la medicion entera. La maneja
      requestVideoFrameCallback del propio <video>, que dispara una vez por cuadro de CAMARA y no de
      render. Entre medicion y medicion la posicion se interpola.

   2. LA CAMARA SE PIDE ANTES QUE EL MODELO. El detector son dos descargas de un CDN mas un modelo de
      7,8 MB, o sea varios segundos: pidiendolos primero, cuando por fin se llama a getUserMedia el
      gesto del jugador ya expiro y Safari lo rechaza SIN mostrar el cartelito. La camara va en la
      primera linea y la descarga despues.

   3. EL ESPEJO SE LEE DEL TRACK Y NO SE SUPONE. Con la camara frontal la imagen va espejada y con la
      trasera no; si se espeja al reves, mover la mano a la derecha mueve el aro a la izquierda y no
      hay forma de apuntar a una carta. Aca se usa la FRONTAL, que es la que mira a alguien sentado
      jugando a las cartas, pero igual se lee del track.
   ========================================================================================= */
const MANO={ on:false, estado:'no', det:null, vid:null, hay:false, error:'', delegado:'',
             x:0.5, y:0.5, pinza:false, pinzaNueva:false, crudo:0, hz:0, medidas:0,
             espejo:true, msDet:0, cdn:null, listaEn:0,
             /* LOS 21 PUNTOS FILTRADOS, para poder DIBUJAR la mano y no solo apuntar con ella. Se
                guardan en un arreglo plano de 63 numeros y no en 21 objetos: los objetos habria que
                crearlos de nuevo en cada medicion —2.520 objetos por segundo a la basura— y el
                arreglo se escribe encima. */
             pts:new Float32Array(63), hayPts:false, usa:'' };
/* cual camara se prefiere. Se guarda, porque es una eleccion del jugador y no del aparato. */
let CAM_PREF='environment';
try{ const g=localStorage.getItem('rezuno_cam'); if(g==='user'||g==='environment') CAM_PREF=g; }catch(e){}
/* LA CARA, Y SOLO PARA MOVER LA VISTA. Pedido: "agrega reconocimiento facial o sea solamente para el
   movimiento y pon que el jugador pueda mirar a los lados con solo girar su cabeza". No se lee ningun
   gesto de la cara: se lee UN numero, el giro horizontal, y se usa para mover la camara. */
const CARA={ on:false, det:null, hay:false, giro:0, crudo:0, medidas:0, msDet:0, error:'' };

const MANO_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MANO_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
/* DOS CDN. El detector es una descarga de un tercero: si ese tercero no contesta, el juego se queda
   sin manos y no hay nada que el jugador pueda hacer. */
const MANO_CDN=[{ js:MANO_URL, wasm:MANO_WASM },
                { js:'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
                  wasm:'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm' }];
const MANO_MODELO='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
/* 256x192 y no 480x360: son 2,8 veces menos pixeles para la misma mano, y la mano ocupa medio cuadro */
const MANO_ENT_W=256, MANO_ENT_H=192;
const MANO_HZ=45;             // techo de mediciones por segundo
const MANO_CADUCA=280;        // sin medicion nueva por mas de esto, la mano se fue
/* ===================== LA CARA VA A 12 Hz Y NO A 45 =====================
   Son DOS modelos corriendo sobre el mismo video, asi que el costo se suma: medir las dos cosas al
   mismo ritmo seria mas del doble de trabajo por cuadro de camara. Y no hace falta — una cabeza que
   gira tarda medio segundo en ir de un lado al otro, o sea que a 12 Hz se la mide seis veces en el
   camino, y encima el giro entra por un suavizado. La mano SI necesita ritmo: es lo que apunta. */
const CARA_HZ=12;
const CARA_MODELO='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const CARA_CADUCA=900;

function d3(a,b){ const x=a.x-b.x, y=a.y-b.y, z=(a.z||0)-(b.z||0); return Math.hypot(x,y,z); }

/* ===================== EL PELLIZCO =====================
   Distancia pulgar-indice DIVIDIDA POR EL TAMAÑO DE LA PALMA, y esa division es todo el asunto: la
   mano puede estar a 20 cm de la camara o a un metro, asi que ninguna distancia en fracciones de
   cuadro sirve por si sola. La palma (muñeca -> nudillo del medio) es invariante a la distancia y al
   tamaño de la mano de quien juega.
   Medido en RECREO con manos sinteticas: un pellizco da 0,06 y un puño 0,88 — catorce veces de
   margen, asi que el umbral en 0,45 no esta apretado ni de casualidad. */
const PINZA_CIERRA=0.42, PINZA_ABRE=0.58;
function leerPinza(lm){
  const palma=d3(lm[0], lm[9]) || 1e-6;
  return d3(lm[4], lm[8]) / palma;
}

/* ===================== EL FILTRO =====================
   Un filtro de constante fija no puede ganar: si suaviza poco pasa el temblor del detector, y si
   suaviza mucho el aro llega tarde. Las dos cosas no pasan al mismo tiempo, asi que la constante
   tiene que depender de la velocidad. Esto es un 1-euro: con la mano quieta baja el corte —donde lo
   unico que se mueve es ruido— y lo abre cuando la mano se mueve.
   LA ZONA MUERTA SOBRE LA DERIVADA es lo que evita que el propio ruido abra el filtro: sin ella, la
   mano quieta "se mueve" unos puntos por cuadro y el filtro lo interpreta como movimiento real. */
const OE={ fcMin:0.9, beta:38.0, fcD:2.4, dz:0.0012 };
function oeAlfa(fc, dt){ const tau=1/(2*Math.PI*fc); return 1/(1+tau/dt); }
const F={ x:{v:0,d:0,ini:false}, y:{v:0,d:0,ini:false} };
/* UN FILTRO POR COORDENADA DE CADA PUNTO. Son 63 estados y parece mucho, pero es lo mismo que se le
   hace al punto del aro: sin filtrar, los veintiun puntos vibran cada uno por su cuenta y la mano
   dibujada hierve. Se crean UNA vez y se escriben encima. */
const FP=[]; for(let k=0;k<63;k++) FP.push({v:0,d:0,ini:false});
function fpReset(){ for(const q of FP) q.ini=false; F.x.ini=false; F.y.ini=false; }
function oePaso(S, x, dt){
  if(!S.ini){ S.v=x; S.d=0; S.ini=true; return x; }
  let d=(x-S.v)/dt;
  const a=Math.abs(d);
  d = a<OE.dz/dt? 0 : d*(1 - (OE.dz/dt)/a);
  const ad=oeAlfa(OE.fcD, dt);
  S.d = S.d + ad*(d-S.d);
  const fc=OE.fcMin + OE.beta*Math.abs(S.d);
  const al=oeAlfa(fc, dt);
  S.v = S.v + al*(x-S.v);
  return S.v;
}

function manoFallo(cual){
  MANO.estado='no'; MANO.error=cual; MANO.on=false;
  if(typeof pintarCam==='function') pintarCam();
}

async function manosIniciar(){
  if(MANO.estado==='lista'||MANO.estado==='carga') return MANO.on;
  MANO.estado='carga'; MANO.error='';
  if(typeof pintarCam==='function') pintarCam();
  /* SIN HTTPS navigator.mediaDevices NO EXISTE, asi que no hay permiso que negar: el navegador ni
     pregunta. Es la causa mas facil de confundir con un error del juego. */
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ manoFallo('insegura'); return false; }
  /* ===================== LA TRASERA POR OMISION =====================
     Pedido: *"quiero ver la mano we, como el de baldi, camara trasera"*. Y es la eleccion correcta
     para lo que hace este juego: con la trasera se sostiene el telefono y se mete la mano POR DETRAS,
     asi que la mano entra en la escena por donde entraria de verdad y no hay que apuntarse a uno
     mismo. Con la frontal hay que dejar el telefono apoyado y jugar de lejos.

     SE PIDE LA TRASERA Y SE ACEPTA LA QUE HAYA. `exact` fallaria en cualquier notebook —no tienen
     camara trasera— y dejaria el juego sin manos por pedir algo que no existe. Se pide como
     PREFERENCIA, y si el aparato solo tiene una, esa se usa. Despues se lee del track cual toco. */
  let flujo=null;
  const pedirCam=async (modo)=>navigator.mediaDevices.getUserMedia({
      video:{ facingMode:modo, width:{ideal:640}, height:{ideal:480} }, audio:false });
  try{
    flujo=await pedirCam(CAM_PREF);
  }catch(e){
    /* si la preferida no esta, se prueba la otra antes de darse por vencido */
    try{ flujo=await pedirCam(CAM_PREF==='environment'? 'user':'environment'); }
    catch(e2){
      manoFallo((e2 && (e2.name==='NotFoundError'||e2.name==='OverconstrainedError'))? 'camara' : 'permiso');
      return false;
    }
  }
  const v=document.getElementById('camVid');
  v.srcObject=flujo; MANO.vid=v;
  try{ await v.play(); }catch(e){}
  /* la entrada se achica en el propio track: menos pixeles que subir a la GPU en cada medicion */
  try{ const tr=flujo.getVideoTracks()[0];
       await tr.applyConstraints({ width:{ideal:MANO_ENT_W}, height:{ideal:MANO_ENT_H} });
       const s=tr.getSettings? tr.getSettings() : {};
       const cp=tr.getCapabilities? tr.getCapabilities() : {};
       /* EL ESPEJO SE LEE DEL TRACK Y NO SE SUPONE. Con la frontal la imagen va espejada y con la
          trasera no; si se espeja al reves, mover la mano a la derecha mueve la mano del juego a la
          izquierda y no hay forma de apuntar a una carta.

          Y NO ALCANZA CON MIRAR QUE CAMARA SE PIDIO, que es lo que hacia antes. Medido en el banco:
          `getSettings()` de una camara de notebook NO TRAE la clave `facingMode` —la lista
          `getCapabilities()`, pero el valor no esta—, asi que `s.facingMode || CAM_PREF` devolvia
          'environment' de puro respaldo y dejaba SIN espejo una camara que apunta al jugador. En un
          aparato asi, mover la mano a la derecha movia la mano del juego a la izquierda.

          La regla correcta es asimetrica: una camara que no dice para donde mira NO es la trasera.
          Un telefono informa su facingMode; una webcam callada es de las que te apuntan a la cara.
          Asi que solo un track que diga 'environment' apaga el espejo, y el silencio se lee frontal
          —que es tambien lo que dice la linea de estado, para que el cartel y el espejo no puedan
          contradecirse. */
       let fm = s.facingMode || '';
       if(!fm && Array.isArray(cp.facingMode) && cp.facingMode.length===1) fm=cp.facingMode[0];
       MANO.usa = fm || 'user';
       MANO.espejo = (MANO.usa!=='environment');
  }catch(e){ MANO.usa='user'; MANO.espejo=true; }

  let vision=null;
  for(const cdn of MANO_CDN){
    try{ vision=await import(/* @vite-ignore */ cdn.js); MANO.cdn=cdn; break; }catch(e){}
  }
  if(!vision){ manoFallo('cdn'); return false; }
  let _fs=null;
  try{
    const fs=await vision.FilesetResolver.forVisionTasks(MANO.cdn.wasm); _fs=fs;
    /* GPU primero y CPU de respaldo: en telefonos viejos el delegado de GPU tira al crear la tarea, y
       un detector a 15 fps en CPU sigue siendo jugable. */
    for(const del of ['GPU','CPU']){
      try{
        MANO.det=await vision.HandLandmarker.createFromOptions(fs,{
          baseOptions:{ modelAssetPath:MANO_MODELO, delegate:del },
          runningMode:'VIDEO', numHands:1,
          minHandDetectionConfidence:0.5, minHandPresenceConfidence:0.5, minTrackingConfidence:0.5 });
        MANO.delegado=del; break;
      }catch(e){}
    }
  }catch(e){}
  if(!MANO.det){ manoFallo('modelo'); return false; }
  MANO.estado='lista'; MANO.on=true; MANO.listaEn=performance.now();
  if(typeof pintarCam==='function') pintarCam();
  manosLazo();
  /* LA CARA SE PIDE DESPUES Y SIN BLOQUEAR. Es otro modelo de varios megas: esperarlo antes de dejar
     jugar seria hacer esperar por algo que solo mueve la vista. Si no llega, el juego se juega igual
     con la camara quieta — que es exactamente lo que pasaba antes de que existiera. */
  /* ===================== LA CARA SOLO SIRVE CON LA FRONTAL =====================
     Y esto no es un detalle de implementacion: con la camara trasera tu cara esta del OTRO lado del
     telefono. Girar la cabeza no puede mover la vista porque no hay nada que mirar. En vez de dejar
     un detector corriendo que no va a encontrar nada nunca —gastando la mitad del presupuesto de la
     camara para eso— ni siquiera se pide el modelo, y la linea de estado lo dice.
     El jugador elige: TRASERA para meter la mano por detras como en RECREO, o FRONTAL para que
     ademas se pueda mirar a los lados girando la cabeza. Las dos cosas no caben en una camara. */
  if(MANO.usa!=='environment') caraIniciar(vision, _fs);
  return true;
}
async function caraIniciar(vision, fs){
  if(!vision || !fs || CARA.det) return;
  for(const del of ['GPU','CPU']){
    try{
      CARA.det=await vision.FaceLandmarker.createFromOptions(fs,{
        baseOptions:{ modelAssetPath:CARA_MODELO, delegate:del },
        runningMode:'VIDEO', numFaces:1,
        /* la matriz de transformacion es lo unico que se pide: de ahi sale el giro de la cabeza sin
           tener que deducirlo de la geometria de la cara */
        outputFacialTransformationMatrixes:true, outputFaceBlendshapes:false });
      break;
    }catch(e){ CARA.error=String(e && e.message || e).slice(0,60); }
  }
  CARA.on=!!CARA.det;
}

let _ultMed=0, _ultVista=0, _pinzaCruda=false, _ultCara=0;
/* EL GIRO DE LA CABEZA SALE DE LA MATRIZ Y NO DE LOS PUNTOS. Deducirlo de "donde cae la nariz entre
   los dos ojos" funciona hasta que la persona se inclina o se acerca; la matriz que devuelve el
   modelo ya trae la rotacion resuelta. El elemento [8] de una matriz columna-mayor es el seno del
   giro alrededor del eje vertical. */
function caraMedir(t){
  if(!CARA.det || !MANO.vid || MANO.vid.readyState<2) return;
  if(t-_ultCara < 1000/CARA_HZ) return;
  const a=performance.now();
  let r=null;
  try{ r=CARA.det.detectForVideo(MANO.vid, t); }catch(e){ return; }
  CARA.msDet=CARA.msDet*0.85+(performance.now()-a)*0.15;
  _ultCara=t; CARA.medidas++;
  const m=r && r.facialTransformationMatrixes && r.facialTransformationMatrixes[0];
  if(!m || !m.data){ return; }
  const d=m.data;
  let g=Math.asin(Math.max(-1, Math.min(1, d[8])));
  if(MANO.espejo) g=-g;
  CARA.crudo=g;
  /* suavizado exponencial: la cabeza se mueve despacio y el ruido del modelo no, asi que aca alcanza
     con una constante fija — no hace falta el 1-euro que si necesita la mano */
  CARA.giro += (g-CARA.giro)*0.25;
  CARA.hay=true; CARA.visto=t;
}
function manosMedir(t){
  if(!MANO.det || !MANO.vid || MANO.vid.readyState<2) return;
  if(t-_ultMed < 1000/MANO_HZ) return;
  const a=performance.now();
  let r=null;
  try{ r=MANO.det.detectForVideo(MANO.vid, t); }catch(e){ return; }
  MANO.msDet = MANO.msDet*0.85 + (performance.now()-a)*0.15;
  _ultMed=t; MANO.medidas++;
  const lms=(r && r.landmarks) || [];
  if(!lms.length) return;
  manosInyectar(lms[0], t);
}
/* SE SEPARA DE LA MEDICION PARA PODER PROBARLA. Con manosInyectar() suelta, una mano de mentira entra
   por el mismo camino que la de verdad: el filtro, el umbral del pellizco y el flanco se prueban sin
   camara y sin persona. */
function manosInyectar(lm, t){
  const ex = MANO.espejo? (v)=>1-v : (v)=>v;
  /* EL PUNTO DEL ARO ES EL MEDIO ENTRE EL PULGAR Y EL INDICE, y no la punta del indice: es donde el
     jugador VE que se cierra la pinza, asi que es donde tiene que estar el aro. Con la punta del
     indice, al cerrar la pinza el aro se corre un centimetro justo en el momento de elegir. */
  const px=(lm[4].x+lm[8].x)/2, py=(lm[4].y+lm[8].y)/2;
  const dt=Math.max(0.001, Math.min(0.2, (t-_ultVista)/1000)) || 0.02;
  _ultVista=t;
  MANO.x=oePaso(F.x, ex(px), dt);
  MANO.y=oePaso(F.y, py, dt);
  /* LOS 21 PUNTOS, POR EL MISMO FILTRO Y CON EL MISMO ESPEJO QUE EL ARO. Que compartan filtro y
     espejo no es ahorro de lineas: es lo que garantiza que la mano DIBUJADA y el punto que APUNTA no
     puedan separarse. Si fueran dos caminos, el jugador veria su pinza en un lugar y agarraria una
     carta en otro — que es exactamente el defecto que se reporto en RECREO con el rompecabezas. */
  for(let k=0;k<21;k++){
    const q=lm[k];
    MANO.pts[k*3]   = oePaso(FP[k*3],   ex(q.x), dt);
    MANO.pts[k*3+1] = oePaso(FP[k*3+1], q.y,     dt);
    MANO.pts[k*3+2] = oePaso(FP[k*3+2], q.z||0,  dt);
  }
  MANO.hayPts=true;
  MANO.crudo=leerPinza(lm);
  /* HISTERESIS Y NO UN UMBRAL SOLO. Con un umbral unico, una pinza que queda justo en el borde
     parpadea entre abierta y cerrada varias veces por segundo, y cada parpadeo es un "click": el
     jugador tira una carta que no quiso. Cierra en 0,42 y abre recien en 0,58. */
  const antes=_pinzaCruda;
  if(_pinzaCruda){ if(MANO.crudo>PINZA_ABRE) _pinzaCruda=false; }
  else { if(MANO.crudo<PINZA_CIERRA) _pinzaCruda=true; }
  MANO.pinza=_pinzaCruda;
  /* VALE EL FLANCO, NO EL ESTADO. Una pinza sostenida medio segundo son treinta cuadros: si cada
     cuadro contara, una sola pinza recorreria todos los botones. Solo cuenta el cuadro en el que
     aparece. */
  if(_pinzaCruda && !antes) MANO.pinzaNueva=true;
  MANO.hay=true; MANO.visto=t;
}
function manosLazo(){
  const v=MANO.vid; if(!v) return;
  const paso=()=>{
    const t=performance.now();
    manosMedir(t);
    caraMedir(t);
    if(t-(MANO.visto||0)>MANO_CADUCA){ MANO.hay=false; MANO.pinza=false; _pinzaCruda=false;
                                       MANO.hayPts=false; }
    if(t-(CARA.visto||0)>CARA_CADUCA){ CARA.hay=false; CARA.giro+=(0-CARA.giro)*0.06; }
    if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
    else setTimeout(paso, 1000/MANO_HZ);
  };
  if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
  else setTimeout(paso, 1000/MANO_HZ);
}
/* lo consume el juego una vez y se apaga: asi un pellizco no puede contarse dos veces */
function tomarPinza(){ const p=MANO.pinzaNueva; MANO.pinzaNueva=false; return p; }
