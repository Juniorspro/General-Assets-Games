/* ══════════════════════════════════════════════════════════════════════════
   EL TERRENO DIBUJADO, LOS HUECOS, LAS CUERDAS Y LAS MONEDAS
   ──────────────────────────────────────────────────────────────────────────
   EL SUELO ES LO CLARO Y LO QUE HAY ENCIMA ES LO OSCURO, al reves de lo que
   uno escribiria. Es la inversion que define el estilo: la duna devuelve la
   luz del cielo y todo lo que se apoya en ella —el rider, un cactus, un
   poste— se recorta en negro. Con el suelo oscuro y los props claros la
   misma escena se lee a nocturno generico.                                */

/* el canto: dos o tres pixeles de la silueta sobre el borde del terreno. Es
   lo unico que separa la duna de la cadena de montanas que tiene detras, y
   es lo que le da el filo de arte vectorial — sin el, el borde es el
   antialias del relleno y la duna parece dibujada con aerografo.         */
/* Y NO ES TINTA NEGRA. Con el canto en silueta pura y dos pixeles y medio, la
   tabla del rider —que es de ese mismo color y mide dos pixeles— desaparece
   dentro de la linea del suelo: medido en la captura, el rider se leia
   corriendo sin tabla. Un tono intermedio separa igual la duna de la cadena
   de atras y deja que lo que se APOYA en ella se siga viendo. */
const CANTO = 1.7;
const CANTO_K = 0.62;   // cuanto se mezcla el suelo hacia la silueta

function pintaTerreno() {
  const paso = 3;                       // en pixeles de pantalla
  const x0 = CAM.x - 2 / ESC, x1 = CAM.x + VISTA_ANCHO + 4 / ESC;
  const g = ctx.createLinearGradient(0, sy(terrY(CAM.x + VISTA_ANCHO * 0.5)), 0, ALTO);
  g.addColorStop(0, rgb(PAL.su));
  g.addColorStop(1, rgb(mezclaC(PAL.su, PAL.si, 0.30)));

  /* SE DIBUJA POR TRAMOS CON PISO. Un solo path que baje al fondo dentro del
     hueco deja el vacio pintado del color de la arena; partido, el hueco es
     literalmente un sitio donde no se dibuja nada y se ve el cielo.      */
  let ini = null;
  const cierra = (a, b) => {
    ctx.beginPath();
    ctx.moveTo(sx(a), ALTO + 3);
    for (let x = a; x <= b; x += paso / ESC) ctx.lineTo(sx(x), sy(terrY(x)));
    ctx.lineTo(sx(b), sy(terrY(b)));
    ctx.lineTo(sx(b), ALTO + 3);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    /* el canto va como trazo sobre el mismo borde, no como un segundo path:
       recalculandolo se separa medio pixel del relleno y aparece una linea
       de cielo entre los dos */
    ctx.beginPath();
    for (let x = a; x <= b; x += paso / ESC) ctx.lineTo(sx(x), sy(terrY(x)));
    ctx.lineTo(sx(b), sy(terrY(b)));
    ctx.strokeStyle = rgb(mezclaC(PAL.su, PAL.si, CANTO_K)); ctx.lineWidth = CANTO; ctx.lineJoin = 'round';
    ctx.lineCap = 'round'; ctx.stroke();
  };
  for (let x = x0; x <= x1; x += paso / ESC) {
    const hay = hayPiso(x);
    if (hay && ini === null) ini = x;
    else if (!hay && ini !== null) { cierra(ini, x - paso / ESC); ini = null; }
  }
  if (ini !== null) cierra(ini, x1);

  /* las paredes del hueco: dos trazos verticales que se pierden hacia abajo.
     Sin ellas el hueco es un recorte y no se lee su profundidad. */
  ctx.strokeStyle = rgb(mezclaC(PAL.su, PAL.si, 0.80)); ctx.lineWidth = CANTO + 0.6;
  for (let i = 0; i < HUECOS.length; i++) {
    const h = HUECOS[i];
    if (h.b < x0 || h.a > x1) continue;
    for (const bx of [h.a, h.b]) {
      ctx.beginPath();
      ctx.moveTo(sx(bx), sy(terrY(bx)));
      ctx.lineTo(sx(bx), sy(terrY(bx)) + ALTO * 0.30);
      ctx.stroke();
    }
  }
}

/* ── LOS ADORNOS ──────────────────────────────────────────────────────────
   Cinco siluetas y ninguna con detalle interior: a la distancia a la que se
   ven, lo unico que llega es el contorno. Y se plantan SOBRE la curva, con
   la escala de su propia entrada, porque cinco copias del mismo tamano se
   leen a copia y pega.                                                    */
