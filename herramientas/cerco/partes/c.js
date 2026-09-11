/* ══════════════════════════════════════════════════════════════════════════
   C · EL MODELO, AHORA SOBRE UNA ESFERA
   NO TOCA NI EL DOM NI EL LIENZO, y eso no es prolijidad: es lo que permite
   concatenar b.js + c.js e importarlos en node para auditar los cuarenta
   niveles y correr los tres auto-jugadores sin abrir un navegador.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── POR QUE UN CUBO INFLADO Y NO UNA ESFERA DE VERDAD ────────────────────
   El juego entero cuelga de que CADA CELDA TENGA EXACTAMENTE CUATRO VECINOS
   DE ARISTA. Una esfera partida por latitud y longitud no lo cumple: en los
   polos convergen n celdas y ahi no hay cuatro direcciones. Un icosaedro
   subdividido da triangulos, o sea TRES vecinos, y entonces «izquierda» y
   «derecha» dejan de ser un giro de noventa grados.

   Un cubo de seis caras de n×n con los vertices llevados a la esfera SI lo
   cumple, y lo cumple TAMBIEN EN LAS OCHO ESQUINAS: la celda de la esquina
   de una cara tiene dos vecinas dentro de su cara y una en cada una de las
   dos caras que la tocan. Lo unico singular son los ocho VERTICES del cubo
   —donde se juntan tres cuadrados— y un relleno de cuatro vecinos no pasa
   nunca por un vertice: pasa por aristas.

   O SEA QUE EL TEOREMA DEL JUEGO SOBREVIVE. Lo que uno encierra con su
   estela es suyo, y «encierra» sigue siendo literal: el terreno propio mas
   la estela forman un anillo 4-conexo, y un anillo 4-conexo separa la
   superficie bajo relleno de 4 vecinos.

   LO QUE NO SOBREVIVE ES LA PALABRA «AFUERA». En el plano el relleno
   arrancaba del borde, que es un sitio que siempre existe. Una esfera no
   tiene borde: una curva cerrada la parte en DOS pedazos y los dos son
   finitos. Asi que «afuera» pasa a ser una MEDIDA y no una posicion —el
   pedazo mas grande— y eso es una decision de diseno, no un teorema: esta
   medida abajo, en `auditaFuera`.

   DE AHI SALE QUE LA ROCA SE PUEDA CRUZAR EN EL RELLENO, igual que antes.
   Como la barrera es el terreno propio y nada mas, dejar pasar la roca no
   abre ninguna fuga —y al reves, si la roca bloqueara, un hueco rodeado de
   piedra se regalaria sin que nadie lo hubiera rodeado nunca.              */

/* ── LAS SEIS CARAS ───────────────────────────────────────────────────────
   Cada una con su centro y sus dos ejes, y los seis cumplen `ex × ey = C`.
   Eso no es cosmetico: es lo que hace que la mano de la pantalla sea LA
   MISMA en las seis. Con una cara al reves, cruzar esa arista invertiria
   izquierda y derecha y el jugador no tendria forma de saberlo.            */
const CARAS = [
  { C: [ 1, 0, 0], ex: [ 0, 0,-1], ey: [0, 1, 0] },   /* 0 · +X */
  { C: [-1, 0, 0], ex: [ 0, 0, 1], ey: [0, 1, 0] },   /* 1 · -X */
  { C: [ 0, 1, 0], ex: [ 1, 0, 0], ey: [0, 0,-1] },   /* 2 · +Y */
  { C: [ 0,-1, 0], ex: [ 1, 0, 0], ey: [0, 0, 1] },   /* 3 · -Y */
  { C: [ 0, 0, 1], ex: [ 1, 0, 0], ey: [0, 1, 0] },   /* 4 · +Z */
  { C: [ 0, 0,-1], ex: [-1, 0, 0], ey: [0, 1, 0] },   /* 5 · -Z */
];

/* DIR sigue valiendo DENTRO de una cara: der · izq · abajo · arriba.
   Lo que cambia al cruzar una arista es que la direccion se REMAPEA, y eso
   lo guarda la tabla ND: nadie mas tiene que saber que hay caras.          */
const OPUE = [1, 0, 3, 2];
const GIRO_CW  = [2, 3, 1, 0];   /* der→abajo→izq→arriba (horario en pantalla) */
const GIRO_CCW = [3, 2, 0, 1];

const nrm = v => { const m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; };
const pto = (v, w) => v[0] * w[0] + v[1] * w[1] + v[2] * w[2];

/* el centro de la celda (f,x,y) llevado a la esfera */
function posCel(f, x, y, n) {
  const c = CARAS[f], u = (x + 0.5) / n * 2 - 1, v = (y + 0.5) / n * 2 - 1;
  return nrm([c.C[0] + u * c.ex[0] + v * c.ey[0],
              c.C[1] + u * c.ex[1] + v * c.ey[1],
              c.C[2] + u * c.ex[2] + v * c.ey[2]]);
}

/* LA PROYECCION AL REVES: de un punto de la esfera a la celda que lo
   contiene. Es lo que resuelve las costuras SIN una tabla de aristas
   escrita a mano —doce aristas por dos sentidos son veinticuatro casos, y
   uno mal escrito no falla: manda al cuerpo a otra cara sin que nada avise—.
   El eje dominante dice la cara y de ahi salen u y v por division.         */
function aCelda(p, n) {
  const ax = Math.abs(p[0]), ay = Math.abs(p[1]), az = Math.abs(p[2]);
  let f;
  if (ax >= ay && ax >= az) f = p[0] > 0 ? 0 : 1;
  else if (ay >= az)        f = p[1] > 0 ? 2 : 3;
  else                      f = p[2] > 0 ? 4 : 5;
  const c = CARAS[f], w = pto(p, c.C);
  const u = pto(p, c.ex) / w, v = pto(p, c.ey) / w;
  let x = Math.floor((u + 1) / 2 * n), y = Math.floor((v + 1) / 2 * n);
  if (x < 0) x = 0; else if (x >= n) x = n - 1;
  if (y < 0) y = 0; else if (y >= n) y = n - 1;
  return (f * n + y) * n + x;
}

/* HACIA DONDE SE SIGUE ANDANDO DESPUES DE CRUZAR UNA COSTURA.
   NO sirve usar `ex`/`ey` de la cara de destino: esos son los ejes del PLANO
   del cubo y la superficie ya se curvo, asi que lejos del centro de la cara
   no son tangentes. Las tangentes de verdad son los mismos ejes proyectados
   al plano tangente del punto, y sobre ellas la direccion es la componente
   mas grande del propio paso.                                              */
function dirEn(f, pDest, pOrig) {
  const c = CARAS[f];
  const dx = pto(c.ex, pDest), dy = pto(c.ey, pDest);
  const Tx = nrm([c.ex[0] - dx * pDest[0], c.ex[1] - dx * pDest[1], c.ex[2] - dx * pDest[2]]);
  const Ty = nrm([c.ey[0] - dy * pDest[0], c.ey[1] - dy * pDest[1], c.ey[2] - dy * pDest[2]]);
  const w = [pDest[0] - pOrig[0], pDest[1] - pOrig[1], pDest[2] - pOrig[2]];
  const A = pto(w, Tx), B = pto(w, Ty);
  return Math.abs(A) >= Math.abs(B) ? (A > 0 ? 0 : 1) : (B > 0 ? 2 : 3);
}

