
/* ══════════════════════════════════════════════════════════════════════════
   LA ENTRADA Y EL BUCLE
   ══════════════════════════════════════════════════════════════════════════ */

/* ── UN SOLO BOTON, Y ES LA PANTALLA ENTERA ───────────────────────────────
   No hay joystick ni zona sensible: se toca donde sea. Pedir punteria sobre
   un boton chico con el pulgar en un juego que corre a treinta metros por
   segundo es cobrar por el aparato y no por el juego.
   Y EL TECLADO ENTRA POR EL MISMO SITIO que el dedo, que es `pulsa()`: con
   dos caminos, el dia que se toque uno el otro se queda atras.            */
let DEDOS = 0;
function entradaAbajo(e) {
  if (PANT !== 'juego') return;
  /* el boton de pausa vive DENTRO de la pantalla que salta: sin esta linea,
     tocarlo pausa y salta en el mismo gesto, y el jugador vuelve de la pausa
     en el aire sin haber apretado nada */
  if (e && e.target && e.target.closest && e.target.closest('#bPausa')) return;
  DEDOS++;
  if (DEDOS === 1) pulsa(true);
  if (e && e.cancelable) e.preventDefault();
}
function entradaArriba() {
  DEDOS = Math.max(0, DEDOS - 1);
  if (DEDOS === 0) pulsa(false);
}
addEventListener('pointerdown', entradaAbajo, { passive: false });
addEventListener('pointerup', entradaArriba);
addEventListener('pointercancel', entradaArriba);
/* si el dedo se levanta afuera de la ventana el `pointerup` no llega nunca y
   el rider se queda girando para siempre: es el mismo defecto que en RECREO
   dejaba al jugador caminando contra una pared */
addEventListener('blur', () => { DEDOS = 0; pulsa(false); });
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { entradaAbajo(e); }
  else if (e.code === 'Escape' || e.code === 'KeyP') { if (PANT === 'juego') pausa(true); else if (PANT === 'pausa') pausa(false); }
});
addEventListener('keyup', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') entradaArriba();
});
addEventListener('resize', ajustaMarco);
/* el primer gesto despierta el audio: ningun navegador deja sonar nada antes
   de uno, y en captura sobre el documento no hay que acordarse en cada boton */
addEventListener('pointerdown', audioArranca, { capture: true });
addEventListener('keydown', audioArranca, { capture: true });

/* ── LA PARTIDA ───────────────────────────────────────────────────────────
   `demo` es la del menu: el mismo mundo, la misma fisica y el mismo boton,
   apretado por el auto-jugador. Un menu con el juego quieto detras tira a la
   basura lo unico que este juego tiene para mostrar.                      */
let DEMO = false;
/* Y SE PUEDE APAGAR LA RESURRECCION, que no es un detalle de sonda: mientras
   el demo revive solo, una corrida del auto-jugador NO PUEDE informar una
   muerte —`R.vivo` vuelve a true en el mismo paso y `R.muerte` se borra— asi
   que la medicion daba "25 de 25 vivos" pase lo que pase. Un numero que no
   puede salir mal no mide nada.                                          */
let DEMO_REVIVE = true;
const PREV = { x: 0, y: 0, ang: 0 };

function nuevaPartida(demo) {
  DEMO = !!demo;
  terrReinicia((Math.random() * 1e9) | 0);
  riderReinicia();
  camReinicia();
  riderVisReinicia();
  botReinicia(false);
  /* CADA PARTIDA ARRANCA EN UN MOMENTO SORTEADO DEL DIA: empezando siempre al
     alba, una corrida de cuatrocientos metros —que es la primera de
     cualquiera— veria siempre lo mismo y las otras siete paletas no
     existirian para nadie. */
  HORA0 = Math.random();
  HORA = HORA0;
  OBJ_HECHOS = [];
  DEDOS = 0; pulsa(false);
  PREV.x = R.x; PREV.y = R.y; PREV.ang = R.ang;
  HUD.pts = -1; HUD.mon = -1; HUD.truco = null; HUD.pista = null;
}

function empieza() {
  nuevaPartida(false);
  verPantalla('juego');
  audioArranca();
}
function pausa(v) {
  if (v && PANT === 'juego') verPantalla('pausa');
  else if (!v && PANT === 'pausa') verPantalla('juego');
}
function alMenu() {
  nuevaPartida(true);
  verPantalla('menu');
}
function termina() {
  const m = Math.floor(R.dist);
  const nuevo = m > GUARDA.rec;
  if (nuevo) GUARDA.rec = m;
  GUARDA.mon += R.mons;
  GUARDA.ac.grinds += R.grinds;
  guardaEscribe();
  pintaFin(nuevo);
  verPantalla('fin');
}

/* ── EL RELOJ: PASO FIJO CON INTERPOLACION ────────────────────────────────
   Un telefono a 30 y una notebook a 144 tienen que jugar EL MISMO juego: con
   el paso variable, la velocidad de crucero, el alcance del salto y la
   tolerancia del aterrizaje salen distintos en cada aparato, y eso no es una
   diferencia de rendimiento sino otro juego. Lo que rellena entre paso y
   paso es la interpolacion, no mas simulacion.                            */
