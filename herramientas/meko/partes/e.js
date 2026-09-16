
/* ══════════════════════════════════════════════════════════════════════════
   E · EL DIBUJO
   Camara ortografica isometrica, el diorama en una sola malla con la oclusion
   HORNEADA EN LOS VERTICES, y los mecanismos aparte porque se mueven.
   ══════════════════════════════════════════════════════════════════════════ */

let REN, ESC, CAM, LUZ, DIO = null;
let CAM_YAW = CAM_YAW_0, CAM_EL = CAM_EL_0;
let ENC_W = 10, ENC_H = 10;        /* medio ancho y medio alto del encuadre */
let ANCHO = 412, ALTO = 892;

/* ── LAS PALETAS: LO MISMO CON OTRA LUZ ───────────────────────────────────
   Un tinte sobre los colores de bloque y el mismo tinte en el degradado del
   fondo, asi que el cielo y el diorama pertenecen al mismo sitio. No cambia
   una sola regla: cambia que el nivel 9 no se vea igual que el 3.          */
const PALETAS = [
  { t: 0xffffff, k: 0.00, sol: [0.70, 0.20], solc: '255,246,214',
    cielo: ['#3f8fd0', '#6cb6e4', '#a9dcf0', '#dff0e4'] },
  { t: 0xffbe78, k: 0.24, sol: [0.30, 0.30], solc: '255,226,168',
    cielo: ['#e0783f', '#f0a45c', '#f7cf92', '#fae7c4'] },
  { t: 0x8fc4f5, k: 0.22, sol: [0.78, 0.14], solc: '214,238,255',
    cielo: ['#2f5fa8', '#548fd0', '#93c2e6', '#cfe4ef'] },
  { t: 0xa8f0a0, k: 0.18, sol: [0.42, 0.24], solc: '236,255,214',
    cielo: ['#2f8f6e', '#5cb890', '#9ad9ac', '#d6efcf'] },
];

/* ── LA SATURACION ES UNA SOLA FUNCION Y LA PASAN TODOS LOS COLORES ───────
   Pedido: «graficos saturados». Retocar los ocho colores de `BLOQ` a mano
   dejaria los tintes de paleta, el naranja del mecanismo y el dorado de la
   meta con la saturacion vieja, o sea el diorama vivo y las piezas que
   importan apagadas. Un solo sitio: HSL, se multiplica la S y se topa —
   por encima de 0,80 los grises dejan de ser grises y la piedra sale rosa. */
const SAT_K = 1.42, SAT_TOPE = 0.80;
const _hsl = { h: 0, s: 0, l: 0 };
function satura(c) {
  c.getHSL(_hsl);
  if (_hsl.s > 0.004) c.setHSL(_hsl.h, Math.min(SAT_TOPE, _hsl.s * SAT_K), _hsl.l);
  return c;
}

/* ── LAS SEIS CARAS, CON SUS EJES ─────────────────────────────────────────
   `u × w = n` en las seis, asi que la tira (o, o+u, o+u+w, o+w) sale con la
   normal hacia afuera SIEMPRE y no hay que acordarse del sentido cara por
   cara — que es de donde salen los agujeros negros en una malla de voxeles. */
const CARAS = [
  { n: [ 1, 0, 0], o: [1, 0, 0], u: [0, 1, 0], w: [0, 0, 1] },
  { n: [-1, 0, 0], o: [0, 0, 0], u: [0, 0, 1], w: [0, 1, 0] },
  { n: [ 0, 1, 0], o: [0, 1, 0], u: [0, 0, 1], w: [1, 0, 0] },
  { n: [ 0,-1, 0], o: [0, 0, 0], u: [1, 0, 0], w: [0, 0, 1] },
  { n: [ 0, 0, 1], o: [0, 0, 1], u: [1, 0, 0], w: [0, 1, 0] },
  { n: [ 0, 0,-1], o: [0, 0, 0], u: [0, 1, 0], w: [1, 0, 0] },
];
/* CUATRO ESCALONES DE OCLUSION Y NO UNA SOMBRA CONTINUA: la oclusion de un
   voxel sale de contar vecinos, o sea que hay exactamente cuatro casos. Y es
   lo unico que hace que un rincon se lea como un rincon con una sola luz. */
const AO_F = [0.50, 0.69, 0.86, 1.00];

/* ── LA TEXTURA DE CADA BLOQUE ────────────────────────────────────────────
   Hasta acá los ocho tipos compartían UN mapa de borde: la junta caía donde
   iba —que es lo importante en un juego donde contar bloques ES el juego, se
   sube uno y se cae tres— y el ladrillo, la piedra y la madera se veían
   exactamente igual. Ahora cada tipo tiene la suya.

   UNA TEXTURA POR TIPO Y NO UN ATLAS, y es por los mipmaps: un atlas mezcla
   la baldosa de al lado en cuanto la camara se aleja, y acá un bloque mide
   unos treinta pixeles. Cuesta una malla por tipo —tres o cuatro por nivel,
   medido— contra un juego entero de UV parchadas.

   Y SON DOS FILAS: la mitad de arriba del lienzo es la TAPA y la de abajo el
   LADO. `flipY` manda la fila 0 del lienzo a v=1, asi que las caras de
   arriba piden v 0,5..1 y todas las demas v 0..0,5. Sin eso el pasto se veria
   con briznas en los cuatro costados, que es de lo que este juego se rie.

   VAN EN ESPACIO LINEAL A PROPOSITO: son un MULTIPLICADOR sobre el color que
   viaja en los vertices —el tinte de la paleta, la oclusion y el tono por
   bloque—, no un color. Un 0,84 tiene que llegar al shader como 0,84.      */
