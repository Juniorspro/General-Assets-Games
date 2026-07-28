/* ============================================================
   SUX SANDBOX — núcleo (mundo, materiales, props, mapas)
   Física rígida real (cannon-es) · 280+ props · 4 mapas
   ============================================================ */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as CANNON from 'cannon';

const HASH='4e434fb';
const BASE='https://cdn.jsdelivr.net/gh/Juniorspro/General-Assets-Games@'+HASH+'/assets/hyper/';
const okUrl=u=>typeof u==='string'&&u.indexOf('@PEND')<0;
const $=i=>document.getElementById(i);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const D2R=Math.PI/180;
const Q=new URLSearchParams(location.search);
const DEV=Q.has('dev');

/* texturas del mapa/props */
const TEXU={grass:'t-grass.jpg',concrete:'t-concrete.jpg',brick:'t-brick.jpg',asphalt:'t-asphalt.jpg',
  steel:'t-steel.jpg',corrugated:'t-corrugated.jpg',water:'t-water.jpg',wood:'t-wood.jpg',
  rust:'t-rust.jpg',sky:'sky.jpg'};
/* modelos generados */
const GLBU={char:'char.glb',aIdle:'anim-idle.glb',aRun:'anim-run.glb',aJump:'anim-jump.glb',
  pSedan:'p-sedan.glb',pTree:'p-tree.glb',pCrate:'p-crate.glb',physgun:'w-physgun.glb',pistol:'w-pistol.glb',shotgun:'w-shotgun.glb',
  smg:'w-smg.glb',sniper:'w-sniper.glb',akm:'w-akm.glb',rpg:'w-rpg.glb',bat:'w-bat.glb',
  revolver:'w-revolver.glb',toolgun:'w-toolgun.glb',crossbow:'w-crossbow.glb'};

/* ================= guardado ================= */
const DEF={lang:'',qual:'uld',map:'construct',seen:false,
  shadow:null,desc:true,post:false,fpsm:true,hideui:false,sens:1,fpslim:0,texq:1,maxProps:0};
let SV=Object.assign({},DEF);
try{const r=localStorage.getItem('hyper1');if(r)SV=Object.assign(SV,JSON.parse(r));}catch(e){}
const save=()=>{try{localStorage.setItem('hyper1',JSON.stringify(SV));}catch(e){}};

