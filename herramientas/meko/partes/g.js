
/* ══════════════════════════════════════════════════════════════════════════
   G · EL AUDIO, PROCEDURAL
   Ni un byte de asset. En un juego de piezas y pasos lo que suena son golpes
   cortos y una cama que no se termina nunca: eso se escribe, no se graba — y
   asi no hay bucle que dar la vuelta ni archivo que no decodifique.
   ══════════════════════════════════════════════════════════════════════════ */

let AC = null, MAE = null, BMUS = null, BFX = null, ANA = null, RUIDO = null;
let MUS_ON = false, MUS_T = 0, MUS_RAIZ = 110, MUS_REL = null, PAD = [];

/* pentatonica menor: en un juego donde el mismo sonido suena cien veces por
   partida, la escala en la que cualquier nota pega con cualquier otra es la
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
     bajaria tambien los golpes, y las dos perillas de ajustes describirian
     la misma cosa. */
  BMUS = AC.createGain(); BFX = AC.createGain();
  BMUS.connect(MAE); BFX.connect(MAE);
  auVol();
  const n = AC.sampleRate;
  RUIDO = AC.createBuffer(1, n, n);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  musArma();
  if (AC.state === 'suspended') AC.resume();
}
function auVol() {
  if (!AC) return;
  BMUS.gain.setTargetAtTime(PROG.vol * 0.40, AC.currentTime, 0.05);
  BFX.gain.setTargetAtTime(PROG.fx, AC.currentTime, 0.05);
}

/* ── LA CAMA ──────────────────────────────────────────────────────────────
   Cuatro senos DOBLADOS Y DESAFINADOS dos milesimas: dos senos identicos
   suenan a tono de prueba de audio y dos que baten cada pocos segundos
   suenan a instrumento. Y el pasabajos da una vuelta cada veintiun segundos,
   que es lo que hace que respire en vez de zumbar.                        */
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

/* ── LOS GOLPES ───────────────────────────────────────────────────────────
   Y LA ESCALA ESTA ELEGIDA: ganar es lo mas fuerte del juego y la pisada es
   lo mas flojo, porque la pisada suena cien veces por partida y ganar una.  */
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

function son(k) {
  if (!AC) return;
  const t = AC.currentTime + 0.001;
  if (k === 'paso')      { ruidito(t, 0.075, 900, 1.5, 0.13); tono(t, 0.06, 150, 90, 0.05); }
  else if (k === 'cae')  { ruidito(t, 0.16, 520, 1.1, 0.30); tono(t, 0.15, 190, 70, 0.20); }
  else if (k === 'mec')  { tono(t, 0.10, 320, 150, 0.20, 'square'); ruidito(t + 0.02, 0.22, 1900, 3.0, 0.16); }
  else if (k === 'toque'){ ruidito(t, 0.045, 1500, 2.2, 0.10); }
  else if (k === 'nope') { tono(t, 0.09, 260, 190, 0.16, 'square'); tono(t + 0.10, 0.13, 190, 130, 0.16, 'square'); }
  else if (k === 'gana') {
    const b = MUS_RAIZ * 4;
    [0, 5, 7, 12].forEach((s, i) => tono(t + i * 0.10, 0.55, b * Math.pow(2, s / 12), b * Math.pow(2, s / 12), 0.26, 'triangle'));
    tono(t + 0.30, 0.9, b * 2, b * 2, 0.16, 'sine');
  }
}
/* la pisada la dispara la FASE de la caminata y no un temporizador: son el
   mismo numero, o sea que el pie y el sonido no se pueden desincronizar */
let PASO_ANT = 0;
function auPasos() {
  const n = Math.floor(ROB.fase / Math.PI);
  if (n !== PASO_ANT) { PASO_ANT = n; if (!robQuieto()) son('paso'); }
}
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
