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
function colorDe(p, al){
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h*31 + p.charCodeAt(i)) >>> 0;
  return al == null ? 'hsl(' + (h % 360) + ',72%,58%)'
                    : 'hsla(' + (h % 360) + ',72%,58%,' + al + ')';
}
/* ── LA BALDOSA DE LA INICIAL, CON LA TEXTURA DEBAJO ──
   El color va como una CAPA translúcida por encima de la textura y no como
   `background-color`: el color de fondo se pinta DEBAJO de la imagen, así que
   con la textura puesta el color no se vería y las treinta apps quedarían
   iguales. Con dos capas de `background-image` el orden es el que se escribe.
   Y `var(--bTex)` adentro de un estilo en línea es legal: si el estilo de icono
   está en «no», la variable vale `none` y queda sólo el color. */
function letraBaldosa(b, a){
  /* ── Y EL COLOR VA TRANSLÚCIDO ──
     Opaco taparía la textura entera y la opción de estilo de icono no se vería
     en ninguna app sin icono del sistema, que en la vista previa son todas. */
  const c = colorDe(a.p, .58);
  b.style.backgroundImage = 'linear-gradient(' + c + ',' + c + '), var(--bTex, none)';
  b.style.font = '700 26px system-ui';
  b.textContent = letraDe(a.n);
}

/* ── LA ENTRADA ESCALONADA ──
   Marca a los hijos con su índice y con la clase que dispara la animación. El
   escalón lo pone el CSS: acá sólo viaja el número, porque el índice es lo
   único que el JS sabe y la duración es una decisión de diseño.
   ── Y NO SE REANIMA LO QUE YA ESTABA ──
   `pintaInicio` corre en cada soltada de un arrastre: escalonando siempre, la
   reja entera volvería a entrar cada vez que se mueve un icono, que se lee a
   parpadeo y no a animación. */
/* ── UN SOLO REFLUJO PARA LA LISTA ENTERA, NO UNO POR BALDOSA ──
   Esto hacía `remove('entra') · void offsetWidth · add('entra')` DENTRO del
   bucle, y `offsetWidth` obliga al navegador a recalcular el layout ahí mismo.
   Con 150 apps eso son **150 recálculos de layout sincrónicos** en cada pintada
   de la lista — o sea en cada letra que se escribe en el buscador.
   La lectura sólo existe para que el navegador vea que la clase se fue y vuelva
   a disparar la animación, y para eso alcanza con UNA: se sacan todas, se lee
   una vez, y se ponen todas. Mismo efecto, un layout en vez de ciento cincuenta. */
/* ── SÓLO ENTRAN LOS QUE SE VEN ──
   Vuelta 131, con el video del teléfono: el cajón se quedaba 215 ms clavado a
   mitad de subida. Cada `.ap.entra` es una animación de `transform` y `opacity`
   y el compositor le da a cada una SU capa: con ciento cincuenta apps son ciento
   cincuenta capas que hay que reservar, rasterizar y subir a la GPU en el mismo
   cuadro en que la hoja empieza a moverse — a densidad 3, veinte megas de
   texturas para animar iconos que están a dos pantallas de distancia, debajo
   del borde. Los que no entran en la primera pantalla no se animan: llegan
   quietos, que es como se ve una lista al scrollearla. */
function entraJunta(cont, nodos, max){
  let i = 0;
  for (const n of cont.children){
    if (n.classList.contains('pag')){ i += entraJunta(n, nodos, max == null ? null : max - i); continue; }
    n.classList.remove('entra');
    if (max == null || i < max){ n.style.setProperty('--i', i); nodos.push(n); }
    i++;
  }
  return i;
}
function entraLista(cont, max){
  if (!cont) return 0;
  const nodos = [];
  const i = entraJunta(cont, nodos, max);
  if (nodos.length) void nodos[0].offsetWidth;   /* el único reflujo */
  for (const n of nodos) n.classList.add('entra');
  return i;
}
/* cuántas baldosas del cajón entran en una pantalla con aire: cuatro columnas
   por siete filas. Más que eso está debajo del borde y no lo ve nadie. */
const CAJ_ENTRA_MAX = 28;

