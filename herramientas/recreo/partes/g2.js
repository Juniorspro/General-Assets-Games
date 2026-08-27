
/* =========================================================================================
   LAS MANOS: DE 21 PUNTOS POR MANO A UN NUMERO DEL 0 AL 10

   Lo que el juego necesita ahora no es "girar/avanzar/correr": es CONTAR DEDOS. Cuatro mas cuatro
   son ocho, y ocho dedos son las DOS manos — asi que el detector va con numHands 2 y el numero es la
   suma de las dos.

   TRES PROBLEMAS Y NINGUNO ES "leer los puntos":
   1. LA ESCALA. La mano puede estar a veinte centimetros o a un metro de la camara, asi que ninguna
      distancia en pixeles significa nada. TODO se mide en proporcion al tamano de la palma —muneca a
      nudillo del medio— que es invariante a la distancia Y al tamano de la mano de quien juega.
   2. EL PULGAR NO SE MIDE COMO LOS DEMAS. Los otros cuatro dedos se estiran ALEJANDO la punta de la
      muneca, y con eso alcanza; el pulgar se abre HACIA EL COSTADO y su punta puede quedar a la
      misma distancia de la muneca abierto o cerrado. Se mide contra el nudillo del MENIQUE: abierto
      se aleja de el, cerrado se le cruza por delante. Sin esta distincion, "cinco dedos" no existe.
   3. EL NUMERO TIEMBLA. Un dedo a medio estirar cruza el umbral varias veces por segundo. Asi que el
      numero no se toma: SE SOSTIENE. Hay que mantenerlo quieto 1,1 s y un aro se va llenando. Eso
      resuelve el temblor y ademas le da al jugador tiempo de cambiar de idea, que es lo que hace que
      contestar con el cuerpo no se sienta como una trampa.
   ========================================================================================= */
const MANO={ on:false, estado:'no', det:null, vid:null, dedos:0, gesto:'', hay:false,
             cand:-1, votos:0, ultT:0, manos:0, lms:null, pinzas:[], pzPrev:[],
             error:'', delegado:'', cdn:null, crudo:0, pausa:false, habia:false,
             /* espejo: la camara FRONTAL se muestra espejada porque asi funciona un espejo y es lo
                unico con lo que se puede apuntar; la TRASERA no, porque ahi la mano ya se ve del
                lado que esta. Depende de que camara se abrio, no es una constante. */
             espejo:true, camaraUsada:'',
             hz:24, medidas:0, msDet:0, ranuras:[null,null] };
/* CUANTAS VECES POR SEGUNDO SE MIDE, que no es lo mismo que cuantas veces se dibuja.
   24 y no 60: el detector tarda entre 8 y 20 ms por cuadro en un telefono, asi que medir en cada
   cuadro de render es gastar un tercio del presupuesto de 16,6 ms en mirar una mano que apenas se
   movio. Se mide 24 veces por segundo y se INTERPOLA el resto, que es exactamente lo que hace el
   propio juego con su paso fijo de 60 y sus 120 cuadros. */
const MANO_HZ_MOVIL=24, MANO_HZ_PC=30;
const MANO_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MANO_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
/* DOS CDN Y NO UNO. El detector son dos descargas de un tercero, y si ese tercero no contesta el
   juego entero se queda sin manos sin que se pueda saber por que. unpkg sirve el mismo paquete. */
const MANO_CDN=[{ js:MANO_URL, wasm:MANO_WASM },
                { js:'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
                  wasm:'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm' }];
const MANO_MODELO='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

function d3(a,b){ const x=a.x-b.x, y=a.y-b.y, z=(a.z||0)-(b.z||0); return Math.hypot(x,y,z); }
/* PURA A PROPOSITO: entran 21 puntos y sale {dedos, pinza}. Sin camara, sin estado y sin navegador,
   asi que se puede comprobar inyectando manos de mentira y midiendo — que es la unica forma de
   probar esto en un banco sin camara ni mano. */
