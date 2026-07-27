/* ============================================================
   SUX SANDBOX — jugador, armas, herramientas, HUD y menús
   ============================================================ */

/* ================= API de extensión =================
   Los módulos que se concatenan después (core_d, core_e, …) se enganchan acá.
   EXT.pre  : fn(dt)->true  corta el control normal del jugador (ej. manejando)
   EXT.post : fn(dt)        después de la física de cada frame
   EXT.frame: fn(dt)        siempre (incluso en pausa)
   EXT.cam  : fn(dt)->true  reemplaza la cámara
   EXT.hud  : fn()          al construir la UI */
const EXT={pre:[],post:[],frame:[],cam:[],spawn:[],hud:[]};
const extRun=(k,dt)=>{let stop=false;for(const f of EXT[k]){try{if(f(dt))stop=true;}catch(e){}}return stop;};

/* ================= jugador ================= */
const PL={h:1.8,r:.4,spd:6.4,run:10.2,jump:8.6,yaw:0,pitch:0,fp:false,hp:100,rag:false,noclip:false};
const plBody=new CANNON.Body({mass:78,material:MAT.player,linearDamping:0,angularDamping:1,
  fixedRotation:true,allowSleep:false,collisionFilterGroup:2,collisionFilterMask:1});
plBody.addShape(new CANNON.Sphere(PL.r),new CANNON.Vec3(0,PL.r,0));
plBody.addShape(new CANNON.Sphere(PL.r),new CANNON.Vec3(0,PL.h-PL.r-.06,0));
plBody.updateMassProperties();
plBody.position.set(0,1.2,20);
world.addBody(plBody);
let grounded=false,coyote=0,inWater=false;

/* modelo del personaje (GLB generado) */
let charRoot=null,mixer=null,walkAct=null,bones={},handGrip=null,chestAnchor=null,charH=1.8,charK=1;
const CLIPS={},ACTS={};let animState='';
const GL=new GLTFLoader();
let glbPend=0,glbDone=0;
const MODELS={};
function loadGLB(key,file,cb){
  if(!okUrl(BASE))return;
  glbPend++;
  GL.load(BASE+file,g=>{glbDone++;sanGlb(g);MODELS[key]=g;if(cb)cb(g);
      paintLoad((texDone+glbDone)/Math.max(1,texPend+glbPend));},
    undefined,()=>{glbDone++;});
}
function fitModel(obj,target,mode){
  const box=new THREE.Box3().setFromObject(obj);
  const sz=new THREE.Vector3();box.getSize(sz);
  const ref=mode==='max'?Math.max(sz.x,sz.y,sz.z):sz.y;
  const k=target/Math.max(.001,ref);
  obj.scale.multiplyScalar(k);
  return {k,size:sz.clone().multiplyScalar(k),box,long:(sz.x>=sz.z?'x':'z')};
}
function setupChar(g){
  charRoot=g.scene||g.scenes[0];
  charRoot.traverse(o=>{
    if(o.isMesh||o.isSkinnedMesh){o.castShadow=QP.shadow>0;o.frustumCulled=false;
      if(QP.phong&&o.material&&o.material.isMeshStandardMaterial){
        const m=o.material;
        o.material=new THREE.MeshPhongMaterial({map:m.map,color:m.color,skinning:true,
          shininess:14,specular:new THREE.Color(0x1c1f23)});}}
    if(o.isBone){ const n=o.name.toLowerCase();
      if(/hand/.test(n)&&/(right|_r$|\.r$|r_)/.test(n))bones.rHand=bones.rHand||o;
      if(/hand/.test(n)&&/(left|_l$|\.l$|l_)/.test(n))bones.lHand=bones.lHand||o;
      if(/(upperarm|arm|shoulder)/.test(n)&&/(right|_r$|\.r$|r_)/.test(n)&&!/fore|hand/.test(n))bones.rArm=bones.rArm||o;
      if(/(upperarm|arm|shoulder)/.test(n)&&/(left|_l$|\.l$|l_)/.test(n)&&!/fore|hand/.test(n))bones.lArm=bones.lArm||o;
      if(/fore/.test(n)&&/(right|_r$|\.r$|r_)/.test(n))bones.rFore=bones.rFore||o;
      if(/fore/.test(n)&&/(left|_l$|\.l$|l_)/.test(n))bones.lFore=bones.lFore||o;
      if(/(spine|chest|torso)/.test(n))bones.spine=bones.spine||o;
      if(/head/.test(n))bones.head=bones.head||o;
    }});
  const f=fitModel(charRoot,PL.h);charH=PL.h;charK=f.k;
  charRoot.position.y=-9999;
  scene.add(charRoot);
  if(g.animations&&g.animations.length){
    mixer=new THREE.AnimationMixer(charRoot);
    CLIPS.walk=g.animations[0];
    buildActions();
    walkAct=ACTS.walk;
    if(walkAct){walkAct.play();walkAct.timeScale=1;animState='walk';}
    // los brazos quedan en la pose de agarre: guardamos su pose de bind para re-imponerla
    for(const k of ['rArm','lArm','rFore','lFore'])
      if(bones[k])bones[k].userData.bind=bones[k].quaternion.clone();
  }
  // ancla fija del arma: a la derecha del pecho, apuntando adelante (el personaje mira a +Z local)
  chestAnchor=new THREE.Group();
  charRoot.add(chestAnchor);
  chestAnchor.position.set(.2,1.3,-.34);   // charRoot está rotado 180°, adelante es -Z local
  chestAnchor.rotation.y=Math.PI;
  handGrip=chestAnchor;
}

/* pose de brazos: ángulos (grados) que se suman al bind del rig para sostener el arma */
/* ángulos hallados midiendo la posición del hueso de la mano (búsqueda numérica):
   la derecha va a la empuñadura y la izquierda al caño */
const ARM={rArm:[0,0,-46],rFore:[0,0,126],lArm:[0,0,103],lFore:[0,0,-103]};
/* la malla dibuja las manos ~18 cm más abajo que el hueso (el skin las arrastra):
   este ajuste, medido a ojo contra capturas, pone el arma EN las manos */
const GDLT=[.02,-.06,.12];   // corrimiento del arma dentro de la palma (en metros)
const _ae=new THREE.Euler(),_aq=new THREE.Quaternion();
function poseArms(w){
  for(const k of ['rArm','lArm','rFore','lFore']){
    const b=bones[k];if(!b||!b.userData.bind)continue;
    const a=ARM[k];
    _ae.set(a[0]*D2R,a[1]*D2R,a[2]*D2R,'XYZ');_aq.setFromEuler(_ae);
    b.quaternion.copy(b.userData.bind).multiply(_aq);
  }
}

/* los rayos sólo ven el grupo 1 (mundo y props): NUNCA al propio jugador */
const RAY={skipBackfaces:true,collisionFilterMask:1};

/* las otras animaciones (idle, correr, saltar) llegan en GLBs aparte: sólo usamos el CLIP,
   el esqueleto es el mismo así que se reproducen sobre el personaje texturizado */
function addClip(name,g){
  if(g&&g.animations&&g.animations.length){CLIPS[name]=g.animations[0];buildActions();}
}
/* ================= armas ================= */
const WEAP=[
 {id:'physgun', name:'PhysicsGun', kind:'phys',  glb:'physgun', len:.46,
  mdir:'x+', roll:0, hold:[.010,-.070,.056], lg:.17},
 {id:'gravgun', name:'GravityGun', kind:'grav',  glb:'physgun', len:.44, tint:0xffc24d,
  mdir:'x+', roll:0, hold:[.010,-.070,.056], lg:.17},
 {id:'toolgun', name:'ToolBaton',  kind:'tool',  glb:'toolgun', len:.34,
  mdir:'x+', roll:0, hold:[.010,-.066,.048], lg:.085},
 {id:'hands',   name:'Hands',      kind:'melee', dmg:14,rof:.34,reach:2.2,imp:10,
  hold:[0,-.010,.020], lg:0, noModel:1},   // los puños ya son parte del personaje
 {id:'bat',     name:'Bat',        kind:'melee', dmg:38,rof:.5, reach:2.7,imp:26,glb:'bat',len:.86,
  mdir:'x+', roll:0, hold:[.010,-.070,.054], lg:.09},
 {id:'pistol',  name:'Pistol',     kind:'gun',   dmg:20,rof:.17,mag:17,imp:9, spread:.006,glb:'pistol',len:.22,
  mdir:'x+', roll:0, hold:[.010,-.064,.046], lg:.045},
 {id:'revolver',name:'Revolver',   kind:'gun',   dmg:48,rof:.5, mag:6, imp:24,spread:.005,glb:'revolver',len:.33,
  mdir:'x+', roll:0, hold:[.010,-.065,.048], lg:.055},
 {id:'smg',     name:'Smg',        kind:'gun',   dmg:14,rof:.075,mag:30,imp:7, spread:.016,auto:1,glb:'smg',len:.52,
  mdir:'x+', roll:0, hold:[0,-.02,.01], lg:.21},
 {id:'akm',     name:'Akm',        kind:'gun',   dmg:24,rof:.1, mag:30,imp:12,spread:.012,auto:1,glb:'akm',len:.88,
  mdir:'x+', roll:0, hold:[.012,-.072,.062], lg:.20},
 {id:'shotgun', name:'Shotgun',    kind:'gun',   dmg:11,rof:.75,mag:6, imp:6, spread:.055,pellets:8,glb:'shotgun',len:.95,
  mdir:'x+', roll:0, hold:[.012,-.072,.062], lg:.22},
 {id:'sniper',  name:'Sniper',     kind:'gun',   dmg:90,rof:1.15,mag:5,imp:44,spread:.001,zoom:3,glb:'sniper',len:1.24,
  mdir:'x+', roll:0, hold:[.012,-.074,.066], lg:.18},
 {id:'crossbow',name:'Crossbow',   kind:'proj',  dmg:75,rof:1.2,mag:1, imp:28,proj:'bolt',glb:'crossbow',len:.78,
  mdir:'x+', roll:0, hold:[.012,-.071,.060], lg:.19},
 {id:'rpg',     name:'RPG',        kind:'proj',  dmg:130,rof:1.9,mag:1,imp:0, proj:'rocket',blast:8,glb:'rpg',len:1.15,
  mdir:'x+', roll:0, hold:[.020,-.038,.058], lg:.22},
 {id:'camera',  name:'Camera',     kind:'cam', len:.16,
  mdir:'z+', roll:0, hold:[.010,-.060,.044], lg:.05}];
const WIX={};WEAP.forEach((w,i)=>{WIX[w.id]=i;w.ammo=w.mag||0;});
let wIdx=0;
const weap=()=>WEAP[wIdx];
let wModel=null,vmGroup=new THREE.Group(),fireT=0,reloadT=0,recoil=0,zoomOn=false;
camera.add(vmGroup);scene.add(camera);
function equip(i){
  wIdx=(i+WEAP.length)%WEAP.length;
  const w=weap();
  if(wModel){wModel.parent&&wModel.parent.remove(wModel);wModel=null;}
  const g=w.glb&&MODELS[w.glb];
  if(w.noModel){
    /* con los puños no se dibuja nada en la mano: antes se metía un cubo de tela de medio
       metro (se veía como un ladrillo negro colgando del brazo) */
    wModel=null;
  } else if(g){
    wModel=g.scene.clone(true);
    wModel.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;
      if(w.tint&&o.material){o.material=o.material.clone();o.material.color=new THREE.Color(w.tint);}
      if(QP.phong&&o.material&&o.material.isMeshStandardMaterial){const m=o.material;
        o.material=new THREE.MeshPhongMaterial({map:m.map,color:m.color,shininess:34,
          specular:new THREE.Color(0x2a2f36)});}}});
    wModel=rigWeapon(wModel,w);
  } else {
    wModel=rigWeapon(procWeapon(w),w);
  }
  attachWeapon();
  syncSlot();zoomOn=false;camera.fov=72;camera.updateProjectionMatrix();
}
function procWeapon(w){ /* respaldo si el GLB no cargó: arma de primitivas */
  const g=new THREE.Group();
  const add=(sx,sy,sz,x,y,z,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
    m.position.set(x,y,z);g.add(m);return m;};
  const dark=PMAT.rubber,steel=PMAT.steel;
  if(w.kind==='melee'&&w.id==='hands'){ add(.1,.1,.16,0,0,0,PMAT.fabric); return g; }
  add(.06,.09,.42,0,0,.06,steel);           // cuerpo
  add(.045,.11,.07,0,-.09,-.06,dark);       // grip
  add(.035,.035,.3,0,.02,.3,steel);         // caño
  return g;
}
/* el modelo generado viene de una foto de perfil: el caño mira a +X.
   Lo metemos en un grupo, lo apuntamos a -Z (adelante) y le ponemos el pivote en la empuñadura. */
