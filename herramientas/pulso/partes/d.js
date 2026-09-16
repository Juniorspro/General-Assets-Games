
/* ══════════════════════════ EL PASILLO ══════════════════════════
   Un camino de TRAMOS RECTOS que doblan. No es un laberinto y no se puede
   perder el camino: el jugador no elige por dónde va, camina solo. Lo único que
   maneja es la tabla, y todo el mapa existe para dos cosas — que las esquinas
   tapen lo que viene (que es donde se esconden los sustos) y que el pasillo se
   sienta largo.

   Y LAS ESQUINAS SON EL DISEÑO, NO LA DECORACIÓN. Un pasillo recto muestra el
   susto a diez metros y deja de asustar; una esquina lo pone a un metro y sin
   aviso. Por eso el generador garantiza un mínimo de vueltas. */
const ANCHO = 2.4, ALTO = 2.9;
const CAMINO = [];        /* {x, z, dir, largo} — dir 0..3 = +Z, +X, -Z, -X */
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
let LARGO_TOTAL = 0;
let grupoMapa = null;

/* la semilla: el mismo número da el mismo pasillo. Sin esto no se puede
   comparar una corrida con otra ni volver a ver un defecto. */
let SEM = 1;
function rnd(){ SEM = (SEM * 1664525 + 1013904223) >>> 0; return SEM / 4294967296; }
const rr = (a, b) => a + rnd() * (b - a);

/* ── EL PASILLO NO SE PUEDE CRUZAR CONSIGO MISMO ──
   Y ésta era la causa de «el personaje atraviesa paredes». Los tramos se
   tiraban al azar doblando ±90° sin mirar por dónde ya había pasado: con tramos
   de 6 a 14 metros, cuatro vueltas del mismo lado vuelven al punto de partida y
   el generador construye el tramo nuevo ENCIMA del viejo. Donde eso pasa, las
   paredes de un tramo cruzan el otro de lado a lado, y el jugador —que camina
   por el centro del pasillo y no puede elegir— las atraviesa. No era el andar:
   era el mapa.
   Se lleva una grilla de ocupación de un metro con el ancho del pasillo. Un
   tramo que pisa una celda ya ocupada se rechaza y se prueban el otro lado y
   largos cada vez más cortos. Si nada entra, el pasillo termina ahí: un pasillo
   un poco más corto es infinitamente mejor que uno que se cruza. */
const OCU = new Set();
function bandaTramo(x, z, dir, desde, hasta){
  const dx = DIRS[dir][0], dz = DIRS[dir][1];
  const r = Math.ceil(ANCHO/2);
  const out = [];
  for (let q = desde; q <= hasta; q += 1){
    const cx = x + dx*q, cz = z + dz*q;
    /* un tramo ocupa una BANDA y no una línea: sin el ancho, dos tramos
       paralelos a un metro «no se cruzan» y en el mundo comparten la pared */
    for (let a = -r; a <= r; a++)
      out.push(Math.round(cx + (-dz)*a) + ',' + Math.round(cz + (dx)*a));
  }
  return out;
}
function marcaTramo(x, z, dir, largo){
  for (const c of bandaTramo(x, z, dir, -2, largo + 2)) OCU.add(c);
}
function cabeTramo(x, z, dir, largo){
  /* las celdas del arranque son las de la esquina y por definición las comparte
     con el tramo anterior, así que no cuentan como choque */
  const propias = new Set(bandaTramo(x, z, dir, -3, 3));
  for (const c of bandaTramo(x, z, dir, -2, largo + 2))
    if (OCU.has(c) && !propias.has(c)) return false;
  return true;
}

/* ── Y LA PROHIBICIÓN DE CRUZARSE HIZO EL PASILLO MÁS CORTO ──
   Medido apenas entró: `{tramos: 6, metros: 57}` contra los 120 pedidos. Es la
   consecuencia obvia y aun así no la vi hasta medirla — un camino que no puede
   pisar donde ya pisó se acorrala, y cuando ningún giro entra, el generador
   cortaba ahí. O sea que arreglar «atraviesa paredes» dejaba la mitad del
   pasillo sin construir, y como la meta era la constante 120, el jugador
   caminaba treinta metros más allá del final.
   Se arregla con dos cosas y las dos son necesarias:
     · SE REINTENTA EL CAMINO ENTERO. Un intento que se acorrala no se arregla
       desde adentro; con otra semilla el mismo generador sale. Doscientos
       intentos son un milisegundo y no hace falta ser más inteligente que eso.
     · LA META SALE DEL PASILLO QUE SE CONSTRUYÓ, no de una constante. Si algún
       día ningún intento llega, el juego será más corto pero terminará donde
       hay puerta — y no en el aire, treinta metros después. */
