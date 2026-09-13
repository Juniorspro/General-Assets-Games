/* ============================================================
   SUX SANDBOX — MENÚ PRINCIPAL ESTILO GMOD + JUGAR = MULTIJUGADOR EN CONSTRUCT
   ------------------------------------------------------------
   1) FONDO = EL JUEGO. El menú ya no tiene degradado azul: detrás del panel se ve el MAPA
      DE VERDAD, construido con buildMap() y filmado con una cámara que orbita lento. Cada
      ~10 s corta a otra vista (plaza de Construct, el edificio, la pileta, el depósito, la
      ciudad, la base), con un fundido a negro que además tapa el pispeo de rearmar el mapa.
      Se hace con el motor que ya está: el bucle de core_b renderiza scene+camera SIEMPRE,
      así que basta con mover la cámara desde EXT.frame mientras APP sea una pantalla de menú.
   2) JUGAR = MULTIJUGADOR EN CONSTRUCT. El botón grande no pregunta nada: se conecta al
      broker, ESCUCHA la presencia 2,4 s (cada cliente publica la suya cada 1,8 s, así que en
      ese rato ya se sabe quién hay y en qué sala), elige la primera sala con menos de 30
      jugadores y entra. Si no hay red, se juega solo en Construct y se avisa.
   3) LÍMITE DE 30 Y SALAS NUEVAS SOLAS. Las salas son construct, construct2, construct3…
      Si dos entran al mismo tiempo y la sala queda en 31, cada cliente ordena los ids de su
      sala y los que quedan pasados del puesto 30 se mudan a la siguiente — es la misma cuenta
      en todos, así que se mudan exactamente los que sobran y no se rebota entre salas.
   Se concatena al final, así que ya existen APP, EXT, camera, buildMap, MAPS, CURMAP,
   startPlay, showScreen, toast, T, I18N, applyLang, NET, NSV, netStart, MP, mqttState…
   ============================================================ */

/* ---------- textos ---------- */
/* el botón de un jugador y el de salas cambian de nombre: ahora el grande es el multijugador */
Object.assign(I18N.es,{play:'👤 UN JUGADOR · elegir mapa',multi:'👥 SALAS · entrar con código',
  gmGo:'JUGAR',gmGoS:'Multijugador · Construct',gmSrvW:'buscando sala…',
  gmSrvR:'sala ',gmSrvSolo:'sin conexión · se juega solo',gmHop:'sala llena, te pasamos a ',
  gmFoot:'FÍSICA REAL · 280+ PROPS · ARMAS'});
Object.assign(I18N.en,{play:'👤 SINGLE PLAYER · pick a map',multi:'👥 ROOMS · join by code',
  gmGo:'PLAY',gmGoS:'Multiplayer · Construct',gmSrvW:'looking for a room…',
  gmSrvR:'room ',gmSrvSolo:'no connection · playing solo',gmHop:'room full, moved you to ',
  gmFoot:'REAL PHYSICS · 280+ PROPS · WEAPONS'});
Object.assign(I18N.pt,{play:'👤 UM JOGADOR · escolher mapa',multi:'👥 SALAS · entrar com código',
  gmGo:'JOGAR',gmGoS:'Multijogador · Construct',gmSrvW:'procurando sala…',
  gmSrvR:'sala ',gmSrvSolo:'sem conexão · jogando sozinho',gmHop:'sala cheia, você foi para ',
  gmFoot:'FÍSICA REAL · 280+ PROPS · ARMAS'});

/* ============================================================
   1. PANEL DEL MENÚ (se agrega al que ya está, no se reemplaza: los botones viejos
   siguen con sus listeners y applyLang() los sigue traduciendo)
   ============================================================ */
