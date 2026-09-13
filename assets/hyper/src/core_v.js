/* ============================================================
   SUX SANDBOX — core_v: 26 EXPERIMENTOS DE TAMAÑO, FÍSICA, JUGADOR Y RAGDOLL REAL
   ------------------------------------------------------------
   Se concatena DESPUÉS de core_u, así que XP ya existe y acá sólo se llama a XP.add().
   Los 26 props viven en props/xpv.js (sección 'xpv_lab' → pestaña Experimentos).

   LO QUE SE TOCA DEL MOTOR Y POR QUÉ (todo REASIGNANDO, nunca re-declarando)
   - syncMat        (core_a): la matriz de la instancia se componía con escala fija (1,1,1), o
                    sea que un prop NO se podía agrandar en pantalla. Ahora lee p.xvk. De paso
                    se le pone un guard `if(!p.pool)`: los pseudo-props del ragdoll no tienen
                    pool y freezeProp() llama a syncMat() al final — sin el guard, congelar un
                    brazo del muñeco tiraba una excepción.
   - playerStep     (core_b): se ENVUELVE para tres cosas que el original no deja parametrizar:
                    hielo (el original fija la velocidad con acc=18, o sea que la fricción de
                    los ContactMaterial no afecta al jugador), doble/triple salto (hace falta el
                    FLANCO de K.jump en el aire) y la velocidad del vuelo (el original tiene el
                    20 m/s del noclip escrito a mano).
   - world.step     (core_a): se le pone una propiedad propia a la INSTANCIA que multiplica el
                    tiempo transcurrido. Es la única forma de hacer tiempo lento sin reescribir
                    frame(): el motor la llama con `world.step(1/60,dt,3)` y el 1/60 fijo no se
                    puede tocar sin cambiarle el comportamiento al solver.
   - placeChar      (core_b): con el ragdoll REAL prendido, la pose la manda la física.
   - ragdoll        (core_b): el botón #bRag y hurt() pasan a encender el ragdoll de verdad.
   - pgOrphan       (core_q): declara "huérfano" todo lo agarrado que no esté en PROPS; los
                    huesos del muñeco no están en PROPS y el panel de la physgun los soltaba
                    solo en el frame siguiente.
   - ghostsStep     (core_f): el fantasma remoto se tumba con la pose REAL si llegó por red, y
                    si no con una caída procedural progresiva (antes era un salto instantáneo
                    a 0,9 rad).
   - NET.onProp     (core_f): canal 'o' reutilizado para mandar la pose del ragdoll (id '__rag').

   RENDIMIENTO
   - Cero objetos nuevos por frame: todos los Vec3/Quaternion/Vector3 de trabajo son
     module-level (_xv…). Los bucles por frame recorren actives() (props despiertos), no PROPS.
   - Lo caro escala con QP.key: XVQ.rain (gotas de la tolva) y XVQ.area (props por barrido de
     imán/repulsor/congelador) salen de la calidad elegida.
   - Todo se apaga solo: al salir de la partida (xvWatchApp) y, los que tienen prop, al
     borrarlo (stopOnGone).
   ============================================================ */

/* contrato con los otros agentes: si alguno quiere reemplazar el motor del ragdoll */
if(typeof xvOnRag==='undefined')var xvOnRag=null;     /* fn(on) — aviso de "ragdoll on/off" */

Object.assign(I18N.es,{xvFly:'🕊 Volar',xvRagOn:'🧸 Ragdoll',xvRagOff:'🧍 Pararse'});
Object.assign(I18N.en,{xvFly:'🕊 Fly',xvRagOn:'🧸 Ragdoll',xvRagOff:'🧍 Stand up'});
Object.assign(I18N.pt,{xvFly:'🕊 Voar',xvRagOn:'🧸 Ragdoll',xvRagOff:'🧍 Levantar'});

/* ============================================================
   0. ESTADO, PRESUPUESTO Y TEMPORARIOS
   ============================================================ */
const XV={ts:1,ice:1,fly:20,jumps:1,jUsed:0,jPrev:0,giantStomp:0,wasGround:true};
/* presupuesto por calidad: lo caro (lluvia de props, barridos de área) no puede ser igual en
   un celular de gama baja que en 'high'. Se lee de QP.key UNA vez por uso, no por frame. */
const XVQ={uld:{rain:6,area:60,clone:8},low:{rain:14,area:140,clone:14},high:{rain:30,area:400,clone:24}};
const xvQ=k=>(XVQ[QP.key]||XVQ.uld)[k];

const _xvV=new THREE.Vector3(),_xvV2=new THREE.Vector3(),_xvV3=new THREE.Vector3();
const _xvQ=new THREE.Quaternion(),_xvQ2=new THREE.Quaternion(),_xvQ3=new THREE.Quaternion();
const _xvM4=new THREE.Matrix4(),_xvSc=new THREE.Vector3(1,1,1),_xvPo=new THREE.Vector3();
/* OJO con los tipos de cannon: pointToWorldFrame y raycastClosest escriben/leen Vec3 (llaman
   a vadd/distanceTo). Pasarles un Quaternion como salida tira una excepción, así que van
   Vec3 para los puntos (_xvCp/_xvCb/_xvCw) y Quaternion sólo para las rotaciones (_xvCq). */
const _xvF=new CANNON.Vec3(),_xvZ=new CANNON.Vec3(0,0,0),_xvCp=new CANNON.Vec3(),
      _xvCb=new CANNON.Vec3(),_xvCw=new CANNON.Vec3(),
      _xvCq=new CANNON.Quaternion(),_xvRr=new CANNON.RaycastResult();
const _xvUp=new THREE.Vector3(0,1,0);

/* sonido: el catálogo de core_n puede no estar (build sin audio) — nunca romper por un beep */
const xvSnd=(n,o)=>{ if(typeof sPlay==='function')nsafe(()=>sPlay(n,o||{vol:.7}),'xvsnd'); };

/* ============================================================
   1. ESCALA Y MASA DE UN PROP — DE VERDAD (malla + cuerpo de cannon)
   ------------------------------------------------------------
   La malla de un prop es UNA INSTANCIA de un InstancedMesh compartido: no tiene .scale, tiene
   una matriz. core_a la componía con escala fija (1,1,1). Acá syncMat pasa a leer p.xvk, así
   que agrandar es escribir un número y el pool sigue siendo un solo draw call.
   El cuerpo se escala MUTANDO las formas en el lugar (igual que hace core_u con la cápsula del
   jugador): recrearlas le pierde la pista al SAPBroadphase.
   ============================================================ */
function xvShapeK(s,r){
  if(!s)return false;
  if(s.radius!=null&&s.halfExtents==null&&!s.vertices){          /* Sphere */
    s.radius*=r;if(s.updateBoundingSphereRadius)s.updateBoundingSphereRadius();return true;}
  if(s.halfExtents){                                             /* Box */
    s.halfExtents.scale(r,s.halfExtents);
    if(s.updateConvexPolyhedronRepresentation)s.updateConvexPolyhedronRepresentation();
    if(s.updateBoundingSphereRadius)s.updateBoundingSphereRadius();return true;}
  if(s.vertices&&s.vertices.length){                             /* Cylinder / ConvexPolyhedron */
    for(const v of s.vertices)v.scale(r,v);
    /* las NORMALES de las caras no cambian con una escala uniforme, pero uniqueEdges sí (son
       vectores entre vértices) y el radio de la esfera envolvente también */
    if(s.radiusTop!=null)s.radiusTop*=r;
    if(s.radiusBottom!=null)s.radiusBottom*=r;
    if(s.height!=null)s.height*=r;
    if(s.computeEdges)s.computeEdges();
    if(s.updateBoundingSphereRadius)s.updateBoundingSphereRadius();
    s.worldVerticesNeedsUpdate=true;s.worldFaceNormalsNeedsUpdate=true;return true;}
  return false;
}
/* copia de una forma de cannon (Box/Sphere/Cylinder-ConvexPolyhedron): lo que necesita el
   copy-on-write de abajo. Un tipo no contemplado vuelve tal cual (no hay props con Trimesh). */
function xvShapeClone(s){
  if(!s)return s;
  let c=null;
  if(s.halfExtents)c=new CANNON.Box(s.halfExtents.clone());
  else if(s.radius!=null&&!s.vertices)c=new CANNON.Sphere(s.radius);
  else if(s.vertices&&s.vertices.length){
    c=new CANNON.ConvexPolyhedron({vertices:s.vertices.map(v=>v.clone()),
      faces:s.faces?s.faces.map(f=>f.slice()):[]});
    if(s.radiusTop!=null)c.radiusTop=s.radiusTop;
    if(s.radiusBottom!=null)c.radiusBottom=s.radiusBottom;
    if(s.height!=null)c.height=s.height;
  }
  if(!c)return s;
  c.material=s.material||null;
  c.collisionResponse=s.collisionResponse;
  c.collisionFilterGroup=s.collisionFilterGroup;
  c.collisionFilterMask=s.collisionFilterMask;
  return c;
}
/* props tocados por los experimentos: se restauran al salir de la partida */
const XVSC=new Set();
/* k = escala absoluta (1 = original). floor:true mantiene la BASE quieta (crecer no entierra) */
function xvPropK(p,k,floor){
  if(!p||!p.body||p.rag)return null;
  const cur=p.xvk||1;
  k=clamp(+k||1,.08,8);
  const r=k/cur;
  if(!(r>0)||Math.abs(r-1)<1e-4)return cur;
  /* LAS FORMAS SON COMPARTIDAS: buildDef cachea def._b y spawnProp le da LAS MISMAS instancias
     de CANNON.Shape a todos los cuerpos del mismo def. Escalarlas en el lugar le agrandaba la
     colisión (invisible) a TODOS los cajones del mapa Y a los futuros — el caché vive en el
     def: agrandar uno a x8, borrarlo y spawnear otros los hacía nacer interpenetrados en una
     caja fantasma de 13 m y salían eyectados a los cielos. Copy-on-write: la PRIMERA vez que
     un experimento escala un cuerpo, ese cuerpo pasa a formas PROPIAS; el resto del motor
     sigue compartiendo como siempre (que es lo barato y lo correcto para quien no se escala). */
  if(!p._xvOwnSh){
    const so=p.body.shapes;
    for(let i=0;i<so.length;i++){
      const c=xvShapeClone(so[i]);
      if(c!==so[i]){c.body=p.body;so[i]=c;}
    }
    p._xvOwnSh=1;
  }
  const sh=p.body.shapes;
  for(let i=0;i<sh.length;i++){
    xvShapeK(sh[i],r);
    const o=p.body.shapeOffsets&&p.body.shapeOffsets[i];
    if(o)o.scale(r,o);
  }
  p.xvk=k;
  if(floor){
    /* el cuerpo está en el CENTRO del AABB: al crecer, la mitad del alto se va para abajo y
       el prop queda enterrado en el piso. Se lo levanta esa mitad y la base no se mueve. */
    const b=buildDef(p.def);
    p.body.position.y+=b.size[1]*.5*(k-cur);
  }
  xvPropMass(p);
  p.body.updateBoundingRadius();
  p.body.aabbNeedsUpdate=true;
  p.body.wakeUp();
  XVSC.add(p);
  syncMat(p);
  return k;
}
/* masa = masa del def × k³ (el volumen) × multiplicador del experimento de masa */
function xvPropMass(p){
  if(!p||!p.body||p.frozen)return null;
  const k=p.xvk||1,m=p.xvm||1;
  const nm=clamp((p.def.mass||10)*k*k*k*m,.05,1e5);
  p.body.mass=nm;p.mass=nm;
  /* una pluma de 60 g con la inercia de una caja de 14 kg cae como una piedra: al bajar mucho
     la masa se le sube el roce con el aire, que es lo que hace que una pluma flote */
  p.body.linearDamping=m<.2?clamp(.9-m*2,.1,.86):.02;
  p.body.angularDamping=m<.2?.7:.08;
  p.body.updateMassProperties();
  return nm;
}
function xvPropM(p,m){
  if(!p||!p.body||p.rag)return null;
  p.xvm=clamp(+m||1,.005,60);XVSC.add(p);xvPropMass(p);p.body.wakeUp();return p.xvm;
}
function xvRestore(p){
  if(!p||!p.body)return false;
  if(p.xvk&&p.xvk!==1)xvPropK(p,1,false);
  if(p.xvm&&p.xvm!==1){p.xvm=1;xvPropMass(p);}
  return true;
}
function xvRestoreAll(){
  let n=0;
  for(const p of XVSC){ if(PROPS.indexOf(p)>=0){xvRestore(p);n++;} }
  XVSC.clear();return n;
}

