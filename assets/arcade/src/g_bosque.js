/* ============================================================================
   BOSQUE VIVO — beta 1 de 5 · PRIMERA PERSONA
   ----------------------------------------------------------------------------
   Se camina DENTRO del bosque: pulgar izquierdo mueve, pulgar derecho mira
   (el esquema de todo shooter de celular). La misión es la misma que en la
   versión cenital, porque era buena; lo que cambió es el punto de vista:
     · Los cinco TÓTEMS del claro se apagaron y la MARCHITEZ avanza desde el
       borde hacia el ÁRBOL MADRE. Cargás una semilla de luz en el MANANTIAL y
       la llevás a un tótem apagado. Cada tótem encendido limpia su zona y
       frena el avance.
     · SE GANA con los cinco encendidos. SE PIERDE si la marchitez toca el árbol.
   En primera persona no ves el tablero entero, así que hay TRES instrumentos:
   el MINIMAPA (arriba a la izquierda, pintado del mismo campo de marchitez),
   las FLECHAS de brújula hacia los tótems apagados/manantial, y la barra de
   bosque sano. Sin eso, caminar a ciegas no es una decisión, es lotería.

   PAISAJE (el pedido: que sea lindo, no un tablero)
   -------------------------------------------------
   · Cúpula de cielo con degradado en los vértices, dibujada ÚLTIMA con
     depthWrite apagado: sólo se sombrean los píxeles donde de verdad hay cielo
     (dibujarla primero pinta la pantalla entera dos veces — lección medida en
     este pack: el relleno es lo que mata en celular).
   · Anillo de MONTAÑAS lejanas dentro de la niebla, sol con halo, nubes,
     luciérnagas. La niebla (Fog) le da profundidad al bosque y de paso
     esconde el fin del mapa.
   · CERO luces: toda la iluminación está horneada en color de vértice y todo
     es MeshBasicMaterial.
   · Presupuesto medido: ~15 llamadas de dibujo y ~7.000 triángulos, contra los
     topes de 60 y 25.000.

   EL CIERVO (el GLB generado) ya no puede ser el jugador — en primera persona
   no te ves — así que es tu COMPAÑERO: trota al lado tuyo, y mirarlo es la
   forma más rápida de saber que el mundo está vivo.
   ========================================================================== */
const G={
  slug:'bosque',name:'BOSQUE VIVO',
  title:'BOSQUE <em>VIVO</em>',
  sub:'Encendé los tótems antes de que la marchitez llegue al árbol madre.',
  subKey:'sub',
  acc:'#7fd06a',acc2:'#2f7a3a',
  levels:3,bestLabel:'TÓTEMS',bestKey:'totL',
  three:true,sky:'#bfe3f2',shadows:false,
  glbTris:2000,   /* el ciervo horneado trae 1.864: el tope va por ARRIBA a
     propósito para que el motor NO lo vuelva a simplificar */
  music:A('mus-r03.m4a'),
  sfx:{tap:A('sfx-click.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-chime.mp3'),
       win:A('sfx-power.mp3'),lose:A('sfx-lose.mp3'),seed:A('sfx-pop.mp3'),
       totem:A('sfx-chime.mp3'),bad:A('sfx-groan.mp3'),boom:A('sfx-boom.mp3')},
  glb:{ciervo:A('m-bosque-guardian.glb')},
  i18n:{
    es:{sub:'Caminá el bosque en primera persona. Cargá semillas en el manantial y encendé los cinco tótems. Si la marchitez llega al árbol madre, perdiste.',
      totL:'TÓTEMS',hudT:'TÓTEMS',hudS:'BOSQUE SANO',
      tut:'IZQUIERDA: CAMINAR · DERECHA: MIRAR',tut2:'seguí la flecha ◈ hasta el manantial',
      take:'¡SEMILLA!',lit:'¡TÓTEM ENCENDIDO!',
      full:'ya llevás una semilla',winT:'¡BOSQUE SALVADO!',loseT:'EL ÁRBOL MADRE CAYÓ',
      stTot:'Tótems encendidos',stSano:'Bosque sano',stT:'Tiempo',
      slow:'tierra muerta: vas más lento',near:'¡la marchitez llega al árbol!'},
    en:{sub:'Walk the forest in first person. Load seeds at the spring and light the five totems. If the blight reaches the mother tree, you lose.',
      totL:'TOTEMS',hudT:'TOTEMS',hudS:'HEALTHY FOREST',
      tut:'LEFT: WALK · RIGHT: LOOK',tut2:'follow the ◈ arrow to the spring',
      take:'SEED!',lit:'TOTEM LIT!',
      full:'you already carry a seed',winT:'FOREST SAVED!',loseT:'THE MOTHER TREE FELL',
      stTot:'Totems lit',stSano:'Healthy forest',stT:'Time',
      slow:'dead ground: you move slower',near:'the blight is reaching the tree!'},
    pt:{sub:'Caminhe pela floresta em primeira pessoa. Pegue sementes na fonte e acenda os cinco totens. Se a praga chegar à árvore mãe, você perde.',
      totL:'TOTENS',hudT:'TOTENS',hudS:'FLORESTA SÃ',
      tut:'ESQUERDA: ANDAR · DIREITA: OLHAR',tut2:'siga a seta ◈ até a fonte',
      take:'SEMENTE!',lit:'TOTEM ACESO!',
      full:'já está levando uma semente',winT:'FLORESTA SALVA!',loseT:'A ÁRVORE MÃE CAIU',
      stTot:'Totens acesos',stSano:'Floresta sã',stT:'Tempo',
      slow:'terra morta: você vai mais devagar',near:'a praga está chegando à árvore!'}
  }
};

/* --------------------------------------------------------------- constantes */
const N=22, TS=1.5, EXT=N*TS/2;                /* 22x22 baldosas de 1,5 = 33 u */
const OJO=1.66, FOVY=70;
const SPD=6.4, SPD_MUERTO=.45;
const R_TOT=11.2;
const B_MUERTO=.60, B_LIMPIA=4.6;
const MAN={x:0,z:6.4};
const T_SEMILLA=.55;
const NIV=[{spd:.115,name:'CALMO'},{spd:.165,name:'DURO'},{spd:.225,name:'FURIA'}];

