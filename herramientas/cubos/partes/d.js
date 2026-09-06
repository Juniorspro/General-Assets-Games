/* ══════════════════════ EL MUNDO Y EL JUEZ DE LA CASA ══════════════════════
   Este archivo no toca el DOM ni three, y eso es a proposito: se puede
   concatenar con b.js y correr en node, que es donde se auditan el juez y la
   puntería antes de dibujar un solo pixel. */

/* la grilla: un byte por celda, 0 = aire. El indice es el valor de BLOQUES. */
const REJA = new Uint8Array(CELDAS);
function idx(x, y, z){ return (y*N + z)*N + x; }
function dentro(x, y, z){ return x >= 0 && x < N && y >= 0 && y < ALTO && z >= 0 && z < N; }
function bloqueEn(x, y, z){ return dentro(x, y, z) ? REJA[idx(x, y, z)] : 0; }
function ponBloque(x, y, z, b){
  if (!dentro(x, y, z)) return false;
  const i = idx(x, y, z); if (REJA[i] === b) return false;
  REJA[i] = b; return true;
}
function limpiaReja(){ REJA.fill(0); }

/* ── EL SUELO NO ES UN BLOQUE DE LA REJA ──
   Si la base fuera parte de la parcela, romperla dejaria un agujero al vacio y
   el jugador se caeria del mundo; y peor, el juez contaria esos 256 bloques
   como obra. El piso se dibuja aparte y la reja arranca vacia: TODO lo que hay
   adentro lo puso el jugador, que es lo que el puntaje tiene que medir. */

/* ══════════ LA PUNTERIA ══════════
   DDA de Amanatides y Woo: avanza celda por celda por el rayo y devuelve la
   primera llena mas la CARA por la que entro, que es donde se apoya el bloque
   nuevo. Sin la cara no se puede construir hacia arriba: el bloque nuevo
   siempre caeria del lado del que uno viene. */
function raya(ox, oy, oz, dx, dy, dz, alcance){
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  /* ── UN EJE CON DIRECCION CERO TIENE QUE DAR INFINITO, NO UN NUMERO GRANDE ──
     Con `(ox - x)*1e9` el caso degenerado —el origen justo sobre el borde de la
     celda y la direccion en cero— da CERO, o sea el cruce mas cercano de los
     tres: el rayo se sale de su propia columna en el primer paso y no vuelve.
     Y no es un caso raro: el jugador aparece en x = N/2 exacto y mirando con
     yaw 0, asi que le pasaba en el PRIMER bloque de cada ronda. */
  const INF = Infinity;
  const nx = Math.abs(dx) < 1e-9, ny = Math.abs(dy) < 1e-9, nz = Math.abs(dz) < 1e-9;
  const ax = nx ? INF : 1/Math.abs(dx);
  const ay = ny ? INF : 1/Math.abs(dy);
  const az2 = nz ? INF : 1/Math.abs(dz);
  let tx = nx ? INF : (dx > 0 ? (x + 1 - ox) : (ox - x))*ax;
  let ty = ny ? INF : (dy > 0 ? (y + 1 - oy) : (oy - y))*ay;
  let tz = nz ? INF : (dz > 0 ? (z + 1 - oz) : (oz - z))*az2;
  let cara = [0, 0, 0], t = 0;
  for (let p = 0; p < 160; p++){
    if (t > alcance) break;
    if (dentro(x, y, z) && REJA[idx(x, y, z)]) return { x, y, z, cara, t };
    if (tx < ty && tx < tz){ t = tx; x += sx; tx += ax; cara = [-sx, 0, 0]; }
    else if (ty < tz){ t = ty; y += sy; ty += ay; cara = [0, -sy, 0]; }
    else { t = tz; z += sz; tz += az2; cara = [0, 0, -sz]; }
  }
  return null;
}

/* ══════════ EL JUEZ DE LA CASA ══════════
   Lo que este juez PUEDE medir es la obra; lo que NO puede es si se parece al
   tema, y por eso la pantalla del final dice siempre quien puntuo. Un numero
   sin autor no significa nada, y decir «85» sobre una casa que es un cubo seria
   mentirle al jugador.

   Las seis medidas salen de preguntarse que distingue una construccion pensada
   de un monton de cubos: */
