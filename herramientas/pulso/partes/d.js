
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

function armaCamino(semilla, metros){
  SEM = semilla >>> 0;
  CAMINO.length = 0;
  let x = 0, z = 0, dir = 0, total = 0, vueltas = 0;
  /* el primer tramo es largo y recto A PROPÓSITO: los primeros diez segundos el
     jugador está aprendiendo a no volcar el bol, y meterle una esquina ahí es
     cobrarle un susto que todavía no puede pagar */
  let largo = 11;
  while (total < metros){
    CAMINO.push({ x, z, dir, largo });
    x += DIRS[dir][0] * largo; z += DIRS[dir][1] * largo;
    total += largo;
    /* dobla a un lado o al otro, nunca 180: un pasillo que se dobla sobre sí
       mismo se cruza consigo mismo y se ve el mismo tramo dos veces */
    dir = (dir + (rnd() < 0.5 ? 1 : 3)) % 4;
    vueltas++;
    largo = Math.round(rr(6, 14));
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
/* el rumbo en radianes, interpolado en la esquina para que la cámara no salte */
function rumboEn(d){
  const GIRO = 1.7;                       /* metros que dura la vuelta */
  const a = enCamino(d);
  const t = CAMINO[a.tramo];
  const yaw0 = Math.atan2(DIRS[t.dir][0], DIRS[t.dir][1]);
  if (a.resta > GIRO || a.tramo >= CAMINO.length - 1) return yaw0;
  const sig = CAMINO[a.tramo + 1];
  let yaw1 = Math.atan2(DIRS[sig.dir][0], DIRS[sig.dir][1]);
  let dif = yaw1 - yaw0;
  while (dif > Math.PI) dif -= Math.PI*2;
  while (dif < -Math.PI) dif += Math.PI*2;
  const u = 1 - a.resta / GIRO;
  return yaw0 + dif * (u*u*(3 - 2*u));     /* suavizado: una vuelta con codo se lee a tirón */
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
