/* =========================================================================================
   LOS DOS RIVALES: CABEZA, MANOS ENFRENTADAS, Y AGARRAR LA CARTA A LA VISTA

   Pedido: *"que los bots esten enfrentados sus manos tambien, agregales una cabeza que se mueven
   animado, las cartas flotando tambien y ver como con sus manos seleccionan las cartas"*.

   Antes un rival era un abanico de dorsos apoyado en la mesa y dos manos de pose fija al costado.
   Jugaba TELETRANSPORTANDO la carta a la pila: en un cuadro estaba en su mano y en el siguiente
   arriba del monton. Se veia que algo habia pasado, no QUIEN lo habia hecho.

   TRES COSAS, Y LAS TRES SON LA MISMA:

   1. LA MANO SE CONSTRUYE EN SU PROPIO MARCO Y DESPUES SE COLOCA. La version anterior calculaba cada
      punto directo en coordenadas de mundo con senos y cosenos metidos en el bucle, asi que girar la
      mano un poco era reescribir la formula. Aca hay una POSE local —muneca en el origen, dedos hacia
      +Z, palma hacia abajo— con un parametro de cierre, y una matriz que la lleva a donde va. Girar,
      inclinar o cerrar la mano son tres numeros, no tres formulas.
   2. LA MANO SE MUEVE AL SITIO DE LA CARTA QUE EL BOT ELIGIO, Y LA CARTA VA COLGADA DE ELLA. No es
      una animacion pegada al lado: el sitio de la carta agarrada ES el punto de la pinza de esa mano,
      calculado de los mismos veintiun puntos que se dibujan. Si la mano se mueve, la carta se mueve;
      no pueden separarse.
   3. LA CABEZA MIRA LO QUE EL RIVAL ESTA HACIENDO. Piensa -> mira su abanico. Agarra y lleva -> mira
      la pila. Si no es su turno -> mira la mesa, y cada tanto te mira a vos. Una cabeza que se mueve
      al azar se lee a adorno; una que mira lo que pasa se lee a alguien jugando.

   Y TODO SIGUE INSTANCIADO. Las manos de los rivales entran por las MISMAS tres mallas que la tuya
   (dibujarMano), y la cabeza son cuatro instanciadas mas —craneo, cuello, torso y ojos— o sea cuatro
   llamadas de dibujo para los dos rivales enteros, no cuatro por rival.
   ========================================================================================= */

/* ---------- la pose de una mano, en su propio marco ----------
   Marco local: muneca en el origen, dedos hacia +Z, palma hacia -Y (o sea el dorso mirando arriba,
   que es como se ve una mano apoyada desde el otro lado de la mesa). Las medidas son fracciones del
   largo de la palma, igual que los radios: asi la pose no depende de cuan grande sea la mano. */
const RIV_DEDOS=[
  /* el pulgar sale del costado y hacia adelante; los otros cuatro salen de la linea de nudillos */
  { base:[ 0.30,-0.03, 0.12], dir:[ 0.62,-0.10, 0.78], lar:[0.26,0.20,0.17], pulgar:true },
  { base:[ 0.23, 0.00, 0.56], dir:[ 0.05, 0.00, 1.00], lar:[0.30,0.20,0.15] },
  { base:[ 0.07, 0.00, 0.61], dir:[ 0.01, 0.00, 1.00], lar:[0.33,0.22,0.16] },
  { base:[-0.09, 0.00, 0.59], dir:[-0.04, 0.00, 1.00], lar:[0.30,0.20,0.15] },
  { base:[-0.24, 0.00, 0.53], dir:[-0.12, 0.00, 1.00], lar:[0.24,0.17,0.13] },
];
/* cuanto se dobla cada falange al cerrar. Los tres angulos van creciendo y despues aflojan: es como
   se cierra un dedo de verdad — el nudillo poco, la falange del medio mucho, la punta un poco menos.
   Con los tres iguales el dedo se enrosca como una manguera. */
const RIV_CURVA=[0.50, 1.00, 0.85];
const _rp=[]; for(let k=0;k<21;k++) _rp.push(new THREE.Vector3());
const _rd=new THREE.Vector3(), _rmat=new THREE.Matrix4(), _reu=new THREE.Euler(),
      _rsc=new THREE.Vector3();
function _rotX(v,a){ const c=Math.cos(a), s=Math.sin(a);
                     const y=v.y*c-v.z*s, z=v.y*s+v.z*c; v.y=y; v.z=z; }
