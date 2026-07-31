/* ============================================================================
   ZUMBA CAÑÓN — el cañón contra los bloques que caen (tipo Ball Blast)
   ----------------------------------------------------------------------------
   Arrastrás el cañón por el piso; dispara SOLO hacia arriba. Del techo caen
   BLOQUES con un NÚMERO (su vida) que rebotan en el piso y en las paredes; cada
   bala les saca vida y al llegar a cero SE PARTEN en dos más chicos hasta
   desaparecer. Si un bloque te toca, perdés una vida. Cada bloque roto larga
   MONEDAS que vuelan al cañón, y entre oleadas se gastan en mejoras
   PERMANENTES (daño, cadencia, cañones, vidas). Oleadas infinitas, JEFE cada 10.

   LO QUE HAY QUE SABER PARA TOCAR ESTE ARCHIVO
   --------------------------------------------
   · VELOCIDAD ANTES QUE NADA (medido con renderer.info en partida, swiftshader):
     todo lo que se repite es UN InstancedMesh — bloques, balas, pedazos, monedas
     y los fogonazos —, y todo el escenario (fondo, ciudad, paredes, piso) es UNA
     malla fusionada con color por vértice. MEDIDO con renderer.info: la partida
     normal va en 4-6 llamadas de dibujo y 1.700-2.100 triángulos, y el caso peor a
     propósito (24 bloques + jefe + 4 cañones) en 8 llamadas y 5.350 triángulos —
     contra los topes de 60 llamadas y 25.000 triángulos. Los dos GLB (cañón y jefe)
     vienen horneados por ag/bake.py a color por vértice con 1.146 y 1.988
     triángulos.
     El fondo NO lleva capas superpuestas: en swiftshader lo que mata es el
     relleno, no la geometría (medido en Agujero: 66 ms de rasterizado contra 1 ms
     de comandos). Un solo cuadro de fondo, sin niebla y sin luces por fragmento
     (MeshBasicMaterial + color por vértice: el sombreado de las caras está
     HORNEADO en la geometría del cubo, así el bloque se ve con volumen sin
     costar una sola luz).
   · LOS NÚMEROS NO SON TEXTURAS. Un canvas por bloque serían 40 texturas nuevas
     por oleada. Se proyecta el centro del bloque a pantalla (proj()) y el número
     se dibuja en la capa 2D del motor, que además queda nítido en cualquier DPR.
   · LA SIMULACIÓN VA A 60 Hz FIJOS y el dibujo EXTRAPOLA con alpha·STEP usando la
     velocidad de cada cosa (posición balística: extrapolar es idéntico a
     interpolar y no hace falta guardar el estado anterior de 40 bloques).
   · MODO ATRACCIÓN (GAME.attract): el menú tiene el juego jugándose solo detrás,
     con el piloto manejando el cañón y los números encima de los bloques. Es el
     MISMO simulador con demo=1: no cobra monedas, no mata y encadena oleadas.
     Por eso todo lo que "cobra" o "mata" pregunta por demo.
   · LA TIENDA ES CANVAS, NO DOM. Se dibuja en la capa 2D y se toca por
     hit-test (shopHit). Es a propósito: la sonda de interfaz toca con el mouse de
     verdad y mide con elementFromPoint quién recibe el toque; un panel de DOM
     encima del escenario le robaría el toque a PAUSA. El ARSENAL del menú sí es
     DOM (ahí no hay partida que interrumpir) y se arma con las clases del motor.
   · MEJORAS PERMANENTES en ARC.S.zu (daño/cadencia/cañones/vidas) y skins en
     ARC.S.zsk: es lo único que engancha en un juego de oleadas infinitas. Las
     monedas son las del motor (ARC.S.coins) así que la insignia del menú ya las
     muestra. OJO: ARC.over NO recibe coins, porque las monedas ya se sumaron
     durante la partida (si no, se contarían dos veces).
   · JUSTICIA. La primera oleada son 5 bloques de vida 2-4 y el primero tarda 1,2 s
     en aparecer: nunca se muere en el primer segundo. Los bloques rebotan con piso
     MÍNIMO de 5,2 u/s (suben 1,6: bien arriba del cañón) y caen con TOPE de 6,8, así
     que siempre hay más de un segundo para leer la pantalla y correrse.
   · EL PILOTO (dbg.autoMove) es el que encontró casi todos los bugs de este
     archivo. Prueba la posición EXACTA de tiro de cada blanco, del más urgente al
     menos, y toma la primera que no tenga un peligro encima en menos de 0,32 s ni
     un peligro EN EL CAMINO (huir cruzando por debajo del bloque que te viene
     encima era la causa de todas sus muertes).
   ========================================================================== */
const G={
  slug:'zumba',name:'ZUMBA CAÑON',
  title:'ZUMBA <em>CAÑÓN</em>',
  sub:'Cañón contra bloques que caen.',
  subKey:'sub',
  acc:'#ffb020',acc2:'#f07a0a',
  levels:0,bestLabel:'OLEADA',bestKey:'waveL',
  three:true,sky:'#0b1330',shadows:false,
  glbTris:2400,   /* los dos GLB ya vienen horneados por ag/bake.py (1.146 y 1.988
     triángulos con COLOR_0 y caras planas): el tope está por ARRIBA de eso a
     propósito, para que el motor NO los vuelva a simplificar (perdería el facetado
     y tardaría de más en cargar). Los triángulos vienen SIN índice (una cara =
     3 vértices), así que en swiftshader cada triángulo cuesta 3 pasadas de
     vértice: medido, el jefe de 3.439 costaba 18 fps en el caso peor (23 bloques
     + jefe a 412x915) y el de 1.988 cuesta la mitad. */
  art:A('art-zumba.jpg'),music:A('mus-zumba.m4a'),
  /* SONIDO CON ATAQUE EN CERO. Medí la envolvente de todos los mp3 del pack
     decodificados en el navegador (ventanas de 50 ms): casi ninguno arranca en el
     sample 0 — sfx-glass tiene el golpe en 0,65 s, sfx-boom el estallido en 1,85 s,
     sfx-coin en 0,30 s y el disparo que generé, en 0,90 s. El motor los toca desde
     el principio, así que el sonido llegaba MEDIO SEGUNDO tarde y varios estaban
     casi mudos (pico 0,10-0,23). scratchpad/_zwav.js los decodifica, busca el pico,
     recorta desde 15 ms antes, normaliza a 0,9 y escribe un WAV de 16 bits a
     22 kHz. Todos los efectos de este juego salen de ahí: pegan en el cuadro justo.
     PEDIDO AL MOTOR: o ARC.sfx acepta un desplazamiento de inicio, o el pack entero
     necesita esta pasada de recorte (no es sólo este juego). */
  sfx:{tap:A('sfx-zumba-tap.wav'),click:A('sfx-zumba-coin.wav'),coin:A('sfx-zumba-coin.wav'),
       win:A('sfx-zumba-up.wav'),lose:A('sfx-zumba-lose.wav'),boom:A('sfx-zumba-boom.wav'),
       power:A('sfx-zumba-up.wav'),glass:A('sfx-zumba-crack.wav'),
       shot:A('sfx-zumba-shot.wav'),crack:A('sfx-zumba-crack.wav'),
       alarm:A('sfx-zumba-jefe.wav')},
  glb:{canon:A('m-zumba-canon.glb'),jefe:A('m-zumba-jefe.glb')},
  i18n:{
    es:{sub:'Arrastrá el cañón, dispara solo. Rompé los bloques antes de que te aplasten y mejorá el cañón para siempre. Oleadas infinitas y JEFE cada 10.',
      waveL:'OLEADA',wave:'OLEADA',boss:'¡JEFE!',bossIn:'JEFE EN CAMINO',
      tut:'ARRASTRÁ PARA MOVER EL CAÑÓN',tut2:'el cañón dispara solo',
      shop:'MEJORAS',goOn:'SEGUIR',max:'MÁX',lvS:'Nv',
      upDmg:'DAÑO',upRate:'CADENCIA',upGuns:'CAÑONES',upLife:'VIDAS',
      clear:'¡OLEADA LIMPIA!',hit:'¡TE PEGARON!',bossDown:'¡JEFE DESTRUIDO!',
      overT:'TE APLASTARON',arsenal:'ARSENAL',skins:'CAÑONES',done:'LISTO',
      own:'TUYO',use:'USAR',using:'EN USO',locked:'TRABADO',
      stWave:'Oleada',stKills:'Bloques roscos',stCoins:'Monedas',stStreak:'Mejor racha',
      newRec:'¡NUEVO RÉCORD!',noCoins:'Faltan monedas',mult:'RACHA',
      sk0:'ORO',sk1:'HIELO',sk2:'TÓXICO',sk3:'INFIERNO'},
    en:{sub:'Drag the cannon, it fires by itself. Smash the blocks before they crush you and upgrade it forever. Endless waves and a BOSS every 10.',
      waveL:'WAVE',wave:'WAVE',boss:'BOSS!',bossIn:'BOSS INCOMING',
      tut:'DRAG TO MOVE THE CANNON',tut2:'it fires by itself',
      shop:'UPGRADES',goOn:'CONTINUE',max:'MAX',lvS:'Lv',
      upDmg:'DAMAGE',upRate:'FIRE RATE',upGuns:'CANNONS',upLife:'LIVES',
      clear:'WAVE CLEAR!',hit:'YOU GOT HIT!',bossDown:'BOSS DOWN!',
      overT:'CRUSHED',arsenal:'ARSENAL',skins:'CANNONS',done:'DONE',
      own:'OWNED',use:'USE',using:'IN USE',locked:'LOCKED',
      stWave:'Wave',stKills:'Blocks smashed',stCoins:'Coins',stStreak:'Best streak',
      newRec:'NEW BEST!',noCoins:'Not enough coins',mult:'STREAK',
      sk0:'GOLD',sk1:'ICE',sk2:'TOXIC',sk3:'INFERNO'},
    pt:{sub:'Arraste o canhão, ele atira sozinho. Quebre os blocos antes que te esmaguem e melhore o canhão para sempre. Ondas infinitas e CHEFE a cada 10.',
      waveL:'ONDA',wave:'ONDA',boss:'CHEFE!',bossIn:'CHEFE CHEGANDO',
      tut:'ARRASTE PARA MOVER O CANHÃO',tut2:'ele atira sozinho',
      shop:'MELHORIAS',goOn:'CONTINUAR',max:'MÁX',lvS:'Nv',
      upDmg:'DANO',upRate:'CADÊNCIA',upGuns:'CANHÕES',upLife:'VIDAS',
      clear:'ONDA LIMPA!',hit:'VOCÊ FOI ATINGIDO!',bossDown:'CHEFE DESTRUÍDO!',
      overT:'ESMAGADO',arsenal:'ARSENAL',skins:'CANHÕES',done:'PRONTO',
      own:'SEU',use:'USAR',using:'EM USO',locked:'TRAVADO',
      stWave:'Onda',stKills:'Blocos quebrados',stCoins:'Moedas',stStreak:'Melhor sequência',
      newRec:'NOVO RECORDE!',noCoins:'Faltam moedas',mult:'SEQUÊNCIA',
      sk0:'OURO',sk1:'GELO',sk2:'TÓXICO',sk3:'INFERNO'}
  }
};
/* OJO: el shell ya declaró `const T=ARC.T` en este mismo ámbito de módulo.
   Redeclarar T (o clamp, lerp, rnd, pick, TAU, SAVE…) rompe el módulo entero. */

