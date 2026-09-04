
/* ══════════════════════ LA SIMULACION ══════════════════════
   ── SIN DOM Y SIN three: ESTE ARCHIVO CORRE EN NODE ──
   Todo lo que decide el juego —la fisica, las monedas, el progreso, el
   auto-jugador— vive aca y no toca la pantalla. Asi se puede correr mil
   lanzamientos en un segundo en node para saber si la economia cierra ANTES de
   dibujar nada: un juego de mejoras cuya progresion no se midio es un juego que
   se termina en tres lanzamientos o que no se termina nunca.

   ── LA FISICA ES DE VERDAD, EN UNIDADES DEL SI ──
   Masa = casco + combustible, empuje en newtons, impulso especifico en
   segundos, gravedad que cae con la altura y una atmosfera exponencial. Que sea
   real no es purismo: es lo que hace que las quince capas caigan donde caen. */
const R_T = 6371e3, G0 = 9.81, RHO0 = 1.225, H_ESC = 8500;
const gravedad = (h) => G0*Math.pow(R_T/(R_T + h), 2);
const densidad = (h) => RHO0*Math.exp(-h/H_ESC);
const aireEn = (h) => Math.exp(-h/12000);

/* ══════════ EL PROGRESO ══════════ */
const PROG = { monedas: 0, niv: {}, raf: {}, rafEq: null, estilos: ['clasico'], estilo: 'clasico',
               record: 0, capaMax: 0, lanz: 0, vistas: {} };
for (const M of MEJORAS) PROG.niv[M.id] = 0;
for (const R of RAFAGAS) PROG.raf[R.id] = 0;
const CLAVE_SAVE = 'despegue_v1';
function guardaProg(){
  try { localStorage.setItem(CLAVE_SAVE, JSON.stringify({ ...PROG, lang: LANG, cal: CALIDAD, vm: VOL_MUS, vf: VOL_FX })); } catch(e){}
}
function cargaProg(){
  try {
    const s = localStorage.getItem(CLAVE_SAVE); if (!s) return false;
    const o = JSON.parse(s);
    for (const k of ['monedas', 'rafEq', 'estilos', 'estilo', 'record', 'capaMax', 'lanz', 'vistas']) if (o[k] != null) PROG[k] = o[k];
    if (o.niv) for (const M of MEJORAS) PROG.niv[M.id] = o.niv[M.id] | 0;
    if (o.raf) for (const R of RAFAGAS) PROG.raf[R.id] = o.raf[R.id] | 0;
    if (o.lang) LANG = o.lang; if (o.cal && CALIDADES[o.cal]) CALIDAD = o.cal;
    if (o.vm != null) VOL_MUS = o.vm; if (o.vf != null) VOL_FX = o.vf;
    return true;
  } catch(e){ return false; }
}
function borraProg(){
  PROG.monedas = 0; PROG.rafEq = null; PROG.estilos = ['clasico']; PROG.estilo = 'clasico';
  PROG.record = 0; PROG.capaMax = 0; PROG.lanz = 0; PROG.vistas = {};
  for (const M of MEJORAS) PROG.niv[M.id] = 0;
  for (const R of RAFAGAS) PROG.raf[R.id] = 0;
  guardaProg();
}

/* ══════════ DE LOS NIVELES A LOS NUMEROS ══════════
   ── CADA MEJORA MUEVE UN NUMERO Y NADA MAS ──
   Los numeros de base son los de un cohete chico de verdad: 21 kN de empuje,
   1.400 kg de casco, 130 kg de combustible, Isp 185 s. Con eso el primer
   lanzamiento pasa las copas de los arboles y no mucho mas, que es lo que tiene
   que hacer un primer lanzamiento. El tanque crece geometrico y el casco baja
   lineal: la relacion de masas es lo que decide adonde se llega, y por eso
   mejorar tanque y fuselaje a la vez vale mas que la suma. */
