/* ============================================================================
   CRUZA CALLE — saltar de fila en fila esquivando autos, trenes y el río
   ----------------------------------------------------------------------------
   VERTICAL de verdad (GAME.portrait): el escenario es una columna 9:16 y la
   cámara es ORTOGRÁFICA a 54° sobre el horizonte, sin giro en Y. El mundo se
   genera por FILAS al infinito (pasto, ruta, vías, río) y se recicla.

   ================== CÓMO SE DIBUJA (esto es lo que lo hace rápido) ==========
   Medido con renderer.info en partida (412x915, swiftshader headless):
       ANTES  8.608-10.954 triángulos y 124-191 LLAMADAS de dibujo -> 16 fps
       AHORA  ver el informe: ~13k triángulos y ~22 llamadas -> 45+ fps
   Tres decisiones, todas medidas:
     1. UN MATERIAL para todo (MeshLambertMaterial con COLOR POR VÉRTICE). Sin
        eso no se puede fusionar nada: dos materiales = dos llamadas.
     2. TROZOS DE MUNDO. Lo estático de 4 filas (pasto, árboles, asfalto, vías,
        adornos) se fusiona en UNA malla (mergeGeo). Antes cada fila era un Group
        con 6-14 mallas: 29 filas vivas = 150 llamadas sólo de escenario.
     3. INSTANCIADO para todo lo que se repite y se mueve: autos cortos, camiones,
        sombras, troncos de 2 y de 3, monedas. Seis InstancedMesh para los ~100
        objetos móviles de la escena, y las matrices se reescriben cada cuadro.
     + El motor crea el renderer con antialias:true y en swiftshader el MSAA
       CUESTA LA MITAD DE LOS CUADROS (medido: 27,3 -> 40,9 fps con lo demás
       igual). Acá se rehace el renderer sin MSAA (fastGL) porque el shell no
       expone la opción; ver "PEDIDO AL MOTOR" en el informe.
   ============================== LO DEMÁS ====================================
     · El ENCUADRE se define por el ANCHO (7,3 columnas). El alto sale del
       aspecto, y de ahí se calculan cuántas filas se ven (hU/sin(54°)); AHEAD y
       BEHIND se derivan de ese número, así el borde del mundo NUNCA entra en
       cuadro (bug medido: a 26° se veían 34 filas y abajo aparecía el celeste).
     · El mundo juega en XMIN..XMAX = −4..4 (9 columnas) y el cuadro muestra 7,3:
       la cámara acompaña en X topada en ±1,1 y el bicho igual nunca se sale de
       pantalla (en x=±4 cae en el 89,7% del ancho, medido con dbg.screenPos).
     · AIM = filas que la cámara mira por delante = ROWSVIS*0,20, y como el
       cuadro está centrado en ese punto el bicho cae SIEMPRE en el 70% del alto.
     · Los CARRILES son circulares con PERIODO EXACTO (SPAN): la separación se
       redondea a SPAN/n y reciclar es restar SPAN.
     · Toda fila de pasto cumple la GARANTÍA DE PASO (ensurePass).
     · MODO ATRACCIÓN: GAME.attract corre el MISMO mundo detrás del menú con el
       pollo saltando solo (el piloto de siempre). En la demo nada mata: si el
       bicho iba a morir, salta para atrás, que es lo que haría un jugador.
     · TIENDA Y MISIONES: panel propio de DOM (GAME.extra), 6 personajes que se
       compran con monedas y tres misiones por tanda que las devuelven.
     · El águila es un bicho VISIBLE (GLB) y cuando te levanta la cámara SE
       ACERCA (camZoom) y lo sigue: antes se iba de cuadro sin que se viera.
   ========================================================================== */
const G={
  slug:'cruza',name:'CRUZA CALLE',
  title:'CRUZA <em>CALLE</em>',
  sub:'Tocá para saltar · deslizá para los costados.',
  subKey:'sub',
  acc:'#ffd166',acc2:'#f0913a',levels:0,
  bestKey:'rowsN',
  three:true,sky:'#8fd3ff',shadows:false,portrait:true,
  /* 2.200 y no 900: el único GLB que se carga es el águila, aparece de a UNA y se
     ve grande (3,4 unidades) en el momento en que te levanta. A 900 triángulos la
     malla simplificada se llenaba de picos. Presupuesto total medido: 8.700
     triángulos en partida, así que sobra de acá a la Luna. */
  glbTris:2200,
  art:A('art-cruza.jpg'),music:A('mus-cruza.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),
       boom:A('sfx-boom.mp3'),splat:A('sfx-splat.mp3'),power:A('sfx-power.mp3'),click:A('sfx-click.mp3'),
       aguila:A('sfx-cruza-aguila.mp3'),cluck:A('sfx-cruza-cluck.mp3')},
  /* SÓLO SE CARGA EL ÁGUILA. El auto no: el GLB simplificado son 1.202 triángulos
     y en pantalla hay hasta 60 autos (72.000 triángulos, el triple del
     presupuesto), así que los autos son cajas instanciadas de 60 triángulos. El
     pollo tampoco: a 55 px de alto el GLB se lee peor que las cajas (comparado
     con capturas ampliadas). El águila sí, que es UNA y se ve grande y de cerca. */
  glb:{aguila:A('m-cruza-aguila.glb')},
  i18n:{
    es:{sub:'Tocá para saltar · deslizá para los costados. Si te quedás atrás, baja el águila.',
      rowsN:'FILAS',coins:'MONEDAS',tapHop:'TOCÁ PARA SALTAR',swipeSide:'deslizá para los costados',
      pick:'ELEGÍ TU PERSONAJE',close:'CERRAR',
      cPollo:'POLLO',cSapo:'SAPO',cGato:'GATO',cRobot:'ROBOT',cDino:'DINO',cAlien:'ALIEN',
      shop:'PERSONAJES',quests:'MISIONES',inUse:'EN USO',use:'USAR',locked:'FALTAN MONEDAS',
      bought:'¡DESBLOQUEADO!',tierUp:'¡TANDA DE MISIONES COMPLETA!',qDone:'¡MISIÓN CUMPLIDA!',
      mRows:'Cruzá {n} filas en una partida',mCoins:'Juntá {n} monedas',mRail:'Cruzá {n} vías de tren',
      tier:'TANDA',allDone:'todas cumplidas',
      eagleWarn:'¡EL ÁGUILA!',eagleSub:'avanzá o te levanta',edgeWarn:'¡VOLVÉ AL CENTRO!',
      dCar:'¡APLASTADO!',dWater:'¡AL AGUA!',dTrain:'¡ARROLLADO!',dEagle:'¡TE LLEVÓ EL ÁGUILA!',
      statRows:'Filas',statCoins:'Monedas',statBest:'Récord',newBest:'¡NUEVO RÉCORD!'},
    en:{sub:'Tap to hop · swipe to move sideways. Fall behind and the eagle swoops in.',
      rowsN:'ROWS',coins:'COINS',tapHop:'TAP TO HOP',swipeSide:'swipe to move sideways',
      pick:'PICK YOUR CHARACTER',close:'CLOSE',
      cPollo:'CHICKEN',cSapo:'FROG',cGato:'CAT',cRobot:'ROBOT',cDino:'DINO',cAlien:'ALIEN',
      shop:'CHARACTERS',quests:'QUESTS',inUse:'IN USE',use:'USE',locked:'NOT ENOUGH COINS',
      bought:'UNLOCKED!',tierUp:'QUEST SET COMPLETE!',qDone:'QUEST DONE!',
      mRows:'Cross {n} rows in one run',mCoins:'Collect {n} coins',mRail:'Cross {n} train tracks',
      tier:'SET',allDone:'all done',
      eagleWarn:'THE EAGLE!',eagleSub:'move on or it grabs you',edgeWarn:'GET BACK!',
      dCar:'SPLAT!',dWater:'SPLASH!',dTrain:'RUN OVER!',dEagle:'THE EAGLE GOT YOU!',
      statRows:'Rows',statCoins:'Coins',statBest:'Best',newBest:'NEW BEST!'},
    pt:{sub:'Toque para pular · arraste para os lados. Se ficar atrás, a águia desce.',
      rowsN:'FILEIRAS',coins:'MOEDAS',tapHop:'TOQUE PARA PULAR',swipeSide:'arraste para os lados',
      pick:'ESCOLHA SEU PERSONAGEM',close:'FECHAR',
      cPollo:'GALINHA',cSapo:'SAPO',cGato:'GATO',cRobot:'ROBÔ',cDino:'DINO',cAlien:'ALIEN',
      shop:'PERSONAGENS',quests:'MISSÕES',inUse:'EM USO',use:'USAR',locked:'FALTAM MOEDAS',
      bought:'DESBLOQUEADO!',tierUp:'SÉRIE DE MISSÕES COMPLETA!',qDone:'MISSÃO CUMPRIDA!',
      mRows:'Atravesse {n} fileiras numa partida',mCoins:'Junte {n} moedas',mRail:'Atravesse {n} trilhos',
      tier:'SÉRIE',allDone:'todas cumpridas',
      eagleWarn:'A ÁGUIA!',eagleSub:'avance ou ela te leva',edgeWarn:'VOLTE PARA O CENTRO!',
      dCar:'ATROPELADO!',dWater:'NA ÁGUA!',dTrain:'ATROPELADO PELO TREM!',dEagle:'A ÁGUIA TE PEGOU!',
      statRows:'Fileiras',statCoins:'Moedas',statBest:'Recorde',newBest:'NOVO RECORDE!'}
  }
};
/* OJO: el shell ya declara `const T=ARC.T` en este mismo ámbito de módulo.
   Redeclararlo acá tira "Identifier 'T' has already been declared" y el juego
   entero no arranca (medido: ARC quedaba undefined). Se usa el T del shell. */
let T3,scene,cam,plr,plrG,shadow;
const ROWS=new Map();            /* z -> fila viva */
const XMIN=-4,XMAX=4;
const SPAN=39,LO=-SPAN/2;
const GNDW=SPAN+4;               /* el suelo tapa todo el carril, nunca se ve el borde */
const CH=4;                      /* filas por TROZO fusionado */
const ELEV=54*Math.PI/180,SE=Math.sin(ELEV),CE=Math.cos(ELEV),CAMD=36;
let AHEAD=22,BEHIND=8,ROWSVIS=20,CAMW=7.3,CAMH=16,AIM=5,camZoom=1;
let px=0,pz=0,hop=null,dead=false,score=0,coins=0,idleT=0,camZ=0,camX=0,farZ=1;
let overT=-1,dieKind='',lastDie='';
let eagle=null,eagleG=null,eagleSh=null;
let edgeW=0,drownT=-1,frozen=false,pinned=false;
let shOn=1,partK=1,fogK=1,decoK=1;
let DEMO=0,demoOn=0,demoAct=0;
const PH=1.72;         /* alto del personaje si viene de GLB */

