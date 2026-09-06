/* ══════════════════════ EL AGUA ══════════════════════

   Pedido: «al tocar la pantalla en un espacio libre de no app tener efecto de
   agua, algo así como Samsung tenía».

   ── ANILLOS ANALÍTICOS Y NO UNA SIMULACIÓN DE CAMPO ──
   Lo canónico sería un campo de alturas en dos texturas que se van pasando la
   pelota con la ecuación de onda. Eso compra dos cosas —interferencia entre
   ondas y rebote contra los bordes— y cuesta dos destinos de render, texturas
   de coma flotante (que en WebGL1 son una extensión que puede no estar) y
   precisión de ocho bits si no está. Sobre una FOTO de fondo, en un anillo que
   vive segundo y medio, ninguna de las dos cosas se ve. Un puñado de ondas
   sumadas —cada una un seno radial que se abre y se apaga— se lee igual, no
   guarda estado, y no depende de una sola extensión.

   ── Y SÓLO SE DIBUJA MIENTRAS HAY ONDA VIVA ──
   Este launcher tiene el fondo como una foto estática justamente para que el
   compositor la suba a la GPU una vez y no la vuelva a tocar (vuelta 116). Un
   lienzo rellenando la pantalla entera a sesenta cuadros por segundo tiraría
   eso a la basura. El lienzo se enciende con el primer toque y se apaga cuando
   la última onda se murió. */

const AGUA = {
  el: null, gl: null, prog: null, tex: null, buf: null,
  on: false, listo: false, roto: false,
  ondas: [], t0: 0, ultimo: [0, 0], u: {}
};

/* ── LOS NÚMEROS, Y DE DÓNDE SALEN ──
   El frente cruza un teléfono de 412 px de ancho en poco menos de medio
   segundo, que es lo que hace que se lea a golpe en el agua y no a mancha que
   crece. El largo de onda son 70 px: más corto se convierte en moaré contra el
   pixelado de la foto, más largo deja de leerse a onda. */
const AGUA_VEL = 900, AGUA_ANCHO = 58, AGUA_LARGO = 70;
/* ── SEIS ONDAS Y NO OCHO ──
   El lienzo rellena la pantalla entera y cada onda es una vuelta más del bucle
   POR PÍXEL. Medido con render por software —o sea el peor caso imaginable, la
   GPU de un teléfono no se parece a esto—: 6,7 ms con una, 10,2 con cuatro y
   16,2 con ocho. Ocho sólo pasa arrastrando el dedo, y con seis la estela se
   lee igual. */
const AGUA_AMORT = 2.0, AGUA_AMP = 26, AGUA_VIDA = 1.7, AGUA_MAX = 6;
/* cuánto se apaga con la distancia, y cuánta luz agarra la pendiente. Los dos
   salieron de una cuenta y no de tantear: con 0,0055 y 0,085 el desplazamiento
   en la cresta medía 1,3 px y el brillo 4 de 255 — o sea que el anillo se
   estaba dibujando y en la captura no se veía. */
const AGUA_LEJOS = 0.0022, AGUA_LUZ = 0.30;
/* mientras se arrastra el dedo, una onda cada tantos píxeles: la estela */
const AGUA_PASO = 44;

const AGUA_VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

/* El desplazamiento se calcula en PÍXELES de pantalla y recién después se lleva
   a coordenadas de la foto: así el anillo mide lo mismo en cualquier aparato,
   que es lo que no pasaría trabajando en UV. */
