/* ══════════════════════════════════════════════════════════════════════════
   EL SONIDO Y LA INTERFAZ
   ══════════════════════════════════════════════════════════════════════════
   El audio es PROCEDURAL y no un archivo, por lo mismo que en Eco: lo que
   suena acá son golpes de hueso, pisadas y una cama de aire. Un clip pesa
   cientos de kilobytes y encima se corta en cada vuelta del bucle, y ese
   corte se escucha más que la cama.                                       */

let AC = null, MAESTRO = null, CAMA = null, CAMA_G = null, RUIDO = null, ANAL = null;

function audioArranca() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  MAESTRO = AC.createGain(); MAESTRO.gain.value = 0.85; MAESTRO.connect(AC.destination);
  /* el analizador cuelga del MAESTRO y de nada más: es lo único que prueba
     que algo sonó de verdad, y con dos caminos de audio uno queda sin medir */
  ANAL = AC.createAnalyser(); ANAL.fftSize = 2048; MAESTRO.connect(ANAL);

  const n = AC.sampleRate * 1.0, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  RUIDO = b;

  /* la cama: viento grave filtrado. Va debajo de todo, porque un golpe tiene
     que ser un ACONTECIMIENTO y no un matiz por encima de un zumbido        */
  CAMA = AC.createBufferSource(); CAMA.buffer = RUIDO; CAMA.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 0.7;
  CAMA_G = AC.createGain(); CAMA_G.gain.value = 0.030;
  CAMA.connect(f); f.connect(CAMA_G); CAMA_G.connect(MAESTRO);
  CAMA.start();
  const lfo = AC.createOscillator(); lfo.frequency.value = 0.055;
  const lg = AC.createGain(); lg.gain.value = 120;
  lfo.connect(lg); lg.connect(f.frequency); lfo.start();
}

function _ruido(dur, tipo, frec, Q, vol, caida) {
  const s = AC.createBufferSource(); s.buffer = RUIDO;
  const f = AC.createBiquadFilter(); f.type = tipo; f.frequency.value = frec; f.Q.value = Q;
  const g = AC.createGain();
  const t = AC.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (caida || 1));
  s.connect(f); f.connect(g); g.connect(MAESTRO);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function _tono(f0, f1, dur, vol, tipo) {
  const o = AC.createOscillator(); o.type = tipo || 'square';
  const g = AC.createGain(); const t = AC.currentTime;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(MAESTRO); o.start(t); o.stop(t + dur + 0.03);
}

