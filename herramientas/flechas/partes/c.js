/* ══════════════════════════════════════════════════════════════════════════
   C · EL MODELO: PIEZAS, LA REGLA DE SALIDA, EL GENERADOR Y EL VALIDADOR
   NO TOCA NI EL DOM NI EL LIENZO, asi que se concatena con b.js y se corre en
   node: la economia del juego se afina antes de dibujar un solo pixel.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── LA UNICA REGLA DEL JUEGO ─────────────────────────────────────────────
   Una flecha sale deslizandose POR SU PROPIO TRAZADO, como una serpiente que
   se mete en su propio tubo, y cuando la cabeza pasa el borde sigue derecho.
   De ahi sale un teorema que es TODO el juego:

     las unicas celdas nuevas que la pieza llega a ocupar son las del RAYO
     que va de su cabeza al borde en la direccion de su punta.

   El cuerpo recorre celdas que la pieza YA ocupa —son suyas— asi que no
   pueden estorbarle. Por lo tanto:

     una flecha puede salir  <=>  el rayo desde su cabeza esta libre.

   Eso es lo que hace que el generador pueda ser correcto por construccion y
   que el dibujo y la regla no se puedan desincronizar: hay UNA cuenta.     */

function nuevoTab(nx, ny) {
  return { nx, ny, piezas: [], ocu: new Int16Array(nx * ny).fill(-1) };
}
const idx = (T, x, y) => y * T.nx + x;
const dentro = (T, x, y) => x >= 0 && y >= 0 && x < T.nx && y < T.ny;

/* La direccion de salida sale del ULTIMO SEGMENTO del trazado y no se guarda
   aparte: guardada, un trazado editado y una direccion vieja apuntan a lados
   distintos y la punta dibujada miente sobre por donde sale.               */
