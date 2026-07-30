/* ============================================================================
   HÉLICE — la pelota que baja por la torre en espiral
   ----------------------------------------------------------------------------
   La torre es una pila de ANILLOS: cada uno tiene uno o dos huecos y algunos
   tramos ROJOS que rompen. Arrastrando se GIRA la torre (la pelota siempre cae
   por el frente, en el ángulo 0 del cilindro = eje +Z), así se busca el hueco.
   Pasar un anillo suma piso; caer sobre rojo, perder. 12 niveles: más anillos,
   huecos más chicos, más rojo, menos huecos dobles, más gravedad y desde el 5
   algunos anillos GIRAN solos.

   Lo que hay que saber antes de tocar este archivo (todo esto se midió):
     · COLISIÓN BARRIDA, no por ventana. Antes se probaba "¿la pelota está en una
       franja de 0,6 sobre el anillo?"; a 25 anillos de caída la velocidad pasa
       de 36 u/s = 0,6 u por paso y la pelota TUNELEABA anillos enteros. Ahora se
       compara el fondo de la pelota del paso anterior con el de este (cruce de
       plano) y además hay velocidad terminal (VMAX).
     · REBOTE por restitución (imp*.6 con techo 7,2), no impulso fijo. Con el
       impulso fijo de 8,4 la pelota subía 2,07 u: saltaba por encima del anillo
       anterior y quedaba rebotando sin avanzar (medido: 0 anillos en 7 s).
     · Los HUECOS se definen por su CENTRO. La versión anterior los corría media
       vuelta (`norm(h[0])+Math.PI`) y el hueco "casi al frente" del primer anillo
       caía justo ATRÁS: la partida empezaba con la pelota rebotando contra una
       pared (medido: bounces=2, passed=0 al segundo y medio, en las dos pantallas).
     · La rotación tiene TRES capas: rotT (lo que pide el dedo/el bot), rotV
       (inercia al soltar) y rot (lo que se dibuja Y con lo que se colisiona,
       suavizado hacia rotT). Colisionar con el mismo ángulo que se ve es lo que
       hace que no se sienta injusto.
     · La cámara es un resorte con ADELANTO: mira más abajo cuanto más rápido cae.
       Se mide con dbg.nx (dónde cae el próximo anillo en pantalla, 0=arriba,
       1=abajo): tiene que quedar por debajo de 1 SIEMPRE.
     · El RADAR 2D de abajo a la izquierda dibuja DOS anillos desplegados (el que
       viene y el siguiente): es lo que permite decidir antes de soltarse, no
       después. Con una sola fila, caer sobre rojo era imprevisible.
     · Los tramos rojos se leen por CUATRO cosas: rayas de peligro en el costado,
       rayas más gruesas en la TAPA (que es la cara que se mira), contorno oscuro
       (casco invertido con side:BackSide) y pulso de emisión.
     · Nada mata en los primeros segundos: el nivel 1 no tiene rojo, ningún nivel
       pone rojo en los 3 primeros anillos, los huecos de los anillos 0 y 1 salen
       casi al frente y la gravedad entra al 50% y sube en 1,2 s (gEff).
     · Las ESTRELLAS son por RACHA (anillos seguidos sin rebotar), no por terminar:
       terminar es lo normal, encadenar huecos es la habilidad.
   ========================================================================== */
const G={
  slug:'helice',name:'HELICE',
  title:'HÉ<em>LICE</em>',
  sub:'Girá la torre con el dedo y hacé caer la pelota por los huecos.',
  subKey:'sub',
  acc:'#c9a7ff',acc2:'#8b5cf6',levels:12,bestKey:'floors',bestLabel:'PISOS',
  three:true,sky:'#e9eef7',
  art:A('art-helice.jpg'),music:A('mus-helice.m4a'),
  /* Los efectos entran con nombres que YA existen en el respaldo sintetizado del
     motor (wood = golpe corto, glass = quiebre agudo): si el archivo no se
     decodifica, el blip que suena sigue siendo el correcto.
     · wood (REBOTE) = sfx-torre-drop.mp3, el golpe de losa del pack. Los tres
       intentos propios de mirelo salieron en silencio (picos 0,002 / 0,025 /
       0,031 medidos con _aud.js), y este efecto compartido pega en 2 ms con pico
       0,87: es exactamente el golpe que necesita la pelota.
     · glass y swipe son propios, recortados desde el ataque y normalizados
       (WAV de 22 kHz, 24 y 13 kB: acá no hay codificador de mp3 y mirelo dejaba
       595 ms de silencio antes del quiebre). El motor decodifica bytes, no
       extensiones, así que el .wav entra igual. */
  sfx:{tap:A('sfx-tap.mp3'),pop:A('sfx-pop.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-coin.mp3'),
       win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),power:A('sfx-power.mp3'),chime:A('sfx-chime.mp3'),
       wood:A('sfx-torre-drop.mp3'),glass:A('sfx-helice-crack.wav'),swipe:A('sfx-helice-pass.wav')},
  glb:{pelota:A('m-helice-pelota.glb')},
  i18n:{
    es:{sub:'Girá la torre con el dedo y hacé caer la pelota por los huecos. El rojo rompe. 12 niveles, cada uno más cerrado.',
      floors:'PISOS',hint:'ARRASTRÁ PARA GIRAR LA TORRE',hint2:'el rojo rompe',
      dTtl:'¡ROJO!',dSub:'Caíste sobre un tramo rojo.',
      sRings:'Anillos',sStreak:'Mejor racha',sBounce:'Rebotes',
      next:'PRÓXIMO ANILLO',perfect:'¡LIMPIO!',streak:'RACHA'},
    en:{sub:'Spin the tower with your finger and drop the ball through the gaps. Red breaks. 12 levels, each one tighter.',
      floors:'FLOORS',hint:'DRAG TO SPIN THE TOWER',hint2:'red breaks',
      dTtl:'RED!',dSub:'You landed on a red slab.',
      sRings:'Rings',sStreak:'Best streak',sBounce:'Bounces',
      next:'NEXT RING',perfect:'CLEAN!',streak:'STREAK'},
    pt:{sub:'Gire a torre com o dedo e faça a bola cair pelos buracos. O vermelho quebra. 12 níveis, cada um mais fechado.',
      floors:'ANDARES',hint:'ARRASTE PARA GIRAR A TORRE',hint2:'o vermelho quebra',
      dTtl:'VERMELHO!',dSub:'Você caiu num bloco vermelho.',
      sRings:'Anéis',sStreak:'Melhor sequência',sBounce:'Quiques',
      next:'PRÓXIMO ANEL',perfect:'LIMPO!',streak:'SEQUÊNCIA'}
  }
};
/* OJO: el shell ya declaró en este mismo ámbito T, clamp, lerp, rnd, rndi, pick,
   TAU, $ y ARC. Redeclarar cualquiera de esos rompe el módulo entero. */
