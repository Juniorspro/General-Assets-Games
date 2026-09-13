/* ============================================================================
   BABAS — recreación del tycoon de Roblox (FASE 1)
   ----------------------------------------------------------------------------
   Todo lo de acá sale de las 16 capturas del original (ver BABAS-SPEC.md):
   la placa con tachas, el dinero gigante en verde abajo a la izquierda con los
   `+$X` subiendo, la tabla de posiciones con Coche/Base/Dinero, la columna de
   botones ÍNDICE/TIENDA/INVENTARIO/COCHES/PINTAR, la olla con ABRIR y su suerte,
   y las 65 BABAS con su $/s exacto en ocho rarezas.

   QUÉ ENTRA EN ESTA FASE
   ----------------------
   · La BASE: doce parcelas; en cada una una baba que produce $/s. La suma es la
     columna "Base" de la tabla, igual que en el original.
   · Las 65 babas EXACTAS con su valor, y el ÍNDICE con las ocho pestañas y el
     contador "COMÚN | 5/6 FOUND | Total 49/65".
   · La OLLA: ABRIR tira una baba pesada por rareza y por SUERTE, con la
     revelación de rareza/nombre/$/s como en la captura.
   · INVENTARIO: poner y vender babas.
   · Tabla de posiciones con tres rivales que crecen solos.
   · Caminar con el dedo, avatar de bloques y carteles flotantes.

   LO QUE SE DECIDIÓ Y POR QUÉ
   ---------------------------
   · LA PLACA CON TACHAS es una TEXTURA, no geometría. Con tachas de verdad el
     piso serían decenas de miles de cilindros; horneada en un canvas de 128 y
     repetida da el mismo aspecto con UNA llamada de dibujo.
   · LAS CARAS Y LOS CARTELES de las babas van en la capa 2D (como los ojos de
     AGUJERO): cero llamadas de dibujo y se leen igual que en el original, que
     usa carteles de UI colgados del mundo.
   · LOS CUERPOS de las babas van en un InstancedMesh: doce parcelas propias más
     las de los rivales cuestan UNA llamada.
   · EL AVATAR es un R6 de Roblox: cabeza, torso, dos brazos y dos piernas, en
     seis InstancedMesh compartidos, así los cuatro jugadores cuestan 6 llamadas.
   ========================================================================== */
const G={
  slug:'babas',name:'BABAS',
  title:'<em>BABAS</em>',
  sub:'El tycoon de babas: llená la base, abrí ollas y subí la rampa.',
  subKey:'sub',
  acc:'#43e57a',acc2:'#12b45a',
  levels:0,bestLabel:'BASE',bestKey:'bestBase',
  three:true,sky:'#8fd3ff',shadows:false,
  glbTris:{_:900},
  art:A('art-babas.jpg'),music:A('mus-r04.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-coin.mp3'),
       win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),boom:A('sfx-boom.mp3'),
       power:A('sfx-power.mp3'),chime:A('sfx-chime.mp3'),pop:A('sfx-pop.mp3'),
       glass:A('sfx-glass.mp3')},
  i18n:{
    es:{sub:'El tycoon de <b>BABAS</b>: llená tu base de babas que producen por segundo, abrí ollas con la suerte a favor y completá el índice de 65.',
      money:'DINERO',evc:'Monedas de Evento',base:'Base',car:'Coche',
      lbName:'Nombre del jugador',lbMoney:'Dinero',you:'VOS',
      idx:'ÍNDICE',shop:'TIENDA',inv:'INVENTARIO',cars:'COCHES',paint:'PINTAR',
      open:'ABRIR',luck:'SUERTE',close:'CERRAR',found:'ENCONTRADO',notFound:'NO',
      total:'Total',foundN:'ENCONTRADAS',maxLvl:'MÁXIMO NIVEL',lvl:'Nivel',
      place:'PONER',sell:'VENDER',full:'La base está llena',empty:'No tenés babas sueltas',
      sold:'Vendida por',placed:'¡Baba puesta!',newFind:'¡NUEVA BABA!',
      slots:'Parcelas',perSec:'por segundo',emptyInv:'Abrí una olla para conseguir babas',
      rCommon:'COMÚN',rUncommon:'NO COMÚN',rRare:'RARO',rEpic:'ÉPICO',
      rLegend:'LEGENDARIO',rMythic:'MÍTICO',rSecret:'SECRETO',rDivine:'DIVINO',
      tip:'Arrastrá para caminar · tocá la OLLA para abrir',
      soon:'Llega en la próxima tanda'},
    en:{sub:'The <b>SLIME</b> tycoon: fill your base with slimes that earn per second, open pots with luck on your side and complete the 65-slime index.',
      money:'MONEY',evc:'Event Coins',base:'Base',car:'Car',
      lbName:'Player name',lbMoney:'Money',you:'YOU',
      idx:'INDEX',shop:'SHOP',inv:'INVENTORY',cars:'CARS',paint:'PAINT',
      open:'OPEN',luck:'LUCK',close:'CLOSE',found:'FOUND',notFound:'NO',
      total:'Total',foundN:'FOUND',maxLvl:'MAX LEVEL',lvl:'Level',
      place:'PLACE',sell:'SELL',full:'The base is full',empty:'No loose slimes',
      sold:'Sold for',placed:'Slime placed!',newFind:'NEW SLIME!',
      slots:'Plots',perSec:'per second',emptyInv:'Open a pot to get slimes',
      rCommon:'COMMON',rUncommon:'UNCOMMON',rRare:'RARE',rEpic:'EPIC',
      rLegend:'LEGENDARY',rMythic:'MYTHIC',rSecret:'SECRET',rDivine:'DIVINE',
      tip:'Drag to walk · tap the POT to open',
      soon:'Coming in the next batch'},
    pt:{sub:'O tycoon de <b>GOSMAS</b>: encha a base de gosmas que rendem por segundo, abra potes com sorte e complete o índice de 65.',
      money:'DINHEIRO',evc:'Moedas de Evento',base:'Base',car:'Carro',
      lbName:'Nome do jogador',lbMoney:'Dinheiro',you:'VOCÊ',
      idx:'ÍNDICE',shop:'LOJA',inv:'INVENTÁRIO',cars:'CARROS',paint:'PINTAR',
      open:'ABRIR',luck:'SORTE',close:'FECHAR',found:'ENCONTRADO',notFound:'NÃO',
      total:'Total',foundN:'ENCONTRADAS',maxLvl:'NÍVEL MÁXIMO',lvl:'Nível',
      place:'COLOCAR',sell:'VENDER',full:'A base está cheia',empty:'Sem gosmas soltas',
      sold:'Vendida por',placed:'Gosma colocada!',newFind:'GOSMA NOVA!',
      slots:'Parcelas',perSec:'por segundo',emptyInv:'Abra um pote para conseguir gosmas',
      rCommon:'COMUM',rUncommon:'INCOMUM',rRare:'RARO',rEpic:'ÉPICO',
      rLegend:'LENDÁRIO',rMythic:'MÍTICO',rSecret:'SECRETO',rDivine:'DIVINO',
      tip:'Arraste para andar · toque no POTE para abrir',
      soon:'Chega na próxima leva'}
  }
};
/* ===================== LAS 65 BABAS =====================
   Los valores son los LEÍDOS de las capturas del original, uno por uno. Cada
   rareza tiene su color de cartel (el mismo de las pestañas del índice) y su
   peso al abrir la olla (cuanto más raro, menos peso). */
