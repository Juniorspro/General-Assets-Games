/* =========================================================================================
   LA MESA EN 3D: DONDE VA CADA COSA, Y COMO SE APUNTA

   APUNTAR EN 3D ES UN RAYO, Y ESO NO ES UN DETALLE TECNICO. La mano vive en la camara web —dos
   dimensiones, normalizadas— y las cartas viven en el mundo. El puente es tirar un rayo desde el
   punto de la pantalla donde esta el aro y ver que toca. Comparar en el mundo obligaria al jugador a
   acertar una profundidad, y eso es exactamente lo que se pidio evitar en RECREO: la mano no puede ir
   mas lejos.

   Y LO QUE SE PUEDE PELLIZCAR ES LO QUE SE DIBUJA, POR CONSTRUCCION: no hay una tabla de rectangulos
   en otro lado. Cada objeto lleva su `userData.tipo`, y el rayo devuelve el objeto. Si el dibujo y el
   area sensible fueran dos cuentas distintas, el jugador pellizcaria una carta y el juego agarraria
   la de al lado — el defecto que en RECREO costo una vuelta entera encontrar.
   ========================================================================================= */
const PICK=[];                       // todo lo que el rayo puede tocar
const rayo=new THREE.Raycaster();
const _ndc=new THREE.Vector2();
function pickEn(fx, fy){
  /* LAS MATRICES SE PONEN AL DIA ACA, Y NO SE DA POR SENTADO QUE ALGUIEN LAS ACTUALIZO.
     three.js recalcula las matrices de mundo cuando DIBUJA, asi que un rayo tirado antes de dibujar
     usa las posiciones del cuadro anterior. En el juego eso queda tapado —se dibuja todos los
     cuadros— pero es una dependencia de ORDEN invisible, y una prueba que apunta sin dibujar la
     destapa: medido, apuntar a la carta 2 devolvia la 3 porque la 3 seguia donde estaba en la mano
     anterior. Un rayo tiene que mirar donde estan las cosas AHORA. */
  escena.updateMatrixWorld(true);
  /* fx,fy en fraccion de pantalla (0..1). A coordenadas normalizadas de dispositivo. */
  _ndc.set(fx*2-1, -(fy*2-1));
  rayo.setFromCamera(_ndc, camara);
  const hits=rayo.intersectObjects(PICK, false);
  for(const h of hits){
    const u=h.object.userData;
    if(u && u.tipo) return h.object;
  }
  return null;
}

/* ---------- las piezas de la mesa ---------- */
const cartasMallas=[];               // las de tu mano
const dorsoIzq=[], dorsoDer=[];      // la que un rival tiene agarrada, que si muestra su cara
const dorsoIzqD=[], dorsoDerD=[];    // el resto de su abanico: solo dorso, una llamada cada una
/* ===== QUIENES SE DIBUJAN ENFRENTE Y DE QUE LADO =====
   Con bots son dos, a izquierda y derecha. En multijugador es UNO, y va CENTRADO: dejandolo en su
   costado la mesa queda con un lado ocupado y el otro vacio, y eso se lee a que falta alguien y no a
   un mano a mano. La lista de dorsos viaja en la misma tupla y no se deduce del signo del lado, que
   con el rival centrado —lado 0— no tiene signo. */
function RIVALES(){
  return N_JUG===2? [[dorsoIzq, dorsoIzqD, J_IZQ, 0]]
                  : [[dorsoIzq, dorsoIzqD, J_IZQ, -1], [dorsoDer, dorsoDerD, J_DER, 1]];
}
const pilaMallas=[];                 // las tres ultimas de la pila
let mazoMalla=null, selMalla=null;
const botones={};                    // tirar / dejar / los cuatro colores
const grupo=new THREE.Group(); escena.add(grupo);
/* ===================== TUS CARTAS GIRAN CON VOS =====================
   Al asomarse a un lado, la camara ORBITA alrededor del centro de la mesa. Tu abanico esta a nueve
   unidades de ese centro, asi que orbitando doce grados se corre casi dos unidades de costado y se
   sale del cuadro: medido, con dos grados de giro ya asomaba fuera de pantalla.

   Y la solucion no es girar menos: es que tus cartas son TUYAS. Cuando alguien sentado a una mesa
   gira la cabeza para mirar de reojo, sus propias cartas no se quedan atras — se mueven con el.
   El abanico y los dos botones viven en un grupo que gira lo mismo que la camara alrededor del mismo
   pivote, asi que su sitio EN LA PANTALLA no cambia mientras la mesa si rota. Lo que se mueve es el
   punto de vista sobre la mesa, que es lo que se pidio. */
