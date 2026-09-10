
/* ══════════════════════════════════════════════════════════════════════════
   C · EL MUNDO DE VOXELES Y LOS DOCE DUELOS

   El mundo es una silueta 2D en XY extruida NZ celdas en profundidad, y la
   flecha vuela por el plano del medio. Eso no es una concesion: en un tiro
   parabolico lo unico que importa son dos ejes, y hacerlo tridimensional de
   verdad obligaria al jugador a acertar una PROFUNDIDAD, que es exactamente
   lo que una pantalla plana y un dedo no pueden dar. Lo tridimensional es el
   dibujo — el volumen de los bloques, el canto de las mesetas, la sombra —
   no la mecanica.                                                          */

function nuevoMundo(nx, ny, nz) {
  return { nx, ny, nz, v: new Uint8Array(nx * ny * nz) };
}
const iM = (M, x, y, z) => (y * M.nz + z) * M.nx + x;
function en(M, x, y, z) {
  if (x < 0 || y < 0 || z < 0 || x >= M.nx || y >= M.ny || z >= M.nz) return VACIO;
  return M.v[iM(M, x, y, z)];
}
function pon(M, x, y, z, t) {
  if (x < 0 || y < 0 || z < 0 || x >= M.nx || y >= M.ny || z >= M.nz) return;
  M.v[iM(M, x, y, z)] = t;
}
/* la altura de una columna: la primera celda vacia contando desde arriba */
function altura(M, x) {
  for (let y = M.ny - 1; y >= 0; y--) if (en(M, x, y, ZC) !== VACIO) return y + 1;
  return 0;
}

/* ── LOS BIOMAS ───────────────────────────────────────────────────────── */
const BIOMAS = {
  pradera:  { base: TIERRA, sup: PASTO, pal: 0 },
  desierto: { base: ARENA,  sup: ARENA, pal: 1 },
  monte:    { base: PIEDRA, sup: NIEVE, pal: 2 },
  bosque:   { base: TIERRA, sup: PASTO, pal: 3 },
};

/* ── LOS DOCE DUELOS ──────────────────────────────────────────────────────
   Lo que sube no es «la vida del rival» sino TRES cosas que cambian lo que
   hay que decidir: cuanto empuja el viento, cuanto tapa el terreno y cuanto
   acierta el otro. Subir vida nada mas alarga el duelo sin agregar una sola
   decision — y este juego dura lo que dura un duelo.                       */
const DUELO = [
  { sem: 1101, bio: 'pradera',  forma: 'llano',   viento: 0,    prec: 0.26, rival: 'TITO'    },
  { sem: 2207, bio: 'pradera',  forma: 'escalon', viento: 0,    prec: 0.34, rival: 'LULA'    },
  { sem: 3313, bio: 'desierto', forma: 'llano',   viento: 2.2,  prec: 0.40, rival: 'NANO'    },
  { sem: 4419, bio: 'desierto', forma: 'valle',   viento: -2.8, prec: 0.46, rival: 'PILA'    },
  { sem: 5527, bio: 'bosque',   forma: 'bosque',  viento: 1.6,  prec: 0.52, rival: 'CHINO'   },
  { sem: 6631, bio: 'bosque',   forma: 'torre',   viento: -3.4, prec: 0.57, rival: 'ZORRO'   },
  { sem: 7741, bio: 'monte',    forma: 'mesa',    viento: 3.0,  prec: 0.62, rival: 'BRUMA'   },
  { sem: 8849, bio: 'monte',    forma: 'pico',    viento: -4.0, prec: 0.68, rival: 'CACHO'   },
  { sem: 9953, bio: 'pradera',  forma: 'viga',    viento: 2.6,  prec: 0.74, rival: 'NIEBLA'  },
  { sem: 1063, bio: 'desierto', forma: 'torre',   viento: -4.6, prec: 0.80, rival: 'FIERRO'  },
  { sem: 1171, bio: 'monte',    forma: 'valle',   viento: 5.0,  prec: 0.86, rival: 'RAYO'    },
  { sem: 1283, bio: 'bosque',   forma: 'pico',    viento: -5.0, prec: 0.92, rival: 'EL VIEJO'},
];

/* ── EL PERFIL DEL TERRENO ────────────────────────────────────────────────
   Devuelve la altura de cada columna. Las dos mesetas de los arqueros se
   APLANAN DESPUES, siempre: una forma que deje al arquero en una pendiente
   lo deja parado en el canto de un bloque, y ahi el arco se dibuja medio
   metido en la tierra.                                                     */
