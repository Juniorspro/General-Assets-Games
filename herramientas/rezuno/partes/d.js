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
/* ===== EL DETECTOR SE LLEVA EL 45 % DEL HILO, Y EN ESTE JUEGO ESO ES LO CORRECTO =====
   El 0,30 esta copiado de RECREO, donde la mano es UNO de los sistemas: alla tambien hay un profesor
   caminando, siete actividades y una escuela que dibujar. En RezUno la mano ES la entrada —no hay
   teclado, ni joystick, ni nada mas que apuntar y pellizcar— asi que darle menos de la mitad del hilo
   al unico sensor del juego es una prioridad mal puesta. Y hay con que pagarlo: el control de
   resolucion existe justamente para recomprar tiempo de dibujo.
   Medido sobre la misma regla: con una deteccion de 12 ms, 0,30 da 25 mediciones por segundo y 0,45
   da 37,5 — o sea el retardo de la mano baja de 43 ms a 27 sin tocar una linea del filtro. */
const MANO_CARGA=0.45;
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
/* ===================== SOLO LA TRASERA =====================
   Pedido: *"elimina el uso de la camara frontal"*. Se va la opcion, se va el boton del menu y se va el
   reconocimiento de cara —que existia SOLO para mover la vista girando la cabeza, y que solo tiene
   sentido con la frontal porque con la trasera tu cara esta del otro lado del telefono—. Con eso se va
   tambien un segundo modelo de 3,7 MB y un detector corriendo a 12 Hz sobre el mismo video: dos cosas
   menos peleandose el hilo con la mano, que es lo unico que importa aca.
   Si el aparato no tiene trasera —una notebook— se abre la que haya y se espeja, porque si no no
   habria juego; pero ya no es algo que el jugador elija. */
const CAM_PREF='environment';

const MANO_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MANO_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
/* DOS CDN. El detector es una descarga de un tercero: si ese tercero no contesta, el juego se queda
   sin manos y no hay nada que el jugador pueda hacer. */
const MANO_CDN=[{ js:MANO_URL, wasm:MANO_WASM },
                { js:'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
                  wasm:'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm' }];
const MANO_MODELO='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
/* ===================== LA ENTRADA SUBE A 640x480, Y ESO SE MIDIO DOS VECES =====================
   Reporte: *"no detecta a full la mano"*. Y la entrada estaba en 256x192 por una optimizacion que
   nunca se comprobo que sirviera — y que, medida, no sirve. Cronometrando `detectForVideo()` sobre
   una veintena de detecciones en cada tamano:

     192x144 -> 557 ms  ·  320x240 -> 547  ·  480x360 -> 523  ·  640x480 -> 494

   Diez veces mas pixeles no solo no cuestan mas: la medicion da un poco MENOS, o sea que la
   diferencia es ruido y el costo NO DEPENDE de la entrada. La razon es que MediaPipe redimensiona
   adentro al tamano fijo de sus modelos —192x192 el detector de palma, 224x224 el de puntos— asi que
   mandarle menos pixeles no le ahorra nada Y le saca detalle: un dedo que a 256x192 son cuatro
   pixeles, a 640x480 son diez. Bajar la entrada era regalar deteccion a cambio de nada, y eso es
   exactamente lo que se reporto. El costo esta en el MODELO; la unica palanca es cuantas veces corre. */
