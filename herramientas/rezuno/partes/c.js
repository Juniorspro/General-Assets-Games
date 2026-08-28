/* =========================================================================================
   EL MUNDO 3D

   Pedido: *"pero 3D hermano 3D en un ambiente 3D blanco no negro"*. La version anterior dibujaba las
   cartas con un contexto 2D. Ahora la mesa es una escena de three.js y cada carta es un objeto con
   grosor, sombra y perspectiva.

   POR QUE BLANCO Y NO SOLO "NO NEGRO": este juego tiene UNA regla y es "del mismo color". Sobre un
   fondo oscuro los cuatro colores se acercan entre si —todos leen como "claro contra oscuro"— y sobre
   blanco se leen por lo que son. Ademas una mesa de cartas es blanca. El fondo no es decoracion:
   es lo que hace legible la unica decision del juego.

   TRES DECISIONES DE ESCENA, LAS TRES CON UN MOTIVO CONCRETO:

   1. LA CAMARA ES ORTOGRAFICA-ISH: perspectiva angosta (fov 30) y lejos. Con un fov ancho la carta
      del borde del abanico se deforma tanto que su numero deja de leerse, y en un juego donde hay que
      comparar numeros y colores eso es un impuesto en cada turno. Un fov angosto desde lejos da
      volumen y sombra sin deformar.
   2. LA SOMBRA ES DE CONTACTO Y CHICA. Sin sombra las cartas flotan sobre la mesa y la escena se lee
      a calcomanias; con una sombra larga y dura se lee a escenario de teatro. Una direccional casi
      cenital con mapa chico da el apoyo y nada mas.
   3. EL FONDO NO ES UN COLOR PLANO SINO UNA SALA. Un color plano detras de una mesa blanca hace que
      la mesa no se distinga del vacio: no hay horizonte y todo flota. Dos planos —piso y pared— con
      dos blancos apenas distintos alcanzan para que haya un "adentro".
   ========================================================================================= */
const lienzo=document.getElementById('lienzo');
const marco=document.getElementById('marco');

const render=new THREE.WebGLRenderer({canvas:lienzo, antialias:true});
render.setClearColor(0xf4f5f6, 1);
render.outputColorSpace=THREE.SRGBColorSpace;
render.shadowMap.enabled=true;
render.shadowMap.type=THREE.PCFSoftShadowMap;
/* ===================== LA SELECCION GRAFICA =====================
   Pedido: *"agrega seleccion grafica"*. Y no es un adorno de menu: en este juego la camara y el
   detector de manos comparten el hilo con el dibujo, asi que cada pixel que no se rellena es
   presupuesto que le queda a MediaPipe. Las tres opciones cambian LO QUE CUESTA, no lo que el juego
   es — las cartas, los colores y la regla son las mismas en las tres.

   Los dos numeros que mueven la aguja son estos y no otros:

   1. LA RESOLUCION, que es lineal en pixeles a rellenar. Es la unica perilla que siempre paga.
   2. LAS SOMBRAS, que son una PASADA ENTERA de la escena: con sombras, todo lo que proyecta se
      dibuja dos veces. Apagarlas es la mitad de las llamadas de dibujo, no un matiz.

   El mapa de sombra tambien baja de 1024 a 512 en media: son cuatro veces menos texeles y sobre una
   mesa blanca con sombras de contacto la diferencia no se ve. */
const CALS={
  baja:  { esc:0.60, dpr:1,   sombras:false, mapa:512,  niebla:false },
  media: { esc:0.85, dpr:1.5, sombras:true,  mapa:512,  niebla:true  },
  alta:  { esc:1.00, dpr:2,   sombras:true,  mapa:1024, niebla:true  }
};
let CAL='media';
try{ const g=localStorage.getItem('rezuno_cal'); if(CALS[g]) CAL=g; }catch(e){}

