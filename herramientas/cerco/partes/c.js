/* ══════════════════════════════════════════════════════════════════════════
   C · EL MODELO
   NO TOCA NI EL DOM NI EL LIENZO, y eso no es prolijidad: es lo que permite
   concatenar b.js + c.js e importarlos en node para auditar los cuarenta
   niveles y correr los dos auto-jugadores sin abrir un navegador.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── EL TEOREMA DEL JUEGO ─────────────────────────────────────────────────
   Lo que uno encierra con su estela es suyo, y «encierra» es literal: el
   terreno propio mas la estela forman un anillo 4-CONEXO, y un anillo
   4-conexo separa el plano bajo relleno de 4 vecinos. O sea que rellenar
   desde afuera y quedarse con lo que NO se alcanzo no es una aproximacion:
   es exactamente lo que se rodeo.
   DE AHI SALE QUE LA ROCA SE PUEDA CRUZAR EN EL RELLENO. Como la barrera es
   el terreno propio y nada mas, dejar pasar la roca no abre ninguna fuga —y
   al reves, si la roca bloqueara, un hueco rodeado de piedra se regalaria
   sin que nadie lo hubiera rodeado nunca.                                  */

function nuevoM(n) {
  return {
    n, z: new Uint8Array(n * n), t: new Uint8Array(n * n),
    jug: [], f: 0, libres: n * n, cuenta: new Int32Array(NJUG + 1),
    sucio: true, reloj: 0, arena: false,
    _vis: null, _pila: null, _bq: null,
  };
}
const dentro = (M, x, y) => x >= 0 && y >= 0 && x < M.n && y < M.n;
const solido = (M, x, y) => !dentro(M, x, y) || M.z[y * M.n + x] === PIEDRA;

function nuevoJug(id, bot) {
  return {
    id, bot: bot || null, ix: 0, iy: 0, dx: 1, dy: 0, ped: null,
    vivo: true, fuera: false, estela: 0, cola: [], cortes: 0, cerros: 0,
    /* `cortes` son las veces que te cortaron A VOS y `matas` las que cortaste
       vos: dos numeros distintos que en la campana no hacia falta separar,
       porque ahi el rival no es un marcador, es un obstaculo.              */
    matas: 0,
    dc: null, dcSucio: true, plan: null, muerteT: 0,
  };
}

/* ── RECLAMAR ─────────────────────────────────────────────────────────────
   ES UNA SOLA FUNCION Y LA USAN CUATRO COSAS: el jugador, los bots, el
   auditor y el dibujo del destello. Con dos cuentas, el auditor estaria
   aprobando un juego que no existe.                                        */
function reclama(M, p) {
  const n = M.n, id = p.id, z = M.z, t = M.t;
  let nue = 0;
  for (let i = 0; i < t.length; i++) if (t[i] === id) { t[i] = 0; if (z[i] !== id) { z[i] = id; nue++; } }
  p.estela = 0; p.cola.length = 0;

  /* reja virtual de (n+2)²: el anillo de afuera siempre se pisa, asi que el
     relleno arranca de un sitio que existe sin tener que tratar los bordes
     como un caso aparte.                                                   */
  const w = n + 2, W = w * w;
  if (!M._vis || M._vis.length !== W) { M._vis = new Uint8Array(W); M._pila = new Int32Array(W); }
  const vis = M._vis, pila = M._pila;
  vis.fill(0);
  let sp = 0; pila[sp++] = 0; vis[0] = 1;
  while (sp > 0) {
    const c = pila[--sp], cx = c % w, cy = (c / w) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIR[d][0], ny = cy + DIR[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= w) continue;
      const k = ny * w + nx; if (vis[k]) continue;
      if (nx > 0 && ny > 0 && nx <= n && ny <= n && z[(ny - 1) * n + (nx - 1)] === id) continue;
      vis[k] = 1; pila[sp++] = k;
    }
  }
  for (let y = 0; y < n; y++) {
    const fv = (y + 1) * w + 1, fz = y * n;
    for (let x = 0; x < n; x++) {
      if (vis[fv + x]) continue;
      const i = fz + x, v = z[i];
      if (v === PIEDRA || v === id) continue;
      z[i] = id; nue++;
    }
  }
  p.fuera = false; p.cerros++;
  M.sucio = true;
  for (const q of M.jug) q.dcSucio = true;
  return nue;
}

/* ── EL CAMPO DE DISTANCIA AL BORDE, CON SIGNO ────────────────────────────
   Un BFS por celda para decidir cada paso costaria, sobre los cuarenta
   niveles, cientos de millones de visitas. El campo cuesta O(n²) UNA VEZ por
   cambio de terreno —el mismo precio que el relleno que lo provoco— y se
   calcula PEREZOSO: un bot que no esta volviendo a casa no lo paga.

   Y LLEVA SIGNO, que es lo que lo hace servir para las dos mitades del
   viaje. Con el campo medido desde el terreno propio, TODO lo propio vale
   cero: adentro no hay pendiente, asi que un bot parado en el medio de su
   casa no tiene por donde subir y sale dando vueltas al azar hasta chocarse
   con el borde. Medido, eso eran DIECISEIS TICS seguidos en el cero, y el
   terreno crece, o sea que empeora solo a lo largo de la partida.
   El cero pasa a ser EL BORDE: hacia afuera +1, +2… y hacia adentro −1, −2…
   Con eso «salir» es subir por el campo desde donde se este, y el camino que
   sale es el mas corto por construccion.                                   */