const manoGrupo=new THREE.Group();
manoGrupo.position.set(0, 0, CAM_MIRA[1]);
escena.add(manoGrupo);
function manoGrupoAlDia(){ manoGrupo.rotation.y = camGiro; }

/* EL SITIO DE CADA COSA, EN UNIDADES DEL MUNDO. Estan juntos a proposito: son las quince medidas que
   definen la mesa y tenerlas desparramadas es como se termina con un abanico que se sale del cuadro. */
/* LA MESA ES LARGA Y ANGOSTA, Y ESO SALIO DE MEDIR EL ENCUADRE, NO DE DECORAR.
   Con una mesa casi cuadrada —9,2 de ancho por 13,8 de fondo— barri 200 combinaciones de campo,
   altura y distancia de camara y la MEJOR usaba el 34% del alto de la pantalla: en un marco 9:16 eso
   deja el tercio de arriba y el sexto de abajo vacios, y no hay camara que lo arregle porque el
   problema es la forma de lo que se mira. Estirada a 21 de fondo por 9 de ancho —una proporcion de
   2,3 contra el 1,78 de la pantalla— el mismo barrido encuentra encuadres que llenan el alto. */
const MESA={
  manoZ:8.4, manoY:1.02, manoArco:0.16, manoAncho:7.2, manoTilt:-0.78,
  mazoX:-2.9, pilaX:2.9, centroZ:-0.6,
  rivalZ:-9.6, rivalX:2.95, rivalFanY:1.55, rivalTilt:-0.55,
  selY:2.4, selZ:3.4, botY:3.4, botZ:1.4
};

/* ===================== LAS CARTAS FLOTAN =====================
   Pedido: *"las cartas flotando tambien"*. Y no es solo estetica: los abanicos de los rivales estaban
   APOYADOS en la mesa y casi acostados (rx -1,30, o sea 74 grados), asi que desde una camara que mira
   desde arriba se veian como una franja de cantos. Levantados y parados a 31 grados, el dorso queda
   de frente a la camara y ademas el abanico crece hacia arriba, que es justo donde hay pantalla libre
   y donde ahora esta la cabeza del rival.
   El vaiven es lento y chico —siete centesimas— y va DESFASADO carta por carta: con todas en fase el
   abanico entero sube y baja como un bloque, que se lee a error de camara y no a cartas flotando. */
function flota(t, i, k){ return Math.sin((t||0)*1.25 + i*0.42)*(k==null? 0.07 : k); }
/* el sitio de una carta del abanico de un rival. ES UNA FUNCION Y NO ESTA ADENTRO DE armarMesa a
   proposito: la mano del rival tiene que poder preguntar donde esta la carta que va a agarrar, y si
   la cuenta viviera adentro del bucle que dibuja, la mano y la carta serian dos cuentas distintas
   —o sea que la mano agarraria al lado de la carta. */
function sitioRival(i, q, lado, t){
  const paso=Math.min(0.42, 3.2/Math.max(1,q));
  const f=q<=1? 0 : (i/(q-1))*2-1;
  return { x: lado*MESA.rivalX + (i-(q-1)/2)*paso,
           y: MESA.rivalFanY + flota(t, i+lado*3) + i*0.012,
           z: MESA.rivalZ + i*0.03,
           rx: MESA.rivalTilt, ry:0, rz:-f*0.13 };
}