function nodoApp(a, conNombre){
  const d = document.createElement('div');
  d.className = 'ap'; d.dataset.p = a.p;
  const b = document.createElement('div');
  b.className = 'baldosa';
  /* ── LOS TRES DEL LAUNCHER LLEVAN SU DEGRADADO Y NO LA TEXTURA ──
     Van en `backgroundImage` y no en el atajo `background`: el atajo repone a su
     valor inicial todo lo que no nombra, y ahí adentro está la textura de los
     iconos, que la pone el CSS. Es el mismo defecto que en la vuelta 118 dejó la
     flecha del botón de saltar embaldosada. */
  if (a.p === PERS_PKG){
    b.style.backgroundImage = 'linear-gradient(160deg,#ffd166,#e0704f)';
    b.style.font = '600 26px system-ui';
    b.textContent = '⚙';
  } else if (a.p === INI_PKG){
    b.style.backgroundImage = 'linear-gradient(160deg,#9ef0b8,#3f9e7a)';
    b.style.font = '600 26px system-ui';
    b.textContent = '⌂';
  } else if (a.p === CAM_PKG){
    /* su glifo sí está en el pack —es el de `camara`— pero el fondo tiene que
       ser el de la familia agua a propósito: es el mismo acuario que se ve
       detrás del visor, así que el icono anuncia lo que hay adentro. */
    if (!icoAero(b, 'com.android.camera2', 'camara')){
      b.style.backgroundImage = 'linear-gradient(160deg,#9fe8ff,#2f7fbe)';
      b.style.font = '600 26px system-ui';
      b.textContent = '◉';
    }
  } else if (a.p === ASIS_PKG){
    /* ── SU ICONO NO SE PIDE, SE DIBUJA ──
       `https://icono.aero/<paquete>` lo contesta el cliente del WebView leyendo
       las apps instaladas, y ésta no está instalada: devolvería 404 y caería a
       la baldosa con la inicial, o sea otra «A» igual a la de Aero. */
    b.style.backgroundImage = 'linear-gradient(160deg,#7fe3ff,#4f7fd8)';
    b.style.font = '600 30px system-ui';
    b.textContent = '✧';
  } else if (icoAero(b, a.p, a.n)){
    /* el pack Aero: el logo en blanco sobre el fondo de su familia. Se prueba
       ANTES que el icono del sistema porque es justo lo que el pedido dice —el
       logo de TikTok en blanco sobre agua— y porque el que no está en el pack
       cae solo al camino de siempre. */
  } else if (HAY_AND){
    const im = document.createElement('img');
    im.src = iconoUrl(a.p); im.alt = ''; im.draggable = false;
    im.onerror = () => { b.innerHTML = ''; letraBaldosa(b, a); };
    b.appendChild(im);
  } else letraBaldosa(b, a);
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

let INICIO_VISTO = false, DOCK_VISTO = false;
function pintaInicio(){
  calculaFilas();
  const porPag = COLS*FILAS;
  /* una carpeta no tiene paquete, así que lo que se filtra es la app que ya no
     está instalada — no la carpeta */
  const lista = INICIO.filter(x => esCarpeta(x) ? x.c.length : POR_PKG[x]);
  NPAG = Math.max(1, Math.ceil(lista.length/porPag));
  PAG = cl(PAG, 0, NPAG - 1);

  const tira = $('#tira');
  tira.innerHTML = '';
  for (let q = 0; q < NPAG; q++){
    const pg = document.createElement('div');
    pg.className = 'pag';
    for (let k = q*porPag; k < Math.min((q + 1)*porPag, lista.length); k++){
      const x = lista[k];
      /* ── EL ÍNDICE VIAJA EN EL NODO ──
         Arrastrar tiene que poder decir DE DÓNDE salió, y el paquete no alcanza:
         la misma app puede estar dos veces, y una carpeta no tiene paquete. */
      const nd = esCarpeta(x) ? nodoCarpeta(x, k) : nodoApp(POR_PKG[x]);
      nd.dataset.i = k;
      pg.appendChild(nd);
    }
    tira.appendChild(pg);
  }
  tira.style.width = (NPAG*100) + '%';
  $$('.pag').forEach(p => { p.style.flexBasis = (100/NPAG) + '%'; });
  ponPagina(PAG, false);
  if (!INICIO_VISTO){ INICIO_VISTO = true; entraLista(tira); }

}
function ponPagina(n, suave){
  PAG = cl(n, 0, NPAG - 1);
  if (typeof mascMira === 'function') mascMira();
  const t = $('#tira');
  t.style.transition = suave === false ? 'none' : 'transform .30s cubic-bezier(.22,.9,.24,1)';
  t.style.transform = 'translateX(' + (-PAG*(100/NPAG)) + '%)';
}

function pintaDock(){
  const d = $('#dock'); d.innerHTML = '';
  DOCK.slice(0, 4).forEach((x, k) => {
    const nd = esCarpeta(x) ? nodoCarpeta(x, k) : (POR_PKG[x] ? nodoApp(POR_PKG[x], false) : null);
    if (!nd) return;
    if (esCarpeta(x)) nd.querySelectorAll('.nom').forEach(e => e.remove());
    nd.dataset.i = k;
    d.appendChild(nd);
  });
  /* ── EL DOCK NO SIGUE LAS COLUMNAS DEL ESCRITORIO ──
     Desde que se le pueden pedir tres columnas, el dock —que tiene cuatro
     apps— se partía en DOS FILAS: medido, pasaba de 74 px de alto a 232. Un
     dock que se envuelve no es un dock. Sus columnas son cuántas apps tiene. */
  d.style.setProperty('--cols', Math.max(1, d.children.length));
  /* ── UN DOCK VACÍO SE ESCONDE POR CLASE Y NO EN LÍNEA ──
     Estaba como `style.visibility`, y un estilo en línea le gana a cualquier
     selector: con el cajón asentado, la regla de `body.cajQ` no lo alcanzaba y
     el dock seguía filtrando 36.096 px detrás de una hoja opaca. Es el mismo defecto que en la vuelta 123 dejó el vidrio sin
     recalibrar. */
  d.classList.toggle('vacio', !DOCK.length);
  if (!DOCK_VISTO){ DOCK_VISTO = true; entraLista(d); }
}

/* ── LA LETRA DE UNA APP ──
   Sale del nombre YA sin acentos, así que Ángela cae en la A y no en una
   sección aparte; lo que no empieza con letra va a «#», que es donde lo pone
   cualquier lista alfabética. */
function letraIni(a){
  const c = norm(a.n).charAt(0);
  return (c >= 'a' && c <= 'z') ? c.toUpperCase() : '#';
}

/* ── LAS BALDOSAS DEL CAJÓN SE GUARDAN, NO SE REHACEN EN CADA PINTADA ──
   `pintaCajon` rehacía las 150 baldosas en cada letra que se escribe en el
   buscador. Medido con 150 apps, la pintada entera costaba **68 ms** y **20 de
   esos** eran armar los nodos: crear el div, buscarle el glifo, pegarle el SVG
   y escribirle una data URI de quince kilobytes en `backgroundImage`.
   Y no hace falta: la baldosa de una app es siempre la misma hasta que cambia
   el pack o la lista de apps. Se guarda por paquete y la pintada pasa a ser
   apilar nodos que ya existen — de paso los escuchas de toque tampoco se
   vuelven a colgar.
   La caché es SÓLO del cajón: un nodo del DOM vive en un sitio y nada más, así
   que el escritorio y el dock arman los suyos.
   `CAJ_NODO` se declara en `b.js` y no acá: la limpia `ICO_CACHE_LIMPIA`, que
   vive en `k.js` —o sea que se evalúa ANTES— y un `let` leído antes de su línea
   no devuelve undefined: tira, y se lleva el módulo entero. */
function cajCacheLimpia(){ CAJ_NODO = new Map(); CAJ_ULT_Q = null; }
let LETRAS = [];          /* las letras que de verdad tienen apps */
let ANCLA = {};           /* letra → el nodo de su encabezado, para poder saltar */
let ANCLA_Y = [];         /* letra → su offsetTop medido, ver `midaAnclas` */

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
  LETRAS = []; ANCLA = {}; ANCLA_Y = []; PEDIDA = null;

  /* ── LOS ENCABEZADOS SÓLO EXISTEN SIN FILTRO ──
     Con dos resultados, partirlos en dos secciones de uno es ruido; y el riel
     no tiene a dónde saltar, así que también se esconde. */
  /* ── DOS FORMAS DE CAJÓN, Y EL RIEL SIRVE EN LAS DOS ──
     Pedido textual: «si querés que el cajón de apps sea todo así por letras o
     todo junto (que también debería servir el buscador lateral por letras
     solamente que está todo juntos y se resalta los que tienen esa letra)».
     Todo junto NO es «sin riel»: el ancla deja de ser el encabezado y pasa a
     ser la PRIMERA APP de cada letra, así que arrastrar el riel sigue llevando
     al mismo sitio — y encima enciende las de esa letra, que es lo único que
     un cajón sin encabezados puede mostrar. */
  const porLetra = !q && !!lee('cajLetras', 1);
  let ult = '';
  for (const a of v){
    const L = letraIni(a);
    if (!q && L !== ult){
      ult = L;
      if (porLetra){
        const h = document.createElement('div');
        h.className = 'let'; h.textContent = L; h.dataset.l = L;
        l.appendChild(h);
        LETRAS.push(L); ANCLA[L] = h;
      } else {
        LETRAS.push(L); ANCLA[L] = null;   /* se completa con su primera app */
      }
    }
    let nd = CAJ_NODO.get(a.p);
    if (!nd){ nd = nodoApp(a); CAJ_NODO.set(a.p, nd); cajObserva(nd); }
    else { nd.classList.remove('res'); delete nd.dataset.l; }
    if (!q){
      nd.dataset.l = L;
      if (!porLetra && !ANCLA[L]) ANCLA[L] = nd;
    }
    l.appendChild(nd);
  }
  l.classList.toggle('junto', !q && !porLetra);
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
  /* acá SÍ se escalona siempre: la lista se rehace al abrir el cajón y en cada
     letra que se escribe, o sea que cada pintada es una lista nueva */
  entraLista(l, CAJ_ENTRA_MAX);
  pintaRiel();
  CAJ_ULT_Q = q;
}

/* ── EL CAJÓN SE ARMA ANTES DE QUE ALGUIEN LO ABRA ──
   La primera apertura pagaba TODO en el cuadro del dedo: armar los ciento
   cincuenta nodos (130 ms medidos) y decodificar cada icono, que el navegador
   hace perezosamente al pintarlo — en el video del teléfono los iconos iban
   apareciendo de a uno durante trescientos milisegundos después de que la hoja
   ya estaba arriba. Las dos cosas se pagan en el ocio, con el cajón cerrado:
   los nodos se guardan en `CAJ_NODO` y `decode()` deja cada imagen lista en la
   caché. Así la primera apertura es igual a la segunda. */
let CAJ_PREP = 0;
function cajPrepara(){
  const ocio = fn => (typeof requestIdleCallback === 'function')
    ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 900);
  ocio(() => {
    if (CAJON) return;
    /* el vidrio de la hoja: se calcula una vez acá y el deslizamiento pasa a ser
       una traslación y nada más (ver `cajFrostHornea` en `c.js`) */
    cajFrostHornea();
    if (CAJ_ULT_Q !== '') pintaCajon('');
    /* el icono del sistema es un `<img>`; la celda de un pack va como
       `background-image` en línea sobre la baldosa (ver `icoAero`). Las dos se
       decodifican al pintarse, y las dos se pueden dejar listas: la caché de
       imágenes de Chrome se indexa por la URL, así que una `Image` con la misma
       data URI deja decodificada también la del fondo. */
    const urls = new Set();
    for (const im of document.querySelectorAll('#cajLista img')) if (im.src) urls.add(im.src);
    for (const b of document.querySelectorAll('#cajLista .baldosa')){
      const m = /url\(["']?(data:[^"')]+)["']?\)/.exec(b.style.backgroundImage || '');
      if (m) urls.add(m[1]);
    }
    const lista = [...urls];
    let k = 0;
    const tanda = () => {
      /* de a doce: `decode()` corre fuera del hilo, pero pedirlos todos juntos
         es una cola de ciento cincuenta decodificaciones peleándose la GPU */
      const fin = Math.min(lista.length, k + 12);
      for (; k < fin; k++){
        const im = new Image(); im.src = lista[k];
        if (im.decode) im.decode().then(() => { CAJ_PREP++; }, () => {});
      }
      if (k < lista.length) ocio(tanda);
    };
    tanda();
  });
}

/* ── EL VIDRIO DE LAS BALDOSAS SE ENCIENDE AL ENTRAR EN LA VENTANA ──
   Ver el porqué en `#cajLista .ap.lejos .baldosa`. Nace con `lejos` puesto: así
   la primera pintada del cajón —la que se paga al abrirlo— no arranca con
   ciento cincuenta pasadas de filtro, y el observador enciende las quince que
   de verdad se ven en el cuadro siguiente.
   Se observa UNA VEZ, al armar la baldosa, y no en cada pintada: la primera
   versión hacía `disconnect()` y ciento cincuenta `observe()` por pintada y eso
   se comía la mitad de lo que la caché de baldosas acababa de ahorrar —medido,
   la pintada subía de 32 a 55 ms—. Un observador sigue observando al elemento
   aunque se lo saque del documento y se lo vuelva a poner, que es exactamente
   lo que hace `pintaCajon` con los nodos guardados. */
