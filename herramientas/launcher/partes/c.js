/* ══════════════════════ EL FONDO ══════════════════════

   ── ES UNA FOTO, Y ESO ES LA OPTIMIZACIÓN ──
   Antes esto era un lienzo procedural: ocho cielos interpolados por hora, nubes,
   agua, rayos de sol, burbujas y hojas, redibujado treinta veces por segundo
   sobre toda la pantalla. Medido, 0,205 ms de JavaScript por cuadro **más** el
   relleno de 412×892 píxeles, y encima cada `backdrop-filter` del vidrio vuelve
   a leer esos píxeles. Una foto no cuesta un solo cuadro: el compositor la sube
   a la GPU una vez y no la vuelve a tocar nunca.

   Lo único que se mueve es una deriva de veinticuatro segundos hecha con
   `transform`, que el compositor resuelve solo — no pasa por JavaScript ni por
   el hilo principal, así que sigue costando cero.

   Lo que quedó de la versión anterior es la idea de que el fondo tiene que
   RESPONDER: al abrir el cajón se acerca un poco. Eso es lo que hace que la
   hoja esmerilada se lea a hoja sobre algo y no a pantalla nueva. */

let FONDO_EL = null, FONDO_OK = false;

let FONDO_IMG = null;   /* el mapa de bits del fondo, que también usa el agua */

/* ── CUÁL FONDO ESTÁ PUESTO ──
   `fab` es el de fábrica —el de la foto que mandó el usuario—, `propio` es una
   imagen suya guardada, y cualquier otra clave es una de las ocho de la galería.
   Vive en una sola función porque lo leen el arranque, la galería y el agua. */
function fondoURI(){
  const k = lee('fondoSel', 'fab');
  if (k === 'propio'){
    const d = lee('fondoPropio', '');
    if (d) return d;
    return IMG_FONDO;            /* se borró: no se deja la pantalla vacía */
  }
  if (typeof FONDOS !== 'undefined' && FONDOS[k]) return FONDOS[k];
  return IMG_FONDO;
}

/* ── CAMBIAR DE FONDO NO ES ESCRIBIR UNA URL ──
   Hay tres cosas colgadas de esta imagen y las tres tienen que enterarse: el
   `background-image` del elemento, el mapa de bits que el agua sube a la GPU, y
   el mapeo de «cover» que el shader usa para muestrear. Escribiendo sólo la
   primera, el agua seguiría refractando el fondo ANTERIOR — y eso no falla, se
   ve como que la onda pinta otra foto. */
function fondoPone(k){
  guarda('fondoSel', k);
  const im = new Image();
  im.onload = () => {
    FONDO_IMG = im;
    FONDO_EL.style.backgroundImage = 'url(' + im.src + ')';
    FONDO_EL.classList.add('ok');
    FONDO_OK = true;
    if (typeof aguaRefondo === 'function') aguaRefondo();
    if (typeof cajFrostHornea === 'function') cajFrostHornea();
    /* ── UN FONDO NUEVO ES UNA DECODIFICACIÓN NUEVA ──
       Y se paga la primera vez que alguien la DIBUJA, que sin esto era adentro
       del manejador del dedo del agua. Se paga acá, en el ocio. */
    if (typeof aguaRecalienta === 'function') aguaRecalienta();
  };
  im.onerror = () => {};         /* queda el que estaba, que ya se ve */
  im.src = fondoURI();
}

function fondoInit(){
  FONDO_EL = $('#fondo');

  /* ── LA FOTO ENTRA CUANDO LLEGA, NO ANTES ──
     Es un data URI de 113 KB: decodificarlo es asincrónico. Poniéndola como
     `background-image` de una, el primer cuadro es un rectángulo vacío. Se
     precarga en un `Image` y recién cuando decodificó se enciende, con el
     degradado de respaldo debajo mientras tanto. */
  /* ── LA MISMA IMAGEN LA USA EL AGUA ──
     El efecto de ondas dibuja la foto desplazada en un lienzo de WebGL, y la
     textura sale de acá: pidiéndola de nuevo se decodificarían 113 KB dos
     veces para tener el mismo mapa de bits. */
  const im = new Image();
  FONDO_IMG = im;
  im.onload = () => {
    FONDO_EL.style.backgroundImage = 'url(' + im.src + ')';
    FONDO_EL.classList.add('ok');
    FONDO_OK = true;
    if (typeof aguaRecalienta === 'function') aguaRecalienta();
    /* ── EL HORNEADO DEL CAJÓN DEPENDE DE ESTA FOTO ──
       `cajPrepara` lo intenta en el ocio, pero el ocio puede llegar ANTES de
       que el data URI decodifique: ahí `cajFrostHornea` se rinde y no vuelve a
       intentar nunca, o sea que el cajón se queda con el filtro vivo. Acá se
       sabe que la foto está. */
    if (typeof cajFrostRehornea === 'function') cajFrostRehornea();
  };
  im.onerror = () => { FONDO_OK = false; };   /* queda el degradado, que ya se ve */
  im.src = fondoURI();
}

