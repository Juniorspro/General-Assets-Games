/* ============================================================
   SUX SANDBOX — core_s: GRÁFICOS "ULTRA 4K"
   ------------------------------------------------------------
   Lo que pidió el usuario: un apartado "Ultra 4K" en Ajustes con difuminado de
   movimiento, sombras "más god" y path tracing.

   POR QUÉ NO HAY PATH TRACING DE VERDAD: trazar rayos por píxel con rebotes cuesta
   entre 10 y 1000 veces más que un frame rasterizado; en el celular objetivo (J8/A10,
   que ya corre a 30 fps con el rasterizador) no hay ni un orden de magnitud de margen.
   Lo que SÍ da el mismo resultado visual que la gente asocia al path tracing —"cada
   fuego, explosión, neón ilumina lo que tiene al lado" y "reflejos/luz indirecta del
   cielo"— se consigue con dos aproximaciones baratas que este archivo implementa:
     · POOL de luces puntuales reales asignadas por cercanía (luz directa dinámica de
       fogonazos, explosiones, pirotecnia, neones y del vehículo encendido);
     · un environment map PMREM generado de un gradiente de cielo, que es exactamente la
       parte "difusa de un rebote" del path tracing precalculada (IBL): da luz indirecta
       y reflejos creíbles en los materiales PBR por un costo fijo de ~0 por frame.
   Lo digo en la UI con el subtítulo, para no vender humo.

   REGLA DEL MOTOR: este archivo es EXCLUSIVO. Todo lo que necesita de otros cores lo
   REASIGNA (litLight, muzzleFlash, boom, applyOpts, applyQualLive, applyLang) y nunca
   lo re-declara. Nada por frame sin dt. Todo callback en nsafe().

   ORDEN DE MAGNITUD DE CADA PIEZA (medido, ver StructuredOutput):
     1) difuminado de movimiento  -> 2 pasadas de quad a pantalla completa
     2) sombras                   -> mapa 2048 + frustum pegado al jugador (26 m)
     3) luces dinámicas           -> 12 PointLight en ultra, 4 en high, 0 en uld/low
     4) environment map           -> PMREM 1 vez, costo por frame nulo
   ============================================================ */

/* ---------- 0. estado guardado ----------
   Claves nuevas en SV (se guardan con save(), como todo lo demás). No toco el botón
   "Por defecto" de core_b: su lista literal no incluye estas claves, así que el apartado
   Ultra sobrevive al reset del resto de Ajustes (y tiene su propio reset abajo). */
if(SV.ultra==null)SV.ultra=false;      /* interruptor maestro del apartado */
if(SV.mblur==null)SV.mblur=true;       /* difuminado de movimiento */
if(SV.mbAmt==null)SV.mbAmt=.5;         /* cuánto difumina (0..1) */
if(SV.gshadow==null)SV.gshadow=true;   /* sombras god */
if(SV.dlights==null)SV.dlights=true;   /* luces dinámicas */
if(SV.genv==null)SV.genv=true;         /* iluminación indirecta (env map) */

/* Ultra es un ESCALÓN ENCIMA DE ALTA, no una calidad aparte: en 'uld' y 'low' los
   materiales son Phong (sin PBR, sin env map) y no hay sombras (QP.shadow===0), así que
   todo esto queda apagado por definición — es el punto 5 del pedido. Hacerlo como
   apartado propio en Ajustes en vez de un 4º QPRE evita tocar markQual/applyQualLive
   (que asumen exactamente tres botones de calidad) y evita el reload por cambio de
   phong<->PBR: Ultra se prende y se apaga EN VIVO. */
const gfxAllow=()=>!!(QP&&(QP.key==='high'||QP.key==='ultra'));
const ultraOn=()=>!!SV.ultra&&gfxAllow();
let gfxErr='';

/* ============================================================
   1. DIFUMINADO DE MOVIMIENTO (acumulación temporal)
   ------------------------------------------------------------
   Se hace acumulando en un WebGLRenderTarget de "historial":
     pasada A: la escena entra a mbCur (en vez de al canvas)
     pasada B: mbCur se dibuja ENCIMA de mbHist con opacidad k -> mbHist = mix(mbHist,mbCur,k)
     pasada C: mbHist se presenta en el canvas
   k sale de dt con una constante de tiempo (k = 1-exp(-dt/tau)): así el rastro dura los
   mismos MILISEGUNDOS a 30 o a 60 fps, que es la única forma de que no se vea distinto
   según el equipo.

   ADEMÁS tau se escala con el MOVIMIENTO REAL de la cámara (lineal + angular). Con la
   cámara quieta tau->0 => k=1 => el frame sale tal cual: sin esto, un jugador parado veía
   la imagen "pegajosa" para siempre (y el menú/pausa también). Es el mismo criterio que un
   blur direccional por velocidad, pero sin necesitar buffer de velocidad por píxel.

   LIMITACIÓN HONESTA: es blur de CÁMARA. Un prop cruzando la pantalla con la cámara quieta
   no se difumina (eso necesita motion vectors por objeto, o sea un G-buffer que este
   renderizador no tiene). Lo digo acá y en el StructuredOutput.

   La rotación 90° del escenario no le afecta: el quad se dibuja en el espacio del canvas y
   el transform de #stage es CSS, encima del canvas ya compuesto. */
let mbCur=null,mbHist=null,mbQScene=null,mbQCam=null,mbQuad=null,
    mbMatAcc=null,mbMatOut=null,mbFresh=true,mbW=0,mbH=0,mbK=1,mbMot=0,mbN=0;
const mbDBS=new THREE.Vector2();
const mbPrevP=new THREE.Vector3(),mbPrevQ=new THREE.Quaternion();
let mbHasPrev=false;