const RAR=[
  {k:'rCommon'  ,col:'#c9c9d4',w:1000  ,g:['#e8d94a','#e8493f','#3f7ae8','#59b9f0','#3fc45c','#a44ce8']},
  {k:'rUncommon',col:'#43e57a',w:420   ,g:['#3fc45c','#f06fb0','#3f7ae8','#59b9f0','#e8493f','#e8d94a']},
  {k:'rRare'    ,col:'#4aa8ff',w:150   ,g:['#e8493f','#3f7ae8','#59b9f0','#e8d94a','#f06fb0','#3fc45c']},
  {k:'rEpic'    ,col:'#b06cff',w:48    ,g:['#3fc45c','#8b3fe8','#f06fb0','#3f7ae8','#e8493f','#e8d94a']},
  {k:'rLegend'  ,col:'#ffc23a',w:14    ,g:['#ffe94a','#ff4a3f','#6fd0ff','#4affa0','#ff7ad0','#ffffff']},
  {k:'rMythic'  ,col:'#ff4a4a',w:4     ,g:['#ffe94a','#ff4a3f','#6fa8ff','#6fffa0','#ffa0d8','#f4f4ff']},
  {k:'rSecret'  ,col:'#e8e8f4',w:1     ,g:null},
  {k:'rDivine'  ,col:'#ff3fa0',w:.18   ,g:null}
];
/* nombre, $/s. El orden es el del índice del original. */
const BABAS=[
 /* COMÚN */
 ['Metal amarillo',5],['Metal Rojo',6],['Metal azul',7],
 ['Azul cielo metalizado',8],['Metal verde',9],['Metal morado',10],
 /* NO COMÚN */
 ['Hoja verde',15],['Hoja rosa',17],['Hoja azul',19],
 ['Hoja de cielo azul',21],['Hoja roja',23],['Hoja amarilla',25],
 /* RARO */
 ['Círculo Rojo',35],['Círculo Azul',40],['Círculo azul cielo',45],
 ['Círculo amarillo',50],['Círculo rosa',55],['Círculo verde',60],
 /* ÉPICO */
 ['Vórtice verde',80],['Vórtice púrpura',95],['Vórtice rosa',110],
 ['Vórtice azul',125],['Vórtice rojo',140],['Vórtice amarillo',150],
 /* LEGENDARIO */
 ['Neón amarillo',250],['Neón rojo',300],['Neón azul cielo',350],
 ['Neón Verde',400],['Neón rosa',450],['Neón blanco',500],
 /* MÍTICO */
 ['Fantasma amarillo',800],['Fantasma rojo',950],['Fantasma azul',1100],
 ['Fantasma verde',1250],['Fantasma rosa',1400],['Fantasma blanco',1500],
 /* SECRETO (21) */
 ['Envoltorio de burbujas',3000],['Pizza',3500],['Piña',4000],['Chocolate',4500],
 ['Limón',5000],['Naranja',5500],['Kiwi',6000],['Fresa',6500],['Sandía',7000],
 ['Celestial',8000],['Cíber',9000],['Agua',10000],['Hojas',11000],['Lava',12500],
 ['Fuego',14000],['Galaxia',15500],['Atlántico',16500],['Diamante',17500],
 ['Zafiro',18500],['Rubí',19250],['Esmeralda',20000],
 /* DIVINO (8) */
 ['Brillo naranja',50000],['Glitter azul',65000],['Brillo amarillo',80000],
 ['Brillo rosa',100000],['Brillo rojo',130000],['Brillo verde',170000],
 ['Brillo púrpura',220000],['Brillo de arcoíris',350000]
];
/* colores de cuerpo de las babas de SECRETO y DIVINO (las de fruta y brillo) */
const SECCOL=['#dff0ff','#e8a33f','#f0d24a','#5a3a24','#f0e04a','#f09a3a','#8fd44a',
  '#e8405a','#4ac45c','#a8d8ff','#3ff0e0','#4aa8ff','#4ac45c','#ff6a2a','#ff4a20',
  '#8a4aff','#2a7aff','#a8f0ff','#2a4aff','#e8203f','#20d060'];
const DIVCOL=['#ff9a2a','#3fa0ff','#ffe03a','#ff5aa8','#ff3a3a','#3fe86a','#a83aff','#ffffff'];
/* cuántas babas tiene cada rareza y dónde empieza en BABAS */
const RCUT=[0,6,12,18,24,30,36,57,65];
function rarOf(i){for(let r=0;r<8;r++)if(i<RCUT[r+1])return r;return 7;}
function colOfBaba(i){
  const r=rarOf(i);
  if(r<6)return RAR[r].g[i-RCUT[r]];
  if(r===6)return SECCOL[i-RCUT[6]]||'#e8e8f4';
  return DIVCOL[i-RCUT[7]]||'#ffffff';
}
/* ===================== FORMATO DE NÚMEROS =====================
   El original salta de K a B (se ve `$884.98B/s` y `$2.61Qa`), así que se usa la
   escala corta completa y se muestran dos decimales como allá. */
const SUF=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
function fmt(n){
  if(!isFinite(n))return '0';
  if(n<1000)return (n<10&&n%1?n.toFixed(1):Math.round(n))+'';
  let i=0;
  while(n>=1000&&i<SUF.length-1){n/=1000;i++;}
  return (n<10?n.toFixed(2):(n<100?n.toFixed(2):n.toFixed(2)))+SUF[i];
}
const money=n=>'$'+fmt(n);

/* ===================== MUNDO ===================== */
const PLOTS=12;                       /* parcelas de tu base (como el 12 del original) */
const BW=26,BD=17;                     /* medio ancho y medio fondo de tu base */
const BY=.55;                          /* alto de la tapa de la base sobre el piso */
let T3,scene,cam,gp={dpr:1.6,part:1,sh:1,fog:1};
let plateT=null,ground=null,groundFar=null,IB=null,IP=null,ISH=null;
const STUD2=2,NEAR=52;   /* 2 unidades por baldosa de dos tachas; placa cercana de 52 */
/* ===================== RESOLUCIÓN ADAPTATIVA =====================
   MEDIDO (--disable-gpu-vsync, 900x430): el cuadro tarda 27,4 ms con piso y 18,7
   sin piso. O sea que ~9 ms son RASTERIZAR el piso, no la luz ni la textura (ya
   están los dos planos sin luz y la textura sólo en la placa cercana). En un
   rasterizador de software eso no se arregla con geometría: se arregla pintando
   menos píxeles. Igual que en AGUJERO, si baja de 38 fps se baja el pixelRatio y
   se recupera al pasar 52. En un celular real, con GPU, esto no se activa nunca. */
let rs=1,rsT=0;
function rsApply(){
  if(!ARC.rnd)return;
  const base=Math.min(window.devicePixelRatio||1,(gp&&gp.dpr)||1.35);
  ARC.rnd.setPixelRatio(base*rs);
  ARC.rnd.setSize(ARC.W,ARC.H,false);
}
function rsTick(dt){
  rsT+=dt;if(rsT<.55)return;rsT=0;
  const f=ARC.fps||60;
  if(f<38&&rs>.62){rs=Math.max(.62,rs-.12);rsApply();}
  else if(f>52&&rs<1){rs=Math.min(1,rs+.08);rsApply();}
}
let AV={},avN=0;                       /* mallas instanciadas del avatar */
let dum,V3,V3b,QT,EU,M4,CC;
let px=0,pz=10,pvx=0,pvz=0,pyaw=0,pwalk=0,drag=null,dirv={x:0,z:0};
let cash=0,evc=0,tick=0,lastPay=0,dps=0;
let slots=[],inv=[],found=[],luck=1,pot=null,potT=0,reveal=null;
let rivals=[],lb=[],pops=[],camA=0,camD=23,demo=0,aT=0;
let panel=null,tab=0,pane='';
let openN=0,placedN=0;
let NOTAG=false,NOFACE=false,NO2D=false;

/* ---------------------------------------------------------------- guardado */
function load(){
  const S=ARC.S;
  found=Array.isArray(S.bFound)&&S.bFound.length===65?S.bFound.slice():new Array(65).fill(0);
  slots=Array.isArray(S.bSlots)?S.bSlots.slice(0,PLOTS):[];
  while(slots.length<PLOTS)slots.push(-1);
  inv=Array.isArray(S.bInv)?S.bInv.slice(0,60):[];
  cash=+S.bCash||0;evc=+S.bEvc||0;luck=Math.max(1,+S.bLuck||1);
  openN=+S.bOpen||0;
}
function save(){
  const S=ARC.S;
  S.bFound=found;S.bSlots=slots;S.bInv=inv;S.bCash=cash;S.bEvc=evc;S.bLuck=luck;
  S.bOpen=openN;
  const b=baseRate();
  if(b>(S.bestBase||0))S.bestBase=b;
  ARC.save();
}
function baseRate(){
  let s=0;
  for(const i of slots)if(i>=0)s+=BABAS[i][1];
  return s;
}
function nFound(){return found.reduce((a,b)=>a+(b?1:0),0);}

/* ===================== GEOMETRÍA ===================== */
/* LA PLACA CON TACHAS. En Roblox el piso son tachas de verdad; acá se hornea el
   patrón en un canvas de 128 y se repite. Con tachas reales el piso serían
   decenas de miles de cilindros; así es UNA llamada de dibujo y se ve igual. */