function muzzleDir(m){
  /* De qué lado está el CAÑÓN. La señal fuerte no es el grosor (la culata de madera del AK
     es más fina que el cajón), sino que la EMPUÑADURA Y EL CARGADOR CUELGAN HACIA ABAJO y
     están siempre del lado de la culata: el caño es el lado opuesto.
     Devuelve 'x+','x-','z+' o 'z-'. */
  m.updateWorldMatrix(true,true);
  const P=[];
  m.traverse(o=>{ if(o.isMesh&&o.geometry&&o.geometry.attributes.position){
    const pa=o.geometry.attributes.position,st=Math.max(1,Math.floor(pa.count/900));
    for(let i=0;i<pa.count;i+=st){
      P.push(new THREE.Vector3().fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld)); } }});
  if(!P.length)return 'x+';
  const bb=new THREE.Box3().setFromPoints(P),ctr=new THREE.Vector3(),sz=new THREE.Vector3();
  bb.getCenter(ctr);bb.getSize(sz);
  const ax=sz.x>=sz.z?'x':'z', pe=ax==='x'?'z':'x', L=sz[ax];
  /* 1) lado de la empuñadura: promedio del eje largo en el 22% más BAJO del modelo */
  const ys=P.map(v=>v.y).sort((a,b)=>a-b);
  const yCut=ys[Math.floor(ys.length*.22)];
  let sg=0,ng=0;
  for(const v of P)if(v.y<=yCut){sg+=v[ax]-ctr[ax];ng++;}
  const tGrip=ng?sg/ng:0;
  if(Math.abs(tGrip)>L*.045)                    // hay grip/cargador claro de un lado
    return ax+(tGrip<0?'+':'-');                // el caño va al lado OPUESTO al grip
  /* 2) sin grip (bate, caño simétrico): la punta más fina */
  let sa=0,na=0,sb=0,nb=0;
  for(const v of P){
    const t=v[ax]-ctr[ax], r=Math.abs(v[pe]-ctr[pe])+Math.abs(v.y-ctr.y);
    if(t>L*.18){sa+=r;na++;} else if(t<-L*.18){sb+=r;nb++;}
  }
  const ra=na?sa/na:1, rb=nb?sb/nb:1;
  return ax+(ra<=rb?'+':'-');
}
function rigWeapon(m,w){
  const L=w.len||.5;
  fitModel(m,L,'max');
  const box=new THREE.Box3().setFromObject(m),ctr=new THREE.Vector3(),sz=new THREE.Vector3();
  box.getCenter(ctr);box.getSize(sz);
  m.position.sub(ctr);                     // centrado en el origen
  const dir=w.mdir||muzzleDir(m);
  const inner=new THREE.Group();inner.add(m);
  inner.rotation.y={'x+':-Math.PI/2,'x-':Math.PI/2,'z+':Math.PI,'z-':0}[dir]||0;
  /* ¿está boca arriba o de costado? La empuñadura y el cargador pesan hacia ABAJO:
     si el centroide queda por encima del centro de la caja, el arma está girada sobre su
     propio caño. Probamos los 4 giros de 90° y elegimos el que baja más el centroide. */
  /* los puntos se toman en el espacio de inner SIN su giro en Y (el giro lo prueba el bucle de
     abajo). ANTES se usaba la geometría CRUDA, sin la matriz de cada malla: con un arma armada de
     varias piezas (las procedurales de procWeapon, o cualquier GLB con el grip en una malla
     aparte) todas las piezas quedaban superpuestas en el origen, el medidor veía un bloque
     simétrico y elegía roll=-90°: el arma salía ACOSTADA como una tabla. */
  const _ry=inner.rotation.y;inner.rotation.y=0;inner.updateMatrixWorld(true);
  const pts=[];
  inner.traverse(o=>{ if(o.isMesh&&o.geometry&&o.geometry.attributes.position){
    o.updateWorldMatrix(true,false);
    const pa=o.geometry.attributes.position,st=Math.max(1,Math.floor(pa.count/700));
    for(let i=0;i<pa.count;i+=st)
      pts.push(new THREE.Vector3().fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld));}});
  inner.rotation.y=_ry;inner.updateMatrixWorld(true);
  if(pts.length){
    const mm=new THREE.Matrix4();let best=null;
    for(const rz of [0,Math.PI/2,Math.PI,-Math.PI/2]){
      mm.makeRotationZ(rz).multiply(new THREE.Matrix4().makeRotationY(inner.rotation.y));
      const ys=[];
      for(const q of pts)ys.push(q.clone().applyMatrix4(mm).y);
      ys.sort((a,b)=>a-b);
      const med=ys[Math.floor(ys.length/2)],mn=ys[0],mx=ys[ys.length-1];
      /* la empuñadura y el cargador hacen que el volumen sobresalga MUCHO más de un lado
         de la línea del caño (la mediana). Ese lado tiene que quedar ABAJO. */
      const score=(mx-med)-(med-mn);
      if(!best||score<best.score)best={rz,score:+score.toFixed(4)};
    }
    inner.rotation.z=(w.roll!=null)?w.roll*D2R:best.rz;
    m.userData.roll=inner.rotation.z;
  }
  const rig=new THREE.Group();rig.add(inner);
  inner.position.set(0,sz.y*.26,L*.22);    // la empuñadura queda en el origen
  rig.userData.len=L;rig.userData.dir=dir;
  rig.userData.roll=+(m.userData.roll||0).toFixed(2);
  return rig;
}
function attachWeapon(){
  if(!wModel)return;
  const L=(wModel.userData&&wModel.userData.len)||.5;
  if(bones.rHand||bones.rFore){ (bones.rHand||bones.rFore).add(wModel);
    wModel.position.set(0,0,0);wModel.rotation.set(0,0,0);
    holdWeapon(); }
  else if(PL.fp){ vmGroup.add(wModel);      // respaldo: rig sin huesos de mano
    wModel.scale.setScalar(.66);
    wModel.position.set(.19,-.19,-.30-L*.26);wModel.rotation.set(.02,-.05,0); }
  else if(chestAnchor){ chestAnchor.add(wModel);
    wModel.scale.setScalar(1/(charK||1));wModel.position.set(0,0,0);wModel.rotation.set(0,0,0); }
}
function syncSlot(){
  const w=weap();
  $('wslot').querySelector('span').textContent=w.name;
  $('wslot').querySelector('b').textContent=w.mag?(w.ammo+' | ∞'):'';
  const cv=$('wslot').querySelector('canvas');
  if(wModel&&cv){ try{ drawObjThumb(wModel,cv); }catch(e){} }
  else if(cv)cv.getContext('2d').clearRect(0,0,cv.width,cv.height);
}
function drawObjThumb(obj,cv){
  const clone=obj.clone(true);clone.position.set(0,0,0);clone.rotation.set(0,0,0);clone.scale.set(1,1,1);
  const box=new THREE.Box3().setFromObject(clone),sz=new THREE.Vector3();box.getSize(sz);
  const ctr=new THREE.Vector3();box.getCenter(ctr);clone.position.sub(ctr);
  const k=1/Math.max(.001,Math.max(sz.x,sz.y,sz.z));clone.scale.setScalar(k);
  thumbScene.add(clone);
  thumbCam.aspect=1.6;thumbCam.updateProjectionMatrix();
  thumbCam.position.set(1.5,1.1,1.9);thumbCam.lookAt(0,0,0);
  const rt=thumbTarget(),old=renderer.getRenderTarget();
  renderer.setRenderTarget(rt);renderer.setClearColor(0x000000,0);renderer.clear();
  renderer.render(thumbScene,thumbCam);
  const px=new Uint8Array(128*96*4);
  renderer.readRenderTargetPixels(rt,0,0,128,96,px);
  renderer.setRenderTarget(old);thumbScene.remove(clone);
  const ctx=cv.getContext('2d');cv.width=128;cv.height=96;
  const img=ctx.createImageData(128,96);
  for(let y=0;y<96;y++){const s=(95-y)*128*4,d0=y*128*4;
    for(let x=0;x<128*4;x++)img.data[d0+x]=px[s+x];}
  ctx.putImageData(img,0,0);
}

/* ---- disparo ---- */
/* ---- sonido: todo sintetizado con WebAudio (no descarga nada) ---- */
let AC=null,MG=null;
function ac(){ if(AC)return AC;
  try{AC=new (window.AudioContext||window.webkitAudioContext)();
    MG=AC.createGain();MG.gain.value=.5;MG.connect(AC.destination);}catch(e){AC=null;}
  return AC;}
addEventListener('touchstart',()=>{const a=ac();if(a&&a.state==='suspended')a.resume();},{once:true});
addEventListener('mousedown',()=>{const a=ac();if(a&&a.state==='suspended')a.resume();},{once:true});
function noise(dur,cut,gain,type){
  const a=ac();if(!a)return;
  const n=Math.max(1,Math.floor(a.sampleRate*dur)),buf=a.createBuffer(1,n,a.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2);
  const src=a.createBufferSource();src.buffer=buf;
  const f=a.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=cut;
  const g=a.createGain();g.gain.value=gain;
  src.connect(f);f.connect(g);g.connect(MG);src.start();
}
function beep(f0,f1,dur,gain,type){
  const a=ac();if(!a)return;
  const o=a.createOscillator(),g=a.createGain();
  o.type=type||'square';o.frequency.setValueAtTime(f0,a.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),a.currentTime+dur);
  g.gain.setValueAtTime(gain,a.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dur);
  o.connect(g);g.connect(MG);o.start();o.stop(a.currentTime+dur+.02);
}
const SFX={
  shot:k=>{noise(.14,2600+k*400,.5,'highpass');beep(220-k*20,60,.09,.22,'sawtooth');},
  boom:()=>{noise(.7,320,.9);beep(90,28,.55,.5,'sine');},
  melee:()=>{noise(.09,900,.4);},
  grab:()=>{beep(320,760,.1,.14,'sine');},
  drop:()=>{beep(700,240,.09,.12,'sine');},
  tool:()=>{beep(880,1400,.07,.12,'square');},
  freeze:()=>{beep(1200,300,.16,.13,'triangle');},
  hurt:()=>{noise(.2,500,.5);beep(160,70,.2,.2,'sawtooth');},
  reload:()=>{beep(240,180,.06,.1,'square');setTimeout(()=>beep(300,200,.06,.1,'square'),110);},
  ui:()=>{beep(600,900,.05,.08,'square');}};

