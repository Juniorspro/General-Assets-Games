/* =========================================================================================
   EL VECINDARIO: casas lindas, faroles, arboles, y la casa abandonada con su cartel

   Las casas son cajas con techo a dos aguas y ventanas ENCENDIDAS: de noche una casa se lee
   por sus ventanas, no por su pared. Tres de cada cuatro tienen alguna luz prendida, con
   tonos distintos — todas iguales se leen a lamparas de utileria.
   ========================================================================================= */
const mParedes=[
  new THREE.MeshStandardMaterial({ map:tex('pared', 3, 2), roughness:0.9 }),
  new THREE.MeshStandardMaterial({ map:tex('ladrillo', 3, 2), roughness:0.95 }),
];
const mTecho=new THREE.MeshStandardMaterial({ map:tex('techo', 3, 2), roughness:0.95 });
const mMadera=new THREE.MeshStandardMaterial({ map:tex('madera', 2.5, 1.6), roughness:1.0 });
/* la pared de la casa fea repite mas: con 2,5 sobre una pared de ocho metros cada tablon salia
   de treinta centimetros — tablones de utileria */
const mMaderaCasa=new THREE.MeshStandardMaterial({ map:tex('madera', 5.5, 2.4), roughness:1.0 });
const mVentanaLuz=new THREE.MeshBasicMaterial({ color:0xffd9a0 });
const mVentanaLuz2=new THREE.MeshBasicMaterial({ color:0xcfe4ff });
const mVentanaOsc=new THREE.MeshStandardMaterial({ color:0x0b0e14, roughness:0.4, metalness:0.3 });
const mMarco=new THREE.MeshStandardMaterial({ color:0xd8d4c8, roughness:0.8 });
const mTronco=new THREE.MeshStandardMaterial({ color:0x4a3a2a, roughness:1 });
const mCopa=new THREE.MeshStandardMaterial({ color:0x1c3018, roughness:1 });

let _az=20260829;
const az=()=>{ _az=(_az*1103515245+12345)&0x7fffffff; return _az/0x7fffffff; };

function casa(x, z, mirando, fea){
  const g=new THREE.Group();
  const W=8+az()*2, D=7+az()*1.5, H=3.2+az()*0.8;
  const mp = fea? mMaderaCasa : mParedes[(az()*2)|0];
  const cuerpo=new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mp);
  cuerpo.position.y=H/2; cuerpo.castShadow=true; cuerpo.receiveShadow=true; g.add(cuerpo);
  /* el techo a dos aguas: un prisma triangular, que es lo que separa "casa" de "conteiner" */
  const tg=new THREE.CylinderGeometry(0.001, W*0.74, 1.7, 4, 1);
  tg.rotateY(Math.PI/4); tg.scale(1, 1, (D+0.8)/(W*1.05));
  const techo=new THREE.Mesh(tg, mTecho);
  techo.position.y=H+0.85; techo.castShadow=true;
  if(fea) techo.rotation.y=0.05;            // el techo vencido: 3 grados bastan para "abandonada"
  g.add(techo);
  /* las ventanas del frente, con marco. En la abandonada van TAPIADAS: dos tablas cruzadas. */
  const zF=D/2+0.01;
  for(const vx of [-W*0.28, W*0.28]){
    const marco=new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.08), mMarco);
    marco.position.set(vx, 1.7, zF); g.add(marco);
    const luzPrendida=!fea && az()<0.72;
    const vid=new THREE.Mesh(new THREE.PlaneGeometry(1.24, 1.44),
      fea? mVentanaOsc : (luzPrendida? (az()<0.85? mVentanaLuz : mVentanaLuz2) : mVentanaOsc));
    vid.position.set(vx, 1.7, zF+0.05); g.add(vid);
    if(fea){
      for(const r of [0.5, -0.5]){
        const tabla=new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.05), mMadera);
        tabla.position.set(vx, 1.7, zF+0.09); tabla.rotation.z=r; g.add(tabla);
      }
    }
  }
  /* la puerta */
  const puerta=new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.1, 0.09),
    fea? mMadera : new THREE.MeshStandardMaterial({ color:0x5a3c28, roughness:0.85 }));
  puerta.position.set(0, 1.05, zF); g.add(puerta);
  if(fea){ puerta.rotation.y=0.35; puerta.position.x=0.28; }  // entreabierta y torcida
  /* la luz del porche: calida en las lindas, y en la fea NO HAY — la fea se alumbra solo con
     la luna, que es lo que la hace leerse muerta al lado de las otras */
  if(!fea){
    const foco=new THREE.PointLight(0xffc98a, 5.5, 9, 2);
    foco.position.set(0, 2.5, zF+0.5); g.add(foco);
    const b=new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshBasicMaterial({ color:0xffe0b0 }));
    b.position.copy(foco.position); g.add(b);
  }
  g.position.set(x, 0, z); g.rotation.y=mirando;
  escena.add(g);
  return g;
}