function studTex(base,stud){
  const c=document.createElement('canvas');c.width=c.height=128;
  const g=c.getContext('2d');
  g.fillStyle=base;g.fillRect(0,0,128,128);
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){
    const cx=i*64+32,cy=j*64+32;
    g.beginPath();g.arc(cx,cy,20,0,Math.PI*2);
    g.fillStyle=stud;g.fill();
    g.beginPath();g.arc(cx,cy-2,20,Math.PI*1.1,Math.PI*1.9);
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=3.5;g.stroke();
    g.beginPath();g.arc(cx,cy+2,20,Math.PI*.1,Math.PI*.9);
    g.strokeStyle='rgba(0,0,0,.16)';g.lineWidth=3.5;g.stroke();
  }
  const t=new T3.CanvasTexture(c);
  t.wrapS=t.wrapT=T3.RepeatWrapping;
  t.magFilter=T3.LinearFilter;t.minFilter=T3.LinearMipmapLinearFilter;
  return t;
}
function VA(){return{p:[],c:[]};}
function CC3(h){const c=new T3.Color(h);return[c.r,c.g,c.b];}
function vq(ac,a,b,c,d,col){
  /* OJO CON EL ORDEN: (a,c,b) y (a,d,c), no (a,b,c). Con el orden directo la
     normal de las caras de arriba salía apuntando hacia ABAJO y three las
     descartaba por back-face: la plataforma de la base y las parcelas verdes
     simplemente no se dibujaban (se vio en la captura BB-2). */
  ac.p.push(a[0],a[1],a[2],c[0],c[1],c[2],b[0],b[1],b[2],
            a[0],a[1],a[2],d[0],d[1],d[2],c[0],c[1],c[2]);
  for(let i=0;i<6;i++)ac.c.push(col[0],col[1],col[2]);
}
function bx(ac,x,y,z,w,h,d,ct,cs){
  const X=w/2,Y=h/2,Z=d/2;
  const P=[[x-X,y-Y,z-Z],[x+X,y-Y,z-Z],[x+X,y-Y,z+Z],[x-X,y-Y,z+Z],
           [x-X,y+Y,z-Z],[x+X,y+Y,z-Z],[x+X,y+Y,z+Z],[x-X,y+Y,z+Z]];
  vq(ac,P[4],P[5],P[6],P[7],ct);
  vq(ac,P[3],P[2],P[1],P[0],cs);
  vq(ac,P[0],P[1],P[5],P[4],cs);vq(ac,P[2],P[3],P[7],P[6],cs);
  vq(ac,P[1],P[2],P[6],P[5],cs);vq(ac,P[3],P[0],P[4],P[7],cs);
}
function fl(ac,x,y,z,w,d,col){
  const X=w/2,Z=d/2;
  vq(ac,[x-X,y,z-Z],[x+X,y,z-Z],[x+X,y,z+Z],[x-X,y,z+Z],col);
}
function mesh(ac,mat){
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.BufferAttribute(new Float32Array(ac.p),3));
  g.setAttribute('color',new T3.BufferAttribute(new Float32Array(ac.c),3));
  g.computeVertexNormals();
  return new T3.Mesh(g,mat||new T3.MeshLambertMaterial({vertexColors:true}));
}
function IM(geo,mat,cap){
  const m=new T3.InstancedMesh(geo,mat,cap);
  m.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  m.frustumCulled=false;m.count=0;scene.add(m);return m;
}

/* ---- el mundo: tu base en el medio y las de los rivales al costado ---- */
function buildWorld(){
  /* placa base gigante con tachas (el suelo blanco del original) */
  /* DOS PISOS, y hace falta que sean dos. MEDIDO con --disable-gpu-vsync: con UNA
     placa texturada de 200x200 que cubre toda la pantalla el cuadro tardaba
     28,2 ms, y esconderla lo bajaba a 17,5: el piso solo se llevaba 9,1 ms de
     muestrear la textura píxel por píxel. Ahora la textura va sólo en una placa
     CERCANA de 70x70 que sigue al jugador saltando de a dos unidades exactas (así
     las tachas quedan clavadas al mundo y no se ve que el piso viaja), y lo de
     lejos es un plano de color liso que no muestrea nada. A esa distancia las
     tachas no se leían igual. */
  const gt=studTex('#eef1f4','#e2e6ea');
  gt.repeat.set(NEAR/STUD2,NEAR/STUD2);
  /* SIN LUZ EN EL PISO. Lambert ilumina POR FRAGMENTO y el piso son pantallas
     enteras de fragmentos: con los dos planos en Lambert el cuadro subió a 31,3 ms
     (peor que el plano único original de 28,2). El relieve de las tachas ya está
     horneado en la textura, así que la luz de three no aporta nada acá. */
  ground=new T3.Mesh(new T3.PlaneGeometry(NEAR,NEAR),
    new T3.MeshBasicMaterial({map:gt,fog:false}));
  ground.rotation.x=-Math.PI/2;ground.position.y=.004;scene.add(ground);
  groundFar=new T3.Mesh(new T3.PlaneGeometry(320,320),
    new T3.MeshBasicMaterial({color:new T3.Color('#e9edf1'),fog:false}));
  groundFar.rotation.x=-Math.PI/2;scene.add(groundFar);
  /* tu base: una plataforma negra con parcelas verde flúor, como en la captura */
  const ac=VA();
  const blk=CC3('#22252b'),blkT=CC3('#2e323a');
  /* LEVANTADA 0,55. Antes la tapa quedaba exactamente en y=0, o sea a ras del
     plano del piso: se peleaban en Z y la base no se veía (medido en la captura). */
  bx(ac,0,BY-.4,0,BW*2+3,.8,BD*2+3,blkT,blk);
  for(let i=0;i<PLOTS;i++){
    const p=plotPos(i);
    fl(ac,p.x,BY+.02,p.z,4.6,4.6,CC3('#2bd94a'));
    fl(ac,p.x,BY+.03,p.z,4.1,4.1,CC3('#43e57a'));
  }
  /* NUBES: cajas blancas lejanas, como el cielo del original */
  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2,R=150+((i*37)%60);
    const cx=Math.cos(a)*R,cz=Math.sin(a)*R,cy=42+((i*23)%26);
    for(let k=0;k<3;k++)
      bx(ac,cx+k*9-9,cy+(k===1?3:0),cz,16,7,10,CC3('#ffffff'),CC3('#e2eefb'));
  }
  /* cartel VENDER BABAS y el mostrador de la tienda, como en la captura */
  bx(ac,-15,BY+1.6,-BD-1,7,.35,.5,CC3('#e8493f'),CC3('#b2352d'));
  bx(ac, 15,BY+1.6,-BD-1,7,.35,.5,CC3('#43e57a'),CC3('#2bad5c'));
  /* toldo a rayas de la tienda */
  for(let i=0;i<8;i++)
    bx(ac,-19+i*1.6,BY+2.5,-BD-2.4,1.5,.3,2.2,
      CC3(i%2?'#ff4a4a':'#f4f4f8'),CC3(i%2?'#c43a3a':'#d8d8e0'));
  scene.add(mesh(ac));
  /* ---- pools instanciados ---- */
  /* cuerpo de baba: una esfera achatada; la cara va en la capa 2D */
  const bg=new T3.SphereGeometry(1,14,10);
  bg.scale(1,.78,1);
  IB=IM(bg,new T3.MeshLambertMaterial({color:0xffffff,flatShading:true}),64);
  /* pedestal de la parcela ocupada */
  IP=IM(new T3.CylinderGeometry(1.5,1.7,.34,12),
    new T3.MeshLambertMaterial({color:0x2a2f36}),64);
  ISH=IM(new T3.CircleGeometry(1,12),
    new T3.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.2,depthWrite:false}),64);
  /* avatar R6 de Roblox: seis piezas, seis InstancedMesh compartidos */
  const cap=8;
  const mk=(w,h,d,col)=>IM(new T3.BoxGeometry(w,h,d),
    new T3.MeshLambertMaterial({color:new T3.Color(col)}),cap);
  AV={head:mk(1.25,1.05,1.25,'#ffd24a'),torso:mk(1.7,1.9,.95,'#3fa0ff'),
      armL:mk(.6,1.85,.6,'#ffd24a'),armR:mk(.6,1.85,.6,'#ffd24a'),
      legL:mk(.7,1.85,.7,'#2fd45c'),legR:mk(.7,1.85,.7,'#2fd45c')};
  /* LA OLLA (la de ABRIR): un tacho beige con asa, igual que la captura */
  pot=new T3.Group();
  const pm=new T3.MeshLambertMaterial({color:new T3.Color('#d8cfa8'),flatShading:true});
  const body=new T3.Mesh(new T3.CylinderGeometry(1.5,1.15,2,16),pm);
  body.position.y=1;pot.add(body);
  const lid=new T3.Mesh(new T3.CylinderGeometry(1.55,1.55,.22,16),pm);
  lid.position.y=2.05;pot.add(lid);pot.lid=lid;
  const knob=new T3.Mesh(new T3.TorusGeometry(.34,.09,6,10),pm);
  knob.rotation.x=Math.PI/2;knob.position.y=2.3;pot.add(knob);
  pot.position.set(0,BY,BD-3.5);
  scene.add(pot);
}
function plotPos(i){
  const c=i%4,r=(i/4)|0;
  return{x:-15+c*10,z:-BD+5+r*11};
}
/* bases de los rivales: al costado, para que se vean como en el original */
function rivalBase(k){return{x:(k%2?1:-1)*(BW*2+22),z:(k<2?-1:1)*22};}

