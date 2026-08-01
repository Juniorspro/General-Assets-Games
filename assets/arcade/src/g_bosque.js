/* ============================================================================
   BOSQUE VIVO — la primera de las cinco betas
   ----------------------------------------------------------------------------
   LA MISIÓN, que es lo que hace que esto sea un juego y no una demo: los cinco
   TÓTEMS del claro se apagaron y la MARCHITEZ avanza desde el borde del bosque
   hacia el ÁRBOL MADRE del centro. Vos sos el guardián: cargás una semilla de luz
   del MANANTIAL (centro) y la llevás a un tótem apagado. Cada tótem encendido
   limpia la marchitez a su alrededor y frena el avance general.
     · SE GANA con los cinco tótems encendidos.
     · SE PIERDE si la marchitez llega al árbol madre.
   Las dos cosas pasan de verdad y el jugador puede ver venir las dos: el HUD dice
   cuántos tótems van y cuánto bosque queda sano.

   POR QUÉ SE JUEGA SOLO (la tensión no está pegada con cinta)
   ----------------------------------------------------------
   · La marchitez NO avanza a ritmo fijo: avanza por PRESIÓN de vecinos, así que
     forma un frente irregular que entra por donde nadie defendió. Eso obliga a
     elegir qué tótem encender primero, que es la decisión del juego.
   · Pisar tierra marchita te frena al 45%. Un atajo por lo muerto puede salir más
     caro que el rodeo, y eso se siente sin que nadie lo explique.
   · Encender un tótem limpia un radio Y baja la velocidad local a la mitad. Los
     tótems son, literalmente, el freno: cuantos más prendés, más aire tenés.

   RENDIMIENTO (la regla de la casa: en celular manda el RELLENO, no los tri)
   -------------------------------------------------------------------------
   · CERO luces. Toda la iluminación está HORNEADA en el color de vértice y todo
     usa MeshBasicMaterial, así que el fragmento no calcula nada.
   · El suelo son 484 baldosas en UNA sola malla; la marchitez se pinta cambiando
     el atributo de color, y se sube al GPU sólo si alguna baldosa cambió de
     verdad (umbral 0,02), no todos los cuadros.
   · Los árboles y el árbol madre son UNA malla fusionada. Los tótems son un
     InstancedMesh de 5 con color por instancia.
   · El cielo es color de borrado, no una esfera: medido en este pack, una esfera
     de cielo cuesta varios ms de relleno y acá no aporta nada.
   · Cuenta: 6-7 llamadas de dibujo y ~6.000 triángulos, contra los topes de 60 y
     25.000.
   ========================================================================== */