const DC_NADA = -1e6;
function campoCasa(M, p) {
  const n = M.n, N = n * n;
  if (!p.dc || p.dc.length !== N) p.dc = new Int32Array(N);
  const dc = p.dc; dc.fill(DC_NADA);
  if (!M._bq || M._bq.length !== N) M._bq = new Int32Array(N);
  const q = M._bq; let qa = 0, qb = 0;
  /* semilla: las celdas propias que dan a algo pisable que no es propio */
  for (let i = 0; i < N; i++) {
    if (M.z[i] !== p.id) continue;
    const cx = i % n, cy = (i / n) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIR[d][0], ny = cy + DIR[d][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const k = ny * n + nx;
      if (M.z[k] === PIEDRA || M.z[k] === p.id) continue;
      dc[i] = 0; q[qb++] = i; break;
    }
  }
  /* un terreno encerrado sin una sola salida no tiene borde: se cae al campo
     de antes para que el bot al menos tenga un gradiente y no un plano.    */
  if (!qb) for (let i = 0; i < N; i++) if (M.z[i] === p.id) { dc[i] = 0; q[qb++] = i; }
  while (qa < qb) {
    const c = q[qa++], cx = c % n, cy = (c / n) | 0, v = dc[c];
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIR[d][0], ny = cy + DIR[d][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const k = ny * n + nx;
      if (dc[k] !== DC_NADA || M.z[k] === PIEDRA) continue;
      /* lo propio baja y lo ajeno sube. Una celda propia vecina de una de
         afuera ya se sembro en cero, asi que las dos ramas no se cruzan.   */
      dc[k] = M.z[k] === p.id ? v - 1 : v + 1;
      q[qb++] = k;
    }
  }
  p.dcSucio = false;
  return dc;
}
const verCasa = (M, p) => (p.dcSucio || !p.dc ? campoCasa(M, p) : p.dc);

function recuenta(M) {
  M.cuenta.fill(0);
  for (let i = 0; i < M.z.length; i++) { const v = M.z[i]; if (v > 0 && v < PIEDRA) M.cuenta[v]++; }
  M.sucio = false;
}
function tajada(M, id) {
  if (M.sucio) recuenta(M);
  return M.libres > 0 ? M.cuenta[id] / M.libres : 0;
}

/* ── LA TABLA DE POSICIONES ───────────────────────────────────────────────
   Devuelve los que juegan ordenados por terreno, y el PUESTO sale de ahi y
   no de una segunda cuenta: con dos, el numero grande del marcador y la fila
   resaltada de la tabla pueden decir cosas distintas, que es justo el defecto
   que nadie ve hasta que le pasa a un jugador.

   EL MUERTO SIGUE EN LA TABLA, en cero. Sacarlo hace que los puestos de abajo
   SUBAN cuando alguien se muere: uno mira el marcador, ve que paso de sexto a
   quinto sin haber hecho nada, y el numero deja de significar.              */
function tablaPos(M) {
  if (M.sucio) recuenta(M);
  const f = [];
  for (const p of M.jug) f.push({ id: p.id, pct: M.libres > 0 ? M.cuenta[p.id] / M.libres : 0, vivo: p.vivo, matas: p.matas });
  f.sort((a, b) => b.pct - a.pct || a.id - b.id);
  for (let i = 0; i < f.length; i++) f[i].pos = i + 1;
  return f;
}
const puestoDe = (M, id) => { const t = tablaPos(M); for (const f of t) if (f.id === id) return f.pos; return t.length; };

/* ── UN PASO DE CELDA ─────────────────────────────────────────────────────
   TODOS LOS CUERPOS VAN A LA MISMA VELOCIDAD Y ARRANCAN ALINEADOS, asi que
   cruzan el borde de celda en el mismo instante: la fraccion es UNA, del
   tablero, y no una por jugador. Con una por jugador habria que decidir en
   que orden se resuelven dos cabezas que entran a la misma celda, y el
   resultado dependeria del orden del array.                                */
function tic(M) {
  const n = M.n, vivos = [];
  for (const p of M.jug) {
    if (!p.vivo) continue;
    if (p.ped && !(p.ped[0] === -p.dx && p.ped[1] === -p.dy)) { p.dx = p.ped[0]; p.dy = p.ped[1]; }
    p.ped = null;
    p.ix += p.dx; p.iy += p.dy;
    vivos.push(p);
  }

  /* LAS MUERTES SE JUNTAN Y SE APLICAN TODAS DE UNA, y la estela se mira
     ANTES de que nadie deje la de este paso: si no, el que se mueve primero
     tendria ventaja sobre el que se mueve segundo por estar antes en la
     lista.                                                                 */
  const mata = new Set();
  for (const p of vivos) {
    if (!dentro(M, p.ix, p.iy)) { mata.add(p); continue; }
    const i = p.iy * n + p.ix;
    if (M.z[i] === PIEDRA) { mata.add(p); continue; }
    const te = M.t[i];
    if (te !== 0) {
      /* el dueno de la estela es el que cae: pisar la propia es suicidio y
         pisar la ajena es un corte. Una sola regla, dos resultados.        */
      const q = M.jug[te - 1];
      if (q && q.vivo) { mata.add(q); if (q !== p) p.matas++; }
    }
  }
  for (let a = 0; a < vivos.length; a++) for (let b = a + 1; b < vivos.length; b++)
    if (vivos[a].ix === vivos[b].ix && vivos[a].iy === vivos[b].iy) { mata.add(vivos[a]); mata.add(vivos[b]); }

  for (const p of mata) muere(M, p);

  for (const p of vivos) {
    if (!p.vivo) continue;
    const i = p.iy * n + p.ix;
    if (M.z[i] === p.id) { if (p.fuera) reclama(M, p); }
    else { if (M.t[i] !== p.id) { M.t[i] = p.id; p.estela++; p.cola.push(i); } p.fuera = true; }
  }
  for (const p of vivos) if (p.vivo && p.bot) piensa(M, p);
}