function manoLeer(lm){
  if(!lm || lm.length<21) return null;
  const mu=lm[0], nu=lm[9];
  const palma=Math.max(1e-6, d3(mu,nu));
  const largos=[[8,5],[12,9],[16,13],[20,17]].map(([pt,n])=>
    (d3(lm[pt],mu) / Math.max(1e-6,d3(lm[n],mu))) > 1.28 );
  /* el pulgar, contra el nudillo del menique */
  const pulgar = (d3(lm[4], lm[17]) / palma) > 1.05;
  const pinza  = (d3(lm[4], lm[8]) / palma) < 0.45 && largos.filter(Boolean).length<=2;
  /* SE DEVUELVE TAMBIEN CUALES. El dibujo de la mano marca en verde los dedos que el juego CONTO,
     y eso es la mitad de la enseñanza: cuando el numero no es el que el jugador cree, se ve cual
     dedo no cerro o no estiro del todo. Un numero solo no explica nada. */
  return { dedos: largos.filter(Boolean).length + (pulgar?1:0),
           pulgar, pinza, palma,
           estirados: [pulgar, largos[0], largos[1], largos[2], largos[3]],
           abierta: largos.every(Boolean) && pulgar };
}
function manoTotal(lms){
  if(!lms || !lms.length) return { hay:false, dedos:0, pinza:false, manos:0 };
  let d=0, pz=false;
  for(const lm of lms){ const r=manoLeer(lm); if(!r) continue; d+=r.dedos; pz=pz||r.pinza; }
  return { hay:true, dedos:Math.min(10,d), pinza:pz, manos:lms.length };
}
/* ---------- DONDE ESTA LA PINZA EN LA PANTALLA ----------
   Contar dedos no necesita saber DONDE esta la mano; reventar un bicho si. El punto de la pinza es
   el medio entre la punta del pulgar y la del indice, que es justo donde el jugador cree que esta
   pinchando.
   DOS COSAS QUE NO SON OBVIAS:
   1. VA ESPEJADO. La camara se muestra como un espejo —si no, mover la mano a la derecha mueve la
      marca a la izquierda y no hay forma de apuntar—, asi que la x de MediaPipe se invierte. Es el
      mismo 1-x que ya usaba dibujarManos() para el esqueleto de la camarita.
   2. LO QUE VALE ES EL FLANCO, no el estado. Una pinza sostenida medio segundo son treinta cuadros:
      si cada cuadro matara, una sola pinza limpiaria el pasillo entero. Solo cuenta el cuadro en que
      la pinza APARECE, y para eso hay que recordar la de cada mano en el cuadro anterior. */
function manoPinzas(lms){
  const r=[];
  if(!lms || !lms.length){ MANO.pzPrev=[]; return r; }
  lms.forEach((lm,k)=>{
    const q=manoLeer(lm); if(!q) return;
    const p4=lm[4], p8=lm[8];
    r.push({ x: 1-(p4.x+p8.x)/2, y: (p4.y+p8.y)/2,
             pinza:q.pinza, nueva: q.pinza && !MANO.pzPrev[k] });
    MANO.pzPrev[k]=q.pinza;
  });
  return r;
}

/* el voto: tres lecturas seguidas con el mismo numero para que el numero valga */
function manoVoto(n){
  if(n===MANO.cand) MANO.votos++;
  else { MANO.cand=n; MANO.votos=1; }
  if(MANO.votos>=3) MANO.dedos=MANO.cand;
}
/* =========================================================================================
   ARRANCAR EL DETECTOR, Y QUE SE SEPA CUANDO NO ARRANCA

   EL ORDEN IMPORTA Y ES: LA CAMARA PRIMERO. El detector son dos descargas de un CDN mas un modelo
   de siete megas de Google, o sea varios segundos; si se piden ANTES del permiso, cuando por fin se
   llama a getUserMedia el gesto del jugador ya expiro y Safari lo rechaza con NotAllowedError sin
   mostrar el cartelito. Pidiendo la camara en la primera linea, el permiso aparece al instante y la
   descarga pasa despues, con el permiso ya dado.

   Y CADA FALLA SE NOMBRA. Antes cualquier problema terminaba en un cartel de 2,6 segundos dentro
   del juego que decia "sin camara": el mismo mensaje para "negaste el permiso", "no hay camara",
   "el CDN no contesta" y "estas en http y el navegador no expone la camara". Desde afuera eso se ve
   como un juego que simplemente no usa la camara, que es justo lo que reporto el usuario.
   ========================================================================================= */