const mbOn=()=>ultraOn()&&!!SV.mblur;

function mbMake(w,h){
  mbFree();
  /* UnsignedByte + colorSpace sRGB: el render a target aplica la MISMA conversión de
     salida que al canvas, así que la mezcla ocurre en sRGB (que es donde el ojo espera
     que un rastro se vea lineal) y no hace falta half-float. */
  const o={depthBuffer:true,stencilBuffer:false,
    minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,type:THREE.UnsignedByteType};
  mbCur=new THREE.WebGLRenderTarget(w,h,o);
  mbCur.texture.colorSpace=THREE.SRGBColorSpace;
  mbHist=new THREE.WebGLRenderTarget(w,h,Object.assign({},o,{depthBuffer:false}));
  mbHist.texture.colorSpace=THREE.SRGBColorSpace;
  mbW=w;mbH=h;mbFresh=true;
  if(!mbQScene){
    mbQScene=new THREE.Scene();
    mbQCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    /* toneMapped=false en los dos: la escena ya salió tonemapeada al target, volver a
       aplicar el tone mapping en el quad lavaría los colores. */
    mbMatAcc=new THREE.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false,
      toneMapped:false,premultipliedAlpha:false});
    mbMatOut=new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false,toneMapped:false});
    mbQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mbMatOut);
    mbQuad.frustumCulled=false;mbQScene.add(mbQuad);
  }
  mbMatAcc.map=mbCur.texture;mbMatAcc.needsUpdate=true;
  mbMatOut.map=mbHist.texture;mbMatOut.needsUpdate=true;
}
function mbFree(){
  if(mbCur){mbCur.dispose();mbCur=null;}
  if(mbHist){mbHist.dispose();mbHist=null;}
  mbW=mbH=0;mbHasPrev=false;
}
/* movimiento de la cámara en unidades por segundo: metros/s + radianes/s */
function mbMotion(dt){
  if(dt<=0)return mbMot;
  if(!mbHasPrev){mbPrevP.copy(camera.position);mbPrevQ.copy(camera.quaternion);mbHasPrev=true;return 0;}
  const lin=camera.position.distanceTo(mbPrevP)/dt;
  /* ángulo entre quaterniones: 2*acos(|dot|) es el giro real de la cámara */
  let d=Math.abs(mbPrevQ.dot(camera.quaternion));if(d>1)d=1;
  const ang=2*Math.acos(d)/dt;
  mbPrevP.copy(camera.position);mbPrevQ.copy(camera.quaternion);
  /* el giro se nota mucho más que el desplazamiento: 1 rad/s difumina como ~4,5 m/s */
  mbMot=lin+ang*4.5;
  return mbMot;
}
function mbFactor(dt){
  const s=clamp(mbMot/7,0,1);                 /* 7 unidades/s = difuminado a fondo */
  const tau=(.010+.070*clamp(SV.mbAmt,0,1))*s;
  if(tau<1e-4)return 1;
  return clamp(1-Math.exp(-Math.max(.001,dt)/tau),.10,1);
}
/* la escena entra al target, se acumula y se presenta */
function mbPass(){
  renderer.getDrawingBufferSize(mbDBS);
  const w=Math.max(2,mbDBS.x|0),h=Math.max(2,mbDBS.y|0);
  if(!mbCur||w!==mbW||h!==mbH)mbMake(w,h);
  const ac=renderer.autoClear;
  renderer.setRenderTarget(mbCur);
  mbRR(scene,camera);
  /* renderer.info se resetea en CADA render: si no lo guardamos acá, lo último que quedaría
     medido es el quad de presentación (1 draw call, 2 triángulos) y __H.info() (y cualquier
     panel de debug) mentiría sobre la escena. Se restaura al final del pase. */
  const ri=renderer.info.render;
  const iC=ri.calls,iT=ri.triangles,iP=ri.points,iL=ri.lines;
  renderer.setRenderTarget(mbHist);
  renderer.autoClear=false;
  if(mbFresh){renderer.clear(true,true,false);mbFresh=false;mbK=1;}
  mbQuad.material=mbMatAcc;mbMatAcc.opacity=mbK;
  mbRR(mbQScene,mbQCam);
  renderer.autoClear=ac;
  renderer.setRenderTarget(null);
  mbQuad.material=mbMatOut;
  mbRR(mbQScene,mbQCam);
  ri.calls=iC+2;ri.triangles=iT+4;ri.points=iP;ri.lines=iL;   /* escena + los 2 quads */
  mbN++;
}
/* ---- intercepción del render principal ----
   Se envuelve renderer.render (no frame()) porque así también quedan cubiertos el
   render de la FOTO (core_b), el del vehículo (core_e) y __H.render, y porque un
   frame() salteado por el límite de fps no llega nunca acá: no hay riesgo de
   re-componer el historial sin frame nuevo (que sería doble rastro).
   Guardas: sólo la pareja (scene,camera), sólo si NO hay ya un target puesto (así no
   secuestro las miniaturas ni el vmDiff de core_m) y con reentrada bloqueada. */
const mbRR=renderer.render.bind(renderer);
let mbBusy=false;
renderer.render=function(sc,cm){
  if(mbBusy||sc!==scene||cm!==camera||!mbOn()||renderer.getRenderTarget())return mbRR(sc,cm);
  mbBusy=true;
  try{ mbPass(); }
  catch(e){ gfxErr='mblur: '+((e&&e.message)||e);SV.mblur=false;
    try{renderer.setRenderTarget(null);renderer.autoClear=true;mbRR(sc,cm);}catch(e2){} }
  mbBusy=false;
};

