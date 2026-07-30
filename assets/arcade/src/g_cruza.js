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
     · El mundo juega en XMIN..XMAX = −4..4 (9 columnas) y el cuadro muestra 7,3:
       la cámara acompaña en X topada en ±1,1 y el bicho igual nunca se sale de
       pantalla (en x=±4 cae en el 89,7% del ancho, medido con dbg.screenPos).
       El suelo se dibuja SPAN+4 de ancho, siempre más allá del cuadro.
     · AIM = filas que la cámara mira por delante = ROWSVIS*0,20, y como el
       cuadro está centrado en ese punto el bicho cae SIEMPRE en el 70% del alto
       (con 0,28 quedaba en el 77,6%, encima de la bandeja y del cartel de ayuda).
     · Los CARRILES son circulares con PERIODO EXACTO (SPAN): la separación se
       redondea a SPAN/n y reciclar es restar SPAN. Reciclar teleportando a una x
       fija desarmaba la grilla y amontonaba autos y troncos (medido: huecos de
       −2 unidades, o sea superpuestos).
     · Toda fila de pasto cumple la GARANTÍA DE PASO (ensurePass): para cada
       tramo libre de la fila anterior deja una columna libre. Sin eso salían
       callejones sin salida (medido: el piloto 145 s trabado en la fila 7).
     · Personajes: CHARS es una lista de CAJAS (w,h,d,color,x,y,z). De la misma
       lista sale el grupo 3D y la silueta 2D del selector, así no hay dos
       fuentes de verdad. Si hay GLB para el personaje, se usa el GLB. Los tres
       llevan CONTORNO oscuro (casco invertido): sin él el pollo blanco visto
       desde arriba era una manchita gris.
     · El águila es un bicho VISIBLE (GLB): avisa 2,6 s volando arriba con su
       sombra, después baja, te agarra y te levanta.
     · El tren AVISA con una franja roja que ocupa toda la fila (la baliza sola
       estaba en x=±5,4, fuera del cuadro: el tren llegaba sin aviso).
     · Los troncos no te matan sin aviso: al acercarte a la orilla salta el aviso
       y si el tronco te empuja fuera del mundo quedás CLAVADO a la orilla con un
       reloj de 1,6 s en pantalla para saltar a tierra. Saltar al agua abierta sí
       es chapuzón inmediato: eso es culpa del jugador.
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
/* 9 COLUMNAS con un cuadro de 7,3: la cámara acompaña un poco en X (camX, topado
   en ±1,1) y el bicho igual NUNCA se sale de pantalla — en x=±4, el extremo, cae
   en el 89,7% del ancho (medido con dbg.screenPos).
   Antes eran 7 columnas, justo el ancho del cuadro y con la cámara fija. Se veía
   bien pero las columnas del borde eran una trampa: en x=±3 hay UNA sola salida
   lateral, y con autos cada 7,5-13 unidades el hueco libre puede quedar a 3 o 4
   celdas, o sea fuera de alcance. Medido con el piloto: el 100% de las muertes
   por auto de las corridas largas pasaron en x=±3 (car@30.0/52.0/60.0/71.2
   x=3.00, car@45.0/25.0/13.0 x=-3.00). Con 9 columnas el jugador tiene dos
   salidas laterales en todo el tramo que usa de verdad. */
const XMIN=-4,XMAX=4;
/* CARRIL CIRCULAR. Los autos y los troncos se reciclan, y antes se reciclaban
   TELEPORTÁNDOLOS a una x fija (`position.x=XMIN-11`). Eso rompe la separación:
   el carril mide 30 unidades de vuelta pero la fila se armaba con n autos cada
   `gap` (n*gap ≠ 30), así que a la primera vuelta las distancias se desarman y
   los objetos se AMONTONAN. Medido con dbg.logDump en una fila de río: huecos de
   −2 y −0,1 unidades, o sea DOS TRONCOS SUPERPUESTOS; en las rutas el mismo
   efecto arma paredes de autos y vuelve la fila impasable sin aviso.
   Arreglo: el carril tiene un PERIODO EXACTO (SPAN) y la separación se ajusta a
   SPAN/n, así que reciclar es restar SPAN y la grilla se conserva para siempre. */
