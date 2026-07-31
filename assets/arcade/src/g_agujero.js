/* ============================================================================
   AGUJERO — un pozo negro que se come el barrio y crece
   ----------------------------------------------------------------------------
   Arrastrá para mover el pozo. Se traga TODO lo que sea más chico que él y cada
   cosa lo agranda: primero faroles y bancos, después árboles y autos, al final
   kioscos y casas. Hay pozos RIVALES comiendo la misma cuadra y cada barrio te
   pide un OBJETIVO: si no lo cumplís o quedás último, perdés.

   ==================== LO QUE SE ARREGLÓ EN ESTA PASADA ====================
   El usuario dijo "no se gana ni se pierde". Medido con _agm.js (900x430,
   swiftshader, piloto __bot llamando dbg.autoMove en cada cuadro):

   · LA RONDA MORÍA A LOS 24 SEGUNDOS. A los 24 s el censo de props llegaba a
     CERO (props:0 en dbg.state) con masa 298 y quedaban ¡62 segundos! de reloj
     sin nada que comer: el resultado estaba decidido y el jugador miraba el
     cronómetro. Dos arreglos:
       1. la ronda dura 56-46 s según el barrio (era 92-lvl*4 = 88 s en el 1);
       2. EL BARRIO SE RECONSTRUYE (obras): lo que se cae reaparece en otro lado.
     El respawn REUSA la instancia muerta del mismo InstancedMesh, así que el
     censo, los triángulos y las llamadas de dibujo NO se mueven ni un punto: la
     ronda entera se juega con los mismos 6 draw calls de props.
   · NO HABÍA OBJETIVO. Ahora cada barrio pide algo concreto (comé N cosas /
     llegá a N de masa / terminá primero), se anuncia en una tarjeta al empezar,
     tiene barra de progreso en el HUD y decide el resultado: GANÁS si cumplís y
     NO quedás último. Se puede perder de verdad (medido: con el piloto apagado
     el barrio 1 termina en PUESTO 3, 0 estrellas).
   · LOS RIVALES ARRANCABAN GANANDO 53-64 A 5. Nacían sobre los props y comían a
     ritmo completo desde el cuadro 1. Ahora comen con un factor por barrio
     (0,50 + lvl*0,08) y una BANDA: si van más del 15% arriba del jugador comen
     al 55%, si están al 60% o menos comen al 135%. Los primeros 6 segundos van
     al 60%. Resultado: la carrera se mantiene leíble y los últimos 10 segundos
     deciden.
   · VELOCIDAD (medido con renderer.info EN PARTIDA, 900x430 swiftshader):
     ANTES 23.698 triángulos / 22 llamadas / 24 fps de mediana (mínimo 13).
     Qué se hizo, por orden de lo que MIDIÓ:
       · props = el costo #1 (esconderlos: 22 -> 40 fps). FUERA LOS GLB: bajados a
         150 triángulos quedaban hechos pedazos (capturas F-ag-glb-cerca contra
         F-ag-box-cerca) y encima costaban más que la geometría propia (150 contra
         112 el árbol y 84 el auto y la casa). Sale más barato, se ve un orden
         mejor y el juego pesa 600 kB menos.
       · la NIEBLA de three era el otro cuello: sacarla de las capas de relleno
         (campo, suelo, rayas) pasó de 39 a 60 fps con dpr 1. Se queda sólo en
         props y cerco, que ocupan poca pantalla.
       · la escena viva del menú se dibuja a la MITAD de cuadros: el menú pasó de
         18 a 55 fps (las animaciones de CSS del menú necesitan cuadros también).
       · las rayas del asfalto eran CAJAS: 2.160 triángulos para pintar cuatro
         píxeles. Ahora son dos triángulos cada una (planos): 2.160 -> 300.
       · resolución dinámica propia: si baja de 36 fps se baja el pixelRatio del
         renderer hasta 0,72 y se recupera al pasar 52. Es lo único que garantiza
         el objetivo en un rasterizador de software, y en el celular ni se activa.
     DESPUÉS: ver el informe (objetivo <=15.000 triángulos, <=60 llamadas, >=40 fps).
   · MENÚ VIVO: GAME.attract corre una partida sola (tres pozos comiéndose el
     barrio) con la cámara orbitando el pozo grande, y se reinicia cada ~26 s.
   · CONTENIDO: monedas por ronda (masa/3 + bonus por objetivo, puesto y racha),
     TIENDA DE POZOS con 6 pozos desbloqueables (cada uno con su ventaja), racha
     de bocados con multiplicador, y remate de fin con puesto, masa, objetivo,
     estrellas y monedas.

   ==================== LO QUE YA ESTABA MEDIDO (no deshacer) ====================
   · EL CANTO DEL PLATO. El barrio es un plato de 26 de medio lado y la cámara va
     DETRÁS del pozo (en +z): pegado al borde la cámara se pasaba del plato y se
     veía el FILO y el cielo. El afuera son tres cosas: CERCO de vereda + seto en
     MAP+1,6 (tapa el filo y dice dónde termina la cuadra), plato de pasto hasta
     MAP+4 y un anillo de CAMPO hasta 150 con el color degradado hacia el cielo
     POR DISTANCIA AL BARRIO (la niebla de three se mide desde la cámara: con la
     cámara encima del pozo el afuera caía entero dentro de fog.near y quedaba
     una plancha de verde plano). El pozo se clampea con `FENCE-.55-h.r`: el ARO
     entero queda del lado de adentro.
   · UNA SOLA REGLA para comer (`canEat`). Tener una para comer y otra para
     elegir objetivo trababa a los rivales: se paraban encima de un auto que no
     podían tragar y volvían a elegirlo (distancia cero) para siempre.
   · RIVALES MÁS LISTOS, NO MÁS RÁPIDOS: tope de velocidad debajo del jugador.
   · LO QUE CUESTA ES EL RELLENO DEL SUELO: el suelo se EMBALDOSA con una malla
     sola de color por vértice (pasto, vereda y asfalto sin capas superpuestas),
     lo plano y horizontal va con MeshBasicMaterial (una superficie horizontal
     con luz hemisférica + sol da color constante) y el campo es un ANILLO y no
     un disco (el disco pintaba toda la pantalla DEBAJO del plato).
   · LAS LUCES VAN EN UNIDADES FÍSICAS: three moderna deja el Lambert en
     albedo*(intensidad/π), así que hemi 2,15 + sol 1,35 (≈π veces 1,0 y 0,6).
   · TRAGAR EN DOS TIEMPOS: la cosa se inclina y se desliza (avisa "esto te lo
     podés tragar"), y cuando el centro entra se suelta y cae girando.
   · MODELOS: auto, árbol y casa de Higgsfield, normalizados por HUELLA y no por
     alto (lo que decide si algo entra es el radio).
   ========================================================================== */
const G={
  slug:'agujero',name:'AGUJERO',
  title:'A<em>GUJERO</em>',
  sub:'Movés el pozo con el dedo y te tragás el barrio.',
  subKey:'sub',
  acc:'#c084fc',acc2:'#8b5cf6',levels:6,bestKey:'mass',bestLabel:'MASA',
  three:true,sky:'#cfe3f5',shadows:false,
  art:A('art-agujero.jpg'),music:A('mus-agujero.m4a'),
  /* MEDIDO archivo por archivo (decodificados en el navegador, pico de la onda):
     del set compartido están MUDOS sfx-win (.016), sfx-lose (.007), sfx-click
     (.001), sfx-splat (.004) y sfx-shoot (.024), y sfx-tap apenas llega a .042.
     Como el motor toca 'tap' en cada botón y 'win'/'lose' en el final, acá las
     CLAVES se apuntan a archivos que sí suenan: la clave es lo que pide el motor,
     el archivo es cosa del juego. Audibles: power .84, boom .80, coin .75,
     glass .70, wood .46, groan .27, pop .23. */
  sfx:{pop:A('sfx-pop.mp3'),           /* farol y banco: lo chico */
       wood:A('sfx-wood.mp3'),         /* árbol: madera */
       glass:A('sfx-glass.mp3'),       /* auto: chapa y vidrio */
       boom:A('sfx-agujero-derrumbe.wav'), /* kiosco y casa: derrumbe propio */
       power:A('sfx-power.mp3'),       /* subir de tamaño */
       /* 'click' NO se declara a propósito: el tic de los últimos 10 segundos
          suena 10 veces por ronda y con sfx-coin.mp3 (que es una MONEDA) quedaba
          como si estuvieras juntando plata en la cuenta atrás. Sin archivo, el
          motor cae al blip sintetizado de 1400 Hz, que es justo un tic seco, no
          pesa nada y no hay que generar ningún asset nuevo. */
       coin:A('sfx-coin.mp3'),
       tap:A('sfx-pop.mp3'),           /* botones (sfx-tap está casi mudo) */
       win:A('sfx-power.mp3'),lose:A('sfx-groan.mp3')},
  extra:{icon:'◉',fn:()=>openShop()},
  i18n:{
    es:{sub:'Movés el pozo con el dedo y te tragás el barrio: cada cosa que cae te agranda. Los rivales comen la misma cuadra y el pozo grande se traga al chico.',
      mass:'MASA',time:'TIEMPO',you:'VOS',rival:'RIVAL',
      hint:'ARRASTRÁ PARA MOVER EL POZO',hint2:'primero lo chico',
      grew:'¡MÁS GRANDE!',last10:'¡ÚLTIMOS 10 SEGUNDOS!',
      ateRival:'¡TE COMISTE UN RIVAL!',eaten:'¡UN RIVAL TE MORDIÓ!',
      first:'¡PRIMER PUESTO!',place:'PUESTO',
      yourMass:'Tu masa',rivals:'Rivales',swallowed:'Cosas tragadas',hood:'BARRIO',
      goal:'OBJETIVO',gEat:'COMÉ % COSAS',gMass:'LLEGÁ A % DE MASA',gRank:'TERMINÁ PRIMERO',
      gEatS:'% cosas',gMassS:'% de masa',gRankS:'1er puesto',
      goalOk:'¡OBJETIVO CUMPLIDO!',goalDone:'Objetivo cumplido',goalMiss:'Objetivo NO cumplido',
      last:'¡ÚLTIMO! PERDISTE',streak:'Mejor racha',
      shop:'POZOS',shopSub:'Juntá monedas comiendo barrio',use:'EN USO',have:'ELEGIR',
      need:'TE FALTAN',bought:'¡POZO NUEVO!',
      sk0:'CLÁSICO',sk1:'HIELO',sk2:'CHICLE',sk3:'ORO',sk4:'ÁCIDO',sk5:'LAVA',
      p0:'el de siempre',p1:'+6% de velocidad',p2:'arrancás con 14 de masa',
      p3:'imán más largo',p4:'perdés menos al ser mordido',p5:'+6% velocidad y 22 de masa'},
    en:{sub:'Drag the pit around and swallow the block: everything that falls in makes you bigger. Rival pits eat the same street, and the big pit swallows the small one.',
      mass:'MASS',time:'TIME',you:'YOU',rival:'RIVAL',
      hint:'DRAG TO MOVE THE PIT',hint2:'small stuff first',
      grew:'BIGGER!',last10:'LAST 10 SECONDS!',
      ateRival:'YOU ATE A RIVAL!',eaten:'A RIVAL BIT YOU!',
      first:'FIRST PLACE!',place:'PLACE',
      yourMass:'Your mass',rivals:'Rivals',swallowed:'Things swallowed',hood:'BLOCK',
      goal:'GOAL',gEat:'EAT % THINGS',gMass:'REACH % MASS',gRank:'FINISH FIRST',
      gEatS:'% things',gMassS:'% mass',gRankS:'1st place',
      goalOk:'GOAL COMPLETE!',goalDone:'Goal complete',goalMiss:'Goal NOT met',
      last:'LAST! YOU LOSE',streak:'Best streak',
      shop:'PITS',shopSub:'Earn coins eating the block',use:'IN USE',have:'SELECT',
      need:'YOU NEED',bought:'NEW PIT!',
      sk0:'CLASSIC',sk1:'ICE',sk2:'BUBBLE',sk3:'GOLD',sk4:'ACID',sk5:'LAVA',
      p0:'the usual one',p1:'+6% speed',p2:'start with 14 mass',
      p3:'longer magnet',p4:'lose less when bitten',p5:'+6% speed and 22 mass'},
    pt:{sub:'Arraste o buraco e engula o bairro: cada coisa que cai te deixa maior. Os rivais comem a mesma rua, e o buraco grande engole o pequeno.',
      mass:'MASSA',time:'TEMPO',you:'VOCÊ',rival:'RIVAL',
      hint:'ARRASTE PARA MOVER O BURACO',hint2:'primeiro o pequeno',
      grew:'MAIOR!',last10:'ÚLTIMOS 10 SEGUNDOS!',
      ateRival:'VOCÊ COMEU UM RIVAL!',eaten:'UM RIVAL TE MORDEU!',
      first:'PRIMEIRO LUGAR!',place:'LUGAR',
      yourMass:'Sua massa',rivals:'Rivais',swallowed:'Coisas engolidas',hood:'BAIRRO',
      goal:'OBJETIVO',gEat:'COMA % COISAS',gMass:'CHEGUE A % DE MASSA',gRank:'TERMINE PRIMEIRO',
      gEatS:'% coisas',gMassS:'% de massa',gRankS:'1º lugar',
      goalOk:'OBJETIVO CUMPRIDO!',goalDone:'Objetivo cumprido',goalMiss:'Objetivo NÃO cumprido',
      last:'ÚLTIMO! VOCÊ PERDEU',streak:'Melhor sequência',
      shop:'BURACOS',shopSub:'Junte moedas comendo o bairro',use:'EM USO',have:'ESCOLHER',
      need:'FALTAM',bought:'BURACO NOVO!',
      sk0:'CLÁSSICO',sk1:'GELO',sk2:'CHICLETE',sk3:'OURO',sk4:'ÁCIDO',sk5:'LAVA',
      p0:'o de sempre',p1:'+6% de velocidade',p2:'começa com 14 de massa',
      p3:'ímã mais longo',p4:'perde menos ao ser mordido',p5:'+6% velocidade e 22 de massa'}
  }
};
const MAP=26;                  /* medio lado de la cuadra jugable */
const PLATE=MAP+4;             /* plato del barrio (más grande que lo jugable) */
const FENCE=MAP+1.6;           /* vereda + seto: tapa el canto y marca el límite */
const FIELD=150;               /* campo lejano: nunca se ve un borde */
const ROADS=[-22,-11,0,11,22];
const COL={grass:'#b0c983',field:'#9fbb78',road:'#4d535b',line:'#c9cfb4',
  curb:'#9aa4ad',hedge:'#3d7a4b',hedge2:'#2f5f3a'};
