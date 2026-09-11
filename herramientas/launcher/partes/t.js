
/* ════════════════════════════════════════════════════════════════════════════
   LO QUE LE FALTABA A UN LAUNCHER: ATAJOS, PUNTOS, OCULTAS, SUGERIDAS, GESTOS
   ════════════════════════════════════════════════════════════════════════════
   Seis funciones que no comparten código pero sí un criterio: ninguna pide un
   permiso nuevo. Los atajos usan uno que Android nos da POR SER la pantalla de
   inicio, los puntos salen del `Escucha` que ya estaba, el bloqueo usa la
   accesibilidad que ya estaba, y las sugeridas se cuentan solas — el launcher
   es el que abre cada app, así que ya sabe cuántas veces la abrió: pedir
   `PACKAGE_USAGE_STATS` para averiguar algo que uno mismo hizo es regalar una
   pantalla de permiso a cambio de nada. */

/* ══════════ 1 · LOS ATAJOS DE LA APP ══════════
   Mantener WhatsApp y que salgan «Chat nuevo» o «Cámara». Android sólo se los
   entrega al launcher por omisión, así que hay tres respuestas y no dos: los
   atajos de esta app, ninguno, y «no somos el launcher». La tercera NO se
   informa con un cartel: el menú ya tiene tres opciones útiles y un aviso de
   permiso arriba de ellas convertiría un menú que funciona en uno que se queja.

   La consulta es sincrónica a propósito y no es el defecto de la vuelta 128
   —`AND.baja()` esperando la red y congelando el hilo 45 s—: esto es una
   llamada Binder al servicio de atajos del propio sistema, sin red y sin
   disco. Lo mide `atajosCosto()`. */
let ATAJOS_OK = null;      /* null = todavía no se preguntó */
function atajosHay(){
  if (ATAJOS_OK === null) ATAJOS_OK = andQ('atajosOk') ? !!AND.atajosOk() : false;
  return ATAJOS_OK;
}
function atajosDe(pkg){
  if (!atajosHay() || !andQ('atajos')) return [];
  try { const v = JSON.parse(AND.atajos(pkg)); return Array.isArray(v) ? v : []; }
  catch (e){ return []; }
}
function atajosPinta(pkg){
  const c = $('#menuAt'); if (!c) return;
  c.innerHTML = ''; c.classList.remove('on');
  const v = atajosDe(pkg);
  if (!v.length) return;
  for (const a of v){
    const f = document.createElement('div');
    f.className = 'mat';
    const i = document.createElement('span'); i.className = 'ic'; i.textContent = '▸';
    const t = document.createElement('span'); t.textContent = a.t;
    f.appendChild(i); f.appendChild(t);
    f.addEventListener('click', () => {
      vibra(10);
      if (!AND.atajoAbrir(pkg, a.i)) avisa('✕');
      cierraMenu();
    });
    c.appendChild(f);
  }
  c.classList.add('on');
}

/* ══════════ 2 · LOS PUNTOS DE NOTIFICACIÓN ══════════
   El puntito sobre el icono. Sale del mismo servicio que alimenta la lista del
   centro de control, pero NO de `notis()`: ése arma título y texto de hasta
   veinticuatro notificaciones, o sea kilobytes de cadena construidos y cruzados
   por el puente para contar. `notiCuenta()` devuelve `paquete:cuántas`.

   ── Y SE REPINTA LO QUE CAMBIÓ, NO LA LISTA ──
   Con 150 apps, volver a pintar el cajón entero cada vez que llega un mensaje
   es rehacer 150 nodos para mover un punto. Se guarda la cuenta anterior y se
   tocan sólo los paquetes cuyo número se movió. */
let NOTI_N = {}, NOTI_T = 0, NOTI_NULL = 0;
const NOTI_MS = 6000;
/* ── EL PUNTO VA EN `.ap` Y NO EN LA BALDOSA, Y NO ES UNA PREFERENCIA ──
   `.baldosa` lleva `overflow:hidden` —es lo que recorta el icono del sistema al
   canto redondeado— así que un punto que asoma por el borde sale CORTADO: en la
   primera captura se veía media luna cian en la esquina. Colgado de `.ap`, que
   ya es `position:relative`, el punto queda entero; su sitio sale de la
   geometría de la baldosa (centrada, de ancho `--ico`, bajo 8 px de relleno),
   así que sigue al tamaño de icono que el dueño haya elegido. */
