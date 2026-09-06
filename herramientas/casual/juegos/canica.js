/* ══════════════════════════════ CANICA ══════════════════════════════
   Se inclina el teléfono y una canica rueda por un laberinto. Hay que juntar
   las tres chispas del piso y salir por la baldosa clara antes de que se acabe
   el reloj, esquivando los pozos. Al salir se elige una de tres mejoras y se
   baja al piso siguiente. Roguelike: la corrida se termina cuando se acaban las
   vidas, y lo que se lleva de una corrida a otra es lo que se aprendió.

   ── POR QUÉ EL GIROSCOPIO Y NO EL DEDO ──
   Un laberinto con joystick ya existe y se juega igual con el pulgar. Lo que
   hace que éste sea otro juego es que el jugador tiene que MOVER EL APARATO, y
   entonces la torpeza es física: inclinar de más y pasarse de largo es un error
   del cuerpo y no del dedo. Y el respaldo táctil existe igual —una notebook no
   tiene sensor— pero se siente distinto a propósito y eso está bien.

   ── LAS CUATRO COSAS QUE HACEN QUE UN PISO SEA JUGABLE, Y LAS CUATRO SE
      COMPRUEBAN EN VEZ DE ESPERARSE ──
   1. LA SALIDA ES LA CELDA MÁS LEJANA EN PASOS desde la entrada, por BFS. En la
      esquina no: en un laberinto con atajos la esquina puede quedar a tres
      celdas y el piso se termina antes de empezar.
   2. LOS POZOS NO PUEDEN CAER EN EL CAMINO CORTO. Un pozo en el único paso hacia
      la salida convierte el piso en una moneda al aire, y eso no se ve como
      dificultad: se ve como que el juego está roto.
   3. LAS CHISPAS TIENEN QUE ESTAR REPARTIDAS. Tres chispas en el mismo rincón
      son una sola chispa que vale el triple, y el piso pasa a ser un pasillo.
      Van en tercios distintos del laberinto por distancia a la entrada.
   4. Y EL RELOJ SALE DEL LARGO DEL CAMINO, NO DE UN NÚMERO A MANO. Un piso de
      5x7 y uno de 9x13 no pueden tener el mismo reloj: se mide el recorrido
      real —entrada, las tres chispas en el mejor orden, la salida— y se paga
      con margen. Eso es lo único que hace que la dificultad crezca de verdad y
      no por accidente.

   Todo eso lo comprueba `audita()`, que genera los cien pisos y lo verifica uno
   por uno; y `juegaSolo()` los JUEGA, que es lo único que prueba que además de
   existir el camino se puede recorrer con esta física. */

const K_PISOS = 100;
const K_DX = [0, 1, 0, -1], K_DY = [-1, 0, 1, 0];

/* ── LA FÍSICA, Y LOS TRES NÚMEROS SALEN DE UNA CUENTA ──
   La celda mide `KG.s` en pantalla y la canica un tercio de eso. Cruzar una
   celda con la inclinación al tope tiene que llevar más o menos un tercio de
   segundo: más rápido no se puede frenar en una esquina, más lento el laberinto
   se hace largo. Con `a` la aceleración y `r` el roce, la velocidad de régimen
   es `a/r`, así que se elige la velocidad y sale la aceleración. */
const K_VMAX = 3.2;            /* celdas por segundo con el aparato al tope */
const K_ROCE = 6.4;            /* 1/s: en medio segundo pierde el 96 % */
const K_ACEL = K_VMAX*K_ROCE;  /* la que da esa velocidad de régimen */
const K_REBOTE = 0.30;         /* una canica en un laberinto de madera casi no rebota */

let K_W = 5, K_H = 7;
let K_mur = [];                /* mascara de paredes por celda, bits N E S O */
let K_pozo = [];               /* booleano por celda */
let K_ent = 0, K_sal = 0;      /* indices de celda */
let K_chis = [];               /* [{i, tomada}] */
let K_azar = 7;
const kIx = (x, y) => y*K_W + x;
function kAz(){ K_azar = (K_azar*1664525 + 1013904223) >>> 0; return K_azar / 4294967296; }

/* el estado de la canica, en unidades de CELDA y no de pixel: asi la fisica no
   cambia cuando cambia el tamaño de la pantalla */
const CAN = { x: 0.5, y: 0.5, vx: 0, vy: 0, r: 0.30 };
let K_piso = 1, K_vidas = 3, K_reloj = 0, K_relojT = 0;
let K_esc = 0;                 /* escudos: se comen una caida */
let K_muerto = 0;              /* el parpadeo despues de caer */
let K_fase = 'juega';          /* juega · elige · cae */
let K_oferta = [];
let K_mej = {};                /* las mejoras tomadas: clave -> cuantas */
let K_puntos = 0;
let K_marca = 0;               /* la marca del pozo pisado, cosmetica */
let K_aviso = '', K_avisoT = 0;/* por que se fallo: se dice, no se adivina */

/* ══════════ LAS MEJORAS ══════════
   Doce, todas con TOPE. Es la lección que DADOS ya costó: sin tope, el bot
   llegó a la ronda 419 con un puntaje de 1,4e16 porque una mejora multiplicativa
   sin techo convierte el roguelike en una cuenta que se va al infinito.
   Y NINGUNA es «más puntos»: todas cambian cómo se juega el piso siguiente. */
const K_MEJ = [
  { k: 'vida',   tope: 3 },    /* una vida más */
  { k: 'freno',  tope: 4 },    /* más roce: se controla mejor y se va menos de largo */
  { k: 'reloj',  tope: 4 },    /* +8 s por piso */
  { k: 'iman',   tope: 3 },    /* las chispas se agarran de más lejos */
  { k: 'escudo', tope: 2 },    /* se come una caída */
  { k: 'pozo',   tope: 3 },    /* los pozos son más chicos */
  { k: 'chica',  tope: 3 },    /* la canica es más chica: pasa más ajustado */
  { k: 'brujula',tope: 1 },    /* la salida se marca desde el primer cuadro */
  { k: 'lenta',  tope: 3 },    /* menos aceleración: más lenta y más precisa */
  { k: 'chispa', tope: 2 },    /* una chispa menos por piso */
  { k: 'rebote', tope: 2 },    /* menos rebote contra la pared */
  { k: 'salto',  tope: 1 },    /* la primera caída de cada piso es gratis */
];
const kM = (k) => K_mej[k] || 0;

/* ── LO QUE CADA MEJORA CAMBIA, EN UN SOLO SITIO ──
   Repartidas por el código, la tercera que se agregue va a quedar sin efecto en
   algún cálculo y nadie se va a enterar hasta jugarla. */