function parametros(niv){
  niv = niv || PROG.niv;
  const n = (k) => niv[k] | 0;
  return {
    empuje: 21000*Math.pow(1.20, n('motor')),
    comb: 130*Math.pow(1.34, n('tanque')),
    casco: 1400*Math.pow(0.89, n('fuselaje')),
    cdA: 1.10*Math.pow(0.88, n('fuselaje')),
    isp: 185 + 32*n('propelente'),
    giro: 3.0 + 0.55*n('aletas'),
    escudo: n('escudo'),
    iman: 0.55 + 0.22*n('iman')
  };
}

/* ══════════ EL ESTADO DE UN LANZAMIENTO ══════════ */
let RUN = null;
const ANCHO = 5.0;            /* medio ancho del carril, en unidades de pantalla */
const DT = 1/60;

/* ── LA ESCALA VISUAL: METROS POR UNIDAD ──
   El cohete tiene que medir lo mismo en pantalla a 50 m y a 50.000 km, asi que
   lo que cambia es cuantos metros vale una unidad. Abajo, 5 m por unidad (la
   torre se ve entera); despues crece con la altura. Los obstaculos viven en
   unidades de pantalla y su radio de choque se escala con esto, asi la
   dificultad de esquivar no depende de la altura. */
const mpu = (h) => Math.max(5, h/25);

/* ── EL TIEMPO SE ESTIRA CON LA ALTURA ──
   Ir a la Luna de verdad son tres dias y subir en balistica a 30 km son dos
   minutos mirando un marcador. El juego no puede durar eso, asi que el reloj de
   la simulacion corre `mult` veces mas rapido cuanto mas alto: 1 en la
   plataforma, 2 a 8 km, 13 en la linea de Karman, y de ahi en adelante crece
   con la altura. Abajo de los 100 km la fisica entera corre acelerada —es la
   misma fisica, fast-forward—. Arriba, solo la DISTANCIA se multiplica: la
   gravedad, el combustible y la rafaga van en tiempo real. Es una decision de
   juego y esta escrita como tal: con la fisica real, pasar la velocidad de
   escape lleva de la orbita al infinito en un cuadro y las capas de la Luna y
   Marte no existirian. El exponente 0,95 —y no 1— es lo que evita el
   acantilado: con `mult = h/K` la altura crece como `exp(v·t/K)` y entre un
   lanzamiento a la Luna y el siguiente el cohete se pasaba Marte entero
   (medido en node: de 2,6·10^8 a 6·10^11 en un lanzamiento). Con 0,95 crece
   como una potencia veinte de `v·t` y las cinco capas del espacio se recorren
   de a una: 1.000 m/s dan los satelites, 2.000 la geoestacionaria, 3.000 la
   Luna, 5.000 Marte, 6.000 el espacio profundo. */
const H_ESPACIO = 1e5, T_COSTA = 14;
/* `K_TIEMPO` se declara abajo de la funcion que lo usa: `const` en zona muerta tira,
   pero la funcion recien se llama en `paso`, cuando ya existe. */
function multTiempo(h){ return 1 + Math.pow(h/K_TIEMPO, 0.95); }
const K_TIEMPO = 10000;

function arrancaRun(semilla){
  const P = parametros();
  const R = RAFAGAS.find(r => r.id === PROG.rafEq);
  const rn = R ? PROG.raf[R.id] : 0;
  RUN = {
    fase: 'cuenta', tc: 0,          /* cuenta regresiva: 3,2 s */
    h: 0, v: 0, x: 0, vx: 0, comb: P.comb, t: 0, tk: 0, P,
    golpes: 0, escudo: P.escudo, hmax: 0, capa: 0, capaVista: -1,
    monedas: 0, monLevantadas: 0,
    raf: R || null, rafN: rn, cargas: R ? rafagaCargas(R, rn) : 0, boostT: 0, boostMult: 1, boostK: 0,
    obs: [], mon: [], sig: 40, semilla: semilla | 0, apretado: false, dir: 0, empujeK: 0,
    sinComb: false, planea: false, fin: null, eventos: [], dano: 0, sacude: 0, humo: 0
  };
  sem(RUN.semilla || 1);
  return RUN;
}