/* ------------------------------------------------------------- constantes */
/* ENCUADRE. Con VH=7,2 el rebote de los bloques (apogeo 1,5-3,4) ocupaba el
   tercio de abajo y el 60% de la pantalla era cielo vacío: se veía muerto (captura
   Z-play-h). Con 5,6 la acción llena la pantalla y el campo se hace más angosto,
   así que hay más bloques a tiro. La cámara mira 0,55 por debajo del centro para
   que el cañón no quede pegado al borde de abajo. */
const VH=5.6;
const FOVY=46, CAMZ=(VH/2)/Math.tan(FOVY/2*Math.PI/180), CAMY=VH/2-.55;
const CANY=0.0, CANH=0.62, CANW=0.50;          /* caja de CHOQUE del cañón (el
   dibujo mide 0,98 de alto: la caja es más baja a propósito, así el bloque que
   pasa raspando el caño no te mata) */
const CANSP=34;                                /* velocidad del cañón (u/s) */
const BSPD=19.0, GRAV=8.4;
/* CAÍDA CON TOPE. Sin tope, un bloque recién nacido llegaba al piso a 12,3 u/s:
   cruzaba la pantalla en 0,6 s y no había forma humana (ni del piloto) de
   reaccionar — tres muertes seguidas con vy −11,9 (medido con dbg.log()). Con
   tope de 6,8 la bajada más rápida dura 1,15 s. */
const VTMAX=6.8;
const SZ=[0.46,0.66,0.92,1.26];                /* lado del bloque por escalón */
const HPB=[1,2,4,8];                           /* vida base por escalón */
const MAXB=46,MAXBUL=120,MAXSH=120,MAXCO=64;
const BOSSZ=2.10;
const BR=.22;                                  /* radio de la bala para el choque */
const PAL={
  tier:['#4cc9f0','#66d97a','#c084fc','#ff4d6d'],
  tierL:['#d6f4ff','#dcffe2','#eeddff','#ffd8de'],
  boss:'#ff2d55',gold:'#ffb020',goldL:'#ffe08a',
  wall:'#16233f',wallL:'#2c4a7d',floor:'#1a2947',floorT:'#243a63',
  sky0:'#050813',sky1:'#0e1c3a',glow:'#1c3f74',city:'#0b1428',cityT:'#17284c'
};
/* h = TONO del cañón (0..1). El modelo viene horneado en ámbar (tono 0,095): para
   los skins se le ROTA el tono a los colores de los vértices, así el metal oscuro
   sigue oscuro y sólo cambia lo de color. Multiplicar el material por un color (lo
   primero que probé) daba verde oliva: ámbar × celeste = barro. */
const SKIN=[{c:'#ffb020',b:'#ffd166',h:.095,cost:0},
            {c:'#7fe3ff',b:'#d6f6ff',h:.53 ,cost:450},
            {c:'#b6ff5a',b:'#e6ffc0',h:.25 ,cost:1400},
            {c:'#ff5470',b:'#ffc2cd',h:.97 ,cost:3600}];
/* mejoras PERMANENTES: coste geométrico y valor lineal (probado con el piloto) */
const UPG=[
  {k:'dmg' ,n:'upDmg' ,g:'✦',max:40,cost:l=>Math.round(22*Math.pow(1.27,l)),val:l=>1+l},
  {k:'rate',n:'upRate',g:'≫',max:24,cost:l=>Math.round(30*Math.pow(1.30,l)),val:l=>+(6.5+l*.9).toFixed(2)},
  {k:'guns',n:'upGuns',g:'⌃',max:3 ,cost:l=>Math.round(240*Math.pow(2.5,l)) ,val:l=>1+l},
  {k:'life',n:'upLife',g:'♥',max:5 ,cost:l=>Math.round(95*Math.pow(1.95,l)) ,val:l=>3+l}
];

let T3,scene,cam,vv,dum,arenaM=null;
let blockIM,bulIM,shIM,coIM,flIM,gunN=[],bossN=null;
let HW=8,FX=7.4;
let blocks=[],buls=[],shards=[],cns=[];
let wave=1,phase='play',lives=3,streak=0,bestStreak=0,kills=0,runCoins=0;
let cx=0,tx=0,fireT=0,shotT=0,inv=0,camSk=0,keyDir=0,drag=null;
let spawnN=0,spawnT=0,boss=null,warnT=0,deadT=0,tutT=0;
let waveHP=1,dmgDone=0,demo=0,botOn=0,botT=0,hudTxt='',recTold=false;
let partK=1,cityK=1,GLBC=false,GLBJ=false,mixT=0;
const MATS={},GEOS={},LOG=[];

/* ---------------------------------------------------------- utilidades */
const fmt=n=>n<1000?String(Math.round(n))
  :(n<1e5?(n/1e3).toFixed(n<1e4?1:0)+'K':(n<1e6?Math.round(n/1e3)+'K':(n/1e6).toFixed(1)+'M'));
const UP=()=>{const S=ARC.S;if(!S.zu)S.zu={dmg:0,rate:0,guns:0,life:0};
  for(const u of UPG)if(S.zu[u.k]==null)S.zu[u.k]=0;return S.zu;};
const SKN=()=>{const S=ARC.S;if(!S.zsk||!S.zsk.length)S.zsk=[1,0,0,0];
  if(S.zskI==null)S.zskI=0;if(!SKIN[S.zskI]||!S.zsk[S.zskI])S.zskI=0;return S.zsk;};
/* En el MENÚ (demo=1) el cañón usa valores de exhibición: dos caños, mucho daño y
   mucha cadencia. Con las mejoras de nivel 0 no se rompía casi nada y la escena de
   atrás parecía congelada. */
const DEMOV={dmg:3,rate:7,guns:2,life:99};
const uvR=k=>{const u=UPG.find(x=>x.k===k);return u.val(UP()[k]|0);};
const uv=k=>demo?DEMOV[k]:uvR(k);
/* CURVA DE VIDA. El daño EFECTIVO es como un 25% del nominal (el cañón tira
   derecho y los bloques van rebotando: muchas balas pasan al lado). Medido con el
   piloto: la oleada 3 con 122 puntos de vida y 19,5 de daño nominal tardó 30 s.
   Con esta curva y menos bloques por oleada, una oleada dura 12-20 s. */
/* CURVA DE VIDA, a mano y medida con el piloto. El daño EFECTIVO es como un 30%
   del nominal (el cañón tira derecho y los bloques rebotan: muchas balas pasan al
   lado), así que la vida por oleada se calcula sobre eso. Con la curva anterior y
   escalón 3 desde la oleada 6, la oleada 6 tardó 75 s (medido con el piloto): hoy el
   escalón 3 recién aparece en la 10 y una oleada dura 10-25 s. */
const hpMul=w=>1.8+(w-1)*.6+(w-1)*(w-1)*.05;
const skin=()=>{SKN();return SKIN[ARC.S.zskI]||SKIN[0];};

function metrics(){
  const asp=ARC.W/Math.max(1,ARC.H);
  HW=VH*asp/2;
  FX=Math.max(3.4,HW-.42);
}
/* --- malla fusionada con color por vértice: todo el escenario en 1 draw call --- */
function A0(){return{p:[],c:[]};}
function C(h){const c=new T3.Color(h);return[c.r,c.g,c.b];}
function Q(A,a,b,c,d,col,col2){
  const cs=[col,col2||col,col2||col,col];
  const t=[[a,0],[b,1],[c,2],[a,0],[c,2],[d,3]];
  for(const [v,i] of t){A.p.push(v[0],v[1],v[2]);const k=cs[i];A.c.push(k[0],k[1],k[2]);}
}
/* CUADRO con color POR VÉRTICE y giro correcto para mirar a +Z (a,b,c,d =
   abajo-izq, abajo-der, arriba-der, arriba-izq: antihorario visto de frente).
   OJO: el fondo y las tiras de las paredes estaban emitidos AL REVÉS (TL,TR,BR,BL)
   y FrontSide los descartaba: el degradado del cielo no se dibujaba nunca y la
   pared derecha aparecía como una barra dorada y la izquierda no (captura
   Z-play-h). Todo lo vertical va por acá. */
function quad(A,a,b,c,d,ca,cb,cc,cd){
  const P=[[a,ca],[b,cb],[c,cc],[a,ca],[c,cc],[d,cd]];
  for(const [v,k] of P){A.p.push(v[0],v[1],v[2]);A.c.push(k[0],k[1],k[2]);}
}
function vq(A,x0,x1,y0,y1,z,cb,ct){          /* cuadro vertical, degradado en Y */
  quad(A,[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z],cb,cb,ct||cb,ct||cb);
}
function bq(A,x,y,z,w,h,d,ct,cs){          /* caja de 5 caras (sin fondo) */
  const x0=x-w/2,x1=x+w/2,y0=y,y1=y+h,z0=z-d/2,z1=z+d/2;
  Q(A,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],ct);
  Q(A,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],cs);
  Q(A,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],cs);
  Q(A,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],cs);
  Q(A,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],cs);
}
function meshOf(A){
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(A.p,3));
  g.setAttribute('color',new T3.Float32BufferAttribute(A.c,3));
  g.computeBoundingSphere();
  return new T3.Mesh(g,new T3.MeshBasicMaterial({vertexColors:true,side:T3.FrontSide}));
}
/* cubo con el SOMBREADO HORNEADO en los vértices: la cara de arriba clara, las de
   los costados oscuras. El InstancedMesh multiplica por el color de la instancia,
   así cada bloque se ve con volumen sin gastar una luz. */
function shadedBox(){
  if(GEOS.box)return GEOS.box;
  const g=new T3.BoxGeometry(1,1,1);
  const sh=[.80,.66,1.18,.46,1.02,.70];      /* +X −X +Y −Y +Z −Z */
  const n=g.attributes.position.count,c=new Float32Array(n*3);
  for(let i=0;i<n;i++){const s=sh[Math.floor(i/4)]||1;c[i*3]=s;c[i*3+1]=s;c[i*3+2]=s;}
  g.setAttribute('color',new T3.Float32BufferAttribute(c,3));
  return GEOS.box=g;
}
function tetra(){return GEOS.tet||(GEOS.tet=new T3.TetrahedronGeometry(.5));}
function octa(){return GEOS.oct||(GEOS.oct=new T3.OctahedronGeometry(.5));}
function cone(){return GEOS.cone||(GEOS.cone=new T3.ConeGeometry(.5,1,8,1,true));}

