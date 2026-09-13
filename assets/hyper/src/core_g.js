/* ============================================================
   SUX SANDBOX — EFECTOS QUE FALTABAN
   ------------------------------------------------------------
   Tres cosas que el pase de QA marcó y que se notan todo el tiempo:
     1) no había FOGONAZO y el trazador salía de la CÁMARA, no del caño: en tercera
        persona (la vista por defecto) nunca se veía salir nada del arma;
     2) la physgun levantaba props sin ningún RAYO que la uniera a lo que agarraba,
        que es justo lo que la hace parecer la physgun de Garry's Mod;
     3) la explosión eran esferas naranjas y nada más: ni humo, ni escombros.
   Todo se engancha por EXT (frame/post) y por los ganchos que dejaron core_b/core_c,
   sin tocar esos archivos.
   ============================================================ */

/* ---------- dónde está la boca del arma, en el mundo ---------- */
const _mzP=new THREE.Vector3(),_mzD=new THREE.Vector3(),_mzQ=new THREE.Quaternion();
function muzzleWorld(outP,outD){
  if(!wModel)return false;
  const g=wModel.userData&&wModel.userData._g;
  wModel.updateWorldMatrix(true,false);
  if(g&&!g.bad){ outP.copy(g.ax1).applyMatrix4(wModel.matrixWorld); }
  else { outP.setFromMatrixPosition(wModel.matrixWorld); }
  wModel.getWorldQuaternion(_mzQ);
  outD.set(0,0,-1).applyQuaternion(_mzQ).normalize();
  return true;
}

/* ---------- 1. fogonazo ----------
   Dos planos cruzados con la textura de la chispa: se ven desde cualquier lado y no
   cuestan nada. Viven 45 ms, que es lo que dura un fogonazo de verdad. */
const FLASH=[];
const flashMat=new THREE.MeshBasicMaterial({color:0xffd98a,transparent:true,opacity:.95,
  fog:false,depthWrite:false,side:THREE.DoubleSide});
const flashGeo=(()=>{
  const a=new THREE.PlaneGeometry(1,1),b=new THREE.PlaneGeometry(1,1);
  b.rotateY(Math.PI/2);
  const g=new THREE.BufferGeometry();
  /* fusionar a mano: dos planos cruzados en una sola geometría */
  const pa=a.attributes.position.array,pb=b.attributes.position.array;
  const pos=new Float32Array(pa.length+pb.length);
  pos.set(pa,0);pos.set(pb,pa.length);
  const ia=Array.from(a.index.array),ib=Array.from(b.index.array).map(i=>i+pa.length/3);
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setIndex(ia.concat(ib));
  return g;
})();
function muzzleFlash(scale){
  if(!muzzleWorld(_mzP,_mzD))return;
  const m=new THREE.Mesh(flashGeo,flashMat);
  m.position.copy(_mzP).addScaledVector(_mzD,.05);
  m.scale.setScalar(.20*(scale||1));
  m.rotation.z=Math.random()*6.28;
  m.renderOrder=8;
  scene.add(m);FLASH.push({m,t:.07});
  /* una luz corta, sólo en calidad alta (en ULD/LOW cuesta un draw call de sombras) */
  if(QP.shadow>0&&!muzzleFlash._l){
    muzzleFlash._l=new THREE.PointLight(0xffc46a,0,6);scene.add(muzzleFlash._l);}
  if(muzzleFlash._l){muzzleFlash._l.position.copy(_mzP);muzzleFlash._l.intensity=7;}
}
/* ---------- 2. rayo de la physgun ---------- */
const beamMat=new THREE.MeshBasicMaterial({color:0x8fd8ff,transparent:true,opacity:.55,
  fog:false,depthWrite:false});