const kRoce   = () => K_ROCE*(1 + kM('freno')*0.22);
const kAcel   = () => K_ACEL*(1 - kM('lenta')*0.11);
const kRadio  = () => 0.30*(1 - kM('chica')*0.10);
const kIman   = () => 0.34 + kM('iman')*0.16;
const kPozoR  = () => 0.30*(1 - kM('pozo')*0.14);
const kRebote = () => K_REBOTE*(1 - kM('rebote')*0.35);
const kNChis  = () => Math.max(1, 3 - kM('chispa'));

/* ══════════ EL LABERINTO ══════════ */
function kConf(n){
  /* crece de 5x7 a 9x13, y los pozos con él. Los dos topes están en el mismo
     sitio a propósito: con el laberinto creciendo y los pozos no, el piso 90
     sería más fácil que el 40. */
  const w = Math.min(9, 5 + Math.floor((n - 1)/14));
  const h = Math.min(13, 7 + Math.floor((n - 1)/9));
  return { w, h,
           pozos: Math.min(12, Math.floor((n - 1)/4)),
           atajos: 0.06 + Math.min(0.10, (n - 1)*0.0011) };
}

function kCava(w, h, atajos){
  const m = new Array(w*h).fill(15);   /* todas las paredes puestas */
  const vis = new Array(w*h).fill(false);
  const pila = [0];
  vis[0] = true;
  while (pila.length){
    const i = pila[pila.length - 1];
    const x = i % w, y = (i / w) | 0;
    const op = [];
    for (let d = 0; d < 4; d++){
      const nx = x + K_DX[d], ny = y + K_DY[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!vis[ny*w + nx]) op.push(d);
    }
    if (!op.length){ pila.pop(); continue; }
    const d = op[(kAz()*op.length) | 0];
    const j = (y + K_DY[d])*w + (x + K_DX[d]);
    m[i] &= ~(1 << d);
    m[j] &= ~(1 << ((d + 2) % 4));
    vis[j] = true;
    pila.push(j);
  }
  /* ── LOS ATAJOS NO SON DECORACIÓN ──
     Un laberinto perfecto es un ÁRBOL: cada error obliga a desandar el ramal
     entero, y con una canica que se va de largo en cada esquina eso no es
     dificultad, es castigo. Con bucles hay más de un camino. */
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    for (const d of [1, 2]){
      const nx = x + K_DX[d], ny = y + K_DY[d];
      if (nx >= w || ny >= h) continue;
      if (kAz() < atajos){
        m[y*w + x] &= ~(1 << d);
        m[ny*w + nx] &= ~(1 << ((d + 2) % 4));
      }
    }
  }
  return m;
}

/* distancias en pasos desde `s`, y de quién viene cada celda */
function kBFS(m, w, h, s){
  const d = new Array(w*h).fill(-1), pa = new Array(w*h).fill(-1);
  d[s] = 0;
  const q = [s];
  for (let k = 0; k < q.length; k++){
    const i = q[k], x = i % w, y = (i / w) | 0;
    for (let dir = 0; dir < 4; dir++){
      if (m[i] & (1 << dir)) continue;
      const nx = x + K_DX[dir], ny = y + K_DY[dir];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny*w + nx;
      if (d[j] >= 0) continue;
      d[j] = d[i] + 1; pa[j] = i; q.push(j);
    }
  }
  return { d, pa };
}
function kCamino(pa, a, b){
  const r = [];
  for (let i = b; i >= 0; i = pa[i]){ r.push(i); if (i === a) break; }
  return r.reverse();
}

function kGenera(n){
  K_azar = (n*2654435761) >>> 0;
  for (let i = 0; i < 6; i++) kAz();
  const c = kConf(n);
  const w = c.w, h = c.h;
  const m = kCava(w, h, c.atajos);
  const ent = 0;
  const { d, pa } = kBFS(m, w, h, ent);
  /* la salida es la celda más lejana EN PASOS */
  let sal = 0;
  for (let i = 0; i < w*h; i++) if (d[i] > d[sal]) sal = i;

  /* ── LAS CHISPAS, UNA POR TERCIO DE PROFUNDIDAD ──
     Y ninguna en la entrada ni en la salida: una chispa encima de la salida no
     obliga a desviarse, que es lo único que las chispas existen para hacer. */
  const nch = kNChis();
  const orden = [];
  for (let i = 0; i < w*h; i++) if (i !== ent && i !== sal && d[i] > 0) orden.push(i);
  orden.sort((a, b) => d[a] - d[b]);
  const chis = [];
  for (let t = 0; t < nch && orden.length; t++){
    const lo = Math.floor(orden.length*(t + 0.15)/nch);
    const hi = Math.max(lo + 1, Math.floor(orden.length*(t + 1)/nch));
    let pick = -1;
    for (let intento = 0; intento < 24; intento++){
      const cand = orden[lo + ((kAz()*(hi - lo)) | 0)];
      if (cand != null && chis.indexOf(cand) < 0){ pick = cand; break; }
    }
    if (pick >= 0) chis.push(pick);
  }

  /* ── LOS POZOS, FUERA DEL CAMINO CORTO ──
     El camino protegido no es sólo entrada→salida: es el recorrido completo que
     el piso OBLIGA a hacer, o sea pasando por las tres chispas. Protegiendo
     sólo la recta a la salida, un pozo puede quedar en el único acceso a una
     chispa — y entonces el piso pide una chispa que no se puede juntar. */
  const prot = new Set();
  let cur = ent;
  const parada = chis.slice().concat([sal]);
  for (const p of parada){
    const b = kBFS(m, w, h, cur);
    for (const i of kCamino(b.pa, cur, p)) prot.add(i);
    cur = p;
  }
  prot.add(ent);
  const pozo = new Array(w*h).fill(false);
  const libres = [];
  for (let i = 0; i < w*h; i++) if (!prot.has(i)) libres.push(i);
  for (let k = libres.length - 1; k > 0; k--){
    const j = (kAz()*(k + 1)) | 0;
    const t = libres[k]; libres[k] = libres[j]; libres[j] = t;
  }
  for (let k = 0; k < Math.min(c.pozos, libres.length); k++) pozo[libres[k]] = true;

  /* ── EL RELOJ SALE DEL RECORRIDO MEDIDO ──
     `pasos` es el largo real del camino obligado. A `K_VMAX` celdas por segundo
     en línea recta eso serían `pasos/K_VMAX` segundos: se paga 2,6 veces, que es
     lo que cuesta frenar en cada esquina y equivocarse alguna vez. */
  let pasos = 0;
  cur = ent;
  for (const p of parada){
    const b = kBFS(m, w, h, cur);
    pasos += b.d[p];
    cur = p;
  }
  /* ── Y EL MARGEN SE APRIETA CON EL PISO ──
     Con un factor constante, el reloj crece exactamente igual que el laberinto y
     el piso 100 se siente igual que el 10 — medido, margen 2,6 en los cien. Lo
     único que crecía era el tamaño, y un laberinto más grande con el mismo
     margen relativo no es más difícil, sólo es más largo. Baja de 2,6 a 1,7 a lo
     largo de la corrida: 2,6 es un piso en el que se puede dudar y 1,7 uno que
     hay que recorrer casi sin frenar. Y ahí sí la corrida tiene un techo, que es
     lo que un roguelike necesita para que llegar lejos signifique algo. */
  const marg = 2.6 - Math.min(0.9, (n - 1)*0.012);
  const reloj = Math.round(pasos/K_VMAX*marg) + 8 + kM('reloj')*8;
  return { w, h, m, ent, sal, chis, pozo, pasos, reloj };
}

