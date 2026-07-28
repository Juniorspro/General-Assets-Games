/* ============================================================
   SUX SANDBOX — PROPS CON FUNCIÓN: SENTARSE
   ------------------------------------------------------------
   Sillas, sillones, banquitos, bancos de plaza y el inodoro dejan de ser sólo física:
   al acercarse a uno aparece el botón "Sentarse" y, al tocarlo, el personaje se sienta
   DE VERDAD encima, con una animación de sentado (bajada suave + piernas dobladas 90°,
   hecha girando los huesos de las piernas en el mundo con el mismo worldTwist del IK,
   así no importa cómo estén orientados los ejes locales del rig).

   CÓMO SE ELIGE EL ASIENTO
   - por id (SEATS: altura del asiento medida en la definición del prop, donde y=0 es el
     piso del objeto) o por tag (chair/sofa/stool/seat -> altura = mitad del alto).
   - el prop tiene que estar más o menos PARADO (su arriba local apuntando arriba): una
     silla volcada no ofrece sentarse.
   - el punto del asiento se pasa al mundo con pointToWorldFrame, así sirve aunque la
     silla esté girada; y el personaje queda mirando hacia el +Z local del prop, que en
     todas estas definiciones es el frente (el respaldo está en -Z).

   MIENTRAS ESTÁ SENTADO
   - plBody pasa a STATIC y un gancho EXT.pre corta el control normal (igual que los
     vehículos); el prop se congela para que la silla no se escape ni tiemble.
   - la pose se aplica en EXT.frame — después de animStep/holdWeapon, antes de render —
     con un peso que sube y baja suave (la "animación de sentarse"). Los brazos y el
     arma no se tocan: se puede mirar alrededor y disparar sentado.
   - PL.sit avisa a fpClip (core_c) para que en 1ª persona el corte de la parte baja
     baje al muslo y se vea la falda de las piernas dobladas.
   - se levanta con el mismo botón o con el de saltar.
   Se concatena después de todos: ya existen PROPS, PDEF, buildDef, freezeProp, plBody,
   plSync, PL, EXT, bones, charRoot, worldTwist, I18N, T, $, APP, toast, save…
   ============================================================ */

Object.assign(I18N.es,{sit:'🪑 Sentarse',standup:'🧍 Levantarse'});
Object.assign(I18N.en,{sit:'🪑 Sit down',standup:'🧍 Stand up'});
Object.assign(I18N.pt,{sit:'🪑 Sentar',standup:'🧍 Levantar'});

/* altura del asiento (y=0 = piso del objeto) y corrimiento hacia el frente */
const SEATS={
  n_chair_wood:{h:.50},  n_chair_office:{h:.50}, n_stool:{h:.74},
  n_sofa2:{h:.56},       n_armchair:{h:.55},     n_toilet:{h:.57,z:.08},
  r_bench:{h:.50,z:.03}
};
const SEATTAGS=['chair','sofa','stool','seat'];
function seatDef(def){
  const s=SEATS[def.id];if(s)return s;
  if(def.tags&&def.tags.some(t=>SEATTAGS.indexOf(t)>=0)){
    let b=null;try{b=buildDef(def);}catch(e){}
    if(!b)return null;
    return (SEATS[def.id]={h:Math.min(.55,b.size[1]*.5)});
  }
  return null;
}

/* ---------- huesos de las piernas (mismo criterio de nombres que setupChar) ---------- */
const LEG={};
function legBones(){
  if(LEG.ok)return true;
  if(!charRoot)return false;
  charRoot.traverse(o=>{ if(!o.isBone)return;
    const n=o.name.toLowerCase();
    const L=/(left|_l$|\.l$|l_)/.test(n),R=/(right|_r$|\.r$|r_)/.test(n);
    if(/(upleg|thigh)/.test(n)){ if(L)LEG.lUp=LEG.lUp||o; if(R)LEG.rUp=LEG.rUp||o; }
    else if(/foot/.test(n)){ if(L)LEG.lFt=LEG.lFt||o; if(R)LEG.rFt=LEG.rFt||o; }
    else if(/(leg|shin|calf)/.test(n)){ if(L)LEG.lLo=LEG.lLo||o; if(R)LEG.rLo=LEG.rLo||o; }
  });
  LEG.ok=!!(LEG.lUp&&LEG.lLo&&LEG.rUp&&LEG.rLo);
  return LEG.ok;
}