/* ============================================================
   2. SOMBRAS "MÁS GOD"
   ------------------------------------------------------------
   Tres cosas, y la tercera es la que se ve:
     · mapa de 1024 -> 2048 (x2 lineal)
     · PCFShadowMap -> PCFSoftShadowMap (borde suave de verdad; hay que recompilar los
       materiales a mano porque el tipo de sombra entra en la clave del programa y three
       no lo invalida solo)
     · el frustum ortográfico del sol deja de cubrir 104 m fijos alrededor del origen y
       pasa a cubrir 52 m PEGADOS al jugador (y un poco adelante, hacia donde mira).
   Resolución efectiva: high = 1024/104 = 9,8 texeles/m ; ultra = 2048/52 = 39,4 texeles/m,
   o sea x4 lineal y x16 en área. Ese salto es el que hace que el borde de la sombra deje
   de ser un escalón de 10 cm.

   ANTI-TEMBLOR: mover el frustum con el jugador hace "reptar" la sombra (el borde salta
   medio texel por frame). Por eso el centro se CUANTIZA a la grilla de texeles en el
   espacio de la luz antes de asignarlo; con 2,5 cm por texel el salto es invisible.

   COSTO: el pase de sombra dibuja la escena una vez más, pero AHORA CON MENOS OBJETOS
   (el frustum es 4 veces más chico en área), así que el pase de sombra sale más barato que
   en high; lo que se paga es el fill rate del mapa 2048 (4x los píxeles de 1024). */
const SUNOFF=new THREE.Vector3(70,110,50);   /* el offset de core_a: no cambia la dirección */
const SHD_U=26;        /* media-anchura del frustum en ultra (26 -> 52 m de lado) */
const SHSZ_U=2048;
const _shT=new THREE.Vector3(),_shF=new THREE.Vector3();
const _shX=new THREE.Vector3(),_shY=new THREE.Vector3(),_shZ=new THREE.Vector3();
let shOn=false,shT=0,shFits=0;
function shBasis(){
  _shZ.copy(SUNOFF).normalize();
  _shX.set(0,1,0).cross(_shZ);
  if(_shX.lengthSq()<1e-8)_shX.set(1,0,0);
  _shX.normalize();
  _shY.copy(_shZ).cross(_shX).normalize();
}
/* pega el frustum al jugador; se llama cada N frames (no cada frame: mover la sombra
   fuerza un redibujado del mapa y no hace falta a 60 Hz) */
function shFit(force){
  if(!shOn)return;
  const px=(typeof plBody!=='undefined'&&plBody)?plBody.position:camera.position;
  /* un poco adelante de la vista: el jugador ve hacia adelante, no hacia atrás */
  _shF.set(0,0,-1).applyQuaternion(camera.quaternion);_shF.y=0;
  if(_shF.lengthSq()<1e-6)_shF.set(0,0,-1);else _shF.normalize();
  _shT.set(px.x+_shF.x*SHD_U*.32,px.y,px.z+_shF.z*SHD_U*.32);
  /* cuantización a texel en el plano de la luz (anti-reptado del borde) */
  const q=2*SHD_U/SHSZ_U;
  const a=_shT.dot(_shX),b=_shT.dot(_shY);
  _shT.addScaledVector(_shX,-(a-Math.round(a/q)*q));
  _shT.addScaledVector(_shY,-(b-Math.round(b/q)*q));
  if(!force&&sun.target.position.distanceToSquared(_shT)<q*q)return;
  sun.target.position.copy(_shT);
  sun.position.copy(_shT).add(SUNOFF);
  sun.target.updateMatrixWorld();
  shFits++;
}
/* recompilar materiales: el tipo de shadow map es parte de la clave del programa */
let shRecompiles=0;
function shRecompile(){
  const seen=new Set();
  const touch=m=>{if(!m||seen.has(m))return;seen.add(m);m.needsUpdate=true;};
  scene.traverse(o=>{const m=o.material;if(!m)return;
    if(Array.isArray(m))m.forEach(touch);else touch(m);});
  for(const k in PMAT)touch(PMAT[k]);
  shRecompiles++;
}
/* IDEMPOTENTE a propósito (no corta si el estado no cambió): applyQualLive resetea el
   mapSize a QP.shadow y applyOpts pisa shadowMap.enabled, así que cada vez que se toca
   Ajustes hay que RE-IMPONER lo nuestro. Lo caro (disponer el mapa, recompilar) está
   guardado detrás de un if de cambio real. */
