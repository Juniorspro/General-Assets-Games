/* ============================================================================
   AGUJERO — un pozo negro que se come el barrio y crece
   ----------------------------------------------------------------------------
   Arrastrá para mover el pozo. Se traga TODO lo que sea más chico que él y cada
   cosa lo agranda: primero faroles y bancos, después árboles y autos, al final
   kioscos y casas. Hay pozos RIVALES comiendo la misma cuadra: gana el más
   grande cuando se termina el reloj, y el pozo grande se puede tragar al chico.

   Lo que se midió y por qué el archivo quedó así (no deshacer sin volver a medir):

   · EL CANTO DEL PLATO. El barrio era un plato de 26 de medio lado y la cámara va
     DETRÁS del pozo (en +z): pegado al borde la cámara se pasaba del plato y en la
     captura A-agujero-mid-h se veía el FILO y el cielo abajo a la izquierda. Ahora
     el afuera son tres cosas: CERCO de vereda + seto en MAP+1,6 (tapa el filo y
     además le dice al jugador dónde termina la cuadra), plato de pasto hasta MAP+4
     y un anillo de CAMPO hasta 150 con el color degradado hacia el cielo POR
     DISTANCIA AL BARRIO. El degradado es propio y no la niebla de three porque la
     niebla se mide desde la cámara: con la cámara encima del pozo el afuera caía
     entero dentro de fog.near y quedaba una plancha de verde plano (P-ag-esquina-h).
     Y el pozo se clampea con `FENCE-.55-h.r`, o sea que el ARO entero queda del
     lado de adentro: antes el aro se montaba arriba del seto.

   · LOS RIVALES SE TRABABAN, y no por lo que parecía. El que elegía objetivo
     aceptaba hasta r*(1,06+hambre) y el que comía sólo hasta r*1,03: el rival se
     paraba encima de un auto que NO podía tragar y, como al vencer su temporizador
     volvía a elegir el prop más cercano (ese mismo auto, a distancia cero), se
     quedaba ahí para siempre. Medido con _agai.js: rival 1 con masa 0 a los 9 s
     mientras otro iba por 39. Ahora hay UNA sola regla (`canEat`) para comer,
     elegir y para el bot. Además: sólo mira comida a menos de 16 (cruzaba medio
     barrio por un farol y se le clavaba la masa 15 s), paseo al azar si su zona
     quedó pelada, separación entre pozos, y al ser comido le queda un piso de 6 de
     masa para que siga jugando.

   · RIVALES MÁS LISTOS, NO MÁS RÁPIDOS. Con sp = 5,5+lvl*0,45 los del barrio 5 y 6
     corrían a 7,75 y 8,2 contra los 7,6 del jugador y el bot terminaba segundo 255
     a 307 (_agfull.js). Va con tope de 7,2.

   · LO QUE CUESTA ES EL RELLENO DEL SUELO, no la geometría. Medido con _agperf2.js
     en swiftshader: 66 ms por cuadro de rasterizado contra 1 ms de comandos GL, con
     20 draw calls y 14k triángulos; escondiendo el suelo, 60 fps. Entonces: el
     suelo se EMBALDOSA con una malla sola de color por vértice (pasto, vereda y
     asfalto sin capas superpuestas, antes eran tres pantallas de relleno), lo
     plano y horizontal va con MeshBasicMaterial (una superficie horizontal con luz
     hemisférica + sol da color constante: el Lambert por fragmento no aportaba
     nada), el campo es un ANILLO y no un disco (el disco pintaba toda la pantalla
     DEBAJO del plato) y cada tipo de prop es UN InstancedMesh: 5 draw calls para
     los ~140 props, y los que caen actualizan su matriz de instancia, así que caer
     no cuesta un draw call de más.

   · LAS LUCES VAN EN UNIDADES FÍSICAS. three moderna (sin useLegacyLights) deja el
     Lambert en albedo*(intensidad/π): con hemi 1,0 + sol 0,6 el pasto #bccca6 se
     medía (70,76,78) en la captura, un gris sucio igual al asfalto. Multiplicadas
     por ~π (2,15 y 1,35) el material vuelve a verse del color que dice ser: la
     luminancia del framebuffer pasó de 86 a 140.

   · TRAGAR EN DOS TIEMPOS. Antes la cosa desaparecía de golpe. Ahora, si la cosa ES
     comible y el pozo se acerca, se INCLINA hacia el centro y se desliza (etapa 1,
     que además avisa "esto te lo podés tragar"); cuando el centro entra, se suelta
     y cae GIRANDO mientras se encoge (etapa 2), con el sonido elegido por masa
     (pop / splat / wood / boom) y con cooldown para que 20 faroles juntos no
     revienten el mezclador. Si el pozo se va, la cosa se endereza.

   · CRECER SE SIENTE: la cámara se aleja con el radio (d = 8,6 + r*4,1), cada
     escalón entero de radio suena 'power' + tiembla + anillo, y el borde del pozo
     es un aro brillante con halo que crecen con él.

   · MODELOS: auto, árbol y casa salen de Higgsfield. image_to_3d devuelve 28 mil
     triángulos con textura de 2048; ag/bake.py los baja a 1,3-2,4 mil agrupando
     vértices en grilla y HORNEA el color de la textura en COLOR_0 (promediando
     colores, no UV: promediar UV rompe en las costuras), con las caras planas.
     Además les baja la saturación un 22%, porque el texturizador devolvía la copa
     del árbol en (78,235,66), un verde de neón. Se normalizan por HUELLA y no por
     alto: lo que decide si algo entra es el radio, así que lo que se dibuja tiene
     que medir lo mismo que se calcula (con altura, la casa se dibujaba con 2,9 de
     radio y la tragaba un pozo de 2,4).
   ========================================================================== */
