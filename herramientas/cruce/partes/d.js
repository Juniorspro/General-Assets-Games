
/* ══════════════════════ EL MUNDO Y LA SIMULACION ══════════════════════
   ── SIN DOM Y SIN three: ESTE ARCHIVO CORRE EN NODE ──
   Todo lo que el juego DECIDE vive aca: como se genera cada fila, donde estan
   los autos, cuando mata el tren, que hace el auto-jugador. Asi se puede correr
   mil partidas en un segundo en node y saber si el mundo se puede cruzar ANTES
   de dibujar nada. Un mundo generado y no jugado es un mundo roto que todavia
   no se sabe. */
const DT = 1/60;
const CICLO = 26;               /* el carril de una ruta o un rio se repite cada 26 columnas */
const RETRASO = 7;              /* cuantas filas atras del maximo va la linea de muerte */
const SALTO_BUF = 0.13;         /* un salto pedido mientras se salta se guarda: es lo que hace
                                   que el juego responda en vez de tragarse el toque */

/* ══════════ EL PROGRESO ══════════ */
const PROG = { monedas: 0, record: 0, pieles: ['carpincho'], piel: 'carpincho', partidas: 0, filasTot: 0 };
const CLAVE_SAVE = 'cruce_v1';
function guardaProg(){
  try { localStorage.setItem(CLAVE_SAVE, JSON.stringify({ ...PROG, lang: LANG, cal: CALIDAD, vm: VOL_MUS, vf: VOL_FX })); } catch(e){}
}
function cargaProg(){
  try {
    const s = localStorage.getItem(CLAVE_SAVE); if (!s) return false;
    const o = JSON.parse(s);
    for (const k of ['monedas', 'record', 'pieles', 'piel', 'partidas', 'filasTot']) if (o[k] != null) PROG[k] = o[k];
    if (o.lang) LANG = o.lang; if (o.cal && CALIDADES[o.cal]) CALIDAD = o.cal;
    if (o.vm != null) VOL_MUS = o.vm; if (o.vf != null) VOL_FX = o.vf;
    return true;
  } catch(e){ return false; }
}
function borraProg(){
  PROG.monedas = 0; PROG.record = 0; PROG.pieles = ['carpincho']; PROG.piel = 'carpincho';
  PROG.partidas = 0; PROG.filasTot = 0; guardaProg();
}

/* ══════════ LA GENERACION DE UNA FILA ══════════
   ── LAS FILAS SE GENERAN UNA VEZ Y SE GUARDAN ──
   Cada fila se arma cuando hace falta y queda en `MUNDO.filas[f]`: los autos de
   una ruta son un patron ciclico —posicion inicial y separacion— asi que no hay
   nada que simular fuera de la vista y volver a mirar una fila da lo mismo.

   ── Y LAS REGLAS DURAS SON DE SECUENCIA, NO DE FILA ──
   Despues de una via siempre hay tierra firme: un tren te mata sin que puedas
   pararte a mirar, y encadenar via con via es pedirle al jugador que adivine.
   Tampoco mas de tres rios ni mas de cuatro rutas seguidas. */
