/* ══════════════════════ EL SONIDO ══════════════════════
   Treinta y dos instrumentos de muestras de verdad, tres muestras cada uno, y
   el tono sale de la velocidad de reproducción. Todo lo demás cuelga de eso.

   ── LO QUE HACE QUE «MANTENER Y SUBIR» SEA POSIBLE ──
   Una nota no es un disparo: es una voz que queda viva mientras el dedo esté
   apoyado, con su `playbackRate` empujado hacia el tono nuevo con una constante
   de tiempo. Por eso el motor no tiene `tocar(nota)` sino tres verbos —abrir,
   mover, soltar— y el que sabe dónde está el dedo es el juego, no el motor. */

const INSTRS = typeof SON_B !== 'undefined' ? SON_B : [];
const POR_ID = {};
for (const i of INSTRS) POR_ID[i.id] = i;

let AC = null, MAE = null, SECO = null, ENVIO = null, REVE = null, ANA = null;
let SON_ON = true, MAX_VOCES = 12;
const BUF = {};                 /* id|nota -> AudioBuffer ya decodificado */
const CARGA = {};               /* id -> promesa, para no decodificar dos veces */
const VOCES = [];

function audioListo(){ return !!AC && AC.state === 'running'; }

/* ── EL CONTEXTO DESPIERTA CON EL PRIMER GESTO ──
   Ningún navegador deja sonar nada antes de uno de verdad, y el primero de este
   juego es el botón de idioma. */
function audioDespierta(){
  if (AC){ if (AC.state === 'suspended') AC.resume(); return AC; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); }
  catch (e){ AC = null; return null; }
  MAE = AC.createGain(); MAE.gain.value = SON_ON ? 0.85 : 0;
  ANA = AC.createAnalyser(); ANA.fftSize = 2048;
  MAE.connect(ANA); MAE.connect(AC.destination);
  SECO = AC.createGain(); SECO.gain.value = 0.86; SECO.connect(MAE);
  /* ── LA REVERB ES LO QUE CONVIERTE UN PANEL EN UN LUGAR ──
     La respuesta al impulso se genera: ruido que decae. Un archivo de reverb
     pesaría más que los treinta y dos instrumentos juntos. */
  REVE = AC.createConvolver();
  const seg = 1.9, n = Math.floor(AC.sampleRate*seg);
  const ir = AC.createBuffer(2, n, AC.sampleRate);
  for (let c = 0; c < 2; c++){
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++){
      const t = i/n;
      d[i] = (Math.random()*2 - 1)*Math.pow(1 - t, 2.6)*(i < 220 ? i/220 : 1);
    }
  }
  REVE.buffer = ir;
  ENVIO = AC.createGain(); ENVIO.gain.value = 0.30;
  ENVIO.connect(REVE); REVE.connect(MAE);
  return AC;
}

function b64buf(s){
  const b = atob(s), a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a.buffer;
}

/* Decodifica las tres muestras de un instrumento. En diferido y una sola vez:
   decodificar los noventa y seis MP3 al arrancar son varios segundos de hilo
   para noventa y tres muestras que esa partida no va a usar. */
function cargaInstr(id){
  if (CARGA[id]) return CARGA[id];
  const I = POR_ID[id];
  if (!I || !AC) return Promise.resolve(false);
  CARGA[id] = Promise.all(I.m.map(m => {
    /* `decodeAudioData` VACÍA el buffer que recibe, así que va una copia: sin
       ella un segundo intento encuentra cero bytes */
    const ab = b64buf(m.d).slice(0);
    return AC.decodeAudioData(ab)
      .then(b => { BUF[id + '|' + m.n] = b; return true; })
      .catch(() => false);
  })).then(r => r.some(Boolean));
  return CARGA[id];
}

/* la muestra más cercana: con muestras cada doce semitonos, lo más que hay que
   estirar son seis, que es donde el estiramiento todavía no se escucha */
