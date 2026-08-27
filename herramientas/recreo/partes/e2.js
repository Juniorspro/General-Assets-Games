
/* =========================================================================================
   EL PROFESOR
   Modelado por codigo copiando la referencia: cabeza pelada de piel clara con ojos grandes y una
   boca roja, sueter verde ancho, brazos verdes flacos con manos claras de dedos visibles, dos
   piernas azules separadas y zapatos naranjas. Ni un archivo: veinte cajas y dos esferas.

   Y RIGGEADO A MANO, NO IMPORTADO. En la vuelta de Eco importar un esqueleto de un GLB costo un
   retarget entero en espacio de mundo porque cada generacion trae otro rig; acá el esqueleto lo
   escribimos nosotros, asi que una animacion es una funcion del tiempo a diez rotaciones y no hay
   nada que retargetear. Con graficos simples eso no es una concesion: es la version buena.
   ========================================================================================= */
const M_PIEL =new THREE.MeshLambertMaterial({color:0xd8c39a});
const M_VERDE=new THREE.MeshLambertMaterial({color:0x2ecc0f});
const M_AZUL =new THREE.MeshLambertMaterial({color:0x2626d6});
const M_ZAPA =new THREE.MeshLambertMaterial({color:0xd98a2b});
const M_OJO  =new THREE.MeshBasicMaterial({color:0xf7f7f2});
const M_PUPILA=new THREE.MeshBasicMaterial({color:0x24242b});
const M_BOCA =new THREE.MeshBasicMaterial({color:0xc0392b});

function armarProfe(){
  const R={};
  const raiz=new THREE.Group();          R.raiz=raiz;
  /* LAS MEDIDAS SALEN DE UNA CUENTA Y NO DE PROBAR, y hubo que hacerla porque la primera version
     lo dejaba ENTERRADO: con el torso a 1,06 y la cadena cadera(-0,56) -> pierna(0,60) ->
     pantorrilla(0,26) -> zapato(-0,34) el pie terminaba en y = -1,06, o sea un metro debajo del
     piso, y en pantalla se leia como un profesor de piernas cortas. La cadena hacia abajo mide
     0,56 + 0,44 + 0,42 + 0,065 = 1,485, asi que el torso va a 1,44 y el pie queda en -0,045:
     apenas hundido, que es lo que se quiere para que no flote.
     Y queda de 2,4 m de alto, que es la referencia: el personaje es larguirucho a proposito y en un
     pasillo de 3,6 de techo eso es exactamente lo que lo vuelve incomodo de ver venir. */
  const torso=new THREE.Group();         R.torso=torso;  raiz.add(torso);
  torso.position.y=1.44;

  const cuerpo=new THREE.Mesh(new THREE.BoxGeometry(0.86,0.86,0.42), M_VERDE);
  cuerpo.position.y=-0.05; torso.add(cuerpo);

  /* la cabeza: una esfera achatada, sin cuello, como en la referencia */
  const cabeza=new THREE.Group(); R.cabeza=cabeza; torso.add(cabeza);
  cabeza.position.y=0.58;
  const craneo=new THREE.Mesh(new THREE.SphereGeometry(0.40,14,10), M_PIEL);
  craneo.scale.set(1,1.10,0.94); cabeza.add(craneo);
  for(const sg of [-1,1]){
    const ojo=new THREE.Mesh(new THREE.SphereGeometry(0.115,10,8), M_OJO);
    ojo.position.set(sg*0.155,0.04,0.345); ojo.scale.set(1,1.18,0.5); cabeza.add(ojo);
    const pup=new THREE.Mesh(new THREE.SphereGeometry(0.055,8,6), M_PUPILA);
    pup.position.set(sg*0.155,0.03,0.395); pup.scale.set(1,1.1,0.4); cabeza.add(pup);
    R['pup'+(sg<0?'I':'D')]=pup;
  }
  const boca=new THREE.Mesh(new THREE.SphereGeometry(0.115,10,8), M_BOCA);
  boca.position.set(0,-0.21,0.335); boca.scale.set(1.05,0.52,0.42); cabeza.add(boca);
  R.boca=boca;

  /* los brazos: hombro -> brazo -> codo -> antebrazo -> mano con cinco dedos */
  const mano=()=>{
    const g=new THREE.Group();
    const palma=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.17,0.09), M_PIEL);
    g.add(palma);
    for(let k=0;k<4;k++){
      const d=new THREE.Mesh(new THREE.BoxGeometry(0.028,0.14,0.028), M_PIEL);
      d.position.set(-0.052+k*0.035, -0.15, 0); g.add(d);
    }
    const pulgar=new THREE.Mesh(new THREE.BoxGeometry(0.030,0.10,0.030), M_PIEL);
    pulgar.position.set(-0.085,-0.06,0.02); pulgar.rotation.z=0.7; g.add(pulgar);
    return g;
  };
  for(const sg of [-1,1]){
    const lado = sg<0? 'I':'D';
    /* el hombro AFUERA del torso: a 0,47 el brazo -de 0,16 de ancho- quedaba mordido por el borde
       del cuerpo, que esta a 0,43, y los brazos se leian como dos rebanadas. A 0,53 cuelgan
       separados, como en la referencia. */
    const hombro=new THREE.Group(); hombro.position.set(sg*0.53, 0.32, 0);
    torso.add(hombro); R['hombro'+lado]=hombro;
    const brazo=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.56,0.16), M_VERDE);
    brazo.position.y=-0.28; hombro.add(brazo);
    const codo=new THREE.Group(); codo.position.y=-0.56; hombro.add(codo); R['codo'+lado]=codo;
    const ante=new THREE.Mesh(new THREE.BoxGeometry(0.145,0.50,0.145), M_VERDE);
    ante.position.y=-0.25; codo.add(ante);
    const m=mano(); m.position.y=-0.58; codo.add(m); R['mano'+lado]=m;
  }
  /* las piernas: dos, separadas, sin cadera visible — es asi en la referencia */
  for(const sg of [-1,1]){
    const lado = sg<0? 'I':'D';
    const cadera=new THREE.Group(); cadera.position.set(sg*0.20, -0.56, 0);
    torso.add(cadera); R['cadera'+lado]=cadera;
    const pierna=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.44,0.17), M_AZUL);
    pierna.position.y=-0.22; cadera.add(pierna);
    const rodilla=new THREE.Group(); rodilla.position.y=-0.44; cadera.add(rodilla);
    R['rodilla'+lado]=rodilla;
    const pant=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.44,0.16), M_AZUL);
    pant.position.y=-0.22; rodilla.add(pant);
    const zapa=new THREE.Mesh(new THREE.BoxGeometry(0.21,0.13,0.34), M_ZAPA);
    zapa.position.set(0,-0.42,0.06); rodilla.add(zapa);
  }
  return R;
}

