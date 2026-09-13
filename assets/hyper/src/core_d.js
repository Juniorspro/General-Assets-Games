/* ============================================================
   SUX SANDBOX — ICONOS DE LOS CONTROLES
   Los botones del HUD arrancan con un emoji (así el juego se ve completo incluso
   sin red) y acá se reemplaza por la IMAGEN GENERADA en cuanto carga. Si la imagen
   no llega (sin conexión, CDN caída) el emoji se queda donde estaba.
   ============================================================ */
const UIIC={bPause:'ic-pause',bChat:'ic-chat',bTools:'ic-wrench',bRag:'ic-rag',
  bCam:'ic-cam',bAim:'ic-scope',bRel:'ic-reload',bFire:'ic-fire',bFrz:'ic-frz',
  bJump:'ic-jump',bTrash:'ic-trash'};
let uiIcOk=0;
function uiIcon(el,name,cls){
  if(!el||!okUrl(BASE))return;
  const im=new Image();
  im.decoding='async';im.alt='';
  if(cls)im.className=cls;
  im.onload=()=>{el.textContent='';el.appendChild(im);uiIcOk++;};
  im.src=BASE+'ui/'+name+'.webp';
}
function uiIcons(){
  for(const id in UIIC)uiIcon(document.getElementById(id),UIIC[id]);
  uiIcon(document.querySelector('#hp em'),'ic-heart');
}
uiIcons();

/* ---- el personaje se leía casi negro de espaldas ----
   La ropa del modelo generado es azul muy oscuro y el hemisférico del cielo no alcanza
   para separarlo del pasto: se le suben las bases de color un 22 % (sólo al personaje,
   una vez, cuando el GLB ya está en la escena). El mundo queda igual. */
let charLit=0;
function litChar(){
  if(charLit||!charRoot)return;
  let n=0;
  charRoot.traverse(o=>{ if(!o.isMesh||!o.material)return;
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(!m||m._lit)continue; m._lit=1;
      if(m.color)m.color.multiplyScalar(1.22);
      n++; } });
  if(n)charLit=1;
}
EXT.frame.push(()=>{ if(!charLit)litChar(); });

if(DEV&&window.__H)Object.assign(window.__H,{
  charLit:()=>charLit,
  /* cuántos botones quedaron con imagen generada y cuáles */
  icons:()=>({ok:uiIcOk,
    img:Object.keys(UIIC).filter(id=>{const e=document.getElementById(id);
      return !!(e&&e.querySelector('img'));}),
    heart:!!document.querySelector('#hp em img')})});

/* ============================================================
   SUX SANDBOX — VEHÍCULOS: ATROPELLAR PROPS + API DE PRUEBA
   ------------------------------------------------------------
   El manejo en sí (CANNON.RaycastVehicle sobre el cuerpo del prop, cámara detrás,
   botón SUBIR/BAJAR y freno de mano) YA está implementado en core_e.js, que se
   concatena después de este archivo. Duplicarlo acá rompería el build (mismo
   módulo => `const VHK` declarado dos veces), así que este archivo aporta las dos
   piezas que faltaban y se acopla por CONTRATO, no por variables:

     · core_e marca el prop que se está manejando con  p.drive === true
     · core_e publica en window.__H:  vehEnter / vehExit / vehIn / vehState / vehNear

   1) ATROPELLAR (punto 5 de la tarea): mientras se maneja, la colisión del chasis son
      cajas LEVANTADAS del piso (así la suspensión trabaja), de modo que los props
      chicos pasan por DEBAJO sin que nada los toque: el auto los ignoraba. Acá se
      detectan los props que quedan bajo la panza o pegados a las ruedas y se les
      aplica un impulso — siempre con body.wakeUp() ANTES, porque un cuerpo dormido
      se come el impulso y no se mueve. Los props que sí chocan contra la caja los
      resuelve cannon; a esos sólo se los despierta.
   2) BARRA ANTIVUELCO: una curva a fondo con la suspensión alta lo acostaba.
   3) los alias de hooks que pide la API de prueba: vehNear / enterVeh / exitVeh /
      driving / vehInfo.
   ============================================================ */

