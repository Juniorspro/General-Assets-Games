
/* ============================================================
   d.js — SONIDO

   Todo procedural: un naipe que cae, una ficha, una fanfarria.
   Y la muestra generada, si llega, PISA al oscilador — el juego
   suena igual sin `i_son.js`, que es lo que hace que un base64
   roto cueste un sonido y no el audio entero.

   El contexto despierta con el PRIMER gesto de verdad: ningun
   navegador deja sonar nada antes de uno, y engancharlo en cada
   boton garantiza olvidarse del proximo que se agregue.
   ============================================================ */
let AC = null, MAE = null, MUESTRAS = {}, SON_ON = true;

function audioDespierta(){
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const K = window.AudioContext || window.webkitAudioContext;
  if (!K) return;
  AC = new K();
  MAE = AC.createGain(); MAE.gain.value = 0.85; MAE.connect(AC.destination);
  camaArranca();
  sonDecodifica();
}
if (HAY_DOM){
  const g = () => audioDespierta();
  document.addEventListener('pointerdown', g, true);
  document.addEventListener('click', g, true);
  document.addEventListener('keydown', g, true);
}

/* --- las muestras generadas, si estan --- */
function sonDecodifica(){
  if (typeof SON_B64 === 'undefined' || !AC) return;
  Object.keys(SON_B64).forEach(k => {
    try{
      const b = atob(SON_B64[k]); const u = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      AC.decodeAudioData(u.buffer, buf => { MUESTRAS[k] = buf; }, () => {});
    }catch(e){}
  });
}

function envol(g, t, a, d, v){
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

/* Un ruido corto y filtrado: el naipe, la ficha, el barajado. */
function ruido(t, dur, hz, q, vol){
  const n = Math.floor(AC.sampleRate * dur);
  const b = AC.createBuffer(1, n, AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(); s.buffer = b;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q;
  const g = AC.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(MAE); s.start(t);
}

function tono(t, hz, hz2, dur, vol, tipo){
  const o = AC.createOscillator(); o.type = tipo || 'triangle';
  o.frequency.setValueAtTime(hz, t);
  if (hz2 && hz2 !== hz) o.frequency.exponentialRampToValueAtTime(hz2, t + dur);
  const g = AC.createGain(); envol(g, t, 0.008, dur, vol);
  o.connect(g); g.connect(MAE); o.start(t); o.stop(t + dur + 0.05);
}

const ESC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];   /* pentatonica: cualquier nota pega */
const nota = i => 261.63 * Math.pow(2, ESC[Math.min(i, ESC.length - 1)] / 12);

function son(k, n){
  if (!SON_ON || !AC) return;
  if (MUESTRAS[k]){
    const s = AC.createBufferSource(); s.buffer = MUESTRAS[k];
    const g = AC.createGain(); g.gain.value = 1;
    s.connect(g); g.connect(MAE); s.start(); return;
  }
  const t = AC.currentTime;
  switch(k){
    case 'carta':   ruido(t, 0.09, 2600, 0.7, 0.22); break;
    case 'elige':   tono(t, 520, 620, 0.06, 0.12); break;
    case 'baraja':  for (let i = 0; i < 6; i++) ruido(t + i * 0.035, 0.06, 2200, 0.6, 0.12); break;
    case 'ficha':   tono(t, nota(Math.min(n || 0, 9)) * 2, 0, 0.08, 0.10, 'square');
                    ruido(t, 0.05, 3400, 1.2, 0.07); break;
    case 'mult':    tono(t, nota(Math.min(n || 0, 9)) * 3, 0, 0.10, 0.12, 'sawtooth'); break;
    case 'comodin': tono(t, 330, 660, 0.18, 0.14, 'square'); break;
    case 'plata':   tono(t, 880, 1320, 0.10, 0.12, 'square');
                    tono(t + 0.07, 1320, 1760, 0.12, 0.10, 'square'); break;
    case 'gana':    [0,2,4,7].forEach((g,i)=>tono(t+i*0.09, 261.63*Math.pow(2,g/12), 0, 0.28, 0.13)); break;
    case 'pierde':  tono(t, 220, 90, 0.80, 0.16, 'sawtooth');
                    ruido(t, 0.5, 220, 0.8, 0.10); break;
    case 'jefe':    tono(t, 140, 110, 0.70, 0.14, 'sawtooth'); break;
    case 'compra':  tono(t, 660, 990, 0.12, 0.12, 'square'); break;
    case 'mal':     tono(t, 200, 150, 0.16, 0.12, 'square'); break;
    case 'ui':      ruido(t, 0.05, 1400, 1.0, 0.13); break;
    case 'sube':    [0,4,7,12].forEach((g,i)=>tono(t+i*0.06, 392*Math.pow(2,g/12), 0, 0.22, 0.11)); break;
  }
}

/* --- la cama: dos senos desafinados y un pasabajos que respira.
   Dos iguales suenan a tono de prueba; el batido los vuelve
   instrumento. --- */
let CAMA = null;
function camaArranca(){
  if (CAMA || !AC) return;
  const g = AC.createGain(); g.gain.value = 0.055;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 3;
  const l = AC.createOscillator(); l.frequency.value = 0.055;
  const la = AC.createGain(); la.gain.value = 260;
  l.connect(la); la.connect(f.frequency); l.start();
  [130.81, 196.00, 261.63, 329.63].forEach((hz, i) => {
    [1, 1.00023].forEach(d => {
      const o = AC.createOscillator(); o.type = 'sine';
      o.frequency.value = hz * d;
      const og = AC.createGain(); og.gain.value = 0.22 / (1 + i * 0.4);
      o.connect(og); og.connect(f); o.start();
    });
  });
  f.connect(g); g.connect(MAE);
  CAMA = g;
}
function camaNivel(v){ if (CAMA && AC) CAMA.gain.setTargetAtTime(v, AC.currentTime, 0.4); }
