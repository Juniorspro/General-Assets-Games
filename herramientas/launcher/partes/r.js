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

const AGUA = {
  el: null, gl: null, prog: null, tex: null, buf: null,
  bake: null, bctx: null, onda: null,
  on: false, listo: false, roto: false, quieto: false,
  res: 0, niv: 0, fijo: false, mide: 0, t0: 0, ondas: [], ultimo: [0, 0], u: {}
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
/* 8,3 ms es un cuadro de 120 Hz; se deja un pelo de aire porque el compositor
   también tiene que hacer lo suyo */
const AGUA_PRESU = 7.0;
/* ── LA ESCALERA DE CALIDAD, Y POR QUÉ NO ES SÓLO RESOLUCIÓN ──
   Medido con el lienzo ya achicado once veces: 47,6 ms por cuadro con el vidrio
   puesto y 20,8 sin él. El shader no era el problema. Lo que cuesta es que un
   lienzo que repinta la pantalla entera obliga al compositor a rehacer el
   `backdrop-filter` de cada pieza de vidrio en cada cuadro, y eso no baja
   achicando el lienzo — baja sacando pasadas.
   Cada escalón saca la que menos se ve, y sólo MIENTRAS la ráfaga dura. */
const AGUA_NIV = ['', 'aguaN1', 'aguaN2', 'aguaN3'];

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
    AGUA.niv = Math.min(+lee('aguaNiv', 0) | 0, AGUA_NIV.length - 1);
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
    const m = new DOMMatrixReadOnly(getComputedStyle(FONDO_EL).transform);
    if (m.a) { s = m.a; ex = m.e; ey = m.f; }
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

/* ── LO QUE ES «ESPACIO LIBRE» ── */
function aguaLibre(t){
  if (CAJON || aguaTapada() || !t || !t.closest) return false;
  if (t.closest('.ap,#reloj,#buscaCaja,#dock,#puntos,#menu,#asis,#pers,#ini,#velo,#mascota,#carga,#tirador,#wid,#fondos,#carp'))
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
    AGUA.el.classList.add('on');
    document.body.classList.add('agua');
    if (AGUA_NIV[AGUA.niv]) document.body.classList.add(AGUA_NIV[AGUA.niv]);
    AGUA.on = true; AGUA.mide = 0; AGUA_ULT = 0;
    aguaMide(); aguaMapa();
    requestAnimationFrame(aguaPaso);
  }
  AGUA.ondas.push({ x: x, y: y, t: ahora, f: fuerza == null ? 1 : fuerza });
  if (AGUA.ondas.length > AGUA_MAX) AGUA.ondas.shift();
  AGUA.ultimo = [x, y];
  return true;
}

/* ── LA RESOLUCIÓN SE AJUSTA A ESTE APARATO, MIDIENDO ──
   Un número fijo no puede estar bien en los dos extremos. Se miran los primeros
   cuadros de la ráfaga —los primeros dos se descartan, que ahí entran la
   compilación del shader y la primera subida de textura— y si el promedio se
   pasa del presupuesto se baja un escalón y se guarda. */
function aguaNivel(n){
  AGUA.niv = Math.max(0, Math.min(n, AGUA_NIV.length - 1));
  const c = document.body.classList;
  for (const k of AGUA_NIV) if (k) c.remove(k);
  if (AGUA_NIV[AGUA.niv]) c.add(AGUA_NIV[AGUA.niv]);
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
  if (ms <= AGUA_PRESU) return;
  if (AGUA.niv >= AGUA_NIV.length - 1) return;
  aguaNivel(AGUA.niv + 1);
  guarda('aguaNiv', AGUA.niv);
}

/* ── QUÉ TAPA AL AGUA ──
   Las hojas de pantalla completa. Con una encima, el anillo no se ve NI UN
   PÍXEL — y sin embargo el lienzo sigue repintando a pantalla completa, que es
   lo que obliga a cada `backdrop-filter` de la página a filtrar de nuevo en
   cada cuadro. Y la hoja más cara es justamente el cajón: 367.504 px de
   desenfoque, la pieza más grande del launcher. O sea que «abrir el cajón con
   una gota corriendo detrás» es el peor caso que este launcher puede armar, y
   es exactamente el que reportó el usuario. */
const AGUA_TAPAN = '#cajon.on,#carp.on,#pers.on,#asis.on,#ini.on,#fondos.on,#cam.on,#velo.on';
function aguaTapada(){ return !!document.querySelector(AGUA_TAPAN); }

/* el corte duro: apaga la ráfaga, borra el lienzo y devuelve el vidrio y la
   deriva. Lo llaman el bucle y el `visibilitychange`; no hay un tercer sitio
   que se pueda olvidar de alguna de las cuatro cosas. */
function aguaCorta(){
  if (!AGUA.on) return false;
  AGUA.ondas.length = 0;
  AGUA.on = false;
  AGUA.el.classList.remove('on');
  document.body.classList.remove('agua');
  for (const k of AGUA_NIV) if (k) document.body.classList.remove(k);
  FONDO_EL.style.animationPlayState = '';
  if (AGUA.gl) AGUA.gl.clear(AGUA.gl.COLOR_BUFFER_BIT);
  return true;
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
    AGUA.el.classList.remove('on');
    /* el vidrio vuelve entero: la escalera de calidad vale sólo mientras el
       lienzo está repintando */
    document.body.classList.remove('agua');
    for (const k of AGUA_NIV) if (k) document.body.classList.remove(k);
    FONDO_EL.style.animationPlayState = '';
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

function aguaInit(){
  let apretado = false, ux = 0, uy = 0;
  addEventListener('pointerdown', e => {
    if (!aguaLibre(e.target)) return;
    apretado = true; ux = e.clientX; uy = e.clientY;
    aguaToca(e.clientX, e.clientY, 1);
  }, { capture: true, passive: true });
  /* ── LA ESTELA ──
     Una onda cada 44 px y más flojita: con una por evento de puntero serían
     sesenta por segundo y se empastan. */
  addEventListener('pointermove', e => {
    if (!apretado || !AGUA.on) return;
    if (Math.hypot(e.clientX - ux, e.clientY - uy) < AGUA_PASO) return;
    ux = e.clientX; uy = e.clientY;
    aguaToca(e.clientX, e.clientY, 0.55);
  }, { capture: true, passive: true });
  const suelta = () => { apretado = false; };
  addEventListener('pointerup', suelta, { capture: true, passive: true });
  addEventListener('pointercancel', suelta, { capture: true, passive: true });
  addEventListener('resize', () => { if (AGUA.on){ aguaMide(); aguaMapa(); } });
  /* una pestaña escondida no dibuja, pero el rAF se puede reanudar con la
     ráfaga a medio morir y con el vidrio todavía apagado */
  addEventListener('visibilitychange', () => { if (document.hidden) aguaCorta(); });
}
