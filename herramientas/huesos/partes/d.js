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

/* qué clase toca en cada zona. EN UNA FUNCIÓN porque la leen tres sitios —el
   rechazo por radio, el alta y la auditoría— y con la tabla escrita tres veces
   el bicho que se esquiva no es el que se coloca. El bruto no sale en el
   bosque: ahí el jugador todavía no subió de nivel y no tiene con qué.
   LA PRESIÓN (0 la primera oleada de la zona, 1 la última) EMPUJA LA MEZCLA
   HACIA LO PESADO, y sin ella la oleada 3 es la oleada 1 con dos bichos más:
   la escalera existe en el contador del HUD y no en la pelea.              */
function claseDe(zi, r, pres) {
  const p = pres || 0;
  if (zi === 0) return r < 0.94 - p * 0.36 ? 'peon' : 'lancero';
  if (zi === 1) return r < 0.42 - p * 0.22 ? 'peon' : (r < 0.86 - p * 0.22 ? 'lancero' : 'bruto');
  return r < 0.30 - p * 0.22 ? 'lancero' : 'bruto';
}

/* ── QUÉ TRAE CADA OLEADA ──────────────────────────────────────────────────
   La COMPOSICIÓN es determinista por semilla y el SITIO no, y las dos cosas
   tienen que ser así. Si la composición se sorteara en vivo, dos partidas con
   la misma semilla no se podrían comparar y el auto-jugador dejaría de probar
   nada; y si el sitio viniera pre-sorteado, una oleada caería encima del
   jugador —aparecer al lado de uno no es dificultad, es una emboscada.     */
function composicionOla(zi, oi, sem) {
  const n = ZONAS[zi].olas[oi];
  if (n === 'rey') return ['rey'];
  /* LA PRIMERA OLEADA DEL BOSQUE ES TODA DE PEONES, y es a propósito: es el
     primer minuto del juego y ahí no se enseña nada con variedad, se enseña
     que el combo pega y que el esquive salva. */
  if (zi === 0 && oi === 0) return new Array(n).fill('peon');
  const az = semilla((sem ^ 0x0A1E) + zi * 977 + oi * 131);
  const pres = ZONAS[zi].olas.length > 1 ? oi / (ZONAS[zi].olas.length - 1) : 0;
  const out = [];
  for (let i = 0; i < n; i++) out.push(claseDe(zi, az(), pres));
  /* ── UN TERCIO DE BRUTOS Y NI UNO MÁS ──────────────────────────────────
     Lo que hace difícil una oleada tiene que ser LA MEZCLA y no una clase
     repetida. Sin este tope la ceniza salía `blbbbl` y `blbbbbl` —cuatro y
     cinco brutos juntos— y eso no es una pelea, es una ejecución: medido con
     el auto-jugador, de los golpes que se comía en toda la partida el bruto
     le ponía 7 de 15, 12 de 18 y 12 de 22, y moría siempre en la primera
     oleada de la ceniza. Los que sobran bajan a lancero, que es el escalón de
     abajo y conserva el alcance largo que hace que la oleada siga pidiendo
     esquivar. Va como REGLA y no como tabla por zona: así escala solo el día
     que una oleada cambie de tamaño.                                       */
  const tope = Math.max(1, Math.ceil(n / 3));
  let br = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== 'bruto') continue;
    if (++br > tope) out[i] = 'lancero';
  }
  /* la última oleada de una zona trae un bruto sí o sí: es el escalón que
     avisa que la zona se está por cerrar. VA DESPUÉS DEL TOPE, porque es un
     piso y no un techo — puesto antes, el tope se lo podría llevar. */
  if (oi === ZONAS[zi].olas.length - 1 && zi > 0 && out.indexOf('bruto') < 0) out[0] = 'bruto';
  return out;
}

/* ── DÓNDE CAE UN ESQUELETO DE UNA OLEADA ──────────────────────────────────
   Cuatro condiciones son las mismas de siempre —dentro de la zona, en terreno
   pisable, fuera del claro del arranque, fuera de un tronco— y la quinta sólo
   existe para las oleadas: A DISTANCIA DEL JUGADOR. Más cerca de `OLA_R0` es
   una emboscada; más lejos de `OLA_R1` es una oleada que no llega nunca y hay
   que ir a buscarla, que es exactamente lo que una oleada no es.
   LA SEGUNDA PASADA AFLOJA EL BORDE DE AFUERA y no el de adentro: en la
   ceniza, con el jugador en el centro, el anillo entero puede caer fuera de
   la zona y con una sola pasada la oleada no saldría. Lo que NO se afloja
   nunca es la distancia mínima ni el choque.
   Devuelve null si no encontró: inventar un punto sin comprobar es sembrar
   un esqueleto adentro de un árbol, y esa zona ya no se puede limpiar.    */
