/* ============================================================================
   RUEDA NEÓN — la pelota que corre por una pista de neón en el vacío
   ----------------------------------------------------------------------------
   La pelota avanza sola; el dedo la mueve de costado. La pista tiene AGUJEROS
   (te caés), MUROS (te frenan), SIERRAS que giran, COMPUERTAS que se abren y
   cierran con ritmo, RAMPAS DE IMPULSO y DIAMANTES para juntar. 8 niveles con
   pista fija (semilla por nivel: mismo nivel = misma pista, se aprende de
   memoria) y un ARCO DE CONTROL a la mitad que te devuelve una vez.

   LO QUE HAY QUE SABER PARA TOCAR ESTE ARCHIVO
   --------------------------------------------
   · LEGIBILIDAD DE LA PISTA. Antes las baldosas eran Lambert oscuras con niebla
     negra: a 25 m la pista se fundía con el vacío y no se veía dónde estaba el
     borde ni el agujero (medido con snapGL: luz 34-39 con el 60% del cuadro en
     negro). Ahora la pista se arma en TRES MALLAS FUSIONADAS (una sola llamada
     de dibujo cada una, así el celular no sufre):
       tilesM  baldosas + faldón, colores por VÉRTICE (damero) y con niebla;
       glowM   ARISTAS: cada celda dibuja una tira brillante en cada lado que
               NO tiene vecina. Eso contornea la pista Y el borde de cada
               agujero, que es lo que hace que el camino se lea de lejos;
               además travesaños cada 4 m, los PORTALES de los niveles altos,
               las RAMPAS de impulso y las chapas de aviso de peligro;
       propM   columnas del vacío (paralaje), densidad de ARC.gfxP().part.
     La niebla ya no es negra: es del color de la ZONA y arranca lejos, así la
     distancia se lee como BRUMA y no como pozo negro.
   · UNA ZONA POR NIVEL (TH8). Cada nivel trae su paleta completa (baldosas,
     aristas, niebla, cielo, columnas, color de peligro, color del arco y de los
     diamantes) y su nombre; el nivel 8 no se parece en nada al 1. La paleta se
     aplica ANTES de armar las mallas, porque los colores van horneados por
     vértice.
   · CUATRO PELIGROS. muro (fijo), sierra (gira; algunas BARREN carriles),
     COMPUERTA (`puls`: una pared que sube y baja con ritmo propio; se cruza
     cuando está abajo — es el único peligro de TIEMPO, no de posición) y el
     vacío. Cada uno deja (a) chapa magenta con galón en las 2 baldosas
     anteriores, (b) sombra en su baldosa y (c) galón 2D pulsante proyectado en
     pantalla entre 3,5 y 27 m. A 11,3 m/s eso son 2,1 s de aviso.
   · RAMPAS DE IMPULSO (boosts). Van SOBRE el camino garantizado, cada ~26 m y
     nunca a menos de 6 m de un peligro. Dan +45% de velocidad que decae en
     1,4 s (≈0,3 s de tiempo ganado cada una). Son lo que hace que el MEJOR
     TIEMPO por nivel se pueda mejorar: sin rampas el tiempo sería fijo
     (largo/velocidad) y la medalla de velocidad no significaría nada.
   · EL PUESTO DE CONTROL SE VE EN LA PISTA: es un ARCO (GLB si cargó, si no
     geometría) con una franja ancha cruzando la pista, y el arco y su franja NO
     tienen niebla, así se ven venir desde 150 m. Al pasarlo la franja cambia de
     ámbar a verde y el arco se enciende. La meta es otro arco con cuadros.
   · UNA SOLA VERDAD DE POSICIÓN. Antes `bx` era el destino Y el colisionador,
     mientras la pelota dibujada iba interpolada: se moría por una pared que en
     pantalla estaba a medio carril. Ahora `bx` es la posición REAL (se mueve a
     LSP m/s hacia `tx`, el destino que pide el dedo) y el choque se mide con
     `bx`. La pelota dibujada ES bx.
   · MARGEN DE REACCIÓN. Los primeros `clean` metros de cada nivel no tienen
     nada (34 en el 1, 22 en el 8) y la velocidad entra con rampa: 55% durante
     los primeros 2,6 s. Nunca se muere en el primer segundo.
   · CURVA DE DIFICULTAD EXPLÍCITA (tabla LV, no una fórmula): nivel 1 = 112 m a
     6 m/s sin sierras y sin pasillos angostos (19 s, lo pasa cualquiera);
     nivel 8 = 390 m a 11,3 m/s con sierras que barren y compuertas (35 s).
   · CAMINO GARANTIZADO. Se lleva un carril "camino" que se corre como máximo un
     carril cada `shift` metros y nunca se le hace un agujero ni se le pone un
     obstáculo; se protegen también los carriles del metro anterior y siguiente
     porque la pelota tarda 0,12 s en cruzar de carril y a 11 m/s eso es 1,4 m.
     Sin esto la pista aleatoria arma filas imposibles (medido: caída al vacío a
     los 41 m de 208 sin haber tocado nada evitable).
   · DIAMANTES = MONEDA. Se juntan de a tandas SOBRE el camino, cuentan para las
     estrellas (85% = 3, 55% = 2) y se GASTAN en pelotas (panel del botón ◆ del
     menú). Se guardan en ARC.S.coins (el motor ya muestra esa ficha en el menú;
     acá se le cambia el ícono a ◆) y el total de por vida en ARC.S.gems.
   · MEDALLAS por nivel, en ARC.S.med[nivel] como bits: 1 = llegaste sin usar el
     arco de control, 2 = todos los diamantes, 4 = por debajo del tiempo par.
     El mejor tiempo va en ARC.S.tLv[nivel] y se muestra en el HUD, en el remate
     y en el panel.
   · MODO ATRACCIÓN (GAME.attract): el motor lo llama en cada cuadro mientras el
     menú está abierto. Es la MISMA pista y el MISMO piloto: la pelota corre
     sola con una cámara que orbita lento. No suena, no guarda nada y no mata
     (die() reaparece 6 m atrás). Con el menú vivo el motor apaga el arte de
     fondo, así que el CSS de acá devuelve el título de DOM (`.hasart.live`).
   · EL PILOTO (dbg.autoMove) hace programación dinámica sobre 16 filas con la
     velocidad LATERAL real (una fila no alcanza para cambiar de carril a 11 m/s:
     hacen falta 1,7) y predice dónde va a estar la sierra que barre y si la
     compuerta va a estar abierta cuando la pelota llegue. Los obstáculos están
     INDEXADOS POR z (obsZ) y cada casillero se cachea: antes cada plan barría
     los 95 obstáculos del nivel 8 hasta 240 veces y el piloto solo se comía la
     mitad del cuadro (medido: 20,6 fps con el piloto encendido contra 47-60 sin
     él, con la misma escena).
   · SIN MSAA. El motor crea el renderer con antialias:true y en swiftshader eso
     cuesta la mitad de los cuadros; acá se rehace el renderer sin MSAA (ver
     fastGL) y se baja la resolución sola si la máquina no llega (autoRes).
   ========================================================================== */
const G={
  slug:'rueda',name:'RUEDA NEON',
  title:'RUEDA <em>NEÓN</em>',
  sub:'Pista de neón en el vacío: esquivá agujeros, muros, sierras y compuertas, juntá diamantes y llegá a la meta.',
  subKey:'sub',
  acc:'#22d3ee',acc2:'#0891b2',levels:8,bestLabel:'METROS',bestKey:'metL',
  three:true,sky:'#04070e',shadows:false,
  glbTris:520,
  art:A('art-rueda.jpg'),music:A('mus-rueda-neon.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),
       lose:A('sfx-lose.mp3'),boom:A('sfx-boom.mp3'),power:A('sfx-power.mp3'),chime:A('sfx-chime.mp3'),
       gem:A('sfx-rueda-gem.mp3'),saw:A('sfx-rueda-saw.mp3'),check:A('sfx-rueda-check.mp3'),
       gate:A('sfx-rueda-gate.mp3')},
  glb:{sierra:A('m-rueda-sierra.glb'),arco:A('m-rueda-arco.glb')},
  i18n:{
    es:{sub:'Pista de neón en el vacío: esquivá agujeros, muros, sierras y compuertas, juntá diamantes y llegá a la meta. 8 zonas, arco de control a la mitad.',
      metL:'METROS',tutDrag:'ARRASTRÁ PARA MOVERTE',tutSide:'o usá ◀ ▶',
      cpGot:'ARCO DE CONTROL',cpBack:'¡VOLVÉS AL ARCO!',goal:'¡META!',
      dFall:'AL VACÍO',dHit:'CHOCASTE',dSaw:'TE CORTÓ LA SIERRA',dGate:'TE CERRÓ LA COMPUERTA',
      statMet:'Metros',statGems:'Diamantes',usedCp:'Usaste el arco de control',
      warn:'¡PELIGRO!',gemsAll:'¡TODOS LOS DIAMANTES!',newRec:'¡NUEVO RÉCORD!',
      boost:'¡IMPULSO!',statTime:'Tiempo',statBest:'Mejor',newTime:'¡RÉCORD DE TIEMPO!',
      almost:'¡CASI!',zone:'ZONA',medals:'MEDALLAS',medNew:'¡MEDALLA NUEVA!',
      medClean:'Sin usar el arco',medGems:'Todos los diamantes',medFast:'Bajo el tiempo par',
      balls:'PELOTAS',use:'USAR',inUse:'EN USO',buy:'COMPRAR',locked:'Te faltan diamantes',
      bought:'¡DESBLOQUEADA!',close:'CERRAR',gemsTot:'juntados',parT:'Par',
      b1:'SOL',b2:'HIELO',b3:'BRASA',b4:'TÓXICA',b5:'VIOLETA',b6:'ORO',
      z1:'CIAN',z2:'VIOLETA',z3:'SELVA',z4:'ÁMBAR',z5:'ROSA',z6:'HIELO',z7:'LAVA',z8:'ORO',
      allMed:'¡LAS TRES MEDALLAS!',lock:'Superá el nivel anterior'},
    en:{sub:'A neon track in the void: dodge holes, walls, saws and gates, grab diamonds and reach the goal. 8 zones, one checkpoint arch halfway.',
      metL:'METRES',tutDrag:'DRAG TO MOVE',tutSide:'or use ◀ ▶',
      cpGot:'CHECKPOINT ARCH',cpBack:'BACK TO THE ARCH!',goal:'GOAL!',
      dFall:'INTO THE VOID',dHit:'CRASHED',dSaw:'THE SAW GOT YOU',dGate:'THE GATE SHUT ON YOU',
      statMet:'Metres',statGems:'Diamonds',usedCp:'You used the checkpoint',
      warn:'DANGER!',gemsAll:'ALL THE DIAMONDS!',newRec:'NEW BEST!',
      boost:'BOOST!',statTime:'Time',statBest:'Best',newTime:'BEST TIME!',
      almost:'SO CLOSE!',zone:'ZONE',medals:'MEDALS',medNew:'NEW MEDAL!',
      medClean:'No checkpoint used',medGems:'Every diamond',medFast:'Under par time',
      balls:'BALLS',use:'USE',inUse:'IN USE',buy:'BUY',locked:'Not enough diamonds',
      bought:'UNLOCKED!',close:'CLOSE',gemsTot:'collected',parT:'Par',
      b1:'SUN',b2:'ICE',b3:'EMBER',b4:'TOXIC',b5:'VIOLET',b6:'GOLD',
      z1:'CYAN',z2:'VIOLET',z3:'JUNGLE',z4:'AMBER',z5:'PINK',z6:'ICE',z7:'LAVA',z8:'GOLD',
      allMed:'ALL THREE MEDALS!',lock:'Beat the previous level'},
    pt:{sub:'Pista de neon no vazio: desvie de buracos, muros, serras e portões, junte diamantes e chegue à meta. 8 zonas, arco de controle no meio.',
      metL:'METROS',tutDrag:'ARRASTE PARA MOVER',tutSide:'ou use ◀ ▶',
      cpGot:'ARCO DE CONTROLE',cpBack:'VOLTA AO ARCO!',goal:'META!',
      dFall:'NO VAZIO',dHit:'VOCÊ BATEU',dSaw:'A SERRA TE PEGOU',dGate:'O PORTÃO FECHOU EM VOCÊ',
      statMet:'Metros',statGems:'Diamantes',usedCp:'Você usou o arco de controle',
      warn:'PERIGO!',gemsAll:'TODOS OS DIAMANTES!',newRec:'NOVO RECORDE!',
      boost:'IMPULSO!',statTime:'Tempo',statBest:'Melhor',newTime:'RECORDE DE TEMPO!',
      almost:'QUASE!',zone:'ZONA',medals:'MEDALHAS',medNew:'MEDALHA NOVA!',
      medClean:'Sem usar o arco',medGems:'Todos os diamantes',medFast:'Abaixo do tempo par',
      balls:'BOLAS',use:'USAR',inUse:'EM USO',buy:'COMPRAR',locked:'Faltam diamantes',
      bought:'DESBLOQUEADA!',close:'FECHAR',gemsTot:'juntados',parT:'Par',
      b1:'SOL',b2:'GELO',b3:'BRASA',b4:'TÓXICA',b5:'VIOLETA',b6:'OURO',
      z1:'CIANO',z2:'VIOLETA',z3:'SELVA',z4:'ÂMBAR',z5:'ROSA',z6:'GELO',z7:'LAVA',z8:'OURO',
      allMed:'AS TRÊS MEDALHAS!',lock:'Passe o nível anterior'}
  }
};
/* OJO: el shell ya declara `const T=ARC.T` en este mismo ámbito de módulo.
   Redeclararlo tira "Identifier 'T' has already been declared" y el juego entero
   no arranca. Se usa el T del shell. */

