/* =========================================================================================
   LAS MANOS EN 3D

   Pedido: *"no aparecen las manos ... que el otro cpu tambien se le vean las manos, que las manos
   sean blancas y minimalistas"*. Antes lo unico que se veia de la mano era un aro: funcionaba para
   apuntar pero el jugador no se veia a si mismo en la mesa.

   =========================================================================================
   1. LA TUYA SE RECONSTRUYE SOBRE SU PROPIO RAYO DE PANTALLA, Y ESA ES LA DECISION IMPORTANTE

   MediaPipe da tambien `worldLandmarks` en metros, y parece lo obvio: anclar la mano en la muñeca y
   escalar. Pero el juego APUNTA con el punto de pantalla —el rayo sale de ahi— y una mano colocada
   por su geometria metrica NO cae donde estan esos puntos: verias la pinza en un lugar y agarrarias
   una carta en otro. Es el mismo defecto que en RECREO costo una vuelta entera.

   Aca cada punto se pone SOBRE SU RAYO, a una profundidad que sale de su z relativa. El dibujo y el
   apuntado son la misma cosa *por construccion*, no por haberlos ajustado hasta que coincidieran.

   2. BLANCAS Y MINIMALISTAS, PERO SOBRE UNA MESA BLANCA

   Una mano blanca mate sobre una mesa blanca es una mancha. Lo que la separa no es el color sino la
   LUZ: va con material lambert, recibe la direccional y —sobre todo— PROYECTA SOMBRA sobre la mesa.
   La sombra es lo que dice "esta cosa esta flotando encima", y es lo unico que hace que una mano
   blanca sobre blanco se lea. Sin sombra habria que oscurecerla, y entonces ya no seria blanca.

   3. HUESOS Y ARTICULACIONES INSTANCIADOS: DOS LLAMADAS DE DIBUJO

   Veintiun articulaciones y veinte huesos sueltos serian 41 mallas. Instanciados son 2, haya una
   mano o haya cinco — y hay cinco, porque los dos rivales tienen dos manos cada uno.
   ========================================================================================= */
const MANO_HUESOS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
                   [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const MANOS_MAX=5;                       // la tuya mas dos por cada rival
const M_ART=22*MANOS_MAX, M_HUE=MANO_HUESOS.length*MANOS_MAX;   // 21 puntos + la palma
const matPiel=new THREE.MeshLambertMaterial({color:0xffffff});
const artMalla=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5), matPiel, M_ART);
const hueMalla=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,7,1,true), matPiel, M_HUE);
for(const m of [artMalla, hueMalla]){
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled=false; m.castShadow=true; m.receiveShadow=false;
  m.count=0; escena.add(m);
}
const _hm=new THREE.Matrix4(), _hq=new THREE.Quaternion(), _hv=new THREE.Vector3(),
      _hd=new THREE.Vector3(), _hs=new THREE.Vector3(), _hup=new THREE.Vector3(0,1,0),
      _ha=new THREE.Vector3(), _hb=new THREE.Vector3();
let _nArt=0, _nHue=0;
function manosLimpiar(){ _nArt=0; _nHue=0; }
function ponerArt(p, r){
  if(_nArt>=M_ART) return;
  _hm.makeScale(r,r,r); _hm.setPosition(p.x,p.y,p.z);
  artMalla.setMatrixAt(_nArt++, _hm);
}
function ponerHueso(a, b, r){
  if(_nHue>=M_HUE) return;
  _hd.subVectors(b,a);
  const L=_hd.length(); if(L<1e-5) return;
  _hq.setFromUnitVectors(_hup, _hd.normalize());
  _hs.set(r, L, r);
  _hv.addVectors(a,b).multiplyScalar(0.5);
  _hm.compose(_hv, _hq, _hs);
  hueMalla.setMatrixAt(_nHue++, _hm);
}
/* LA PALMA, Y NO ES UN ADORNO. Con huesos y articulaciones sueltos la mano se lee a ESQUELETO —se
   vio en la primera captura: cinco varillas con pelotitas en las junturas—. Lo que la vuelve una mano
   es el volumen que las une. Es la misma esfera instanciada, achatada y orientada segun la propia
   palma, asi que no cuesta ni una llamada de dibujo mas. */