const MUNDO = { filas: [], sem: 1 };
function tipoFila(f){
  if (f < 4) return 'pasto';
  const d = dif(f);
  const ant = MUNDO.filas[f - 1], ant2 = MUNDO.filas[f - 2], ant3 = MUNDO.filas[f - 3];
  const t1 = ant && ant.tipo, t2 = ant2 && ant2.tipo, t3 = ant3 && ant3.tipo;
  if (t1 === 'via') return az() < 0.5 ? 'pasto' : 'arena';
  const p = { pasto: lerp(0.34, 0.19, d), ruta: lerp(0.30, 0.42, d), rio: lerp(0.13, 0.22, d),
              via: lerp(0.03, 0.11, d), arena: lerp(0.20, 0.06, d) };
  /* ── LOS PRIMEROS METROS NO PUEDEN SER UNA EMBOSCADA ──
     Cuatro filas de pasto y despues cualquier cosa dejaba rios en la fila 4:
     medido sobre 300 semillas, el auto-jugador se ahogaba en la 4 antes de
     haber tocado la pantalla dos veces. La ruta se aprende sola —se toca y se
     espera—; el rio pide entender que hay que subirse a algo que se mueve, y
     eso no se aprende en dos segundos. Hasta la fila 8, ni rio ni via. */
  if (f < 8){ p.rio = 0; p.via = 0; }
  if (t1 === 'rio' && t2 === 'rio' && t3 === 'rio') p.rio = 0;
  if (t1 === 'ruta' && t2 === 'ruta' && t3 === 'ruta' && ant3 && MUNDO.filas[f - 4] && MUNDO.filas[f - 4].tipo === 'ruta') p.ruta = 0;
  if (t1 === 'via') p.via = 0;
  let s = 0; for (const k in p) s += p[k];
  let r = az()*s;
  for (const k in p){ r -= p[k]; if (r <= 0) return k; }
  return 'pasto';
}
function generaFila(f){
  if (MUNDO.filas[f]) return MUNDO.filas[f];
  const d = dif(f), tipo = tipoFila(f);
  const F = { f, tipo, moviles: [], arboles: [], moneda: null, dir: az() < 0.5 ? -1 : 1, vel: 0, tren: null };
  if (tipo === 'pasto'){
    /* ── LOS ARBOLES NO PUEDEN CERRAR EL PASO ──
       Se sortean hasta cuatro columnas y despues se comprueba contra las libres
       de la fila anterior: si la interseccion quedara vacia, se saca un arbol.
       Sin eso el mundo genera paredes y el juego se termina solo. */
    const n = f < 3 ? 0 : azi(0, Math.round(1 + d*3));
    const cand = [];
    for (let i = 0; i < n*3 && cand.length < n; i++){ const c = azi(-COLS, COLS); if (!cand.includes(c)) cand.push(c); }
    F.arboles = cand.slice(0, Math.min(n, 2*COLS - 1));
    const ant = MUNDO.filas[f - 1];
    if (ant){
      const libAnt = librasDe(ant), lib = () => librasDe(F);
      while (F.arboles.length && !lib().some(c => libAnt.includes(c))) F.arboles.pop();
    }
    if (az() < 0.24){ const l = librasDe(F); F.moneda = l[azi(0, l.length - 1)]; }
    /* los arboles llevan su tamano y su giro para que no se vean copiados */
    F.arbT = F.arboles.map(() => ({ e: azr(0.82, 1.25), g: azr(0, 6.28), tipo: az() < 0.25 ? 'piedra' : 'arbol' }));
  } else if (tipo === 'arena'){
    if (az() < 0.30){ F.moneda = azi(-COLS, COLS); }
  } else if (tipo === 'ruta'){
    F.vel = (1.7 + d*2.6)*azr(0.85, 1.15)*F.dir;
    const clases = ['auto', 'auto', 'auto', 'camion', 'colectivo'];
    /* ── EL HUECO ENTRE AUTOS SALE DE UNA CUENTA, NO DE UN NUMERO ──
       Cruzar una fila cuesta el salto (0,155 s) mas el tiempo hasta poder saltar
       otra vez: unos 0,55 s. Con velocidad `v` columnas por segundo, para que la
       ventana exista el hueco tiene que medir por lo menos `v·0,62` columnas, y
       nunca menos de 2,9: con velocidad baja el hueco chico igual se cruza, pero
       deja de leerse como hueco. */
    const v = Math.abs(F.vel), hMin = Math.max(2.9, v*0.62);
    const piezas = [];
    let tot = 0, guard = 0;
    while (tot < CICLO && guard++ < 40){
      const k = clases[azi(0, clases.length - 1)], V = VEHIS[k];
      const g = hMin*azr(1.0, 1.9);
      piezas.push({ k, largo: V.largo, hueco: g }); tot += V.largo + g;
    }
    siembraCiclo(F, piezas, tot);
    if (az() < 0.14) F.moneda = azi(-COLS, COLS);
  } else if (tipo === 'rio'){
    F.vel = (0.75 + d*1.5)*azr(0.85, 1.15)*F.dir;
    /* ── EL RIO SE MIDE POR COBERTURA, NO POR CANTIDAD ──
       Lo que hace jugable un rio es que siempre pase un camalote por donde uno
       esta: se siembran hasta cubrir mas de la mitad del ciclo con huecos de
       1,1 a 2,6 columnas, que es menos que un salto. Con huecos grandes el rio
       deja de ser una decision y pasa a ser una espera. */
    const piezas = [];
    let tot = 0, guard = 0;
    while (tot < CICLO && guard++ < 40){
      const largo = azr(2.0, 4.0), g = azr(1.1, 2.6);
      piezas.push({ k: 'camalote', largo, hueco: g }); tot += largo + g;
    }
    siembraCiclo(F, piezas, tot);
    if (az() < 0.10) F.moneda = azi(-COLS, COLS);
  } else if (tipo === 'via'){
    /* el tren: espera, avisa 1,3 s y pasa. El ciclo se acorta con la dificultad */
    F.tren = { ciclo: azr(5.6, 8.2) - d*1.6, fase: azr(0, 5), estado: 'espera', x: 0 };
  }
  MUNDO.filas[f] = F;
  return F;
}
/* ── LA VUELTA TIENE QUE CERRAR, Y ESE FUE EL DEFECTO MAS CARO ──
   Sembrar «hasta pasar CICLO» y despues envolver con OTRO periodo deja un hueco
   entre el ultimo movil y el primero: medido, doce columnas vacias en el rio, que
   a 0,75 columnas por segundo son DIECISEIS SEGUNDOS sin un solo camalote. El
   auto-jugador se quedaba parado once segundos y terminaba tirandose al agua
   porque la linea de muerte lo empujaba. Y no se ve como «el rio es dificil»: se
   ve como que el juego se colgo.
   La salida no es tapar el hueco sino que no pueda existir: se arman las piezas
   con sus huecos y se ESCALAN los huecos para que la suma sea exactamente CICLO.

   ── Y SE TIRA LA ULTIMA PIEZA ANTES DE ESCALAR, QUE NO ES UN DETALLE ──
   Sembrando hasta pasarse y escalando, el factor puede quedar MENOR que uno y
   los huecos se achican: medido, un hueco de 2,9 columnas quedaba en 1,3 y la
   ventana para cruzar bajaba de un segundo y medio a 0,67 — o sea que la regla
   que garantiza que la ruta se pueda cruzar se anulaba sola. Tirando la ultima
   pieza el total queda POR DEBAJO de CICLO, asi que el factor es siempre mayor
   que uno y los huecos solo pueden crecer. */