/* --------------------------------------------------------------- constantes */
const LANES=5,CW=1.25,HALF=(LANES-1)/2*CW;   /* 5 carriles de 1,25 → pista 6,25 */
const LODZ=24;                               /* hasta acá la sierra es el modelo 3D */
const ARCHZ=150;                             /* y hasta acá se dibujan los arcos */
const BR=.42;                                /* radio de la pelota */
const LSP=10.5;                              /* velocidad LATERAL (u/s): 0,12 s por carril */
const TH=.26;                                /* espesor de la baldosa */
const BOOSTT=1.4,BOOSTK=.45;                 /* la rampa dura 1,4 s y da +45% */
/* CURVA DE DIFICULTAD, a mano y medida con el piloto (ver informe):
   len metros · spd m/s · clean metros limpios al empezar · shift metros mínimos
   entre corrimientos del camino · hole/narrow/wall/saw/puls/mov probabilidad por
   metro · ring cada cuántos metros va un PORTAL (0 = ninguno)
   (los diamantes y las rampas van por reparto fijo, ver más abajo) */
const LV=[
  {len:112,spd:6.0 ,clean:34,shift:5,hole:.10,narrow:0  ,wall:.055,saw:0   ,puls:0   ,mov:0  ,ring:0 },
  {len:140,spd:6.7 ,clean:30,shift:4,hole:.14,narrow:.04,wall:.075,saw:.03 ,puls:0   ,mov:0  ,ring:0 },
  {len:172,spd:7.4 ,clean:28,shift:4,hole:.18,narrow:.07,wall:.090,saw:.055,puls:0   ,mov:0  ,ring:28},
  {len:205,spd:8.1 ,clean:26,shift:3,hole:.22,narrow:.10,wall:.100,saw:.075,puls:.030,mov:0  ,ring:24},
  {len:240,spd:8.8 ,clean:26,shift:3,hole:.25,narrow:.13,wall:.105,saw:.085,puls:.045,mov:0  ,ring:20},
  {len:280,spd:9.6 ,clean:24,shift:3,hole:.28,narrow:.16,wall:.110,saw:.095,puls:.055,mov:.05,ring:18},
  {len:330,spd:10.4,clean:24,shift:3,hole:.31,narrow:.19,wall:.115,saw:.105,puls:.065,mov:.07,ring:16},
  {len:390,spd:11.3,clean:22,shift:3,hole:.34,narrow:.22,wall:.120,saw:.115,puls:.075,mov:.09,ring:14}
];
/* CUÁNTAS RAMPAS DE IMPULSO lleva cada nivel: una cada 24 m de pista útil. Es
   una cuenta cerrada (no depende de dónde caigan) para que el TIEMPO PAR se
   pueda calcular sin armar la pista (lo necesita el panel de medallas). */
const nbOf=n=>{const P=LV[clamp(n,1,8)-1];return Math.max(2,Math.floor((P.len-P.clean-20)/24));};
/* TIEMPO PAR. Sin tocar ninguna rampa la pelota tarda largo/velocidad + 0,55 s
   (los primeros 2,6 s van al 55-100%). Cada rampa ahorra ~0,31 s. El par exige
   más o menos un TERCIO de las rampas: se puede ganar el nivel sin apurarse y
   la medalla ⚡ pide jugar bien las rampas. */
const parOf=n=>{const P=LV[clamp(n,1,8)-1];
  return +(P.len/P.spd+.55-nbOf(n)*.11).toFixed(1);};

/* ---------------------------------------------------------- ZONAS (una por nivel)
   Cada fila: t0 t1 skirt rail bar fog sky prop propTop danger cp gem.
   Los colores van HORNEADOS por vértice en las mallas fusionadas, así que la
   paleta se elige antes de armar la pista (setTheme en buildTrack). */
const THK=['t0','t1','skirt','rail','bar','fog','sky','prop','propTop','danger','cp','gem'];
const TH8=[
/*1 cian   */['#2aa9cb','#1d8bab','#0b4b60','#8ff4ff','#3fd8f0','#0a2b3c','#04070e','#071a26','#0f303f','#ff2d78','#ffb03a','#c9f7ff'],
/*2 violeta*/['#6d4fd0','#553cae','#2a1a5e','#cdb4ff','#9a7bff','#190f42','#07050f','#120e38','#221a58','#ff3d6e','#ffc247','#e6d6ff'],
/*3 selva  */['#3fb56b','#2f8f55','#0f4a2c','#b6ffcf','#62e08f','#06331f','#030b06','#062117','#0d3b27','#ff2d78','#ffcf3a','#dfffe9'],
/*4 ámbar  */['#d3913a','#ae722a','#5a3510','#ffe3a8','#ffb648','#3a2408','#0d0703','#221609','#3b2712','#ff2f5f','#4ad9ff','#fff0c2'],
/*5 rosa   */['#c74f9e','#a13c80','#5c1543','#ffc7ec','#ff74c8','#3a0d2c','#0c040a','#26091d','#401231','#ffd23f','#4affc0','#ffe6f7'],
/*6 hielo  */['#4a6fd0','#3a56a8','#16265e','#c3daff','#6f9bff','#0a1740','#030612','#0a1231','#152351','#ff3d6e','#ffbb3a','#eaf3ff'],
/*7 lava   */['#c74a3a','#a33628','#5c1a10','#ffc7ae','#ff7a4d','#390f08','#0c0403','#260c08','#3f1a10','#ffe14d','#4affd2','#ffe0cf'],
/*8 oro    */['#cdba55','#a5943c','#4e4212','#fff5b8','#ffe066','#2e2a08','#0a0903','#201d08','#38330f','#ff2d78','#59f0ff','#fffbe0']
];
const FIXP={shadow:'#04121a',cpOn:'#43e57a',boost:'#3dffa8'};
function hx(h){h=h.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function toHx(a){return '#'+a.map(v=>('0'+clamp(Math.round(v),0,255).toString(16)).slice(-2)).join('');}
function mixc(a,b,k){const A=hx(a),B=hx(b);return toHx([0,1,2].map(i=>A[i]+(B[i]-A[i])*k));}
let PAL=Object.assign({},FIXP);
function setTheme(n){
  const a=TH8[clamp(n,1,8)-1];
  PAL=Object.assign({},FIXP);
  THK.forEach((k,i)=>PAL[k]=a[i]);
  PAL.dangerD=mixc(PAL.danger,'#000000',.66);
  PAL.wall=PAL.danger;
  PAL.wallTop=mixc(PAL.danger,'#ffffff',.62);
  PAL.fin=mixc(PAL.rail,'#000000',.45);
  PAL.ring=PAL.rail;
}
const zoneName=n=>T('z'+clamp(n,1,8));

/* ------------------------------------------------------------------- PELOTAS
   Cosméticas (nada de ventajas: la dificultad tiene que significar lo mismo
   para todos) y se pagan con DIAMANTES. c = color, e = emisiva, g = resplandor,
   sh = sombra en el piso, sp = deja chispas. */
const BALLS=[
  {id:'sol' ,k:'b1',c:'#ffc95c',e:'#5a3200',g:'#ffd98a',sh:'#7ef0ff',cost:0  ,sp:0},
  {id:'hielo',k:'b2',c:'#9fe8ff',e:'#0b3d52',g:'#d8f6ff',sh:'#9fe8ff',cost:30 ,sp:0},
  {id:'brasa',k:'b3',c:'#ff7a45',e:'#5c1400',g:'#ffb08a',sh:'#ff9c6b',cost:70 ,sp:0},
  {id:'toxi' ,k:'b4',c:'#b6ff4d',e:'#254d00',g:'#dcffa8',sh:'#b6ff4d',cost:130,sp:0},
  {id:'viol' ,k:'b5',c:'#c08bff',e:'#2c0b52',g:'#e6d0ff',sh:'#c08bff',cost:220,sp:1},
  {id:'oro'  ,k:'b6',c:'#ffe066',e:'#5c4300',g:'#fff3b0',sh:'#ffe066',cost:340,sp:1}
];
const ownedB=()=>Array.isArray(ARC.S.balls)?ARC.S.balls:(ARC.S.balls=['sol']);
const hasB=id=>ownedB().indexOf(id)>=0;
function ballIdx(){const i=BALLS.findIndex(b=>b.id===ARC.S.ball);return i<0||!hasB(BALLS[i].id)?0:i;}
const curBall=()=>BALLS[ballIdx()];

/* ------------------------------------------------------------------ MEDALLAS */
const MEDS=[{bit:1,ic:'✔',k:'medClean'},{bit:2,ic:'◆',k:'medGems'},{bit:4,ic:'⚡',k:'medFast'}];
function medOf(n){const m=ARC.S.med||{};return m[String(n)]|0;}
function medAdd(n,mask){
  if(!ARC.S.med)ARC.S.med={};
  const k=String(n),had=ARC.S.med[k]|0;
  ARC.S.med[k]=had|mask;
  return (had|mask)&~had;               /* los bits NUEVOS de esta partida */
}
function bestT(n){const t=ARC.S.tLv||{};return t[String(n)]||0;}
function setBestT(n,s){
  if(!ARC.S.tLv)ARC.S.tLv={};
  const k=String(n),b=ARC.S.tLv[k]||0;
  if(!b||s<b){ARC.S.tLv[k]=+s.toFixed(2);return true;}
  return false;
}
/* 12,4 s en castellano y portugués; 12.4 s en inglés */
function fmtT(s){const v=(+s).toFixed(1);return (ARC.lang&&ARC.lang()==='en'?v:v.replace('.',','))+' s';}

let T3,scene,cam,ball,ballGlow,ballSh,trackG,dynG,propM,tilesM,glowM;
let cells=[],obs=[],obsZ=[],gems=[],boosts=[],pathL=[],sawG=[],gemG=[];
const NOOBS=[];
let cpArch=null,finArch=null,cpBand=null,cpBandOn=null;
let lvl=1,LEN=0,SPD=0,CPZ=0,PAR=0;
let bx=0,tx=0,bz=0,vz=0,fallV=0,dead=0,won=false,drag=null;
let pbx=0,pbz=0,hudM=-1;                     /* estado anterior: interpolación al dibujar */
let gemN=0,gemT=0,cpOn=0,cpUsed=0,tilt=0,warm=0,lastDie='',dieK='';
let botOn=0,sawSnd=0,recTold=false,runT=0,boostT=0,boostN=0;
let DEMO=0,demoOn=0,demoRe=0;
let partK=1,fogK=1,decoK=1,SAWGLB=false,ARCGLB=false;
const MAT={},GEO={},V3=[];
function vec(){if(!V3.length)V3.push(new T3.Vector3());return V3[0];}
function mat(c,e){const k=c+(e?'e':'');if(MAT[k])return MAT[k];
  return MAT[k]=e?new T3.MeshBasicMaterial({color:new T3.Color(c)})
                 :new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function box(w,h,d){const k=w+'_'+h+'_'+d;return GEO[k]||(GEO[k]=new T3.BoxGeometry(w,h,d));}
function octa(r){const k='o'+r;return GEO[k]||(GEO[k]=new T3.OctahedronGeometry(r));}
function C(h){const c=new T3.Color(h);return[c.r,c.g,c.b];}
/* en el menú no suena nada: el modo atracción es decorado, no partida */
function sfx(n,o){if(!DEMO)ARC.sfx(n,o);}
/* --- malla fusionada: junto miles de caras en UNA geometría con color por
   vértice, así toda la pista son 3 llamadas de dibujo y no 900 --- */
function A0(){return{p:[],c:[]};}
function Q(A,a,b,c,d,col){
  const t=[a,b,c,a,c,d];
  for(const v of t){A.p.push(v[0],v[1],v[2]);A.c.push(col[0],col[1],col[2]);}
}
function TRI(A,a,b,c,col){
  for(const v of [a,b,c]){A.p.push(v[0],v[1],v[2]);A.c.push(col[0],col[1],col[2]);}
}
function bq(A,x,y,z,w,h,d,ct,cs){          /* caja (5 caras, sin fondo) */
  const x0=x-w/2,x1=x+w/2,y0=y,y1=y+h,z0=z-d/2,z1=z+d/2;
  Q(A,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],ct);
  Q(A,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],cs);
  Q(A,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],cs);
  Q(A,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],cs);
  Q(A,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],cs);
}
function plate(A,x,z,w,d,y,col){           /* chapa horizontal */
  Q(A,[x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y,z-d/2],[x-w/2,y,z-d/2],col);
}
function meshOf(A,fog,op){
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(A.p,3));
  g.setAttribute('color',new T3.Float32BufferAttribute(A.c,3));
  g.computeBoundingSphere();
  /* FrontSide a propósito: todas las caras se emiten con el giro correcto (probado
     cara por cara con el producto vectorial), así el rasterizador descarta la
     mitad. Con DoubleSide el celular pintaba dos veces cada columna del vacío. */
  const m=new T3.MeshBasicMaterial({vertexColors:true,side:T3.FrontSide,fog:fog!==false});
  if(op!=null){m.transparent=true;m.opacity=op;}
  const me=new T3.Mesh(g,m);me.userData.own=1;return me;
}
function glbTris(o){let n=0;o.traverse(k=>{if(k.isMesh&&k.geometry){
  const g=k.geometry;n+=(g.index?g.index.count:(g.attributes.position?g.attributes.position.count:0))/3;}});
  return Math.round(n);}