const rayFrom=new CANNON.Vec3(),rayTo=new CANNON.Vec3(),rr=new CANNON.RaycastResult();
const _dir=new THREE.Vector3(),_o=new THREE.Vector3();
function camDir(out){ camera.getWorldDirection(out);return out; }
function aimRay(len,spread){
  camDir(_dir);
  if(spread){_dir.x+=(Math.random()*2-1)*spread;_dir.y+=(Math.random()*2-1)*spread;
    _dir.z+=(Math.random()*2-1)*spread;_dir.normalize();}
  _o.copy(camera.position);
  rayFrom.set(_o.x,_o.y,_o.z);
  rayTo.set(_o.x+_dir.x*len,_o.y+_dir.y*len,_o.z+_dir.z*len);
  rr.reset();
  world.raycastClosest(rayFrom,rayTo,RAY,rr);
  return rr.hasHit?{p:rr.hitPointWorld,n:rr.hitNormalWorld,body:rr.body,
    prop:rr.body&&rr.body.userData&&rr.body.userData.prop,d:_o.distanceTo(
      new THREE.Vector3(rr.hitPointWorld.x,rr.hitPointWorld.y,rr.hitPointWorld.z))}:null;
}
const TRACERS=[],SPARKS=[],PROJ=[];
const tracerGeo=new THREE.CylinderGeometry(.012,.012,1,5);
tracerGeo.translate(0,.5,0);tracerGeo.rotateX(Math.PI/2);
const tracerMat=new THREE.MeshBasicMaterial({color:0xfff0b0,transparent:true,opacity:.85,fog:false});
function tracer(a,b){
  const m=new THREE.Mesh(tracerGeo,tracerMat);
  m.position.copy(a);m.lookAt(b);m.scale.z=a.distanceTo(b);
  scene.add(m);TRACERS.push({m,t:.07});
}
const sparkMat=new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,fog:false});
const sparkGeo=new THREE.SphereGeometry(.09,6,5);
function spark(p,s){
  const m=new THREE.Mesh(sparkGeo,sparkMat);m.position.copy(p);m.scale.setScalar(s||1);
  scene.add(m);SPARKS.push({m,t:.14});
}
function fireGun(){
  const w=weap();
  if(w.ammo<=0){reload();return;}
  w.ammo--;fireT=w.rof;recoil=Math.min(.09,.02+w.dmg*.0007);SFX.shot(w.pellets?2:(w.dmg>60?1:0));
  const n=w.pellets||1;
  for(let i=0;i<n;i++){
    const h=aimRay(220,(w.spread||0)*(zoomOn?.35:1));
    const from=camera.position.clone().add(camDir(_dir).clone().multiplyScalar(.6));
    if(h){ const hp=new THREE.Vector3(h.p.x,h.p.y,h.p.z);
      tracer(from,hp);spark(hp,w.dmg>60?1.5:1);
      if(h.prop)hitProp(h.prop,hp,camDir(_dir),w.imp||8,w.dmg);
    } else tracer(from,from.clone().add(camDir(_dir).clone().multiplyScalar(120)));
  }
  syncSlot();
  if(w.ammo<=0)reload();
}
function reload(){
  const w=weap();if(!w.mag||w.ammo===w.mag||reloadT>0)return;
  reloadT=w.id==='shotgun'?1.1:(w.id==='sniper'?1.5:1);SFX.reload();
  setTimeout(()=>{w.ammo=w.mag;syncSlot();},reloadT*1000);
}
function melee(){
  const w=weap();fireT=w.rof;recoil=.05;SFX.melee();
  const h=aimRay(w.reach||2.4,0);
  if(h&&h.prop)hitProp(h.prop,new THREE.Vector3(h.p.x,h.p.y,h.p.z),camDir(_dir),w.imp||14,w.dmg);
}
function hitProp(p,point,dir,imp,dmg){
  if(p.frozen){freezeProp(p,false);}
  p.manual=true;
  p.body.wakeUp();                       // despertar PRIMERO o el impulso se descarta
  const rel=new CANNON.Vec3(point.x-p.body.position.x,point.y-p.body.position.y,
                            point.z-p.body.position.z);
  const k=Math.max(2.5,imp*p.mass*.09);
  p.body.applyImpulse(new CANNON.Vec3(dir.x*k,dir.y*k+k*.14,dir.z*k),rel);
  p.hp=(p.hp==null?100:p.hp)-(dmg||0);
  if(isBoom(p)&&p.hp<=40)explode(p);
}
const isBoom=p=>/explos|tnt|dynam|mine|firework|gas|barrel_ex|fuel/.test(p.id);
function explode(p,force){
  const c=p?p.body.position.clone():null;
  const P=c?new THREE.Vector3(c.x,c.y,c.z):null;
  if(!P)return;
  const R=force||7.5;
  for(const q of PROPS){
    if(q===p)continue;
    const d=new THREE.Vector3(q.body.position.x,q.body.position.y,q.body.position.z).sub(P);
    const L=d.length();if(L>R*2)continue;
    if(q.frozen)freezeProp(q,false);
    q.manual=true;q.body.wakeUp();
    const f=(1-Math.min(1,L/(R*2)))*R*26*Math.max(1,q.mass*.06);
    d.normalize();
    q.body.applyImpulse(new CANNON.Vec3(d.x*f,Math.abs(d.y)*f*.5+f*.55,d.z*f),new CANNON.Vec3(0,0,0));
    if(isBoom(q)&&L<R)setTimeout(()=>{if(PROPS.indexOf(q)>=0)explode(q);},90+Math.random()*160);
  }
  const dp=new THREE.Vector3(plBody.position.x,plBody.position.y,plBody.position.z).sub(P);
  const dl=dp.length();
  if(dl<R*1.6){ dp.normalize();
    plBody.velocity.x+=dp.x*R*1.4;plBody.velocity.y+=Math.abs(dp.y)*R*.6+R*.7;
    plBody.velocity.z+=dp.z*R*1.4;
    hurt(Math.round((1-dl/(R*1.6))*55)); }
  boom(P,R);
  if(p)removeProp(p);
}
const boomMat=new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,fog:false});
function boom(P,R){
  SFX.boom();
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),boomMat.clone());
  m.position.copy(P);m.scale.setScalar(R*.4);scene.add(m);
  SPARKS.push({m,t:.36,grow:R*2.6,fade:true});
}
function shootProj(){
  const w=weap();
  if(w.ammo<=0){reload();return;}
  w.ammo--;fireT=w.rof;recoil=w.proj==='rocket'?.11:.05;SFX.shot(1);
  const dir=camDir(_dir).clone();
  const pos=camera.position.clone().add(dir.clone().multiplyScalar(.8));
  const rocket=w.proj==='rocket';
  const g=rocket?new THREE.CylinderGeometry(.08,.08,.6,7):new THREE.CylinderGeometry(.03,.03,.7,5);
  g.rotateX(Math.PI/2);
  const m=new THREE.Mesh(g,rocket?PMAT.paint:PMAT.wood);
  m.position.copy(pos);m.lookAt(pos.clone().add(dir));scene.add(m);
  PROJ.push({m,v:dir.multiplyScalar(rocket?42:60),t:5,rocket,dmg:w.dmg,imp:w.imp,blast:w.blast});
  syncSlot();
  if(w.ammo<=0)reload();
}
function stepProj(dt){
  for(let i=PROJ.length-1;i>=0;i--){ const p=PROJ[i];
    const step=p.v.clone().multiplyScalar(dt);
    const from=p.m.position.clone(),to=from.clone().add(step);
    rayFrom.set(from.x,from.y,from.z);rayTo.set(to.x,to.y,to.z);rr.reset();
    world.raycastClosest(rayFrom,rayTo,RAY,rr);
    p.v.y-=(p.rocket?4:14)*dt;
    p.m.position.copy(to);p.m.lookAt(to.clone().add(p.v));
    p.t-=dt;
    let hit=rr.hasHit;
    if(hit){
      const P=new THREE.Vector3(rr.hitPointWorld.x,rr.hitPointWorld.y,rr.hitPointWorld.z);
      const pr=rr.body&&rr.body.userData&&rr.body.userData.prop;
      if(p.blast){ boom(P,p.blast);
        const fake={body:{position:{x:P.x,y:P.y,z:P.z,clone(){return new THREE.Vector3(P.x,P.y,P.z);}}},id:''};
        blastAt(P,p.blast);
      } else if(pr){ hitProp(pr,P,p.v.clone().normalize(),p.imp,p.dmg);spark(P,1.2); }
      else spark(P,1);
      scene.remove(p.m);PROJ.splice(i,1);continue;
    }
    if(p.t<=0){scene.remove(p.m);PROJ.splice(i,1);}
  }
}
function blastAt(P,R){
  for(const q of PROPS){
    const d=new THREE.Vector3(q.body.position.x,q.body.position.y,q.body.position.z).sub(P);
    const L=d.length();if(L>R*2)continue;
    if(q.frozen)freezeProp(q,false);
    q.manual=true;q.body.wakeUp();
    const f=(1-Math.min(1,L/(R*2)))*R*24*Math.max(1,q.mass*.06);d.normalize();
    q.body.applyImpulse(new CANNON.Vec3(d.x*f,Math.abs(d.y)*f*.5+f*.6,d.z*f),new CANNON.Vec3(0,0,0));
    if(isBoom(q)&&L<R*1.2)setTimeout(()=>{if(PROPS.indexOf(q)>=0)explode(q);},80+Math.random()*140);
  }
  const dp=new THREE.Vector3(plBody.position.x,plBody.position.y,plBody.position.z).sub(P);
  const dl=dp.length();
  if(dl<R*1.5){dp.normalize();
    plBody.velocity.x+=dp.x*R*1.3;plBody.velocity.y+=R*.8;plBody.velocity.z+=dp.z*R*1.3;
    hurt(Math.round((1-dl/(R*1.5))*50));}
}

/* ---- physgun / gravity gun ---- */
let grab=null,grabDist=6,rotMode=false;
function grabStart(){
  const h=aimRay(60,0);
  if(!h||!h.prop){toast(T('tNo'));return;}
  grab=h.prop;grabDist=clamp(h.d,1.6,22);SFX.grab();
  if(grab.frozen)freezeProp(grab,false);
  grab.manual=true;grab.body.wakeUp();
}
function grabEnd(){ if(grab){SFX.drop();grab.body.angularVelocity.scale(.4,grab.body.angularVelocity);} grab=null; }
function grabStep(dt){
  if(!grab)return;
  camDir(_dir);
  const tx=camera.position.x+_dir.x*grabDist,ty=camera.position.y+_dir.y*grabDist,
        tz=camera.position.z+_dir.z*grabDist;
  const b=grab.body,k=12;
  b.velocity.x=(tx-b.position.x)*k;b.velocity.y=(ty-b.position.y)*k;b.velocity.z=(tz-b.position.z)*k;
  const vm=Math.hypot(b.velocity.x,b.velocity.y,b.velocity.z);
  if(vm>38){const s=38/vm;b.velocity.x*=s;b.velocity.y*=s;b.velocity.z*=s;}
  b.wakeUp();
  if(rotMode)b.angularVelocity.set(rotV.y,rotV.x,0);
  else b.angularVelocity.scale(.5,b.angularVelocity);
}
const rotV={x:0,y:0};
function gravPunt(){
  const h=aimRay(30,0);
  if(!h||!h.prop)return;
  const p=h.prop;if(p.frozen)freezeProp(p,false);
  p.manual=true;
  camDir(_dir);
  const f=Math.min(2400,p.mass*34);
  p.body.wakeUp();
  p.body.applyImpulse(new CANNON.Vec3(_dir.x*f,_dir.y*f+f*.15,_dir.z*f),new CANNON.Vec3(0,0,0));spark(new THREE.Vector3(h.p.x,h.p.y,h.p.z),1.4);
}

/* ---- toolgun ---- */
const TOOLS=['physgun','weld','remove','dup','balloon','thruster','freeze','unfreeze'];
let toolIdx=1,weldA=null;
const THRUST=[];
function useTool(){
  const t=TOOLS[toolIdx];SFX.tool();
  const h=aimRay(60,0);
  const p=h&&h.prop;
  if(t==='weld'){
    if(!p){toast(T('tNo'));return;}
    if(!weldA){weldA=p;toast('🔗 1/2');return;}
    if(weldA===p){weldA=null;return;}
    const c=new CANNON.LockConstraint(weldA.body,p.body);
    world.addConstraint(c);CONSTR.push({c,a:weldA,b:p});
    weldA.body.wakeUp();p.body.wakeUp();weldA=null;toast('🔗 2/2');return; }
  if(t==='remove'){ if(p){removeProp(p);toast(T('tRemoved'));}else toast(T('tNo'));return; }
  if(t==='dup'){ if(!p){toast(T('tNo'));return;}
    const q=new CANNON.Quaternion().copy(p.body.quaternion);
    spawnProp(p.id,{x:p.body.position.x+1.2,y:p.body.position.y+1.4,z:p.body.position.z},q,{raw:true});
    return; }
  if(t==='balloon'){ if(!p){toast(T('tNo'));return;}tieBalloon(p);return; }
  if(t==='thruster'){ if(!p){toast(T('tNo'));return;}
    THRUST.push({p,f:p.mass*26});toast('🚀');p.body.wakeUp();return; }
  if(t==='freeze'){ if(p){freezeProp(p,!p.frozen);toast(T('tFroze'));}return; }
  if(t==='unfreeze'){ toast(T('tUnfroze')+unfreezeAll());return; }
}
const BALLOONS=[];
function tieBalloon(p){
  const r=.5;
  const geo=new THREE.SphereGeometry(r,12,9);tintGeo(geo,0xff5a7a);
  const m=new THREE.Mesh(geo,PMAT.plastic);m.castShadow=QP.shadow>0;scene.add(m);
  const body=new CANNON.Body({mass:.7,material:MAT.prop,shape:new CANNON.Sphere(r),
    linearDamping:.55,angularDamping:.7});
  body.position.set(p.body.position.x,p.body.position.y+3.2,p.body.position.z);
  world.addBody(body);
  const c=new CANNON.DistanceConstraint(p.body,body,3.2);
  world.addConstraint(c);
  BALLOONS.push({m,body,c,p});
  if(p.frozen)freezeProp(p,false);
  p.manual=true;p.body.wakeUp();
}
/* ---- las ENTIDADES hacen cosas: los globos flotan, los propulsores empujan,
       los botiquines curan y lo explosivo explota ---- */
