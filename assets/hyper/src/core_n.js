/* ============================================================
   SUX SANDBOX — AUDIO REAL (68 efectos + música de menú, generados)
   ------------------------------------------------------------
   Hasta acá todo el sonido era sintetizado con osciladores (SFX de core_b). Este módulo
   trae los archivos generados (assets/hyper/snd/*.mp3 + mus-menu.m4a) y:
     1. REEMPLAZA cada SFX.* por su grabación — con el sintetizador de RESPALDO: si un
        buffer no cargó (sin red, códec que falta), suena el beep de siempre. Nada se rompe.
     2. Suma sonidos que antes no existían: pasos por material real, saltar/caer, nadar,
        impactos de props por material (madera/metal/plástico/vidrio) y de balas (rebote/
        hormigón), daño/muerte, spawn/borrar, sentarse, chat, clicks de menú, pirotecnia
        completa (mecha/despegue/estallido/rueda/fuente/petardo, por evento real via FWEV),
        motor del auto (o de la moto) al subir y andando, bocina, frenada, choque, ambiente
        de mapa (viento + pájaros en pasto), y música tranquila en el menú.
     3. Corrige mapeos que sonaban "a cualquier cosa": physgun/toolgun ya no caen al
        fallback de pistola, los pasos ya no son siempre pasto, etc. (ver cada sección).
     4. Volumen en Ajustes (SV.vol) sobre el gain maestro MG que ya existía.
   Reglas de la casa: los enganches son WRAPS de funciones ya declaradas (se concatena
   último, así que puede pisar cualquier declaración), todo dentro de nsafe, y los sonidos
   del mundo se atenúan por distancia a la cámara. Nada de esto está en el camino crítico:
   el juego arranca igual aunque no cargue ni un archivo.
   ============================================================ */

/* ---------- catálogo ---------- */
const SND={
  'shot-pistol':1,'shot-revolver':1,'shot-shotgun':1,'shot-smg':1,'shot-akm':1,
  'shot-sniper':1,'shot-rpg':1,'shot-crossbow':1,'bat-swing':1,'bat-hit':1,
  reload:1,empty:1,'phys-hum':1,grab:1,toolgun:1,
  boom:1,'fw-launch':1,'fw-burst':1,'fw-crackle':1,'fw-fountain':1,'fw-fuse':1,
  'fw-wheel':1,'fw-bang':1,
  'step-grass':1,'step-concrete':1,jump:1,land:1,splash:1,hurt:1,
  'imp-wood':1,'imp-metal':1,'imp-plastic':1,glass:1,spawn:1,trash:1,freeze:1,pop:1,weld:1,
  'eng-start':1,'eng-loop':1,horn:1,skid:1,crash:1,
  ui:1,menu:1,chat:1,sit:1,
  /* nuevos: disparos que no eran pistola/pistola, pasos por piso real, nadar, daño/muerte,
     rebotes de bala, pirotecnia ampliada (por evento), moto y ambiente de mapa */
  'fw-whistle':1,'fw-boomfar':1,'fw-finale':1,'fw-sparkle':1,'fw-thump':1,'fw-candle':1,
  'fw-bigburst':1,'fw-wheel2':1,'phys-shot':1,'tool-ok':1,'crossbow-load':1,ricochet:1,
  'imp-concrete':1,swim:1,hurt2:1,death:1,'amb-wind':1,'amb-birds':1,'eng-moto':1,
  'step-metal':1,'step-wood':1};
const SNDMUS='mus-menu';                       /* .m4a (AAC): los celulares lo decodifican */
const BUF={};let sndPend=0,sndDone=0,sndFail=0,sndOn=false;
let lastSnd='',sndPlays=0;
/* historial corto de reproducciones, SÓLO en DEV: lastSnd es un escalar y varios sonidos
   pueden dispararse en el mismo tick del juego (p.ej. el estallido de un cohete y el 'trash'
   de borrar el prop se llaman uno atrás del otro, sin ceder el hilo) — un test de afuera que
   sondea sndInfo().last a intervalos SIEMPRE puede perderse el que quedó pisado en el medio,
   por más seguido que sondee. Con el historial no hace falta adivinar el timing. */