/* GLB centrado en x/y/z (la sierra gira sobre su centro) o apoyado (el arco) */
function glbNode(key,targetH,noFog){
  const S=ARC.glb&&ARC.glb[key];
  if(!S||!S.scene)return null;
  try{
    const o=S.scene.clone(true);
    const bb=new T3.Box3().setFromObject(o),sz=new T3.Vector3(),c=new T3.Vector3();
    bb.getSize(sz);bb.getCenter(c);
    if(!(sz.y>.0001))return null;
    const s=targetH/sz.y;
    o.scale.setScalar(s);
    o.position.set(-c.x*s,-c.y*s,-c.z*s);
    o.traverse(k=>{if(k.isMesh){k.castShadow=false;k.receiveShadow=false;
      if(k.material&&noFog)k.material.fog=false;}});
    const w=new T3.Group();w.add(o);
    return w;
  }catch(e){console.warn('glb '+key,e);return null;}
}
/* el arco se estira a lo ANCHO de la pista y se limita en ALTO: el modelo viene
   casi cuadrado y a 7 unidades de alto tapaba media pantalla */
function glbArch(key,targetW,targetH){
  const S=ARC.glb&&ARC.glb[key];
  if(!S||!S.scene)return null;
  try{
    const o=S.scene.clone(true);
    const bb=new T3.Box3().setFromObject(o),sz=new T3.Vector3(),c=new T3.Vector3();
    bb.getSize(sz);bb.getCenter(c);
    if(!(sz.x>.0001)||!(sz.y>.0001))return null;
    const sx=targetW/sz.x,sy=targetH/sz.y;
    o.scale.set(sx,sy,sx);
    o.position.set(-c.x*sx,-bb.min.y*sy,-c.z*sx);
    o.traverse(k=>{if(k.isMesh&&k.material)k.material.fog=false;});
    const w=new T3.Group();w.add(o);
    return w;
  }catch(e){console.warn('glb '+key,e);return null;}
}
/* --------------------------------------------------- generador determinista */
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const lx=i=>(i-(LANES-1)/2)*CW;
function clearG(g){while(g.children.length){const c=g.children[0];g.remove(c);
  if(c.geometry&&c.userData.own)c.geometry.dispose();}}
function buildTrack(n){
  const P=LV[clamp(n,1,8)-1];
  LEN=P.len;SPD=P.spd;CPZ=Math.round(LEN/2);PAR=parOf(n);
  setTheme(n);
  const R=rng(4177+n*977);
  cells=[];obs=[];obsZ=[];gems=[];boosts=[];pathL=[];sawG=[];gemG=[];
  clearG(trackG);clearG(dynG);
  propM=tilesM=glowM=null;
  /* 1) camino garantizado */
  let lane=Math.floor(LANES/2),lastSh=-99;
  for(let z=0;z<=LEN+2;z++){
    if(z>P.clean&&z<LEN-8&&z-lastSh>=P.shift&&R()<.62){
      const nl=clamp(lane+(R()<.5?-1:1),0,LANES-1);
      if(nl!==lane){lane=nl;lastSh=z;}
    }
    pathL.push(lane);
  }
  /* 2) filas: agujeros y pasillos, nunca sobre el camino ni sus vecinos en z */
  for(let z=0;z<=LEN+2;z++){
    const row=new Array(LANES).fill(1);
    const keep={};keep[pathL[Math.max(0,z-1)]]=1;keep[pathL[z]]=1;keep[pathL[Math.min(LEN+2,z+1)]]=1;
    if(z>P.clean&&z<LEN-6){
      if(R()<P.hole){
        const k=1+Math.floor(R()*2);
        for(let i=0;i<k;i++){const c=Math.floor(R()*LANES);if(!keep[c])row[c]=0;}
      }
      if(R()<P.narrow){
        for(let i=0;i<LANES;i++)if(!keep[i]&&Math.abs(i-pathL[z])>1)row[i]=0;
      }
    }
    cells.push(row);
  }
  /* 3) obstáculos y diamantes */
  let gemRun=0,lastGem=-99;
  for(let z=0;z<=LEN;z++){
    if(z>P.clean&&z<LEN-6){
      const free=[];for(let i=0;i<LANES;i++)if(!keepAt(z,i)&&cells[z][i])free.push(i);
      /* JUSTICIA: no se tapa un carril en una fila que ya está casi cerrada. Sin
         esto el nivel 7 armaba la fila 184 = 10011 CON un muro en el 3: quedaban
         abiertos sólo el 0 y el 4, con el peligro justo en el medio, y había que
         comprometerse cuatro filas antes (ahí murió el piloto al 56%). Ahora todo
         obstáculo exige 3 carriles sólidos: siempre quedan dos salidas. */
      const openN=cells[z].reduce((s,v)=>s+v,0);
      if(openN<3)free.length=0;
      const r=R();
      if(free.length&&r<P.wall){
        const i=free[Math.floor(R()*free.length)];
        obs.push({t:'wall',i,z,x:lx(i),w:CW*.46,amp:0,ph:0,sp:0});
      }else if(free.length&&r<P.wall+P.saw){
        const i=free[Math.floor(R()*free.length)];
        obs.push({t:'saw',i,z,x:lx(i),w:.50,amp:0,ph:R()*TAU,sp:0});
      }else if(free.length&&r<P.wall+P.saw+P.puls){
        /* COMPUERTA: el único peligro de TIEMPO. Sube y baja con su propio ritmo
           (1,5-2,1 s) y está cerrada el 45% del tiempo; se cruza cuando está
           abajo. Nunca dos seguidas a menos de 3 m, para que la lectura del
           ritmo alcance. */
        const i=free[Math.floor(R()*free.length)];
        if(noObsNear(z,3))obs.push({t:'puls',i,z,x:lx(i),w:CW*.46,amp:0,ph:R()*3,sp:0,per:1.5+R()*.6});
      }else if(r<P.wall+P.saw+P.puls+P.mov&&rowSolid(z)&&noObsNear(z,3)){
        /* SIERRA QUE BARRE: sólo en filas enteras (siempre hay escape a los
           costados) y a 2 carriles del camino, con amplitud 1,45·CW para que sí
           llegue a invadir el carril bueno: la esquivás moviéndote, no rezando */
        const cand=[];for(let i=0;i<LANES;i++)if(Math.abs(i-pathL[z])>=2)cand.push(i);
        if(cand.length){
          const i=cand[Math.floor(R()*cand.length)];
          obs.push({t:'saw',i,z,x:lx(i),w:.50,amp:CW*1.45,ph:R()*TAU,sp:1.5+R()*.5});
        }
      }
      /* DIAMANTES: tandas de 3 a 5 SOBRE el camino, una cada 13-16 m. Antes salían
         por probabilidad y el nivel 1 quedaba con 6 diamantes mientras el 2 tenía
         22 (medido con dbg.state): con tan pocos, el 85% para las 3 estrellas
         obligaba a juntar TODOS. Con reparto fijo la cuenta es proporcional al
         largo del nivel y las estrellas significan lo mismo en los 8 niveles. */
      if(gemRun>0){gemRun--;gems.push({z,i:pathL[z],x:lx(pathL[z]),got:0});}
      else if(z-lastGem>=13+Math.floor(R()*4)){gemRun=3+Math.floor(R()*3);lastGem=z;}
    }
  }
  gemT=gems.length;
  /* 3b) índice por z: el piloto y los choques miran 3 casilleros en vez de los
     95 obstáculos del nivel (ver el comentario de arriba sobre el piloto) */
  for(const o of obs)(obsZ[o.z]||(obsZ[o.z]=[])).push(o);
  /* 3c) RAMPAS DE IMPULSO: una cada 24 m SOBRE el camino garantizado. Se busca la
     primera fila del tramo que esté lejos de un peligro, y si el nivel viene tan
     cargado que no hay ninguna a 4 m se afloja a 3 y a 2 (medido: con "6 m de
     margen" fijo el nivel 8 se quedaba con UNA sola rampa en 390 m y la medalla
     de velocidad era imposible). */
  const nb=nbOf(n);
  for(let k=0;k<nb;k++){
    const zs=P.clean+8+k*24;
    let put=-1;
    for(const need of [4,3,2]){
      for(let z=zs;z<Math.min(LEN-8,zs+22);z++){
        if(!cells[z][pathL[z]]||!noObsNear(z,need))continue;
        if(boosts.length&&z-boosts[boosts.length-1].z<10)continue;
        put=z;break;
      }
      if(put>=0)break;
    }
    if(put>=0)boosts.push({z:put,i:pathL[put],x:lx(pathL[put])});
  }
  /* 4) mallas */
  buildMeshes(P);
  buildProps();
  buildArches();
}
function keepAt(z,i){
  return pathL[Math.max(0,z-1)]===i||pathL[z]===i||pathL[Math.min(pathL.length-1,z+1)]===i;
}
function rowSolid(z){for(let i=0;i<LANES;i++)if(!cells[z][i])return false;
  return z>1&&rowFull(z-1)&&rowFull(z+1);}
function rowFull(z){const r=cells[z];if(!r)return false;
  for(let i=0;i<LANES;i++)if(!r[i])return false;return true;}
function noObsNear(z,d){for(const o of obs)if(Math.abs(o.z-z)<d)return false;return true;}
function solid(z,i){const r=cells[z];return!!(r&&r[i]);}
const obsAt=z=>obsZ[z]||NOOBS;