function entStep(dt){
  const A=actives();
  for(let i=A.length-1;i>=0;i--){
    const p=A[i];
    if(p.frozen)continue;
    const id=p.id;
    if(/balloon|globo/.test(id)){
      const b=p.body;b.wakeUp();
      const f=p.mass*30*(1-clamp((b.position.y-22)/8,0,1));
      if(f>1)b.applyForce(new CANNON.Vec3(0,f,0),new CANNON.Vec3(0,0,0));
      if(b.velocity.y>5)b.velocity.y=5;
    } else if(/thruster|propuls/.test(id)){
      const b=p.body;b.wakeUp();
      b.applyLocalForce(new CANNON.Vec3(0,p.mass*30,0),new CANNON.Vec3(0,0,0));
    } else if(/medkit|botiquin|health/.test(id)&&PL.hp<100){
      const b=p.body,dx=b.position.x-plBody.position.x,dy=b.position.y-plBody.position.y,
            dz=b.position.z-plBody.position.z;
      if(dx*dx+dy*dy+dz*dz<2.4){heal(35);removeProp(p);toast('❤ +35');}
    }
  }
}

/* agua: empuje y frenado para todo lo que se hunde (jugador aparte) */
function stepWater(){
  if(!WATER.length)return;
  for(const p of actives()){
    if(p.frozen)continue;
    const b=p.body,x=b.position.x,y=b.position.y,z=b.position.z;
    for(const w of WATER){
      if(Math.abs(x-w.x)>w.w/2||Math.abs(z-w.z)>w.dp/2)continue;
      const sub=w.top-y;
      if(sub<=0)continue;
      const k=Math.min(1,sub/1.2);
      b.wakeUp();
      b.applyForce(new CANNON.Vec3(0,b.mass*22*k,0),new CANNON.Vec3(0,0,0));
      b.velocity.x*=.94;b.velocity.z*=.94;b.velocity.y*=.9;
      b.angularVelocity.scale(.93,b.angularVelocity);
      b.wakeUp();break;
    }
  }
}
function stepBalloons(){
  for(let i=BALLOONS.length-1;i>=0;i--){ const b=BALLOONS[i];
    if(PROPS.indexOf(b.p)<0){ world.removeConstraint(b.c);world.removeBody(b.body);
      scene.remove(b.m);b.m.geometry.dispose();BALLOONS.splice(i,1);continue; }
    const y=b.body.position.y,CE=30;
    const f=430*(1-clamp((y-(CE-8))/8,0,1));
    b.body.wakeUp();b.p.body.wakeUp();
    if(f>1)b.body.applyForce(new CANNON.Vec3(0,f,0),new CANNON.Vec3(0,0,0));
    if(b.body.velocity.y>5.5)b.body.velocity.y=5.5;
    b.m.position.set(b.body.position.x,b.body.position.y,b.body.position.z);
  }
  for(let i=THRUST.length-1;i>=0;i--){ const t=THRUST[i];
    if(PROPS.indexOf(t.p)<0||t.p.frozen){THRUST.splice(i,1);continue;}
    t.p.body.wakeUp();
    t.p.body.applyLocalForce(new CANNON.Vec3(0,t.f,0),new CANNON.Vec3(0,0,0)); }
}

/* ================= vida / ragdoll ================= */
function hurt(n){
  if(n<=0)return;SFX.hurt();
  PL.hp=clamp(PL.hp-n,0,100);
  $('hp').querySelector('i').style.width=PL.hp+'%';
  $('hp').querySelector('span').textContent=PL.hp;
  if(PL.hp<=0)ragdoll(true);
}
function heal(n){PL.hp=clamp(PL.hp+n,0,100);
  $('hp').querySelector('i').style.width=PL.hp+'%';
  $('hp').querySelector('span').textContent=PL.hp;}
function ragdoll(on){
  PL.rag=on==null?!PL.rag:on;
  if(PL.rag){ plBody.fixedRotation=false;plBody.angularDamping=.3;plBody.updateMassProperties();
    plBody.angularVelocity.set((Math.random()-.5)*7,(Math.random()-.5)*4,(Math.random()-.5)*7);
    toast(T('tRag')); }
  else { plBody.fixedRotation=true;plBody.angularDamping=1;plBody.quaternion.set(0,0,0,1);
    plBody.updateMassProperties();PL.hp=Math.max(PL.hp,25);heal(0); }
}
function respawn(){
  const sp=(CURMAP&&CURMAP.def.spawns)||[[0,1.4,20,180]];
  const s=sp[Math.floor(Math.random()*sp.length)];
  plBody.position.set(s[0],s[1]+.2,s[2]);plBody.velocity.set(0,0,0);plSync();
  PL.yaw=(s[3]||0)*D2R;PL.pitch=-.05;
  if(PL.rag)ragdoll(false);
  PL.hp=100;heal(0);
}

/* ================= movimiento ================= */
const K={f:0,s:0,jump:0,run:0};
function playerStep(dt){
  if(extRun('pre',dt))return;
  if(PL.rag){plBody.wakeUp();return;}
  // suelo
  const from=new CANNON.Vec3(plBody.position.x,plBody.position.y+.2,plBody.position.z);
  const to=new CANNON.Vec3(plBody.position.x,plBody.position.y-.34,plBody.position.z);
  rr.reset();world.raycastClosest(from,to,RAY,rr);
  grounded=rr.hasHit&&rr.body!==plBody;
  if(grounded)coyote=.12;else coyote=Math.max(0,coyote-dt);
  // agua
  inWater=false;
  for(const w of WATER){
    if(Math.abs(plBody.position.x-w.x)<w.w/2&&Math.abs(plBody.position.z-w.z)<w.dp/2
       &&plBody.position.y<w.top+.4&&plBody.position.y>w.y-w.h){inWater=true;break;}
  }
  const sy=Math.sin(PL.yaw),cy=Math.cos(PL.yaw);
  const fx=-sy,fz=-cy,rx=cy,rz=-sy;
  let vx=(fx*K.f+rx*K.s),vz=(fz*K.f+rz*K.s);
  const L=Math.hypot(vx,vz);if(L>1){vx/=L;vz/=L;}
  const sp=PL.noclip?20:(inWater?4.6:(K.run?PL.run:PL.spd));
  if(PL.noclip){
    plBody.velocity.set(vx*sp+camDirY()*0,0,vz*sp);
    camDir(_dir);
    plBody.velocity.set(_dir.x*sp*(K.f||0)+rx*K.s*sp,_dir.y*sp*(K.f||0)+(K.jump?sp*.6:0),
      _dir.z*sp*(K.f||0)+rz*K.s*sp);
    return;
  }
  const acc=grounded||inWater?18:7;
  plBody.velocity.x+=(vx*sp-plBody.velocity.x)*Math.min(1,acc*dt);
  plBody.velocity.z+=(vz*sp-plBody.velocity.z)*Math.min(1,acc*dt);
  if(inWater){
    plBody.velocity.y+=(K.jump?3.4:1.2-plBody.velocity.y)*Math.min(1,6*dt);
    plBody.velocity.y=clamp(plBody.velocity.y,-3.5,3.6);
  } else if(K.jump&&coyote>0){plBody.velocity.y=PL.jump;coyote=0;}
  plBody.wakeUp();
}
function camDirY(){return 0;}

/* el arma va donde está la mano derecha del rig, pero siempre apuntando adelante */
/* ================= cámara ================= */
const camTarget=new THREE.Vector3();
let freeCam=null;
const _rgA=new THREE.Quaternion(),_rgB=new THREE.Quaternion(),_rgE=new THREE.Euler();
/* ---- POSICIÓN DEL JUGADOR **PARA DIBUJAR** ----
   world.step(1/60,dt,3) avanza en pasos FIJOS y por frame entran 0, 1, 2 o 3: plBody.position
   avanza a saltos (medido caminando: 49..268 mm por frame; corriendo 0..453 mm, con el 21% de
   los frames sin avanzar nada). Como la cámara y el personaje leen los dos plBody.position, eso
   no es temblor del arma sino un TIRONEO de toda la vista, que es la mitad de "tiembla en 1ª
   persona con el personaje también".
   cannon-es ya calcula body.interpolatedPosition justo para esto (lerp entre el paso anterior y
   el actual con el sobrante del acumulador): dibujamos con esa. La FÍSICA sigue usando
   plBody.position, acá sólo se decide dónde se PINTA.
   Si alguien escribió la posición a mano (teleport, respawn, salir de un auto) la interpolada
   queda vieja: se detecta por distancia y se usa la real, así no hace falta que cada escritor
   se acuerde de sincronizar. */
const _plD=new THREE.Vector3();
function plDraw(){
  const p=plBody.position,ip=plBody.interpolatedPosition;
  if(!ip||PL.noclip||PL.rag||plBody.type!==CANNON.Body.DYNAMIC)return _plD.set(p.x,p.y,p.z);
  const dx=ip.x-p.x,dy=ip.y-p.y,dz=ip.z-p.z;
  if(dx*dx+dy*dy+dz*dz>.25)return _plD.set(p.x,p.y,p.z);   // salto raro: gana la real
  return _plD.set(ip.x,ip.y,ip.z);
}
/* al escribir plBody.position a mano hay que blanquear la interpolación, si no el primer frame
   dibuja a mitad de camino entre el lugar viejo y el nuevo */
function plSync(){
  plBody.previousPosition.copy(plBody.position);
  plBody.interpolatedPosition.copy(plBody.position);
}
/* dónde y cómo se dibuja el personaje: una sola función, la usan el juego y la cámara libre */
function placeChar(){
  if(!charRoot)return;
  const d=plDraw();
  const px=d.x,py=d.y,pz=d.z;
  /* en 1ª persona el personaje SE DIBUJA (se ven los brazos y las piernas): lo que se recorta
     es sólo la cabeza, con un plano de recorte sobre SU material — ver core_h. */
  charRoot.visible=true;
  if(PL.rag){
    /* RAGDOLL: el cuerpo físico se desbloquea y tumbea de verdad, así que se copia su
       orientación REAL y además se acuesta al personaje 90°. Antes se usaban las COMPONENTES
       del cuaternión como si fueran ángulos de Euler (quaternion.x*1.6), que mueve unos pocos
       grados: el muñeco se quedaba parado en pose de reposo. */
    /* se lo acuesta SIEMPRE plano contra el piso (-90° en X: la cabeza pasa a apuntar
       adelante) y gira sobre el piso siguiendo el giro real del cuerpo físico. Componer
       directamente el cuaternión del cuerpo dejaba al muñeco tieso a 45°, flotando. */
    const by=2*Math.atan2(plBody.quaternion.y,plBody.quaternion.w);
    _rgE.set(-Math.PI*.5,PL.yaw+Math.PI+by,0,'YXZ');
    charRoot.quaternion.setFromEuler(_rgE);
    charRoot.position.set(px,Math.max(.10,py-.42),pz);
  } else {
    charRoot.position.set(px,py-.02,pz);
    charRoot.rotation.set(0,PL.yaw+Math.PI,0);
  }
}
function camStep(dt){
  if(extRun('cam',dt))return;
  if(freeCam){camera.position.set(freeCam[0],freeCam[1],freeCam[2]);
    camera.lookAt(freeCam[3],freeCam[4],freeCam[5]);
    /* la cámara libre es sólo para inspeccionar: el personaje se coloca con la MISMA función
       que en el juego. Antes esta rama lo paraba derecho y salía, así que el ragdoll no se
       veía nunca en las capturas de prueba (y me hizo creer que no funcionaba). */
    placeChar();
    return;}
  const d0=plDraw();
  const px=d0.x,py=d0.y,pz=d0.z;
  const eye=py+(PL.rag?.4:PL.h-.28);
  if(PL.fp){
    /* 1ª PERSONA DE VERDAD: la cámara va 14 cm delante de los ojos (la cara queda atrás,
       no se ve por dentro de la cabeza) y el cuerpo sigue dibujado, así que en pantalla se
       ven los BRAZOS y las MANOS sosteniendo el arma, la misma que se ve en 3ª persona. */
    camera.position.set(px-Math.sin(PL.yaw)*.14,eye+.02,pz-Math.cos(PL.yaw)*.14);
  } else {
    const dist=4.05,side=.72;
    const sy=Math.sin(PL.yaw),cy=Math.cos(PL.yaw),cp=Math.cos(PL.pitch),spp=Math.sin(PL.pitch);
    let ox=sy*dist*cp+cy*side, oy=-spp*dist+.28, oz=cy*dist*cp-sy*side;
    // no atravesar paredes
    const f=new CANNON.Vec3(px,eye+.1,pz),t=new CANNON.Vec3(px+ox,eye+.1+oy,pz+oz);
    rr.reset();world.raycastClosest(f,t,RAY,rr);
    let k=1;
    if(rr.hasHit&&rr.body!==plBody){
      const hp=rr.hitPointWorld;
      const d=Math.hypot(hp.x-px,hp.y-(eye+.1),hp.z-pz);
      k=clamp((d-.35)/Math.hypot(ox,oy,oz),.25,1);
    }
    camera.position.set(px+ox*k,eye+.1+oy*k,pz+oz*k);
  }
  const rk=recoil;
  camera.quaternion.setFromEuler(new THREE.Euler(PL.pitch+rk,PL.yaw,0,'YXZ'));
  recoil*=Math.max(0,1-dt*9);
  // personaje
  placeChar();
  
}

