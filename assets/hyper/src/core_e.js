/* ============================================================
   HYPER SANDBOX — CONDUCIR VEHÍCULOS  (RaycastVehicle de cannon-es)
   Este archivo se concatena después de core_a..core_d: ya existen THREE, CANNON,
   world, PROPS, PDEF, buildDef, partGeo, partMatrix, freezeProp, plBody, PL, K,
   camera, charRoot, EXT, bindBtn, toast, clamp, D2R, $, RAY, rr, grab, grabEnd…

   IDEA:
   · Los vehículos siguen siendo props normales (physgun, congelar, explotar).
   · Cuando el jugador SUBE a uno, y sólo entonces, se le arma un CANNON.RaycastVehicle
     sobre el MISMO cuerpo del prop: 4 ruedas por rayo, suspensión, motor, freno y
     dirección. Al bajar se desarma y el prop vuelve a ser un prop.
   · Las ruedas del prop son cilindros de colisión: mientras se maneja se reemplaza el
     collider por TRES cajas de chasis que no llegan al piso (si no, el auto raspa y la
     suspensión no trabaja; y con los voladizos levantados tiene ángulo de ataque para
     las rampas). Al bajar se restauran los shapes originales, tal cual estaban.
   · Un solo vehículo activo => con 300 props el costo extra es 4 rayos por paso.
   ============================================================ */

/* ---------- números del manejo (por kilo de masa, así sirve para el kart y el bus) ---------- */
const VHK={
  acc      : 6.4,   // m/s² de aceleración objetivo (se ajusta por masa en la spec)
  vmax     : 26,    // m/s (~94 km/h) (idem)
  vmaxRev  : 8,
  vClamp   : 32,    // m/s: tope duro de velocidad (un choque no puede mandarlo a la órbita)
  wClamp   : 9,     // rad/s: idem para el giro
  brake    : 0.055, // impulso de freno por rueda y por kg
  hbrake   : 0.34,  // freno de mano (traseras)
  drag     : 0.010, // freno motor al soltar
  steer    : 0.52,  // rad de dirección a baja velocidad (tope mecánico)
  steerFloor:0.055, // rad mínimos: a 90 km/h el volante casi no se mueve
  aLat     : 16,    // m/s² laterales que la dirección llega a pedir a fondo de escala:
                    // un auto los aguanta, un colectivo o un furgón se van de boca
  steerRate: 5.2,   // rad/s de giro del volante (suaviza el stick digital)
  slip     : 1.9,   // frictionSlip (agarre: por encima de ~2 el auto nunca patina)
  roll     : 0.55,  // rollInfluence (cuánto la fuerza lateral hace palanca: alto = vuelca)
  reach    : 2.5,   // m para poder subir
  camDist  : 1.15,  // multiplicador de distancia de cámara sobre el largo del auto
  camAlign : 3.4    // 1/s con que la cámara se vuelve a poner detrás
};
const VHG=()=>Math.abs(world.gravity.y)||19.6;

/* ============================================================
   1. de un prop de vehículo a una especificación de vehículo manejable
   ============================================================ */