const MANO_ENT_W=640, MANO_ENT_H=480;
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
/* ===== DOS AJUSTES QUE SE PROBARON Y SE SACARON, PORQUE LA MEDICION DIJO QUE NO HACIAN NADA =====
   Los dos salieron de una prueba de frenazo que estaba MAL: calibraba el desvio de la mano con la
   mano EN MOVIMIENTO, asi que se llevaba puesto el adelanto de la prediccion y devolvia 117 y 167 ms
   de asentamiento en ritmos donde el juego asienta en uno solo. Contra ese numero falso, achicar la
   prediccion y hacer que la velocidad bajara mas rapido que subir parecian mejoras.
   Con la calibracion hecha con la mano quieta, medido de nuevo: el asentamiento es 16,7 ms —un cuadro,
   el minimo que la prueba puede ver— a 60, 37,5, 25, 18, 15 y 12 Hz, y las cuatro combinaciones de
   suavizado de velocidad (0,55/0,55 · 0,85/0,45 · 1/0,35 · 1/0,55) dan EXACTAMENTE los mismos
   numeros en sobrepico, desparejo, retardo y atenuacion. Y achicar la prediccion no mejoraba el
   asentamiento —ya estaba en el piso— y SI empeoraba el desparejo a 12 Hz de 1,01 a 1,44.
   Asi que se predice el hueco entero y la velocidad se suaviza con una sola constante. Lo que si
   crece al bajar el ritmo es el SOBREPICO: 0 % a 60 Hz, 2,7 a 25, 4,2 a 15 y 5,7 a 12 — y contra eso
   la palanca no es el filtro, es no bajar tanto el ritmo. */
/* se apaga desde los ganchos para poder medir el ANTES y el DESPUES en la misma corrida: una mejora
   contada contra el recuerdo de como andaba no es una medicion */
let PRED_ON=true;
/* ===================== LA CADUCIDAD SIGUE AL RITMO =====================
   280 ms fijos son once mediciones a 40 Hz y TRES Y MEDIA a 12: en un aparato lento, dos detecciones
   fallidas seguidas —una mano de costado, un cambio de luz— hacen desaparecer la mano de la pantalla
   y volver. Eso se ve como parpadeo, no como perdida. La caducidad tiene que medirse en MEDICIONES y
   no en milisegundos: cuatro huecos, con un piso de 280 para que a ritmo alto no sea un pestaneo. */
function manoCaduca(){ return Math.max(280, MANO.periodo*4); }

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
/* LO REINICIA TODO, Y ESO NO ES OPCIONAL. Lo usan solo los ganchos de prueba, y una prueba que
   arranca con la velocidad y el hueco que dejo la anterior no mide lo que dice medir: corriendo el
   frenazo despues de la rampa, el frenazo devolvia "no paro nunca" en un ritmo donde solo tarda 33 ms.
   Un orden de pruebas no puede cambiar el resultado de una prueba. */
