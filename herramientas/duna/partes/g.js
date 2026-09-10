/* ══════════════════════════════════════════════════════════════════════════
   EL CIELO Y EL FONDO
   ──────────────────────────────────────────────────────────────────────────
   TODO ES SILUETA Y UN SOLO COLOR POR CAPA. Lo que hace que este estilo se
   lea no son los detalles: es que cada plano sea UNA mancha plana y que los
   planos se distingan solo por el valor. Una montana con textura, con luz o
   con dos tonos deja de ser un plano y pasa a ser un dibujo.

   Y LAS CAPAS SE REPITEN POR MODULO. Sin eso, seis mil metros de partida
   piden una lista de cientos de crestas; con modulo sobre un periodo mas
   ancho que la pantalla la costura no cae nunca adentro del cuadro.      */

/* el perfil de una cadena: tres senos de periodos que no son multiplos entre
   si. Con uno solo la cordillera es una ondulacion y se lee a fondo de
   pantalla; con tres nunca se repite igual dentro de una vista.          */
const MONT = [
  { par: 0.10, per: 190, alt: 0.30, base: 0.30, k: 0.82 },
  { par: 0.20, per: 128, alt: 0.22, base: 0.21, k: 0.62 },
  { par: 0.34, per: 82,  alt: 0.15, base: 0.13, k: 0.42 },
];
function montY(m, x) {
  const u = x / m.per;
  return m.base + m.alt * (0.55 * Math.sin(u * 6.2832)
    + 0.30 * Math.sin(u * 2.618 * 6.2832 + 1.7)
    + 0.15 * Math.sin(u * 5.236 * 6.2832 + 4.1));
}

/* las estrellas viven en una reja fija con un desvio por celda: asi son
   siempre las mismas —una constelacion que se reconoce— y no hace falta
   guardar una lista */
