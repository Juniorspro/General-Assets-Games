/* ══════════════════════ EL ESCRITORIO ══════════════════════ */

let APPS = [], POR_PKG = {};
let INICIO = [], DOCK = [];
let PAG = 0, NPAG = 1, FILAS = 4;
let CAJON = false, MENU_PKG = null;

/* ══════════ ICONOS ══════════
   El PNG lo sirve el cliente del WebView desde `https://icono.aero/<paquete>`.
   En un navegador sin puente esa dirección no existe: ahí se dibuja una baldosa
   con la inicial, que es lo que hace cualquier launcher con una app sin icono. */
function iconoUrl(p){ return 'https://icono.aero/' + encodeURIComponent(p) + '?l=144'; }
function letraDe(n){
  const c = norm(n).replace(/[^a-z0-9áéíóúñ]/g, '');
  return (c[0] || '?').toUpperCase();
}
function colorDe(p){
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h*31 + p.charCodeAt(i)) >>> 0;
  return 'hsl(' + (h % 360) + ',72%,58%)';
}
function nodoApp(a, conNombre){
  const d = document.createElement('div');
  d.className = 'ap'; d.dataset.p = a.p;
  const b = document.createElement('div');
  b.className = 'baldosa';
  if (HAY_AND){
    const im = document.createElement('img');
    im.src = iconoUrl(a.p); im.alt = ''; im.draggable = false;
    im.onerror = () => { b.innerHTML = ''; b.style.background = colorDe(a.p); b.textContent = letraDe(a.n);
                         b.style.font = '700 26px system-ui'; };
    b.appendChild(im);
  } else {
    b.style.background = colorDe(a.p);
    b.style.font = '700 26px system-ui';
    b.textContent = letraDe(a.n);
  }
  d.appendChild(b);
  if (conNombre !== false){
    const n = document.createElement('div');
    n.className = 'nom'; n.textContent = a.n;
    d.appendChild(n);
  }
  return d;
}

/* ══════════ CUÁNTAS FILAS ENTRAN ══════════
   Medido y no escrito: en un teléfono corto una fila de más queda cortada por el
   dock, y en uno largo sobra medio escritorio vacío. */
function calculaFilas(){
  const h = $('#hoja').getBoundingClientRect().height;
  FILAS = cl(Math.floor((h - 12)/ALTO_AP), 2, 6);
  return FILAS;
}

function pintaInicio(){
  calculaFilas();
  const porPag = COLS*FILAS;
  const lista = INICIO.map(p => POR_PKG[p]).filter(Boolean);
  NPAG = Math.max(1, Math.ceil(lista.length/porPag));
  PAG = cl(PAG, 0, NPAG - 1);

  const tira = $('#tira');
  tira.innerHTML = '';
  for (let q = 0; q < NPAG; q++){
    const pg = document.createElement('div');
    pg.className = 'pag';
    for (const a of lista.slice(q*porPag, (q + 1)*porPag)) pg.appendChild(nodoApp(a));
    tira.appendChild(pg);
  }
  tira.style.width = (NPAG*100) + '%';
  $$('.pag').forEach(p => { p.style.flexBasis = (100/NPAG) + '%'; });
  ponPagina(PAG, false);

}
function ponPagina(n, suave){
  PAG = cl(n, 0, NPAG - 1);
  const t = $('#tira');
  t.style.transition = suave === false ? 'none' : 'transform .30s cubic-bezier(.22,.9,.24,1)';
  t.style.transform = 'translateX(' + (-PAG*(100/NPAG)) + '%)';
}

function pintaDock(){
  const d = $('#dock'); d.innerHTML = '';
  for (const p of DOCK.slice(0, 4)){
    const a = POR_PKG[p]; if (!a) continue;
    d.appendChild(nodoApp(a, false));
  }
  d.style.visibility = DOCK.length ? 'visible' : 'hidden';
}

/* ── LA LETRA DE UNA APP ──
   Sale del nombre YA sin acentos, así que Ángela cae en la A y no en una
   sección aparte; lo que no empieza con letra va a «#», que es donde lo pone
   cualquier lista alfabética. */