function mideObra(){
  let n = 0;
  const clases = new Set();
  let x0 = N, x1 = -1, y1 = -1, z0 = N, z1 = -1;
  const altura = new Int8Array(N*N).fill(-1);
  for (let y = 0; y < ALTO; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++){
    const b = REJA[idx(x, y, z)]; if (!b) continue;
    n++; clases.add(b);
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
    if (y > y1) y1 = y;
    const k = z*N + x; if (y > altura[k]) altura[k] = y;
  }
  if (!n) return { n: 0, clases: 0, vacio: true };
  /* 1. VOLUMEN — una campana, no una rampa: cien bloques es poco y mil es un
        bloque macizo. El pico esta en trescientos, que es lo que entra en dos
        minutos y medio construyendo con intencion. */
  const vol = Math.exp(-Math.pow(Math.log(n/300), 2)/1.6);
  /* 2. VARIEDAD — con un solo bloque la obra se lee a maqueta de prueba; pasada
        la docena, mas clases ya no agregan lectura. */
  const varied = Math.min(1, Math.log(1 + clases.size)/Math.log(13));
  /* 3. HUELLA — cuanto de la parcela usa, en planta y en alto. */
  let pisadas = 0; for (let k = 0; k < N*N; k++) if (altura[k] >= 0) pisadas++;
  const huella = Math.min(1, (pisadas/(N*N))/0.55)*0.6 + Math.min(1, (y1 + 1)/12)*0.4;
  /* 4. SIMETRIA — la mejor de las dos, no el promedio: una casa suele ser
        simetrica en UN eje y forzar los dos castiga lo que esta bien hecho.
        ── Y SE ACOTA POR LA ALTURA, PORQUE SI NO ES REGALADA ──
        Medido, una losa plana de 14 x 14 daba simetria 1,000 y se llevaba los
        catorce puntos enteros sin haber construido nada: un rectangulo chato es
        simetrico por definicion. La simetria solo dice algo cuando hay ALGO de
        que ser simetrico, asi que se multiplica por lo que la obra levanta. */
  const sim = Math.max(simetria(0), simetria(1))*Math.min(1, (y1 + 1)/4);
  /* 5. SUPERFICIE — caras al aire dividido bloques. Un cubo macizo de 300 tiene
        pocas caras por bloque; una forma hueca y con detalle tiene muchas. Seis
        es el maximo (un bloque suelto) y no es lo que se busca: el objetivo
        esta en tres y pico, que es una cascara de una capa. */
  let caras = 0;
  for (let y = 0; y < ALTO; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++){
    if (!REJA[idx(x, y, z)]) continue;
    if (!bloqueEn(x+1,y,z)) caras++; if (!bloqueEn(x-1,y,z)) caras++;
    if (!bloqueEn(x,y+1,z)) caras++; if (!bloqueEn(x,y-1,z)) caras++;
    if (!bloqueEn(x,y,z+1)) caras++; if (!bloqueEn(x,y,z-1)) caras++;
  }
  const sup = Math.exp(-Math.pow((caras/n) - 3.2, 2)/3.0);
  /* 6. SILUETA — cuanto varia el mapa de alturas. Una losa plana da cero por
        mas grande que sea, y una silueta es lo unico que se ve de lejos. */
  let s = 0, s2 = 0, c = 0;
  for (let k = 0; k < N*N; k++) if (altura[k] >= 0){ s += altura[k]; s2 += altura[k]*altura[k]; c++; }
  const desv = c > 1 ? Math.sqrt(Math.max(0, s2/c - (s/c)*(s/c))) : 0;
  const silueta = Math.min(1, desv/3.2);
  /* ── Y LA SILUETA PESA MAS QUE NINGUNA, PORQUE ES LA QUE SEPARA ──
     Medido sobre las cuatro obras de prueba, `sup` da 0,76 a una losa y 0,79 a
     una casa: no distingue. Las dos que si distinguen son la VARIEDAD y la
     SILUETA —0,27 contra 0,70 y 0,00 contra 0,33— asi que el peso va ahi. */
  const p = vol*18 + varied*18 + huella*14 + sim*12 + sup*14 + silueta*24;
  return { n, clases: clases.size, alto: y1 + 1, pisadas, caras,
    partes: { vol: +vol.toFixed(3), varied: +varied.toFixed(3), huella: +huella.toFixed(3),
              sim: +sim.toFixed(3), sup: +sup.toFixed(3), silueta: +silueta.toFixed(3) },
    puntaje: Math.round(cl(p, 0, 100)) };
}
/* eje 0 = espeja en x, eje 1 = espeja en z */
function simetria(eje){
  let ig = 0, tot = 0;
  for (let y = 0; y < ALTO; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++){
    const a = REJA[idx(x, y, z)];
    const b = eje ? REJA[idx(x, y, N - 1 - z)] : REJA[idx(N - 1 - x, y, z)];
    if (a || b){ tot++; if (a === b) ig++; }
  }
  return tot ? ig/tot : 0;
}