/* --------------------------------------------------------- escenario */
function buildArena(){
  if(arenaM){scene.remove(arenaM);arenaM.geometry.dispose();arenaM=null;}
  const A=A0(),W=HW+2.6;
  /* EL CUELLO DE BOTELLA ES EL RELLENO, NO LA GEOMETRÍA. Medido en swiftshader a
     900x430: con el cielo como cuadro a pantalla completa la escena daba 27 fps con
     1.421 triángulos y 5 llamadas de dibujo; el mismo cuadro con el renderer a 0,6
     de escala daba 54. O sea que cada capa que tapa toda la pantalla cuesta ~10 ms.
     De ahí las tres decisiones de acá:
       · el cielo de arriba es el COLOR DE BORRADO (gratis) y de geometría sólo va la
         BANDA DEL HORIZONTE;
       · una sola fila de ciudad (dos era el doble de relleno para tapar la de atrás);
       · TODO SE EMITE DE CERCA A LEJOS. Es una sola malla fusionada, así que se
         dibuja en el orden del buffer: poniendo primero el piso y las paredes, el
         descarte por profundidad tira los fragmentos del cielo que quedan detrás
         antes de sombrearlos. Emitir el cielo primero era pintarlo entero para
         taparlo después. */
  /* --- 1. CERCA: piso, filo dorado y galones --- */
  bq(A,0,-.75,.1,(FX+.75)*2,.75,2.2,C('#2a4272'),C('#101a33'));
  Q(A,[-FX-.75,.014,1.2],[FX+.75,.014,1.2],[FX+.75,.014,.96],[-FX-.75,.014,.96],C(PAL.gold));
  for(let x=-FX-.7;x<FX+.7;x+=.66)
    Q(A,[x,.016,.94],[x+.33,.016,.94],[x+.33,.016,.70],[x,.016,.70],C('#0f1a34'));
  /* --- 2. PAREDES: caja oscura + caja fina encendida hacia adentro. FINAS EN Z: con
     1,7 de fondo la cara interior se veía casi de frente en el borde del cuadro y se
     comía el 20% de la pantalla de cada lado (captura Z-play-h). --- */
  for(const s2 of [-1,1]){
    bq(A,s2*(FX+.30),-.7,0,.42,VH+2.2,.44,C('#2b4676'),C('#141f3a'));
    bq(A,s2*(FX+.07),-.7,0,.08,VH+2.2,.30,C('#b8801e'),C('#6b4a10'));
  }
  /* --- 3. CIUDAD con ventanas encendidas: profundidad y color sin gastar una luz --- */
  let seed=7717;
  const R=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const st=Math.max(.66,1.2/Math.max(.35,cityK));
  const win=C('#ffc65a'),winD=C('#7a4f14');
  for(let x=-W;x<W;x+=st){
    const h=.55+R()*2.2,w=st*(.55+R()*.4),cx2=x+st*.5;
    bq(A,cx2,-.6,-2.5,w,h,.5,C('#22375f'),C('#101b36'));
    if(h<.9)continue;
    const cols=Math.max(1,Math.round(w/.2)),rows=Math.max(1,Math.round(h/.32));
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
      if(R()<.62)continue;
      const wx=cx2-w/2+.1+i*.2,wy=-.42+j*.32;
      if(wy>h-.85)continue;
      vq(A,wx,wx+.08,wy,wy+.14,-2.24,R()<.35?win:winD);
    }
  }
  /* --- 4. LEJOS: la banda del horizonte, al final --- */
  vq(A,-W,W,-1.8,2.0,-3.6,C('#2f6199'),C('#0b1330'));
  arenaM=meshOf(A);scene.add(arenaM);
}
/* --------------------------------------------------------- el cañón */
function glbNode(key,targetH,sitOnFloor){
  const S=ARC.glb&&ARC.glb[key];
  if(!S||!S.scene)return null;
  try{
    const o=S.scene.clone(true);
    const bb=new T3.Box3().setFromObject(o),sz=new T3.Vector3(),c=new T3.Vector3();
    bb.getSize(sz);bb.getCenter(c);
    if(!(sz.y>.0001))return null;
    const s=targetH/sz.y;
    o.scale.setScalar(s);
    o.position.set(-c.x*s,sitOnFloor?-bb.min.y*s:-c.y*s,-c.z*s);
    /* el GLB trae MeshStandardMaterial (PBR): en swiftshader ese sombreador
       cuesta el triple y el modelo es plano y mate. Se pasa a Lambert con el
       COLOR_0 horneado, que es lo que el juego necesita. */
    o.traverse(k=>{if(k.isMesh){k.castShadow=k.receiveShadow=false;
      const vc=!!(k.geometry&&k.geometry.attributes&&k.geometry.attributes.color);
      k.material=new T3.MeshLambertMaterial({color:0xffffff,vertexColors:vc,fog:false});}});
    const w=new T3.Group();w.add(o);return w;
  }catch(e){console.warn('glb '+key,e);return null;}
}
function emitNode(node,hex){
  node.traverse(k=>{if(k.isMesh&&k.material&&k.material.emissive)k.material.emissive.setHex(hex);});
}
function tintNode(node,col){
  node.traverse(k=>{if(k.isMesh&&k.material&&k.material.color)k.material.color.set(col);});
}
function canonFallback(){
  const A=A0(),body=C(skin().c),dark=C('#1b2542'),lt=C(skin().b);
  bq(A,0,0,0,1.02,.34,.86,body,dark);            /* base */
  bq(A,0,.34,0,.62,.26,.62,lt,body);             /* torreta */
  bq(A,0,.58,0,.34,.42,.34,lt,body);             /* caño */
  bq(A,0,1.00,0,.44,.10,.44,C(PAL.boss),C(PAL.boss)); /* boca */
  for(const s of [-1,1])bq(A,s*.46,-.02,0,.16,.26,.26,dark,dark);
  const m=meshOf(A);const w=new T3.Group();w.add(m);return w;
}
function buildCanons(){
  for(const n of gunN)scene.remove(n);
  gunN=[];
  for(let i=0;i<4;i++){
    const n=GLBC?glbNode('canon',.98,true):canonFallback();
    if(!n)break;
    if(GLBC)tintNode(n,skin().c);
    n.visible=false;scene.add(n);gunN.push(n);
  }
}
function bossFallback(){
  const A=A0(),b=C(PAL.boss),d=C('#5c0f22'),e=C('#ffe08a');
  bq(A,0,-.5,0,1,1,1,b,d);
  bq(A,0,.18,.52,.72,.2,.06,e,e);
  for(const s of [-1,1])bq(A,s*.58,-.42,0,.2,.5,.4,d,d);
  const m=meshOf(A);const w=new T3.Group();w.add(m);return w;
}
/* --------------------------------------------------------- oleadas */
function chainHP(t,h){return t>0?h+2*chainHP(t-1,Math.ceil(h*.45)):h;}
function waveSpawns(w){
  const n=Math.min(18,4+Math.floor(w*.95));
  const tmax=clamp(1+Math.floor(w/5),1,3);
  const out=[];
  for(let i=0;i<n;i++){
    /* mezcla: cuanto más alta la oleada, más escalones grandes */
    const r=Math.random();
    let t=tmax;
    if(r<.34)t=Math.max(0,tmax-2);else if(r<.68)t=Math.max(0,tmax-1);
    out.push(t);
  }
  return out;
}
function startWave(w){
  wave=w;
  blocks.length=0;buls.length=0;
  dmgDone=0;
  const isBoss=(w%10)===0;
  if(isBoss){
    /* vida del jefe: 22 veces un bloque del escalón 3 de la misma oleada. Medido con
       el piloto: con 8 el jefe de la oleada 10 duraba 3 s (y encima se lo comía
       durante el aviso), con 22 la pelea dura entre 9 s (jugador optimizado) y 25 s
       (jugador que gastó poco), que es lo que se espera de un jefe. */
    const hp=Math.round(HPB[3]*hpMul(w)*22);
    boss=null;warnT=1.9;phase='warn';
    spawnQ=[];spawnN=0;spawnT=99;
    bossHP0=hp;waveHP=hp+4*Math.round(HPB[1]*hpMul(w));
    if(!demo){ARC.sfx('alarm');ARC.vib([20,60,20]);}
    camSk=Math.max(camSk,.16);
  }else{
    spawnQ=waveSpawns(w);spawnN=spawnQ.length;spawnT=1.2;
    waveHP=0;
    for(const t of spawnQ)waveHP+=chainHP(t,Math.max(1,Math.round(HPB[t]*hpMul(w))));
    phase='play';boss=null;
  }
  hud(true);
}
let spawnQ=[],bossHP0=1;
function spawnBlock(t,x,y,vx,vy,hp){
  if(blocks.length>=MAXB)return null;
  const sz=SZ[t];
  /* en el MENÚ los bloques entran por los costados: en el medio está el título y el
     botón JUGAR, y con bloques cayendo ahí el texto no se leía. */
  if(x==null&&demo){
    const s2=Math.random()<.5?-1:1;
    x=s2*rnd(FX*.34,FX-sz);
  }
  const b={t,sz,x:x==null?rnd(-FX+sz,FX-sz):x,y:y==null?VH+.8+Math.random()*1.5:y,
    vx:vx==null?rnd(-1.4,1.4):vx,vy:vy==null?-1.2:vy,
    hp:hp||Math.max(1,Math.round(HPB[t]*hpMul(wave))),rot:rnd(-.26,.26),rv:rnd(-.5,.5)};
  b.hp0=b.hp;
  blocks.push(b);return b;
}
/* --------------------------------------------------------- disparos */
/* separación entre caños: la MISMA cuenta para el modelo y para la bala. Antes el
   modelo usaba sp*2,1 y la bala sp, así que con dos cañones las balas salían del
   medio y no de las bocas. */