const G={
  slug:'bosque',name:'BOSQUE VIVO',
  title:'BOSQUE <em>VIVO</em>',
  sub:'Encendé los tótems antes de que la marchitez llegue al árbol madre.',
  subKey:'sub',
  acc:'#7fd06a',acc2:'#2f7a3a',
  levels:3,bestLabel:'TÓTEMS',bestKey:'totL',
  three:true,sky:'#8fc9e8',shadows:false,
  glbTris:2000,   /* el guardián horneado trae 1.864: el tope va por ARRIBA a
     propósito para que el motor NO lo vuelva a simplificar (perdería el facetado) */
  music:A('mus-r03.m4a'),
  sfx:{tap:A('sfx-click.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-chime.mp3'),
       win:A('sfx-power.mp3'),lose:A('sfx-lose.mp3'),seed:A('sfx-pop.mp3'),
       totem:A('sfx-chime.mp3'),bad:A('sfx-groan.mp3'),boom:A('sfx-boom.mp3')},
  glb:{guard:A('m-bosque-guardian.glb')},
  i18n:{
    es:{sub:'Llevá semillas del manantial a los cinco tótems. Cada tótem encendido limpia la marchitez y la frena. Si la marchitez llega al árbol madre, perdiste.',
      totL:'TÓTEMS',hudT:'TÓTEMS',hudS:'BOSQUE SANO',
      tut:'ARRASTRÁ PARA MOVERTE',tut2:'pisá el manantial para tomar una semilla',
      take:'¡SEMILLA!',lit:'¡TÓTEM ENCENDIDO!',need:'te falta una semilla',
      full:'ya llevás una semilla',winT:'¡BOSQUE SALVADO!',loseT:'EL ÁRBOL MADRE CAYÓ',
      stTot:'Tótems encendidos',stSano:'Bosque sano',stT:'Tiempo',
      slow:'tierra muerta: vas más lento',near:'¡la marchitez llega al árbol!'},
    en:{sub:'Carry seeds from the spring to the five totems. Each lit totem clears the blight and slows it. If the blight reaches the mother tree, you lose.',
      totL:'TOTEMS',hudT:'TOTEMS',hudS:'HEALTHY FOREST',
      tut:'DRAG TO MOVE',tut2:'step on the spring to take a seed',
      take:'SEED!',lit:'TOTEM LIT!',need:'you need a seed',
      full:'you already carry a seed',winT:'FOREST SAVED!',loseT:'THE MOTHER TREE FELL',
      stTot:'Totems lit',stSano:'Healthy forest',stT:'Time',
      slow:'dead ground: you move slower',near:'the blight is reaching the tree!'},
    pt:{sub:'Leve sementes da fonte aos cinco totens. Cada totem aceso limpa a praga e a freia. Se a praga chegar à árvore mãe, você perde.',
      totL:'TOTENS',hudT:'TOTENS',hudS:'FLORESTA SÃ',
      tut:'ARRASTE PARA SE MOVER',tut2:'pise na fonte para pegar uma semente',
      take:'SEMENTE!',lit:'TOTEM ACESO!',need:'você precisa de uma semente',
      full:'já está levando uma semente',winT:'FLORESTA SALVA!',loseT:'A ÁRVORE MÃE CAIU',
      stTot:'Totens acesos',stSano:'Floresta sã',stT:'Tempo',
      slow:'terra morta: você vai mais devagar',near:'a praga está chegando à árvore!'}
  }
};

/* --------------------------------------------------------------- constantes */
/* El tablero se ve ENTERO y la cámara no se mueve. Es a propósito: la decisión
   del juego es "qué tótem defiendo primero", y para decidir hay que VER el frente
   de la marchitez completo. Una cámara que persigue esconde justo eso. */
const N=22, TS=1.5, EXT=N*TS/2;                /* 22x22 baldosas de 1,5 = 33 u */
const CAMY=25, CAMZ=23, FOVY=46;
const SPD=7.2, SPD_MUERTO=.45;                 /* velocidad y castigo en lo muerto */
const R_TOT=11.2;                              /* radio del anillo de tótems */
const B_MUERTO=.60;                            /* desde acá la baldosa está muerta */
const B_LIMPIA=4.6;                            /* radio que limpia un tótem */
const MAN={x:0,z:5.2};      /* el MANANTIAL va aparte del árbol madre: bajo la
   copa no se veía ni el agua ni el guardián (se vio en la captura), y además
   separar el lugar donde SE TOMA del lugar que SE DEFIENDE hace mejor el ida y
   vuelta: son dos puntos del mapa, no uno. */
const T_SEMILLA=.55;                           /* tarda esto en cargar la semilla */
const NIV=[{spd:.115,name:'CALMO'},{spd:.165,name:'DURO'},{spd:.225,name:'FURIA'}];

