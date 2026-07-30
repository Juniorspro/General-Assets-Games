/* ============================================================================
   CRUZA CALLE — saltar de fila en fila esquivando autos, trenes y el río
   ----------------------------------------------------------------------------
   VERTICAL de verdad (GAME.portrait): el escenario es una columna 9:16 y la
   cámara es ORTOGRÁFICA a 54° sobre el horizonte, sin giro en Y. El mundo se
   genera por FILAS al infinito (pasto, ruta, vías, río) y se recicla.
   Lo que hay que saber para tocar este archivo:
     · El ENCUADRE se define por el ANCHO (7,3 columnas). El alto sale del
       aspecto, y de ahí se calculan cuántas filas se ven (hU/sin(54°)); AHEAD y
       BEHIND se derivan de ese número, así el borde del mundo NUNCA entra en
       cuadro (bug medido: a 26° se veían 34 filas y abajo aparecía el celeste).
     · El mundo juega en XMIN..XMAX = −3..3 (7 columnas, justo lo que mide el
       cuadro: el bicho NUNCA se sale de pantalla) y el suelo se dibuja 25
       unidades de ancho, así siempre hay pasto/asfalto más allá del cuadro.
     · Personajes: CHARS es una lista de CAJAS (w,h,d,color,x,y,z). De la misma
       lista sale el grupo 3D y la silueta 2D del selector, así no hay dos
       fuentes de verdad. Si hay GLB para el personaje, se usa el GLB.
     · El águila es un bicho VISIBLE: avisa 2,6 s volando arriba con su sombra,
       después baja, te agarra y te levanta.
     · Los troncos no te matan sin aviso: al acercarte a la orilla salta el aviso
       y el jugador queda CLAVADO al borde 1,4 s antes de ahogarse.
   ========================================================================== */
const G={
  slug:'cruza',name:'CRUZA CALLE',
  title:'CRUZA <em>CALLE</em>',
  sub:'Cruzá rutas, vías y ríos saltando de a una celda.',
  subKey:'sub',
  acc:'#ffd166',acc2:'#f0913a',levels:0,
  three:true,sky:'#8fd3ff',shadows:false,portrait:true,
  art:A('art-cruza.jpg'),music:A('mus-cruza.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),
       boom:A('sfx-boom.mp3'),splat:A('sfx-splat.mp3'),power:A('sfx-power.mp3'),click:A('sfx-click.mp3'),
       aguila:A('sfx-cruza-aguila.mp3'),cluck:A('sfx-cruza-cluck.mp3')},
  glb:{pollo:A('m-cruza-pollo.glb'),aguila:A('m-cruza-aguila.glb'),auto:A('m-cruza-auto.glb')},
  i18n:{
    es:{sub:'Cruzá rutas, vías y ríos saltando de a una celda. Tocá para avanzar, deslizá para los costados. Si te quedás atrás, baja el águila.',
      rowsN:'FILAS',coins:'MONEDAS',tapHop:'TOCÁ PARA SALTAR',swipeSide:'deslizá para los costados',
      pick:'ELEGÍ TU PERSONAJE',close:'CERRAR',
      cPollo:'POLLO',cSapo:'SAPO',cRobot:'ROBOT',
      eagleWarn:'¡EL ÁGUILA!',eagleSub:'avanzá o te levanta',edgeWarn:'¡VOLVÉ AL CENTRO!',
      dCar:'¡APLASTADO!',dWater:'¡AL AGUA!',dTrain:'¡ARROLLADO!',dEagle:'¡TE LLEVÓ EL ÁGUILA!',
      statRows:'Filas',statCoins:'Monedas',statBest:'Récord',newBest:'¡NUEVO RÉCORD!'},
    en:{sub:'Cross roads, rails and rivers one cell at a time. Tap to hop forward, swipe to move sideways. Fall behind and the eagle swoops in.',
      rowsN:'ROWS',coins:'COINS',tapHop:'TAP TO HOP',swipeSide:'swipe to move sideways',
      pick:'PICK YOUR CHARACTER',close:'CLOSE',
      cPollo:'CHICKEN',cSapo:'FROG',cRobot:'ROBOT',
      eagleWarn:'THE EAGLE!',eagleSub:'move on or it grabs you',edgeWarn:'GET BACK!',
      dCar:'SPLAT!',dWater:'SPLASH!',dTrain:'RUN OVER!',dEagle:'THE EAGLE GOT YOU!',
      statRows:'Rows',statCoins:'Coins',statBest:'Best',newBest:'NEW BEST!'},
    pt:{sub:'Atravesse ruas, trilhos e rios pulando de célula em célula. Toque para avançar, arraste para os lados. Se ficar atrás, a águia desce.',
      rowsN:'FILEIRAS',coins:'MOEDAS',tapHop:'TOQUE PARA PULAR',swipeSide:'arraste para os lados',
      pick:'ESCOLHA SEU PERSONAGEM',close:'FECHAR',
      cPollo:'GALINHA',cSapo:'SAPO',cRobot:'ROBÔ',
      eagleWarn:'A ÁGUIA!',eagleSub:'avance ou ela te leva',edgeWarn:'VOLTE PARA O CENTRO!',
      dCar:'ATROPELADO!',dWater:'NA ÁGUA!',dTrain:'ATROPELADO PELO TREM!',dEagle:'A ÁGUIA TE PEGOU!',
      statRows:'Fileiras',statCoins:'Moedas',statBest:'Recorde',newBest:'NOVO RECORDE!'}
  }
};
/* OJO: el shell ya declara `const T=ARC.T` en este mismo ámbito de módulo.
   Redeclararlo acá tira "Identifier 'T' has already been declared" y el juego
   entero no arranca (medido: ARC quedaba undefined). Se usa el T del shell. */
let T3,scene,cam,sun,plr,plrG,shadow;
const ROWS=new Map();            /* z -> fila viva */
const XMIN=-3,XMAX=3;            /* 7 columnas: el ancho del cuadro es 7,3 -> el
                                    jugador NUNCA se sale de pantalla y no hace
                                    falta que la cámara viaje en X */
