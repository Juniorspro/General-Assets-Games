/* ══════════════════════════ RASPÁ ══════════════════════════
   Una superficie sucia y el dedo la limpia. Cuando está limpia, aparece otra.

   ES EL MOLDE TÁCTIL, el de *Beauty Salon* — uno de los catorce que TikTok
   tiene en prueba, donde se depila y se cortan uñas. Funciona porque no se
   gana ni se pierde con destreza: se gana ENSUCIÁNDOSE LAS MANOS, y lo que se
   filma es la superficie apareciendo. Es el único de los cinco que se puede
   jugar sin mirar el marcador.

   Y ACÁ HAY UNA DECISIÓN TÉCNICA QUE ORDENA TODO: la suciedad NO ES un dibujo
   que se tapa, es una MÁSCARA que se borra. Se dibuja la superficie limpia,
   encima la capa de mugre en un lienzo aparte, y el dedo borra con
   `destination-out`. Así lo que aparece es la superficie de verdad y no una
   imitación — y el borde de lo raspado queda con la forma exacta del dedo, que
   es justo lo que hace que se sienta táctil.

   EL PORCENTAJE NO SE MIDE LEYENDO PÍXELES. `getImageData` sobre la máscara
   cada cuadro son cientos de miles de bytes por cuadro para calcular un número
   que cambia poco; se lleva una grilla gruesa de celdas y se marcan las que el
   pincel tocó. Es exacto para lo que hace falta —decidir cuándo está limpia— y
   cuesta una división. */

const JT = {
  es: { sub: 'Pasá el dedo. Dejalo limpio.\nCuando termina uno, viene otro.',
        limpio: 'LIMPIO', placa: 'PLACA',
        c1: 'Alguien dejó esto así.',
        c2: 'Y se fue.',
        c3: 'Pasá el dedo.' },
  en: { sub: 'Drag your finger. Get it clean.\nWhen one is done, the next shows up.',
        limpio: 'CLEAN', placa: 'PLATE',
        c1: 'Somebody left this like that.',
        c2: 'And walked away.',
        c3: 'Drag your finger.' },
  pt: { sub: 'Passe o dedo. Deixe limpo.\nQuando acaba um, vem outro.',
        limpio: 'LIMPO', placa: 'PLACA',
        c1: 'Alguém deixou isso assim.',
        c2: 'E foi embora.',
        c3: 'Passe o dedo.' }
};

/* ── LAS CUATRO SUCIEDADES ──
   Cada una tiene su color, su grano y su superficie debajo. Con una sola, la
   placa cinco se ve igual que la uno y el juego se termina en la cabeza del
   jugador antes de terminarse en la pantalla. */
/* la piel del menú y el sonido generado del raspado */
const PIEL = { ac: '#c8945a', tela: 'fondo' };
const SON_ALIAS = { raspa: 'raspa' };

/* ── LAS CUATRO SUCIEDADES PASAN A SER FOTOS ──
   `sup` y `sucio` nombran las texturas generadas —la superficie limpia de abajo
   y la capa de mugre de encima— y los colores se quedan como respaldo. Que la
   superficie que aparece sea una FOTO y no un rectángulo de color es el juego
   entero: lo que el jugador filma es lo que aparece debajo del dedo. */
const MUGRE = [
  { id: 'sarro',  mugre: '#8a8f7a', base: '#cfd4d8', vetas: '#6f7462', sup: 's0', sucio: 'm0' },
  { id: 'oxido',  mugre: '#7a4a2c', base: '#9aa0a6', vetas: '#5c3520', sup: 's1', sucio: 'm1' },
  { id: 'pintura',mugre: '#3f6f8f', base: '#c8bda8', vetas: '#2d5169', sup: 's2', sucio: 'm0' },
  { id: 'barro',  mugre: '#5a4632', base: '#d8cbb4', vetas: '#40311f', sup: 's0', sucio: 'm1' }
];

/* la placa: la zona raspable. Se calcula del alto de diseño porque el alto
   depende de la pantalla. */
const MARGEN = 46;
function zona(){
  const y0 = 210, y1 = AL - 210;
  return { x: MARGEN, y: y0, w: AN - MARGEN*2, h: y1 - y0 };
}

/* la grilla de celdas con la que se mide. 28 px de lado: más grueso que eso y
   la placa se da por limpia con manchas visibles; más fino y son miles de
   celdas para nada. */
const CEL = 28;

const S = {
  placa: 1, tipo: 0, t: 0, limite: 22,
  cap: null, gc: null,            /* el lienzo de la mugre */
  cols: 0, filas: 0, lim: null,   /* la grilla de limpio */
  total: 0, hechas: 0, pct: 0,
  ult: null, brillo: 0, pasada: 0
};