function muere(M, p) {
  if (!p.vivo) return;
  p.vivo = false; p.cortes++;
  for (let i = 0; i < M.t.length; i++) if (M.t[i] === p.id) M.t[i] = 0;
  /* EN LA ARENA EL TERRENO SE PIERDE ENTERO, y es la otra mitad de lo que
     hace que cortar a alguien signifique algo. En la campana el corte cuesta
     tiempo y posicion —el terreno espera— porque ahi la partida tiene reloj
     y meta; sin reloj ni meta, un corte que no borra nada no cuesta nada, y
     entonces la tabla de posiciones no se puede mover.

     Y esto es tambien lo que hace que el juego respire: lo que el muerto
     suelta vuelve a ser tablero libre y ahi vuelve a haber para todos.     */
  if (M.arena) {
    const z = M.z;
    for (let i = 0; i < z.length; i++) if (z[i] === p.id) z[i] = LIBRE;
    M.sucio = true;
    for (const q of M.jug) q.dcSucio = true;
  }
  p.estela = 0; p.cola.length = 0; p.fuera = false; p.plan = null;
  p.muerteT = M.reloj;
}

/* ── RENACER ──────────────────────────────────────────────────────────────
   EL TERRENO NO SE PIERDE. Perderlo entero en cada corte convierte tres
   vidas en tres intentos del nivel completo con el reloj corriendo; lo que
   un corte tiene que costar es TIEMPO y POSICION, que es lo que cuesta
   volver a salir desde el medio de lo propio.                              */
function renace(M, p) {
  const n = M.n;
  let mejor = -1, mejorV = -1;
  const cab = [];
  for (const q of M.jug) if (q !== p && q.vivo) cab.push([q.ix, q.iy]);
  for (let i = 0; i < M.z.length; i++) {
    if (M.z[i] !== p.id) continue;
    const x = i % n, y = (i / n) | 0;
    let d = 1e9;
    for (const c of cab) { const e = Math.abs(c[0] - x) + Math.abs(c[1] - y); if (e < d) d = e; }
    if (d > mejorV) { mejorV = d; mejor = i; }
  }
  if (mejor < 0) mejor = carvaCasa(M, p);
  p.ix = mejor % n; p.iy = (mejor / n) | 0;
  p.vivo = true; p.fuera = false; p.estela = 0; p.ped = null; p.plan = null; p.dcSucio = true;
  /* mira hacia adentro de lo propio: renacer apuntando al vacio es salir sin
     haberlo pedido, y eso no es un renacimiento, es otro corte.            */
  let d0 = 0;
  for (let d = 0; d < 4; d++) {
    const nx = p.ix + DIR[d][0], ny = p.iy + DIR[d][1];
    if (dentro(M, nx, ny) && M.z[ny * n + nx] === p.id) { d0 = d; break; }
  }
  p.dx = DIR[d0][0]; p.dy = DIR[d0][1];
}

/* Carva un cuadrado nuevo donde mas neutral haya y mas lejos de las cabezas
   ajenas. Sólo hace falta cuando a alguien le encerraron TODO el terreno.  */
function carvaCasa(M, p, rad) {
  const n = M.n, r = rad || 2;
  const cab = [];
  for (const q of M.jug) if (q !== p && q.vivo) cab.push([q.ix, q.iy]);
  let mejor = -1, mejorV = -1e9;
  for (let y = r + 1; y < n - r - 1; y += 2) for (let x = r + 1; x < n - r - 1; x += 2) {
    let lib = 0, roca = 0;
    for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
      const v = M.z[(y + b) * n + (x + a)];
      if (v === PIEDRA) roca++; else if (v === LIBRE) lib++;
    }
    if (roca > 0) continue;
    let d = 1e9;
    for (const c of cab) { const e = Math.abs(c[0] - x) + Math.abs(c[1] - y); if (e < d) d = e; }
    /* EN LA ARENA PESA EL HUECO Y NO LA DISTANCIA, porque carvar PISA lo que
       haya: con ocho cuerpos renaciendo todo el tiempo, un renacimiento que
       prefiere terreno ajeno le roba a alguien un cuadrado cada vez que lo
       cortan. En la campana da igual —renacer casi nunca llega hasta aca,
       porque el terreno propio no se pierde.                               */
    const v = lib * (M.arena ? 6 : 2) + Math.min(d, 30) * 3;
    if (v > mejorV) { mejorV = v; mejor = y * n + x; }
  }
  if (mejor < 0) mejor = ((n >> 1) * n + (n >> 1));
  const cx = mejor % n, cy = (mejor / n) | 0;
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const x = cx + a, y = cy + b;
    if (!dentro(M, x, y)) continue;
    const i = y * n + x;
    if (M.z[i] !== PIEDRA) M.z[i] = p.id;
  }
  M.sucio = true;
  for (const q of M.jug) q.dcSucio = true;
  return mejor;
}

