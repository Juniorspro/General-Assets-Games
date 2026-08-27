
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
             cand:-1, votos:0, ultT:0, manos:0, lms:null };
const MANO_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MANO_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
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
  return { dedos: largos.filter(Boolean).length + (pulgar?1:0),
           pulgar, pinza, palma,
           abierta: largos.every(Boolean) && pulgar };
}
function manoTotal(lms){
  if(!lms || !lms.length) return { hay:false, dedos:0, pinza:false, manos:0 };
  let d=0, pz=false;
  for(const lm of lms){ const r=manoLeer(lm); if(!r) continue; d+=r.dedos; pz=pz||r.pinza; }
  return { hay:true, dedos:Math.min(10,d), pinza:pz, manos:lms.length };
}
/* el voto: tres lecturas seguidas con el mismo numero para que el numero valga */
function manoVoto(n){
  if(n===MANO.cand) MANO.votos++;
  else { MANO.cand=n; MANO.votos=1; }
  if(MANO.votos>=3) MANO.dedos=MANO.cand;
}
async function manosIniciar(){
  if(MANO.estado==='carga'||MANO.estado==='lista') return MANO.estado;
  MANO.estado='carga'; pintarCam();
  try{
    const vision=await import(MANO_URL);
    const fs=await vision.FilesetResolver.forVisionTasks(MANO_WASM);
    MANO.det=await vision.HandLandmarker.createFromOptions(fs,{
      baseOptions:{ modelAssetPath:MANO_MODELO, delegate:'GPU' },
      runningMode:'VIDEO', numHands:2 });
    const st=await navigator.mediaDevices.getUserMedia({ video:{ width:320, height:240, facingMode:'user' } });
    const v=document.getElementById('camVid');
    v.srcObject=st; MANO.vid=v;
    await v.play().catch(()=>{});
    MANO.estado='lista'; MANO.on=true;
    document.body.classList.add('manos'); document.body.classList.remove('pad');
  }catch(e){
    MANO.estado='no'; MANO.on=false;
    document.body.classList.remove('manos'); document.body.classList.add('pad');
    avisar(TX('manoNo'), 2.6);
  }
  pintarCam();
  return MANO.estado;
}
function manosTick(){
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
  MANO.gesto = tot.pinza? 'pinza' : '';
  manoVoto(tot.hay? tot.dedos : -1);
  dibujarManos(lms);
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
function pintarCam(){
  const e=document.getElementById('camEst'); if(!e) return;
  if(MANO.estado==='carga'){ e.textContent=TX('manoCarga'); return; }
  if(MANO.estado!=='lista'){ e.textContent='—'; return; }
  if(!MANO.hay){ e.textContent=TX('manoLista'); return; }
  e.textContent = MANO.gesto==='pinza'? TX('hazPinza') : TX('dedos',{n:MANO.dedos});
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