/* ══════════ LO QUE HAY EN EL CIELO ══════════
   ── SE SIEMBRA POR DELANTE, EN UNIDADES DE PANTALLA ──
   Cada `paso` de altura (en unidades) se decide si entra un obstaculo o una
   moneda, con la densidad de la capa. Los obstaculos se sacan de `cosas` de la
   capa actual, asi que a 3 km hay aviones y a 400 km satelites. Un obstaculo
   tiene `x` (−5..5), `u` (su altura en unidades sobre la del cohete cuando se
   sembro, convertida a metros con la mpu de ese momento), radio y deriva. */
const COSAS = {
  pajaro:   { r: 0.55, vx: 1.2, dano: 1 }, globo:    { r: 0.9,  vx: 0.2, dano: 1 }, nube: { r: 1.6, vx: 0.3, dano: 0 },
  avion:    { r: 1.1,  vx: 2.2, dano: 1 }, cirro:    { r: 2.0,  vx: 0.4, dano: 0 }, jet: { r: 0.9, vx: 3.0, dano: 1 },
  globoAlto:{ r: 1.2,  vx: 0.3, dano: 1 }, meteoro:  { r: 0.6,  vx: 1.8, dano: 1 }, chatarra: { r: 0.7, vx: 0.9, dano: 1 },
  satelite: { r: 1.0,  vx: 0.6, dano: 1 }, estacion: { r: 2.4,  vx: 0.2, dano: 1 }, asteroide: { r: 1.3, vx: 0.8, dano: 1 },
  luna:     { r: 0,    vx: 0,   dano: 0 }, marte:    { r: 0,    vx: 0,   dano: 0 }
};
function capaDe(h){ let c = 0; for (let i = 0; i < CAPAS.length; i++) if (h >= CAPAS[i].h) c = i; return c; }
function siembra(){
  const R = RUN, m = mpu(R.h);
  /* siembra hasta 40 unidades por delante del cohete */
  while (R.sig < R.h/m + 40){
    const hm = R.sig*m;                 /* altura en metros de esta fila */
    const c = capaDe(hm), C = CAPAS[c];
    const cosas = C.cosas.filter(k => COSAS[k].r > 0);
    /* densidad: sube con la capa, baja en las primeras */
    const dens = c === 0 ? 0.10 : Math.min(0.55, 0.22 + c*0.03);
    if (cosas.length && az() < dens){
      const k = cosas[Math.floor(az()*cosas.length)], D = COSAS[k];
      R.obs.push({ k, hm, x: azr(-ANCHO + 1, ANCHO - 1), vx: (az() < 0.5 ? -1 : 1)*D.vx*azr(0.5, 1), r: D.r, dano: D.dano, vivo: true, fase: az()*6.28 });
    }
    if (az() < 0.42){
      const n = 1 + Math.floor(az()*3), x0 = azr(-ANCHO + 1.2, ANCHO - 1.2);
      for (let i = 0; i < n; i++) R.mon.push({ hm: hm + i*1.6*m, x: x0, vivo: true, val: 1 + Math.floor(c/3) });
    }
    R.sig += azr(3.5, 6.5);
  }
  /* lo que quedo abajo se tira: la lista no crece sin fin */
  const piso = R.h - 12*m;
  if (R.obs.length > 60) R.obs = R.obs.filter(o => o.hm > piso - 40*m);
  if (R.mon.length > 90) R.mon = R.mon.filter(o => o.hm > piso - 40*m);
}