/* RH (paso entre anillos) y VMAX (velocidad terminal) son EL RITMO del juego, y
   estaban regalados: con RH=1,6 y VMAX=14 pasar un hueco a 10 u/s dejaba 0,15 s
   hasta el anillo siguiente. Si ahí había rojo, no había reacción humana posible
   (el bot murió así en los niveles 6 y 12: "t 0.01" en la última decisión). Con
   2,05 y 11 el hueco siguiente llega a 0,19-0,22 s y, sobre todo, entran DOS
   anillos más en cuadro: se decide antes de caer, no después. */
const RIN=1.15,ROUT=2.55,RH=2.05,TH=.34;  /* radio interno/externo, paso, espesor */
const BR=.42,BZ=1.68;                     /* radio de la pelota y radio de su órbita */
/* Media anchura angular con la que colisiona la pelota. La geométrica sería
   atan(BR/BZ)=.246; se usa .17 a propósito: raspar el borde del hueco PASA, que
   es lo que el jugador espera de un juego de una mano. */
const BHALF=.17;
const VMAX=11;                            /* velocidad terminal. A 21 la cadena de
                                             huecos era incontrolable: 0,076 s por
                                             anillo, imposible de leer. */
const SPINROT=26,SPINFRIC=2.7,ROTVMAX=13; /* suavizado del dedo, roce e inercia */
const BOTV=8.5;                           /* rad/s a los que gira el bot */

let T3,scene,cam,tower,deco,ballG,ballMesh,pole,goalM;
let rings=[],frags=[],props=[];
let by=0,bvy=0,pby=0;                     /* alto de la pelota, velocidad, alto previo */
let rot=0,rotT=0,rotV=0,prot=0;           /* ángulo dibujado / pedido / inercia / previo */
let camY=0,camV=0,pcamY=0;                /* cámara: resorte con adelanto */
let dead=false,won=false,endT=0,passed=0,total=12,combo=0,best=0,bounces=0,lvl=1;
let D={},grav=18,goalY=-99,startT=0;
let drag=null,botT=null,sq=0,sqV=0,spinAcc=0,lastAim='';
let partK=1,decoK=1;      /* de ARC.gfxP(): partículas y densidad de props */
const MAT={};let HAZ=null,HAZC=null,HAZM=null,OUTM=null,HTEX=null;
function mat(c){if(MAT[c])return MAT[c];return MAT[c]=new T3.MeshLambertMaterial({color:new T3.Color(c)});}
const norm=a=>{a=(a+Math.PI)%TAU;if(a<0)a+=TAU;return a-Math.PI;};   /* a −π..π */

/* ------------------------------------------------------------ TEXTURA DE PELIGRO
   Rayas diagonales dibujadas a mano en un canvas: no hace falta bajar ninguna
   imagen y se ve igual en cualquier pantalla. */
function hazTex(rep){
  const c=document.createElement('canvas');c.width=c.height=64;
  const x=c.getContext('2d');
  x.fillStyle='#ff3b57';x.fillRect(0,0,64,64);
  x.strokeStyle='#3d0512';x.lineWidth=12;
  for(let i=-80;i<140;i+=28){x.beginPath();x.moveTo(i,-4);x.lineTo(i+68,68);x.stroke();}
  const t=new T3.CanvasTexture(c);
  t.wrapS=t.wrapT=T3.RepeatWrapping;t.repeat.set(rep,rep);
  if(T3.SRGBColorSpace)t.colorSpace=T3.SRGBColorSpace;
  return t;
}
/* Tres materiales, no uno: la cara que el jugador MIRA es la de ARRIBA (la cámara
   va 30° sobre el anillo), y con un solo material las rayas del costado llegaban
   a la tapa estiradas y en pantalla chica el tramo rojo se leía como "morado
   oscuro". La tapa lleva su propia textura, más gruesa. El orden del array es el
   de los grupos de CylinderGeometry: costado, tapa de arriba, tapa de abajo. */
function hazMats(){
  if(HAZ)return HAZM;
  if(!HTEX)HTEX=hazTex(5);
  HAZ=new T3.MeshLambertMaterial({map:HTEX,emissive:new T3.Color('#ff2a48'),emissiveIntensity:.12});
  HAZC=new T3.MeshLambertMaterial({map:hazTex(2.4),emissive:new T3.Color('#ff2a48'),emissiveIntensity:.16});
  HAZM=[HAZ,HAZC,HAZC];
  return HAZM;
}
function outMat(){    /* contorno = casco invertido, sólo caras traseras */
  if(OUTM)return OUTM;
  return OUTM=new T3.MeshBasicMaterial({color:new T3.Color('#2c0410'),side:T3.BackSide});
}

/* ------------------------------------------------------------------- NIVELES
   Una sola función define TODA la curva de dificultad; dbg.state() la publica
   para poder mirarla desde la sonda sin abrir el juego. */
function diff(n){
  n=clamp(n|0,1,12);
  return {n,
    nr:8+n*2,                                   /* 10 anillos en el 1, 32 en el 12 */
    gap:Math.max(.86,1.52-n*.058),              /* hueco en radianes */
    redP:n<2?0:Math.min(.40,(n-1)*.042),        /* nivel 1 sin rojo */
    twoP:clamp(.55-n*.045,.02,.55),             /* huecos dobles: cada vez menos */
    spinN:n<5?0:Math.round((n-4)*1.2),          /* anillos que giran solos */
    spinV:.20+n*.028,
    grav:17.5+n*.32};
}

