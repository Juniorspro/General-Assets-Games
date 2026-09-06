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

  const pts = $('#puntos'); pts.innerHTML = '';
  for (let q = 0; q < NPAG; q++){
    const t = document.createElement('div');
    t.className = 'pt' + (q === PAG ? ' on' : '');
    pts.appendChild(t);
  }
  pts.style.visibility = NPAG > 1 ? 'visible' : 'hidden';
}
function ponPagina(n, suave){
  PAG = cl(n, 0, NPAG - 1);
  const t = $('#tira');
  t.style.transition = suave === false ? 'none' : 'transform .30s cubic-bezier(.22,.9,.24,1)';
  t.style.transform = 'translateX(' + (-PAG*(100/NPAG)) + '%)';
  $$('#puntos .pt').forEach((e, i) => e.classList.toggle('on', i === PAG));
}

function pintaDock(){
  const d = $('#dock'); d.innerHTML = '';
  for (const p of DOCK.slice(0, 4)){
    const a = POR_PKG[p]; if (!a) continue;
    d.appendChild(nodoApp(a, false));
  }
  d.style.visibility = DOCK.length ? 'visible' : 'hidden';
}

function pintaCajon(filtro){
  const l = $('#cajLista');
  const q = norm(filtro || '');
  /* ── EL NOMBRE MANDA Y EL PAQUETE ES LA RED ──
     Buscando por los dos a la vez, «mer» devolvía Cámara: `com.android.ca-MER-a2`
     lo contiene. Eso no es tolerancia, es ruido justo arriba del resultado que
     se estaba buscando. El paquete sólo entra cuando el nombre no encontró
     nada, que es cuando de verdad sirve (buscar «whatsapp» sin acordarse de
     cómo se llama el icono). */
  let v = APPS;
  if (q){
    v = APPS.filter(a => norm(a.n).indexOf(q) >= 0);
    if (!v.length) v = APPS.filter(a => norm(a.p).indexOf(q) >= 0);
  }
  l.innerHTML = '';
  for (const a of v) l.appendChild(nodoApp(a));
  if (!v.length){
    const e = document.createElement('div');
    e.style.cssText = 'grid-column:1/-1;text-align:center;opacity:.7;padding:28px 12px;font-size:14px';
    e.textContent = T('nada');
    l.appendChild(e);
  }
  $('#cajTit').textContent = q ? (v.length + ' · ' + T('todas')) : T('todas');
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
  if (CAJON){ $('#busca2').value = ''; pintaCajon(''); }
  else { $('#busca2').blur(); $('#busca').blur(); $('#cajLista').scrollTop = 0; }
}

/* ══════════ RELOJ Y BATERÍA ══════════ */
function dosD(n){ return n < 10 ? '0' + n : String(n); }
function pintaReloj(){
  const d = new Date();
  $('#hora').textContent = dosD(d.getHours()) + ':' + dosD(d.getMinutes());
  const t = TXT[LANG] || TXT.es;
  $('#fecha').innerHTML = t.dias[d.getDay()] + '<br>' + d.getDate() + ' ' + t.meses[d.getMonth()];
  $('#bIzq').textContent = dosD(d.getHours()) + ':' + dosD(d.getMinutes());
}
function pintaBateria(){
  if (!HAY_AND || !AND.bateria) return;
  try {
    const b = JSON.parse(AND.bateria());
    const n = b.n < 0 ? 100 : b.n;
    $('#batN').textContent = (b.c ? '⚡' : '') + n + '%';
    const f = $('#batLlena');
    f.style.width = n + '%';
    /* el color es información: rojo por debajo de 15 dice algo que el número
       solo no dice de una ojeada */
    f.style.background = b.c ? '#8fe3ff' : n <= 15 ? '#ff8b93' : n <= 30 ? '#ffd36e' : '#b8f078';
    f.style.boxShadow = '0 0 6px ' + f.style.background;
  } catch (e) {}
}