function insigniaPon(nodo, pkg){
  const n = NOTI_N[pkg] | 0;
  let e = nodo.querySelector('.insig');
  if (!n){ if (e) e.remove(); return; }
  if (!e){ e = document.createElement('i'); e.className = 'insig'; nodo.appendChild(e); }
  /* con una, el punto ya dice que hay algo y el «1» es ruido; con más, el
     número es la única forma de saber si vale la pena entrar */
  e.classList.toggle('pto', n < 2);
  e.textContent = n < 2 ? '' : (n > 99 ? '99+' : String(n));
}
/* ── SE REPINTAN TODOS, Y REPINTAR SÓLO LO QUE CAMBIÓ SE PROBÓ Y SE SACÓ ──
   Parecía la optimización obvia: con 150 apps, mover un punto no puede costar
   tocar los ciento cincuenta nodos. Medido en el mismo binario, con el mismo
   mapa de cuentas: repintar sólo los tres que cambiaron **0,3 ms** y repintar
   los 154 **0,3 ms**. La misma cifra, porque un `querySelector('.baldosa')`
   sobre un nodo que ya está en memoria no cuesta nada.
   Lo que SÍ vale es la puerta de más arriba —salir sin tocar el DOM cuando el
   mapa no se movió—, que es el 99 % de los latidos: una notificación llega cada
   varios minutos y el latido pregunta cada seis segundos. */
function insigniasTodas(){
  $$('.ap').forEach(nd => { if (nd.dataset.p) insigniaPon(nd, nd.dataset.p); });
  /* los nodos del cajón guardados en `CAJ_NODO` pueden estar fuera del
     documento —la lista se rehace en cada letra que se escribe— así que un
     barrido del DOM se los pierde y el punto no aparecería al volver a pintar */
  if (typeof CAJ_NODO !== 'undefined' && CAJ_NODO.forEach){
    CAJ_NODO.forEach((nd, p) => { if (!nd.isConnected) insigniaPon(nd, p); });
  }
}
function insigniasLee(){
  if (!andQ('notiCuenta')) return;
  let m;
  try { m = JSON.parse(AND.notiCuenta()); } catch (e){ return; }
  /* ── `null` ES «EL SERVICIO NO ESTÁ», Y NO SE LE CREE A LA PRIMERA ──
     Android reengancha el listener cada tanto por su cuenta, así que un null
     suelto es un parpadeo: borrar los puntos ahí los apaga y los prende sin que
     haya pasado nada. Dos seguidos —doce segundos— ya no es un reenganche, es
     que el permiso se cayó, y ahí unos puntos que nunca se van son peores. */
  if (!m || typeof m !== 'object'){
    if (++NOTI_NULL < 2) return;
    m = {};
  } else NOTI_NULL = 0;
  let hay = false;
  for (const p in m) if ((NOTI_N[p] | 0) !== m[p]){ hay = true; break; }
  if (!hay) for (const p in NOTI_N) if (!(p in m)){ hay = true; break; }
  NOTI_N = m;
  if (hay) insigniasTodas();
}
/* ── EL RITMO NO ES UN TEMPORIZADOR A SECAS ──
   Con la pantalla apagada o el launcher en segundo plano, preguntar cada seis
   segundos es batería regalada por un punto que nadie está mirando. Y volver
   de una app es JUSTO cuando llegó la notificación que hay que mostrar, así que
   ahí se pregunta sin esperar el turno. */