function letraIni(a){
  const c = norm(a.n).charAt(0);
  return (c >= 'a' && c <= 'z') ? c.toUpperCase() : '#';
}

let LETRAS = [];          /* las letras que de verdad tienen apps */
let ANCLA = {};           /* letra → el nodo de su encabezado, para poder saltar */

function pintaCajon(filtro){
  const l = $('#cajLista');
  const q = norm(filtro || '');
  /* ── EL NOMBRE MANDA Y EL PAQUETE ES LA RED ──
     Buscando por los dos a la vez, «mer» devolvía Cámara: `com.android.ca-MER-a2`
     lo contiene. El paquete sólo entra cuando el nombre no encontró nada, que
     es cuando de verdad sirve (buscar «whatsapp» sin acordarse del icono). */
  let v = APPS;
  if (q){
    v = APPS.filter(a => norm(a.n).indexOf(q) >= 0);
    if (!v.length) v = APPS.filter(a => norm(a.p).indexOf(q) >= 0);
  }

  l.innerHTML = '';
  LETRAS = []; ANCLA = {}; PEDIDA = null;

  /* ── LOS ENCABEZADOS SÓLO EXISTEN SIN FILTRO ──
     Con dos resultados, partirlos en dos secciones de uno es ruido; y el riel
     no tiene a dónde saltar, así que también se esconde. */
  const porLetra = !q;
  let ult = '';
  for (const a of v){
    if (porLetra){
      const L = letraIni(a);
      if (L !== ult){
        ult = L;
        const h = document.createElement('div');
        h.className = 'let'; h.textContent = L; h.dataset.l = L;
        l.appendChild(h);
        LETRAS.push(L); ANCLA[L] = h;
      }
    }
    l.appendChild(nodoApp(a));
  }
  if (!v.length && q){
    const e = document.createElement('div');
    e.className = 'vacio';
    e.textContent = T('nada');
    l.appendChild(e);
  }

  /* ── BUSCAR EN LA WEB ES UNA FILA, NO UN ATAJO DE TECLADO ──
     Estaba sólo en el Enter y sólo cuando no había ninguna app: o sea que en un
     teléfono, donde no hay Enter a la vista, no existía. Va como una fila al
     final de los resultados, visible desde la primera letra: así el cajón es
     además un buscador, que es lo que se pidió. */
  if (q){
    const w = document.createElement('div');
    w.className = 'web';
    /* la misma lupa que el buscador: dos dibujos distintos para lo mismo se
       leen a dos cosas distintas */
    w.innerHTML = '<svg class="lupa" width="18" height="18" viewBox="0 0 24 24" fill="none" '
                + 'stroke="#fff" stroke-width="2.4" stroke-linecap="round">'
                + '<circle cx="10.5" cy="10.5" r="6.6"/><path d="M15.6 15.6L21 21"/></svg>';
    const t = document.createElement('span');
    t.textContent = T('web', filtro);
    w.appendChild(t);
    w.addEventListener('click', () => aLaWeb(filtro));
    l.appendChild(w);
  }
  $('#cajTit').textContent = q ? (v.length + ' \u00b7 ' + T('todas')) : T('todas');
  pintaRiel();
}

/* ══════════ EL RIEL A-Z ══════════ */
function pintaRiel(){
  const r = $('#riel');
  r.innerHTML = '';
  /* con menos de dos secciones el riel no lleva a ninguna parte */
  r.style.display = LETRAS.length > 1 ? 'flex' : 'none';
  for (const L of LETRAS){
    const b = document.createElement('b');
    b.textContent = L; b.dataset.l = L;
    r.appendChild(b);
  }
}

/* ── LA LETRA QUE SE ESTÁ MIRANDO SE MIDE, NO SE CUENTA ──
   «Al ir bajando detecta las apps de esas letras»: la letra actual es la del
   último encabezado que ya pasó por arriba del borde de la lista. Comparando
   posiciones de verdad, funciona igual con dos apps que con trescientas y no
   depende de cuántas filas entren. */
