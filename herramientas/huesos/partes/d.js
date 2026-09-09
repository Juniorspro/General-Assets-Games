/* ══════════════════════════════════════════════════════════════════════════
   EL MUNDO — terreno, siembra y validación
   ══════════════════════════════════════════════════════════════════════════
   ESTE ARCHIVO NO TOCA NI EL DOM NI THREE.JS, y es a propósito: se concatena
   con b.js y c.js y se importa en node, así que la geometría del mapa y la
   comprobación de que se puede recorrer se corren SIN NAVEGADOR. Un mundo
   generado y no comprobado es un mundo roto que todavía no se sabe.        */

/* La altura es ruido de tres octavas más un cuenco: el borde sube para que
   el mapa se cierre solo y no haga falta una pared invisible — una pared que
   no se ve es lo que hace que un mundo se lea a maqueta.                    */
function ruido(x, z, f) {
  const xi = Math.floor(x * f), zi = Math.floor(z * f);
  const fx = x * f - xi, fz = z * f - zi;
  const a = azarEn(xi, zi, 7), b = azarEn(xi + 1, zi, 7);
  const c = azarEn(xi, zi + 1, 7), d = azarEn(xi + 1, zi + 1, 7);
  const u = suav(fx), v = suav(fz);
  return mez(mez(a, b, u), mez(c, d, u), v);
}
function H(x, z) {
  let h = ruido(x, z, 0.017) * 6.4 + ruido(x, z, 0.048) * 2.1 + ruido(x, z, 0.135) * 0.62;
  const d = largo2(x, z);
  // el cuenco del borde: nada hasta el 78% del radio y después sube fuerte
  const t = lim((d - MUNDO_R * 0.78) / (MUNDO_R * 0.30), 0, 1);
  h += t * t * 34;
  // y el claro del arranque, plano a propósito: pelear en una pendiente en
  // el primer minuto se lee a que el control está roto
  h *= 1 - 0.86 * Math.exp(-d * d / 190);
  return h;
}
/* la normal sale de la propia H con diferencias centradas: derivarla a mano
   deja dos descripciones del mismo terreno que se separan al tocar una */
function pendiente(x, z) {
  const e = 0.6;
  return Math.abs(H(x + e, z) - H(x - e, z)) + Math.abs(H(x, z + e) - H(x, z - e));
}

/* ── LA SIEMBRA ────────────────────────────────────────────────────────────
   Por reja y no por lista: una lista de mil objetos es un mega de JSON y
   encima no se puede regenerar. Cada celda pregunta a su propio azar.      */