function ponerPalma(muneca, nud1, nud4, nudM){
  if(_nArt>=M_ART) return;
  _ha.subVectors(nud4, nud1);                       // el ancho de la palma
  _hb.subVectors(nudM, muneca);                     // el largo
  const ancho=_ha.length(), largo=_hb.length();
  if(ancho<1e-5 || largo<1e-5) return;
  _hv.crossVectors(_ha, _hb).normalize();           // la normal
  _ha.normalize(); _hb.normalize();
  const m=new THREE.Matrix4().makeBasis(_ha, _hb, _hv);
  _hq.setFromRotationMatrix(m);
  _hs.set(ancho*0.56, largo*0.60, Math.min(ancho,largo)*0.20);
  _hd.addVectors(muneca, nudM).multiplyScalar(0.5);
  _hd.addScaledVector(_hb, largo*0.04);
  _hm.compose(_hd, _hq, _hs);
  artMalla.setMatrixAt(_nArt++, _hm);
}
function manosSubir(){
  artMalla.count=_nArt; hueMalla.count=_nHue;
  artMalla.instanceMatrix.needsUpdate=true;
  hueMalla.instanceMatrix.needsUpdate=true;
}

/* ---------- la tuya ---------- */
/* A QUE DISTANCIA DEL OJO SE PLANTA. Mas cerca tapa las cartas; mas lejos se ve del tamaño de un
   dedo. A 3,6 unidades la mano abierta ocupa alrededor de un tercio del ancho del cuadro, que es lo
   que ocupa una mano de verdad puesta delante de la cara. */
const MANO_Z=-3.6, MANO_PROF=1.5;
const _pmundo=[]; for(let k=0;k<21;k++) _pmundo.push(new THREE.Vector3());
function manoTuya(){
  if(!MANO.on || !MANO.hay || !MANO.hayPts) return false;
  const h=2*Math.tan(camara.fov*Math.PI/360)*Math.abs(MANO_Z);
  const w=h*camara.aspect;
  /* la z de MediaPipe es relativa a la muñeca y en unidades de ancho de mano: sirve para dar
     profundidad RELATIVA, no absoluta, asi que se centra en la muñeca y se escala */
  const z0=MANO.pts[2];
  for(let k=0;k<21;k++){
    const fx=MANO.pts[k*3], fy=MANO.pts[k*3+1], fz=MANO.pts[k*3+2]-z0;
    const prof=MANO_Z - fz*MANO_PROF;
    /* CADA PUNTO SOBRE SU RAYO: se toma la fraccion de pantalla y se la lleva al plano de SU
       profundidad, no a un plano comun. Con un plano comun la mano quedaria plana como una calcomania
       y ademas la punta del dedo no caeria donde apunta el rayo. */
    const hz=2*Math.tan(camara.fov*Math.PI/360)*Math.abs(prof), wz=hz*camara.aspect;
    _pmundo[k].set((fx-0.5)*wz, -(fy-0.5)*hz, prof).applyMatrix4(camara.matrixWorld);
  }
  /* el grosor sale del ANCHO DE LA PALMA en el mundo y no de una constante en metros: con una
     constante, la mano de alguien que se acerca a la camara sale con dedos de chorizo */
  const palma=_pmundo[0].distanceTo(_pmundo[9]) || 0.3;
  /* LAS ARTICULACIONES CASI DEL MISMO GRUESO QUE LOS HUESOS. Con las pelotitas mas gordas que los
     tubos, cada juntura se marca y el dedo se lee a hueso articulado; con los dos casi iguales el
     dedo se lee a dedo, que es lo que se pidio: blancas y minimalistas. */
  const rHue=palma*0.105, rArt=palma*0.118;
  for(let k=0;k<21;k++) ponerArt(_pmundo[k], k===0? rArt*1.2 : rArt);
  for(const [a,b] of MANO_HUESOS) ponerHueso(_pmundo[a], _pmundo[b], rHue);
  ponerPalma(_pmundo[0], _pmundo[5], _pmundo[17], _pmundo[9]);
  return true;
}