/* ---- BARRIOS: reloj corto y objetivo explícito (era 92-lvl*4 = 88 s sin objetivo) ---- */
/* Los números salen de MEDIR el piloto (dbg.autoMove, que juega bien): en el
   barrio 1 se come 104 cosas y llega a 798 de masa en 56 s. El objetivo se pone
   en ~40-50% de eso, que es lo que hace una persona que recién agarra el juego. */
const HOODS=[
  {t:56,k:'eat', n:40},
  {t:54,k:'mass',n:360},
  {t:52,k:'rank',n:1},
  {t:50,k:'eat', n:60},
  {t:48,k:'mass',n:520},
  {t:46,k:'rank',n:1}
];
/* ---- TIENDA DE POZOS: lo que se junta se gasta ---- */
const NICK=['NILO','ZOE','TOTO','BRUNO'];
const SKINS=[
  {col:'#c084fc',cost:0,   spd:1,   m0:0, mag:1.75,loss:0},
  {col:'#4dd0ff',cost:150, spd:1.06,m0:0, mag:1.75,loss:0},
  {col:'#ff7ab8',cost:320, spd:1,   m0:14,mag:1.75,loss:0},
  {col:'#ffd166',cost:600, spd:1,   m0:0, mag:2.1, loss:0},
  {col:'#7dff9b',cost:900, spd:1,   m0:0, mag:1.75,loss:.18},
  {col:'#ff6b57',cost:1400,spd:1.06,m0:22,mag:1.75,loss:0}
];
let T3,scene,cam,gp={dpr:1.75,part:1,sh:1,fog:1};
let props=[],holes=[],ims=[],FREE={},time=0,lvl=1,drag=null,dirv={x:0,z:0},done=false;
let camD=14,grace=0,hintT=0,lastSec=-1,warned=false,infoCache='';
let eaten=0,sndS=0,sndB=0,flash=0,city=null,fieldM=null,txN=0;
let goal=HOODS[0],introT=0,startT=0,streak=0,bestStreak=0,comboT=0,goalHit=false;
let spawnT=0,census=0,perk=SKINS[0],demo=0,aT=0,rs=1,rsT=0,rsLock=0,aHalf=false;
const KGEO={};                                  /* geometría+material por tipo */
let M4,QT,EU,V3,V3b,PV,WHITE;                   /* se crean en init (T3 recién ahí) */

/* ---- tipos de prop: radio (lo que hay que medir para comerlo), masa y alto ---- */
/* SIN GLB, y esto se midió y se MIRÓ (capturas F-ag-glb-cerca / F-ag-box-cerca):
   los modelos de image_to_3d simplificados por el motor a 150 triángulos quedaban
   HECHOS PEDAZOS —el árbol era un manchón de polígonos sueltos, el auto astillas,
   la casa un cuadrado rojo plano— porque SimplifyModifier colapsa a través de las
   costuras de color y no hay malla que sobreviva a bajar de 28.000 a 150. La
   versión de geometría propia sale MÁS BARATA y se ve un orden mejor: árbol 112,
   auto 84, casa 84 triángulos contra 150 cada uno. Además el juego pesa 600 kB
   menos y arranca sin el paso de "modelos" (el usuario se quejó de lento). */
const K={
  farol :{r:.50,mass:1 ,h:2.6},
  banco :{r:.66,mass:2 ,h:.8},
  arbol :{r:.88,mass:4 ,h:2.5},
  auto  :{r:1.16,mass:9 ,h:1.45},
  kiosco:{r:1.60,mass:20,h:2.4},
  casa  :{r:2.20,mass:44,h:4.4}
};
function radiusFor(mass){return Math.sqrt(1+mass*.05)*1.06;}
/* UNA sola regla de "esto me lo puedo tragar", para el que come y para el que
   ELIGE a dónde ir. Tenerlas distintas fue el bug que trababa a los rivales:
   pickTarget aceptaba hasta r*(1,06 + hambre) y eatStep sólo hasta r*1,03, así que
   el rival se paraba encima de un auto que no podía comer, y como al vencer su
   temporizador volvía a elegir el prop MÁS CERCANO —el mismo auto, a distancia
   cero— se quedaba ahí para siempre. */
const canEat=(h,p)=>p.r<=h.r*1.03;
/* estados del prop: 0 quieto · 1 inclinado · 2 cayendo · 3 brotando (obra) · 9 libre */
const live=p=>p.st===0||p.st===1;

/* ============================ GEOMETRÍA ============================
   Todo lo estático se cocina en UNA geometría con color por vértice, así el
   barrio entero (calles + veredas + cerco) es una sola malla y cada tipo de prop
   es un solo InstancedMesh. */
function bx(w,h,d,x,y,z,c,out){
  const g=new T3.BoxGeometry(w,h,d).toNonIndexed();g.translate(x,y,z);out.push({g,c});return out;
}
/* baldosa PLANA (2 triángulos). Las rayas del asfalto eran cajas: 12 triángulos
   cada una para pintar cuatro píxeles, 2.160 en total. Con planos: 300. */
function fl(w,d,x,y,z,c,out){
  const g=new T3.PlaneGeometry(w,d).toNonIndexed();g.rotateX(-Math.PI/2);
  g.translate(x,y,z);out.push({g,c});return out;
}
function ico(r,x,y,z,c,out,det){
  const g=new T3.IcosahedronGeometry(r,det==null?1:det).toNonIndexed();
  g.translate(x,y,z);out.push({g,c});return out;
}
function mergeColored(parts){
  let n=0;for(const p of parts)n+=p.g.attributes.position.count;
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);
  const C=new T3.Color();let o=0;
  for(const p of parts){
    const P=p.g.attributes.position,N=p.g.attributes.normal;C.set(p.c);
    for(let i=0;i<P.count;i++){const k=(o+i)*3;
      pos[k]=P.getX(i);pos[k+1]=P.getY(i);pos[k+2]=P.getZ(i);
      nor[k]=N.getX(i);nor[k+1]=N.getY(i);nor[k+2]=N.getZ(i);
      col[k]=C.r;col[k+1]=C.g;col[k+2]=C.b;}
    o+=P.count;p.g.dispose();
  }
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.BufferAttribute(pos,3));
  g.setAttribute('normal',new T3.BufferAttribute(nor,3));
  g.setAttribute('color',new T3.BufferAttribute(col,3));
  g.computeBoundingSphere();g.computeBoundingBox();
  return g;
}
/* GLB -> UNA geometría normalizada (alto pedido, centrada en x/z, apoyada en y=0)
   y un material Lambert (más barato que Standard y acá no hay PBR que perder).
   Si el modelo no está, viene con textura o pasa de 6000 triángulos, se devuelve
   null y el tipo de prop cae a la versión de cajas. */