let T3=null,scene=null,cam=null;
let sueloM=null,sueloCol=null,sueloBase=null,decorM=null,lejosM=null;
let totIM=null,cristIM=null,ciervo=null,orbe=null,manan=null,motas=null,motas0=null;
let B=null,Bsub=null,prot=null;
let px=0,pz=9,pvx=0,pvz=0,yaw=Math.PI,pitch=-.04;
let lleva=0,carga=0,tots=[],encendidos=0,fase='off',tJuego=0,nivel=1;
let tutT=0,avisoT=0,sanoPct=1,hudTxt='',bot=0,demo=0,bobF=0;
let cvx=0,cvz=0;                               /* pos del ciervo compañero */
const ARBOLES=[];                              /* [x,z,radio] para no atravesarlos */
let mini=null,miniDirty=true;                  /* minimapa fuera de línea */
/* punteros: izquierda = palanca de andar, derecha = mirar */
const DED={mov:null,mira:null};
let movV={x:0,y:0},keyV={x:0,y:0},keyL={x:0,y:0};
const TAU2=Math.PI*2;
const cl=(v,a,b)=>v<a?a:(v>b?b:v);
const hx=h=>{const n=parseInt(h.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const ix=(i,j)=>j*N+i;

function H(x,z){
  const r=Math.hypot(x,z);
  return Math.sin(x*.19)*Math.cos(z*.17)*.34 + Math.sin(x*.07+1.3)*.5
       - Math.max(0,(r-EXT+3))*.18;
}

/* ------------------------------------------------------- lote de triángulos */
const SUN=(()=>{const v=[.42,.82,.36],L=Math.hypot(...v);return v.map(x=>x/L);})();
function Lote(){return {p:[],c:[]};}
function tri(A,a,b,c,col,e){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
  const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const L=Math.hypot(nx,ny,nz)||1;nx/=L;ny/=L;nz/=L;
  let f=.44+.56*Math.max(0,nx*SUN[0]+ny*SUN[1]+nz*SUN[2])+.10*Math.max(0,ny);
  if(e)f*=e;
  A.p.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);
  for(let i=0;i<3;i++)A.c.push(col[0]*f,col[1]*f,col[2]*f);
}
const quad=(A,a,b,c,d,col,e)=>{tri(A,a,b,c,col,e);tri(A,a,c,d,col,e);};
function caja(A,cx,cy,cz,w,h,d,col,rot,e){
  const s=Math.sin(rot||0),co=Math.cos(rot||0);
  const P=(x,y,z)=>[cx+x*co+z*s,cy+y,cz-x*s+z*co];
  const X=w/2,Y=h/2,Z=d/2;
  const a=P(-X,-Y,Z),b=P(X,-Y,Z),c=P(X,Y,Z),d2=P(-X,Y,Z);
  const e1=P(-X,-Y,-Z),f=P(X,-Y,-Z),g2=P(X,Y,-Z),h2=P(-X,Y,-Z);
  quad(A,a,b,c,d2,col,e); quad(A,f,e1,h2,g2,col,e); quad(A,b,f,g2,c,col,e);
  quad(A,e1,a,d2,h2,col,e); quad(A,d2,c,g2,h2,col,e); quad(A,e1,f,b,a,col,e);
}
/* OJO CON EL SENTIDO: con x=cos y z=sin hay que recorrer el ángulo AL REVÉS
   (a1 antes que a0) o la normal apunta adentro y el descarte de caras traseras
   se come el cono entero — el árbol madre sin copa de la primera captura. */
function cono(A,cx,cy,cz,r,h,n,col,e){
  const ap=[cx,cy+h,cz];
  for(let i=0;i<n;i++){
    const a0=i/n*TAU2,a1=(i+1)/n*TAU2;
    tri(A,[cx+Math.cos(a1)*r,cy,cz+Math.sin(a1)*r],
         [cx+Math.cos(a0)*r,cy,cz+Math.sin(a0)*r],ap,col,e);
  }
}
function cil(A,cx,cy,cz,r0,r1,h,n,col,e){
  for(let i=0;i<n;i++){
    const a0=i/n*TAU2,a1=(i+1)/n*TAU2;
    quad(A,[cx+Math.cos(a1)*r0,cy,cz+Math.sin(a1)*r0],
          [cx+Math.cos(a0)*r0,cy,cz+Math.sin(a0)*r0],
          [cx+Math.cos(a0)*r1,cy+h,cz+Math.sin(a0)*r1],
          [cx+Math.cos(a1)*r1,cy+h,cz+Math.sin(a1)*r1],col,e);
  }
}
function malla(A){
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.BufferAttribute(new Float32Array(A.p),3));
  g.setAttribute('color',new T3.BufferAttribute(new Float32Array(A.c),3));
  g.computeBoundingSphere();
  return new T3.Mesh(g,new T3.MeshBasicMaterial({vertexColors:true}));
}