function dirDe(p) {
  const n = p.cel.length, a = p.cel[n - 2], b = p.cel[n - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (let d = 0; d < 4; d++) if (DIR[d][0] === dx && DIR[d][1] === dy) return d;
  return 0;
}

/* El rayo: de la cabeza al borde, sin contar la cabeza. Devuelve las celdas,
   que ademas son por donde el cuerpo se va a estirar al salir — el dibujo de
   la salida usa ESTA lista, no una copia.                                  */
function rayo(T, p) {
  const n = p.cel.length, h = p.cel[n - 1], d = DIR[dirDe(p)], r = [];
  let x = h[0] + d[0], y = h[1] + d[1];
  while (dentro(T, x, y)) { r.push([x, y]); x += d[0]; y += d[1]; }
  return r;
}
function puedeSalir(T, p) {
  const n = p.cel.length, h = p.cel[n - 1], d = DIR[dirDe(p)];
  let x = h[0] + d[0], y = h[1] + d[1];
  while (dentro(T, x, y)) {
    const o = T.ocu[idx(T, x, y)];
    if (o !== -1 && o !== p.i) return false;
    x += d[0]; y += d[1];
  }
  return true;
}
/* Quien bloquea: lo necesita la sacudida de la pieza que estorba, que es la
   unica forma de ENSENIAR la regla sin escribirla en un cartel.            */
function quienBloquea(T, p) {
  const n = p.cel.length, h = p.cel[n - 1], d = DIR[dirDe(p)];
  let x = h[0] + d[0], y = h[1] + d[1];
  while (dentro(T, x, y)) {
    const o = T.ocu[idx(T, x, y)];
    if (o !== -1 && o !== p.i) return o;
    x += d[0]; y += d[1];
  }
  return -1;
}
function largoRayo(T, x, y, D) {
  let n = 0, cx = x + D[0], cy = y + D[1];
  while (dentro(T, cx, cy)) { n++; cx += D[0]; cy += D[1]; }
  return n;
}
function pon(T, p) { for (const c of p.cel) T.ocu[idx(T, c[0], c[1])] = p.i; }
function quita(T, p) { for (const c of p.cel) T.ocu[idx(T, c[0], c[1])] = -1; }
const vivas = T => T.piezas.filter(p => !p.fuera);
const legales = T => vivas(T).filter(p => puedeSalir(T, p));

/* ── EL GENERADOR VA AL REVES, Y POR ESO NO PUEDE GENERAR UN NIVEL IMPOSIBLE
   Se arranca del tablero VACIO y se meten piezas de a una, exigiendo que el
   rayo de la que entra este libre EN ESE MOMENTO. Hacia adelante eso dice
   exactamente que la ultima insertada es la primera que puede salir, y
   sacandola queda el estado de antes de insertarla — o sea que el orden
   inverso de insercion ES una solucion, y existe por construccion.
   Y no es que el orden sea unico: al insertar la pieza k+1 se le puede tapar
   el rayo a la k, y ahi aparece la dependencia que hace que haya que pensar. */
/* Cuantas veces seguidas puede fallar una colocacion antes de dar el tablero
   por lleno. Cada falla cuesta doce barridos del tablero, asi que el techo de
   trabajo por nivel es PACIENCIA*12*celdas — con 220 y el mundo mas grande,
   377 mil comprobaciones, que es nada. Lo que compra es que el generador se
   entere de que el tablero esta lleno en vez de seguir intentando.        */
const PACIENCIA = 220;
function genTablero(cfg) {
  const rnd = azar(cfg.sem);
  const T = nuevoTab(cfg.nx, cfg.ny);
  const orden = [];                    /* el orden de insercion */
  let n0 = 0, fallas = 0;                /* n0: cuantas de rayo cero van */
  const NC = cfg.nx * cfg.ny;
  const bloqM = new Int32Array(NC);      /* cuantos rayos ajenos cruzan cada celda */
  const bloqQ = [];                      /* y de quienes: uno por celda */
  for (let i = 0; i < NC; i++) bloqQ.push([]);
  const reBloq = () => {
    bloqM.fill(0); for (let i = 0; i < NC; i++) bloqQ[i].length = 0;
    for (const p of T.piezas) for (const c of rayo(T, p)) {
      const k = idx(T, c[0], c[1]); bloqM[k]++; bloqQ[k].push(p.i);
    }
  };

  /* EL BUCLE SE CORTA POR FALLAS SEGUIDAS Y NO POR UN TOPE DE INTENTOS, y eso
     no es prolijidad: es lo unico que hace que la segunda fase EXISTA.
     Medido con el tope: los mundos 4, 5 y 6 salian SIEMPRE por agotar los
     intentos sin llegar siquiera a `cfg.n` piezas —18,4 de 22,5 pedidas en el
     mundo 6— asi que la fase de cierre no corria NI UNA VEZ en veinte niveles
     y `legales` se quedaba donde cayera. Y el motivo estaba a la vista en el
     desglose: 75.103 de 95.400 pruebas no encontraban NI UNA posicion
     candidata, porque con el tablero al 70 % casi ningun rayo llega libre al
     borde. O sea que el numero de piezas no es algo que se pida: es lo que el
     tablero da. Se pide un PISO, se persigue el numero de legales, y se para
     cuando el tablero deja de admitir nada — que es lo que `fallas` mide.

     DOS FASES, Y LA SEGUNDA ES LA QUE HACE EL JUEGO. La primera llena hasta
     el piso `cfg.n`. Medido ahi, la curva se PLANCHA a partir del tercer
     mundo —`legales/piezas` clavado en 0,42 del 3 al 6— porque ponderar y
     esperar que las piezas se tapen solas es rezar. La segunda persigue el
     numero: mientras queden mas legales que `cfg.lib` se siguen metiendo
     piezas ELEGIDAS POR CUANTAS LEGALES TAPAN, y la que no tapa ninguna se
     descarta. El nivel no se puede volver imposible haciendo eso: la que
     entra tiene el rayo libre en ese momento, asi que ella misma es la
     primera que puede salir.                                              */
  const objetivo = () => legales(T).length;
  while (fallas < PACIENCIA) {
    if (T.piezas.length >= cfg.n && objetivo() <= cfg.lib) break;
    const cierre = T.piezas.length >= cfg.n;
    if (T.piezas.length >= cfg.n + cfg.extra) break;
    reBloq();
    /* en la fase de cierre solo cuentan las piezas que HOY pueden salir:
       tapar una que ya esta tapada no baja el numero que se persigue */
    const legAhora = cierre ? new Set(legales(T).map(p => p.i)) : null;
    /* MEJOR DE VARIAS. La primera version elegia una posicion y la usaba, y
       medido daba `azar 1,000` en los 120 niveles: cualquier orden servia, o
       sea que el juego no pedia NADA. La palanca no es poner mas piezas sino
       poner cada una donde TAPE el rayo de las que ya estan — eso es lo que
       crea la dependencia que hay que deducir. Se arman varias candidatas
       validas y gana la que tapa a mas piezas distintas.                   */
    let mejor = null, mejorPt = -1, mejorLr = 1;
    for (let intento = 0; intento < 12; intento++) {
    /* EN EL CIERRE SE PRUEBAN LAS CUATRO DIRECCIONES Y NO UNA AL AZAR. La
       fase de cierre busca una aguja en un pajar —una cabeza con el rayo
       libre cuyo CUERPO ademas tape el rayo de una legal— y sortear la
       direccion tira tres cuartos de las posiciones posibles en cada prueba.
       Con `intento & 3` las cuatro entran siempre y no cuesta un scan mas.  */
    const d = cierre ? (intento & 3) : ((rnd() * 4) | 0), D = DIR[d], B = DIR[d ^ 1];

    /* CANDIDATAS A CABEZA: libres y con el rayo libre. Y ponderadas por
       vecinos ocupados, que es lo que hace que el tablero quede COMPACTO en
       vez de una lluvia de piezas sueltas: sin la ponderacion el nivel se ve
       a manchas y encima casi todas las piezas tienen el rayo libre, o sea
       que no hay orden que deducir.                                        */
    const cand = [];
    for (let y = 0; y < T.ny; y++) for (let x = 0; x < T.nx; x++) {
      if (T.ocu[idx(T, x, y)] !== -1) continue;
      const bx = x + B[0], by = y + B[1];        /* la celda de atras tiene que entrar */
      if (!dentro(T, bx, by) || T.ocu[idx(T, bx, by)] !== -1) continue;
      let lx = x + D[0], ly = y + D[1], ok = true;
      while (dentro(T, lx, ly)) {
        if (T.ocu[idx(T, lx, ly)] !== -1) { ok = false; break; }
        lx += D[0]; ly += D[1];
      }
      if (!ok) continue;
      let vec = 0;
      for (let k = 0; k < 4; k++) {
        const ax = x + DIR[k][0], ay = y + DIR[k][1];
        if (!dentro(T, ax, ay) || T.ocu[idx(T, ax, ay)] !== -1) vec++;
      }
      /* EL LARGO DEL RAYO MANDA, y es la correccion mas cara de este juego.
         Sin ella, medido, DIEZ de diecisiete piezas salian con rayo de largo
         CERO: pegadas al borde y apuntando hacia afuera, o sea legales
         siempre y sin nada que leer. La razon es que la condicion de
         insercion —«el rayo tiene que estar libre»— es trivial de cumplir en
         el borde, asi que el generador se amontonaba ahi. Una flecha que
         apunta hacia ADENTRO tiene que cruzar el amontonamiento entero, y es
         la unica que otra puede tapar.
         El rayo corto no se prohibe: una flecha que sale de una son las que
         hacen que el nivel se pueda empezar. Lo que se hace es que sean
         POCAS.                                                             */
      const lr = largoRayo(T, x, y, D);
      if (lr === 0 && n0 >= cfg.b0) continue;   /* el tope de rayo cero es DURO */
      const wR = lr === 0 ? 1 : (lr === 1 ? 3 : 12 + lr * 3);
      cand.push({ x, y, lr, peso: (1 + vec * vec * 3) * (1 + bloqM[idx(T, x, y)] * 4) * wR });
    }
    if (!cand.length) continue;

    let tot = 0; for (const c of cand) tot += c.peso;
    let r = rnd() * tot, sel = cand[cand.length - 1];
    for (const c of cand) { r -= c.peso; if (r <= 0) { sel = c; break; } }

    /* EL CUERPO SE CONSTRUYE HACIA ATRAS, y el primer paso es forzosamente la
       opuesta de la salida: la punta apunta a lo largo del ultimo segmento.
       Despues puede doblar, pero nunca 180 grados — eso seria pisarse a si
       misma, y una pieza que se pisa no puede deslizarse por su trazado.   */
    const largo = cfg.lmin + ((rnd() * (cfg.lmax - cfg.lmin + 1)) | 0);
    const cel = [[sel.x, sel.y]];
    const usa = new Set([sel.y * T.nx + sel.x]);
    let cx = sel.x, cy = sel.y, cd = d ^ 1;      /* hacia donde retrocede */
    let ok = true;
    for (let s = 1; s < largo; s++) {
      /* y en el cierre se mira doblar casi siempre: el que dobla es el
         cuerpo, y el cuerpo es lo que tapa */
      if (s > 1 && rnd() < (cierre ? 0.85 : cfg.dobla)) {
        /* doblar: las dos perpendiculares, y entre las dos gana la que cruza
           mas rayos ajenos — el trazado es el que hace el bloqueo, asi que
           doblar al azar desperdicia la mitad de la palanca */
        const per = (cd === 0 || cd === 1) ? [2, 3] : [0, 1];
        if (rnd() < 0.5) per.reverse();
        let elg = -1, elgPt = -1;
        for (const nd of per) {
          const nx2 = cx + DIR[nd][0], ny2 = cy + DIR[nd][1];
          if (!dentro(T, nx2, ny2) || T.ocu[idx(T, nx2, ny2)] !== -1 || usa.has(ny2 * T.nx + nx2)) continue;
          const pt = bloqM[idx(T, nx2, ny2)];
          if (pt > elgPt) { elgPt = pt; elg = nd; }
        }
        if (elg >= 0) cd = elg;
      }
      const nx2 = cx + DIR[cd][0], ny2 = cy + DIR[cd][1];
      if (!dentro(T, nx2, ny2) || T.ocu[idx(T, nx2, ny2)] !== -1 || usa.has(ny2 * T.nx + nx2)) {
        /* no se puede seguir: la pieza vale igual si ya llego al minimo */
        if (cel.length >= cfg.lmin) break;
        ok = false; break;
      }
      cel.unshift([nx2, ny2]); usa.add(ny2 * T.nx + nx2); cx = nx2; cy = ny2;
    }
    if (!ok || cel.length < 2) continue;

    /* cuantas PIEZAS DISTINTAS quedan tapadas por este trazado: contar celdas
       premiaria una pieza larga que cruza cuatro veces el rayo de la misma,
       y eso no crea ninguna dependencia nueva */
    const tap = new Set();
    for (const c of cel) for (const q of bloqQ[idx(T, c[0], c[1])]) if (!legAhora || legAhora.has(q)) tap.add(q);
    if (cierre && tap.size === 0) continue;      /* en el cierre, una pieza que no tapa nada solo estorba */
    const pt = tap.size * 10 + cel.length;
    if (pt > mejorPt) { mejorPt = pt; mejor = cel; mejorLr = sel.lr; }
    }   /* fin de las candidatas */

    if (!mejor) { fallas++; continue; }
    fallas = 0;
    if (mejorLr === 0) n0++;
    const p = { i: T.piezas.length, cel: mejor, fuera: false };
    T.piezas.push(p); pon(T, p); orden.push(p.i);
  }
  T.orden = orden.slice().reverse();     /* una solucion, por construccion */
  return T;
}

/* ── EL VALIDADOR ES INDEPENDIENTE DEL GENERADOR ──────────────────────────
   De nada sirve un validador que aprueba el juego que el generador cree haber
   hecho: tiene que buscar la solucion SOLO, con la misma `puedeSalir` que usa
   el dedo del jugador. DFS con memoria de estados muertos sobre la mascara de
   piezas que quedan — la mayoria de las 2^n mascaras no se alcanzan nunca. */
function resuelve(T, topeNodos) {
  const n = T.piezas.length;
  if (n === 0) return { ok: true, orden: [], nodos: 0 };
  if (n > 30) return { ok: false, orden: null, nodos: 0, motivo: 'demasiadas' };
  const ocu = Int16Array.from(T.ocu);
  const W = { nx: T.nx, ny: T.ny, ocu };
  const malos = new Set();
  const sol = [];
  let nodos = 0, tope = topeNodos || 400000, corto = false;

  const libre = p => {
    const m = p.cel.length, h = p.cel[m - 1], d = DIR[dirDe(p)];
    let x = h[0] + d[0], y = h[1] + d[1];
    while (x >= 0 && y >= 0 && x < W.nx && y < W.ny) {
      const o = ocu[y * W.nx + x];
      if (o !== -1 && o !== p.i) return false;
      x += d[0]; y += d[1];
    }
    return true;
  };

  function dfs(mask) {
    if (mask === 0) return true;
    if (malos.has(mask)) return false;
    if (++nodos > tope) { corto = true; return false; }
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      const p = T.piezas[i];
      if (!libre(p)) continue;
      for (const c of p.cel) ocu[c[1] * W.nx + c[0]] = -1;
      sol.push(i);
      if (dfs(mask & ~(1 << i))) return true;
      sol.pop();
      for (const c of p.cel) ocu[c[1] * W.nx + c[0]] = i;
      if (corto) return false;
    }
    malos.add(mask);
    return false;
  }
  const ok = dfs((1 << n) - 1);
  return { ok, orden: ok ? sol.slice() : null, nodos, corto };
}