function muestraDe(I, midi){
  let mej = I.m[0], d = 1e9;
  for (const m of I.m){ const k = Math.abs(m.n - midi); if (k < d){ d = k; mej = m; } }
  return mej;
}

/* ── LA VOZ ──
   Una muestra, un filtro y una ganancia. El filtro es lo que hace que el eje
   horizontal signifique algo: a la izquierda la nota suena tapada y suave, a la
   derecha abierta y fuerte, que es la segunda dimensión del panel. */
function abre(id, midi, vol, brillo){
  if (!AC || !SON_ON) return null;
  const I = POR_ID[id]; if (!I) return null;
  const m = muestraDe(I, midi), b = BUF[id + '|' + m.n];
  const t = AC.currentTime;
  const g = AC.createGain();
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.7;
  f.frequency.value = filtroDe(brillo);
  /* ── CADA FUENTE TIENE SU PROPIA GANANCIA ──
     No es un lujo: es lo que deja cruzar una muestra con la siguiente cuando el
     dedo se va lejos de la que arrancó. */
  const gs = AC.createGain(); gs.gain.value = 1;
  let src, tipo;
  if (b){
    src = fuente(b, m, midi);
    tipo = 'muestra';
  } else {
    /* ── Y SI UNA MUESTRA NO DECODIFICA, SUENA IGUAL ──
       Un juego mudo por un decodificador es peor que uno con osciladores. */
    src = AC.createOscillator(); src.type = I.sost ? 'sawtooth' : 'triangle';
    src.frequency.value = 440*Math.pow(2, (midi - 69)/12);
    tipo = 'sinte';
  }
  src.connect(gs); gs.connect(f); f.connect(g);
  g.connect(SECO); g.connect(ENVIO);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volDe(vol), t + 0.008);
  src.start(t);
  const v = { src, gs, g, f, id, midi, base: m.n, tipo, sost: !!I.sost || tipo === 'sinte',
              t0: t, tUlt: t, pos: 0, viva: true };
  VOCES.push(v);
  /* con más de doce voces vivas el maestro recorta y todo suena a distorsión */
  while (VOCES.length > MAX_VOCES){ const vieja = VOCES.shift(); apaga(vieja, 0.05); }
  return v;
}
function fuente(b, m, midi){
  const src = AC.createBufferSource(); src.buffer = b;
  if (m.lp){ src.loop = true; src.loopStart = m.lp[0]; src.loopEnd = m.lp[1]; }
  src.playbackRate.value = Math.pow(2, (midi - m.n)/12);
  return src;
}
function volDe(v){ return 0.16 + 0.52*cl(v === undefined ? 0.7 : v, 0, 1); }
function filtroDe(b){ return 420*Math.pow(38, cl(b === undefined ? 0.75 : b, 0, 1)); }

/* ── EL GLISADO ──
   La nota nueva no se dispara: la que está sonando se EMPUJA hacia ella. Con un
   salto seco, deslizar el dedo se escucha a escalera; con la constante de tiempo
   en 22 ms, la nota llega en menos de un décimo de segundo y el camino se oye. */
/* ── DOS OCTAVAS DE DESLIZAMIENTO SOBRE UNA SOLA MUESTRA SUENAN A ARDILLA ──
   Medido: arrastrando el dedo de abajo arriba, la muestra de DO3 terminaba
   estirada 21 semitonos, o sea a más del triple de velocidad. Las muestras están
   cada doce semitonos: pasados SIETE se cruza a la de al lado, y el cruce se
   hace con las dos ganancias en cuarenta y cinco milisegundos para que no haya
   un click. Sólo en los sostenidos: los suyos son bucles, así que la muestra
   nueva entra por el medio y no vuelve a atacar. Un piano estirado no se nota,
   porque para cuando el dedo llegó lejos su nota ya decayó. */