/* un tramo de anillo: cilindro recortado (thetaStart/thetaLength).
   Los segmentos radiales van SEGÚN EL ARCO: antes cada pedazo de 1 rad se hacía
   con las 24 divisiones de una vuelta entera (32 anillos × 3 pedazos × 24 = 2300
   caras al aire). Con el arco proporcional, el nivel 12 pasó de 20 a 27 fps en
   swiftshader sin que se note un solo borde recto. */
function addSeg(R,a0,len,red){
  const rs=Math.max(3,Math.round(len/TAU*40));
  const o=new T3.Mesh(new T3.CylinderGeometry(ROUT,ROUT,TH,rs,1,false,a0,len),
                      red?hazMats():mat(R.i%2?'#b9a1ff':'#a487f5'));
  R.grp.add(o);
  const inn=new T3.Mesh(new T3.CylinderGeometry(RIN,RIN,TH+.02,Math.max(3,Math.round(len/TAU*24)),1,true,a0,len),
                        mat(red?'#7c0d20':'#d9dfec'));
  R.grp.add(inn);
  let out=null;
  if(red){
    out=new T3.Mesh(new T3.CylinderGeometry(ROUT+.08,ROUT+.08,TH+.1,rs,1,false,a0-.025,len+.05),outMat());
    R.grp.add(out);
  }
  R.segs.push({a0,len,red,mesh:o,inn,out});
}
function buildLevel(n){
  while(tower.children.length)tower.remove(tower.children[0]);
  rings=[];frags=[];
  D=diff(n);grav=D.grav;
  const nr=D.nr;
  let prevHole=0;
  for(let i=0;i<nr;i++){
    const y=-i*RH-RH;
    const R={i,y,grp:new T3.Group(),segs:[],done:false,off:0,spin:0};
    R.grp.position.y=y;tower.add(R.grp);
    /* Los dos primeros anillos tienen el hueco CASI AL FRENTE: el jugador cae
       gratis mientras entiende el juego (y el nivel 12 no lo mata en 0,4 s). */
    const g1=i===0?rnd(-.3,.3):(i===1?prevHole+rnd(-.7,.7):rnd(0,TAU));
    prevHole=g1;
    const holes=[[g1,D.gap*rnd(.95,1.2)]];
    if(i>1&&Math.random()<D.twoP)holes.push([g1+Math.PI+rnd(-.45,.45),D.gap*rnd(.8,1)]);
    /* Los tramos son lo que queda entre huecos: se recorre el círculo.
       OJO: h[0] es el CENTRO del hueco, así que el corte empieza media anchura
       antes. Estaba `norm(h[0])+Math.PI` (sin restar la mitad y con media vuelta
       de más): el hueco del primer anillo terminaba EXACTAMENTE ATRÁS y la pelota
       arrancaba rebotando contra una pared — medido con la sonda: bounces=2 y
       passed=0 al segundo y medio de empezar el nivel 1, en las dos pantallas. */
    const cuts=holes.map(h=>({a:norm(h[0]-h[1]/2),l:h[1]})).sort((a,b)=>a.a-b.a);
    const spans=[];
    let a=cuts[cuts.length-1].a+cuts[cuts.length-1].l;
    for(const c of cuts){
      let len=c.a-a;while(len<0)len+=TAU;
      if(len>.10)spans.push({a0:a%TAU,len});
      a=c.a+c.l;
    }
    /* cada tramo se parte en pedazos de ~1 rad para poder pintar rojo alguno */
    const plan=[];
    spans.forEach(s=>{
      const parts=Math.max(1,Math.round(s.len/1.0));
      for(let p=0;p<parts;p++)
        plan.push({a0:s.a0+s.len*p/parts,len:s.len/parts,
                   red:i>2&&Math.random()<D.redP});   /* nunca rojo en los 3 primeros */
    });
    /* JUSTICIA: siempre queda al menos un tramo seguro donde rebotar */
    if(plan.length&&plan.every(p=>p.red))plan[rndi(0,plan.length-1)].red=false;
    plan.forEach(p=>addSeg(R,p.a0,p.len,p.red));
    rings.push(R);
  }
  /* anillos que giran solos (del 5 en adelante), nunca los tres primeros */
  const cand=[];for(let i=3;i<nr;i++)cand.push(i);
  for(let k=0;k<Math.min(D.spinN,cand.length);k++){
    const j=rndi(0,cand.length-1),i=cand.splice(j,1)[0];
    rings[i].spin=(Math.random()<.5?-1:1)*D.spinV*rnd(.8,1.25);
  }
  /* poste central y plato de meta */
  pole=new T3.Mesh(new T3.CylinderGeometry(RIN*.9,RIN*.9,nr*RH+RH*4,18),mat('#eef2f9'));
  pole.position.y=-(nr*RH)/2;tower.add(pole);
  goalY=-(nr+1)*RH;
  goalM=new T3.Mesh(new T3.CylinderGeometry(ROUT*1.25,ROUT*1.25,.3,26),mat('#8b5cf6'));
  goalM.position.y=goalY-.2;tower.add(goalM);
  const halo=new T3.Mesh(new T3.CylinderGeometry(ROUT*1.5,ROUT*1.5,.08,26),mat('#f6d76b'));
  halo.position.y=goalY-.4;tower.add(halo);
  total=nr;
  buildDeco(nr);
}
/* ------------------------------------------------- DECORADO (depende de gráficos)
   Cubos y prismas flotando alrededor: dan sensación de caída en los costados,
   que en apaisado quedan muy vacíos. La cantidad la manda ARC.gfxP().part. */