function insigniasLatido(){
  if (document.hidden || !lee('insig', 1)) return;
  const t = Date.now();
  if (t - NOTI_T < NOTI_MS - 200) return;
  NOTI_T = t; insigniasLee();
}
function insigniasApaga(){
  NOTI_N = {};
  $$('.insig').forEach(e => e.remove());
  if (typeof CAJ_NODO !== 'undefined' && CAJ_NODO.forEach){
    CAJ_NODO.forEach(nd => { const e = nd.querySelector('.insig'); if (e) e.remove(); });
  }
}

/* ══════════ 3 · LAS APPS OCULTAS ══════════
   ── OCULTAR TAMBIÉN DESFIJA, y no es un extra ──
   Una app «oculta» que sigue en el escritorio no está oculta: está oculta en el
   único sitio donde no molestaba. El cajón es la lista completa; el escritorio
   es lo que uno eligió. */
let OCULTAS = lee('ocultas', []);
function ocultaEs(p){ return OCULTAS.indexOf(p) >= 0; }
function ocultaAlterna(p){
  const i = OCULTAS.indexOf(p);
  if (i >= 0){ OCULTAS.splice(i, 1); avisa(T('oMostrada')); }
  else {
    OCULTAS.push(p);
    const a = INICIO.indexOf(p); if (a >= 0) INICIO.splice(a, 1);
    const b = DOCK.indexOf(p);   if (b >= 0) DOCK.splice(b, 1);
    guarda('inicio', INICIO); guarda('dock', DOCK);
    pintaInicio(); pintaDock();
    avisa(T('oOculta'));
  }
  guarda('ocultas', OCULTAS);
  cajCacheLimpia();
  pintaCajon('');
}

/* ══════════ 4 · LAS SUGERIDAS ══════════
   Las cuatro que más se abren, arriba del cajón. El launcher cuenta sus propias
   aperturas: cero permisos y cero llamadas al sistema.

   ── Y OLVIDA, PORQUE SI NO ES UN MUSEO ──
   Sin olvido, la app que se usó cien veces hace tres meses gana para siempre y
   la fila deja de describir lo que uno hace HOY. Cada `USOS_OLV` aperturas todo
   se multiplica por 0,72: una app que se dejó de usar cae a la mitad en unas
   ciento setenta aperturas y sale sola de la fila. */
let USOS = lee('usos', {}), USOS_N = lee('usosN', 0);
const USOS_OLV = 60, USOS_MIN = 8, USOS_CUANTAS = 4;
function usoAnota(p){
  if (!p) return;
  USOS[p] = (USOS[p] || 0) + 1;
  if (++USOS_N >= USOS_OLV){
    USOS_N = 0;
    for (const k in USOS){
      const v = USOS[k] * 0.72;
      /* lo que ya no vale ni media apertura se borra: sin esta poda el objeto
         guarda para siempre cada app que se abrió una vez */
      if (v < 0.5) delete USOS[k]; else USOS[k] = v;
    }
  }
  guarda('usos', USOS); guarda('usosN', USOS_N);
}
function usoTop(n){
  let tot = 0; for (const k in USOS) tot += USOS[k];
  if (tot < USOS_MIN) return [];        /* recién instalado la fila sería ruido */
  return Object.keys(USOS)
    .filter(p => POR_PKG[p] && !ocultaEs(p))
    .sort((a, b) => USOS[b] - USOS[a])
    .slice(0, n)
    .map(p => POR_PKG[p]);
}
function sugPinta(filtro){
  const c = $('#cajSug'); if (!c) return;
  /* con un filtro escrito, la fila compite con los resultados de la búsqueda
     por el mismo pulgar y por el mismo sitio de la pantalla */
  const v = (filtro || !lee('sug', 1)) ? [] : usoTop(USOS_CUANTAS);
  c.classList.toggle('on', v.length >= USOS_CUANTAS);
  if (v.length < USOS_CUANTAS) return;
  $('#cajSugT').textContent = T('sugTit');
  const r = $('#cajSugR'); r.innerHTML = '';
  for (const a of v){
    const nd = nodoApp(a);
    insigniaPon(nd, a.p);
    r.appendChild(nd);
  }
}