const gunOff=(i,g)=>(i-(g-1)/2)*.66;
function shoot(){
  const g=uv('guns');
  for(let i=0;i<g;i++){
    if(buls.length>=MAXBUL)break;
    const off=gunOff(i,g);
    buls.push({x:cx+off,y:CANH+.12,vy:BSPD});
    const n=gunN[i];if(n)n.userData.fl=1;
  }
  if(ARC.t-shotT>.075){
    shotT=ARC.t;ARC.sfx('shot',{vol:.30,rate:1.05+Math.random()*.2});
  }
}
function pop(x,y,col,n,big){
  const p=proj(x,y,0);
  if(p.z<1)ARC.fx.burst(p.x,p.y,{n:n||10,color:col,speed:big?300:190,
    size:big?6:4,life:big?.6:.4,g:520});
  const k=Math.max(3,Math.round((big?11:6)*partK));
  for(let i=0;i<k;i++){
    if(shards.length>=MAXSH)break;
    const a=rnd(0,TAU),v=rnd(1.6,big?7:4.6);
    shards.push({x,y,vx:Math.cos(a)*v,vy:Math.abs(Math.sin(a))*v*.9+1.4,
      s:(big?.30:.19)*rnd(.6,1.3),l:.7,L:.7,rot:rnd(0,TAU),rv:rnd(-9,9),c:col});
  }
}
function dropCoins(x,y,n){
  for(let i=0;i<n;i++){
    if(cns.length>=MAXCO)break;
    cns.push({x,y,vx:rnd(-2.6,2.6),vy:rnd(2.2,5.4),l:1.5,go:0,rot:Math.random()*TAU});
  }
}
function addCoins(n){
  if(demo)return;
  runCoins+=n;ARC.S.coins=(ARC.S.coins||0)+n;
  hud();
}
function killBlock(b,i){
  const col=PAL.tier[b.t];
  pop(b.x,b.y,col,b.t>=2?16:10,b.t>=2);
  ARC.sfx('crack',{vol:b.t>=2?.85:.5,rate:1.35-b.t*.16});
  if(b.t>=2){camSk=Math.max(camSk,.05+b.t*.02);ARC.shake(3+b.t*1.4);}
  const mlt=mult();
  const cn=Math.max(1,Math.round(b.hp0*.55))*mlt;
  const p=proj(b.x,b.y,0);
  if(p.z<1)ARC.fx.text(p.x,p.y,'+'+fmt(cn),{color:PAL.goldL,size:Math.max(12,ARC.H*(b.t>=2?.055:.04)),life:.7});
  dropCoins(b.x,b.y,clamp(1+b.t,1,4));
  addCoins(cn);
  kills++;streak++;
  if(b.t>0&&blocks.length<MAXB-1){
    const h=Math.max(1,Math.ceil(b.hp0*.45));
    for(const s of [-1,1])spawnBlock(b.t-1,b.x+s*b.sz*.34,b.y,s*rnd(1.1,2.0),rnd(1.4,3.2),h);
  }
  blocks.splice(i,1);
}
const mult=()=>1+Math.min(4,Math.floor(streak/12));
/* --------------------------------------------------------- daño al jugador */
function hurt(){
  if(inv>0||demo||phase==='dead')return;
  bestStreak=Math.max(bestStreak,streak);streak=0;
  lives--;inv=1.35;
  ARC.sfx('boom',{rate:.78,vol:1});ARC.sfx('lose',{vol:.5});
  ARC.vib(80);ARC.shake(14);camSk=Math.max(camSk,.34);
  const p=proj(cx,CANH*.6,0);
  if(p.z<1){
    ARC.fx.burst(p.x,p.y,{n:26,color:PAL.boss,speed:330,size:6,life:.6});
    ARC.fx.ring(p.x,p.y,{r:ARC.H*.4,color:PAL.boss,w:5,life:.4});
  }
  /* ONDA DE CHOQUE: el golpe empuja para arriba y para los costados todo lo que
     tenga cerca. Sin esto el mismo bloque que te aplastó seguía apoyado en el cañón
     y te sacaba la segunda y la tercera vida en cuanto se terminaba la
     invulnerabilidad (tres golpes en 9 s, medido con dbg.log). */
  for(const b of blocks){
    const d=b.x-cx;
    if(Math.abs(d)>2.6||b.y>2.4)continue;
    b.vy=7.2;b.vx=(d>=0?1:-1)*(2.2+Math.random()*1.4);
  }
  hud(true);
  if(lives<=0){phase='dead';deadT=.95;}
  else ARC.toast(T('hit'));
}
function gameOver(){
  bestStreak=Math.max(bestStreak,streak);
  ARC.save();
  const st=wave>=15?3:(wave>=8?2:(wave>=4?1:0));
  ARC.over({win:false,score:wave,stars:st,title:T('overT'),
    sub:T('stWave')+': '+wave+' &nbsp;·&nbsp; '+T('stKills')+': '+kills+'<br>'+
      T('stCoins')+': ◉ '+fmt(runCoins)+' &nbsp;·&nbsp; '+T('stStreak')+': '+bestStreak});
}
/* --------------------------------------------------------- ciclo */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  vv=new T3.Vector3();dum=new T3.Object3D();
  const p=ARC.gfxP?ARC.gfxP():{part:1};
  partK=p.part;cityK=clamp(p.part,.35,1.3);
  metrics();
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  cam=new T3.PerspectiveCamera(FOVY,ARC.W/Math.max(1,ARC.H),.1,60);
  cam.position.set(0,CAMY,CAMZ);cam.lookAt(0,CAMY,0);
  /* dos luces nada más: el escenario y los bloques son MeshBasic (sombreado
     horneado), las luces sólo alimentan al cañón y al jefe (Lambert del GLB). */
  scene.add(new T3.HemisphereLight(0xdfeaff,0x1a2340,2.4));
  const d=new T3.DirectionalLight(0xffffff,1.5);d.position.set(2.5,6,7);scene.add(d);
  buildArena();
  blockIM=new T3.InstancedMesh(shadedBox(),
    new T3.MeshBasicMaterial({vertexColors:true}),MAXB);
  blockIM.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  blockIM.frustumCulled=false;scene.add(blockIM);
  bulIM=new T3.InstancedMesh(shadedBox(),
    new T3.MeshBasicMaterial({vertexColors:true,color:new T3.Color(skin().b)}),MAXBUL);
  bulIM.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  bulIM.frustumCulled=false;scene.add(bulIM);
  shIM=new T3.InstancedMesh(tetra(),new T3.MeshBasicMaterial(),MAXSH);
  shIM.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  shIM.frustumCulled=false;scene.add(shIM);
  coIM=new T3.InstancedMesh(octa(),
    new T3.MeshBasicMaterial({color:new T3.Color(PAL.gold)}),MAXCO);
  coIM.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  coIM.frustumCulled=false;scene.add(coIM);
  flIM=new T3.InstancedMesh(cone(),new T3.MeshBasicMaterial({
    color:new T3.Color('#ffe4a3'),transparent:true,opacity:.8,depthWrite:false}),4);
  flIM.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  flIM.frustumCulled=false;scene.add(flIM);
  const c0=ARC.glb&&ARC.glb.canon,j0=ARC.glb&&ARC.glb.jefe;
  GLBC=!!(c0&&c0.scene);GLBJ=!!(j0&&j0.scene);
  buildCanons();
  buildArsenal();
  /* EL TÍTULO DEL MENÚ. El motor le pone .hasart al menú cuando carga el arte y el
     CSS esconde el título de DOM (#menu.hasart .ttl{display:none}) porque el arte
     ya lo trae dibujado. Pero con MODO ATRACCIÓN el menú también lleva .live, que
     borra el arte: quedaba un menú SIN TÍTULO (captura ZS-menu-h). Se le saca
     .hasart desde acá. PEDIDO AL MOTOR: que la regla sea
     `#menu.hasart:not(.live) .ttl{display:none}`. */
  const mn=document.getElementById('menu');
  if(mn)mn.classList.remove('hasart');
};
G.resize=function(){
  if(!cam)return;
  metrics();
  cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();
  buildArena();
};
G.gfxApply=function(p){
  partK=p.part;cityK=clamp(p.part,.35,1.3);
  if(scene)buildArena();
};
G.extra={icon:'◈',fn:()=>openArs()};
G.start=function(l){
  if(!T3)return;
  demo=0;botOn=0;
  lives=uvR('life');streak=0;bestStreak=0;kills=0;runCoins=0;recTold=false;
  cx=tx=0;fireT=0;inv=0;camSk=0;deadT=0;tutT=3.2;keyDir=0;drag=null;
  blocks.length=0;buls.length=0;shards.length=0;cns.length=0;boss=null;
  applySkin();
  startWave(1);
  ARC.tray([]);
  hud(true);
};
/* rotación de tono sobre el atributo de color de la malla (una vez por cambio de
   skin, ~3.400 números: no se nota) */
function hueShift(a,c0,dh){
  for(let i=0;i<a.length;i+=3){
    const r=c0[i],g2=c0[i+1],b2=c0[i+2];
    const mx2=Math.max(r,g2,b2),mn=Math.min(r,g2,b2),d=mx2-mn;
    if(mx2<=0||d/mx2<.22){a[i]=r;a[i+1]=g2;a[i+2]=b2;continue;}
    let h;
    if(mx2===r)h=((g2-b2)/d+6)%6;else if(mx2===g2)h=(b2-r)/d+2;else h=(r-g2)/d+4;
    h=(h/6+dh+1)%1;
    const S=d/mx2,V=mx2;
    const i2=Math.floor(h*6),f=h*6-i2,pp=V*(1-S),q=V*(1-f*S),t=V*(1-(1-f)*S);
    const o=[[V,t,pp],[q,V,pp],[pp,V,t],[pp,q,V],[t,pp,V],[V,pp,q]][i2%6];
    a[i]=o[0];a[i+1]=o[1];a[i+2]=o[2];
  }
}
function applySkin(){
  const s=skin();
  if(bulIM)bulIM.material.color.set(s.b);
  if(flIM)flIM.material.color.set(s.b);
  if(!GLBC){for(const n of gunN)scene.remove(n);gunN=[];buildCanons();return;}
  const dh=s.h-SKIN[0].h,seen=[];
  for(const n of gunN)n.traverse(k=>{
    if(!k.isMesh||!k.geometry||!k.geometry.attributes.color)return;
    if(k.material&&k.material.color)k.material.color.set('#ffffff');
    const g2=k.geometry;
    if(seen.indexOf(g2)>=0)return;
    seen.push(g2);
    if(!g2.userData.c0)g2.userData.c0=g2.attributes.color.array.slice(0);
    hueShift(g2.attributes.color.array,g2.userData.c0,dh);
    g2.attributes.color.needsUpdate=true;
  });
}
function hud(force){
  const hearts=lives>5?('♥×'+lives):'♥'.repeat(Math.max(0,lives));
  const m=mult();
  const t=T('wave')+' '+wave+' · '+hearts+(m>1?' · '+T('mult')+' x'+m:'');
  if(force||t!==hudTxt){hudTxt=t;ARC.hud('◉ '+fmt(ARC.S.coins||0),t);}
  else ARC.hud('◉ '+fmt(ARC.S.coins||0));
}
G.i18nDone=function(){if(ARC.scr==='game')hud(true);};

