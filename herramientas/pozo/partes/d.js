/* ============================================================
   d.js — el sonido, procedural y sin un solo byte de asset.
   Todo cuelga de UN maestro, que es lo unico que hace que se
   pueda medir con un analizador si de verdad sono.
   ============================================================ */
let AC = null, MAE = null, ANA = null, RUIDO = null, CAMA = null, CAMAG = null;

/* --- la capa de muestras generadas ---------------------------------------
   LO PROCEDURAL NO SE BORRA. Los 17 osciladores de `SON` y la cama de tres
   senos quedan de respaldo: un juego que se queda mudo porque un decodificador
   no quiso un MP3 es peor que un juego con bips. La muestra se intenta primero
   y el oscilador contesta cuando no hay.
   Y NADA SE DECODIFICA AL CARGAR EL MODULO: `decodeAudioData` necesita un
   contexto y ningun navegador crea uno antes de un gesto de verdad. */
let MUE = {}, MUE_PED = false, MUE_N = 0, MUE_MAL = 0;
let MUSG = null, MUS_SRC = null, MUS_G = null, MUS_ACT = '', MUS_PED = '', MUS_V = .26, MUS_P = 1;

/* tiraG no tiene muestra propia, y no hace falta: un disparo pesado ES un
   disparo. Se usa el MISMO clip bajado de tono, que es lo que hace la cosa
   fisica. Inventarle un sonido aparte es lo que hace que dos armas del mismo
   juego suenen a dos juegos. */
const MUE_PRESTA = { tiraG: ['tira', .62] };

/* cuanto dura el cruce entre dos pistas. Un corte en seco se escucha mas que
   la musica que entra. */
const MUS_CRUCE = .9;

/* EL BUS DE LA MUSICA ES OTRO EN EL MENU QUE EN PARTIDA, Y LOS DOS NUMEROS
   SALEN DE UNA MEDICION. Con el bus en .468 el analizador colgado del maestro
   daba la cama en rms 0,0682 contra 0,0592 de un disparo: o sea que el sonido
   MAS FRECUENTE del juego sonaba mas flojo que el fondo, que es exactamente lo
   que un fondo no tiene que hacer. La regla de este repo es que el
   acontecimiento queda al menos al doble de la cama (Eco 2,0x, POMPOM 6,1x),
   asi que la cama tiene que quedar a la mitad del sonido que la tapa.
   MEDIDO SOBRE UN BUCLE ENTERO (9 s: con ventanas de 700 ms el numero baila,
   porque una pista de ocho segundos no suena igual en todos sus tramos).
   En partida el que manda es el disparo (rms 0,0191): cama de destino 0,0095 y
   con la cama midiendo 0,0073 a bus .20, el bus sale .26.
   Y EL MENU TIENE SU PROPIO NUMERO, que NO es «alto porque no compite»: ahi lo
   que la cama no puede tapar es el toque de un boton (0,0401), o sea el unico
   acuse de recibo que hay en esa pantalla. Con el bus en .85 la cama medía
   0,0424 — el boton EMPATABA con el fondo. Baja a .40.
   MEDIDO DESPUES, que es lo unico que vale: menu cama 0,0328 con el boton en
   0,0448 (1,37x, la misma relacion con la que salio CERCO); partida cama 0,0084
   con el disparo en 0,0193 (2,30x), el golpe en 0,0721 (8,6x) y el jefe en
   0,1123 (13,4x). Antes de esto el disparo daba 0,0592 contra una cama de
   0,0682: 0,87x, o sea POR DEBAJO del fondo.
   Y OJO CON LA VENTANA: el analizador muestrea al ritmo del dibujo, asi que una
   sola lectura tiene hasta un 50 % de dispersion aunque la ventana cubra el
   bucle entero. Los numeros de arriba salen de ventanas de 9 s; con 700 ms la
   misma cama da entre 0,0328 y 0,0656 y cualquier ajuste se persigue solo. */
const MUS_MENU = .40, MUS_JUEGO = .26;

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
  mueCarga();
}

/* Decodifica las muestras UNA vez, en paralelo y sin bloquear nada: el juego
   arranca con osciladores y las muestras lo pisan cuando llegan. Ojo:
   `decodeAudioData` VACIA el ArrayBuffer que recibe, asi que un segundo
   intento sobre el mismo buffer encuentra cero bytes — por eso se decodifica
   una sola vez y de ahi sale la guarda `MUE_PED`. */
