
/* ══════════════════════ EL AUDIO ══════════════════════
   Todo sintetizado: en un juego de miedo el sonido tiene que cambiar CON lo que
   pasa —el corazon se acelera, el agua chapotea mas cuanto mas se mueve— y un
   archivo suelto no puede hacer eso. Ademas pesa cero.

   La mezcla tiene tres escalones y estan medidos: la cama de fondo abajo de
   todo, el agua y los pasos en el medio, y el susto arriba. Si el susto no es
   lo mas fuerte que suena, no es un susto. */
let AUD = null, MAE = null, BUS_M = null, BUS_F = null, ANA = null, RUIDO = null;
let VOL_MUS = 0.60, VOL_FX = 0.85;
const CAMA = { on: false, nodos: null, duck: 1 };

function despiertaAudio(){
  if (AUD) { if (AUD.state === 'suspended') AUD.resume(); return AUD; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  AUD = new AC();
  MAE = AUD.createGain(); MAE.gain.value = 0.9; MAE.connect(AUD.destination);
  ANA = AUD.createAnalyser(); ANA.fftSize = 1024; MAE.connect(ANA);
  BUS_M = AUD.createGain(); BUS_M.gain.value = VOL_MUS; BUS_M.connect(MAE);
  BUS_F = AUD.createGain(); BUS_F.gain.value = VOL_FX; BUS_F.connect(MAE);
  /* un segundo de ruido blanco, generado una sola vez: de aca salen la lluvia
     de pasos, el agua, la estatica y media docena de sustos */
  RUIDO = AUD.createBuffer(1, AUD.sampleRate, AUD.sampleRate);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
  cargaGritos();
  return AUD;
}
/* ══════════ LOS GRITOS GRABADOS ══════════
   Los sustos sintetizados son barridos de onda de sierra, y una onda de sierra
   no asusta: se lee a efecto de arcade. Estos doce estan generados con Rezona y
   son gritos de verdad. Se decodifican con el PRIMER GESTO y no al cargar: sin
   un contexto de audio despierto `decodeAudioData` no hace nada, y ningun
   navegador crea uno antes de un gesto de verdad.

   ── Y LO SINTETIZADO NO SE BORRA ──
   `son()` intenta la muestra y cae al oscilador si el MP3 no decodifico. Un
   juego mudo por un decodificador es peor que un juego con bips.

   ── UNA BOCA, O SEA UNA VOZ ──
   Un grito nuevo corta al anterior. Dos alaridos encimados no son mas miedo:
   son distorsion — medido en PUERTA BLANCA, disparando siete con 300 ms de
   separacion el maestro se acumulaba hasta pico 1,66, o sea recortando. */
const GRITO = {};
let GRITO_N = 0, GRITO_FALLAS = 0, GRITO_VOZ = null, GRITO_ULT = '';
function cargaGritos(){
  if (!AUD || typeof GRITOS_B64 === 'undefined') return;
  for (const k in GRITOS_B64){
    if (GRITO[k] !== undefined) continue;
    GRITO[k] = null;
    fetch(GRITOS_B64[k]).then(r => r.arrayBuffer())
      .then(b => AUD.decodeAudioData(b))
      .then(buf => { GRITO[k] = buf; GRITO_N++; })
      .catch(() => { GRITO_FALLAS++; });
  }
}
function grita(k, v){
  const b = GRITO[k];
  if (!AUD || !b) return false;
  if (GRITO_VOZ){ try { GRITO_VOZ.stop(); } catch(e){} }
  const s = AUD.createBufferSource(); s.buffer = b;
  const g = AUD.createGain(); g.gain.value = v == null ? 1 : v;
  s.connect(g); g.connect(BUS_F); s.start();
  GRITO_VOZ = s; GRITO_ULT = k;
  s.onended = () => { if (GRITO_VOZ === s) GRITO_VOZ = null; };
  return true;
}
function ponVol(m, f){ VOL_MUS = m; VOL_FX = f; if (BUS_M) BUS_M.gain.value = m; if (BUS_F) BUS_F.gain.value = f*CAMA.duck; }

/* ── PRIMITIVAS ── */
function ruido(dest, t0, dur, g0, tipo, frec, q){
  const s = AUD.createBufferSource(); s.buffer = RUIDO; s.loop = true;
  const f = AUD.createBiquadFilter(); f.type = tipo || 'bandpass'; f.frequency.value = frec || 900; f.Q.value = q || 1;
  const g = AUD.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, g0), t0 + Math.min(0.02, dur*0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t0); s.stop(t0 + dur + 0.05);
  return { f, g };
}
function tono(dest, t0, dur, f0, f1, g0, forma){
  const o = AUD.createOscillator(); o.type = forma || 'sine';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  const g = AUD.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, g0), t0 + dur*0.10);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest);
  o.start(t0); o.stop(t0 + dur + 0.05);
  return { o, g };
}