function manosFallo(cual){
  MANO.estado='no'; MANO.on=false; MANO.error=cual||'camara';
  document.body.classList.remove('manos'); document.body.classList.add('pad');
  pintarCam(); pintarCtrl();
  return 'no';
}
async function manosIniciar(){
  if(MANO.estado==='carga'||MANO.estado==='lista') return MANO.estado;
  MANO.estado='carga'; MANO.error=''; pintarCam(); pintarCtrl();
  /* CONTEXTO SEGURO. Sin https —o sin localhost— navigator.mediaDevices NO EXISTE, asi que no hay
     permiso que negar: el navegador ni pregunta. Es la causa mas facil de confundir con un error
     del juego, y la unica que no se arregla desde el codigo. */
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    return manosFallo(window.isSecureContext===false? 'insegura' : 'camara');
  }
  let st=null;
  try{
    /* LA TRASERA PRIMERO, Y 320x240. Dos decisiones separadas:
       - 'environment' es la camara trasera, que es la que pidio el usuario: el telefono queda
         apoyado y las manos se mueven del otro lado, con mas espacio y mejor luz que apuntandose a
         uno mismo. Va como `ideal` y no `exact` para que una notebook sin camara trasera abra la
         que tenga en vez de fallar.
       - 320x240 y no 480x360: el detector escala la entrada igual, y 320x240 son 76.800 pixeles
         contra 172.800, o sea 2,25 veces menos trabajo por medicion para la misma mano. */
    st=await navigator.mediaDevices.getUserMedia({
      video:{ width:{ideal:320}, height:{ideal:240}, facingMode:{ideal:'environment'} } });
  }catch(e){
    const n=(e && e.name)||'';
    return manosFallo(n==='NotAllowedError'||n==='SecurityError'? 'permiso'
                    : (n==='NotFoundError'||n==='OverconstrainedError'? 'camara' : 'camara'));
  }
  const v=document.getElementById('camVid');
  v.srcObject=st; MANO.vid=v;
  await v.play().catch(()=>{});
  /* QUE CAMARA ABRIO DE VERDAD, que no es siempre la que se pidio. De eso depende el espejo, y si
     se espeja al reves no hay forma de apuntar: mover la mano a la derecha mueve la mano del juego
     a la izquierda. Se lee del propio track y no de lo que se pidio. */
  try{
    const t=st.getVideoTracks()[0], aj=t? t.getSettings() : {};
    MANO.camaraUsada=aj.facingMode||'';
    MANO.espejo = (MANO.camaraUsada!=='environment');
  }catch(e){ MANO.espejo=true; }
  /* recien ahora el detector, que es lo lento */
  let vision=null;
  for(const c of MANO_CDN){
    try{ vision=await import(c.js); MANO.cdn=c; break; }catch(e){}
  }
  if(!vision) return manosFallo('cdn');
  let fs=null;
  try{ fs=await vision.FilesetResolver.forVisionTasks(MANO.cdn.wasm); }
  catch(e){ return manosFallo('cdn'); }
  /* GPU PRIMERO Y CPU DE RESPALDO: en telefonos viejos el delegado de GPU tira al crear la tarea, y
     un detector a 15 cuadros por segundo en CPU sigue siendo un juego jugable. */
  for(const dg of ['GPU','CPU']){
    try{
      MANO.det=await vision.HandLandmarker.createFromOptions(fs,{
        baseOptions:{ modelAssetPath:MANO_MODELO, delegate:dg },
        runningMode:'VIDEO', numHands:2 });
      MANO.delegado=dg; break;
    }catch(e){ MANO.det=null; }
  }
  if(!MANO.det) return manosFallo('modelo');
  MANO.estado='lista'; MANO.on=true; MANO.error='';
  MANO.hz = (plataf==='movil')? MANO_HZ_MOVIL : MANO_HZ_PC;
  document.body.classList.add('manos'); document.body.classList.remove('pad');
  pintarCam(); pintarCtrl();
  manosLazo();
  return MANO.estado;
}
/* =========================================================================================
   LA MEDICION VA POR SU CUENTA Y EL DIBUJO INTERPOLA

   El problema medido: detectForVideo() tarda entre 8 y 20 ms en un telefono, y estaba llamandose
   DENTRO del requestAnimationFrame del juego. O sea que cada cuadro de render pagaba la medicion, y
   con un presupuesto de 16,6 ms para 60 fps eso se come todo: el juego bajaba a 30 o menos "solo por
   las manos", que es exactamente lo que reporto el usuario.

   La solucion NO es medir mas rapido, es medir MENOS y dibujar igual:
   1. La medicion la maneja requestVideoFrameCallback del propio <video>, que dispara una vez por
      CUADRO DE CAMARA — no por cuadro de render. Segun la especificacion corre al minimo entre los
      fps del video y los del navegador, asi que con una camara de 30 fps dispara 30 veces por
      segundo aunque el juego dibuje 120. Y encima se limita a 24 Hz en telefono.
   2. Entre medicion y medicion los 21 puntos de cada mano se INTERPOLAN, con un poco de prediccion
      acotada y un suavizado exponencial. Es el mismo criterio que el juego ya usa con su paso fijo
      de 60 y sus cuadros de 120: la verdad se calcula pocas veces y el dibujo rellena.
   3. La entrada baja a 320x240 (2,25 veces menos pixeles que 480x360).

   Por que no un Web Worker, que seria lo "correcto": @mediapipe/tasks-vision hace
   document.createElement('canvas') adentro, que no existe en un worker, y el caso de iOS 17 esta
   abierto en el repositorio de MediaPipe. Un worker que no arranca en la mitad de los telefonos es
   peor que 24 Hz interpolados que arrancan en todos.
   ========================================================================================= */