/* ── LOS DOS AUTO-JUGADORES ───────────────────────────────────────────────
   El honesto resuelve y ejecuta; el del azar toca al azar entre las legales.
   La SEPARACION entre los dos es la unica prueba de que hay una decision
   adentro: si el que toca al azar termina el nivel, el nivel no pide nada. */
function juegaSolo(T0, modo, sem) {
  const T = clonaTab(T0);
  if (modo === 'honesto') {
    const r = resuelve(T);
    if (!r.ok) return { gano: false, toques: 0, motivo: 'sin solucion' };
    let t = 0;
    for (const i of r.orden) {
      const p = T.piezas[i];
      if (!puedeSalir(T, p)) return { gano: false, toques: t, motivo: 'la solucion no se puede jugar' };
      quita(T, p); p.fuera = true; t++;
    }
    return { gano: vivas(T).length === 0, toques: t };
  }
  const rnd = azar(sem || 12345);
  let t = 0, fallos = 0;
  while (vivas(T).length) {
    const L = legales(T);
    if (!L.length) return { gano: false, toques: t, fallos, motivo: 'trabado' };
    /* EL BOT QUE IMPORTA ES ESTE. Toca al azar ENTRE LAS LEGALES, o sea que
       mira el camino pero no piensa el orden: si gana siempre, el orden no
       decide nada y el nivel es un tramite. El de mas abajo —que ni mira— es
       el control de que la regla del camino existe.                        */
    if (modo === 'legal') {
      const p = L[(rnd() * L.length) | 0];
      quita(T, p); p.fuera = true; t++; continue;
    }
    /* el del azar toca CUALQUIER pieza viva, no solo las legales: es lo que
       hace un jugador que no mira el camino, y las que estan bloqueadas son
       las que le cuestan una vida */
    const V = vivas(T), p = V[(rnd() * V.length) | 0];
    if (!puedeSalir(T, p)) { fallos++; if (fallos > 400) return { gano: false, toques: t, fallos, motivo: 'no acierta' }; continue; }
    quita(T, p); p.fuera = true; t++;
  }
  return { gano: true, toques: t, fallos };
}

