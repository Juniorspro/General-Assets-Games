/* ============================================================
   HYPER SANDBOX — MULTIJUGADOR DE VERDAD
   ------------------------------------------------------------
   Mismo patrón que el multijugador de Drift Yard, que ya está probado en la calle:
   MQTT sobre WSS al broker público broker.emqx.io:8084, paquetes JSON cortos, QoS 0
   (sin retención ni reintentos: el estado viaja completo en cada paquete, perder uno
   no rompe nada) y dead reckoning del lado que dibuja.

   POR QUÉ MQTT Y NO WEBSOCKET PROPIO: no hay servidor. El broker público hace de
   repetidor, cada cliente publica su estado en el topic de la sala y se suscribe al
   mismo topic. Sin backend, sin puertos, sin cuentas.

   TOPICS
     hypersb/v1/presence          quién está y en qué sala (para contar jugadores)
     hypersb/v1/room/<sala>       todo lo de la partida: estado, chat, props, ping

   PAQUETES (clave "k")
     p  presencia   {k:p,id,n,room}
     s  estado      {k:s,id,x,y,z,h,vx,vz,a,w,r,t,n?}   ~12 Hz
     c  chat        {k:c,id,n,m}
     o  prop nuevo  {k:o,id,i,p:[x,y,z],q:[x,y,z,w],f}
     P/Q ping       {k:P,id,t} -> el otro contesta {k:Q,id,to,t}; rtt = ahora - t
     bye            {k:p,id,bye:1}

   REGLA DE ORO: si mqtt.js no carga (sin conexión, CDN caída, o el broker no acepta
   la conexión) TODO sigue funcionando en un jugador. Nada de lo de acá está en el
   camino crítico del juego: sólo se cuelga de EXT.frame y de un envoltorio de
   spawnProp. Cada callback va dentro de try/catch.

   Se concatena después de core_a..core_e, así que ya existen THREE, scene, PROPS,
   spawnProp, PDEF, charRoot, bones, CLIPS, splitClip, WEAP, WIX, wIdx, MODELS,
   rigWeapon, rigGrip, procWeapon, GDLT, animState, PL, plBody, EXT, addChat, $, T…
   ============================================================ */
import {clone as skClone} from 'three/addons/utils/SkeletonUtils.js';

/* ---------- textos ---------- */
Object.assign(I18N.es,{multi:'👥 MULTIJUGADOR',mpTit:'Multijugador',
  mpSub:'Entrá a una sala y construí con otros. Servidor público, sin cuentas.',
  mpNick:'Tu nombre',mpRoom:'Sala',mpGo:'▶ ENTRAR A LA SALA',mpBack:'↩ Atrás',
  mpOn:'conectado a la sala ',mpOff:'sin conexión: se juega solo',mpWait:'conectando…',
  mpJoin:' entró',mpLeft:' salió'});
Object.assign(I18N.en,{multi:'👥 MULTIPLAYER',mpTit:'Multiplayer',
  mpSub:'Join a room and build with others. Public server, no accounts.',
  mpNick:'Your name',mpRoom:'Room',mpGo:'▶ JOIN ROOM',mpBack:'↩ Back',
  mpOn:'connected to room ',mpOff:'no connection: playing solo',mpWait:'connecting…',
  mpJoin:' joined',mpLeft:' left'});
Object.assign(I18N.pt,{multi:'👥 MULTIJOGADOR',mpTit:'Multijogador',
  mpSub:'Entre numa sala e construa com outros. Servidor público, sem contas.',
  mpNick:'Seu nome',mpRoom:'Sala',mpGo:'▶ ENTRAR NA SALA',mpBack:'↩ Voltar',
  mpOn:'conectado à sala ',mpOff:'sem conexão: jogando sozinho',mpWait:'conectando…',
  mpJoin:' entrou',mpLeft:' saiu'});

/* ---------- guardado propio (no toco SV, que es de core_a) ---------- */
const NSV={nick:'',room:'hyper1'};
try{const r=localStorage.getItem('hyperNet1');if(r)Object.assign(NSV,JSON.parse(r));}catch(e){}
const nsave=()=>{try{localStorage.setItem('hyperNet1',JSON.stringify(NSV));}catch(e){}};
if(!NSV.nick)NSV.nick='Player'+(1000+((Math.random()*9000)|0));
const nickOf=()=>String(NSV.nick||'Player').slice(0,14);
const roomOf=()=>String(NSV.room||'hyper1').replace(/[^A-Za-z0-9_-]/g,'').slice(0,18)||'hyper1';

let netErr='';                 /* último error, para __H.netInfo() */
const nsafe=(f,tag)=>{try{return f();}catch(e){netErr=(tag||'')+': '+(e&&e.message||e);}};

/* ============================================================
   1. mqtt.js por CDN, inyectado a mano
   Igual que Drift Yard: un <script> con onerror. Nunca se espera a que llegue:
   si tarda o no llega, window.__noMqtt queda en 1 y el juego arranca igual.
   ============================================================ */