/* ---------- las de los rivales ---------- */
/* NO SE MIDEN DE NINGUNA CAMARA: SE ARMAN. Un rival no tiene manos que leer, asi que la suya es una
   pose fija —la mano apoyada, los dedos apenas abiertos— construida con los mismos veintiun puntos.
   Reusar la misma estructura no es elegancia: es lo que hace que se vean de la misma familia que la
   tuya sin escribir un segundo dibujante de manos. */
const POSE_DEDOS=[[1,0.32,-0.62],[5,0.14,-0.20],[9,0.02,0],[13,-0.10,0.16],[17,-0.22,0.34]];
function manoRival(cx, cz, ancho, alza, giro, alcance){
  const P=[];
  const co=Math.cos(giro), si=Math.sin(giro);
  const pon=(lx,lz,ly)=>{ P.push(new THREE.Vector3(cx+(lx*co-lz*si)*ancho, alza+ly*ancho,
                                                   cz+(lx*si+lz*co)*ancho)); };
  pon(0,0.55,0.02);                                    // 0 muñeca
  for(const [base, dx, dz] of POSE_DEDOS){
    /* cada dedo son cuatro puntos que se alejan de la muñeca; el pulgar sale mas al costado */
    const es=(base===1)? 0.30 : 0.26;
    for(let k=1;k<=4;k++){
      const t=k*es;
      /* ALCANCE: cuando ese rival esta tirando una carta, los dedos se estiran hacia la mesa. Es la
         unica animacion que tienen y alcanza para que se lea que fueron ELLOS los que jugaron. */
      const est=1+alcance*0.35;
      pon(dx*(0.35+t*0.5), 0.55-t*est, 0.02+Math.sin(t*2.2)*0.10*(1-alcance));
    }
  }
  const rHue=ancho*0.105, rArt=ancho*0.118;
  for(let k=0;k<P.length;k++) ponerArt(P[k], k===0? rArt*1.2 : rArt);
  for(const [a,b] of MANO_HUESOS){ if(P[a]&&P[b]) ponerHueso(P[a],P[b],rHue); }
  if(P[0]&&P[5]&&P[17]&&P[9]) ponerPalma(P[0],P[5],P[17],P[9]);
}
/* cuanto alcanza cada rival hacia la mesa: sube a 1 cuando le toca y baja sola */
const RIV_ALC=[0,0,0];
function manosRivales(dt){
  for(const j of [J_IZQ,J_DER]){
    const obj=(G.fase==='juego' && G.turno===j)? 1 : 0;
    RIV_ALC[j] += (obj-RIV_ALC[j])*Math.min(1, dt*4.2);
  }
  for(const [j, lado] of [[J_IZQ,-1],[J_DER,1]]){
    const q=G.manos[j].length;
    if(!q) continue;
    const base=lado*MESA.rivalX;
    /* dos manos por rival, a los dos lados de su abanico */
    /* EL TAMAÑO SALE DE LA CARTA Y NO DE UN NUMERO SUELTO: una mano apoyada al lado de un abanico
       tiene que medir mas o menos lo que mide una carta, o se lee a juguete. Con 1,05 en la primera
       captura eran cuatro astillas blancas al costado del abanico. */
    for(const s of [-1,1])
      manoRival(base + s*1.95, MESA.rivalZ+1.3, CARTA_W*1.35, 0.07, s*0.24, RIV_ALC[j]);
  }
}

function manosPintar(dt){
  manosLimpiar();
  manoTuya();
  manosRivales(dt);
  manosSubir();
}