/* ---------- LAS ANIMACIONES ----------
   Una animacion es una funcion (t) -> diez rotaciones. Nada de clips, nada de keyframes: con un rig
   propio y diez articulaciones, escribir la curva es mas corto que describirla, y se puede MEZCLAR
   dos animaciones evaluando las dos y promediando — que es todo lo que un crossfade es. */
const HUESOS=['torso','cabeza','hombroI','codoI','hombroD','codoD',
              'caderaI','rodillaI','caderaD','rodillaD'];
function poseNueva(){ const p={}; for(const h of HUESOS) p[h]=[0,0,0]; p.alto=0; return p; }
const _pa=poseNueva(), _pb=poseNueva();

const ANIM={
  /* QUIETO: respira y nada mas. Un personaje perfectamente inmovil se lee a estatua, y una estatua
     no da miedo — da la sensacion de que el juego se colgo. */
  quieto:(t,p)=>{
    /* DOS RITMOS Y NO UNO. Respirar a 1,7 y mirar alrededor a 0,7 estaba bien, pero todo el cuerpo
       iba con la MISMA fase: eso hace un latido, no una respiracion. El tronco va a 1,7 y los
       hombros medio ciclo atras, que es lo que hace el hombro de verdad cuando el pecho se infla. */
    const r=Math.sin(t*1.7), rh=Math.sin(t*1.7-1.1), m=Math.sin(t*0.7);
    p.torso[0]=r*0.022; p.torso[1]=m*0.045;
    p.cabeza[0]=-r*0.030; p.cabeza[1]=m*0.16; p.cabeza[2]=Math.sin(t*0.43)*0.030;
    p.hombroI[2]= 0.09+rh*0.026; p.hombroD[2]=-0.09-rh*0.026;
    p.hombroI[0]=rh*0.030; p.hombroD[0]=rh*0.030;
    p.codoI[0]=-0.12-rh*0.035; p.codoD[0]=-0.12-rh*0.035; p.alto=r*0.013;
  },
  /* CAMINAR: piernas en oposicion, brazos en contra, y el tronco sube dos veces por ciclo. Esa
     doble subida es lo que hace que se lea a paso y no a deslizamiento. */
  /* CAMINAR A 3,4 m/s, QUE ES LA VELOCIDAD A LA QUE CAMINA DE VERDAD.
     El ciclo estaba en t*2,0, o sea un paso cada 1,57 s. Pero el riel lo mueve a 3,4 m/s, y una
     zancada de una persona son unos 0,75 m: a 3,4 m/s eso son 4,5 pasos por segundo, no 0,64. El
     resultado era el patinaje clasico —los pies se arrastran porque el cuerpo avanza mas rapido que
     la pierna— y se lee como que el personaje flota. Ahora el ritmo sale de la velocidad: ver
     CAMINA_W en b2.js.
     Y ADEMAS HAY DESFASE: las rodillas y los codos van un poco atrasados respecto de la cadera y el
     hombro (0,45 rad). Sin desfase todo el cuerpo cambia de direccion en el mismo cuadro y se lee a
     marioneta de dos palos; con desfase la pierna "sigue" a la cadera, que es lo que hace una pierna. */
  caminar:(t,p)=>{
    const a=t*CAMINA_W, s=Math.sin(a), c=Math.cos(a);
    const sr=Math.sin(a-0.45);                      // rodillas y codos, atrasados
    p.caderaI[0]= s*0.66;  p.caderaD[0]=-s*0.66;
    p.rodillaI[0]=Math.max(0,-sr)*0.92; p.rodillaD[0]=Math.max(0, sr)*0.92;
    p.hombroI[0]=-s*0.50; p.hombroD[0]= s*0.50;
    p.hombroI[2]= 0.12;   p.hombroD[2]=-0.12;
    p.codoI[0]=-0.34-Math.max(0,-sr)*0.42; p.codoD[0]=-0.34-Math.max(0,sr)*0.42;
    p.torso[0]=0.060+Math.abs(c)*0.034; p.torso[1]=s*0.070;
    /* la cabeza va casi quieta mientras el cuerpo sube y baja: en una persona la cabeza es lo ultimo
       que se mueve, y compensar el rebote con la cabeza es lo que separa caminar de saltar */
    p.cabeza[0]=-0.05-Math.abs(c)*0.030; p.cabeza[1]=-s*0.045;
    p.alto=Math.abs(c)*0.062;
  },
  /* SALUDAR: el brazo derecho arriba y el antebrazo yendo y viniendo. El cuerpo se inclina un poco
     hacia ese lado: un saludo con el torso quieto se ve como un brazo que se movio solo. */
  saludar:(t,p)=>{
    ANIM.quieto(t,p);
    const w=Math.sin(t*8.2);      // el saludo mas vivo: 6,4 se leia a abanico lento
    /* 2,15 y no 2,42: con la abduccion ya medida en radianes de verdad, 2,42 mas los 0,14 de base
       son 2,56 — o sea el brazo PASADO de la vertical, cruzandose por encima de la cabeza. 2,15
       deja la mano un puno arriba de la oreja, que es donde saluda una persona. */
    p.hombroD[2]=-2.15; p.hombroD[0]=0.18;
    p.codoD[2]=w*0.62; p.codoD[0]=-0.26;
    p.torso[2]=-0.075; p.cabeza[1]=0.16; p.cabeza[2]=0.06;
  },
  /* ABRIR PUERTA: los dos brazos van adelante, el de adelante empuja y el cuerpo se va con el
     empujon. Se resuelve en un ciclo de dos segundos que va y vuelve. */
  puerta:(t,p)=>{
    const f=(Math.sin(t*3.1)+1)/2;
    /* EL TRONCO YA NO GIRA CON EL MISMO f QUE EL BRAZO. Estaba con torso[1]=-0,20-f*0,12 y el
       brazo con -1,44-f*0,30: el tronco es ANTEPASADO del hombro, asi que los dos movimientos se
       restaban y la mano quedaba clavada — medido, 3 mm de recorrido en todo el ciclo, o sea un
       empujon que no empuja. El giro del tronco pasa a constante y el empujon queda solo en el
       brazo y el codo. */
    p.hombroD[0]=-1.10-f*0.34; p.hombroD[2]=-0.26;
    p.codoD[0]=-0.40+f*0.34;
    p.hombroI[0]=-0.44; p.hombroI[2]= 0.22; p.codoI[0]=-0.66;
    p.torso[0]=0.08+f*0.06; p.torso[1]=-0.14;
    p.cabeza[0]=0.10; p.cabeza[1]=0.16;
    p.caderaD[0]=0.18; p.caderaI[0]=-0.12; p.rodillaI[0]=0.20;
    p.alto=-0.028-f*0.022;
  },
  /* EXPLICANDO: las dos manos hablando, la cabeza acompanando y el tronco girando de a poco. Las
     dos manos van DESFASADAS: en fase se lee a marioneta. */
  explicar:(t,p)=>{
    const a=Math.sin(t*3.5), b=Math.sin(t*3.5+1.9), c=Math.sin(t*1.4);
    /* EL GESTO VA EN LOS CODOS Y NO EN LOS HOMBROS, y la razon es el punto de vista: en esta escena
       el mira A LA CAMARA. Un brazo levantado hacia adelante —1,06 de flexion, que es lo que tenia—
       apunta al lente y en pantalla no se ve como un brazo que gesticula sino como un palo saliendo
       del hombro; medido, la mano terminaba a 615 px con la cabeza a 618, o sea a la altura de la
       oreja. De frente lo que se lee es el ANTEBRAZO: hombros casi pegados al cuerpo, codos a 70
       grados y las manos hablando. El giro del codo tampoco usa mas el eje Y —medido con poseCruda,
       ese eje mueve la mano 1 mm porque es el eje del propio hueso: es torsion, no flexion. */
    p.hombroD[0]=-0.34+a*0.14; p.hombroD[2]=-0.26-a*0.07;
    p.codoD[0]=-1.25+b*0.32;   p.codoD[2]=-b*0.20;
    p.hombroI[0]=-0.30+b*0.12; p.hombroI[2]= 0.24+b*0.07;
    p.codoI[0]=-1.32+a*0.30;   p.codoI[2]= a*0.20;
    p.torso[1]=c*0.14; p.cabeza[1]=-c*0.24; p.cabeza[0]=-0.06+a*0.07;
    p.alto=a*0.012;
  },
  /* EL GRITO: la unica pose que no es de un maestro. Los dos brazos abiertos y arriba, el tronco
     echado atras, la cabeza levantada y TODO vibrando a 22 Hz. La vibracion es la pieza: una pose
     quieta a diez centimetros de la camara se lee a muneco, y una que tiembla se lee a algo vivo
     que te esta gritando. Va con `alto` positivo porque en el grito se estira hacia arriba. */
  grito:(t,p)=>{
    const s=Math.sin(t*22)*0.055, r=Math.sin(t*31)*0.035;
    p.hombroD[2]=-2.05+s; p.hombroI[2]= 2.05-s;
    p.hombroD[0]=-0.30-r; p.hombroI[0]=-0.30+r;
    p.codoD[0]=-0.34; p.codoI[0]=-0.34;
    p.torso[0]=-0.20+r*0.5; p.torso[2]=s*0.3;
    p.cabeza[0]=-0.32+s; p.cabeza[1]=r;
    p.caderaD[0]=-0.10; p.caderaI[0]=0.10;
    p.alto=0.055+Math.abs(s)*0.5;
  }
};
const ANIM_NOMBRES=['quieto','caminar','saludar','puerta','explicar','grito'];