/* ================= HUD / entradas ================= */
let APP='load';
const HOLD={fire:0,jump:0};
let touchDev=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;
function bindBtn(id,down,up){
  const e=$(id);if(!e)return;
  /* los botones con clase `look` NO cortan la propagación: así el mismo dedo que mantiene el
     disparo (o la physgun agarrando algo) puede arrastrar y mover la cámara, como en cualquier
     shooter de celular. Los demás sí la cortan, para no girar la vista sin querer. */
  const d=ev=>{ev.preventDefault();if(!e.classList.contains('look'))ev.stopPropagation();
    e.classList.add('act');down&&down();};
  const u=ev=>{ev&&ev.preventDefault();e.classList.remove('act');up&&up();};
  e.addEventListener('touchstart',d,{passive:false});e.addEventListener('touchend',u);
  e.addEventListener('touchcancel',u);
  e.addEventListener('mousedown',d);e.addEventListener('mouseup',u);e.addEventListener('mouseleave',u);
}
/* palanca */
(function(){
  const st=$('stick'),kn=$('knob');let act=null,cx=0,cy=0,R=1;
  const start=(id,x,y)=>{const r=st.getBoundingClientRect();
    const c=toStage(r.left+r.width/2,r.top+r.height/2);cx=c.x;cy=c.y;
    R=Math.max(r.width,r.height)*.42;act=id;move(x,y);};
  const move=(X,Y)=>{const s2=toStage(X,Y);const x=s2.x,y=s2.y;
    let dx=(x-cx)/R,dy=(y-cy)/R;const L=Math.hypot(dx,dy);
    if(L>1){dx/=L;dy/=L;}
    kn.style.transform='translate(-50%,-50%) translate('+(dx*R*.8)+'px,'+(dy*R*.8)+'px)';
    K.s=dx;K.f=-dy;K.run=Math.hypot(dx,dy)>.86?1:0;};
  const end=()=>{act=null;K.f=K.s=0;K.run=0;kn.style.transform='translate(-50%,-50%)';};
  st.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];
    start(t.identifier,t.clientX,t.clientY);},{passive:false});
  addEventListener('touchmove',e=>{if(act==null)return;
    for(const t of e.changedTouches)if(t.identifier===act)move(t.clientX,t.clientY);},{passive:false});
  addEventListener('touchend',e=>{if(act==null)return;
    for(const t of e.changedTouches)if(t.identifier===act)end();});
  st.addEventListener('mousedown',e=>{e.preventDefault();start('m',e.clientX,e.clientY);
    const mv=ev=>move(ev.clientX,ev.clientY),up=()=>{end();removeEventListener('mousemove',mv);
      removeEventListener('mouseup',up);};
    addEventListener('mousemove',mv);addEventListener('mouseup',up);});
})();
/* mirar: arrastrar en la mitad derecha */
(function(){
  let id=null,lx=0,ly=0;
  const ok=t=>{ const e=document.elementFromPoint(t.clientX,t.clientY);
    if(!e||!e.closest)return true;
    if(e.closest('.rb.look'))return true;      // disparo y mira: se puede arrastrar encima
    return !e.closest('.rb,#stick,#wslot,#chat,#spawn,#pause,#opts,.screen,#hedBar'); };
  addEventListener('touchstart',e=>{ if(APP!=='play')return;
    for(const t of e.changedTouches)if(id==null&&ok(t)){id=t.identifier;lx=t.clientX;ly=t.clientY;} },
    {passive:true});
  addEventListener('touchmove',e=>{ if(id==null)return;
    for(const t of e.changedTouches)if(t.identifier===id){
      look((t.clientX-lx),(t.clientY-ly));lx=t.clientX;ly=t.clientY;} },{passive:true});
  addEventListener('touchend',e=>{ if(id==null)return;
    for(const t of e.changedTouches)if(t.identifier===id)id=null;});
  let md=false;
  addEventListener('mousedown',e=>{if(APP!=='play')return;
    if(ok(e)){md=true;lx=e.clientX;ly=e.clientY;}});
  addEventListener('mousemove',e=>{if(!md)return;look(e.clientX-lx,e.clientY-ly);lx=e.clientX;ly=e.clientY;});
  addEventListener('mouseup',()=>md=false);
})();
function look(dxc,dyc){
  const d=dStage(dxc,dyc),dx=d.x,dy=d.y;
  const s=.0032*(SV.sens||1)*(zoomOn?.45:1);
  if(rotMode&&grab){rotV.x=dy*.22;rotV.y=dx*.22;return;}
  PL.yaw-=dx*s;PL.pitch=clamp(PL.pitch-dy*s,-1.35,1.35);
}
/* teclado (PC) */
const KMAP={KeyW:'f+',KeyS:'f-',KeyA:'s-',KeyD:'s+',ShiftLeft:'run',Space:'jump'};
addEventListener('keydown',e=>{
  if(document.activeElement===$('chatin'))return;
  const m=KMAP[e.code];
  if(m==='f+')K.f=1;else if(m==='f-')K.f=-1;else if(m==='s-')K.s=-1;else if(m==='s+')K.s=1;
  else if(m==='run')K.run=1;else if(m==='jump'){K.jump=1;HOLD.jump=1;}
  if(e.code==='KeyE'){equip(wIdx+1);}
  if(e.code==='KeyQ'){openSpawn();}
  if(e.code==='KeyR'){reload();}
  if(e.code==='KeyF'){toolFreeze();}
  if(e.code==='KeyV'){PL.noclip=!PL.noclip;
    plBody.type=PL.noclip?CANNON.Body.KINEMATIC:CANNON.Body.DYNAMIC;plBody.updateMassProperties();}
  if(e.code==='KeyC'){toggleFP();}
  if(e.code==='Escape'||e.code==='KeyP'){togglePause();}
});
addEventListener('keyup',e=>{
  const m=KMAP[e.code];
  if(m==='f+'&&K.f>0)K.f=0;else if(m==='f-'&&K.f<0)K.f=0;
  else if(m==='s-'&&K.s<0)K.s=0;else if(m==='s+'&&K.s>0)K.s=0;
  else if(m==='run')K.run=0;else if(m==='jump'){K.jump=0;HOLD.jump=0;}
});
addEventListener('mousedown',e=>{if(APP==='play'&&e.button===0&&!e.target.closest('.rb,#stick,#chat'))HOLD.fire=1;});
addEventListener('mouseup',e=>{if(e.button===0)HOLD.fire=0;});
addEventListener('wheel',e=>{ if(APP!=='play')return;
  if(grab)grabDist=clamp(grabDist+(e.deltaY>0?-.6:.6),1.6,24);
  else equip(wIdx+(e.deltaY>0?1:-1)); },{passive:true});

/* botones */
bindBtn('bFire',()=>{HOLD.fire=1;},()=>{HOLD.fire=0;});
bindBtn('bJump',()=>{K.jump=1;HOLD.jump=1;},()=>{K.jump=0;HOLD.jump=0;});
bindBtn('bFrz',()=>toolFreeze());
bindBtn('bRel',()=>reload());
bindBtn('bAim',()=>toggleAim());
bindBtn('bRag',()=>ragdoll());
bindBtn('bCam',()=>toggleFP());
bindBtn('bPause',()=>togglePause());
bindBtn('bTools',()=>openSpawn());
bindBtn('bChat',()=>{$('chat').classList.toggle('on');});
(function(){ let t=0;
  bindBtn('bTrash',()=>{t=performance.now();},()=>{
    if(performance.now()-t>700){clearAll();toast(T('tClear'));}
    else{const h=aimRay(60,0);if(h&&h.prop){removeProp(h.prop);toast(T('tRemoved'));}else toast(T('tNo'));}
  });})();
$('wslot').addEventListener('click',e=>{e.stopPropagation();openSpawn('arm');});
$('chatin').addEventListener('keydown',e=>{
  if(e.key==='Enter'){const v=$('chatin').value.trim();if(v){addChat('Player: '+v);}$('chatin').value='';}});
function addChat(s){const l=$('chatlog');const d=document.createElement('div');d.textContent=s;
  l.appendChild(d);l.scrollTop=l.scrollHeight;}
function toolFreeze(){
  SFX.freeze();
  if(grab){const p=grab;grabEnd();freezeProp(p,true);p.manual=false;toast(T('tFroze'));return;}
  const h=aimRay(60,0);
  if(h&&h.prop){freezeProp(h.prop,!h.prop.frozen);h.prop.manual=false;toast(T('tFroze'));}
  else toast(T('tNo'));
}
/* 📷 cambia primera / tercera persona */
function toggleFP(){
  PL.fp=!PL.fp;
  if(!PL.fp&&zoomOn){zoomOn=false;camera.fov=72;camera.updateProjectionMatrix();}
  attachWeapon();
  toast(PL.fp?T('tFP'):T('tTP'));
}
/* ◎ apunta: sólo tiene sentido con un arma (entra en primera persona y acerca la mira) */
function toggleAim(){
  const w=weap();
  if(w.kind!=='gun'&&w.kind!=='proj'&&w.kind!=='melee'){toast(T('tAimNo'));return;}
  zoomOn=!zoomOn;
  if(zoomOn){ if(!PL.fp){PL.fp=true;attachWeapon();}
    camera.fov=72/(w.zoom||1.55); }
  else camera.fov=72;
  camera.updateProjectionMatrix();
  $('bAim').classList.toggle('act',zoomOn);
}
function photo(){
  try{ renderer.render(scene,camera);
    const a=document.createElement('a');a.download='sux-sandbox.png';
    a.href=renderer.domElement.toDataURL('image/png');a.click();toast(T('tShot')); }
  catch(e){toast('📷');}
}

/* ================= acción por frame de las armas ================= */
let fireLatch=false;
function weaponStep(dt){
  fireT=Math.max(0,fireT-dt);reloadT=Math.max(0,reloadT-dt);
  const w=weap();
  const want=!!HOLD.fire;
  if(w.kind==='phys'){
    if(want&&!fireLatch){fireLatch=true;grabStart();}
    if(!want){fireLatch=false;if(grab)grabEnd();}
    grabStep(dt);
  } else if(w.kind==='grav'){
    if(want&&!fireLatch){fireLatch=true;gravPunt();}
    if(!want)fireLatch=false;
  } else if(w.kind==='tool'){
    if(want&&!fireLatch){fireLatch=true;useTool();}
    if(!want)fireLatch=false;
  } else if(w.kind==='cam'){
    if(want&&!fireLatch){fireLatch=true;photo();}
    if(!want)fireLatch=false;
  } else if(w.kind==='melee'){
    if(want&&fireT<=0){melee();}
    if(!want)fireLatch=false;
  } else if(w.kind==='gun'){
    if(want&&fireT<=0&&reloadT<=0){ if(w.auto||!fireLatch){fireLatch=true;fireGun();} }
    if(!want)fireLatch=false;
  } else if(w.kind==='proj'){
    if(want&&fireT<=0&&reloadT<=0&&!fireLatch){fireLatch=true;shootProj();}
    if(!want)fireLatch=false;
  }
  const cr=$('cross');if(cr)cr.classList.toggle('grab',!!grab);
  // efectos
  for(let i=TRACERS.length-1;i>=0;i--){const t=TRACERS[i];t.t-=dt;
    t.m.material=tracerMat;if(t.t<=0){scene.remove(t.m);TRACERS.splice(i,1);}}
  for(let i=SPARKS.length-1;i>=0;i--){const s=SPARKS[i];s.t-=dt;
    if(s.grow)s.m.scale.setScalar(s.m.scale.x+s.grow*dt);
    if(s.fade&&s.m.material)s.m.material.opacity=Math.max(0,s.t*2.6);
    if(s.t<=0){scene.remove(s.m);if(s.fade&&s.m.material)s.m.material.dispose();SPARKS.splice(i,1);}}
  stepProj(dt);
}