const GNDW=(XMAX-XMIN+1)+18;     /* ancho del suelo: siempre más allá del cuadro */
const ELEV=54*Math.PI/180,SE=Math.sin(ELEV),CE=Math.cos(ELEV),CAMD=36;
let AHEAD=22,BEHIND=8,ROWSVIS=20,CAMW=7.3,CAMH=16,AIM=5;
let px=0,pz=0,hop=null,dead=false,score=0,coins=0,idleT=0,camZ=0,camX=0,farZ=1;
let overT=-1,dieKind='',lastDie='';
let eagle=null,eagleG=null,eagleSh=null,wingL=null,wingR=null;
let edgeW=0,drownT=-1,frozen=false,picker=false,pickFrom=0;
let carSh=[],shOn=1,partK=1,fogK=1,decoK=1,CARGLB=false;
const PSC=1.3;         /* el bicho ocupa casi una celda: con 1,14 era una manchita */
const MAT={},MATB={},GEO={};
function mat(c){if(MAT[c])return MAT[c];return MAT[c]=new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function matB(c){if(MATB[c])return MATB[c];return MATB[c]=new T3.MeshBasicMaterial({color:new T3.Color(c)});}
function coinGeo(r){const k='c'+r;if(GEO[k])return GEO[k];
  return GEO[k]=new T3.CylinderGeometry(r,r,.07,14);}
function box(w,h,d){const k=w+'_'+h+'_'+d;if(GEO[k])return GEO[k];return GEO[k]=new T3.BoxGeometry(w,h,d);}
function m(w,h,d,c,x,y,z,parent,basic){
  const o=new T3.Mesh(box(w,h,d),basic?matB(c):mat(c));
  o.position.set(x,y,z);(parent||scene).add(o);return o;
}
/* ------------------------------------------------------------- PERSONAJES
   Una sola lista de cajas por bicho: de ahí sale el grupo 3D y la silueta 2D
   del selector (misma silueta, cero riesgo de que se desincronicen). */
const CHARS=[
  {id:'pollo',key:'cPollo',icon:'🐔',glb:'pollo',glbRot:Math.PI,
   b:[[.72,.6,.62,'#f7f7fa',0,.42,0],[.5,.42,.44,'#ffffff',0,.86,-.02],
      [.2,.16,.24,'#f6a13a',0,.84,-.3],[.16,.2,.14,'#e0503f',0,1.12,.02],
      [.12,.12,.12,'#111418',.17,.95,-.27],[.12,.12,.12,'#111418',-.17,.95,-.27],
      [.1,.3,.4,'#e6e6ee',.4,.5,.02],[.1,.3,.4,'#e6e6ee',-.4,.5,.02],
      [.3,.26,.18,'#ffffff',0,.68,.36],
      [.14,.3,.14,'#f6a13a',.16,.15,.05],[.14,.3,.14,'#f6a13a',-.16,.15,.05]]},
  {id:'sapo',key:'cSapo',icon:'🐸',
   b:[[.86,.44,.7,'#45b558',0,.3,0],[.62,.14,.5,'#e9f5c9',0,.16,.02],
      [.66,.3,.5,'#4fc463',0,.62,-.1],
      [.22,.22,.22,'#ffffff',.2,.82,-.2],[.22,.22,.22,'#ffffff',-.2,.82,-.2],
      [.11,.11,.1,'#111418',.2,.84,-.32],[.11,.11,.1,'#111418',-.2,.84,-.32],
      [.5,.07,.07,'#2a7d3a',0,.48,-.35],
      [.18,.07,.18,'#2f8f45',.22,.52,.18],[.18,.07,.18,'#2f8f45',-.24,.5,.06],
      [.2,.2,.34,'#3aa14d',.44,.12,.22],[.2,.2,.34,'#3aa14d',-.44,.12,.22],
      [.26,.14,.3,'#3aa14d',.3,.07,-.28],[.26,.14,.3,'#3aa14d',-.3,.07,-.28]]},
  {id:'robot',key:'cRobot',icon:'🤖',
   b:[[.66,.6,.5,'#9fb4c9',0,.46,0],[.24,.2,.07,'#ff7a3a',0,.5,-.27],
      [.52,.4,.44,'#c3d2e0',0,.94,0],[.44,.16,.07,'#39d7ff',0,.98,-.24],
      [.06,.22,.06,'#6b7b8c',0,1.22,0],[.15,.15,.15,'#ff3b3b',0,1.37,0],
      [.14,.42,.16,'#7f93a6',.42,.5,0],[.14,.42,.16,'#7f93a6',-.42,.5,0],
      [.2,.32,.24,'#6b7b8c',.18,.16,0],[.2,.32,.24,'#6b7b8c',-.18,.16,0],
      [.26,.12,.34,'#39516b',.18,.06,-.04],[.26,.12,.34,'#39516b',-.18,.06,-.04]]}
];
function charIdx(){const i=CHARS.findIndex(c=>c.id===ARC.S.char);return i<0?0:i;}
/* GLB: se normaliza a la altura pedida, centrado en x/z y apoyado en y=0 */
function glbTris(o){let n=0;o.traverse(k=>{if(k.isMesh&&k.geometry){
  const g=k.geometry;n+=(g.index?g.index.count:(g.attributes.position?g.attributes.position.count:0))/3;}});
  return Math.round(n);}
function glbNode(key,targetH,rotY){
  const S=ARC.glb&&ARC.glb[key];
  if(!S||!S.scene)return null;
  try{
    const o=S.scene.clone(true);
    const bb=new T3.Box3().setFromObject(o),sz=new T3.Vector3(),c=new T3.Vector3();
    bb.getSize(sz);bb.getCenter(c);
    if(!(sz.y>.0001))return null;
    const s=targetH/sz.y;
    o.scale.setScalar(s);
    o.position.set(-c.x*s,-bb.min.y*s,-c.z*s);
    o.traverse(k=>{if(k.isMesh){k.castShadow=false;k.receiveShadow=false;
      if(k.material&&k.material.side!==undefined)k.material.side=T3.FrontSide;}});
    const w=new T3.Group();w.add(o);w.rotation.y=rotY||0;
    return w;
  }catch(e){console.warn('glb '+key,e);return null;}
}
function buildBoxes(list,parent){for(const b of list)m(b[0],b[1],b[2],b[3],b[4],b[5],b[6],parent);}
function makePlayer(){
  if(plrG){scene.remove(plrG);}
  plrG=new T3.Group();plr=new T3.Group();plrG.add(plr);
  const C=CHARS[charIdx()];
  let node=C.glb?glbNode(C.glb,1.45,C.glbRot):null;
  if(node){plr.add(node);plr.userData.glb=1;}
  else{buildBoxes(C.b,plr);plr.scale.setScalar(PSC);}
  scene.add(plrG);
  if(!shadow){
    shadow=new T3.Mesh(new T3.CircleGeometry(.5,18),
      new T3.MeshBasicMaterial({color:0x0b2a12,transparent:true,opacity:.34}));
    shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  }
}
/* ------------------------------------------------------------------ ÁGUILA */
function makeEagle(){
  eagleG=new T3.Group();
  const node=glbNode('aguila',2.0,Math.PI);
  if(node){eagleG.add(node);eagleG.userData.glb=1;}
  else{
    const b=new T3.Group();
    m(.6,.42,1.5,'#5b3d22',0,0,0,b);            /* cuerpo */
    m(.44,.4,.4,'#f2ede2',0,.16,-.82,b);        /* cabeza */
    m(.2,.16,.34,'#f6c343',0,.08,-1.12,b);      /* pico */
    m(.1,.1,.1,'#111418',.14,.2,-.96,b);
    m(.1,.1,.1,'#111418',-.14,.2,-.96,b);
    m(.7,.1,.5,'#6b4a2a',0,-.02,.86,b);         /* cola */
    m(.16,.2,.16,'#f6c343',.18,-.28,-.3,b);     /* garras */
    m(.16,.2,.16,'#f6c343',-.18,-.28,-.3,b);
    wingL=new T3.Group();wingR=new T3.Group();
    m(1.5,.12,.8,'#7a5330',.78,0,0,wingL);
    m(.9,.1,.5,'#4a3120',1.3,-.02,.24,wingL);
    m(1.5,.12,.8,'#7a5330',-.78,0,0,wingR);
    m(.9,.1,.5,'#4a3120',-1.3,-.02,.24,wingR);
    b.add(wingL);b.add(wingR);
    eagleG.add(b);
  }
  eagleG.visible=false;scene.add(eagleG);
  eagleSh=new T3.Mesh(new T3.CircleGeometry(1,20),
    new T3.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.2}));
  eagleSh.rotation.x=-Math.PI/2;eagleSh.visible=false;scene.add(eagleSh);
}
function spawnEagle(){
  if(eagle)return;
  eagle={ph:'warn',t:0,x:px,y:9.5,z:pz-1.6};
  eagleG.visible=true;eagleSh.visible=!!shOn;
  ARC.sfx('aguila',{vol:.9});
  ARC.toast(T('eagleWarn')+' — '+T('eagleSub'),1500);
  ARC.vib([12,60,12]);
}
function stepEagle(dt){
  if(!eagle)return;
  const e=eagle;e.t+=dt;
  const behind=score-pz;
  if(e.ph==='warn'){
    e.x=lerp(e.x,px,1-Math.pow(.02,dt));
    e.z=lerp(e.z,pz-1.6,1-Math.pow(.02,dt));
    e.y=9.5+Math.sin(ARC.t*2.2)*.6;
    if(behind<=1.2&&idleT<6){e.ph='away';e.t=0;}
    else if(e.t>2.6||behind>5.4||idleT>13){e.ph='dive';e.t=0;ARC.sfx('aguila',{rate:1.15});}
  }else if(e.ph==='dive'){
    e.x=lerp(e.x,px,1-Math.pow(.001,dt));
    e.z=lerp(e.z,pz-.35,1-Math.pow(.001,dt));
    e.y=lerp(e.y,.55,1-Math.pow(.004,dt));
    if(e.y<1.5&&!dead){die('eagle');e.ph='lift';e.t=0;}
  }else if(e.ph==='lift'){
    e.y+=(3.2+e.t*7)*dt;e.z-=1.6*dt;
    plrG.position.set(e.x,e.y-.75,-e.z);
    plr.rotation.z=Math.sin(ARC.t*14)*.25;
  }else{                                    /* away: se va sin llevarte */
    e.y+=7*dt;e.z-=3*dt;
    if(e.y>18){eagle=null;eagleG.visible=false;eagleSh.visible=false;return;}
  }
  eagleG.position.set(e.x,e.y,-e.z);
  const fl=Math.sin(ARC.t*(e.ph==='dive'?16:8));
  if(wingL){wingL.rotation.z=fl*.5;wingR.rotation.z=-fl*.5;}
  else if(eagleG.userData.glb)eagleG.rotation.z=fl*.12;
  eagleG.rotation.x=e.ph==='dive'?-.55:-.12;   /* nariz abajo al picar */
  if(eagleSh.visible){
    const k=clamp(1-e.y/11,.15,1);
    eagleSh.position.set(e.x,.03,-e.z);
    eagleSh.scale.setScalar(.55+k*.9);
    eagleSh.material.opacity=.10+k*.26;
  }
}
/* ------------------------------------------------------------------- MUNDO */
function rowType(z){
  if(z<4)return 'grass';
  const d=Math.min(1,z/260);
  const a=(ROWS.get(z-1)||{}).type,b=(ROWS.get(z-2)||{}).type;
  const r=Math.random();
  let t=r<.30-d*.13?'grass':(r<.74-d*.05?'road':(r<.89?'water':'rail'));
  if(t==='rail'&&z<14)t='road';                    /* el tren no aparece de entrada */
  if(t==='water'&&z<9)t='grass';
  if(t!=='grass'&&t===a&&t===b)t='grass';          /* nunca 3 peligros iguales seguidos */
  if(t==='water'&&a==='water'&&z<22)t='grass';     /* río doble sólo más adelante */
  if(t==='rail'&&a==='rail')t='grass';
  return t;
}
/* ADORNO: matas y flores PLANAS en las celdas libres del pasto. Van adentro del
   cuadro (afuera de las 7 columnas no se ve nada: el cuadro mide 7,3 de ancho) y
   NO estorban: la cantidad la manda el nivel de gráficos y la dificultad no
   cambia ni un poco entre Bajo y Ultra. */