function clonaTab(T) {
  const C = nuevoTab(T.nx, T.ny);
  C.piezas = T.piezas.map(p => ({ i: p.i, cel: p.cel.map(c => [c[0], c[1]]), fuera: false }));
  for (const p of C.piezas) pon(C, p);
  C.orden = T.orden ? T.orden.slice() : null;
  return C;
}

/* ── LA AUDITORIA ─────────────────────────────────────────────────────────
   Un nivel generado y no jugado es un nivel roto que todavia no se sabe. Se
   comprueba: que exista solucion buscada por el validador, que la solucion se
   pueda ejecutar de verdad, que la cantidad de piezas sea la pedida, y —lo
   que decide si el nivel es un juego o un tramite— cuantas piezas se pueden
   sacar en el primer toque y si el que toca al azar lo termina.            */
function auditaNivel(m, n) {
  const cfg = cfgNivel(m, n);
  const T = genTablero(cfg);
  const nP = T.piezas.length;
  const r = resuelve(T);
  const h = juegaSolo(T, 'honesto');
  /* LA METRICA DE ESTE JUEGO NO ES «GANA O PIERDE», Y ESO SALIO DE UN
     TEOREMA: sacar una pieza solo puede LIBERAR rayos, nunca taparlos, asi
     que el conjunto de legales solo crece y cualquier orden legal termina el
     tablero. O sea que el juego no es de ORDEN sino de LECTURA, y lo que hay
     que medir es cuan probable es acertar sin mirar el camino:
       pAcierto  = legales/vivas promediado a lo largo de la partida
       fallosAzar = toques errados de quien no mira, hasta vaciar el tablero
     Con tres vidas, un `fallosAzar` alto significa que el que no lee pierde.  */
  const S = clonaTab(T); let acum = 0, pasos = 0;
  while (vivas(S).length) {
    const V = vivas(S), L = legales(S);
    acum += L.length / V.length; pasos++;
    const p = L[0]; quita(S, p); p.fuera = true;
  }
  const pAcierto = pasos ? acum / pasos : 1;
  let fallos = 0;
  for (let s = 0; s < 8; s++) fallos += juegaSolo(T, 'azar', cfg.sem + s * 977).fallos | 0;
  let celdas = 0; for (const p of T.piezas) celdas += p.cel.length;
  return {
    m, n, piezas: nP, pedidas: cfg.n, celdas,
    densidad: +(celdas / (cfg.nx * cfg.ny)).toFixed(3),
    ok: r.ok && h.gano && nP >= 2,
    libres: legales(T).length, nodos: r.nodos,
    pAcierto: +pAcierto.toFixed(3), fallos: +(fallos / 8).toFixed(1),
    largoMedio: +(celdas / nP).toFixed(2),
  };
}
function auditaTodo() {
  const t0 = Date.now(); const malos = []; let sumLib = 0, sumAc = 0, sumDen = 0, sumP = 0, maxNod = 0, sumFa = 0, sumLg = 0;
  for (let m = 0; m < MUNDOS.length; m++) for (let n = 0; n < NIV_MUNDO; n++) {
    const a = auditaNivel(m, n);
    if (!a.ok) malos.push(m + '-' + n);
    sumLib += a.libres; sumAc += a.pAcierto; sumDen += a.densidad;
    sumP += a.piezas; sumFa += a.fallos; sumLg += a.largoMedio;
    if (a.nodos > maxNod) maxNod = a.nodos;
  }
  const N = NIVELES;
  return {
    niveles: N, malos, ms: Date.now() - t0,
    libresMedio: +(sumLib / N).toFixed(2), pAciertoMedio: +(sumAc / N).toFixed(3),
    fallosMedio: +(sumFa / N).toFixed(1), largoMedio: +(sumLg / N).toFixed(2),
    densidadMedia: +(sumDen / N).toFixed(3), piezasMedio: +(sumP / N).toFixed(1), maxNodos: maxNod,
  };
}
