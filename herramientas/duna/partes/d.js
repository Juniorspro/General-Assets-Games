/* ══════════════════════════════════════════════════════════════════════════
   EL TERRENO
   ──────────────────────────────────────────────────────────────────────────
   NO TOCA NI EL DOM NI EL LIENZO, a proposito: asi se lo puede importar en
   node y auditar cien semillas sin abrir un navegador. Un terreno generado y
   no jugado es un terreno roto que todavia no se sabe.

   ES UNA CURVA DE HERMITE SOBRE PUNTOS DE CONTROL, no una suma de senos.
   Con senos todo el mapa tiene la misma ondulacion y no hay forma de poner
   una rampa donde uno quiere; con puntos de control cada tramo declara su
   forma y la curva sale C1 —derivada continua— que es lo que hace que la
   tabla no pegue un tiron al cruzar de un tramo al siguiente.

   Y LOS HUECOS NO SON PARTE DE LA CURVA: son una MASCARA. Metidos adentro
   como un valle profundo, la interpolacion oscila y deja jorobas a los
   costados; como mascara, la curva sigue igual de suave y lo que cambia es
   que en ese rango NO HAY PISO. De paso es como se ven: dos paredes
   verticales y el vacio.                                                  */

const PC = [];        // puntos de control {x, y}
const HUECOS = [];    // {a, b} en x — ahi no hay suelo
const CUERDAS = [];   // {x0, y0, x1, y1, usada}
const MONEDAS = [];   // {x, y, ida}
const DECO = [];      // {x, y, t, e} adornos en silueta
/* los arcos de moneda anotados y todavia sin resolver — ver `monedasArco`. VA
   ACA ARRIBA y no donde se usa: lo lee `terrReinicia`, y en este repo un
   `let`/`const` leido antes de su linea no devuelve undefined, TIRA. */
const MON_PEND = [];
let TERR_X = 0;       // hasta donde esta generado
let TERR_SEM = 1, TERR_AZ = null, TERR_N = 0;
let _pcI = 1;         // el indice del segmento en el que estabamos

function terrReinicia(sem) {
  PC.length = 0; HUECOS.length = 0; CUERDAS.length = 0; MONEDAS.length = 0; DECO.length = 0;
  MON_PEND.length = 0;
  TERR_SEM = sem; TERR_AZ = azarDe(sem); TERR_N = 0; _pcI = 1;
  /* dos puntos hacia atras: la Hermite del primer segmento necesita un vecino
     de la izquierda o la tangente de arranque sale de la nada */
  PC.push({ x: -80, y: 80 * CAIDA }, { x: -40, y: 40 * CAIDA }, { x: 0, y: 0 });
  TERR_X = 0;
  while (TERR_X < 400) terrTramo();
}

/* ── LOS TRAMOS ───────────────────────────────────────────────────────────
   La dificultad crece con la distancia y crece en UNA cosa por vez: primero
   aparecen los huecos, despues se ensanchan. Subiendo dos numeros a la vez,
   el metro mil se vuelve otro juego de un cuadro al otro.                 */
