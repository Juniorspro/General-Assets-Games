/* ══════════════════════════════════════════════════════════════════════════
   G · EL AUDIO, PROCEDURAL
   Ni un byte de asset. Lo que suena en un juego de arcos son golpes cortos
   —la cuerda, el impacto, la madera que se parte— y VIENTO, que no se acaba
   nunca. Las dos cosas se escriben mejor de lo que se graban: un golpe corto
   grabado pesa mas que todo esto junto, y un bucle de viento tiene una vuelta
   que se escucha en cada pasada.

   Y EL VIENTO NO ES AMBIENTE: es la mecanica. El duelo 12 tira con cinco
   celdas por segundo cuadrado en contra, y si eso solo se leyera en un
   numero del HUD, el jugador se enteraria despues de fallar. Aca la cama
   sopla mas fuerte cuanto mas viento hay, asi que se oye antes de tirar.
   ══════════════════════════════════════════════════════════════════════════ */

let AC = null, MAE = null, BMUS = null, BFX = null, ANA = null, RUIDO = null;
let MUS_ON = false, MUS_T = 0, MUS_RAIZ = 110, MUS_REL = null, PAD = [];
let VTO = null, VTO_W = 0;

/* pentatonica menor: el mismo puñado de sonidos suena cien veces por partida,
   y la escala en la que cualquier nota pega con cualquier otra es la
   diferencia entre musica y tortura */
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17];
const RAICES = [110.0, 98.0, 130.81, 116.54];

function auDesp() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  AC = new C();
  MAE = AC.createGain(); MAE.gain.value = 1;
  ANA = AC.createAnalyser(); ANA.fftSize = 2048;
  MAE.connect(ANA); MAE.connect(AC.destination);
  /* DOS BUSES Y NO UNO: con todo colgado del maestro, bajar «la musica»
     bajaria tambien los golpes y las dos perillas de ajustes describirian la
     misma cosa. El viento va en el de musica: es cama, no acontecimiento. */
  BMUS = AC.createGain(); BFX = AC.createGain();
  BMUS.connect(MAE); BFX.connect(MAE);
  auVol();
  const n = AC.sampleRate;
  RUIDO = AC.createBuffer(1, n, n);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  musArma(); vtoArma();
  if (AC.state === 'suspended') AC.resume();
}
function auVol() {
  if (!AC) return;
  BMUS.gain.setTargetAtTime(PROG.vol * 0.40, AC.currentTime, 0.05);
  BFX.gain.setTargetAtTime(PROG.fx, AC.currentTime, 0.05);
}

/* ── LA CAMA ──────────────────────────────────────────────────────────────
   Cuatro senos DOBLADOS Y DESAFINADOS dos milesimas: dos senos identicos
   suenan a tono de prueba y dos que baten cada pocos segundos suenan a
   instrumento. El pasabajos da una vuelta cada veintiun segundos, que es lo
   que hace que respire en vez de zumbar.                                   */
function musArma() {
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 0.6;
  const g = AC.createGain(); g.gain.value = 0.16;
  f.connect(g); g.connect(BMUS);
  const lfo = AC.createOscillator(), lg = AC.createGain();
  lfo.frequency.value = 1 / 21; lg.gain.value = 240;
  lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  PAD = [];
  for (const r of [1, 1.5, 2, 2.25]) for (const dt of [1, 1.0021]) {
    const o = AC.createOscillator(); o.type = 'sine';
    const og = AC.createGain(); og.gain.value = r === 1 ? 0.34 : 0.19;
    o.connect(og); og.connect(f); o.start();
    PAD.push({ o, r, dt });
  }
  musRaiz(MUS_RAIZ);
  MUS_REL = setInterval(musPlanea, 140);
}
function musRaiz(hz) {
  MUS_RAIZ = hz;
  if (!AC) return;
  for (const p of PAD) p.o.frequency.setTargetAtTime(hz * p.r * p.dt, AC.currentTime, 1.4);
}
/* LA AGENDA CUELGA DEL RELOJ DE AUDIO Y NO DE UN rAF: un cuadro se atrasa y
   se pausa en segundo plano, y ahi la campana caeria fuera de tiempo o no
   caeria nunca. */