/* ===================== RIVALES ===================== */
const NICK=['maferg2218','Juniors3655','ParaPlanti2022'];
function mkRivals(){
  rivals=[];
  for(let k=0;k<3;k++){
    const b=rivalBase(k);
    rivals.push({nick:NICK[k],x:b.x,z:b.z,bx:b.x,bz:b.z,
      cash:[2.6e18,8.4e14,1.7e14][k],rate:[8.8e11,4.4e11,4e11][k],
      car:[8,9,9][k],slots:pickRivalSlots(k),t:0,yaw:0,walk:0});
  }
}
function pickRivalSlots(k){
  /* a los rivales se les llena la base con babas de las rarezas altas, que es lo
     que se ve en las capturas (Piña, Rubí, Diamante, Brillo verde...) */
  const out=[];
  for(let i=0;i<PLOTS;i++){
    const r=k===0?7:(k===1?6:6);
    const a=RCUT[r],b=RCUT[r+1];
    out.push(a+Math.floor(Math.random()*(b-a)));
  }
  return out;
}

/* ===================== ABRIR LA OLLA ===================== */
/* El peso de cada rareza se multiplica por la SUERTE, como el `x2.240.000` que se
   ve arriba de la olla: con mucha suerte lo raro deja de ser raro. */
function rollBaba(){
  const w=RAR.map((r,i)=>r.w*(i>=4?Math.min(4000,luck):1));
  let t=0;for(const v of w)t+=v;
  let x=Math.random()*t,r=0;
  for(;r<w.length;r++){x-=w[r];if(x<=0)break;}
  r=Math.min(r,7);
  const a=RCUT[r],b=RCUT[r+1];
  return a+Math.floor(Math.random()*(b-a));
}
function openPot(){
  if(reveal)return;
  const i=rollBaba();
  openN++;
  const nuevo=!found[i];
  found[i]=1;
  if(inv.length<60)inv.push(i);
  reveal={i,t:0,nuevo};
  ARC.sfx(rarOf(i)>=5?'win':'pop',{vol:.7,rate:1+rarOf(i)*.05});
  ARC.vib(rarOf(i)>=5?[20,50,20]:14);
  const sc=proj(pot.position.x,BY+3.4,pot.position.z);
  if(sc&&ARC.S.fx)ARC.fx.burst(sc.x,sc.y,{n:Math.round((10+rarOf(i)*5)*gp.part),
    color:RAR[rarOf(i)].col,speed:200,life:.7,size:5,sq:true});
  if(rarOf(i)>=5){ARC.shake(10);ARC.toast(ARC.T(nuevo?'newFind':'open')+' · '+BABAS[i][0],1600);}
  save();
}

/* ===================== CÁMARA Y PROYECCIÓN ===================== */
function proj(x,y,z){
  V3.set(x,y,z).project(cam);
  return{x:(V3.x*.5+.5)*ARC.W,y:(-V3.y*.5+.5)*ARC.H,z:V3.z,
    on:V3.z<1&&Math.abs(V3.x)<1.25&&Math.abs(V3.y)<1.25};
}

/* ===================== ENTRADA ===================== */
G.down=function(p){
  /* la olla se toca directo, como en el original */
  const sc=proj(pot.position.x,BY+1.4,pot.position.z);
  if(sc&&sc.on&&Math.hypot(sc.x-p.x,sc.y-p.y)<ARC.H*.13&&
     Math.hypot(px-pot.position.x,pz-pot.position.z)<9){openPot();return;}
  drag={x:p.x,y:p.y};
};
G.move=function(p){
  if(!drag)return;
  const dx=p.x-drag.x,dy=p.y-drag.y,L=Math.hypot(dx,dy);
  if(L<5){dirv.x=dirv.z=0;return;}
  const k=Math.min(1,L/(ARC.H*.18));
  dirv.x=dx/L*k;dirv.z=dy/L*k;
};
G.up=function(){drag=null;dirv.x=dirv.z=0;};
G.key=function(c,d){
  const v=d?1:0;
  if(c==='ArrowLeft'||c==='KeyA')dirv.x=-v;
  if(c==='ArrowRight'||c==='KeyD')dirv.x=v;
  if(c==='ArrowUp'||c==='KeyW')dirv.z=-v;
  if(c==='ArrowDown'||c==='KeyS')dirv.z=v;
  if(d&&c==='Space')openPot();
};

/* ===================== PANELES ===================== */
function panelBuild(){
  if(panel)return;
  const d=document.createElement('div');d.id='bbP';
  d.innerHTML=
    '<div class="bbCard">'+
      '<div class="bbTop"><b id="bbTtl"></b><div class="btn" id="bbX">✕</div></div>'+
      '<div class="bbTabs" id="bbTabs"></div>'+
      '<div class="bbBody" id="bbBody"></div>'+
      '<div class="bbFoot"><span id="bbFt"></span></div>'+
    '</div>';
  document.getElementById('stage').appendChild(d);
  panel=d;
  d.addEventListener('pointerdown',e=>{if(e.target===d){e.preventDefault();panelClose();}});
  const x=document.getElementById('bbX');
  x.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();
    ARC.sfx('click');panelClose();});
}
function panelClose(){if(panel)panel.classList.remove('on');pane='';}
function panelOpen(which){
  panelBuild();pane=which;tab=which==='idx'?0:0;
  panel.classList.add('on');
  panelFill();
}
function panelFill(){
  if(!panel)return;
  const T=ARC.T;
  document.getElementById('bbTtl').textContent=
    pane==='idx'?'📖 '+T('idx'):(pane==='inv'?'🎒 '+T('inv'):T(pane));
  const tabs=document.getElementById('bbTabs'),body=document.getElementById('bbBody');
  tabs.innerHTML='';body.innerHTML='';
  if(pane==='idx'){
    RAR.forEach((r,i)=>{
      const b=document.createElement('b');
      b.textContent=T(r.k);b.style.color=r.col;
      if(i===tab)b.className='on';
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();
        ARC.sfx('click',{vol:.5});tab=i;panelFill();});
      tabs.appendChild(b);
    });
    const a=RCUT[tab],b2=RCUT[tab+1];
    let fo=0;
    for(let i=a;i<b2;i++){
      if(found[i])fo++;
      const el=document.createElement('div');
      el.className='bbCell'+(found[i]?' fo':'');
      el.style.borderColor=RAR[tab].col;
      el.innerHTML='<i style="color:'+RAR[tab].col+'">'+T(RAR[tab].k)+'</i>'+
        '<b>'+BABAS[i][0]+'</b>'+
        '<u>$'+fmt(BABAS[i][1])+'/s</u>'+
        '<s class="'+(found[i]?'y':'n')+'">'+T(found[i]?'found':'notFound')+'</s>';
      body.appendChild(el);
    }
    document.getElementById('bbFt').innerHTML=
      T(RAR[tab].k)+' &nbsp;|&nbsp; <b>'+fo+'/'+(b2-a)+'</b> '+T('foundN')+
      ' &nbsp;|&nbsp; '+T('total')+' <b>'+nFound()+'/65</b>';
  }else if(pane==='inv'){
    body.className='bbBody';
    if(!inv.length){
      const e=document.createElement('div');e.className='bbEmpty';
      e.textContent=ARC.T('emptyInv');body.appendChild(e);
    }
    /* se agrupan por tipo, como el inventario del original */
    const byI={};for(const i of inv)byI[i]=(byI[i]||0)+1;
    Object.keys(byI).map(Number).sort((a,b)=>BABAS[b][1]-BABAS[a][1]).forEach(i=>{
      const r=rarOf(i);
      const el=document.createElement('div');
      el.className='bbCell fo';el.style.borderColor=RAR[r].col;
      el.innerHTML='<i style="color:'+RAR[r].col+'">'+T(RAR[r].k)+'</i>'+
        '<b>'+BABAS[i][0]+'</b><u>$'+fmt(BABAS[i][1])+'/s</u>'+
        '<s class="y">x'+byI[i]+'</s>'+
        '<div class="bbRow"><em class="pl">'+T('place')+'</em><em class="sl">'+T('sell')+'</em></div>';
      el.querySelector('.pl').addEventListener('pointerdown',ev=>{
        ev.preventDefault();ev.stopPropagation();placeBaba(i);});
      el.querySelector('.sl').addEventListener('pointerdown',ev=>{
        ev.preventDefault();ev.stopPropagation();sellBaba(i);});
      body.appendChild(el);
    });
    document.getElementById('bbFt').innerHTML=
      T('slots')+': <b>'+slots.filter(s=>s>=0).length+'/'+PLOTS+'</b>'+
      ' &nbsp;|&nbsp; '+T('base')+': <b style="color:#43e57a">$'+fmt(baseRate())+'/s</b>';
  }else{
    const e=document.createElement('div');e.className='bbEmpty';
    e.textContent=ARC.T('soon');body.appendChild(e);
    document.getElementById('bbFt').textContent='';
  }
}
function placeBaba(i){
  const k=slots.indexOf(-1);
  if(k<0){ARC.toast(ARC.T('full'),1200);ARC.sfx('lose',{vol:.5});return;}
  const j=inv.indexOf(i);if(j<0)return;
  inv.splice(j,1);slots[k]=i;
  ARC.sfx('power',{vol:.6});ARC.toast(ARC.T('placed'),1000);
  placedN++;save();panelFill();
}
function sellBaba(i){
  const j=inv.indexOf(i);if(j<0)return;
  inv.splice(j,1);
  const v=BABAS[i][1]*180;
  cash+=v;
  ARC.sfx('coin',{vol:.6});ARC.toast(ARC.T('sold')+' $'+fmt(v),1200);
  save();panelFill();
}