const MANO_PRED=45;      // ms de prediccion como maximo: mas que esto y la mano se adelanta y tiembla
const MANO_TAU=0.032;    // constante del suavizado, en segundos
const MANO_CADUCA=260;   // sin medicion nueva por mas de esto, la mano se fue
const MANO_SALTO=0.22;   // si el objetivo esta mas lejos que esto (en fraccion de pantalla), se salta

function ranuraNueva(){
  const R={ hay:false, viva:0, t0:0, t1:0,
            a:new Float32Array(63), b:new Float32Array(63), sal:new Float32Array(63),
            dedos:0, estirados:[false,false,false,false,false], pinza:false, lado:'',
            lmsSal:new Array(21) };
  /* LA SALIDA VA PREASIGNADA. Convertir 21 puntos a objetos en cada cuadro son 42 objetos por
     cuadro y 2.520 por segundo tirados a la basura: en un telefono eso es el recolector de basura
     entrando cada pocos segundos, o sea un tironcito periodico justo en un juego cuyo unico defecto
     reportado era el rendimiento. Se escriben los mismos objetos siempre. */
  for(let i=0;i<21;i++) R.lmsSal[i]={x:0,y:0,z:0};
  return R;
}
MANO.ranuras=[ranuraNueva(), ranuraNueva()];

function lmsAArreglo(lm, dst){
  for(let i=0;i<21;i++){ const p=lm[i]; dst[i*3]=p.x; dst[i*3+1]=p.y; dst[i*3+2]=p.z||0; }
}
/* el arreglo suavizado vuelto a la forma que esperan manoLeer() y manoPinzas(), EN SITIO */
function arregloALms(src, dst){
  for(let i=0;i<21;i++){ const p=dst[i]; p.x=src[i*3]; p.y=src[i*3+1]; p.z=src[i*3+2]; }
  return dst;
}
/* una medicion entra a su ranura: corre la anterior a `a`, la nueva a `b`, y guarda los tiempos.
   Es lo unico que la interpolacion necesita saber. */
