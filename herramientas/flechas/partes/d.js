/* ══════════════════════════════════════════════════════════════════════════
   D · AUDIO
   Procedural y sin un byte de asset, y aca eso ademas es lo correcto: los
   sonidos de este juego son un roce de papel y un golpe seco, que es ruido
   filtrado — un clip grabado pesa cientos de kilobytes y encima se corta en
   cada vuelta del bucle. Todo cuelga de UN maestro para que el analizador de
   las sondas pueda decir si algo sono de verdad.
   ══════════════════════════════════════════════════════════════════════════ */
const AU = { ctx: null, maes: null, mus: null, fx: null, an: null, ruido: null, on: false, latido: null, acorde: 0 };

/* Un solo bufer de ruido de un segundo, generado una vez. Cada roce lo
   reproduce con otro filtro y otro sobre: dos rellenos de ruido distintos
   cuestan lo mismo que dos filtros y pesan el doble.                       */
function auRuido() {
  if (AU.ruido) return AU.ruido;
  const n = AU.ctx.sampleRate, b = AU.ctx.createBuffer(1, n, n), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  AU.ruido = b; return b;
}

function auArranca() {
  if (AU.on) return;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  try { AU.ctx = new C(); } catch (e) { return; }
  AU.maes = AU.ctx.createGain(); AU.maes.gain.value = 0.9;
  AU.an = AU.ctx.createAnalyser(); AU.an.fftSize = 2048;
  AU.maes.connect(AU.an); AU.an.connect(AU.ctx.destination);
  AU.mus = AU.ctx.createGain(); AU.mus.gain.value = PROG.vol; AU.mus.connect(AU.maes);
  AU.fx = AU.ctx.createGain();  AU.fx.gain.value  = PROG.fx;  AU.fx.connect(AU.maes);
  AU.on = true;
  auCama();
}
function auDesp() { if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); }
function auVol() { if (!AU.on) return; AU.mus.gain.value = PROG.vol; AU.fx.gain.value = PROG.fx; }

/* ── LA CAMA ──────────────────────────────────────────────────────────────
   Cuatro senos DOBLADOS y desafinados un pelo entre si: dos senos identicos
   suenan a tono de prueba y dos que baten cada varios segundos suenan a
   instrumento. Encima un pasabajos que se abre y se cierra cada 21 s — eso
   es lo que hace que respire en vez de zumbar.                             */
const AU_ESC = [0, 3, 5, 7, 10];                 /* pentatonica menor       */
const AU_RAIZ = [55, 58.27, 61.74, 49, 51.91, 46.25];  /* una por mundo     */
function auCama() {
  if (!AU.on) return;
  const c = AU.ctx, t = c.currentTime;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
  lp.frequency.value = 420; lp.connect(AU.mus);
  const lfo = c.createOscillator(), lg = c.createGain();
  lfo.frequency.value = 1 / 21; lg.gain.value = 210;
  lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
  AU.cama = { lp, voces: [] };
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; g.gain.value = 0.028 / (1 + i * 0.5);
      o.connect(g); g.connect(lp); o.start(t);
      AU.cama.voces.push({ o, g, i, det: j ? 1.00023 : 1 });
    }
  }
  auAcorde(0);
}
/* Cada mundo TRANSPONE la raiz; no cambia de tema. Seis temas serian seis
   cortes, y este juego no tiene un solo corte.                             */
function auAcorde(m) {
  if (!AU.on || !AU.cama) return;
  AU.acorde = m;
  const r = AU_RAIZ[cl(m, 0, AU_RAIZ.length - 1)], t = AU.ctx.currentTime;
  const gr = [0, 12, 19, 24];
  for (const v of AU.cama.voces) {
    const f = r * Math.pow(2, (gr[v.i] + (v.i === 3 ? AU_ESC[2] : 0)) / 12) * v.det;
    v.o.frequency.setTargetAtTime(f, t, 0.9);
  }
}

