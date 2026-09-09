/* ══════════════════ EL CENTRO DE CONTROL ══════════════════

   Pedido textual: «en vez del predeterminado hagas una barra de notificaciones
   súper líquid glass y guíate de las imágenes que te pasé». Las nueve capturas
   son el centro de control de HyperOS: la hora grande arriba, dos deslizadores
   de vidrio para el brillo y el volumen, y una reja de interruptores redondos.

   ── UN INTERRUPTOR O HACE LA COSA O ABRE DONDE SE HACE, Y SE VE DISTINTO ──
   Desde Android 10 una app normal NO puede prender el wifi, los datos ni el
   bluetooth. Un interruptor que finge que prendió algo y no prendió nada es lo
   peor que puede tener un centro de control, porque el dueño se entera recién
   cuando algo no le anda. Los que se pueden hacer de verdad —linterna, volumen,
   brillo— son LLAVES y se encienden; los otros son ATAJOS, llevan la flechita y
   abren el panel del sistema donde sí se hacen.

   ── Y SIN PUENTE SE VE IGUAL ──
   Abierto en un navegador no hay linterna ni volumen que mover, así que las
   llaves guardan su estado y nada más: el centro se puede mirar y medir entero
   sin un teléfono, que es lo que hace que estas líneas se puedan probar. */

const CC = { on: false, brillo: 0.5, vol: 0.5, linterna: false, arr: null };

/* ── SE PREGUNTA POR EL MÉTODO, NO POR `HAY_AND` ──
   `HAY_AND` es un `const` que se calcula al evaluar el módulo y responde «hay
   un puente con `apps()`». Acá la pregunta es otra: si ESTE puente tiene la
   puerta de las notificaciones. Un APK viejo puede tener puente y no tenerla, y
   preguntando por `HAY_AND` el centro diría «no hay puente» cuando lo que falta
   es un método — que se arregla actualizando la app, no habilitando nada. */
function andQ(m){
  return (typeof AND !== 'undefined' && AND && typeof AND[m] === 'function') ? AND : null;
}

/* `llave` es lo que se puede hacer de verdad desde acá; el resto son atajos.
   `sis` es el nombre que entiende `Puente.panel`. */
const CC_BOT = [
  { id: 'wifi',      ico: 'wifi',      llave: false, sis: 'wifi' },
  { id: 'datos',     ico: 'datos',     llave: false, sis: 'datos' },
  { id: 'bt',        ico: 'bt',        llave: false, sis: 'bt' },
  { id: 'linterna',  ico: 'linterna',  llave: true },
  { id: 'avion',     ico: 'avion',     llave: false, sis: 'avion' },
  { id: 'rotar',     ico: 'rotar',     llave: false, sis: 'rotar' },
  { id: 'dnd',       ico: 'dnd',       llave: false, sis: 'dnd' },
  { id: 'ubicacion', ico: 'ubicacion', llave: false, sis: 'ubicacion' },
  { id: 'bateria',   ico: 'bateria',   llave: false, sis: 'bateria' },
  { id: 'nfc',       ico: 'nfc',       llave: false, sis: 'nfc' },
  { id: 'ajustes',   ico: 'ajustes',   llave: false, sis: 'ajustes' },
  { id: 'cam',       ico: 'camara',    llave: false, cam: true },
  /* ── LOS CUATRO QUE LA ACCESIBILIDAD CONVIERTE EN ACCIONES DE VERDAD ──
     Pedido textual: «que pida accesos a accesibilidad para que sirva la barra
     de notificaciones». Un launcher no puede bajar la barra del sistema ni
     bloquear la pantalla de ninguna otra forma: `performGlobalAction` es la
     única puerta, y está detrás de ese permiso.
     No llevan la marca ↗ —no abren un panel de ajustes, HACEN la cosa— y
     tampoco son `llave`, porque una llave guarda estado y esto no guarda nada.
     Sin el permiso NO se quedan mudas: llevan la marca `acc` y tocarlas abre
     la pantalla donde se da, que es lo único útil que pueden hacer ahí. */
  { id: 'barra',     ico: 'campana',   llave: false, acc: 'notis' },
  { id: 'rapidos',   ico: 'gauge',     llave: false, acc: 'rapidos' },
  { id: 'recientes', ico: 'capas',     llave: false, acc: 'recientes' },
  { id: 'bloquear',  ico: 'candado',   llave: false, acc: 'bloquear' }
];