function animar(R, nombre, otro, mezcla, t){
  const A=ANIM[nombre]||ANIM.quieto;
  for(const h of HUESOS){ _pa[h][0]=_pa[h][1]=_pa[h][2]=0; } _pa.alto=0;
  A(t,_pa);
  let P=_pa;
  if(otro && mezcla>0.001){
    for(const h of HUESOS){ _pb[h][0]=_pb[h][1]=_pb[h][2]=0; } _pb.alto=0;
    (ANIM[otro]||ANIM.quieto)(t,_pb);
    for(const h of HUESOS) for(let k=0;k<3;k++) _pa[h][k]=_pa[h][k]*(1-mezcla)+_pb[h][k]*mezcla;
    _pa.alto=_pa.alto*(1-mezcla)+_pb.alto*mezcla;
  }
  for(const h of HUESOS){ const q=R[h]; if(q) q.rotation.set(P[h][0],P[h][1],P[h][2]); }
  if(R.torso) R.torso.position.y=1.44+P.alto;
}

/* =========================================================================================
   EL MODELO GENERADO, Y COMO SE LE PEGAN LAS ANIMACIONES ESCRITAS A MANO

   El GLB lo genero Higgsfield (Meshy image_to_3d) desde la referencia, texturizado y RIGGEADO: vino
   con un esqueleto humanoide de 24 huesos y nombres estandar —Hips, Spine01, Head, LeftArm,
   LeftForeArm, LeftUpLeg…—, que es exactamente lo que hacia falta.

   POR QUE NO SE USA LA ANIMACION QUE TRAE: Meshy puede pegarle un clip de su biblioteca, pero de las
   cuatro que este juego necesita, dos no existen ahi —"abrir la puerta" y "explicando"— y las otras
   dos no se pueden mezclar con las mias. Con el esqueleto en la mano, una animacion es una funcion
   del tiempo a diez rotaciones, asi que se escriben las cuatro y se acabo.

   EL PROBLEMA DE VERDAD ES LA POSE DE REPOSO. El modelo se pidio en T-POSE porque es lo que da un
   rigging limpio, pero una T no es una pose de personaje: los brazos salen horizontales. Mis poses
   estan escritas para brazos colgando. Asi que cada hueso lleva un DESVIO DE REPOSO que lo lleva de
   la T a colgando, y la pose se suma encima.
   Y ese desvio NO SE ADIVINA: los ejes locales de un hueso dependen de como quedo el bind, asi que
   se MIDE — se gira el hueso en cada eje y se mira para donde se fue la mano en el mundo. El gancho
   __recreo.probarHueso() esta justo para eso.
   ========================================================================================= */