function ranuraPoner(q, lm, t){
  const R=MANO.ranuras[q];
  const lec=manoLeer(lm);
  if(lec){ R.dedos=lec.dedos; R.estirados=lec.estirados; R.pinza=lec.pinza; }
  if(!R.hay){ lmsAArreglo(lm, R.a); R.sal.set(R.a); R.t0=t-33; }
  else { R.a.set(R.b); R.t0=R.t1; }
  lmsAArreglo(lm, R.b);
  R.t1=t; R.hay=true; R.viva=t;
  return R;
}
/* GANCHO DE PRUEBA: mete manos como si las hubiera medido la camara. Entra por el MISMO lugar que
   una medicion de verdad —las ranuras— porque probar el dibujo por otro camino no probaria ni la
   interpolacion ni el reparto por mano izquierda/derecha. */
function manosInyectar(lms){
  const t=performance.now();
  const n=Math.min(2, (lms&&lms.length)||0);
  for(let k=0;k<n;k++) ranuraPoner(k, lms[k], t);
  for(let q=n;q<2;q++) MANO.ranuras[q].hay=false;
  MANO.lms=lms||null;
}

function manosMedir(t){
  let r=null;
  const t0=performance.now();
  try{ r=MANO.det.detectForVideo(MANO.vid, t); }catch(e){ return; }
  MANO.msDet = MANO.msDet*0.8 + (performance.now()-t0)*0.2;
  MANO.medidas++;
  const lms=(r && r.landmarks)? r.landmarks : [];
  const lados=(r && (r.handednesses||r.handedness)) || [];
  MANO.lms=lms.length? lms : null;
  /* LAS RANURAS SE ASIGNAN POR MANO IZQUIERDA/DERECHA Y NO POR ORDEN DE LLEGADA. MediaPipe devuelve
     las manos en el orden que le sale, asi que usar el indice del arreglo hace que en cuanto el orden
     cambia la interpolacion cruce una mano con la otra: en pantalla se ve un salto de una mano a la
     otra. `handedness` es estable. */
  const usada=[false,false];
  const asignada=new Array(lms.length).fill(-1);
  for(let k=0;k<lms.length;k++){
    const cat=(lados[k] && lados[k][0] && lados[k][0].categoryName)||'';
    let q = (cat==='Left')? 0 : (cat==='Right'? 1 : -1);
    if(q<0 || usada[q]) q = usada[0]? (usada[1]? -1 : 1) : 0;
    if(q<0) continue;
    usada[q]=true; asignada[k]=q;
    ranuraPoner(q, lms[k], t).lado=cat;
  }
  pintarCam();
}

/* SE LLAMA UNA VEZ POR CUADRO DE RENDER, y es lo unico de las manos que corre a 60. */
function manosAvanzar(dt){
  const ahora=performance.now();
  let vivas=0, total=0, pinza=false;
  const salida=[];
  for(let q=0;q<2;q++){
    const R=MANO.ranuras[q];
    if(!R.hay) continue;
    /* con la pausa puesta no caducan: en el banco la mano se inyecta y despues hay que sacar la
       foto, y una captura por CDP tarda mas de los 260 ms de caducidad — la mano se moria entre la
       inyeccion y la foto y la captura salia sin manos aunque el codigo estuviera bien. */
    if(!MANO.pausa && ahora-R.viva > MANO_CADUCA){ R.hay=false; continue; }
    const span=Math.max(8, R.t1-R.t0);
    /* prediccion ACOTADA: se extrapola el tiempo que paso desde la ultima medicion, pero nunca mas
       de MANO_PRED. Sin tope, un hueco de medio segundo manda la mano al otro lado de la pantalla. */
    const f = 1 + Math.min(MANO_PRED, ahora-R.t1)/span;
    const k = 1-Math.exp(-dt/MANO_TAU);
    /* si el objetivo salto lejisimo —la mano reaparecio en otro lado— no se desliza, se pone */
    const d=Math.hypot(R.b[0]+(R.b[0]-R.a[0])*(f-1)-R.sal[0],
                       R.b[1]+(R.b[1]-R.a[1])*(f-1)-R.sal[1]);
    const salta = d>MANO_SALTO;
    for(let i=0;i<63;i++){
      const obj=R.b[i]+(R.b[i]-R.a[i])*(f-1);
      R.sal[i] = salta? obj : R.sal[i]+(obj-R.sal[i])*k;
    }
    vivas++; total+=R.dedos; if(R.pinza) pinza=true;
    salida.push(R);
  }
  MANO.hay=vivas>0; MANO.manos=vivas;
  MANO.crudo=Math.min(10, total);
  MANO.gesto=pinza? 'pinza' : '';
  manoVoto(vivas? Math.min(10,total) : -1);
  /* las pinzas salen de los puntos SUAVIZADOS, no de la ultima medicion: si salieran de la medicion,
     apuntar a un bicho seria apuntar con una mano que se mueve a saltos de 24 Hz mientras se ve una
     que se mueve a 60 */
  MANO.pinzas=manoPinzas(salida.map(R=>arregloALms(R.sal, R.lmsSal)));
  MANO.vivas=salida;
}