/* --------------------------------------------------------- entrada */
G.down=function(p){
  if(phase==='shop'){shopHit(p);return;}
  drag={x:p.x,tx};botOn=0;
};
G.move=function(p){
  if(!drag||phase==='shop')return;
  tx=clamp(drag.tx+(p.x-drag.x)/Math.max(1,ARC.H)*VH,-FX+CANW,FX-CANW);
};
G.up=function(){drag=null;};
G.key=function(c,d){
  if(c==='ArrowLeft'||c==='KeyA')keyDir=d?-1:(keyDir<0?0:keyDir);
  if(c==='ArrowRight'||c==='KeyD')keyDir=d?1:(keyDir>0?0:keyDir);
  if(d&&(c==='Space'||c==='Enter')&&phase==='shop')shopGo();
  if(d)botOn=0;
};
/* --------------------------------------------------------- simulación */
function simulate(dt){
  const dm=uv('dmg'),rt=uv('rate');
  if(inv>0)inv-=dt;
  if(camSk>0)camSk=Math.max(0,camSk-dt*camSk*8-dt*.25);
  mixT+=dt;
  if(botOn||demo)botStep(dt);
  /* cañón */
  if(keyDir)tx=clamp(tx+keyDir*11*dt,-FX+CANW,FX-CANW);
  const dx=tx-cx,mx=CANSP*dt;
  cx+=Math.abs(dx)<=mx?dx:(dx>0?mx:-mx);
  for(const n of gunN)if(n.userData.fl)n.userData.fl=Math.max(0,n.userData.fl-dt*15);
  /* disparo automático. En el AVISO DE JEFE no se dispara: el jefe entra en cuadro
     mientras suena la alarma y antes se lo comían a tiros durante el aviso (la
     oleada 10 entera duraba 3 s, medido con el piloto). */
  if(phase==='play'){
    fireT-=dt;
    if(fireT<=0){shoot();fireT=1/rt;}
  }
  /* balas */
  for(let i=buls.length-1;i>=0;i--){
    const b=buls[i];b.y+=b.vy*dt;
    if(b.y>CAMY+VH/2){buls.splice(i,1);continue;}
    let hit=false;
    for(let j=blocks.length-1;j>=0;j--){
      const k=blocks[j],h=k.sz/2;
      if(b.x<k.x-h-BR||b.x>k.x+h+BR||b.y<k.y-h-.06||b.y>k.y+h+.06)continue;
      const d=Math.min(k.hp,dm);k.hp-=dm;dmgDone+=d;hit=true;
      k.flash=.07;
      const p=proj(b.x,b.y,0);
      if(p.z<1&&partK>.5)ARC.fx.burst(p.x,p.y,{n:2,color:PAL.goldL,speed:90,size:2,life:.16,g:0});
      if(k.hp<=0)killBlock(k,j);
      break;
    }
    if(!hit&&boss&&b.x>boss.x-boss.sz/2&&b.x<boss.x+boss.sz/2&&
       b.y>boss.y-boss.sz/2&&b.y<boss.y+boss.sz/2){
      const d=Math.min(boss.hp,dm);boss.hp-=dm;dmgDone+=d;hit=true;boss.flash=.1;
      const p=proj(b.x,b.y,0);
      if(p.z<1)ARC.fx.burst(p.x,p.y,{n:3,color:PAL.goldL,speed:120,size:3,life:.2,g:0});
      if(boss.hp<=0)bossDown();
    }
    if(hit)buls.splice(i,1);
  }
  /* bloques */
  for(let i=blocks.length-1;i>=0;i--){
    const b=blocks[i],h=b.sz/2;
    b.vy=Math.max(-VTMAX,b.vy-GRAV*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;
    b.rot+=b.rv*dt;if(b.rot>.26||b.rot<-.26)b.rv=-b.rv;   /* se mece, no gira */
    if(b.flash>0)b.flash-=dt;
    if(b.x<-FX+h){b.x=-FX+h;b.vx=Math.abs(b.vx);}
    if(b.x>FX-h){b.x=FX-h;b.vx=-Math.abs(b.vx);}
    if(b.y<h){
      /* REBOTE con piso MÍNIMO de 5,4 u/s (sube 1,55: bien por encima del cañón).
         Con el mínimo en 3,6 los bloques quedaban raspando el piso y cualquier
         bloque cerca del cañón era muerte segura: el piloto perdía las 3 vidas en
         12 s en la oleada 2 (medido con _zsmoke). */
      b.y=h;b.vy=clamp(Math.abs(b.vy)*.82,5.2,7.6);
      if(b.sz>.7&&partK>.5)ARC.shake(1.4);
    }
    if(b.y>VH+6)b.y=VH+6;
    /* ¿te toca? */
    if(b.y-h<CANH&&Math.abs(b.x-cx)<h+CANW){
      if(inv<=0&&!demo){
        LOG.push('t'+b.t+' y'+b.y.toFixed(2)+' vy'+b.vy.toFixed(1)+' bx'+b.x.toFixed(2)+
          ' cx'+cx.toFixed(2)+' tx'+tx.toFixed(2)+' n'+blocks.length);
        if(LOG.length>8)LOG.shift();
        pop(b.x,b.y,PAL.boss,18,true);blocks.splice(i,1);hurt();
      }else{b.vy=6.8;b.y=CANH+h+.02;}   /* invulnerable: patea el bloque para arriba */
    }
  }
  /* SEPARACIÓN entre bloques. No hay choque entre ellos (como en el original), pero
     dos cubos en el mismo z se tapaban y los NÚMEROS se leían dobles (captura
     ZS-menu2-h). Un empujoncito lateral cuando se solapan mucho y listo. */
  for(let i=0;i<blocks.length;i++){
    const a=blocks[i],ha=a.sz/2;
    for(let j=i+1;j<blocks.length;j++){
      const b2=blocks[j],hb2=b2.sz/2,lim=(ha+hb2)*.86;
      const dx2=b2.x-a.x,dy2=b2.y-a.y;
      if(Math.abs(dx2)>lim||Math.abs(dy2)>lim)continue;
      const push=(lim-Math.abs(dx2))*3.2*dt*(dx2>=0?1:-1);
      a.x-=push;b2.x+=push;
      a.vx-=push*2.2;b2.vx+=push*2.2;
    }
  }
  /* jefe */
  if(boss){
    const h=boss.sz/2;
    boss.vy-=GRAV*.34*dt;boss.x+=boss.vx*dt;boss.y+=boss.vy*dt;
    if(boss.flash>0)boss.flash-=dt;
    if(boss.x<-FX+h){boss.x=-FX+h;boss.vx=Math.abs(boss.vx);}
    if(boss.x>FX-h){boss.x=FX-h;boss.vx=-Math.abs(boss.vx);}
    /* el jefe FLOTA: su panza no baja de 1,45 (arriba del cañón) y ese piso baja
       hasta 0,75 a medida que le sacás vida, así al final aprieta de verdad. */
    const flo=h+1.45-.70*(1-clamp(boss.hp/boss.hp0,0,1));
    if(boss.y<flo){boss.y=flo;boss.vy=4.2;}
    const tope=CAMY+VH/2-h-.55;      /* que la cabeza no se salga del cuadro */
    if(boss.y>tope){boss.y=tope;boss.vy=Math.min(0,boss.vy);}
    if(boss.y-h<CANH+.1&&Math.abs(boss.x-cx)<h+CANW){
      boss.vy=5.4;
      if(inv<=0&&!demo)hurt();
    }
    boss.mt-=dt;
    if(boss.mt<=0&&phase==='play'){
      boss.mt=3.4;
      const t=clamp(1+Math.floor(wave/14),0,2);
      for(let k=-1;k<=1;k+=2)
        spawnBlock(t,boss.x+k*boss.sz*.4,boss.y-h*.4,k*2.4,-1.2,
          Math.max(1,Math.round(HPB[t]*hpMul(wave)*.7)));
      ARC.sfx('glass',{vol:.4});
    }
  }
  /* pedazos y monedas */
  for(let i=shards.length-1;i>=0;i--){
    const s=shards[i];s.l-=dt;
    if(s.l<=0){shards.splice(i,1);continue;}
    s.vy-=GRAV*1.5*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.rot+=s.rv*dt;
    if(s.y<.06){s.y=.06;s.vy=Math.abs(s.vy)*.34;s.vx*=.7;}
  }
  for(let i=cns.length-1;i>=0;i--){
    const c=cns[i];c.l-=dt;c.rot+=dt*7;
    if(c.go){                               /* imantada al cañón */
      const dxx=cx-c.x,dyy=CANH*.5-c.y,d=Math.hypot(dxx,dyy)||1;
      c.x+=dxx/d*15*dt;c.y+=dyy/d*15*dt;
      if(d<.42){cns.splice(i,1);ARC.sfx('coin',{vol:.28,rate:1.1+Math.random()*.4});continue;}
    }else{
      c.vy-=GRAV*.8*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
      if(c.y<.2){c.y=.2;c.vy=Math.abs(c.vy)*.4;c.vx*=.6;}
      if(c.l<1.05)c.go=1;
    }
    if(c.l<=0)cns.splice(i,1);
  }
  /* fases */
  if(phase==='warn'){
    warnT-=dt;
    if(!boss&&warnT<1.15){
      boss={x:0,y:VH+BOSSZ,vx:rnd(1.4,2.2)*(Math.random()<.5?-1:1),vy:-1.4,
        sz:BOSSZ,hp:bossHP0,hp0:bossHP0,mt:2.6,flash:0,rot:0};
    }
    if(warnT<=0){phase='play';ARC.toast(T('boss'));}
  }else if(phase==='play'){
    /* en el menú nunca se vacía la pantalla: si quedan pocos bloques, entra otro */
    if(demo&&spawnN<=0&&blocks.length<9){spawnQ.push(rndi(1,3));spawnN++;spawnT=Math.min(spawnT,.3);}
    if(spawnN>0){
      spawnT-=dt;
      if(spawnT<=0&&blocks.length<MAXB-6){
        if(demo)spawnT=0;
        const t=spawnQ[spawnQ.length-spawnN];
        spawnBlock(t==null?0:t);spawnN--;
        spawnT=demo?rnd(.35,.8):Math.max(.42,1.15-wave*.04)*rnd(.75,1.25);
      }
    }
    if(!blocks.length&&!spawnN&&!boss)waveClear();
  }else if(phase==='dead'){
    deadT-=dt;
    if(deadT<=0){phase='off';gameOver();}
  }
}
function waveClear(){
  bestStreak=Math.max(bestStreak,streak);
  if(demo){startWave(wave>=10?8:wave+1);return;}
  shards.length=0;cns.length=0;
  const bonus=8+wave*4;
  addCoins(bonus);
  ARC.sfx('power');
  ARC.toast(T('clear')+'  ◉ +'+bonus);
  ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:26,color:PAL.goldL,speed:300,size:6,life:.8});
  if(!recTold&&wave>(ARC.S.best||0)&&(ARC.S.best||0)>1){recTold=true;ARC.toast(T('newRec'));}
  phase='shop';shopSel=-1;
}
function bossDown(){
  const cn=Math.round(boss.hp0*.28)*mult();
  pop(boss.x,boss.y,PAL.boss,34,true);
  for(let k=0;k<3;k++)dropCoins(boss.x+rnd(-1,1),boss.y+rnd(-.6,.6),6);
  addCoins(cn);kills++;streak+=4;
  ARC.sfx('boom');ARC.shake(20);camSk=.42;ARC.vib([30,50,30]);
  ARC.fx.text(ARC.W/2,ARC.H*.42,T('bossDown'),{color:PAL.goldL,size:Math.max(18,ARC.H*.08),life:1.2});
  boss=null;
}
G.step=function(dt){
  if(phase==='shop'||phase==='off')return;
  simulate(dt);
};
/* --------------------------------------------------------- dibujo 3D */
function proj(x,y,z){
  const v=vv.set(x,y,z||0).project(cam);
  return{x:(v.x*.5+.5)*ARC.W,y:(-v.y*.5+.5)*ARC.H,z:v.z};
}
function renderScene(a){
  /* cámara con sacudida propia (ARC.shake sólo mueve la capa 2D) */
  const s=camSk;
  cam.position.set(Math.sin(mixT*47)*s*.9,CAMY+Math.cos(mixT*38)*s*.7,CAMZ);
  cam.lookAt(0,CAMY,0);
  if(demo){        /* paneo lento: la escena del menú tiene que MOVERSE */
    cam.position.x+=Math.sin(mixT*.26)*1.5;
    cam.position.y+=Math.sin(mixT*.19)*.30;
    cam.position.z=CAMZ+.55+Math.cos(mixT*.15)*.45;
    cam.lookAt(0,CAMY-.45,0);   /* la acción sube en pantalla: el menú tapa abajo */
  }
  const st=a/60;
  /* bloques */
  let n=0;
  for(const b of blocks){
    if(n>=MAXB)break;
    dum.position.set(b.x+b.vx*st,b.y+b.vy*st,0);
    dum.rotation.set(0,0,b.rot);
    const sc=b.sz*(b.flash>0?1.14:1);
    dum.scale.set(sc,sc,sc);
    dum.updateMatrix();
    blockIM.setMatrixAt(n,dum.matrix);
    const c=colOf(b);
    blockIM.setColorAt(n,c);
    n++;
  }
  blockIM.count=n;blockIM.instanceMatrix.needsUpdate=true;
  if(blockIM.instanceColor)blockIM.instanceColor.needsUpdate=true;
  /* balas */
  n=0;
  for(const b of buls){
    if(n>=MAXBUL)break;
    dum.position.set(b.x,b.y+b.vy*st,0);
    dum.rotation.set(0,0,0);dum.scale.set(.11,.34,.11);
    dum.updateMatrix();bulIM.setMatrixAt(n,dum.matrix);n++;
  }
  bulIM.count=n;bulIM.instanceMatrix.needsUpdate=true;
  /* pedazos */
  n=0;
  for(const s2 of shards){
    if(n>=MAXSH)break;
    const k=clamp(s2.l/s2.L,0,1);
    dum.position.set(s2.x,s2.y,0);
    dum.rotation.set(s2.rot,s2.rot*.7,s2.rot*.4);
    dum.scale.setScalar(s2.s*(.4+.6*k));
    dum.updateMatrix();shIM.setMatrixAt(n,dum.matrix);
    shIM.setColorAt(n,tmpC(s2.c));n++;
  }
  shIM.count=n;shIM.instanceMatrix.needsUpdate=true;
  if(shIM.instanceColor)shIM.instanceColor.needsUpdate=true;
  /* monedas */
  n=0;
  for(const c of cns){
    if(n>=MAXCO)break;
    dum.position.set(c.x,c.y,.2);
    dum.rotation.set(0,c.rot,.3);
    dum.scale.set(.26,.26,.09);
    dum.updateMatrix();coIM.setMatrixAt(n,dum.matrix);n++;
  }
  coIM.count=n;coIM.instanceMatrix.needsUpdate=true;
  /* cañones y fogonazos */
  const gn=uv('guns');
  n=0;
  for(let i=0;i<gunN.length;i++){
    const node=gunN[i];
    const on=i<gn;
    node.visible=on;
    if(!on)continue;
    const off=gunOff(i,gn);
    node.position.set(cx+off,CANY,0);
    node.rotation.z=Math.sin(mixT*3+i)*.02;
    const fl=node.userData.fl||0;
    node.scale.setScalar(1+fl*.06);
    if(fl>0){
      dum.position.set(cx+off,CANH+.18,0);
      dum.rotation.set(0,0,0);
      dum.scale.set(.30*fl+.20,.34*fl+.12,.30*fl+.20);
      dum.updateMatrix();flIM.setMatrixAt(n,dum.matrix);n++;
    }
  }
  flIM.count=n;flIM.instanceMatrix.needsUpdate=true;
  /* jefe */
  if(boss){
    if(!bossN){bossN=(GLBJ?glbNode('jefe',BOSSZ,false):null)||bossFallback();
      scene.add(bossN);}
    if(bossN){
      bossN.visible=true;
      bossN.position.set(boss.x+boss.vx*st,boss.y+boss.vy*st,0);
      boss.rot+=.004;
      bossN.rotation.y=Math.sin(mixT*.7)*.35;
      bossN.rotation.z=Math.sin(mixT*1.7)*.05;
      const f=boss.flash>0?1.07:1;bossN.scale.setScalar(f);
      /* NO se le pinta un color plano encima: tintNode multiplica y aplastaba el
         COLOR_0 horneado del modelo (el jefe quedaba un borrón rojo, captura
         ZS-boss-h). El golpe se marca con EMISIVO, que suma en vez de multiplicar. */
      emitNode(bossN,boss.flash>0?0x772233:0x140408);
    }
  }else if(bossN)bossN.visible=false;
  ARC.rnd.render(scene,cam);
}
const _c1=[];
function tmpC(h){
  if(!_c1[0])_c1[0]=new T3.Color();
  return _c1[0].set(h);
}
const _c2=[];
function colOf(b){
  if(!_c2[0])_c2[0]=new T3.Color();
  const c=_c2[0];
  c.set(b.flash>0?PAL.tierL[b.t]:PAL.tier[b.t]);
  return c;
}
/* --------------------------------------------------------- capa 2D */
function rr(g,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  g.beginPath();
  g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);
  g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);
  g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);
  g.closePath();
}
function txt(g,s,x,y,size,col,align,strokeW){
  g.font='900 '+size+'px system-ui,sans-serif';
  g.textAlign=align||'center';g.textBaseline='middle';
  if(strokeW!==0){g.lineWidth=strokeW||Math.max(2,size*.16);
    g.strokeStyle='rgba(3,6,12,.82)';g.strokeText(s,x,y);}
  g.fillStyle=col;g.fillText(s,x,y);
}
/* ATLAS DE CIFRAS. Los números de los bloques se dibujaban con strokeText +
   fillText: con 24 bloques son 48 llamadas de texto por cuadro, y el texto con
   contorno es de lo más caro que hay en canvas. Se hornean UNA vez los glifos
   (contorno oscuro + relleno blanco) en un lienzo aparte y cada número pasa a ser
   un par de drawImage, que es copia de píxeles. */