const escena=new THREE.Scene();
escena.background=new THREE.Color(0xf4f5f6);
/* la niebla es MUY suave y clara: separa la pared del piso sin que se note que hay niebla */
const _niebla=new THREE.Fog(0xf4f5f6, 26, 54);
escena.fog=_niebla;

/* FOV 30 Y NO 60. Medido a ojo sobre la propia captura: con 60 la carta de la punta del abanico se
   ve de canto y su numero se pierde. Con 30 desde 20 unidades la perspectiva se nota en el grosor y
   en la sombra, que es donde tiene que notarse. */
/* CAMPO 44, A 16 DE ALTO Y 21 DE FONDO, MIRANDO A z=-0,5. Los cuatro numeros salieron de un barrido
   de 200 combinaciones midiendo el rectangulo que ocupan TODAS las piezas proyectadas: este es el que
   mete la mesa entera adentro del cuadro usando el 97% del ancho. */
const CAM_MIRA=[0.0, -0.5];              // a que altura y profundidad apunta
const CAM_POS=new THREE.Vector3(0, 16, 21);
const camara=new THREE.PerspectiveCamera(44, 9/16, 0.5, 90);
camara.position.copy(CAM_POS);
camara.lookAt(0, CAM_MIRA[0], CAM_MIRA[1]);

/* ===================== MIRAR A LOS LADOS GIRANDO LA CABEZA =====================
   Pedido: *"pon que el jugador pueda mirar a los lados con solo girar su cabeza"*.

   Y SE ORBITA ALREDEDOR DE LA MESA, NO SE GIRA LA CAMARA EN EL SITIO. Girar en el sitio es lo que
   suena a "mirar a los lados", pero acá no se puede: el campo HORIZONTAL de este encuadre son 26
   grados, asi que con 13 de giro las cartas se van del cuadro — y el juego entero consiste en
   apuntarles. Orbitando, la mesa se queda donde esta y lo que cambia es el ANGULO desde el que se la
   ve: se asoma uno a los costados, se ve el canto de las cartas, se ven los rivales de otro perfil.
   Es lo que hace alguien sentado a una mesa que se mueve para ver mejor, y no rompe el juego.
   ===== Y LA ORBITA SE QUEDA EN CERO =====
   La movia el giro de la cabeza, y el reconocimiento de cara se fue con la camara frontal. La camara
   se planta una vez y no se mueve mas. La funcion se queda porque es la que COLOCA la camara —el
   encuadre entero sale de ella— y porque `camGiro` lo sigue leyendo el grupo del abanico; lo que se
   fue es quien la llamaba con un angulo distinto de cero. */
const CAM_ORBITA=0.349;                  // 20 grados en radianes
let camGiro=0;
function camaraGiro(objetivo, dt){
  const lim=Math.max(-CAM_ORBITA, Math.min(CAM_ORBITA, objetivo||0));
  camGiro += (lim-camGiro)*Math.min(1, (dt||0.016)*3.2);
  const co=Math.cos(camGiro), si=Math.sin(camGiro);
  const x=CAM_POS.x, z=CAM_POS.z - CAM_MIRA[1];
  camara.position.set(x*co + z*si, CAM_POS.y, -x*si + z*co + CAM_MIRA[1]);
  camara.lookAt(0, CAM_MIRA[0], CAM_MIRA[1]);
}

/* ---------- luces ---------- */
/* la hemisferica hace el trabajo del ambiente de una habitacion clara; sin ella los costados de las
   cartas quedan negros y el blanco de la mesa se ve sucio */
escena.add(new THREE.HemisphereLight(0xffffff, 0xdfe2e6, 2.05));
const luz=new THREE.DirectionalLight(0xffffff, 1.15);
luz.position.set(4.5, 16, 7.5);
luz.castShadow=true;
luz.shadow.mapSize.set(1024,1024);
luz.shadow.camera.near=4; luz.shadow.camera.far=42;
/* LA CAMARA DE SOMBRA COTA LA MESA Y NADA MAS. Cubriendo la sala entera, un mapa de 1024 daria pocos
   texeles por unidad y la sombra de una carta serian cuatro pixeles temblando. */