function musPlanea() {
  if (!AC || !MUS_ON) return;
  const ahora = AC.currentTime;
  if (MUS_T < ahora) MUS_T = ahora + 0.2;
  while (MUS_T < ahora + 0.6) {
    campana(MUS_T, MUS_RAIZ * 4 * Math.pow(2, PENTA[(Math.random() * PENTA.length) | 0] / 12));
    MUS_T += 2.4 + Math.random() * 3.0;
  }
}
function campana(t, hz) {
  const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = hz;
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.10, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0006, t + 2.1);
  o.connect(g); g.connect(BMUS); o.start(t); o.stop(t + 2.2);
}
function musVer(v) { MUS_ON = v; if (AC) BMUS.gain.setTargetAtTime(v ? PROG.vol * 0.40 : 0, AC.currentTime, 0.5); }

/* ── EL VIENTO ────────────────────────────────────────────────────────────
   Ruido pasabajos con la ganancia y el corte atados a |viento|, mas un
   segundo LFO lento para que sople a rachas: un viento parejo se oye a
   estatica de radio y a los diez segundos el oido lo deja de escuchar.    */
function vtoArma() {
  const s = AC.createBufferSource(); s.buffer = RUIDO; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 0.9;
  const g = AC.createGain(); g.gain.value = 0;
  s.connect(f); f.connect(g); g.connect(BMUS); s.start();
  const lfo = AC.createOscillator(), lg = AC.createGain();
  lfo.frequency.value = 0.13; lg.gain.value = 0.35;
  lfo.connect(lg); lg.connect(g.gain); lfo.start();
  VTO = { f, g, base: 0 };
  auViento(0);
}
function auViento(w) {
  VTO_W = w;
  if (!AC || !VTO) return;
  const k = Math.min(1, Math.abs(w) / 5);
  VTO.base = 0.035 + k * 0.10;
  VTO.g.gain.setTargetAtTime(VTO.base, AC.currentTime, 0.8);
  VTO.f.frequency.setTargetAtTime(240 + k * 900, AC.currentTime, 0.8);
}

/* ── LOS GOLPES ───────────────────────────────────────────────────────────
   LA ESCALA ESTA ELEGIDA: el impacto en un cuerpo es lo mas fuerte del juego
   despues de ganar, y la cuerda tensandose lo mas flojo — porque la cuerda
   suena en cada tiro y un impacto decide el duelo.                        */
function ruidito(t, dur, hz, q, vol) {
  const s = AC.createBufferSource(); s.buffer = RUIDO;
  s.loop = true; s.playbackRate.value = 0.9 + Math.random() * 0.2;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q;
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  s.connect(f); f.connect(g); g.connect(BFX);
  s.start(t); s.stop(t + dur + 0.02);
}
function tono(t, dur, h0, h1, vol, tipo) {
  const o = AC.createOscillator(); o.type = tipo || 'sine';
  o.frequency.setValueAtTime(h0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, h1), t + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  o.connect(g); g.connect(BFX); o.start(t); o.stop(t + dur + 0.02);
}

/* cada material suena distinto AL CLAVARSE, y eso no es adorno: de noche o de
   lejos, el sonido es lo unico que dice contra que pego la flecha.         */
const CLAVA = {
  [TIERRA]:   [0.16, 320, 1.0, 0.24], [PASTO]:    [0.16, 300, 1.0, 0.22],
  [ARENA]:    [0.14, 260, 0.8, 0.20], [NIEVE]:    [0.18, 220, 0.7, 0.16],
  [PIEDRA]:   [0.11, 1700, 3.4, 0.30], [LADRILLO]: [0.12, 1300, 3.0, 0.28],
  [MADERA]:   [0.15, 700, 2.2, 0.30], [HOJA]:     [0.13, 2600, 1.6, 0.16],
  [METAL]:    [0.30, 2400, 8.0, 0.34],
};

