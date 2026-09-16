/* ══════════════════════════════ GRUA ══════════════════════════════
   Una carga colgando de un cable que se hamaca, y una base abajo.

   ── EL VERBO ES PREDECIR UN PENDULO, Y NO ES «TOCAR EN EL MOMENTO JUSTO» ──
   DUELO tambien se juega con un instante, pero ahi el instante correcto es
   visible: la campana suena y hay que reaccionar. Aca no hay senal: la carga se
   hamaca sola y el momento correcto NO es cuando pasa por encima de la base.

   Y eso no es una dificultad artificial, es fisica: al soltar, la carga se lleva
   la velocidad que traia, que es perpendicular al cable. O sea que sale
   DISPARADA de costado y sigue viajando mientras cae. Soltarla justo encima del
   blanco la manda de largo; hay que soltarla ANTES, y cuanto antes depende de
   cuanto se hamaca y de cuanto falta caer.

   ── Y EL ANDAMIO ES LO QUE CIERRA LA VENTANA POR EL OTRO LADO ──
   Sin obstaculo, soltar temprano de mas cae corto y ya: el error es de un solo
   lado y la ventana es media hamacada. Con una columna en el medio, soltar
   demasiado temprano manda la carga BAJA y se la lleva puesta el andamio. La
   ventana queda acotada de los dos lados, y el andamio se planta MIDIENDO el
   vuelo que se eligio: su punta va apenas debajo de la trayectoria buena. */

const R_NIVELES = 45;
const R_G = 1700;              /* gravedad de la caida, en unidades de diseno */
const R_PY = 250;              /* el carro, en unidades de mundo */
const R_SUELO = 1180;
const R_W = 400;               /* medio ancho del mundo */

let R_tiro = [];               /* la lista de cargas del nivel */
let R_i = 0;                   /* cual se esta por soltar */
let R_t = 0;                   /* el reloj del pendulo */
let R_fase = 'cuelga';         /* cuelga · vuela · posa · falla · fin */
let R_bola = null;             /* {x, y, vx, vy} mientras vuela */
let R_puesto = [];             /* las que ya se apoyaron, para el dibujo */
let R_nivel = 1, R_meta = 0, R_vidas = 0, R_paso = 0;
let R_msg = '', R_msgT = 0, R_lento = 0, R_esp = 0;
let R_azar = 11;
function rAz(){ R_azar = (R_azar*1664525 + 1013904223) >>> 0; return R_azar / 4294967296; }

const JT = {
  es: { sub:'Soltá el cable. La carga sale de costado, no cae derecho.',
        c1:'Tocá para soltar la carga.',
        c2:'Se va de costado: soltala ANTES de la base.',
        c3:'Cuarenta y cinco obras.',
        nivelC:'OBRA', pasoC:'CARGAS', vidasC:'VIDAS',
        buen:'¡PUESTA!', falla:'AL PISO', choque:'¡EL ANDAMIO!', llego:'¡OBRA LISTA!' },
  en: { sub:'Drop the cable. The load flies sideways, it does not fall straight.',
        c1:'Tap to release the load.',
        c2:'It flies sideways: let go BEFORE the base.',
        c3:'Forty-five sites.',
        nivelC:'SITE', pasoC:'LOADS', vidasC:'LIVES',
        buen:'PLACED!', falla:'ON THE GROUND', choque:'THE SCAFFOLD!', llego:'SITE DONE!' },
  pt: { sub:'Solte o cabo. A carga sai de lado, não cai reto.',
        c1:'Toque para soltar a carga.',
        c2:'Ela vai de lado: solte ANTES da base.',
        c3:'Quarenta e cinco obras.',
        nivelC:'OBRA', pasoC:'CARGAS', vidasC:'VIDAS',
        buen:'COLOCADA!', falla:'NO CHÃO', choque:'O ANDAIME!', llego:'OBRA PRONTA!' }
};
const PIEL = { ac:'#d8973c', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tira', pierde:'grito', gana:'gana',
                    clic:'clic', crujido:'tensa' };
