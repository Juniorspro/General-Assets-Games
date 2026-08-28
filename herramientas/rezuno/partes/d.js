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
/* ===================== EL RITMO SE AJUSTA SOLO, Y EL PISO ESTABA MAL PUESTO =====================
   Reporte: *"la mano va lentisima y lagueadisima ... usa el juego de baldi para ver como lograr un
   buen handtracking"*. Y en RECREO esta escrito el mismo error, cometido y corregido una vuelta
   antes: bajar el ritmo cuando el aparato sufre parece optimizar, y lo que produce es EXACTAMENTE lo
   que se reporta. El retardo de seguimiento medido alla contra el ritmo:

     24 Hz -> 21 ms  ·  15 -> 34  ·  12 -> 43  ·  10 -> 52  ·  8 -> 64  ·  6 -> 88

   O sea que mi piso de 8 Hz dejaba la mano en 64 ms de atraso: PEOR que el punto de partida. La
   interpolacion tapa el ESCALONADO —eso se midio y es cierto, el paso queda parejo a 8 Hz— pero no
   puede tapar el RETARDO, porque el dato simplemente no existe todavia. Medir menos seguido no hace
   la mano mas suave: la hace mas VIEJA.

   Las cuatro reglas, tal como estan en RECREO:

   1. EL TECHO ES 60 Y NO 24. El 24 no era una decision, era un resto de cuando no habia forma de
      saber cuanto costaba medir en ESTE aparato. Con la regla de abajo, un telefono rapido con una
      deteccion de 6 ms puede permitirse 50 mediciones por segundo y el tope de 24 se las cortaba a
      la mitad. Por encima del ritmo de dibujo no tiene a donde ir, asi que 60.
   2. LO QUE SE FIJA ES CUANTO HILO SE LE PRESTA, no cuantas veces se mide. `detectForVideo()` corre
      en el hilo principal —tasks-vision usa `document.createElement` adentro, asi que no arranca en
      un worker— y de ahi sale todo: hz = carga / lo_que_tarda. El rapido sube solo y el lento baja
      solo, sin una constante que este mal en los dos extremos.
   3. EL PISO ES 12 Y NO 8. Por debajo de 12 el retardo pasa de 43 ms y ya no hay interpolacion que
      lo tape.
   4. EL RITMO DE REPOSO ES PARA CUANDO NO HAY MANO EN CUADRO, no para cuando el juego no pregunta.
      Sin mano no hay nada que seguir y ademas es el caso barato —solo corre el buscador de palma—;
      mirar diez veces por segundo alcanza de sobra para notar que aparecio, porque la MISMA medicion
      que la encuentra ya sube el ritmo al maximo. */
const MANO_HZ_TOPE=60;
const MANO_CARGA=0.30;
const MANO_HZ_MIN=12;
const MANO_HZ_REPOSO=10;
/* Y VA ARRIBA DE `MANO` PORQUE `MANO` LO USA. Es la quinta vez en este proyecto que una
   declaracion puesta "donde corresponde tematicamente" en vez de "antes del primer uso" tira el
   modulo entero: un `const` leido antes de su linea no rompe una funcion, rompe la pagina. */