const sndHistArr=[];

function sndLoad(){
  if(sndOn||!okUrl(BASE))return;sndOn=true;
  const names=Object.keys(SND).concat([SNDMUS]);
  let i=0;
  const next=()=>{
    if(i>=names.length)return;
    const n=names[i++];
    const f=n===SNDMUS?n+'.m4a':n+'.mp3';
    sndPend++;
    fetch(BASE+'snd/'+f).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();})
      .then(ab=>{const a=ac();if(!a)throw 0;
        return new Promise((res,rej)=>a.decodeAudioData(ab,res,rej));})
      .then(b=>{BUF[n]=b;sndDone++;next();})
      .catch(()=>{sndFail++;sndDone++;next();});
  };
  /* de a 4 en paralelo: ~2 MB en total, no pelea con las texturas (ya cargaron) */
  for(let k=0;k<4;k++)next();
}

/* ---------- reproducir ---------- */
const _sv=new THREE.Vector3();
function sPlay(name,o){
  o=o||{};
  const a=ac(),b=BUF[name];
  if(!a||!b)return false;
  let vol=o.vol==null?1:o.vol;
  if(o.at){ _sv.set(o.at.x!==undefined?o.at.x:o.at[0],
                    o.at.y!==undefined?o.at.y:o.at[1],
                    o.at.z!==undefined?o.at.z:o.at[2]);
    const d=camera.position.distanceTo(_sv);
    vol*=1/(1+d/9);
    if(vol<.02)return false; }
  const src=a.createBufferSource();src.buffer=b;
  src.playbackRate.value=(o.rate||1)*(o.jit===false?1:.94+Math.random()*.12);
  const g=a.createGain();g.gain.value=vol;
  src.connect(g);g.connect(MG);
  src.start();
  lastSnd=name;sndPlays++;
  if(DEV){sndHistArr.push(name);if(sndHistArr.length>60)sndHistArr.shift();}
  return true;
}
/* bucle con dueño: arranca una vez y se corta cuando la condición muere */
function sLoop(name,vol){
  const a=ac(),b=BUF[name];
  if(!a||!b)return null;
  const src=a.createBufferSource();src.buffer=b;src.loop=true;
  const g=a.createGain();g.gain.value=vol==null?1:vol;
  src.connect(g);g.connect(MG);src.start();
  return {src,g,stop(){try{src.stop();}catch(e){}},set(v){g.gain.value=v;},
    rate(r){src.playbackRate.value=r;}};
}
/* apaga un bucle con fundido (usado por música y ambiente al salir del contexto) */
function fadeOut(l){
  if(!l||!AC)return;
  l.g.gain.setTargetAtTime(0,AC.currentTime,.4);
  setTimeout(()=>{try{l.stop();}catch(e){}},1400);
}

/* ---------- material dominante (compartido: impactos de props, pasos, rebotes) ---------- */
function propMatSet(def){
  const ms={};for(const q of def.parts)ms[q.m||'metal']=1;
  return ms;
}
function impName(def){
  const ms=propMatSet(def);
  if(ms.glass)return 'glass';
  if(ms.wood||ms.plank||ms.cardboard)return 'imp-wood';
  if(ms.metal||ms.steel||ms.chrome||ms.rust||ms.corrugated)return 'imp-metal';
  return 'imp-plastic';
}
/* paso de un prop pisado (capot de auto, tablón, etc.): misma idea que impName */
function propStepSound(def){
  const ms=propMatSet(def);
  if(ms.wood||ms.plank||ms.cardboard)return 'step-wood';
  if(ms.metal||ms.steel||ms.chrome||ms.rust||ms.corrugated)return 'step-metal';
  if(ms.grass||ms.dirt)return 'step-grass';
  return 'step-concrete';
}
/* paso sobre el piso del mapa (userData.m puesto por addBody en core_a) */
function matStepSound(m){
  if(m==='grass'||m==='dirt')return 'step-grass';
  if(m==='wood'||m==='plank')return 'step-wood';
  if(m==='steel'||m==='metal'||m==='corrugated'||m==='chrome'||m==='rust')return 'step-metal';
  return 'step-concrete';                        // concrete/brick/asphalt/tile/… y cualquier otro
}
/* ¿el cuerpo que pegó la bala es metálico? prop: por su material dominante; mapa: por userData.m */
function isMetalHit(h){
  if(h.prop)return impName(h.prop.def)==='imp-metal';
  const m=h.body&&h.body.userData&&h.body.userData.m;
  return /steel|metal|chrome|rust|corrugated/.test(m||'');
}