const AMB = {
  foto: 'f_grua',
  cielo: ['#e0a45c', '#3a2a1e'],
  haz: 0.18,
  vineta: 0.40,
  part: { n: 16, dir: 'sube', forma: 'disco', col: '#e8d0a8',
          r0: 1.2, r1: 3.4, v0: 8, v1: 26, amp: 52, gira: 0,
          a0: 0.06, a1: 0.20 }
};

/* ── DONDE ESTA LA CARGA EN CADA INSTANTE ──
   Va como armonico simple y no como pendulo exacto, a proposito: asi el
   movimiento es PERIODICO de verdad y la ventana de soltada se puede barrer
   entera. Con el pendulo exacto el periodo depende de la amplitud y la
   auditoria tendria que buscarlo antes de poder medir nada. */
function rEstado(t, T){
  const th = T.A*Math.sin(T.w*t + T.fase);
  const dth = T.A*T.w*Math.cos(T.w*t + T.fase);
  return { th,
           x: T.px + T.L*Math.sin(th),
           y: R_PY + T.L*Math.cos(th),
           vx: T.L*dth*Math.cos(th),
           vy: -T.L*dth*Math.sin(th) };
}

/* ── EL VUELO SE SIMULA CONTRA LO QUE HAY, NO SE RESUELVE CONTRA UN PUNTO ──
   Con el andamio en el medio, la formula cerrada de la parabola contesta donde
   cae y no contesta si llega. Es la misma leccion de CASTILLO y de PENAL. */
function rVuela(s, T){
  let x = s.x, y = s.y, vx = s.vx, vy = s.vy, t = 0;
  const dt = 1/240;
  while (y < R_SUELO && t < 6){
    vy += R_G*dt; x += vx*dt; y += vy*dt; t += dt;
    if (T.obs && Math.abs(x - T.obs.x) < T.obs.w && y > T.obs.y)
      return { x, y, choco: 1, t };
    if (Math.abs(x) > R_W + 140) return { x, y, choco: 2, t };
  }
  return { x, y: R_SUELO, choco: 0, t };
}
function rPega(v, T){ return !v.choco && Math.abs(v.x - T.tx) <= T.tw; }

/* la fraccion de la hamacada en la que soltar acierta: es la dificultad de
   verdad y es lo que se audita */
function rVentana(T){
  const per = 6.283/T.w;
  let n = 0;
  for (let i = 0; i < 300; i++)
    if (rPega(rVuela(rEstado(i*per/300, T), T), T)) n++;
  return n/300;
}

/* ══════════ EL GENERADOR ══════════
   La base NO se planta y despues se comprueba: se elige una soltada al azar, se
   VUELA, y la base va donde cayo. Asi el tiro existe por construccion y no hay
   forma de generar un nivel imposible. Despues el andamio se planta midiendo
   ESA trayectoria, y recien ahi se mide cuanta ventana quedo. */