let T3=null,scene=null,cam=null;
let sueloM=null,sueloCol=null,sueloBase=null,decorM=null;
let totIM=null,cristIM=null,guard=null,orbe=null,manan=null;
let B=null,Bsub=null;                          /* marchitez por baldosa, y la subida */
let prot=null;                                 /* freno local por tótem encendido */
let px=0,pz=6,pvx=0,pvz=0,pyaw=0;
let lleva=0,carga=0,tots=[],encendidos=0,fase='off',tJuego=0,nivel=1;
let joy=null,joyV={x:0,y:0},keyV={x:0,y:0};
let tutT=0,avisoT=0,sanoPct=1,hudTxt='',bot=0,demo=0;
const TAU2=Math.PI*2;
const cl=(v,a,b)=>v<a?a:(v>b?b:v);
const hx=h=>{const n=parseInt(h.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const ix=(i,j)=>j*N+i;

/* altura suave del claro: la MISMA función para armar el suelo y para apoyar las
   patas, así el guardián nunca flota ni se hunde */
function H(x,z){
  const r=Math.hypot(x,z);
  return Math.sin(x*.19)*Math.cos(z*.17)*.34 + Math.sin(x*.07+1.3)*.5
       - Math.max(0,(r-EXT+3))*.18;
}

/* ------------------------------------------------------- lote de triángulos */
/* mismo patrón que el resto del pack: un solo Mesh con la luz cocinada */
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
/* OJO CON EL ORDEN: a,b,c,d en sentido antihorario visto DESDE AFUERA. Al revés
   la cara desaparece por el descarte de caras traseras. */
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
/* OJO CON EL SENTIDO. Con x=cos y z=sin, recorrer el ángulo hacia adelante da
   vuelta la cara: la normal apunta HACIA ADENTRO y el cono queda invisible desde
   afuera. Se vio en la primera captura — el árbol madre sin copa y los pinos como
   triángulos planos. Por eso el vértice va (a1, a0, punta) y no (a0, a1, punta). */
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
  /* Las baldosas van en UNA malla, con el color por vértice MUTABLE: la marchitez
     se pinta cambiando ese atributo, que es mucho más barato que rehacer geometría
     o tener 484 mallas. */
  const p=[],c=[];
  sueloBase=new Float32Array(N*N*3);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const x0=-EXT+i*TS,z0=-EXT+j*TS,x1=x0+TS,z1=z0+TS;
    const a=[x0,H(x0,z0),z0],b=[x1,H(x1,z0),z0],cc=[x1,H(x1,z1),z1],d=[x0,H(x0,z1),z1];
    /* antihorario mirado desde arriba: a,d,c,b */
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
  sueloM.name='suelo';scene.add(sueloM);
  Bsub=new Float32Array(N*N).fill(-1);
  pintaSuelo(true);
}
/* pinta SÓLO lo que cambió: 484 baldosas x 6 vértices son 8.700 floats, y subir
   eso cada cuadro por gusto es el tipo de gasto que después no se encuentra */
function pintaSuelo(forzar){
  let toco=false;
  for(let t=0;t<N*N;t++){
    const b=B[t];
    if(!forzar&&Math.abs(b-Bsub[t])<.02)continue;
    Bsub[t]=b;toco=true;
    const k=t*3;
    const m=cl((b-.15)/.85,0,1);              /* recién sobre 0,15 se ve enfermo */
    const mc=b>=B_MUERTO?C_MUERTO2:C_MUERTO;
    const r=sueloBase[k]*(1-m)+mc[0]*m;
    const g2=sueloBase[k+1]*(1-m)+mc[1]*m;
    const bl=sueloBase[k+2]*(1-m)+mc[2]*m;
    for(let v=0;v<6;v++){const o=(t*6+v)*3;sueloCol[o]=r;sueloCol[o+1]=g2;sueloCol[o+2]=bl;}
  }
  if(toco||forzar)sueloM.geometry.attributes.color.needsUpdate=true;
}
function buildDecor(){
  const A=Lote();
  const C_TR=hx('#7a5535'),C_H1=hx('#3f9c4e'),C_H2=hx('#2f7d43'),C_PI=hx('#8e9099');
  /* ÁRBOL MADRE en el centro: es el objetivo que hay que defender, así que tiene
     que verse de lejos y distinto a todo lo demás */
  cil(A,0,0,0,1.15,.85,3.4,7,C_TR);
  for(let i=0;i<3;i++)cono(A,0,2.6+i*1.1,0,2.7-i*.62,2.0,8,i%2?C_H2:C_H1,1+i*.05);
  for(const s of [-1,1]){
    cil(A,s*.9,1.6,0,.22,.16,1.5,5,C_TR);
    cono(A,s*1.5,2.9,0,.9,1.0,6,C_H2);
  }
  /* MANANTIAL: anillo de piedras y el agua (la baldosa donde se toma la semilla) */
  for(let i=0;i<10;i++){
    const a=i/10*TAU2;
    caja(A,MAN.x+Math.cos(a)*2.3,H(MAN.x,MAN.z)+.12,MAN.z+Math.sin(a)*2.3,.7,.34,.5,C_PI,a);
  }
  /* árboles y piedras del claro, esquivando el centro y los tótems */
  let s0=987654321;
  const rn=()=>{s0=(s0*1664525+1013904223)>>>0;return s0/4294967296;};
  const rr=(a,b)=>a+(b-a)*rn();
  const puestos=[];
  let it=0;
  while(puestos.length<64&&it<3000){
    it++;
    const x=rr(-EXT+1.5,EXT-1.5),z=rr(-EXT+1.5,EXT-1.5);
    const r=Math.hypot(x,z);
    if(r<4.6)continue;                                  /* claro del árbol madre */
    if(Math.hypot(x-MAN.x,z-MAN.z)<3.6)continue;        /* claro del manantial */
    let ok=true;
    for(const t of tots)if(Math.hypot(t.x-x,t.z-z)<3.4){ok=false;break;}
    if(!ok)continue;
    for(const q of puestos)if((q[0]-x)**2+(q[1]-z)**2<5.2){ok=false;break;}
    if(!ok)continue;
    puestos.push([x,z]);
    const y=H(x,z);
    if(rn()<.72){
      const h=rr(2.4,4.2);
      cil(A,x,y,z,.2,.16,h*.42,5,C_TR);
      const cc=rn()<.5?C_H1:C_H2;
      cono(A,x,y+h*.3,z,h*.40,h*.5,6,cc);
      cono(A,x,y+h*.58,z,h*.30,h*.46,6,cc,1.06);
    }else{
      const s2=rr(.5,1.3);
      caja(A,x,y+s2*.3,z,s2*1.5,s2*.7,s2*1.2,C_PI,rr(0,3.14));
    }
  }
  /* cerco de troncos caídos en el borde: marca de dónde entra la marchitez */
  for(let i=0;i<N;i+=2){
    const x=-EXT+i*TS+TS/2;
    caja(A,x,H(x,-EXT)+.2,-EXT+.3,TS*1.7,.4,.4,C_TR,.05,.8);
    caja(A,x,H(x,EXT)+.2,EXT-.3,TS*1.7,.4,.4,C_TR,.05,.8);
  }
  decorM=malla(A);decorM.name='decor';scene.add(decorM);
}
function buildTotems(){
  tots=[];
  for(let i=0;i<5;i++){
    const a=-Math.PI/2+i/5*TAU2;
    const x=Math.cos(a)*R_TOT,z=Math.sin(a)*R_TOT;
    tots.push({x,z,on:0,pulso:0});
  }
  const gb=new T3.BoxGeometry(1,1,1);
  /* la caja de three viene con normales suaves; se hornea el sombreado por CARA
     en el color de vértice para que el tótem tenga volumen sin una sola luz */
  const sh=[.78,.62,1.0,.52,.9,.7];
  const cA=new Float32Array(gb.attributes.position.count*3);
  for(let i=0;i<cA.length/3;i++){const s=sh[Math.floor(i/4)]||1;
    cA[i*3]=s;cA[i*3+1]=s;cA[i*3+2]=s;}
  gb.setAttribute('color',new T3.BufferAttribute(cA,3));
  totIM=new T3.InstancedMesh(gb,new T3.MeshBasicMaterial({vertexColors:true}),5);
  totIM.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(15),3);
  cristIM=new T3.InstancedMesh(new T3.OctahedronGeometry(.52,0),
    new T3.MeshBasicMaterial({vertexColors:false}),5);
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
    const s=t.on?(1.15+Math.sin(ARC.t*3+i)*.12):.75;
    M.makeRotationY(ARC.t*(t.on?1.6:.35)+i);
    M.scale(V.set(s,s,s));
    M.setPosition(t.x,y+3.5+(t.on?Math.sin(ARC.t*2+i)*.14:0),t.z);
    cristIM.setMatrixAt(i,M);
    C.set(t.on?'#c6ff8a':'#3d4a52');cristIM.setColorAt(i,C);
  }
  totIM.instanceMatrix.needsUpdate=true;cristIM.instanceMatrix.needsUpdate=true;
  if(totIM.instanceColor)totIM.instanceColor.needsUpdate=true;
  if(cristIM.instanceColor)cristIM.instanceColor.needsUpdate=true;
}