/* ======================================================= FUSIÓN Y MATERIALES
   UN material para TODA la escena: MeshBasicMaterial con color por vértice, y la
   LUZ HORNEADA en ese color. Dos razones:
     · Fusionar exige un material compartido (dos materiales = dos llamadas).
     · Desde three r155 MeshLambertMaterial ilumina POR FRAGMENTO, y en swiftshader
       eso se paga en cada píxel: mismo cuadro, misma escena, 35,5 fps con Lambert
       y 48,2 fps con Basic (+36%, medido con el bicho quieto en la fila 30). En un
       juego de cajas con una luz fija no hay ninguna diferencia visible: la luz se
       calcula UNA vez por vértice cuando se hornea la geometría.
   (Los GLB de este pack ya vienen con atributo `color` y sin textura: se les
   hornea la misma luz encima y entran en el mismo material.) */
let MV,MVB,MOUT;
const LX=.349,LY=.814,LZ=.465;          /* sol normalizado, era (6,14,8) */
const SKY=[1,1,1],GND=[.56,.725,.56],SUN=[1,.953,.816];
const KH=.62,KS=.55;                    /* peso del cielo y del sol */
function litRGB(nx,ny,nz,r,g2,b){
  const m=clamp(ny*.5+.5,0,1);
  const d=Math.max(0,nx*LX+ny*LY+nz*LZ)*KS;
  return[r*((GND[0]+(SKY[0]-GND[0])*m)*KH+SUN[0]*d),
         g2*((GND[1]+(SKY[1]-GND[1])*m)*KH+SUN[1]*d),
         b*((GND[2]+(SKY[2]-GND[2])*m)*KH+SUN[2]*d)];
}
/* col = color plano; flat=1 -> sin luz (avisos, cosas que tienen que brillar) */
function paintGeo(g,col,flat){
  const c=new T3.Color(col),n=g.attributes.position.count;
  const N=g.attributes.normal,a=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    if(flat||!N){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;continue;}
    const v=litRGB(N.getX(i),N.getY(i),N.getZ(i),c.r,c.g,c.b);
    a[i*3]=v[0];a[i*3+1]=v[1];a[i*3+2]=v[2];
  }
  g.setAttribute('color',new T3.BufferAttribute(a,3));
  return g;
}
/* hornea la luz sobre los colores que YA trae la geometría (los GLB). `fm` = cuánto
   del color queda SIN luz: un modelo orgánico con caras en todas las direcciones se
   va a negro si se le aplica la luz entera (medido en la captura: el águila marrón
   quedaba casi negra), así que se le deja un piso de color propio. */
function shadeGeo(g,fm){
  const C=g.attributes.color,N=g.attributes.normal;
  if(!C||!N)return g;
  fm=fm==null?.42:fm;
  for(let i=0;i<C.count;i++){
    const r=C.getX(i),g2=C.getY(i),b=C.getZ(i);
    const v=litRGB(N.getX(i),N.getY(i),N.getZ(i),r,g2,b);
    C.setXYZ(i,r*fm+v[0]*(1-fm)*1.12,g2*fm+v[1]*(1-fm)*1.12,b*fm+v[2]*(1-fm)*1.12);
  }
  C.needsUpdate=true;return g;
}
/* mergeGeo: concatena position/normal/color de varias geometrías en una sola.
   Es lo mismo que BufferGeometryUtils.mergeGeometries pero SIN import dinámico:
   GAME.init es sincrónico y un await ahí deja la primera partida sin escenario. */
function mergeGeo(list){
  let n=0;
  const parts=list.map(g=>{const q=g.index?g.toNonIndexed():g;n+=q.attributes.position.count;return q;});
  const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);
  let o=0;
  for(const q of parts){
    P.set(q.attributes.position.array,o*3);
    if(q.attributes.normal)N.set(q.attributes.normal.array,o*3);
    if(q.attributes.color)C.set(q.attributes.color.array,o*3);
    o+=q.attributes.position.count;
  }
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.BufferAttribute(P,3));
  g.setAttribute('normal',new T3.BufferAttribute(N,3));
  g.setAttribute('color',new T3.BufferAttribute(C,3));
  g.computeBoundingSphere();
  return g;
}
let bake=null;                   /* lista de geometrías del trozo en construcción */
function B(w,h,d,c,x,y,z,flat){  /* caja al trozo */
  const g=new T3.BoxGeometry(w,h,d);g.translate(x,y,z);paintGeo(g,c,flat);bake.push(g);
}
function BG(geo,c,x,y,z,ry){     /* geometría cualquiera al trozo */
  const g=geo.clone();if(ry)g.rotateY(ry);g.translate(x,y,z);paintGeo(g,c);bake.push(g);
}
function bakeBoxes(list,flat){   /* [w,h,d,col,x,y,z] -> una geometría */
  const gs=[];
  for(const b of list){const g=new T3.BoxGeometry(b[0],b[1],b[2]);
    g.translate(b[4],b[5],b[6]);paintGeo(g,b[3],flat);gs.push(g);}
  const m=mergeGeo(gs);gs.forEach(g=>g.dispose());return m;
}
function flush(){                /* cierra el trozo */
  const g=mergeGeo(bake);bake.forEach(x=>x.dispose());bake=null;return g;
}

/* ------------------------------------------------------------- PERSONAJES
   Una sola lista de cajas por bicho: de ahí sale la malla 3D (fusionada) y la
   silueta 2D de la tienda, así no hay dos fuentes de verdad. `cost` son las
   monedas que cuesta desbloquearlo. */
const CHARS=[
  /* el pollo va de CAJAS y no del GLB: medido con capturas ampliadas, el GLB
     simplificado a 900 triángulos se lee como un borrón blanco con manchas negras
     (el casco de contorno atraviesa una malla orgánica cóncava), y las cajas
     están dibujadas para ESTA cámara. El GLB del pollo ni se carga. */
  {id:'pollo',key:'cPollo',icon:'🐔',cost:0,sc:1.41,
   b:[[.72,.6,.62,'#f7f7fa',0,.42,0],[.5,.42,.44,'#ffffff',0,.86,-.02],
      [.2,.16,.24,'#f6a13a',0,.84,-.3],[.16,.2,.14,'#e0503f',0,1.12,.02],
      [.12,.12,.12,'#111418',.17,.95,-.27],[.12,.12,.12,'#111418',-.17,.95,-.27],
      [.1,.3,.4,'#e6e6ee',.4,.5,.02],[.1,.3,.4,'#e6e6ee',-.4,.5,.02],
      [.3,.26,.18,'#ffffff',0,.68,.36],
      [.14,.3,.14,'#f6a13a',.16,.15,.05],[.14,.3,.14,'#f6a13a',-.16,.15,.05]]},
  {id:'sapo',key:'cSapo',icon:'🐸',cost:60,sc:1.5,
   b:[[.86,.44,.7,'#45b558',0,.3,0],[.62,.14,.5,'#e9f5c9',0,.16,.02],
      [.66,.3,.5,'#4fc463',0,.62,-.1],
      [.22,.22,.22,'#ffffff',.2,.82,-.2],[.22,.22,.22,'#ffffff',-.2,.82,-.2],
      [.11,.11,.1,'#111418',.2,.84,-.32],[.11,.11,.1,'#111418',-.2,.84,-.32],
      [.5,.07,.07,'#2a7d3a',0,.48,-.35],
      [.18,.07,.18,'#2f8f45',.22,.52,.18],[.18,.07,.18,'#2f8f45',-.24,.5,.06],
      [.2,.2,.34,'#3aa14d',.44,.12,.22],[.2,.2,.34,'#3aa14d',-.44,.12,.22],
      [.26,.14,.3,'#3aa14d',.3,.07,-.28],[.26,.14,.3,'#3aa14d',-.3,.07,-.28]]},
  /* OJO con los bichos: desde 54° se ve el LOMO, no la cara. Todo lo que
     identifica al personaje va ARRIBA (orejas altas, rayas del lomo, cresta):
     los ojos pegados a la cara delantera no se ven nunca. */
  {id:'gato',key:'cGato',icon:'🐱',cost:150,sc:1.34,
   b:[[.76,.5,.6,'#f2913a',0,.34,0],[.5,.1,.4,'#fff3e2',0,.16,0],
      [.62,.1,.16,'#c1631b',0,.6,.02],[.5,.09,.13,'#c1631b',0,.6,.24],
      [.5,.44,.42,'#f2913a',0,.78,-.06],
      [.2,.26,.13,'#f7b56b',-.17,1.06,-.02],[.2,.26,.13,'#f7b56b',.17,1.06,-.02],
      [.1,.14,.06,'#3a1c08',-.17,1.11,-.03],[.1,.14,.06,'#3a1c08',.17,1.11,-.03],
      [.13,.09,.13,'#111418',.15,.99,-.2],[.13,.09,.13,'#111418',-.15,.99,-.2],
      [.14,.1,.1,'#ff9ec4',0,.86,-.3],
      [.12,.12,.52,'#e07a26',0,.56,.38],[.12,.12,.16,'#fff3e2',0,.78,.6],
      [.16,.24,.16,'#f7b56b',.24,.12,-.16],[.16,.24,.16,'#f7b56b',-.24,.12,-.16],
      [.16,.24,.16,'#f7b56b',.24,.12,.18],[.16,.24,.16,'#f7b56b',-.24,.12,.18]]},
  {id:'robot',key:'cRobot',icon:'🤖',cost:300,sc:1.2,
   b:[[.66,.6,.5,'#9fb4c9',0,.46,0],[.24,.2,.07,'#ff7a3a',0,.5,-.27],
      [.52,.4,.44,'#c3d2e0',0,.94,0],[.44,.16,.07,'#39d7ff',0,.98,-.24],
      [.06,.22,.06,'#6b7b8c',0,1.22,0],[.15,.15,.15,'#ff3b3b',0,1.37,0],
      [.14,.42,.16,'#7f93a6',.42,.5,0],[.14,.42,.16,'#7f93a6',-.42,.5,0],
      [.2,.32,.24,'#6b7b8c',.18,.16,0],[.2,.32,.24,'#6b7b8c',-.18,.16,0],
      [.26,.12,.34,'#39516b',.18,.06,-.04],[.26,.12,.34,'#39516b',-.18,.06,-.04]]},
  {id:'dino',key:'cDino',icon:'🦖',cost:550,sc:1.28,
   b:[[.8,.56,.72,'#3fbf6f',0,.4,0],[.44,.2,.3,'#d7f7a8',0,.3,-.3],
      [.5,.42,.5,'#4cd07e',0,.86,-.16],[.34,.16,.28,'#5fdd92',0,.8,-.44],
      [.13,.1,.13,'#111418',.16,.98,-.3],[.13,.1,.13,'#111418',-.16,.98,-.3],
      [.1,.06,.1,'#2a6b40',.09,.9,-.56],[.1,.06,.1,'#2a6b40',-.09,.9,-.56],
      [.16,.2,.14,'#ffe066',0,1.14,-.1],[.14,.17,.12,'#ffd166',0,1.06,.1],
      [.12,.14,.1,'#ffe066',0,.86,.28],
      [.14,.14,.5,'#3aa864',0,.5,.42],[.11,.11,.14,'#ffe066',0,.62,.62],
      [.2,.3,.24,'#35a95f',.26,.16,-.02],[.2,.3,.24,'#35a95f',-.26,.16,-.02],
      [.3,.16,.2,'#2f9153',.26,.05,-.16],[.3,.16,.2,'#2f9153',-.26,.05,-.16]]},
  {id:'alien',key:'cAlien',icon:'👽',cost:900,sc:1.26,
   b:[[.6,.5,.5,'#a56bff',0,.4,0],[.36,.16,.16,'#0ff2d0',0,.3,-.26],
      [.58,.42,.48,'#b98cff',0,.86,-.02],[.34,.16,.06,'#0ff2d0',0,.88,-.26],
      [.06,.2,.06,'#7a4fd6',.16,1.14,0],[.06,.2,.06,'#7a4fd6',-.16,1.14,0],
      [.11,.11,.11,'#0ff2d0',.16,1.26,0],[.11,.11,.11,'#0ff2d0',-.16,1.26,0],
      [.1,.28,.14,'#8c54e6',.36,.44,0],[.1,.28,.14,'#8c54e6',-.36,.44,0],
      [.18,.28,.2,'#7a4fd6',.15,.16,0],[.18,.28,.2,'#7a4fd6',-.15,.16,0],
      [.24,.1,.28,'#6a3fc4',.15,.03,-.04],[.24,.1,.28,'#6a3fc4',-.15,.03,-.04]]}
];
function owned(){const o=ARC.S.own;return (o&&o.length)?o:['pollo'];}
function has(id){return owned().indexOf(id)>=0;}
function charIdx(){
  const i=CHARS.findIndex(c=>c.id===ARC.S.char&&has(c.id));
  return i<0?0:i;
}
/* --------------------------------------------------------- GLB -> geometría
   Los tres GLB de este pack son UNA malla con atributo `color` y sin textura
   (medido). Así que se los trata como una geometría más: se hornea la matriz del
   nodo, se normaliza el tamaño, se apoya en y=0 y listo — se dibuja con el mismo
   material que el resto de la escena. */