const HUESO_DE={ torso:'Spine01', cabeza:'Head',
                 hombroI:'LeftArm',  codoI:'LeftForeArm',
                 hombroD:'RightArm', codoD:'RightForeArm',
                 caderaI:'LeftUpLeg', rodillaI:'LeftLeg',
                 caderaD:'RightUpLeg', rodillaD:'RightLeg' };
/* ---------- LOS EJES DEL RIG, MEDIDOS Y NO SUPUESTOS ----------
   Habia puesto el desvio de reposo sobre la Z local del brazo "porque es lo que suele ser", y el
   personaje aparecio en T perfecta: la Z no baja el brazo, lo hace girar hacia adelante.
   Con __recreo.probarHueso() se gira un hueso un radian en cada eje y se mira PARA DONDE SE FUE LA
   MANO en el mundo. El resultado, en metros:

     hombroD  +1,2 en X  ->  mano (0,828 · 1,779) a (0,462 · 1,173)   dy = -0,606   BAJA
     hombroD  -1,2 en X  ->                                            dy = +0,561   SUBE
     hombroD  +1,2 en Z  ->  dz = +0,642                                             ADELANTE
     hombroD  +1,2 en Y  ->  dy = +0,030                                             casi nada
     hombroI  +1,2 en X  ->  dy = -0,614   BAJA TAMBIEN, con el mismo signo
     caderaD  +0,6 en X  ->  rodilla dy = -0,241                                     PIERNA ATRAS
     codoD    -1,2 en X  ->  mano dy = +0,241                                        DOBLA

   O sea: en este rig el brazo sube y baja sobre X y se mece adelante y atras sobre Z — justo al
   revés de lo que asumen mis poses, que estan escritas para el rig de cajas. La Y no hace nada
   porque es el eje que corre A LO LARGO del hueso.
   Asi que las poses no se reescriben: se REMAPEAN los canales. Es una tabla de diez lineas contra
   reescribir cinco animaciones, y ademas las dos versiones —cajas y generado— siguen compartiendo
   exactamente las mismas curvas. */
