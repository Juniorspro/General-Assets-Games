/* ============================================================
   c.js — EL MODELO PURO. No toca ni el DOM ni el lienzo, asi que
   se concatena con b.js y se importa en node: los diez pisos se
   auditan sin navegador. Un piso generado y no comprobado es un
   piso roto que todavia no se sabe.
   ============================================================ */

/* azar con semilla: un piso con la misma semilla tiene que ser
   el mismo piso en cualquier aparato */
function rng(sem){
  let s = sem >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}
const ri = (r,a,b) => a + Math.floor(r() * (b - a + 1));
const elige = (r,L) => L[Math.floor(r() * L.length)];

const LADOS = [
  {k:'n', dx: 0, dy:-1, op:'s'},
  {k:'s', dx: 0, dy: 1, op:'n'},
  {k:'e', dx: 1, dy: 0, op:'o'},
  {k:'o', dx:-1, dy: 0, op:'e'},
];

/* la boca de cada puerta, en celdas: tres de ancho en el medio del lado */
const PUERTA_C = {
  n:{x:(SALA_W-1)>>1, y:0},
  s:{x:(SALA_W-1)>>1, y:SALA_H-1},
  e:{x:SALA_W-1,      y:(SALA_H-1)>>1},
  o:{x:0,             y:(SALA_H-1)>>1},
};

/* ---------- interior de una sala ---------- */
/* DONDE CAE EL JUGADOR AL ENTRAR A UN PISO. Sale de los mismos numeros que usa
   entraSala cuando no hay lado de salida (MUNDO_W/2, MUNDO_H/2), asi que validar
   esta celda y plantar al jugador ahi son LA MISMA CUENTA y no se pueden separar. */
const CENTRO_CX = Math.floor((MUNDO_W/2)/CELDA), CENTRO_CY = Math.floor((MUNDO_H/2)/CELDA);

const PATRONES = ['vacio','pilares','cruz','esquinas','columnas','anillo','diente','postes'];

function armaMuros(pat, r){
  const m = new Uint8Array(SALA_W * SALA_H);
  const I = (x,y) => y * SALA_W + x;
  for (let y = 0; y < SALA_H; y++) for (let x = 0; x < SALA_W; x++)
    if (x === 0 || y === 0 || x === SALA_W-1 || y === SALA_H-1) m[I(x,y)] = 1;

  const bloque = (x0,y0,w,h) => {
    for (let y = y0; y < y0+h; y++) for (let x = x0; x < x0+w; x++)
      if (x > 1 && y > 1 && x < SALA_W-2 && y < SALA_H-2) m[I(x,y)] = 2;
  };
  const cx = (SALA_W-1)>>1, cy = (SALA_H-1)>>1;

  if (pat === 'pilares'){
    bloque(3,3,2,2); bloque(SALA_W-5,3,2,2);
    bloque(3,SALA_H-5,2,2); bloque(SALA_W-5,SALA_H-5,2,2);
    /* cuatro pilares ALREDEDOR del centro y no uno ENCIMA: el de 2x2 en el
       medio caia justo sobre la celda donde nace el jugador. */
    if (r() < .5){ bloque(cx-2,cy-2,1,1); bloque(cx+2,cy-2,1,1);
                   bloque(cx-2,cy+2,1,1); bloque(cx+2,cy+2,1,1); }
  } else if (pat === 'cruz'){
    /* CUATRO BRAZOS Y NO DOS BARRAS MACIZAS: el medio queda hueco a proposito,
       porque ahi cae el jugador al entrar a un piso. Con las barras enteras el
       centro era muro SIEMPRE y uno nacia adentro de la pared. */
    bloque(cx-1,cy-3,2,2); bloque(cx-1,cy+2,2,2);
    bloque(cx-3,cy-1,2,2); bloque(cx+2,cy-1,2,2);
  } else if (pat === 'esquinas'){
    bloque(2,2,3,2); bloque(SALA_W-5,2,3,2);
    bloque(2,SALA_H-4,3,2); bloque(SALA_W-5,SALA_H-4,3,2);
  } else if (pat === 'columnas'){
    bloque(3,3,1,SALA_H-6); bloque(SALA_W-4,3,1,SALA_H-6);
  } else if (pat === 'anillo'){
    for (let y = cy-3; y <= cy+3; y++) for (let x = cx-3; x <= cx+3; x++){
      const borde = (x===cx-3||x===cx+3||y===cy-3||y===cy+3);
      const hueco = (x===cx && (y===cy-3||y===cy+3)) || (y===cy && (x===cx-3||x===cx+3));
      if (borde && !hueco) bloque(x,y,1,1);
    }
  } else if (pat === 'diente'){
    for (let y = 3; y < SALA_H-3; y += 4) bloque(r()<.5 ? 2 : SALA_W-5, y, 3, 1);
  } else if (pat === 'postes'){
    for (let y = 3; y < SALA_H-3; y += 3)
      for (let x = 3; x < SALA_W-3; x += 3) if (r() < .55) bloque(x,y,1,1);
  }
  return m;
}