/* ── LA CAMA: TRES CAPAS QUE NO SE REPITEN NUNCA ──
   Un zumbido grave, aire filtrado y un latido. Ninguna de las tres es un bucle,
   asi que no hay costura que se escuche cada vuelta. */
function camaArranca(){
  if (!AUD || CAMA.on) return;
  const t = AUD.currentTime;
  const g = AUD.createGain(); g.gain.value = 0.22; g.connect(BUS_M);
  const o1 = AUD.createOscillator(); o1.type = 'sine'; o1.frequency.value = 41; o1.connect(g); o1.start(t);
  const o2 = AUD.createOscillator(); o2.type = 'sine'; o2.frequency.value = 61.5; const g2 = AUD.createGain();
  g2.gain.value = 0.35; o2.connect(g2); g2.connect(g); o2.start(t);
  const s = AUD.createBufferSource(); s.buffer = RUIDO; s.loop = true;
  const f = AUD.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 340; f.Q.value = 0.7;
  const ga = AUD.createGain(); ga.gain.value = 0.05;
  s.connect(f); f.connect(ga); ga.connect(BUS_M); s.start(t);
  /* el corte del aire respira con un periodo largo: sin eso el fondo es
     estacionario y a los veinte segundos el oido deja de escucharlo */
  const lfo = AUD.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.047;
  const lg = AUD.createGain(); lg.gain.value = 190; lfo.connect(lg); lg.connect(f.frequency); lfo.start(t);
  CAMA.on = true; CAMA.nodos = { g, o1, o2, s, f, ga, lfo };
  CAMA.lat = 0; CAMA.latT = 0;
}
function camaPara(){
  if (!CAMA.on) return;
  const n = CAMA.nodos, t = AUD.currentTime;
  n.g.gain.setTargetAtTime(0.0001, t, 0.25); n.ga.gain.setTargetAtTime(0.0001, t, 0.25);
  setTimeout(() => { try { n.o1.stop(); n.o2.stop(); n.s.stop(); n.lfo.stop(); } catch(e){} }, 900);
  CAMA.on = false; CAMA.nodos = null;
}
/* el latido: dos golpes, y el ritmo lo pone lo cerca que esta el susto */
function camaPaso(dt, tension){
  if (!AUD || !CAMA.on) return;
  const bpm = 58 + tension*74;
  CAMA.latT += dt*bpm/60;
  if (CAMA.latT >= 1){
    CAMA.latT -= 1;
    const t = AUD.currentTime;
    tono(BUS_M, t, 0.20, 66, 38, 0.30 + tension*0.30, 'sine');
    tono(BUS_M, t + 0.26, 0.16, 58, 34, 0.20 + tension*0.22, 'sine');
  }
}
/* el agua suena cuanto mas se mueve la superficie: es informacion, no adorno */
let AGUA_N = null;
function aguaPaso(vel, nivel){
  if (!AUD) return;
  if (!AGUA_N){
    const s = AUD.createBufferSource(); s.buffer = RUIDO; s.loop = true;
    const f = AUD.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.9;
    const g = AUD.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(BUS_F); s.start();
    AGUA_N = { s, f, g };
  }
  const v = Math.min(1, Math.abs(vel)/2.2);
  AGUA_N.g.gain.setTargetAtTime(v*0.16*nivel, AUD.currentTime, 0.05);
  AGUA_N.f.frequency.setTargetAtTime(900 + v*2400, AUD.currentTime, 0.06);
}
function aguaPara(){ if (AGUA_N){ try { AGUA_N.s.stop(); } catch(e){} AGUA_N = null; } }