const G={
  slug:'agujero',name:'AGUJERO',
  title:'A<em>GUJERO</em>',
  sub:'Movés el pozo con el dedo y te tragás el barrio.',
  subKey:'sub',
  acc:'#c084fc',acc2:'#8b5cf6',levels:6,bestKey:'mass',bestLabel:'MASA',
  glbTris:300,   /* medido: con 1200 por modelo la escena llegaba a 80.896 triángulos a 15 fps */
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
       click:A('sfx-coin.mp3'),        /* tic de los últimos 10 segundos */
       coin:A('sfx-coin.mp3'),
       tap:A('sfx-pop.mp3'),           /* botones (sfx-tap está casi mudo) */
       win:A('sfx-power.mp3'),lose:A('sfx-groan.mp3')},
  glb:{auto:A('m-agujero-auto.glb'),arbol:A('m-agujero-arbol.glb'),casa:A('m-agujero-casa.glb')},
  i18n:{
    es:{sub:'Movés el pozo con el dedo y te tragás el barrio: cada cosa que cae te agranda. Los rivales comen la misma cuadra y el pozo grande se traga al chico.',
      mass:'MASA',time:'TIEMPO',you:'VOS',rival:'RIVAL',
      hint:'ARRASTRÁ PARA MOVER EL POZO',hint2:'primero lo chico',
      grew:'¡MÁS GRANDE!',last10:'¡ÚLTIMOS 10 SEGUNDOS!',
      ateRival:'¡TE COMISTE UN RIVAL!',eaten:'¡UN RIVAL TE MORDIÓ!',
      first:'¡PRIMER PUESTO!',place:'PUESTO',
      yourMass:'Tu masa',rivals:'Rivales',swallowed:'Cosas tragadas',hood:'BARRIO'},
    en:{sub:'Drag the pit around and swallow the block: everything that falls in makes you bigger. Rival pits eat the same street, and the big pit swallows the small one.',
      mass:'MASS',time:'TIME',you:'YOU',rival:'RIVAL',
      hint:'DRAG TO MOVE THE PIT',hint2:'small stuff first',
      grew:'BIGGER!',last10:'LAST 10 SECONDS!',
      ateRival:'YOU ATE A RIVAL!',eaten:'A RIVAL BIT YOU!',
      first:'FIRST PLACE!',place:'PLACE',
      yourMass:'Your mass',rivals:'Rivals',swallowed:'Things swallowed',hood:'BLOCK'},
    pt:{sub:'Arraste o buraco e engula o bairro: cada coisa que cai te deixa maior. Os rivais comem a mesma rua, e o buraco grande engole o pequeno.',
      mass:'MASSA',time:'TEMPO',you:'VOCÊ',rival:'RIVAL',
      hint:'ARRASTE PARA MOVER O BURACO',hint2:'primeiro o pequeno',
      grew:'MAIOR!',last10:'ÚLTIMOS 10 SEGUNDOS!',
      ateRival:'VOCÊ COMEU UM RIVAL!',eaten:'UM RIVAL TE MORDEU!',
      first:'PRIMEIRO LUGAR!',place:'LUGAR',
      yourMass:'Sua massa',rivals:'Rivais',swallowed:'Coisas engolidas',hood:'BAIRRO'}
  }
};
const MAP=26;                  /* medio lado de la cuadra jugable */
const PLATE=MAP+4;             /* plato del barrio (más grande que lo jugable) */
const FENCE=MAP+1.6;           /* vereda + seto: tapa el canto y marca el límite */
const FIELD=150;               /* campo lejano: nunca se ve un borde */
const ROADS=[-22,-11,0,11,22];
const COL={grass:'#b0c983',field:'#9fbb78',road:'#4d535b',line:'#c9cfb4',
  curb:'#9aa4ad',hedge:'#3d7a4b',hedge2:'#2f5f3a'};