const _vhBB=new THREE.Box3();
function vhPartsAABB(list){
  const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(const q of list){
    const g=partGeo(q);g.applyMatrix4(partMatrix(q));
    _vhBB.setFromBufferAttribute(g.attributes.position);
    g.dispose();
    mn[0]=Math.min(mn[0],_vhBB.min.x);mx[0]=Math.max(mx[0],_vhBB.max.x);
    mn[1]=Math.min(mn[1],_vhBB.min.y);mx[1]=Math.max(mx[1],_vhBB.max.y);
    mn[2]=Math.min(mn[2],_vhBB.min.z);mx[2]=Math.max(mx[2],_vhBB.max.z);
  }
  return mn[0]>mx[0]?null:{mn,mx};
}
/* una rueda es un cilindro de goma acostado (r:[0,0,90]) */
const vhIsWheel=q=>q.s==='cyl'&&q.m==='rubber'&&!!q.r&&Math.abs(q.r[2])===90;
/* ¿este prop se puede conducir? -> spec cacheada en el def */
function vhSpec(def){
  if(def._vh!==undefined)return def._vh;
  def._vh=null;
  if(!def||def.tab!=='veh'||!def.parts)return null;
  const raw=def.parts.filter(vhIsWheel);
  if(!raw.length)return null;                       // lancha, moto de agua, helicóptero
  const b=buildDef(def),ctr=b.ctr;
  /* ruedas en coordenadas del CUERPO (el cuerpo está en el centro del AABB total) */
  let W=raw.map(q=>({x:q.p[0]-ctr[0],y:q.p[1]-ctr[1],z:q.p[2]-ctr[2],
                     r:q.d[0],w:q.d.length>1?q.d[1]:0.2,gy:q.p[1]}));
  if(W.length===2){
    /* moto / bici / scooter: se le ponen 4 ruedas virtuales (dos por eje) para que
       la simulación por rayos no se caiga de costado. No se dibujan: el prop ya
       trae sus dos ruedas dibujadas en el medio. */
    const t=Math.max(.40,b.size[0]*.45);
    W=W.reduce((a,w)=>a.concat([{...w,x:w.x-t},{...w,x:w.x+t}]),[]);
  }
  const zs=W.map(w=>w.z),zmid=(Math.min.apply(null,zs)+Math.max.apply(null,zs))/2;
  /* las ruedas tienen que quedar UNA A CADA LADO del centro de masa: si no (semirremolque
     sin tractor, avioneta con el tren adelante) el bicho apoya la trompa o la cola en el
     piso y no anda: esos quedan como props comunes. */
  const _wb0=Math.max(.6,Math.max.apply(null,zs)-Math.min.apply(null,zs));
  if(Math.min.apply(null,zs)>-.12*_wb0||Math.max.apply(null,zs)<.12*_wb0)return null;
  const rMax=Math.max.apply(null,W.map(w=>w.r));
  /* caja de chasis: el cuerpo SIN las ruedas, y con el piso levantado para que
     quede luz libre y la suspensión sea la que toca el suelo */
  const solid=def.parts.filter(q=>!q.nc&&!vhIsWheel(q));
  const bb=vhPartsAABB(solid.length?solid:def.parts.filter(q=>!q.nc));
  if(!bb)return null;
  let bot=Math.max(bb.mn[1],rMax*.75),top=bb.mx[1];
  if(top-bot<.16){bot=Math.max(.02,top-.16);}
  const clear=bot;                                  // luz libre sobre el piso
  const nW=W.length;
  const comp=clamp(clear*.40,.025,.09);             // hundimiento de la suspensión en reposo
  const stiff=VHG()/(nW*comp);
  const rest=comp+Math.max(.16,rMax*.55);
  for(const w of W){
    w.cy=w.y+rest-comp;                             // punto de anclaje de la suspensión
    w.front=w.z>zmid+.001;
  }
  /* el chasis no puede ser más ancho que la trocha + un margen: si no, las ALAS del avión
     terminan siendo el collider y el bicho no se mueve */
  const trk=Math.max.apply(null,W.map(w=>Math.abs(w.x)));
  const half=[Math.min(Math.max(.1,(bb.mx[0]-bb.mn[0])/2),trk+rMax*2+.35),
              (top-bot)/2,Math.max(.1,(bb.mx[2]-bb.mn[2])/2)];
  const off=[(bb.mn[0]+bb.mx[0])/2-ctr[0],(bot+top)/2-ctr[1],(bb.mn[2]+bb.mx[2])/2-ctr[2]];
  /* ---- el collider del chasis va en TRES cajas ----
     una central baja (entre ejes) y dos en los voladizos con el piso más alto: así el auto
     tiene ÁNGULO DE ATAQUE y no se clava la trompa en la primera rampa. */
  const zF=Math.max.apply(null,zs),zR=Math.min.apply(null,zs);
  const bzF=off[2]+half[2],bzR=off[2]-half[2];        // frente y cola de la carrocería
  const cF=Math.min(bzF,zF+rMax*.6),cR=Math.max(bzR,zR-rMax*.6);
  const boxes=[{half:[half[0],half[1],Math.max(.12,(cF-cR)/2)],
                off:[off[0],off[1],(cF+cR)/2]}];
  const lift=(over)=>Math.min(half[1]*1.2,Math.max(.12,over*.5));
  if(bzF-cF>.16){ const L=(bzF-cF)/2,up=lift(bzF-cF);
    boxes.push({half:[half[0]*.92,Math.max(.12,half[1]-up/2),L],off:[off[0],off[1]+up/2,cF+L]}); }
  if(cR-bzR>.16){ const L=(cR-bzR)/2,up=lift(cR-bzR);
    boxes.push({half:[half[0]*.92,Math.max(.12,half[1]-up/2),L],off:[off[0],off[1]+up/2,cR-L]}); }
  const nSteer=W.filter(w=>w.front).length;
  /* ¿cuánto aguanta antes de irse de boca? (trocha / altura del centro de masa)
     El rollInfluence es igual para todos, así que este número sale de la geometría del prop:
     el sedán aguanta ~1.14 g y el colectivo ~0.70 g, y la dirección puede pedir hasta
     VHK.aLat·roll. Por eso los altos vuelcan y los bajos patinan. */
  const tip=+(trk/Math.max(.2,b.dy)).toFixed(2);
  const roll=VHK.roll;
  const wb=Math.max(.6,Math.max.apply(null,zs)-Math.min.apply(null,zs));
  /* un colectivo no acelera como un kart: motor y velocidad máxima salen de la masa */
  const acc=clamp(7.6-def.mass/560,2.6,7.2), vmax=clamp(28-def.mass/300,15,27);
  def._vh={wheels:W,nW,stiff,rest,comp,boxes,wb:+wb.toFixed(3),roll:+roll.toFixed(3),tip,travel:Math.max(comp+.04,rest*.92),
    acc:+acc.toFixed(2),vmax:+vmax.toFixed(1),
    half,off,clear:+clear.toFixed(3),size:b.size.slice(),mass:def.mass,
    nSteer,name:def.name,id:def.id,
    /* asiento: adelante y arriba dentro de la carrocería */
    seat:[off[0],off[1]+half[1]*.25,off[2]+Math.min(half[2]*.35,1.1)]};
  return def._vh;
}
const vhDrivable=p=>!!(p&&p.def&&vhSpec(p.def));