/* ── ABAJO DE TODO, LA LETRA ES LA QUE SE PIDIÓ ──
   Las últimas secciones no pueden subir al borde: `scrollTop` llega al tope
   antes. Medido, tocar «S» dejaba «R» arriba y el riel marcando otra cosa que
   la que se estaba mirando, y las tres últimas letras nunca coincidían.
   Rellenar la lista con medio alto de pantalla las haría llegar —es lo que
   hace iOS— pero deja un vacío enorme que hay que scrollear.
   Con la lista en el tope, todas las secciones que faltan están a la vista, así
   que la respuesta honesta a «qué letra estoy mirando» es la que se pidió. */
let PEDIDA = null;
function alFondo(){
  const l = $('#cajLista');
  return l.scrollTop + l.clientHeight >= l.scrollHeight - 4;
}
function letraVisible(){
  const l = $('#cajLista');
  if (PEDIDA && alFondo() && LETRAS.indexOf(PEDIDA) >= 0) return PEDIDA;
  const y = l.getBoundingClientRect().top + 8;
  let act = LETRAS[0] || '';
  for (const L of LETRAS){
    if (ANCLA[L].getBoundingClientRect().top <= y) act = L; else break;
  }
  return act;
}
function marcaRiel(L){
  $$('#riel b').forEach(b => b.classList.toggle('on', b.dataset.l === L));
}
function vaALetra(L){
  const h = ANCLA[L];
  if (!h) return;
  const l = $('#cajLista');
  PEDIDA = L;
  l.scrollTop += h.getBoundingClientRect().top - l.getBoundingClientRect().top - 4;
  marcaRiel(L);
}

function aLaWeb(q){
  q = String(q || '').trim();
  if (!q) return;
  vibra(10);
  if (HAY_AND && AND.buscarWeb) AND.buscarWeb(q);
  else avisa(T('web', q));
}

/* ══════════ ABRIR, FIJAR, MENÚ ══════════ */
function abre(pkg){
  vibra(10);
  if (!HAY_AND){ avisa(T('sinPuente')); return; }
  if (!AND.abrir(pkg)) avisa('✕');
}
function fijado(p){ return INICIO.indexOf(p) >= 0 || DOCK.indexOf(p) >= 0; }
function alterna(p){
  const i = INICIO.indexOf(p);
  if (i >= 0){ INICIO.splice(i, 1); avisa(T('soltado')); }
  else { INICIO.push(p); avisa(T('fijado')); }
  guarda('inicio', INICIO); pintaInicio();
}
function abreMenu(pkg, y){
  MENU_PKG = pkg; vibra(18);
  const a = POR_PKG[pkg];
  $('#menuTit').textContent = a ? a.n : pkg;
  $('#mFijar').lastElementChild.textContent = fijado(pkg) ? T('soltar') : T('fijar');
  $('#mInfo').lastElementChild.textContent = T('info');
  $('#mBorrar').lastElementChild.textContent = T('borrar');
  const m = $('#menu');
  m.style.top = cl(y - 40, 60, innerHeight - 260) + 'px';
  m.classList.add('on'); $('#velo').classList.add('on');
}
function cierraMenu(){
  MENU_PKG = null;
  $('#menu').classList.remove('on'); $('#velo').classList.remove('on');
}

/* ══════════ EL CAJÓN ══════════ */
function verCajon(v){
  CAJON = !!v;
  $('#cajon').classList.toggle('on', CAJON);
  /* el fondo se acerca: es lo que hace que la hoja esmerilada se lea a hoja
     sobre algo y no a otra pantalla */
  fondoProfundo(CAJON);
  if (CAJON){
    $('#busca2').value = '';
    pintaCajon('');
    $('#cajLista').scrollTop = 0;
    marcaRiel(LETRAS[0] || '');
  } else {
    $('#busca2').blur(); $('#busca').blur();
    $('#cajLista').scrollTop = 0;
    mascotaBaila(false);
    $('#burbuja').classList.remove('on');
  }
}