/* ══════════ UN PASO DE FISICA ══════════ */
function paso(apretado, dir){
  const R = RUN; if (!R || R.fase === 'fin') return;
  R.tk++; R.apretado = !!apretado; R.dir = cl(dir || 0, -1, 1);
  if (R.fase === 'cuenta'){
    R.tc += DT;
    /* el motor se enciende en el ultimo segundo: humo y temblor antes de soltar */
    R.empujeK = R.tc > 2.2 ? Math.min(1, (R.tc - 2.2)/1.0) : 0;
    if (R.tc >= 3.2){ R.fase = 'vuelo'; R.empujeK = 1; R.eventos.push('ya'); }
    return;
  }
  const P = R.P, mt = multTiempo(R.h), espacio = R.h >= H_ESPACIO;
  const dt = espacio ? DT : DT*mt, dth = DT*mt;
  const aire = densidad(R.h), g = gravedad(R.h);
  /* el empuje: apretado y con combustible. El primer segundo de vuelo empuja
     siempre, porque un cohete que no despega si no apretas a tiempo es un
     cohete que confunde */
  const quiere = R.apretado || R.t < 1.0;
  let emp = 0;
  if (quiere && R.comb > 0){
    emp = P.empuje*R.boostMult;
    const mdot = P.empuje/(P.isp*G0);
    R.comb = Math.max(0, R.comb - mdot*dt);
    R.empujeK += (1 - R.empujeK)*Math.min(1, DT*8);
  } else {
    R.empujeK += (0 - R.empujeK)*Math.min(1, DT*6);
  }
  if (R.comb <= 0 && !R.sinComb){ R.sinComb = true; R.eventos.push('sinComb'); }
  const masa = P.casco + R.comb;
  const arrastre = 0.5*aire*R.v*Math.abs(R.v)*P.cdA;
  const a = (emp - arrastre)/masa - g;
  R.v += a*dt;
  R.h += R.v*dth;
  R.t += dt;
  if (R.comb <= 0 && R.boostT <= 0){ R.tCosta = (R.tCosta || 0) + DT; }
  if (R.boostT > 0){ R.boostT -= dt; if (R.boostT <= 0){ R.boostT = 0; R.boostMult = 1; } }
  R.boostK = Math.max(0, R.boostK - DT*1.6);
  R.sacude = Math.max(0, R.sacude - DT*3);
  /* de costado: en unidades de pantalla, con las aletas como aceleracion */
  const vxObj = R.dir*P.giro;
  R.vx += (vxObj - R.vx)*Math.min(1, DT*(2.5 + P.giro*0.4));
  R.x = cl(R.x + R.vx*DT, -ANCHO + 0.5, ANCHO - 0.5);
  if (R.h > R.hmax) R.hmax = R.h;
  /* la capa */
  const c = capaDe(R.h);
  if (c !== R.capa){ R.capa = c; if (c > R.capaVista){ R.capaVista = c; R.eventos.push('capa'); } }
  /* la siembra y los choques */
  siembra();
  const m = mpu(R.h);
  for (const o of R.obs){
    if (!o.vivo) continue;
    o.x += o.vx*DT*0.35;
    if (o.x > ANCHO + 2) o.x = -ANCHO - 2; else if (o.x < -ANCHO - 2) o.x = ANCHO + 2;
    const dy = (o.hm - R.h)/m, dx = o.x - R.x;
    if (Math.abs(dy) < o.r + 0.6 && Math.abs(dx) < o.r + 0.45 && (dx*dx + dy*dy) < (o.r + 0.5)*(o.r + 0.5)){
      o.vivo = false;
      if (o.dano){
        R.golpes++; R.sacude = 1; R.eventos.push('golpe');
        if (R.golpes > R.escudo){ R.fin = 'explota'; R.eventos.push('explota'); terminaRun(); return; }
        /* un golpe frena: pierde un quinto de la velocidad */
        R.v *= 0.8;
      } else { R.eventos.push('nube'); }
    }
  }
  for (const o of R.mon){
    if (!o.vivo) continue;
    const dy = (o.hm - R.h)/m, dx = o.x - R.x;
    const d2 = dx*dx + dy*dy, ri = P.iman;
    if (d2 < ri*ri*4 && d2 > 0.01){
      /* el iman tira de la moneda: se mueve en unidades hacia el cohete */
      const d = Math.sqrt(d2), k = Math.min(1, DT*(6/ (d + 0.2)));
      o.x -= dx*k; o.hm -= dy*k*m;
    }
    if (d2 < 0.5*0.5 || (Math.abs(dy) < 0.5 && Math.abs(dx) < 0.5)){
      o.vivo = false; R.monedas += o.val; R.monLevantadas++; R.eventos.push('moneda');
    }
  }
  /* el final: el apice despues de gastar todo, el piso, o el fin del mapa */
  if (R.h >= H_FIN){ R.fin = 'fin'; terminaRun(); return; }
  /* ── EL CIERRE DEL VUELO ──
     Abajo: el apice, cuando la velocidad se da vuelta sin combustible. Arriba:
     ademas hay un presupuesto de costa de `T_COSTA` segundos reales —en el
     espacio la velocidad casi no baja y sin tope el vuelo no termina nunca—.
     Se deja ver la caida o el freno un segundo y medio y se cierra. */
  const costaFin = espacio && R.comb <= 0 && R.boostT <= 0 && R.tCosta > T_COSTA;
  if ((R.v < 0 || costaFin) && R.h > 0 && R.comb <= 0 && R.boostT <= 0){
    if (!R.planea){ R.planea = true; R.eventos.push('maximo'); R.tPlanea = 0; if (costaFin) R.v = Math.min(R.v, 0); }
    R.tPlanea += DT;
    if (R.tPlanea > 1.6){ R.fin = 'apice'; terminaRun(); return; }
  }
  if (R.h < 0 && R.t > 2){ R.h = 0; R.fin = 'piso'; terminaRun(); }
}