const AGUA_FS = `precision mediump float;
uniform sampler2D uTex;
uniform vec2 uRes;          /* el lienzo, en PÍXELES DE APARATO */
uniform float uEsc;         /* cuántos px de aparato mide uno de CSS */
uniform vec2 uA, uB;        /* px de pantalla -> UV de la foto, con el cover y
                               la deriva del fondo ya metidos adentro */
uniform vec4 uOnda[${AGUA_MAX}];   /* x, y, cuándo empezó, fuerza */
uniform float uT;
uniform int uN;
void main(){
  /* ── TODO SE CUENTA EN PÍXELES DE CSS ──
     gl_FragCoord viene en píxeles DE APARATO: en un teléfono de densidad 2 va
     de 0 a 824 mientras el toque llegó en 0..412. Sin dividir, el anillo nace
     en otro sitio y mide la mitad — y en el banco, con densidad 1, eso no se
     ve nunca. */
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uEsc;
  vec2 desp = vec2(0.);
  float pend = 0.;
  for (int i = 0; i < ${AGUA_MAX}; i++){
    if (i >= uN) break;
    vec4 o = uOnda[i];
    float t = uT - o.z;
    if (t < 0.0 || t > ${AGUA_VIDA.toFixed(2)}) continue;
    vec2 d = p - o.xy;
    float r = length(d) + 0.001;
    float x = r - t * ${AGUA_VEL.toFixed(1)};
    /* el sobre: una campana pegada al frente, que se apaga con el tiempo y con
       la distancia — una onda que llega igual de fuerte al otro extremo de la
       pantalla no se lee a agua */
    float env = exp(-abs(x) / ${AGUA_ANCHO.toFixed(1)}) * exp(-t * ${AGUA_AMORT.toFixed(2)})
              * (1.0 / (1.0 + r * ${AGUA_LEJOS})) * o.w;
    float k = 6.2831853 / ${AGUA_LARGO.toFixed(1)};
    desp += (d / r) * sin(x * k) * env;
    pend += cos(x * k) * env;
  }
  vec2 q = p + desp * ${AGUA_AMP.toFixed(1)};
  vec3 c = texture2D(uTex, q * uA + uB).rgb;
  /* ── LA LUZ ES LO QUE HACE QUE SE LEA A RELIEVE ──
     Sin ella el anillo es la foto corrida y se ve como un defecto de vidrio. La
     pendiente de la onda enciende una cara y apaga la otra, que es exactamente
     lo que hace una arruga en el agua bajo el sol. */
  c += vec3(pend) * ${AGUA_LUZ.toFixed(2)};
  gl_FragColor = vec4(c, 1.0);
}`;