/* ============================================================
   2. estado del manejo
   ============================================================ */
let VHS=null;          // {p,sp,v,shapes,offs,oris,steer,wasFP,wasSleep,brakeOn}
let vhNearP=null;      // vehículo más cercano (para el botón SUBIR)
let vhTick=0;
const _vhv=new CANNON.Vec3(),_vhv2=new CANNON.Vec3();

/* distancia del jugador a la CAJA del vehículo (no al centro: el bus mide 12 m) */
function vhDist(p){
  const sp=vhSpec(p.def);if(!sp)return 1e9;
  _vhv.set(plBody.position.x,plBody.position.y,plBody.position.z);
  p.body.pointToLocalFrame(_vhv,_vhv2);
  const dx=Math.max(0,Math.abs(_vhv2.x-sp.off[0])-sp.half[0]),
        dy=Math.max(0,Math.abs(_vhv2.y-sp.off[1])-sp.half[1]-.9),
        dz=Math.max(0,Math.abs(_vhv2.z-sp.off[2])-sp.half[2]);
  return Math.hypot(dx,dy,dz);
}
function vhFindNear(){
  let best=null,bd=VHK.reach;
  for(const p of PROPS){
    if(!vhDrivable(p))continue;
    const d=vhDist(p);
    if(d<bd){bd=d;best=p;}
  }
  return best;
}

/* ---------- cambiar el collider por el del chasis y volver ---------- */
function vhSwapShapes(p,sp){
  const b=p.body;
  VHS.shapes=b.shapes.slice();VHS.offs=b.shapeOffsets.slice();VHS.oris=b.shapeOrientations.slice();
  b.shapes.length=0;b.shapeOffsets.length=0;b.shapeOrientations.length=0;
  for(const q of sp.boxes)
    b.addShape(new CANNON.Box(new CANNON.Vec3(q.half[0],q.half[1],q.half[2])),
               new CANNON.Vec3(q.off[0],q.off[1],q.off[2]));
  b.updateMassProperties();b.updateBoundingRadius();b.aabbNeedsUpdate=true;
}
function vhRestoreShapes(p){
  const b=p.body;
  if(!VHS||!VHS.shapes)return;
  b.shapes.length=0;b.shapeOffsets.length=0;b.shapeOrientations.length=0;
  for(let i=0;i<VHS.shapes.length;i++)b.addShape(VHS.shapes[i],VHS.offs[i],VHS.oris[i]);
  b.updateMassProperties();b.updateBoundingRadius();b.aabbNeedsUpdate=true;
}

/* si está tumbado (la moto se cae sola, el auto quedó patas arriba), subirse lo pone
   derecho conservando el rumbo: es la forma natural de "sacarlo del pasto" */