/* el abanico: un arco, no una fila. Con las cartas en linea el jugador ve una pared de cantos; con el
   arco cada una gira un poco y se ve su cara. El paso se aprieta cuando hay muchas para que el
   abanico entero entre en el ancho util — sin eso una mano de catorce se sale por los dos lados. */
function manoGeo(n){
  const paso=n<=1? 0 : Math.min(CARTA_W*0.80, (MESA.manoAncho-CARTA_W)/(n-1));
  return { paso, x0:-(paso*(n-1))/2 };
}
function sitioMano(i, n){
  const g=manoGeo(n);
  const x=g.x0+i*g.paso;
  const f=n<=1? 0 : (i/(n-1))*2-1;                  // -1 .. 1 de punta a punta
  /* EL ARCO LEVANTA 0,12 Y NO 0,30. Con 0,30 la carta del medio quedaba casi un tercio mas cerca de
     la camara que la de la punta, y en perspectiva eso se ve como si fuera de otro tamaño: en la
     captura el +2 del medio parecia el doble que el 1 de la izquierda. El arco esta para que cada
     carta muestre su cara, no para escalonarlas. */
  /* LAS CARTAS DE LA MANO SE PARAN, NO SE ACUESTAN. Tumbadas 58 grados sobre la mesa, la cara se ve
     tan escorzada que el numero pierde la mitad de su alto y el abanico ocupa una banda finita en la
     parte de abajo. Paradas a 45 se leen enteras y ademas el abanico crece hacia arriba, que es
     justo donde sobraba pantalla. Se levantan del piso lo que hace falta para que el borde de abajo
     no atraviese la mesa: media carta por el coseno de la inclinacion. */
  /* EL ABANICO SE SUPERPONE SIEMPRE PARA EL MISMO LADO, y esto no es estetico: es lo que hace que se
     pueda apuntar. Antes la profundidad venia del arco —las cartas del medio quedaban MAS LEJOS que
     las de las puntas— asi que las de afuera tapaban a las de adentro y el centro de una carta del
     medio podia estar debajo de su vecina. Medido: de 25 partidas jugadas apuntando al centro de la
     carta, 9 se trababan porque el rayo agarraba otra. Con la profundidad creciendo con el indice,
     cada carta tapa a la anterior y a ninguna otra, o sea que TODAS tienen una franja visible a la
     izquierda — igual que un abanico de cartas en la mano. */
  /* Y EL ARCO EN ALTURA SE FUE, QUE ES LA SEGUNDA MITAD DEL MISMO DEFECTO. Con las cartas inclinadas
     45 grados, subir una carta 0,04 la acerca a la camara 0,028 — o sea que el arco METIA una
     profundidad propia, del mismo tamaño que el escalon del solape. Medido: la carta 5 apuntada en su
     franja visible seguia devolviendo la 4 en las dos semillas probadas. Sin arco de altura la
     profundidad la decide UNICAMENTE el indice, y el escalon sube a 0,05 para que sea inconfundible.
     El abanico se sigue viendo abanico porque el giro de cada carta no se toca. */
  return { x, y:MESA.manoY, z:MESA.manoZ - CAM_MIRA[1] + i*0.05,
           rz:-f*MESA.manoArco, rx:MESA.manoTilt };
}

/* EL PUNTO AL QUE SE APUNTA ES EL MEDIO DE LA FRANJA VISIBLE, NO EL CENTRO DE LA CARTA. Con solape,
   el centro de una carta puede estar debajo de la siguiente; lo que el jugador ve —y por lo tanto
   donde apunta— es la tira que asoma a la izquierda, y su ancho sale de la geometria: el ancho de la
   carta menos el paso del abanico. La ultima no tiene a nadie encima, asi que se apunta a su centro. */
