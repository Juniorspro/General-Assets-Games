/* ══════════════════════ ARRASTRAR, SOLTAR Y CARPETAS ══════════════════════

   ── UN SOLO GESTO PARA TODO ──
   Mantener apretado sobre un icono lo LEVANTA, venga de donde venga: del cajón,
   del escritorio o del dock. Lo que cambia según de dónde salga es qué pasa al
   soltarlo, no cómo se agarra. Y si se suelta sin haberlo movido, sale el menú
   de la app — que es exactamente lo que hace cualquier escritorio de Android y
   lo que evita tener dos gestos casi iguales para dos cosas distintas.

   ── EL ESCRITORIO DEJA DE SER UNA LISTA DE PAQUETES ──
   `INICIO` guarda o un paquete (una cadena) o una CARPETA, `{c:[paquetes], n}`.
   Lo viejo guardado sigue siendo válido por construcción: eran todas cadenas.
   El dock acepta las dos cosas por lo mismo. */

let ARR = null;          /* lo que se está arrastrando, o null */
let ARR_PAG = 0;         /* el reloj del cambio de página por borde */

const ARR_LARGO = 400;   /* cuánto hay que mantener para levantar */
const ARR_MUEVE = 12;    /* cuánto hay que correr el dedo para que sea arrastre */
const ARR_CARPETA = 0.42;/* qué parte de una celda cuenta como «encima de ese icono» */

/* ── QUÉ ES UN ITEM ──
   Una cadena es un paquete; un objeto con `c` es una carpeta. Estas cuatro
   funciones son lo único que sabe la diferencia, así que el resto del launcher
   no tiene ifs desparramados. */
function esCarpeta(x){ return !!x && typeof x === 'object' && Array.isArray(x.c); }
function itemPkg(x){ return esCarpeta(x) ? null : x; }
function itemNombre(x){
  if (!esCarpeta(x)) { const a = POR_PKG[x]; return a ? a.n : x; }
  return x.n || T('cCarpeta');
}
function itemApps(x){ return esCarpeta(x) ? x.c.map(p => POR_PKG[p]).filter(Boolean) : []; }

/* ── LA BALDOSA DE UNA CARPETA ──
   Los cuatro primeros iconos en miniatura sobre el mismo vidrio que todo lo
   demás. Con un dibujo genérico de carpeta no se sabría qué hay adentro sin
   abrirla, que es justamente lo que una carpeta tiene que evitar. */
function nodoCarpeta(x, i){
  const d = document.createElement('div');
  d.className = 'ap carp'; d.dataset.i = i;
  const b = document.createElement('div');
  b.className = 'baldosa cBald';
  for (const a of itemApps(x).slice(0, 4)){
    const m = document.createElement('div');
    m.className = 'cMini';
    if (HAY_AND){
      const im = document.createElement('img');
      im.src = iconoUrl(a.p); im.alt = ''; im.draggable = false;
      im.onerror = () => { m.style.background = colorDe(a.p); };
      m.appendChild(im);
    } else m.style.background = colorDe(a.p);
    b.appendChild(m);
  }
  d.appendChild(b);
  const n = document.createElement('div');
  n.className = 'nom'; n.textContent = itemNombre(x);
  d.appendChild(n);
  return d;
}

/* ══════════ LEVANTAR ══════════ */

/* ── EL FANTASMA SE MIDE UNA VEZ ──
   `getBoundingClientRect` obliga al navegador a recalcular la maquetación antes
   de contestar. Estaba dentro del `pointermove`, o sea que arrastrar el dedo
   vaciaba la maquetación ciento veinte veces por segundo para averiguar un
   ancho que no cambia. Se mide al levantar y se guarda. */
function arrFantasma(el, x, y){
  const g = el.cloneNode(true);
  g.className = 'ap fantasma';
  const r = el.getBoundingClientRect();
  g.style.width = r.width + 'px';
  g.__w = r.width; g.__h = r.height;
  g.style.transform = 'translate3d(' + (x - r.width/2) + 'px,' + (y - r.height/2) + 'px,0)';
  document.body.appendChild(g);
  /* un cuadro después entra la clase que lo agranda: puesta en el mismo, la
     transición no tiene de dónde partir y el fantasma aparece ya crecido */
  requestAnimationFrame(() => g.classList.add('vivo'));
  return g;
}

