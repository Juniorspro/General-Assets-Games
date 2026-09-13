/* ============================================================
   SUX SANDBOX — core_t: PARTÍCULAS "TRIPLE A" EN DISPAROS Y PIROTECNIA
   ------------------------------------------------------------
   POR QUÉ EXISTE ESTE ARCHIVO

   Lo que había antes se puede resumir en dos líneas:
     · core_b dibujaba el impacto de bala como UNA esfera amarilla de 9 cm (spark()) y el
       trazador como un cilindro opaco; core_g le sumó un fogonazo de dos planos cruzados de
       45 ms y un humo de esferas. Medido en captura (g2-fx-metal-antes.png): al dispararle a
       un contenedor a 6 m NO SE VE NADA en el punto de impacto — la esfera queda detrás del
       personaje y dura 140 ms.
     · core_l tiene UN THREE.Points aditivo con puntos cuadrados de tamaño fijo: los estallidos
       se leen como una nube de puntitos, sin estela, sin doble capa y sin humo.

   Lo que agrega este archivo, y por qué de esta forma:

   1) UN MOTOR DE QUADS INSTANCIADOS PROPIO (dos capas, DOS draw calls para TODO).
      THREE.Points no sirve para AAA porque un punto no puede ESTIRARSE en la dirección de la
      velocidad, y la estela ("motion streak") es justo lo que hace que una chispa parezca
      moverse rápido en vez de teletransportarse. Acá cada partícula es un quad instanciado
      que el vertex shader arma en ESPACIO DE VISTA: si la partícula tiene estiramiento, el
      quad se alinea con la velocidad proyectada y se alarga; si no, es un cuadrado girado.
      Con eso una sola capa aditiva da: chispas con estela, brasas, glow, destellos y ondas
      de choque. La segunda capa (alpha, no aditiva) da humo y polvo.
      Draw calls totales del sistema: 2 (chispas) + 1 (agujeros de bala) + 1 (casquillos) = 4.

   2) NADA DE ALLOCATIONS POR FRAME. El estado vive en Float32Array paralelos (SoA) y las
      posiciones/velocidades/colores SON los buffers de instancia (no hay copia intermedia).
      Al morir una partícula se hace swap con la última y se baja instanceCount: cero GC.
      Los emisores cargan un ÚNICO objeto reusado (FXE) en vez de construir un literal por
      partícula, que es lo que hace core_l (spawnParticle({...}) => un objeto por chispa).
      Al subir a la GPU se usa addUpdateRange(0,n) para no mandar el buffer entero.

   3) ADITIVO CONTRA CIELO DE DÍA. El cielo del mapa es 0x9fbcd4 (~62% de luminancia): sumarle
      luz casi no cambia el píxel, y por eso los estallidos "no se leían". La solución es la
      física de verdad: un fuego artificial hace HUMO, y el humo es lo que oscurece el fondo
      para que las chispas resalten. Entonces cada estallido escupe PRIMERO humo (capa alpha,
      renderOrder 8) y ENCIMA las chispas aditivas (renderOrder 11), con núcleos blancos
      sobre-expuestos (color > 1, el atributo es float: 1.9 suma casi el doble).

   4) IMPACTO POR MATERIAL. El enganche es el que ya usaba core_n para el sonido: aimRay().
      Se envuelve aimRay para RECORDAR el último impacto (punto, normal, body, prop) y se
      envuelve spark() — que fireGun() llama con el mismo punto justo después — para emitir
      chispas/polvo/esquirlas/astillas/vidrio según el material dominante. Si el punto de
      spark() no coincide con el del último aimRay (caso stepProj, que raycastea a mano) se
      cae a 'concrete' con la normal hacia la cámara: nunca queda sin efecto.

   REGLAS DEL MOTOR RESPETADAS: este archivo es EXCLUSIVO; todo lo que necesita cambiar de
   otros cores lo REASIGNA (muzzleFlash, spark, aimRay, boom, burst, spawnParticle) y nunca
   re-declara. Es el último core alfabéticamente, así que ve todos los nombres anteriores.
   ============================================================ */

/* ---------- contratos con lo de afuera ----------
   OJO con el guard clásico 'if(typeof X==="undefined")var X=null': acá NO se puede usar para
   muzzleWorld/propMatSet. build.js concatena todo dentro de UN módulo ES, y en código de módulo
   las declaraciones de función del nivel superior son LÉXICAS (a diferencia de un script
   suelto): 'function muzzleWorld(){}' en core_g + 'var muzzleWorld' acá =>
   "Identifier 'muzzleWorld' has already been declared" y NO CARGA NADA. Así que se toma una
   referencia con nombre propio, envuelta por si el core que la define no estuviera. */
const _mzW=nsafe(()=>(typeof muzzleWorld==='function')?muzzleWorld:null,'fxmz')||null; /* core_g */
const _pms=nsafe(()=>(typeof propMatSet==='function')?propMatSet:null,'fxpm')||null;   /* core_n */

/* ================= presupuesto por calidad ================= */
/* 'ultra' todavía no existe en SV (no hay preset), pero el enunciado pide que si alguien lo
   agrega mañana el sistema lo aproveche: guard + rama propia. */
const FXULTRA=!!(typeof SV!=='undefined'&&SV.ultra);
/* mul = cuántas partículas; gs = cuán GRANDES son los sprites gordos (glow, anillos, humo).
   Se separan porque el costo de un teléfono de gama baja no está en la cantidad sino en el
   RELLENO: medido con 30 estallidos simultáneos, 749 quads (679 aditivos + 70 de humo) con los
   glow a tamaño completo cuestan +17,8 ms por frame en el rasterizador de software a 457x218
   — o sea, overdraw, no CPU. Bajando gs en uld/low el estallido sigue leyéndose pero pinta la
   pantalla una fracción de las veces. */
const FXCAP=FXULTRA
  ? {a:7000,s:520,dec:64,cas:24,mul:1.75,gs:1.15,light:1}
  : (QP.key==='uld' ? {a:600, s:44, dec:8, cas:6, mul:.34,gs:.50,light:0}
    :(QP.key==='low' ? {a:1600,s:110,dec:20,cas:10,mul:.62,gs:.78,light:0}
                     : {a:3600,s:300,dec:36,cas:16,mul:1,  gs:1,  light:1}));

/* VÁLVULA ADAPTATIVA. Los topes por QP.key son un techo FIJO, y el techo no sabe qué está
   pasando en pantalla: 30 estallidos simultáneos con humo delante de la cámara pintan la
   pantalla muchas veces (overdraw), y en un teléfono lento eso se siente aunque el número de
   partículas sea "legal". Así que se lee el fps que YA calcula adaptRes() en core_b (fpsShow,
   promedio de 24 frames) y se baja la EMISIÓN hasta el 40% mientras el juego esté por debajo
   de 20 fps, recuperando cuando pasa de 27. Es la misma idea que resScale, pero para el
   presupuesto de partículas, y sólo afecta a lo que NACE: nada se corta a mitad de vida. */
let fxLoad=1,fxLoadPin=-1;   /* fxLoadPin: sólo sondas (fijar la válvula para capturar) */
const fxMul=()=>FXCAP.mul*fxLoad;

/* ================= atlas de sprites (procedural, 512x256 = 8 tiles de 128) ================= */
/* Se dibuja tile por tile en un canvas SCRATCH y se pega en el atlas: hace falta porque el
   humo se construye con 'lighter' + máscara 'destination-in', y esas operaciones afectan a
   TODO el canvas — si dibujáramos directo en el atlas se comerían los tiles vecinos. */
