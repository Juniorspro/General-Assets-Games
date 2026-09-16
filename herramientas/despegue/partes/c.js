
/* ══════════════════════ EL AUDIO, PROCEDURAL ══════════════════════
   ── POR QUE NO HAY UN SOLO ARCHIVO ──
   Lo que suena en este juego es un MOTOR, y un motor es ruido filtrado: un clip
   grabado pesa cientos de KB, se corta en cada vuelta del bucle y —lo que
   importa— no sabe cuanto empuje hay. El ruido generado se abre y se cierra con
   el empuje, cuadro a cuadro, y eso es lo que hace que apretar SE OIGA. Lo
   demas son osciladores cortos: monedas, golpes, la campanita de cada capa, la
   cuenta regresiva. La musica es una cama de acordes que respira, porque un
   tema con ritmo compite con el motor y aca el motor es el protagonista. */
let AUD = null, MAE = null, GMUS = null, GFX = null, RUI = null, ANAL = null;
let VOL_MUS = 0.60, VOL_FX = 0.80;
/* el motor vive todo el tiempo y se le mueve la ganancia: arrancarlo y pararlo
   en cada cuadro daria clicks */
const MOT = { src: null, filt: null, gan: null, on: false, nivel: 0 };
const CAMA = { on: false, oscs: [], gan: null, filt: null, t0: 0, raiz: 110 };

function armaAudio(){
  if (AUD) return;
  try { AUD = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  MAE = AUD.createGain(); MAE.gain.value = 0.9; MAE.connect(AUD.destination);
  ANAL = AUD.createAnalyser(); ANAL.fftSize = 1024; MAE.connect(ANAL);
  GMUS = AUD.createGain(); GMUS.gain.value = VOL_MUS; GMUS.connect(MAE);
  GFX = AUD.createGain(); GFX.gain.value = VOL_FX; GFX.connect(MAE);
  const n = Math.floor(AUD.sampleRate*1.0);
  RUI = AUD.createBuffer(1, n, AUD.sampleRate);
  const d = RUI.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
  /* el motor: ruido en bucle → pasabajos → ganancia. El pasabajos se abre con
     el empuje, asi que a plena potencia el motor es grave y ancho y al soltar
     se queda un silbido fino */
  MOT.src = AUD.createBufferSource(); MOT.src.buffer = RUI; MOT.src.loop = true;
  MOT.filt = AUD.createBiquadFilter(); MOT.filt.type = 'lowpass'; MOT.filt.frequency.value = 120; MOT.filt.Q.value = 0.8;
  MOT.gan = AUD.createGain(); MOT.gan.gain.value = 0;
  MOT.src.connect(MOT.filt); MOT.filt.connect(MOT.gan); MOT.gan.connect(GFX);
  MOT.src.start(); MOT.on = true;
}
function despiertaAudio(){ armaAudio(); if (AUD && AUD.state === 'suspended') AUD.resume(); }
function ponVol(mus, fx){
  VOL_MUS = mus; VOL_FX = fx;
  if (GMUS) GMUS.gain.setTargetAtTime(mus, AUD.currentTime, 0.05);
  if (GFX) GFX.gain.setTargetAtTime(fx, AUD.currentTime, 0.05);
}

/* ── EL MOTOR SIGUE AL EMPUJE, CUADRO A CUADRO ──
   `k` es la fraccion de empuje (0 a 1) y `aire` cuanta atmosfera hay (1 abajo,
   0 en el espacio): en el vacio el motor no se oye, asi que se apaga con la
   altura aunque siga empujando. Es fisica y de paso es lo que hace que salir de
   la atmosfera se SIENTA. */
function motorPaso(k, aire, dt){
  if (!MOT.on) return;
  const obj = k*aire*0.55;
  MOT.nivel += (obj - MOT.nivel)*Math.min(1, dt*9);
  MOT.gan.gain.value = MOT.nivel;
  MOT.filt.frequency.value = 90 + k*aire*520 + Math.random()*40*k;
}

/* ── LOS EFECTOS CORTOS ── */
function tono(f0, f1, dur, tipo, vol, dest){
  if (!AUD) return;
  const t = AUD.currentTime, o = AUD.createOscillator(), g = AUD.createGain();
  o.type = tipo || 'square';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest || GFX); o.start(t); o.stop(t + dur + 0.02);
}
function ruido(dur, f0, f1, vol, q){
  if (!AUD) return;
  const t = AUD.currentTime, s = AUD.createBufferSource(), f = AUD.createBiquadFilter(), g = AUD.createGain();
  s.buffer = RUI; f.type = 'bandpass'; f.Q.value = q || 0.9;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(GFX); s.start(t); s.stop(t + dur + 0.02);
}
function son(k){
  if (!AUD) return;
  switch (k){
    case 'moneda':  tono(1320, 1980, 0.12, 'sine', 0.22); tono(1980, 2640, 0.10, 'sine', 0.12); break;
    case 'golpe':   ruido(0.25, 400, 80, 0.5, 0.6); tono(180, 60, 0.22, 'sawtooth', 0.3); break;
    case 'explota': ruido(0.9, 900, 40, 0.9, 0.5); ruido(1.4, 220, 30, 0.7, 0.4); tono(120, 30, 0.8, 'sawtooth', 0.35); break;
    case 'rafaga':  ruido(0.6, 300, 2400, 0.55, 0.7); tono(220, 880, 0.35, 'sawtooth', 0.18); break;
    case 'capa':    tono(880, 880, 0.35, 'sine', 0.16); setTimeout(() => tono(1320, 1320, 0.45, 'sine', 0.16), 120); break;
    case 'cuenta':  tono(660, 660, 0.12, 'square', 0.16); break;
    case 'ya':      tono(880, 1320, 0.30, 'square', 0.22); ruido(1.2, 120, 900, 0.7, 0.5); break;
    case 'maximo':  tono(660, 990, 0.25, 'sine', 0.18); setTimeout(() => tono(990, 1320, 0.4, 'sine', 0.18), 160); break;
    case 'record':  [0, 120, 240, 360].forEach((d, i) => setTimeout(() => tono(660*Math.pow(1.25, i), 660*Math.pow(1.25, i), 0.3, 'sine', 0.2), d)); break;
    case 'compra':  tono(520, 1040, 0.16, 'sine', 0.2); setTimeout(() => tono(1040, 1560, 0.18, 'sine', 0.16), 90); break;
    case 'no':      tono(220, 160, 0.2, 'square', 0.16); break;
    case 'toque':   tono(900, 700, 0.06, 'sine', 0.12); break;
    case 'planea':  tono(440, 220, 0.6, 'sine', 0.12); break;
  }
}