luz.shadow.camera.left=-13; luz.shadow.camera.right=13;
luz.shadow.camera.top=13; luz.shadow.camera.bottom=-13;
luz.shadow.bias=-0.0009; luz.shadow.normalBias=0.02;
escena.add(luz); escena.add(luz.target);

/* ---------- la sala ---------- */
{
  const mesa=new THREE.Mesh(new THREE.PlaneGeometry(70,70),
    new THREE.MeshLambertMaterial({color:0xfbfbfc}));
  mesa.rotation.x=-Math.PI/2; mesa.position.y=0; mesa.receiveShadow=true; escena.add(mesa);
  /* la pared del fondo, apenas mas gris que el piso: es lo que da horizonte */
  const pared=new THREE.Mesh(new THREE.PlaneGeometry(70,34),
    new THREE.MeshLambertMaterial({color:0xeceef1}));
  pared.position.set(0,17,-19); escena.add(pared);
  /* UNA MANCHA SUAVE DEBAJO DE LA ZONA DE JUEGO. La sombra de mapa da el contacto de cada carta, pero
     la mesa entera queda de un blanco parejo que se lee a papel: una vinieta clarisima le devuelve el
     centro. Es un plano con una textura de degrade, o sea cero costo de sombreado. */
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,4,64,64,64);
  gr.addColorStop(0,'rgba(120,128,140,0.13)'); gr.addColorStop(1,'rgba(120,128,140,0)');
  g.fillStyle=gr; g.fillRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  const vin=new THREE.Mesh(new THREE.PlaneGeometry(30,30),
    new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false}));
  vin.rotation.x=-Math.PI/2; vin.position.set(0,0.006,-1.0); escena.add(vin);
}

function ajustar(){
  const w=Math.max(2, marco.clientWidth), h=Math.max(2, marco.clientHeight);
  const c=CALS[CAL];
  /* LA ESCALA VA EN EL PIXEL RATIO Y NO EN setSize, y esa es la unica forma correcta. Bajando el
     tamaño del lienzo con setSize(w*esc, h*esc, false) el lienzo CSS tambien encoge y el juego queda
     dibujado en una esquina; con el pixel ratio, el lienzo mide lo mismo en pantalla y lo que baja es
     cuantos pixeles de verdad se rellenan, que es justamente lo que se quiere. */
  render.setPixelRatio(Math.min(devicePixelRatio||1, c.dpr)*c.esc*resDin);
  render.setSize(w,h,false);
  camara.aspect=w/h; camara.updateProjectionMatrix();
}
/* =========================================================================================
   LOS 60 CUADROS SE FUERZAN, NO SE ESPERAN

   Pedido: *"obliga a 60fps si o si incluso en gamas bajas"*. Y eso no lo puede dar una lista de tres
   calidades, por buena que sea: la lista la elige una persona que no sabe cuanto le cuesta a SU
   telefono, y ademas el costo cambia dentro de la misma partida —una mano en cuadro cuesta mas que
   ninguna—. Lo unico que puede sostener un numero de cuadros es un lazo cerrado sobre el tiempo de
   cuadro MEDIDO.

   Lo que se ajusta es la resolucion y, en el ultimo escalon, las sombras. Es la misma decision que
   toman las consolas y es la correcta: la resolucion se nota mucho menos que perder la sombra, y las
   dos se notan muchisimo menos que ir a 30. Lo que el jugador eligio en el menu sigue mandando como
   TECHO — el control solo baja desde ahi, nunca sube por encima.

   TRES REGLAS, Y LA PRIMERA ES ARITMETICA Y NO GUSTO (es la de RECREO, medida alla en 336 corridas):

   1. LA SEPARACION ENTRE ESCALONES TIENE QUE SER MENOR QUE LA BANDA MUERTA. El tiempo de cuadro va
      con los pixeles, o sea con el CUADRADO de la escala: si dos escalones vecinos estan en razon k,
      saltar de uno al otro multiplica el tiempo por k². Con k² mayor que la banda, el escalon de
      arriba queda por encima y el de abajo por debajo, y el control NO PUEDE quedarse quieto: sube,
      baja, sube, para siempre. La banda va de 0,92 a 1,25 del objetivo, o sea un factor 1,359; la
      escalera es geometrica de razon 1,12, o sea k²=1,25, con margen.
   2. ES ASIMETRICA Y CON ENFRIAMIENTO: bajar necesita UNA ventana mala, subir necesita varias buenas
      seguidas, y despues de cualquier cambio no se toca nada por segundo y medio.
   3. SUBIR CUESTA CADA VEZ MAS. Si el aparato ya demostro una vez que no daba, volver a probar cada
      tres ventanas es garantia de rebote. La racha necesaria se duplica en cada subida.
   ========================================================================================= */