/* Y AHORA EL DESVIO ES UN DELTA CHICO, no 1,30: barrido con probarHueso() sobre el bind,
   delta 0 deja la mano en (0,724 · 1,365) —brazo casi horizontal— y cada dos decimas la baja:
     0,2 -> (0,592 · 1,230)      0,6 -> (0,358 · 1,117)
     0,4 -> (0,481 · 1,162)      0,8 -> (0,229 · 1,097)  <- la mano se mete en el cuerpo
   0,42 deja la mano justo por fuera del torso y a la altura de la cadera, que es como cuelga un
   brazo. Con 1,30 —el numero de cuando pisaba el bind— el brazo se cruzaba por delante del pecho. */
/* LOS HOMBROS YA NO LLEVAN DESVIO A MANO. Estuvo en 0,42 y despues en 0,65 —numeros sacados de
   medir donde caia la mano— y los dos eran el mismo parche: tapar con una constante que el eje
   estaba mal. Ahora el reposo del hombro se calcula solo (ver ABD_COLGADO) y aca queda unicamente
   el de los codos, que si tienen su eje anatomico en el bind. */
const REPOSO={ codoI:[0.10,0,0], codoD:[0.10,0,0] };
/* p = [x,y,z] de mi pose; r = desvio de reposo. Devuelve los tres angulos del hueso del GLB. */
const CANAL={
  torso:   (p,r)=>[r[0]+p[0], r[1]+p[1], r[2]+p[2]],
  cabeza:  (p,r)=>[r[0]+p[0], r[1]+p[1], r[2]+p[2]],
  /* EL SIGNO DEL MECEO VA AL REVES, y se vio en 'explicando': con el signo directo el brazo se iba
     para ATRAS en vez de adelante, o sea que el personaje explicaba de espaldas a sus propias manos.
     En el rig de cajas el brazo cuelga sobre -Y y girar +X lo lleva adelante; acá el mismo gesto va
     sobre -Z. Medido: hombroD +1,2 en Z movio la mano +0,642 en Z, o sea adelante. */
  /* los hombros no estan aca: van por quaternion en ejes del cuerpo, mas abajo */
  codoD:   (p,r)=>[r[0]+p[0], p[1],  p[2]],
  codoI:   (p,r)=>[r[0]+p[0], p[1], -p[2]],
  caderaD: (p,r)=>[p[0], p[1],  p[2]],
  caderaI: (p,r)=>[p[0], p[1], -p[2]],
  rodillaD:(p,r)=>[p[0], p[1],  p[2]],
  rodillaI:(p,r)=>[p[0], p[1], -p[2]]
};
const REPOSO_MANO={ manoI:'LeftHand', manoD:'RightHand' };