/* ══════════ LOS TEXTOS ══════════ */
const JT = {
  es: { sub:'Inclina el teléfono y llevá la canica a la salida.',
        c1:'Inclinás el teléfono y la canica rueda.',
        c2:'Juntá las chispas y evitá los pozos.',
        c3:'Salí antes de que se acabe el reloj y elegí una mejora.',
        pisoC:'PISO', vidasC:'VIDAS', chisC:'CHISPAS',
        elegi:'ELEGÍ UNA MEJORA', cayo:'¡AL POZO!', tarde:'SE ACABÓ EL TIEMPO',
        sinSensor:'Sin sensor: arrastrá el dedo para inclinar',
        conSensor:'Se juega inclinando el teléfono',
        m_vida:'UNA VIDA MÁS', m_freno:'MÁS AGARRE', m_reloj:'+8 SEGUNDOS',
        m_iman:'IMÁN', m_escudo:'ESCUDO', m_pozo:'POZOS MÁS CHICOS',
        m_chica:'CANICA CHICA', m_brujula:'BRÚJULA', m_lenta:'MÁS SUAVE',
        m_chispa:'UNA CHISPA MENOS', m_rebote:'PAREDES BLANDAS', m_salto:'PRIMERA GRATIS',
        d_vida:'Empezás cada corrida con una vida más.',
        d_freno:'La canica frena antes: se va menos de largo.',
        d_reloj:'Ocho segundos más en cada piso.',
        d_iman:'Las chispas se agarran desde más lejos.',
        d_escudo:'Se come una caída y se gasta.',
        d_pozo:'Los pozos ocupan menos.',
        d_chica:'La canica pasa por lugares más ajustados.',
        d_brujula:'Una flecha señala la salida.',
        d_lenta:'Acelera menos: más lenta y más precisa.',
        d_chispa:'Hay que juntar una chispa menos.',
        d_rebote:'Casi no rebota contra las paredes.',
        d_salto:'La primera caída de cada piso no cuesta vida.' },
  en: { sub:'Tilt your phone and roll the marble to the exit.',
        c1:'Tilt the phone and the marble rolls.',
        c2:'Collect the sparks and dodge the pits.',
        c3:'Get out before the clock runs out and pick an upgrade.',
        pisoC:'FLOOR', vidasC:'LIVES', chisC:'SPARKS',
        elegi:'PICK AN UPGRADE', cayo:'DOWN THE PIT!', tarde:'OUT OF TIME',
        sinSensor:'No sensor: drag your finger to tilt',
        conSensor:'Played by tilting the phone',
        m_vida:'ONE MORE LIFE', m_freno:'MORE GRIP', m_reloj:'+8 SECONDS',
        m_iman:'MAGNET', m_escudo:'SHIELD', m_pozo:'SMALLER PITS',
        m_chica:'SMALL MARBLE', m_brujula:'COMPASS', m_lenta:'SMOOTHER',
        m_chispa:'ONE SPARK LESS', m_rebote:'SOFT WALLS', m_salto:'FIRST ONE FREE',
        d_vida:'Start every run with one extra life.',
        d_freno:'The marble slows sooner: less overshooting.',
        d_reloj:'Eight more seconds on every floor.',
        d_iman:'Sparks are picked up from farther away.',
        d_escudo:'Eats one fall and is used up.',
        d_pozo:'Pits take up less room.',
        d_chica:'The marble fits through tighter gaps.',
        d_brujula:'An arrow points at the exit.',
        d_lenta:'Accelerates less: slower and more precise.',
        d_chispa:'One less spark to collect.',
        d_rebote:'Barely bounces off the walls.',
        d_salto:'The first fall on each floor is free.' },
  pt: { sub:'Incline o telefone e leve a bolinha até a saída.',
        c1:'Você inclina o telefone e a bolinha rola.',
        c2:'Junte as faíscas e desvie dos buracos.',
        c3:'Saia antes do relógio acabar e escolha uma melhoria.',
        pisoC:'ANDAR', vidasC:'VIDAS', chisC:'FAÍSCAS',
        elegi:'ESCOLHA UMA MELHORIA', cayo:'CAIU NO BURACO!', tarde:'TEMPO ESGOTADO',
        sinSensor:'Sem sensor: arraste o dedo para inclinar',
        conSensor:'Jogue inclinando o telefone',
        m_vida:'MAIS UMA VIDA', m_freno:'MAIS ADERÊNCIA', m_reloj:'+8 SEGUNDOS',
        m_iman:'ÍMÃ', m_escudo:'ESCUDO', m_pozo:'BURACOS MENORES',
        m_chica:'BOLINHA PEQUENA', m_brujula:'BÚSSOLA', m_lenta:'MAIS SUAVE',
        m_chispa:'UMA FAÍSCA A MENOS', m_rebote:'PAREDES MACIAS', m_salto:'A PRIMEIRA É GRÁTIS',
        d_vida:'Comece cada corrida com uma vida a mais.',
        d_freno:'A bolinha freia antes: passa menos do ponto.',
        d_reloj:'Oito segundos a mais em cada andar.',
        d_iman:'As faíscas são pegas de mais longe.',
        d_escudo:'Absorve uma queda e se gasta.',
        d_pozo:'Os buracos ocupam menos.',
        d_chica:'A bolinha passa por espaços mais apertados.',
        d_brujula:'Uma seta aponta a saída.',
        d_lenta:'Acelera menos: mais lenta e mais precisa.',
        d_chispa:'Uma faísca a menos para juntar.',
        d_rebote:'Quase não quica nas paredes.',
        d_salto:'A primeira queda de cada andar não custa vida.' }
};
const PIEL = { ac:'#8ad7ff', tela:'fondo' };
const SON_ALIAS = { bien:'fusion', toque:'clic', pierde:'perder', gana:'gana',
                    clic:'clic', caida:'caida' };

/* ══════════ EL AMBIENTE ══════════
   El laberinto es de madera vieja bajo una luz de taller. El polvo que cae
   despacio en el haz es lo único que se mueve además de la canica — y tiene que
   ser LENTO: en un juego cuya dificultad es no pasarse de largo, algo rápido
   cruzando el cuadro engancha el ojo justo en la esquina. */
