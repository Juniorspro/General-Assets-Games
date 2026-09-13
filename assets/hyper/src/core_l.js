/* ============================================================
   SUX SANDBOX — PIROTECNIA (cohetes, morteros, fuentes, ruedas, bombas…)
   ------------------------------------------------------------
   Los props con def.fw = {k,clr,fly,dur,shots,burst,size} dejan de ser un
   adorno: al acercarse (<2 m) aparece "🔥 Encender · <nombre>" y al tocarlo
   arrancan según fw.k:
     rocket/missile : mecha con chispitas -> se descongelan y suben por su
                      propio +Y local (empuje escrito, no impulsos por frame)
                      -> a los fw.fly s estallan donde estén y se borran.
                      missile además deja una estela de humo/chispas.
     mortar/cake    : quietos; disparan fw.shots "bolitas" balísticas (sin
                      cuerpo físico, son partículas) que estallan en su ápice.
     fountain       : chorro cónico de chispas hacia arriba durante fw.dur s.
     candle         : como el mortero pero con ápice bajo, bola por bola.
     wheel          : angularVelocity en Y (como una Catherine wheel) +
                      chispas radiales durante fw.dur s.
     bomb           : mecha 1,2 s -> boom() de verdad (física+humo, ya existe
                      en core_g/core_b) + destello de chispas a ras de piso.

   TODO EL FUEGO ARTIFICIAL VISUAL (los "puntitos brillantes") vive en UN
   solo THREE.Points con geometría preasignada (PMAX partículas, menos en
   ULD): se actualiza entero cada frame — gravedad + arrastre + fundido de
   color — y se reescribe al buffer. El tamaño por partícula (aSize) se
   cuela en el shader de PointsMaterial con onBeforeCompile: si el string no
   matchea en alguna versión de three, el .replace no hace nada y listo,
   nunca tira excepción — sigue viéndose, sólo que todas del mismo tamaño.

   El "ápice" de morteros/velas se resuelve como una partícula más (shell:
   true): sube con la gravedad "de verdad" del mundo (19.6, la misma que
   CANNON) y en cuanto su vy cruza el cero, en vez de morir dispara un
   estallido ahí mismo. Así no hace falta ningún cuerpo físico para las
   bolitas, tal como pide el enunciado.

   Todo se lee de def.fw: si props/fireworks.js todavía no puso ninguno (o
   está corriendo en paralelo y no llegó a tiempo), FWIDS queda vacío y cada
   gancho de frame vuelve enseguida — cero costo, cero riesgo.
   Se concatena después de todos: ya existen THREE, CANNON, scene, world,
   camera, PROPS, PDEF, buildDef, spawnProp, removeProp, freezeProp,
   syncMat, plBody, PL, EXT, boom, QP, T, I18N, $, APP, toast, nsafe, DEV,
   window.__H…
   ============================================================ */

/* ---------- contrato FWEV: eventos de sonido (los reproduce core_n, en paralelo) ----------
   core_l sólo EMITE; nunca reproduce nada acá. Se declara el guard porque build.js
   concatena los core_[a-z] en orden alfabético y "n" va DESPUÉS de "l": si dejáramos
   FWEV sin declarar, cualquier llamada acá explotaría hasta que core_n se cargue. Con
   'var' y el typeof-guard, core_n puede REASIGNAR la función (nunca re-declararla, eso
   sí rompe) sin que el orden de concatenación importe. */
if(typeof FWEV==='undefined')var FWEV=null;

Object.assign(I18N.es,{fwLight:'🔥 Encender'});
Object.assign(I18N.en,{fwLight:'🔥 Light'});
Object.assign(I18N.pt,{fwLight:'🔥 Acender'});

/* ---------- ¿hay algo para hacer? (se calcula UNA vez) ---------- */
const FWIDS=Object.keys(PDEF).filter(id=>PDEF[id]&&PDEF[id].fw);
const HASFW=FWIDS.length>0;