const gmQuick=document.createElement('button');
gmQuick.className='btn go';gmQuick.id='gmQuick';
const gmSrv=document.createElement('div');gmSrv.id='gmSrv';
const gmFoot=document.createElement('div');gmFoot.id='gmFoot';
const gmBar=document.createElement('div');gmBar.id='gmBar';
const gmFade=document.createElement('div');gmFade.id='gmFade';
const gmTag=document.createElement('div');gmTag.id='gmTag';
nsafe(()=>{
  const card=document.querySelector('#sTitle .card');
  if(!card)return;
  const h1=card.querySelector('h1');
  if(h1)card.insertBefore(gmBar,h1.nextElementSibling||null);
  const bp=$('bPlay');
  /* el botón grande ahora es el multijugador: el de un jugador pasa a fila común */
  if(bp)bp.classList.remove('go');
  if(bp){card.insertBefore(gmQuick,bp);card.insertBefore(gmSrv,bp);}
  card.appendChild(gmFoot);
  const st=$('stage')||document.body;
  st.appendChild(gmFade);st.appendChild(gmTag);
},'gmdom');

function gmTexts(){
  gmQuick.innerHTML='▶ '+(T('gmGo')||'JUGAR')+'<small>'+(T('gmGoS')||'')+'</small>';
  gmFoot.textContent=T('gmFoot')||'';
  if(!gmSrv.dataset.live)gmSrv.innerHTML='';
}
/* applyLang() es de core_b y se llama en varios lados: se le cuelga gmTexts() detrás */
const _applyLang0=applyLang;
applyLang=function(){ _applyLang0(); nsafe(gmTexts,'gmtx'); };
gmTexts();
/* el formulario de salas (core_f) esconde bPlay/bHelp/bQual: que esconda también los nuevos */
const _mpOpen0=mpOpen;
mpOpen=function(v){ _mpOpen0(v);
  gmQuick.style.display=v?'none':'';
  gmSrv.style.display=v?'none':''; };

const srvLine=h=>{gmSrv.dataset.live='1';gmSrv.innerHTML=h;};

/* ============================================================
   2. FONDO: VISTAS DE LOS MAPAS
   Cada vista es una posición y un punto al que mira, en coordenadas del mapa.
   La cámara ORBITA el punto: una vista fija se ve como una foto pegada.
   ============================================================ */
const VIEWS=[
  {map:'construct',spot:'PLAZA CENTRAL', p:[54,22,88],  t:[0,4,4],    fov:56},
  {map:'construct',spot:'EL EDIFICIO',   p:[-30,8,-16], t:[-8,8,-48], fov:62},
  {map:'construct',spot:'LA PILETA',     p:[104,20,96], t:[74,4,58],  fov:56},
  {map:'construct',spot:'DEPÓSITO OESTE',p:[-42,13,44], t:[-69,4,16], fov:58},
  {map:'city',     spot:'CENTRO',        p:[132,50,148],t:[0,8,0],    fov:55},
  {map:'base',     spot:'LA BASE',       p:[52,18,-70], t:[8,4,-28],  fov:58}
];
const VDUR=10;                    /* segundos por vista */
let vI=-1,vT=0,vOrb=0,mvOn=false,vFade=0,vFov=0;
const _mvT=new THREE.Vector3();
const menuState=()=>(APP==='title'||APP==='qual'||APP==='help'||APP==='map'||APP==='lang');

function camPlace(dt){
  const v=VIEWS[vI]||VIEWS[0];
  vOrb+=dt*.032;                                  /* ~1,8°/s: se nota que es 3D y no marea */
  const dx=v.p[0]-v.t[0], dz=v.p[2]-v.t[2];
  const c=Math.cos(vOrb),s=Math.sin(vOrb);
  _mvT.set(v.t[0],v.t[1],v.t[2]);
  camera.position.set(v.t[0]+dx*c-dz*s, v.p[1]+Math.sin(vOrb*2.4)*.7, v.t[2]+dx*s+dz*c);
  camera.lookAt(_mvT);
  const f=v.fov||56;
  if(vFov!==f){vFov=f;camera.fov=f;camera.updateProjectionMatrix();}
}
function viewSet(i){
  if(!menuState())return vI;                      /* jamás rearmar el mapa fuera del menú */
  vI=((i%VIEWS.length)+VIEWS.length)%VIEWS.length;
  const v=VIEWS[vI];
  if(!CURMAP||CURMAP.id!==v.map)nsafe(()=>buildMap(v.map),'gmmap');
  vT=0;vOrb=0;
  const nm=(MAPS.find(m=>m.id===v.map)||{}).name||v.map;
  gmTag.textContent=String(nm).toUpperCase()+' · '+v.spot;
  camPlace(0);
  return vI;
}
const gmDim=v=>{gmFade.style.opacity=v?'1':'0';};
function menuOff(){
  mvOn=false;vFade=0;gmDim(0);
  gmTag.style.display='none';
  vFov=0;camera.fov=72;camera.updateProjectionMatrix();
}