function rArma(k){
  for (let intento = 0; intento < 80; intento++){
    const L = 250 + rAz()*90;
    const T = { L, A: 0.30 + k*0.32 + rAz()*0.10, w: Math.sqrt(R_G/L),
                fase: rAz()*6.283, px: -300 + rAz()*70,
                obs: null, tx: 0, tw: 0, carga: Math.floor(rAz()*3),
                base: Math.floor(rAz()*3) };
    const per = 6.283/T.w;
    const s = rEstado(rAz()*per, T);
    if (s.vx < 90) continue;                 /* que salga hacia la base y no al reves */
    const v = rVuela(s, T);
    /* ── CUANTO PUEDE ALEJARSE LA BASE NO ES UNA CONSTANTE, DEPENDE DE LA
       AMPLITUD ── y eso se midio: con la hamacada chica del nivel 1 el alcance
       maximo es de unas 260 unidades, asi que exigir 330 rechazaba TODOS los
       tiros y los ocho primeros niveles salian sin una sola carga. */
    if (v.choco || v.x < T.px + 190 + k*130 || v.x > R_W - 100) continue;
    T.tx = v.x;
    T.tw = 116 - k*56 + rAz()*14;

    /* el andamio va entre el carro y la base, con la punta apenas por debajo del
       vuelo elegido: se mide re-volando y anotando la altura al cruzar su x */
    if (k > 0.12){
      /* ── EL ANDAMIO VA EN EL MEDIO Y NO PEGADO A LA BASE ──
         Medido en la captura, con el vano libre de 272 unidades la columna
         caia a ochenta de la base: geometricamente valido —la ventana daba
         0,10— y en pantalla el obstaculo y el blanco eran la misma cosa, asi
         que no habia nada que leer. Se le exige aire de los dos lados. */
      const a0 = T.px + 120, a1 = T.tx - 130;
      /* y si no hay vano para el andamio se lo deja afuera, no se tira el tiro:
         rechazando el tiro entero, medido, los nueve primeros niveles salian
         SIN UNA SOLA CARGA y el juego se caia al leerla */
      const ox = a1 > a0 ? a0 + rAz()*(a1 - a0) : null;
      if (ox === null) { T.obs = null; }
      else {
      let x = s.x, y = s.y, vx = s.vx, vy = s.vy, alt = null;
      const dt = 1/240;
      while (y < R_SUELO && alt === null){
        const xa = x;
        vy += R_G*dt; x += vx*dt; y += vy*dt;
        if (xa <= ox && x > ox) alt = y;
      }
      if (alt !== null && alt < R_SUELO - 120)
        T.obs = { x: ox, w: 30, y: alt + 96 - k*54 };
      }
    }
    const vent = rVentana(T);
    if (vent < 0.025) continue;
    T.vent = vent;
    return T;
  }
  return null;
}

function rGenera(n){
  R_azar = (n*3266489917) >>> 0;
  for (let i = 0; i < 5; i++) rAz();
  const k = Math.min(1, (n - 1)/40);
  const cant = 2 + Math.floor(k*3);
  const t = [];
  for (let i = 0; i < cant; i++){
    /* ── SI LA DIFICULTAD PEDIDA NO DA UN TIRO, SE BAJA LA DIFICULTAD ──
       Nunca se devuelve un nivel sin cargas: un nivel vacio no es facil, es un
       nivel que no existe, y el juego lo lee como una carga indefinida. */
    let T = null;
    for (const q of [k, k*0.6, k*0.3, 0]){ T = rArma(q); if (T) break; }
    if (T) t.push(T);
  }
  return { t, meta: t.length, vidas: 3 };
}