function puntoOla(zi, az, solidos, jx, jz, radio) {
  const Z = ZONAS[zi];
  const r0 = zi === 0 ? 13 : ZONAS[zi - 1].r + 3;
  const r1 = zi === ZONAS.length - 1 ? MUNDO_R * 0.90 : Z.r - 2;
  /* ── CUATRO PASES, Y LO QUE SE AFLOJA ES EL SUELO, NO LA DISTANCIA ───────
     La oleada la define QUÉ VIENE y no sobre qué tierra nace. Nada obliga al
     jugador a quedarse en la ceniza: puede volverse caminando al bosque, y
     ahí no existe UN SOLO punto que esté a la vez adentro de la ceniza —que
     empieza a 76 m del centro— y a menos de 66 del jugador. Medido con la
     auditoría desde el origen: once esqueletos nacían CONGELADOS, o sea fuera
     del radio en que `esqCerca` los piensa, y la oleada no terminaba nunca.
     Así que los dos últimos pases sueltan la zona y conservan el anillo: son
     brutos de la ceniza caminando por el bosque, que es exactamente lo que
     hace algo que te está cazando. `e.zona` sigue siendo la de la OLEADA, así
     que `esqVivos(ZONA_ACT)` los cuenta igual y la zona cierra donde debe.
     Lo que NUNCA se afloja es la distancia mínima ni el choque: un esqueleto
     que nace encima del jugador o adentro de una piedra no es un enemigo. */
  for (let pase = 0; pase < 4; pase++) {
    const enZona = pase < 2, cerca = pase === 0 || pase === 2;
    const q0 = enZona ? r0 : 13, q1 = enZona ? r1 : MUNDO_R * 0.90;
    for (let i = 0; i < 260; i++) {
      const a = az() * 6.283, d = mez(q0, q1, Math.sqrt(az()));
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (enZona && zonaDe(x, z) !== zi) continue;
      if (pendiente(x, z) > 2.8) continue;
      if (largo2(x, z) < 13) continue;
      const dj = dist2(x, z, jx, jz);
      if (dj < OLA_R0 * OLA_R0) continue;
      if (cerca && dj > OLA_R1 * OLA_R1) continue;
      if (!cerca && dj > OLA_R_FRIO * OLA_R_FRIO) continue;
      let choca = false;
      for (const s of solidos) {
        const R = s.r + radio + 0.35;
        if (dist2(x, z, s.x, s.z) < R * R) { choca = true; break; }
      }
      if (!choca) return { x, z };
    }
  }
  return null;
}

/* EL REY NO CAE EN EL ANILLO: se levanta AL FONDO DE LA CENIZA, en el sitio
   plano más lejano que haya. Que haya que caminar hasta él es la mitad de que
   se lea a jefe — una oleada de uno que aparece a veinte metros es un bruto
   grande. Y su sitio sale de la semilla, así que la misma semilla lo pone
   siempre en el mismo lugar y se lo puede fotografiar. */
function puntoRey(sem, solidos) {
  let rx = 0, rz = 0, mejor = -1;
  const az = semilla(sem ^ 0x1234);
  for (let i = 0; i < 900; i++) {
    const a = az() * 6.283, d = mez(MUNDO_R * 0.62, MUNDO_R * 0.86, az());
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (zonaDe(x, z) !== 2 || pendiente(x, z) > 2.0) continue;
    let choca = false;
    for (const s of solidos) {
      const R = s.r + ESQ.rey.radio + 1.2;
      if (dist2(x, z, s.x, s.z) < R * R) { choca = true; break; }
    }
    if (!choca && d > mejor) { mejor = d; rx = x; rz = z; }
  }
  return { x: rx, z: rz };
}

/* ── LA OLEADA COMPLETA, EN PUNTOS ─────────────────────────────────────────
   Una llamada devuelve la lista lista para dar de alta. La usan las DOS cosas
   que tienen que coincidir: el juego, que suelta la oleada de verdad, y la
   auditoría, que comprueba que se pueda soltar. Con dos caminos, la auditoría
   estaría aprobando un juego que no existe.
   Lo que NO se puede encontrar se descarta y se informa: una oleada de siete
   que sale de seis se sigue pudiendo limpiar; una que devuelve un punto
   inventado adentro de un tronco deja la zona trabada para siempre.        */