/* ══════════ EL ESTADO DE LA PARTIDA ══════════ */
let RUN = null;
function arrancaRun(semilla, reloj){
  sem(semilla || (Date.now() & 0xffff));
  /* los temas se sortean SIN REPETIR: en una partida de tres rondas, que salga
     «una casa» dos veces se lee a que el juego se rompio */
  const bolsa = TEMAS.map((t, i) => i);
  for (let i = bolsa.length - 1; i > 0; i--){ const j = azi(0, i), v = bolsa[i]; bolsa[i] = bolsa[j]; bolsa[j] = v; }
  RUN = { fase: 'juega', ronda: 0, temas: bolsa.slice(0, RONDAS), t: 0,
          reloj: reloj || RELOJES.normal, puntajes: [], jueces: [], detalles: [],
          puestos: 0, sacados: 0, semilla };
  limpiaReja();
  return RUN;
}
function pasoRun(dt){
  if (!RUN || RUN.fase !== 'juega') return;
  RUN.t += dt;
  if (RUN.t >= RUN.reloj){ RUN.t = RUN.reloj; RUN.fase = 'juzga'; }
}
function temaActual(){ return RUN ? TEMAS[RUN.temas[RUN.ronda]] : null; }
function anotaRonda(puntaje, juez, det){
  RUN.puntajes.push(puntaje); RUN.jueces.push(juez); RUN.detalles.push(det || null);
  RUN.fase = RUN.ronda + 1 >= RONDAS ? 'final' : 'puntaje';
}
function rondaSiguiente(){
  RUN.ronda++; RUN.t = 0; RUN.fase = 'juega'; RUN.puestos = 0; RUN.sacados = 0;
  limpiaReja();
}
function totalRun(){ return RUN ? RUN.puntajes.reduce((a, b) => a + b, 0) : 0; }

/* ══════════ EL AUTO-CONSTRUCTOR ══════════
   No es un jugador: es lo que permite auditar el juez sin manos. Levanta cuatro
   obras de forma conocida —nada, un cubo macizo, una losa plana y una casita
   hueca con techo— y el juez tiene que ORDENARLAS bien. Un juez que le da lo
   mismo a un cubo que a una casa no es un juez. */
function construye(que){
  limpiaReja();
  const p = (x, y, z, b) => ponBloque(x, y, z, b);
  if (que === 'nada') return;
  if (que === 'cubo'){
    for (let y = 0; y < 7; y++) for (let z = 4; z < 11; z++) for (let x = 4; x < 11; x++) p(x, y, z, 15);
    return;
  }
  if (que === 'losa'){
    for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) p(x, 0, z, 15);
    return;
  }
  if (que === 'torre'){
    for (let y = 0; y < 15; y++){
      const r = y > 11 ? 3 : 2;
      for (let z = 8 - r; z <= 7 + r; z++) for (let x = 8 - r; x <= 7 + r; x++){
        const borde = x === 8 - r || x === 7 + r || z === 8 - r || z === 7 + r;
        if (borde) p(x, y, z, y % 4 === 3 ? 18 : 16);
      }
    }
    for (const [x, z] of [[5,5],[10,5],[5,10],[10,10]]) p(x, 14, z, 47);
    return;
  }
  if (que === 'casa'){
    /* cascara de 9 x 9 x 5 con techo a dos aguas, puerta, ventanas y cimiento */
    for (let z = 3; z < 12; z++) for (let x = 3; x < 12; x++) p(x, 0, z, 16);
    for (let y = 1; y < 5; y++) for (let z = 3; z < 12; z++) for (let x = 3; x < 12; x++)
      if (x === 3 || x === 11 || z === 3 || z === 11) p(x, y, z, 34);
    for (let k = 0; k < 5; k++) for (let x = 3 + k; x <= 11 - k; x++)
      { p(x, 5 + k, 3 + k, 19); p(x, 5 + k, 11 - k, 19); }
    for (let k = 0; k < 5; k++) for (let z = 3 + k; z <= 11 - k; z++)
      { p(3 + k, 5 + k, z, 19); p(11 - k, 5 + k, z, 19); }
    p(7, 1, 3, 0); p(7, 2, 3, 0);
    for (const [x, z] of [[5,3],[9,3],[3,7],[11,7]]) p(x, 3, z, 52);
    for (const [x, z] of [[4,4],[10,4],[4,10],[10,10]]) for (let y = 1; y < 5; y++) p(x, y, z, 31);
    return;
  }
}