function vhUpright(p){
  const b=p.body;
  const up=b.vectorToWorldFrame(new CANNON.Vec3(0,1,0),new CANNON.Vec3());
  if(up.y>.72)return false;
  const fw=b.vectorToWorldFrame(new CANNON.Vec3(0,0,1),new CANNON.Vec3());
  let yaw=Math.hypot(fw.x,fw.z)>.05?Math.atan2(fw.x,fw.z):0;
  const cr=b.collisionResponse;b.collisionResponse=false;
  const f=new CANNON.Vec3(b.position.x,b.position.y+2.2,b.position.z),
        t=new CANNON.Vec3(b.position.x,b.position.y-4,b.position.z);
  rr.reset();world.raycastClosest(f,t,RAY,rr);
  b.collisionResponse=cr;
  const gy=rr.hasHit?rr.hitPointWorld.y:b.position.y;
  b.quaternion.setFromEuler(0,yaw,0,'XYZ');
  b.position.y=gy+buildDef(p.def).dy+.05;
  b.velocity.set(0,0,0);b.angularVelocity.set(0,0,0);
  return true;
}
/* ---------- subir ---------- */
function vhEnter(p){
  if(VHS)return false;
  if(!p)p=vhFindNear();
  if(!p||!vhDrivable(p)||PL.rag)return false;
  const sp=vhSpec(p.def);
  if(grab===p)grabEnd();
  if(p.frozen)freezeProp(p,false);
  p.manual=true;p.drive=true;
  p.body.wakeUp();vhUpright(p);
  VHS={p,sp,v:null,steer:0,brakeOn:0,wasFP:PL.fp,wasSleep:p.body.allowSleep,
       shapes:null,offs:null,oris:null,orphan:false};
  vhSwapShapes(p,sp);
  const b=p.body;
  b.allowSleep=false;b.wakeUp();
  b.angularDamping=.22;b.linearDamping=.02;
  const v=new CANNON.RaycastVehicle({chassisBody:b,
    indexRightAxis:0,indexForwardAxis:2,indexUpAxis:1});
  for(const w of sp.wheels){
    v.addWheel({radius:w.r,
      directionLocal:new CANNON.Vec3(0,-1,0),
      axleLocal:new CANNON.Vec3(-1,0,0),
      chassisConnectionPointLocal:new CANNON.Vec3(w.x,w.cy,w.z),
      suspensionStiffness:sp.stiff,
      suspensionRestLength:sp.rest,
      maxSuspensionTravel:sp.travel,
      maxSuspensionForce:1e6,
      dampingRelaxation:2.6,
      dampingCompression:4.2,
      frictionSlip:VHK.slip,
      rollInfluence:sp.roll,
      customSlidingRotationalSpeed:-30,
      useCustomSlidingRotationalSpeed:true});
  }
  v.world=world;                        // NO usamos addToWorld: el cuerpo ya está en el mundo
  VHS.v=v;
  /* corre DENTRO de world.step, una vez por sub-paso y justo antes de integrar:
     ahí se recortan las velocidades locas de un choque (si no, el auto tunelea el piso) */
  VHS.pre=()=>{try{vhClamp(b);v.updateVehicle(world.dt>0?world.dt:1/60);}catch(e){}};
  world.addEventListener('preStep',VHS.pre);
  /* el jugador viaja adentro: sin colisión (ni con el auto ni con los rayos de las ruedas) */
  plBody.collisionResponse=false;
  plBody.velocity.set(0,0,0);plBody.angularVelocity.set(0,0,0);
  if(PL.fp){PL.fp=false;attachWeapon();}
  if(charRoot)charRoot.visible=false;
  PL.pitch=clamp(PL.pitch,-.30,.10);
  vhSeat();
  SFX.grab();toast('🚗 '+sp.name+' — palanca: acelerar y doblar · ⬆/Espacio: freno de mano');
  vhHudSync();
  return true;
}
/* ---------- bajar ---------- */
function vhExit(){
  if(!VHS)return false;
  const p=VHS.p,sp=VHS.sp,live=!VHS.orphan&&PROPS.indexOf(p)>=0;
  try{world.removeEventListener('preStep',VHS.pre);}catch(e){}
  if(live){
    vhRestoreShapes(p);
    p.body.allowSleep=VHS.wasSleep==null?true:VHS.wasSleep;
    p.body.angularDamping=.08;
    p.body.wakeUp();
    p.drive=false;
  }
  /* dónde queda parado: al costado del auto, con los pies en el piso */
  let px=plBody.position.x,py=plBody.position.y+.2,pz=plBody.position.z;
  if(live){
    for(const s of [-1,1]){
      _vhv.set(sp.off[0]+s*(sp.half[0]+.75),sp.off[1],sp.off[2]);
      p.body.pointToWorldFrame(_vhv,_vhv2);
      const f=new CANNON.Vec3(_vhv2.x,_vhv2.y+1.6,_vhv2.z),
            t=new CANNON.Vec3(_vhv2.x,_vhv2.y-3.2,_vhv2.z);
      rr.reset();world.raycastClosest(f,t,RAY,rr);
      if(rr.hasHit){px=rr.hitPointWorld.x;py=rr.hitPointWorld.y+.06;pz=rr.hitPointWorld.z;break;}
      px=_vhv2.x;py=_vhv2.y;pz=_vhv2.z;
    }
  }
  const wasFP=VHS.wasFP;
  VHS=null;
  plBody.collisionResponse=true;
  plBody.position.set(px,py,pz);
  plBody.velocity.set(0,0,0);plBody.angularVelocity.set(0,0,0);
  plBody.wakeUp();
  if(wasFP&&!PL.fp){PL.fp=true;attachWeapon();}
  if(charRoot)charRoot.visible=!PL.fp;
  SFX.drop();vhHudSync();
  return true;
}
/* el prop desapareció (borrado, explotado, limpiar todo) mientras lo manejábamos */
function vhOrphan(){ if(VHS){VHS.orphan=true;vhExit();} }

