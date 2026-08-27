
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
             error:'', delegado:'', cdn:null, crudo:0, pausa:false, habia:false };
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
    st=await navigator.mediaDevices.getUserMedia({
      video:{ width:{ideal:480}, height:{ideal:360}, facingMode:'user' } });
  }catch(e){
    const n=(e && e.name)||'';
    return manosFallo(n==='NotAllowedError'||n==='SecurityError'? 'permiso'
                    : (n==='NotFoundError'||n==='OverconstrainedError'? 'camara' : 'camara'));
  }
  const v=document.getElementById('camVid');
  v.srcObject=st; MANO.vid=v;
  await v.play().catch(()=>{});
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
  document.body.classList.add('manos'); document.body.classList.remove('pad');
  manosTam();
  pintarCam(); pintarCtrl();
  return MANO.estado;
}
function manosTick(){
  /* PAUSA PARA PROBAR. En el banco no hay mano de verdad —la camara del contenedor es un patron
     sintetico— asi que las manos se inyectan a mano; sin esta pausa el tick siguiente lee la camara
     falsa, no encuentra nada y borra el dibujo antes de la captura. */
  if(MANO.pausa) return;
  if(MANO.estado!=='lista' || !MANO.det || !MANO.vid || MANO.vid.readyState<2) return;
  const t=performance.now();
  if(t-MANO.ultT < 33) return;
  MANO.ultT=t;
  let r=null;
  try{ r=MANO.det.detectForVideo(MANO.vid, t); }catch(e){ return; }
  const lms=(r && r.landmarks)? r.landmarks : null;
  MANO.lms=lms;
  const tot=manoTotal(lms);
  MANO.hay=tot.hay; MANO.manos=tot.manos;
  /* EL CRUDO Y EL VOTADO SON DOS COSAS. MANO.dedos es el numero que ya paso el voto de tres cuadros
     —el que vale para contestar— y arranca en -1 mientras no hay acuerdo; el cartelito de la camara
     tiene que mostrar lo que la camara ve AHORA, porque es la respuesta inmediata a "¿me esta
     viendo?". Mostrando el votado, el cartel decia "2 MANOS · -1". */
  MANO.crudo = tot.hay? tot.dedos : 0;
  MANO.gesto = tot.pinza? 'pinza' : '';
  MANO.pinzas = manoPinzas(lms);
  manoVoto(tot.hay? tot.dedos : -1);
  dibujarManos(lms);
  dibujarManosGrande(lms);
  pintarCam();
}
function dibujarManos(lms){
  const cv=document.getElementById('camCv'); if(!cv) return;
  const g=cv.getContext('2d'), w=cv.width, h=cv.height;
  g.clearRect(0,0,w,h);
  if(!lms) return;
  const H=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
           [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  const X=p=>(1-p.x)*w, Y=p=>p.y*h;
  for(const lm of lms){
    g.strokeStyle='rgba(46,204,15,0.92)'; g.lineWidth=1.5;
    g.beginPath();
    for(const [a,b] of H){ g.moveTo(X(lm[a]),Y(lm[a])); g.lineTo(X(lm[b]),Y(lm[b])); }
    g.stroke();
    g.fillStyle='#f2efe6';
    for(const p of lm){ g.beginPath(); g.arc(X(p),Y(p),1.7,0,7); g.fill(); }
  }
}
/* =========================================================================================
   LAS DOS MANOS, DIBUJADAS SOBRE EL JUEGO

   Que se dibuja y por que cada cosa:
   - EL CONTORNO OSCURO DEBAJO DE CADA HUESO. El pasillo es beige claro y el aula tambien; una linea
     verde sola desaparece sobre el piso. Se pinta dos veces, primero grueso y oscuro y despues fino
     y de color, que es como se hace legible un trazo sobre un fondo cualquiera.
   - LA PALMA RELLENA. Con solo huesos se lee a arana; con el poligono de la palma se lee a mano.
   - LAS PUNTAS DE LOS DEDOS QUE EL JUEGO CONTO van rellenas y grandes; las que no, huecas y chicas.
     Cuando el numero no es el que el jugador esperaba, ahi se ve cual dedo no estiro.
   - EL PUNTO DE LA PINZA, resaltado, porque es el que apunta a los bichos.
   - UN NUMERO POR MANO, en la muñeca. Con dos manos el total no alcanza: si dice 7 y vos pusiste 4
     y 3, hay que poder ver que leyo 4 en una y 3 en la otra.
   Y TODO ESPEJADO en x, igual que la camarita: sin el espejo, mover la mano a la derecha mueve el
   dibujo a la izquierda y no hay forma de apuntar.
   ========================================================================================= */
const MANO_HUESOS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
                   [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const MANO_PUNTAS=[4,8,12,16,20];
const MANO_PALMA=[0,1,5,9,13,17];
const MANO_COLOR=['#2ecc0f','#4cc9ff'];
function manosTam(){
  const cv=document.getElementById('manosCv'); if(!cv) return;
  const w=Math.max(2, marco.clientWidth), h=Math.max(2, marco.clientHeight);
  /* EL LIENZO VA A PIXELES DE VERDAD Y NO A CSS. Con width/height por defecto (300x150) estirados
     al marco, el esqueleto sale borroso y grueso: es el mismo error que hace ver mal cualquier
     canvas 2D superpuesto. Se limita a 2 el ratio para no pintar 4 veces de mas en telefonos. */
  const r=Math.min(devicePixelRatio||1, 2);
  cv.width=Math.round(w*r); cv.height=Math.round(h*r);
}
function dibujarManosGrande(lms){
  const cv=document.getElementById('manosCv'); if(!cv) return;
  const g=cv.getContext('2d'), W=cv.width, H=cv.height;
  if(!W || !H) return;
  /* SI NO HABIA MANOS Y SIGUE SIN HABER, NO SE TOCA EL LIENZO. Un clearRect de 788x1400 son 1,1
     millones de pixeles treinta veces por segundo para dejarlo igual que estaba. */
  const hay=!!(lms && lms.length);
  if(!hay && !MANO.habia) return;
  MANO.habia=hay;
  g.clearRect(0,0,W,H);
  if(!hay) return;
  const e=Math.max(1, Math.min(W,H)/400);          // grosor proporcional a la pantalla
  g.lineJoin='round'; g.lineCap='round';
  lms.forEach((lm,k)=>{
    const col=MANO_COLOR[k%2];
    const r=manoLeer(lm);
    const X=p=>(1-p.x)*W, Y=p=>p.y*H;
    /* la palma */
    g.beginPath();
    MANO_PALMA.forEach((i,q)=>{ const p=lm[i]; if(q) g.lineTo(X(p),Y(p)); else g.moveTo(X(p),Y(p)); });
    g.closePath();
    g.fillStyle='rgba(13,13,16,0.28)'; g.fill();
    /* los huesos: contorno oscuro y encima el color */
    for(const [anch,color] of [[7.0*e,'rgba(13,13,16,0.62)'], [3.2*e,col]]){
      g.strokeStyle=color; g.lineWidth=anch;
      g.beginPath();
      for(const [a,b] of MANO_HUESOS){ g.moveTo(X(lm[a]),Y(lm[a])); g.lineTo(X(lm[b]),Y(lm[b])); }
      g.stroke();
    }
    /* las puntas: rellenas si el juego las conto */
    MANO_PUNTAS.forEach((i,q)=>{
      const p=lm[i], si=r? !!r.estirados[q] : false;
      g.beginPath(); g.arc(X(p), Y(p), (si? 7.0:4.2)*e, 0, 6.2832);
      g.fillStyle = si? col : 'rgba(13,13,16,0.55)';
      g.fill();
      g.lineWidth=2.0*e; g.strokeStyle = si? 'rgba(13,13,16,0.75)' : col; g.stroke();
    });
    /* el punto de la pinza */
    const px=(X(lm[4])+X(lm[8]))/2, py=(Y(lm[4])+Y(lm[8]))/2;
    const pz=r && r.pinza;
    g.beginPath(); g.arc(px, py, (pz? 17:13)*e, 0, 6.2832);
    g.lineWidth=3.0*e; g.strokeStyle= pz? '#f2efe6' : 'rgba(242,239,230,0.55)'; g.stroke();
    if(pz){ g.beginPath(); g.arc(px,py,7*e,0,6.2832); g.fillStyle='#f2efe6'; g.fill(); }
    /* el numero de esta mano, en la muñeca */
    if(r){
      const wx=X(lm[0]), wy=Y(lm[0])+26*e;
      g.font='900 '+Math.round(22*e)+'px ui-sans-serif,system-ui,Arial';
      g.textAlign='center'; g.textBaseline='middle';
      g.lineWidth=5*e; g.strokeStyle='rgba(13,13,16,0.75)';
      g.strokeText(String(r.dedos), wx, wy);
      g.fillStyle=col; g.fillText(String(r.dedos), wx, wy);
    }
  });
}
function pintarCam(){
  const e=document.getElementById('camEst'); if(!e) return;
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

/* SE PUBLICA EN window A PROPOSITO, y no es descuido: esto es un modulo, asi que una `function` de
   aca NO aparece en window, y ajustar() —que vive en un archivo anterior— la llama con un guard
   `if(window.manosTam)`. Ese guard es lo que evita que el primer ajustar() del arranque toque un
   lienzo que todavia no existe. Sin la asignacion el guard es falso PARA SIEMPRE y el lienzo nunca
   se redimensiona: es exactamente el error que ya tenia pintarFiltro, que nunca se llamaba.
   Con este par —guard alla, asignacion aca— la llamada del arranque se saltea y las de resize no. */
window.manosTam=manosTam;