let T3,scene,cam,gp={dpr:1.75,part:1,sh:1,fog:1};
let props=[],holes=[],ims=[],time=0,lvl=1,drag=null,dirv={x:0,z:0},done=false;
let camD=14,grace=0,hintT=0,lastSec=-1,warned=false,infoCache='';
let eaten=0,sndS=0,sndB=0,flash=0,city=null,fieldM=null,txN=0;
const KGEO={};                                  /* geometría+material por tipo */
let M4,QT,EU,V3,V3b,PV,WHITE;                   /* se crean en init (T3 recién ahí) */

/* ---- tipos de prop: radio (lo que hay que medir para comerlo), masa y alto ---- */
const K={
  farol :{r:.50,mass:1 ,h:2.6},
  banco :{r:.66,mass:2 ,h:.8},
  arbol :{r:.88,mass:4 ,h:2.5,glb:'arbol'},
  auto  :{r:1.16,mass:9 ,h:1.45,glb:'auto'},
  kiosco:{r:1.60,mass:20,h:2.4},
  casa  :{r:2.20,mass:44,h:4.4,glb:'casa'}
};
function radiusFor(mass){return Math.sqrt(1+mass*.05)*1.06;}
/* UNA sola regla de "esto me lo puedo tragar", para el que come y para el que
   ELIGE a dónde ir. Tenerlas distintas fue el bug que trababa a los rivales:
   pickTarget aceptaba hasta r*(1,06 + hambre) y eatStep sólo hasta r*1,03, así que
   el rival se paraba encima de un auto que no podía comer, y como al vencer su
   temporizador volvía a elegir el prop MÁS CERCANO —el mismo auto, a distancia
   cero— se quedaba ahí para siempre. Medido con _agai.js: rival 1 con masa 0 a
   los 9 segundos mientras los otros iban por 39. */
const canEat=(h,p)=>p.r<=h.r*1.03;

/* ============================ GEOMETRÍA ============================
   Todo lo estático se cocina en UNA geometría con color por vértice, así el
   barrio entero (calles + veredas + cerco) es una sola malla y cada tipo de prop
   es un solo InstancedMesh. */
function bx(w,h,d,x,y,z,c,out){
  const g=new T3.BoxGeometry(w,h,d).toNonIndexed();g.translate(x,y,z);out.push({g,c});return out;
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
       una huella de 2,9 de radio y se la tragaba un pozo de 2,4: se veía que la
       casa entera cabía en un agujero más chico que ella. */
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
/* El suelo es lo que MÁS cuesta: son fragmentos a pantalla completa. Medido con
   _agperf.js en swiftshader: con el suelo visible 15 fps, escondiéndolo 60 fps, y
   eso con 20 draw calls y 14k triángulos (o sea: no es geometría, es relleno).
   Dos cosas lo arreglan:
     1. las capas planas y horizontales van con MeshBasicMaterial. Una superficie
        horizontal con luz hemisférica + sol da un color CONSTANTE, así que el
        Lambert por fragmento no aportaba nada y costaba el triple.
     2. el campo lejano es un ANILLO, no un disco: antes el disco de 150 pintaba
        toda la pantalla DEBAJO del plato (dos pantallas de relleno por cuadro). */
function buildGround(){
  if(city){scene.remove(city);city.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});}
  city=new T3.Group();
  const flat=c=>new T3.MeshBasicMaterial({color:new T3.Color(c)});
  /* CAMPO EN NEBLINA: un anillo con el color por vértice degradado hacia el cielo
     según la distancia al centro del barrio. La niebla de three depende de la
     cámara, y con la cámara pegada al pozo el afuera quedaba como una plancha de
     verde plano hasta el borde de la pantalla (P-ag-esquina-h). Este degradado es
     por distancia al BARRIO, así que el afuera se lee como bruma desde cualquier
     posición, y encima le entra la niebla normal. */
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
  const f=new T3.Mesh(fg,new T3.MeshBasicMaterial({vertexColors:true}));
  f.position.y=-.08;city.add(f);fieldM=f;
  /* SUELO EN BALDOSAS, sin capas encima: pasto, vereda y asfalto salen del color
     por vértice de UNA malla que embaldosa el plato sin superponerse. Antes eran
     tres rellenos a pantalla completa (plato + calles + veredas) y el relleno es
     lo único que cuesta en este juego. De paso desaparece el z-fighting. */
  const bands=[],cuts=[];
  for(const r of ROADS)cuts.push([r-3.3,r-2.3,1],[r-2.3,r+2.3,2],[r+2.3,r+3.3,1]);
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
  city.add(new T3.Mesh(mergeColored(p),new T3.MeshBasicMaterial({vertexColors:true})));
  /* rayas del asfalto: encima, pero ocupan cuatro pixeles */
  const l=[];
  for(const r of ROADS){
    for(let x=-PLATE+2;x<PLATE;x+=3.4)bx(1.6,.02,.17,x,.02,r,COL.line,l);
    for(let z=-PLATE+2;z<PLATE;z+=3.4)bx(.17,.02,1.6,r,.025,z,COL.line,l);
  }
  city.add(new T3.Mesh(mergeColored(l),new T3.MeshBasicMaterial({vertexColors:true})));
  /* CERCO: tiene volumen, va con luz. Es lo que tapa el canto del plato y además
     le dice al jugador dónde termina la cuadra. */
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
/* colocación con rechazo: sin esto salían casas UNA ENCIMA DE OTRA (se veía en
   A-agujero-play-h: dos techos superpuestos arriba a la izquierda) */
