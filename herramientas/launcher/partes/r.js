/* ══════════════════════ EL AGUA ══════════════════════

   Pedido de la vuelta 121: «al tocar la pantalla en un espacio libre tener
   efecto de agua, algo así como Samsung tenía». Reporte de esta vuelta: «se
   laguea mucho el toque de agua, mejoralo mucho».

   ── DÓNDE ESTABA EL COSTO, MEDIDO ──
   Con render por software y el lienzo a 367 mil píxeles: 13,4 ms por cuadro con
   UNA onda y 23,5 con seis. Y ése es el número del banco, que corre a densidad
   1; en un teléfono de densidad 3 el lienzo iba a `min(dpr,2)` = 824×1784, o
   sea **cuatro veces** ese relleno. Un cuadro de 120 Hz dura 8,3 ms.

   Las tres cosas que lo arreglan, y ninguna se ve:

   1. EL LIENZO DEJA DE SER OPACO. Antes dibujaba la foto ENTERA desplazada, así
      que tenía que cubrir la pantalla a resolución de aparato o se notaba que
      la foto se ablandaba al encenderlo. Ahora sale con alfa: donde no hay onda
      el alfa es CERO y lo que se ve es el fondo de CSS de siempre, sin copia.
      Eso hace exacta la parte de afuera POR CONSTRUCCIÓN —ya no hay nada que
      medir— y, sobre todo, deja bajar la resolución sin pagar nada: lo único
      que se dibuja a media resolución es una franja de foto que la propia onda
      ya está desplazando y desenfocando.

   2. LA FOTO SE ACHICA UNA VEZ, ANTES DE SUBIRLA. Muestreando una foto de 824
      de ancho en un lienzo de 247 hay un factor 3,3 de reducción, y en WebGL1
      una textura que no es potencia de dos NO PUEDE tener mipmaps: eso es
      aliasing y moaré, o sea justo lo que un efecto de agua no puede tener. La
      foto se dibuja una vez en un lienzo 2D del tamaño del de agua —con el
      «cover» y la deriva ya metidos adentro— y lo que se sube es eso. De paso
      la subida a la GPU pasa de 1,2 millones de texeles a 132 mil, que es lo
      que hace que el PRIMER toque deje de tironear.

   3. Y CADA ONDA SE SALTEA DONDE NO LLEGA. El sobre es `exp(-|x|/58)`: a 300
      píxeles del frente vale 0,006, o sea nada. Un `if` antes de las dos
      exponenciales, el seno y el coseno saltea el bucle entero para la enorme
      mayoría de los píxeles, y con una ventana suave para que no quede un canto
      dibujado en el radio del corte. */