function arrLevanta(orig, desde, i, x, y){
  if (ARR) return;
  vibra(20);
  const el = orig;
  arrRejaMide();
  ARR = { desde: desde, i: i, el: el, x: x, y: y, sobre: null, movio: false,
          g: arrFantasma(el, x, y) };
  el.classList.add('llevada');
  document.body.classList.add('arrastrando');
  rejaArma();
  /* ── DEL CAJÓN SE SALE SOLO, Y CON TRANSICIÓN ──
     Pedido textual: «al mantener en el cajón de aplicaciones se mueva
     automáticamente a la pantalla principal con transición». El cajón se cierra
     y lo que queda en la mano es el fantasma, que ya está siguiendo al dedo:
     así el viaje se ve en vez de ser un salto. */
  if (desde === 'cajon') setTimeout(() => { if (ARR) verCajon(false); }, 90);
}

/* ══════════ DÓNDE CAERÍA ══════════ */

/* la celda del escritorio bajo el dedo, o null si el dedo no está sobre la reja */
/* ── LA REJA SE MIDE AL LEVANTAR Y NO EN CADA MOVIMIENTO ──
   Es el mismo motivo que el fantasma: la página no cambia de sitio mientras
   dura el arrastre, así que preguntarle su rectángulo por cuadro es vaciar la
   maquetación para recibir siempre lo mismo. */
let ARR_REJA = null;
/* ── LA CELDA SE MIDE, NO SE DEDUCE DE LAS CONSTANTES ──
   Estaba escrita como `r.width/COLS` y `ALTO_AP`, y las dos cosas están mal por
   la misma razón: `r` es el rectángulo de la página CON su relleno (10 px
   arriba y 8 a los costados) y las filas llevan además 6 px de hueco, así que
   la fila de verdad mide `ALTO_AP + 6` y no `ALTO_AP`. Con cuatro filas eso son
   veinticuatro píxeles de error acumulado: soltar en la última fila caía en la
   anteponúltima.
   No se notaba porque no había nada dibujado que dijera dónde iba a caer. Con
   la cuadrícula puesta se ve de una — y ése es justamente el argumento para que
   la cuadrícula y el destino salgan de ESTA función y de ninguna otra: si
   fueran dos cuentas, la cuadrícula prometería un sitio y el icono caería en
   otro, que es peor que no dibujar nada. */
function arrRejaMide(){
  const pg = $$('#tira .pag')[PAG];
  if (!pg){ ARR_REJA = null; return null; }
  const r = pg.getBoundingClientRect();
  const cs = getComputedStyle(pg);
  const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
  const pt = parseFloat(cs.paddingTop) || 0;
  const gy = parseFloat(cs.rowGap) || 0;
  /* y si hay dos filas a la vista, el paso real lo dicen ellas: el alto de una
     `.ap` sale de su contenido —icono, hueco y nombre— y no de una constante */
  let ch = ALTO_AP + gy;
  const hijos = pg.children;
  if (hijos.length > COLS){
    const d = hijos[COLS].offsetTop - hijos[0].offsetTop;
    if (d > 8) ch = d;
  } else if (hijos.length){
    const h = hijos[0].offsetHeight;
    if (h > 8) ch = h + gy;
  }
  ARR_REJA = { pg: pg, x0: r.left + pl, y0: r.top + pt,
               cw: (r.width - pl - pr)/COLS, ch: ch,
               ancho: r.width - pl - pr, alto: ch*FILAS,
               r: r };
  return ARR_REJA;
}

function arrCelda(x, y){
  const q = ARR_REJA || arrRejaMide();
  if (!q) return null;
  const r = q.r;
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  const c = cl(Math.floor((x - q.x0)/q.cw), 0, COLS - 1);
  const f = cl(Math.floor((y - q.y0)/q.ch), 0, FILAS - 1);
  return { col: c, fila: f, i: PAG*COLS*FILAS + f*COLS + c,
           cx: q.x0 + (c + 0.5)*q.cw, cy: q.y0 + (f + 0.5)*q.ch,
           cw: q.cw, ch: q.ch,
           x: q.x0 + c*q.cw, y: q.y0 + f*q.ch };
}