/* BFS de celdas pisables. Devuelve el mapa de alcance desde una celda. */
function alcance(m, sx, sy){
  const v = new Uint8Array(SALA_W * SALA_H);
  const q = [sy * SALA_W + sx]; v[q[0]] = 1;
  for (let i = 0; i < q.length; i++){
    const c = q[i], x = c % SALA_W, y = (c / SALA_W) | 0;
    for (const L of LADOS){
      const nx = x + L.dx, ny = y + L.dy;
      if (nx < 0 || ny < 0 || nx >= SALA_W || ny >= SALA_H) continue;
      const k = ny * SALA_W + nx;
      if (v[k] || m[k]) continue;
      v[k] = 1; q.push(k);
    }
  }
  return v;
}

/* la boca de una puerta se abre en el muro del borde */
function abrePuerta(m, k){
  const p = PUERTA_C[k], I = (x,y) => y * SALA_W + x;
  if (k === 'n' || k === 's') for (let d = -1; d <= 1; d++) m[I(p.x+d, p.y)] = 0;
  else                        for (let d = -1; d <= 1; d++) m[I(p.x, p.y+d)] = 0;
}

/* celda de entrada al cuarto por esa puerta (una adentro del borde) */
function dentroDe(k){
  const p = PUERTA_C[k];
  return {x: p.x + (k==='o'?1:k==='e'?-1:0), y: p.y + (k==='n'?1:k==='s'?-1:0)};
}

function generaSala(tipo, puertas, r){
  for (let intento = 0; intento < 40; intento++){
    const pat = (tipo === 'jefe' || intento > 24) ? 'vacio' : elige(r, PATRONES);
    const m = armaMuros(pat, r);
    for (const k of puertas) abrePuerta(m, k);
    /* comprobar que TODAS las puertas se alcanzan entre si */
    const a0 = dentroDe(puertas[0]);
    const v = alcance(m, a0.x, a0.y);
    let ok = true;
    for (const k of puertas){ const d = dentroDe(k); if (!v[d.y*SALA_W+d.x]) { ok = false; break; } }
    if (!ok) continue;
    /* y que quede sitio de sobra para pelear */
    let libres = 0; for (let i = 0; i < v.length; i++) if (v[i]) libres++;
    if (libres < (SALA_W-2)*(SALA_H-2)*0.62) continue;
    /* Y QUE EL CENTRO SE PISE Y SE ALCANCE DESDE LA PUERTA. Ahi cae el jugador
       al entrar a un piso: un patron que amuralle esa celda lo deja NACIENDO
       DENTRO DE UN MURO, sin gradiente de campo de flujo — o sea sin salida, ni
       para el bot ni para una persona. Va aca y no arreglando los patrones uno
       por uno: esto tambien cubre al que se agregue manana. */
    if (!v[CENTRO_CY*SALA_W + CENTRO_CX]) continue;
    return {m, pat, v, libres};
  }
  /* red de seguridad: un cuarto vacio siempre sirve */
  const m = armaMuros('vacio', r);
  for (const k of puertas) abrePuerta(m, k);
  const a0 = dentroDe(puertas[0]);
  return {m, pat:'vacio', v:alcance(m, a0.x, a0.y), libres:(SALA_W-2)*(SALA_H-2)};
}