function buildDeco(nr){
  while(deco.children.length)deco.remove(deco.children[0]);
  props=[];
  const N=26;
  for(let i=0;i<N;i++){
    /* más lejos y más chicos que antes (r 5,4-10,5 y lado hasta .95): pegados a la
       torre tapaban el anillo de abajo y uno cruzaba el radar. Paleta del juego, sin
       el tostado que se leía como piedra suelta. */
    const a=rnd(0,TAU),r=rnd(7,13),y=-rnd(0,nr*RH+4);
    const s=rnd(.26,.72);
    const o=new T3.Mesh(new T3.BoxGeometry(s,s*rnd(.7,2.2),s),
      mat(pick(['#cbb7ff','#b9c8f0','#e6ecf7','#d9c2ff'])));
    o.position.set(Math.sin(a)*r,y,Math.cos(a)*r);
    o.rotation.set(rnd(0,TAU),rnd(0,TAU),rnd(0,TAU));
    deco.add(o);props.push({o,sp:rnd(-.5,.5),bob:rnd(0,TAU)});
  }
  applyDeco();
}
let decoN=26;
function applyDeco(){decoN=Math.round(props.length*clamp(decoK,.25,1.4));}
/* Recorte por distancia: una torre del nivel 12 son 32 anillos × 5 mallas. Sin
   esto se dibujan las 200 aunque estén 40 unidades más abajo (three sólo recorta
   por frustum, y con far=90 siguen "dentro"). Medido en swiftshader: 17 -> 30 fps. */
function cull(){
  for(const R of rings)R.grp.visible=(R.y>camY-15&&R.y<camY+7);
  for(let i=0;i<props.length;i++){
    const p=props[i];
    p.o.visible=i<decoN&&Math.abs(p.o.position.y-camY)<17;
  }
  if(goalM){const gv=goalY>camY-19;goalM.visible=gv;}
}
/* --------------------------------------------------------------- COLISIÓN
   ¿El frente (donde cae la pelota) pisa algún tramo de este anillo? Se compara
   el arco de la pelota [−BHALF,+BHALF] contra cada tramo, en el espacio del
   anillo (descontando la rotación de la torre Y la propia del anillo). */
function segAt(R,a){
  for(const s of R.segs){
    if(s.len<=0)continue;                    /* tramo ya roto: no colisiona */
    const d=norm(s.a0+s.len/2-a);            /* distancia al centro del tramo */
    if(Math.abs(d)<s.len/2+BHALF)return s;
  }
  return null;
}
function hitSeg(R){return segAt(R,norm(-rot-R.off));}
function ringTop(R){return R.y+TH/2;}

/* ------------------------------------------------------------------- ENTRADA */
function grab(p){drag={x:p.x,r:rotT,lx:p.x,t:ARC.t,v:0};botT=null;rotV=0;}
G.down=function(p){grab(p);};
G.move=function(p){
  if(!drag)return;
  rotT=drag.r+(p.x-drag.x)*G._sens;
  const dt=ARC.t-drag.t;
  if(dt>.004){                                  /* velocidad para la inercia */
    const inst=(p.x-drag.lx)*G._sens/dt;
    drag.v=lerp(drag.v,clamp(inst,-ROTVMAX,ROTVMAX),.55);
    drag.lx=p.x;drag.t=ARC.t;
  }
};
G.up=function(){
  if(drag)rotV=clamp(drag.v,-ROTVMAX,ROTVMAX);
  drag=null;
};
G.key=function(c,d){
  if(!d)return;
  if(c==='ArrowLeft'||c==='KeyA'){rotT-=.34;rotV=0;botT=null;}
  if(c==='ArrowRight'||c==='KeyD'){rotT+=.34;rotV=0;botT=null;}
};

/* --------------------------------------------------------------------- CICLO */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  cam=new T3.PerspectiveCamera(46,ARC.W/Math.max(1,ARC.H),.1,90);
  scene.add(new T3.HemisphereLight(0xffffff,0xc3cfe6,1.0));
  const d=new T3.DirectionalLight(0xffffff,.6);d.position.set(4,10,7);scene.add(d);
  const d2=new T3.DirectionalLight(0xc9b3ff,.25);d2.position.set(-6,-2,-4);scene.add(d2);
  tower=new T3.Group();scene.add(tower);
  deco=new T3.Group();scene.add(deco);
  ballG=new T3.Group();scene.add(ballG);
  ballMesh=ballNode();
  ballG.add(ballMesh);
  G._sens=6.2/Math.max(320,ARC.W);
  if(ARC.gfxP)G.gfxApply(ARC.gfxP());
  /* Las sondas headless no tocan "TOCÁ PARA JUGAR" (miden el menú a los 3,5 s),
     así que con webdriver se entra solo. En un navegador de verdad el toque se
     mantiene: es el gesto que habilita el audio en el celular. */
  if(navigator.webdriver||/[?&]bot\b/.test(location.search))
    setTimeout(()=>{if(ARC.scr==='load'&&ARC.enterMenu)ARC.enterMenu();},250);
};
/* La pelota: GLB si llegó (facetada a mano, se le ve girar), icosaedro si no.
   El GLB viaja SIN material ni UV: la textura que devuelve image_to_3d es un atlas
   por cara y al simplificar la malla quedaba hecha confeti (se vio en la captura
   del visor), así que el modelo aporta sólo la silueta facetada y el color lo pone
   el juego — naranja mate con sombreado plano y la banda crema como malla aparte,
   igual que en el respaldo. Sin esto el GLB se dibuja NEGRO: sin materiales, el
   glTF por defecto es metálico y sin mapa de entorno no refleja nada. */
function ballNode(){
  const g=new T3.Group();
  const skin=new T3.MeshLambertMaterial({color:new T3.Color('#ff7a3d'),flatShading:true});
  const S=ARC.glb&&ARC.glb.pelota;
  let body=null;
  if(S&&S.scene){
    try{
      const o=S.scene.clone(true);
      o.traverse(k=>{if(k.isMesh)k.material=skin;});
      const b=new T3.Box3().setFromObject(o),s=new T3.Vector3();b.getSize(s);
      const k=(BR*2)/Math.max(.001,Math.max(s.x,s.y,s.z));
      o.scale.setScalar(k);
      const c=b.getCenter(new T3.Vector3()).multiplyScalar(k);
      o.position.set(-c.x,-c.y,-c.z);
      body=o;g.userData.glb=1;
    }catch(e){console.warn('pelota glb',e);}
  }
  if(!body)body=new T3.Mesh(new T3.IcosahedronGeometry(BR,1),skin);
  g.add(body);
  /* la banda va POR DENTRO del cuerpo (BR*.78): el GLB no es una esfera perfecta
     (1,82 x 1,90) y con BR*.94 asomaba como una medialuna blanca al costado */
  const band=new T3.Mesh(new T3.TorusGeometry(BR*.78,BR*.17,8,16),mat('#fff4e6'));
  band.rotation.x=Math.PI/2;
  g.add(band);
  return g;
}
G.resize=function(){
  if(cam){cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();}
  G._sens=6.2/Math.max(320,ARC.W);
};
G.gfxApply=function(p){
  partK=p.part;decoK=p.part;
  if(scene){
    scene.fog=p.fog>0?new T3.Fog(new T3.Color(G.sky).getHex(),15*p.fog,40+16*p.fog):null;
  }
  if(props.length)applyDeco();
};
G.i18nDone=function(){if(ARC.alive)hud();};
function hud(){ARC.hud(passed,T('level')+' '+lvl+'  ·  '+passed+'/'+total);}