/* ══════════ LA CUADRÍCULA ══════════
   Pedido: «cuando muevo una app deben aparecer las cuadrículas para ubicarlas».
   Una casilla por celda, armadas UNA vez al levantar y borradas al soltar —no
   por cuadro—, con las medidas que devuelve `arrRejaMide`. La que queda debajo
   del dedo se enciende: sin eso la cuadrícula dice dónde ESTÁN las celdas pero
   no en cuál va a caer, que es la mitad de la pregunta. */
let REJA_EL = null, REJA_AQUI = -1;

function rejaArma(){
  rejaBorra();
  const q = ARR_REJA || arrRejaMide();
  const hoja = $('#hoja');
  if (!q || !hoja) return;
  const hr = hoja.getBoundingClientRect();
  const d = document.createElement('div');
  d.id = 'reja';
  for (let f = 0; f < FILAS; f++){
    for (let c = 0; c < COLS; c++){
      const i = document.createElement('i');
      /* posicionadas contra `#hoja`, que es el padre con `position:relative`;
         `arrCelda` devuelve coordenadas de ventana, así que hay que restarle */
      i.style.left   = (q.x0 + c*q.cw - hr.left + 3) + 'px';
      i.style.top    = (q.y0 + f*q.ch - hr.top  + 2) + 'px';
      i.style.width  = (q.cw - 6) + 'px';
      i.style.height = (q.ch - 4) + 'px';
      i.dataset.i = PAG*COLS*FILAS + f*COLS + c;
      d.appendChild(i);
    }
  }
  hoja.appendChild(d);
  REJA_EL = d; REJA_AQUI = -1;
  /* un cuadro después entra la clase que la funde: puesta en el mismo, la
     transición no tiene de dónde partir y la cuadrícula aparece de golpe */
  requestAnimationFrame(() => { if (REJA_EL) REJA_EL.classList.add('on'); });
}

function rejaMarca(i){
  if (!REJA_EL || i === REJA_AQUI) return;
  REJA_AQUI = i;
  const k = i - PAG*COLS*FILAS;
  for (let n = 0; n < REJA_EL.children.length; n++)
    REJA_EL.children[n].classList.toggle('aqui', n === k);
}

function rejaBorra(){
  if (REJA_EL){ REJA_EL.remove(); REJA_EL = null; }
  REJA_AQUI = -1;
}

/* si el dedo está lo bastante encima de un icono que YA está ahí, soltarlo hace
   carpeta en vez de acomodar. El radio es una fracción de la celda y no un
   número de píxeles: con iconos de 40 y de 92 tiene que sentirse igual.
   ── `salvo` NO ES UN LUJO ──
   Antes esto leía `ARR` para no hacer carpeta consigo mismo, y en `arrSuelta`
   `ARR` ya vale null: la guarda no corría nunca. Va como parámetro, que además
   es lo que permite preguntarlo ANTES de sacar el icono de la lista. */
function arrEncima(x, y, salvo){
  const c = arrCelda(x, y);
  if (!c) return null;
  if (c.i >= INICIO.length) return null;
  if (salvo != null && c.i === salvo) return null;
  const d = Math.hypot(x - c.cx, y - c.cy);
  return d < Math.min(c.cw, c.ch)*ARR_CARPETA ? c.i : null;
}

function arrEnDock(x, y){
  const d = $('#dock'); if (!d || !d.children.length) return -1;
  const r = d.getBoundingClientRect();
  if (y < r.top - 8 || x < r.left || x > r.right) return -1;
  const n = Math.max(1, d.children.length);
  return cl(Math.floor((x - r.left)/(r.width/n)), 0, n);
}

/* ══════════ SOLTAR ══════════ */