function cambiaMuestra(v, midi){
  const I = POR_ID[v.id]; if (!I) return false;
  const m = muestraDe(I, midi);
  if (m.n === v.base || Math.abs(midi - v.base) <= 7) return false;
  const b = BUF[v.id + '|' + m.n]; if (!b) return false;
  /* ── DÓNDE ENTRA LA MUESTRA NUEVA DEPENDE DE SI HAY BUCLE ──
     El sostenido entra por `loopStart`, o sea por el medio del sonido, y no
     vuelve a atacar. El percusivo no tiene bucle: entrar por el principio sería
     un golpe nuevo a mitad del glisado, así que entra EN EL MISMO PUNTO DE SU
     DECAIMIENTO que llevaba la vieja —`pos` se acumula en la línea de tiempo de
     la muestra, no en la del reloj— y si esa nota ya se apagó no se cambia. */
  let off;
  if (m.lp) off = m.lp[0];
  else { off = v.pos; if (!(off >= 0) || off > b.duration - 0.06) return false; }
  const t = AC.currentTime, X = 0.045;
  const src = fuente(b, m, midi);
  const gs = AC.createGain(); gs.gain.setValueAtTime(0, t);
  gs.gain.linearRampToValueAtTime(1, t + X);
  src.connect(gs); gs.connect(v.f);
  try { src.start(t, off); } catch (e){ try { src.start(t); } catch (x){ return false; } }
  const vs = v.src, vg = v.gs;
  vg.gain.setValueAtTime(vg.gain.value, t);
  vg.gain.linearRampToValueAtTime(0, t + X);
  try { vs.stop(t + X + 0.03); } catch (e) {}
  v.src = src; v.gs = gs; v.base = m.n; v.tUlt = t;
  return true;
}

function mueve(v, midi, vol, brillo){
  if (!v || !v.viva || !AC) return;
  const t = AC.currentTime;
  v.midi = midi;
  if (v.tipo === 'muestra'){
    /* cuánto de la muestra ya se consumió, en SU propia línea de tiempo: el
       reloj corre a segundos y la muestra a `playbackRate` segundos por segundo */
    v.pos += Math.max(0, t - v.tUlt)*v.src.playbackRate.value;
    v.tUlt = t;
    cambiaMuestra(v, midi);
  }
  const p = v.tipo === 'muestra' ? Math.pow(2, (midi - v.base)/12) : 0;
  if (v.tipo === 'muestra') v.src.playbackRate.setTargetAtTime(p, t, 0.022);
  else v.src.frequency.setTargetAtTime(440*Math.pow(2, (midi - 69)/12), t, 0.022);
  v.g.gain.setTargetAtTime(volDe(vol), t, 0.030);
  v.f.frequency.setTargetAtTime(filtroDe(brillo), t, 0.030);
}

function apaga(v, rel){
  if (!v || !v.viva || !AC) return;
  v.viva = false;
  const t = AC.currentTime, r = rel || (v.sost ? 0.14 : 0.42);
  try {
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(v.g.gain.value, t);
    v.g.gain.exponentialRampToValueAtTime(0.0008, t + r);
    v.src.stop(t + r + 0.02);
  } catch (e) {}
  const i = VOCES.indexOf(v); if (i >= 0) VOCES.splice(i, 1);
}
function apagaTodo(){ for (const v of VOCES.slice()) apaga(v, 0.06); }

/* una nota suelta, para el modo de repetir y para la vista previa: se abre y se
   cierra sola, así quien la dispara no tiene que acordarse de soltarla */
function pico(id, midi, dur, vol){
  const v = abre(id, midi, vol === undefined ? 0.72 : vol, 0.8);
  if (v) setTimeout(() => apaga(v), Math.max(60, (dur || 0.42)*1000));
  return v;
}
function sonidoOn(v){ SON_ON = !!v; if (!SON_ON) apagaTodo(); if (MAE) MAE.gain.value = SON_ON ? 0.85 : 0; return SON_ON; }