function siembra(sem) {
  const cosas = [];       // {t:'arbol'|'arbusto'|..., v:variante, x,z, esc, giro}
  const solidos = [];     // los que frenan: {x,z,r}
  const n = Math.ceil(MUNDO_R * 2 / CELDA);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const cx = i * CELDA, cz = j * CELDA;
    const d = largo2(cx, cz);
    if (d > MUNDO_R * 0.96) continue;
    const zi = zonaDe(cx, cz), Z = ZONAS[zi];
    for (let k = 0; k < 3; k++) {
      const r0 = azarEn(i, j, k * 11 + 1);
      if (r0 > 0.62 * Z.densi) continue;
      const x = cx + (azarEn(i, j, k * 11 + 2) - 0.5) * CELDA;
      const z = cz + (azarEn(i, j, k * 11 + 3) - 0.5) * CELDA;
      const dd = largo2(x, z);
      if (dd < 9) continue;                       // el claro del arranque queda limpio
      if (pendiente(x, z) > 3.4) continue;        // nada clavado en un barranco
      const r1 = azarEn(i, j, k * 11 + 4);
      let t, esc;
      if (k === 0) {                               // la capa alta: árboles y ruinas
        if (zi === 0) { t = 'arboles'; esc = 3.1 + r1 * 2.6; }
        else if (zi === 1) { t = r1 < 0.55 ? 'ruinas' : 'arboles'; esc = t === 'ruinas' ? 1.5 + r1 * 1.3 : 2.4 + r1 * 1.8; }
        else { t = r1 < 0.72 ? 'ruinas' : 'arboles'; esc = t === 'ruinas' ? 1.3 + r1 * 1.1 : 2.2 + r1 * 1.2; }
      } else if (k === 1) {                        // la capa media: arbustos y rocas
        t = r1 < 0.58 ? 'arbustos' : 'rocas'; esc = 0.85 + r1 * 0.8;
      } else {                                     // la capa baja: plantas y helechos
        t = r1 < 0.5 ? 'plantas' : 'helechos'; esc = 0.55 + r1 * 0.55;
      }
      const v = Math.floor(azarEn(i, j, k * 11 + 5) * 4);
      cosas.push({ t, v, x, z, esc, giro: azarEn(i, j, k * 11 + 6) * 6.283 });
      // SÓLO LO GRANDE FRENA. Un arbusto que frena convierte el bosque en un
      // laberinto invisible, y encima el jugador no puede saber cuál para.
      if (k === 0) solidos.push({ x, z, r: t === 'arboles' ? 0.52 + esc * 0.075 : 0.44 + esc * 0.16 });
    }
  }
  return { cosas, solidos, sem };
}

/* qué clase toca en cada zona. EN UNA FUNCIÓN porque ahora la leen dos sitios
   —el rechazo por radio y el alta— y con la tabla escrita dos veces el bicho
   que se esquiva no es el que se coloca. El bruto no sale en el bosque: ahí
   el jugador todavía no subió de nivel y no tiene con qué. */
function claseDe(zi, r) {
  if (zi === 0) return 'peon';
  if (zi === 1) return r < 0.42 ? 'peon' : (r < 0.82 ? 'lancero' : 'bruto');
  return r < 0.22 ? 'lancero' : 'bruto';
}

/* ── LOS ESQUELETOS DEL MAPA ───────────────────────────────────────────────
   Se siembran POR ZONA con su cupo, y lejos del arranque: aparecer al lado
   de uno no es dificultad, es una emboscada.                                */
function siembraEsq(sem, solidos) {
  const az = semilla(sem ^ 0x5F3A);
  /* LOS SÓLIDOS ENTRAN COMO ARGUMENTO Y NO SE RECALCULAN ACÁ. Con dos llamadas
     a `siembra()` habría dos bosques —el que se dibuja y el que esta función
     esquiva— y el día que cambie una constante de siembra se separan. */
  const S = solidos || siembra(sem).solidos;
  const chocaAlgo = (x, z, r) => {
    for (const s of S) if (dist2(x, z, s.x, s.z) < (s.r + r) * (s.r + r)) return true;
    return false;
  };
  const lista = [];
  ZONAS.forEach((Z, zi) => {
    const r0 = zi === 0 ? 13 : ZONAS[zi - 1].r + 3;
    const r1 = zi === ZONAS.length - 1 ? MUNDO_R * 0.90 : Z.r - 2;
    for (let n = 0; n < Z.mata; n++) {
      let x = 0, z = 0, ok = false;
      for (let i = 0; i < 240 && !ok; i++) {
        const a = az() * 6.283, d = mez(r0, r1, Math.sqrt(az()));
        x = Math.cos(a) * d; z = Math.sin(a) * d;
        ok = zonaDe(x, z) === zi && pendiente(x, z) < 2.8 && largo2(x, z) > 13
             && !chocaAlgo(x, z, ESQ[claseDe(zi, azarEn(i, n, zi))].radio + 0.35);
      }
      if (!ok) continue;
      lista.push({ cl: claseDe(zi, azarEn(0, n, zi)), x, z, zona: zi });
    }
  });
  // el rey, al fondo de la ceniza y en el sitio más lejano que sea plano
  let rx = 0, rz = 0, mejor = -1;
  const azr = semilla(sem ^ 0x1234);
  for (let i = 0; i < 900; i++) {
    const a = azr() * 6.283, d = mez(MUNDO_R * 0.62, MUNDO_R * 0.86, azr());
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (zonaDe(x, z) !== 2 || pendiente(x, z) > 2.0) continue;
    if (chocaAlgo(x, z, ESQ.rey.radio + 1.2)) continue;   // el rey mide 82 cm de radio
    if (d > mejor) { mejor = d; rx = x; rz = z; }
  }
  lista.push({ cl: 'rey', x: rx, z: rz, zona: 2 });
  return lista;
}