/* ── LOS SONIDOS CON NOMBRE ──
   Cada susto trae el suyo. No son variaciones de uno: un portazo, unos pasos y
   un grito tienen que sonar a tres cosas distintas o los treinta y tres se
   leen como el mismo susto repetido. */
/* que grito grabado le corresponde a cada nombre de sonido. Lo que no este
   aca sigue saliendo del sintetizador, que es lo correcto para un portazo o
   una gota: esos ya suenan bien y pesan cero. */
const SON_A_GRITO = {
  grito1: 'gCarga', grito2: 'gCara', gruñido: 'gBestia',
  gCarga: 'gCarga', gBestia: 'gBestia', gNina: 'gNina', gTecho: 'gTecho',
  gJadeo: 'gJadeo', gCoro: 'gCoro', gCara: 'gCara', gOido: 'gOido',
  gChillido: 'gChillido', gLamento: 'gLamento', gRisa: 'gRisa', gPasos: 'gPasos'
};
function son(k, v){
  if (!AUD) return;
  const gk = SON_A_GRITO[k];
  if (gk && grita(gk, v == null ? 1 : v)) return;
  const t = AUD.currentTime, F = BUS_F, a = v == null ? 1 : v;
  switch (k){
    case 'paso':      ruido(F, t, 0.13, 0.10*a, 'lowpass', 420, 1.0); break;
    case 'pasoAgua':  ruido(F, t, 0.17, 0.09*a, 'bandpass', 1700, 1.2); break;
    case 'derrama':   ruido(F, t, 0.22, 0.13*a, 'bandpass', 2400, 0.8); break;
    case 'toque':     tono(F, t, 0.08, 620, 380, 0.16*a, 'triangle'); break;
    case 'portazo':   ruido(F, t, 0.30, 0.60*a, 'lowpass', 200, 1.0); tono(F, t, 0.24, 120, 44, 0.42*a, 'square'); break;
    case 'pasos':     for (let i = 0; i < 5; i++) ruido(F, t + i*0.24, 0.12, 0.22*a, 'lowpass', 380, 1.0); break;
    case 'golpe':     ruido(F, t, 0.20, 0.55*a, 'lowpass', 160, 1.2); tono(F, t, 0.30, 88, 32, 0.36*a, 'sine'); break;
    case 'chasquido': ruido(F, t, 0.05, 0.50*a, 'highpass', 3200, 0.8); tono(F, t + 0.06, 0.5, 200, 60, 0.16*a, 'sawtooth'); break;
    case 'soga':      ruido(F, t, 0.7, 0.22*a, 'bandpass', 700, 3.5); tono(F, t, 0.6, 240, 90, 0.14*a, 'triangle'); break;
    case 'arrastre':  ruido(F, t, 0.85, 0.26*a, 'bandpass', 480, 1.6); break;
    case 'susurro':   ruido(F, t, 1.5, 0.18*a, 'bandpass', 1300, 2.6); ruido(F, t + 0.3, 1.1, 0.12*a, 'bandpass', 2100, 3.0); break;
    case 'burbujas':  for (let i = 0; i < 9; i++) tono(F, t + i*0.10 + Math.random()*0.05, 0.13, 260 + Math.random()*420, 90, 0.20*a, 'sine'); break;
    case 'crujido':   for (let i = 0; i < 7; i++) ruido(F, t + i*0.13, 0.10, 0.24*a, 'bandpass', 260 + i*90, 5); break;
    case 'zumbido':   tono(F, t, 1.9, 74, 58, 0.24*a, 'sawtooth'); ruido(F, t, 1.9, 0.10*a, 'lowpass', 260, 1); break;
    case 'raspa':     ruido(F, t, 0.55, 0.30*a, 'highpass', 2600, 0.9); break;
    case 'bisagra':   tono(F, t, 1.1, 900, 260, 0.20*a, 'sawtooth'); ruido(F, t + 0.9, 0.2, 0.30*a, 'lowpass', 220, 1); break;
    case 'aleteo':    for (let i = 0; i < 22; i++) ruido(F, t + i*0.055, 0.05, 0.16*a, 'bandpass', 900 + Math.random()*1800, 2.5); break;
    case 'ruedita':   for (let i = 0; i < 16; i++) ruido(F, t + i*0.09, 0.045, 0.13*a, 'bandpass', 2600, 6); break;
    case 'gruñido':   tono(F, t, 2.0, 58, 34, 0.42*a, 'sawtooth'); ruido(F, t, 2.0, 0.16*a, 'lowpass', 180, 1.2); break;
    case 'respira':   for (let i = 0; i < 3; i++){ ruido(F, t + i*0.62, 0.34, 0.26*a, 'bandpass', 620, 1.1); ruido(F, t + i*0.62 + 0.34, 0.26, 0.18*a, 'bandpass', 380, 1.1); } break;
    case 'goteo':     for (let i = 0; i < 12; i++) tono(F, t + i*0.19 + Math.random()*0.06, 0.09, 1500 + Math.random()*900, 500, 0.20*a, 'sine'); break;
    case 'vidrio':    for (let i = 0; i < 18; i++) ruido(F, t + Math.random()*0.4, 0.07, 0.30*a, 'highpass', 4200 + Math.random()*2600, 1.4); break;
    case 'timbre':    for (let i = 0; i < 4; i++){ tono(F, t + i*0.42, 0.30, 1180, 1160, 0.26*a, 'sine'); tono(F, t + i*0.42, 0.30, 1560, 1540, 0.16*a, 'sine'); } break;
    case 'chapoteo':  ruido(F, t, 0.45, 0.42*a, 'bandpass', 1900, 0.7); ruido(F, t + 0.1, 0.5, 0.24*a, 'lowpass', 700, 1); break;
    case 'estatica':  ruido(F, t, 1.8, 0.30*a, 'highpass', 1800, 0.6); break;
    /* ── LOS DOS GRITOS BAJAN DE TONO ──
       Uno que sube suena a persona; uno que baja suena a animal grande. Son lo
       mas fuerte del juego y tienen que serlo: es el unico momento en el que
       el juego habla mas fuerte que el jugador. */
    case 'grito1':    for (const f of [520, 780, 1240]) tono(F, t, 0.9, f, f*0.42, 0.34*a, 'sawtooth');
                      ruido(F, t, 0.9, 0.26*a, 'bandpass', 1500, 0.8); break;
    case 'grito2':    for (const f of [380, 620, 980, 1500]) tono(F, t, 1.3, f, f*0.34, 0.40*a, 'sawtooth');
                      ruido(F, t, 1.3, 0.34*a, 'bandpass', 1100, 0.6); break;
  }
}
/* la cama se agacha mientras grita algo: dos cosas fuertes a la vez no dan el
   doble de miedo, dan distorsion */
function ducking(v){ CAMA.duck = v; if (BUS_M) BUS_M.gain.setTargetAtTime(VOL_MUS*v, AUD.currentTime, 0.08); }
function nivelAudio(){
  if (!ANA) return { pico: 0, rms: 0 };
  const n = ANA.fftSize, d = new Float32Array(n); ANA.getFloatTimeDomainData(d);
  let p = 0, s = 0; for (let i = 0; i < n; i++){ const v = Math.abs(d[i]); if (v > p) p = v; s += d[i]*d[i]; }
  return { pico: +p.toFixed(4), rms: +Math.sqrt(s/n).toFixed(4) };
}