/* ================= sistema de partículas (único, global) ================= */
const PMAX=QP.key==='uld'?1200:3000;
const PMUL=QP.key==='uld'?.45:(QP.key==='low'?.75:1);
const pGeo=new THREE.BufferGeometry();
const pPosArr=new Float32Array(PMAX*3),pColArr=new Float32Array(PMAX*3),pSizeArr=new Float32Array(PMAX);
pGeo.setAttribute('position',new THREE.BufferAttribute(pPosArr,3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('color',new THREE.BufferAttribute(pColArr,3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('aSize',new THREE.BufferAttribute(pSizeArr,1).setUsage(THREE.DynamicDrawUsage));
pGeo.setDrawRange(0,0);
/* .42 y no .17: contra el cielo diurno del mapa las chispas de .17 m quedaban como puntitos
   que apenas se veían (revisado en captura); un estallido real "lee" grande de lejos */
const pMat=new THREE.PointsMaterial({size:.42,sizeAttenuation:true,vertexColors:true,
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
/* tamaño por partícula: se inyecta a mano en el shader de siempre; si el
   string no coincide (otra versión de three) el .replace no cambia nada y
   el material sigue funcionando, sólo sin variar tamaño — nunca rompe. */
pMat.onBeforeCompile=sh=>{
  sh.vertexShader=sh.vertexShader
    .replace('#include <common>','attribute float aSize;\n#include <common>')
    .replace('gl_PointSize = size;','gl_PointSize = size*aSize;')
    .replace('gl_PointSize = size * ( scale / - mvPosition.z );','gl_PointSize = size*aSize*(scale/-mvPosition.z);');
};
const fwPts=new THREE.Points(pGeo,pMat);
fwPts.frustumCulled=false;fwPts.renderOrder=9;
scene.add(fwPts);

/* cada partícula viva: {x,y,z,vx,vy,vz,life,max,age,r,g,b,grav,drag,psize,
   shell,style,sclr,ssize,crackle,cracked,willow,strobe} */
const PARR=[];
function spawnParticle(o){
  if(PARR.length>=PMAX)return;
  o.max=o.life;o.age=0;
  PARR.push(o);
}
function randDir(){
  const zz=Math.random()*2-1,t=Math.random()*Math.PI*2,r=Math.sqrt(Math.max(0,1-zz*zz));
  return{x:r*Math.cos(t),y:r*Math.sin(t),z:zz};
}
function fwClrArr(clr){
  if(clr==null)return[0xffcf7a];
  if(Array.isArray(clr))return clr.length?clr:[0xffcf7a];
  return[clr];
}
const _pcTmp=new THREE.Color();
function pickColor(clr){
  const arr=fwClrArr(clr);
  _pcTmp.set(arr[Math.floor(Math.random()*arr.length)]);
  return{r:_pcTmp.r,g:_pcTmp.g,b:_pcTmp.b};
}

/* luz puntual pooled: se mueve al último estallido grande y se apaga sola */
const FWLIGHT=QP.shadow>0?new THREE.PointLight(0xffffff,0,46):null;
if(FWLIGHT)scene.add(FWLIGHT);
let fwLightT=0;
function litLight(x,y,z,hex){
  if(!FWLIGHT)return;
  FWLIGHT.position.set(x,y,z);
  FWLIGHT.color.setHex(hex==null?0xffffff:hex);
  FWLIGHT.intensity=9;fwLightT=.4;
}

let BURSTN=0;
/* ---------- estilos de estallido ---------- */
function burstPeony(x,y,z,clrArr,size,spd){
  const n=Math.round((70+size*30)*PMUL);
  for(let i=0;i<n;i++){const d=randDir(),s=spd*(.55+Math.random()*.55),c=pickColor(clrArr);
    spawnParticle({x,y,z,vx:d.x*s,vy:d.y*s,vz:d.z*s,life:1+Math.random()*.6,
      r:c.r,g:c.g,b:c.b,grav:3.2,drag:.45,psize:1+Math.random()*.5});}
}
function burstWillow(x,y,z,clrArr,size,spd){
  const n=Math.round((40+size*18)*PMUL);
  for(let i=0;i<n;i++){const d=randDir(),s=spd*(.7+Math.random()*.5),c=pickColor(clrArr);
    spawnParticle({x,y,z,vx:d.x*s,vy:d.y*s,vz:d.z*s,life:2+Math.random()*1,
      r:c.r,g:c.g,b:c.b,grav:5.4,drag:.55,willow:true,psize:1.15});}
}
function burstRing(x,y,z,clrArr,size,spd){
  const n=Math.round((46+size*20)*PMUL);
  const tilt=(Math.random()-.5)*1.1;
  const ax=new THREE.Vector3(Math.sin(tilt),0,Math.cos(tilt));
  const up=new THREE.Vector3(0,1,0);
  const u=new THREE.Vector3().crossVectors(up,ax).normalize();
  const v=new THREE.Vector3().crossVectors(ax,u).normalize();
  for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+Math.random()*.06,s=spd*(.85+Math.random()*.2),c=pickColor(clrArr);
    const dx=u.x*Math.cos(a)+v.x*Math.sin(a),dy=u.y*Math.cos(a)+v.y*Math.sin(a),dz=u.z*Math.cos(a)+v.z*Math.sin(a);
    spawnParticle({x,y,z,vx:dx*s,vy:dy*s,vz:dz*s,life:1.1+Math.random()*.4,
      r:c.r,g:c.g,b:c.b,grav:2.6,drag:.5,psize:1.1});}
}
function burstPalm(x,y,z,clrArr,size,spd){
  const narm=6+Math.floor(Math.random()*5),perarm=Math.round((10+size*4)*PMUL);
  for(let a=0;a<narm;a++){
    const ang=(a/narm)*Math.PI*2+Math.random()*.2,elev=.35+Math.random()*.55;
    const dx=Math.cos(ang)*(1-elev),dz=Math.sin(ang)*(1-elev),dy=elev;
    const len=Math.sqrt(dx*dx+dy*dy+dz*dz)||1,ux=dx/len,uy=dy/len,uz=dz/len;
    const c=pickColor(clrArr);
    for(let j=0;j<perarm;j++){
      const s=spd*(.75+Math.random()*.5)*(.6+j/perarm*.6),jt=.06;
      spawnParticle({x,y,z,
        vx:(ux+(Math.random()-.5)*jt)*s,vy:(uy+(Math.random()-.5)*jt)*s,vz:(uz+(Math.random()-.5)*jt)*s,
        life:1.3+Math.random()*.7,r:c.r,g:c.g,b:c.b,grav:3.6,drag:.4,willow:j>perarm*.6,psize:1.2});
    }
  }
}
function crackleSecondary(x,y,z,size){
  const n=Math.round((10+size*6)*PMUL);
  for(let i=0;i<n;i++){const d=randDir(),s=2+Math.random()*2.4;
    spawnParticle({x,y,z,vx:d.x*s,vy:d.y*s,vz:d.z*s,life:.28+Math.random()*.22,
      r:1,g:1,b:1,grav:2,drag:.7,psize:.75});}
}
function burstCrackle(x,y,z,clrArr,size,spd){
  const n=Math.round((60+size*24)*PMUL);
  for(let i=0;i<n;i++){const d=randDir(),s=spd*(.55+Math.random()*.5),c=pickColor(clrArr);
    spawnParticle({x,y,z,vx:d.x*s,vy:d.y*s,vz:d.z*s,life:.9+Math.random()*.4,
      r:c.r,g:c.g,b:c.b,grav:3.4,drag:.5,psize:1,crackle:true,ssize:size*.55});}
}
function burstStrobe(x,y,z,clrArr,size,spd){
  const n=Math.round((55+size*22)*PMUL);
  for(let i=0;i<n;i++){const d=randDir(),s=spd*(.5+Math.random()*.55),c=pickColor(clrArr);
    spawnParticle({x,y,z,vx:d.x*s,vy:d.y*s,vz:d.z*s,life:1+Math.random()*.5,
      r:c.r,g:c.g,b:c.b,grav:3,drag:.45,strobe:true,psize:1});}
}
function burstMulti(x,y,z,clrArr,size,spd){
  const n=Math.round((80+size*30)*PMUL);
  const c0=clrArr[0],c1=clrArr[1]!=null?clrArr[1]:clrArr[0];
  for(let i=0;i<n;i++){const d=randDir(),s=spd*(.55+Math.random()*.55);
    _pcTmp.set(i%2?c1:c0);
    spawnParticle({x,y,z,vx:d.x*s,vy:d.y*s,vz:d.z*s,life:1+Math.random()*.6,
      r:_pcTmp.r,g:_pcTmp.g,b:_pcTmp.b,grav:3.2,drag:.45,psize:1+Math.random()*.5});}
}
function burst(x,y,z,opts){
  BURSTN++;
  const style=(opts&&opts.burst)||'peony';
  const clrArr=fwClrArr(opts&&opts.clr);
  const size=Math.max(.3,Math.min(3,(opts&&opts.size)||1));
  const spd=6.5+size*3.2;
  /* estilo/size YA resueltos (los mismos que eligen la función de abajo): el sonido
     necesita justo estos, no los opts crudos que puedan venir sin default. */
  if(FWEV)nsafe(()=>FWEV('burst',x,y,z,{style,size}),'fwev');
  litLight(x,y,z,clrArr[0]);
  /* FOGONAZO: unas pocas partículas grandes y blancas de vida cortísima en el centro.
     Es lo que hace que el estallido se note incluso contra el cielo claro de día. */
  for(let i=0;i<6;i++){
    const d=randDir(),c=i<3?{r:1,g:1,b:1}:pickColor(clrArr);
    spawnParticle({x,y,z,vx:d.x*2,vy:d.y*2,vz:d.z*2,life:.16+Math.random()*.1,
      r:c.r,g:c.g,b:c.b,grav:0,drag:0,psize:5+size*2.5});
  }
  if(style==='willow')burstWillow(x,y,z,clrArr,size,spd);
  else if(style==='ring')burstRing(x,y,z,clrArr,size,spd);
  else if(style==='palm')burstPalm(x,y,z,clrArr,size,spd);
  else if(style==='crackle')burstCrackle(x,y,z,clrArr,size,spd);
  else if(style==='strobe')burstStrobe(x,y,z,clrArr,size,spd);
  else if(style==='multi')burstMulti(x,y,z,clrArr,size,spd);
  else burstPeony(x,y,z,clrArr,size,spd);
}

/* ---------- actualizar/dibujar todas las partículas (visual, EXT.frame) ---------- */
function fwParticles(dt){
  if(!PARR.length)return;
  for(let i=PARR.length-1;i>=0;i--){
    const q=PARR[i];
    q.age+=dt;q.life-=dt;
    const dk=Math.max(0,1-(q.drag||0)*dt);
    q.vx*=dk;q.vz*=dk;q.vy=q.vy*dk-(q.grav||3.2)*dt;
    q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;
    if(q.shell&&!q.burstDone&&q.vy<=0){
      q.burstDone=true;
      burst(q.x,q.y,q.z,{burst:q.style,clr:q.sclr,size:q.ssize});
      q.life=-1;
    }
    if(q.crackle&&!q.cracked&&q.age>=.4){q.cracked=true;crackleSecondary(q.x,q.y,q.z,q.ssize||1);}
    if(q.willow&&Math.random()<dt*7)
      spawnParticle({x:q.x,y:q.y,z:q.z,vx:q.vx*.08,vy:q.vy*.08-.3,vz:q.vz*.08,
        life:.16+Math.random()*.16,r:q.r*.85,g:q.g*.85,b:q.b*.85,grav:2,drag:.5,psize:.6});
    if(q.life<=0)PARR.splice(i,1);
  }
  const n=Math.min(PARR.length,PMAX);
  for(let i=0;i<n;i++){
    const q=PARR[i];
    let f=Math.max(0,Math.min(1,q.life/q.max));
    if(q.strobe)f*=(Math.floor(q.age*13)%2===0?1:.12);
    pPosArr[i*3]=q.x;pPosArr[i*3+1]=q.y;pPosArr[i*3+2]=q.z;
    pColArr[i*3]=q.r*f;pColArr[i*3+1]=q.g*f;pColArr[i*3+2]=q.b*f;
    pSizeArr[i]=q.psize||1;
  }
  pGeo.setDrawRange(0,n);
  pGeo.attributes.position.needsUpdate=true;
  pGeo.attributes.color.needsUpdate=true;
  pGeo.attributes.aSize.needsUpdate=true;
  if(FWLIGHT&&fwLightT>0){fwLightT=Math.max(0,fwLightT-dt);FWLIGHT.intensity=fwLightT/.4*9;}
}

/* ================= geometría de los props: bocas, bases, ejes ================= */
const _fwLp=new CANNON.Vec3(),_fwWp=new CANNON.Vec3();
function fwPoint(p,yDef,xDef,zDef,outV3){
  const b=buildDef(p.def);
  _fwLp.set(xDef||0,(yDef||0)-b.dy,zDef||0);
  p.body.pointToWorldFrame(_fwLp,_fwWp);
  outV3.set(_fwWp.x,_fwWp.y,_fwWp.z);
  return b;
}
const _fwUpL=new CANNON.Vec3(0,1,0),_fwUpW=new CANNON.Vec3();
function fwUpWorld(p,outV3){
  p.body.vectorToWorldFrame(_fwUpL,_fwUpW);
  outV3.set(_fwUpW.x,_fwUpW.y,_fwUpW.z);
}
const _fwV3=new THREE.Vector3(),_fwDirV=new THREE.Vector3();

/* ---------- ápice de una "bolita" balística (mortero/vela) ---------- */
function apexFor(fw,isCandle){
  const sz=Math.max(.3,Math.min(3,fw.size||1));
  return isCandle?(4+(sz-.3)/2.7*6):(14+(sz-.3)/2.7*16);
}
function fireShell(p,fw,isCandle){
  const b=buildDef(p.def);
  fwPoint(p,b.size[1]-.03,0,0,_fwV3);
  const apex=apexFor(fw,isCandle),vy0=Math.sqrt(2*19.6*Math.max(1,apex)),c=pickColor(fw.clr);
  /* mortero/torta vs vela romana son el mismo disparo balístico, pero el sonido
     que le corresponde a cada uno es distinto -> evento distinto según isCandle */
  if(FWEV){const ev=isCandle?'candle':'shell';nsafe(()=>FWEV(ev,_fwV3.x,_fwV3.y,_fwV3.z),'fwev');}
  spawnParticle({x:_fwV3.x,y:_fwV3.y,z:_fwV3.z,
    vx:(Math.random()-.5)*1.1,vy:vy0,vz:(Math.random()-.5)*1.1,
    life:6,r:c.r,g:c.g,b:c.b,grav:19.6,drag:.02,psize:1.3,
    shell:true,style:fw.burst,sclr:fw.clr,ssize:isCandle?Math.min(1.2,(fw.size||1)*.55):(fw.size||1)});
}
function spawnFuseSpark(p){
  fwPoint(p,.04,(Math.random()-.5)*.06,(Math.random()-.5)*.06,_fwV3);
  const sp=1+Math.random()*1.4,ang=Math.random()*6.283;
  spawnParticle({x:_fwV3.x,y:_fwV3.y,z:_fwV3.z,
    vx:Math.cos(ang)*sp*.3,vy:sp,vz:Math.sin(ang)*sp*.3,
    life:.16+Math.random()*.22,r:1,g:.72,b:.32,grav:6,drag:1.2,psize:.7});
}
function spawnTrailSpark(p,dir){
  fwPoint(p,.10,0,0,_fwV3);
  spawnParticle({x:_fwV3.x-dir.x*.15,y:_fwV3.y-dir.y*.15,z:_fwV3.z-dir.z*.15,
    vx:-dir.x*1.6+(Math.random()-.5)*.9,vy:-dir.y*1.6+(Math.random()-.5)*.9+.3,vz:-dir.z*1.6+(Math.random()-.5)*.9,
    life:.35+Math.random()*.3,r:1,g:.66+Math.random()*.2,b:.35,grav:1.4,drag:.9,psize:.8});
}
function groundFlash(x,y,z,fw){
  const n=Math.round(46*PMUL),clrArr=fwClrArr(fw&&fw.clr);
  for(let i=0;i<n;i++){const ang=Math.random()*6.283,s=3+Math.random()*5,c=pickColor(clrArr);
    spawnParticle({x,y:y+.05,z,vx:Math.cos(ang)*s,vy:.4+Math.random()*1.6,vz:Math.sin(ang)*s,
      life:.3+Math.random()*.3,r:c.r,g:c.g,b:c.b,grav:9,drag:.7,psize:1.1});}
}

/* ================= encendido por tipo (físico, EXT.post) ================= */
const FWLIT=new Map();   /* prop -> estado {p,fw,k,t,phase,...} */
function stepRocket(st,dt){
  const p=st.p,fw=st.fw;
  if(st.phase==='fuse'){
    st.emitAcc=(st.emitAcc||0)+dt*34;
    while(st.emitAcc>=1){st.emitAcc--;spawnFuseSpark(p);}
    if(st.t>=.8){
      st.t=0;st.phase='fly';freezeProp(p,false);
      if(FWEV){const P=p.body.position;nsafe(()=>FWEV('launch',P.x,P.y,P.z,{k:fw.k}),'fwev');}
    }
    return;
  }
  const fly=Math.max(.15,fw.fly||2.2),ft=Math.min(1,st.t/fly);
  fwUpWorld(p,_fwDirV);
  const v0=14+(fw.size||1)*5.5,spd=v0*(1-ft);
  p.body.wakeUp();
  p.body.velocity.set(
    _fwDirV.x*spd+Math.sin(st.t*7+p.seq)*.6*(1-ft),
    _fwDirV.y*spd,
    _fwDirV.z*spd+Math.cos(st.t*5+p.seq)*.6*(1-ft));
  if(st.k==='missile'){
    st.trailAcc=(st.trailAcc||0)+dt*42;
    while(st.trailAcc>=1){st.trailAcc--;spawnTrailSpark(p,_fwDirV);}
  }
  if(st.t>=fly){
    const P=p.body.position;
    burst(P.x,P.y,P.z,fw);
    FWLIT.delete(p);removeProp(p);
  }
}
function stepMortarCake(st,dt){
  const p=st.p,fw=st.fw;
  st.nextShot=(st.nextShot==null?0:st.nextShot)-dt;
  if(st.shotsLeft>0&&st.nextShot<=0){
    fireShell(p,fw,false);st.shotsLeft--;st.nextShot=.25+Math.random()*.25;
  }
  if(st.shotsLeft<=0)FWLIT.delete(p);
}
function stepCandle(st,dt){
  const p=st.p,fw=st.fw;
  st.nextShot=(st.nextShot==null?0:st.nextShot)-dt;
  if(st.shotsLeft>0&&st.nextShot<=0){
    fireShell(p,fw,true);st.shotsLeft--;st.nextShot=.3+Math.random()*.3;
  }
  if(st.shotsLeft<=0)FWLIT.delete(p);
}
function stepFountain(st,dt){
  const p=st.p,fw=st.fw;
  if(!st.started){
    st.started=true;
    if(FWEV){const P=p.body.position;nsafe(()=>FWEV('fountain0',P.x,P.y,P.z),'fwev');}
  }
  if(st.t>=Math.max(.2,fw.dur||2)){
    if(FWEV){const P=p.body.position;nsafe(()=>FWEV('fountain1',P.x,P.y,P.z),'fwev');}
    FWLIT.delete(p);return;
  }
  const b=buildDef(p.def);
  fwPoint(p,b.size[1]-.03,0,0,_fwV3);
  fwUpWorld(p,_fwDirV);
  st.emitAcc=(st.emitAcc||0)+dt*(70+(fw.size||1)*40)*PMUL;
  while(st.emitAcc>=1){
    st.emitAcc--;
    const ang=Math.random()*6.283,cone=Math.random()*.32,s=3.2+Math.random()*3.6+(fw.size||1),c=pickColor(fw.clr);
    spawnParticle({x:_fwV3.x,y:_fwV3.y,z:_fwV3.z,
      vx:(_fwDirV.x+Math.cos(ang)*cone)*s,vy:_fwDirV.y*s,vz:(_fwDirV.z+Math.sin(ang)*cone)*s,
      life:.55+Math.random()*.5,r:c.r,g:c.g,b:c.b,grav:4.4,drag:.35,psize:.9});
  }
}
function stepWheel(st,dt){
  const p=st.p,fw=st.fw;
  if(!st.started){
    st.started=true;if(p.frozen)freezeProp(p,false);
    st.spin=6+(fw.size||1)*3;
    if(FWEV){const P=p.body.position;nsafe(()=>FWEV('wheel0',P.x,P.y,P.z),'fwev');}
  }
  p.body.wakeUp();
  p.body.velocity.set(0,0,0);
  p.body.angularVelocity.set(0,st.spin,0);
  const b=buildDef(p.def),rad=Math.max(.15,(b.size[0]+b.size[2])/4),h=b.size[1]*.55;
  st.ang=(st.ang||0)+dt*st.spin*2.4;
  fwPoint(p,h,Math.cos(st.ang)*rad,Math.sin(st.ang)*rad,_fwV3);
  st.emitAcc=(st.emitAcc||0)+dt*(70+(fw.size||1)*30)*PMUL;
  while(st.emitAcc>=1){
    st.emitAcc--;
    const ox=Math.cos(st.ang),oz=Math.sin(st.ang),c=pickColor(fw.clr);
    spawnParticle({x:_fwV3.x,y:_fwV3.y,z:_fwV3.z,
      vx:ox*4+(Math.random()-.5)*.6,vy:1+Math.random()*1.2,vz:oz*4+(Math.random()-.5)*.6,
      life:.22+Math.random()*.2,r:c.r,g:c.g,b:c.b,grav:4,drag:.5,psize:.65});
  }
  if(st.t>=Math.max(.3,fw.dur||3)){
    freezeProp(p,true);
    if(FWEV){const P=p.body.position;nsafe(()=>FWEV('wheel1',P.x,P.y,P.z),'fwev');}
    FWLIT.delete(p);
  }
}
const BOMB_FUSE=1.2;
function stepBomb(st,dt){
  const p=st.p,fw=st.fw;
  const b=buildDef(p.def);
  fwPoint(p,b.size[1]-.02,0,0,_fwV3);
  st.emitAcc=(st.emitAcc||0)+dt*26;
  while(st.emitAcc>=1){
    st.emitAcc--;
    const ang=Math.random()*6.283,sp=.8+Math.random()*1.1;
    spawnParticle({x:_fwV3.x,y:_fwV3.y,z:_fwV3.z,
      vx:Math.cos(ang)*sp*.3,vy:sp,vz:Math.sin(ang)*sp*.3,
      life:.15+Math.random()*.2,r:1,g:.7,b:.3,grav:6,drag:1.1,psize:.7});
  }
  if(st.t>=BOMB_FUSE){
    const P=p.body.position;
    boom(new THREE.Vector3(P.x,P.y,P.z),3+(fw.size||1));
    groundFlash(P.x,P.y,P.z,fw);
    /* ADEMAS del boom() de física: el petardo también avisa por FWEV, igual que
       cualquier otro estallido (el boom() no sabe nada de pirotecnia). */
    if(FWEV)nsafe(()=>FWEV('bomb',P.x,P.y,P.z),'fwev');
    FWLIT.delete(p);removeProp(p);
  }
}
function fwStep(dt){
  if(!HASFW||!FWLIT.size)return;
  for(const st of Array.from(FWLIT.values())){
    const p=st.p;
    if(PROPS.indexOf(p)<0){
      /* el prop se borró desde afuera (otro sistema) a mitad de fuente/rueda: sin este
         chequeo el sonido de "empezó" quedaría sin su "terminó" del otro lado. */
      if(FWEV&&st.started&&(st.k==='fountain'||st.k==='wheel')){
        const ev=st.k==='fountain'?'fountain1':'wheel1',P=p.body.position;
        nsafe(()=>FWEV(ev,P.x,P.y,P.z),'fwev');
      }
      FWLIT.delete(p);continue;
    }
    st.t+=dt;
    if(st.k==='rocket'||st.k==='missile')stepRocket(st,dt);
    else if(st.k==='mortar'||st.k==='cake')stepMortarCake(st,dt);
    else if(st.k==='fountain')stepFountain(st,dt);
    else if(st.k==='candle')stepCandle(st,dt);
    else if(st.k==='wheel')stepWheel(st,dt);
    else if(st.k==='bomb')stepBomb(st,dt);
    else FWLIT.delete(p);   /* tipo desconocido: no romper nada, sólo ignorarlo */
  }
}

/* ---------- encender ---------- */
function fwLight(target){
  const p=target||nearFW;
  if(!p||!p.def||!p.def.fw||FWLIT.has(p))return false;
  const fw=p.def.fw;
  if((fw.k==='rocket'||fw.k==='missile')&&!p.frozen)freezeProp(p,true);
  FWLIT.set(p,{p,fw,k:fw.k,t:0,phase:'fuse',shotsLeft:fw.shots||0,nextShot:0});
  /* 'fuse' es el único evento que no depende del tipo: se prende la mecha, listo */
  if(FWEV){const P=p.body.position;nsafe(()=>FWEV('fuse',P.x,P.y,P.z),'fwev');}
  if(nearFW===p)nearFW=null;
  fwBtnPaint();
  return true;
}

/* ---------- botón "Encender", mismo patrón táctil que bSit ---------- */
const bFw=document.createElement('div');
bFw.id='bFw';
bFw.style.cssText='position:absolute;left:50%;bottom:23vmin;transform:translateX(-50%);'
  +'pointer-events:auto;background:rgba(20,24,30,.82);border:1px solid rgba(255,90,40,.6);'
  +'border-radius:12px;padding:10px 18px;color:#fff;font:800 14px system-ui,sans-serif;'
  +'white-space:nowrap;display:none;text-shadow:0 1px 2px #000';
nsafe(()=>{const h=$('hud');if(h)h.appendChild(bFw);},'fwbtn');
function fwBtnPaint(){
  const show=HASFW&&APP==='play'&&nearFW;
  bFw.style.display=show?'':'none';
  if(show)bFw.textContent=(T('fwLight')||'🔥 Encender')+' · '+(nearFW.def.name||'');
}
const fwTap=e=>{e.preventDefault();e.stopPropagation();if(nearFW)fwLight(nearFW);};
bFw.addEventListener('touchstart',fwTap,{passive:false});
bFw.addEventListener('mousedown',fwTap);

/* ---------- cercanía: escanear 4 veces por segundo (igual que seatScan) ---------- */
let nearFW=null,fwScanT=0;
function fwScan(){
  nearFW=null;
  if(!HASFW||APP!=='play'||PL.rag)return;
  let best=2*2;
  const px=plBody.position.x,py=plBody.position.y,pz=plBody.position.z;
  for(const p of PROPS){
    if(!p.def.fw||FWLIT.has(p))continue;
    const b=p.body;
    const dx=b.position.x-px,dy=b.position.y-py,dz=b.position.z-pz;
    const dd=dx*dx+dz*dz;
    if(dd>=best||Math.abs(dy)>2.2)continue;
    best=dd;nearFW=p;
  }
}

/* ---------- enganche al bucle ---------- */
EXT.post.push(dt=>{ if(HASFW)fwStep(dt); });
EXT.frame.push(dt=>{
  if(!HASFW)return;
  fwScanT+=dt;
  if(fwScanT>=.25){fwScanT=0;fwScan();fwBtnPaint();}
  fwParticles(dt);
});

if(DEV&&window.__H)Object.assign(window.__H,{
  fwIds:()=>FWIDS.slice(),
  fwKind:id=>{const d=PDEF[id];return d&&d.fw?d.fw.k:null;},
  fwNear:()=>nearFW?nearFW.id:null,
  fwLight:(idOrSeq)=>{
    if(idOrSeq==null){fwScan();return nearFW?fwLight(nearFW):false;}
    const p=PROPS.find(pp=>pp.seq===idOrSeq)||PROPS.find(pp=>pp.id===idOrSeq&&pp.def.fw&&!FWLIT.has(pp));
    return p?fwLight(p):false;
  },
  fwInfo:()=>({lit:FWLIT.size,
    flying:Array.from(FWLIT.values()).filter(s=>s.phase==='fly').length,
    parts:PARR.length,bursts:BURSTN,
    btn:bFw.style.display!=='none'?bFw.textContent:null}),
  fwBurst:(x,y,z,style)=>{burst(x,y,z,{burst:style||'peony',clr:[0xff5533,0x33ccff],size:1.4});return true;}
});