/* ============================================================
   3. CENSO DE SALAS
   NET.peers se vacía al cambiar de sala, así que el censo se guarda acá aparte:
   id -> {sala, cuándo se lo vio}. El topic de presencia es global, por eso se puede
   contar la gente de TODAS las salas sin estar suscripto a ninguna.
   ============================================================ */
const CAP=30, RBASE='construct';
/* la sala por defecto pasa a ser la del mapa: 'hyper1' era del multijugador viejo */
if(!NSV.room||NSV.room==='hyper1'){NSV.room=RBASE;nsave();}
const CEN={};
function censusStep(){
  const now=performance.now();
  for(const k in NET.peers){
    const p=NET.peers[k];
    const t=Math.max(p.lastP||0,p.last||0); if(!t)continue;
    /* si no dijo sala pero mandó estado, está en la mía: el estado sólo viaja por el
       topic de la sala, así que llegar por ahí ya es prueba de que está adentro */
    const r=(p.room!=null&&p.room!=='')?p.room:(p.x!=null?NET.room:null);
    if(!r)continue;
    CEN[k]={room:r,t};
  }
  for(const k in CEN)if(now-CEN[k].t>9000)delete CEN[k];
}
const roomN=i=>(i<=1?RBASE:RBASE+i);
function roomCount(r){let n=0;for(const k in CEN)if(CEN[k].room===r)n++;return n;}
/* primera sala con lugar para uno más (yo). skip = la que quiero dejar. */
function pickRoom(skip){
  for(let i=1;i<=60;i++){const r=roomN(i);
    if(r===skip)continue;
    if(roomCount(r)+1<=CAP)return r;}
  return roomN(61);
}

/* ============================================================
   4. JUGAR: entrar directo al multijugador en Construct
   ============================================================ */
let qpBusy=false;
function quickPlay(){
  if(qpBusy||!menuState())return false;
  qpBusy=true;
  MP=true;                       /* el cartel de red aparece desde ya */
  nsafe(()=>NET.connect(),'gmconn');
  srvLine(T('gmSrvW'));
  const t0=performance.now();
  (function wait(){
    const ms=performance.now()-t0;
    const dead=(mqttState==='fail'||window.__noMqtt);
    const listened=NET.on&&ms>(window.__TEST?300:2400);
    /* 5 s de paciencia: si el broker no contestó, se juega solo y listo */
    if(!dead&&!listened&&ms<(window.__TEST?1200:5000)){setTimeout(wait,150);return;}
    censusStep();
    if(dead||!NET.on){ MP=false; srvLine(T('gmSrvSolo')); goPlay(null); return; }
    const r=pickRoom();
    NSV.room=r; nsave(); nsafe(()=>netStart(),'gmstart');
    srvLine(T('gmSrvR')+'<b>'+r+'</b> · '+(roomCount(r)+1)+'/'+CAP);
    goPlay(r);
  })();
  return true;
}
function goPlay(room){
  qpBusy=false;
  SV.map=RBASE;save();
  menuOff();
  nsafe(()=>startPlay(),'gmplay');
  if(room)nsafe(()=>toast(T('mpOn')+room+' · '+(roomCount(room)+1)+'/'+CAP),'gmtoast');
  else nsafe(()=>toast(T('gmSrvSolo')),'gmtoast');
}
gmQuick.addEventListener('click',()=>quickPlay());