/* ── EL FONDO SE ACERCA CUANDO SE ABRE EL CAJÓN ──
   Una clase y nada más: la transición la hace el compositor. */
function fondoProfundo(v){
  if (FONDO_EL) FONDO_EL.classList.toggle('hondo', !!v);
}

/* ══════════ EL VIDRIO DEL CAJÓN SE HORNEA UNA SOLA VEZ ══════════

   ── UN `backdrop-filter` SOBRE ALGO QUE SE MUEVE SE REHACE EN CADA CUADRO ──
   Y no por una torpeza del navegador: es por construcción. El filtro toma lo
   que hay DEBAJO del rectángulo del elemento, así que cuando el elemento se
   corre, el rectángulo mira otra parte del fondo y hay que volver a filtrar.
   El cajón es una hoja a pantalla completa con `blur(34px)` que se desliza
   durante 340 ms: son **367.504 píxeles de desenfoque de 34 px, veinte veces
   seguidas, en cada apertura**. Medido con `cajDesliza`: 5 pasadas de vidrio y
   479.425 px por cuadro mientras la hoja viaja.

   Lo que no se puede es abaratar el desenfoque: la vuelta 123 ya midió que
   **lo que cuesta es la PASADA y no el radio** (bajar de 34 px a 4 midió PEOR,
   61,4 ms contra 47,6). Así que la única palanca es que la pasada no exista.

   ── Y NO TIENE POR QUÉ EXISTIR, PORQUE EL FONDO NO CAMBIA ──
   Lo que el cajón desenfoca es la foto de fondo, que es una imagen estática —y
   encima la deriva se PAUSA debajo del cajón desde la vuelta 130—. O sea que
   las veinte pasadas de cada apertura calculan siempre el mismo resultado. Se
   calcula una vez, en el ocio, y queda como mapa de bits: de ahí en más el
   deslizamiento es una traslación y nada más, que es lo que el compositor sabe
   hacer sin tocar el hilo principal.

   ── EL DESENFOQUE ES EL ACHIQUE, NO EL FILTRO ──
   Achicar a 108 px de ancho y volver a estirar YA es un desenfoque: el
   promediado del achique y la interpolación del estirado hacen la mayor parte
   del trabajo. El `filter` del lienzo sólo pone lo que falta, y sobre 108×234
   cuesta nada. Se hornea en **espacio de pantalla** —con el mismo «cover» y el
   mismo `scale(1.06)` que tiene `#fondo`— así que con la hoja asentada el
   horneado cae exactamente donde cae la foto: no hay nada que alinear.

   ── EL BORDE SE RECORTA, O QUEDA UN HALO ──
   `ctx.filter` muestrea fuera del lienzo como transparente, así que blurear
   contra el borde deja el canto lavado. Se hornea con un margen del doble del
   radio y se recorta después. */
const CAJ_FROST_W = 108;
const CAJ_FROST_R = 34;        /* el mismo radio que el `backdrop-filter` vivo */
/* ── CUÁNTO ESTÁ ACERCADA LA FOTO CUANDO EL CAJÓN ESTÁ ABIERTO ──
   No es el 1.06 de la declaración: `@keyframes deriva` va de `scale(1.06)` a
   `scale(1.09)` —o sea 1.075 en el medio— y encima `#fondo.hondo` multiplica
   por 1.075 con el cajón puesto. Horneando con 1.06 el mapa de bits muestra un
   9% MÁS de foto que la pantalla, y eso se ve: medido contra el filtro vivo,
   el horneado salía con brillo 105,5 contra 101,7 y con el azul del ángulo
   superior mucho más vivo, porque estaba mostrando otra franja del cielo.
   Lo que queda de error es la deriva, ±1,4% de escala y ±4 px de traslación
   según en qué escalón se haya pausado: por debajo del radio del desenfoque. */
