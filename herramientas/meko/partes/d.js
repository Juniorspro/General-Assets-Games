
/* ══════════════════════════════════════════════════════════════════════════
   D · CAMINOS, GENERADOR, VALIDADOR Y AUTO-JUGADOR
   Sin DOM y sin three. UN NIVEL GENERADO Y NO JUGADO ES UN NIVEL ROTO QUE
   TODAVIA NO SE SABE: el generador tira, el validador comprueba, y el
   auto-jugador lo termina de punta a punta por el mismo camino que el dedo.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── TODO LO QUE SE ALCANZA CAMINANDO, CON LOS MECANISMOS QUIETOS ─────────
   Un toque no es un paso: es «andá hasta ahí», y el juego resuelve el camino.
   Asi que esta funcion es a la vez lo que usa el dedo y lo que usa el
   validador para contar toques. Con dos cuentas distintas, el validador
   aprobaria un juego que no existe.                                        */
function alcanzables(M, E, desde) {
  const vis = new Map(), cola = [desde], tmp = [];
  vis.set(iM(M, desde[0], desde[1], desde[2]), null);
  let qi = 0;
  while (qi < cola.length) {
    const c = cola[qi++];
    vecinos(M, E, c, tmp);
    for (let k = 0; k < tmp.length; k++) {
      const v = tmp[k], ik = iM(M, v[0], v[1], v[2]);
      if (vis.has(ik)) continue;
      vis.set(ik, c); cola.push(v.slice());
    }
  }
  return { orden: cola, prev: vis };
}
/* el camino de celda a celda, que es lo que el robot camina de verdad */
function camino(M, E, desde, hasta) {
  const { prev } = alcanzables(M, E, desde);
  const fin = iM(M, hasta[0], hasta[1], hasta[2]);
  if (!prev.has(fin)) return null;
  const ruta = [hasta.slice()];
  let c = prev.get(fin);
  while (c) { ruta.push(c.slice()); c = prev.get(iM(M, c[0], c[1], c[2])); }
  return ruta.reverse();
}

/* ── EL VALIDADOR: UNA BFS SOBRE (CELDA × ESTADO DE LOS MECANISMOS) ───────
   Y cuenta TOQUES y no pasos, porque el toque es la unidad que el jugador
   gasta. Caminar a cualquier celda alcanzable cuesta uno; tocar un mecanismo
   cuesta uno. De aca sale «el mejor camino son N toques».                  */
function resuelve(M, congela, tope) {
  /* `congela` puede ser true —todos— o una lista de indices. La lista es la
     que importa: con un solo mecanismo congelado por vez se comprueba que
     CADA UNO haga falta. Congelando todos juntos, un nivel con dos
     mecanismos puede tener uno de adorno y pasar igual — y no falla: se
     resuelve, con una pieza naranja que no sirve para nada. */
  const cong = i => congela === true || (Array.isArray(congela) && congela.indexOf(i) >= 0);
  const E0 = estados0(M);
  const k0 = claveEst(M, E0, M.ini);
  const vis = new Map([[k0, { c: M.ini, E: E0, p: -1, a: null }]]);
  const cola = [k0]; let qi = 0;
  const lim = tope || 90000;
  const metaK = iM(M, M.meta[0], M.meta[1], M.meta[2]);
  while (qi < cola.length) {
    const k = cola[qi++], n = vis.get(k);
    if (iM(M, n.c[0], n.c[1], n.c[2]) === metaK) return reconstruye(vis, k);
    const { orden } = alcanzables(M, n.E, n.c);
    for (let i = 1; i < orden.length; i++) {
      const r = orden[i], kk = claveEst(M, n.E, r);
      if (vis.has(kk)) continue;
      vis.set(kk, { c: r, E: n.E, p: k, a: { t: 'ir', c: r.slice() } });
      cola.push(kk);
    }
    for (let i = 0; i < M.mec.length; i++) {
      if (cong(i)) continue;
      const res = mecMueve(M, n.E, n.c, i);
      if (!res) continue;
      const kk = claveEst(M, res.E, res.rob);
      if (vis.has(kk)) continue;
      vis.set(kk, { c: res.rob, E: res.E, p: k, a: { t: 'mec', i } });
      cola.push(kk);
    }
    if (vis.size > lim) return null;
  }
  return null;
}
function reconstruye(vis, k) {
  const pl = [];
  while (k !== -1) { const n = vis.get(k); if (n.a) pl.push(n.a); k = n.p; }
  return pl.reverse();
}