const MQTTURL='https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js';
let mqttState='idle';          /* idle | load | ok | fail */
function loadMqtt(cb){
  if(window.mqtt){mqttState='ok';if(cb)cb(true);return;}
  if(mqttState==='fail'||window.__noMqtt){if(cb)cb(false);return;}
  loadMqtt._cbs=loadMqtt._cbs||[];
  if(cb)loadMqtt._cbs.push(cb);
  if(mqttState==='load')return;
  mqttState='load';
  const done=okv=>{
    if(mqttState==='ok'||mqttState==='fail')return;
    mqttState=okv?'ok':'fail';
    if(!okv)window.__noMqtt=1;
    const cbs=loadMqtt._cbs||[];loadMqtt._cbs=[];
    for(const f of cbs)nsafe(()=>f(okv),'mqttcb');
  };
  nsafe(()=>{
    const s=document.createElement('script');
    s.src=MQTTURL;s.async=true;
    s.onload=()=>done(!!window.mqtt);
    s.onerror=()=>done(false);
    document.head.appendChild(s);
    /* si el CDN se queda colgado, a los 9 s damos por perdida la red */
    setTimeout(()=>{if(mqttState==='load')done(!!window.mqtt);},9000);
  },'inject');
}

/* ============================================================
   2. NET: presencia, estado, chat, props y ping
   ============================================================ */