/* ===================== CICLO ===================== */
function css(){
  if(document.getElementById('bbCss'))return;
  const st=document.createElement('style');st.id='bbCss';
  st.textContent=`
#menu.hasart.live .ttl{display:block}
#menu.live .ttl{filter:drop-shadow(0 3px 0 rgba(0,60,20,.5)) drop-shadow(0 10px 26px rgba(0,0,0,.7))}
#bbSide{position:absolute;left:2.2vmin;top:16%;display:flex;flex-direction:column;
  gap:1.4vmin;z-index:6;pointer-events:auto}
#bbSide .bbB{width:clamp(46px,9.4vmin,74px);height:clamp(46px,9.4vmin,74px);
  border-radius:16%;display:flex;flex-direction:column;align-items:center;
  justify-content:center;font-weight:900;color:#fff;font-size:clamp(16px,3.6vmin,26px);
  border:3px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.35),0 8px 18px rgba(0,0,0,.35);
  background:linear-gradient(145deg,#ff4a4a,#ffd24a 30%,#43e57a 60%,#4aa8ff 85%,#b06cff)}
#bbSide .bbB u{font-size:clamp(6px,1.5vmin,10px);text-decoration:none;letter-spacing:.02em;
  text-shadow:0 1px 2px rgba(0,0,0,.8);margin-top:.1em}
#bbSide .bbB:active{transform:scale(.93)}
/* dinero abajo a la izquierda, como en el original */
#bbCash{position:absolute;left:2.4vmin;bottom:2vmin;z-index:6;pointer-events:none;
  font-weight:900;color:#43e57a;font-size:clamp(26px,9.6vmin,74px);line-height:1;
  text-shadow:0 3px 0 #0d6b32,0 0 18px rgba(0,0,0,.5)}
#bbCash em{display:block;font-style:normal;color:#ffd24a;font-size:.34em;margin-top:.25em;
  text-shadow:0 2px 0 rgba(0,0,0,.5)}
/* tabla de posiciones arriba a la derecha */
#bbLb{position:absolute;right:1.6vmin;top:1.4vmin;z-index:6;pointer-events:none;
  border:2px solid #fff;border-radius:4px;overflow:hidden;
  background:rgba(255,255,255,.10);backdrop-filter:blur(2px)}
#bbLb table{border-collapse:collapse;font-weight:900;color:#fff}
#bbLb th,#bbLb td{border:1px solid rgba(255,255,255,.85);padding:.16em .5em;
  font-size:clamp(7px,1.75vmin,13px);text-align:center;white-space:nowrap;
  text-shadow:0 2px 3px rgba(0,0,0,.8)}
#bbLb td.nm{font-size:clamp(9px,2.3vmin,17px)}
#bbLb td.bs{color:#43e57a}
#bbLb td.mn{color:#ffd24a}
#bbLb tr.me td{background:rgba(67,229,122,.22)}
/* panel (índice / inventario) */
#bbP{position:absolute;inset:0;z-index:8;display:none;align-items:center;
  justify-content:center;background:rgba(6,10,14,.78);pointer-events:auto;padding:2vmin}
#bbP.on{display:flex;animation:fade .16s ease-out}
#bbP .bbCard{width:100%;max-width:min(92%,760px);max-height:94%;display:flex;
  flex-direction:column;border-radius:14px;overflow:hidden;
  background:#241b33;border:3px solid #4ad2ff;box-shadow:0 20px 60px rgba(0,0,0,.7)}
#bbP .bbTop{background:#4ad2ff;display:flex;align-items:center;gap:.5em;
  padding:.3em .5em}
#bbP .bbTop b{flex:1;font-size:clamp(15px,4.2vmin,30px);font-weight:900;color:#fff;
  text-shadow:0 3px 0 rgba(0,80,120,.55)}
#bbP .bbTop .btn{background:#ff3b4e;border:2px solid #fff;border-radius:8px;
  width:1.9em;height:1.6em;display:flex;align-items:center;justify-content:center;
  font-size:clamp(13px,3.2vmin,22px);font-weight:900;color:#fff;padding:0}
#bbP .bbTabs{display:flex;flex-wrap:wrap;gap:2px;background:#1b1426;padding:3px}
#bbP .bbTabs b{flex:1 1 22%;text-align:center;font-weight:900;opacity:.5;
  padding:.32em .1em;border-radius:5px;font-size:clamp(7px,1.9vmin,13px);
  background:rgba(255,255,255,.05)}
#bbP .bbTabs b.on{opacity:1;background:rgba(255,255,255,.16)}
#bbP .bbBody{flex:1;overflow-y:auto;display:grid;padding:.6em;gap:.5em;
  grid-template-columns:repeat(auto-fill,minmax(clamp(96px,21vmin,150px),1fr));
  background:#1b1426}
#bbP .bbCell{border:2px solid #555;border-radius:9px;padding:.4em .3em;text-align:center;
  background:rgba(0,0,0,.35);display:flex;flex-direction:column;gap:.12em}
#bbP .bbCell.fo{background:rgba(255,255,255,.06)}
#bbP .bbCell i{font-style:normal;font-weight:900;font-size:clamp(7px,1.7vmin,12px)}
#bbP .bbCell b{color:#fff;font-weight:900;font-size:clamp(8px,2vmin,14px);line-height:1.1}
#bbP .bbCell u{text-decoration:none;color:#43e57a;font-weight:900;
  font-size:clamp(9px,2.2vmin,16px)}
#bbP .bbCell s{text-decoration:none;font-weight:900;font-size:clamp(6px,1.6vmin,11px)}
#bbP .bbCell s.y{color:#43e57a}
#bbP .bbCell s.n{color:#ff5a5a}
#bbP .bbRow{display:flex;gap:3px;margin-top:.2em}
#bbP .bbRow em{flex:1;font-style:normal;font-weight:900;border-radius:6px;
  padding:.25em 0;font-size:clamp(7px,1.7vmin,12px);color:#0d1410}
#bbP .bbRow .pl{background:#43e57a}
#bbP .bbRow .sl{background:#ffd24a}
#bbP .bbFoot{background:#7ee84a;color:#123018;font-weight:900;text-align:center;
  padding:.3em;font-size:clamp(8px,2.1vmin,15px)}
#bbP .bbEmpty{grid-column:1/-1;text-align:center;color:#c9c2d8;font-weight:800;
  padding:2em .5em;font-size:clamp(10px,2.4vmin,16px)}
`;
  document.head.appendChild(st);
}
function buildHud(){
  if(document.getElementById('bbSide'))return;
  const st=document.getElementById('stage');
  const side=document.createElement('div');side.id='bbSide';
  const T=ARC.T;
  [['idx','📖','idx'],['shop','🛒','shop'],['inv','🎒','inv'],
   ['cars','🚗','cars'],['paint','🎨','paint']].forEach(([id,ic,key])=>{
    const b=document.createElement('div');b.className='bbB';b.id='bb_'+id;
    b.innerHTML=ic+'<u>'+T(key)+'</u>';
    b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();
      ARC.sfx('tap');panelOpen(id);});
    side.appendChild(b);
  });
  st.appendChild(side);
  const c=document.createElement('div');c.id='bbCash';
  c.innerHTML='<span id="bbCn">$0</span><em id="bbEv"></em>';
  st.appendChild(c);
  const l=document.createElement('div');l.id='bbLb';
  l.innerHTML='<table id="bbLbT"></table>';
  st.appendChild(l);
}
function hudShow(on){
  for(const id of ['bbSide','bbCash','bbLb']){
    const e=document.getElementById(id);
    if(e)e.style.display=on?'':'none';
  }
}
function paintCash(){
  const a=document.getElementById('bbCn');if(!a)return;
  a.textContent=money(cash);
  document.getElementById('bbEv').innerHTML='⚡ '+fmt(evc)+' '+ARC.T('evc');
}
function paintLb(){
  const t=document.getElementById('bbLbT');if(!t)return;
  const T=ARC.T;
  const all=[{nick:T('you'),cash,rate:baseRate(),car:carsOwned(),me:1}]
    .concat(rivals.map(r=>({nick:r.nick,cash:r.cash,rate:r.rate,car:r.car})));
  all.sort((a,b)=>b.cash-a.cash);
  let h='<tr><th>#</th><th>'+T('lbName')+'</th><th>'+T('car')+'</th>'+
    '<th>'+T('base')+'</th><th>'+T('lbMoney')+'</th></tr>';
  all.slice(0,4).forEach((r,i)=>{
    h+='<tr'+(r.me?' class="me"':'')+'><td>#'+(i+1)+'</td>'+
      '<td class="nm">'+r.nick+'</td><td>'+r.car+'/12</td>'+
      '<td class="bs">$'+fmt(r.rate)+'/s</td>'+
      '<td class="mn">$'+fmt(r.cash)+'</td></tr>';
  });
  t.innerHTML=h;
  lb=all;
}
function carsOwned(){return 1;}   /* fase 2: los doce coches */