/* ================= i18n ================= */
const I18N={es:{
  quld:'ULTRA LOW · ULD',quldD:'Gama baja (J8, A10…) · lo más fluido',
  qlow:'BAJA',qlowD:'Equilibrada',qhigh:'ALTA',qhighD:'Sombras, más props y agua',
  play:'▶ UN SOLO JUGADOR',multi:'👥 Multijugador · pronto',help:'❓ Controles',qual:'⚙ Gráficos',
  mapT:'Mapa',mapS:'Elegí dónde construir.',go:'JUGAR',back:'↩ Atrás',
  tag:'Física real, 280+ props, armas y mapas. Construí, apilá y volá todo.',
  hT:'Controles',hB:'<b>Palanca</b> caminar · <b>arrastrá la pantalla</b> mirar<br>'+
    '<b>◎</b> primera persona / apuntar · <b>⬆</b> saltar · <b>✥</b> disparar / agarrar<br>'+
    '<b>❄</b> congelar lo que agarrás · <b>🔧</b> menú de spawn (props, vehículos, armas)<br>'+
    '<b>🗑</b> borrar lo que apuntás (mantené = limpiar todo) · <b>🧍</b> ragdoll · <b>📷</b> foto<br>'+
    'Con la <b>PhysicsGun</b>: mantené ✥ para levantar, mirá para mover, ❄ para clavarlo en el aire.',
  ok:'OK',close:'Cerrar',pause:'Pausa',resume:'Atrás',resp:'Reaparecimiento',sav:'Salvar',
  opts:'Ajustes',quit:'Dejar',opTit:'Ajustes',
  oShadow:'Sombra',oDesc:'Describir',oPost:'Postprocesamiento',oFps:'Fps meter',oHide:'Esconder UI',
  oSens:'Sensibilidad',oLim:'Fps Limit',oTex:'Calidad de textura',oMax:'Límite de props',
  def:'Por defecto',dup:'Dup. Aparecer',frz:'Congelar',
  tacc:'Accesorios',tveh:'Vehículos',tent:'Entidades',tarm:'Armas',ttool:'Herramientas',
  tMax:'límite de props alcanzado',tSaved:'💾 guardado',tLoaded:'partida cargada',
  tFroze:'❄ congelado',tUnfroze:'🔥 descongelados: ',tClear:'🧹 patio limpio',tRag:'🧍 ragdoll',
  tShot:'📷 captura guardada',tNo:'no hay nada ahí',tRemoved:'🗑 borrado',tWeap:'arma: ',
  tools:['Physgun','Soldar','Borrar','Duplicar','Globo','Propulsor','Congelar','Descongelar'],
  weap:'Armas',hint:'🔧 spawneá props · ✥ agarrá y tirá',
  tFP:'👁 primera persona',tTP:'🧍 tercera persona',tAimNo:'la mira es para las armas',
  tApply:'aplicando gráficos…'},
en:{quld:'ULTRA LOW · ULD',quldD:'Low-end phones · smoothest',qlow:'LOW',qlowD:'Balanced',
  qhigh:'HIGH',qhighD:'Shadows, more props and water',
  play:'▶ SINGLE PLAYER',multi:'👥 Multiplayer · soon',help:'❓ Controls',qual:'⚙ Graphics',
  mapT:'Map',mapS:'Pick where to build.',go:'PLAY',back:'↩ Back',
  tag:'Real physics, 280+ props, weapons and maps. Build, stack and blow it up.',
  hT:'Controls',hB:'<b>Stick</b> walk · <b>drag</b> to look<br><b>◎</b> first person / aim · '+
    '<b>⬆</b> jump · <b>✥</b> fire / grab<br><b>❄</b> freeze what you hold · <b>🔧</b> spawn menu<br>'+
    '<b>🗑</b> remove what you aim at (hold = clear all) · <b>🧍</b> ragdoll · <b>📷</b> photo',
  ok:'OK',close:'Close',pause:'Paused',resume:'Back',resp:'Respawn',sav:'Save',opts:'Settings',
  quit:'Quit',opTit:'Settings',oShadow:'Shadow',oDesc:'Describe',oPost:'Post-processing',
  oFps:'Fps meter',oHide:'Hide UI',oSens:'Sensitivity',oLim:'Fps Limit',oTex:'Texture quality',
  oMax:'Prop limit',def:'Default',dup:'Dup. Spawn',frz:'Freeze',
  tacc:'Props',tveh:'Vehicles',tent:'Entities',tarm:'Weapons',ttool:'Tools',
  tMax:'prop limit reached',tSaved:'💾 saved',tLoaded:'game loaded',tFroze:'❄ frozen',
  tUnfroze:'🔥 unfrozen: ',tClear:'🧹 cleared',tRag:'🧍 ragdoll',tShot:'📷 screenshot saved',
  tNo:'nothing there',tRemoved:'🗑 removed',tWeap:'weapon: ',
  tools:['Physgun','Weld','Remove','Duplicate','Balloon','Thruster','Freeze','Unfreeze'],
  weap:'Weapons',hint:'🔧 spawn props · ✥ grab and throw',
  tFP:'👁 first person',tTP:'🧍 third person',tAimNo:'aim works with weapons',
  tApply:'applying graphics…'},
pt:{quld:'ULTRA LOW · ULD',quldD:'Aparelhos fracos · mais fluido',qlow:'BAIXA',qlowD:'Equilibrada',
  qhigh:'ALTA',qhighD:'Sombras, mais props e água',
  play:'▶ UM JOGADOR',multi:'👥 Multijogador · logo',help:'❓ Controles',qual:'⚙ Gráficos',
  mapT:'Mapa',mapS:'Escolha onde construir.',go:'JOGAR',back:'↩ Voltar',
  tag:'Física real, 280+ props, armas e mapas. Construa, empilhe e explode tudo.',
  hT:'Controles',hB:'<b>Analógico</b> andar · <b>arraste</b> para olhar<br><b>◎</b> primeira pessoa · '+
    '<b>⬆</b> pular · <b>✥</b> atirar / pegar<br><b>❄</b> congelar · <b>🔧</b> menu de spawn<br>'+
    '<b>🗑</b> apagar · <b>🧍</b> ragdoll · <b>📷</b> foto',
  ok:'OK',close:'Fechar',pause:'Pausa',resume:'Voltar',resp:'Renascer',sav:'Salvar',opts:'Ajustes',
  quit:'Sair',opTit:'Ajustes',oShadow:'Sombra',oDesc:'Descrever',oPost:'Pós-processamento',
  oFps:'Fps meter',oHide:'Esconder UI',oSens:'Sensibilidade',oLim:'Fps Limit',oTex:'Qualidade de textura',
  oMax:'Limite de props',def:'Padrão',dup:'Dup. Aparecer',frz:'Congelar',
  tacc:'Acessórios',tveh:'Veículos',tent:'Entidades',tarm:'Armas',ttool:'Ferramentas',
  tMax:'limite de props',tSaved:'💾 salvo',tLoaded:'jogo carregado',tFroze:'❄ congelado',
  tUnfroze:'🔥 descongelados: ',tClear:'🧹 limpo',tRag:'🧍 ragdoll',tShot:'📷 captura salva',
  tNo:'nada aí',tRemoved:'🗑 apagado',tWeap:'arma: ',
  tools:['Physgun','Soldar','Apagar','Duplicar','Balão','Propulsor','Congelar','Descongelar'],
  weap:'Armas',hint:'🔧 spawne props · ✥ pegue e jogue',
  tFP:'👁 primeira pessoa',tTP:'🧍 terceira pessoa',tAimNo:'a mira é para as armas',
  tApply:'aplicando gráficos…'}};
let LANG=SV.lang||'es';
const T=k=>(I18N[LANG]||I18N.es)[k];

/* ================= escalones de calidad ================= */
const QPRE={
  uld :{key:'uld', dpr:.62,shadow:0,   texMax:256, far:260,aa:false,phong:true,seg:{cyl:8, sph:8},
        maxProps:300, awake:60, freezeDist:70, water:false,anis:1,charPoly:1},
  low :{key:'low', dpr:.85,shadow:0,   texMax:512, far:400,aa:false,phong:true,seg:{cyl:12,sph:12},
        maxProps:1200,awake:140,freezeDist:110,water:true, anis:2,charPoly:1},
  high:{key:'high',dpr:1.5,shadow:1024,texMax:1024,far:640,aa:true, phong:false,seg:{cyl:16,sph:14},
        maxProps:9999,awake:400,freezeDist:220,water:true, anis:8,charPoly:1}};
let QP=QPRE[SV.qual]||QPRE.uld;
const SEG=()=>QP.seg;

/* ================= three ================= */
const renderer=new THREE.WebGLRenderer({antialias:QP.aa,powerPreference:'high-performance',
  precision:'highp',stencil:false,alpha:false});   // highp SIEMPRE (mediump hace temblar el piso en Mali)
let resScale=1;
const applyDpr=()=>renderer.setPixelRatio(Math.min(devicePixelRatio||1,QP.dpr)*resScale);
applyDpr();
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NeutralToneMapping||THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;
renderer.shadowMap.enabled=QP.shadow>0;
renderer.shadowMap.type=THREE.PCFShadowMap;
/* recorte POR MATERIAL: en 1ª persona se le pone un plano de recorte sólo a las mallas con
   skin del personaje, para que la cabeza no se meta en la vista (ver fpClip en core_c). */