const SON = {
  pisa:    () => _ruido(0.13, 'lowpass', 420, 1.0, 0.075, 0.7),
  tajo:    () => _ruido(0.19, 'bandpass', 2400, 0.9, 0.085, 0.8),
  tajoEsq: () => _ruido(0.22, 'bandpass', 1500, 1.1, 0.070, 0.9),
  /* el impacto son DOS cosas: el golpe grave del cuerpo y el chasquido del
     hueso. Con una sola suena a caja de cartón */
  impacto: () => { _ruido(0.16, 'lowpass', 260, 1.2, 0.34, 0.6); _ruido(0.10, 'highpass', 2600, 0.8, 0.20, 0.5); },
  pega:    () => _ruido(0.11, 'bandpass', 1900, 1.4, 0.16, 0.6),
  rompe:   () => { _ruido(0.42, 'bandpass', 1250, 0.6, 0.30, 1.0); _ruido(0.30, 'highpass', 3200, 0.7, 0.18, 0.9); },
  dano:    () => { _tono(220, 90, 0.26, 0.24, 'sawtooth'); _ruido(0.22, 'lowpass', 700, 0.8, 0.26, 0.8); },
  roza:    () => _ruido(0.14, 'highpass', 4200, 0.9, 0.11, 0.6),
  esquiva: () => _ruido(0.20, 'highpass', 900, 0.6, 0.085, 0.9),
  gruñe:   () => _tono(120, 62, 0.40, 0.13, 'sawtooth'),
  nivel:   () => { _tono(520, 780, 0.16, 0.16, 'triangle'); setTimeout(() => AC && _tono(780, 1170, 0.22, 0.14, 'triangle'), 130); },
  zona:    () => { _tono(180, 240, 0.5, 0.15, 'triangle'); _ruido(0.7, 'lowpass', 180, 0.8, 0.20, 1.0); },
  /* LA OLEADA SUENA A CUERNO Y NO A CAMPANA, y es lo único que la anuncia sin
     mirar el cartel: dos tonos graves que suben, con la quinta encima. Un
     sonido agudo se confundiría con subir de nivel, que es la recompensa —y
     una oleada que llega no es una recompensa. */
  ola:     () => { _tono(98, 147, 0.62, 0.17, 'sawtooth'); _tono(147, 196, 0.55, 0.09, 'triangle');
                   _ruido(0.55, 'lowpass', 220, 0.7, 0.14, 1.0); },
  gana:    () => { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => AC && _tono(f, f * 1.005, 0.42, 0.17, 'triangle'), i * 150)); },
  muere:   () => { _tono(160, 40, 1.1, 0.28, 'sawtooth'); _ruido(0.9, 'lowpass', 300, 0.7, 0.22, 1.0); },
  /* ── EL REMATE SUENA EN DOS TIEMPOS, y son dos sonidos distintos ────────
     El salto es un tono que SUBE con un siseo de aire: anuncia, y el que lo
     oye sabe que lo que viene todavía no pasó. El impacto baja, es grave y
     es LO MÁS FUERTE DEL JUEGO —0,46 contra los 0,34 de un impacto normal—
     porque es el único golpe que cuesta una barra entera. Uno solo para los
     dos momentos dejaría el aviso y el golpe indistinguibles.             */
  remate:  () => { _tono(300, 900, 0.34, 0.17, 'triangle'); _ruido(0.34, 'highpass', 2100, 0.7, 0.14, 1.0); },
  remImpacto: () => { _tono(180, 44, 0.72, 0.46, 'sawtooth');
                      _ruido(0.52, 'lowpass', 190, 0.9, 0.42, 0.9);
                      _ruido(0.30, 'highpass', 3400, 0.7, 0.26, 0.7); },
};
function son(k) { if (AC && SON[k]) try { SON[k](); } catch (e) {} }

/* ── LA INTERFAZ ───────────────────────────────────────────────────────────
   Nada de texto suelto en el código: TODO sale de la tabla. Y las pantallas
   se repintan al cambiar de idioma, porque escrito una vez al arrancar el
   panel se queda en el idioma anterior — el defecto que en Z Force costó
   107 claves.                                                              */
const $ = s => document.querySelector(s);
function pintaIdioma() {
  $('#mSub').textContent = T('sub');
  $('#mJugar').textContent = T('jugar');
  $('#mSeguir').textContent = T('seguir');
  $('#mTitCal').textContent = T('calidad');
  $('#mTitIdi').textContent = T('idioma');
  $('#mPie').textContent = T('pie');
  pintaRecord();
  $('#paTit').textContent = T('pausa');
  $('#paSeguir').textContent = T('seguir');
  $('#paMenu').textContent = T('menu');
  $('#paPie').textContent = T('piePausa');
  $('#fOtra').textContent = T('otra');
  $('#fMenu').textContent = T('menu');
  $('#teclas').textContent = T('teclas');
  document.querySelectorAll('#mCal button').forEach(b => { b.textContent = T('c' + b.dataset.c); });
  pintaHud(true);
  dialogoPinta($('#dialogo'));   // la línea que se está leyendo también cambia
  if (PART === 'fin') pintaFin();
}
/* EL RÉCORD VA EN EL MENÚ Y NO EN LA PANTALLA DE FINAL: en el final ya está
   el número de ESTA partida, y dos cifras juntas no se comparan de una ojeada.
   En el menú es lo único que contesta «¿por qué volver a jugar?». */
function pintaRecord() {
  /* EL NÚMERO DE ZONAS SALE DE LA TABLA Y NO DEL TEXTO. Decía «3 zonas»
     escrito adentro de la cadena en los tres idiomas, y las zonas son CINCO
     desde la vuelta 151: el menú describía un juego que ya no existe, y eso
     no falla ni avisa. */
  $('#mTot').textContent = T('total', OLA_TOTAL, ZONAS.length);
  /* «TERMINADO» ES LA ÚNICA MARCA DE QUE EL JUEGO SE PUEDE PASAR. Sin ella,
     el récord de once oleadas y el de diez se leen igual de lejos y no hay
     nada en el menú que diga que hay un final del otro lado. */
  $('#mRec').textContent = RECORD.olas > 0
    ? (RECORD.gano ? T('hecho') + ' · ' : '')
      + T('recLinea', T('ola') + ' ' + RECORD.olas + '/' + OLA_TOTAL, RECORD.bajas)
    : T('rec') + ' · ' + T('recNada');
}

