
/* ══════════════════════════ EL JUGADOR ══════════════════════════ */
const OJO = 1.66;
const VEL = 3.15, CORRE = 6.0;
const JUG = { x: 0, z: -MITAD + CALLE*0.5, y: 0, yaw: 0, pitch: -0.03, vx: 0, vz: 0 };
const AND = { fase: 0, v: 0, ojo: OJO, roll: 0, fov: 70, lado: 0 };

/* ── LA ALTURA DEL SUELO ──
   Un damero no necesita un mapa de alturas: o estás en la calle, o estás en la
   vereda, o estás en el pasto. Tres números y una comparación de rectángulos.
   Y hace falta que sea una función y no una constante porque el cordón mide
   quince centímetros: sin esto la cámara flota sobre la vereda o se hunde en
   ella, y en un juego en primera persona quince centímetros se ven. */
function alturaSuelo(x, z){
  for (let i = 0; i < CUADRAS; i++){
    const x0 = EJES[i] + CALLE/2;
    if (x < x0 || x > x0 + LOTE) continue;
    for (let j = 0; j < CUADRAS; j++){
      const z0 = EJES[j] + CALLE/2;
      if (z < z0 || z > z0 + LOTE) continue;
      const dentro = (x > x0 + VEREDA && x < x0 + LOTE - VEREDA &&
                      z > z0 + VEREDA && z < z0 + LOTE - VEREDA);
      return dentro ? 0.162 : 0.15;
    }
    break;
  }
  return 0;
}

/* ── EL CHOQUE ──
   Todas las cajas están alineadas a los ejes —el barrio es un damero, así que
   no hay una sola pared en diagonal— y por eso alcanza con un círculo contra un
   rectángulo. Lo que sí hace falta es no probar las MIL cajas en cada cuadro:
   se indexan por cuadra y sólo se prueban las de las cuadras de al lado.
   Y SE RESUELVE EJE POR EJE, que es lo que hace que uno se DESLICE por la pared
   en vez de quedarse clavado: empujando por el eje de menor penetración, entrar
   en diagonal a un cerco te deja caminando a lo largo del cerco. */
const REJILLA = new Map();
function claveCelda(x, z){
  return ((Math.floor((x + MITAD) / PASO)) * 97 + Math.floor((z + MITAD) / PASO));
}
function indexaColisiones(){
  for (const c of COLIS){
    const i0 = Math.floor((c.x0 + MITAD) / PASO), i1 = Math.floor((c.x1 + MITAD) / PASO);
    const j0 = Math.floor((c.z0 + MITAD) / PASO), j1 = Math.floor((c.z1 + MITAD) / PASO);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++){
      const k = i * 97 + j;
      if (!REJILLA.has(k)) REJILLA.set(k, []);
      REJILLA.get(k).push(c);
    }
  }
}
const RADIO = 0.42;
function corrige(){
  const i = Math.floor((JUG.x + MITAD) / PASO), j = Math.floor((JUG.z + MITAD) / PASO);
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++){
    const lista = REJILLA.get((i+di) * 97 + (j+dj));
    if (!lista) continue;
    for (const c of lista){
      const px = cl(JUG.x, c.x0, c.x1), pz = cl(JUG.z, c.z0, c.z1);
      const dx = JUG.x - px, dz = JUG.z - pz;
      const d2 = dx*dx + dz*dz;
      if (d2 > RADIO*RADIO) continue;
      if (d2 > 1e-8){
        const d = Math.sqrt(d2);
        JUG.x = px + dx/d*RADIO; JUG.z = pz + dz/d*RADIO;
      } else {
        /* adentro de la caja: se sale por el lado más cerca, que es lo único
           que no lo teletransporta al otro extremo del barrio */
        const iz = JUG.x - c.x0, de = c.x1 - JUG.x, ar = JUG.z - c.z0, ab = c.z1 - JUG.z;
        const m = Math.min(iz, de, ar, ab);
        if (m === iz) JUG.x = c.x0 - RADIO; else if (m === de) JUG.x = c.x1 + RADIO;
        else if (m === ar) JUG.z = c.z0 - RADIO; else JUG.z = c.z1 + RADIO;
      }
    }
  }
  JUG.x = cl(JUG.x, -MITAD + 1.2, MITAD - 1.2);
  JUG.z = cl(JUG.z, -MITAD + 1.2, MITAD - 1.2);
}