/* ── Y EL PLAN SE VUELVE A JUGAR SOBRE EL MODELO ──────────────────────────
   La BFS puede tener un defecto y devolver un plan que no lleva a ninguna
   parte; replicarlo paso por paso es lo unico que lo prueba.               */
/* ── ADONDE MANDA UN TOQUE ────────────────────────────────────────────────
   Esto es el DEDO, y vive acá —en el modelo puro— y no adentro del manejador
   de la pantalla, porque hay tres que necesitan la misma respuesta: el juego
   cuando alguien toca, el auto-jugador cuando decide a qué cara apuntarle, y
   el generador cuando comprueba que el plan se pueda pedir. Escrita tres
   veces, la sonda apunta a una cara creyendo una cosa y el juego camina a
   otra — y eso no falla, sale mal.                                        */
function pedirToque(M, E, rob, cel, n) {
  const cand = [];
  /* LA ESCALERA SE PISA POR DENTRO, y por eso va PRIMERO. Tocando un peldaño,
     lo que uno pide es subir HASTA AHÍ: mandando al robot a la celda de
     encima, el último peldaño te deja arriba del todo y no hay forma de
     pararse en los del medio — que es para lo que existe una escalera.
     Cualquier otro bloque bloquea, así que este candidato no se puede tomar
     por error. */
  if (!bloqueaEn(M, E, cel[0], cel[1], cel[2])) cand.push(cel.slice());
  cand.push([cel[0], cel[1] + 1, cel[2]]);
  if (n[1] === 0) cand.push([cel[0] + n[0], cel[1] + n[1], cel[2] + n[2]]);
  for (const d of cand) {
    const r = camino(M, E, rob, d);
    if (r && r.length >= 2) return r;
  }
  return null;
}
/* ¿HAY ALGUNA CARA QUE PIDA ESTA CELDA? El plan lo arma una BFS sobre el
   modelo, donde ir a una celda alcanzable es gratis; en la pantalla hay que
   poder APUNTARLE, y no siempre se puede: si lo único que sostiene el destino
   es un mecanismo, tocarlo MUEVE la pieza en vez de caminar, y si además los
   cuatro vecinos laterales tienen la tapa alcanzable, esos toques se van a la
   tapa. Ahí el destino no lo pide nadie y el nivel se traba sin fallar.   */
const CARAS6D = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
function pedibleIr(M, E, rob, c) {
  const cels = [c.slice(), [c[0], c[1] - 1, c[2]]];
  for (const d of DIRS) cels.push([c[0] - d[0], c[1], c[2] - d[1]]);
  for (const cel of cels) {
    if (tipoEn(M, E, cel[0], cel[1], cel[2]) === VACIO) continue;   /* al aire no se le apunta */
    if (mecEn(M, E, cel[0], cel[1], cel[2]) >= 0) continue;         /* eso mueve la pieza */
    for (const f of CARAS6D) {
      const r = pedirToque(M, E, rob, cel, f);
      if (!r) continue;
      const q = r[r.length - 1];
      if (q[0] === c[0] && q[1] === c[1] && q[2] === c[2]) return true;
    }
  }
  return false;
}