function pintaFin() {
  $('#fTit').textContent = T(GANO ? 'ganaste' : 'perdiste');
  $('#fSub').textContent = T(GANO ? 'ganasteS' : 'perdisteS');
  const m = Math.floor(JUG.tiempo / 60), s = Math.floor(JUG.tiempo % 60);
  $('#fDatos').textContent = T('datos2', OLA.hechas, OLA_TOTAL, JUG.bajas, JUG.nivel,
                              m + ':' + String(s).padStart(2, '0'));
}

let _hudV = -1, _hudA = -1, _hudX = -1, _hudN = -1, _hudR = -1, _hudZ = -1;
function pintaHud(forzar) {
  /* SE ESCRIBE SÓLO LO QUE CAMBIÓ. Escribir en el DOM en cada cuadro obliga
     al navegador a recalcular el layout sesenta veces por segundo para poner
     el mismo texto. */
  const v = Math.round(JUG.vida / JUG.vidaMax * 100);
  if (forzar || v !== _hudV) { $('#bVida i').style.transform = 'scaleX(' + lim(v, 0, 100) / 100 + ')'; _hudV = v; }
  const a = Math.round(JUG.fur / J_FUR * 100);
  if (forzar || a !== _hudA) {
    $('#bFur i').style.transform = 'scaleX(' + lim(a, 0, 100) / 100 + ')';
    $('#bFur').classList.toggle('full', a >= 100);
    _hudA = a;
  }
  const x = Math.round(JUG.xp / JUG.xpSig * 100);
  if (forzar || x !== _hudX) { $('#bXp i').style.transform = 'scaleX(' + lim(x, 0, 100) / 100 + ')'; _hudX = x; }
  pintaBotones(forzar);
  if (forzar || JUG.nivel !== _hudN) { $('#nivel').textContent = T('nivel') + ' ' + JUG.nivel; _hudN = JUG.nivel; }
  /* EL CONTADOR DICE LAS DOS COSAS: cuántos quedan de la oleada que está en
     pie y en qué oleada de la zona va. Con sólo «QUEDAN 3» no hay forma de
     saber si limpiar eso abre la zona o trae otra tanda, y esa diferencia es
     justamente lo que el jugador está decidiendo cuando le queda media vida. */
  const r = esqVivos(ZONA_ACT), Z = ZONAS[ZONA_ACT];
  const rey = Z.olas[OLA.i] === 'rey';
  const cl = r + OLA.i * 1000 + ZONA_ACT * 100000 + (OLA.espera > 0 ? 7e6 : 0);
  if (forzar || cl !== _hudR) {
    $('#restan').innerHTML = OLA.espera > 0
      ? '<b>' + T('olaViene', OLA.i + 1, Z.olas.length) + '</b>'
      : (rey ? '<b>' + T('restanRey') + '</b>'
             : T('ola') + ' ' + (OLA.i + 1) + '/' + Z.olas.length + '<br><b>' + T('restan') + ' ' + r + '</b>');
    _hudR = cl;
  }
  if (forzar || ZONA_VIS !== _hudZ) {
    $('#zonaTit').textContent = T('z' + ZONAS[ZONA_VIS].id);
    $('#zonaSub').textContent = T('z' + ZONAS[ZONA_VIS].id + 'S');
    _hudZ = ZONA_VIS;
  }
}

/* ── LOS BOTONES DICEN SI SE PUEDE ─────────────────────────────────────────
   La condición NO se escribe acá: se le pregunta a `jugPide`, que es la que
   de verdad decide. Con la regla copiada, el botón se apaga en un caso y el
   golpe sale igual en otro — y a partir de ahí el jugador no puede confiar en
   lo que ve, que en un juego de aguante es lo único que administra.       */