/* Además de no pisar otro prop, lo GRANDE no puede quedar montado en el asfalto:
   con la casa normalizada por huella (5 de ancho) y el bloque de 6,4, un jitter de
   1,1 la metía media casa en la calle (se vio en P-ag-inicio-h). Autos y faroles sí
   pueden estar sobre la calzada y la vereda: es su lugar. */
function free(x,z,r,calle){
  if(Math.abs(x)>MAP-.8||Math.abs(z)>MAP-.8)return false;
  if(!calle)for(const rd of ROADS){
    if(Math.abs(x-rd)<2.3+r*.9||Math.abs(z-rd)<2.3+r*.9)return false;
  }
  for(const q of props){
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
        tint:rnd(.9,1.09)});
      return true;
    }
  }
  return false;
}
function blockOf(cx,cz,kind){
  if(kind==='casa'){
    place('casa',cx,cz,.35);
    place('arbol',cx-2.3,cz-2.3,.7);place('arbol',cx+2.3,cz+2.3,.7);
    place('banco',cx+2.4,cz-2.3,.6);place('farol',cx-2.4,cz+2.4,.5);
  }else if(kind==='comercio'){
    place('kiosco',cx,cz,.7);
    place('auto',cx-2.2,cz+2.2,.8);place('auto',cx+2.2,cz-2.2,.8);
    place('farol',cx+2.5,cz+2.5,.5);place('banco',cx-2.5,cz-2.4,.6);
  }else if(kind==='plaza'){
    for(let i=0;i<4;i++)place('arbol',cx+rnd(-2.3,2.3),cz+rnd(-2.3,2.3),1.4);
    for(let i=0;i<4;i++)place('banco',cx+rnd(-2.3,2.3),cz+rnd(-2.3,2.3),1.4);
    for(let i=0;i<3;i++)place('farol',cx+rnd(-2.4,2.4),cz+rnd(-2.4,2.4),1.4);
  }else{ /* baldío */
    for(let i=0;i<3;i++)place('arbol',cx+rnd(-2.3,2.3),cz+rnd(-2.3,2.3),1.4);
    for(let i=0;i<3;i++)place('farol',cx+rnd(-2.3,2.3),cz+rnd(-2.3,2.3),1.4);
    if(Math.random()<.6)place('auto',cx+rnd(-1.6,1.6),cz+rnd(-1.6,1.6),1.2);
  }
}
function buildCity(n){
  for(const im of ims){scene.remove(im);im.dispose();}
  ims=[];props=[];
  const part=clamp(gp.part,.5,1.35);
  /* el bloque donde arranca el jugador es SIEMPRE plaza: comida chica al toque y
     nada que lo pueda molestar en los primeros segundos */
  /* el barrio 1 tenía casa 1 de 6 y salían DOS casas en 16 manzanas: el jugador
     llegaba a masa 300 y no le quedaba nada grande para el final */
  const mix=n<=2?['plaza','plaza','baldio','casa','casa','comercio']
          :n<=4?['plaza','baldio','casa','casa','comercio','comercio']
                :['plaza','casa','casa','casa','comercio','comercio'];
  for(let bi=-2;bi<2;bi++)for(let bj=-2;bj<2;bj++){
    const cx=bi*11+5.5,cz=bj*11+5.5;
    const k=(bi===0&&bj===0)?'plaza':pick(mix);
    blockOf(cx,cz,k);
  }
  /* banda de parque entre la última calle y el cerco */
  const nb=Math.round(26*part);
  for(let i=0;i<nb;i++){
    const e=rnd(23.2,MAP-1.4)*(Math.random()<.5?-1:1);
    if(Math.random()<.5)place(Math.random()<.65?'arbol':'banco',rnd(-MAP+2,MAP-2),e,1.2);
    else place(Math.random()<.65?'arbol':'farol',e,rnd(-MAP+2,MAP-2),1.2);
  }
  /* autos estacionados sobre el asfalto */
  /* autos estacionados REPARTIDOS por las calles: eligiendo calle y lugar al azar
     salían de a ocho en la misma esquina y parecía una playa de estacionamiento */
  const na=Math.round((8+n)*part);
  for(let i=0;i<na;i++){
    const r=ROADS[i%ROADS.length],a=((i*7)%9)/9;
    const at=-MAP+4+a*(MAP*2-8)+rnd(-2,2);
    if(i%2)place('auto',at,r+(i%4<2?1.5:-1.5),1.2);
    else    place('auto',r+(i%4<2?1.5:-1.5),at,1.2);
  }
  /* RE-MEDIDO con _agperf2.js DESPUÉS de meter los GLB de Higgsfield: esconder el
     suelo casi no movía la aguja (4,6 a 6 fps) pero esconder los PROPS sí (4,6 a
     14,9 fps, de 96 743 a 4 236 triángulos). El árbol importado pesa 1306
     triángulos y son ~41 por barrio: el ÁRBOL SOLO es ~57% de todo lo que se
     dibuja (53 546 de 93 436 triángulos con un censo típico). Antes "gráficos
     bajos" sólo sacaba faroles y bancos (36-48 tris cada uno: sacar todos los que
     había no bajaba ni el 3% del total) y dejaba el árbol intacto, así que el
     ajuste de gráficos casi no cambiaba el costo real. Ahora también se ralea el
     árbol; autos y casas quedan intactos porque son la comida grande del final y
     sacarlos desbalancea quién gana. */
  if(part<.95){
    const keep=[];
    let dropSmall=Math.round(props.length*(1-part)*.8);
    let dropTrees=Math.round(props.filter(p=>p.kind==='arbol').length*(1-part)*.9);
    for(const p of props){
      if(p.kind==='arbol'&&dropTrees>0&&Math.random()<.7){dropTrees--;continue;}
      if(dropSmall>0&&p.mass<=2&&Math.random()<.6){dropSmall--;continue;}
      keep.push(p);
    }
    props=keep;
  }
  /* un InstancedMesh por tipo */
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
  }
}
function setMat(p){
  EU.set(p.rx,p.ry,p.rz);QT.setFromEuler(EU);
  V3.set(p.px,p.py,p.pz);V3b.setScalar(p.st===2?p.sc*p.shr:p.sc);
  M4.compose(V3,QT,V3b);
  p.im.setMatrixAt(p.ii,M4);p.im.instanceMatrix.needsUpdate=true;
}