/* ============================================================
   3. manejo: acelerador, freno, marcha atrás, dirección, freno de mano
   ============================================================ */
/* red de contención: un choque contra otro prop puede devolver velocidades absurdas
   (cajas muy penetradas) y el auto saldría disparado atravesando el piso */
function vhClamp(b){
  const v=b.velocity,w=b.angularVelocity;
  const vm=Math.hypot(v.x,v.y,v.z);
  if(vm>VHK.vClamp){const k=VHK.vClamp/vm;v.x*=k;v.y*=k;v.z*=k;}
  const wm=Math.hypot(w.x,w.y,w.z);
  if(wm>VHK.wClamp){const k=VHK.wClamp/wm;w.x*=k;w.y*=k;w.z*=k;}
}
function vhSpeed(){                      // m/s sobre el eje del auto (signo = adelante/atrás)
  const b=VHS.p.body;
  _vhv.set(0,0,1);b.vectorToWorldFrame(_vhv,_vhv2);
  return _vhv2.x*b.velocity.x+_vhv2.y*b.velocity.y+_vhv2.z*b.velocity.z;
}
function vhDrive(dt){
  const p=VHS.p,sp=VHS.sp,v=VHS.v,b=p.body,m=Math.max(1,b.mass);
  if(p.frozen)freezeProp(p,false);       // que nunca lo congele el presupuesto
  p.manual=true;b.allowSleep=false;b.wakeUp();
  if(b.position.y<-30){vhExit();respawn();return;}   // se cayó del mundo: lo bajamos y reaparece
  const th=clamp(K.f,-1,1), st=clamp(K.s,-1,1);
  const hb=!!K.jump||!!VHS.brakeOn;
  const s=vhSpeed();
  /* dirección: el tope del volante sale de un presupuesto de aceleración lateral
     (a = v²·tan(δ)/L). A 90 km/h el auto ya no puede doblar como a 20: si igual lo forzás,
     los altos (bus, van, camión) se van de boca. */
  const lim=clamp(Math.atan(VHK.aLat*sp.wb/Math.max(4,s*s)),VHK.steerFloor,VHK.steer);
  const tgt=-st*lim;                     // stick a la derecha => dobla a la derecha
  const dd=tgt-VHS.steer, mv=VHK.steerRate*dt;
  VHS.steer+=clamp(dd,-mv,mv);
  /* motor / freno */
  let eng=0,brk=0;
  if(th>.05){
    if(s<-.7)brk=m*VHK.brake;                        // venía de culata: primero frena
    else if(s<sp.vmax)eng=m*sp.acc/sp.nW;
  } else if(th<-.05){
    if(s>.7)brk=m*VHK.brake;
    else if(-s<VHK.vmaxRev)eng=-m*sp.acc*.5/sp.nW;
  } else brk=m*VHK.drag;
  if(th)eng*=Math.abs(th);
  for(let i=0;i<sp.nW;i++){
    const w=sp.wheels[i];
    /* OJO con el signo: la rueda empuja sobre normal×eje = -Z local (los props traen el
       frente en +Z), así que para ir hacia adelante el motor va en NEGATIVO. */
    v.applyEngineForce(hb?0:-eng,i);
    v.setBrake(hb?(w.front?m*VHK.brake*.35:m*VHK.hbrake):brk,i);
    v.setSteeringValue(w.front?VHS.steer:0,i);
  }
}
/* el jugador va sentado adentro: el cuerpo físico lo llevamos a mano */
function vhSeat(){
  if(!VHS)return;
  const sp=VHS.sp,b=VHS.p.body;
  _vhv.set(sp.seat[0],sp.seat[1],sp.seat[2]);
  b.pointToWorldFrame(_vhv,_vhv2);
  plBody.position.set(_vhv2.x,_vhv2.y,_vhv2.z);
  plBody.velocity.set(b.velocity.x,b.velocity.y,b.velocity.z);
  plBody.angularVelocity.set(0,0,0);
  if(charRoot)charRoot.visible=false;
}