/* ══════════ VUELTA 130: EL VIDRIO SE QUEDA, Y EL BODY NO SE TOCA ══════════
   Reporte: «tocó el agua y se laguea feo y de paso da tirones al subir el
   cajón mientras hay agua».

   ── LO QUE HABÍA, Y LO QUE COSTABA ──
   La vuelta 123 midió que un lienzo que repinta la pantalla entera obliga al
   compositor a rehacer CADA `backdrop-filter` de la página en cada cuadro
   (47,6 ms con el vidrio, 20,8 sin él), y la respuesta fue una escalera de
   clases en el `body` (`aguaN1..3`) que APAGABA el vidrio mientras duraba la
   ráfaga. Eso tenía tres costos que el usuario sí ve, y los tres caían en el
   cuadro del dedo:
     · dos clases en el `body` son dos recálculos de estilo del documento
       ENTERO por toque —una al empezar y otra al terminar— más el repintado de
       cada pieza de vidrio, que cambia de fondo;
     · el vidrio se apaga y se enciende en cada toque: un parpadeo de página;
     · y el ajuste comparaba el hueco entre dos `requestAnimationFrame` —que no
       baja de 16,7 ms— contra un presupuesto de 7: SIEMPRE caía al último
       escalón en seis cuadros y lo dejaba guardado. Con eso, en cualquier
       aparato, cada toque apagaba el vidrio entero y lo volvía a prender.
   Más el `display:none`→`block` del lienzo, que le pide al compositor una capa
   nueva en cada toque.

   ── LO QUE SE PROBÓ Y NO SIRVIÓ, Y VALE ANOTARLO ──
   La primera versión de esta vuelta puso el lienzo POR ENCIMA del escritorio
   con máscaras en el shader para las piezas de vidrio, con el argumento de que
   un `backdrop-filter` toma lo que hay debajo y arriba no habría nada que
   rehacer. Medido con la misma sonda (`aguaFps`) en el mismo banco: **32 fps
   con vidrio contra 60 sin vidrio, arriba igual que abajo**. La razón es cómo
   Chrome dibuja: un `backdrop-filter` se vuelve a aplicar cada vez que su
   rectángulo cae dentro del área DAÑADA del cuadro, y un lienzo a pantalla
   completa daña la pantalla completa esté donde esté. El orden no compra nada;
   lo que cuesta es que el rectángulo se redibuje. Se sacó: eran tres distancias
   por píxel, veinticuatro `getBoundingClientRect` y un puñado de uniformes para
   no ganar un cuadro.

   ── LO QUE SÍ HACE AHORA ──
   · El `body` no se toca. Ninguna clase, ningún recálculo de documento.
   · El vidrio se queda puesto: el desenfoque en una GPU es barato, y lo que
     costaba de verdad era rehacer el estilo y repintar para sacarlo.
   · El único escalón de calidad que queda es sacar la REFRACCIÓN de las
     piezas del escritorio (el `feDisplacementMap`, que es la parte del filtro
     que en un WebView puede caerse al procesador), y va como estilo en línea
     sobre esas tres piezas —tres elementos recalculados, no el documento— sin
     tocar el desenfoque, así que no se ve.
   · El ajuste compara contra un cuadro PERDIDO (26 ms) y no contra 7.
   · El lienzo queda siempre en el documento y transparente: apagar es borrar.

   El otro tirón —el del cajón— está en `e.js` (`verCajon`) y en el CSS de
   `#fondo.ok`: ver ahí. */

const AGUA = {
  el: null, gl: null, prog: null, tex: null, buf: null,
  bake: null, bctx: null, onda: null,
  on: false, listo: false, roto: false, quieto: false,
  res: 0, niv: 0, fijo: false, mide: 0, t0: 0, ondas: [], ultimo: [0, 0], u: {},
  sinRefr: false, tarde: 0, bajo: false
};

const AGUA_VEL = 900, AGUA_ANCHO = 58, AGUA_LARGO = 70;
const AGUA_AMORT = 2.0, AGUA_AMP = 26, AGUA_VIDA = 1.7, AGUA_MAX = 6;
const AGUA_LEJOS = 0.0022, AGUA_LUZ = 0.30;
const AGUA_PASO = 44;
/* dónde se corta cada onda y dónde empieza a apagarse la ventana que evita el
   canto. exp(-230/58) = 0,019 — o sea que lo que se recorta ya no se ve. */
const AGUA_CORTE = 300, AGUA_SUAVE = 230;
/* qué tan rápido el alfa llega a 1: en la cresta de una onda viva el sobre vale
   ~0,2, así que multiplicando por 5 el centro de la franja queda opaco y el
   borde se funde solo contra el fondo */
const AGUA_ALFA = 5.0;

/* ── LA ESCALERA DE RESOLUCIÓN ──
   Fracción del píxel de CSS, no del de aparato. 0,60 en un teléfono de densidad
   3 es la undécima parte del relleno que había. Se baja sola si un cuadro se
   pasa del presupuesto y se guarda, así que el segundo toque ya arranca donde
   corresponde a ESTE aparato. */
const AGUA_ESC = [0.60, 0.60, 0.46, 0.34];
/* ── EL UMBRAL SE MIDE CONTRA LO QUE SE PUEDE MEDIR ──
   Lo único que el bucle sabe es el hueco entre dos `requestAnimationFrame`, y
   ese hueco NUNCA baja de 16,7 ms a 60 Hz aunque el cuadro haya costado uno.
   Compararlo contra 7 ms —que es lo que había— es concluir que todo aparato es
   lento. Un cuadro PERDIDO a 60 Hz mide 33 ms: 26 está en el medio, así que
   sólo baja cuando de verdad se perdió un cuadro. */