/* ── LA AUDITORÍA ──────────────────────────────────────────────────────────
   Lo que comprueba, y por qué cada una:
     · TODO esqueleto tiene que ser ALCANZABLE. Uno sembrado adentro de un
       tronco o detrás de un anillo cerrado de árboles deja la zona sin poder
       limpiarse, y la siguiente no abre nunca: el juego se traba sin fallar.
     · Ningún esqueleto puede NACER METIDO en un sólido.
     · Cada zona tiene que tener su cupo, o el contador del HUD miente.
   El relleno va sobre una reja de 1,5 m con el cuerpo del jugador inflado,
   que es la única forma honesta de preguntar «¿se puede caminar hasta acá?». */
function audita(sem) {
  const m = siembra(sem), es = siembraEsq(sem, m.solidos);
  const P = 1.5, N = Math.ceil(MUNDO_R * 2 / P) + 2;
  const idx = (i, j) => (j + N) * (2 * N + 1) + (i + N);
  const libre = new Uint8Array((2 * N + 1) * (2 * N + 1));
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
    const x = i * P, z = j * P;
    if (largo2(x, z) > MUNDO_R * 0.93) continue;
    if (pendiente(x, z) > 4.6) continue;
    let ok = 1;
    for (const s of m.solidos) { if (dist2(x, z, s.x, s.z) < (s.r + J_RADIO) * (s.r + J_RADIO)) { ok = 0; break; } }
    libre[idx(i, j)] = ok;
  }
  // relleno desde el arranque
  const vis = new Uint8Array(libre.length);
  const cola = [[0, 0]]; vis[idx(0, 0)] = 1;
  let alcanz = 0;
  while (cola.length) {
    const [i, j] = cola.pop(); alcanz++;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < -N || a > N || b < -N || b > N) continue;
      const k = idx(a, b);
      if (vis[k] || !libre[k]) continue;
      vis[k] = 1; cola.push([a, b]);
    }
  }
  const cerca = (x, z) => {
    const i = Math.round(x / P), j = Math.round(z / P);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const k = idx(i + a, j + b);
      if (i + a >= -N && i + a <= N && j + b >= -N && j + b <= N && vis[k]) return true;
    }
    return false;
  };
  const malos = [], dentro = [];
  es.forEach((e, n) => {
    if (!cerca(e.x, e.z)) malos.push(n);
    for (const s of m.solidos) if (dist2(e.x, e.z, s.x, s.z) < s.r * s.r) { dentro.push(n); break; }
  });
  const porZona = [0, 0, 0]; es.forEach(e => porZona[e.zona]++);
  let libres = 0; for (let k = 0; k < libre.length; k++) libres += libre[k];
  return {
    sem, cosas: m.cosas.length, solidos: m.solidos.length, esqueletos: es.length,
    porZona, celdasLibres: libres, alcanzables: alcanz,
    sueltas: libres - alcanz,
    esqInalcanzables: malos, esqDentroDeAlgo: dentro,
    cupoOk: porZona.every((c, i) => c >= ZONAS[i].mata - 1),
    ok: malos.length === 0 && dentro.length === 0 && porZona.every((c, i) => c >= ZONAS[i].mata - 1),
  };
}