function _rotY(v,a){ const c=Math.cos(a), s=Math.sin(a);
                     const x=v.x*c+v.z*s, z=-v.x*s+v.z*c; v.x=x; v.z=z; }
/* arma los 21 puntos en el marco local y los lleva al mundo con una sola matriz */
function poseMano(cierre, mano, tam, pos, yaw, pitch, roll){
  const esp=mano<0? -1 : 1;                 // la izquierda es la derecha espejada en x
  _rp[0].set(0,0,0);
  for(let d=0; d<5; d++){
    const D=RIV_DEDOS[d], i0=1+d*4;
    _rp[i0].set(D.base[0]*esp, D.base[1], D.base[2]);
    _rd.set(D.dir[0]*esp, D.dir[1], D.dir[2]).normalize();
    for(let k=0;k<3;k++){
      /* EL PULGAR NO SE CIERRA COMO LOS DEMAS: se OPONE, o sea que cruza la palma. Doblarlo con el
         mismo giro que un dedo lo mete dentro de la mano y desaparece — y sin pulgar visible una
         mano que agarra no se lee a mano que agarra. */
      if(D.pulgar){ _rotY(_rd, -esp*cierre*0.42); _rotX(_rd, cierre*0.30); }
      else _rotX(_rd, cierre*RIV_CURVA[k]);
      _rp[i0+k+1].copy(_rp[i0+k]).addScaledVector(_rd, D.lar[k]);
    }
  }
  _reu.set(pitch||0, yaw||0, roll||0, 'YXZ');
  _rmat.makeRotationFromEuler(_reu);
  _rmat.scale(_rsc.set(tam,tam,tam));
  _rmat.setPosition(pos.x, pos.y, pos.z);
  for(let k=0;k<21;k++) _rp[k].applyMatrix4(_rmat);
  return _rp;
}

/* ---------- la cabeza, el cuello, el torso y los ojos ----------
   CUATRO MALLAS INSTANCIADAS PARA LOS DOS RIVALES, no cuatro por rival. Y los ojos usan LA MISMA
   matriz que el craneo con un desplazamiento local, asi que siguen la cabeza gratis: no hay dos
   animaciones que puedan desincronizarse. */
const matOjo=new THREE.MeshBasicMaterial({color:0x22252b});
const cabMalla=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,9), matPiel, 2);
const cueMalla=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,8,1), matPiel, 2);
/* EL TORSO VA ANCHO ARRIBA Y ANGOSTO ABAJO, y estaba al reves. Con (0,60 arriba, 1 abajo) la parte
   que asoma por encima del abanico era la MAS ANGOSTA —1,32 de medio ancho contra las 2,12 que mide
   el abanico— asi que quedaba tapada entera y la cabeza salia flotando sola como un globo. Los
   hombros son lo mas ancho de un torso visto de frente; el que se afina es el de abajo. */
const torMalla=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,0.70,1,12,1), matPiel, 2);
const ojoMalla=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5), matOjo, 4);
for(const m of [cabMalla, cueMalla, torMalla, ojoMalla]){
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled=false; m.castShadow=true; m.receiveShadow=false;
  m.count=0; escena.add(m);
}
/* LAS MEDIDAS DE UN RIVAL, Y NO SALEN DE UNA PERSONA DE VERDAD.
   A escala humana la carta de este juego mediria 5,6 cm, o sea que una cabeza de 22 cm seria 2,6
   VECES el alto de una carta y taparia media mesa. La escena no esta a escala humana y forzarla lo
   unico que consigue es que no entre en el cuadro. Lo que si se respeta son las PROPORCIONES entre
   las partes —craneo, cuello, hombros— que es lo que hace que se lea a persona. */
const RIV_CAB_R=1.15;                     // radio del craneo
/* cuanto cuelga la carta por debajo y por detras de la pinza que la sostiene: media carta por el
   coseno de su inclinacion, o sea su borde de arriba */
const RIV_CUELGA_Y=CARTA_H*0.5*Math.cos(MESA.rivalTilt)-0.08, RIV_CUELGA_Z=0.40;
const RIV={};                             // estado visible de cada rival, por jugador
function rivalNuevo(lado, fase){
  return { lado, desf:fase, gy:0, gx:0, gyObj:0, gxObj:0, alc:0, cierre:0,
           garra:new THREE.Vector3(), hayGarra:false, parp:0, mirarte:0 };
}
const _rv=new THREE.Vector3(), _rv2=new THREE.Vector3(), _rq=new THREE.Quaternion(),
      _rs=new THREE.Vector3(), _rm=new THREE.Matrix4();