function perfilDe(forma, rnd) {
  const h = new Array(NX);
  const ondas = (x, a, b) => 0.5 * a * Math.sin(x * 0.55 + b) + 0.4 * a * Math.sin(x * 1.31 + b * 2.1);
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28;
  for (let x = 0; x < NX; x++) h[x] = 7;

  if (forma === 'llano' || forma === 'bosque' || forma === 'torre' || forma === 'viga') {
    for (let x = 0; x < NX; x++) h[x] = Math.round(7 + ondas(x, 1.6, f1));
  } else if (forma === 'escalon') {
    for (let x = 0; x < NX; x++) {
      const k = cl((x - (XA + 3)) / (XB - XA - 4), 0, 1);
      h[x] = Math.round(mez(6, 12, k * k * (3 - 2 * k)) + ondas(x, 0.9, f2));
    }
  } else if (forma === 'valle') {
    for (let x = 0; x < NX; x++) {
      const d = cl(Math.abs(x - (XA + XB) / 2) / ((XB - XA) / 2 + 2), 0, 1);
      h[x] = Math.round(mez(2, 10, d * d) + ondas(x, 0.8, f1));
    }
  } else if (forma === 'mesa') {
    for (let x = 0; x < NX; x++) {
      const cerca = Math.min(Math.abs(x - XA), Math.abs(x - XB));
      h[x] = cerca <= 2 ? Math.round(11 + ondas(x, 0.7, f1)) : Math.round(1 + rnd() * 1.4);
    }
  } else if (forma === 'pico') {
    for (let x = 0; x < NX; x++) {
      const d = cl(Math.abs(x - (XA + XB) / 2) / ((XB - XA) / 2 + 2), 0, 1);
      h[x] = Math.round(mez(15, 6, Math.pow(d, 0.85)) + ondas(x, 0.7, f2));
    }
  }
  for (let x = 0; x < NX; x++) h[x] = cl(h[x], 1, NY - 12);
  /* las dos mesetas: tres columnas planas a la altura de la del arquero */
  for (const X of [XA, XB]) {
    const hh = h[X];
    for (let d = -1; d <= 1; d++) { const x = X + d; if (x >= 0 && x < NX) h[x] = hh; }
  }
  return h;
}

/* ── ARMAR EL MUNDO ───────────────────────────────────────────────────────
   EL OBSTACULO SE BAJA HASTA QUE EL DUELO SE PUEDA JUGAR, y esto no es una
   red de seguridad de mas: `armaMundo` tiraba torres de 16 y 17 celdas de
   alto a tres columnas del arquero, y con V_MAX 30 desde la boca del arco no
   hay parabola que las pase — medido, la mas barata que las cruza pide 39,7.
   Los duelos 6 y 10 salian IMPOSIBLES en los dos sentidos y nada avisaba:
   desde afuera se ve igual que un jugador que no sabe apuntar.

   Asi que el generador PROPONE y el resolvedor —el mismo que usa el rival—
   DISPONE: se baja el obstaculo de a un 11 % hasta que haya tiro limpio en
   los dos sentidos. Es determinista (la semilla se rehace en cada intento),
   asi que el duelo n sigue siendo siempre el mismo duelo.                 */
function generaMundo(n) {
  let M = null;
  for (let i = 0; i < 9; i++) {
    M = armaMundo(n, 1 - i * 0.11);
    if (resuelve(M, 0, M.viento) && resuelve(M, 1, M.viento)) { M.oc = 1 - i * 0.11; return M; }
  }
  M.oc = 0;
  return M;
}