const AGUA_TARDE = 26;
/* ── EL ÚNICO ESCALÓN DE CALIDAD: LA REFRACCIÓN DEL ESCRITORIO ──
   Del nivel 1 en adelante, las piezas refractadas de `#capa` pasan al filtro
   plano (`--v-filR`) MIENTRAS dura la ráfaga. Va como estilo en línea sobre
   cada pieza: son tres elementos y no una clase del `body`, y el desenfoque se
   queda, así que el cambio no se ve. */
const AGUA_REFR_SEL = '#capa .vid.refr';

const AGUA_VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const AGUA_FS = `precision mediump float;
uniform sampler2D uTex;
uniform vec2 uRes;          /* el lienzo, en sus propios píxeles */
uniform float uEsc;         /* cuántos px del lienzo mide uno de CSS */
uniform vec4 uOnda[${AGUA_MAX}];   /* x, y, cuándo empezó, fuerza */
uniform float uT;
uniform int uN;
void main(){
  /* el eje y del lienzo va para arriba y el de la pantalla para abajo */
  vec2 pd = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = pd / uEsc;                 /* píxeles de CSS: la cuenta de la onda es
                                         la misma en cualquier aparato */
  vec2 desp = vec2(0.);
  float pend = 0., amp = 0.;
  for (int i = 0; i < ${AGUA_MAX}; i++){
    if (i >= uN) break;
    vec4 o = uOnda[i];
    float t = uT - o.z;
    if (t < 0.0 || t > ${AGUA_VIDA.toFixed(2)}) continue;
    vec2 d = p - o.xy;
    float r = length(d) + 0.001;
    float x = r - t * ${AGUA_VEL.toFixed(1)};
    float ax = abs(x);
    /* ── EL SALTEO ──
       Todo lo de abajo son dos exponenciales, un seno, un coseno y una
       división. A más de 300 px del frente el sobre vale 0,006: se saltea. */
    if (ax > ${AGUA_CORTE.toFixed(1)}) continue;
    float env = exp(-ax / ${AGUA_ANCHO.toFixed(1)}) * exp(-t * ${AGUA_AMORT.toFixed(2)})
              * (1.0 / (1.0 + r * ${AGUA_LEJOS})) * o.w
              * smoothstep(${AGUA_CORTE.toFixed(1)}, ${AGUA_SUAVE.toFixed(1)}, ax);
    float k = 6.2831853 / ${AGUA_LARGO.toFixed(1)};
    desp += (d / r) * sin(x * k) * env;
    pend += cos(x * k) * env;
    amp = max(amp, env);
  }
  /* ── DONDE NO HAY ONDA NO HAY LIENZO ──
     Alfa cero: lo que se ve es el fondo de CSS, sin una copia de por medio. */
  float a = clamp(amp * ${AGUA_ALFA.toFixed(1)}, 0.0, 1.0);
  if (a < 0.004){ gl_FragColor = vec4(0.0); return; }
  vec2 q = (pd + desp * ${AGUA_AMP.toFixed(1)} * uEsc) / uRes;
  vec3 c = texture2D(uTex, q).rgb;
  /* la pendiente de la onda enciende una cara y apaga la otra, que es lo que
     hace una arruga en el agua bajo el sol */
  c += vec3(pend) * ${AGUA_LUZ.toFixed(2)};
  gl_FragColor = vec4(c * a, a);   /* alfa premultiplicado */
}`;