/* ---------- estado ---------- */
let SIT=null;      /* {p, x,y,z destino, sx,sy,sz salida, t 0..1, fz venía congelado} */
let sitW=0;        /* peso de la pose (sube al sentarse, baja al pararse) */
PL.sit=false;
let nearSeat=null,scanT=0;

/* ---------- sentarse / levantarse ---------- */
const _sLp=new CANNON.Vec3(),_sWp=new CANNON.Vec3(),_sF=new CANNON.Vec3();
function sitDown(p){
  if(SIT||!p)return false;
  const sd=seatDef(p.def);if(!sd)return false;
  let b=null;try{b=buildDef(p.def);}catch(e){}
  if(!b)return false;
  /* punto del asiento: el cuerpo tiene el origen en el centro del AABB, y las definiciones
     arrancan en y=0 = piso del objeto -> el asiento queda en h - alto/2 del origen */
  _sLp.set(0,sd.h-b.size[1]/2+.01,sd.z||0);
  p.body.pointToWorldFrame(_sLp,_sWp);
  /* mirar hacia el frente del prop (+Z local) */
  p.body.vectorToWorldFrame(new CANNON.Vec3(0,0,1),_sF);
  const yaw=Math.atan2(-_sF.x,-_sF.z);
  SIT={p,x:_sWp.x,y:_sWp.y-.92,z:_sWp.z,
       sx:plBody.position.x,sy:plBody.position.y,sz:plBody.position.z,
       t:0,fz:p.frozen};
  if(!p.frozen)freezeProp(p,true);
  plBody.velocity.set(0,0,0);plBody.angularVelocity.set(0,0,0);
  plBody.type=CANNON.Body.STATIC;
  PL.yaw=yaw;PL.pitch=Math.max(PL.pitch,-.2);
  PL.sit=true;
  sitBtnPaint();
  return true;
}
function standUp(){
  if(!SIT)return false;
  const s=SIT;SIT=null;PL.sit=false;
  if(!s.fz)freezeProp(s.p,false);
  const ys=Math.sin(PL.yaw),yc=Math.cos(PL.yaw);
  plBody.type=CANNON.Body.DYNAMIC;
  plBody.position.set(s.x-ys*.55,s.y+.25,s.z-yc*.55);
  plBody.velocity.set(0,0,0);
  plSync();
  sitBtnPaint();
  return true;
}

/* mientras está sentado: cortar el control normal y llevarlo suave hasta el asiento */
EXT.pre.push(dt=>{
  if(!SIT)return false;
  if(SIT.p&&PROPS.indexOf(SIT.p)<0){standUp();return false;}   /* borraron la silla */
  SIT.t=Math.min(1,SIT.t+dt/.4);
  const e=SIT.t*SIT.t*(3-2*SIT.t);                              /* suave (smoothstep) */
  plBody.position.set(SIT.sx+(SIT.x-SIT.sx)*e,
                      SIT.sy+(SIT.y-SIT.sy)*e,
                      SIT.sz+(SIT.z-SIT.sz)*e);
  plSync();
  return true;
});

/* ---------- la pose: piernas dobladas 90°, aplicada sobre la animación ---------- */
const _kA=new THREE.Vector3(),_kB=new THREE.Vector3(),_kD=new THREE.Vector3(),
      _kT=new THREE.Vector3(),_kQ=new THREE.Quaternion(),_kI=new THREE.Quaternion();
function bendTo(bone,child,tx,ty,tz,w){
  bone.updateWorldMatrix(true,false);child.updateWorldMatrix(true,false);
  _kA.setFromMatrixPosition(bone.matrixWorld);
  _kB.setFromMatrixPosition(child.matrixWorld);
  _kD.copy(_kB).sub(_kA);if(_kD.lengthSq()<1e-8)return;
  _kT.set(tx,ty,tz).normalize();
  _kQ.setFromUnitVectors(_kD.normalize(),_kT);
  _kI.identity().slerp(_kQ,w);
  worldTwist(bone,_kI);
}
function sitPose(w){
  if(!legBones())return;
  const ys=Math.sin(PL.yaw),yc=Math.cos(PL.yaw);
  /* adelante del personaje = (-ys,·,-yc); derecha = (yc,·,-ys) */
  const fx=-ys,fz=-yc,rx=yc,rz=-ys;
  /* muslos: horizontales hacia adelante, apenas abiertos; canillas: verticales abajo */
  bendTo(LEG.lUp,LEG.lLo,fx-rx*.16,-.12,fz-rz*.16,w);
  bendTo(LEG.rUp,LEG.rLo,fx+rx*.16,-.12,fz+rz*.16,w);
  if(LEG.lFt)bendTo(LEG.lLo,LEG.lFt,fx*.14,-1,fz*.14,w);
  if(LEG.rFt)bendTo(LEG.rLo,LEG.rFt,fx*.14,-1,fz*.14,w);
}