function arrSuelta(x, y){
  if (!ARR) return;
  const a = ARR;
  ARR = null;
  rejaBorra(); ARR_REJA = null;
  document.body.classList.remove('arrastrando');
  if (a.g) a.g.remove();
  a.el.classList.remove('llevada');
  arrPintaCero();

  if (!a.movio){ arrCancela(a); return; }

  /* ── DÓNDE CAE SE DECIDE ANTES DE SACARLO, Y ÉSE ERA EL DEFECTO ──
     Reporte: «al querer hacer carpetas se buguea». Estaba escrito al revés: se
     sacaba el icono de `INICIO` y RECIÉN DESPUÉS se preguntaba sobre cuál se
     había soltado. Sacar el elemento `i` corre un lugar a TODOS los de más
     adelante, así que arrastrar el segundo icono encima del quinto hacía
     carpeta con el que era el SEXTO, y soltarlo encima del último no hacía
     carpeta ninguna —`c.i >= INICIO.length` con la lista ya un elemento más
     corta—. Se mira primero y se saca después. */
  const dk = arrEnDock(x, y);
  const enc = dk >= 0 ? null
            : arrEncima(x, y, a.desde === 'inicio' ? a.i : null);

  let item = null;
  if (a.desde === 'inicio') item = INICIO.splice(a.i, 1)[0];
  else if (a.desde === 'dock') item = DOCK.splice(a.i, 1)[0];
  else item = a.i;                                   /* del cajón: es un paquete */
  if (item == null) return;
  /* y el destino se corrige por el hueco que acaba de dejar: sacar el 2 deja al
     que era 5 en el lugar 4 */
  const j = (enc == null) ? null
          : (a.desde === 'inicio' && enc > a.i ? enc - 1 : enc);

  if (dk >= 0){
    /* el dock tiene cuatro sitios: el quinto sale al escritorio, que es mejor
       que perderlo sin decir nada */
    if (DOCK.length >= 4){ INICIO.push(item); avisa(T('cDockLleno')); }
    else DOCK.splice(Math.min(dk, DOCK.length), 0, item);
  } else if (j != null && !esCarpeta(item)){
    arrHaceCarpeta(j, item);
  } else {
    const c = arrCelda(x, y);
    const dest = c ? Math.min(c.i, INICIO.length) : INICIO.length;
    INICIO.splice(dest, 0, item);
  }
  guarda('inicio', INICIO); guarda('dock', DOCK);
  pintaInicio(); pintaDock();
  salpica(x, y);
  /* la carpeta recién hecha late una vez: sin eso, dos iconos que se funden en
     uno se lee a que uno de los dos se perdió */
  if (j != null && !esCarpeta(item)) arrLate(j);
}

function arrCancela(a){
  /* nada se movió: mantener y soltar en el sitio es pedir el menú */
  const p = a.desde === 'cajon' ? a.i
          : itemPkg(a.desde === 'dock' ? DOCK[a.i] : INICIO[a.i]);
  if (p) abreMenu(p, a.y);
  else if (a.desde === 'inicio' && esCarpeta(INICIO[a.i])) carpAbre(a.i, 'inicio', a.el);
}

/* ── HACER UNA CARPETA ──
   Soltar una app encima de otra: las dos se van adentro de una carpeta nueva
   con el nombre de la que estaba. Soltarla encima de una carpeta la mete. */
/* el icono `j` del escritorio, si está a la vista */
function arrNodo(j){
  const pg = $$('#tira .pag')[Math.floor(j/(COLS*FILAS))];
  return pg ? pg.children[j - Math.floor(j/(COLS*FILAS))*COLS*FILAS] : null;
}

function arrLate(j){
  const n = arrNodo(j); if (!n) return;
  n.classList.remove('late'); void n.offsetWidth; n.classList.add('late');
  setTimeout(() => n.classList.remove('late'), 620);
}

function arrHaceCarpeta(j, item){
  const y = INICIO[j];
  if (esCarpeta(y)){
    if (y.c.indexOf(item) < 0) y.c.push(item);
  } else {
    INICIO[j] = { c: [y, item], n: T('cCarpeta') };
  }
  vibra(24);
}

/* ══════════ LA SALPICADURA ══════════
   Pedido: «al dejarlo en el lugar que queramos haga efecto de agua salpicando,
   no la de la pantalla sino un efecto aparte, ya de la app colocándose». Así que
   NO es el shader del fondo: son gotas de DOM que salen del punto y una onda
   corta. Cuesta cero WebGL y no toca el lienzo del fondo, que puede ni existir. */