const beamGeo=new THREE.CylinderGeometry(.018,.03,1,6,1,true);
beamGeo.translate(0,.5,0);beamGeo.rotateX(Math.PI/2);
let beam=null,beamGlow=null;
const _bA=new THREE.Vector3(),_bB=new THREE.Vector3();
function beamShow(a,b){
  if(!beam){ beam=new THREE.Mesh(beamGeo,beamMat);beam.renderOrder=7;beam.frustumCulled=false;
    scene.add(beam);
    beamGlow=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),
      new THREE.MeshBasicMaterial({color:0xbde8ff,transparent:true,opacity:.5,fog:false,
        depthWrite:false}));
    beamGlow.renderOrder=7;scene.add(beamGlow);}
  beam.visible=beamGlow.visible=true;
  beam.position.copy(a);beam.lookAt(b);beam.scale.z=Math.max(.01,a.distanceTo(b));
  const w=1+Math.sin(TT*22)*.18;      // late un poco
  beam.scale.x=beam.scale.y=w;
  beamGlow.position.copy(b);beamGlow.scale.setScalar(w);
}
function beamHide(){ if(beam){beam.visible=false;beamGlow.visible=false;} }
/* el prop agarrado lo sabe core_b en `grab`; acá sólo se dibuja */
EXT.frame.push(dt=>{
  const w=weap();
  const g=(typeof grab!=='undefined')?grab:null;
  if(g&&g.body&&(w.kind==='phys'||w.kind==='grav')&&wModel&&muzzleWorld(_bA,_bB)){
    _bB.set(g.body.position.x,g.body.position.y,g.body.position.z);
    beamShow(_bA,_bB);
  } else beamHide();
  /* apagar el fogonazo */
  for(let i=FLASH.length-1;i>=0;i--){const f=FLASH[i];f.t-=Math.min(.05,dt||.016);
    f.m.scale.multiplyScalar(1.06);
    if(f.t<=0){scene.remove(f.m);FLASH.splice(i,1);}}
  if(muzzleFlash._l)muzzleFlash._l.intensity*=.55;
});

/* ---------- 3. humo y escombros de la explosión ---------- */
const SMOKE=[];
const smokeMat=new THREE.MeshBasicMaterial({color:0x6d6a66,transparent:true,opacity:.55,
  fog:true,depthWrite:false});
const smokeGeo=new THREE.SphereGeometry(1,8,6);
function smokePuff(P,R){
  const n=QP.key==='uld'?3:5;
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(smokeGeo,smokeMat.clone());
    m.position.set(P.x+(Math.random()-.5)*R*.45,P.y+Math.random()*R*.28,
                   P.z+(Math.random()-.5)*R*.45);
    m.scale.setScalar(R*(.06+Math.random()*.07));
    m.renderOrder=6;scene.add(m);
    SMOKE.push({m,t:.8+Math.random()*.6,vy:.8+Math.random()*.9,gr:R*.055});
  }
}
EXT.post.push(dt=>{
  for(let i=SMOKE.length-1;i>=0;i--){const s=SMOKE[i];s.t-=dt;
    s.m.position.y+=s.vy*dt;s.m.scale.addScalar(s.gr*dt);
    if(s.m.material)s.m.material.opacity=Math.max(0,Math.min(.26,s.t*.26));
    if(s.t<=0){scene.remove(s.m);if(s.m.material)s.m.material.dispose();SMOKE.splice(i,1);}}
});

/* ---------- enganches: envolver lo que ya existe ----------
   fireGun/shootProj/boom viven en core_b; en vez de editarlos se los envuelve, así este
   archivo se puede sacar sin romper nada. */
const _fireGun=fireGun, _shootProj=shootProj, _boom=boom;
fireGun=function(){
  const before=weap().ammo;
  _fireGun.apply(null,arguments);
  if(weap().ammo<before)muzzleFlash(weap().dmg>60?1.6:(weap().pellets?1.5:1));
};
shootProj=function(){
  const before=weap().ammo;
  _shootProj.apply(null,arguments);
  if(weap().ammo<before)muzzleFlash(1.8);
};
boom=function(P,R){ _boom.apply(null,arguments); try{smokePuff(P,R);}catch(e){} };

/* trazador desde la BOCA del arma (en 3ª persona salía del centro de la cámara) */
const _tracer=tracer;
tracer=function(a,b){
  if(!PL.fp&&wModel&&muzzleWorld(_mzP,_mzD))return _tracer(_mzP.clone(),b);
  return _tracer(a,b);
};

if(DEV&&window.__H)Object.assign(window.__H,{
  /* estado de los efectos nuevos, para medirlos sin mirar */
  fx2:()=>({flash:FLASH.length,smoke:SMOKE.length,
    beam:!!(beam&&beam.visible),
    beamLen:beam&&beam.visible?+beam.scale.z.toFixed(2):0}),
  muzzle:()=>{if(!muzzleWorld(_mzP,_mzD))return null;
    return{p:[+_mzP.x.toFixed(3),+_mzP.y.toFixed(3),+_mzP.z.toFixed(3)],
           d:[+_mzD.x.toFixed(3),+_mzD.y.toFixed(3),+_mzD.z.toFixed(3)]};}});