const JUEGO = {
  id: 'raspa', vivo: false, gano: false, marca: 0, resta: null,

  planos: [
    { dur: 2.4, pie: 'c1', dibuja: (g, u) => { fondoRaspa(g); placaCine(g, 1); } },
    { dur: 2.2, pie: 'c2', dibuja: (g, u) => { fondoRaspa(g); placaCine(g, 1); } },
    { dur: 2.8, pie: 'c3', dibuja: (g, u) => {
        fondoRaspa(g);
        /* el dedo pasa y deja una franja limpia: el juego contado sin palabras */
        placaCine(g, 1 - suave(Math.min(1, u*1.2))*0.55);
        const z = zona();
        const px = z.x + z.w*0.18 + z.w*0.64*suave(Math.min(1, u*1.2));
        disco(px, z.y + z.h*0.5, 46, 'rgba(242,238,230,.14)');
        disco(px, z.y + z.h*0.5, 22, 'rgba(242,238,230,.28)');
      } }
  ],

  arranca(){
    S.placa = 1; S.t = 0; S.limite = 22; S.brillo = 0; S.pasada = 0;
    nuevaPlaca();
    JUEGO.vivo = true; JUEGO.gano = false; JUEGO.marca = 0;
  },

  paso(dt){
    S.t += dt;
    if (S.brillo > 0) S.brillo -= dt*2;
    JUEGO.resta = 1 - S.t / S.limite;
    if (S.t >= S.limite){ JUEGO.vivo = false; JUEGO.gano = S.placa > 3; }
  },

  fondo(g){
    if (dibCubre('fondo')){
      g.fillStyle = 'rgba(9,9,13,.40)'; g.fillRect(0, 0, AN, AL);
    } else fondoRaspa(g);
  },

  pinta(g){
    const z = zona();
    /* la superficie limpia, abajo */
    superficie(g, z);
    /* la mugre, encima, con el agujero ya borrado */
    if (S.cap) g.drawImage(S.cap, z.x, z.y, z.w, z.h);
    /* el marco de la placa: es lo que la separa del fondo y dice dónde se puede
       raspar. Sin marco, el jugador raspa afuera y no entiende por qué no pasa
       nada. */
    caja2(z.x - 6, z.y - 6, z.w + 12, z.h + 12, 14, null, 'rgba(242,238,230,.16)');
    texto(TX('placa') + ' ' + S.placa + '  ·  ' + Math.round(S.pct*100) + '% ' + TX('limpio'),
          360, z.y - 44, 24, 'rgba(242,238,230,.48)');
    if (S.brillo > 0){
      g.globalAlpha = Math.min(1, S.brillo)*0.5;
      caja2(z.x - 6, z.y - 6, z.w + 12, z.h + 12, 14, null, '#8fd6a8');
      g.globalAlpha = 1;
    }
  },

  baja(x, y){ S.ult = null; raspa(x, y); },
  mueve(x, y){ raspa(x, y); },
  sube(){ S.ult = null; },

  /* ── LOS DOS AUTO-JUGADORES, Y ACÁ LA DIFERENCIA NO ES DECIDIR ──
     Este juego no tiene una decisión que tomar: tiene una forma de moverse. El
     honesto BARRE en zigzag, que es lo que hace un dedo que quiere terminar; el
     del azar PICOTEA puntos sueltos. Los dos limpian, pero uno llega y el otro
     no — y sin esa comparación no habría forma de saber si el porcentaje mide
     cómo se juega o simplemente el tiempo que pasó. */
  juegaSolo(n, azar){
    JUEGO.arranca();
    const z = zona();
    let v = 0;
    if (azar){
      while (JUEGO.vivo && v < n){
        S.ult = null;
        raspa(z.x + Math.random()*z.w, z.y + Math.random()*z.h);
        JUEGO.paso(1/60);
        v++;
      }
      return { vueltas: v, puntos: PUNTOS, placa: S.placa,
               pct: +S.pct.toFixed(3), vivo: JUEGO.vivo, resta: +JUEGO.resta.toFixed(3) };
    }
    while (JUEGO.vivo && v < n){
      const fil = 22;
      for (let f = 0; f < fil && JUEGO.vivo; f++){
        const y = z.y + (f + 0.5)*z.h/fil;
        const ida = f % 2 === 0;
        S.ult = null;
        for (let i = 0; i <= 30; i++){
          const q = ida ? i/30 : 1 - i/30;
          raspa(z.x + q*z.w, y);
        }
        JUEGO.paso(1/60);
        v++;
      }
    }
    return { vueltas: v, puntos: PUNTOS, placa: S.placa,
             pct: +S.pct.toFixed(3), vivo: JUEGO.vivo, resta: +JUEGO.resta.toFixed(3) };
  }
};