function terrTramo() {
  const a = TERR_AZ, d = TERR_X, n = TERR_N++;
  /* SEIS KILOMETROS Y NO TRES. Con 3 km la dificultad se satura donde el
     jugador bueno recien esta entrando en calor: medido, el bot honesto llega
     a 11,7 km y la segunda mitad de esa partida era identica a la primera. Un
     juego que deja de apretar no se termina de dificultad, se termina de
     aburrimiento. */
  const dif = clamp(d / 6000, 0, 1);
  const base = () => { const p = PC[PC.length - 1]; return p; };

  /* el reparto de tramos: al principio casi todo son dunas, y los huecos y
     las cuerdas entran despues. Los tres primeros son siempre suaves: nadie
     aprende a saltar cayendose en el metro veinte. */
  let tipo;
  if (n < 3) tipo = 'duna';
  else {
    const r = a();
    if (r < 0.30) tipo = 'duna';
    else if (r < 0.50) tipo = 'rampa';
    else if (r < 0.66) tipo = 'llano';
    else if (r < 0.66 + 0.20 * dif + 0.04) tipo = 'hueco';
    else if (r < 0.92) tipo = 'duna';
    else tipo = 'cuerda';
  }

  const p0 = base();
  const ancho = v => { TERR_X += v; return TERR_X; };

  if (tipo === 'duna') {
    /* una duna es subida y bajada, y la bajada es MAS LARGA que la subida:
       eso es lo que hace que el jugador gane velocidad en cada una. */
    const w1 = 30 + a() * 30, w2 = 42 + a() * 48, alto = 3 + a() * (4 + 6 * dif);
    PC.push({ x: ancho(w1), y: p0.y - w1 * CAIDA + alto });
    const q = PC[PC.length - 1];
    PC.push({ x: ancho(w2), y: q.y - w2 * CAIDA - alto });
    monedasArco(q.x, q.y, w2 * 0.55, a);
    if (a() < 0.6) decoEn(q.x - w1 * 0.4, a);
  } else if (tipo === 'rampa') {
    /* el kicker: una subida corta y fuerte al final de una bajada larga. Es
       la unica forma del terreno que existe para SALTAR y no para pasar. */
    const w0 = 34 + a() * 30, w1 = 11 + a() * 8, w2 = 46 + a() * 44;
    const alto = 3.4 + a() * (2.8 + 4.2 * dif);
    PC.push({ x: ancho(w0), y: p0.y - w0 * CAIDA - alto * 0.55 });
    const q = PC[PC.length - 1];
    PC.push({ x: ancho(w1), y: q.y - w1 * CAIDA + alto });
    const r = PC[PC.length - 1];
    PC.push({ x: ancho(w2), y: r.y - w2 * CAIDA - alto * 0.5 });
    monedasArco(r.x + 5, r.y + 3, w2 * 0.45, a, 1.5);
  } else if (tipo === 'llano') {
    const w = 40 + a() * 40;
    PC.push({ x: ancho(w), y: p0.y - w * CAIDA + (a() - 0.5) * 3 });
    if (a() < 0.75) decoEn(p0.x + w * 0.5, a);
  } else if (tipo === 'hueco') {
    /* LOS DOS BORDES ESTAN A LA MISMA ALTURA Y LA CURVA SIGUE PASANDO POR
       ELLOS: la mascara es lo unico que dice que ahi no hay piso, asi que el
       otro lado se ve donde va a caer uno. Un hueco cuyo borde de enfrente
       esta mas alto de lo que se ve no es dificultad, es una trampa. */
    const ent = 22 + a() * 18;
    PC.push({ x: ancho(ent), y: p0.y - ent * CAIDA - 2.2 });
    const b0 = PC[PC.length - 1];
    const w = 9 + a() * (7 + 11 * dif);
    PC.push({ x: ancho(w), y: b0.y - w * CAIDA });
    const b1 = PC[PC.length - 1];
    HUECOS.push({ a: b0.x + 0.6, b: b1.x - 0.6, y0: Math.min(b0.y, b1.y) });
    const sal = 32 + a() * 26;
    PC.push({ x: ancho(sal), y: b1.y - sal * CAIDA - 1.5 });
    monedasArco((b0.x + b1.x) / 2, b0.y + 5.5, w * 0.6, a, 1.2);
  } else {
    /* la cuerda va entre dos postes, POR ENCIMA del terreno y bajando: es la
       linea de banderines de Alto. Colgarse es la unica forma de cruzar sin
       tocar el suelo, y por eso paga combo. */
    /* CON UN RESALTE DELANTE, porque una cuerda en el medio de un llano no
       tiene de donde despegar: la unica forma de llegar es saltando, asi que
       el terreno tiene que dar el kicker. */
    const wk = 13 + a() * 7;
    PC.push({ x: ancho(wk), y: p0.y - wk * CAIDA + 1.9 });
    const k0 = PC[PC.length - 1];
    const w = 34 + a() * 26;
    PC.push({ x: ancho(w), y: k0.y - w * CAIDA + (a() - 0.5) * 2 });
    const q = PC[PC.length - 1];
    /* LA ALTURA SALE DEL SALTO MEDIDO Y NO DE LO QUE QUEDA LINDO. Estaba en
       4,6-8,0 m sobre el terreno y un salto llega a 4,2 de mediana y 5,4 en
       el mejor caso (458 saltos jugados): o sea que la mediana de las cuerdas
       estaba POR ENCIMA del salto maximo y la mecanica no se podia alcanzar.
       Con 2,9-4,2 y la ventana de agarre de +-1,5 m, la banda util va de 1,4
       a 5,7 y el apice mediano cae justo adentro. */
    const alt = 2.9 + a() * 1.3;
    CUERDAS.push({ x0: k0.x + 2, y0: k0.y + alt, x1: q.x - 3, y1: q.y + alt * 0.86, usada: false });
    const w2 = 30 + a() * 26;
    PC.push({ x: ancho(w2), y: q.y - w2 * CAIDA - 1 });
  }
}