renderer.localClippingEnabled=true;
$('wrap').appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9fbcd4);
const camera=new THREE.PerspectiveCamera(72,1,.09,QP.far);   // .09: corriendo la mano llega a 12,5 cm de la cámara y no se puede recortar
const thumbCam=new THREE.PerspectiveCamera(30,1,.1,60);
/* ---- rotación forzada a horizontal: si el teléfono está vertical, giramos el juego 90°
       (no le pedimos nada al jugador) ---- */
const ROT={on:false,vw:0};
function resize(){
  const portrait=innerHeight>innerWidth;
  ROT.on=portrait;ROT.vw=innerWidth;
  const st=$('stage'),W=portrait?innerHeight:innerWidth,H=portrait?innerWidth:innerHeight;
  if(portrait){ st.style.width=W+'px';st.style.height=H+'px';
    st.style.transform='translateX('+innerWidth+'px) rotate(90deg)'; }
  else { st.style.width='100%';st.style.height='100%';st.style.transform='none'; }
  renderer.setSize(W,H);
  camera.aspect=W/H;camera.updateProjectionMatrix();
}
/* pantalla -> escenario (para la palanca y el arrastre) */
const toStage=(cx,cy)=>ROT.on?{x:cy,y:ROT.vw-cx}:{x:cx,y:cy};
const dStage=(dx,dy)=>ROT.on?{x:dy,y:-dx}:{x:dx,y:dy};
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,250));
resize();

const hemi=new THREE.HemisphereLight(0xd8e8f8,0x475059,.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff4e2,1.35);sun.position.set(70,110,50);scene.add(sun);
const fill=new THREE.DirectionalLight(0xbdd6ee,.32);fill.position.set(-60,50,-40);scene.add(fill);
if(QP.shadow>0){sun.castShadow=true;sun.shadow.mapSize.set(QP.shadow,QP.shadow);
  const d=52,c=sun.shadow.camera;c.left=-d;c.right=d;c.top=d;c.bottom=-d;c.near=1;c.far=260;
  sun.shadow.bias=-0.0011;sun.shadow.normalBias=.035;scene.add(sun.target);}

/* ================= física ================= */
const world=new CANNON.World({gravity:new CANNON.Vec3(0,-19.6,0)});
world.broadphase=new CANNON.SAPBroadphase(world);
world.broadphase.useBoundingBoxes=true;   // más barato con miles de cuerpos
world.allowSleep=true;
world.solver.iterations=QP.key==='high'?12:(QP.key==='low'?9:7);
world.defaultContactMaterial.friction=.42;
world.defaultContactMaterial.restitution=.06;
const MAT={world:new CANNON.Material('w'),prop:new CANNON.Material('p'),player:new CANNON.Material('pl')};
world.addContactMaterial(new CANNON.ContactMaterial(MAT.world,MAT.prop,{friction:.5,restitution:.08}));
world.addContactMaterial(new CANNON.ContactMaterial(MAT.prop,MAT.prop,{friction:.42,restitution:.07}));
world.addContactMaterial(new CANNON.ContactMaterial(MAT.world,MAT.player,{friction:.02,restitution:0}));
world.addContactMaterial(new CANNON.ContactMaterial(MAT.prop,MAT.player,{friction:.16,restitution:0}));

/* ================= texturas ================= */
const TL=new THREE.TextureLoader(),TEX={};
let texPend=0,texDone=0;
function shrink(t,max){ const m=max||QP.texMax*(SV.texq||1);   // max=0 -> el de la calidad
  if(!t.image||!m)return t;
  const im=t.image,w=im.width||im.naturalWidth,h=im.height||im.naturalHeight;
  if(!w||Math.max(w,h)<=m)return t;
  const k=m/Math.max(w,h),cv=document.createElement('canvas');
  cv.width=Math.max(1,Math.round(w*k));cv.height=Math.max(1,Math.round(h*k));
  cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
  t.image=cv;t.needsUpdate=true;return t;}
function paintLoad(p,msg){ const b=$('loadBar');if(b)b.style.width=Math.round(p*100)+'%';
  if(msg)$('loadMsg').textContent=msg;}
function loadTex(key,file,cb){ if(!okUrl(BASE))return;
  texPend++;
  TL.load(BASE+file,t=>{texDone++;
    t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.anisotropy=QP.anis;
    /* el cielo es un panorama de 1536 px: bajarlo a 256 (ULD) lo dejaba como manchones
       verticales con una costura visible, así que tiene su propio piso de resolución */
    shrink(t,key==='sky'?Math.max(768,QP.texMax):0);
    TEX[key]=t;if(cb)cb(t);
    paintLoad(texDone/Math.max(1,texPend));},undefined,()=>{texDone++;});}

/* Los GLB generados vienen con materiales imposibles: el personaje trae emissive=[1,1,1] y
   metalness=1, así que en ALTA (donde el material se usa tal cual) se dibujaba como una
   SILUETA BLANCA sin textura; en ULD/LOW no se notaba porque ahí el material se reemplaza por
   Phong. Esto los deja usables sin tocar el mapa de color. */
function sanGlb(g){
  const root=g&&(g.scene||(g.scenes&&g.scenes[0]));
  if(!root)return g;
  root.traverse(o=>{
    if(!o.isMesh&&!o.isSkinnedMesh)return;
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(!m||m._san)continue; m._san=1;
      if(m.emissive)m.emissive.setScalar(0);
      if(m.emissiveMap)m.emissiveMap=null;
      if(m.metalness!==undefined)m.metalness=Math.min(m.metalness,.18);
      if(m.roughness!==undefined)m.roughness=clamp(m.roughness||.6,.35,.95);
      if(m.transparent&&m.opacity>=.99)m.transparent=false;
      m.needsUpdate=true;
    }});
  return g;
}

/* ================= materiales de props ================= */
/* Un material por nombre. El tinte de cada parte se hornea en los COLORES DE VÉRTICE,
   así todas las partes del mismo material comparten un único draw call (y permite instancing). */