let _btA = -1, _btE = -1, _btR = -1;
function pintaBotones(forzar) {
  const puedeA = !JUG.muerto && JUG.esqT <= 0 && !jugRematando() ? 1 : 0;
  const puedeE = !JUG.muerto && JUG.esqT <= 0 && JUG.esqEsp <= 0 && !jugRematando() ? 1 : 0;
  /* EL BOTÓN DEL REMATE APARECE Y DESAPARECE, no se apaga: la condición es
     `jugPuedeRemate`, o sea la misma que decide si el golpe sale. Con la regla
     copiada acá, el botón podría estar en un caso donde apretarlo no hace
     nada, y eso es peor que no tenerlo. */
  const puedeR = jugPuedeRemate() ? 1 : 0;
  if (forzar || puedeR !== _btR) { $('#bRem').classList.toggle('hay', !!puedeR); _btR = puedeR; }
  if (forzar || puedeA !== _btA) { $('#bAtaca').classList.toggle('no', !puedeA); _btA = puedeA; }
  if (forzar || puedeE !== _btE) {
    const e = $('#bEsq');
    e.classList.toggle('no', !puedeE);
    /* el aro de adentro se vacía mientras dura la espera: un botón apagado
       dice «ahora no» y el aro dice «cuánto falta», que no es lo mismo */
    e.classList.toggle('espera', JUG.esqEsp > 0);
    _btE = puedeE;
  }
  if (JUG.esqEsp > 0) {
    const k = 1 - JUG.esqEsp / J_ESQ_ESPERA;
    $('#bEsq .esp').style.clipPath = 'inset(' + ((1 - k) * 100).toFixed(1) + '% 0 0 0)';
    _btE = -1;                                   // que se relea al terminar
  }
}

let _av = '';
function pintaAviso(dt) {
  AVISO_T = Math.max(0, AVISO_T - dt);
  const e = $('#aviso');
  if (AVISO_T > 0 && AVISO !== _av) { e.textContent = AVISO; _av = AVISO; }
  const o = AVISO_T > 0 ? Math.min(1, AVISO_T / 0.42) : 0;
  e.style.opacity = o;
  if (o === 0) _av = '';
}

/* ── EL DIÁLOGO DE ZONA: UNA LÍNEA LA PRIMERA VEZ QUE SE ENTRA A CADA UNA ──
   La lista SALE DE `ZONAS` y el rey se lleva UNA CASILLA APARTE, la última.
   Estaba clavada en cuatro y el rey usaba `DICHO[3]`, que con tres zonas caía
   justo una más allá de la última y por eso funcionaba. Con cinco, la casilla
   3 es el OSARIO: entrar ahí dejaba al rey mudo, y la ceniza pedía `d4`, que
   no existía en ninguna tabla — en pantalla salía la clave, «d4», escrita con
   todas las letras. Ninguna de las dos cosas falla: se leen. */
const DICHO = ZONAS.map(() => false).concat(false);
const DICHO_REY = ZONAS.length;

/* ── LA HISTORIA PASA POR UNA COLA, Y NO ES COMODIDAD ──────────────────────
   Con `e.textContent = …` directo, dos líneas que caen en el mismo segundo se
   pisan y sólo se lee la última: el prólogo son TRES seguidas y el epílogo
   otras tres, así que sin cola se leería una de cada tres. Y la línea de zona
   entra por la misma cola en vez de escribir el cartel ella: con dos caminos,
   entrar al pantano en medio del prólogo borra el prólogo.
   SE GUARDA LA CLAVE Y NO EL TEXTO —también la del cartel que está puesto en
   este momento, en `dataset.k`— porque `pintaIdioma` tiene que poder repintar
   lo que se está leyendo. Es la regla de siempre acá: con el texto resuelto
   adentro, cambiar de idioma deja la línea en el idioma anterior.          */