/* las monedas van en ARCO y no en fila recta sobre el suelo: puestas en el
   piso se juntan sin hacer nada, y en arco marcan el vuelo que hay que
   hacer — o sea que ademas de pagar, ENSENAN donde esta el salto */
/* Y NO SE RESUELVEN AHORA: SE ANOTAN. El arco se ancla en la altura de UN
   punto de control y se estira `r` metros a los dos lados; pero entre dos
   puntos la curva de Hermite se pasa para arriba, asi que las monedas de las
   puntas —donde el seno vale cero— quedaban a `cy+1,3` sobre un terreno que
   ahi arriba estaba mas alto. Medido con la auditoria sobre veinticinco
   semillas: 367 monedas ENTERRADAS, o sea imposibles de juntar, y eso no
   falla ni avisa — se ve como monedas que no aparecen.
   No se puede arreglar preguntandole al terreno en este momento, porque el
   tramo de la derecha todavia no se empujo y `terrY` a esa x extrapola. Se
   anotan y se resuelven cuando el mundo paso de largo, que es exactamente lo
   que `terrGenera` ya sabe hacer.                                        */
function monedasArco(cx, cy, r, a, alto) {
  if (a() > 0.62) return;
  const n = 4 + ((a() * 4) | 0), h = (alto || 1) * (2.2 + a() * 2.4);
  MON_PEND.push({ cx, cy, r, n, h, hasta: cx + r * 0.5 + 8 });
}
function monedasResuelve(hasta) {
  while (MON_PEND.length && MON_PEND[0].hasta < hasta) {
    const q = MON_PEND.shift();
    for (let i = 0; i < q.n; i++) {
      const t = q.n === 1 ? 0.5 : i / (q.n - 1);
      const x = q.cx - q.r * 0.5 + q.r * t;
      /* el piso de cada moneda es EL TERRENO BAJO ELLA y no el del ancla: asi
         una moneda no puede quedar enterrada por construccion. Y sobre un
         hueco manda el ancla, que es lo que dibuja el arco del salto. */
      const suelo = hayPiso(x) ? terrY(x) : q.cy;
      /* el arco arranca casi al ras: las de las puntas se juntan pasando y las
         del medio piden volar. Todo el arco a cinco metros de altura seria una
         fila que no se junta nunca sin saltar a proposito, y entonces las
         monedas dejarian de ensenar donde esta el salto. */
      MONEDAS.push({ x, y: Math.max(q.cy, suelo) + 1.3 + q.h * Math.sin(Math.PI * t), ida: false });
    }
  }
}
/* 0 arbol · 1 roca · 2 arbusto · 3 poste · 4 cactus */
function decoEn(x, a) {
  const r = a();
  const t = r < 0.34 ? 0 : r < 0.58 ? 1 : r < 0.78 ? 2 : r < 0.90 ? 4 : 3;
  DECO.push({ x, t, e: 0.7 + a() * 0.75, f: a() * 6.283 });
}

/* ── LA EVALUACION ────────────────────────────────────────────────────────
   Hermite entre los dos puntos de control que rodean a x, con las tangentes
   sacadas por diferencias centradas —o sea Catmull-Rom no uniforme—. La
   derivada se devuelve ANALITICA y no por diferencia finita: la tangente es
   lo que orienta la tabla y lo que decide si un aterrizaje vale, asi que un
   error numerico ahi se siente como que el rider tiembla.                 */