/* ---------- 1. SFX.* pasan a las grabaciones (con respaldo) ---------- */
const _SFX0=Object.assign({},SFX);
const sTry=(n,o,fb)=>{ if(!sPlay(n,o)&&_SFX0[fb||'ui'])nsafe(()=>_SFX0[fb||'ui'](),'sfxfb'); };
/* disparo por arma real (queja: physgun/toolgun sonaban a pistola porque no había
   'shot-physgun'/'shot-toolgun' y todo caía al fallback) */
function shotNameFor(w){
  const id=w.id;
  if(id==='physgun'||id==='gravgun')return 'phys-shot';
  if(id==='toolgun')return 'tool-ok';
  if(id==='bat'||id==='hands')return 'bat-swing';
  return SND['shot-'+id]?'shot-'+id:'shot-pistol';
}
SFX.shot=k=>{
  const w=weap(),n=shotNameFor(w);
  if(!sPlay(n,{vol:.9}))_SFX0.shot(k);
  /* bala que pega: sólo armas de fuego de verdad (gun/proj), no melee/phys/tool */
  if(w.kind==='gun'||w.kind==='proj')nsafe(()=>{
    const h=aimRay(60,0);
    if(h)sPlay((isMetalHit(h)&&Math.random()<.3)?'ricochet':'imp-concrete',{vol:.22,at:h.p});
  },'ricochet');
};
SFX.boom =()=>{ if(!sPlay('boom',{vol:1}))_SFX0.boom(); };
SFX.melee=()=>{ if(!sPlay('bat-swing',{vol:.8}))_SFX0.melee(); };
SFX.grab =()=>{ if(!sPlay('grab',{vol:.7}))_SFX0.grab(); };
SFX.drop =()=>{ if(!sPlay('grab',{vol:.5,rate:.72}))_SFX0.drop(); };
SFX.tool =()=>{ if(!sPlay('toolgun',{vol:.7}))_SFX0.tool(); };
SFX.freeze=()=>{ if(!sPlay('freeze',{vol:.8}))_SFX0.freeze(); };
/* daño: hurt(n) en core_b llama a SFX.hurt() ANTES de aplicar el daño (no recibe n), así
   que lo envolvemos para saber si ESTE golpe deja la vida en 0 y avisar con 'death' */
let _pendKill=false;
const _hurt0=hurt;
hurt=function(n){ _pendKill=n>0&&(PL.hp-n<=0); _hurt0(n); };
SFX.hurt=()=>{ const n=_pendKill?'death':(Math.random()<.5?'hurt':'hurt2');
  if(!sPlay(n,{vol:.9}))_SFX0.hurt(); };
/* recarga: la ballesta tensa la cuerda a mano, no es instantáneo -> 0.3s de delay.
   Como el disparo con mag:1 dispara reload() en el mismo instante, este delay ES el
   "crossbow-load 0.3s después del disparo" pedido, sin duplicar el sonido. */