G.start=function(l){
  if(!T3)return;
  lvl=clamp(l||1,1,12);
  buildLevel(lvl);
  by=1.1;bvy=0;pby=by;rot=0;rotT=0;rotV=0;drag=null;botT=null;
  dead=false;won=false;endT=0;passed=0;combo=0;best=0;bounces=0;sq=0;sqV=0;
  startT=ARC.t;
  camY=by+1.6;camV=0;
  ballG.position.set(0,by,BZ);ballG.scale.set(1,1,1);
  ballG.rotation.set(0,0,0);
  placeCam(0);aimCam(camY);cam.updateMatrixWorld(true);
  hud();
  ARC.tray([
    {id:'lf',txt:'◀',gh:1,sq:1,fn:()=>{rotT-=.42;rotV=0;botT=null;}},
    {id:'rt',txt:'▶',gh:1,sq:1,fn:()=>{rotT+=.42;rotV=0;botT=null;}}
  ]);
};

/* ARRANQUE BLANDO: la gravedad entra al 50% y llega al 100% en 1,2 s. En el nivel
   12 (g=21,3) la pelota tardaba 0,44 s en llegar al primer anillo y 0,28 s entre
   anillo y anillo: el jugador veía la torre recién cuando ya estaba perdiendo.
   El bot usa la MISMA función para predecir, así no queda desfasado. */
function gEff(){return grav*clamp(.5+(ARC.t-startT)/1.2,.5,1);}

/* ---- rotación: dedo (rotT) + inercia (rotV) -> ángulo dibujado (rot) ---- */
function rotStep(dt){
  if(!drag){
    if(botT!=null){
      const d=norm(botT-rotT);
      rotT+=clamp(d,-BOTV*dt,BOTV*dt);
    }else if(rotV){
      rotT+=rotV*dt;
      rotV*=Math.exp(-SPINFRIC*dt);
      if(Math.abs(rotV)<.04)rotV=0;
    }
  }
  const k=1-Math.exp(-SPINROT*dt);
  const before=rot;
  rot+=norm(rotT-rot)*k;
  spinAcc=(rot-before)/Math.max(.0001,dt);
}
/* ---- cámara: resorte casi crítico + ADELANTO según velocidad de caída ----
   El adelanto (bvy*.085) es lo que hace que el hueco de abajo esté en cuadro:
   cuanto más rápido cae, más abajo mira. Con seguimiento duro (lerp .14 por
   cuadro, como estaba) la cámara pegaba un tirón en cada rebote. */
function placeCam(dt){
  const tgt=by+1.7+clamp(bvy,-VMAX,0)*.10;
  if(dt<=0){camY=tgt;camV=0;pcamY=tgt;}
  else{
    const k=52,c=2*Math.sqrt(k)*1.02;
    camV+=(-(camY-tgt)*k-camV*c)*dt;
    camY+=camV*dt;
  }
}
/* Inclinación: 20° para abajo (antes 18°) y un paso más atrás. Con esto el anillo
   que viene cae a media pantalla y el siguiente a 0,8 de alto: se VE el hueco de
   abajo, que era el pedido. Medido con dbg.nx (dónde cae el próximo anillo en
   pantalla): antes p90 0,92 y 10 cuadros fuera de cuadro por partida; ahora p90
   0,6 y ninguno. */
function aimCam(y){
  cam.position.set(0,y,8.4);
  cam.lookAt(0,y-3.1,0);
}
/* pantalla de la pelota (para que las partículas salgan DE la pelota) */
function ballScreen(){
  if(!cam)return{x:ARC.W/2,y:ARC.H/2};
  const v=new T3.Vector3(0,by,BZ).project(cam);
  return{x:(v.x*.5+.5)*ARC.W,y:(-v.y*.5+.5)*ARC.H};
}