const RES_ESC=[1.00, 0.89, 0.80, 0.71, 0.64, 0.57, 0.50, 0.45];
const RES_OBJ=1000/58;                    // ms por cuadro a los que se apunta
let resI=0, resDin=1, resSombra=true;
let _resN=0, _resSuma=0, _resBuenas=0, _resFrio=0, _resCambios=0, _resSubidas=0;
function resTick(dt){
  if(dt>0.25) return;                     // un cuadro larguisimo no dice nada del aparato
  if(_resFrio>0) _resFrio-=dt;
  _resSuma+=dt; _resN++;
  if(_resN<24) return;
  const ms=(_resSuma/_resN)*1000;
  _resN=0; _resSuma=0;
  if(_resFrio>0) return;
  if(ms>RES_OBJ*1.25){
    _resBuenas=0;
    if(resI<RES_ESC.length-1){ resI++; _resFrio=1.5; _resCambios++; aplicarRes(); }
    /* EL ULTIMO ESCALON NO ES LA RESOLUCION: SON LAS SOMBRAS. Con la escalera en el piso ya se
       dibujan cinco veces menos pixeles; lo que queda por sacar es la pasada entera de sombra, que
       vale la MITAD de las llamadas de dibujo. Se saca ultima porque se nota mas que la resolucion. */
    else if(resSombra && CALS[CAL].sombras){ resSombra=false; _resFrio=1.5; _resCambios++; aplicarRes(); }
  } else if(ms<RES_OBJ*0.92){
    const hace=3*Math.pow(2, Math.min(_resSubidas,4));
    if(++_resBuenas>=hace){
      _resBuenas=0; _resFrio=1.5; _resCambios++; _resSubidas++;
      if(!resSombra && CALS[CAL].sombras) resSombra=true;
      else if(resI>0) resI--;
      aplicarRes();
    }
  } else _resBuenas=0;
}
function aplicarRes(){
  resDin=RES_ESC[resI];
  render.shadowMap.enabled = CALS[CAL].sombras && resSombra;
  luz.castShadow = render.shadowMap.enabled;
  ajustar();
}
/* SE APLICA EN CALIENTE. Un ajuste que pide recargar la pagina no se prueba: el jugador lo toca una
   vez, no ve nada y no vuelve. */