const SALPICA_N = 12;
function salpica(x, y){
  const c = document.createElement('div');
  c.className = 'salpi';
  c.style.left = x + 'px'; c.style.top = y + 'px';
  const aro = document.createElement('i');
  aro.className = 'sAro';
  c.appendChild(aro);
  for (let i = 0; i < SALPICA_N; i++){
    const g = document.createElement('i');
    g.className = 'sGota';
    /* el ángulo va desparejo a propósito: doce gotas exactamente repartidas se
       leen a estrella dibujada y no a agua */
    const ang = (i/SALPICA_N)*6.2832 + (Math.random() - 0.5)*0.5;
    const r = 34 + Math.random()*30;
    g.style.setProperty('--gx', Math.cos(ang)*r + 'px');
    g.style.setProperty('--gy', Math.sin(ang)*r*0.72 + 'px');
    g.style.setProperty('--gd', (Math.random()*70) + 'ms');
    g.style.width = g.style.height = (3 + Math.random()*4).toFixed(1) + 'px';
    c.appendChild(g);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 760);
}

/* ══════════ EL GESTO ══════════ */

function arrEngancha(el, desde){
  let largo = null, px = 0, py = 0, orig = null, dato = null, t0 = 0;

  const suelta = () => { if (largo){ clearTimeout(largo); largo = null; } };

  el.addEventListener('pointerdown', e => {
    const nodo = e.target.closest ? e.target.closest('.ap') : null;
    /* ── EL HUECO VACÍO DEL ESCRITORIO ABRE LA GALERÍA DE FONDOS ──
       Es el mismo gesto y el mismo temporizador: sobre una app significa
       agarrarla y sobre el vacío significa cambiar el fondo, que es lo que hace
       cualquier launcher. Con un temporizador aparte habría dos relojes
       compitiendo por el mismo dedo. */
    if (!nodo){
      if (desde !== 'inicio') return;
      px = e.clientX; py = e.clientY;
      largo = setTimeout(() => { largo = null; fgAbre(); }, ARR_LARGO);
      return;
    }
    px = e.clientX; py = e.clientY; t0 = performance.now(); orig = nodo;
    dato = desde === 'cajon' ? nodo.dataset.p : +nodo.dataset.i;
    largo = setTimeout(() => {
      largo = null;
      arrLevanta(orig, desde, dato, px, py);
    }, ARR_LARGO);
  });

  el.addEventListener('pointermove', e => {
    if (largo && Math.hypot(e.clientX - px, e.clientY - py) > ARR_MUEVE) suelta();
  });

  el.addEventListener('pointerup', e => {
    if (!largo) return;
    suelta();
    if (performance.now() - t0 < ARR_LARGO){
      const nodo = e.target.closest ? e.target.closest('.ap') : null;
      if (!nodo) return;   /* soltar en el vacío antes del plazo no hace nada */
      if (desde === 'cajon'){ if (nodo.dataset.p) abreZoom(nodo.dataset.p, nodo); return; }
      const i = +nodo.dataset.i;
      const it = desde === 'dock' ? DOCK[i] : INICIO[i];
      if (esCarpeta(it)) carpAbre(i, desde, nodo);
      else if (it) abreZoom(it, nodo);
    }
  });
  el.addEventListener('pointercancel', suelta);
}

/* el movimiento y el soltar cuelgan de la VENTANA: un arrastre que empieza en el
   cajón termina sobre el escritorio, o sea sobre otro elemento */