function siembraCiclo(F, piezas, tot){
  if (piezas.length > 2){ tot -= piezas[piezas.length - 1].largo + piezas[piezas.length - 1].hueco; piezas.pop(); }
  const largos = piezas.reduce((a, p) => a + p.largo, 0);
  const huecos = piezas.reduce((a, p) => a + p.hueco, 0);
  const k = huecos > 0 ? Math.max(1, (CICLO - largos)/huecos) : 1;
  let x = azr(0, CICLO);
  for (const p of piezas){
    F.moviles.push({ x0: ((x % CICLO) + CICLO) % CICLO, k: p.k, largo: p.largo });
    x += p.largo + p.hueco*k;
  }
}
function librasDe(F){
  const l = [];
  for (let c = -COLS; c <= COLS; c++) if (!F.arboles || !F.arboles.includes(c)) l.push(c);
  return l;
}
/* la posicion de un movil en el instante t: el patron es ciclico, asi que mirar
   una fila vieja o una nueva cuesta lo mismo y da lo mismo */
function xMovil(F, m, t){
  const x = ((m.x0 + F.vel*t) % CICLO + CICLO) % CICLO;
  return x - CICLO/2;
}
function bloqueado(f, c){
  const F = generaFila(f);
  return (F.arboles || []).includes(c);
}

/* ══════════ EL ESTADO DE UNA PARTIDA ══════════ */
let RUN = null;
function arrancaRun(semilla){
  MUNDO.filas = []; MUNDO.sem = (semilla | 0) || Math.floor(Math.random()*1e9);
  sem(MUNDO.sem);
  for (let i = 0; i < 6; i++) generaFila(i);
  RUN = {
    t: 0, tk: 0, fase: 'juega', fin: null,
    x: 0, fila: 0, filaMax: 0,
    sx: 0, sf: 0,                 /* la posicion dibujada, interpolada */
    salta: false, ts: 0, desdeX: 0, desdeF: 0, haciaX: 0, haciaF: 0, mira: 0,
    buf: null, bufT: 0,
    camL: -RETRASO, monedas: 0, eventos: [], quieto: 0,
    sacude: 0, avisoTren: 0
  };
  return RUN;
}

