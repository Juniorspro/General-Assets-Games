/* ============================================================
   SUX SANDBOX — core_x: 25 EXPERIMENTOS DE CIRCUITOS ELÉCTRICOS Y MÁQUINAS (51..75)
   ------------------------------------------------------------
   Se concatena DESPUÉS de core_u (y de core_v/core_w), así que XP ya existe y acá sólo se
   llama a XP.add(). Los 25 props viven en props/xpx.js (sección 'xpx_circ' → pestaña
   Experimentos, carpeta "Circuitos").

   ┌─────────────────── LA IDEA: UN SOLO GRAFO DE SEÑALES ───────────────────┐
   Los 25 experimentos no son 25 efectos sueltos: son 25 TIPOS DE NODO de una misma red. Cada
   prop de circuito que hay en el mapa es un NODO con una entrada y una salida de 0 o 1; los
   cables (y, si no hay cables, la cercanía) los conectan; el motor evalúa el grafo entero 20
   veces por segundo y recién después aplica los efectos físicos. Por eso se pueden armar
   circuitos de verdad: palanca → AND → temporizador → puerta, y funciona.

   POR QUÉ UN MOTOR APARTE Y NO 25 step() DE XP
   Un experimento de core_u tiene UN ctx.prop (el que abriste), pero un circuito tiene MUCHAS
   instancias del mismo prop trabajando a la vez (tres lámparas, dos sensores, cuatro
   compuertas). Así que el ciclo de vida real lo lleva este motor, que recorre PROPS cuatro
   veces por segundo y crea/destruye un nodo por cada prop de circuito que aparece o se borra.
   Los XP.add() aportan (a) la PANTALLA de cada tipo y (b) los parámetros de tipo, que el motor
   lee en vivo con xxV(). Todos van con auto:true para que la maquinaria (hojas de la puerta,
   gancho de la grúa, cabeza de la torreta) exista desde que spawneás el prop, y NINGUNO usa un
   interruptor que llame a ctx.stop(): core_v ya documentó que auto:true + switch se pelean (el
   arranque automático vuelve a prender el experimento 0,25 s después de apagarlo). Lo que se
   apaga o prende por tipo es un valor 'en' que lee el motor.

   CONEXIONES: CABLE MANDA, CERCANÍA AYUDA
   - Si un nodo tiene cables entrando, sus entradas son EXACTAMENTE esos cables, en el orden en
     que se conectaron (importa para AND/XOR/flip-flop, que distinguen A de B).
   - Si no tiene ninguno, toma como entradas los nodos de rango MENOR que tenga a menos de
     XXG.link metros (6 por defecto), ordenados por distancia y hasta 4. Sin esto, poner una
     palanca al lado de una lámpara no haría nada y cada demostración necesitaría cablear a
     mano; con esto el sandbox se juega igual que el resto del juego (poné dos props y andá).
     El rango es pow(0) < entradas(1) < lógica(2) < salidas(3): así la corriente va para el
     lado que uno espera y no hay lazos infinitos por cercanía.
   - El orden de evaluación es por rango, o sea que una cadena de DOS compuertas propaga un
     salto por tick (50 ms a 20 Hz). Es deliberado: evaluar el grafo hasta converger permite
     lazos que oscilarían a la velocidad del frame (un NOT realimentado), y 50 ms de retardo por
     compuerta no se notan jugando. El flip-flop y el contador aprovechan justamente eso.

   ENERGÍA (experimento 51) — LA REGLA QUE HACE QUE TODO SIGA SIENDO JUGABLE
   Si NO hay ninguna batería encendida en el mapa, todos los nodos están alimentados: poner una
   lámpara y una palanca tiene que funcionar sin obligar a nadie a spawnear una batería.
   En cuanto hay una batería prendida, ELLA manda: sólo queda alimentado lo que esté dentro de
   su radio (o cableado a ella). Apagar la batería apaga el barrio entero, y eso se ve.

   LO QUE SE TOCA DEL MOTOR Y POR QUÉ (siempre REASIGNANDO, nunca re-declarando)
   - NADA. No hace falta: los props que se mueven (elevador) pasan a CANNON.Body.KINEMATIC, que
     el bucle de core_b ya sincroniza porque siguen en actives(); y las piezas móviles que un
     prop no puede tener (hojas de puerta, tapa de la placa, gancho de la grúa, cabeza de la
     torreta) son mallas + cuerpos cinemáticos propios de este archivo. Se usan los ganchos
     documentados: EXT.post (física, sólo jugando) y EXT.frame (visual, también en pausa).
   - Sí se LEEN cosas del módulo que core_u dejó a la vista (XPI, XPP, xpSetV, xpPaintCtl):
     todo esto es UN módulo ES, así que están en alcance. Se usan sólo para dos cosas que la
     API pública no cubre: sincronizar un control con el estado del PROP que abriste (una
     palanca por prop, no una por tipo) y para el "mientras se aprieta" del pulsador, que
     necesita pointerdown/pointerup sobre el botón ya construido.

   EL TELÉFONO GIRADO 90°
   Todos los paneles son los de core_u (position:absolute dentro de #stage, medidas en vmin), y
   este archivo no crea ni un elemento con position:fixed ni mide contra innerWidth/innerHeight,
   así que en vertical se ven y se tocan igual. Lo único que se agrega al DOM son los listeners
   del pulsador sobre un botón que ya vive dentro de #xpCard.

   RENDIMIENTO
   - Evaluación 20 Hz (regulable 5..60), escaneo de props 4 Hz, cables redibujados 10 Hz.
   - Nada de objetos nuevos por frame: vectores/quaternions de módulo, un InstancedMesh para
     TODOS los cables y otro para TODAS las partículas de fuego.
   - Presupuestos por calidad (QP.key): luces reales 8/4/3, cables 48/28/20, fuego 64/32/20.
   - Un nodo apagado no cuesta nada (se saltea antes de cualquier cuenta).

   HOOKS DE MEDICIÓN (?dev): __H.xpxTest() corre las 25 pruebas y devuelve {id:'ok'|'FALLO…'};
   además xxNodes xxWires xxSig xxSet xxTick xxCfg xxFire xxLights xxBoard.
   ============================================================ */

/* ---------- contrato para quien venga después ---------- */
if(typeof xxOnSig==='undefined')var xxOnSig=null;   /* fn(node,out) — aviso de cambio de señal */

Object.assign(I18N.es,{xxTab:'Circuitos',xxNoSig:'sin señal'});
Object.assign(I18N.en,{xxTab:'Circuits',xxNoSig:'no signal'});
Object.assign(I18N.pt,{xxTab:'Circuitos',xxNoSig:'sem sinal'});

/* ================= 1. TABLA DE TIPOS ================= */
/* t = nombre corto interno · k = familia · r = rango de evaluación (menor evalúa primero) */
const XXT={
  xpx_batt  :{t:'batt',  k:'pow', r:0, n:'Bateria'},
  xpx_wire  :{t:'wire',  k:'aux', r:0, n:'Cable'},
  xpx_btn   :{t:'btn',   k:'in',  r:1, n:'Pulsador'},
  xpx_sw    :{t:'sw',    k:'in',  r:1, n:'Palanca'},
  xpx_prox  :{t:'prox',  k:'in',  r:1, n:'Sensor prox'},
  xpx_plate :{t:'plate', k:'in',  r:1, n:'Placa peso'},
  xpx_clk   :{t:'clk',   k:'in',  r:1, n:'Oscilador'},
  xpx_timer :{t:'timer', k:'log', r:2, n:'Temporizador'},
  xpx_count :{t:'count', k:'log', r:2, n:'Contador'},
  xpx_and   :{t:'and',   k:'log', r:2, n:'AND'},
  xpx_or    :{t:'or',    k:'log', r:2, n:'OR'},
  xpx_not   :{t:'not',   k:'log', r:2, n:'NOT'},
  xpx_xor   :{t:'xor',   k:'log', r:2, n:'XOR'},
  xpx_ff    :{t:'ff',    k:'log', r:2, n:'FlipFlop'},
  xpx_lamp  :{t:'lamp',  k:'out', r:3, n:'Lampara'},
  xpx_siren :{t:'siren', k:'out', r:3, n:'Sirena'},
  xpx_door  :{t:'door',  k:'out', r:3, n:'Puerta'},
  xpx_lift  :{t:'lift',  k:'out', r:3, n:'Elevador'},
  xpx_belt  :{t:'belt',  k:'out', r:3, n:'Cinta'},
  xpx_crane :{t:'crane', k:'out', r:3, n:'Grua'},
  xpx_fan   :{t:'fan',   k:'out', r:3, n:'Turbina'},
  xpx_tele  :{t:'tele',  k:'out', r:3, n:'Teleporte'},
  xpx_flame :{t:'flame', k:'out', r:3, n:'Lanzallamas'},
  xpx_turret:{t:'turret',k:'out', r:3, n:'Torreta'},
  xpx_board :{t:'board', k:'aux', r:4, n:'Tablero'}
};
const XXID={};for(const k in XXT)XXID[XXT[k].t]=k;      /* t -> id de prop/experimento */

/* presupuestos por calidad: un celular en 'uld' no puede con 8 PointLight ni con 64 quads */
const XXCAP={
  light:QP.key==='high'?8:(QP.key==='low'?4:3),
  wire :QP.key==='high'?48:(QP.key==='low'?28:20),
  fire :QP.key==='high'?64:(QP.key==='low'?32:20),
  heavy:QP.key==='high'?14:8      /* cintas/turbinas/llamas/torretas ACTIVAS por frame */
};
/* estado global del motor (los ajustes editables viven en el panel del tablero y se copian
   acá en cada evaluación con xxCfg(): así el motor no busca en objetos por frame) */
const XXG={hz:20,link:6,pow:true,cable:true,volt:1,t:0,scanT:0,cabT:0,autoT:0,
  evals:0,seq:0,lights:0,on:false};

/* ================= 2. MALLAS COMPARTIDAS ================= */
/* Un material por color y una geometría por forma para TODOS los nodos: 40 lámparas cuestan
   40 mallas, no 40 materiales (cada material nuevo es una compilación de shader). */
const XXM={
  on   :new THREE.MeshBasicMaterial({color:0x7dff8a,fog:false}),
  off  :new THREE.MeshBasicMaterial({color:0x1d2620,fog:false}),
  red  :new THREE.MeshBasicMaterial({color:0xff3a2a,fog:false}),
  warm :new THREE.MeshBasicMaterial({color:0xffd7a0,fog:false,transparent:true,opacity:.95}),
  cyan :new THREE.MeshBasicMaterial({color:0x39dcff,fog:false,transparent:true,opacity:.6}),
  ring :new THREE.MeshBasicMaterial({color:0x39dcff,fog:false,transparent:true,opacity:.30,
          side:THREE.DoubleSide,depthWrite:false}),
  blur :new THREE.MeshBasicMaterial({color:0xc8d2dc,fog:false,transparent:true,opacity:.22,
          side:THREE.DoubleSide,depthWrite:false}),
  /* la pantalla del tablero: nace apagada (negra) y se le pone la textura cuando llega. Va
     Basic y no Phong porque un monitor emite luz, no la recibe. */
  hmi  :new THREE.MeshBasicMaterial({color:0xffffff,fog:false}),
  met  :new THREE.MeshPhongMaterial({color:0x9aa2a9,shininess:24}),
  dark :new THREE.MeshPhongMaterial({color:0x2b3037,shininess:12}),
  yel  :new THREE.MeshPhongMaterial({color:0xd8b62c,shininess:20}),
  rub  :new THREE.MeshPhongMaterial({color:0x1c1f23,shininess:6})
};
const XXGEO={
  led :new THREE.SphereGeometry(.055,8,6),
  glow:new THREE.SphereGeometry(.13,10,8),
  dome:new THREE.SphereGeometry(.135,10,8),
  ring:new THREE.RingGeometry(.93,1,28),
  disc:new THREE.CircleGeometry(.58,20),
  box :new THREE.BoxGeometry(1,1,1),
  cyl :new THREE.CylinderGeometry(.5,.5,1,10),
  quad:new THREE.PlaneGeometry(1,1)
};
XXGEO.ring.rotateX(-Math.PI/2);      /* el anillo del sensor se dibuja acostado en el piso */

/* ---- la pantalla del tablero de control (assets/hyper/xpx-hmi.jpg) ----
   Es la ÚNICA imagen generada de este archivo (Higgsfield, nano_banana_pro, 2 créditos): un
   sinóptico de HMI industrial con las mismas compuertas, temporizador, relé, testigos y barras
   que tienen los 25 experimentos, o sea que el tablero muestra algo coherente con lo que hace.
   NO se carga con loadTex(): esa función incrementa texPend y el arranque de core_b se queda
   esperando en la pantalla de carga a que termine todo lo pendiente — una textura decorativa no
   tiene por qué retrasar el arranque. Se usa un TextureLoader propio y, hasta que llegue (o si
   no llega nunca), la malla de la pantalla queda OCULTA: el prop ya trae su panel de neón
   abajo, así que sin la imagen no se ve ningún agujero. */
const XXHMI={ok:false};
nsafe(()=>{
  if(typeof BASE!=='string'||!BASE)return;
  if(typeof okUrl==='function'&&!okUrl(BASE))return;
  new THREE.TextureLoader().load(BASE+'xpx-hmi.jpg',t=>{
    t.colorSpace=THREE.SRGBColorSpace;
    t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;
    XXM.hmi.map=t;XXM.hmi.needsUpdate=true;XXHMI.ok=true;
  },undefined,()=>{XXHMI.ok=false;});
},'xxhmi');

/* vectores de módulo: cero basura por frame */
const _xxv=new THREE.Vector3(),_xxv2=new THREE.Vector3(),_xxv3=new THREE.Vector3(),
      _xxq=new THREE.Quaternion(),_xxq2=new THREE.Quaternion(),_xxm=new THREE.Matrix4(),
      _xxs=new THREE.Vector3(),_xxc=new THREE.Color(),_xxup=new THREE.Vector3(0,1,0),
      _xxcv=new CANNON.Vec3(),_xxcv2=new CANNON.Vec3(),_xxRR=new CANNON.RaycastResult(),
      _xxeu=new THREE.Euler(0,0,0,'YXZ');
const xxMesh=(g,m,s)=>{const o=new THREE.Mesh(g,m);if(s)o.scale.copy(s);return o;};
/* máscara 3 = grupo 1 (mapa y props) + grupo 2 (el jugador). La usa el rayo de la torreta. */
const XXRAY={skipBackfaces:true,collisionFilterMask:3};
const xxClamp=(v,a,b)=>v<a?a:(v>b?b:v);

/* sonido: envoltorio tolerante (si el catálogo no tiene el archivo cargado no pasa nada) */
let xxSnds=0;
function xxSnd(name,at,vol,rate){
  if(typeof sPlay!=='function')return false;
  const r=sPlay(name,{vol:vol==null?.7:vol,rate:rate||1,at:at||undefined});
  if(r)xxSnds++;
  return r;
}

/* ================= 3. NODOS ================= */
const XXN=new Map();      /* prop -> nodo */
const XXL=[];             /* nodos ordenados por rango (orden de evaluación) */
let XXDirty=true;         /* la topología cambió: hay que reordenar y recalcular vecinos */
const XXPS=new Set();     /* set de props vivos, reusado en cada escaneo (no se re-crea) */

function xxNode(p){return p?XXN.get(p)||null:null;}
function xxNameOf(n){return n?(XXT[n.p.def.xp]||{n:'?'}).n:'?';}

function xxMake(p,id){
  const T=XXT[id],b=buildDef(p.def);
  const n={p,id,t:T.t,k:T.k,r:T.r,seq:++XXG.seq,
    out:0,pin:0,prev:0,pow:1,dy:b.dy,sz:b.size,
    w:[],wo:[],ai:[],s:{},viz:null,
    pos:new THREE.Vector3(),ctr:new THREE.Vector3(),q:new THREE.Quaternion(),
    up:new THREE.Vector3(0,1,0),fwd:new THREE.Vector3(0,0,1),rgt:new THREE.Vector3(1,0,0)};
  XXN.set(p,n);XXDirty=true;
  xxPose(n);
  nsafe(()=>xxInit(n),'xxinit_'+n.t);      /* estado inicial y maquinaria propia del tipo */
  return n;
}
function xxKill(n){
  nsafe(()=>xxFree(n),'xxfree_'+n.t);
  for(let i=XXW.length-1;i>=0;i--)if(XXW[i].a===n||XXW[i].b===n)xxCut(XXW[i]);
  XXN.delete(n.p);XXDirty=true;
}
/* escaneo 4 Hz: crea nodos para los props de circuito nuevos y mata los de los props borrados.
   Se arma un Set con los props vivos en la MISMA pasada porque PROPS.indexOf() por nodo sería
   O(nodos × props) cuatro veces por segundo. */