const AMB = {
  foto: 'f_canica',
  cielo: ['#241a12', '#100b08'],
  haz: 0.13,
  vineta: 0.46,
  granoK: 0.014,
  part: { n: 18, dir: 'cae', forma: 'disco', col: '#ffdca8',
          r0: 1.2, r1: 3.0, v0: 6, v1: 20, amp: 38, gira: 0,
          a0: 0.08, a1: 0.22 }
};

/* ══════════ GEOMETRIA ══════════ */
let KG = { s: 60, x0: 0, y0: 0 };
function kGeo(){
  const dispW = AN - 44, dispH = AL - 300 - 210;
  KG.s = Math.floor(Math.min(dispW/K_W, dispH/K_H));
  KG.x0 = (AN - KG.s*K_W)/2;
  KG.y0 = 300 + (dispH - KG.s*K_H)/2;
}
const kPX = (cx) => KG.x0 + cx*KG.s;
const kPY = (cy) => KG.y0 + cy*KG.s;

/* ══════════ LA INCLINACION ══════════
   Sale del sensor si lo hay y del dedo si no. UN SOLO SITIO lo decide: con dos,
   el respaldo se desincroniza el dia que se toque la fisica, y el respaldo es
   justo lo que nadie prueba. */
let K_dedo = { on: false, x: 0, y: 0 };
let K_forz = null;             /* la sonda escribe acá */
function kIncl(){
  if (K_forz) return K_forz;
  if (GIRO.estado === 'lista' && GIRO.on) return { x: GIRO.x, y: GIRO.y };
  return { x: K_dedo.x, y: K_dedo.y };
}

