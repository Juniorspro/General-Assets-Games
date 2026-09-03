
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
  armaGritos();
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
/* ══════════════════════ TREINTA Y DOS GRITOS ══════════════════════
   El pedido fue «más de 30 gritos», y treinta y dos archivos de grito serían un
   mega y medio de descarga para sonidos de medio segundo. Un grito, en cambio,
   se puede DESCRIBIR: es una fuente con un contorno de altura, tres formantes
   que la filtran, un soplo de aire y un sobre. Cambiando esos números salen un
   hombre, una mujer, un chico, algo que no es humano, un chillido y un gorgoteo
   — y cada uno se puede pedir por número, que es lo que hace que el susto 17
   suene siempre igual y distinto del 18.

   LOS SEIS TIMBRES NO SON DECORACIÓN. Un grito repetido deja de asustar a la
   tercera vez, y treinta y dos sustos con el MISMO grito son un grito repetido
   treinta y dos veces. Lo que el jugador recuerda de un susto es el sonido.

   Y hay tres cosas que un grito necesita y que no son el tono:
     · JITTER. Una altura perfectamente lisa suena a sirena. La voz humana
       tiembla de forma irregular, y sin eso ningún filtro lo salva.
     · VIBRATO. El temblor periódico, que es lo que dice «hay unas cuerdas
       vocales acá» — y su ausencia lo que hace que el timbre 'bestia' no suene
       a persona.
     · CONTORNO QUE BAJA. Un grito que sube suena a alguien llamando; uno que
       baja suena a alguien al que le está pasando algo. */
const GRI_TIMBRE = [
  /* nombre,    f0,   caída, formantes,             vib Hz, vib prof, soplo, dur */
  ['hombre',    240, 0.42, [780, 1180, 2600],      5.4, 0.035, 0.16, 0.62],
  ['mujer',     460, 0.46, [980, 1900, 3100],      6.2, 0.045, 0.14, 0.58],
  ['chica',     700, 0.52, [1250, 2400, 3600],     7.4, 0.055, 0.12, 0.48],
  ['bestia',    118, 0.34, [420, 760, 1500],       3.1, 0.020, 0.30, 0.90],
  ['chillido', 1150, 0.62, [1900, 3400, 5200],     9.0, 0.070, 0.09, 0.34],
  ['gorgoteo',  165, 0.30, [520, 900, 1400],       2.4, 0.090, 0.34, 0.74]
];
/* las 32 variantes: el timbre se recorre y cada vuelta corre la altura y el
   largo un poco, así que dos gritos del mismo timbre tampoco son el mismo */
const GRITOS = [];
function armaGritos(){
  GRITOS.length = 0;
  for (let i = 0; i < 32; i++){
    const T0 = GRI_TIMBRE[i % GRI_TIMBRE.length];
    const v = Math.floor(i / GRI_TIMBRE.length);          /* 0..5, la vuelta */
    const kf = 1 + (v - 2.5) * 0.085;                     /* altura ±21 % */
    const kd = 1 + ((i * 7) % 5 - 2) * 0.09;              /* largo ±18 % */
    GRITOS.push({
      id: i, timbre: T0[0],
      f0: T0[1] * kf, caida: T0[2], form: T0[3].map(f => f * (1 + (kf-1)*0.6)),
      vibHz: T0[4] * (1 + ((i*3) % 4 - 1.5) * 0.10), vib: T0[5],
      soplo: T0[6], dur: T0[7] * kd,
      /* uno de cada cuatro se QUIEBRA: el grito se corta y vuelve. Es lo que
         hace un grito de verdad cuando se queda sin aire, y en un catálogo
         largo es la variante que más se nota. */
      quiebra: (i % 4) === 3
    });
  }
  return GRITOS.length;
}

/* una voz: fuente + tres formantes + soplo. Es la única función del archivo que
   arma una cadena de más de dos nodos, y es porque un grito no se puede hacer
   con menos. */