/* ══════════ LA RAFAGA ══════════ */
function rafaga(){
  const R = RUN; if (!R || R.fase !== 'vuelo' || !R.raf || R.cargas <= 0) return 'no';
  if (R.h < R.raf.hMin) return 'min';
  if (R.boostT > 0) return 'ya';
  const val = rafagaValor(R.raf, R.rafN);
  if (R.raf.tipo === 'dv') R.v += val;
  else { R.boostMult = val; R.boostT = R.raf.dur; }
  R.cargas--; R.boostK = 1; R.eventos.push('rafaga');
  return 'ok';
}

/* ══════════ EL CIERRE: MONEDAS, DESBLOQUEOS, RECORD ══════════
   ── LAS MONEDAS SALEN DE LA ALTURA, Y LA CURVA ES LA ECONOMIA ──
   Hasta la linea de Karman, `1,5·h^0,62`: 100 m dan 26, 1 km 108, 10 km 450,
   100 km 1.880. Arriba de los 100 km la altura crece exponencialmente con la
   velocidad, asi que las monedas pasan a crecer con el LOGARITMO: 400 km dan
   4.400, la Luna 17.000, Marte 26.000. Sin ese quiebre, un lanzamiento a la
   Luna pagaba doscientas mil monedas y se compraba el juego entero de una: la
   curva se medio en node (`simulaProgreso`) y este es el numero que la deja en
   unos sesenta lanzamientos. */
function monedasPor(hmax){
  hmax = Math.max(0, hmax);
  if (hmax < 1e5) return Math.floor(Math.pow(hmax, 0.62)*1.5);
  return Math.floor(1880*(1 + 2.2*Math.log10(hmax/1e5)));
}
function terminaRun(){
  const R = RUN; if (R.fase === 'fin') return;
  R.fase = 'fin';
  R.ganado = monedasPor(R.hmax) + R.monedas*8;
  if (R.fin === 'explota') R.ganado = Math.floor(R.ganado*0.6);
  PROG.monedas += R.ganado; PROG.lanz++;
  R.nuevoRec = R.hmax > PROG.record;
  if (R.nuevoRec) PROG.record = R.hmax;
  const c = capaDe(R.hmax);
  R.capaFin = c;
  R.nuevos = [];
  if (c > PROG.capaMax){
    PROG.capaMax = c;
  }
  /* los estilos por capa se desbloquean por la capa MAXIMA alcanzada alguna vez */
  for (const E of ESTILOS){
    if (E.desb.capa != null && PROG.capaMax >= E.desb.capa && !PROG.estilos.includes(E.id)){ PROG.estilos.push(E.id); R.nuevos.push(E.id); }
  }
  guardaProg();
}