function glbGeo(key,targetR){
  const S=ARC.glb&&ARC.glb[key];
  if(!S||!S.scene)return null;
  try{
    const root=S.scene.clone(true);root.updateMatrixWorld(true);
    const gs=[];let n=0,hasC=true,src=null;
    root.traverse(k=>{if(k.isMesh&&k.geometry){
      let g=k.geometry.index?k.geometry.toNonIndexed():k.geometry.clone();
      g.applyMatrix4(k.matrixWorld);
      if(!g.attributes.normal)g.computeVertexNormals();
      if(!g.attributes.color)hasC=false;
      gs.push(g);n+=g.attributes.position.count;if(!src)src=k.material;}});
    if(!gs.length)return null;
    const tris=Math.round(n/3);
    if(tris>6000){for(const g of gs)g.dispose();return null;}
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=hasC?new Float32Array(n*3):null;
    let o=0;
    for(const g of gs){
      const P=g.attributes.position,N=g.attributes.normal,C=g.attributes.color;
      for(let i=0;i<P.count;i++){const k=(o+i)*3;
        pos[k]=P.getX(i);pos[k+1]=P.getY(i);pos[k+2]=P.getZ(i);
        nor[k]=N.getX(i);nor[k+1]=N.getY(i);nor[k+2]=N.getZ(i);
        if(col){col[k]=C.getX(i);col[k+1]=C.getY(i);col[k+2]=C.getZ(i);}}
      o+=P.count;g.dispose();
    }
    const geo=new T3.BufferGeometry();
    geo.setAttribute('position',new T3.BufferAttribute(pos,3));
    geo.setAttribute('normal',new T3.BufferAttribute(nor,3));
    if(col)geo.setAttribute('color',new T3.BufferAttribute(col,3));
    geo.computeBoundingBox();
    const bb=geo.boundingBox,sz=new T3.Vector3();bb.getSize(sz);
    if(!(sz.y>1e-4)||!(sz.x>1e-4))return null;
    geo.translate(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2);
    /* se normaliza por la HUELLA, no por el alto: lo que decide si algo entra en
       el pozo es su radio, así que la casa tiene que MEDIR en pantalla lo mismo
       que mide para el cálculo. Normalizando por altura la casa se dibujaba con
       una huella de 2,9 de radio y se la tragaba un pozo de 2,4. */
    const s=targetR*2.1/Math.max(sz.x,sz.z);geo.scale(s,s,s);
    geo.computeBoundingSphere();geo.computeBoundingBox();
    const mat=new T3.MeshLambertMaterial({vertexColors:!!col,
      color:col?0xffffff:((src&&src.color)?src.color.clone():new T3.Color('#cfd6dd'))});
    return {geo,mat,tris,glb:1};
  }catch(e){console.warn('glb '+key,e);return null;}
}
/* versión de cajas de cada tipo (respaldo y tipos sin modelo) */
function boxGeoFor(kind){
  const p=[];
  if(kind==='farol'){
    bx(.18,2.35,.18,0,1.18,0,'#5a6472',p);bx(.5,.28,.5,0,2.46,0,'#ffe6a0',p);
    bx(.42,.12,.42,0,.06,0,COL.curb,p);
  }else if(kind==='banco'){
    bx(1.34,.16,.5,0,.44,0,'#c98f52',p);bx(1.34,.34,.14,0,.66,-.2,'#b57c42',p);
    bx(.16,.44,.5,-.52,.22,0,'#8a95a3',p);bx(.16,.44,.5,.52,.22,0,'#8a95a3',p);
  }else if(kind==='arbol'){
    bx(.34,1.15,.34,0,.58,0,'#7a5230',p);ico(.86,0,1.72,0,'#3f9e5c',p,1);
    ico(.5,.42,1.3,.3,'#348a4e',p,0);
  }else if(kind==='auto'){
    bx(2.3,.62,1.06,0,.52,0,'#e0503f',p);bx(1.2,.46,.98,-.16,1,0,'#dbe6f2',p);
    bx(.9,.2,1.02,.72,.66,0,'#c9412f',p);
    bx(.3,.3,.24,.72,.24,.52,'#2b2f36',p);bx(.3,.3,.24,.72,.24,-.52,'#2b2f36',p);
    bx(.3,.3,.24,-.72,.24,.52,'#2b2f36',p);bx(.3,.3,.24,-.72,.24,-.52,'#2b2f36',p);
  }else if(kind==='kiosco'){
    bx(2.3,2,2.3,0,1,0,'#f0a02a',p);bx(2.76,.24,2.76,0,2.12,0,'#e0503f',p);
    bx(.72,1.2,.1,0,.6,1.18,'#7a4a1e',p);bx(1.5,.5,.08,0,1.5,1.18,'#fff2cf',p);
  }else{ /* casa */
    bx(3.5,2.5,3.5,0,1.25,0,'#e7ddc9',p);
    bx(3.9,.5,3.9,0,2.72,0,'#8c4b3a',p);bx(2.7,.5,2.7,0,3.2,0,'#7a4030',p);
    bx(1.5,.4,1.5,0,3.6,0,'#6b3729',p);
    bx(.8,1.3,.1,-.9,.65,1.78,'#b2372f',p);
    bx(.8,.7,.1,.9,1.5,1.78,'#cfe0e6',p);bx(.7,.7,.1,1.8,1.5,1.2,'#cfe0e6',p);
  }
  const geo=mergeColored(p);
  return {geo,mat:new T3.MeshLambertMaterial({vertexColors:true}),
    tris:Math.round(geo.attributes.position.count/3),glb:0};
}
function kindGeo(kind){
  if(KGEO[kind])return KGEO[kind];
  let r=null;
  if(K[kind].glb)r=glbGeo(K[kind].glb,K[kind].r);
  if(!r)r=boxGeoFor(kind);
  return KGEO[kind]=r;
}

/* ============================ EL BARRIO ============================ */
function buildGround(){
  if(city){scene.remove(city);city.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});}
  city=new T3.Group();
  /* CAMPO EN NEBLINA: un anillo con el color por vértice degradado hacia el cielo
     según la distancia al centro del barrio (la niebla de three depende de la
     cámara y con la cámara pegada al pozo el afuera quedaba plano). */
  const fg=new T3.RingGeometry(PLATE-1.5,FIELD,30,7).toNonIndexed();
  fg.rotateX(-Math.PI/2);
  const P=fg.attributes.position,cols=new Float32Array(P.count*3);
  const c0=new T3.Color(COL.field),c1=new T3.Color(G.sky),cc=new T3.Color();
  for(let i=0;i<P.count;i++){
    const rad=Math.hypot(P.getX(i),P.getZ(i));
    const t=clamp((rad-PLATE)/58,0,1);
    cc.copy(c0).lerp(c1,Math.pow(t,.75)*.94);
    cols[i*3]=cc.r;cols[i*3+1]=cc.g;cols[i*3+2]=cc.b;
  }
  fg.setAttribute('color',new T3.BufferAttribute(cols,3));
  /* fog:false EN LAS CAPAS DE RELLENO. Medido con _agf.js (900x430, swiftshader,
     dpr 1, pozo de 300 de masa): con la niebla de three el mismo cuadro daba 39
     fps y sin niebla 60. La niebla es per-fragment y estas capas son PANTALLAS
     ENTERAS de fragmentos. El campo no la necesita porque ya trae el degradado
     hacia el cielo horneado por vértice, y el suelo del barrio está siempre cerca
     de la cámara. La niebla se queda donde SÍ se ve: props y cerco (Lambert), que
     ocupan poca pantalla y son los que tienen que desaparecer en la bruma. */
  const f=new T3.Mesh(fg,new T3.MeshBasicMaterial({vertexColors:true,fog:false}));
  f.position.y=-.08;city.add(f);fieldM=f;
  /* SUELO EN BALDOSAS, sin capas encima: pasto, vereda y asfalto salen del color
     por vértice de UNA malla que embaldosa el plato sin superponerse. */
  /* ANCHO DE CALLE: eran 4,6 de asfalto + 2 de vereda cada 11 unidades, o sea que
     el 60% del barrio era gris y desde arriba parecía un playón de
     estacionamiento (se vio en F-agujero-fog-on). Ahora 3 + 1,6 = 4,6 de 11. */
  const bands=[],cuts=[];
  for(const r of ROADS)cuts.push([r-2.3,r-1.5,1],[r-1.5,r+1.5,2],[r+1.5,r+2.3,1]);
  cuts.sort((a,b)=>a[0]-b[0]);
  let cur=-PLATE;
  for(const c of cuts){
    if(c[0]>cur)bands.push([cur,c[0],0]);
    bands.push([Math.max(cur,c[0]),c[1],c[2]]);cur=c[1];
  }
  if(cur<PLATE)bands.push([cur,PLATE,0]);
  const p=[];
  for(const a of bands)for(const b of bands){
    const cls=Math.max(a[2],b[2]);
    const g=new T3.PlaneGeometry(a[1]-a[0],b[1]-b[0]).toNonIndexed();
    g.rotateX(-Math.PI/2);g.translate((a[0]+a[1])/2,0,(b[0]+b[1])/2);
    p.push({g,c:cls===2?COL.road:(cls===1?COL.curb:COL.grass)});
  }
  city.add(new T3.Mesh(mergeColored(p),new T3.MeshBasicMaterial({vertexColors:true,fog:false})));
  /* rayas del asfalto: PLANOS de dos triángulos (eran cajas de 12) */
  const l=[];
  for(const r of ROADS){
    for(let x=-PLATE+2;x<PLATE;x+=3.4)fl(1.6,.17,x,.02,r,COL.line,l);
    for(let z=-PLATE+2;z<PLATE;z+=3.4)fl(.17,1.6,r,.025,z,COL.line,l);
  }
  city.add(new T3.Mesh(mergeColored(l),new T3.MeshBasicMaterial({vertexColors:true,fog:false})));
  /* CERCO: tiene volumen, va con luz. Tapa el canto del plato y marca el límite. */
  const q=[];
  for(const s of [-1,1]){
    bx(FENCE*2+1.6,.36,1.1,0,.18,s*FENCE,COL.curb,q);
    bx(FENCE*2+1.6,1,.7,0,.6,s*(FENCE+.75),COL.hedge,q);
    bx(FENCE*2+1.7,.3,.8,0,1.2,s*(FENCE+.75),COL.hedge2,q);
    bx(1.1,.36,FENCE*2+1.6,s*FENCE,.18,0,COL.curb,q);
    bx(.7,1,FENCE*2+1.6,s*(FENCE+.75),.6,0,COL.hedge,q);
    bx(.8,.3,FENCE*2+1.7,s*(FENCE+.75),1.2,0,COL.hedge2,q);
  }
  city.add(new T3.Mesh(mergeColored(q),new T3.MeshLambertMaterial({vertexColors:true})));
  scene.add(city);
}
/* colocación con rechazo: sin esto salían casas UNA ENCIMA DE OTRA. Además lo
   GRANDE no puede quedar montado en el asfalto; autos y faroles sí pueden estar
   sobre la calzada y la vereda: es su lugar. */
function free(x,z,r,calle){
  if(Math.abs(x)>MAP-.8||Math.abs(z)>MAP-.8)return false;
  if(!calle)for(const rd of ROADS){
    if(Math.abs(x-rd)<1.6+r*.9||Math.abs(z-rd)<1.6+r*.9)return false;
  }
  for(const q of props){
    if(!live(q)&&q.st!==3)continue;      /* lo muerto o cayendo no ocupa lugar */
    const d=Math.hypot(q.x-x,q.z-z);
    if(d<(q.r+r)*.92)return false;
  }
  return true;
}
function place(kind,x,z,spread){
  const s=rnd(.92,1.08),K0=K[kind],r=K0.r*s;
  const calle=(kind==='auto'||kind==='farol');
  for(let i=0;i<8;i++){
    const tx=x+(i?rnd(-spread||0,spread||0):0),tz=z+(i?rnd(-spread||0,spread||0):0);
    if(free(tx,tz,r,calle)){
      props.push({kind,x:tx,z:tz,px:tx,py:0,pz:tz,rx:0,ry:rnd(0,TAU),rz:0,
        r,mass:K0.mass*s,sc:s,st:0,fy:0,tilt:0,spx:0,spz:0,hole:null,im:null,ii:0,
        gr:1,shr:1,tint:rnd(.9,1.09)});
      return true;
    }
  }
  return false;
}
/* bloques MÁS LIVIANOS que antes (plaza tenía 11 props): el censo bajó de ~126 a
   ~80 y la densidad la mantiene el respawn, que reaparece cerca del pozo. */