SFX.reload=()=>{
  const w=weap();
  if(w.id==='crossbow'){
    setTimeout(()=>{ if(APP==='play')nsafe(()=>{ if(!sPlay('crossbow-load',{vol:.6}))_SFX0.reload(); },'xload'); },300);
    return;
  }
  if(!sPlay('reload',{vol:.8}))_SFX0.reload();
};
SFX.ui   =()=>{ if(!sPlay('ui',{vol:.5}))_SFX0.ui(); };

/* ---------- 2. sonidos nuevos ---------- */
/* pasos: al ritmo del paso real (walk ~2 Hz, run ~3 Hz); material real del piso (groundBody,
   puesto por playerStep en core_b) o fallback por CURMAP.def.ground si no hay userData */
let stepT=0;
function stepGroundFallback(){ return (CURMAP&&(CURMAP.def.ground==='asphalt'))?'step-concrete':'step-grass'; }
function groundStepSound(){
  if(groundBody&&groundBody.userData){
    if(groundBody.userData.prop)return propStepSound(groundBody.userData.prop.def);
    if(groundBody.userData.m)return matStepSound(groundBody.userData.m);
  }
  return stepGroundFallback();
}
function stepStep(dt){
  if(APP!=='play'||PL.rag||PL.sit)return;
  if(inWater){                                   // nadando: brazada en vez de paso
    const sp=Math.hypot(plBody.velocity.x,plBody.velocity.y,plBody.velocity.z);
    if(sp<1.5){stepT=0;return;}
    stepT+=dt;
    if(stepT>=.8){stepT=0;sPlay('swim',{vol:.4});}
    return;
  }
  if(!grounded){stepT=0;return;}
  const sp=Math.hypot(plBody.velocity.x,plBody.velocity.z);
  if(sp<1.2){stepT=0;return;}
  stepT+=dt;
  const iv=sp>7?.32:.48;
  if(stepT>=iv){stepT=0;sPlay(groundStepSound(),{vol:.32,rate:sp>7?1.06:1});}
}
/* saltar / caer / zambullirse: por transiciones de grounded/inWater */
let wasGround=true,wasWater=false,airT=0;
function bodySnd(dt){
  if(APP!=='play')return;
  if(!grounded)airT+=dt;
  if(wasGround&&!grounded&&plBody.velocity.y>3)sPlay('jump',{vol:.45});
  if(!wasGround&&grounded&&airT>.18&&!inWater)sPlay('land',{vol:Math.min(.8,.3+airT*.4)});
  if(grounded)airT=0;
  wasGround=grounded;
  if(!wasWater&&inWater)sPlay('splash',{vol:.9});
  wasWater=inWater;
}
/* physgun: zumbido mientras se sostiene algo */
let humL=null;
function humSnd(){
  const want=!!grab&&APP==='play';
  if(want&&!humL)humL=sLoop('phys-hum',.30);
  else if(!want&&humL){humL.stop();humL=null;}
}
/* spawn / borrar props (con freno para que limpiar todo no meta 300 pops) */
const _spawnN0=spawnProp;let _sT=0,_tT=0;
spawnProp=function(id,pos,quat,opt){
  const p=_spawnN0(id,pos,quat,opt);
  if(p&&APP==='play'){const now=performance.now();
    if(now-_sT>90){_sT=now;nsafe(()=>sPlay('spawn',{vol:.55,at:p.body.position}),'ssp');}}
  return p;
};
const _removeP0=removeProp;
removeProp=function(p){
  if(p&&APP==='play'){const now=performance.now();
    if(now-_tT>90){_tT=now;nsafe(()=>sPlay('trash',{vol:.5,at:p.body.position}),'str');}}
  return _removeP0(p);
};
/* impactos de props por material: un listener de colisión por prop spawneado */
let _impT=0;
const _spawnN1=spawnProp;
spawnProp=function(id,pos,quat,opt){
  const p=_spawnN1(id,pos,quat,opt);
  if(p)nsafe(()=>{
    p.body.addEventListener('collide',e=>{
      const now=performance.now();
      if(now-_impT<70||now-(p._imp||0)<300)return;
      let v=0;nsafe(()=>{v=Math.abs(e.contact.getImpactVelocityAlongNormal());},'iv');
      if(v<2.6)return;
      _impT=now;p._imp=now;
      sPlay(impName(p.def),{vol:Math.min(.85,.2+v*.07),at:p.body.position});
    });},'impl');
  return p;
};
/* globo pinchado: pop cuando el globo desaparece lo maneja removeProp (trash); el POP de
   verdad va en los balloons de la herramienta — se cuelga del SFX de boom chico que ya
   usa stepBalloons? no hay: se usa el wrap de removeProp con sonido especial para globos */