/* ── EL PASO DE RELOJ ─────────────────────────────────────────────────────
   La fraccion se acumula y los ticks salen enteros: asi un telefono a 30 y
   una notebook a 144 juegan EL MISMO juego.                                */
const RENACE_S = 1.15;
function paso(M, dt) {
  M.reloj += dt;
  for (const p of M.jug) if (!p.vivo && M.reloj - p.muerteT >= RENACE_S && p.cortes < (p.topeCortes || 1e9)) renace(M, p);
  M.f += VEL * dt;
  let g = 0;
  while (M.f >= 1 && g < 8) { M.f -= 1; tic(M); g++; }
  if (M.f >= 1) M.f = 0;
}

/* ══════════════════════ EL MAPA ══════════════════════ */
function generaMapa(cfg) {
  const n = cfg.n, M = nuevoM(n), R = azar(cfg.sem);
  M.arena = !!cfg.arena;
  /* EL AZAR DEL CEREBRO SALE DE LA SEMILLA DEL NIVEL, y no es prolijidad:
     con `Math.random` la misma auditoria devolvia gana 3, 4, 4, 7 y 5 sobre
     el MISMO binario, asi que comparar dos ajustes no significaba nada — tres
     mediciones seguidas se leyeron como regresion y eran ruido. Y del lado del
     jugador vale lo mismo: un nivel con semilla tiene que ser EL MISMO nivel,
     o reintentar el que casi ganaste es jugar otro.                          */
  M.az = azar(cfg.sem ^ 0x5bf03635);
  ponPiedras(M, cfg, R);

  /* las casas van repartidas en un circulo: con posiciones al azar dos
     jugadores pueden nacer pegados y el nivel se decide en el primer
     segundo, que no es dificultad sino sorteo.                            */
  /* CON UN SOLO JUGADOR EL CIRCULO NO SEPARA NADA Y ENCIMA ESTORBA: el radio
     existe para que dos casas no nazcan pegadas, y sin rival lo unico que hace
     es empujar la unica casa contra una pared. Medido en el tutorial —26 celdas
     y `riv: 0`— la casa caia en el 18 de 26, o sea cinco celdas de aire de un
     lado y dieciseis del otro, con la camara clavada en su tope. Ninguno de los
     cinco mundos tiene `riv: 0`, asi que esto toca al tutorial y a nada mas. */
  const nj = 1 + cfg.riv, rad = nj > 1 ? n * 0.31 : 0, cx = n / 2, cy = n / 2;
  const a0 = R() * Math.PI * 2;
  for (let j = 0; j < nj; j++) {
    const a = a0 + j * Math.PI * 2 / nj;
    let x = Math.round(cx + Math.cos(a) * rad), y = Math.round(cy + Math.sin(a) * rad);
    x = cl(x, 4, n - 5); y = cl(y, 4, n - 5);
    /* `per` PUEDE SER UN ARREGLO, y con eso la arena tiene siete cabezas
       distintas sin escribir siete cerebros: uno manso que sale poco, uno
       temerario que se va al otro lado del tablero, y cinco en el medio. La
       campana le sigue pasando un numero, asi que no cambia nada.         */
    const per = Array.isArray(cfg.per) ? cfg.per[(j - 1) % cfg.per.length] : cfg.per;
    const p = nuevoJug(j + 1, j === 0 ? null : { per });
    M.jug.push(p);
    for (let b = -2; b <= 2; b++) for (let a2 = -2; a2 <= 2; a2++) {
      const i = (y + b) * n + (x + a2);
      M.z[i] = p.id;
    }
    /* un anillo de una celda alrededor de la casa se limpia de roca: nacer
       con la unica salida tapada es perder antes de tocar la pantalla.    */
    for (let b = -3; b <= 3; b++) for (let a2 = -3; a2 <= 3; a2++) {
      const xx = x + a2, yy = y + b;
      if (!dentro(M, xx, yy)) continue;
      const i = yy * n + xx;
      if (M.z[i] === PIEDRA) M.z[i] = LIBRE;
    }
    p.ix = x; p.iy = y; p.dx = 1; p.dy = 0;
  }

  /* CONEXIDAD POR CONSTRUCCION: lo que no se alcanza desde la casa del
     jugador pasa a ser roca. Un bolsillo suelto no rompe el relleno —la
     barrera es el terreno propio— pero si rompe el juego: seria terreno que
     cuenta para la meta y al que no se puede llegar.                      */
  selloSueltos(M);
  M.libres = 0;
  for (let i = 0; i < M.z.length; i++) if (M.z[i] !== PIEDRA) M.libres++;
  M.sucio = true;
  M.cfg = cfg;
  return M;
}