/* ---------- el piso ---------- */
function generaPiso(n, sem){
  const r = rng(sem * 7919 + n * 104729 + 13);
  const jefe = (n === 5 || n === 10);
  const largo = jefe ? 4 : Math.min(7, 3 + Math.floor(n * .45));   // salas del camino
  const ramas = jefe ? 1 : (n >= 3 ? 1 + (r() < .45 ? 1 : 0) : (n >= 2 ? 1 : 0));

  /* camino sobre una grilla, sin pisarse */
  const mapa = {};                    // "x,y" -> sala
  const key = (x,y) => x + ',' + y;
  let x = 0, y = 0;
  const cam = [{x,y}];
  mapa[key(x,y)] = true;
  let guard = 0;
  while (cam.length < largo && guard++ < 400){
    const L = elige(r, LADOS);
    const nx = x + L.dx, ny = y + L.dy;
    if (mapa[key(nx,ny)]) continue;
    if (Math.abs(nx) > 3 || Math.abs(ny) > 3) continue;
    x = nx; y = ny; mapa[key(x,y)] = true; cam.push({x,y});
  }
  /* ramas colgadas del camino (cofres) */
  const extra = [];
  for (let i = 0; i < ramas; i++){
    for (let t = 0; t < 40; t++){
      const base = cam[ri(r, 1, cam.length - 2)];
      const L = elige(r, LADOS);
      const nx = base.x + L.dx, ny = base.y + L.dy;
      if (mapa[key(nx,ny)]) continue;
      if (Math.abs(nx) > 3 || Math.abs(ny) > 3) continue;
      mapa[key(nx,ny)] = true;
      extra.push({x:nx, y:ny, de:base});
      break;
    }
  }

  /* armar las salas */
  const salas = [], ix = {};
  const pon = (gx,gy,tipo) => {
    const s = {gx, gy, tipo, puertas:{}, vec:{}, limpia:false, visitada:false,
               enem:[], cor:[], m:null, pat:'', ix:salas.length};
    ix[key(gx,gy)] = s.ix; salas.push(s); return s;
  };
  for (let i = 0; i < cam.length; i++){
    const t = i === 0 ? 'entrada' : (i === cam.length - 1 ? (jefe ? 'jefe' : 'escalera') : 'combate');
    pon(cam[i].x, cam[i].y, t);
  }
  for (const e of extra) pon(e.x, e.y, 'cofre');

  /* conexiones: SOLO entre vecinas que existen y estan pegadas en el camino/rama */
  const une = (a, b) => {
    for (const L of LADOS){
      if (a.gx + L.dx === b.gx && a.gy + L.dy === b.gy){
        a.puertas[L.k] = true; a.vec[L.k] = b.ix;
        b.puertas[L.op] = true; b.vec[L.op] = a.ix;
        return true;
      }
    }
    return false;
  };
  for (let i = 1; i < cam.length; i++) une(salas[i-1], salas[i]);
  for (const e of extra) une(salas[ix[key(e.de.x, e.de.y)]], salas[ix[key(e.x, e.y)]]);

  /* interiores + siembra */
  for (const s of salas){
    const ks = Object.keys(s.puertas);
    const g = generaSala(s.tipo, ks, r);
    s.m = g.m; s.pat = g.pat;

    /* celdas libres lejos de cualquier puerta: aparecer al lado de un bicho
       no es dificultad, es una emboscada */
    const libres = [];
    for (let cy = 2; cy < SALA_H-2; cy++) for (let cx2 = 2; cx2 < SALA_W-2; cx2++){
      const k = cy*SALA_W+cx2;
      if (s.m[k] || !g.v[k]) continue;
      let lejos = true;
      for (const kk of ks){
        const d = dentroDe(kk);
        if (Math.abs(d.x-cx2) + Math.abs(d.y-cy) < 4) { lejos = false; break; }
      }
      if (lejos) libres.push({x:cx2, y:cy});
    }
    s.libres = libres.length;

    /* EL CENTRO DE LA SALA NO ES UN SITIO LIBRE: los patrones 'cruz' y
       'anillo' construyen justo ahi. El cofre y la escalera van a la celda
       LIBRE mas cercana al centro, que es una medicion y no una suposicion. */
    const centro = (lista) => {
      const cx0 = (SALA_W-1)/2, cy0 = (SALA_H-1)/2;
      let mej = null, md = 1e9;
      for (const p of lista){
        const d = (p.x-cx0)*(p.x-cx0) + (p.y-cy0)*(p.y-cy0);
        if (d < md){ md = d; mej = p; }
      }
      return mej;
    };
    /* candidatos: libre y alcanzable, sin pedir distancia a las puertas */
    const sitios = [];
    for (let cy = 1; cy < SALA_H-1; cy++) for (let cx2 = 1; cx2 < SALA_W-1; cx2++){
      const k = cy*SALA_W+cx2;
      if (!s.m[k] && g.v[k]) sitios.push({x:cx2, y:cy});
    }

    if (s.tipo === 'combate' || s.tipo === 'escalera'){
      const clases = OLAS[Math.min(OLAS.length-1, n-1)];
      const cant = Math.min(libres.length, 3 + Math.floor(n * .55) + ri(r,0,1));
      /* NO MAS DE UN TERCIO A DISTANCIA, y no es equilibrio sino generacion: con
         la clase sorteada uniforme entre tres, una sala del piso 3 podia salir con
         cuatro tiradores de cinco. Eso no es dificil, es una emboscada — y medido,
         el tirador solo se llevaba el 67% de todo el dano de una corrida. Lo que
         sobra se degrada a la primera clase de cuerpo a cuerpo de la propia ola,
         asi que la mezcla del piso sigue siendo la que dice OLAS. */
      const cerca = clases.filter(c => ENEM[c].f === 0);
      /* Y NO MAS DE UN TERCIO PESADO, por la misma razon y con la misma cuenta.
         El tope de distancia estaba desde el principio y el de dano NO, asi que
         una sala del piso 7 podia salir con siete bichos que cobran DOS corazones
         cada uno contra una barra de ocho: medido sobre 400 pisos, la mediana era
         cuatro pesados por sala y 361 de 2000 salas llevaban seis o siete. Y se
         ve en quien mata: de 200 corridas, el bruto mete 79 golpes fatales y la
         bomba 36, mas que los dos jefes juntos, con el bot entrando al piso que
         lo mata con la barra llena. No se muere de a poco: se muere adentro de
         una sala. Lo que sobra se degrada a una clase liviana de la propia ola.
         (El reparto de OLAS ya garantiza que toda ola tenga una clase liviana
         de cuerpo a cuerpo, asi que `llano` nunca esta vacia.) */
      const flojo = clases.filter(c => ENEM[c].d <  PESA_D);
      const llano = clases.filter(c => ENEM[c].d <  PESA_D && ENEM[c].f === 0);
      /* FLOOR y no CEIL: con ceil, una sala de cuatro bichos ya salia con dos
     tiradores, o sea que el primer piso con distancia te mostraba dos a la vez.
     Con floor da uno hasta los cinco bichos y dos desde los seis. */
  const topeL = Math.max(1, Math.floor(cant / 3));
      const topeP = Math.max(1, Math.floor(cant / 3));
      let nL = 0, nP = 0;
      const usadas = {};
      for (let i = 0; i < cant; i++){
        let p, g2 = 0;
        do { p = elige(r, libres); g2++; } while (usadas[p.x+','+p.y] && g2 < 30);
        usadas[p.x+','+p.y] = 1;
        let cl = elige(r, clases);
        if (ENEM[cl].f > 0    && nL >= topeL && cerca.length) cl = elige(r, cerca);
        if (ENEM[cl].d >= PESA_D && nP >= topeP && flojo.length) cl = elige(r, flojo);
        /* la segunda degradacion puede violar el primer tope —el reemplazo
           liviano puede ser de distancia— asi que el ultimo recurso es una clase
           que cumple los dos. */
        if (((ENEM[cl].f > 0 && nL >= topeL) || (ENEM[cl].d >= PESA_D && nP >= topeP)) && llano.length)
          cl = elige(r, llano);
        /* se cuenta la clase FINAL y no la sorteada: contar antes de degradar
           gasta cupo en un bicho que no salio. */
        if (ENEM[cl].f > 0)      nL++;
        if (ENEM[cl].d >= PESA_D) nP++;
        s.enem.push({cl, cx:p.x, cy:p.y});
      }
    } else if (s.tipo === 'jefe'){
      const c = (SALA_W-1)>>1;
      const arriba = sitios.filter(p => p.y <= 4);
      const pj = arriba.length ? centro(arriba) : centro(sitios);
      s.enem.push({cl: n === 5 ? 'jefe1' : 'jefe2', cx:pj.x, cy:pj.y});
      const clases = OLAS[Math.min(OLAS.length-1, n-1)];
      /* LA ESCOLTA DEL PRIMER JEFE ES UNA Y LA DEL ULTIMO SON TRES. Con tres en
         los dos, el piso 5 pedia leer el abanico del jefe MIENTRAS te corren
         tres bichos encima: medido sobre 200 corridas, 54 de las 200 muertes
         caian ahi, el pico de toda la escalera. Es la misma correccion que la
         tabla de OLAS: dos cosas nuevas a la vez. El primer jefe ENSENA el
         abanico y el ultimo lo TOMA. */
      const esc = n === 5 ? 1 : 3;
      for (let i = 0; i < esc && i < libres.length; i++)
        s.enem.push({cl: elige(r, clases), cx:libres[(i*7)%libres.length].x, cy:libres[(i*7)%libres.length].y});
    } else if (s.tipo === 'cofre'){
      const p = centro(sitios);
      s.cofre = {cx:p.x, cy:p.y, arma: ARMAS[ri(r,0,ARMAS.length-1)].id, abierto:false};
    }
    if (s.tipo === 'escalera' || s.tipo === 'jefe'){
      /* la escalera no puede caer encima del cofre ni del jefe */
      const libresEsc = sitios.filter(p => !(s.cofre && s.cofre.cx===p.x && s.cofre.cy===p.y));
      const p = centro(libresEsc.length ? libresEsc : sitios);
      s.esc = {cx:p.x, cy:p.y};
    }

    /* monedas sueltas */
    s.mon = [];
    const nm = s.tipo === 'combate' ? ri(r,1,3) : (s.tipo === 'cofre' ? 3 : 1);
    for (let i = 0; i < nm && libres.length; i++){
      const p = libres[ri(r,0,libres.length-1)];
      s.mon.push({cx:p.x, cy:p.y});
    }
  }
  return {n, sem, salas, jefe};
}