const _removeP1=removeProp;
removeProp=function(p){
  if(p&&p.def&&/balloon|globo/i.test(p.def.name||'')&&APP==='play')
    nsafe(()=>sPlay('pop',{vol:.8,at:p.body.position}),'pop');
  return _removeP1(p);
};
/* soldar (la herramienta weld usa SFX.tool: le sumamos el zap de soldadura) */
const _tool0=SFX.tool;
SFX.tool=()=>{ const t=(T('tools')||[])[toolIdx]||'';
  if(/sold|weld/i.test(t)){ if(!sPlay('weld',{vol:.7}))_tool0(); }
  else _tool0(); };

/* sentarse */
const _sit0=sitDown;
sitDown=function(p){ const r=_sit0(p); if(r)nsafe(()=>sPlay('sit',{vol:.7}),'sit'); return r; };

/* chat entrante */
nsafe(()=>{ const c0=NET.onChat;
  NET.onChat=d=>{ nsafe(()=>c0(d),'chat0'); if(!d.sys)sPlay('chat',{vol:.5}); }; },'chatw');

/* ---------- pirotecnia: FWEV, el contrato con core_l ---------- */
/* antes había un wrap de burst() y un listener de bFw tocando fw-fuse/fw-launch a mano:
   sonaba siempre igual (no distinguía mecha real de estallido, ni estilo, ni fuentes/ruedas
   en bucle) y duplicaba el burst. Ahora core_l llama a FWEV(ev,x,y,z,extra) en cada evento
   real (fuse/launch/shell/candle/burst/bomb/fountain0-1/wheel0-1) y acá se decide el sonido. */
if(typeof FWEV==='undefined')var FWEV=null;
const fwKey=(x,y,z)=>Math.round(x*4)+'_'+Math.round(y*4)+'_'+Math.round(z*4);   // varias fuentes/ruedas a la vez
const fwFountains={},fwWheels={};
FWEV=function(ev,x,y,z,extra){
  nsafe(()=>{
    const at=[x,y,z];
    if(ev==='fuse'){ sPlay('fw-fuse',{vol:.6}); }
    else if(ev==='launch'){
      const missile=extra&&extra.k==='missile';
      const n=missile?'fw-launch':(Math.random()<.5?'fw-launch':'fw-whistle');   // variar los cohetes
      sPlay(n,{vol:.55,at});
    }
    else if(ev==='shell'){ sPlay('fw-thump',{vol:.6,at}); }
    else if(ev==='candle'){ sPlay('fw-candle',{vol:.55,at}); }
    else if(ev==='burst'){
      const size=(extra&&extra.size)||1,style=(extra&&extra.style)||'peony';
      const n=size>=3?'fw-bigburst':style==='crackle'?'fw-crackle':style==='multi'?'fw-finale':'fw-burst';
      sPlay(n,{vol:.75,at});
      if(style==='willow')setTimeout(()=>nsafe(()=>sPlay('fw-sparkle',{vol:.5,at}),'fwsp'),300);
      if(Math.random()<.35)setTimeout(()=>nsafe(()=>sPlay('fw-boomfar',{vol:.4,at}),'fwbf'),500); // profundidad
    }
    else if(ev==='bomb'){ sPlay('fw-bang',{vol:1,at}); }
    else if(ev==='fountain0'){ const k=fwKey(x,y,z); if(!fwFountains[k])fwFountains[k]=sLoop('fw-fountain',.4); }
    else if(ev==='fountain1'){ const k=fwKey(x,y,z); if(fwFountains[k]){fwFountains[k].stop();delete fwFountains[k];} }
    else if(ev==='wheel0'){ const k=fwKey(x,y,z); if(!fwWheels[k])fwWheels[k]=sLoop('fw-wheel2',.4); }
    else if(ev==='wheel1'){ const k=fwKey(x,y,z); if(fwWheels[k]){fwWheels[k].stop();delete fwWheels[k];} }
  },'fwev');
};