function verificaPlan(M, plan) {
  let E = estados0(M), c = M.ini.slice();
  for (const a of plan) {
    if (a.t === 'ir') {
      const r = camino(M, E, c, a.c);
      if (!r) return { ok: false, por: 'sin camino' };
      if (!pedibleIr(M, E, c, a.c)) return { ok: false, por: 'no se puede pedir' };
      c = a.c.slice();
    } else {
      const res = mecMueve(M, E, c, a.i);
      if (!res) return { ok: false, por: 'mecanismo trabado' };
      E = res.E; c = res.rob.slice();
    }
  }
  const ok = c[0] === M.meta[0] && c[1] === M.meta[1] && c[2] === M.meta[2];
  return { ok, por: ok ? '' : 'no termina en la meta' };
}

/* ══════════════════════ EL GENERADOR ══════════════════════ */
function configNivel(n) {
  const s = n / (NIVELES - 1);
  return {
    nx: Math.round(mez(10, 14, s)), ny: Math.round(mez(8, 12, s)), nz: Math.round(mez(10, 14, s)),
    mecs: n === 0 ? 0 : Math.min(MEC_TOPE, 1 + Math.floor((n - 1) / 7)),
    /* EL TRAMO ARRANCA LARGO Y NO CORTO: con dos o tres pasos por tramo el
       nivel 0 salia de cinco bloques, que es un guijarro y no un diorama. */
    pasosMin: 4 + Math.round(s * 3), pasosMax: 7 + Math.round(s * 4),
    y0: 3 + Math.round(s * 2),
    subeMax: Math.min(MEC_PASOS_TOPE, 2 + Math.round(s * 2)),
    deco: Math.round(mez(14, 44, s)),
    /* Y EL PISO DE TOQUES CRECE: un nivel de dos mecanismos que se pasa en dos
       toques es un nivel de uno con una pieza de mas. */
    minToques: n === 0 ? 1 : Math.max(2 + Math.floor((n - 1) / 7) * 2, 2 + Math.round(s * 4)),
  };
}
/* el suelo por altura: no cambia una regla, cambia que el diorama se lea */
function sueloDe(y, ny, R) {
  if (y <= 0) return PIEDRA;
  if (y >= ny - 3) return R() < 0.5 ? PASTO : LADRILLO;
  return R() < 0.5 ? LADRILLO : MADERA;
}