/* --------------------------------------------------------------- marchitez */
function resetB(){
  B=new Float32Array(N*N);
  prot=new Float32Array(N*N).fill(1);
  /* arranca sólo en el borde: el frente tiene que ENTRAR, no aparecer encima */
  for(let i=0;i<N;i++){B[ix(i,0)]=.9;B[ix(i,N-1)]=.9;B[ix(0,i)]=.9;B[ix(N-1,i)]=.9;}
  if(Bsub)Bsub.fill(-1);
}
function recuenta(){
  let sano=0;
  for(let t=0;t<N*N;t++)if(B[t]<B_MUERTO)sano++;
  sanoPct=sano/(N*N);
}
function limpiaAlrededor(cx,cz){
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const x=-EXT+i*TS+TS/2,z=-EXT+j*TS+TS/2;
    const d=Math.hypot(x-cx,z-cz);
    if(d<B_LIMPIA){B[ix(i,j)]=0;prot[ix(i,j)]=.5;}
    else if(d<B_LIMPIA*1.8)prot[ix(i,j)]=Math.min(prot[ix(i,j)],.72);
  }
  /* se recuenta ACÁ y no en el paso siguiente: encender un tótem es el momento de
     recompensa del juego, y la barra de bosque sano tiene que saltar en el mismo
     cuadro, no un dieciseisavo de segundo después */
  recuenta();
}
function avanzaB(dt){
  const spd=NIV[nivel-1].spd;
  const nb=new Float32Array(N*N);
  let sano=0;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const t=ix(i,j),b=B[t];
    /* PRESIÓN DE VECINOS: así el frente sale irregular y entra por donde nadie
       defendió. Con un avance por anillos concéntricos el juego no tendría
       decisión: alcanzaría con dar vueltas al mismo ritmo. */
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
  px=MAN.x;pz=MAN.z+2.4;pvx=pvz=0;pyaw=0;
  lleva=0;carga=0;encendidos=0;tJuego=0;
  for(const t of tots){t.on=0;t.pulso=0;}
  resetB();pintaSuelo(true);
  fase='play';tutT=4.2;avisoT=0;hudTxt='';
  hud(true);
}
function hud(forzar){
  const t=T('hudT')+' '+encendidos+'/5   ·   '+T('hudS')+' '+Math.round(sanoPct*100)+'%';
  if(forzar||t!==hudTxt){hudTxt=t;ARC.hud(lleva?'◆':'◇',t);}
}
function tomaSemilla(){
  if(lleva){if(!demo)ARC.toast(T('full'));return;}
  lleva=1;carga=0;
  if(demo)return;
  ARC.sfx('seed');ARC.vib(14);
  ARC.toast(T('take'));
  const p=proj(0,1.4,0);if(p)ARC.fx.ring(p.x,p.y,{r:70,color:'#dff6c8'});
  hud(true);
}
function enciende(t){
  t.on=1;t.pulso=1;lleva=0;encendidos++;
  limpiaAlrededor(t.x,t.z);
  pintaSuelo(true);
  if(demo)return;
  ARC.sfx('totem');ARC.vib([12,40,12]);ARC.shake(5);
  const p=proj(t.x,H(t.x,t.z)+3.5,t.z);
  if(p){ARC.fx.burst(p.x,p.y,{n:26,color:'#c6ff8a',speed:260,life:.7});
        ARC.fx.ring(p.x,p.y,{r:120,color:'#dff6c8'});
        ARC.fx.text(p.x,p.y-30,T('lit'),{color:'#dff6c8',size:Math.max(14,ARC.H*.05),life:1});}
  ARC.toast(T('lit'));
  hud(true);
  if(encendidos>=5)gana();
}
function gana(){
  fase='fin';
  ARC.over({win:true,title:T('winT'),score:Math.round(sanoPct*100),
    stars:sanoPct>.72?3:(sanoPct>.5?2:1),
    sub:T('stTot')+': 5/5<br>'+T('stSano')+': '+Math.round(sanoPct*100)+'%<br>'+
        T('stT')+': '+tJuego.toFixed(0)+'s'});
}
function pierde(){
  fase='fin';
  ARC.over({win:false,title:T('loseT'),score:encendidos,noStars:false,stars:0,
    sub:T('stTot')+': '+encendidos+'/5<br>'+T('stSano')+': '+Math.round(sanoPct*100)+'%'});
}