function mueCarga(){
  if (MUE_PED || !AC) return;
  const T = (typeof SONB === 'object' && SONB) ? SONB : null;
  if (!T) return;
  MUE_PED = true;
  MUSG = AC.createGain(); MUSG.gain.value = 0; MUSG.connect(MAE);
  for (const k in T){
    /* EL HORNEADO DEL AUDIO ESCRIBE BASE64 PELADO Y EL DE LOS SPRITES ESCRIBE
       data: URI: el sprite lo necesita porque va a `img.src`, el audio no
       porque va a `atob`. Se aceptan los dos y no queda caso de falla.
       Exigiendo el prefijo fallaban los dieciocho de una — y no fallaba
       ruidosamente: el juego sonaba con los osciladores de siempre. */
    const d = T[k], i = d.indexOf(',');
    let ab;
    try{
      const bin = atob(i >= 0 ? d.slice(i + 1) : d);
      ab = new ArrayBuffer(bin.length);
      const v = new Uint8Array(ab);
      for (let j = 0; j < bin.length; j++) v[j] = bin.charCodeAt(j);
    }catch(e){ MUE_MAL++; continue; }
    AC.decodeAudioData(ab, function(buf){
      MUE[k] = buf; MUE_N++;
      /* la pista pedida puede haber llegado ANTES que su muestra: sin este
         reintento, la primera partida se juega entera sin musica. */
      if (MUS_PED && !MUS_SRC) musica(MUS_PED);
    }, function(){ MUE_MAL++; });
  }
}

function mueEst(){ return {n:MUE_N, mal:MUE_MAL, mus:MUS_ACT, pedida:MUS_PED, claves:Object.keys(MUE).length}; }

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
/* UNA SOLA PUERTA AL VOLUMEN DE LA MUSICA. La cama procedural y las pistas
   generadas son dos caminos, pero el nivel lo decide un solo sitio: con dos,
   el dia que se agregue una pantalla uno de los dos se queda sin ajustar.
   Y LA CAMA SOLO SUENA SI NO HAY PISTA: con las dos puestas se escuchan las
   dos, que es exactamente lo que un zumbido de respaldo no tiene que hacer. */
function musNivel(v, p){
  MUS_V = v; if (p !== undefined) MUS_P = p;
  if (!AC) return;
  if (CAMAG) CAMAG.gain.setTargetAtTime(MUS_SRC ? 0 : v, AC.currentTime, .25);
  /* EL BUS DE LA MUSICA ES UN NUMERO PROPIO Y NO SE DERIVA DEL DE LA CAMA.
     Derivandolo salia al reves de lo que hace falta: en el menu no compite con
     nada y en partida tiene que meterse DEBAJO de los efectos. Medido con el
     analizador colgado del maestro, con el bus a 1 la musica quedaba en rms
     0,146 contra 0,059 de un disparo — o sea que el sonido mas frecuente del
     juego sonaba MAS FLOJO que el fondo, que es exactamente lo que un fondo no
     tiene que hacer. */
  if (MUSG) MUSG.gain.setTargetAtTime(MUS_P, AC.currentTime, .25);
}

/* Cambia de pista con un cruce. Llamarla con la que ya suena no hace nada: si
   reiniciara, cada vuelta al menu cortaria el tema por la mitad. */
function musica(k){
  MUS_PED = k;
  if (!AC || !MUSG) return;
  if (MUS_ACT === k && MUS_SRC) return;
  const buf = MUE[k];
  if (!buf) return;                     /* todavia no decodifico: queda pedida */
  const t = AC.currentTime;
  if (MUS_SRC){                          /* la vieja se va y se para sola */
    const vs = MUS_SRC, vg = MUS_G;
    vg.gain.setValueAtTime(vg.gain.value, t);
    vg.gain.linearRampToValueAtTime(0, t + MUS_CRUCE);
    try{ vs.stop(t + MUS_CRUCE + .05); }catch(e){}
  }
  const s = AC.createBufferSource();
  s.buffer = buf; s.loop = true;         /* el horneado funde la cola sobre la
                                            cabeza, asi que el bucle no golpea */
  const g = AC.createGain(); g.gain.value = 0;
  s.connect(g); g.connect(MUSG); s.start();
  g.gain.linearRampToValueAtTime(1, t + MUS_CRUCE);
  MUS_SRC = s; MUS_G = g; MUS_ACT = k;
  musNivel(MUS_V);                       /* y con pista puesta, la cama se va */
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
/* la muestra primero y el oscilador despues. Un sonido que no llego cuesta
   ese sonido, nunca el silencio. */
function mueSuena(k, vel){
  const b = MUE[k];
  if (!b || !AC) return false;
  const s = AC.createBufferSource();
  s.buffer = b;
  if (vel) s.playbackRate.value = vel;
  s.connect(MAE); s.start();
  return true;
}
function son(k){
  if (!AC) return;
  if (mueSuena(k)) return;
  const pr = MUE_PRESTA[k];
  if (pr && mueSuena(pr[0], pr[1])) return;
  if (SON[k]) SON[k]();
}
