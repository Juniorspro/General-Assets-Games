/* =========================================================================================
   LAS MANOS EN 3D — EL CONSTRUCTOR

   Pedido de esta vuelta: *"mejora la mano a una mas humanoide y aplicale una optimizacion igual a la
   de baldi"*. La anterior tenia la forma correcta pero un solo grosor para todo, y una mano con
   veintiun bolitas del mismo tamano no se lee a mano: se lee a COLLAR DE CUENTAS. Lo que hace que se
   lea a mano son tres cosas, y ninguna es agregar poligonos.

   1. CADA ARTICULACION TIENE SU RADIO. La muneca es lo mas gordo, los nudillos siguen, y cada dedo
      AFINA hacia la punta. Eso solo ya cambia la lectura, y es una tabla de veintiun numeros.
   2. EL HUESO TOMA EL PROMEDIO DE SUS DOS PUNTAS, no el minimo. Con el minimo el cilindro queda mas
      fino que las dos esferas que une y cada juntura se marca — que es exactamente el collar.
   3. LA PALMA VA EN UNA BASE ORTONORMAL. La version anterior componia la matriz con el ancho y el
      largo de la palma tal cual, y esos dos vectores NO son perpendiculares en una mano de verdad:
      componer con ellos no rota el elipsoide, lo CIZALLA. Se ortonormaliza —normal por producto
      cruzado, y el ancho recalculado contra ella— y recien ahi es un elipsoide apoyado en la palma.

   Y LA OPTIMIZACION, QUE ES LA MISMA DE RECREO: las esferas bajan a 6x5 segmentos y los cilindros a
   6 lados. Un nudillo ocupa unos pocos pixeles en un telefono; la diferencia entre 8x6 y 6x5 no
   existe en pantalla y son miles de triangulos por cuadro. Todo sigue en TRES llamadas de dibujo
   —articulaciones, huesos y palmas— haya una mano o haya cinco.
   ========================================================================================= */
const MANO_HUESOS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
                   [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
/* EL RADIO DE CADA ARTICULACION, EN FRACCION DEL LARGO DE LA PALMA (muneca -> nudillo del medio).
   Va relativo y no en unidades del mundo a proposito: asi la MISMA tabla sirve para tu mano —que
   cambia de tamano segun cuanto la acerques a la camara— y para las de los rivales, que son fijas.
   Los numeros salen de una mano adulta: la palma mide 9,5 cm y la muneca 1,75 cm de radio. */
const MANO_RADIO=(()=>{
  const r=new Float32Array(21), P=0.095;
  r[0]=0.0175/P;                                                   // muneca
  const pul=[0.0150,0.0125,0.0110,0.0098];                         // pulgar
  for(let k=0;k<4;k++) r[1+k]=pul[k]/P;
  const base=[0.0135,0.0135,0.0128,0.0118];                        // indice, medio, anular, menique
  for(let d=0;d<4;d++){ const i0=5+d*4;
    r[i0]=base[d]/P; r[i0+1]=base[d]*0.86/P; r[i0+2]=base[d]*0.74/P; r[i0+3]=base[d]*0.66/P; }
  return r;
})();
const MANOS_MAX=6;                       // la tuya, dos por rival, y la de VERDAD del rival humano
/* CUATRO HUESOS DE MAS, Y SON LOS ANTEBRAZOS DE LOS RIVALES. Entran por la misma malla instanciada
   que los huesos de los dedos —mismo cilindro, mismo material— asi que agregar un antebrazo a cada
   mano no cuesta NI UNA llamada de dibujo mas. Sin ellos las manos de los rivales flotan sueltas
   sobre la mesa y se leen a guantes, no a las manos de alguien. */
const M_ART=21*MANOS_MAX, M_HUE=MANO_HUESOS.length*MANOS_MAX+4, M_PAL=MANOS_MAX;
const matPiel=new THREE.MeshLambertMaterial({color:0xffffff});
const artMalla=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,5), matPiel, M_ART);
const hueMalla=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,6,1,true), matPiel, M_HUE);
const palMalla=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6), matPiel, M_PAL);
for(const m of [artMalla, hueMalla, palMalla]){
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled=false; m.castShadow=true; m.receiveShadow=false;
  m.count=0; escena.add(m);
}
const _hm=new THREE.Matrix4(), _hq=new THREE.Quaternion(), _hv=new THREE.Vector3(),
      _hd=new THREE.Vector3(), _hs=new THREE.Vector3(), _hup=new THREE.Vector3(0,1,0),
      _hx=new THREE.Vector3(), _hy=new THREE.Vector3(), _hn=new THREE.Vector3(),
      _hmat=new THREE.Matrix4();
let _nArt=0, _nHue=0, _nPal=0;
function manosLimpiar(){ _nArt=0; _nHue=0; _nPal=0; }
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
   es el volumen que las une: un elipsoide apoyado en el plano de la palma. */