/* ================= menú de spawn ================= */
let spTab='acc',spFold=null;
function buildTabs(){
  const t=$('sptabs');t.innerHTML='';
  const defs=[['acc','🧱',T('tacc')],['veh','🚗',T('tveh')],['ent','📦',T('tent')],
              ['arm','🔫',T('tarm')],['tool','🔧',T('ttool')]];
  for(const[k,ic,name]of defs){
    const b=document.createElement('button');b.className='sptab'+(k===spTab?' on':'');
    b.dataset.tab=k;b.innerHTML='<i>'+ic+'</i>'+name;
    b.addEventListener('click',()=>{spTab=k;spFold=null;buildTabs();buildFolders();});
    t.appendChild(b);}
}
function foldersFor(tab){
  if(tab==='arm')return[{id:'w',name:T('weap')}];
  if(tab==='tool')return[{id:'t',name:T('ttool')}];
  return SECTS.filter(s=>s.tab===tab);
}
function buildFolders(){
  const f=$('spfold');f.innerHTML='';
  const list=foldersFor(spTab);
  if(!spFold&&list.length)spFold=list[0].id;
  for(const s of list){
    const b=document.createElement('button');b.className='fold'+(s.id===spFold?' on':'');
    b.textContent=s.name;b.dataset.fold=s.id;
    b.addEventListener('click',()=>{spFold=s.id;buildFolders();});
    f.appendChild(b);}
  buildGrid();
}
function buildGrid(){
  const g=$('spgrid');g.innerHTML='';thumbQ.length=0;
  if(spTab==='arm'){
    WEAP.forEach((w,i)=>{
      const b=document.createElement('button');b.className='pit';b.dataset.weap=w.id;
      const cv=document.createElement('canvas');cv.width=128;cv.height=96;
      b.appendChild(cv);const s=document.createElement('span');s.textContent=w.name;b.appendChild(s);
      b.addEventListener('click',()=>{equip(i);closeSpawn();toast(T('tWeap')+w.name);});
      g.appendChild(b);
      const gl=w.glb&&MODELS[w.glb];
      if(gl){const c=gl.scene.clone(true);try{drawObjThumb(c,cv);}catch(e){}}
      else{const c=procWeapon(w);try{drawObjThumb(c,cv);}catch(e){}}
    });return;}
  if(spTab==='tool'){
    TOOLS.forEach((t,i)=>{
      const b=document.createElement('button');b.className='pit';b.dataset.tool=t;
      const s=document.createElement('span');s.textContent=T('tools')[i]||t;
      const ic=document.createElement('canvas');ic.width=128;ic.height=96;
      const cx=ic.getContext('2d');cx.font='58px system-ui';cx.textAlign='center';
      cx.fillText(['✥','🔗','🗑','✚','🎈','🚀','❄','🔥'][i]||'🔧',64,72);
      b.appendChild(ic);b.appendChild(s);
      b.addEventListener('click',()=>{toolIdx=i;weldA=null;
        if(t==='physgun')equip(WIX.physgun);else equip(WIX.toolgun);
        closeSpawn();toast(T('tools')[i]);});
      g.appendChild(b);});
    return;}
  const sec=SECTS.find(s=>s.id===spFold);
  if(!sec)return;
  for(const p of sec.props){
    const b=document.createElement('button');b.className='pit';b.dataset.prop=p.id;
    const cv=document.createElement('canvas');cv.width=128;cv.height=96;
    b.appendChild(cv);
    const s=document.createElement('span');s.textContent=p.name;b.appendChild(s);
    b.addEventListener('click',()=>spawnAhead(p.id));
    g.appendChild(b);
    queueThumb(p,cv);
  }
}
function spawnAhead(id){
  camDir(_dir);
  const dist=Math.max(3.4,Math.min(7,3.4+(PDEF[id]?buildDef(PDEF[id]).size[0]:1)));
  const p=spawnProp(id,{x:camera.position.x+_dir.x*dist,y:camera.position.y+_dir.y*dist+.6,
    z:camera.position.z+_dir.z*dist},null,{raw:true,frozen:$('spFrz').checked});
  if(p){p.manual=true;if(!$('spFrz').checked){p.body.velocity.set(_dir.x*1.4,0,_dir.z*1.4);}}
  if(!$('spDup').checked)closeSpawn();
}
function openSpawn(tab){ if(APP!=='play'&&APP!=='pause'&&APP!=='spawn')return;
  if(tab)spTab=tab,spFold=null;
  APP='spawn';$('spawn').classList.add('on');buildTabs();buildFolders(); }
function closeSpawn(){ $('spawn').classList.remove('on');if(APP==='spawn')APP='play'; }
$('spclose').addEventListener('click',closeSpawn);

/* ================= pausa / ajustes ================= */
function togglePause(){
  if(APP==='play'){APP='pause';$('pause').classList.add('on');
    try{drawObjThumb(charRoot||new THREE.Group(),$('plist').querySelector('canvas'));}catch(e){}}
  else if(APP==='pause'){APP='play';$('pause').classList.remove('on');}
}
$('pBack').addEventListener('click',togglePause);
$('pResp').addEventListener('click',()=>{respawn();togglePause();});
$('pSave').addEventListener('click',()=>{saveGame();});
$('pOpts').addEventListener('click',()=>{$('opts').classList.add('on');});
$('pQuit').addEventListener('click',()=>{location.reload();});
$('optClose').addEventListener('click',()=>{$('opts').classList.remove('on');save();});
$('optDef').addEventListener('click',()=>{
  Object.assign(SV,{shadow:null,desc:true,post:false,fpsm:true,hideui:false,sens:1,fpslim:0,
    texq:1,maxProps:0});save();applyOpts(true);});
function applyOpts(fill){
  if(fill){
    $('oShadow').checked=SV.shadow==null?QP.shadow>0:!!SV.shadow;
    $('oDesc').checked=!!SV.desc;$('oPost').checked=!!SV.post;$('oFps').checked=!!SV.fpsm;
    $('oHide').checked=!!SV.hideui;
    $('oSens').value=Math.round((SV.sens||1)*100);
    $('oLim').value=SV.fpslim||0;$('oTex').value=String(SV.texq||1);
    $('oMax').value=SV.maxProps||QP.maxProps;
  }
  SV.shadow=$('oShadow').checked;SV.desc=$('oDesc').checked;SV.post=$('oPost').checked;
  SV.fpsm=$('oFps').checked;SV.hideui=$('oHide').checked;
  SV.sens=(+$('oSens').value)/100;SV.fpslim=+$('oLim').value;SV.texq=+$('oTex').value;
  SV.maxProps=+$('oMax').value;
  $('oSensV').textContent=(SV.sens).toFixed(1);
  $('oLimV').textContent=SV.fpslim?SV.fpslim+' fps':'Off';
  $('oMaxV').textContent=SV.maxProps;
  renderer.shadowMap.enabled=!!SV.shadow&&QP.shadow>0;
  sun.castShadow=!!SV.shadow&&QP.shadow>0;
  $('fps').style.display=SV.fpsm?'':'none';
  $('hud').style.opacity=SV.hideui?0:1;
  save();
}
for(const id of['oShadow','oDesc','oPost','oFps','oHide','oSens','oLim','oTex','oMax'])
  $(id).addEventListener('input',()=>applyOpts(false));

/* ================= guardar / cargar ================= */
function saveGame(){
  const d={map:CURMAP?CURMAP.id:'construct',props:PROPS.map(p=>({i:p.id,
    p:[+p.body.position.x.toFixed(2),+p.body.position.y.toFixed(2),+p.body.position.z.toFixed(2)],
    q:[+p.body.quaternion.x.toFixed(3),+p.body.quaternion.y.toFixed(3),
       +p.body.quaternion.z.toFixed(3),+p.body.quaternion.w.toFixed(3)],f:p.frozen?1:0}))};
  try{localStorage.setItem('hyper1_save',JSON.stringify(d));toast(T('tSaved'));}catch(e){toast('!');}
}
function loadGame(){
  let d;try{d=JSON.parse(localStorage.getItem('hyper1_save')||'null');}catch(e){}
  if(!d||!d.props)return false;
  clearAll();
  for(const s of d.props){
    const q=new CANNON.Quaternion(s.q[0],s.q[1],s.q[2],s.q[3]);
    const p=spawnProp(s.i,{x:s.p[0],y:s.p[1],z:s.p[2]},q,{raw:true,frozen:!!s.f});
  }
  toast(T('tLoaded'));return true;
}

/* ================= pantallas ================= */
function showScreen(n){
  ['sLang','sQual','sTitle','sMap','sHelp'].forEach(i=>$(i).classList.add('hide'));
  if(n)$(n).classList.remove('hide');
  const play=(n===null);
  $('hud').classList.toggle('on',play);
  $('stick').style.display=play?'':'none';
}
function applyLang(){
  LANG=SV.lang||'es';
  $('qUld').innerHTML=T('quld')+'<small>'+T('quldD')+'</small>';
  $('qLow').innerHTML=T('qlow')+'<small>'+T('qlowD')+'</small>';
  $('qHigh').innerHTML=T('qhigh')+'<small>'+T('qhighD')+'</small>';
  $('bPlay').textContent=T('play');$('bMulti').textContent=T('multi');
  $('bHelp').textContent=T('help');$('bQual').textContent=T('qual');
  $('tTag').textContent=T('tag');
  $('mTitle').textContent=T('mapT');$('mSub').textContent=T('mapS');
  $('mPlay').textContent=T('go');$('mBack').textContent=T('back');
  $('hTitle').textContent=T('hT');$('hBody').innerHTML=T('hB');$('hClose').textContent=T('ok');
  $('pTit').textContent=T('pause');
  $('pBack').querySelector('span').textContent=T('resume');
  $('pResp').querySelector('span').textContent=T('resp');
  $('pSave').querySelector('span').textContent=T('sav');
  $('pOpts').querySelector('span').textContent=T('opts');
  $('pQuit').querySelector('span').textContent=T('quit');
  $('optTit').textContent=T('opTit');
  $('oShadowL').textContent=T('oShadow');$('oDescL').textContent=T('oDesc');
  $('oPostL').textContent=T('oPost');$('oFpsL').textContent=T('oFps');$('oHideL').textContent=T('oHide');
  $('oSensL').textContent=T('oSens');$('oLimL').textContent=T('oLim');$('oTexL').textContent=T('oTex');
  $('oMaxL').textContent=T('oMax');
  $('optDef').textContent=T('def');$('optClose').textContent=T('close');
  $('spDupL').textContent=T('dup');$('spFrzL').textContent=T('frz');
  $('spclose').textContent=T('close');
  buildTabs();
}
for(const b of document.querySelectorAll('#sLang [data-lang]'))
  b.addEventListener('click',()=>{SV.lang=b.dataset.lang;save();applyLang();
    APP='qual';showScreen('sQual');markQual();});
function markQual(){
  for(const[id,k]of[['qUld','uld'],['qLow','low'],['qHigh','high']])
    $(id).classList.toggle('on',SV.qual===k);
}
$('qUld').addEventListener('click',()=>{SV.qual='uld';save();markQual();});
$('qLow').addEventListener('click',()=>{SV.qual='low';save();markQual();});
$('qHigh').addEventListener('click',()=>{SV.qual='high';save();markQual();});
/* cambiar de calidad: se aplica en vivo cuando se puede, y sólo recarga si hay que
   reconstruir los materiales (phong <-> PBR). Con aviso, para que no parezca colgado. */
function applyQualLive(){
  QP=QPRE[SV.qual]||QP;
  applyDpr();
  renderer.shadowMap.enabled=QP.shadow>0&&SV.shadow!==false;
  sun.castShadow=renderer.shadowMap.enabled;
  if(QP.shadow>0){ sun.shadow.mapSize.set(QP.shadow,QP.shadow);
    if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;} }
  camera.far=QP.far;camera.updateProjectionMatrix();
  if(scene.fog)scene.fog.far=Math.min(QP.far*.98,scene.fog.far);
  if(skyMesh)buildSky(CURMAP?CURMAP.def.sky:'city');
  $('oMax').value=SV.maxProps||QP.maxProps;applyOpts(false);
}
$('qOk').addEventListener('click',()=>{
  if(QP.key!==SV.qual){
    save();
    if((QPRE[SV.qual]||QP).phong===QP.phong){ applyQualLive();toast(T('tApply'));
      APP='title';showScreen('sTitle');return; }
    $('load').classList.remove('hide');$('loadMsg').textContent=T('tApply');
    setTimeout(()=>location.reload(),80);return;
  }
  APP='title';showScreen('sTitle');});