/* ------------------------------------------------------------------ mundo */
const C_PASTO=hx('#63b95c'),C_PASTO2=hx('#4e9d51'),C_TIERRA=hx('#8a7351');
const C_MUERTO=hx('#4a3f57'),C_MUERTO2=hx('#2e2738');
function buildSuelo(){
  const p=[],c=[];
  sueloBase=new Float32Array(N*N*3);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const x0=-EXT+i*TS,z0=-EXT+j*TS,x1=x0+TS,z1=z0+TS;
    const a=[x0,H(x0,z0),z0],b=[x1,H(x1,z0),z0],cc=[x1,H(x1,z1),z1],d=[x0,H(x0,z1),z1];
    for(const t of [[a,d,cc],[a,cc,b]]){
      p.push(t[0][0],t[0][1],t[0][2],t[1][0],t[1][1],t[1][2],t[2][0],t[2][1],t[2][2]);
      for(let k=0;k<3;k++)c.push(0,0,0);
    }
    const mx=x0+TS/2,mz=z0+TS/2;
    const r=Math.min(Math.hypot(mx,mz),Math.hypot(mx-MAN.x,mz-MAN.z));
    const base=r<2.7?C_TIERRA:(((i*7+j*3)%5)<2?C_PASTO2:C_PASTO);
    const e=.92+((i*13+j*7)%7)*.022;
    const k=ix(i,j)*3;
    sueloBase[k]=base[0]*e;sueloBase[k+1]=base[1]*e;sueloBase[k+2]=base[2]*e;
  }
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.BufferAttribute(new Float32Array(p),3));
  sueloCol=new Float32Array(c.length);
  g.setAttribute('color',new T3.BufferAttribute(sueloCol,3));
  g.computeBoundingSphere();
  sueloM=new T3.Mesh(g,new T3.MeshBasicMaterial({vertexColors:true}));
  scene.add(sueloM);
  Bsub=new Float32Array(N*N).fill(-1);
  pintaSuelo(true);
}
function pintaSuelo(forzar){
  let toco=false;
  for(let t=0;t<N*N;t++){
    const b=B[t];
    if(!forzar&&Math.abs(b-Bsub[t])<.02)continue;
    Bsub[t]=b;toco=true;
    const k=t*3;
    const m=cl((b-.15)/.85,0,1);
    const mc=b>=B_MUERTO?C_MUERTO2:C_MUERTO;
    const r=sueloBase[k]*(1-m)+mc[0]*m;
    const g2=sueloBase[k+1]*(1-m)+mc[1]*m;
    const bl=sueloBase[k+2]*(1-m)+mc[2]*m;
    for(let v=0;v<6;v++){const o=(t*6+v)*3;sueloCol[o]=r;sueloCol[o+1]=g2;sueloCol[o+2]=bl;}
  }
  if(toco||forzar){sueloM.geometry.attributes.color.needsUpdate=true;miniDirty=true;}
}
function buildDecor(){
  const A=Lote();
  const C_TR=hx('#7a5535'),C_H1=hx('#3f9c4e'),C_H2=hx('#2f7d43'),C_PI=hx('#8e9099');
  ARBOLES.length=0;
  /* ÁRBOL MADRE, el que se defiende: enorme, para verlo desde cualquier punta */
  cil(A,0,0,0,1.25,.9,4.6,7,C_TR);
  for(let i=0;i<4;i++)cono(A,0,3.4+i*1.5,0,4.4-i*.95,2.4,8,i%2?C_H2:C_H1,1+i*.05);
  ARBOLES.push([0,0,1.6]);
  for(const s of [-1,1]){
    cil(A,s*1.05,2.2,0,.24,.18,1.8,5,C_TR);
    cono(A,s*1.9,3.8,0,1.1,1.3,6,C_H2);
  }
  /* MANANTIAL */
  for(let i=0;i<10;i++){
    const a=i/10*TAU2;
    caja(A,MAN.x+Math.cos(a)*2.3,H(MAN.x,MAN.z)+.12,MAN.z+Math.sin(a)*2.3,.7,.34,.5,C_PI,a);
  }
  /* bosque */
  let s0=987654321;
  const rn=()=>{s0=(s0*1664525+1013904223)>>>0;return s0/4294967296;};
  const rr=(a,b)=>a+(b-a)*rn();
  const puestos=[];
  let it=0;
  while(puestos.length<70&&it<3500){
    it++;
    const x=rr(-EXT+1.5,EXT-1.5),z=rr(-EXT+1.5,EXT-1.5);
    const r=Math.hypot(x,z);
    if(r<4.8)continue;
    if(Math.hypot(x-MAN.x,z-MAN.z)<3.6)continue;
    let ok=true;
    for(const t of tots)if(Math.hypot(t.x-x,t.z-z)<3.2){ok=false;break;}
    if(!ok)continue;
    for(const q of puestos)if((q[0]-x)**2+(q[1]-z)**2<4.6){ok=false;break;}
    if(!ok)continue;
    puestos.push([x,z]);
    const y=H(x,z);
    if(rn()<.74){
      const h=rr(2.6,4.6);
      cil(A,x,y,z,.22,.17,h*.42,5,C_TR);
      const cc=rn()<.5?C_H1:C_H2;
      cono(A,x,y+h*.3,z,h*.42,h*.52,6,cc);
      cono(A,x,y+h*.60,z,h*.30,h*.46,6,cc,1.06);
      ARBOLES.push([x,z,.55]);
    }else{
      const s2=rr(.5,1.3);
      caja(A,x,y+s2*.3,z,s2*1.5,s2*.7,s2*1.2,C_PI,rr(0,3.14));
      ARBOLES.push([x,z,s2*.8]);
    }
  }
  /* florcitas: puntitos de color a ras del pasto, 1 llamada */
  decorM=malla(A);scene.add(decorM);
}
/* lo LEJANO: falda de pasto que sigue hasta la niebla + montañas + el cerco */
function buildLejos(){
  const A=Lote();
  const C_F=hx('#4e9d51'),C_M1=hx('#5d7a8c'),C_M2=hx('#48617a'),C_NV=hx('#e8eef4');
  /* falda: del BORDE CUADRADO del mapa hacia afuera (la niebla la funde).
     OJO: un anillo REDONDO acá estaba mal — el mapa es cuadrado, en las esquinas
     el jugador queda AFUERA del anillo y las cuerdas cruzan el mapa: media
     pantalla tapada por un triángulo (se vio en la captura). Marco cuadrado. */
  const SEG=10;
  const lado=(p0,p1)=>{
    for(let i=0;i<SEG;i++){
      const t0=i/SEG,t1=(i+1)/SEG;
      const ax=p0[0]+(p1[0]-p0[0])*t0,az=p0[1]+(p1[1]-p0[1])*t0;
      const bx2=p0[0]+(p1[0]-p0[0])*t1,bz2=p0[1]+(p1[1]-p0[1])*t1;
      const ka=95/Math.max(Math.abs(ax),Math.abs(az),1);
      const kb=95/Math.max(Math.abs(bx2),Math.abs(bz2),1);
      const a=[ax,H(ax,az),az],b=[bx2,H(bx2,bz2),bz2];
      const ao=[ax*ka,-2.5,az*ka],bo=[bx2*kb,-2.5,bz2*kb];
      /* el sentido se decide con la normal calculada: si mira abajo, se invierte */
      const ny=(ao[2]-a[2])*(bo[0]-a[0])-(ao[0]-a[0])*(bo[2]-a[2]);
      if(ny>0)quad(A,a,ao,bo,b,C_F,.9);
      else    quad(A,a,b,bo,ao,C_F,.9);
    }
  };
  const E2=EXT-.02;
  lado([-E2,E2],[E2,E2]);lado([E2,E2],[E2,-E2]);
  lado([E2,-E2],[-E2,-E2]);lado([-E2,-E2],[-E2,E2]);
  /* montañas: conos grandes con nieve, dentro de la niebla */
  let s0=24681357;
  const rn=()=>{s0=(s0*1664525+1013904223)>>>0;return s0/4294967296;};
  for(let i=0;i<14;i++){
    const a=i/14*TAU2+rn()*.3;
    const d=64+rn()*26,h=12+rn()*18,r=9+rn()*8;
    const x=Math.cos(a)*d,z=Math.sin(a)*d;
    cono(A,x,-2,z,r,h,7,rn()<.5?C_M1:C_M2);
    cono(A,x,-2+h*.62,z,r*(1-.62)*1.02,h*.38,7,C_NV,1.15);
  }
  lejosM=malla(A);scene.add(lejosM);
}
function buildCielo(){
  /* cúpula con degradado en vértices; se dibuja ÚLTIMA (renderOrder alto,
     depthWrite off): sólo se pintan los píxeles que quedaron sin tapar */
  const g=new T3.SphereGeometry(150,18,10);
  const p=g.attributes.position,col=new Float32Array(p.count*3);
  const A2=new T3.Color('#3e8fd4'),B2=new T3.Color('#cfe9f5'),c=new T3.Color();
  for(let i=0;i<p.count;i++){
    const t=cl((p.getY(i)/150+.14)/.9,0,1);
    c.copy(B2).lerp(A2,Math.pow(t,.75));
    col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
  }
  g.setAttribute('color',new T3.BufferAttribute(col,3));
  const m=new T3.Mesh(g,new T3.MeshBasicMaterial({vertexColors:true,side:T3.BackSide,
    fog:false,depthWrite:false}));
  m.renderOrder=8;m.frustumCulled=false;m.name='cielo';
  scene.add(m);
  /* sol con halo + nubes: sprites (fog:false, se dibujan con el cielo) */
  const tx=(fn)=>{const cn=document.createElement('canvas');cn.width=cn.height=64;
    fn(cn.getContext('2d'));return new T3.CanvasTexture(cn);};
  const sol=new T3.Sprite(new T3.SpriteMaterial({map:tx(g2=>{
    const d=g2.createRadialGradient(32,32,0,32,32,32);
    d.addColorStop(0,'rgba(255,252,230,1)');d.addColorStop(.3,'rgba(255,244,190,.9)');
    d.addColorStop(1,'rgba(255,238,170,0)');g2.fillStyle=d;g2.fillRect(0,0,64,64);}),
    transparent:true,blending:T3.AdditiveBlending,depthWrite:false,fog:false}));
  sol.scale.set(46,46,1);
  sol.position.set(SUN[0]*130,SUN[1]*130,SUN[2]*130);
  sol.renderOrder=9;scene.add(sol);
  const nubeT=tx(g2=>{for(let i=0;i<12;i++){
    const x=14+Math.random()*40,y=22+Math.random()*22,r=8+Math.random()*12;
    const d=g2.createRadialGradient(x,y,0,x,y,r);
    d.addColorStop(0,'rgba(255,255,255,.95)');d.addColorStop(1,'rgba(255,255,255,0)');
    g2.fillStyle=d;g2.beginPath();g2.arc(x,y,r,0,6.284);g2.fill();}});
  const nm=new T3.SpriteMaterial({map:nubeT,transparent:true,opacity:.92,
    depthWrite:false,fog:false});
  for(let i=0;i<5;i++){
    const s=new T3.Sprite(nm);
    const a=i/5*TAU2+.5,d=70+((i*37)%40);
    s.position.set(Math.cos(a)*d,26+(i%3)*9,Math.sin(a)*d);
    s.scale.set(34+(i%3)*14,13+(i%2)*6,1);
    s.renderOrder=9;scene.add(s);
  }
  /* luciérnagas: un Points */
  const NM=90,pp=new Float32Array(NM*3),cc2=new Float32Array(NM*3);
  const c3=new T3.Color();
  let s1=1357;
  const rn=()=>{s1=(s1*1664525+1013904223)>>>0;return s1/4294967296;};
  for(let i=0;i<NM;i++){
    const a=rn()*TAU2,d=3+rn()*(EXT-4);
    const x=Math.cos(a)*d,z=Math.sin(a)*d;
    pp[i*3]=x;pp[i*3+1]=H(x,z)+.5+rn()*2.4;pp[i*3+2]=z;
    c3.setHSL(.12+rn()*.08,.95,.62+rn()*.15);
    cc2[i*3]=c3.r;cc2[i*3+1]=c3.g;cc2[i*3+2]=c3.b;
  }
  motas0=Float32Array.from(pp);
  const gg=new T3.BufferGeometry();
  gg.setAttribute('position',new T3.BufferAttribute(pp,3));
  gg.setAttribute('color',new T3.BufferAttribute(cc2,3));
  motas=new T3.Points(gg,new T3.PointsMaterial({size:.32,map:tx(g2=>{
    const d=g2.createRadialGradient(32,32,0,32,32,32);
    d.addColorStop(0,'rgba(255,255,255,1)');d.addColorStop(1,'rgba(255,255,255,0)');
    g2.fillStyle=d;g2.fillRect(0,0,64,64);}),vertexColors:true,transparent:true,
    blending:T3.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
  scene.add(motas);
}
function buildTotems(){
  tots=[];
  for(let i=0;i<5;i++){
    const a=-Math.PI/2+i/5*TAU2;
    tots.push({x:Math.cos(a)*R_TOT,z:Math.sin(a)*R_TOT,on:0});
  }
  const gb=new T3.BoxGeometry(1,1,1);
  const sh=[.78,.62,1.0,.52,.9,.7];
  const cA=new Float32Array(gb.attributes.position.count*3);
  for(let i=0;i<cA.length/3;i++){const s=sh[Math.floor(i/4)]||1;
    cA[i*3]=s;cA[i*3+1]=s;cA[i*3+2]=s;}
  gb.setAttribute('color',new T3.BufferAttribute(cA,3));
  totIM=new T3.InstancedMesh(gb,new T3.MeshBasicMaterial({vertexColors:true}),5);
  totIM.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(15),3);
  cristIM=new T3.InstancedMesh(new T3.OctahedronGeometry(.52,0),
    new T3.MeshBasicMaterial({}),5);
  cristIM.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(15),3);
  totIM.frustumCulled=cristIM.frustumCulled=false;
  scene.add(totIM);scene.add(cristIM);
}
function ponTotems(){
  const M=new T3.Matrix4(),V=new T3.Vector3(),C=new T3.Color();
  for(let i=0;i<5;i++){
    const t=tots[i],y=H(t.x,t.z);
    M.makeScale(1.05,3.1,1.05);M.setPosition(t.x,y+1.55,t.z);
    totIM.setMatrixAt(i,M);
    C.set(t.on?'#dff6c8':'#6b6357');totIM.setColorAt(i,C);
    const s=t.on?(1.15+Math.sin(ARC.t*3+i)*.12):.8;
    M.makeRotationY(ARC.t*(t.on?1.6:.35)+i);
    M.scale(V.set(s,s,s));
    M.setPosition(t.x,y+3.6+(t.on?Math.sin(ARC.t*2+i)*.14:0),t.z);
    cristIM.setMatrixAt(i,M);
    C.set(t.on?'#c6ff8a':'#3d4a52');cristIM.setColorAt(i,C);
  }
  totIM.instanceMatrix.needsUpdate=true;cristIM.instanceMatrix.needsUpdate=true;
  if(totIM.instanceColor)totIM.instanceColor.needsUpdate=true;
  if(cristIM.instanceColor)cristIM.instanceColor.needsUpdate=true;
}

/* --------------------------------------------------------------- marchitez */
function recuenta(){
  let sano=0;
  for(let t=0;t<N*N;t++)if(B[t]<B_MUERTO)sano++;
  sanoPct=sano/(N*N);
}
function resetB(){
  B=new Float32Array(N*N);
  prot=new Float32Array(N*N).fill(1);
  for(let i=0;i<N;i++){B[ix(i,0)]=.9;B[ix(i,N-1)]=.9;B[ix(0,i)]=.9;B[ix(N-1,i)]=.9;}
  if(Bsub)Bsub.fill(-1);
  recuenta();
}
function limpiaAlrededor(cx2,cz2){
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const x=-EXT+i*TS+TS/2,z=-EXT+j*TS+TS/2;
    const d=Math.hypot(x-cx2,z-cz2);
    if(d<B_LIMPIA){B[ix(i,j)]=0;prot[ix(i,j)]=.5;}
    else if(d<B_LIMPIA*1.8)prot[ix(i,j)]=Math.min(prot[ix(i,j)],.72);
  }
  recuenta();
}
function avanzaB(dt){
  const spd=NIV[nivel-1].spd;
  const nb=new Float32Array(N*N);
  let sano=0;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const t=ix(i,j),b=B[t];
    let pr=0;
    if(i>0)pr=Math.max(pr,B[t-1]);
    if(i<N-1)pr=Math.max(pr,B[t+1]);
    if(j>0)pr=Math.max(pr,B[t-N]);
    if(j<N-1)pr=Math.max(pr,B[t+N]);
    const emp=Math.max(0,pr-.42)*(1+b*.6);
    nb[t]=cl(b+dt*spd*emp*prot[t]*2.4,0,1);
    if(nb[t]<B_MUERTO)sano++;
  }
  B.set(nb);
  sanoPct=sano/(N*N);
}
const bEn=(x,z)=>{
  const i=cl(Math.floor((x+EXT)/TS),0,N-1),j=cl(Math.floor((z+EXT)/TS),0,N-1);
  return B[ix(i,j)];
};