/* corta el paso normal del jugador y maneja */
EXT.pre.push(dt=>{
  if(!VHS)return false;
  if(PROPS.indexOf(VHS.p)<0){vhOrphan();return false;}
  vhDrive(dt);
  vhSeat();
  return true;
});

/* ============================================================
   4. cámara: tercera persona detrás del auto
   ============================================================ */
const _vhcp=new THREE.Vector3();
const vhAngWrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
EXT.cam.push(dt=>{
  vhPoll(dt);
  if(!VHS)return false;
  vhSeat();
  if(freeCam)return false;          // la cámara libre (pruebas) manda sobre la del auto
  const sp=VHS.sp,b=VHS.p.body;
  /* rumbo del auto (su frente local es +Z) */
  _vhv.set(0,0,1);b.vectorToWorldFrame(_vhv,_vhv2);
  const flat=Math.hypot(_vhv2.x,_vhv2.z);
  if(flat>.05){
    const cy=Math.atan2(-_vhv2.x/flat,-_vhv2.z/flat);
    /* la cámara vuelve sola detrás del auto, pero el arrastre del dedo sigue mandando */
    PL.yaw+=vhAngWrap(cy-PL.yaw)*Math.min(1,VHK.camAlign*dt);
  }
  const dist=clamp(3.6+sp.size[2]*VHK.camDist*.5,4.4,13),
        hgt=1.1+sp.size[1]*.75;
  const cx=b.position.x,cyy=b.position.y,cz=b.position.z;
  const sy=Math.sin(PL.yaw),cyc=Math.cos(PL.yaw),
        cp=Math.cos(PL.pitch),spp=Math.sin(PL.pitch);
  let ox=sy*dist*cp, oy=-spp*dist+hgt, oz=cyc*dist*cp;
  /* no atravesar paredes */
  const f=new CANNON.Vec3(cx,cyy+hgt*.5,cz),t=new CANNON.Vec3(cx+ox,cyy+hgt*.5+oy,cz+oz);
  rr.reset();world.raycastClosest(f,t,RAY,rr);
  let k=1;
  if(rr.hasHit&&rr.body!==plBody&&rr.body!==b){
    const hp=rr.hitPointWorld;
    const d=Math.hypot(hp.x-cx,hp.y-(cyy+hgt*.5),hp.z-cz);
    k=clamp((d-.4)/Math.max(.001,Math.hypot(ox,oy,oz)),.28,1);
  }
  camera.position.set(cx+ox*k,cyy+hgt*.5+oy*k,cz+oz*k);
  _vhcp.set(cx,cyy+hgt*.55,cz);
  camera.lookAt(_vhcp);
  return true;
});

/* ============================================================
   5. HUD: botón SUBIR / BAJAR, freno de mano y velocímetro (todo por DOM)
   ============================================================ */
