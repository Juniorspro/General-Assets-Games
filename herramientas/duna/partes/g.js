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

  /* ── LOS RAYOS ─────────────────────────────────────────────────────────
     SOLO CON EL ASTRO BAJO, y no es un gusto: un sol en el cenit tira rayos
     que salen para todos lados y no se leen; uno rozando el horizonte los
     abre en abanico contra el cielo, que es la imagen del amanecer. `bajo`
     sale de la propia altura del astro, asi que aparecen y se van solos con
     la hora sin una segunda cuenta que mantener.
     Y VAN EN ABANICO HACIA ABAJO: hacia arriba el cielo esta vacio y la cuna
     se lee a rayo de linterna; hacia el horizonte cruza las cadenas, que es
     donde un rayo se nota.                                                */
  const bajo = clamp((ay / ALTO - 0.30) / 0.30, 0, 1);
  if (bajo > 0.02) {
    const nr = 7, R0 = azarFijo;
    ctx.save(); ctx.translate(ax, ay);
    for (let i = 0; i < nr; i++) {
      const sm = R0(200 + i * 3);
      const a2 = 1.5708 + (((i + 0.5) / nr) - 0.5) * 2 * 1.22 + (sm - 0.5) * 0.20;
      const an = 0.022 + R0(201 + i * 3) * 0.040;
      const lg = ALTO * (0.62 + R0(202 + i * 3) * 0.85);
      /* dos cunas, una ancha y floja debajo de una angosta: con una sola el
         canto de la cuna se ve como una linea recta y el rayo se lee a papel
         recortado. Con dos, el ancho cae en dos escalones.                */
      for (const [mu, ma] of [[2.6, 0.42], [1, 1]]) {
        const rg = ctx.createLinearGradient(0, 0, Math.cos(a2) * lg, Math.sin(a2) * lg);
        rg.addColorStop(0, rgb(PAL.ha, 0));
        rg.addColorStop(0.16, rgb(PAL.ha, +(0.115 * ma * bajo).toFixed(3)));
        rg.addColorStop(0.50, rgb(PAL.ha, +(0.052 * ma * bajo).toFixed(3)));
        rg.addColorStop(1, rgb(PAL.ha, 0));
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a2 - an * mu) * lg, Math.sin(a2 - an * mu) * lg);
        ctx.lineTo(Math.cos(a2 + an * mu) * lg, Math.sin(a2 + an * mu) * lg);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

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
function caminoNube(px, py, w, hh, i) {
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
}
/* EL CANTO ENCENDIDO VA DEBAJO Y CORRIDO HACIA EL ASTRO, no encima. Pintado
   encima taparia la nube entera; pintado debajo y corrido, lo unico que
   asoma es la franja del lado de la luz — que es exactamente lo que hace un
   sol bajo contra una nube, y es la diferencia entre una mancha y una nube.
   Y la nube de arriba es translucida, asi que ademas TINE el cuerpo hacia el
   color del halo en vez de dejarlo del color del cielo.                   */
function pintaNubes(al, ast) {
  if (al < 0.02) return;
  ctx.globalAlpha = al;
  for (let i = 0; i < 7; i++) {
    const a = azarFijo(100 + i * 5), b = azarFijo(101 + i * 5), c = azarFijo(102 + i * 5);
    const par = 0.05 + b * 0.05;
    const px = ((a * 1700 - CAM.x * par) % 1700 + 1700) % 1700 - 300;
    if (px < -320 || px > ANCHO + 60) continue;
    const py = ALTO * (0.07 + b * 0.26), w = ALTO * (0.22 + c * 0.34), hh = w * 0.19;
    if (ast) {
      const cx = px + w * 0.5;
      const dx = (ast.x > cx ? 1 : -1) * hh * 0.46;
      const dy = (ast.y > py ? 1 : -1) * hh * 0.38;
      ctx.save(); ctx.translate(dx, dy);
      caminoNube(px, py, w, hh, i);
      ctx.fillStyle = rgb(PAL.ha, 0.30 + c * 0.16);
      ctx.fill();
      ctx.restore();
    }
    caminoNube(px, py, w, hh, i);
    ctx.fillStyle = rgb(PAL.cb, 0.20 + c * 0.12);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ── LA BANDADA ───────────────────────────────────────────────────────────
   Lo unico que se mueve en el cielo de este juego. En un estilo de siluetas
   planas un pajaro es DOS CURVAS y nada mas: cuerpo no tiene, alas si.

   VAN EN BANDADA Y NO SUELTOS. Un pajaro solo en un cielo enorme se lee a
   mota de suciedad; tres o cuatro alrededor de uno que va adelante se leen
   a bandada de una ojeada, sin que nadie tenga que mirar de cerca.

   Y EL ALETEO SALE DEL RELOJ Y EL SITIO DE `CAM.x`: la posicion tiene que
   ir con el mundo —si no, la bandada viaja pegada a la camara y no sale
   nunca del cuadro, que es el defecto que ya costo una vuelta con los
   pajaros de Maicol— y el aleteo no, porque un pajaro bate las alas aunque
   el jugador este quieto.                                                 */
const AVES_N = 3;
function pintaAves(al) {
  if (al < 0.03) return;
  ctx.strokeStyle = rgb(PAL.si, +(al * 0.74).toFixed(3));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let f = 0; f < AVES_N; f++) {
    const a = azarFijo(300 + f * 4), b = azarFijo(301 + f * 4), c = azarFijo(302 + f * 4);
    const par = 0.035 + b * 0.055;
    /* el periodo es mas ancho que la pantalla: asi la costura de la vuelta
       no cae nunca adentro del cuadro */
    const fx = ((a * 2300 - CAM.x * par - TIEMPO * (9 + c * 7)) % 2300 + 2300) % 2300 - 340;
    if (fx < -300 || fx > ANCHO + 80) continue;
    const fy = ALTO * (0.08 + b * 0.22);
    const es = 0.55 + c * 0.75;                       // el tamano es la distancia
    const n = 4 + ((a * 7) | 0) % 3;
    ctx.lineWidth = Math.max(1, 1.5 * es);
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      /* la V: el que va adelante y los demas abriendose hacia atras */
      const lado = k === 0 ? 0 : (k % 2 ? 1 : -1);
      const paso = ((k + 1) / 2) | 0;
      const x = fx + paso * 15 * es, y = fy + lado * paso * 7 * es;
      const w = 5.6 * es;
      /* LAS PUNTAS VAN ARRIBA Y EL CUERPO ABAJO, y eso no es un detalle: con
         las puntas por debajo el trazo se cierra en un arco y lo que se ve es
         una sonrisa, no un pajaro. Medido en la captura apaisada — las seis
         marcas salian como parentesis. La «m» sale de que los puntos de
         control caigan POR DEBAJO de la linea del cuerpo.                   */
      /* el aleteo no puede llegar a cero: un pajaro con las alas planas es una
         raya, y medido en la captura dos de los cinco salian asi. Va con piso.  */
      const d = w * 0.58 * (0.62 + 0.38 * Math.sin(TIEMPO * (6.2 + c * 2.4) + k * 0.9 + f * 2.3));
      /* LO QUE HACE QUE SE LEA A PAJARO ES LA MUESCA DEL MEDIO, no que las
         puntas esten arriba. Con los puntos de control POR DEBAJO de la cuerda
         las dos mitades se funden en un solo arco y sale un cuenco — medido en
         la captura apaisada, seis marcas que parecian parentesis. Con los
         controles POR ENCIMA cada ala se arquea y el cuerpo queda como un
         vertice entre las dos.                                              */
      ctx.moveTo(x - w, y - d * 0.55);
      ctx.quadraticCurveTo(x - w * 0.50, y - d * 1.90, x, y);
      ctx.quadraticCurveTo(x + w * 0.50, y - d * 1.90, x + w, y - d * 0.55);
    }
    ctx.stroke();
  }
}

/* ── LA FUGAZ ─────────────────────────────────────────────────────────────
   SOLO DE NOCHE Y SOLO A VECES. Una estrella fugaz permanente deja de ser un
   acontecimiento; una cada tanto es lo unico que hace que el cielo de noche
   valga mirarlo. El ciclo se calcula del reloj, asi que no guarda estado y
   sale igual despues de una pausa.                                        */
function pintaFugaz(al) {
  if (al < 0.35) return;
  const per = 11.5, u = (TIEMPO % per) / per;
  if (u > 0.11) return;
  const k = u / 0.11, ciclo = (TIEMPO / per) | 0;
  const a = azarFijo(500 + ciclo * 3), b = azarFijo(501 + ciclo * 3);
  const x0 = ANCHO * (0.12 + a * 0.70), y0 = ALTO * (0.04 + b * 0.22);
  const lg = ALTO * 0.34, dx = lg * 0.86, dy = lg * 0.50;
  const x = x0 + dx * k, y = y0 + dy * k;
  /* entra y se va: un trazo de alfa constante se lee a raya pintada */
  const op = Math.sin(k * Math.PI) * al * 0.85;
  const cola = lg * 0.30;
  const g2 = ctx.createLinearGradient(x - dx * 0.30, y - dy * 0.30, x, y);
  g2.addColorStop(0, 'rgba(255,255,255,0)');
  g2.addColorStop(1, 'rgba(255,255,255,' + op.toFixed(3) + ')');
  ctx.strokeStyle = g2; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - dx * 0.30, y - dy * 0.30);
  ctx.lineTo(x, y);
  ctx.stroke();
  void cola;
}

function pintaFondo(h) {
  const g = ctx.createLinearGradient(0, 0, 0, ALTO);
  g.addColorStop(0, rgb(PAL.ca));
  g.addColorStop(0.62, rgb(PAL.cb));
  g.addColorStop(1, rgb(mezclaC(PAL.cb, PAL.su, 0.32)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO, ALTO);

  pintaEstrellas(PAL.es);
  pintaFugaz(PAL.es);
  const ast = pintaAstro(h);
  pintaNubes(1 - PAL.es * 0.7, ast);
  /* las aves se van con la noche: de noche una silueta oscura sobre un cielo
     oscuro no existe, y lo unico que se veria es que algo parpadea.       */
  pintaAves(1 - PAL.es);

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