/* ---------- botón "Sentarse" ---------- */
const bSit=document.createElement('div');
bSit.id='bSit';
bSit.style.cssText='position:absolute;left:50%;bottom:16vmin;transform:translateX(-50%);'
  +'pointer-events:auto;background:rgba(20,24,30,.82);border:1px solid rgba(255,176,58,.55);'
  +'border-radius:12px;padding:10px 18px;color:#fff;font:800 14px system-ui,sans-serif;'
  +'white-space:nowrap;display:none;text-shadow:0 1px 2px #000';
nsafe(()=>{const h=$('hud');if(h)h.appendChild(bSit);},'sitbtn');
function sitBtnPaint(){
  const show=APP==='play'&&(SIT||nearSeat);
  bSit.style.display=show?'':'none';
  if(show)bSit.textContent=SIT?(T('standup')||'Levantarse')
    :((T('sit')||'Sentarse')+' · '+(nearSeat.def.name||''));
}
const sitTap=e=>{e.preventDefault();e.stopPropagation();
  if(SIT)standUp();else if(nearSeat)sitDown(nearSeat);};
bSit.addEventListener('touchstart',sitTap,{passive:false});
bSit.addEventListener('mousedown',sitTap);
/* el botón de saltar también levanta (es lo primero que va a tocar cualquiera) */
nsafe(()=>{const j=$('bJump');
  if(j)j.addEventListener('touchstart',()=>{if(SIT)standUp();},{passive:true});
  if(j)j.addEventListener('mousedown',()=>{if(SIT)standUp();});},'sitjump');

/* ---------- cercanía: escanear 4 veces por segundo ---------- */
function seatScan(){
  nearSeat=null;
  if(SIT||APP!=='play'||PL.rag)return;
  let best=1.9*1.9;
  const px=plBody.position.x,py=plBody.position.y,pz=plBody.position.z;
  for(const p of PROPS){
    if(!seatDef(p.def))continue;
    const b=p.body;
    const dx=b.position.x-px,dy=b.position.y-py,dz=b.position.z-pz;
    const dd=dx*dx+dz*dz;
    if(dd>=best||Math.abs(dy)>1.6)continue;
    /* parado: el arriba local del prop tiene que apuntar arriba */
    b.vectorToWorldFrame(UPV,_sF);
    if(_sF.y<.75)continue;
    best=dd;nearSeat=p;
  }
}
const UPV=new CANNON.Vec3(0,1,0);

/* ---------- enganche al bucle ---------- */
EXT.frame.push(dt=>{
  scanT+=dt;
  if(scanT>=.25){scanT=0;seatScan();sitBtnPaint();}
  /* peso de la pose: sube en ~0,35 s al sentarse y baja un toque más rápido al pararse */
  const tgt=SIT?1:0;
  sitW+=(tgt-sitW)*Math.min(1,dt*(SIT?7:10));
  if(sitW<.02){sitW=tgt?sitW:0;return;}
  if(APP==='play'||APP==='pause'||APP==='spawn')sitPose(sitW);
});

if(DEV&&window.__H)Object.assign(window.__H,{
  sitInfo:()=>({sit:!!SIT,w:+sitW.toFixed(3),near:nearSeat?nearSeat.id:null,
    btn:bSit.style.display!=='none'?bSit.textContent:null,
    legs:legBones(),type:plBody.type,
    pos:[+plBody.position.x.toFixed(2),+plBody.position.y.toFixed(2),+plBody.position.z.toFixed(2)],
    seat:SIT?[+SIT.x.toFixed(2),+SIT.y.toFixed(2),+SIT.z.toFixed(2)]:null}),
  sitDo:()=>{seatScan();return nearSeat?sitDown(nearSeat):false;},
  sitUp:()=>standUp(),
  seatIds:()=>Object.keys(PDEF).filter(id=>seatDef(PDEF[id])),
  sitTap:()=>{sitTap(new Event('mousedown'));return !!SIT;}
});
