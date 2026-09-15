/* ============================================================
   d.js — el sonido, procedural y sin un solo byte de asset.
   Todo cuelga de UN maestro, que es lo unico que hace que se
   pueda medir con un analizador si de verdad sono.
   ============================================================ */
let AC = null, MAE = null, ANA = null, RUIDO = null, CAMA = null, CAMAG = null;

function audioArma(){
  if (AC) return;
  try{ AC = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return; }
  MAE = AC.createGain(); MAE.gain.value = .55; MAE.connect(AC.destination);
  ANA = AC.createAnalyser(); ANA.fftSize = 2048; MAE.connect(ANA);
  /* un segundo de ruido blanco, generado una vez y reusado */
  const n = AC.sampleRate | 0;
  RUIDO = AC.createBuffer(1, n, AC.sampleRate);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
}
function audioDespierta(){
  audioArma();
  if (AC && AC.state === 'suspended') AC.resume();
  camaArranca();
}

/* --- la cama: un zumbido grave que respira. Pesa cero y no se corta nunca. --- */
function camaArranca(){
  if (!AC || CAMA) return;
  CAMA = []; CAMAG = AC.createGain(); CAMAG.gain.value = 0; CAMAG.connect(MAE);
  const f = [55, 82.5, 110];
  f.forEach((hz, i) => {
    const o = AC.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine';
    o.frequency.value = hz * (1 + (i - 1) * 0.0021);   // desafinado: dos senos iguales
    const g = AC.createGain(); g.gain.value = [.5,.3,.14][i];  // suenan a tono de prueba
    o.connect(g); g.connect(CAMAG); o.start();
    CAMA.push({o, g});
  });
  /* un pasabajos que se abre y se cierra cada 19 s: eso es lo que hace
     que respire en vez de zumbar */
  const lfo = AC.createOscillator(); lfo.frequency.value = 1/19;
  const lg = AC.createGain(); lg.gain.value = .022;
  lfo.connect(lg); lg.connect(CAMAG.gain); lfo.start();
  CAMAG.gain.value = .030;
}
function camaNivel(v){
  if (CAMAG) CAMAG.gain.setTargetAtTime(v, AC.currentTime, .25);
}

function env(g, t0, a, d, pico){
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(pico, .0002), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function tono(f0, f1, dur, pico, tipo, retraso){
  if (!AC) return;
  const t0 = AC.currentTime + (retraso || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = tipo || 'square';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  env(g, t0, .006, dur, pico);
  o.connect(g); g.connect(MAE); o.start(t0); o.stop(t0 + dur + .06);
}
function ruido(dur, pico, tipo, hz, q, retraso){
  if (!AC || !RUIDO) return;
  const t0 = AC.currentTime + (retraso || 0);
  const s = AC.createBufferSource(); s.buffer = RUIDO; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = tipo || 'bandpass';
  f.frequency.value = hz; f.Q.value = q || .8;
  const g = AC.createGain(); env(g, t0, .004, dur, pico);
  s.connect(f); f.connect(g); g.connect(MAE); s.start(t0); s.stop(t0 + dur + .06);
}

/* Los niveles no se eligen: se miden con el analizador colgado del maestro.
   Lo mas fuerte del juego tiene que ser lo que cuesta una vida. */
const SON = {
  tira:   () => { tono(820, 240, .09, .16, 'square'); ruido(.05, .07, 'highpass', 1800, .7); },
  tiraG:  () => { tono(300,  90, .20, .26, 'sawtooth'); ruido(.12, .14, 'lowpass', 900, .8); },
  pega:   () => { ruido(.07, .13, 'bandpass', 1500, 1.1); tono(420, 180, .06, .08, 'triangle'); },
  muere:  () => { tono(360, 70, .26, .17, 'sawtooth'); ruido(.22, .13, 'lowpass', 700, .7); },
  dano:   () => { tono(200, 60, .32, .30, 'square'); ruido(.18, .18, 'lowpass', 500, .6); },
  esquiva:() => { ruido(.16, .08, 'bandpass', 2600, .9); tono(600, 1100, .12, .05, 'sine'); },
  moneda: () => { tono(980, 1480, .10, .11, 'sine'); tono(1480, 1970, .09, .07, 'sine', .07); },
  cura:   () => { tono(660, 990, .16, .13, 'sine'); tono(990, 1320, .20, .09, 'triangle', .06); },
  cofre:  () => { tono(300, 700, .16, .13, 'triangle'); tono(700, 1200, .22, .12, 'sine', .14); },
  puerta: () => { ruido(.35, .11, 'lowpass', 380, .6); tono(120, 70, .30, .08, 'sine'); },
  limpia: () => { [0,.09,.18].forEach((d,i) => tono(520 + i*180, 620 + i*200, .16, .13, 'triangle', d)); },
  baja:   () => { [0,.12].forEach((d,i) => tono(380 - i*120, 150 - i*60, .34, .15, 'sine', d)); },
  jefe:   () => { tono(90, 44, .95, .30, 'sawtooth'); ruido(.85, .20, 'lowpass', 420, .6); },
  gana:   () => { [0,.13,.26,.42].forEach((d,i) => tono([392,523,659,784][i], [392,523,659,784][i]*1.5, .40, .19, 'triangle', d)); },
  pierde: () => { [0,.17,.36].forEach((d,i) => tono([330,262,196][i], [165,131,98][i], .55, .20, 'sawtooth', d)); },
  ui:     () => { tono(560, 760, .07, .09, 'triangle'); },
  mejora: () => { [0,.10,.20].forEach((d,i) => tono([523,659,880][i], [659,880,1170][i], .22, .14, 'sine', d)); },
};
function son(k){ if (AC && SON[k]) SON[k](); }
