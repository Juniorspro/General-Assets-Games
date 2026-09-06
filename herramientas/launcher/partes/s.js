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

function arrFantasma(el, x, y){
  const g = el.cloneNode(true);
  g.className = 'ap fantasma';
  const r = el.getBoundingClientRect();
  g.style.width = r.width + 'px';
  g.style.left = (x - r.width/2) + 'px';
  g.style.top = (y - r.height/2) + 'px';
  document.body.appendChild(g);
  return g;
}

function arrLevanta(orig, desde, i, x, y){
  if (ARR) return;
  vibra(20);
  const el = orig;
  ARR = { desde: desde, i: i, el: el, x: x, y: y, sobre: null, movio: false,
          g: arrFantasma(el, x, y) };
  el.classList.add('llevada');
  document.body.classList.add('arrastrando');
  /* ── DEL CAJÓN SE SALE SOLO, Y CON TRANSICIÓN ──
     Pedido textual: «al mantener en el cajón de aplicaciones se mueva
     automáticamente a la pantalla principal con transición». El cajón se cierra
     y lo que queda en la mano es el fantasma, que ya está siguiendo al dedo:
     así el viaje se ve en vez de ser un salto. */
  if (desde === 'cajon') setTimeout(() => { if (ARR) verCajon(false); }, 90);
}

/* ══════════ DÓNDE CAERÍA ══════════ */

/* la celda del escritorio bajo el dedo, o null si el dedo no está sobre la reja */
function arrCelda(x, y){
  const pg = $$('#tira .pag')[PAG];
  if (!pg) return null;
  const r = pg.getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  const cw = r.width/COLS, ch = ALTO_AP;
  const c = cl(Math.floor((x - r.left)/cw), 0, COLS - 1);
  const f = cl(Math.floor((y - r.top)/ch), 0, FILAS - 1);
  return { col: c, fila: f, i: PAG*COLS*FILAS + f*COLS + c,
           cx: r.left + (c + 0.5)*cw, cy: r.top + (f + 0.5)*ch, cw: cw, ch: ch };
}

/* si el dedo está lo bastante encima de un icono que YA está ahí, soltarlo hace
   carpeta en vez de acomodar. El radio es una fracción de la celda y no un
   número de píxeles: con iconos de 40 y de 92 tiene que sentirse igual. */
function arrEncima(x, y){
  const c = arrCelda(x, y);
  if (!c) return null;
  const lista = INICIO;
  if (c.i >= lista.length) return null;
  if (ARR && ARR.desde === 'inicio' && c.i === ARR.i) return null;
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
  document.body.classList.remove('arrastrando');
  if (a.g) a.g.remove();
  a.el.classList.remove('llevada');
  $$('.ap.destino').forEach(e => e.classList.remove('destino'));

  if (!a.movio){ arrCancela(a); return; }

  /* lo que se saca de su sitio se saca ANTES de decidir a dónde va: si no, un
     movimiento dentro del mismo escritorio se cuenta dos veces */
  let item = null;
  if (a.desde === 'inicio') item = INICIO.splice(a.i, 1)[0];
  else if (a.desde === 'dock') item = DOCK.splice(a.i, 1)[0];
  else item = a.i;                                   /* del cajón: es un paquete */
  if (item == null) return;

  const dk = arrEnDock(x, y);
  if (dk >= 0){
    /* el dock tiene cuatro sitios: el quinto sale al escritorio, que es mejor
       que perderlo sin decir nada */
    if (DOCK.length >= 4){ INICIO.push(item); avisa(T('cDockLleno')); }
    else DOCK.splice(Math.min(dk, DOCK.length), 0, item);
  } else {
    const j = arrEncima(x, y);
    if (j != null && !esCarpeta(item)) arrHaceCarpeta(j, item);
    else {
      const c = arrCelda(x, y);
      const dest = c ? Math.min(c.i, INICIO.length) : INICIO.length;
      INICIO.splice(dest, 0, item);
    }
  }
  guarda('inicio', INICIO); guarda('dock', DOCK);
  pintaInicio(); pintaDock();
  salpica(x, y);
}

function arrCancela(a){
  /* nada se movió: mantener y soltar en el sitio es pedir el menú */
  const p = a.desde === 'cajon' ? a.i
          : itemPkg(a.desde === 'dock' ? DOCK[a.i] : INICIO[a.i]);
  if (p) abreMenu(p, a.y);
  else if (a.desde === 'inicio' && esCarpeta(INICIO[a.i])) carpAbre(a.i);
}

/* ── HACER UNA CARPETA ──
   Soltar una app encima de otra: las dos se van adentro de una carpeta nueva
   con el nombre de la que estaba. Soltarla encima de una carpeta la mete. */
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
      if (desde === 'cajon'){ if (nodo.dataset.p) abre(nodo.dataset.p); return; }
      const i = +nodo.dataset.i;
      const it = desde === 'dock' ? DOCK[i] : INICIO[i];
      if (esCarpeta(it)) carpAbre(i, desde);
      else if (it) abre(it);
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

  addEventListener('pointermove', e => {
    if (!ARR) return;
    if (!ARR.movio && Math.hypot(e.clientX - ARR.x, e.clientY - ARR.y) > ARR_MUEVE) ARR.movio = true;
    ARR.x = e.clientX; ARR.y = e.clientY;
    const r = ARR.g.getBoundingClientRect();
    ARR.g.style.left = (e.clientX - r.width/2) + 'px';
    ARR.g.style.top = (e.clientY - r.height/2) + 'px';
    arrPinta(e.clientX, e.clientY);
    arrBorde(e.clientX);
  }, { passive: true });

  const fin = e => { if (ARR) arrSuelta(e.clientX, e.clientY); };
  addEventListener('pointerup', fin, { passive: true });
  addEventListener('pointercancel', () => { if (ARR) arrSuelta(-1, -1); }, { passive: true });
}

/* marca el icono sobre el que caería una carpeta: sin eso, hacer carpeta es una
   sorpresa y deshacerla cuesta dos gestos */
function arrPinta(x, y){
  $$('.ap.destino').forEach(e => e.classList.remove('destino'));
  const j = arrEncima(x, y);
  if (j == null) return;
  const pg = $$('#tira .pag')[PAG];
  const n = pg && pg.children[j - PAG*COLS*FILAS];
  if (n) n.classList.add('destino');
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

function carpAbre(i, desde){
  CARP_I = i; CARP_DE = desde || 'inicio';
  if (!esCarpeta(carpItem())) return;
  cierraMenu(); asisCierra(); persCierra(); iniCierra();
  carpPinta();
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
    nd.addEventListener('click', () => { carpCierra(); abre(p); });
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
