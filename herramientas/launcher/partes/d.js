/* ══════════════════════ EL VIDRIO ══════════════════════
   ── QUÉ SEPARA «VIDRIO ESMERILADO» DE «LIQUID GLASS» ──
   Un `backdrop-filter: blur()` da vidrio esmerilado: lo de atrás se ve borroso y
   nada más. Lo que hace que se lea a vidrio GRUESO es que el canto REFRACTA — lo
   que hay detrás se corre y se comprime cerca del borde, porque ahí la
   superficie está curvada y el rayo se dobla.

   Eso en la web se hace con un `feDisplacementMap`: una imagen cuyo canal rojo
   dice cuánto correr cada píxel en x y el verde cuánto en y. El mapa se calcula
   de la geometría de la propia pieza —la distancia con signo a un rectángulo
   redondeado— así que la banda de refracción sigue la esquina redondeada exacta
   en vez de ser un marco recto.

   ── Y SE GENERA UNO POR PIEZA, NO UNO SOLO ──
   `feImage` estira el mapa al tamaño del elemento. Con un mapa compartido, el
   dock —ancho y bajo— tendría el canto de arriba con una banda tres veces más
   gruesa que la de los lados. Cada pieza tiene el suyo, a su tamaño y con su
   radio, y se rehace cuando cambia de tamaño. */

const REFR_SOP = (function(){
  try { return CSS.supports('backdrop-filter', 'url(#x)')
             || CSS.supports('-webkit-backdrop-filter', 'url(#x)'); }
  catch (e){ return false; }
})();

/* cuánto entra la refracción desde el canto, y cuánto se desvía */
const REFR_BANDA = 17, REFR_ESC = 46, REFR_MAXLADO = 640;

function mapaRefraccion(w, h, radio, banda){
  /* el mapa se calcula a media resolución: es un campo suave sin un solo borde
     nítido, y a la mitad de lado cuesta la cuarta parte */
  const e = Math.min(1, REFR_MAXLADO/Math.max(w, h), .5);
  const W = Math.max(8, Math.round(w*e)), H = Math.max(8, Math.round(h*e));
  const r = radio*e, b = Math.max(2, banda*e);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const im = x.createImageData(W, H), D = im.data;
  const bx = W/2, by = H/2;
  for (let j = 0; j < H; j++){
    for (let i = 0; i < W; i++){
      /* distancia con signo a un rectángulo redondeado, y su gradiente, que es
         la normal de la superficie en ese punto */
      const px = i + .5 - bx, py = j + .5 - by;
      const qx = Math.abs(px) - (bx - r), qy = Math.abs(py) - (by - r);
      const mx = Math.max(qx, 0), my = Math.max(qy, 0);
      const L = Math.hypot(mx, my);
      const d = L + Math.min(Math.max(qx, qy), 0) - r;   /* < 0 adentro */
      let nx = 0, ny = 0;
      if (L > 1e-6){ nx = mx/L*Math.sign(px); ny = my/L*Math.sign(py); }
      else if (qx > qy){ nx = Math.sign(px); }
      else { ny = Math.sign(py); }
      /* ── EL PERFIL SE CONCENTRA EN EL CANTO ──
         Con una rampa lineal el vidrio se ve como si TODO estuviera curvado y la
         imagen de atrás queda deformada de punta a punta. Elevado a 2,6, el
         centro queda plano —que es como se ve un vidrio de verdad— y la
         distorsión aparece sólo en el último milímetro. */
      const t = cl(1 + d/b, 0, 1);
      const k = Math.pow(t, 2.6);
      const R = Math.round(cl(.5 + nx*k*.5, 0, 1)*255);
      const G = Math.round(cl(.5 + ny*k*.5, 0, 1)*255);
      const o = (j*W + i)*4;
      D[o] = R; D[o+1] = G; D[o+2] = 128; D[o+3] = 255;
    }
  }
  x.putImageData(im, 0, 0);
  return c.toDataURL('image/png');
}

let REFR_N = 0;
const REFR_OBS = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver(es => { for (const q of es) refrActualiza(q.target); }) : null;

function refrActualiza(el){
  const r = el.getBoundingClientRect();
  const w = Math.round(r.width), h = Math.round(r.height);
  if (w < 8 || h < 8) return;
  if (el.__rw === w && el.__rh === h) return;
  el.__rw = w; el.__rh = h;
  const radio = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 20;
  const src = mapaRefraccion(w, h, Math.min(radio, Math.min(w, h)/2 - 1), REFR_BANDA);
  const img = document.getElementById(el.__rid + 'i');
  const dsp = document.getElementById(el.__rid + 'd');
  if (img) img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', src);
  if (img) img.setAttribute('href', src);
  /* el desvío se acota a lo que la pieza mide: en el dock, 23 px de
     desplazamiento sobre 56 de alto darían un espejo y no un canto */
  if (dsp) dsp.setAttribute('scale', String(Math.min(REFR_ESC, Math.min(w, h)*0.42)));
}

function vidrioInit(){
  const defs = document.querySelector('#svgdefs defs');
  const piezas = $$('.refr');
  if (!REFR_SOP || !defs){
    /* degradación honesta: sin refracción quedan el desenfoque, la saturación,
       el borde en degradado y el especular, que ya es el 80 % del efecto */
    for (const el of piezas) el.classList.remove('refr');
    return false;
  }
  for (const el of piezas){
    const id = 'rf' + (++REFR_N);
    el.__rid = id;
    const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    f.setAttribute('id', id);
    f.setAttribute('x', '0%'); f.setAttribute('y', '0%');
    f.setAttribute('width', '100%'); f.setAttribute('height', '100%');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const im = document.createElementNS('http://www.w3.org/2000/svg', 'feImage');
    im.setAttribute('id', id + 'i');
    im.setAttribute('result', 'm');
    im.setAttribute('preserveAspectRatio', 'none');
    const dm = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    dm.setAttribute('id', id + 'd');
    dm.setAttribute('in', 'SourceGraphic'); dm.setAttribute('in2', 'm');
    dm.setAttribute('scale', String(REFR_ESC));
    dm.setAttribute('xChannelSelector', 'R'); dm.setAttribute('yChannelSelector', 'G');
    f.appendChild(im); f.appendChild(dm); defs.appendChild(f);
    /* ── LA CALIBRACIÓN SE LEE, NO SE ESCRIBE ACÁ ──
       Estaba clavada en esta línea, y como es un estilo en línea le ganaba a la
       regla `.vid.refr`: la recalibración de la vuelta anterior no llegó nunca
       a las cuatro piezas grandes, que son justamente todas las que importan.
       Sale de `--v-filR`, que es de donde la lee el CSS. */
    const cal = getComputedStyle(document.documentElement)
                  .getPropertyValue('--v-filR').trim() || 'blur(19px)';
    const b = 'url(#' + id + ') ' + cal;
    el.style.backdropFilter = b; el.style.webkitBackdropFilter = b;
    refrActualiza(el);
    if (REFR_OBS) REFR_OBS.observe(el);
  }
  /* el filtro de plantilla del HTML ya no lo usa nadie */
  const viejo = document.getElementById('refr');
  if (viejo && viejo.parentNode) viejo.parentNode.removeChild(viejo);
  return true;
}
