/* ══════════════════════════════════════════════════════════════════════════
   LA ENTRADA Y EL BUCLE
   ══════════════════════════════════════════════════════════════════════════ */

const ENT = { x: 0, z: 0, corre: false };
const TECLAS = {};
let JOY = { id: -1, cx: 0, cy: 0, dx: 0, dy: 0, r: 54 };
let GIRO = { id: -1, px: 0, py: 0, x: 0, y: 0 };
let MUNDO = null, SEM = 1;

/* ── EL MARCO ESTÁ GIRADO EN VERTICAL, así que un toque de pantalla NO cae
   donde uno cree. `getBoundingClientRect` sobre un elemento girado devuelve
   la caja ALINEADA A LOS EJES, y para un joystick redondo eso da el cuadrado
   equivocado. La conversión es la inversa del rotate(90deg).              */
function aMarco(px, py) {
  if (!document.body.classList.contains('girado')) {
    const r = document.getElementById('marco').getBoundingClientRect();
    return { x: px - r.left, y: py - r.top };
  }
  const W = innerWidth, H = innerHeight;
  return { x: (py - H / 2) + ANCHO / 2, y: ALTO / 2 - (px - W / 2) };
}
function dMarco(dx, dy) {
  return document.body.classList.contains('girado') ? { x: dy, y: -dx } : { x: dx, y: dy };
}

function armaEntrada() {
  const lz = document.getElementById('lienzo');

  addEventListener('keydown', e => {
    TECLAS[e.code] = true;
    if (e.code === 'Escape') { PART === 'juego' ? pausa(true) : (PART === 'pausa' ? pausa(false) : 0); }
    if (e.code === 'Space' && PART === 'juego') { e.preventDefault(); jugPide('esquiva'); }
  });
  addEventListener('keyup', e => { TECLAS[e.code] = false; });
  addEventListener('blur', () => { for (const k in TECLAS) TECLAS[k] = false; });

  /* EN PC EL BOTÓN IZQUIERDO ATACA Y EL DERECHO NO HACE NADA: con el ratón
     capturado no hay menú contextual que valga, y un botón que abre el menú
     del navegador en medio de una pelea es peor que no tener botón          */
  lz.addEventListener('contextmenu', e => e.preventDefault());
  lz.addEventListener('mousedown', e => {
    if (PART !== 'juego') return;
    if (e.button === 0) { jugPide('ataca'); if (!document.pointerLockElement) lz.requestPointerLock(); }
  });
  addEventListener('mousemove', e => {
    if (document.pointerLockElement === lz) { GIRO.x += e.movementX * 0.0028; GIRO.y += e.movementY * 0.0022; }
  });

  /* táctil: el joystick nace DONDE SE APOYA el dedo en su cuarto de pantalla.
     Con el joystick clavado en un sitio hay que buscarlo mirando el pulgar. */
  const zonaJoy = p => p.x < ANCHO * 0.42;
  lz.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    const p = aMarco(e.clientX, e.clientY);
    if (zonaJoy(p) && JOY.id < 0) {
      JOY.id = e.pointerId; JOY.cx = p.x; JOY.cy = p.y; JOY.dx = 0; JOY.dy = 0;
      const j = document.getElementById('joy');
      j.style.left = p.x + 'px'; j.style.top = p.y + 'px'; j.style.opacity = 1;
    } else if (GIRO.id < 0) { GIRO.id = e.pointerId; GIRO.px = e.clientX; GIRO.py = e.clientY; }
  }, { passive: false });
  addEventListener('pointermove', e => {
    if (e.pointerId === JOY.id) {
      const p = aMarco(e.clientX, e.clientY);
      JOY.dx = p.x - JOY.cx; JOY.dy = p.y - JOY.cy;
      const l = Math.hypot(JOY.dx, JOY.dy);
      JOY.bruto = l / JOY.r;
      if (l > JOY.r) { JOY.dx *= JOY.r / l; JOY.dy *= JOY.r / l; }
      const q = document.getElementById('joyP');
      q.style.transform = `translate(${JOY.dx}px,${JOY.dy}px)`;
    } else if (e.pointerId === GIRO.id) {
      const d = dMarco(e.clientX - GIRO.px, e.clientY - GIRO.py);
      GIRO.x += d.x * 0.0060; GIRO.y += d.y * 0.0048;
      GIRO.px = e.clientX; GIRO.py = e.clientY;
    }
  });
  const suelta = e => {
    if (e.pointerId === JOY.id) {
      JOY.id = -1; JOY.dx = JOY.dy = 0; JOY.bruto = 0;
      document.getElementById('joy').style.opacity = 0;
      document.getElementById('joyP').style.transform = 'translate(0,0)';
    }
    if (e.pointerId === GIRO.id) GIRO.id = -1;
  };
  addEventListener('pointerup', suelta); addEventListener('pointercancel', suelta);

  const bt = (id, fn) => {
    const e = document.getElementById(id);
    e.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); fn(); }, { passive: false });
  };
  bt('bAtaca', () => jugPide('ataca'));
  bt('bEsq', () => jugPide('esquiva'));
  bt('bCam', () => { CAM_YAW = JUG.rumbo + Math.PI; });   // volver a poner la cámara detrás
  bt('bPausa', () => pausa(true));
}