function intentaNivel(n, cfg, semilla) {
  const R = azar(semilla);
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const M = nuevoMundo(cfg.nx, cfg.ny, cfg.nz);
  M.hueco = new Set();                       /* columnas que tienen que quedar vacias */
  const usadas = new Set();
  const kc = (x, y, z) => (y * M.nz + z) * M.nx + x;
  const marca = c => usadas.add(kc(c[0], c[1], c[2]));
  const libre = (x, y, z) => enM(M, x, y, z) && tipoBase(M, x, y, z) === VACIO && !usadas.has(kc(x, y, z));
  const margen = (x, z) => x >= 1 && z >= 1 && x <= M.nx - 2 && z <= M.nz - 2;

  let p = [ri(2, M.nx - 3), cfg.y0, ri(2, M.nz - 3)];
  pon(M, p[0], p[1] - 1, p[2], sueloDe(p[1] - 1, M.ny, R));
  marca(p); M.ini = p.slice();

  /* ── UN TRAMO CAMINABLE, Y CADA PASO SE COMPRUEBA CONTRA `vecinos` ──────
     No alcanza con «pongo un bloque un escalon mas arriba»: la regla de
     movimiento tiene sus excepciones —el techo, la columna cortada— y el
     unico que las sabe es `vecinos`. Poner el bloque y PREGUNTARLE es lo que
     garantiza que el camino que el generador cree que dejo sea el que el
     juego reconoce.                                                        */
  const E0 = estados0(M);
  function paso() {
    const ord = [0, 1, 2, 3].sort(() => R() - 0.5);
    for (const d of ord) {
      /* LA MEZCLA DE ALTURAS ESTA CARGADA HACIA ARRIBA A PROPOSITO. Con
         partes iguales el camino baja mas de lo que sube —hay dos formas de
         bajar y una de subir— y medido, el nivel 0 terminaba en y=1 con nueve
         bloques: un guijarro. Y el piso es 2 y no 1, asi que abajo de cada
         apoyo quedan siempre dos bloques de pilar. */
      const dys = [1, 1, 0, 0, 0, -1, -2].sort(() => R() - 0.5);
      for (const dy of dys) {
        const q = [p[0] + DIRS[d][0], p[1] + dy, p[2] + DIRS[d][1]];
        if (!margen(q[0], q[2]) || q[1] < 2 || q[1] > M.ny - 2) continue;
        if (M.hueco.has(q[0] + ',' + q[2])) continue;
        if (!libre(q[0], q[1], q[2])) continue;
        if (!libre(q[0], q[1] - 1, q[2])) continue;
        const t = sueloDe(q[1] - 1, M.ny, R);
        pon(M, q[0], q[1] - 1, q[2], t);
        const vs = vecinos(M, estados0(M), p);
        if (vs.some(v => v[0] === q[0] && v[1] === q[1] && v[2] === q[2])) {
          marca(q);
          /* LO QUE EL ROBOT ATRAVIESA TAMBIEN TIENE QUE QUEDAR VACIO. Un
             escalon para arriba pasa por encima de la celda de origen y una
             caida atraviesa la columna entera: sin reservarlas, la decoracion
             las tapa y el paso que el generador dejo escrito deja de existir. */
          if (dy > 0) marca([p[0], p[1] + 1, p[2]]);
          for (let yy = p[1]; yy > q[1]; yy--) marca([q[0], yy, q[2]]);
          return q;
        }
        pon(M, q[0], q[1] - 1, q[2], VACIO);
      }
    }
    return null;
  }

  /* ── UN PUENTE: EL HUECO ES UN VACIO HASTA ABAJO ────────────────────────
     Y eso no es decoracion: `vecinos` solo ofrece celdas PISABLES, asi que
     una columna vacia de punta a punta no se puede pisar ni cayendo. Un
     hueco con piso a dos de profundidad seria un escalon para abajo.
     La losa va montada en un riel PERPENDICULAR: estacionada queda al
     costado, sobre el vacio, donde el robot no la alcanza.                 */
  function puente() {
    const ord = [0, 1, 2, 3].sort(() => R() - 0.5);
    for (const d of ord) {
      const g = ri(1, 2), dx = DIRS[d][0], dz = DIRS[d][1];
      const pd = [-dz, dx];                         /* la perpendicular */
      const pas = ri(2, 3);
      const gap = [], park = [];
      let ok = true;
      for (let i = 1; i <= g; i++) {
        const x = p[0] + dx * i, z = p[2] + dz * i, y = p[1] - 1;
        if (!margen(x, z) || !libre(x, y, z) || !libre(x, y + 1, z)) { ok = false; break; }
        for (let yy = 0; yy < M.ny; yy++) if (tipoBase(M, x, yy, z) !== VACIO) { ok = false; break; }
        gap.push([x, y, z]);
        park.push([x - pd[0] * pas, y, z - pd[1] * pas]);
      }
      if (!ok) continue;
      for (const c of park) {
        if (!margen(c[0], c[2]) || !libre(c[0], c[1], c[2]) || !libre(c[0], c[1] + 1, c[2])) { ok = false; break; }
        for (let yy = 0; yy < M.ny; yy++) if (tipoBase(M, c[0], yy, c[2]) !== VACIO) { ok = false; break; }
      }
      if (!ok) continue;
      const b = [p[0] + dx * (g + 1), p[1], p[2] + dz * (g + 1)];
      if (!margen(b[0], b[2]) || !libre(b[0], b[1], b[2]) || !libre(b[0], b[1] - 1, b[2])) continue;
      pon(M, b[0], b[1] - 1, b[2], sueloDe(b[1] - 1, M.ny, R));
      for (const c of gap) M.hueco.add(c[0] + ',' + c[2]);
      for (const c of park) M.hueco.add(c[0] + ',' + c[2]);
      M.mec.push({ tipo: 'puente', cel: park, dir: [pd[0], 0, pd[1]], pasos: Math.min(pas, MEC_PASOS_TOPE), bloq: METAL });
      marca(b);
      return b;
    }
    return null;
  }

  /* ── UN ASCENSOR: LO QUE HACE QUE SEA UN JUEGO ES QUE EL ROBOT SE MONTE ──
     Sube `h` celdas y `h` es siempre mayor que el escalon, asi que sin el no
     hay forma de llegar arriba. Estacionado esta a la altura del suelo, o sea
     que se sube caminando; a partir de ahi es un toque por celda.          */
  function ascensor() {
    const ord = [0, 1, 2, 3].sort(() => R() - 0.5);
    for (const d of ord) {
      const dx = DIRS[d][0], dz = DIRS[d][1];
      const h = Math.min(ri(2, cfg.subeMax), MEC_PASOS_TOPE);
      const lx = p[0] + dx, lz = p[2] + dz;
      if (!margen(lx, lz)) continue;
      if (p[1] + h > M.ny - 2) continue;
      if (!libre(lx, p[1] - 1, lz)) continue;
      let ok = true;
      for (let y = p[1]; y <= p[1] + h + 1; y++) if (!libre(lx, y, lz)) { ok = false; break; }
      if (!ok) continue;
      /* de donde se baja: al lado de la columna, ya arriba */
      const ord2 = [0, 1, 2, 3].sort(() => R() - 0.5);
      let b = null;
      for (const d2 of ord2) {
        const bx = lx + DIRS[d2][0], bz = lz + DIRS[d2][1], by = p[1] + h;
        if (bx === p[0] && bz === p[2]) continue;
        if (!margen(bx, bz) || by > M.ny - 2) continue;
        if (!libre(bx, by, bz) || !libre(bx, by - 1, bz)) continue;
        pon(M, bx, by - 1, bz, sueloDe(by - 1, M.ny, R));
        b = [bx, by, bz]; break;
      }
      if (!b) continue;
      M.hueco.add(lx + ',' + lz);
      M.mec.push({ tipo: 'ascensor', cel: [[lx, p[1] - 1, lz]], dir: [0, 1, 0], pasos: h, bloq: METAL });
      marca([lx, p[1], lz]); marca(b);
      return b;
    }
    return null;
  }

  for (let t = 0; t <= cfg.mecs; t++) {
    const L = ri(cfg.pasosMin, cfg.pasosMax);
    for (let k = 0; k < L; k++) { const q = paso(); if (!q) break; p = q; }
    if (t < cfg.mecs) {
      const cual = (t % 2 === 0) ? (R() < 0.55 ? puente : ascensor) : (R() < 0.55 ? ascensor : puente);
      let r = cual();
      if (!r) r = (cual === puente ? ascensor : puente)();
      if (!r) return null;
      p = r;
    }
  }
  if (p[0] === M.ini[0] && p[1] === M.ini[1] && p[2] === M.ini[2]) return null;
  M.meta = p.slice();
  pon(M, p[0], p[1] - 1, p[2], META);

  /* ── LOS PILARES HACIA ABAJO SON GRATIS, Y ESO SE PUEDE DEMOSTRAR ───────
     Rellenar por DEBAJO de un bloque que ya existe no crea ni una sola celda
     pisable: la de arriba del bloque ya lo era y las de adentro del pilar
     quedan ocupadas. Asi que esta decoracion —que es la que convierte cuatro
     baldosas flotando en un pedazo de mundo— no puede romper el nivel, y no
     hace falta revalidar despues de ponerla.                               */
  for (let z = 0; z < M.nz; z++) for (let x = 0; x < M.nx; x++) {
    if (M.hueco.has(x + ',' + z)) continue;
    let cima = -1;
    for (let y = M.ny - 1; y >= 0; y--) if (tipoBase(M, x, y, z) !== VACIO) { cima = y; break; }
    if (cima <= 0) continue;
    const hasta = R() < 0.78 ? 0 : Math.max(0, cima - ri(1, 2));
    for (let y = cima - 1; y >= hasta; y--) {
      if (tipoBase(M, x, y, z) !== VACIO || usadas.has(kc(x, y, z))) break;
      pon(M, x, y, z, y === 0 ? PIEDRA : sueloDe(y, M.ny, R));
    }
  }
  /* ── Y LA MASA QUE CUELGA DEBAJO, QUE ES LA MITAD DE LA IMAGEN ─────────
     Misma demostracion que los pilares, generalizada: se pone un bloque SOLO
     si la celda de arriba YA esta ocupada. Entonces la celda nueva no puede
     ser pisable —tiene techo— y la de arriba no cambia de estado. Cero
     celdas pisables nuevas, o sea que no hace falta revalidar. Con eso el
     diorama pasa de cuatro baldosas flotando a un pedazo de mundo.        */
  for (let k = 0, puestos = 0; k < cfg.deco * 22 && puestos < cfg.deco; k++) {
    const x = ri(0, M.nx - 1), z = ri(0, M.nz - 1), y = ri(0, M.ny - 2);
    if (M.hueco.has(x + ',' + z)) continue;
    if (tipoBase(M, x, y, z) !== VACIO || usadas.has(kc(x, y, z))) continue;
    if (tipoBase(M, x, y + 1, z) === VACIO) continue;         /* tiene que tener techo */
    let pegado = false;
    for (const d of DIRS) if (tipoBase(M, x + d[0], y, z + d[1]) !== VACIO) { pegado = true; break; }
    if (!pegado && tipoBase(M, x, y - 1, z) === VACIO) continue;  /* nada de bloques flotando solos */
    pon(M, x, y, z, y === 0 ? PIEDRA : sueloDe(y, M.ny, R));
    puestos++;
  }

  /* ── UNA ESCALERA, PEGADA A UNA PARED ─────────────────────────────────
     Es el unico bloque que sostiene y no bloquea, o sea la unica razon por la
     que `solido` y `bloquea` son dos cosas distintas — y hasta esta vuelta el
     generador NO PONIA NINGUNA: medido, cero en los veinte niveles. Habia dos
     causas y la segunda es la que importa.
       1. Se tiraba un (x,y,z) al azar sobre el volumen entero con catorce
          intentos, y los sitios que sirven son una decena de ochocientas
          celdas. Ahora se juntan los que sirven y se sortea uno.
       2. SE EXIGIA QUE LA COLUMNA NO FUERA DEL CAMINO, y eso no se puede
          cumplir NUNCA: los pilares y la masa colgante estan escritos para no
          crear una sola celda pisable nueva —esa es su demostracion— asi que
          la unica celda solida con aire encima que existe en el diorama es la
          que el robot piso. Medido: 15 a 31 sitios buenos, todos descartados
          por eso, y cero candidatos.
     Que la escalera caiga en el camino no rompe nada, y no hay que confiar:
     `generaNivel` valida DESPUES —con el plan, con `minToques` y con que cada
     mecanismo siga siendo necesario—, asi que un atajo que la escalera abriera
     descarta el intento y se reintenta. Lo unico que se le pide de mas es que
     este PEGADA A UNA PARED: una escalera parada en el medio de una plaza se
     lee a bloque flotando, no a escalera.                                   */
  if (n >= 2) {
    const esIniMeta = (x, y, z) =>
      (x === M.ini[0] && y === M.ini[1] && z === M.ini[2]) ||
      (M.meta && x === M.meta[0] && y === M.meta[1] && z === M.meta[2]);
    let elegido = null, altoEl = 0, flojo = null, altoFl = 0;
    for (const alto of [3, 2]) {
      const buenos = [], flojos = [];
      for (let z = 1; z <= M.nz - 2; z++) for (let x = 1; x <= M.nx - 2; x++) {
        if (M.hueco.has(x + ',' + z)) continue;
        for (let y = 1; y <= M.ny - 1 - alto; y++) {
          if (!esSolidoT(tipoBase(M, x, y - 1, z))) continue;
          let ok = true;
          for (let k = 0; k < alto; k++)
            if (tipoBase(M, x, y + k, z) !== VACIO || esIniMeta(x, y + k, z)) { ok = false; break; }
          if (!ok) continue;
          /* LA PARED BUENA ES LA MISMA EN TODAS LAS ALTURAS. Con «algun vecino
             solido en alguna altura» alcanza el roce de una esquina, y ahi la
             escalera se lee a palo flotando delante del diorama en vez de
             apoyada contra algo. Pero exigir solo esa deja niveles SIN
             escalera —medido, 2 de 18— asi que el roce queda de respaldo: la
             pared entera se prefiere y la esquina se usa si no hay otra. */
          let entera = false, roce = false;
          for (const d of DIRS) {
            let toda = true;
            for (let k = 0; k < alto; k++)
              if (!esSolidoT(tipoBase(M, x + d[0], y + k, z + d[1]))) { toda = false; break; }
            if (toda) { entera = true; break; }
            for (let k = 0; k < alto; k++)
              if (esSolidoT(tipoBase(M, x + d[0], y + k, z + d[1]))) { roce = true; break; }
          }
          if (entera) buenos.push([x, y, z]); else if (roce) flojos.push([x, y, z]);
        }
      }
      if (!elegido && buenos.length) { elegido = buenos[Math.floor(R() * buenos.length) % buenos.length]; altoEl = alto; }
      if (!flojo && flojos.length) { flojo = flojos[Math.floor(R() * flojos.length) % flojos.length]; altoFl = alto; }
      if (elegido) break;
    }
    if (!elegido && flojo) { elegido = flojo; altoEl = altoFl; }
    if (elegido) for (let k = 0; k < altoEl; k++) pon(M, elegido[0], elegido[1] + k, elegido[2], ESCALERA);
  }

  M.paleta = ri(0, 3);
  M.semilla = semilla;
  return M;
}