/* ── UN SALTO ──
   `dx` de costado, `df` adelante (1) o atras (−1). Si el destino esta tapado por
   un arbol el salto no ocurre: el carpincho se queda y no se pierde el turno.
   Y la fila de destino se toma en el ACTO —la colision se evalua ahi mientras
   dura el vuelo— porque un salto en el que todavia se puede cambiar de idea
   convierte cada decision en una apuesta que el jugador no puede leer. */
function pideSalto(dx, df){
  const R = RUN; if (!R || R.fase !== 'juega') return false;
  if (R.salta){ R.buf = [dx, df]; R.bufT = SALTO_BUF; return false; }
  return haceSalto(dx, df);
}
function haceSalto(dx, df){
  const R = RUN;
  const cx = cl(Math.round(R.x) + dx, -COLS, COLS);
  const cf = Math.max(0, R.fila + df);
  if (cf === R.fila && cx === Math.round(R.x)) return false;
  if (bloqueado(cf, cx)) return false;
  R.desdeX = R.x; R.desdeF = R.fila; R.haciaX = cx; R.haciaF = cf;
  R.salta = true; R.ts = 0;
  R.x = cx; R.fila = cf;
  R.mira = dx !== 0 ? (dx > 0 ? Math.PI/2 : -Math.PI/2) : (df < 0 ? Math.PI : 0);
  R.quieto = 0;
  R.eventos.push('salto');
  for (let i = 0; i <= 10; i++) generaFila(cf + i);
  if (cf > R.filaMax){
    R.filaMax = cf;
    const F = MUNDO.filas[cf];
    if (F.moneda === cx){ F.moneda = null; R.monedas++; R.eventos.push('moneda'); }
  } else {
    const F = MUNDO.filas[cf];
    if (F.moneda === cx){ F.moneda = null; R.monedas++; R.eventos.push('moneda'); }
  }
  return true;
}

/* ══════════ UN PASO ══════════
   ── EL ATERRIZAJE NO ES UN PASO APARTE ──
   Al terminar el vuelo el cuerpo ya esta en la fila de destino —se asigno al
   pedir el salto— asi que la prueba del rio y la del auto que corren mas abajo
   en ESTE mismo paso son las del sitio nuevo. Un `alAterrizar` con sus propias
   pruebas seria una segunda cuenta que se desincroniza. */