/* ══════════════════════ LA PLACA ══════════════════════ */
function nuevaPlaca(){
  const z = zona();
  S.tipo = (Math.random()*MUGRE.length)|0;
  S.cols = Math.ceil(z.w / CEL); S.filas = Math.ceil(z.h / CEL);
  S.total = S.cols * S.filas;
  S.lim = new Uint8Array(S.total);
  S.hechas = 0; S.pct = 0;
  /* el lienzo de la mugre, a la resolución de la zona. Se rehace por placa y no
     por cuadro: crear un lienzo cuesta, borrar un agujero no. */
  S.cap = document.createElement('canvas');
  S.cap.width = Math.round(z.w); S.cap.height = Math.round(z.h);
  S.gc = S.cap.getContext('2d');
  pintaMugre(S.gc, S.cap.width, S.cap.height, MUGRE[S.tipo]);
}

function pintaMugre(c, w, h, m){
  c.clearRect(0, 0, w, h);
  /* ── LA FOTO DE MUGRE PRIMERO, Y EL PATRÓN VA EN EL LIENZO DE LA MUGRE ──
     El patrón se crea con el contexto DE ESE LIENZO y no con el del juego:
     `createPattern` devuelve un objeto atado al contexto que lo creó, y usado
     en otro no pinta nada. */
  const o = IMG[m.sucio];
  if (o && o.ok){
    const pt = c.createPattern(o.im, 'repeat');
    if (pt){
      c.fillStyle = pt; c.fillRect(0, 0, w, h);
      /* un tinte suave por suciedad: las dos fotos se reparten entre cuatro
         placas, así que sin esto la placa 1 y la 4 son la misma imagen */
      c.globalAlpha = 0.26; c.fillStyle = m.mugre; c.fillRect(0, 0, w, h);
      c.globalAlpha = 1;
      return;
    }
  }
  c.fillStyle = m.mugre; c.fillRect(0, 0, w, h);
  /* manchones y vetas: una capa de un color plano se lee a rectángulo de color
     y raspar deja de tener textura que sacar */
  for (let i = 0; i < 70; i++){
    const x = Math.random()*w, y = Math.random()*h, r = 18 + Math.random()*70;
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, m.vetas + '');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = 0.10 + Math.random()*0.22;
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  const d = c.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4){
    const v = (Math.random() - 0.5) * 26;
    p[i] += v; p[i+1] += v; p[i+2] += v;
  }
  c.putImageData(d, 0, 0);
}

/* ── EL PINCEL BORRA UN TRAZO Y NO UN PUNTO ──
   Con un punto por evento, moviendo el dedo rápido quedan islas de mugre
   entre punto y punto: en la pantalla se ve como que el dedo «no agarra». Se
   borra la LÍNEA desde donde estaba hasta donde está, que es exactamente lo que
   hizo el dedo. */
const PINCEL = 54;
function raspa(x, y){
  if (!S.gc || !JUEGO.vivo) return;
  const z = zona();
  const lx = x - z.x, ly = y - z.y;
  if (lx < -PINCEL || ly < -PINCEL || lx > z.w + PINCEL || ly > z.h + PINCEL){ S.ult = null; return; }
  const c = S.gc;
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.lineWidth = PINCEL; c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = '#000';
  c.beginPath();
  if (S.ult){ c.moveTo(S.ult.x, S.ult.y); c.lineTo(lx, ly); }
  else { c.moveTo(lx, ly); c.lineTo(lx + 0.01, ly); }
  c.stroke();
  c.restore();
  marca(S.ult ? S.ult.x : lx, S.ult ? S.ult.y : ly, lx, ly);
  S.ult = { x: lx, y: ly };
  S.pasada += 1;
  if (S.pasada % 5 === 0) son('raspa', 0.9);
  if (S.pct >= 0.94) placaLista();
}

/* marca en la grilla las celdas que el trazo tocó. Se recorre el segmento a
   pasos de media celda: con pasos de una celda entera, un trazo diagonal se
   saltea celdas y el porcentaje queda corto para siempre. */