function aguaCompila(gl, tipo, src){
  const s = gl.createShader(tipo);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

/* ── SE ARMA CON EL PRIMER TOQUE, NO AL ARRANCAR ──
   Un segundo contexto de WebGL, su programa y la subida de la foto son trabajo
   que un launcher no tiene por qué pagar antes de que alguien toque el fondo. */
function aguaArma(){
  if (AGUA.listo || AGUA.roto) return AGUA.listo;
  try {
    const cv = document.createElement('canvas');
    cv.id = 'agua';
    FONDO_EL.parentNode.insertBefore(cv, FONDO_EL.nextSibling);
    const gl = cv.getContext('webgl', { alpha: false, antialias: false,
                                        depth: false, stencil: false,
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, FONDO_IMG);
    gl.uniform1i(gl.getUniformLocation(pr, 'uTex'), 0);

    AGUA.el = cv; AGUA.gl = gl; AGUA.prog = pr; AGUA.tex = tx; AGUA.buf = b;
    AGUA.u = { res: gl.getUniformLocation(pr, 'uRes'),
               a: gl.getUniformLocation(pr, 'uA'),
               b: gl.getUniformLocation(pr, 'uB'),
               onda: gl.getUniformLocation(pr, 'uOnda'),
               esc: gl.getUniformLocation(pr, 'uEsc'),
               t: gl.getUniformLocation(pr, 'uT'),
               n: gl.getUniformLocation(pr, 'uN') };
    AGUA.listo = true;
    return true;
  } catch (e) { AGUA.roto = true; return false; }
}

/* ── EL MAPA DE PANTALLA A FOTO SE MIDE, NO SE SUPONE ──
   La foto entra con `background-size:cover` y encima el elemento lleva la
   deriva —una escala y un corrimiento que la animación de CSS mueve durante
   veinticuatro segundos—. Calculando el cover a mano y olvidándose de la
   deriva, el lienzo dibuja la misma foto CORRIDA respecto de la de abajo y el
   momento de encenderlo se ve como un salto. La matriz se lee del propio
   elemento. */
function aguaMapa(){
  const W = innerWidth, H = innerHeight;
  const iw = FONDO_IMG.naturalWidth, ih = FONDO_IMG.naturalHeight;
  let s = 1, ex = 0, ey = 0;
  try {
    const m = new DOMMatrixReadOnly(getComputedStyle(FONDO_EL).transform);
    if (m.a) { s = m.a; ex = m.e; ey = m.f; }
  } catch (e) {}
  const cx = W/2, cy = H/2;
  /* cover, centrado */
  const esc = Math.max(W/iw, H/ih), dw = iw*esc, dh = ih*esc;
  const tlx = (W - dw)/2, tly = (H - dh)/2;
  /* pantalla -> elemento -> uv, todo junto en una escala y un corrimiento */
  /* pantalla = C + s*(elemento - C) + E  ⇒  elemento = (pantalla - C - E)/s + C,
     y de ahí a UV con el cover. Queda una escala y un corrimiento por eje. */
  const ax = 1/(s*dw), ay = 1/(s*dh);
  const bx = (cx - (cx + ex)/s - tlx)/dw;
  const by = (cy - (cy + ey)/s - tly)/dh;
  AGUA.gl.uniform2f(AGUA.u.a, ax, ay);
  AGUA.gl.uniform2f(AGUA.u.b, bx, by);
  return { s: s, ex: ex, ey: ey, esc: esc, ax: ax, bx: bx, by: by };
}

function aguaMide(){
  const cv = AGUA.el, W = innerWidth, H = innerHeight;
  /* el lienzo va a resolución del aparato topada: lo que se dibuja acá es una
     foto desenfocada por el propio desplazamiento, así que rellenar más píxeles
     no compra un solo detalle */
  const r = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(W*r), h = Math.round(H*r);
  if (cv.width !== w || cv.height !== h){
    cv.width = w; cv.height = h;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  AGUA.gl.viewport(0, 0, w, h);
  AGUA.gl.uniform2f(AGUA.u.res, w, h);
  AGUA.gl.uniform1f(AGUA.u.esc, r);
  return r;
}

/* ── LO QUE ES «ESPACIO LIBRE» ──
   Todo lo que no sea una app, el widget, la búsqueda, el dock o una hoja
   abierta. Con el cajón abierto no hay fondo que ondular. */
function aguaLibre(t){
  if (CAJON || !t || !t.closest) return false;
  if (t.closest('.ap,#reloj,#buscaCaja,#dock,#puntos,#menu,#asis,#pers,#ini,#velo,#mascota,#carga,#tirador'))
    return false;
  return true;
}

function aguaToca(x, y, fuerza){
  if (AGUA.roto) return false;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return false;
  if (!FONDO_OK || !FONDO_IMG || !FONDO_IMG.naturalWidth) return false;
  if (!aguaArma()) return false;
  const ahora = performance.now()/1000;
  if (!AGUA.on){
    AGUA.t0 = ahora;
    /* la deriva se congela mientras dura: el lienzo lleva la matriz de ESTE
       instante metida adentro, y con la animación corriendo la foto de abajo se
       iría separando de la de arriba. Veinticuatro segundos de vuelta, uno y
       medio de pausa: no se ve. */
    FONDO_EL.style.animationPlayState = 'paused';
    AGUA.el.classList.add('on');
    AGUA.on = true;
    aguaMide();
    aguaMapa();
    requestAnimationFrame(aguaPaso);
  }
  AGUA.ondas.push({ x: x, y: y, t: ahora, f: fuerza == null ? 1 : fuerza });
  if (AGUA.ondas.length > AGUA_MAX) AGUA.ondas.shift();
  AGUA.ultimo = [x, y];
  return true;
}

function aguaPaso(){
  if (!AGUA.on) return;
  const gl = AGUA.gl, ahora = performance.now()/1000;
  const v = AGUA.ondas.filter(o => ahora - o.t <= AGUA_VIDA);
  AGUA.ondas = v;
  if (!v.length){
    AGUA.on = false;
    AGUA.el.classList.remove('on');
    FONDO_EL.style.animationPlayState = '';
    return;
  }
  const buf = new Float32Array(AGUA_MAX*4);
  for (let i = 0; i < v.length; i++){
    buf[i*4] = v[i].x; buf[i*4+1] = v[i].y; buf[i*4+2] = v[i].t; buf[i*4+3] = v[i].f;
  }
  gl.uniform4fv(AGUA.u.onda, buf);
  gl.uniform1i(AGUA.u.n, v.length);
  gl.uniform1f(AGUA.u.t, ahora);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
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
     Samsung dejaba un rastro al arrastrar, y es lo que separa «un efecto que se
     dispara» de «agua». Una onda cada 44 px y más flojita: con una por evento
     de puntero serían sesenta por segundo y se empastan. */
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
}