const GLY='0123456789KM';
let atl=null,atlW=null;
const ATLH=96;
function atlas(){
  if(atl)return atl;
  const c=document.createElement('canvas'),g=c.getContext('2d');
  const F='900 '+Math.round(ATLH*.78)+'px system-ui,sans-serif';
  g.font=F;
  const ws=[];let tot=0;
  for(const ch of GLY){const w=Math.ceil(g.measureText(ch).width)+18;ws.push(w);tot+=w;}
  c.width=tot;c.height=ATLH;
  const g2=c.getContext('2d');
  g2.font=F;g2.textAlign='center';g2.textBaseline='middle';g2.lineJoin='round';
  let x=0;atlW=[];
  for(let i=0;i<GLY.length;i++){
    const w=ws[i];
    g2.lineWidth=ATLH*.18;g2.strokeStyle='#0a1020';g2.strokeText(GLY[i],x+w/2,ATLH*.53);
    g2.fillStyle='#ffffff';g2.fillText(GLY[i],x+w/2,ATLH*.53);
    atlW.push({x,w});x+=w;
  }
  return atl=c;
}
function drawNum(g,str,cx2,cy,h){
  const a=atlas(),k=h/ATLH;
  let tw=0;
  for(const ch of str){const i=GLY.indexOf(ch);if(i>=0)tw+=atlW[i].w*k;}
  let x=cx2-tw/2;
  for(const ch of str){
    const i=GLY.indexOf(ch);if(i<0)continue;
    const m=atlW[i];
    g.drawImage(a,m.x,0,m.w,ATLH,x,cy-h/2,m.w*k,h);
    x+=m.w*k;
  }
}
function drawNumbers(g){
  const k=ARC.H/VH;
  for(const b of blocks){
    const p=proj(b.x,b.y,b.sz/2);
    if(p.z>1)continue;
    const px=b.sz*k;
    if(px<13)continue;
    drawNum(g,fmt(b.hp),p.x,p.y,Math.min(px*.5,ARC.H*.075));
  }
}
function drawBars(g){
  const W=ARC.W,H=ARC.H;
  /* barra de avance de la oleada (por VIDA de la oleada, no por bloques) */
  const bw=W*.34,bx=(W-bw)/2,by=H*.115,bh=Math.max(4,H*.016);
  const pr=clamp(dmgDone/Math.max(1,waveHP),0,1);
  if(boss){                                 /* con jefe manda SU barra: las dos
                                               juntas se pisaban (ZS-boss-h) */
    const hb=clamp(boss.hp/boss.hp0,0,1),w2=W*.54,x2=(W-w2)/2,y2=H*.135,h2=Math.max(6,H*.028);
    txt(g,'☠ '+T('boss'),W/2,H*.10,Math.max(10,H*.042),'#ffd9e2');
    g.fillStyle='rgba(0,0,0,.55)';rr(g,x2,y2,w2,h2,h2/2);g.fill();
    g.fillStyle=PAL.boss;rr(g,x2+2,y2+2,Math.max(4,(w2-4)*hb),h2-4,h2/2);g.fill();
    txt(g,fmt(boss.hp),W/2,y2+h2*.52,Math.max(9,h2*.86),'#fff','center',2);
  }else{
    g.fillStyle='rgba(255,255,255,.14)';rr(g,bx,by,bw,bh,bh/2);g.fill();
    if(pr>.004){g.fillStyle=PAL.gold;rr(g,bx,by,Math.max(bh,bw*pr),bh,bh/2);g.fill();}
  }
  /* racha */
  const m=mult();
  if(m>1&&phase!=='shop'){
    /* debajo de las barras: pegado a ellas se comía el número de vida del jefe */
    txt(g,'x'+m,W*.5,H*.25,Math.max(12,H*.06),PAL.goldL);
  }
  /* tutorial */
  if(tutT>0&&phase==='play'&&wave===1){
    g.globalAlpha=clamp(tutT/1.2,0,1);
    txt(g,T('tut'),W/2,H*.245,Math.max(11,H*.043),'rgba(255,255,255,.96)');
    txt(g,T('tut2'),W/2,H*.30,Math.max(9,H*.028),'rgba(255,255,255,.7)');
    g.globalAlpha=1;
  }
  if(phase==='warn'){
    const f=.5+.5*Math.sin(ARC.t*14);
    g.globalAlpha=.35+.65*f;
    g.fillStyle='rgba(255,45,85,'+(.10+.14*f)+')';g.fillRect(0,0,W,H);
    txt(g,T('boss'),W/2,H*.42,Math.max(24,H*.16),'#ff2d55');
    txt(g,T('bossIn'),W/2,H*.58,Math.max(11,H*.05),'#ffd9e2');
    g.globalAlpha=1;
  }
  /* AVISO de lo que viene de arriba: sin esto el bloque aparece de la nada y no
     hay forma de anticipar dónde ponerse. */
  for(const b of blocks){
    if(b.y-b.sz/2<VH-.1)continue;
    const p=proj(b.x,VH-.05,0);
    if(p.z>1)continue;
    const sz2=Math.max(5,H*.022);
    g.globalAlpha=.85;g.fillStyle=PAL.tier[b.t];
    g.beginPath();g.moveTo(p.x,p.y+sz2);g.lineTo(p.x-sz2,p.y-sz2*.6);
    g.lineTo(p.x+sz2,p.y-sz2*.6);g.closePath();
    g.lineWidth=Math.max(1.5,sz2*.3);g.strokeStyle='rgba(4,8,16,.8)';g.stroke();g.fill();
    g.globalAlpha=1;
  }
  /* invulnerable: marco rojo */
  if(inv>0&&phase!=='shop'){
    g.globalAlpha=clamp(inv,0,1)*.5*(.4+.6*Math.abs(Math.sin(ARC.t*16)));
    g.strokeStyle=PAL.boss;g.lineWidth=Math.max(3,H*.02);
    g.strokeRect(0,0,W,H);g.globalAlpha=1;
  }
}
/* ---- TIENDA entre oleadas (canvas: no le roba el toque a PAUSA) ---- */
let shopSel=-1,shopA=0;
function shopLayout(){
  const W=ARC.W,H=ARC.H;
  const pw=Math.min(W*.9,H*2.15),ph=Math.min(H*.86,pw*.52);
  const px=(W-pw)/2,py=(H-ph)/2+H*.02;
  const pad=ph*.07;
  const hd=ph*.17;
  const gy=py+hd+pad*.2;
  const gh=ph-hd-pad*1.1-ph*.22;
  const cw=(pw-pad*3)/2,ch=(gh-pad*.6)/2;
  const cards=[];
  for(let i=0;i<4;i++){
    cards.push({i,x:px+pad+(i%2)*(cw+pad),y:gy+Math.floor(i/2)*(ch+pad*.6),w:cw,h:ch});
  }
  const gw=Math.min(pw*.52,H*.9),gh2=ph*.155;
  return{px,py,pw,ph,pad,hd,cards,
    go:{x:px+(pw-gw)/2,y:py+ph-gh2-pad*.45,w:gw,h:gh2}};
}
function shopHit(p){
  const L=shopLayout();
  for(const c of L.cards){
    if(p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h){buy(c.i);return;}
  }
  const g=L.go;
  if(p.x>=g.x&&p.x<=g.x+g.w&&p.y>=g.y&&p.y<=g.y+g.h)shopGo();
}
function buy(i){
  const u=UPG[i],S=UP(),l=S[u.k]|0;
  if(l>=u.max){ARC.sfx('click');return;}
  const c=u.cost(l);
  if((ARC.S.coins||0)<c){ARC.sfx('lose',{vol:.5});ARC.toast(T('noCoins'));shopSel=-2;return;}
  ARC.S.coins-=c;S[u.k]=l+1;ARC.save();
  ARC.sfx('power');ARC.vib(14);shopSel=i;shopA=.5;
  if(u.k==='life')lives=Math.min(uvR('life'),lives+1);
  applySkin();
  hud(true);
  ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:10,color:PAL.goldL,speed:180,size:4,life:.4});
  arsRefresh();
}
function shopGo(){
  ARC.sfx('tap');
  const w=wave+1;
  startWave(w);
  tutT=0;
}
function drawShop(g){
  const W=ARC.W,H=ARC.H,L=shopLayout();
  if(shopA>0)shopA-=1/60;
  g.fillStyle='rgba(4,7,14,.74)';g.fillRect(0,0,W,H);
  /* tarjeta */
  g.fillStyle='rgba(13,20,36,.97)';rr(g,L.px,L.py,L.pw,L.ph,L.ph*.09);g.fill();
  g.strokeStyle='rgba(255,255,255,.16)';g.lineWidth=Math.max(1,H*.004);g.stroke();
  g.fillStyle='rgba(255,176,32,.10)';rr(g,L.px,L.py,L.pw,L.hd,L.ph*.09);g.fill();
  const ts=Math.max(12,L.hd*.42);
  txt(g,T('shop'),L.px+L.pad,L.py+L.hd*.5,ts,'#fff','left',0);
  txt(g,'◉ '+fmt(ARC.S.coins||0),L.px+L.pw-L.pad,L.py+L.hd*.5,ts,PAL.goldL,'right',0);
  const S=UP();
  for(const c of L.cards){
    const u=UPG[c.i],l=S[u.k]|0,max=l>=u.max,cost=u.cost(l);
    const can=!max&&(ARC.S.coins||0)>=cost;
    const hi=(shopSel===c.i&&shopA>0);
    g.fillStyle=hi?'rgba(255,176,32,.30)':(can?'rgba(255,255,255,.09)':'rgba(255,255,255,.045)');
    rr(g,c.x,c.y,c.w,c.h,c.h*.22);g.fill();
    g.strokeStyle=can?'rgba(255,176,32,.65)':'rgba(255,255,255,.12)';
    g.lineWidth=Math.max(1,H*.0035);g.stroke();
    /* glifo en círculo */
    const r=c.h*.30,gx=c.x+c.h*.42,gy=c.y+c.h*.5;
    g.fillStyle=can?'rgba(255,176,32,.9)':'rgba(255,255,255,.16)';
    g.beginPath();g.arc(gx,gy,r,0,TAU);g.fill();
    txt(g,u.g,gx,gy+r*.04,r*1.15,can?'#141a2c':'rgba(255,255,255,.6)','center',0);
    const nx=gx+r*1.5,ns=Math.max(9,c.h*.245);
    txt(g,T(u.n),nx,c.y+c.h*.33,ns,'#fff','left',0);
    txt(g,T('lvS')+' '+l+'  ·  '+(u.k==='rate'?u.val(l).toFixed(1):u.val(l)),
      nx,c.y+c.h*.62,ns*.78,'rgba(255,255,255,.62)','left',0);
    const cs=Math.max(9,c.h*.25);
    if(max)txt(g,T('max'),c.x+c.w-c.h*.22,c.y+c.h*.5,cs,'rgba(255,255,255,.45)','right',0);
    else txt(g,'◉ '+fmt(cost),c.x+c.w-c.h*.22,c.y+c.h*.5,cs,
      can?PAL.goldL:'rgba(255,120,120,.75)','right',0);
  }
  /* SEGUIR */
  const b=L.go,pl=1+Math.sin(ARC.t*4)*.02;
  const bw=b.w*pl,bh=b.h*pl,bx=b.x+(b.w-bw)/2,by=b.y+(b.h-bh)/2;
  const lg=g.createLinearGradient(0,by,0,by+bh);
  lg.addColorStop(0,G.acc);lg.addColorStop(1,G.acc2);
  g.fillStyle=lg;rr(g,bx,by,bw,bh,bh*.32);g.fill();
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=Math.max(1,H*.003);g.stroke();
  txt(g,T('goOn')+'  ▸',bx+bw/2,by+bh*.54,Math.max(12,bh*.46),'#141a2c','center',0);
  g.textBaseline='alphabetic';
}
G.draw=function(g,alpha){
  if(!ARC.rnd||!scene)return;
  renderScene(alpha||0);
  drawNumbers(g);
  if(phase==='shop')drawShop(g);
  else drawBars(g);
  g.textAlign='left';g.textBaseline='alphabetic';g.globalAlpha=1;
};
/* --------------------------------------------------- MODO ATRACCIÓN */
G.attract=function(dt,g){
  if(!ARC.rnd||!scene)return;
  if(!demo){
    demo=1;botOn=1;phase='play';
    lives=99;inv=99;cx=tx=0;
    blocks.length=0;buls.length=0;shards.length=0;cns.length=0;boss=null;
    applySkin();
    startWave(8);
    tutT=0;
  }
  inv=99;
  simulate(dt);
  renderScene(0);
  drawNumbers(g);
  g.textAlign='left';g.textBaseline='alphabetic';
};
/* --------------------------------------------------- ARSENAL (DOM) */
let arsEl=null;
function buildArsenal(){
  if(arsEl||!document.getElementById('stage'))return;
  const d=document.createElement('div');
  d.className='scr';d.id='zArs';
  d.innerHTML='<div class="card" style="gap:1.1vmin;max-width:min(92vmin,760px)">'+
    '<div class="h2" id="zaT">ARSENAL</div>'+
    '<div class="badge" id="zaC" style="font-size:clamp(13px,3vmin,20px)"></div>'+
    '<div class="sm" id="zaD"></div>'+
    '<div id="zaU" style="display:grid;grid-template-columns:1fr 1fr;gap:.8vmin;width:100%"></div>'+
    '<div class="sm" id="zaS" style="margin-top:.4vmin"></div>'+
    '<div class="row" id="zaSk" style="flex-wrap:wrap;justify-content:center"></div>'+
    '<div class="btn" id="zaB" style="margin-top:.6vmin">LISTO</div></div>';
  document.getElementById('stage').appendChild(d);
  arsEl=d;
  d.querySelector('#zaB').addEventListener('pointerdown',e=>{
    e.preventDefault();ARC.sfx('tap');closeArs();});
}
function openArs(){
  buildArsenal();if(!arsEl)return;
  arsRefresh();arsEl.classList.add('on');
}
function closeArs(){if(arsEl)arsEl.classList.remove('on');}
function arsRefresh(){
  if(!arsEl)return;
  const S=UP(),sk=SKN();
  arsEl.querySelector('#zaT').textContent=T('arsenal');
  arsEl.querySelector('#zaC').innerHTML='<i>◉</i>'+fmt(ARC.S.coins||0);
  /* OJO: uv() en el menú devuelve los valores de EXHIBICIÓN del modo atracción (el
     arsenal mostraba "2 cañones · 99 vidas"): acá va uvR(), el valor de verdad. */
  arsEl.querySelector('#zaD').innerHTML='✦ '+uvR('dmg')+'  ·  ≫ '+uvR('rate').toFixed(1)+
    '/s  ·  ⌃ '+uvR('guns')+'  ·  ♥ '+uvR('life')+'  ·  <b>'+
    Math.round(uvR('dmg')*uvR('rate')*uvR('guns'))+' DPS</b>';
  arsEl.querySelector('#zaS').textContent=T('skins');
  arsEl.querySelector('#zaB').textContent=T('done');
  const U=arsEl.querySelector('#zaU');U.innerHTML='';
  UPG.forEach((u,i)=>{
    const l=S[u.k]|0,max=l>=u.max,cost=u.cost(l);
    const can=!max&&(ARC.S.coins||0)>=cost;
    const row=document.createElement('div');
    row.className='opt';row.style.width='100%';
    row.innerHTML='<div class="sm" style="opacity:1;text-align:left">'+u.g+' <b>'+T(u.n)+
      '</b><br><span style="opacity:.6">'+T('lvS')+' '+l+' · '+
      (u.k==='rate'?u.val(l).toFixed(1):u.val(l))+'</span></div>'+
      '<div class="btn'+(can?'':' gh')+'" style="white-space:nowrap">'+
      (max?T('max'):'◉ '+fmt(cost))+'</div>';
    const b=row.lastChild;
    if(!max)b.addEventListener('pointerdown',e=>{e.preventDefault();arsBuy(i);});
    U.appendChild(row);
  });
  const K=arsEl.querySelector('#zaSk');K.innerHTML='';
  SKIN.forEach((s,i)=>{
    const own=!!sk[i],cur=ARC.S.zskI===i;
    const el=document.createElement('div');
    el.className='btn'+(cur?'':' gh');
    el.style.cssText='flex-direction:column;gap:.1em;min-width:18%';
    el.innerHTML='<span style="color:'+s.c+';font-size:1.4em;line-height:1">◉</span>'+
      '<span style="font-size:.62em">'+T('sk'+i)+'</span>'+
      '<span style="font-size:.55em;opacity:.8">'+
      (cur?T('using'):(own?T('use'):'◉ '+fmt(s.cost)))+'</span>';
    el.addEventListener('pointerdown',e=>{e.preventDefault();arsSkin(i);});
    K.appendChild(el);
  });
}
function arsBuy(i){
  const u=UPG[i],S=UP(),l=S[u.k]|0;
  if(l>=u.max)return;
  const c=u.cost(l);
  if((ARC.S.coins||0)<c){ARC.sfx('lose',{vol:.5});ARC.toast(T('noCoins'));return;}
  ARC.S.coins-=c;S[u.k]=l+1;ARC.save();
  ARC.sfx('power');ARC.vib(14);
  applySkin();arsRefresh();
  const mc=document.getElementById('mCoins');if(mc)mc.textContent=ARC.S.coins||0;
}
function arsSkin(i){
  const sk=SKN();
  if(!sk[i]){
    if((ARC.S.coins||0)<SKIN[i].cost){ARC.sfx('lose',{vol:.5});ARC.toast(T('noCoins'));return;}
    ARC.S.coins-=SKIN[i].cost;sk[i]=1;ARC.sfx('win');
  }else ARC.sfx('tap');
  ARC.S.zskI=i;ARC.save();
  applySkin();arsRefresh();
  const mc=document.getElementById('mCoins');if(mc)mc.textContent=ARC.S.coins||0;
}
/* --------------------------------------------------------- el piloto */
/* Manda al cañón al bloque MÁS URGENTE (el que va a llegar antes al piso, no el
   más bajo: un bloque que sube todavía no es un problema) y esquiva lo que le
   está por caer encima. En la tienda compra la mejora más barata que pueda y
   sigue: si no, la sonda se quedaría clavada esperando un toque. */