function aguaCompila(gl, tipo, src){
  const s = gl.createShader(tipo);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function aguaArma(){
  if (AGUA.listo || AGUA.roto) return AGUA.listo;
  try {
    const cv = document.createElement('canvas');
    cv.id = 'agua';
    FONDO_EL.parentNode.insertBefore(cv, FONDO_EL.nextSibling);
    const gl = cv.getContext('webgl', { alpha: true, antialias: false,
                                        depth: false, stencil: false,
                                        premultipliedAlpha: true,
                                        preserveDrawingBuffer: false });
    if (!gl) throw new Error('sin webgl');
    const pr = gl.createProgram();
    gl.attachShader(pr, aguaCompila(gl, gl.VERTEX_SHADER, AGUA_VS));
    gl.attachShader(pr, aguaCompila(gl, gl.FRAGMENT_SHADER, AGUA_FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);

    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tx = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx);
    /* CLAMP y no REPEAT: el desplazamiento empuja la muestra fuera del borde y
       con REPEAT ahí aparece el otro extremo de la foto */
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.uniform1i(gl.getUniformLocation(pr, 'uTex'), 0);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   /* premultiplicado */

    AGUA.el = cv; AGUA.gl = gl; AGUA.prog = pr; AGUA.tex = tx; AGUA.buf = b;
    AGUA.onda = new Float32Array(AGUA_MAX*4);       /* se reusa: una tirada por
                                                       cuadro es basura regalada */
    AGUA.bake = document.createElement('canvas');
    AGUA.bctx = AGUA.bake.getContext('2d');
    /* la clave cambia de nombre a propósito: el `aguaNiv` viejo guardaba el
       escalón al que el ajuste roto había caído SIEMPRE, o sea 3 en todos los
       aparatos, y arrancar de ahí sería heredar el defecto */
    AGUA.niv = Math.min(+lee('aguaRes2', 0) | 0, AGUA_ESC.length - 1);
    AGUA.res = AGUA_ESC[AGUA.niv];
    AGUA.u = { res: gl.getUniformLocation(pr, 'uRes'),
               onda: gl.getUniformLocation(pr, 'uOnda'),
               esc: gl.getUniformLocation(pr, 'uEsc'),
               t: gl.getUniformLocation(pr, 'uT'),
               n: gl.getUniformLocation(pr, 'uN') };
    AGUA.listo = true;
    return true;
  } catch (e) { AGUA.roto = true; return false; }
}

/* ── LA FOTO SE HORNEA AL TAMAÑO DEL LIENZO ──
   Reproduce exactamente lo que el CSS está mostrando: el «cover» centrado más
   la deriva —una escala y un corrimiento que la animación mueve durante
   veinticuatro segundos— leída del propio elemento. Si esto no coincidiera, el
   borde de la franja de onda mostraría un salto contra el fondo de abajo.
   Devuelve lo medido para que se pueda comprobar desde afuera. */
function aguaMapa(){
  if (!AGUA.listo || !FONDO_IMG || !FONDO_IMG.naturalWidth) return null;
  const W = innerWidth, H = innerHeight, r = AGUA.res;
  const iw = FONDO_IMG.naturalWidth, ih = FONDO_IMG.naturalHeight;
  let s = 1, ex = 0, ey = 0;
  try {
    const cs = getComputedStyle(FONDO_EL);
    const m = new DOMMatrixReadOnly(cs.transform);
    if (m.a) { s = m.a; ex = m.e; ey = m.f; }
    /* `scale` es la propiedad individual (el `.hondo` va por ahí): se compone
       POR FUERA del `transform`, así que multiplica también al corrimiento */
    const sc = parseFloat(cs.scale);
    if (sc && sc !== 1){ s *= sc; ex *= sc; ey *= sc; }
  } catch (e) {}
  const cx = W/2, cy = H/2;
  const esc = Math.max(W/iw, H/ih), dw = iw*esc, dh = ih*esc;
  const tlx = (W - dw)/2, tly = (H - dh)/2;
  const c = AGUA.bake, g = AGUA.bctx;
  const bw = AGUA.el.width, bh = AGUA.el.height;
  if (c.width !== bw || c.height !== bh){ c.width = bw; c.height = bh; }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, bw, bh);
  g.scale(r, r);                       /* de píxeles de CSS a los del lienzo */
  g.translate(cx + ex, cy + ey); g.scale(s, s); g.translate(-cx, -cy);
  g.drawImage(FONDO_IMG, tlx, tly, dw, dh);
  const gl = AGUA.gl;
  gl.bindTexture(gl.TEXTURE_2D, AGUA.tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
  return { s: s, ex: ex, ey: ey, esc: esc, res: r, bake: [bw, bh] };
}

/* ── SACAR Y DEVOLVER LA REFRACCIÓN, SIN TOCAR EL BODY ──
   Escribe el filtro plano en línea sobre las piezas refractadas del escritorio
   (o lo borra, y vuelve a mandar la regla `.vid.refr`). El estilo en línea de
   un elemento recalcula ESE elemento; una clase en el `body` recalcula todo. */
function aguaRefr(v){
  const on = !!v;
  if (on === AGUA.sinRefr) return AGUA.sinRefr;
  AGUA.sinRefr = on;
  const els = document.querySelectorAll(AGUA_REFR_SEL);
  for (const el of els){
    el.style.backdropFilter = on ? 'var(--v-filR)' : '';
    el.style.webkitBackdropFilter = on ? 'var(--v-filR)' : '';
  }
  return on;
}

/* al cambiar de fondo se vuelve a hornear; el mapa lo recalcula `aguaMapa` en
   cada encendido, así que alcanza con marcar que hay que rehacerlo */
function aguaRefondo(){
  if (!AGUA.listo) return false;
  if (AGUA.on) aguaMapa();
  return true;
}

function aguaMide(){
  const cv = AGUA.el, W = innerWidth, H = innerHeight;
  const w = Math.max(1, Math.round(W*AGUA.res)), h = Math.max(1, Math.round(H*AGUA.res));
  if (cv.width !== w || cv.height !== h){
    cv.width = w; cv.height = h;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  AGUA.gl.viewport(0, 0, w, h);
  AGUA.gl.uniform2f(AGUA.u.res, w, h);
  AGUA.gl.uniform1f(AGUA.u.esc, AGUA.res);
  return AGUA.res;
}

/* ── EL PRIMER TOQUE NO PUEDE PAGAR EL ARRANQUE ──
   Reporte: «al cambiar de fondo se laguea el click del agua». Era literal, y
   son dos costos que estaban los dos ADENTRO del manejador del dedo:

   1. `aguaArma()` COMPILA el shader la primera vez. En un teléfono eso son
      decenas de milisegundos, y caen justo en el cuadro del toque.
   2. `aguaMapa()` hace el primer `drawImage` de la foto — y `img.onload` NO
      quiere decir «decodificada»: el navegador decodifica perezosamente, al
      dibujarla. O sea que cambiar de fondo y tocar el agua pagaba la
      decodificación entera de la foto nueva en el cuadro del toque. Por eso el
      tirón aparecía JUSTO después de cambiar de fondo y no antes.

   Las dos cosas se pagan en el ocio. `decode()` fuerza la decodificación fuera
   del camino del dedo, y una pasada de horneado deja el shader compilado y la
   textura subida. El lienzo está transparente —borrado— así que precalentar
   no dibuja un solo píxel visible. */
let AGUA_TIBIA = false;
function aguaOcio(fn){
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 2500 });
  else setTimeout(fn, 700);
}
function aguaPrecalienta(){
  if (AGUA.roto || aguaQuieto()) return false;
  if (!FONDO_IMG || !FONDO_IMG.naturalWidth) return false;
  const hacer = () => {
    if (!aguaArma()) return;
    aguaMide(); aguaMapa();
    AGUA_TIBIA = true;
  };
  /* la decodificación primero: `drawImage` sobre una imagen sin decodificar la
     decodifica ahí mismo, que es exactamente lo que se está sacando del medio */
  if (FONDO_IMG.decode) FONDO_IMG.decode().then(hacer, hacer);
  else hacer();
  return true;
}
/* lo llama `fondoInit` y `fondoPone`: el fondo nuevo es una foto nueva, o sea
   una decodificación nueva que hay que pagar antes de que alguien toque */