const MDEF={
  wood      :{c:0xc79b62,r:.82,m:.02,t:'wood'},
  plank     :{c:0xa8794a,r:.86,m:.02,t:'wood'},
  metal     :{c:0xa9b1b8,r:.5, m:.18,t:'steel'},
  steel     :{c:0xb6bec5,r:.42,m:.22,t:'steel'},
  rust      :{c:0x8e6b52,r:.78,m:.14,t:'rust'},
  corrugated:{c:0xb2bac1,r:.55,m:.2, t:'corrugated'},
  concrete  :{c:0xbfc4c8,r:.92,m:.02,t:'concrete'},
  brick     :{c:0xa2593f,r:.9, m:.02,t:'brick'},
  asphalt   :{c:0x54585e,r:.94,m:.02,t:'asphalt'},
  plastic   :{c:0xd8dde2,r:.45,m:.03},
  rubber    :{c:0x2a2d33,r:.95,m:.02},
  glass     :{c:0xbcd8e6,r:.12,m:.04,op:.34},
  fabric    :{c:0x8d939b,r:.98,m:.01},
  dirt      :{c:0x7a6244,r:.95,m:.01,t:'asphalt'},
  grass     :{c:0x6f9c4a,r:.92,m:.01,t:'grass'},
  paint     :{c:0xdfe4e8,r:.6, m:.05},
  chrome    :{c:0xd6dde3,r:.22,m:.55},
  neon      :{c:0x6cf0ff,r:.3, m:.0, em:0x2fd8ff},
  cardboard :{c:0xb99367,r:.95,m:.01},
  tile      :{c:0xd6dbe0,r:.35,m:.04,t:'concrete'}};
const PMAT={};
function buildMats(){
  for(const k in MDEF){ const d=MDEF[k];
    /* el color base va SÓLO en los materiales con textura (que lo pierden en cuanto la
       textura llega, ver texMats). En los demás nace BLANCO y el color viaja en el color
       del vértice, que es el albedo real de cada parte: si el material también llevara su
       color, un tinte claro quedaría multiplicado dos veces y se vería negro. */
    const o={color:new THREE.Color(d.t?d.c:0xffffff),vertexColors:true};
    if(d.op!=null){o.transparent=true;o.opacity=d.op;}
    let m;
    if(QP.phong){ o.shininess=Math.max(6,(1-d.r)*80);
      o.specular=new THREE.Color().setScalar(.06+.3*d.m);
      if(d.em)o.emissive=new THREE.Color(d.em);
      m=new THREE.MeshPhongMaterial(o); }
    else { o.roughness=d.r;o.metalness=d.m;
      if(d.em)o.emissive=new THREE.Color(d.em);
      m=new THREE.MeshStandardMaterial(o); }
    m.name=k;PMAT[k]=m; }
}
buildMats();
function texMats(){ /* cuando llegan las texturas se las pasamos al material ya creado */
  for(const k in MDEF){ const d=MDEF[k];if(!d.t)continue;
    const t=TEX[d.t];if(!t)continue;
    const m=PMAT[k];m.map=t;m.color.setScalar(1);m.needsUpdate=true; } }

/* ================= fábrica de props ================= */
/* def: {id,name,mass,parts:[{s,d,p,r,m,c,nc}],col} -> geometrías por material + forma de cannon */
const SECTS=[],PDEF={},TABS=[{k:'acc',t:'tacc'},{k:'veh',t:'tveh'},{k:'ent',t:'tent'}];
for(const s of (window.HP&&window.HP._s)||[]){
  const sec={id:s[0],name:s[1],tab:s[2],props:s[3]};
  SECTS.push(sec);
  for(const p of sec.props){p.sec=sec.id;p.tab=sec.tab;PDEF[p.id]=p;}
}
function partGeo(q){
  const d=q.d,S=SEG();
  if(q.s==='box')return new THREE.BoxGeometry(d[0],d[1],d[2]);
  if(q.s==='cyl')return d.length===3?new THREE.CylinderGeometry(d[0],d[1],d[2],S.cyl)
                                    :new THREE.CylinderGeometry(d[0],d[0],d[1],S.cyl);
  if(q.s==='sph')return new THREE.SphereGeometry(d[0],S.sph,Math.max(6,S.sph>>1));
  return new THREE.ConeGeometry(d[0],d[1],S.cyl);
}
function partShape(q){
  const d=q.d;
  if(q.s==='box')return new CANNON.Box(new CANNON.Vec3(d[0]/2,d[1]/2,d[2]/2));
  if(q.s==='cyl')return d.length===3?new CANNON.Cylinder(d[0],d[1],d[2],10)
                                    :new CANNON.Cylinder(d[0],d[0],d[1],10);
  if(q.s==='sph')return new CANNON.Sphere(d[0]);
  return new CANNON.Cylinder(Math.max(.02,d[0]*.12),d[0],d[1],10);
}
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_v3=new THREE.Vector3();
function partMatrix(q){
  const p=q.p||[0,0,0],r=q.r||[0,0,0];
  _e.set(r[0]*D2R,r[1]*D2R,r[2]*D2R,'XYZ');_q.setFromEuler(_e);
  return _m4.compose(_v3.set(p[0],p[1],p[2]),_q,new THREE.Vector3(1,1,1)).clone();
}
/* El color del VÉRTICE es el albedo completo de la parte: si la parte declara c: manda ese
   tinte, y si no manda el color base del material (que ahora nace blanco).
   Antes acá había además un convertSRGBToLinear() a mano, pero THREE.Color ya convierte al
   espacio de trabajo al asignar el hex: el tinte se pasaba a lineal DOS veces y encima se
   multiplicaba por el color del material, o sea tres veces. Un gris claro como el del hangar
   (0x8b9299) terminaba casi negro y los mapas se veían de noche a pleno sol. */
/* Brillo medio LINEAL de cada textura generada, medido sobre el archivo .jpg. El tinte de una
   parte se DIVIDE por ese brillo para que el color declarado sea el albedo final.
   Sin esto, t-asphalt (brillo medio 0.089: es una textura muy oscura) multiplicada por un
   gris 0x63676c daba 1 % de reflectancia y las plataformas del mapa Base se dibujaban negras
   a pleno sol. Lo mismo el ladrillo (0.068) y el óxido (0.108). */