function arrInit(){
  arrEngancha($('#tira'), 'inicio');
  arrEngancha($('#dock'), 'dock');
  arrEngancha($('#cajLista'), 'cajon');

  /* ── EL FANTASMA VA EN EL DEDO; LO DEMÁS, UNA VEZ POR CUADRO ──
     Pedido textual: «al mantener una app puedas moverlo de lugar pero más
     fluido». El fantasma se mueve con `transform`, que resuelve el compositor,
     así que ése SÍ tiene que ir en el manejador del dedo: cualquier retraso ahí
     se ve como que el icono va atrás de la mano.
     Lo que no puede ir ahí es el resaltado del destino. `arrPinta` hace dos
     búsquedas sobre el documento entero y escribe clases, y `pointermove` llega
     a ciento veinte veces por segundo en un teléfono: eso es recalcular estilo
     el doble de veces de las que se dibuja, para pintar dos veces lo mismo. Se
     agenda en el cuadro, que es cuando se va a ver. */
  addEventListener('pointermove', e => {
    if (!ARR) return;
    if (!ARR.movio && Math.hypot(e.clientX - ARR.x, e.clientY - ARR.y) > ARR_MUEVE) ARR.movio = true;
    ARR.x = e.clientX; ARR.y = e.clientY;
    const g = ARR.g;
    g.style.transform = 'translate3d(' + (e.clientX - g.__w/2) + 'px,'
                      + (e.clientY - g.__h/2) + 'px,0)';
    arrAgenda();
  }, { passive: true });

  const fin = e => { if (ARR) arrSuelta(e.clientX, e.clientY); };
  addEventListener('pointerup', fin, { passive: true });
  addEventListener('pointercancel', () => { if (ARR) arrSuelta(-1, -1); }, { passive: true });
}

/* marca el icono sobre el que caería una carpeta: sin eso, hacer carpeta es una
   sorpresa y deshacerla cuesta dos gestos */
/* ── Y SÓLO SE REPINTA SI CAMBIÓ ──
   Sin esta comparación, cada movimiento del dedo saca y vuelve a poner la misma
   clase sobre el mismo nodo: el navegador no sabe que el resultado es idéntico
   y recalcula estilo igual. Arrastrando de punta a punta eran cientos de
   recálculos para dejar la pantalla como estaba. */
let ARR_RAF = 0, ARR_DEST = null, ARR_CEL = -2;
/* la única forma de que la medición pruebe algo es correr el MISMO binario con
   la comparación dada vuelta: con dos versiones se compararían dos programas */
let ARR_SIN_CACHE = false;
function arrAgenda(){
  if (ARR_RAF) return;
  ARR_RAF = requestAnimationFrame(() => {
    ARR_RAF = 0;
    if (!ARR) return;
    arrPinta(ARR.x, ARR.y);
    arrBorde(ARR.x);
  });
}
function arrPinta(x, y){
  const c = arrCelda(x, y);
  const ci = c ? c.i : -1;
  if (ci !== ARR_CEL || ARR_SIN_CACHE){ rejaMarca(ci); ARR_CEL = ci; }
  const j = arrEncima(x, y, ARR && ARR.desde === 'inicio' ? ARR.i : null);
  const pg = $$('#tira .pag')[PAG];
  const n = (j == null) ? null : (pg && pg.children[j - PAG*COLS*FILAS]) || null;
  if (n === ARR_DEST && !ARR_SIN_CACHE) return;
  if (ARR_SIN_CACHE) $$('.ap.destino').forEach(e => e.classList.remove('destino'));
  else if (ARR_DEST) ARR_DEST.classList.remove('destino');
  ARR_DEST = n;
  if (n) n.classList.add('destino');
}
function arrPintaCero(){
  if (ARR_RAF){ cancelAnimationFrame(ARR_RAF); ARR_RAF = 0; }
  if (ARR_DEST){ ARR_DEST.classList.remove('destino'); ARR_DEST = null; }
  ARR_CEL = -2;
}

/* ── EL BORDE CAMBIA DE PÁGINA ──
   Con varias páginas, sin esto no hay forma de llevar un icono a la de al lado:
   habría que soltarlo, pasar de página y volver a levantarlo. */
function arrBorde(x){
  const w = innerWidth, ahora = performance.now();
  const izq = x < w*0.08, der = x > w*0.92;
  if (!izq && !der){ ARR_PAG = 0; return; }
  if (!ARR_PAG){ ARR_PAG = ahora; return; }
  if (ahora - ARR_PAG < 620) return;
  ARR_PAG = ahora;
  ponPagina(PAG + (der ? 1 : -1));
  arrRejaMide();                     /* cambió la página: la reja es otra */
  rejaArma();
}

/* ══════════════════════ LA CARPETA ABIERTA ══════════════════════
   Una hoja como las otras tres, con el nombre editable y las apps adentro.
   Sacar una app de la carpeta la devuelve al escritorio en vez de borrarla: lo
   que uno quiere casi siempre es «esta no va acá», no «esta no la quiero». Y
   cuando queda una sola, la carpeta se deshace sola — una carpeta de un
   elemento es un icono con un paso de más. */