const TEXB = {};
function texBloque(tp) {
  if (TEXB[tp]) return TEXB[tp];
  const L = 64, c = document.createElement('canvas');
  c.width = L; c.height = L * 2;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, L, L * 2);
  const R = azar(tp * 7717 + 13);
  const os = (a) => 'rgba(0,0,0,' + a + ')', bl = (a) => 'rgba(255,255,255,' + a + ')';

  /* la junta va en las dos mitades y es lo unico que TODOS comparten: es lo
     que dice donde termina un bloque y empieza el siguiente */
  const junta = y0 => {
    g.fillStyle = os(0.22);
    g.fillRect(0, y0, L, 1); g.fillRect(0, y0 + L - 1, L, 1);
    g.fillRect(0, y0, 1, L); g.fillRect(L - 1, y0, 1, L);
    g.fillStyle = os(0.09);
    g.fillRect(1, y0 + 1, L - 2, 1); g.fillRect(1, y0 + L - 2, L - 2, 1);
    g.fillRect(1, y0 + 1, 1, L - 2); g.fillRect(L - 2, y0 + 1, 1, L - 2);
  };
  const mota = (y0, n, a, cl_) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cl_(a * (0.4 + R() * 0.6));
      const w = 1 + Math.floor(R() * 3);
      g.fillRect(2 + Math.floor(R() * (L - 4)), y0 + 2 + Math.floor(R() * (L - 4)), w, w);
    }
  };
  const hiladas = (y0, filas, alt) => {          /* ladrillo: hiladas trabadas */
    for (let f = 0; f < filas; f++) {
      const y = y0 + Math.round(f * alt);
      g.fillStyle = os(0.17); g.fillRect(0, y, L, 2);
      g.fillStyle = bl(0.13); g.fillRect(0, y + 2, L, 1);
      const off = (f % 2) ? 0 : L / 2;
      for (let k = 0; k < 2; k++) {
        const x = Math.round((off + k * L / 2) % L);
        g.fillStyle = os(0.14); g.fillRect(x, y + 2, 2, Math.round(alt) - 2);
      }
    }
  };
  const tablas = (y0, n, vert) => {              /* madera: tablas con veta */
    const p = L / n;
    for (let i = 0; i < n; i++) {
      const a = Math.round(i * p);
      g.fillStyle = os(0.16);
      if (vert) g.fillRect(a, y0, 2, L); else g.fillRect(0, y0 + a, L, 2);
      g.fillStyle = bl(0.11);
      if (vert) g.fillRect(a + 2, y0, 1, L); else g.fillRect(0, y0 + a + 2, L, 1);
      for (let v = 0; v < 3; v++) {
        g.fillStyle = os(0.07 + R() * 0.05);
        const q = a + 4 + Math.floor(R() * (p - 7));
        if (vert) g.fillRect(q, y0 + Math.floor(R() * 20), 1, 18 + Math.floor(R() * 30));
        else g.fillRect(Math.floor(R() * 20), y0 + q, 18 + Math.floor(R() * 30), 1);
      }
    }
  };
  const remaches = y0 => {
    g.fillStyle = os(0.20);
    for (const [x, y] of [[6, 6], [L - 8, 6], [6, L - 8], [L - 8, L - 8]]) {
      g.fillRect(x, y0 + y, 2, 2);
      g.fillStyle = bl(0.22); g.fillRect(x, y0 + y - 1, 2, 1); g.fillStyle = os(0.20);
    }
  };

  if (tp === LADRILLO)      { hiladas(0, 3, L / 3); hiladas(L, 4, L / 4); }
  else if (tp === PIEDRA)   {
    mota(0, 60, 0.10, os); mota(0, 30, 0.14, bl);
    for (let i = 0; i < 3; i++) {                /* dos grietas por mitad */
      g.fillStyle = os(0.13);
      let x = 4 + R() * (L - 8), y = 4 + R() * (L - 8);
      for (let k = 0; k < 9; k++) { g.fillRect(x | 0, y | 0, 1, 1); x += R() * 5 - 2; y += R() * 5 - 2; }
    }
    mota(L, 70, 0.13, os); mota(L, 26, 0.12, bl);
    g.fillStyle = os(0.09);
    for (let f = 1; f < 3; f++) g.fillRect(0, L + Math.round(f * L / 3), L, 1);
  }
  else if (tp === PASTO)    {
    for (let i = 0; i < 150; i++) {              /* la tapa: briznas */
      g.fillStyle = R() < 0.45 ? bl(0.10 + R() * 0.16) : os(0.06 + R() * 0.10);
      g.fillRect(2 + Math.floor(R() * (L - 4)), 2 + Math.floor(R() * (L - 5)), 1, 2 + Math.floor(R() * 3));
    }
    mota(L, 80, 0.13, os); mota(L, 24, 0.10, bl);
    g.fillStyle = bl(0.16); g.fillRect(0, L + 2, L, 4);   /* el labio de pasto */
    g.fillStyle = os(0.10);
    for (let i = 0; i < 10; i++) g.fillRect(3 + Math.floor(R() * (L - 6)), L + 7, 1, 3 + Math.floor(R() * 7));
  }
  else if (tp === MADERA)   { tablas(0, 3, false); tablas(L, 4, true); }
  else if (tp === METAL)    {
    g.fillStyle = os(0.09);
    for (let i = -L; i < L * 2; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + L, L); g.strokeStyle = os(0.08); g.lineWidth = 2; g.stroke(); }
    remaches(0);
    g.fillStyle = os(0.13); g.fillRect(0, L + L / 2 - 1, L, 2);
    g.fillStyle = bl(0.14); g.fillRect(0, L + L / 2 + 1, L, 1);
    remaches(L);
  }
  else if (tp === META)     {
    for (const y0 of [0, L]) {
      const rg = g.createRadialGradient(L / 2, y0 + L / 2, 2, L / 2, y0 + L / 2, L * 0.52);
      rg.addColorStop(0, bl(0.34)); rg.addColorStop(0.55, bl(0.06)); rg.addColorStop(1, os(0.10));
      g.fillStyle = rg; g.fillRect(0, y0, L, L);
      g.strokeStyle = bl(0.20); g.lineWidth = 2;
      for (const r of [12, 22]) { g.beginPath(); g.arc(L / 2, y0 + L / 2, r, 0, 6.2832); g.stroke(); }
    }
  }
  else if (tp === VIDRIO)   {
    for (const y0 of [0, L]) {
      g.fillStyle = os(0.14); g.fillRect(4, y0 + 4, L - 8, 2); g.fillRect(4, y0 + L - 6, L - 8, 2);
      g.fillRect(4, y0 + 4, 2, L - 8); g.fillRect(L - 6, y0 + 4, 2, L - 8);
      g.strokeStyle = bl(0.30); g.lineWidth = 3;
      g.beginPath(); g.moveTo(10, y0 + L - 12); g.lineTo(L - 22, y0 + 10); g.stroke();
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(24, y0 + L - 10); g.lineTo(L - 10, y0 + 22); g.stroke();
    }
  }
  junta(0); junta(L);

  const t = new T.CanvasTexture(c);
  t.colorSpace = T.LinearSRGBColorSpace;
  t.anisotropy = 4;
  TEXB[tp] = t;
  return t;
}

/* ── EL CIELO ─────────────────────────────────────────────────────────────
   Era un degradado de CSS por detras del lienzo: cuatro paradas de color y
   nada mas, o sea que girar el diorama no movia un solo pixel del fondo.
   Ahora es un lienzo con sol, halo y nubes puesto como `scene.background`,
   Y SE CORRE CON LA ORBITA: el fondo de three respeta `offset`/`repeat` de
   la textura, asi que arrastrar el dedo hace que las nubes pasen. Cuesta UNA
   textura, cero geometria y cero llamadas de dibujo — con un domo habria que
   dibujar una esfera de mas y encima con camara ortografica se veria un
   parche del tamano del encuadre.

   LAS NUBES SE DIBUJAN TRES VECES —en x, x-W y x+W— porque la textura se
   repite en horizontal: sin eso, al panear aparece la costura.            */
