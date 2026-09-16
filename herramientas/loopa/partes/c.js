/* ══════════════════════ EL SONIDO ══════════════════════
   Dos mundos: la melodía sale de muestras de verdad y la batería está
   sintetizada. No es una concesión — una caja de ritmos ES síntesis: un bombo es
   un seno que cae, una caja es ruido más un tono y un charles es ruido filtrado.
   Dibujados por código pesan cero y se pueden acortar al subir el tempo.

   ── TODO SE AGENDA A UN INSTANTE, NUNCA «AHORA» ──
   El secuenciador planifica con anticipación sobre el reloj de audio, así que
   cada disparo recibe el segundo exacto en el que tiene que sonar. Una API que
   dijera `tocar()` haría que el ritmo dependiera del bucle de dibujo, y un
   `requestAnimationFrame` se atrasa y se pausa en segundo plano. */

const INSTRS = typeof SON_B !== 'undefined' ? SON_B : [];
const POR_ID = {};
for (const i of INSTRS) POR_ID[i.id] = i;

let AC = null, MAE = null, LIM = null, ANA = null, RUIDO = null;
let VOL = 0.85;
const BUF = {}, CARGA = {};

function audioDespierta(){
  if (AC){ if (AC.state === 'suspended') AC.resume(); return AC; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); }
  catch (e){ AC = null; return null; }
  MAE = AC.createGain(); MAE.gain.value = VOL;
  /* ── UN LIMITADOR EN EL MAESTRO, QUE ES LO QUE TIENE CUALQUIER MEZCLA ──
     Cuatro pistas más la claqueta se suman: en el golpe del compás uno el pico
     se va por encima de 1 y todo suena a distorsión. */
  LIM = AC.createDynamicsCompressor();
  LIM.threshold.value = -8; LIM.knee.value = 6; LIM.ratio.value = 12;
  LIM.attack.value = 0.003; LIM.release.value = 0.14;
  ANA = AC.createAnalyser(); ANA.fftSize = 2048;
  MAE.connect(LIM); LIM.connect(ANA); LIM.connect(AC.destination);
  /* un solo buffer de ruido para toda la batería: generarlo por golpe sería
     medio segundo de trabajo cada vez que suena un charles */
  RUIDO = AC.createBuffer(1, Math.floor(AC.sampleRate*2), AC.sampleRate);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
  return AC;
}
function volMaestro(v){ VOL = cl(v, 0, 1); if (MAE) MAE.gain.value = VOL; return VOL; }

function b64buf(s){
  const b = atob(s), a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a.buffer;
}
function cargaInstr(id){
  if (CARGA[id]) return CARGA[id];
  const I = POR_ID[id];
  if (!I || !AC) return Promise.resolve(false);
  CARGA[id] = Promise.all(I.m.map(m => {
    /* `decodeAudioData` VACÍA el buffer que recibe: sin la copia, un segundo
       intento encuentra cero bytes */
    return AC.decodeAudioData(b64buf(m.d).slice(0))
      .then(b => { BUF[id + '|' + m.n] = b; return true; }).catch(() => false);
  })).then(r => r.some(Boolean));
  return CARGA[id];
}
function cargado(id){
  const I = POR_ID[id];
  return !!(I && I.m.every(m => BUF[id + '|' + m.n]));
}
function muestraDe(I, midi){
  let mej = I.m[0], d = 1e9;
  for (const m of I.m){ const k = Math.abs(m.n - midi); if (k < d){ d = k; mej = m; } }
  return mej;
}

/* ── UNA NOTA DE LA MELODÍA ──
   Se agenda con su instante y su duración, así que el secuenciador la suelta y
   se olvida. Una nota que hay que apagar a mano obligaría a llevar una lista de
   voces vivas sincronizada con el reloj de audio, que es justo lo que se rompe
   cuando el dibujo se atrasa. */