const MANO={ on:false, estado:'no', det:null, vid:null, hay:false, error:'', delegado:'',
             x:0.5, y:0.5, pinza:false, pinzaNueva:false, crudo:0, hz:0, medidas:0,
             espejo:true, msDet:0, cdn:null, listaEn:0,
             /* LOS 21 PUNTOS FILTRADOS, para poder DIBUJAR la mano y no solo apuntar con ella. Se
                guardan en un arreglo plano de 63 numeros y no en 21 objetos: los objetos habria que
                crearlos de nuevo en cada medicion —2.520 objetos por segundo a la basura— y el
                arreglo se escribe encima. */
             pts:new Float32Array(63), hayPts:false, usa:'',
             /* el destino crudo de la ultima medicion: 63 coordenadas mas el punto del aro, y su
                velocidad, que es con lo que se predice entre medicion y medicion */
             obj:new Float32Array(65), vel:new Float32Array(65), hayObj:false,
             /* el periodo de medicion que se esta usando de verdad, en ms: no es una constante desde
                que se ajusta solo al costo medido */
             hz:MANO_HZ_TOPE, periodo:1000/MANO_HZ_TOPE, hueco:0 };
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
/* ===================== LA ENTRADA SE QUEDA EN 256x192, Y ESO SE MIDIO =====================
   Lo obvio para acelerar MediaPipe es bajarle la entrada, y es lo que NO sirve. Barrido en el banco,
   cronometrando `detectForVideo()` sobre 24 detecciones en cada tamano:

     320x240 -> 295,8 ms   ·   256x192 -> 292,2   ·   192x144 -> 285,5   ·   160x120 -> 285,4

   Cuatro veces menos pixeles compran el 3,5%. La razon es que MediaPipe REDIMENSIONA adentro al
   tamano fijo de sus modelos —192x192 el detector de palma, 224x224 el de puntos— asi que lo unico
   que cambia con la camara es la subida y el reescalado, que al lado de la inferencia no es nada.
   O sea: el costo esta en el MODELO, y contra eso hay una sola palanca, que es CUANTAS VECES se lo
   corre. Se deja en 256x192 porque no cuesta mas que 160x120 y a esa resolucion la mano se sigue
   detectando desde mas lejos. */
const MANO_ENT_W=256, MANO_ENT_H=192;
/* ===================== EL DETECTOR MIDE MENOS Y LA MANO SE DIBUJA IGUAL =====================
   Pedido: *"aplicale una optimizacion igual a la de baldi"*. La de RECREO son DOS cosas y solo una
   estaba puesta aca.

   La que ya estaba: la medicion cuelga de `requestVideoFrameCallback` del propio <video>, o sea que
   dispara una vez por cuadro de CAMARA y no por cuadro de RENDER. Sin eso, `detectForVideo()` —que
   tarda entre 8 y 20 ms en un telefono— se paga dentro de los 16,6 ms de presupuesto de cada cuadro.

   La que faltaba, y es la que importa: LA INTERPOLACION. Entre medicion y medicion los 21 puntos se
   interpolan en cada cuadro de dibujo: la verdad se calcula pocas veces y el dibujo rellena. Es el
   mismo criterio con el que RECREO simula a 60 pasos fijos y dibuja a 120, y es lo que hace posible
   la regla de ritmo de mas abajo — sin ella, medir menos veces seria una mano a saltos. */
/* HASTA DONDE SE PREDICE ENTRE MEDICION Y MEDICION: hasta el proximo dato y ni un milisegundo mas —
   extrapolar mas lejos que el proximo dato no es interpolar, es inventar. Y por eso el tope NO es una
   constante: sale del periodo de medicion, que se mueve solo con el costo. Ver `manosFiltrar`. */
/* LA PREDICCION ESTA ATADA A LA VELOCIDAD, Y ESTO ES LA LECCION DE RECREO. Extrapolando siempre, con
   la mano QUIETA la diferencia entre dos medidas no es movimiento: es el ruido del detector. O sea
   que el codigo tomaria el ruido y lo multiplicaria antes de dibujarlo. Por debajo de PRED_V0 no se
   predice nada y por encima de PRED_V1 se predice entero. */
const PRED_V0=0.15, PRED_V1=0.55;   // fracciones de pantalla por segundo
/* Y ADEMAS SE TOPA CUANTO PUEDE CORRERSE, no solo cuanto tiempo. Sin el tope, una sola medicion
   rara —el detector salta la mano de un lado al otro en un cuadro— da una velocidad enorme y la
   prediccion la multiplica: medido con un salto sintetico de 0,58 en un cuadro, el punto se iba a
   2,39 de pantalla, o sea a metro y medio fuera del cuadro. Con el tope, un salto raro cuesta unos
   pixeles de mas y nada mas. Y se escala LA MANO ENTERA con el mismo factor, no cada punto por su
   cuenta: escalando por punto, la mano se deformaria justo cuando se mueve rapido. */