function ponPiedras(M, cfg, R) {
  const n = M.n, z = M.z;
  const roca = (x, y) => { if (dentro(M, x, y)) z[y * n + x] = PIEDRA; };
  const bloque = (x, y, w, h) => { for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) roca(x + a, y + b); };
  switch (cfg.pat) {
    case 'pilares': {
      const paso = Math.max(7, Math.round(n / 7));
      for (let y = paso; y < n - 3; y += paso) for (let x = paso; x < n - 3; x += paso) {
        const w = 2 + (R() < 0.4 ? 1 : 0);
        bloque(x - (w >> 1), y - (w >> 1), w, w);
      }
      break;
    }
    case 'cruz': {
      const g = Math.max(3, Math.round(n * 0.07)), c = n >> 1, hu = Math.round(n * 0.17);
      for (let i = 0; i < n; i++) {
        if (Math.abs(i - c) < hu) continue;
        for (let k = 0; k < g; k++) { roca(i, c - (g >> 1) + k); roca(c - (g >> 1) + k, i); }
      }
      break;
    }
    case 'islas': {
      const q = Math.round(n * n / 240);
      for (let i = 0; i < q; i++) {
        const x = 3 + Math.floor(R() * (n - 6)), y = 3 + Math.floor(R() * (n - 6));
        const w = 2 + Math.floor(R() * 4), h = 2 + Math.floor(R() * 4);
        bloque(x, y, w, h);
      }
      break;
    }
    case 'anillo': {
      const c = (n - 1) / 2, r1 = n * 0.30, r2 = n * 0.34;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const d = Math.hypot(x - c, y - c);
        if (d < r1 || d > r2) continue;
        const a = Math.atan2(y - c, x - c);
        /* cuatro puertas: un anillo cerrado parte el mapa en dos y el
           sellado de sueltos se llevaria la mitad del tablero.            */
        let puerta = false;
        for (let k = 0; k < 4; k++) if (Math.abs(((a - k * Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > Math.PI - 0.22) puerta = true;
        if (!puerta) roca(x, y);
      }
      break;
    }
  }
}

function selloSueltos(M) {
  const n = M.n, N = n * n, vis = new Uint8Array(N), q = new Int32Array(N);
  let qa = 0, qb = 0, ini = -1;
  for (let i = 0; i < N; i++) if (M.z[i] === 1) { ini = i; break; }
  if (ini < 0) for (let i = 0; i < N; i++) if (M.z[i] !== PIEDRA) { ini = i; break; }
  if (ini < 0) return;
  vis[ini] = 1; q[qb++] = ini;
  while (qa < qb) {
    const c = q[qa++], cx = c % n, cy = (c / n) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIR[d][0], ny = cy + DIR[d][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const k = ny * n + nx;
      if (vis[k] || M.z[k] === PIEDRA) continue;
      vis[k] = 1; q[qb++] = k;
    }
  }
  for (let i = 0; i < N; i++) if (!vis[i] && M.z[i] !== PIEDRA) M.z[i] = PIEDRA;
}

/* ── LA AUDITORIA DEL MAPA ────────────────────────────────────────────────
   Cuatro propiedades, y las cuatro rompen el nivel de formas que una captura
   no muestra: terreno inalcanzable que cuenta para la meta, una casa tapada,
   dos casas pegadas, o una meta que ni ocupando todo se alcanza.          */
function auditaMapa(M) {
  const n = M.n, N = n * n, cfg = M.cfg;
  const vis = new Uint8Array(N), q = new Int32Array(N);
  let qa = 0, qb = 0;
  const ini = M.jug[0].iy * n + M.jug[0].ix;
  vis[ini] = 1; q[qb++] = ini;
  while (qa < qb) {
    const c = q[qa++], cx = c % n, cy = (c / n) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIR[d][0], ny = cy + DIR[d][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const k = ny * n + nx;
      if (vis[k] || M.z[k] === PIEDRA) continue;
      vis[k] = 1; q[qb++] = k;
    }
  }
  let libres = 0, alcanz = 0;
  for (let i = 0; i < N; i++) { if (M.z[i] !== PIEDRA) { libres++; if (vis[i]) alcanz++; } }
  let salidas = 99, cerca = 1e9;
  for (const p of M.jug) {
    let s = 0;
    for (let d = 0; d < 4; d++) {
      const nx = p.ix + DIR[d][0] * 3, ny = p.iy + DIR[d][1] * 3;
      if (dentro(M, nx, ny) && M.z[ny * n + nx] !== PIEDRA) s++;
    }
    if (s < salidas) salidas = s;
    for (const r of M.jug) if (r !== p) {
      const e = Math.abs(r.ix - p.ix) + Math.abs(r.iy - p.iy);
      if (e < cerca) cerca = e;
    }
  }
  if (M.jug.length < 2) cerca = 999;
  const malos = [];
  if (alcanz !== libres) malos.push('sueltas:' + (libres - alcanz));
  if (salidas < 2) malos.push('casa tapada');
  if (cerca < n * 0.30) malos.push('casas pegadas:' + cerca);
  if (cfg && cfg.meta > 0.92) malos.push('meta imposible');
  return { n, libres, alcanz, salidas, cerca, roca: N - libres, meta: cfg ? cfg.meta : 0, malos };
}

/* ══════════════════════ LOS BOTS ══════════════════════
   Entran por `p.ped`, o sea POR EL MISMO SITIO QUE EL DEDO. Con un camino
   propio, que un bot termine el nivel no diria nada sobre el nivel que se
   juega.                                                                   */
function legales(M, p) {
  const out = [];
  for (let d = 0; d < 4; d++) {
    const dx = DIR[d][0], dy = DIR[d][1];
    if (dx === -p.dx && dy === -p.dy) continue;      /* nada de media vuelta */
    const nx = p.ix + dx, ny = p.iy + dy;
    if (!dentro(M, nx, ny)) continue;
    const i = ny * M.n + nx;
    if (M.z[i] === PIEDRA) continue;
    if (M.t[i] === p.id) continue;                   /* la propia estela mata */
    out.push(d);
  }
  return out;
}
function cabCerca(M, p) {
  let d = 1e9;
  for (const q of M.jug) if (q !== p && q.vivo) {
    const e = Math.abs(q.ix - p.ix) + Math.abs(q.iy - p.iy);
    if (e < d) d = e;
  }
  return d;
}

const rnd = M => M.az ? M.az() : Math.random();

/* ── CUANTO FALTA PARA QUE ME CORTEN ──────────────────────────────────────
   EL PELIGRO NO ES QUE UN RIVAL ESTE CERCA DE MI CABEZA: ES QUE LLEGUE A MI
   ESTELA ANTES QUE YO A CASA. Medido contra la cabeza y con un radio fijo,
   el bot se TRABABA: salia, veia un rival a nueve celdas —con la estela en
   cero, o sea sin una sola celda que perder— se volvia, y repetia. En el
   nivel 4-2 eso fueron TREINTA Y DOS abortos y el 2,1 % del tablero.
   Sin estela no hay riesgo: parado en lo propio a nadie lo pueden cortar. */
function riesgo(M, p) {
  const c = p.cola, L = c.length;
  if (!L) return 1e9;
  const n = M.n;
  /* EL CONTROL `ciego` NO ES TORPEZA: ES NO MIRAR. Juega la misma geometria
     —esquiva paredes, piedras y su propia estela todos los tics— y lo unico
     que no hace es preguntar donde estan los rivales, o sea que se vuelve a
     casa por el tramo y no por el corte. Es el unico control que aisla LA
     decision de este juego.
     Dos intentos anteriores no median el juego: uno que dejaba de pensar del
     todo se mataba contra el decorado (87 de 114 muertes contra pared o
     piedra) y otro que solo retrasaba la vista de los rivales casi no movia
     el resultado (35 a 39 de 40 entre 0,37 y 1,11 s de atraso).            */
  if (p.bot && p.bot.ciego) return 1e9;
  let d = 1e9;
  for (const q of M.jug) {
    if (q === p || !q.vivo) continue;
    for (let k = 0; k < L; k++) {
      const i = c[k], e = Math.abs((i % n) - q.ix) + Math.abs(((i / n) | 0) - q.iy);
      if (e < d) d = e;
    }
  }
  return d;
}

/* EL BOT NO CUENTA PASOS: MIRA LA PROFUNDIDAD.
   Contando pasos, el tramo se gasta tambien caminando adentro de lo propio —y
   como el terreno crece, a mitad de partida casi todo el tramo se va en cruzar
   la casa y las vueltas se achican solas. Medido asi, el bot cercaba 40 celdas
   por vuelta donde hacen falta mas del doble. `dc` ya dice a cuantos pasos de
   lo propio esta cada celda, o sea que «salir» es subir por ese campo, «correr
   el costado» es mantenerlo y «volver» es bajarlo: los tres modos son el mismo
   numero y ninguno depende de por donde se venia.                           */
function piensa(M, p) {
  const b = p.bot; if (!b) return;
  if (b.azar) return piensaAzar(M, p);
  const n = M.n, per = b.per, leg = legales(M, p);
  if (!leg.length) return;
  const dc = verCasa(M, p), aqui = dc[p.iy * n + p.ix];
  const enCasa = aqui <= 0;                       /* cero es el borde        */

  /* LO QUE `per` GOBIERNA ES CUANTO SE ARRIESGA, no la punteria: un bot que
     sale mas hondo y corre mas de costado cerca mas por vuelta y se expone
     mas tiempo. El area de una vuelta es hondo x lado.                      */
  const hondo  = Math.round(mez(4, 14, per));
  const largo  = Math.round(mez(6, 34, per));
  const tope   = Math.round(mez(18, 96, per));
  const margen = Math.round(mez(6, 1, per));

  if (enCasa) p.plan = null;
  if (!p.plan) p.plan = { modo: 'salir', lado: rnd(M) < 0.5 ? 1 : -1, resta: largo };

  /* volver cuando el rival llega a la estela antes que yo a casa: `aqui` son
     mis pasos hasta lo propio, y el margen es lo unico que `per` mueve aca. */
  if (p.estela > tope || riesgo(M, p) <= aqui + margen) p.plan.modo = 'volver';
  else if (p.plan.modo === 'salir') { if (aqui >= hondo) p.plan.modo = 'lado'; }
  else if (p.plan.modo === 'lado') { if (p.plan.resta <= 0) p.plan.modo = 'volver'; else p.plan.resta--; }

  let mejor = -1e9, d = leg[0];
  for (const k of leg) {
    const nx = p.ix + DIR[k][0], ny = p.iy + DIR[k][1], i = ny * n + nx;
    const dd = dc[i];
    let v;
    if (p.plan.modo === 'volver') v = -dd * 10;
    else if (p.plan.modo === 'salir') v = dd * 10;
    else v = -Math.abs(dd - hondo) * 10;        /* paralelo al borde         */
    /* seguir derecho cuando empata: un bot que zigzaguea gasta el doble de
       estela para encerrar lo mismo.                                        */
    if (k === dirDe(p.dx, p.dy)) v += 3;
    if (M.t[i] !== 0 && M.t[i] !== p.id) v += 60;   /* de paso, un corte      */
    if (M.z[i] === p.id && p.plan.modo !== 'volver') v -= 25;
    v += rnd(M) * 2;
    if (v > mejor) { mejor = v; d = k; }
  }
  p.ped = DIR[d];
}
function piensaAzar(M, p) {
  const leg = legales(M, p);
  if (!leg.length) return;
  p.ped = DIR[leg[Math.floor(rnd(M) * leg.length)]];
}
const dirDe = (dx, dy) => dx > 0 ? 0 : (dx < 0 ? 1 : (dy > 0 ? 2 : 3));

/* ══════════════════════ AUDITORIAS ══════════════════════ */

/* LA REGLA, CONTRA FORMAS CONOCIDAS. Un relleno que devuelva «algo» no
   prueba nada: hay que pedirle un numero que se pueda contar a mano.      */
function auditaRegla() {
  const out = [];
  /* 1 · una mordida rectangular: se sale del terreno, se rodea un 5×3 y se
        vuelve. Tienen que quedar EXACTAMENTE esas quince celdas mas la
        estela, ni una mas.                                                */
  {
    const M = nuevoM(24), p = nuevoJug(1, null); M.jug.push(p);
    for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) M.z[y * 24 + x] = 1;
    p.ix = 13; p.iy = 8; p.dx = 1; p.dy = 0;
    const cam = [[1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [0, -1], [0, -1], [0, -1], [0, -1],
                 [-1, 0], [-1, 0], [-1, 0], [-1, 0], [-1, 0], [-1, 0]];
    let antes = 0; for (let i = 0; i < M.z.length; i++) if (M.z[i] === 1) antes++;
    for (const c of cam) { p.ped = c; tic(M); }
    let desp = 0; for (let i = 0; i < M.z.length; i++) if (M.z[i] === 1) desp++;
    /* seis de ida, cuatro de subida, seis de vuelta = 16 de estela, mas el
       interior 5×3 = 15. La ultima de la vuelta cae en terreno propio.    */
    out.push({ caso: 'mordida', antes, desp, gano: desp - antes, esperado: 30, ok: desp - antes === 30 });
  }
  /* 2 · rodear una roca: la roca SIGUE SIENDO ROCA y lo de alrededor pasa a
        ser terreno. Si la roca se reclamara, el tablero perderia el unico
        obstaculo que tiene.                                               */
  {
    const M = nuevoM(24), p = nuevoJug(1, null); M.jug.push(p);
    for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) M.z[y * 24 + x] = 1;
    M.z[8 * 24 + 16] = PIEDRA;
    p.ix = 13; p.iy = 8; p.dx = 1; p.dy = 0;
    const cam = [[0, -1], [1, 0], [1, 0], [1, 0], [1, 0], [0, 1], [0, 1], [-1, 0], [-1, 0], [-1, 0], [-1, 0]];
    for (const c of cam) { p.ped = c; tic(M); }
    out.push({ caso: 'roca', sigueRoca: M.z[8 * 24 + 16] === PIEDRA, mio: M.z[7 * 24 + 16] === 1, ok: M.z[8 * 24 + 16] === PIEDRA && M.z[7 * 24 + 16] === 1 });
  }
  /* 3 · encerrar a un rival: su terreno pasa a ser mio. Sin esto los rivales
        serian decoracion que estorba.                                     */
  {
    const M = nuevoM(24), p = nuevoJug(1, null), q = nuevoJug(2, null); M.jug.push(p, q);
    for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) M.z[y * 24 + x] = 1;
    for (let y = 7; y < 10; y++) for (let x = 15; x < 18; x++) M.z[y * 24 + x] = 2;
    q.ix = 16; q.iy = 8; q.vivo = false;
    const suyo0 = M.z.reduce((a, v) => a + (v === 2 ? 1 : 0), 0);
    p.ix = 13; p.iy = 8; p.dx = 1; p.dy = 0;
    const cam = [[0, -1], [0, -1], [0, -1], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0],
                 [0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [-1, 0], [-1, 0], [-1, 0], [-1, 0], [-1, 0], [-1, 0],
                 [0, -1], [0, -1], [0, -1]];
    for (const c of cam) { p.ped = c; tic(M); }
    const suyo1 = M.z.reduce((a, v) => a + (v === 2 ? 1 : 0), 0);
    out.push({ caso: 'rival', suyo0, suyo1, ok: suyo0 === 9 && suyo1 === 0 });
  }
  /* 4 · la propia estela mata, y la ajena mata a su dueno. Es LA regla que
        hace que salir cueste algo.                                        */
  {
    const M = nuevoM(24), p = nuevoJug(1, null); M.jug.push(p);
    for (let y = 4; y < 8; y++) for (let x = 4; x < 8; x++) M.z[y * 24 + x] = 1;
    p.ix = 7; p.iy = 6; p.dx = 1; p.dy = 0;
    const cam = [[1, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [0, -1]];
    for (const c of cam) { if (p.vivo) { p.ped = c; tic(M); } }
    out.push({ caso: 'propia estela', vivo: p.vivo, ok: !p.vivo });
  }
  return { casos: out, malos: out.filter(o => !o.ok).map(o => o.caso) };
}