$('bQual').addEventListener('click',()=>{APP='qual';showScreen('sQual');markQual();});
$('bHelp').addEventListener('click',()=>{APP='help';showScreen('sHelp');});
$('hClose').addEventListener('click',()=>{APP='title';showScreen('sTitle');});
$('bMulti').addEventListener('click',()=>toast(T('multi')));
$('bPlay').addEventListener('click',()=>{APP='map';showScreen('sMap');buildMapList();});
$('mBack').addEventListener('click',()=>{APP='title';showScreen('sTitle');});
$('mPlay').addEventListener('click',()=>startPlay());
function buildMapList(){
  const g=$('maps');g.innerHTML='';
  for(const m of MAPS){
    const b=document.createElement('button');b.className='mapit'+(m.id===SV.map?' sel':'');
    b.dataset.map=m.id;
    const cv=document.createElement('canvas');cv.width=180;cv.height=110;
    const cx=cv.getContext('2d');
    const g2=cx.createLinearGradient(0,0,0,110);
    g2.addColorStop(0,'#9fc4e0');g2.addColorStop(.55,'#cfe0ec');
    cx.fillStyle=g2;cx.fillRect(0,0,180,110);
    cx.fillStyle=m.def.ground==='asphalt'?'#4d5157':'#6f9c4a';cx.fillRect(0,62,180,48);
    cx.fillStyle='rgba(150,158,166,.9)';
    let i=0;for(const p of m.def.parts.slice(0,26)){
      const w=Math.max(3,Math.min(40,(p.d[0]||2)*.9)),h=Math.max(3,Math.min(46,(p.d[1]||2)*1.4));
      const x=90+((p.p&&p.p[0])||0)*.32-w/2,y=62-h+(((p.p&&p.p[2])||0)*.12);
      cx.fillRect(x,y,w,h);i++;}
    b.appendChild(cv);
    const s=document.createElement('span');s.textContent=m.name;b.appendChild(s);
    b.addEventListener('click',()=>{SV.map=m.id;save();buildMapList();});
    g.appendChild(b);}
}
function startPlay(){
  showScreen(null);APP='play';
  buildMap(SV.map);
  respawn();
  equip(WIX.physgun);
  applyOpts(true);
  if(!PROPS.length)starterProps();
  toast(T('hint'));
}
function starterProps(){
  const sp=(CURMAP&&CURMAP.def.spawns&&CURMAP.def.spawns[0])||[0,1,20,0];
  const ids=Object.keys(PDEF);
  const pick=n=>ids.filter(i=>i.indexOf(n)===0);
  const some=(arr,k)=>arr.slice(0,k);
  let x=0;
  for(const id of some(pick('i_'),5).concat(some(pick('f_'),3),some(pick('v_'),1))){
    spawnProp(id,{x:sp[0]-6+ (x%5)*3,y:1.2+Math.floor(x/5)*1.4,z:sp[2]-7},null,{raw:false});x++; }
}

/* ================= bucle ================= */
let last=performance.now(),TT=0,_fA=0,_fN=0,_fCd=0,_warm=0,_bad=0,_dfT=0,fpsShow=0;
function adaptRes(ms){
  _fA+=ms;_fN++;_warm+=ms;
  if(_fN<24)return;
  const avg=_fA/_fN;_fA=0;_fN=0;
  fpsShow=Math.round(1000/Math.max(1,avg));
  if($('fps'))$('fps').textContent=fpsShow+' fps';
  if(_warm<4000)return;
  if(_fCd>0){_fCd--;return;}
  if(avg>26){ if(++_bad>=2&&resScale>.62){resScale=Math.max(.62,resScale-.09);applyDpr();_fCd=8;_bad=0;} }
  else{_bad=0;if(avg<15&&resScale<1){resScale=Math.min(1,resScale+.05);applyDpr();_fCd=14;}}
}
function frame(){
  requestAnimationFrame(frame);
  const now=performance.now();
  if(SV.fpslim&&now-last<1000/SV.fpslim-1)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  adaptRes(Math.min(140,now-(frame._a||now)));frame._a=now;
  TT+=dt;
  if(APP==='play'){
    playerStep(dt);weaponStep(dt);
    world.step(1/60,dt,3);
    // sincronizar props que se mueven
    for(const p of actives()){
      if(p.frozen)continue;
      if(p.body.sleepState===CANNON.Body.SLEEPING&&!p._d)continue;
      syncMat(p);p._d=p.body.sleepState!==CANNON.Body.SLEEPING;
    }
    stepBalloons();stepWater();entStep(dt);extRun('post',dt);
    _dfT+=dt;
    if(_dfT>.6){_dfT=0;distFreeze(plBody.position.x,plBody.position.z);budget();
}
    /* EL PERSONAJE SE COLOCA **ANTES** DE RESOLVER LOS IK.
       animStep() (armIKR/torsoAim) y holdWeapon() (armIK) resuelven en el MUNDO: el objetivo
       sale de plBody y PL.yaw de ESTE frame, pero charRoot todavía tenía la posición y el yaw
       del frame ANTERIOR, porque el único placeChar() estaba dentro de camStep(), que corre
       después. La pose se resolvía en un marco viejo y después placeChar() la arrastraba: el
       error es exactamente v·dt (medido: 22,7 cm de desfase a 8,9 m/s) y alterna frame a frame
       (pico de DFT en fs/2), que es el zumbido de 1 frame que se veía girando la vista.
       Manda placeChar(): charRoot es función pura de plBody + PL.yaw, que ya quedaron
       definitivos al terminar world.step. Es idempotente, camStep() la vuelve a llamar igual. */
    placeChar();
    animStep(dt);holdWeapon();
    camStep(dt);
    if(SV.desc)describe();
  } else if(APP==='pause'||APP==='spawn'){ camStep(dt);stepThumbs(); }
  extRun('frame',dt);
  for(const k in POOLS)POOLS[k].flush();
  if(skyMesh)skyMesh.position.copy(camera.position);
  stepThumbs();
  renderer.render(scene,camera);
}
let _dsc=0;
function describe(){
  _dsc++;if(_dsc%9)return;
  const h=aimRay(28,0);
  const e=$('desc');
  if(h&&h.prop){e.textContent=h.prop.def.name+(h.prop.frozen?' ❄':'');e.style.opacity=1;}
  else e.style.opacity=0;
}

/* ================= arranque ================= */
function boot(){
  buildTabs();applyLang();
  loadTex('grass',TEXU.grass);loadTex('concrete',TEXU.concrete);loadTex('brick',TEXU.brick);
  loadTex('asphalt',TEXU.asphalt);loadTex('steel',TEXU.steel);loadTex('corrugated',TEXU.corrugated);
  loadTex('water',TEXU.water);loadTex('wood',TEXU.wood);loadTex('rust',TEXU.rust);
  loadTex('sky',TEXU.sky);
  loadGLB('char',GLBU.char,g=>setupChar(g));
  loadGLB('aIdle',GLBU.aIdle,g=>addClip('idle',g));
  loadGLB('aRun',GLBU.aRun,g=>addClip('run',g));
  loadGLB('aJump',GLBU.aJump,g=>addClip('jump',g));
  loadGLB('pSedan',GLBU.pSedan,g=>{PGLB.sedan=g;});
  loadGLB('pTree',GLBU.pTree,g=>{PGLB.tree=g;});
  loadGLB('pCrate',GLBU.pCrate,g=>{PGLB.crate=g;});
  for(const k of ['physgun','pistol','shotgun','smg','sniper','akm','rpg','bat','revolver',
                  'toolgun','crossbow'])loadGLB(k,GLBU[k]);
  const t0=performance.now();
  (function wait(){
    const done=(texDone>=texPend&&glbDone>=glbPend)||performance.now()-t0>(window.__TEST?9000:26000);
    paintLoad(Math.min(1,(texDone+glbDone)/Math.max(1,texPend+glbPend)),
      (texDone+glbDone)+'/'+(texPend+glbPend));
    if(!done){setTimeout(wait,180);return;}
    texMats();
    if(TEX.water&&_wm){_wm.map=TEX.water;_wm.color.setScalar(1);_wm.needsUpdate=true;}
    equipReady();
    $('load').classList.add('hide');
    if(!SV.lang){APP='lang';showScreen('sLang');}
    else{applyLang();APP='title';showScreen('sTitle');markQual();}
  })();
  frame();
}
function equipReady(){ try{equip(WIX.physgun);}catch(e){} }
boot();