const FXTS=128;
let FXCV=null;
const TIL_GLOW=0,TIL_SPARK=1,TIL_STAR=2,TIL_RING=3,TIL_SMOKE=4,TIL_SMOKE2=5,TIL_SHARD=6,TIL_TAIL=7;
function fxAtlas(){
  const cv=document.createElement('canvas');cv.width=FXTS*4;cv.height=FXTS*2;
  const G=cv.getContext('2d');
  const sc=document.createElement('canvas');sc.width=sc.height=FXTS;
  const s=sc.getContext('2d');
  const H=FXTS/2,clr=()=>{s.setTransform(1,0,0,1,0,0);s.globalCompositeOperation='source-over';
    s.globalAlpha=1;s.clearRect(0,0,FXTS,FXTS);};
  const put=i=>G.drawImage(sc,(i%4)*FXTS,(i>>2)*FXTS);
  const rad=(stops,r)=>{const g2=s.createRadialGradient(H,H,0,H,H,r||H-2);
    for(const st of stops)g2.addColorStop(st[0],'rgba(255,255,255,'+st[1]+')');
    s.fillStyle=g2;s.fillRect(0,0,FXTS,FXTS);};

  /* 0 — glow suave: el "cuerpo" de casi todo (chispas grandes, fogonazo, humo iluminado) */
  clr();rad([[0,1],[.22,.74],[.5,.26],[.78,.06],[1,0]]);put(TIL_GLOW);

  /* 1 — chispa dura: núcleo chico casi saturado + caída corta. Contra cielo claro esta es la
         que "puntea" y se lee, porque concentra toda la energía en pocos píxeles. */
  clr();rad([[0,1],[.09,1],[.2,.6],[.42,.14],[1,0]]);put(TIL_SPARK);

  /* 2 — destello en estrella: 6 púas + núcleo. Es el fogonazo del caño y el flash del
         estallido; las púas son lo que hace que el ojo lea "explosión" y no "bola". */
  clr();rad([[0,1],[.16,.8],[.4,.2],[1,0]],H*.62);
  s.globalCompositeOperation='lighter';
  for(let k=0;k<6;k++){
    s.setTransform(1,0,0,1,H,H);s.rotate(k*Math.PI/6+.2);
    const lg=s.createLinearGradient(0,0,H-2,0);
    lg.addColorStop(0,'rgba(255,255,255,.95)');lg.addColorStop(.35,'rgba(255,255,255,.35)');
    lg.addColorStop(1,'rgba(255,255,255,0)');
    s.fillStyle=lg;
    s.beginPath();s.moveTo(0,-5.5);s.lineTo(H-2,0);s.lineTo(0,5.5);s.closePath();s.fill();
  }
  s.setTransform(1,0,0,1,0,0);put(TIL_STAR);

  /* 3 — anillo: la onda de choque del disparo y el frente del estallido */
  clr();rad([[0,0],[.5,0],[.66,.28],[.76,1],[.86,.3],[1,0]]);put(TIL_RING);

  /* 4 y 5 — dos humos distintos: manchones con 'lighter' y después máscara radial para que
     no tengan borde recto. Dos variantes para que una nube de puffs no se vea repetida. */
  for(let v=0;v<2;v++){
    clr();
    s.globalCompositeOperation='lighter';
    let sd=v*137.13+11.7;
    const rnd=()=>{sd=(sd*9301+49297)%233280;return sd/233280;};
    for(let k=0;k<16;k++){
      const bx=H+(rnd()-.5)*H*.85,by=H+(rnd()-.5)*H*.85,br=H*(.22+rnd()*.34);
      const g2=s.createRadialGradient(bx,by,0,bx,by,br);
      g2.addColorStop(0,'rgba(255,255,255,.30)');g2.addColorStop(.6,'rgba(255,255,255,.13)');
      g2.addColorStop(1,'rgba(255,255,255,0)');
      s.fillStyle=g2;s.fillRect(0,0,FXTS,FXTS);
    }
    s.globalCompositeOperation='destination-in';
    const m=s.createRadialGradient(H,H,0,H,H,H-1);
    m.addColorStop(0,'rgba(255,255,255,1)');m.addColorStop(.62,'rgba(255,255,255,.85)');
    m.addColorStop(1,'rgba(255,255,255,0)');
    s.fillStyle=m;s.fillRect(0,0,FXTS,FXTS);
    put(v?TIL_SMOKE2:TIL_SMOKE);
  }

  /* 6 — esquirla/astilla: polígono angular con un halo tenue (sin blur, que no hay) */
  clr();
  for(let pass=0;pass<2;pass++){
    const k=pass?1:1.55,a=pass?.95:.28;
    s.fillStyle='rgba(255,255,255,'+a+')';
    s.beginPath();
    s.moveTo(H-30*k,H-46*k);s.lineTo(H+34*k,H-18*k);s.lineTo(H+22*k,H+40*k);
    s.lineTo(H-16*k,H+46*k);s.lineTo(H-38*k,H+6*k);s.closePath();s.fill();
  }
  put(TIL_SHARD);

  /* 7 — cola: brillante en el borde de AVANCE (abajo del tile) y apagándose hacia atrás.
     Con flipY=false, aCorner.y=+.5 (el frente de la partícula) cae en la fila 127 del tile,
     así que el degradado va de abajo (opaco) hacia arriba (transparente). */
  clr();
  {const lg=s.createLinearGradient(0,FXTS,0,0);
   lg.addColorStop(0,'rgba(255,255,255,1)');lg.addColorStop(.18,'rgba(255,255,255,.72)');
   lg.addColorStop(.55,'rgba(255,255,255,.26)');lg.addColorStop(1,'rgba(255,255,255,0)');
   s.fillStyle=lg;s.fillRect(0,0,FXTS,FXTS);
   s.globalCompositeOperation='destination-in';
   const m=s.createLinearGradient(0,0,FXTS,0);
   m.addColorStop(0,'rgba(255,255,255,0)');m.addColorStop(.34,'rgba(255,255,255,.9)');
   m.addColorStop(.5,'rgba(255,255,255,1)');m.addColorStop(.66,'rgba(255,255,255,.9)');
   m.addColorStop(1,'rgba(255,255,255,0)');
   s.fillStyle=m;s.fillRect(0,0,FXTS,FXTS);}
  put(TIL_TAIL);

  FXCV=cv;                             /* se guarda para poder auditar el alfa desde __H.fxDbg */
  const t=new THREE.CanvasTexture(cv);
  t.flipY=false;                       /* ver comentario del tile 7 */
  t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=false;t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
const FXATL=nsafe(()=>fxAtlas(),'fxatlas')||null;

/* ================= motor de quads instanciados ================= */
const FX_POP=1,FX_SMOKE=2,FX_BOUNCE=4;
const FXVS=`
attribute vec2 aCorner;
attribute vec3 iPos;
attribute vec3 iVel;
attribute vec3 iCol;
attribute vec4 iPar;   /* x=alfa y=lado z=estiramiento(m) w=giro */
attribute vec2 iUv;
varying vec2 vUv; varying vec3 vCol; varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(iPos,1.0);
  vec3 vv = (modelViewMatrix * vec4(iVel,0.0)).xyz;
  float sz = iPar.y, st = iPar.z;
  vec2 d;
  if(st > 0.0005){
    float L = length(vv.xy);
    d = (L > 1e-4) ? vv.xy/L : vec2(0.0,1.0);   /* si va hacia la cámara no hay estela: quad recto */
  } else {
    d = vec2(cos(iPar.w), sin(iPar.w));
  }
  vec2 pp = vec2(-d.y, d.x);
  mv.xy += pp*(aCorner.x*sz) + d*(aCorner.y*(sz+st) - st*0.5);
  gl_Position = projectionMatrix * mv;
  vUv = iUv + (aCorner + 0.5) * vec2(0.25,0.5);
  vCol = iCol; vA = iPar.x;
}`;
/* aditivo PREMULTIPLICADO (One/One): el rgb ya viene multiplicado por el alfa, así el color
   puede pasar de 1 y sobre-exponer como un fogonazo de verdad */
const FXFS_ADD=`
uniform sampler2D map;
varying vec2 vUv; varying vec3 vCol; varying float vA;
void main(){ float a = texture2D(map,vUv).a * vA; gl_FragColor = vec4(vCol*a, a); }`;
const FXFS_ALP=`
uniform sampler2D map;
varying vec2 vUv; varying vec3 vCol; varying float vA;
void main(){ gl_FragColor = vec4(vCol, texture2D(map,vUv).a * vA); }`;

function fxRange(at,c){
  /* subir sólo la parte viva del buffer; si la versión de three no tiene la API nueva, se
     manda entero (más caro, nunca roto) */
  if(at.addUpdateRange){at.clearUpdateRanges();at.addUpdateRange(0,c);}
  else if(at.updateRange){at.updateRange.offset=0;at.updateRange.count=c;}
}
function fxLayer(N,add,order){
  const g=new THREE.InstancedBufferGeometry();
  g.setAttribute('aCorner',new THREE.BufferAttribute(
    new Float32Array([-.5,-.5, .5,-.5, .5,.5, -.5,.5]),2));
  g.setIndex([0,1,2,0,2,3]);
  const P=new Float32Array(N*3),V=new Float32Array(N*3),C=new Float32Array(N*3),
        A=new Float32Array(N*4),U=new Float32Array(N*2);
  const D=THREE.DynamicDrawUsage;
  const aP=new THREE.InstancedBufferAttribute(P,3).setUsage(D),
        aV=new THREE.InstancedBufferAttribute(V,3).setUsage(D),
        aC=new THREE.InstancedBufferAttribute(C,3).setUsage(D),
        aA=new THREE.InstancedBufferAttribute(A,4).setUsage(D),
        aU=new THREE.InstancedBufferAttribute(U,2).setUsage(D);
  g.setAttribute('iPos',aP);g.setAttribute('iVel',aV);g.setAttribute('iCol',aC);
  g.setAttribute('iPar',aA);g.setAttribute('iUv',aU);
  g.instanceCount=0;
  /* esfera de recorte gigante: el frustum culling no sirve (las partículas están por todos
     lados) y recalcularla costaría un barrido por frame */
  g.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,0,0),1e6);
  const mat=new THREE.ShaderMaterial({
    uniforms:{map:{value:FXATL}},vertexShader:FXVS,
    fragmentShader:add?FXFS_ADD:FXFS_ALP,
    transparent:true,depthWrite:false,depthTest:true,fog:false,
    /* DoubleSide NO es un lujo: el quad se arma con (perp*aCorner.x, dir*aCorner.y), que
       intercambia los ejes y deja el triángulo en sentido HORARIO -> con FrontSide el back-face
       culling se comía TODAS las partículas (síntoma: instanceCount>0, programa compilado,
       cero píxeles; se cazó pintando la capa de magenta opaco con __H.fxSolid(1)). Y además
       'dir' viene de la velocidad proyectada, así que el sentido de giro cambia solo. */
    side:THREE.DoubleSide,
    blending:add?THREE.CustomBlending:THREE.NormalBlending});
  if(add){mat.blendSrc=THREE.OneFactor;mat.blendDst=THREE.OneFactor;
    mat.blendSrcAlpha=THREE.OneFactor;mat.blendDstAlpha=THREE.OneFactor;}
  const mesh=new THREE.Mesh(g,mat);
  mesh.frustumCulled=false;mesh.renderOrder=order;mesh.visible=false;
  scene.add(mesh);
  return {N,n:0,g,mat,mesh,P,V,C,A,U,aP,aV,aC,aA,aU,cu:true,
    life:new Float32Array(N),max:new Float32Array(N),
    s0:new Float32Array(N),s1:new Float32Array(N),
    gr:new Float32Array(N),dg:new Float32Array(N),
    st:new Float32Array(N),rv:new Float32Array(N),
    fk:new Float32Array(N),sd:new Float32Array(N),
    al:new Float32Array(N),tb:new Float32Array(N),fi:new Float32Array(N),
    fy:new Float32Array(N),fl:new Uint8Array(N)};
}
const FXA=FXATL?fxLayer(FXCAP.a,true ,11):null;   /* aditiva: chispas, glow, brasas, anillos */
const FXS=FXATL?fxLayer(FXCAP.s,false, 8):null;   /* alpha: humo y polvo (debajo de lo aditivo) */

/* ---------- emisor: se cargan los campos en FXE y se llama fxEmit(capa) ----------
   un ÚNICO objeto reusado => cero allocations por partícula */
const FXE={x:0,y:0,z:0,vx:0,vy:0,vz:0,r:1,g:1,b:1,a:1,life:1,s0:.2,s1:.05,
  grav:3,drag:.5,str:0,rot:0,rvel:0,flk:0,turb:0,tile:0,fl:0,fy:-1e9,fin:.22};