/* ------------------------------------------------------------------ juego */
function metrics(){
  if(!cam)return;
  cam.aspect=ARC.W/Math.max(1,ARC.H);
  cam.updateProjectionMatrix();
}
function nuevaPartida(lvl){
  nivel=cl(lvl||1,1,3);
  px=MAN.x;pz=MAN.z+3.2;pvx=pvz=0;
  yaw=Math.PI;pitch=-.04;
  cvx=px+1.6;cvz=pz+1.2;
  lleva=0;carga=0;encendidos=0;tJuego=0;
  for(const t of tots)t.on=0;
  resetB();pintaSuelo(true);
  fase='play';tutT=5.2;avisoT=0;hudTxt='';
  hud(true);
}
function hud(forzar){
  const t=T('hudT')+' '+encendidos+'/5   ·   '+T('hudS')+' '+Math.round(sanoPct*100)+'%';
  if(forzar||t!==hudTxt){hudTxt=t;ARC.hud(lleva?'◆':'◇',t);}
}
function tomaSemilla(){
  if(lleva)return;
  lleva=1;carga=0;
  if(demo)return;
  ARC.sfx('seed');ARC.vib(14);
  ARC.toast(T('take'));
  hud(true);
}
function enciende(t){
  t.on=1;lleva=0;encendidos++;
  limpiaAlrededor(t.x,t.z);
  pintaSuelo(true);
  if(!demo){
    ARC.sfx('totem');ARC.vib([12,40,12]);ARC.shake(5);
    const p=proj(t.x,H(t.x,t.z)+3.6,t.z);
    if(p){ARC.fx.burst(p.x,p.y,{n:26,color:'#c6ff8a',speed:260,life:.7});
          ARC.fx.ring(p.x,p.y,{r:120,color:'#dff6c8'});}
    ARC.toast(T('lit'));
    hud(true);
  }
  if(encendidos>=5)gana();
}
function gana(){
  if(demo)return;
  fase='fin';
  ARC.over({win:true,title:T('winT'),score:Math.round(sanoPct*100),
    stars:sanoPct>.72?3:(sanoPct>.5?2:1),
    sub:T('stTot')+': 5/5<br>'+T('stSano')+': '+Math.round(sanoPct*100)+'%<br>'+
        T('stT')+': '+tJuego.toFixed(0)+'s'});
}
function pierde(){
  if(demo)return;
  fase='fin';
  ARC.over({win:false,title:T('loseT'),score:encendidos,stars:0,
    sub:T('stTot')+': '+encendidos+'/5<br>'+T('stSano')+': '+Math.round(sanoPct*100)+'%'});
}
let projV=null;
function proj(x,y,z){
  if(!cam)return null;
  if(!projV)projV=new T3.Vector3();
  projV.set(x,y,z).project(cam);
  if(projV.z>1)return null;
  return {x:(projV.x*.5+.5)*ARC.W,y:(-projV.y*.5+.5)*ARC.H,z:projV.z};
}

