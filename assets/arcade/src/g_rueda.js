/* ============================================================================
   RUEDA NEÓN — la pelota que corre por una pista de neón en el vacío
   ----------------------------------------------------------------------------
   La pelota avanza sola; el dedo la mueve de costado. La pista tiene AGUJEROS
   (te caés), MUROS (te frenan), SIERRAS que giran y DIAMANTES para juntar.
   8 niveles con pista fija (semilla por nivel: mismo nivel = misma pista, se
   aprende de memoria) y un ARCO DE CONTROL a la mitad que te devuelve una vez.

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
               además travesaños cada 4 m y las chapas de aviso de peligro;
       propM   columnas del vacío (paralaje), densidad de ARC.gfxP().part.
     La niebla ya no es negra: es un azul-verdoso (#0a2b3c) y arranca lejos, así
     la distancia se lee como BRUMA y no como pozo negro.
   · AVISOS DE PELIGRO. Cada muro/sierra deja (a) una chapa magenta con galón en
     la baldosa 2 m antes, (b) una sombra oscura en su propia baldosa y (c) un
     galón 2D pulsante proyectado en pantalla mientras está entre 5 y 26 m. A la
     velocidad del nivel 8 (11,3 m/s) eso son 2,3 s de aviso.
   · EL PUESTO DE CONTROL SE VE EN LA PISTA: es un ARCO (GLB si cargó, si no
     geometría) con una franja ancha cruzando la pista, y el arco y su franja NO
     tienen niebla, así se ven venir desde 150 m. Al pasarlo la franja cambia de
     magenta a verde y el arco se enciende. La meta es otro arco con cuadros.
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
     nivel 8 = 390 m a 11,3 m/s con sierras que barren carriles (35 s).
   · CAMINO GARANTIZADO. Se lleva un carril "camino" que se corre como máximo un
     carril cada `shift` metros y nunca se le hace un agujero ni se le pone un
     obstáculo; se protegen también los carriles del metro anterior y siguiente
     porque la pelota tarda 0,14 s en cruzar de carril y a 11 m/s eso es 1,6 m.
     Sin esto la pista aleatoria arma filas imposibles (medido: caída al vacío a
     los 41 m de 208 sin haber tocado nada evitable).
   · DIAMANTES: se juntan de a tandas SOBRE el camino, cuentan para las estrellas
     (85% = 3, 55% = 2) y se guardan en ARC.S.gems (total) y ARC.S.gemLv[nivel]
     (mejor por nivel).
   · EL PILOTO (dbg.autoMove) hace programación dinámica sobre 16 filas con la
     velocidad LATERAL real (una fila no alcanza para cambiar de carril a 11 m/s:
     hacen falta 1,7) y predice dónde va a estar la sierra que se mueve cuando la
     pelota llegue. autoMove() además ENCIENDE el piloto: el bot sigue
     recalculando en cada paso fijo, porque la sonda lo llama cada 500 ms y en
     ese tiempo la pelota recorre 4 m (así se moría a los 24 m de 208).
   ========================================================================== */