function blockOf(cx,cz,kind){
  if(kind==='casa'){
    place('casa',cx,cz,.35);
    place('arbol',cx-2.6,cz-2.6,.7);place('arbol',cx+2.6,cz+2.6,.7);
    place('banco',cx+2.6,cz-2.5,.6);place('farol',cx-2.6,cz+2.6,.5);
  }else if(kind==='comercio'){
    place('kiosco',cx,cz,.7);
    place('auto',cx-2.4,cz+2.4,.8);place('auto',cx+2.4,cz-2.4,.8);
    place('farol',cx+2.7,cz+2.7,.5);place('banco',cx-2.7,cz-2.6,.6);
  }else if(kind==='plaza'){
    for(let i=0;i<3;i++)place('arbol',cx+rnd(-2.6,2.6),cz+rnd(-2.6,2.6),1.4);
    for(let i=0;i<2;i++)place('banco',cx+rnd(-2.6,2.6),cz+rnd(-2.6,2.6),1.4);
    for(let i=0;i<2;i++)place('farol',cx+rnd(-2.7,2.7),cz+rnd(-2.7,2.7),1.4);
  }else{ /* baldío */
    for(let i=0;i<2;i++)place('arbol',cx+rnd(-2.6,2.6),cz+rnd(-2.6,2.6),1.4);
    place('farol',cx+rnd(-2.6,2.6),cz+rnd(-2.6,2.6),1.4);
    if(Math.random()<.8)place('auto',cx+rnd(-1.6,1.6),cz+rnd(-1.6,1.6),1.2);
  }
}
function buildCity(n){
  for(const im of ims){scene.remove(im);im.dispose();}
  ims=[];props=[];FREE={};
  const part=clamp(gp.part,.5,1.35);
  /* el bloque donde arranca el jugador es SIEMPRE plaza: comida chica al toque y
     nada que lo pueda molestar en los primeros segundos. Y en los barrios 1-2 hay
     más casas que antes, porque con una sola el final se quedaba sin comida grande. */
  const mix=n<=2?['plaza','plaza','baldio','casa','casa','comercio']
          :n<=4?['plaza','baldio','casa','casa','comercio','comercio']
                :['plaza','casa','casa','casa','comercio','comercio'];
  for(let bi=-2;bi<2;bi++)for(let bj=-2;bj<2;bj++){
    const cx=bi*11+5.5,cz=bj*11+5.5;
    const k=(bi===0&&bj===0)?'plaza':pick(mix);
    blockOf(cx,cz,k);
  }
  /* banda de parque entre la última calle y el cerco (era 26, ahora 7: el relleno
     lejano es lo que menos se juega y lo que más cuesta dibujar) */
  const nb=Math.round(9*part);
  for(let i=0;i<nb;i++){
    const e=rnd(23.2,MAP-1.4)*(Math.random()<.5?-1:1);
    if(Math.random()<.5)place(Math.random()<.65?'arbol':'banco',rnd(-MAP+2,MAP-2),e,1.2);
    else place(Math.random()<.65?'arbol':'farol',e,rnd(-MAP+2,MAP-2),1.2);
  }
  /* autos estacionados REPARTIDOS por las calles (eligiendo al azar salían de a
     ocho en la misma esquina y parecía una playa de estacionamiento) */
  const na=Math.round((6+Math.min(3,n))*part);
  for(let i=0;i<na;i++){
    const r=ROADS[i%ROADS.length],a=((i*7)%9)/9;
    const at=-MAP+4+a*(MAP*2-8)+rnd(-2,2);
    if(i%2)place('auto',at,r+(i%4<2?.75:-.75),1.2);
    else    place('auto',r+(i%4<2?.75:-.75),at,1.2);
  }
  /* GRÁFICOS BAJOS: se ralea el barrio. Con la geometría propia el triángulo ya no
     es el cuello (9.400 en total), pero el RELLENO de los props y el bucle que los
     recorre sí, así que el censo baja con gfxP().part. Se sacan primero árboles y
     cosas chicas; autos y casas quedan, porque son la comida grande del final y
     sacarlos cambiaría quién gana. */
  if(part<.95){
    const keep=[];
    let dropSmall=Math.round(props.length*(1-part)*.9);
    let dropTrees=Math.round(props.filter(q=>q.kind==='arbol').length*(1-part)*.7);
    for(const q of props){
      if(q.kind==='arbol'&&dropTrees>0&&Math.random()<.7){dropTrees--;continue;}
      if(dropSmall>0&&q.mass<=2&&Math.random()<.6){dropSmall--;continue;}
      keep.push(q);
    }
    props=keep;
  }
  /* un InstancedMesh por tipo. El respawn REUSA estas instancias, así que este es
     el censo definitivo de la ronda: los triángulos y las llamadas de dibujo no
     se mueven aunque el barrio se coma y se reconstruya diez veces. */
  const byKind={};
  for(const p of props)(byKind[p.kind]=byKind[p.kind]||[]).push(p);
  for(const kind in byKind){
    const kg=kindGeo(kind),list=byKind[kind];
    const im=new T3.InstancedMesh(kg.geo,kg.mat,list.length);
    im.frustumCulled=false;                 /* la esfera del lote no sirve para cullear */
    im.instanceMatrix.setUsage(T3.DynamicDrawUsage);
    const C=new T3.Color();
    list.forEach((p,i)=>{p.im=im;p.ii=i;C.setScalar(p.tint);im.setColorAt(i,C);setMat(p);});
    if(im.instanceColor)im.instanceColor.needsUpdate=true;
    scene.add(im);ims.push(im);
    FREE[kind]=[];
  }
  census=props.length;
}
function setMat(p){
  EU.set(p.rx,p.ry,p.rz);QT.setFromEuler(EU);
  V3.set(p.px,p.py,p.pz);
  V3b.setScalar(p.st===2?p.sc*p.shr:(p.st===3?p.sc*p.gr:(p.st===9?0:p.sc)));
  M4.compose(V3,QT,V3b);
  p.im.setMatrixAt(p.ii,M4);p.im.instanceMatrix.needsUpdate=true;
}
/* ---------------- OBRAS: el barrio se reconstruye ----------------
   Sin esto la ronda se moría: a los 24 s el censo llegaba a 0 y quedaba un minuto
   de reloj mirando un descampado (medido con _agm.js). Reaparece la instancia
   MUERTA del mismo tipo, así que no cuesta ni un triángulo ni un draw call más. */
function spawnOne(){
  const me=holes[0];if(!me)return false;
  /* la obra nueva se ancla al jugador (45%) o al pozo que va ÚLTIMO (55%): con
     todo anclado al jugador, la comida aparecía siempre a su alcance y terminaba
     con diez veces la masa de los rivales (medido: 820 contra 144 y 183). */
  let an=me;
  if(holes.length>1&&Math.random()<.55){
    an=holes[1];
    for(let i=2;i<holes.length;i++)if(holes[i].mass<an.mass)an=holes[i];
  }
  const kinds=Object.keys(FREE).filter(k=>FREE[k].length);
  if(!kinds.length)return false;
  /* 70% algo que el jugador YA se puede comer (que nunca se quede sin comida) y
     30% algo más grande, que es lo que le da el salto de masa */
  const small=kinds.filter(k=>K[k].r<=an.r*1.03),big=kinds.filter(k=>K[k].r>an.r*1.03);
  let pool=small.length&&(Math.random()<.7||!big.length)?small:(big.length?big:kinds);
  const kind=pick(pool);
  const p=FREE[kind].pop();if(!p)return false;
  for(let i=0;i<10;i++){
    const a=rnd(0,TAU),d=rnd(an===me?11:5,an===me?21:15);
    const x=clamp(an.x+Math.cos(a)*d,-MAP+2,MAP-2),z=clamp(an.z+Math.sin(a)*d,-MAP+2,MAP-2);
    let bad=false;
    for(const h of holes)if(Math.hypot(h.x-x,h.z-z)<h.r+p.r+3){bad=true;break;}
    if(bad)continue;
    if(!free(x,z,p.r,kind==='auto'||kind==='farol'))continue;
    /* que no brote en la cara del jugador: si cae dentro de la pantalla tiene que
       estar lejos (si no, se ve aparecer un árbol de la nada al lado del pozo) */
    const sc=toScreen(x,0,z);
    if(sc&&sc.on&&Math.hypot(me.x-x,me.z-z)<14)continue;
    p.x=p.px=x;p.z=p.pz=z;p.py=0;p.rx=p.rz=0;p.ry=rnd(0,TAU);
    p.st=3;p.gr=.02;p.shr=1;p.tilt=0;p.hole=null;p.touch=0;
    setMat(p);
    return true;
  }
  FREE[kind].push(p);
  return false;
}
function spawnTick(dt){
  if(!census)return;
  spawnT-=dt;
  if(spawnT>0)return;
  spawnT=.34;
  const alive=props.reduce((n,p)=>n+(live(p)||p.st===3?1:0),0);
  let k=alive<census*.4?4:(alive<census*.65?3:(alive<census*.85?2:1));
  while(k-->0)if(!spawnOne())break;
}

/* ============================ LOS POZOS ============================ */
function skinId(){const i=ARC.S.skin|0;return i>=0&&i<SKINS.length?i:0;}
function owned(){
  if(!Array.isArray(ARC.S.own)||!ARC.S.own.length)ARC.S.own=[0];
  return ARC.S.own;
}
function rivalCols(){
  const mine=SKINS[skinId()].col;
  return ['#4dd0ff','#ff7ab8','#ffd166','#7dff9b'].filter(c=>c!==mine);
}
function mkHole(col,ai,x,z){
  const g=new T3.Group();
  const disc=new T3.Mesh(new T3.CircleGeometry(1,24),
    new T3.MeshBasicMaterial({color:new T3.Color('#05060a')}));
  disc.rotation.x=-Math.PI/2;disc.position.y=.055;g.add(disc);
  const rim=new T3.Mesh(new T3.RingGeometry(.94,1.05,24),
    new T3.MeshBasicMaterial({color:new T3.Color(col),side:T3.DoubleSide}));
  rim.rotation.x=-Math.PI/2;rim.position.y=.07;g.add(rim);
  const glow=new T3.Mesh(new T3.RingGeometry(1.05,1.34,24),
    new T3.MeshBasicMaterial({color:new T3.Color(col),side:T3.DoubleSide,
      transparent:true,opacity:.26,depthWrite:false}));
  glow.rotation.x=-Math.PI/2;glow.position.y=.062;g.add(glow);
  scene.add(g);
  return {g,disc,rim,glow,x,z,r:radiusFor(0),mass:0,ai:!!ai,col,
    t:0,since:0,sp:7.6,vx:0,vz:0,bx:x,bz:z,imm:0,ate:0,target:null,wx:null,wz:null,eff:1};
}
function holeVis(h,me){
  h.g.position.set(h.x,0,h.z);
  h.g.scale.setScalar(h.r);
  /* borde brillante: pulso + más halo cuanto más grande (así crecer se VE) */
  const k=.62+.38*Math.sin(ARC.t*(h===me?5.2:3.4));
  h.rim.material.color.setStyle(h.col);
  h.rim.material.color.lerp(WHITE,h===me?.28+.42*k:.12+.2*k);
  h.glow.material.opacity=(h===me?.2:.14)+.16*k+Math.min(.2,(h.r-1)*.05);
}

/* ============================ ENTRADA ============================ */
G.down=function(p){drag={x:p.x,y:p.y};};
G.move=function(p){
  if(!drag)return;
  const dx=p.x-drag.x,dy=p.y-drag.y,L=Math.hypot(dx,dy);
  if(L<4){dirv.x=dirv.z=0;return;}
  const k=Math.min(1,L/(ARC.H*.2));
  dirv.x=dx/L*k;dirv.z=dy/L*k;
};
G.up=function(){drag=null;dirv.x=dirv.z=0;};
G.key=function(c,d){
  const v=d?1:0;
  if(c==='ArrowLeft'||c==='KeyA')dirv.x=-v;
  if(c==='ArrowRight'||c==='KeyD')dirv.x=v;
  if(c==='ArrowUp'||c==='KeyW')dirv.z=-v;
  if(c==='ArrowDown'||c==='KeyS')dirv.z=v;
};