function grito(idx, k, t0){
  if (!AUD) return null;
  const G = GRITOS[((idx % GRITOS.length) + GRITOS.length) % GRITOS.length];
  const t = t0 == null ? AUD.currentTime : t0;
  const dur = G.dur;
  /* la fuente: diente de sierra, que trae los armónicos que los formantes
     necesitan para tallar una vocal. Con una senoidal no hay nada que filtrar. */
  const o = AUD.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(G.f0, t);
  /* el contorno: baja hasta `caida` del valor inicial, y si se quiebra pega un
     salto para arriba a mitad de camino antes de seguir bajando */
  if (G.quiebra){
    o.frequency.exponentialRampToValueAtTime(G.f0 * 0.62, t + dur*0.38);
    o.frequency.setValueAtTime(G.f0 * 1.06, t + dur*0.44);
    o.frequency.exponentialRampToValueAtTime(G.f0 * G.caida, t + dur);
  } else {
    o.frequency.exponentialRampToValueAtTime(G.f0 * G.caida, t + dur);
  }
  /* vibrato: un oscilador lento sobre la altura, en Hz absolutos */
  const lfo = AUD.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = G.vibHz;
  const lg = AUD.createGain(); lg.gain.value = G.f0 * G.vib;
  lfo.connect(lg); lg.connect(o.frequency);
  /* jitter: la irregularidad, que no es periódica y por eso va con ruido y no
     con otro oscilador */
  const jit = AUD.createBufferSource(); jit.buffer = RUIDO; jit.loop = true;
  const jf = AUD.createBiquadFilter(); jf.type = 'lowpass'; jf.frequency.value = 22;
  const jg = AUD.createGain(); jg.gain.value = G.f0 * 0.05;
  jit.connect(jf); jf.connect(jg); jg.connect(o.frequency);

  const salida = AUD.createGain();
  /* los tres formantes en PARALELO y no en cascada: en cascada cada uno se come
     lo que el anterior dejó pasar y a la tercera etapa no llega energía */
  const pesos = [1.0, 0.55, 0.28];
  G.form.forEach((f, i) => {
    const b = AUD.createBiquadFilter(); b.type = 'bandpass';
    b.frequency.setValueAtTime(f, t);
    b.frequency.exponentialRampToValueAtTime(f * (0.55 + G.caida*0.4), t + dur);
    b.Q.value = 5.5 - i*1.2;
    const g = AUD.createGain(); g.gain.value = pesos[i];
    o.connect(b); b.connect(g); g.connect(salida);
  });
  /* el soplo: el aire. Sin esto el grito suena a sintetizador, con esto suena a
     alguien que está usando los pulmones. */
  const nb = AUD.createBufferSource(); nb.buffer = RUIDO; nb.loop = true;
  const nf = AUD.createBiquadFilter(); nf.type = 'bandpass';
  nf.frequency.value = G.form[1]; nf.Q.value = 0.7;
  const ng = AUD.createGain(); ng.gain.value = G.soplo;
  nb.connect(nf); nf.connect(ng); ng.connect(salida);

  const fin = AUD.createGain();
  salida.connect(fin); fin.connect(MAESTRO);
  /* ataque de 18 ms: un grito EMPIEZA de golpe. Con 100 ms se lee a lamento. */
  const pico = 0.34 * (k == null ? 1 : k);
  fin.gain.setValueAtTime(0.0001, t);
  fin.gain.exponentialRampToValueAtTime(pico, t + 0.018);
  fin.gain.setValueAtTime(pico, t + dur*0.55);
  fin.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); lfo.start(t); jit.start(t); nb.start(t);
  const fin2 = t + dur + 0.06;
  o.stop(fin2); lfo.stop(fin2); jit.stop(fin2); nb.stop(fin2);
  return G;
}

function son(tipo, f, idx){
  if (!AUD) return;
  const t = AUD.currentTime, k = f == null ? 1 : f;
  if (tipo === 'grito'){
    grito(idx == null ? (Math.random()*GRITOS.length)|0 : idx, k, t);
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
    /* la risa usa la misma voz que el grito, cortada en sílabas: si fuera otra
       cadena de nodos, la risa y el grito sonarían a dos criaturas distintas */
    for (let i = 0; i < 5; i++) grito((idx || 0) + i*7, k*0.42, t + i*0.155);
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