function aplicarCalidad(k){
  if(CALS[k]) CAL=k;
  /* AL CAMBIAR DE CALIDAD A MANO, EL CONTROL VUELVE A CERO. Si no, el jugador sube a 'alta' y sigue
     viendo la resolucion que el control habia bajado en 'media': tocaria el boton y no pasaria nada
     visible, que es la peor respuesta posible para un ajuste. */
  resI=0; resDin=RES_ESC[0]; resSombra=true;
  _resBuenas=0; _resSubidas=0; _resFrio=1.5; _resN=0; _resSuma=0;
  try{ localStorage.setItem('rezuno_cal', CAL); }catch(e){}
  const c=CALS[CAL];
  render.shadowMap.enabled=c.sombras && resSombra;
  luz.castShadow=render.shadowMap.enabled;
  if(luz.shadow.mapSize.x!==c.mapa){
    luz.shadow.mapSize.set(c.mapa, c.mapa);
    /* EL MAPA VIEJO HAY QUE SOLTARLO A MANO. three.js no recrea la textura de sombra porque cambie
       mapSize: se queda con la de antes y el cambio no hace nada. */
    if(luz.shadow.map){ luz.shadow.map.dispose(); luz.shadow.map=null; }
  }
  escena.fog = c.niebla? _niebla : null;
  /* todos los materiales tienen que recompilar cuando entra o sale la niebla o las sombras */
  escena.traverse(o=>{ if(o.material){ const M=Array.isArray(o.material)? o.material : [o.material];
                                       for(const m of M) m.needsUpdate=true; } });
  ajustar();
  return CAL;
}
addEventListener('resize', ajustar);
aplicarCalidad(CAL);
/* la camara se coloca una vez: sin nadie que la orbite, este es su unico llamado */
camaraGiro(0, 1);

/* =========================================================================================
   LA CARA DE UNA CARTA, PINTADA EN UN LIENZO Y CACHEADA

   Las caras se dibujan por codigo —no hay un solo archivo de imagen en el juego— y se guardan por
   clave. SE CACHEAN Y NO SE GENERAN TODAS: hay 54 caras distintas y en pantalla nunca hay mas de
   veinte, asi que generarlas todas al arrancar seria subir a la GPU el triple de textura que se usa.
   ========================================================================================= */
/* los cuatro colores y los cinco valores de accion viven en b.js: son DATOS DEL JUEGO y no del
   dibujo. Repetirlos aca costo un SyntaxError que tira la pagina entera antes de la primera linea. */