function ponerPalma(P, esc){
  if(_nPal>=M_PAL) return;
  const p0=P[0], p5=P[5], p17=P[17];
  _hv.copy(p5).add(p17).multiplyScalar(0.5);
  _hy.subVectors(_hv, p0);
  const largo=_hy.length(); if(largo<1e-5) return;
  _hy.multiplyScalar(1/largo);
  /* LA BASE SE ORTONORMALIZA. El ancho de la palma y su largo no son perpendiculares; componer la
     matriz con los dos tal cual no rota el elipsoide, lo cizalla — y una palma cizallada se ve como
     un error de render, no como una mano. La normal sale del producto cruzado y el ancho se recalcula
     contra ella, asi los tres ejes son perpendiculares por construccion. */
  _hn.crossVectors(_hd.subVectors(p5,p0), _hx.subVectors(p17,p0)).normalize();
  _hx.crossVectors(_hy, _hn).normalize();
  const ancho=p5.distanceTo(p17);
  _hmat.makeBasis(_hx, _hy, _hn);
  _hq.setFromRotationMatrix(_hmat);
  _hv.copy(p0).addScaledVector(_hy, largo*0.52);
  _hm.compose(_hv, _hq, _hs.set(ancho*0.60, largo*0.62, MANO_RADIO[0]*esc*1.05));
  palMalla.setMatrixAt(_nPal++, _hm);
}
/* EL DIBUJANTE, UNO SOLO PARA TODAS LAS MANOS DEL JUEGO. Que la tuya y las de los rivales pasen por
   aca no es ahorro de lineas: es lo que garantiza que se vean de la misma familia. Si fueran dos
   dibujantes, mejorar una dejaria la otra atras — que es justo lo que se reporto esta vuelta. */
function dibujarMano(P, esc){
  for(let i=0;i<21;i++) ponerArt(P[i], MANO_RADIO[i]*esc);
  for(const [a,b] of MANO_HUESOS)
    ponerHueso(P[a], P[b], (MANO_RADIO[a]+MANO_RADIO[b])*0.5*1.02*esc);
  ponerPalma(P, esc);
}
function manosSubir(){
  artMalla.count=_nArt; hueMalla.count=_nHue; palMalla.count=_nPal;
  artMalla.instanceMatrix.needsUpdate=true;
  hueMalla.instanceMatrix.needsUpdate=true;
  palMalla.instanceMatrix.needsUpdate=true;
}

/* =========================================================================================
   LA TUYA: RECONSTRUIDA SOBRE SU PROPIO RAYO DE PANTALLA

   MediaPipe da tambien `worldLandmarks` en metros y parece lo obvio: anclar la mano en la muneca y
   escalar. Pero el juego APUNTA con el punto de pantalla —el rayo sale de ahi— y una mano colocada
   por su geometria metrica NO cae donde estan esos puntos: verias la pinza en un lugar y agarrarias
   una carta en otro. Aca cada punto se pone SOBRE SU RAYO, a una profundidad que sale de su z
   relativa, y el dibujo y el apuntado son la misma cosa *por construccion*.
   ========================================================================================= */
const MANO_Z=-3.6, MANO_PROF=1.5;
const _pmundo=[]; for(let k=0;k<21;k++) _pmundo.push(new THREE.Vector3());
let _escMano=0;
function manoTuya(){
  if(!MANO.on || !MANO.hay || !MANO.hayPts) return false;
  /* LA MATRIZ DE LA CAMARA SE PONE AL DIA ACA. three.js la recalcula al DIBUJAR, asi que colocar la
     mano antes de dibujar la deja en la posicion del cuadro anterior — y desde que la camara orbita
     con la cabeza, eso es un desfase visible. Es la misma leccion que costo una prueba en pickEn:
     nunca dar por sentado que alguien actualizo el arbol. */
  camara.updateMatrixWorld(true);
  const z0=MANO.pts[2];
  const tanV=Math.tan(camara.fov*Math.PI/360);
  for(let k=0;k<21;k++){
    const fx=MANO.pts[k*3], fy=MANO.pts[k*3+1], fz=MANO.pts[k*3+2]-z0;
    const prof=MANO_Z - fz*MANO_PROF;
    /* CADA PUNTO SOBRE SU RAYO: se toma la fraccion de pantalla y se la lleva al plano de SU
       profundidad, no a un plano comun. Con un plano comun la mano quedaria plana como una calcomania
       y ademas la punta del dedo no caeria donde apunta el rayo. */
    const hz=2*tanV*Math.abs(prof), wz=hz*camara.aspect;
    _pmundo[k].set((fx-0.5)*wz, -(fy-0.5)*hz, prof).applyMatrix4(camara.matrixWorld);
  }
  /* LA ESCALA SALE DE LA PROPIA MANO Y SE SUAVIZA EN EL TIEMPO. Sale de la palma reconstruida, y esa
     reconstruccion usa la z — la coordenada mas ruidosa que da MediaPipe — asi que hereda todo su
     ruido. Sin suavizar, la mano quieta LATIA de grosor varias veces por segundo, y eso a ojo se lee
     como "tiembla" aunque la posicion en pantalla este perfectamente quieta. Con 0,14 por cuadro la
     mano puede acercarse a la camara todo lo rapido que quiera, pero su tamano no cambia en dos. */
  const cruda=Math.max(0.05, _pmundo[0].distanceTo(_pmundo[9]));
  _escMano = _escMano>0? _escMano + (cruda-_escMano)*0.14 : cruda;
  dibujarMano(_pmundo, _escMano);
  return true;
}

function manosPintar(dt){
  manosLimpiar();
  manoTuya();
  rivalesPintar(dt);
  manosSubir();
}