const FLOW=['#ffe066','#ff8fab','#ffffff','#c3f584'];
function deco(R,g){
  if(R.type!=='grass')return;
  const n=Math.round(4*decoK);
  for(let i=0;i<n;i++){
    const x=rndi(XMIN,XMAX);
    if(R.block.has(x)||x===R.coin)continue;
    const ox=x+rnd(-.32,.32),oz=rnd(-.34,.34);
    m(.16,.05,.16,'#5fae45',ox,.02,oz,g);
    if(Math.random()<.5)m(.09,.09,.09,pick(FLOW),ox,.11,oz,g,true);
  }
}
function carShadow(g,L){
  const s=new T3.Mesh(box(L*1.05,.02,1.02),matB('#1d2228'));
  s.position.set(0,.03,.06);s.visible=!!shOn;g.add(s);carSh.push(s);return s;
}
function buildRow(z){
  if(ROWS.has(z))return;
  const type=z<4?'grass':rowType(z);
  const R={type,z,objs:[],cars:[],logs:[],block:new Set(),coin:-99,coinM:null,
    dir:Math.random()<.5?1:-1,speed:0,gap:0,trainT:rnd(4,9),trainOn:0};
  const g=new T3.Group();g.position.z=-z;scene.add(g);R.g=g;
  if(type==='grass'){
    m(GNDW,.5,1,z%2?'#7fc95c':'#74bf53',0,-.25,0,g);
    const n=z<4?0:rndi(0,3);
    for(let i=0;i<n;i++){
      const x=rndi(XMIN,XMAX);
      if(R.block.has(x)||(x===0&&z<7))continue;
      R.block.add(x);
      if(Math.random()<.7){
        m(.55,.7,.55,'#6b4b2a',x,.35,0,g);
        const h=rnd(.9,1.7);
        m(.95,h,.95,Math.random()<.5?'#2f8f4e':'#27803f',x,.7+h/2,0,g);
      }else m(.8,.6,.8,'#9aa3ad',x,.3,0,g);
    }
  }else if(type==='road'){
    m(GNDW,.5,1,'#3c4148',0,-.25,0,g);
    m(GNDW,.02,.08,'#e9edf2',0,.01,0,g);
    R.speed=rnd(1.9,3.6)*(1+Math.min(.85,z/340));
    R.gap=rnd(7.5,13);
    const n=Math.ceil(GNDW/R.gap)+1;
    const col=pick(['#e0503f','#2f6df6','#f6c343','#8b5cf6','#16a34a','#ff7ab8']);
    const long=Math.random()<.16,useGlb=!long&&CARGLB&&Math.random()<.4;
    for(let i=0;i<n;i++){
      const cg=new T3.Group();
      const L=long?3.1:1.9;
      const node=useGlb?glbNode('auto',.95,R.dir>0?Math.PI:0):null;
      if(node){node.position.y=0;cg.add(node);}
      else{
        m(L,.55,.95,col,0,.42,0,cg);
        m(L*.52,.34,.9,'#dbe6f2',long?-L*.18:.05,.82,0,cg);
        m(.22,.22,1.02,'#111418',L/2-.18,.2,0,cg);
        m(.22,.22,1.02,'#111418',-L/2+.18,.2,0,cg);
        m(.16,.16,.06,'#fff3b0',R.dir>0?L/2:-L/2,.45,.3,cg);
      }
      carShadow(cg,L);
      cg.position.set(XMIN-9+i*R.gap+rnd(0,1.5),0,0);
      g.add(cg);R.cars.push({g:cg,len:L});
    }
  }else if(type==='water'){
    m(GNDW,.42,1,'#1c69bd',0,-.29,0,g);
    m(GNDW,.02,.86,'#3f92e0',0,-.07,0,g);
    R.speed=rnd(.85,1.75);
    R.gap=rnd(5,7);
    const n=Math.ceil(GNDW/R.gap)+1;
    for(let i=0;i<n;i++){
      const L=rndi(2,3),lg=new T3.Group();
      m(L,.42,.84,'#7c4f2c',0,.05,0,lg);
      m(L-.14,.06,.84,'#a06d3f',0,.27,0,lg);
      m(L,.02,.1,'#5d3a1e',0,.31,-.2,lg);          /* vetas: el tronco se lee */
      m(L,.02,.1,'#5d3a1e',0,.31,.2,lg);
      m(.12,.46,.88,'#5d3a1e',L/2,.06,0,lg);       /* tapas de los extremos */
      m(.12,.46,.88,'#5d3a1e',-L/2,.06,0,lg);
      lg.position.set(XMIN-9+i*R.gap+rnd(0,1.2),0,0);
      g.add(lg);R.logs.push({g:lg,len:L});
    }
  }else{
    m(GNDW,.5,1,'#5b6068',0,-.25,0,g);
    m(GNDW,.1,.14,'#8e959e',0,.03,-.24,g);
    m(GNDW,.1,.14,'#8e959e',0,.03,.24,g);
    R.speed=17;
    const tg=new T3.Group();
    for(let i=0;i<7;i++){
      m(3.6,1.1,1,i?'#c8ced6':'#f2f4f7',i*3.8,.62,0,tg);
      m(3.2,.4,1.02,'#2a2f36',i*3.8,1.05,0,tg);
    }
    tg.visible=false;tg.position.x=R.dir>0?XMIN-32:XMAX+32;
    g.add(tg);R.train=tg;
    R.lamp=m(.34,.34,.34,'#ff3b3b',R.dir>0?XMIN-1.4:XMAX+1.4,1.1,0,g,true);
    R.lamp.visible=false;
  }
  if(type!=='water'&&z>3&&Math.random()<.26){
    const cx=rndi(XMIN,XMAX);
    if(!R.block.has(cx)){
      R.coin=cx;
      const c=new T3.Mesh(coinGeo(.25),matB('#ffd166'));
      const r=new T3.Mesh(coinGeo(.31),matB('#c2761f'));
      c.rotation.x=r.rotation.x=Math.PI/2-ELEV;   /* la cara apunta a la cámara */
      c.position.set(cx,.62,.02);r.position.set(cx,.62,0);  /* +z = hacia la cámara */
      g.add(r);g.add(c);
      R.coinM=c;R.coinR=r;
    }
  }
  deco(R,g);
  ROWS.set(z,R);
}
function dropRow(z){
  const R=ROWS.get(z);if(!R)return;
  scene.remove(R.g);
  R.g.traverse(o=>{const i=carSh.indexOf(o);if(i>=0)carSh.splice(i,1);});
  ROWS.delete(z);
}
function ensureRows(){
  const base=Math.floor(pz);
  for(let z=base-BEHIND;z<=base+AHEAD;z++)if(z>=-BEHIND-2)buildRow(z);
  if(base+AHEAD>farZ)farZ=base+AHEAD;
  for(const z of Array.from(ROWS.keys()))
    if(z<base-BEHIND-2||z>base+AHEAD+3)dropRow(z);
}
/* ---------------------------------------------------------------- JUGADOR */
function blocked(x,z){
  if(x<XMIN||x>XMAX)return true;
  const R=ROWS.get(z);
  if(!R)return false;
  return R.type==='grass'&&R.block.has(x);
}
function tryHop(dx,dz){
  if(dead||hop||frozen)return;
  const nx=Math.round(px)+dx,nz=Math.round(pz)+dz;
  if(nz<0)return;
  if(blocked(nx,nz)){ARC.sfx('click',{rate:.6,vol:.5});ARC.vib(8);return;}
  hop={x0:px,z0:pz,x1:nx,z1:nz,t:0,d:.135};
  ARC.sfx(dz>0?'cluck':'tap',{rate:dz>0?1:1.4,vol:dz>0?.85:1});
  ARC.vib(9);idleT=0;drownT=-1;edgeW=0;
  return true;
}
function die(kind){
  if(dead)return;
  dead=true;dieKind=kind;lastDie=kind+'@'+pz.toFixed(1)+' x='+px.toFixed(2);
  ARC.shake(12);
  if(kind==='car'){plr.scale.set(1.5,.18,1.5);ARC.sfx('boom');}
  else if(kind==='water'){plr.position.y=-.55;ARC.sfx('splat');}
  else if(kind==='train'){plr.scale.set(1.9,.12,1.9);ARC.sfx('boom',{rate:.8});}
  else ARC.sfx('lose');
  ARC.fx.burst(ARC.W/2,ARC.H*.72,{n:Math.round(20*partK),color:'#ff5d73',speed:260,size:5,life:.6});
  overT=kind==='eagle'?1.7:.75;
}
function finish(){
  const b=ARC.S.best||0;
  ARC.over({win:false,score,noStars:true,
    title:T(dieKind==='water'?'dWater':dieKind==='eagle'?'dEagle':dieKind==='train'?'dTrain':'dCar'),
    sub:T('statRows')+': <b>'+score+'</b> · '+T('statCoins')+': <b>'+coins+'</b><br>'+
      (score>b?('<b style="color:'+G.acc+'">'+T('newBest')+'</b>'):(T('statBest')+': '+b))});
}
/* ------------------------------------------------------- SELECTOR DE BICHO
   Pantalla propia dibujada en el canvas 2D del juego (no se toca el DOM del
   shell): tarjetas con la silueta de cada personaje sacada de su lista de
   cajas. Mientras está abierta el mundo queda congelado. */