/* syncMat con escala: se REASIGNA (core_a la declaró con `function`) */
const _xvSyncQ=new THREE.Quaternion(),_xvSyncP=new THREE.Vector3(),_xvSyncM=new THREE.Matrix4();
syncMat=function(p){
  if(!p||!p.pool)return;                      /* pseudo-props del ragdoll: no tienen pool */
  const b=p.body;
  _xvSyncP.set(b.position.x,b.position.y,b.position.z);
  _xvSyncQ.set(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
  const k=p.xvk||1;_xvSc.set(k,k,k);
  p.pool.setMatrix(p.slot,_xvSyncM.compose(_xvSyncP,_xvSyncQ,_xvSc));
};

/* ============================================================
   2. AYUDAS: apuntar, dirección local del prop, empujones de área
   ============================================================ */
/* el prop que tenés en la mira (o el que estás sosteniendo con la physgun) */
function xvTarget(){
  if(typeof grab!=='undefined'&&grab&&!grab.rag&&PROPS.indexOf(grab)>=0)return grab;
  const h=aimRay(60,0);
  return (h&&h.prop&&!h.prop.rag)?h.prop:null;
}
/* vector local del prop llevado al mundo (para el ángulo de la catapulta y del cañón) */
function xvDir(p,x,y,z,out){
  const o=out||_xvV2;
  o.set(x,y,z);
  if(p&&p.body){_xvQ3.set(p.body.quaternion.x,p.body.quaternion.y,p.body.quaternion.z,
    p.body.quaternion.w);o.applyQuaternion(_xvQ3);}
  return o.normalize();
}
/* barrido de área con presupuesto: devuelve cuántos tocó. cb(prop,dist) */
function xvArea(cx,cy,cz,R,cb){
  const lim=xvQ('area'),R2=R*R;
  let n=0;
  for(const p of actives()){
    if(n>=lim)break;
    const b=p.body,dx=b.position.x-cx,dy=b.position.y-cy,dz=b.position.z-cz;
    const d2=dx*dx+dy*dy+dz*dz;
    if(d2>R2)continue;
    if(cb(p,Math.sqrt(d2))!==false)n++;
  }
  return n;
}
/* explosión con radio y fuerza SEPARADOS (blastAt de core_b usa el radio para las dos cosas) */
function xvBlast(x,y,z,R,F){
  let n=0;
  xvArea(x,y,z,R,(p,d)=>{
    if(p.frozen)freezeProp(p,false);
    p.manual=true;p.body.wakeUp();
    const f=(1-Math.min(1,d/R))*F*Math.max(1,p.body.mass*.5);
    _xvF.set(p.body.position.x-x,p.body.position.y-y,p.body.position.z-z);
    if(_xvF.lengthSquared()<1e-6)_xvF.set(0,1,0);
    _xvF.normalize();
    _xvF.set(_xvF.x*f,Math.abs(_xvF.y)*f*.55+f*.6,_xvF.z*f);
    p.body.applyImpulse(_xvF,_xvZ);n++;
  });
  /* al jugador también, y le duele */
  const dp=Math.hypot(plBody.position.x-x,plBody.position.y-y,plBody.position.z-z);
  if(dp<R*1.2&&!PL.rag){
    const f=(1-dp/(R*1.2))*F*.16;
    plBody.velocity.x+=(plBody.position.x-x)/Math.max(.4,dp)*f;
    plBody.velocity.z+=(plBody.position.z-z)/Math.max(.4,dp)*f;
    plBody.velocity.y+=f*.7;
    if(typeof hurt==='function')hurt(Math.round((1-dp/(R*1.2))*45));
  }
  if(typeof boom==='function')nsafe(()=>boom(_xvPo.set(x,y,z),R),'xvboom');
  xvSnd('boom',{vol:1,at:{x,y,z}});
  if(typeof XP.fx==='function')XP.fx(x,y,z,{burst:'peony',size:1.1,clr:[0xffb347,0xff5f3a]});
  return n;
}

/* ============================================================
   3. TIEMPO LENTO / BALA — se le pone a la INSTANCIA de world un step propio
   ------------------------------------------------------------
   frame() llama world.step(1/60,dt,3): el paso FIJO no se puede tocar (le cambia la respuesta
   al solver), pero el tiempo TRANSCURRIDO sí. Con XV.ts<1 entran menos sub-pasos por frame y
   cannon interpola solo → cámara lenta suave. Con XV.ts>1 se suben los sub-pasos permitidos.
   Con ts===1 se delega tal cual: a velocidad normal el motor queda idéntico.
   ============================================================ */
const _xvWStep=world.step.bind(world);
world.step=function(fixed,since,max){
  if(XV.ts===1||since===undefined)return _xvWStep(fixed,since,max);
  const m=XV.ts>1?Math.min(6,Math.ceil((max||3)*XV.ts)):(max||3);
  return _xvWStep(fixed,since*XV.ts,m);
};
function xvTime(ts){
  XV.ts=clamp(+ts||1,.05,3);
  if(mixer)mixer.timeScale=XV.ts;              /* si no, el personaje corre a 60 en cámara lenta */
  return XV.ts;
}

/* ============================================================
   4. REBOTE Y FRICCIÓN DEL MUNDO
   ------------------------------------------------------------
   Se guardan los valores de fábrica al arrancar y se escriben los ContactMaterial en el lugar.
   Los que involucran a MAT.player quedan AFUERA a propósito: su fricción es .02 y su rebote 0
   porque el movimiento del jugador se resuelve fijando la velocidad (playerStep), no con roce;
   subírsela lo pega a las paredes.
   ============================================================ */
const XVCM=[];
nsafe(()=>{
  for(const cm of world.contactmaterials){
    if(cm.materials&&cm.materials.indexOf(MAT.player)>=0)continue;
    XVCM.push({cm,f:cm.friction,r:cm.restitution});
  }
  const d=world.defaultContactMaterial;
  XVCM.push({cm:d,f:d.friction,r:d.restitution});
},'xvcm');
function xvBounce(v){
  const k=v==null?null:clamp(+v,0,.98);
  for(const e of XVCM)e.cm.restitution=(k==null)?e.r:k;
  for(const p of PROPS)p.body.wakeUp();
  return k==null?-1:k;
}
function xvFric(v){
  const k=v==null?null:clamp(+v,0,1.4);
  for(const e of XVCM)e.cm.friction=(k==null)?e.f:k;
  for(const p of PROPS)p.body.wakeUp();
  return k==null?-1:k;
}

/* ============================================================
   5. playerStep ENVUELTO: hielo, saltos extra y velocidad de vuelo
   ------------------------------------------------------------
   El original fija la velocidad horizontal con un lerp de acc=18: la fricción de los
   ContactMaterial NO llega al jugador (probado: con friction 0 en todo el mundo el personaje
   frena igual). Para que el hielo se sienta hay que MEZCLAR la velocidad de antes con la que
   dejó el original: XV.ice=1 → el motor de siempre; XV.ice→0 → pura inercia.
   ============================================================ */
const _xvPStep=playerStep;
playerStep=function(dt){
  /* flanco de subida del salto: el original consume K.jump sólo si coyote>0 (o sea en el
     piso), así que el flanco en el AIRE queda libre para los saltos extra */
  const edge=(K.jump&&!XV.jPrev)?1:0;XV.jPrev=K.jump?1:0;
  const g0=grounded,vx0=plBody.velocity.x,vz0=plBody.velocity.z;
  const r=_xvPStep.apply(this,arguments);
  if(PL.rag)return r;
  /* hielo: sólo en el piso y sólo si el experimento está prendido.
     El factor NO es el mismo para acelerar que para frenar. Con el mismo para los dos, hielo=0
     dejaba al jugador clavado: si se le quita el 98 % del cambio de velocidad tampoco puede
     ARRANCAR (medido: 0,0 m/s después de 1,3 s corriendo). En el hielo de verdad cuesta
     acelerar pero lo que no hay es FRENO, así que se separan: frenar/doblar usa el factor
     entero (patina), acelerar nunca baja de 0,35. */
  if(XV.ice<1&&grounded&&!PL.noclip&&!inWater){
    const s0=Math.hypot(vx0,vz0),s1=Math.hypot(plBody.velocity.x,plBody.velocity.z);
    const k=(s1<s0)?Math.max(.02,XV.ice):Math.max(.35,XV.ice);
    plBody.velocity.x=vx0+(plBody.velocity.x-vx0)*k;
    plBody.velocity.z=vz0+(plBody.velocity.z-vz0)*k;
  }
  /* doble / triple salto */
  if(XV.jumps>1&&!PL.noclip){
    if(grounded||inWater)XV.jUsed=0;
    else if(edge&&coyote<=0&&XV.jUsed<XV.jumps-1&&!g0){
      XV.jUsed++;
      plBody.velocity.y=PL.jump*(1-XV.jUsed*.08);
      plBody.wakeUp();
      xvSnd('jump',{vol:.55,rate:1.08+XV.jUsed*.07});
      if(typeof XP.fx==='function')XP.fx(plBody.position.x,plBody.position.y+.1,plBody.position.z,
        {burst:'sparkle',size:.4,clr:[0x9fe8ff]});
    }
  }
  /* vuelo: el original clava 20 m/s; acá se re-escala lo que dejó */
  if(PL.noclip&&XV.fly!==20){
    const k=XV.fly/20;
    plBody.velocity.x*=k;plBody.velocity.y*=k;plBody.velocity.z*=k;
  }
  /* pisada de gigante: al aterrizar con el jugador grande, sacude los props de alrededor */
  if(XV.giantStomp>0&&grounded&&!XV.wasGround){
    const R=XV.giantStomp*XPZ.k;
    xvArea(plBody.position.x,plBody.position.y,plBody.position.z,R,(p,d)=>{
      p.body.wakeUp();
      const f=(1-d/R)*XPZ.k*90*Math.max(1,p.body.mass*.25);
      _xvF.set((p.body.position.x-plBody.position.x)*.5,f*.02+f*.01,
               (p.body.position.z-plBody.position.z)*.5);
      _xvF.normalize();_xvF.scale(f,_xvF);_xvF.y=Math.abs(_xvF.y)+f*.5;
      p.body.applyImpulse(_xvF,_xvZ);
    });
    xvSnd('land',{vol:.9,rate:.7});
  }
  XV.wasGround=grounded;
  return r;
};

/* ============================================================
   6. RAGDOLL REAL — 11 CUERPOS + 10 RESTRICCIONES DESDE EL RIG
   ------------------------------------------------------------
   Antes PL.rag acostaba la cápsula entera 90°: un muñeco TIESO. Acá se arma un cuerpo de
   cannon por hueso principal desde las posiciones REALES del rig, se unen con
   ConeTwistConstraint (cono + torsión limitados) y cada frame los huesos copian la pose de su
   cuerpo. El rig de char.glb es de tipo Mixamo con estos huesos (medidos leyendo el GLB):
     Hips · Spine02 · Spine01 · Spine · neck · Head
     LeftShoulder/Arm/ForeArm/Hand   RightShoulder/Arm/ForeArm/Hand
     LeftUpLeg/Leg/Foot/ToeBase      RightUpLeg/Leg/Foot/ToeBase
   Se usan 11: pelvis, torso, cabeza, 2 brazos, 2 antebrazos, 2 muslos, 2 piernas. Los pies y
   las manos NO llevan cuerpo (serían 4 más y en el celular no se notan): la pierna se estira
   un 15 % para taparlos.

   TRES DECISIONES QUE IMPORTAN
   a) collideConnected:false en cada restricción. cannon-es saca del broadphase los pares
      unidos por una restricción que lo tenga en false, así que los huesos vecinos (que SE
      SUPERPONEN por definición) no pelean, y los NO vecinos (antebrazo contra muslo) sí
      chocan, que es lo que se quiere. Meterlos en otro grupo de colisión no servía: RAY usa
      collisionFilterMask 1 y sin el bit 1 la physgun no los podría agarrar.
   b) La pose se escribe en EXT.frame, DESPUÉS de animStep(): el mixer escribe los huesos en
      cada frame y si la pose se pusiera antes, la animación la borraría.
   c) plBody pasa a collisionResponse=false y collisionFilterGroup=2, y lo seguimos con la
      pelvis. Sin el cambio de grupo, aimRay (mask 1) pegaba en la cápsula del jugador —
      que sigue ahí, en la pelvis — y nunca en los huesos: la physgun no agarraba nada.
   ============================================================ */
const RAG={on:false,bodies:[],cons:[],segs:[],snap:[],bn:null,sc:1,t:0,netT:0,
  pl:{grp:1,resp:true,fix:true,ad:1,type:1}};

/* --- huesos por nombre, tolerante a prefijos (mixamorig:Hips, Armature_Hips, …) --- */
function xvPick(low,alts){
  for(const a of alts){
    const k=String(a).toLowerCase();
    if(low[k])return low[k];
    for(const n in low)if(n.endsWith(':'+k)||n.endsWith('_'+k)||n.endsWith('.'+k))return low[n];
  }
  return null;
}
function xvBoneMap(root){
  if(!root)return null;
  const low={};
  root.traverse(o=>{if(o.isBone&&!low[o.name.toLowerCase()])low[o.name.toLowerCase()]=o;});
  const b={
    hips :xvPick(low,['hips','pelvis','bip01_pelvis']),
    low  :xvPick(low,['spine02','spine','spine1','abdomen']),
    chest:xvPick(low,['spine','spine2','chest','spine01']),
    neck :xvPick(low,['neck']),
    head :xvPick(low,['head']),
    lArm :xvPick(low,['leftarm','arm_l','l_upperarm','upperarm_l']),
    lFore:xvPick(low,['leftforearm','forearm_l','l_forearm']),
    lHand:xvPick(low,['lefthand','hand_l','l_hand']),
    rArm :xvPick(low,['rightarm','arm_r','r_upperarm','upperarm_r']),
    rFore:xvPick(low,['rightforearm','forearm_r','r_forearm']),
    rHand:xvPick(low,['righthand','hand_r','r_hand']),
    lUp  :xvPick(low,['leftupleg','upleg_l','l_thigh','thigh_l']),
    lLeg :xvPick(low,['leftleg','leg_l','l_calf','calf_l']),
    lFoot:xvPick(low,['leftfoot','foot_l','l_foot']),
    rUp  :xvPick(low,['rightupleg','upleg_r','r_thigh','thigh_r']),
    rLeg :xvPick(low,['rightleg','leg_r','r_calf','calf_r']),
    rFoot:xvPick(low,['rightfoot','foot_r','r_foot'])};
  /* en este rig 'Spine' es el pecho (padre de los hombros) y 'Spine02' la cintura: si la
     búsqueda devolvió el MISMO hueso para los dos, el torso quedaría de largo cero */
  if(b.low&&b.chest&&b.low===b.chest){
    const c=b.low.children&&b.low.children.find(c2=>c2.isBone);
    if(c)b.chest=(c.children&&c.children.find(c3=>c3.isBone))||c;
  }
  return b;
}
const xvWPos=(b,out)=>{b.updateWorldMatrix(true,false);return (out||_xvV).setFromMatrixPosition(b.matrixWorld);};

/* --- alta de un cuerpo del muñeco --- */
function xvRagBody(name,a,b,hx,hz,mass,sph){
  const len=Math.max(.06,a.distanceTo(b));
  const body=new CANNON.Body({mass,material:MAT.prop,linearDamping:.04,angularDamping:.14,
    allowSleep:true,sleepSpeedLimit:.13,sleepTimeLimit:.55});
  if(sph)body.addShape(new CANNON.Sphere(Math.max(.05,hx)));
  else body.addShape(new CANNON.Box(new CANNON.Vec3(hx,len*.5,hz)));
  /* orientación: el eje Y local del cuerpo apunta del hueso padre al hijo, igual que el eje Y
     del hueso en este rig (los hijos cuelgan en +Y) */
  _xvV3.copy(b).sub(a);
  if(_xvV3.lengthSq()<1e-8)_xvV3.set(0,1,0);
  _xvV3.normalize();
  _xvQ.setFromUnitVectors(_xvUp,_xvV3);
  body.quaternion.set(_xvQ.x,_xvQ.y,_xvQ.z,_xvQ.w);
  body.position.set((a.x+b.x)*.5,(a.y+b.y)*.5,(a.z+b.z)*.5);
  body.updateMassProperties();
  /* pseudo-prop: así la physgun, el arma y el describe() lo tratan como cualquier objeto.
     def._b lo pide pgOutStep (core_q) para dibujar el contorno; se lo damos armado a mano
     porque este "prop" no tiene partes ni pool. */
  const def={id:'xv_rag_'+name,name:'Munieco',mass,parts:[],
    _b:{groups:[],mats:[],shapes:[],size:[hx*2,len,hz*2],dy:0,ctr:[0,0,0]}};
  const fake={id:def.id,def,body,frozen:false,manual:true,mass,rag:1,hp:1e9,seq:0,pool:null,slot:-1};
  body.userData={prop:fake};
  world.addBody(body);
  RAG.bodies.push(body);
  return {name,body,len,fake};
}
function xvRagJoin(A,B,J,ang,tw){
  const c=new CANNON.ConeTwistConstraint(A,B,{
    pivotA:A.pointToLocalFrame(J,new CANNON.Vec3()),
    pivotB:B.pointToLocalFrame(J,new CANNON.Vec3()),
    axisA:new CANNON.Vec3(0,1,0),axisB:new CANNON.Vec3(0,1,0),
    angle:ang,twistAngle:tw,maxForce:1e6,collideConnected:false});
  world.addConstraint(c);RAG.cons.push(c);
  return c;
}
function xvRagOn(){
  if(RAG.on)return true;
  if(!charRoot)return false;
  const B=xvBoneMap(charRoot);
  if(!B||!B.hips||!B.low||!B.head||!B.lArm||!B.rArm||!B.lUp||!B.rUp)return false;
  RAG.bn=B;
  charRoot.updateMatrixWorld(true);
  /* pose congelada: los huesos que NO lleva un cuerpo (hombros, manos, pies, cuello, Spine01)
     se reponen a esta foto en cada frame, si no el mixer los sigue animando y el torso se
     retuerce por dentro del muñeco */
  RAG.snap.length=0;
  charRoot.traverse(o=>{if(o.isBone)RAG.snap.push([o,o.quaternion.clone(),o.position.clone()]);});
  /* escala del cuerpo: el jugador puede estar gigante o diminuto (experimentos 14/15) */
  const sc=RAG.sc=clamp(PL.h/1.8,.1,6);
  const P=n=>xvWPos(B[n],new THREE.Vector3());
  const hip=P('hips'),lo=P('low'),ch=B.chest?P('chest'):null,nk=B.neck?P('neck'):null,hd=P('head');
  const topT=nk||ch||hd;
  const laA=P('lArm'),laB=B.lFore?P('lFore'):null,laC=B.lHand?P('lHand'):null;
  const raA=P('rArm'),raB=B.rFore?P('rFore'):null,raC=B.rHand?P('rHand'):null;
  const llA=P('lUp'),llB=B.lLeg?P('lLeg'):null,llC=B.lFoot?P('lFoot'):null;
  const rlA=P('rUp'),rlB=B.rLeg?P('rLeg'):null,rlC=B.rFoot?P('rFoot'):null;
  /* si a un brazo o pierna le falta el hueso de la punta se extrapola: mejor un muñeco con un
     hueso estimado que ningún ragdoll */
  const ext=(a,b,f)=>b?b:new THREE.Vector3().copy(a).addScaledVector(_xvV3.copy(a).sub(hip).normalize(),f);
  const laB2=laB||ext(laA,null,.26*sc),laC2=laC||ext(laB2,null,.24*sc);
  const raB2=raB||ext(raA,null,.26*sc),raC2=raC||ext(raB2,null,.24*sc);
  const llB2=llB||ext(llA,null,.42*sc),llC2=llC||ext(llB2,null,.40*sc);
  const rlB2=rlB||ext(rlA,null,.42*sc),rlC2=rlC||ext(rlB2,null,.40*sc);
  /* las piernas se estiran un 15 % para tapar el pie (que no lleva cuerpo propio) */
  const stretch=(a,b)=>new THREE.Vector3().copy(a).addScaledVector(_xvV3.copy(b).sub(a),1.15);
  RAG.segs.length=0;RAG.bodies.length=0;RAG.cons.length=0;
  const S=RAG.segs;
  const pelvis=xvRagBody('pelvis',hip,lo,.17*sc,.12*sc,14);
  const torso =xvRagBody('torso', lo, topT,.18*sc,.12*sc,20);
  const head  =xvRagBody('head',  hd, new THREE.Vector3(hd.x,hd.y+.20*sc,hd.z),.125*sc,.125*sc,5,1);
  const lUpA  =xvRagBody('lArm',  laA,laB2,.058*sc,.058*sc,2.6);
  const lFoA  =xvRagBody('lFore', laB2,laC2,.050*sc,.050*sc,1.9);
  const rUpA  =xvRagBody('rArm',  raA,raB2,.058*sc,.058*sc,2.6);
  const rFoA  =xvRagBody('rFore', raB2,raC2,.050*sc,.050*sc,1.9);
  const lTh   =xvRagBody('lUp',   llA,llB2,.088*sc,.088*sc,7.2);
  const lSh   =xvRagBody('lLeg',  llB2,stretch(llB2,llC2),.072*sc,.072*sc,4.2);
  const rTh   =xvRagBody('rUp',   rlA,rlB2,.088*sc,.088*sc,7.2);
  const rSh   =xvRagBody('rLeg',  rlB2,stretch(rlB2,rlC2),.072*sc,.072*sc,4.2);
  S.push(pelvis,torso,head,lUpA,lFoA,rUpA,rFoA,lTh,lSh,rTh,rSh);
  /* --- qué hueso maneja cada cuerpo --- */
  pelvis.bone=B.hips;torso.bone=B.low;head.bone=B.head;
  lUpA.bone=B.lArm;lFoA.bone=B.lFore;rUpA.bone=B.rArm;rFoA.bone=B.rFore;
  lTh.bone=B.lUp;lSh.bone=B.lLeg;rTh.bone=B.rUp;rSh.bone=B.rLeg;
  /* delta constante cuerpo→hueso: poseWorld = bodyQ · D  (D = inv(bodyQ0)·boneQ0) */
  for(const s of S){
    if(!s.bone)continue;
    s.bone.updateWorldMatrix(true,false);
    s.bone.matrixWorld.decompose(_xvV,_xvQ2,_xvSc);
    _xvQ.set(s.body.quaternion.x,s.body.quaternion.y,s.body.quaternion.z,s.body.quaternion.w);
    s.D=_xvQ.clone().invert().multiply(_xvQ2);
    /* punto del hueso en coordenadas del cuerpo: la pelvis no está EN el hueso Hips sino en el
       medio del segmento, así que sin este offset el personaje quedaba medio metro arriba */
    s.off=s.body.pointToLocalFrame(_xvCp.set(_xvV.x,_xvV.y,_xvV.z),new CANNON.Vec3());
  }
  /* --- 10 restricciones: cadera, cuello, 2 hombros, 2 codos, 2 caderas, 2 rodillas --- */
  const J=(v)=>_xvCp.set(v.x,v.y,v.z);
  xvRagJoin(pelvis.body,torso.body, J(lo),   .55,.45);
  xvRagJoin(torso.body, head.body,  J(hd),   .70,.55);
  xvRagJoin(torso.body, lUpA.body,  J(laA), 1.15,.85);
  xvRagJoin(lUpA.body,  lFoA.body,  J(laB2), .95,.35);
  xvRagJoin(torso.body, rUpA.body,  J(raA), 1.15,.85);
  xvRagJoin(rUpA.body,  rFoA.body,  J(raB2), .95,.35);
  xvRagJoin(pelvis.body,lTh.body,   J(llA),  .95,.45);
  xvRagJoin(lTh.body,   lSh.body,   J(llB2), .85,.25);
  xvRagJoin(pelvis.body,rTh.body,   J(rlA),  .95,.45);
  xvRagJoin(rTh.body,   rSh.body,   J(rlB2), .85,.25);
  /* --- arranque: se hereda la velocidad del jugador + un envión para que caiga natural --- */
  const v=plBody.velocity;
  for(const s of S){
    s.body.velocity.set(v.x,v.y,v.z);
    s.body.angularVelocity.set((Math.random()-.5)*2.2,(Math.random()-.5)*1.6,(Math.random()-.5)*2.2);
    s.body.wakeUp();
  }
  torso.body.angularVelocity.x-=2.4;                /* se va de espaldas, no cae como plomada */
  /* --- la cápsula del jugador: fantasma que sigue a la pelvis (la cámara la usa) --- */
  RAG.pl.grp=plBody.collisionFilterGroup;RAG.pl.resp=plBody.collisionResponse;
  RAG.pl.fix=plBody.fixedRotation;RAG.pl.ad=plBody.angularDamping;RAG.pl.type=plBody.type;
  plBody.collisionResponse=false;
  plBody.collisionFilterGroup=2;                    /* fuera del alcance de aimRay (mask 1) */
  plBody.velocity.set(0,0,0);plBody.angularVelocity.set(0,0,0);
  plBody.type=CANNON.Body.KINEMATIC;
  PL.rag=true;RAG.on=true;RAG.t=0;RAG.netT=0;
  if(typeof xvOnRag==='function')nsafe(()=>xvOnRag(true),'xvonrag');
  xvSnd('hurt',{vol:.45});
  return true;
}
function xvRagOff(){
  if(!RAG.on)return false;
  /* dónde queda parado: la vertical de la pelvis, apoyado en lo primero que haya abajo */
  const pv=RAG.segs[0]&&RAG.segs[0].body;
  const px=pv?pv.position.x:plBody.position.x, pz=pv?pv.position.z:plBody.position.z;
  let py=pv?pv.position.y:plBody.position.y;
  if(pv){
    _xvCp.set(px,py+1.2,pz);_xvCb.set(px,py-6,pz);
    _xvRr.reset();world.raycastClosest(_xvCp,_xvCb,{skipBackfaces:true,collisionFilterMask:1},_xvRr);
    py=_xvRr.hasHit?_xvRr.hitPointWorld.y+.04:Math.max(.1,py);
  }
  for(const c of RAG.cons)nsafe(()=>world.removeConstraint(c),'xvrmc');
  for(const b of RAG.bodies)nsafe(()=>world.removeBody(b),'xvrmb');
  /* si la physgun estaba sosteniendo un hueso, se suelta: el cuerpo ya no existe */
  if(typeof grab!=='undefined'&&grab&&grab.rag){nsafe(()=>grabEnd(),'xvge');grab=null;}
  RAG.cons.length=0;RAG.bodies.length=0;RAG.segs.length=0;
  plBody.collisionFilterGroup=RAG.pl.grp;plBody.collisionResponse=RAG.pl.resp;
  plBody.type=RAG.pl.type||CANNON.Body.DYNAMIC;
  plBody.fixedRotation=true;plBody.angularDamping=1;
  plBody.quaternion.set(0,0,0,1);plBody.angularVelocity.set(0,0,0);
  plBody.velocity.set(0,0,0);
  plBody.updateMassProperties();
  plBody.position.set(px,py,pz);
  if(typeof plSync==='function')plSync();
  PL.rag=false;RAG.on=false;
  /* los huesos vuelven a la foto y el mixer sigue desde ahí: sin esto el primer frame de pie
     mezclaba la pose del muñeco tirado con la animación y el personaje quedaba retorcido */
  for(const s of RAG.snap){s[0].quaternion.copy(s[1]);s[0].position.copy(s[2]);}
  RAG.snap.length=0;
  if(charRoot)charRoot.updateMatrixWorld(true);
  PL.hp=Math.max(PL.hp,25);
  if(typeof heal==='function')heal(0);
  if(typeof xvOnRag==='function')nsafe(()=>xvOnRag(false),'xvonrag');
  xvSnd('sit',{vol:.5});
  return true;
}
/* pose: se llama en EXT.frame (después de animStep) — ver la nota (b) del encabezado */
function xvRagPose(){
  if(!RAG.on||!charRoot||!RAG.segs.length)return false;
  /* 1) reponer la foto: los huesos sin cuerpo dejan de animarse */
  for(const s of RAG.snap){s[0].quaternion.copy(s[1]);s[0].position.copy(s[2]);}
  /* 2) el grupo del personaje va a la pelvis, sin rotación: así los números locales quedan
     chicos y la matriz del padre de Hips es casi la identidad */
  const pv=RAG.segs[0];
  pv.body.pointToWorldFrame(pv.off,_xvCw);
  charRoot.position.set(_xvCw.x,_xvCw.y,_xvCw.z);
  charRoot.quaternion.set(0,0,0,1);
  charRoot.visible=true;
  charRoot.updateMatrixWorld(true);
  /* 3) cada hueso copia la orientación de su cuerpo (y la pelvis además su posición).
     Orden padre→hijo: cada updateMatrixWorld(true) deja el subárbol al día para el siguiente,
     que es exactamente lo que hace worldTwist en core_c. */
  for(let i=0;i<RAG.segs.length;i++){
    const s=RAG.segs[i],b=s.bone;
    if(!b||!b.parent)continue;
    if(i===0){
      s.body.pointToWorldFrame(s.off,_xvCw);
      _xvM4.copy(b.parent.matrixWorld).invert();
      b.position.copy(_xvV.set(_xvCw.x,_xvCw.y,_xvCw.z).applyMatrix4(_xvM4));
    }
    _xvQ.set(s.body.quaternion.x,s.body.quaternion.y,s.body.quaternion.z,s.body.quaternion.w);
    _xvQ.multiply(s.D);                       /* pose del hueso EN EL MUNDO */
    b.parent.getWorldQuaternion(_xvQ2);
    b.quaternion.copy(_xvQ2.invert().multiply(_xvQ));
    b.updateMatrixWorld(true);
  }
  /* 4) la cápsula del jugador sigue a la pelvis: la cámara, el escaneo de cercanía y el audio
     leen plBody.position y no tienen por qué saber que hay un ragdoll */
  plBody.position.set(_xvCw.x,_xvCw.y,_xvCw.z);
  plBody.velocity.set(0,0,0);
  if(typeof plSync==='function')plSync();
  return true;
}
/* placeChar: con el ragdoll real la pose la manda la física (se escribe en EXT.frame) */
const _xvPlace=placeChar;
placeChar=function(){
  if(RAG.on)return true;
  return _xvPlace.apply(this,arguments);
};
/* ragdoll(): el botón #bRag y hurt() pasan por acá. Si el rig no da (modelo sin cargar), se
   delega en el ragdoll viejo de core_b: es peor, pero es mejor que no pasar nada. */
const _xvRag0=ragdoll;
ragdoll=function(on){
  const want=(on==null)?!(PL.rag||RAG.on):!!on;
  if(want){
    if(RAG.on)return;
    if(nsafe(xvRagOn,'xvragon'))return;
    return _xvRag0.call(this,true);
  }
  if(RAG.on){nsafe(xvRagOff,'xvragoff');return;}
  return _xvRag0.call(this,false);
};
/* la physgun agarra huesos: core_q suelta todo lo agarrado que no esté en PROPS */
if(typeof pgOrphan==='function'){
  const _xvPgO=pgOrphan;
  pgOrphan=function(){
    if(typeof grab!=='undefined'&&grab&&grab.rag){
      if(!RAG.on||!grab.body.world){grab=null;return true;}
      return false;                                  /* está vivo: no es huérfano */
    }
    return _xvPgO.apply(this,arguments);
  };
}

/* el contorno amarillo de la physgun (core_q) se dibuja con el tamaño del DEF: un prop
   agrandado con el rayo quedaba con un halo del tamaño original, flotando adentro. Se
   multiplica DESPUÉS del original, que reescribe pgOut.scale en cada frame (así es idempotente). */
if(typeof pgOutStep==='function'&&typeof pgOut!=='undefined'){
  const _xvPgOut=pgOutStep;
  pgOutStep=function(){
    const r=_xvPgOut.apply(this,arguments);
    if(typeof grab!=='undefined'&&grab&&grab.xvk&&grab.xvk!==1&&pgOut.visible)
      pgOut.scale.multiplyScalar(grab.xvk);
    return r;
  };
}

/* ============================================================
   7. EL RAGDOLL EN MULTIJUGADOR
   ------------------------------------------------------------
   core_f ya manda r=1 en el paquete de estado y el fantasma se tumbaba de golpe a 0,9 rad.
   Acá se hacen dos cosas:
   a) POSE REAL por red. El paquete de estado lo arma una función privada del IIFE de NET, así
      que no se le pueden agregar campos; pero NET.pubRoom es público y NET.onProp es una
      propiedad ESCRIBIBLE. Se reutiliza el canal 'o' (props) con i:'__rag': el handler
      original arranca con `if(!PDEF[d.i])return;`, o sea que ya lo ignora, y acá se intercepta
      antes. 11 cuaterniones a 2 decimales = ~230 bytes, a 8 Hz y SÓLO mientras hay ragdoll.
   b) Si no llega pose (peer viejo, o paquete perdido), el fantasma cae PROGRESIVAMENTE en vez
      de aparecer tumbado: se guarda un reloj por fantasma y el ángulo va con dt.
   ============================================================ */
const XVRB=['pelvis','torso','head','lArm','lFore','rArm','rFore','lUp','lLeg','rUp','rLeg'];
const XVRBONE={pelvis:'hips',torso:'low',head:'head',lArm:'lArm',lFore:'lFore',
  rArm:'rArm',rFore:'rFore',lUp:'lUp',lLeg:'lLeg',rUp:'rUp',rLeg:'rLeg'};
const XVNET={pose:{},fall:{}};                 /* id de peer -> pose recibida / reloj de caída */
function xvRagSend(){
  if(!RAG.on||typeof NET==='undefined'||!NET.on||!NET.room)return false;
  const B=[];
  for(const s of RAG.segs){
    const b=s.bone;if(!b)continue;
    B.push(+b.quaternion.x.toFixed(2),+b.quaternion.y.toFixed(2),
           +b.quaternion.z.toFixed(2),+b.quaternion.w.toFixed(2));
  }
  nsafe(()=>NET.pubRoom({k:'o',id:NET.ID,i:'__rag',f:0,
    p:[+charRoot.position.x.toFixed(2),+charRoot.position.y.toFixed(2),+charRoot.position.z.toFixed(2)],
    q:[0,0,0,1],B:B}),'xvragsend');
  return true;
}
if(typeof NET!=='undefined'&&NET){
  const _xvOnProp=NET.onProp;
  NET.onProp=d=>{
    if(d&&d.i==='__rag'){XVNET.pose[d.id]={t:performance.now(),p:d.p,B:d.B};return;}
    if(_xvOnProp)_xvOnProp(d);
  };
}
/* ghostsStep envuelto: primero el original (posición, animación, arma) y después el ragdoll */
if(typeof ghostsStep==='function'){
  const _xvGStep=ghostsStep;
  ghostsStep=function(dt){
    const r=_xvGStep.apply(this,arguments);
    nsafe(()=>xvGhostRag(dt||0),'xvgrag');
    return r;
  };
}
function xvGhostRag(dt){
  if(typeof GH==='undefined')return 0;
  let n=0;
  const now=performance.now();
  for(const id in GH){
    const g=GH[id],p=NET.peers[id];
    if(!g||!p)continue;
    if(!p.rag){ if(XVNET.fall[id])delete XVNET.fall[id]; if(XVNET.pose[id])delete XVNET.pose[id]; continue; }
    n++;
    const po=XVNET.pose[id];
    if(po&&now-po.t<700&&po.B&&po.B.length>=44&&g.real){
      /* pose REAL: los huesos del clon tienen los mismos nombres que el original */
      if(!g._xvB)g._xvB=xvBoneMap(g.root);
      const BM=g._xvB;
      if(BM){
        for(let i=0;i<XVRB.length;i++){
          const b=BM[XVRBONE[XVRB[i]]];if(!b)continue;
          const o=i*4;
          b.quaternion.set(po.B[o],po.B[o+1],po.B[o+2],po.B[o+3]).normalize();
        }
        if(po.p)g.root.position.set(po.p[0],po.p[1],po.p[2]);
        g.root.rotation.set(0,0,0);
        g.root.updateMatrixWorld(true);
        continue;
      }
    }
    /* respaldo: caída procedural PROGRESIVA (antes era un salto instantáneo a 0.9 rad) */
    const f=XVNET.fall[id]=(XVNET.fall[id]||0)+dt;
    const k=1-Math.exp(-f*3.4);                     /* 95 % en ~0,9 s */
    g.root.rotation.set(1.45*k,g.h+Math.PI,.22*Math.sin(f*2.1)*k);
    g.root.position.y=g.y-.02-.42*k;
  }
  return n;
}

/* ============================================================
   8. VIGILANCIA: nada queda prendido al salir de la partida
   ============================================================ */
let xvApp=APP;
function xvWatchApp(){
  const inGame=(APP==='play'||APP==='pause'||APP==='spawn');
  const was=(xvApp==='play'||xvApp==='pause'||xvApp==='spawn');
  xvApp=APP;
  if(was&&!inGame){
    for(const x of XP.list())if(x.id.indexOf('xpv_')===0&&x.run)XP.stop(x.id);
    if(RAG.on)nsafe(xvRagOff,'xvragq');
    xvRestoreAll();
    xvTime(1);xvBounce(null);xvFric(null);
    XV.ice=1;XV.jumps=1;XV.fly=20;XV.giantStomp=0;
    PL.noclip=false;
    xvFlyPaint();
  }
  return inGame;
}

/* ============================================================
   9. BOTÓN FLOTANTE DE VUELO (el enunciado lo pide "controlado con botón")
   ------------------------------------------------------------
   Se cuelga de #hud y se posiciona en vmin, igual que #xpBtn de core_u: vmin coincide con el
   lado corto del escenario esté el teléfono vertical u horizontal, así que el botón cae en el
   mismo lugar con la pantalla rotada 90°. Se muestra/esconde con una CLASE (no con
   style.display) por la misma razón que documenta core_u: un display:none en la hoja le gana
   al inline vacío.
   ============================================================ */
const xvFlyBtn=document.createElement('div');
xvFlyBtn.id='xvFly';
nsafe(()=>{
  const st=document.createElement('style');
  st.textContent='#xvFly{position:absolute;right:2vmin;bottom:42vmin;z-index:12;'+
    'pointer-events:auto;background:rgba(20,24,30,.82);border:1px solid rgba(140,220,255,.55);'+
    'border-radius:12px;padding:9px 14px;color:#fff;font:800 13px system-ui,sans-serif;'+
    'white-space:nowrap;display:none;text-shadow:0 1px 2px #000}'+
    '#xvFly.on{display:block}#xvFly.act{background:rgba(60,120,160,.92);border-color:#8ef}';
  document.head.appendChild(st);
  const h=$('hud');if(h)h.appendChild(xvFlyBtn);
},'xvflybtn');
function xvFlyPaint(){
  const show=!!(APP==='play'&&XP.running('xpv_fly'));
  xvFlyBtn.classList.toggle('on',show);
  xvFlyBtn.classList.toggle('act',!!PL.noclip);
  xvFlyBtn.textContent=(PL.noclip?'🕊 ':'🕊 ')+(PL.noclip?'ON':'OFF');
  return show;
}
const xvFlyTap=e=>{
  if(e){e.preventDefault();e.stopPropagation();}
  const x=XP.of('xpv_fly');
  if(x)XP.set('xpv_fly','on',!PL.noclip);
  else xvFlySet(!PL.noclip);
  return PL.noclip;
};
xvFlyBtn.addEventListener('touchstart',xvFlyTap,{passive:false});
xvFlyBtn.addEventListener('mousedown',xvFlyTap);
function xvFlySet(on){
  PL.noclip=!!on;
  if(PL.noclip){plBody.velocity.set(0,0,0);plBody.wakeUp();}
  else plBody.velocity.y=Math.min(0,plBody.velocity.y);
  xvFlyPaint();
  return PL.noclip;
}

/* ============================================================
   10. LOS 26 EXPERIMENTOS
   ------------------------------------------------------------
   XVT guarda, para cada uno, una PRUEBA numérica que __H.xpvTest() corre de un tirón: sin eso
   "anda" es una opinión. Cada prueba enciende el experimento, mide algo que sólo puede haber
   cambiado si el efecto es real, y lo apaga.
   ============================================================ */
const XVT={};
/* números que dejó la última corrida de cada prueba: sin esto, un test que devuelve false no
   dice POR QUÉ y hay que adivinar (me pasó con el imán) */
const XVDBG={};
const xvAdd=(o,test)=>{const x=XP.add(o);if(test)XVT[o.id]=test;return x;};
/* Interruptor de encendido, val:true a propósito. NO se usa `auto:true` de core_u junto con un
   interruptor: el arranque automático vuelve a prender el experimento 0,25 s después de que el
   jugador lo apaga con el switch (core_u re-lanza todo xp.auto que no esté corriendo), o sea
   que el switch quedaba inservible. Con val:true, abrir el panel (que ya llama a xpRun) deja el
   switch y la realidad diciendo lo mismo; xvSync los mantiene pegados desde start/stop. */
const xvOnOff=()=>({k:'on',t:'switch',label:'Encendido',val:true,on:(x,v)=>{v?x.run():x.stop();}});
const xvSync=(c,v)=>{if(!!c.get('on')!==!!v)c.set('on',v);};
const xvRst=fn=>({t:'botones',items:[{label:T('xpReset')||'↺ Volver a normal',v:1}],on:fn});

/* ---------- 1. PHYSGUN QUE AGRANDA ---------- */
xvAdd({
  id:'xpv_grow',name:'RayoCrecer',cat:'tamaño',near:2.5,btn:'🔼 Rayo que agranda',
  desc:'Mientras sostenés algo con la physgun, crece de verdad: malla y cuerpo físico, hasta x8.',
  stopOnGone:true,
  ui:{title:'Agrandar',controls:[
    {k:'r',t:'slider',label:'Velocidad',min:.2,max:4,step:.1,val:1.2,unit:'/s'},
    {k:'max',t:'slider',label:'Escala máxima',min:1.5,max:8,step:.1,val:8,unit:'x'},
    {k:'auto',t:'switch',label:'Crecer al sostener',val:true},
    {t:'botones',label:'De golpe al que apunto',items:[{label:'x2',v:2},{label:'x4',v:4},{label:'x8',v:8}],
     on:(c,v)=>{const p=xvTarget();
       if(!p){c.toast('🔍 apuntá a un objeto');return;}
       xvPropK(p,v,true);xvSnd('spawn',{vol:.6,at:p.body.position});
       c.toast('🔼 '+p.def.name+' x'+v);}},
    {t:'texto',label:'Objetivo',live:c=>{const p=xvTarget();
      return p?('<b>'+p.def.name+'</b> · escala <b>x'+(p.xvk||1).toFixed(2)+'</b> · masa <b>'+
        p.body.mass.toFixed(1)+' kg</b>'):'apuntá o agarrá algo con la physgun';}},
    xvRst(c=>{c.toast('↺ '+xvRestoreAll()+' objetos a 1x');})
  ]},
  step:(c,dt)=>{
    if(!c.get('auto'))return;
    if(typeof grab==='undefined'||!grab||grab.rag)return;
    const k=(grab.xvk||1)*(1+c.get('r')*dt);
    if(k<=c.get('max'))xvPropK(grab,k,false);
  }
},()=>{
  const p=xvSpawnTest('i_crate_big');if(!p)return false;
  xvPropK(p,3,true);
  const ok=Math.abs((p.xvk||1)-3)<.01&&p.body.mass>p.def.mass*20;
  xvPropK(p,1,false);removeProp(p);return ok;
});

/* ---------- 2. PHYSGUN QUE ACHICA ---------- */
xvAdd({
  id:'xpv_shrink',name:'RayoAchicar',cat:'tamaño',near:2.5,btn:'🔽 Rayo que achica',
  desc:'Lo contrario: lo que sostenés se encoge hasta x0.1, con su masa y su colisión.',
  stopOnGone:true,
  ui:{title:'Achicar',controls:[
    {k:'r',t:'slider',label:'Velocidad',min:.2,max:4,step:.1,val:1.2,unit:'/s'},
    {k:'min',t:'slider',label:'Escala mínima',min:.1,max:.9,step:.05,val:.1,unit:'x'},
    {k:'auto',t:'switch',label:'Achicar al sostener',val:true},
    {t:'botones',label:'De golpe al que apunto',items:[{label:'x0.5',v:.5},{label:'x0.25',v:.25},{label:'x0.1',v:.1}],
     on:(c,v)=>{const p=xvTarget();
       if(!p){c.toast('🔍 apuntá a un objeto');return;}
       xvPropK(p,v,false);xvSnd('pop',{vol:.6,at:p.body.position});
       c.toast('🔽 '+p.def.name+' x'+v);}},
    {t:'texto',label:'Objetivo',live:c=>{const p=xvTarget();
      return p?('<b>'+p.def.name+'</b> · escala <b>x'+(p.xvk||1).toFixed(2)+'</b>'):'apuntá o agarrá algo';}},
    xvRst(c=>{c.toast('↺ '+xvRestoreAll()+' objetos a 1x');})
  ]},
  step:(c,dt)=>{
    if(!c.get('auto'))return;
    if(typeof grab==='undefined'||!grab||grab.rag)return;
    const k=(grab.xvk||1)/(1+c.get('r')*dt);
    if(k>=c.get('min'))xvPropK(grab,k,false);
  }
},()=>{
  const p=xvSpawnTest('i_crate_big');if(!p)return false;
  xvPropK(p,.2,false);
  const ok=Math.abs((p.xvk||1)-.2)<.01&&p.body.mass<p.def.mass;
  xvPropK(p,1,false);removeProp(p);return ok;
});

/* ---------- 3. ESCALA LIBRE CON SLIDER ---------- */
xvAdd({
  id:'xpv_scale',name:'DialEscala',cat:'tamaño',near:2.5,btn:'🎚 Escala libre',
  desc:'Un dial: el objeto que sostenés (o al que apuntás) toma exactamente esta escala.',
  stopOnGone:true,
  ui:{title:'Escala libre',controls:[
    {k:'k',t:'slider',label:'Escala',min:.1,max:8,step:.05,val:1,unit:'x',
     on:(c,v)=>{const p=xvTarget();if(p)xvPropK(p,v,v>(p.xvk||1));}},
    {t:'botones',label:'Atajos',items:[{label:'0.1x',v:.1},{label:'0.5x',v:.5},{label:'1x',v:1},
      {label:'3x',v:3},{label:'8x',v:8}],on:(c,v)=>c.set('k',v)},
    {k:'live',t:'switch',label:'Seguir mientras sostengo',val:true},
    {t:'texto',label:'Objetivo',live:c=>{const p=xvTarget();
      return p?('<b>'+p.def.name+'</b> · x'+(p.xvk||1).toFixed(2)+' · '+
        p.body.mass.toFixed(1)+' kg'):'nada en la mira'}},
    xvRst(c=>{c.set('k',1);c.toast('↺ '+xvRestoreAll()+' objetos a 1x');})
  ]},
  step:c=>{
    if(!c.get('live'))return;
    if(typeof grab==='undefined'||!grab||grab.rag)return;
    const k=c.get('k');
    if(Math.abs((grab.xvk||1)-k)>.002)xvPropK(grab,k,false);
  }
},()=>{
  const p=xvSpawnTest('i_crate_big');if(!p)return false;
  const s0=buildDef(p.def).size[0];
  xvPropK(p,4,true);
  const r=p.body.shapes[0]&&p.body.shapes[0].boundingSphereRadius;
  const ok=Math.abs((p.xvk||1)-4)<.01&&r>0&&s0>0;
  xvPropK(p,1,false);removeProp(p);return ok;
});

/* ---------- 4. MASA MODIFICABLE ---------- */
xvAdd({
  id:'xpv_mass',name:'BalanzaMasa',cat:'física',near:2.5,btn:'⚖ Cambiar la masa',
  desc:'Pluma o plomo: cambia la masa real del cuerpo (y el roce con el aire si es muy liviano).',
  stopOnGone:true,
  ui:{title:'Masa',controls:[
    {k:'m',t:'slider',label:'Multiplicador',min:.01,max:40,step:.01,val:1,unit:'x',
     fmt:v=>v<1?('x'+(+v).toFixed(2)):('x'+(+v).toFixed(1)),
     on:(c,v)=>{const p=xvTarget();if(p)xvPropM(p,v);}},
    {k:'pre',t:'lista',label:'Preajuste',val:'norm',
     items:[{label:'🪶 Pluma',v:'feat'},{label:'📦 Normal',v:'norm'},{label:'🧱 Plomo',v:'lead'}],
     on:(c,v)=>{c.set('m',{feat:.02,norm:1,lead:25}[v]||1);}},
    {t:'botones',label:'Aplicar',items:[{label:'Al que apunto',v:1},{label:'A todos',v:2}],
     on:(c,v)=>{
       if(v===1){const p=xvTarget();if(!p){c.toast('🔍 apuntá a un objeto');return;}
         xvPropM(p,c.get('m'));c.toast('⚖ '+p.def.name+' '+p.body.mass.toFixed(1)+' kg');return;}
       let n=0;for(const p of PROPS){if(p.frozen)continue;xvPropM(p,c.get('m'));n++;}
       c.toast('⚖ '+n+' objetos');}},
    {t:'texto',label:'Objetivo',live:c=>{const p=xvTarget();
      return p?('<b>'+p.def.name+'</b> · def <b>'+p.def.mass+' kg</b> → ahora <b>'+
        p.body.mass.toFixed(2)+' kg</b>'):'nada en la mira';}},
    xvRst(c=>{c.set('pre','norm');c.toast('↺ '+xvRestoreAll()+' objetos');})
  ]}
},()=>{
  const p=xvSpawnTest('i_crate_big');if(!p)return false;
  xvPropM(p,20);const heavy=p.body.mass;
  xvPropM(p,.02);const light=p.body.mass,damp=p.body.linearDamping;
  const ok=heavy>p.def.mass*15&&light<p.def.mass*.05&&damp>.3;
  xvPropM(p,1);removeProp(p);return ok;
});

/* ---------- 5. GRAVEDAD DEL MUNDO ---------- */
const XVG0=world.gravity.y;
xvAdd({
  id:'xpv_grav',name:'TorreGravedad',cat:'física',near:2.8,btn:'🌍 Gravedad del mundo',
  desc:'De 0 a 3x, y negativa: todo se cae para arriba. Se restaura al apagar.',
  auto:false,stopOnGone:true,
  ui:{title:'Gravedad',controls:[
    {k:'g',t:'slider',label:'Gravedad',min:-1,max:3,step:.05,val:1,unit:'x',
     on:(c,v)=>{if(c.on())xvGrav(v);}},
    {t:'botones',label:'Atajos',items:[{label:'⬆ -1x',v:-1},{label:'0',v:0},
      {label:'🌙 0.16x',v:.16},{label:'1x',v:1},{label:'3x',v:3}],on:(c,v)=>c.set('g',v)},
    {t:'texto',label:'Ahora',live:()=>'world.gravity.y = <b>'+world.gravity.y.toFixed(2)+
      '</b> m/s² (normal '+XVG0.toFixed(1)+')'},
    xvRst(c=>{c.set('g',1);c.toast('🌍 gravedad normal');})
  ]},
  start:c=>xvGrav(c.get('g')),
  stop:()=>xvGrav(1)
},()=>{
  XP.run('xpv_grav');XP.set('xpv_grav','g',-1);
  const inv=world.gravity.y>0;
  XP.stop('xpv_grav');
  return inv&&Math.abs(world.gravity.y-XVG0)<.01;
});
function xvGrav(k){
  world.gravity.y=XVG0*clamp(+k,-1,3);
  for(const p of PROPS)if(!p.frozen)p.body.wakeUp();
  return world.gravity.y;
}

/* ---------- 6. ZONA ANTIGRAVEDAD (sólo para los props de alrededor) ---------- */
xvAdd({
  id:'xpv_agrav',name:'PlacaAntigrav',cat:'física',near:2.4,btn:'🫧 Zona antigravedad',
  desc:'Una burbuja alrededor de la placa: adentro la gravedad es la que digas, afuera la normal.',
  stopOnGone:true,
  ui:{title:'Antigravedad',controls:[
    xvOnOff(),
    {k:'R',t:'slider',label:'Radio',min:1.5,max:16,step:.5,val:6,unit:' m'},
    {k:'g',t:'slider',label:'Gravedad adentro',min:-1,max:1,step:.05,val:0,unit:'x'},
    {k:'pl',t:'switch',label:'Afecta al jugador',val:false},
    {t:'texto',label:'Estado',live:c=>c.on()
      ?('flotando <b>'+(c.mem.n||0)+'</b> objetos en '+c.get('R').toFixed(1)+' m')
      :'apagado'}
  ]},
  start:c=>{c.mem.n=0;xvSync(c,true);},
  stop:c=>{xvSync(c,false);},
  step:(c,dt)=>{
    const p=c.prop;if(!p)return;
    const R=c.get('R'),g=c.get('g'),cx=p.body.position.x,cy=p.body.position.y,cz=p.body.position.z;
    const need=1-g;                       /* cuánta gravedad hay que CANCELAR */
    c.mem.n=xvArea(cx,cy,cz,R,q=>{
      if(q===p||q.frozen)return false;
      q.body.wakeUp();
      _xvF.set(0,q.body.mass*(-world.gravity.y)*need,0);
      q.body.applyForce(_xvF,_xvZ);
      /* un poco de amortiguación adentro: si no, la burbuja escupe los props para arriba */
      q.body.velocity.y*=1-Math.min(.5,dt*1.6);
    });
    if(c.get('pl')&&!PL.rag&&!PL.noclip){
      const d=Math.hypot(plBody.position.x-cx,plBody.position.y-cy,plBody.position.z-cz);
      if(d<R)plBody.velocity.y+=(-world.gravity.y)*need*dt;
    }
  }
},()=>{
  const pod=xvSpawnTest('xpv_agrav',1);if(!pod)return false;
  const box=xvSpawnTest('i_crate_big',0,2.2);if(!box){removeProp(pod);return false;}
  box.body.position.set(pod.body.position.x,pod.body.position.y+2.2,pod.body.position.z);
  box.manual=true;box.body.allowSleep=false;box.body.wakeUp();
  const x=XP.of('xpv_agrav');
  XP.run('xpv_agrav',pod);XP.set('xpv_agrav','g',0);XP.set('xpv_agrav','R',8);
  const y0=box.body.position.y;
  for(let i=0;i<50;i++){world.step(1/60,1/60,1);x.step(x.ctx,1/60);}
  const dy=box.body.position.y-y0;
  XP.stop('xpv_agrav');removeProp(box);removeProp(pod);
  return dy>-.35;                         /* con gravedad cancelada casi no baja */
});

/* ---------- 7. TIEMPO LENTO / BALA ---------- */
xvAdd({
  id:'xpv_time',name:'RelojTiempo',cat:'física',near:2.5,btn:'⏱ Tiempo lento',
  desc:'Escala el paso de la física y del mixer de animación. 0.1x = tiempo bala.',
  stopOnGone:true,
  ui:{title:'Tiempo',controls:[
    {k:'ts',t:'slider',label:'Escala de tiempo',min:.05,max:3,step:.05,val:.25,unit:'x',
     on:(c,v)=>{if(c.on())xvTime(v);}},
    {t:'botones',label:'Atajos',items:[{label:'🐌 0.1x',v:.1},{label:'0.25x',v:.25},
      {label:'1x',v:1},{label:'⚡ 2x',v:2}],on:(c,v)=>c.set('ts',v)},
    {t:'texto',label:'Ahora',live:()=>'física <b>x'+XV.ts.toFixed(2)+'</b> · mixer <b>x'+
      (mixer?mixer.timeScale.toFixed(2):'—')+'</b>'},
    xvRst(c=>{c.set('ts',1);c.toast('⏱ tiempo normal');})
  ]},
  start:c=>xvTime(c.get('ts')),
  stop:()=>xvTime(1)
},()=>{
  const p=xvSpawnTest('i_crate_big',0,6);if(!p)return false;
  p.body.velocity.set(0,0,0);p.manual=true;p.body.allowSleep=false;p.body.wakeUp();
  const y0=p.body.position.y;
  XP.run('xpv_time');XP.set('xpv_time','ts',.1);
  for(let i=0;i<30;i++)world.step(1/60,1/60,3);
  const slow=y0-p.body.position.y;
  XP.stop('xpv_time');
  p.body.position.y=y0;p.body.velocity.set(0,0,0);
  for(let i=0;i<30;i++)world.step(1/60,1/60,3);
  const fast=y0-p.body.position.y;
  removeProp(p);
  return XV.ts===1&&fast>slow*2.5;
});

/* ---------- 8. REBOTE DEL MUNDO ---------- */
xvAdd({
  id:'xpv_bounce',name:'PelotaRebote',cat:'física',near:2.4,btn:'🏀 Rebote del mundo',
  desc:'La restitución de todos los contactos del mundo, menos los del jugador (esos son 0 a propósito).',
  stopOnGone:true,
  ui:{title:'Rebote',controls:[
    {k:'r',t:'slider',label:'Restitución',min:0,max:.98,step:.02,val:.85,
     on:(c,v)=>{if(c.on())xvBounce(v);}},
    {t:'botones',label:'Atajos',items:[{label:'Plomo 0',v:0},{label:'Normal',v:.07},
      {label:'Goma .6',v:.6},{label:'Loco .95',v:.95}],on:(c,v)=>c.set('r',v)},
    {t:'texto',label:'Ahora',live:()=>{const e=XVCM[0];
      return 'contactos: <b>'+(e?e.cm.restitution.toFixed(2):'—')+'</b> (de fábrica '+
        (e?e.r.toFixed(2):'—')+')';}},
    xvRst(c=>{xvBounce(null);c.toast('🏀 rebote normal');})
  ]},
  start:c=>xvBounce(c.get('r')),
  stop:()=>xvBounce(null)
},()=>{
  XP.run('xpv_bounce');XP.set('xpv_bounce','r',.9);
  const hi=XVCM[0]&&XVCM[0].cm.restitution;
  XP.stop('xpv_bounce');
  const back=XVCM[0]&&XVCM[0].cm.restitution;
  return hi>.85&&Math.abs(back-XVCM[0].r)<.001;
});

/* ---------- 9. FRICCIÓN / HIELO ---------- */
xvAdd({
  id:'xpv_ice',name:'LosaHielo',cat:'física',near:2.6,btn:'🧊 Hielo y fricción',
  desc:'Baja el roce de todo el mundo Y la adherencia del jugador (el motor le fija la velocidad, así que el roce de cannon no le llega).',
  stopOnGone:true,
  ui:{title:'Fricción',controls:[
    {k:'f',t:'slider',label:'Fricción del piso',min:0,max:1.2,step:.02,val:.02,
     on:(c,v)=>{if(c.on())xvFric(v);}},
    {k:'pl',t:'slider',label:'Adherencia del jugador',min:0,max:1,step:.02,val:.06,unit:'x',
     on:(c,v)=>{if(c.on())XV.ice=v;}},
    {t:'botones',label:'Atajos',items:[{label:'🧊 Hielo',v:0},{label:'Normal',v:1},{label:'🪵 Agarre',v:2}],
     on:(c,v)=>{const P=[[0,0],[.5,1],[1.2,1]][v===0?0:(v===1?1:2)];
       c.set('f',P[0]);c.set('pl',P[1]);}},
    {t:'texto',label:'Ahora',live:()=>'contactos <b>'+(XVCM[0]?XVCM[0].cm.friction.toFixed(2):'—')+
      '</b> · jugador <b>x'+XV.ice.toFixed(2)+'</b> · vel <b>'+
      Math.hypot(plBody.velocity.x,plBody.velocity.z).toFixed(1)+' m/s</b>'},
    xvRst(c=>{c.set('f',.5);c.set('pl',1);c.toast('🧊 fricción normal');})
  ]},
  start:c=>{xvFric(c.get('f'));XV.ice=c.get('pl');},
  stop:()=>{xvFric(null);XV.ice=1;}
},()=>{
  XP.run('xpv_ice');XP.set('xpv_ice','f',0);XP.set('xpv_ice','pl',0);
  const f=XVCM[0]&&XVCM[0].cm.friction,ice=XV.ice;
  XP.stop('xpv_ice');
  return f===0&&ice===0&&XV.ice===1&&Math.abs(XVCM[0].cm.friction-XVCM[0].f)<.001;
});

/* ---------- 10. SALTO ALTO ---------- */
xvAdd({
  id:'xpv_jump',name:'RampaSalto',cat:'jugador',near:2.5,btn:'🦘 Salto alto',
  desc:'La fuerza de salto (m/s de arranque). La altura sale de v²/2g, así que se mide.',
  stopOnGone:true,
  ui:{title:'Salto',controls:[
    {k:'j',t:'slider',label:'Fuerza de salto',min:4,max:34,step:.5,val:16,unit:' m/s',
     on:(c,v)=>{if(c.on()){XPM.jump=v;xpMotion();}}},
    {t:'botones',label:'Atajos',items:[{label:'Normal',v:XPM0.jump},{label:'🌙 Luna',v:14},
      {label:'🚀 Cohete',v:26},{label:'😵 Bestia',v:34}],on:(c,v)=>c.set('j',v)},
    {t:'texto',label:'Ahora',live:()=>'PL.jump <b>'+PL.jump.toFixed(1)+' m/s</b> → altura ≈ <b>'+
      (PL.jump*PL.jump/(2*Math.abs(world.gravity.y))).toFixed(2)+' m</b>'},
    xvRst(c=>{c.set('j',XPM0.jump);c.toast('🦘 salto normal');})
  ]},
  start:c=>{XPM.jump=c.get('j');xpMotion();},
  stop:()=>{XPM.jump=XPM0.jump;xpMotion();}
},()=>{
  XP.run('xpv_jump');XP.set('xpv_jump','j',30);
  const hi=PL.jump;XP.stop('xpv_jump');
  return hi>=29&&Math.abs(PL.jump-XPM0.jump*(XPZ.mv?Math.sqrt(XPZ.k):1))<.3;
});

/* ---------- 11. DOBLE / TRIPLE SALTO ---------- */
xvAdd({
  id:'xpv_djump',name:'TripleEscalon',cat:'jugador',near:2.5,btn:'🪂 Saltos en el aire',
  desc:'Saltos extra en el aire. Se engancha al FLANCO de la tecla de salto cuando ya no hay coyote.',
  stopOnGone:true,
  ui:{title:'Saltos',controls:[
    {k:'n',t:'numero',label:'Saltos totales',min:1,max:5,step:1,val:3,
     on:(c,v)=>{if(c.on())XV.jumps=v|0;}},
    {t:'botones',label:'Atajos',items:[{label:'1',v:1},{label:'2',v:2},{label:'3',v:3},{label:'5',v:5}],
     on:(c,v)=>c.set('n',v)},
    {t:'texto',label:'Ahora',live:()=>'permitidos <b>'+XV.jumps+'</b> · usados en el aire <b>'+
      XV.jUsed+'</b> · en el piso: '+(grounded?'sí':'no')}
  ]},
  start:c=>{XV.jumps=c.get('n')|0;XV.jUsed=0;},
  stop:()=>{XV.jumps=1;XV.jUsed=0;}
},()=>{
  XP.run('xpv_djump');XP.set('xpv_djump','n',3);
  const on=XV.jumps===3;
  /* simulación del flanco en el aire: sin piso y sin coyote, el salto extra tiene que entrar */
  const y0=plBody.position.y;
  plBody.position.y=y0+6;plSync();plBody.velocity.set(0,-4,0);
  K.jump=0;XV.jPrev=0;XV.jUsed=0;grounded=false;coyote=0;
  playerStep(1/60);
  K.jump=1;playerStep(1/60);
  const used=XV.jUsed,vy=plBody.velocity.y;
  K.jump=0;playerStep(1/60);
  XP.stop('xpv_djump');
  plBody.position.y=y0;plSync();plBody.velocity.set(0,0,0);
  return on&&used===1&&vy>2&&XV.jumps===1;
});

/* ---------- 12. CORRER SÚPER RÁPIDO ---------- */
xvAdd({
  id:'xpv_sprint',name:'CintaVeloz',cat:'jugador',near:2.5,btn:'💨 Correr rapidísimo',
  desc:'Velocidad de correr, con difuminado de movimiento si el Ultra 4K está prendido.',
  stopOnGone:true,
  ui:{title:'Velocidad',controls:[
    {k:'run',t:'slider',label:'Correr',min:6,max:60,step:1,val:26,unit:' m/s',
     on:(c,v)=>{if(c.on()){XPM.run=v;XPM.spd=Math.min(XPM.spd,v);xpMotion();}}},
    {t:'botones',label:'Atajos',items:[{label:'Normal',v:XPM0.run},{label:'x2',v:XPM0.run*2},
      {label:'x4',v:XPM0.run*4},{label:'60',v:60}],on:(c,v)=>c.set('run',Math.round(v))},
    {k:'mb',t:'switch',label:'Difuminado de movimiento',val:true,
     on:(c,v)=>{if(c.on())xvMblur(v);}},
    {t:'texto',label:'Ahora',live:()=>'PL.run <b>'+PL.run.toFixed(1)+'</b> m/s · vel real <b>'+
      Math.hypot(plBody.velocity.x,plBody.velocity.z).toFixed(1)+'</b> m/s'+
      (SV.ultra?(SV.mblur?' · blur ON':' · blur OFF'):' · (Ultra apagado: sin blur)')},
    xvRst(c=>{c.set('run',XPM0.run);c.toast('💨 velocidad normal');})
  ]},
  start:c=>{XPM.run=c.get('run');xpMotion();xvMblur(c.get('mb'));},
  stop:()=>{XPM.run=XPM0.run;XPM.spd=XPM0.spd;xpMotion();xvMblur(false);}
},()=>{
  XP.run('xpv_sprint');XP.set('xpv_sprint','run',48);
  const hi=PL.run;XP.stop('xpv_sprint');
  return hi>=47&&Math.abs(PL.run-XPM0.run*(XPZ.mv?Math.pow(XPZ.k,.75):1))<.4;
});
/* el difuminado sólo existe con Ultra 4K prendido (core_s): si no está, no se toca nada */
let XVMB0=null;
function xvMblur(on){
  if(!SV.ultra)return false;
  if(XVMB0===null)XVMB0=!!SV.mblur;
  SV.mblur=on?true:XVMB0;
  if(typeof gfxApply==='function')nsafe(gfxApply,'xvmb');
  return !!SV.mblur;
}

/* ---------- 13. VUELO LIBRE ---------- */
xvAdd({
  id:'xpv_fly',name:'PlacaVuelo',cat:'jugador',near:2.5,btn:'🕊 Vuelo libre',
  desc:'Noclip controlado: se prende con el botón 🕊 del HUD y la velocidad va por slider.',
  stopOnGone:true,
  ui:{title:'Vuelo',controls:[
    {k:'on',t:'switch',label:'Volar (también con el botón 🕊)',val:false,
     on:(c,v)=>xvFlySet(v)},
    {k:'spd',t:'slider',label:'Velocidad',min:4,max:80,step:1,val:20,unit:' m/s',
     on:(c,v)=>{XV.fly=v;}},
    {t:'texto',label:'Ahora',live:()=>'noclip <b>'+(PL.noclip?'ON':'OFF')+'</b> · '+XV.fly+
      ' m/s · altura <b>'+plBody.position.y.toFixed(1)+' m</b>'},
    xvRst(c=>{c.set('on',false);c.set('spd',20);c.toast('🕊 apagado');})
  ]},
  start:c=>{XV.fly=c.get('spd');if(c.get('on'))xvFlySet(true);xvFlyPaint();},
  stop:()=>{xvFlySet(false);XV.fly=20;xvFlyPaint();}
},()=>{
  XP.run('xpv_fly');XP.set('xpv_fly','spd',60);XP.set('xpv_fly','on',true);
  const on=PL.noclip&&XV.fly===60&&xvFlyBtn.classList.contains('on');
  XP.stop('xpv_fly');
  return on&&!PL.noclip;
});

/* ---------- 14. HACERTE GIGANTE ---------- */
xvAdd({
  id:'xpv_giant',name:'PortalGigante',cat:'jugador',near:2.8,btn:'🦖 Hacerte gigante',
  desc:'Escala del jugador de 1 a 5: modelo, cápsula, cámara, zancada y salto. Y la pisada sacude.',
  stopOnGone:true,
  ui:{title:'Gigante',controls:[
    {k:'k',t:'slider',label:'Escala',min:1,max:5,step:.05,val:3,unit:'x',
     on:(c,v)=>{if(c.on())xpSize(v);}},
    {t:'botones',label:'Atajos',items:[{label:'1x',v:1},{label:'2x',v:2},{label:'3x',v:3},{label:'5x',v:5}],
     on:(c,v)=>c.set('k',v)},
    {k:'st',t:'slider',label:'Radio de la pisada',min:0,max:14,step:.5,val:6,unit:' m',
     on:(c,v)=>{if(c.on())XV.giantStomp=v;}},
    {t:'texto',label:'Medidas',live:()=>'alto <b>'+PL.h.toFixed(2)+' m</b> · cámara <b>'+
      (camera.position.y-plBody.position.y).toFixed(2)+' m</b> · zancada <b>'+PL.spd.toFixed(1)+
      '</b> m/s · salto <b>'+PL.jump.toFixed(1)+'</b>'},
    xvRst(c=>{c.set('k',1);c.toast('🧍 tamaño normal');})
  ]},
  start:c=>{xpSize(c.get('k'));XV.giantStomp=c.get('st');},
  stop:()=>{xpSize(1);XV.giantStomp=0;}
},()=>{
  XP.run('xpv_giant');XP.set('xpv_giant','k',4);
  const h=PL.h,cr=charRoot?charRoot.scale.x:0,cap=plBody.shapes[0].radius;
  XP.stop('xpv_giant');
  return h>6.5&&cap>1.4&&Math.abs(PL.h-1.8)<.02&&(!charRoot||cr>charK*3);
});

/* ---------- 15. HACERTE DIMINUTO ---------- */
xvAdd({
  id:'xpv_tiny',name:'PortalMini',cat:'jugador',near:2.4,btn:'🐜 Hacerte diminuto',
  desc:'Hasta 0.12x. Y a esa escala los props que te caen encima te aplastan de verdad.',
  stopOnGone:true,
  ui:{title:'Diminuto',controls:[
    {k:'k',t:'slider',label:'Escala',min:.12,max:1,step:.01,val:.25,unit:'x',
     on:(c,v)=>{if(c.on())xpSize(v);}},
    {t:'botones',label:'Atajos',items:[{label:'0.12x',v:.12},{label:'0.25x',v:.25},
      {label:'0.5x',v:.5},{label:'1x',v:1}],on:(c,v)=>c.set('k',v)},
    {k:'crush',t:'switch',label:'Los props te aplastan',val:true},
    {t:'texto',label:'Medidas',live:c=>'alto <b>'+PL.h.toFixed(2)+' m</b> · cámara near <b>'+
      camera.near.toFixed(3)+'</b> · vida <b>'+PL.hp+'</b>'+
      (c.mem.hit?' · ¡aplastado por '+c.mem.hit+'!':'')},
    xvRst(c=>{c.set('k',1);c.toast('🧍 tamaño normal');})
  ]},
  start:c=>{xpSize(c.get('k'));c.mem.cd=0;c.mem.hit='';},
  stop:()=>xpSize(1),
  step:(c,dt)=>{
    if(!c.get('crush')||PL.rag||XPZ.k>=.8)return;
    c.mem.cd=Math.max(0,(c.mem.cd||0)-dt);
    if(c.mem.cd>0)return;
    const px=plBody.position.x,py=plBody.position.y,pz=plBody.position.z;
    const R=Math.max(.5,PL.h*1.2);
    xvArea(px,py+PL.h*.5,pz,R,q=>{
      if(q.frozen||c.mem.cd>0)return false;
      if(q.body.position.y<py+PL.h*.45)return false;             /* tiene que venir de ARRIBA */
      if(q.body.velocity.y>-2.2)return false;                    /* y cayendo en serio */
      const m=q.body.mass;
      if(m<plBody.mass*XPZ.k*XPZ.k*XPZ.k*.4)return false;        /* algo liviano no aplasta */
      c.mem.cd=1.1;c.mem.hit=q.def.name;
      if(typeof hurt==='function')hurt(Math.round(clamp(m*.5+18,18,100)));
      xvSnd('imp-metal',{vol:.8,at:q.body.position});
      return true;
    });
  }
},()=>{
  XP.run('xpv_tiny');XP.set('xpv_tiny','k',.15);
  const h=PL.h,near=camera.near;
  XP.stop('xpv_tiny');
  return h<.3&&near<.09&&Math.abs(PL.h-1.8)<.02;
});

/* ---------- 16. CLONADOR ---------- */
xvAdd({
  id:'xpv_clone',name:'CajaClon',cat:'objetos',near:2.5,btn:'✚ Clonar lo que apunto',
  desc:'Duplica N veces el prop que tenés en la mira, en torre, anillo o rejilla.',
  stopOnGone:true,
  ui:{title:'Clonador',controls:[
    {k:'n',t:'numero',label:'Copias',min:1,max:24,step:1,val:6},
    {k:'pat',t:'lista',label:'Formación',val:'tow',
     items:[{label:'🗼 Torre',v:'tow'},{label:'⭕ Anillo',v:'ring'},{label:'▦ Rejilla',v:'grid'}]},
    {k:'sep',t:'slider',label:'Separación',min:.2,max:4,step:.1,val:1.2,unit:' m'},
    {t:'botones',label:'Acción',items:[{label:'✚ ¡Clonar!',v:1}],
     on:c=>{const n=xvClone(c);c.toast(n?('✚ '+n+' copias'):'🔍 apuntá a un objeto');}},
    {t:'texto',label:'Objetivo',live:c=>{const p=xvTarget();
      return (p?('<b>'+p.def.name+'</b>'):'nada en la mira')+' · en el mundo <b>'+PROPS.length+
        '</b> · tope por copia <b>'+xvQ('clone')+'</b>';}}
  ]}
},()=>{
  const p=xvSpawnTest('i_crate_big');if(!p)return false;
  const n0=PROPS.length;
  const x=XP.of('xpv_clone');XP.run('xpv_clone');
  const made=xvClone(x.ctx,p,4);
  const ok=made>=1&&PROPS.length>n0;
  /* las copias se agregaron al FINAL de PROPS: se borran de atrás para adelante y no hace
     falta compararlas por id (comparar por id borraba también el original) */
  while(PROPS.length>n0)removeProp(PROPS[PROPS.length-1]);
  removeProp(p);
  XP.stop('xpv_clone');return ok;
});
function xvClone(c,src,nOv){
  const p=src||xvTarget();
  if(!p)return 0;
  const n=Math.min(nOv||c.get('n'),xvQ('clone'));
  const pat=c.get('pat')||'tow',sep=c.get('sep')||1.2;
  const b=buildDef(p.def),bx=p.body.position;
  _xvCq.copy(p.body.quaternion);
  let made=0;
  for(let i=1;i<=n;i++){
    let x=bx.x,y=bx.y,z=bx.z;
    if(pat==='tow')y+=(b.size[1]+sep*.2)*i;
    else if(pat==='ring'){const a=i/n*Math.PI*2,R=Math.max(1,(b.size[0]+sep)*n/6.283);
      x+=Math.cos(a)*R;z+=Math.sin(a)*R;y+=.2;}
    else{const w=Math.ceil(Math.sqrt(n)),ix=(i-1)%w,iz=((i-1)/w)|0;
      x+=(ix-(w-1)/2)*(b.size[0]+sep);z+=(iz+1)*(b.size[2]+sep);y+=.2;}
    const q=spawnProp(p.id,{x,y,z},_xvCq,{raw:true});
    if(!q)break;
    if(p.xvk&&p.xvk!==1)xvPropK(q,p.xvk,false);
    made++;
  }
  if(made)xvSnd('spawn',{vol:.5,at:bx});
  return made;
}

/* ---------- 17. LLUVIA DE PROPS ---------- */
const XVRAIN=['i_crate_big','f_ball_soccer','i_tire01','i_jerrycan','i_toolbox','i_cone01','i_pallet'];
const xvRainIds=()=>{const o=[];for(const id of XVRAIN)if(PDEF[id])o.push({label:PDEF[id].name,v:id});
  if(!o.length)for(const id in PDEF){o.push({label:PDEF[id].name,v:id});if(o.length>5)break;}
  return o;};
/* el valor por defecto de la lista tiene que EXISTIR en PDEF: xpCoerce respeta c.val aunque no
   esté entre los items, y un id inexistente dejaba el surtidor sin hacer nada en silencio */
const XVAMMO=xvRainIds(),XVAMMO0=(XVAMMO[0]||{v:'i_crate_big'}).v;
xvAdd({
  id:'xpv_rainp',name:'TolvaLluvia',cat:'objetos',near:2.8,btn:'🌧 Lluvia de objetos',
  desc:'Un surtidor: qué prop, cuántos por tanda, cada cuánto y desde qué altura. Escala con la calidad.',
  stopOnGone:true,
  ui:{title:'Lluvia de objetos',controls:[
    xvOnOff(),
    {k:'what',t:'lista',label:'Qué llueve',val:XVAMMO0,items:XVAMMO},
    {k:'n',t:'numero',label:'Por tanda',min:1,max:30,step:1,val:4},
    {k:'iv',t:'slider',label:'Cada',min:.2,max:6,step:.1,val:1,unit:' s'},
    {k:'h',t:'slider',label:'Altura',min:4,max:40,step:1,val:14,unit:' m'},
    {k:'R',t:'slider',label:'Radio',min:1,max:24,step:.5,val:6,unit:' m'},
    {t:'texto',label:'Estado',live:c=>c.on()
      ?('cayeron <b>'+(c.mem.tot||0)+'</b> · en el mundo <b>'+PROPS.length+'/'+
        (SV.maxProps||QP.maxProps)+'</b> · tope por tanda <b>'+xvQ('rain')+'</b>')
      :'apagado'},
    {t:'botones',items:[{label:'🗑 Borrar los caídos',v:1}],
     on:c=>{let n=0;for(let i=PROPS.length-1;i>=0;i--)if(PROPS[i]._xvRain){removeProp(PROPS[i]);n++;}
       c.mem.tot=0;c.toast('🗑 '+n);}}
  ]},
  start:c=>{c.mem.t=0;if(c.mem.tot==null)c.mem.tot=0;xvSync(c,true);},
  stop:c=>{xvSync(c,false);},
  step:(c,dt)=>{
    const p=c.prop;if(!p)return;
    c.mem.t=(c.mem.t||0)+dt;
    if(c.mem.t<c.get('iv'))return;
    c.mem.t=0;
    const id=c.get('what');if(!PDEF[id])return;
    const n=Math.min(c.get('n')|0,xvQ('rain'));
    const R=c.get('R'),H=c.get('h');
    const cx=p.body.position.x,cz=p.body.position.z,cy=p.body.position.y;
    for(let i=0;i<n;i++){
      const a=Math.random()*6.283,r=Math.sqrt(Math.random())*R;
      const q=spawnProp(id,{x:cx+Math.cos(a)*r,y:cy+H+Math.random()*2,z:cz+Math.sin(a)*r},null,{raw:true});
      if(!q)break;
      q._xvRain=1;q.manual=true;
      q.body.velocity.set(0,-1,0);
      c.mem.tot=(c.mem.tot||0)+1;
    }
    xvSnd('spawn',{vol:.35,at:p.body.position});
  }
},()=>{
  const pod=xvSpawnTest('xpv_rainp',2);if(!pod)return false;
  const n0=PROPS.length;
  const x=XP.of('xpv_rainp');
  XP.run('xpv_rainp',pod);XP.set('xpv_rainp','iv',.2);XP.set('xpv_rainp','n',3);
  x.step(x.ctx,1);
  const made=PROPS.length-n0;
  XP.stop('xpv_rainp');
  for(let i=PROPS.length-1;i>=0;i--)if(PROPS[i]._xvRain)removeProp(PROPS[i]);
  removeProp(pod);
  return made>=1;
});

/* ---------- 18. IMÁN ---------- */
xvAdd({
  id:'xpv_magnet',name:'ImanGrande',cat:'fuerzas',near:2.6,btn:'🧲 Imán',
  desc:'Atrae los props de alrededor hacia el imán, con radio y fuerza regulables.',
  stopOnGone:true,
  ui:{title:'Imán',controls:[
    xvOnOff(),
    {k:'R',t:'slider',label:'Radio',min:2,max:30,step:.5,val:10,unit:' m'},
    {k:'F',t:'slider',label:'Fuerza',min:1,max:60,step:1,val:18},
    {k:'vmax',t:'slider',label:'Velocidad máxima',min:2,max:40,step:1,val:14,unit:' m/s'},
    {k:'lift',t:'slider',label:'Levanta (1 = ingravidez)',min:0,max:2,step:.05,val:.95,unit:'x'},
    {t:'texto',label:'Estado',live:c=>c.on()?('atrayendo <b>'+(c.mem.n||0)+'</b> objetos'):'apagado'}
  ]},
  start:c=>{c.mem.n=0;xvSync(c,true);xvSnd('phys-hum',{vol:.4});},
  stop:c=>{xvSync(c,false);},
  step:(c,dt)=>{c.mem.n=xvPull(c,1,dt);}
},()=>xvPullTest('xpv_magnet',1));

/* ---------- 19. REPULSOR ---------- */
xvAdd({
  id:'xpv_repel',name:'PlatoRepulsor',cat:'fuerzas',near:2.6,btn:'💥 Repulsor',
  desc:'Lo contrario del imán: empuja todo hacia afuera (y al jugador si querés).',
  stopOnGone:true,
  ui:{title:'Repulsor',controls:[
    xvOnOff(),
    {k:'R',t:'slider',label:'Radio',min:2,max:30,step:.5,val:10,unit:' m'},
    {k:'F',t:'slider',label:'Fuerza',min:1,max:60,step:1,val:22},
    {k:'vmax',t:'slider',label:'Velocidad máxima',min:2,max:40,step:1,val:22,unit:' m/s'},
    {k:'lift',t:'slider',label:'Levanta (1 = ingravidez)',min:0,max:2,step:.05,val:.5,unit:'x'},
    {k:'pl',t:'switch',label:'Empuja al jugador',val:true},
    {t:'texto',label:'Estado',live:c=>c.on()?('empujando <b>'+(c.mem.n||0)+'</b> objetos'):'apagado'}
  ]},
  start:c=>{c.mem.n=0;xvSync(c,true);},
  stop:c=>{xvSync(c,false);},
  step:(c,dt)=>{c.mem.n=xvPull(c,-1,dt);}
},()=>xvPullTest('xpv_repel',-1));
/* motor común del imán y del repulsor: sg=+1 atrae, sg=-1 empuja.
   ------------------------------------------------------------
   POR QUÉ NO ALCANZA CON APLICAR UNA FUERZA (medido, no supuesto)
   Imán a fuerza 45 sobre una cubierta de 55 kg apoyada en el piso, a 7 m: la fuerza que llega
   al cuerpo es de -3029 N en X (y +353 N netos hacia arriba), y la velocidad que gana el cuerpo
   es... 0,02 m/s. No se mueve NADA. La causa es cómo genera la fricción cannon-es: cada PUNTO DE
   CONTACTO crea dos ecuaciones de fricción con tope mu*|g|*masaReducida = 0,5*19,6*55 = 539 N,
   y una rueda acostada (cilindro convexo) apoya con ~16 puntos -> unos 8600 N de agarre. Con eso
   se come cualquier fuerza razonable. Bajar la normal no sirve: en cannon ese tope es un número
   FIJO que no depende de la normal real.
   Lo que sí funciona es IMPONER VELOCIDAD, que es exactamente lo que hace grabStep con la
   physgun (core_b): la fricción sólo puede quitar mu*|g|*m*dt de velocidad por paso, así que si
   se le pide 8 m/s hacia el imán, el cuerpo se mueve. Se hace en dos capas:
     1) la FUERZA, que es la física de verdad y basta para lo liviano y lo que está en el aire,
        más un término de "Levanta" que compensa la gravedad y hace que los props floten;
     2) un PISO DE VELOCIDAD hacia el imán, que sube con dt (nunca de golpe) y está topeado por
        el slider de velocidad máxima.
   Los choques contra los otros props los sigue resolviendo el solver. */
function xvPull(c,sg,dt){
  const p=c.prop;if(!p)return 0;
  const R=c.get('R'),F=c.get('F'),vm=c.get('vmax'),lift=c.get('lift');
  const cx=p.body.position.x,cy=p.body.position.y+.6,cz=p.body.position.z;
  const g=-world.gravity.y,h=Math.min(.05,dt||1/60);
  const n=xvArea(cx,cy,cz,R,(q,d)=>{
    if(q===p||q.frozen)return false;
    q.body.wakeUp();
    const k=1-d/R;
    _xvF.set(cx-q.body.position.x,cy-q.body.position.y,cz-q.body.position.z);
    const L=_xvF.length();if(L<.15)return false;
    const ux=_xvF.x/L*sg,uy=_xvF.y/L*sg,uz=_xvF.z/L*sg;
    /* 1) fuerza + levantada */
    const f=F*Math.max(1,q.body.mass*1.8)*k;
    _xvF.set(ux*f,uy*f+(lift>0?q.body.mass*g*lift:0),uz*f);
    q.body.applyForce(_xvF,_xvZ);
    /* 2) piso de velocidad en la dirección del imán */
    const v=q.body.velocity;
    const want=Math.min(vm,F*.3*(.3+.7*k));
    const cur=v.x*ux+v.y*uy+v.z*uz;
    if(cur<want){
      const add=Math.min(want-cur,vm*h*5);
      v.x+=ux*add;v.y+=uy*add;v.z+=uz*add;
    }
    const s=Math.hypot(v.x,v.y,v.z);
    if(s>vm){const kk=vm/s;v.x*=kk;v.y*=kk;v.z*=kk;}
    return true;
  });
  if(sg<0&&c.get('pl')&&!PL.rag){
    const d=Math.hypot(plBody.position.x-cx,plBody.position.y-cy,plBody.position.z-cz);
    if(d<R&&d>.2){const f=F*.012*(1-d/R);
      plBody.velocity.x+=(plBody.position.x-cx)/d*f;
      plBody.velocity.y+=Math.max(0,(plBody.position.y-cy))/d*f+f*.4;
      plBody.velocity.z+=(plBody.position.z-cz)/d*f;}
  }
  return n;
}
function xvPullTest(id,sg){
  const pod=xvSpawnTest(id,2);if(!pod)return false;
  freezeProp(pod,true);                                  /* el aparato quieto: la referencia de
                                                            distancia no se puede mover sola */
  const box=xvSpawnTest('i_crate_big',6);if(!box){removeProp(pod);return false;}
  /* se lo suelta 1,5 m ARRIBA y se lo deja CAER hasta el piso: teletransportarlo a la altura
     del aparato lo dejaba a veces incrustado en el terreno (medido en z=52 del mapa construct,
     donde hay una plataforma) y ahí no se movía ni con 2300 N — un fallo de la prueba, no del
     imán */
  box.body.position.set(pod.body.position.x+6,pod.body.position.y+1.5,pod.body.position.z);
  box.body.velocity.set(0,0,0);box.manual=true;box.body.allowSleep=false;
  for(let i=0;i<70;i++)_xvWStep(1/60,1/60,1);            /* que caiga, se asiente y agarre el piso */
  const x=XP.of(id);XP.run(id,pod);XP.set(id,'R',20);XP.set(id,'F',50);
  const d0=Math.abs(box.body.position.x-pod.body.position.x);
  let vmax=0;
  for(let i=0;i<60;i++){x.step(x.ctx,1/60);_xvWStep(1/60,1/60,1);
    vmax=Math.max(vmax,Math.hypot(box.body.velocity.x,box.body.velocity.z));}
  const d1=Math.abs(box.body.position.x-pod.body.position.x);
  XVDBG[id]={d0:+d0.toFixed(3),d1:+d1.toFixed(3),vmax:+vmax.toFixed(2),n:x.ctx.mem.n||0,
    mass:box.body.mass,fy:+box.body.force.y.toFixed(0),fx:+box.body.force.x.toFixed(0),
    by:+box.body.position.y.toFixed(2),py:+pod.body.position.y.toFixed(2),
    vals:JSON.stringify(x.v)};
  XP.stop(id);removeProp(box);removeProp(pod);
  /* vale el desplazamiento O la velocidad máxima alcanzada: si el mapa le puso una pared al
     cajón, el empujón fue igual de real aunque no se haya movido de lugar */
  return (sg>0?(d1<d0-.3):(d1>d0+.3))||vmax>2;
}

/* ---------- 20. EXPLOSIÓN CONFIGURABLE ---------- */
xvAdd({
  id:'xpv_boom',name:'CajaExplosion',cat:'fuerzas',near:2.4,btn:'💣 Explotar',
  desc:'Radio y fuerza por separado (blastAt de core_b usa el mismo número para las dos cosas).',
  stopOnGone:true,
  ui:{title:'Explosión',controls:[
    {k:'R',t:'slider',label:'Radio',min:2,max:30,step:.5,val:9,unit:' m'},
    {k:'F',t:'slider',label:'Fuerza',min:2,max:60,step:1,val:22},
    {t:'botones',label:'Acción',items:[{label:'💣 ¡BOOM!',v:1}],
     on:c=>{const p=c.prop;if(!p){c.toast('sin caja');return;}
       XP.point(p,0,.7,0,_xvPo);
       const n=xvBlast(_xvPo.x,_xvPo.y,_xvPo.z,c.get('R'),c.get('F'));
       c.toast('💣 '+n+' objetos volaron');}},
    {k:'auto',t:'switch',label:'Repetir solo',val:false},
    {k:'iv',t:'slider',label:'Cada',min:1,max:12,step:.5,val:4,unit:' s'},
    {t:'texto',label:'Estado',live:c=>'radio <b>'+c.get('R')+' m</b> · fuerza <b>'+c.get('F')+
      '</b> · último: <b>'+(c.mem.last||0)+'</b> objetos'}
  ]},
  start:c=>{c.mem.t=0;},
  step:(c,dt)=>{
    if(!c.get('auto'))return;
    c.mem.t=(c.mem.t||0)+dt;
    if(c.mem.t<c.get('iv'))return;
    c.mem.t=0;
    const p=c.prop;if(!p)return;
    XP.point(p,0,.7,0,_xvPo);
    c.mem.last=xvBlast(_xvPo.x,_xvPo.y,_xvPo.z,c.get('R'),c.get('F'));
  }
},()=>{
  const box=xvSpawnTest('i_crate_big',3);if(!box)return false;
  /* 45 m lejos: xvBlast también lastima al jugador y sin esto la suite le bajaba la vida
     hasta tirarlo al piso en cada corrida */
  box.body.position.set(plBody.position.x+45,plBody.position.y+1,plBody.position.z);
  box.body.velocity.set(0,0,0);box.manual=true;box.body.wakeUp();
  const n=xvBlast(box.body.position.x-1.2,box.body.position.y,box.body.position.z,9,22);
  const v=Math.hypot(box.body.velocity.x,box.body.velocity.y,box.body.velocity.z);
  removeProp(box);
  return n>=1&&v>1.5;
});

/* ---------- 21. CONGELADOR DE ÁREA ---------- */
xvAdd({
  id:'xpv_freezr',name:'CongelaArea',cat:'objetos',near:2.6,btn:'❄ Congelar el área',
  desc:'Congela (cuerpo estático) todo lo que haya en el radio. Con "auto" congela lo que entre.',
  stopOnGone:true,
  ui:{title:'Congelador',controls:[
    {k:'R',t:'slider',label:'Radio',min:2,max:30,step:.5,val:9,unit:' m'},
    {t:'botones',label:'Acción',items:[{label:'❄ Congelar',v:1},{label:'🔥 Descongelar',v:2}],
     on:(c,v)=>{const n=xvFreeze(c,v===2);c.toast((v===2?'🔥 ':'❄ ')+n+' objetos');}},
    {k:'auto',t:'switch',label:'Congelar lo que entre',val:false},
    {t:'texto',label:'Estado',live:c=>{let f=0;for(const p of PROPS)if(p.frozen)f++;
      return 'congelados en el mundo <b>'+f+'</b> de <b>'+PROPS.length+'</b>';}}
  ]},
  step:(c,dt)=>{
    if(!c.get('auto'))return;
    c.mem.t=(c.mem.t||0)+dt;
    if(c.mem.t<.35)return;
    c.mem.t=0;xvFreeze(c,false);
  }
},()=>{
  const pod=xvSpawnTest('xpv_freezr',2);if(!pod)return false;
  const box=xvSpawnTest('i_crate_big',3);if(!box){removeProp(pod);return false;}
  box.body.position.set(pod.body.position.x+2,pod.body.position.y+.5,pod.body.position.z);
  const x=XP.of('xpv_freezr');XP.run('xpv_freezr',pod);XP.set('xpv_freezr','R',9);
  xvFreeze(x.ctx,false);
  const ok=box.frozen&&box.body.type===CANNON.Body.STATIC;
  xvFreeze(x.ctx,true);
  const ok2=!box.frozen;
  XP.stop('xpv_freezr');removeProp(box);removeProp(pod);
  return ok&&ok2;
});
function xvFreeze(c,un){
  const p=c.prop;if(!p)return 0;
  const R=c.get('R'),b=p.body;
  let n=0;
  /* descongelar recorre PROPS (los congelados NO están en actives()) */
  const list=un?PROPS:actives();
  const R2=R*R;
  for(const q of list){
    if(q===p)continue;
    const dx=q.body.position.x-b.position.x,dy=q.body.position.y-b.position.y,
          dz=q.body.position.z-b.position.z;
    if(dx*dx+dy*dy+dz*dz>R2)continue;
    if(un){ if(!q.frozen)continue;freezeProp(q,false);q.auto=false;n++; }
    else  { if(q.frozen)continue;freezeProp(q,true);q.manual=true;n++; }
  }
  if(n)xvSnd(un?'pop':'freeze',{vol:.7,at:b.position});
  return n;
}

/* ---------- 22. PEGAMENTO / SOLDADURA DE ÁREA ---------- */
xvAdd({
  id:'xpv_weld',name:'PegaArea',cat:'objetos',near:2.6,btn:'🔗 Pegar el área',
  desc:'Suelda con LockConstraint cada prop del radio con el más cercano. Se registra en CONSTR, así que borrar un prop limpia sus uniones.',
  stopOnGone:true,
  ui:{title:'Pegamento',controls:[
    {k:'R',t:'slider',label:'Radio',min:1.5,max:20,step:.5,val:6,unit:' m'},
    {k:'d',t:'slider',label:'Distancia entre vecinos',min:.5,max:6,step:.1,val:2.4,unit:' m'},
    {t:'botones',label:'Acción',items:[{label:'🔗 Pegar',v:1},{label:'✂ Despegar',v:2}],
     on:(c,v)=>{const n=v===2?xvUnweld(c):xvWeld(c);
       c.toast((v===2?'✂ ':'🔗 ')+n+' uniones');}},
    {t:'texto',label:'Estado',live:c=>'uniones en el mundo <b>'+CONSTR.length+'</b> · mías <b>'+
      (c.mem.mine?c.mem.mine.length:0)+'</b>'}
  ]},
  start:c=>{if(!c.mem.mine)c.mem.mine=[];},
  stop:c=>{nsafe(()=>xvUnweld(c),'xvunweld');}
},()=>{
  const pod=xvSpawnTest('xpv_weld',2);if(!pod)return false;
  const a=xvSpawnTest('i_crate_big',3),b=xvSpawnTest('i_crate_big',3.1);
  if(!a||!b){removeProp(pod);if(a)removeProp(a);if(b)removeProp(b);return false;}
  a.body.position.set(pod.body.position.x+2,pod.body.position.y+.6,pod.body.position.z);
  b.body.position.set(pod.body.position.x+3,pod.body.position.y+.6,pod.body.position.z);
  const x=XP.of('xpv_weld');XP.run('xpv_weld',pod);XP.set('xpv_weld','R',9);XP.set('xpv_weld','d',4);
  const n0=CONSTR.length,made=xvWeld(x.ctx),n1=CONSTR.length;
  const cut=xvUnweld(x.ctx),n2=CONSTR.length;
  XP.stop('xpv_weld');removeProp(a);removeProp(b);removeProp(pod);
  return made>=1&&n1>n0&&cut>=1&&n2===n0;
});
function xvWeld(c){
  const p=c.prop;if(!p)return 0;
  if(!c.mem.mine)c.mem.mine=[];
  const R=c.get('R'),D=c.get('d'),b=p.body;
  const near=[];
  xvArea(b.position.x,b.position.y,b.position.z,R,q=>{if(q!==p)near.push(q);});
  let n=0;
  const done=new Set();
  for(let i=0;i<near.length;i++){
    const a=near[i];
    if(done.has(a))continue;
    let best=null,bd=D*D;
    for(let j=0;j<near.length;j++){
      if(j===i)continue;
      const z=near[j];
      const dx=z.body.position.x-a.body.position.x,dy=z.body.position.y-a.body.position.y,
            dz=z.body.position.z-a.body.position.z,d2=dx*dx+dy*dy+dz*dz;
      if(d2<bd){bd=d2;best=z;}
    }
    if(!best)continue;
    if(a.frozen)freezeProp(a,false);
    if(best.frozen)freezeProp(best,false);
    const k=new CANNON.LockConstraint(a.body,best.body);
    world.addConstraint(k);
    const rec={c:k,a,b:best};
    CONSTR.push(rec);c.mem.mine.push(rec);
    a.body.wakeUp();best.body.wakeUp();
    done.add(a);done.add(best);n++;
  }
  if(n)xvSnd('weld',{vol:.7,at:b.position});
  return n;
}
function xvUnweld(c){
  const mine=c.mem.mine;if(!mine||!mine.length)return 0;
  let n=0;
  for(const rec of mine){
    const i=CONSTR.indexOf(rec);
    if(i>=0){nsafe(()=>world.removeConstraint(rec.c),'xvrmw');CONSTR.splice(i,1);n++;}
  }
  mine.length=0;
  if(n)xvSnd('pop',{vol:.5});
  return n;
}

/* ---------- 23. CATAPULTA ---------- */
xvAdd({
  id:'xpv_catap',name:'CatapultaXP',cat:'lanzar',near:3,btn:'🪃 Catapulta',
  desc:'Potencia y ángulo regulables. Lanza lo que haya en la cuchara; si no hay nada, aparece una caja.',
  stopOnGone:true,
  ui:{title:'Catapulta',controls:[
    {k:'pw',t:'slider',label:'Potencia',min:4,max:60,step:1,val:26,unit:' m/s'},
    {k:'ang',t:'slider',label:'Ángulo',min:10,max:80,step:1,val:45,unit:'°'},
    {k:'what',t:'lista',label:'Munición',val:XVAMMO0,items:XVAMMO},
    {t:'botones',label:'Acción',items:[{label:'🪃 ¡Lanzar!',v:1}],
     on:c=>{const r=xvLaunch(c,1.72,1.28);
       c.toast(r?('🪃 '+r.def.name+' · '+c.get('pw')+' m/s a '+c.get('ang')+'°'):'sin munición');}},
    {k:'auto',t:'switch',label:'Lanzar solo',val:false},
    {k:'iv',t:'slider',label:'Cada',min:1,max:10,step:.5,val:3,unit:' s'},
    {t:'texto',label:'Alcance teórico',live:c=>{const v=c.get('pw'),a=c.get('ang')*Math.PI/180;
      return 'v²·sen(2θ)/g ≈ <b>'+(v*v*Math.sin(2*a)/Math.abs(world.gravity.y)).toFixed(1)+' m</b>';}}
  ]},
  start:c=>{c.mem.t=0;},
  step:(c,dt)=>{
    if(!c.get('auto'))return;
    c.mem.t=(c.mem.t||0)+dt;
    if(c.mem.t<c.get('iv'))return;
    c.mem.t=0;xvLaunch(c,1.72,1.28);
  }
},()=>xvLaunchTest('xpv_catap',1.72,1.28));

/* ---------- 24. CAÑÓN DE PROPS ---------- */
xvAdd({
  id:'xpv_cannon',name:'CanonProps',cat:'lanzar',near:3,btn:'💥 Cañón de objetos',
  desc:'Dispara props por el caño con la velocidad que elijas. El caño ya está a 16°, el slider suma.',
  stopOnGone:true,
  ui:{title:'Cañón',controls:[
    {k:'pw',t:'slider',label:'Velocidad',min:5,max:90,step:1,val:40,unit:' m/s'},
    {k:'ang',t:'slider',label:'Ángulo',min:0,max:80,step:1,val:16,unit:'°'},
    {k:'what',t:'lista',label:'Munición',val:XVAMMO0,items:XVAMMO},
    {t:'botones',label:'Acción',items:[{label:'💥 ¡Fuego!',v:1}],
     on:c=>{const r=xvLaunch(c,1.24,1.02,1);
       c.toast(r?('💥 '+r.def.name+' a '+c.get('pw')+' m/s'):'no salió');}},
    {k:'auto',t:'switch',label:'Fuego automático',val:false},
    {k:'iv',t:'slider',label:'Cada',min:.3,max:8,step:.1,val:1.5,unit:' s'},
    {t:'texto',label:'Disparados',live:c=>'<b>'+(c.mem.tot||0)+'</b> objetos · en el mundo <b>'+
      PROPS.length+'</b>'}
  ]},
  start:c=>{c.mem.t=0;if(c.mem.tot==null)c.mem.tot=0;},
  step:(c,dt)=>{
    if(!c.get('auto'))return;
    c.mem.t=(c.mem.t||0)+dt;
    if(c.mem.t<c.get('iv'))return;
    c.mem.t=0;xvLaunch(c,1.24,1.02,1);
  }
},()=>xvLaunchTest('xpv_cannon',1.24,1.02,1));
/* motor común: (my,mz) es la boca en coordenadas del def; fresh=1 obliga a crear munición */
function xvLaunch(c,my,mz,fresh){
  const p=c.prop;if(!p)return null;
  XP.point(p,0,my,mz,_xvPo);
  let ammo=null;
  if(!fresh){
    /* ¿hay algo en la cuchara? lo más cercano a la boca dentro de 1,4 m */
    let bd=1.96;
    for(const q of actives()){
      if(q===p)continue;
      const d2=(q.body.position.x-_xvPo.x)**2+(q.body.position.y-_xvPo.y)**2+
               (q.body.position.z-_xvPo.z)**2;
      if(d2<bd){bd=d2;ammo=q;}
    }
  }
  if(!ammo){
    const id=c.get('what');
    if(!PDEF[id])return null;
    ammo=spawnProp(id,{x:_xvPo.x,y:_xvPo.y,z:_xvPo.z},null,{raw:true});
    if(!ammo)return null;
    ammo._xvRain=1;
  }
  if(ammo.frozen)freezeProp(ammo,false);
  ammo.manual=true;ammo.body.wakeUp();
  /* dirección: el eje +Z local del prop (adelante) subido el ángulo pedido */
  const a=c.get('ang')*Math.PI/180;
  xvDir(p,0,0,1,_xvV);
  _xvV.y=0;
  if(_xvV.lengthSq()<1e-6)_xvV.set(0,0,1);
  _xvV.normalize().multiplyScalar(Math.cos(a));
  _xvV.y=Math.sin(a);
  const v=c.get('pw');
  ammo.body.position.set(_xvPo.x+_xvV.x*.5,_xvPo.y+_xvV.y*.5+.1,_xvPo.z+_xvV.z*.5);
  ammo.body.velocity.set(_xvV.x*v,_xvV.y*v,_xvV.z*v);
  ammo.body.angularVelocity.set((Math.random()-.5)*4,(Math.random()-.5)*4,(Math.random()-.5)*4);
  c.mem.tot=(c.mem.tot||0)+1;
  xvSnd(fresh?'boom':'imp-wood',{vol:fresh?.8:.6,at:_xvPo});
  if(typeof XP.fx==='function')XP.fx(_xvPo.x,_xvPo.y,_xvPo.z,{burst:'sparkle',size:.5,clr:[0xffc24d]});
  return ammo;
}
function xvLaunchTest(id,my,mz,fresh){
  const pod=xvSpawnTest(id,3);if(!pod)return false;
  freezeProp(pod,true);
  const x=XP.of(id);XP.run(id,pod);XP.set(id,'pw',40);XP.set(id,'ang',45);
  const n0=PROPS.length;
  const shot=xvLaunch(x.ctx,my,mz,fresh);
  const sp=shot?Math.hypot(shot.body.velocity.x,shot.body.velocity.y,shot.body.velocity.z):0;
  XP.stop(id);
  while(PROPS.length>n0)removeProp(PROPS[PROPS.length-1]);
  removeProp(pod);
  return !!shot&&sp>30;
}

/* ---------- 25. TRAMPOLÍN ---------- */
xvAdd({
  id:'xpv_tramp',name:'Trampolin',cat:'fuerzas',near:2.8,btn:'🤸 Trampolín',
  desc:'Rebote EXTREMO: la restitución de cannon no puede pasar de 1, así que acá se refleja la velocidad con ganancia.',
  stopOnGone:true,
  ui:{title:'Trampolín',controls:[
    xvOnOff(),
    {k:'g',t:'slider',label:'Ganancia del rebote',min:.4,max:2.6,step:.05,val:1.5,unit:'x'},
    {k:'min',t:'slider',label:'Rebote mínimo',min:0,max:20,step:.5,val:7,unit:' m/s'},
    {k:'R',t:'slider',label:'Radio de la lona',min:.6,max:4,step:.1,val:1.4,unit:' m'},
    {t:'texto',label:'Estado',live:c=>'rebotes: <b>'+(c.mem.n||0)+'</b> · último <b>'+
      (c.mem.last||0).toFixed(1)+' m/s</b>'}
  ]},
  start:c=>{c.mem.n=0;c.mem.last=0;c.mem.cd=0;xvSync(c,true);},
  stop:c=>{xvSync(c,false);},
  step:(c,dt)=>{
    const p=c.prop;if(!p)return;
    const R=c.get('R'),g=c.get('g'),mn=c.get('min');
    XP.point(p,0,.66,0,_xvPo);                        /* la lona está a 66 cm de la base */
    const top=_xvPo.y;
    for(const q of actives()){
      if(q===p||q.frozen)continue;
      const b=q.body;
      if(b.velocity.y>0)continue;
      if(Math.abs(b.position.y-top)>.9)continue;
      if((b.position.x-_xvPo.x)**2+(b.position.z-_xvPo.z)**2>R*R)continue;
      /* tope de 40 m/s: con ganancia >1 cada rebote multiplica y sin tope el prop se va del
         mundo en cinco saltos */
      const v=Math.min(40,Math.max(mn,-b.velocity.y*g));
      b.wakeUp();b.velocity.y=v;
      b.position.y=top+.12;
      c.mem.n=(c.mem.n||0)+1;c.mem.last=v;
      xvSnd('pop',{vol:.5,at:b.position});
    }
    /* y al jugador (que no es un prop) */
    c.mem.cd=Math.max(0,(c.mem.cd||0)-dt);
    if(!PL.rag&&!PL.noclip&&plBody.velocity.y<=.2&&c.mem.cd<=0
       &&Math.abs(plBody.position.y-top)<.7
       &&(plBody.position.x-_xvPo.x)**2+(plBody.position.z-_xvPo.z)**2<R*R){
      const v=Math.min(40,Math.max(mn,-plBody.velocity.y*g));
      plBody.velocity.y=v;plBody.position.y=top+.1;plSync();
      c.mem.n=(c.mem.n||0)+1;c.mem.last=v;c.mem.cd=.25;
      xvSnd('jump',{vol:.7,rate:.8});
    }
  }
},()=>{
  const pod=xvSpawnTest('xpv_tramp',2);if(!pod)return false;
  freezeProp(pod,true);
  const box=xvSpawnTest('i_crate_big',2);if(!box){removeProp(pod);return false;}
  XP.point(pod,0,.66,0,_xvPo);
  box.body.position.set(_xvPo.x,_xvPo.y+.2,_xvPo.z);
  box.body.velocity.set(0,-8,0);
  const x=XP.of('xpv_tramp');XP.run('xpv_tramp',pod);XP.set('xpv_tramp','g',1.5);
  x.step(x.ctx,1/60);
  const vy=box.body.velocity.y;
  XP.stop('xpv_tramp');removeProp(box);removeProp(pod);
  return vy>10;                                       /* -8 × 1.5 = 12 hacia arriba */
});

/* ---------- 26. RAGDOLL REAL ---------- */
xvAdd({
  id:'xpv_rag',name:'PerchaMunieco',cat:'jugador',near:2.6,btn:'🧸 Ragdoll de verdad',
  desc:'11 cuerpos de cannon (cabeza, torso, pelvis, brazos, antebrazos, muslos, piernas) unidos con ConeTwistConstraint. Se puede agarrar con la physgun.',
  ui:{title:'Ragdoll',controls:[
    {k:'on',t:'switch',label:'Tirar el muñeco (o el botón 🧍 del HUD)',val:false,
     on:(c,v)=>{if(v)nsafe(xvRagOn,'xvrag1');else nsafe(xvRagOff,'xvrag0');}},
    {t:'botones',label:'Empujones',items:[{label:'⬆ Volar',v:1},{label:'🌀 Girar',v:2},
      {label:'👊 Empujar',v:3}],
     on:(c,v)=>{
       if(!RAG.on&&!nsafe(xvRagOn,'xvrag2')){c.toast('sin personaje cargado');return;}
       c.set('on',true);
       for(const s of RAG.segs){
         s.body.wakeUp();
         if(v===1)s.body.velocity.y+=9;
         else if(v===2)s.body.angularVelocity.set((Math.random()-.5)*22,(Math.random()-.5)*22,
           (Math.random()-.5)*22);
         else{camDir(_xvV);s.body.velocity.x+=_xvV.x*12;s.body.velocity.z+=_xvV.z*12;
           s.body.velocity.y+=3;}
       }
       c.toast(['','⬆','🌀','👊'][v]+' ¡ahí va!');}},
    {t:'texto',label:'Medición',live:()=>{
      if(!RAG.on)return 'apagado · <b>0</b> cuerpos';
      const i=xvRagInfo();
      return 'cuerpos <b>'+i.bodies+'</b> · restricciones <b>'+i.cons+'</b><br>'+
        'cadera y=<b>'+i.hipY.toFixed(3)+' m</b> · cabeza y=<b>'+i.headY.toFixed(2)+
        '</b> · vel <b>'+i.vel.toFixed(3)+' m/s</b> · durmiendo <b>'+i.sleep+'/'+i.bodies+'</b>';}},
    {t:'texto',label:'Physgun',live:()=>(typeof grab!=='undefined'&&grab&&grab.rag)
      ? 'sosteniendo un hueso del muñeco ✅' : 'agarrá un brazo con la physgun y tirá'},
    {t:'botones',items:[{label:'🧍 Pararse',v:1}],on:c=>{c.set('on',false);c.toast('🧍 de pie');}}
  ]},
  stop:()=>{if(RAG.on)nsafe(xvRagOff,'xvrag3');}
},()=>{
  if(!charRoot)return false;
  if(!nsafe(xvRagOn,'xvtrag'))return false;
  const b=RAG.bodies.length,c=RAG.cons.length;
  const y0=xvRagInfo().headY;
  for(let i=0;i<110;i++){_xvWStep(1/60,1/60,2);xvRagPose();}
  const i1=xvRagInfo();
  /* la comprobación es RELATIVA (cuánto bajó la cabeza) y no contra y=0: el jugador puede estar
     parado sobre una plataforma del mapa y una prueba con alturas absolutas fallaba ahí */
  XVDBG.xpv_rag={bodies:b,cons:c,headY0:+y0.toFixed(2),headY1:+i1.headY.toFixed(2),
    hipY:+i1.hipY.toFixed(2),vel:+i1.vel.toFixed(3),sleep:i1.sleep};
  const ok=b===11&&c===10&&(y0-i1.headY)>0.4&&i1.vel<3;
  xvRagOff();
  return ok&&!PL.rag&&RAG.bodies.length===0;
});
function xvRagInfo(){
  const S=RAG.segs;
  let sleep=0,vel=0;
  for(const b of RAG.bodies){
    if(b.sleepState===CANNON.Body.SLEEPING)sleep++;
    vel+=Math.hypot(b.velocity.x,b.velocity.y,b.velocity.z);
  }
  const hd=S.find(s=>s.name==='head');
  return {on:RAG.on,bodies:RAG.bodies.length,cons:RAG.cons.length,
    hipY:S[0]?S[0].body.position.y:0,
    headY:hd?hd.body.position.y:0,
    vel:RAG.bodies.length?vel/RAG.bodies.length:0,sleep,
    plY:plBody.position.y,
    held:(typeof grab!=='undefined'&&grab&&grab.rag)?grab.id:null};
}

/* ---------- ayuda de las pruebas: spawnear delante del jugador ---------- */
function xvSpawnTest(id,fwd,up){
  if(!PDEF[id])return null;
  const s=Math.sin(PL.yaw),c=Math.cos(PL.yaw),d=fwd==null?3:fwd;
  return spawnProp(id,{x:plBody.position.x-s*d,y:plBody.position.y+(up==null?.6:up),
    z:plBody.position.z-c*d},null,{raw:true});
}

/* ============================================================
   11. ENGANCHE AL BUCLE
   ------------------------------------------------------------
   Un solo EXT.frame para todo lo mío: la pose del ragdoll (que tiene que ir DESPUÉS de
   animStep, y EXT.frame corre después de camStep), el botón de vuelo y el vigilante de APP.
   ============================================================ */
EXT.frame.push(dt=>{
  if(RAG.on){
    nsafe(xvRagPose,'xvpose');
    RAG.t+=dt;
    /* pose por red a 8 Hz y sólo si hay partida multijugador */
    RAG.netT+=dt;
    if(RAG.netT>=.125){RAG.netT=0;nsafe(xvRagSend,'xvsend');}
  }
  XV.paintT=(XV.paintT||0)+dt;
  if(XV.paintT>=.25){XV.paintT=0;nsafe(xvFlyPaint,'xvfly');nsafe(xvWatchApp,'xvapp');}
});

/* ============================================================
   12. HOOKS DE MEDICIÓN
   ============================================================ */
if(DEV&&window.__H)Object.assign(window.__H,{
  /* lista de LOS MÍOS con su estado */
  xpvList:()=>XP.list().filter(x=>x.id.indexOf('xpv_')===0),
  /* prueba rápida de los 26: {id:true|false}. Cada una mide algo que sólo puede haber
     cambiado si el efecto es real, y deja el juego como estaba. */
  xpvTest:()=>{
    const out={};
    for(const id in XVT){
      let r=false;
      try{ r=!!XVT[id](); }catch(e){ r=String((e&&e.message)||e).slice(0,80); }
      out[id]=r;
      nsafe(()=>{if(XP.running(id))XP.stop(id);},'xpvt_'+id);
    }
    nsafe(()=>{xvRestoreAll();xvTime(1);xvBounce(null);xvFric(null);
      XV.ice=1;XV.jumps=1;XV.fly=20;XV.giantStomp=0;PL.noclip=false;
      if(RAG.on)xvRagOff();},'xpvtend');
    return out;
  },
  /* --- ragdoll --- */
  xvRag:()=>xvRagInfo(),
  xvRagOn:()=>{const r=nsafe(xvRagOn,'h');return {ok:!!r,info:xvRagInfo()};},
  xvRagOff:()=>{nsafe(xvRagOff,'h');return {rag:PL.rag,bodies:RAG.bodies.length,
    plY:+plBody.position.y.toFixed(3)};},
  /* cuerpos uno por uno: para ver que se apoyan y que no tiemblan */
  xvRagBodies:()=>RAG.segs.map(s=>({n:s.name,
    p:[+s.body.position.x.toFixed(2),+s.body.position.y.toFixed(2),+s.body.position.z.toFixed(2)],
    v:+Math.hypot(s.body.velocity.x,s.body.velocity.y,s.body.velocity.z).toFixed(3),
    m:s.body.mass,len:+s.len.toFixed(3),
    sleep:s.body.sleepState===CANNON.Body.SLEEPING,bone:s.bone?s.bone.name:null})),
  /* qué huesos encontró en el rig (para documentar si falta alguno) */
  xvBones:()=>{const B=xvBoneMap(charRoot);const o={};
    if(B)for(const k in B)o[k]=B[k]?B[k].name:null;return o;},
  /* avanzar SÓLO la física + la pose del ragdoll (sin cámara ni animación).
     Va por _xvWStep (el step CRUDO de cannon) a propósito: si pasara por world.step, el
     experimento de tiempo lento también escalaría los pasos de la medición y una sonda que
     frena el tiempo para encuadrar la cámara ya no avanzaría nada. */
  xvRagStep:(n)=>{for(let i=0;i<(n||60);i++){_xvWStep(1/60,1/60,2);xvRagPose();}
    return xvRagInfo();},
  xvRagPush:(x,y,z)=>{for(const s of RAG.segs){s.body.wakeUp();
    s.body.velocity.x+=x||0;s.body.velocity.y+=y||0;s.body.velocity.z+=z||0;}
    return RAG.bodies.length;},
  /* Apuntar la cámara a un hueso del muñeco y decir qué pegó el rayo.
     Iterar es obligatorio: en 3ª persona la cámara ORBITA al cambiar el yaw (el mismo truco que
     usa __H.aimAt) y hacer la cuenta desde plBody en vez de desde la cámara daba un rayo que
     pasaba de largo. Y además hay que PROBAR VARIOS huesos: un muñeco tirado en el piso es una
     silueta de 20 cm de alto y desde una cámara que está 4 m atrás y arriba, apuntar a la pelvis
     puede rozarla y pegar en el suelo. Se prueba el pedido y después el resto, de más grande a
     más chico, hasta que el rayo dé en un hueso. */
  xvAimRag:name=>{
    if(!RAG.on||!RAG.segs.length)return null;
    const order=['torso','pelvis','lUp','rUp','head','lLeg','rLeg','lArm','rArm','lFore','rFore'];
    const list=[];
    if(name){const s0=RAG.segs.find(x=>x.name===name);if(s0)list.push(s0);}
    for(const nm of order){const s0=RAG.segs.find(x=>x.name===nm);if(s0&&list.indexOf(s0)<0)list.push(s0);}
    let last=null;
    for(const s of list){
      for(let k=0;k<8;k++){
        const dx=s.body.position.x-camera.position.x,dy=s.body.position.y-camera.position.y,
              dz=s.body.position.z-camera.position.z;
        PL.yaw=Math.atan2(-dx,-dz);
        PL.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-1.45,1.45);
        camStep(0);
      }
      const h=aimRay(60,0);
      last={prop:h&&h.prop?h.prop.id:null,rag:!!(h&&h.prop&&h.prop.rag),
        d:h?+h.d.toFixed(2):0,yaw:+PL.yaw.toFixed(3),pitch:+PL.pitch.toFixed(3),tried:s.name};
      if(last.rag)return last;
    }
    return last||{prop:null,rag:false,d:0};},
  /* pose que se manda por red (para comprobar el tamaño del paquete) */
  xvRagPkt:()=>{if(!RAG.on)return null;
    const B=[];for(const s of RAG.segs){const b=s.bone;if(!b)continue;
      B.push(+b.quaternion.x.toFixed(2),+b.quaternion.y.toFixed(2),
             +b.quaternion.z.toFixed(2),+b.quaternion.w.toFixed(2));}
    const o={k:'o',i:'__rag',B};return {n:B.length,bytes:JSON.stringify(o).length};},
  xvGhostRag:()=>{const o={};
    if(typeof GH!=='undefined')for(const id in GH){const g=GH[id];
      o[id]={rot:[+g.root.rotation.x.toFixed(2),+g.root.rotation.y.toFixed(2),
        +g.root.rotation.z.toFixed(2)],y:+g.root.position.y.toFixed(2),
        pose:!!XVNET.pose[id],fall:+(XVNET.fall[id]||0).toFixed(2)};}
    return o;},
  /* --- escala y masa de props --- */
  xvPropK:(i,k)=>{const p=PROPS[i];if(!p)return null;xvPropK(p,k,true);
    return {k:p.xvk,mass:+p.body.mass.toFixed(2),
      r:+(p.body.shapes[0].boundingSphereRadius||0).toFixed(3),
      y:+p.body.position.y.toFixed(3)};},
  xvPropM:(i,m)=>{const p=PROPS[i];if(!p)return null;xvPropM(p,m);
    return {m:p.xvm,mass:+p.body.mass.toFixed(3),damp:+p.body.linearDamping.toFixed(2)};},
  xvPropInfo:i=>{const p=PROPS[i];if(!p)return null;
    return {id:p.id,k:p.xvk||1,m:p.xvm||1,mass:+p.body.mass.toFixed(2),
      shapes:p.body.shapes.length,frozen:p.frozen,
      y:+p.body.position.y.toFixed(3)};},
  xvRestore:()=>xvRestoreAll(),
  xvDbg:()=>XVDBG,
  /* --- estado global de mis experimentos --- */
  xvInfo:()=>({ts:XV.ts,ice:XV.ice,jumps:XV.jumps,jUsed:XV.jUsed,fly:XV.fly,
    stomp:XV.giantStomp,noclip:!!PL.noclip,
    grav:+world.gravity.y.toFixed(2),grav0:XVG0,
    rest:XVCM[0]?+XVCM[0].cm.restitution.toFixed(3):null,
    fric:XVCM[0]?+XVCM[0].cm.friction.toFixed(3):null,
    rag:RAG.on,ragBodies:RAG.bodies.length,ragCons:RAG.cons.length,
    plH:+PL.h.toFixed(3),plJump:+PL.jump.toFixed(2),plRun:+PL.run.toFixed(2),
    scaled:XVSC.size,q:QP.key,budget:{rain:xvQ('rain'),area:xvQ('area'),clone:xvQ('clone')},
    cam:[+camera.position.x.toFixed(2),+camera.position.y.toFixed(2),+camera.position.z.toFixed(2)],
    running:XP.list().filter(x=>x.id.indexOf('xpv_')===0&&x.run).map(x=>x.id)}),
  xvFlyBtn:()=>{const s=getComputedStyle(xvFlyBtn);
    return s.display!=='none'?{txt:xvFlyBtn.textContent,
      act:xvFlyBtn.classList.contains('act')}:null;},
  xvFlyTap:()=>xvFlyTap(null),
  /* spawnear el prop de un experimento y abrirlo, como haría el jugador acercándose */
  xvOpen:(id,d)=>{const p=xvSpawnTest(id,d==null?1.6:d,.4);
    if(!p)return null;
    XP.open(id,p);
    return {prop:PROPS.indexOf(p),open:XP.of(id)?true:false,run:XP.running(id)};},
  xvTime:t=>xvTime(t),xvGrav:g=>xvGrav(g),
  xvBlast:(x,y,z,R,F)=>xvBlast(x,y,z,R||9,F||22)
});