function fxE(){ /* volver a valores neutros: los emisores sólo tocan lo que les importa */
  FXE.vx=FXE.vy=FXE.vz=0;FXE.r=FXE.g=FXE.b=1;FXE.a=1;FXE.life=1;
  FXE.s0=.2;FXE.s1=.05;FXE.grav=3;FXE.drag=.5;FXE.str=0;FXE.rot=0;FXE.rvel=0;
  FXE.flk=0;FXE.turb=0;FXE.tile=0;FXE.fl=0;FXE.fy=-1e9;FXE.fin=.22;
}
function fxEmit(L){
  if(!L||L.n>=L.N)return false;
  const i=L.n++,i3=i*3,i4=i*4,i2=i*2;
  L.P[i3]=FXE.x;L.P[i3+1]=FXE.y;L.P[i3+2]=FXE.z;
  L.V[i3]=FXE.vx;L.V[i3+1]=FXE.vy;L.V[i3+2]=FXE.vz;
  L.C[i3]=FXE.r;L.C[i3+1]=FXE.g;L.C[i3+2]=FXE.b;
  L.A[i4]=FXE.a;L.A[i4+1]=FXE.s0;L.A[i4+2]=0;L.A[i4+3]=FXE.rot;
  L.U[i2]=(FXE.tile%4)*.25;L.U[i2+1]=(FXE.tile>>2)*.5;
  L.life[i]=FXE.life;L.max[i]=FXE.life;
  L.s0[i]=FXE.s0;L.s1[i]=FXE.s1;L.gr[i]=FXE.grav;L.dg[i]=FXE.drag;
  L.st[i]=FXE.str;L.rv[i]=FXE.rvel;L.fk[i]=FXE.flk;L.tb[i]=FXE.turb;
  L.al[i]=FXE.a;L.fy[i]=FXE.fy;L.fl[i]=FXE.fl;L.fi[i]=FXE.fin;L.sd[i]=Math.random();
  L.cu=true;
  return true;
}
function fxSwap(L,i,j){
  const i3=i*3,j3=j*3,i4=i*4,j4=j*4,i2=i*2,j2=j*2;
  L.P[i3]=L.P[j3];L.P[i3+1]=L.P[j3+1];L.P[i3+2]=L.P[j3+2];
  L.V[i3]=L.V[j3];L.V[i3+1]=L.V[j3+1];L.V[i3+2]=L.V[j3+2];
  L.C[i3]=L.C[j3];L.C[i3+1]=L.C[j3+1];L.C[i3+2]=L.C[j3+2];
  L.A[i4]=L.A[j4];L.A[i4+1]=L.A[j4+1];L.A[i4+2]=L.A[j4+2];L.A[i4+3]=L.A[j4+3];
  L.U[i2]=L.U[j2];L.U[i2+1]=L.U[j2+1];
  L.life[i]=L.life[j];L.max[i]=L.max[j];L.s0[i]=L.s0[j];L.s1[i]=L.s1[j];
  L.gr[i]=L.gr[j];L.dg[i]=L.dg[j];L.st[i]=L.st[j];L.rv[i]=L.rv[j];
  L.fk[i]=L.fk[j];L.sd[i]=L.sd[j];L.al[i]=L.al[j];L.tb[i]=L.tb[j];L.fi[i]=L.fi[j];
  L.fy[i]=L.fy[j];L.fl[i]=L.fl[j];
  L.cu=true;
}
/* integración + escritura al buffer de instancias. UN barrido, sin objetos temporales. */
function fxStepLayer(L,dt,t){
  if(!L)return;
  let i=0,n=L.n;
  const P=L.P,V=L.V,A=L.A;
  while(i<n){
    const l=L.life[i]-dt;
    if(l<=0){ n--; if(i!==n)fxSwap(L,i,n); continue; }
    L.life[i]=l;
    const i3=i*3,i4=i*4,f=l/L.max[i],fs=L.fl[i];
    let dk=1-L.dg[i]*dt; if(dk<0)dk=0;
    let vx=V[i3]*dk, vy=V[i3+1]*dk-L.gr[i]*dt, vz=V[i3+2]*dk;
    const tb=L.tb[i];
    if(tb>0){ const sd=L.sd[i];
      vx+=Math.sin(t*1.3+sd*7.1)*tb*dt; vy+=tb*.45*dt; vz+=Math.cos(t*1.07+sd*5.3)*tb*dt; }
    let x=P[i3]+vx*dt, y=P[i3+1]+vy*dt, z=P[i3+2]+vz*dt;
    /* rebote en el PLANO del impacto (fy): las chispas patinan sobre el piso/pared, que es lo
       que las hace parecer metal caliente y no confeti */
    if((fs&FX_BOUNCE)&&y<L.fy[i]&&vy<0){
      y=L.fy[i];vy=-vy*.34;vx*=.6;vz*=.6;
      if(vy<.4){L.fl[i]=fs&~FX_BOUNCE;vy=0;L.gr[i]=0;L.dg[i]=7;}
    }
    P[i3]=x;P[i3+1]=y;P[i3+2]=z;V[i3]=vx;V[i3+1]=vy;V[i3+2]=vz;
    let a=L.al[i];
    if(fs&FX_POP)a*=f*f;                                     /* destellos: se van de golpe */
    /* el humo entra en fi SEGUNDOS reales (no como fracción de la vida: un puff de 4 s
       tardaba 640 ms en verse). El polvo de un impacto usa 50 ms — tiene que estar ahí en el
       mismo frame del disparo — y el humo de un estallido 200 ms. */
    else if(fs&FX_SMOKE){const in_=(1-f)*L.max[i]/L.fi[i];a*=f*(in_<1?in_:1);}
    else a*=f<.45?f/.45:1;                                   /* chispas: brillan y se apagan */
    if(L.fk[i]>0)a*=.60+.40*Math.sin(t*L.fk[i]+L.sd[i]*6.283); /* titileo */
    A[i4]=a;
    A[i4+1]=L.s1[i]+(L.s0[i]-L.s1[i])*f;
    if(L.st[i]>0)A[i4+2]=L.st[i]*Math.sqrt(vx*vx+vy*vy+vz*vz);
    if(L.rv[i]!==0)A[i4+3]+=L.rv[i]*dt;
    i++;
  }
  L.n=n;
  L.g.instanceCount=n;
  L.mesh.visible=n>0;
  if(n>0){
    fxRange(L.aP,n*3);L.aP.needsUpdate=true;
    fxRange(L.aV,n*3);L.aV.needsUpdate=true;
    fxRange(L.aA,n*4);L.aA.needsUpdate=true;
    if(L.cu){ /* color y tile sólo cambian al nacer o al compactar */
      fxRange(L.aC,n*3);L.aC.needsUpdate=true;
      fxRange(L.aU,n*2);L.aU.needsUpdate=true;L.cu=false;}
  }
}

/* ---------- direcciones sin allocations ---------- */
let _tux=0,_tuy=0,_tuz=0,_tvx=0,_tvy=0,_tvz=0,_dx=0,_dy=0,_dz=0;
function fxBasis(nx,ny,nz){
  let ax=0,ay=0,az=1;
  if(nz>.9||nz<-.9){ax=1;az=0;}
  _tux=ay*nz-az*ny;_tuy=az*nx-ax*nz;_tuz=ax*ny-ay*nx;
  const l=Math.sqrt(_tux*_tux+_tuy*_tuy+_tuz*_tuz)||1;
  _tux/=l;_tuy/=l;_tuz/=l;
  _tvx=ny*_tuz-nz*_tuy;_tvy=nz*_tux-nx*_tuz;_tvz=nx*_tuy-ny*_tux;
}
function fxCone(nx,ny,nz,spread){   /* spread 0..1 (1 = hemisferio entero) */
  const a=Math.random()*6.28318,s=Math.random()*spread,c=Math.sqrt(Math.max(0,1-s*s)),
        ca=Math.cos(a),sa=Math.sin(a);
  _dx=nx*c+(_tux*ca+_tvx*sa)*s;_dy=ny*c+(_tuy*ca+_tvy*sa)*s;_dz=nz*c+(_tuz*ca+_tvz*sa)*s;
}
function fxSphere(){
  const zz=Math.random()*2-1,t=Math.random()*6.28318,r=Math.sqrt(Math.max(0,1-zz*zz));
  _dx=r*Math.cos(t);_dy=zz;_dz=r*Math.sin(t);
}