/* ============================ RESOLUCIÓN DINÁMICA ============================
   El motor ya recorta partículas cuando cae de 45 fps, pero lo que cuesta acá es
   RELLENO de pantalla (medido: con dpr .5 el mismo cuadro pasaba de 26 a 36 fps).
   Así que si el aparato no llega, se baja el pixelRatio del renderer y se
   recupera cuando sobra. En un celular normal esto no se activa nunca. */
function dprBase(){return Math.min(window.devicePixelRatio||1,(gp&&gp.dpr)||1.35);}
function applyRS(){
  if(!ARC.rnd)return;
  ARC.rnd.setPixelRatio(dprBase()*rs);
  ARC.rnd.setSize(ARC.W,ARC.H,false);
}
function rsTick(dt){
  if(rsLock)return;                            /* las sondas de velocidad la fijan */
  rsT+=dt;if(rsT<1.2)return;rsT=0;
  const f=ARC.fps;
  if(f<36&&rs>.72){rs=Math.max(.72,rs-.14);applyRS();}
  else if(f>46&&rs<1){rs=Math.min(1,rs+.1);applyRS();}
}

/* ============================ CICLO ============================ */
/* EL TÍTULO DEL MENÚ SE PERDÍA CON EL MODO ATRACCIÓN: el CSS del motor esconde el
   título de DOM cuando cargó el arte (#menu.hasart .ttl{display:none}) porque el
   arte ya lo trae dibujado, pero .live saca el arte de fondo, así que quedaba un
   menú SIN TÍTULO (se vio en A-agujero-menu-h). Se arregla desde acá con una regla
   propia para no tocar head.html; queda anotado como PEDIDO AL MOTOR. */
function fixMenuCss(){
  if(document.getElementById('agCss'))return;
  const st=document.createElement('style');st.id='agCss';
  st.textContent='#menu.live .ttl{display:block!important;'
    +'text-shadow:0 3px 0 rgba(0,0,0,.5),0 10px 30px rgba(0,0,0,.85)}'
    +'#menu.live .sub{text-shadow:0 2px 8px rgba(0,0,0,.9)}';
  document.head.appendChild(st);
}
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  fixMenuCss();
  M4=new T3.Matrix4();QT=new T3.Quaternion();EU=new T3.Euler();
  V3=new T3.Vector3();V3b=new T3.Vector3();PV=new T3.Vector3();
  WHITE=new T3.Color('#ffffff');
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  scene.fog=new T3.Fog(new T3.Color(G.sky).getHex(),40,120);
  /* 50° y no 54: el suelo es RELLENO puro y es lo que más cuesta, así que ver
     menos barrio es ver mejor Y correr mejor. */
  cam=new T3.PerspectiveCamera(50,ARC.W/Math.max(1,ARC.H),.5,320);
  /* INTENSIDADES EN UNIDADES FÍSICAS: three moderna deja el Lambert en
     albedo*(intensidad/π). Con hemi 1.0 + sol .6 el pasto se medía (70,76,78), un
     gris sucio igual al asfalto; multiplicadas por ~π vuelve a verse verde. */
  scene.add(new T3.HemisphereLight(0xffffff,0x93a884,2.15));
  const d=new T3.DirectionalLight(0xfff6e0,1.35);d.position.set(12,22,10);scene.add(d);
  gp=ARC.gfxP?ARC.gfxP():gp;
  buildGround();
  applyRS();
  ARC.clearGL=true;
  try{demoStart();}catch(e){console.warn('demo',e);}
};
G.resize=function(){
  if(cam){cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();}
  applyRS();
};
G.gfxApply=function(p){
  gp=p||gp;
  if(fieldM)fieldM.visible=true;              /* nunca: es lo que tapa el horizonte */
  applyRS();
};
function goalTxt(short){
  const n=goal.n;
  if(goal.k==='eat') return ARC.T(short?'gEatS':'gEat').replace('%',n);
  if(goal.k==='mass')return ARC.T(short?'gMassS':'gMass').replace('%',n);
  return ARC.T(short?'gRankS':'gRank');
}
function rankOf(h){return 1+holes.filter(o=>o!==h&&o.mass>h.mass).length;}
function goalProg(){
  if(goal.k==='eat')return eaten;
  if(goal.k==='mass')return Math.round(holes[0].mass);
  return rankOf(holes[0])===1?1:0;
}
function goalOk(){return goalProg()>=goal.n;}
G.start=function(l){
  if(!T3)return;
  lvl=l||1;done=false;eaten=0;flash=0;warned=false;lastSec=-1;infoCache='';
  streak=0;bestStreak=0;comboT=0;goalHit=false;startT=0;demo=0;
  gp=ARC.gfxP?ARC.gfxP():gp;
  perk=SKINS[skinId()];
  if(!city)buildGround();
  buildCity(lvl);
  for(const h of holes)scene.remove(h.g);
  goal=HOODS[clamp(lvl-1,0,HOODS.length-1)];
  const nR=lvl<=2?2:3;
  /* los rivales aparecen en CRUCES de calle, no en medio de una cuadra: si nacen
     encima de los props se comen 5 de masa antes del primer cuadro */
  const spots=[[-11,-11],[11,-11],[-11,11],[11,11]];
  holes=[mkHole(perk.col,false,5.5,5.5)];
  holes[0].sp=7.6*perk.spd;
  if(perk.m0){holes[0].mass=perk.m0;holes[0].r=radiusFor(perk.m0);}
  const cols=rivalCols();
  for(let i=0;i<nR;i++){
    const s=spots[i];
    const h=mkHole(cols[i%cols.length],true,s[0],s[1]);
    /* TOPE 7,0: el jugador va a 7,6. Que el rival sea más listo, no más rápido. */
    h.sp=Math.min(7,5.2+lvl*.35);h.bx=s[0]*.8;h.bz=s[1]*.8;h.nick=NICK[i];
    /* HAMBRE por barrio: antes comían a ritmo completo desde el primer cuadro y a
       los 12 s iban 64 a 5. Con esto la carrera queda pareja y se puede alcanzar. */
    h.eff=.8+lvl*.04;
    holes.push(h);
  }
  time=HOODS[clamp(lvl-1,0,HOODS.length-1)].t;
  camD=Math.min(20,8.2+holes[0].r*3.3);
  grace=3.4;hintT=4.2;introT=3.2;spawnT=.6;
  window.__holes=holes;                        /* sólo para las sondas */
  hud(true);
  ARC.tray([{id:'goal',txt:'◎ '+goalTxt(true),gh:1,
    fn:()=>ARC.toast(ARC.T('goal')+': '+goalTxt())}]);
};

/* ---- reloj grande + puntaje en las pastillas del motor ---- */
function hud(force){
  const s=Math.max(0,Math.ceil(time));
  const warn=s<=10&&!done;
  const txt=(s/60|0)+':'+(s%60<10?'0':'')+(s%60);
  const inf='<span style="opacity:.6;font-size:.62em;letter-spacing:.1em">'+ARC.T('time')+'</span>'
    +'<b style="font-size:1.9em;line-height:.9;margin-left:.18em;'
    +(warn?'color:#ff6b6b;text-shadow:0 0 12px rgba(255,60,60,.7)':'')+'">'+txt+'</b>';
  if(force||inf!==infoCache){infoCache=inf;ARC.hud(Math.round(holes[0].mass),inf);}
  else ARC.hud(Math.round(holes[0].mass));
}

/* ---- comer: dos tiempos (se inclina y se desliza / se suelta y cae girando) ---- */
function eatStep(h,dt,me){
  const R=h.r,R2=R*(h===me?perk.mag:1.75);
  for(const p of props){
    if(!live(p))continue;
    const dx=h.x-p.px,dz=h.z-p.pz,d=Math.hypot(dx,dz);
    if(d>R2+p.r)continue;
    if(!canEat(h,p))continue;                 /* todavía es más grande que el pozo */
    p.touch=1;
    const nx=dx/(d||1),nz=dz/(d||1);
    if(d<R*.62){                              /* ---- se suelta ---- */
      p.st=2;p.hole=h;p.fy=-1.6;p.shr=1;
      p.spx=rnd(4,9)*(Math.random()<.5?-1:1);p.spz=rnd(3,7)*(Math.random()<.5?-1:1);
      /* el rival come con su factor de hambre y su banda; el jugador, completo */
      h.mass+=p.mass*(h.ai?h.eff*band(h)*(startT<6?.6:1):1);
      h.r=radiusFor(h.mass);h.since=0;h.ate++;
      if(h===me){
        eaten++;
        streak++;comboT=.9;
        if(streak>bestStreak)bestStreak=streak;
        swallowSfx(p.mass);
        const sc=toScreen(p.px,K[p.kind].h*.6,p.pz);
        if(sc){txN=(txN+1)%4;
          ARC.fx.text(sc.x+(txN-1.5)*14,sc.y-txN*7,'+'+Math.round(p.mass),
            {color:'#f3e8ff',size:Math.max(13,ARC.H*.042),life:.7});}
        if(streak>=5&&streak%5===0){
          const hs=toScreen(h.x,0,h.z);
          if(hs)ARC.fx.text(hs.x,hs.y-ARC.H*.1,'x'+streak,
            {color:'#ffd166',size:Math.max(16,ARC.H*.06),life:.8});
          ARC.sfx('coin',{rate:1+Math.min(.6,streak*.03),vol:.5});
        }
        if(p.mass>=9){
          ARC.shake(Math.min(10,2.5+p.mass*.16));
          const hs=toScreen(h.x,0,h.z);
          if(hs)ARC.fx.ring(hs.x,hs.y,{r:Math.max(30,ARC.H*.16),life:.4,color:G.acc,w:3});
          if(ARC.S.fx&&hs)ARC.fx.burst(hs.x,hs.y,{n:Math.round(10*gp.part),color:'#8b5cf6',
            speed:150,life:.4,size:4,sq:true});
        }
      }
    }else{                                    /* ---- se inclina y se desliza ---- */
      p.st=1;
      const k=1-clamp((d-R*.62)/(R2-R*.62),0,1);
      p.tilt=Math.min(.62,p.tilt+dt*(1.4+k*3));
      p.tnx=nx;p.tnz=nz;
      p.rx=p.tilt*nz;p.rz=-p.tilt*nx;
      const pull=(1.1+R*.35)*k*k;
      p.px+=nx*pull*dt;p.pz+=nz*pull*dt;
      p.x=p.px;p.z=p.pz;
      setMat(p);
    }
  }
}
/* BANDA DE CARRERA: el rival que se despega come menos y el que se quedó atrás
   come más. Es lo que hace que los últimos 10 segundos importen (antes el
   resultado estaba resuelto a los 15 s: 64 a 5 y a otra cosa). */
function band(h){
  const me=holes[0];if(!me||h===me)return 1;
  const rel=h.mass/Math.max(10,me.mass);
  if(rel>1.7)return .35;
  if(rel>1.15)return .6;
  if(rel>1)return .85;
  if(rel<.35)return 2;
  if(rel<.6)return 1.45;
  return 1;
}
/* ALCANCE (rubber band de masa): con sólo bajarles el "hambre" los rivales
   entraban en espiral —poca masa, poco radio, sólo faroles, menos masa— y el
   piloto terminaba 820 contra 144 y 183 (medido con _agm.js). Este piso los
   mantiene en carrera SIN mentir el ranking: la masa que muestran es la que
   tienen, y el radio sigue saliendo de la masa (si les floteara el radio, un
   rival con poca masa podría comerse al jugador y eso se lee como tramposo).
   El piso sube con el barrio: 41% del jugador en el 1 y 56% en el 6. */
