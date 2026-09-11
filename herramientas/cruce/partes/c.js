
/* ══════════════════════ EL AUDIO, PROCEDURAL ══════════════════════
   Lo que suena acá son golpes cortos —un salto, una moneda, un frenazo— y una
   cama de acordes. Nada de eso necesita un archivo: un clip grabado pesaría
   cientos de KB, se cortaría en cada vuelta del bucle y no podría cambiar de
   afinación con el mundo. Lo unico que hace falta de verdad es que el susto
   suene MAS FUERTE que todo lo demas, y eso es un numero. */
let AUD = null, MAE = null, GMUS = null, GFX = null, RUI = null, ANAL = null;
let VOL_MUS = 0.55, VOL_FX = 0.80;
const CAMA = { on: false, oscs: [], gan: null, filt: null, t0: 0, raiz: 98 };

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
}
function despiertaAudio(){ armaAudio(); if (AUD && AUD.state === 'suspended') AUD.resume(); }
function ponVol(mus, fx){
  VOL_MUS = mus; VOL_FX = fx;
  if (GMUS) GMUS.gain.setTargetAtTime(mus, AUD.currentTime, 0.05);
  if (GFX) GFX.gain.setTargetAtTime(fx, AUD.currentTime, 0.05);
}
function tono(f0, f1, dur, tipo, vol, ret){
  if (!AUD) return;
  const t = AUD.currentTime + (ret || 0), o = AUD.createOscillator(), g = AUD.createGain();
  o.type = tipo || 'square';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(GFX); o.start(t); o.stop(t + dur + 0.02);
}
function ruido(dur, f0, f1, vol, q, ret){
  if (!AUD) return;
  const t = AUD.currentTime + (ret || 0), s = AUD.createBufferSource(), f = AUD.createBiquadFilter(), g = AUD.createGain();
  s.buffer = RUI; f.type = 'bandpass'; f.Q.value = q || 0.9;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(GFX); s.start(t); s.stop(t + dur + 0.02);
}
function son(k){
  if (!AUD) return;
  switch (k){
    /* el salto es lo que mas suena —una vez por fila— asi que es corto y suave:
       un blip largo cien veces por partida es insoportable */
    case 'salto':  tono(420, 700, 0.075, 'triangle', 0.13); break;
    case 'moneda': tono(1320, 1980, 0.10, 'sine', 0.20); tono(1980, 2640, 0.09, 'sine', 0.11, 0.05); break;
    case 'bocina': tono(392, 392, 0.16, 'sawtooth', 0.14); tono(523, 523, 0.16, 'sawtooth', 0.10); break;
    case 'auto':   ruido(0.4, 900, 60, 0.75, 0.5); tono(180, 50, 0.35, 'sawtooth', 0.4); break;
    case 'agua':   ruido(0.55, 1600, 200, 0.55, 0.7); tono(600, 180, 0.3, 'sine', 0.18); break;
    case 'tren':   ruido(1.1, 300, 1800, 0.6, 0.4); tono(140, 90, 0.9, 'sawtooth', 0.3); break;
    case 'aviso':  tono(880, 880, 0.11, 'square', 0.16); tono(880, 880, 0.11, 'square', 0.16, 0.22); break;
    case 'carancho': tono(1500, 620, 0.35, 'sawtooth', 0.26); tono(1200, 400, 0.4, 'square', 0.16, 0.12); break;
    case 'record': [0, 110, 220, 330].forEach((r, i) => tono(587*Math.pow(1.26, i), 587*Math.pow(1.26, i), 0.28, 'sine', 0.2, r/1000)); break;
    case 'compra': tono(520, 1040, 0.14, 'sine', 0.2); tono(1040, 1560, 0.16, 'sine', 0.15, 0.08); break;
    case 'no':     tono(220, 160, 0.18, 'square', 0.14); break;
    case 'toque':  tono(760, 620, 0.06, 'sine', 0.12); break;
  }
}
/* ── LA CAMA: CUATRO SENOS DESAFINADOS ──
   Dos senos identicos suenan a prueba de audio; dos que baten cada pocos
   segundos suenan a instrumento. El filtro se abre y se cierra a 0,05 Hz —una
   vuelta cada veinte segundos— y la raiz sube un poco con la fila: la misma
   pieza, mas tensa. */
function camaArranca(){
  if (!AUD || CAMA.on) return;
  CAMA.on = true; CAMA.t0 = AUD.currentTime;
  CAMA.gan = AUD.createGain(); CAMA.gan.gain.value = 0;
  CAMA.filt = AUD.createBiquadFilter(); CAMA.filt.type = 'lowpass'; CAMA.filt.frequency.value = 480; CAMA.filt.Q.value = 0.6;
  CAMA.gan.connect(CAMA.filt); CAMA.filt.connect(GMUS);
  const rel = [1, 1.0021, 1.5, 1.4979, 2.5, 2.5037, 3, 2.9963];
  CAMA.oscs = rel.map((r, i) => {
    const o = AUD.createOscillator(), g = AUD.createGain();
    o.type = i < 4 ? 'sine' : 'triangle'; o.frequency.value = CAMA.raiz*r;
    g.gain.value = i < 2 ? 0.17 : (i < 4 ? 0.10 : 0.045);
    o.connect(g); g.connect(CAMA.gan); o.start(); return { o, g, r };
  });
  CAMA.gan.gain.setTargetAtTime(0.9, AUD.currentTime, 1.2);
}
function camaPaso(k){
  if (!CAMA.on) return;
  const t = AUD.currentTime - CAMA.t0;
  CAMA.filt.frequency.value = 340 + 300*(0.5 + 0.5*Math.sin(t*0.32)) + 420*k;
  const raiz = 98*Math.pow(1.335, cl(k, 0, 1));
  CAMA.raiz += (raiz - CAMA.raiz)*0.02;
  for (const c of CAMA.oscs) c.o.frequency.value = CAMA.raiz*c.r;
}
function camaAgacha(v){ if (CAMA.on) CAMA.gan.gain.setTargetAtTime(v, AUD.currentTime, 0.35); }
function nivelAudio(){
  if (!ANAL) return { pico: 0, rms: 0 };
  const d = new Float32Array(ANAL.fftSize); ANAL.getFloatTimeDomainData(d);
  let p = 0, s = 0; for (let i = 0; i < d.length; i++){ const a = Math.abs(d[i]); if (a > p) p = a; s += d[i]*d[i]; }
  return { pico: +p.toFixed(4), rms: +Math.sqrt(s/d.length).toFixed(4) };
}