function buildMeshes(P){
  const TA=A0(),GA=A0();
  const t0=C(PAL.t0),t1=C(PAL.t1),sk=C(PAL.skirt),rl=C(PAL.rail),br=C(PAL.bar);
  const dg=C(PAL.danger),sh=C(PAL.shadow),bo=C(PAL.boost);
  const E=.085;                               /* ancho de la arista brillante */
  for(let z=0;z<cells.length;z++){
    for(let i=0;i<LANES;i++){
      if(!cells[z][i])continue;
      const x=lx(i),zc=-z;
      const col=((z+i)&1)?t0:t1;
      /* tapa */
      Q(TA,[x-CW/2,0,zc+.5],[x+CW/2,0,zc+.5],[x+CW/2,0,zc-.5],[x-CW/2,0,zc-.5],col);
      /* faldón sólo donde no hay vecina (así se ve el espesor en los bordes) */
      if(!solid(z,i-1))Q(TA,[x-CW/2,-TH,zc-.5],[x-CW/2,-TH,zc+.5],[x-CW/2,0,zc+.5],[x-CW/2,0,zc-.5],sk);
      if(!solid(z,i+1))Q(TA,[x+CW/2,-TH,zc+.5],[x+CW/2,-TH,zc-.5],[x+CW/2,0,zc-.5],[x+CW/2,0,zc+.5],sk);
      if(!solid(z-1,i))Q(TA,[x-CW/2,-TH,zc+.5],[x+CW/2,-TH,zc+.5],[x+CW/2,0,zc+.5],[x-CW/2,0,zc+.5],sk);
      if(!solid(z+1,i))Q(TA,[x+CW/2,-TH,zc-.5],[x-CW/2,-TH,zc-.5],[x-CW/2,0,zc-.5],[x+CW/2,0,zc-.5],sk);
      /* ARISTAS DE LUZ en cada lado sin vecina: contornea la pista y CADA
         agujero. Es lo que hace legible el camino a 60 m. */
      if(!solid(z,i-1)){plate(GA,x-CW/2+E/2,zc,E,1,.012,rl);
        /* la ALETA vertical va sólo en el borde de la pista (i=0 / i=4): puesta
           también en los bordes de los agujeros parecían paredes y tapaban el
           camino de más adelante */
        if(i===0)bq(GA,x-CW/2+.03,0,zc,.06,.19,1,rl,rl);}
      if(!solid(z,i+1)){plate(GA,x+CW/2-E/2,zc,E,1,.012,rl);
        if(i===LANES-1)bq(GA,x+CW/2-.03,0,zc,.06,.19,1,rl,rl);}
      if(!solid(z-1,i))plate(GA,x,zc+.5-E/2,CW,E,.012,rl);
      if(!solid(z+1,i))plate(GA,x,zc-.5+E/2,CW,E,.012,rl);
      /* travesaño cada 4 m: da ritmo y escala de distancia */
      if(z%4===0)plate(GA,x,zc,CW*.98,.09,.008,br);
    }
  }
  /* PORTALES de la zona (niveles 3+): marco de luz cruzando la pista cada
     P.ring metros. Van FUSIONADOS: cuestan 30 triángulos y cero llamadas. */
  if(P.ring){
    const rg=C(PAL.ring),W=CW*LANES+.5;
    for(let z=P.ring;z<LEN-4;z+=P.ring){
      if(Math.abs(z-CPZ)<3)continue;
      for(const s of [-1,1])bq(GA,s*(W/2),0,-z,.16,2.6,.16,rg,rg);
      bq(GA,0,2.6,-z,W,.16,.16,rg,rg);
    }
  }
  /* RAMPAS DE IMPULSO: tres galones verdes en la baldosa y dos marcas al costado */
  for(const b of boosts){
    plate(GA,b.x,-b.z,CW*.9,.94,.013,C(mixc(PAL.boost,'#000000',.6)));
    for(let k=0;k<3;k++){
      plate(GA,b.x,-b.z+.3-k*.3,CW*.66,.11,.019,bo);
      plate(GA,b.x-CW*.24,-b.z+.36-k*.3,.1,.2,.019,bo);
      plate(GA,b.x+CW*.24,-b.z+.36-k*.3,.1,.2,.019,bo);
    }
  }
  /* muros, compuertas y avisos */
  for(const o of obs){
    if(o.t==='wall'){
      bq(TA,o.x,0,-o.z,CW*.92,.82,.34,C(PAL.wallTop),C(PAL.wall));
      plate(GA,o.x,-o.z,CW*.9,.3,.83,C(PAL.wallTop));
    }
    if(o.t==='puls'){
      /* marco de la compuerta: dos postes que quedan SIEMPRE, así se ve que ahí
         hay una compuerta aunque en ese momento esté abierta */
      for(const s of [-1,1])bq(GA,o.x+s*CW*.47,0,-o.z,.1,1.15,.24,C(PAL.rail),C(PAL.rail));
      bq(GA,o.x,1.15,-o.z,CW*.94+.1,.1,.24,C(PAL.rail),C(PAL.rail));
    }
    /* sombra en el piso debajo del peligro */
    if(solid(o.z,o.i))plate(GA,o.x,-o.z,CW*.86,.86,.016,sh);
    /* PISTA DE AVISO: dos baldosas antes del peligro, oscuras con galones magenta.
       Con una sola (2 m) a 11,3 m/s el aviso duraba 0,18 s: no es un aviso, es un
       adorno. Con dos son 0,35 s de alfombra roja además de ver el bicho de lejos. */
    for(const dz of [2,3]){
      const zw=o.z-dz;
      if(!solid(zw,o.i))continue;
      plate(GA,o.x,-zw,CW*.9,.94,.014,C(PAL.dangerD));
      plate(GA,o.x,-zw+.24,CW*.62,.13,.018,dg);
      plate(GA,o.x,-zw-.06,CW*.62,.13,.018,dg);
    }
  }
  /* franja del arco de control y de la meta */
  const cb=A0(),cbOn=A0();
  const wAll=CW*LANES;
  plate(cb,0,-CPZ,wAll,.55,.02,C(PAL.cp));
  plate(cbOn,0,-CPZ,wAll,.55,.022,C(PAL.cpOn));
  for(let k=0;k<10;k++){                       /* cuadros de la meta */
    plate(cb,-wAll/2+wAll*(k+.5)/10,-LEN,wAll/10,.7,.02,k&1?C('#ffffff'):C('#12222c'));
    plate(cbOn,-wAll/2+wAll*(k+.5)/10,-LEN,wAll/10,.702,.02,k&1?C('#ffffff'):C('#12222c'));
  }
  tilesM=meshOf(TA,true);trackG.add(tilesM);
  glowM=meshOf(GA,true);trackG.add(glowM);
  cpBand=meshOf(cb,false);trackG.add(cpBand);
  cpBandOn=meshOf(cbOn,false);cpBandOn.visible=false;trackG.add(cpBandOn);
}
function buildProps(){
  if(propM){trackG.remove(propM);propM.geometry.dispose();propM=null;}
  const A=A0(),cp=C(PAL.prop),ct=C(PAL.propTop);
  const R=rng(9001+lvl*31);
  const step=Math.max(5,Math.round(10/Math.max(.3,decoK)));
  /* LEJOS: con las columnas a 2,2 unidades del borde parecían edificios encima de
     la pista y le robaban el ojo al camino. Ahora arrancan a 4,5 y son oscuras:
     dan paralaje y sensación de velocidad, nada más. */
  for(let z=-6;z<LEN+20;z+=step){
    for(const s of [-1,1]){
      if(R()<.3)continue;
      const x=s*(HALF+4.5+R()*14);
      const h=2+R()*15,w=1+R()*2.4,y=-1.6-R()*5;
      bq(A,x,y,-z-R()*3,w,h,w*(.7+R()*.8),ct,cp);
    }
  }
  propM=meshOf(A,true);trackG.add(propM);
}
function buildArches(){
  const W=CW*LANES+.9;
  const mk=(fin)=>{
    let g=ARCGLB?glbArch('arco',W,3.3):null;
    if(g)return g;
    /* geometría de respaldo: dos pilares y un dintel */
    g=new T3.Group();
    const cc=fin?PAL.rail:PAL.cp;
    for(const s of [-1,1]){
      const p=new T3.Mesh(box(.42,2.5,.42),mat(PAL.fin,1));
      p.position.set(s*(W/2-.2),1.25,0);g.add(p);
      const e=new T3.Mesh(box(.48,.16,.48),mat(cc,1));
      e.position.set(s*(W/2-.2),2.5,0);g.add(e);
      const f=new T3.Mesh(box(.07,2.4,.5),mat(cc,1));
      f.position.set(s*(W/2-.2)+s*.24,1.25,0);g.add(f);
    }
    const b=new T3.Mesh(box(W,.42,.42),mat(PAL.fin,1));
    b.position.set(0,2.7,0);g.add(b);
    const b2=new T3.Mesh(box(W,.1,.5),mat(cc,1));
    b2.position.set(0,2.48,0);g.add(b2);
    return g;
  };
  cpArch=mk(false);cpArch.position.z=-CPZ;trackG.add(cpArch);
  finArch=mk(true);finArch.position.z=-LEN;trackG.add(finArch);
}
/* ------------------------------------------------------------------- física */
function cellAt(x,z){
  const zi=Math.round(z);
  if(zi<0||zi>=cells.length)return 0;
  const i=Math.round(x/CW+(LANES-1)/2);
  if(i<0||i>=LANES)return 0;
  return cells[zi][i];
}
function sawX(o,t){return o.amp?o.x+Math.sin(t*o.sp+o.ph)*o.amp:o.x;}
/* altura de la compuerta en el instante t: 1 = cerrada, 0 = abierta. Con D=.42 y
   la transición de 0,09 la compuerta MATA el 43% del ciclo y deja pasar el 57%:
   con medio y medio (D=.5) el hueco quedaba más corto que el peligro y se sentía
   una moneda al aire. La ventana abierta a 11,3 m/s son 1,0 s de paso. */
function pulsH(o,t){
  const p=((t+o.ph)%o.per)/o.per,e=.09,D=.42;
  if(p<D-e)return 1;
  if(p<D+e)return (D+e-p)/(2*e);
  if(p<1-e)return 0;
  return (p-(1-e))/e;
}
function die(kind){
  if(dead||won)return;
  dead=1;dieK=kind;fallV=0;
  lastDie=kind+'@'+bz.toFixed(1)+' x='+bx.toFixed(2);
  if(DEMO){demoRe=.8;return;}               /* en el menú no se muere: reaparece */
  ARC.sfx(kind==='fall'?'lose':(kind==='gate'?'gate':'boom'));
  ARC.shake(kind==='fall'?7:13);
  ARC.fx.burst(ARC.W/2,ARC.H*.62,{n:22,color:PAL.danger,speed:260,size:5,life:.6});
  if(kind!=='fall')ARC.vib(70);
  setTimeout(()=>{
    if(!dead||DEMO)return;
    if(cpOn&&!cpUsed){
      cpUsed=1;bz=CPZ;bx=tx=lx(pathL[CPZ]);dead=0;warm=0;fallV=0;boostT=0;
      ball.position.set(bx,BR,-bz);
      ARC.toast(T('cpBack'));ARC.sfx('power');
      return;
    }
    finishLose(kind);
  },700);
}
/* ------------------------------------------------------------------ remates */
function bank(){                            /* los diamantes juntados van a la caja */
  if(!gemN)return;
  ARC.S.gems=(ARC.S.gems||0)+gemN;
  if(!ARC.S.gemLv)ARC.S.gemLv={};
  const k=String(lvl);
  if((ARC.S.gemLv[k]||0)<gemN)ARC.S.gemLv[k]=gemN;
  ARC.save();
}
function medRow(mask,got){                  /* fila de medallas en HTML */
  return MEDS.map(m=>'<span style="opacity:'+((mask&m.bit)?1:.22)+
    ';color:'+((got&m.bit)?PAL.cpOn:'#eef2f6')+'">'+m.ic+'</span>').join(' ');
}
function finishLose(kind){
  bank();
  const pc=Math.round(bz/LEN*100);
  const casi=pc>=80;
  const bt=bestT(lvl);
  ARC.over({win:false,score:Math.round(bz),stars:0,
    title:kind==='fall'?T('dFall'):(kind==='saw'?T('dSaw'):(kind==='gate'?T('dGate'):T('dHit'))),
    coins:gemN,
    sub:(casi?'<b style="color:'+PAL.danger+'">'+T('almost')+' '+pc+'%</b><br>':'')+
      T('statMet')+': <b>'+Math.round(bz)+'</b>/'+LEN+' &nbsp;·&nbsp; '+
      T('statGems')+': <b>'+gemN+'</b>/'+gemT+' ◆'+
      (bt?('<br><span style="opacity:.75">'+T('statBest')+': '+fmtT(bt)+' &nbsp;·&nbsp; '+
        T('parT')+' '+fmtT(PAR)+'</span>'):
        ('<br><span style="opacity:.75">'+T('parT')+' '+fmtT(PAR)+'</span>'))+
      '<br><span style="opacity:.75">'+zoneName(lvl)+' '+medRow(medOf(lvl),0)+'</span>'});
}
function finishWin(){
  const tm=runT;
  bank();
  let st=gemT?(gemN>=gemT*.85?3:(gemN>=gemT*.55?2:1)):3;
  if(cpUsed)st=Math.min(st,2);
  /* MEDALLAS: limpia (sin usar el arco), todos los diamantes, bajo el par */
  let mask=0;
  if(!cpUsed)mask|=1;
  if(gemT&&gemN>=gemT)mask|=2;
  if(tm<=PAR)mask|=4;
  const got=medAdd(lvl,mask);
  const rec=setBestT(lvl,tm);
  ARC.save();
  if(got)ARC.toast(T(got===7?'allMed':'medNew'),1500);
  const bt=bestT(lvl);
  ARC.over({win:true,score:Math.round(LEN),stars:st,
    coins:gemN+10+(got?8*MEDS.filter(m=>got&m.bit).length:0),
    sub:'<b>'+T('statTime')+' '+fmtT(tm)+'</b>'+
      (rec?' <b style="color:'+PAL.cpOn+'">'+T('newTime')+'</b>':
        ' <span style="opacity:.75">('+T('statBest')+' '+fmtT(bt)+')</span>')+
      '<br>'+T('statGems')+': <b>'+gemN+'</b>/'+gemT+' ◆ &nbsp;·&nbsp; '+
      T('parT')+' '+fmtT(PAR)+
      '<br><span style="font-size:1.5em;letter-spacing:.25em">'+medRow(medOf(lvl),got)+'</span>'+
      (cpUsed?'<br><span style="opacity:.7">'+T('usedCp')+'</span>':'')});
}
/* ------------------------------------------------------------------ entrada */
const laneOf=x=>clamp(Math.round(x/CW+(LANES-1)/2),0,LANES-1);
function nudge(d){botOn=0;tx=clamp(lx(clamp(laneOf(tx)+d,0,LANES-1)),-HALF,HALF);}
G.down=function(p){drag={x:p.x,tx};botOn=0;};
G.move=function(p){
  if(!drag)return;
  /* media pantalla de recorrido = todo el ancho de la pista */
  tx=clamp(drag.tx+(p.x-drag.x)*(HALF*2/(ARC.W*.5)),-HALF,HALF);
};
G.up=function(){drag=null;};
G.key=function(c,d){
  if(!d)return;
  if(c==='ArrowLeft'||c==='KeyA')nudge(-1);
  if(c==='ArrowRight'||c==='KeyD')nudge(1);
};
/* -------------------------------------------------------------------- ciclo */
/* EL MOTOR CREA EL RENDERER CON antialias:true Y EN SWIFTSHADER ESO CUESTA
   CUADROS (medido en este juego, nivel 8, todo lo demás igual: 20,6 fps con MSAA
   contra 31,2 sin MSAA). El shell no expone la opción, así que acá se cambia el
   lienzo por uno nuevo y se rehace el renderer sin MSAA. Todo lo que el shell
   toca (ARC.rnd, el lienzo con id "gl") sigue en su lugar.
   -> PEDIDO AL MOTOR: GAME.aa=false para no tener que hacer esto. */
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
    applyRes();
    return true;
  }catch(e){console.warn('gl',e);return false;}
}
/* RESOLUCIÓN ADAPTATIVA. El tope lo sigue poniendo ARC.gfxP().dpr (los Gráficos
   que eligió el jugador); esto sólo BAJA de ahí si la máquina no llega, y vuelve
   a subir cuando sobra. En un celular se queda en el tope. */