/* ── LAS TABLAS ───────────────────────────────────────────────────────────
   Se arman UNA VEZ por n y de ahi en mas todo el juego es `j = NB[i*4+d]`.
   Ni el relleno, ni el campo de distancia, ni los bots, ni el auditor saben
   que hay caras: esa es toda la gracia de precalcularlas.                  */
const GEO_CACHE = {};
function geoDe(n) {
  if (GEO_CACHE[n]) return GEO_CACHE[n];
  const N = 6 * n * n;
  const NB = new Int32Array(N * 4), ND = new Uint8Array(N * 4);
  const POS = new Float32Array(N * 3);
  for (let f = 0; f < 6; f++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = (f * n + y) * n + x, p = posCel(f, x, y, n);
    POS[i * 3] = p[0]; POS[i * 3 + 1] = p[1]; POS[i * 3 + 2] = p[2];
  }
  for (let f = 0; f < 6; f++) {
    const c = CARAS[f];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (f * n + y) * n + x;
      const pi = [POS[i * 3], POS[i * 3 + 1], POS[i * 3 + 2]];
      for (let d = 0; d < 4; d++) {
        const nx = x + DIR[d][0], ny = y + DIR[d][1];
        if (nx >= 0 && ny >= 0 && nx < n && ny < n) {
          NB[i * 4 + d] = (f * n + ny) * n + nx; ND[i * 4 + d] = d;
          continue;
        }
        /* la celda virtual de al lado, llevada a la esfera y devuelta a la
           reja por la proyeccion inversa: funciona igual en el medio de una
           arista que en una esquina del cubo.                              */
        const u = (nx + 0.5) / n * 2 - 1, v = (ny + 0.5) / n * 2 - 1;
        const pv = nrm([c.C[0] + u * c.ex[0] + v * c.ey[0],
                        c.C[1] + u * c.ex[1] + v * c.ey[1],
                        c.C[2] + u * c.ex[2] + v * c.ey[2]]);
        const j = aCelda(pv, n), fj = (j / (n * n)) | 0;
        const pj = [POS[j * 3], POS[j * 3 + 1], POS[j * 3 + 2]];
        NB[i * 4 + d] = j; ND[i * 4 + d] = dirEn(fj, pj, pi);
      }
    }
  }
  /* PASOS POR RADIAN, para que una distancia sobre la esfera se pueda
     comparar contra un campo BFS, que cuenta PASOS. Una vuelta entera son
     4n celdas, o sea 2n/π por radian; y el ×4/π es la razon media entre la
     distancia de manzana y la recta para direcciones al azar, que es lo que
     el campo mide de verdad.                                               */
  const g = { NB, ND, POS, N, kD: 8 * n / (Math.PI * Math.PI) };
  GEO_CACHE[n] = g;
  return g;
}

/* distancia en PASOS estimados entre dos celdas */
function distCel(M, i, j) {
  const P = M.POS;
  let c = P[i * 3] * P[j * 3] + P[i * 3 + 1] * P[j * 3 + 1] + P[i * 3 + 2] * P[j * 3 + 2];
  if (c > 1) c = 1; else if (c < -1) c = -1;
  return Math.acos(c) * M.kD;
}

/* UN DISCO DE K CELDAS POR BFS, y no un cuadrado de x±r: un cuadrado se
   parte cuando cae sobre una arista del cubo y deja media casa en otra cara.
   Esto da exactamente K celdas contiguas donde sea, esquina incluida.      */
function discoN(M, i0, K, out) {
  const NB = M.NB;
  if (!M._dv || M._dv.length !== M.N) { M._dv = new Int32Array(M.N); M._ds = 0; }
  const vis = M._dv; M._ds++; const s = M._ds;
  const q = out; let qa = 0, qb = 0;
  vis[i0] = s; q[qb++] = i0;
  while (qa < qb && qb < K) {
    const c = q[qa++], b = c * 4;
    for (let d = 0; d < 4; d++) {
      const k = NB[b + d];
      if (vis[k] === s) continue;
      vis[k] = s; q[qb++] = k;
      if (qb >= K) break;
    }
  }
  return qb;
}

/* ══════════════════════ EL MODELO ══════════════════════ */

function nuevoM(n) {
  const g = geoDe(n);
  return {
    n, N: g.N, NB: g.NB, ND: g.ND, POS: g.POS, kD: g.kD,
    z: new Uint8Array(g.N), t: new Uint8Array(g.N),
    jug: [], f: 0, libres: g.N, cuenta: new Int32Array(NJUG + 1),
    sucio: true, reloj: 0, arena: false,
    /* dos numeros que solo existen para poder AFIRMAR algo sobre la regla de
       «afuera»: el peor reparto que vio un relleno y cuantas veces estuvo
       apretado. Cuestan dos comparaciones por cerrado y son lo unico que hace
       comprobable la unica decision de diseno que la esfera obliga a tomar. */
    peorRep: 1, dudas: 0, cerrados: 0,
    _vis: null, _pila: null, _bq: null, _disco: null,
  };
}
const solido = (M, i) => M.z[i] === PIEDRA;