/* ── ENTRADAS ── */
const teclas = {};
let corre = false;
let linterna = null;
addEventListener('keydown', e => {
  teclas[e.code] = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') corre = true;
  if (e.code === 'KeyF') ponLinterna(!CFG.linterna);
  if (e.code === 'KeyV') ponVista(!CFG.tercera);
  if (e.code === 'Escape' && (MODO === 'juego' || MODO === 'cuarto')) pausa(!PAUSA);
  if (['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => {
  teclas[e.code] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') corre = false;
});

/* ── PC O TELÉFONO ──
   Y NO SE ADIVINA DE UNA VEZ Y PARA SIEMPRE. Chrome de Android dispara un
   `mousemove` sintético después de cada toque, así que detectando «hay ratón»
   a la primera, un teléfono pasa a modo PC y se queda sin joystick. Un
   `mousemove` sólo cuenta si movió de verdad Y si no viene pegado a un toque.
   Ya costó una vuelta en Eco. */
let esPC = !matchMedia('(pointer:coarse)').matches;
let ultimoToque = 0, mx = 0, my = 0;
function modoPC(v){
  esPC = v;
  document.body.classList.toggle('pc', v);
}
modoPC(esPC);
addEventListener('mousemove', e => {
  if (performance.now() - ultimoToque < 1200) return;
  if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
  if (!esPC) modoPC(true);
  if (MODO === 'juego' && !PAUSA && document.pointerLockElement){
    JUG.yaw -= e.movementX * 0.0022;
    JUG.pitch = cl(JUG.pitch - e.movementY * 0.0022, -1.15, 1.05);
  }
});
ren.domElement.addEventListener('click', () => {
  if (MODO === 'juego' && !PAUSA && esPC && !document.pointerLockElement)
    ren.domElement.requestPointerLock();
});

/* el joystick, a la izquierda; mirar, arrastrando en cualquier otro lado */
const movV = { x: 0, y: 0 };
let joyId = -1, mirId = -1, mirX = 0, mirY = 0, joyBruto = 0;
const jc = $('joy').querySelector('canvas'), jg = jc.getContext('2d');
/* CON EL CUADRO GIRADO, `getBoundingClientRect` DEVUELVE LA CAJA ALINEADA A LOS
   EJES, que para un joystick redondo es el cuadrado equivocado. Hay que
   deshacer la rotación a mano: es la misma corrección que costó una vuelta en
   Eco. */
function aCuadro(px, py){
  if (!GIRADO) return [px, py];
  return [(py - innerHeight/2) + W/2, H2/2 - (px - innerWidth/2)];
}
function dCuadro(dx, dy){ return GIRADO ? [dy, -dx] : [dx, dy]; }
function joyRect(){
  const e = $('joy');
  return { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight };
}
addEventListener('touchstart', ev => {
  ultimoToque = performance.now();
  if (esPC) modoPC(false);
  for (const t of ev.changedTouches){
    const [lx, ly] = aCuadro(t.clientX, t.clientY);
    const r = joyRect();
    if (joyId < 0 && lx >= r.x - 26 && lx <= r.x + r.w + 26 && ly >= r.y - 26 && ly <= r.y + r.h + 26){
      joyId = t.identifier; movJoy(lx, ly);
    } else if (mirId < 0){ mirId = t.identifier; mirX = t.clientX; mirY = t.clientY; }
  }
}, { passive: true });
addEventListener('touchmove', ev => {
  for (const t of ev.changedTouches){
    if (t.identifier === joyId){ const [lx, ly] = aCuadro(t.clientX, t.clientY); movJoy(lx, ly); }
    else if (t.identifier === mirId){
      const [dx, dy] = dCuadro(t.clientX - mirX, t.clientY - mirY);
      mirX = t.clientX; mirY = t.clientY;
      JUG.yaw -= dx * 0.0052;
      JUG.pitch = cl(JUG.pitch - dy * 0.0052, -1.15, 1.05);
    }
  }
}, { passive: true });
const suelta = ev => {
  for (const t of ev.changedTouches){
    if (t.identifier === joyId){ joyId = -1; movV.x = movV.y = 0; joyBruto = 0; }
    if (t.identifier === mirId) mirId = -1;
  }
};
addEventListener('touchend', suelta, { passive: true });
addEventListener('touchcancel', suelta, { passive: true });
function movJoy(lx, ly){
  const r = joyRect();
  const cx = r.x + r.w/2, cy = r.y + r.h/2, R = r.w * 0.40;
  let dx = (lx - cx) / R, dy = (ly - cy) / R;
  /* SE GUARDA LA DESVIACIÓN EN BRUTO ANTES DE RECORTARLA. El umbral de correr
     mira ese número: con la desviación ya recortada, llevar el pulgar al borde
     —que es lo que hace cualquiera para caminar normal— dejaría al jugador
     corriendo siempre. Correr es empujar MÁS ALLÁ del aro. */
  joyBruto = Math.hypot(dx, dy);
  if (joyBruto > 1){ dx /= joyBruto; dy /= joyBruto; }
  movV.x = dx; movV.y = dy;
}
function joyDibuja(){
  const n = 300, c = n/2, R = n/2 - 12;
  jg.clearRect(0, 0, n, n);
  jg.strokeStyle = 'rgba(160,200,240,.42)'; jg.lineWidth = 3;
  jg.beginPath(); jg.arc(c, c, R, 0, 6.283); jg.stroke();
  jg.fillStyle = 'rgba(150,195,240,.20)';
  jg.beginPath(); jg.arc(c + movV.x*R*0.55, c + movV.y*R*0.55, 40, 0, 6.283); jg.fill();
  jg.strokeStyle = 'rgba(200,226,250,.72)'; jg.lineWidth = 2.4;
  jg.beginPath(); jg.arc(c + movV.x*R*0.55, c + movV.y*R*0.55, 40, 0, 6.283); jg.stroke();
}

/* ── LA LINTERNA ──
   Un `SpotLight` colgado de la cámara. Y cuelga de la CÁMARA y no de la escena
   porque si no habría que copiarle la posición y el rumbo todos los cuadros, y
   ahí siempre queda un cuadro de atraso: la luz apuntaría a donde uno miraba
   hace dieciséis milisegundos, que se ve como que el haz «persigue» la vista. */
function ponLinterna(v){
  CFG.linterna = v;
  if (!linterna){
    linterna = new T.SpotLight(0xffeccd, 0, 34, 0.42, 0.55, 1.4);
    linterna.position.set(0.18, -0.12, 0);
    linterna.target.position.set(0, 0, -1);
    cam.add(linterna); cam.add(linterna.target);
    escena.add(cam);
  }
  linterna.intensity = v ? 34 : 0;
  $('acLinterna').classList.toggle('on', v);
  aviso(TX(v ? 'aLinternaOn' : 'aLinternaOff'));
  son('clic', 0.7);
}

/* ── LA FÍSICA ──
   Con aceleración y roce, y el roce se aplica SÓLO a la componente de costado
   mientras se pide movimiento. Sumando la aceleración al vector y topando la
   velocidad total, doblar FRENA —la velocidad vieja y la nueva se recortan
   juntas— y el tope real queda por debajo del ajuste. Es la corrección que en
   Eco convirtió el movimiento en el de un tirador. */
const ACEL = 42, ROCE = 11;
function fisica(dt){
  const ade = { x: -Math.sin(JUG.yaw), z: -Math.cos(JUG.yaw) };
  const der = { x: -ade.z, z: ade.x };
  let mx2 = 0, mz2 = 0;
  if (teclas.KeyW) mz2 += 1; if (teclas.KeyS) mz2 -= 1;
  if (teclas.KeyD) mx2 += 1; if (teclas.KeyA) mx2 -= 1;
  if (!esPC){ mx2 += movV.x; mz2 -= movV.y; }
  const m = Math.hypot(mx2, mz2);
  if (m > 1){ mx2 /= m; mz2 /= m; }
  const pide = m > 0.06;
  const rapido = corre || joyBruto > 1.32;
  const tope = (rapido ? CORRE : VEL) * (esPC ? 1 : Math.min(1, Math.max(m, 0.34)));

  const dx = ade.x*mz2 + der.x*mx2, dz = ade.z*mz2 + der.z*mx2;
  const dl = Math.hypot(dx, dz) || 1;
  const ux = dx/dl, uz = dz/dl;
  if (pide){
    const proy = JUG.vx*ux + JUG.vz*uz;
    const falta = tope - proy;
    if (falta > 0){
      const a = Math.min(ACEL*dt, falta);
      JUG.vx += ux*a; JUG.vz += uz*a;
    }
    /* el roce, sólo de costado: es lo que deja que doblar no frene */
    const lx = -uz, lz = ux;
    const lat = JUG.vx*lx + JUG.vz*lz;
    const f = lat * Math.min(1, ROCE*dt);
    JUG.vx -= lx*f; JUG.vz -= lz*f;
  } else {
    const f = Math.min(1, ROCE*dt);
    JUG.vx -= JUG.vx*f; JUG.vz -= JUG.vz*f;
  }
  JUG.x += JUG.vx*dt; JUG.z += JUG.vz*dt;
  /* EL CHOQUE Y EL SUELO SALEN DEL SITIO EN EL QUE SE ESTÁ. En la habitación no
     hay damero ni rejilla de colisiones: hay cuatro paredes y dos muebles, y el
     suelo está noventa y seis metros más arriba. Con el `corrige()` del barrio
     puesto, el recorte de `±MITAD` no molesta —el cuarto cae dentro— pero
     `alturaSuelo` devuelve cero y el jugador se cae al vacío en el primer
     cuadro. */
  if (CU.on){ corrigeCuarto(); JUG.y = CU.Y + 0.02; }
  else { corrige(); JUG.y = alturaSuelo(JUG.x, JUG.z); }
  AND.v = Math.hypot(JUG.vx, JUG.vz);
  AND.lado = (JUG.vx*der.x + JUG.vz*der.z) / (CORRE);
}

/* ── LA CÁMARA ──
   El cabeceo va atado a la DISTANCIA recorrida y no al tiempo, así que la
   pisada cae siempre en el mismo punto del paso por más que uno acelere o
   frene. Es la corrección que en Maicol convirtió veinticuatro pisadas por
   segundo superpuestas —o sea ruido blanco— en un trote. */
function ponCam(dt){
  const rapido = cl(AND.v / CORRE, 0, 1);
  const andando = cl(AND.v / VEL, 0, 1);
  const faseAnt = AND.fase;
  /* PI POR CADA 0,82 m, y no 1. La linea decia «0,82 m por medio paso» y hacia
     otra cosa: sumando `v·dt/0,82` la fase avanza UNO cada 82 cm, pero la
     pisada dispara cuando cambia `floor(fase/PI)`, o sea cada PI unidades =
     2,58 m. Con eso el jugador daba un paso cada dos metros y medio y el
     cabeceo subia y bajaba una vez cada dos metros y medio: se leia a
     deslizarse, no a caminar. Y ahora que hay un cuerpo con piernas, la
     zancada tiene que ser la de verdad o los pies patinan — que es el defecto
     que en RECREO tenia a Baldi a 2,7 metros por paso. */
  AND.fase += Math.PI * (AND.v * dt) / 0.82;   /* 0,82 m por medio paso, de verdad */
  if (AND.v > 0.5 && (MODO === 'juego' || MODO === 'cuarto') && !PAUSA){
    if (Math.floor(AND.fase / Math.PI) !== Math.floor(faseAnt / Math.PI))
      son('paso', 0.42 + rapido*0.4);
  }
  const amp = cl(andando * 1.3, 0, 1);
  const arriba = Math.abs(Math.sin(AND.fase)) * (0.030 + rapido*0.040) * amp;
  const costado = Math.cos(AND.fase) * (0.026 + rapido*0.030) * amp;
  const quieto = cl(1 - andando*1.7, 0, 1);
  const resp = Math.sin(RELOJ.value*1.15) * 0.017 * quieto;

  AND.ojo = lerp(AND.ojo, OJO, Math.min(1, dt*9));
  const objRoll = Math.cos(AND.fase) * (0.014 + rapido*0.016) * amp - AND.lado*0.05;
  AND.roll = lerp(AND.roll, objRoll, Math.min(1, dt*10));
  const objFov = 70 + rapido*7;
  AND.fov = lerp(AND.fov, objFov, Math.min(1, dt*3.2));
  if (Math.abs(cam.fov - AND.fov) > 0.02){ cam.fov = AND.fov; cam.updateProjectionMatrix(); }

  const sy = Math.sin(JUG.yaw), cy = Math.cos(JUG.yaw);

  /* ── ¿HAY LUGAR PARA LA CÁMARA AL HOMBRO? ──
     Esto se decide ANTES de todo lo demás, porque si no lo hay la vista tiene
     que ser primera persona ENTERA: el balanceo, la altura del ojo y —sobre
     todo— la cabeza achicada.

     EL DEFECTO QUE ARREGLA, Y NO SE VE COMO UN DEFECTO DE CÁMARA: pegado a una
     pared el recorte devolvía distancia CERO, o sea la cámara exactamente en la
     cabeza… con la cabeza dibujada a tamaño real, porque en tercera persona no
     se achica. Lo que se ve entonces es el INTERIOR del propio cráneo llenando
     el cuadro, y desde afuera eso se lee a «el personaje no tiene cabeza».
     En el cuarto pasaba SIEMPRE: mide 5,2 × 6,8 m y la cámara pide 1,55 m hacia
     atrás, así que no hay un solo sitio donde entre.

     Y EL CUARTO VA EN PRIMERA Y PUNTO. No es sólo que no entre: son cuatro
     metros y medio de caminata hasta una ventana, y lo único que esa escena
     tiene que mostrar es lo que se ve por ella — con la cámara detrás, lo que se
     mira desde la ventana es la propia nuca.

     LA HISTÉRESIS NO ES UN LUJO: sin ella, caminando pegado a una cerca la
     vista salta entre primera y tercera varias veces por segundo, y eso se ve
     peor que cualquiera de las dos. */
  let libre = CAM3_DIST;
  if (CFG.tercera && !CU.on){
    const s0 = -sy, c0 = -cy;
    const dx = -c0, dz = s0;               /* la derecha del cuerpo */
    const cp0 = Math.cos(JUG.pitch);
    const ox0 = JUG.x + dx*CAM3_LADO, oz0 = JUG.z + dz*CAM3_LADO;
    for (let k = 1; k <= 8; k++){
      const t = CAM3_DIST * k / 8;
      if (!camLibre(ox0 - s0*cp0*t, oz0 - c0*cp0*t)){ libre = CAM3_DIST * (k-1) / 8; break; }
    }
  }
  CAM3.libre = libre;
  CAM3.apretada = CU.on || (CAM3.apretada ? libre < CAM3_VUELVE : libre < CAM3_MIN);
  const tercera = CFG.tercera && !CAM3.apretada;

  /* ── LA TERCERA PERSONA ──
     LA ROTACIÓN NO SE TOCA: la cámara se queda mirando exactamente para donde
     miraba en primera y lo único que cambia es DÓNDE está. Componer un `lookAt`
     acá sería reabrir la trampa que ya costó una vuelta en la cinemática —cerca
     de los noventa grados de cabeceo, un grado de guiñada se convierte en
     decenas de grados de alabeo— y además garantiza que apuntar se sienta igual
     en las dos vistas, porque la dirección de la mirada es la misma cuenta.

     Y EL CABECEO DEL PASO SE ACHICA A UN TERCIO. En primera el balanceo ES la
     caminata; en tercera la caminata ya se ve en las piernas del personaje, y
     el mismo balanceo aplicado a una cámara que está a tres metros se lee a que
     tiembla el pulso de quien filma. */
  const bob = tercera ? 0.35 : 1;
  const ojoY = JUG.y + AND.ojo + arriba*bob + resp*bob;
  cam.rotation.set(JUG.pitch + Math.sin(AND.fase*2)*0.004*amp*bob, JUG.yaw, AND.roll*bob);
  if (!tercera){
    CAM3.d = 0;   /* la camara ESTA en el ojo: al volver a tercera sale de ahi */
    cam.position.set(JUG.x + cy*costado, ojoY, JUG.z - sy*costado);
    return;
  }
  /* de tres cuartos por detrás y no justo atrás: de frente al eje del cuerpo,
     las piernas se tapan entre ellas y la zancada casi no se lee — es lo que se
     midió cuando la cinemática tenía su plano de seguimiento. */
  const ade = { x: -sy, z: -cy };
  const der = { x: -ade.z, z: ade.x };
  const cp = Math.cos(JUG.pitch);
  const dir = { x: ade.x*cp, y: Math.sin(JUG.pitch), z: ade.z*cp };
  const ox = JUG.x + der.x*CAM3_LADO, oz = JUG.z + der.z*CAM3_LADO;
  const oy = ojoY + CAM3_ALTO;
  /* ── Y NO ATRAVIESA PAREDES ── el recorte se marchó más arriba, porque de él
     depende también si la vista puede ser de tercera. */
  CAM3.d = lerp(CAM3.d, libre, Math.min(1, dt*14));
  cam.position.set(ox - dir.x*CAM3.d, oy - dir.y*CAM3.d, oz - dir.z*CAM3.d);
}
/* ── AL HOMBRO, Y NO EN TERCERA PERSONA ──
   Pedido: *«yo quería la cámara al hombro, no en tercera persona; no tan al
   hombro, que en la parte derecha se vea un poco el personaje»*. Son dos cosas
   distintas y las dos son números:

   · TRES METROS ES TERCERA PERSONA. A esa distancia el personaje entra entero y
     el juego pasa a ser sobre él; al hombro es un metro y medio, donde lo que se
     ve es la espalda y el mundo por encima de ella.
   · Y EL LADO CAMBIA DE SIGNO. Con la cámara corrida a la DERECHA del cuerpo, el
     cuerpo queda a la izquierda del cuadro. Para que se vea «en la parte
     derecha» hay que correr la cámara a la IZQUIERDA. Con 1,45 de distancia y
     0,62 de costado, el eje del cuerpo cae a atan(0,62/1,55) = 21,8 grados del
     centro; con 56 grados de medio campo horizontal eso lo deja cerca del 70 %
     del ancho — o sea a la derecha de verdad, y sin comerse el cuadro. */
const CAM3_DIST = 1.55, CAM3_LADO = -0.62, CAM3_ALTO = 0.26;
/* Y UN PISO: POR DEBAJO DE ESTO LA CÁMARA ESTÁ ADENTRO DEL CUERPO. La cabeza
   vive en y = 1,50 y mide unos once centímetros de radio, así que a menos de
   medio metro del hombro el lente queda dentro del cráneo o de la mochila. Con
   `CAM3_VUELVE` más arriba que `CAM3_MIN` hay histéresis y la vista no parpadea
   al rozar una cerca. */
const CAM3_MIN = 0.62, CAM3_VUELVE = 0.85;
const CAM3 = { d: CAM3_DIST, libre: CAM3_DIST, apretada: false };
/* ¿se puede poner la cámara acá? Reusa la MISMA rejilla de colisiones que el
   cuerpo: una segunda lista de paredes sólo para la cámara se desincroniza el
   día que se agregue un obstáculo. */
function camLibre(x, z){
  if (CU.on) return x > CU.X0 + 0.25 && x < CU.X1 - 0.25 &&
                    z > CU.Z0 + 0.25 && z < CU.Z1 - 0.25;
  if (Math.abs(x) > MITAD - 0.6 || Math.abs(z) > MITAD - 0.6) return false;
  const i = Math.floor((x + MITAD) / PASO), j = Math.floor((z + MITAD) / PASO);
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++){
    const lista = REJILLA.get((i+di) * 97 + (j+dj));
    if (!lista) continue;
    for (const c of lista)
      if (x > c.x0 - 0.28 && x < c.x1 + 0.28 && z > c.z0 - 0.28 && z < c.z1 + 0.28) return false;
  }
  return true;
}

/* ¿el personaje se dibuja como en primera persona? Tres cosas dicen que sí y
   una sola de ellas es la preferencia del jugador: la vista elegida, estar en el
   cuarto, y que la cámara al hombro no tenga lugar. Va en una función y no
   repetida en los tres sitios que la usan — repartida, el próximo sitio que se
   agregue va a dibujar la cabeza donde no va. */
function vistaFP(){ return !CFG.tercera || CU.on || CAM3.apretada; }

/* ── EL CAMBIO DE VISTA ── */
function ponVista(v){
  CFG.tercera = !!v;
  CAM3.d = CAM3_DIST;
  $('acVista').classList.toggle('on', CFG.tercera);
  if (PJ.ok){ PJ.primeraPersona = null; ponPersonaje(JUG.x, JUG.z, JUG.yaw, JUG.y, vistaFP()); }
  aviso(TX(CFG.tercera ? 'aTercera' : 'aPrimera'));
  son('clic', 0.7);
  try { localStorage.setItem('barrio_vista', CFG.tercera ? '3' : '1'); } catch(e){}
}

/* ── EL AVISO DE UNA LÍNEA ── */
let _avisoT = null;
function aviso(txt, ms){
  const e = $('aviso');
  e.textContent = txt; e.classList.add('on');
  clearTimeout(_avisoT);
  _avisoT = setTimeout(() => e.classList.remove('on'), ms || 1700);
}

/* ── EN QUÉ ESQUINA ESTÁS ──
   El barrio es un damero de calles con nombre, así que la única información de
   posición que sirve es la de siempre: en qué cruce estás. Y sale de los
   mismos `EJES` que construyeron el barrio, no de una tabla aparte que habría
   que mantener sincronizada. */
let _calleAnt = '';
function ponCalle(){
  let mi = 0, mj = 0, dmi = 1e9, dmj = 1e9;
  for (let i = 0; i < EJES.length; i++){
    const a = Math.abs(JUG.x - EJES[i]); if (a < dmi){ dmi = a; mi = i; }
    const b = Math.abs(JUG.z - EJES[i]); if (b < dmj){ dmj = b; mj = i; }
  }
  const t = TXF('calle', TX('ns')[mi], TX('ew')[mj]);
  if (t !== _calleAnt){ _calleAnt = t; $('calle').textContent = t; }
}