const G={
  slug:'rueda',name:'RUEDA NEON',
  title:'RUEDA <em>NEÓN</em>',
  sub:'Pista de neón en el vacío: esquivá agujeros, muros y sierras, juntá diamantes y llegá a la meta.',
  subKey:'sub',
  acc:'#22d3ee',acc2:'#0891b2',levels:8,bestLabel:'METROS',bestKey:'metL',
  three:true,sky:'#04070e',shadows:false,
  art:A('art-rueda.jpg'),music:A('mus-rueda-neon.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),
       lose:A('sfx-lose.mp3'),boom:A('sfx-boom.mp3'),power:A('sfx-power.mp3'),chime:A('sfx-chime.mp3'),
       gem:A('sfx-rueda-gem.mp3'),saw:A('sfx-rueda-saw.mp3'),check:A('sfx-rueda-check.mp3')},
  glb:{sierra:A('m-rueda-sierra.glb'),arco:A('m-rueda-arco.glb')},
  i18n:{
    es:{sub:'Pista de neón en el vacío: esquivá agujeros, muros y sierras, juntá diamantes y llegá a la meta. 8 niveles, arco de control a la mitad.',
      metL:'METROS',tutDrag:'ARRASTRÁ PARA MOVERTE',tutSide:'o usá ◀ ▶',
      cpGot:'ARCO DE CONTROL',cpBack:'¡VOLVÉS AL ARCO!',goal:'¡META!',
      dFall:'AL VACÍO',dHit:'CHOCASTE',dSaw:'TE CORTÓ LA SIERRA',
      statMet:'Metros',statGems:'Diamantes',usedCp:'Usaste el arco de control',
      warn:'¡PELIGRO!',gemsAll:'¡TODOS LOS DIAMANTES!',newRec:'¡NUEVO RÉCORD!'},
    en:{sub:'A neon track in the void: dodge holes, walls and saws, grab diamonds and reach the goal. 8 levels, one checkpoint arch halfway.',
      metL:'METRES',tutDrag:'DRAG TO MOVE',tutSide:'or use ◀ ▶',
      cpGot:'CHECKPOINT ARCH',cpBack:'BACK TO THE ARCH!',goal:'GOAL!',
      dFall:'INTO THE VOID',dHit:'CRASHED',dSaw:'THE SAW GOT YOU',
      statMet:'Metres',statGems:'Diamonds',usedCp:'You used the checkpoint',
      warn:'DANGER!',gemsAll:'ALL THE DIAMONDS!',newRec:'NEW BEST!'},
    pt:{sub:'Pista de neon no vazio: desvie de buracos, muros e serras, junte diamantes e chegue à meta. 8 níveis, arco de controle no meio.',
      metL:'METROS',tutDrag:'ARRASTE PARA MOVER',tutSide:'ou use ◀ ▶',
      cpGot:'ARCO DE CONTROLE',cpBack:'VOLTA AO ARCO!',goal:'META!',
      dFall:'NO VAZIO',dHit:'VOCÊ BATEU',dSaw:'A SERRA TE PEGOU',
      statMet:'Metros',statGems:'Diamantes',usedCp:'Você usou o arco de controle',
      warn:'PERIGO!',gemsAll:'TODOS OS DIAMANTES!',newRec:'NOVO RECORDE!'}
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
/* CURVA DE DIFICULTAD, a mano y medida con el piloto (ver informe):
   len metros · spd m/s · clean metros limpios al empezar · shift metros mínimos
   entre corrimientos del camino · hole/narrow/wall/saw/mov probabilidad por metro
   (los diamantes van por reparto fijo, ver más abajo) */
const LV=[
  {len:112,spd:6.0 ,clean:34,shift:5,hole:.10,narrow:0  ,wall:.055,saw:0   ,mov:0  },
  {len:140,spd:6.7 ,clean:30,shift:4,hole:.14,narrow:.04,wall:.075,saw:.03 ,mov:0  },
  {len:172,spd:7.4 ,clean:28,shift:4,hole:.18,narrow:.07,wall:.090,saw:.055,mov:0  },
  {len:205,spd:8.1 ,clean:26,shift:3,hole:.22,narrow:.10,wall:.100,saw:.075,mov:0  },
  {len:240,spd:8.8 ,clean:26,shift:3,hole:.25,narrow:.13,wall:.110,saw:.090,mov:0  },
  {len:280,spd:9.6 ,clean:24,shift:3,hole:.28,narrow:.16,wall:.120,saw:.105,mov:.05},
  {len:330,spd:10.4,clean:24,shift:3,hole:.31,narrow:.19,wall:.130,saw:.120,mov:.07},
  {len:390,spd:11.3,clean:22,shift:3,hole:.34,narrow:.22,wall:.140,saw:.135,mov:.09}
];
/* paleta (una sola fuente de verdad: el arte del menú) */
const PAL={t0:'#2aa9cb',t1:'#1d8bab',skirt:'#0b4b60',rail:'#8ff4ff',bar:'#3fd8f0',
  fin:'#1a6d86',danger:'#ff2d78',dangerD:'#7a0f33',shadow:'#04121a',wall:'#ff4f92',
  wallTop:'#ffd0e4',gem:'#c9f7ff',cp:'#ffb03a',cpOn:'#43e57a',prop:'#071a26',
  propTop:'#0f303f',fog:'#0a2b3c'};

let T3,scene,cam,ball,ballGlow,ballSh,trackG,dynG,propM,tilesM,glowM;
let cells=[],obs=[],gems=[],pathL=[],sawG=[],gemG=[];
let cpArch=null,finArch=null,cpBand=null,cpBandOn=null;
let lvl=1,LEN=0,SPD=0,CPZ=0;
let bx=0,tx=0,bz=0,vz=0,fallV=0,dead=0,won=false,drag=null;
let pbx=0,pbz=0,hudM=-1;                     /* estado anterior: interpolación al dibujar */
let gemN=0,gemT=0,cpOn=0,cpUsed=0,tilt=0,warm=0,lastDie='',dieK='';
let botOn=0,sawSnd=0,recTold=false;
let partK=1,fogK=1,decoK=1,SAWGLB=false,ARCGLB=false;
const MAT={},GEO={},V3=[];
function vec(){if(!V3.length)V3.push(new T3.Vector3());return V3[0];}
function mat(c,e){const k=c+(e?'e':'');if(MAT[k])return MAT[k];
  return MAT[k]=e?new T3.MeshBasicMaterial({color:new T3.Color(c)})
                 :new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function box(w,h,d){const k=w+'_'+h+'_'+d;return GEO[k]||(GEO[k]=new T3.BoxGeometry(w,h,d));}
function octa(r){const k='o'+r;return GEO[k]||(GEO[k]=new T3.OctahedronGeometry(r));}
function C(h){const c=new T3.Color(h);return[c.r,c.g,c.b];}
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
  LEN=P.len;SPD=P.spd;CPZ=Math.round(LEN/2);
  const R=rng(4177+n*977);
  cells=[];obs=[];gems=[];pathL=[];sawG=[];gemG=[];
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
      }else if(r<P.wall+P.saw+P.mov&&rowSolid(z)&&noObsNear(z,3)){
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
  /* 4) mallas */
  buildMeshes();
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

function buildMeshes(){
  const TA=A0(),GA=A0();
  const t0=C(PAL.t0),t1=C(PAL.t1),sk=C(PAL.skirt),rl=C(PAL.rail),br=C(PAL.bar);
  const dg=C(PAL.danger),sh=C(PAL.shadow);
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
  /* muros y avisos */
  for(const o of obs){
    if(o.t==='wall'){
      bq(TA,o.x,0,-o.z,CW*.92,.82,.34,C(PAL.wallTop),C(PAL.wall));
      plate(GA,o.x,-o.z,CW*.9,.3,.83,C(PAL.wallTop));
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
      const p=new T3.Mesh(box(.42,2.5,.42),mat('#123241',1));
      p.position.set(s*(W/2-.2),1.25,0);g.add(p);
      const e=new T3.Mesh(box(.48,.16,.48),mat(cc,1));
      e.position.set(s*(W/2-.2),2.5,0);g.add(e);
      const f=new T3.Mesh(box(.07,2.4,.5),mat(cc,1));
      f.position.set(s*(W/2-.2)+s*.24,1.25,0);g.add(f);
    }
    const b=new T3.Mesh(box(W,.42,.42),mat('#123241',1));
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
function die(kind){
  if(dead||won)return;
  dead=1;dieK=kind;fallV=0;
  lastDie=kind+'@'+bz.toFixed(1)+' x='+bx.toFixed(2);
  ARC.sfx(kind==='fall'?'lose':'boom');ARC.shake(kind==='fall'?7:13);
  ARC.fx.burst(ARC.W/2,ARC.H*.62,{n:22,color:PAL.danger,speed:260,size:5,life:.6});
  if(kind!=='fall')ARC.vib(70);
  setTimeout(()=>{
    if(!dead)return;
    if(cpOn&&!cpUsed){
      cpUsed=1;bz=CPZ;bx=tx=lx(pathL[CPZ]);dead=0;warm=0;fallV=0;
      ball.position.set(bx,BR,-bz);
      ARC.toast(T('cpBack'));ARC.sfx('power');
      return;
    }
    saveGems();
    ARC.over({win:false,score:Math.round(bz),stars:0,
      title:kind==='fall'?T('dFall'):(kind==='saw'?T('dSaw'):T('dHit')),
      sub:T('statMet')+': '+Math.round(bz)+'/'+LEN+'<br>'+T('statGems')+': '+gemN+'/'+gemT+
        ' &nbsp;·&nbsp; ◆ '+(ARC.S.gems||0)});
  },700);
}
function saveGems(){
  if(!gemN)return;
  ARC.S.gems=(ARC.S.gems||0)+gemN;
  if(!ARC.S.gemLv)ARC.S.gemLv={};
  const k=String(lvl);
  if((ARC.S.gemLv[k]||0)<gemN)ARC.S.gemLv[k]=gemN;
  ARC.save();
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
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  const p=ARC.gfxP?ARC.gfxP():{part:1,fog:1,sh:1};
  partK=p.part;fogK=p.fog;decoK=clamp(p.part,.4,1.35);
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
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
  const S0=ARC.glb&&ARC.glb.sierra,A1=ARC.glb&&ARC.glb.arco;
  SAWGLB=!!(S0&&S0.scene);ARCGLB=!!(A1&&A1.scene);
  ARC.clearGL=true;
};
G.resize=function(){if(cam){cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();}};
G.gfxApply=function(p){
  const wasGlb=partK>=.7;
  partK=p.part;fogK=p.fog;decoK=clamp(p.part,.4,1.35);
  if(scene&&scene.fog){scene.fog.near=46*fogK;scene.fog.far=132*fogK;}
  if(trackG&&cells.length){buildProps();if(wasGlb!==(partK>=.7))buildDyn();}
};
function sawGlb(){
  /* el GLB de la sierra tiene 28,7 k triángulos: con 50 sierras en el nivel 8
     serían 350 k por cuadro. Se usa SÓLO en las cercanas (ver LODZ) y sólo en
     gráficos Alto/Ultra; el resto lleva la sierra de geometría, que a 30 m se ve
     igual (medido: 354 k triángulos por cuadro contra 96 k). */
  if(SAWGLB&&partK>=.7)return glbNode('sierra',1.12);
  return null;
}
/* sierra de geometría en UNA malla fusionada: antes era un grupo de 13 mallas y
   con 12 sierras en pantalla el cuadro se iba a 180 llamadas de dibujo (medido
   con renderer.info: 189). Fusionada son 12 llamadas. */
function sawGeo(){
  if(GEO.saw)return GEO.saw;
  const A=A0(),N=12,R0=.44,TZ=.07;
  const dk=C('#16303f'),lt=C('#24586f'),dg=C(PAL.danger),hb=C('#7ef0ff');
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
/* sierras y diamantes: mallas propias porque giran. Se rearman también cuando
   cambian los gráficos (la sierra pasa de modelo a geometría). */
function buildDyn(){
  clearG(dynG);sawG=[];gemG=[];
  for(const o of obs){
    if(o.t!=='saw')continue;
    const m=sawMesh();
    m.position.set(o.x,.62,-o.z);
    dynG.add(m);o.m=m;
    const gl=sawGlb();
    if(gl){gl.position.set(o.x,.62,-o.z);gl.visible=false;dynG.add(gl);o.mg=gl;}
    else o.mg=null;
    sawG.push(o);
  }
  const gg=octa(.30);
  for(const gm of gems){
    const m=new T3.Mesh(gg,mat(PAL.gem,1));
    m.position.set(gm.x,.62,-gm.z);
    m.visible=!gm.got;
    dynG.add(m);gm.m=m;gemG.push(m);
  }
}
G.start=function(l){
  if(!T3)return;
  lvl=clamp(l||1,1,8);
  buildTrack(lvl);
  bx=tx=lx(pathL[0]);bz=0;vz=0;dead=0;won=false;gemN=0;cpOn=0;cpUsed=0;
  warm=0;fallV=0;tilt=0;drag=null;botOn=0;sawSnd=0;recTold=false;lastDie='';
  cpBand.visible=true;cpBandOn.visible=false;
  ball.position.set(bx,BR,0);ball.rotation.set(0,0,0);
  buildDyn();
  hudM=-1;hud();
  ARC.tray([
    {id:'lf',txt:'◀',gh:1,fn:()=>nudge(-1)},
    {id:'rt',txt:'▶',gh:1,fn:()=>nudge(1)}
  ]);
};
function hud(){
  ARC.hud(Math.round(bz),T('level')+' '+lvl+' · '+Math.round(bz)+'/'+LEN+' m');
}
G.i18nDone=function(){if(ARC.scr==='game'&&cells.length)hud();};
G.step=function(dt){
  if(!T3||won)return;
  pbx=bx;pbz=bz;
  /* la sierra gira y barre siempre (también en la caída, queda más vivo).
     CULLING: lo que está a más de 90 m no se dibuja (con 50 sierras y 90
     diamantes eran 140 llamadas de dibujo por cuadro para cosas que están
     detrás de la bruma) */
  const t=ARC.t;
  for(const o of sawG){
    const d=o.z-bz;
    const vis=d>-4&&d<90,near=vis&&!!o.mg&&d<LODZ;
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
    return;
  }
  if(botOn)botPlan();
  /* rampa de arranque: 55% de la velocidad los primeros 2,6 s */
  warm=Math.min(1,warm+dt/2.6);
  vz=SPD*(.55+.45*warm);
  bz+=vz*dt;
  /* movimiento lateral REAL (bx es la posición, tx el destino del dedo) */
  const dx=tx-bx,mx=LSP*dt;
  bx+=Math.abs(dx)<=mx?dx:(dx>0?mx:-mx);
  /* PISO con 12 cm de perdón: la pelota mide 84 cm, así que con el centro justo
     en el filo del agujero seguir apoyado es lo que se ve en pantalla (y con el
     centro pelado era una moneda al aire cada vez que se cruzaba un hueco) */
  if(!cellAt(bx,bz)&&!cellAt(bx-.12,bz)&&!cellAt(bx+.12,bz)){die('fall');return;}
  /* choques */
  for(const o of obs){
    if(Math.abs(o.z-bz)>.55)continue;
    if(Math.abs(sawX(o,t)-bx)<o.w+.26){die(o.t==='saw'?'saw':'hit');return;}
  }
  /* zumbido de la sierra cercana */
  if(t-sawSnd>.5){
    for(const o of sawG){
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
      ARC.sfx('gem',{rate:1+Math.min(.5,gemN*.02)});
      ARC.fx.text(ARC.W/2,ARC.H*.44,'+1',{color:'#7dd3fc',size:Math.max(14,ARC.H*.05)});
      if(partK>.5)ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:6,color:PAL.gem,speed:150,size:3,life:.35});
      if(gemN===gemT&&gemT>3)ARC.toast(T('gemsAll'));
    }
  }
  /* arco de control */
  if(!cpOn&&bz>=CPZ){
    cpOn=1;cpBand.visible=false;cpBandOn.visible=true;
    ARC.toast(T('cpGot'));ARC.sfx('check');
    ARC.fx.ring(ARC.W/2,ARC.H*.5,{r:ARC.H*.5,color:PAL.cpOn,w:5,life:.5});
  }
  if(!recTold&&bz>(ARC.S.best||0)&&(ARC.S.best||0)>4&&lvl>1){recTold=true;ARC.toast(T('newRec'));}
  if(bz>=LEN){
    won=true;bz=LEN;
    let st=gemT?(gemN>=gemT*.85?3:(gemN>=gemT*.55?2:1)):3;
    if(cpUsed)st=Math.min(st,2);
    saveGems();
    ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:34,color:PAL.rail,speed:300,size:6,life:.9});
    ARC.toast(T('goal'));
    setTimeout(()=>ARC.over({win:true,score:Math.round(bz),stars:st,coins:14+gemN*2,
      sub:T('statGems')+': '+gemN+'/'+gemT+' &nbsp;·&nbsp; ◆ '+(ARC.S.gems||0)+
        (cpUsed?'<br>'+T('usedCp'):'')}),420);
    return;
  }
  if(Math.round(bz)!==hudM){hudM=Math.round(bz);hud();}
  tilt=lerp(tilt,(tx-bx)*2.4,.16);
  ball.position.set(bx,BR,-bz);
  ball.rotation.x-=vz*dt*2.3;
  ball.rotation.z=-tilt*.5;
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
G.draw=function(g,alpha){
  if(!ARC.rnd||!scene||!cells.length)return;
  /* interpolación: la simulación va a 60 Hz fijos y el celular dibuja a 30 o a
     120; sin esto la pelota tiembla en las pantallas rápidas */
  const a=clamp(alpha||0,0,1);
  const ibx=lerp(pbx,bx,a),ibz=lerp(pbz,bz,a);
  const bzz=ibz;
  ball.position.x=ibx;ball.position.z=-ibz;
  cam.position.set(ibx*.42,CAMY+(dead&&dieK==='fall'?-.4:0),-bzz+CAMZ);
  cam.lookAt(ibx*.22,.15,-bzz-AIM);
  cam.rotation.z=tilt*.018;
  ballSh.position.set(ibx,.03,-bzz);
  ballSh.visible=!dead||dieK!=='fall';
  ARC.rnd.render(scene,cam);
  /* --- capa 2D: barra, avisos, ayuda --- */
  const W=ARC.W,H=ARC.H;
  /* galones de peligro proyectados: se ven venir de lejos */
  if(!dead&&!won){
    const pulse=.55+.45*Math.sin(ARC.t*7);
    for(const o of obs){
      const d=o.z-bzz;
      if(d<3.5||d>27)continue;
      const p=proj(sawX(o,ARC.t),1.55,-o.z);
      if(p.z>1||p.x<-40||p.x>W+40)continue;
      const s=clamp(H*.035*(1-d/34),5,H*.05);
      const a=clamp((27-d)/16,.15,1)*(d<11?pulse:.72);
      g.globalAlpha=a;
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
  g.fillStyle=cpOn?PAL.cpOn:'#22d3ee';g.fillRect(bxx,byy,bw*clamp(bzz/LEN,0,1),bh);
  g.fillStyle=cpOn?PAL.cpOn:PAL.cp;g.fillRect(bxx+bw*.5-1.5,byy-3,3,bh+6);
  g.fillStyle=PAL.rail;g.fillRect(bxx+bw-2,byy-3,3,bh+6);
  /* diamantes juntados */
  g.globalAlpha=.9;g.fillStyle=PAL.gem;
  g.font='900 '+Math.max(9,H*.03)+'px system-ui,sans-serif';g.textAlign='left';
  g.fillText('◆ '+gemN+'/'+gemT,bxx,byy-Math.max(5,H*.022));
  g.globalAlpha=1;
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
/* ---------------------------------------------------------------- el piloto */
/* Seguridad de un carril en una fila, con la sierra que se mueve PREDICHA en el
   momento en que la pelota va a llegar (tres muestras: el barrido es rápido). */
function okAt(i,z,tArr){
  if(i<0||i>=LANES)return false;
  if(!cells[z]||!cells[z][i])return false;
  const x=lx(i);
  for(const o of obs){
    if(Math.abs(o.z-z)>1.05)continue;
    if(!o.amp){if(Math.abs(o.x-x)<o.w+.62)return false;continue;}
    for(const dd of [-.12,0,.12]){
      if(Math.abs(sawX(o,ARC.t+tArr+dd)-x)<o.w+.62)return false;
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
   del cruce: mover temprano no sirve si te comés el muro del vecino. */
function botPlan(){
  const z0=Math.round(bz),cur=laneOf(bx);
  const DEEP=16;
  const S=Math.max(1,Math.ceil(CW*Math.max(1,vz)/LSP));
  const tOf=d=>d/Math.max(1,vz);
  const L=[new Array(LANES).fill(null)];
  L[0][cur]={from:-1,g:0};                    /* la pelota ESTÁ acá, no hay opción */
  for(let d=1;d<=DEEP;d++){
    const prev=L[d-1],nx=new Array(LANES).fill(null);
    const can=(d%S)===0;                      /* sólo cada S filas se cambia */
    for(let i=0;i<LANES;i++){
      if(!okAt(i,z0+d,tOf(d)))continue;
      const from=can?[i,i-1,i+1]:[i];
      for(const k of from){
        if(k<0||k>=LANES||!prev[k])continue;
        /* cruce seguro: los dos carriles libres en las dos filas */
        if(k!==i&&!(okAt(i,z0+d-1,tOf(d-1))&&okAt(k,z0+d,tOf(d))))continue;
        /* PUNTAJE: diamantes primero, y después PEGARSE A LA LÍNEA DE DISEÑO
           (pathL). Sin el segundo término el plan no tenía preferencia entre
           quedarse y acompañar la línea, la pelota se quedaba pegada al carril de
           antes y cuando la línea se corría llegaba dos filas tarde y se caía
           (medido: fall@65,6 x=1,25 con la fila 66 = 11100 y la línea ya en el 1).
           La línea es la garantía del generador: siempre está sólida y sin bichos. */
        const g=prev[k].g+(gemAt(z0+d,i)?6:0)-Math.abs(i-guide(z0+d))*2.5;
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
    if(dc>0&&dc<=S+2&&canCross(path[dc],z0,S,tOf))want=path[dc];
  }else{
    /* PLAN CORTO (callejón sin salida a la vista): volver a la línea de diseño, y
       si el paso está tapado, el vecino que aguante más filas. Antes acá se
       quedaba quieto y se caía en el agujero que ya tenía debajo. */
    const gl=guide(z0+S);
    let bd=-1;
    if(gl!==cur){
      const st=cur<gl?cur+1:cur-1;
      if(canCross(st,z0,S,tOf))want=st;
    }
    if(want===cur)for(const i of [cur,cur-1,cur+1]){
      if(i<0||i>=LANES)continue;
      let d=0;while(d<8&&okAt(i,z0+d,tOf(d)))d++;
      if(d>bd){bd=d;want=i;}
    }
  }
  tx=clamp(lx(want),-HALF,HALF);
  return true;
}
function gemAt(z,i){for(const gm of gems)if(!gm.got&&gm.z===z&&gm.i===i)return 1;return 0;}
function guide(z){return pathL[clamp(z,0,pathL.length-1)];}
/* ¿Se puede empezar a rodar al carril i AHORA? Tiene que estar libre en todas las
   filas del cruce y en la de llegada. MEDIDO: el respaldo miraba UNA sola fila y
   metía la pelota en un agujero que estaba dos filas más adelante — tres muertes
   idénticas, fall@152,3 x=1,63 (nivel 4, fila 152 = 11101), fall@220,3 x=0,37
   (nivel 5) y fall@225,5 x=1,63 (nivel 6). El desplazamiento siempre era el mismo
   (0,38 del centro del carril) porque es justo donde el perdón de 12 cm del piso
   deja de alcanzar: la pelota moría al salirse del borde de la baldosa vecina. */
function canCross(i,z0,S,tOf){
  if(i<0||i>=LANES)return false;
  for(let r=0;r<=S+1;r++)if(!okAt(i,z0+r,tOf(r)))return false;
  return true;
}
G.dbg={
  state:()=>({bz:+bz.toFixed(1),LEN,lvl,gems:gemN,gemT,dead:!!dead,won,cp:cpOn,cpUsed,
    vz:+vz.toFixed(1),x:+bx.toFixed(2),bot:botOn,how:lastDie,
    obs:obs.length,saws:sawG.length,glb:{sierra:SAWGLB,arco:ARCGLB,
      tris:{sierra:SAWGLB?glbTris(ARC.glb.sierra.scene):0,arco:ARCGLB?glbTris(ARC.glb.arco.scene):0}},
    gfx:{part:partK,fog:fogK,fogN:scene&&scene.fog?+scene.fog.near.toFixed(0):0},
    saved:{gems:ARC.S.gems||0,lv:ARC.S.gemLv||{}}}),
  rows:(a,b)=>{const o=[];for(let z=a;z<=b;z++){
    const r=cells[z]?cells[z].join(''):'?';
    const ob=obs.filter(x=>x.z===z).map(x=>x.t[0]+x.i+(x.amp?'~':''));
    const gm=gems.filter(x=>x.z===z).map(x=>'d'+x.i);
    o.push(z+':'+r+' p'+pathL[z]+(ob.length?' ('+ob.join(',')+')':'')+(gm.length?' '+gm.join(','):''));}
    return o;},
  ballScreen:()=>{const p=proj(bx,BR,-bz);return{sx:+(p.x/ARC.W*100).toFixed(1),sy:+(p.y/ARC.H*100).toFixed(1)};},
  lv:()=>LV.map((p,i)=>({n:i+1,len:p.len,spd:p.spd,seg:+(p.len/p.spd).toFixed(1)})),
  i18n:()=>{const ks=Object.keys(G.i18n.es),out={};
    for(const l of ['es','en','pt']){const f=ks.filter(k=>!G.i18n[l][k]);out[l]=f.length?('FALTAN '+f.join(',')):'ok';}
    return out;},
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