const _pv=new THREE.Vector3();
function puntoMano(malla, i, n){
  const g=manoGeo(n);
  const tapado = (i<n-1)? Math.max(0, CARTA_W-g.paso) : 0;
  /* SE PASA POR LA MATRIZ DE LA PROPIA CARTA Y NO SE RECONSTRUYE A MANO. La carta esta girada en dos
     ejes; escribir "x + dx por el coseno del giro" es adivinar en que orden three.js compone los
     angulos, y adivinarlo mal manda el punto a otra carta — medido, fallaba en una de siete. */
  malla.updateMatrixWorld(true);
  return malla.localToWorld(_pv.set(-tapado/2, 0, 0));
}
function malla(lista, k, padre){
  while(lista.length<=k){ const m=nuevaCarta(); m.visible=false; (padre||grupo).add(m); lista.push(m); }
  return lista[k];
}
/* la misma reserva, pero de cartas que solo muestran el dorso: una llamada de dibujo cada una */
function mallaDorso(lista, k, padre){
  while(lista.length<=k){ const m=nuevaCartaDorso(); m.visible=false; (padre||grupo).add(m); lista.push(m); }
  return lista[k];
}
function sobra(lista, n){ for(let k=n;k<lista.length;k++) lista[k].visible=false; }
/* el movimiento es un lerp hacia el sitio destino. No hace falta nada mas elaborado: una carta que se
   tira es un objeto yendo de A a B, y con el lerp la animacion sale gratis y no hay que mantener una
   lista de tweens que se puede desincronizar del estado */
function irA(m, p, k){
  const a=k==null? 0.22 : k;
  m.position.x += (p.x-m.position.x)*a;
  m.position.y += (p.y-m.position.y)*a;
  m.position.z += (p.z-m.position.z)*a;
  m.rotation.x += ((p.rx||0)-m.rotation.x)*a;
  m.rotation.y += ((p.ry||0)-m.rotation.y)*a;
  m.rotation.z += ((p.rz||0)-m.rotation.z)*a;
}
function poner(m, p){
  m.position.set(p.x,p.y,p.z); m.rotation.set(p.rx||0, p.ry||0, p.rz||0);
}

/* ---------- los botones flotantes ---------- */
/* SON PLACAS EN EL MUNDO Y NO HTML ENCIMA. Con HTML habria dos sistemas de coordenadas y dos caminos
   de apuntado; con placas, el boton se pellizca por el MISMO rayo que una carta. Un camino, una
   prueba. */
const _geoBot=new THREE.PlaneGeometry(1,1);
function texBoton(s, activo, fuerte){
  const W=384,H=140;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const g=cv.getContext('2d');
  g.clearRect(0,0,W,H);
  rr(g,4,4,W-8,H-8,16);
  g.fillStyle = activo? (fuerte? '#1b1d22' : '#ffffff') : '#eceef1';
  g.fill();
  g.lineWidth=3; g.strokeStyle = activo? (fuerte? '#1b1d22' : '#b9bec6') : '#dfe2e6'; g.stroke();
  g.font='700 46px "Segoe UI",system-ui,sans-serif';
  g.fillStyle = activo? (fuerte? '#f7f8f9' : '#1b1d22') : '#adb3bc';
  g.textAlign='center'; g.textBaseline='middle';
  /* el espaciado se dibuja letra por letra: canvas 2D no tiene letter-spacing en todos lados */
  const esp=5; let tot=0; for(const ch of s) tot+=g.measureText(ch).width+esp; tot-=esp;
  let x=W/2-tot/2;
  for(const ch of s){ g.fillText(ch, x+g.measureText(ch).width/2, H/2); x+=g.measureText(ch).width+esp; }
  const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  return t;
}
function nuevoBoton(tipo, i, w, h){
  const m=new THREE.Mesh(_geoBot, new THREE.MeshBasicMaterial({transparent:true, depthTest:false}));
  m.scale.set(w,h,1); m.renderOrder=5; m.visible=false;
  m.userData={tipo, i, activo:true};
  /* NO SE METE EN PICK ACA. armarMesa() vacia la lista en cada cuadro —porque las cartas de la mano
     cambian de numero y de sitio— asi que un objeto anotado una sola vez al crearse desaparece de la
     lista en el primer cuadro. Costo una prueba: pellizcar TIRAR devolvia "no hay tirar". Los
     botones se anotan cuando se los hace visibles, junto con todo lo demas. */
  manoGrupo.add(m);
  return m;
}
botones.tirar=nuevoBoton('tirar',0, 2.55, 0.93);
botones.dejar=nuevoBoton('dejar',0, 2.55, 0.93);
botones.color=[0,1,2,3].map(k=>{
  const m=new THREE.Mesh(_geoBot, new THREE.MeshBasicMaterial({color:COLORES[k], depthTest:false}));
  m.scale.set(2.15,1.25,1); m.renderOrder=5; m.visible=false;
  m.userData={tipo:'color', i:k, activo:true};
  manoGrupo.add(m); return m;
});
let _texBot={};
function ponerTexBoton(m, clave, s, activo, fuerte){
  const k=clave+'|'+s+'|'+(activo?1:0)+'|'+(fuerte?1:0);
  if(m.userData.k===k) return;
  m.userData.k=k;
  if(_texBot[k]) { m.material.map=_texBot[k]; }
  else { _texBot[k]=texBoton(s,activo,fuerte); m.material.map=_texBot[k]; }
  m.material.needsUpdate=true;
}