function shApply(){
  const want=ultraOn()&&!!SV.gshadow&&QP.shadow>0&&SV.shadow!==false;
  shOn=want;
  const c=sun.shadow.camera;
  if(want){
    shBasis();
    if(sun.shadow.mapSize.x!==SHSZ_U){
      sun.shadow.mapSize.set(SHSZ_U,SHSZ_U);
      if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
    }
    c.left=-SHD_U;c.right=SHD_U;c.top=SHD_U;c.bottom=-SHD_U;c.near=1;c.far=240;
    c.updateProjectionMatrix();
    /* con 4x de resolución el bias de high (-0.0011) despega la sombra del pie: se baja
       casi 3 veces y el normalBias con él */
    sun.shadow.bias=-0.00035;sun.shadow.normalBias=.018;
    if(renderer.shadowMap.type!==THREE.PCFSoftShadowMap){
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;shRecompile();}
    shFit(true);
  }else{
    /* vuelta EXACTA a lo que dejó core_a, para que apagar Ultra no deje secuelas */
    const sz=QP.shadow||1024;
    if(sun.shadow.mapSize.x!==sz){sun.shadow.mapSize.set(sz,sz);
      if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
    const d=52;c.left=-d;c.right=d;c.top=d;c.bottom=-d;c.near=1;c.far=260;
    c.updateProjectionMatrix();
    sun.shadow.bias=-0.0011;sun.shadow.normalBias=.035;
    if(renderer.shadowMap.type!==THREE.PCFShadowMap){
      renderer.shadowMap.type=THREE.PCFShadowMap;shRecompile();}
    sun.target.position.set(0,0,0);sun.position.copy(SUNOFF);sun.target.updateMatrixWorld();
  }
}

/* ============================================================
   3. LUCES DINÁMICAS (la parte "path tracing" que sí corre)
   ------------------------------------------------------------
   Un POOL fijo de PointLights que se reparte por CERCANÍA y por importancia entre todas
   las fuentes del mundo. El pool es fijo a propósito: three.js recompila TODOS los
   programas cuando cambia la cantidad de luces visibles de la escena, así que agregar y
   quitar luces por evento produciría un tirón de 200 ms en cada disparo. Acá las luces
   nacen una vez y lo que se mueve es la intensidad (0 = apagada, sin recompilar nada).

   Ninguna proyecta sombra: una PointLight con sombra son SEIS pases de cubemap y en un
   celular es suicidio. La sombra dinámica del pedido la da el sol (punto 2), que sí es
   direccional y sí es dinámica.

   Fuentes conectadas:
     · fogonazo del arma (envuelve muzzleFlash de core_g)
     · explosión (envuelve boom de core_b/core_g)
     · pirotecnia (REASIGNA litLight de core_l, que ya tenía UNA luz suelta -> ahora pool)
     · props con material 'neon' cercanos (barras, carteles, farolas: 60+ props del juego)
     · el vehículo que estás manejando (faro que sigue la marcha) */
const LPOOL=[];
let lpN=0,lpUsed=0,lpNeonT=0,lpSteals=0;
const lpMax=()=>ultraOn()&&SV.dlights?12:(gfxAllow()?4:0);
function lpEnsure(){
  const n=lpMax();
  if(n===lpN)return;
  while(LPOOL.length<n){
    const l=new THREE.PointLight(0xffffff,0,10,2);
    l.castShadow=false;l.visible=true;
    LPOOL.push({l,t:0,tot:1,pk:0,key:'',st:false,inScene:false});
  }
  for(let i=0;i<LPOOL.length;i++){
    const s=LPOOL[i],want=i<n;
    if(want&&!s.inScene){scene.add(s.l);s.inScene=true;}
    else if(!want&&s.inScene){s.l.intensity=0;scene.remove(s.l);s.inScene=false;s.t=0;s.key='';}
  }
  lpN=n;
}
/* elige slot: el mismo key si ya lo tenía, si no uno libre, si no el MENOS visible
   (menor vida restante x pico) — así un fogonazo nunca le roba el lugar a una explosión */
function lpSlot(key,pk){
  let free=null,worst=null,ww=1e9;
  for(let i=0;i<lpN;i++){
    const s=LPOOL[i];
    if(key&&s.key===key&&s.t>0)return s;
    if(s.t<=0){if(!free)free=s;continue;}
    const w=s.t*Math.max(.01,s.pk);
    if(w<ww){ww=w;worst=s;}
  }
  if(free)return free;
  if(worst&&pk>=worst.pk*.5){lpSteals++;return worst;}
  return null;
}
/* la única puerta de entrada: x,y,z, color, pico, alcance, vida, key, sostenida */
function litPool(x,y,z,hex,pk,dist,life,key,sustain){
  if(!lpN)return false;
  const s=lpSlot(key||'',pk);
  if(!s)return false;
  s.l.position.set(x,y,z);
  s.l.color.setHex(hex==null?0xffffff:hex);
  s.l.distance=dist||10;
  s.pk=pk;s.tot=Math.max(.02,life||.2);s.t=s.tot;s.key=key||'';s.st=!!sustain;
  s.l.intensity=pk;
  return true;
}
function lpStep(dt){
  lpUsed=0;
  for(let i=0;i<lpN;i++){
    const s=LPOOL[i];
    if(s.t<=0){if(s.l.intensity)s.l.intensity=0;continue;}
    s.t-=dt;
    if(s.t<=0){s.t=0;s.l.intensity=0;s.key='';continue;}
    /* sostenidas: intensidad plana mientras la fuente las siga refrescando.
       transitorias: caída cuadrática, que es como se apaga un fogonazo de verdad */
    const f=s.t/s.tot;
    s.l.intensity=s.st?s.pk:s.pk*f*f;
    lpUsed++;
  }
}
/* ---- neones: qué parte del prop brilla y de qué color (se calcula UNA vez por def) ---- */
function neonOf(def){
  if(def._neon!==undefined)return def._neon;
  let out=null;
  const b=buildDef(def);
  if(b&&b.mats&&b.mats.indexOf('neon')>=0&&def.parts){
    let best=null,ba=-1;
    for(const q of def.parts){
      if((q.m||'')!=='neon')continue;
      const a=(q.d&&q.d.length?q.d.reduce((x,y)=>x+y,0):1);
      if(a>ba){ba=a;best=q;}
    }
    if(best){
      const p=best.p||[0,0,0],c=b.ctr||[0,0,0];
      out={off:[p[0]-c[0],p[1]-c[1],p[2]-c[2]],
           hex:best.c!=null?best.c:(MDEF.neon&&MDEF.neon.em||0x2fd8ff)};
    }
  }
  def._neon=out;return out;
}
const _lnL=new CANNON.Vec3(),_lnW=new CANNON.Vec3();
let lpNeon=0;
/* reparto por cercanía: los neones más cerca de la cámara se quedan con la mitad del pool */
function lpNeonScan(){
  lpNeon=0;
  if(!lpN||typeof PROPS==='undefined')return;
  const cap=Math.max(1,lpN>>1),cx=camera.position.x,cy=camera.position.y,cz=camera.position.z;
  const cand=[];
  for(let i=0;i<PROPS.length;i++){
    const p=PROPS[i],n=neonOf(p.def);
    if(!n)continue;
    const dx=p.body.position.x-cx,dy=p.body.position.y-cy,dz=p.body.position.z-cz;
    const d2=dx*dx+dy*dy+dz*dz;
    if(d2>900)continue;                 /* 30 m: más lejos no aporta nada visible */
    cand.push({p,n,d2});
  }
  cand.sort((a,b)=>a.d2-b.d2);
  for(let i=0;i<cand.length&&i<cap;i++){
    const c=cand[i];
    _lnL.set(c.n.off[0],c.n.off[1],c.n.off[2]);
    c.p.body.pointToWorldFrame(_lnL,_lnW);
    /* sostenida y refrescada cada 0,25 s: si el prop se borra o se aleja, se apaga sola */
    if(litPool(_lnW.x,_lnW.y,_lnW.z,c.n.hex,2.6,8.5,.4,'n'+c.p.seq,true))lpNeon++;
  }
}
/* ---- vehículo encendido: un faro que sigue la marcha ---- */
const _lvV=new THREE.Vector3(),_lvQ=new THREE.Quaternion();
function lpVeh(){
  if(!lpN)return;
  const V=(typeof VHS!=='undefined')?VHS:null;
  if(!V||!V.p||!V.p.body)return;
  const b=V.p.body,v=b.velocity;
  const sp=Math.hypot(v.x,v.z);
  if(sp>1.5){_lvV.set(v.x/sp,0,v.z/sp);}
  else{_lvQ.set(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
    _lvV.set(0,0,1).applyQuaternion(_lvQ);_lvV.y=0;
    if(_lvV.lengthSq()<1e-6)_lvV.set(0,0,1);else _lvV.normalize();}
  litPool(b.position.x+_lvV.x*2.6,b.position.y+.7,b.position.z+_lvV.z*2.6,
    0xfff0cf,7,16,.4,'veh',true);
}

/* ---- enganches a lo que ya existe (REASIGNACIÓN, nunca edición) ---- */
/* pirotecnia: core_l llamaba a UNA PointLight suelta (FWLIGHT). Al reasignar litLight
   FWLIGHT queda con fwLightT=0 para siempre (litLight era su único disparador), o sea
   apagada, y la luz de los estallidos pasa por el pool con su color real. */
if(typeof litLight!=='undefined')litLight=function(x,y,z,hex){
  if(!lpN)return;
  litPool(x,y,z,hex==null?0xffffff:hex,14,46,.42,'',false);
};
/* y FWLIGHT sale de la escena: una PointLight con intensidad 0 SIGUE OCUPANDO una ranura de
   luz en el shader de todos los materiales (three cuenta las luces visibles del grafo, no las
   que iluminan). Dejarla puesta era pagar el costo sin recibir luz. */
if(typeof FWLIGHT!=='undefined'&&FWLIGHT&&FWLIGHT.parent)nsafe(()=>scene.remove(FWLIGHT),'fwl');
/* FOGONAZO. La luz NO se cuelga de muzzleFlash: core_t lo REEMPLAZA entero (no llama al
   anterior) y ahí la luz se perdería sin aviso. Se cuelga de fireGun/shootProj, que nadie más
   envuelve, y la posición de la boca la da muzzleWorld() de core_g — la misma que usan core_g
   y core_t, así que la luz sale exactamente de donde salen las chispas. */
const _mzP2=new THREE.Vector3(),_mzD2=new THREE.Vector3();
function gfxMuzzleLight(pk){
  if(!lpN||typeof muzzleWorld!=='function')return false;
  if(!muzzleWorld(_mzP2,_mzD2))return false;
  return litPool(_mzP2.x+_mzD2.x*.12,_mzP2.y+_mzD2.y*.12,_mzP2.z+_mzD2.z*.12,
    0xffc46a,pk,9,.07,'',false);
}
if(typeof fireGun!=='undefined'){
  const _fg0=fireGun;
  fireGun=function(){ const a=weap().ammo; _fg0.apply(null,arguments);
    if(weap().ammo<a)nsafe(()=>gfxMuzzleLight(weap().dmg>60?16:10),'gfxmz'); };
}
if(typeof shootProj!=='undefined'){
  const _sp0=shootProj;
  shootProj=function(){ const a=weap().ammo; _sp0.apply(null,arguments);
    if(weap().ammo<a)nsafe(()=>gfxMuzzleLight(18),'gfxmz2'); };
}
/* y la PointLight suelta de core_g (muzzleFlash._l) sale de la escena por la misma razón que
   FWLIGHT: ocupaba una ranura de luz en el shader de todo. Si core_t está cargado, su
   muzzleFlash nunca la crea y este envoltorio no llega a correr: en los dos casos queda bien. */
if(typeof muzzleFlash!=='undefined'){
  const _mf0=muzzleFlash;
  muzzleFlash=function(){
    _mf0.apply(null,arguments);
    const l=muzzleFlash._l;
    if(l&&l.parent){l.intensity=0;l.parent.remove(l);}
  };
}
/* explosión: luz grande, corta y naranja, con alcance proporcional al radio */
if(typeof boom!=='undefined'){
  const _boom0=boom;
  boom=function(P,R){
    _boom0.apply(null,arguments);
    if(lpN&&P)litPool(P.x,P.y+R*.15,P.z,0xffa23c,34,Math.max(10,(R||6)*3.2),.5,'',false);
  };
}

/* ============================================================
   4. ILUMINACIÓN INDIRECTA: environment map PMREM procedural
   ------------------------------------------------------------
   Un gradiente vertical de cielo (cielo arriba, horizonte claro, suelo oscuro) en un
   canvas de 32x256 se pasa por PMREMGenerator: queda un cubemap prefiltrado por
   roughness. Eso es IBL: el término difuso + especular de UN rebote del cielo,
   precalculado. Es lo que hace que un metal deje de ser gris plano y que las caras que
   no ven al sol dejen de ser negras — sin trazar un solo rayo por frame.
   Sólo sirve con materiales PBR (MeshStandardMaterial), o sea NO en uld/low (Phong).
   Al prenderlo se baja el hemisférico: si no, la escena se va a blanco (doble ambiente). */
let envTex=null,envRTo=null;
const HEMI0=hemi.intensity;
function envSkyCanvas(){
  const cv=document.createElement('canvas');cv.width=32;cv.height=256;
  const cx=cv.getContext('2d');
  const bg=(scene.background&&scene.background.isColor)?scene.background:new THREE.Color(0x9fbcd4);
  const top=bg.clone().multiplyScalar(.82),hor=bg.clone().lerp(new THREE.Color(0xffffff),.55),
        gnd=(scene.fog&&scene.fog.color?scene.fog.color.clone():bg.clone()).multiplyScalar(.30);
  const g=cx.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#'+top.getHexString());
  g.addColorStop(.44,'#'+bg.getHexString());
  g.addColorStop(.52,'#'+hor.getHexString());
  g.addColorStop(.62,'#'+gnd.clone().lerp(hor,.35).getHexString());
  g.addColorStop(1,'#'+gnd.getHexString());
  cx.fillStyle=g;cx.fillRect(0,0,32,256);
  return cv;
}
function envBuild(){
  envDrop();
  const pm=new THREE.PMREMGenerator(renderer);
  const t=new THREE.CanvasTexture(envSkyCanvas());
  t.mapping=THREE.EquirectangularReflectionMapping;
  t.colorSpace=THREE.SRGBColorSpace;
  t.needsUpdate=true;
  envRTo=pm.fromEquirectangular(t);
  envTex=envRTo.texture;
  pm.dispose();t.dispose();
  renderer.setRenderTarget(null);   /* PMREM deja un target puesto: hay que soltarlo */
}
function envDrop(){
  if(scene.environment===envTex)scene.environment=null;
  if(envRTo){envRTo.dispose();envRTo=null;}
  envTex=null;
}
function envApply(){
  const want=ultraOn()&&!!SV.genv&&!QP.phong;
  if(want){
    if(!envTex)envBuild();
    scene.environment=envTex;
    if('environmentIntensity' in scene)scene.environmentIntensity=.55;
    hemi.intensity=HEMI0*.5;
  }else{
    if(envTex)envDrop();
    scene.environment=null;
    hemi.intensity=HEMI0;
  }
}

/* ============================================================
   5. APLICAR TODO + engancharse a Ajustes
   ============================================================ */
let gfxApplyN=0;
function gfxApply(){
  gfxApplyN++;
  nsafe(shApply,'gfxsh');
  nsafe(lpEnsure,'gfxlp');
  nsafe(envApply,'gfxenv');
  if(!mbOn()){mbFree();mbFresh=true;}
  gfxUI(false);
}
/* applyOpts (core_b) pisa renderer.shadowMap.enabled/sun.castShadow con SV.shadow: hay que
   volver a aplicar lo nuestro DESPUÉS. Y applyQualLive resetea mapSize a QP.shadow y
   reconstruye el cielo: idem. Se reasignan envolviendo, no editando. */
if(typeof applyOpts!=='undefined'){
  const _ao=applyOpts;
  applyOpts=function(fill){ _ao.apply(null,arguments); nsafe(gfxApply,'gfxopts'); };
}
if(typeof applyQualLive!=='undefined'){
  const _aq=applyQualLive;
  applyQualLive=function(){ _aq.apply(null,arguments);
    /* el cielo cambió de textura: el env map se regenera con el color nuevo */
    if(envTex){envDrop();}
    nsafe(gfxApply,'gfxqual'); };
}

/* ---------- textos ---------- */
Object.assign(I18N.es,{gfxT:'Gráficos Ultra 4K',
  gfxS:'Sólo en calidad ALTA. Difuminado de movimiento, sombras grandes y luces dinámicas por cercanía (aproximación de path tracing: no traza rayos, precalcula el rebote del cielo).',
  gfxOn:'ULTRA 4K',gfxMb:'Difuminado de movimiento',gfxMbA:'Cantidad de difuminado',
  gfxSh:'Sombras god (2048 + frustum cercano)',gfxLi:'Luces dinámicas (12)',
  gfxEnv:'Iluminación indirecta y reflejos',
  gfxReq:'Requiere calidad ALTA (⚙ Gráficos)',gfxOnT:'✨ Ultra 4K encendido',gfxOffT:'Ultra 4K apagado'});
Object.assign(I18N.en,{gfxT:'Ultra 4K graphics',
  gfxS:'HIGH quality only. Motion blur, big shadows and nearest-first dynamic lights (path tracing approximation: no rays traced, the sky bounce is precomputed).',
  gfxOn:'ULTRA 4K',gfxMb:'Motion blur',gfxMbA:'Blur amount',
  gfxSh:'God shadows (2048 + near frustum)',gfxLi:'Dynamic lights (12)',
  gfxEnv:'Indirect lighting and reflections',
  gfxReq:'Needs HIGH quality (⚙ Graphics)',gfxOnT:'✨ Ultra 4K on',gfxOffT:'Ultra 4K off'});
Object.assign(I18N.pt,{gfxT:'Gráficos Ultra 4K',
  gfxS:'Só na qualidade ALTA. Desfoque de movimento, sombras grandes e luzes dinâmicas por proximidade (aproximação de path tracing: não traça raios, pré-calcula o rebote do céu).',
  gfxOn:'ULTRA 4K',gfxMb:'Desfoque de movimento',gfxMbA:'Quantidade de desfoque',
  gfxSh:'Sombras god (2048 + frustum perto)',gfxLi:'Luzes dinâmicas (12)',
  gfxEnv:'Iluminação indireta e reflexos',
  gfxReq:'Precisa qualidade ALTA (⚙ Gráficos)',gfxOnT:'✨ Ultra 4K ligado',gfxOffT:'Ultra 4K desligado'});

/* ---------- el apartado en #optcard ---------- */
let gfxBox=null;
nsafe(()=>{
  const card=document.getElementById('optcard');if(!card)return;
  const css=document.createElement('style');
  css.textContent=
   '#gfxBox{grid-column:1/-1;border-top:1px solid rgba(255,255,255,.22);margin-top:8px;padding-top:8px}'+
   '#gfxBox .gfxt{font:900 16px inherit;margin-bottom:4px}'+
   '#gfxBox .gfxh{display:flex;align-items:center;gap:10px;font:900 15px inherit}'+
   '#gfxBox .gfxh input{width:22px;height:22px}'+
   '#gfxBox .gfxs{font:600 11.5px inherit;opacity:.72;margin:3px 0 6px;line-height:1.35}'+
   '#gfxBox .gfxg{display:grid;grid-template-columns:1fr 1fr;gap:2px 22px}'+
   '#gfxBox.off .gfxg,#gfxBox.off .gfxa{opacity:.42;pointer-events:none}'+
   '#gfxBox .gfxw{font:800 11.5px inherit;color:#ffd479;display:none}'+
   '#gfxBox.na .gfxw{display:block}'+
   '#gfxBox.na .gfxh{opacity:.5;pointer-events:none}'+
   '#gfxBox .gfxa{margin-top:4px}';
  document.head.appendChild(css);
  const box=document.createElement('div');box.id='gfxBox';
  box.innerHTML=
   '<div class="gfxt" id="oUltraT">Gráficos Ultra 4K</div>'+
   '<div class="gfxh"><input type="checkbox" id="oUltra"><span id="oUltraL">ULTRA 4K</span></div>'+
   '<div class="gfxs" id="oUltraS"></div>'+
   '<div class="gfxw" id="oUltraW"></div>'+
   '<div class="gfxg">'+
   '<label class="chk"><input type="checkbox" id="oMblur"><span id="oMblurL"></span></label>'+
   '<label class="chk"><input type="checkbox" id="oGsh"><span id="oGshL"></span></label>'+
   '<label class="chk"><input type="checkbox" id="oDli"><span id="oDliL"></span></label>'+
   '<label class="chk"><input type="checkbox" id="oGenv"><span id="oGenvL"></span></label>'+
   '</div>'+
   '<div class="sl gfxa"><label><span id="oMbAL"></span><b id="oMbAV"></b></label>'+
   '<input type="range" id="oMbA" min="0" max="100" step="5"></div>';
  const foot=document.getElementById('optfoot');
  if(foot)card.insertBefore(box,foot);else card.appendChild(box);
  gfxBox=box;
  const bind=(id,key,fn)=>{
    const e=document.getElementById(id);if(!e)return;
    e.addEventListener('input',()=>nsafe(()=>{
      SV[key]=e.type==='checkbox'?e.checked:(+e.value)/100;
      if(fn)fn();
      gfxApply();save();
    },'gfx'+key));
  };
  bind('oUltra','ultra',()=>{ if(typeof toast!=='undefined')toast(T(SV.ultra?'gfxOnT':'gfxOffT')); });
  bind('oMblur','mblur');bind('oGsh','gshadow');bind('oDli','dlights');bind('oGenv','genv');
  bind('oMbA','mbAmt');
  gfxUI(true);
},'gfxui');
/* fill=true -> además de textos, mete los valores de SV en los controles */
function gfxUI(fill){
  if(!gfxBox)return;
  const g=id=>document.getElementById(id);
  const na=!gfxAllow();
  gfxBox.classList.toggle('na',na);
  gfxBox.classList.toggle('off',!SV.ultra||na);
  const L={oUltraT:'gfxT',oUltraL:'gfxOn',oUltraS:'gfxS',oUltraW:'gfxReq',oMblurL:'gfxMb',
           oGshL:'gfxSh',oDliL:'gfxLi',oGenvL:'gfxEnv',oMbAL:'gfxMbA'};
  for(const id in L){const e=g(id);if(e)e.textContent=T(L[id]);}
  const li=g('oDliL');if(li)li.textContent=T('gfxLi').replace('12',String(lpMax()||12));
  if(fill){
    g('oUltra').checked=!!SV.ultra;g('oMblur').checked=!!SV.mblur;
    g('oGsh').checked=!!SV.gshadow;g('oDli').checked=!!SV.dlights;g('oGenv').checked=!!SV.genv;
    g('oMbA').value=Math.round(clamp(SV.mbAmt,0,1)*100);
  }
  const v=g('oMbAV');if(v)v.textContent=Math.round(clamp(SV.mbAmt,0,1)*100)+'%';
}
/* los textos del apartado siguen al idioma elegido */
if(typeof applyLang!=='undefined'){
  const _alg=applyLang;
  applyLang=function(){ _alg.apply(null,arguments); nsafe(()=>gfxUI(true),'gfxlang'); };
}

/* ============================================================
   6. ENGANCHE AL BUCLE (todo con dt, nada por frame sin dt)
   ============================================================ */
EXT.frame.push(dt=>nsafe(()=>{
  const d=Math.min(.05,dt||0);
  /* el factor de mezcla se calcula ACÁ (antes del render, que es donde se usa) porque
     necesita dt y el movimiento real de la cámara de este frame */
  if(mbOn()){ mbMotion(d);mbK=mbFactor(d); } else { mbK=1;mbMot=0;mbHasPrev=false; }
  if(lpN){
    lpStep(d);
    lpNeonT+=d;
    /* el barrido de neones es O(props) y no hace falta a 60 Hz: 4 veces por segundo */
    if(lpNeonT>.25){lpNeonT=0;lpNeonScan();}
    lpVeh();
  }
  if(shOn){
    shT+=d;
    /* el frustum se re-pega cada ~0,1 s: mover la sombra invalida el mapa, a 60 Hz sería
       redibujarla 60 veces por segundo sin que se note la diferencia */
    if(shT>.1){shT=0;shFit(false);}
  }
},'gfxframe'));

/* aplicar al arrancar (después de que core_b haya hecho su applyOpts inicial) */
setTimeout(()=>nsafe(gfxApply,'gfxboot'),120);

/* ============================================================
   7. HOOKS (?dev)
   ============================================================ */
if(DEV&&window.__H)Object.assign(window.__H,{
  gfxInfo:()=>({
    ultra:ultraOn(),allow:gfxAllow(),qual:QP.key,
    mblur:mbOn(),mbAmt:+clamp(SV.mbAmt,0,1).toFixed(2),mbK:+mbK.toFixed(3),
    mbMot:+mbMot.toFixed(2),mbRT:mbCur?[mbW,mbH]:null,mbFrames:mbN,
    shadow:shOn,shadowMap:renderer.shadowMap.enabled?sun.shadow.mapSize.x:0,
    shadowType:renderer.shadowMap.type,
    /* texeles de sombra POR METRO: el número que dice si la sombra se ve god o escalonada */
    shadowTexels:+(sun.shadow.mapSize.x/Math.max(1,(sun.shadow.camera.right-sun.shadow.camera.left))).toFixed(2),
    shadowSpan:+(sun.shadow.camera.right-sun.shadow.camera.left).toFixed(1),
    shadowBias:sun.shadow.bias,shFits,shRecompiles,
    lights:lpN,lightsOn:lpUsed,neon:lpNeon,steals:lpSteals,
    env:!!scene.environment,envI:('environmentIntensity' in scene)?scene.environmentIntensity:null,
    hemi:+hemi.intensity.toFixed(3),
    fps:(typeof fpsShow!=='undefined')?fpsShow:0,
    applies:gfxApplyN,err:gfxErr}),
  /* set genérico: __H.gfxSet('ultra',true) — pasa por el mismo camino que la UI */
  gfxSet:(k,v)=>{SV[k]=v;gfxApply();gfxUI(true);save();return SV[k];},
  gfxLights:()=>LPOOL.slice(0,lpN).map(s=>({k:s.key,i:+s.l.intensity.toFixed(2),
    d:s.l.distance,t:+s.t.toFixed(2),st:s.st,
    p:[+s.l.position.x.toFixed(1),+s.l.position.y.toFixed(1),+s.l.position.z.toFixed(1)]})),
  gfxNeonIds:()=>{const o=[];for(const k in PDEF){if(neonOf(PDEF[k]))o.push(k);}return o;},
  /* fuerza el re-pegado del frustum y devuelve el centro (para verificar el seguimiento) */
  gfxShFit:()=>{shFit(true);return [+sun.target.position.x.toFixed(2),
    +sun.target.position.y.toFixed(2),+sun.target.position.z.toFixed(2)];},
  gfxBoom:(x,y,z,r)=>{if(typeof boom!=='undefined')boom(new THREE.Vector3(x,y,z),r||8);return lpUsed;},
  /* PRUEBA NUMÉRICA del difuminado: compara un bloque del frame ACTUAL (mbCur) con el
     mismo bloque del HISTORIAL ya mezclado (mbHist). Si la acumulación funciona y la cámara
     se mueve, el historial arrastra la imagen anterior y la diferencia media por canal tiene
     que ser >> 0; con la cámara quieta (mbK=1) tiene que caer a ~0. Sin esto el difuminado
     no se puede verificar: una captura de pantalla a 5 fps no prueba nada. */
  gfxMbDiff:()=>{
    if(!mbCur||!mbHist)return null;
    const W=64,H=32,x=Math.max(0,(mbW-W)>>1),y=Math.max(0,(mbH-H)>>1);
    const a=new Uint8Array(W*H*4),b=new Uint8Array(W*H*4);
    try{ renderer.readRenderTargetPixels(mbCur,x,y,W,H,a);
         renderer.readRenderTargetPixels(mbHist,x,y,W,H,b); }
    catch(e){ return {err:(e&&e.message)||'x'}; }
    let s=0,mx=0,n=0;
    for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++){
      const d=Math.abs(a[i+c]-b[i+c]);s+=d;if(d>mx)mx=d;n++;}
    return {mean:+(s/n).toFixed(2),max:mx,k:+mbK.toFixed(3),mot:+mbMot.toFixed(2),px:n/3};},
  gfxUIState:()=>{const b=document.getElementById('gfxBox');
    return b?{on:!b.classList.contains('off'),na:b.classList.contains('na'),
      title:document.getElementById('oUltraL').textContent,
      chk:[...b.querySelectorAll('input[type=checkbox]')].map(i=>[i.id,i.checked])}:null;}
});