/* JUGAR UN NIVEL ENTERO SIN DIBUJAR. Es lo unico que prueba que un nivel
   generado se puede terminar — y la separacion entre el bot honesto y el
   que se mueve al azar es lo unico que prueba que adentro hay una decision.
   Los dos entran por `p.ped`.                                             */
function juegaSolo(m, nn, modo, sem) {
  const cfg = cfgNivel(m, nn);
  if (sem != null) cfg.sem = sem;
  const M = generaMapa(cfg);
  const yo = M.jug[0];
  yo.bot = modo === 'azar'  ? { azar: true }
         : modo === 'ciego' ? { per: 0.80, ciego: true }
         :                    { per: 0.80 };
  yo.topeCortes = VIDAS;
  for (let j = 1; j < M.jug.length; j++) M.jug[j].topeCortes = 1e9;
  const DT = 1 / VEL;                     /* un tic exacto por paso          */
  let t = 0, gano = false;
  const tope = Math.ceil(cfg.seg * VEL) + 40;
  for (let k = 0; k < tope; k++) {
    paso(M, DT); t += DT;
    if (tajada(M, 1) >= cfg.meta) { gano = true; break; }
    if (yo.cortes >= VIDAS && !yo.vivo) break;
    if (t >= cfg.seg) break;
  }
  return {
    m, n: nn, modo, gano, seg: +t.toFixed(1), meta: +(cfg.meta * 100).toFixed(1),
    pct: +(tajada(M, 1) * 100).toFixed(1), cortes: yo.cortes, cerros: yo.cerros,
    riv: M.jug.slice(1).map(q => +(tajada(M, q.id) * 100).toFixed(1)),
  };
}
/* ── EL AUTO-JUGADOR DE LA ARENA ──────────────────────────────────────────
   No mide «gana/pierde»: en la arena no hay victoria. Mide CUANTO AGUANTA,
   cuanto llega a agarrar y en que puesto queda — y eso solo significa algo
   comparado contra el que juega al azar. Sin ese control, «el bot llego al
   12 %» no dice si hay una decision adentro o si el tablero se reparte solo.

   EL RELOJ SE TOPA porque una corrida de arena no termina sola: un honesto
   que no se muere nunca correria para siempre.                             */