const SPAN=39,LO=-SPAN/2;
const GNDW=SPAN+4;               /* el suelo tapa todo el carril, nunca se ve el borde */
const ELEV=54*Math.PI/180,SE=Math.sin(ELEV),CE=Math.cos(ELEV),CAMD=36;
let AHEAD=22,BEHIND=8,ROWSVIS=20,CAMW=7.3,CAMH=16,AIM=5;
let px=0,pz=0,hop=null,dead=false,score=0,coins=0,idleT=0,camZ=0,camX=0,farZ=1;
let overT=-1,dieKind='',lastDie='';
let eagle=null,eagleG=null,eagleSh=null,wingL=null,wingR=null;
let edgeW=0,drownT=-1,frozen=false,picker=false,pickFrom=0,pinned=false;
let carSh=[],shOn=1,partK=1,fogK=1,decoK=1,CARGLB=false;
const PSC=1.3;         /* el bicho ocupa casi una celda: con 1,14 era una manchita */
const PH=1.72;         /* alto del personaje si viene de GLB (1,45 se leía chico
                          al lado de los autos, que miden 1 de alto y 1,9 de largo) */
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
  /* sc = escala de las cajas. Cada bicho tiene su alto natural distinto (pollo
     1,22 · sapo 0,93 · robot 1,44) y con un PSC único el sapo quedaba enano y el
     robot gigante: cada uno lleva la suya para que los tres pesen parecido. */
  {id:'pollo',key:'cPollo',icon:'🐔',glb:'pollo',glbRot:Math.PI,sc:1.41,
   b:[[.72,.6,.62,'#f7f7fa',0,.42,0],[.5,.42,.44,'#ffffff',0,.86,-.02],
      [.2,.16,.24,'#f6a13a',0,.84,-.3],[.16,.2,.14,'#e0503f',0,1.12,.02],
      [.12,.12,.12,'#111418',.17,.95,-.27],[.12,.12,.12,'#111418',-.17,.95,-.27],
      [.1,.3,.4,'#e6e6ee',.4,.5,.02],[.1,.3,.4,'#e6e6ee',-.4,.5,.02],
      [.3,.26,.18,'#ffffff',0,.68,.36],
      [.14,.3,.14,'#f6a13a',.16,.15,.05],[.14,.3,.14,'#f6a13a',-.16,.15,.05]]},
  {id:'sapo',key:'cSapo',icon:'🐸',sc:1.5,
   b:[[.86,.44,.7,'#45b558',0,.3,0],[.62,.14,.5,'#e9f5c9',0,.16,.02],
      [.66,.3,.5,'#4fc463',0,.62,-.1],
      [.22,.22,.22,'#ffffff',.2,.82,-.2],[.22,.22,.22,'#ffffff',-.2,.82,-.2],
      [.11,.11,.1,'#111418',.2,.84,-.32],[.11,.11,.1,'#111418',-.2,.84,-.32],
      [.5,.07,.07,'#2a7d3a',0,.48,-.35],
      [.18,.07,.18,'#2f8f45',.22,.52,.18],[.18,.07,.18,'#2f8f45',-.24,.5,.06],
      [.2,.2,.34,'#3aa14d',.44,.12,.22],[.2,.2,.34,'#3aa14d',-.44,.12,.22],
      [.26,.14,.3,'#3aa14d',.3,.07,-.28],[.26,.14,.3,'#3aa14d',-.3,.07,-.28]]},
  {id:'robot',key:'cRobot',icon:'🤖',sc:1.2,
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
/* CONTORNO (casco invertido): una copia del modelo un poco más grande, pintada
   plana y oscura y con las caras de ATRÁS, así sólo se ve asomando por el borde.
   Sin esto el pollo (blanco, visto desde arriba a 54°, ~50 px de alto) se leía
   como una manchita gris tanto sobre el pasto como sobre el asfalto claro: en la
   captura del juego no se distinguía qué bicho era. */
function outlineOf(node,k){
  k=k||1.085;
  const o=node.clone(true);
  const mt=new T3.MeshBasicMaterial({color:new T3.Color('#161a1f'),side:T3.BackSide});
  o.traverse(x=>{if(x.isMesh){x.material=mt;x.castShadow=x.receiveShadow=false;}});
  /* el casco se agranda desde el CENTRO de la caja, no desde los pies: escalado
     desde el origen el contorno salía de 1 px a los costados y con una barra
     negra de 5 px arriba de la cabeza (medido en la captura ampliada). Con
     p -> c+k(p-c) el borde queda del mismo grosor por todos lados. */
  const c=new T3.Vector3();
  new T3.Box3().setFromObject(o).getCenter(c);
  const w=new T3.Group();
  w.add(o);w.scale.setScalar(k);w.position.copy(c).multiplyScalar(1-k);
  return w;
}
/* El personaje se arma SIEMPRE igual: un cuerpo (GLB o cajas) con su escala
   propia dentro de `plr`, y el contorno oscuro delante. Así `plr` queda con
   escala 1 para los tres bichos y el achatado del salto es uno solo (antes el
   pollo de GLB y los de cajas usaban escalas distintas y había dos caminos). */
function makePlayer(){
  if(plrG){scene.remove(plrG);}
  plrG=new T3.Group();plr=new T3.Group();plrG.add(plr);
  const C=CHARS[charIdx()];
  const node=C.glb?glbNode(C.glb,PH,C.glbRot):null;
  let body;
  if(node){body=node;plr.userData.glb=1;}
  else{body=new T3.Group();buildBoxes(C.b,body);body.scale.setScalar(C.sc||PSC);}
  plr.add(outlineOf(body,1.085));plr.add(body);
  plr.scale.setScalar(1);
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
   cuadro (el cuadro mide 7,3 de ancho de las 9 columnas del mundo) y
   NO estorban: la cantidad la manda el nivel de gráficos y la dificultad no
   cambia ni un poco entre Bajo y Ultra. */
/* el blanco puro leía como papelito tirado en el pasto (visible en la captura
   ampliada): flores más chicas y en tonos cálidos que no compiten con el bicho */
const FLOW=['#ffe066','#ff8fab','#ffd166','#c3f584'];
function deco(R,g){
  if(R.type!=='grass')return;
  const n=Math.round(3*decoK);
  for(let i=0;i<n;i++){
    const x=rndi(XMIN,XMAX);
    if(R.block.has(x)||x===R.coin)continue;
    const ox=x+rnd(-.32,.32),oz=rnd(-.34,.34);
    m(.15,.05,.15,'#5fae45',ox,.02,oz,g);
    if(Math.random()<.42)m(.065,.065,.065,pick(FLOW),ox,.1,oz,g,true);
  }
}
function carShadow(g,L){
  const s=new T3.Mesh(box(L*1.05,.02,1.02),matB('#1d2228'));
  s.position.set(0,.03,.06);s.visible=!!shOn;g.add(s);carSh.push(s);return s;
}
/* GARANTÍA DE PASO — bug de generación medido con dbg.why():
     fila 7 (pasto)  ....A..AA   árboles en x=0, 3 y 4
     fila 8 (pasto)  .....AA..   árboles en x=1 y 2
   El bicho en la fila 7 sólo podía estar en x=1 o x=2 (encerrado entre los
   árboles de 0 y 3), y justo esas dos columnas estaban tapadas en la fila 8: no
   había ni salto adelante ni paso al costado. Quedaba SIN SALIDA y la única
   opción era retroceder, que despierta al águila. El piloto se quedó 145 s
   trabado ahí; a una persona le pasaría lo mismo.
   Invariante: para CADA tramo libre de la fila anterior, esta fila deja al menos
   una columna libre dentro de ese tramo. Así desde cualquier celda alcanzable
   siempre hay por dónde seguir. */
function ensurePass(R,z){
  const prev=ROWS.get(z-1);
  const pb=(prev&&prev.type==='grass')?prev.block:null;
  const segs=[];let cur=[];
  for(let x=XMIN;x<=XMAX;x++){
    if(pb&&pb.has(x)){if(cur.length)segs.push(cur);cur=[];}
    else cur.push(x);
  }
  if(cur.length)segs.push(cur);
  for(const sg of segs){
    if(sg.some(x=>!R.block.has(x)))continue;   /* el tramo ya tiene salida */
    R.block.delete(pick(sg));                  /* se saca un árbol y se abre */
  }
}
function buildRow(z){
  if(ROWS.has(z))return;
  const type=z<4?'grass':rowType(z);
  const R={type,z,objs:[],cars:[],logs:[],block:new Set(),coin:-99,coinM:null,
    dir:Math.random()<.5?1:-1,speed:0,gap:0,trainT:rnd(4,9),trainOn:0};
  const g=new T3.Group();g.position.z=-z;scene.add(g);R.g=g;
  if(type==='grass'){
    m(GNDW,.5,1,z%2?'#7fc95c':'#74bf53',0,-.25,0,g);
    /* primero se ELIGE dónde van los árboles, después se garantiza el paso, y
       sólo al final se dibujan: si se dibujaran al elegir no se podría sacar
       ninguno sin dejar un árbol fantasma bloqueando de mentira. */
    const n=z<4?0:rndi(0,3);
    for(let i=0;i<n;i++){
      const x=rndi(XMIN,XMAX);
      if(x===0&&z<7)continue;
      R.block.add(x);
    }
    ensurePass(R,z);
    for(const x of R.block){
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
    /* la separación pedida se redondea a SPAN/n para que el carril CIERRE: así
       reciclar es restar SPAN y los autos nunca se amontonan */
    const n=Math.max(2,Math.round(SPAN/rnd(7.5,13)));
    R.gap=SPAN/n;
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
      cg.position.set(LO+i*R.gap+rnd(-.6,.6),0,0);
      g.add(cg);R.cars.push({g:cg,len:L});
    }
  }else if(type==='water'){
    m(GNDW,.42,1,'#1c69bd',0,-.29,0,g);
    m(GNDW,.02,.86,'#3f92e0',0,-.07,0,g);
    R.speed=rnd(.85,1.75);
    const n=Math.max(3,Math.round(SPAN/rnd(5,7)));
    R.gap=SPAN/n;
    for(let i=0;i<n;i++){
      const L=rndi(2,3),lg=new T3.Group();
      m(L,.42,.84,'#7c4f2c',0,.05,0,lg);
      m(L-.14,.06,.84,'#a06d3f',0,.27,0,lg);
      m(L,.02,.1,'#5d3a1e',0,.31,-.2,lg);          /* vetas: el tronco se lee */
      m(L,.02,.1,'#5d3a1e',0,.31,.2,lg);
      m(.12,.46,.88,'#5d3a1e',L/2,.06,0,lg);       /* tapas de los extremos */
      m(.12,.46,.88,'#5d3a1e',-L/2,.06,0,lg);
      lg.position.set(LO+i*R.gap+rnd(-.3,.3),0,0);
      g.add(lg);R.logs.push({g:lg,len:L});
    }
  }else{
    m(GNDW,.5,1,'#5b6068',0,-.25,0,g);
    m(GNDW,.1,.14,'#8e959e',0,.03,-.24,g);
    m(GNDW,.1,.14,'#8e959e',0,.03,.24,g);
    R.speed=17;
    /* EL TREN. Antes cada vagón era un bloque claro con OTRO bloque de 0,4 de
       alto y color #2a2f36 encima: visto desde 54° ese bloque oscuro se proyecta
       para arriba y tapa el vagón, así que el tren entero se leía como una losa
       negra y gris (se ve en la captura ampliada). Ahora el techo es una línea
       fina y lo oscuro son las VENTANAS, en las caras que miran a la cámara. */
    const tg=new T3.Group();
    for(let i=0;i<7;i++){
      const x=i*3.8;
      m(3.5,1.12,1,'#e7ecf2',x,.64,0,tg);            /* cuerpo claro */
      m(3.5,.13,1.04,'#8d9aa9',x,1.26,0,tg);         /* techo: una línea */
      m(3,.34,.06,'#232830',x,.88,.52,tg,true);      /* ventanas de este lado */
      m(3,.34,.06,'#232830',x,.88,-.52,tg,true);     /* y del otro */
      m(3.44,.17,1.02,i?'#e0503f':'#f6c343',x,.3,0,tg); /* franja: la cabina va amarilla */
    }
    tg.visible=false;tg.position.x=R.dir>0?XMIN-32:XMAX+32;
    g.add(tg);R.train=tg;
    /* AVISO. La lámpara estaba en x=±5,4 y el cuadro sólo muestra ±3,65 (±4,75
       con la cámara corrida a fondo): NUNCA se veía, o sea que el tren llegaba
       sin aviso ninguno. Ahora avisa una franja roja que ocupa toda la fila
       —imposible que quede fuera de cuadro— más dos balizas adentro del cuadro. */
    R.warn=m(GNDW,.05,.92,'#ff3b3b',0,.07,0,g,true);
    R.warn.visible=false;
    R.lamp=new T3.Group();
    for(const lx of [-3.2,3.2]){
      m(.3,.3,.3,'#ff3b3b',lx,1.15,0,R.lamp,true);
      m(.12,.9,.12,'#4a5058',lx,.6,0,R.lamp);
    }
    R.lamp.visible=false;g.add(R.lamp);
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
  ARC.vib(9);idleT=0;drownT=-1;edgeW=0;pinned=false;
  return true;
}
/* MONEDAS: se juntan por ESTAR en la celda, no sólo al terminar un salto. Antes
   la recolección vivía dentro del `if(k>=1)` del salto: si el bicho llegaba a la
   celda de la moneda por cualquier otro camino (arrastrado por un tronco hasta el
   pasto, reubicado, terminando el salto justo en el cuadro del choque) la moneda
   quedaba ahí sin juntarse. Se guardan en ARC.S.coins y salen en el HUD. */
function grabCoin(){
  const R=ROWS.get(Math.round(pz));
  if(!R||R.coin!==Math.round(px)||!R.coinM)return;
  R.coinM.visible=false;R.coinR.visible=false;R.coin=-99;
  coins++;ARC.S.coins=(ARC.S.coins||0)+1;ARC.save();hud();
  ARC.sfx('coin');ARC.vib(14);
  ARC.fx.text(ARC.W/2,ARC.H*.62,'+1 ◉',{color:'#ffd166',size:22});
  ARC.fx.burst(ARC.W/2,ARC.H*.66,{n:Math.round(10*partK),color:'#ffd166',speed:150,size:4,life:.4});
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
  /* el título se ACHICA hasta entrar en la columna: "PICK YOUR CHARACTER" a
     tamaño fijo se cortaba contra el borde derecho en la ventana apaisada, donde
     el escenario es una columna de 249 px. Y baja un poco para no pisar las
     fichas del HUD. */
  let fs=Math.max(15,Math.min(W*.062,30));
  g.textAlign='center';
  for(let i=0;i<12;i++){
    g.font='900 '+fs+'px system-ui,sans-serif';
    if(g.measureText(T('pick')).width<=W*.9||fs<=9)break;
    fs*=.92;
  }
  g.fillStyle='#ffd166';g.fillText(T('pick'),W/2,H*.115);
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
  /* el cartel iba en el 94% del alto, o sea DEBAJO de la bandeja de botones, que
     además se comía el toque. Va entre la última tarjeta y la bandeja. */
  if(pickFrom){
    g.font='900 '+Math.max(12,fs*.62)+'px system-ui,sans-serif';g.fillStyle='rgba(255,255,255,.62)';
    g.fillText(T('close'),W/2,H*.845);
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
    /* tocar FUERA de las tarjetas cierra (si el selector se abrió a mano). Antes
       la zona de cierre era p.y>88% del alto, que es exactamente donde vive la
       bandeja de botones del DOM: el toque nunca llegaba al canvas. */
    if(pickFrom){picker=false;frozen=false;ARC.sfx('click');}
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
  /* AIM = cuántas filas por delante mira la cámara. Como el encuadre está
     centrado en ese punto, el bicho cae SIEMPRE en el (50+AIM/ROWSVIS*100)% de
     alto: con .28 quedaba en el 77,6% (medido con dbg.screenPos), pegado a la
     bandeja de botones y justo debajo del cartel de ayuda. Con .20 queda en el
     70% y todavía se ven 14 filas hacia adelante. */
  AIM=ROWSVIS*.20;
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
  edgeW=0;drownT=-1;dieKind='';pinned=false;
  eagle=null;if(eagleG){eagleG.visible=false;eagleG.rotation.set(0,0,0);}
  if(eagleSh)eagleSh.visible=false;
  makePlayer();
  plr.scale.setScalar(1);plr.position.set(0,0,0);plr.rotation.set(0,0,0);
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
        if(c.g.position.x>LO+SPAN)c.g.position.x-=SPAN;
        else if(c.g.position.x<LO)c.g.position.x+=SPAN;
      }
    }else if(R.type==='water'){
      for(const l of R.logs){
        l.g.position.x+=R.speed*R.dir*dt;
        if(l.g.position.x>LO+SPAN)l.g.position.x-=SPAN;
        else if(l.g.position.x<LO)l.g.position.x+=SPAN;
      }
    }else if(R.type==='rail'){
      R.trainT-=dt;
      if(R.trainT<=0&&!R.trainOn){
        R.trainOn=1;R.train.visible=true;
        R.train.position.x=R.dir>0?XMIN-30:XMAX+30;
        ARC.sfx('power',{rate:.6,vol:.5});
      }
      const avisa=(R.trainT<2.2&&R.trainT>0)?(Math.sin(ARC.t*16)>0):false;
      if(R.lamp)R.lamp.visible=avisa;
      if(R.warn)R.warn.visible=avisa;
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
    plr.scale.set(1+up*.24,1-up*.2,1+up*.24);
    if(k>=1){
      hop=null;plr.position.y=0;plr.scale.setScalar(1);
      px=Math.round(px);pz=Math.round(pz);
      if(pz>score){
        score=pz;hud();
        if(score%10===0)ARC.fx.text(ARC.W/2,ARC.H*.3,score+' '+T('rowsN'),
          {color:'#ffd166',size:26,life:.9});
      }
    }
  }
  if(!hop&&!dead)grabCoin();
  const R=ROWS.get(Math.round(pz));
  /* --- río: viajar con el tronco, con AVISO antes de la orilla ---
     BUG MEDIDO (water@10.0 x=-3.00): el tronco arrastraba al jugador hasta el
     borde del mundo, ahí px quedaba CLAVADO en ±3 pero el tronco seguía
     viajando, así que al cuadro siguiente ya no había tronco bajo los pies y
     el `if(!onLog)die()` mataba al instante — la cuenta regresiva de 1,5 s no
     se llegaba a usar nunca. Ahora se distingue:
       · CLAVADO a la orilla (el tronco me empujó fuera) -> cuenta regresiva con
         aviso y el bicho hundido: hay tiempo real de saltar a tierra.
       · saltar al agua donde NO había tronco -> chapuzón inmediato (culpa mía). */
  let onLog=false;
  if(R&&R.type==='water'&&!hop&&!dead){
    const lim=XMAX;
    for(const l of R.logs){
      const lx=l.g.position.x,h=l.len/2+.34;
      if(px>lx-h&&px<lx+h){onLog=true;px+=R.speed*R.dir*dt;break;}
    }
    const out=px>lim||px<-lim;                 /* el tronco me empuja fuera del mundo */
    if(out)px=clamp(px,-lim,lim);
    if(out)pinned=true;
    /* aviso al acercarme a la orilla, mucho antes de quedar clavado */
    if(Math.abs(px)>lim-1.6){
      const s=px>0?1:-1;
      if(edgeW!==s){edgeW=s;ARC.vib([10,40,10]);ARC.toast(T('edgeWarn'),1200);}
    }else{edgeW=0;}
    if(onLog&&!out&&Math.abs(px)<lim-.05)pinned=false;   /* volví a viajar tranquilo */
    if(pinned){
      if(drownT<0){drownT=1.6;ARC.sfx('splat',{rate:1.5,vol:.5});}
      drownT-=dt;
      plr.position.y=-.14;                     /* hundido: se lee que me estoy ahogando */
      if(drownT<=0)die('water');
    }else if(!onLog)die('water');
    else{
      drownT=-1;plr.position.y=0;
      /* VIAJAR EN TRONCO NO ES ESTAR QUIETO: el águila castiga acampar, pero
         arriba de un tronco el bicho no elige quedarse — y el tronco ya lo lleva
         a la orilla, donde corre el reloj de ahogo. Sin esto el águila levantaba
         al jugador en medio del río (medido: eagle@14.0 x=-1.00). */
      idleT=Math.min(idleT,2.5);
    }
  }else if(!hop){edgeW=0;drownT=-1;pinned=false;}
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
  const fs=Math.max(12,Math.min(ARC.W,ARC.H)*.052);
  /* el cartel de ayuda va ENTRE el bicho (70% de alto) y la bandeja (~88%): antes
     estaba en el 80% y le cruzaba la cara al personaje en las dos ventanas */
  if(score<3&&!dead){
    g.textAlign='center';
    g.lineWidth=4;g.strokeStyle='rgba(0,0,0,.5)';
    g.font='900 '+fs+'px system-ui,sans-serif';
    g.strokeText(T('tapHop'),ARC.W/2,ARC.H*.795);
    g.fillStyle='rgba(255,255,255,.94)';
    g.fillText(T('tapHop'),ARC.W/2,ARC.H*.795);
    g.font='700 '+fs*.62+'px system-ui,sans-serif';
    g.strokeText(T('swipeSide'),ARC.W/2,ARC.H*.845);
    g.fillStyle='rgba(255,255,255,.72)';
    g.fillText(T('swipeSide'),ARC.W/2,ARC.H*.845);
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
  }
  /* CLAVADO A LA ORILLA: cuenta regresiva GRANDE al lado del bicho (que vive en
     el 70% de alto), no en el medio de la pantalla, y sale siempre que corra el
     reloj — antes dependía de edgeW y podía no verse nunca. */
  if(drownT>0&&!dead){
    const a=.55+.45*Math.sin(ARC.t*13);
    g.textAlign='center';
    g.font='900 '+fs*1.5+'px system-ui,sans-serif';
    g.lineWidth=5;g.strokeStyle='rgba(0,0,0,.6)';
    g.strokeText(drownT.toFixed(1),ARC.W/2,ARC.H*.635);
    g.fillStyle='rgba(255,93,115,'+(.6+.4*a).toFixed(2)+')';
    g.fillText(drownT.toFixed(1),ARC.W/2,ARC.H*.635);
    g.font='900 '+fs*.66+'px system-ui,sans-serif';
    g.strokeText(T('edgeWarn'),ARC.W/2,ARC.H*.675);
    g.fillStyle='#fff';g.fillText(T('edgeWarn'),ARC.W/2,ARC.H*.675);
    g.textAlign='left';
  }
};
G.dbg={
  state:()=>({score,coins,px:+px.toFixed(2),pz:+pz.toFixed(2),dead,rows:ROWS.size,farZ,
    coinsSave:ARC.S.coins||0,char:ARC.S.char||CHARS[0].id,picker,
    drown:+drownT.toFixed(2),pinned,idle:+idleT.toFixed(1),
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
  /* --- ayudas de medición (las usa el banco de pruebas, no el juego) --- */
  tp:(x,z)=>{px=clamp(Math.round(x),XMIN,XMAX);pz=Math.max(0,Math.round(z));
    hop=null;idleT=0;drownT=-1;edgeW=0;pinned=false;if(pz>score)score=pz;
    ensureRows();plrG.position.set(px,0,-pz);camZ=pz;camAim();hud();return{px,pz};},
  eagle2:()=>{spawnEagle();return eagle?eagle.ph:'-';},
  openPick:()=>{openPicker();return picker;},
  /* x de un tronco de esa fila que esté DENTRO del mundo (para probar el río) */
  logX:z=>{const R=ROWS.get(z);if(!R||R.type!=='water')return null;
    for(const l of R.logs){const x=l.g.position.x;
      if(x>XMIN+.6&&x<XMAX-.6)return{x:Math.round(x),real:+x.toFixed(2),len:l.len,
        dir:R.dir,speed:+R.speed.toFixed(2)};}
    return null;},
  projX:(x,z,y)=>{const v=new T3.Vector3(x,y||0,-z).project(cam);
    return{sx:+((v.x*.5+.5)*100).toFixed(1),sy:+((-v.y*.5+.5)*100).toFixed(1)};},
  /* el hueco MÁS CHICO de cada carril: si sale negativo hay objetos superpuestos */
  /* pone al bicho al lado de una vía y devuelve el estado del tren */
  /* por qué no avanza el piloto: estado de la fila de arriba celda por celda */
  /* busca CALLEJONES SIN SALIDA entre filas consecutivas ya generadas */
  cards:()=>pickCards(),
  pockets:()=>{const bad=[];const zs=Array.from(ROWS.keys()).sort((a,b)=>a-b);
    for(const z of zs){
      const R=ROWS.get(z),P=ROWS.get(z-1);
      if(!R||!P||R.type!=='grass')continue;
      const pb=P.type==='grass'?P.block:null;
      const segs=[];let cur=[];
      for(let x=XMIN;x<=XMAX;x++){
        if(pb&&pb.has(x)){if(cur.length)segs.push(cur);cur=[];}else cur.push(x);}
      if(cur.length)segs.push(cur);
      for(const sg of segs)if(!sg.some(x=>!R.block.has(x)))
        bad.push({z,tramo:sg.join(','),bloq:Array.from(R.block).join(',')});
    }
    return bad;},
  why:()=>{const z0=Math.round(pz),x0=Math.round(px);
    const RN=ROWS.get(z0),RA=ROWS.get(z0+1);
    const f=(x,z)=>{const R2=ROWS.get(z);if(!R2)return '?';
      if(x<XMIN||x>XMAX)return 'X';
      if(R2.type==='grass')return R2.block.has(x)?'A':'.';
      if(R2.type==='rail')return (!R2.trainOn&&R2.trainT>1.9)?'.':'T';
      if(R2.type==='road'){const v=R2.speed*R2.dir;
        for(const c of R2.cars){const h=c.len/2+.55,cx=c.g.position.x;
          let t0=(x-cx-h)/v,t1=(x-cx+h)/v;if(t0>t1){const t=t0;t0=t1;t1=t;}
          if(t1>-.15&&t0<1.0)return 'C';}
        return '.';}
      if(R2.type==='water'){const v=R2.speed*R2.dir;
        return R2.logs.some(l=>{const h=l.len/2-.2,lx=l.g.position.x;
          let t0=(x-lx-h)/v,t1=(x-lx+h)/v;if(t0>t1){const t=t0;t0=t1;t1=t;}
          return t0<=.2&&t1>=.6;})?'.':'~';}
      return '.';};
    const line=z=>{let s2='';for(let x=XMIN;x<=XMAX;x++)s2+=f(x,z);return s2;};
    return{x0,z0,idle:+idleT.toFixed(1),
      aqui:(RN?RN.type:'-')+' '+line(z0),
      arriba:(RA?RA.type:'-')+' '+line(z0+1),
      arriba2:line(z0+2)};},
  railInfo:()=>{const out=[];
    for(const [z,R] of ROWS)if(R.type==='rail')
      out.push({z,trainT:+R.trainT.toFixed(2),on:R.trainOn,
        x:+R.train.position.x.toFixed(1),dir:R.dir,aviso:!!(R.warn&&R.warn.visible)});
    return out.sort((a,b)=>a.z-b.z);},
  lanes:()=>{const out=[];
    for(const [z,R] of ROWS){
      const src=R.type==='water'?R.logs:(R.type==='road'?R.cars:null);
      if(!src||!src.length)continue;
      const L=src.map(o=>({x:o.g.position.x,len:o.len})).sort((a,b)=>a.x-b.x);
      let mn=1e9;
      for(let i=1;i<L.length;i++)
        mn=Math.min(mn,(L[i].x-L[i].len/2)-(L[i-1].x+L[i-1].len/2));
      /* y el que cierra la vuelta, de el ultimo al primero pasando por el periodo */
      if(L.length>1)mn=Math.min(mn,(L[0].x+SPAN-L[0].len/2)-(L[L.length-1].x+L[L.length-1].len/2));
      out.push({z,t:R.type,n:L.length,gap:+R.gap.toFixed(2),minHueco:+mn.toFixed(2)});}
    return out;},
  nextCoin:()=>{for(let z=Math.round(pz)+1;z<Math.round(pz)+40;z++){
    const R=ROWS.get(z);if(R&&R.coinM&&R.coinM.visible&&R.coin>-9)return{x:R.coin,z};}return null;},
  /* dónde cae el bicho DENTRO del escenario, en % de ancho/alto: sirve para
     demostrar que nunca se sale de cuadro */
  screenPos:()=>{
    if(!cam||!plrG)return null;
    const v=new T3.Vector3(px,.45,-pz).project(cam);
    return{sx:+((v.x*.5+.5)*100).toFixed(1),sy:+((-v.y*.5+.5)*100).toFixed(1)};},
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
    /* `win` = cuántos segundos tiene que seguir libre la celda. Para PISAR una
       ruta hace falta más margen que para mirarla de reojo: con la ventana corta
       de 0,85 s el piloto entraba a la ruta, al cuadro siguiente el auto ya
       estaba encima, se volvía al pasto, y repetía para siempre — LIVELOCK
       medido con la traza: 30 s clavado en pz=10 oscilando entre px=0,-1,-2
       mientras la fila 11 (road v3.1) nunca estaba libre "a tiempo". Con 1,7 s
       el salto que se decide es un salto que se sobrevive. */
    const freeRow=(x,z,win)=>{
      if(x<XMIN||x>XMAX)return false;
      const R2=ROWS.get(z);if(!R2)return true;
      if(R2.type==='grass')return !R2.block.has(x);
      if(R2.type==='rail')return !R2.trainOn&&R2.trainT>(win||T1)+.9;
      if(R2.type==='road'){
        const v=R2.speed*R2.dir,W=win||T1;
        for(const c of R2.cars){
          const h=c.len/2+.55,cx=c.g.position.x;
          let t0=(x-cx-h)/v,t1=(x-cx+h)/v;
          if(t0>t1){const t=t0;t0=t1;t1=t;}
          if(t1>T0-.15&&t0<W)return false;
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
    /* CUÁNTO MARGEN PEDIR — con números, porque acá me equivoqué dos veces:
       en una ruta de velocidad v con autos cada `gap`, la celda queda tapada
       2h/v segundos y libre gap/v−2h/v. Para v=3,3 y gap=8,3 eso es 0,91 s
       tapada y 1,59 s libre; a alta velocidad (v≈4,9 en la fila 118) el hueco
       libre baja a ~0,9 s. Es decir: NO existe margen de 1,7 s (lo probé y el
       piloto quedó clavado para siempre en pz=3, fila 4 road v3.3). El margen
       para PISAR es corto y el que tiene que ser cortísimo es el de HUIR: si el
       piloto se escapa cada vez que ve un auto a 1 s, entra a la ruta y se
       vuelve al pasto en bucle (el livelock que medí en pz=10). */
    const AV=1.0;      /* pisar ruta/vía: un poco más que la ventana normal */
    const PANIC=.32;   /* huir SÓLO si el auto ya está encima */
    const stepOk=(x,z)=>{const R2=ROWS.get(z);
      return freeRow(x,z,(R2&&(R2.type==='road'||R2.type==='rail'))?AV:undefined);};
    /* en el tronco, si me lleva a la orilla salto YA para adentro */
    if(RN&&RN.type==='water'&&Math.abs(px)>XMAX-1.7){
      const dir=px>0?-1:1;
      if(stepOk(x0,z0+1)){tryHop(0,1);return true;}
      if(freeRow(x0+dir,z0)){tryHop(dir,0);return true;}
      /* PARA ATRÁS TAMBIÉN: la fila de donde vine es tierra firme, así que casi
         siempre es la salida buena cuando el tronco ya me dejó en la orilla y no
         hay otro tronco hacia adentro (medido: water@48.0 x=3.00). */
      if(z0>0&&stepOk(x0,z0-1)){tryHop(0,-1);return true;}
    }
    /* NO METERSE EN LA COLUMNA DEL BORDE si arriba hay peligro. En x=±3 sólo
       queda UNA salida lateral: si viene un auto por esa fila, la única escapatoria
       es hacia atrás y no siempre alcanza. Las dos muertes largas medidas fueron
       exactamente ahí (car@62.0 x=3.00 y car@5.0 x=3.00). Desde el pasto conviene
       correrse al centro ANTES de entrar. */
    const RA=ROWS.get(z0+1);
    /* La columna del borde es la trampa: TODAS las muertes por auto de las
       corridas largas cayeron ahí (car@30.0/71.2 x=3.00, car@45.0/43.0/25.0/12.0
       x=-3.00, o sea el 100%). En x=±3 hay una sola salida lateral, así que en vez
       de avanzar desde el borde conviene GASTAR UN SALTO para meterse. Sobre el
       pasto sale gratis (el pasto no mata) y evita entrar a la ruta por la
       columna sin escapatoria. */
    if(RN&&RN.type==='grass'&&Math.abs(x0)>=XMAX){
      const sg=x0>0?-1:1;
      if(freeRow(x0+sg,z0)){tryHop(sg,0);return true;}
    }
    /* si YA estoy en el borde de una ruta o una vía: ADENTRO primero, avanzar
       después — avanzar desde el borde deja al piloto otra vez en el borde */
    if(RN&&(RN.type==='road'||RN.type==='rail')&&Math.abs(x0)>=XMAX){
      const sg=x0>0?-1:1;
      if(stepOk(x0+sg,z0)){tryHop(sg,0);return true;}
      if(stepOk(x0,z0+1)){tryHop(0,1);return true;}
    }
    if(stepOk(x0,z0+1)){tryHop(0,1);return true;}
    /* de costado: PRIMERO HACIA EL CENTRO y sin pegarse a la pared. Antes probaba
       siempre +1 y el piloto derivaba hasta la columna del borde; ahí, en una ruta,
       no le quedaba escapatoria (x+1 fuera del mundo, x-1 con el mismo auto
       encima) y moría a los 4-19 s (medido: car@7.0 x=-3.00). */
    const dirs=px>0?[-1,1]:[1,-1];
    for(const sg of dirs){
      const nx=x0+sg;
      if(nx<XMIN||nx>XMAX)continue;
      if(RN&&RN.type!=='grass'&&Math.abs(nx)>XMAX-1)continue;
      if(stepOk(nx,z0)&&freeRow(nx,z0+1)){tryHop(sg,0);return true;}
    }
    /* quedarse quieto en la ruta es morir: salir para donde sea */
    if(!freeRow(x0,z0,PANIC)){
      if(freeRow(x0,z0+1,PANIC)){tryHop(0,1);return true;}
      /* huyendo NO hay que meterse en la columna del extremo: ahí la próxima vez
         no queda salida y es donde siguieron cayendo todas las muertes por auto
         (car@20.0/43.0 x=4.00, car@84.0/28.0/105.0 x=-4.00). Primero adentro,
         después para atrás, y sólo como último recurso al extremo. */
      for(const sg of dirs){const nx=x0+sg;
        if(Math.abs(nx)>=XMAX&&RN&&RN.type!=='grass')continue;
        if(freeRow(nx,z0,PANIC)){tryHop(sg,0);return true;}}
      if(z0>0&&freeRow(x0,z0-1,PANIC)){tryHop(0,-1);return true;}
      for(const sg of dirs)if(freeRow(x0+sg,z0,PANIC)){tryHop(sg,0);return true;}
    }
    /* CAMINAR HACIA LA COLUMNA QUE SÍ ABRE. Con tres árboles seguidos en la fila
       de arriba el piloto se quedaba clavado esperando y lo levantaba el águila
       (medido: eagle@35.9). Sólo desde el PASTO: caminar de costado en la ruta lo
       hacía comerse un auto. */
    if(RN&&RN.type==='grass'&&RA&&RA.type==='grass')for(let d=1;d<=XMAX-XMIN;d++){
      for(const sg of dirs){
        const c=x0+sg*d;
        if(c<XMIN||c>XMAX)continue;
        if(freeRow(c,z0+1)&&freeRow(x0+sg,z0)){tryHop(sg,0);return true;}
      }
    }
    /* ANTI-ÁGUILA: si la fila de arriba está tapada no hay que quedarse clavado.
       Quedarse quieto es seguro contra los autos pero a los 7,5 s aparece el
       águila y a los 10 te levanta: dos partidas largas murieron así
       (eagle@53.0 x=-3.00 y eagle@13.0 x=3.00), no atropelladas. Un jugador de
       verdad hace lo mismo: se mueve de costado sobre el pasto mientras espera
       que se abra un hueco. El paso va HACIA EL CENTRO, que es desde donde
       después hay salida para los dos lados. */
    if(RN&&RN.type==='grass'&&idleT>1.1){
      for(const sg of dirs)if(freeRow(x0+sg,z0)){tryHop(sg,0);return true;}
      /* con árboles a los dos costados no queda ni el paso al costado: retroceder
         una fila también reinicia el reloj del águila y no llega a los 2,6 de
         atraso que la despiertan por la otra vía (medido: eagle@58.0 x=2.00) */
      if(z0>0&&stepOk(x0,z0-1)){tryHop(0,-1);return true;}
    }
    return true;
  }
};
window.GAME=G;
