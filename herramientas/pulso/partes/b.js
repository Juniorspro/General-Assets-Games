
/* ══════════════════════ EL MOTOR Y LA CONFIGURACIÓN ══════════════════════ */
const CFG = {
  calidad: 'media',      /* baja · media · alta */
  sens: 'normal',        /* suave · normal · dura */
  sustos: 'todos',       /* pocos · todos */
  pix: 1.5               /* lo pisa aplicarCalidad() */
};
try {
  const g = localStorage.getItem('pulso_cfg');
  if (g) Object.assign(CFG, JSON.parse(g));
  IDIOMA = localStorage.getItem('pulso_idioma') || 'es';
} catch(e){}
const guardaCfg = () => { try {
  localStorage.setItem('pulso_cfg', JSON.stringify(CFG));
  localStorage.setItem('pulso_idioma', IDIOMA);
} catch(e){} };

let MODO = 'menu';         /* menu · juega · fin */
let PAUSA = false;

/* ── `GIRO_VIS` SE DECLARA ACÁ Y NO DONDE SE USA, Y ES A PROPÓSITO ──
   Es el ángulo con el que se está dibujando el cuadro. Lo escribe `encuadrar()`
   —dos pantallas más abajo— y lo lee la inclinación, que vive en e.js. Ponerlo
   «donde corresponde temáticamente», o sea al lado del giroscopio, lo dejaría
   declarado DESPUÉS de la primera llamada a `medir()`: todo esto es un solo
   módulo ES, y un `let` leído antes de su línea no devuelve undefined, TIRA — y
   se lleva el módulo entero. Es el noveno caso en este repo. */
let GIRO_VIS = 0;

const lienzo = $('c');
const ren = new T.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' });
ren.outputColorSpace = T.SRGBColorSpace;
/* ── ACES Y NO EL LINEAL POR OMISIÓN ──
   Este juego es una linterna en un pasillo negro: el rango entre lo que la
   linterna toca y lo que no es enorme, y con tono lineal lo iluminado se recorta
   a blanco plano. ACES lo dobla en vez de cortarlo, que es lo que hace que una
   pared iluminada de cerca siga teniendo textura. */
ren.toneMapping = T.ACESFilmicToneMapping;
ren.toneMappingExposure = 1.15;
ren.shadowMap.enabled = true;
ren.shadowMap.type = T.PCFSoftShadowMap;

const escena = new T.Scene();
escena.background = new T.Color(0x000000);
/* la niebla es negra y cierra a doce metros: es lo que hace que el pasillo no
   tenga fondo y que cada esquina sea una pared de nada */
escena.fog = new T.FogExp2(0x000000, 0.088);

/* ── 52° VERTICALES, Y EL NÚMERO CAMBIÓ AL PASAR A HORIZONTAL ──
   En vertical estaba en 66, que con 412×892 daba 33° horizontales. Horizontal,
   los mismos 66 verticales con 892×412 dan **116° horizontales**: un ojo de pez
   donde el pasillo se ve desde afuera y el susto que aparece a un metro queda
   del tamaño de una uña. Con 52 verticales quedan 96 horizontales, que es lo que
   usa un primera persona, y a un metro entran ±1,06 m de ancho contra ±0,49 de
   alto. Todas las posiciones de los sustos y de la tabla salen de esos dos
   números, así que están escritas en función de ellos y no a ojo. */
const cam = new T.PerspectiveCamera(52, 1, 0.05, 90);
escena.add(cam);

let W = 1, H = 1;
/* ── EL ENCUADRE: SIEMPRE HORIZONTAL, GIRADO SI HACE FALTA ──
   Con la ventana vertical el cuadro se arma horizontal —ancho = alto de la
   ventana— y se gira 90°. Con la ventana horizontal no se gira nada. Los dos
   caminos dan el mismo juego; lo único que cambia es si el jugador tiene que
   dar vuelta el teléfono.
   `GIRO_VIS` se escribe acá porque acá se decide, y lo leen el giroscopio y el
   dedo: girar el dibujo sin girar los ejes de entrada deja los controles
   cruzados, que es un defecto peor que no girar nada. */
const caja = $('caja');
function encuadrar(){
  const vw = window.innerWidth, vh = window.innerHeight;
  const gira = vh > vw;
  W = gira ? vh : vw;
  H = gira ? vw : vh;
  caja.style.width = W + 'px';
  caja.style.height = H + 'px';
  caja.style.transform = 'translate(-50%,-50%) rotate(' + (gira ? 90 : 0) + 'deg)';
  GIRO_VIS = gira ? Math.PI/2 : 0;
}
function medir(){
  encuadrar();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ren.setPixelRatio(Math.min(dpr, CFG.pix));
  ren.setSize(W, H, false);
  cam.aspect = W / Math.max(1, H);
  cam.updateProjectionMatrix();
}
addEventListener('resize', () => setTimeout(medir, 60));
addEventListener('orientationchange', () => setTimeout(medir, 120));

function aplicarCalidad(){
  const c = CFG.calidad;
  CFG.pix = c === 'baja' ? 0.75 : c === 'media' ? 1.15 : 1.6;
  ren.shadowMap.enabled = c !== 'baja';
  medir();
}

/* ── EL RELOJ ──
   Paso fijo a 60 con interpolación en el dibujo. Acá no es un lujo: TODO el
   juego es una bola rodando sobre un plano inclinado, y una integración atada a
   los cuadros hace que el bol se caiga antes en un teléfono lento que en uno
   rápido. Eso no es rendimiento, es otro juego. */
const PASO = 1 / 60;
let acum = 0, ultimo = performance.now(), fps = 0, _cuadros = 0, _acumF = 0;
let DIB = 0, TRI = 0;