/* ══════════ RELOJ Y BATERÍA ══════════ */
function dosD(n){ return n < 10 ? '0' + n : String(n); }
function pintaReloj(){
  const d = new Date();
  $('#hora').textContent = dosD(d.getHours()) + ':' + dosD(d.getMinutes());
  const t = TXT[LANG] || TXT.es;
  $('#fecha').innerHTML = t.dias[d.getDay()] + '<br>' + d.getDate() + ' ' + t.meses[d.getMonth()];
  $('#bIzq').textContent = dosD(d.getHours()) + ':' + dosD(d.getMinutes());
  /* ── EL SALUDO SALE DE LA HORA, NO DE UNA CONSTANTE ──
     Es lo único del widget que cambia de tono a lo largo del día, y es lo que
     hace que el escritorio se sienta puesto para este momento y no un reloj. */
  const h = d.getHours();
  const fr = h < 6 ? 'madrugada' : h < 13 ? 'manana' : h < 20 ? 'tarde' : 'noche';
  $('#wSaludo').textContent = T('s_' + fr);
}
function pintaBateria(){
  if (!HAY_AND || !AND.bateria) return;
  try { ponBateria(JSON.parse(AND.bateria())); } catch (e) {}
}

/* ── EL ARO DE BATERÍA ──
   El trazo de un círculo se recorta con `stroke-dashoffset`: la circunferencia
   de r=25 es 2πr = 157,08, así que el offset es lo que FALTA. Va aparte de
   `pintaBateria` para que la vista previa del navegador —que no tiene puente y
   por lo tanto no tiene batería— pueda llenarlo igual y se pueda mirar. */
const ARO_C = 2*Math.PI*25;
function ponBateria(b){
  const n = (b.n === undefined || b.n < 0) ? 100 : b.n;
  $('#batN').textContent = (b.c ? '\u26a1' : '') + n + '%';
  $('#wPct').textContent = n + '%';
  const f = $('#batLlena');
  f.style.width = n + '%';
  /* el color es información: rojo por debajo de 15 dice de una ojeada algo que
     el número solo no dice */
  const col = b.c ? '#8fe3ff' : n <= 15 ? '#ff8b93' : n <= 30 ? '#ffd36e' : '#b8f078';
  f.style.background = col;
  f.style.boxShadow = '0 0 6px ' + col;
  const arco = $('#wArco');
  arco.style.stroke = col;
  arco.style.strokeDashoffset = String(ARO_C*(1 - n/100));
}

/* ══════════ CARGA ══════════ */
function cargaApps(){
  let bruto = '[]';
  if (HAY_AND){ try { bruto = AND.apps(); } catch (e){ bruto = '[]'; } }
  else bruto = JSON.stringify(APPS_DEMO);
  try { APPS = JSON.parse(bruto) || []; } catch (e){ APPS = []; }
  /* ── EL ORDEN SE ORDENA ACÁ, AUNQUE EL PUENTE YA LO HAGA ──
     `Puente.apps()` ordena alfabético sin acentos, y el índice de letras DEPENDE
     de que la lista venga ordenada: si no, aparecen encabezados repetidos y
     `ANCLA[letra]` se queda con el último, así que tocar una letra salta a otro
     lado. Medido con la lista de la vista previa sin ordenar, el riel salió
     `T M C W S I T Y G M P M S N D X T A C R L R U A D` — veinticinco secciones
     para veintiocho apps. Un contrato repartido entre dos lenguajes se rompe el
     día que alguien toca uno de los dos; ordenar de este lado cuesta una línea
     y lo vuelve imposible. */
  APPS.sort((a, b) => norm(a.n) < norm(b.n) ? -1 : norm(a.n) > norm(b.n) ? 1 : 0);
  POR_PKG = {};
  for (const a of APPS) POR_PKG[a.p] = a;

  INICIO = (lee('inicio', null) || []).filter(p => POR_PKG[p]);
  DOCK = (lee('dock', null) || []).filter(p => POR_PKG[p]);

  /* ── LA PRIMERA VEZ SE SIEMBRA SÓLO EL DOCK ──
     El inicio va vacío a propósito: arriba está el widget, abajo el dock, y en
     el medio se ve el fondo. Todo lo demás vive en el cajón, que se abre con un
     gesto. Lo que sí se siembra son los cuatro del dock, porque un dock vacío
     la primera vez sí se lee a que el launcher no funcionó — y se eligen por lo
     que el sistema declara: teléfono, mensajes, cámara, navegador. */
  if (!DOCK.length && APPS.length){
    const busca = pats => APPS.find(a => pats.some(q => a.p.indexOf(q) >= 0));
    DOCK = [
      busca(['dialer', '.phone', 'contacts']),
      busca(['.mms', 'messaging', 'messages', 'whatsapp']),
      busca(['camera', 'gallery', 'photos']),
      busca(['chrome', 'browser', 'firefox'])
    ].filter(Boolean).map(a => a.p).slice(0, 4);
    if (DOCK.length < 4) DOCK = DOCK.concat(
      APPS.filter(a => DOCK.indexOf(a.p) < 0).slice(0, 4 - DOCK.length).map(a => a.p));
    guarda('dock', DOCK);
  }
}