/* ============================ LOS POZOS ============================ */
function mkHole(col,ai,x,z){
  const g=new T3.Group();
  const disc=new T3.Mesh(new T3.CircleGeometry(1,30),
    new T3.MeshBasicMaterial({color:new T3.Color('#05060a')}));
  disc.rotation.x=-Math.PI/2;disc.position.y=.055;g.add(disc);
  const rim=new T3.Mesh(new T3.RingGeometry(.94,1.05,30),
    new T3.MeshBasicMaterial({color:new T3.Color(col),side:T3.DoubleSide}));
  rim.rotation.x=-Math.PI/2;rim.position.y=.07;g.add(rim);
  const glow=new T3.Mesh(new T3.RingGeometry(1.05,1.34,30),
    new T3.MeshBasicMaterial({color:new T3.Color(col),side:T3.DoubleSide,
      transparent:true,opacity:.26,depthWrite:false}));
  glow.rotation.x=-Math.PI/2;glow.position.y=.062;g.add(glow);
  scene.add(g);
  return {g,disc,rim,glow,x,z,r:radiusFor(0),mass:0,ai:!!ai,col,
    t:0,since:0,sp:7.6,vx:0,vz:0,bx:x,bz:z,imm:0,ate:0,target:null,wx:null,wz:null};
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

/* ============================ CICLO ============================ */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  M4=new T3.Matrix4();QT=new T3.Quaternion();EU=new T3.Euler();
  V3=new T3.Vector3();V3b=new T3.Vector3();PV=new T3.Vector3();
  WHITE=new T3.Color('#ffffff');
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  scene.fog=new T3.Fog(new T3.Color(G.sky).getHex(),40,120);
  /* 50° y no 54: con el campo más ancho entraban ~90 unidades de barrio y los
     props quedaban de 12 px. Además el suelo es RELLENO puro y es lo único que
     cuesta (medido con _agperf2.js: 66 ms de rasterizado por cuadro contra 1 ms
     de comandos GL), así que ver menos barrio es ver mejor Y correr mejor. */
  cam=new T3.PerspectiveCamera(50,ARC.W/Math.max(1,ARC.H),.5,320);
  /* INTENSIDADES: three moderna usa unidades físicas (sin useLegacyLights), así
     que el Lambert termina en albedo*(intensidad/π). Con hemi 1.0 + sol .6 el
     barrio salía a 0,45 de su color: en la captura A-agujero-play-h el pasto
     (#bccca6) se medía (70,76,78), un gris sucio indistinguible del asfalto.
     Multiplicadas por ~π el material vuelve a verse del color que dice ser. */
  scene.add(new T3.HemisphereLight(0xffffff,0x93a884,2.15));
  const d=new T3.DirectionalLight(0xfff6e0,1.35);d.position.set(12,22,10);scene.add(d);
  gp=ARC.gfxP?ARC.gfxP():gp;
  buildGround();
  ARC.clearGL=true;
};
G.resize=function(){if(cam){cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();}};
G.gfxApply=function(p){
  gp=p||gp;
  if(fieldM)fieldM.visible=true;              /* nunca: es lo que tapa el horizonte */
};
G.start=function(l){
  if(!T3)return;
  lvl=l||1;done=false;eaten=0;flash=0;warned=false;lastSec=-1;infoCache='';
  gp=ARC.gfxP?ARC.gfxP():gp;
  if(!city)buildGround();
  buildCity(lvl);
  for(const h of holes)scene.remove(h.g);
  const nR=lvl<=2?2:3;
  /* los rivales aparecen en CRUCES de calle, no en medio de una cuadra: si nacen
     encima de los props se comen 5 de masa antes del primer cuadro y el ranking
     arranca 5 a 0 sin que el jugador haya hecho nada */
  const spots=[[-11,-11],[11,-11],[-11,11],[11,11]];
  holes=[mkHole(G.acc,false,5.5,5.5)];
  const cols=['#4dd0ff','#ff7ab8','#ffd166'];
  for(let i=0;i<nR;i++){
    const s=spots[i];
    const h=mkHole(cols[i],true,s[0],s[1]);
    /* TOPE 7,2: el jugador va a 7,6 y con 5,5+lvl*0,45 los rivales del barrio 5 y
       6 corrían MÁS que él (7,75 y 8,2). Medido con _agfull.js: en el barrio 6 el
       bot terminaba segundo 255 a 307. Que el rival sea más listo, no más rápido. */
    h.sp=Math.min(7.2,5.5+lvl*.45);h.bx=s[0]*.8;h.bz=s[1]*.8;
    holes.push(h);
  }
  time=92-lvl*4;
  camD=Math.min(24,8.6+holes[0].r*4.1);
  grace=3.4;hintT=4.6;
  window.__holes=holes;                        /* sólo para las sondas */
  hud(true);
  ARC.tray([{id:'inf',txt:ARC.T('hood')+' '+lvl,gh:1,fn:()=>ARC.toast(ARC.T('hint'))}]);
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
  const R=h.r,R2=R*1.75;
  for(const p of props){
    if(p.st===2)continue;
    const dx=h.x-p.px,dz=h.z-p.pz,d=Math.hypot(dx,dz);
    if(d>R2+p.r)continue;
    if(!canEat(h,p))continue;                 /* todavía es más grande que el pozo */
    p.touch=1;
    const nx=dx/(d||1),nz=dz/(d||1);
    if(d<R*.62){                              /* ---- se suelta ---- */
      p.st=2;p.hole=h;p.fy=-1.6;p.shr=1;
      p.spx=rnd(4,9)*(Math.random()<.5?-1:1);p.spz=rnd(3,7)*(Math.random()<.5?-1:1);
      h.mass+=p.mass;h.r=radiusFor(h.mass);h.since=0;h.ate++;
      if(h===me){
        eaten++;
        swallowSfx(p.mass);
        const sc=toScreen(p.px,K[p.kind].h*.6,p.pz);
        if(sc){txN=(txN+1)%4;
          ARC.fx.text(sc.x+(txN-1.5)*14,sc.y-txN*7,'+'+Math.round(p.mass),
            {color:'#f3e8ff',size:Math.max(13,ARC.H*.042),life:.7});}
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
/* el sonido lo elige la MASA de lo que cae, y con cooldown: veinte faroles
   entrando juntos disparaban veinte fuentes y el limitador del motor aplastaba
   todo. Dos cooldowns, uno para lo chico y uno para lo grande, así el derrumbe de
   una casa nunca se pierde por culpa de un banco. */
function swallowSfx(m){
  if(m>=18){if(sndB>0)return;sndB=.22;ARC.sfx('boom',{rate:rnd(.9,1.05),vol:1});return;}
  if(sndS>0)return;sndS=.055;
  if(m>=7)ARC.sfx('glass',{rate:rnd(.82,.95),vol:.75});
  else if(m>=3)ARC.sfx('wood',{rate:rnd(.95,1.1),vol:.7});
  else ARC.sfx('pop',{rate:rnd(1.2,1.5),vol:.55});
}
/* ---- IA: nunca se queda quieta ---- */
/* Elegir objetivo: PRIMERO lo que hay a mano. Medido con _agai.js: con un puntaje
   global (distancia − masa) el rival 1 se pasó 15 segundos cruzando el barrio
   hacia un farol del borde mientras su masa quedaba clavada en 84,3. Ahora sólo
   mira lo que está a menos de CERCA y, si su zona quedó pelada, recién entonces
   sale a buscar lo más próximo del resto. */
function pickTarget(h){
  let best=null,bd=1e9,far=null,fd=1e9;
  const CERCA=16;
  for(const p of props){
    if(p.st===2||!canEat(h,p))continue;
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
  if(h.t<=0||!h.target||h.target.st===2){h.t=rnd(.45,1.05);pickTarget(h);}
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
G.step=function(dt){
  if(!T3||done||!holes.length)return;
  time-=dt;grace=Math.max(0,grace-dt);hintT=Math.max(0,hintT-dt);
  sndS=Math.max(0,sndS-dt);sndB=Math.max(0,sndB-dt);flash=Math.max(0,flash-dt*1.5);
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
       masa a los 40 s te deja sin partida: medido con _agfull.js, el bot terminó
       cuarto con 67 en el barrio 4 después de que lo mordieran varias veces) y un
       cuarto con piso de 6 si es un rival. Y 2,2 s de inmunidad para los dos: sin
       eso el pozo grande te comía tres veces en dos segundos. */
    b.mass=b===me?b.mass*.45:Math.max(b.mass*.25,6);
    b.r=radiusFor(b.mass);b.since=0;b.imm=2.2;
    const s=pick([[-MAP+5,-MAP+5],[MAP-5,-MAP+5],[-MAP+5,MAP-5],[MAP-5,MAP-5]]);
    b.x=s[0];b.z=s[1];b.vx=b.vz=0;b.target=null;
    if(a===me){ARC.toast(ARC.T('ateRival'));ARC.sfx('power');ARC.shake(9);flash=1;}
    else if(b===me){ARC.toast(ARC.T('eaten'));ARC.sfx('lose',{vol:.8});ARC.shake(11);flash=1;}
  }
  /* separación: sin esto dos rivales quedaban pegados peleando por el mismo banco */
  for(let i=0;i<holes.length;i++)for(let j=i+1;j<holes.length;j++){
    const a=holes[i],b=holes[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1;
    const mn=(a.r+b.r)*.85;
    if(d<mn){const f=(mn-d)*.5,nx=dx/d,nz=dz/d;
      if(a.ai){a.x-=nx*f;a.z-=nz*f;}
      if(b.ai){b.x+=nx*f;b.z+=nz*f;}}
  }
  /* la cosa que quedó inclinada y el pozo se fue: se endereza (si no, el barrio
     quedaba lleno de árboles chuecos apuntando a ninguna parte) */
  for(const p of props){
    if(p.st!==1||p.touch)continue;
    p.tilt=Math.max(0,p.tilt-dt*1.8);
    p.rx=p.tilt*(p.tnz||0);p.rz=-p.tilt*(p.tnx||0);
    if(p.tilt<=0){p.st=0;p.rx=p.rz=0;}
    setMat(p);
  }
  /* cosas cayendo: giran, se encogen y desaparecen bajo el suelo */
  for(const p of props){
    if(p.st!==2)continue;
    if(p.sc*p.shr<=.001)continue;
    p.fy-=15*dt;p.py+=p.fy*dt;
    p.px=lerp(p.px,p.hole.x,1-Math.pow(.05,dt));
    p.pz=lerp(p.pz,p.hole.z,1-Math.pow(.05,dt));
    p.rx+=p.spx*dt;p.rz+=p.spz*dt;p.ry+=p.spx*.4*dt;
    p.shr=Math.max(0,p.shr-dt*.85);
    if(p.py<-5||p.shr<=0){p.shr=0;}
    setMat(p);
  }
  /* crecer se siente */
  if(Math.floor(me.r)>r0){
    ARC.sfx('power',{rate:1+ (Math.floor(me.r)-1)*.06,vol:.7});
    ARC.shake(6);ARC.toast(ARC.T('grew'));
    const hs=toScreen(me.x,0,me.z);
    if(hs)ARC.fx.ring(hs.x,hs.y,{r:Math.max(50,ARC.H*.3),life:.55,color:'#fff',w:5});
  }
  /* últimos 10 segundos */
  const s=Math.max(0,Math.ceil(time));
  if(s<=10&&s>0){
    if(!warned){warned=true;ARC.toast(ARC.T('last10'),1400);ARC.vib(40);}
    if(s!==lastSec){lastSec=s;ARC.sfx('click',{rate:1.45,vol:.42});flash=1;}
  }
  hud();
  if(time<=0){
    done=true;
    const rank=holes.slice().sort((a,b)=>b.mass-a.mass);
    const pos=rank.indexOf(me)+1,win=pos===1;
    const gap=me.mass/Math.max(1,rank[1]===me?rank[0].mass:rank[1].mass);
    ARC.over({win,score:Math.round(me.mass),
      stars:win?(gap>1.7?3:(gap>1.25?2:1)):0,
      title:win?ARC.T('first'):(ARC.T('place')+' '+pos),
      coins:Math.round(me.mass/3),
      sub:ARC.T('yourMass')+': <b>'+Math.round(me.mass)+'</b> · '+ARC.T('swallowed')+': '+eaten
        +'<br>'+ARC.T('rivals')+': '+rank.filter(h=>h!==me).map(h=>Math.round(h.mass)).join(' · ')});
  }
};

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
  /* la cámara se aleja con el radio: crecer se SIENTE (y el barrio se lee) */
  /* TOPE 24: el barrio mide 55 de lado; sin tope, con el pozo enorme la cámara
     llegaba a ver 100 de ancho y media pantalla era campo vacío (P-ag-final10-v).
     A 24 se ve ~80: el barrio con un margen de bruma alrededor. */
  camD=lerp(camD,Math.min(24,8.6+me.r*4.1),.09);
  /* CAJA DE CÁMARA: la cámara deja de seguir al pozo cerca del borde y el pozo se
     va corriendo del centro de la pantalla. Siguiéndolo hasta la esquina, media
     pantalla era campo vacío (P-ag-esquina2-v). Se clampea sin girar en Y: si se
     corriera la cámara en X mirando al pozo, las calles saldrían en diagonal y el
     barrio se leería mucho peor. */
  const CL=Math.max(4,MAP-camD*.4),CLZ=Math.max(4,MAP-camD*.34);
  const cx=clamp(me.x,-CL,CL),cz=clamp(me.z,-CLZ,CLZ);
  cam.position.set(cx,camD*1.5,cz+camD*.95);
  cam.lookAt(cx,0,cz-camD*.12);
  /* niebla relativa a la cámara: fija, al crecer el pozo el suelo de abajo
     entraba en la niebla y la pantalla se lavaba (medido con snapGL) */
  const cd=Math.hypot(camD*1.5,camD*.95),fk=clamp(gp.fog,.65,1.3);
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
     los rivales: si iba antes, la marca de un rival que estaba arriba a la
     izquierda le quedaba encima y se leía como una barra rota (P-ag-esquina-h) */
  const drawRank=()=>{
  rrect(g,x0,y0,w,hh,fs*.5);
  g.fillStyle='rgba(8,11,16,.74)';g.fill();   /* a .55 se veía el barrio a través y las filas se ensuciaban */
  g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=1;g.stroke();
  const top=Math.max(1,rank[0].mass);
  /* columnas fijas: puesto · chapa de color · nombre · barra · masa. La versión
     anterior ponía "VOS" arriba de la barra y se montaba con la fila de encima. */
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
    g.fillText(mine?ARC.T('you'):('R'+holes.indexOf(h)),cNm,mid);
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
     fuera de cuadro (antes un rival podía comerte sin que supieras dónde estaba) */
  for(let i=1;i<holes.length;i++){
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
         panel de puestos y se leía como una barra rota — se vio en P-ag-esquina-h) */
      const cx=ARC.W/2,cy=ARC.H/2,m=fs*1.6;
      let dx=sc.x-cx,dy=sc.y-cy;const L=Math.hypot(dx,dy)||1;
      dx/=L;dy/=L;
      const t=Math.min(Math.abs((ARC.W/2-m)/(dx||1e-6)),Math.abs((ARC.H/2-m)/(dy||1e-6)));
      let mx=cx+dx*t,my=cy+dy*t;
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
  drawRank();
  /* aviso de los últimos segundos: marco rojo que late */
  if(flash>.01){
    const lw=Math.max(5,ARC.H*.03);
    g.strokeStyle='rgba(255,64,64,'+(flash*.6).toFixed(3)+')';
    g.lineWidth=lw;g.strokeRect(lw/2,lw/2,ARC.W-lw,ARC.H-lw);
    g.strokeStyle='rgba(255,150,150,'+(flash*.5).toFixed(3)+')';
    g.lineWidth=lw*.35;g.strokeRect(lw*1.2,lw*1.2,ARC.W-lw*2.4,ARC.H-lw*2.4);
  }
  if(hintT>0){
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

/* ============================ SONDA ============================ */
G.dbg={
  state:()=>({mass:Math.round(holes[0]?holes[0].mass:0),
    r:+(holes[0]?holes[0].r:0).toFixed(2),
    time:+time.toFixed(1),props:props.filter(p=>p.st!==2).length,
    eaten,rivals:holes.slice(1).map(h=>Math.round(h.mass)),
    rank:1+holes.filter(h=>h!==holes[0]&&h.mass>holes[0].mass).length,
    tris:Object.keys(KGEO).map(k=>k+':'+KGEO[k].tris+(KGEO[k].glb?'g':'b')).join(' '),
    censo:(()=>{const o={};for(const p of props)o[p.kind]=(o[p.kind]||0)+1;return o;})(),
    draws:ims.length,done,lvl}),
  /* palanca para las pruebas: poner el pozo en una esquina o darle masa, que es
     como se comprueba que el cerco tapa el canto y que la cámara se aleja */
  set:o=>{
    if(!holes.length)return null;
    const h=holes[0];
    if(o.x!=null)h.x=o.x;if(o.z!=null)h.z=o.z;
    if(o.mass!=null){h.mass=o.mass;h.r=radiusFor(o.mass);camD=Math.min(24,8.6+h.r*4.1);}
    if(o.time!=null)time=o.time;
    if(o.hint!=null)hintT=o.hint;
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
      if(p.st===2)continue;
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
  if(!holes.length)return;
  ARC.trayTxt('inf',ARC.T('hood')+' '+lvl);
  infoCache='';hud(true);
};
window.GAME=G;