function aguaRecalienta(){ AGUA_TIBIA = false; aguaOcio(aguaPrecalienta); }

/* ── LO QUE ES «ESPACIO LIBRE» ── */
function aguaLibre(t){
  if (CAJON || aguaTapada() || !t || !t.closest) return false;
  if (t.closest('.ap,#reloj,#buscaCaja,#dock,#puntos,#menu,#asis,#pers,#ini,#velo,#mascota,#carga,#tirador,#wid,#fondos,#carp,#cc,#bienv'))
    return false;
  return true;
}

/* `matchMedia` se pregunta UNA vez y no en cada toque: es una consulta de
   estilo, y acá se dispara sesenta veces por segundo arrastrando el dedo */
function aguaQuieto(){
  if (AGUA.quieto === false || AGUA.quieto === true) return AGUA.quieto;
  try { AGUA.quieto = matchMedia('(prefers-reduced-motion:reduce)').matches; }
  catch (e) { AGUA.quieto = false; }
  return AGUA.quieto;
}

function aguaToca(x, y, fuerza){
  if (AGUA.roto || aguaQuieto()) return false;
  if (!FONDO_OK || !FONDO_IMG || !FONDO_IMG.naturalWidth) return false;
  if (!aguaArma()) return false;
  const ahora = performance.now()/1000;
  if (!AGUA.on){
    AGUA.t0 = ahora;
    /* la deriva se congela mientras dura: la foto horneada lleva la matriz de
       ESTE instante metida adentro */
    FONDO_EL.style.animationPlayState = 'paused';
    /* NADA se le toca al `body`: una clase ahí es un recálculo de estilo del
       documento entero en el cuadro del dedo, y el vidrio ya no hace falta
       apagarlo porque el lienzo pasó por encima */
    AGUA.on = true; AGUA.mide = 0; AGUA.tarde = 0; AGUA.bajo = false; AGUA_ULT = 0;
    aguaMide(); aguaMapa();
    if (AGUA.niv >= 1) aguaRefr(true);
    aguaVigila(true);
    requestAnimationFrame(aguaPaso);
  }
  AGUA.ondas.push({ x: x, y: y, t: ahora, f: fuerza == null ? 1 : fuerza });
  if (AGUA.ondas.length > AGUA_MAX) AGUA.ondas.shift();
  AGUA.ultimo = [x, y];
  return true;
}