const JUEGO = {
  id: 'grua',
  tipo: 'niveles',
  nivelesTotal: R_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return R_paso; },
  get sub(){ return TX('pasoC'); },
  get ficI(){ return TX('nivelC') + ' ' + NIVEL; },
  get ficD(){ return TX('vidasC') + ' ' + R_vidas; },
  get resta(){ return R_meta ? Math.max(0, 1 - R_paso/R_meta) : 0; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ rDemo(g, u, 0); } },
    { dur: 3.6, pie: 'c2', dibuja(g, u){ rDemo(g, u, 1); } },
    { dur: 3.0, pie: 'c3', dibuja(g, u){ rDemo(g, u, 2); } }
  ],

  arranca(n){
    R_nivel = n || 1;
    const G = rGenera(R_nivel);
    R_tiro = G.t; R_meta = G.meta; R_vidas = G.vidas;
    R_i = 0; R_paso = 0; R_puesto = []; R_t = 0; R_esp = 0;
    R_fase = 'cuelga'; R_bola = null;
    R_msg = ''; R_msgT = 0; R_lento = 0;
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
  },

  paso(dt){
    if (R_msgT > 0) R_msgT = Math.max(0, R_msgT - dt);
    if (R_lento > 0){ R_lento = Math.max(0, R_lento - dt); dt *= 0.34; }
    const T = R_tiro[R_i];
    if (!T){ return; }

    if (R_fase === 'cuelga'){
      const aA = rEstado(R_t, T).th;
      R_t += dt;
      const aB = rEstado(R_t, T).th;
      /* el crujido en cada extremo: es lo unico que le da ritmo audible a la
         hamacada, y el ritmo es de lo que se trata soltar a tiempo */
      if (aA*aB < 0 === false && Math.sign(aB - aA) !== Math.sign(aA) && Math.abs(aB) > T.A*0.9)
        son('crujido', 0.28);
      return;
    }
    if (R_fase === 'vuela'){
      const b = R_bola;
      const dts = 1/240;
      let q = dt;
      while (q > 0){
        const p = Math.min(dts, q); q -= p;
        b.vy += R_G*p; b.x += b.vx*p; b.y += b.vy*p;
        if (T.obs && Math.abs(b.x - T.obs.x) < T.obs.w && b.y > T.obs.y){ this.pierde('choque'); return; }
        if (Math.abs(b.x) > R_W + 140){ this.pierde('falla'); return; }
        if (b.y >= R_SUELO){
          b.y = R_SUELO;
          if (Math.abs(b.x - T.tx) <= T.tw) this.acierta();
          else this.pierde('falla');
          return;
        }
      }
      return;
    }
    if (R_fase === 'posa' || R_fase === 'falla'){
      R_esp -= dt;
      if (R_esp <= 0) this.sigue();
      return;
    }
  },

  suelta(){
    const T = R_tiro[R_i];
    if (!T || R_fase !== 'cuelga') return;
    const s = rEstado(R_t, T);
    R_bola = { x: s.x, y: s.y, vx: s.vx, vy: s.vy };
    R_fase = 'vuela';
    son('toque', 0.8);
  },

  acierta(){
    const T = R_tiro[R_i];
    R_puesto.push({ x: R_bola.x, y: R_SUELO, k: T.carga });
    R_paso++;
    R_fase = 'posa'; R_esp = 0.75;
    R_msg = 'buen'; R_msgT = 1.0;
    son('bien', 0.9); sacude(0.25); comboSuma();
    chispas(AN/2, AL*0.6, 8, '#e8d0a8', 160);
  },

  pierde(cual){
    R_vidas--;
    R_fase = 'falla'; R_esp = 0.95; R_lento = 0.3;
    R_msg = cual; R_msgT = 1.2;
    comboCorta();
    son('pierde', 0.9); sacude(0.5); destella('#ff6a5a', 0.6);
  },

  sigue(){
    if (R_vidas <= 0 && R_msg !== 'buen'){ this.vivo = false; return; }
    if (R_msg === 'buen') R_i++;
    R_bola = null; R_fase = 'cuelga'; R_t = 0;
    if (R_i >= R_tiro.length){
      this.gano = true;
      this.estrellas = R_vidas >= 3 ? 3 : (R_vidas === 2 ? 2 : 1);
      this.finP = TX('vidasC') + ' ' + R_vidas;
      R_msg = 'llego'; R_msgT = 1.6;
      son('gana', 1); destella('#ffd76a', 0.9);
      this.vivo = false;
    }
  },

  fondo(g){},
  pinta(g){ rPinta(g); },

  baja(){ if (MODO === 'juega') this.suelta(); },
  mueve(){},
  sube(){},

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto MIRA HACIA ADELANTE: en cada cuadro vuela la carga desde donde
     esta y suelta el primer cuadro en el que el vuelo cae en la base. El otro
     suelta en un instante al azar de la hamacada. Si el momento no importara,
     los dos pondrian la misma cantidad de cargas. */
  juegaSolo(n, azar){
    let gana = 0, malos = [], tiros = 0, buenos = 0;
    const dt = 1/60;
    for (let niv = 1; niv <= (n || R_NIVELES); niv++){
      this.arranca(niv);
      let v = 0, azT = -1;
      while (this.vivo && !this.gano && v < 12000){
        v++;
        if (R_fase === 'cuelga'){
          const T = R_tiro[R_i];
          if (azar){
            if (azT < 0) azT = Math.random()*(6.283/T.w);
            azT -= dt;
            if (azT <= 0){ tiros++; azT = -1; this.suelta(); continue; }
          } else {
            /* ── Y SI EN UNA HAMACADA ENTERA NO ENCONTRO EL CENTRO, SE
               CONFORMA CON EL BORDE ──
               Buscando solo soltadas que caigan en el 60 % central de la base,
               hay cargas cuya ventana entera queda afuera de ese 60 %: medido,
               el bot se quedaba colgado para siempre en dos niveles de
               cuarenta y cinco. Un jugador tampoco espera la soltada perfecta
               si la buena ya paso. */
            const v2 = rVuela(rEstado(R_t, T), T);
            const per = 6.283/T.w;
            const fino = R_t < per*1.05;
            if (rPega(v2, T) && (!fino || Math.abs(v2.x - T.tx) < T.tw*0.6)){
              tiros++; this.suelta(); continue;
            }
          }
        }
        const p0 = R_paso;
        this.paso(dt);
        if (R_paso > p0) buenos++;
      }
      if (this.gano) gana++; else malos.push(niv);
    }
    return JSON.stringify({ niveles: (n || R_NIVELES), gana,
                            malos: malos.slice(0, 10), nMalos: malos.length,
                            tiros, buenos,
                            tasa: tiros ? +(buenos/tiros).toFixed(3) : 0 });
  },

  /* ── LA AUDITORIA: QUE CADA CARGA TENGA VENTANA ──
     Se barre la hamacada entera y se cuenta en que fraccion soltar acierta.
     Cero es un nivel imposible; uno seria un nivel que se gana solo. */
  audita(a, b){
    const malos = [];
    let minV = 9, maxV = 0, nT = 0, conObs = 0;
    for (let n = (a || 1); n <= (b || R_NIVELES); n++){
      const G = rGenera(n);
      if (!G.t.length){ malos.push([n, 'sin cargas']); continue; }
      for (let i = 0; i < G.t.length; i++){
        const T = G.t[i];
        nT++;
        if (T.obs) conObs++;
        const vent = rVentana(T);
        if (vent <= 0) malos.push([n, 'carga ' + i + ' sin ventana']);
        if (Math.abs(T.tx) > R_W - 40) malos.push([n, 'base ' + i + ' fuera del mundo']);
        minV = Math.min(minV, vent); maxV = Math.max(maxV, vent);
      }
    }
    return JSON.stringify({ niveles: (b || R_NIVELES) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            cargas: nT, conAndamio: conObs,
                            ventana: [+minV.toFixed(3), +maxV.toFixed(3)] });
  },

  ver(){
    const T = R_tiro[R_i];
    const s = T ? rEstado(R_t, T) : null;
    return JSON.stringify({
      nivel: R_nivel, fase: R_fase, paso: R_paso, meta: R_meta, vidas: R_vidas,
      carga: R_i, msg: R_msg,
      bola: s ? [Math.round(s.x), Math.round(s.y)] : null,
      vel: s ? [Math.round(s.vx), Math.round(s.vy)] : null,
      base: T ? [Math.round(T.tx), Math.round(T.tw)] : null,
      andamio: T && T.obs ? [Math.round(T.obs.x), Math.round(T.obs.y)] : null,
      vent: T ? +rVentana(T).toFixed(3) : 0,
      vivo: this.vivo, gano: this.gano, est: this.estrellas });
  },
  cfg(o){
    if (o.t != null) R_t = o.t;
    if (o.suelta) this.suelta();
    if (o.auto){
      const T = R_tiro[R_i];
      let n = 0;
      const per = 6.283/T.w;
      while (R_fase === 'cuelga' && n < 900){
        const v = rVuela(rEstado(R_t, T), T);
        if (rPega(v, T) && (R_t > per*1.05 || Math.abs(v.x - T.tx) < T.tw*0.6)){ this.suelta(); break; }
        this.paso(1/60); n++;
      }
    }
    if (o.pasos) for (let i = 0; i < o.pasos; i++) this.paso(1/60);
    return this.ver();
  }
};