/* ══════════ ENTRADA ══════════ */
function pkgDe(ev){
  const n = ev.target.closest ? ev.target.closest('.ap') : null;
  return n ? n.dataset.p : null;
}
function enganchaLista(el){
  let t0 = 0, largo = null, px = 0, py = 0, movio = false;
  el.addEventListener('pointerdown', e => {
    const p = pkgDe(e); if (!p) return;
    px = e.clientX; py = e.clientY; movio = false; t0 = performance.now();
    /* ── MANTENER ES UN TEMPORIZADOR, NO UN «pointerup» LARGO ──
       Esperando al soltar, el menú aparece recién cuando el dedo se levanta y se
       siente que no respondió. A los 460 ms sale con el dedo todavía puesto, que
       es lo que hace cualquier escritorio. */
    largo = setTimeout(() => { largo = null; movio = true; abreMenu(p, e.clientY); }, 460);
  });
  el.addEventListener('pointermove', e => {
    if (!largo) return;
    if (Math.hypot(e.clientX - px, e.clientY - py) > 12){ clearTimeout(largo); largo = null; movio = true; }
  });
  el.addEventListener('pointerup', e => {
    if (largo){ clearTimeout(largo); largo = null;
      const p = pkgDe(e);
      if (p && !movio && performance.now() - t0 < 460) abre(p);
    }
  });
  el.addEventListener('pointercancel', () => { if (largo){ clearTimeout(largo); largo = null; } });
}

/* páginas: arrastre horizontal con umbral, y el vertical no lo roba */
function enganchaPaginas(){
  const h = $('#hoja'), t = $('#tira');
  let x0 = 0, y0 = 0, act = false, eje = 0, w = 0;
  h.addEventListener('pointerdown', e => {
    x0 = e.clientX; y0 = e.clientY; act = true; eje = 0;
    w = h.getBoundingClientRect().width;
    t.style.transition = 'none';
  });
  h.addEventListener('pointermove', e => {
    if (!act) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!eje){
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) eje = 1;
      else if (Math.abs(dy) > 10) eje = 2;
      else return;
    }
    if (eje !== 1) return;
    const base = -PAG*(100/NPAG);
    /* resistencia en los extremos: sin ella la primera página se arrastra libre
       y parece que hay una más que no llega nunca */
    let d = dx;
    if ((PAG === 0 && dx > 0) || (PAG === NPAG - 1 && dx < 0)) d = dx*.32;
    t.style.transform = 'translateX(calc(' + base + '% + ' + d + 'px))';
  });
  const fin = e => {
    if (!act) return; act = false;
    t.style.transition = '';
    /* el gesto de subir lo maneja `enganchaSubir`, que también está sobre
       `#hoja`: acá sólo hay que devolver la página a su sitio */
    if (eje !== 1){ ponPagina(PAG); return; }
    const dx = e.clientX - x0;
    if (dx < -w*.22) ponPagina(PAG + 1);
    else if (dx > w*.22) ponPagina(PAG - 1);
    else ponPagina(PAG);
  };
  h.addEventListener('pointerup', fin);
  h.addEventListener('pointercancel', fin);
}