/* Y EL TOPE NO ES UNA DISTANCIA FIJA SINO UNA VELOCIDAD, que es lo unico que tiene sentido: lo que
   se esta afirmando es "una mano no se mueve mas rapido que esto", y eso no depende de cada cuanto se
   la mida. Con la distancia fija en 0,05 el tope estaba calibrado para los 42 ms de 24 Hz, asi que en
   un aparato lento —125 ms entre medidas— tapaba el ultimo tercio de cada hueco y la mano volvia a ir
   a los saltos justo donde mas hacia falta que no: medido, el desparejo a 8 Hz se quedaba en 2,51.
   A 24 Hz esta velocidad da exactamente los mismos 0,050 de antes, o sea que donde ya andaba bien no
   cambia nada. */
const PRED_VMAX=1.2;                // pantallas por segundo: lo mas rapido que se admite predecir
/* se apaga desde los ganchos para poder medir el ANTES y el DESPUES en la misma corrida: una mejora
   contada contra el recuerdo de como andaba no es una medicion */
let PRED_ON=true;
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
  /* ===================== SE PIDE CON `exact`, Y ESO NO ES UN DETALLE =====================
   Reporte: *"aun sigue usando la camara frontal, te pedi la trasera"*. Y la causa es que pedir
   `facingMode:'environment'` a secas es un DESEO: el navegador puede abrir la que quiera, y muchos
   Android abren la frontal igual. Peor todavia — con la peticion blanda no hay forma de SABER cual
   abrio, porque `getSettings()` no siempre trae `facingMode`, y ahi la version anterior tenia que
   adivinar. Adivinaba "frontal", asi que con la trasera abierta el juego espejaba la mano al reves y
   escribia "la mano adelante": desde afuera, indistinguible de estar usando la frontal.

   Con `exact` no hay nada que adivinar: si la peticion vuelve, ES esa camara; si no hay, tira
   OverconstrainedError y se prueba la otra. La notebook —que no tiene trasera— cae en el segundo
   intento y queda con la frontal y su espejo, que es lo correcto para ella.
   El tercer intento, sin pedir camara ninguna, es para el aparato raro que rechaza las dos por
   `exact`: ahi si hay que leer el track y, si se calla, suponer frontal. */
  let flujo=null;
  const otra = CAM_PREF==='environment'? 'user' : 'environment';
  /* Y SE PIDEN 60 CUADROS DE CAMARA. La medicion cuelga de requestVideoFrameCallback, o sea que corre
     al MINIMO entre el ritmo que pide el juego y el de la camara: con una camara a 30 no hay forma de
     medir mas de 30 por mucho que sobre procesador — y este juego ahora sube hasta 60. */
  const pedirCam=async (v)=>navigator.mediaDevices.getUserMedia({
      video:Object.assign({ width:{ideal:MANO_ENT_W}, height:{ideal:MANO_ENT_H},
                            frameRate:{ideal:60} }, v), audio:false });
  let usaCierto='';
  try{
    flujo=await pedirCam({ facingMode:{exact:CAM_PREF} }); usaCierto=CAM_PREF;
  }catch(e){
    if(e && (e.name==='NotAllowedError'||e.name==='SecurityError')){ manoFallo('permiso'); return false; }
    try{ flujo=await pedirCam({ facingMode:{exact:otra} }); usaCierto=otra; }
    catch(e2){
      if(e2 && (e2.name==='NotAllowedError'||e2.name==='SecurityError')){ manoFallo('permiso'); return false; }
      try{ flujo=await pedirCam({}); }
      catch(e3){
        manoFallo((e3 && (e3.name==='NotFoundError'||e3.name==='OverconstrainedError'))? 'camara' : 'permiso');
        return false;
      }
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
       /* SI SE ABRIO CON `exact`, ESO ES LA VERDAD Y NO HAY QUE PREGUNTARLE AL TRACK. El track puede
          callarse —medido en el banco: `getSettings()` de una camara de notebook NO TRAE la clave
          `facingMode`— y ahi la version anterior suponia "frontal" y espejaba al reves una camara
          trasera. Con `exact`, el navegador ya garantizo cual es. Solo el tercer intento, el que pide
          cualquier camara, tiene que leer el track; y si tambien se calla, frontal es lo probable
          porque un aparato que rechaza las dos peticiones `exact` es una webcam sin facingMode. */
       let fm = usaCierto || s.facingMode || '';
       if(!fm && Array.isArray(cp.facingMode) && cp.facingMode.length===1) fm=cp.facingMode[0];
       MANO.usa = fm || 'user';
       MANO.espejo = (MANO.usa!=='environment');
  }catch(e){ MANO.usa=usaCierto||'user'; MANO.espejo=(MANO.usa!=='environment'); }

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

let _ultMed=0, _ultVista=0, _pinzaCruda=false, _ultCara=0, _tMed=0;
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
/* EL RITMO SE MUEVE DE A POCO. Saltando entre 40 y 14 segun el ultimo cuadro, la mano cambia de
   suavidad todo el tiempo y eso se nota mas que ir siempre a 20. */
function manoRitmo(){
  const tope = MANO.hay? MANO_HZ_TOPE : MANO_HZ_REPOSO;
  /* EL PISO VA POR DENTRO DEL TECHO Y NO AL REVES. Con `max(piso, min(techo, calc))`, un aparato
     lento en reposo daba `max(12, min(10, 0,23)) = 12`: el piso pisaba al techo y el ritmo de reposo
     no se aplicaba nunca. Medido en el banco, donde medir cuesta 1,3 s. */
  let hz = tope;
  if(MANO.msDet>0.5) hz = Math.min(tope, Math.max(MANO_HZ_MIN, (1000*MANO_CARGA)/MANO.msDet));
  MANO.hz += (hz-MANO.hz)*0.25;
  MANO.periodo = 1000/Math.max(1, MANO.hz);
}
function manosMedir(t){
  if(!MANO.det || !MANO.vid || MANO.vid.readyState<2) return;
  if(t-_ultMed < MANO.periodo) return;
  const a=performance.now();
  let r=null;
  try{ r=MANO.det.detectForVideo(MANO.vid, t); }catch(e){ return; }
  const ms=performance.now()-a;
  /* SUBE RAPIDO Y BAJA DESPACIO. Un pico aislado tiene que aliviar en el acto; para volver a medir
     seguido hay que haber estado barato un rato. */
  MANO.msDet = ms>MANO.msDet? ms : MANO.msDet*0.94 + ms*0.06;
  manoRitmo();
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
  /* ESTO SOLO GUARDA EL DESTINO; el filtro corre aparte, en cada cuadro de dibujo. Antes las dos
     cosas pasaban aca, o sea que la mano dibujada se movia SOLO cuando habia medicion: bajando el
     detector a 24 Hz la mano se habria movido a 24 pasos por segundo y se veria a tirones. */
  /* LA VELOCIDAD SALE DE DOS MEDICIONES, no de dos cuadros de dibujo: entre cuadros no hay dato
     nuevo, asi que dividir por el tiempo de cuadro daria una velocidad inventada. */
  const dtM=(t-_tMed)/1000;
  const nueva=MANO.hayObj && dtM>0.004 && dtM<0.25;
  /* EL HUECO ENTRE MEDICIONES SE MIDE, NO SE SUPONE. La prediccion tiene que cubrir el hueco de
     VERDAD, y ese no es el periodo que el juego pidio: la medicion cuelga del cuadro de camara, asi
     que con una camara a 30 el juego puede pedir 60 y recibir 30. Derivando el tope del periodo
     pedido, la prediccion cubriria la mitad de cada hueco y la mano volveria a escalonarse — medido:
     el desparejo a 24 Hz reales pasaba de 1,00 a 1,47 en cuanto el pedido y el hueco discrepaban. */
  if(nueva) MANO.hueco = MANO.hueco>0? MANO.hueco*0.7 + dtM*0.3 : dtM;
  const px=ex((lm[4].x+lm[8].x)/2), py=(lm[4].y+lm[8].y)/2;
  /* LA VELOCIDAD TAMBIEN SE SUAVIZA. Una velocidad sacada de dos medidas seguidas trae el ruido de
     las dos, y ese ruido entra multiplicado por el tiempo de prediccion. */
  if(nueva){ MANO.vel[63]+=((px-MANO.obj[63])/dtM-MANO.vel[63])*0.55;
             MANO.vel[64]+=((py-MANO.obj[64])/dtM-MANO.vel[64])*0.55; }
  else { MANO.vel[63]=0; MANO.vel[64]=0; }
  MANO.obj[63]=px; MANO.obj[64]=py;
  /* LOS 21 PUNTOS, CON EL MISMO ESPEJO QUE EL ARO. Que compartan destino y filtro no es ahorro de
     lineas: es lo que garantiza que la mano DIBUJADA y el punto que APUNTA no puedan separarse. Si
     fueran dos caminos, el jugador veria su pinza en un lugar y agarraria una carta en otro — que es
     exactamente el defecto que se reporto en RECREO con el rompecabezas. */
  for(let k=0;k<21;k++){
    const q=lm[k], b=k*3;
    const ax=ex(q.x), ay=q.y, az=q.z||0;
    if(nueva){ MANO.vel[b]+=((ax-MANO.obj[b])/dtM-MANO.vel[b])*0.55;
               MANO.vel[b+1]+=((ay-MANO.obj[b+1])/dtM-MANO.vel[b+1])*0.55;
               MANO.vel[b+2]+=((az-MANO.obj[b+2])/dtM-MANO.vel[b+2])*0.55; }
    else { MANO.vel[b]=MANO.vel[b+1]=MANO.vel[b+2]=0; }
    MANO.obj[b]=ax; MANO.obj[b+1]=ay; MANO.obj[b+2]=az;
  }
  MANO.hayObj=true; _tMed=t;
  manosFiltrar(t);
  MANO.hayPts=true;
  /* EL PELLIZCO SE LEE DE LOS PUNTOS CRUDOS Y AL RITMO DE LA MEDICION, no del filtro ni del dibujo.
     Un flanco es un instante: interpolarlo lo correria unos milisegundos y, peor, podria producir dos
     cruces del umbral donde la camara vio uno solo. */
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
  /* la medicion que la encuentra ya sube el ritmo: si esperara a la siguiente, el primer medio
     segundo de cada mano que entra al cuadro seria a diez por segundo, que es justo el momento en
     que el jugador esta mirando si el juego lo ve */
  manoRitmo();
}
/* ===================== EL FILTRO CORRE EN CADA CUADRO DE DIBUJO =====================
   Se lo llama desde el bucle, no desde la medicion. Entre dos mediciones no hay dato nuevo, asi que
   lo que hace es ACERCARSE al ultimo destino: a 24 mediciones y 60 cuadros, cada punto da dos pasos y
   medio de mas hacia donde la camara lo vio por ultima vez. Eso es la interpolacion.
   El reloj es UNO SOLO (`_ultVista`) y lo comparten la medicion y el dibujo: cuando la medicion ya
   filtro en este instante, el paso del dibujo recibe dt cero y no hace nada — no hay forma de que el
   filtro avance dos veces por el mismo tiempo. */
function manosFiltrar(t){
  if(!MANO.hayObj) return;
  const ahora = t==null? performance.now() : t;
  /* CUANTO HACE QUE NO HAY DATO, y hasta ahi se predice */
  /* EL TOPE DE PREDICCION SIGUE AL PERIODO DE MEDICION, no es una constante. Con el periodo en 42 ms
     y el tope en 45 la prediccion cubre el hueco entero; si el aparato baja a 12 Hz el hueco pasa a
     83 ms y un tope de 45 dejaria la ultima mitad de cada hueco sin nada — o sea que justo el aparato
     que mas necesita la interpolacion seria el que menos la tendria. Un 8% de margen sobre el periodo
     y un techo de 140 ms, que es donde extrapolar deja de ser honesto. */
  const hueco=MANO.hueco>0? MANO.hueco : MANO.periodo/1000;
  const tope=Math.min(0.140, hueco*1.08);
  const ad=Math.max(0, Math.min(tope, (ahora-_tMed)/1000));
  /* LA GANANCIA SALE DE LA VELOCIDAD DEL PUNTO QUE APUNTA, UNA SOLA PARA TODA LA MANO. Calculandola
     por coordenada, un dedo quieto dentro de una mano que se mueve dejaria de predecir y la mano se
     desarmaria en el aire. La mano se mueve o no se mueve; es una sola cosa. */
  const vel=Math.hypot(MANO.vel[63], MANO.vel[64]);
  const g=Math.max(0, Math.min(1, (vel-PRED_V0)/(PRED_V1-PRED_V0)));
  let k=PRED_ON? ad*g : 0;
  const maxD=Math.min(0.15, PRED_VMAX*hueco);
  const d=vel*k;
  if(d>maxD) k*=maxD/d;
  const dt=Math.min(0.2, (ahora-_ultVista)/1000);
  /* UN RELOJ QUE VA PARA ATRAS SE VUELVE A ANCLAR, NO SE IGNORA. Con `if(dt<=0) return` a secas, un
     instante anterior al ultimo deja el filtro CONGELADO hasta que el reloj lo alcance — y eso paso
     de verdad: los ganchos de prueba inyectan con marcas de tiempo sinteticas, asi que despues de una
     prueba que dejo el reloj adelantado, la siguiente pasaba setenta cuadros sin filtrar nada y
     reportaba 792 ms de retardo donde hay 6. Reanclando se pierde UNA muestra y listo. */
  if(dt<=0){ _ultVista=ahora; return; }
  _ultVista=ahora;
  MANO.x=oePaso(F.x, MANO.obj[63]+MANO.vel[63]*k, dt);
  MANO.y=oePaso(F.y, MANO.obj[64]+MANO.vel[64]*k, dt);
  for(let i=0;i<63;i++) MANO.pts[i]=oePaso(FP[i], MANO.obj[i]+MANO.vel[i]*k, dt);
}
function manosLazo(){
  const v=MANO.vid; if(!v) return;
  const paso=()=>{
    const t=performance.now();
    manosMedir(t);
    caraMedir(t);
    if(t-(MANO.visto||0)>MANO_CADUCA){ MANO.hay=false; MANO.pinza=false; _pinzaCruda=false;
                                       MANO.hayPts=false; MANO.hayObj=false; manoRitmo(); }
    if(t-(CARA.visto||0)>CARA_CADUCA){ CARA.hay=false; CARA.giro+=(0-CARA.giro)*0.06; }
    if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
    else setTimeout(paso, MANO.periodo);
  };
  if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
  else setTimeout(paso, MANO.periodo);
}
/* lo consume el juego una vez y se apaga: asi un pellizco no puede contarse dos veces */
function tomarPinza(){ const p=MANO.pinzaNueva; MANO.pinzaNueva=false; return p; }