const TEXK={grass:4.83,concrete:1.59,brick:14.61,asphalt:11.25,steel:5.14,corrugated:4.70,
  wood:4.34,rust:9.25,water:24.97};
function tintGeo(g,hex,mat){
  const n=g.attributes.position.count,arr=new Float32Array(n*3);
  const d=MDEF[mat||'concrete'];
  const c=new THREE.Color(hex==null?((d&&!d.t)?d.c:0xffffff):hex);
  /* con textura, el tinte se normaliza; sin tinte no se toca nada (queda igual que antes) */
  if(hex!=null&&d&&d.t&&TEXK[d.t]){const k=TEXK[d.t];c.r*=k;c.g*=k;c.b*=k;}
  for(let i=0;i<n;i++){arr[i*3]=c.r;arr[i*3+1]=c.g;arr[i*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(arr,3));return g;
}
function uvScale(g,k){ const uv=g.attributes.uv;if(!uv)return g;
  for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*k,uv.getY(i)*k);}
  uv.needsUpdate=true;return g;}
/* modelos 3D generados para algunos props: reemplazan SÓLO el dibujo
   (la física sigue siendo el compuesto de parts, que es barato y estable) */
const PGLB={};
function glbGroups(def,b){
  const g=PGLB[def.glb];if(!g)return null;
  const root=new THREE.Group();
  const inner=g.scene.clone(true);
  root.add(inner);
  /* el modelo generado puede venir con otro eje "arriba": probamos las 6 orientaciones
     rectas y elegimos la que mejor calza con las proporciones que declaran las parts */
  const ROTS=[[0,0,0],[0,90,0],[0,-90,0],[90,0,0],[90,90,0],[-90,0,0],[-90,90,0],
              [0,0,90],[0,0,-90],[0,90,90]];
  let bestR=null;
  for(const r of ROTS){
    inner.rotation.set(r[0]*D2R,r[1]*D2R,r[2]*D2R);
    inner.updateMatrixWorld(true);
    const bb=new THREE.Box3().setFromObject(inner),s2=new THREE.Vector3();bb.getSize(s2);
    const a=[s2.x,s2.y,s2.z].map(v=>v/Math.max(.001,Math.max(s2.x,s2.y,s2.z)));
    const t=b.size.map(v=>v/Math.max(.001,Math.max.apply(null,b.size)));
    const err=Math.abs(a[0]-t[0])+Math.abs(a[1]-t[1])+Math.abs(a[2]-t[2]);
    if(!bestR||err<bestR.err)bestR={r,err:+err.toFixed(4)};
  }
  const RR=def.grot||bestR.r;
  inner.rotation.set(RR[0]*D2R,RR[1]*D2R,RR[2]*D2R);
  inner.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(inner),sz=new THREE.Vector3(),ctr=new THREE.Vector3();
  box.getSize(sz);box.getCenter(ctr);
  /* estiramos cada eje para llenar exactamente el volumen que declara la física:
     así el modelo generado calza con su collider y no queda flotando ni chico */
  const kx=b.size[0]/Math.max(.001,sz.x),ky=b.size[1]/Math.max(.001,sz.y),
        kz=b.size[2]/Math.max(.001,sz.z);
  root.scale.set(kx,ky,kz);
  root.position.set(-ctr.x*kx,-ctr.y*ky,-ctr.z*kz);
  root.updateMatrixWorld(true);
  const out=[];
  root.traverse(o=>{
    if(!o.isMesh||!o.geometry)return;
    const geo=o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    if(!geo.attributes.color){
      const n=geo.attributes.position.count,arr=new Float32Array(n*3).fill(1);
      geo.setAttribute('color',new THREE.BufferAttribute(arr,3));
    }
    let m=Array.isArray(o.material)?o.material[0]:o.material;
    if(m){ m=m.clone();m.vertexColors=true;
      if(QP.phong&&m.isMeshStandardMaterial)
        m=new THREE.MeshPhongMaterial({map:m.map,color:m.color,vertexColors:true,shininess:22,
          specular:new THREE.Color(0x20242a)});
    }
    out.push({mat:'#glb',geo,m3:m||PMAT.metal});
  });
  return out.length?out:null;
}
function buildDef(def){
  if(def._b)return def._b;
  const byMat={},mats=[];
  let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],mnAll=[1e9,1e9,1e9],mxAll=[-1e9,-1e9,-1e9];
  const geos=[];
  for(const q of def.parts){
    const g=partGeo(q),M=partMatrix(q);
    g.applyMatrix4(M);
    const big=Math.max.apply(null,q.d);
    uvScale(g,Math.max(.35,big/2.2));
    tintGeo(g,q.c,q.m);
    const mn2=new THREE.Box3().setFromBufferAttribute(g.attributes.position);
    for(let i=0;i<3;i++){const a=['x','y','z'][i];
      mnAll[i]=Math.min(mnAll[i],mn2.min[a]);mxAll[i]=Math.max(mxAll[i],mn2.max[a]);
      if(!q.nc){mn[i]=Math.min(mn[i],mn2.min[a]);mx[i]=Math.max(mx[i],mn2.max[a]);}}
    geos.push({g,m:QP.phong&&def._one?def._one:(q.m||'metal'),q});
  }
  if(mn[0]>mx[0]){mn=mnAll.slice();mx=mxAll.slice();}
  const ctr=[(mnAll[0]+mxAll[0])/2,(mnAll[1]+mxAll[1])/2,(mnAll[2]+mxAll[2])/2];
  // recentrar: el cuerpo va al centro del AABB total
  for(const it of geos){ it.g.translate(-ctr[0],-ctr[1],-ctr[2]);
    (byMat[it.m]=byMat[it.m]||[]).push(it.g); }
  const groups=[];
  for(const k in byMat){ const arr=byMat[k];
    const g=arr.length>1?mergeGeometries(arr,false):arr[0];
    if(arr.length>1)arr.forEach(x=>x.dispose());
    g.computeBoundingSphere();groups.push({mat:k,geo:g});mats.push(k); }
  // colisión
  const shapes=[];
  const solid=def.parts.filter(q=>!q.nc);
  const use=(def.col&&def.col!=='auto')?[]:solid;
  if(def.col==='box'||use.length>6||!use.length){
    const sz=[Math.max(.08,mx[0]-mn[0]),Math.max(.08,mx[1]-mn[1]),Math.max(.08,mx[2]-mn[2])];
    const off=[(mn[0]+mx[0])/2-ctr[0],(mn[1]+mx[1])/2-ctr[1],(mn[2]+mx[2])/2-ctr[2]];
    if(def.col==='cyl')shapes.push({s:new CANNON.Cylinder(Math.max(sz[0],sz[2])/2,Math.max(sz[0],sz[2])/2,sz[1],10),o:off,r:[0,0,0]});
    else if(def.col==='sph')shapes.push({s:new CANNON.Sphere(Math.max(sz[0],sz[1],sz[2])/2),o:off,r:[0,0,0]});
    else shapes.push({s:new CANNON.Box(new CANNON.Vec3(sz[0]/2,sz[1]/2,sz[2]/2)),o:off,r:[0,0,0]});
  } else {
    for(const q of use){ const p=q.p||[0,0,0];
      shapes.push({s:partShape(q),o:[p[0]-ctr[0],p[1]-ctr[1],p[2]-ctr[2]],r:q.r||[0,0,0]}); }
  }
  if(def.glb&&PGLB[def.glb]){
    const gg=glbGroups(def,{size:[mxAll[0]-mnAll[0],mxAll[1]-mnAll[1],mxAll[2]-mnAll[2]]});
    if(gg){ for(const g of groups)g.geo.dispose(); groups.length=0;
      for(const g of gg)groups.push(g); }
  }
  def._b={groups,mats,shapes,
    size:[mxAll[0]-mnAll[0],mxAll[1]-mnAll[1],mxAll[2]-mnAll[2]],
    dy:ctr[1]-mnAll[1],   // cuánto hay que subir el centro para apoyar la base en el piso
    ctr};
  return def._b;
}