function nuevoJug(id, bot) {
  return {
    id, bot: bot || null, i: 0, d: 0, ped: null,
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
   aprobando un juego que no existe.

   EN EL PLANO EL RELLENO ARRANCABA DEL BORDE. Una esfera no tiene borde: la
   estela cerrada la parte en dos pedazos y los DOS son finitos, asi que
   «afuera» deja de ser una posicion. Se etiquetan las componentes del
   complemento y **la mas grande es afuera**; todo lo demas se reclama.

   ESO ES UNA DECISION DE DISENO Y NO UN TEOREMA, y por eso se mide: cuando el
   pedazo encerrado fuera mas grande que el que queda libre, la regla elegiria
   el lado equivocado. `M.peorRep` guarda el reparto mas apretado que se vio y
   `M.dudas` cuenta las veces que estuvo por debajo de tres cuartos. Con ocho
   cuerpos sobre 8.664 celdas, encerrar mas de la mitad del tablero libre en
   una sola vuelta pide un cerco de miles de celdas de perimetro.           */
function reclama(M, p) {
  const N = M.N, id = p.id, z = M.z, t = M.t, NB = M.NB;
  let nue = 0;
  for (let i = 0; i < N; i++) if (t[i] === id) { t[i] = 0; if (z[i] !== id) { z[i] = id; nue++; } }
  p.estela = 0; p.cola.length = 0;

  if (!M._vis || M._vis.length !== N) { M._vis = new Int32Array(N); M._pila = new Int32Array(N); }
  const lab = M._vis, pila = M._pila;
  lab.fill(0);
  let comp = 0, mejor = 0, mejorTam = -1, libres = 0;
  for (let s = 0; s < N; s++) {
    if (lab[s] || z[s] === id) continue;
    comp++;
    let sp = 0; pila[sp++] = s; lab[s] = comp; let tam = 0;
    while (sp > 0) {
      const c = pila[--sp]; tam++;
      const b = c * 4;
      for (let d = 0; d < 4; d++) {
        const k = NB[b + d];
        if (lab[k] || z[k] === id) continue;
        lab[k] = comp; pila[sp++] = k;
      }
    }
    libres += tam;
    if (tam > mejorTam) { mejorTam = tam; mejor = comp; }
  }
  for (let i = 0; i < N; i++) {
    if (lab[i] === mejor || lab[i] === 0) continue;
    const v = z[i];
    if (v === PIEDRA || v === id) continue;   /* la roca sigue siendo roca */
    z[i] = id; nue++;
  }
  if (libres > 0) {
    const rep = mejorTam / libres;
    if (rep < M.peorRep) M.peorRep = rep;
    if (rep < 0.75) M.dudas++;
    M.cerrados++;
  }
  p.fuera = false; p.cerros++;
  M.sucio = true;
  for (const q of M.jug) q.dcSucio = true;
  return nue;
}

/* ── EL CAMPO DE DISTANCIA AL BORDE, CON SIGNO ────────────────────────────
   Un BFS por celda para decidir cada paso costaria, sobre los cuarenta
   niveles, cientos de millones de visitas. El campo cuesta O(N) UNA VEZ por
   cambio de terreno —el mismo precio que el relleno que lo provoco— y se
   calcula PEREZOSO: un bot que no esta volviendo a casa no lo paga.

   Y LLEVA SIGNO, que es lo que lo hace servir para las dos mitades del
   viaje. Con el campo medido desde el terreno propio, TODO lo propio vale
   cero: adentro no hay pendiente, asi que un bot parado en el medio de su
   casa no tiene por donde subir y sale dando vueltas al azar hasta chocarse
   con el borde. Medido en el plano, eso eran DIECISEIS TICS seguidos en el
   cero, y el terreno crece, o sea que empeora solo a lo largo de la partida.
   El cero pasa a ser EL BORDE: hacia afuera +1, +2… y hacia adentro −1, −2… */
const DC_NADA = -1e6;
function campoCasa(M, p) {
  const N = M.N, NB = M.NB;
  if (!p.dc || p.dc.length !== N) p.dc = new Int32Array(N);
  const dc = p.dc; dc.fill(DC_NADA);
  if (!M._bq || M._bq.length !== N) M._bq = new Int32Array(N);
  const q = M._bq; let qa = 0, qb = 0;
  /* semilla: las celdas propias que dan a algo pisable que no es propio */
  for (let i = 0; i < N; i++) {
    if (M.z[i] !== p.id) continue;
    const b = i * 4;
    for (let d = 0; d < 4; d++) {
      const k = NB[b + d];
      if (M.z[k] === PIEDRA || M.z[k] === p.id) continue;
      dc[i] = 0; q[qb++] = i; break;
    }
  }
  /* un terreno encerrado sin una sola salida no tiene borde: se cae al campo
     de antes para que el bot al menos tenga un gradiente y no un plano.    */
  if (!qb) for (let i = 0; i < N; i++) if (M.z[i] === p.id) { dc[i] = 0; q[qb++] = i; }
  while (qa < qb) {
    const c = q[qa++], v = dc[c], b = c * 4;
    for (let d = 0; d < 4; d++) {
      const k = NB[b + d];
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
  for (let i = 0; i < M.N; i++) { const v = M.z[i]; if (v > 0 && v < PIEDRA) M.cuenta[v]++; }
  M.sucio = false;
}
function tajada(M, id) {
  if (M.sucio) recuenta(M);
  return M.libres > 0 ? M.cuenta[id] / M.libres : 0;
}
/* LA TABLA DEJA AL MUERTO ADENTRO, EN CERO. Sacarlo hace que los puestos de
   abajo SUBAN cuando alguien se muere: uno mira el marcador, ve que paso de
   sexto a quinto sin haber hecho nada, y el numero deja de significar.     */
function tablaPos(M) {
  if (M.sucio) recuenta(M);
  const f = [];
  for (const p of M.jug) f.push({ id: p.id, pct: M.libres > 0 ? M.cuenta[p.id] / M.libres : 0, vivo: p.vivo, matas: p.matas });
  f.sort((a, b) => b.pct - a.pct || a.id - b.id);
  for (let i = 0; i < f.length; i++) f[i].pos = i + 1;
  return f;
}
const puestoDe = (M, id) => { const t = tablaPos(M); for (const f of t) if (f.id === id) return f.pos; return t.length; };

/* ── EL TIC ───────────────────────────────────────────────────────────────
   TODOS LOS CUERPOS VAN A LA MISMA VELOCIDAD Y ARRANCAN ALINEADOS, asi que
   cruzan el borde de celda en el mismo instante: la fraccion es UNA, del
   tablero, y no una por jugador. Con una por jugador habria que decidir en
   que orden se resuelven dos cabezas que entran a la misma celda, y el
   resultado dependeria del orden del array.

   EN LA ESFERA EL MOVIMIENTO SON DOS LECTURAS DE TABLA y ninguna suma de
   coordenadas: `NB` dice a que celda se va y `ND` con que rumbo se llega.
   Las dos se leen con el `i` y el `d` VIEJOS —de ahi el `b` calculado antes
   de escribir nada— porque cruzando una costura el rumbo cambia, y leerlo
   despues seria leer el rumbo de la cara nueva con el indice de la vieja.

   Y SE FUE LA MUERTE POR SALIRSE DEL TABLERO: una esfera no tiene borde.
   Es la unica regla del juego que la conversion elimina, y no se reemplaza
   por nada — en la referencia tampoco hay pared.                          */
function tic(M) {
  const NB = M.NB, ND = M.ND, vivos = [];
  for (const p of M.jug) {
    if (!p.vivo) continue;
    if (p.ped != null && p.ped !== OPUE[p.d]) p.d = p.ped;
    p.ped = null;
    const b = p.i * 4 + p.d;
    p.i = NB[b]; p.d = ND[b];
    vivos.push(p);
  }

  /* LAS MUERTES SE JUNTAN Y SE APLICAN TODAS DE UNA, y la estela se mira
     ANTES de que nadie deje la de este paso: si no, el que se mueve primero
     tendria ventaja sobre el que se mueve segundo por estar antes en la
     lista.                                                                 */
  const mata = new Set();
  for (const p of vivos) {
    const i = p.i;
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
    if (vivos[a].i === vivos[b].i) { mata.add(vivos[a]); mata.add(vivos[b]); }

  for (const p of mata) muere(M, p);

  for (const p of vivos) {
    if (!p.vivo) continue;
    const i = p.i;
    if (M.z[i] === p.id) { if (p.fuera) reclama(M, p); }
    else { if (M.t[i] !== p.id) { M.t[i] = p.id; p.estela++; p.cola.push(i); } p.fuera = true; }
  }
  for (const p of vivos) if (p.vivo && p.bot) piensa(M, p);
}

function muere(M, p) {
  if (!p.vivo) return;
  p.vivo = false; p.cortes++;
  for (let i = 0; i < M.N; i++) if (M.t[i] === p.id) M.t[i] = 0;
  /* EN LA ARENA EL TERRENO SE PIERDE ENTERO, y es la otra mitad de lo que
     hace que cortar a alguien signifique algo. En la campana el corte cuesta
     tiempo y posicion —el terreno espera— porque ahi la partida tiene reloj
     y meta; sin reloj ni meta, un corte que no borra nada no cuesta nada, y
     entonces la tabla de posiciones no se puede mover.

     Y esto es tambien lo que hace que el juego respire: lo que el muerto
     suelta vuelve a ser tablero libre y ahi vuelve a haber para todos.     */
  if (M.arena) {
    const z = M.z;
    for (let i = 0; i < M.N; i++) if (z[i] === p.id) z[i] = LIBRE;
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
  let mejor = -1, mejorV = -1;
  const cab = [];
  for (const q of M.jug) if (q !== p && q.vivo) cab.push(q.i);
  for (let i = 0; i < M.N; i++) {
    if (M.z[i] !== p.id) continue;
    let d = 1e9;
    for (const c of cab) { const e = distCel(M, i, c); if (e < d) d = e; }
    if (d > mejorV) { mejorV = d; mejor = i; }
  }
  if (mejor < 0) mejor = carvaCasa(M, p);
  p.i = mejor;
  p.vivo = true; p.fuera = false; p.estela = 0; p.ped = null; p.plan = null; p.dcSucio = true;
  /* mira hacia adentro de lo propio: renacer apuntando al vacio es salir sin
     haberlo pedido, y eso no es un renacimiento, es otro corte.            */
  let d0 = 0;
  for (let d = 0; d < 4; d++) if (M.z[M.NB[mejor * 4 + d]] === p.id) { d0 = d; break; }
  p.d = d0;
}

/* Carva una casa nueva donde mas neutral haya y mas lejos de las cabezas
   ajenas. Solo hace falta cuando a alguien le encerraron TODO el terreno.

   LA CASA ES UN DISCO DE 25 CELDAS y no un 5x5, porque en una esfera de cubo
   un cuadrado de x±r se parte al caer sobre una arista. El numero no es
   arbitrario: la bola L1 de radio 3 mide EXACTAMENTE 25 celdas, o sea la
   misma casa del plano celda por celda.

   Y NO SE BARRE CELDA POR CELDA: con 8.664 celdas y un BFS de 25 por
   candidato eso son doscientos mil pasos por renacimiento. El salto sale del
   tamano (`N/900`), asi que la cantidad de candidatos es la misma en el
   tutorial que en la arena y esto no se pone lento al crecer el planeta.  */
const CASA_K = 25;
function carvaCasa(M, p, K) {
  const k = K || CASA_K, N = M.N;
  const cab = [];
  for (const q of M.jug) if (q !== p && q.vivo) cab.push(q.i);
  if (!M._disco || M._disco.length < k) M._disco = new Int32Array(Math.max(k, 64));
  const tmp = M._disco;
  const salto = Math.max(1, Math.round(N / 900));
  let mejor = -1, mejorV = -1e9;
  for (let c = 0; c < N; c += salto) {
    if (discoN(M, c, k, tmp) < k) continue;
    let lib = 0, roca = 0;
    for (let j = 0; j < k; j++) { const v = M.z[tmp[j]]; if (v === PIEDRA) roca++; else if (v === LIBRE) lib++; }
    if (roca > 0) continue;
    let d = 1e9;
    for (const q of cab) { const e = distCel(M, c, q); if (e < d) d = e; }
    /* EN LA ARENA PESA EL HUECO Y NO LA DISTANCIA, porque carvar PISA lo que
       haya: con ocho cuerpos renaciendo todo el tiempo, un renacimiento que
       prefiere terreno ajeno le roba a alguien una casa cada vez que lo
       cortan. En la campana da igual —renacer casi nunca llega hasta aca,
       porque el terreno propio no se pierde.                               */
    const v = lib * (M.arena ? 6 : 2) + Math.min(d, 30) * 3;
    if (v > mejorV) { mejorV = v; mejor = c; }
  }
  if (mejor < 0) mejor = 0;
  const m = discoN(M, mejor, k, tmp);
  for (let j = 0; j < m; j++) { const i = tmp[j]; if (M.z[i] !== PIEDRA) M.z[i] = p.id; }
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

/* LAS CASAS VAN EN ESPIRAL DE FIBONACCI Y NO EN UN CIRCULO. En el plano el
   circulo existia para que dos casas no nacieran pegadas; en una esfera un
   circulo es una LATITUD, o sea que con ocho cuerpos los ocho quedarian en la
   misma franja y los dos polos vacios. La espiral aurea reparte n puntos sobre
   la esfera dejando a cada uno la misma area, que es exactamente lo que el
   circulo hacia en el plano.

   Y LLEVA DOS GIROS SORTEADOS y no uno: el de longitud (`a0`) mueve la
   espiral alrededor del eje, pero el primer punto sigue cayendo siempre cerca
   del mismo polo, y un polo del cubo es una ESQUINA —tres caras— asi que sin
   el segundo giro (`b0`, alrededor de X) todos los niveles nacerian con una
   casa en el mismo vertice.                                                */
const GA = Math.PI * (3 - Math.sqrt(5));
function ptoFib(j, nj, a0, b0) {
  const yy = nj === 1 ? 0 : 1 - (j + 0.5) * 2 / nj;
  const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
  const th = GA * j + a0;
  const x = Math.cos(th) * rr, y = yy, z = Math.sin(th) * rr;
  const cb = Math.cos(b0), sb = Math.sin(b0);
  return [x, y * cb - z * sb, y * sb + z * cb];
}

const CASA_LIMPIA = 49;   /* el anillo de roca que se limpia alrededor */

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

  const nj = 1 + cfg.riv;
  const a0 = R() * Math.PI * 2, b0 = R() * Math.PI * 2;
  const tmp = new Int32Array(Math.max(CASA_K, CASA_LIMPIA));
  for (let j = 0; j < nj; j++) {
    const c = aCelda(ptoFib(j, nj, a0, b0), n);
    /* `per` PUEDE SER UN ARREGLO, y con eso la arena tiene siete cabezas
       distintas sin escribir siete cerebros: uno manso que sale poco, uno
       temerario que se va al otro lado del tablero, y cinco en el medio. La
       campana le sigue pasando un numero, asi que no cambia nada.         */
    const per = Array.isArray(cfg.per) ? cfg.per[(j - 1) % cfg.per.length] : cfg.per;
    const p = nuevoJug(j + 1, j === 0 ? null : { per });
    M.jug.push(p);
    let m = discoN(M, c, CASA_K, tmp);
    for (let k = 0; k < m; k++) M.z[tmp[k]] = p.id;
    /* un anillo alrededor de la casa se limpia de roca: nacer con la unica
       salida tapada es perder antes de tocar la pantalla.                  */
    m = discoN(M, c, CASA_LIMPIA, tmp);
    for (let k = 0; k < m; k++) if (M.z[tmp[k]] === PIEDRA) M.z[tmp[k]] = LIBRE;
    p.i = c; p.d = 0;
  }

  /* CONEXIDAD POR CONSTRUCCION: lo que no se alcanza desde la casa del
     jugador pasa a ser roca. Un bolsillo suelto no rompe el relleno —la
     barrera es el terreno propio— pero si rompe el juego: seria terreno que
     cuenta para la meta y al que no se puede llegar.                      */
  selloSueltos(M);
  M.libres = 0;
  for (let i = 0; i < M.N; i++) if (M.z[i] !== PIEDRA) M.libres++;
  M.sucio = true;
  M.cfg = cfg;
  return M;
}

/* ── LAS PIEDRAS ──────────────────────────────────────────────────────────
   EN EL PLANO LOS CUATRO PATRONES ERAN DIBUJOS EN UNA GRILLA; aca son
   propiedades de una DIRECCION, medidas sobre `POS`. Eso no es una traduccion
   cosmetica: un rectangulo en la grilla de una cara se parte al cruzar una
   arista, y una franja definida por un angulo contra un eje da la vuelta al
   planeta entera sin saber que las caras existen.

   LAS FRACCIONES DE ROCA ESTAN CALCULADAS CONTRA LAS DEL PLANO, no elegidas:
   pilares 7,7 % (el plano daba 7-9), cruz 9,1 (8,9), islas 5,1 (5,0), anillo
   6,3 (6,0). Una franja de semiancho `hw` alrededor de un circulo maximo cubre
   `sin(hw)` de la esfera, y `hw = grosor·π/(4n)` es lo que convierte un grosor
   en celdas a un angulo.                                                    */
function ponPiedras(M, cfg, R) {
  const n = M.n, N = M.N, z = M.z, P = M.POS;

  /* un eje al azar y dos perpendiculares: `U`/`V` son los que dan la longitud
     alrededor del eje, o sea donde van las puertas.                        */
  const eje = () => {
    const u = R() * 2 - 1, t = R() * Math.PI * 2, s = Math.sqrt(Math.max(0, 1 - u * u));
    return nrm([Math.cos(t) * s, u, Math.sin(t) * s]);
  };
  const perp = (A) => {
    const h = Math.abs(A[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const U = nrm([A[1] * h[2] - A[2] * h[1], A[2] * h[0] - A[0] * h[2], A[0] * h[1] - A[1] * h[0]]);
    const V = [A[1] * U[2] - A[2] * U[1], A[2] * U[0] - A[0] * U[2], A[0] * U[1] - A[1] * U[0]];
    return [U, V];
  };
  /* puertas: sin ellas una franja cerrada parte el planeta en dos y el sellado
     de sueltos se llevaria la mitad del tablero.                            */
  const puerta = (a, q, w) => {
    for (let k = 0; k < q; k++) {
      let e = a - k * Math.PI * 2 / q;
      e = Math.abs(((e % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (Math.PI - e < w) return true;
    }
    return false;
  };
  /* franja alrededor de una latitud `lat` medida desde el ecuador del eje A */
  const franja = (A, lat, hw, q, w) => {
    const [U, V] = perp(A);
    for (let i = 0; i < N; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], zz = P[i * 3 + 2];
      let s = x * A[0] + y * A[1] + zz * A[2];
      if (s > 1) s = 1; else if (s < -1) s = -1;
      const la = Math.asin(s);
      if (Math.abs(Math.abs(la) - lat) > hw) continue;
      if (q > 0) {
        const a = Math.atan2(x * V[0] + y * V[1] + zz * V[2], x * U[0] + y * U[1] + zz * U[2]);
        if (puerta(a, q, w)) continue;
      }
      z[i] = PIEDRA;
    }
  };
  const disco = (c, k, buf) => { const m = discoN(M, c, k, buf); for (let j = 0; j < m; j++) z[buf[j]] = PIEDRA; };

  switch (cfg.pat) {
    case 'pilares': {
      const q = Math.round(N / 90), buf = new Int32Array(9);
      for (let i = 0; i < q; i++) disco(Math.floor(R() * N), 5 + Math.floor(R() * 5), buf);
      break;
    }
    case 'cruz': {
      /* DOS CIRCULOS MAXIMOS PERPENDICULARES, que es lo que una cruz ES en una
         esfera: se cruzan en cuatro puntos y parten el planeta en cuatro.  */
      const hw = 3 * Math.PI / (4 * n);
      const A = eje(), [U] = perp(A);
      franja(A, 0, hw, 4, 0.22);
      franja(U, 0, hw, 4, 0.22);
      break;
    }
    case 'islas': {
      const q = Math.round(N / 280), buf = new Int32Array(20);
      for (let i = 0; i < q; i++) disco(Math.floor(R() * N), 8 + Math.floor(R() * 13), buf);
      break;
    }
    case 'anillo': {
      /* dos anillos a 45 grados del ecuador: en el plano era uno concentrico,
         y en una esfera el equivalente de «un anillo alrededor del centro» son
         los dos paralelos que rodean los dos polos.                         */
      franja(eje(), Math.PI / 4, 3 * Math.PI / (4 * n), 4, 0.22);
      break;
    }
  }
}

function selloSueltos(M) {
  const N = M.N, NB = M.NB, vis = new Uint8Array(N), q = new Int32Array(N);
  let qa = 0, qb = 0, ini = -1;
  for (let i = 0; i < N; i++) if (M.z[i] === 1) { ini = i; break; }
  if (ini < 0) for (let i = 0; i < N; i++) if (M.z[i] !== PIEDRA) { ini = i; break; }
  if (ini < 0) return;
  vis[ini] = 1; q[qb++] = ini;
  while (qa < qb) {
    const c = q[qa++], b = c * 4;
    for (let d = 0; d < 4; d++) {
      const k = NB[b + d];
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
  const N = M.N, NB = M.NB, ND = M.ND, cfg = M.cfg;
  const vis = new Uint8Array(N), q = new Int32Array(N);
  let qa = 0, qb = 0;
  const ini = M.jug[0].i;
  vis[ini] = 1; q[qb++] = ini;
  while (qa < qb) {
    const c = q[qa++], b = c * 4;
    for (let d = 0; d < 4; d++) {
      const k = NB[b + d];
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
      let i = p.i, dd = d, ok = true;
      for (let k = 0; k < 3; k++) { const b = i * 4 + dd; i = NB[b]; dd = ND[b]; if (M.z[i] === PIEDRA) { ok = false; break; } }
      if (ok) s++;
    }
    if (s < salidas) salidas = s;
    for (const r of M.jug) if (r !== p) { const e = distCel(M, r.i, p.i); if (e < cerca) cerca = e; }
  }
  if (M.jug.length < 2) cerca = 999;
  const malos = [];
  if (alcanz !== libres) malos.push('sueltas:' + (libres - alcanz));
  if (salidas < 2) malos.push('casa tapada');
  if (cerca < M.n * 0.30) malos.push('casas pegadas:' + cerca.toFixed(1));
  if (cfg && cfg.meta > 0.92) malos.push('meta imposible');
  return { n: M.n, N, libres, alcanz, salidas, cerca: +cerca.toFixed(1), roca: N - libres, meta: cfg ? cfg.meta : 0, malos };
}

/* ══════════════════════ LOS BOTS ══════════════════════ */

function legales(M, p) {
  const out = [], NB = M.NB, b = p.i * 4;
  for (let d = 0; d < 4; d++) {
    if (d === OPUE[p.d]) continue;                   /* nada de media vuelta */
    const i = NB[b + d];
    if (M.z[i] === PIEDRA) continue;
    if (M.t[i] === p.id) continue;                   /* la propia estela mata */
    out.push(d);
  }
  return out;
}

const rnd = M => M.az ? M.az() : Math.random();

/* ── CUANTO FALTA PARA QUE ME CORTEN ──────────────────────────────────────
   EL PELIGRO NO ES QUE UN RIVAL ESTE CERCA DE MI CABEZA: ES QUE LLEGUE A MI
   ESTELA ANTES QUE YO A CASA. Medido contra la cabeza y con un radio fijo,
   el bot se TRABABA: salia, veia un rival a nueve celdas —con la estela en
   cero, o sea sin una sola celda que perder— se volvia, y repetia. En el
   nivel 4-2 eso fueron TREINTA Y DOS abortos y el 2,1 % del tablero.
   Sin estela no hay riesgo: parado en lo propio a nadie lo pueden cortar.

   Y ACA LA ESFERA OBLIGA A CAMBIAR EL METODO, no solo la formula. En el plano
   la distancia de cuadricula tenia forma cerrada —|dx|+|dy|— asi que el
   numero era EXACTO y gratis. En una esfera de cubo no hay forma cerrada, y
   el primer reemplazo fue el angulo escalado (`acos(cos) * kD`, con
   kD = 8n/pi^2 = pasos por radian por el 4/pi medio de L1 sobre L2). En
   promedio acierta y en cada caso particular no, porque el 4/pi es una MEDIA
   sobre direcciones: contra un BFS de verdad, en n = 18, 26, 33 y 38, la
   estimacion da de media 0,96 a 0,98 del valor real y va de **0,47 a 1,58**.
   El extremo que importa es el de arriba: decir que un rival esta un 58 % mas
   lejos de lo que esta es exactamente el error que mata, porque el bot se
   queda afuera creyendose seguro. Medido, esa era la diferencia entre 35 y 40
   niveles ganados de 40.

   ASI QUE ACA SE CUENTAN PASOS DE VERDAD, y el BFS es barato porque va
   ACOTADO: la unica pregunta que `piensa` hace es «¿hay una cabeza rival a
   `lim` pasos o menos de mi estela?», asi que se siembra en las cabezas
   rivales y se corta en `lim`. Con `lim` entre 1 y 20 eso es un disco chico
   alrededor de siete cuerpos y no la esfera entera, y la respuesta es exacta
   para la comparacion que se hace con ella. Lo que queda mas alla devuelve
   1e9, que es lo mismo que «no hace falta volver».
   Y VA CON MARCA DE GENERACION (`_rg`) en vez de borrar el arreglo: limpiar
   6.500 enteros por cuerpo y por tic cuesta mas que el propio BFS.

   `distCel` —la estimacion angular— se queda, pero SOLO donde su error no
   decide nada: sembrar casas lejos unas de otras y limpiar la roca alrededor,
   donde el umbral esta a tres veces del valor medido.                       */
function riesgo(M, p, lim) {
  const c = p.cola;
  if (!c.length) return 1e9;
  /* EL CONTROL `ciego` NO ES TORPEZA: ES NO MIRAR. Juega la misma geometria
     —esquiva piedras y su propia estela todos los tics— y lo unico que no
     hace es preguntar donde estan los rivales, o sea que se vuelve a casa
     por el tramo y no por el corte. Es el unico control que aisla LA
     decision de este juego.                                                */
  if (p.bot && p.bot.ciego) return 1e9;
  if (lim < 1) return 1e9;
  const N = M.N, NB = M.NB, t = M.t, z = M.z;
  if (!M._rq || M._rq.length !== N) { M._rq = new Int32Array(N); M._rv = new Int32Array(N); M._rg = 0; }
  const q = M._rq, vis = M._rv, g = ++M._rg;
  let qa = 0, qb = 0;
  for (const r of M.jug) {
    if (r === p || !r.vivo) continue;
    if (t[r.i] === p.id) return 0;
    if (vis[r.i] !== g) { vis[r.i] = g; q[qb++] = r.i; }
  }
  for (let d = 1; d <= lim && qa < qb; d++) {
    const fin = qb;
    while (qa < fin) {
      const b = q[qa++] * 4;
      for (let k = 0; k < 4; k++) {
        const j = NB[b + k];
        if (vis[j] === g || z[j] === PIEDRA) continue;
        if (t[j] === p.id) return d;
        vis[j] = g; q[qb++] = j;
      }
    }
  }
  return 1e9;
}

/* EL BOT NO CUENTA PASOS: MIRA LA PROFUNDIDAD.
   Contando pasos, el tramo se gasta tambien caminando adentro de lo propio —y
   como el terreno crece, a mitad de partida casi todo el tramo se va en cruzar
   la casa y las vueltas se achican solas. Medido asi, el bot cercaba 40 celdas
   por vuelta donde hacen falta mas del doble. `dc` ya dice a cuantos pasos de
   lo propio esta cada celda, o sea que «salir» es subir por ese campo, «correr
   el costado» es mantenerlo y «volver» es bajarlo: los tres modos son el mismo
   numero y ninguno depende de por donde se venia. Y ESO SOBREVIVE ENTERO A LA
   ESFERA, porque `dc` sale de un BFS sobre `NB` y un BFS no sabe de caras.  */
function piensa(M, p) {
  const b = p.bot; if (!b) return;
  if (b.azar) return piensaAzar(M, p);
  const NB = M.NB, per = b.per, leg = legales(M, p);
  if (!leg.length) return;
  const dc = verCasa(M, p), aqui = dc[p.i];
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
  if (p.estela > tope || riesgo(M, p, aqui + margen) <= aqui + margen) p.plan.modo = 'volver';
  else if (p.plan.modo === 'salir') { if (aqui >= hondo) p.plan.modo = 'lado'; }
  else if (p.plan.modo === 'lado') { if (p.plan.resta <= 0) p.plan.modo = 'volver'; else p.plan.resta--; }

  const base = p.i * 4;
  let mejor = -1e9, d = leg[0];
  for (const k of leg) {
    const i = NB[base + k];
    const dd = dc[i];
    let v;
    if (p.plan.modo === 'volver') v = -dd * 10;
    else if (p.plan.modo === 'salir') v = dd * 10;
    else v = -Math.abs(dd - hondo) * 10;        /* paralelo al borde         */
    /* seguir derecho cuando empata: un bot que zigzaguea gasta el doble de
       estela para encerrar lo mismo. En la esfera «derecho» es el rumbo que
       trae (`p.d`) y no una direccion de pantalla: `dirDe` desaparece con el
       plano, porque el rumbo ya es un dato del cuerpo.                      */
    if (k === p.d) v += 3;
    if (M.t[i] !== 0 && M.t[i] !== p.id) v += 60;   /* de paso, un corte      */
    if (M.z[i] === p.id && p.plan.modo !== 'volver') v -= 25;
    v += rnd(M) * 2;
    if (v > mejor) { mejor = v; d = k; }
  }
  p.ped = d;
}

function piensaAzar(M, p) {
  const leg = legales(M, p);
  if (!leg.length) return;
  p.ped = leg[Math.floor(rnd(M) * leg.length)];
}

/* ══════════════════════ AUDITORIAS ══════════════════════ */

/* ── LA GEOMETRIA, ANTES QUE NADA ────────────────────────────────────────
   LA TABLA DE VECINOS SE CONSTRUYE POR PROYECCION INVERSA y no con una lista
   de 24 costuras escrita a mano, justamente porque una entrada mal escrita no
   falla: TELETRANSPORTA el cuerpo a otra cara y desde afuera eso se ve como
   que el juego hace trampa. Lo que se comprueba es la propiedad que el juego
   necesita y no el procedimiento: que ir y volver devuelva al mismo sitio
   (`NB[NB[i,d], OPUE[ND[i,d]]] === i`) y que cada celda tenga CUATRO vecinos
   distintos. La segunda no es redundante: en una esfera de cubo las ocho
   esquinas tienen tres cuadrados, y si la proyeccion inversa se equivocara
   ahi, una celda tendria un vecino repetido — o sea un cuerpo que cruza una
   arista y sale por donde entro.                                           */
function auditaGeo(n) {
  const g = geoDe(n || 38), NB = g.NB, ND = g.ND, N = g.N;
  let asim = 0, repes = 0, fuera = 0, primero = null;
  for (let i = 0; i < N; i++) {
    const b = i * 4;
    for (let d = 0; d < 4; d++) {
      const j = NB[b + d], nd = ND[b + d];
      if (j < 0 || j >= N || nd < 0 || nd > 3) { fuera++; continue; }
      const v = NB[j * 4 + OPUE[nd]];
      if (v !== i) { asim++; if (!primero) primero = { i, d, j, nd, vuelve: v }; }
    }
    for (let a = 0; a < 4; a++) for (let c = a + 1; c < 4; c++)
      if (NB[b + a] === NB[b + c]) repes++;
  }
  /* que las posiciones esten sobre la esfera y que un vecino este a un paso:
     si `posCel` se saliera de la normalizacion, `distCel` mentiria en todo el
     juego sin que nada fallara.                                             */
  const P = g.POS;
  let peorR = 0, peorPaso = 0, mejorPaso = 9;
  for (let i = 0; i < N; i += Math.max(1, (N / 900) | 0)) {
    const b = i * 3;
    const r = Math.hypot(P[b], P[b + 1], P[b + 2]);
    if (Math.abs(r - 1) > peorR) peorR = Math.abs(r - 1);
    for (let d = 0; d < 4; d++) {
      const e = distCel(g, i, NB[i * 4 + d]);
      if (e > peorPaso) peorPaso = e;
      if (e < mejorPaso) mejorPaso = e;
    }
  }
  return {
    n: n || 38, N, asim, repes, fuera, primero,
    radio: +peorR.toExponential(1),
    paso: [+mejorPaso.toFixed(3), +peorPaso.toFixed(3)],
    ok: asim === 0 && repes === 0 && fuera === 0,
  };
}

/* ── «AFUERA» ES UNA MEDIDA Y HAY QUE MEDIRLA ────────────────────────────
   En el plano el relleno arrancaba del borde del tablero y el resultado era
   EXACTO: terreno mas estela forman un anillo 4-conexo y un anillo 4-conexo
   separa el plano. Una esfera no tiene borde, asi que el anillo la parte en
   dos pedazos FINITOS y hay que elegir cual es «afuera». La regla es el mas
   grande, y eso es una decision de diseno: falla cuando el pedazo cercado
   supera a lo que queda sin duenos —o sea cuando alguien esta a punto de
   ganar el planeta entero—. Lo que esta funcion informa es CUANTO FALTO para
   que fallara: `peorRep` es la fraccion mas chica que «afuera» llego a tener
   de todo el complemento (1 es holgado, 0,5 es empate) y `dudas` cuantos
   cierres bajaron de 0,75.                                                 */
function auditaFuera(veces) {
  const filas = [];
  let peor = 1, dudas = 0, cerrados = 0;
  for (let m = 0; m < MUNDOS.length; m++) for (let n = 0; n < NIV_MUNDO; n++) {
    const r = juegaSolo(m, n, 'bot');
    filas.push({ niv: (m + 1) + '-' + (n + 1), rep: r.peorRep, dudas: r.dudas, cerrados: r.cerrados });
    if (r.peorRep < peor) peor = r.peorRep;
    dudas += r.dudas; cerrados += r.cerrados;
  }
  const N = veces || 6;
  for (let i = 0; i < N; i++) {
    const r = juegaArena(1000 + i * 37, 'bot', 120);
    filas.push({ niv: 'arena ' + r.sem, rep: r.peorRep, dudas: r.dudas, cerrados: r.cerrados });
    if (r.peorRep < peor) peor = r.peorRep;
    dudas += r.dudas; cerrados += r.cerrados;
  }
  return { de: filas.length, peorRep: +peor.toFixed(3), dudas, cerrados, ok: dudas === 0, filas };
}

/* LA REGLA, CONTRA FORMAS CONOCIDAS. Un relleno que devuelva «algo» no
   prueba nada: hay que pedirle un numero que se pueda contar a mano.
   LOS CUATRO CASOS SIGUEN SIENDO LOS DEL PLANO, celda por celda: van en el
   medio de la cara +Z con n=24, y el recorrido mas ancho llega a x=19 y el
   mas alto a y=4, o sea que NINGUNO toca una arista. Eso es a proposito: lo
   que estos cuatro casos prueban es la REGLA DEL RELLENO, y meterlos en una
   costura mezclaria dos cosas que fallan por motivos distintos —la costura
   ya la prueba `auditaGeo`—.                                               */
const CR = (x, y) => (4 * 24 + y) * 24 + x;    /* celda de la cara +Z, n=24 */
const DER = 0, IZQ = 1, ABA = 2, ARR = 3;

function auditaRegla() {
  const out = [];
  /* 1 · una mordida rectangular: se sale del terreno, se rodea un 5×3 y se
        vuelve. Tienen que quedar EXACTAMENTE esas quince celdas mas la
        estela, ni una mas.                                                */
  {
    const M = nuevoM(24), p = nuevoJug(1, null); M.jug.push(p);
    for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) M.z[CR(x, y)] = 1;
    p.i = CR(13, 8); p.d = DER;
    const cam = [DER, DER, DER, DER, DER, DER, ARR, ARR, ARR, ARR,
                 IZQ, IZQ, IZQ, IZQ, IZQ, IZQ];
    let antes = 0; for (let i = 0; i < M.N; i++) if (M.z[i] === 1) antes++;
    for (const c of cam) { p.ped = c; tic(M); }
    let desp = 0; for (let i = 0; i < M.N; i++) if (M.z[i] === 1) desp++;
    /* seis de ida, cuatro de subida, cinco de vuelta = 15 de estela, mas el
       interior 5×3 = 15. La sexta de la vuelta cae en terreno propio.     */
    out.push({ caso: 'mordida', antes, desp, gano: desp - antes, esperado: 30, ok: desp - antes === 30 });
  }
  /* 2 · rodear una roca: la roca SIGUE SIENDO ROCA y lo de alrededor pasa a
        ser terreno. Si la roca se reclamara, el tablero perderia el unico
        obstaculo que tiene.                                               */
  {
    const M = nuevoM(24), p = nuevoJug(1, null); M.jug.push(p);
    for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) M.z[CR(x, y)] = 1;
    M.z[CR(16, 8)] = PIEDRA;
    p.i = CR(13, 8); p.d = DER;
    const cam = [ARR, DER, DER, DER, DER, ABA, ABA, IZQ, IZQ, IZQ, IZQ];
    for (const c of cam) { p.ped = c; tic(M); }
    const roca = M.z[CR(16, 8)] === PIEDRA, mio = M.z[CR(16, 7)] === 1;
    out.push({ caso: 'roca', sigueRoca: roca, mio, ok: roca && mio });
  }
  /* 3 · encerrar a un rival: su terreno pasa a ser mio. Sin esto los rivales
        serian decoracion que estorba.                                     */
  {
    const M = nuevoM(24), p = nuevoJug(1, null), q = nuevoJug(2, null); M.jug.push(p, q);
    for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) M.z[CR(x, y)] = 1;
    for (let y = 7; y < 10; y++) for (let x = 15; x < 18; x++) M.z[CR(x, y)] = 2;
    q.i = CR(16, 8); q.vivo = false;
    let suyo0 = 0; for (let i = 0; i < M.N; i++) if (M.z[i] === 2) suyo0++;
    p.i = CR(13, 8); p.d = DER;
    const cam = [ARR, ARR, ARR, DER, DER, DER, DER, DER, DER,
                 ABA, ABA, ABA, ABA, ABA, ABA, IZQ, IZQ, IZQ, IZQ, IZQ, IZQ,
                 ARR, ARR, ARR];
    for (const c of cam) { p.ped = c; tic(M); }
    let suyo1 = 0; for (let i = 0; i < M.N; i++) if (M.z[i] === 2) suyo1++;
    out.push({ caso: 'rival', suyo0, suyo1, ok: suyo0 === 9 && suyo1 === 0 });
  }
  /* 4 · la propia estela mata, y la ajena mata a su dueno. Es LA regla que
        hace que salir cueste algo.                                        */
  {
    const M = nuevoM(24), p = nuevoJug(1, null); M.jug.push(p);
    for (let y = 4; y < 8; y++) for (let x = 4; x < 8; x++) M.z[CR(x, y)] = 1;
    p.i = CR(7, 6); p.d = DER;
    const cam = [DER, DER, ABA, IZQ, ARR, ARR];
    for (const c of cam) { if (p.vivo) { p.ped = c; tic(M); } }
    out.push({ caso: 'propia estela', vivo: p.vivo, ok: !p.vivo });
  }
  return { casos: out, malos: out.filter(o => !o.ok).map(o => o.caso) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOS AUTO-JUGADORES · lo unico que prueba que hay una decision adentro
   ───────────────────────────────────────────────────────────────────────────
   Tres cerebros y el tercero es el control: el que juega al azar tiene que
   perder por lejos, porque si llega parecido al honesto entonces el juego no
   esta pidiendo nada y la geometria nueva no arreglo eso, lo tapo.

   Y LOS TRES DEVUELVEN `peorRep`, `dudas` y `cerrados`: la regla del relleno
   en la esfera —«la componente mas grande es afuera»— es una DECISION y no un
   teorema, asi que cada partida tiene que informar cuanto le falto para
   fallar. Eso es lo que junta `auditaFuera`.
   ═══════════════════════════════════════════════════════════════════════ */

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
    peorRep: +M.peorRep.toFixed(3), dudas: M.dudas, cerrados: M.cerrados,
  };
}

function juegaArena(sem, modo, seg) {
  const cfg = cfgArena(sem);
  const M = generaMapa(cfg);
  const yo = M.jug[0];
  yo.bot = modo === 'azar'  ? { azar: true }
         : modo === 'ciego' ? { per: 0.86, ciego: true }
         :                    { per: 0.86 };
  yo.topeCortes = 1;                      /* una vida: la arena es asi       */
  for (let j = 1; j < M.jug.length; j++) M.jug[j].topeCortes = 1e9;
  const DT = 1 / VEL, lim = seg || 120;
  let t = 0, mejor = 0;

  /* EL PUESTO SE GUARDA EN EL ULTIMO TIC VIVO Y NO AL SALIR DEL BUCLE.
     En la arena morir BORRA el terreno, asi que preguntando despues el
     jugador lee 0% y sale ultimo SIEMPRE, por construccion — el numero seria
     del cadaver y no de la partida. Medido en el plano con la semilla 1001:
     ultimo vivo pos 7 con 2,52%, ya muerto pos 8 con 0,00.                 */
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
    peorRep: +M.peorRep.toFixed(3), dudas: M.dudas, cerrados: M.cerrados,
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
    peorRep: +Math.min(...r.map(x => x.peorRep)).toFixed(3),
    dudas: r.reduce((a, x) => a + x.dudas, 0),
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
    peorRep: +Math.min(...r.map(x => x.peorRep)).toFixed(3),
    dudas: r.reduce((a, x) => a + x.dudas, 0),
    malos: r.filter(x => !x.gano).map(x => (x.m + 1) + '-' + (x.n + 1) + ' ' + x.pct + '/' + x.meta),
  };
}

function auditaMapas() {
  const malos = [], filas = [];
  for (let m = 0; m < MUNDOS.length; m++) for (let n = 0; n < NIV_MUNDO; n++) {
    const M = generaMapa(cfgNivel(m, n)), a = auditaMapa(M);
    filas.push({ niv: (m + 1) + '-' + (n + 1), n: a.n, N: a.N, libres: a.libres, roca: a.roca, cerca: a.cerca });
    if (a.malos.length) malos.push((m + 1) + '-' + (n + 1) + ': ' + a.malos.join(','));
  }
  for (let i = 0; i < 4; i++) {
    const s = 1000 + i * 37, M = generaMapa(cfgArena(s)), a = auditaMapa(M);
    filas.push({ niv: 'arena ' + s, n: a.n, N: a.N, libres: a.libres, roca: a.roca, cerca: a.cerca });
    if (a.malos.length) malos.push('arena ' + s + ': ' + a.malos.join(','));
  }
  return { de: filas.length, malos, filas };
}