const CIELOS = [];

/* una banda de cerros: una onda suave cerrada contra el pie del lienzo. Dos
   senos de periodos que NO son multiplos entre si, o sea que el perfil no se
   repite dentro del ancho y no se lee a diente de sierra.                  */
function cerroP(g, W, H, y0, amp, fa, fb, fase, col) {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) {
    const u = x / W * 6.2832;
    g.lineTo(x, y0 - (Math.sin(u * fa + fase) * 0.62 + Math.sin(u * fb + fase * 1.7) * 0.38) * amp);
  }
  g.lineTo(W, H); g.closePath(); g.fill();
}

function cieloTex(pi) {
  if (CIELOS[pi]) return CIELOS[pi];
  const pal = PALETAS[pi], W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  const ps = pal.cielo;
  gr.addColorStop(0, ps[0]); gr.addColorStop(0.44, ps[1]);
  gr.addColorStop(0.76, ps[2]); gr.addColorStop(1, ps[3]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);

  const sx = W * pal.sol[0], sy = H * pal.sol[1];

  /* LOS RAYOS VAN ANTES DEL HALO: el halo es un radial que se come el
     nacimiento de cada cuña, y sin eso la cuña arranca con un canto recto
     pegado al disco y el sol se lee a abanico de papel. Y el abanico va
     HACIA ABAJO: repartido en los 360 grados, la mitad sale hacia arriba y
     corta contra el borde del cuadro, que es lo que un rayo no hace.      */
  const R0 = azar(pi * 811 + 37);
  g.save(); g.translate(sx, sy);
  for (let i = 0; i < 8; i++) {
    const a = 1.5708 + (((i + 0.5) / 8) - 0.5) * 2.48 + (R0() - 0.5) * 0.18;
    const an = 0.028 + R0() * 0.040, lg = H * (0.55 + R0() * 0.80);
    /* dos cuñas por rayo —una ancha y floja debajo de una angosta— porque una
       sola de alfa pareja tiene canto duro por construccion.               */
    for (const mu of [2.5, 1]) {
      const ma = mu > 2 ? 0.42 : 1;
      const rg = g.createLinearGradient(0, 0, Math.cos(a) * lg, Math.sin(a) * lg);
      rg.addColorStop(0, 'rgba(' + pal.solc + ',0)');
      rg.addColorStop(0.16, 'rgba(' + pal.solc + ',' + (0.11 * ma).toFixed(3) + ')');
      rg.addColorStop(0.50, 'rgba(' + pal.solc + ',' + (0.05 * ma).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(' + pal.solc + ',0)');
      g.fillStyle = rg;
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a - an * mu) * lg, Math.sin(a - an * mu) * lg);
      g.lineTo(Math.cos(a + an * mu) * lg, Math.sin(a + an * mu) * lg);
      g.closePath(); g.fill();
    }
  }
  g.restore();

  for (const off of [-W, 0, W]) {
    const rg = g.createRadialGradient(sx + off, sy, 0, sx + off, sy, H * 0.62);
    rg.addColorStop(0, 'rgba(' + pal.solc + ',.92)');
    rg.addColorStop(0.09, 'rgba(' + pal.solc + ',.55)');
    rg.addColorStop(0.34, 'rgba(' + pal.solc + ',.16)');
    rg.addColorStop(1, 'rgba(' + pal.solc + ',0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  /* el disco. Faltaba: un halo sin disco es una mancha clara y no un sol. */
  g.fillStyle = 'rgba(' + pal.solc + ',.94)';
  g.beginPath(); g.arc(sx, sy, H * 0.042, 0, 6.2832); g.fill();

  /* ── EL HORIZONTE, QUE ES LO QUE SACA AL DIORAMA DE LA NADA ─────────────
     Sin el, el fondo es un degradado de un solo color y el diorama flota en
     una sopa: no hay nada respecto de lo cual este apoyado. Con dos bandas
     de cerros y un suelo debajo, el diorama pasa a ser una isla en un
     paisaje — y no cuesta ni un triangulo, porque va horneado en la misma
     textura de fondo que ya estaba.

     LAS DOS BANDAS SE TIÑEN HACIA EL CIELO Y NO HACIA EL NEGRO: eso es
     perspectiva aerea, y es lo unico que hace que una se lea MAS LEJOS que
     la otra en vez de simplemente mas oscura.                             */
  /* LA ALTURA SALE DE DONDE CAE EN PANTALLA, NO DE DONDE QUEDA LINDA EN EL
     LIENZO. La textura se recorta a `ry` 0,88 con un corrimiento que depende
     de la elevacion, asi que la fila `y` del lienzo aparece en la fraccion
     (1 - y/H - oy) / 0,88 del alto del marco contando desde abajo. Con 0,745
     eso daba el 15 % —debajo del diorama y tapado por el pie— y medido en la
     captura no se veia ninguna de las dos bandas. Con 0,56 cae en el 37 %,
     o sea justo por detras de la base del diorama.                        */
  const HOR = H * 0.56;
  const cieloBajo = _hx(ps[2]), suelo = _hx(ps[3]);
  cerroP(g, W, H, HOR - H * 0.014, H * 0.058, 1, 2.3, pi * 1.7,
    _rc(_mz(cieloBajo, _hx(ps[0]), 0.44)));
  cerroP(g, W, H, HOR + H * 0.004, H * 0.038, 1.6, 3.1, pi * 2.9 + 1.2,
    _rc(_mz(cieloBajo, _hx(ps[0]), 0.70)));

  /* el suelo de abajo del horizonte: mas oscuro que el cielo y aclarandose
     HACIA el horizonte, que es como se ve un llano a ras de vista.        */
  const sg = g.createLinearGradient(0, HOR, 0, H);
  sg.addColorStop(0, _rc(_mz(suelo, _hx(ps[0]), 0.30)));
  sg.addColorStop(1, _rc(_mz(suelo, _hx(ps[0]), 0.62)));
  g.fillStyle = sg; g.fillRect(0, HOR, W, H - HOR);

  /* ── EL AGUA ───────────────────────────────────────────────────────────
     El tercio de abajo del marco es todo este suelo, y medido en la captura
     salia LISO de punta a punta: un degradado sin nada adentro se lee a
     vacio, no a lejos. Lo que lo llena sin competir con el diorama son
     rayas horizontales de espuma — y la perspectiva la da el REPARTO, no el
     dibujo: las filas se comprimen hacia el horizonte con una potencia, asi
     que cerca del pie estan separadas y contra el horizonte se apilan.    */
  const R2 = azar(pi * 3319 + 17);
  /* CADA ONDA SON DOS LINEAS Y NO UNA: una cresta clara y un valle oscuro
     justo debajo. Medido en la captura, la espuma blanca sola sobre un suelo
     claro no se leia ni con el contraste al doble — una linea clara sobre un
     fondo claro no tiene contra que recortarse. El par cresta/valle si, y
     ademas es lo que hace un rizo de verdad.                              */
  for (let i = 0; i < 62; i++) {
    const u = (i + R2() * 0.6) / 62;
    const y = HOR + (H - HOR) * Math.pow(u, 1.75);
    const lw = (0.06 + R2() * 0.26) * W, lx = R2() * W - lw / 2;
    /* la raya se apaga contra el horizonte —donde el agua es bruma— y contra
       el pie, donde ya salio del cuadro.                                  */
    /* OJO CON LA ENVOLVENTE: `sin(min(1,u*2.2)*PI)` se topa en sin(PI)=0, o sea
       que TODA raya con u>=0,455 salia en alfa CERO. Medido en la captura, el
       agua solo tenia espuma en la franja pegada al horizonte y el resto era un
       degradado liso — y yo lo estaba leyendo como «falta contraste». Lo que
       hace falta es entrar desde el horizonte y quedarse, no ir y volver.   */
    const a = 0.46 * Math.min(1, u * 3.2) * (0.35 + R2() * 0.65);
    if (a <= 0.006) continue;
    const gr = Math.max(1, (1 + u * 3.2));
    for (const [col, mu, dy] of [['0,22,40', 0.62, gr], ['255,255,255', 1, 0]]) {
      const rg = g.createLinearGradient(lx, 0, lx + lw, 0);
      rg.addColorStop(0, 'rgba(' + col + ',0)');
      rg.addColorStop(0.5, 'rgba(' + col + ',' + (a * mu).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = rg;
      g.fillRect(lx, y + dy, lw, gr);
    }
  }
  /* EL REFLEJO DEL SOL: una columna que se ABRE hacia el pie, porque el
     camino de luz sobre el agua se ensancha al acercarse al que mira. Es lo
     unico que ata el sol al suelo; sin el son dos cosas sin relacion.     */
  const gx = sx;
  for (let i = 0; i < 26; i++) {
    const u = i / 26, y = HOR + (H - HOR) * Math.pow(u, 1.6);
    /* el camino de luz no se apaga hacia el pie: se ENSANCHA. Un (1-u) pelado
       lo dejaba en 0,06 justo en la mitad del cuadro que mas se ve.        */
    const an = (0.02 + u * 0.13) * W, a = 0.42 * (0.40 + 0.60 * (1 - u)) * (0.55 + R2() * 0.45);
    const rg = g.createLinearGradient(gx - an, 0, gx + an, 0);
    rg.addColorStop(0, 'rgba(' + pal.solc + ',0)');
    rg.addColorStop(0.5, 'rgba(' + pal.solc + ',' + a.toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(' + pal.solc + ',0)');
    g.fillStyle = rg;
    g.fillRect(gx - an, y, an * 2, Math.max(1, (H - HOR) / 22));
  }

  /* y una linea clara en el corte: sin ella el horizonte es un canto duro */
  const lg2 = g.createLinearGradient(0, HOR - H * 0.02, 0, HOR + H * 0.03);
  lg2.addColorStop(0, 'rgba(255,255,255,0)');
  lg2.addColorStop(0.4, 'rgba(255,255,255,.22)');
  lg2.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lg2; g.fillRect(0, HOR - H * 0.02, W, H * 0.05);

  /* ── LAS NUBES ─────────────────────────────────────────────────────────
     Estaban en alfa 0,05 a 0,15 con mezcla aditiva sobre un cielo del medio:
     medido en la captura, no se veia UNA. Van opacas, con la panza teñida y
     la corona blanca —una nube de un solo valor no tiene volumen por muchas
     bolas que tenga— y por ENCIMA del horizonte, nunca cruzandolo.        */
  const R = azar(pi * 1237 + 71);
  const panza = _rc(_mz(_mz([255, 255, 255], [146, 160, 184], 0.58), _hx(ps[1]), 0.22));
  for (let i = 0; i < 13; i++) {
    const cx = R() * W, cy = H * (0.06 + R() * 0.40), s = 0.45 + R() * 0.85;
    const a = 0.30 + R() * 0.30;
    for (const off of [-W, 0, W]) {
      g.globalAlpha = a * 0.82; g.fillStyle = panza;
      nubeM(g, cx + off, cy + 13 * s, s);
      g.globalAlpha = a; g.fillStyle = '#ffffff';
      nubeM(g, cx + off, cy, s);
    }
  }
  g.globalAlpha = 1;

  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = T.RepeatWrapping; t.wrapT = T.ClampToEdgeWrapping;
  CIELOS[pi] = t;
  return t;
}
/* una nube de siete bolas achatadas, con el ancho cayendo hacia las puntas */
function nubeM(g, cx, cy, s) {
  g.beginPath();
  for (let k = 0; k < 7; k++) {
    const ex = cx + (k - 3) * 30 * s, ey = cy + Math.sin(k * 1.7 + cx * 0.01) * 8 * s;
    const rw = (46 - Math.abs(k - 3) * 9) * s, rh = rw * 0.62;
    g.moveTo(ex + rw, ey);
    g.ellipse(ex, ey, rw, rh, 0, 0, 6.2832);
  }
  g.fill();
}
/* tres ayudas de color para el cielo: leer un '#rrggbb', mezclar y escribir */
function _hx(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function _mz(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function _rc(r) { return 'rgb(' + Math.round(r[0]) + ',' + Math.round(r[1]) + ',' + Math.round(r[2]) + ')'; }

/* EL RECORTE SALE DE LA PROPORCION DEL MARCO Y NO DE UN NUMERO: con `repeat`
   fijo, en apaisado —donde el marco es una columna angosta— el cielo saldria
   estirado y las nubes se leerian a manchas verticales.                    */
function cieloAjusta() {
  const t = ESC && ESC.background;
  if (!t || !t.isTexture || !t.image) return;
  const ry = 0.88;
  const rx = cl((ANCHO / ALTO) * (t.image.height / t.image.width) * ry, 0.03, 1);
  let ox = (CAM_YAW / (Math.PI * 2)) * 0.55; ox -= Math.floor(ox);
  const ke = cl((CAM_EL - CAM_EL_MIN) / (CAM_EL_MAX - CAM_EL_MIN), 0, 1);
  t.repeat.set(rx, ry);
  t.offset.set(ox, (1 - ry) * (1 - ke));
}

/* mete una caja con normales planas en los arreglos. La usan la escalera y
   los rieles: geometria chica que no vale una malla propia cada una.       */
function empujaCaja(A, cx, cy, cz, sx, sy, sz, col) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  for (const f of CARAS) {
    const ox = cx + f.o[0] * sx - hx, oy = cy + f.o[1] * sy - hy, oz = cz + f.o[2] * sz - hz;
    const ux = f.u[0] * sx, uy = f.u[1] * sy, uz = f.u[2] * sz;
    const wx = f.w[0] * sx, wy = f.w[1] * sy, wz = f.w[2] * sz;
    const b = A.p.length / 3;
    A.p.push(ox, oy, oz, ox + ux, oy + uy, oz + uz,
             ox + ux + wx, oy + uy + wy, oz + uz + wz, ox + wx, oy + wy, oz + wz);
    for (let k = 0; k < 4; k++) { A.n.push(f.n[0], f.n[1], f.n[2]); A.c.push(col.r, col.g, col.b); }
    A.u.push(0, 0, 1, 0, 1, 1, 0, 1);
    A.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
}

/* ── LA MALLA DE UN MONTON DE BLOQUES ─────────────────────────────────────
   Una sola geometria para todo lo que no se mueve: con un `Mesh` por bloque,
   un diorama de doscientos bloques son doscientas llamadas de dibujo para
   cubos que ni siquiera se mueven.                                         */
function geoBloques(lista, ocupa, tinte, kt, blanco) {
  const A = { p: [], n: [], c: [], u: [], i: [] };
  const cbase = new T.Color(), ct = new T.Color(tinte);
  for (const b of lista) {
    const B = BLOQ[b.t];
    /* un tono por bloque, chiquito: sin esto una pared de veinte ladrillos
       iguales se lee a una lamina de un solo color y no a veinte ladrillos */
    const h = ((b.x * 73856093) ^ (b.y * 19349663) ^ (b.z * 83492791)) >>> 0;
    const jit = 1 + ((h % 1000) / 1000 - 0.5) * 0.075;
    for (const f of CARAS) {
      const ax = b.x + f.n[0], ay = b.y + f.n[1], az = b.z + f.n[2];
      if (ocupa(ax, ay, az)) continue;                 /* cara tapada: no existe */
      if (blanco) cbase.setRGB(1, 1, 1);
      /* SE SATURA EL COLOR DEL BLOQUE Y DESPUES SE TINE, NO AL REVES: el
         tinte de la paleta es atmosfera —acerca todo al color del cielo— y
         resaturando DESPUES se lo deshace. Medido en el nivel 20, cuya paleta
         es azul: con el orden al reves el ladrillo salia rosa chicle. */
      else { cbase.setHex(f.n[1] === 1 ? B.top : B.col); satura(cbase); if (kt > 0) cbase.lerp(ct, kt); }
      const cr = cbase.r * jit, cg = cbase.g * jit, cb = cbase.b * jit;
      const ao = [];
      for (let q = 0; q < 4; q++) {
        const a = (q === 1 || q === 2) ? 1 : -1, w = (q === 2 || q === 3) ? 1 : -1;
        const s1 = ocupa(ax + f.u[0] * a, ay + f.u[1] * a, az + f.u[2] * a) ? 1 : 0;
        const s2 = ocupa(ax + f.w[0] * w, ay + f.w[1] * w, az + f.w[2] * w) ? 1 : 0;
        const co = ocupa(ax + f.u[0] * a + f.w[0] * w, ay + f.u[1] * a + f.w[1] * w,
                         az + f.u[2] * a + f.w[2] * w) ? 1 : 0;
        ao.push(AO_F[(s1 && s2) ? 0 : 3 - (s1 + s2 + co)]);
      }
      const bi = A.p.length / 3;
      const ox = b.x + f.o[0], oy = b.y + f.o[1], oz = b.z + f.o[2];
      A.p.push(ox, oy, oz,
               ox + f.u[0], oy + f.u[1], oz + f.u[2],
               ox + f.u[0] + f.w[0], oy + f.u[1] + f.w[1], oz + f.u[2] + f.w[2],
               ox + f.w[0], oy + f.w[1], oz + f.w[2]);
      for (let q = 0; q < 4; q++) {
        A.n.push(f.n[0], f.n[1], f.n[2]);
        A.c.push(cr * ao[q], cg * ao[q], cb * ao[q]);
      }
      /* UNA UV POR CARA Y NO POR BLOQUE: el mapa se estira sobre cada cara
         suelta, asi que la junta cae exactamente en el borde del bloque sea
         cual sea el tamano del diorama.
         Y LA MITAD DE ARRIBA DE LA TEXTURA ES LA CARA DE ARRIBA: `flipY` deja
         la fila 0 del lienzo en v=1, o sea que la tapa pide v 0,5..1 y los
         costados v 0..0,5. Sin eso el pasto tendria briznas en los cuatro
         costados y tierra en la tapa. */
      const v0 = (f.n[1] === 1) ? 0.5 : 0, v1 = v0 + 0.5;
      A.u.push(0, v0, 1, v0, 1, v1, 0, v1);
      /* LA DIAGONAL SE DA VUELTA CUANDO CONVIENE: con la diagonal fija, un
         rincon en el que dos esquinas opuestas estan ocluidas sale con un
         pliegue torcido que se ve como un error de malla y no como sombra. */
      if (ao[0] + ao[2] > ao[1] + ao[3]) A.i.push(bi + 1, bi + 2, bi + 3, bi + 1, bi + 3, bi);
      else A.i.push(bi, bi + 1, bi + 2, bi, bi + 2, bi + 3);
    }
  }
  return armaGeo(A);
}
function armaGeo(A) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(A.p, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(A.n, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(A.c, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(A.u, 2));
  /* Uint32 y no Uint16: un diorama grande pasa de 65.535 vertices y el
     desborde no avisa — dibuja triangulos que apuntan a cualquier lado. */
  g.setIndex(new T.Uint32BufferAttribute(A.i, 1));
  g.computeBoundingSphere();
  return g;
}

/* ══════════════════════ EL ESCENARIO ══════════════════════ */
function escInit() {
  REN = new T.WebGLRenderer({ canvas: $('cv'), antialias: true, alpha: true });
  /* `info` SE PONE A CERO AL EMPEZAR CADA `render()`, Y LA SOMBRA ES OTRA
     PASADA DENTRO DE LA MISMA LLAMADA: leyendolo sin apagar el reset, lo que
     queda es solo la ultima pasada y apagar las sombras PARECE no cambiar
     nada. Medido: las tres calidades daban 12 llamadas y 224 triangulos.
     Ya habia costado una medicion en Z Force.                              */
  REN.info.autoReset = false;
  REN.setClearColor(0x000000, 0);          /* el fondo lo pone el CSS */
  REN.outputColorSpace = T.SRGBColorSpace;
  REN.shadowMap.type = T.PCFSoftShadowMap;
  ESC = new T.Scene();
  CAM = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 220);

  /* EL HEMISFERICO NO PUEDE TENER EL SUELO NEGRO: reparte segun hacia donde
     mira cada cara, asi que con el suelo en negro toda cara que mire para
     abajo recibe CERO y la panza del diorama desaparece.                   */
  ESC.add(new T.HemisphereLight(0xd6e8f2, 0x6e6b60, 0.78));
  LUZ = new T.DirectionalLight(0xfff2dd, 1.18);
  LUZ.position.set(17, 30, 13);
  ESC.add(LUZ); ESC.add(LUZ.target);
  aplicaCalidad();
}

function aplicaCalidad() {
  const C = CALIDADES[PROG.cal] || CALIDADES.media;
  REN.setPixelRatio(Math.min(window.devicePixelRatio || 1, C.px));
  REN.shadowMap.enabled = C.sombra > 0;
  if (C.sombra > 0) {
    LUZ.castShadow = true;
    /* LA TEXTURA VIEJA HAY QUE SOLTARLA A MANO: three no la recrea porque
       cambie `mapSize`, se queda con la de antes y el ajuste no hace nada. */
    if (LUZ.shadow.map) { LUZ.shadow.map.dispose(); LUZ.shadow.map = null; }
    LUZ.shadow.mapSize.set(C.sombra, C.sombra);
    LUZ.shadow.bias = -0.0012;
    LUZ.shadow.normalBias = 0.03;
  } else LUZ.castShadow = false;
  if (DIO) ajustaSombra();
  REN.shadowMap.needsUpdate = true;
}

/* ── EL ENCUADRE SE MIDE SOBRE DIECISEIS ANGULOS Y NO SOBRE EL DE AHORA ───
   Midiendo la silueta del angulo actual, el diorama se agranda y se achica
   mientras uno lo gira: parece que la camara hace zoom sola. Tomando el peor
   de una vuelta entera, el tamano queda quieto — y sigue siendo mucho mas
   ajustado que la esfera envolvente, que con una caja de 14x12x14 daria un
   encuadre casi del doble.                                                */
function midePeorEncuadre(el) {
  if (!DIO) return;
  const bb = DIO.caja, cy = (bb.min[1] + bb.max[1]) / 2;
  let mw = 0, mh = 0;
  for (let k = 0; k < 16; k++) {
    const yaw = k * Math.PI / 8;
    const dx = Math.cos(el) * Math.sin(yaw), dy = Math.sin(el), dz = Math.cos(el) * Math.cos(yaw);
    /* LA BASE DE LA CAMARA TAL COMO LA ARMA `lookAt`, y no una inventada: z
       es `d` (de la mira hacia la camara), x = normalizar(cross(arriba, z)) y
       recien de ahi sale y = cross(z, x). Escribiendo la Y a ojo el encuadre
       queda medido sobre otra camara que la que despues dibuja. */
    let rx = dz, rz = -dx;                      /* cross([0,1,0], d), con ry=0 */
    const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    const ax = dy * rz, ay = dz * rx - dx * rz, az = -dy * rx;   /* cross(d, r) */
    for (let i = 0; i < 8; i++) {
      const px = (i & 1 ? bb.max[0] : bb.min[0]) + DIO.ox;
      const py = (i & 2 ? bb.max[1] : bb.min[1]) - cy;
      const pz = (i & 4 ? bb.max[2] : bb.min[2]) + DIO.oz;
      const cx = px * rx + pz * rz;
      const cyv = px * ax + py * ay + pz * az;
      if (Math.abs(cx) > mw) mw = Math.abs(cx);
      if (Math.abs(cyv) > mh) mh = Math.abs(cyv);
    }
  }
  ENC_W = mw * 1.06; ENC_H = mh * 1.16;
  DIO.mira = cy;
  DIO.radio = Math.hypot(mw, mh);
}
function encuadra() {
  const a = ANCHO / ALTO;
  let hw = ENC_W, hh = ENC_H;
  if (hw / hh > a) hh = hw / a; else hw = hh * a;
  CAM.left = -hw; CAM.right = hw; CAM.top = hh; CAM.bottom = -hh;
  CAM.near = 0.5; CAM.far = CAM_DIST * 2.6;
  CAM.updateProjectionMatrix();
}
function ponCam() {
  const cy = DIO ? DIO.mira : 4;
  const dx = Math.cos(CAM_EL) * Math.sin(CAM_YAW), dy = Math.sin(CAM_EL),
        dz = Math.cos(CAM_EL) * Math.cos(CAM_YAW);
  CAM.position.set(dx * CAM_DIST, cy + dy * CAM_DIST, dz * CAM_DIST);
  CAM.up.set(0, 1, 0);
  CAM.lookAt(0, cy, 0);
  CAM.updateMatrixWorld();
  cieloAjusta();
}
function medir() {
  const m = $('marco').getBoundingClientRect();
  ANCHO = Math.max(1, Math.round(m.width)); ALTO = Math.max(1, Math.round(m.height));
  /* `--mw` es el ANCHO DEL MARCO y no `vw`: en apaisado el marco es una
     columna angosta y `vw` es la ventana entera, o sea que el titulo se
     saldria de la columna. */
  document.documentElement.style.setProperty('--mw', ANCHO + 'px');
  REN.setSize(ANCHO, ALTO, false);
  encuadra(); ponCam(); cieloAjusta();
}

/* la caja de sombra se ajusta al diorama: con una del tamano del mundo, la
   resolucion del mapa se reparte sobre metros que no se ven y el contorno
   de la sombra sale hecho un peine */
function ajustaSombra() {
  if (!LUZ.castShadow || !DIO) return;
  const r = DIO.radio * 1.12, cy = DIO.mira;
  LUZ.position.set(17, 30 + cy, 13);
  LUZ.target.position.set(0, cy, 0); LUZ.target.updateMatrixWorld();
  const s = LUZ.shadow.camera;
  s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.near = 1; s.far = 90;
  s.updateProjectionMatrix();
}

/* ══════════════════════ EL DIORAMA ══════════════════════ */
function soltaDiorama() {
  if (!DIO) return;
  DIO.grupo.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
  ESC.remove(DIO.grupo);
  DIO = null;
}

function construyeDiorama(M) {
  soltaDiorama();
  const grupo = new T.Group();
  const pi = (M.paleta || 0) % PALETAS.length, pal = PALETAS[pi];

  /* lo que ocluye y tapa caras: los bloques enteros del mundo BASE. Los
     mecanismos NO entran — se mueven, asi que hornear su oclusion en la malla
     estatica seria hornear una sombra que despues no esta donde se dibujo. */
  const lleno = t => t !== VACIO && !BLOQ[t].fina && !BLOQ[t].vidrio;
  const ocupaOp = (x, y, z) => lleno(tipoBase(M, x, y, z));
  const ocupaVi = (x, y, z) => { const t = tipoBase(M, x, y, z); return t !== VACIO && !BLOQ[t].fina; };

  const op = [], vi = [], esc = [];
  const bb = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
  const met = c => { for (let k = 0; k < 3; k++) { if (c[k] < bb.min[k]) bb.min[k] = c[k]; if (c[k] + 1 > bb.max[k]) bb.max[k] = c[k] + 1; } };
  for (let y = 0; y < M.ny; y++) for (let z = 0; z < M.nz; z++) for (let x = 0; x < M.nx; x++) {
    const t = tipoBase(M, x, y, z);
    if (t === VACIO) continue;
    met([x, y, z]);
    if (t === ESCALERA) esc.push({ x, y, z });
    else if (BLOQ[t].vidrio) vi.push({ x, y, z, t });
    else op.push({ x, y, z, t });
  }
  for (const m of M.mec) for (const c of m.cel) { met(c); met([c[0] + m.dir[0] * m.pasos, c[1] + m.dir[1] * m.pasos, c[2] + m.dir[2] * m.pasos]); }
  if (bb.min[0] > bb.max[0]) { bb.min = [0, 0, 0]; bb.max = [M.nx, M.ny, M.nz]; }

  /* EL DIORAMA SE CENTRA EN SUS BLOQUES Y NO EN LA REJA. La camara mira al
     origen, asi que centrando en la reja —que casi nunca esta llena— la mitad
     del encuadre es aire: medido en el nivel 0, con la reja de 10x8x10 y los
     bloques ocupando 2x4x3, el diorama ocupaba el 25,7% del ancho del cuadro.
     Y no se puede hacer antes de recorrer la reja, porque la caja de los
     bloques es justamente lo que se acaba de medir.                        */
  const ox = -(bb.min[0] + bb.max[0]) / 2, oz = -(bb.min[2] + bb.max[2]) / 2;
  grupo.position.set(ox, 0, oz);

  /* UNA MALLA POR TIPO DE BLOQUE, y no una sola para todo lo opaco: cada
     tipo tiene su textura, y una textura por tipo son tres o cuatro llamadas
     de dibujo por nivel (medido) contra la unica de antes. Con un atlas serian
     una sola llamada y el mipmap mezclaria la baldosa de al lado en cuanto la
     camara se aleja — y aca un bloque mide unos treinta pixeles.
     LA OCLUSION SIGUE SIENDO GLOBAL (`ocupaOp`): las caras que se tapan entre
     bloques de tipos distintos se siguen descartando igual. */
  const porTipo = new Map();
  for (const b of op) { let l = porTipo.get(b.t); if (!l) porTipo.set(b.t, l = []); l.push(b); }
  const mOps = [];
  for (const [t, lista] of porTipo) {
    const m = new T.Mesh(geoBloques(lista, ocupaOp, pal.t, pal.k),
      new T.MeshLambertMaterial({ vertexColors: true, map: texBloque(t) }));
    m.castShadow = true; m.receiveShadow = true;
    grupo.add(m); mOps.push(m);
  }

  let mVi = null;
  if (vi.length) {
    mVi = new T.Mesh(geoBloques(vi, ocupaVi, pal.t, pal.k),
      new T.MeshLambertMaterial({ vertexColors: true, map: texBloque(VIDRIO), transparent: true, opacity: 0.42 }));
    mVi.receiveShadow = true;
    grupo.add(mVi);
  }

  /* LA ESCALERA NO ES UN CUBO: si se dibujara llena, la unica cosa del juego
     que se atraviesa se veria como una pared. Un poste con travesanos dice
     «esto se trepa» sin una linea de reglas nueva.                         */
  let mEsc = null;
  if (esc.length) {
    const A = { p: [], n: [], c: [], u: [], i: [] };
    const cE = new T.Color(BLOQ[ESCALERA].col);
    if (pal.k > 0) cE.lerp(new T.Color(pal.t), pal.k);
    for (const c of esc) {
      empujaCaja(A, c.x + 0.5, c.y + 0.5, c.z + 0.5, 0.15, 1.0, 0.15, cE);
      for (const dy of [0.22, 0.55, 0.88])
        empujaCaja(A, c.x + 0.5, c.y + dy, c.z + 0.5, 0.62, 0.085, 0.085, cE);
    }
    mEsc = new T.Mesh(armaGeo(A), new T.MeshLambertMaterial({ vertexColors: true }));
    mEsc.castShadow = true; mEsc.receiveShadow = true;
    grupo.add(mEsc);
  }

  /* ── LOS MECANISMOS ───────────────────────────────────────────────────
     Naranja, que es el unico color de todo el diorama que no le toca a nada
     mas: cual es la pieza que se toca tiene que leerse de una ojeada y sin
     un rotulo. Y cada uno lleva su RIEL, que dice hasta donde llega — sin
     eso, tocarla es una apuesta.                                          */
  const mecs = [];
  const cMec = new T.Color(0xe08a34), cRiel = new T.Color(0x5b6670);
  for (let i = 0; i < M.mec.length; i++) {
    const m = M.mec[i];
    const g = new T.Group();
    const lista = m.cel.map(c => ({ x: c[0], y: c[1], z: c[2], t: m.bloq }));
    const set = new Set(m.cel.map(c => c[0] + ',' + c[1] + ',' + c[2]));
    const oc = (x, y, z) => set.has(x + ',' + y + ',' + z);
    /* LA GEOMETRIA SALE BLANCA Y EL COLOR LO PONE EL MATERIAL: three
       multiplica `material.color x vertexColor`, asi que con el color del
       bloque tambien en los vertices la pieza saldria color barro. Blanca,
       lo que viaja en los vertices es SOLO la oclusion, y el naranja la
       hereda con sus pliegues puestos. */
    const geo = geoBloques(lista, oc, 0xffffff, 0, true);
    const ml = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, map: texBloque(METAL), color: cMec }));
    ml.castShadow = true; ml.receiveShadow = true;
    ml.userData.mec = i;
    g.add(ml);
    grupo.add(g);

    const A = { p: [], n: [], c: [], u: [], i: [] };
    for (const c of m.cel) {
      const cx = c[0] + 0.5, cy = c[1] + 0.5, cz = c[2] + 0.5;
      const lx = m.dir[0] * m.pasos, ly = m.dir[1] * m.pasos, lz = m.dir[2] * m.pasos;
      if (m.dir[1] !== 0) {
        empujaCaja(A, cx, cy + ly / 2, cz, 0.17, Math.abs(ly) + 0.17, 0.17, cRiel);
      } else {
        /* el riel horizontal cuelga por DEBAJO de la losa: adentro no se
           veria nunca, y el hueco es vacio hasta abajo, asi que ahi si */
        empujaCaja(A, cx + lx / 2, c[1] - 0.06, cz + lz / 2,
          Math.abs(lx) + 0.30, 0.12, Math.abs(lz) + 0.30, cRiel);
      }
    }
    const mr = new T.Mesh(armaGeo(A), new T.MeshLambertMaterial({ vertexColors: true }));
    mr.receiveShadow = true;
    grupo.add(mr);
    mecs.push({ g, malla: ml, dir: m.dir, eVis: 0 });
  }

  /* la meta: el bloque ya es dorado, pero a la distancia a la que se mira un
     diorama un color no alcanza. El rombo flotando es lo que dice «aca» */
  const metaG = new T.Group();
  metaG.position.set(M.meta[0] + 0.5, M.meta[1] + 0.62, M.meta[2] + 0.5);
  const rombo = new T.Mesh(new T.OctahedronGeometry(0.20),
    new T.MeshBasicMaterial({ color: 0xf3bb3e, toneMapped: false }));
  metaG.add(rombo);
  grupo.add(metaG);

  /* la marca del destino: un cuadro fino en el piso de la celda a la que el
     robot va. Un toque que no produce nada visible se lee a toque perdido. */
  const marA = { p: [], n: [], c: [], u: [], i: [] };
  const cMar = new T.Color(0xffffff);
  for (const [a, b, sx, sz] of [[0, -0.44, 0.88, 0.08], [0, 0.44, 0.88, 0.08],
                                [-0.44, 0, 0.08, 0.88], [0.44, 0, 0.08, 0.88]])
    empujaCaja(marA, a, 0.03, b, sx, 0.05, sz, cMar);
  const marca = new T.Mesh(armaGeo(marA),
    new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, toneMapped: false }));
  marca.visible = false;
  grupo.add(marca);

  ESC.add(grupo);
  DIO = { M, grupo, ox, oz, caja: bb, mOps, mVi, mEsc, mecs, metaG, rombo, marca, marT: 0,
          mira: 0, radio: 8, pal,
          blancos: mOps.concat([mEsc, mVi].filter(Boolean)).concat(mecs.map(o => o.malla)) };
  midePeorEncuadre(CAM_EL);
  encuadra(); ponCam(); ajustaSombra();
  fondoDe(pi);
  for (let i = 0; i < mecs.length; i++) mecPone(i, 0);
  return DIO;
}
function fondoDe(pi) {
  const pal = PALETAS[pi];
  /* el degradado de CSS NO SE VA: es lo que se ve mientras el modulo carga y
     en el primer cuadro, antes de que haya escena. El cielo lo pisa despues. */
  $('marco').style.background = 'linear-gradient(180deg,' + pal.cielo[0] + ' 0%,' +
    pal.cielo[1] + ' 42%,' + pal.cielo[2] + ' 78%,' + pal.cielo[3] + ' 100%)';
  ESC.background = cieloTex(pi);
  cieloAjusta();
}
function mecPone(i, e) {
  const o = DIO.mecs[i]; if (!o) return;
  o.eVis = e;
  o.g.position.set(o.dir[0] * e, o.dir[1] * e, o.dir[2] * e);
}