const TEX_W=192, TEX_H=288;
const _texCache={};
function simbolo(v){
  if(v===SALTA) return '⊘';
  if(v===GIRA)  return '⇄';
  if(v===MAS2)  return '+2';
  if(v===MAS4)  return '+4';
  if(v===COMODIN) return '★';
  return String(v);
}
function rr(g,x,y,w,h,r){
  const k=Math.min(r,w/2,h/2);
  g.beginPath();
  g.moveTo(x+k,y); g.lineTo(x+w-k,y); g.quadraticCurveTo(x+w,y,x+w,y+k);
  g.lineTo(x+w,y+h-k); g.quadraticCurveTo(x+w,y+h,x+w-k,y+h);
  g.lineTo(x+k,y+h); g.quadraticCurveTo(x,y+h,x,y+h-k);
  g.lineTo(x,y+k); g.quadraticCurveTo(x,y,x+k,y); g.closePath();
}
function texCara(c){
  const k=(c.color===4? 'W':c.color)+':'+c.valor;
  if(_texCache[k]) return _texCache[k];
  const cv=document.createElement('canvas'); cv.width=TEX_W; cv.height=TEX_H;
  const g=cv.getContext('2d');
  const W=TEX_W, H=TEX_H;
  g.fillStyle='#f7f8f9'; g.fillRect(0,0,W,H);
  const m=W*0.055;
  rr(g, m, m, W-2*m, H-2*m, W*0.075);
  g.fillStyle = c.color<4? COLORES[c.color] : '#26282e'; g.fill();
  if(c.color===4){
    const cx=W/2, cy=H/2, r=W*0.30;
    for(let q=0;q<4;q++){
      g.beginPath(); g.moveTo(cx,cy);
      g.arc(cx,cy,r,(q*90-135)*Math.PI/180,((q+1)*90-135)*Math.PI/180);
      g.closePath(); g.fillStyle=COLORES[q]; g.fill();
    }
    if(c.valor===MAS4){
      g.font='800 '+(W*0.24)+'px "Segoe UI",system-ui,sans-serif';
      g.fillStyle='#f7f8f9'; g.textAlign='center'; g.textBaseline='middle';
      g.fillText('+4', cx, cy+H*0.29);
    }
  } else {
    /* el ovalo blanco inclinado es lo que hace que se lea a carta de este juego y no a ficha */
    g.save(); g.translate(W/2,H/2); g.rotate(-Math.PI/8);
    g.beginPath(); g.ellipse(0,0,W*0.38,H*0.29,0,0,Math.PI*2);
    g.fillStyle='#f7f8f9'; g.fill(); g.restore();
    const sim=simbolo(c.valor);
    g.font='800 '+(W*(sim.length>1?0.40:0.56))+'px "Segoe UI",system-ui,sans-serif';
    g.fillStyle=COL_OSC[c.color]; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(sim, W/2, H/2);
  }
  /* EL SIMBOLO VA TAMBIEN EN DOS ESQUINAS. En el abanico las cartas se tapan entre si y lo unico que
     asoma es la esquina de arriba: sin ese numero chico, media mano es ilegible. */
  const sim=simbolo(c.valor);
  g.font='700 '+(W*0.155)+'px "Segoe UI",system-ui,sans-serif';
  g.fillStyle='#f7f8f9'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText(sim, W*0.17, H*0.115);
  g.save(); g.translate(W*0.83, H*0.885); g.rotate(Math.PI);
  g.fillText(sim, 0, 0); g.restore();
  const t=new THREE.CanvasTexture(cv);
  t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  _texCache[k]=t;
  return t;
}
let _texDorso=null;
function texDorso(){
  if(_texDorso) return _texDorso;
  const cv=document.createElement('canvas'); cv.width=TEX_W; cv.height=TEX_H;
  const g=cv.getContext('2d'); const W=TEX_W,H=TEX_H;
  g.fillStyle='#f7f8f9'; g.fillRect(0,0,W,H);
  const m=W*0.055;
  /* EL DORSO ES CLARO Y NO NEGRO. En la primera captura en 3D los dos abanicos de los rivales y el
     mazo eran tres bloques oscuros sobre una mesa blanca: lo mas pesado del cuadro pasaba a ser lo
     que menos importa. Un gris apenas mas oscuro que la mesa, con el borde marcado, dice "hay cartas
     ahi" sin robarle el ojo a los colores, que son la unica informacion del juego. */
  rr(g,m,m,W-2*m,H-2*m,W*0.075); g.fillStyle='#dcdfe4'; g.fill();
  g.lineWidth=W*0.022; g.strokeStyle='#b7bcc4'; g.stroke();
  g.save(); g.translate(W/2,H/2); g.rotate(-Math.PI/8);
  g.beginPath(); g.ellipse(0,0,W*0.34,H*0.26,0,0,Math.PI*2);
  g.fillStyle='#cbcfd6'; g.fill(); g.restore();
  g.font='200 '+(W*0.28)+'px "Segoe UI",system-ui,sans-serif';
  g.fillStyle='#7b818b'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText('Rez', W/2, H/2);
  const t=new THREE.CanvasTexture(cv);
  t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  _texDorso=t; return t;
}

/* =========================================================================================
   UNA CARTA ES UNA CAJA FINA CON SEIS MATERIALES

   El canto tiene que existir: una carta sin grosor vista de costado desaparece, y en un abanico
   inclinado eso pasa todo el tiempo. Cuatro decimas de milimetro a escala de la carta alcanza.
   Los seis indices de una BoxGeometry son +X, -X, +Y, -Y, +Z (frente) y -Z (dorso).
   ========================================================================================= */
/* LA CARTA MIDE 1,72 Y NO 2,00, Y NO ES UN GUSTO. El abanico entero tiene que entrar en el ancho del
   cuadro —medido, 7,4 unidades es el maximo que entra con este encuadre— asi que el paso entre carta
   y carta esta fijado por la pantalla y no por la carta. Con cartas de 2,00 el solape era del 55% y
   de siete cartas se leian cuatro; con 1,72 el solape baja al 44% y asoman las siete. La proporcion
   sigue siendo 2:3, que es la de una carta de verdad. */