const CAJ_FROST_Z = 1.075 * 1.075;
let CAJ_FROST_T = 0;

function cajFrostHornea(rad){
  const caj = document.getElementById('cajon');
  if (!caj) return false;
  /* sin foto queda el `backdrop-filter` de siempre: el degradado de respaldo ya
     es liso, así que no hay nada que desenfocar, y degradar a un rectángulo
     plano sería peor que pagar el filtro */
  if (!FONDO_OK || !FONDO_IMG || !FONDO_IMG.naturalWidth) return false;
  const W = innerWidth || 412, H = innerHeight || 892;
  const w = CAJ_FROST_W, h = Math.max(8, Math.round(w * H / W));
  const s = w / W;                                   /* pantalla → lienzo */
  const r = (rad == null ? CAJ_FROST_R : rad) * s;   /* el radio, en el lienzo */
  const m = Math.max(2, Math.ceil(r * 3));           /* tres sigmas de margen */
  try {
    /* ── 1. LA FOTO COMO LA VE LA PANTALLA ──
       El «cover» se calcula contra W×H y no contra el lienzo con margen: el
       margen tiene otra proporción, y calcularlo ahí recorta OTRA parte de la
       foto. Medido con la cuenta mal: el horneado salía con media 108,6 contra
       101,7 del vivo, o sea más azul y más saturado, porque estaba mostrando
       una franja distinta del cielo. */
    const iw = FONDO_IMG.naturalWidth, ih = FONDO_IMG.naturalHeight;
    const k = Math.max(w / iw, h / ih) * CAJ_FROST_Z;
    const dw = iw * k, dh = ih * k;
    const base = document.createElement('canvas');
    base.width = w; base.height = h;
    const bx = base.getContext('2d');
    if (!bx) return false;
    bx.drawImage(FONDO_IMG, (w - dw) / 2, (h - dh) / 2, dw, dh);

    /* ── 2. EL BORDE SE REPITE HACIA AFUERA ──
       `ctx.filter` muestrea fuera del lienzo como TRANSPARENTE, así que
       desenfocar contra el borde deja el canto lavado. Un `backdrop-filter` de
       verdad clampea, y eso es lo que se imita: la última fila y la última
       columna se estiran sobre el margen, más las cuatro esquinas. */
    const cw = w + m * 2, ch = h + m * 2;
    const pad = document.createElement('canvas');
    pad.width = cw; pad.height = ch;
    const px = pad.getContext('2d');
    px.drawImage(base, m, m);
    px.drawImage(base, 0, 0, w, 1, m, 0, w, m);
    px.drawImage(base, 0, h - 1, w, 1, m, m + h, w, m);
    px.drawImage(base, 0, 0, 1, h, 0, m, m, h);
    px.drawImage(base, w - 1, 0, 1, h, m + w, m, m, h);
    px.drawImage(base, 0, 0, 1, 1, 0, 0, m, m);
    px.drawImage(base, w - 1, 0, 1, 1, m + w, 0, m, m);
    px.drawImage(base, 0, h - 1, 1, 1, 0, m + h, m, m);
    px.drawImage(base, w - 1, h - 1, 1, 1, m + w, m + h, m, m);

    /* ── 3. EL DESENFOQUE, Y DESPUÉS EL RECORTE ── */
    const bl = document.createElement('canvas');
    bl.width = cw; bl.height = ch;
    const lx = bl.getContext('2d');
    lx.filter = 'blur(' + r.toFixed(2) + 'px) saturate(118%) brightness(.84)';
    lx.drawImage(pad, 0, 0);
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    out.getContext('2d').drawImage(bl, m, m, w, h, 0, 0, w, h);

    caj.style.setProperty('--cajFrost', 'url(' + out.toDataURL('image/jpeg', 0.82) + ')');
    caj.classList.add('hor');
    return true;
  } catch (e){ return false; }   /* un lienzo teñido no puede leerse: queda el filtro */
}

function cajFrostRehornea(){
  clearTimeout(CAJ_FROST_T);
  CAJ_FROST_T = setTimeout(cajFrostHornea, 260);
}