function marca(x0, y0, x1, y1){
  const d = Math.hypot(x1-x0, y1-y0);
  const n = Math.max(1, Math.ceil(d / (CEL*0.5)));
  const r = PINCEL/2;
  for (let s = 0; s <= n; s++){
    const x = x0 + (x1-x0)*s/n, y = y0 + (y1-y0)*s/n;
    const i0 = Math.max(0, Math.floor((x - r)/CEL)), i1 = Math.min(S.cols-1, Math.floor((x + r)/CEL));
    const j0 = Math.max(0, Math.floor((y - r)/CEL)), j1 = Math.min(S.filas-1, Math.floor((y + r)/CEL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){
      const cx = (i + 0.5)*CEL, cy = (j + 0.5)*CEL;
      if (Math.hypot(cx - x, cy - y) > r) continue;
      const k = j*S.cols + i;
      if (!S.lim[k]){ S.lim[k] = 1; S.hechas++; }
    }
  }
  S.pct = S.hechas / S.total;
}

function placaLista(){
  /* ── SE DA POR LIMPIA EN EL 94 % Y NO EN EL 100 ──
     Las esquinas de la placa las cubre el pincel a medias, así que exigir el
     100 % obliga a raspar el borde con precisión de píxel — que es lo contrario
     de un juego táctil. Con 94 %, las cuatro esquinas se perdonan y todo lo que
     se ve como mugre hay que sacarlo. */
  S.placa++;
  PUNTOS = S.placa - 1; JUEGO.marca = PUNTOS;
  son('bien');
  S.brillo = 1;
  fogonazo(0.12);
  /* cada placa da tiempo, así que jugar bien alarga la partida en vez de
     acortarla: es la única forma de que un juego con reloj no castigue al que
     va bien */
  S.limite += 7.5;
  nuevaPlaca();
}

/* ══════════════════════ EL DIBUJO ══════════════════════ */
function fondoRaspa(g){
  const d = g.createLinearGradient(0, 0, 0, AL);
  d.addColorStop(0, '#14141c'); d.addColorStop(1, '#1c1c26');
  g.fillStyle = d; g.fillRect(0, 0, AN, AL);
  grano(0, 0, AN, AL, 0.02, 50);
}

/* la superficie de abajo: azulejo con junta. La junta es lo único que da
   escala, y sin escala una placa limpia se ve como un rectángulo de color. */
function superficie(g, z){
  const m = MUGRE[S.tipo];
  g.save();
  g.beginPath(); g.rect(z.x, z.y, z.w, z.h); g.clip();
  /* la foto de la superficie limpia. Si llegó, se va sin dibujar la junta a
     mano: la foto ya trae la suya, y dos juntas superpuestas se ven a cuadros
     sobre cuadros. */
  const pt = patron(m.sup);
  if (pt){
    g.save();
    g.translate(z.x, z.y);
    g.fillStyle = pt; g.fillRect(0, 0, z.w, z.h);
    g.restore();
    const br2 = g.createLinearGradient(z.x, z.y, z.x + z.w, z.y + z.h);
    br2.addColorStop(0, 'rgba(255,255,255,.10)');
    br2.addColorStop(0.5, 'rgba(255,255,255,0)');
    br2.addColorStop(1, 'rgba(255,255,255,.06)');
    g.fillStyle = br2; g.fillRect(z.x, z.y, z.w, z.h);
    g.restore();
    return;
  }
  g.fillStyle = m.base; g.fillRect(z.x, z.y, z.w, z.h);
  const p = 104;
  g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 5;
  for (let x = z.x; x <= z.x + z.w + p; x += p){
    g.beginPath(); g.moveTo(x, z.y); g.lineTo(x, z.y + z.h); g.stroke();
  }
  for (let y = z.y; y <= z.y + z.h + p; y += p){
    g.beginPath(); g.moveTo(z.x, y); g.lineTo(z.x + z.w, y); g.stroke();
  }
  /* el brillo del azulejo, en diagonal: es lo que dice «esto está limpio» */
  const br = g.createLinearGradient(z.x, z.y, z.x + z.w, z.y + z.h);
  br.addColorStop(0, 'rgba(255,255,255,.10)');
  br.addColorStop(0.5, 'rgba(255,255,255,0)');
  br.addColorStop(1, 'rgba(255,255,255,.06)');
  g.fillStyle = br; g.fillRect(z.x, z.y, z.w, z.h);
  g.restore();
}

/* la placa de la cinemática, con `k` de mugre (1 = toda sucia) */
function placaCine(g, k){
  const z = zona();
  const m = MUGRE[0];
  g.save();
  g.beginPath(); g.rect(z.x, z.y, z.w, z.h); g.clip();
  g.fillStyle = m.base; g.fillRect(z.x, z.y, z.w, z.h);
  g.globalAlpha = Math.max(0, Math.min(1, k));
  g.fillStyle = m.mugre; g.fillRect(z.x, z.y, z.w, z.h);
  for (let i = 0; i < 40; i++){
    const x = z.x + Math.random()*z.w, y = z.y + Math.random()*z.h;
    disco(x, y, 14 + Math.random()*54, 'rgba(80,72,58,.22)');
  }
  g.globalAlpha = 1;
  g.restore();
  caja2(z.x - 6, z.y - 6, z.w + 12, z.h + 12, 14, null, 'rgba(242,238,230,.16)');
}