function armaCamino(semilla, metros){
  let mejor = null;
  for (let intento = 0; intento < 200; intento++){
    const r = intentaCamino((semilla + intento*2654435761) >>> 0, metros);
    if (!mejor || r.metros > mejor.metros){ mejor = r; mejor.tramos = CAMINO.slice(); }
    if (r.metros >= metros) return r;
  }
  /* ninguno llegó: se rearma el mejor */
  CAMINO.length = 0;
  for (const t of mejor.tramos) CAMINO.push(t);
  LARGO_TOTAL = mejor.metros;
  return { tramos: CAMINO.length, vueltas: mejor.vueltas, metros: mejor.metros };
}

function intentaCamino(semilla, metros){
  SEM = semilla >>> 0;
  CAMINO.length = 0;
  OCU.clear();
  let x = 0, z = 0, dir = 0, total = 0, vueltas = 0;
  /* el primer tramo es largo y recto A PROPÓSITO: los primeros diez segundos el
     jugador está aprendiendo a no volcar el bol, y meterle una esquina ahí es
     cobrarle un susto que todavía no puede pagar */
  let largo = 11;
  while (total < metros){
    CAMINO.push({ x, z, dir, largo });
    marcaTramo(x, z, dir, largo);
    x += DIRS[dir][0] * largo; z += DIRS[dir][1] * largo;
    total += largo;
    /* dobla a un lado o al otro, nunca 180: un pasillo que se dobla sobre sí
       mismo se cruza consigo mismo y se ve el mismo tramo dos veces */
    const primero = rnd() < 0.5 ? 1 : 3;
    let puesto = false;
    for (const giro of [primero, 4 - primero]){
      const d2 = (dir + giro) % 4;
      for (let L = Math.round(rr(7, 14)); L >= 5; L -= 2){
        if (cabeTramo(x, z, d2, L)){ dir = d2; largo = L; puesto = true; break; }
      }
      if (puesto) break;
    }
    if (!puesto) break;
    vueltas++;
  }
  LARGO_TOTAL = total;
  return { tramos: CAMINO.length, vueltas, metros: total };
}


/* dónde está el jugador a `d` metros de recorrido, y hacia dónde mira.
   Una sola función: la usan la cámara, el andar, los sustos y las sondas. Con
   dos cuentas, el susto aparecería en un sitio distinto del que se camina. */
function enCamino(d){
  let q = d;
  for (let i = 0; i < CAMINO.length; i++){
    const t = CAMINO[i];
    if (q <= t.largo || i === CAMINO.length - 1){
      const dx = DIRS[t.dir][0], dz = DIRS[t.dir][1];
      return { x: t.x + dx*q, z: t.z + dz*q, dx, dz, tramo: i,
               resta: t.largo - q, dir: t.dir };
    }
    q -= t.largo;
  }
  return { x: 0, z: 0, dx: 0, dz: 1, tramo: 0, resta: 0, dir: 0 };
}
/* ── LA ESQUINA SE DOBLA EN EL CAMINO Y NO SÓLO EN LA MIRADA ──
   Antes la POSICIÓN seguía la quebrada exacta —codo de 90° en el vértice— y sólo
   el RUMBO se suavizaba a lo largo de 1,7 m. O sea que durante casi dos metros
   el jugador miraba en diagonal mientras el cuerpo seguía yendo derecho por el
   tramo viejo: en pantalla eso es caminar de costado, y es la otra mitad de «no
   camina hacia adelante».
   Ahora la esquina es una curva: en la ventana de ±R metros alrededor del
   vértice se funden las dos rectas con un suavizado, y el pasillo tiene 1,2 m
   de medio ancho, así que la curva pasa holgada.
   Y EL RUMBO SALE DE LA DERIVADA DE ESA MISMA CURVA, no de una segunda cuenta:
   así «hacia dónde mira» y «hacia dónde avanza» son la misma cosa POR
   CONSTRUCCIÓN y no pueden volver a desincronizarse. */
const R_ESQ = 1.7;
function puntoCamino(d){
  const a = enCamino(d);
  const t = CAMINO[a.tramo];
  const adelante = a.resta < R_ESQ && a.tramo < CAMINO.length - 1;
  const atras = (t.largo - a.resta) < R_ESQ && a.tramo > 0;
  if (!adelante && !atras) return { x: a.x, z: a.z };
  let iA, iB, s;                 /* tramo previo, tramo siguiente, distancia al vértice */
  if (adelante){ iA = a.tramo; iB = a.tramo + 1; s = -a.resta; }
  else { iA = a.tramo - 1; iB = a.tramo; s = t.largo - a.resta; }
  const tA = CAMINO[iA], tB = CAMINO[iB];
  const vx = tA.x + DIRS[tA.dir][0]*tA.largo, vz = tA.z + DIRS[tA.dir][1]*tA.largo;
  const ax = DIRS[tA.dir][0], az = DIRS[tA.dir][1];
  const bx = DIRS[tB.dir][0], bz = DIRS[tB.dir][1];
  const u = Math.max(0, Math.min(1, (s + R_ESQ) / (2*R_ESQ)));
  const w = u*u*(3 - 2*u);
  return { x: vx + ax*s*(1-w) + bx*s*w, z: vz + az*s*(1-w) + bz*s*w };
}
function rumboEn(d){
  /* diferencia finita sobre la curva: seis centímetros alcanzan, y así no hay
     que derivar a mano un suavizado que se puede medir */
  const h = 0.06;
  const p0 = puntoCamino(Math.max(0, d - h)), p1 = puntoCamino(d + h);
  const dx = p1.x - p0.x, dz = p1.z - p0.z;
  if (Math.abs(dx) + Math.abs(dz) < 1e-9){
    const t = CAMINO[enCamino(d).tramo];
    return Math.atan2(DIRS[t.dir][0], DIRS[t.dir][1]);
  }
  return Math.atan2(dx, dz);
}