/* ── DE LA REJA AL MUNDO Y DE VUELTA ──────────────────────────────────────
   Una sola pareja de funciones para los dos sentidos: con dos cuentas
   sueltas, el robot se dibuja en un sitio y el dedo apunta a otro.        */
function posDe(x, y, z) { return new T.Vector3(x + 0.5 + DIO.ox, y, z + 0.5 + DIO.oz); }

const RAY = new T.Raycaster();
const NDC = new T.Vector2();
function tocaEn(cx, cy) {
  if (!DIO) return null;
  /* LAS MATRICES SE PONEN AL DIA ACA Y NO SE HEREDAN DEL ULTIMO DIBUJO: three
     las recalcula al renderizar, asi que un rayo tirado antes del primer
     cuadro —o desde una sonda que no dibuja— apunta a donde estaban las cosas
     antes. Ya costo una vuelta en ROTOR. */
  ESC.updateMatrixWorld(true);
  const r = $('cv').getBoundingClientRect();
  NDC.x = ((cx - r.left) / r.width) * 2 - 1;
  NDC.y = -((cy - r.top) / r.height) * 2 + 1;
  RAY.setFromCamera(NDC, CAM);
  const hs = RAY.intersectObjects(DIO.blancos, false);
  if (!hs.length) return null;
  const h = hs[0];
  const n = h.face.normal.clone();
  /* el grupo del mecanismo solo se TRASLADA, asi que la normal local ya es la
     del mundo; igual se transforma, que es lo correcto y cuesta nada */
  n.transformDirection(h.object.matrixWorld).round();
  const p = h.point.clone().sub(DIO.grupo.position);
  /* medio bloque HACIA ADENTRO desde el punto de impacto cae siempre en el
     centro de la celda tocada, sea cual sea la cara */
  const cel = [Math.floor(p.x - n.x * 0.5), Math.floor(p.y - n.y * 0.5), Math.floor(p.z - n.z * 0.5)];
  return { cel, n: [n.x, n.y, n.z], mec: h.object.userData.mec != null ? h.object.userData.mec : -1 };
}