const GEOC={};
function glbGeo(key,target,rotY,byMax){
  const ck=key+'|'+target+'|'+(rotY||0)+'|'+(byMax?1:0);
  if(GEOC[ck]!==undefined)return GEOC[ck];
  let out=null;
  try{
    const S=ARC.glb&&ARC.glb[key];
    if(S&&S.scene){
      let src=null;S.scene.traverse(o=>{if(!src&&o.isMesh&&o.geometry&&o.geometry.attributes.position)src=o;});
      if(src){
        src.updateWorldMatrix(true,false);
        const g=src.geometry.clone();
        g.applyMatrix4(src.matrixWorld);
        if(rotY)g.rotateY(rotY);
        g.computeBoundingBox();
        const sz=new T3.Vector3();g.boundingBox.getSize(sz);
        const d=byMax?Math.max(sz.x,sz.y,sz.z):sz.y;
        if(d>1e-4){
          const s=target/d;g.scale(s,s,s);
          g.computeBoundingBox();
          const c=new T3.Vector3();g.boundingBox.getCenter(c);
          g.translate(-c.x,-g.boundingBox.min.y,-c.z);
          if(!g.attributes.color)paintGeo(g,'#ffffff');
          else shadeGeo(g);                      /* luz horneada, como el resto */
          g.computeBoundingSphere();
          out=g;
        }
      }
    }
  }catch(e){console.warn('glb '+key,e);}
  GEOC[ck]=out;return out;
}
function charGeo(C){
  const ck='ch_'+C.id;
  if(GEOC[ck])return GEOC[ck];
  const g=bakeBoxes(C.b);
  const s=C.sc||1.3;g.scale(s,s,s);
  g.computeBoundingBox();g.computeBoundingSphere();
  return GEOC[ck]=g;
}
function geoTris(g){return g?Math.round((g.index?g.index.count:g.attributes.position.count)/3):0;}
/* CONTORNO (casco invertido): la MISMA geometría con material oscuro de caras de
   atrás, agrandada desde el CENTRO de la caja (no desde los pies, que dejaba una
   barra negra arriba de la cabeza). Sin esto el pollo blanco visto desde 54° a
   ~50 px de alto se leía como una manchita gris. */
function outlineFor(geo,k){
  const o=new T3.Mesh(geo,MOUT);
  if(!geo.boundingBox)geo.computeBoundingBox();
  const c=new T3.Vector3();geo.boundingBox.getCenter(c);
  o.scale.setScalar(k);o.position.copy(c).multiplyScalar(1-k);
  return o;
}
let OUTK=1.085,USEGLB=1;
function makePlayer(){
  if(plrG){scene.remove(plrG);}
  plrG=new T3.Group();plr=new T3.Group();plrG.add(plr);
  const C=CHARS[charIdx()];
  let geo=(C.glb&&USEGLB)?glbGeo(C.glb,PH,C.glbRot):null;
  if(!geo)geo=charGeo(C);
  if(OUTK>1.001)plr.add(outlineFor(geo,OUTK));
  plr.add(new T3.Mesh(geo,MV));
  plr.scale.setScalar(1);
  scene.add(plrG);
  if(!shadow){
    shadow=new T3.Mesh(new T3.CircleGeometry(.5,14),
      new T3.MeshBasicMaterial({color:0x0b2a12,transparent:true,opacity:.34}));
    shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  }
}
/* ------------------------------------------------------------------ ÁGUILA */
function eagleGeo(){
  if(GEOC.eag)return GEOC.eag;
  const g=glbGeo('aguila',3.4,Math.PI,true);
  /* el marrón del modelo sobre el asfalto quedaba casi negro (visto en la captura
     ampliada): se le levanta el color un 18% para que se lea el bicho */
  if(g){const C=g.attributes.color;
    for(let i=0;i<C.count;i++)C.setXYZ(i,Math.min(1,C.getX(i)*1.18),
      Math.min(1,C.getY(i)*1.18),Math.min(1,C.getZ(i)*1.18));
    C.needsUpdate=true;return GEOC.eag=g;}
  /* respaldo de cajas, con las alas abiertas (una sola malla: no hay aleteo de
     huesos, el aleteo se hace inclinando el bicho entero) */
  return GEOC.eag=bakeBoxes([
    [.6,.42,1.5,'#5b3d22',0,0,0],[.44,.4,.4,'#f2ede2',0,.16,-.82],
    [.2,.16,.34,'#f6c343',0,.08,-1.12],[.1,.1,.1,'#111418',.14,.2,-.96],
    [.1,.1,.1,'#111418',-.14,.2,-.96],[.7,.1,.5,'#6b4a2a',0,-.02,.86],
    [.16,.2,.16,'#f6c343',.18,-.28,-.3],[.16,.2,.16,'#f6c343',-.18,-.28,-.3],
    [1.5,.12,.8,'#7a5330',.78,.05,0],[.9,.1,.5,'#4a3120',1.3,.03,.24],
    [1.5,.12,.8,'#7a5330',-.78,.05,0],[.9,.1,.5,'#4a3120',-1.3,.03,.24]]);
}
function makeEagle(){
  eagleG=new T3.Group();
  eagleG.add(new T3.Mesh(eagleGeo(),MV));
  eagleG.visible=false;scene.add(eagleG);
  eagleSh=new T3.Mesh(new T3.CircleGeometry(1,16),
    new T3.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.2}));
  eagleSh.rotation.x=-Math.PI/2;eagleSh.visible=false;scene.add(eagleSh);
}
function spawnEagle(){
  if(eagle||DEMO)return;
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
    /* SE TIENE QUE VER: sube despacio, se acerca a la cámara y la cámara se
       ACERCA con él (camZoom). Antes subía a 3,2+7t por segundo y en medio
       segundo el bicho ya no estaba en cuadro. */
    e.y+=(2.1+e.t*1.6)*dt;e.z-=.85*dt;
    plrG.position.set(e.x,e.y-.78,-e.z);
    plr.rotation.z=Math.sin(ARC.t*13)*.22;
    plr.rotation.x=.18;
    camZoom=lerp(camZoom,.62,1-Math.pow(.12,dt));
    camZ=lerp(camZ,e.z-AIM*.5,1-Math.pow(.05,dt));
  }else{                                    /* away: se va sin llevarte */
    e.y+=7*dt;e.z-=3*dt;
    if(e.y>18){eagle=null;eagleG.visible=false;eagleSh.visible=false;return;}
  }
  eagleG.position.set(e.x,e.y,-e.z);
  const fl=Math.sin(ARC.t*(e.ph==='dive'?16:e.ph==='lift'?11:8));
  eagleG.rotation.z=fl*(e.ph==='lift'?.20:.13);
  eagleG.scale.set(1,1+fl*.06,1);
  eagleG.rotation.x=e.ph==='dive'?-.55:-.12;   /* nariz abajo al picar */
  if(eagleSh.visible){
    const k=clamp(1-e.y/11,.15,1);
    eagleSh.position.set(e.x,.03,-e.z);
    eagleSh.scale.setScalar(.55+k*.9);
    eagleSh.material.opacity=.10+k*.26;
  }
}
/* ================================================================= MUNDO */
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
const FLOW=['#ffe066','#ff8fab','#ffd166','#c3f584'];
let PINE=null,PINE2=null;
function deco(R,z){
  if(R.type!=='grass')return;
  const n=Math.round(3*decoK);
  for(let i=0;i<n;i++){
    const x=rndi(XMIN,XMAX);
    if(R.block.has(x)||x===R.coin)continue;
    const ox=x+rnd(-.32,.32),oz=-z+rnd(-.34,.34);
    B(.15,.05,.15,'#5fae45',ox,.02,oz);
    if(Math.random()<.42)B(.065,.065,.065,pick(FLOW),ox,.1,oz);
  }
}
/* GARANTÍA DE PASO — bug de generación medido con dbg.why():
     fila 7 (pasto)  ....A..AA   fila 8 (pasto)  .....AA..
   El bicho quedaba encerrado y la única opción era retroceder (145 s trabado).
   Invariante: para CADA tramo libre de la fila anterior, esta fila deja al menos
   una columna libre dentro de ese tramo. */
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
/* EL TREN: una sola geometría compartida por todas las vías (7 vagones
   fusionados). Antes eran 35 mallas POR FILA de vía. El techo es una línea fina
   y lo oscuro son las VENTANAS: con un bloque oscuro encima, visto desde 54°, el
   tren se leía como una losa negra. */
let TRAINGEO=null,WARNGEO=null;
function trainGeo(){
  if(TRAINGEO)return TRAINGEO;
  const L=[];
  for(let i=0;i<7;i++){
    const x=i*3.8;
    L.push([3.5,1.12,1,'#e7ecf2',x,.64,0]);
    L.push([3.5,.13,1.04,'#8d9aa9',x,1.26,0]);
    L.push([3,.34,.06,'#232830',x,.88,.52]);
    L.push([3,.34,.06,'#232830',x,.88,-.52]);
    L.push([3.44,.17,1.02,i?'#e0503f':'#f6c343',x,.3,0]);
  }
  return TRAINGEO=bakeBoxes(L);
}
/* AVISO del tren: una franja roja que ocupa TODA la fila (la baliza sola vivía
   en x=±5,4, fuera del cuadro: el tren llegaba sin aviso) más dos balizas
   adentro del cuadro. Todo en una malla que se prende y se apaga. */