let baldi=null;                 // el rig que se esta usando (generado o de cajas)
/* =========================================================================================
   LOS HOMBROS SE MANEJAN EN EJES DEL CUERPO Y NO EN LOS DEL HUESO
   Por que hizo falta esto: los ejes locales de un hueso son los que dejo el bind, y en este rig el
   bind del hombro es (0,743 · -0,743 · 0) —el brazo en T—, asi que ninguno de los tres ejes locales
   es un eje anatomico. Medido con probarHueso() sobre este modelo: girar el eje X mueve la mano en
   el plano XY (sirve de abduccion, bien), pero girar Z la mueve 0,27 en Z Y ADEMAS 0,39 en Y. O sea
   que "levantar el brazo hacia adelante" tambien lo subia. Con eso, la pose de 'explicando' —que
   pide 1,06 de flexion— le ponia las dos manos a la altura de la oreja: medido, mano a y=643 px con
   la cabeza a 628. Dos palos en cruz.
   La salida no es buscar mejores numeros para los mismos ejes: es dejar de usar los ejes del hueso.
   La abduccion es un giro alrededor del Z DEL CUERPO, la flexion alrededor del X DEL CUERPO y la
   torsion alrededor del Y, y eso se pasa al espacio del padre con P⁻¹·R·P una sola vez al cargar.
   Los codos NO: ahi el eje local X del hueso ya es la bisagra buena —medido, mueve la mano en el
   plano del brazo— y encima acompana al brazo solo, que es justo lo que tiene que hacer un codo.
   ========================================================================================= */
const ABD_COLGADO=0.14;          // 8 grados: un brazo colgando no queda pegado al cuerpo
const EJE_X=new THREE.Vector3(1,0,0), EJE_Y=new THREE.Vector3(0,1,0), EJE_Z=new THREE.Vector3(0,0,1);
const _qA=new THREE.Quaternion(), _qB=new THREE.Quaternion(), _qC=new THREE.Quaternion();
const _vS=new THREE.Vector3(), _vH=new THREE.Vector3();

let baldiGLB=false;
const profe=armarProfe();       // el de cajas: existe SIEMPRE, y es el respaldo
profe.raiz.visible=false;
escena.add(profe.raiz);