const _xxDead=[];
function xxScan(){
  XXPS.clear();
  for(const p of PROPS){
    XXPS.add(p);
    const id=p.def&&p.def.xp;
    if(id&&XXT[id]&&!XXN.has(p))xxMake(p,id);
  }
  if(XXN.size){
    _xxDead.length=0;                       /* array reusado: nada de basura por escaneo */
    for(const n of XXN.values())if(!XXPS.has(n.p))_xxDead.push(n);
    for(const n of _xxDead)xxKill(n);
  }
  return XXN.size;
}
/* pose del nodo: base (y=0 del def) + ejes del mundo. Todo lo demás cuelga de acá. */
function xxPose(n){
  const b=n.p.body;
  n.q.set(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
  n.up.set(0,1,0).applyQuaternion(n.q);
  n.fwd.set(0,0,1).applyQuaternion(n.q);
  n.rgt.set(1,0,0).applyQuaternion(n.q);
  n.ctr.set(b.position.x,b.position.y,b.position.z);
  n.pos.copy(n.ctr).addScaledVector(n.up,-n.dy);
  return n;
}
/* punto local del def (y=0 = base del objeto) llevado al mundo, sin allocar */
function xxPt(n,x,y,z,out){
  const o=out||_xxv;
  o.copy(n.pos).addScaledVector(n.rgt,x||0).addScaledVector(n.up,y||0).addScaledVector(n.fwd,z||0);
  return o;
}
/* dónde se enganchan los cables y dónde va el testigo: arriba del prop */
const xxTop=(n,out)=>xxPt(n,0,n.sz[1]*.78,0,out);
const xxLedY=n=>n.sz[1]+.20;

/* ---- valores del panel de un tipo, leídos en vivo (XPI está en alcance: mismo módulo) ---- */
function xxV(t,k,d){
  const x=XPI[XXID[t]];
  if(!x)return d;
  const v=x.v[k];
  return v===undefined?d:v;
}
/* ¿el tipo está habilitado? (la clave 'en' de cada panel; si no la tiene, sí) */
const xxEn=t=>xxV(t,'en',true)!==false;

/* ================= 4. CABLES ================= */
/* Un InstancedMesh para TODOS los cables: 48 cables × 7 tramos = 336 cilindros en un draw call.
   El color por instancia (verde=señal, gris=apagado) va en instanceColor. */
const XXW=[];
let xxCabM=null;
function xxCabInit(){
  if(xxCabM)return xxCabM;
  const g=new THREE.CylinderGeometry(.024,.024,1,5);
  g.translate(0,.5,0);            /* origen en la punta: escalar Y = largo del tramo */
  xxCabM=new THREE.InstancedMesh(g,new THREE.MeshPhongMaterial({color:0xffffff,shininess:10}),
    XXCAP.wire*7);
  xxCabM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  xxCabM.frustumCulled=false;xxCabM.count=0;
  scene.add(xxCabM);
  return xxCabM;
}
function xxLink(a,b){
  if(!a||!b||a===b)return null;
  if(XXW.length>=XXCAP.wire){toast('🔌 máximo '+XXCAP.wire+' cables');return null;}
  for(const w of XXW)if(w.a===a&&w.b===b)return w;      /* idempotente */
  const w={a,b};XXW.push(w);b.w.push(w);a.wo.push(w);
  XXDirty=true;XXG.cabT=9;                              /* redibujar ya */
  return w;
}
function xxCut(w){
  const i=XXW.indexOf(w);if(i<0)return false;
  XXW.splice(i,1);
  const j=w.b.w.indexOf(w);if(j>=0)w.b.w.splice(j,1);
  const k=w.a.wo.indexOf(w);if(k>=0)w.a.wo.splice(k,1);
  XXDirty=true;XXG.cabT=9;
  return true;
}
/* un tramo del cable: cilindro de a hasta b */
function xxSeg(im,i,a,b){
  _xxv3.copy(b).sub(a);
  const L=Math.max(.004,_xxv3.length());
  _xxq2.setFromUnitVectors(_xxup,_xxv3.divideScalar(L));
  _xxs.set(1,L,1);
  im.setMatrixAt(i,_xxm.compose(a,_xxq2,_xxs));
}
/* redibujado (10 Hz): los props se mueven, así que el cable se recalcula entero. Con la panza
   (sag) proporcional a la distancia parece un cable colgando y no una varilla. */
function xxCabDraw(){
  const im=xxCabInit();
  if(!XXG.cable||!XXW.length){im.count=0;return 0;}
  let i=0;
  for(const w of XXW){
    xxTop(w.a,_xxv);const ax=_xxv.x,ay=_xxv.y,az=_xxv.z;
    xxTop(w.b,_xxv2);const bx=_xxv2.x,by=_xxv2.y,bz=_xxv2.z;
    const d=Math.hypot(bx-ax,by-ay,bz-az),sag=Math.min(.9,d*.16);
    const live=w.a.out>.5&&w.a.pow;
    _xxc.setHex(live?0x7dff8a:0x33383c);
    for(let s=0;s<7;s++){
      const t0=s/7,t1=(s+1)/7;
      _xxv.set(ax+(bx-ax)*t0,ay+(by-ay)*t0-sag*4*t0*(1-t0),az+(bz-az)*t0);
      _xxv2.set(ax+(bx-ax)*t1,ay+(by-ay)*t1-sag*4*t1*(1-t1),az+(bz-az)*t1);
      if(i>=im.instanceMatrix.count)break;
      xxSeg(im,i,_xxv,_xxv2);
      im.setColorAt(i,_xxc);
      i++;
    }
  }
  im.count=i;
  im.instanceMatrix.needsUpdate=true;
  if(im.instanceColor)im.instanceColor.needsUpdate=true;
  return XXW.length;
}

/* ================= 5. VECINOS AUTOMÁTICOS ================= */
/* Sin cables, un nodo escucha a los de rango MENOR que tenga cerca (los más cercanos primero).
   O(N²) pero N son los circuitos del mapa (decenas) y se recalcula 2 veces por segundo. */
const _xxCand=[];
function xxAuto(){
  for(const n of XXL){
    n.ai.length=0;
    if(n.w.length||n.k==='pow'||n.k==='aux')continue;
    _xxCand.length=0;
    for(const m of XXL){
      if(m===n||m.k==='aux'||m.r>=n.r)continue;
      const d=n.pos.distanceTo(m.pos);
      if(d<=XXG.link)_xxCand.push({m,d});
    }
    _xxCand.sort((a,b)=>a.d-b.d);
    for(let i=0;i<_xxCand.length&&i<4;i++)n.ai.push(_xxCand[i].m);
  }
}
function xxOrder(){
  XXL.length=0;
  for(const n of XXN.values())XXL.push(n);
  XXL.sort((a,b)=>a.r-b.r||a.seq-b.seq);
  XXDirty=false;
  xxPairD=true;      /* cambió la topología: hay que rearmar los pares del teletransportador */
  xxAuto();
  return XXL.length;
}
/* entradas de un nodo, ya resueltas a valores 0/1 */
const _xxIn=[];
function xxIns(n){
  _xxIn.length=0;
  if(n.w.length){for(const w of n.w)_xxIn.push(w.a.out>.5&&w.a.pow?1:0);}
  else for(const m of n.ai)_xxIn.push(m.out>.5&&m.pow?1:0);
  return _xxIn;
}

/* ================= 6. ENERGÍA (experimento 51) ================= */
function xxPower(){
  let src=0,fed=0,have=0;
  for(const n of XXL)if(n.t==='batt'){
    n.pow=1;
    n.out=(n.s.on&&xxEn('batt'))?1:0;
    have++;
    if(n.out)src++;
  }
  /* LA REGLA: manda la PRESENCIA de la batería, no que esté prendida. Si no hay ninguna en el
     mapa todo está alimentado (poner una palanca y una lámpara tiene que andar sin obligar a
     nadie a armar la red). En cuanto pusiste una, ella es la red: apagarla apaga el barrio, que
     es justamente lo que el experimento 51 tiene que demostrar. Si contáramos sólo las
     prendidas, apagar la única batería volvería al modo autónomo y no se apagaría nada. */
  const need=XXG.pow&&have>0;
  XXG.volt=need?xxV('batt','volt',1):1;
  for(const n of XXL){
    if(n.t==='batt')continue;
    if(!need){n.pow=1;fed++;continue;}
    n.pow=0;
    for(const m of XXL){
      if(m.t!=='batt'||!m.out)continue;
      if(n.pos.distanceTo(m.pos)<=(m.s.rad||10)){n.pow=1;break;}
      let wired=false;
      for(const w of n.w)if(w.a===m){wired=true;break;}
      for(const w of n.wo)if(w.b===m){wired=true;break;}
      if(wired){n.pow=1;break;}
    }
    if(n.pow)fed++;
  }
  XXG.src=src;XXG.fed=fed;XXG.have=have;
  return fed;
}

/* ================= 7. LÓGICA POR TIPO ================= */
/* Devuelve la salida (0/1). dt = tiempo del tick de evaluación (para los que cuentan tiempo).
   El FLANCO DE SUBIDA se calcula contra n.prev, que se guarda al final del tick. */
function xxLogic(n,ins,dt){
  const rise=n.pin>.5&&n.prev<=.5, fall=n.pin<=.5&&n.prev>.5;
  switch(n.t){
    /* ---- entradas ---- */
    case 'btn':{      /* 53: manda señal MIENTRAS se aprieta */
      if(n.s.hold>0)n.s.hold=Math.max(0,n.s.hold-dt);
      return (n.s.hold>0||n.s.man)?1:0; }
    case 'sw':        /* 54: biestable, queda encendido */
      return n.s.on?1:0;
    case 'prox':{     /* 55: dispara cuando pasás cerca */
      const R=xxV('prox','r',4);
      let hit=0;
      _xxv2.set(plBody.position.x,plBody.position.y,plBody.position.z);
      const dp=n.pos.distanceTo(_xxv2);
      if(dp<=R&&!PL.rag)hit=1;
      if(!hit&&xxV('prox','obj',false))
        for(const p of actives()){
          if(p===n.p||XXN.has(p))continue;
          _xxv2.set(p.body.position.x,p.body.position.y,p.body.position.z);
          if(n.pos.distanceTo(_xxv2)<=R){hit=1;break;}
        }
      /* el 'invertir' NO se aplica acá: lo hace xxEval para todos los tipos (si no, se
         invertiría dos veces y el switch del panel no haría nada) */
      if(hit&&!n.s.q)xxSnd('ui',n.pos,.45,1.35);
      n.s.q=hit;n.s.d=dp;
      return hit; }
    case 'plate':{    /* 56: placa de presión, dispara por PESO real */
      const th=xxV('plate','kg',30);
      return (n.s.kg>=th)?1:0; }
    case 'clk':{      /* 64: oscilador, frecuencia regulable */
      if(!xxEn('clk'))return 0;
      const hz=xxV('clk','hz',1),duty=xxV('clk','duty',.5);
      const gate=xxV('clk','gate',false);
      if(gate&&n.pin<=.5){n.s.ph=0;return 0;}      /* con 'gate' sólo corre si tiene entrada */
      n.s.ph=(n.s.ph+dt*hz)%1;
      const o=n.s.ph<duty?1:0;
      if(o&&!n.s.q&&xxV('clk','tic',true))xxSnd('ui',n.pos,.25,1.9);
      n.s.q=o;
      return o; }
    /* ---- lógica ---- */
    case 'timer':{    /* 57: retardo configurable, tres modos */
      const T=xxV('timer','t',2),mode=xxV('timer','m','on');
      if(mode==='on'){                    /* retardo al encender */
        if(n.pin>.5){n.s.t=(n.s.t||0)+dt;if(n.s.t>=T)return 1;return 0;}
        n.s.t=0;return 0; }
      if(mode==='off'){                   /* sigue prendido T segundos después de apagarse */
        if(n.pin>.5){n.s.t=T;return 1;}
        n.s.t=Math.max(0,(n.s.t||0)-dt);
        return n.s.t>0?1:0; }
      /* 'pulse': monoestable, un pulso de T segundos por flanco */
      if(rise)n.s.t=T;
      n.s.t=Math.max(0,(n.s.t||0)-dt);
      return n.s.t>0?1:0; }
    case 'count':{    /* 58: cuenta activaciones y dispara al llegar a N */
      const N=xxV('count','n',3);
      if(rise){
        n.s.c=(n.s.c||0)+1;
        xxSnd('ui',n.pos,.5,1.1);
        if(n.s.c>=N&&xxV('count','auto',false))n.s.done=1;
      }
      const done=n.s.c>=N;
      if(done&&xxV('count','auto',false)&&n.s.c>=N&&fall){n.s.c=0;}  /* auto-reset al bajar */
      return done?1:0; }
    case 'and':  return (ins.length>=1&&ins.every(v=>v>.5))?1:0;   /* 59 */
    case 'or':   return ins.some(v=>v>.5)?1:0;                     /* 60 */
    case 'not':  return (ins.length?ins[0]>.5:false)?0:1;          /* 61 (sin entrada = 1) */
    case 'xor':{ let c=0;for(const v of ins)if(v>.5)c++;return c%2?1:0; }  /* 62 */
    case 'ff':{       /* 63: memoria. T = conmuta por flanco; SR = entrada A pone, B borra */
      if(xxV('ff','m','t')==='sr'){
        const A=ins[0]>.5,B=ins[1]>.5;
        if(B)n.s.q=0;else if(A)n.s.q=1;
      } else if(rise){n.s.q=n.s.q?0:1;xxSnd('pop',n.pos,.4,1.4);}
      return n.s.q?1:0; }
    /* ---- salidas: la señal pasa tal cual y el efecto lo aplica xxOut ---- */
    default: return n.pin>.5?1:0;
  }
}

/* ================= 8. EVALUACIÓN ================= */
function xxCfg(){
  XXG.hz=xxClamp(xxV('board','hz',20),5,60);
  XXG.link=xxClamp(xxV('board','link',6),0,30);
  XXG.pow=xxV('board','pow',true)!==false;
  XXG.cable=xxV('board','cab',true)!==false;
  return XXG;
}
function xxEval(dt){
  XXG.evals++;
  if(XXDirty)xxOrder();
  for(const n of XXL)xxPose(n);
  xxPower();
  for(const n of XXL){
    const ins=xxIns(n);
    let mx=0;for(const v of ins)if(v>mx)mx=v;
    n.pin=mx;
    let o=0;
    if(n.k!=='aux'){
      o=nsafe(()=>xxLogic(n,ins,dt),'xxlogic_'+n.t);
      if(o==null)o=0;
      /* 'invertir la señal' y 'forzar a mano' se aplican ACÁ, en un solo lugar: si cada case de
         xxLogic los mirara por su cuenta habría tipos que se olvidan (me pasó con la placa) y
         los que ya invierten adentro (el sensor) invertirían dos veces. */
      if(xxV(n.t,'inv',false))o=o?0:1;
      if(n.s.force)o=1;                 /* el tablero puede activar cualquier nodo a mano */
      if(!n.pow&&n.t!=='batt')o=0;      /* sin energía no hay salida (ni la de un sensor) */
      if(!xxEn(n.t))o=0;
    }
    if(n.t!=='batt')n.out=o;
    if(n.out!==n.prevOut){
      n.prevOut=n.out;
      if(typeof xxOnSig==='function')nsafe(()=>xxOnSig(n,n.out),'xxonsig');
    }
    n.prev=n.pin;
  }
  return XXL.length;
}

/* ================= 9. MAQUINARIA POR TIPO (crear / liberar) ================= */
/* xxInit: estado inicial + mallas y cuerpos propios. xxFree: los devuelve. Con esto "todo se
   apaga al borrar el prop" es automático: el escaneo mata el nodo y esto limpia. */
function xxGrp(n){
  if(!n.viz){n.viz=new THREE.Group();n.viz.matrixAutoUpdate=true;scene.add(n.viz);}
  return n.viz;
}
function xxKinBody(hx,hy,hz){
  const b=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC,material:MAT.prop,allowSleep:false});
  b.addShape(new CANNON.Box(new CANNON.Vec3(hx,hy,hz)));
  world.addBody(b);
  return b;
}
/* seguimiento cinemático: se le da VELOCIDAD y cannon integra la posición. Escribir la posición
   a mano dejaría al solver sin enterarse del movimiento y el jugador se hundiría en la hoja de
   la puerta o se caería del elevador.
   EXCEPCIÓN — EL SALTO LARGO: un cuerpo de cannon nace en (0,0,0), o sea en el centro del mapa,
   y la puerta puede estar a 50 m de ahí. Con la velocidad tope (7 m/s) la hoja tardaba SIETE
   SEGUNDOS en llegar desde el origen hasta su marco, y en el medio la puerta parecía no abrirse
   (la prueba medía una separación de 0,44 m en vez de 2,77). Lo mismo pasa cuando alguien mueve
   la puerta de lugar con la physgun. Por eso: si el destino está a más de 1,5 m, se TELEPORTA;
   el seguimiento suave queda para el movimiento real de la máquina, que siempre es corto. */