function catchUp(dt){
  const me=holes[0];if(!me||me.mass<40)return;
  const fl=me.mass*(.38+lvl*.03);
  for(let i=1;i<holes.length;i++){
    const h=holes[i];
    if(h.mass<fl){h.mass+=(fl-h.mass)*dt*.55;h.r=radiusFor(h.mass);}
  }
}
/* el sonido lo elige la MASA de lo que cae, y con cooldown: veinte faroles
   entrando juntos disparaban veinte fuentes y el limitador del motor aplastaba
   todo. Dos cooldowns, uno para lo chico y uno para lo grande. */
function swallowSfx(m){
  if(m>=18){if(sndB>0)return;sndB=.22;ARC.sfx('boom',{rate:rnd(.9,1.05),vol:1});return;}
  if(sndS>0)return;sndS=.055;
  if(m>=7)ARC.sfx('glass',{rate:rnd(.82,.95),vol:.75});
  else if(m>=3)ARC.sfx('wood',{rate:rnd(.95,1.1),vol:.7});
  else ARC.sfx('pop',{rate:rnd(1.2,1.5),vol:.55});
}
/* ---- IA: nunca se queda quieta ----
   Elegir objetivo: PRIMERO lo que hay a mano (con un puntaje global el rival se
   pasaba 15 segundos cruzando el barrio por un farol con la masa clavada). */
function pickTarget(h){
  let best=null,bd=1e9,far=null,fd=1e9;
  const CERCA=16;
  for(const p of props){
    if(!live(p)||!canEat(h,p))continue;
    const d=Math.hypot(p.x-h.x,p.z-h.z);
    const s=d-p.mass*.5;
    if(d<CERCA){if(s<bd){bd=s;best=p;}}
    else if(d<fd){fd=d;far=p;}
  }
  if(!best)best=far;
  h.target=best;
  if(!best&&(h.wx==null||Math.hypot(h.wx-h.x,h.wz-h.z)<2)){
    h.wx=rnd(-MAP+4,MAP-4);h.wz=rnd(-MAP+4,MAP-4);
  }
}
function aiStep(h,dt){
  h.t-=dt;h.since+=dt;
  if(h.t<=0||!h.target||!live(h.target)){h.t=rnd(.45,1.05);pickTarget(h);}
  let tx,tz;
  if(h.target){tx=h.target.x;tz=h.target.z;}
  else{if(h.wx==null){h.wx=rnd(-MAP+4,MAP-4);h.wz=rnd(-MAP+4,MAP-4);}tx=h.wx;tz=h.wz;}
  const dx=tx-h.x,dz=tz-h.z,L=Math.hypot(dx,dz)||1;
  if(L<1.2&&!h.target)h.wx=null;
  const sp=h.sp*(1-Math.min(.22,(h.r-1)*.045));
  const k=1-Math.pow(.0015,dt);
  h.vx=lerp(h.vx,dx/L*sp,k);h.vz=lerp(h.vz,dz/L*sp,k);
  h.x+=h.vx*dt;h.z+=h.vz*dt;
  h.bx=lerp(h.bx,h.x,dt*.08);h.bz=lerp(h.bz,h.z,dt*.08);
}
/* la cosa que quedó inclinada y el pozo se fue: se endereza (si no, el barrio
   quedaba lleno de árboles chuecos apuntando a ninguna parte) */
function tiltStep(dt){
  for(const p of props){
    if(p.st!==1||p.touch)continue;
    p.tilt=Math.max(0,p.tilt-dt*1.8);
    p.rx=p.tilt*(p.tnz||0);p.rz=-p.tilt*(p.tnx||0);
    if(p.tilt<=0){p.st=0;p.rx=p.rz=0;}
    setMat(p);
  }
}
/* cosas cayendo (giran, se encogen y desaparecen) y cosas brotando (obra nueva) */
function fallStep(dt){
  for(const p of props){
    if(p.st===3){
      p.gr=Math.min(1,p.gr+dt*3.2);
      if(p.gr>=1){p.st=0;p.gr=1;}
      setMat(p);continue;
    }
    if(p.st!==2)continue;
    p.fy-=15*dt;p.py+=p.fy*dt;
    p.px=lerp(p.px,p.hole.x,1-Math.pow(.05,dt));
    p.pz=lerp(p.pz,p.hole.z,1-Math.pow(.05,dt));
    p.rx+=p.spx*dt;p.rz+=p.spz*dt;p.ry+=p.spx*.4*dt;
    p.shr=Math.max(0,p.shr-dt*.85);
    if(p.py<-5||p.shr<=0){
      p.shr=0;p.st=9;p.py=0;                  /* libre: la instancia se recicla */
      (FREE[p.kind]=FREE[p.kind]||[]).push(p);
    }
    setMat(p);
  }
}
G.step=function(dt){
  if(!T3||done||!holes.length)return;
  time-=dt;startT+=dt;grace=Math.max(0,grace-dt);hintT=Math.max(0,hintT-dt);
  introT=Math.max(0,introT-dt);
  sndS=Math.max(0,sndS-dt);sndB=Math.max(0,sndB-dt);flash=Math.max(0,flash-dt*1.5);
  if(comboT>0){comboT-=dt;if(comboT<=0)streak=0;}
  rsTick(dt);
  const me=holes[0],r0=Math.floor(me.r);
  for(const h of holes)h.imm=Math.max(0,h.imm-dt);
  me.x+=dirv.x*me.sp*dt;me.z+=dirv.z*me.sp*dt;
  for(const p of props)if(p.st===1)p.touch=0;
  for(const h of holes){
    if(h.ai)aiStep(h,dt);
    const lim=FENCE-.55-h.r;   /* el ARO entero queda del lado de adentro */
    h.x=clamp(h.x,-lim,lim);h.z=clamp(h.z,-lim,lim);
    eatStep(h,dt,me);
  }
  /* pozo contra pozo: el grande se traga al chico (y el chico reaparece lejos) */
  for(let i=0;i<holes.length;i++)for(let j=0;j<holes.length;j++){
    if(i===j)continue;
    const a=holes[i],b=holes[j];
    if(a.r<b.r*1.2)continue;
    if(b===me&&grace>0)continue;
    if(b.imm>0)continue;                    /* no se lo comen dos veces seguidas */
    if(Math.hypot(a.x-b.x,a.z-b.z)>a.r*.8)continue;
    a.mass+=b.mass*.55;a.r=radiusFor(a.mass);a.since=0;
    /* al comido le queda casi la mitad si es el JUGADOR (perder tres cuartos de la
       masa a los 40 s te deja sin partida) y un cuarto con piso de 6 si es rival.
       Y 2,2 s de inmunidad: sin eso el pozo grande te comía tres veces seguidas. */
    b.mass=b===me?b.mass*(.45+perk.loss):Math.max(b.mass*.25,6);
    b.r=radiusFor(b.mass);b.since=0;b.imm=2.2;
    const s=pick([[-MAP+5,-MAP+5],[MAP-5,-MAP+5],[-MAP+5,MAP-5],[MAP-5,MAP-5]]);
    b.x=s[0];b.z=s[1];b.vx=b.vz=0;b.target=null;
    if(a===me){ARC.toast(ARC.T('ateRival'));ARC.sfx('power');ARC.shake(9);flash=1;}
    else if(b===me){ARC.toast(ARC.T('eaten'));ARC.sfx('lose',{vol:.8});ARC.shake(11);
      flash=1;streak=0;}
  }
  /* separación: sin esto dos rivales quedaban pegados peleando por el mismo banco */
  for(let i=0;i<holes.length;i++)for(let j=i+1;j<holes.length;j++){
    const a=holes[i],b=holes[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1;
    const mn=(a.r+b.r)*.85;
    if(d<mn){const f=(mn-d)*.5,nx=dx/d,nz=dz/d;
      if(a.ai){a.x-=nx*f;a.z-=nz*f;}
      if(b.ai){b.x+=nx*f;b.z+=nz*f;}}
  }
  catchUp(dt);
  tiltStep(dt);
  fallStep(dt);
  spawnTick(dt);
  /* crecer se siente */
  if(Math.floor(me.r)>r0){
    ARC.sfx('power',{rate:1+ (Math.floor(me.r)-1)*.06,vol:.7});
    ARC.shake(6);ARC.toast(ARC.T('grew'));
    const hs=toScreen(me.x,0,me.z);
    if(hs)ARC.fx.ring(hs.x,hs.y,{r:Math.max(50,ARC.H*.3),life:.55,color:'#fff',w:5});
  }
  /* objetivo cumplido: se avisa UNA vez y con festejo (antes no había objetivo) */
  if(!goalHit&&goalOk()&&goal.k!=='rank'){
    goalHit=true;ARC.toast(ARC.T('goalOk'),1500);ARC.sfx('power',{rate:1.25});
    ARC.vib([10,40,10]);
    const hs=toScreen(me.x,0,me.z);
    if(hs)ARC.fx.ring(hs.x,hs.y,{r:Math.max(60,ARC.H*.4),life:.7,color:'#7dff9b',w:6});
  }
  /* últimos 10 segundos */
  const s=Math.max(0,Math.ceil(time));
  if(s<=10&&s>0){
    if(!warned){warned=true;ARC.toast(ARC.T('last10'),1400);ARC.vib(40);}
    if(s!==lastSec){lastSec=s;ARC.sfx('click',{rate:1.45,vol:.42});flash=1;}
  }
  hud();
  if(time<=0)finish();
};
/* ---- FIN DE RONDA: puesto, masa, objetivo, estrellas y monedas ---- */
function finish(){
  done=true;
  const me=holes[0];
  const rank=holes.slice().sort((a,b)=>b.mass-a.mass);
  const pos=rank.indexOf(me)+1,last=pos===holes.length;
  const ok=goalOk(),win=ok&&!last;
  const st=win?(pos===1?3:(pos===2?2:1)):0;
  const coins=Math.round(me.mass/5)+(ok?25:0)+(pos===1?30:0)+Math.min(25,bestStreak);
  if(bestStreak>(ARC.S.streak||0)){ARC.S.streak=bestStreak;}
  ARC.over({win,score:Math.round(me.mass),stars:st,coins,
    title:win?(pos===1?ARC.T('first'):ARC.T('place')+' '+pos)
             :(last?ARC.T('last'):ARC.T('place')+' '+pos),
    sub:'<b style="color:'+(ok?'#7dff9b':'#ff8a8a')+'">'+(ok?ARC.T('goalDone'):ARC.T('goalMiss'))
      +'</b>: '+goalTxt(true)+' ('+goalProg()+'/'+goal.n+')<br>'
      +ARC.T('yourMass')+': <b>'+Math.round(me.mass)+'</b> · '+ARC.T('swallowed')+': '+eaten
      +' · '+ARC.T('streak')+': '+bestStreak+'<br>'
      +ARC.T('rivals')+': '+rank.filter(h=>h!==me).map(h=>Math.round(h.mass)).join(' · ')
      +' &nbsp;·&nbsp; <b style="color:#ffd166">+'+coins+' ◉</b>'});
}

/* ============================ MODO ATRACCIÓN ============================
   El menú no puede ser una foto quieta: acá corre una partida sola (tres pozos
   comiéndose el barrio) con la cámara orbitando el pozo grande. Se reinicia sola
   cada ~26 s o cuando el pozo ya se comió todo. */
function demoStart(){
  demo=1;aT=0;
  gp=ARC.gfxP?ARC.gfxP():gp;
  perk=SKINS[skinId()];
  if(!city)buildGround();
  buildCity(1);
  for(const h of holes)scene.remove(h.g);
  holes=[mkHole(perk.col,true,5.5,5.5)];
  const cols=rivalCols();
  const spots=[[-11,-11],[11,11]];
  for(let i=0;i<2;i++){
    const h=mkHole(cols[i%cols.length],true,spots[i][0],spots[i][1]);
    h.sp=6.6;h.eff=1;holes.push(h);
  }
  /* con masa 3-9 el pozo era un puntito y el menú no se leía como este juego:
     arrancan ya crecidos y comiéndose árboles y autos */
  holes[0].mass=rnd(45,70);
  for(let i=1;i<holes.length;i++)holes[i].mass=rnd(20,40);
  for(const h of holes)h.r=radiusFor(h.mass);
  spawnT=.4;time=0;
  window.__holes=holes;
}
G.attract=function(dt,g){
  if(!T3||!scene||!ARC.rnd)return;
  if(!demo){demoStart();return;}
  aT+=dt;rsTick(dt);
  for(const p of props)if(p.st===1)p.touch=0;
  for(const h of holes){
    aiStep(h,dt);
    /* en el menú los pozos no salen del interior del barrio: si el pozo que sigue
       la cámara se iba a una esquina, el menú mostraba medio campo vacío */
    const lim=Math.min(FENCE-.55-h.r,MAP-9);
    h.x=clamp(h.x,-lim,lim);h.z=clamp(h.z,-lim,lim);
    eatStep(h,dt,null);                       /* me=null: sin efectos ni sonido */
  }
  tiltStep(dt);fallStep(dt);spawnTick(dt*1.5);
  const me=holes[0];
  /* cámara orbitando: se ve el pozo comiendo y el barrio detrás, y nunca queda
     vacío ni en vertical ni apaisado (el encuadre siempre incluye el pozo) */
  /* más baja que la de partida (1,0 contra 1,22 de altura) y apuntando por encima
     del pozo: así el pozo queda en el tercio de abajo y no detrás del título */
  const R=Math.min(18,9.5+me.r*2.8),a=aT*.17;
  cam.position.set(me.x+Math.cos(a)*R,R*1.16,me.z+Math.sin(a)*R);
  cam.lookAt(me.x,R*.2,me.z);
  const cd=Math.hypot(R*1.16,R),fk=clamp(gp.fog,.65,1.3);
  scene.fog.near=cd*1.1;scene.fog.far=cd*1.1+62*fk;
  for(const h of holes)holeVis(h,me);
  /* A LA MITAD DE CUADROS. Medido (900x430 swiftshader): el menú con la escena
     viva daba 18 fps y sin ella 60, o sea que la escena de fondo se estaba
     comiendo el menú (y el menú tiene animaciones de CSS que necesitan cuadros).
     Un fondo a 30 Hz no se nota —la cámara gira lento— y devuelve la mitad del
     costo; el lienzo se queda con el cuadro anterior, que además le ahorra al
     compositor volver a subir la textura. */
  aHalf=!aHalf;
  if(aHalf)ARC.rnd.render(scene,cam);
  if(aT>26||me.r>5.2)demo=0;                  /* ronda de demo nueva */
};

/* ============================ TIENDA DE POZOS ============================ */
let shopEl=null;
function buildShop(){
  shopEl=document.createElement('div');
  shopEl.className='scr';shopEl.id='agShop';
  shopEl.innerHTML='<div class="card" style="max-width:94vmin;width:min(94vmin,760px);gap:1.2vmin">'
    +'<div class="h2" id="agTtl"></div>'
    +'<div class="sm" id="agSub" style="opacity:.85"></div>'
    +'<div id="agGrid" style="display:grid;grid-template-columns:repeat(3,1fr);'
    +'gap:clamp(4px,1.1vmin,10px);width:100%"></div>'
    +'<div class="btn" id="agDone"></div></div>';
  document.getElementById('stage').appendChild(shopEl);
  shopEl.querySelector('#agDone').addEventListener('pointerdown',e=>{
    e.preventDefault();ARC.sfx('tap');ARC.vib(8);shopEl.classList.remove('on');});
}
function paintShop(){
  const own=owned(),cur=skinId();
  shopEl.querySelector('#agTtl').textContent=ARC.T('shop');
  shopEl.querySelector('#agSub').innerHTML=ARC.T('shopSub')+' · <b style="color:#ffd166">'
    +(ARC.S.coins||0)+' ◉</b>';
  shopEl.querySelector('#agDone').textContent=ARC.T('done');
  const gr=shopEl.querySelector('#agGrid');gr.innerHTML='';
  SKINS.forEach((s,i)=>{
    const has=own.indexOf(i)>=0,sel=i===cur;
    const el=document.createElement('div');
    el.style.cssText='pointer-events:auto;display:flex;flex-direction:column;align-items:center;'
      +'gap:.3em;padding:clamp(5px,1.2vmin,12px);border-radius:14px;text-align:center;'
      +'background:'+(sel?'rgba(192,132,252,.22)':'rgba(255,255,255,.06)')+';'
      +'border:1px solid '+(sel?s.col:'rgba(255,255,255,.14)')+';'
      +'opacity:'+(has?1:.72);
    el.innerHTML='<div style="width:clamp(20px,4.6vmin,34px);height:clamp(20px,4.6vmin,34px);'
      +'border-radius:50%;background:#05060a;border:3px solid '+s.col
      +';box-shadow:0 0 12px '+s.col+'88"></div>'
      +'<b style="font-size:clamp(9px,2.1vmin,15px)">'+ARC.T('sk'+i)+'</b>'
      +'<span style="font-size:clamp(7px,1.6vmin,12px);opacity:.78;line-height:1.15">'
      +ARC.T('p'+i)+'</span>'
      +'<span style="font-size:clamp(8px,1.9vmin,13px);font-weight:900;color:'
      +(sel?s.col:(has?'#9fe8b0':'#ffd166'))+'">'
      +(sel?ARC.T('use'):(has?ARC.T('have'):s.cost+' ◉'))+'</span>';
    el.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      if(has){ARC.S.skin=i;ARC.save();ARC.sfx('tap');ARC.vib(8);
        if(demo)demo=0;                        /* la demo del menú cambia de color */
        paintShop();return;}
      if((ARC.S.coins||0)>=s.cost){
        ARC.S.coins-=s.cost;own.push(i);ARC.S.skin=i;ARC.save();
        ARC.sfx('power');ARC.vib([10,40,10]);ARC.toast(ARC.T('bought'));
        if(demo)demo=0;
        paintShop();refreshCoins();
      }else{
        ARC.sfx('groan',{vol:.5});
        ARC.toast(ARC.T('need')+' '+(s.cost-(ARC.S.coins||0))+' ◉');
      }
    });
    gr.appendChild(el);
  });
}
function refreshCoins(){const c=document.getElementById('mCoins');
  if(c)c.textContent=ARC.S.coins||0;}