/* ---------- el aro de la mano, en 3D ---------- */
/* VA PEGADO A LA CAMARA Y NO EN LA MESA. Es el cursor: tiene que estar donde el jugador ve su mano,
   no donde el rayo choca — si se pusiera en el punto de impacto, saltaria de una carta a otra y por
   el aire desapareceria. Colgado de la camara a distancia fija, se mueve como un cursor. */
const aroG=new THREE.Group(); camara.add(aroG); escena.add(camara);
/* EL ARO SE ACHICA A LA MITAD AHORA QUE SE VE LA MANO. Antes era el UNICO indicio de donde estabas
   apuntando, asi que tenia que ser grande; con los cinco dedos dibujados, lo que hace falta es una
   marca fina en el punto exacto de la pinza — un aro gordo encima de la mano la tapa. */
const aroMalla=new THREE.Mesh(new THREE.RingGeometry(0.86,1,40),
  new THREE.MeshBasicMaterial({color:0x2a2d34, transparent:true, opacity:0.9, depthTest:false}));
aroMalla.renderOrder=20; aroG.add(aroMalla);
const aroPunto=new THREE.Mesh(new THREE.CircleGeometry(0.16,16),
  new THREE.MeshBasicMaterial({color:0x1b1d22, transparent:true, depthTest:false}));
aroPunto.renderOrder=21; aroG.add(aroPunto);
let ARO_R=0;
const ARO_Z=-3.55;                // apenas delante de la mano, para que no quede tapado
function pintarAro(){
  const ver = MANO.on && ARO_R>0.02;
  aroMalla.visible=aroPunto.visible=ver;
  if(!MANO.on) { ARO_R+=(0-ARO_R)*0.2; return; }
  const obj = MANO.hay? (MANO.pinza? 0.075 : 0.135) : 0;
  ARO_R += (obj-ARO_R)*0.28;
  if(!ver) return;
  /* del punto de pantalla al plano a ARO_Z: la altura visible a esa distancia sale del fov */
  const h=2*Math.tan(camara.fov*Math.PI/360)*Math.abs(ARO_Z);
  const w=h*camara.aspect;
  aroG.position.set((MANO.x-0.5)*w, -(MANO.y-0.5)*h, ARO_Z);
  aroMalla.scale.setScalar(ARO_R);
  aroPunto.scale.setScalar(ARO_R*0.9);
  const z=pickEn(MANO.x, MANO.y);
  const col=(z && z.userData.activo)? 0xc47b00 : 0x1b1d22;
  aroMalla.material.color.setHex(col); aroPunto.material.color.setHex(col);
  aroMalla.material.opacity=aroPunto.material.opacity = MANO.hay? 1 : 0.35;
}

/* =========================================================================================
   ARMAR LA MESA CADA CUADRO
   Se recorre el estado y se le dice a cada objeto DONDE tiene que estar. Los objetos se acercan solos
   con el lerp, asi que no hay animaciones que mantener ni que puedan quedar fuera de sincronia con
   las cartas de verdad.
   ========================================================================================= */