/* ---------- el resto del menú también apaga el fondo al arrancar ---------- */
nsafe(()=>{
  const off=()=>{ if(APP==='play')menuOff(); };
  for(const id of ['mPlay','bPlay'])
    {const e=$(id);if(e)e.addEventListener('click',()=>setTimeout(off,0));}
},'gmoff');

/* ============================================================
   5. LÍMITE DE 30 EN VIVO
   Si la sala se pasa (dos entraron al mismo tiempo), los que sobran se mudan solos.
   ============================================================ */
let capT=0,capHop=0;
/* ¿me toca mudarme? Ordenando los ids, los primeros 30 se quedan y el resto sobra.
   La cuenta es la misma en todos los clientes, así que no hay dos que se muden por el
   mismo lugar ni queda nadie rebotando entre salas. */
function capOver(ids){
  if(ids.length<=CAP)return false;
  return ids.slice().sort().indexOf(NET.ID)>=CAP;
}
function myRoomIds(){
  const now=performance.now(),ids=[NET.ID];
  for(const k in NET.peers){const p=NET.peers[k];
    const t=Math.max(p.lastP||0,p.last||0);
    if(!t||now-t>7000)continue;
    if(p.room===NET.room||p.x!=null)ids.push(k);}
  return ids;
}
function capStep(dt){
  if(!MP||!NET.on||!NET.room)return;
  capT+=dt; if(capT<4)return; capT=0;
  if(!capOver(myRoomIds()))return;
  const r=pickRoom(NET.room);
  NSV.room=r;nsave();
  nsafe(()=>{NET.setRoom(r);ghostClear();},'gmhop');
  capHop++;
  nsafe(()=>toast(T('gmHop')+r),'gmtoast');
}

/* ============================================================
   6. enganche al bucle
   ============================================================ */
EXT.frame.push(dt=>{
  censusStep();capStep(dt);
  if(!menuState()){ if(mvOn)menuOff(); return; }
  if(!mvOn){ mvOn=true;gmTag.style.display='block';viewSet(vI<0?0:vI); }
  vT+=dt;camPlace(dt);
  if(vT>VDUR&&!vFade){
    vFade=1;gmDim(1);
    setTimeout(()=>{ if(menuState())viewSet(vI+1); else vI=(vI+1)%VIEWS.length;
      gmDim(0);vFade=0; },320);
  }
});

if(DEV&&window.__H)Object.assign(window.__H,{
  menu:()=>({view:vI,spot:gmTag.textContent,map:CURMAP&&CURMAP.id,on:mvOn,
    fov:+camera.fov.toFixed(1),busy:qpBusy,srv:gmSrv.textContent,
    cam:[+camera.position.x.toFixed(1),+camera.position.y.toFixed(1),+camera.position.z.toFixed(1)],
    quick:gmQuick.textContent,fade:+gmFade.style.opacity||0}),
  menuView:i=>viewSet(i),
  /* mover la vista actual a mano (así se eligen los encuadres midiendo, no a ojo) */
  menuPose:(p,t,f)=>{const v=VIEWS[vI<0?0:vI];if(p)v.p=p;if(t)v.t=t;if(f)v.fov=f;
    vOrb=0;vFov=0;camPlace(0);return{p:v.p,t:v.t,fov:v.fov};},
  menuViews:()=>VIEWS.map(v=>v.map+'/'+v.spot),
  menuTick:(n,dt)=>{for(let i=0;i<(n||60);i++){vT+=dt||1/60;camPlace(dt||1/60);}return vT;},
  census:()=>{censusStep();const o={};for(const k in CEN)o[CEN[k].room]=(o[CEN[k].room]||0)+1;return o;},
  roomPick:()=>{censusStep();return pickRoom();},
  roomCap:()=>CAP,
  quick:()=>quickPlay(),
  capRun:()=>{capT=99;capStep(0);return{room:NET.room,hops:capHop};},
  /* la regla del límite, sin depender del broker: ids = los de mi sala, incluido el mío */
  capOver:ids=>capOver((ids||[]).concat([NET.ID])),
  capIds:()=>myRoomIds().length
});