function openShop(){
  if(!shopEl)buildShop();
  paintShop();shopEl.classList.add('on');
}

/* ============================ DIBUJO ============================ */
function toScreen(x,y,z){
  if(!cam)return null;
  PV.set(x,y,z).project(cam);
  if(PV.z>1)return null;
  return {x:(PV.x*.5+.5)*ARC.W,y:(-PV.y*.5+.5)*ARC.H,on:Math.abs(PV.x)<1&&Math.abs(PV.y)<1};
}
function rrect(g,x,y,w,h,r){
  g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);
  g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);
  g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
}
G.draw=function(g){
  if(!ARC.rnd||!scene||!holes.length)return;
  const me=holes[0];
  /* la cámara se aleja con el radio: crecer se SIENTE (y el barrio se lee).
     TOPE 24: sin tope, con el pozo enorme la cámara veía 100 de ancho y media
     pantalla era campo vacío. */
  /* TOPE 20 y no 24, y menos picado: a 24 con 57° la partida se leía como un
     PLANO del barrio (todo asfalto visto de arriba, las casas sin fachada). A 20
     con 49° se ve el volumen de las casas y el pozo ocupa lo que tiene que ocupar. */
  camD=lerp(camD,Math.min(20,8.2+me.r*3.3),.09);
  /* CAJA DE CÁMARA: deja de seguir al pozo cerca del borde, sin girar en Y (si se
     corriera la cámara en X mirando al pozo, las calles saldrían en diagonal). */
  const CL=Math.max(4,MAP-camD*.46),CLZ=Math.max(4,MAP-camD*.4);
  const cx=clamp(me.x,-CL,CL),cz=clamp(me.z,-CLZ,CLZ);
  cam.position.set(cx,camD*1.22,cz+camD*1.05);
  cam.lookAt(cx,0,cz-camD*.1);
  /* niebla relativa a la cámara: fija, al crecer el pozo el suelo de abajo entraba
     en la niebla y la pantalla se lavaba (medido con snapGL) */
  const cd=Math.hypot(camD*1.22,camD*1.05),fk=clamp(gp.fog,.65,1.3);
  scene.fog.near=cd*1.15;scene.fog.far=cd*1.15+58*fk;
  for(const h of holes)holeVis(h,me);
  ARC.rnd.render(scene,cam);

  /* ---------------- HUD 2D ---------------- */
  const rank=holes.slice().sort((a,b)=>b.mass-a.mass);
  const fs=Math.max(9,Math.min(ARC.H*.038,20));
  const rowH=fs*1.5,pad=fs*.55;
  const x0=ARC.W*.026,y0=ARC.H*.16;
  const w=Math.max(150,ARC.W*.27),hh=rowH*rank.length+pad*2;
  const panel={x:x0-4,y:y0-4,w:w+8,h:hh+8};
  /* el panel de puestos se dibuja AL FINAL (drawRank), después de las marcas de
     los rivales: si iba antes, la marca de un rival arriba a la izquierda le
     quedaba encima y se leía como una barra rota */
  const drawRank=()=>{
  rrect(g,x0,y0,w,hh,fs*.5);
  g.fillStyle='rgba(8,11,16,.74)';g.fill();   /* a .55 se veía el barrio a través */
  g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=1;g.stroke();
  const top=Math.max(1,rank[0].mass);
  /* columnas fijas: puesto · chapa de color · nombre · barra · masa */
  const cN=x0+pad,cChip=cN+fs*.95,cNm=cChip+fs*.95,cBar=cNm+fs*2.2,
        cMass=x0+w-pad,bw=cMass-cBar-fs*2.3;
  rank.forEach((h,i)=>{
    const mid=y0+pad+rowH*i+rowH*.5,mine=h===me;
    g.textBaseline='middle';g.textAlign='left';
    g.font='900 '+fs+'px system-ui,sans-serif';
    g.fillStyle=mine?'#ffffff':'rgba(255,255,255,.55)';
    g.fillText((i+1)+'',cN,mid);
    g.fillStyle=h.col;
    rrect(g,cChip,mid-fs*.3,fs*.6,fs*.6,fs*.18);g.fill();
    g.font='900 '+(fs*.68)+'px system-ui,sans-serif';
    g.fillStyle=mine?'#ffffff':'rgba(255,255,255,.62)';
    g.fillText(mine?ARC.T('you'):(h.nick||'R'),cNm,mid);
    g.fillStyle='rgba(255,255,255,.12)';
    rrect(g,cBar,mid-fs*.26,bw,fs*.52,fs*.26);g.fill();
    g.fillStyle=h.col;
    rrect(g,cBar,mid-fs*.26,Math.max(fs*.52,bw*clamp(h.mass/top,.04,1)),fs*.52,fs*.26);g.fill();
    g.textAlign='right';g.font='900 '+fs+'px system-ui,sans-serif';
    g.fillStyle=mine?'#ffffff':'rgba(255,255,255,.75)';
    g.fillText(Math.round(h.mass)+'',cMass,mid);
  });
  g.textBaseline='alphabetic';g.textAlign='left';
  };
  /* marcas de los rivales en pantalla: aro del color + masa, y flecha si está
     fuera de cuadro (antes un rival podía comerte sin que supieras dónde estaba).
     Mientras está la tarjeta de OBJETIVO no se dibuja nada de esto: la tarjeta es
     ancha y el panel de puestos le quedaba montado encima (V-ag-objetivo-h). */
  if(introT<=0)for(let i=1;i<holes.length;i++){
    const h=holes[i],sc=toScreen(h.x,0,h.z);
    if(!sc)continue;
    const big=h.r>me.r*1.2;
    if(sc.on){
      g.strokeStyle=h.col;g.lineWidth=Math.max(2,fs*.16);
      g.beginPath();g.arc(sc.x,sc.y,fs*.82,0,TAU);g.stroke();
      g.font='900 '+(fs*.8)+'px system-ui,sans-serif';g.textAlign='center';
      g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.6)';
      g.strokeText(Math.round(h.mass)+(big?' ▲':''),sc.x,sc.y-fs*1.1);
      g.fillStyle=h.col;g.fillText(Math.round(h.mass)+(big?' ▲':''),sc.x,sc.y-fs*1.1);
      g.textAlign='left';
    }else{
      /* flecha en el BORDE de la pantalla (se proyecta la dirección sobre el
         rectángulo, no sobre una elipse: con la elipse la flecha caía DENTRO del
         panel de puestos y se leía como una barra rota) */
      const cx2=ARC.W/2,cy2=ARC.H/2,m=fs*1.6;
      let dx=sc.x-cx2,dy=sc.y-cy2;const L=Math.hypot(dx,dy)||1;
      dx/=L;dy/=L;
      const t=Math.min(Math.abs((ARC.W/2-m)/(dx||1e-6)),Math.abs((ARC.H/2-m)/(dy||1e-6)));
      let mx=cx2+dx*t,my=cy2+dy*t;
      if(mx>panel.x&&mx<panel.x+panel.w&&my>panel.y&&my<panel.y+panel.h)
        my=panel.y+panel.h+fs*1.2;          /* si pisa el panel, se corre abajo */
      g.save();g.translate(mx,my);g.rotate(Math.atan2(dy,dx));
      g.fillStyle=h.col;g.beginPath();
      g.moveTo(fs*.8,0);g.lineTo(-fs*.4,fs*.5);g.lineTo(-fs*.4,-fs*.5);g.closePath();g.fill();
      g.restore();
      g.font='900 '+(fs*.72)+'px system-ui,sans-serif';g.textAlign='center';
      g.fillStyle=h.col;g.fillText(Math.round(h.mass)+'',mx,my+fs*1.5);g.textAlign='left';
    }
  }
  if(introT<=0){drawRank();drawGoal(g,fs);}
  /* aviso de los últimos segundos: marco rojo que late + cuenta atrás gigante */
  if(flash>.01){
    const lw=Math.max(5,ARC.H*.03);
    g.strokeStyle='rgba(255,64,64,'+(flash*.6).toFixed(3)+')';
    g.lineWidth=lw;g.strokeRect(lw/2,lw/2,ARC.W-lw,ARC.H-lw);
    g.strokeStyle='rgba(255,150,150,'+(flash*.5).toFixed(3)+')';
    g.lineWidth=lw*.35;g.strokeRect(lw*1.2,lw*1.2,ARC.W-lw*2.4,ARC.H-lw*2.4);
  }
  /* CUENTA ATRÁS: en rojo translúcido encima del pozo negro era un manchón
     ilegible (V-ag-cuenta-h). Va en blanco con contorno rojo grueso, más arriba
     que el pozo y arrancando bien opaca. */
  const secs=Math.ceil(time);
  if(!done&&secs<=5&&secs>0){
    const k=1-(secs-time);                    /* 0..1 dentro del segundo */
    g.globalAlpha=clamp(.95-k*.8,0,1);
    g.font='900 '+Math.round(ARC.H*(.26+k*.1))+'px system-ui,sans-serif';
    g.textAlign='center';g.textBaseline='middle';
    g.lineWidth=Math.max(4,ARC.H*.022);g.strokeStyle='rgba(255,40,40,.95)';
    g.strokeText(secs+'',ARC.W/2,ARC.H*.36);
    g.fillStyle='#fff';g.fillText(secs+'',ARC.W/2,ARC.H*.36);
    g.globalAlpha=1;g.textAlign='left';g.textBaseline='alphabetic';
  }
  /* tarjeta de objetivo al empezar el barrio */
  if(introT>0){
    const k=clamp(introT/.45,0,1);
    g.globalAlpha=k;
    const w2=Math.min(ARC.W*.7,520),h2=Math.max(58,ARC.H*.26),x2=(ARC.W-w2)/2,y2=ARC.H*.2;
    rrect(g,x2,y2,w2,h2,Math.max(10,ARC.H*.03));
    g.fillStyle='rgba(8,11,16,.86)';g.fill();
    g.strokeStyle=G.acc;g.lineWidth=2;g.stroke();
    g.textAlign='center';
    g.fillStyle='rgba(255,255,255,.6)';
    g.font='900 '+Math.max(9,ARC.H*.035)+'px system-ui,sans-serif';
    g.fillText(ARC.T('hood')+' '+lvl+' · '+ARC.T('goal'),ARC.W/2,y2+h2*.3);
    g.fillStyle='#fff';
    g.font='900 '+Math.max(13,ARC.H*.068)+'px system-ui,sans-serif';
    g.fillText(goalTxt(),ARC.W/2,y2+h2*.66);
    g.fillStyle='rgba(255,255,255,.55)';
    g.font='800 '+Math.max(8,ARC.H*.03)+'px system-ui,sans-serif';
    g.fillText(ARC.T('hint'),ARC.W/2,y2+h2*.9);
    g.textAlign='left';g.globalAlpha=1;
  }else if(hintT>0){
    g.globalAlpha=clamp(hintT/1.2,0,1);
    g.fillStyle='rgba(14,18,26,.9)';
    g.font='900 '+Math.max(11,Math.min(ARC.H*.045,26))+'px system-ui,sans-serif';
    g.textAlign='center';
    g.fillText(ARC.T('hint'),ARC.W/2,ARC.H*.88);
    g.font='800 '+Math.max(9,Math.min(ARC.H*.03,17))+'px system-ui,sans-serif';
    g.fillStyle='rgba(14,18,26,.66)';
    g.fillText(ARC.T('hint2'),ARC.W/2,ARC.H*.93);
    g.textAlign='left';g.globalAlpha=1;
  }
};
/* barra de OBJETIVO debajo del reloj: sin esto el jugador no sabía qué le pedían */
function drawGoal(g,fs){
  const w=Math.max(120,ARC.W*.2),h=fs*1.15,x=(ARC.W-w)/2,y=ARC.H*.115;
  const pr=goalProg(),k=clamp(pr/goal.n,0,1);
  rrect(g,x,y,w,h,h*.5);
  g.fillStyle='rgba(8,11,16,.66)';g.fill();
  if(k>0){
    g.save();rrect(g,x,y,w,h,h*.5);g.clip();
    g.fillStyle=k>=1?'#7dff9b':G.acc;
    rrect(g,x,y,w*k,h,h*.5);g.fill();
    g.restore();
  }
  g.font='900 '+(fs*.72)+'px system-ui,sans-serif';
  g.textAlign='center';g.textBaseline='middle';
  g.fillStyle=k>=1?'#06210f':'#fff';
  g.fillText((k>=1?'✔ ':'◎ ')+(goal.k==='rank'
      ?goalTxt(true)+' · '+rankOf(holes[0])+'º'
      :pr+'/'+goal.n+' '+goalTxt(true).replace(goal.n+' ','').replace(goal.n,'')),
    ARC.W/2,y+h*.55);
  g.textAlign='left';g.textBaseline='alphabetic';
}