/* vehículos: arranque al subir, motor en bucle (moto suena distinto), bocina, frenada, choque */
let engL=null,_vColT=0;
const _vhEnter0=vhEnter;
vhEnter=function(p){
  const r=_vhEnter0(p);
  if(r!==false&&VHS){ nsafe(()=>sPlay('eng-start',{vol:.8}),'eng');
    nsafe(()=>{ if(VHS.p&&VHS.p.body)VHS.p.body.addEventListener('collide',e=>{
      const now=performance.now();if(now-_vColT<600)return;
      let v=0;nsafe(()=>{v=Math.abs(e.contact.getImpactVelocityAlongNormal());},'vv');
      if(v<5)return;_vColT=now;sPlay('crash',{vol:Math.min(1,.4+v*.05)});});},'vcol'); }
  return r;
};
const _vhExit0=vhExit;
vhExit=function(){ if(engL){engL.stop();engL=null;} return _vhExit0(); };
const isMoto=()=>!!(VHS&&VHS.p&&VHS.p.def&&(/moto/i.test(VHS.p.def.id||'')||/moto/i.test(VHS.p.def.name||'')));
function engSnd(){
  const on=!!VHS&&APP==='play';
  const name=(on&&isMoto()&&BUF['eng-moto'])?'eng-moto':'eng-loop';
  if(on&&!engL&&BUF[name])engL=sLoop(name,.4);
  if(!on&&engL){engL.stop();engL=null;}
  if(on&&engL){ const k=Math.min(1,Math.abs(vhSpeed())/22);
    engL.rate(.85+k*.75); engL.set(.3+k*.35); }
}
nsafe(()=>{ const e=$('bBrake'); if(e){
  const f=()=>{ if(VHS&&Math.abs(vhSpeed())>6)sPlay('skid',{vol:.75}); };
  e.addEventListener('touchstart',f,{passive:true});e.addEventListener('mousedown',f);} },'brk');
/* bocina: botón chico, mismo estilo/patrón que bBrake (core_e), sólo visible manejando */
nsafe(()=>{
  const st=document.createElement('style');
  st.textContent='#bHorn{right:22vmin;bottom:37vmin;width:10vmin;height:10vmin;max-width:52px;'
    +'max-height:52px;background:rgba(255,196,74,.58);font-size:4vmin;display:none}'
    +'#bHorn.on{display:flex}';
  document.head.appendChild(st);
  const hud=$('hud');
  const e=document.createElement('div');e.id='bHorn';e.className='rb';e.innerHTML='📯';
  if(hud)hud.appendChild(e);
  const f=()=>{ if(VHS)sPlay('horn',{vol:.85}); };
  e.addEventListener('touchstart',f,{passive:true});
  e.addEventListener('mousedown',f);
},'horn');
function hornSync(){ const e=$('bHorn'); if(e)e.classList.toggle('on',!!VHS); }

/* clicks de interfaz + menú de spawn */
document.addEventListener('click',e=>{
  const t=e.target;
  if(!t||!t.closest)return;
  if(t.closest('#spawn .pit'))return;                     /* el spawn ya suena solo */
  if(t.closest('.btn,.sptab,.fold,#pmenu button,#optfoot button,.mapit'))sPlay('ui',{vol:.4});
},true);
nsafe(()=>{ const e=$('bTools'); if(e){
  const f=()=>sPlay('menu',{vol:.5});
  e.addEventListener('touchstart',f,{passive:true});e.addEventListener('mousedown',f);} },'mn');