/* ── LA RESOLUCIÓN SE AJUSTA A ESTE APARATO, MIDIENDO, Y EN LOS DOS SENTIDOS ──
   Un número fijo no puede estar bien en los dos extremos. Se miran los cuadros
   3 a 10 de la ráfaga —los primeros dos se descartan, que ahí entran el horneado
   de la foto y la primera subida de textura— y:
   · DOS cuadros perdidos bajan un escalón y lo guardan. Uno solo no: un
     tropiezo cualquiera (el recolector, una notificación) no puede dejar el
     agua a un tercio de resolución para siempre.
   · Y una ventana SIN un cuadro perdido sube un escalón y lo guarda, así que el
     aparato no queda clavado abajo por un mal día. Lo único que el bucle puede
     medir es si perdió cuadros, así que ésta es la única forma de volver: el
     ajuste viejo sólo bajaba, y con el umbral roto bajaba siempre. */
function aguaNivel(n){
  AGUA.niv = Math.max(0, Math.min(n, AGUA_ESC.length - 1));
  if (AGUA.on) aguaRefr(AGUA.niv >= 1);
  const r = AGUA_ESC[AGUA.niv];
  if (r !== AGUA.res){ AGUA.res = r; aguaMide(); aguaMapa(); }
}

function aguaAjusta(ms){
  if (AGUA.fijo) return;
  AGUA.mide++;
  /* los dos primeros cuadros llevan la compilación del shader y la primera
     subida de textura: medirlos es concluir que el aparato es lento cuando lo
     único lento fue empezar */
  if (AGUA.mide < 3 || AGUA.mide > 10) return;
  if (ms > AGUA_TARDE) AGUA.tarde++;
  if (AGUA.tarde >= 2){
    AGUA.tarde = 0; AGUA.bajo = true;
    if (AGUA.niv < AGUA_ESC.length - 1){ aguaNivel(AGUA.niv + 1); guarda('aguaRes2', AGUA.niv); }
    return;
  }
  if (AGUA.mide === 10 && !AGUA.bajo && AGUA.tarde === 0 && AGUA.niv > 0){
    aguaNivel(AGUA.niv - 1); guarda('aguaRes2', AGUA.niv);
  }
}

/* ── QUÉ TAPA AL AGUA ──
   Las hojas de pantalla completa. Con una encima, el anillo no se ve NI UN
   PÍXEL — y sin embargo el lienzo sigue repintando a pantalla completa, que es
   lo que obliga a cada `backdrop-filter` de la página a filtrar de nuevo en
   cada cuadro. Y la hoja más cara es justamente el cajón: 367.504 px de
   desenfoque, la pieza más grande del launcher. O sea que «abrir el cajón con
   una gota corriendo detrás» es el peor caso que este launcher puede armar, y
   es exactamente el que reportó el usuario. */