function openPicker(){if(dead)return;picker=true;frozen=true;pickFrom=1;}
function pickCards(){
  const W=ARC.W,H=ARC.H,n=CHARS.length;
  const vert=H>W;
  const cw=vert?Math.min(W*.78,340):Math.min(W/n-14,190);
  const ch=vert?Math.min(H*.19,150):Math.min(H*.5,190);
  const gap=vert?Math.max(8,H*.022):12;
  const tot=vert?n*ch+(n-1)*gap:n*cw+(n-1)*gap;
  const x0=vert?(W-cw)/2:(W-tot)/2,y0=vert?(H-tot)/2+H*.03:(H-ch)/2+H*.02;
  const out=[];
  for(let i=0;i<n;i++)out.push({i,x:vert?x0:x0+i*(cw+gap),y:vert?y0+i*(ch+gap):y0,w:cw,h:ch});
  return out;
}
function rrect(g,x,y,w,h,r){
  g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
}
/* silueta 2D: las mismas cajas, de frente, las de atrás primero */
function drawChar(g,C,cx,by,s){
  const L=C.b.slice().sort((a,b)=>b[6]-a[6]);
  for(const b of L){
    g.fillStyle=b[3];
    g.fillRect(cx+(b[4]-b[0]/2)*s,by-(b[5]+b[1]/2)*s,b[0]*s,b[1]*s);
  }
}
function drawPicker(g){
  const W=ARC.W,H=ARC.H;
  g.fillStyle='rgba(5,9,14,.82)';g.fillRect(0,0,W,H);
  const fs=Math.max(15,Math.min(W*.062,30));
  g.font='900 '+fs+'px system-ui,sans-serif';g.textAlign='center';
  g.fillStyle='#ffd166';g.fillText(T('pick'),W/2,H*.10);
  const cur=charIdx(),cards=pickCards();
  for(const c of cards){
    const on=c.i===cur;
    g.fillStyle=on?'rgba(255,209,102,.20)':'rgba(255,255,255,.07)';
    rrect(g,c.x,c.y,c.w,c.h,16);g.fill();
    g.strokeStyle=on?'#ffd166':'rgba(255,255,255,.22)';g.lineWidth=on?3:1.5;
    rrect(g,c.x,c.y,c.w,c.h,16);g.stroke();
    const s=Math.min(c.h*.52,c.w*.30);
    drawChar(g,CHARS[c.i],c.x+c.w*.26,c.y+c.h*.76,s);
    const ns=Math.max(13,Math.min(c.w*.11,24));
    g.font='900 '+ns+'px system-ui,sans-serif';g.textAlign='left';
    g.fillStyle=on?'#ffd166':'#eef2f6';
    g.fillText(T(CHARS[c.i].key),c.x+c.w*.46,c.y+c.h*.55);
    if(on){g.font='900 '+(ns*.72)+'px system-ui,sans-serif';g.fillStyle='#9ad8a0';
      g.fillText('★',c.x+c.w*.46,c.y+c.h*.78);}
    g.textAlign='center';
  }
  if(pickFrom){
    g.font='900 '+Math.max(12,fs*.62)+'px system-ui,sans-serif';g.fillStyle='rgba(255,255,255,.6)';
    g.fillText(T('close'),W/2,H*.94);
  }
  g.textAlign='left';
}
function choose(i){
  ARC.S.char=CHARS[i].id;ARC.save();
  makePlayer();
  plrG.position.set(px,0,-pz);
  ARC.trayTxt('ch',CHARS[i].icon);
  ARC.sfx('power');ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:Math.round(16*partK),color:'#ffd166',speed:200});
  picker=false;frozen=false;
}
/* --------------------------------------------------------------- ENTRADA */
let sw=null;
G.down=function(p){
  if(picker){
    for(const c of pickCards())
      if(p.x>c.x&&p.x<c.x+c.w&&p.y>c.y&&p.y<c.y+c.h){choose(c.i);return;}
    if(pickFrom&&p.y>ARC.H*.88){picker=false;frozen=false;ARC.sfx('click');}
    return;
  }
  sw={x:p.x,y:p.y,t:ARC.t};
};
G.up=function(p){
  if(picker||!sw)return;
  const dx=p.x-sw.x,dy=p.y-sw.y,dt=ARC.t-sw.t;
  sw=null;
  const L=Math.hypot(dx,dy);
  if(L<26&&dt<.6){tryHop(0,1);return;}
  if(L<26)return;
  if(Math.abs(dx)>Math.abs(dy))tryHop(dx>0?1:-1,0);
  else tryHop(0,dy>0?-1:1);
};
G.key=function(c,d){
  if(!d)return;
  if(picker){const i={Digit1:0,Digit2:1,Digit3:2}[c];if(i!=null&&CHARS[i])choose(i);return;}
  if(c==='ArrowUp'||c==='KeyW')tryHop(0,1);
  if(c==='ArrowDown'||c==='KeyS')tryHop(0,-1);
  if(c==='ArrowLeft'||c==='KeyA')tryHop(-1,0);
  if(c==='ArrowRight'||c==='KeyD')tryHop(1,0);
};
/* ----------------------------------------------------------------- CICLO */
/* ------------------------------------------------- ARREGLO DE MEDIDAS (vert)
   head.html mide la UI de los juegos verticales en vw/vh/vmin DE LA VENTANA,
   pero en vertical el escenario es una COLUMNA más angosta que la ventana. En
   una ventana apaisada (900x430 -> columna de 249) eso daba botones de bandeja
   de 16vw = 144 px cada uno (5 botones = 720 px en 249) y la ficha del RÉCORD
   tapaba ⚙ y JUGAR: la sonda de interfaz medía elementFromPoint = "best" y
   AJUSTES/JUGAR/PAUSA no respondían. Acá se recalcula todo contra el ANCHO Y EL
   ALTO DEL ESCENARIO (--sw/--sh, que se actualizan en cada resize). Es un
   parche del lado del juego; ver "PEDIDO AL MOTOR" en el informe. */