/* donde se sienta cada rival: el abanico flota adelante y la persona esta detras */
function rivalSitio(lado){
  return { x: lado*MESA.rivalX, z: MESA.rivalZ };
}
/* ---------- el bucle de los rivales ---------- */
let _rivT=0;
function rivalesPintar(dt){
  cabMalla.count=0; cueMalla.count=0; torMalla.count=0; ojoMalla.count=0;
  /* EN EL TUTORIAL NO HAY RIVALES, igual que sus cartas: el cartel del tutorial ocupa esa franja de
     la pantalla y ninguno de los seis pasos habla de ellos. */
  if(TUT.on || G.fase!=='juego') return;
  _rivT+=dt;
  let iCab=0, iOjo=0;
  for(const [j, lado] of [[J_IZQ,-1],[J_DER,1]]){
    if(!RIV[j]) RIV[j]=rivalNuevo(lado, j*1.7);
    const R=RIV[j];
    const q=G.manos[j].length;
    R.hayGarra=false;
    if(!q) continue;
    /* `desf` es el desfase de las animaciones de ESTE rival. Sin el, los dos respiran, se balancean y
       parpadean exactamente al mismo tiempo, y dos personas sincronizadas se leen a una animacion
       repetida —que es justo lo que son— en vez de a dos personas. */
    const S=rivalSitio(lado), f=R.desf, t=_rivT;

    /* ===== que esta haciendo, y por lo tanto a donde mira y cuanto estira la mano ===== */
    const B=G.bot;
    const suyo = (B && B.j===j);
    const agarrando = suyo && (B.fase==='agarra' || B.fase==='lleva');
    const objAlc = agarrando? 1 : 0;
    R.alc += (objAlc-R.alc)*Math.min(1, dt*6.5);
    /* el cierre de la mano va DETRAS del alcance: primero llega, despues agarra. Al reves la mano
       llegaria con el puno ya cerrado, que es como agarra un robot y no una persona. */
    const objCie = (suyo && B.fase==='lleva')? 1 : 0;
    R.cierre += (objCie-R.cierre)*Math.min(1, dt*9.0);

    /* ===== las dos manos ===== */
    /* EL TAMANO SALE DE LA CARTA. Una mano al lado de un abanico tiene que medir mas o menos lo que
       mide una carta y media, o se lee a juguete — con 1,05 en una captura anterior eran cuatro
       astillas blancas al costado del abanico. */
    const tam=CARTA_W*1.15;
    const fanY=MESA.rivalFanY;
    /* LAS DOS MANOS SOSTIENEN EL ABANICO POR ABAJO, no lo flanquean. Flanqueandolo —a 0,62 del ancho
       del abanico a cada lado— la mano de afuera del rival de la derecha caia en x 1,02 de pantalla:
       fuera del cuadro. Y ademas es como NO se sostiene un abanico: se lo agarra por la parte de
       abajo, con las dos manos juntas, que es lo que ademas las deja bien adentro del encuadre. */
    for(const s of [-1,1]){
      /* la mano de adentro —la que da al centro de la mesa— es la que agarra */
      const agarra = (s===-lado);
      /* Y VAN ADELANTE DEL ABANICO, NO DEBAJO. Debajo —a 1,15 por abajo del centro del abanico y
         casi en su mismo plano— lo unico que asomaba eran las puntas de los dedos por debajo de las
         cartas: se pedia VER las manos y se veian diez unas. Adelante, apoyadas sobre la mesa, se ven
         enteras contra el blanco y ademas quedan en el camino hacia la pila, que es a donde tienen
         que ir a llevar la carta. */
      const rep={ x:S.x + s*1.30, y:0.85+Math.sin(t*1.1+f+s)*0.045,
                  z:S.z + 2.35 };
      let px=rep.x, py=rep.y, pz=rep.z, yaw=-s*0.34, pitch=0.34;
      if(agarra && R.alc>0.002){
        const d=rivalDestino(j, B);
        const a=R.alc;
        px+= (d.x-px)*a; py+= (d.y-py)*a; pz+= (d.z-pz)*a;
        yaw += (0-yaw)*a; pitch += (0.55-pitch)*a;
      }
      _rv.set(px,py,pz);
      const P=poseMano(agarra? Math.max(0.42, R.cierre*0.92) : 0.42, s===-1? -1 : 1,
                       tam, _rv, yaw, pitch, -s*0.18);
      /* LA PINZA DE LA MANO QUE AGARRA ES DONDE VA LA CARTA, y sale de los mismos puntos que se
         dibujan: el medio entre la punta del pulgar y la del indice. Si la carta usara un numero
         aparte, la mano y la carta podrian estar en dos lugares distintos — que es exactamente el
         defecto que se reporto de RECREO con el rompecabezas. */
      /* LA CARTA NO SE ENGANCHA HASTA QUE LA MANO LLEGO. Enganchandola apenas la mano arranca —con
         el umbral en 0,02— la carta salia volando del abanico HACIA la mano, o sea al reves de lo que
         pasa: primero la mano va a la carta y despues las dos vuelven juntas. Con el umbral en 0,55
         la carta se queda quieta en el abanico mientras el brazo viaja. */
      if(agarra){ R.garra.copy(P[4]).add(P[8]).multiplyScalar(0.5); R.hayGarra=R.alc>0.55; }
      const escM=P[0].distanceTo(P[9]);
      dibujarMano(P, escM);
      /* EL ANTEBRAZO, Y TERMINA JUSTO ANTES DEL ABANICO. Llevandolo hasta el hombro —que esta dos
         unidades detras de las cartas— el cilindro ATRAVIESA el abanico por el medio: medido, a la
         altura de las cartas pasaria por y 1,93 con el abanico ocupando de 0,45 a 2,65. Cortandolo
         en el borde de abajo del abanico, el brazo se mete detras de las cartas y el resto se lee
         solo, que es lo que pasa cuando alguien tiene las manos apoyadas delante de sus cartas. */
      _rv2.set(S.x + s*1.55, 0.62, S.z + 0.75);
      ponerHueso(P[0], _rv2, escM*0.34);
    }

    /* ===== la cabeza ===== */
    /* LA CABEZA TIENE QUE QUEDAR ENTERA POR ENCIMA DEL ABANICO. Con el centro a 1,62 sobre el
       abanico, medio craneo quedaba detras de las cartas y en pantalla se veia media pelota asomando.
       El borde de arriba del abanico esta a 1,10 sobre su centro —media carta por el coseno de la
       inclinacion— asi que el centro de la cabeza va a esa altura mas su propio radio y un respiro. */
    const cabY=fanY+CARTA_H*0.5*Math.cos(MESA.rivalTilt)+RIV_CAB_R*1.06+0.30, cabZ=S.z-1.95;
    /* a donde mira: su abanico si esta pensando, la pila si esta jugando, y si no la mesa —con un
       vistazo hacia vos cada tanto, que es lo que hace que no parezca un maniqui */
    R.mirarte += dt;
    let mira;
    if(suyo && B.fase==='piensa') mira=_rv2.set(S.x, fanY, S.z+0.4);
    else if(agarrando) mira=_rv2.set(MESA.pilaX, 0.5, MESA.centroZ);
    else if((R.mirarte%9.5) < 2.1) mira=_rv2.set(0, 1.4, MESA.manoZ);      // te mira a vos
    else mira=_rv2.set(0, 0.3, MESA.centroZ);
    _rv.set(mira.x-S.x, mira.y-cabY, mira.z-cabZ);
    R.gyObj=Math.atan2(_rv.x, _rv.z);
    R.gxObj=-Math.atan2(_rv.y, Math.hypot(_rv.x,_rv.z));
    /* EL BALANCEO NO SE SUMA AL OBJETIVO SINO AL RESULTADO. Sumado al objetivo pasaria por el
       suavizado y quedaria casi borrado; sumado despues se ve, y ademas no compite con el giro. */
    const k=Math.min(1, dt*3.4);
    R.gy += (R.gyObj-R.gy)*k; R.gx += (R.gxObj-R.gx)*k;
    const balY=Math.sin(t*0.53+f)*0.085 + Math.sin(t*0.31+f*2)*0.05;
    const balX=Math.sin(t*0.44+f)*0.045;
    const resp=Math.sin(t*1.35+f)*0.055;                   // respira
    const gy=R.gy+balY, gx=R.gx+balX;

    _reu.set(gx, gy, Math.sin(t*0.37+f)*0.05, 'YXZ');
    _rq.setFromEuler(_reu);
    _rv.set(S.x, cabY+resp, cabZ);
    _rm.compose(_rv, _rq, _rs.set(RIV_CAB_R*0.97, RIV_CAB_R*1.06, RIV_CAB_R*0.94));
    cabMalla.setMatrixAt(iCab, _rm);
    /* el cuello y el torso NO giran con la cabeza: si giraran, girar para mirar seria girar el
       cuerpo entero y se leeria a torreta */
    _rv.set(S.x, cabY-RIV_CAB_R*0.92+resp*0.5, cabZ);
    _rm.compose(_rv, _rq.identity(), _rs.set(0.30, 0.52, 0.30));
    cueMalla.setMatrixAt(iCab, _rm);
    /* LOS HOMBROS TIENEN QUE SER MAS ANCHOS QUE EL ABANICO, o no se ven. El torso vive DETRAS de las
       cartas —a casi dos unidades— asi que con medio ancho de 1,30 contra las 2,12 que mide el
       abanico quedaba tapado entero, y en pantalla la cabeza salia flotando sola como un globo. Con
       2,20 los hombros asoman ocho decimas por cada lado del abanico y la cabeza se apoya en algo.
       No mas: los dos rivales estan a 3,25 del centro y con 2,9 se tocarian en el medio de la mesa. */
    _rv.set(S.x, cabY-RIV_CAB_R*1.62-0.70+resp*0.3, cabZ+0.10);
    _rm.compose(_rv, _rq.identity(), _rs.set(2.45, 1.45, 0.95));
    torMalla.setMatrixAt(iCab, _rm);
    /* LOS OJOS SALEN DE LA MATRIZ DEL CRANEO. Componiendolos aparte con su propio giro habria dos
       animaciones que mantener sincronizadas; multiplicando por la del craneo, los ojos estan en la
       cara por construccion y no hay nada que sincronizar. */
    cabMalla.getMatrixAt(iCab, _rm);
    /* PARPADEA. Es lo mas barato que existe —un seno y un umbral— y es lo unico que separa "una
       cabeza que rota" de "alguien mirandote". */
    const parp=Math.max(0, 1-Math.abs(Math.sin(t*0.41+f*3))*22);
    for(const ex of [-0.38, 0.38]){
      _rv.set(ex, 0.16, 0.90).applyMatrix4(_rm);
      _rm.decompose(_rv2, _rq, _rs);
      const eh=0.145*(1-parp*0.92);
      _rm.compose(_rv, _rq, _rs.set(0.155, eh, 0.10));
      ojoMalla.setMatrixAt(iOjo++, _rm);
      cabMalla.getMatrixAt(iCab, _rm);
    }
    iCab++;
  }
  cabMalla.count=iCab; cueMalla.count=iCab; torMalla.count=iCab; ojoMalla.count=iOjo;
  for(const m of [cabMalla, cueMalla, torMalla, ojoMalla]) m.instanceMatrix.needsUpdate=true;
}
/* a donde va la mano que agarra: primero a la carta elegida dentro de su abanico, despues a la pila */
const _rdest={x:0,y:0,z:0};
function rivalDestino(j, B){
  const lado=RIV[j].lado, q=G.manos[j].length;
  const p=sitioRival(Math.max(0,Math.min(q-1, B.idx||0)), q, lado, 0);
  /* LA PINZA VA AL BORDE DE ARRIBA DE LA CARTA, NO A SU CENTRO — que es de donde se agarra una carta
     de un abanico. Y ademas es lo que hace que la cuenta cierre: la carta se dibuja colgando esa
     misma distancia por debajo de la pinza, asi que con la mano en su sitio la carta queda
     exactamente donde ya estaba y no da un salto al engancharse. */
  _rdest.x=p.x; _rdest.y=p.y+RIV_CUELGA_Y; _rdest.z=p.z-RIV_CUELGA_Z;
  if(B.fase==='lleva'){
    /* SE INTERPOLA POR EL PROGRESO DE LA FASE Y NO POR UN LERP SUELTO. Con un lerp la mano llegaria
       tarde o temprano segun los cuadros que hubo, y la carta se baja en un instante FIJO: la mano
       tiene que estar ahi justo en ese instante, no cerca. */
    const u=Math.min(1, B.t/BOT_LLEVA);
    const s=u*u*(3-2*u);                                   // suave a la entrada y a la salida
    _rdest.x += (MESA.pilaX-_rdest.x)*s;
    _rdest.y += (1.15-_rdest.y)*s + Math.sin(s*Math.PI)*0.55;   // levanta al pasar por el medio
    _rdest.z += (MESA.centroZ-_rdest.z)*s;
  }
  return _rdest;
}