const AGUA_TAPAN = '#cajon.on,#carp.on,#pers.on,#asis.on,#ini.on,#fondos.on,#cam.on,#velo.on,#cc.on,#bienv.on';
function aguaTapada(){ return !!document.querySelector(AGUA_TAPAN); }

/* el corte duro: apaga la ráfaga, borra el lienzo y devuelve el vidrio y la
   deriva. Lo llaman el bucle y el `visibilitychange`; no hay un tercer sitio
   que se pueda olvidar de alguna de las cuatro cosas. */
function aguaCorta(){
  if (!AGUA.on) return false;
  aguaVigila(false);
  AGUA.ondas.length = 0;
  AGUA.on = false;
  aguaRefr(false);
  FONDO_EL.style.animationPlayState = '';
  /* el lienzo queda siempre puesto y transparente: borrarlo es lo que lo apaga.
     Prender y apagar el `display` le costaba al compositor una capa nueva por
     ráfaga, y eso también era un tirón en el cuadro del dedo. */
  if (AGUA.gl) AGUA.gl.clear(AGUA.gl.COLOR_BUFFER_BIT);
  return true;
}

/* ── EL CORTE TIENE QUE CAER EN EL MISMO CUADRO QUE LA HOJA SE ABRE ──
   Reporte: «cuando abro el cajón da tirones por el coso del agua». Con la
   comprobación SÓLO adentro de `aguaPaso`, el corte llegaba un cuadro tarde: la
   hoja arrancaba su transición y recién al cuadro siguiente se sacaba
   `body.agua`, o sea que los once `backdrop-filter` del launcher se volvían a
   armar EN EL MEDIO de la animación de apertura. Ese es el tirón, y no es del
   agua: es de once desenfoques reapareciendo mientras algo se desliza.

   Un `MutationObserver` corre como MICROTAREA —después del código que agregó la
   clase y ANTES de que el navegador calcule estilo y pinte— así que el corte y
   la apertura caen en el mismo cuadro. Y sigue habiendo UN solo sitio que sabe
   qué tapa: el observador se prende con la ráfaga y se apaga con ella, así que
   fuera de esos segundo y medio no cuesta absolutamente nada. */
let AGUA_OBS = null;
function aguaVigila(v){
  if (v){
    if (AGUA_OBS || typeof MutationObserver !== 'function') return;
    AGUA_OBS = new MutationObserver(() => {
      if (AGUA.on && !AGUA.sinCorte && aguaTapada()) aguaCorta();
    });
    AGUA_OBS.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
  } else if (AGUA_OBS){ AGUA_OBS.disconnect(); AGUA_OBS = null; }
}

let AGUA_ULT = 0;
function aguaPaso(){
  if (!AGUA.on) return;
  /* la comprobación va ACÁ y no en los seis sitios que abren una hoja: el que
     tiene que enterarse es el bucle, y repartirlo garantiza que la próxima
     hoja que se agregue quede sin apagar el agua. Cuesta un querySelector por
     cuadro y sólo mientras hay ráfaga viva, o sea a lo sumo segundo y medio. */
  if (!AGUA.sinCorte && (aguaTapada() || document.hidden)){ aguaCorta(); return; }
  const gl = AGUA.gl, ahora = performance.now()/1000;
  const v = AGUA.ondas.filter(o => ahora - o.t <= AGUA_VIDA);
  AGUA.ondas = v;
  if (!v.length){
    AGUA.on = false;
    aguaVigila(false);
    aguaRefr(false);
    FONDO_EL.style.animationPlayState = '';
    gl.clear(gl.COLOR_BUFFER_BIT);
    return;
  }
  const t0 = performance.now();
  const buf = AGUA.onda;
  for (let i = 0; i < v.length; i++){
    buf[i*4] = v[i].x; buf[i*4+1] = v[i].y; buf[i*4+2] = v[i].t; buf[i*4+3] = v[i].f;
  }
  gl.uniform4fv(AGUA.u.onda, buf);
  gl.uniform1i(AGUA.u.n, v.length);
  gl.uniform1f(AGUA.u.t, ahora);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (AGUA_ULT) aguaAjusta(t0 - AGUA_ULT);
  AGUA_ULT = t0;
  requestAnimationFrame(aguaPaso);
}