/* los dibujos: los mismos `<path>` del pack de iconos, que ya sabe dibujar
   estos doce símbolos. Dos vocabularios de dibujo para lo mismo se leen a dos
   cosas distintas puestas una al lado de la otra. */
function ccIco(k){
  const g = (typeof GLIFOS !== 'undefined' && GLIFOS[k]) ? k : 'ajustes';
  const sv = (typeof glifoSvg === 'function') ? glifoSvg(g, { relieve: false, glifo: '#fff' }) : null;
  if (sv) sv.classList.add('ccGl');
  return sv;
}

function ccArma(){
  if ($('#cc')) return;
  const d = document.createElement('div');
  d.id = 'cc';
  d.innerHTML =
    '<div id="ccHoja" class="vid">' +
      '<div id="ccTop"><div id="ccHora"></div><div id="ccFecha"></div>' +
        '<div id="ccBat"></div></div>' +
      '<div id="ccSlids">' +
        '<div class="ccSl" data-k="brillo"><i class="ccSlF"></i><span class="ccSlI"></span></div>' +
        '<div class="ccSl" data-k="vol"><i class="ccSlF"></i><span class="ccSlI"></span></div>' +
      '</div>' +
      '<div id="ccReja"></div>' +
      '<div id="ccNotis"></div>' +
      '<div id="ccPie"></div>' +
      '<div id="ccManija"><i></i></div>' +
    '</div>';
  document.body.appendChild(d);
  /* ── EL VIDRIO SE LE PONE A MANO, Y ÉSA ES LA LECCIÓN DE LA VUELTA 123 ──
     `vidrioInit()` corre al arrancar y esta hoja se crea después, así que la
     clase `vid` sola la dejaba con el `url(#refr)` del CSS —un filtro que
     `vidrioInit` ya había borrado— y una referencia inválida NO degrada: apaga
     el `backdrop-filter` entero. Es lo que dejó a las tarjetas de widget sin
     vidrio dos vueltas enteras. */
  if (typeof vidrioPieza === 'function') vidrioPieza($('#ccHoja'));

  const r = $('#ccReja');
  for (const b of CC_BOT){
    const e = document.createElement('div');
    /* ── LA MARCA ↗ DICE «ESTO ABRE EL PANEL DEL SISTEMA» Y NADA MÁS ──
       Estaba puesta en todo lo que no fuera llave, así que la cámara —que abre
       la cámara de la casa, adentro del launcher— salía con la flecha: la marca
       prometía un salto al sistema que no pasa. La lleva sólo lo que tiene
       `sis`. */
    e.className = 'ccB' + (b.llave ? ' llave' : b.acc ? ' acc' : (b.sis ? ' atajo' : ''));
    e.dataset.id = b.id;
    const sv = ccIco(b.ico);
    if (sv) e.appendChild(sv);
    const t = document.createElement('span'); t.className = 'ccT';
    e.appendChild(t);
    e.addEventListener('click', () => ccToca(b));
    r.appendChild(e);
  }
  /* los dos deslizadores: el dedo va sobre la pastilla entera, no sobre un
     `<input type=range>` de 4 px — en un teléfono eso es imposible de agarrar */
  $$('#cc .ccSl').forEach(el => ccEnganchaSl(el));
  $('#ccManija').addEventListener('click', ccCierra);
  d.addEventListener('click', e => { if (e.target === d) ccCierra(); });
  ccEnganchaBajar(d);
}

function ccEnganchaSl(el){
  const k = el.dataset.k;
  let act = false;
  const pon = e => {
    const r = el.getBoundingClientRect();
    const v = cl((e.clientX - r.left) / Math.max(1, r.width), 0, 1);
    CC[k] = v; ccPintaSl();
    if (k === 'vol' && andQ('volumen')) AND.volumen(v);
    if (k === 'brillo' && andQ('brillo')) AND.brillo(v);
  };
  el.addEventListener('pointerdown', e => { act = true; el.setPointerCapture && el.setPointerCapture(e.pointerId); pon(e); });
  el.addEventListener('pointermove', e => { if (act) pon(e); });
  const f = () => { act = false; };
  el.addEventListener('pointerup', f);
  el.addEventListener('pointercancel', f);
}

/* ── SE CIERRA CON EL MISMO GESTO CON EL QUE SE ABRE, AL REVÉS ──
   Un panel que se abre arrastrando y se cierra sólo con un botón se siente a
   dos mecanismos distintos. */