function pintaEstrellas(al) {
  if (al < 0.02) return;
  ctx.fillStyle = 'rgba(255,255,255,' + (al * 0.9).toFixed(3) + ')';
  const off = CAM.x * 0.02;
  for (let i = 0; i < 90; i++) {
    const a = azarFijo(i * 3 + 1), b = azarFijo(i * 3 + 2), c = azarFijo(i * 3 + 3);
    let px = ((a * 1400 - off) % 1400 + 1400) % 1400 - 200;
    if (px < -8 || px > ANCHO + 8) continue;
    const py = b * ALTO * 0.55;
    const r = 0.5 + c * 1.1;
    ctx.globalAlpha = al * (0.35 + c * 0.65);
    ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
/* un azar determinista por indice: la misma constelacion en cada partida y
   en cada aparato, sin guardar nada */
function azarFijo(i) { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }

/* ── EL ASTRO ─────────────────────────────────────────────────────────────
   Uno solo, recorriendo el cielo con la hora, y `PAL.luna` decide si lleva
   el mordisco. Dos astros a la vez —sol y luna— obligan a decidir cual se
   ve en cada momento y a cruzarlos; con uno, la hora ya lo dice todo.
   EL HALO VA ANTES QUE EL DISCO y es de radio ocho veces mayor: es lo unico
   que tine el cielo alrededor del sol, y es la mitad de la iluminacion. */
function pintaAstro(h) {
  const u = ((h % 1) + 1) % 1;
  const ax = ANCHO * (0.10 + 0.80 * u);
  const ay = ALTO * (0.62 - 0.50 * Math.sin(u * Math.PI));
  const r = ALTO * 0.055;
  const g = ctx.createRadialGradient(ax, ay, r * 0.4, ax, ay, r * 8.5);
  g.addColorStop(0, rgb(PAL.ha, 0.50));
  g.addColorStop(0.35, rgb(PAL.ha, 0.16));
  g.addColorStop(1, rgb(PAL.ha, 0));
  ctx.fillStyle = g;
  ctx.fillRect(ax - r * 8.5, ay - r * 8.5, r * 17, r * 17);
  ctx.fillStyle = rgb(PAL.as);
  ctx.beginPath(); ctx.arc(ax, ay, r, 0, 6.2832); ctx.fill();
  if (PAL.luna > 0.02) {
    /* el mordisco se pinta con el color del CIELO de esa altura y no con
       negro: con negro la luna queda con un agujero en vez de una fase */
    ctx.globalAlpha = PAL.luna;
    ctx.fillStyle = rgb(mezclaC(PAL.ca, PAL.cb, clamp(ay / ALTO, 0, 1)));
    ctx.beginPath(); ctx.arc(ax + r * 0.52, ay - r * 0.24, r * 0.92, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
  }
  return { x: ax, y: ay, r };
}
const _mc = [0, 0, 0];
function mezclaC(a, b, t) { _m3(_mc, a, b, t); return _mc; }

/* las nubes son bandas horizontales con los cantos redondeados: en silueta
   una nube no tiene volumen, tiene CONTORNO, y lo que la hace nube es que
   sea mas ancha que alta y que tenga tres o cuatro bultos */
/* ── LAS NUBES ────────────────────────────────────────────────────────────
   CUATRO CIRCULOS SEPARADOS NO SON UNA NUBE: son cuatro circulos, y peor, en
   un solo path `arc` une el final de uno con el principio del siguiente con
   una RECTA — o sea que lo que se dibujaba era una pesa. Medido en la
   captura: dos discos unidos por una barra horizontal, tres veces en el
   cielo. Lo que hace una nube es la UNION de bultos que se pisan: base de
   fondo plano y cinco jorobas encima separadas menos que su radio, cada una
   en su propio subcamino para que el relleno tome la union y no las cuerdas.
   Y el fondo plano no es un detalle: una nube redonda flota como un globo. */
function pintaNubes(al) {
  if (al < 0.02) return;
  ctx.globalAlpha = al;
  for (let i = 0; i < 7; i++) {
    const a = azarFijo(100 + i * 5), b = azarFijo(101 + i * 5), c = azarFijo(102 + i * 5);
    const par = 0.05 + b * 0.05;
    const px = ((a * 1700 - CAM.x * par) % 1700 + 1700) % 1700 - 300;
    if (px < -320 || px > ANCHO + 60) continue;
    const py = ALTO * (0.07 + b * 0.26), w = ALTO * (0.22 + c * 0.34), hh = w * 0.19;
    ctx.fillStyle = rgb(PAL.cb, 0.14 + c * 0.09);
    ctx.beginPath();
    ctx.moveTo(px + w, py);
    ctx.ellipse(px + w * 0.5, py - hh * 0.35, w * 0.5, hh * 0.62, 0, 0, 6.2832);
    for (let k = 0; k < 5; k++) {
      const t = 0.14 + (k / 4) * 0.72;
      const r = hh * (0.72 + 0.55 * Math.sin(t * 3.4 + i * 2.1));
      const cx = px + w * t, cy = py - hh * (0.30 + 0.62 * Math.sin(t * Math.PI));
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, 6.2832);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function pintaFondo(h) {
  const g = ctx.createLinearGradient(0, 0, 0, ALTO);
  g.addColorStop(0, rgb(PAL.ca));
  g.addColorStop(0.62, rgb(PAL.cb));
  g.addColorStop(1, rgb(mezclaC(PAL.cb, PAL.su, 0.32)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO, ALTO);

  pintaEstrellas(PAL.es);
  pintaAstro(h);
  pintaNubes(1 - PAL.es * 0.7);

  /* LAS TRES CADENAS. El horizonte de cada una se ancla al terreno con su
     propio parallax vertical: sin eso, bajando una ladera de seiscientos
     metros las montanas se quedan arriba y el mundo se parte en dos. */
  const base = sy(terrY(CAM.x + VISTA_ANCHO * RIDER_X));
  for (let i = 0; i < MONT.length; i++) {
    const m = MONT[i];
    const yb = ALTO - (ALTO - base) * (0.20 + m.par * 1.4) - ALTO * m.base;
    ctx.fillStyle = capaColor(m.k);
    ctx.beginPath();
    ctx.moveTo(-2, ALTO + 2);
    const paso = 7;
    for (let px = -2; px <= ANCHO + paso; px += paso) {
      const wx = CAM.x + px / ESC;
      ctx.lineTo(px, yb - ALTO * (montY(m, wx * m.par * 5) - m.base));
    }
    ctx.lineTo(ANCHO + 2, ALTO + 2); ctx.closePath(); ctx.fill();
  }
}