/* ------------------------------------------------------------------- pasos */
function simula(dt){
  tJuego+=dt;
  if(tutT>0)tutT-=dt;
  if(avisoT>0)avisoT-=dt;
  /* --- mirar con teclas (flechas) --- */
  yaw-=keyL.x*2.4*dt;
  pitch=cl(pitch-keyL.y*1.8*dt,-1.15,1.15);
  /* --- andar: la palanca es RELATIVA A LA MIRADA (adelante = adonde mirás) --- */
  let mx=movV.x+keyV.x,my=movV.y+keyV.y;
  if(bot||demo){const b=botDir();
    /* el piloto también gira la cabeza hacia donde va: en primera persona un bot
       que camina de costado sin mirar se ve roto en el modo atracción */
    const quiero=Math.atan2(-b.x,-b.y);
    let d=quiero-yaw;while(d>Math.PI)d-=TAU2;while(d<-Math.PI)d+=TAU2;
    yaw+=cl(d,-2.6*dt,2.6*dt);
    mx=0;my=-Math.min(1,Math.hypot(b.x,b.y));
  }
  const m=Math.hypot(mx,my);
  if(m>1){mx/=m;my/=m;}
  const muerto=bEn(px,pz)>=B_MUERTO;
  const sp=SPD*(muerto?SPD_MUERTO:1);
  const sy=Math.sin(yaw),cy=Math.cos(yaw);
  const fx=-sy,fz=-cy,rx=cy,rz=-sy;
  pvx=(fx*-my+rx*mx)*sp;
  pvz=(fz*-my+rz*mx)*sp;
  let nx=cl(px+pvx*dt,-EXT+1,EXT-1);
  let nz=cl(pz+pvz*dt,-EXT+1,EXT-1);
  /* no atravesar troncos: empuje radial simple */
  for(const a of ARBOLES){
    const dx=nx-a[0],dz=nz-a[1],d=Math.hypot(dx,dz),rr2=a[2]+.42;
    if(d<rr2&&d>1e-4){nx=a[0]+dx/d*rr2;nz=a[1]+dz/d*rr2;}
  }
  px=nx;pz=nz;
  bobF+=dt*(2+7*Math.min(1,Math.hypot(pvx,pvz)/SPD));
  if(muerto&&!demo&&avisoT<=0&&fase==='play'){avisoT=3.5;ARC.toast(T('slow'));}
  /* --- ciervo compañero: trota a tu lado --- */
  const txC=px+rx*1.9-fx*1.2,tzC=pz+rz*1.9-fz*1.2;
  cvx+=(txC-cvx)*Math.min(1,dt*3.2);
  cvz+=(tzC-cvz)*Math.min(1,dt*3.2);
  /* --- manantial --- */
  if(Math.hypot(px-MAN.x,pz-MAN.z)<2.6&&!lleva){
    carga+=dt;
    if(carga>=T_SEMILLA)tomaSemilla();
  }else if(!lleva)carga=Math.max(0,carga-dt*2);
  /* --- entregar --- */
  if(lleva)for(const t of tots){
    if(t.on)continue;
    if(Math.hypot(t.x-px,t.z-pz)<2.6){enciende(t);break;}
  }
  /* --- marchitez --- */
  avanzaB(dt);
  pintaSuelo(false);
  const bc=bEn(0,0);
  if(!demo&&fase==='play'){
    if(bc>.55&&avisoT<=0){avisoT=4;ARC.sfx('bad',{vol:.6});ARC.toast(T('near'));}
    if(bc>.85)pierde();
  }
  hud();
}
function botDir(){
  let tx,tz;
  if(!lleva){tx=MAN.x;tz=MAN.z;}
  else{
    let mej=null,dm=1e9;
    for(const t of tots){if(t.on)continue;
      const d=Math.hypot(t.x-px,t.z-pz);if(d<dm){dm=d;mej=t;}}
    if(!mej){tx=MAN.x;tz=MAN.z;}else{tx=mej.x;tz=mej.z;}
  }
  let dx=tx-px,dz=tz-pz;
  const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  if(bEn(px+dx*2.2,pz+dz*2.2)>=B_MUERTO){
    for(const a of [.8,-.8,1.6,-1.6]){
      const c=Math.cos(a),s=Math.sin(a);
      const nx2=dx*c-dz*s,nz2=dx*s+dz*c;
      if(bEn(px+nx2*2.2,pz+nz2*2.2)<B_MUERTO)return {x:nx2,y:nz2};
    }
  }
  return {x:dx,y:dz};
}
function pon3D(alpha){
  const st=alpha*(1/60);
  const cx3=px+pvx*st,cz3=pz+pvz*st;
  const v=Math.min(1,Math.hypot(pvx,pvz)/SPD);
  cam.position.set(cx3,H(cx3,cz3)+OJO+Math.abs(Math.sin(bobF))*.055*v,cz3);
  cam.rotation.order='YXZ';
  cam.rotation.y=yaw;
  cam.rotation.x=pitch+Math.sin(bobF*2)*.004*v;
  cam.rotation.z=0;
  if(ciervo){
    ciervo.position.set(cvx,H(cvx,cvz)+Math.abs(Math.sin(ARC.t*9))*.1*v,cvz);
    ciervo.rotation.y=Math.atan2(px-cvx,pz-cvz);
  }
  if(orbe){
    orbe.visible=!!lleva||carga>.05;
    const k=lleva?1:carga/T_SEMILLA;
    /* la semilla flota DELANTE de la cara, abajo: es tu "mano" */
    const sy2=Math.sin(yaw),cy2=Math.cos(yaw);
    orbe.position.set(cam.position.x-sy2*.9+cy2*.34,
                      cam.position.y-.42+Math.sin(ARC.t*3)*.04,
                      cam.position.z-cy2*.9-sy2*.34);
    orbe.scale.setScalar(.11*k+.03);
    orbe.rotation.y=ARC.t*2.2;orbe.rotation.x=ARC.t*1.3;
  }
  if(manan)manan.rotation.z=ARC.t*.35;
  if(motas){
    const p=motas.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      p.array[i*3]=motas0[i*3]+Math.sin(ARC.t*.5+i)*.5;
      p.array[i*3+1]=motas0[i*3+1]+Math.sin(ARC.t*.9+i*2.1)*.3;
      p.array[i*3+2]=motas0[i*3+2]+Math.cos(ARC.t*.43+i*1.7)*.5;
    }
    p.needsUpdate=true;
  }
  ponTotems();
}