function ccEnganchaBajar(el){
  let y0 = 0, act = false;
  el.addEventListener('pointerdown', e => { y0 = e.clientY; act = true; });
  el.addEventListener('pointermove', e => {
    if (!act) return;
    if (y0 - e.clientY > 55){ act = false; ccCierra(); }
  });
  const f = () => { act = false; };
  el.addEventListener('pointerup', f);
  el.addEventListener('pointercancel', f);
}

function ccToca(b){
  vibra(12);
  if (b.cam){ ccCierra(); setTimeout(camAbre, 220); return; }
  if (b.acc){
    /* el centro se cierra ANTES: bajar la barra del sistema con nuestra hoja
       encima deja dos paneles apilados, y bloquear la pantalla con el centro
       abierto lo deja abierto para la próxima vez */
    ccCierra();
    if (accEstado() === 'ok'){
      setTimeout(() => { if (andQ('accesAccion')) AND.accesAccion(b.acc); }, 180);
    } else accPide();
    return;
  }
  if (b.llave){
    if (b.id === 'linterna'){
      CC.linterna = !CC.linterna;
      if (andQ('linterna') && !AND.linterna(CC.linterna)) CC.linterna = false;
      ccPinta();
    }
    return;
  }
  /* un atajo CIERRA el centro: deja al dueño mirando el panel del sistema, no
     el panel del sistema debajo de nuestra hoja */
  ccCierra();
  if (andQ('panel')) AND.panel(b.sis || 'ajustes');
  else avisa(T('ccAtajo', T('cc_' + b.id)));
}

/* ══════════ LAS NOTIFICACIONES ══════════

   ── UNA LISTA VACÍA Y «FALTÁS HABILITARME» NO SON LO MISMO ──
   Android no le cuenta las notificaciones a nadie que el dueño no haya
   habilitado a mano en una pantalla del sistema, así que sin ese permiso la
   lista siempre está vacía. Mostrándola vacía se lee a «no tenés
   notificaciones», que es falso y encima no dice qué hacer. Son tres estados y
   se distinguen: sin puente, sin permiso, y con permiso y nada que mostrar.

   ── Y NO SE GUARDA UNA COPIA ──
   Se le pregunta al servicio cada vez que el centro se abre. Una lista propia
   se desincroniza en cuanto el dueño descarta algo desde otra parte, y una
   lista desincronizada muestra mensajes que ya no existen. */
function ccNotisEstado(){
  if (!andQ('notis')) return 'sinPuente';
  if (andQ('notiHabilitado') && !AND.notiHabilitado()) return 'sinPermiso';
  if (andQ('notiOk') && !AND.notiOk()) return 'esperando';
  return 'ok';
}

/* ══════════ LA ACCESIBILIDAD ══════════

   ── NO ES EL MISMO PERMISO QUE LAS NOTIFICACIONES, Y HAY QUE DECIRLO ──
   Las notificaciones las LEE `Escucha`, que es un `NotificationListenerService`
   y tiene su propia pantalla. La accesibilidad no lee ninguna: lo que hace es
   BAJAR la barra del sistema, abrir los ajustes rápidos, ver recientes y
   bloquear la pantalla — las cuatro cosas que un launcher no puede hacer de
   ninguna otra manera. Un cartel que los mezclara mandaría al dueño a dar un
   permiso que no arregla lo que está viendo.

   Los mismos cuatro estados que la lista de notificaciones, y por lo mismo:
   habilitado no es enlazado, y volver a pedirle el permiso a alguien que ya lo
   dio es lo peor que se puede hacer. */
function accEstado(){
  if (!andQ('accesAccion')) return 'sinPuente';
  if (andQ('accesHabilitado') && !AND.accesHabilitado()) return 'sinPermiso';
  if (andQ('accesOk') && !AND.accesOk()) return 'esperando';
  return 'ok';
}
function accPide(){
  if (andQ('accesPedir')) AND.accesPedir();
  else avisa(T('aSinPuente'));
}

function ccHace(ms){
  const m = Math.max(0, Math.round((Date.now() - ms)/60000));
  if (m < 1) return T('nAhora');
  if (m < 60) return T('nMin', m);
  return T('nHora', Math.round(m/60));
}

/* el aviso de accesibilidad va ARRIBA del de notificaciones y sólo cuando
   falta: son dos permisos y el dueño tiene que poder ver cuál le falta sin
   adivinar. Con los dos dados no se dibuja ninguno de los dos. */