/* ── LA CAMA: CUATRO SENOS DESAFINADOS QUE RESPIRAN ──
   Dos senos identicos suenan a prueba de audio; dos desafinados un par de
   milesimas baten cada pocos segundos y suenan a instrumento. Un pasabajos que
   se abre y se cierra a 0,06 Hz es lo que la hace respirar en vez de zumbar.
   En el espacio la raiz sube una quinta: mismo tema, otro lugar. */
function camaArranca(){
  if (!AUD || CAMA.on) return;
  CAMA.on = true; CAMA.t0 = AUD.currentTime;
  CAMA.gan = AUD.createGain(); CAMA.gan.gain.value = 0;
  CAMA.filt = AUD.createBiquadFilter(); CAMA.filt.type = 'lowpass'; CAMA.filt.frequency.value = 500; CAMA.filt.Q.value = 0.6;
  CAMA.gan.connect(CAMA.filt); CAMA.filt.connect(GMUS);
  const rel = [1, 1.0023, 1.5, 1.4977, 2, 2.0031, 2.25, 2.2461];
  CAMA.oscs = rel.map((r, i) => {
    const o = AUD.createOscillator(), g = AUD.createGain();
    o.type = i < 4 ? 'sine' : 'triangle'; o.frequency.value = CAMA.raiz*r;
    g.gain.value = i < 2 ? 0.16 : (i < 4 ? 0.10 : 0.05);
    o.connect(g); g.connect(CAMA.gan); o.start(); return { o, g, r };
  });
  CAMA.gan.gain.setTargetAtTime(0.9, AUD.currentTime, 1.2);
}
function camaPaso(hFrac){
  if (!CAMA.on) return;
  const t = AUD.currentTime - CAMA.t0;
  CAMA.filt.frequency.value = 380 + 320*(0.5 + 0.5*Math.sin(t*0.38)) + 300*hFrac;
  /* la raiz sube con la altura: 110 Hz abajo, 165 (una quinta) en el espacio */
  const raiz = 110*Math.pow(1.5, cl(hFrac, 0, 1));
  CAMA.raiz += (raiz - CAMA.raiz)*0.02;
  for (const c of CAMA.oscs) c.o.frequency.value = CAMA.raiz*c.r;
}
function camaAgacha(v){ if (CAMA.on) CAMA.gan.gain.setTargetAtTime(v, AUD.currentTime, 0.4); }

/* la medicion: es lo unico que prueba que sono */
function nivelAudio(){
  if (!ANAL) return { pico: 0, rms: 0 };
  const d = new Float32Array(ANAL.fftSize); ANAL.getFloatTimeDomainData(d);
  let p = 0, s = 0; for (let i = 0; i < d.length; i++){ const a = Math.abs(d[i]); if (a > p) p = a; s += d[i]*d[i]; }
  return { pico: +p.toFixed(4), rms: +Math.sqrt(s/d.length).toFixed(4) };
}