(function vhHud(){
  const st=document.createElement('style');
  st.textContent=
   '#bVeh{left:17vmin;top:31vmin;background:rgba(108,196,255,.62);display:none}'+
   '#bVeh.on{display:flex}'+
   '#bBrake{right:38vmin;bottom:3vmin;width:13vmin;height:13vmin;max-width:66px;max-height:66px;'+
     'background:rgba(231,86,95,.55);font-size:4.6vmin;display:none}'+
   '#bBrake.on{display:flex}'+
   '#vhSpd{position:absolute;left:50%;bottom:13vmin;transform:translateX(-50%);display:none;'+
     'background:rgba(10,14,20,.72);border:1px solid rgba(108,196,255,.45);border-radius:10px;'+
     'padding:4px 12px;font:900 15px system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000;'+
     'white-space:nowrap}'+
   '#vhSpd.on{display:block}#vhSpd i{font-style:normal;color:var(--dim);font-weight:800;font-size:11px}';
  document.head.appendChild(st);
  const hud=$('hud');
  const mk=(id,cls,html)=>{const e=document.createElement('div');e.id=id;
    if(cls)e.className=cls;e.innerHTML=html;hud.appendChild(e);return e;};
  mk('bVeh','rb','🚗');
  mk('bBrake','rb','🅿');
  mk('vhSpd','','<b>0</b> <i>km/h</i>');
  bindBtn('bVeh',()=>{ if(VHS)vhExit(); else vhEnter(); });
  bindBtn('bBrake',()=>{if(VHS)VHS.brakeOn=1;},()=>{if(VHS)VHS.brakeOn=0;});
})();
function vhHudSync(){
  const bv=$('bVeh'),bb=$('bBrake'),sd=$('vhSpd');
  if(!bv)return;
  if(VHS){ bv.classList.add('on');bv.innerHTML='🚪';bb.classList.add('on');sd.classList.add('on'); }
  else { bb.classList.remove('on');sd.classList.remove('on');bv.innerHTML='🚗';
    bv.classList.toggle('on',!!vhNearP); }
}
/* sondeo de cercanía + velocímetro: barato y corre tanto en el bucle real como en __H.step */
function vhPoll(dt){
  if(APP!=='play'&&!VHS)return;
  vhTick+=dt||0;
  if(VHS){
    if(vhTick>.1){vhTick=0;
      const sd=$('vhSpd');
      if(sd)sd.innerHTML='<b>'+Math.round(Math.abs(vhSpeed())*3.6)+'</b> <i>km/h · '+
        VHS.v.numWheelsOnGround+'/'+VHS.sp.nW+' ruedas</i>';
    }
    return;
  }
  if(vhTick<.25)return;
  vhTick=0;
  const n=vhFindNear();
  if(n!==vhNearP){vhNearP=n;vhHudSync();}
}
EXT.frame.push(()=>{ if(VHS&&charRoot)charRoot.visible=false; });   // el chofer va adentro
/* teclado: G sube/baja (no toca ninguna tecla que ya use el juego de a pie) */
addEventListener('keydown',e=>{
  if(document.activeElement===$('chatin'))return;
  if(e.code==='KeyG'){ if(VHS)vhExit(); else vhEnter(); }
});
/* si el prop que manejamos se borra o se limpia el patio, bajamos solos */
EXT.post.push(()=>{ if(VHS&&PROPS.indexOf(VHS.p)<0)vhOrphan(); });

/* ============================================================
   6. hooks de prueba
   ============================================================ */