const JUEGO = {
  id: 'canica',
  tipo: 'puntos',
  usa: ['giro'],
  vivo: true, gano: false,
  get marca(){ return K_puntos; },
  get sub(){ return TX('pisoC') + ' ' + K_piso; },
  get ficI(){ return '♥ '.repeat(Math.max(0, K_vidas)).trim() || '—'; },
  get ficD(){ return TX('chisC') + ' ' + K_chis.filter(c => c.t).length + '/' + K_chis.length; },
  get resta(){ return K_reloj > 0 ? Math.max(0, Math.min(1, K_relojT/K_reloj)) : 0; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ kDemo(g, u, 0); } },
    { dur: 3.2, pie: 'c2', dibuja(g, u){ kDemo(g, u, 1); } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){ kDemo(g, u, 2); } }
  ],

  arranca(){
    K_piso = 1; K_puntos = 0; K_vidas = 3; K_esc = 0;
    K_mej = {};
    this.vivo = true; this.gano = false;
    this.pisoNuevo();
  },

  pisoNuevo(){
    const G = kGenera(K_piso);
    K_W = G.w; K_H = G.h; K_mur = G.m; K_pozo = G.pozo;
    K_ent = G.ent; K_sal = G.sal;
    K_chis = G.chis.map(i => ({ i, t: false }));
    K_reloj = G.reloj; K_relojT = G.reloj;
    K_vidas = Math.max(K_vidas, 0) + (K_piso === 1 ? kM('vida') : 0);
    K_esc = Math.max(K_esc, kM('escudo'));
    K_fase = 'juega'; K_muerto = 0; K_marca = 0;
    this.alPrincipio();
    kGeo();
  },
  alPrincipio(){
    CAN.x = (K_ent % K_W) + 0.5; CAN.y = ((K_ent/K_W)|0) + 0.5;
    CAN.vx = 0; CAN.vy = 0;
    CAN.r = kRadio();
  },

  paso(dt){
    kGeo();
    if (K_avisoT > 0) K_avisoT = Math.max(0, K_avisoT - dt);
    if (K_muerto > 0){ K_muerto = Math.max(0, K_muerto - dt); return; }
    if (K_fase !== 'juega') return;

    K_relojT -= dt;
    if (K_relojT <= 0){ this.castiga('tarde'); return; }

    const inc = kIncl();
    CAN.vx += inc.x*kAcel()*dt;
    CAN.vy += inc.y*kAcel()*dt;
    const r = kRoce();
    CAN.vx -= CAN.vx*Math.min(1, r*dt);
    CAN.vy -= CAN.vy*Math.min(1, r*dt);

    /* ── EL CHOQUE VA EJE POR EJE, Y ESO ES LO QUE HACE QUE SE DESLICE ──
       Resolviendo los dos a la vez, la canica se clava en cada esquina y el
       laberinto se vuelve intransitable. Es la misma corrección que en Eco. */
    kMueve(CAN.vx*dt, 0, 'x');
    kMueve(0, CAN.vy*dt, 'y');

    /* las chispas: por distancia, y el radio lo pone el imán */
    const ri = kIman() + CAN.r;
    for (const c of K_chis){
      if (c.t) continue;
      const cx = (c.i % K_W) + 0.5, cy = ((c.i/K_W)|0) + 0.5;
      if (Math.hypot(CAN.x - cx, CAN.y - cy) < ri){
        c.t = true;
        son('bien', 0.8);
        /* ── EL CONTADOR SE ACTUALIZA CON LO QUE `sumaPuntos` DEVUELVE ──
           Medido con el auto-jugador: llegaba al piso 31 con `puntos: 0`, porque
           `sumaPuntos` escribe el `PUNTOS` del núcleo y `marca` leía mi propia
           variable, que nadie tocaba. Y no se puede leer `PUNTOS` directo: lo
           que devuelve `sumaPuntos` es el valor YA MULTIPLICADO por la racha, o
           sea que juntar tres chispas seguidas tiene que pagar más — y ése es el
           único incentivo que hay para no quedarse pensando. */
        K_puntos += sumaPuntos(20, kPX(cx), kPY(cy));
        chispas(kPX(cx), kPY(cy), 14, '#ffd76a', 150);
        destella('#ffd76a', 0.35);
      }
    }

    /* el pozo: se cae si el CENTRO entra en él. Con el borde, una canica que
       roza el labio se cae, y eso no se ve venir. */
    const ci = kIx(Math.floor(CAN.x), Math.floor(CAN.y));
    if (K_pozo[ci]){
      const px = (ci % K_W) + 0.5, py = ((ci/K_W)|0) + 0.5;
      if (Math.hypot(CAN.x - px, CAN.y - py) < kPozoR()) this.cae(ci);
      return;
    }

    /* la salida: sólo con todas las chispas */
    if (ci === K_sal && K_chis.every(c => c.t)) this.sale();
  },

  cae(i){
    K_marca = i;
    chispas(kPX((i % K_W) + 0.5), kPY(((i/K_W)|0) + 0.5), 18, '#2b2016', 130);
    this.castiga('cayo');
  },

  /* ── LAS DOS FORMAS DE FALLAR PASAN POR EL MISMO SITIO ──
     Y eso arregló un defecto que sólo se vio midiendo: quedarse sin tiempo
     llamaba a `pierde()` directo, o sea que terminaba la CORRIDA ENTERA con las
     tres vidas intactas — el bot al azar moría en el piso 1 con `caidas: 0` y
     `vidas: 3`, que es la firma exacta de un camino de derrota que no pasa por
     las vidas. En un roguelike de pisos el reloj tiene que ser una presión y no
     una guillotina: cuesta una vida y se reintenta el piso. */
  castiga(motivo){
    K_aviso = motivo; K_avisoT = 1.5;
    son('pierde', 0.8);
    sacude(0.5);
    /* ── EL ESCUDO Y LA PRIMERA GRATIS SE COMEN EL CASTIGO, Y NO SON LO MISMO ──
       El escudo se GASTA y hay que volver a comprarlo; «la primera gratis» se
       repone en cada piso. Con las dos iguales, una de las dos cartas no
       significaría nada. */
    if (K_esc > 0){ K_esc--; this.reintenta(0.7); return; }
    if (kM('salto') && !this._gratis){ this._gratis = true; this.reintenta(0.7); return; }
    K_vidas--;
    if (K_vidas <= 0){ this.pierde(); return; }
    this.reintenta(0.9);
  },
  reintenta(esp){
    this.alPrincipio();
    /* el reloj vuelve entero: reintentar un piso con dos segundos en el reloj no
       es un reintento, es tirar una vida a la basura */
    K_relojT = K_reloj;
    K_muerto = esp;
  },

  sale(){
    K_fase = 'elige';
    son('gana', 0.9);
    destella('#8ad7ff', 1.0);
    sacude(0.28);
    /* el piso paga por lo que sobró de reloj: sin eso, salir rápido y salir con
       un segundo valen lo mismo y el reloj sólo sirve para perder */
    K_puntos += sumaPuntos(60 + K_piso*10 + Math.round(K_relojT*4), AN/2, AL*0.42);
    K_oferta = kSorteaOferta();
    if (!K_oferta.length){ K_piso++; this.pisoNuevo(); }
  },

  pierde(){
    son('pierde');
    this.vivo = false;
  },

  eligeMejora(i){
    const r = K_oferta[i];
    if (!r) return false;
    K_mej[r.k] = (K_mej[r.k] || 0) + 1;
    if (r.k === 'vida') K_vidas++;
    if (r.k === 'escudo') K_esc++;
    K_oferta.length = 0;
    K_piso++;
    this._gratis = false;
    son('clic');
    this.pisoNuevo();
    return true;
  },

  baja(x, y){
    if (MODO !== 'juega') return;
    if (K_fase === 'elige'){
      const i = kCartaEn(x, y);
      if (i >= 0) this.eligeMejora(i);
      return;
    }
    /* ── EL RESPALDO: ARRASTRAR EL DEDO INCLINA ──
       No es un extra. Sin sensor —una notebook, un permiso negado— el juego
       sería imposible de jugar, y eso no es degradar, es romperse. */
    K_dedo.on = true; K_dedo.cx = x; K_dedo.cy = y; K_dedo.x = 0; K_dedo.y = 0;
  },
  mueve(x, y){
    if (!K_dedo.on) return;
    /* 150 unidades de arrastre son el tope, que es más o menos un pulgar */
    K_dedo.x = Math.max(-1, Math.min(1, (x - K_dedo.cx)/150));
    K_dedo.y = Math.max(-1, Math.min(1, (y - K_dedo.cy)/150));
  },
  sube(){ K_dedo.on = false; K_dedo.x = 0; K_dedo.y = 0; },

  fondo(g){ kGeo(); },
  pinta(g){ kPinta(g); },

  /* ══════════ EL AUTO-JUGADOR ══════════
     Va por el mismo camino que el jugador: mira el BFS hasta el próximo objetivo
     y ESCRIBE UNA INCLINACIÓN, o sea que pasa por la misma física, los mismos
     choques y los mismos pozos. Un bot que teletransportara la canica probaría
     que el laberinto tiene camino y nada más — que ya lo dice `audita()`. */
  juegaSolo(n, azar){
    this.arranca();
    let v = 0, pisoMax = 1, caidas = 0, vueltas = 0;
    const dt = 1/60;
    while (v < (n || 12000) && this.vivo){
      v++;
      if (K_fase === 'elige'){
        /* el honesto prefiere lo que le hace falta; el del azar toma cualquiera */
        let i = 0;
        if (!azar){
          const pref = ['freno', 'reloj', 'iman', 'vida', 'escudo', 'lenta'];
          let mejor = 99;
          for (let j = 0; j < K_oferta.length; j++){
            const p = pref.indexOf(K_oferta[j].k);
            if (p >= 0 && p < mejor){ mejor = p; i = j; }
          }
        } else i = (Math.random()*K_oferta.length) | 0;
        this.eligeMejora(i);
        continue;
      }
      K_forz = azar ? { x: Math.random()*2 - 1, y: Math.random()*2 - 1 } : kBotIncl();
      /* ── EL MÁXIMO SE MIDE EN CADA VUELTA Y NO AL ELEGIR ──
         Medido: devolvía `piso: 40` con `pisoMax: 32`. Cuando todas las mejoras
         llegaron a su tope no hay oferta, así que `sale()` avanza el piso sin
         pasar por la fase de elegir — y la métrica se quedaba atrás justo en la
         parte de la corrida que interesa medir. */
      pisoMax = Math.max(pisoMax, K_piso);
      const antes = K_vidas;
      this.paso(dt);
      if (K_vidas < antes) caidas++;
      vueltas++;
    }
    K_forz = null;
    return JSON.stringify({ piso: K_piso, pisoMax, puntos: K_puntos,
                            caidas, vidas: K_vidas, vueltas, vivo: this.vivo });
  },

  /* ══════════ LA AUDITORIA ══════════
     Genera los cien pisos y comprueba las cuatro propiedades. No los juega: eso
     lo hace `juegaSolo`, y son dos preguntas distintas —«existe el camino» y
     «se puede recorrer con esta física»— que hay que poder contestar por
     separado, porque si el bot falla hay que saber cuál de las dos falló. */
  audita(a, b){
    const malos = [], guardaM = K_mej;
    K_mej = {};
    let minReloj = 1e9, maxReloj = 0, minPasos = 1e9, maxPasos = 0;
    for (let n = (a || 1); n <= (b || K_PISOS); n++){
      const G = kGenera(n);
      const { d } = kBFS(G.m, G.w, G.h, G.ent);
      const fall = [];
      if (d.some(x => x < 0)) fall.push('celdas sueltas');
      if (G.sal === G.ent) fall.push('salida en la entrada');
      if (G.chis.length !== kNChis()) fall.push('faltan chispas');
      if (new Set(G.chis).size !== G.chis.length) fall.push('chispas repetidas');
      /* la comprobación que importa: el recorrido obligado no toca un pozo */
      let cur = G.ent;
      for (const p of G.chis.concat([G.sal])){
        const bb = kBFS(G.m, G.w, G.h, cur);
        if (bb.d[p] < 0){ fall.push('inalcanzable'); break; }
        for (const i of kCamino(bb.pa, cur, p)) if (G.pozo[i]) fall.push('pozo en el camino');
        cur = p;
      }
      if (G.pozo[G.ent]) fall.push('pozo en la entrada');
      if (G.pozo[G.sal]) fall.push('pozo en la salida');
      if (fall.length) malos.push([n, fall[0]]);
      minReloj = Math.min(minReloj, G.reloj); maxReloj = Math.max(maxReloj, G.reloj);
      minPasos = Math.min(minPasos, G.pasos); maxPasos = Math.max(maxPasos, G.pasos);
    }
    K_mej = guardaM;
    return JSON.stringify({ pisos: (b || K_PISOS) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            reloj: [minReloj, maxReloj], pasos: [minPasos, maxPasos] });
  },

  ver(){
    return JSON.stringify({
      piso: K_piso, fase: K_fase, vidas: K_vidas, esc: K_esc,
      reloj: +K_relojT.toFixed(1), de: K_reloj,
      chis: K_chis.filter(c => c.t).length + '/' + K_chis.length,
      can: [+CAN.x.toFixed(2), +CAN.y.toFixed(2)],
      vel: +Math.hypot(CAN.vx, CAN.vy).toFixed(2),
      reja: [K_W, K_H], pozos: K_pozo.filter(Boolean).length,
      mej: K_mej, oferta: K_oferta.map(o => o.k),
      giro: GIRO.estado, incl: [+kIncl().x.toFixed(2), +kIncl().y.toFixed(2)],
      puntos: K_puntos, vivo: this.vivo });
  },
  cfg(o){
    if (o.incl) K_forz = { x: o.incl[0], y: o.incl[1] };
    if (o.incl === null) K_forz = null;
    if (o.piso){ K_piso = o.piso; this.pisoNuevo(); }
    return this.ver();
  }
};