G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  css();
  gp=ARC.gfxP?ARC.gfxP():gp;
  dum=new T3.Object3D();V3=new T3.Vector3();V3b=new T3.Vector3();
  QT=new T3.Quaternion();EU=new T3.Euler();M4=new T3.Matrix4();CC=new T3.Color();
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  scene.fog=new T3.Fog(new T3.Color('#bfe6ff').getHex(),90,220);
  cam=new T3.PerspectiveCamera(52,ARC.W/Math.max(1,ARC.H),.1,400);
  scene.add(new T3.HemisphereLight(0xffffff,0x9fb6c8,1.55));
  const d=new T3.DirectionalLight(0xffffff,.75);d.position.set(30,60,20);scene.add(d);
  buildWorld();
  load();mkRivals();
  dps=baseRate();
};
G.resize=function(){if(cam){cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();}};
G.gfxApply=function(p){gp=p;rs=1;rsApply();};
G.start=function(){
  if(!T3)return;
  demo=0;load();mkRivals();
  /* el jugador arranca AFUERA de la base mirando hacia adentro: así en el primer
     cuadro se ven las doce parcelas y la olla, que es lo que muestra el original */
  px=0;pz=BD+11;pvx=pvz=0;pyaw=Math.PI;
  buildHud();hudShow(true);paintCash();paintLb();
  ARC.hud(0,'');
  ARC.toast(ARC.T('tip'),2600);
  ARC.tray([{id:'op',txt:'⚗ '+ARC.T('open'),fn:openPot}]);
};
G.pause=function(){drag=null;dirv.x=dirv.z=0;};
G.i18nDone=function(){
  for(const k in TAGC)delete TAGC[k];   /* los carteles horneados llevan el idioma */
  const s=document.getElementById('bbSide');
  if(s){s.remove();buildHud();hudShow(ARC.scr==='game');}
  paintCash();paintLb();if(pane)panelFill();
  ARC.trayTxt('op','⚗ '+ARC.T('open'));
};

G.step=function(dt){
  if(!T3)return;
  rsTick(dt);
  tick+=dt;
  /* ---- caminar ---- */
  const sp=13;
  const tx=dirv.x*sp,tz=dirv.z*sp;
  pvx+=(tx-pvx)*Math.min(1,dt*9);pvz+=(tz-pvz)*Math.min(1,dt*9);
  px=clamp(px+pvx*dt,-110,110);pz=clamp(pz+pvz*dt,-110,110);
  const mv=Math.hypot(pvx,pvz);
  if(mv>.4){pyaw=Math.atan2(pvx,pvz);pwalk+=dt*mv*1.1;}
  /* ---- la plata entra por segundo, como en el original ---- */
  dps=baseRate();
  cash+=dps*dt;
  lastPay+=dt;
  if(dps>0&&lastPay>=1){
    lastPay=0;
    pops.push({v:dps,t:0});
    if(pops.length>3)pops.shift();
    evc+=Math.max(1,Math.round(dps/1e9));
  }
  /* ---- los rivales crecen ---- */
  for(const r of rivals){
    r.cash+=r.rate*dt;
    r.t+=dt;
    /* dan vueltas por su base para que se vean vivos */
    const a=r.t*.35+r.nick.length;
    r.x=r.bx+Math.cos(a)*7;r.z=r.bz+Math.sin(a)*5;
    r.yaw=Math.atan2(-Math.sin(a)*7,Math.cos(a)*5);
    r.walk+=dt*3.4;
  }
  /* ---- la revelación de la olla ---- */
  if(reveal){reveal.t+=dt;if(reveal.t>2.6)reveal=null;}
  potT+=dt;
  /* ---- guardado y HUD cada tanto ---- */
  if(tick>1.05){tick=0;paintCash();paintLb();save();}
  for(const p of pops)p.t+=dt;
};

