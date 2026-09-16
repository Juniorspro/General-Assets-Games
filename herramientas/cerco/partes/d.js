/* ══════════════════════════════════════════════════════════════════════════
   D · AUDIO
   Procedural y sin un byte de asset, y aca eso ademas es lo correcto: lo que
   suena en CERCO es tierra que se cierra y una estela que se corta — un tono
   con cuerpo y un golpe seco, o sea ruido filtrado. Un clip grabado pesaria
   cientos de kilobytes y encima se cortaria en cada vuelta del bucle.
   TODO CUELGA DE UN MAESTRO para que el analizador de las sondas pueda decir
   si algo sono de verdad: «no tiro excepcion» no es «se escucho».
   ══════════════════════════════════════════════════════════════════════════ */
const AU = { ctx: null, maes: null, mus: null, fx: null, an: null, ruido: null, on: false, cama: null, acorde: 0, abre: 0 };

/* Un solo bufer de ruido de un segundo, generado una vez. Cada golpe lo
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
  AU.fx  = AU.ctx.createGain(); AU.fx.gain.value  = PROG.fx;  AU.fx.connect(AU.maes);
  AU.on = true;
  auCama();
}
function auDesp() { if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); }
function auVol() { if (!AU.on) return; AU.mus.gain.value = PROG.vol; AU.fx.gain.value = PROG.fx; }

/* ── LA CAMA ──────────────────────────────────────────────────────────────
   Cuatro voces DOBLADAS y desafinadas un pelo entre si: dos senos identicos
   suenan a tono de prueba y dos que baten cada varios segundos suenan a
   instrumento. Y un pasabajos que respira cada 19 s.

   LO PROPIO DE ESTE JUEGO ES QUE EL FILTRO SE ABRE CON LA TAJADA. Cuanto mas
   tablero es tuyo, mas brillo tiene la cama: la musica dice como vas sin un
   numero y sin un cartel, que es justo lo que un tablero de setenta celdas de
   lado no puede mostrar de una ojeada. Y no es un segundo tema —eso seria un
   corte— es el MISMO acorde abriendose.                                     */
const AU_RAIZ = [55, 58.27, 61.74, 49, 51.91];   /* una por mundo            */
const AU_GR = [0, 12, 19, 26];                   /* raiz · octava · quinta · novena */
function auCama() {
  if (!AU.on) return;
  const c = AU.ctx, t = c.currentTime;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
  lp.frequency.value = 400; lp.connect(AU.mus);
  const lfo = c.createOscillator(), lg = c.createGain();
  lfo.frequency.value = 1 / 19; lg.gain.value = 190;
  lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
  AU.cama = { lp, voces: [] };
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; g.gain.value = 0.030 / (1 + i * 0.5);
    o.connect(g); g.connect(lp); o.start(t);
    AU.cama.voces.push({ o, g, i, det: j ? 1.00027 : 1 });
  }
  auAcorde(0); auAbre(0);
}
/* Cada mundo TRANSPONE la raiz; no cambia de tema. Cinco temas serian cinco
   cortes, y este juego no tiene un solo corte.                             */
function auAcorde(m) {
  if (!AU.on || !AU.cama) return;
  AU.acorde = m;
  const r = AU_RAIZ[cl(m, 0, AU_RAIZ.length - 1)], t = AU.ctx.currentTime;
  for (const v of AU.cama.voces)
    v.o.frequency.setTargetAtTime(r * Math.pow(2, AU_GR[v.i] / 12) * v.det, t, 0.9);
}
/* `k` es cuanto falta para la meta, de 0 a 1. El corte va lento a proposito
   (medio segundo de constante): siguiendo la tajada cuadro a cuadro el filtro
   late en cada reclamo y eso se escucha peor que no moverlo.               */
function auAbre(k) {
  if (!AU.on || !AU.cama) return;
  AU.abre = cl(k, 0, 1);
  AU.cama.lp.frequency.setTargetAtTime(400 + AU.abre * 1500, AU.ctx.currentTime, 0.5);
}

/* ── LOS EFECTOS ─────────────────────────────────────────────────────────
   LA ESCALA SE MIDE CON `sonMide`, QUE BARRE EL CLIP ENTERO: la ventana del
   analizador son 42,7 ms y un efecto dura entre 150 y 700, asi que una sola
   lectura cae donde caiga y devuelve la cama.
   Y la Q va ABIERTA: un pasabanda estrecho sobre ruido blanco se come casi
   toda la energia — ya costo una vuelta en POMPOM y otra en FLECHAS.      */