/* ══════════ EL TALLER ══════════ */
function compraMejora(id){
  const n = PROG.niv[id] | 0; if (n >= NIVEL_TOPE) return 'tope';
  const p = precioMejora(id, n); if (PROG.monedas < p) return 'falta';
  PROG.monedas -= p; PROG.niv[id] = n + 1; guardaProg(); return 'ok';
}
function compraRafaga(id){
  const R = RAFAGAS.find(r => r.id === id); if (PROG.capaMax < R.capa) return 'bloq';
  const n = PROG.raf[id] | 0; if (n >= RAF_TOPE) return 'tope';
  const p = precioRafaga(id, n); if (PROG.monedas < p) return 'falta';
  PROG.monedas -= p; PROG.raf[id] = n + 1; if (!PROG.rafEq) PROG.rafEq = id; guardaProg(); return 'ok';
}
function equipaRafaga(id){ if ((PROG.raf[id] | 0) > 0){ PROG.rafEq = id; guardaProg(); return 'ok'; } return 'no'; }
function compraEstilo(id){
  const E = ESTILOS.find(e => e.id === id); if (PROG.estilos.includes(id)) return 'ya';
  if (E.desb.capa != null) return PROG.capaMax >= E.desb.capa ? (PROG.estilos.push(id), guardaProg(), 'ok') : 'bloq';
  if (PROG.monedas < E.desb.monedas) return 'falta';
  PROG.monedas -= E.desb.monedas; PROG.estilos.push(id); guardaProg(); return 'ok';
}
function eligeEstilo(id){ if (PROG.estilos.includes(id)){ PROG.estilo = id; guardaProg(); return 'ok'; } return 'no'; }

/* ══════════ EL AUTO-JUGADOR ══════════
   ── APRIETA SIEMPRE Y ESQUIVA LO QUE VIENE ──
   Mira los obstaculos de las proximas doce unidades y se corre hacia el hueco
   mas ancho. Es lo que hace un jugador normal, y es lo que valida que un
   lanzamiento SE PUEDA sobrevivir: si el bot honesto explota en la mitad de los
   intentos, el cielo esta demasiado lleno. */
function botDecide(){
  const R = RUN, m = mpu(R.h);
  let dir = 0, cerca = null, dmin = 1e9;
  for (const o of R.obs){
    if (!o.vivo || !o.dano) continue;
    const dy = (o.hm - R.h)/m;
    if (dy < -1 || dy > 12) continue;
    /* donde va a estar cuando lleguemos */
    const tLlega = dy/Math.max(1, R.v/m*DT*60);
    const xf = o.x + o.vx*0.35*tLlega;
    const dx = xf - R.x;
    if (Math.abs(dx) < o.r + 1.1 && dy < dmin){ dmin = dy; cerca = { dx, r: o.r, xf }; }
  }
  if (cerca){
    /* al lado que tenga mas lugar */
    const izq = cerca.xf - cerca.r, der = cerca.xf + cerca.r;
    dir = (izq + ANCHO) > (ANCHO - der) ? -1 : 1;
    if (R.x < -ANCHO + 1.2) dir = 1; if (R.x > ANCHO - 1.2) dir = -1;
  } else {
    /* sin peligro, va por la moneda mas cercana */
    let mm = null, dm = 1e9;
    for (const o of R.mon){ if (!o.vivo) continue; const dy = (o.hm - R.h)/m; if (dy < 0 || dy > 10) continue; if (dy < dm){ dm = dy; mm = o; } }
    if (mm) dir = cl((mm.x - R.x)*1.5, -1, 1);
    else dir = cl(-R.x*0.5, -1, 1);
  }
  /* la rafaga: en cuanto se puede, arriba de la altura minima */
  if (R.raf && R.cargas > 0 && R.h >= R.raf.hMin && R.boostT <= 0 && R.t > 2) rafaga();
  return { apretado: true, dir };
}
/* juega un lanzamiento entero sin dibujar: devuelve el resumen */
function juegaSolo(semilla, maxPasos){
  arrancaRun(semilla == null ? Math.floor(Math.random()*1e9) : semilla);
  const R = RUN; let n = 0; maxPasos = maxPasos || 200000;
  while (R.fase !== 'fin' && n < maxPasos){
    const d = R.fase === 'vuelo' ? botDecide() : { apretado: true, dir: 0 };
    paso(d.apretado, d.dir); n++;
  }
  if (R.fase !== 'fin'){ R.fin = 'reloj'; terminaRun(); }
  return { hmax: Math.round(R.hmax), capa: capaDe(R.hmax), fin: R.fin, golpes: R.golpes, monedas: R.monedas,
           ganado: R.ganado, t: +R.t.toFixed(1), pasos: n, comb: Math.round(R.comb) };
}
/* ── LA PROGRESION SIMULADA ──
   Un jugador codicioso: lanza, compra lo mas barato que pueda (dando prioridad
   al motor y al tanque, que son lo que sube), y vuelve a lanzar. Cuenta
   cuantos lanzamientos hacen falta para cada capa: eso ES la curva del juego. */