/* ================= pool de agujeros de bala (1 draw call) ================= */
function fxHoleTex(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const g=c.getContext('2d'),H=32;
  /* halo de polvo alrededor */
  let gr=g.createRadialGradient(H,H,0,H,H,31);
  gr.addColorStop(0,'rgba(126,120,112,.62)');gr.addColorStop(.5,'rgba(126,120,112,.34)');
  gr.addColorStop(1,'rgba(126,120,112,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);
  /* grietas: rompen la simetría y matan el look de "calcomanía redonda" */
  g.strokeStyle='rgba(40,36,32,.75)';g.lineWidth=2;
  for(let k=0;k<6;k++){const a=Math.random()*6.283,L=13+Math.random()*15;
    g.beginPath();g.moveTo(H,H);g.lineTo(H+Math.cos(a)*L,H+Math.sin(a)*L);g.stroke();}
  /* el AGUJERO ocupa 2/3 del sprite, no 1/5: con radio 13 de 32 y un decal de 22 cm a 4,5 m,
     la parte oscura medía ~3 px y no se veía absolutamente nada */
  gr=g.createRadialGradient(H,H,0,H,H,21);
  gr.addColorStop(0,'rgba(12,10,9,1)');gr.addColorStop(.55,'rgba(20,17,15,.98)');
  gr.addColorStop(.8,'rgba(48,43,39,.7)');gr.addColorStop(1,'rgba(60,55,50,0)');
  g.fillStyle=gr;g.beginPath();g.arc(H,H,21,0,6.283);g.fill();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
let FXDEC=null,fxDecI=0;
const _fxDum=new THREE.Object3D();
nsafe(()=>{
  FXDEC=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),
    new THREE.MeshBasicMaterial({map:fxHoleTex(),transparent:true,depthWrite:false,
      alphaTest:.02,side:THREE.DoubleSide,fog:true,
      polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),FXCAP.dec);
  FXDEC.frustumCulled=false;FXDEC.renderOrder=5;
  _fxDum.scale.setScalar(0);_fxDum.updateMatrix();
  for(let i=0;i<FXCAP.dec;i++)FXDEC.setMatrixAt(i,_fxDum.matrix);
  scene.add(FXDEC);
},'fxdec');
function fxDecal(x,y,z,nx,ny,nz,sz){
  if(!FXDEC)return;
  const i=fxDecI++%FXCAP.dec;
  _fxDum.position.set(x+nx*.02,y+ny*.02,z+nz*.02);
  /* lookAt con up alternativo cuando la normal es vertical (si no, el quad degenera) */
  _fxDum.up.set(Math.abs(ny)>.95?1:0,Math.abs(ny)>.95?0:1,0);
  _fxDum.lookAt(_fxDum.position.x+nx,_fxDum.position.y+ny,_fxDum.position.z+nz);
  _fxDum.rotateZ(Math.random()*6.283);
  _fxDum.scale.setScalar(sz);
  _fxDum.updateMatrix();
  FXDEC.setMatrixAt(i,_fxDum.matrix);
  FXDEC.instanceMatrix.needsUpdate=true;
}

/* ================= casquillos (visual, 1 draw call) ================= */
let FXCAS=null;
const FXCASN=FXCAP.cas;
const casP=new Float32Array(FXCASN*3),casV=new Float32Array(FXCASN*3),
      casR=new Float32Array(FXCASN*3),casW=new Float32Array(FXCASN*3),
      casT=new Float32Array(FXCASN),casF=new Float32Array(FXCASN);
let casI=0;
nsafe(()=>{
  const g=new THREE.CylinderGeometry(.0055,.0048,.024,5,1);
  g.rotateZ(Math.PI/2);                     /* el casquillo vuela "de costado" */
  FXCAS=new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial({color:0xcaa14a,fog:true}),FXCASN);
  FXCAS.frustumCulled=false;
  _fxDum.scale.setScalar(0);_fxDum.rotation.set(0,0,0);_fxDum.updateMatrix();
  for(let i=0;i<FXCASN;i++)FXCAS.setMatrixAt(i,_fxDum.matrix);
  scene.add(FXCAS);
},'fxcas');
function fxCasing(x,y,z,vx,vy,vz,floorY){
  if(!FXCAS)return;
  const i=casI++%FXCASN,i3=i*3;
  casP[i3]=x;casP[i3+1]=y;casP[i3+2]=z;
  casV[i3]=vx;casV[i3+1]=vy;casV[i3+2]=vz;
  casR[i3]=Math.random()*6.283;casR[i3+1]=Math.random()*6.283;casR[i3+2]=Math.random()*6.283;
  casW[i3]=(Math.random()-.5)*26;casW[i3+1]=(Math.random()-.5)*22;casW[i3+2]=(Math.random()-.5)*30;
  casT[i]=2.6;casF[i]=floorY;
}
function fxCasStep(dt){
  if(!FXCAS)return;
  let any=false;
  for(let i=0;i<FXCASN;i++){
    if(casT[i]<=0)continue;
    any=true;
    const i3=i*3;
    casT[i]-=dt;
    casV[i3+1]-=19.6*dt;
    casP[i3]+=casV[i3]*dt;casP[i3+1]+=casV[i3+1]*dt;casP[i3+2]+=casV[i3+2]*dt;
    if(casP[i3+1]<casF[i]&&casV[i3+1]<0){        /* rebota un par de veces y queda */
      casP[i3+1]=casF[i];casV[i3+1]*=-.42;casV[i3]*=.55;casV[i3+2]*=.55;
      casW[i3]*=.5;casW[i3+1]*=.5;casW[i3+2]*=.5;
      if(casV[i3+1]<.5){casV[i3+1]=0;casW[i3]=casW[i3+1]=casW[i3+2]=0;}
    }
    casR[i3]+=casW[i3]*dt;casR[i3+1]+=casW[i3+1]*dt;casR[i3+2]+=casW[i3+2]*dt;
    _fxDum.position.set(casP[i3],casP[i3+1],casP[i3+2]);
    _fxDum.rotation.set(casR[i3],casR[i3+1],casR[i3+2]);
    /* se encoge en los últimos 400 ms en vez de desaparecer de golpe */
    _fxDum.scale.setScalar(casT[i]<.4?casT[i]/.4:1);
    _fxDum.updateMatrix();
    FXCAS.setMatrixAt(i,_fxDum.matrix);
    if(casT[i]<=0){_fxDum.scale.setScalar(0);_fxDum.updateMatrix();FXCAS.setMatrixAt(i,_fxDum.matrix);}
  }
  if(any)FXCAS.instanceMatrix.needsUpdate=true;
}

/* ================= luz de fogonazo/estallido (pooled, sólo en alta) ================= */
let FXLIGHT=null,fxLT=0,fxLT0=1,fxLI=0;
if(FXCAP.light&&QP.shadow>0)nsafe(()=>{FXLIGHT=new THREE.PointLight(0xffc46a,0,9);
  FXLIGHT.castShadow=false;scene.add(FXLIGHT);},'fxlight');
function fxFlashLight(x,y,z,hex,inten,dur,dist){
  if(!FXLIGHT)return;
  FXLIGHT.position.set(x,y,z);FXLIGHT.color.setHex(hex);FXLIGHT.distance=dist||9;
  fxLI=inten;FXLIGHT.intensity=inten;fxLT=fxLT0=dur;
}

/* ================= 1. DISPAROS ================= */
const _fxP=new THREE.Vector3(),_fxD=new THREE.Vector3(),_fxR=new THREE.Vector3();
/* Boca del arma: la calcula core_g (muzzleWorld); si no hay arma con modelo, se cae a
   "un poco delante de la cámara", que es lo que hacía core_b con el trazador. */
function fxMuzzle(){
  if(_mzW&&wModel&&_mzW(_fxP,_fxD))return true;
  camera.getWorldDirection(_fxD);
  _fxP.copy(camera.position).addScaledVector(_fxD,.55);
  return false;
}
function fxRight(){
  const e=camera.matrixWorld.elements;
  _fxR.set(e[0],e[1],e[2]);
}
/* piso aproximado para que los casquillos y las chispas del caño reboten en algo:
   plBody.position ES el pie (las dos esferas de la cápsula van desplazadas +r en core_b) */
function fxFloorY(){ return plBody?plBody.position.y+.02:0; }

let FXSHOTS=0;
/* muzzleFlash de core_g queda REASIGNADO: mismo nombre, mismo momento de llamada (el wrapper
   de fireGun en core_g), pero en capas. */
muzzleFlash=function(scale){
  FXSHOTS++;
  if(!FXA)return;
  /* k: en 1ª persona el caño queda a ~50 cm del ojo, así que el MISMO fogonazo de 3ª tapa
     media pantalla (medido: la estrella de .46 m a .5 m da 130 px de ancho más las púas, y se
     comía el punto de impacto). .30 deja un fogonazo de ~90 px, que se lee sin tapar nada. */
  const s=scale||1, fp=!!PL.fp, k=fp?.30:1;
  fxMuzzle();fxRight();
  const px=_fxP.x+_fxD.x*.05,py=_fxP.y+_fxD.y*.05,pz=_fxP.z+_fxD.z*.05;
  const nx=_fxD.x,ny=_fxD.y,nz=_fxD.z;
  fxBasis(nx,ny,nz);

  /* (a) NÚCLEO: estrella blanca sobre-expuesta, 50 ms */
  fxE();FXE.x=px;FXE.y=py;FXE.z=pz;FXE.tile=TIL_STAR;
  FXE.r=1.9;FXE.g=1.7;FXE.b=1.25;FXE.a=1;FXE.life=.075;
  FXE.s0=.46*s*k;FXE.s1=.14*s*k;FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;
  FXE.rot=Math.random()*6.283;fxEmit(FXA);
  /* (b) CORONA: glow naranja más grande y un pelo más lento */
  fxE();FXE.x=px+nx*.06;FXE.y=py+ny*.06;FXE.z=pz+nz*.06;FXE.tile=TIL_GLOW;
  FXE.r=1.3;FXE.g=.66;FXE.b=.2;FXE.a=.9;FXE.life=.115;
  FXE.s0=.32*s*k;FXE.s1=.70*s*k;FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;fxEmit(FXA);
  /* (c) ONDA DE CHOQUE sutil: anillo que se abre y desaparece en 100 ms */
  fxE();FXE.x=px+nx*.14;FXE.y=py+ny*.14;FXE.z=pz+nz*.14;FXE.tile=TIL_RING;
  FXE.r=1;FXE.g=.94;FXE.b=.82;FXE.a=.30;FXE.life=.14;
  FXE.s0=.16*s*k;FXE.s1=1.15*s*k*FXCAP.gs;FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;fxEmit(FXA);
  /* (d) CHISPAS DE BOCACHA CON ESTELA: cono angosto, se estiran con la velocidad */
  const ns=Math.round((fp?5:8)*s*fxMul())+2, fy=fxFloorY();
  for(let i=0;i<ns;i++){
    fxCone(nx,ny,nz,.34);
    const sp=6+Math.random()*13;
    fxE();FXE.x=px;FXE.y=py;FXE.z=pz;FXE.tile=TIL_TAIL;
    FXE.vx=_dx*sp;FXE.vy=_dy*sp+.5;FXE.vz=_dz*sp;
    FXE.r=1.7;FXE.g=1.0;FXE.b=.34;FXE.a=1;FXE.life=.13+Math.random()*.2;
    FXE.s0=.055*k;FXE.s1=.012;FXE.grav=9;FXE.drag=2.6;FXE.str=.055;
    FXE.flk=44;FXE.fl=FX_BOUNCE;FXE.fy=fy;fxEmit(FXA);
  }
  /* (e) HUMO que se disipa: sale del caño hacia adelante y sube */
  if(FXS){
    const nh=QP.key==='uld'?1:(Math.random()<.75?2:3);
    for(let i=0;i<nh;i++){
      fxCone(nx,ny,nz,.5);
      fxE();FXE.x=px+nx*.1;FXE.y=py+ny*.1;FXE.z=pz+nz*.1;
      FXE.tile=Math.random()<.5?TIL_SMOKE:TIL_SMOKE2;
      FXE.vx=_dx*(1.2+Math.random()*1.6);FXE.vy=_dy*1.2+.5;FXE.vz=_dz*(1.2+Math.random()*1.6);
      FXE.r=.72;FXE.g=.70;FXE.b=.66;FXE.a=.22;FXE.life=.75+Math.random()*.7;
      FXE.s0=.09*k;FXE.s1=(.5+Math.random()*.35)*k;FXE.grav=-.35;FXE.drag=2.2;FXE.fin=.07;
      FXE.rot=Math.random()*6.283;FXE.rvel=(Math.random()-.5)*1.6;FXE.turb=.5;
      FXE.fl=FX_SMOKE;fxEmit(FXS);
    }
  }
  /* (f) CASQUILLO: sale por la derecha del arma y rebota en el piso */
  const w=weap();
  if(w&&w.mag&&w.id!=='rpg'&&w.id!=='crossbow'){
    fxCasing(px-nx*.12+_fxR.x*.06,py-ny*.12+.02,pz-nz*.12+_fxR.z*.06,
      _fxR.x*(1.9+Math.random()*1.2)-nx*.5,1.7+Math.random()*1.1,
      _fxR.z*(1.9+Math.random()*1.2)-nz*.5,fy);
  }
  /* (g) luz corta */
  fxFlashLight(px,py,pz,0xffc06a,7.5,.055,8);
};