function fpReset(){
  for(const q of FP) q.ini=false; F.x.ini=false; F.y.ini=false;
  MANO.vel.fill(0); MANO.hueco=0; _tMed=0;
}
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
          /* ===== LOS UMBRALES BAJAN, Y ESO ATACA EL "no detecta a full" =====
             Con 0,5 en los tres, una mano a contraluz, de costado o a medio salir del cuadro no llega
             al umbral y el detector la SUELTA. Y soltarla no es solo perderla un cuadro: al perder el
             seguimiento, la medicion siguiente tiene que volver a correr el BUSCADOR DE PALMA, que es
             la parte cara — o sea que dudar sale mas caro que seguir.
             `minTrackingConfidence` es el que mas importa de los tres: es el que decide cuanto se
             sostiene una mano que ya se encontro. A 0,3 se sostiene mucho mas, y lo peor que puede
             pasar es que siga a una mano un par de cuadros de mas, que es infinitamente mejor que
             perderla en medio de un pellizco. */
          minHandDetectionConfidence:0.4, minHandPresenceConfidence:0.4, minTrackingConfidence:0.3 });
        MANO.delegado=del; break;
      }catch(e){}
    }
  }catch(e){}
  if(!MANO.det){ manoFallo('modelo'); return false; }
  /* ===================== SI LA CAMARA NO DA CUADROS, SE LE BAJA LA RESOLUCION =====================
   El ritmo de medicion no puede pasar del ritmo de la CAMARA, y una camara trasera a 640x480 puede
   quedarse en 15 cuadros por segundo en un telefono modesto. Ahi no hay presupuesto que valga: 15 es
   el techo, y con 15 la mano se ve a saltos por mas que el detector sobre.
   La resolucion, en cambio, es gratis para el detector —medido: 640x480 no cuesta mas que 192x144—,
   asi que cambiar resolucion por cuadros es un cambio que solo tiene lado bueno.
   Se mide el intervalo REAL entre cuadros, no lo que dice `getSettings().frameRate`: eso informa lo
   que se configuro, no lo que llega. Y va con applyConstraints y no pidiendo la camara de nuevo,
   porque volver a pedirla puede volver a preguntar el permiso en medio de la partida. */
  setTimeout(()=>{
    if(!MANO.on || _dtCuadro<40) return;                 // 25 cuadros o mas: no hay nada que arreglar
    const tr=MANO.vid && MANO.vid.srcObject && MANO.vid.srcObject.getVideoTracks()[0];
    if(!tr || !tr.applyConstraints) return;
    const menor = _dtCuadro>66? [320,240] : [480,360];    // por debajo de 15, se baja dos escalones
    MANO.bajo=menor;
    try{ tr.applyConstraints({ width:{ideal:menor[0]}, height:{ideal:menor[1]},
                               frameRate:{ideal:60} }); }catch(e){}
  }, 1800);
  MANO.estado='lista'; MANO.on=true; MANO.listaEn=performance.now();
  if(typeof pintarCam==='function') pintarCam();
  manosLazo();
  return true;
}
let _ultMed=0, _ultVista=0, _pinzaCruda=false, _tMed=0;
/* el intervalo real entre cuadros de camara, medido: de el salen los unicos ritmos posibles */
let _ultCuadro=0, _dtCuadro=1000/30;
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
  /* ===== Y EL PERIODO SE AJUSTA A LO QUE LA CAMARA PUEDE DAR =====
   Las mediciones solo pueden ocurrir cuando llega un cuadro de camara, asi que los unicos ritmos que
   existen son fps, fps/2, fps/3... Pedir 22 con una camara a 30 no da 22: da 30 o da 15, y con una
   reja dura daba 15 —la mitad de lo pedido— y ademas con huecos alternados de 33 y 67 ms. Eso es
   exactamente lo que se ve como "detecta entrecortado": no es lento, es DESPAREJO.
   Se redondea al multiplo MAS CERCANO del intervalo de camara, no al de arriba: al de arriba se
   desperdicia hasta un tercio del presupuesto y la mano va mas lenta de lo que el aparato aguanta.
   Quedarse un poco por encima del presupuesto es aceptable porque el presupuesto no es el unico
   guardian: el control de 60 cuadros mide el cuadro ENTERO y baja la resolucion si hace falta. */
  const per = 1000/Math.max(1, MANO.hz);
  const k = Math.max(1, Math.round(per/_dtCuadro));
  MANO.periodo = k*_dtCuadro;
}
/* ===================== LA REJA NO PUEDE PEDIR MAS PRECISION QUE LA CAMARA =====================
   Reporte: *"no con lag sino que como que detecta entrecortado"*. Entrecortado no es lento: es que el
   ritmo de verdad no es el que se pidio y ADEMAS no es parejo. Y con una reja dura —`si no pasaron
   `periodo` milisegundos, no midas`— eso pasa por aliasing y es aritmetica:

   las mediciones solo pueden ocurrir cuando llega un cuadro de camara. Con la camara a 30 (33,3 ms) y
   un periodo pedido de 35 ms, NINGUN cuadro llega con 35 ms de diferencia: llegan a los 33,3 —que la
   reja rechaza por 1,7 ms— y el siguiente a los 66,6. O sea que pidiendo 28,6 mediciones por segundo
   se consiguen QUINCE, la mitad justa. Y peor: si el periodo pedido se mueve un poco —y se mueve
   solo, con el costo— el ritmo real salta entre 30 y 15 sin nada en el medio. Eso es exactamente lo
   que se ve como entrecortado.

   El arreglo es no exigir el periodo exacto sino admitir el cuadro que este mas cerca: si falta menos
   de medio cuadro de camara para cumplirlo, se mide igual. Se mide el intervalo real entre cuadros
   —no se supone 30 ni 60— porque de eso depende cuanto se puede aflojar. */