let _primera=true;
function armarMesa(){
  PICK.length=0;
  manoGrupoAlDia();
  const m=G.manos[J_VOS], n=m.length;
  const tuTurno=(G.fase==='juego' && G.turno===J_VOS);

  /* tu mano */
  for(let i=0;i<n;i++){
    const c=m[i], ma=malla(cartasMallas,i,manoGrupo);
    ma.visible=true; ponerCara(ma,c);
    const ok=pega(c,G.color,G.valor);
    ponerApagado(ma, tuTurno && !ok);
    ma.userData.tipo='carta'; ma.userData.i=i; ma.userData.activo=tuTurno;
    if(i!==G.sel) PICK.push(ma);
    if(i===G.sel){
      /* la agarrada se levanta HACIA la camara y se endereza: es la unica que hay que poder leer
         entera mientras se decide */
      const p={ x:0, y:MESA.selY, z:MESA.selZ - CAM_MIRA[1], rx:-0.62, ry:0, rz:0 };
      irA(ma, p, 0.26);
      /* Y NO ENTRA AL RAYO. Ponerla con activo:false no alcanzaba y costo una prueba: la carta
         levantada queda MAS CERCA de la camara que los botones, asi que el rayo la tocaba primero,
         veia que tiene tipo, y devolvia una carta desactivada — o sea que pellizcar TIRAR no hacia
         nada. Una carta que ya esta agarrada no es un blanco: no va a la lista y punto. */
      ma.userData.activo=false;
    } else {
      const p=sitioMano(i,n);
      /* TU ABANICO FLOTA MENOS QUE EL DE ELLOS, y no por gusto: sobre tus cartas se APUNTA. Cuatro
         centesimas sobre una carta de 2,58 de alto es un vaiven que se ve y que no mueve el blanco
         —medido, las 30 partidas apuntando con el rayo siguen sin un solo fallo de punteria—. */
      p.y += flota(G.t, i, 0.04);
      if(_primera) poner(ma,p); else irA(ma,p, tuTurno?0.24:0.18);
    }
  }
  sobra(cartasMallas, n);

  /* los rivales: dorsos en abanico, mirando a la mesa */
  for(const [lista, dlista, j, lado] of RIVALES()){
    /* DURANTE EL TUTORIAL NO SE DIBUJAN. No es por despejar porque si: el cartel del tutorial ocupa
       exactamente esa franja de la pantalla, y ninguno de los seis pasos habla de los rivales. */
    if(TUT.on){ sobra(lista, 0); sobra(dlista, 0); continue; }
    const q=G.manos[j].length;
    const B=G.bot, R=RIV[j];
    const dsobra={};
    const hayGarraAqui = !!(R && R.hayGarra && B.j===j);
    /* cuanto lleva de la fase de llevar la carta a la pila: 0 mientras la agarra, 1 al soltarla */
    const llev=(B.j===j && B.fase==='lleva')? Math.min(1, B.t/BOT_LLEVA) : 0;
    for(let i=0;i<q;i++){
      /* LA QUE EL RIVAL ESTA AGARRANDO CUELGA DE SU MANO, y su sitio ES el punto de la pinza de esa
         mano —el medio entre pulgar e indice— calculado de los mismos veintiun puntos que se dibujan.
         Con un sitio propio, la mano y la carta serian dos animaciones que hay que mantener juntas, y
         se separarian en el primer cuadro que una de las dos se atrase. */
      const esGarra = !!(R && R.hayGarra && B.j===j && B.idx===i);
      if(esGarra){
        const ma=malla(lista,i); ma.visible=true; ponerApagado(ma,false); ma.userData.tipo=null;
        /* Y SE DA VUELTA AL LLEVARLA. Mientras la elige se ve el dorso —el rival no te muestra su
           mano— y al ir hacia la pila se acuesta y muestra la cara, que es cuando ya la jugo. */
        ponerCara(ma, llev>0.35? G.manos[j][i] : null);
        /* LA CARTA CUELGA POR DEBAJO DE LA PINZA, no centrada en ella. Centrada, la mano queda
           dibujada encima de la mitad de la carta y se lee a mano TAPANDO una carta, no a mano
           sosteniendola; y colgando media carta justo, los dedos quedan en el borde de arriba, que es
           de donde se agarra una carta de un abanico. La misma distancia la usa la mano para elegir a
           donde ir, asi que al engancharse la carta no se mueve ni un milimetro. */
        /* Y SE ACUESTA RECIEN AL FINAL. Acostandola desde el principio del viaje, una carta plana
           vista desde una camara que mira de arriba queda debajo de la mano y no se ve: se pidio VER
           como la seleccionan, asi que la cara mira a la camara casi todo el trayecto y solo se
           acuesta en el ultimo tercio, cuando ya esta llegando a la pila. */
        const ac=Math.max(0, (llev-0.62)/0.38);
        const p={ x:R.garra.x, y:R.garra.y-RIV_CUELGA_Y, z:R.garra.z+RIV_CUELGA_Z,
                  rx:MESA.rivalTilt + (-Math.PI/2-MESA.rivalTilt)*ac, ry:0, rz:0 };
        irA(ma, p, 0.55);
        for(let k=0;k<lista.length;k++) if(k!==i) lista[k].visible=false;
        dsobra[i]=true;
        continue;
      }
      const ma=mallaDorso(dlista,i);
      ma.visible=true;
      const p=sitioRival(i, q, lado, G.t);
      if(_primera) poner(ma,p); else irA(ma,p,0.18);
    }
    /* la carta agarrada sale de la lista de dorsos y entra en la de caras: se apagan las dos sobras */
    for(let k=0;k<dlista.length;k++) if(k>=q || dsobra[k]) dlista[k].visible=false;
    if(!hayGarraAqui) sobra(lista,0);
  }
  /* el rival que no existe en el mano a mano se apaga entero */
  if(N_JUG===2){ sobra(dorsoDer,0); sobra(dorsoDerD,0); }

  /* el mazo: una pila de dorsos, y la de arriba es la que se pellizca */
  const puedeRobar = tuTurno && !G.robo && G.sel<0 && !G.colorPide;
  if(!mazoMalla){ mazoMalla=nuevaCartaDorso(); grupo.add(mazoMalla);
                  mazoMalla.rotation.x=-Math.PI/2; mazoMalla.rotation.z=Math.PI; }
  mazoMalla.visible=true;
  mazoMalla.position.set(MESA.mazoX, 0.30+flota(G.t, 7, 0.05), MESA.centroZ);
  mazoMalla.rotation.set(-Math.PI/2, 0, 0);
  mazoMalla.userData.tipo='mazo'; mazoMalla.userData.i=0; mazoMalla.userData.activo=puedeRobar;
  PICK.push(mazoMalla);

  /* la pila: las tres ultimas, apenas giradas, para que se lea a monton */
  const ult=G.pila.slice(-3);
  for(let k=0;k<3;k++){
    const ma=malla(pilaMallas,k);
    const c=ult[k];
    if(!c){ ma.visible=false; continue; }
    ma.visible=true; ponerCara(ma,c); ponerApagado(ma,false);
    ma.userData.tipo=null;
    const p={ x:MESA.pilaX, y:0.24+k*0.05+flota(G.t, 11, 0.05), z:MESA.centroZ,
              rx:-Math.PI/2, ry:0, rz:((k*53)%23-11)*Math.PI/180 };
    if(_primera) poner(ma,p); else irA(ma,p,0.3);
  }

  /* los botones */
  const hayBot = G.sel>=0 && !G.colorPide && G.fase==='juego';
  const c=G.sel>=0? m[G.sel] : null;
  const ok=c? pega(c,G.color,G.valor) : false;
  botones.tirar.visible=hayBot; botones.dejar.visible=hayBot;
  if(hayBot){
    PICK.push(botones.tirar, botones.dejar);
    ponerTexBoton(botones.tirar,'t',TX('tirar'), ok, true);
    ponerTexBoton(botones.dejar,'d',TX('dejar'), true, false);
    botones.tirar.userData.activo=ok;
    botones.tirar.position.set(-1.42, MESA.botY, MESA.botZ - CAM_MIRA[1]);
    botones.dejar.position.set( 1.42, MESA.botY, MESA.botZ - CAM_MIRA[1]);
    for(const b of [botones.tirar,botones.dejar]) b.rotation.set(-0.62,0,0);
  }
  const hayCol = G.colorPide && G.fase==='juego';
  for(let k=0;k<4;k++){
    const b=botones.color[k]; b.visible=hayCol;
    if(hayCol){ PICK.push(b);
                b.position.set((k%2? 1.20:-1.20), MESA.botY+0.75-Math.floor(k/2)*1.42, MESA.botZ - CAM_MIRA[1]);
                b.rotation.set(-0.62,0,0); }
  }
  _primera=false;
}