function marcaEn(cel) {
  if (!DIO) return;
  DIO.marca.position.set(cel[0] + 0.5, cel[1], cel[2] + 0.5);
  DIO.marca.visible = true; DIO.marT = 0.55;
}

/* ── LA ORBITA ────────────────────────────────────────────────────────────
   La elevacion esta topada arriba y abajo: por debajo del minimo se ve el
   diorama de canto y no se distingue una altura de otra; por encima se ve de
   arriba y desaparece justo lo que este juego tiene, que es el alto.      */
function giraCam(dx, dy) {
  CAM_YAW -= dx * 0.0075;
  const e0 = CAM_EL;
  CAM_EL = cl(CAM_EL + dy * 0.0055, CAM_EL_MIN, CAM_EL_MAX);
  if (Math.abs(CAM_EL - e0) > 1e-6) { midePeorEncuadre(CAM_EL); encuadra(); }
  ponCam();
}

function escPaso(dt) {
  if (!DIO) return;
  DIO.rombo.rotation.y += dt * 1.7;
  DIO.metaG.position.y = DIO.M.meta[1] + 0.62 + Math.sin(performance.now() * 0.0026) * 0.09;
  if (DIO.marT > 0) {
    DIO.marT -= dt;
    DIO.marca.material.opacity = cl(DIO.marT / 0.55, 0, 1) * 0.85;
    if (DIO.marT <= 0) DIO.marca.visible = false;
  }
}
function escDibuja() { REN.info.reset(); REN.render(ESC, CAM); }
function escCosto() {
  const i = REN.info.render;
  return { llamadas: i.calls, triangulos: i.triangles, cal: PROG.cal,
           px: +REN.getPixelRatio().toFixed(2), w: ANCHO, h: ALTO };
}