function pintaDeco() {
  const x0 = CAM.x - 6, x1 = CAM.x + VISTA_ANCHO + 6;
  ctx.fillStyle = rgb(PAL.si);
  for (let i = 0; i < DECO.length; i++) {
    const d = DECO[i];
    if (d.x < x0) continue; if (d.x > x1) break;
    const px = sx(d.x), py = sy(terrY(d.x)), e = d.e * ESC;
    ctx.save(); ctx.translate(px, py);
    if (d.t === 0) {                                  // arbol seco
      ctx.fillRect(-0.14 * e, -2.6 * e, 0.28 * e, 2.6 * e);
      for (let k = 0; k < 3; k++) {
        const a = -0.9 - k * 0.5 + Math.sin(d.f + k) * 0.3, L = (0.9 - k * 0.18) * e;
        ctx.save(); ctx.translate(0, -(1.5 + k * 0.45) * e); ctx.rotate(a);
        ctx.fillRect(0, -0.09 * e, L, 0.18 * e); ctx.restore();
        ctx.save(); ctx.translate(0, -(1.7 + k * 0.45) * e); ctx.rotate(Math.PI - a);
        ctx.fillRect(0, -0.09 * e, L * 0.8, 0.18 * e); ctx.restore();
      }
    } else if (d.t === 1) {                           // roca
      ctx.beginPath();
      ctx.moveTo(-0.9 * e, 0); ctx.lineTo(-0.5 * e, -0.72 * e);
      ctx.lineTo(0.05 * e, -0.92 * e); ctx.lineTo(0.62 * e, -0.55 * e);
      ctx.lineTo(0.95 * e, 0); ctx.closePath(); ctx.fill();
    } else if (d.t === 2) {                           // arbusto
      for (let k = 0; k < 4; k++) {
        const a = -0.55 - k * 0.32, L = (0.75 - k * 0.09) * e;
        ctx.save(); ctx.rotate(a + Math.sin(d.f + k * 2) * 0.16);
        ctx.fillRect(-0.06 * e, -L, 0.12 * e, L); ctx.restore();
        ctx.save(); ctx.rotate(-(a + Math.sin(d.f + k) * 0.16));
        ctx.fillRect(-0.06 * e, -L * 0.9, 0.12 * e, L * 0.9); ctx.restore();
      }
    } else if (d.t === 4) {                           // cactus
      ctx.fillRect(-0.20 * e, -2.1 * e, 0.40 * e, 2.1 * e);
      ctx.fillRect(-0.78 * e, -1.55 * e, 0.60 * e, 0.34 * e);
      ctx.fillRect(-0.78 * e, -1.55 * e, 0.34 * e, 0.90 * e);
      ctx.fillRect(0.18 * e, -1.20 * e, 0.62 * e, 0.32 * e);
      ctx.fillRect(0.48 * e, -1.85 * e, 0.32 * e, 0.95 * e);
    } else {                                          // poste con banderin
      ctx.fillRect(-0.08 * e, -2.8 * e, 0.16 * e, 2.8 * e);
      ctx.beginPath(); ctx.moveTo(0.06 * e, -2.75 * e);
      ctx.lineTo(0.95 * e, -2.45 * e); ctx.lineTo(0.06 * e, -2.15 * e);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

/* ── LAS CUERDAS ──────────────────────────────────────────────────────────
   Dos postes y una linea de banderines. Los banderines no son adorno: son lo
   que la hace VISIBLE contra el cielo desde lejos —una linea de dos pixeles
   a treinta metros no existe— y son el aviso de que ahi hay algo que hacer. */
function pintaCuerdas() {
  const x0 = CAM.x - 6, x1 = CAM.x + VISTA_ANCHO + 6;
  for (let i = 0; i < CUERDAS.length; i++) {
    const c = CUERDAS[i];
    if (c.x1 < x0) continue; if (c.x0 > x1) break;
    const ax = sx(c.x0), ay = sy(c.y0), bx = sx(c.x1), by = sy(c.y1);
    ctx.strokeStyle = rgb(PAL.si); ctx.lineWidth = CANTO * 0.8;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, sy(terrY(c.x0))); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, sy(terrY(c.x1))); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    ctx.lineWidth = c.usada ? CANTO * 0.7 : CANTO * 1.1; ctx.stroke();
    const n = Math.max(3, Math.round((c.x1 - c.x0) / 2.6));
    const lado = ESC * 0.42;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, px = mezcla(ax, bx, t), py = mezcla(ay, by, t);
      ctx.globalAlpha = c.usada ? 0.34 : 0.92;
      ctx.fillStyle = k % 2 ? rgb(PAL.si) : rgb(PAL.as);
      ctx.beginPath(); ctx.moveTo(px - lado * 0.5, py); ctx.lineTo(px + lado * 0.5, py);
      ctx.lineTo(px, py + lado * 1.25); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/* ── LAS MONEDAS ──────────────────────────────────────────────────────────
   Un disco y su halo, y NADA MAS. Con un dibujo adentro dejan de leerse a
   distancia y compiten con el rider, que es lo unico que hay que mirar.  */
function pintaMonedas(t) {
  const x0 = CAM.x - 3, x1 = CAM.x + VISTA_ANCHO + 3;
  for (let i = 0; i < MONEDAS.length; i++) {
    const c = MONEDAS[i];
    if (c.ida) continue;
    if (c.x < x0) continue; if (c.x > x1) break;
    const px = sx(c.x), py = sy(c.y), r = ESC * 0.34;
    /* el guino: el disco se angosta con un coseno. Es la unica animacion de
       una moneda y es lo que la separa de un punto pintado. */
    const w = Math.abs(Math.cos(t * 2.4 + c.x * 0.4));
    ctx.fillStyle = rgb(PAL.ha, 0.22);
    ctx.beginPath(); ctx.arc(px, py, r * 2.1, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.ellipse(px, py, r * (0.24 + 0.76 * w), r, 0, 0, 6.2832); ctx.fill();
  }
}