/* ══════════ EL AGUA ES UN TOQUE, NO UN APRETÓN ══════════
   Reporte: «se laguea al abrir la barra de aplicaciones porque toca el agua y
   se da un tirón». Y era literal: la ráfaga arrancaba en el `pointerdown`, o
   sea que **subir para abrir el cajón empieza SIEMPRE tocando el agua**. Los
   cien milisegundos que el dedo tarda en recorrer los 55 px del gesto son cien
   milisegundos de lienzo a pantalla completa con los once desenfoques apagados,
   y después el cajón se abre encima. La vuelta anterior arregló el INSTANTE en
   que el vidrio vuelve; esto saca el conflicto de raíz.

   Con la ráfaga en el `pointerup` el gesto se puede DESAMBIGUAR primero:
   · si el dedo sube (el cajón) o cruza (la página), la ráfaga no existe;
   · si el dedo se levanta donde se apoyó, es un toque y ahí sí hay onda.

   Y no se pierde nada perceptible: una onda que nace donde uno TOCÓ se ve igual
   naciendo al levantar el dedo, porque lo que se mira es el anillo abriéndose y
   ese anillo dura segundo y medio. La estela sí espera a que el gesto quede
   descartado como gesto, que es lo único honesto que se puede hacer con un dedo
   que todavía no decidió qué está haciendo. */
const AGUA_GESTO = 16;   /* más que esto y hay que esperar a ver qué gesto es */
const AGUA_TOQUE = 12;   /* menos que esto al levantar y fue un toque */

function aguaInit(){
  let vivo = false, cancel = false, x0 = 0, y0 = 0, ux = 0, uy = 0;
  addEventListener('pointerdown', e => {
    vivo = aguaLibre(e.target); cancel = false;
    x0 = ux = e.clientX; y0 = uy = e.clientY;
  }, { capture: true, passive: true });

  addEventListener('pointermove', e => {
    if (!vivo || cancel) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    /* ── LOS DOS GESTOS QUE SE LLEVAN EL DEDO ──
       Subir abre el cajón y cruzar cambia de página: los dos empiezan igual que
       un toque, así que en cuanto el dedo se va para alguno de esos dos lados
       el agua se retira sin haber dibujado un solo píxel. */
    /* ── Y BAJAR TAMBIÉN ES UN GESTO ──
       Desde que bajar abre el centro de control, arrancar el agua con el
       arrastre hacia abajo la ponía justo encima de ese gesto: el mismo tirón
       del reporte, por el otro lado. El agua es un TOQUE, y punto; ya
       encendida, el arrastre le agrega estela. */
    /* ── YA ENCENDIDA, UN ARRASTRE ES ESTELA; APAGADA, ES OTRO GESTO ──
       La ambigüedad es sólo del ARRANQUE: subir abre el cajón, bajar abre el
       centro de control y cruzar cambia de página, y los tres empiezan igual
       que un toque. Con el agua ya prendida no hay nada que desambiguar —el
       dedo ya tocó— así que ahí sí se dibuja. */
    if (!AGUA.on){
      if (Math.abs(dy) > AGUA_GESTO || Math.abs(dx) > AGUA_GESTO) cancel = true;
      return;
    }
    if (Math.hypot(e.clientX - ux, e.clientY - uy) < AGUA_PASO) return;
    ux = e.clientX; uy = e.clientY;
    aguaToca(e.clientX, e.clientY, 0.55);
  }, { capture: true, passive: true });

  addEventListener('pointerup', e => {
    const t = vivo && !cancel;
    vivo = false;
    if (!t) return;
    if (Math.hypot(e.clientX - x0, e.clientY - y0) > AGUA_TOQUE) return;
    aguaToca(e.clientX, e.clientY, 1);
  }, { capture: true, passive: true });

  addEventListener('pointercancel', () => { vivo = false; }, { capture: true, passive: true });

  addEventListener('resize', () => { if (AGUA.on){ aguaMide(); aguaMapa(); } });
  /* una pestaña escondida no dibuja, pero el rAF se puede reanudar con la
     ráfaga a medio morir y con el vidrio todavía apagado */
  addEventListener('visibilitychange', () => { if (document.hidden) aguaCorta(); });
}