/* LA DECISION VIVE EN UNA FUNCION APARTE PARA PODERLA PROBAR SIN CAMARA NI DETECTOR. Si la prueba
   reimplementara la regla, estaria comprobando su propia copia. */
function manoTocaMedir(t){
  if(_ultCuadro){
    const d=t-_ultCuadro;
    if(d>4 && d<200) _dtCuadro = _dtCuadro*0.85 + d*0.15;
  }
  _ultCuadro=t;
  /* la tolerancia ya no arregla el aliasing —eso lo arregla el redondeo de arriba— sino que absorbe
     el temblor de llegada de los cuadros: un cuadro que llega 2 ms antes no se tira. */
  if(t-_ultMed < MANO.periodo-_dtCuadro*0.35) return false;
  _ultMed=t;
  return true;
}
function manosMedir(t){
  if(!MANO.det || !MANO.vid || MANO.vid.readyState<2) return;
  if(!manoTocaMedir(t)) return;
  const a=performance.now();
  let r=null;
  try{ r=MANO.det.detectForVideo(MANO.vid, t); }catch(e){ return; }
  const ms=performance.now()-a;
  /* SUBE RAPIDO Y BAJA DESPACIO. Un pico aislado tiene que aliviar en el acto; para volver a medir
     seguido hay que haber estado barato un rato. */
  MANO.msDet = ms>MANO.msDet? ms : MANO.msDet*0.94 + ms*0.06;
  manoRitmo();
  MANO.medidas++;
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
  /* LA VELOCIDAD SE SUAVIZA: sacada de dos medidas seguidas trae el ruido de las dos, y ese ruido
     entra multiplicado por el tiempo de prediccion. Una sola constante: ver arriba por que no hay
     dos. */
  const velPaso=(v, cruda)=>v + (cruda-v)*0.55;
  if(nueva){ MANO.vel[63]=velPaso(MANO.vel[63], (px-MANO.obj[63])/dtM);
             MANO.vel[64]=velPaso(MANO.vel[64], (py-MANO.obj[64])/dtM); }
  else { MANO.vel[63]=0; MANO.vel[64]=0; }
  MANO.obj[63]=px; MANO.obj[64]=py;
  /* LOS 21 PUNTOS, CON EL MISMO ESPEJO QUE EL ARO. Que compartan destino y filtro no es ahorro de
     lineas: es lo que garantiza que la mano DIBUJADA y el punto que APUNTA no puedan separarse. Si
     fueran dos caminos, el jugador veria su pinza en un lugar y agarraria una carta en otro — que es
     exactamente el defecto que se reporto en RECREO con el rompecabezas. */
  for(let k=0;k<21;k++){
    const q=lm[k], b=k*3;
    const ax=ex(q.x), ay=q.y, az=q.z||0;
    if(nueva){ MANO.vel[b]=velPaso(MANO.vel[b], (ax-MANO.obj[b])/dtM);
               MANO.vel[b+1]=velPaso(MANO.vel[b+1], (ay-MANO.obj[b+1])/dtM);
               MANO.vel[b+2]=velPaso(MANO.vel[b+2], (az-MANO.obj[b+2])/dtM); }
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
    if(t-(MANO.visto||0)>manoCaduca()){ MANO.hay=false; MANO.pinza=false; _pinzaCruda=false;
                                       MANO.hayPts=false; MANO.hayObj=false; manoRitmo(); }
    if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
    else setTimeout(paso, MANO.periodo);
  };
  if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
  else setTimeout(paso, MANO.periodo);
}
/* lo consume el juego una vez y se apaga: asi un pellizco no puede contarse dos veces */
function tomarPinza(){ const p=MANO.pinzaNueva; MANO.pinzaNueva=false; return p; }