function entradaLee() {
  let x = 0, z = 0, corre = false;
  if (JOY.id >= 0) {
    x = JOY.dx / JOY.r; z = JOY.dy / JOY.r;
    /* CORRER ES EMPUJAR MÁS ALLÁ DEL ARO, no llegar al borde. Con el umbral
       sobre el valor YA RECORTADO, un pulgar que lleva la palanca al canto
       —o sea lo normal— corre siempre y caminar deja de existir. */
    corre = (JOY.bruto || 0) > 1.30;
  } else {
    if (TECLAS.KeyW || TECLAS.ArrowUp) z -= 1;
    if (TECLAS.KeyS || TECLAS.ArrowDown) z += 1;
    if (TECLAS.KeyA || TECLAS.ArrowLeft) x -= 1;
    if (TECLAS.KeyD || TECLAS.ArrowRight) x += 1;
    corre = !!(TECLAS.ShiftLeft || TECLAS.ShiftRight);
  }
  const m = entradaMundo(x, z);
  ENT.x = m.x; ENT.z = m.z; ENT.corre = corre;
  return ENT;
}

/* ── ARRANQUE ─────────────────────────────────────────────────────────── */
function nuevaPartida(sem) {
  SEM = sem || (Date.now() & 0xffff);
  MUNDO = siembra(SEM);
  preparaChoque(MUNDO.solidos);
  armaSuelo();
  armaVegetacion(MUNDO);
  jugArranca();
  esqArranca([]);
  ZONA_ACT = 0; TALLY.golpes = 0; TALLY.dano = 0; TALLY.porCl = {}; TALLY.esquivados = 0; SANGRE = 0; SACUDE = 0; AVISO_T = 0;
  DICHO[0] = DICHO[1] = DICHO[2] = DICHO[3] = false;
  CAM_YAW = Math.PI; CAM_PIT = -0.13; CAM_D_ACT = CAM_D;
  PART = 'juego'; verPanel(null);
  /* EL MUNDO ARRANCA VACÍO Y LA PRIMERA OLEADA LA SUELTA `olaSuelta`, que es
     la misma que suelta las otras seis. Sembrando la primera acá quedarían
     dos altas con dos comportamientos: la del arranque sin aviso, sin sonido
     y sin la distancia mínima al jugador, y las demás con las tres cosas. */
  OLA.i = 0; OLA.espera = 0; OLA.hechas = 0;
  olaSuelta();
  pintaHud(true);
}
function pausa(v) {
  if (v && PART === 'juego') { PART = 'pausa'; verPanel('pPausa'); document.exitPointerLock?.(); }
  else if (!v && PART === 'pausa') { PART = 'juego'; verPanel(null); }
}
function alMenu() { PART = 'menu'; verPanel('pMenu'); document.exitPointerLock?.(); menuMundo(); }

/* ── EL MENÚ MUESTRA EL JUEGO ──────────────────────────────────────────────
   Un panel negro delante de NADA tira a la basura lo único que este menú
   tiene para enseñar: que es un bosque con esqueletos adentro. El velo del
   panel ya es un degradado —cerrado arriba y abajo, donde van el título y los
   botones, y abierto en la franja del medio— así que lo único que faltaba era
   que hubiera algo detrás. Es lo mismo que POMPOM, DASH y RezUno.
   SE SIEMBRA UNA SOLA VEZ, con semilla fija: el menú tiene que verse igual
   cada vez que se vuelve a él, y `nuevaPartida` resiembra igual.
   Y LOS ESQUELETOS NO SE MUEVEN NI PEGAN: acá se les corre la POSE y nada
   más. `esqPaso` es el que decide y hace daño, y un héroe que se muere solo
   mientras alguien mira el título no es un demo, es un defecto.            */