function fundir(piezas, mat){
  const gs = [];
  for (const p of piezas){
    const g = p.g.clone();
    if (p.u) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i)*p.u[0], uv.getY(i)*p.u[1]); uv.needsUpdate = true; }
    const m = new T.Matrix4();
    m.compose(new T.Vector3(p.p[0], p.p[1], p.p[2]),
              new T.Quaternion().setFromEuler(new T.Euler(...(p.r || [0,0,0]))),
              new T.Vector3(...(p.s || [1,1,1])));
    g.applyMatrix4(m);
    gs.push(g);
  }
  if (!gs.length) return null;
  const out = gs[0];
  return gs.length === 1 ? out : unir(gs);
}
/* unión a mano de geometrías no indexadas con los mismos atributos: es lo único
   que se necesita y evita bajar `BufferGeometryUtils` de un CDN */
function unir(gs){
  const claves = ['position', 'normal', 'uv'];
  let n = 0;
  for (const g of gs){ if (g.index) { const d = g.toNonIndexed(); g.dispose(); gs[gs.indexOf(g)] = d; } }
  for (const g of gs) n += g.attributes.position.count;
  const out = new T.BufferGeometry();
  for (const c of claves){
    const tam = gs[0].attributes[c].itemSize;
    const arr = new Float32Array(n * tam);
    let o = 0;
    for (const g of gs){ arr.set(g.attributes[c].array, o); o += g.attributes[c].array.length; }
    out.setAttribute(c, new T.BufferAttribute(arr, tam));
  }
  return out;
}

const geoPlano = new T.PlaneGeometry(1, 1);
const geoCaja = new T.BoxGeometry(1, 1, 1);
const geoCil = new T.CylinderGeometry(0.5, 0.5, 1, 12);

function armaMapa(){
  if (grupoMapa){ escena.remove(grupoMapa); grupoMapa = null; }
  const g = new T.Group();
  const piso = [], pared = [], techo = [], marco = [];

  for (const t of CAMINO){
    const dx = DIRS[t.dir][0], dz = DIRS[t.dir][1];
    const cx = t.x + dx*t.largo/2, cz = t.z + dz*t.largo/2;
    const ang = Math.atan2(dx, dz);
    /* el tramo se hace en su propio marco y se rota: así el mismo código sirve
       para los cuatro rumbos y no hay cuatro casos que se puedan desincronizar */
    const L = t.largo + ANCHO;           /* se pasa de largo para tapar la esquina */
    piso.push({ g: geoPlano, p:[cx, 0, cz], r:[-Math.PI/2, 0, ang],
                s:[ANCHO, L, 1], u:[ANCHO/1.2, L/1.2] });
    techo.push({ g: geoPlano, p:[cx, ALTO, cz], r:[Math.PI/2, 0, -ang],
                 s:[ANCHO, L, 1], u:[ANCHO/1.5, L/1.5] });
    for (const lado of [-1, 1]){
      const px = cx + (-dz)*lado*ANCHO/2, pz = cz + (dx)*lado*ANCHO/2;
      pared.push({ g: geoPlano, p:[px, ALTO/2, pz],
                   r:[0, ang + (lado > 0 ? Math.PI : 0) + Math.PI, 0],
                   s:[L, ALTO, 1], u:[L/1.4, ALTO/1.4] });
    }
  }
  /* la puerta del final: es lo único que se ve de lejos y es toda la meta */
  const f = enCamino(LARGO_TOTAL - 0.15);
  marco.push({ g: geoCaja, p:[f.x, 1.05, f.z], s:[1.1, 2.1, 0.12] });

  const pon = (arr, mat, sombra) => {
    const geo = fundir(arr, mat); if (!geo) return null;
    const m = new T.Mesh(geo, mat);
    m.castShadow = !!sombra; m.receiveShadow = true;
    g.add(m); return m;
  };
  pon(piso, matPiso, false);
  pon(pared, matPared, true);
  pon(techo, matTecho, false);
  pon(marco, matMadera, true);

  escena.add(g);
  grupoMapa = g;
}