/* ---------- el validador ----------
   Se corre sobre EL MISMO objeto que juega el juego: con dos
   cuentas, el validador aprueba un piso que no existe. */
function validaPiso(P){
  const malos = [];
  /* 1 · todas las salas alcanzables por el grafo de puertas desde la entrada */
  const vis = new Set([0]); const q = [0];
  for (let i = 0; i < q.length; i++){
    const s = P.salas[q[i]];
    for (const k in s.vec){ const j = s.vec[k]; if (!vis.has(j)){ vis.add(j); q.push(j); } }
  }
  if (vis.size !== P.salas.length) malos.push('salas sueltas: ' + (P.salas.length - vis.size));

  /* 2 · una escalera y una sola */
  const escs = P.salas.filter(s => s.esc).length;
  if (escs !== 1) malos.push('escaleras: ' + escs);

  /* 3 · adentro de cada sala: puertas conectadas, y todo lo que hay que
        tocar cae en una celda alcanzable */
  for (const s of P.salas){
    const ks = Object.keys(s.puertas);
    if (!ks.length){ malos.push('sala ' + s.ix + ' sin puertas'); continue; }
    const a0 = dentroDe(ks[0]);
    const v = alcance(s.m, a0.x, a0.y);
    for (const k of ks){
      const d = dentroDe(k);
      if (!v[d.y*SALA_W+d.x]) malos.push('sala ' + s.ix + ' puerta ' + k + ' incomunicada');
    }
    const pide = [];
    for (const e of s.enem) pide.push(['enem ' + e.cl, e.cx, e.cy]);
    if (s.cofre) pide.push(['cofre', s.cofre.cx, s.cofre.cy]);
    if (s.esc)   pide.push(['escalera', s.esc.cx, s.esc.cy]);
    for (const m of s.mon) pide.push(['moneda', m.cx, m.cy]);
    for (const p of pide){
      const k = p[2]*SALA_W + p[1];
      if (s.m[k] || !v[k]) malos.push('sala ' + s.ix + ' ' + p[0] + ' tapado en ' + p[1] + ',' + p[2]);
    }
    if (s.libres < 24) malos.push('sala ' + s.ix + ' con ' + s.libres + ' celdas de pelea');
  }
  return malos;
}

/* auditoria de los diez pisos sobre N semillas */
function auditaPisos(semillas){
  const res = {pisos:0, malos:[], enem:0, salasMin:99, salasMax:0, t0:Date.now()};
  for (let si = 0; si < semillas; si++){
    for (let n = 1; n <= PISOS; n++){
      const P = generaPiso(n, si + 1);
      res.pisos++;
      res.salasMin = Math.min(res.salasMin, P.salas.length);
      res.salasMax = Math.max(res.salasMax, P.salas.length);
      P.salas.forEach(s => res.enem += s.enem.length);
      const m = validaPiso(P);
      if (m.length) res.malos.push('sem ' + (si+1) + ' piso ' + n + ': ' + m.join(' · '));
    }
  }
  res.ms = Date.now() - res.t0;
  return res;
}