function nota(id, midi, t, dur, vol, dest){
  if (!AC) return null;
  const D = dest || MAE;
  const I = POR_ID[id]; if (!I) return null;
  const m = muestraDe(I, midi), b = BUF[id + '|' + m.n];
  const g = AC.createGain(), v = (vol === undefined ? 0.72 : vol);
  let src;
  if (b){
    src = AC.createBufferSource(); src.buffer = b;
    if (m.lp){ src.loop = true; src.loopStart = m.lp[0]; src.loopEnd = m.lp[1]; }
    src.playbackRate.value = Math.pow(2, (midi - m.n)/12);
  } else {
    /* si una muestra no decodificó, suena igual: un juego mudo por un
       decodificador es peor que uno con osciladores */
    src = AC.createOscillator(); src.type = I.sost ? 'sawtooth' : 'triangle';
    src.frequency.value = 440*Math.pow(2, (midi - 69)/12);
  }
  const d = Math.max(0.06, dur || 0.25), fin = t + d;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.006);
  g.gain.setValueAtTime(v, Math.max(t + 0.007, fin - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0008, fin + 0.06);
  src.connect(g); g.connect(D);
  src.start(t); src.stop(fin + 0.10);
  return src;
}

/* ══════════ LA BATERÍA ══════════ */
function env(g, t, pico, ata, dec){
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + ata);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ata + dec);
}
function ruidoFuente(t, dur){
  const s = AC.createBufferSource(); s.buffer = RUIDO; s.loop = true;
  s.playbackRate.value = 1;
  s.start(t, Math.random()*1.5); s.stop(t + dur + 0.05);
  return s;
}
/* ── CADA GOLPE ES UNA RECETA, Y LAS TRES SON DISTINTAS DE VERDAD ──
   Lo que separa un bombo de una caja no es el volumen: es que uno tiene tono y
   cae, y la otra es ruido con un tono corto adentro. Si los tres fueran ruido
   filtrado, el patrón no se leería.

   ── EL DESTINO ES UN PARÁMETRO, Y ESO ES LO QUE PERMITE AUDITAR EL OÍDO ──
   Con la salida clavada en el maestro no hay forma de meterle al detector la
   batería del propio juego sin que además le entre la claqueta: la prueba
   mediría dos cosas a la vez. Por omisión sigue siendo el maestro. */
function golpe(tipo, t, vol, dest){
  if (!AC) return false;
  const v = (vol === undefined ? 1 : vol), D = dest || MAE;
  if (tipo === 'bombo'){
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(148, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    env(g, t, 0.95*v, 0.004, 0.36);
    o.connect(g); g.connect(D); o.start(t); o.stop(t + 0.45);
    /* el chasquido del parche: sin él el bombo se pierde en un parlante chico */
    const n = ruidoFuente(t, 0.02), f = AC.createBiquadFilter(), gn = AC.createGain();
    f.type = 'lowpass'; f.frequency.value = 2600;
    env(gn, t, 0.22*v, 0.001, 0.02);
    n.connect(f); f.connect(gn); gn.connect(D);
  } else if (tipo === 'caja'){
    const n = ruidoFuente(t, 0.22), f = AC.createBiquadFilter(), gn = AC.createGain();
    f.type = 'bandpass'; f.frequency.value = 1750; f.Q.value = 0.8;
    env(gn, t, 0.62*v, 0.002, 0.17);
    n.connect(f); f.connect(gn); gn.connect(D);
    /* los dos tonos del bordón: una caja sin ellos es una palmada */
    for (const [hz, pk] of [[186, 0.30], [332, 0.20]]){
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(hz, t);
      o.frequency.exponentialRampToValueAtTime(hz*0.72, t + 0.09);
      env(g, t, pk*v, 0.002, 0.11);
      o.connect(g); g.connect(D); o.start(t); o.stop(t + 0.2);
    }
  } else if (tipo === 'charles' || tipo === 'abierto'){
    const ab = tipo === 'abierto', dec = ab ? 0.30 : 0.045;
    const n = ruidoFuente(t, dec + 0.05), f = AC.createBiquadFilter(), gn = AC.createGain();
    f.type = 'highpass'; f.frequency.value = 7600; f.Q.value = 0.9;
    const f2 = AC.createBiquadFilter(); f2.type = 'peaking';
    f2.frequency.value = 10500; f2.Q.value = 1.4; f2.gain.value = 6;
    env(gn, t, (ab ? 0.34 : 0.40)*v, 0.001, dec);
    n.connect(f); f.connect(f2); f2.connect(gn); gn.connect(D);
  } else if (tipo === 'click' || tipo === 'clickF'){
    const fuerte = tipo === 'clickF';
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square'; o.frequency.value = fuerte ? 1600 : 1050;
    env(g, t, (fuerte ? 0.30 : 0.16)*v, 0.001, 0.035);
    o.connect(g); g.connect(D); o.start(t); o.stop(t + 0.07);
  } else return false;
  return true;
}