function mapearGLB(raiz){
  const R={ raiz };
  raiz.traverse(o=>{ if(o.isBone||o.isObject3D){ /* por nombre, no por indice */ } });
  const porNombre={};
  raiz.traverse(o=>{ if(o.name) porNombre[o.name]=o; });
  let faltan=0;
  for(const k in HUESO_DE){
    const o=porNombre[HUESO_DE[k]];
    if(o){ R[k]=o; o.userData.rep=REPOSO[k]||[0,0,0];
           /* SE GUARDA LA ROTACION CON LA QUE VINO. Es la pose de reposo del rig, y hay huesos que
              la traen distinta de cero. */
           o.userData.bind=[o.rotation.x, o.rotation.y, o.rotation.z]; }
    else faltan++;
  }
  for(const k in REPOSO_MANO){ const o=porNombre[REPOSO_MANO[k]]; if(o) R[k]=o; }
  /* CUANTO HAY QUE BAJAR CADA BRAZO SALE MEDIDO, NO ELEGIDO. Se mide el angulo que forma el brazo
     del bind con la vertical y se guarda: el reposo es ese angulo menos ABD_COLGADO, con lo cual las
     poses vuelven a significar lo mismo que en el rig de cajas —donde 0 es colgando— sin tocar la
     tabla de animaciones. Si Meshy manda el proximo modelo en A-pose en vez de T-pose, esto se
     acomoda solo. */
  raiz.updateMatrixWorld(true);
  for(const k of ['hombroI','hombroD']){
    const o=R[k], mano=R[k==='hombroI'? 'manoI':'manoD'];
    if(!o || !mano) continue;
    o.getWorldPosition(_vS); mano.getWorldPosition(_vH);
    o.userData.abdBind=Math.atan2(Math.abs(_vH.x-_vS.x), Math.max(1e-6, _vS.y-_vH.y));
    o.userData.lado = (k==='hombroI')? 1 : -1;
    o.userData.qBind=o.quaternion.clone();
    const qp=new THREE.Quaternion();
    if(o.parent) o.parent.getWorldQuaternion(qp);
    o.userData.qP=qp.clone(); o.userData.qPI=qp.clone().invert();
  }
  R.porNombre=porNombre;
  R.faltan=faltan;
  return R;
}
/* animar() del rig de cajas escribe rotation.set() a secas. Sobre el GLB hay que SUMAR el desvio de
   reposo, asi que va una version propia y no un parche dentro de la otra: dos rigs distintos con la
   misma tabla de poses es mas claro que una funcion con un if adentro. */