/* ---- pools de InstancedMesh: así entran miles de props con pocos draw calls ---- */
const POOLS={};
class Pool{
  constructor(def){ this.def=def;this.b=buildDef(def);this.cap=0;this.rec=[];this.next=0;
    this.used=0;this.top=0;this.im=[];this.dirty=false;this.grow(16); }
  grow(cap){
    const old=this.im;this.im=[];
    for(const g of this.b.groups){
      const im=new THREE.InstancedMesh(g.geo,g.m3||PMAT[g.mat]||PMAT.metal,cap);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow=QP.shadow>0;im.receiveShadow=QP.shadow>0;
      im.frustumCulled=false;im.count=this.top;im.userData.pool=this;
      scene.add(im);this.im.push(im); }
    for(let i=0;i<old.length;i++){ const o=old[i],n=this.im[i];
      if(o){ n.instanceMatrix.array.set(o.instanceMatrix.array.subarray(0,Math.min(o.geometry?o.count:0,cap)*16));
        scene.remove(o);o.dispose(); } }
    for(let i=this.cap;i<cap;i++)this.hideSlot(i);
    this.cap=cap;this.dirty=true;
  }
  hideSlot(i){ _m4.makeScale(0,0,0);for(const im of this.im)if(i<im.instanceMatrix.count)im.setMatrixAt(i,_m4); }
  /* sólo se dibuja hasta el slot más alto en uso: un prop = 1 instancia, no 16 */
  alloc(){
    let i;
    if(this.rec.length)i=this.rec.pop();
    else { i=this.next++; if(i>=this.cap)this.grow(Math.min(9999,Math.max(this.cap*2,i+1))); }
    if(i+1>this.top){this.top=i+1;for(const im of this.im)im.count=this.top;}
    this.used++;return i;
  }
  release(i){
    this.hideSlot(i);this.rec.push(i);this.used--;this.dirty=true;
    if(!this.used){this.top=0;this.next=0;this.rec.length=0;
      for(const im of this.im)im.count=0;}
  }
  setMatrix(i,m){ for(const im of this.im)im.setMatrixAt(i,m);this.dirty=true; }
  flush(){ if(!this.dirty)return;for(const im of this.im)im.instanceMatrix.needsUpdate=true;
    this.dirty=false; }
}
const poolOf=def=>POOLS[def.id]||(POOLS[def.id]=new Pool(def));

/* ================= props vivos ================= */
const PROPS=[];const CONSTR=[];
let propSeq=0;
/* lista de props ACTIVOS (no congelados): los bucles por frame recorren sólo estos,
   así el mundo puede tener miles de props sin que el frame los toque todos */