/* ---------- material del impacto ---------- */
function fxMatOf(body,prop){
  if(prop&&prop.def&&prop.def.parts){
    const ms=_pms?_pms(prop.def):null;
    if(ms){
      if(ms.glass)return 'glass';
      if(ms.wood||ms.plank||ms.cardboard)return 'wood';
      if(ms.metal||ms.steel||ms.chrome||ms.rust||ms.corrugated)return 'metal';
      if(ms.concrete||ms.brick||ms.tile||ms.asphalt||ms.stone)return 'concrete';
      return 'plastic';
    }
  }
  const m=(body&&body.userData&&body.userData.m)||'';
  if(/glass/.test(m))return 'glass';
  if(/wood|plank/.test(m))return 'wood';
  if(/steel|metal|chrome|rust|corrugated/.test(m))return 'metal';
  if(/grass|dirt|sand/.test(m))return 'dirt';
  return 'concrete';
}
/* ---------- impacto por material ---------- */
let FXIMP=0;
function fxImpact(x,y,z,nx,ny,nz,mat,sc){
  FXIMP++;
  if(!FXA)return;
  const s=sc||1,M=fxMul();
  const l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;nx/=l;ny/=l;nz/=l;
  fxBasis(nx,ny,nz);
  const fy=y+.004;                 /* plano de rebote = la propia superficie golpeada */
  const flat=ny>.55;               /* ¿superficie horizontal? sólo ahí tiene sentido rebotar */
  /* destello del golpe (siempre): estrella + corona. 80 ms, no 45: a 17 fps un destello de
     45 ms cae ENTRE dos frames y literalmente no se ve nunca (comprobado en captura). */
  fxE();FXE.x=x+nx*.02;FXE.y=y+ny*.02;FXE.z=z+nz*.02;FXE.tile=TIL_STAR;
  FXE.r=mat==='metal'?1.9:1.3;FXE.g=mat==='metal'?1.6:1.05;FXE.b=mat==='metal'?1:.78;
  FXE.a=1;FXE.life=.08;FXE.s0=(mat==='metal'?.42:.30)*s;FXE.s1=.07;
  FXE.grav=0;FXE.drag=0;FXE.rot=Math.random()*6.283;FXE.fl=FX_POP;fxEmit(FXA);
  fxE();FXE.x=x+nx*.03;FXE.y=y+ny*.03;FXE.z=z+nz*.03;FXE.tile=TIL_GLOW;
  FXE.r=mat==='metal'?1.5:.95;FXE.g=mat==='metal'?1.0:.8;FXE.b=mat==='metal'?.45:.62;
  FXE.a=.8;FXE.life=.13;FXE.s0=(mat==='metal'?.26:.20)*s;FXE.s1=(mat==='metal'?.6:.5)*s;
  FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;fxEmit(FXA);
  /* anillo de polvo/onda a ras de la superficie: lo que "planta" el impacto en la pared */
  fxE();FXE.x=x+nx*.03;FXE.y=y+ny*.03;FXE.z=z+nz*.03;FXE.tile=TIL_RING;
  FXE.r=mat==='metal'?1.3:.9;FXE.g=mat==='metal'?1.1:.86;FXE.b=mat==='metal'?.7:.8;
  FXE.a=.34;FXE.life=.16;FXE.s0=.10*s;FXE.s1=.85*s;
  FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;fxEmit(FXA);

  if(mat==='metal'){
    /* CHISPAS: muchas, muy estiradas, con titileo rápido y rebote rasante */
    const n=Math.round(19*s*M);
    for(let i=0;i<n;i++){
      fxCone(nx,ny,nz,.95);
      const sp=4+Math.random()*10;
      fxE();FXE.x=x+nx*.02;FXE.y=y+ny*.02;FXE.z=z+nz*.02;FXE.tile=TIL_TAIL;
      FXE.vx=_dx*sp;FXE.vy=_dy*sp+.4;FXE.vz=_dz*sp;
      FXE.r=1.9;FXE.g=1.25+Math.random()*.4;FXE.b=.5;FXE.a=1;
      FXE.life=.22+Math.random()*.5;FXE.s0=.05;FXE.s1=.01;
      FXE.grav=13;FXE.drag=1.1;FXE.str=.062;FXE.flk=38+Math.random()*30;
      if(flat){FXE.fl=FX_BOUNCE;FXE.fy=fy;}
      fxEmit(FXA);
    }
    /* un puntito de metal al rojo que queda un rato */
    fxE();FXE.x=x+nx*.01;FXE.y=y+ny*.01;FXE.z=z+nz*.01;FXE.tile=TIL_GLOW;
    FXE.r=1.5;FXE.g=.42;FXE.b=.1;FXE.a=.8;FXE.life=.5;FXE.s0=.10*s;FXE.s1=.02;
    FXE.grav=0;FXE.drag=0;FXE.flk=9;fxEmit(FXA);
    if(FXS){
      fxE();FXE.x=x+nx*.3;FXE.y=y+ny*.3;FXE.z=z+nz*.3;FXE.tile=TIL_SMOKE;
      FXE.vx=nx*.7;FXE.vy=ny*.7+.5;FXE.vz=nz*.7;
      FXE.r=.6;FXE.g=.58;FXE.b=.56;FXE.a=.2;FXE.life=.6+Math.random()*.4;
      FXE.s0=.07;FXE.s1=.34;FXE.grav=-.3;FXE.drag=2.2;FXE.turb=.4;FXE.fin=.06;
      FXE.rot=Math.random()*6.283;FXE.fl=FX_SMOKE;fxEmit(FXS);
    }
    fxDecal(x,y,z,nx,ny,nz,.22*s);
    fxFlashLight(x+nx*.1,y+ny*.1,z+nz*.1,0xffd9a0,3.2,.05,4.5);
  }
  else if(mat==='wood'){
    /* ASTILLAS: shards que giran (rvel) y caen, color madera, sin brillo */
    const n=Math.round(11*s*M);
    for(let i=0;i<n;i++){
      fxCone(nx,ny,nz,.85);
      const sp=2.2+Math.random()*6;
      fxE();FXE.x=x+nx*.02;FXE.y=y+ny*.02;FXE.z=z+nz*.02;FXE.tile=TIL_SHARD;
      FXE.vx=_dx*sp;FXE.vy=_dy*sp+1;FXE.vz=_dz*sp;
      FXE.r=.62;FXE.g=.43;FXE.b=.24;FXE.a=.95;
      FXE.life=.5+Math.random()*.6;FXE.s0=.035+Math.random()*.05;FXE.s1=.02;
      FXE.grav=15;FXE.drag=.7;FXE.rot=Math.random()*6.283;FXE.rvel=(Math.random()-.5)*22;
      if(flat){FXE.fl=FX_BOUNCE;FXE.fy=fy;}
      fxEmit(FXA);
    }
    if(FXS)for(let i=0;i<2;i++){
      fxCone(nx,ny,nz,.6);
      fxE();FXE.x=x+nx*.32;FXE.y=y+ny*.32;FXE.z=z+nz*.32;FXE.tile=TIL_SMOKE2;
      FXE.vx=_dx*1.3;FXE.vy=_dy*1.3+.4;FXE.vz=_dz*1.3;
      FXE.r=.68;FXE.g=.58;FXE.b=.44;FXE.a=.26;FXE.life=.7+Math.random()*.5;
      FXE.s0=.10;FXE.s1=.5;FXE.grav=-.2;FXE.drag=2.4;FXE.turb=.4;FXE.fin=.06;
      FXE.rot=Math.random()*6.283;FXE.fl=FX_SMOKE;fxEmit(FXS);
    }
    fxDecal(x,y,z,nx,ny,nz,.26*s);
  }
  else if(mat==='glass'){
    /* VIDRIO: esquirlas brillantes (aditivas) que destellan al girar + un glint */
    const n=Math.round(16*s*M);
    for(let i=0;i<n;i++){
      fxCone(nx,ny,nz,1);
      const sp=3+Math.random()*8;
      fxE();FXE.x=x+nx*.02;FXE.y=y+ny*.02;FXE.z=z+nz*.02;FXE.tile=TIL_SHARD;
      FXE.vx=_dx*sp;FXE.vy=_dy*sp+1.2;FXE.vz=_dz*sp;
      FXE.r=.85;FXE.g=1.0;FXE.b=1.15;FXE.a=.75;
      FXE.life=.6+Math.random()*.7;FXE.s0=.03+Math.random()*.035;FXE.s1=.015;
      FXE.grav=16;FXE.drag=.5;FXE.rot=Math.random()*6.283;FXE.rvel=(Math.random()-.5)*30;
      FXE.flk=14+Math.random()*22;
      if(flat){FXE.fl=FX_BOUNCE;FXE.fy=fy;}
      fxEmit(FXA);
    }
    fxE();FXE.x=x+nx*.03;FXE.y=y+ny*.03;FXE.z=z+nz*.03;FXE.tile=TIL_STAR;
    FXE.r=1.4;FXE.g=1.6;FXE.b=1.8;FXE.a=.9;FXE.life=.09;FXE.s0=.30*s;FXE.s1=.10;
    FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;FXE.rot=Math.random()*6.283;fxEmit(FXA);
  }
  else{
    /* HORMIGÓN / TIERRA / PLÁSTICO: polvo (lo que más se ve) + esquirlas + poquita chispa */
    const dirt=mat==='dirt';
    /* gris CÁLIDO de tono medio, no blanco: el piso de hormigón del mapa es gris claro
       (~200/255), así que un polvo casi blanco al 34% de alfa movía el píxel un 6% — o sea,
       invisible (medido sobre g2-fx-hormigon2). Un tono medio se lee sobre superficies claras
       Y oscuras, que es lo que hace falta cuando el mismo material aparece en sombra. */
    const cr=dirt?.44:.60,cg=dirt?.37:.56,cb=dirt?.27:.49;
    const n=Math.round((dirt?9:10)*s*M);
    for(let i=0;i<n;i++){
      fxCone(nx,ny,nz,.9);
      const sp=1.8+Math.random()*5.5;
      fxE();FXE.x=x+nx*.02;FXE.y=y+ny*.02;FXE.z=z+nz*.02;FXE.tile=TIL_SHARD;
      FXE.vx=_dx*sp;FXE.vy=_dy*sp+1.1;FXE.vz=_dz*sp;
      FXE.r=cr*1.35;FXE.g=cg*1.35;FXE.b=cb*1.35;FXE.a=.95;
      FXE.life=.45+Math.random()*.55;FXE.s0=.05+Math.random()*.07;FXE.s1=.02;
      FXE.grav=16;FXE.drag=.8;FXE.rot=Math.random()*6.283;FXE.rvel=(Math.random()-.5)*20;
      if(flat){FXE.fl=FX_BOUNCE;FXE.fy=fy;}
      fxEmit(FXA);
    }
    /* estelitas de polvo fino: dan la sensación de "reventón" antes de que crezca la nube */
    const n2=Math.round(10*s*M);
    for(let i=0;i<n2;i++){
      fxCone(nx,ny,nz,.75);
      const sp=3+Math.random()*7;
      fxE();FXE.x=x+nx*.02;FXE.y=y+ny*.02;FXE.z=z+nz*.02;FXE.tile=TIL_TAIL;
      FXE.vx=_dx*sp;FXE.vy=_dy*sp+.6;FXE.vz=_dz*sp;
      FXE.r=cr*1.5;FXE.g=cg*1.5;FXE.b=cb*1.5;FXE.a=.8;
      FXE.life=.18+Math.random()*.22;FXE.s0=.09;FXE.s1=.02;
      FXE.grav=7;FXE.drag=2.4;FXE.str=.05;fxEmit(FXA);
    }
    if(FXS){
      const nh=Math.max(3,Math.round(6*M));
      for(let i=0;i<nh;i++){
        fxCone(nx,ny,nz,.7);
        /* SEPARADO de la pared/piso por 25-55 cm: el puff es un quad encarado a la cámara de
           hasta 1,7 m, y a 5 cm de una superficie horizontal MEDIO QUAD queda por debajo del
           piso y lo descarta el z-test — el polvo no se veía nunca (medido en captura). */
        const off=.25+Math.random()*.3;
        fxE();FXE.x=x+nx*off+_tux*(Math.random()-.5)*.5;
        FXE.y=y+ny*off+_tuy*(Math.random()-.5)*.5;
        FXE.z=z+nz*off+_tuz*(Math.random()-.5)*.5;
        FXE.tile=Math.random()<.5?TIL_SMOKE:TIL_SMOKE2;
        FXE.vx=_dx*(1.5+Math.random()*1.6);FXE.vy=_dy*1.5+.55;FXE.vz=_dz*(1.5+Math.random()*1.6);
        FXE.r=cr;FXE.g=cg;FXE.b=cb;FXE.a=.55;FXE.life=.9+Math.random()*.9;
        FXE.s0=.26;FXE.s1=1.0+Math.random()*.7;FXE.grav=-.25;FXE.drag=2.1;FXE.fin=.05;
        FXE.rot=Math.random()*6.283;FXE.rvel=(Math.random()-.5)*1.4;FXE.turb=.55;
        FXE.fl=FX_SMOKE;fxEmit(FXS);
      }
    }
    if(!dirt)fxDecal(x,y,z,nx,ny,nz,.30*s);
  }
}