/* proyección mundo→pantalla para los carteles de la capa 2D */
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
  /* --- movimiento --- */
  let vx=joyV.x+keyV.x,vz=joyV.y+keyV.y;
  if(bot||demo){const b=botDir();vx=b.x;vz=b.y;}
  const m=Math.hypot(vx,vz);
  if(m>1){vx/=m;vz/=m;}
  const muerto=bEn(px,pz)>=B_MUERTO;
  const sp=SPD*(muerto?SPD_MUERTO:1);
  pvx=vx*sp;pvz=vz*sp;
  px=cl(px+pvx*dt,-EXT+1,EXT-1);
  pz=cl(pz+pvz*dt,-EXT+1,EXT-1);
  if(m>.05)pyaw=Math.atan2(pvx,pvz);
  if(muerto&&!demo&&avisoT<=0&&fase==='play'){avisoT=3.5;ARC.toast(T('slow'));}
  /* --- manantial: se carga sosteniéndose encima --- */
  if(Math.hypot(px-MAN.x,pz-MAN.z)<2.4&&!lleva){
    carga+=dt;
    if(carga>=T_SEMILLA)tomaSemilla();
  }else if(!lleva)carga=Math.max(0,carga-dt*2);
  /* --- entregar --- */
  if(lleva)for(const t of tots){
    if(t.on)continue;
    if(Math.hypot(t.x-px,t.z-pz)<2.3){enciende(t);break;}
  }
  /* --- marchitez --- */
  avanzaB(dt);
  pintaSuelo(false);
  for(const t of tots)if(t.pulso>0)t.pulso=Math.max(0,t.pulso-dt*1.6);
  /* --- derrota: la marchitez toca el árbol madre --- */
  const bc=bEn(0,0);
  if(!demo&&fase==='play'){
    if(bc>.55&&avisoT<=0){avisoT=4;ARC.sfx('bad',{vol:.6});ARC.toast(T('near'));}
    if(bc>.85)pierde();
  }
  hud();
}
/* piloto: el que encuentra los bugs. Va al manantial si no lleva semilla, y si
   lleva va al tótem apagado más cercano, ESQUIVANDO lo muerto cuando puede. */
