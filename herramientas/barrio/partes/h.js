
/* ══════════════════════════ EL SONIDO ══════════════════════════
   Todo procedural, ni un archivo. Y acá eso no es una limitación asumida sino
   la respuesta correcta: lo que suena en este juego es LLUVIA, o sea ruido
   filtrado — un clip de lluvia grabado pesa cientos de kilobytes y encima se
   corta cada vez que da la vuelta, y ese corte se escucha más que la lluvia.
   Un ruido generado no tiene vuelta que dar.

   EL RUIDO SE GENERA UNA SOLA VEZ y lo comparten todos: es un buffer de dos
   segundos, y crear uno nuevo por cada pisada serían cuarenta buffers por
   minuto a la basura. */
let AUD = null, MAESTRO = null, ANAL = null, RUIDO = null;
const CAMA = { lluvia: null, gLluvia: null, cerca: null, gCerca: null };
function audioIniciar(){
  if (AUD) return;
  try { AUD = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  MAESTRO = AUD.createGain(); MAESTRO.gain.value = 0.9;
  ANAL = AUD.createAnalyser(); ANAL.fftSize = 2048;
  MAESTRO.connect(ANAL); ANAL.connect(AUD.destination);

  const n = AUD.sampleRate * 2;
  RUIDO = AUD.createBuffer(1, n, AUD.sampleRate);
  const d = RUIDO.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;

  /* ── LA CAMA DE LLUVIA VA EN DOS CAPAS ──
     Una ancha y grave, que es el agua cayendo sobre todo el barrio, y otra
     aguda y más corta, que es el agua golpeando cerca. Con una sola capa la
     lluvia suena a estática de radio; lo que la hace lluvia es que haya un
     fondo continuo y encima unos golpes finos. */
  const cap = (tipo, frec, q, gan) => {
    const s = AUD.createBufferSource(); s.buffer = RUIDO; s.loop = true;
    const f = AUD.createBiquadFilter(); f.type = tipo; f.frequency.value = frec; f.Q.value = q;
    const g = AUD.createGain(); g.gain.value = gan;
    s.connect(f); f.connect(g); g.connect(MAESTRO); s.start();
    return { s, g };
  };
  const a = cap('lowpass', 1150, 0.7, 0.13);
  const b = cap('bandpass', 4200, 0.55, 0.055);
  CAMA.lluvia = a.s; CAMA.gLluvia = a.g;
  CAMA.cerca = b.s; CAMA.gCerca = b.g;

  /* ── TERCERA CAPA: EL VIENTO ──
     La lluvia sola, por muy bien filtrada que este, es ESTACIONARIA: suena
     siempre igual, y a los veinte segundos el oido deja de escucharla. Lo que la
     vuelve un lugar es que respire. Un pasabajos muy grave cuya frecuencia y
     ganancia se mueven solas con dos senos de periodos que no son multiplos
     entre si (17 y 23 segundos), asi que la racha nunca cae dos veces en el
     mismo sitio y no se puede aprender. */
  const s2 = AUD.createBufferSource(); s2.buffer = RUIDO; s2.loop = true;
  const f2 = AUD.createBiquadFilter(); f2.type = 'lowpass';
  f2.frequency.value = 340; f2.Q.value = 0.9;
  const g2 = AUD.createGain(); g2.gain.value = 0.0;
  s2.connect(f2); f2.connect(g2); g2.connect(MAESTRO); s2.start();
  CAMA.viento = s2; CAMA.gViento = g2; CAMA.fViento = f2;

  /* ── EL LATIDO Y EL PITIDO, QUE VIVEN APAGADOS ──
     Los dos son del desmayo y no del barrio, asi que se crean una vez y se
     manejan con la ganancia: crear osciladores en pleno desvanecimiento es
     justo el momento en el que un `new` de mas se escucha como un tic. */
  const osc = AUD.createOscillator(); osc.type = 'sine'; osc.frequency.value = 3150;
  const gz = AUD.createGain(); gz.gain.value = 0;
  osc.connect(gz); gz.connect(MAESTRO); osc.start();
  CAMA.pitido = gz;
  CAMA.gCorazon = AUD.createGain(); CAMA.gCorazon.gain.value = 1;
  CAMA.gCorazon.connect(MAESTRO);

  /* ── LOS SONIDOS DEL HOMBRE ──
     Se decodifican de una vez al arrancar el audio y quedan en `VOZ`. Un
     `decodeAudioData` VACIA el ArrayBuffer que recibe, asi que va con `slice(0)`:
     sin la copia, un segundo intento encuentra cero bytes. Es la misma piedra
     con la que ya se tropezo en Z Force. */
  for (const k in VOZ_B64){
    try {
      const b = B64(VOZ_B64[k]);
      AUD.decodeAudioData(b.slice(0), (buf) => { VOZ[k] = buf; }, () => {});
    } catch(e){}
  }
}

/* ── LA VOZ ──
   `una` evita que un mismo sonido se pise consigo mismo: una respiracion que se
   dispara dos veces solapada suena a dos personas. Se guarda cuando termino la
   ultima y no se vuelve a lanzar hasta que paso. */
const VOZ = {}; const VOZ_T = {};
function voz(k, vol, una){
  if (!AUD || AUD.state !== 'running') return;
  const b = VOZ[k]; if (!b) return;
  const t = AUD.currentTime;
  if (una !== false && VOZ_T[k] && t < VOZ_T[k]) return;
  VOZ_T[k] = t + b.duration * 0.92;
  const s = AUD.createBufferSource(); s.buffer = b;
  const g = AUD.createGain(); g.gain.value = (vol === undefined ? 1 : vol);
  /* un pasaaltos suave: la voz de un generador trae retumbe por debajo de los
     90 Hz que en un telefono no se oye y en auriculares embarra la lluvia */
  const f = AUD.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 90;
  s.connect(f); f.connect(g); g.connect(MAESTRO);
  s.start(t);
}

/* ── LA AMBIENTACION SE MUEVE SOLA ──
   Se llama desde el bucle. Todo lo que hace es mover ganancias y una frecuencia
   de corte, o sea que no crea un solo nodo por cuadro. */
function camaPaso(t){
  if (!AUD || !CAMA.gViento) return;
  const r = 0.5 + 0.5*Math.sin(t/17.0) * Math.sin(t/23.0 + 1.3);
  CAMA.gViento.gain.value = 0.012 + 0.052*r*r;      /* al cuadrado: la racha entra y sale */
  CAMA.fViento.frequency.value = 240 + 260*r;
}

/* ── EL LATIDO ──
   Dos golpes y no uno: un corazon hace «tum-TUM», y con un solo golpe se lee a
   bombo. El segundo es mas corto y un poco mas grave, y llega a 0,26 del primero
   — el intervalo real entre el cierre de las valvulas. */
function latido(vol, agudo){
  if (!AUD || AUD.state !== 'running') return;
  const t = AUD.currentTime;
  for (const [dt, f0, f1, amp, dur] of [[0, 62, 34, 1.0, 0.30], [0.26, 54, 30, 0.62, 0.22]]){
    const o = AUD.createOscillator(); o.type = 'sine';
    const g = AUD.createGain(); o.connect(g); g.connect(CAMA.gCorazon || MAESTRO);
    o.frequency.setValueAtTime(f0*(agudo||1), t+dt);
    o.frequency.exponentialRampToValueAtTime(f1*(agudo||1), t+dt+dur);
    g.gain.setValueAtTime(0, t+dt);
    g.gain.linearRampToValueAtTime(0.42*amp*vol, t+dt+0.012);
    g.gain.exponentialRampToValueAtTime(0.0006, t+dt+dur);
    o.start(t+dt); o.stop(t+dt+dur+0.02);
  }
}
/* el pitido del desvanecimiento: un tono que entra y se come todo lo demas */
function pitido(v){
  if (!AUD || !CAMA.pitido) return;
  CAMA.pitido.gain.setTargetAtTime(0.055*v, AUD.currentTime, 0.25);
}
function son(tipo, vol){
  if (!AUD || AUD.state !== 'running') return;
  const t = AUD.currentTime, v = vol === undefined ? 1 : vol;
  const g = AUD.createGain(); g.connect(MAESTRO);
  if (tipo === 'paso'){
    /* UNA PISADA EN EL AGUA SON DOS COSAS: el golpe del zapato y la salpicadura
       que le sigue. Con sólo el golpe suena a piso seco. */
    const s = AUD.createBufferSource(); s.buffer = RUIDO;
    s.playbackRate.value = 1.6 + Math.random()*0.5;
    const f = AUD.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = 900 + Math.random()*500; f.Q.value = 1.1;
    s.connect(f); f.connect(g);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.24*v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
    s.start(t); s.stop(t + 0.2);
    const s2 = AUD.createBufferSource(); s2.buffer = RUIDO;
    const f2 = AUD.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 3200;
    const g2 = AUD.createGain(); g2.connect(MAESTRO);
    s2.connect(f2); f2.connect(g2);
    g2.gain.setValueAtTime(0, t + 0.02);
    g2.gain.linearRampToValueAtTime(0.10*v, t + 0.035);
    g2.gain.exponentialRampToValueAtTime(0.0008, t + 0.26);
    s2.start(t + 0.02); s2.stop(t + 0.3);
    return;
  }
  if (tipo === 'trueno'){
    /* EL TRUENO BAJA Y NO SUBE, y dura. Un ruido corto con un pasabajos es un
       portazo; lo que lo vuelve trueno es la cola de tres segundos y que el
       filtro se vaya cerrando — que es lo que hace el aire con la distancia. */
    const s = AUD.createBufferSource(); s.buffer = RUIDO; s.loop = true;
    s.playbackRate.value = 0.32;
    const f = AUD.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(420, t);
    f.frequency.exponentialRampToValueAtTime(70, t + 3.1);
    f.Q.value = 0.9;
    s.connect(f); f.connect(g);
    g.gain.setValueAtTime(0.0008, t);
    g.gain.linearRampToValueAtTime(0.42*v, t + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 3.4);
    s.start(t); s.stop(t + 3.5);
    const o = AUD.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(46, t); o.frequency.exponentialRampToValueAtTime(24, t + 2.4);
    const go = AUD.createGain(); go.connect(MAESTRO); o.connect(go);
    go.gain.setValueAtTime(0.0008, t);
    go.gain.linearRampToValueAtTime(0.22*v, t + 0.10);
    go.gain.exponentialRampToValueAtTime(0.0008, t + 2.6);
    o.start(t); o.stop(t + 2.7);
    return;
  }
  if (tipo === 'clic'){
    const o = AUD.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    o.connect(g);
    g.gain.setValueAtTime(0.10*v, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.09);
    o.start(t); o.stop(t + 0.1);
    return;
  }
}
/* la lluvia se agacha en el menú y en la pausa: no se apaga —seguiría
   lloviendo— pero deja de ser lo más fuerte de la pantalla */
function camaVol(k){
  if (!CAMA.gLluvia) return;
  const t = AUD.currentTime;
  CAMA.gLluvia.gain.setTargetAtTime(0.13*k, t, 0.35);
  CAMA.gCerca.gain.setTargetAtTime(0.055*k, t, 0.35);
}

/* ══════════════════════════ CALIDAD, MENÚ Y PAUSA ══════════════════════════ */
function ponCalidad(q){
  const c = CALIDADES[q]; if (!c) return CALIDAD;
  CALIDAD = q;
  CFG.pix = c.pix; CFG.gotas = c.gotas; CFG.sombras = c.sombras;
  CFG.charcos = c.charcos; CFG.grano = c.grano;
  postMat.uniforms.grano.value = c.grano;
  ren.shadowMap.enabled = c.sombras;
  if (LUCES.length){
    /* LA SOMBRA SE PRENDE Y SE APAGA EN LA LUZ, no sólo en el renderer: dejando
       `castShadow` puesto con el mapa apagado, three.js sigue reservando la
       pasada. Y el mapa VIEJO hay que soltarlo a mano — no lo recrea porque
       cambie `mapSize`, se queda con el de antes. */
    LUCES[0].castShadow = c.sombras;
    if (LUCES[0].shadow.map && !c.sombras){ LUCES[0].shadow.map.dispose(); LUCES[0].shadow.map = null; }
  }
  if (charcoMesh) charcoMesh.visible = c.charcos;
  if (LLUVIA.malla) LLUVIA.malla.geometry.instanceCount = Math.min(c.gotas, LLUVIA.total || c.gotas);
  medir();
  try { localStorage.setItem('barrio_cal', q); } catch(e){}
  pintaAjustes();
  return CALIDAD;
}
function pintaAjustes(){
  for (const b of document.querySelectorAll('#mCal .chip'))
    b.classList.toggle('sel', b.dataset.cal === CALIDAD);
  for (const b of document.querySelectorAll('#mIdi .chip'))
    b.classList.toggle('sel', b.dataset.lang === IDIOMA);
}

async function pantallaCompleta(){
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch(e){}
}
function pausa(v){
  PAUSA = v;
  $('pausa').classList.toggle('on', v);
  if (v && document.pointerLockElement) document.exitPointerLock();
  camaVol(v ? 0.35 : 1);
  if (v){
    const t = Math.floor(RELOJ.value - T0JUEGO);
    $('pSub').textContent = TXF('pSub', Math.floor(t/60), String(t%60).padStart(2,'0'));
  }
}
let T0JUEGO = 0;
/* `desde` lo manda la cinemática: el juego arranca EXACTAMENTE donde terminó la
   escena y mirando para el mismo lado. Devolviendo al jugador a la esquina de
   siempre, el último cuadro de la escena y el primero del juego son dos sitios
   distintos y el corte se lee a error y no a corte. */
function entraJuego(desde){
  MODO = 'juego';
  $('menu').classList.remove('on');
  $('hud').classList.add('on');
  T0JUEGO = RELOJ.value;
  /* SE EMPIEZA EN UNA ESQUINA Y MIRANDO POR LA CALLE LARGA. Soltado en el medio
     de una cuadra, el primer cuadro es una cerca a dos metros; desde la esquina
     lo que se ve son doscientos metros de faroles perdiéndose en la niebla, que
     es la imagen que este barrio tiene para dar. */
  JUG.x = desde ? desde.x : EJES[0];
  JUG.z = desde ? desde.z : EJES[0];
  JUG.y = alturaSuelo(JUG.x, JUG.z);
  JUG.vx = JUG.vz = 0;
  JUG.yaw = desde ? desde.yaw : Math.PI;   /* sin `desde`, hacia +Z: calle adentro */
  JUG.pitch = -0.02;
  AND.ojo = OJO; AND.fase = 0; AND.fov = 70;
  cam.fov = 70; cam.updateProjectionMatrix();
  camaVol(1);
  aviso(TXF('calle', TX('ns')[0], TX('ew')[0]), 2600);
}
function vuelveMenu(){
  MODO = 'menu';
  pausa(false);
  CINEMA.limpia();
  $('cineNeg').classList.remove('on');
  $('hud').classList.remove('on');
  $('menu').classList.add('on');
  ponLinterna(false);
  camaVol(0.5);
  CINE.arranca();
}

/* ── LA CÁMARA DEL MENÚ ──
   No es una foto de fondo: es el barrio de verdad, filmado bajando por una
   calle a paso de hombre. Un menú con una imagen detrás y un juego que se ve
   distinto es lo que hace que la portada se lea a promesa incumplida — y acá
   además es gratis, porque la escena ya está construida. */
const CINE = {
  t: 0, x: 0, z: 0, ang: 0,
  arranca(){
    this.t = 0;
    const i = azi(0, CUADRAS), j = azi(0, CUADRAS);
    this.x = EJES[i]; this.z = EJES[j];
    this.ang = Math.floor(az()*4) * (Math.PI/2);
  },
  paso(dt){
    this.t += dt;
    const av = this.t * 2.2;
    const dx = -Math.sin(this.ang), dz = -Math.cos(this.ang);
    const x = this.x + dx*av, z = this.z + dz*av;
    if (Math.abs(x) > MITAD - 8 || Math.abs(z) > MITAD - 8 || this.t > 26) this.arranca();
    cam.position.set(x, 1.72 + Math.sin(this.t*0.9)*0.05, z);
    /* mira un poco de costado y un pelín arriba: por la calle recta se ve la
       fuga de los faroles, y arriba están los cables — que es lo que dice de
       qué barrio se trata */
    cam.rotation.set(0.045, this.ang + Math.sin(this.t*0.23)*0.30, Math.sin(this.t*0.17)*0.012);
    JUG.x = x; JUG.z = z;     /* los faroles y la lluvia siguen a la cámara */
  }
};