/* ---------- enganche: el MISMO aimRay que usa core_n para el sonido ---------- */
const FXHIT={ok:0,x:0,y:0,z:0,nx:0,ny:1,nz:0,body:null,prop:null};
const _fxAim0=aimRay;
aimRay=function(len,spread){
  const h=_fxAim0(len,spread);
  /* se COPIAN los números: rr.hitPointWorld es un Vec3 reusado por cannon y el siguiente
     raycast lo sobreescribe */
  if(h){FXHIT.ok=1;FXHIT.x=h.p.x;FXHIT.y=h.p.y;FXHIT.z=h.p.z;
    FXHIT.nx=h.n.x;FXHIT.ny=h.n.y;FXHIT.nz=h.n.z;FXHIT.body=h.body||null;FXHIT.prop=h.prop||null;}
  else FXHIT.ok=0;
  return h;
};
/* spark() de core_b (la esfera amarilla) pasa a ser EL impacto por material */
spark=function(p,s){
  nsafe(()=>{
    let mat='concrete',nx,ny,nz;
    const d=FXHIT.ok?(Math.abs(FXHIT.x-p.x)+Math.abs(FXHIT.y-p.y)+Math.abs(FXHIT.z-p.z)):9;
    if(d<.02){nx=FXHIT.nx;ny=FXHIT.ny;nz=FXHIT.nz;mat=fxMatOf(FXHIT.body,FXHIT.prop);}
    else{camera.getWorldDirection(_fxD);nx=-_fxD.x;ny=-_fxD.y;nz=-_fxD.z;}
    fxImpact(p.x,p.y,p.z,nx,ny,nz,mat,s||1);
  },'fximp');
};
/* el trazador de core_b sigue existiendo, pero aditivo y más fino: opaco y amarillo parecía
   un palo de plástico atravesando la escena */
nsafe(()=>{tracerMat.blending=THREE.AdditiveBlending;tracerMat.opacity=.55;
  tracerMat.depthWrite=false;tracerMat.color.setHex(0xffe2a0);tracerMat.needsUpdate=true;},'fxtr');

/* ---------- los puntos de core_l dejan de ser CUADRADOS ----------
   core_l usa un PointsMaterial SIN textura: cada chispa es un cuadrado duro de 42 cm, y en las
   capturas se ven como confeti pixelado al lado de las chispas suaves de acá. No se toca
   core_l: se le escribe la propiedad .map del material que ya existe (const pMat => la
   REFERENCIA es constante, las propiedades no) con un punto redondo con degradado. */
nsafe(()=>{
  if(typeof pMat==='undefined'||!pMat)return;
  const c=document.createElement('canvas');c.width=c.height=64;
  const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,31);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.28,'rgba(255,255,255,.80)');
  gr.addColorStop(.6,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;
  t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;
  pMat.map=t;pMat.alphaTest=0;pMat.needsUpdate=true;
},'fxpmat');