/* ══════════════════════════════ EL DIBUJO ══════════════════════════════ */

/* ── LA CAMARA ES FIJA Y ESCALA, Y ESO ES A PROPOSITO ──
   El mundo mide ochocientas unidades de ancho contra las setecientas veinte del
   diseno, y todo lo que importa —el carro, el andamio y la base— tiene que
   estar en pantalla A LA VEZ: sin ver la base no hay nada que predecir. Una
   camara que siguiera la carga mostraria la carga y nada mas. */
/* ── Y LA VENTANA NO ES EL ANCHO DE LAS REGLAS ──
   El mundo de las reglas llega a 400, pero la carga se hamaca MAS ALLA del
   carro: medido en el nivel 18, la bola pasaba por x = -433 y se salia de la
   pantalla por la izquierda justo mientras uno la esta mirando para decidir.
   Lo que se dibuja es el recorrido entero, no el mundo de las reglas. */
const R_VIS0 = -530, R_VIS1 = 420;
const R_ESC = 720/(R_VIS1 - R_VIS0);
function rCam(g){
  g.save();
  g.translate(AN/2 - ((R_VIS0 + R_VIS1)/2)*R_ESC, AL*0.82 - R_SUELO*R_ESC);
  g.scale(R_ESC, R_ESC);
}

