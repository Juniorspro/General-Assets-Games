/* ══════════════════════════ EL SONIDO ══════════════════════════
   Procedural y sin un solo archivo, y acá eso no es una limitación sino la
   respuesta correcta: un minijuego de TikTok se abre desde un enlace y tiene
   que estar jugable en el primer segundo. Medio mega de MP3 antes del primer
   cuadro es exactamente lo que hace que alguien se vaya.

   Y LA ESCALA ESTÁ ESCALONADA, que es la regla que ya se midió en Eco, en
   RECREO y en PULSO: la cama de fondo tiene que quedar MUY por debajo de un
   acierto, porque si compiten, el acierto deja de ser un acontecimiento y pasa
   a ser un matiz. Fondo 0,03 · toque 0,10 · acierto 0,18 · error 0,22 · final
   0,30. */
let AUD = null, MAESTRO = null, ANAL = null, RUIDO = null, CAMA = null;
let SILENCIO = false;

function armaAudio(){
  if (AUD) return;
  try { AUD = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  MAESTRO = AUD.createGain(); MAESTRO.gain.value = 0.9;
  MAESTRO.connect(AUD.destination);
  ANAL = AUD.createAnalyser(); ANAL.fftSize = 1024; MAESTRO.connect(ANAL);
  /* un segundo de ruido blanco generado una vez: cada golpe es el mismo ruido
     con otro filtro y otro sobre, así que no hay que generar nada más */
  const n = AUD.sampleRate;
  RUIDO = AUD.createBuffer(1, n, n);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
}

function env(gn, t0, at, dur, pico){
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t0 + at);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}
function tono(t0, f0, f1, dur, pico, tipo){
  if (!AUD) return;
  const o = AUD.createOscillator(); o.type = tipo || 'sine';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  const gn = AUD.createGain(); o.connect(gn); gn.connect(MAESTRO);
  env(gn, t0, Math.min(0.02, dur*0.2), dur, pico);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function ruido(t0, dur, f, q, pico, tipo){
  if (!AUD) return null;
  const s = AUD.createBufferSource(); s.buffer = RUIDO; s.loop = true;
  const b = AUD.createBiquadFilter(); b.type = tipo || 'bandpass';
  b.frequency.value = f; b.Q.value = q;
  const gn = AUD.createGain();
  s.connect(b); b.connect(gn); gn.connect(MAESTRO);
  env(gn, t0, Math.min(0.01, dur*0.2), dur, pico);
  s.start(t0); s.stop(t0 + dur + 0.05);
  return b;
}

/* ── LA ESCALA PENTATÓNICA NO ES UN GUSTO ──
   Un acierto suena cien veces por partida. En cualquier otra escala, dos notas
   seguidas pueden sonar mal juntas y a los treinta segundos molesta; en
   pentatónica cualquier nota pega con cualquier otra. Es la misma decisión que
   en POMPOM, y ahí se notó al primer minuto de juego. */
const PENTA = [0, 2, 4, 7, 9];
function nota(i){ /* i = grado, sube por octavas */
  const o = Math.floor(i / 5), s = PENTA[((i % 5) + 5) % 5];
  return 220 * Math.pow(2, (s + 12*o) / 12);
}

let _racha = 0;
function son(tipo, k){
  if (!AUD || SILENCIO) return;
  const t = AUD.currentTime, v = k == null ? 1 : k;
  if (tipo === 'toque'){
    tono(t, 620, 460, 0.05, 0.10*v, 'sine');
  } else if (tipo === 'bien'){
    /* ── LA RACHA SUBE DE NOTA, Y ES LO QUE ENGANCHA ──
       Con una nota fija, veinte aciertos son el mismo sonido veinte veces. Con
       la escala subiendo, la racha SE ESCUCHA: el jugador oye que va bien antes
       de mirar el número, y perder la racha se siente porque el tono vuelve
       abajo. Es la mitad del enganche de un minijuego y cuesta dos líneas. */
    _racha = Math.min(_racha + 1, 14);
    tono(t, nota(_racha + 4), nota(_racha + 4)*1.5, 0.16, 0.18*v, 'triangle');
    tono(t + 0.03, nota(_racha + 9), nota(_racha + 9), 0.10, 0.07*v, 'sine');
  } else if (tipo === 'mal'){
    _racha = 0;
    tono(t, 190, 78, 0.30, 0.22*v, 'sawtooth');
    ruido(t, 0.16, 260, 0.8, 0.14*v, 'lowpass');
  } else if (tipo === 'gana'){
    _racha = 0;
    for (let i = 0; i < 5; i++)
      tono(t + i*0.085, nota(6 + i*2), nota(6 + i*2), 0.30, 0.30, 'triangle');
  } else if (tipo === 'pierde'){
    _racha = 0;
    for (let i = 0; i < 3; i++)
      tono(t + i*0.13, nota(8 - i*3), nota(8 - i*3)*0.98, 0.34, 0.24, 'sawtooth');
  } else if (tipo === 'raspa'){
    const b = ruido(t, 0.09, 2600, 0.6, 0.13*v);
    if (b) b.frequency.linearRampToValueAtTime(1400, t + 0.09);
  } else if (tipo === 'clic'){
    ruido(t, 0.035, 1800, 1.4, 0.12*v);
  } else if (tipo === 'pop'){
    /* una burbuja que revienta: un golpe de ruido corto y agudo mas un tono que
       cae rapido. El tono solo suena a bip; el ruido solo, a chasquido. */
    ruido(t, 0.05, 1500 + 900*Math.random(), 1.1, 0.14*v);
    tono(t, 900, 320, 0.07, 0.09*v, 'sine');
  } else if (tipo === 'caida'){
    /* algo apoyandose: casi todo grave, porque lo que dice «peso» es lo de
       abajo. Con un tono agudo se lee a boton y no a bloque. */
    tono(t, 150, 62, 0.13, 0.16*v, 'sine');
    ruido(t, 0.06, 220, 0.7, 0.10*v, 'lowpass');
  }
}
function rachaCero(){ _racha = 0; }

/* la cama: dos senos muy graves y desafinados entre sí, que baten cada pocos
   segundos. Dos senos idénticos suenan a tono de prueba; desafinados suenan a
   instrumento, y es lo que ya se midió en POMPOM. */
function camaFondo(on){
  if (!AUD) return;
  if (on && !CAMA){
    const o = AUD.createOscillator(); o.type = 'sine'; o.frequency.value = 55;
    const o2 = AUD.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.4;
    const gn = AUD.createGain(); gn.gain.value = 0.030;
    o.connect(gn); o2.connect(gn); gn.connect(MAESTRO);
    o.start(); o2.start();
    CAMA = { o, o2, gn };
  } else if (!on && CAMA){
    CAMA.gn.gain.setTargetAtTime(0.0001, AUD.currentTime, 0.25);
    const c = CAMA; CAMA = null;
    setTimeout(() => { try { c.o.stop(); c.o2.stop(); } catch(e){} }, 900);
  }
}
function pico(){
  if (!ANAL) return 0;
  const a = new Uint8Array(ANAL.fftSize);
  ANAL.getByteTimeDomainData(a);
  let m = 0;
  for (const v of a) m = Math.max(m, Math.abs(v - 128) / 128);
  return +m.toFixed(4);
}