function auEnv(g, t, a, d, pico) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function auTono(f, t, dur, pico, tipo, f1) {
  const c = AU.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(g); g.connect(AU.fx);
  auEnv(g, t, 0.008, dur, pico);
  o.start(t); o.stop(t + dur + 0.06);
}
function auRoce(t, dur, f0, f1, pico, q) {
  const c = AU.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  s.buffer = auRuido(); s.loop = true;
  bp.type = 'bandpass'; bp.Q.value = q || 0.9;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  s.connect(bp); bp.connect(g); g.connect(AU.fx);
  auEnv(g, t, 0.012, dur, pico);
  s.start(t); s.stop(t + dur + 0.08);
}
function son(k, arg) {
  if (!AU.on) return;
  auDesp();
  const t = AU.ctx.currentTime;
  switch (k) {
    /* ── TIERRA: el acto central, y SUENA MAS CUANTO MAS SE CERRO. Con un
          sonido fijo, encerrar tres celdas y encerrar trescientas dan lo
          mismo, y entonces el unico premio del juego no informa nada.      */
    case 'tierra': {
      const k2 = cl((arg || 0) / 260, 0, 1);
      const g = [0, 7, 12, 16, 19];
      const cu = 2 + Math.round(k2 * 3);                 /* de dos a cinco notas */
      for (let i = 0; i < cu; i++)
        auTono(261.63 * Math.pow(2, g[i] / 12), t + i * 0.055, 0.26, 0.19, 'sine');
      auRoce(t, 0.22 + k2 * 0.25, 700, 2600 + k2 * 1800, 0.11 + k2 * 0.07, 0.8);
      break;
    }
    /* ── EL CORTE: lo mas fuerte del juego, y tiene que serlo. Es lo unico
          que cuesta una vida. Golpe grave que CAE — uno que sube suena a
          premio — mas un raspon ancho.                                     */
    case 'corte':
      auTono(190, t, 0.34, 0.40, 'triangle', 62);
      auRoce(t, 0.26, 1800, 220, 0.34, 0.7);
      break;
    /* SALIR DE LO PROPIO ES EL UNICO AVISO DE QUE ESTAS EXPUESTO, y estaba
       puesto «flojo porque suena una vez por vuelta». Medido con `sonMide`,
       flojo era 1,09 VECES LA CAMA: o sea que no existia. Un aviso que no se
       oye no es discreto, es un aviso que no esta. Va al doble de pico y con
       un golpecito grave adelante — un roce agudo solo tiene poca masa y se
       pierde debajo del pad, que es grave.
       Y sigue por DEBAJO de `casi` (2,2x), que es la alarma de verdad: esto
       avisa que arrancaste, aquello avisa que te vienen a cortar.          */
    case 'sale':
      auRoce(t, 0.16, 2000, 3800, 0.34, 0.9);
      auTono(330, t, 0.10, 0.13, 'sine');
      break;
    /* un rival llegando a la estela: dos golpes, que es lo que se lee a
       alarma — uno solo se confunde con el roce de salir.                   */
    case 'casi':
      auTono(740, t, 0.09, 0.20, 'square');
      auTono(740, t + 0.13, 0.09, 0.20, 'square');
      break;
    /* los dos que confirman: el toque de un boton y el paso del tutorial que
       se dio por hecho. Medidos en 1,23x y 1,12x la cama — o sea que tocar un
       boton no sonaba y avanzar de paso tampoco. Un acuse de recibo inaudible
       se lee a que el juego no te escucho.                                  */
    case 'ui':   auTono(880, t, 0.06, 0.24, 'sine'); break;
    case 'des':
      auRoce(t, 0.18, 2600, 900, 0.30, 1.2);
      auTono(659.25, t + 0.02, 0.12, 0.16, 'sine');
      break;
    case 'gana': { const r = 440, g = [0, 4, 7, 12];
      for (let i = 0; i < 4; i++) auTono(r * Math.pow(2, g[i] / 12), t + i * 0.075, 0.32, 0.22, 'sine');
      auRoce(t, 0.55, 800, 4200, 0.12, 0.9); break; }
    case 'perf': { const r = 523.25, g = [0, 4, 7, 12, 16, 19];
      for (let i = 0; i < 6; i++) auTono(r * Math.pow(2, g[i] / 12), t + i * 0.068, 0.44, 0.21, 'sine');
      auRoce(t, 0.75, 1000, 5400, 0.14, 0.9); break; }
    case 'pierde':
      auTono(174.6, t, 0.55, 0.24, 'sawtooth', 87.3);
      auTono(130.8, t + 0.10, 0.55, 0.20, 'sawtooth', 65.4);
      break;
  }
}
/* Agacha la cama mientras suena algo que hay que escuchar: sin esto la
   fanfarria compite con el pad y no se oye ninguna de las dos.

   `f` ES UNA FRACCION Y `dur` PUEDE NO ESTAR, y esa segunda forma no es un
   adorno: hay DOS agachadas distintas y con una sola firma una de las dos
   sale rota. La de la fanfarria dura lo que dura el sonido y se levanta
   sola; la de la PAUSA dura lo que dure la pausa —no hay forma de saberlo
   de antemano— y la levanta quien despausa. Con `dur` obligatorio, los tres
   llamadores de la pausa pasaban un booleano y `t + undefined` es NaN:
   `setTargetAtTime` TIRA con un valor no finito, y esa excepcion se llevaba
   puesto a `partidaSale` entero —o sea salir al menu desde la pausa— sin que
   nada del audio pareciera tener que ver.                                  */
function auAgacha(f, dur) {
  if (!AU.on) return;
  const t = AU.ctx.currentTime, g = AU.mus.gain;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(PROG.vol * f, t, 0.05);
  if (dur > 0) g.setTargetAtTime(PROG.vol, t + dur, 0.35);
}