/* ── SUBIR ABRE EL CAJÓN, DESDE LOS TRES SITIOS DE ABAJO ──
   Un solo tirador de 120 px es un blanco chico y encima se pisaba con el dock.
   El gesto se registra en el escritorio y en el dock; el
   umbral de 55 px es lo que lo separa de un toque tembloroso, y el de 18 px en
   horizontal es lo que impide que un arrastre entre páginas lo dispare. */
function enganchaSubir(el){
  let y0 = 0, x0 = 0, act = false;
  el.addEventListener('pointerdown', e => { y0 = e.clientY; x0 = e.clientX; act = true; });
  el.addEventListener('pointermove', e => {
    if (!act || CAJON) return;
    if (Math.abs(e.clientX - x0) > 18){ act = false; return; }
    if (y0 - e.clientY > 55){ act = false; verCajon(true); vibra(10); }
  });
  const f = () => { act = false; };
  el.addEventListener('pointerup', f);
  el.addEventListener('pointercancel', f);
}

/* el cajón: se sube arrastrando desde abajo y se baja desde la manija */
function enganchaCajon(){
  const caj = $('#cajon');
  enganchaSubir($('#dock'));
  enganchaSubir($('#hoja'));

  /* ══════════ BAJAR ══════════
     ── POR QUÉ NO BAJABA, Y SON TRES COSAS ──
     1. El arrastre estaba sobre `#cajon`, pero el dedo cae sobre `#cajLista`,
        que tiene `touch-action:pan-y`: el navegador se queda con el gesto
        vertical y dispara `pointercancel` antes del umbral, así que el cierre
        no llegaba a correr NUNCA en un teléfono.
     2. Sólo arrastraba con la lista arriba de todo. Con veintiocho apps la
        lista scrollea, así que la mayor parte del tiempo no se podía cerrar.
     3. Y el arrastre escribía `style.transform` inline. `verCajon(false)` saca
        la clase `.on`, cuya regla dice `translateY(100%)` — pero el inline le
        gana por especificidad, así que el cajón se quedaba clavado donde estaba
        el dedo.
     El arreglo: el arrastre vive en la MANIJA, que lleva `touch-action:none`, y
     la posición va por una variable de CSS que la regla base ignora cuando el
     cajón está cerrado. */
  const man = $('#cajManija');
  let y0 = 0, tira = false;
  const pone = d => caj.style.setProperty('--caj-y', Math.max(0, d) + 'px');
  const suelta = () => { caj.classList.remove('tira'); caj.style.removeProperty('--caj-y'); };

  man.addEventListener('pointerdown', e => {
    y0 = e.clientY; tira = true;
    caj.classList.add('tira');
    try { man.setPointerCapture(e.pointerId); } catch (x) {}
  });
  man.addEventListener('pointermove', e => { if (tira) pone(e.clientY - y0); });
  const fin = e => {
    if (!tira) return;
    tira = false;
    const d = e.clientY - y0;
    suelta();
    /* 78 px o un tirón rápido: cerrar tiene que costar poco, porque el que
       arrastró para abajo ya dijo lo que quería */
    if (d > 78) verCajon(false);
  };
  man.addEventListener('pointerup', fin);
  man.addEventListener('pointercancel', fin);

  /* ── Y TAMBIÉN DESDE LA LISTA, CUANDO ESTÁ ARRIBA DE TODO ──
     Acá hace falta `touchmove` con `passive:false` y `preventDefault()`: con
     eventos de puntero el navegador ya reclamó el gesto y lo cancela. */
  const l = $('#cajLista');
  let ly = 0, larr = false;
  l.addEventListener('touchstart', e => {
    larr = l.scrollTop <= 0 && e.touches.length === 1;
    ly = larr ? e.touches[0].clientY : 0;
  }, { passive: true });
  l.addEventListener('touchmove', e => {
    if (!larr) return;
    const d = e.touches[0].clientY - ly;
    if (d <= 0){ larr = false; return; }
    e.preventDefault();
    caj.classList.add('tira'); pone(d);
  }, { passive: false });
  const lfin = e => {
    if (!larr) return;
    larr = false;
    const t = (e.changedTouches && e.changedTouches[0]) || null;
    const d = t ? t.clientY - ly : 0;
    suelta();
    if (d > 78) verCajon(false);
  };
  l.addEventListener('touchend', lfin);
  l.addEventListener('touchcancel', lfin);

  /* la letra que se está mirando, mientras se baja por la lista */
  let pend = false;
  l.addEventListener('scroll', () => {
    if (pend || !LETRAS.length) return;
    pend = true;
    /* una vez por cuadro y no una por evento: `scroll` dispara docenas de veces
       por segundo y medir posiciones obliga al navegador a recalcular el layout */
    requestAnimationFrame(() => {
      pend = false;
      /* despegándose del fondo, la letra pedida deja de mandar */
      if (!alFondo()) PEDIDA = null;
      marcaRiel(letraVisible());
    });
  }, { passive: true });

  /* ══════════ EL RIEL ══════════ */
  const r = $('#riel'), bur = $('#burbuja');
  let rAct = false;
  const rLetra = y => {
    const c = r.getBoundingClientRect();
    const bs = $$('#riel b');
    if (!bs.length) return null;
    /* por posición y no por índice: las letras están repartidas con
       `space-around`, así que dividir el alto por la cantidad cae corrido */
    let mejor = bs[0], dm = Infinity;
    for (const b of bs){
      const q = b.getBoundingClientRect();
      const d = Math.abs((q.top + q.height/2) - y);
      if (d < dm){ dm = d; mejor = b; }
    }
    return mejor.dataset.l;
  };
  const rVa = y => {
    const L = rLetra(y);
    if (!L) return;
    if (bur.textContent !== L) vibra(8);
    bur.textContent = L;
    bur.style.top = Math.max(46, Math.min(innerHeight - 46, y)) + 'px';
    bur.style.transform = 'translateY(-50%) scale(1)';
    vaALetra(L);
  };
  r.addEventListener('pointerdown', e => {
    rAct = true; bur.classList.add('on'); rVa(e.clientY);
    try { r.setPointerCapture(e.pointerId); } catch (x) {}
  });
  r.addEventListener('pointermove', e => { if (rAct) rVa(e.clientY); });
  const rFin = () => { rAct = false; bur.classList.remove('on'); };
  r.addEventListener('pointerup', rFin);
  r.addEventListener('pointercancel', rFin);
}