const VKICK={
  reach : 0.55,  // m de margen alrededor de la caja del chasis
  vmin  : 1.1,   // m/s: por debajo de esto no se patea nada
  push  : 0.85,  // impulso horizontal por kg y por m/s de acercamiento
  up    : 3.1,   // impulso vertical por kg (el "rebote")
  cap   : 15,    // m/s máximo que le podemos imprimir a un prop
  spin  : 4.2,   // rad/s de vuelta de campana
  cd    : 0.18   // s de espera antes de volver a patear el mismo prop
};
const _vkA=new CANNON.Vec3(),_vkB=new CANNON.Vec3(),_vkC=new CANNON.Vec3();

/* el prop que se está manejando (contrato con core_e: p.drive) */
function vkCar(){
  for(let i=0;i<PROPS.length;i++)if(PROPS[i].drive)return PROPS[i];
  return null;
}
/* huella del chasis en coordenadas del cuerpo: la UNIÓN de las cajas del collider
   (core_e puede armar el chasis con una caja o con varias) */
function vkBox(b){
  let mnx=1e9,mny=1e9,mnz=1e9,mxx=-1e9,mxy=-1e9,mxz=-1e9,n=0;
  for(let i=0;i<b.shapes.length;i++){
    const s=b.shapes[i],o=b.shapeOffsets[i];
    if(!s||!s.halfExtents||!o)continue;
    n++;
    mnx=Math.min(mnx,o.x-s.halfExtents.x);mxx=Math.max(mxx,o.x+s.halfExtents.x);
    mny=Math.min(mny,o.y-s.halfExtents.y);mxy=Math.max(mxy,o.y+s.halfExtents.y);
    mnz=Math.min(mnz,o.z-s.halfExtents.z);mxz=Math.max(mxz,o.z+s.halfExtents.z);
  }
  if(!n)return null;
  return{hx:(mxx-mnx)/2,hy:(mxy-mny)/2,hz:(mxz-mnz)/2,
         ox:(mnx+mxx)/2,oy:(mny+mxy)/2,oz:(mnz+mxz)/2};
}
let vkHits=0,vkLast=0;
function vkRun(dt,car){
  car=car||vkCar();
  if(!car||!car.body)return;
  const b=car.body,vx=b.velocity.x,vz=b.velocity.z,sp=Math.hypot(vx,vz);
  if(sp<VKICK.vmin)return;
  const box=vkBox(b);
  if(!box)return;
  const R=b.boundingRadius+1.6, R2=R*R, now=TT;
  for(let i=0;i<PROPS.length;i++){
    const p=PROPS[i];
    if(p===car||p.frozen||!p.body||p.body.mass<=0)continue;
    if(p.body.type===CANNON.Body.STATIC)continue;
    const q=p.body.position;
    const dx=q.x-b.position.x,dy=q.y-b.position.y,dz=q.z-b.position.z;
    if(dx*dx+dy*dy+dz*dz>R2)continue;
    if(p._vk&&now-p._vk<VKICK.cd)continue;
    const r=Math.max(.05,p.body.boundingRadius);
    /* ¿está dentro de la huella del auto (con margen) y por debajo de la panza? */
    _vkA.set(q.x,q.y,q.z);b.pointToLocalFrame(_vkA,_vkB);
    if(Math.abs(_vkB.x-box.ox)>box.hx+r+VKICK.reach)continue;
    if(Math.abs(_vkB.z-box.oz)>box.hz+r+VKICK.reach)continue;
    const floor=box.oy-box.hy;                    // panza del chasis
    if(_vkB.y-r>box.oy+box.hy)continue;            // le pasó por arriba del techo
    if(_vkB.y+r<floor-1.35)continue;               // muy abajo (otro piso)
    /* velocidad con la que el auto se le viene encima (en el plano) */
    const rel=(vx*dx+vz*dz)/Math.max(.001,Math.hypot(dx,dz));
    const closing=Math.max(0,-rel)+Math.max(0,sp*.55);
    if(closing<VKICK.vmin)continue;
    const m=p.body.mass,
          k=Math.min(closing*VKICK.push,VKICK.cap);
    /* SIEMPRE despertar antes: un cuerpo dormido ignora applyImpulse */
    p.body.wakeUp();p.manual=true;
    _vkC.set(vx/sp*m*k, m*VKICK.up*(_vkB.y<floor?1:.45), vz/sp*m*k);
    /* el impulso entra un poco por debajo del centro => el prop salta y voltea */
    _vkA.set(q.x,q.y-r*.5,q.z);
    p.body.applyImpulse(_vkC,_vkA);
    p.body.angularVelocity.y+=(Math.random()-.5)*VKICK.spin;
    p._vk=now;vkHits++;vkLast=now;
  }
}
/* ---------- barra estabilizadora: que no se tumbe en cada curva ----------
   Con la suspensión alta que necesita la carrocería, una curva a fondo a 95 km/h
   apoya el auto de costado y se termina el paseo. Esto es una barra antivuelco:
   NO endereza el auto (no hay resorte, no pelea con la física) — solamente le come
   la VELOCIDAD DE VUELCO alrededor de su eje longitudinal, que es lo que hace que
   el apoyo se transforme en tumbada. Si ya está patas para arriba no se toca, así
   los vuelcos "de verdad" (una explosión, el physgun, una rampa) siguen pasando. */