/* ══════════ CARGA ══════════ */
function cargaApps(){
  let bruto = '[]';
  if (HAY_AND){ try { bruto = AND.apps(); } catch (e){ bruto = '[]'; } }
  else bruto = JSON.stringify(APPS_DEMO);
  try { APPS = JSON.parse(bruto) || []; } catch (e){ APPS = []; }
  POR_PKG = {};
  for (const a of APPS) POR_PKG[a.p] = a;

  INICIO = (lee('inicio', null) || []).filter(p => POR_PKG[p]);
  DOCK = (lee('dock', null) || []).filter(p => POR_PKG[p]);

  /* ── LA PRIMERA VEZ SE SIEMBRA, NO SE DEJA VACÍO ──
     Un escritorio en blanco la primera vez que se instala un launcher se lee a
     que no funcionó. Se ponen las que el sistema declara como preferidas —
     teléfono, mensajes, cámara, navegador— y si no se encuentran, las primeras
     que haya sin ser del sistema. */
  if (!INICIO.length && !DOCK.length && APPS.length){
    const busca = pats => APPS.find(a => pats.some(q => a.p.indexOf(q) >= 0));
    const dock = [
      busca(['dialer', '.phone', 'contacts']),
      busca(['.mms', 'messaging', 'messages', 'whatsapp']),
      busca(['camera', 'gallery', 'photos']),
      busca(['chrome', 'browser', 'firefox'])
    ].filter(Boolean).map(a => a.p);
    DOCK = dock.slice(0, 4);
    INICIO = APPS.filter(a => !a.s && DOCK.indexOf(a.p) < 0).slice(0, 16).map(a => a.p);
    if (INICIO.length < 8) INICIO = APPS.filter(a => DOCK.indexOf(a.p) < 0).slice(0, 16).map(a => a.p);
    guarda('inicio', INICIO); guarda('dock', DOCK);
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
    /* ── ARRASTRAR PARA ARRIBA EN EL ESCRITORIO TAMBIÉN ABRE EL CAJÓN ──
       El tirador de abajo mide 120 px y comparte veinte con el dock, así que
       cerca de los iconos el gesto se lo lleva el dock. Éste es el gesto que la
       gente hace igual, funciona desde cualquier punto libre y no le saca nada
       a las páginas: el eje ya está decidido antes de llegar acá. */
    if (eje === 2 && y0 - e.clientY > 60){ ponPagina(PAG); verCajon(true); vibra(10); return; }
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
   El gesto se registra en el escritorio, en la fila de puntos y en el dock; el
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

/* el cajón: se sube arrastrando desde abajo y se baja arrastrando hacia abajo */
function enganchaCajon(){
  const caj = $('#cajon');
  enganchaSubir($('#puntos'));
  enganchaSubir($('#dock'));
  let cy = 0, cact = false, cmov = false;
  caj.addEventListener('pointerdown', e => {
    /* sólo arrastra si la lista está arriba de todo: si no, se roba el desplazamiento */
    cy = e.clientY; cact = $('#cajLista').scrollTop <= 0; cmov = false;
  });
  caj.addEventListener('pointermove', e => {
    if (!cact) return;
    const d = e.clientY - cy;
    if (d > 12){ cmov = true; caj.style.transition = 'none';
                 caj.style.transform = 'translateY(' + Math.min(d, innerHeight) + 'px)'; }
  });
  const cfin = e => {
    if (!cact) { return; }
    cact = false; caj.style.transition = '';
    if (cmov && e.clientY - cy > 90) verCajon(false);
    caj.style.transform = '';
  };
  caj.addEventListener('pointerup', cfin);
  caj.addEventListener('pointercancel', cfin);
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
  requestAnimationFrame(fondoBucle);
  vidrioInit();

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

  $('#busca2').addEventListener('input', e => { if (!CAJON) verCajon(true); pintaCajon(e.target.value); });
  $('#busca2').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim(); if (!q) return;
    const v = APPS.filter(a => norm(a.n).indexOf(norm(q)) >= 0);
    /* Enter abre la primera coincidencia; sólo si no hay ninguna sale a la web,
       porque buscar «what» y terminar en Google en vez de en WhatsApp es lo
       contrario de lo que uno quiso */
    if (v.length) abre(v[0].p);
    else if (HAY_AND) AND.buscarWeb(q);
    else avisa(T('web', q));
  });

  $('#velo').addEventListener('pointerdown', cierraMenu);
  $('#mFijar').addEventListener('click', () => { if (MENU_PKG) alterna(MENU_PKG); cierraMenu(); });
  $('#mInfo').addEventListener('click', () => { if (MENU_PKG && HAY_AND) AND.info(MENU_PKG); cierraMenu(); });
  $('#mBorrar').addEventListener('click', () => { if (MENU_PKG && HAY_AND) AND.borrar(MENU_PKG); cierraMenu(); });

  /* mantener el fondo abre los ajustes del escritorio: es el gesto de siempre y
     es la única forma de volver a cambiar de launcher sin ir a buscarlo */
  let fl = null;
  $('#lienzo').addEventListener('pointerdown', () => {
    fl = setTimeout(() => { vibra(20); if (HAY_AND) AND.elegirInicio(); else avisa(T('inicio')); }, 620);
  });
  const fc = () => { if (fl){ clearTimeout(fl); fl = null; } };
  $('#lienzo').addEventListener('pointerup', fc);
  $('#lienzo').addEventListener('pointermove', fc);

  document.addEventListener('visibilitychange', () => { CORRE = !document.hidden; });
  addEventListener('resize', () => { calculaFilas(); pintaInicio(); });
  addEventListener('contextmenu', e => e.preventDefault());

  setTimeout(() => $('#carga').classList.add('off'), 260);
  setTimeout(() => { const c = $('#carga'); if (c && c.parentNode) c.parentNode.removeChild(c); }, 900);
}