function xxKinTo(b,tx,ty,tz,dt,vmax){
  const dx=tx-b.position.x,dy=ty-b.position.y,dz=tz-b.position.z;
  const d=Math.hypot(dx,dy,dz);
  if(d>1.5){
    b.position.set(tx,ty,tz);
    b.velocity.set(0,0,0);
    b.aabbNeedsUpdate=true;
    b.wakeUp();
    return false;
  }
  const k=1/Math.max(dt,.004),vm=vmax||9;
  let vx=dx*k,vy=dy*k,vz=dz*k;
  const m=Math.hypot(vx,vy,vz);
  if(m>vm){const s=vm/m;vx*=s;vy*=s;vz*=s;}
  b.velocity.set(vx,vy,vz);
  b.wakeUp();
  return true;
}
function xxInit(n){
  const s=n.s,g=xxGrp(n);
  /* testigo de estado: TODOS los nodos llevan uno arriba. Es lo que hace que un circuito se
     entienda de un vistazo (y lo que se ve en las capturas). */
  s.led=xxMesh(XXGEO.led,XXM.off);g.add(s.led);
  switch(n.t){
    case 'batt': s.on=true;s.rad=xxV('batt','r',10);break;
    case 'sw':   s.on=false;break;
    case 'btn':  s.hold=0;s.man=0;break;
    case 'clk':  s.ph=0;break;
    case 'count':s.c=0;break;
    case 'ff':   s.q=0;break;
    case 'lamp':{
      s.i=0;
      s.glow=xxMesh(XXGEO.glow,XXM.warm);g.add(s.glow);
      /* la luz REAL es un recurso escaso: las primeras XXCAP.light lámparas la tienen, el
         resto se queda con el globo brillante (que igual se ve encendido) */
      if(XXG.lights<XXCAP.light){
        s.light=new THREE.PointLight(0xffd07a,0,10);
        s.light.castShadow=false;g.add(s.light);XXG.lights++;
      }
      break; }
    case 'siren':{
      s.a=0;s.t=0;
      s.dome=xxMesh(XXGEO.dome,XXM.red);g.add(s.dome);
      s.flash=xxMesh(XXGEO.box,XXM.warm,new THREE.Vector3(.30,.05,.05));g.add(s.flash);
      if(XXG.lights<XXCAP.light){
        s.light=new THREE.PointLight(0xff4a2a,0,14);g.add(s.light);XXG.lights++;
      }
      break; }
    case 'door':{
      s.k=0;s.m=[];s.b=[];
      for(let i=0;i<2;i++){
        const m=xxMesh(XXGEO.box,XXM.met,new THREE.Vector3(.84,2.0,.12));
        g.add(m);s.m.push(m);
        const bd=xxKinBody(.42,1.0,.06);
        /* nace en su lugar (cerrada) y no en el origen del mapa */
        xxPt(n,(i?1:-1)*.44,1.06,0,_xxv2);
        bd.position.set(_xxv2.x,_xxv2.y,_xxv2.z);
        s.b.push(bd);
      }
      break; }
    case 'lift':{
      s.y0=n.pos.y;s.h=0;s.kin=false;break; }
    case 'belt':{
      s.ph=0;s.ch=[];
      for(let i=0;i<4;i++){
        const m=xxMesh(XXGEO.box,XXM.yel,new THREE.Vector3(.5,.02,.14));
        g.add(m);s.ch.push(m);
      }
      break; }
    case 'crane':{
      s.yaw=0;s.reach=4;s.hh=3;s.grab=null;
      /* el gancho arranca sobre la corona: si empezara en (0,0,0) el cable se dibujaría hasta
         el origen del mapa durante el primer frame */
      s.jib=xxMesh(XXGEO.box,XXM.yel,new THREE.Vector3(1,.16,.16));g.add(s.jib);
      s.cab=xxMesh(XXGEO.cyl,XXM.met,new THREE.Vector3(.03,1,.03));g.add(s.cab);
      s.hook=xxMesh(XXGEO.box,XXM.dark,new THREE.Vector3(.26,.22,.26));g.add(s.hook);
      s.mag=xxMesh(XXGEO.led,XXM.off);g.add(s.mag);
      s.hp=new THREE.Vector3();
      xxPt(n,0,3.2,0,s.hp);
      break; }
    case 'fan':{
      s.a=0;
      s.blur=xxMesh(XXGEO.disc,XXM.blur);g.add(s.blur);
      break; }
    case 'tele':{
      s.cd=0;s.pair=null;
      s.core=xxMesh(XXGEO.cyl,XXM.cyan,new THREE.Vector3(.30,.5,.30));g.add(s.core);
      break; }
    case 'flame':{s.t=0;break;}
    case 'turret':{
      s.yaw=0;s.pitch=0;s.t=0;s.shots=0;
      s.head=new THREE.Group();g.add(s.head);
      s.head.add(xxMesh(XXGEO.box,XXM.dark,new THREE.Vector3(.30,.24,.34)));
      for(let i=0;i<2;i++){
        const bl=xxMesh(XXGEO.cyl,XXM.met,new THREE.Vector3(.055,.52,.055));
        bl.rotation.x=Math.PI/2;bl.position.set(i?.09:-.09,0,.30);
        s.head.add(bl);
      }
      s.mz=xxMesh(XXGEO.led,XXM.warm);s.mz.position.set(0,0,.58);s.mz.visible=false;
      s.head.add(s.mz);
      break; }
    case 'plate':{
      s.kg=0;s.k=0;
      s.lid=xxMesh(XXGEO.box,XXM.met,new THREE.Vector3(1.12,.08,1.12));g.add(s.lid);
      s.lb=xxKinBody(.56,.04,.56);
      xxPt(n,0,.19,0,_xxv2);                 /* la tapa nace apoyada en su marco */
      s.lb.position.set(_xxv2.x,_xxv2.y,_xxv2.z);
      break; }
    case 'prox':{
      s.q=0;s.d=99;
      s.ring=xxMesh(XXGEO.ring,XXM.ring);g.add(s.ring);
      break; }
    case 'wire': s.a=null;s.b=null;break;
    case 'board':{
      /* pantalla del sinóptico, pegada 3 cm delante del panel inclinado del prop (mismos
         −14° que la parte del def, si no queda flotando torcida) */
      s.scr=xxMesh(XXGEO.quad,XXM.hmi,new THREE.Vector3(.92,.43,1));
      s.scr.visible=false;
      g.add(s.scr);
      break; }
  }
  if(n.t==='clk'){
    s.fly=xxMesh(XXGEO.cyl,XXM.met,new THREE.Vector3(.28,.03,.28));
    s.fly.rotation.x=Math.PI/2;g.add(s.fly);
  }
}
function xxFree(n){
  const s=n.s;
  if(s.light)XXG.lights=Math.max(0,XXG.lights-1);
  if(s.b)for(const b of s.b)world.removeBody(b);
  if(s.lb)world.removeBody(s.lb);
  if(s.grab){s.grab.manual=false;s.grab=null;}
  if(n.t==='lift'&&s.kin)xxLiftRestore(n);
  if(n.viz){scene.remove(n.viz);n.viz=null;}
  /* las geometrías y los materiales son COMPARTIDOS: no se hace dispose() acá (haría
     desaparecer las mallas de los demás nodos del mismo tipo) */
}
function xxLiftRestore(n){
  const p=n.p,s=n.s;
  if(!s.kin)return;
  s.kin=false;
  p.body.type=CANNON.Body.DYNAMIC;
  p.body.mass=p.mass;p.body.updateMassProperties();
  p.body.allowSleep=true;p.body.velocity.set(0,0,0);
  p.manual=false;
  touchAct();
}

/* ================= 10. EFECTOS (lo que hace cada salida) ================= */
/* Lo que empuja o mueve cuerpos va en xxOut (EXT.post, después de world.step, sólo jugando).
   Lo puramente visual va en xxViz (EXT.frame, también en pausa). */
let xxHeavy=0;

/* --- 65. lámpara --- */
function xxLamp(n,dt){
  const s=n.s,on=n.out>.5;
  const tgt=on?xxV('lamp','i',2.6)*XXG.volt:0;
  let fl=1;
  if(on&&xxV('lamp','fl',false))fl=.55+.45*Math.sin(TT*13.7+n.seq);
  s.i+=((tgt*fl)-s.i)*Math.min(1,dt*(on?14:9));
  if(on&&!s.was){xxSnd('pop',n.pos,.35,1.7);s.was=1;}
  if(!on)s.was=0;
  if(s.light){s.light.intensity=s.i;s.light.distance=xxV('lamp','d',11);
    s.light.color.setHex(xxV('lamp','c',0xffd07a));}
  if(s.glow){
    s.glow.visible=s.i>.02;
    s.glow.scale.setScalar(.55+.5*Math.min(1.6,s.i));
    s.glow.material=s.i>.02?XXM.warm:XXM.off;
  }
}
/* --- 66. sirena --- */
function xxSiren(n,dt){
  const s=n.s,on=n.out>.5;
  if(on){
    const d=dt*xxV('siren','rpm',110)/60*Math.PI*2;
    s.a=(s.a+d)%(Math.PI*2);
    /* s.tot = radianes TOTALES girados. s.a solo no sirve para medir: es un ángulo módulo 2π y
       un test que lo mira después de N frames puede caer justo cerca de 0 y decir que no giró. */
    s.tot=(s.tot||0)+d;
    s.t-=dt;
    if(s.t<=0){
      s.t=xxV('siren','per',1.1);
      xxSnd(xxV('siren','snd','horn'),n.pos,xxV('siren','vol',.7),1);
      s.sn=(s.sn||0)+1;
    }
  }
  const pulse=on?(.55+.45*Math.cos(s.a)):0;
  if(s.light){s.light.intensity=pulse*4.2*XXG.volt;s.light.distance=15;}
  if(s.dome)s.dome.material=on?XXM.red:XXM.off;
  if(s.flash)s.flash.visible=on;
}
/* --- 67. puerta automática --- */
function xxDoor(n,dt){
  const s=n.s,on=n.out>.5;
  const w=xxV('door','w',.95),sp=xxV('door','sp',1.6);
  s.k+=((on?1:0)-s.k)*Math.min(1,dt*sp*2.4);
  if(Math.abs((on?1:0)-s.k)<.004)s.k=on?1:0;
  if(on&&!s.was){xxSnd('metal-scrape',n.pos,.5,1.1);s.was=1;}
  if(!on&&s.was){xxSnd('metal-scrape',n.pos,.4,.85);s.was=0;}
  for(let i=0;i<2;i++){
    const sx=(i?1:-1)*(.44+w*s.k);
    xxPt(n,sx,1.06,0,_xxv2);
    if(s.m[i]){s.m[i].position.copy(_xxv2);s.m[i].quaternion.copy(n.q);}
    if(s.b[i]){
      s.b[i].quaternion.set(n.q.x,n.q.y,n.q.z,n.q.w);
      xxKinTo(s.b[i],_xxv2.x,_xxv2.y,_xxv2.z,dt,7);
    }
  }
}
/* --- 68. elevador --- */
function xxLift(n,dt){
  const s=n.s,on=n.out>.5,p=n.p;
  const H=xxV('lift','h',4),sp=xxV('lift','sp',1.8)*XXG.volt;
  if(!s.kin){
    /* recién se lo pasa a cinemático cuando ya apoyó: si se lo hace en el aire queda flotando */
    const rest=Math.abs(p.body.velocity.y)<.6;
    if(!rest&&!p.frozen)return;
    s.y0=n.pos.y;
    s.kin=true;
    if(p.frozen){p.frozen=false;}
    p.manual=true;
    p.body.type=CANNON.Body.KINEMATIC;
    p.body.mass=0;p.body.updateMassProperties();
    p.body.allowSleep=false;
    p.body.angularVelocity.set(0,0,0);
    touchAct();
  }
  const tgt=s.y0+(on?H:0);
  const dy=tgt-n.pos.y;
  const v=xxClamp(dy*3.2,-sp,sp);
  p.body.velocity.set(0,Math.abs(dy)<.006?0:v,0);
  p.body.angularVelocity.set(0,0,0);
  syncMat(p);
  if(Math.abs(v)>.2){
    s.t=(s.t||0)-dt;
    if(s.t<=0){s.t=.9;xxSnd('metal-scrape',n.pos,.3,.8);}
  }
}
/* --- 69. cinta transportadora --- */
function xxBelt(n,dt){
  const s=n.s,on=n.out>.5;
  if(!on)return;
  const sp=xxV('belt','sp',2.4)*XXG.volt*(xxV('belt','back',false)?-1:1);
  const topY=.62,halfX=.62,halfZ=1.5;
  /* dirección de la cinta = eje Z del prop, proyectado al plano (no empuja hacia arriba) */
  _xxv3.copy(n.fwd);_xxv3.y=0;
  if(_xxv3.lengthSq()<1e-4)return;
  _xxv3.normalize();
  s.ph=(s.ph+dt*sp/3)%1;
  for(const p of actives()){
    if(p===n.p)continue;
    _xxv2.set(p.body.position.x,p.body.position.y,p.body.position.z).sub(n.pos);
    const lx=_xxv2.dot(n.rgt),ly=_xxv2.dot(n.up),lz=_xxv2.dot(n.fwd);
    if(Math.abs(lx)>halfX+.3||Math.abs(lz)>halfZ||ly<topY-.25||ly>topY+1.1)continue;
    const b=p.body;
    b.velocity.x+=(_xxv3.x*sp-b.velocity.x)*Math.min(1,dt*7);
    b.velocity.z+=(_xxv3.z*sp-b.velocity.z)*Math.min(1,dt*7);
    b.wakeUp();
  }
  if(xxV('belt','pl',true)&&!PL.rag){
    _xxv2.set(plBody.position.x,plBody.position.y,plBody.position.z).sub(n.pos);
    const lx=_xxv2.dot(n.rgt),ly=_xxv2.dot(n.up),lz=_xxv2.dot(n.fwd);
    if(Math.abs(lx)<=halfX&&Math.abs(lz)<=halfZ&&ly>topY-.3&&ly<topY+.6){
      /* al jugador se lo mueve por POSICIÓN: playerStep() reescribe su velocidad horizontal
         cada frame (acc=18) y una velocidad agregada acá se disolvería en tres frames */
      const d=Math.min(.12,Math.abs(sp)*dt)*Math.sign(sp);
      plBody.position.x+=_xxv3.x*d;plBody.position.z+=_xxv3.z*d;
    }
  }
}
/* --- 70. grúa --- */
function xxCrane(n,dt){
  const s=n.s,on=n.out>.5;
  const yawT=xxV('crane','yaw',0)*D2R,reachT=xxV('crane','reach',4),hT=xxV('crane','h',3);
  const sp=xxV('crane','sp',1)*XXG.volt;
  s.yaw+=xxClamp(yawT-s.yaw,-2.2*sp*dt,2.2*sp*dt);
  s.reach+=xxClamp(reachT-s.reach,-2.4*sp*dt,2.4*sp*dt);
  s.hh+=xxClamp(hT-s.hh,-2.4*sp*dt,2.4*sp*dt);
  /* punto del gancho: sobre la corona (3,76 m), girado s.yaw alrededor del eje del mástil */
  const c=Math.cos(s.yaw),sn=Math.sin(s.yaw);
  xxPt(n,0,3.76,0,_xxv2);
  s.hp.copy(_xxv2)
    .addScaledVector(n.rgt,sn*s.reach)
    .addScaledVector(n.fwd,c*s.reach);
  s.hp.addScaledVector(n.up,-Math.max(.2,3.5-s.hh));
  /* imán: con señal agarra lo que tenga a menos de 1,4 m y lo sostiene como la physgun */
  if(on){
    if(!s.grab){
      let best=null,bd=1.4*1.4;
      for(const p of actives()){
        if(p===n.p||XXN.has(p))continue;
        const dx=p.body.position.x-s.hp.x,dy=p.body.position.y-s.hp.y,dz=p.body.position.z-s.hp.z;
        const d=dx*dx+dy*dy+dz*dz;
        if(d<bd){bd=d;best=p;}
      }
      if(best){s.grab=best;best.manual=true;if(best.frozen)freezeProp(best,false);
        xxSnd('grab',s.hp,.6,1);}
    }
  } else if(s.grab){s.grab.manual=false;s.grab=null;xxSnd('trash',s.hp,.35,1.6);}
  if(s.grab){
    if(PROPS.indexOf(s.grab)<0){s.grab=null;}
    else{
      const b=s.grab.body,k=11;
      b.velocity.x=(s.hp.x-b.position.x)*k;
      b.velocity.y=(s.hp.y-.5-b.position.y)*k;
      b.velocity.z=(s.hp.z-b.position.z)*k;
      const vm=Math.hypot(b.velocity.x,b.velocity.y,b.velocity.z);
      if(vm>26){const f=26/vm;b.velocity.x*=f;b.velocity.y*=f;b.velocity.z*=f;}
      b.angularVelocity.scale(.6,b.angularVelocity);
      b.wakeUp();
    }
  }
}
/* --- 71. turbina --- */
function xxFan(n,dt){
  const s=n.s,on=n.out>.5;
  if(!on)return;
  const F=xxV('fan','f',25)*XXG.volt,R=xxV('fan','r',9),ang=xxV('fan','a',26)*D2R;
  const suck=xxV('fan','suck',false);
  _xxv3.copy(n.fwd).normalize();
  const cosMin=Math.cos(ang);
  for(const p of actives()){
    if(p===n.p)continue;
    _xxv2.set(p.body.position.x,p.body.position.y,p.body.position.z).sub(xxPt(n,0,.95,0,_xxv));
    const d=_xxv2.length();
    if(d<.15||d>R)continue;
    _xxv2.divideScalar(d);
    if(_xxv2.dot(_xxv3)<cosMin)continue;
    /* (a) El empuje va PROPORCIONAL A LA MASA, o sea que el slider es una ACELERACIÓN (m/s²): el
       viento mueve igual a un bloque de 17 kg que a un contenedor de 420, en vez de mandar al
       bloque a la estratósfera. Con una fuerza fija en newton el mismo valor era inofensivo para
       lo pesado y descabellado para lo liviano.
       (b) Va como IMPULSO (× dt) y NO como applyForce. Esto lo aprendí midiendo: cannon borra
       body.force al final de CADA subpaso (clearForces dentro de internalStep), y el motor llama
       world.step(1/60, dt, 3), o sea 2-3 subpasos por frame. Una fuerza puesta una vez por frame
       sólo actúa en el PRIMER subpaso, mientras que el rozamiento (μ=0,5 contra el piso) actúa en
       todos: el promedio quedaba NEGATIVO y el bloque no se movía ni un centímetro con la turbina
       al mínimo — se movía sólo en las pruebas, que corren muchos world.step seguidos. Con el
       impulso × dt el efecto es el mismo a 30 o a 60 fps y no depende de cuántos subpasos haga. */
    const j=F*p.body.mass*(1-d/R)*dt,dir=suck?-1:1;
    _xxcv.set(_xxv3.x*j*dir,(_xxv3.y*j*dir)+j*.12,_xxv3.z*j*dir);
    p.body.applyImpulse(_xxcv,_xxcv2.set(0,0,0));
    p.body.wakeUp();
  }
  if(xxV('fan','pl',true)&&!PL.rag){
    _xxv2.set(plBody.position.x,plBody.position.y+.9,plBody.position.z).sub(xxPt(n,0,.95,0,_xxv));
    const d=_xxv2.length();
    if(d>.3&&d<R){
      _xxv2.divideScalar(d);
      if(_xxv2.dot(_xxv3)>=cosMin){
        const k=Math.min(.16,F*.0022*(1-d/R))*(suck?-1:1);
        plBody.position.x+=_xxv3.x*k;plBody.position.z+=_xxv3.z*k;
      }
    }
  }
}
/* --- 72. teletransportador --- */
function xxTele(n,dt){
  const s=n.s,on=n.out>.5;
  s.cd=Math.max(0,(s.cd||0)-dt);
  if(!on||!s.pair||s.cd>0)return;
  const R=xxV('tele','r',1.1);
  _xxv2.set(plBody.position.x,plBody.position.y,plBody.position.z);
  xxPt(n,0,.2,0,_xxv);
  if(_xxv2.distanceTo(_xxv)<=R&&!PL.rag){
    xxPt(s.pair,0,.35,0,_xxv3);
    xxSnd('pop',_xxv,.8,1);
    plBody.position.set(_xxv3.x,_xxv3.y+.05,_xxv3.z);
    plBody.velocity.set(0,0,0);
    if(typeof plSync==='function')nsafe(plSync,'xxtp');
    XP.fx(_xxv3.x,_xxv3.y+.6,_xxv3.z,{burst:'ring',size:.5,clr:[0xb98aff,0x39dcff]});
    s.cd=xxV('tele','cd',2);s.pair.s.cd=s.cd;
    s.n=(s.n||0)+1;
    return;
  }
  if(!xxV('tele','obj',true))return;
  for(const p of actives()){
    if(p===n.p||XXN.has(p))continue;
    _xxv2.set(p.body.position.x,p.body.position.y,p.body.position.z);
    if(_xxv2.distanceTo(_xxv)>R)continue;
    xxPt(s.pair,0,.9,0,_xxv3);
    p.body.position.set(_xxv3.x,_xxv3.y,_xxv3.z);
    p.body.velocity.scale(.4,p.body.velocity);
    p.body.wakeUp();syncMat(p);
    xxSnd('pop',_xxv3,.5,1.3);
    s.cd=xxV('tele','cd',2)*.5;s.pair.s.cd=s.cd;s.n=(s.n||0)+1;
    break;
  }
}
/* --- 73. lanzallamas --- */
function xxFlame(n,dt){
  const s=n.s,on=n.out>.5;
  if(!on)return;
  const R=xxV('flame','r',6),P=xxV('flame','p',1)*XXG.volt;
  xxPt(n,.16,.55,.50,_xxv);                       /* boca de la tobera */
  _xxv3.copy(n.fwd).normalize();
  /* partículas: se emiten por TIEMPO (no por frame) para que a 30 y a 60 fps sea la misma llama */
  s.t-=dt;
  const per=1/(28*P);
  let guard=6;
  while(s.t<=0&&guard-->0){
    s.t+=per;
    xxFireAdd(_xxv,_xxv3,R,P);
  }
  if((s.sT=(s.sT||0)-dt)<=0){s.sT=.42;xxSnd('fw-fountain',_xxv,.35,1.2);}
  /* empuje y daño en el cono. s.pn/s.sc quedan como testigos para __H.xxNode(): sin un contador
     no se puede distinguir "no empujó porque nadie estaba en el cono" de "no se ejecutó". */
  s.sc=0;s.pn=0;
  for(const p of actives()){
    if(p===n.p)continue;
    s.sc++;
    _xxv2.set(p.body.position.x,p.body.position.y,p.body.position.z).sub(_xxv);
    const d=_xxv2.length();
    if(d<.2||d>R)continue;
    _xxv2.divideScalar(d);
    if(_xxv2.dot(_xxv3)<.86)continue;
    s.pn++;
    /* impulso proporcional a la masa y a dt, por lo mismo que la turbina (ver xxFan) */
    const j=p.body.mass*16*P*(1-d/R)*dt;
    _xxcv.set(_xxv3.x*j,j*.5,_xxv3.z*j);
    p.body.applyImpulse(_xxcv,_xxcv2.set(0,0,0));
    p.body.wakeUp();
  }
  if(xxV('flame','dmg',true)&&!PL.rag&&typeof hurt==='function'){
    _xxv2.set(plBody.position.x,plBody.position.y+.9,plBody.position.z).sub(_xxv);
    const d=_xxv2.length();
    if(d>.2&&d<R){
      _xxv2.divideScalar(d);
      if(_xxv2.dot(_xxv3)>.86){
        s.dmg=(s.dmg||0)+dt*xxV('flame','dps',12);
        if(s.dmg>=1){const k=Math.floor(s.dmg);s.dmg-=k;hurt(k);}
      }
    }
  }
}
/* --- 74. torreta --- */
function xxTurret(n,dt){
  const s=n.s,on=n.out>.5;
  const mode=xxV('turret','m','obj'),R=xxV('turret','r',26);
  xxPt(n,0,.92,0,_xxv);                            /* eje de la cabeza */
  let tx=null,ty=null,tz=null,tp=null;
  if(mode!=='off'){
    if(mode==='pl'&&!PL.rag){
      const d=Math.hypot(plBody.position.x-_xxv.x,plBody.position.z-_xxv.z);
      if(d<=R){tx=plBody.position.x;ty=plBody.position.y+1.1;tz=plBody.position.z;}
    } else if(mode==='obj'){
      let bd=R*R;
      /* se recorre PROPS y no actives(): un prop congelado (los que se ponen de blanco con la
         physgun) también es un objetivo válido. Los props de circuito se saltean: la torreta no
         le dispara a la palanca que la enciende. */
      for(const p of PROPS){
        if(p===n.p||XXN.has(p))continue;
        const dx=p.body.position.x-_xxv.x,dy=p.body.position.y-_xxv.y,dz=p.body.position.z-_xxv.z;
        const d=dx*dx+dy*dy+dz*dz;
        if(d<bd){bd=d;tp=p;}
      }
      if(tp){tx=tp.body.position.x;ty=tp.body.position.y;tz=tp.body.position.z;}
    }
  }
  s.tgt=tx!=null;
  if(tx!=null){
    _xxv2.set(tx,ty,tz).sub(_xxv);
    const yaw=Math.atan2(_xxv2.x,_xxv2.z),
          pit=Math.atan2(_xxv2.y,Math.hypot(_xxv2.x,_xxv2.z));
    /* giro suave: el ángulo más corto, con velocidad máxima (no salta al objetivo) */
    let dy=yaw-s.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
    const w=xxV('turret','w',2.6)*dt;
    s.yaw+=xxClamp(dy,-w,w);
    s.pitch+=xxClamp(pit-s.pitch,-w,w);
    s.aim=Math.abs(dy)<.10;
  } else s.aim=false;
  s.t=Math.max(0,(s.t||0)-dt);
  s.mzT=Math.max(0,(s.mzT||0)-dt);
  if(s.mz)s.mz.visible=s.mzT>0;
  if(!on||!s.aim||tx==null||!xxV('turret','fire',true))return;
  if(s.t>0)return;
  s.t=1/xxClamp(xxV('turret','rof',4),.5,14);
  /* disparo REAL: rayo desde la boca, trazadora, chispa, impulso al prop y daño al jugador */
  xxPt(n,0,.92,0,_xxv);
  _xxv2.set(Math.sin(s.yaw)*Math.cos(s.pitch),Math.sin(s.pitch),Math.cos(s.yaw)*Math.cos(s.pitch));
  _xxv.addScaledVector(_xxv2,.62);
  _xxcv.set(_xxv.x,_xxv.y,_xxv.z);
  _xxcv2.set(_xxv.x+_xxv2.x*R,_xxv.y+_xxv2.y*R,_xxv.z+_xxv2.z*R);
  const rr2=_xxRR;rr2.reset();
  /* XXRAY y no RAY: el RAY de core_b lleva collisionFilterMask:1 y el cuerpo del jugador está en
     el GRUPO 2 (core_b: collisionFilterGroup:2), así que 1&2=0 y el rayo le pasaba de largo — la
     torreta en modo "al jugador" disparaba cinco veces y la vida seguía en 100. Con la máscara 3
     (1|2) el disparo pega en lo que haya adelante, sea mapa, prop o jugador. */
  world.raycastClosest(_xxcv,_xxcv2,XXRAY,rr2);
  const dmg=xxV('turret','dmg',7);
  s.shots++;s.mzT=.05;
  xxSnd('shot-smg',_xxv,.55,1.05);
  if(rr2.hasHit){
    _xxv3.set(rr2.hitPointWorld.x,rr2.hitPointWorld.y,rr2.hitPointWorld.z);
    if(typeof tracer==='function')nsafe(()=>tracer(_xxv,_xxv3),'xxtr');
    if(typeof spark==='function')nsafe(()=>spark(_xxv3,.8),'xxsp');
    const hp=rr2.body&&rr2.body.userData&&rr2.body.userData.prop;
    if(hp){
      if(hp.frozen)freezeProp(hp,false);
      hp.body.wakeUp();
      hp.body.applyImpulse(new CANNON.Vec3(_xxv2.x*dmg*8,_xxv2.y*dmg*8+dmg,_xxv2.z*dmg*8),
        new CANNON.Vec3(0,0,0));
      s.hits=(s.hits||0)+1;
    } else if(rr2.body===plBody&&typeof hurt==='function'){hurt(dmg);s.hits=(s.hits||0)+1;}
  } else if(typeof tracer==='function'){
    _xxv3.copy(_xxv).addScaledVector(_xxv2,R);
    nsafe(()=>tracer(_xxv,_xxv3),'xxtr2');
  }
}
/* --- 56. placa de presión: pesa lo que tiene encima y hunde la tapa --- */
function xxPlate(n,dt){
  const s=n.s;
  let kg=0;
  xxPt(n,0,.19,0,_xxv);                            /* cara de la tapa */
  for(const p of PROPS){
    if(p===n.p)continue;
    _xxv2.set(p.body.position.x,p.body.position.y,p.body.position.z).sub(_xxv);
    const lx=_xxv2.dot(n.rgt),ly=_xxv2.dot(n.up),lz=_xxv2.dot(n.fwd);
    if(Math.abs(lx)>.62||Math.abs(lz)>.62||ly<-.1||ly>1.1)continue;
    kg+=p.mass;
  }
  if(!PL.rag){
    _xxv2.set(plBody.position.x,plBody.position.y,plBody.position.z).sub(_xxv);
    const lx=_xxv2.dot(n.rgt),ly=_xxv2.dot(n.up),lz=_xxv2.dot(n.fwd);
    if(Math.abs(lx)<=.62&&Math.abs(lz)<=.62&&ly>-.25&&ly<.55)kg+=plBody.mass;
  }
  s.kg=kg+(s.man||0);
  const th=xxV('plate','kg',30);
  const tgt=s.kg>=th?1:Math.min(.85,s.kg/Math.max(1,th));
  s.k+=(tgt-s.k)*Math.min(1,dt*9);
  xxPt(n,0,.19-.055*s.k,0,_xxv2);
  if(s.lid){s.lid.position.copy(_xxv2);s.lid.quaternion.copy(n.q);}
  if(s.lb){
    s.lb.quaternion.set(n.q.x,n.q.y,n.q.z,n.q.w);
    xxKinTo(s.lb,_xxv2.x,_xxv2.y,_xxv2.z,dt,3);
  }
  if(s.kg>=th&&!s.was){xxSnd('imp-metal',n.pos,.5,1.2);s.was=1;}
  if(s.kg<th)s.was=0;
}

