/* ══════════════════════════════════════════════════════════════════════════
   EL LIENZO, EL MARCO Y LA CAMARA
   ══════════════════════════════════════════════════════════════════════════ */
const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d', { alpha: false });
const marco = document.getElementById('marco');
let ANCHO = 0, ALTO = 0, ESC = 1, VISTA_ALTO = 0, PXR = 1;

/* ── EL MARCO SE GIRA, NO SE ENCOGE ───────────────────────────────────────
   Y la relacion no es 16:9 fija: se toma el lado largo contra el corto de la
   pantalla que haya, topada en 2,2. Con una relacion clavada, un telefono muy
   alargado deja dos franjas negras y uno cuadrado recorta el juego.       */
function ajustaMarco() {
  const W = window.innerWidth, H = window.innerHeight;
  const largo = Math.max(W, H), corto = Math.min(W, H);
  const rel = clamp(largo / corto, 1.35, 2.30);
  const girar = H > W;
  const mw = girar ? corto * rel : W, mh = girar ? corto : H;
  const a = Math.min(girar ? H : W, mw), b = a / rel;
  marco.style.width = a + 'px'; marco.style.height = b + 'px';
  marco.style.transform = 'translate(-50%,-50%)' + (girar ? ' rotate(90deg)' : '');
  document.documentElement.style.setProperty('--mh', b + 'px');
  document.documentElement.style.setProperty('--mw', a + 'px');

  /* LA RESOLUCION SE TOPA EN 2. Un teléfono de densidad 3 pide 2,25 veces mas
     pixeles que uno de 2 para dibujar siluetas planas sin un solo detalle
     fino: es relleno regalado. Ya costo la mitad de los cuadros en MAICOL. */
  PXR = Math.min(window.devicePixelRatio || 1, 2) * CAL_PX[CAL];
  ANCHO = Math.round(a); ALTO = Math.round(b);
  lienzo.width = Math.round(ANCHO * PXR); lienzo.height = Math.round(ALTO * PXR);
  ctx.setTransform(PXR, 0, 0, PXR, 0, 0);
  ESC = ANCHO / VISTA_ANCHO;
  VISTA_ALTO = ALTO / ESC;
}

/* ── LA CAMARA ────────────────────────────────────────────────────────────
   Guarda el borde de ABAJO A LA IZQUIERDA de lo que se ve, en metros. Asi la
   proyeccion es una resta y una multiplicacion, y no hay que acordarse de
   ningun centro.
   EL EJE VERTICAL SE SUAVIZA MUCHO MAS QUE EL HORIZONTAL (0,42 s contra
   0,10): la ladera baja sin parar, asi que una camara que copie la altura
   deja el mundo quieto y al rider clavado; con retraso, subir una duna se ve
   como subir. Lo horizontal, en cambio, tiene que ser firme o el aviso que
   da el adelanto se convierte en un vaiven.                               */
const CAM_ALTO_F = 0.42;    // el rider al 42% desde abajo: hay mas cielo que suelo
const CAM = { x: 0, y: 0, sac: 0, sacF: 0 };
function camReinicia() {
  CAM.x = R.x - VISTA_ANCHO * RIDER_X;
  CAM.y = Math.min(R.y - VISTA_ALTO * CAM_ALTO_F, camAbajo() - VISTA_ALTO * 0.07);
  CAM.sac = 0; CAM.sacF = 0;
}
/* ── Y BAJA CUANDO EL SUELO SE CAE, que no es un capricho de encuadre ─────
   Con la altura atada SOLO al rider, una ladera empinada hace que el suelo se
   vaya por el borde de abajo del cuadro: medido, a partir de una pendiente de
   0,33 el ultimo tercio de la pantalla queda sin suelo dibujado y por el
   agujero se ve la cadena de montanas —o sea que abajo a la derecha aparece
   cielo—. Y antes que feo es injusto: el jugador deja de ver donde va a caer.
   Se muestrea el terreno por delante y la camara baja lo necesario para que
   el punto mas bajo entre en el cuadro, con el rider subiendo en la pantalla.
   El tope del 78% existe porque si no, un vuelo alto sobre un valle profundo
   se lleva al rider fuera del cuadro por arriba.                          */
function camAbajo() {
  let bajo = R.y;
  for (let i = 1; i <= 5; i++) {
    const px = R.x + VISTA_ANCHO * (1 - RIDER_X) * (i / 5);
    if (hayPiso(px)) { const y = terrY(px); if (y < bajo) bajo = y; }
  }
  return bajo;
}
function camPaso(dt) {
  const ox = R.x - VISTA_ANCHO * RIDER_X + CAM_ADEL * R.s;
  let oy = Math.min(R.y - VISTA_ALTO * CAM_ALTO_F, camAbajo() - VISTA_ALTO * 0.07);
  oy = Math.max(oy, R.y - VISTA_ALTO * 0.78);
  CAM.x = mezcla(CAM.x, ox, 1 - Math.pow(0.0001, dt));
  CAM.y = mezcla(CAM.y, oy, 1 - Math.pow(0.10, dt));
  /* el sacudon del aterrizaje: un impulso que decae, no un seno que dura */
  CAM.sac = Math.max(CAM.sac, R.sacude);
  CAM.sac *= Math.pow(0.0009, dt);
  CAM.sacF += dt * 46;
}
const sx = x => (x - CAM.x) * ESC;
const sy = y => ALTO - (y - CAM.y) * ESC;