/* ---------- las casas lindas ---------- */
for(let k=0;k<4;k++) casa(-11.5, -2-k*13, Math.PI/2, false);
/* LAS DE LA DERECHA VAN MAS ATRAS QUE LAS DE LA IZQUIERDA, y salio de una captura: giradas
   -90 grados, su frente es su MEDIO FONDO (D/2 ≈ 3,9 m) hacia -x, asi que puestas en 11,5 el
   frente caia en 7,6 — arriba de la vereda que termina en 6,3. La camara camina por esta
   vereda: del otro lado nunca se noto porque nadie camina por alla. */
for(let k=0;k<3;k++) casa( 13.6, -2-k*13, -Math.PI/2, false);

/* ---------- LA CASA ABANDONADA ----------
   Va al final de la vereda, DE FRENTE a la caminata: no hay que buscarla, el camino termina
   en ella. */
const CASA_FEA={ x:13.2, z:-41.5 };
casa(CASA_FEA.x, CASA_FEA.z, -Math.PI/2, true);
/* el pasto de la fea, muerto: un disco de pasto mas amarillo alrededor */
{
  const p=new THREE.Mesh(new THREE.CircleGeometry(7, 20),
    new THREE.MeshStandardMaterial({ color:0x4a4530, roughness:1 }));
  p.rotation.x=-Math.PI/2; p.position.set(CASA_FEA.x-1, 0.015, CASA_FEA.z); escena.add(p);
}

/* ---------- EL CARTEL "NO ENTRAR" ----------
   El texto va DIBUJADO en un lienzo y no generado: una foto generada de un cartel trae letras
   casi bien, y "casi bien" en la unica palabra que la camara mira de cerca es peor que un
   dibujo simple con la letra exacta. */
const CARTEL={ x:6.9, z:-38.4 };
function cartelTextura(){
  const c=document.createElement('canvas'); c.width=512; c.height=340;
  const x=c.getContext('2d');
  x.fillStyle='#6b5c46'; x.fillRect(0,0,512,340);
  /* tablones: cuatro franjas con vetas */
  for(let t=0;t<4;t++){
    const y0=t*85;
    x.fillStyle=['#75654d','#6b5c46','#7d6d52','#665741'][t];
    x.fillRect(0,y0,512,82);
    x.strokeStyle='rgba(30,22,12,.55)'; x.lineWidth=3;
    x.strokeRect(-2,y0,516,84);
    x.strokeStyle='rgba(40,30,16,.35)'; x.lineWidth=1;
    for(let v=0;v<7;v++){ x.beginPath();
      const yv=y0+10+Math.random()*64;
      x.moveTo(0,yv); x.bezierCurveTo(170,yv+8,340,yv-8,512,yv+4); x.stroke(); }
  }
  /* la pintura roja, a mano alzada: dos pasadas desplazadas para que se lea a brocha */
  x.font='900 108px Arial'; x.textAlign='center'; x.textBaseline='middle';
  x.save(); x.translate(256,172); x.rotate(-0.045);
  x.fillStyle='rgba(140,20,14,.85)'; x.fillText('NO',0,-56); x.fillText('ENTRAR',0,58);
  x.fillStyle='rgba(190,34,24,.9)'; x.fillText('NO',3,-59); x.fillText('ENTRAR',3,55);
  x.restore();
  /* chorreaduras: la pintura de un cartel asi nunca seco prolija */
  x.fillStyle='rgba(160,26,18,.55)';
  for(const [cx,cy,l] of [[120,220,60],[256,120,44],[352,232,72],[430,120,38]])
    x.fillRect(cx, cy, 5, l);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
{
  const g=new THREE.Group();
  const poste=new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.12), mMadera);
  poste.position.y=0.85; poste.castShadow=true; g.add(poste);
  const tabla=new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.78, 0.05),
    new THREE.MeshStandardMaterial({ map:cartelTextura(), roughness:0.95 }));
  /* DELANTE del poste, no en su mismo plano: centrados los dos en z=0, el poste atravesaba la
     tabla por el medio de la palabra (medido en la captura del segundo 23) */
  tabla.position.set(0, 1.42, 0.10); tabla.rotation.z=-0.06; tabla.castShadow=true; g.add(tabla);
  g.position.set(CARTEL.x, 0, CARTEL.z);
  g.rotation.y=Math.atan2(4.8-CARTEL.x, -35.2-CARTEL.z);   // mirando a donde va a parar la camara
  escena.add(g);
}