/* ── LOS EFECTOS ─────────────────────────────────────────────────────────
   LA ESCALA ESTA MEDIDA CON `sonMide`, QUE BARRE EL CLIP ENTERO. La ventana
   del analizador son 42,7 ms y un efecto dura entre 200 y 700, asi que una
   sola lectura cae donde caiga y devuelve la cama: medido asi, `sale` daba
   0,94 VECES EL FONDO —o sea que el acto central del juego sonaba mas flojo
   que el silencio— y la fanfarria 1,22. La causa eran ocho senos de la cama
   que se refuerzan entre si contra efectos de 200 ms; la cama bajo a un
   tercio y los efectos subieron. `sale` es el que mas se dispara —uno por
   flecha— asi que queda por debajo de ganar, que es el acontecimiento.    */
function auEnv(g, t, a, d, pico) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function auTono(f, t, dur, pico, tipo) {
  const c = AU.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t);
  o.connect(g); g.connect(AU.fx);
  auEnv(g, t, 0.008, dur, pico);
  o.start(t); o.stop(t + dur + 0.06);
  return o;
}
function auRoce(t, dur, f0, f1, pico, q) {
  const c = AU.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  s.buffer = auRuido(); s.loop = true;
  bp.type = 'bandpass'; bp.Q.value = q || 1.1;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  s.connect(bp); bp.connect(g); g.connect(AU.fx);
  auEnv(g, t, 0.012, dur, pico);
  s.start(t); s.stop(t + dur + 0.08);
}
function son(k) {
  if (!AU.on) return;
  auDesp();
  const t = AU.ctx.currentTime;
  switch (k) {
    /* la flecha corriendose: papel sobre papel, agudo y corto */
    /* la Q ABIERTA no es un gusto: un pasabanda estrecho sobre ruido blanco se
       come casi toda la energia — medido, con Q 1,3 `sale` daba 1,28 veces el
       fondo por mas que se le subiera el pico. Es el mismo defecto que en
       POMPOM dejaba el sonido de reventar doce veces por debajo.           */
    case 'sale':  auRoce(t, 0.20, 1500, 3800, 0.55, 0.8); auTono(520, t, 0.10, 0.10, 'sine'); break;
    /* la que no puede: golpe seco y grave — NO es un pitido de error, es la
       flecha chocando con la que esta adelante                              */
    case 'mal':   auRoce(t, 0.11, 420, 150, 0.30, 2.6); auTono(96, t, 0.13, 0.26, 'triangle'); break;
    case 'vida':  auTono(330, t, 0.16, 0.22, 'triangle'); auTono(220, t + 0.09, 0.24, 0.20, 'triangle'); break;
    case 'ui':    auTono(880, t, 0.05, 0.10, 'sine'); break;
    case 'des':   auRoce(t, 0.16, 2600, 900, 0.18, 1.4); break;
    case 'gana': { const r = 440, g = [0, 4, 7, 12];
      for (let i = 0; i < 4; i++) auTono(r * Math.pow(2, g[i] / 12), t + i * 0.075, 0.30, 0.20, 'sine');
      auRoce(t, 0.5, 900, 4200, 0.11, 0.9); break; }
    case 'perf': { const r = 523.25, g = [0, 4, 7, 12, 16, 19];
      for (let i = 0; i < 6; i++) auTono(r * Math.pow(2, g[i] / 12), t + i * 0.068, 0.42, 0.19, 'sine');
      auRoce(t, 0.7, 1100, 5200, 0.13, 0.9); break; }
    case 'trab':  auTono(160, t, 0.30, 0.20, 'sawtooth'); auTono(151, t, 0.30, 0.16, 'sawtooth'); break;
  }
}
/* Agacha la cama mientras suena algo que hay que escuchar: sin esto la
   fanfarria compite con el pad y ninguna de las dos se oye.                */
function auAgacha(f, dur) {
  if (!AU.on) return;
  const t = AU.ctx.currentTime, g = AU.mus.gain;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(PROG.vol * f, t, 0.05);
  g.setTargetAtTime(PROG.vol, t + dur, 0.35);
}