function _seg(x) {
  if (_pcI < 1) _pcI = 1;
  while (_pcI < PC.length - 2 && PC[_pcI + 1].x < x) _pcI++;
  while (_pcI > 1 && PC[_pcI].x > x) _pcI--;
  return _pcI;
}
function terrY(x) {
  const i = _seg(x), p0 = PC[i - 1], p1 = PC[i], p2 = PC[i + 1], p3 = PC[Math.min(i + 2, PC.length - 1)];
  const h = p2.x - p1.x, t = clamp((x - p1.x) / h, 0, 1), t2 = t * t, t3 = t2 * t;
  const m1 = (p2.y - p0.y) / (p2.x - p0.x), m2 = (p3.y - p1.y) / (p3.x - p1.x || 1);
  return (2 * t3 - 3 * t2 + 1) * p1.y + (t3 - 2 * t2 + t) * h * m1
       + (-2 * t3 + 3 * t2) * p2.y + (t3 - t2) * h * m2;
}
function terrPend(x) {
  const i = _seg(x), p0 = PC[i - 1], p1 = PC[i], p2 = PC[i + 1], p3 = PC[Math.min(i + 2, PC.length - 1)];
  const h = p2.x - p1.x, t = clamp((x - p1.x) / h, 0, 1), t2 = t * t;
  const m1 = (p2.y - p0.y) / (p2.x - p0.x), m2 = (p3.y - p1.y) / (p3.x - p1.x || 1);
  return ((6 * t2 - 6 * t) * p1.y + (3 * t2 - 4 * t + 1) * h * m1
        + (-6 * t2 + 6 * t) * p2.y + (3 * t2 - 2 * t) * h * m2) / h;
}
/* la busqueda del hueco es lineal sobre los pocos que quedan cerca, no sobre
   la lista entera: se podan los que quedaron atras en cada paso */
function hayPiso(x) {
  for (let i = 0; i < HUECOS.length; i++) {
    const h = HUECOS[i];
    if (x > h.a && x < h.b) return false;
    if (h.a > x + 200) break;
  }
  return true;
}
function huecoEn(x) {
  for (let i = 0; i < HUECOS.length; i++) {
    const h = HUECOS[i];
    if (x > h.a - 1 && x < h.b + 1) return h;
    if (h.a > x + 200) break;
  }
  return null;
}
/* se genera hacia adelante y se poda hacia atras: sin la poda, una partida
   de seis mil metros deja veinte mil puntos de control vivos y las listas de
   monedas y adornos crecen sin techo */
let SIM = false;   // durante un rollout no se genera, no se poda y no se junta

/* GENERAR Y PODAR SON DOS COSAS Y NO UNA, y confundirlas costo la vuelta.
   El auto-jugador tiene que generar MUY por delante —sus rollouts vuelan
   doscientos pasos— y con una sola funcion eso se escribia terrAvanza(x+260),
   que ademas PODABA hasta (x+260)-140, o sea que borraba el mundo CIENTO
   VEINTE METROS POR DELANTE del rider: las monedas, las cuerdas y los huecos
   desaparecian antes de que llegara, y peor, se le sacaban puntos de control
   al terreno que estaba pisando. No falla ni avisa: se ve como que el juego
   no tiene monedas y como aterrizajes que se caen sin motivo.             */
function terrGenera(hasta) {
  if (SIM) return;
  while (TERR_X < hasta) terrTramo();
  /* el margen es un tramo entero: `terrY` necesita un punto de control DE CADA
     LADO del sitio que se le pregunta, y el ultimo empujado todavia no lo
     tiene */
  monedasResuelve(TERR_X - 90);
}
function terrAvanza(x) {
  if (SIM) return;
  terrGenera(x + 320);
  const lim = x - 140;
  while (PC.length > 6 && PC[3].x < lim) { PC.shift(); _pcI = Math.max(1, _pcI - 1); }
  while (HUECOS.length && HUECOS[0].b < lim) HUECOS.shift();
  while (CUERDAS.length && CUERDAS[0].x1 < lim) CUERDAS.shift();
  while (MONEDAS.length && MONEDAS[0].x < lim) MONEDAS.shift();
  while (DECO.length && DECO[0].x < lim) DECO.shift();
}