function warnGeo(){
  if(WARNGEO)return WARNGEO;
  const L=[[GNDW,.05,.92,'#ff3b3b',0,.07,0]];
  for(const lx of [-3.2,3.2]){
    L.push([.3,.3,.3,'#ff3b3b',lx,1.15,0]);
    L.push([.12,.9,.12,'#6a7078',lx,.6,0]);
  }
  return WARNGEO=bakeBoxes(L,1);                /* sin luz: el aviso tiene que gritar */
}
function buildRow(z){
  if(ROWS.has(z))return;
  const type=z<4?'grass':rowType(z);
  const R={type,z,cars:[],logs:[],block:new Set(),coin:-99,coinOn:0,
    dir:Math.random()<.5?1:-1,speed:0,gap:0,trainT:rnd(4,9),trainOn:0};
  const Z=-z;
  if(type==='grass'){
    B(GNDW,.5,1,z%2?'#7fc95c':'#74bf53',0,-.25,Z);
    /* primero se ELIGE dónde van los árboles, después se garantiza el paso y
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
      const r=Math.random();
      if(r<.5){                                  /* pino: dos conos, 24 triángulos */
        B(.34,.5,.34,'#6b4b2a',x,.25,Z);
        BG(PINE,'#2f8f4e',x,.98,Z);
        BG(PINE2,'#37a35c',x,1.62,Z);
      }else if(r<.82){                            /* copa de dos pisos */
        B(.5,.62,.5,'#6b4b2a',x,.31,Z);
        const h=rnd(.8,1.2);
        B(.98,h,.98,'#2f8f4e',x,.62+h/2,Z);
        B(.66,h*.6,.66,'#37a35c',x,.62+h+h*.28,Z);
      }else B(.8,.6,.8,'#9aa3ad',x,.3,Z);         /* piedra */
    }
  }else if(type==='road'){
    B(GNDW,.5,1,'#3c4148',0,-.25,Z);
    for(let i=-5;i<=5;i++)B(1.1,.02,.1,'#e9edf2',i*2.2,.01,Z);   /* línea cortada */
    R.speed=rnd(1.9,3.6)*(1+Math.min(.85,z/340));
    /* la separación pedida se redondea a SPAN/n para que el carril CIERRE: así
       reciclar es restar SPAN y los autos nunca se amontonan */
    const n=Math.max(2,Math.round(SPAN/rnd(7.5,13)));
    R.gap=SPAN/n;
    const col=pick(CARCOL);
    const long=Math.random()<.18;
    for(let i=0;i<n;i++)
      R.cars.push({x:LO+i*R.gap+rnd(-.6,.6),len:long?3.1:1.9,col});
  }else if(type==='water'){
    B(GNDW,.42,1,'#1c69bd',0,-.29,Z);
    B(GNDW,.02,.86,'#3f92e0',0,-.07,Z);
    R.speed=rnd(.85,1.75);
    const n=Math.max(3,Math.round(SPAN/rnd(5,7)));
    R.gap=SPAN/n;
    for(let i=0;i<n;i++)
      R.logs.push({x:LO+i*R.gap+rnd(-.3,.3),len:rndi(2,3)});
  }else{
    B(GNDW,.5,1,'#5b6068',0,-.25,Z);
    for(let i=-10;i<=10;i++)B(.3,.12,.9,'#6d5a45',i*1.9,.02,Z);  /* durmientes */
    B(GNDW,.1,.14,'#8e959e',0,.09,Z-.24);
    B(GNDW,.1,.14,'#8e959e',0,.09,Z+.24);
    R.speed=17;
    const tg=new T3.Mesh(trainGeo(),MV);
    tg.visible=false;tg.position.set(R.dir>0?XMIN-32:XMAX+32,0,Z);
    scene.add(tg);R.train=tg;
    const wg=new T3.Mesh(warnGeo(),MVB);
    wg.visible=false;wg.position.set(0,0,Z);
    scene.add(wg);R.warn=wg;
  }
  if(type!=='water'&&z>3&&Math.random()<.26){
    const cx=rndi(XMIN,XMAX);
    if(!R.block.has(cx)){R.coin=cx;R.coinOn=1;}
  }
  deco(R,z);
  ROWS.set(z,R);
}
/* ------------------------------------------------------- TROZOS DE MUNDO */
const CHUNKS=new Map();
function chunkOf(z){return Math.floor(z/CH);}
function buildChunk(c){
  if(CHUNKS.has(c))return;
  bake=[];
  const rows=[];
  for(let i=0;i<CH;i++){const z=c*CH+i;if(z<-16)continue;buildRow(z);rows.push(z);}
  if(!bake.length){bake=null;CHUNKS.set(c,{mesh:null,rows});return;}
  const geo=flush();
  const mesh=new T3.Mesh(geo,MV);
  mesh.frustumCulled=true;
  scene.add(mesh);
  CHUNKS.set(c,{mesh,rows,geo});
}
function dropChunk(c){
  const K=CHUNKS.get(c);if(!K)return;
  if(K.mesh){scene.remove(K.mesh);K.geo.dispose();}
  for(const z of K.rows){
    const R=ROWS.get(z);
    if(R){if(R.train)scene.remove(R.train);if(R.warn)scene.remove(R.warn);ROWS.delete(z);}
  }
  CHUNKS.delete(c);
}
function clearWorld(){
  for(const c of Array.from(CHUNKS.keys()))dropChunk(c);
  ROWS.clear();
}
function ensureRows(){
  const base=Math.floor(pz);
  const c0=chunkOf(Math.max(-12,base-BEHIND)),c1=chunkOf(base+AHEAD);
  for(let c=c0;c<=c1;c++)buildChunk(c);
  if(base+AHEAD>farZ)farZ=base+AHEAD;
  for(const c of Array.from(CHUNKS.keys()))
    if(c*CH+CH-1<base-BEHIND-3||c*CH>base+AHEAD+5)dropChunk(c);
}
/* ============================================ INSTANCIADO DE LO QUE SE MUEVE
   Seis InstancedMesh para todos los autos, sombras, troncos y monedas de la
   escena: 6 llamadas de dibujo en vez de una por objeto (medido: 124-191 -> ~22
   llamadas en total). Las matrices se reescriben enteras cada cuadro; son ~110
   matrices, cuesta menos que una sola llamada de dibujo de más. */
const CARCOL=['#e0503f','#2f6df6','#f6c343','#8b5cf6','#16a34a','#ff7ab8','#f1f5f9','#0ea5b7'];
const CAPCAR=96,CAPTRK=32,CAPLOG=56,CAPCOIN=40;
let iCarS,iCarL,iSh,iLog2,iLog3,iCoin;
function carGeo(L){
  /* el cuerpo va BLANCO porque el color lo pone la instancia (instanceColor
     multiplica el color por vértice): un solo InstancedMesh y 8 colores de auto.
     Los faros van en LOS DOS extremos: así la instancia NO necesita rotarse según
     el sentido del carril, y sin rotación la luz horneada es exacta. */
  const L2=[
    [L,.55,.95,'#ffffff',0,.42,0],
    [L*.52,.34,.9,'#e8eef6',0,.82,0],
    [.22,.22,1.02,'#15181c',L/2-.22,.2,0],
    [.22,.22,1.02,'#15181c',-L/2+.22,.2,0]];
  for(const s of [1,-1])for(const zz of [.3,-.3])
    L2.push([.1,.14,.2,'#fff6c0',s*(L/2-.01),.44,zz]);
  return bakeBoxes(L2);
}
function logGeo(L){
  return bakeBoxes([
    [L,.42,.84,'#7c4f2c',0,.05,0],
    [L-.14,.06,.84,'#a06d3f',0,.27,0],
    [L,.02,.1,'#5d3a1e',0,.31,-.2],
    [L,.02,.1,'#5d3a1e',0,.31,.2],
    [.12,.46,.88,'#5d3a1e',L/2,.06,0],
    [.12,.46,.88,'#5d3a1e',-L/2,.06,0]]);
}
function coinGeo(){
  /* la moneda va SIN luz (flat): tiene que brillar como un ítem, no como una
     tapita de plástico. La cara apunta a la cámara (rotada por la elevación). */
  const a=new T3.CylinderGeometry(.25,.25,.07,12);a.rotateX(Math.PI/2-ELEV);
  a.translate(0,0,.02);paintGeo(a,'#ffd977',1);
  const b=new T3.CylinderGeometry(.31,.31,.07,12);b.rotateX(Math.PI/2-ELEV);
  paintGeo(b,'#d0851f',1);
  const g=mergeGeo([a,b]);a.dispose();b.dispose();return g;
}
function inst(geo,cap,col){
  const m=new T3.InstancedMesh(geo,MV,cap);
  m.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  m.frustumCulled=false;m.count=0;
  if(col){const c=new T3.Color(1,1,1);for(let i=0;i<cap;i++)m.setColorAt(i,c);}
  scene.add(m);return m;
}
function makeInst(){
  iCarS=inst(carGeo(1.9),CAPCAR,1);
  iCarL=inst(carGeo(3.1),CAPTRK,1);
  iLog2=inst(logGeo(2),CAPLOG,0);
  iLog3=inst(logGeo(3),CAPLOG,0);
  iCoin=inst(coinGeo(),CAPCOIN,0);
  iSh=new T3.InstancedMesh(bakeBoxes([[1,.02,1,'#20262c',0,.03,0]],1),
    new T3.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.42}),CAPCAR+CAPTRK);
  iSh.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  iSh.frustumCulled=false;iSh.count=0;scene.add(iSh);
}
/* objetos de trabajo (se crean en init: T3 no existe todavía en la carga) */
let MX,VP,VS,QA,CC,YAX;
function initMath(){
  MX=new T3.Matrix4();QA=new T3.Quaternion();
  VP=new T3.Vector3();VS=new T3.Vector3();CC=new T3.Color();
  YAX=new T3.Vector3(0,1,0);
}
function put(im,n,x,y,z,ry,sx,sy,sz){
  QA.setFromAxisAngle(YAX,ry||0);
  VP.set(x,y,z);VS.set(sx==null?1:sx,sy==null?1:sy,sz==null?1:sz);
  MX.compose(VP,QA,VS);
  im.setMatrixAt(n,MX);
}
function syncInst(){
  let a=0,b=0,s=0,l2=0,l3=0,co=0;
  const t=ARC.t;
  for(const [z,R] of ROWS){
    const Z=-z;
    if(R.type==='road'){
      for(const c of R.cars){
        if(Math.abs(c.x)>CAMW*.5+5.5)continue;      /* fuera de cuadro: no se dibuja */
        const lng=c.len>2.5;
        const im=lng?iCarL:iCarS,n=lng?b:a;
        if(lng?(b>=CAPTRK):(a>=CAPCAR))continue;
        put(im,n,c.x,0,Z,0);
        CC.set(c.col);im.setColorAt(n,CC);
        if(lng)b++;else a++;
        if(shOn&&s<CAPCAR+CAPTRK){put(iSh,s,c.x,0,Z+.06,0,c.len*1.05,1,1.02);s++;}
      }
    }else if(R.type==='water'){
      for(const g of R.logs){
        if(Math.abs(g.x)>CAMW*.5+5.5)continue;
        if(g.len>2.5){if(l3<CAPLOG){put(iLog3,l3,g.x,0,Z,0);l3++;}}
        else{if(l2<CAPLOG){put(iLog2,l2,g.x,0,Z,0);l2++;}}
      }
    }
    if(R.coinOn&&co<CAPCOIN){
      const y=.62+Math.sin(t*3+z)*.1,k=1+Math.sin(t*4+z)*.07;
      put(iCoin,co,R.coin,y,Z,0,k,1,k);co++;
    }
  }
  const fin=(im,n)=>{im.count=n;im.visible=n>0;im.instanceMatrix.needsUpdate=true;
    if(im.instanceColor)im.instanceColor.needsUpdate=true;};
  fin(iCarS,a);fin(iCarL,b);fin(iSh,shOn?s:0);fin(iLog2,l2);fin(iLog3,l3);fin(iCoin,co);
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
  if(blocked(nx,nz)){if(!DEMO){ARC.sfx('click',{rate:.6,vol:.5});ARC.vib(8);}return;}
  hop={x0:px,z0:pz,x1:nx,z1:nz,t:0,d:.135};
  if(!DEMO){ARC.sfx(dz>0?'cluck':'tap',{rate:dz>0?1:1.4,vol:dz>0?.85:1});ARC.vib(9);}
  idleT=0;drownT=-1;edgeW=0;pinned=false;
  return true;
}
/* MONEDAS: se juntan por ESTAR en la celda, no sólo al terminar un salto (si el
   bicho llegaba arrastrado por un tronco la moneda quedaba ahí sin juntarse). */