/* --- fuego: pool único para TODOS los lanzallamas ---
   XXF = partículas vivas, XXFP = las muertas esperando turno. Se reciclan los objetos (y sus
   Vector3) porque a 28 partículas por segundo y por lanzallamas, crearlos sería basura constante
   para el recolector — justo lo que no se puede hacer en un celular. */
const XXF=[],XXFP=[];
let xxFireM=null;
/* punto redondo con degradado, hecho en un canvas de 64 px (misma receta que core_t le pone al
   material de la pirotecnia). Sin esto el "fuego" son cuadraditos amarillos opacos: lo vi en la
   primera captura y no se parecía en nada a una llama. */
function xxPuffTex(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,31);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.30,'rgba(255,255,255,.78)');
  gr.addColorStop(.62,'rgba(255,255,255,.20)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;
  t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;
  return t;
}
function xxFireInit(){
  if(xxFireM)return xxFireM;
  const mt=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,fog:false,
    depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  nsafe(()=>{mt.map=xxPuffTex();mt.needsUpdate=true;},'xxpuff');
  xxFireM=new THREE.InstancedMesh(XXGEO.quad,mt,XXCAP.fire);
  xxFireM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  xxFireM.frustumCulled=false;xxFireM.count=0;
  scene.add(xxFireM);
  return xxFireM;
}
function xxFireAdd(from,dir,R,P){
  if(XXF.length>=XXCAP.fire)return false;
  /* La velocidad y la vida se eligen para que el CHORRO se vea, no para simular física de gases:
     con 20 m/s las partículas quedaban tan separadas que en la captura el lanzallamas parecía
     tirar chispas sueltas. A 9-13 m/s y con la vida ajustada a life≈R/sp el chorro llega al
     alcance configurado y además queda denso. El tamaño crece con la vida (abajo, en xxFireStep):
     angosto en la tobera y ancho en la punta, como una llama de verdad. */
  const sp=5+4*P;
  const f=XXFP.pop()||{p:new THREE.Vector3(),v:new THREE.Vector3(),t:0,life:.5,s:.2};
  f.p.copy(from);
  f.v.set(dir.x*sp+(Math.random()-.5)*1.3,
          dir.y*sp+(Math.random()-.5)*1.0+.6,
          dir.z*sp+(Math.random()-.5)*1.3);
  f.t=0;f.life=Math.min(1.1,R/sp*1.35);f.s=.24+Math.random()*.16;
  XXF.push(f);
  return true;
}
function xxFireStep(dt){
  const im=xxFireInit();
  for(let i=XXF.length-1;i>=0;i--){
    const f=XXF[i];
    f.t+=dt;
    if(f.t>=f.life){XXF.splice(i,1);XXFP.push(f);continue;}
    f.p.addScaledVector(f.v,dt);
    f.v.multiplyScalar(1-Math.min(.6,dt*2.4));
    f.v.y+=dt*1.6;                       /* el fuego sube */
  }
  let i=0;
  for(const f of XXF){
    if(i>=XXCAP.fire)break;
    const k=f.t/f.life;
    _xxs.setScalar(f.s*(1.25+k*2.1));
    _xxm.compose(f.p,camera.quaternion,_xxs);   /* billboard: la cámara orienta todas */
    im.setMatrixAt(i,_xxm);
    /* la llama va de blanco-amarillo a rojo y se apaga: con blending aditivo el color ES el
       brillo, así que bajarlo al final hace que la partícula se desvanezca sola */
    const f2=Math.max(0,1-k*1.1);
    _xxc.setRGB(f2,Math.max(0,(.72-k*.85))*f2+.02,Math.max(0,.26-k*.6)*f2);
    im.setColorAt(i,_xxc);
    i++;
  }
  im.count=i;
  im.instanceMatrix.needsUpdate=true;
  if(im.instanceColor)im.instanceColor.needsUpdate=true;
  return XXF.length;
}

/* ---- despacho de efectos físicos (EXT.post) ---- */
function xxOut(n,dt){
  switch(n.t){
    case 'door':  xxDoor(n,dt);break;
    case 'lift':  xxLift(n,dt);break;
    case 'plate': xxPlate(n,dt);break;
    case 'crane': xxCrane(n,dt);break;
    case 'tele':  xxTele(n,dt);break;
    case 'turret':xxTurret(n,dt);break;
    /* los pesados sólo cuando están ENCENDIDOS y hasta el presupuesto del frame */
    case 'belt':  if(n.out>.5&&xxHeavy++<XXCAP.heavy)xxBelt(n,dt);break;
    case 'fan':   if(n.out>.5&&xxHeavy++<XXCAP.heavy)xxFan(n,dt);break;
    case 'flame': if(n.out>.5&&xxHeavy++<XXCAP.heavy)xxFlame(n,dt);break;
  }
}
/* ---- visual (EXT.frame: también en pausa) ---- */
function xxViz(n,dt){
  const s=n.s,on=n.out>.5;
  if(s.led){
    xxPt(n,0,xxLedY(n),0,_xxv2);
    s.led.position.copy(_xxv2);
    s.led.material=on?XXM.on:(n.pow?XXM.off:XXM.red);
    s.led.scale.setScalar(on?1.25:.85);
  }
  switch(n.t){
    case 'lamp':{
      if(s.glow){xxPt(n,.30,1.24,0,_xxv2);s.glow.position.copy(_xxv2);}
      if(s.light){xxPt(n,.30,1.18,0,_xxv2);s.light.position.copy(_xxv2);}
      break; }
    case 'siren':{
      if(s.dome){xxPt(n,0,1.56,0,_xxv2);s.dome.position.copy(_xxv2);}
      if(s.light){xxPt(n,0,1.52,0,_xxv2);s.light.position.copy(_xxv2);}
      if(s.flash){
        xxPt(n,0,1.50,0,_xxv2);
        s.flash.position.copy(_xxv2);
        _xxq2.setFromAxisAngle(n.up,s.a||0);
        s.flash.quaternion.copy(n.q).premultiply(_xxq2);
      }
      break; }
    case 'clk':{
      if(s.fly){
        xxPt(n,0,.34,.20,_xxv2);
        s.fly.position.copy(_xxv2);
        s.ang=(s.ang||0)+dt*(on?xxV('clk','hz',1)*7:0);
        _xxq2.setFromAxisAngle(n.fwd,s.ang);
        s.fly.quaternion.copy(n.q).premultiply(_xxq2);
        s.fly.rotateX(Math.PI/2);
      }
      break; }
    case 'fan':{
      if(s.blur){
        xxPt(n,0,.95,.05,_xxv2);
        s.blur.position.copy(_xxv2);
        s.a=(s.a||0)+dt*(on?26:0);
        _xxq2.setFromAxisAngle(n.fwd,s.a);
        s.blur.quaternion.copy(n.q).premultiply(_xxq2);
        s.blur.visible=on;
      }
      break; }
    case 'belt':{
      if(s.ch){
        for(let i=0;i<s.ch.length;i++){
          const t=((s.ph||0)+i/s.ch.length)%1;
          xxPt(n,0,.615,(t-.5)*2.9*(xxV('belt','back',false)?-1:1),_xxv2);
          s.ch[i].position.copy(_xxv2);
          s.ch[i].quaternion.copy(n.q);
          s.ch[i].visible=on;
        }
      }
      break; }
    case 'prox':{
      if(s.ring){
        const R=xxV('prox','r',4);
        xxPt(n,0,.03,0,_xxv2);
        s.ring.position.copy(_xxv2);
        s.ring.scale.setScalar(R);
        s.ring.material=on?XXM.on:XXM.ring;
        s.ring.visible=xxV('prox','show',true)!==false;
      }
      break; }
    case 'tele':{
      if(s.core){
        xxPt(n,0,.42,0,_xxv2);
        s.core.position.copy(_xxv2);
        s.core.quaternion.copy(n.q);
        const k=on?(.85+.35*Math.sin(TT*6+n.seq)):.25;
        s.core.scale.set(.30*k,.5,.30*k);
        s.core.material=on?XXM.cyan:XXM.off;
      }
      break; }
    case 'crane':{
      if(s.jib){
        /* pluma: del mástil al gancho, en horizontal */
        xxPt(n,0,3.76,0,_xxv2);
        const c=Math.cos(s.yaw||0),sn=Math.sin(s.yaw||0);
        _xxv3.copy(_xxv2).addScaledVector(n.rgt,sn*(s.reach||0)*.5)
             .addScaledVector(n.fwd,c*(s.reach||0)*.5);
        s.jib.position.copy(_xxv3);
        s.jib.scale.set(Math.max(.4,s.reach||0),.16,.16);
        _xxq2.setFromAxisAngle(n.up,(s.yaw||0)+Math.PI/2);
        s.jib.quaternion.copy(n.q).premultiply(_xxq2);
        /* cable y gancho */
        _xxv3.copy(_xxv2).addScaledVector(n.rgt,sn*(s.reach||0))
             .addScaledVector(n.fwd,c*(s.reach||0));
        const L=Math.max(.2,_xxv3.distanceTo(s.hp));
        _xxv.copy(_xxv3).add(s.hp).multiplyScalar(.5);
        s.cab.position.copy(_xxv);
        s.cab.scale.set(.03,L,.03);
        s.cab.quaternion.copy(n.q);
        s.hook.position.copy(s.hp);
        s.hook.quaternion.copy(n.q);
        s.mag.position.copy(s.hp);s.mag.position.y-=.18;
        s.mag.material=on?XXM.on:XXM.off;
      }
      break; }
    case 'board':{
      if(s.scr){
        s.scr.visible=XXHMI.ok;
        xxPt(n,0,1.215,-.02,_xxv2);
        s.scr.position.copy(_xxv2);
        _xxq2.setFromAxisAngle(n.rgt,-14*D2R);      /* la inclinación del panel del def */
        s.scr.quaternion.copy(n.q).premultiply(_xxq2);
      }
      break; }
    case 'turret':{
      if(s.head){
        xxPt(n,0,.98,0,_xxv2);
        s.head.position.copy(_xxv2);
        _xxeu.set(-(s.pitch||0),(s.yaw||0),0);     /* Euler de módulo: sin new por frame */
        s.head.quaternion.setFromEuler(_xxeu);
      }
      break; }
  }
}