const NET=(function(){
  const PRE='hypersb/v1/presence',roomTopic=r=>'hypersb/v1/room/'+r;
  const ID='h'+((Math.random()*1e9)|0).toString(36)+((Math.random()*1e4)|0).toString(36);
  let cli=null,on=false,room='',accS=0,accP=0,accPing=0,pingMs=0,nSeq=0,lastSent=null,lastPub=0;
  const peers={};
  let onChat=null,onProp=null;

  /* código de animación: 0 idle · 1 walk · 2 run · 3 jump (mismo orden que los clips) */
  const CODES=['idle','walk','run','jump'];
  const animCode=()=>{const i=CODES.indexOf(animState);return i<0?0:i;};

  /* paquete de estado COMPACTO: claves de una letra y decimales recortados.
     Menos bytes = el broker lo reparte antes = se puede publicar a 12 Hz sin
     inflar el ancho de banda del celular. */
  function state(){
    if(APP!=='play'&&APP!=='pause'&&APP!=='spawn')return null;
    const p=plBody.position,v=plBody.velocity;
    const o={k:'s',id:ID,
      x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2),
      h:+PL.yaw.toFixed(2),
      vx:+v.x.toFixed(1),vz:+v.z.toFixed(1),
      a:animCode(),w:wIdx|0,r:PL.rag?1:0,
      t:Math.round(performance.now())};
    if((nSeq++%12)===0)o.n=nickOf();   /* el nombre viaja 1 de cada 12 paquetes */
    return o;
  }
  /* ¿vale la pena mandarlo? quieto baja solo a ~2 Hz de keepalive */
  function changed(s){
    const L=lastSent;
    if(!L){lastSent=s;return true;}
    const still=Math.abs(s.x-L.x)<.04&&Math.abs(s.z-L.z)<.04&&Math.abs(s.y-L.y)<.08
      &&Math.abs(s.h-L.h)<.012&&s.a===L.a&&s.w===L.w&&s.r===L.r;
    if(still&&(s.t-L.t)<450)return false;
    lastSent=s;return true;
  }
  function pub(topic,o){ if(!on||!cli)return; nsafe(()=>cli.publish(topic,JSON.stringify(o),{qos:0,retain:false}),'pub'); }
  const pubRoom=o=>{ if(room)pub(roomTopic(room),o); };

  function recalcPing(){
    let sum=0,n=0;const now=performance.now();
    for(const k in peers){const p=peers[k];
      if(p.rtt&&now-Math.max(p.last||0,p.lastP||0)<8000){sum+=p.rtt;n++;}}
    pingMs=n?sum/n:pingMs*.9;
  }
  /* un mensaje entrante (del broker o inyectado por __H.netFake) */
  function onMsg(_t,raw){
    let d;try{d=(typeof raw==='string')?JSON.parse(raw):raw;}catch(e){return;}
    if(!d||!d.id||d.id===ID)return;
    const now=performance.now();
    if(d.k==='P'){pubRoom({k:'Q',id:ID,to:d.id,t:d.t});return;}          /* eco de ping */
    if(d.k==='Q'){ if(d.to===ID){const r=performance.now()-d.t;
        const p=peers[d.id]||(peers[d.id]={});p.rtt=p.rtt?p.rtt*.6+r*.4:r;recalcPing();} return; }
    if(d.bye){const p=peers[d.id];delete peers[d.id];
      if(p&&p.n&&onChat)nsafe(()=>onChat({sys:1,n:p.n,m:T('mpLeft')}),'bye');return;}
    let p=peers[d.id];
    const fresh=!p;
    if(!p)p=peers[d.id]={id:d.id,n:'?',rtt:0};
    if(d.k==='p'){p.n=d.n||p.n;p.room=d.room;p.lastP=now;}
    else if(d.k==='s'){
      if(d.n)p.n=d.n;
      p.x=d.x;p.y=d.y||0;p.z=d.z;p.h=d.h||0;
      p.vx=d.vx||0;p.vz=d.vz||0;
      p.a=d.a|0;p.w=d.w|0;p.rag=!!d.r;
      p.last=now;if(p.lastP==null)p.lastP=now;
      if(fresh&&onChat)nsafe(()=>onChat({sys:1,n:p.n,m:T('mpJoin')}),'join');
    }
    else if(d.k==='c'){p.n=d.n||p.n;p.lastP=now;if(onChat)nsafe(()=>onChat({id:d.id,n:p.n,m:d.m}),'chat');}
    else if(d.k==='o'){p.lastP=now;if(onProp)nsafe(()=>onProp(d),'prop');}
  }

  function connect(){
    if(on)return;
    loadMqtt(okv=>{
      if(!okv||typeof mqtt==='undefined')return;
      nsafe(()=>{
        cli=mqtt.connect('wss://broker.emqx.io:8084/mqtt',
          {connectTimeout:7000,reconnectPeriod:5000,keepalive:25,clientId:ID});
        cli.on('connect',()=>{on=true;
          nsafe(()=>{cli.subscribe(PRE);if(room)cli.subscribe(roomTopic(room));},'sub');
          pub(PRE,{k:'p',id:ID,n:nickOf(),room:room});
          if(MP)nsafe(()=>toast(T('mpOn')+room),'toast');});
        cli.on('message',(t,m)=>onMsg(t,m.toString()));
        cli.on('error',()=>{});
        cli.on('close',()=>{on=false;});
      },'connect');
    });
  }
  function setRoom(r){
    r=r||'';
    if(r===room)return;
    if(on&&cli){ if(room)nsafe(()=>cli.unsubscribe(roomTopic(room)),'unsub');
      if(r)nsafe(()=>cli.subscribe(roomTopic(r)),'sub'); }
    for(const k in peers)delete peers[k];   /* la sala anterior no existe más */
    room=r;
    pub(PRE,{k:'p',id:ID,n:nickOf(),room:room});
  }
  function leave(){ if(room){pubRoom({k:'p',id:ID,bye:1});pub(PRE,{k:'p',id:ID,bye:1});}
    for(const k in peers)delete peers[k]; room=''; }

  function tick(dt){
    const now=performance.now();
    /* limpiar los que se fueron sin avisar */
    for(const k in peers){const p=peers[k];
      if(now-(p.lastP||0)>7000&&now-(p.last||0)>7000)delete peers[k];}
    if(!on||!room)return;
    accP+=dt;if(accP>=1.8){accP=0;pub(PRE,{k:'p',id:ID,n:nickOf(),room:room});}
    /* 12 Hz de estado; si el ping se dispara, aflojamos para no encolar mensajes */
    const iv=pingMs>420?.14:(pingMs>240?.10:1/12);
    accS+=dt;
    if(accS>=iv){accS=0;const s=state();
      if(s&&changed(s)){lastPub=now;pubRoom(s);}}
    accPing+=dt;if(accPing>=2.5){accPing=0;pubRoom({k:'P',id:ID,t:Math.round(performance.now())});}
  }
  /* publicá YA (spawn de un prop, entrar a la partida): no esperes al próximo tick */
  function flush(){
    if(!on||!room)return;
    const now=performance.now();if(now-lastPub<33)return;lastPub=now;
    const s=state();if(s){lastSent=s;pubRoom(s);}
  }
  function list(){
    const now=performance.now(),out=[];
    for(const k in peers){const p=peers[k];
      if(p.x==null)continue;
      if(now-(p.last||0)>6000)continue;
      out.push(p);}
    return out;
  }
  /* cuántos hay en MI sala (aunque todavía no hayan mandado estado).
     El topic de presencia es global (uno para todo el juego), así que hay que filtrar:
     cuenta el que dijo que está en esta sala, o el que ya mandó estado — el estado sólo
     llega por el topic de la sala, así que si llegó, está acá. */
  function count(){
    const now=performance.now();let n=0;
    for(const k in peers){const p=peers[k];
      if(now-Math.max(p.lastP||0,p.last||0)>7000)continue;
      if(p.x==null&&p.room!==room)continue;
      n++;}
    return n;
  }
  return{
    ID,connect,setRoom,leave,tick,flush,list,count,peers,pubRoom,
    get on(){return on;},get room(){return room;},
    get ping(){return Math.round(pingMs);},
    get onChat(){return onChat;},set onChat(f){onChat=f;},
    get onProp(){return onProp;},set onProp(f){onProp=f;},
    feed(o){onMsg('t',o);},          /* simular un mensaje entrante */
    pkt(){return state();},
    sent(){return lastSent;},
    sendChat(m){m=String(m||'').slice(0,120);if(!m)return;pubRoom({k:'c',id:ID,n:nickOf(),m});},
    sendProp(p){ if(!p||!p.body)return;
      const b=p.body,q=b.quaternion;
      pubRoom({k:'o',id:ID,i:p.id,
        p:[+b.position.x.toFixed(2),+b.position.y.toFixed(2),+b.position.z.toFixed(2)],
        q:[+q.x.toFixed(3),+q.y.toFixed(3),+q.z.toFixed(3),+q.w.toFixed(3)],
        f:p.frozen?1:0}); }
  };
})();
addEventListener('beforeunload',()=>{nsafe(()=>{if(NET.on)NET.leave();},'bye');});

