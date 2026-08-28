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
             espejo:true, msDet:0, cdn:null, listaEn:0 };

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
  let flujo=null;
  try{
    flujo=await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:'user', width:{ideal:640}, height:{ideal:480} }, audio:false });
  }catch(e){
    manoFallo((e && (e.name==='NotFoundError'||e.name==='OverconstrainedError'))? 'camara' : 'permiso');
    return false;
  }
  const v=document.getElementById('camVid');
  v.srcObject=flujo; MANO.vid=v;
  try{ await v.play(); }catch(e){}
  /* la entrada se achica en el propio track: menos pixeles que subir a la GPU en cada medicion */
  try{ const tr=flujo.getVideoTracks()[0];
       await tr.applyConstraints({ width:{ideal:MANO_ENT_W}, height:{ideal:MANO_ENT_H} });
       const s=tr.getSettings? tr.getSettings() : {};
       MANO.espejo = (s.facingMode!=='environment');
  }catch(e){}

  let vision=null;
  for(const cdn of MANO_CDN){
    try{ vision=await import(/* @vite-ignore */ cdn.js); MANO.cdn=cdn; break; }catch(e){}
  }
  if(!vision){ manoFallo('cdn'); return false; }
  try{
    const fs=await vision.FilesetResolver.forVisionTasks(MANO.cdn.wasm);
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
  return true;
}

let _ultMed=0, _ultVista=0, _pinzaCruda=false;
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
    if(t-(MANO.visto||0)>MANO_CADUCA){ MANO.hay=false; MANO.pinza=false; _pinzaCruda=false; }
    if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
    else setTimeout(paso, 1000/MANO_HZ);
  };
  if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
  else setTimeout(paso, 1000/MANO_HZ);
}
/* lo consume el juego una vez y se apaga: asi un pellizco no puede contarse dos veces */
function tomarPinza(){ const p=MANO.pinzaNueva; MANO.pinzaNueva=false; return p; }