let COLA = [];
const diceCola = (l, seg) => { for (const c of l) COLA.push([c[0], c[1] || [], seg || 5.2]); };
function dialogoPinta(e) {
  if (!e.dataset.k) return;
  e.textContent = T(e.dataset.k, ...JSON.parse(e.dataset.a || '[]'));
}
function dialogoPaso(dt) {
  const e = $('#dialogo');
  if (!DICHO[ZONA_VIS]) { DICHO[ZONA_VIS] = true; COLA.push(['d' + ZONA_VIS, [], 5.5]); }
  let t = parseFloat(e.dataset.t || '0') - dt;
  /* la que sigue entra recién cuando la anterior se APAGÓ del todo: entrando
     en `t <= 0` el cambio de texto cae en el mismo cuadro que el fundido y lo
     que se ve es un cartel que parpadea y cambia de frase a la vez */
  if (t <= -0.25 && COLA.length) {
    const [k, a, seg] = COLA.shift();
    e.dataset.k = k; e.dataset.a = JSON.stringify(a);
    dialogoPinta(e); t = seg;
  }
  e.dataset.t = t;
  e.style.opacity = t > 0 ? Math.min(1, t / 0.6) : 0;
}
function dialogoRey() {
  if (DICHO[DICHO_REY]) return; DICHO[DICHO_REY] = true;
  COLA.push(['dRey', [], 5.5]);
}

/* ── LA CLASE SE LLAMA `jugando` Y NO `enJuego` ────────────────────────────
   Decía `enJuego` y las cinco reglas del CSS piden `jugando`, así que NINGUNA
   aplicaba nunca. Medido antes de tocar nada, con la partida ya empezada:
   `#hud` en opacidad 0 —o sea la vida, el aguante, la xp, el nivel, la zona,
   el contador y el cartel de historia invisibles la partida entera— y `#tac`
   en `display:none`, con los botones de ATACAR y ESQUIVAR midiendo 0×0. En un
   teléfono eso no es un HUD que falta: es que NO SE PUEDE ATACAR. Lo tapaba
   que en PC el teclado hace las dos cosas por otro camino.
   `__H.hud()` mide exactamente esto y es lo que impide que vuelva.        */
function verPanel(p) {
  for (const k of ['pIdioma', 'pMenu', 'pPausa', 'pFin']) $('#' + k).classList.toggle('on', k === p);
  document.body.classList.toggle('jugando', p === null);
}


/* ══════════════ LA INTERFAZ GENERADA ═════════════════════════════════════
   `i_ui.js` trae seis imágenes en base64: el cartel del nombre, la chapa de
   hueso de los botones y los cuatro glifos. Acá lo único que se hace es
   ponerlas en variables de CSS y encender las dos clases que las usan.

   NADA SE ENCIENDE HASTA QUE DECODIFICAN, y ésa es toda la gracia del
   reparto. Un data URI decodifica de forma asincrónica, así que una clase
   puesta antes de tiempo deja cuatro botones con una máscara sin imagen — o
   sea cuatro cuadrados de color macizo, que es PEOR que el glifo de texto que
   venía a reemplazar. `body.icos` la pone la carga de las CINCO piezas del
   botón y `body.cartel` la del cartel, por separado: un blob roto cuesta su
   dibujo y no los otros cinco. El glifo de texto y el `HUESOS` escrito con la
   tipografía del sistema se quedan debajo, y son lo que se ve si nada llega.

   Y EL COLOR SIGUE VIVIENDO EN EL CSS. Los cuatro glifos entran como
   `-webkit-mask` sobre `currentColor`, no como imagen pintada: por eso el
   botón de remate puede seguir siendo ámbar cuando la barra está llena y el
   `.bt.no{opacity:.30}` de un botón apagado sigue funcionando.            */
function uiCarga() {
  if (typeof UI_B64 !== 'object') return;
  const raiz = document.documentElement.style;
  const pon = (k, v) => new Promise(ok => {
    const b = UI_B64[k];
    if (!b) return ok(false);
    const im = new Image();
    im.onload = () => { raiz.setProperty(v, 'url(' + im.src + ')'); ok(true); };
    im.onerror = () => ok(false);
    im.src = 'data:image/webp;base64,' + b;
  });
  pon('cartel', '--cartel').then(o => o && document.body.classList.add('cartel'));
  Promise.all([pon('chapa', '--chapa'), pon('atacar', '--icAtacar'),
    pon('esquiva', '--icEsquiva'), pon('remate', '--icRemate'),
    pon('camara', '--icCamara')])
    .then(r => { if (r.every(Boolean)) document.body.classList.add('icos'); });
}
uiCarga();