/* MP = ¿la partida es multijugador? (el botón de un jugador la apaga) */
let MP=false;

/* ============================================================
   3. LOS OTROS JUGADORES
   Mismo modelo del personaje (SkeletonUtils.clone, que copia el esqueleto y
   reengancha los SkinnedMesh al esqueleto NUEVO: con Object3D.clone() todos
   los clones compartirían huesos y se moverían igual), mixer propio con los
   mismos clips partidos en tren inferior / superior, y su arma en la mano.
   ============================================================ */
const GH={};                       /* id -> fantasma */
const ANIMC=['idle','walk','run','jump'];   /* AC ya lo usa el audio de core_b */

/* cartelito con el nombre arriba de la cabeza */
function tagSprite(text){
  text=String(text||'?').slice(0,14);
  const size=52,pad=26,c=document.createElement('canvas'),g=c.getContext('2d');
  g.font='900 '+size+'px Arial';
  const tw=Math.min(520,g.measureText(text).width);
  c.width=Math.ceil(tw+pad*2);c.height=Math.ceil(size+pad);
  g.font='900 '+size+'px Arial';g.textBaseline='middle';g.textAlign='center';
  g.lineJoin='round';g.miterLimit=2;g.strokeStyle='rgba(0,0,0,.9)';g.lineWidth=size*.16;
  g.strokeText(text,c.width/2,c.height/2);
  g.fillStyle='#fff';g.fillText(text,c.width/2,c.height/2);
  const tex=new THREE.CanvasTexture(c);
  if(THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,
    depthTest:false,depthWrite:false}));
  sp.scale.set(c.width/c.height*.62,.62,1);sp.renderOrder=999;
  return sp;
}

/* respaldo si el GLB del personaje no cargó: un muñeco de cápsulas, para que el
   otro jugador SE VEA igual (sin modelo el multijugador no serviría de nada) */
function stickMan(){
  const g=new THREE.Group();
  const mat=new THREE.MeshPhongMaterial({color:0x3f6fa8});
  const add=(geo,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);
    m.frustumCulled=false;g.add(m);return m;};
  add(new THREE.BoxGeometry(.5,.75,.28),0,1.25,0);
  add(new THREE.SphereGeometry(.16,10,8),0,1.78,0);
  add(new THREE.BoxGeometry(.15,.85,.18),-.16,.45,0);
  add(new THREE.BoxGeometry(.15,.85,.18), .16,.45,0);
  add(new THREE.BoxGeometry(.13,.62,.15),-.33,1.25,0);
  add(new THREE.BoxGeometry(.13,.62,.15), .33,1.25,0);
  return g;
}

/* clon LIMPIO del personaje: sin el arma del jugador local ni el ancla del pecho,
   que cuelgan de charRoot y si no se cuelan en el clon */
function charClone(){
  if(!charRoot)return null;
  const marks=[];
  const mark=o=>{if(o){o.userData._nx=1;marks.push(o);}};
  mark(chestAnchor);mark(wModel);
  let c=null;
  try{ c=skClone(charRoot); }catch(e){ netErr='clone: '+(e&&e.message||e); }
  for(const o of marks)delete o.userData._nx;
  if(!c)return null;
  const kill=[];
  c.traverse(o=>{ if(o.userData&&o.userData._nx)kill.push(o); delete o.userData._nx; });
  for(const o of kill)if(o.parent)o.parent.remove(o);
  c.position.set(0,-9999,0);c.rotation.set(0,0,0);c.visible=true;
  c.traverse(o=>{ if(o.isMesh||o.isSkinnedMesh){o.frustumCulled=false;o.visible=true;
    o.castShadow=QP.shadow>0;} });
  return c;
}