function simulaProgreso(maxLanz, verbose){
  const copia = JSON.parse(JSON.stringify(PROG));
  borraProgSinGuardar();
  const hitos = {}, filas = [];
  const prio = ['tanque', 'motor', 'fuselaje', 'propelente', 'escudo', 'aletas', 'iman'];
  for (let i = 0; i < (maxLanz || 120); i++){
    const r = juegaSolo(1000 + i);
    for (let c = 0; c <= r.capa; c++) if (hitos[c] == null) hitos[c] = i + 1;
    if (verbose) filas.push({ lanz: i + 1, hmax: r.hmax, capa: r.capa, fin: r.fin, ganado: r.ganado, saldo: PROG.monedas, niv: Object.values(PROG.niv).join('') });
    if (r.capa >= 13) break;
    /* compra: lo mas barato entre las que mas suben, hasta quedarse sin plata */
    let compro = true;
    while (compro){
      compro = false;
      let mejor = null, pm = 1e12;
      for (const id of prio){
        const n = PROG.niv[id] | 0; if (n >= NIVEL_TOPE) continue;
        /* peso: el tanque y el motor valen mas por moneda */
        const peso = id === 'tanque' ? 0.7 : id === 'motor' ? 0.8 : id === 'fuselaje' ? 0.85 : id === 'propelente' ? 0.9 : 1.6;
        const p = precioMejora(id, n)*peso;
        if (p < pm && precioMejora(id, n) <= PROG.monedas){ pm = p; mejor = id; }
      }
      if (mejor){ compraMejora(mejor); compro = true; }
      /* rafaga: la mas alta desbloqueada se compra y se sube mientras sobre el doble */
      for (const Rf of RAFAGAS){
        const nr = PROG.raf[Rf.id] | 0;
        if (PROG.capaMax >= Rf.capa && nr < RAF_TOPE && PROG.monedas >= precioRafaga(Rf.id, nr)*1.5){ compraRafaga(Rf.id); equipaRafaga(Rf.id); compro = true; }
      }
    }
  }
  const res = { hitos, lanz: PROG.lanz, niv: { ...PROG.niv }, raf: { ...PROG.raf }, filas };
  Object.assign(PROG, copia);
  return res;
}
function borraProgSinGuardar(){
  PROG.monedas = 0; PROG.rafEq = null; PROG.estilos = ['clasico']; PROG.estilo = 'clasico';
  PROG.record = 0; PROG.capaMax = 0; PROG.lanz = 0;
  for (const M of MEJORAS) PROG.niv[M.id] = 0;
  for (const R of RAFAGAS) PROG.raf[R.id] = 0;
}