/* ---- dibujar las babas de una base ---- */
function pushBabas(list,ox,oz,out){
  for(let i=0;i<list.length;i++){
    const id=list[i];if(id<0)continue;
    const p=plotPos(i);
    out.push({id,x:ox+p.x,z:oz+p.z});
  }
}
G.draw=function(g,alpha){
  if(!ARC.rnd||!scene)return;
  /* ---- cámara: tercera persona detrás del avatar, como en Roblox ---- */
  const cd=camD,ch=cd*.80;   /* más picada: a .62 no se veía la base */
  /* la placa cercana salta de a STUD2 exactas: las tachas quedan clavadas al mundo */
  if(ground){ground.position.x=Math.round(px/STUD2)*STUD2;
    ground.position.z=Math.round(pz/STUD2)*STUD2;}
  cam.position.set(px-Math.sin(pyaw)*cd,ch,pz-Math.cos(pyaw)*cd);
  cam.lookAt(px,2.6+((Math.abs(px)<BW+1.5&&Math.abs(pz)<BD+1.5)?BY:0),pz);
  /* ---- babas: tu base y las de los rivales, todo en una llamada ---- */
  const list=[];
  pushBabas(slots,0,0,list);
  rivals.forEach((r,k)=>{const b=rivalBase(k);pushBabas(r.slots,b.x,b.z,list);});
  let n=0,ns=0;
  for(const b of list){
    if(n>=64)break;
    const s=1.35+Math.min(.9,Math.log10(1+BABAS[b.id][1])*.14);
    const bob=Math.sin(tick*2+b.x*.3+b.z*.2)*.09;
    dum.position.set(b.x,BY+.34+s*.78+bob,b.z);
    dum.rotation.set(0,0,0);dum.scale.setScalar(s);dum.updateMatrix();
    IB.setMatrixAt(n,dum.matrix);
    CC.setStyle(colOfBaba(b.id));IB.setColorAt(n,CC);
    dum.position.set(b.x,BY+.17,b.z);dum.scale.setScalar(1);dum.updateMatrix();
    IP.setMatrixAt(n,dum.matrix);
    n++;
    if(ns<64){dum.position.set(b.x,BY+.06,b.z);dum.rotation.set(-Math.PI/2,0,0);
      dum.scale.setScalar(s*1.05);dum.updateMatrix();ISH.setMatrixAt(ns++,dum.matrix);
      dum.rotation.set(0,0,0);}
    b.s=s;
  }
  setC(IB,n);setC(IP,n);setC(ISH,ns);
  if(IB.instanceColor)IB.instanceColor.needsUpdate=true;
  /* ---- avatares: vos y los tres rivales, seis llamadas para todos ---- */
  let a=0;
  avPut(a++,px,pz,pyaw,pwalk,mvNow());
  for(const r of rivals)avPut(a++,r.x,r.z,r.yaw,r.walk,1);
  for(const k in AV)setC(AV[k],a);
  /* ---- la tapa de la olla salta al abrir ---- */
  pot.lid.position.y=2.05+(reveal?Math.max(0,1.6-reveal.t*2)*1.2:Math.sin(potT*1.6)*.05);
  ARC.rnd.render(scene,cam);
  /* ================= CAPA 2D ================= */
  if(NO2D)return;
  if(!NOFACE)drawFaces(g,list);
  if(!NOTAG)drawTags(g,list);
  drawNames(g);
  drawPots(g);
  drawPops(g);
  if(reveal)drawReveal(g);
};
function mvNow(){return Math.hypot(pvx,pvz)>.4?1:0;}
function setC(m,n){m.count=n;m.visible=n>0;if(n>0)m.instanceMatrix.needsUpdate=true;}
/* AVATAR R6: torso, cabeza y cuatro miembros que se balancean al caminar */
function avPut(k,x,z,yaw,walk,moving){
  const sw=moving?Math.sin(walk*6)*.55:0;
  /* si está sobre la tapa de la base, camina 0,55 más arriba */
  const gy=(Math.abs(x)<BW+1.5&&Math.abs(z)<BD+1.5)?BY:0;
  const put=(m,dx,dy,dz,rx)=>{
    const cs=Math.cos(yaw),sn=Math.sin(yaw);
    dum.position.set(x+dx*cs+dz*sn,gy+dy,z-dx*sn+dz*cs);
    dum.rotation.set(rx||0,yaw,0);dum.scale.setScalar(1);dum.updateMatrix();
    m.setMatrixAt(k,dum.matrix);
  };
  put(AV.torso,0,2.85,0,0);
  put(AV.head ,0,4.35,0,0);
  put(AV.armL,-1.15,2.9,0, sw);
  put(AV.armR, 1.15,2.9,0,-sw);
  put(AV.legL,-.42,.95,0,-sw*.8);
  put(AV.legR, .42,.95,0, sw*.8);
}
/* CARAS de las babas: dos ojos grandes con brillo y boca chica, como el original */
function drawFaces(g,list){
  for(const b of list){
    const c=proj(b.x,BY+.34+b.s*.9,b.z);
    if(!c||!c.on)continue;
    const e=proj(b.x+b.s,BY+.34+b.s*.9,b.z);
    if(!e)continue;
    const rp=Math.abs(e.x-c.x);
    if(rp<7)continue;
    const S=Math.max(2,rp*.26),sep=rp*.34;
    for(const side of [-1,1]){
      const ox=c.x+side*sep,oy=c.y-rp*.05;
      g.fillStyle='#ffffff';
      g.beginPath();g.ellipse(ox,oy,S,S*1.12,0,0,Math.PI*2);g.fill();
      g.fillStyle='#141020';
      g.beginPath();g.arc(ox,oy+S*.1,S*.46,0,Math.PI*2);g.fill();
      g.fillStyle='rgba(255,255,255,.9)';
      g.beginPath();g.arc(ox-S*.2,oy-S*.16,S*.2,0,Math.PI*2);g.fill();
    }
    /* boca abierta chica */
    g.fillStyle='#2a1020';
    g.beginPath();g.ellipse(c.x,c.y+rp*.28,rp*.11,rp*.09,0,0,Math.PI*2);g.fill();
  }
}
/* ===================== CARTEL DE CADA BABA =====================
   Rareza en color, MÁXIMO NIVEL, nombre y $/s: las cuatro líneas de la captura.
   HORNEADO EN UN CANVAS POR TIPO DE BABA. Antes se dibujaba con texto de canvas
   en cada cuadro: cuatro líneas x contorno+relleno = ocho operaciones de texto por
   baba, y con las 48 babas en pantalla (las tuyas y las de los rivales) eran 384
   por cuadro. MEDIDO: 37,5 fps de mediana. Con el cartel horneado una vez y pegado
   con un drawImage, el mismo cuadro va muy por encima. El caché se tira cuando
   cambia el idioma (i18nDone). */
const TAGC={};
const TAGW=260,TAGH=132;
function tagCanvas(id){
  if(TAGC[id])return TAGC[id];
  const T=ARC.T,r=rarOf(id);
  const c=document.createElement('canvas');c.width=TAGW;c.height=TAGH;
  const g=c.getContext('2d');
  g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
  const line=(txt,y,size,col)=>{
    g.font='900 '+size+'px system-ui,sans-serif';
    g.lineWidth=Math.max(3,size*.34);g.strokeStyle='rgba(6,10,16,.95)';
    g.strokeText(txt,TAGW/2,y,TAGW-8);
    g.fillStyle=col;g.fillText(txt,TAGW/2,y,TAGW-8);
  };
  line(T(RAR[r].k),17,22,RAR[r].col);
  line(T('maxLvl'),42,19,'#ffffff');
  line(BABAS[id][0],72,25,'#ffffff');
  line('$'+fmt(BABAS[id][1])+'/s',105,29,'#43e57a');
  TAGC[id]=c;return c;
}
function drawTags(g,list){
  /* se ordenan por cercanía y se cortan: con la base llena y las tres de los
     rivales serían 48 carteles apilados y el de atrás no se lee igual */
  const vis=[];
  for(const b of list){
    const c=proj(b.x,BY+.34+b.s*1.85,b.z);
    if(!c||!c.on||c.z>.9985)continue;
    const e=proj(b.x+b.s,BY+.34+b.s*1.85,b.z);
    if(!e)continue;
    const rp=Math.abs(e.x-c.x);
    if(rp<13)continue;                    /* muy lejos: no se leería */
    vis.push({c,rp,id:b.id});
  }
  vis.sort((a,b)=>b.rp-a.rp);
  const n=Math.min(vis.length,26);
  for(let i=0;i<n;i++){
    const v=vis[i];
    const cv=tagCanvas(v.id);
    const w=v.rp*3.1,h=w*TAGH/TAGW;
    g.drawImage(cv,v.c.x-w/2,v.c.y-h*.92,w,h);
  }
}
/* nombre del jugador flotando, como en Roblox */
function drawNames(g){
  const put=(x,z,txt)=>{
    const c=proj(x,6.4+((Math.abs(x)<BW+1.5&&Math.abs(z)<BD+1.5)?BY:0),z);
    if(!c||!c.on)return;
    const f=Math.max(8,ARC.H*.030);
    g.font='900 '+f.toFixed(1)+'px system-ui,sans-serif';
    g.textAlign='center';g.textBaseline='middle';
    g.lineWidth=f*.3;g.strokeStyle='rgba(6,10,16,.85)';
    g.strokeText(txt,c.x,c.y);g.fillStyle='#ffffff';g.fillText(txt,c.x,c.y);
    g.textAlign='left';g.textBaseline='alphabetic';
  };
  put(px,pz,ARC.T('you'));
  for(const r of rivals)put(r.x,r.z,r.nick);
}
/* la SUERTE arriba de la olla, con su trébol, y el aviso de tocar */
function drawPots(g){
  const c=proj(pot.position.x,BY+4.6,pot.position.z);
  if(!c||!c.on)return;
  const f=Math.max(10,ARC.H*.045);
  g.font='900 '+f.toFixed(1)+'px system-ui,sans-serif';
  g.textAlign='center';g.textBaseline='middle';
  const txt='x'+fmt(luck)+' ☘';
  g.lineWidth=f*.3;g.strokeStyle='rgba(6,10,16,.9)';
  g.strokeText(txt,c.x,c.y);g.fillStyle='#ffffff';g.fillText(txt,c.x,c.y);
  const near=Math.hypot(px-pot.position.x,pz-pot.position.z)<9;
  if(near){
    const f2=f*.62;
    g.font='900 '+f2.toFixed(1)+'px system-ui,sans-serif';
    g.lineWidth=f2*.32;g.strokeStyle='rgba(6,10,16,.9)';
    g.strokeText(ARC.T('open'),c.x,c.y+f*1.1);
    g.fillStyle='#43e57a';g.fillText(ARC.T('open'),c.x,c.y+f*1.1);
  }
  g.textAlign='left';g.textBaseline='alphabetic';
}
/* los +$X subiendo sobre el dinero, tres a la vez, como en la captura */
function drawPops(g){
  const x=ARC.W*.03,y0=ARC.H*.80;
  const f=Math.max(13,ARC.H*.055);
  g.font='900 '+f.toFixed(1)+'px system-ui,sans-serif';
  g.textAlign='left';g.textBaseline='middle';
  pops.forEach((p,i)=>{
    const k=clamp(1-p.t/2.4,0,1);
    const y=y0-i*f*1.15-p.t*f*.5;
    g.globalAlpha=k*.9;
    g.lineWidth=f*.26;g.strokeStyle='rgba(6,40,16,.55)';
    g.strokeText('+'+money(p.v),x,y);
    g.fillStyle='#43e57a';g.fillText('+'+money(p.v),x,y);
  });
  g.globalAlpha=1;
  g.textBaseline='alphabetic';
}
/* la revelación: SECRETO / Nivel 1 / Rubí / $19.25K/s, igual que la captura */
function drawReveal(g){
  const r=rarOf(reveal.i),T=ARC.T;
  const c=proj(pot.position.x,BY+3.4+Math.min(1.6,reveal.t*2.2),pot.position.z);
  if(!c)return;
  const k=clamp(reveal.t/.25,0,1)*clamp((2.6-reveal.t)/.4,0,1);
  const f=Math.max(11,ARC.H*.052)*k;
  if(f<3)return;
  g.textAlign='center';g.textBaseline='middle';
  const line=(txt,y,size,col)=>{
    g.font='900 '+size.toFixed(1)+'px system-ui,sans-serif';
    g.lineWidth=Math.max(2,size*.3);g.strokeStyle='rgba(6,10,16,.92)';
    g.strokeText(txt,c.x,y);g.fillStyle=col;g.fillText(txt,c.x,y);
  };
  let y=c.y-f*2.2;
  line(T(RAR[r].k),y,f,RAR[r].col);y+=f*1.2;
  line(T('lvl')+' 1',y,f*.85,'#ffffff');y+=f*1.15;
  line(BABAS[reveal.i][0],y,f*1.05,'#ffffff');y+=f*1.25;
  line('$'+fmt(BABAS[reveal.i][1])+'/s',y,f,'#43e57a');
  g.textAlign='left';g.textBaseline='alphabetic';
}

