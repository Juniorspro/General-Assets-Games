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
  gana:    () => { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => AC && _tono(f, f * 1.005, 0.42, 0.17, 'triangle'), i * 150)); },
  muere:   () => { _tono(160, 40, 1.1, 0.28, 'sawtooth'); _ruido(0.9, 'lowpass', 300, 0.7, 0.22, 1.0); },
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
  $('#paTit').textContent = T('pausa');
  $('#paSeguir').textContent = T('seguir');
  $('#paMenu').textContent = T('menu');
  $('#paPie').textContent = T('piePausa');
  $('#fOtra').textContent = T('otra');
  $('#fMenu').textContent = T('menu');
  $('#teclas').textContent = T('teclas');
  document.querySelectorAll('#mCal button').forEach(b => { b.textContent = T('c' + b.dataset.c); });
  pintaHud(true);
  if (PART === 'fin') pintaFin();
}
function pintaFin() {
  $('#fTit').textContent = T(GANO ? 'ganaste' : 'perdiste');
  $('#fSub').textContent = T(GANO ? 'ganasteS' : 'perdisteS');
  const m = Math.floor(JUG.tiempo / 60), s = Math.floor(JUG.tiempo % 60);
  $('#fDatos').textContent = T('datos', JUG.bajas, JUG.nivel, m + ':' + String(s).padStart(2, '0'));
}

let _hudV = -1, _hudA = -1, _hudX = -1, _hudN = -1, _hudR = -1, _hudZ = -1;
function pintaHud(forzar) {
  /* SE ESCRIBE SÓLO LO QUE CAMBIÓ. Escribir en el DOM en cada cuadro obliga
     al navegador a recalcular el layout sesenta veces por segundo para poner
     el mismo texto. */
  const v = Math.round(JUG.vida / JUG.vidaMax * 100);
  if (forzar || v !== _hudV) { $('#bVida i').style.width = lim(v, 0, 100) + '%'; _hudV = v; }
  const a = Math.round(JUG.agu / J_AGU * 100);
  if (forzar || a !== _hudA) { $('#bAgu i').style.width = lim(a, 0, 100) + '%'; _hudA = a; }
  const x = Math.round(JUG.xp / JUG.xpSig * 100);
  if (forzar || x !== _hudX) { $('#bXp i').style.width = lim(x, 0, 100) + '%'; _hudX = x; }
  if (forzar || JUG.nivel !== _hudN) { $('#nivel').textContent = T('nivel') + ' ' + JUG.nivel; _hudN = JUG.nivel; }
  const r = esqVivos(ZONA_ACT);
  if (forzar || r !== _hudR) {
    $('#restan').textContent = (ZONA_ACT === 2 && r <= 1 ? T('restanRey') : T('restan') + ' ' + r);
    _hudR = r;
  }
  if (forzar || ZONA_VIS !== _hudZ) {
    $('#zonaTit').textContent = T('z' + ZONAS[ZONA_VIS].id);
    $('#zonaSub').textContent = T('z' + ZONAS[ZONA_VIS].id + 'S');
    _hudZ = ZONA_VIS;
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

/* el diálogo de zona: una línea, la primera vez que se entra a cada una */
const DICHO = [false, false, false, false];
function dialogoPaso(dt) {
  const e = $('#dialogo');
  if (!DICHO[ZONA_VIS]) {
    DICHO[ZONA_VIS] = true;
    e.textContent = T('d' + ZONA_VIS); e.dataset.t = '5.5';
  }
  const t = parseFloat(e.dataset.t || '0') - dt;
  e.dataset.t = t;
  e.style.opacity = t > 0 ? Math.min(1, t / 0.6) : 0;
}
function dialogoRey() {
  if (DICHO[3]) return; DICHO[3] = true;
  const e = $('#dialogo'); e.textContent = T('d3'); e.dataset.t = '5.5';
}

function verPanel(p) {
  for (const k of ['pIdioma', 'pMenu', 'pPausa', 'pFin']) $('#' + k).classList.toggle('on', k === p);
  document.body.classList.toggle('enJuego', p === null);
}