/* ── EL CHOQUE ──
   La canica es un círculo y las paredes son los lados de las celdas. Se prueba
   contra la pared del lado hacia el que se mueve, y basta con la celda actual y
   sus vecinas: una canica de radio 0,3 no puede tocar una pared a dos celdas. */
function kMueve(dx, dy, eje){
  let nx = CAN.x + dx, ny = CAN.y + dy;
  const r = CAN.r;
  const cx = Math.floor(CAN.x), cy = Math.floor(CAN.y);
  if (eje === 'x'){
    const i = kIx(Math.max(0, Math.min(K_W-1, cx)), Math.max(0, Math.min(K_H-1, cy)));
    if (dx > 0 && (K_mur[i] & 2) && nx > cx + 1 - r){ nx = cx + 1 - r; CAN.vx = -CAN.vx*kRebote(); kGolpe(); }
    if (dx < 0 && (K_mur[i] & 8) && nx < cx + r){ nx = cx + r; CAN.vx = -CAN.vx*kRebote(); kGolpe(); }
    nx = Math.max(r, Math.min(K_W - r, nx));
  } else {
    const i = kIx(Math.max(0, Math.min(K_W-1, cx)), Math.max(0, Math.min(K_H-1, cy)));
    if (dy > 0 && (K_mur[i] & 4) && ny > cy + 1 - r){ ny = cy + 1 - r; CAN.vy = -CAN.vy*kRebote(); kGolpe(); }
    if (dy < 0 && (K_mur[i] & 1) && ny < cy + r){ ny = cy + r; CAN.vy = -CAN.vy*kRebote(); kGolpe(); }
    ny = Math.max(r, Math.min(K_H - r, ny));
  }
  CAN.x = nx; CAN.y = ny;
}
let _golpeFrio = 0;
function kGolpe(){
  /* el sonido va con freno: sin él, una canica apoyada contra una pared suena
     sesenta veces por segundo, que es ruido blanco y no un golpe. Es
     exactamente el defecto que Maicol ya tuvo con las pisadas. */
  const v = Math.hypot(CAN.vx, CAN.vy);
  if (v < 0.35 || _golpeFrio > 0) return;
  _golpeFrio = 0.09;
  son('caida', Math.min(0.55, v*0.13));
}

/* ── EL BOT: HACIA DÓNDE INCLINAR ──
   Se apunta al CENTRO de la celda siguiente y no al objetivo final: apuntando
   derecho al objetivo, la canica se pega a la pared que hay en el medio y se
   queda ahí. Es la misma lección que en LEMI hizo falta con el camello. */
function kBotIncl(){
  const ci = kIx(Math.max(0, Math.min(K_W-1, Math.floor(CAN.x))),
                 Math.max(0, Math.min(K_H-1, Math.floor(CAN.y))));
  const falta = K_chis.filter(c => !c.t);
  const meta = falta.length ? falta[0].i : K_sal;
  const { pa } = kBFS(K_mur, K_W, K_H, meta);
  const sig = pa[ci] >= 0 ? pa[ci] : meta;
  const tx = (sig % K_W) + 0.5, ty = ((sig/K_W)|0) + 0.5;
  let dx = tx - CAN.x, dy = ty - CAN.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;
  /* ── Y FRENA ANTES DE LLEGAR ──
     Inclinando siempre hacia adelante, la canica llega a la esquina a toda
     velocidad y se pasa: es exactamente el error que comete una persona. El bot
     compensa restando la velocidad que trae, que es lo que hace alguien que
     aprendió a jugarlo. */
  return { x: Math.max(-1, Math.min(1, dx*1.6 - CAN.vx*0.42)),
           y: Math.max(-1, Math.min(1, dy*1.6 - CAN.vy*0.42)) };
}

function kSorteaOferta(){
  const hay = K_MEJ.filter(m => (K_mej[m.k] || 0) < m.tope);
  for (let i = hay.length - 1; i > 0; i--){
    const j = (Math.random()*(i + 1)) | 0;
    const t = hay[i]; hay[i] = hay[j]; hay[j] = t;
  }
  return hay.slice(0, 3);
}