/* -------------------------------------------------------------- API MOTOR */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  /* niebla: profundidad para el bosque y de paso funde la falda con el cielo */
  scene.fog=new T3.Fog(new T3.Color('#cfe9f5'),22,118);
  cam=new T3.PerspectiveCamera(FOVY,ARC.W/Math.max(1,ARC.H),.1,220);
  metrics();
  buildTotems();
  resetB();
  buildSuelo();
  buildDecor();
  buildLejos();
  buildCielo();
  const gl=ARC.glb&&ARC.glb.ciervo;
  if(gl&&gl.scene){
    ciervo=gl.scene;
    ciervo.traverse(o=>{if(o.isMesh){o.material=new T3.MeshBasicMaterial({
      vertexColors:!!o.geometry.attributes.color});o.frustumCulled=false;}});
    scene.add(ciervo);
  }
  orbe=new T3.Mesh(new T3.OctahedronGeometry(1,0),
    new T3.MeshBasicMaterial({color:0xdff6c8,fog:false}));
  orbe.visible=false;scene.add(orbe);
  manan=new T3.Mesh(new T3.CircleGeometry(2.0,14),
    new T3.MeshBasicMaterial({color:0x7fd6ea}));
  manan.rotation.x=-Math.PI/2;
  manan.position.set(MAN.x,H(MAN.x,MAN.z)+.06,MAN.z);scene.add(manan);
  mini=document.createElement('canvas');mini.width=mini.height=N*4;
  ARC.tray([]);
};
G.resize=function(){metrics();};
G.gfxApply=function(){};
G.start=function(lvl){
  if(!scene)return;
  demo=0;bot=0;
  nuevaPartida(lvl);
  ARC.tray([]);
};
G.step=function(dt){
  if(fase!=='play')return;
  simula(dt);
};
G.draw=function(g,alpha){
  if(!ARC.rnd||!scene)return;
  pon3D(alpha||0);
  ARC.rnd.render(scene,cam);
  dibuja2D(g);
};
G.attract=function(dt,g){
  if(!ARC.rnd||!scene)return;
  if(!demo){demo=1;nuevaPartida(2);fase='play';}
  simula(dt);
  if(encendidos>=5||bEn(0,0)>.85){nuevaPartida(2);fase='play';}
  pon3D(0);
  ARC.rnd.render(scene,cam);
};
/* punteros: mitad izquierda palanca, mitad derecha mirar. El id de cada puntero
   se guarda para que los dos pulgares trabajen a la vez sin pisarse. */