function ccAcces(c){
  const est = accEstado();
  if (est === 'ok') return;
  const f = document.createElement('div');
  f.className = 'ccAviso';
  const t = document.createElement('span');
  t.textContent = T(est === 'sinPermiso' ? 'aPide' : est === 'esperando' ? 'aEspera' : 'aSinPuente');
  f.appendChild(t);
  if (est === 'sinPermiso'){
    const b = document.createElement('button');
    b.className = 'ccBt'; b.textContent = T('nPermitir');
    b.addEventListener('click', () => { ccCierra(); accPide(); });
    f.appendChild(b);
  }
  c.appendChild(f);
}

function ccNotis(){
  const c = $('#ccNotis'); if (!c) return;
  c.innerHTML = '';
  ccAcces(c);
  const est = ccNotisEstado();
  if (est !== 'ok'){
    const f = document.createElement('div');
    f.className = 'ccAviso';
    const t = document.createElement('span');
    t.textContent = T(est === 'sinPermiso' ? 'nPide' : est === 'esperando' ? 'nEspera' : 'nSinPuente');
    f.appendChild(t);
    if (est === 'sinPermiso'){
      const b = document.createElement('button');
      b.className = 'ccBt'; b.textContent = T('nPermitir');
      b.addEventListener('click', () => { ccCierra(); if (andQ('notiPedir')) AND.notiPedir(); });
      f.appendChild(b);
    }
    c.appendChild(f);
    return;
  }
  let lista = [];
  try { lista = JSON.parse(AND.notis()) || []; } catch (e) { lista = []; }
  if (!lista.length){
    const v = document.createElement('div');
    v.className = 'ccVacio'; v.textContent = T('nVacio');
    c.appendChild(v);
    return;
  }
  const cab = document.createElement('div');
  cab.className = 'ccNCab';
  const ct = document.createElement('span'); ct.textContent = T('nTit');
  cab.appendChild(ct);
  const lb = document.createElement('button');
  lb.className = 'ccNLimpia'; lb.textContent = T('nLimpiar');
  lb.addEventListener('click', () => { if (andQ('notiLimpiar')) AND.notiLimpiar(); ccNotis(); });
  cab.appendChild(lb);
  c.appendChild(cab);

  for (const n of lista){
    const f = document.createElement('div');
    f.className = 'ccN';
    /* el icono de la app va por el MISMO camino que el del cajón —
       `shouldInterceptRequest`— así que no cruza el puente en base64 */
    const im = document.createElement('img');
    im.className = 'ccNIco'; im.src = iconoUrl(n.p); im.alt = '';
    im.onerror = () => { im.style.visibility = 'hidden'; };
    f.appendChild(im);
    const cuerpo = document.createElement('div'); cuerpo.className = 'ccNTxt';
    const t1 = document.createElement('div'); t1.className = 'ccNT';
    const app = POR_PKG[n.p] ? POR_PKG[n.p].n : n.p;
    t1.textContent = (n.t || app) + ' · ' + ccHace(n.ms);
    const t2 = document.createElement('div'); t2.className = 'ccNX';
    t2.textContent = n.x || app;
    cuerpo.appendChild(t1); cuerpo.appendChild(t2);
    f.appendChild(cuerpo);
    f.addEventListener('click', () => {
      ccCierra();
      if (!(andQ('notiAbrir') && AND.notiAbrir(n.k)) && andQ('abrir')) AND.abrir(n.p);
    });
    if (n.quita){
      const x = document.createElement('button');
      x.className = 'ccNX2'; x.textContent = '×';
      x.addEventListener('click', e => {
        e.stopPropagation();
        if (andQ('notiQuitar')) AND.notiQuitar(n.k);
        ccNotis();
      });
      f.appendChild(x);
    }
    c.appendChild(f);
  }
}

function ccLee(){
  if (!andQ('estadoSis')) return;
  try {
    const e = JSON.parse(AND.estadoSis());
    if (typeof e.vol === 'number') CC.vol = e.vol;
    if (typeof e.brillo === 'number') CC.brillo = e.brillo;
    CC.linterna = !!e.linterna;
  } catch (x) { }
}

function ccPintaSl(){
  $$('#cc .ccSl').forEach(el => {
    const v = CC[el.dataset.k];
    el.querySelector('.ccSlF').style.width = (v*100).toFixed(1) + '%';
    el.querySelector('.ccSlI').textContent = el.dataset.k === 'vol' ? '🔊' : '☀';
  });
}