/* el lazo de medicion, colgado del video y no del render */
function manosLazo(){
  const v=MANO.vid; if(!v) return;
  const paso=(ahora)=>{
    if(MANO.estado!=='lista'){ return; }
    const t=performance.now();
    if(!MANO.pausa && v.readyState>=2 && (t-MANO.ultT) >= (1000/MANO.hz)-2){
      MANO.ultT=t; manosMedir(t);
    }
    pedir();
  };
  const pedir=()=>{
    if(MANO.estado!=='lista') return;
    if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
    else setTimeout(()=>paso(performance.now()), Math.max(8, 1000/MANO.hz));
  };
  pedir();
}

function pintarCam(){
  const e=document.getElementById('camEst'); if(!e) return;   // sigue existiendo, oculto
  if(MANO.estado==='carga'){ e.textContent=TX('manoCarga'); return; }
  if(MANO.estado!=='lista'){ e.textContent='—'; return; }
  if(!MANO.hay){ e.textContent=TX('manoLista'); return; }
  if(MANO.gesto==='pinza'){ e.textContent=TX('hazPinza'); return; }
  /* CON DOS MANOS SE DICE QUE SON DOS. El detector va con numHands 2 porque las cuentas llegan a
     diez, y si el cartel dice solo "7 DEDOS" no hay forma de saber si leyo las dos manos o una. */
  const n=(MANO.crudo!=null? MANO.crudo : Math.max(0,MANO.dedos));
  e.textContent = (MANO.manos>1)? TX('manoDos',{n}) : TX('dedos',{n});
}

/* ===================== EL TECLADO DE NUMEROS (RESPALDO) ===================== */
let padPedido=-1;
(function armarPad(){
  const c=document.getElementById('pad');
  for(let k=1;k<=10;k++){
    const b=document.createElement('button');
    b.textContent = k===10? '10' : String(k);
    b.onclick=()=>{ padPedido=k; };
    c.appendChild(b);
  }
})();

/* ===================== EL TOQUE, PARA QUIEN NO TIENE CAMARA =====================
   Los bichos se revientan con pinza, pero un juego que solo se puede jugar con webcam es un juego
   que la mayoria no puede jugar — la misma razon por la que existe el teclado de numeros. Un toque
   en la pantalla es la pinza de quien no tiene camara, y ademas es lo que cualquiera intenta primero.
   Se guardan las coordenadas NORMALIZADAS del marco y no los pixeles: el marco cambia de tamano con
   la pantalla, y la proyeccion de los bichos tambien, asi que compararlos en 0..1 es lo unico que no
   depende del aparato. */
const TOQUES=[];
(function(){
  const m=document.getElementById('marco'); if(!m) return;
  m.addEventListener('pointerdown', e=>{
    const r=m.getBoundingClientRect();
    if(!r.width || !r.height) return;
    TOQUES.push({ x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height });
    if(TOQUES.length>8) TOQUES.shift();
  }, {passive:true});
})();