function ghostBones(root){
  const b={};
  root.traverse(o=>{ if(!o.isBone)return;
    const n=o.name.toLowerCase();
    if(/hand/.test(n)&&/(right|_r$|\.r$|r_)/.test(n))b.rHand=b.rHand||o;
    if(/hand/.test(n)&&/(left|_l$|\.l$|l_)/.test(n))b.lHand=b.lHand||o;
    if(/fore/.test(n)&&/(right|_r$|\.r$|r_)/.test(n))b.rFore=b.rFore||o;
    if(/(spine|chest|torso)/.test(n))b.spine=b.spine||o;
    if(/head/.test(n))b.head=b.head||o; });
  return b;
}

/* mixer propio: los mismos clips que el jugador local, partidos en dos capas
   (piernas de caminar/correr/saltar + torso de reposo, que es la pose con el arma) */
function ghostActs(g){
  g.acts={};g.actu={};
  if(!g.mixer)return;
  for(const k in CLIPS){
    const low=splitClip(CLIPS[k],'low')||CLIPS[k];
    const a=g.mixer.clipAction(low);
    a.enabled=true;a.setEffectiveWeight(0);a.play();g.acts[k]=a;
    const up=splitClip(CLIPS[k],'up');
    if(up){const b=g.mixer.clipAction(up);b.enabled=true;b.setEffectiveWeight(0);b.play();g.actu[k]=b;}
  }
  const k0=g.acts.idle?'idle':(g.acts.walk?'walk':null);
  if(k0){g.acts[k0].setEffectiveWeight(1);g.anim=k0;}
  const u0=g.actu.idle?'idle':(g.actu.walk?'walk':null);
  if(u0)g.actu[u0].setEffectiveWeight(1);
}
function ghostAnim(g,st){
  if(!g.acts||!g.acts[st]||st===g.anim)return;
  for(const k in g.acts)if(k!==st)g.acts[k].fadeOut(.2);
  g.acts[st].reset().fadeIn(.2).play();
  /* el torso sólo acompaña el salto; el resto del tiempo se queda en la pose del arma */
  const want=(st==='jump'&&g.actu.jump)?'jump':(g.actu.idle?'idle':'walk');
  for(const k in g.actu){ if(k===want)g.actu[k].reset().fadeIn(.2).play(); else g.actu[k].fadeOut(.2); }
  g.anim=st;
}

/* el arma del otro, en su mano derecha */
function ghostWeap(g,wi){
  wi=(wi|0);
  if(g.wIdx===wi)return;
  g.wIdx=wi;
  if(g.wm){ if(g.wm.parent)g.wm.parent.remove(g.wm); g.wm=null; }
  const w=WEAP[wi];
  if(!w||w.noModel)return;
  const b=(g.bones&&(g.bones.rHand||g.bones.rFore));
  if(!b)return;
  nsafe(()=>{
    const src=w.glb&&MODELS[w.glb];
    let m;
    if(src){ m=src.scene.clone(true);
      m.traverse(o=>{ if(!o.isMesh)return;
        o.castShadow=false;o.frustumCulled=false;
        if(w.tint&&o.material){o.material=o.material.clone();o.material.color=new THREE.Color(w.tint);} }); }
    else m=procWeapon(w);
    g.wm=rigWeapon(m,w);
    b.add(g.wm);
  },'gweap');
}
/* misma cuenta que holdWeapon() pero con el yaw DEL OTRO: el arma cuelga del hueso
   de la mano (acompaña la animación) y la rotación se estabiliza hacia donde mira */
const _nv=new THREE.Vector3(),_nq=new THREE.Quaternion(),_ns=new THREE.Vector3(),
      _nt=new THREE.Quaternion(),_ni=new THREE.Quaternion(),_ne=new THREE.Euler(),
      _no=new THREE.Vector3();
function ghostHold(g){
  if(!g.wm)return;
  const w=WEAP[g.wIdx]||WEAP[0];
  nsafe(()=>rigGrip(g.wm,w),'rigGrip');
  const b=g.bones.rHand||g.bones.rFore;
  if(!b||g.wm.parent!==b)return;
  b.updateWorldMatrix(true,false);
  b.matrixWorld.decompose(_nv,_nq,_ns);
  _ne.set(0,g.h,0,'YXZ');_nt.setFromEuler(_ne);
  _ni.copy(_nq).invert();
  g.wm.quaternion.copy(_ni).multiply(_nt);
  const k=1/Math.max(.0001,_ns.x);
  g.wm.scale.set(k,k,k);
  const H=w.hold||GDLT;
  _no.set(H[0],H[1],-H[2]).applyQuaternion(_nt).applyQuaternion(_ni).multiplyScalar(k);
  g.wm.position.copy(_no);
}