function juegaArena(sem, modo, segs) {
  const cfg = cfgArena(sem == null ? 1 : sem);
  const M = generaMapa(cfg);
  const yo = M.jug[0];
  yo.bot = modo === 'azar'  ? { azar: true }
         : modo === 'ciego' ? { per: 0.80, ciego: true }
         :                    { per: 0.80 };
  yo.topeCortes = 1;                      /* una vida: el corte cierra       */
  for (let j = 1; j < M.jug.length; j++) M.jug[j].topeCortes = 1e9;
  const DT = 1 / VEL, lim = segs || 180;
  let t = 0, mejor = 0;
  /* EL PUESTO SE GUARDA EN EL ULTIMO TIC VIVO Y NO AL SALIR DEL BUCLE.
     En la arena morir BORRA el terreno, asi que preguntando despues el
     jugador lee 0% y sale ultimo SIEMPRE, por construccion: la medicion
     estaria describiendo un estado que ella misma destruyo. Medido en la
     semilla 1001: ultimo vivo pos 7 con 2,52%, ya muerto pos 8 con 0,00.
     Y la misma regla vale para el panel de fin, que si no diria octavo
     en todas las partidas.                                              */
  let ultPos = puestoDe(M, 1), ultPct = tajada(M, 1);
  const tope = Math.ceil(lim * VEL) + 8;
  for (let k = 0; k < tope; k++) {
    paso(M, DT); t += DT;
    const pc = tajada(M, 1);
    if (pc > mejor) mejor = pc;
    if (!yo.vivo) break;
    ultPct = pc; ultPos = puestoDe(M, 1);
    if (t >= lim) break;
  }
  return {
    modo, sem: cfg.sem, seg: +t.toFixed(1), vivo: yo.vivo,
    pct: +(ultPct * 100).toFixed(2), mejor: +(mejor * 100).toFixed(2),
    pos: ultPos, matas: yo.matas, cerros: yo.cerros,
    riv: tablaPos(M).map(f => f.id + ':' + (f.pct * 100).toFixed(1)),
  };
}
function auditaArena(modo, veces, segs) {
  const r = [], t0 = Date.now(), N = veces || 12;
  for (let i = 0; i < N; i++) r.push(juegaArena(1000 + i * 37, modo || 'bot', segs));
  const med = k => +(r.reduce((a, x) => a + x[k], 0) / r.length).toFixed(2);
  return {
    modo: modo || 'bot', de: r.length, ms: Date.now() - t0,
    segMedio: med('seg'), mejorMedio: med('mejor'), posMedio: med('pos'),
    matasMedio: med('matas'), vivos: r.filter(x => x.vivo).length,
    peorPos: Math.max(...r.map(x => x.pos)), mejorPos: Math.min(...r.map(x => x.pos)),
  };
}

