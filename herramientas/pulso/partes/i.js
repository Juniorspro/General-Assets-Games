
/* ══════════════════════════ EL SONIDO ══════════════════════════
   Procedural, ni un archivo. En un juego de sustos el sonido hace más que la
   imagen —la mitad de los treinta y dos sustos no dibujan NADA— así que tiene
   que existir antes que cualquier asset generado.

   Y LA MEZCLA ESTÁ ESCALONADA A PROPÓSITO: la cama de fondo tiene que quedar
   MUY por debajo de un golpe, porque si compiten, el golpe deja de ser un
   acontecimiento y pasa a ser un matiz. Es la misma regla que en Eco. */
let AUD = null, MAESTRO = null, ANAL = null, RUIDO = null;
function armaAudio(){
  if (AUD) return;
  try { AUD = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  MAESTRO = AUD.createGain(); MAESTRO.gain.value = 0.9; MAESTRO.connect(AUD.destination);
  ANAL = AUD.createAnalyser(); ANAL.fftSize = 1024; MAESTRO.connect(ANAL);
  /* un segundo de ruido blanco, generado una vez y reusado por todo: cada golpe
     es el mismo ruido con otro filtro y otro sobre */
  const n = AUD.sampleRate;
  RUIDO = AUD.createBuffer(1, n, n);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
  camaFondo();
}
function env(g, t0, a, dur, pico){
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}
function ruido(t0, dur, f, q, pico, tipo){
  const s = AUD.createBufferSource(); s.buffer = RUIDO; s.loop = true;
  const b = AUD.createBiquadFilter(); b.type = tipo || 'bandpass';
  b.frequency.value = f; b.Q.value = q;
  const g = AUD.createGain();
  s.connect(b); b.connect(g); g.connect(MAESTRO);
  env(g, t0, Math.min(0.012, dur*0.2), dur, pico);
  s.start(t0); s.stop(t0 + dur + 0.05);
  return b;
}
function tono(t0, f0, f1, dur, pico, tipo){
  const o = AUD.createOscillator(); o.type = tipo || 'sine';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  const g = AUD.createGain(); o.connect(g); g.connect(MAESTRO);
  env(g, t0, dur*0.12, dur, pico);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function son(tipo, f){
  if (!AUD) return;
  const t = AUD.currentTime, k = f == null ? 1 : f;
  if (tipo === 'grito'){
    /* tres formantes que BAJAN: uno que sube suena a persona, uno que baja
       suena a animal grande. Es lo que se midió en Eco y en RECREO. */
    for (const [a, b, p] of [[900, 320, 0.30], [1500, 520, 0.20], [2400, 900, 0.12]])
      tono(t, a*(0.9+Math.random()*0.2), b, 0.55, p*k, 'sawtooth');
    ruido(t, 0.5, 1400, 0.8, 0.16*k);
  } else if (tipo === 'golpe'){
    ruido(t, 0.20, 140, 0.7, 0.42*k, 'lowpass');
    tono(t, 90, 42, 0.22, 0.30*k, 'sine');
  } else if (tipo === 'portazo'){
    ruido(t, 0.26, 190, 0.6, 0.46*k, 'lowpass');
    tono(t, 120, 38, 0.30, 0.32*k, 'triangle');
  } else if (tipo === 'metal'){
    for (let i = 0; i < 5; i++) tono(t + i*0.045, 1800 + Math.random()*1400, 700, 0.22, 0.11*k, 'square');
  } else if (tipo === 'vidrio'){
    for (let i = 0; i < 9; i++) tono(t + Math.random()*0.10, 2600 + Math.random()*3200, 1500, 0.20, 0.09*k, 'triangle');
    ruido(t, 0.24, 5200, 1.2, 0.18*k);
  } else if (tipo === 'chispa'){
    ruido(t, 0.09, 3400, 1.6, 0.30*k);
  } else if (tipo === 'zumbido'){
    tono(t, 118, 118, 0.75, 0.10*k, 'square');
  } else if (tipo === 'chirrido'){
    for (let i = 0; i < 7; i++) tono(t + i*0.055, 2900 + Math.random()*900, 2400, 0.05, 0.09*k, 'square');
  } else if (tipo === 'susurro' || tipo === 'respira'){
    /* un susurro no tiene tono: es ruido con la banda de la voz y un sobre
       lento. El tono lo pone quien escucha, que es el chiste. */
    const b = ruido(t, tipo === 'respira' ? 1.3 : 0.85, 780, 1.5, 0.20*k);
    if (b) b.frequency.linearRampToValueAtTime(1500, t + 0.7);
  } else if (tipo === 'risa'){
    for (let i = 0; i < 6; i++) tono(t + i*0.13, 300 + (i%2)*120, 200, 0.10, 0.15*k, 'sawtooth');
  } else if (tipo === 'paso'){
    ruido(t, 0.10, 420, 1.0, 0.18*k, 'lowpass');
  } else if (tipo === 'agua'){
    ruido(t, 0.20, 2200, 0.9, 0.16*k);
  } else if (tipo === 'clic'){
    tono(t, 640, 420, 0.06, 0.10*k, 'sine');
  }
}
/* la cama: un zumbido bajísimo, constante, que el jugador deja de oír a los diez
   segundos — y por eso cuando algo lo interrumpe, se siente */
function camaFondo(){
  const o = AUD.createOscillator(); o.type = 'sine'; o.frequency.value = 47;
  const o2 = AUD.createOscillator(); o2.type = 'sine'; o2.frequency.value = 70.5;
  const g = AUD.createGain(); g.gain.value = 0.030;
  o.connect(g); o2.connect(g); g.connect(MAESTRO);
  o.start(); o2.start();
  const r = ruido(AUD.currentTime, 100000, 240, 0.5, 0.012, 'lowpass');
}
function pico(){
  if (!ANAL) return 0;
  const a = new Uint8Array(ANAL.fftSize);
  ANAL.getByteTimeDomainData(a);
  let m = 0;
  for (const v of a) m = Math.max(m, Math.abs(v - 128) / 128);
  return +m.toFixed(4);
}