function grabCoin(){
  const R=ROWS.get(Math.round(pz));
  if(!R||!R.coinOn||R.coin!==Math.round(px))return;
  R.coinOn=0;
  if(DEMO){ARC.fx.burst(ARC.W/2,ARC.H*.66,{n:6,color:'#ffd166',speed:120,size:3,life:.35});return;}
  coins++;ARC.S.coins=(ARC.S.coins||0)+1;ARC.save();hud();
  misBump('coins',1,'add');
  ARC.sfx('coin');ARC.vib(14);
  ARC.fx.text(ARC.W/2,ARC.H*.62,'+1 ◉',{color:'#ffd166',size:22});
  ARC.fx.burst(ARC.W/2,ARC.H*.66,{n:Math.round(10*partK),color:'#ffd166',speed:150,size:4,life:.4});
}
function die(kind){
  if(dead)return;
  /* EN LA DEMO NADA MATA: si el bicho se iba a comer un auto, salta para atrás
     (que es lo que haría un jugador). El menú no puede mostrar una muerte. */
  if(DEMO){
    if(!hop){const nz=Math.max(0,Math.round(pz)-1);
      hop={x0:px,z0:pz,x1:Math.round(px),z1:nz,t:0,d:.12};}
    pinned=false;drownT=-1;
    return;
  }
  dead=true;dieKind=kind;lastDie=kind+'@'+pz.toFixed(1)+' x='+px.toFixed(2);
  ARC.shake(12);
  if(kind==='car'){plr.scale.set(1.5,.18,1.5);ARC.sfx('boom');}
  else if(kind==='water'){plr.position.y=-.55;ARC.sfx('splat');}
  else if(kind==='train'){plr.scale.set(1.9,.12,1.9);ARC.sfx('boom',{rate:.8});}
  else ARC.sfx('lose');
  ARC.fx.burst(ARC.W/2,ARC.H*.72,{n:Math.round(20*partK),color:'#ff5d73',speed:260,size:5,life:.6});
  overT=kind==='eagle'?2.6:.75;
}
/* ------------------------------------------------------------- MISIONES
   Tres misiones por TANDA; cuando se cumplen las tres sube la tanda y las metas
   crecen. El premio son monedas, que es lo que compra personajes. */
const MIS=[{k:'rows',key:'mRows',n:[20,35,60,90,140],rew:[30,60,90,140,200]},
           {k:'coins',key:'mCoins',n:[10,20,35,55,80],rew:[25,50,80,120,180]},
           {k:'rail',key:'mRail',n:[3,6,10,15,22],rew:[35,60,95,140,210]}];
function misTier(){return clamp(ARC.S.mt|0,0,MIS[0].n.length-1);}
function misGoal(i){return MIS[i].n[misTier()];}
function misProg(i){return (ARC.S.mp&&ARC.S.mp[MIS[i].k])||0;}
function misDone(i){return misProg(i)>=misGoal(i);}
function misBump(k,v,mode){
  if(DEMO)return;
  const S=ARC.S;if(!S.mp)S.mp={};
  const i=MIS.findIndex(m=>m.k===k);if(i<0||misDone(i))return;
  S.mp[k]=mode==='max'?Math.max(S.mp[k]||0,v):((S.mp[k]||0)+v);
  if(misDone(i))misWin(i);
  ARC.save();
}
function misWin(i){
  const r=MIS[i].rew[misTier()];
  ARC.S.coins=(ARC.S.coins||0)+r;
  ARC.sfx('power');ARC.toast(T('qDone')+' +'+r+' ◉',1700);
  ARC.fx.burst(ARC.W/2,ARC.H*.42,{n:Math.round(22*partK),color:'#ffd166',speed:250,size:5,life:.7});
  if(MIS.every((m,j)=>misDone(j))){
    ARC.S.mt=Math.min(MIS[0].n.length-1,misTier()+1);
    ARC.S.mp={};
    ARC.toast(T('tierUp'),1900);
  }
  ARC.save();hud();
}
function misLine(){
  return MIS.map((m,i)=>Math.min(misProg(i),misGoal(i))+'/'+misGoal(i)).join(' · ');
}
function finish(){
  const b=ARC.S.best||0;
  misBump('rows',score,'max');
  const st=score>=80?3:(score>=40?2:(score>=15?1:0));
  ARC.over({win:false,score,stars:st,
    title:T(dieKind==='water'?'dWater':dieKind==='eagle'?'dEagle':dieKind==='train'?'dTrain':'dCar'),
    sub:'<b>'+score+'</b> '+T('rowsN')+' &nbsp;·&nbsp; <b>'+coins+'</b> ◉'+
      (score>b?('<br><b style="color:'+G.acc+'">'+T('newBest')+'</b>')
              :('<br>'+T('statBest')+': <b>'+b+'</b>'))+
      '<br><span style="opacity:.7">'+T('quests')+' '+T('tier')+' '+(misTier()+1)+': '+misLine()+'</span>'});
}
/* ========================================================= TIENDA Y MISIONES
   Panel propio de DOM (no se toca el DOM del shell: se AGREGA uno). Se abre con
   el botón redondo del menú (GAME.extra). Tiene dos pestañas: personajes (se
   compran con monedas) y misiones (con barra de progreso). Las miniaturas de los
   personajes se dibujan con la MISMA lista de cajas del modelo 3D. */