/* ================= 2. PIROTECNIA ================= */
/* cola de "segundas capas" (doble estallido) sin allocations: un Float32Array plano */
const FXQN=48,FXQS=11;
const FXQ=new Float32Array(FXQN*FXQS);   /* t,x,y,z,r,g,b,size,spd,mode,_ */
let fxqN=0;
function fxSched(t,x,y,z,r,g,b,size,spd,mode){
  if(fxqN>=FXQN)return;
  const o=fxqN++*FXQS;
  FXQ[o]=t;FXQ[o+1]=x;FXQ[o+2]=y;FXQ[o+3]=z;FXQ[o+4]=r;FXQ[o+5]=g;FXQ[o+6]=b;
  FXQ[o+7]=size;FXQ[o+8]=spd;FXQ[o+9]=mode;
}
/* una capa de chispas con estela: es el ladrillo de todos los estallidos */
function fxShellLayer(x,y,z,r,g,b,size,spd,n,life,strk,flk){
  for(let i=0;i<n;i++){
    fxSphere();
    const sp=spd*(.55+Math.random()*.6);
    fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_TAIL;
    FXE.vx=_dx*sp;FXE.vy=_dy*sp;FXE.vz=_dz*sp;
    FXE.r=r;FXE.g=g;FXE.b=b;FXE.a=1;
    FXE.life=life*(.75+Math.random()*.5);
    FXE.s0=(.26+Math.random()*.22)*size;FXE.s1=.04;
    FXE.grav=3.1;FXE.drag=.52;FXE.str=strk;FXE.flk=flk*(.7+Math.random()*.7);
    fxEmit(FXA);
  }
}
const _fxC=new THREE.Color();
function fxPickClr(clr,i){
  const a=Array.isArray(clr)?clr:(clr==null?null:[clr]);
  if(!a||!a.length){_fxC.setHex(0xffcf7a);return;}
  _fxC.set(a[(i==null?Math.floor(Math.random()*a.length):i)%a.length]);
}
let FXBURSTS=0;
/* las CAPAS AAA del estallido; core_l sigue haciendo su parte (sonido, luz, sus puntos) */
function fxBurstLayers(x,y,z,opts){
  FXBURSTS++;
  if(!FXA)return;
  const size=Math.max(.3,Math.min(3,(opts&&opts.size)||1));
  const style=(opts&&opts.burst)||'peony';
  const M=fxMul(),spd=6.5+size*3.2;
  fxPickClr(opts&&opts.clr,0);
  /* se multiplica el color SIN sumarle un piso: sumar a los tres canales (era +.35) lo
     desaturaba y los estallidos salían casi blancos contra el cielo (visto en captura). El
     brillo se consigue pasando de 1 — el atributo es float y el blending es aditivo. */
  const r0=Math.min(2.1,_fxC.r*1.95+.06),g0=Math.min(2.1,_fxC.g*1.95+.06),
        b0=Math.min(2.1,_fxC.b*1.95+.06);
  fxPickClr(opts&&opts.clr,1);
  const r1=Math.min(2.1,_fxC.r*1.95+.06),g1=Math.min(2.1,_fxC.g*1.95+.06),
        b1=Math.min(2.1,_fxC.b*1.95+.06);

  /* (0) HUMO PRIMERO. Es lo que hace que el estallido se lea contra el cielo claro: sin un
     fondo más oscuro, sumar luz sobre 0x9fbcd4 casi no cambia el píxel. */
  if(FXS){
    const nh=Math.max(3,Math.round((4+size*3.4)*M));
    for(let i=0;i<nh;i++){
      fxSphere();
      const sp=1.2+Math.random()*2.4*size;
      fxE();FXE.x=x+_dx*.4*size;FXE.y=y+_dy*.4*size;FXE.z=z+_dz*.4*size;
      FXE.tile=Math.random()<.5?TIL_SMOKE:TIL_SMOKE2;
      FXE.vx=_dx*sp;FXE.vy=_dy*sp+.25;FXE.vz=_dz*sp;
      /* teñido por el propio estallido pero MAS OSCURO que el cielo (0x9fbcd4 ~ .62 de
         luminancia): si el humo fuera claro no se distinguiría del fondo y las chispas
         aditivas no tendrían contra qué resaltar */
      FXE.r=.26+_fxC.r*.26;FXE.g=.26+_fxC.g*.26;FXE.b=.28+_fxC.b*.26;
      FXE.a=.34;FXE.life=2.6+Math.random()*2.2;FXE.fin=.20;
      FXE.s0=1.5*size*FXCAP.gs;FXE.s1=(3.2+Math.random()*2.2)*size*FXCAP.gs;
      FXE.grav=-.10;FXE.drag=.85;FXE.turb=.5;
      FXE.rot=Math.random()*6.283;FXE.rvel=(Math.random()-.5)*.7;
      FXE.fl=FX_SMOKE;fxEmit(FXS);
    }
  }
  /* (1) GLOW ADITIVO con sprite de gradiente: el "flash" que se ve de lejos */
  fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_STAR;
  FXE.r=1.9;FXE.g=1.85;FXE.b=1.7;FXE.a=1.25;FXE.life=.28;
  FXE.s0=(1.6+size*2.4)*FXCAP.gs;FXE.s1=(3.6+size*5)*FXCAP.gs;FXE.grav=0;FXE.drag=0;
  FXE.rot=Math.random()*6.283;FXE.fl=FX_POP;fxEmit(FXA);
  fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_GLOW;
  FXE.r=r0;FXE.g=g0;FXE.b=b0;FXE.a=.9;FXE.life=.5;
  FXE.s0=(2+size*3)*FXCAP.gs;FXE.s1=(6+size*8)*FXCAP.gs;FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;fxEmit(FXA);
  /* (2) FRENTE DE ONDA: anillo que se abre con el estallido */
  fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_RING;
  FXE.r=r0*.8;FXE.g=g0*.8;FXE.b=b0*.8;FXE.a=.4;FXE.life=.34;
  FXE.s0=1*size;FXE.s1=(9+size*7)*FXCAP.gs;FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;fxEmit(FXA);
  /* (3) CAPA 1 de chispas con estela */
  const n1=Math.round((style==='willow'?34:46)*(.6+size*.5)*M);
  fxShellLayer(x,y,z,r0,g0,b0,size,spd,n1,style==='willow'?2.1:1.35,.075,22);
  /* (4) DOBLE ESTALLIDO: la segunda capa sale 130 ms después, más rápida y de otro color.
     Se agenda en la cola plana (no se llama a burst(), que dispararía otro sonido). */
  fxSched(.13,x,y,z,r1,g1,b1,size,spd*1.45,1);
  if(size>1.1||style==='multi'||style==='crackle')fxSched(.30,x,y,z,r0,g0,b0,size*.8,spd*.75,2);
  /* (5) LLUVIA DE BRASAS con arrastre: viven varios segundos y titilan al caer */
  const nb=Math.round((10+size*9)*M);
  for(let i=0;i<nb;i++){
    fxSphere();
    const sp=spd*(.2+Math.random()*.5);
    fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_SPARK;
    FXE.vx=_dx*sp;FXE.vy=_dy*sp;FXE.vz=_dz*sp;
    FXE.r=1.75;FXE.g=.62+Math.random()*.35;FXE.b=.16;FXE.a=.95;
    FXE.life=2.3+Math.random()*2.1;
    FXE.s0=.30*size;FXE.s1=.05;FXE.grav=2.4;FXE.drag=1.9;FXE.str=.03;
    FXE.flk=8+Math.random()*11;fxEmit(FXA);
  }
  fxFlashLight(x,y,z,_fxC.getHex(),12,.3,44);
}
/* la cola de segundas capas */
function fxSchedStep(dt){
  let i=0;
  while(i<fxqN){
    const o=i*FXQS;
    FXQ[o]-=dt;
    if(FXQ[o]>0){i++;continue;}
    const x=FXQ[o+1],y=FXQ[o+2],z=FXQ[o+3],r=FXQ[o+4],g=FXQ[o+5],b=FXQ[o+6],
          sz=FXQ[o+7],sp=FXQ[o+8],mode=FXQ[o+9];
    nsafe(()=>{
      if(mode===1){
        /* segundo estallido: más chico, más rápido, con su propio destello */
        fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_STAR;
        FXE.r=1.85;FXE.g=1.8;FXE.b=1.7;FXE.a=.9;FXE.life=.13;
        FXE.s0=(1.1+sz*1.5)*FXCAP.gs;FXE.s1=(2.4+sz*3)*FXCAP.gs;FXE.grav=0;FXE.drag=0;
        FXE.rot=Math.random()*6.283;FXE.fl=FX_POP;fxEmit(FXA);
        fxShellLayer(x,y,z,r,g,b,sz*.85,sp,Math.round(30*(.6+sz*.5)*fxMul()),.95,.08,30);
      }else{
        /* tercer "crack": puntitos blancos cortos, el chasquido visual */
        const n=Math.round(22*fxMul());
        for(let k=0;k<n;k++){
          fxSphere();
          const s2=sp*(.5+Math.random()*.8);
          fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_SPARK;
          FXE.vx=_dx*s2;FXE.vy=_dy*s2;FXE.vz=_dz*s2;
          FXE.r=1.9;FXE.g=1.85;FXE.b=1.7;FXE.a=1;FXE.life=.2+Math.random()*.22;
          FXE.s0=.2*sz;FXE.s1=.04;FXE.grav=2.4;FXE.drag=1.4;FXE.flk=55;fxEmit(FXA);
        }
      }
    },'fxsched');
    fxqN--;
    if(i!==fxqN){const j=fxqN*FXQS;for(let k=0;k<FXQS;k++)FXQ[o+k]=FXQ[j+k];}
  }
}
/* burst() de core_l REASIGNADO: primero lo de siempre (sonido/luz/sus puntos), después las capas */
const _fxBurst0=burst;
burst=function(x,y,z,opts){
  _fxBurst0(x,y,z,opts);
  nsafe(()=>fxBurstLayers(x,y,z,opts),'fxburst');
};

/* ---------- estela de los proyectiles de core_l (cohetes, morteros, velas) ----------
   Las "bolitas" balísticas de core_l son partículas con shell:true dentro de PARR. Se envuelve
   spawnParticle para quedarse con la REFERENCIA al objeto: así se puede leer su x/y/z vivo cada
   frame y dejarle una cola de chispas, sin tocar core_l ni duplicar la simulación. */
const FXSH=[];
const _fxSp0=spawnParticle;
spawnParticle=function(o){
  const r=_fxSp0(o);
  if(o&&o.shell&&FXSH.length<14){o._fxA=0;FXSH.push(o);}
  return r;
};
function fxShellTrails(dt){
  let i=0;
  while(i<FXSH.length){
    const q=FXSH[i];
    if(q.life<=0||q.burstDone){FXSH[i]=FXSH[FXSH.length-1];FXSH.pop();continue;}
    q._fxA+=dt*(fxMul()>.6?46:22);
    while(q._fxA>=1){
      q._fxA--;
      fxE();
      FXE.x=q.x+(Math.random()-.5)*.1;FXE.y=q.y+(Math.random()-.5)*.1;FXE.z=q.z+(Math.random()-.5)*.1;
      FXE.tile=TIL_TAIL;
      FXE.vx=-q.vx*.10+(Math.random()-.5)*1.2;FXE.vy=-q.vy*.10+(Math.random()-.5)*1.2;
      FXE.vz=-q.vz*.10+(Math.random()-.5)*1.2;
      FXE.r=1.8;FXE.g=1.0+Math.random()*.4;FXE.b=.35;FXE.a=1;
      FXE.life=.3+Math.random()*.35;FXE.s0=.17;FXE.s1=.03;
      FXE.grav=2.4;FXE.drag=1.5;FXE.str=.045;FXE.flk=30;fxEmit(FXA);
    }
    /* cabeza incandescente del cohete */
    fxE();FXE.x=q.x;FXE.y=q.y;FXE.z=q.z;FXE.tile=TIL_GLOW;
    FXE.r=1.7;FXE.g=1.15;FXE.b=.5;FXE.a=.85;FXE.life=.07;FXE.s0=.55;FXE.s1=.3;
    FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;fxEmit(FXA);
    i++;
  }
}

/* ================= 3. EXPLOSIONES (boom) en capas ================= */
const _fxBoom0=boom;
boom=function(P,R){
  _fxBoom0(P,R);
  nsafe(()=>{
    if(!FXA)return;
    const M=fxMul(),x=P.x,y=P.y,z=P.z;
    /* núcleo blanco + bola de fuego */
    fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_STAR;
    FXE.r=1.9;FXE.g=1.8;FXE.b=1.5;FXE.a=1;FXE.life=.14;
    FXE.s0=R*.5*FXCAP.gs;FXE.s1=R*1.5*FXCAP.gs;FXE.grav=0;FXE.drag=0;FXE.rot=Math.random()*6.283;
    FXE.fl=FX_POP;fxEmit(FXA);
    for(let i=0;i<Math.round(6*M)+2;i++){
      fxSphere();
      fxE();FXE.x=x+_dx*R*.2;FXE.y=y+_dy*R*.2;FXE.z=z+_dz*R*.2;FXE.tile=TIL_GLOW;
      FXE.vx=_dx*R*.7;FXE.vy=_dy*R*.7+R*.3;FXE.vz=_dz*R*.7;
      FXE.r=1.6;FXE.g=.7;FXE.b=.18;FXE.a=.9;FXE.life=.24+Math.random()*.2;
      FXE.s0=R*.28*FXCAP.gs;FXE.s1=R*.8*FXCAP.gs;FXE.grav=-2;FXE.drag=3;FXE.fl=FX_POP;fxEmit(FXA);
    }
    /* onda de choque */
    fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_RING;
    FXE.r=1.2;FXE.g=1.05;FXE.b=.8;FXE.a=.5;FXE.life=.3;
    FXE.s0=R*.4;FXE.s1=R*3.2*FXCAP.gs;FXE.grav=0;FXE.drag=0;FXE.fl=FX_POP;fxEmit(FXA);
    /* brasas con estela */
    const nb=Math.round((16+R*2)*M),fy=y-.4;
    for(let i=0;i<nb;i++){
      fxSphere();
      const sp=R*(.5+Math.random()*1.5);
      fxE();FXE.x=x;FXE.y=y;FXE.z=z;FXE.tile=TIL_TAIL;
      FXE.vx=_dx*sp;FXE.vy=Math.abs(_dy)*sp*.8+R*.4;FXE.vz=_dz*sp;
      FXE.r=1.8;FXE.g=.85;FXE.b=.25;FXE.a=1;FXE.life=.7+Math.random()*1.3;
      FXE.s0=.3;FXE.s1=.05;FXE.grav=11;FXE.drag=.9;FXE.str=.05;FXE.flk=16;
      FXE.fl=FX_BOUNCE;FXE.fy=fy;fxEmit(FXA);
    }
    /* humo negro que queda */
    if(FXS)for(let i=0;i<Math.max(3,Math.round(6*M));i++){
      fxSphere();
      fxE();FXE.x=x+_dx*R*.3;FXE.y=y+Math.abs(_dy)*R*.25;FXE.z=z+_dz*R*.3;
      FXE.tile=Math.random()<.5?TIL_SMOKE:TIL_SMOKE2;
      FXE.vx=_dx*R*.28;FXE.vy=R*.35+Math.random()*R*.2;FXE.vz=_dz*R*.28;
      FXE.r=.20;FXE.g=.185;FXE.b=.175;FXE.a=.5;FXE.life=2.4+Math.random()*2;FXE.fin=.14;
      FXE.s0=R*.35*FXCAP.gs;FXE.s1=R*1.5*FXCAP.gs;FXE.grav=-.3;FXE.drag=1.1;FXE.turb=.7;
      FXE.rot=Math.random()*6.283;FXE.rvel=(Math.random()-.5)*.8;FXE.fl=FX_SMOKE;fxEmit(FXS);
    }
    fxFlashLight(x,y,z,0xffa040,18,.35,R*7);
  },'fxboom');
};