/* ══════════ DIBUJO ══════════ */
function kPinta(g){
  kGeo();
  const s = KG.s;
  /* ── LA BANDEJA, Y SU MADERA VA COMO PATRON ANCLADO AL MUNDO ──
     `createPattern` queda atado al origen de la TRANSFORMACION del contexto, no
     al rectángulo que se rellena: dibujado sin correr el lienzo, el patrón se
     desliza por debajo de la bandeja cuando la bandeja cambia de sitio entre
     pisos. Es exactamente el defecto que ya costó una vuelta con el piso de
     MANCHA. */
  const pat = patron('madera');
  caja2(KG.x0 - 10, KG.y0 - 10, K_W*s + 20, K_H*s + 20, 14,
        'rgba(26,20,14,.78)', 'rgba(255,220,168,.22)');
  if (pat){
    g.save();
    g.beginPath();
    caja2(KG.x0 - 10, KG.y0 - 10, K_W*s + 20, K_H*s + 20, 14, null, null);
    g.clip();
    g.translate(KG.x0, KG.y0);
    g.globalAlpha = 0.72;
    g.fillStyle = pat;
    g.fillRect(-10, -10, K_W*s + 20, K_H*s + 20);
    g.restore();
  }
  /* el piso de cada celda, con una trama que ancla el laberinto al mundo */
  g.fillStyle = 'rgba(255,235,205,.045)';
  for (let y = 0; y < K_H; y++) for (let x = 0; x < K_W; x++)
    if ((x + y) & 1) g.fillRect(KG.x0 + x*s, KG.y0 + y*s, s, s);

  /* ── LA SALIDA, Y SU ESTADO CERRADO TAMBIÉN TIENE QUE LEERSE ──
     Estaba en 0,12 de alfa sobre la madera y medido en la captura era un
     rectángulo gris que no se distinguía de una tabla: el jugador no sabía a
     dónde tenía que ir hasta juntar la última chispa. Cerrada va marcada con una
     cruz de trazos —o sea «acá es, y todavía no»— y abierta se enciende con un
     halo que late. Las dos cosas dicen lo mismo del sitio y distinto del estado,
     que es exactamente lo que hace falta. */
  const listo = K_chis.every(c => c.t);
  const sx = (K_sal % K_W), sy = (K_sal/K_W)|0;
  const bx = KG.x0 + sx*s + 3, by = KG.y0 + sy*s + 3, bs = s - 6;
  if (listo){
    const la = 0.62 + 0.20*Math.sin(performance.now()*0.006);
    g.globalAlpha = 0.35;
    disco(bx + bs/2, by + bs/2, bs*0.82, '#8ad7ff');
    g.globalAlpha = 1;
    caja2(bx, by, bs, bs, 8, 'rgba(138,215,255,' + la.toFixed(2) + ')',
          'rgba(220,245,255,.95)');
  } else {
    caja2(bx, by, bs, bs, 8, 'rgba(138,215,255,.14)', 'rgba(138,215,255,.55)');
    g.strokeStyle = 'rgba(138,215,255,.55)'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(bx + bs*0.26, by + bs*0.26); g.lineTo(bx + bs*0.74, by + bs*0.74);
    g.moveTo(bx + bs*0.74, by + bs*0.26); g.lineTo(bx + bs*0.26, by + bs*0.74);
    g.stroke();
  }

  /* los pozos: un disco negro con reborde. Sin el reborde, sobre una bandeja
     oscura un disco negro no se ve — y un pozo que no se ve no es una trampa,
     es una injusticia. */
  for (let i = 0; i < K_pozo.length; i++){
    if (!K_pozo[i]) continue;
    const px = kPX((i % K_W) + 0.5), py = kPY(((i/K_W)|0) + 0.5);
    const pr = kPozoR()*s;
    if (dibCuadroWH('cosas', 2, px, py, pr*2.3, pr*2.3)) continue;
    disco(px, py, pr, '#080604');
    g.strokeStyle = 'rgba(255,220,168,.30)'; g.lineWidth = 2;
    g.beginPath(); g.arc(px, py, pr, 0, 7); g.stroke();
  }

  /* las chispas */
  for (const c of K_chis){
    if (c.t) continue;
    const px = kPX((c.i % K_W) + 0.5), py = kPY(((c.i/K_W)|0) + 0.5);
    const la = 1 + Math.sin(performance.now()*0.004 + c.i)*0.14;
    /* el halo va SIEMPRE, también con el sprite puesto: es lo que hace que la
       chispa se vea de lejos en un laberinto oscuro, y una imagen recortada no
       lo puede traer porque el halo es aditivo sobre lo que haya detrás */
    g.globalAlpha = 0.30;
    disco(px, py, s*0.30*la, '#ffd76a');
    g.globalAlpha = 1;
    if (!dibCuadroWH('cosas', 1, px, py, s*0.46*la, s*0.46*la))
      disco(px, py, s*0.15*la, '#ffd76a');
  }

  /* ── LAS PAREDES, EN UN SOLO TRAZO Y CON LA ENTRADA EN DIAGONAL ──
     Un `stroke()` por pared serían doscientas órdenes de dibujo por cuadro para
     pintar líneas que no se mueven. Y la entrada se hace saltando las paredes
     que todavía no llegaron, no escalando: escalar cada una obligaría a un
     `save`/`restore` por pared y perdería el trazo único, que es justamente lo
     que hace que el laberinto cueste una orden. */
  g.strokeStyle = '#e8c79a'; g.lineWidth = Math.max(3, s*0.09);
  g.lineCap = 'round';
  g.beginPath();
  for (let y = 0; y < K_H; y++) for (let x = 0; x < K_W; x++){
    if (entradaK(x + y, K_W + K_H - 2) <= 0) continue;
    const m = K_mur[kIx(x, y)], X = KG.x0 + x*s, Y = KG.y0 + y*s;
    if (m & 1){ g.moveTo(X, Y); g.lineTo(X + s, Y); }
    if (m & 8){ g.moveTo(X, Y); g.lineTo(X, Y + s); }
    if (x === K_W-1 && (m & 2)){ g.moveTo(X + s, Y); g.lineTo(X + s, Y + s); }
    if (y === K_H-1 && (m & 4)){ g.moveTo(X, Y + s); g.lineTo(X + s, Y + s); }
  }
  g.stroke();

  /* la brújula: una flecha desde la canica hacia la salida */
  if (kM('brujula') && K_fase === 'juega'){
    const ax = kPX(CAN.x), ay = kPY(CAN.y);
    const bx = kPX(sx + 0.5), by = kPY(sy + 0.5);
    const a = Math.atan2(by - ay, bx - ax);
    g.save(); g.translate(ax, ay); g.rotate(a);
    g.globalAlpha = 0.55; g.fillStyle = '#8ad7ff';
    g.beginPath(); g.moveTo(s*0.62, 0); g.lineTo(s*0.42, -s*0.13);
    g.lineTo(s*0.42, s*0.13); g.closePath(); g.fill();
    g.restore(); g.globalAlpha = 1;
  }

  /* la canica: un disco con brillo arriba a la izquierda y sombra abajo. Con un
     disco liso se lee a ficha; el brillo es lo único que la hace esférica. */
  if (K_muerto <= 0 || ((K_muerto*10)|0) & 1) kCanica(g, kPX(CAN.x), kPY(CAN.y), CAN.r*s);

  /* el escudo, como un anillo alrededor */
  if (K_esc > 0 && K_muerto <= 0){
    g.strokeStyle = 'rgba(138,215,255,.75)'; g.lineWidth = 3;
    g.beginPath(); g.arc(kPX(CAN.x), kPY(CAN.y), CAN.r*s + 7, 0, 7); g.stroke();
  }

  /* el reloj, como un arco arriba del laberinto: se lee de reojo, que es lo que
     hace falta cuando las dos manos están ocupadas sosteniendo el aparato */
  const u = this && K_reloj > 0 ? K_relojT/K_reloj : 0;
  /* ── Y ESTAS TRES NO SE LLAMAN `bx`/`by` ──
     La caja de la salida ya usa esos nombres en la MISMA función, y un `const`
     declarado dos veces en el mismo ámbito no es un aviso: tira al parsear y se
     lleva el módulo entero — medido, el juego se quedaba en la pantalla de
     idioma con `__J` sin definir. Es la undécima vez en este repo. */
  const rw = Math.min(430, AN - 120), rx = (AN - rw)/2, ry = KG.y0 - 46;
  caja2(rx, ry, rw, 14, 7, 'rgba(255,255,255,.08)', null);
  if (u > 0) caja2(rx, ry, Math.max(14, rw*u), 14, 7,
                   u < 0.25 ? '#ff6a5a' : '#8ad7ff', null);

  /* ── Y SE DICE POR QUÉ SE FALLÓ ──
     Sin esto, caerse en un pozo y quedarse sin tiempo se ven igual: la canica
     vuelve al principio y una vida menos. Dos causas distintas que producen la
     misma imagen es lo que hace que un jugador no aprenda nada del error. */
  if (K_avisoT > 0 && K_aviso){
    const a = Math.min(1, K_avisoT/0.5);
    texto(TX(K_aviso), AN/2, KG.y0 - 92, 32,
          'rgba(255,106,90,' + a.toFixed(2) + ')', '800', 'center');
  }
  if (K_fase === 'elige'){
    kCartas(g, K_oferta);
    texto(TX('elegi'), AN/2, AL*0.20, 26, '#8ad7ff', '800', 'center');
  }
}

