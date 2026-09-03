# -*- coding: utf-8 -*-
"""Los sonidos generados: los monstruos, las acciones y la cama de cada sitio.

LO PROCEDURAL NO SE BORRA. Las diez funciones `playX` del juego siguen enteras y
lo unico que se les agrega es una PRIMERA LINEA que intenta la muestra: si el
MP3 no decodifica —un navegador raro, un base64 cortado— suena el oscilador de
siempre. Un juego mudo por un decodificador es peor que un juego con bips, y ya
paso una vez en Campo de Tiro.

LA MEZCLA ES UNA ESCALA Y ESTA MEDIDA, no elegida: los monstruos arriba
(rms 0,15 de diseno), las acciones en el medio (0,11) y las camas abajo (0,055),
que es la regla de siempre en este repo — lo que tiene que asustar tiene que
poder tapar a lo que se dispara cien veces por partida.

LA CAMA VA CON UN `BufferSource` EN BUCLE Y NO CON UN `<audio loop>`: el loop de
un `<audio>` vuelve al cero con un hueco de milisegundos, y en un clip de ocho
segundos eso se escucha en cada vuelta. Y se cruzan en 1,2 s, porque un corte en
seco entre dos sitios se lee a error.

LA PISADA VA ATADA A LA FASE DEL PASO y no a un temporizador: `bobTimer` es lo
que mueve el cabeceo de la camara, asi que el sonido y el balanceo son el mismo
numero y no se pueden desincronizar. Es la correccion que en Maicol convirtio
veinticuatro pisadas por segundo superpuestas —o sea ruido blanco— en un trote.
"""

JS = r"""
  // ==================================================================
  // LOS SONIDOS GENERADOS
  // ==================================================================
  const PB_SON_B = window.__PB_SON || {};
  const PB_SON_BUF = {};
  let pbSonMaster = null, pbSonAna = null, pbSonListo = 0, pbSonFalla = 0;

  function pbSonArranca() {
    const ctx = ensureAudio();
    if (!ctx || pbSonMaster) return ctx;
    pbSonMaster = ctx.createGain();
    pbSonMaster.gain.value = 1;
    // EL ANALIZADOR ES LO UNICO QUE PRUEBA QUE SONO. Sin el, "el audio anda"
    // quiere decir "la llamada no tiro excepcion", que no es lo mismo.
    pbSonAna = ctx.createAnalyser();
    pbSonAna.fftSize = 2048;
    pbSonMaster.connect(pbSonAna);
    pbSonMaster.connect(ctx.destination);
    Object.keys(PB_SON_B).forEach(function (n) {
      try {
        const s = atob(PB_SON_B[n]);
        const ab = new ArrayBuffer(s.length);
        const v = new Uint8Array(ab);
        for (let i = 0; i < s.length; i++) v[i] = s.charCodeAt(i);
        // OJO: decodeAudioData VACIA el buffer que recibe, asi que un segundo
        // intento sobre el mismo ArrayBuffer encuentra cero bytes.
        ctx.decodeAudioData(ab.slice(0),
          function (b) { PB_SON_BUF[n] = b; pbSonListo++; },
          function () { pbSonFalla++; });
      } catch (e) { pbSonFalla++; }
    });
    return ctx;
  }

  // devuelve true si la muestra sono, para que quien la llame sepa si tiene que
  // caer al oscilador
  function pbSon(nom, vol, tono) {
    const ctx = pbSonArranca();
    if (!ctx || !PB_SON_BUF[nom]) return false;
    try {
      const src = ctx.createBufferSource();
      src.buffer = PB_SON_BUF[nom];
      if (tono) src.playbackRate.value = tono;
      const g = ctx.createGain();
      g.gain.value = (vol === undefined ? 1 : vol);
      src.connect(g); g.connect(pbSonMaster);
      src.start();
      return true;
    } catch (e) { return false; }
  }

  // ── LA CAMA DE AMBIENTE ────────────────────────────────────────────────────
  const PB_CAMA = { nom: null, src: null, gan: null };
  const PB_CAMA_VOL = 0.55;

  function pbCama(nom) {
    const ctx = pbSonArranca();
    if (!ctx) return;
    if (PB_CAMA.nom === nom) return;
    const buf = PB_SON_BUF[nom];
    const t = ctx.currentTime;
    if (PB_CAMA.src) {
      // se apaga la vieja con rampa y se la deja morir sola
      try {
        PB_CAMA.gan.gain.cancelScheduledValues(t);
        PB_CAMA.gan.gain.setValueAtTime(PB_CAMA.gan.gain.value, t);
        PB_CAMA.gan.gain.linearRampToValueAtTime(0, t + 1.2);
        PB_CAMA.src.stop(t + 1.35);
      } catch (e) {}
      PB_CAMA.src = null; PB_CAMA.gan = null;
    }
    // EL NOMBRE SE ANOTA RECIEN CUANDO LA FUENTE ARRANCO DE VERDAD. Anotandolo
    // antes, una cama pedida mientras su MP3 todavia se estaba decodificando
    // quedaba marcada como puesta y el `if` de arriba no volvia a intentarlo
    // nunca: medido en el cuarto, `cama: b_room` con `suena: false` y nivel 0,
    // o sea el prologo entero en silencio. Y no fallaba nada.
    if (!buf) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(PB_CAMA_VOL, t + 1.2);
      src.connect(g); g.connect(pbSonMaster);
      src.start();
      PB_CAMA.src = src; PB_CAMA.gan = g; PB_CAMA.nom = nom;
    } catch (e) {}
  }

  const PB_CAMA_DE = { room: 'b_room', field: 'b_field', farm: 'b_farm',
                       school: 'b_school', library: 'b_library',
                       dungeon: 'b_dungeon', store: 'b_store' };

  // el nivel que de verdad esta saliendo por el maestro
  function pbSonNivel() {
    if (!pbSonAna) return { pico: 0, rms: 0 };
    const a = new Float32Array(pbSonAna.fftSize);
    pbSonAna.getFloatTimeDomainData(a);
    let p = 0, s2 = 0;
    for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > p) p = v; s2 += a[i] * a[i]; }
    return { pico: +p.toFixed(4), rms: +Math.sqrt(s2 / a.length).toFixed(4) };
  }

  // ── LA PISADA, ATADA A LA FASE DEL PASO ────────────────────────────────────
  let pbPasoFase = 0;
  function pbPasoSuena(bt, moviendo) {
    if (!moviendo) { pbPasoFase = bt; return; }
    // el cabeceo es un seno: hay una pisada por cada media vuelta
    const a = Math.floor(pbPasoFase / Math.PI), b = Math.floor(bt / Math.PI);
    pbPasoFase = bt;
    if (b !== a) pbSon('a_paso', 0.5, 0.92 + Math.random() * 0.16);
  }
"""