let resK=1,resT=0,runFps=0;
function applyRes(){
  if(!ARC.rnd)return;
  const p=ARC.gfxP();
  ARC.rnd.setPixelRatio(Math.min(window.devicePixelRatio||1,p.dpr)*resK);
  ARC.rnd.setSize(ARC.W,ARC.H,false);
}
function autoRes(dt){
  if(DEMO){runFps=0;return;}
  runFps+=dt;
  if(runFps<2.5)return;      /* ARC.fps viene arrastrado del menú los primeros 2,5 s */
  const f=ARC.fps;
  if(f<44){resT+=dt;if(resT>1.5&&resK>.7){resK=Math.max(.7,resK-.1);applyRes();resT=0;}}
  else if(f>56){resT-=dt;if(resT<-3&&resK<1){resK=Math.min(1,resK+.1);applyRes();resT=0;}}
  else resT*=.92;
}
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  const p=ARC.gfxP?ARC.gfxP():{part:1,fog:1,sh:1};
  partK=p.part;fogK=p.fog;decoK=clamp(p.part,.4,1.35);
  fastGL();
  cssFix();
  setTheme(1);
  scene=new T3.Scene();
  scene.background=new T3.Color(PAL.sky);
  scene.fog=new T3.Fog(new T3.Color(PAL.fog).getHex(),46*fogK,132*fogK);
  cam=new T3.PerspectiveCamera(52,ARC.W/Math.max(1,ARC.H),.1,320);
  scene.add(new T3.HemisphereLight(0xd8f6ff,0x123043,1.35));
  const d=new T3.DirectionalLight(0xffffff,.85);d.position.set(3,9,6);scene.add(d);
  trackG=new T3.Group();scene.add(trackG);
  dynG=new T3.Group();scene.add(dynG);
  ball=new T3.Mesh(new T3.SphereGeometry(BR,20,14),
    new T3.MeshLambertMaterial({color:new T3.Color('#ffc95c'),emissive:new T3.Color('#5a3200')}));
  scene.add(ball);
  ballGlow=new T3.Mesh(new T3.SphereGeometry(BR*1.5,16,10),
    new T3.MeshBasicMaterial({color:new T3.Color('#ffd98a'),transparent:true,opacity:.16,fog:false}));
  ball.add(ballGlow);
  ballSh=new T3.Mesh(new T3.CircleGeometry(BR*1.15,18),
    new T3.MeshBasicMaterial({color:new T3.Color('#7ef0ff'),transparent:true,opacity:.42,fog:false}));
  ballSh.rotation.x=-Math.PI/2;scene.add(ballSh);
  applyBall();
  const S0=ARC.glb&&ARC.glb.sierra,A1=ARC.glb&&ARC.glb.arco;
  SAWGLB=!!(S0&&S0.scene);ARCGLB=!!(A1&&A1.scene);
  /* la ficha de monedas del motor es la de DIAMANTES en este juego */
  const ci=document.querySelector('#menu .mTop .badge i');
  if(ci)ci.textContent='◆';
};
function applyBall(){
  const B=curBall();
  if(!ball)return;
  ball.material.color.set(B.c);
  if(ball.material.emissive)ball.material.emissive.set(B.e);
  ballGlow.material.color.set(B.g);
  ballSh.material.color.set(B.sh);
}
G.resize=function(){
  if(cam){cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();}
  applyRes();cssFix();
  if(panelEl&&panelEl.classList.contains('on'))panelFill();
};
G.gfxApply=function(p){
  const wasGlb=partK>=.7;
  partK=p.part;fogK=p.fog;decoK=clamp(p.part,.4,1.35);
  resK=1;resT=0;applyRes();
  if(scene&&scene.fog){scene.fog.near=46*fogK;scene.fog.far=132*fogK;}
  if(trackG&&cells.length){buildProps();if(wasGlb!==(partK>=.7))buildDyn();}
};
function sawGlb(){
  /* el GLB de la sierra trae 28,7 k triángulos y el motor lo simplifica al
     cargarlo hasta GAME.glbTris (medido: 552). Aun así el modelo se usa SÓLO en
     las cercanas (ver LODZ) y sólo en gráficos Alto/Ultra. */
  if(SAWGLB&&partK>=.7)return glbNode('sierra',1.12);
  return null;
}
/* sierra de geometría en UNA malla fusionada: antes era un grupo de 13 mallas y
   con 12 sierras en pantalla el cuadro se iba a 180 llamadas de dibujo (medido
   con renderer.info: 189). Fusionada son 12 llamadas. */
function sawGeo(){
  if(GEO.saw)return GEO.saw;
  const A=A0(),N=12,R0=.44,TZ=.07;
  const dk=C('#16303f'),lt=C('#24586f'),dg=C('#ff2d78'),hb=C('#7ef0ff');
  for(let k=0;k<N;k++){
    const a0=k/N*TAU,a1=(k+1)/N*TAU;
    const p0=[Math.cos(a0)*R0,Math.sin(a0)*R0],p1=[Math.cos(a1)*R0,Math.sin(a1)*R0];
    TRI(A,[0,0,TZ],[p0[0],p0[1],TZ],[p1[0],p1[1],TZ],(k&1)?dk:lt);      /* cara +Z */
    TRI(A,[0,0,-TZ],[p1[0],p1[1],-TZ],[p0[0],p0[1],-TZ],(k&1)?dk:lt);   /* cara −Z */
    Q(A,[p0[0],p0[1],-TZ],[p1[0],p1[1],-TZ],[p1[0],p1[1],TZ],[p0[0],p0[1],TZ],dk);
    /* diente: dos caras enfrentadas (es finito, así se ve de los dos lados) */
    const am=(a0+a1)/2,tp=[Math.cos(am)*(R0+.19),Math.sin(am)*(R0+.19)];
    TRI(A,[p0[0],p0[1],0],[p1[0],p1[1],0],[tp[0],tp[1],0],dg);
    TRI(A,[p1[0],p1[1],0],[p0[0],p0[1],0],[tp[0],tp[1],0],dg);
  }
  for(let k=0;k<N;k++){                       /* cubo brillante */
    const a0=k/N*TAU,a1=(k+1)/N*TAU,r=.15;
    TRI(A,[0,0,TZ+.01],[Math.cos(a0)*r,Math.sin(a0)*r,TZ+.01],[Math.cos(a1)*r,Math.sin(a1)*r,TZ+.01],hb);
    TRI(A,[0,0,-TZ-.01],[Math.cos(a1)*r,Math.sin(a1)*r,-TZ-.01],[Math.cos(a0)*r,Math.sin(a0)*r,-TZ-.01],hb);
  }
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(A.p,3));
  g.setAttribute('color',new T3.Float32BufferAttribute(A.c,3));
  g.computeBoundingSphere();
  return GEO.saw=g;
}
function sawMesh(){
  if(!MAT._saw)MAT._saw=new T3.MeshBasicMaterial({vertexColors:true,side:T3.FrontSide});
  return new T3.Mesh(sawGeo(),MAT._saw);
}
/* la hoja de la compuerta: caja apoyada en el piso (la geometría se corre media
   altura para arriba, así scale.y la hace crecer desde la baldosa) */
function gateGeo(){
  if(GEO.gate)return GEO.gate;
  const g=new T3.BoxGeometry(CW*.9,1.1,.2);
  g.translate(0,.55,0);
  return GEO.gate=g;
}
/* sierras, compuertas y diamantes: mallas propias porque giran o se mueven. Se
   rearman también cuando cambian los gráficos (la sierra pasa de modelo a
   geometría). */