const VROLL={k:5.4,minUp:0.34};
const _vaF=new CANNON.Vec3(),_vaU=new CANNON.Vec3(),
      _vaZ=new CANNON.Vec3(0,0,1),_vaY=new CANNON.Vec3(0,1,0);
let vkRoll=0;
function vkAntiRoll(car,dt){
  const b=car.body;
  b.vectorToWorldFrame(_vaY,_vaU);
  if(_vaU.y<VROLL.minUp){vkRoll=0;return;}          // dado vuelta: se lo deja en paz
  b.vectorToWorldFrame(_vaZ,_vaF);
  const w=b.angularVelocity;
  const roll=w.x*_vaF.x+w.y*_vaF.y+w.z*_vaF.z;      // rad/s de vuelco
  const k=Math.min(.6,VROLL.k*dt);
  w.x-=_vaF.x*roll*k;w.y-=_vaF.y*roll*k;w.z-=_vaF.z*roll*k;
  vkRoll=roll;
}
EXT.post.push(dt=>{ try{
  const car=vkCar();
  if(car&&car.body){vkAntiRoll(car,dt);vkRun(dt,car);}
}catch(e){} });

/* ---------- API de prueba pedida por la tarea ---------- */
const _vkH=k=>(window.__H&&typeof window.__H[k]==='function')?window.__H[k]:null;
const _vkCall=(k,a)=>{const f=_vkH(k);return f?f(a):null;};
if(DEV&&window.__H)Object.assign(window.__H,{
  /* core_e define vehNear() con la misma firma; se deja este alias por si algún día
     no está: devuelve el vehículo manejable más cercano o null */
  vehNear:window.__H.vehNear||(()=>null),
  enterVeh:i=>!!_vkCall('vehEnter',i),
  exitVeh:()=>!!_vkCall('vehExit'),
  driving:()=>!!_vkCall('vehIn'),
  vehInfo:()=>{
    const st=_vkCall('vehState');
    const car=vkCar();
    return Object.assign({driving:!!st,near:_vkCall('vehNear'),
      kicks:vkHits,kickT:+vkLast.toFixed(2),
      carShapes:car?car.body.shapes.length:null},st||{});
  },
  /* cuántos props pateó el auto por pasar por encima */
  vehKicks:()=>vkHits,
  vehKickCfg:(k,v)=>{if(v!=null)VKICK[k]=v;return VKICK[k];},
  /* barra antivuelco: velocidad de vuelco que se está comiendo */
  vehRollAid:()=>{const car=vkCar();
    if(!car)return{roll:0,k:VROLL.k,now:null};
    const b=car.body;b.vectorToWorldFrame(_vaZ,_vaF);
    const w=b.angularVelocity;
    return{roll:+vkRoll.toFixed(3),k:VROLL.k,
      now:+(w.x*_vaF.x+w.y*_vaF.y+w.z*_vaF.z).toFixed(3)};},
  vehRollAidCfg:(k,v)=>{if(v!=null)VROLL[k]=v;return VROLL[k];},
  /* le imprime al auto que se maneja una velocidad de vuelco de w rad/s (para probar la barra) */
  vehSpin:w=>{const car=vkCar();if(!car)return null;
    const b=car.body;b.vectorToWorldFrame(_vaZ,_vaF);
    b.wakeUp();b.angularVelocity.set(_vaF.x*w,_vaF.y*w,_vaF.z*w);return w;}
});