/* ===================== EL SONIDO =====================
   Procedural y sin un solo archivo: seis ruidos cortos que son todos la misma familia —un tono que
   sube o baja con un sobre rapido—. Grabarlos serian seis descargas para seis sonidos de diez lineas. */
const AUD={ ctx:null, m:null, on:false };
function audioIniciar(){
  if(AUD.ctx){ if(AUD.ctx.state==='suspended') AUD.ctx.resume(); return; }
  try{
    AUD.ctx=new (window.AudioContext||window.webkitAudioContext)();
    AUD.m=AUD.ctx.createGain(); AUD.m.gain.value=0.5; AUD.m.connect(AUD.ctx.destination);
    AUD.on=true;
  }catch(e){ AUD.on=false; }
}
function tono(f, dur, vol, tipo, f2){
  if(!AUD.ctx||!AUD.on) return;
  const c=AUD.ctx, t=c.currentTime;
  const o=c.createOscillator(); o.type=tipo||'sine';
  o.frequency.setValueAtTime(f,t);
  if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(40,f2), t+dur);
  const g=c.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(vol, t+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(AUD.m); o.start(t); o.stop(t+dur+0.02);
}
function roce(dur, vol, f0, f1){
  if(!AUD.ctx||!AUD.on) return;
  const c=AUD.ctx, t=c.currentTime, n=Math.max(1,Math.floor(c.sampleRate*dur));
  const b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  const s=c.createBufferSource(); s.buffer=b;
  const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=0.8;
  bp.frequency.setValueAtTime(f0,t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(60,f1||f0), t+dur);
  const g=c.createGain(); g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(bp); bp.connect(g); g.connect(AUD.m); s.start(t); s.stop(t+dur+0.02);
}
function son(k){
  if(!AUD.on) return;
  try{
    if(k==='agarra') tono(760,0.07,0.10,'sine',900);
    else if(k==='deja') tono(520,0.08,0.08,'sine',400);
    else if(k==='tira'){ roce(0.16,0.35,900,300); tono(300,0.09,0.09,'triangle',210); }
    else if(k==='roba') roce(0.14,0.28,700,1500);
    else if(k==='mal') tono(180,0.20,0.11,'sawtooth',110);
    else if(k==='salta') tono(880,0.13,0.10,'square',520);
    else if(k==='gira'){ tono(520,0.10,0.08,'square',880); setTimeout(()=>tono(880,0.10,0.08,'square',520),95); }
    else if(k==='mas'){ tono(240,0.16,0.12,'sawtooth',150); roce(0.18,0.25,500,180); }
    else if(k==='uno'){ [740,988].forEach((f,i)=>setTimeout(()=>tono(f,0.14,0.11,'square'),i*90)); }
    else if(k==='gana'){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tono(f,0.22,0.12,'square'),i*95)); }
    else if(k==='pierde'){ [392,330,262].forEach((f,i)=>setTimeout(()=>tono(f,0.26,0.11,'triangle'),i*130)); }
  }catch(e){}
}
