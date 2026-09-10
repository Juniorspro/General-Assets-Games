
/* ══════════════════════════════════════════════════════════════════════════
   EL AUDIO, PROCEDURAL
   ──────────────────────────────────────────────────────────────────────────
   Ni un archivo, y aca eso no es una limitacion sino lo correcto: lo que
   suena es VIENTO Y ARENA, o sea ruido filtrado, y un clip grabado de eso
   pesa cientos de kilobytes y encima se corta cada vez que da la vuelta —y
   ese corte se escucha mas que el viento—. Un ruido generado no tiene vuelta
   que dar.

   TODO CUELGA DE UN MAESTRO CON ANALIZADOR, que es lo unico que permite
   decir "suena" con un numero en vez de "no tiro excepcion".

   Y LA CAMA SIGUE A LA VELOCIDAD. El viento no es ambiente: es el unico
   sitio del juego donde la velocidad —que es lo que el jugador administra—
   se escucha. A ocho metros por segundo es un susurro y a treinta y ocho una
   racha.                                                                  */

let AC = null, MAE = null, ANA = null, RUIDO = null;
let CAMA = null, CAMA_G = null, CAMA_F = null;
let PAD = [], PAD_G = null;
let SON_ON = true;

const VOL = { maestro: 0.62, cama: 0.30, pad: 0.16 };

function audioArranca() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  AC = new C();
  MAE = AC.createGain(); MAE.gain.value = SON_ON ? VOL.maestro : 0;
  ANA = AC.createAnalyser(); ANA.fftSize = 2048;
  MAE.connect(ANA); ANA.connect(AC.destination);

  /* UN SEGUNDO DE RUIDO, GENERADO UNA VEZ. Cada golpe lo vuelve a leer con
     otro filtro y otra envolvente: hacer un buffer nuevo por sonido son
     44.100 numeros al azar por cada moneda. */
  RUIDO = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // la cama: ruido rosa-ish por un pasabajos que se abre con la velocidad
  CAMA = AC.createBufferSource(); CAMA.buffer = RUIDO; CAMA.loop = true;
  CAMA_F = AC.createBiquadFilter(); CAMA_F.type = 'lowpass';
  CAMA_F.frequency.value = 420; CAMA_F.Q.value = 0.7;
  CAMA_G = AC.createGain(); CAMA_G.gain.value = 0;
  CAMA.connect(CAMA_F); CAMA_F.connect(CAMA_G); CAMA_G.connect(MAE);
  CAMA.start();

  /* EL PAD SE TRANSPORTA CON LA HORA DEL DIA. Tres senos doblados y
     desafinados unas milesimas: dos senos identicos suenan a tono de prueba
     y dos que baten cada varios segundos suenan a instrumento. Y que la
     tonica siga a la paleta es lo que hace que amanecer se ESCUCHE. */
  PAD_G = AC.createGain(); PAD_G.gain.value = 0; PAD_G.connect(MAE);
  const filtro = AC.createBiquadFilter();
  filtro.type = 'lowpass'; filtro.frequency.value = 900; filtro.Q.value = 0.4;
  filtro.connect(PAD_G);
  PAD = [];
  for (let i = 0; i < 6; i++) {
    const o = AC.createOscillator(); o.type = 'sine';
    const g = AC.createGain(); g.gain.value = 0.30 / 6;
    o.connect(g); g.connect(filtro); o.start();
    PAD.push(o);
  }
  padAfina(0);
}

/* pentatonica menor: la escala en la que cualquier nota suena bien con
   cualquier otra, que en una cama que no para nunca es la diferencia entre
   musica y dolor de cabeza */
const PAD_SEMI = [0, 7, 12, 15, 19, 24];
function padAfina(h) {
  if (!PAD.length) return;
  const raiz = 55 * Math.pow(2, ((Math.round(h * 8) % 8) * 2) / 12);   // ocho tonicas, una por paleta
  for (let i = 0; i < PAD.length; i++) {
    const f = raiz * Math.pow(2, PAD_SEMI[i] / 12) * (i % 2 ? 1.0023 : 1);
    PAD[i].frequency.setTargetAtTime(f, AC.currentTime, 1.4);
  }
}

function audioPaso(dt, enJuego) {
  if (!AC) return;
  const t = AC.currentTime;
  const v = enJuego && R.vivo ? clamp((R.s - 6) / 26, 0, 1) : 0;
  CAMA_G.gain.setTargetAtTime(v * VOL.cama, t, 0.25);
  CAMA_F.frequency.setTargetAtTime(320 + v * 1500, t, 0.30);
  PAD_G.gain.setTargetAtTime(VOL.pad * (enJuego ? 0.75 : 1), t, 0.8);
  padAfina(HORA);
}