function ghostMake(p){
  const cl=charClone();
  const root=cl||stickMan();
  const g={id:p.id,root,bones:{},mixer:null,acts:null,actu:null,anim:'',wIdx:-1,wm:null,
    x:p.x,y:p.y||0,z:p.z,h:p.h||0,name:p.n||'?',tag:null,tagName:null,
    real:!!cl,                       /* ¿es el personaje de verdad o el de respaldo? */
    hard:(!cl&&!!charRoot)};         /* el clon falló con el modelo cargado: no reintentar */
  root.position.set(g.x,g.y,g.z);
  root.rotation.y=g.h+Math.PI;      /* el modelo mira a +Z local, igual que el jugador */
  scene.add(root);
  if(g.real&&mixer!=null){
    nsafe(()=>{ g.mixer=new THREE.AnimationMixer(root); ghostActs(g); },'gmixer');
  }
  g.bones=ghostBones(root);
  ghostTag(g,g.name);
  GH[p.id]=g;
  return g;
}
function ghostTag(g,name){
  if(g.tag&&g.tag.parent)g.tag.parent.remove(g.tag);
  g.tag=tagSprite(name);
  g.tag.position.y=(g.real?2.06:2.0);
  g.root.add(g.tag);
  g.tagName=name;
}
function ghostDrop(id){
  const g=GH[id];if(!g)return;
  if(g.wm&&g.wm.parent)g.wm.parent.remove(g.wm);
  if(g.mixer)nsafe(()=>g.mixer.stopAllAction(),'stop');
  scene.remove(g.root);
  delete GH[id];
}
const ghostClear=()=>{for(const id in GH)ghostDrop(id);};

function ghostsStep(dt){
  const live=(APP==='play'||APP==='pause'||APP==='spawn');
  if(!live){ if(Object.keys(GH).length)ghostClear(); return; }
  const seen={};
  for(const p of NET.list()){
    seen[p.id]=1;
    let g=GH[p.id];
    if(!g)g=ghostMake(p);
    if(!g)continue;
    /* si el personaje llegó DESPUÉS de crear el fantasma, se rearma con el modelo bueno */
    if(!g.real&&!g.hard&&charRoot){ ghostDrop(p.id); g=ghostMake(p); if(!g)continue; }

    /* ---- dead reckoning: adelanto la posición recibida por la mitad del ping ----
       sin esto el otro se ve siempre atrasado y da la sensación de goma */
    const rtt=p.rtt||NET.ping||110;
    const lead=Math.min(.24,Math.max(0,rtt/2000)+.03);
    const age=Math.min(.2,Math.max(0,(performance.now()-(p.last||0))/1000));
    let ex=Math.min(.22,lead+age);
    const psp=Math.hypot(p.vx||0,p.vz||0);
    if(psp*ex>2.5)ex=2.5/psp;              /* si frena de golpe, no se va de largo */
    const tx=p.x+(p.vx||0)*ex, tz=p.z+(p.vz||0)*ex, ty=p.y||0;
    if(Math.hypot(tx-g.x,tz-g.z)>14||Math.abs(ty-g.y)>8){ g.x=tx;g.z=tz;g.y=ty;g.h=p.h||0; }
    else{
      const k=1-Math.pow(1e-6,dt);         /* converge ~95 % en 230 ms */
      g.x+=(tx-g.x)*k;g.z+=(tz-g.z)*k;
      g.y+=(ty-g.y)*Math.min(1,dt*16);
      let dh=(p.h||0)-g.h;
      while(dh>Math.PI)dh-=2*Math.PI;while(dh<-Math.PI)dh+=2*Math.PI;
      g.h+=dh*Math.min(1,dt*14);
    }
    g.root.position.set(g.x,g.y-.02,g.z);
    if(p.rag)g.root.rotation.set(.9,g.h+Math.PI,0);
    else g.root.rotation.set(0,g.h+Math.PI,0);

    if(p.n&&p.n!==g.tagName)ghostTag(g,p.n);
    if(g.mixer){
      /* el mixer puede no haberse podido armar cuando llegó (clips a medio cargar) */
      if(!g.acts||!Object.keys(g.acts).length)nsafe(()=>ghostActs(g),'gacts');
      ghostAnim(g,ANIMC[Math.max(0,Math.min(3,p.a|0))]||'idle');
      nsafe(()=>g.mixer.update(dt),'gmix');
    }
    ghostWeap(g,p.w|0);
    ghostHold(g);
  }
  for(const id in GH)if(!seen[id])ghostDrop(id);
}

/* ============================================================
   4. CHAT (el que ya está en el HUD: #chatin / addChat)
   ------------------------------------------------------------
   core_b ya tiene un listener de Enter en #chatin que escribe "Player: …" y limpia
   el input. Se lo adelanto con un listener de CAPTURA en document (el capture del
   ancestro corre antes que el del target) y corto la propagación: así el mensaje
   sale con TU nombre y además se publica. Sin conexión sigue funcionando igual.
   ============================================================ */
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const t=e.target;
  if(!t||t.id!=='chatin')return;
  e.stopPropagation();
  const v=String(t.value||'').trim();
  t.value='';
  if(!v)return;
  nsafe(()=>{
    addChat(nickOf()+': '+v);
    if(NET.on&&NET.room)NET.sendChat(v);
  },'chatsend');
},true);
NET.onChat=d=>{
  if(d.sys){addChat('— '+d.n+(d.m||''));return;}
  addChat(String(d.n||'?')+': '+String(d.m||''));
};