const CSSFIX=`
body.vert #tray{gap:calc(var(--sw)*.025)}
body.vert #tray .btn{min-width:calc(var(--sw)*.16);font-size:clamp(13px,calc(var(--sw)*.044),26px)}
body.vert #tray .btn.sq{width:calc(var(--sw)*.16);height:calc(var(--sw)*.16)}
body.vert .pill{font-size:clamp(10px,calc(var(--sw)*.034),20px)}
body.vert #pScore{left:calc(var(--sw)*.04);top:calc(var(--sh)*.02)}
body.vert #pInfo{top:calc(var(--sh)*.02)}
body.vert #pPause{right:calc(var(--sw)*.04);top:calc(var(--sh)*.02);
  width:calc(var(--sw)*.11);height:calc(var(--sw)*.11)}
body.vert #menu .wrap{padding:0 calc(var(--sw)*.07) calc(var(--sh)*.07);gap:calc(var(--sh)*.022)}
body.vert #menu .ttl{font-size:clamp(24px,calc(var(--sw)*.14),68px)}
body.vert #best{right:calc(var(--sw)*.045);top:calc(var(--sh)*.028);bottom:auto;opacity:1;
  background:rgba(6,9,13,.55);padding:.45em .7em;border-radius:11px;
  border:1px solid rgba(255,255,255,.12)}
body.vert .card{max-width:calc(var(--sw)*.92);padding:calc(var(--smn)*.04)}
body.vert .h1{font-size:clamp(18px,calc(var(--sw)*.07),44px)}
body.vert .h2{font-size:clamp(12px,calc(var(--sw)*.044),24px)}
body.vert .sm{font-size:clamp(10px,calc(var(--sw)*.032),16px)}
body.vert .btn{font-size:clamp(11px,calc(var(--sw)*.038),20px)}
body.vert .stars{font-size:clamp(16px,calc(var(--sw)*.11),42px)}
body.vert .opt{width:calc(var(--sw)*.8)}
body.vert .sw{width:calc(var(--sw)*.17);height:calc(var(--sw)*.095)}
body.vert .seg b{font-size:clamp(9px,calc(var(--sw)*.032),15px);padding:.4em .6em}
body.vert #load{padding:calc(var(--smn)*.05)}
body.vert #load .bar{width:calc(var(--sw)*.72)}
body.vert #ldName{font-size:clamp(17px,calc(var(--sw)*.1),46px)}
body.vert #toast{font-size:clamp(10px,calc(var(--sw)*.036),20px);max-width:calc(var(--sw)*.86)}
body.vert .lvl{width:calc(var(--sw)*.14);height:calc(var(--sw)*.14)}
`;
function cssFix(){
  if(!document.getElementById('cruzaCss')){
    const st=document.createElement('style');st.id='cruzaCss';st.textContent=CSSFIX;
    document.head.appendChild(st);
  }
  const r=document.documentElement.style;
  r.setProperty('--sw',ARC.W+'px');
  r.setProperty('--sh',ARC.H+'px');
  r.setProperty('--smn',Math.min(ARC.W,ARC.H)+'px');
}
function frame(){
  /* ENCUADRE: el ancho manda (7,3 columnas). De ahí sale el alto y de ahí
     cuántas FILAS entran en cuadro: AHEAD/BEHIND se derivan de eso para que el
     borde del mundo nunca aparezca. */
  cssFix();
  const asp=Math.max(.2,ARC.W/ARC.H);
  CAMW=7.3;CAMH=CAMW/asp;
  ROWSVIS=CAMH/SE;
  AIM=ROWSVIS*.28;
  BEHIND=Math.ceil(ROWSVIS*.24)+3;
  AHEAD=Math.min(34,Math.ceil(ROWSVIS*(.78*(.72+.28*fogK)))+4);
  if(cam){
    cam.left=-CAMW/2;cam.right=CAMW/2;cam.top=CAMH/2;cam.bottom=-CAMH/2;
    cam.updateProjectionMatrix();
  }
  if(scene&&scene.fog){
    scene.fog.near=CAMD+ROWSVIS*.34*CE*fogK;
    scene.fog.far=CAMD+ROWSVIS*.68*CE*fogK;
  }
}
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  scene.fog=new T3.Fog(new T3.Color(G.sky).getHex(),40,50);
  cam=new T3.OrthographicCamera(-4,4,8,-8,.1,150);
  scene.add(new T3.HemisphereLight(0xffffff,0x8fb98f,.95));
  sun=new T3.DirectionalLight(0xfff3d0,.85);
  sun.position.set(6,14,8);scene.add(sun);
  const gp=ARC.gfxP();partK=gp.part;fogK=gp.fog;shOn=gp.sh;decoK=clamp(gp.part,.45,1.35);
  const A0=ARC.glb&&ARC.glb.auto;
  CARGLB=!!(A0&&A0.scene&&glbTris(A0.scene)<=5200);
  frame();
  makePlayer();makeEagle();
  ARC.clearGL=true;
  /* el arte 16:9 pegado al 14% dejaba media columna vacía en vertical: se baja
     al 30% y el degradado del menú se encarga del resto */
  const mn=document.getElementById('menu');
  if(mn&&mn.classList.contains('hasart'))mn.style.backgroundPosition='center 30%, center';
  setTimeout(()=>{if(ARC.scr==='load'&&ARC.enterMenu)ARC.enterMenu();},400);
};
G.resize=function(){frame();};
G.gfxApply=function(p){
  partK=p.part;fogK=p.fog;shOn=p.sh;decoK=clamp(p.part,.45,1.35);
  for(const s of carSh)s.visible=!!shOn;
  if(eagleSh&&eagle)eagleSh.visible=!!shOn;
  frame();
};
G.i18nDone=function(){if(ARC.scr==='game')hud();};
function hud(){
  ARC.hud(score,'<b>'+T('record')+'</b> '+Math.max(ARC.S.best||0,score)+
    ' &nbsp;·&nbsp; ◉ '+(ARC.S.coins||0));
}
G.start=function(){
  if(!T3)return;
  for(const z of Array.from(ROWS.keys()))dropRow(z);
  carSh.length=0;
  px=0;pz=0;score=0;coins=0;dead=false;hop=null;idleT=0;farZ=1;overT=-1;
  edgeW=0;drownT=-1;dieKind='';
  eagle=null;if(eagleG){eagleG.visible=false;eagleG.rotation.set(0,0,0);}
  if(eagleSh)eagleSh.visible=false;
  makePlayer();
  plr.scale.setScalar(plr.userData.glb?1:PSC);plr.position.set(0,0,0);plr.rotation.set(0,0,0);
  plrG.position.set(0,0,0);
  frame();ensureRows();
  camZ=0;camX=0;
  camAim();
  hud();
  const C=CHARS[charIdx()];
  ARC.tray([
    {id:'up',txt:'▲',fn:()=>tryHop(0,1)},
    {id:'lf',txt:'◀',gh:1,sq:1,fn:()=>tryHop(-1,0)},
    {id:'rt',txt:'▶',gh:1,sq:1,fn:()=>tryHop(1,0)},
    {id:'dn',txt:'▼',gh:1,sq:1,fn:()=>tryHop(0,-1)},
    {id:'ch',txt:C.icon,gh:1,sq:1,fn:openPicker}
  ]);
  picker=!ARC.S.char;pickFrom=0;frozen=picker;
};
function camAim(){
  const lim=Math.max(0,XMAX-CAMW/2+.75);
  camX=clamp(px*.9,-lim,lim);
  camZ=pz;
  applyCam();
}
function applyCam(){
  const aimZ=-(camZ+AIM);
  cam.position.set(camX,.35+CAMD*SE,aimZ+CAMD*CE);
  cam.lookAt(camX,.35,aimZ);
}
G.step=function(dt){
  if(!T3)return;
  if(frozen){applyCam();return;}
  /* --- filas vivas: autos, troncos, trenes, monedas --- */
  for(const [z,R] of ROWS){
    if(R.type==='road'){
      for(const c of R.cars){
        c.g.position.x+=R.speed*R.dir*dt;
        if(R.dir>0&&c.g.position.x>XMAX+11)c.g.position.x=XMIN-11;
        if(R.dir<0&&c.g.position.x<XMIN-11)c.g.position.x=XMAX+11;
      }
    }else if(R.type==='water'){
      for(const l of R.logs){
        l.g.position.x+=R.speed*R.dir*dt;
        if(R.dir>0&&l.g.position.x>XMAX+11)l.g.position.x=XMIN-11;
        if(R.dir<0&&l.g.position.x<XMIN-11)l.g.position.x=XMAX+11;
      }
    }else if(R.type==='rail'){
      R.trainT-=dt;
      if(R.trainT<=0&&!R.trainOn){
        R.trainOn=1;R.train.visible=true;
        R.train.position.x=R.dir>0?XMIN-30:XMAX+30;
        ARC.sfx('power',{rate:.6,vol:.5});
      }
      if(R.lamp)R.lamp.visible=(R.trainT<1.8&&R.trainT>0)?(Math.sin(ARC.t*18)>0):false;
      if(R.trainOn){
        R.train.position.x+=R.speed*R.dir*dt;
        if((R.dir>0&&R.train.position.x>XMAX+34)||(R.dir<0&&R.train.position.x<XMIN-34)){
          R.trainOn=0;R.train.visible=false;R.trainT=rnd(4,9);
        }
      }
    }
    if(R.coinM){
      const y=.62+Math.sin(ARC.t*3+z)*.1,k=1+Math.sin(ARC.t*4+z)*.07;
      R.coinM.position.y=y;R.coinR.position.y=y;
      R.coinM.scale.set(k,1,k);R.coinR.scale.set(k,1,k);}
  }
  /* --- salto --- */
  if(hop){
    hop.t+=dt;
    const k=clamp(hop.t/hop.d,0,1);
    px=lerp(hop.x0,hop.x1,k);pz=lerp(hop.z0,hop.z1,k);
    const up=Math.sin(k*Math.PI)*.42;
    plr.position.y=up;
    if(!plr.userData.glb)plr.scale.set(PSC*(1+up*.35),PSC*(1-up*.28),PSC*(1+up*.35));
    else plr.scale.set(1+up*.2,1-up*.16,1+up*.2);
    if(k>=1){
      hop=null;plr.position.y=0;plr.scale.setScalar(plr.userData.glb?1:PSC);
      px=Math.round(px);pz=Math.round(pz);
      if(pz>score){
        score=pz;hud();
        if(score%10===0)ARC.fx.text(ARC.W/2,ARC.H*.3,score+' '+T('rowsN'),
          {color:'#ffd166',size:26,life:.9});
      }
      const R=ROWS.get(Math.round(pz));
      if(R&&R.coin===Math.round(px)&&R.coinM){
        R.coinM.visible=false;R.coinR.visible=false;R.coin=-99;
        coins++;ARC.S.coins=(ARC.S.coins||0)+1;ARC.save();hud();
        ARC.sfx('coin');ARC.vib(14);
        ARC.fx.text(ARC.W/2,ARC.H*.62,'+1 ◉',{color:'#ffd166',size:22});
        ARC.fx.burst(ARC.W/2,ARC.H*.66,{n:Math.round(10*partK),color:'#ffd166',speed:150,size:4,life:.4});
      }
    }
  }
  const R=ROWS.get(Math.round(pz));
  /* --- río: viajar con el tronco, con AVISO antes de la orilla --- */
  let onLog=false;
  if(R&&R.type==='water'&&!hop&&!dead){
    for(const l of R.logs){
      const lx=l.g.position.x,h=l.len/2+.34;
      if(px>lx-h&&px<lx+h){onLog=true;px+=R.speed*R.dir*dt;break;}
    }
    if(!onLog)die('water');
    else{
      const lim=XMAX;
      if(Math.abs(px)>XMAX-1.6){
        const s=px>0?1:-1;
        if(edgeW!==s){edgeW=s;ARC.vib([10,40,10]);ARC.toast(T('edgeWarn'),1200);}
      }else{edgeW=0;drownT=-1;}
      if(px>lim||px<-lim){
        px=clamp(px,-lim,lim);                 /* clavado a la orilla: 1,4 s para salir */
        if(drownT<0)drownT=1.5;
        drownT-=dt;
        if(drownT<=0)die('water');
      }
    }
  }else if(!hop){edgeW=0;drownT=-1;}
  /* --- choques --- */
  if(R&&!dead){
    if(R.type==='road'){
      for(const c of R.cars){
        const cx=c.g.position.x,h=c.len/2+.34;
        if(px>cx-h&&px<cx+h){die('car');break;}
      }
    }
    if(R.type==='rail'&&R.trainOn){
      const tx=R.train.position.x;
      if(px>tx-1.3&&px<tx+7*3.8+1.3)die('train');
    }
  }
  /* --- águila --- */
  if(!dead){
    idleT+=dt;
    if(!eagle&&(score-pz>2.6||idleT>7.5))spawnEagle();
  }
  stepEagle(dt);
  /* --- cámara --- */
  camZ=lerp(camZ,pz,1-Math.pow(.0015,dt));
  const lim=Math.max(0,XMAX-CAMW/2+.75);
  camX=lerp(camX,clamp(px*.9,-lim,lim),1-Math.pow(.002,dt));
  if(!(dead&&dieKind==='eagle')){
    plrG.position.set(px,0,-pz);
    plr.rotation.y=0;
  }
  shadow.visible=!(dead&&(dieKind==='eagle'||dieKind==='water'));
  shadow.position.set(px,.03,-pz);
  applyCam();
  ensureRows();
  if(overT>0){overT-=dt;if(overT<=0){overT=-1;finish();}}
};
G.draw=function(g){
  if(!ARC.rnd||!scene)return;
  ARC.rnd.render(scene,cam);
  if(picker){drawPicker(g);return;}
  const vert=ARC.H>ARC.W,fs=Math.max(12,Math.min(ARC.W,ARC.H)*.052);
  if(score<3&&!dead){
    g.fillStyle='rgba(255,255,255,.92)';
    g.font='900 '+fs+'px system-ui,sans-serif';g.textAlign='center';
    g.fillText(T('tapHop'),ARC.W/2,ARC.H*(vert?.80:.86));
    g.font='700 '+fs*.62+'px system-ui,sans-serif';g.fillStyle='rgba(255,255,255,.6)';
    g.fillText(T('swipeSide'),ARC.W/2,ARC.H*(vert?.835:.92));
    g.textAlign='left';
  }
  /* aviso del águila: banda arriba parpadeando mientras está avisando */
  if(eagle&&eagle.ph==='warn'&&!dead){
    const a=.45+.45*Math.sin(ARC.t*9);
    g.fillStyle='rgba(224,60,60,'+(a*.5).toFixed(2)+')';
    g.fillRect(0,0,ARC.W,ARC.H*.055);
    g.font='900 '+fs*.8+'px system-ui,sans-serif';g.textAlign='center';
    g.fillStyle='rgba(255,255,255,'+(.55+.45*a).toFixed(2)+')';
    g.fillText(T('eagleWarn'),ARC.W/2,ARC.H*.042);g.textAlign='left';
  }
  /* aviso de orilla: flecha grande hacia adentro + viñeta roja */
  if(edgeW&&!dead){
    const a=.5+.5*Math.sin(ARC.t*11);
    const x=edgeW>0?ARC.W*.86:ARC.W*.14,y=ARC.H*.66,s=Math.min(ARC.W,ARC.H)*.09;
    g.fillStyle='rgba(224,60,60,'+(a*.30).toFixed(2)+')';
    if(edgeW>0)g.fillRect(ARC.W*.8,0,ARC.W*.2,ARC.H);else g.fillRect(0,0,ARC.W*.2,ARC.H);
    g.fillStyle='rgba(255,255,255,'+(.5+.5*a).toFixed(2)+')';
    g.beginPath();
    g.moveTo(x-edgeW*s,y);g.lineTo(x+edgeW*s*.5,y-s*.7);g.lineTo(x+edgeW*s*.5,y+s*.7);
    g.closePath();g.fill();
    if(drownT>0){
      g.font='900 '+fs*.9+'px system-ui,sans-serif';g.textAlign='center';
      g.fillStyle='#ff5d73';g.fillText(drownT.toFixed(1),ARC.W/2,ARC.H*.5);g.textAlign='left';
    }
  }
};
G.dbg={
  state:()=>({score,coins,px:+px.toFixed(2),pz:+pz.toFixed(2),dead,rows:ROWS.size,farZ,
    coinsSave:ARC.S.coins||0,char:ARC.S.char||CHARS[0].id,picker,
    eagle:eagle?eagle.ph+'@y'+eagle.y.toFixed(1):'-',edge:edgeW,how:lastDie,
    view:{w:+CAMW.toFixed(1),h:+CAMH.toFixed(1),filas:+ROWSVIS.toFixed(1),AHEAD,BEHIND}}),
  glb:()=>{const o={};for(const k in (ARC.glb||{})){const v=ARC.glb[k];
    o[k]=v&&v.scene?glbTris(v.scene):null;}o.carGlb=CARGLB;return o;},
  rowsInfo:(a,b)=>{const o=[];for(let z=a;z<=b;z++){const R=ROWS.get(z);
    if(!R){o.push(z+':-');continue;}
    o.push(z+':'+R.type+(R.type==='road'?(' v'+R.speed.toFixed(1)+' n'+R.cars.length):'')
      +(R.type==='water'?(' n'+R.logs.length):'')+(R.coin>-9?(' c'+R.coin):'')
      +(R.block.size?(' bl'+Array.from(R.block).join('/')):''));}
    return o;},
  pick:i=>{choose(clamp(i|0,0,CHARS.length-1));return ARC.S.char;},
  kill:k=>{die(k||'car');return lastDie;},
  gfx:()=>({partK,fogK,shOn,decoK,fog:scene&&scene.fog?[+scene.fog.near.toFixed(1),+scene.fog.far.toFixed(1)]:null}),
  i18n:()=>{const ks=Object.keys(G.i18n.es);const out={};
    for(const l of ['es','en','pt']){const f=ks.filter(k=>!G.i18n[l][k]);out[l]=f.length?('FALTAN '+f.join(',')):'ok';}
    return out;},
  /* PILOTO: la celda tiene que estar libre en toda la VENTANA de tiempo que el
     jugador va a pasar ahí (0 a 0,85 s), no en dos instantes sueltos: con dos
     muestras un auto podía llegar justo en el medio (medido: car@16.0). Para
     cada auto se resuelve el intervalo en que solapa la celda. */
  autoMove:()=>{
    if(picker){choose(charIdx());return true;}
    if(dead||hop)return false;
    const T0=0,T1=.85;
    const freeRow=(x,z)=>{
      if(x<XMIN||x>XMAX)return false;
      const R2=ROWS.get(z);if(!R2)return true;
      if(R2.type==='grass')return !R2.block.has(x);
      if(R2.type==='rail')return !R2.trainOn&&R2.trainT>1.6;
      if(R2.type==='road'){
        const v=R2.speed*R2.dir;
        for(const c of R2.cars){
          const h=c.len/2+.55,cx=c.g.position.x;
          let t0=(x-cx-h)/v,t1=(x-cx+h)/v;
          if(t0>t1){const t=t0;t0=t1;t1=t;}
          if(t1>T0-.15&&t0<T1)return false;
        }
        return true;
      }
      if(R2.type==='water'){
        const v=R2.speed*R2.dir;
        return R2.logs.some(l=>{
          const h=l.len/2-.2,lx=l.g.position.x;
          let t0=(x-lx-h)/v,t1=(x-lx+h)/v;
          if(t0>t1){const t=t0;t0=t1;t1=t;}
          return t0<=.2&&t1>=.6;
        });
      }
      return true;
    };
    const x0=Math.round(px),z0=Math.round(pz);
    const RN=ROWS.get(z0);
    /* en el tronco, si me lleva a la orilla salto YA para adentro */
    if(RN&&RN.type==='water'&&Math.abs(px)>XMAX-1.7){
      const dir=px>0?-1:1;
      if(freeRow(x0,z0+1)){tryHop(0,1);return true;}
      if(freeRow(x0+dir,z0)){tryHop(dir,0);return true;}
    }
    if(freeRow(x0,z0+1)){tryHop(0,1);return true;}
    /* de costado: PRIMERO HACIA EL CENTRO y sin pegarse a la pared. Antes probaba
       siempre +1 y el piloto derivaba hasta la columna del borde; ahí, en una ruta,
       no le quedaba escapatoria (x+1 fuera del mundo, x-1 con el mismo auto
       encima) y moría a los 4-19 s (medido: car@7.0 x=-3.00). */
    const dirs=px>0?[-1,1]:[1,-1];
    for(const sg of dirs){
      const nx=x0+sg;
      if(nx<XMIN||nx>XMAX)continue;
      if(RN&&RN.type!=='grass'&&Math.abs(nx)>XMAX-1)continue;
      if(freeRow(nx,z0)&&freeRow(nx,z0+1)){tryHop(sg,0);return true;}
    }
    /* quedarse quieto en la ruta es morir: salir para donde sea */
    if(!freeRow(x0,z0)){
      for(const sg of dirs)if(freeRow(x0+sg,z0)){tryHop(sg,0);return true;}
      if(z0>0&&freeRow(x0,z0-1)){tryHop(0,-1);return true;}
    }
    /* CAMINAR HACIA LA COLUMNA QUE SÍ ABRE. Con tres árboles seguidos en la fila
       de arriba el piloto se quedaba clavado esperando y lo levantaba el águila
       (medido: eagle@35.9). Sólo desde el PASTO: caminar de costado en la ruta lo
       hacía comerse un auto. */
    if(RN&&RN.type==='grass')for(let d=1;d<=XMAX-XMIN;d++){
      for(const sg of dirs){
        const c=x0+sg*d;
        if(c<XMIN||c>XMAX)continue;
        if(freeRow(c,z0+1)&&freeRow(x0+sg,z0)){tryHop(sg,0);return true;}
      }
    }
    return true;
  }
};
window.GAME=G;