function audioMudo(v) {
  SON_ON = !v;
  if (MAE) MAE.gain.setTargetAtTime(SON_ON ? VOL.maestro : 0, AC.currentTime, 0.05);
}

/* ── LOS GOLPES ───────────────────────────────────────────────────────────
   Uno solo dispara ruido filtrado y otro un oscilador; la unica regla dura
   es la MEZCLA: la cama abajo de todo, un truco por encima, y el choque
   arriba de todos —es el unico momento en que el juego habla mas fuerte que
   el jugador—. Sin esa escala, terminar una voltereta suena igual que
   juntar una moneda y ninguna de las dos cosas significa nada.           */
function _env(g, t, a, d, pico) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function _ruido(t, dur, tipo, f0, f1, pico, q) {
  const s = AC.createBufferSource(); s.buffer = RUIDO;
  s.playbackRate.value = 0.85 + Math.random() * 0.3;
  const f = AC.createBiquadFilter(); f.type = tipo;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  f.Q.value = q || 1;
  const g = AC.createGain();
  s.connect(f); f.connect(g); g.connect(MAE);
  _env(g, t, 0.008, dur, pico);
  s.start(t); s.stop(t + dur + 0.08);
}
function _tono(t, dur, f0, f1, pico, tipo) {
  const o = AC.createOscillator(); o.type = tipo || 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = AC.createGain();
  o.connect(g); g.connect(MAE);
  _env(g, t, 0.01, dur, pico);
  o.start(t); o.stop(t + dur + 0.08);
}

function son(k) {
  if (!AC || !SON_ON) return;
  const t = AC.currentTime;
  switch (k) {
    // el despegue: un raspado corto que SUBE, que es lo que hace la tabla
    case 'salta':  _ruido(t, 0.16, 'bandpass', 700, 2600, 0.30, 1.6); break;
    // el aterrizaje: golpe grave de arena, que BAJA
    case 'cae':    _ruido(t, 0.26, 'lowpass', 1400, 180, 0.42, 0.9); break;
    case 'flip':   _tono(t, 0.30, 480, 900, 0.20, 'triangle');
                   _tono(t + 0.06, 0.34, 720, 1350, 0.16, 'sine'); break;
    /* EL RASPADO DE LA CUERDA ERA EL SONIDO MAS FLOJO DEL JUEGO, y no le
       corresponde: medido, 0,0105 de rms contra 0,0067 del fondo —o sea 1,5
       veces— cuando saltar, que pasa cincuenta veces mas seguido, daba 1,8.
       Un pasabanda con Q 7 es tan angosto que casi no deja pasar energia.  */
    case 'grind':  _ruido(t, 0.42, 'bandpass', 1800, 2400, 0.34, 3.5); break;
    case 'moneda': _tono(t, 0.13, 1180, 1180, 0.20, 'sine');
                   _tono(t + 0.055, 0.20, 1760, 1760, 0.17, 'sine'); break;
    case 'truco':  _tono(t, 0.22, 880, 1320, 0.18, 'triangle'); break;
    case 'choque': _ruido(t, 0.55, 'lowpass', 900, 90, 0.62, 0.8);
                   _tono(t, 0.42, 180, 55, 0.34, 'sawtooth'); break;
    case 'ui':     _tono(t, 0.09, 660, 660, 0.16, 'square'); break;
    case 'obj':    _tono(t, 0.16, 880, 880, 0.20, 'sine');
                   _tono(t + 0.09, 0.26, 1320, 1320, 0.18, 'sine');
                   _tono(t + 0.20, 0.34, 1760, 1760, 0.16, 'sine'); break;
  }
}

/* el pico y el rms de lo que SALE, no de lo que se pidio: es la unica prueba
   de que un sonido sono, y la unica forma de comprobar la mezcla */
function audioNivel() {
  if (!ANA) return { pico: 0, rms: 0 };
  const n = ANA.fftSize, d = new Float32Array(n);
  ANA.getFloatTimeDomainData(d);
  let p = 0, s = 0;
  for (let i = 0; i < n; i++) { const v = Math.abs(d[i]); if (v > p) p = v; s += d[i] * d[i]; }
  return { pico: +p.toFixed(4), rms: +Math.sqrt(s / n).toFixed(4) };
}