let ACU = 0, ULT = 0, HORA0 = 0;

function unPaso(dt) {
  if (!R.vivo) return;
  PREV.x = R.x; PREV.y = R.y; PREV.ang = R.ang;
  if (DEMO) pulsa(botPiensa(dt));
  riderPaso(dt);
  HORA = HORA0 + R.dist / CICLO_M;
  if (!DEMO) objPaso();
  if (!R.vivo && !DEMO) termina();
  if (!R.vivo && DEMO && DEMO_REVIVE) nuevaPartida(true);   // el menu no se queda mirando un cadaver
}

function cuadro(ms) {
  requestAnimationFrame(cuadro);
  const t = ms / 1000;
  let dt = ULT ? t - ULT : 0; ULT = t;
  if (dt > DT_TOPE) dt = DT_TOPE;
  TIEMPO += dt;

  const corre = PANT === 'juego' || PANT === 'menu';
  if (corre) {
    ACU += dt;
    let n = 0;
    while (ACU >= PASO && n < PASOS_TOPE) { unPaso(PASO); ACU -= PASO; n++; }
    if (n === PASOS_TOPE) ACU = 0;   // el aparato no llega: va en camara lenta, no se cuelga
  }

  /* la posicion que se DIBUJA sale de mezclar los dos ultimos pasos, y el
     angulo por el camino corto: con `mezcla` a secas, cruzar de +179 a -179
     hace girar el cuerpo una vuelta entera en un cuadro */
  const a = corre ? clamp(ACU / PASO, 0, 1) : 1;
  const ix = mezcla(PREV.x, R.x, a), iy = mezcla(PREV.y, R.y, a);
  const iang = PREV.ang - angDif(PREV.ang, R.ang) * a;

  paletaEn(HORA);
  camPaso(dt);
  riderVis(dt, ix, iy, iang);
  audioPaso(dt, PANT === 'juego');
  if (PANT === 'juego' || PANT === 'pausa') hudPaso();

  pinta(ix, iy, iang);
}

/* ── EL ORDEN DEL DIBUJO ──────────────────────────────────────────────────
   De lejos a cerca, y el rider ANTES que las monedas: una moneda que se pasa
   por delante de la silueta se lee como que se junto, y las que quedan
   detras se leen como que faltan. El sacudon se aplica una sola vez a todo,
   asi que nada puede quedar desalineado con nada.                         */
function pinta(x, y, ang) {
  ctx.save();
  if (CAM.sac > 0.01) {
    ctx.translate(Math.sin(CAM.sacF) * CAM.sac * 7, Math.cos(CAM.sacF * 1.37) * CAM.sac * 5);
  }
  pintaFondo(HORA);
  pintaTerreno();
  pintaDeco();
  pintaCuerdas();
  pintaEstela();
  pintaArena();
  pintaRider(x, y, ang);
  pintaMonedas(TIEMPO);
  ctx.restore();
}

/* ── EL CARTEL DEL NOMBRE ─────────────────────────────────────────────────
   NO REEMPLAZA NADA HASTA QUE LLEGA. La palabra escrita con la tipografia del
   sistema ya funciona: el cartel la pisa recien cuando la imagen DECODIFICO.
   Puesto al reves —clase primero, imagen despues— un base64 roto esconde el
   `.nm` y muestra un `.cart` vacio, o sea que el menu se queda literalmente
   SIN nombre. Un asset que falla tiene que costar el asset, no la pantalla. */
function cartelPone() {
  if (typeof UI_CARTEL !== 'string' || !UI_CARTEL) return;
  const im = new Image();
  im.onload = () => {
    document.documentElement.style.setProperty('--cartel', 'url(' + UI_CARTEL + ')');
    document.body.classList.add('cartel');
  };
  im.src = UI_CARTEL;
}

/* ── EL ARRANQUE ──────────────────────────────────────────────────────────
   El idioma se pregunta ANTES del menu: elegirlo dentro de un menu ya escrito
   en un idioma que no se entiende no sirve, porque para cuando se lo
   encuentra ya se leyo todo lo demas sin entenderlo.                      */
guardaLee();
CAL = GUARDA.cal;
IDIOMA = GUARDA.idi || (navigator.language || 'en').slice(0, 2);
if (!LANG[IDIOMA]) IDIOMA = 'en';
ajustaMarco();
nuevaPartida(true);
pintaTodo();
cartelPone();
verPantalla(GUARDA.idi ? 'menu' : 'idioma');

$('mJugar').onclick = () => { son('ui'); empieza(); };
$('bPausa').onclick = e => { e.stopPropagation(); son('ui'); pausa(true); };
$('paSeguir').onclick = () => { son('ui'); pausa(false); };
$('paMenu').onclick = () => { son('ui'); alMenu(); };
$('fOtra').onclick = () => { son('ui'); empieza(); };
$('fMenu').onclick = () => { son('ui'); alMenu(); };

requestAnimationFrame(cuadro);