function auditaTodo(modo) {
  const r = [], t0 = Date.now();
  for (let m = 0; m < MUNDOS.length; m++) for (let n = 0; n < NIV_MUNDO; n++) r.push(juegaSolo(m, n, modo || 'bot'));
  const gana = r.filter(x => x.gano).length;
  return {
    modo: modo || 'bot', de: r.length, gana, ms: Date.now() - t0,
    pctMedio: +(r.reduce((a, x) => a + x.pct, 0) / r.length).toFixed(1),
    cortesMedio: +(r.reduce((a, x) => a + x.cortes, 0) / r.length).toFixed(2),
    malos: r.filter(x => !x.gano).map(x => (x.m + 1) + '-' + (x.n + 1) + ' ' + x.pct + '/' + x.meta),
  };
}
function auditaMapas() {
  const malos = [], filas = [];
  for (let m = 0; m < MUNDOS.length; m++) for (let n = 0; n < NIV_MUNDO; n++) {
    const M = generaMapa(cfgNivel(m, n)), a = auditaMapa(M);
    filas.push({ niv: (m + 1) + '-' + (n + 1), n: a.n, libres: a.libres, roca: a.roca, cerca: a.cerca });
    if (a.malos.length) malos.push((m + 1) + '-' + (n + 1) + ': ' + a.malos.join(','));
  }
  return { de: filas.length, malos, filas };
}