function botDir(){
  let tx=0,tz=0;
  if(!lleva){tx=MAN.x;tz=MAN.z;}
  else{
    let mej=null,dm=1e9;
    for(const t of tots){if(t.on)continue;
      const d=Math.hypot(t.x-px,t.z-pz);if(d<dm){dm=d;mej=t;}}
    if(!mej){tx=MAN.x;tz=MAN.z;}else{tx=mej.x;tz=mej.z;}
  }
  let dx=tx-px,dz=tz-pz;
  const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  /* si el paso siguiente cae en tierra muerta, prueba desviarse 45° */
  if(bEn(px+dx*2.2,pz+dz*2.2)>=B_MUERTO){
    for(const a of [.8,-.8,1.6,-1.6]){
      const c=Math.cos(a),s=Math.sin(a);
      const nx=dx*c-dz*s,nz=dx*s+dz*c;
      if(bEn(px+nx*2.2,pz+nz*2.2)<B_MUERTO){return {x:nx,y:nz};}
    }
  }
  return {x:dx,y:dz};
}
function pon3D(alpha){
  const y=H(px,pz);
  if(guard){
    guard.position.set(px+pvx*alpha*(1/60),y,pz+pvz*alpha*(1/60));
    guard.rotation.y=pyaw;
    /* trotecito: sube y baja según la velocidad, sin esqueleto ni animación */
    const v=Math.hypot(pvx,pvz)/SPD;
    guard.position.y=y+Math.abs(Math.sin(ARC.t*11))*.12*v;
    guard.rotation.z=Math.sin(ARC.t*11)*.05*v;
  }
  if(orbe){
    orbe.visible=!!lleva||carga>.05;
    const k=lleva?1:carga/T_SEMILLA;
    orbe.position.set(px,y+2.15+Math.sin(ARC.t*3)*.1,pz);
    orbe.scale.setScalar(.28*k+.06);
    orbe.rotation.y=ARC.t*2.2;orbe.rotation.x=ARC.t*1.3;
  }
  if(manan)manan.rotation.y=ARC.t*.35;
  ponTotems();
}