/* ---------- 3. música de menú + ambiente de mapa ---------- */
let musL=null;
function musSnd(){
  const inMenu=(APP==='title'||APP==='qual'||APP==='help'||APP==='map'||APP==='lang');
  const a=AC;                                    /* sólo si el contexto ya existe (gesto) */
  if(inMenu&&!musL&&a&&BUF[SNDMUS])musL=sLoop(SNDMUS,.16);
  if(!inMenu&&musL){ fadeOut(musL);musL=null; }
}
/* viento siempre de fondo en partida; pájaros sólo si el piso base del mapa es pasto */
let windL=null,birdsL=null;
function ambSnd(){
  const on=APP==='play';
  if(on&&!windL&&BUF['amb-wind'])windL=sLoop('amb-wind',.05);
  if(!on&&windL){ fadeOut(windL);windL=null; }
  const wantBirds=on&&CURMAP&&CURMAP.def&&CURMAP.def.ground==='grass';
  if(wantBirds&&!birdsL&&BUF['amb-birds'])birdsL=sLoop('amb-birds',.07);
  if(!wantBirds&&birdsL){ fadeOut(birdsL);birdsL=null; }
}

/* ---------- 4. volumen en Ajustes ---------- */
if(SV.vol==null)SV.vol=.5;
function volApply(){ if(MG)MG.gain.value=SV.vol; }
nsafe(()=>{
  const card=document.getElementById('optcard');if(!card)return;
  const row=document.createElement('div');row.className='sl';
  row.innerHTML='<label><span id="oVolL">Volumen</span><b id="oVolV"></b></label>'
    +'<input type="range" id="oVol" min="0" max="100" value="'+Math.round(SV.vol*100)+'">';
  const foot=document.getElementById('optfoot');
  card.insertBefore(row,foot);
  const sl=row.querySelector('#oVol'),vv=row.querySelector('#oVolV');
  vv.textContent=Math.round(SV.vol*100)+'%';
  sl.addEventListener('input',()=>{SV.vol=sl.value/100;vv.textContent=sl.value+'%';volApply();});
  sl.addEventListener('change',()=>save());
},'volui');

/* ---------- enganche al bucle ---------- */
let _ldT=0;
EXT.frame.push(dt=>{
  if(!sndOn){ _ldT+=dt; if(_ldT>1&&APP!=='load')nsafe(sndLoad,'sndload'); }
  volApply();
  nsafe(()=>{stepStep(dt);bodySnd(dt);humSnd();engSnd();hornSync();musSnd();ambSnd();},'sndtick');
});

if(DEV&&window.__H)Object.assign(window.__H,{
  /* amb: true si suena algo del ambiente de mapa (viento siempre en partida, pájaros sólo
     con piso de pasto — ver ambSnd más arriba); sin esto no había forma de probar por afuera
     que el viento/pájaros realmente están sonando, sólo se podía adivinar por sndNames() */
  sndInfo:()=>({on:sndOn,pend:sndPend,done:sndDone,fail:sndFail,
    loaded:Object.keys(BUF).length,plays:sndPlays,last:lastSnd,
    hum:!!humL,eng:!!engL,mus:!!musL,vol:SV.vol,ac:!!AC,amb:!!windL||!!birdsL}),
  sndPlay:n=>sPlay(n,{vol:1}),
  sndShot:()=>{SFX.shot(0);return lastSnd;},
  sndHist:()=>sndHistArr.slice(),
  sndHave:n=>!!BUF[n],
  sndNames:()=>Object.keys(SND).concat([SNDMUS]),
  sndMap:()=>({shot:shotNameFor(weap()),ground:groundStepSound()})
});