/* ---------- los faroles ----------
   El cono de luz es un truco de dos piezas: la PointLight alumbra el piso de verdad y un cono
   translucido aditivo dibuja el aire. Un volumetrico real seria otra pasada entera; el cono
   cuesta dos triangulos por lado y de noche el ojo lo compra. */
const FAROLES=[];
function farol(x, z){
  const g=new THREE.Group();
  const mPoste=new THREE.MeshStandardMaterial({ color:0x2a2d33, roughness:0.6, metalness:0.7 });
  const poste=new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.6, 8), mPoste);
  poste.position.y=2.3; poste.castShadow=true; g.add(poste);
  const brazo=new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.07), mPoste);
  brazo.position.set(-0.4, 4.55, 0); g.add(brazo);
  const foco=new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8),
    new THREE.MeshBasicMaterial({ color:0xffe6b8 }));
  foco.position.set(-0.85, 4.48, 0); g.add(foco);
  const luz=new THREE.PointLight(0xffd9a0, 26, 17, 2);
  luz.position.copy(foco.position); g.add(luz);
  const cono=new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.4, 18, 1, true),
    new THREE.MeshBasicMaterial({ color:0xffd9a0, transparent:true, opacity:0.05,
                                  blending:THREE.AdditiveBlending, depthWrite:false,
                                  side:THREE.DoubleSide }));
  cono.position.set(-0.85, 2.3, 0); g.add(cono);
  g.position.set(x, 0, z); escena.add(g);
  FAROLES.push({ g, luz, foco });
  return g;
}
farol(6.6, 2); farol(6.6, -12); farol(6.6, -26); farol(-6.6, -6); farol(-6.6, -20);
/* EL ULTIMO FAROL, EL DE LA CASA FEA, PARPADEA. Es el unico movimiento de luz de toda la
   caminata, y por eso es el que anuncia que ahi adelante algo esta mal. */
/* en -30 y no en -36,5: puesto alla, el poste caia EXACTO entre la camara parada y la casa
   fea — un palo cruzando el plano mas importante de la cinematica */
const farolRoto=farol(6.6, -30);

/* ---------- los arboles ---------- */
{
  const geos=[];
  for(let k=0;k<10;k++){
    /* entre la vereda y las casas y NUNCA encima de un techo: con 8+az()*4 un arbol caia en
       x 11 con la casa en 11,5 y la copa quedaba clavada adentro del tejado (medido en la
       captura del segundo 2,5) */
    const x=(az()<0.5? 1 : -1)*(7.6+az()*1.6), z=2-az()*46;
    if(Math.abs(z-CASA_FEA.z)<7 && x>0) continue;      // la fea queda pelada, sin arbol que la tape
    const tr=new THREE.CylinderGeometry(0.14, 0.22, 3.4, 7);
    tr.translate(x, 1.7, z); geos.push({ g:tr, m:0 });
    /* la copa arranca por encima de las ventanas (2,6 m): mas baja tapa justo lo unico que una
       casa muestra de noche */
    const esc=1+az()*0.5;
    const co=new THREE.SphereGeometry(1.5*esc, 8, 6);
    co.scale(1, 1.3, 1); co.translate(x, 4.3+0.9*esc, z); geos.push({ g:co, m:1 });
  }
  const troncos=mergeGeometries(geos.filter(q=>q.m===0).map(q=>q.g), false);
  const copas  =mergeGeometries(geos.filter(q=>q.m===1).map(q=>q.g), false);
  for(const q of geos) q.g.dispose();
  const t1=new THREE.Mesh(troncos, mTronco); t1.castShadow=true; escena.add(t1);
  const t2=new THREE.Mesh(copas, mCopa); t2.castShadow=true; escena.add(t2);
}