G.step=function(dt){
  if(!T3||!scene)return;
  prot=rot;pcamY=camY;
  rotStep(dt);
  /* anillos que giran solos */
  for(const R of rings)if(R.spin){R.off+=R.spin*dt;R.grp.rotation.y=R.off;}
  tower.rotation.y=rot;
  deco.rotation.y=rot*.32;                        /* paralaje: el fondo gira menos */
  for(const p of props){p.bob+=dt;p.o.rotation.y+=p.sp*dt;}

  /* ---- física de la pelota (paso fijo, velocidad terminal) ---- */
  pby=by;
  bvy=Math.max(-VMAX,bvy-gEff()*dt);
  by+=bvy*dt;
  if(by<goalY-6)by=goalY-6;                       /* no seguir cayendo al vacío */

  if(!dead&&!won){
    /* cruce de plano: fondo de la pelota antes y ahora */
    const b0=pby-BR,b1=by-BR;
    for(const R of rings){
      const top=ringTop(R);
      if(R.done||bvy>=0||b0<top||b1>top)continue;
      const s=hitSeg(R);
      if(!s){                                     /* pasó por el hueco */
        R.done=true;passed++;combo++;best=Math.max(best,combo);
        const sp=ballScreen();
        ARC.sfx('swipe',{vol:.22,rate:clamp(1+combo*.04,1,1.7)});   /* medido: rms .205, es fuerte */
        ARC.sfx('pop',{vol:.55,rate:clamp(1+combo*.055,1,2)});
        if(partK>.4)ARC.fx.ring(sp.x,sp.y,{r:70*(.6+partK*.5),life:.3,color:'#c9a7ff',w:4});
        if(combo>1)ARC.fx.text(sp.x,sp.y-ARC.H*.14,'x'+combo,{color:'#8b5cf6',size:Math.max(16,ARC.H*.055),life:.55});
        if(combo&&combo%5===0){ARC.sfx('chime',{vol:.5});ARC.toast(T('streak')+' '+combo);}
        hud();
        continue;
      }
      if(s.red){die(R,s);break;}
      /* ---- REBOTE: restitución con techo, para no volver arriba del anillo ---- */
      by=top+BR;
      const imp=Math.abs(bvy);
      bvy=clamp(imp*.6,4.5,7.2);
      bounces++;combo=0;
      sq=-clamp(.28+imp*.026,.28,.62);sqV=0;      /* squash */
      const sp=ballScreen();
      ARC.sfx('wood',{vol:.5,rate:clamp(.86+imp*.026,.85,1.5)});
      ARC.vib(8);
      ARC.fx.burst(sp.x,sp.y+ARC.H*.02,{n:Math.round(7*partK)+3,color:'#ffffff',speed:130,
        size:Math.max(2,ARC.H*.008),life:.28,g:420,a:-Math.PI/2});
      ARC.fx.burst(sp.x,sp.y+ARC.H*.02,{n:Math.round(4*partK)+2,color:'#c9a7ff',
        speed:90,size:Math.max(2,ARC.H*.006),life:.36,g:300,sq:1});
      if(imp>13)ARC.shake(Math.min(7,imp*.35));
      break;
    }
    /* ---- meta ---- */
    if(!won&&by-BR<=goalY+.3){
      won=true;endT=ARC.t;
      by=goalY+.3+BR;bvy=5.2;                     /* rebote de festejo en el plato */
      sq=-.5;sqV=0;
      const sp=ballScreen();
      ARC.fx.ring(sp.x,sp.y,{r:ARC.W*.5,life:.6,color:'#f6d76b',w:7});
      ARC.fx.burst(sp.x,sp.y,{n:Math.round(26*partK)+8,color:'#f6d76b',speed:300,
        size:Math.max(3,ARC.H*.011),life:.8,sq:1});
      ARC.sfx('power',{vol:.7});
    }
  }
  /* squash/stretch: resorte que vuelve a 0 y sobrepasa (da el "boing") */
  sqV+=(-sq*180-sqV*13)*dt;sq+=sqV*dt;
  const st=clamp(-bvy,0,VMAX)/VMAX*.16;           /* estirado por velocidad */
  const s=clamp(sq,-.62,.34)+st;
  ballG.scale.set(1-s*.48,1+s,1-s*.48);
  ballG.position.set(0,by,BZ);                    /* draw() lo interpola con alpha */
  ballG.rotation.z-=spinAcc*dt*(BZ/BR)*.35;       /* rueda con el giro de la torre */
  ballG.rotation.x-=Math.abs(bvy)*dt*.55;
  /* pulso del rojo (los dos materiales: costado y tapa) */
  if(HAZ){
    const e=.12+.10*Math.sin(ARC.t*5.2);
    HAZ.emissiveIntensity=e;if(HAZC)HAZC.emissiveIntensity=e+.04;
  }
  /* pedazos del tramo roto */
  for(const f of frags){
    f.o.position.x+=f.vx*dt;f.o.position.y+=f.vy*dt;f.o.position.z+=f.vz*dt;
    f.vy-=13*dt;
    f.o.rotation.x+=f.rx*dt;f.o.rotation.z+=f.rz*dt;
    f.o.scale.multiplyScalar(1-1.1*dt);
  }
  placeCam(dt);
  /* ---- cierre (con ARC.t, no setTimeout: la pausa no lo desincroniza) ---- */
  if(dead&&ARC.t-endT>.95){
    dead=false;
    ARC.over({win:false,score:passed,stars:0,title:T('dTtl'),
      sub:T('dSub')+'<br>'+T('sRings')+': '+passed+'/'+total+' · '+T('sStreak')+': '+best});
  }else if(won&&ARC.t-endT>.6){
    won=false;
    /* ESTRELLAS POR RACHA (anillos seguidos sin rebotar). Bajar de .7/.4 a .6/.3
       no es capricho: en el nivel 12 son 32 anillos y .7 pedía 23 huecos
       encadenados; el bot, jugando bien, llega a 14-18. Bajar y regalar la
       tercera con CERO rebotes deja las 3 estrellas difíciles pero posibles. */
    const st3=(bounces===0||best>=Math.ceil(total*.6))?3:(best>=Math.ceil(total*.3)?2:1);
    ARC.over({win:true,score:passed,stars:st3,coins:15+lvl*5+best*2,
      sub:(bounces===0?'<b>'+T('perfect')+'</b><br>':'')+
        T('sStreak')+': '+best+' · '+T('sBounce')+': '+bounces+
        '<br>★★★ '+T('streak')+' '+Math.ceil(total*.6)});
  }
};
/* ---- muerte: el tramo rojo SE QUIEBRA y la pelota sigue cayendo ---- */
function die(R,s){
  dead=true;endT=ARC.t;
  lastAim='MURIO en anillo '+R.i+' a '+bvy.toFixed(1)+' u/s | ultima decision: '+lastAim;
  bvy=-4;                                          /* pierde impulso, no rebota */
  const sp=ballScreen();
  ARC.sfx('glass',{vol:.9});
  ARC.sfx('lose',{vol:.7});
  ARC.shake(13);ARC.vib(60);
  ARC.fx.burst(sp.x,sp.y,{n:Math.round(24*partK)+10,color:'#ff3b57',speed:280,
    size:Math.max(3,ARC.H*.012),life:.7,sq:1});
  ARC.fx.text(ARC.W/2,ARC.H*.3,T('dTtl'),{color:'#ff5d73',size:Math.max(20,ARC.H*.08),life:.9});
  /* los pedazos salen volando: el tramo rojo deja de existir */
  [s.mesh,s.inn,s.out].forEach(o=>{
    if(!o)return;
    frags.push({o,vx:rnd(-2.4,2.4),vy:rnd(1.6,4.4),vz:rnd(-2.4,2.4),
      rx:rnd(-6,6),rz:rnd(-6,6)});
  });
  s.len=0;                                         /* ya no colisiona */
}