function buildDyn(){
  clearG(dynG);sawG=[];gemG=[];
  for(const o of obs){
    if(o.t==='saw'){
      const m=sawMesh();
      m.position.set(o.x,.62,-o.z);
      dynG.add(m);o.m=m;
      const gl=sawGlb();
      if(gl){gl.position.set(o.x,.62,-o.z);gl.visible=false;dynG.add(gl);o.mg=gl;}
      else o.mg=null;
      sawG.push(o);
    }else if(o.t==='puls'){
      const m=new T3.Mesh(gateGeo(),mat(PAL.danger,1));
      m.position.set(o.x,0,-o.z);m.visible=false;
      dynG.add(m);o.m=m;o.mg=null;
      sawG.push(o);                       /* misma lista: culling y animación */
    }
  }
  const gg=octa(.30);
  for(const gm of gems){
    const m=new T3.Mesh(gg,mat(PAL.gem,1));
    m.position.set(gm.x,.62,-gm.z);
    m.visible=!gm.got;
    dynG.add(m);gm.m=m;gemG.push(m);
  }
}
function startLevel(l,demo){
  lvl=clamp(l||1,1,8);
  buildTrack(lvl);
  scene.background.set(PAL.sky);
  if(ARC.rnd)ARC.rnd.setClearColor(new T3.Color(PAL.sky),1);
  if(scene.fog){scene.fog.color.set(PAL.fog);scene.fog.near=46*fogK;scene.fog.far=132*fogK;}
  bx=tx=lx(pathL[0]);bz=0;vz=0;dead=0;won=false;gemN=0;cpOn=0;cpUsed=0;
  warm=0;fallV=0;tilt=0;drag=null;botOn=0;sawSnd=0;recTold=false;lastDie='';
  runT=0;boostT=0;boostN=0;demoRe=0;resK=1;resT=0;runFps=0;
  pbx=bx;pbz=0;
  cpBand.visible=true;cpBandOn.visible=false;
  applyBall();applyRes();
  ball.position.set(bx,BR,0);ball.rotation.set(0,0,0);ball.scale.setScalar(1);
  buildDyn();
  if(!demo){hudM=-1;hud();}
}
G.start=function(l){
  if(!T3)return;
  DEMO=0;demoOn=0;
  cssFix();
  startLevel(l,false);
  ARC.tray([
    {id:'lf',txt:'◀',gh:1,fn:()=>nudge(-1)},
    {id:'rt',txt:'▶',gh:1,fn:()=>nudge(1)}
  ]);
};
function hud(){
  const bt=bestT(lvl);
  ARC.hud(Math.round(bz),'<b>'+T('level')+' '+lvl+'</b> · '+zoneName(lvl)+' · '+
    Math.round(bz)+'/'+LEN+' m · '+fmtT(runT)+(bt?' <span style="opacity:.6">★'+fmtT(bt)+'</span>':''));
}
G.i18nDone=function(){
  if(ARC.scr==='game'&&cells.length)hud();
  if(panelEl&&panelEl.classList.contains('on'))panelFill();
};
/* ------------------------------------------------------------- simulación */
function sim(dt){
  if(!T3||won)return;
  pbx=bx;pbz=bz;
  autoRes(dt);
  /* la sierra gira y barre siempre (también en la caída, queda más vivo).
     CULLING: lo que está a más de 90 m no se dibuja (con 50 sierras y 90
     diamantes eran 140 llamadas de dibujo por cuadro para cosas que están
     detrás de la bruma) */
  const t=ARC.t;
  for(const o of sawG){
    const d=o.z-bz;
    const vis=d>-4&&d<90;
    if(o.t==='puls'){
      const h=pulsH(o,t);
      o.m.visible=vis&&h>.02;
      if(o.m.visible)o.m.scale.y=Math.max(.02,h);
      continue;
    }
    const near=vis&&!!o.mg&&d<LODZ;
    o.m.visible=vis&&!near;
    if(o.mg)o.mg.visible=near;
    if(!vis)continue;
    const rt=-dt*11,mm=near?o.mg:o.m;
    mm.rotation.z+=rt;
    if(o.amp){const sx=sawX(o,t);o.m.position.x=sx;if(o.mg)o.mg.position.x=sx;}
  }
  for(const gm of gems){
    if(gm.got)continue;
    const d=gm.z-bz;
    gm.m.visible=d>-3&&d<70;
    if(gm.m.visible)gm.m.rotation.y+=dt*2.6;
  }
  /* los arcos no llevan niebla (para verlos venir), así que se apagan a 150 m:
     si no, en el nivel 8 el arco de la meta flotaba solo en el vacío desde el
     metro 0, con la pista ya borrada por la bruma */
  if(cpArch)cpArch.visible=(CPZ-bz)<ARCHZ&&(CPZ-bz)>-6;
  if(finArch)finArch.visible=(LEN-bz)<ARCHZ;
  if(dead){                                   /* caída con animación, no corte seco */
    if(dieK==='fall'){fallV+=26*dt;ball.position.y-=fallV*dt;bz+=vz*dt*.35;}
    ball.position.z=-bz;
    if(DEMO){                                 /* en el menú vuelve a la pista */
      demoRe-=dt;
      if(demoRe<=0)demoBack();
    }
    return;
  }
  if(botOn)botPlan();
  runT+=dt;
  /* rampa de arranque: 55% de la velocidad los primeros 2,6 s */
  warm=Math.min(1,warm+dt/2.6);
  if(boostT>0)boostT=Math.max(0,boostT-dt);
  vz=SPD*(.55+.45*warm)*(1+BOOSTK*(boostT/BOOSTT));
  bz+=vz*dt;
  /* movimiento lateral REAL (bx es la posición, tx el destino del dedo) */
  const dx=tx-bx,mx=LSP*dt;
  bx+=Math.abs(dx)<=mx?dx:(dx>0?mx:-mx);
  /* PISO con 12 cm de perdón: la pelota mide 84 cm, así que con el centro justo
     en el filo del agujero seguir apoyado es lo que se ve en pantalla (y con el
     centro pelado era una moneda al aire cada vez que se cruzaba un hueco) */
  if(!cellAt(bx,bz)&&!cellAt(bx-.12,bz)&&!cellAt(bx+.12,bz)){die('fall');return;}
  /* choques: sólo los 3 casilleros de alrededor (obsZ), no los 95 del nivel */
  const zi=Math.round(bz);
  for(let zz=zi-1;zz<=zi+1;zz++){
    for(const o of obsAt(zz)){
      if(Math.abs(o.z-bz)>.55)continue;
      if(o.t==='puls'){
        if(pulsH(o,t)>.42&&Math.abs(o.x-bx)<o.w+.26){die('gate');return;}
        continue;
      }
      if(Math.abs(sawX(o,t)-bx)<o.w+.26){die(o.t==='saw'?'saw':'hit');return;}
    }
  }
  /* zumbido de la sierra cercana */
  if(t-sawSnd>.5&&!DEMO){
    for(const o of sawG){
      if(o.t!=='saw')continue;
      const d=o.z-bz;
      if(d>0&&d<7&&Math.abs(sawX(o,t)-bx)<1.6){
        ARC.sfx('saw',{vol:.35,rate:1.1});sawSnd=t;break;
      }
    }
  }
  /* diamantes */
  for(const gm of gems){
    if(gm.got||Math.abs(gm.z-bz)>.7)continue;
    if(Math.abs(gm.x-bx)<.62){
      gm.got=1;gm.m.visible=false;gemN++;
      sfx('gem',{rate:1+Math.min(.5,gemN*.02)});
      if(!DEMO){
        ARC.fx.text(ARC.W/2,ARC.H*.44,'+1',{color:PAL.gem,size:Math.max(14,ARC.H*.05)});
        if(partK>.5)ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:6,color:PAL.gem,speed:150,size:3,life:.35});
        if(gemN===gemT&&gemT>3)ARC.toast(T('gemsAll'));
      }
    }
  }
  /* rampas de impulso */
  for(const b of boosts){
    if(Math.abs(b.z-bz)>.6)continue;
    if(Math.abs(b.x-bx)<.62&&boostT<BOOSTT*.6){
      boostT=BOOSTT;boostN++;
      sfx('power',{vol:.55,rate:1.25});
      if(!DEMO){
        ARC.shake(3);ARC.vib(14);
        ARC.fx.text(ARC.W/2,ARC.H*.5,T('boost'),{color:PAL.boost,size:Math.max(13,ARC.H*.045)});
        if(partK>.5)ARC.fx.burst(ARC.W/2,ARC.H*.62,{n:10,color:PAL.boost,speed:260,size:4,life:.4,a:-Math.PI/2});
      }
    }
  }
  /* arco de control */
  if(!cpOn&&bz>=CPZ){
    cpOn=1;cpBand.visible=false;cpBandOn.visible=true;
    if(!DEMO){
      ARC.toast(T('cpGot'));ARC.sfx('check');
      ARC.fx.ring(ARC.W/2,ARC.H*.5,{r:ARC.H*.5,color:PAL.cpOn,w:5,life:.5});
    }
  }
  if(!recTold&&!DEMO&&bz>(ARC.S.best||0)&&(ARC.S.best||0)>4&&lvl>1){recTold=true;ARC.toast(T('newRec'));}
  if(bz>=LEN){
    bz=LEN;
    if(DEMO){demoNext();return;}
    won=true;
    ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:34,color:PAL.rail,speed:300,size:6,life:.9});
    ARC.toast(T('goal'));
    setTimeout(finishWin,420);
    return;
  }
  if(!DEMO&&(Math.round(bz)!==hudM||(ARC.frame%12===0))){hudM=Math.round(bz);hud();}
  tilt=lerp(tilt,(tx-bx)*2.4,.16);
  ball.position.set(bx,BR,-bz);
  ball.rotation.x-=vz*dt*2.3;
  ball.rotation.z=-tilt*.5;
}
G.step=function(dt){sim(dt);};
/* ======================================================== MODO ATRACCIÓN
   El motor llama attract() en cada cuadro mientras el menú está abierto y le
   pone la clase .live al menú. Es la misma pista y el mismo piloto: la pelota
   corre sola, la cámara orbita despacio y nada mata ni suena ni se guarda. */
function demoLvl(){
  /* la zona que el jugador está por jugar (así el menú muestra SU nivel) */
  return clamp((ARC.S.done||0)+1,1,8);
}
function demoBack(){
  /* reaparece 7 m atrás, en el camino garantizado */
  const z=Math.max(0,Math.round(bz)-7);
  bz=z;bx=tx=lx(pathL[clamp(z,0,pathL.length-1)]);
  dead=0;fallV=0;boostT=0;warm=1;pbx=bx;pbz=bz;
  ball.position.set(bx,BR,-bz);
}
function demoNext(){
  const n=clamp(lvl%8+1,1,8);
  startLevel(n,true);
  warm=1;botOn=1;
}
G.attract=function(dt,g){
  if(!T3||!scene)return;
  if(!demoOn){DEMO=1;demoOn=1;startLevel(demoLvl(),true);warm=1;}
  DEMO=1;botOn=1;
  sim(dt);
  drawScene(1);
};
/* ------------------------------------------------------------------- dibujo
   Encuadre MEDIDO con dbg.ballScreen(): con la cámara vieja (y 2,5 · z 5,6 ·
   mirando 11,6 m adelante) el horizonte caía a media pantalla y la mitad de
   arriba era vacío negro. Con y 4,0 · z 6,8 · punto de mira 6,9 m delante de la
   pelota el horizonte queda al 21% y la pelota al ~72% del alto: se ve mucha
   más pista y la pelota no se mete debajo de la bandeja de botones. */