/* ══════════ 5 · DOBLE TOQUE PARA BLOQUEAR ══════════
   El gesto clásico, y no necesita nada nuevo: la acción es la misma que el
   botón «Bloquear» del centro de control. Lo único propio es distinguir dos
   toques de uno — y de un mantener, que en `#hoja` ya abre los ajustes del
   escritorio a los 620 ms. No chocan: un toque suelta mucho antes.

   Sin el permiso de accesibilidad NO se queda callado. Un gesto que no hace
   nada se lee a launcher roto; con el aviso se lee a que falta un permiso, que
   es una cosa que se puede arreglar. */
let DTAP_T = 0;
const DTAP_MS = 300;
function dobleToque(){
  if (!lee('dtap', 1)) return false;
  const t = Date.now();
  if (t - DTAP_T < DTAP_MS){
    DTAP_T = 0;
    if (andQ('accesAccion') && AND.accesOk()){ vibra(22); AND.accesAccion('bloquear'); }
    else avisa(T('dtapFalta'));
    return true;
  }
  DTAP_T = t;
  return false;
}

/* ══════════ 6 · COPIA DE SEGURIDAD ══════════
   ── LA FOTO PROPIA NO ENTRA, Y ES UNA CUENTA ──
   Un fondo propio son cientos de kilobytes en base64; el resto de los ajustes
   junto con el escritorio entero son unos pocos miles de caracteres. Metida
   adentro, el texto deja de poder copiarse a mano y encima puede no entrar en
   la cuota al restaurarlo, que es justo el momento en que fallar duele más.

   ── Y VA EN UN CUADRO DE TEXTO, NO EN EL PORTAPAPELES NI EN UN `prompt` ──
   `prompt()` en un WebView sin `onJsPrompt` devuelve null sin avisar, y el
   portapapeles pide permisos que en un WebView no siempre están. Un textarea
   funciona en los dos y encima deja VER lo que se va a restaurar. */
const COPIA_NO = { fondoPropio: 1, cajFrost: 1 };
function copiaArma(){
  const o = {};
  try {
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (!k || k.indexOf('aero_') !== 0) continue;
      const n = k.slice(5);
      if (COPIA_NO[n]) continue;
      o[n] = localStorage.getItem(k);
    }
  } catch (e){ return ''; }
  return JSON.stringify({ v: 1, d: o });
}
function copiaPone(txt){
  let j;
  try { j = JSON.parse(txt); } catch (e){ return false; }
  if (!j || j.v !== 1 || !j.d || typeof j.d !== 'object') return false;
  /* ── SE VALIDA ENTERA ANTES DE BORRAR NADA ──
     Restaurar borra los ajustes de ahora; si la copia resultara mala a mitad de
     camino, lo que queda es media configuración y ninguna forma de volver. */
  const pares = [];
  for (const k in j.d){
    if (COPIA_NO[k]) continue;
    /* las claves llegan de un texto que alguien pegó: una con caracteres raros
       no puede ensuciar otro origen ni otra app —`localStorage` es del propio
       origen— pero sí puede llenar la cuota, así que se descarta lo que no
       tiene forma de clave nuestra */
    if (!/^[A-Za-z0-9_.-]{1,40}$/.test(k)) continue;
    pares.push([k, String(j.d[k])]);
  }
  if (!pares.length) return false;
  /* ── Y RESTAURAR ES REEMPLAZAR, NO MEZCLAR ──
     Escribiendo sólo lo que la copia trae, un ajuste que se tocó DESPUÉS de
     sacarla sobrevive: el resultado no es el escritorio del que se sacó la
     copia sino una mezcla de los dos, que es exactamente lo que nadie pidió.
     La foto propia no se borra por lo mismo que no se copia: no está adentro,
     así que borrarla sería perderla sin poder devolverla. */
  const fuera = [];
  try {
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.indexOf('aero_') === 0 && !COPIA_NO[k.slice(5)]) fuera.push(k);
    }
    for (const k of fuera) localStorage.removeItem(k);
  } catch (e){}
  let n = 0;
  for (const [k, v] of pares){
    try { localStorage.setItem('aero_' + k, v); n++; } catch (e){}
  }
  return n > 0;
}