/* --------------------------------------------------------------------- DIBUJO */
G.draw=function(g,alpha){
  if(!ARC.rnd||!scene||!cam)return;
  /* INTERPOLACIÓN: la simulación va a 60 Hz fijos; en una pantalla de 120 Hz sin
     esto la pelota avanza de a dos cuadros y se ve escalonada. */
  const a=clamp(alpha||0,0,1);
  ballG.position.y=lerp(pby,by,a);
  tower.rotation.y=lerp(prot,prot+norm(rot-prot),a);
  deco.rotation.y=tower.rotation.y*.32;
  aimCam(lerp(pcamY,camY,a));
  cull();
  ARC.rnd.render(scene,cam);
  const W=ARC.W,H=ARC.H;
  /* ---- barra de profundidad: vertical, a la derecha (abajo = fondo) ---- */
  const bx=W-Math.max(7,W*.016),y0=H*.20,y1=H*.80,bw=Math.max(4,H*.012);
  g.fillStyle='rgba(20,24,34,.20)';g.fillRect(bx-bw/2,y0,bw,y1-y0);
  const pk=clamp(passed/Math.max(1,total),0,1);
  g.fillStyle='#8b5cf6';g.fillRect(bx-bw/2,y0,bw,(y1-y0)*pk);
  g.fillStyle='#f6d76b';g.fillRect(bx-bw*1.1,y0+(y1-y0)*pk-1,bw*2.2,Math.max(2,H*.007));
  /* ---- RADAR del próximo anillo (abajo a la izquierda) ---- */
  drawRadar(g);
  /* ---- ayuda de los primeros segundos ---- */
  if(passed===0&&!dead&&ARC.t-startT<6.5){
    const al=clamp(6.5-(ARC.t-startT),0,1);
    g.globalAlpha=al;
    g.textAlign='center';
    g.fillStyle='rgba(18,22,32,.9)';
    g.font='900 '+Math.max(12,H*.045)+'px system-ui,sans-serif';
    g.fillText(T('hint'),W/2,H*.135);
    g.fillStyle='rgba(200,45,70,.95)';
    g.font='900 '+Math.max(10,H*.032)+'px system-ui,sans-serif';
    g.fillText(T('hint2'),W/2,H*.185);
    g.textAlign='left';g.globalAlpha=1;
  }
};
/* El radar despliega los anillos que vienen: el centro es el FRENTE (donde cae la
   pelota). Es la diferencia entre jugar y adivinar cuando el anillo queda tapado
   por el que está encima.
   DOS FILAS, no una: la de abajo (gruesa) es el anillo que viene y la de arriba
   (finita) el siguiente. Con una sola fila, pasar un hueco y encontrarse rojo
   debajo era una muerte imposible de prever; con la segunda fila se decide ANTES
   de soltarse (y es la misma información que usa el bot para frenar). */
function drawRadar(g){
  const W=ARC.W,H=ARC.H;
  const i0=rings.findIndex(r=>!r.done&&ringTop(r)<by-BR);
  const bw=W*.30,bx=W*.055,byy=H*.885,bh=Math.max(8,H*.028);
  const bh2=Math.max(4,bh*.5),by2=byy-bh2-Math.max(2,H*.007);
  const put=(w0,len,col,yy,hh)=>{
    /* w0 = ángulo mundial del comienzo; se corta en ±π */
    let a=norm(w0),l=len;
    while(l>0){
      const seg=Math.min(l,Math.PI-a);
      const x0=bx+((a+Math.PI)/TAU)*bw,x1=bx+((a+seg+Math.PI)/TAU)*bw;
      g.fillStyle=col;g.fillRect(x0,yy+1,Math.max(1.5,x1-x0),hh-2);
      l-=seg;a=-Math.PI;
    }
  };
  const row=(R,yy,hh,al,safe)=>{
    g.globalAlpha=al;
    g.fillStyle='rgba(16,20,30,.34)';
    g.beginPath();g.roundRect?g.roundRect(bx,yy,bw,hh,hh/2):g.rect(bx,yy,bw,hh);g.fill();
    if(R){
      for(const s of R.segs){
        if(s.len<=0)continue;
        put(s.a0+rot+R.off,s.len,s.red?'#ff3b57':safe,yy,hh);
      }
      if(R.spin){g.fillStyle='#f6d76b';g.font='900 '+Math.max(8,H*.022)+'px system-ui,sans-serif';
        g.fillText('↻',bx+bw+4,yy+hh);}
    }
    g.globalAlpha=1;
  };
  row(i0>=0?rings[i0+1]:null,by2,bh2,.62,'rgba(190,170,255,.55)');
  row(i0>=0?rings[i0]:null,byy,bh,1,'rgba(190,170,255,.92)');
  /* marca del frente = la pelota, cruzando las dos filas */
  const cx=bx+bw/2;
  g.fillStyle='#ff7a3d';
  g.fillRect(cx-1.5,by2-3,3,byy+bh+3-(by2-3));
  g.fillStyle='rgba(255,255,255,.75)';
  g.font='700 '+Math.max(8,H*.021)+'px system-ui,sans-serif';
  g.fillText(T('next'),bx,by2-Math.max(4,H*.012));
}

/* ------------------------------------------------------------------- SONDA */
/* nx = dónde cae EN PANTALLA el próximo anillo (0 = borde de arriba, 1 = borde de
   abajo). Es la forma de comprobar sin ojo humano que la cámara "muestra el hueco
   de abajo": si nx pasa de 1 el jugador está cayendo a ciegas. */