/* ── LA GENERACION: TIRAR, COMPROBAR, Y LA ASERCION QUE IMPORTA ───────────
   No alcanza con que el nivel se pueda resolver. Con los mecanismos QUIETOS
   tiene que ser IMPOSIBLE: eso es lo unico que prueba que el mecanismo hace
   falta. Sin esa comprobacion, la decoracion puede abrir un rodeo y el nivel
   pasa a ser una caminata con una pieza naranja de adorno — y no falla, se
   resuelve igual.                                                          */
/* UN MECANISMO ENTERRADO NO SE PUEDE TOCAR, Y EL PLAN NO SE ENTERA. `resuelve`
   trabaja sobre el modelo, donde tocar una pieza es gratis; en la pantalla hay
   que poder APUNTARLE, y una pieza con bloques en las seis caras no tiene
   ninguna a la vista desde ningun angulo. Se pide una cara libre CONTRA EL
   MUNDO BASE y en el desplazamiento cero, que es como arranca el nivel: la
   primera vez que hay que tocarla es antes de haberla movido.
   Salio del nivel 15, donde la pieza tenia un bloque justo encima y el
   auto-jugador se quedaba sin forma de pedir la accion.                    */
const CARAS6M = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
const MEC_VISTA = 3;   /* celdas de aire seguidas que hacen falta para verlo */
function mecsTocables(M) {
  for (const m of M.mec) {
    /* EL RECORRIDO ENTERO TIENE QUE ESTAR VACIO EN EL MUNDO BASE, y esto no
       lo puede notar el modelo: `tipoEn` pregunta primero por el mecanismo,
       asi que una pieza metida adentro de un ladrillo devuelve la pieza y la
       busqueda la da por buena. Lo que se ve en pantalla es la pieza DENTRO
       de la pared, con las dos caras peleandose el mismo pixel — y el rayo
       del dedo pega en el ladrillo, o sea que la pieza deja de poder tocarse.
       Medido en el nivel 18: la pieza 1 viajaba de [5,2,6] a [3,2,6] y ahi
       hay un ladrillo. */
    for (let e = 0; e <= m.pasos; e++) for (const c of m.cel) {
      const q = [c[0] + m.dir[0] * e, c[1] + m.dir[1] * e, c[2] + m.dir[2] * e];
      if (!enM(M, q[0], q[1], q[2])) return false;
      if (tipoBase(M, q[0], q[1], q[2]) !== VACIO) return false;
    }
    let libre = false;
    for (const c of m.cel) {
      for (const f of CARAS6M) {
        /* NO ALCANZA CON QUE LA CARA ESTE LIBRE: una cara pegada a un hueco de
           una celda esta al aire y sigue sin verse desde ninguna camara. Lo
           que hace falta es un TRAMO despejado por donde entre el rayo, y
           tres celdas es lo que separa un resquicio de un frente abierto. */
        let k = 0;
        for (; k < MEC_VISTA; k++) {
          const q = [c[0] + f[0] * (k + 1), c[1] + f[1] * (k + 1), c[2] + f[2] * (k + 1)];
          if (!enM(M, q[0], q[1], q[2])) { k = MEC_VISTA; break; }   /* el borde es aire abierto */
          if (tipoBase(M, q[0], q[1], q[2]) !== VACIO) break;
          let propia = false;
          for (const o of m.cel) if (o[0] === q[0] && o[1] === q[1] && o[2] === q[2]) { propia = true; break; }
          if (propia) break;
        }
        if (k >= MEC_VISTA) { libre = true; break; }
      }
      if (libre) break;
    }
    if (!libre) return false;
  }
  return true;
}