/* ============================================================
   5. PROPS COMPARTIDOS
   Envuelvo spawnProp (misma declaración del módulo, así todos los que lo llaman
   pasan por acá): cuando spawneás algo, sale un paquete con el id del prop y su
   pose FINAL; el que lo recibe lo crea igual, sin volver a publicarlo.
   ============================================================ */
const _spawnProp0=spawnProp;
let netApply=0;         /* 1 = estoy creando un prop que llegó por red */
let propMute=1;         /* 1 = no publicar (los props iniciales del mapa no se mandan) */
spawnProp=function(id,pos,quat,opt){
  const p=_spawnProp0(id,pos,quat,opt);
  if(p&&!netApply&&!propMute&&MP&&NET.on&&NET.room)nsafe(()=>NET.sendProp(p),'sendprop');
  return p;
};
NET.onProp=d=>{
  if(!PDEF[d.i])return;
  const q=new CANNON.Quaternion(d.q?d.q[0]:0,d.q?d.q[1]:0,d.q?d.q[2]:0,d.q?(d.q[3]==null?1:d.q[3]):1);
  netApply=1;
  try{ _spawnProp0(d.i,{x:d.p[0],y:d.p[1],z:d.p[2]},q,{raw:true,frozen:!!d.f}); }
  finally{ netApply=0; }
};

/* ============================================================
   6. HUD: jugadores conectados y ping
   ============================================================ */
const netBadge=document.createElement('div');
netBadge.id='netb';
netBadge.style.cssText='position:absolute;left:50%;top:2vmin;transform:translateX(-50%);'
  +'background:rgba(10,14,20,.62);border:1px solid rgba(108,196,255,.35);border-radius:9px;'
  +'padding:4px 10px;font:800 12.5px system-ui,sans-serif;color:#fff;white-space:nowrap;'
  +'text-shadow:0 1px 2px #000;display:none;pointer-events:none';
nsafe(()=>{const h=$('hud');if(h)h.appendChild(netBadge);},'badge');
let _bt=0;
function netHud(dt){
  _bt+=dt;if(_bt<.25)return;_bt=0;
  if(!MP){ if(netBadge.style.display!=='none')netBadge.style.display='none'; return; }
  netBadge.style.display='';
  const n=1+Math.max(NET.count(),Object.keys(GH).length);
  /* el ping se muestra en cuanto hay una medición, incluso si el broker se cayó después */
  const st=NET.ping?NET.ping+' ms'
    :(NET.on?'· · ·':(mqttState==='fail'?T('mpOff'):T('mpWait')));
  netBadge.innerHTML='👥 '+n+' · '+roomOf()+' · '+st;
  const pm=$('plMode'),pc=$('plCnt');
  if(pm)pm.textContent='Multiplayer · '+roomOf();
  if(pc)pc.textContent=n+'/'+Math.max(6,n);
  const pn=$('plName');if(pn)pn.textContent=nickOf();
}

/* ============================================================
   7. PANTALLA DE TÍTULO: nombre + sala
   El botón "Multijugador · pronto" pasa a abrir un formulario mínimo, agregado por
   JS (no se toca head.html). El listener va en CAPTURA sobre document para poder
   frenar el toast de "pronto" que core_b ya le colgó al botón.
   ============================================================ */
const mpBox=document.createElement('div');
mpBox.id='mpBox';
mpBox.style.cssText='display:none;margin-top:10px;border-top:1px solid rgba(242,245,248,.14);padding-top:10px';
const iCss='width:100%;margin-top:7px;padding:11px 12px;border:1px solid rgba(242,245,248,.18);'
  +'border-radius:10px;background:#151c26;color:#eef2f6;font:800 14px system-ui,sans-serif';
mpBox.innerHTML='<div id="mpTit" style="font:900 15px system-ui,sans-serif;margin-bottom:3px"></div>'
  +'<div id="mpSub" style="color:#8f9aa6;font:600 12.5px system-ui,sans-serif"></div>'
  +'<input id="mpNick" maxlength="14" style="'+iCss+'">'
  +'<input id="mpRoom" maxlength="18" style="'+iCss+'">'
  +'<button class="btn go" id="mpGo"></button>'
  +'<button class="btn" id="mpBack"></button>';