function lowT(b,thr){
  const h=b.sz/2,d=b.y-h-thr;
  if(d<=0)return 0;
  const v=b.vy;
  return (v+Math.sqrt(v*v+2*GRAV*d))/GRAV;
}
function fold(x,h){
  const L=FX-h;
  let v=x;
  for(let k=0;k<3;k++){
    if(v>L)v=2*L-v;else if(v<-L)v=-2*L-v;else break;
  }
  return clamp(v,-L,L);
}
function botStep(dt){
  botT-=dt;
  if(phase==='shop'){
    if(botT>0)return;
    botT=.45;
    let best=-1,bc=1e9;
    const S=UP();
    for(let i=0;i<UPG.length;i++){
      const u=UPG[i],l=S[u.k]|0;
      if(l>=u.max)continue;
      const c=u.cost(l);
      if(c<=(ARC.S.coins||0)&&c<bc){bc=c;best=i;}
    }
    if(best>=0)buy(best);
    else shopGo();
    return;
  }
  if(phase!=='play')return;
  /* PELIGROS: para cada cosa, CUÁNDO va a estar a la altura del cañón y DÓNDE
     (con el rebote de las paredes plegado). El jefe sólo es peligro si de verdad
     bajó: si no, es el blanco. */
  const HZ=[],TG=[];
  for(const b of blocks){
    const t=lowT(b,CANH+.30);
    HZ.push({x:fold(b.x+b.vx*t,b.sz/2),r:b.sz/2+CANW+.34,t});
    TG.push(b);
  }
  if(boss){
    const h=boss.sz/2;
    if(boss.y-h<CANH+1.5){
      const t=lowT(boss,CANH+.30);
      HZ.push({x:fold(boss.x+boss.vx*t,h),r:h+CANW+.34,t});
    }
    TG.push(boss);
  }
  /* PENALIZACIÓN de una posición: peligro encima + peligro EN EL CAMINO. */
  const pen=x=>{
    let sc=0;
    for(const z of HZ){
      const d=Math.abs(z.x-x);
      /* SÓLO LO INMINENTE (0,32 s) ASUSTA. El cañón cruza 5 unidades en 0,15 s, así
         que se planta debajo del bloque y se corre en el último momento: es como
         juega una persona. Con el horizonte de miedo en 1,1 s el piloto se pasaba la
         oleada en un rincón vacío sin dispararle a nada (45 s para la oleada 2). */
      if(d<z.r&&z.t<.32)sc+=60*(1-z.t/.32)*(1-d/z.r);
      /* NO SE PUEDE HUIR ATRAVESANDO EL PELIGRO. Era el bug de todas las muertes
         del piloto: elegía un hueco libre del OTRO LADO del bloque que tenía
         encima y se lo comía en el camino (tx 3,05 con el bloque en −1,92 y el
         cañón en −2,43). Si el peligro queda ENTRE el cañón y el destino, ese
         destino se castiga: se escapa siempre por el lado de acá. */
      if(z.t<=.38&&z.x>Math.min(cx,x)-z.r*.8&&z.x<Math.max(cx,x)+z.r*.8)
        sc+=(.45-z.t)*90;
    }
    return sc;
  };
  /* APUNTAR EXACTO. Antes se barrían 27 posiciones y se premiaba la que tuviera un
     bloque encima; el paso del barrido (0,49) era MÁS GRANDE que el medio ancho de
     un bloque chico (0,23), así que casi nunca caía una posición alineada y el
     piloto disparaba al aire: la oleada 2 tardaba 30 s con 30 puntos de vida en
     total (medido). Ahora se prueba la posición EXACTA de tiro de cada blanco, del
     más urgente al menos, y se toma la primera que no sea peligrosa. */
  const ord=TG.map(b=>({b,t:lowT(b,CANH+.30)})).sort((p,q)=>p.t-q.t);
  const lim=-FX+CANW,lim2=FX-CANW;
  for(const o of ord){
    const b=o.b,h=b.sz/2;
    const lead=clamp((b.y-CANH)/BSPD,0,.45);
    const ax=clamp(fold(b.x+b.vx*lead,h),lim,lim2);
    if(pen(ax)<2){tx=ax;return;}
  }
  /* nada a tiro sin riesgo: a la posición más segura (barrido grueso) */
  let bx2=cx,bs=1e9;
  for(let i=0;i<31;i++){
    const x=lim+(lim2-lim)*i/30;
    const sc=pen(x)+Math.abs(x-cx)*.10;
    if(sc<bs){bs=sc;bx2=x;}
  }
  tx=clamp(bx2,lim,lim2);
}
G.dbg={
  state:()=>({wave,phase,lives,coins:ARC.S.coins||0,run:runCoins,kills,mult:mult(),
    blocks:blocks.length,buls:buls.length,boss:boss?Math.round(boss.hp):0,
    prog:+(dmgDone/Math.max(1,waveHP)).toFixed(2),x:+cx.toFixed(2),
    up:Object.assign({},UP()),dps:+(uvR('dmg')*uvR('rate')*uvR('guns')).toFixed(1),
    glb:{canon:GLBC,jefe:GLBJ},fx:{FX:+FX.toFixed(2),HW:+HW.toFixed(2)},
    demo,bot:botOn,
    gl:ARC.rnd?{tris:ARC.rnd.info.render.triangles,calls:ARC.rnd.info.render.calls}:null,
    fps:Math.round(ARC.fps)}),
  perf:()=>ARC.rnd?{tris:ARC.rnd.info.render.triangles,calls:ARC.rnd.info.render.calls,
    fps:Math.round(ARC.fps),blocks:blocks.length,buls:buls.length,
    shards:shards.length,coins:cns.length}:null,
  i18n:()=>{const ks=Object.keys(G.i18n.es),out={};
    for(const l of ['es','en','pt']){const f=ks.filter(k=>!G.i18n[l][k]);
      out[l]=f.length?('FALTAN '+f.join(',')):'ok';}
    return out;},
  jump:w=>{startWave(w|0);return wave;},
  /* llena la pantalla de bloques a propósito: es para medir el caso peor */
  flood:()=>{for(let i=0;i<12;i++)spawnBlock(rndi(1,3));return blocks.length;},
  clearWave:()=>{blocks.length=0;spawnN=0;boss=null;dmgDone=waveHP;return phase;},
  kill:()=>{lives=1;inv=0;hurt();return lives;},
  give:n=>{ARC.S.coins=(ARC.S.coins||0)+(n|0);ARC.save();hud(true);return ARC.S.coins;},
  shop:()=>shopLayout(),
  log:()=>LOG.slice(),
  /* Enciende el piloto: la sonda lo llama cada 500 ms y en ese tiempo caen 2,3 m,
     así que planificar sólo acá llegaría tarde. Con botOn el paso fijo replanifica
     en cada cuadro de simulación. */
  autoMove:()=>{
    if(phase==='off')return false;
    botOn=1;botT=0;botStep(1/60);
    return true;
  }
};
window.GAME=G;
