/* ══════════════════════ EL MARCO Y EL RELOJ ══════════════════════ */
const $ = (i) => document.getElementById(i);

/* ── EL ANCHO DE DISEÑO ES FIJO Y EL ALTO NO ──
   Todo lo que un juego escribe —una posición, un radio, un tamaño de letra—
   está en unidades de diseño con el ancho clavado en 720, así que una moneda de
   40 px mide lo mismo en un teléfono de 360 y en uno de 1440. Eso es lo que
   evita el defecto que aparece sólo en un tamaño de pantalla y que nadie puede
   reproducir.

   PERO EL ALTO NO PUEDE SER FIJO, y eso se vio en la primera captura: con
   720×1280 clavado —9:16, la relación de un teléfono de 2016— en un teléfono de
   hoy (412×892, o sea 0,46) el marco entraba por el ancho y quedaban DOS BANDAS
   NEGRAS arriba y abajo. Un minijuego que se abre adentro de TikTok tiene que
   ocupar la pantalla entera; una banda negra se lee a que el juego está roto.
   Así que el alto se calcula de la pantalla y los juegos lo leen: lo que se
   ancla abajo se escribe como `AL - algo`, no como un número. Se topa arriba y
   abajo para que una ventana de escritorio muy ancha o muy alta no deforme el
   diseño — ahí sí quedan bandas, y ahí sí corresponde. */
const AN = 720;
let AL = 1280;
const AL_MIN = 1100, AL_MAX = 1760;

const lienzo = $('c');
const g = lienzo.getContext('2d');
const caja = $('caja');
let ESC = 1, DPR = 1;

function medir(){
  const vw = window.innerWidth, vh = window.innerHeight;
  /* el alto de diseño sale de la forma de la pantalla, así que el marco la llena
     entera y no hay bandas */
  let e = vw / AN;
  AL = Math.round(vh / e);
  if (AL < AL_MIN){ AL = AL_MIN; e = vh / AL; }
  else if (AL > AL_MAX){ AL = AL_MAX; e = vh / AL; }
  const w = Math.round(AN * e), h = Math.round(AL * e);
  caja.style.width = w + 'px'; caja.style.height = h + 'px';
  /* ── EL PIXEL RATIO VA TOPADO EN 2, Y ESO ESTÁ MEDIDO EN OTRO JUEGO ──
     En Maicol se midió que dibujar al doble de la resolución de diseño costaba
     la mitad de los cuadros y no compraba ni un detalle, porque no hay más
     detalle que dar: los dibujos están hechos para 720 de ancho. Con 2 el texto
     y los bordes quedan finos y no se paga un tercer múltiplo. */
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  lienzo.width = Math.round(w * DPR);
  lienzo.height = Math.round(h * DPR);
  ESC = (w * DPR) / AN;
  g.setTransform(ESC, 0, 0, ESC, 0, 0);
  g.imageSmoothingEnabled = true;
}
addEventListener('resize', () => setTimeout(medir, 60));
addEventListener('orientationchange', () => setTimeout(medir, 120));

/* ── EL RELOJ: PASO FIJO DE 60 CON TOPE ──
   Un minijuego que se juega por reflejos NO PUEDE depender de los cuadros por
   segundo del aparato: si la moneda cae más rápido en un teléfono lento, es
   otro juego. La simulación va a 60 pasos fijos y el dibujo sale de donde
   quedó. Y el `dt` se topa en un cuarto de segundo, porque una pestaña que
   estuvo dormida no puede simular un minuto de golpe. */
const PASO = 1/60;
let _acum = 0, _ultimo = performance.now();
let MODO = 'idioma';      /* idioma · menu · como · cine · juega · fin */
let PAUSA = false, CONGELADO = false;
let fps = 0, _cuadros = 0, _acumF = 0;

/* la entrada: un solo verbo. Llega normalizada a las unidades de diseño, así
   que un juego nunca ve un píxel de pantalla. */
const TOQUE = { x: 0, y: 0, abajo: false, movido: false, n: 0 };
function aDiseno(ev){
  const r = lienzo.getBoundingClientRect();
  const t = ev.touches ? ev.touches[0] : ev;
  return { x: (t.clientX - r.left) / r.width * AN,
           y: (t.clientY - r.top) / r.height * AL };
}
/* ── EL `preventDefault` DE UN `touchstart` CANCELA EL CLICK, Y ESO DEJABA EL
       JUEGO SIN PODER EMPEZAR ──
   Los cuatro escuchas estaban colgados de la VENTANA, así que un toque en el
   botón JUGAR o en el de idioma pasaba primero por acá, llegaba a
   `preventDefault()` —el juego consume el toque— y el navegador entonces NO
   sintetiza el `click`. En el banco no se veía: Playwright despacha un click de
   ratón de verdad y ese camino no pasa por el táctil. En un teléfono, tocar
   JUGAR no hacía absolutamente nada.

   Ahora la entrada del juego cuelga del LIENZO. Los paneles viven por encima
   (`z-index 5`), así que mientras hay un panel abierto el lienzo no recibe nada
   y los botones son botones; en partida no hay panel y el lienzo recibe todo.
   `touchend`/`mouseup` siguen en la ventana a propósito: un arrastre que
   termina afuera del marco tiene que soltar igual. */
function baja(ev){
  const p = aDiseno(ev);
  TOQUE.x = p.x; TOQUE.y = p.y; TOQUE.abajo = true; TOQUE.movido = false; TOQUE.n++;
  if (MODO === 'cine'){ cineSalta(); return; }
  if (MODO === 'juega' && JUEGO.baja) JUEGO.baja(p.x, p.y);
  if (ev.cancelable) ev.preventDefault();
}
function mueve(ev){
  const p = aDiseno(ev);
  TOQUE.x = p.x; TOQUE.y = p.y; TOQUE.movido = true;
  if (MODO === 'juega' && TOQUE.abajo && JUEGO.mueve) JUEGO.mueve(p.x, p.y);
  if (ev.cancelable) ev.preventDefault();
}
function sube(){
  if (MODO === 'juega' && JUEGO.sube) JUEGO.sube(TOQUE.x, TOQUE.y);
  TOQUE.abajo = false;
}
lienzo.addEventListener('touchstart', baja, { passive: false });
lienzo.addEventListener('touchmove', mueve, { passive: false });
addEventListener('touchend', sube, { passive: true });
addEventListener('touchcancel', sube, { passive: true });
lienzo.addEventListener('mousedown', baja);
addEventListener('mousemove', (e) => { if (TOQUE.abajo) mueve(e); });
addEventListener('mouseup', sube);
/* la barra espaciadora hace de toque EN EL MEDIO del marco: es lo que permite
   probarlo en una notebook sin fingir un táctil. Y va con las coordenadas de
   diseño y no con las del evento, porque un `keydown` no trae ninguna — con
   `clientX` en cero el toque caía en el borde izquierdo, que en un juego de
   tocar la mitad es una respuesta equivocada. */
function toqueMedio(){
  if (MODO === 'cine'){ cineSalta(); return; }
  TOQUE.x = AN/2; TOQUE.y = AL/2; TOQUE.abajo = true;
  if (MODO === 'juega' && JUEGO.baja) JUEGO.baja(AN/2, AL/2);
  if (MODO === 'juega' && JUEGO.sube) JUEGO.sube(AN/2, AL/2);
  TOQUE.abajo = false;
}
addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') toqueMedio();
});