/* ================= 11. ENGANCHE AL BUCLE ================= */
/* xxStep: física y lógica. Va en EXT.post, que core_b llama DESPUÉS de world.step y sólo
   jugando: es el mismo slot que usa la pirotecnia. */
function xxStep(dt,force){
  XXG.on=true;
  XXG.scanT+=dt;
  if(XXG.scanT>=.25||force){XXG.scanT=0;xxScan();xxCfg();}
  XXG.autoT+=dt;
  if(XXG.autoT>=.5){XXG.autoT=0;if(!XXDirty)xxAuto();}
  xxPair();
  XXG.t+=dt;
  const per=1/XXG.hz;
  if(force){xxEval(dt);XXG.t=0;}
  else{
    let guard=3;                       /* si el frame tardó, se ponen al día como máximo 3 ticks */
    while(XXG.t>=per&&guard-->0){XXG.t-=per;xxEval(per);}
    if(XXG.t>per*4)XXG.t=0;
  }
  xxHeavy=0;
  for(const n of XXL)if(n.k==='out'||n.t==='plate')nsafe(()=>xxOut(n,dt),'xxout_'+n.t);
}
/* pares del teletransportador: 1↔2, 3↔4… por orden de colocación. Se rearma sólo cuando la
   topología cambió (spawnear o borrar props), no por frame. */
let xxPairD=true;
function xxPair(){
  if(!xxPairD)return;
  xxPairD=false;
  const t=[];
  for(const n of XXL)if(n.t==='tele'){n.s.pair=null;t.push(n);}
  for(let i=0;i+1<t.length;i+=2){t[i].s.pair=t[i+1];t[i+1].s.pair=t[i];}
}
EXT.post.push(dt=>{nsafe(()=>xxStep(dt),'xxstep');});
EXT.frame.push(dt=>{
  /* fuera de la partida: apagar todo (luces, fuego, cables) y no gastar un frame en nada.
     Es el "se apaga solo al salir" del enunciado. */
  if(APP!=='play'&&APP!=='pause'&&APP!=='spawn'){
    if(XXG.on)nsafe(xxAllOff,'xxoff');
    return;
  }
  if(XXN.size){
    for(const n of XXL)nsafe(()=>xxViz(n,dt),'xxviz_'+n.t);
    for(const n of XXL)if(n.t==='lamp')nsafe(()=>xxLamp(n,dt),'xxlamp');
    for(const n of XXL)if(n.t==='siren')nsafe(()=>xxSiren(n,dt),'xxsiren');
  }
  if(XXF.length||xxFireM)nsafe(()=>xxFireStep(dt),'xxfire');
  XXG.cabT+=dt;
  if(XXG.cabT>=.1){XXG.cabT=0;nsafe(xxCabDraw,'xxcab');}
  XXG.pnT=(XXG.pnT||0)+dt;
  if(XXG.pnT>=.2){XXG.pnT=0;nsafe(xxSyncPanel,'xxpanel');}
});
/* apagado total: se llama al salir de la partida */
function xxAllOff(){
  XXG.on=false;
  for(const n of XXL){
    n.out=0;n.pin=0;n.prev=0;
    if(n.s.light)n.s.light.intensity=0;
    if(n.s.i!=null)n.s.i=0;
    if(n.viz)n.viz.visible=false;
  }
  XXF.length=0;
  if(xxFireM)xxFireM.count=0;
  if(xxCabM)xxCabM.count=0;
  return true;
}
/* al volver a jugar se vuelven a ver (los nodos mueren solos si los props se borraron) */
const _xxPlay=startPlay;
startPlay=function(){
  const r=_xxPlay.apply(this,arguments);
  nsafe(()=>{XXG.on=true;for(const n of XXL)if(n.viz)n.viz.visible=true;},'xxplay');
  return r;
};

/* ================= 12. PANELES: LO QUE CORE_U NO PUEDE SABER ================= */
/* (a) Un tipo tiene UN panel pero MUCHOS props: la palanca que abriste tiene que mostrar SU
       estado, no el de la última que tocaste. (b) El pulsador necesita "mientras se aprieta",
       o sea pointerdown/pointerup sobre el botón ya construido. Las dos cosas se resuelven
       leyendo XPP/XPI (mismo módulo) 5 veces por segundo, sin tocar core_u. */
const XXPN={sw:['on'],batt:['on']};    /* claves que son POR NODO, no por tipo */
function xxCur(xp){
  /* el nodo del prop que abrió el panel; si no hay, el más cercano de ese tipo */
  if(!xp)return null;
  const t=(XXT[xp.id]||{}).t;
  if(!t)return null;
  let n=xxNode(xp.ctx&&xp.ctx.prop);
  if(n&&n.t===t)return n;
  let best=null,bd=1e9;
  for(const m of XXL){
    if(m.t!==t)continue;
    const d=m.pos.distanceTo(_xxv2.set(plBody.position.x,plBody.position.y,plBody.position.z));
    if(d<bd){bd=d;best=m;}
  }
  return best;
}
function xxSyncPanel(){
  if(!XPP.open||!XPP.xp||!XXT[XPP.xp.id])return false;
  const xp=XPP.xp,n=xxCur(xp),keys=XXPN[(XXT[xp.id]||{}).t];
  if(n&&keys)for(const k of keys){
    const v=n.s[k];
    if(v===undefined)continue;
    if(xp.v[k]!==v){
      /* se escribe DIRECTO y se repinta: pasar por xpSetV dispararía el on() del control, que
         vuelve a escribir el nodo — un ida y vuelta por cada sincronización */
      xp.v[k]=v;nsafe(()=>xpPaintCtl(xp,k),'xxpc');
    }
  }
  /* botón "mantener apretado" del pulsador: se engancha una sola vez por construcción */
  if(xp.id==='xpx_btn')nsafe(()=>xxBindHold(xp),'xxhold');
  return true;
}
function xxBindHold(xp){
  for(const c of (xp.ui.controls||[])){
    if(c.k!=='__hold'||!c._chips||!c._chips[0])continue;
    const b=c._chips[0];
    if(b._xxb)continue;
    b._xxb=1;
    const dn=e=>{const n=xxCur(xp);if(n){n.s.man=1;xxSnd('ui',n.pos,.5,1.5);}
      b.classList.add('on');if(e&&e.preventDefault)e.preventDefault();};
    const up=()=>{const n=xxCur(xp);if(n)n.s.man=0;b.classList.remove('on');};
    b.addEventListener('touchstart',dn,{passive:false});
    b.addEventListener('touchend',up);b.addEventListener('touchcancel',up);
    b.addEventListener('mousedown',dn);
    b.addEventListener('mouseup',up);b.addEventListener('mouseleave',up);
    /* el dedo puede levantarse afuera del botón: sin esto la señal quedaba pegada en 1 */
    addEventListener('touchend',up);addEventListener('mouseup',up);
  }
}

/* ================= 13. AZÚCAR PARA LOS 25 PANELES ================= */
const xxSt=c=>{                     /* línea de estado, igual para todos */
  const n=xxCur(XPI[c.id]);
  if(!n)return 'poné el prop en el mapa para verlo';
  return 'entrada <b>'+(n.pin>.5?1:0)+'</b> · salida <b>'+(n.out>.5?1:0)+'</b> · '+
    (n.pow?'con energía':'<b>SIN energía</b>')+' · '+
    (n.w.length?n.w.length+' cable(s)':(n.ai.length?n.ai.length+' vecino(s) cerca':'suelto'));
};
const xxEnSw=()=>({k:'en',t:'switch',label:'Tipo habilitado',val:true});
const xxInvSw=()=>({k:'inv',t:'switch',label:'Invertir la señal',val:false});
const xxStTx=()=>({t:'texto',label:'Señal',live:xxSt});
/* alta con prueba: XXTEST guarda una función que MIDE el efecto (la corre __H.xpxTest()) */
const XXTEST={},XXDBG={};
/* el objeto de prueba de las máquinas: bloque de hormigón, 17 kg y 39 cm. Chico para que entre
   en la cinta y liviano para que el empuje se mida en centímetros, y sin nada raro adentro
   (t_dyna_crate explota si le pegan y arruinaría la prueba de la torreta). */
const XXTOBJ='b_block';
const xxAdd=(o,test)=>{
  const x=XP.add(o);
  if(test)XXTEST[o.id]=test;
  return x;
};

/* ================= 14. LOS 25 EXPERIMENTOS ================= */

/* ---------- 51. FUENTE DE ENERGÍA ---------- */
xxAdd({
  id:'xpx_batt',name:'Bateria Bloque',cat:'circuitos',near:2.4,auto:true,
  btn:'🔋 Fuente de energía',
  desc:'Alimenta todos los circuitos que tenga a la redonda. Si la apagás, se apagan.',
  ui:{title:'Fuente de energía',controls:[
    {k:'on',t:'switch',label:'Encendida',val:true,on:(c,v)=>{const n=xxCur(XPI.xpx_batt);if(n)n.s.on=v;}},
    {k:'r',t:'slider',label:'Radio de alimentación',min:2,max:30,step:.5,val:10,unit:' m',
     on:(c,v)=>{for(const n of XXL)if(n.t==='batt')n.s.rad=v;}},
    {k:'volt',t:'slider',label:'Tensión (fuerza de las máquinas)',min:.2,max:2,step:.05,val:1,unit:'x'},
    xxEnSw(),
    {t:'texto',label:'Red',live:()=>{
      let b=0,on=0;for(const n of XXL)if(n.t==='batt'){b++;if(n.out)on++;}
      return 'baterías <b>'+b+'</b> (encendidas '+on+') · nodos alimentados <b>'+(XXG.fed||0)+
        '</b> de '+XXL.length+' · tensión <b>'+(XXG.volt||1).toFixed(2)+'x</b>'+
        (XXG.pow?'':' · <b>modo autónomo</b>');}},
    xxStTx()
  ]}
},()=>{
  const b=xxTS('xpx_batt',1.4,0),l=xxTS('xpx_lamp',1.4,1.6),s=xxTS('xpx_sw',2.6,1.6);
  if(!b||!l||!s)return false;
  const nb=xxNode(b),nl=xxNode(l),ns=xxNode(s);
  nb.s.rad=12;ns.s.on=true;XXG.pow=true;
  xxTick(4);
  const lit=nl.out>.5&&nl.pow;
  nb.s.on=false;xxTick(4);
  const dark=nl.pow===0;
  XXDBG.xpx_batt={lit,dark,fed:XXG.fed};
  return lit&&dark;
});

/* ---------- 52. CABLE ---------- */
xxAdd({
  id:'xpx_wire',name:'Carrete Cable',cat:'circuitos',near:2.4,auto:true,
  btn:'🔌 Cablear dos props',
  desc:'Elegí A y B apuntando con la mira: el cable se dibuja y lleva la señal de A hacia B.',
  ui:{title:'Cable',controls:[
    {t:'botones',label:'Extremos (apuntá y tocá)',items:[
      {label:'🔴 A = lo que apunto',v:'a'},{label:'🟢 B = lo que apunto',v:'b'}],
     on:(c,v)=>{
       const n=xxCur(XPI.xpx_wire);if(!n)return;
       const h=aimRay(30,0),p=h&&h.prop,m=xxNode(p);
       if(!m){c.toast('🔍 apuntá a un circuito');return;}
       n.s[v]=m;c.toast((v==='a'?'🔴 A = ':'🟢 B = ')+xxNameOf(m)+' #'+m.seq);
       if(n.s.a&&n.s.b)xxLink(n.s.a,n.s.b)&&c.toast('🔌 '+xxNameOf(n.s.a)+' → '+xxNameOf(n.s.b));
     }},
    {t:'botones',label:'Acciones',items:[
      {label:'🪄 Unir los 2 más cercanos',v:'auto'},{label:'✂ Cortar los míos',v:'cut'},
      {label:'🧹 Cortar todos',v:'all'}],
     on:(c,v)=>{
       const n=xxCur(XPI.xpx_wire);
       if(v==='all'){let k=0;while(XXW.length){xxCut(XXW[0]);k++;}c.toast('🧹 '+k+' cables cortados');return;}
       if(v==='cut'){
         if(!n)return;let k=0;
         for(let i=XXW.length-1;i>=0;i--)
           if((n.s.a&&XXW[i].a===n.s.a&&n.s.b&&XXW[i].b===n.s.b)){xxCut(XXW[i]);k++;}
         c.toast('✂ '+k+' cable(s) cortados');return; }
       if(!n)return;
       const near=[];
       for(const m of XXL){if(m===n||m.k==='aux')continue;
         near.push({m,d:m.pos.distanceTo(n.pos)});}
       near.sort((x,y)=>x.d-y.d);
       if(near.length<2){c.toast('🔍 poné dos circuitos cerca');return;}
       let A=near[0].m,B=near[1].m;
       if(A.r>B.r){const t=A;A=B;B=t;}       /* la señal va del de rango menor al mayor */
       n.s.a=A;n.s.b=B;
       if(xxLink(A,B))c.toast('🔌 '+xxNameOf(A)+' → '+xxNameOf(B));
     }},
    /* el mismo ajuste que el tablero: se escribe SU valor y no XXG directamente, porque xxCfg()
       relee el tablero cuatro veces por segundo y pisaría cualquier cosa escrita acá */
    {k:'cab',t:'switch',label:'Dibujar los cables',val:true,
     on:(c,v)=>{XP.set('xpx_board','cab',v);XXG.cable=v;XXG.cabT=9;}},
    {t:'texto',label:'Este carrete',live:()=>{
      const n=xxCur(XPI.xpx_wire);
      if(!n)return 'poné el carrete en el mapa';
      return 'A: <b>'+(n.s.a?xxNameOf(n.s.a)+' #'+n.s.a.seq:'—')+'</b><br>B: <b>'+
        (n.s.b?xxNameOf(n.s.b)+' #'+n.s.b.seq:'—')+'</b><br>cables en el mapa: <b>'+XXW.length+
        '</b> · señal que viaja: <b>'+(n.s.a?(n.s.a.out>.5?1:0):'—')+'</b>';}}
  ]}
},()=>{
  const s=xxTS('xpx_sw',1.2,0),l=xxTS('xpx_lamp',1.2,9.5);   /* lejos: sin cable no se ven */
  if(!s||!l)return false;
  const ns=xxNode(s),nl=xxNode(l);
  ns.s.on=true;xxTick(3);
  const before=nl.out>.5;
  xxLink(ns,nl);xxTick(3);
  const after=nl.out>.5,drawn=xxCabDraw()>0&&xxCabM.count>0;
  XXDBG.xpx_wire={before,after,drawn,seg:xxCabM?xxCabM.count:0};
  return !before&&after&&drawn;
});