/* -------------------------------------------------------------- API MOTOR */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  cam=new T3.PerspectiveCamera(FOVY,ARC.W/Math.max(1,ARC.H),.5,120);
  cam.position.set(0,CAMY,CAMZ);cam.lookAt(0,1.2,0);
  metrics();
  buildTotems();
  resetB();
  buildSuelo();
  buildDecor();
  /* el guardián: viene del GLB horneado, con su color de vértice */
  const gl=ARC.glb&&ARC.glb.guard;
  if(gl&&gl.scene){
    guard=gl.scene;
    guard.traverse(o=>{if(o.isMesh)o.material=new T3.MeshBasicMaterial({
      vertexColors:!!o.geometry.attributes.color});});
    guard.scale.setScalar(1);
    scene.add(guard);
  }else{
    /* respaldo si el GLB no cargó: el juego NO se cae por un asset */
    const A=Lote();
    caja(A,0,.75,0,.8,.9,1.5,hx('#5f8347'));
    caja(A,0,1.3,.75,.5,.5,.5,hx('#b9cf8c'));
    guard=malla(A);scene.add(guard);
  }
  orbe=new T3.Mesh(new T3.OctahedronGeometry(1,0),
    new T3.MeshBasicMaterial({color:0xdff6c8}));
  orbe.visible=false;scene.add(orbe);
  manan=new T3.Mesh(new T3.CircleGeometry(2.0,14),
    new T3.MeshBasicMaterial({color:0x7fd6ea}));
  manan.rotation.x=-Math.PI/2;
  manan.position.set(MAN.x,H(MAN.x,MAN.z)+.06,MAN.z);scene.add(manan);
  ARC.tray([]);
};
G.resize=function(){metrics();};
G.gfxApply=function(){};
G.start=function(lvl){
  if(!scene)return;
  demo=0;bot=0;
  nuevaPartida(lvl);
  ARC.tray([]);          /* se maneja arrastrando: no hace falta ningún botón */
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
G.down=function(p){if(fase!=='play')return;joy={x:p.x,y:p.y};joyV.x=joyV.y=0;bot=0;};
G.move=function(p){
  if(!joy||fase!=='play')return;
  const dx=p.x-joy.x,dy=p.y-joy.y;
  const R=Math.max(28,ARC.H*.11),d=Math.hypot(dx,dy);
  const k=d>R?R/d:1;
  joyV.x=dx*k/R;joyV.y=dy*k/R;
};
G.up=function(){joy=null;joyV.x=joyV.y=0;};
G.key=function(c,d){
  const v=d?1:0;
  if(c==='ArrowUp'||c==='KeyW')keyV.y=d?-1:0;
  if(c==='ArrowDown'||c==='KeyS')keyV.y=d?1:0;
  if(c==='ArrowLeft'||c==='KeyA')keyV.x=d?-1:0;
  if(c==='ArrowRight'||c==='KeyD')keyV.x=d?1:0;
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
function dibuja2D(g){
  /* barra de bosque sano: es el reloj del juego y tiene que leerse de un ojo */
  const w=ARC.W*.32,h=Math.max(7,ARC.H*.022),x=ARC.W*.5-w/2,y=ARC.H*.045;
  g.fillStyle='rgba(6,16,10,.55)';g.fillRect(x-2,y-2,w+4,h+4);
  const k=cl(sanoPct,0,1);
  g.fillStyle=k>.55?'#7fd06a':(k>.3?'#e0c04a':'#e06a6a');
  g.fillRect(x,y,w*k,h);
  g.strokeStyle='rgba(220,255,230,.5)';g.lineWidth=1.5;g.strokeRect(x,y,w,h);
  /* sin rótulo debajo: el HUD del motor ya dice "BOSQUE SANO 83%" ahí arriba y
     repetirlo se pisaba con la barra (se vio en la captura) */
  /* semilla cargando */
  if(!lleva&&carga>.02){
    const p=proj(px,H(px,pz)+2.4,pz);
    if(p){const r=Math.max(12,ARC.H*.045);
      g.strokeStyle='rgba(223,246,200,.35)';g.lineWidth=4;
      g.beginPath();g.arc(p.x,p.y,r,0,TAU2);g.stroke();
      g.strokeStyle='#dff6c8';g.beginPath();
      g.arc(p.x,p.y,r,-Math.PI/2,-Math.PI/2+TAU2*(carga/T_SEMILLA));g.stroke();}
  }
  /* flechas a los tótems apagados: sin esto, en un tablero de 33 u el jugador no
     sabe adónde ir cuando ya tiene la semilla */
  if(lleva)for(const t of tots){
    if(t.on)continue;
    const p=proj(t.x,H(t.x,t.z)+4.4,t.z);
    if(p)txt(g,'▾',p.x,p.y,Math.max(16,ARC.H*.06),'#dff6c8');
  }
  /* tutorial de los primeros segundos */
  if(tutT>0&&fase==='play'){
    const a=cl(tutT/1.2,0,1);
    g.save();g.globalAlpha=a;
    txt(g,T('tut'),ARC.W*.5,ARC.H*.80,Math.max(12,ARC.H*.055),'#fff');
    txt(g,T('tut2'),ARC.W*.5,ARC.H*.88,Math.max(10,ARC.H*.04),'#cfe9d0');
    g.restore();
  }
}

/* --------------------------------------------------------------- depuración */
G.dbg={
  get state(){return {fase,encendidos,sanoPct:+sanoPct.toFixed(3),lleva,carga:+carga.toFixed(2),
    px:+px.toFixed(2),pz:+pz.toFixed(2),bCentro:+bEn(0,0).toFixed(3),
    t:+tJuego.toFixed(1),nivel,tots:tots.map(t=>t.on)};},
  autoMove(v){bot=v==null?1:(v?1:0);},
  seed(){lleva=1;carga=0;},
  goto(x,z){px=x;pz=z;},
  light(i){if(tots[i]&&!tots[i].on){lleva=1;enciende(tots[i]);}},
  blight(v){B.fill(v);recuenta();pintaSuelo(true);},
  center(v){for(let j=8;j<14;j++)for(let i=8;i<14;i++)B[ix(i,j)]=v;recuenta();pintaSuelo(true);},
  info(){return {dib:ARC.rnd?ARC.rnd.info.render.calls:0,
    tri:ARC.rnd?ARC.rnd.info.render.triangles:0,N,tiles:N*N};},
  proj
};
window.GAME=G;