/* ================= hooks de test ================= */
if(DEV)window.__H={
  app:()=>APP,qual:()=>QP.key,dpr:()=>+renderer.getPixelRatio().toFixed(3),
  lang:l=>{SV.lang=l;applyLang();},
  play:()=>{APP='map';startPlay();},
  maps:()=>MAPS.map(m=>m.id),setMap:m=>{SV.map=m;},
  mapInfo:()=>({id:CURMAP&&CURMAP.id,parts:CURMAP?CURMAP.def.parts.length:0,
    bodies:mapBodies.length,water:WATER.length,spawns:CURMAP?CURMAP.def.spawns.length:0}),
  sections:()=>SECTS.map(s=>({id:s.id,name:s.name,tab:s.tab,n:s.props.length})),
  propIds:()=>Object.keys(PDEF),
  propCount:()=>Object.keys(PDEF).length,
  spawn:(id,x,y,z,f)=>{const p=spawnProp(id,{x:x||0,y:y==null?3:y,z:z==null?0:z},null,
    {raw:true,frozen:!!f});return !!p;},
  props:()=>PROPS.length,
  bodyOf:i=>{const p=PROPS[i];return p?{y:+p.body.position.y.toFixed(3),x:+p.body.position.x.toFixed(3),
    z:+p.body.position.z.toFixed(3),vy:+p.body.velocity.y.toFixed(3),frozen:p.frozen,
    id:p.id,type:p.body.type,mass:p.body.mass}:null;},
  defInfo:id=>{const d=PDEF[id];if(!d)return null;const b=buildDef(d);
    return{size:b.size.map(v=>+v.toFixed(2)),mats:b.mats,shapes:b.shapes.length,dy:+b.dy.toFixed(2),
      parts:d.parts.length,mass:d.mass,name:d.name};},
  clear:()=>{clearAll();return PROPS.length;},
  /* mismo orden que frame(): placeChar() ANTES de los IK, si no los tests miden el bug viejo */
  step:(n)=>{for(let i=0;i<(n||60);i++){playerStep(1/60);weaponStep(1/60);world.step(1/60,1/60,2);
    for(const p of actives())if(!p.frozen)syncMat(p);stepBalloons();stepWater();entStep(1/60);
    placeChar();animStep(1/60);holdWeapon();camStep(1/60);}},
  tp:(x,y,z)=>{plBody.position.set(x,y,z);plBody.velocity.set(0,0,0);plSync();camStep(0);},
  look:(y,p)=>{PL.yaw=y;PL.pitch=p||0;camStep(0);},
  aimAt:i=>{const p=PROPS[i];if(!p)return false;
    /* en 3ª persona la cámara ORBITA al cambiar el yaw, así que iteramos hasta converger */
    for(let k=0;k<6;k++){
      const dx=p.body.position.x-camera.position.x,dy=p.body.position.y-camera.position.y,
            dz=p.body.position.z-camera.position.z,d=Math.hypot(dx,dz);
      PL.yaw=Math.atan2(-dx,-dz);PL.pitch=Math.atan2(dy,d);camStep(0);
    }
    return true;},
  aim:()=>{const h=aimRay(60,0);return h?{prop:h.prop?h.prop.id:null,d:+h.d.toFixed(2)}:null;},
  press:(k,v)=>{if(k==='fire')HOLD.fire=v?1:0;else if(k==='jump'){K.jump=v?1:0;HOLD.jump=v?1:0;}
    else K[k]=v?1:0;},
  weapons:()=>WEAP.map(w=>w.name),equip:id=>{equip(WIX[id]!=null?WIX[id]:0);return weap().id;},
  weap:()=>({id:weap().id,ammo:weap().ammo,mag:weap().mag||0,model:!!wModel,
    glb:!!(weap().glb&&MODELS[weap().glb])}),
  fire:n=>{HOLD.fire=1;for(let i=0;i<(n||1);i++){fireT=0;weaponStep(1/60);}HOLD.fire=0;
    weaponStep(1/60);return weap().ammo;},
  grabbed:()=>grab?PROPS.indexOf(grab):-1,
  tool:i=>{toolIdx=i;equip(WIX.toolgun);return TOOLS[i];},
  welds:()=>CONSTR.length,balloons:()=>BALLOONS.length,
  weldA:()=>weldA?PROPS.indexOf(weldA):-1,
  hpOf:i=>{const p=PROPS[i];return p?(p.hp==null?100:p.hp):null;},
  velOf:i=>{const p=PROPS[i];return p?[+p.body.velocity.x.toFixed(2),+p.body.velocity.y.toFixed(2),
    p.body.type,p.frozen,p.body.sleepState]:null;},toolIdx:()=>TOOLS[toolIdx],
  freeze:i=>{const p=PROPS[i];if(p)freezeProp(p,!p.frozen);return p?p.frozen:null;},
  unfreezeAll:()=>unfreezeAll(),
  fp:()=>PL.fp,toggleFP:()=>{toggleFP();return PL.fp;},
  hp:()=>PL.hp,hurt:n=>{hurt(n);return PL.hp;},rag:()=>PL.rag,ragdoll:v=>{ragdoll(v);return PL.rag;},
  explodeAt:(x,y,z,r)=>{blastAt(new THREE.Vector3(x,y,z),r||8);return PROPS.length;},
  char:()=>({loaded:!!charRoot,bones:Object.keys(bones),anim:!!mixer,grip:!!handGrip,
    visible:charRoot?charRoot.visible:false}),
  info:()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles,
    bodies:world.bodies.length,pools:Object.keys(POOLS).length,props:PROPS.length,
    maxProps:maxProps(),awake:QP.awake,far:camera.far,fps:fpsShow}),
  save:()=>{saveGame();return true;},load:()=>loadGame(),
  openSpawn:t=>{openSpawn(t);return true;},closeSpawn:()=>{closeSpawn();return true;},
  spawnUI:()=>({open:$('spawn').classList.contains('on'),tab:spTab,fold:spFold,
    tabs:[...document.querySelectorAll('.sptab')].map(b=>b.dataset.tab),
    folders:[...document.querySelectorAll('.fold')].map(b=>b.textContent),
    items:[...document.querySelectorAll('#spgrid .pit')].length}),
  clickItem:i=>{const b=document.querySelectorAll('#spgrid .pit')[i];if(b)b.click();return PROPS.length;},
  pause:()=>{togglePause();return APP;},
  opts:()=>({shadow:!!SV.shadow,desc:!!SV.desc,fpsm:!!SV.fpsm,sens:SV.sens,tex:SV.texq,
    max:SV.maxProps,lim:SV.fpslim}),
  setOpt:(k,v)=>{SV[k]=v;applyOpts(true);return SV[k];},
  thumbs:()=>thumbQ.length,drainThumbs:n=>{for(let i=0;i<(n||40);i++)stepThumbs();return thumbQ.length;},
  /* radiografía de color: cómo quedó cada material del mapa y su color de vértice */
  dbgMat:()=>{const out={cm:THREE.ColorManagement.enabled,tone:renderer.toneMapping,
      exp:renderer.toneMappingExposure,hemi:hemi.intensity,sun:sun.intensity,
      fill:fill.intensity,phong:!!QP.phong,shadow:renderer.shadowMap.enabled,meshes:[]};
    mapGroup.traverse(o=>{if(o.isMesh&&out.meshes.length<6){
      const c=o.geometry.attributes.color,m=o.material;
      out.meshes.push({mat:m.name||'?',map:!!m.map,vcOn:!!m.vertexColors,
        col:[+m.color.r.toFixed(3),+m.color.g.toFixed(3),+m.color.b.toFixed(3)],
        vc:c?[+c.getX(0).toFixed(3),+c.getY(0).toFixed(3),+c.getZ(0).toFixed(3)]:null});}});
    return out;},
  /* radiografía del material del personaje (para el caso "sale todo blanco" en ALTA) */
  dbgChar:()=>{const out={qual:QP.key,phong:!!QP.phong,mats:[]};
    if(charRoot)charRoot.traverse(o=>{ if(!o.isMesh&&!o.isSkinnedMesh)return;
      for(const m of (Array.isArray(o.material)?o.material:[o.material])){ if(!m)continue;
        out.mats.push({type:m.type,name:m.name||o.name,map:!!m.map,
          mapImg:m.map&&m.map.image?((m.map.image.width||0)+'x'+(m.map.image.height||0)):null,
          col:[+m.color.r.toFixed(2),+m.color.g.toFixed(2),+m.color.b.toFixed(2)],
          rough:m.roughness,metal:m.metalness,vc:!!m.vertexColors,
          em:m.emissive?[+m.emissive.r.toFixed(2),+m.emissive.g.toFixed(2),+m.emissive.b.toFixed(2)]:null,
          lit:!!m._lit,skin:!!o.isSkinnedMesh}); }});
    return out;},
  /* qué mallas hay alrededor del jugador (para cazar objetos huérfanos en la escena) */
  near:(r)=>{const R=r||2.2,out=[],p=new THREE.Vector3();
    scene.traverse(o=>{ if(!o.isMesh&&!o.isInstancedMesh)return;
      o.getWorldPosition(p);
      const d=Math.hypot(p.x-plBody.position.x,p.z-plBody.position.z);
      if(d<R)out.push({n:o.name||o.type,geo:o.geometry&&o.geometry.type,
        mat:o.material&&(o.material.name||o.material.type),
        d:+d.toFixed(2),y:+p.y.toFixed(2),
        vis:o.visible,par:(o.parent&&(o.parent.name||o.parent.type))||null,
        cnt:o.isInstancedMesh?o.count:null});});
    return out.slice(0,16);},
  fx:()=>({sparks:SPARKS.map(s=>+s.t.toFixed(2)),tracers:TRACERS.length,proj:PROJ.length}),
  wdir:()=>wModel?(wModel.userData.dir+' L='+wModel.userData.len+' roll='+wModel.userData.roll):null,
  wshow:(id,mdir)=>{ /* muestra el arma SOLA, con el caño hacia -Z, para inspeccionarla */
    const w=WEAP[WIX[id]];if(!w||!w.glb||!MODELS[w.glb])return null;
    if(window.__wshow){scene.remove(window.__wshow);window.__wshow=null;}
    const m=MODELS[w.glb].scene.clone(true);
    if(mdir)w.mdir=mdir;
    const rig=rigWeapon(m,w);
    rig.position.set(0,1.35,40);rig.rotation.set(0,0,0);
    scene.add(rig);window.__wshow=rig;
    if(charRoot)charRoot.visible=false;
    return{dir:rig.userData.dir,roll:rig.userData.roll,len:rig.userData.len};},
  boneSpace:()=>{ /* ¿el espacio del hueso está espejado? Eso voltea el arma 180° */
    const b=bones.rHand;if(!b||!wModel)return null;
    b.updateWorldMatrix(true,false);wModel.updateWorldMatrix(true,false);
    const p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
    b.matrixWorld.decompose(p,q,sc);
    const det=b.matrixWorld.determinant();
    const fw=new THREE.Vector3(0,0,-1).applyMatrix4(new THREE.Matrix4().extractRotation(wModel.matrixWorld)).normalize();
    const want=new THREE.Vector3(-Math.sin(PL.yaw),0,-Math.cos(PL.yaw));
    /* posición REAL en pantalla: proyectamos la punta del caño y el origen */
    const o=new THREE.Vector3().setFromMatrixPosition(wModel.matrixWorld);
    const tip=new THREE.Vector3(0,0,-(wModel.userData.len||.5)).applyMatrix4(wModel.matrixWorld);
    return{escalaHueso:[+sc.x.toFixed(3),+sc.y.toFixed(3),+sc.z.toFixed(3)],
      det:+det.toFixed(4),
      frenteArma:[+fw.x.toFixed(3),+fw.y.toFixed(3),+fw.z.toFixed(3)],
      frentePersonaje:[+want.x.toFixed(3),+want.y.toFixed(3),+want.z.toFixed(3)],
      dot:+fw.dot(want).toFixed(3),
      origen:[+o.x.toFixed(2),+o.y.toFixed(2),+o.z.toFixed(2)],
      punta:[+tip.x.toFixed(2),+tip.y.toFixed(2),+tip.z.toFixed(2)]};},
  wraw:()=>{const o={};for(const w of WEAP){const g=w.glb&&MODELS[w.glb];if(!g)continue;
    const bb=new THREE.Box3().setFromObject(g.scene),v=new THREE.Vector3();bb.getSize(v);
    o[w.id]=[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)];}return o;},
  anim:()=>({state:animState,clips:Object.keys(CLIPS),acts:Object.keys(ACTS),
    upper:Object.keys(ACTU).filter(k=>ACTU[k].getEffectiveWeight()>.5),
    tracks:(()=>{const o={};for(const k in CLIPS){const l=splitClip(CLIPS[k],'low'),u=splitClip(CLIPS[k],'up');
      o[k]=[l?l.tracks.length:0,u?u.tracks.length:0];}return o;})()}),
  handPos:()=>{ if(!charRoot||!bones.rHand)return null;
    const o={};
    for(const k of['rHand','lHand']){ const b=bones[k];if(!b)continue;
      b.updateWorldMatrix(true,false);
      const v=new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
      charRoot.worldToLocal(v);o[k]=[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)];}
    return o;},
  poseNow:()=>{holdWeapon();return true;},
  /* invariante real: el arma cuelga del hueso de la mano y su origen queda a centímetros de él */
  holdCheck:()=>{const b=bones.rHand||bones.rFore;
    if(!b||!wModel)return null;
    b.updateWorldMatrix(true,false);wModel.updateWorldMatrix(true,false);
    const hp=new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    const wp=new THREE.Vector3().setFromMatrixPosition(wModel.matrixWorld);
    const fw=new THREE.Vector3(0,0,-1).applyQuaternion(
      new THREE.Quaternion().setFromRotationMatrix(wModel.matrixWorld));
    const want=new THREE.Vector3(-Math.sin(PL.yaw),0,-Math.cos(PL.yaw));
    return{parentIsHand:wModel.parent===b,d:+hp.distanceTo(wp).toFixed(3),
      aim:+fw.setY(0).normalize().dot(want).toFixed(3)};},
  handOf:()=>{const b=bones.rHand;if(!b)return null;b.updateWorldMatrix(true,false);
    const p=new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    return[+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3)];},
  zoom:()=>zoomOn,fov:()=>+camera.fov.toFixed(1),
  gdlt:(x,y,z)=>{GDLT[0]=x;GDLT[1]=y;GDLT[2]=z;handTrack();return GDLT.slice();},
  anchorPos:()=>{if(!chestAnchor||!wModel)return null;
    const p=chestAnchor.position;
    const bb=new THREE.Box3().setFromObject(wModel),s2=new THREE.Vector3(),c2=new THREE.Vector3();
    bb.getSize(s2);bb.getCenter(c2);
    return{anchor:[+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3)],
      wSize:[+s2.x.toFixed(2),+s2.y.toFixed(2),+s2.z.toFixed(2)],
      wCtrWorld:[+c2.x.toFixed(2),+c2.y.toFixed(2),+c2.z.toFixed(2)]};},
  glbSize:k=>{const g=PGLB[k];if(!g)return null;
    const bb=new THREE.Box3().setFromObject(g.scene),s2=new THREE.Vector3();bb.getSize(s2);
    return[+s2.x.toFixed(2),+s2.y.toFixed(2),+s2.z.toFixed(2)];},
  freeCam:a=>{freeCam=a;camStep(0);return !!a;},
  armPose:(a,b,c,d)=>{ARM.rArm=a;ARM.rFore=b;ARM.lArm=c;ARM.lFore=d;return ARM;},
  anchor:(x,y,z,ry)=>{if(chestAnchor){chestAnchor.position.set(x,y,z);chestAnchor.rotation.y=ry;}return !!chestAnchor;},
  thumbURL:id=>{const d=PDEF[id];if(!d)return null;
    const cv=document.createElement('canvas');try{drawThumb(d,cv);}catch(e){return null;}
    return cv.toDataURL('image/png');},
  secProps:sid=>{const s=SECTS.find(x=>x.id===sid);return s?s.props.map(p=>[p.id,p.name]):[];},
  render:()=>{renderer.render(scene,camera);return true;}};
