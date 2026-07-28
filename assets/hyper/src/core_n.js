/* ============================================================
   SUX SANDBOX — AUDIO REAL (47 efectos + música de menú, generados)
   ------------------------------------------------------------
   Hasta acá todo el sonido era sintetizado con osciladores (SFX de core_b). Este módulo
   trae los archivos generados (assets/hyper/snd/*.mp3 + mus-menu.m4a) y:
     1. REEMPLAZA cada SFX.* por su grabación — con el sintetizador de RESPALDO: si un
        buffer no cargó (sin red, códec que falta), suena el beep de siempre. Nada se rompe.
     2. Suma sonidos que antes no existían: pasos, saltar/caer, zambullida, impactos de
        props por material (madera/metal/plástico/vidrio), spawn/borrar, sentarse, chat,
        clicks de menú, mecha/despegue/estallido de la pirotecnia, motor del auto al subir
        y andando, frenada, choque, y música tranquila en el menú.
     3. Volumen en Ajustes (SV.vol) sobre el gain maestro MG que ya existía.
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
  ui:1,menu:1,chat:1,sit:1};
const SNDMUS='mus-menu';                       /* .m4a (AAC): los celulares lo decodifican */
const BUF={};let sndPend=0,sndDone=0,sndFail=0,sndOn=false;
let lastSnd='',sndPlays=0;

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

/* ---------- 1. SFX.* pasan a las grabaciones (con respaldo) ---------- */
const _SFX0=Object.assign({},SFX);
const sTry=(n,o,fb)=>{ if(!sPlay(n,o)&&_SFX0[fb||'ui'])nsafe(()=>_SFX0[fb||'ui'](),'sfxfb'); };
SFX.shot=k=>{ const id=weap().id;
  const n=SND['shot-'+id]?'shot-'+id:(id==='bat'||id==='hands'?'bat-swing':'shot-pistol');
  if(!sPlay(n,{vol:.9}))_SFX0.shot(k); };
SFX.boom =()=>{ if(!sPlay('boom',{vol:1}))_SFX0.boom(); };
SFX.melee=()=>{ if(!sPlay('bat-swing',{vol:.8}))_SFX0.melee(); };
SFX.grab =()=>{ if(!sPlay('grab',{vol:.7}))_SFX0.grab(); };
SFX.drop =()=>{ if(!sPlay('grab',{vol:.5,rate:.72}))_SFX0.drop(); };
SFX.tool =()=>{ if(!sPlay('toolgun',{vol:.7}))_SFX0.tool(); };
SFX.freeze=()=>{ if(!sPlay('freeze',{vol:.8}))_SFX0.freeze(); };
SFX.hurt =()=>{ if(!sPlay('hurt',{vol:.9}))_SFX0.hurt(); };
SFX.reload=()=>{ if(!sPlay('reload',{vol:.8}))_SFX0.reload(); };
SFX.ui   =()=>{ if(!sPlay('ui',{vol:.5}))_SFX0.ui(); };

/* ---------- 2. sonidos nuevos ---------- */
/* pasos: al ritmo del paso real (walk ~2 Hz, run ~3 Hz), material según el piso del mapa */
let stepT=0;
function stepGround(){ return (CURMAP&&(CURMAP.def.ground==='asphalt'))?'step-concrete':'step-grass'; }
function stepStep(dt){
  if(APP!=='play'||!grounded||PL.rag||PL.sit)return;
  const sp=Math.hypot(plBody.velocity.x,plBody.velocity.z);
  if(sp<1.2){stepT=0;return;}
  stepT+=dt;
  const iv=sp>7?.32:.48;
  if(stepT>=iv){stepT=0;sPlay(stepGround(),{vol:.32,rate:sp>7?1.06:1});}
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
function impName(def){
  const ms={};for(const q of def.parts)ms[q.m||'metal']=1;
  if(ms.glass)return 'glass';
  if(ms.wood||ms.plank||ms.cardboard)return 'imp-wood';
  if(ms.metal||ms.steel||ms.chrome||ms.rust||ms.corrugated)return 'imp-metal';
  return 'imp-plastic';
}
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

/* pirotecnia: mecha al encender (botón), estallidos por estilo, petardo ya suena por boom */
nsafe(()=>{ const e=$('bFw'); if(e){
  const f=()=>nsafe(()=>{sPlay('fw-fuse',{vol:.6});
    setTimeout(()=>{if(APP==='play')sPlay('fw-launch',{vol:.55});},800);},'fuse');
  e.addEventListener('touchstart',f,{passive:true});
  e.addEventListener('mousedown',f);} },'fwbtn');
const _burst0=burst;
burst=function(x,y,z,opts){
  _burst0(x,y,z,opts);
  nsafe(()=>{
    const st=(opts&&opts.burst)||'peony';
    const n=st==='crackle'?'fw-crackle':'fw-burst';
    sPlay(n,{vol:1,at:[x,y,z]});
  },'fwsnd');
};

/* vehículos: arranque al subir, motor en bucle mientras se maneja, frenada y choque */
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
function engSnd(){
  const on=!!VHS&&APP==='play';
  if(on&&!engL&&BUF['eng-loop'])engL=sLoop('eng-loop',.4);
  if(!on&&engL){engL.stop();engL=null;}
  if(on&&engL){ const k=Math.min(1,Math.abs(vhSpeed())/22);
    engL.rate(.85+k*.75); engL.set(.3+k*.35); }
}
nsafe(()=>{ const e=$('bBrake'); if(e){
  const f=()=>{ if(VHS&&Math.abs(vhSpeed())>6)sPlay('skid',{vol:.75}); };
  e.addEventListener('touchstart',f,{passive:true});e.addEventListener('mousedown',f);} },'brk');

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

/* ---------- 3. música de menú ---------- */
let musL=null;
function musSnd(){
  const inMenu=(APP==='title'||APP==='qual'||APP==='help'||APP==='map'||APP==='lang');
  const a=AC;                                    /* sólo si el contexto ya existe (gesto) */
  if(inMenu&&!musL&&a&&BUF[SNDMUS])musL=sLoop(SNDMUS,.16);
  if(!inMenu&&musL){ musL.g.gain.setTargetAtTime(0,AC.currentTime,.4);
    const m=musL;musL=null;setTimeout(()=>m.stop(),1400); }
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
  nsafe(()=>{stepStep(dt);bodySnd(dt);humSnd();engSnd();musSnd();},'sndtick');
});

if(DEV&&window.__H)Object.assign(window.__H,{
  sndInfo:()=>({on:sndOn,pend:sndPend,done:sndDone,fail:sndFail,
    loaded:Object.keys(BUF).length,plays:sndPlays,last:lastSnd,
    hum:!!humL,eng:!!engL,mus:!!musL,vol:SV.vol,ac:!!AC}),
  sndPlay:n=>sPlay(n,{vol:1}),
  sndShot:()=>{SFX.shot(0);return lastSnd;},
  sndHave:n=>!!BUF[n],
  sndNames:()=>Object.keys(SND).concat([SNDMUS])
});