# ── EL ASSET Y LAS DIEZ FUNCIONES ────────────────────────────────────────────
# nombre de la funcion : (sonido, volumen, como se saca el volumen que le pasan)
MUESTRAS = [
    ('playScreech()',        'm_criatura', '1'),
    ('playRoar(vol)',        'm_perro',    'Math.min(1, (vol || 1) * 1.1)'),
    ('playBatScreech(vol)',  'm_murci',    'Math.min(1, (vol || 1) * 1.1)'),
    ('playHoodBreath(vol)',  'm_verdugo',  'Math.min(1, (vol || 1) * 1.2)'),
    ('playMusicBox(vol)',    'm_cajita',   'Math.min(1, (vol || 1) * 1.2)'),
    ('playGiggle(vol)',      'm_muneca',   'Math.min(1, (vol || 1) * 1.2)'),
    ('playApeBreath(vol, snarl)', 'm_simio', 'Math.min(1, (vol || 1) * 1.2)'),
    ('playSaw(vol)',         'a_sierra',   'Math.min(1, (vol || 1) * 0.9)'),
    ('playThud(vol)',        'a_paso',     'Math.min(1, (vol || 1) * 1.3)'),
]

# ── LAS ACCIONES, cada una en su disparador ──────────────────────────────────
# (ancla unica en el archivo, sonido)
ACCIONES = [
    ("      showToast('Código incorrecto.', 1800);", 'a_mal', 0.9),
    ("    showToast('🔓 La puerta se abrió. La salida está detrás.', 4200);", 'a_bien', 1.0),
    ("          showToast('⛽ Bidón de gasolina. Llévalo a un generador.', 3600);", 'a_agarra', 0.9),
    ("            showToast('📚 Los cinco están en su sitio. Se abrió una puerta.', 5000);", 'a_bien', 1.0),
    ("            showToast('🔥 Las tres arden. El portón del norte cedió.', 5200);", 'a_bien', 1.0),
    ("          showToast('Enciende el mechero para prenderla.', 2400);", 'a_antorcha', 0.55),
    ("          showToast('Telarana. Estas pegado 3 segundos y te oyo.', 2600);", 'a_tela', 1.0),
    ("          showToast('Solo puedes cargar un libro a la vez.', 2200);", 'a_libro', 0.7),
]
