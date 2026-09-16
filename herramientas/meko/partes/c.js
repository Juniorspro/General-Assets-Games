
/* ══════════════════════════════════════════════════════════════════════════
   C · EL MUNDO DE VOXELES Y LOS MECANISMOS
   Sin DOM y sin three: esto es lo que el validador y el auto-jugador corren,
   y tiene que poder correrse mil veces sin dibujar un pixel.
   ══════════════════════════════════════════════════════════════════════════ */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function nuevoMundo(nx, ny, nz) {
  return { nx, ny, nz, v: new Uint8Array(nx * ny * nz), mec: [], ini: null, meta: null };
}
const enM = (M, x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < M.nx && y < M.ny && z < M.nz;
const iM  = (M, x, y, z) => (y * M.nz + z) * M.nx + x;
function tipoBase(M, x, y, z) { return enM(M, x, y, z) ? M.v[iM(M, x, y, z)] : VACIO; }
function pon(M, x, y, z, t) { if (enM(M, x, y, z)) M.v[iM(M, x, y, z)] = t; }

/* ── EL ESTADO DE LOS MECANISMOS VIAJA APARTE DEL MUNDO ───────────────────
   Meter el mecanismo adentro de la grilla obligaria a borrarlo y volverlo a
   escribir en cada paso del validador —y una BFS hace decenas de miles de
   pasos—. Asi la grilla es constante y lo unico que cambia es un arreglo de
   tres numeros, que es lo que se puede guardar como estado de busqueda.    */
function estados0(M) { return M.mec.map(m => ({ e: 0, s: 1 })); }
function estCopia(E) { return E.map(o => ({ e: o.e, s: o.s })); }

/* que mecanismo ocupa esta celda, o -1. Devuelve el INDICE porque quien
   pregunta casi siempre quiere saber cual, no si: el robot que va montado
   arriba de uno se mueve con ESE y no con cualquiera.                      */
function mecEn(M, E, x, y, z) {
  for (let i = 0; i < M.mec.length; i++) {
    const m = M.mec[i], e = E[i].e;
    const ox = m.dir[0] * e, oy = m.dir[1] * e, oz = m.dir[2] * e;
    for (let k = 0; k < m.cel.length; k++) {
      const c = m.cel[k];
      if (c[0] + ox === x && c[1] + oy === y && c[2] + oz === z) return i;
    }
  }
  return -1;
}
function tipoEn(M, E, x, y, z) {
  const i = mecEn(M, E, x, y, z);
  if (i >= 0) return M.mec[i].bloq;
  return tipoBase(M, x, y, z);
}
const solidoEn  = (M, E, x, y, z) => esSolidoT(tipoEn(M, E, x, y, z));
const bloqueaEn = (M, E, x, y, z) => esBloqueaT(tipoEn(M, E, x, y, z));

/* UNA CELDA ES PISABLE SI EL ROBOT PUEDE ESTAR AHI Y ALGO LO SOSTIENE.
   El robot mide UNA celda a proposito: pidiendo dos, un tunel de un bloque de
   alto —que es la figura mas util que hay en un diorama chico— seria
   intransitable, y en una reja de 8 de alto eso se come medio nivel.       */
function pisable(M, E, x, y, z) {
  if (!enM(M, x, y, z)) return false;
  if (bloqueaEn(M, E, x, y, z)) return false;
  return solidoEn(M, E, x, y - 1, z);
}

/* ── LOS VECINOS: DE ACA SALE TODO EL JUEGO ───────────────────────────────
   Cuatro direcciones, y en cada una se prueba SUBIR UNO, plano, y caer hasta
   tres, en ese orden. La asimetria entre subir y caer es la regla: si se
   pudiera subir lo que se cae, una torre seria una rampa.
   Y la escalera agrega el eje vertical sin un caso aparte: como no bloquea
   pero sostiene, una columna de escaleras ya es una pila de celdas pisables;
   lo unico que hace falta es dejar moverse entre dos que se tocan.         */
function vecinos(M, E, c, out) {
  out = out || [];
  out.length = 0;
  const x = c[0], y = c[1], z = c[2];
  for (let d = 0; d < 4; d++) {
    const nx = x + DIRS[d][0], nz = z + DIRS[d][1];
    for (let dy = SUBE_MAX; dy >= -CAE_MAX; dy--) {
      const ny = y + dy;
      /* PARA SUBIR HAY QUE PODER PASAR POR ENCIMA DE LA CELDA DE ORIGEN, y
         va `continue` y no `break`: con un techo justo arriba de la cabeza el
         escalon no sale, pero caminar en llano sigue siendo legal. Con `break`
         un tunel de un bloque de alto se vuelve intransitable — y esa es la
         figura mas util que hay en un diorama chico. */
      if (dy > 0 && bloqueaEn(M, E, x, ny, z)) continue;
      if (pisable(M, E, nx, ny, nz)) { out.push([nx, ny, nz]); break; }
      /* una pared corta la columna: no se puede caer atravesandola */
      if (dy <= 0 && bloqueaEn(M, E, nx, ny, nz)) break;
    }
  }
  /* trepar: solo desde adentro de una escalera y hacia otra */
  if (tipoEn(M, E, x, y, z) === ESCALERA && pisable(M, E, x, y + 1, z)) out.push([x, y + 1, z]);
  if (tipoEn(M, E, x, y - 1, z) === ESCALERA && pisable(M, E, x, y - 1, z)) out.push([x, y - 1, z]);
  return out;
}

/* donde termina un cuerpo que se quedo sin piso. `null` = se cae del mundo, y
   eso no es una muerte: es una accion que NO SE PERMITE, ni al jugador ni al
   validador. Este juego no tiene forma de perder, igual que el original.   */
function cae(M, E, c) {
  let y = c[1];
  if (pisable(M, E, c[0], y, c[2])) return [c[0], y, c[2]];
  while (y > 0) {
    y--;
    if (bloqueaEn(M, E, c[0], y, c[2])) return null;
    if (pisable(M, E, c[0], y, c[2])) return [c[0], y, c[2]];
  }
  return null;
}

/* ── TOCAR UN MECANISMO ───────────────────────────────────────────────────
   Va y vuelve entre 0 y `pasos`: al llegar a una punta se da vuelta. El
   sentido tiene que viajar en el estado de la busqueda —no se puede deducir
   de la posicion— porque en el medio del recorrido las dos direcciones son
   legales y llevan a sitios distintos.

   Y LO QUE HACE QUE ESTO SEA UN JUEGO ES QUE EL ROBOT SE MONTA: si el bloque
   que lo sostiene es del mecanismo, se mueve con el. Sin eso un ascensor es
   una pared que sube y baja.                                               */
function mecMueve(M, E, rob, i) {
  const m = M.mec[i], st = E[i];
  let s = st.s, e2 = st.e + s;
  if (e2 < 0 || e2 > m.pasos) { s = -s; e2 = st.e + s; }
  if (e2 < 0 || e2 > m.pasos) return null;         /* pasos = 0: no hay nada que mover */
  const E2 = estCopia(E); E2[i].e = e2; E2[i].s = s;
  let r2 = rob;
  if (rob) {
    const monta = mecEn(M, E, rob[0], rob[1] - 1, rob[2]) === i;
    if (monta) r2 = [rob[0] + m.dir[0] * s, rob[1] + m.dir[1] * s, rob[2] + m.dir[2] * s];
    if (!enM(M, r2[0], r2[1], r2[2])) return null;
    if (bloqueaEn(M, E2, r2[0], r2[1], r2[2])) return null;   /* lo aplastaria */
    r2 = cae(M, E2, r2);
    if (!r2) return null;                                     /* lo tiraria del mundo */
  }
  return { E: E2, rob: r2 };
}

/* ── LA CLAVE DE UN ESTADO, EN UN ENTERO ──────────────────────────────────
   Una cadena por estado convierte una BFS de decenas de miles de nodos en
   medio segundo de basura. Cuatro bits por mecanismo —tres de posicion y uno
   de sentido— por como mucho tres mecanismos son doce bits, y la celda del
   robot entra al lado: el par cabe en un entero.
   DE ACA SALE EL TOPE DE `pasos`: siete. Un mecanismo con mas recorrido
   desbordaria los tres bits y dos posiciones distintas colisionarian en la
   misma clave — la busqueda daria por visitado un estado que no visito, y eso
   no falla: devuelve un nivel imposible como si fuera resuelto.            */
const MEC_TOPE = 3, MEC_PASOS_TOPE = 7;
function claveEst(M, E, rob) {
  let c = 0;
  for (let i = E.length - 1; i >= 0; i--) c = c * 16 + (E[i].e & 7) + (E[i].s > 0 ? 0 : 8);
  return (iM(M, rob[0], rob[1], rob[2]) * 4096) + c;
}
