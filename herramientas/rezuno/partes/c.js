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
/* EL DPR TIENE TECHO. Dibujar al doble de la resolucion de diseño duplica los pixeles a rellenar y
   lo unico que se gana es remuestrear hacia arriba cartas que no tienen mas detalle que dar — y con
   la camara encendida ese presupuesto hace falta para el detector de manos. */
const DPR_TOPE=2;

const escena=new THREE.Scene();
escena.background=new THREE.Color(0xf4f5f6);
/* la niebla es MUY suave y clara: separa la pared del piso sin que se note que hay niebla */
escena.fog=new THREE.Fog(0xf4f5f6, 26, 54);

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
   EL LIMITE SON 20 GRADOS, y llego a ser 14 por un defecto de MEDICION y no del juego: el barrido
   decia que el abanico se salia del cuadro a partir de los tres grados, y lo que se salia era una
   caja imaginaria — se estaba midiendo la caja alineada a los ejes de una carta inclinada, que crece
   al rotar la vista, y ademas sin poner al dia la matriz del grupo. Con las dos cosas arregladas, el
   abanico cae EXACTAMENTE en la misma fraccion de pantalla de 2 a 16 grados de giro. El limite lo
   pone ahora lo que se quiere ver, no lo que se rompe. */
const CAM_ORBITA=0.349;                  // 20 grados en radianes
let camGiro=0;
function camaraGiro(objetivo, dt){
  const lim=Math.max(-CAM_ORBITA, Math.min(CAM_ORBITA, objetivo||0));
  /* el suavizado va aparte del de la cara: aquel limpia el ruido del modelo, este le da inercia al
     movimiento de la vista para que no se sienta pegada a la cabeza */
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
  render.setPixelRatio(Math.min(devicePixelRatio||1, DPR_TOPE));
  render.setSize(w,h,false);
  camara.aspect=w/h; camara.updateProjectionMatrix();
}
addEventListener('resize', ajustar);
ajustar();

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