nsafe(()=>{
  const card=document.querySelector('#sTitle .card');
  if(card)card.appendChild(mpBox);
},'mpbox');
function mpTexts(){
  const h=$('mpTit');if(h)h.textContent=T('mpTit')||'';
  const s=$('mpSub');if(s)s.textContent=T('mpSub')||'';
  const n=$('mpNick'),r=$('mpRoom'),g=$('mpGo'),b=$('mpBack');
  if(n){n.placeholder=T('mpNick')||'';n.value=nickOf();}
  if(r){r.placeholder=T('mpRoom')||'';r.value=roomOf();}
  if(g)g.textContent=T('mpGo')||'';
  if(b)b.textContent=T('mpBack')||'';
  const m=$('bMulti');if(m)m.textContent=T('multi')||'';
}
function mpOpen(v){
  mpBox.style.display=v?'':'none';
  for(const id of['bPlay','bHelp','bQual'])
    {const e=$(id);if(e)e.style.display=v?'none':'';}
  if(v)mpTexts();
}
mpTexts();
/* capturar el click del botón ANTES de que core_b muestre el toast de "pronto" */
document.addEventListener('click',e=>{
  const t=e.target&&e.target.closest?e.target.closest('#bMulti'):null;
  if(!t)return;
  e.stopPropagation();e.preventDefault();
  mpOpen(mpBox.style.display==='none');
},true);
nsafe(()=>{
  $('mpBack').addEventListener('click',()=>mpOpen(false));
  $('mpGo').addEventListener('click',()=>{
    const n=$('mpNick').value.trim(),r=$('mpRoom').value.trim();
    if(n)NSV.nick=n.slice(0,14);
    NSV.room=(r||'hyper1').replace(/[^A-Za-z0-9_-]/g,'').slice(0,18)||'hyper1';
    nsave();
    netStart();
    mpOpen(false);
    APP='map';showScreen('sMap');buildMapList();
  });
  /* un jugador = sin red: se corta la sala y se borran los fantasmas */
  $('bPlay').addEventListener('click',()=>{ if(MP)netStop(); });
},'mpbtn');

function netStart(){
  MP=true;
  NET.setRoom(roomOf());
  NET.connect();
  return true;
}
/* volver a un jugador: avisar que te vas, borrar los muñecos y esconder el cartel */
function netStop(){
  MP=false;
  nsafe(()=>NET.leave(),'leave');
  ghostClear();
  netBadge.style.display='none';
  return true;
}

/* ============================================================
   8. enganches al motor
   ============================================================ */
EXT.frame.push(dt=>{
  NET.tick(dt);
  ghostsStep(dt);
  netHud(dt);
  /* los props del arranque del mapa no se publican: cada cliente ya los tiene */
  if(propMute&&APP==='play')propMute=0;
  if(APP!=='play'&&APP!=='pause'&&APP!=='spawn')propMute=1;
});

if(DEV&&window.__H)Object.assign(window.__H,{
  /* prender la red: entra a la sala y (si mqtt.js llegó) conecta al broker */
  netOn:(room,nick)=>{ if(nick)NSV.nick=String(nick).slice(0,14);
    if(room)NSV.room=String(room); netStart(); return {mp:MP,room:NET.room,on:NET.on,mqtt:mqttState}; },
  netOff:()=>{netStop();return Object.keys(GH).length;},
  /* inyectar un paquete como si viniera del broker (sirve sin red) */
  netFake:o=>{NET.feed(o);return Object.keys(NET.peers).length;},
  netId:()=>NET.ID,
  netPkt:()=>NET.pkt(),
  netSent:()=>NET.sent(),
  netInfo:()=>({mp:MP,on:NET.on,room:NET.room,mqtt:mqttState,ping:NET.ping,
    peers:NET.list().length,ghosts:Object.keys(GH).length,err:netErr,
    badge:netBadge.style.display!=='none'?netBadge.textContent:''}),
  /* estado de cada remoto + de su muñeco en la escena */
  peers:()=>NET.list().map(p=>{const g=GH[p.id];
    return{id:p.id,n:p.n,x:p.x,y:p.y,z:p.z,h:p.h,a:p.a,w:p.w,
      ghost:g?{x:+g.root.position.x.toFixed(2),y:+g.root.position.y.toFixed(2),
        z:+g.root.position.z.toFixed(2),h:+g.root.rotation.y.toFixed(2),
        anim:g.anim,weap:(WEAP[g.wIdx]&&WEAP[g.wIdx].id)||null,
        real:g.real,inScene:g.root.parent===scene,tag:g.tagName,
        wInHand:!!(g.wm&&g.wm.parent&&g.wm.parent.isBone)}:null};}),
  /* avanzar SÓLO la parte de red/animación de los remotos (sin física del mundo) */
  netStep:(n,dt)=>{for(let i=0;i<(n||30);i++){NET.tick(dt||1/60);ghostsStep(dt||1/60);}
    return Object.keys(GH).length;},
  chatSay:m=>{const i=$('chatin');if(!i)return false;i.focus();i.value=m;
    i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return true;},
  chatLog:()=>[...document.querySelectorAll('#chatlog div')].map(d=>d.textContent),
  mpUI:()=>({box:mpBox.style.display!=='none',btn:($('bMulti')||{}).textContent,
    nick:($('mpNick')||{}).value,room:($('mpRoom')||{}).value})
});