/* ================= bucle ================= */
let fxT=0,fxHold=0;   /* fxHold: sólo para sondas — congela las capas para capturar un destello */
EXT.frame.push(dt=>{
  if(fxHold)return;
  const d=dt>.05?.05:dt;      /* nada por frame sin dt, y con techo: un hipo no debe teletransportar */
  fxT+=d;
  nsafe(()=>{
    fxSchedStep(d);
    fxShellTrails(d);
    fxStepLayer(FXA,d,fxT);
    fxStepLayer(FXS,d,fxT);
    fxCasStep(d);
    /* válvula adaptativa: fpsShow lo refresca adaptRes() en core_b cada 24 frames, así que no
       hace falta medir de nuevo — se reusa el promedio que ya existe */
    if(fxLoadPin>=0)fxLoad=fxLoadPin;
    else if(typeof fpsShow!=='undefined'&&fpsShow>0){
      if(fpsShow<20){if(fxLoad>.4)fxLoad=Math.max(.4,fxLoad-d*.9);}
      else if(fpsShow>=27&&fxLoad<1)fxLoad=Math.min(1,fxLoad+d*.35);
    }
    /* la luz del fogonazo se apaga LINEAL sobre su propia duración (nunca acumulativa: un
       decaimiento tipo intensity*=.55 depende del fps y a 20 fps queda encendida el doble) */
    if(FXLIGHT&&fxLT>0){fxLT-=d;
      if(fxLT<=0){fxLT=0;FXLIGHT.intensity=0;}
      else FXLIGHT.intensity=fxLI*(fxLT/fxLT0);}
  },'fxframe');
});

/* ================= hooks de medición ================= */
if(DEV&&window.__H)Object.assign(window.__H,{
  fxInfo:()=>({add:FXA?FXA.n:0,addCap:FXA?FXA.N:0,smoke:FXS?FXS.n:0,smokeCap:FXS?FXS.N:0,
    dec:FXCAP.dec,cas:FXCAP.cas,mul:FXCAP.mul,gs:FXCAP.gs,load:+fxLoad.toFixed(2),qp:QP.key,ultra:FXULTRA,
    sched:fxqN,shells:FXSH.length,shots:FXSHOTS,imps:FXIMP,bursts:FXBURSTS,
    atlas:!!FXATL,calls:renderer.info.render.calls}),
  /* un disparo REAL (con munición garantizada) para medir el efecto completo */
  fxShot:n=>{const w=weap();
    for(let i=0;i<(n||1);i++){
      if(w.mag)w.ammo=Math.max(w.ammo,3);
      fireT=0;reloadT=0;HOLD.fire=1;weaponStep(1/60);}
    HOLD.fire=0;
    return{add:FXA?FXA.n:0,smoke:FXS?FXS.n:0,imps:FXIMP,shots:FXSHOTS};},
  /* estallido de prueba: por defecto 22 m delante de la cámara y 10 m más arriba */
  fxBurst:(style,x,y,z)=>{
    camera.getWorldDirection(_fxD);
    const px=x==null?camera.position.x+_fxD.x*22:x,
          py=y==null?camera.position.y+_fxD.y*22+10:y,
          pz=z==null?camera.position.z+_fxD.z*22:z;
    burst(px,py,pz,{burst:style||'peony',clr:[0xff4a2a,0x3ad0ff,0xffe14a],size:1.5});
    return[+px.toFixed(1),+py.toFixed(1),+pz.toFixed(1)];},
  fxImpact:(mat)=>{const h=aimRay(60,0);if(!h)return null;
    fxImpact(h.p.x,h.p.y,h.p.z,h.n.x,h.n.y,h.n.z,mat||fxMatOf(h.body,h.prop),1);
    return mat||fxMatOf(h.body,h.prop);},
  fxMat:()=>{const h=aimRay(60,0);return h?fxMatOf(h.body,h.prop):null;},
  /* avanza SOLO las capas de este archivo y vuelve a renderizar: sirve para capturar un
     destello de 80 ms en un chromium que va a 17 fps (un sleep de 60 ms cae donde quiere) */
  /* congela el avance de las capas (el rAF del juego sigue renderizando): sin esto, entre el
     render manual y pg.screenshot() se cuela un frame real de ~110 ms y el destello ya murió */
  fxHold:(v)=>{fxHold=v?1:0;return fxHold;},
  /* fija la válvula adaptativa (null = automática). Las capturas se sacan con 1, porque el
     chromium de software va a 13 fps y la válvula bajaría sola a .4 — en un equipo a 60 fps
     vive en 1, así que 1 es lo que hay que mostrar. */
  fxLoadSet:(v)=>{fxLoadPin=(v==null?-1:Math.max(.2,Math.min(1,+v)));
    if(fxLoadPin>=0)fxLoad=fxLoadPin;return{pin:fxLoadPin,load:fxLoad};},
  fxFrame:(dt)=>{const d=dt==null?1/60:dt;
    fxT+=d;fxSchedStep(d);fxShellTrails(d);
    fxStepLayer(FXA,d,fxT);fxStepLayer(FXS,d,fxT);fxCasStep(d);
    renderer.render(scene,camera);
    return{add:FXA?FXA.n:0,smoke:FXS?FXS.n:0};},
  /* bisección visual: pinta la capa aditiva de magenta opaco y suelta un quad gigante
     delante de la cámara. Si aparece magenta, el problema es el sprite/alfa; si no aparece,
     es el pipeline (programa, instanceCount, blending). */
  fxSolid:(on)=>{
    if(!FXA)return null;
    FXA.mat.fragmentShader=on?'varying vec2 vUv;varying vec3 vCol;varying float vA;'
      +'void main(){gl_FragColor=vec4(1.0,0.0,1.0,1.0);}':FXFS_ADD;
    FXA.mat.blending=on?THREE.NormalBlending:THREE.CustomBlending;
    FXA.mat.needsUpdate=true;
    camera.getWorldDirection(_fxD);
    fxE();FXE.x=camera.position.x+_fxD.x*4;FXE.y=camera.position.y+_fxD.y*4;
    FXE.z=camera.position.z+_fxD.z*4;
    FXE.tile=TIL_GLOW;FXE.a=1;FXE.life=3;FXE.s0=2;FXE.s1=2;FXE.grav=0;FXE.drag=0;
    fxEmit(FXA);
    return {n:FXA.n,at:[+FXE.x.toFixed(2),+FXE.y.toFixed(2),+FXE.z.toFixed(2)]};},
  fxDecTest:(sz)=>{ /* un agujero gigante a 3 m para comprobar que el pool dibuja */
    if(!FXDEC)return null;
    camera.getWorldDirection(_fxD);
    const h=aimRay(30,0);if(!h)return null;
    fxDecal(h.p.x,h.p.y,h.p.z,h.n.x,h.n.y,h.n.z,sz||1);
    return{dec:!!FXDEC,i:fxDecI,at:[+h.p.x.toFixed(2),+h.p.y.toFixed(2),+h.p.z.toFixed(2)],
      n:[+h.n.x.toFixed(2),+h.n.y.toFixed(2),+h.n.z.toFixed(2)]};},
  /* radiografía del motor de quads: si algo no se ve, la respuesta está acá */
  fxDbg:()=>{
    const L=FXA;if(!L)return{layer:null};
    const o={vis:L.mesh.visible,inst:L.g.instanceCount,maxInst:L.g._maxInstanceCount,
      idx:L.g.index?L.g.index.count:null,n:L.n,
      prog:!!(L.mat.program),diag:L.mat.program&&L.mat.program.diagnostics||null,
      needsUp:L.mat.needsUpdate,
      first:L.n?{p:[+L.P[0].toFixed(2),+L.P[1].toFixed(2),+L.P[2].toFixed(2)],
        a:+L.A[0].toFixed(3),sz:+L.A[1].toFixed(3),str:+L.A[2].toFixed(3),
        col:[+L.C[0].toFixed(2),+L.C[1].toFixed(2),+L.C[2].toFixed(2)],
        uv:[L.U[0],L.U[1]]}:null,
      tex:!!L.mat.uniforms.map.value};
    /* alfa real del atlas en el centro de cada tile: si esto da 0, no se ve NADA */
    if(FXCV)nsafe(()=>{const g=FXCV.getContext('2d');o.atlasA=[];
      for(let i=0;i<8;i++){const d=g.getImageData((i%4)*FXTS+FXTS/2,(i>>2)*FXTS+FXTS/2,1,1).data;
        o.atlasA.push(d[3]);}},'fxdbgA');
    return o;}
});