function generaNivel(n) {
  const cfg = configNivel(n);
  for (let it = 0; it < 300; it++) {
    const M = intentaNivel(n, cfg, n * 7919 + it * 131 + 17);
    if (!M) continue;
    const plan = resuelve(M);
    if (!plan || plan.length < cfg.minToques) continue;
    if (!verificaPlan(M, plan).ok) continue;
    let sobra = false;
    for (let i = 0; i < M.mec.length; i++) if (resuelve(M, [i])) { sobra = true; break; }
    if (sobra) continue;
    if (!mecsTocables(M)) continue;
    M.plan = plan; M.nivel = n; M.intento = it;
    return M;
  }
  return null;
}

/* ── LA AUDITORIA ─────────────────────────────────────────────────────────
   Los veinte, con su plan replicado y la asercion del mecanismo. Un numero
   por nivel; sin esto, «los niveles andan» es una impresion.               */
function auditaNiveles() {
  const filas = [], t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
  let malos = 0;
  for (let n = 0; n < NIVELES; n++) {
    const M = generaNivel(n);
    if (!M) { filas.push({ n, ok: false, por: 'no se genero' }); malos++; continue; }
    const v = verificaPlan(M, M.plan);
    let sin = null;
    for (let i = 0; i < M.mec.length && !sin; i++) if (resuelve(M, [i])) sin = i;
    const ok = v.ok && sin === null;
    if (!ok) malos++;
    let bloques = 0;
    for (let i = 0; i < M.v.length; i++) if (M.v[i] !== VACIO) bloques++;
    filas.push({
      n, ok, toques: M.plan.length, mecs: M.mec.length,
      tipos: M.mec.map(m => m.tipo[0] + m.pasos).join(''),
      caja: M.nx + 'x' + M.ny + 'x' + M.nz, bloques, intento: M.intento,
      sinMec: sin === null ? 'cada mecanismo hace falta' : ('SOBRA EL ' + sin), por: v.por,
    });
  }
  return { malos, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - t0), filas };
}