const CARTA_W=1.72, CARTA_H=2.58, CARTA_D=0.042;
const _geoCarta=new THREE.BoxGeometry(CARTA_W, CARTA_H, CARTA_D);
/* TRES GRUPOS Y NO SEIS, Y ESO ES LA MITAD DE LAS LLAMADAS DE DIBUJO. Una BoxGeometry trae un grupo
   por cara, o sea seis llamadas por carta: con veinticinco cartas en pantalla son 150 llamadas para
   dibujar veinticinco rectangulos. Los cuatro cantos y el dorso comparten material —el dorso no se ve
   NUNCA, porque "boca abajo" en este juego es ponerle el dorso a la cara de arriba, no dar vuelta la
   carta— asi que quedan tres grupos: cantos, cara y dorso. Medido: de 142 llamadas a 82. */
_geoCarta.clearGroups();
_geoCarta.addGroup(0, 24, 0);      // +X, -X, +Y, -Y: los cuatro cantos
_geoCarta.addGroup(24, 6, 1);      // +Z: la cara
_geoCarta.addGroup(30, 6, 0);      // -Z: el dorso, con el material del canto
const _matCanto=new THREE.MeshLambertMaterial({color:0xf2f3f4});
/* ===== UNA CARTA QUE SOLO MUESTRA EL DORSO SE DIBUJA DE UNA SOLA VEZ =====
   Las llamadas de dibujo de este juego SON las cartas: cada una lleva tres grupos de geometria
   —cantos, cara y dorso— o sea TRES llamadas, y con veinticinco cartas en pantalla eso son 75. Pero
   las de los rivales y el mazo no muestran la cara NUNCA: para ellas los tres grupos son un gasto sin
   contrapartida. Con una geometria sin grupos y un solo material, cada una pasa a UNA llamada.
   Lo unico que cambia en pantalla es el canto, que deja de ser #f2f3f4 y pasa a ser el gris del
   dorso: 4 centimetros de espesor a esa distancia son uno o dos pixeles. */
const _geoDorso=_geoCarta.clone();
_geoDorso.clearGroups();
function nuevaCartaDorso(){
  const m=new THREE.Mesh(_geoDorso, new THREE.MeshLambertMaterial({color:0xffffff, map:texDorso()}));
  m.castShadow=true; m.receiveShadow=false;
  m.userData={};
  return m;
}
function nuevaCarta(){
  const mats=[_matCanto, new THREE.MeshLambertMaterial({color:0xffffff})];
  const m=new THREE.Mesh(_geoCarta, mats);
  m.castShadow=true; m.receiveShadow=false;
  m.userData={};
  return m;
}
/* CON carta EN null LA CARA DE ADELANTE LLEVA EL DORSO, NO NADA. Esto era un defecto y se vio en la
   primera captura en 3D: las cartas de los rivales y el mazo salian como rectangulos BLANCOS. La
   razon es que "boca abajo" en esta escena no significa girar la carta —estan apoyadas en la mesa y
   lo que se ve es su cara de arriba— sino PONERLE EL DORSO A LA CARA QUE SE VE. Dejar el mapa en
   null deja el material blanco, que sobre una mesa blanca es un rectangulo invisible. */
function ponerCara(malla, carta){
  const m=malla.material[1];
  const t=carta? texCara(carta) : texDorso();
  if(m.map!==t){ m.map=t; m.needsUpdate=true; }
}
/* apagar una carta que no se puede jugar: se BAJA el color, no se pone transparente. Transparente
   obliga a ordenar por profundidad y en un abanico que se superpone eso se ve peor que el problema */
function ponerApagado(malla, apagado){
  const c=apagado? 0x9aa0aa : 0xffffff;
  if(malla.material[1].color.getHex()!==c) malla.material[1].color.setHex(c);
}