function rPinta(g){
  const T = R_tiro[R_i];
  rCam(g);

  /* el piso */
  const pat = patron('g_piso');
  g.save();
  g.beginPath(); g.rect(-R_W - 200, R_SUELO, (R_W + 200)*2, 600); g.clip();
  g.fillStyle = '#5a4a38'; g.fill();
  if (pat){ g.globalAlpha = 0.65; g.fillStyle = pat;
            g.fillRect(-R_W - 200, R_SUELO, (R_W + 200)*2, 600); }
  g.restore();
  g.strokeStyle = 'rgba(30,22,14,.55)'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(-R_W - 200, R_SUELO); g.lineTo(R_W + 200, R_SUELO); g.stroke();

  /* la viga de la grua y el carro */
  if (T){
    g.fillStyle = '#3a3026';
    g.fillRect(-R_W - 60, R_PY - 46, (R_W + 60)*2, 22);
    for (let x = -R_W - 40; x < R_W + 40; x += 74){
      g.strokeStyle = 'rgba(58,48,38,.85)'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x, R_PY - 46); g.lineTo(x + 37, R_PY - 24);
      g.moveTo(x + 37, R_PY - 46); g.lineTo(x + 74, R_PY - 24); g.stroke();
    }
    caja2(T.px - 34, R_PY - 30, 68, 32, 6, '#d8973c', 'rgba(30,22,14,.6)');
  }

  /* el andamio: lo unico que cierra la ventana por abajo, asi que se dibuja
     macizo y con su punta bien marcada */
  if (T && T.obs){
    const o = T.obs;
    caja2(o.x - o.w, o.y, o.w*2, R_SUELO - o.y, 4, '#7a6a52', 'rgba(30,22,14,.65)');
    for (let y = o.y + 40; y < R_SUELO; y += 62){
      g.strokeStyle = 'rgba(30,22,14,.45)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(o.x - o.w, y); g.lineTo(o.x + o.w, y); g.stroke();
    }
    g.fillStyle = '#e8c860';
    g.fillRect(o.x - o.w - 6, o.y - 8, o.w*2 + 12, 10);
  }

  /* la base */
  if (T){
    const y = R_SUELO;
    g.save(); g.globalAlpha = 0.30;
    g.fillStyle = '#000';
    g.beginPath(); g.ellipse(T.tx, y + 6, T.tw*1.1, 12, 0, 0, 7); g.fill();
    g.restore();
    if (!dibCuadroWH('g_base', T.base, T.tx, y - T.tw*0.30, T.tw*2.2, T.tw*1.05)){
      caja2(T.tx - T.tw, y - 26, T.tw*2, 26, 5, '#8a6a3c', 'rgba(30,22,14,.6)');
    }
    /* los dos postes: el ancho del blanco tiene que ser LEGIBLE, si no el
       jugador no sabe si erro por poco o por mucho */
    g.strokeStyle = 'rgba(232,200,96,.75)'; g.lineWidth = 4;
    for (const s of [-1, 1]){
      g.beginPath();
      g.moveTo(T.tx + s*T.tw, y - 8); g.lineTo(T.tx + s*T.tw, y - 74);
      g.stroke();
    }
  }

  for (const p of R_puesto)
    if (!dibCuadro('g_carga', p.k, p.x, p.y + 6, 118))
      caja2(p.x - 32, p.y - 60, 64, 60, 6, '#a07a44', 'rgba(30,22,14,.6)');

  /* el cable y la carga */
  if (T){
    if (R_fase === 'cuelga'){
      const s = rEstado(R_t, T);
      g.strokeStyle = '#2a2118'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(T.px, R_PY); g.lineTo(s.x, s.y - R_ALTOC*0.33 + 4); g.stroke();
      rCarga(g, s.x, s.y, T.carga);
      /* ── LA FLECHA DE VELOCIDAD, Y SOLO EN LAS PRIMERAS OBRAS ──
         Que la carga salga de costado es la regla entera del juego y no se
         puede deducir mirando una carga que se hamaca. Con la flecha se aprende
         en el primer tiro; despues estorba. Y va DESPUES de la carga: dibujada
         antes se la tapa el propio sprite, que mide ciento treinta unidades. */
      if (R_nivel <= 4){
        /* ── Y LARGA A PROPOSITO ──
           Proporcional a la velocidad y nada mas, la flecha medía noventa
           unidades y el sprite de la carga mide ciento treinta: quedaba adentro
           del dibujo y no se veía. Sale del borde de la carga y mide lo mismo
           siempre, porque lo que tiene que decir es HACIA DONDE, no cuanto. */
        const vv = Math.max(1, Math.hypot(s.vx, s.vy));
        const ux = s.vx/vv, uy = s.vy/vv;
        const ox = s.x + ux*70, oy = s.y + uy*70;
        const ex = ox + ux*115, ey = oy + uy*115;
        const an = Math.atan2(uy, ux);
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(30,22,14,.75)'; g.lineWidth = 13;
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
        g.strokeStyle = 'rgba(255,214,106,.98)'; g.lineWidth = 7;
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
        g.beginPath();
        g.moveTo(ex, ey);
        g.lineTo(ex - 34*Math.cos(an - 0.42), ey - 34*Math.sin(an - 0.42));
        g.lineTo(ex - 34*Math.cos(an + 0.42), ey - 34*Math.sin(an + 0.42));
        g.closePath(); g.fillStyle = 'rgba(255,214,106,.95)'; g.fill();
      }
    } else if (R_bola){
      rCarga(g, R_bola.x, R_bola.y, T.carga);
    }
  }
  g.restore();

  if (R_msgT > 0){
    const al = Math.min(1, R_msgT/0.4);
    const col = (R_msg === 'buen' || R_msg === 'llego') ? '127,224,138' : '255,106,90';
    texto(TX(R_msg), AN/2, AL*0.30, R_msg === 'llego' ? 54 : 40,
          'rgba(' + col + ',' + al.toFixed(2) + ')', '800', 'center');
  }
  /* el contador va solo en la cinematica: en partida el HUD ya escribe el
     mismo numero y la misma palabra, y dos veces el mismo dato es peor que una */
  if (MODO !== 'juega')
    texto(R_paso + ' / ' + R_meta, AN/2, AL*0.115, 26,
          'rgba(242,238,230,.6)', '800', 'center');
  if (MODO === 'juega' && R_paso === 0 && R_fase === 'cuelga')
    texto(TX('c2'), AN/2, AL*0.245, 22, 'rgba(242,238,230,.72)', '700', 'center');
}