function ccPinta(){
  const d = new Date();
  $('#ccHora').textContent = ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
  /* la misma tabla de días y meses que el widget del reloj: dos formateadores
     para la misma fecha terminan diciendo cosas distintas */
  const t = TXT[LANG] || TXT.es;
  $('#ccFecha').textContent = t.dias[d.getDay()] + ' ' + d.getDate() + ' ' + t.meses[d.getMonth()];
  /* la misma lectura que la ficha de arriba: `BAT_ULT` es lo último que dijo el
     puente, así que el centro y el escritorio no pueden decir dos porcentajes */
  $('#ccBat').textContent = (typeof BAT_ULT !== 'undefined' && BAT_ULT)
    ? ((BAT_ULT.c ? '\u26a1' : '') + BAT_ULT.n + ' %') : '';
  ccPintaSl();
  ccNotis();
  for (const b of CC_BOT){
    const e = $('#cc .ccB[data-id="' + b.id + '"]'); if (!e) continue;
    e.querySelector('.ccT').textContent = T('cc_' + b.id);
    if (b.acc) e.classList.toggle('falta', accEstado() !== 'ok');
    e.classList.toggle('on', b.id === 'linterna' && CC.linterna);
  }
  $('#ccPie').textContent = T('ccPie');
}

/* ── LA HOJA VIAJA 340 ms Y ESO SE MARCA EN EL `body` ──
   `ccMueve` es lo que apaga el vidrio mientras la hoja cruza la pantalla y lo
   que mantiene la deriva de la foto pausada durante los DOS viajes. `ccQ` es
   la hoja ya asentada. Los dos caminos —abrir y cerrar— pasan por la misma
   función, porque repartidos se desincronizan el día que se toque uno. */
let CC_T = 0;
/* al CERRAR el vidrio del escritorio vuelve TARDE, con todo quieto: sacándolo
   en el cuadro en que la hoja termina de subir, las tres piezas encienden sus
   96.401 px de desenfoque y sus tres filtros de SVG de golpe. Es el escalón que
   la vuelta 135 midió en el cajón, y acá estaba igual. */
const CC_MUEVE_MS = 360, CC_VUELVE_MS = 190;
function ccMueve(abre){
  const c = document.body.classList;
  c.add('ccMueve'); c.remove('ccQ');
  clearTimeout(CC_T);
  /* el medidor de cuadros del dueño cubre este viaje también: el banco dibuja
     por software y sus huecos van a vsync pase lo que pase, así que el único
     número que describe SU teléfono sale de acá. Y con rótulo propio, porque
     bajar el centro y subir el cajón no son el mismo viaje. */
  if (typeof medArranca === 'function') medArranca(abre ? 'pMedeCC' : 'pMedeCCS');
  CC_T = setTimeout(() => {
    c.remove('ccMueve');
    if (abre && CC.on) c.add('ccQ');
  }, CC_MUEVE_MS + (abre ? 0 : CC_VUELVE_MS));
  /* la medición se corta cuando la hoja se detuvo, no cuando el vidrio vuelve:
     lo que se está midiendo es el VIAJE. */
  setTimeout(() => { if (typeof medTermina === 'function') medTermina(); }, CC_MUEVE_MS);
}

function ccAbre(){
  if (CC.on) return;
  ccArma(); ccLee(); ccPinta();
  CC.on = true;
  ccMueve(true);
  /* ── `visibility` SE LEVANTA UN CUADRO ANTES DE ANIMAR ──
     Cambiando visibilidad y transformación en el mismo cuadro, la transición no
     tiene de dónde partir y la hoja aparece ya puesta. Es lo mismo que ya hacía
     falta con la clase `vivo` del fantasma del arrastre. */
  const e = $('#cc');
  e.style.visibility = 'visible';
  requestAnimationFrame(() => e.classList.add('on'));
  document.body.classList.add('cc');
}
function ccCierra(){
  if (!CC.on) return;
  CC.on = false;
  ccMueve(false);
  const e = $('#cc');
  e.classList.remove('on');
  /* y se baja recién cuando la hoja terminó de subir: bajándola en el acto, el
     cierre no se ve */
  setTimeout(() => { if (!CC.on) e.style.visibility = ''; }, 380);
  document.body.classList.remove('cc');
}