const CAMY=4.0,CAMZ=6.8,AIM=6.9;
function proj(x,y,z){
  const v=vec().set(x,y,z).project(cam);
  return{x:(v.x*.5+.5)*ARC.W,y:(-v.y*.5+.5)*ARC.H,z:v.z};
}
function drawScene(alpha){
  const a=clamp(alpha||0,0,1);
  const ibx=lerp(pbx,bx,a),ibz=lerp(pbz,bz,a);
  ball.position.x=ibx;ball.position.z=-ibz;
  if(DEMO){
    /* CÁMARA DEL MENÚ: orbita lento alrededor de la pelota y mira 14 m adelante,
       así la cinta de pista cruza el cuadro en diagonal y nunca queda medio
       cuadro de vacío (con la cámara de partida el horizonte cae al 21% y el
       menú tapaba justo la pista). */
    const w=ARC.t*.13;
    cam.position.set(ibx*.4+Math.sin(w)*7.2,4.4+Math.sin(w*1.6)*1.1,-ibz+9.4+Math.cos(w)*2.2);
    cam.lookAt(ibx*.25,.5,-ibz-13);
    cam.rotation.z=Math.sin(w*.9)*.03;
    ballSh.position.set(ibx,.03,-ibz);
    ballSh.visible=!dead;
    ARC.rnd.render(scene,cam);
    return;
  }
  /* golpe de campo visual con el impulso: 52° -> 58° */
  const bk=boostT/BOOSTT;
  const fov=52+6*bk;
  if(Math.abs(cam.fov-fov)>.05){cam.fov=fov;cam.updateProjectionMatrix();}
  cam.position.set(ibx*.42,CAMY+(dead&&dieK==='fall'?-.4:0),-ibz+CAMZ);
  cam.lookAt(ibx*.22,.15,-ibz-AIM);
  cam.rotation.z=tilt*.018;
  ballSh.position.set(ibx,.03,-ibz);
  ballSh.visible=!dead||dieK!=='fall';
  ARC.rnd.render(scene,cam);
}
G.draw=function(g,alpha){
  if(!ARC.rnd||!scene||!cells.length)return;
  /* interpolación: la simulación va a 60 Hz fijos y el celular dibuja a 30 o a
     120; sin esto la pelota tiembla en las pantallas rápidas */
  const a=clamp(alpha||0,0,1);
  const ibx=lerp(pbx,bx,a),bzz=lerp(pbz,bz,a);
  drawScene(a);
  /* --- capa 2D: barra, avisos, ayuda --- */
  const W=ARC.W,H=ARC.H;
  /* resplandor de la pelota con el color de la pelota elegida: es la manera
     barata de que las 6 pelotas se distingan de verdad en pantalla */
  const B=curBall();
  if(partK>.5&&!dead){
    const p=proj(ibx,BR,-bzz);
    if(p.z<1){
      const r=Math.max(12,H*(.075+.03*(boostT/BOOSTT)));
      const gr=g.createRadialGradient(p.x,p.y,1,p.x,p.y,r);
      gr.addColorStop(0,B.g+'66');gr.addColorStop(1,B.g+'00');
      g.fillStyle=gr;g.beginPath();g.arc(p.x,p.y,r,0,TAU);g.fill();
      if(B.sp&&(ARC.frame%9===0))ARC.fx.burst(p.x,p.y,{n:2,color:B.g,speed:70,size:2.2,life:.35,g:120});
    }
  }
  /* líneas de velocidad del impulso */
  if(boostT>0&&!dead){
    const k=boostT/BOOSTT;
    g.globalAlpha=.18+.42*k;g.strokeStyle=PAL.boost;g.lineWidth=Math.max(1,H*.006);
    for(let i=0;i<7;i++){
      const yy=H*(.24+i*.093),ln=W*.06*(.5+k);
      g.beginPath();g.moveTo(W*.06,yy);g.lineTo(W*.06+ln,yy);g.stroke();
      g.beginPath();g.moveTo(W*.94,yy);g.lineTo(W*.94-ln,yy);g.stroke();
    }
    g.globalAlpha=1;
  }
  /* galones de peligro proyectados: se ven venir de lejos */
  if(!dead&&!won){
    const pulse=.55+.45*Math.sin(ARC.t*7);
    const z0=Math.max(0,Math.ceil(bzz+3.5)),z1=Math.floor(bzz+27);
    for(let zz=z0;zz<=z1;zz++)for(const o of obsAt(zz)){
      const d=o.z-bzz;
      if(d<3.5||d>27)continue;
      const gate=o.t==='puls';
      const hh=gate?pulsH(o,ARC.t):1;
      if(gate&&hh<.15)continue;               /* abierta: no es peligro ahora */
      const p=proj(sawX(o,ARC.t),1.55,-o.z);
      if(p.z>1||p.x<-40||p.x>W+40)continue;
      const s=clamp(H*.035*(1-d/34),5,H*.05);
      const al=clamp((27-d)/16,.15,1)*(d<11?pulse:.72)*(gate?hh:1);
      g.globalAlpha=al;
      g.beginPath();
      g.moveTo(p.x,p.y+s);g.lineTo(p.x-s,p.y-s*.5);g.lineTo(p.x-s*.45,p.y-s*.5);
      g.lineTo(p.x,p.y+s*.25);g.lineTo(p.x+s*.45,p.y-s*.5);g.lineTo(p.x+s,p.y-s*.5);
      g.closePath();
      /* contorno oscuro: el galón magenta sobre la pista cian se perdía */
      g.lineWidth=Math.max(1.5,s*.22);g.strokeStyle='rgba(4,10,16,.85)';g.stroke();
      g.fillStyle=PAL.danger;g.fill();
      g.globalAlpha=1;
    }
    /* el arco de control avisa a 40 m */
    const dc=CPZ-bzz;
    if(!cpOn&&dc>0&&dc<44){
      const p=proj(0,3.3,-CPZ);
      if(p.z<1){
        g.globalAlpha=clamp((44-dc)/26,.2,.95);
        g.fillStyle=PAL.cp;g.textAlign='center';
        g.font='900 '+Math.max(10,H*.036)+'px system-ui,sans-serif';
        g.fillText('▼ '+Math.round(dc)+' m',p.x,p.y);
        g.globalAlpha=1;g.textAlign='left';
      }
    }
  }
  /* barra de avance arriba, con marca del arco y de la meta */
  const bw=W*.46,bxx=(W-bw)/2,byy=H*.115,bh=Math.max(4,H*.014);
  g.fillStyle='rgba(255,255,255,.13)';g.fillRect(bxx,byy,bw,bh);
  g.fillStyle=cpOn?PAL.cpOn:PAL.bar;g.fillRect(bxx,byy,bw*clamp(bzz/LEN,0,1),bh);
  g.fillStyle=cpOn?PAL.cpOn:PAL.cp;g.fillRect(bxx+bw*.5-1.5,byy-3,3,bh+6);
  g.fillStyle=PAL.rail;g.fillRect(bxx+bw-2,byy-3,3,bh+6);
  /* diamantes juntados y medallas del nivel */
  g.globalAlpha=.9;g.fillStyle=PAL.gem;
  g.font='900 '+Math.max(9,H*.03)+'px system-ui,sans-serif';g.textAlign='left';
  g.fillText('◆ '+gemN+'/'+gemT,bxx,byy-Math.max(5,H*.022));
  const md=medOf(lvl);
  g.textAlign='right';
  for(let i=0;i<3;i++){
    g.globalAlpha=(md&MEDS[i].bit)?.95:.28;
    g.fillStyle=(md&MEDS[i].bit)?PAL.cpOn:'#eef2f6';
    g.fillText(MEDS[i].ic,bxx+bw-(2-i)*Math.max(11,H*.038),byy-Math.max(5,H*.022));
  }
  g.globalAlpha=1;g.textAlign='left';
  /* ayuda al empezar */
  if(bzz<9&&!dead){
    g.globalAlpha=clamp((9-bzz)/4,0,1);
    g.fillStyle='rgba(255,255,255,.94)';g.textAlign='center';
    g.font='900 '+Math.max(12,H*.045)+'px system-ui,sans-serif';
    g.fillText(T('tutDrag'),W/2,H*.30);
    g.font='800 '+Math.max(9,H*.028)+'px system-ui,sans-serif';
    g.globalAlpha*=.75;g.fillText(T('tutSide'),W/2,H*.36);
    g.globalAlpha=1;g.textAlign='left';
  }
};
/* ================================================= PANEL: PELOTAS Y MEDALLAS
   Panel propio de DOM (no se toca el DOM del shell: se AGREGA uno). Se abre con
   el botón redondo del menú (GAME.extra). Pestaña 1: las 6 pelotas, que se
   pagan con diamantes. Pestaña 2: las 8 zonas con su mejor tiempo, sus
   diamantes y sus 3 medallas. */
let panelEl=null,panelTab=0;
function ballThumb(B){
  const cv=document.createElement('canvas');cv.width=120;cv.height=120;
  const g=cv.getContext('2d');
  let gr=g.createRadialGradient(60,60,2,60,60,58);
  gr.addColorStop(0,B.g+'88');gr.addColorStop(1,B.g+'00');
  g.fillStyle=gr;g.fillRect(0,0,120,120);
  gr=g.createRadialGradient(46,44,4,60,60,40);
  gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,B.c);gr.addColorStop(1,mixc(B.c,'#000000',.55));
  g.fillStyle=gr;g.beginPath();g.arc(60,60,38,0,Math.PI*2);g.fill();
  g.strokeStyle=B.g;g.lineWidth=2.5;g.stroke();
  return cv;
}
function panelBuild(){
  if(panelEl)return;
  const d=document.createElement('div');d.id='rdP';
  d.innerHTML='<div class="rdCard"><div class="rdTabs"><b id="rdT0"></b><b id="rdT1"></b></div>'+
    '<div class="rdBody" id="rdBody"></div>'+
    '<div class="rdFoot"><span id="rdC">◆ 0</span><div class="btn" id="rdX">CERRAR</div></div></div>';
  document.getElementById('stage').appendChild(d);
  panelEl=d;
  d.addEventListener('pointerdown',e=>{if(e.target===d){e.preventDefault();panelClose();}});
  const B2=(id,fn)=>{const e=document.getElementById(id);
    e.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();
      ARC.sndResume();ARC.sfx('click');fn();});};
  B2('rdT0',()=>{panelTab=0;panelFill();});
  B2('rdT1',()=>{panelTab=1;panelFill();});
  B2('rdX',()=>panelClose());
}
function panelFill(){
  if(!panelEl)return;
  const b=document.getElementById('rdBody');
  document.getElementById('rdT0').textContent=T('balls');
  document.getElementById('rdT1').textContent=T('medals');
  document.getElementById('rdT0').className=panelTab?'':'on';
  document.getElementById('rdT1').className=panelTab?'on':'';
  document.getElementById('rdX').textContent=T('close');
  document.getElementById('rdC').textContent='◆ '+(ARC.S.coins||0)+
    '   ('+(ARC.S.gems||0)+' '+T('gemsTot')+')';
  b.innerHTML='';b.className='rdBody'+(panelTab?' q':'');
  if(panelTab===0){
    const cur=curBall().id;
    BALLS.forEach((B,i)=>{
      const own=hasB(B.id),on=own&&B.id===cur;
      const el=document.createElement('div');
      el.className='rd1'+(on?' on':'')+(own?'':' lk');
      el.appendChild(ballThumb(B));
      const nm=document.createElement('i');nm.textContent=T(B.k);el.appendChild(nm);
      const u=document.createElement('u');
      u.textContent=on?T('inUse'):(own?T('use'):(B.cost+' ◆'));
      el.appendChild(u);
      el.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();
        ARC.sndResume();
        if(own){ARC.sfx('click');chooseBall(i);}
        else if((ARC.S.coins||0)>=B.cost){
          ARC.S.coins-=B.cost;
          ownedB().push(B.id);ARC.save();
          ARC.sfx('power');ARC.toast(T('bought')+' '+T(B.k),1500);
          ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:Math.round(20*partK),color:B.g,speed:230});
          chooseBall(i);
        }else{ARC.sfx('lose',{vol:.5});ARC.toast(T('locked'),1300);}
        panelFill();});
      b.appendChild(el);
    });
  }else{
    for(let n=1;n<=8;n++){
      const lock=n>(ARC.S.done||0)+1;
      const md=medOf(n),bt=bestT(n),gl=(ARC.S.gemLv||{})[String(n)]||0;
      const el=document.createElement('div');
      el.className='rdQ'+(md===7?' dn':'')+(lock?' lk':'');
      el.innerHTML='<b>'+T('level')+' '+n+' · '+zoneName(n)+'</b>'+
        '<span>'+(lock?T('lock'):
          ('⏱ '+(bt?fmtT(bt):'—')+' <em>'+T('parT')+' '+fmtT(parOf(n))+'</em>'+
           ' &nbsp;·&nbsp; ◆ '+gl))+'</span>'+
        '<div class="rdM">'+MEDS.map(m=>'<u class="'+((md&m.bit)?'on':'')+'" title="'+T(m.k)+'">'+
          m.ic+'</u>').join('')+'</div>';
      b.appendChild(el);
    }
  }
}
function panelOpen(t){
  panelBuild();panelTab=t||0;panelFill();
  panelEl.classList.add('on');
}
function panelClose(){if(panelEl)panelEl.classList.remove('on');}
function chooseBall(i){
  ARC.S.ball=BALLS[i].id;ARC.save();
  applyBall();
  if(!DEMO)ARC.sfx('power',{vol:.6});
  panelFill();
}
G.extra={icon:'◆',fn:()=>panelOpen(0)};
/* ------------------------------------------------------------------- CSS propio
   Dos cosas: (a) con MODO ATRACCIÓN el motor apaga el arte del menú (#menu.live)
   pero sigue escondiendo el título de DOM con .hasart — medido en captura: el
   menú quedaba SIN nombre de juego; (b) el panel de pelotas y medallas.
   Las medidas van contra el ESCENARIO (--sw/--sh), no contra la ventana: con el
   celular vertical el escenario está rotado y vmin/vw de la ventana viven en el
   eje cruzado. */
