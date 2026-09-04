
/* ══════════════════════ LA MUSICA, Y ES EL RELOJ ══════════════════════
   ── POR QUE ES PROCEDURAL Y NO UN MP3 ──
   El pedido es que el nivel vaya al ritmo. Con un tema grabado hay que MEDIRLE
   el tempo y despues confiar en que no se corra; con un tema generado por
   codigo, el compas es un numero que el juego ya tiene, asi que la sincronia no
   se ajusta: es exacta por construccion. Y pesa cero bytes, que en un HTML
   autocontenido de un solo archivo no es un detalle.
   Es electronica de verdad y no bips: bombo en cada tiempo, clap en el 2 y el 4,
   charles en las corcheas, un bajo con filtro que se abre, un arpegio de
   dieciseisavos y una linea de lead de dos compases.

   ── Y EL RELOJ DEL JUEGO SALE DE ACA ──
   `AudioContext.currentTime` es el unico reloj que no se atrasa cuando el
   navegador pierde cuadros. Si la simulacion corriera con el reloj de pantalla,
   una tanda de cuadros perdidos correria el nivel respecto de la musica y el
   juego dejaria de estar en tiempo — que es exactamente el defecto que este
   genero no puede tener. */
let AUD = null, MAE = null, GMUS = null, GFX = null, RUI = null;
let VOL_MUS = 0.70, VOL_FX = 0.80;
let ANAL = null;