const MENU_SEM = 3141;
/* cinco esqueletos en arco alrededor del claro, entre cuatro y nueve metros:
   lo bastante cerca para que se les vea la silueta y lo bastante lejos para
   que no le tapen la cara al héroe. Se saltea el sitio que tenga un tronco. */
function menuEsqs() {
  const az = semilla(MENU_SEM ^ 0xBEEF), out = [], S = MUNDO ? MUNDO.solidos : [];
  const clases = ['peon', 'peon', 'lancero', 'peon', 'bruto'];
  for (let i = 0; i < clases.length; i++) {
    const cl = clases[i];
    for (let k = 0; k < 40; k++) {
      const a = (i / clases.length) * 6.283 + (az() - 0.5) * 0.9;
      const d = 4.4 + az() * 4.6;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      let choca = false;
      for (const s of S) { const R = s.r + ESQ[cl].radio; if (dist2(x, z, s.x, s.z) < R * R) { choca = true; break; } }
      if (choca) continue;
      out.push({ cl, x, z, zona: 0 }); break;
    }
  }
  return out;
}
const MENU_X = 0.64;              // a qué fracción de media pantalla cae el héroe
let MENU_LISTO = false, MENU_T = 0;
function menuMundo() {
  MENU_LISTO = true;
  MUNDO = siembra(MENU_SEM);
  preparaChoque(MUNDO.solidos);
  armaSuelo();
  armaVegetacion(MUNDO);
  jugArranca();
  /* EL MENÚ NO USA UNA OLEADA, y no es pereza: una oleada nace a diecinueve
     metros como mínimo —que es lo que la hace justa— y a diecinueve metros de
     una cámara que orbita a seis, un esqueleto son cuatro píxeles. Acá hacen
     falta cerca y en arco, que es otro problema; lo que sí comparten es el
     alta, así que nacen con su máscara de piezas y su tinte igual que en
     partida. Y NO SE MUEVEN NI PEGAN: `menuPaso` sólo les corre la pose.  */
  esqArranca(menuEsqs());
  ZONA_ACT = 0; ZONA_VIS = 0;
  JUG.x = 0; JUG.z = 0; JUG.y = H(0, 0); JUG.rumbo = 0;
}
function menuPaso(dt) {
  if (!MENU_LISTO) return;
  MENU_T += dt;
  JUG.rumbo = Math.sin(MENU_T * 0.21) * 0.5;
  poseAplica(JUG.cuerpo, 'quieto', MENU_T, null, 0, 0);
  JUG.cuerpo.raiz.position.set(JUG.x, JUG.y, JUG.z);
  JUG.cuerpo.raiz.rotation.y = JUG.rumbo;
  const cerca = esqCerca();
  for (const e of cerca) esqPose(e, dt, 99);
  kitPinta(ESQ_KIT, cerca);
  /* la cámara ORBITA despacio: una vuelta cada 78 s. Más rápido compite con
     el título, que es lo que hay que leer primero. */
  /* la cámara ORBITA despacio: una vuelta cada 78 s. Más rápido compite con
     el título, que es lo que hay que leer primero. Y va CORRIDA de costado
     para que el héroe caiga en el tercio izquierdo: la columna de botones vive
     centrada, así que un héroe en el medio queda detrás de JUGAR. */
  /* ── DÓNDE CAE EL HÉROE EN EL CUADRO SE DERIVA, NO SE TANTEA ────────────
     Con el corrimiento escrito a mano (2,3 m) quedaba en el 62 % del ancho,
     o sea DETRÁS de la fila de GRÁFICOS, que llega hasta el 74 %. Y el
     número correcto depende del campo y de la distancia, así que un metraje
     fijo se rompe en cuanto se toca cualquiera de los dos o cambia la
     proporción de la pantalla. Se elige la FRACCIÓN de media pantalla y el
     corrimiento sale de ahí: `lat = frac · tan(fov/2) · aspecto · d`.      */
  const a = MENU_T * 0.081, d = 6.3;
  const lat = MENU_X * Math.tan(cam.fov * Math.PI / 360) * cam.aspect * d;
  const lx = Math.cos(a), lz = -Math.sin(a);
  cam.position.set(JUG.x + Math.sin(a) * d - lx * lat, JUG.y + 2.20, JUG.z + Math.cos(a) * d - lz * lat);
  cam.lookAt(JUG.x - lx * lat, JUG.y + 1.05, JUG.z - lz * lat);
}