let ACT=[],actDirty=true;
const touchAct=()=>{actDirty=true;};
function actives(){ if(actDirty){ACT=PROPS.filter(p=>!p.frozen);actDirty=false;} return ACT; }
const maxProps=()=>SV.maxProps||QP.maxProps;
function spawnProp(id,pos,quat,opt){
  const def=PDEF[id];if(!def)return null;
  if(PROPS.length>=maxProps()){toast(T('tMax'));return null;}
  const b=buildDef(def),pool=poolOf(def);
  const slot=pool.alloc();
  const body=new CANNON.Body({mass:def.mass,material:MAT.prop,
    linearDamping:.02,angularDamping:.08,allowSleep:true,sleepSpeedLimit:.14,sleepTimeLimit:.7});
  for(const s of b.shapes){
    const o=new CANNON.Vec3(s.o[0],s.o[1],s.o[2]);
    const qq=new CANNON.Quaternion();
    if(s.r&&(s.r[0]||s.r[1]||s.r[2]))qq.setFromEuler(s.r[0]*D2R,s.r[1]*D2R,s.r[2]*D2R,'XYZ');
    body.addShape(s.s,o,qq); }
  body.position.set(pos.x,pos.y+(opt&&opt.raw?0:b.dy),pos.z);
  if(quat)body.quaternion.copy(quat);
  world.addBody(body);
  const p={id:def.id,def,pool,slot,body,frozen:false,mass:def.mass,seq:++propSeq,auto:false};
  body.userData={prop:p};
  PROPS.push(p);syncMat(p);touchAct();
  if(opt&&opt.frozen)freezeProp(p,true);
  budget();
  return p;
}
const _mm=new THREE.Matrix4(),_qq=new THREE.Quaternion(),_pp=new THREE.Vector3(),_s1=new THREE.Vector3(1,1,1);
function syncMat(p){
  _pp.set(p.body.position.x,p.body.position.y,p.body.position.z);
  _qq.set(p.body.quaternion.x,p.body.quaternion.y,p.body.quaternion.z,p.body.quaternion.w);
  p.pool.setMatrix(p.slot,_mm.compose(_pp,_qq,_s1));
}
function removeProp(p){
  const i=PROPS.indexOf(p);if(i<0)return;
  for(let j=CONSTR.length-1;j>=0;j--)if(CONSTR[j].a===p||CONSTR[j].b===p){
    world.removeConstraint(CONSTR[j].c);CONSTR.splice(j,1);}
  world.removeBody(p.body);p.pool.release(p.slot);PROPS.splice(i,1);touchAct();
}
function clearAll(){ while(PROPS.length)removeProp(PROPS[PROPS.length-1]); }
function freezeProp(p,on){
  p.frozen=!!on;p.auto=false;touchAct();
  p.body.type=on?CANNON.Body.STATIC:CANNON.Body.DYNAMIC;
  p.body.mass=on?0:p.mass;p.body.updateMassProperties();
  if(!on){p.body.wakeUp();}else{p.body.velocity.set(0,0,0);p.body.angularVelocity.set(0,0,0);}
  syncMat(p);
}
function unfreezeAll(){ let n=0;for(const p of PROPS)if(p.frozen){freezeProp(p,false);n++;}return n; }
/* auto-congelado: mantiene la simulación acotada aunque haya miles de props */
function budget(){
  const lim=QP.awake;
  let awake=0;const cand=[];
  for(const p of PROPS){ if(p.frozen)continue;awake++;
    if(!p.manual)cand.push(p); }
  if(awake<=lim)return;
  cand.sort((a,b)=>a.seq-b.seq);
  let n=awake-lim;
  for(const p of cand){ if(n<=0)break;
    if(p.body.sleepState===CANNON.Body.SLEEPING||p.body.velocity.lengthSquared()<.02){
      freezeProp(p,true);p.auto=true;n--; } }
  if(n>0)for(const p of cand){ if(n<=0)break;if(!p.frozen){freezeProp(p,true);p.auto=true;n--;} }
}
function distFreeze(px,pz){
  const d2=QP.freezeDist*QP.freezeDist;
  for(const p of PROPS){
    const dx=p.body.position.x-px,dz=p.body.position.z-pz,dd=dx*dx+dz*dz;
    if(!p.frozen&&dd>d2){freezeProp(p,true);p.auto=true;}
    else if(p.frozen&&p.auto&&dd<d2*.7){freezeProp(p,false);p.auto=false;}
  }
}