/* ══════════ LA MASCOTA ══════════
   Baila mientras se escribe y se va sola a los dos segundos de silencio: una
   animación que corre siempre deja de significar algo, y de paso no gasta. */
let MASC_T = 0;
function mascotaBaila(v){
  const m = $('#mascota');
  clearTimeout(MASC_T);
  if (v){
    m.classList.add('on');
    MASC_T = setTimeout(() => m.classList.remove('on'), 2400);
  } else {
    m.classList.remove('on');
  }
}

/* ══════════ GANCHOS DEL SISTEMA ══════════
   Los llama la Activity. Sin ellos, volver al escritorio deja abierto lo que
   estuviera abierto tres apps atrás, que no es «conservar el estado». */
window.__alInicio = function(){ cierraMenu(); verCajon(false); $('#busca2').value = ''; ponPagina(0); };
window.__alVolver = function(){ pintaReloj(); pintaBateria(); CORRE = true; };
window.__atras = function(){
  if (MENU_PKG) cierraMenu();
  else if (CAJON) verCajon(false);
  else if (PAG > 0) ponPagina(0);
};
window.__insets = function(t, b){
  document.documentElement.style.setProperty('--ins-t', Math.max(t, 8) + 'px');
  document.documentElement.style.setProperty('--ins-b', Math.max(b, 8) + 'px');
  calculaFilas(); pintaInicio();
};