function paso(){
  const R = RUN; if (!R || R.fase !== 'juega') return;
  R.tk++; R.t += DT;
  const F = generaFila(R.fila);
  /* el salto en vuelo */
  if (R.salta){
    R.ts += DT;
    const k = Math.min(1, R.ts/SALTO_T);
    R.sx = lerp(R.desdeX, R.haciaX, k); R.sf = lerp(R.desdeF, R.haciaF, k);
    if (k >= 1){ R.salta = false; R.sx = R.x; R.sf = R.fila; R.eventos.push('pisa'); }
  } else {
    R.sx = R.x; R.sf = R.fila;
    R.quieto += DT;
  }
  /* el camalote arrastra: quedarse quieto en el rio YA es moverse, y eso es lo
     que hace que un rio se sienta distinto de una ruta */
  if (F.tipo === 'rio' && !R.salta){
    const m = camaloteBajo(F, R.x, R.t);
    if (m){ R.x += F.vel*DT; R.sx = R.x; if (Math.abs(R.x) > COLS + 0.9){ muere('deriva'); return; } }
    else { muere('agua'); return; }
  }
  /* los trenes de todas las vias a la vista */
  for (let i = -2; i <= 14; i++){
    const G = MUNDO.filas[R.fila + i]; if (!G || G.tipo !== 'via') continue;
    pasoTren(G, R.t);
  }
  /* ── LOS CHOQUES SE MIRAN CON EL CUERPO EN EL PISO, NO EN EL AIRE ──
     La fila de destino se toma al PEDIR el salto, asi que sin esta guarda la
     colision corre durante todo el vuelo contra una fila donde el carpincho
     todavia no esta: medido, las veintinueve muertes por auto del auto-jugador
     pasaban a 0,02 s de saltar, contra un auto que para el aterrizaje ya no iba a
     estar ahi. Y `seguroEn` mira justamente desde el aterrizaje en adelante, o
     sea que el juego y la prueba estaban midiendo cosas distintas. */
  if (!R.salta){
    if (F.tipo === 'ruta'){
      for (const m of F.moviles){
        const x = xMovil(F, m, R.t);
        if (Math.abs(x - R.sx) < m.largo/2 + 0.34){ muere('auto'); return; }
      }
    } else if (F.tipo === 'via' && F.tren && F.tren.estado === 'pasa'){
      if (Math.abs(F.tren.x - R.sx) < TREN.largo/2){ muere('tren'); return; }
    }
  }
  /* el aviso del tren: la fila propia o la de adelante */
  R.avisoTren = 0;
  for (const G of [F, MUNDO.filas[R.fila + 1]]){
    if (G && G.tipo === 'via' && G.tren && G.tren.estado === 'aviso') R.avisoTren = 1;
  }
  /* ── LA LINEA DE MUERTE ──
     Avanza sola y ademas persigue al maximo alcanzado: el que avanza nunca la
     ve, el que se queda la ve llegar. Es lo unico que impide que la partida sea
     esperar el hueco perfecto cien veces. */
  if (R.filaMax > 2){
    const d = dif(R.filaMax);
    R.camL += (0.42 + d*0.62)*DT;
  }
  R.camL = Math.max(R.camL, R.filaMax - RETRASO);
  if (R.fila < R.camL - 0.4){ muere('carancho'); return; }
  R.sacude = Math.max(0, R.sacude - DT*3);
  /* ── EL SALTO GUARDADO SE CONSUME AL FINAL DEL PASO ──
     Consumido antes de los choques, un jugador que encadena saltos estaria en el
     aire en todos los cuadros y no se lo podria atropellar nunca. Al final, cada
     aterrizaje paga exactamente una comprobacion. */
  if (R.bufT > 0){ R.bufT -= DT; if (!R.salta && R.buf){ const b = R.buf; R.buf = null; R.bufT = 0; haceSalto(b[0], b[1]); } }
}
function pasoTren(G, t){
  const T = G.tren, c = T.ciclo, fase = ((t + T.fase) % c);
  const antes = T.estado;
  if (fase < c - 1.85) T.estado = 'espera';
  else if (fase < c - 0.55) T.estado = 'aviso';
  else { T.estado = 'pasa'; }
  if (T.estado === 'pasa'){
    const k = (fase - (c - 0.55))/0.55;
    T.x = G.dir > 0 ? lerp(-COLS - TREN.largo, COLS + TREN.largo, k) : lerp(COLS + TREN.largo, -COLS - TREN.largo, k);
  } else T.x = 999;
  if (antes !== T.estado && T.estado === 'aviso' && RUN) RUN.eventos.push('aviso');
  if (antes !== T.estado && T.estado === 'pasa' && RUN) RUN.eventos.push('tren');
}
function camaloteBajo(F, x, t){
  for (const m of F.moviles){
    const mx = xMovil(F, m, t);
    if (Math.abs(x - mx) < m.largo/2 - 0.05) return m;
  }
  return null;
}
function muere(k){
  const R = RUN; if (!R || R.fase !== 'juega') return;
  R.fase = 'fin'; R.fin = k; R.eventos.push('muere:' + k);
  R.pts = R.filaMax;
  /* ── LAS MONEDAS SON LAS QUE SE JUNTARON MAS UNA POR FILA ──
     Nada de una formula: lo que se junto se ve, y por eso el jugador entiende de
     donde salio el numero. Las filas pagan poco para que juntar valga la pena. */
  R.ganado = R.monedas*5 + Math.floor(R.filaMax*0.6);
  PROG.monedas += R.ganado; PROG.partidas++; PROG.filasTot += R.filaMax;
  R.nuevoRec = R.filaMax > PROG.record;
  if (R.nuevoRec) PROG.record = R.filaMax;
  R.nuevas = [];
  for (const P of PIELES){
    if (P.desb.pts != null && PROG.record >= P.desb.pts && !PROG.pieles.includes(P.id)){ PROG.pieles.push(P.id); R.nuevas.push(P.id); }
  }
  guardaProg();
}