if(DEV&&window.__H)Object.assign(window.__H,{
  vehIds:()=>Object.keys(PDEF).filter(i=>vhSpec(PDEF[i])).sort(),
  vehSpec:id=>{const s=vhSpec(PDEF[id]);if(!s)return null;
    return{id,nW:s.nW,nSteer:s.nSteer,wb:s.wb,acc:s.acc,vmax:s.vmax,roll:s.roll,tip:s.tip,
      boxes:s.boxes.map(q=>[q.half.map(v=>+v.toFixed(2)),q.off.map(v=>+v.toFixed(2))]),clear:s.clear,rest:+s.rest.toFixed(3),
      comp:+s.comp.toFixed(3),stiff:+s.stiff.toFixed(1),mass:s.mass,
      half:s.half.map(v=>+v.toFixed(2)),off:s.off.map(v=>+v.toFixed(2)),
      seat:s.seat.map(v=>+v.toFixed(2)),
      wheels:s.wheels.map(w=>[+w.x.toFixed(2),+w.cy.toFixed(2),+w.z.toFixed(2),+w.r.toFixed(2),w.front?1:0])};},
  vehNear:()=>{const p=vhFindNear();return p?{i:PROPS.indexOf(p),id:p.id,d:+vhDist(p).toFixed(2)}:null;},
  vehEnter:i=>vhEnter(i==null?null:PROPS[i]),
  vehExit:()=>vhExit(),
  vehIn:()=>!!VHS,
  vehBtn:()=>{const e=$('bVeh');return{on:!!(e&&e.classList.contains('on')),
    label:e?e.textContent:null,brake:!!($('bBrake')&&$('bBrake').classList.contains('on')),
    spd:$('vhSpd')?$('vhSpd').textContent:null};},
  vehClickBtn:()=>{const e=$('bVeh');if(!e)return false;
    e.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    e.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));return !!VHS;},
  vehSet:(f,s,hb)=>{K.f=f||0;K.s=s||0;K.jump=hb?1:0;return[K.f,K.s,K.jump];},
  vehState:()=>{ if(!VHS)return null;
    const b=VHS.p.body;
    const up=b.vectorToWorldFrame(new CANNON.Vec3(0,1,0),new CANNON.Vec3());
    const fw=b.vectorToWorldFrame(new CANNON.Vec3(0,0,1),new CANNON.Vec3());
    return{id:VHS.p.id,upY:+up.y.toFixed(3),
      fw:[+fw.x.toFixed(2),+fw.y.toFixed(2),+fw.z.toFixed(2)],
      pos:[+b.position.x.toFixed(2),+b.position.y.toFixed(2),+b.position.z.toFixed(2)],
      spd:+vhSpeed().toFixed(2),kmh:Math.round(Math.abs(vhSpeed())*3.6),
      wheels:VHS.v.numWheelsOnGround,nW:VHS.sp.nW,
      steer:+VHS.steer.toFixed(3),
      shapes:b.shapes.length,frozen:VHS.p.frozen,sleep:b.sleepState,mass:b.mass,
      pl:[+plBody.position.x.toFixed(2),+plBody.position.y.toFixed(2),+plBody.position.z.toFixed(2)],
      cam:[+camera.position.x.toFixed(2),+camera.position.y.toFixed(2),+camera.position.z.toFixed(2)],
      camd:+camera.position.distanceTo(new THREE.Vector3(b.position.x,b.position.y,b.position.z)).toFixed(2),
      charVis:charRoot?charRoot.visible:null};},
  vehPropShapes:i=>{const p=PROPS[i];return p?p.body.shapes.length:null;},
  /* colliders del prop: sirve para ver que el chasis se cambia al subir y se restaura al bajar */
  vehBox:i=>{const p=PROPS[i];if(!p)return null;
    return{n:p.body.shapes.length,
      s:p.body.shapes.map((s,k)=>({t:s.halfExtents?'box':(s.radius!=null?'cyl/sph':'?'),
        h:s.halfExtents?[+s.halfExtents.x.toFixed(2),+s.halfExtents.y.toFixed(2),+s.halfExtents.z.toFixed(2)]:null,
        o:[+p.body.shapeOffsets[k].x.toFixed(2),+p.body.shapeOffsets[k].y.toFixed(2),
           +p.body.shapeOffsets[k].z.toFixed(2)]}))};},
  vehRoll:i=>{const p=PROPS[i]||(VHS&&VHS.p);if(!p)return null;
    p.body.wakeUp();p.body.angularVelocity.set(0,0,14);return true;},
  plGround:()=>{const f=new CANNON.Vec3(plBody.position.x,plBody.position.y+.4,plBody.position.z),
      t=new CANNON.Vec3(plBody.position.x,plBody.position.y-.5,plBody.position.z);
    rr.reset();world.raycastClosest(f,t,RAY,rr);
    return{hit:rr.hasHit,x:+plBody.position.x.toFixed(2),y:+plBody.position.y.toFixed(2),
      z:+plBody.position.z.toFixed(2),resp:plBody.collisionResponse,
      vis:charRoot?charRoot.visible:null};},
  /* cámara de inspección: mira el vehículo desde su FRENTE (o desde donde se pida) */
  vehCamAt:(sx,sy,sz)=>{ const p=VHS?VHS.p:PROPS[0];if(!p)return null;
    const b=p.body,fw=b.vectorToWorldFrame(new CANNON.Vec3(0,0,1),new CANNON.Vec3()),
          rt=b.vectorToWorldFrame(new CANNON.Vec3(1,0,0),new CANNON.Vec3());
    camera.position.set(b.position.x+fw.x*sz+rt.x*sx,b.position.y+sy,b.position.z+fw.z*sz+rt.z*sx);
    camera.lookAt(b.position.x,b.position.y,b.position.z);
    renderer.render(scene,camera);
    return[+fw.x.toFixed(2),+fw.z.toFixed(2)];}
});