/* ══════════ ARRANQUE ══════════ */
function arranca(){
  $('#busca').placeholder = T('busca');
  $('#busca2').placeholder = T('busca');
  $('#cajTit').textContent = T('todas');

  fondoInit();
  vidrioInit();

  /* la tira de la mascota y su celda salen del horneado: escritas a mano acá,
     regenerar la hoja con otro tamaño la deja estirada sin que nada avise */
  const rz = document.documentElement.style;
  rz.setProperty('--masc', 'url(' + IMG_MASCOTA + ')');
  rz.setProperty('--mw-masc', MASC_W + 'px');
  rz.setProperty('--mh-masc', MASC_H + 'px');

  cargaApps();
  pintaInicio(); pintaDock();
  pintaReloj(); pintaBateria();
  setInterval(pintaReloj, 1000);
  setInterval(pintaBateria, 30000);

  enganchaLista($('#tira'));
  enganchaLista($('#dock'));
  enganchaLista($('#cajLista'));
  enganchaPaginas();
  enganchaCajon();

  /* ── EL CAMPO DEL ESCRITORIO ES UN BOTÓN ──
     Es `readonly`, así que en un teléfono no levanta el teclado sobre un cuadro
     que el cajón va a tapar: abre el cajón y le pasa el foco al de adentro, que
     es el único que recibe letras. Los 90 ms son lo que tarda la hoja en
     empezar a subir: enfocando en el mismo cuadro, Android abre el teclado
     contra un elemento que todavía está fuera de la pantalla y no lo enfoca. */
  const abreBusca = () => { verCajon(true); setTimeout(() => $('#busca2').focus(), 90); };
  $('#buscaCaja').addEventListener('pointerdown', abreBusca);
  $('#busca').addEventListener('focus', abreBusca);

  $('#busca2').addEventListener('input', e => {
    if (!CAJON) verCajon(true);
    pintaCajon(e.target.value);
    mascotaBaila(e.target.value.length > 0);
  });
  $('#busca2').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim(); if (!q) return;
    const v = APPS.filter(a => norm(a.n).indexOf(norm(q)) >= 0);
    /* Enter abre la primera coincidencia; sólo si no hay ninguna sale a la web,
       porque buscar «what» y terminar en Google en vez de en WhatsApp es lo
       contrario de lo que uno quiso. Para ir a la web a propósito está la fila. */
    if (v.length) abre(v[0].p);
    else aLaWeb(q);
  });

  $('#velo').addEventListener('pointerdown', cierraMenu);
  $('#mFijar').addEventListener('click', () => { if (MENU_PKG) alterna(MENU_PKG); cierraMenu(); });
  $('#mInfo').addEventListener('click', () => { if (MENU_PKG && HAY_AND) AND.info(MENU_PKG); cierraMenu(); });
  $('#mBorrar').addEventListener('click', () => { if (MENU_PKG && HAY_AND) AND.borrar(MENU_PKG); cierraMenu(); });

  /* ── MANTENER EL FONDO ABRE LOS AJUSTES DEL ESCRITORIO ──
     Es el gesto de siempre y la única forma de volver a cambiar de launcher sin
     ir a buscar el ajuste a mano. Va sobre `#hoja` —el hueco entre el widget y
     el dock— y no sobre el fondo: el fondo está en `z-index 0`, debajo de la
     capa, así que nunca recibiría un dedo. */
  let fl = null;
  $('#hoja').addEventListener('pointerdown', () => {
    fl = setTimeout(() => { vibra(20); if (HAY_AND) AND.elegirInicio(); else avisa(T('inicio')); }, 620);
  });
  const fc = () => { if (fl){ clearTimeout(fl); fl = null; } };
  $('#hoja').addEventListener('pointerup', fc);
  $('#hoja').addEventListener('pointermove', fc);

  document.addEventListener('visibilitychange', () => { CORRE = !document.hidden; });
  addEventListener('resize', () => { calculaFilas(); pintaInicio(); });
  addEventListener('contextmenu', e => e.preventDefault());

  setTimeout(() => $('#carga').classList.add('off'), 260);
  setTimeout(() => { const c = $('#carga'); if (c && c.parentNode) c.parentNode.removeChild(c); }, 900);
}