G.down=function(p,e){
  if(fase!=='play')return;
  bot=0;
  const id=e&&e.pointerId!=null?e.pointerId:0;
  if(p.x<ARC.W*.5&&!DED.mov){DED.mov={id,x0:p.x,y0:p.y};movV.x=movV.y=0;}
  else if(!DED.mira)DED.mira={id,x:p.x,y:p.y};
};
G.move=function(p,e){
  const id=e&&e.pointerId!=null?e.pointerId:0;
  if(DED.mov&&DED.mov.id===id){
    const R=Math.max(30,ARC.H*.12);
    const dx=p.x-DED.mov.x0,dy=p.y-DED.mov.y0;
    const d=Math.hypot(dx,dy),k=d>R?R/d:1;
    movV.x=dx*k/R;movV.y=dy*k/R;
  }else if(DED.mira&&DED.mira.id===id){
    yaw-=(p.x-DED.mira.x)*.0052;
    pitch=cl(pitch-(p.y-DED.mira.y)*.0052,-1.15,1.15);
    DED.mira.x=p.x;DED.mira.y=p.y;
  }
};
G.up=function(p,e){
  const id=e&&e.pointerId!=null?e.pointerId:0;
  if(DED.mov&&DED.mov.id===id){DED.mov=null;movV.x=movV.y=0;}
  if(DED.mira&&DED.mira.id===id)DED.mira=null;
};
G.key=function(c,d){
  if(c==='KeyW')keyV.y=d?-1:0;
  if(c==='KeyS')keyV.y=d?1:0;
  if(c==='KeyA')keyV.x=d?-1:0;
  if(c==='KeyD')keyV.x=d?1:0;
  if(c==='ArrowLeft')keyL.x=d?-1:0;
  if(c==='ArrowRight')keyL.x=d?1:0;
  if(c==='ArrowUp')keyL.y=d?-1:0;
  if(c==='ArrowDown')keyL.y=d?1:0;
  if(d)bot=0;
};

/* ------------------------------------------------------------- capa 2D */
function txt(g,s,x,y,size,col,al){
  g.save();
  g.font='800 '+size+'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  g.textAlign=al||'center';g.textBaseline='middle';
  g.lineWidth=Math.max(2,size*.17);g.strokeStyle='rgba(6,14,10,.72)';
  g.strokeText(s,x,y);g.fillStyle=col;g.fillText(s,x,y);
  g.restore();
}
function pintaMini(){
  const g=mini.getContext('2d'),S2=4;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const b=B[ix(i,j)];
    const m=cl((b-.15)/.85,0,1);
    const r=Math.round((99+ (74-99)*0)+ (46-99)*m);   /* verde → violeta oscuro */
    g.fillStyle=b>=B_MUERTO?'#2e2738':(m>0? 'rgb('+Math.round(99-40*m)+','+Math.round(185-110*m)+','+Math.round(92+10*m)+')':'#63b95c');
    g.fillRect(i*S2,j*S2,S2,S2);
  }
  miniDirty=false;
}
/* marcador de brújula: si el blanco está en pantalla, cartel encima; si no, una
   flecha en el borde hacia donde hay que girar. Sin esto, primera persona en un
   mapa de 33 u es caminar perdido. */