/* ================= mapas ================= */
const MAPS=[];
for(const m of (window.HP&&window.HP._m)||[])MAPS.push({id:m[0],name:m[1],def:m[2]});
let mapGroup=new THREE.Group(),mapBodies=[],CURMAP=null,WATER=[];
function buildMap(id){
  const M=MAPS.find(m=>m.id===id)||MAPS[0];if(!M)return;
  CURMAP=M;
  for(const b of mapBodies)world.removeBody(b);mapBodies=[];
  scene.remove(mapGroup);
  mapGroup.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});
  mapGroup=new THREE.Group();scene.add(mapGroup);
  WATER=[];
  const d=M.def;
  const S=d.size;
  scene.fog=new THREE.Fog(d.fogColor==null?0xc4d2dc:d.fogColor,
    d.fogNear==null?140:d.fogNear,Math.min(QP.far*.98,d.fogFar==null?560:d.fogFar));
  scene.background=new THREE.Color(d.fogColor==null?0xc4d2dc:d.fogColor);
  if(d.sun)sun.position.set(d.sun[0],d.sun[1],d.sun[2]);
  hemi.intensity=d.amb==null?.6:d.amb;
  // piso base
  addStatic({s:'box',d:[S*2,2,S*2],p:[0,-1,0],m:d.ground||'grass'},true);
  // muro perimetral
  const wh=d.wall||0;
  if(wh>0){ const t=1.5;
    for(const q of [[S*2+t*2,wh,t,0,wh/2,-S-t/2],[S*2+t*2,wh,t,0,wh/2,S+t/2],
                    [t,wh,S*2,-S-t/2,wh/2,0],[t,wh,S*2,S+t/2,wh/2,0]])
      addStatic({s:'box',d:[q[0],q[1],q[2]],p:[q[3],q[4],q[5]],m:'concrete'},true); }
  // partes
  const byMat={};
  for(const q of d.parts){
    const g=partGeo(q);g.applyMatrix4(partMatrix(q));
    uvScale(g,Math.max(.4,Math.max.apply(null,q.d)/2.2));tintGeo(g,q.c,q.m);
    (byMat[q.m||'concrete']=byMat[q.m||'concrete']||[]).push(g);
    if(!q.nc)addBody(q);
  }
  for(const k in byMat){ const arr=byMat[k];
    const g=arr.length>1?mergeGeometries(arr,false):arr[0];
    if(arr.length>1)arr.forEach(x=>x.dispose());
    const me=new THREE.Mesh(g,PMAT[k]||PMAT.concrete);
    me.castShadow=QP.shadow>0;me.receiveShadow=true;me.frustumCulled=false;
    mapGroup.add(me); }
  // agua
  for(const w of (d.water||[])){
    WATER.push({x:w.p[0],y:w.p[1],z:w.p[2],w:w.d[0],h:w.d[1],dp:w.d[2],top:w.p[1]+w.d[1]/2});
    const g=new THREE.PlaneGeometry(w.d[0],w.d[2]);g.rotateX(-Math.PI/2);
    uvScale(g,Math.max(w.d[0],w.d[2])/6);tintGeo(g,0xbfe4e8);
    const mw=new THREE.Mesh(g,waterMat());
    mw.position.set(w.p[0],w.p[1]+w.d[1]/2,w.p[2]);mw.renderOrder=2;
    mapGroup.add(mw);
    // fondo y paredes de la pileta para que no se vea el vacío
    addStatic({s:'box',d:[w.d[0],.6,w.d[2]],p:[w.p[0],w.p[1]-w.d[1]/2-.3,w.p[2]],m:'concrete'},true);
  }
  buildSky(d.sky);
  camera.far=QP.far;camera.updateProjectionMatrix();
}
function addBody(q){
  const p=q.p||[0,0,0],r=q.r||[0,0,0];
  const b=new CANNON.Body({mass:0,material:MAT.world});
  b.addShape(partShape(q));
  b.userData={m:q.m||'concrete'};    // material real del piso/parte, para el sonido de paso (core_n)
  b.position.set(p[0],p[1],p[2]);
  if(r[0]||r[1]||r[2])b.quaternion.setFromEuler(r[0]*D2R,r[1]*D2R,r[2]*D2R,'XYZ');
  world.addBody(b);mapBodies.push(b);return b;
}
function addStatic(q,withMesh){
  addBody(q);
  if(withMesh){ const g=partGeo(q);g.applyMatrix4(partMatrix(q));
    uvScale(g,Math.max(.4,Math.max.apply(null,q.d)/2.4));tintGeo(g,q.c,q.m);
    const me=new THREE.Mesh(g,PMAT[q.m]||PMAT.concrete);
    me.receiveShadow=true;me.frustumCulled=false;mapGroup.add(me); }
}
let _wm=null;
function waterMat(){
  if(_wm)return _wm;
  _wm=new THREE.MeshPhongMaterial({color:0x2f6f78,transparent:true,opacity:.82,
    shininess:70,specular:new THREE.Color(0x9fd8e0),vertexColors:true,
    depthWrite:false,side:THREE.DoubleSide});
  if(TEX.water){_wm.map=TEX.water;_wm.color.setScalar(1);}
  return _wm;
}
let skyMesh=null;
function buildSky(kind){
  if(skyMesh){scene.remove(skyMesh);skyMesh.geometry.dispose();skyMesh=null;}
  const R=Math.min(QP.far*.93,1600);
  const g=new THREE.SphereGeometry(R,22,14);
  const m=new THREE.MeshBasicMaterial({side:THREE.BackSide,fog:false,color:0xa9c6dd});
  if(kind!=='plain'&&TEX.sky){ m.map=TEX.sky;m.color.setScalar(1);
    TEX.sky.wrapS=THREE.MirroredRepeatWrapping;TEX.sky.repeat.set(3,1); }
  skyMesh=new THREE.Mesh(g,m);skyMesh.frustumCulled=false;scene.add(skyMesh);
}

/* ================= miniaturas (menú de spawn) ================= */
const thumbScene=new THREE.Scene();
thumbScene.add(new THREE.HemisphereLight(0xffffff,0x555a60,1.15));
const tsun=new THREE.DirectionalLight(0xffffff,1.5);tsun.position.set(3,5,4);thumbScene.add(tsun);
let thumbRT=null,thumbQ=[],thumbBusy=false;
function thumbTarget(){ if(!thumbRT)thumbRT=new THREE.WebGLRenderTarget(128,96,
  {colorSpace:THREE.SRGBColorSpace}); return thumbRT; }
function drawThumb(def,cv){
  const b=buildDef(def);
  const g=new THREE.Group();
  for(const gr of b.groups)g.add(new THREE.Mesh(gr.geo,PMAT[gr.mat]||PMAT.metal));
  thumbScene.add(g);
  const rad=Math.max(.35,Math.hypot(b.size[0],b.size[1],b.size[2])/2);
  const dist=rad/Math.tan(thumbCam.fov*D2R/2)*1.25;
  thumbCam.aspect=128/96;thumbCam.updateProjectionMatrix();
  thumbCam.position.set(dist*.62,dist*.55,dist*.72);thumbCam.lookAt(0,0,0);
  const rt=thumbTarget(),old=renderer.getRenderTarget();
  const ocs=scene.background;
  renderer.setRenderTarget(rt);renderer.setClearColor(0x2f353c,0);renderer.clear();
  renderer.render(thumbScene,thumbCam);
  const px=new Uint8Array(128*96*4);
  renderer.readRenderTargetPixels(rt,0,0,128,96,px);
  renderer.setRenderTarget(old);
  thumbScene.remove(g);
  const ctx=cv.getContext('2d'),img=ctx.createImageData(128,96);
  for(let y=0;y<96;y++){const s=(95-y)*128*4,d0=y*128*4;
    for(let x=0;x<128*4;x++)img.data[d0+x]=px[s+x];}
  cv.width=128;cv.height=96;ctx.putImageData(img,0,0);
  return true;
}
function queueThumb(def,cv){ thumbQ.push({def,cv}); }
function stepThumbs(){ if(!thumbQ.length)return;
  const it=thumbQ.shift();try{drawThumb(it.def,it.cv);}catch(e){} }

/* ================= toast / hud helpers ================= */
function toast(t){ const e=$('toast');if(!e)return;e.innerHTML=t;e.style.opacity=1;
  clearTimeout(toast._t);toast._t=setTimeout(()=>e.style.opacity=0,1800); }