let panelEl=null,panelTab=0;
function drawChar(g,C,cx,by,s){
  const L=C.b.slice().sort((a,b)=>b[6]-a[6]);
  for(const b of L){
    g.fillStyle=b[3];
    g.fillRect(cx+(b[4]-b[0]/2)*s,by-(b[5]+b[1]/2)*s,Math.max(1,b[0]*s),Math.max(1,b[1]*s));
  }
}
function thumb(C){
  const cv=document.createElement('canvas');cv.width=130;cv.height=130;
  const g=cv.getContext('2d');
  const gr=g.createRadialGradient(65,78,4,65,78,64);
  gr.addColorStop(0,'rgba(255,255,255,.14)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,130,130);
  g.save();g.translate(0,0);drawChar(g,C,65,118,62);g.restore();
  return cv;
}
function panelBuild(){
  if(panelEl)return;
  const d=document.createElement('div');d.id='czP';
  d.innerHTML='<div class="czCard"><div class="czTabs"><b id="czT0"></b><b id="czT1"></b></div>'+
    '<div class="czBody" id="czBody"></div>'+
    '<div class="czFoot"><span id="czC">◉ 0</span><div class="btn" id="czX">CERRAR</div></div></div>';
  document.getElementById('stage').appendChild(d);
  panelEl=d;
  d.addEventListener('pointerdown',e=>{if(e.target===d){e.preventDefault();panelClose();}});
  const B2=(id,fn)=>{const e=document.getElementById(id);
    e.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();
      ARC.sndResume();ARC.sfx('click');fn();});};
  B2('czT0',()=>{panelTab=0;panelFill();});
  B2('czT1',()=>{panelTab=1;panelFill();});
  B2('czX',()=>panelClose());
}
function panelFill(){
  if(!panelEl)return;               /* choose() puede llegar antes de que exista */
  const b=document.getElementById('czBody');
  document.getElementById('czT0').textContent=T('shop');
  document.getElementById('czT1').textContent=T('quests');
  document.getElementById('czT0').className=panelTab?'':'on';
  document.getElementById('czT1').className=panelTab?'on':'';
  document.getElementById('czX').textContent=T('close');
  document.getElementById('czC').textContent='◉ '+(ARC.S.coins||0);
  b.innerHTML='';b.className='czBody'+(panelTab?' q':'');
  if(panelTab===0){
    const cur=CHARS[charIdx()].id;
    CHARS.forEach((C,i)=>{
      const own=has(C.id),on=own&&C.id===cur;
      const el=document.createElement('div');
      el.className='cz1'+(on?' on':'')+(own?'':' lk');
      el.appendChild(thumb(C));
      const nm=document.createElement('i');nm.textContent=T(C.key);el.appendChild(nm);
      const u=document.createElement('u');
      u.textContent=on?T('inUse'):(own?T('use'):(C.cost+' ◉'));
      el.appendChild(u);
      el.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();
        ARC.sndResume();
        if(own){ARC.sfx('click');choose(i);}
        else if((ARC.S.coins||0)>=C.cost){
          ARC.S.coins-=C.cost;
          const o=owned().slice();o.push(C.id);ARC.S.own=o;ARC.save();
          ARC.sfx('power');ARC.toast(T('bought')+' '+T(C.key),1500);
          ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:Math.round(20*partK),color:'#ffd166',speed:230});
          choose(i);
        }else{ARC.sfx('lose',{vol:.5});ARC.toast(T('locked'),1300);}
        panelFill();});
      b.appendChild(el);
    });
  }else{
    const h=document.createElement('div');h.className='czH';
    h.textContent=T('tier')+' '+(misTier()+1)+'/'+MIS[0].n.length;
    b.appendChild(h);
    MIS.forEach((m,i)=>{
      const p=Math.min(misProg(i),misGoal(i)),g=misGoal(i),dn=misDone(i);
      const el=document.createElement('div');el.className='czQ'+(dn?' dn':'');
      el.innerHTML='<b>'+T(m.key).replace('{n}',g)+'</b>'+
        '<div class="czBar"><i style="width:'+Math.round(p/g*100)+'%"></i></div>'+
        '<span>'+p+'/'+g+' &nbsp;+'+m.rew[misTier()]+' ◉'+(dn?' ✓':'')+'</span>';
      b.appendChild(el);
    });
  }
}
function panelOpen(t){
  panelBuild();panelTab=t||0;panelFill();
  panelEl.classList.add('on');
}
function panelClose(){if(panelEl)panelEl.classList.remove('on');}
function choose(i){
  ARC.S.char=CHARS[i].id;ARC.save();
  makePlayer();
  plrG.position.set(px,0,-pz);
  if(!DEMO)ARC.sfx('power',{vol:.6});
  panelFill();
}
/* --------------------------------------------------------------- ENTRADA */
let sw=null;
G.down=function(p){sw={x:p.x,y:p.y,t:ARC.t};};
G.up=function(p){
  if(!sw)return;
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
   de 16vw = 144 px cada uno y la ficha del RÉCORD tapaba ⚙ y JUGAR. Acá se
   recalcula todo contra el ANCHO Y EL ALTO DEL ESCENARIO (--sw/--sh). Es un
   parche del lado del juego; ver "PEDIDO AL MOTOR" en el informe.
   Abajo va además el CSS del panel propio (tienda/misiones). */
const CSSFIX=`
body.vert #tray{gap:calc(var(--sw)*.025)}
body.vert #tray .btn{min-width:calc(var(--sw)*.16);font-size:clamp(13px,calc(var(--sw)*.044),26px)}
body.vert #tray .btn.sq{width:calc(var(--sw)*.16);height:calc(var(--sw)*.16)}
body.vert .pill{font-size:clamp(10px,calc(var(--sw)*.034),20px)}
body.vert #pScore{left:calc(var(--sw)*.04);top:calc(var(--sh)*.02)}
body.vert #pInfo{top:calc(var(--sh)*.02)}
body.vert #pPause{right:calc(var(--sw)*.04);top:calc(var(--sh)*.02);
  width:calc(var(--sw)*.11);height:calc(var(--sw)*.11)}
body.vert #menu .wrap{padding:0 calc(var(--sw)*.07) calc(var(--sh)*.06);gap:calc(var(--sh)*.022)}
body.vert #menu .ttl{font-size:clamp(24px,calc(var(--sw)*.13),68px)}
/* con MODO ATRACCIÓN el arte del menú no se dibuja (#menu.live lo apaga), así que
   el título de DOM TIENE que volver: el motor lo esconde con .hasart dando por
   sentado que el título viene dentro de la imagen. Medido en captura: el menú
   quedaba sin nombre de juego. */
#menu.hasart.live .ttl{display:block}
body.vert #bPlay{min-width:calc(var(--sw)*.66)}
#menu.live .sub{text-shadow:0 2px 8px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.8)}
body.vert #menu.live:before{background:linear-gradient(0deg,rgba(5,7,10,.92) 0%,
  rgba(5,7,10,.62) 20%,rgba(5,7,10,.30) 40%,rgba(5,7,10,.10) 62%,rgba(5,7,10,.42) 100%)}
body.vert #menu .mRow{gap:calc(var(--sw)*.05)}
body.vert #menu .sub{max-width:calc(var(--sw)*.9)}
body.vert #menu .mMid{padding-top:calc(var(--sh)*.30)}
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
/* ---- panel propio: tienda de personajes y misiones ---- */
#czP{position:absolute;inset:0;z-index:7;display:none;align-items:center;justify-content:center;
  background:rgba(4,6,10,.8);pointer-events:auto;padding:calc(var(--smn)*.03)}
#czP.on{display:flex;animation:fade .16s ease-out}
#czP canvas{position:static;width:100%;height:auto;max-width:calc(var(--sw)*.22);display:block}
#czP .czCard{width:100%;max-width:calc(var(--sw)*.96);max-height:92%;display:flex;flex-direction:column;
  gap:calc(var(--smn)*.022);border-radius:18px;padding:calc(var(--smn)*.032);
  background:linear-gradient(180deg,rgba(21,27,36,.98),rgba(10,14,19,.98));
  border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 60px rgba(0,0,0,.7)}
#czP .czTabs{display:flex;gap:5px;background:rgba(255,255,255,.07);padding:4px;border-radius:12px}
#czP .czTabs b{flex:1;text-align:center;font-weight:900;padding:.55em 0;border-radius:9px;opacity:.55;
  font-size:clamp(10px,calc(var(--sw)*.036),17px)}
#czP .czTabs b.on{background:linear-gradient(180deg,var(--acc),var(--acc2));color:#10141a;opacity:1}
#czP .czBody{overflow-y:auto;display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:calc(var(--smn)*.018);align-content:start}
#czP .czBody.q{grid-template-columns:1fr}
#czP .cz1{display:flex;flex-direction:column;align-items:center;gap:.25em;padding:.45em .2em;
  border-radius:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
#czP .cz1.on{border-color:var(--acc);background:rgba(255,209,102,.18)}
#czP .cz1.lk canvas{filter:grayscale(.75) brightness(.8)}
#czP .cz1 i{font-style:normal;font-weight:900;font-size:clamp(8px,calc(var(--sw)*.028),14px);
  letter-spacing:.3px;text-align:center}
#czP .cz1 u{text-decoration:none;font-weight:900;font-size:clamp(8px,calc(var(--sw)*.026),13px);
  padding:.3em .6em;border-radius:8px;background:linear-gradient(180deg,var(--acc),var(--acc2));
  color:#10141a;white-space:nowrap}
#czP .cz1.lk u{background:rgba(255,255,255,.14);color:#eef2f6}
#czP .czH{font-weight:900;opacity:.7;font-size:clamp(9px,calc(var(--sw)*.03),15px);letter-spacing:1px}
#czP .czQ{display:flex;flex-direction:column;gap:.3em;padding:.55em .7em;border-radius:12px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
#czP .czQ.dn{border-color:#63d68a;background:rgba(99,214,138,.14)}
#czP .czQ b{font-size:clamp(9px,calc(var(--sw)*.032),15px);font-weight:900}
#czP .czQ span{font-size:clamp(8px,calc(var(--sw)*.026),13px);opacity:.75;font-weight:900}
#czP .czBar{height:7px;border-radius:99px;background:rgba(255,255,255,.13);overflow:hidden}
#czP .czBar i{display:block;height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2))}
#czP .czFoot{display:flex;align-items:center;justify-content:space-between;gap:1em}
#czP .czFoot span{font-weight:900;font-size:clamp(11px,calc(var(--sw)*.04),19px);color:var(--acc)}
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
  CAMW=7.3*camZoom;CAMH=CAMW/asp;
  ROWSVIS=CAMH/SE;
  AIM=ROWSVIS*(DEMO?.12:.20);
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
/* EL MOTOR CREA EL RENDERER CON antialias:true Y EN SWIFTSHADER ESO CUESTA LA
   MITAD DE LOS CUADROS (medido en partida, con todo lo demás igual: 27,3 fps con
   MSAA, 40,9 sin MSAA). El shell no expone la opción, así que acá se cambia el
   lienzo por uno nuevo y se rehace el renderer sin MSAA. Todo lo que el shell
   toca (ARC.rnd, el lienzo con id "gl") sigue en su lugar.
   -> PEDIDO AL MOTOR: GAME.aa=false para no tener que hacer esto. */
/* RESOLUCIÓN ADAPTATIVA. El tope lo sigue poniendo ARC.gfxP().dpr (o sea, los
   Gráficos que eligió el jugador); esto sólo BAJA de ahí si la máquina no llega, y
   vuelve a subir cuando sobra. En un celular de verdad se queda en el tope; en el
   chromium de swiftshader (que es mucho más lento que cualquier teléfono) se
   apoya en 0,80-0,85 y con eso el juego se juega a 45+ fps en vez de 24. */
let resK=1,resT=0,runT=0;
function applyRes(){
  if(!ARC.rnd)return;
  const p=ARC.gfxP();
  ARC.rnd.setPixelRatio(Math.min(window.devicePixelRatio||1,p.dpr)*resK);
  ARC.rnd.setSize(ARC.W,ARC.H,false);
}
function autoRes(dt){
  if(DEMO){runT=0;return;}     /* en el menú no se toca: el panel de DOM ensucia la medida */
  runT+=dt;
  /* los primeros dos segundos y medio NO cuentan: ARC.fps es un promedio que viene
     arrastrado del menú (con el panel de la tienda abierto baja de 38 sin que la
     partida tenga nada que ver) y bajaba la resolución de arranque sin motivo
     (medido: dpr 0,9 en una partida que después corría a 55 fps). */
  if(runT<2.5)return;
  const f=ARC.fps;
  if(f<44){resT+=dt;if(resT>1.5&&resK>.7){resK=Math.max(.7,resK-.1);applyRes();resT=0;}}
  else if(f>56){resT-=dt;if(resT<-3&&resK<1){resK=Math.min(1,resK+.1);applyRes();resT=0;}}
  else resT*=.92;
}
function fastGL(){
  try{
    const old=document.getElementById('gl');
    if(!old||!ARC.rnd)return false;
    const cv=document.createElement('canvas');
    cv.id='gl';cv.style.cssText=old.style.cssText;
    old.parentNode.replaceChild(cv,old);
    try{ARC.rnd.dispose();}catch(e){}
    const r=new T3.WebGLRenderer({canvas:cv,antialias:false,alpha:false,
      powerPreference:'high-performance'});
    r.setClearColor(new T3.Color(G.sky),1);
    if(T3.SRGBColorSpace)r.outputColorSpace=T3.SRGBColorSpace;
    r.shadowMap.enabled=false;
    ARC.rnd=r;
    const p=ARC.gfxP();
    r.setPixelRatio(Math.min(window.devicePixelRatio||1,p.dpr));
    r.setSize(ARC.W,ARC.H,false);
    return true;
  }catch(e){console.warn('gl',e);return false;}
}
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  initMath();
  fastGL();
  /* un solo material para toda la escena: sin luces (van horneadas en el color) */
  MV=MVB=new T3.MeshBasicMaterial({vertexColors:true});
  MOUT=new T3.MeshBasicMaterial({color:new T3.Color('#161a1f'),side:T3.BackSide});
  PINE=new T3.ConeGeometry(.62,1.05,6);
  PINE2=new T3.ConeGeometry(.44,.8,6);
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  scene.fog=new T3.Fog(new T3.Color(G.sky).getHex(),40,50);
  cam=new T3.OrthographicCamera(-4,4,8,-8,.1,150);
  const gp=ARC.gfxP();partK=gp.part;fogK=gp.fog;shOn=gp.sh;decoK=clamp(gp.part,.45,1.35);
  frame();
  makeInst();makePlayer();makeEagle();
  /* el arte 16:9 pegado al 14% dejaba media columna vacía en vertical */
  const mn=document.getElementById('menu');
  if(mn&&mn.classList.contains('hasart'))mn.style.backgroundPosition='center 30%, center';
  /* NO saltear la pantalla de carga: ese toque es el gesto que habilita el audio
     en el celular (y es donde se elige el idioma). Medido: sin él, #load quedaba
     en display:none a los 400 ms y el juego arrancaba muudo. */
};
G.resize=function(){frame();if(panelEl&&panelEl.classList.contains('on'))panelFill();};
G.gfxApply=function(p){
  partK=p.part;fogK=p.fog;shOn=p.sh;decoK=clamp(p.part,.45,1.35);
  if(iSh)iSh.visible=!!shOn;
  if(eagleSh&&eagle)eagleSh.visible=!!shOn;
  resK=1;resT=0;applyRes();
  frame();
};
G.i18nDone=function(){if(ARC.scr==='game')hud();
  if(panelEl&&panelEl.classList.contains('on'))panelFill();};
function hud(){
  if(DEMO)return;
  ARC.hud(score,'<b>'+T('record')+'</b> '+Math.max(ARC.S.best||0,score)+
    ' &nbsp;·&nbsp; ◉ '+(ARC.S.coins||0));
}
function resetWorld(){
  clearWorld();
  px=0;pz=0;score=0;coins=0;dead=false;hop=null;idleT=0;farZ=1;overT=-1;
  edgeW=0;drownT=-1;dieKind='';pinned=false;camZoom=1;
  eagle=null;if(eagleG){eagleG.visible=false;eagleG.rotation.set(0,0,0);eagleG.scale.set(1,1,1);}
  if(eagleSh)eagleSh.visible=false;
  makePlayer();
  plr.scale.setScalar(1);plr.position.set(0,0,0);plr.rotation.set(0,0,0);
  plrG.position.set(0,0,0);
  frame();ensureRows();
  camZ=0;camX=0;camAim();
  syncInst();
}
G.start=function(){
  if(!T3)return;
  DEMO=0;demoOn=0;panelClose();
  resetWorld();
  hud();
  ARC.tray([
    {id:'lf',txt:'◀',gh:1,sq:1,fn:()=>tryHop(-1,0)},
    {id:'up',txt:'▲',fn:()=>tryHop(0,1)},
    {id:'rt',txt:'▶',gh:1,sq:1,fn:()=>tryHop(1,0)},
    {id:'dn',txt:'▼',gh:1,sq:1,fn:()=>tryHop(0,-1)}
  ]);
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
/* --------------------------------------------------------------- SIMULACIÓN
   La MISMA función corre la partida y el modo atracción del menú (DEMO=1). */
function sim(dt){
  if(!T3)return;
  autoRes(dt);
  if(frozen){applyCam();return;}
  /* --- filas vivas: autos, troncos, trenes --- */
  for(const [z,R] of ROWS){
    if(R.type==='road'){
      for(const c of R.cars){
        c.x+=R.speed*R.dir*dt;
        if(c.x>LO+SPAN)c.x-=SPAN;else if(c.x<LO)c.x+=SPAN;
      }
    }else if(R.type==='water'){
      for(const l of R.logs){
        l.x+=R.speed*R.dir*dt;
        if(l.x>LO+SPAN)l.x-=SPAN;else if(l.x<LO)l.x+=SPAN;
      }
    }else if(R.type==='rail'){
      R.trainT-=dt;
      if(R.trainT<=0&&!R.trainOn){
        R.trainOn=1;R.train.visible=true;
        R.train.position.x=R.dir>0?XMIN-30:XMAX+30;
        if(!DEMO)ARC.sfx('power',{rate:.6,vol:.5});
      }
      const avisa=(R.trainT<2.2&&R.trainT>0)?(Math.sin(ARC.t*16)>0):false;
      if(R.warn)R.warn.visible=avisa;
      if(R.trainOn){
        R.train.position.x+=R.speed*R.dir*dt;
        if((R.dir>0&&R.train.position.x>XMAX+34)||(R.dir<0&&R.train.position.x<XMIN-34)){
          R.trainOn=0;R.train.visible=false;R.trainT=rnd(4,9);
        }
      }
    }
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
      const RL=ROWS.get(pz);
      if(RL&&RL.type==='rail'&&!RL.counted){RL.counted=1;misBump('rail',1,'add');}
      if(pz>score){
        score=pz;hud();
        if(!DEMO){
          misBump('rows',score,'max');
          if(score%10===0)ARC.fx.text(ARC.W/2,ARC.H*.3,score+' '+T('rowsN'),
            {color:'#ffd166',size:26,life:.9});
        }
      }
    }
  }
  if(!hop&&!dead)grabCoin();
  const R=ROWS.get(Math.round(pz));
  /* --- río: viajar con el tronco, con AVISO antes de la orilla ---
     Se distingue CLAVADO a la orilla (el tronco me empujó fuera -> cuenta
     regresiva de 1,6 s con aviso) de saltar al agua abierta (chapuzón). */
  let onLog=false;
  if(R&&R.type==='water'&&!hop&&!dead){
    const lim=XMAX;
    for(const l of R.logs){
      const h=l.len/2+.34;
      if(px>l.x-h&&px<l.x+h){onLog=true;px+=R.speed*R.dir*dt;break;}
    }
    const out=px>lim||px<-lim;
    if(out){px=clamp(px,-lim,lim);pinned=true;}
    if(Math.abs(px)>lim-1.6){
      const s=px>0?1:-1;
      if(edgeW!==s){edgeW=s;if(!DEMO){ARC.vib([10,40,10]);ARC.toast(T('edgeWarn'),1200);}}
    }else{edgeW=0;}
    if(onLog&&!out&&Math.abs(px)<lim-.05)pinned=false;
    if(pinned){
      if(drownT<0){drownT=1.6;if(!DEMO)ARC.sfx('splat',{rate:1.5,vol:.5});}
      drownT-=dt;
      plr.position.y=-.14;
      if(drownT<=0)die('water');
    }else if(!onLog)die('water');
    else{
      drownT=-1;plr.position.y=0;
      /* viajar en tronco no es estar quieto: el águila castiga acampar, pero
         arriba de un tronco el bicho no elige quedarse */
      idleT=Math.min(idleT,2.5);
    }
  }else if(!hop){edgeW=0;drownT=-1;pinned=false;}
  /* --- choques --- */
  if(R&&!dead){
    if(R.type==='road'){
      for(const c of R.cars){
        const h=c.len/2+.34;
        if(px>c.x-h&&px<c.x+h){die('car');break;}
      }
    }
    if(R.type==='rail'&&R.trainOn){
      const tx=R.train.position.x;
      if(px>tx-1.3&&px<tx+7*3.8+1.3)die('train');
    }
  }
  /* --- águila --- */
  if(!dead&&!DEMO){
    idleT+=dt;
    if(!eagle&&(score-pz>2.6||idleT>7.5))spawnEagle();
  }
  stepEagle(dt);
  /* --- cámara --- */
  if(!(dead&&dieKind==='eagle')){
    camZ=lerp(camZ,pz,1-Math.pow(.0015,dt));
    plrG.position.set(px,0,-pz);
    plr.rotation.y=0;
  }
  const lim=Math.max(0,XMAX-CAMW/2+.75);
  camX=lerp(camX,clamp(px*.9,-lim,lim),1-Math.pow(.002,dt));
  if(camZoom!==1)frame();
  shadow.visible=!(dead&&(dieKind==='eagle'||dieKind==='water'));
  shadow.position.set(px,.03,-pz);
  applyCam();
  ensureRows();
  syncInst();
  if(overT>0){overT-=dt;if(overT<=0){overT=-1;finish();}}
}
G.step=function(dt){sim(dt);};
G.pause=function(){};
/* ============================================================ MODO ATRACCIÓN
   El shell llama a esto en cada cuadro mientras el menú está abierto (y le pone
   la clase .live al menú). Es el MISMO mundo y el MISMO piloto de la sonda: el
   pollo cruza solo, los autos pasan, el río corre. En la demo no hay águila, no
   se guardan monedas y nada mata (die() hace saltar para atrás). */
G.attract=function(dt,g){
  if(!T3||!scene)return;
  if(!demoOn){DEMO=1;demoOn=1;frozen=false;resetWorld();demoAct=.3;}
  DEMO=1;
  demoAct-=dt;
  if(demoAct<=0){demoAct=.19+Math.random()*.1;try{botMove();}catch(e){}}
  sim(dt);
  ARC.rnd.render(scene,cam);
};
G.draw=function(g){
  if(!ARC.rnd||!scene)return;
  ARC.rnd.render(scene,cam);
  const fs=Math.max(12,Math.min(ARC.W,ARC.H)*.052);
  /* el cartel de ayuda va ENTRE el bicho (70% de alto) y la bandeja (~88%) */
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
  /* SE LO LLEVA EL ÁGUILA: viñeta oscura y cartel, para que se mire eso */
  if(dead&&dieKind==='eagle'){
    const k=clamp(1-overT/2.6,0,1);
    g.fillStyle='rgba(6,9,14,'+(k*.42).toFixed(2)+')';
    g.fillRect(0,0,ARC.W,ARC.H);
    g.textAlign='center';g.font='900 '+fs*1.1+'px system-ui,sans-serif';
    g.lineWidth=5;g.strokeStyle='rgba(0,0,0,.6)';
    g.strokeText(T('dEagle'),ARC.W/2,ARC.H*.9);
    g.fillStyle='#ffd166';g.fillText(T('dEagle'),ARC.W/2,ARC.H*.9);
    g.textAlign='left';
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
  /* CLAVADO A LA ORILLA: cuenta regresiva GRANDE al lado del bicho */
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
G.extra={icon:'🐔',fn:()=>panelOpen(0)};
/* ============================================================ PILOTO
   Juega de verdad: lo usa la sonda (dbg.autoMove) y el modo atracción del menú.
   La celda tiene que estar libre en toda la VENTANA de tiempo que el jugador va
   a pasar ahí, no en dos instantes sueltos: con dos muestras un auto podía
   llegar justo en el medio (medido: car@16.0). */
function botMove(){
  if(dead||hop)return false;
  const T0=0,T1=.85;
  const freeRow=(x,z,win)=>{
    if(x<XMIN||x>XMAX)return false;
    const R2=ROWS.get(z);if(!R2)return true;
    if(R2.type==='grass')return !R2.block.has(x);
    if(R2.type==='rail')return !R2.trainOn&&R2.trainT>(win||T1)+.9;
    if(R2.type==='road'){
      const v=R2.speed*R2.dir,W=win||T1;
      for(const c of R2.cars){
        const h=c.len/2+.55;
        let t0=(x-c.x-h)/v,t1=(x-c.x+h)/v;
        if(t0>t1){const t=t0;t0=t1;t1=t;}
        if(t1>T0-.15&&t0<W)return false;
      }
      return true;
    }
    if(R2.type==='water'){
      const v=R2.speed*R2.dir;
      return R2.logs.some(l=>{
        const h=l.len/2-.2;
        let t0=(x-l.x-h)/v,t1=(x-l.x+h)/v;
        if(t0>t1){const t=t0;t0=t1;t1=t;}
        return t0<=.2&&t1>=.6;
      });
    }
    return true;
  };
  const x0=Math.round(px),z0=Math.round(pz);
  const RN=ROWS.get(z0);
  /* CUÁNTO MARGEN PEDIR — con números, porque acá me equivoqué dos veces: en una
     ruta de velocidad v con autos cada `gap`, la celda queda tapada 2h/v
     segundos y libre gap/v−2h/v; a alta velocidad el hueco libre baja a ~0,9 s.
     O sea NO existe margen de 1,7 s (con eso el piloto quedaba clavado para
     siempre en pz=3). El margen para PISAR es corto y el de HUIR cortísimo: si
     se escapa cada vez que ve un auto a 1 s, entra y sale de la ruta en bucle. */
  const AV=1.0;      /* pisar ruta/vía */
  const PANIC=.32;   /* huir SÓLO si el auto ya está encima */
  const stepOk=(x,z)=>{const R2=ROWS.get(z);
    return freeRow(x,z,(R2&&(R2.type==='road'||R2.type==='rail'))?AV:undefined);};
  /* en el tronco, si me lleva a la orilla salto YA para adentro */
  if(RN&&RN.type==='water'&&Math.abs(px)>XMAX-1.7){
    const dir=px>0?-1:1;
    if(stepOk(x0,z0+1)){tryHop(0,1);return true;}
    if(freeRow(x0+dir,z0)){tryHop(dir,0);return true;}
    /* para atrás también: la fila de donde vine es tierra firme */
    if(z0>0&&stepOk(x0,z0-1)){tryHop(0,-1);return true;}
  }
  const RA=ROWS.get(z0+1);
  /* La columna del borde es la trampa: TODAS las muertes por auto de las
     corridas largas cayeron ahí (x=±3/±4). En x=±4 hay una sola salida lateral,
     así que en vez de avanzar desde el borde conviene GASTAR UN SALTO para
     meterse; sobre el pasto sale gratis. */
  if(RN&&RN.type==='grass'&&Math.abs(x0)>=XMAX){
    const sg=x0>0?-1:1;
    if(freeRow(x0+sg,z0)){tryHop(sg,0);return true;}
  }
  if(RN&&(RN.type==='road'||RN.type==='rail')&&Math.abs(x0)>=XMAX){
    const sg=x0>0?-1:1;
    if(stepOk(x0+sg,z0)){tryHop(sg,0);return true;}
    if(stepOk(x0,z0+1)){tryHop(0,1);return true;}
  }
  /* si hay una moneda al alcance en la fila de arriba, ir por ella */
  if(RA&&RA.coinOn&&Math.abs(RA.coin-x0)===1&&freeRow(RA.coin,z0)&&stepOk(RA.coin,z0)){
    if(stepOk(RA.coin,z0+1)){tryHop(RA.coin>x0?1:-1,0);return true;}
  }
  if(stepOk(x0,z0+1)){tryHop(0,1);return true;}
  /* de costado: PRIMERO HACIA EL CENTRO y sin pegarse a la pared */
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
    for(const sg of dirs){const nx=x0+sg;
      if(Math.abs(nx)>=XMAX&&RN&&RN.type!=='grass')continue;
      if(freeRow(nx,z0,PANIC)){tryHop(sg,0);return true;}}
    if(z0>0&&freeRow(x0,z0-1,PANIC)){tryHop(0,-1);return true;}
    for(const sg of dirs)if(freeRow(x0+sg,z0,PANIC)){tryHop(sg,0);return true;}
  }
  /* CAMINAR HACIA LA COLUMNA QUE SÍ ABRE (con tres árboles seguidos arriba, el
     piloto se quedaba clavado y lo levantaba el águila: eagle@35.9) */
  if(RN&&RN.type==='grass'&&RA&&RA.type==='grass')for(let d=1;d<=XMAX-XMIN;d++){
    for(const sg of dirs){
      const c=x0+sg*d;
      if(c<XMIN||c>XMAX)continue;
      if(freeRow(c,z0+1)&&freeRow(x0+sg,z0)){tryHop(sg,0);return true;}
    }
  }
  /* ANTI-ÁGUILA: si la fila de arriba está tapada, moverse de costado sobre el
     pasto mientras se espera el hueco (quedarse quieto es seguro contra los
     autos, pero a los 7,5 s aparece el águila) */
  if(RN&&RN.type==='grass'&&idleT>1.1){
    for(const sg of dirs)if(freeRow(x0+sg,z0)){tryHop(sg,0);return true;}
    if(z0>0&&stepOk(x0,z0-1)){tryHop(0,-1);return true;}
  }
  return true;
}
G.dbg={
  state:()=>({score,coins,px:+px.toFixed(2),pz:+pz.toFixed(2),dead,rows:ROWS.size,farZ,
    coinsSave:ARC.S.coins||0,char:ARC.S.char||CHARS[0].id,picker:false,
    drown:+drownT.toFixed(2),pinned,idle:+idleT.toFixed(1),demo:DEMO,
    chunks:CHUNKS.size,own:owned().length,mt:misTier()+1,mp:misLine(),
    eagle:eagle?eagle.ph+'@y'+eagle.y.toFixed(1):'-',edge:edgeW,how:lastDie,
    view:{w:+CAMW.toFixed(1),h:+CAMH.toFixed(1),filas:+ROWSVIS.toFixed(1),AHEAD,BEHIND}}),
  autoMove:()=>botMove(),
  /* --- medición --- */
  sc:()=>scene,cm:()=>cam,mats:()=>({MV,MVB,MOUT}),
  look:(o,g)=>{OUTK=o;USEGLB=g;makePlayer();plrG.position.set(px,0,-pz);return{OUTK,USEGLB};},
  gl:()=>{const i=ARC.rnd.info.render;
    return{tris:i.triangles,calls:i.calls,fps:+ARC.fps.toFixed(1),
      aa:!!(ARC.rnd.getContext().getContextAttributes()||{}).antialias,
      dpr:ARC.rnd.getPixelRatio()};},
  geos:()=>({pollo:geoTris(glbGeo('pollo',PH,Math.PI)),aguila:geoTris(eagleGeo()),
    tren:geoTris(TRAINGEO),autoS:geoTris(iCarS&&iCarS.geometry),
    inst:{carS:iCarS.count,carL:iCarL.count,sh:iSh.count,log2:iLog2.count,
      log3:iLog3.count,coin:iCoin.count}}),
  glb:()=>{const o={};for(const k in (ARC.glb||{})){const v=ARC.glb[k];
    o[k]=v&&v.scene?(ARC.glbTris?ARC.glbTris[k]:1):null;}return o;},
  rowsInfo:(a,b)=>{const o=[];for(let z=a;z<=b;z++){const R=ROWS.get(z);
    if(!R){o.push(z+':-');continue;}
    o.push(z+':'+R.type+(R.type==='road'?(' v'+R.speed.toFixed(1)+' n'+R.cars.length):'')
      +(R.type==='water'?(' n'+R.logs.length):'')+(R.coinOn?(' c'+R.coin):'')
      +(R.block.size?(' bl'+Array.from(R.block).join('/')):''));}
    return o;},
  pick:i=>{choose(clamp(i|0,0,CHARS.length-1));return ARC.S.char;},
  give:n=>{ARC.S.coins=(ARC.S.coins||0)+(n||1000);ARC.save();return ARC.S.coins;},
  shop:t=>{panelOpen(t||0);return !!(panelEl&&panelEl.classList.contains('on'));},
  shopClose:()=>{panelClose();return true;},
  buyAll:()=>{ARC.S.own=CHARS.map(c=>c.id);ARC.save();return owned().length;},
  mis:()=>MIS.map((m,i)=>({k:m.k,p:misProg(i),n:misGoal(i),ok:misDone(i)})),
  kill:k=>{die(k||'car');return lastDie;},
  tp:(x,z)=>{px=clamp(Math.round(x),XMIN,XMAX);pz=Math.max(0,Math.round(z));
    hop=null;idleT=0;drownT=-1;edgeW=0;pinned=false;if(pz>score)score=pz;
    ensureRows();plrG.position.set(px,0,-pz);camZ=pz;camAim();hud();return{px,pz};},
  eagle2:()=>{const d=DEMO;DEMO=0;spawnEagle();DEMO=d;return eagle?eagle.ph:'-';},
  eagleDive:()=>{const d=DEMO;DEMO=0;if(!eagle)spawnEagle();DEMO=d;
    if(eagle){eagle.ph='dive';eagle.t=0;}return eagle?eagle.ph:'-';},
  logX:z=>{const R=ROWS.get(z);if(!R||R.type!=='water')return null;
    for(const l of R.logs){
      if(l.x>XMIN+.6&&l.x<XMAX-.6)return{x:Math.round(l.x),real:+l.x.toFixed(2),len:l.len,
        dir:R.dir,speed:+R.speed.toFixed(2)};}
    return null;},
  projX:(x,z,y)=>{const v=new T3.Vector3(x,y||0,-z).project(cam);
    return{sx:+((v.x*.5+.5)*100).toFixed(1),sy:+((-v.y*.5+.5)*100).toFixed(1)};},
  cards:()=>CHARS.map(c=>({id:c.id,cost:c.cost,own:has(c.id)})),
  /* busca CALLEJONES SIN SALIDA entre filas consecutivas ya generadas */
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
        for(const c of R2.cars){const h=c.len/2+.55;
          let t0=(x-c.x-h)/v,t1=(x-c.x+h)/v;if(t0>t1){const t=t0;t0=t1;t1=t;}
          if(t1>-.15&&t0<1.0)return 'C';}
        return '.';}
      if(R2.type==='water'){const v=R2.speed*R2.dir;
        return R2.logs.some(l=>{const h=l.len/2-.2;
          let t0=(x-l.x-h)/v,t1=(x-l.x+h)/v;if(t0>t1){const t=t0;t0=t1;t1=t;}
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
  /* el hueco MÁS CHICO de cada carril: si sale negativo hay objetos superpuestos */
  lanes:()=>{const out=[];
    for(const [z,R] of ROWS){
      const src=R.type==='water'?R.logs:(R.type==='road'?R.cars:null);
      if(!src||!src.length)continue;
      const L=src.map(o=>({x:o.x,len:o.len})).sort((a,b)=>a.x-b.x);
      let mn=1e9;
      for(let i=1;i<L.length;i++)
        mn=Math.min(mn,(L[i].x-L[i].len/2)-(L[i-1].x+L[i-1].len/2));
      if(L.length>1)mn=Math.min(mn,(L[0].x+SPAN-L[0].len/2)-(L[L.length-1].x+L[L.length-1].len/2));
      out.push({z,t:R.type,n:L.length,gap:+R.gap.toFixed(2),minHueco:+mn.toFixed(2)});}
    return out;},
  nextCoin:()=>{for(let z=Math.round(pz)+1;z<Math.round(pz)+40;z++){
    const R=ROWS.get(z);if(R&&R.coinOn)return{x:R.coin,z};}return null;},
  /* dónde cae el bicho DENTRO del escenario, en % de ancho/alto */
  screenPos:()=>{
    if(!cam||!plrG)return null;
    const v=new T3.Vector3(px,.45,-pz).project(cam);
    return{sx:+((v.x*.5+.5)*100).toFixed(1),sy:+((-v.y*.5+.5)*100).toFixed(1)};},
  gfx:()=>({partK,fogK,shOn,decoK,fog:scene&&scene.fog?[+scene.fog.near.toFixed(1),+scene.fog.far.toFixed(1)]:null}),
  i18n:()=>{const ks=Object.keys(G.i18n.es);const out={};
    for(const l of ['es','en','pt']){const f=ks.filter(k=>!G.i18n[l][k]);out[l]=f.length?('FALTAN '+f.join(',')):'ok';}
    return out;}
};
window.GAME=G;