/* ---------- 53. PULSADOR ---------- */
xxAdd({
  id:'xpx_btn',name:'Pulsador Rojo',cat:'circuitos',near:2.2,auto:true,
  btn:'🔘 Pulsador',
  desc:'Manda señal MIENTRAS lo aprietas: mantené el botón, o disparale de cerca.',
  ui:{title:'Pulsador',controls:[
    {t:'botones',label:'Apretar',items:[{label:'⬇ MANTENER APRETADO',v:1}],k:'__hold',
     on:(c)=>{const n=xxCur(XPI.xpx_btn);if(n)n.s.hold=xxV('btn','t',.6);}},
    {k:'t',t:'slider',label:'Duración del pulso (al tocar)',min:.1,max:5,step:.1,val:.6,unit:' s'},
    {k:'fire',t:'switch',label:'Apretar con el disparo (a menos de 2 m)',val:true},
    xxEnSw(),
    {t:'texto',label:'Señal',live:c=>{
      const n=xxCur(XPI.xpx_btn);
      if(!n)return 'poné el pulsador en el mapa';
      return 'apretado <b>'+(n.out>.5?'SÍ':'no')+'</b> · resto de pulso <b>'+
        (n.s.hold||0).toFixed(2)+' s</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const b=xxTS('xpx_btn',1.2,0),l=xxTS('xpx_lamp',1.2,1.5);
  if(!b||!l)return false;
  const nb=xxNode(b),nl=xxNode(l);
  nb.s.man=1;xxTick(3);
  const on=nl.out>.5;
  nb.s.man=0;nb.s.hold=0;xxTick(3);
  const off=nl.out<=.5;
  XXDBG.xpx_btn={on,off};
  return on&&off;
});

/* ---------- 54. INTERRUPTOR DE PALANCA ---------- */
xxAdd({
  id:'xpx_sw',name:'Palanca Switch',cat:'circuitos',near:2.2,auto:true,
  btn:'🎚 Palanca',
  desc:'Biestable: queda encendida hasta que la volvés a tocar. Una por prop.',
  ui:{title:'Interruptor',controls:[
    {k:'on',t:'switch',label:'Encendido',val:false,
     on:(c,v)=>{const n=xxCur(XPI.xpx_sw);if(n){n.s.on=v;xxSnd('ui',n.pos,.6,v?1.5:1.1);}}},
    xxEnSw(),
    {t:'botones',label:'Todas las palancas del mapa',items:[
      {label:'⏻ Todas ON',v:1},{label:'⭘ Todas OFF',v:0}],
     on:(c,v)=>{let k=0;for(const n of XXL)if(n.t==='sw'){n.s.on=!!v;k++;}
       c.toast('🎚 '+k+' palanca(s) '+(v?'ON':'OFF'));}},
    xxStTx()
  ]}
},()=>{
  const s=xxTS('xpx_sw',1.2,0),l=xxTS('xpx_lamp',1.2,1.5);
  if(!s||!l)return false;
  const ns=xxNode(s),nl=xxNode(l);
  ns.s.on=true;xxTick(3);
  const on=nl.out>.5&&nl.s.i>=0;
  ns.s.on=false;xxTick(3);
  const off=nl.out<=.5;
  XXDBG.xpx_sw={on,off};
  return on&&off;
});

/* ---------- 55. SENSOR DE PROXIMIDAD ---------- */
xxAdd({
  id:'xpx_prox',name:'Sensor Proxim',cat:'circuitos',near:2.2,auto:true,
  btn:'📡 Sensor de proximidad',
  desc:'Dispara cuando pasás cerca. El anillo del piso muestra el radio.',
  ui:{title:'Sensor de proximidad',controls:[
    {k:'r',t:'slider',label:'Radio',min:.8,max:20,step:.2,val:4,unit:' m'},
    {k:'obj',t:'switch',label:'Detectar también objetos',val:false},
    {k:'inv',t:'switch',label:'Invertir (dispara al alejarse)',val:false},
    {k:'show',t:'switch',label:'Mostrar el anillo',val:true},
    xxEnSw(),
    {t:'texto',label:'Lectura',live:c=>{
      const n=xxCur(XPI.xpx_prox);
      if(!n)return 'poné el sensor en el mapa';
      return 'distancia al jugador <b>'+(n.s.d==null?'—':n.s.d.toFixed(2)+' m')+
        '</b> · radio <b>'+xxV('prox','r',4).toFixed(1)+' m</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const s=xxTS('xpx_prox',1.6,0);
  if(!s)return false;
  const n=xxNode(s);
  XP.set('xpx_prox','r',3);xxTick(3);
  const near=n.out>.5;
  XP.set('xpx_prox','r',.8);xxTick(3);
  const far=n.out<=.5;
  XP.set('xpx_prox','r',4);
  XXDBG.xpx_prox={near,far,d:n.s.d};
  return near&&far;
});

/* ---------- 56. PLACA DE PRESIÓN ---------- */
xxAdd({
  id:'xpx_plate',name:'Placa Presion',cat:'circuitos',near:2.2,auto:true,
  btn:'⚖ Placa de presión',
  desc:'Pesa de verdad lo que tenga encima (props y tu propio peso) y se hunde con la carga.',
  ui:{title:'Placa de presión',controls:[
    {k:'kg',t:'slider',label:'Umbral',min:5,max:600,step:5,val:30,unit:' kg'},
    xxInvSw(),
    xxEnSw(),
    {t:'botones',label:'Probar sin subirse',items:[{label:'＋50 kg',v:50},{label:'＋200 kg',v:200},
      {label:'0 kg',v:0}],
     on:(c,v)=>{const n=xxCur(XPI.xpx_plate);if(n)n.s.man=v;}},
    {t:'texto',label:'Balanza',live:c=>{
      const n=xxCur(XPI.xpx_plate);
      if(!n)return 'poné la placa en el mapa';
      return 'peso encima <b>'+(n.s.kg||0).toFixed(0)+' kg</b> de <b>'+xxV('plate','kg',30)+
        ' kg</b> · hundida <b>'+((n.s.k||0)*100).toFixed(0)+'%</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const p=xxTS('xpx_plate',1.6,0);
  if(!p)return false;
  const n=xxNode(p);
  XP.set('xpx_plate','kg',40);
  n.s.man=0;xxTick(3);
  const idle=n.out<=.5;
  n.s.man=120;xxTick(6);
  const on=n.out>.5&&n.s.k>.4;
  n.s.man=0;xxTick(3);
  XXDBG.xpx_plate={idle,on,kg:n.s.kg,k:n.s.k};
  return idle&&on;
});

/* ---------- 57. TEMPORIZADOR ---------- */
xxAdd({
  id:'xpx_timer',name:'Temporizador',cat:'circuitos',near:2.2,auto:true,
  btn:'⏱ Temporizador',
  desc:'Retarda la señal: al encender, al apagar, o la convierte en un pulso de X segundos.',
  ui:{title:'Temporizador',controls:[
    {k:'t',t:'slider',label:'Tiempo',min:.1,max:30,step:.1,val:2,unit:' s'},
    {k:'m',t:'lista',label:'Modo',val:'on',items:[
      {label:'⏳ Retardo al encender',v:'on'},{label:'⏲ Sigue prendido',v:'off'},
      {label:'⚡ Pulso',v:'pulse'}]},
    xxEnSw(),
    {t:'texto',label:'Cuenta',live:c=>{
      const n=xxCur(XPI.xpx_timer);
      if(!n)return 'poné el temporizador en el mapa';
      const m=xxV('timer','m','on'),T=xxV('timer','t',2);
      const left=m==='on'?Math.max(0,T-(n.s.t||0)):(n.s.t||0);
      return 'faltan <b>'+left.toFixed(2)+' s</b> de '+T.toFixed(1)+' s<br>'+xxSt(c);}}
  ]}
},()=>{
  const s=xxTS('xpx_sw',1.2,0),t=xxTS('xpx_timer',1.2,1.4),l=xxTS('xpx_lamp',1.2,2.8);
  if(!s||!t||!l)return false;
  const ns=xxNode(s),nt=xxNode(t),nl=xxNode(l);
  xxLink(ns,nt);xxLink(nt,nl);
  XP.set('xpx_timer','m','on');XP.set('xpx_timer','t',1);
  ns.s.on=true;
  xxTick(4,1/30);                     /* 0,13 s: todavía no */
  const notYet=nt.out<=.5;
  xxTick(40,1/30);                    /* +1,3 s: ya */
  const fired=nt.out>.5&&nl.out>.5;
  XXDBG.xpx_timer={notYet,fired,t:nt.s.t};
  return notYet&&fired;
});

/* ---------- 58. CONTADOR ---------- */
xxAdd({
  id:'xpx_count',name:'Contador Pulso',cat:'circuitos',near:2.2,auto:true,
  btn:'🔢 Contador',
  desc:'Cuenta flancos de entrada y dispara al llegar a N.',
  ui:{title:'Contador',controls:[
    {k:'n',t:'numero',label:'Disparar en',min:1,max:99,step:1,val:3,unit:' pulsos'},
    {k:'auto',t:'switch',label:'Volver a cero al llegar',val:false},
    xxEnSw(),
    {t:'botones',label:'Manual',items:[{label:'＋1',v:1},{label:'↺ Cero',v:0}],
     on:(c,v)=>{const n=xxCur(XPI.xpx_count);if(!n)return;
       n.s.c=v?((n.s.c||0)+1):0;}},
    {t:'texto',label:'Cuenta',live:c=>{
      const n=xxCur(XPI.xpx_count);
      if(!n)return 'poné el contador en el mapa';
      return 'llevo <b>'+(n.s.c||0)+'</b> de <b>'+xxV('count','n',3)+'</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const b=xxTS('xpx_btn',1.2,0),k=xxTS('xpx_count',1.2,1.4);
  if(!b||!k)return false;
  const nb=xxNode(b),nk=xxNode(k);
  xxLink(nb,nk);
  XP.set('xpx_count','n',3);XP.set('xpx_count','auto',false);
  nk.s.c=0;
  for(let i=0;i<3;i++){nb.s.man=1;xxTick(2);nb.s.man=0;xxTick(2);}
  const ok=nk.s.c>=3&&nk.out>.5;
  XXDBG.xpx_count={c:nk.s.c,out:nk.out};
  return ok;
});

/* ---------- 59..62. COMPUERTAS ---------- */
/* Prueba común: dos palancas cableadas a la compuerta, se recorre la tabla de verdad completa
   y se compara contra la función esperada. Si una compuerta miente, el test lo dice. */
function xxGateTest(id,f){
  return ()=>{
    const a=xxTS('xpx_sw',1.2,0),b=xxTS('xpx_sw',2.4,0),g=xxTS(id,1.8,1.6);
    if(!a||!b||!g)return false;
    const na=xxNode(a),nb=xxNode(b),ng=xxNode(g);
    xxLink(na,ng);xxLink(nb,ng);
    const tt=[];let ok=true;
    for(const A of [0,1])for(const B of [0,1]){
      na.s.on=!!A;nb.s.on=!!B;
      xxTick(3);
      const o=ng.out>.5?1:0,e=f(A,B);
      tt.push(A+''+B+'->'+o);
      if(o!==e)ok=false;
    }
    XXDBG[id]=tt;
    return ok;
  };
}
xxAdd({
  id:'xpx_and',name:'Compuerta AND',cat:'circuitos',near:2.2,auto:true,btn:'🔀 Compuerta AND',
  desc:'Salida 1 sólo si TODAS sus entradas están en 1.',
  ui:{title:'Compuerta AND',controls:[xxInvSw(),xxEnSw(),
    {t:'texto',label:'Tabla',live:c=>{
      const n=xxCur(XPI.xpx_and);if(!n)return 'poné la compuerta en el mapa';
      const i=xxIns(n);
      return 'entradas [<b>'+(i.join('</b>, <b>')||'—')+'</b>] → <b>'+(n.out>.5?1:0)+
        '</b><br>'+xxSt(c);}}]}
},xxGateTest('xpx_and',(a,b)=>a&&b?1:0));
xxAdd({
  id:'xpx_or',name:'Compuerta OR',cat:'circuitos',near:2.2,auto:true,btn:'🔀 Compuerta OR',
  desc:'Salida 1 si CUALQUIERA de sus entradas está en 1.',
  ui:{title:'Compuerta OR',controls:[xxInvSw(),xxEnSw(),
    {t:'texto',label:'Tabla',live:c=>{
      const n=xxCur(XPI.xpx_or);if(!n)return 'poné la compuerta en el mapa';
      const i=xxIns(n);
      return 'entradas [<b>'+(i.join('</b>, <b>')||'—')+'</b>] → <b>'+(n.out>.5?1:0)+
        '</b><br>'+xxSt(c);}}]}
},xxGateTest('xpx_or',(a,b)=>a||b?1:0));
xxAdd({
  id:'xpx_not',name:'Compuerta NOT',cat:'circuitos',near:2.2,auto:true,btn:'🔀 Compuerta NOT',
  desc:'Da vuelta la señal: 1 → 0 y 0 → 1 (sin entrada, su salida es 1).',
  ui:{title:'Compuerta NOT',controls:[xxEnSw(),
    {t:'texto',label:'Tabla',live:c=>{
      const n=xxCur(XPI.xpx_not);if(!n)return 'poné la compuerta en el mapa';
      const i=xxIns(n);
      return 'entrada <b>'+(i.length?i[0]:'—')+'</b> → <b>'+(n.out>.5?1:0)+'</b><br>'+xxSt(c);}}]}
},()=>{
  const a=xxTS('xpx_sw',1.2,0),g=xxTS('xpx_not',1.2,1.5);
  if(!a||!g)return false;
  const na=xxNode(a),ng=xxNode(g);
  xxLink(na,ng);
  na.s.on=false;xxTick(3);const o0=ng.out>.5?1:0;
  na.s.on=true; xxTick(3);const o1=ng.out>.5?1:0;
  XXDBG.xpx_not={o0,o1};
  return o0===1&&o1===0;
});
xxAdd({
  id:'xpx_xor',name:'Compuerta XOR',cat:'circuitos',near:2.2,auto:true,btn:'🔀 Compuerta XOR',
  desc:'Salida 1 cuando un número IMPAR de entradas está en 1 (una sí, la otra no).',
  ui:{title:'Compuerta XOR',controls:[xxInvSw(),xxEnSw(),
    {t:'texto',label:'Tabla',live:c=>{
      const n=xxCur(XPI.xpx_xor);if(!n)return 'poné la compuerta en el mapa';
      const i=xxIns(n);
      return 'entradas [<b>'+(i.join('</b>, <b>')||'—')+'</b>] → <b>'+(n.out>.5?1:0)+
        '</b><br>'+xxSt(c);}}]}
},xxGateTest('xpx_xor',(a,b)=>(a^b)?1:0));

/* ---------- 63. FLIP-FLOP ---------- */
xxAdd({
  id:'xpx_ff',name:'FlipFlop Mem',cat:'circuitos',near:2.2,auto:true,btn:'💾 Flip-flop',
  desc:'Memoria de un bit: en modo T conmuta con cada pulso, en modo SR la entrada A pone y la B borra.',
  ui:{title:'Flip-flop',controls:[
    {k:'m',t:'lista',label:'Modo',val:'t',items:[
      {label:'T (conmuta por pulso)',v:'t'},{label:'SR (A pone / B borra)',v:'sr'}]},
    xxEnSw(),
    {t:'botones',label:'Manual',items:[{label:'⇄ Conmutar',v:'t'},{label:'↺ Borrar',v:'r'}],
     on:(c,v)=>{const n=xxCur(XPI.xpx_ff);if(!n)return;
       n.s.q=v==='r'?0:(n.s.q?0:1);xxSnd('pop',n.pos,.5,1.4);}},
    {t:'texto',label:'Memoria',live:c=>{
      const n=xxCur(XPI.xpx_ff);
      if(!n)return 'poné el flip-flop en el mapa';
      return 'Q = <b>'+(n.s.q?1:0)+'</b> · Q̅ = <b>'+(n.s.q?0:1)+'</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const b=xxTS('xpx_btn',1.2,0),f=xxTS('xpx_ff',1.2,1.4);
  if(!b||!f)return false;
  const nb=xxNode(b),nf=xxNode(f);
  xxLink(nb,nf);
  XP.set('xpx_ff','m','t');nf.s.q=0;
  nb.s.man=1;xxTick(2);nb.s.man=0;xxTick(2);
  const q1=nf.out>.5;
  const held=(()=>{xxTick(20);return nf.out>.5;})();      /* memoria: sin entrada sigue en 1 */
  nb.s.man=1;xxTick(2);nb.s.man=0;xxTick(2);
  const q0=nf.out<=.5;
  XXDBG.xpx_ff={q1,held,q0};
  return q1&&held&&q0;
});

/* ---------- 64. OSCILADOR / CLOCK ---------- */
xxAdd({
  id:'xpx_clk',name:'Oscilador Clk',cat:'circuitos',near:2.2,auto:true,btn:'⏲ Oscilador',
  desc:'Reloj: prende y apaga solo a la frecuencia que le pongas.',
  ui:{title:'Oscilador',controls:[
    {k:'hz',t:'slider',label:'Frecuencia',min:.1,max:8,step:.1,val:1,unit:' Hz',
     fmt:v=>v.toFixed(1)+' Hz ('+(1/v).toFixed(2)+' s)'},
    {k:'duty',t:'slider',label:'Tiempo encendido',min:.05,max:.95,step:.05,val:.5,unit:'',
     fmt:v=>(v*100).toFixed(0)+'%'},
    {k:'gate',t:'switch',label:'Sólo con señal de entrada',val:false},
    {k:'tic',t:'switch',label:'Tic audible',val:true},
    xxEnSw(),
    {t:'botones',label:'Atajos',items:[{label:'0.5 Hz',v:.5},{label:'1 Hz',v:1},
      {label:'2 Hz',v:2},{label:'5 Hz',v:5}],on:(c,v)=>{c.set('hz',v);}},
    {t:'texto',label:'Fase',live:c=>{
      const n=xxCur(XPI.xpx_clk);
      if(!n)return 'poné el oscilador en el mapa';
      return 'fase <b>'+((n.s.ph||0)*100).toFixed(0)+'%</b> · salida <b>'+(n.out>.5?1:0)+
        '</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const c=xxTS('xpx_clk',1.4,0);
  if(!c)return false;
  const n=xxNode(c);
  XP.set('xpx_clk','hz',2);XP.set('xpx_clk','duty',.5);XP.set('xpx_clk','tic',false);
  n.s.ph=0;
  let flips=0,last=n.out;
  for(let i=0;i<60;i++){xxTick(1,1/30);if(n.out!==last){flips++;last=n.out;}}
  /* 2 s de simulación a 2 Hz = 4 medios ciclos como mínimo */
  XXDBG.xpx_clk={flips};
  return flips>=3;
});

/* ---------- 65. LÁMPARA ---------- */
xxAdd({
  id:'xpx_lamp',name:'Foco Circuito',cat:'circuitos',near:2.4,auto:true,btn:'💡 Lámpara',
  desc:'Se enciende con la señal, con luz de verdad (PointLight) que ilumina el suelo.',
  ui:{title:'Lámpara',controls:[
    {k:'i',t:'slider',label:'Intensidad',min:.2,max:8,step:.2,val:2.6,unit:''},
    {k:'d',t:'slider',label:'Alcance',min:3,max:30,step:1,val:11,unit:' m'},
    {k:'c',t:'lista',label:'Color',val:0xffd07a,items:[
      {label:'🟡 Cálida',v:0xffd07a},{label:'⚪ Blanca',v:0xffffff},{label:'🔴 Roja',v:0xff5a3a},
      {label:'🟢 Verde',v:0x7dff8a},{label:'🔵 Azul',v:0x6cc0ff}]},
    {k:'fl',t:'switch',label:'Parpadeo',val:false},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Foco',live:c=>{
      const n=xxCur(XPI.xpx_lamp);
      if(!n)return 'poné la lámpara en el mapa';
      return 'intensidad <b>'+(n.s.i||0).toFixed(2)+'</b> · luz real <b>'+(n.s.light?'sí':'no (tope '+
        XXCAP.light+')')+'</b> · en uso <b>'+XXG.lights+'/'+XXCAP.light+'</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const s=xxTS('xpx_sw',1.2,0),l=xxTS('xpx_lamp',1.2,1.5);
  if(!s||!l)return false;
  const ns=xxNode(s),nl=xxNode(l);
  XP.set('xpx_lamp','i',3);
  ns.s.on=true;xxTick(8);
  for(let i=0;i<12;i++)xxLamp(nl,1/30);
  const lit=nl.s.i>.5&&(!nl.s.light||nl.s.light.intensity>.5);
  ns.s.on=false;xxTick(4);
  for(let i=0;i<24;i++)xxLamp(nl,1/30);
  const dark=nl.s.i<.4;
  XXDBG.xpx_lamp={i:nl.s.i,lit,dark,light:!!nl.s.light};
  return lit&&dark;
});

/* ---------- 66. SIRENA ---------- */
xxAdd({
  id:'xpx_siren',name:'Sirena Alarma',cat:'circuitos',near:2.4,auto:true,btn:'🚨 Sirena',
  desc:'Luz giratoria y sonido mientras haya señal.',
  ui:{title:'Sirena',controls:[
    {k:'rpm',t:'slider',label:'Vueltas de la baliza',min:20,max:400,step:10,val:110,unit:' rpm'},
    {k:'per',t:'slider',label:'Cada cuánto suena',min:.3,max:6,step:.1,val:1.1,unit:' s'},
    {k:'vol',t:'slider',label:'Volumen',min:0,max:1,step:.05,val:.7,unit:''},
    {k:'snd',t:'lista',label:'Sonido',val:'horn',items:[
      {label:'📢 Bocina',v:'horn'},{label:'💥 Bombo',v:'boom'},{label:'🔔 Pito',v:'fw-whistle'}]},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Alarma',live:c=>{
      const n=xxCur(XPI.xpx_siren);
      if(!n)return 'poné la sirena en el mapa';
      return 'baliza <b>'+(((n.s.a||0)*180/Math.PI)|0)+'°</b> · sonó <b>'+(n.s.sn||0)+
        '</b> vez(ces)<br>'+xxSt(c);}}
  ]}
},()=>{
  const s=xxTS('xpx_sw',1.2,0),r=xxTS('xpx_siren',1.2,1.5);
  if(!s||!r)return false;
  const ns=xxNode(s),nr=xxNode(r);
  ns.s.on=true;nr.s.a=0;nr.s.tot=0;nr.s.sn=0;nr.s.t=0;
  xxTick(4);
  for(let i=0;i<40;i++)xxSiren(nr,1/30);
  const spun=(nr.s.tot||0)>.3,rang=(nr.s.sn||0)>=1;
  ns.s.on=false;
  XXDBG.xpx_siren={tot:+(nr.s.tot||0).toFixed(2),sn:nr.s.sn};
  return spun&&rang;
});

/* ---------- 67. PUERTA AUTOMÁTICA ---------- */
xxAdd({
  id:'xpx_door',name:'Puerta Auto',cat:'circuitos',near:3,auto:true,btn:'🚪 Puerta automática',
  desc:'Dos hojas que corren de verdad (cuerpos físicos): con la señal se abre y te deja pasar.',
  ui:{title:'Puerta automática',controls:[
    {k:'w',t:'slider',label:'Apertura',min:.2,max:1.1,step:.05,val:.95,unit:' m'},
    {k:'sp',t:'slider',label:'Velocidad',min:.3,max:5,step:.1,val:1.6,unit:'x'},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Hojas',live:c=>{
      const n=xxCur(XPI.xpx_door);
      if(!n)return 'poné la puerta en el mapa';
      return 'abierta <b>'+(((n.s.k||0)*100)|0)+'%</b> · luz <b>'+
        (n.out>.5?'verde':'roja')+'</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const s=xxTS('xpx_sw',2.2,0),d=xxTS('xpx_door',0,2.4);
  if(!s||!d)return false;
  const ns=xxNode(s),nd=xxNode(d);
  xxLink(ns,nd);
  const x0=nd.s.b[0]?nd.s.b[0].position.x:0;
  ns.s.on=true;xxTick(40,1/30);
  const k=nd.s.k,gap=nd.s.b[0]&&nd.s.b[1]?Math.abs(nd.s.b[1].position.x-nd.s.b[0].position.x):0;
  ns.s.on=false;xxTick(40,1/30);
  const closed=nd.s.k<.15;
  XXDBG.xpx_door={k,gap,closed,x0};
  return k>.85&&gap>1.6&&closed;
});

/* ---------- 68. ELEVADOR ---------- */
xxAdd({
  id:'xpx_lift',name:'Elevador Placa',cat:'circuitos',near:3,auto:true,btn:'🛗 Elevador',
  desc:'Con la señal sube y te lleva parado arriba; al cortarla baja sola.',
  ui:{title:'Elevador',controls:[
    {k:'h',t:'slider',label:'Altura',min:.5,max:14,step:.25,val:4,unit:' m'},
    {k:'sp',t:'slider',label:'Velocidad',min:.3,max:6,step:.1,val:1.8,unit:' m/s'},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Altura',live:c=>{
      const n=xxCur(XPI.xpx_lift);
      if(!n)return 'poné el elevador en el mapa';
      return 'está a <b>'+((n.pos.y-(n.s.y0||0))).toFixed(2)+' m</b> de <b>'+
        xxV('lift','h',4).toFixed(2)+' m</b> · cinemático <b>'+(n.s.kin?'sí':'no')+
        '</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const s=xxTS('xpx_sw',2.6,0),f=xxTS('xpx_lift',0,3,false);
  if(!s||!f)return false;
  const ns=xxNode(s),nf=xxNode(f);
  xxLink(ns,nf);
  XP.set('xpx_lift','h',3);XP.set('xpx_lift','sp',3);
  xxTick(20,1/30);
  const y0=nf.pos.y;
  ns.s.on=true;xxTick(60,1/30);
  const up=nf.pos.y-y0;
  ns.s.on=false;xxTick(70,1/30);
  const back=nf.pos.y-y0;
  XXDBG.xpx_lift={y0,up,back,kin:nf.s.kin};
  return up>1.2&&back<up*.5;
});

/* ---------- 69. CINTA TRANSPORTADORA ---------- */
xxAdd({
  id:'xpx_belt',name:'Cinta Rodillo',cat:'circuitos',near:2.8,auto:true,btn:'⏩ Cinta',
  desc:'Arrastra los objetos (y a vos) que estén arriba, en el sentido de la cinta.',
  ui:{title:'Cinta transportadora',controls:[
    {k:'sp',t:'slider',label:'Velocidad',min:.3,max:9,step:.1,val:2.4,unit:' m/s'},
    {k:'back',t:'switch',label:'Al revés',val:false},
    {k:'pl',t:'switch',label:'Arrastrarme a mí también',val:true},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Cinta',live:c=>{
      const n=xxCur(XPI.xpx_belt);
      if(!n)return 'poné la cinta en el mapa';
      return 'andando <b>'+(n.out>.5?'sí':'no')+'</b> a <b>'+xxV('belt','sp',2.4).toFixed(1)+
        ' m/s</b> '+(xxV('belt','back',false)?'(al revés)':'')+'<br>'+xxSt(c);}}
  ]}
},()=>{
  const b=xxTS('xpx_belt',0,3.4),s=xxTS('xpx_sw',2.6,3.4);
  if(!b||!s)return false;
  const nb=xxNode(b),ns=xxNode(s);
  xxLink(ns,nb);
  /* una caja encima de la cinta: la superficie está a 0,60 m del piso */
  const c=xxTSAt(XXTOBJ,nb.pos.x,nb.pos.y+1.1,nb.pos.z-.6,false);
  if(!c)return false;
  xxTick(24,1/30);
  const z0=c.body.position.z,x0=c.body.position.x;
  XP.set('xpx_belt','sp',3);XP.set('xpx_belt','back',false);
  ns.s.on=true;xxTick(60,1/30);
  const moved=Math.hypot(c.body.position.z-z0,c.body.position.x-x0);
  XXDBG.xpx_belt={moved,z0,z1:c.body.position.z};
  return moved>.35;
});

/* ---------- 70. GRÚA ---------- */
xxAdd({
  id:'xpx_crane',name:'Grua Torre',cat:'circuitos',near:3.4,auto:true,btn:'🏗 Grúa',
  desc:'Girá la pluma, sacá cable y con la señal el imán agarra lo que tenga debajo.',
  ui:{title:'Grúa',controls:[
    {k:'yaw',t:'slider',label:'Giro de la pluma',min:-180,max:180,step:5,val:0,unit:'°'},
    {k:'reach',t:'slider',label:'Alcance',min:1.5,max:9,step:.25,val:4,unit:' m'},
    {k:'h',t:'slider',label:'Altura del gancho',min:.2,max:7,step:.2,val:3,unit:' m'},
    {k:'sp',t:'slider',label:'Velocidad',min:.2,max:3,step:.1,val:1,unit:'x'},
    xxEnSw(),
    {t:'botones',label:'Atajos',items:[{label:'⤾ −45°',v:-45},{label:'0°',v:0},
      {label:'⤿ +45°',v:45},{label:'⬇ Bajar',v:'d'},{label:'⬆ Subir',v:'u'}],
     on:(c,v)=>{
       if(v==='d')c.set('h',Math.max(.2,c.get('h')-1.5));
       else if(v==='u')c.set('h',Math.min(7,c.get('h')+1.5));
       else c.set('yaw',v);}},
    {t:'texto',label:'Gancho',live:c=>{
      const n=xxCur(XPI.xpx_crane);
      if(!n)return 'poné la grúa en el mapa';
      return 'imán <b>'+(n.out>.5?'ON':'off')+'</b> · sostiene <b>'+
        (n.s.grab?n.s.grab.def.name:'nada')+'</b> · gancho a <b>'+
        (n.s.hp?n.s.hp.y.toFixed(2):'—')+' m</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const g=xxTS('xpx_crane',0,4),s=xxTS('xpx_sw',3.4,4);
  if(!g||!s)return false;
  const ng=xxNode(g),ns=xxNode(s);
  xxLink(ns,ng);
  XP.set('xpx_crane','yaw',0);XP.set('xpx_crane','reach',3);XP.set('xpx_crane','h',.6);
  XP.set('xpx_crane','sp',3);
  xxTick(40,1/30);
  /* caja justo debajo del gancho */
  const c=xxTSAt(XXTOBJ,ng.s.hp.x,ng.s.hp.y-.4,ng.s.hp.z,false);
  if(!c)return false;
  const y0=c.body.position.y;
  ns.s.on=true;xxTick(20,1/30);
  const got=!!ng.s.grab;
  XP.set('xpx_crane','h',5);
  xxTick(90,1/30);
  const lifted=c.body.position.y-y0;
  ns.s.on=false;xxTick(4);
  XXDBG.xpx_crane={got,lifted,y0};
  return got&&lifted>.9;
});

/* ---------- 71. TURBINA ---------- */
xxAdd({
  id:'xpx_fan',name:'Turbina Fuelle',cat:'circuitos',near:2.6,auto:true,btn:'🌀 Turbina',
  desc:'Sopla un cono de aire que empuja los props (y a vos) de verdad.',
  ui:{title:'Turbina',controls:[
    /* la unidad es m/s² (aceleración) porque la fuerza va proporcional a la masa: 12 alcanza
       para vencer el rozamiento de una caja y no la manda a 9 metros como los 60 de la prueba */
    /* 25 m/s² por defecto: MEDIDO con un bloque de 17 kg apoyado en el piso (μ=0,5 contra
       MAT.world). Hasta 18 el rozamiento se lo come y no se mueve ni 5 cm; desde 25 arranca y
       recorre 6,5 m en dos segundos. Un default más suave parecía "no funcionar". */
    {k:'f',t:'slider',label:'Fuerza del aire',min:2,max:60,step:2,val:25,unit:' m/s²'},
    {k:'r',t:'slider',label:'Alcance',min:2,max:24,step:.5,val:9,unit:' m'},
    {k:'a',t:'slider',label:'Apertura del cono',min:5,max:70,step:1,val:26,unit:'°'},
    {k:'suck',t:'switch',label:'Aspirar en vez de soplar',val:false},
    {k:'pl',t:'switch',label:'Empujarme a mí también',val:true},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Aire',live:c=>{
      const n=xxCur(XPI.xpx_fan);
      if(!n)return 'poné la turbina en el mapa';
      return 'soplando <b>'+(n.out>.5?'sí':'no')+'</b> · '+xxV('fan','f',25)+' m/s² a '+
        xxV('fan','r',9)+' m<br>'+xxSt(c);}}
  ]}
},()=>{
  const f=xxTS('xpx_fan',0,3),s=xxTS('xpx_sw',2.6,3);
  if(!f||!s)return false;
  const nf=xxNode(f),ns=xxNode(s);
  xxLink(ns,nf);
  xxPose(nf);
  const c=xxTSAt(XXTOBJ,nf.pos.x+nf.fwd.x*2.2,nf.pos.y+.9,nf.pos.z+nf.fwd.z*2.2,false);
  if(!c)return false;
  xxTick(20,1/30);
  const p0=c.body.position.clone?null:null;
  const x0=c.body.position.x,z0=c.body.position.z;
  XP.set('xpx_fan','f',60);XP.set('xpx_fan','r',9);XP.set('xpx_fan','a',40);
  ns.s.on=true;xxTick(50,1/30);
  const moved=Math.hypot(c.body.position.x-x0,c.body.position.z-z0);
  XXDBG.xpx_fan={moved};
  return moved>.4;
});

/* ---------- 72. TELETRANSPORTADOR ---------- */
xxAdd({
  id:'xpx_tele',name:'Teleporte Par',cat:'circuitos',near:2.6,auto:true,btn:'🌀 Teletransporte',
  desc:'Se emparejan de dos en dos por orden de colocación: pisá uno con la señal puesta y salís por el otro.',
  ui:{title:'Teletransportador',controls:[
    {k:'r',t:'slider',label:'Radio de la plataforma',min:.4,max:3,step:.1,val:1.1,unit:' m'},
    {k:'cd',t:'slider',label:'Enfriamiento',min:.4,max:8,step:.2,val:2,unit:' s'},
    {k:'obj',t:'switch',label:'Llevar objetos también',val:true},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Par',live:c=>{
      const n=xxCur(XPI.xpx_tele);
      if(!n)return 'poné dos plataformas en el mapa';
      let k=0;for(const m of XXL)if(m.t==='tele')k++;
      return 'plataformas <b>'+k+'</b> · mi pareja <b>'+(n.s.pair?'#'+n.s.pair.seq:'ninguna (poné otra)')+
        '</b> · viajes <b>'+(n.s.n||0)+'</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const a=xxTS('xpx_tele',2.5,0),b=xxTS('xpx_tele',-2.5,7);
  if(!a||!b)return false;
  const na=xxNode(a),nb=xxNode(b);
  xxPairD=true;XXDirty=true;xxTick(2);
  if(!na.s.pair)return false;
  XP.set('xpx_tele','r',1.4);XP.set('xpx_tele','cd',.5);
  /* las plataformas son SALIDAS: no tienen s.on propio, se les fuerza la señal como lo hace el
     tablero (s.force lo respeta xxEval para cualquier tipo) */
  na.s.force=1;nb.s.force=1;
  /* al jugador se lo pone sobre la plataforma A a mano */
  const px=plBody.position.x,py=plBody.position.y,pz=plBody.position.z;
  xxPt(na,0,.2,0,_xxv);
  plBody.position.set(_xxv.x,_xxv.y+.1,_xxv.z);
  na.s.cd=0;nb.s.cd=0;
  xxTick(6);
  xxPt(nb,0,0,0,_xxv2);
  const d=Math.hypot(plBody.position.x-_xxv2.x,plBody.position.z-_xxv2.z);
  plBody.position.set(px,py,pz);plBody.velocity.set(0,0,0);
  XXDBG.xpx_tele={d,n:na.s.n};
  return d<1.6;
});

/* ---------- 73. LANZALLAMAS ---------- */
xxAdd({
  id:'xpx_flame',name:'Lanzallamas',cat:'circuitos',near:2.6,auto:true,btn:'🔥 Lanzallamas',
  desc:'Chorro de fuego mientras haya señal: empuja los props y quema al que se cruce.',
  ui:{title:'Lanzallamas',controls:[
    {k:'r',t:'slider',label:'Alcance',min:2,max:12,step:.5,val:6,unit:' m'},
    {k:'p',t:'slider',label:'Potencia',min:.3,max:2.5,step:.1,val:1,unit:'x'},
    {k:'dmg',t:'switch',label:'Quema al jugador',val:true},
    {k:'dps',t:'slider',label:'Daño',min:2,max:40,step:2,val:12,unit:' /s'},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Llama',live:c=>{
      const n=xxCur(XPI.xpx_flame);
      if(!n)return 'poné el lanzallamas en el mapa';
      return 'escupiendo <b>'+(n.out>.5?'sí':'no')+'</b> · partículas vivas <b>'+XXF.length+
        '/'+XXCAP.fire+'</b><br>'+xxSt(c);}}
  ]}
},()=>{
  const f=xxTS('xpx_flame',0,3),s=xxTS('xpx_sw',2.6,3);
  if(!f||!s)return false;
  const nf=xxNode(f),ns=xxNode(s);
  xxLink(ns,nf);
  xxPose(nf);
  const c=xxTSAt(XXTOBJ,nf.pos.x+nf.fwd.x*2,nf.pos.y+.6,nf.pos.z+nf.fwd.z*2,false);
  if(!c)return false;
  xxTick(20,1/30);
  const x0=c.body.position.x,z0=c.body.position.z;
  XXF.length=0;
  XP.set('xpx_flame','p',2);XP.set('xpx_flame','r',7);
  ns.s.on=true;xxTick(30,1/30);
  const parts=XXF.length;
  for(let i=0;i<10;i++)xxFireStep(1/60);
  const moved=Math.hypot(c.body.position.x-x0,c.body.position.z-z0);
  ns.s.on=false;
  XXDBG.xpx_flame={parts,moved};
  return parts>0&&moved>.1;
});

/* ---------- 74. TORRETA ---------- */
xxAdd({
  id:'xpx_turret',name:'Torreta Auto',cat:'circuitos',near:2.8,auto:true,btn:'🔫 Torreta',
  desc:'Apunta y dispara de verdad al activarse (por defecto le tira a los objetos, no a vos).',
  ui:{title:'Torreta',controls:[
    {k:'m',t:'lista',label:'A quién apunta',val:'obj',items:[
      {label:'📦 Objetos',v:'obj'},{label:'🧍 Al jugador',v:'pl'},{label:'⛔ A nada',v:'off'}]},
    {k:'rof',t:'slider',label:'Cadencia',min:.5,max:12,step:.5,val:4,unit:' /s'},
    {k:'dmg',t:'slider',label:'Daño',min:1,max:25,step:1,val:7,unit:''},
    {k:'r',t:'slider',label:'Alcance',min:5,max:60,step:1,val:26,unit:' m'},
    {k:'w',t:'slider',label:'Velocidad de giro',min:.4,max:8,step:.2,val:2.6,unit:' rad/s'},
    {k:'fire',t:'switch',label:'Disparar (si no, sólo sigue)',val:true},
    xxInvSw(),
    xxEnSw(),
    {t:'texto',label:'Torreta',live:c=>{
      const n=xxCur(XPI.xpx_turret);
      if(!n)return 'poné la torreta en el mapa';
      return 'objetivo <b>'+(n.s.tgt?'sí':'no')+'</b> · encarado <b>'+(n.s.aim?'sí':'no')+
        '</b> · tiros <b>'+(n.s.shots||0)+'</b> · impactos <b>'+(n.s.hits||0)+
        '</b><br>'+xxSt(c);}}
  ]}
},()=>{
  /* la palanca va DETRÁS de la torreta (−X): si quedara entre la torreta y el bloque, el rayo
     del disparo pegaría en la palanca y el test mediría un impacto que no es el que busca */
  const t=xxTS('xpx_turret',0,3),s=xxTS('xpx_sw',-3,3);
  if(!t||!s)return false;
  const nt=xxNode(t),ns=xxNode(s);
  xxLink(ns,nt);
  xxPose(nt);
  const c=xxTSAt(XXTOBJ,nt.pos.x+2.2,nt.pos.y+.5,nt.pos.z,false);
  if(!c)return false;
  XP.set('xpx_turret','m','obj');XP.set('xpx_turret','rof',8);XP.set('xpx_turret','dmg',10);
  XP.set('xpx_turret','w',8);XP.set('xpx_turret','fire',true);
  nt.s.shots=0;nt.s.hits=0;
  xxTick(20,1/30);
  ns.s.on=true;xxTick(50,1/30);
  const shots=nt.s.shots||0,hits=nt.s.hits||0;
  ns.s.on=false;
  XXDBG.xpx_turret={shots,hits,aim:nt.s.aim};
  return shots>0&&hits>0;
});

/* ---------- 75. TABLERO DE CONTROL ---------- */
/* Es el panel que muestra TODOS los circuitos del mapa y los activa a mano. La lista es
   dinámica, y los controles de core_u se construyen al abrir: por eso el detalle por nodo va
   en un XP.screen() (panel a mano) que se arma en el momento con un interruptor por entrada. */
function xxBoardRows(max){
  const out=[];
  for(const n of XXL){
    if(n.k==='aux')continue;
    out.push((n.out>.5?'🟢':(n.pow?'⚫':'🔴'))+' <b>'+xxNameOf(n)+'</b> #'+n.seq+
      ' · in '+(n.pin>.5?1:0)+' → out '+(n.out>.5?1:0)+
      (n.w.length?' · '+n.w.length+'🔌':''));
    if(out.length>=(max||14))break;
  }
  return out;
}
/* Un interruptor POR PROP, armado en el momento. Va en un XP.screen() (panel a mano) y no en el
   panel del tablero porque core_u construye los controles al abrir y la lista de circuitos del
   mapa cambia todo el tiempo: un panel fijo mostraría los props de hace cinco minutos.
   Entra CUALQUIER nodo, no sólo las entradas: las palancas y baterías mueven su propio estado y
   el resto se fuerza con s.force (que xxEval respeta para todos los tipos). */
function xxBoardManual(){
  const cs=[];
  for(const n of XXL){
    if(n.k==='aux')continue;
    const lbl=xxNameOf(n)+' #'+n.seq;
    cs.push({k:'n'+n.seq,t:'switch',label:lbl,val:!!(n.s.on||n.s.man||n.s.force),
      on:(c,v)=>{
        if(n.t==='btn')n.s.man=v?1:0;
        else if(n.t==='sw'||n.t==='batt')n.s.on=v;
        else n.s.force=v?1:0;
      }});
    if(cs.length>=16)break;
  }
  if(!cs.length)cs.push({t:'texto',label:'Vacío',
    val:'no hay circuitos en el mapa: spawneá alguno de la carpeta Circuitos'});
  cs.push({t:'texto',label:'Ayuda',
    val:'Cada interruptor es el de UN prop del mapa (no el del tipo). Las palancas y baterías '+
        'cambian su propio estado; los demás quedan forzados en 1 mientras esté puesto.'});
  XP.screen('Activar a mano',cs,{cat:'circuitos'});
  return cs.length;
}
xxAdd({
  id:'xpx_board',name:'Tablero Ctrl',cat:'circuitos',near:3,auto:true,btn:'🎛 Tablero de control',
  desc:'El estado de todos los circuitos del mapa, y los ajustes de la red entera.',
  ui:{title:'Tablero de control',controls:[
    {t:'texto',label:'Circuitos en el mapa',live:()=>{
      if(!XXL.length)return 'no hay circuitos: spawneá alguno de la carpeta <b>Circuitos</b>';
      const r=xxBoardRows(13);
      let more=0;for(const n of XXL)if(n.k!=='aux')more++;
      return r.join('<br>')+(more>r.length?'<br>… y '+(more-r.length)+' más':'');}},
    {t:'botones',label:'A mano',items:[
      {label:'🎛 Interruptor por prop…',v:'man'},{label:'⏻ Todo ON',v:'on'},
      {label:'⭘ Todo OFF',v:'off'},{label:'↺ Reset',v:'rst'}],
     on:(c,v)=>{
       if(v==='man'){xxBoardManual();return;}
       if(v==='rst'){
         for(const n of XXL){n.s.c=0;n.s.q=0;n.s.t=0;n.s.man=0;n.s.force=0;
           if(n.t==='sw'||n.t==='batt')n.s.on=n.t==='batt';}
         c.toast('↺ circuitos a cero');return; }
       let k=0;
       for(const n of XXL){
         if(n.t==='sw'||n.t==='batt'){n.s.on=v==='on';k++;}
         else if(n.t==='btn'){n.s.man=v==='on'?1:0;k++;}
       }
       c.toast((v==='on'?'⏻ ':'⭘ ')+k+' entrada(s)');}},
    {k:'hz',t:'slider',label:'Evaluaciones por segundo',min:5,max:60,step:5,val:20,unit:' Hz'},
    {k:'link',t:'slider',label:'Radio de conexión sin cable',min:0,max:20,step:.5,val:6,unit:' m',
     fmt:v=>v<=0?'sólo cables':v.toFixed(1)+' m'},
    {k:'pow',t:'switch',label:'Requerir batería (si hay alguna prendida)',val:true},
    {k:'cab',t:'switch',label:'Dibujar los cables',val:true},
    {t:'texto',label:'Motor',live:()=>'nodos <b>'+XXL.length+'</b> · cables <b>'+XXW.length+
      '</b> · evaluaciones <b>'+XXG.evals+'</b> · luces <b>'+XXG.lights+'/'+XXCAP.light+
      '</b> · fuego <b>'+XXF.length+'/'+XXCAP.fire+'</b><br>alimentados <b>'+(XXG.fed||0)+
      '</b> · baterías prendidas <b>'+(XXG.src||0)+'</b> · '+XXG.hz+' Hz'}
  ]}
},()=>{
  const b=xxTS('xpx_board',1.6,0),s=xxTS('xpx_sw',1.6,1.6),l=xxTS('xpx_lamp',2.8,1.6);
  if(!b||!s||!l)return false;
  xxTick(3);
  /* el tablero NO se lista a sí mismo (es 'aux'): con una palanca y una lámpara tiene que
     mostrar dos filas */
  const rows=xxBoardRows(20).length;
  const man=xxBoardManual();
  const open=XPP.open;
  xpClose();
  XXDBG.xpx_board={rows,man,open,nodes:XXL.length};
  return rows>=2&&man>=1&&open;
});

/* ================= 15. PRUEBAS ================= */
/* xxTS: spawnea un prop de prueba al lado del jugador y lo anota para borrarlo después.
   Sin esto cada prueba dejaría basura en el mapa. */
const XXTMP=[];
function xxTSAt(id,x,y,z,frozen){
  if(!PDEF[id])return null;
  const p=spawnProp(id,{x,y,z},null,{raw:true,frozen:frozen!==false});
  if(p){XXTMP.push(p);xxScan();}
  return p;
}
function xxTS(id,dx,dz,frozen){
  const b=PDEF[id]?buildDef(PDEF[id]):null;
  return xxTSAt(id,plBody.position.x+dx,plBody.position.y+(b?b.dy:.5)+.02,
    plBody.position.z+dz,frozen);
}
function xxTClean(){
  for(const p of XXTMP)if(PROPS.indexOf(p)>=0)removeProp(p);
  XXTMP.length=0;
  while(XXW.length)xxCut(XXW[0]);
  xxScan();
}
/* un "mini frame": física + motor de circuitos, sin el jugador ni la animación. Alcanza para
   medir todo lo de este archivo y no depende de __H.step (que no llama a EXT.post). */
function xxTick(n,dt){
  dt=dt||1/60;
  for(let i=0;i<(n||1);i++){
    world.step(1/60,dt,2);
    nsafe(()=>xxStep(dt,true),'xxtick');
  }
  return XXG.evals;
}
function xxTestAll(){
  const out={};
  const wasPow=XXG.pow;
  for(const id in XXTEST){
    let r;
    try{ r=XXTEST[id](); }
    catch(e){ r=String((e&&e.message)||e).slice(0,90); }
    out[id]=r===true?'ok':(r===false?'FALLO':'FALLO · '+r);
    nsafe(xxTClean,'xxclean_'+id);
  }
  XXG.pow=wasPow;
  return out;
}

/* ================= 16. HOOKS ================= */
/* XXL sólo se reordena dentro de xxEval, o sea 20 veces por segundo DESDE EL BUCLE. Un hook que
   corre justo después de spawnear (una sonda hace las dos cosas en el mismo tick de JS) veía la
   lista VIEJA: xxWire no encontraba los nodos recién creados y devolvía false sin cablear nada.
   Todos los hooks entran por acá, que pone la lista al día si hace falta. */
function xxAll(){
  if(XXDirty)xxOrder();
  return XXL;
}
const xxSeqOf=s=>{for(const n of XXN.values())if(n.seq===s)return n;return null;};
if(DEV&&window.__H)Object.assign(window.__H,{
  xpxTest:()=>xxTestAll(),
  xpxDbg:()=>XXDBG,
  xxNodes:()=>xxAll().map(n=>({id:n.id,t:n.t,seq:n.seq,in:+n.pin,out:+n.out,pow:n.pow,
    w:n.w.length,ai:n.ai.length,
    p:[+n.pos.x.toFixed(2),+n.pos.y.toFixed(2),+n.pos.z.toFixed(2)]})),
  xxWires:()=>XXW.map(w=>({a:w.a.t+'#'+w.a.seq,b:w.b.t+'#'+w.b.seq,live:w.a.out>.5})),
  xxSig:t=>{const o=[];for(const n of xxAll())if(!t||n.t===t)o.push({t:n.t,seq:n.seq,out:+n.out});return o;},
  xxSet:(t,k,v)=>{let n=0;for(const m of xxAll())if(m.t===t){m.s[k]=v;n++;}return n;},
  xxLink:(ta,tb)=>{let a=null,b=null;
    for(const n of xxAll()){if(!a&&n.t===ta)a=n;else if(!b&&n.t===tb)b=n;}
    return !!(a&&b&&xxLink(a,b));},
  /* cablear por número de nodo: es lo que hace falta para armar una mesa con cuatro compuertas
     desde afuera (xxLink por tipo sólo puede con el primero de cada uno) */
  xxWire:(sa,sb)=>{const a=xxSeqOf(sa),b=xxSeqOf(sb);return !!(a&&b&&xxLink(a,b));},
  xxSpawn:(t,dx,dz,frozen)=>{const p=xxTS(XXID[t]||t,dx||0,dz||0,frozen);
    const n=xxNode(p);return p?{id:p.id,seq:n?n.seq:0}:null;},
  xxSpawnAt:(t,x,y,z,frozen)=>{const p=xxTSAt(XXID[t]||t,x,y,z,frozen);
    const n=xxNode(p);return p?{id:p.id,seq:n?n.seq:0}:null;},
  xxForce:(seq,v)=>{const n=xxSeqOf(seq);if(!n)return false;n.s.force=v?1:0;return true;},
  xxNode:seq=>{const n=xxSeqOf(seq);
    return n?{t:n.t,in:+n.pin,out:+n.out,pow:n.pow,w:n.w.length,
      s:{on:!!n.s.on,k:n.s.k,kg:n.s.kg,c:n.s.c,q:n.s.q,i:n.s.i,shots:n.s.shots,hits:n.s.hits,
        d:n.s.d,sc:n.s.sc,pn:n.s.pn,grab:!!n.s.grab,pair:!!n.s.pair,y:+n.pos.y.toFixed(3),
        dy:+(n.pos.y-(n.s.y0||0)).toFixed(3)}}:null;},
  xxClean:()=>{xxTClean();return XXL.length;},
  xxTick:(n,dt)=>xxTick(n,dt),
  xxCfg:()=>({hz:XXG.hz,link:XXG.link,pow:XXG.pow,cable:XXG.cable,volt:XXG.volt,
    nodes:XXL.length,wires:XXW.length,evals:XXG.evals,fed:XXG.fed||0,src:XXG.src||0,
    lights:XXG.lights,cap:XXCAP,fire:XXF.length,snds:xxSnds,on:XXG.on}),
  xxFire:()=>XXF.length,
  xxLights:()=>{let a=0,i=0;for(const n of XXL)if(n.t==='lamp'||n.t==='siren'){
    if(n.s.light){a++;i+=n.s.light.intensity;}}return {n:a,i:+i.toFixed(2)};},
  xxBoard:()=>xxBoardRows(30),
  xxManual:()=>xxBoardManual(),
  xxOff:()=>xxAllOff(),
  /* APP es un `let` de core_b y esto es UN módulo, así que se le puede escribir desde acá. Es la
     única forma de probar el "se apaga al salir de la partida": el botón Dejar del menú de pausa
     recarga la página entera (location.reload), o sea que no prueba nada. Sólo con ?dev. */
  xxApp:v=>{APP=v;return APP;},
  xxCab:()=>({wires:XXW.length,inst:xxCabM?xxCabM.count:0,on:XXG.cable}),
  /* crudo del cuerpo de un prop: fuerza acumulada, velocidad y estado de sueño. Es lo que hizo
     falta para entender por qué un empuje "aplicado" no movía nada (ver xxFan). */
  xxBody:i=>{const p=PROPS[i];if(!p)return null;const b=p.body;
    return {f:[+b.force.x.toFixed(1),+b.force.y.toFixed(1),+b.force.z.toFixed(1)],
      v:[+b.velocity.x.toFixed(3),+b.velocity.y.toFixed(3),+b.velocity.z.toFixed(3)],
      sleep:b.sleepState,allow:b.allowSleep,type:b.type,mass:b.mass,frozen:p.frozen,
      pos:[+b.position.x.toFixed(2),+b.position.y.toFixed(2),+b.position.z.toFixed(2)]};},
  /* estado de la pantalla generada del tablero (la única imagen de Higgsfield de este archivo) */
  xxHmi:()=>{let vis=false,n=0;
    for(const m of xxAll())if(m.t==='board'&&m.s.scr){n++;if(m.s.scr.visible)vis=true;}
    return {ok:XXHMI.ok,map:!!XXM.hmi.map,vis,boards:n};},
  /* escribir el estado de UN nodo (por número): las palancas y las baterías son por prop */
  xxSetSeq:(seq,k,v)=>{const n=xxSeqOf(seq);if(!n)return false;n.s[k]=v;return true;}
});