function nextScr(){
  const R=rings.find(r=>!r.done&&ringTop(r)<by-BR);
  if(!R||!cam)return null;
  const v=new T3.Vector3(0,R.y,BZ).project(cam);
  return +(-v.y*.5+.5).toFixed(2);
}
G.dbg={
  state:()=>({passed,total,dead,won,by:+by.toFixed(2),vy:+bvy.toFixed(1),lvl,combo,best,bounces,
    rot:+rot.toFixed(2),rotT:+rotT.toFixed(2),rotV:+rotV.toFixed(2),cam:+camY.toFixed(2),nx:nextScr(),
    sq:+(ballG?ballG.scale.y:1).toFixed(2),
    dif:D.nr?('anillos '+D.nr+' / hueco '+D.gap.toFixed(2)+' / rojo '+D.redP.toFixed(2)+
      ' / giran '+D.spinN+' / g '+D.grav.toFixed(1)):'',
    props:props.filter(p=>p.o.visible).length,aim:lastAim}),
  /* Juega de verdad: apunta al hueco MÁS CERCANO del próximo anillo y, si no le
     da el tiempo de giro, se conforma con un tramo SEGURO (rebotar y seguir). */
  autoMove:()=>{
    if(!rings.length)return false;
    if(dead||won)return false;
    const R=rings.find(r=>!r.done&&ringTop(r)<by-BR);
    if(!R)return false;
    /* Tiempo hasta el plano del anillo, CONTANDO la subida si viene rebotando:
       .5·g·t² − bvy·t − d = 0. Con la fórmula de sólo caída (la primera versión)
       el bot creía que nunca llegaba a tiempo, elegía rebotar y se quedaba
       clavado: 1 anillo y 18 rebotes en 7 s (medido con la sonda). */
    const d=Math.max(0,(by-BR)-ringTop(R));
    const gv=gEff();
    const tt=(bvy+Math.sqrt(bvy*bvy+2*gv*d))/gv;
    /* Se razona en el marco del anillo TAL COMO VA A ESTAR al chocar: si el anillo
       gira solo, con su ángulo de ahora el bot apuntaba 0,26 rad al costado. */
    const offAt=R.off+R.spin*tt;
    const front=norm(-rot-offAt);
    /* huecos = lo que queda entre tramos vivos, ordenados por ángulo */
    const segs=R.segs.filter(s=>s.len>0).slice().sort((a,b)=>norm(a.a0)-norm(b.a0));
    const holes=[];
    if(!segs.length)holes.push({c:front,l:TAU});
    else for(let i=0;i<segs.length;i++){
      const a=segs[i],b=segs[(i+1)%segs.length];
      /* OJO con el épsilon: entre dos pedazos pegados el hueco da −1e−16 y sin el
         umbral se convertía en un hueco de TAU (el bot apuntaba a cualquier lado
         y se quedaba rebotando). */
      let gap=segs.length===1?TAU-a.len:b.a0-(a.a0+a.len);
      while(gap<-1e-4)gap+=TAU;
      if(gap<0)gap=0;
      /* margen: el bot no enhebra agujas. El suavizado de rotación llega con
         hasta .2 rad de atraso y por ahí se moría al lado del hueco. */
      if(gap>BHALF*2+.24)holes.push({c:norm(a.a0+a.len+gap/2),l:gap});
    }
    const near=(list,ref,pen)=>{
      let o=null,d=1e9;
      for(const h of list){
        let dd=Math.abs(norm(h.c-ref));
        if(pen)dd+=pen(h.c);
        if(dd<d){d=dd;o=h;}
      }
      return o?{c:o.c,d:Math.abs(norm(o.c-ref))}:null;
    };
    /* Un anillo de anticipación: si pasar por ese hueco deja el frente sobre ROJO
       en el anillo siguiente, se penaliza. Es lo que hace un jugador bueno cuando
       ya viene cayendo rápido y no va a llegar a corregir. */
    const R2=rings[R.i+1];
    /* Se mira una VENTANA de ±.22 rad alrededor del punto de llegada, no un punto:
       el suavizado de rotación deja la pelota a un pelo del centro del hueco y con
       la comprobación puntual el bot "veía seguro" un anillo cuyo tramo rojo
       empezaba .15 rad más allá. Con la ventana, el nivel 12 pasó de 9 a 26
       anillos antes de morir. */
    const redNear=(RR,a)=>{
      for(const dd of [0,.22,-.22]){const s2=segAt(RR,norm(a+dd));if(s2&&s2.red)return true;}
      return false;
    };
    const pen=c=>{
      if(!R2)return 0;
      return redNear(R2,c+offAt-(R2.off+R2.spin*(tt+RH/Math.max(2,-bvy+3))))?5:0;
    };
    const aim=near(holes,front,pen);
    if(!aim)return false;
    /* ¿A dónde llegaría el frente cuando la pelota toque el plano? Si ahí hay
       ROJO, se corrige al tramo seguro más cercano A ESE punto (no al de ahora:
       eligiendo "el seguro más cercano a mí" el bot se quedaba rebotando en el
       mismo tramo para siempre — medido: 25 rebotes y 8 s clavado en el nivel 12). */
    const land=norm(front+clamp(norm(aim.c-front),-BOTV*.85*tt,BOTV*.85*tt));
    const s=segAt(R,land);
    /* FRENO: si pasar el hueco deja el frente sobre rojo en el anillo siguiente y
       la pelota ya viene tan rápido que no va a llegar a corregir, lo correcto es
       NO pasar: rebotar contra un tramo seguro corta la velocidad y desde ahí sí
       se llega. Sin esto el bot moría a los 3 s en el nivel 6 encadenando huecos. */
    const vHit=Math.sqrt(Math.max(0,bvy*bvy+2*gv*d));
    const tNext=RH/Math.max(1.5,vHit);
    const brake=!!(R2&&pen(aim.c)&&tNext<.34);
    let goal=aim.c,why=s?(s.red?'rojo, esquiva':'tramo'):'hueco';
    if((s&&s.red)||brake){
      const safe=segs.filter(x=>!x.red).map(x=>({c:norm(x.a0+x.len/2)}));
      const alt=near(safe,brake?front:land);
      if(alt){goal=alt.c;why=brake?'frena en tramo seguro':'rojo, esquiva';}
    }
    lastAim='anillo '+R.i+' frente '+front.toFixed(2)+' huecos '+holes.length+
      ' -> '+goal.toFixed(2)+' ('+why+') t '+tt.toFixed(2);
    /* poner el ángulo elegido al frente: frente = −rot−off  ->  rot = −c−off */
    botT=-goal-offAt;
    drag=null;rotV=0;
    return true;
  }
};
window.GAME=G;