/* ══════════ LA TIENDA ══════════ */
function compraPiel(id){
  const P = PIELES.find(p => p.id === id);
  if (PROG.pieles.includes(id)) return 'ya';
  if (P.desb.pts != null) return 'bloq';
  if (PROG.monedas < P.desb.mon) return 'falta';
  PROG.monedas -= P.desb.mon; PROG.pieles.push(id); guardaProg(); return 'ok';
}
function eligePiel(id){ if (PROG.pieles.includes(id)){ PROG.piel = id; guardaProg(); return 'ok'; } return 'no'; }

/* ══════════ ES SEGURO IR AHI ══════════
   La usan el auto-jugador y la auditoria: dado un destino y un horizonte de
   tiempo, dice si se puede estar ahi sin morirse. Una sola cuenta para las dos
   cosas — con dos, la auditoria aprobaria un juego que no existe. */
function seguroEn(f, x, hor){
  if (f < 0) return false;
  const F = generaFila(f);
  if ((F.arboles || []).includes(Math.round(x))) return false;
  const t = RUN ? RUN.t : 0;
  if (F.tipo === 'ruta'){
    for (const m of F.moviles){
      for (let s = 0; s <= hor; s += 0.05){
        const mx = xMovil(F, m, t + s + SALTO_T);
        if (Math.abs(mx - x) < m.largo/2 + 0.55) return false;
      }
    }
    return true;
  }
  if (F.tipo === 'rio'){
    const m = camaloteBajo(F, x, t + SALTO_T);
    if (!m) return false;
    /* y que el camalote no este por sacarte del mapa */
    const mx = xMovil(F, m, t + SALTO_T + hor);
    return Math.abs(mx) < COLS + 1.2;
  }
  if (F.tipo === 'via'){
    const T = F.tren, c = T.ciclo;
    let fase = ((t + SALTO_T + T.fase) % c);
    const falta = (c - 0.55) - fase;
    return falta > hor + 0.35 || falta < -0.55;
  }
  return true;
}

/* ══════════ EL AUTO-JUGADOR ══════════
   ── AVANZA SI PUEDE, SE CORRE SI NO, Y SI LA LINEA LO ALCANZA SE JUEGA ──
   No es una politica optima: es la de una persona. Lo que prueba es que el
   mundo generado se puede cruzar, y por eso usa `seguroEn`, que es la misma
   cuenta que el juego. */