function marca(g,wx,wy,wz,glifo,col){
  const p=proj(wx,wy,wz);
  const enPant=p&&p.x>ARC.W*.06&&p.x<ARC.W*.94&&p.y>ARC.H*.08&&p.y<ARC.H*.92;
  if(enPant){txt(g,glifo,p.x,p.y,Math.max(15,ARC.H*.055),col);return;}
  const dx=wx-px,dz=wz-pz;
  const objetivo=Math.atan2(-dx,-dz);
  let rel=objetivo-yaw;while(rel>Math.PI)rel-=TAU2;while(rel<-Math.PI)rel+=TAU2;
  const ex=ARC.W*.5-Math.sin(rel)*ARC.W*.42;
  const ey=ARC.H*.16;
  g.save();
  g.translate(ex,ey);g.rotate(-rel);
  txt(g,'▲',0,0,Math.max(13,ARC.H*.05),col);
  g.restore();
}
function dibuja2D(g){
  /* barra de bosque sano */
  const w=ARC.W*.3,h=Math.max(6,ARC.H*.02),x=ARC.W*.5-w/2,y=ARC.H*.052;
  g.fillStyle='rgba(6,16,10,.55)';g.fillRect(x-2,y-2,w+4,h+4);
  const k=cl(sanoPct,0,1);
  g.fillStyle=k>.55?'#7fd06a':(k>.3?'#e0c04a':'#e06a6a');
  g.fillRect(x,y,w*k,h);
  g.strokeStyle='rgba(220,255,230,.5)';g.lineWidth=1.5;g.strokeRect(x,y,w,h);
  /* minimapa: se redibuja fuera de línea SÓLO cuando cambió el suelo */
  if(miniDirty)pintaMini();
  const ms=Math.max(64,ARC.H*.26),mx2=10,my2=ARC.H*.5-ms/2;
  g.save();g.globalAlpha=.88;
  g.drawImage(mini,mx2,my2,ms,ms);
  g.strokeStyle='rgba(220,255,230,.6)';g.lineWidth=2;g.strokeRect(mx2,my2,ms,ms);
  const W2=(v)=>mx2+((v+EXT)/(EXT*2))*ms,Z2=(v)=>my2+((v+EXT)/(EXT*2))*ms;
  for(const t of tots){
    g.fillStyle=t.on?'#c6ff8a':'#8b8377';
    g.beginPath();g.arc(W2(t.x),Z2(t.z),3,0,TAU2);g.fill();
  }
  g.fillStyle='#7fd6ea';g.beginPath();g.arc(W2(MAN.x),Z2(MAN.z),3,0,TAU2);g.fill();
  g.fillStyle='#2f7a3a';g.beginPath();g.arc(W2(0),Z2(0),3.6,0,TAU2);g.fill();
  /* el jugador: triángulo apuntando adonde mira */
  g.save();g.translate(W2(px),Z2(pz));g.rotate(Math.atan2(-Math.sin(yaw),-Math.cos(yaw)));
  g.fillStyle='#fff';g.beginPath();g.moveTo(0,-4.4);g.lineTo(3,3.4);g.lineTo(-3,3.4);
  g.closePath();g.fill();g.restore();
  g.restore();
  /* brújula */
  if(lleva){for(const t of tots)if(!t.on)marca(g,t.x,H(t.x,t.z)+4.6,t.z,'▾','#dff6c8');}
  else marca(g,MAN.x,H(MAN.x,MAN.z)+2.2,MAN.z,'◈','#7fd6ea');
  /* carga de semilla */
  if(!lleva&&carga>.02){
    const r=Math.max(14,ARC.H*.05);
    g.strokeStyle='rgba(223,246,200,.35)';g.lineWidth=5;
    g.beginPath();g.arc(ARC.W*.5,ARC.H*.62,r,0,TAU2);g.stroke();
    g.strokeStyle='#dff6c8';g.beginPath();
    g.arc(ARC.W*.5,ARC.H*.62,r,-Math.PI/2,-Math.PI/2+TAU2*(carga/T_SEMILLA));g.stroke();
  }
  if(tutT>0&&fase==='play'){
    const a=cl(tutT/1.2,0,1);
    g.save();g.globalAlpha=a;
    txt(g,T('tut'),ARC.W*.5,ARC.H*.80,Math.max(12,ARC.H*.05),'#fff');
    txt(g,T('tut2'),ARC.W*.5,ARC.H*.88,Math.max(10,ARC.H*.038),'#cfe9d0');
    g.restore();
  }
}

/* --------------------------------------------------------------- depuración */
G.dbg={
  get state(){return {fase,encendidos,sanoPct:+sanoPct.toFixed(3),lleva,carga:+carga.toFixed(2),
    px:+px.toFixed(2),pz:+pz.toFixed(2),yaw:+yaw.toFixed(3),pitch:+pitch.toFixed(3),
    bCentro:+bEn(0,0).toFixed(3),t:+tJuego.toFixed(1),nivel,tots:tots.map(t=>t.on)};},
  autoMove(v){bot=v==null?1:(v?1:0);},
  seed(){lleva=1;carga=0;},
  goto(x,z){px=x;pz=z;},
  mira(y,p){yaw=y;if(p!=null)pitch=cl(p,-1.15,1.15);},
  light(i){if(tots[i]&&!tots[i].on){lleva=1;enciende(tots[i]);}},
  blight(v){B.fill(v);recuenta();pintaSuelo(true);},
  center(v){for(let j=8;j<14;j++)for(let i=8;i<14;i++)B[ix(i,j)]=v;recuenta();pintaSuelo(true);},
  info(){return {dib:ARC.rnd?ARC.rnd.info.render.calls:0,
    tri:ARC.rnd?ARC.rnd.info.render.triangles:0,N,tiles:N*N};},
  proj
};
window.GAME=G;