let CAJ_IO = null;
function cajObserva(nd){
  if (typeof IntersectionObserver !== 'function') return;
  if (!CAJ_IO){
    const l = $('#cajLista'); if (!l) return;
    CAJ_IO = new IntersectionObserver(es => {
      for (const e of es) e.target.classList.toggle('lejos', !e.isIntersecting);
    }, { root: l, rootMargin: '260px 0px' });
  }
  nd.classList.add('lejos');
  CAJ_IO.observe(nd);
}

/* ══════════ LA BARRA DEL ÍNDICE ══════════ */
function pintaRiel(){
  /* con una sección sola no hay a dónde saltar */
  $('#riel').style.display = LETRAS.length > 1 ? 'flex' : 'none';
  ponPomo();
}

/* ── EL POMO MIDE LO QUE SE VE, NO UN ALTO FIJO ──
   Un pomo de tamaño constante miente sobre cuánto falta. El alto es la fracción
   de la lista que entra en la ventana, y su posición la fracción ya recorrida:
   así la barra dice de una ojeada dónde está uno, que es todo lo que una barra
   tiene que hacer. */
function ponPomo(){
  const l = $('#cajLista'), p = $('#rielPomo'), r = $('#riel');
  if (!p || r.style.display === 'none') return;
  const alto = r.clientHeight - 20;
  const vis = l.clientHeight / Math.max(1, l.scrollHeight);
  const h = Math.max(34, alto*vis);
  const max = Math.max(1, l.scrollHeight - l.clientHeight);
  const k = Math.min(1, l.scrollTop / max);
  p.style.height = h + 'px';
  p.style.top = (10 + k*(alto - h)) + 'px';
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
/* ── LOS OFFSETS DE LAS ANCLAS SE MIDEN UNA VEZ, NO EN CADA CUADRO ──
   Esto medía `getBoundingClientRect()` de las veintiuna anclas en CADA evento
   de scroll, y cada una obliga al navegador a recalcular el layout. Medido con
   150 apps, el manejador entero costaba **3,1 ms por cuadro** sobre un
   presupuesto de 16,7.
   Y las anclas no se mueven mientras uno scrollea: su `offsetTop` respecto de
   la lista es fijo hasta que la lista se vuelva a pintar o cambie de tamaño.
   Se cachean ahí y acá no queda una sola lectura de layout. */
function midaAnclas(){
  ANCLA_Y = LETRAS.map(L => ({ L: L, y: ANCLA[L] ? ANCLA[L].offsetTop : 0 }));
}
function letraVisible(){
  const l = $('#cajLista');
  if (PEDIDA && alFondo() && LETRAS.indexOf(PEDIDA) >= 0) return PEDIDA;
  if (ANCLA_Y.length !== LETRAS.length) midaAnclas();
  const y = l.scrollTop + 8;
  /* búsqueda binaria: la última ancla que ya pasó por arriba del borde */
  let a = 0, b = ANCLA_Y.length - 1, act = LETRAS[0] || '';
  while (a <= b){
    const m = (a + b) >> 1;
    if (ANCLA_Y[m].y <= y){ act = ANCLA_Y[m].L; a = m + 1; } else b = m - 1;
  }
  return act;
}
/* ── EN «TODO JUNTO», LA LETRA SE RESALTA ──
   Sin encabezados no hay nada que diga dónde empieza una letra, así que el riel
   tiene que poder decirlo de la única forma que queda: encendiendo las apps que
   son de ésa. Se apaga solo, porque un resaltado permanente deja de significar
   «acabás de pedir esta letra» y pasa a ser parte del dibujo. */
let RES_T = 0, RES_HOY = '', RES_NODOS = [];
function resApaga(){
  for (const n of RES_NODOS) n.classList.remove('res');
  RES_NODOS = []; RES_HOY = '';
  $('#cajLista').classList.remove('hayRes');
}
function resaltaLetra(L){
  const l = $('#cajLista');
  if (!l.classList.contains('junto')) return;
  /* ── PEDIR LA MISMA LETRA DOS VECES NO CUESTA NADA ──
     Arrastrando el riel, la letra se repite decenas de cuadros seguidos; sin
     esta guarda cada uno apagaba y volvía a encender los mismos nodos, o sea
     un recálculo de estilo por cuadro para dejar todo igual. */
  if (L && L === RES_HOY){ resVence(); return; }
  resApaga();
  if (!L) return;
  /* los nodos se buscan una vez y se guardan: el barrido de `.ap.res` era un
     `querySelectorAll` a nivel de DOCUMENTO por cada cuadro de scroll */
  RES_NODOS = $$('#cajLista .ap[data-l="' + L + '"]');
  for (const n of RES_NODOS) n.classList.add('res');
  if (RES_NODOS.length){ l.classList.add('hayRes'); RES_HOY = L; }
  resVence();
}
function resVence(){
  clearTimeout(RES_T);
  RES_T = setTimeout(resApaga, 1600);
}
/* ── MARCAR EL RIEL NO ES RESALTAR LAS APPS ──
   Reporte textual: *«ya aparecen remarcadas las letras, eso solamente debe
   pasar si deslizás en la parte de la barra»*. Tenía razón: `marcaRiel` corre
   en CADA cuadro de scroll —bajar por la lista con el dedo es scrollear— así
   que el resaltado se encendía solo al pasar por cada letra. Y no era sólo
   feo: medido con 150 apps en modo «todo junto», el manejador del scroll
   costaba **3,1 ms por cuadro** contra 0,04 sin resaltar, o sea ochenta veces,
   la mayor parte en dos `querySelectorAll` de documento y en los cambios de
   clase de decenas de nodos.
   Resaltar es la respuesta a «pediste esta letra», y eso sólo pasa en el riel:
   lo llaman `rVa` y `vaALetra`, y nadie más. */
function marcaRiel(L){
  $('#burbuja').textContent = L || '';
  ponPomo();
}
function vaALetra(L){
  const h = ANCLA[L];
  if (!h) return;
  const l = $('#cajLista');
  PEDIDA = L;
  l.scrollTop += h.getBoundingClientRect().top - l.getBoundingClientRect().top - 4;
  marcaRiel(L);
  resaltaLetra(L);
}

function aLaWeb(q){
  q = String(q || '').trim();
  if (!q) return;
  vibra(10);
  if (HAY_AND && AND.buscarWeb) AND.buscarWeb(q);
  else avisa(T('web', q));
}

/* ══════════ ABRIR, FIJAR, MENÚ ══════════ */
/* ── ABRIR UNA APP ES UN MOVIMIENTO, NO UN CORTE ──
   El icono crece hasta llenar la pantalla y el resto del launcher se va con él:
   es lo que hace cualquier escritorio de Android y es lo que separa «se abrió
   algo» de «la pantalla parpadeó». Son 170 ms — el sistema tarda más que eso
   en dibujar el primer cuadro de la app, así que no se le pone freno a nadie.
   Y se limpia SIEMPRE: al volver del sistema, por si el arranque falló, y con
   un plazo de red, porque un launcher que se queda desvanecido está roto. */
let ZOOM_T = null;
function zoomLimpia(){
  if (ZOOM_T){ clearTimeout(ZOOM_T); ZOOM_T = null; }
  document.body.classList.remove('abriendo');
  const v = $('.ap.saliendo'); if (v) v.classList.remove('saliendo');
}
function abreZoom(pkg, nodo){
  if (pkg === ASIS_PKG || pkg === PERS_PKG || pkg === INI_PKG || pkg === CAM_PKG || !HAY_AND){
    abre(pkg); return;
  }
  zoomArranca(pkg, nodo);
}
/* El plano del arranque, sin la guarda del puente. Va aparte por una razón de
   medición y no de estilo: en el banco no hay Android, así que `abreZoom` sale
   por el atajo y la animación no corre NUNCA. Con la parte de adentro suelta,
   la sonda ejerce el mismo código que el dedo en el teléfono. */
function zoomArranca(pkg, nodo){
  zoomLimpia();
  if (nodo){
    const r = nodo.getBoundingClientRect();
    /* de dónde crece: el centro del icono, en fracción de pantalla */
    document.body.style.setProperty('--zx', ((r.left + r.width/2)/innerWidth*100).toFixed(2) + '%');
    document.body.style.setProperty('--zy', ((r.top + r.height/2)/innerHeight*100).toFixed(2) + '%');
    nodo.classList.add('saliendo');
  }
  document.body.classList.add('abriendo');
  ZOOM_T = setTimeout(() => { ZOOM_T = null; abre(pkg); }, 170);
  setTimeout(zoomLimpia, 1400);
}

function abre(pkg){
  vibra(10);
  /* el asistente vive adentro del launcher: pedírselo al sistema devolvería
     «no existe» sobre un paquete que nunca se instaló */
  if (pkg === ASIS_PKG){ asisAbre(); return; }
  if (pkg === PERS_PKG){ persAbre(); return; }
  if (pkg === INI_PKG){ iniAbre(); return; }
  if (pkg === CAM_PKG){ camAbre(); return; }
  /* ── TOCAR *CUALQUIER* CÁMARA ABRE EL SELECTOR ──
     Es literal lo que se pidió: «que no abra la cámara normal sino que al
     abrirla te deje elegir». Va acá y no en el icono de la cámara Aero porque
     lo que el dueño toca de verdad es la app de cámara que ya tenía en el dock.
     ── Y YA NO PREGUNTA ──
     De fábrica abre la Aero directamente: `camApp` decide, y sólo `sis` deja
     pasar el toque a la app de siempre. Interceptar una app tiene que seguir
     siendo reversible, y ése es el valor que lo revierte. */
  if (camModoApp() !== 'sis' && glifoDe(pkg, POR_PKG[pkg] && POR_PKG[pkg].n) === 'camara'){
    CAM_SIS = pkg; camAbre(); return;
  }
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
/* ── ABRIR NO ES REPINTAR ──
   Reporte de la vuelta 130: «da tirones al subir el cajón». `verCajon(true)`
   rehacía la lista ENTERA en el mismo cuadro en que arranca la transición —36
   ms medidos con 150 apps, sobre un presupuesto de 16—, y la lista que se iba a
   pintar era la misma que ya estaba: la de filtro vacío. Si la última pintada
   fue para '', alcanza con volver a escalonar la entrada, que cuesta un reflujo. */
let CAJ_ABRE_T = 0;
const CAJ_ABRE_MS = 420;   /* la transición dura 340 y se le deja aire */
/* ── LO QUE PASA CUANDO LA HOJA LLEGA ──
   Vive en una función porque hay DOS caminos que terminan con la hoja
   asentada: abrirla con el botón y soltarla a mitad de un arrastre sin llegar
   al umbral de cierre. Repartido, el segundo se olvida de apagar el escritorio
   y el defecto no se ve nunca —sólo cuesta. */
/* ── LA ÚNICA MEDICIÓN QUE EL BANCO NO PUEDE DAR ──
   El banco dibuja por software: sus milisegundos no son los del teléfono, y no
   expone el gestor de baldosas, así que de `will-change` sólo está medido que
   se APLICA. Lo que queda por saber —si el rasterizado de la hoja se retiene
   entre aperturas— sólo lo puede contestar el aparato del dueño.
   Va apagado de fábrica y detrás de un interruptor: un launcher que le tira
   números al dueño en cada apertura es peor que uno que tironea. Y cuando está
   apagado no cuesta un solo `requestAnimationFrame`: la guarda es la primera
   línea. */
let MED_ON = lee('medir', 0), MED_T = [], MED_ULT = 0, MED_CORRE = false, MED_GEN = 0;
/* el aviso tiene que decir QUÉ midió: subir y bajar no son el mismo viaje y no
   cuestan lo mismo, así que un solo número sin dirección no se puede usar para
   decidir nada. */
/* y es una CLAVE y no un booleano porque ya hay tres viajes que medir: subir,
   bajar y scrollear la lista — que es lo que uno hace «estando ahí». */
let MED_QUE = 'pMedeSube', MED_SC = 0;
function medArranca(que){
  MED_QUE = que;
  /* el corte del scroll es un temporizador de 240 ms: sin limpiarlo, cerrar el
     cajón mientras se scrollea deja ese corte pendiente y termina la medición
     del CIERRE a mitad de camino, con el rótulo de la otra. */
  clearTimeout(MED_SC);
  if (!MED_ON) return;
  /* ── LA MEDICIÓN NO PUEDE APILARSE, Y LO CANTÓ EL NÚMERO ──
     `cajAsienta` corre al abrir, al cerrar y al soltar un arrastre. Sin esta
     marca, abrir dos veces seguidas deja DOS bucles empujando al mismo array:
     cada cuadro entra dos veces y el segundo mide cero. Medido, siete cuadros
     con mediana 0,0 ms — un número imposible que es la firma exacta del
     apilado. La marca hace que sólo el último bucle siga vivo. */
  const gen = ++MED_GEN;
  MED_T = []; MED_ULT = performance.now(); MED_CORRE = true;
  const paso = () => {
    if (gen !== MED_GEN) return;
    const t = performance.now(); MED_T.push(t - MED_ULT); MED_ULT = t;
    if (MED_CORRE) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
function medTermina(){
  if (!MED_CORRE) return;
  MED_CORRE = false; MED_GEN++;
  /* el primer hueco arranca en el toque y no en un cuadro: no es un cuadro
     perdido, es el tiempo que pasó desde que se soltó el dedo */
  const d = MED_T.slice(1);
  if (d.length < 3) return;
  const perdidos = d.filter(x => x > 26).length;
  const o = d.slice().sort((a, b) => a - b);
  const med = o[o.length >> 1];
  const p90 = o[Math.min(o.length - 1, Math.floor(o.length * 0.9))];
  avisa(T('pMedeUno', T(MED_QUE),
          d.length, med.toFixed(1), p90.toFixed(1), perdidos));
}

/* lo que se espera DESPUÉS de que la hoja y la foto ya se detuvieron, y sólo al
   cerrar. Ver el comentario de abajo. */
let CAJ_VUELVE_MS = 190;   /* `let` porque el A/B vive en el mismo binario: ver
                              `__A.cajTarde`. Si no, «mejoró» sería un recuerdo. */
function cajAsienta(){
  const caj = $('#cajon');
  caj.classList.add('abre');
  medArranca(CAJON ? 'pMedeSube' : 'pMedeBaja');
  /* la marca del deslizamiento va en el `body` y no en `#cajon`: el CIERRE
     también desliza, y ahí `#cajon` ya perdió su `.on`. Es lo que apaga el
     vidrio del escritorio mientras la hoja viaja (ver `body.cajMueve`). */
  document.body.classList.add('cajMueve');
  clearTimeout(CAJ_ABRE_T);
  /* ── EL CIERRE NO TIENE RELEVO, Y AHÍ ESTABA EL ESCALÓN ──
     Al ABRIR, `cajQ` releva a `cajMueve` en este mismo instante y el filtro del
     escritorio se queda apagado: no hay nada que encender. Al CERRAR no hay
     relevo, así que las tres piezas de vidrio de `#capa` encienden **96.401 px
     de desenfoque y tres filtros de SVG en un solo cuadro** — y caía a los
     80 ms de haber aterrizado la hoja, con la foto todavía escalándose y la
     deriva recién despausada. Tres cosas en la misma ventana de 80 ms, todas
     sólo al bajar: es exactamente lo que se reporta como «laguea al bajar».
     El trabajo es el mismo y no se puede evitar —el vidrio tiene que volver—
     pero **no tiene por qué pagarse en el cuadro en que la animación termina**:
     se espera a que todo esté quieto. El precio son 190 ms más de reloj y dock
     sin desenfoque mientras el ojo sigue a la hoja bajando; conservan su tinte,
     su borde y sus cinco sombras internas, que es el mismo trato que la vuelta
     132 ya hizo para los 340 ms del deslizamiento. */
  const espera = CAJON ? CAJ_ABRE_MS : CAJ_ABRE_MS + CAJ_VUELVE_MS;
  CAJ_ABRE_T = setTimeout(() => {
    caj.classList.remove('abre');
    document.body.classList.remove('cajMueve');
    if (CAJON && caj.classList.contains('hor')) document.body.classList.add('cajQ');
    medTermina();
  }, espera);
}

function verCajon(v){
  CAJON = !!v;
  const caj = $('#cajon');
  caj.classList.toggle('on', CAJON);
  /* mientras se desliza, las baldosas van sin vidrio (ver `#cajon.on.abre`) */
  /* el vidrio del escritorio vuelve en el acto al empezar a cerrar y se apaga
     recién cuando la hoja llegó (ver `cajAsienta` y `body.cajQ`). Desde la
     vuelta 134 `cajQ` ya NO esconde `#capa`: lo único que apaga es el filtro,
     así que sacarlo no obliga a rasterizar el escritorio de nuevo. */
  document.body.classList.remove('cajQ');
  cajAsienta();
  /* el CSS de la mascota decide su sitio con esto */
  document.body.classList.toggle('caj', CAJON);
  mascSitio();
  /* el fondo se acerca: es lo que hace que la hoja esmerilada se lea a hoja
     sobre algo y no a otra pantalla */
  fondoProfundo(CAJON);
  if (CAJON){
    $('#busca2').value = '';
    /* ── ABRIR NO ESCALONA LA ENTRADA, Y ES A PROPÓSITO ──
       Cada `.ap.entra` anima `transform` y `opacity`, y el compositor le da a
       cada una SU capa: veintiocho baldosas a densidad 3 son unos diez megas de
       texturas que hay que reservar, rasterizar y subir a la GPU **en el mismo
       cuadro en que la hoja empieza a moverse**. Y lo que compran es un efecto
       que no se ve: la hoja cruza la pantalla en 340 ms, así que lo que el ojo
       lee es el vuelo de la hoja y no que los iconos aparecieron de a uno.
       El escalonado se queda donde SÍ se ve, que es filtrando: ahí la hoja está
       quieta y la entrada es lo único que se mueve (ver `pintaCajon`). */
    if (CAJ_ULT_Q !== '') pintaCajon('');
    $('#cajLista').scrollTop = 0;
    marcaRiel(LETRAS[0] || '');
  } else {
    /* ── EL CIERRE NO TIENE QUE TOCAR LA LISTA NI EL FOCO SI NO HACE FALTA ──
       `scrollTop = 0` sobre un scroller de 150 filas fuerza un layout
       sincrónico, y lo hacía en el cuadro en que la hoja arranca a bajar para
       acomodar una lista que nadie va a ver: `verCajon(true)` ya la deja
       arriba al abrir. Y `blur()` sobre un campo que no tiene el foco no hace
       nada salvo, en Android, disparar el cierre del teclado y con él un
       cambio de inset — o sea un reflujo del documento entero a mitad de
       animación. Se pregunta antes. */
    const f = document.activeElement;
    if (f === $('#busca2') || f === $('#busca')) f.blur();
    mascotaBaila(false);
    $('#burbuja').classList.remove('on');
  }
}

/* ── CAMBIAR DE IDIOMA REPINTA LO QUE YA ESTÁ ESCRITO ──
   Los textos se escriben una vez al arrancar, así que sin esto el asistente
   cambia `LANG` y la pantalla se queda en el idioma anterior hasta que algo la
   vuelva a pintar por su cuenta. Es el mismo defecto que en Z Force costó 107
   claves y en PISTOLA el cartel del tutorial. */
function repintaIdioma(){
  $('#busca').placeholder = T('busca');
  $('#busca2').placeholder = T('busca');
  $('#cajTit').textContent = T('todas');
  const a = POR_PKG[ASIS_PKG]; if (a) a.n = T('aNombre');
  const cm = POR_PKG[CAM_PKG]; if (cm) cm.n = T('caCam');
  const q = POR_PKG[PERS_PKG]; if (q) q.n = T('aNombreP');
  const w = POR_PKG[INI_PKG];  if (w) w.n = T('iNombre');
  if (MENU_PKG){
    $('#mFijar').lastElementChild.textContent = fijado(MENU_PKG) ? T('soltar') : T('fijar');
    $('#mInfo').lastElementChild.textContent = T('info');
    $('#mBorrar').lastElementChild.textContent = T('borrar');
  }
  pintaReloj(true); pintaInicio(); pintaDock(); pintaCajon($('#busca2').value);
  /* las dos hojas que escriben su texto al abrirse, si están abiertas: cambiar
     de idioma con una a la vista la dejaría en el anterior hasta cerrarla */
  if ($('#fondos').classList.contains('on')) fgPinta();
  if ($('#carp').classList.contains('on')) carpPinta();
  if (typeof asisIdioma === 'function') asisIdioma();
}

/* ══════════ RELOJ Y BATERÍA ══════════ */
function dosD(n){ return n < 10 ? '0' + n : String(n); }
/* ── ESCRIBIR EL MISMO MINUTO SESENTA VECES ES SESENTA REPINTADOS ──
   El intervalo es de un segundo y el reloj muestra minutos: cincuenta y nueve
   de cada sesenta pasadas escriben exactamente el mismo texto, y escribir
   `textContent` ensucia el nodo igual aunque el valor no cambie. Con `#capa`
   escondido detrás de la hoja eso no se pagaba; desde la vuelta 134 el
   escritorio se queda compuesto, así que ahora sí. Y de paso es correcto
   siempre: en el escritorio pelado eran cincuenta y nueve repintados por
   minuto para no cambiar un píxel.
   Y lleva `forzar`, porque esta función pinta además la fecha y el saludo:
   `repintaIdioma` la llama justamente para cambiarlos de idioma, y sin el
   parámetro un cambio de idioma dentro del mismo minuto se sale por el atajo y
   deja la fecha en el idioma anterior. Es el mismo defecto que en Z Force
   costó 107 claves, servido por la puerta de atrás. */
let RELOJ_ULT = '';
function pintaReloj(forzar){
  const d = new Date();
  const hhmm = dosD(d.getHours()) + ':' + dosD(d.getMinutes());
  if (!forzar && hhmm === RELOJ_ULT && $('#hora') && $('#hora').textContent === hhmm) return;
  RELOJ_ULT = hhmm;
  $('#bIzq').textContent = hhmm;
  /* ── EL WIDGET DE RELOJ PUEDE NO ESTAR PUESTO ──
     Desde que los widgets se eligen, `#hora` existe sólo si el dueño dejó el de
     reloj. Sin la guarda, el intervalo de un segundo tira `null.textContent`
     sesenta veces por minuto y se lleva por delante la pintada de todo lo demás
     que corre en la misma vuelta. */
  if (!$('#hora')) return;
  $('#hora').textContent = hhmm;
  const t = TXT[LANG] || TXT.es;
  $('#fecha').innerHTML = t.dias[d.getDay()] + '<br>' + d.getDate() + ' ' + t.meses[d.getMonth()];
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
  /* ── Y NO AL REVÉS ──
     `ponBateria` NO llama a `widPinta`: `widPinta` termina pintando el reloj, y
     si además pidiera la batería al puente serían dos funciones llamándose entre
     ellas sin fondo. Acá, que es donde la lectura es nueva, se avisa una vez. */
  if (typeof widPinta === 'function') widPinta();
}

/* ── EL ARO DE BATERÍA ──
   El trazo de un círculo se recorta con `stroke-dashoffset`: la circunferencia
   de r=25 es 2πr = 157,08, así que el offset es lo que FALTA. Va aparte de
   `pintaBateria` para que la vista previa del navegador —que no tiene puente y
   por lo tanto no tiene batería— pueda llenarlo igual y se pueda mirar. */
const ARO_C = 2*Math.PI*25;
/* ── LA ÚLTIMA LECTURA SE GUARDA ──
   El widget de batería se pinta en su propio ritmo, y preguntarle al puente en
   cada pintada sería cruzar el puente diez veces por segundo con el cronómetro
   andando para leer un número que cambia cada varios minutos. */
let BAT_ULT = { n: 100, c: false };
function bateriaAhora(){ return { n: BAT_ULT.n, carga: !!BAT_ULT.c }; }
function ponBateria(b){
  const n = (b.n === undefined || b.n < 0) ? 100 : b.n;
  BAT_ULT = { n: n, c: !!b.c };
  $('#batN').textContent = (b.c ? '\u26a1' : '') + n + '%';
  if (!$('#wPct')) return;      /* el widget de reloj puede no estar puesto */
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
  /* ── EL ASISTENTE ES UNA APP MÁS ──
     No está instalado en el teléfono, así que el puente no lo devuelve nunca:
     se inyecta acá, ANTES de ordenar, y con eso queda en el cajón por su letra,
     se puede buscar y se puede fijar como cualquier otra. Ponerlo como un botón
     aparte obligaría a inventarle un sitio en una pantalla que ya está llena. */
  APPS.push({ p: ASIS_PKG, n: T('aNombre') });
  APPS.push({ p: PERS_PKG, n: T('aNombreP') });
  APPS.push({ p: INI_PKG,  n: T('iNombre') });
  APPS.push({ p: CAM_PKG,  n: T('caCam') });
  APPS.sort((a, b) => norm(a.n) < norm(b.n) ? -1 : norm(a.n) > norm(b.n) ? 1 : 0);
  POR_PKG = {};
  for (const a of APPS) POR_PKG[a.p] = a;
  cajCacheLimpia();

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
/* la única forma de que la medición pruebe algo es correr el MISMO binario con
   la guarda dada vuelta: con dos versiones distintas se estarían comparando dos
   programas. Lo usa el banco y nadie más. */
let SUBIR_SIN_GUARDA = false;
function enganchaSubir(el){
  let y0 = 0, x0 = 0, act = false;
  el.addEventListener('pointerdown', e => { y0 = e.clientY; x0 = e.clientX; act = true; });
  el.addEventListener('pointermove', e => {
    /* ── LLEVANDO UNA APP, SUBIR NO ABRE EL CAJÓN ──
       Reporte: «al mover hacia arriba en la pantalla de inicio una app no se
       debe abrir el cajón». Es el mismo dedo y el mismo movimiento hacia
       arriba, así que los dos gestos se cumplían a la vez: se levantaba un
       icono, se lo llevaba a la fila de arriba, y a los 55 px el cajón se abría
       encima. Mientras haya algo en la mano, este gesto no existe — lo que el
       dedo está haciendo ya se decidió. */
    if (!act || CAJON || (ARR && !SUBIR_SIN_GUARDA)) return;
    if (Math.abs(e.clientX - x0) > 18){ act = false; return; }
    if (y0 - e.clientY > 55){ act = false; verCajon(true); vibra(10); return; }
    /* ── Y BAJAR ABRE EL CENTRO DE CONTROL ──
       Pedido textual: «que puedas hacer hacia abajo usando el launcher». Va en
       el MISMO gesto que subir y no en un escucha aparte: son el mismo dedo y
       las mismas guardas —nada en la mano, nada de cruzarse en horizontal— y
       repartidas en dos sitios se desincronizan el día que se toque una. */
    if (e.clientY - y0 > 55 && lee('ccOn', 1) && typeof ccAbre === 'function'){
      act = false; ccAbre(); vibra(10);
    }
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
  const pone = d => {
    /* `contains` es una lectura de clase, no fuerza recálculo: el `remove` sale
       una sola vez y no en cada cuadro del arrastre */
    if (document.body.classList.contains('cajQ')){
      /* ── EL ARRASTRE ES UN DESLIZAMIENTO Y TIENE QUE CONTAR COMO TAL ──
         `cajMueve` lo ponía sólo `cajAsienta`, o sea al SOLTAR. Durante todo el
         arrastre —que es cuando el dedo está mirando la pantalla y la hoja va
         sin transición— el escritorio quedaba fuera de las dos reglas: `cajQ`
         recién sacado y `cajMueve` todavía sin poner, así que sus tres piezas
         encendían sus 96.401 px de filtro justo en el cuadro en que el dedo
         empieza a tirar. Poniéndolo acá las dos reglas se solapan y no hay un
         solo cuadro de transición: sale off y sigue off. Lo saca `cajAsienta`,
         que corre por los dos caminos del final (soltar arriba y soltar
         abajo). */
      document.body.classList.remove('cajQ');
      document.body.classList.add('cajMueve');
    }
    caj.style.setProperty('--caj-y', Math.max(0, d) + 'px');
  };
  const suelta = () => {
    caj.classList.remove('tira'); caj.style.removeProperty('--caj-y');
    if (CAJON) cajAsienta();      /* soltó a mitad de camino: la hoja vuelve sola */
  };

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

  /* ── Y EL SCROLL TAMBIÉN SE MIDE, PORQUE ES LO QUE UNO HACE «ESTANDO AHÍ» ──
     El medidor de la vuelta 133 mide el DESLIZAMIENTO, o sea abrir y cerrar. El
     reporte de la 136 no es de un viaje: es del estado. Y un estado no se mide
     solo —si nada se mueve no hay cuadros que contar— así que lo que se mide es
     el único momento en que el cajón abierto tiene que dibujar de verdad.
     Se termina 240 ms después del último evento: menos que eso corta un
     scroll con inercia al primer respiro del dedo. */
  const medScroll = () => {
    /* sólo con la hoja ASENTADA: `verCajon(true)` hace `scrollTop = 0`, o sea
       que abrir dispara un `scroll` y sin esta guarda cortaría la medición de
       la subida a los 240 ms y la informaría como si hubiera terminado. */
    if (!MED_ON || !document.body.classList.contains('cajQ')) return;
    if (!MED_CORRE) medArranca('pMedeScroll');
    clearTimeout(MED_SC);
    MED_SC = setTimeout(medTermina, 240);
  };

  /* la letra que se está mirando, mientras se baja por la lista */
  let pend = false;
  l.addEventListener('scroll', () => {
    medScroll();
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

  /* ══════════ LA BARRA DEL ÍNDICE ══════════
     ── LA POSICIÓN DEL DEDO ES UNA FRACCIÓN, NO UNA LETRA ──
     Con una columna de letras el dedo caía sobre una y se saltaba ahí. Con una
     barra lo que hay es una fracción del recorrido, así que se scrollea a esa
     fracción y la letra que aparece en la burbuja es la que quedó arriba —
     medida, no supuesta. Eso hace que arrastrar se sienta continuo en vez de
     saltar entre secciones, que es como se comporta la barra de Xiaomi. */
  const r = $('#riel'), bur = $('#burbuja');
  let rAct = false;
  const rVa = y => {
    const c = r.getBoundingClientRect();
    const k = cl((y - c.top - 10) / Math.max(1, c.height - 20), 0, 1);
    const l = $('#cajLista');
    l.scrollTop = k*Math.max(0, l.scrollHeight - l.clientHeight);
    PEDIDA = null;
    const L = letraVisible();
    if (bur.textContent !== L) vibra(6);
    bur.textContent = L;
    resaltaLetra(L);
    bur.style.top = Math.max(46, Math.min(innerHeight - 46, y)) + 'px';
    ponPomo();
  };
  r.addEventListener('pointerdown', e => {
    if (!LETRAS.length) return;
    rAct = true; r.classList.add('on'); bur.classList.add('on'); rVa(e.clientY);
    try { r.setPointerCapture(e.pointerId); } catch (x) {}
  });
  r.addEventListener('pointermove', e => { if (rAct) rVa(e.clientY); });
  const rFin = () => { rAct = false; r.classList.remove('on'); bur.classList.remove('on'); };
  r.addEventListener('pointerup', rFin);
  r.addEventListener('pointercancel', rFin);
}

/* ══════════ LA MASCOTA ══════════
   Baila mientras se escribe, se aburre y se duerme. Todas las animaciones salen
   de UNA tira y de la tabla `MASC_ANIM` que escribe el horneado. */

/* los aburridos, con `quieto` repetido porque tiene que salir más seguido: una
   lista con pesos es más corta y más clara que una tabla de probabilidades */
const MASC_OCIO = ['quieto', 'mando', 'quieto', 'saluda', 'quieto'];

let MASC_T = 0, MASC_CICLO = 0, MASC_HOY = '', MASC_ULT = 0, MASC_BUSCA = false;
let MASC_PREVIA = 0;      /* hasta cuándo la pose pedida a mano manda sobre la regla */

/* ── CAMBIAR DE ANIMACIÓN ES CAMBIAR UN NOMBRE ──
   Las cinco son funciones del tiempo sobre los mismos 23 huesos, así que no hay
   que cargar nada, ni cruzar clips, ni esperar. Lo único que hay que reponer es
   el reloj: entrando a una pose a mitad de su ciclo, el primer cuadro salta. */
function mascPone(n){
  if (MASC_HOY === n || !L3_ANIM[n]) return;
  MASC_HOY = n;
  L3.anim = n;
  L3.t = 0;
  $('#mascota').classList.toggle('zzz', n === 'duerme');
}

/* ── SE ABURRE Y SE DUERME ──
   No es un adorno: la mascota está para acompañar la búsqueda, y algo que hace
   siempre lo mismo deja de acompañar a los diez segundos. Baila mientras se
   teclea, a los 2,2 s de silencio pasa a un ocio sorteado, y a los 7 se duerme
   con las zetas. */
function mascOcio(){
  clearTimeout(MASC_CICLO);
  if (Date.now() - MASC_ULT > 7000){
    mascPone('duerme');
    MASC_CICLO = setTimeout(mascOcio, 5000);
    return;
  }
  mascPone(MASC_OCIO[(Math.random()*MASC_OCIO.length)|0]);
  MASC_CICLO = setTimeout(mascOcio, 3400 + Math.random()*3000);
}

/* ── Y NO SE MUESTRA SI NO HAY LUGAR ──
   Vive pegada abajo del cajón; con una búsqueda que devuelve muchas apps la
   lista llega hasta ahí y la mascota queda ENCIMA de los resultados, que es lo
   único que en ese momento hay que poder leer. El hueco se mide, no se supone. */
/* ── DÓNDE VA Y CUÁNTO MIDE ──
   Dos sitios, y los dos en variables: el CSS los lee y la sonda también, así
   que no hay dos números que puedan discrepar. En el escritorio es grande y va
   por encima del dock; en el cajón es chica y se apoya en el borde de abajo. */
/* ── EL ALTO DEL TECLADO LO DICE ANDROID, NO LA PÁGINA ──
   La ventana va de borde a borde (`setDecorFitsSystemWindows(false)`), así que
   `adjustResize` no encoge el WebView: el teclado llega como un inset y desde
   JavaScript ni `innerHeight` ni `visualViewport` se enteran. Lo manda el
   puente. En el navegador, donde no hay puente ni teclado, vale cero — y ahí
   `visualViewport` sí sirve de respaldo, que es lo que hace probable esto. */
let TECLADO = 0;
window.__teclado = function(h){
  TECLADO = Math.max(0, +h || 0);
  mascSitio();
};
function tecladoAlto(){
  if (TECLADO) return TECLADO;
  const v = window.visualViewport;
  if (!v) return 0;
  return Math.max(0, Math.round(innerHeight - v.height - v.offsetTop));
}

/* ── LA MASCOTA SE APOYA EN LO QUE TAPE ABAJO, SEA LO QUE SEA ──
   Buscando eso es el teclado. Pero en Personalizar hay cinco botones de pose
   cuyo único trabajo es que se VEA el muñeco, y esa hoja ocupa el 70 % de la
   pantalla desde abajo: apoyada en el teclado (que ahí vale cero) la mascota
   queda ENTERA por detrás de la hoja y los cinco botones no muestran nada.
   Es una sola regla y no dos: se apoya sobre el borde de arriba de lo que haya
   abajo. */
function pisoAlto(){
  let h = tecladoAlto();
  const p = $('#pers');
  if (p && p.classList.contains('on')) h = Math.max(h, p.offsetHeight);
  return h;
}

/* ── DÓNDE VA Y CUÁNTO MIDE ──
   Un solo sitio: **apoyada sobre el teclado, mientras se busca**. Estuvo en el
   medio del escritorio una vuelta y el reporte fue que molestaba: es la
   pantalla de inicio, ahí lo que uno quiere ver es el fondo y sus apps. */
/* ── ESCRIBIR UNA VARIABLE DE `:root` QUE NO CAMBIÓ NO ES GRATIS ──
   `mascSitio` corre en el primer cuadro de CADA apertura y de cada cierre, y las
   tres variables casi nunca cambian: el ancho sale de un ajuste y el piso del
   teclado o del panel abierto. Una custom property del elemento raíz invalida el
   estilo de todo lo que la lea, y hacerlo en el cuadro en que la hoja arranca es
   trabajo puro. Es el mismo atajo que `pintaReloj`. */
let MASC_VAR = '', MASC_SIN_CAJ = true;
function mascSitio(){
  /* el alto sale de la proporción del lienzo (132×180): escrito a mano al lado
     del ancho, cambiar uno deja al muñeco estirado y nada avisa */
  const w = PERS_MASC[lee('mascTam', 'media')] || PERS_MASC.media;
  const h = Math.round(w*MASC_H/MASC_W), b = pisoAlto() + 12;
  const firma = w + '|' + h + '|' + b;
  if (firma !== MASC_VAR){
    MASC_VAR = firma;
    const r = document.documentElement.style;
    r.setProperty('--masc-w', w + 'px');
    r.setProperty('--masc-h', h + 'px');
    r.setProperty('--masc-b', b + 'px');
  }
  mascMira();
}

/* ── ¿HAY LUGAR? ──
   Vale para los dos sitios y mide lo mismo: dónde termina lo último que se
   dibujó contra dónde empieza la mascota. `scrollHeight` no sirve —los dos
   contenedores son `flex:1 1 auto`, así que SIEMPRE llenan su caja y nunca
   bajan de `clientHeight`—, y con eso la comparación daba falso con dos
   resultados en pantalla. */
function mascCabe(){
  const alto = parseFloat(getComputedStyle(document.documentElement)
                 .getPropertyValue('--masc-h')) || MASC_H;
  const l = $('#cajLista');
  if (!l) return false;
  const n = l.children.length;
  if (!n) return true;
  const u = l.children[n - 1].getBoundingClientRect();
  /* el techo de la mascota no es el borde de la lista sino donde empieza ella,
     que con el teclado abierto está bastante más arriba */
  const piso = innerHeight - pisoAlto() - 12;
  return u.bottom <= piso - alto - 12;
}

/* ── SÓLO MIENTRAS SE BUSCA ──
   Estuvo en el escritorio una vuelta —para que el modelo se pudiera ver, que
   era el reporte anterior— y el de ahora es que ahí molesta. Tiene razón: la
   pantalla de inicio es para el fondo y las apps. Acompaña la búsqueda, que es
   la única pantalla del launcher donde uno está esperando algo, y para poder
   VER el modelo a pedido están los cinco botones de pose en Personalizar. */
function mascMira(){
  const m = $('#mascota');
  const busca = lee('mascOn', 1) && CAJON && MASC_BUSCA && !document.hidden;
  /* ── Y HAY UN SEGUNDO MOTIVO PARA QUE SE VEA: QUE SE LA PIDA ──
     Los cinco botones de pose de Personalizar y la acción `mascota` del
     asistente la muestran A PEDIDO. Sin esto, `mascMira` —que corre en cada
     repintado del panel— la apagaría en el cuadro siguiente al de tocar el
     botón. La previa vence sola y ahí manda otra vez la regla. */
  const previa = lee('mascOn', 1) && !document.hidden && Date.now() < MASC_PREVIA;
  const cabe = previa || (busca && mascCabe());
  clearTimeout(MASC_T);
  if (cabe){
    m.classList.add('on');
    l3Corre(true);
    if (!MASC_HOY) mascPone('quieto');
    return;
  }
  /* ── IRSE Y APARTARSE NO SON LA MISMA COSA, ASÍ QUE NO DURAN LO MISMO ──
     Dejar de buscar es una despedida: 2,4 s, porque un corte seco se lee a
     error. Pero cuando lo que pasa es que la lista creció y la mascota le
     quedó ENCIMA, despedirse son dos segundos y medio tapando justo lo que uno
     acaba de pedir — que es el reclamo que trajo esta vuelta, en chiquito. Se
     aparta en un cuarto de segundo, que igual alcanza para que no parpadee
     entre una tecla y la siguiente. */
  /* ── Y CERRAR EL CAJÓN NO ES DEJAR DE BUSCAR ──
     Los 2,4 s son la despedida de quien deja de escribir CON el cajón puesto:
     ahí el muñeco está en su sitio y un corte seco se lee a error. Pero
     cerrando el cajón mientras se buscaba, `cabe` cae por `CAJON` y la mascota
     se quedaba **dos segundos y medio encima del escritorio**, con su bucle de
     WebGL corriendo durante todo el deslizamiento — justo lo que la vuelta 120
     vino a sacar del inicio. Sin cajón no hay de dónde despedirse.
     El A/B vive en el mismo binario: ver `__A.mascSinCaj`. */
  MASC_T = setTimeout(() => { m.classList.remove('on'); l3Corre(false); },
                      (busca || (MASC_SIN_CAJ && !CAJON)) ? 260 : 2400);
}

function mascotaBaila(v){
  MASC_BUSCA = !!v;
  clearTimeout(MASC_CICLO);
  if (v){
    MASC_ULT = Date.now();
    mascPone('baila');
    MASC_CICLO = setTimeout(mascOcio, 2200);
  }
  mascMira();
}

/* ── SE LA PUEDE TOCAR, Y ESO ES LA MITAD DE QUE SEA UNA MASCOTA ──
   Un muñeco que no contesta es un adorno. Un toque le saca una pose distinta de
   la que tenía —sorteada entre las que no está haciendo, porque repetir la
   misma se lee a que el toque no hizo nada— y reinicia el reloj del ocio. */
const MASC_TOQUE = ['saluda', 'baila', 'mando', 'quieto'];
function mascToque(){
  vibra(12);
  const otras = MASC_TOQUE.filter(n => n !== MASC_HOY);
  clearTimeout(MASC_CICLO);
  MASC_ULT = Date.now();
  mascPone(otras[(Math.random()*otras.length)|0]);
  MASC_CICLO = setTimeout(mascOcio, 2600);
}

/* ══════════ GANCHOS DEL SISTEMA ══════════
   Los llama la Activity. Sin ellos, volver al escritorio deja abierto lo que
   estuviera abierto tres apps atrás, que no es «conservar el estado». */
window.__alInicio = function(){ cierraMenu(); verCajon(false); $('#busca2').value = ''; ponPagina(0); };
window.__alVolver = function(){ pintaReloj(true); pintaBateria(); CORRE = true; };
window.__atras = function(){
  /* las tres hojas primero, y de la de más arriba a la de más abajo: «atrás»
     cierra lo que está encima, no lo que estaba abierto tres pasos atrás */
  /* la cámara está por encima de todo, así que se cierra primero — y adentro
     tiene DOS niveles: los ajustes tapan el visor, o sea que «atrás» tiene que
     volver al visor y no salirse de la cámara de una */
  const cm = $('#cam');
  if (cm && cm.classList.contains('on')){
    if (cm.classList.contains('conAjustes')){
      CAM.ajustes = false; cm.classList.remove('conAjustes'); return true;
    }
    camCierra(); return true;
  }
  if ($('#fondos').classList.contains('on')){ fgCierra(); return true; }
  if ($('#carp').classList.contains('on')){ carpCierra(); return true; }
  if ($('#ini').classList.contains('on')){ iniCierra(); return true; }
  if ($('#pers').classList.contains('on')){ persCierra(); return true; }
  if ($('#asis').classList.contains('on')){ asisCierra(); return true; }
  if (MENU_PKG) cierraMenu();
  else if (CAJON) verCajon(false);
  else if (PAG > 0) ponPagina(0);
};
/* ── LOS INSETS HAY QUE PEDIRLOS, NO SÓLO ESPERARLOS ──
   `setOnApplyWindowInsetsListener` dispara cuando la vista se adjunta, que es
   ANTES de que `ui.html` termine de cargar: en ese momento `window.__insets` no
   existe todavía, el `evaluateJavascript` no encuentra nada y el valor de
   fábrica —24 px— se queda para siempre. Se vio en el teléfono del usuario: la
   barra de búsqueda del cajón terminaba pisada por los iconos de la barra de
   estado. El puente tiene el dato guardado desde el primer cuadro; lo único que
   faltaba era pedirlo al arrancar. */
function pideInsets(){
  if (!HAY_AND || !AND.insets) return;
  try {
    const p = String(AND.insets()).split(',');
    const t = parseInt(p[0], 10), b = parseInt(p[1], 10);
    if (isFinite(t) && isFinite(b)) window.__insets(t, b);
  } catch (e) {}
}

window.__insets = function(t, b){
  document.documentElement.style.setProperty('--ins-t', Math.max(t, 8) + 'px');
  document.documentElement.style.setProperty('--ins-b', Math.max(b, 8) + 'px');
  calculaFilas(); pintaInicio();
};

/* ══════════ ARRANQUE ══════════ */
function arranca(){
  /* el CSS necesita saber si hay sistema detrás: la barra de estado propia
     sólo tiene sentido en la vista previa */
  document.body.classList.toggle('and', HAY_AND);
  $('#busca').placeholder = T('busca');
  $('#busca2').placeholder = T('busca');
  $('#cajTit').textContent = T('todas');

  fondoInit();
  vidrioInit();
  /* ── VOLVER DE UNA APP LIMPIA EL ZOOM ──
     La animación de abrir deja el launcher escalado y transparente: si el
     arranque falla o el sistema vuelve sin recargar la página, se queda así. */
  addEventListener('visibilitychange', () => { if (!document.hidden) zoomLimpia(); });
  addEventListener('pageshow', zoomLimpia);
  /* la reja se restituye antes de pintar nada: puesta después, el primer cuadro
     sale con los iconos de fábrica y salta de tamaño a la vista */
  ponReja(lee('ico', 60), lee('cols', 4));

  /* ── EL LIENZO SE DIMENSIONA UNA VEZ Y NO POR CUADRO ──
     El alto sale de la proporción de la caja, así que cambiar `MASC_W` no deja
     al muñeco estirado. */
  const cv = $('#mLien');
  cv.width = L3_ANCHO;
  cv.height = Math.round(L3_ANCHO*MASC_H/MASC_W);
  try { if (l3Init()) l3Cam(); } catch (e) { window.__errs && window.__errs.push(String(e)); }
  mascPone('quieto');
  mascSitio();
  /* ── UN TOQUE LA HACE CONTESTAR, UNO LARGO ABRE LA PERSONALIZACIÓN ──
     Es el gesto de cualquier launcher —mantener sobre algo abre sus opciones—
     y hace que el panel sea descubrible sin un botón más en la pantalla. */
  const M = $('#mascota');
  let mfl = null, mlarga = false;
  M.addEventListener('pointerdown', () => {
    mlarga = false;
    mfl = setTimeout(() => { mlarga = true; vibra(20); persAbre(); }, 560);
  });
  const mfin = () => { if (mfl){ clearTimeout(mfl); mfl = null; } };
  M.addEventListener('pointerup', mfin);
  M.addEventListener('pointermove', mfin);
  M.addEventListener('pointercancel', mfin);
  M.addEventListener('click', () => { if (!mlarga) mascToque(); });
  /* ── NO ARRANCA DORMIDA ──
     `mascOcio` compara contra `MASC_ULT`, que valía 0: la resta daba cuarenta
     y seis años y el primer cuadro del launcher salía con la mascota sentada
     durmiendo. Lo primero que uno ve del muñeco tiene que ser el muñeco de pie. */
  MASC_ULT = Date.now();

  pideInsets();
  try { if (HAY_AND && AND.teclado) TECLADO = +AND.teclado() || 0; } catch (e) {}
  /* en el navegador no hay puente: el respaldo es `visualViewport`, que sí
     cambia cuando la ventana se achica */
  if (window.visualViewport){
    visualViewport.addEventListener('resize', mascSitio);
    visualViewport.addEventListener('scroll', mascSitio);
  }
  cargaApps();
  pintaInicio(); pintaDock();
  cajPrepara();
  pintaReloj(true); pintaBateria();
  setInterval(() => pintaReloj(), 1000);
  setInterval(pintaBateria, 30000);

  asisInit();
  persInit();
  iniInit();
  aguaInit();
  carpInit();
  widInit();
  fgInit();

  /* ── UN SOLO SISTEMA DE GESTO PARA LOS TRES ──
     Antes cada uno tenía su `enganchaLista`, que sólo sabía abrir y mostrar el
     menú. Ahora los tres pasan por el arrastre, que además de eso sabe levantar
     y soltar; mantener y soltar sin mover sigue abriendo el menú. */
  arrInit();

  /* ── LA BIENVENIDA VA ÚLTIMA ──
     Dibuja baldosas de verdad con `icoAero` y prueba cada pack sobre la reja
     que ya existe, así que necesita que el escritorio esté armado. Puesta
     antes, la muestra saldría vacía y nadie se enteraría. */
  bvInit();
  enganchaPaginas();
  enganchaCajon();

  /* ── EL CAMPO DEL ESCRITORIO ES UN BOTÓN ──
     Es `readonly`, así que en un teléfono no levanta el teclado sobre un cuadro
     que el cajón va a tapar: abre el cajón y le pasa el foco al de adentro, que
     es el único que recibe letras. Los 90 ms son lo que tarda la hoja en
     empezar a subir: enfocando en el mismo cuadro, Android abre el teclado
     contra un elemento que todavía está fuera de la pantalla y no lo enfoca. */
  /* el velo lo comparten el menú de app y la hoja del asistente */
  $('#velo').addEventListener('pointerdown', () => { asisCierra(); });

  const abreBusca = () => { verCajon(true); setTimeout(() => $('#busca2').focus(), 90); };
  $('#buscaCaja').addEventListener('pointerdown', abreBusca);
  $('#busca').addEventListener('focus', abreBusca);

  /* ── UNA PINTADA POR CUADRO, NO UNA POR TECLA ──
     Escribiendo rápido entran varias teclas dentro del mismo cuadro y cada una
     rehacía la lista: medido con 150 apps, la pintada cuesta 35 ms, así que
     tres teclas seguidas son cien milisegundos de hilo bloqueado para mostrar
     un resultado que ya nadie va a ver. El navegador dibuja una vez por cuadro;
     la lista también. */
  let bPend = false, bVal = '';
  $('#busca2').addEventListener('input', e => {
    if (!CAJON) verCajon(true);
    bVal = e.target.value;
    mascotaBaila(bVal.length > 0);
    if (bPend) return;
    bPend = true;
    requestAnimationFrame(() => { bPend = false; pintaCajon(bVal); });
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

  document.addEventListener('visibilitychange', () => { CORRE = !document.hidden; mascMira(); });
  addEventListener('resize', () => { calculaFilas(); pintaInicio(); mascMira();
    cajFrostRehornea();
  /* la lista cambia de ancho, o sea que las anclas se mueven: la caché de
     `midaAnclas` deja de valer y hay que volver a medirla */
  ANCLA_Y = []; });
  addEventListener('contextmenu', e => e.preventDefault());

  setTimeout(() => $('#carga').classList.add('off'), 260);
  setTimeout(() => { const c = $('#carga'); if (c && c.parentNode) c.parentNode.removeChild(c); }, 900);
}