let _poseFija=null;      // gancho de prueba: fuerza una pose cruda para poder medir un solo eje
function animarGLB(R, nombre, otro, mezcla, t){
  for(const h of HUESOS){ _pa[h][0]=_pa[h][1]=_pa[h][2]=0; } _pa.alto=0;
  (ANIM[nombre]||ANIM.quieto)(t,_pa);
  if(_poseFija){ for(const h of HUESOS){ const v=_poseFija[h];
    _pa[h][0]=v?v[0]:0; _pa[h][1]=v?v[1]:0; _pa[h][2]=v?v[2]:0; } _pa.alto=0; }
  if(otro && mezcla>0.001){
    for(const h of HUESOS){ _pb[h][0]=_pb[h][1]=_pb[h][2]=0; } _pb.alto=0;
    (ANIM[otro]||ANIM.quieto)(t,_pb);
    for(const h of HUESOS) for(let k=0;k<3;k++) _pa[h][k]=_pa[h][k]*(1-mezcla)+_pb[h][k]*mezcla;
    _pa.alto=_pa.alto*(1-mezcla)+_pb.alto*mezcla;
  }
  for(const h of HUESOS){
    const q=R[h]; if(!q) continue;
    const r=q.userData.rep||[0,0,0];
    const b=q.userData.bind||[0,0,0];
    const f=CANAL[h];
    if(q.userData.qP){
      /* HOMBRO: abduccion / flexion / torsion en ejes del cuerpo, sobre el bind.
         abd sale de la medida del bind, asi que _pa[h][2] significa exactamente lo mismo que en el
         rig de cajas: 0 es el brazo colgando. */
      const lado=q.userData.lado;
      const abd = (ABD_COLGADO - q.userData.abdBind) + lado*_pa[h][2];
      /* EL ORDEN IMPORTA Y ESTE ES EL BUENO: primero abduccion, despues flexion.
         Al reves —flexion adentro— la abduccion deja de ser un angulo en el plano frontal y se
         mezcla: con 'explicando' (0,52 de abduccion y 1,06 de flexion) la mano terminaba MAS ARRIBA
         que el hombro, medido a y=629 px con la cabeza a 618. Abduccion adentro: el brazo se separa
         del cuerpo lo que dice la pose y despues la flexion lo lleva hacia adelante desde ahi. */
      _qA.setFromAxisAngle(EJE_X, _pa[h][0]);
      _qB.setFromAxisAngle(EJE_Z, lado*abd);
      _qA.multiply(_qB);
      if(_pa[h][1]){ _qC.setFromAxisAngle(EJE_Y, _pa[h][1]); _qA.multiply(_qC); }
      q.quaternion.copy(q.userData.qPI).multiply(_qA).multiply(q.userData.qP)
                  .multiply(q.userData.qBind);
      continue;
    }
    const a = f? f(_pa[h], r) : [r[0]+_pa[h][0], r[1]+_pa[h][1], r[2]+_pa[h][2]];
    /* SE SUMA A LA ROTACION DE BIND. NO SE PISA.
       Esto era EL defecto, y se veia como un personaje derretido. Un rig de Meshy trae la pose de
       reposo escrita EN LAS ROTACIONES de los huesos, no solo en la jerarquia: medido en este
       modelo, `caderaI` viene con X = -3,078 radianes —casi media vuelta— y `hombroD` con
       (0,743 · -0,743 · 0), que es la direccion del brazo en T.
       Mi codigo hacia `rotation.set(mi_pose)`, o sea que BORRABA todo eso: la cadera saltaba de -176
       grados a 0 y la pierna se le iba a la altura de la cabeza (la rodilla medida en y=1,529 cuando
       tiene que estar en 0,44), y a los brazos les borraba la Y y quedaban metidos dentro del torso.
       El resultado en pantalla era una mancha verde con un zapato al lado de la oreja.
       La pose es un DELTA sobre el reposo del rig. Siempre lo fue; yo estaba escribiendo absolutos. */
    q.rotation.set(b[0]+a[0], b[1]+a[1], b[2]+a[2]);
  }
  if(R.raiz) R.raiz.position.y = (R.baseY||0) + _pa.alto;
}
function animarBaldi(nombre, otro, mezcla, t){
  if(baldiGLB) animarGLB(baldi, nombre, otro, mezcla, t);
  else animar(profe, nombre, otro, mezcla, t);
}

const BALDI_GLB='__BALDI_GLB__';
function cargarBaldi(luego){
  if(!BALDI_GLB || BALDI_GLB.indexOf('data:')!==0){ usarCajas(); if(luego) luego(false); return; }
  try{
    new GLTFLoader().parse2 ? 0 : 0;
  }catch(e){}
  const ld=new GLTFLoader();
  ld.load(BALDI_GLB, (gl)=>{
    try{
      const raiz=gl.scene;
      /* SE ESCALA POR LA CAJA Y NO POR UN NUMERO. Meshy respeta la altura pedida casi siempre, pero
         "casi" no sirve: si sale a 1,4 en vez de 2,2 el personaje queda enano detras del escritorio
         y no hay como enterarse sin mirar. Se mide la caja y se lleva a 2,20 exacto. */
      raiz.updateMatrixWorld(true);
      const caja=new THREE.Box3().setFromObject(raiz);
      const alto=Math.max(0.01, caja.max.y-caja.min.y);
      const e=2.20/alto;
      raiz.scale.setScalar(e);
      raiz.updateMatrixWorld(true);
      const c2=new THREE.Box3().setFromObject(raiz);
      raiz.position.y -= c2.min.y;                 // los pies en el piso, no adivinado
      raiz.traverse(o=>{ if(o.isMesh){ o.frustumCulled=false;
        if(o.material){ o.material.side=THREE.FrontSide; } } });
      baldi=mapearGLB(raiz);
      baldi.baseY=raiz.position.y;
      baldiGLB = (baldi.faltan===0);
      if(!baldiGLB){ usarCajas(); if(luego) luego(false); return; }
      escena.add(raiz);
      profe.raiz.visible=false;
      if(luego) luego(true);
    }catch(err){ usarCajas(); if(luego) luego(false); }
  }, undefined, ()=>{ usarCajas(); if(luego) luego(false); });
}
function usarCajas(){
  baldiGLB=false; baldi=profe; profe.raiz.visible=true; profe.baseY=0;
}