/* ── LA CARGA SE RECORTA, PORQUE EL SPRITE TRAE SU PROPIO CABLE ──
   El generador devolvio «una carga colgando de un gancho», o sea que el 42 %
   de arriba de cada cuadro es cable y gancho. Dibujado entero quedaban DOS
   cables, el mio y el suyo, uno al lado del otro — y en el vuelo, donde no hay
   cable, quedaba un gancho flotando sobre la caja. Medido sobre la propia
   imagen: la caja arranca en el 42 % y las sogas se abren desde el 38 %. */
const R_ALTOC = 210;
function rCarga(g, x, y, k){
  g.save();
  g.beginPath();
  g.rect(x - R_ALTOC*0.32, y - R_ALTOC*0.33, R_ALTOC*0.64, R_ALTOC*0.62);
  g.clip();
  const hay = dibCuadro('g_carga', k, x, y + R_ALTOC*0.29, R_ALTOC);
  g.restore();
  if (hay) return;
  caja2(x - 36, y - 34, 72, 68, 7, '#a07a44', 'rgba(30,22,14,.65)');
  g.strokeStyle = 'rgba(30,22,14,.55)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(x - 36, y - 34); g.lineTo(x + 36, y + 34);
  g.moveTo(x + 36, y - 34); g.lineTo(x - 36, y + 34); g.stroke();
}