const CSSFIX=`
#menu.hasart.live .ttl{display:block}
#menu.live .sub{text-shadow:0 2px 8px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.8)}
#menu.live .ttl{text-shadow:0 3px 0 rgba(0,0,0,.5),0 10px 30px rgba(0,0,0,.85)}
#rdP{position:absolute;inset:0;z-index:7;display:none;align-items:center;justify-content:center;
  background:rgba(4,6,10,.82);pointer-events:auto;padding:calc(var(--smn)*.03)}
#rdP.on{display:flex;animation:fade .16s ease-out}
#rdP canvas{position:static;width:100%;height:auto;max-width:calc(var(--smn)*.17);display:block}
#rdP .rdCard{width:100%;max-width:calc(var(--sw)*.9);max-height:94%;display:flex;flex-direction:column;
  gap:calc(var(--smn)*.022);border-radius:18px;padding:calc(var(--smn)*.032);
  background:linear-gradient(180deg,rgba(18,26,34,.98),rgba(8,12,18,.98));
  border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 60px rgba(0,0,0,.7)}
#rdP .rdTabs{display:flex;gap:5px;background:rgba(255,255,255,.07);padding:4px;border-radius:12px}
#rdP .rdTabs b{flex:1;text-align:center;font-weight:900;padding:.55em 0;border-radius:9px;opacity:.55;
  font-size:clamp(10px,calc(var(--smn)*.05),17px)}
#rdP .rdTabs b.on{background:linear-gradient(180deg,var(--acc),var(--acc2));color:#10141a;opacity:1}
#rdP .rdBody{overflow-y:auto;display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:calc(var(--smn)*.02);align-content:start}
#rdP .rdBody.q{grid-template-columns:1fr;gap:calc(var(--smn)*.014)}
#rdP .rd1{display:flex;flex-direction:column;align-items:center;gap:.25em;padding:.45em .2em;
  border-radius:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
#rdP .rd1.on{border-color:var(--acc);background:rgba(34,211,238,.18)}
#rdP .rd1.lk canvas{filter:grayscale(.8) brightness(.72)}
#rdP .rd1 i{font-style:normal;font-weight:900;font-size:clamp(8px,calc(var(--smn)*.036),14px);
  letter-spacing:.4px;text-align:center}
#rdP .rd1 u{text-decoration:none;font-weight:900;font-size:clamp(8px,calc(var(--smn)*.034),13px);
  padding:.3em .6em;border-radius:8px;background:linear-gradient(180deg,var(--acc),var(--acc2));
  color:#10141a;white-space:nowrap}
#rdP .rd1.lk u{background:rgba(255,255,255,.14);color:#eef2f6}
#rdP .rdQ{display:flex;align-items:center;gap:.6em;padding:.45em .7em;border-radius:12px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
#rdP .rdQ.dn{border-color:#43e57a;background:rgba(67,229,122,.13)}
#rdP .rdQ.lk{opacity:.45}
#rdP .rdQ b{font-size:clamp(9px,calc(var(--smn)*.038),15px);font-weight:900;white-space:nowrap}
#rdP .rdQ span{flex:1;font-size:clamp(8px,calc(var(--smn)*.033),13px);opacity:.8;font-weight:800;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rdP .rdQ span em{font-style:normal;opacity:.55}
#rdP .rdM{display:flex;gap:.28em}
#rdP .rdM u{text-decoration:none;font-size:clamp(10px,calc(var(--smn)*.042),17px);opacity:.22}
#rdP .rdM u.on{opacity:1;color:#43e57a;text-shadow:0 0 8px rgba(67,229,122,.6)}
#rdP .rdFoot{display:flex;align-items:center;justify-content:space-between;gap:1em}
#rdP .rdFoot span{font-weight:900;font-size:clamp(10px,calc(var(--smn)*.042),18px);color:var(--acc)}
`;
function cssFix(){
  if(!document.getElementById('ruedaCss')){
    const st=document.createElement('style');st.id='ruedaCss';st.textContent=CSSFIX;
    document.head.appendChild(st);
  }
  const r=document.documentElement.style;
  r.setProperty('--sw',ARC.W+'px');
  r.setProperty('--sh',ARC.H+'px');
  r.setProperty('--smn',Math.min(ARC.W,ARC.H)+'px');
}
/* ---------------------------------------------------------------- el piloto */
/* Seguridad de un carril en una fila, con la sierra que se mueve y la compuerta
   PREDICHAS en el momento en que la pelota va a llegar (tres muestras: el
   barrido es rápido y la compuerta también). */
function okAt(i,z,tArr){
  if(i<0||i>=LANES)return false;
  if(!cells[z]||!cells[z][i])return false;
  const x=lx(i);
  for(let zz=z-1;zz<=z+1;zz++){
    for(const o of obsAt(zz)){
      if(Math.abs(o.z-z)>1.05)continue;
      if(o.t==='puls'){
        if(Math.abs(o.x-x)>=o.w+.62)continue;
        for(const dd of [-.14,0,.14])if(pulsH(o,ARC.t+tArr+dd)>.22)return false;
        continue;
      }
      if(!o.amp){if(Math.abs(o.x-x)<o.w+.62)return false;continue;}
      for(const dd of [-.12,0,.12]){
        if(Math.abs(sawX(o,ARC.t+tArr+dd)-x)<o.w+.62)return false;
      }
    }
  }
  return true;
}
/* PLANIFICADOR CON ADELANTO.
   Versión 1 (la que se cayó): programación dinámica que elegía el carril de la
   fila donde YA tenía que estar. Como cruzar un carril cuesta 0,12 s (1,35 m a
   11,3 m/s), el plan llegaba una fila y media tarde y el piloto moría raspando:
     hit@90,6 x=−1,25  (muro w1 en la fila 91: recién empezaba a salir del 1)
     fall@183,6 x=0,00 y fall@222,6 x=−2,50 (agujero en la fila de abajo).
   Versión 2: la DP guarda de dónde vino cada casillero, se RECONSTRUYE el camino
   completo y se apunta al primer carril donde el camino cambia, arrancando la
   maniobra hasta S+2 filas antes (S = filas que cuesta un carril). Antes de
   arrancar se comprueba que el carril de destino esté libre en toda la ventana
   del cruce: mover temprano no sirve si te comés el muro del vecino.
   Versión 3 (velocidad): okAt se llamaba hasta 240 veces por plan y cada llamada
   barría los 95 obstáculos del nivel; ahora los obstáculos están indexados por z
   y cada casillero se cachea en `memo`. Medido con el piloto encendido en el
   nivel 8: 20,6 -> 31,2 fps sólo por esto y por sacar el MSAA. */
function botPlan(){
  const z0=Math.round(bz),cur=laneOf(bx);
  const DEEP=16;
  const S=Math.max(1,Math.ceil(CW*Math.max(1,vz)/LSP));
  const tOf=d=>d/Math.max(1,vz);
  const memo=[];
  const OK=(i,d)=>{
    const row=memo[d]||(memo[d]=[]);
    const v=row[i];
    return v===undefined?(row[i]=okAt(i,z0+d,tOf(d))):v;
  };
  const L=[new Array(LANES).fill(null)];
  L[0][cur]={from:-1,g:0};                    /* la pelota ESTÁ acá, no hay opción */
  for(let d=1;d<=DEEP;d++){
    const prev=L[d-1],nx=new Array(LANES).fill(null);
    const can=(d%S)===0;                      /* sólo cada S filas se cambia */
    for(let i=0;i<LANES;i++){
      if(!OK(i,d))continue;
      const from=can?[i,i-1,i+1]:[i];
      for(const k of from){
        if(k<0||k>=LANES||!prev[k])continue;
        /* cruce seguro: los dos carriles libres en las dos filas */
        if(k!==i&&!(OK(i,d-1)&&OK(k,d)))continue;
        /* PUNTAJE: diamantes y rampas primero, y después PEGARSE A LA LÍNEA DE
           DISEÑO (pathL). Sin el segundo término el plan no tenía preferencia
           entre quedarse y acompañar la línea, la pelota se quedaba pegada al
           carril de antes y cuando la línea se corría llegaba dos filas tarde y
           se caía (medido: fall@65,6 x=1,25 con la fila 66 = 11100 y la línea ya
           en el 1). La línea es la garantía del generador: siempre está sólida y
           sin bichos. */
        const g=prev[k].g+(gemAt(z0+d,i)?6:0)+(boostAt(z0+d,i)?4:0)-Math.abs(i-guide(z0+d))*2.5;
        if(!nx[i]||g>nx[i].g)nx[i]={from:k,g};
      }
    }
    if(!nx.some(Boolean))break;
    L.push(nx);
  }
  const last=L.length-1;
  let bi=-1;
  for(let i=0;i<LANES;i++){
    const c=L[last][i];if(!c)continue;
    if(bi<0||c.g>L[last][bi].g||
      (c.g===L[last][bi].g&&Math.abs(i-cur)<Math.abs(bi-cur)))bi=i;
  }
  let want=cur;
  if(bi>=0&&last>=4){
    const path=new Array(last+1);path[last]=bi;
    for(let d=last;d>0;d--)path[d-1]=L[d][path[d]].from;
    let dc=-1;
    for(let d=1;d<=last;d++)if(path[d]!==cur){dc=d;break;}
    if(dc>0&&dc<=S+2&&canCross(path[dc],S,OK))want=path[dc];
  }else{
    /* PLAN CORTO (callejón sin salida a la vista): volver a la línea de diseño, y
       si el paso está tapado, el vecino que aguante más filas. Antes acá se
       quedaba quieto y se caía en el agujero que ya tenía debajo. */
    const gl=guide(z0+S);
    let bd=-1;
    if(gl!==cur){
      const st=cur<gl?cur+1:cur-1;
      if(canCross(st,S,OK))want=st;
    }
    if(want===cur)for(const i of [cur,cur-1,cur+1]){
      if(i<0||i>=LANES)continue;
      let d=0;while(d<8&&OK(i,d))d++;
      if(d>bd){bd=d;want=i;}
    }
  }
  tx=clamp(lx(want),-HALF,HALF);
  return true;
}
function gemAt(z,i){for(const gm of gems)if(!gm.got&&gm.z===z&&gm.i===i)return 1;return 0;}
function boostAt(z,i){for(const b of boosts)if(b.z===z&&b.i===i)return 1;return 0;}
function guide(z){return pathL[clamp(z,0,pathL.length-1)];}
/* ¿Se puede empezar a rodar al carril i AHORA? Tiene que estar libre en todas las
   filas del cruce y en la de llegada. MEDIDO: el respaldo miraba UNA sola fila y
   metía la pelota en un agujero que estaba dos filas más adelante — tres muertes
   idénticas, fall@152,3 x=1,63 (nivel 4, fila 152 = 11101), fall@220,3 x=0,37
   (nivel 5) y fall@225,5 x=1,63 (nivel 6). El desplazamiento siempre era el mismo
   (0,38 del centro del carril) porque es justo donde el perdón de 12 cm del piso
   deja de alcanzar: la pelota moría al salirse del borde de la baldosa vecina. */
function canCross(i,S,OK){
  if(i<0||i>=LANES)return false;
  for(let r=0;r<=S+1;r++)if(!OK(i,r))return false;
  return true;
}
G.dbg={
  state:()=>({bz:+bz.toFixed(1),LEN,lvl,zone:zoneName(lvl),gems:gemN,gemT,dead:!!dead,won,
    cp:cpOn,cpUsed,vz:+vz.toFixed(1),x:+bx.toFixed(2),bot:botOn,how:lastDie,demo:DEMO,
    t:+runT.toFixed(2),par:PAR,boostN,boosts:boosts.length,
    obs:obs.length,saws:obs.filter(o=>o.t==='saw').length,gates:obs.filter(o=>o.t==='puls').length,
    ball:curBall().id,res:+resK.toFixed(2),
    glb:{sierra:SAWGLB,arco:ARCGLB,
      tris:{sierra:SAWGLB?glbTris(ARC.glb.sierra.scene):0,arco:ARCGLB?glbTris(ARC.glb.arco.scene):0}},
    gfx:{part:partK,fog:fogK,fogN:scene&&scene.fog?+scene.fog.near.toFixed(0):0},
    saved:{coins:ARC.S.coins||0,gems:ARC.S.gems||0,lv:ARC.S.gemLv||{},med:ARC.S.med||{},
      tLv:ARC.S.tLv||{},balls:ownedB()}}),
  rows:(a,b)=>{const o=[];for(let z=a;z<=b;z++){
    const r=cells[z]?cells[z].join(''):'?';
    const ob=obsAt(z).map(x=>x.t[0]+x.i+(x.amp?'~':''));
    const gm=gems.filter(x=>x.z===z).map(x=>'d'+x.i);
    const bo=boosts.filter(x=>x.z===z).map(x=>'B'+x.i);
    o.push(z+':'+r+' p'+pathL[z]+(ob.length?' ('+ob.join(',')+')':'')+
      (gm.length?' '+gm.join(','):'')+(bo.length?' '+bo.join(','):''));}
    return o;},
  ballScreen:()=>{const p=proj(bx,BR,-bz);return{sx:+(p.x/ARC.W*100).toFixed(1),sy:+(p.y/ARC.H*100).toFixed(1)};},
  lv:()=>LV.map((p,i)=>({n:i+1,len:p.len,spd:p.spd,seg:+(p.len/p.spd).toFixed(1),par:parOf(i+1),
    zone:zoneName(i+1)})),
  /* para el informe: cuánto se dibuja de verdad */
  info:()=>ARC.rnd?{tris:ARC.rnd.info.render.triangles,calls:ARC.rnd.info.render.calls,
    fps:+ARC.fps.toFixed(1),res:+resK.toFixed(2)}:null,
  i18n:()=>{const ks=Object.keys(G.i18n.es),out={};
    for(const l of ['es','en','pt']){const f=ks.filter(k=>!G.i18n[l][k]);out[l]=f.length?('FALTAN '+f.join(',')):'ok';}
    return out;},
  panel:t=>{panelOpen(t||0);return true;},
  /* Enciende el piloto y planifica. La sonda lo llama cada 500 ms y en ese tiempo
     la pelota hace 4 m: si sólo se planificara acá, el plan llega tarde. Con
     botOn el paso fijo vuelve a planificar en cada cuadro de simulación. */
  autoMove:()=>{
    if(dead||won)return false;
    botOn=1;
    return botPlan();
  }
};
window.GAME=G;
