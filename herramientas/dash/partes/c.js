
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
  musCarga(0);
}

const MUS = { on: false, t0: 0, bpm: 158, pista: 0, ganancia: 1 };

/* ══════════ LA CANCION ══════════
   ── LA MUSICA PASO DE OSCILADORES A UNA MUESTRA, Y ESO CAMBIA EL RELOJ ──
   Antes el tema se sintetizaba, asi que el reloj del juego salia de contar
   dieciseisavos agendados. Ahora hay UN archivo —el que el usuario trajo— y el
   reloj sale de `AudioContext.currentTime` contra el instante en que la muestra
   arranco. Es el mismo reloj de siempre y por la misma razon: es el unico que no
   se atrasa cuando el navegador pierde cuadros.

   ── Y EL ARCHIVO YA EMPIEZA EN UN TIEMPO ──
   `hornear_musica.py` le recorta la cabeza hasta el primer tiempo medido
   (0,348 s), asi que el instante cero de la muestra ES el tiempo cero del nivel y
   no hace falta ningun desfase en ejecucion. Un desfase acá seria un numero que
   hay que mantener en dos sitios. */
/* ── DOS CANCIONES, Y CADA NIVEL DICE CUAL ES LA SUYA ──
   `NIVELES[i].mus` es la clave; la tabla de aca la lleva al data URI. Van como
   funciones y no como valores porque los dos `_B64` son constantes de otros
   archivos y uno de los dos puede faltar —el horneado escribe uno por vez—: con
   el valor directo, la sola mencion de una constante que no existe tira. */
const CANCIONES = {
  MUS:  () => (typeof MUS_B64  === 'undefined' ? null : MUS_B64),
  MUS2: () => (typeof MUS2_B64 === 'undefined' ? null : MUS2_B64)
};
const MUS_BUFS = {}, MUS_PEDIDAS = {};
let MUS_SRC = null;
/* ── Y SE DECODIFICA SOLO LA QUE HACE FALTA ──
   La segunda cancion son 1,4 MB de MP3 —cuatro minutos— y decodificarla al
   arrancar cuesta memoria y segundos que el menu no necesita: se pide al entrar
   al nivel, y el primer intento arranca en cuanto llega. Sin ella el reloj cae
   al respaldo integrado y se juega igual. */
function musCarga(nivel){
  armaAudio(); if (!AUD) return;
  const N = NIVELES[nivel == null ? 0 : nivel];
  const k = (N && N.mus) || 'MUS';
  if (MUS_PEDIDAS[k] || !CANCIONES[k]) return;
  const uri = CANCIONES[k]();
  if (!uri) return;
  MUS_PEDIDAS[k] = true;
  /* el data URI se decodifica una sola vez y queda en memoria: un
     `BufferSource` nuevo por intento cuesta nada y es lo que permite arrancar
     desde un punto de control sin volver a decodificar */
  fetch(uri).then(r => r.arrayBuffer()).then(a => AUD.decodeAudioData(a))
    .then(b => { MUS_BUFS[k] = b; musEmpalma(k); })
    .catch(() => { MUS_PEDIDAS[k] = false; });
}
/* ── SI LA MUESTRA LLEGA CON LA PARTIDA YA CORRIENDO, SE SUMA DONDE VA ──
   El reloj del juego corre desde `musArranca` aunque no haya muestra: `MUS.t0`
   ya esta puesto y `musTiempo()` avanza. Asi que cuando la decodificacion
   termina —la segunda cancion son 1,4 MB y tarda— la muestra arranca en el
   segundo que le corresponde a ESE instante y entra en tiempo. Medido antes de
   esto: el primer intento del nivel largo se jugaba entero sin musica (`lista:
   true`, `rms: 0`), porque la fuente solo se creaba al empezar un intento. */
function musEmpalma(k){
  if (!MUS.on || MUS_SRC || !AUD) return;
  const N = NIVELES[MUS.pista];
  if (!N || (N.mus || 'MUS') !== k) return;
  const buf = MUS_BUFS[k], t = musTiempo();
  if (!buf || t == null || t < 0) return;
  const seg = t*60/N.bpm;
  if (seg >= buf.duration - 0.1) return;
  MUS_SRC = AUD.createBufferSource();
  MUS_SRC.buffer = buf;
  MUS_SRC.connect(GMUS);
  MUS_SRC.start(AUD.currentTime, seg);
}

function musArranca(nivel, desdeT){
  armaAudio(); if (!AUD) return;
  const N = NIVELES[nivel];
  const d = Math.max(0, desdeT || 0);
  MUS.on = true; MUS.bpm = N.bpm; MUS.pista = nivel;
  const T = 60/N.bpm;
  /* el tiempo 0 del JUEGO, que puede caer en el pasado si se retoma un punto de
     control: asi `musTiempo()` devuelve el tiempo musical correcto sin restar
     nada afuera */
  MUS.t0 = AUD.currentTime + 0.10 - d*T;
  MUS.ganancia = 1;
  musPara2();
  const buf = MUS_BUFS[N.mus || 'MUS'];
  if (!buf) musCarga(nivel);
  if (buf){
    MUS_SRC = AUD.createBufferSource();
    MUS_SRC.buffer = buf;
    MUS_SRC.connect(GMUS);
    /* arranca en el segundo que le corresponde al punto de control: el nivel y el
       tema comparten la grilla, asi que el tiempo 24 ES el segundo 24·T */
    MUS_SRC.start(AUD.currentTime + 0.10, Math.min(buf.duration - 0.05, d*T));
  }
}
/* si hay una muestra decodificada para el nivel: lo mira la sonda y la carga */
function musLista(nivel){ const N = NIVELES[nivel || 0]; return !!MUS_BUFS[N.mus || 'MUS']; }
function musPara2(){
  if (MUS_SRC){ try { MUS_SRC.stop(); } catch(e){} MUS_SRC.disconnect(); MUS_SRC = null; }
}
function musPara(){ MUS.on = false; musPara2(); }
/* el tiempo musical, en TIEMPOS de compas. Es el reloj del juego. */
function musTiempo(){
  if (!AUD || !MUS.on) return null;
  return (AUD.currentTime - MUS.t0)*MUS.bpm/60;
}
/* ── Y LA AGACHADA SE APLICA POR GANANCIA, NO PARANDO LA MUESTRA ──
   La usa el freno de la muerte: parar y rearrancar una muestra de treinta
   segundos se escucha como un corte, y bajarla un instante no. */
function musPaso(){
  if (!MUS.on || !AUD) return;
  if (GMUS) GMUS.gain.value = VOL_MUS*MUS.ganancia;
}

/* ── LO QUE SE FUE: LOS SEIS INSTRUMENTOS ──
   El tema se sintetizaba con bombo, clap, charles, bajo, arpegio y lead, y con
   una cancion de verdad eso pasa a ser codigo vivo que nadie llama: el dia que
   se toque va a estar roto sin que nada lo diga. Lo unico que quedo del
   sintetizador son los efectos de `son()`, que siguen pesando cero. */

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