function oleadaEn(zi, oi, sem, solidos, jx, jz) {
  const comp = composicionOla(zi, oi, sem);
  const az = semilla((sem ^ 0x7C3E) + zi * 613 + oi * 89 + ((jx * 31 + jz * 17) | 0));
  const out = [];
  let fallados = 0;
  for (const cl of comp) {
    if (cl === 'rey') { const r = puntoRey(sem, solidos); out.push({ cl, x: r.x, z: r.z, zona: zi }); continue; }
    const pt = puntoOla(zi, az, solidos, jx, jz, ESQ[cl].radio);
    if (!pt) { fallados++; continue; }
    out.push({ cl, x: pt.x, z: pt.z, zona: zi });
  }
  out.fallados = fallados;
  return out;
}

/* ── LA AUDITORÍA ──────────────────────────────────────────────────────────
   Lo que comprueba, y por qué cada una:
     · CADA OLEADA se puede soltar entera. Una que devuelve seis de siete deja
       la zona más fácil; una que devuelve cero deja el juego trabado sin
       fallar, porque el contador nunca llega a cero por el otro lado.
     · TODO esqueleto de toda oleada es ALCANZABLE. Uno detrás de un anillo
       cerrado de árboles deja la zona sin poder limpiarse.
     · Ninguno NACE METIDO en un sólido.
     · Ninguno cae a menos de `OLA_R0` del jugador — que es lo que separa una
       oleada de una emboscada, y es lo único que esta versión agrega.
   Y SE AUDITA CON EL JUGADOR DONDE VA A ESTAR DE VERDAD, o sea en el borde
   de adentro de la zona que se abre: auditando siempre desde el origen, el
   anillo de la ceniza cae entero fuera de alcance y la prueba mide la segunda
   pasada en vez de la primera.
   El relleno va sobre una reja de 1,5 m con el cuerpo del jugador inflado,
   que es la única forma honesta de preguntar «¿se puede caminar hasta acá?». */
function audita(sem) {
  const m = siembra(sem);
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

  const olas = [];
  let malos = 0, dentro = 0, cerquita = 0, fallados = 0, total = 0, frios = 0;
  /* ── SE AUDITA DESDE DOS SITIOS, Y EL SEGUNDO ES EL QUE ENCUENTRA COSAS ──
     El normal es el borde de adentro de la zona, que es de donde el jugador
     viene. Pero NADA LO OBLIGA A QUEDARSE: puede volverse caminando al bosque
     con la ceniza abierta, y ahí la oleada tiene que caer igual y tiene que
     poder llegar. Auditando sólo el caso bueno, el tercer pase de `puntoOla`
     —el que existe justamente para eso— no se ejerce nunca.                */
  const desde = [];
  ZONAS.forEach((Z, zi) => { desde.push([zi, zi === 0 ? 0 : ZONAS[zi - 1].r + 4, 0, 0]); if (zi > 0) desde.push([zi, 0, 0, 1]); });
  desde.forEach(([zi, jx, jz, dup]) => {
    const Z = ZONAS[zi];
    Z.olas.forEach((_, oi) => {
      const L = oleadaEn(zi, oi, sem, m.solidos, jx, jz);
      fallados += L.fallados;
      /* el total es EL DE UNA PARTIDA: el segundo mirador vuelve a sembrar las
         mismas oleadas y sumarlas dos veces da un número que nadie va a jugar */
      if (!dup) total += composicionOla(zi, oi, sem).length;
      for (const e of L) {
        if (!cerca(e.x, e.z)) malos++;
        for (const s of m.solidos) if (dist2(e.x, e.z, s.x, s.z) < s.r * s.r) { dentro++; break; }
        if (e.cl !== 'rey' && dist2(e.x, e.z, jx, jz) < OLA_R0 * OLA_R0) cerquita++;
        if (e.cl !== 'rey' && dist2(e.x, e.z, jx, jz) > OLA_R_FRIO * OLA_R_FRIO) frios++;
      }
      if (!dup) olas.push({ z: zi, o: oi, n: L.length, cl: L.map(e => e.cl[0]).join('') });
    });
  });
  let libres = 0; for (let k = 0; k < libre.length; k++) libres += libre[k];
  return {
    sem, cosas: m.cosas.length, solidos: m.solidos.length,
    oleadas: olas.length, esqueletos: total, olas,
    celdasLibres: libres, alcanzables: alcanz, sueltas: libres - alcanz,
    esqInalcanzables: malos, esqDentroDeAlgo: dentro, esqEncima: cerquita, esqSinSitio: fallados,
    esqFrios: frios,
    ok: malos === 0 && dentro === 0 && cerquita === 0 && fallados === 0 && frios === 0
        && olas.every(o => o.n === composicionOla(o.z, o.o, sem).length),
  };
}