function armaAudio(){
  if (AUD) return;
  try { AUD = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  MAE = AUD.createGain(); MAE.gain.value = 0.9; MAE.connect(AUD.destination);
  ANAL = AUD.createAnalyser(); ANAL.fftSize = 1024; MAE.connect(ANAL);
  /* dos buses: sin ellos, bajar «la musica» bajaria tambien el sonido de saltar,
     y son dos perillas distintas porque son dos cosas distintas */
  GMUS = AUD.createGain(); GMUS.gain.value = VOL_MUS; GMUS.connect(MAE);
  GFX = AUD.createGain(); GFX.gain.value = VOL_FX; GFX.connect(MAE);
  const n = Math.floor(AUD.sampleRate*0.6);
  RUI = AUD.createBuffer(1, n, AUD.sampleRate);
  const d = RUI.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
}

/* ══════════ LAS TRES PISTAS ══════════
   Cada una es una escala, un bajo y un motivo. La escala es menor pentatonica en
   las tres: en un tema que se repite treinta veces por partida, cualquier nota
   suena bien con cualquier otra y eso es la diferencia entre musica y tortura.
   Lo que cambia entre pistas es el tempo, la raiz y la densidad. */
const ESCALA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
const PISTAS = [
  { raiz: 55.00, arp: [0, 4, 2, 5], lead: [7, 5, 4, 2, 4, 5, 7, 8], densidad: 0.55 },
  { raiz: 61.74, arp: [0, 3, 5, 3], lead: [5, 7, 8, 7, 5, 4, 2, 0], densidad: 0.72 },
  { raiz: 49.00, arp: [0, 5, 3, 7], lead: [9, 7, 5, 7, 9, 10, 9, 7], densidad: 0.88 }
];
const nota = (raiz, g) => raiz*Math.pow(2, ESCALA[((g % ESCALA.length) + ESCALA.length) % ESCALA.length]/12);

const MUS = { on: false, t0: 0, bpm: 128, pista: 0, prox: 0, paso: 0, ganancia: 1 };

/* ── EL PLANIFICADOR MIRA ADELANTE Y NO CUELGA DEL BUCLE DE DIBUJO ──
   `requestAnimationFrame` se atrasa y se PAUSA en segundo plano; el reloj de
   audio no. Se agenda todo lo que entre en los proximos 180 ms. */
const MIRA = 0.18;
/* ── ARRANCA DESDE UN TIEMPO, NO SIEMPRE DESDE CERO ──
   Lo pide el modo practica: si el punto de control esta en el bloque 96, la
   musica tiene que retomar en el compas que le corresponde. Y puede hacerlo sin
   ninguna cuenta nueva justamente porque el nivel y el tema comparten la grilla:
   el bloque 96 ES el tiempo 24. */
function musArranca(nivel, desdeT){
  armaAudio(); if (!AUD) return;
  const N = NIVELES[nivel];
  const d = Math.max(0, desdeT || 0);
  MUS.on = true; MUS.bpm = N.bpm; MUS.pista = nivel;
  const dur = 60/N.bpm/4;
  MUS.t0 = AUD.currentTime + 0.12 - d*60/N.bpm;
  MUS.paso = Math.floor(d*4);
  MUS.prox = MUS.t0 + MUS.paso*dur;
  MUS.ganancia = 1;
}
function musPara(){ MUS.on = false; }
/* el tiempo musical, en TIEMPOS de compas. Es el reloj del juego. */
function musTiempo(){
  if (!AUD || !MUS.on) return null;
  return (AUD.currentTime - MUS.t0)*MUS.bpm/60;
}

function musPaso(){
  if (!MUS.on || !AUD) return;
  const dur = 60/MUS.bpm/4;                 /* un dieciseisavo */
  const P = PISTAS[MUS.pista];
  while (MUS.prox < AUD.currentTime + MIRA){
    const t = MUS.prox, s = MUS.paso, s16 = s % 16;
    const g = MUS.ganancia;
    /* el bombo: en cada tiempo, y es lo que el jugador siente como el pulso */
    if (s16 % 4 === 0) golpe(t, 0.42*g);
    /* el clap en el 2 y el 4 */
    if (s16 === 4 || s16 === 12) clap(t, 0.26*g);
    /* el charles en las corcheas, y abierto en la contra */
    if (s16 % 2 === 0) charles(t, s16 % 4 === 2 ? 0.14*g : 0.09*g, s16 % 8 === 6);
    /* el bajo: la fundamental en cada tiempo, con un octavo que empuja */
    if (s16 % 4 === 0 || s16 % 8 === 3)
      bajo(t, nota(P.raiz, P.arp[(s16/4 | 0) % 4]), dur*(s16 % 4 === 0 ? 3.4 : 1.6), 0.30*g);
    /* el arpegio de dieciseisavos, que es lo que da la sensacion de velocidad */
    if (az2(s) < P.densidad)
      arp(t, nota(P.raiz*4, P.arp[s16 % 4] + (s16 % 8 >= 4 ? 5 : 0)), dur*1.5, 0.075*g);
    /* y el lead, una nota por tiempo sobre dos compases */
    if (s16 % 4 === 0){
      const i = (s/4 | 0) % 8;
      lead(t, nota(P.raiz*2, P.lead[i]), 60/MUS.bpm*0.9, 0.10*g);
    }
    MUS.prox += dur; MUS.paso++;
  }
}
/* un azar barato y DETERMINISTA por paso: con `Math.random` el arpegio cambiaria
   en cada intento y el tema dejaria de ser el mismo tema */
function az2(s){ let x = (s*2654435761) >>> 0; x ^= x >>> 15; return ((x*1274126177) >>> 0)/4294967296; }

function golpe(t, v){
  const o = AUD.createOscillator(), g = AUD.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
  o.connect(g); g.connect(GMUS); o.start(t); o.stop(t + 0.19);
}
function clap(t, v){
  const s = AUD.createBufferSource(); s.buffer = RUI;
  const f = AUD.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.2;
  const g = AUD.createGain();
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  s.connect(f); f.connect(g); g.connect(GMUS); s.start(t); s.stop(t + 0.15);
}
function charles(t, v, abierto){
  const s = AUD.createBufferSource(); s.buffer = RUI;
  const f = AUD.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7200;
  const g = AUD.createGain();
  const d = abierto ? 0.09 : 0.035;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(g); g.connect(GMUS); s.start(t); s.stop(t + d + 0.02);
}
function bajo(t, f0, d, v){
  const o = AUD.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f0;
  const fl = AUD.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 6;
  /* el filtro que se abre y se cierra es TODO el sonido de un bajo electronico:
     con el filtro fijo suena a organo */
  fl.frequency.setValueAtTime(180, t);
  fl.frequency.linearRampToValueAtTime(1100, t + d*0.35);
  fl.frequency.linearRampToValueAtTime(220, t + d);
  const g = AUD.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(fl); fl.connect(g); g.connect(GMUS); o.start(t); o.stop(t + d + 0.02);
}
function arp(t, f0, d, v){
  const o = AUD.createOscillator(); o.type = 'square'; o.frequency.value = f0;
  const g = AUD.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(GMUS); o.start(t); o.stop(t + d + 0.02);
}
function lead(t, f0, d, v){
  /* dos osciladores desafinados un pelo: dos senos identicos suenan a tono de
     prueba, y dos que baten cada tanto suenan a instrumento */
  for (const det of [1, 1.006]){
    const o = AUD.createOscillator(); o.type = 'triangle'; o.frequency.value = f0*det;
    const g = AUD.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.setValueAtTime(v, t + d*0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(GMUS); o.start(t); o.stop(t + d + 0.02);
  }
}

/* ══════════ LOS EFECTOS ══════════ */
function son(k){
  armaAudio(); if (!AUD) return;
  const t = AUD.currentTime, g = AUD.createGain(); g.connect(GFX);
  if (k === 'salta'){
    const o = AUD.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(360, t);
    o.frequency.exponentialRampToValueAtTime(780, t + 0.07);
    g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); o.start(t); o.stop(t + 0.1);
  } else if (k === 'muere'){
    const s = AUD.createBufferSource(); s.buffer = RUI;
    const f = AUD.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.4);
    g.gain.setValueAtTime(0.34, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    s.connect(f); f.connect(g); s.start(t); s.stop(t + 0.47);
  } else if (k === 'portal' || k === 'pad'){
    const o = AUD.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(k === 'pad' ? 300 : 620, t);
    o.frequency.exponentialRampToValueAtTime(k === 'pad' ? 1200 : 240, t + 0.18);
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); o.start(t); o.stop(t + 0.22);
  } else if (k === 'moneda'){
    for (let i = 0; i < 3; i++){
      const o = AUD.createOscillator(); o.type = 'triangle';
      o.frequency.value = 880*Math.pow(2, i*0.25);
      const gg = AUD.createGain(); gg.connect(GFX);
      const t0 = t + i*0.06;
      gg.gain.setValueAtTime(0.0001, t0);
      gg.gain.linearRampToValueAtTime(0.16, t0 + 0.01);
      gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      o.connect(gg); o.start(t0); o.stop(t0 + 0.18);
    }
  } else if (k === 'gana'){
    [0, 4, 7, 12].forEach((n, i) => {
      const o = AUD.createOscillator(); o.type = 'triangle';
      o.frequency.value = 440*Math.pow(2, n/12);
      const gg = AUD.createGain(); gg.connect(GFX);
      const t0 = t + i*0.1;
      gg.gain.setValueAtTime(0.0001, t0);
      gg.gain.linearRampToValueAtTime(0.2, t0 + 0.015);
      gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      o.connect(gg); o.start(t0); o.stop(t0 + 0.44);
    });
  } else if (k === 'clic'){
    const o = AUD.createOscillator(); o.type = 'triangle'; o.frequency.value = 700;
    g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); o.start(t); o.stop(t + 0.08);
  }
}
function ponVol(){
  if (GMUS) GMUS.gain.value = VOL_MUS;
  if (GFX) GFX.gain.value = VOL_FX;
}