function kCanica(g, x, y, r){
  if (dibCuadroWH('cosas', 0, x, y, r*2.2, r*2.2)) return;
  const gr = g.createRadialGradient(x - r*0.34, y - r*0.34, r*0.1, x, y, r);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.42, '#bfe8ff');
  gr.addColorStop(1, '#3d7ea8');
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.globalAlpha = 0.8;
  disco(x - r*0.36, y - r*0.36, r*0.20, '#ffffff');
  g.globalAlpha = 1;
}

/* las tres cartas de mejora. Van en el lienzo y no en DOM porque aparecen y se
   van con la partida, y el texto igual pasa por TX(), así que están traducidas. */
let KC = { w: 0, h: 0, x0: 0, y: 0 };
function kCartas(g, lista){
  KC.w = Math.min(196, (AN - 56)/3 - 12);
  KC.h = KC.w*1.62;
  const tot = lista.length*KC.w + (lista.length - 1)*14;
  KC.x0 = (AN - tot)/2; KC.y = AL*0.30;
  for (let i = 0; i < lista.length; i++){
    const x = KC.x0 + i*(KC.w + 14);
    caja2(x, KC.y, KC.w, KC.h, 18, 'rgba(18,14,10,.94)', 'rgba(255,220,168,.55)');
    const n = (K_mej[lista[i].k] || 0);
    /* el icono generado, arriba del nombre: en una carta que se elige en dos
       segundos, la forma se reconoce antes que el texto — y el índice sale del
       orden de `K_MEJ`, o sea que la hoja y la lista no pueden desalinearse sin
       que alguien mueva las dos */
    const ii = K_MEJ.findIndex(m => m.k === lista[i].k);
    const conIc = ii >= 0 && dibCuadroWH('mejo', ii, x + KC.w/2, KC.y + 46, 52, 52);
    const y0 = conIc ? KC.y + 92 : KC.y + 40;
    texto(TX('m_' + lista[i].k), x + KC.w/2, y0, 19, '#ffd76a', '800', 'center');
    /* la descripción va partida a mano por ancho: un `fillText` no envuelve */
    const pal = TX('d_' + lista[i].k).split(' ');
    let ln = '', yy = y0 + 34;
    for (const p of pal){
      const pr = ln ? ln + ' ' + p : p;
      g.font = '600 15px ui-sans-serif,system-ui,sans-serif';
      if (g.measureText(pr).width > KC.w - 22 && ln){
        texto(ln, x + KC.w/2, yy, 15, 'rgba(242,238,230,.78)', '600', 'center');
        ln = p; yy += 20;
      } else ln = pr;
    }
    if (ln) texto(ln, x + KC.w/2, yy, 15, 'rgba(242,238,230,.78)', '600', 'center');
    if (n > 0) texto('×' + n, x + KC.w/2, KC.y + KC.h - 22, 15,
                     'rgba(255,215,106,.65)', '800', 'center');
  }
}
function kCartaEn(x, y){
  if (y < KC.y || y > KC.y + KC.h) return -1;
  for (let i = 0; i < K_oferta.length; i++){
    const cx = KC.x0 + i*(KC.w + 14);
    if (x >= cx && x <= cx + KC.w) return i;
  }
  return -1;
}

/* la cinemática usa el laberinto de verdad, así que lo que se ve en la escena
   es exactamente lo que se ve jugando */
function kDemo(g, u, plano){
  const guardaW = K_W, guardaH = K_H, guardaM = K_mur, guardaP = K_pozo;
  const guardaC = K_chis, guardaS = K_sal, guardaF = K_fase;
  const gx = CAN.x, gy = CAN.y, gr = CAN.r;
  const G = kGenera(3);
  K_W = G.w; K_H = G.h; K_mur = G.m; K_sal = G.sal;
  K_pozo = plano >= 1 ? G.pozo : new Array(G.w*G.h).fill(false);
  K_chis = plano >= 1 ? G.chis.map((i, k) => ({ i, t: plano === 2 })) : [];
  K_fase = 'juega';
  kGeo();
  /* la canica recorre el principio del camino: en un plano quieto no se ve que
     rueda, y rodar es todo lo que este juego hace */
  const b = kBFS(G.m, G.w, G.h, G.ent);
  const cam = kCamino(b.pa, G.ent, G.sal);
  const t = Math.min(cam.length - 1.001, u*Math.min(6, cam.length - 1));
  const a = cam[Math.floor(t)], bb = cam[Math.floor(t) + 1] || a;
  const f = t - Math.floor(t);
  CAN.x = ((a % G.w) + 0.5)*(1 - f) + ((bb % G.w) + 0.5)*f;
  CAN.y = (((a/G.w)|0) + 0.5)*(1 - f) + (((bb/G.w)|0) + 0.5)*f;
  CAN.r = 0.30;
  kPinta(g);
  K_W = guardaW; K_H = guardaH; K_mur = guardaM; K_pozo = guardaP;
  K_chis = guardaC; K_sal = guardaS; K_fase = guardaF;
  CAN.x = gx; CAN.y = gy; CAN.r = gr;
}