/* ============================ SONDA ============================ */
G.dbg={
  state:()=>({mass:Math.round(holes[0]?holes[0].mass:0),
    r:+(holes[0]?holes[0].r:0).toFixed(2),
    time:+time.toFixed(1),props:props.filter(live).length,census,
    eaten,goal:goal.k+':'+goalProg()+'/'+goal.n,ok:goalOk(),streak:bestStreak,
    rivals:holes.slice(1).map(h=>Math.round(h.mass)),
    rank:1+holes.filter(h=>h!==holes[0]&&h.mass>holes[0].mass).length,
    tris:Object.keys(KGEO).map(k=>k+':'+KGEO[k].tris+(KGEO[k].glb?'g':'b')).join(' '),
    censo:(()=>{const o={};for(const p of props)if(live(p))o[p.kind]=(o[p.kind]||0)+1;return o;})(),
    draws:ims.length,rs:+rs.toFixed(2),done,lvl}),
  /* palanca para las pruebas: poner el pozo en una esquina o darle masa, que es
     como se comprueba que el cerco tapa el canto y que la cámara se aleja */
  set:o=>{
    if(!holes.length)return null;
    const h=holes[0];
    if(o.x!=null)h.x=o.x;if(o.z!=null)h.z=o.z;
    if(o.mass!=null){h.mass=o.mass;h.r=radiusFor(o.mass);camD=Math.min(20,8.2+h.r*3.3);}
    if(o.time!=null)time=o.time;
    if(o.hint!=null){hintT=o.hint;introT=0;}
    if(o.rs!=null){rs=o.rs;applyRS();}
    if(o.rsLock!=null)rsLock=o.rsLock;
    /* comparar los modelos importados contra la versión de cajas sin recargar */
    if(o.box!=null){
      for(const k in K)if(K[k].glb){delete KGEO[k];if(o.box)KGEO[k]=boxGeoFor(k);}
      buildCity(lvl);
    }
    return G.dbg.state();
  },
  autoMove:()=>{
    if(done||!holes.length)return false;
    const h=holes[0];
    /* huir del rival que me puede comer */
    for(let i=1;i<holes.length;i++){
      const o=holes[i];
      if(o.r>h.r*1.2&&Math.hypot(o.x-h.x,o.z-h.z)<o.r*4){
        const dx=h.x-o.x,dz=h.z-o.z,L=Math.hypot(dx,dz)||1;
        dirv.x=dx/L;dirv.z=dz/L;return true;
      }
    }
    let best=null,bd=1e9,any=null,ad=1e9;
    for(const p of props){
      if(!live(p))continue;
      const d=Math.hypot(p.x-h.x,p.z-h.z);
      if(d<ad){ad=d;any=p;}
      if(!canEat(h,p))continue;
      const s=d-p.mass*.5;
      if(s<bd){bd=s;best=p;}
    }
    const t=best||any;
    if(!t)return false;
    const dx=t.x-h.x,dz=t.z-h.z,L=Math.hypot(dx,dz)||1;
    dirv.x=dx/L;dirv.z=dz/L;
    return true;
  }
};
G.i18nDone=function(){
  if(shopEl&&shopEl.classList.contains('on'))paintShop();
  if(!holes.length)return;
  ARC.trayTxt('goal','◎ '+goalTxt(true));
  infoCache='';hud(true);
};
window.GAME=G;