function son(k, a) {
  if (!AC) return;
  const t = AC.currentTime + 0.001;
  if (k === 'tensa')      { ruidito(t, 0.07, 420 + (a || 0) * 700, 5.0, 0.055); }
  else if (k === 'tira')  { ruidito(t, 0.09, 1800, 1.6, 0.26); tono(t, 0.10, 420, 120, 0.16, 'triangle'); }
  else if (k === 'vuela') { ruidito(t, 0.34, 900, 0.9, 0.09); }
  else if (k === 'clava') {
    const c = CLAVA[a] || CLAVA[TIERRA];
    ruidito(t, c[0], c[1], c[2], c[3]);
    if (a === METAL) tono(t, 0.42, 2100, 1400, 0.12, 'triangle');
    else tono(t, c[0], 180, 90, 0.10);
  }
  else if (k === 'rompe') { ruidito(t, 0.26, 1100, 0.8, 0.30); ruidito(t + 0.05, 0.30, 2600, 1.2, 0.18); tono(t, 0.18, 150, 60, 0.16); }
  else if (k === 'pega')  { ruidito(t, 0.18, 380, 1.0, 0.38); tono(t, 0.20, 220, 70, 0.30); }
  else if (k === 'cabeza'){ ruidito(t, 0.20, 420, 1.0, 0.40); tono(t, 0.22, 260, 80, 0.32);
                            tono(t + 0.05, 0.55, 1320, 1320, 0.20, 'triangle'); }
  else if (k === 'falla') { tono(t, 0.16, 300, 190, 0.11, 'square'); }
  else if (k === 'turno') { tono(t, 0.14, 520, 660, 0.13, 'triangle'); }
  else if (k === 'ui')    { ruidito(t, 0.045, 1500, 2.2, 0.10); }
  else if (k === 'gana') {
    const b = MUS_RAIZ * 4;
    [0, 5, 7, 12].forEach((s, i) => tono(t + i * 0.10, 0.55, b * Math.pow(2, s / 12), b * Math.pow(2, s / 12), 0.26, 'triangle'));
    tono(t + 0.30, 0.9, b * 2, b * 2, 0.16, 'sine');
  }
  else if (k === 'pierde') {
    const b = MUS_RAIZ * 2;
    [0, -2, -5].forEach((s, i) => tono(t + i * 0.16, 0.7, b * Math.pow(2, s / 12), b * Math.pow(2, s / 12), 0.20, 'triangle'));
  }
}

/* la cuerda cruje MIENTRAS se tensa, y el crujido va atado a la tension y no
   a un temporizador: son el mismo numero, asi que el sonido no se puede
   separar de lo que el dedo esta haciendo */
let TENSA_ANT = -1;
function auTensa(k) {
  const n = Math.floor(cl(k, 0, 1) * 7);
  if (n !== TENSA_ANT) { if (n > TENSA_ANT && n > 0) son('tensa', k); TENSA_ANT = n; }
}
function auTensaCero() { TENSA_ANT = -1; }

function auNivel(ms) {
  return new Promise(r => {
    if (!AC || !ANA) { r({ pico: 0, rms: 0 }); return; }
    const buf = new Float32Array(ANA.fftSize);
    let pico = 0, sum = 0, n = 0;
    const t0 = performance.now();
    const paso = () => {
      ANA.getFloatTimeDomainData(buf);
      for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); if (v > pico) pico = v; sum += buf[i] * buf[i]; n++; }
      if (performance.now() - t0 < (ms || 700)) requestAnimationFrame(paso);
      else r({ pico: +pico.toFixed(4), rms: +Math.sqrt(sum / Math.max(1, n)).toFixed(4) });
    };
    paso();
  });
}