function botDecide(){
  const R = RUN; if (!R || R.salta) return null;
  const c = Math.round(R.x);
  const apura = R.fila < R.camL + 2.2;
  /* ── EL HORIZONTE DEPENDE DE ADONDE SE VA, Y ESO ES LA MITAD DEL BOT ──
     Entrar a una ruta no alcanza con que este libre AHORA: hay que poder
     quedarse el tiempo de aterrizar y volver a saltar, o sea algo mas de un
     segundo. Con el mismo horizonte para todo, el bot se metia entre dos autos y
     se quedaba ahi: once de cada treinta muertes eran eso. */
  const horDe = (f) => { const t = generaFila(f).tipo; return apura ? 0.2 : (t === 'ruta' ? 1.15 : (t === 'via' ? 0.9 : 0.6)); };
  if (seguroEn(R.fila + 1, c, horDe(R.fila + 1))) return [0, 1];
  /* de costado, buscando una columna desde la que se pueda avanzar */
  for (const dx of [1, -1]){
    const nx = cl(c + dx, -COLS, COLS);
    if (nx === c) continue;
    if (seguroEn(R.fila, nx, 0.35) && seguroEn(R.fila + 1, nx, horDe(R.fila + 1))) return [dx, 0];
  }
  /* parado en una ruta o en una via no se espera: se sale como sea */
  const aca = generaFila(R.fila).tipo;
  const F_VEL_ACT = () => generaFila(R.fila).vel || 0;
  if (aca === 'ruta' || aca === 'via'){
    for (const dx of [0, 1, -1]) if (seguroEn(R.fila + 1, cl(c + dx, -COLS, COLS), 0.35)) return [dx, 1];
    for (const dx of [1, -1]) if (seguroEn(R.fila, cl(c + dx, -COLS, COLS), 0.9)) return [dx, 0];
    if (seguroEn(R.fila - 1, c, 0.6)) return [0, -1];
  }
  if (apura){
    for (const dx of [0, 1, -1]){ const nx = cl(c + dx, -COLS, COLS); if (seguroEn(R.fila + 1, nx, 0.1)) return [dx, 1]; }
    return [0, 1];    /* la linea llega: se juega igual */
  }
  /* ── EN EL RIO NO EXISTE ESPERAR ──
     El camalote arrastra, asi que quedarse quieto es irse del mapa. Cuando la
     deriva ya empuja hacia el borde el bot se juega: adelante, al centro, o
     atras. Sin esto, veintisiete de cada cuarenta partidas terminaban con el
     carpincho saliendose de cuadro montado en una planta. */
  if (aca === 'rio'){
    const salida = R.x + F_VEL_ACT()*0.8;
    const urge = Math.abs(salida) > COLS - 0.6;
    const haciaCentro = R.x > 0 ? -1 : 1;
    if (urge){
      for (const dx of [0, haciaCentro, -haciaCentro]) if (seguroEn(R.fila + 1, cl(c + dx, -COLS, COLS), 0.3)) return [dx, 1];
      for (const dx of [haciaCentro, -haciaCentro]) if (seguroEn(R.fila, cl(c + dx, -COLS, COLS), 0.7)) return [dx, 0];
      if (seguroEn(R.fila - 1, c, 0.5)) return [0, -1];
      return [0, 1];
    }
    for (const dx of [haciaCentro, -haciaCentro]) if (seguroEn(R.fila, cl(c + dx, -COLS, COLS), 0.6)) return [dx, 0];
  }
  return null;
}
function juegaSolo(semilla, maxPasos){
  arrancaRun(semilla);
  const R = RUN; let n = 0; maxPasos = maxPasos || 60000;
  while (R.fase === 'juega' && n < maxPasos){
    const d = botDecide();
    if (d) pideSalto(d[0], d[1]);
    paso(); n++;
    R.eventos.length = 0;
  }
  if (R.fase === 'juega'){ R.fin = 'reloj'; R.pts = R.filaMax; R.ganado = 0; }
  return { pts: R.filaMax, fin: R.fin, monedas: R.monedas, t: +R.t.toFixed(1), pasos: n };
}
function juegaAzar(semilla, maxPasos){
  arrancaRun(semilla);
  const R = RUN; let n = 0; maxPasos = maxPasos || 20000;
  while (R.fase === 'juega' && n < maxPasos){
    if (az() < 0.05) pideSalto(az() < 0.7 ? 0 : (az() < 0.5 ? 1 : -1), az() < 0.85 ? 1 : 0);
    paso(); n++; R.eventos.length = 0;
  }
  return { pts: R.filaMax, fin: R.fin, pasos: n };
}

/* ══════════ LA AUDITORIA DEL MAPA ══════════
   ── UN BFS SOBRE LAS COLUMNAS LIBRES ──
   Los arboles son lo unico que puede CERRAR el paso: los autos y los camalotes
   pasan y vuelven, asi que una ruta siempre se cruza esperando. Esto comprueba
   lo estatico —que exista un camino de columnas libres desde el arranque hasta
   la fila `n`— y el resto lo prueba el auto-jugador jugando. */
function auditaMapa(n, semilla){
  MUNDO.filas = []; sem(semilla || 1);
  for (let f = 0; f <= n + 1; f++) generaFila(f);
  let alc = new Set([0]);
  const cerrados = [];
  for (let f = 1; f <= n; f++){
    const F = MUNDO.filas[f], sig = new Set();
    const libres = librasDe(F);
    /* desde una columna alcanzada se puede subir a la misma columna si esta
       libre, y despues caminar de costado por las libres contiguas */
    for (const c of alc) if (libres.includes(c)) sig.add(c);
    let crecio = true;
    while (crecio){
      crecio = false;
      for (const c of Array.from(sig)) for (const d of [-1, 1]){
        const nc = c + d;
        if (nc >= -COLS && nc <= COLS && libres.includes(nc) && !sig.has(nc)){ sig.add(nc); crecio = true; }
      }
    }
    if (!sig.size){ cerrados.push(f); break; }
    alc = sig;
  }
  const tipos = {};
  for (let f = 0; f <= n; f++){ const t = MUNDO.filas[f].tipo; tipos[t] = (tipos[t] || 0) + 1; }
  return { ok: cerrados.length === 0, cerrados, hasta: n, tipos, alc: alc.size };
}