let CARP_I = -1, CARP_DE = 'inicio';

function carpLista(){ return CARP_DE === 'dock' ? DOCK : INICIO; }
function carpItem(){ const l = carpLista(); return CARP_I >= 0 ? l[CARP_I] : null; }

/* ── LA CARPETA SE ABRE DESDE SU BALDOSA ──
   Pedido: «necesito que se abra así como transición». Una hoja que aparece en
   el medio de la pantalla no dice de dónde salió; creciendo desde el icono que
   se tocó, la carpeta y su baldosa son la misma cosa.
   El punto de origen se mide con `offsetHeight` y no con el rectángulo: un
   `getBoundingClientRect` incluye el `scale(.92)` del estado cerrado, así que
   devolvería el origen de la hoja encogida y la animación saldría corrida. */
function carpOrigen(nodo){
  const c = $('#carp');
  if (!nodo || !c) return;
  const r = nodo.getBoundingClientRect();
  const h = c.offsetHeight, W = innerWidth, H = innerHeight;
  const ox = (r.left + r.width/2) - 12;          /* la hoja va de 12 a W−12 */
  const oy = (r.top + r.height/2) - (H/2 - h/2); /* y centrada en vertical */
  c.style.transformOrigin = Math.round(cl(ox, 0, W - 24)) + 'px '
                          + Math.round(cl(oy, 0, h)) + 'px';
}

function carpAbre(i, desde, nodo){
  CARP_I = i; CARP_DE = desde || 'inicio';
  if (!esCarpeta(carpItem())) return;
  cierraMenu(); asisCierra(); persCierra(); iniCierra();
  carpPinta();
  carpOrigen(nodo || arrNodo(i));
  $('#carp').classList.add('on');
  $('#velo').classList.add('on');
}
function carpCierra(){
  CARP_I = -1;
  $('#carp').classList.remove('on');
  $('#velo').classList.remove('on');
}

function carpPinta(){
  const x = carpItem(); if (!esCarpeta(x)) return carpCierra();
  const n = $('#carpNom');
  n.value = x.n || T('cCarpeta');
  $('#carpPie').textContent = T('cPie');
  const c = $('#carpRejilla'); c.innerHTML = '';
  for (const p of x.c){
    const a = POR_PKG[p]; if (!a) continue;
    const nd = nodoApp(a);
    nd.addEventListener('click', () => { carpCierra(); abreZoom(p, nd); });
    /* mantener adentro de la carpeta la saca: es la única forma de deshacer una
       carpeta sin arrastrar, que en una hoja no se puede */
    let t = null;
    nd.addEventListener('pointerdown', () => { t = setTimeout(() => { t = null; carpSaca(p); }, 460); });
    const q = () => { if (t){ clearTimeout(t); t = null; } };
    nd.addEventListener('pointerup', q);
    nd.addEventListener('pointermove', q);
    nd.addEventListener('pointercancel', q);
    c.appendChild(nd);
  }
  entraLista(c);
}

function carpSaca(p){
  const x = carpItem(); if (!esCarpeta(x)) return;
  const i = x.c.indexOf(p); if (i < 0) return;
  x.c.splice(i, 1);
  INICIO.push(p);
  vibra(16);
  /* una carpeta con un solo elemento no es una carpeta */
  if (x.c.length <= 1){
    const l = carpLista();
    l[CARP_I] = x.c.length ? x.c[0] : null;
    if (!l[CARP_I]) l.splice(CARP_I, 1);
    carpCierra();
  } else carpPinta();
  guarda('inicio', INICIO); guarda('dock', DOCK);
  pintaInicio(); pintaDock();
  avisa(T('cSacada'));
}

function carpInit(){
  $('#carpCerrar').addEventListener('click', carpCierra);
  $('#carpNom').addEventListener('input', e => {
    const x = carpItem(); if (!esCarpeta(x)) return;
    x.n = e.target.value.slice(0, 22);
    guarda('inicio', INICIO); guarda('dock', DOCK);
    pintaInicio(); pintaDock();
  });
}