/* ===================== MODO ATRACCIÓN ===================== */
G.attract=function(dt,g){
  if(!T3||!scene||!ARC.rnd)return;
  if(!demo){demo=1;aT=0;load();mkRivals();
    if(!slots.some(s=>s>=0))for(let i=0;i<PLOTS;i++)slots[i]=RCUT[5]+(i%6);
    hudShow(false);}
  aT+=dt;
  for(const r of rivals){r.t+=dt;const a=r.t*.35+r.nick.length;
    r.x=r.bx+Math.cos(a)*7;r.z=r.bz+Math.sin(a)*5;r.walk+=dt*3.4;}
  tick+=dt;
  const a=aT*.13,R=34;
  cam.position.set(Math.cos(a)*R,17,Math.sin(a)*R);
  cam.lookAt(0,3.4,0);
  const list=[];pushBabas(slots,0,0,list);
  let n=0;
  for(const b of list){
    if(n>=64)break;
    const s=1.35+Math.min(.9,Math.log10(1+BABAS[b.id][1])*.14);
    const bob=Math.sin(tick*2+b.x*.3)*.09;
    dum.position.set(b.x,BY+.34+s*.78+bob,b.z);dum.rotation.set(0,0,0);
    dum.scale.setScalar(s);dum.updateMatrix();IB.setMatrixAt(n,dum.matrix);
    CC.setStyle(colOfBaba(b.id));IB.setColorAt(n,CC);
    dum.position.set(b.x,BY+.17,b.z);dum.scale.setScalar(1);dum.updateMatrix();
    IP.setMatrixAt(n,dum.matrix);
    n++;b.s=s;
  }
  setC(IB,n);setC(IP,n);setC(ISH,0);
  if(IB.instanceColor)IB.instanceColor.needsUpdate=true;
  let av=0;avPut(av++,0,BD+11,Math.PI,0,0);
  for(const r of rivals)avPut(av++,r.x,r.z,r.yaw||0,r.walk,1);
  for(const k in AV)setC(AV[k],av);
  ARC.rnd.render(scene,cam);
  drawFaces(g,list);
};

/* ===================== SONDA ===================== */
G.dbg={
  state:()=>({cash:Math.round(cash),dps:baseRate(),inv:inv.length,
    slots:slots.filter(s=>s>=0).length,found:nFound(),total:65,
    luck,openN,placedN,px:+px.toFixed(1),pz:+pz.toFixed(1),rs:+rs.toFixed(2),
    pane,tab,pops:pops.length,rivals:rivals.map(r=>r.nick),
    lb:lb.map(r=>r.nick+':'+fmt(r.cash))}),
  perf:()=>{const i=ARC.rnd?ARC.rnd.info:null;
    return i?{tris:i.render.triangles,calls:i.render.calls,fps:Math.round(ARC.fps)}:null;},
  open:n=>{for(let i=0;i<(n||1);i++){reveal=null;openPot();}return G.dbg.state();},
  /* la tabla de las 65 y el formato, para que la sonda pueda comprobarlos contra
     los valores leídos de las capturas (viven en el módulo, no en window) */
  tbl:()=>({n:BABAS.length,rar:RAR.length,cortes:RCUT.slice(),
    porRareza:RAR.map((_,r)=>RCUT[r+1]-RCUT[r]),
    nombres:BABAS.map(b=>b[0]),valores:BABAS.map(b=>b[1])}),
  fmt:v=>fmt(v),
  rarDe:i=>rarOf(i),
  /* qué rarezas se llevan encontradas (para probar que la suerte cambia el sorteo) */
  rarezas:()=>{const c={};for(let i=0;i<65;i++)if(found[i])c[rarOf(i)]=1;
    return Object.keys(c).map(Number);},
  reset:()=>{found=new Array(65).fill(0);inv=[];slots=new Array(PLOTS).fill(-1);
    openN=0;save();return G.dbg.state();},
  /* interruptores para MEDIR de dónde sale el costo, en vez de adivinar */
  off:o=>{
    if(o.piso!=null&&ground){ground.visible=!o.piso;if(groundFar)groundFar.visible=!o.piso;}
    if(o.tex!=null&&ground)ground.material.map=o.tex?null:ground.material.map,
      ground.material.needsUpdate=true;
    if(o.tags!=null)NOTAG=!!o.tags;
    if(o.caras!=null)NOFACE=!!o.caras;
    if(o.dos!=null)NO2D=!!o.dos;
    if(o.dpr!=null&&ARC.rnd){ARC.rnd.setPixelRatio(o.dpr);ARC.rnd.setSize(ARC.W,ARC.H,false);}
    if(o.rs!=null){rs=o.rs;rsApply();}
    return{piso:ground?ground.visible:null,NOTAG,NOFACE,NO2D,rs};},
  luck:v=>{luck=Math.max(1,v||1);save();return luck;},
  fill:()=>{ /* llena la base con lo mejor que haya en el inventario */
    inv.sort((a,b)=>BABAS[b][1]-BABAS[a][1]);
    for(let k=0;k<PLOTS&&inv.length;k++)if(slots[k]<0)slots[k]=inv.shift();
    save();return G.dbg.state();},
  panel:w=>{panelOpen(w);return{pane,tab};},
  tab:i=>{tab=i;panelFill();return{pane,tab};},
  put:(x,z)=>{px=x;pz=z;return{px,pz};},
  autoMove:()=>{
    /* el piloto camina hacia la olla, abre, y cuando junta babas llena la base */
    const d=Math.hypot(px-pot.position.x,pz-pot.position.z);
    if(d>6){
      const dx=pot.position.x-px,dz=pot.position.z-pz,L=Math.hypot(dx,dz)||1;
      dirv.x=dx/L;dirv.z=dz/L;return true;
    }
    dirv.x=dirv.z=0;
    if(!reveal)openPot();
    if(inv.length>=4)G.dbg.fill();
    return true;
  }
};

window.GAME=G;