function armaMundo(n, oc) {
  const D = DUELO[n % DUELO.length];
  const B = BIOMAS[D.bio];
  const rnd = azar(D.sem);
  const M = nuevoMundo(NX, NY, NZ);
  M.n = n; M.paleta = B.pal; M.bio = D.bio; M.forma = D.forma;
  M.viento = D.viento; M.rival = D.rival; M.prec = D.prec;

  const h = perfilDe(D.forma, rnd);
  M.h = h;
  for (let x = 0; x < NX; x++) for (let y = 0; y < h[x]; y++) {
    const t = (y === h[x] - 1) ? B.sup : B.base;
    for (let z = 0; z < NZ; z++) pon(M, x, y, z, t);
  }

  /* LOS OBSTACULOS VAN LEJOS DE LOS DOS ARQUEROS. Uno pegado al arco tapa la
     salida de la flecha y el duelo se vuelve imposible sin que nada avise —
     y encima no se ve, porque desde la camara queda detras del arquero.    */
  const libre = x => Math.abs(x - XA) > 2.5 && Math.abs(x - XB) > 2.5;
  if (D.forma === 'torre') {
    /* LA TORRE VA EN EL MEDIO EXACTO Y NO SE MUEVE. Mide dos bloques, asi
       que x0 = XM-1 la deja ocupando [8,10] con su centro en 9,0, que es el
       medio entre los dos arqueros. Corrida una celda —que es lo que hacia
       el sorteo— la tiene mas cerca uno de los dos, y lo que ya varia es la
       altura, que es lo que de verdad cambia el tiro.                     */
    const x0 = XM - 1;
    const alt = h[x0] + Math.max(2, Math.round((8 + Math.floor(rnd() * 3)) * oc));
    for (let x = x0; x <= x0 + 1; x++) for (let y = h[x]; y < alt; y++)
      for (let z = 0; z < NZ; z++) pon(M, x, y, z, LADRILLO);
    /* la cornisa de metal: es lo unico que los craters no se llevan, asi que
       la torre puede perder ladrillos y seguir siendo una torre */
    for (let x = x0 - 1; x <= x0 + 2; x++) for (let z = 0; z < NZ; z++) pon(M, x, alt, z, METAL);
  } else if (D.forma === 'viga') {
    const y0 = Math.round(h[XM - 1] + Math.max(2, (9 + Math.floor(rnd() * 3)) * oc));
    for (let x = XM - 2; x <= XM + 1; x++) for (let z = 0; z < NZ; z++) pon(M, x, y0, z, METAL);
  } else if (D.forma === 'bosque') {
    for (let x = XA + 2; x < NX - 3; x++) {
      if (!libre(x) || rnd() > 0.34) continue;
      const t0 = h[x], alt = 4 + Math.floor(rnd() * 3);
      for (let y = t0; y < t0 + alt; y++) for (let z = 1; z < NZ - 1; z++) pon(M, x, y, z, MADERA);
      for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 2; dy++)
        for (let z = 0; z < NZ; z++) {
          if (Math.abs(dx) + Math.abs(dy - 1) > 2) continue;
          if (en(M, x + dx, t0 + alt + dy - 1, z) === VACIO) pon(M, x + dx, t0 + alt + dy - 1, z, HOJA);
        }
      x += 2;
    }
  }

  M.pisoA = altura(M, XA);
  M.pisoB = altura(M, XB);
  return M;
}

/* ── EL CRATER ────────────────────────────────────────────────────────────
   SE LLEVA LA COLUMNA ENTERA EN z Y NO UNA ESFERA. Con esfera, un impacto en
   la cara de adelante deja un hueco de una celda de hondo y desde la camara
   —que mira casi de frente— eso se lee a mancha, no a agujero. Con cilindro
   se ve el hueco de lado a lado y el terreno cambia de verdad.
   Y LAS DOS MESETAS NO SE ROMPEN: dos tiros cortos al pie del rival le
   volarian el piso, y perder por caerse no es perder un duelo de arcos.   */
function crater(M, cx, cy, r) {
  let n = 0;
  const r2 = r * r;
  const R = Math.ceil(r);
  for (let x = Math.floor(cx) - R; x <= Math.floor(cx) + R; x++) {
    if (x < 0 || x >= M.nx) continue;
    const prot = (Math.abs(x - XA) <= PROTEGE_R) ? M.pisoA
               : (Math.abs(x - XB) <= PROTEGE_R) ? M.pisoB : -1;
    for (let y = Math.floor(cy) - R; y <= Math.floor(cy) + R; y++) {
      if (y < 0 || y >= M.ny) continue;
      if (prot >= 0 && y >= prot - 1) continue;
      const dx = (x + 0.5) - cx, dy = (y + 0.5) - cy;
      if (dx * dx + dy * dy > r2) continue;
      for (let z = 0; z < M.nz; z++) {
        const t = M.v[iM(M, x, y, z)];
        if (t !== VACIO && BLOQ[t].rompe === 1) { M.v[iM(M, x, y, z)] = VACIO; n++; }
      }
    }
  }
  return n;
}

/* de donde sale la flecha: la mano del arco. Sale de UNA funcion porque la
   usan el tiro del jugador, el del rival, el resolvedor balistico y el brazo
   que se dibuja — con cuatro cuentas, la flecha saldria de un sitio distinto
   del que se ve el arco.

   Y VA MEDIO CUERPO POR DELANTE, no en el eje del arquero. Con la boca en el
   centro, el arco se dibuja ADENTRO del torso y no se lee ninguno de los dos;
   y la flecha nace dentro de la caja del propio tirador, o sea que sale viva
   de milagro y solo porque `vuela` le perdona los primeros 0,30 s. Con 0,62
   —mas que el medio ancho del cuerpo, que es 0,52— nace al aire.          */
const FRENTE_BOCA = 0.62;
function bocaDe(M, lado) {
  const X = lado ? XB : XA, piso = lado ? M.pisoB : M.pisoA;
  const s = lado ? -1 : 1;                 /* el de la derecha mira a -X */
  return { x: X + 0.5 + s * FRENTE_BOCA, y: piso + 1.55 };
}