/* ── EL BUCLE ──────────────────────────────────────────────────────────────
   PASO FIJO CON INTERPOLACIÓN. Un teléfono a 30 y una notebook a 144 tienen
   que jugar el MISMO juego: con el paso variable la velocidad, el alcance del
   golpe y la ventana del combo salen distintos, y eso no es rendimiento, es
   otro juego.                                                              */
let ACUM = 0, FPS = 60, _fpsN = 0, _fpsT = 0;
function bucle() {
  requestAnimationFrame(bucle);       // primero, así una excepción no lo mata
  const dt = Math.min(0.25, reloj.getDelta());
  _fpsN++; _fpsT += dt;
  if (_fpsT > 0.5) { FPS = _fpsN / _fpsT; _fpsN = 0; _fpsT = 0; }

  try {
    /* CONGELAR ES QUE NO AVANCE NADA, no sólo la física: con las partículas y
       la cámara corriendo, la foto sale de tres cuadros después del instante
       que la sonda pidió. Se sigue DIBUJANDO, que es lo que hace falta. */
    if (PART === 'juego' && !CONGELADO) {
      ACUM += dt;
      let n = 0;
      while (ACUM >= PASO && n < PASO_MAX) { unPaso(PASO); ACUM -= PASO; n++; }
      if (n === PASO_MAX) ACUM = 0;    // no perseguir el reloj: ir en cámara lenta
    }
    if (PART === 'menu') menuPaso(dt);
    else if (!CONGELADO) { camPaso(dt, GIRO.x, GIRO.y); GIRO.x = 0; GIRO.y = 0; }
    /* el sacudón envuelve SÓLO a la cámara y no al marco: sacudiendo el marco
       aparecen dos franjas negras en los bordes */
    if (SACUDE > 0 && !CONGELADO) {
      SACUDE = Math.max(0, SACUDE - dt * 3.4);
      const s = SACUDE * SACUDE * 0.34;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      cam.position.z += (Math.random() - 0.5) * s;
    }
    SANGRE = Math.max(0, SANGRE - dt * 1.5);
    matPost.uniforms.uSangre.value = SANGRE * 0.75 + (JUG.vida < JUG.vidaMax * 0.28 && !JUG.muerto
      ? 0.10 + Math.sin(performance.now() * 0.004) * 0.05 : 0);
    matPost.uniforms.uT.value = performance.now() * 0.06;
    vegRevisaMapas();
    if (PART !== 'menu') { pintaHud(); pintaAviso(dt); dialogoPaso(dt); }
    zonaMezcla(dt);
    /* en el menú todavía no hay cuerpo: `nuevaPartida` lo crea. Sin esta
       guarda son sesenta excepciones por segundo antes de jugar. */
    if (JUG.kit && JUG.cuerpo) kitPinta(JUG.kit, [JUG]);
    ren.info.reset();
    ren.setRenderTarget(RT); ren.render(esc, cam);
    ren.setRenderTarget(null); ren.render(escPost, camPost);
  } catch (err) {
    if (!window.__errs) window.__errs = [];
    window.__errs.push('' + (err && err.message || err));
  }
}

function unPaso(dt) {
  /* ── EL FRENO DEL IMPACTO ────────────────────────────────────────────────
     Va ACÁ y no en el bucle de dibujo: así lo pagan también el auto-jugador y
     `__H.pasos()`, que es lo único que hace que las mediciones describan el
     juego que se juega. La escena se sigue dibujando —congelar el dibujo se
     lee a tirón— y lo que se detiene es el tiempo del mundo.               */
  if (HITSTOP > 0) { HITSTOP -= dt; TALLY.frenoT += dt; return; }
  jugPaso(dt, entradaLee());
  esqPaso(dt);
  zonasPaso(dt);
  if (ZONA_ACT === 2 && !DICHO[3] && esqVivos(2) <= 1) dialogoRey();
  if (PART === 'fin') { verPanel('pFin'); pintaFin(); }
}