/* ══════════ LA CINEMATICA ══════════ */
function rDemo(g, u, plano){
  const gt = R_tiro, gi = R_i, gr = R_t, gf = R_fase, gb = R_bola;
  const gp = R_puesto, gn = R_nivel, gs = R_paso, gm = R_meta;
  const gms = R_msg, gmt = R_msgT, gv = R_vidas;

  JUEGO.arranca(plano === 2 ? 22 : 2);
  R_msg = ''; R_msgT = 0;
  if (plano === 0){
    R_t = u*(6.283/R_tiro[0].w);
  } else {
    const T = R_tiro[0];
    /* se busca la soltada buena y se corre el vuelo hasta el instante `u` */
    let n = 0;
    const per = 6.283/T.w;
    while (R_fase === 'cuelga' && n < 900){
      const v = rVuela(rEstado(R_t, T), T);
      if (rPega(v, T) && (R_t > per*1.05 || Math.abs(v.x - T.tx) < T.tw*0.6)){ JUEGO.suelta(); break; }
      JUEGO.paso(1/60); n++;
    }
    const lim = plano === 1 ? 0.05 + u*0.9 : 3;
    for (let s = 0; s < lim && R_fase === 'vuela'; s += 1/120) JUEGO.paso(1/120);
    if (plano === 2){ R_msg = 'llego'; R_msgT = 1.4; }
  }
  ambAtras();
  rPinta(g);
  ambAdelante();

  R_tiro = gt; R_i = gi; R_t = gr; R_fase = gf; R_bola = gb;
  R_puesto = gp; R_nivel = gn; R_paso = gs; R_meta = gm;
  R_msg = gms; R_msgT = gmt; R_vidas = gv;
}
