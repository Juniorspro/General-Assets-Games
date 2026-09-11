/* ══════════════════════════════ CASTILLO ══════════════════════════════
   Una catapulta de este lado y del otro una torre de piedra con el rey adentro.
   Se arrastra para tensar, la piedra sale y la torre SE DERRUMBA: lo que gana el
   nivel no es acertarle al rey sino tirarle la torre encima.

   ── POR QUÉ ESTO NO ES ARCO CON OTRO DIBUJO ──
   En ARCO el blanco es una persona y lo único que importa es dónde pega la
   flecha. Acá el blanco es una ESTRUCTURA, y lo que importa es dónde pegarle
   PARA QUE SE CAIGA: el mismo tiro que le saca veinte de vida a un arquero puede
   no hacer nada contra un muro o tirar la torre entera si le da a la columna que
   la sostiene. El verbo no es apuntar, es leer el edificio.

   Y por eso la escena CAMBIA entre tiro y tiro: la torre que queda después del
   primero es otro problema que el que había. Un juego de artillería con el
   blanco intacto es el mismo tiro repetido.

   ── LA FÍSICA: AABB CON IMPULSOS, Y LA ROTACIÓN ES COSMÉTICA ──
   Los bloques no rotan mientras están apoyados. Es una decisión y no una
   limitación: un solver de OBB con rotación necesita SAT, puntos de contacto y
   varias pasadas para no temblar, y a este tamaño —bloques de treinta píxeles en
   un teléfono— la diferencia visible es casi ninguna. Lo que SÍ rota es un
   bloque en el aire, que es cuando se nota, y al apoyar el giro vuelve a cero.
   La misma decisión que ya se tomó con los dados guardados de DADOS. */

/* ── EL MUNDO MIDE 820 Y NO 1250, Y ESO SE MIDIÓ EN LA CAPTURA ──
   Con 1250, encuadrar la catapulta y la torre a la vez deja el zoom en 0,67: la
   torre —que mide 170 de ancho— sale en SESENTA Y CINCO PÍXELES sobre una
   pantalla de 412, o sea que el edificio que hay que leer no se lee. Y leerlo es
   el juego entero. Con 820 el tramo util baja de 730 a 570 y el zoom sube a
   1,26: la torre pasa a 123 pixeles de ancho y unos 280 de alto. El precio es
   que el tiro es mas corto, y eso se ve en los bots, no en una opinion. */
const K_MUNDO = 820;
const K_G = 1500;
const K_VMAX = 1300;
const K_TENSA = 250;
/* ── EL SUELO CAE EN EL 0,74 Y NO EN EL 0,82 ──
   Con 0,82 el pie de la torre quedaba tapado por la leyenda y por los dos
   botones de abajo, que son DOM: la base de la cámara del rey —o sea justo lo
   que hay que mirar para saber donde pegarle— salía cortada. */
const K_ALTO_A = 0.74;
const K_OJO = 40;

/* ── LOS MATERIALES ──
   La madera se rompe, la piedra pesa y el hielo resbala. Tres números por
   material y de ahí sale todo el juego: qué conviene golpear primero, qué
   aguanta y qué se lleva puesto lo de arriba al caerse. */
const K_MAT = [
  { k: 'madera', col: '#a8763c', bor: '#6b4820', dens: 0.75, vida: 26, roce: 0.62 },
  { k: 'piedra', col: '#9a9a96', bor: '#5e5e5a', dens: 1.55, vida: 60, roce: 0.70 },
  { k: 'hielo',  col: '#8fd4e8', bor: '#4a8fa8', dens: 0.55, vida: 16, roce: 0.16 },
];

let K_bloques = [];            /* {x,y,w,h,vx,vy,mat,vida,gi,vgi,quieto} */
let K_rey = null;
let K_piedra = null;
let K_estela = [];
let K_nivel = 1, K_tiros = 0, K_tope = 0, K_puntos = 0;
let K_fase = 'apunta';         /* apunta · vuela · asienta · fin */
let K_t = 0, K_lento = 0;
let K_arr = null;
let K_msg = '', K_msgT = 0;      /* el aviso corto del impacto */
let K_asentando = false;         /* los 90 pasos previos: no hacen dano */
let K_eMax = 0;                  /* la energia mas alta con la que algo toco al rey */
let K_rotos = 0;                 /* bloques que se rompieron con el ultimo tiro */
let K_camX = 0, K_camZ = 1, K_camMX = 0, K_camMZ = 1;
let K_azar = 11;
function kAz(){ K_azar = (K_azar*1664525 + 1013904223) >>> 0; return K_azar / 4294967296; }

const K_NIVELES = 60;
const kSuelo = () => 420;

/* ══════════ EL GENERADOR DE TORRES ══════════
   Cinco plantas, y cada una se elige por el nivel: las primeras son pilares y
   dintel —que se caen de un golpe bien puesto— y las últimas mezclan piedra con
   hielo, que es lo que obliga a pensar en qué orden pegarle.

   ── Y LA TORRE SE DEJA ASENTAR ANTES DE EMPEZAR ──
   Generada y puesta a jugar en el mismo cuadro, los bloques caen unos píxeles al
   resolverse los contactos y la torre «se mueve sola» antes del primer tiro. Se
   simulan noventa pasos con el jugador congelado, así que lo que ve es una torre
   que ya está en reposo. */
function kPlanta(tipo, x0, ancho, y, mat){
  const b = [];
  const put = (x, yy, w, h, m) => b.push({ x, y: yy, w, h, mat: m,
    vida: K_MAT[m].vida, vx: 0, vy: 0, gi: 0, vgi: 0, quieto: 0 });
  if (tipo === 0){
    /* pilares y dintel: la planta clásica, y la que enseña que pegarle a una
       pata tira todo lo de arriba */
    put(x0, y - 60, 22, 60, mat);
    put(x0 + ancho - 22, y - 60, 22, 60, mat);
    put(x0 - 6, y - 78, ancho + 12, 18, mat);
  } else if (tipo === 1){
    /* muro macizo: aguanta de frente y se lleva todo si se le saca la base */
    put(x0, y - 46, ancho, 46, mat);
  } else if (tipo === 2){
    /* tres pilares: más estable, hay que sacar dos */
    const w = 20, sep = (ancho - w)/2;
    for (let i = 0; i < 3; i++) put(x0 + i*sep - (i === 2 ? w : 0), y - 56, w, 56, mat);
    put(x0 - 6, y - 74, ancho + 12, 18, mat);
  } else {
    /* cámara hueca: dos pilares anchos y un techo, con sitio para el rey */
    put(x0, y - 72, 30, 72, mat);
    put(x0 + ancho - 30, y - 72, 30, 72, mat);
    put(x0 - 8, y - 92, ancho + 16, 20, mat);
  }
  return b;
}

/* ── EL REY VA ABAJO, Y ESO NO ES UN DETALLE DE COMPOSICIÓN ──
   La primera version lo ponia en la camara de ARRIBA. Y ahi el juego no se
   podia ganar como dice su propio subtitulo: si el rey esta en lo mas alto, lo
   unico que puede caerle encima es su propio techo, y todo lo que uno le tire a
   la torre se desarma HACIA LOS COSTADOS dejandolo de pie. Medido con la traza
   tiro a tiro: en los niveles de dos plantas el derrumbe le sacaba CERO, y los
   unicos puntos venian de pegarle a el con la piedra, 42 cada uno, con cuatro
   tiros de tope para bajar cien de vida.

   Con la camara en la BASE, todo lo que hay arriba es peso que se le puede
   tirar encima, que es literalmente el verbo del juego. Y de paso queda
   protegido de un tiro directo: sus dos pilares le tapan los costados y su
   techo le tapa el arco, asi que la piedra no lo alcanza hasta que la
   estructura se rompe. */
function kGenera(n){
  K_azar = (n*2654435761) >>> 0;
  for (let i = 0; i < 6; i++) kAz();
  const plantas = Math.min(6, 2 + Math.floor((n - 1)/10));
  const x0 = K_MUNDO - 420, ancho = 170;
  const b = [];
  let y = kSuelo();
  let camX = x0;
  /* ── EL ZÓCALO: LA CÁMARA NO SIEMPRE ESTÁ EN EL SUELO ──
     Con la cámara SIEMPRE en la base, el punto débil está siempre en el mismo
     sitio y el nivel 60 se juega igual que el 1 — medido, el bot ganaba los
     sesenta con el mismo tiro a (845,384) repetido. Con el zócalo, las patas
     que hay que sacar son las del muro macizo de abajo y el tiro plano ya no
     llega a la altura de la cámara. */
  const zocalo = n > 15 && kAz() < 0.42;
  if (zocalo){
    for (const z of kPlanta(1, x0, ancho, y, 1)) b.push(z);
    y -= 46;
  }
  for (let p = 0; p < plantas; p++){
    /* el hielo sólo aparece pasado el nivel 12, y nunca en la planta de abajo:
       una base de hielo hace que la torre se caiga sola y el nivel se gana sin
       tirar */
    /* ── LA CÁMARA DEL REY ES SIEMPRE DE PIEDRA, Y ESO SE MIDIÓ ──
       Con la cámara de madera, el techo se rompe DE UN TIRO —la piedra llega
       con unos 900 de velocidad y eso son 50 de daño contra 26 de vida— y
       entonces el peso que tenía que caerle encima al rey se evapora en el
       mismo tiro que iba a tirárselo. Medido con la traza: `enc` pasaba de 2457
       a 0 y la energía con la que algo tocó al rey era CERO en los cuatro
       tiros. De piedra aguanta el primer golpe y hay que sacarle las patas. */
    let mat = p === 0 ? 1 : 0;
    if (p > 0 && n > 5) mat = kAz() < 0.45 ? 1 : 0;
    if (p > 0 && n > 12 && kAz() < 0.30) mat = 2;
    const tipo = p === 0 ? 3 : (kAz()*3)|0;
    const dx = p === 0 ? 0 : (kAz() - 0.5)*22;
    if (p === 0) camX = x0 + dx;
    const pl = kPlanta(tipo, x0 + dx, ancho, y, mat);
    for (const z of pl) b.push(z);
    y -= (tipo === 3 ? 92 : (tipo === 1 ? 46 : (tipo === 0 ? 78 : 74)));
  }
  /* apoyado en el suelo, adentro de la camara. El «−r−1» no es un detalle:
     poniendo el CENTRO sobre la superficie queda medio rey enterrado, y
     enterrado el empuje de separacion sale por una normal degenerada y lo manda
     para abajo atravesando el piso. */
  const rr = 17;
  const reyY = (zocalo ? kSuelo() - 46 : kSuelo()) - rr - 1;
  const rey = { x: camX + ancho/2, y: reyY, r: rr, vida: 100, vx: 0, vy: 0 };

  /* ── LA BARBACANA: EL MURO QUE TAPA EL TIRO PLANO ──
     Sin ella hay UNA respuesta y es siempre la misma: el tiro plano y rápido a
     la pata izquierda de la cámara. Un muro de madera delante la tapa, y
     entonces el nivel pide otra cosa —romperlo primero, o pasar por arriba y
     caer sobre el techo—. Va de MADERA y no de piedra a propósito: de piedra
     serían dos tiros de peaje en todos los niveles, que es alargar y no
     complicar. Y se rompe o se vuelca hacia adentro, así que a veces el propio
     muro es la herramienta. */
  if (n > 7 && kAz() < 0.55){
    const mx = x0 - 54;
    let my = kSuelo();
    for (let i = 0; i < 2; i++){
      b.push({ x: mx, y: my - 62, w: 26, h: 62, mat: 0, vida: K_MAT[0].vida,
               vx: 0, vy: 0, gi: 0, vgi: 0, quieto: 0 });
      my -= 62;
    }
  }
  /* los tiros que da el nivel: sale de las PLANTAS y no de un número a mano —
     una torre de seis pisos con tres tiros es imposible y con doce es un
     trámite */
  const tope = 2 + plantas;
  return { b, rey, tope };
}

/* ══════════ LOS TEXTOS ══════════ */
const JT = {
  es: { sub:'Arrastrá para tensar. Tirale la torre encima al rey.',
        c1:'Arrastrá hacia atrás para tensar la catapulta.',
        c2:'La torre se cae. Pegale donde la sostiene.',
        c3:'El rey se lleva lo que le caiga encima. Sesenta castillos.',
        nivelC:'CASTILLO', tirosC:'TIROS', reyC:'REY',
        derrumbe:'¡SE CAE!', golpe:'GOLPE', gano:'¡EL REY CAYÓ!',
        madera:'MADERA', piedra:'PIEDRA', hielo:'HIELO' },
  en: { sub:'Drag to draw. Bring the tower down on the king.',
        c1:'Drag back to load the catapult.',
        c2:'The tower falls. Hit what holds it up.',
        c3:'Whatever lands on the king hurts him. Sixty castles.',
        nivelC:'CASTLE', tirosC:'SHOTS', reyC:'KING',
        derrumbe:'IT FALLS!', golpe:'HIT', gano:'THE KING IS DOWN!',
        madera:'WOOD', piedra:'STONE', hielo:'ICE' },
  pt: { sub:'Arraste para esticar. Derrube a torre no rei.',
        c1:'Arraste para trás para carregar a catapulta.',
        c2:'A torre cai. Acerte no que a sustenta.',
        c3:'O que cair em cima do rei machuca. Sessenta castelos.',
        nivelC:'CASTELO', tirosC:'TIROS', reyC:'REI',
        derrumbe:'ESTÁ CAINDO!', golpe:'ACERTOU', gano:'O REI CAIU!',
        madera:'MADEIRA', piedra:'PEDRA', hielo:'GELO' }
};
const PIEL = { ac:'#c98a3c', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tensa', pierde:'grito', gana:'gana',
                    clic:'clic', caida:'tira' };
const AMB = {
  foto: 'f_castillo',
  cielo: ['#3a4f7a', '#c9a06a'],
  haz: 0.10,
  vineta: 0.38,
  part: { n: 14, dir: 'cae', forma: 'disco', col: '#e8d0a8',
          r0: 1.4, r1: 3.4, v0: 8, v1: 24, amp: 44, gira: 0,
          a0: 0.08, a1: 0.20 }
};

/* ══════════ LA CÁMARA ══════════ */
function kCam(g){
  g.save();
  g.translate(AN/2, AL*K_ALTO_A);
  g.scale(K_camZ, K_camZ);
  g.translate(-K_camX, -(kSuelo() - K_OJO));
}
function kAMundo(px, py){
  return { x: (px - AN/2)/K_camZ + K_camX,
           y: (py - AL*K_ALTO_A)/K_camZ + kSuelo() - K_OJO };
}
function kCamPaso(dt){
  if (K_fase === 'vuela' && K_piedra){ K_camMX = K_piedra.x; K_camMZ = 0.84; }
  else {
    /* el tramo util va de la catapulta al borde derecho de la torre, no del
       cero al ancho del mundo: entre medio no hay nada que mirar */
    const i0 = 60, i1 = K_MUNDO - 420 + 230;
    K_camMX = (i0 + i1)/2;
    K_camMZ = Math.max(0.42, Math.min(1.45, AN/(i1 - i0)));
  }
  const k = Math.min(1, dt*(K_fase === 'vuela' ? 6.5 : 3.2));
  K_camX += (K_camMX - K_camX)*k;
  K_camZ += (K_camMZ - K_camZ)*k;
}

const JUEGO = {
  id: 'castillo',
  tipo: 'niveles',
  nivelesTotal: K_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return Math.max(0, K_tope - K_tiros); },
  get sub(){ return TX('tirosC'); },
  get ficI(){ return TX('nivelC') + ' ' + NIVEL; },
  get ficD(){ return TX('reyC') + ' ' + Math.max(0, Math.round(K_rey ? K_rey.vida : 0)); },
  get resta(){ return K_rey ? Math.max(0, Math.min(1, K_rey.vida/100)) : 0; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ kDemo(g, u, 0); } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){ kDemo(g, u, 1); } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){ kDemo(g, u, 2); } }
  ],

  arranca(n){
    K_nivel = n || 1;
    const G = kGenera(K_nivel);
    K_bloques = G.b; K_rey = G.rey; K_tope = G.tope;
    K_tiros = 0; K_puntos = 0; K_piedra = null; K_estela.length = 0;
    K_fase = 'apunta'; K_t = 0; K_lento = 0; K_arr = null;
    K_msg = ''; K_msgT = 0; K_rotos = 0;
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
    /* ── LA TORRE SE ASIENTA ANTES DE EMPEZAR ──
       Sin esto los bloques caen unos píxeles en los primeros cuadros y la torre
       parece moverse sola antes de que nadie la toque. */
    K_asentando = true;
    for (let i = 0; i < 90; i++) kFisica(1/60);
    K_asentando = false;
    /* el asentado puede haber roto algo: se limpia DESPUÉS, que si no el primer
       tiro nace con el contador del arranque puesto y el aviso miente */
    K_rotos = 0; K_msg = ''; K_msgT = 0;
    K_camX = (60 + K_MUNDO - 420 + 230)/2;
    K_camZ = Math.max(0.42, Math.min(1.45, AN/(K_MUNDO - 420 + 170)));
  },

  paso(dt){
    const dtm = K_lento > 0 ? dt*0.24 : dt;
    if (K_lento > 0) K_lento = Math.max(0, K_lento - dt);
    if (K_msgT > 0) K_msgT = Math.max(0, K_msgT - dt);
    kCamPaso(dt);
    kFisica(dtm);
    if (K_fase === 'vuela'){
      const p = K_piedra;
      p.vy += K_G*dtm;
      p.x += p.vx*dtm; p.y += p.vy*dtm;
      p.gi += p.vgi*dtm;
      K_estela.push({ x: p.x, y: p.y, t: 0.55 });
      if (K_estela.length > 80) K_estela.shift();
      for (const e of K_estela) e.t -= dtm;
      const z = kPiedraChoca(p, dtm);
      if (z || p.y > kSuelo() || p.x < -200 || p.x > K_MUNDO + 260){
        if (p.y > kSuelo() && !z){ p.y = kSuelo(); son('caida', 0.5); }
        K_piedra = null;
        K_fase = 'asienta'; K_t = 0;
      }
      return;
    }
    if (K_fase === 'asienta'){
      K_t += dt;
      /* se espera a que TODO se quede quieto y no un tiempo fijo: con un tiempo
         fijo, un derrumbe largo se corta a la mitad y el nivel se juzga con la
         torre todavía cayéndose */
      if ((kTodoQuieto() && K_t > 0.5) || K_t > 6) this.termina();
      return;
    }
  },

  termina(){
    if (K_rey.vida <= 0){
      this.gano = true;
      /* tres estrellas es ganar con la mitad de los tiros: el tope sale de las
         plantas, así que la vara escala con el castillo y no es un deseo */
      const v3 = Math.max(1, Math.ceil(K_tope*0.5));
      this.estrellas = K_tiros <= v3 ? 3 : (K_tiros <= K_tope - 1 ? 2 : 1);
      this.finP = TX('tirosC') + ' ' + K_tiros + '  ·  ★★★ ' + v3;
      son('gana', 1); destella('#ffd76a', 1.0);
      this.vivo = false;
      return;
    }
    if (K_tiros >= K_tope){ son('pierde'); this.vivo = false; return; }
    K_fase = 'apunta'; K_t = 0; K_arr = null;
  },

  tira(ang, f){
    const v = Math.max(0.14, Math.min(1, f))*K_VMAX;
    K_piedra = { x: 120, y: kSuelo() - 96, r: 15,
                 vx: Math.cos(ang)*v, vy: -Math.sin(ang)*v, gi: 0, vgi: 6 };
    K_estela.length = 0;
    K_rotos = 0; K_msg = ''; K_msgT = 0;
    K_tiros++;
    K_fase = 'vuela';
    son('caida', 0.9); sacude(0.14);
  },

  baja(px, py){
    if (MODO !== 'juega' || K_fase !== 'apunta') return;
    K_arr = { x0: px, y0: py, x: px, y: py };
    son('toque', 0.5);
  },
  mueve(px, py){ if (K_arr){ K_arr.x = px; K_arr.y = py; } },
  sube(){
    if (!K_arr || K_fase !== 'apunta'){ K_arr = null; return; }
    const t = kTension();
    K_arr = null;
    if (t.f < 0.10) return;
    this.tira(t.ang, t.f);
  },

  fondo(g){},
  pinta(g){ kPinta(g); },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto le apunta a la PATA MÁS BAJA que sostiene la torre; el otro tira
     a cualquier bloque. Si leer el edificio no sirviera, los dos ganarían igual
     de seguido — y eso es toda la diferencia entre este juego y ARCO. */
  juegaSolo(n, azar){
    let gana = 0, malos = [], tiros = 0;
    const dt = 1/60;
    for (let niv = 1; niv <= (n || K_NIVELES); niv++){
      this.arranca(niv);
      let v = 0;
      while (this.vivo && v < 9000){
        v++;
        if (K_fase === 'apunta'){
          let mira;
          if (azar){
            /* el bot al azar le apunta a UN bloque cualquiera, que es lo que
               hace alguien que todavia no entendio que la torre sostiene algo */
            const vivos = K_bloques.filter(z => z.vida > 0);
            if (!vivos.length){ mira = { x: K_rey.x, y: K_rey.y }; }
            else { const z = vivos[(Math.random()*vivos.length)|0];
                   mira = { x: z.x + z.w/2, y: z.y + z.h/2 }; }
          } else mira = kBotMira();
          if (!mira) break;
          const t = azar ? kTiroA(mira.x, mira.y) : kBotTiro(mira);
          this.tira(t.ang, t.f);
          tiros++;
        }
        this.paso(dt);
      }
      if (this.gano) gana++; else malos.push(niv);
    }
    return JSON.stringify({ niveles: (n || K_NIVELES), gana,
                            malos: malos.slice(0, 10), nMalos: malos.length,
                            tiros });
  },

  /* ── LA AUDITORÍA ──
     Que la torre nazca EN REPOSO y que el rey NO esté ya muerto al empezar. Lo
     segundo parece imposible y es exactamente lo que pasa si una planta de hielo
     cae en la base: la torre se desarma sola y el nivel se gana sin tirar. */
  audita(a, b){
    const malos = [];
    let minB = 1e9, maxB = 0, minT = 99, maxT = 0;
    for (let n = (a || 1); n <= (b || K_NIVELES); n++){
      this.arranca(n);
      const fall = [];
      if (K_rey.vida < 100) fall.push('el rey nace herido');
      if (!kTodoQuieto()) fall.push('la torre no asienta');
      if (K_bloques.length < 4) fall.push('torre muy chica');
      /* el rey tiene que estar APOYADO en algo y no flotando */
      let sost = Math.abs(K_rey.y + K_rey.r - kSuelo()) < 6;
      for (const z of K_bloques)
        if (Math.abs(K_rey.y + K_rey.r - z.y) < 6 &&
            K_rey.x > z.x - 10 && K_rey.x < z.x + z.w + 10) sost = true;
      if (!sost) fall.push('el rey flota');
      /* ── Y NO PUEDE ESTAR EXPUESTO DE ENTRADA ──
         La camara existe para que la piedra NO lo alcance de un tiro directo:
         sin techo encima, el nivel se gana con tres tiros a la cabeza y la torre
         no hace falta para nada. */
      let techo = false;
      for (const z of K_bloques)
        if (z.y + z.h <= K_rey.y && z.x < K_rey.x + 20 && z.x + z.w > K_rey.x - 20)
          techo = true;
      if (!techo) fall.push('el rey sin techo');
      if (fall.length) malos.push([n, fall[0]]);
      minB = Math.min(minB, K_bloques.length); maxB = Math.max(maxB, K_bloques.length);
      minT = Math.min(minT, K_tope); maxT = Math.max(maxT, K_tope);
    }
    return JSON.stringify({ niveles: (b || K_NIVELES) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            bloques: [minB, maxB], tiros: [minT, maxT] });
  },

  ver(){
    return JSON.stringify({
      nivel: K_nivel, fase: K_fase, tiros: K_tiros, tope: K_tope,
      rey: Math.round(K_rey ? K_rey.vida : -1),
      bloques: K_bloques.length, quieto: kTodoQuieto(),
      piedra: K_piedra ? [Math.round(K_piedra.x), Math.round(K_piedra.y)] : null,
      cam: [Math.round(K_camX), +K_camZ.toFixed(2)],
      vivo: this.vivo, gano: this.gano, est: this.estrellas });
  },
  cfg(o){
    /* ── LA SONDA DEL ASENTADO ──
       «la torre no asienta» no dice QUÉ se mueve. `mov` devuelve el bloque más
       rápido y cuánto, que es lo único con lo que se puede decidir si falta
       tiempo o si hay uno que no para nunca. */
    if (o.pasos){ K_asentando = true; for (let i = 0; i < o.pasos; i++) kFisica(1/60); K_asentando = false; }
    if (o.mov){
      let m = -1, q = null;
      for (const b of K_bloques){
        const v = Math.max(Math.abs(b.vx), Math.abs(b.vy));
        if (v > m){ m = v; q = b; }
      }
      return JSON.stringify({ max: +m.toFixed(1), n: K_bloques.length,
        b: q ? [Math.round(q.x), Math.round(q.y), q.w, q.h, q.quieto, Math.round(q.vida)] : null,
        rey: [Math.round(K_rey.x), Math.round(K_rey.y), +K_rey.vy.toFixed(1)],
        quieto: kTodoQuieto() });
    }
    if (o.tira) this.tira(o.tira[0], o.tira[1]);
    if (o.aBlanco){ const t = kTiroA(o.aBlanco[0], o.aBlanco[1]); this.tira(t.ang, t.f); }
    /* ── UN NIVEL JUGADO PASO A PASO, CON LA VIDA DEL REY EN CADA TIRO ──
       «gana 41 de 60» no dice por que fallan los diez primeros. Esto devuelve a
       que le apunto, cuanto le saco al rey y cuantos bloques rompio cada tiro,
       que es lo unico con lo que se puede decidir si falta dano o falta puntería. */
    if (o.traza){
      this.arranca(o.traza);
      const dt = 1/60, tr = [];
      let v = 0;
      while (this.vivo && v < 9000){
        v++;
        if (K_fase === 'apunta'){
          const m = kBotMira();
          const antes = K_rey.vida, rotos0 = K_bloques.filter(z => z.vida <= 0).length;
          const t = kBotTiro(m);
          this.tira(t.ang, t.f);
          while (K_fase !== 'apunta' && this.vivo && v < 9000){ this.paso(dt); v++; }
          /* cuanto peso quedo SOBRE el rey y a que altura: si el derrumbe le
             saca cero, esto dice si es que no le cayo nada o si le cayo despacio */
          let enc = 0;
          for (const z of K_bloques)
            if (z.vida > 0 && z.y + z.h <= K_rey.y + 4 &&
                z.x < K_rey.x + 34 && z.x + z.w > K_rey.x - 34)
              enc += z.w*z.h*K_MAT[z.mat].dens;
          tr.push({ a: m.rey ? 'rey' : [Math.round(m.x), Math.round(m.y)],
                    dano: Math.round(antes - K_rey.vida),
                    rotos: K_bloques.filter(z => z.vida <= 0).length - rotos0,
                    rey: Math.round(K_rey.vida),
                    pos: [Math.round(K_rey.x), Math.round(K_rey.y)],
                    enc: Math.round(enc), eMax: Math.round(K_eMax) });
          K_eMax = 0;
          continue;
        }
        this.paso(dt);
      }
      return JSON.stringify({ nivel: o.traza, tope: K_tope, gano: this.gano, tr });
    }
    return this.ver();
  }
};

function kTension(){
  if (!K_arr) return { ang: 0.8, f: 0 };
  const dx = K_arr.x0 - K_arr.x, dy = K_arr.y0 - K_arr.y;
  return { ang: Math.atan2(-dy, Math.max(1, Math.abs(dx))),
           f: Math.min(1, Math.hypot(dx, dy)/K_TENSA) };
}

/* ── EL TIRO A UN PUNTO, RESUELTO SOBRE EL TIEMPO DE VUELO ──
   Es la misma solución que en ARCO y por la misma razón: fijado un `t`, las dos
   ecuaciones se desacoplan y tienen forma cerrada, así que para cada `t` hay un
   tiro exacto y sólo hay que elegir el de velocidad mínima. Acá no hay viento,
   pero el método sirve igual y evita la trampa de la bisección sobre el ángulo,
   que en ARCO dio 24 casos malos de 60. */
function kTiroA(bx, by){
  const x0 = 120, y0 = kSuelo() - 96;
  const dx = bx - x0, dy = by - y0;
  if (dx <= 0) return { ang: 0.9, f: 1 };
  let mej = null;
  for (let k = 0; k <= 70; k++){
    const t = 0.20 + k*(3.2 - 0.20)/70;
    const vx = dx/t, vy = (dy - K_G*t*t/2)/t;
    const v = Math.hypot(vx, vy);
    if (!mej || v < mej.v) mej = { t, vx, vy, v, ang: Math.atan2(-vy, vx) };
  }
  return { ang: mej.ang, f: Math.min(1, mej.v/K_VMAX) };
}

/* ── EL TIRO QUE DE VERDAD LLEGA, Y NO EL DE VELOCIDAD MÍNIMA ──
   `kTiroA` devuelve la parábola más barata que pasa por un punto, y eso está
   bien para un blanco al aire libre. Acá casi nunca sirve: apuntando a una pata
   de la cámara —abajo de todo y detrás de un techo de 186 de ancho— la parábola
   más barata BAJA sobre el blanco, o sea que atraviesa el techo antes de
   llegar. Medido con la traza: el tiro que iba a la pata rompía el techo, y el
   peso que tenía que caerle encima al rey se evaporaba en el mismo tiro.

   Lo que hace una persona es tirar más PLANO. Así que se prueban veinte tiempos
   de vuelo, se SIMULA cada trayectoria contra los bloques —sin romper nada— y
   se elige el más rápido que de verdad pegue en el blanco. Es la misma cuenta
   que el juego ya usa para la piedra, con el daño apagado. */
function kSimTiro(ang, f){
  let x = 120, y = kSuelo() - 96;
  let vx = Math.cos(ang)*f*K_VMAX, vy = -Math.sin(ang)*f*K_VMAX;
  const dt = 1/240;
  for (let i = 0; i < 900; i++){
    vy += K_G*dt; x += vx*dt; y += vy*dt;
    if (y > kSuelo() || x > K_MUNDO + 200) return null;
    if (K_rey && Math.hypot(x - K_rey.x, y - K_rey.y) < 15 + K_rey.r)
      return 'rey';
    for (const b of K_bloques){
      if (b.vida <= 0) continue;
      if (x < b.x - 15 || x > b.x + b.w + 15) continue;
      if (y < b.y - 15 || y > b.y + b.h + 15) continue;
      return b;
    }
  }
  return null;
}

function kBotTiro(mira){
  const x0 = 120, y0 = kSuelo() - 96;
  const dx = mira.x - x0, dy = mira.y - y0;
  const cand = [];
  for (let k = 0; k <= 20; k++){
    const t = 0.22 + k*(2.6 - 0.22)/20;
    const vx = dx/t, vy = (dy - K_G*t*t/2)/t;
    if (vx <= 0) continue;
    const v = Math.hypot(vx, vy);
    if (v > K_VMAX) continue;
    cand.push({ ang: Math.atan2(-vy, vx), f: v/K_VMAX, v });
  }
  /* del más rápido al más lento: el plano llega antes y pega más fuerte */
  cand.sort((a, b) => b.v - a.v);
  for (const c of cand){
    const z = kSimTiro(c.ang, c.f);
    const pega = mira.rey ? z === 'rey'
               : (z && z !== 'rey' && Math.abs(z.x + z.w/2 - mira.x) < 40 &&
                  Math.abs(z.y + z.h/2 - mira.y) < 40);
    if (pega) return c;
  }
  return cand.length ? cand[cand.length - 1] : kTiroA(mira.x, mira.y);
}

/* ── A QUÉ LE APUNTA EL BOT, Y ES LA MITAD DEL JUEGO ──
   La primera version apuntaba a «la pieza mas baja de la columna mas cargada»,
   o sea a lo que TIRA la torre. Y medido, eso empataba con el bot al azar: 35
   contra 33 de 60. La razon es que este juego NO se gana tirando la torre, se
   gana aplastando al rey — y una torre que se desarma para los costados deja al
   rey de pie en el suelo, intacto.

   Asi que el peso que decide no es el que hay encima del BLOQUE: es el que hay
   encima DEL REY. Un pilar que sostiene mil kilos que van a caer tres metros al
   costado no vale nada; el que sostiene el techo de la camara vale el nivel. Y
   cuando ya no queda nada arriba del rey, lo unico que queda es pegarle a el.

   `mira()` devuelve un PUNTO y no un bloque, justamente para poder decir «al
   rey» sin un caso especial en quien la llama. */
function kBotMira(){
  if (!K_rey) return null;
  const rx0 = K_rey.x - 34, rx1 = K_rey.x + 34;
  let encima = 0;
  for (const o of K_bloques)
    if (o.vida > 0 && o.y + o.h <= K_rey.y && o.x < rx1 && o.x + o.w > rx0)
      encima += o.w*o.h*K_MAT[o.mat].dens;
  if (encima < 1200) return { x: K_rey.x, y: K_rey.y, rey: true };

  let mej = null, mejP = -1;
  for (const b of K_bloques){
    if (b.vida <= 0) continue;
    let p = 0;
    for (const o of K_bloques){
      if (o === b || o.vida <= 0) continue;
      if (o.y + o.h > b.y + 4) continue;                  /* no esta por encima */
      if (o.x >= b.x + b.w || o.x + o.w <= b.x) continue; /* b no lo sostiene */
      /* lo que esta sobre el rey pesa el triple: es lo que va a caerle encima */
      const sobreRey = o.x < rx1 && o.x + o.w > rx0 && o.y + o.h <= K_rey.y;
      p += o.w*o.h*K_MAT[o.mat].dens*(sobreRey ? 3 : 1);
    }
    /* se prefiere lo bajo y cargado, y se castiga lo que ya esta sano: pegarle
       otra vez a la pata rajada cuesta menos que abrir una nueva */
    const s = p*(1 + (kSuelo() - b.y)/400) - b.vida*6;
    if (s > mejP){ mejP = s; mej = b; }
  }
  if (!mej) return { x: K_rey.x, y: K_rey.y, rey: true };
  return { x: mej.x + mej.w/2, y: mej.y + mej.h/2, rey: false };
}

/* ══════════ LA FÍSICA ══════════ */
function kFisica(dt){
  const n = K_bloques.length;
  for (const b of K_bloques){
    if (b.vida <= 0) continue;
    b.vy += K_G*dt;
    b.x += b.vx*dt; b.y += b.vy*dt;
    /* la rotación es COSMÉTICA y sólo en el aire: apoyado vuelve a cero, así que
       un bloque en reposo nunca queda torcido y el apilado sigue siendo AABB */
    if (b.quieto <= 0) b.gi += b.vgi*dt;
    else b.gi += (0 - b.gi)*Math.min(1, dt*8);
  }
  if (K_rey){
    K_rey.vy += K_G*dt;
    K_rey.x += K_rey.vx*dt; K_rey.y += K_rey.vy*dt;
  }
  /* ── DOS PASADAS DE CONTACTOS, Y CADA PAR SE RESUELVE UNA SOLA VEZ ──
     Con una pasada, una pila de cinco bloques se hunde: el de abajo se resuelve
     contra el suelo y los de arriba se quedan penetrando hasta el cuadro
     siguiente.

     Y EL PAR VA POR ÍNDICES, `i < j`, que es lo que costó la primera versión.
     Recorriendo todos contra todos, el contacto entre A y B se resolvía DOS
     veces —una con A de sujeto y otra con B— y la segunda usaba la penetración
     por el otro lado, así que empujaba al de abajo HACIA ABAJO. Medido, la torre
     se hundía sola: 43 de 60 niveles seguían moviéndose después de noventa
     pasos, con un bloque clavado en 25 de velocidad vertical, que es
     exactamente un paso de gravedad sin cancelar.

     Y sólo se mueve EL DE ARRIBA. Separando a medias, el de abajo se hunde en lo
     que lo sostiene y la pila entera baja un poco en cada contacto. */
  const arr = K_bloques;
  for (let pasada = 0; pasada < 2; pasada++){
    for (const b of arr){
      if (b.vida <= 0) continue;
      if (b.y + b.h > kSuelo()){
        const vy = b.vy;
        b.y = kSuelo() - b.h;
        if (vy > 240) kDana(b, vy*0.05);
        b.vy = 0;
        b.vx *= K_MAT[b.mat].roce;
        b.vgi = 0;
      }
    }
    for (let i = 0; i < n; i++){
      const a = arr[i];
      if (a.vida <= 0) continue;
      for (let j = i + 1; j < n; j++){
        const b = arr[j];
        if (b.vida <= 0) continue;
        const px = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        if (px <= 0) continue;
        const py = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (py <= 0) continue;
        if (py <= px){
          /* el de arriba es el de centro más alto; con los centros empatados,
             el que viene cayendo más rápido */
          const ca = a.y + a.h/2, cb = b.y + b.h/2;
          const sup = ca < cb ? a : (cb < ca ? b : (a.vy > b.vy ? a : b));
          const dv = Math.abs(a.vy - b.vy);
          if (dv > 260){ kDana(a, dv*0.04); kDana(b, dv*0.04); }
          sup.y -= py;
          sup.vy = Math.min(0, sup.vy);
          sup.vx *= K_MAT[sup.mat].roce;
          sup.vgi = 0;
        } else {
          const s = (a.x + a.w/2) < (b.x + b.w/2) ? -1 : 1;
          a.x += s*px*0.5; b.x -= s*px*0.5;
          const t = (a.vx - b.vx)*0.5;
          a.vx -= t; b.vx += t;
        }
      }
    }
    /* ── EL REY: LO QUE LE CAE ENCIMA LE DUELE ──
       El daño sale de la energía del bloque y no de que lo toque: un bloque
       apoyado sobre él no puede matarlo de a poco, que es lo que pasaría con un
       daño por contacto. */
    if (K_rey){
      if (K_rey.y + K_rey.r > kSuelo()){
        K_rey.y = kSuelo() - K_rey.r; K_rey.vy = 0; K_rey.vx *= 0.7;
      }
      let carga = 0;
      for (const o of K_bloques){
        if (o.vida <= 0) continue;
        const cx = Math.max(o.x, Math.min(K_rey.x, o.x + o.w));
        const cy = Math.max(o.y, Math.min(K_rey.y, o.y + o.h));
        const d = Math.hypot(K_rey.x - cx, K_rey.y - cy);
        if (d > K_rey.r) continue;
        const e = K_asentando ? 0 : Math.abs(o.vy - K_rey.vy) + Math.abs(o.vx)*0.4;
        if (e > K_eMax) K_eMax = e;
        if (e > 200){
          const dn = Math.min(60, e*o.w*o.h*K_MAT[o.mat].dens/22000);
          /* ── Y EL GOLPE NO SE COBRA DOS VECES POR CUADRO ──
             Con el dano dentro del bucle de pasadas, un bloque apoyado que
             rebota sumaba sesenta por pasada: medido, el rey terminaba en −180
             de un solo derrumbe. El `pasada === 0` va en el DANO y no como un
             `continue`: saltear la pasada entera se lleva puesto el empuje de
             separacion y el rey se hunde dentro del bloque. */
          if (dn > 2 && pasada === 0){
            K_rey.vida = Math.max(0, K_rey.vida - dn);
            son('bien', Math.min(1, 0.4 + dn/60));
            chispas(K_rey.x, K_rey.y, 10, '#ff6a5a', 130);
            K_lento = Math.max(K_lento, 0.35);
            sacude(0.3);
          }
        }
        /* ── EL EMPUJE PARA AFUERA, Y LA NORMAL DEGENERADA ──
           Con el centro DENTRO de la caja, `rey − punto más cercano` vale cero y
           dividir por su módulo devuelve cualquier cosa. Ahí la salida correcta
           es la misma que entre dos bloques: el eje de MENOR penetración. */
        let nx = K_rey.x - cx, ny = K_rey.y - cy;
        let l = Math.hypot(nx, ny);
        if (l < 0.001){
          const pi = K_rey.x - o.x, pd = (o.x + o.w) - K_rey.x;
          const pa = K_rey.y - o.y, pb = (o.y + o.h) - K_rey.y;
          const m = Math.min(pi, pd, pa, pb);
          nx = m === pi ? -1 : (m === pd ? 1 : 0);
          ny = m === pa ? -1 : (m === pb ? 1 : 0);
          l = 1;
          K_rey.x += nx*(m + K_rey.r); K_rey.y += ny*(m + K_rey.r);
        } else {
          K_rey.x += nx/l*(K_rey.r - d); K_rey.y += ny/l*(K_rey.r - d);
        }
        if (ny < 0){ K_rey.vy = Math.min(0, K_rey.vy); }
        /* lo que le quedó APOYADO encima, que es distinto del golpe */
        if (o.y + o.h <= K_rey.y + 2) carga += o.w*o.h*K_MAT[o.mat].dens;
      }
      /* ── Y QUEDAR ENTERRADO MATA, QUE ES EL VERBO DEL JUEGO ──
         El golpe solo no alcanza: un techo que cae treinta y siete unidades
         llega despacio, y con el daño atado a la energía el derrumbe le sacaba
         cero. Lo que este juego promete no es acertarle un pedrazo al rey: es
         tirarle la torre encima, y una torre encima aplasta aunque haya llegado
         sin velocidad. La carga se mide en cada paso, así que una viga apoyada
         tarda y media planta lo mata en un segundo. */
      /* ── Y SE COBRA UNA VEZ POR CUADRO, NO UNA POR PASADA ──
         Dentro del bucle de pasadas se cobraba DOBLE, y como `asienta` espera a
         que todo se quede quieto —hasta seis segundos— el rey terminaba en
         −2072 de vida. El numero no se ve, pero un dano que depende de cuantas
         pasadas tenga el solver es un dano que cambia solo el dia que se toque
         el solver. */
      if (!K_asentando && carga > 900 && pasada === 0)
        K_rey.vida = Math.max(0, K_rey.vida - dt*Math.min(45, (carga - 900)/900*10));
    }
  }
  /* ── LO QUE QUEDA EN VOLADIZO SE VUELCA ──
     Es la pieza que faltaba, y sin ella este juego no existe. Con AABB puro y
     sin rotacion, un techo de 186 apoyado en dos pilares queda PERFECTAMENTE
     sostenido cuando se rompe uno solo: no hay torque que lo tumbe, asi que
     sacarle una pata a la torre no hace absolutamente nada. Medido con la traza:
     el bot rompia una pata por tiro y `eMax` —la energia con la que algo toco al
     rey— era CERO en los cuatro tiros de cada nivel, con el rey clavado en
     (915,403) de principio a fin.

     El arreglo no es meter un solver con rotacion, que necesita SAT, puntos de
     contacto y varias pasadas para no temblar. Es la aproximacion de siempre:
     un bloque cuyo CENTRO cae fuera del tramo que lo sostiene se vuelca. Cuesta
     un barrido por cuadro, no toca el solver, y devuelve exactamente la lectura
     que el juego pide — sacale la pata y lo de arriba se viene abajo. */
  if (!K_asentando){
    for (const b of arr){
      if (b.vida <= 0) continue;
      if (b.y + b.h >= kSuelo() - 2) continue;       /* apoyado en el suelo */
      let s0 = 1e9, s1 = -1e9;
      for (const o of arr){
        if (o === b || o.vida <= 0) continue;
        if (Math.abs(o.y - (b.y + b.h)) > 3) continue;
        const a1 = Math.max(b.x, o.x), a2 = Math.min(b.x + b.w, o.x + o.w);
        if (a2 <= a1) continue;
        s0 = Math.min(s0, a1); s1 = Math.max(s1, a2);
      }
      if (s1 < s0) continue;                         /* nada lo sostiene: ya cae */
      const com = b.x + b.w/2, m = 3;
      if (com < s0 - m || com > s1 + m){
        const sg = com < s0 ? -1 : 1;
        b.vx += sg*170*dt;
        b.vgi += sg*3.4*dt;
        b.quieto = 0;
      }
    }
  }
  for (const b of arr){
    if (b.vida <= 0) continue;
    if (Math.abs(b.vx) < 3 && Math.abs(b.vy) < 3) b.quieto++;
    else b.quieto = 0;
  }
}
function kDana(b, d){
  /* ── EL ASENTADO NO ES PARTIDA, ASÍ QUE NO PUEDE LASTIMAR ──
     Los noventa pasos previos existen para que la torre nazca quieta; si además
     rompen bloques, el jugador empieza con un castillo agrietado que él no tocó
     y el primer tiro se juzga contra otra torre. */
  if (K_asentando) return;
  if (d < 1) return;
  b.vida -= d;
  if (b.vida <= 0){
    chispas(b.x + b.w/2, b.y + b.h/2, 12, K_MAT[b.mat].col, 150);
    son('toque', 0.6);
    K_rotos++;
    /* ── EL AVISO SALE DE CUÁNTO SE ROMPIÓ Y NO DE QUE HAYA PEGADO ──
       «GOLPE» en cada choque no dice nada: la piedra siempre le pega a algo. Lo
       que el jugador necesita saber es si el tiro TIRÓ la torre, y eso es una
       cuenta de bloques rotos. */
    if (K_rotos >= 3){ K_msg = 'derrumbe'; K_msgT = 1.5; }
  }
}
function kTodoQuieto(){
  for (const b of K_bloques)
    if (b.vida > 0 && (Math.abs(b.vx) > 6 || Math.abs(b.vy) > 6)) return false;
  return !K_rey || (Math.abs(K_rey.vx) < 6 && Math.abs(K_rey.vy) < 6);
}
function kPiedraChoca(p, dt){
  /* por segmento, como en ARCO: la piedra va a 1300 unidades por segundo, o sea
     veintiuna por cuadro, y contra el punto atraviesa un bloque de veintidós */
  const px = p.x - p.vx*dt, py = p.y - p.vy*dt;
  for (let i = 1; i <= 6; i++){
    const t = i/6, x = px + (p.x - px)*t, y = py + (p.y - py)*t;
    for (const b of K_bloques){
      if (b.vida <= 0) continue;
      if (x < b.x - p.r || x > b.x + b.w + p.r) continue;
      if (y < b.y - p.r || y > b.y + b.h + p.r) continue;
      const e = Math.hypot(p.vx, p.vy);
      /* ── 0,040 Y NO 0,055, Y EL NUMERO SALE DE LA TABLA DE MATERIALES ──
         La piedra llega con unos 900 de velocidad: con 0,055 son 50 de dano y
         eso ROMPE UN PILAR DE PIEDRA DE UN TIRO (vida 60), o sea que los tres
         materiales se comportan igual y la tabla no significa nada. Con 0,040
         son 36: la madera (26) y el hielo (16) caen de un golpe y la piedra
         necesita dos. Ahi el material pasa a ser una decision. */
      kDana(b, e*0.040);
      b.vx += p.vx*0.055; b.vy += p.vy*0.045;
      b.vgi = (Math.random() - 0.5)*5;
      b.quieto = 0;
      son('caida', 0.8); sacude(0.35);
      if (!K_msgT){ K_msg = 'golpe'; K_msgT = 0.9; }
      chispas(x, y, 12, K_MAT[b.mat].col, 190);
      K_lento = 0.3;
      return b;
    }
    if (K_rey){
      const d = Math.hypot(x - K_rey.x, y - K_rey.y);
      if (d < p.r + K_rey.r){
        K_rey.vida -= 42;
        K_rey.vx += p.vx*0.10; K_rey.vy += p.vy*0.10 - 120;
        son('bien', 1); sacude(0.7); destella('#ff6a5a', 0.8);
        K_msg = 'gano'; K_msgT = 1.6;
        chispas(x, y, 20, '#ff6a5a', 220);
        K_lento = 0.6;
        return { rey: true };
      }
    }
  }
  return null;
}

/* ══════════════════════════════ EL DIBUJO ══════════════════════════════ */

/* ── UN BLOQUE ──
   El material se lee por color, pero el color solo no dice CUÁNTO LE QUEDA, y
   eso es la mitad de la decisión: pegarle otra vez a la pata que ya está rajada
   o abrir una nueva. Las grietas salen del daño, así que el bloque muestra su
   propia vida sin un número encima. */
function kBloque(g, b){
  if (b.vida <= 0) return;
  const m = K_MAT[b.mat];
  const cx = b.x + b.w/2, cy = b.y + b.h/2;
  g.save();
  if (Math.abs(b.gi) > 0.002){ g.translate(cx, cy); g.rotate(b.gi); g.translate(-cx, -cy); }
  if (!dibCuadroWH('k_bloques', b.mat, cx, cy, b.w, b.h)){
    g.fillStyle = m.col;
    g.fillRect(b.x, b.y, b.w, b.h);
    /* la cara de arriba más clara: es lo único que le da volumen a un
       rectángulo plano, y cuesta un relleno */
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(b.x, b.y, b.w, Math.min(7, b.h*0.22));
    g.fillStyle = 'rgba(0,0,0,.16)';
    g.fillRect(b.x, b.y + b.h - Math.min(6, b.h*0.18), b.w, Math.min(6, b.h*0.18));
    /* el despiece: sin él un muro de cuarenta y seis de alto se lee a caja de
       cartón, y las hiladas son lo que lo hace pesar */
    if (b.mat !== 2){
      g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 1.5;
      for (let y = b.y + 16; y < b.y + b.h - 4; y += 16){
        g.beginPath(); g.moveTo(b.x + 2, y); g.lineTo(b.x + b.w - 2, y); g.stroke();
      }
    }
    g.strokeStyle = m.bor; g.lineWidth = 2.5;
    g.strokeRect(b.x + 1.25, b.y + 1.25, b.w - 2.5, b.h - 2.5);
  }
  const k = 1 - b.vida/m.vida;
  if (k > 0.12){
    g.save();
    g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
    g.strokeStyle = 'rgba(20,14,10,' + (0.20 + k*0.5).toFixed(2) + ')';
    g.lineWidth = 1 + k*2.2; g.lineCap = 'round';
    /* las grietas son deterministas por bloque: sorteadas cada cuadro,
       parpadearían — y un bloque que titila se lee a error de dibujo */
    const s0 = ((b.x*7 + b.y*13)|0);
    const n = 1 + Math.round(k*3);
    for (let i = 0; i < n; i++){
      const r1 = ((s0 + i*97) % 100)/100, r2 = ((s0 + i*211) % 100)/100;
      const x = b.x + b.w*(0.18 + r1*0.64), y = b.y + b.h*(0.15 + r2*0.7);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r1 - 0.5)*b.w*0.5, y + (0.35 + r2*0.4)*b.h*0.5);
      g.lineTo(x + (r2 - 0.5)*b.w*0.7, y + (0.7 + r1*0.3)*b.h*0.6);
      g.stroke();
    }
    g.restore();
  }
  g.restore();
}

/* ── EL REY ──
   Chiquito, con corona, y con la cara del susto cuando le queda poca vida. Es el
   único personaje del cuadro, así que es lo único a lo que hay que mirarle la
   cara: los bloques no la tienen y por eso el ojo va derecho a él. */
function kReyDib(g){
  if (!K_rey) return;
  const R = K_rey, v = R.vida/100;
  g.save();
  g.globalAlpha = 0.3;
  g.beginPath(); g.ellipse(R.x, R.y + R.r - 1, R.r*1.1, 4.5, 0, 0, 7);
  g.fillStyle = '#000'; g.fill();
  g.restore();
  if (!dibCuadro('k_rey', v > 0.5 ? 0 : 1, R.x, R.y + R.r, R.r*2.7)){
    /* capa, cuerpo, cabeza y corona: cuatro piezas y el contorno */
    g.beginPath();
    g.moveTo(R.x - R.r*1.15, R.y + R.r);
    g.lineTo(R.x - R.r*0.55, R.y - R.r*0.25);
    g.lineTo(R.x + R.r*0.55, R.y - R.r*0.25);
    g.lineTo(R.x + R.r*1.15, R.y + R.r);
    g.closePath();
    g.fillStyle = '#a83c46'; g.fill();
    g.strokeStyle = 'rgba(30,18,14,.6)'; g.lineWidth = 2; g.stroke();
    disco(R.x, R.y - R.r*0.5, R.r*0.62, '#e8b48a');
    g.beginPath(); g.arc(R.x, R.y - R.r*0.5, R.r*0.62, 0, 7); g.stroke();
    /* la corona: tres puntas, que es lo que la separa de un sombrero */
    g.beginPath();
    const cy = R.y - R.r*1.02, w = R.r*0.78;
    g.moveTo(R.x - w, cy);
    g.lineTo(R.x - w, cy - R.r*0.5); g.lineTo(R.x - w*0.5, cy - R.r*0.18);
    g.lineTo(R.x, cy - R.r*0.62);    g.lineTo(R.x + w*0.5, cy - R.r*0.18);
    g.lineTo(R.x + w, cy - R.r*0.5); g.lineTo(R.x + w, cy);
    g.closePath();
    g.fillStyle = '#ffd76a'; g.fill(); g.stroke();
    /* los ojos: dos puntos abiertos, y cerrados con la mitad de la vida */
    g.fillStyle = '#2a1e18';
    if (v > 0.5){
      g.beginPath(); g.arc(R.x - R.r*0.24, R.y - R.r*0.55, 1.9, 0, 7); g.fill();
      g.beginPath(); g.arc(R.x + R.r*0.24, R.y - R.r*0.55, 1.9, 0, 7); g.fill();
    } else {
      g.strokeStyle = '#2a1e18'; g.lineWidth = 2;
      for (const s of [-1, 1]){
        g.beginPath();
        g.arc(R.x + s*R.r*0.24, R.y - R.r*0.48, 3, Math.PI, 0);
        g.stroke();
      }
    }
  }
  /* la barra de vida sobre la cabeza: la ficha del HUD dice el número pero está
     arriba de todo, y en el instante del derrumbe nadie mira ahí */
  if (v < 1){
    const w = 46, x = R.x - w/2, y = R.y - R.r*2.5;
    g.fillStyle = 'rgba(14,10,8,.6)'; g.fillRect(x - 1, y - 1, w + 2, 8);
    g.fillStyle = v > 0.5 ? '#7fd07a' : (v > 0.22 ? '#ffd76a' : '#ff6a5a');
    g.fillRect(x, y, w*v, 6);
  }
}

/* ── LA CATAPULTA ──
   El brazo se mueve con la tensión de verdad, así que la máquina DICE cuánta
   fuerza lleva el tiro antes de soltar. Un brazo quieto con un número al lado es
   la misma información y no se siente. */
function kCatapulta(g){
  const x = 120, y = kSuelo();
  const t = K_fase === 'apunta' && K_arr ? kTension() : { ang: 0.85, f: 0.12 };
  g.save();
  g.translate(x, y);
  g.save();
  g.globalAlpha = 0.3;
  g.beginPath(); g.ellipse(0, 0, 62, 10, 0, 0, 7); g.fillStyle = '#000'; g.fill();
  g.restore();
  /* ── LA MAQUINA SE MECE CON LA TENSION, Y ESO ES UNA DECISION ──
     El sprite generado trae el brazo en una pose fija, asi que usandolo tal cual
     se pierde lo unico que ata el gesto a la maquina: el brazo que se va para
     atras mientras uno arrastra. Se recupera meciendo la maquina ENTERA sobre su
     base —una catapulta cargandose se echa para atras— y la precision la sigue
     dando la barra de tension, que vive en pantalla. Con el respaldo dibujado
     por codigo el brazo si gira, porque ahi es una pieza aparte. */
  const mecido = -t.f*0.11;
  g.save();
  g.rotate(mecido);
  const conSprite = dibCuadro('k_catapulta', 0, 0, 0, 150);
  if (conSprite && K_fase === 'apunta') disco(-14, -104, 13, '#8e8e8a');
  g.restore();
  if (!conSprite){
    /* el bastidor */
    g.strokeStyle = '#6b4820'; g.lineWidth = 11; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-46, -4); g.lineTo(46, -4); g.stroke();
    g.beginPath(); g.moveTo(-30, -4); g.lineTo(6, -62); g.stroke();
    g.beginPath(); g.moveTo(34, -4); g.lineTo(6, -62); g.stroke();
    /* las ruedas: son lo que dice que esto es una máquina y no un andamio */
    for (const rx of [-38, 34]){
      disco(rx, -6, 15, '#5a3f1e');
      g.strokeStyle = '#3a2810'; g.lineWidth = 3;
      g.beginPath(); g.arc(rx, -6, 15, 0, 7); g.stroke();
      disco(rx, -6, 4.5, '#c98a3c');
    }
    /* el brazo, girado por la tensión: en reposo apunta adelante y al tensar
       se va para atrás, que es exactamente lo que hace el dedo */
    g.save();
    g.translate(6, -62);
    g.rotate(-0.55 + t.f*1.5);
    g.strokeStyle = '#8a6134'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-58, -12); g.stroke();
    /* la cuchara con la piedra dentro mientras se apunta */
    g.beginPath(); g.arc(-60, -14, 12, 0.6, 4.2); g.strokeStyle = '#6b4820';
    g.lineWidth = 5; g.stroke();
    if (K_fase === 'apunta') disco(-60, -18, 11, '#8e8e8a');
    g.restore();
    /* la soga tensada, del brazo al bastidor */
    g.strokeStyle = 'rgba(240,230,210,.7)'; g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(6 - Math.cos(-0.55 + t.f*1.5)*0, -62);
    g.lineTo(-44, -6);
    g.stroke();
  }
  g.restore();
}

/* ── LA GUÍA DEL TIRO ──
   Ocho puntos y no la parábola entera, por lo mismo que en ARCO: con la
   trayectoria completa el juego se resuelve solo, y sin nada un jugador nuevo no
   entiende qué hace el arrastre. */
function kGuia(g){
  const t = kTension();
  let x = 120, y = kSuelo() - 96;
  let vx = Math.cos(t.ang)*t.f*K_VMAX, vy = -Math.sin(t.ang)*t.f*K_VMAX;
  const h = 0.06;
  g.fillStyle = 'rgba(255,246,224,.8)';
  for (let i = 0; i < 8; i++){
    vy += K_G*h; x += vx*h; y += vy*h;
    g.globalAlpha = 0.85 - i*0.09;
    g.beginPath(); g.arc(x, y, 7 - i*0.55, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

/* ── EL TENSOR EN PANTALLA ──
   Va en coordenadas de PANTALLA y no del mundo: la cámara se aleja hasta 0,42 y
   un medidor dibujado en el mundo se achicaría justo cuando hay que leerlo. */
function kTensor(g){
  const t = kTension();
  const x = AN*0.5, y = AL - 150, w = AN*0.6;
  caja2(x - w/2, y, w, 20, 10, 'rgba(14,10,8,.55)', 'rgba(255,246,224,.25)');
  const c = t.f > 0.86 ? '#ff6a5a' : (t.f > 0.55 ? '#ffd76a' : '#7fd07a');
  caja2(x - w/2 + 3, y + 3, (w - 6)*t.f, 14, 7, c, null);
  texto(Math.round(t.ang*57.3) + '°', x, y - 14, 26, 'rgba(242,238,230,.8)', '800', 'center');
}

/* ── LA LEYENDA DE MATERIALES ──
   Tres cuadraditos con su nombre. Sin esto el hielo es «el bloque celeste» y no
   hay forma de saber que es el que menos aguanta: el juego pide leer el edificio
   y para leerlo hay que saber el alfabeto. */
function kLeyenda(g){
  const usados = [];
  for (const b of K_bloques) if (b.vida > 0 && usados.indexOf(b.mat) < 0) usados.push(b.mat);
  usados.sort();
  let x = 24;
  /* ── Y VA ARRIBA, NO ABAJO ──
     Abajo viven REINICIAR y SALIR, que los pone el nucleo en DOM, y ademas el
     pie de la torre: medido en la captura, «MADERA» y «PIEDRA» salian por
     detras de los dos botones Y encima de la camara del rey. Un solapamiento
     con el HUD no lo puede ver `solapes()`, porque esto se dibuja en el lienzo y
     aquello en el DOM. */
  const y = AL*0.105;
  for (const m of usados){
    const M = K_MAT[m];
    caja2(x, y, 18, 18, 4, M.col, M.bor);
    const nom = TX(M.k);
    texto(nom, x + 25, y + 15, 19, 'rgba(242,238,230,.72)', '700', 'left');
    /* ── EL ANCHO SE MIDE, NO SE ESTIMA ──
       Estaba en `largo * 11` y en la captura «MADERA» se comia el cuadradito de
       «PIEDRA»: una letra ancha y una angosta no miden lo mismo, y encima el
       nombre cambia con el idioma. */
    x += 25 + g.measureText(nom).width + 22;
  }
}

function kPinta(g){
  kCam(g);

  /* el suelo: un rectángulo y su labio claro. La colina de ARCO acá sería un
     problema —una catapulta y una torre tienen que estar en el MISMO plano o el
     tiro deja de poder calcularse a ojo— así que el suelo es recto a propósito */
  const pat = patron('k_pasto');
  g.fillStyle = '#4a4034';
  g.fillRect(-400, kSuelo(), K_MUNDO + 800, 3000);
  if (pat){
    g.save();
    g.beginPath(); g.rect(-400, kSuelo(), K_MUNDO + 800, 3000); g.clip();
    g.globalAlpha = 0.7; g.fillStyle = pat;
    g.fillRect(-400, kSuelo(), K_MUNDO + 800, 3000);
    g.restore();
  }
  g.strokeStyle = '#7f6a4a'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(-400, kSuelo()); g.lineTo(K_MUNDO + 400, kSuelo()); g.stroke();

  /* la traza del tiro anterior, desvanecida: es lo que convierte «fallé» en
     «fallé por poco y para arriba» */
  if (K_estela.length){
    g.beginPath();
    let n = 0;
    for (const e of K_estela){
      if (e.t <= 0) continue;
      if (n++ === 0) g.moveTo(e.x, e.y); else g.lineTo(e.x, e.y);
    }
    g.strokeStyle = 'rgba(255,246,224,.4)';
    g.lineWidth = Math.max(2, 4/K_camZ*0.5); g.lineCap = 'round'; g.stroke();
  }

  kCatapulta(g);
  /* ── LOS BLOQUES SE PINTAN DE ABAJO HACIA ARRIBA ──
     Con el orden del array, un bloque que se cayó y quedó adelante se dibuja
     detrás del que sigue en pie y se ve atravesándolo. */
  const orden = K_bloques.slice().sort((a, b) => (a.y + a.h) - (b.y + b.h));
  for (const b of orden) kBloque(g, b);
  kReyDib(g);

  if (K_piedra){
    const p = K_piedra;
    g.save();
    g.translate(p.x, p.y); g.rotate(p.gi);
    if (!dibCuadro('k_piedra', 0, 0, p.r, p.r*2)){
      disco(0, 0, p.r, '#8e8e8a');
      g.strokeStyle = '#5a5a56'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, p.r, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.beginPath(); g.arc(-p.r*0.3, -p.r*0.32, p.r*0.34, 0, 7); g.fill();
    }
    g.restore();
  }

  if (K_arr && K_fase === 'apunta') kGuia(g);

  g.restore();

  /* ══ lo que va en pantalla y no en el mundo ══ */
  if (K_arr && K_fase === 'apunta') kTensor(g);
  kLeyenda(g);
  if (K_msgT > 0){
    const al = Math.min(1, K_msgT/0.4);
    const col = K_msg === 'gano' ? '255,106,90'
              : (K_msg === 'derrumbe' ? '255,215,106' : '242,238,230');
    texto(TX(K_msg), AN/2, AL*0.28, K_msg === 'golpe' ? 40 : 54,
          'rgba(' + col + ',' + al.toFixed(2) + ')', '800', 'center');
  }
  /* el `MODO === 'juega'` no sobra: los planos de la cinematica dejan la fase en
     `apunta` con cero tiros, asi que sin esto la linea de ayuda salia cruzada
     con el pie de la cinematica en los tres planos */
  if (MODO === 'juega' && K_fase === 'apunta' && !K_arr && K_tiros === 0)
    /* a 250 del borde y no a 104: ahi abajo estan la barra del nucleo y los dos
       botones, y en la captura la linea salia cruzada por la barra */
    texto(TX('c1'), AN/2, AL - 250, 22, 'rgba(242,238,230,.62)', '700', 'center');
}

/* ══════════ LA CINEMÁTICA ══════════
   Tres planos, y cada uno es una función del instante `u`: se guarda el estado,
   se arma el plano, se pinta y se devuelve todo. Así el plano se puede
   fotografiar en cualquier momento sin haber corrido los anteriores — la lección
   que ya costó una vuelta con la cinemática de BARRIO. */
function kDemo(g, u, plano){
  const gn = K_nivel, gb = K_bloques, gr = K_rey, gf = K_fase, ga = K_arr;
  const gp = K_piedra, ge = K_estela, gx = K_camX, gz = K_camZ;
  const gm = K_msg, gmt = K_msgT, gt = K_tiros;

  const G = kGenera(plano === 2 ? 26 : 4);
  K_bloques = G.b; K_rey = G.rey; K_tiros = 0;
  K_estela = []; K_piedra = null; K_msg = ''; K_msgT = 0; K_arr = null;
  K_fase = 'apunta';
  K_asentando = true;
  for (let i = 0; i < 90; i++) kFisica(1/60);
  K_asentando = false;
  K_camX = (60 + K_MUNDO - 420 + 230)/2;
  K_camZ = Math.max(0.42, Math.min(1.45, AN/(K_MUNDO - 420 + 170)));

  if (plano === 0){
    /* el arrastre, que es el verbo entero y no se puede contar con una frase */
    const d = 40 + u*200;
    K_arr = { x0: AN*0.32, y0: AL*0.60,
              x: AN*0.32 - d*0.84, y: AL*0.60 + d*0.52 };
  } else if (plano === 1){
    /* el derrumbe: se le pega a la pata cargada y se adelanta la simulación
       hasta el instante pedido, así el plano MUESTRA la torre cayéndose en vez
       de decir que se cae */
    const m = kBotMira();
    const t = kBotTiro(m);
    const v = t.f*K_VMAX;
    K_piedra = { x: 120, y: kSuelo() - 96, r: 15,
                 vx: Math.cos(t.ang)*v, vy: -Math.sin(t.ang)*v, gi: 0, vgi: 6 };
    K_fase = 'vuela';
    const dt = 1/120, T = 0.4 + u*2.4;
    for (let s = 0; s < T; s += dt){
      kFisica(dt);
      if (K_piedra){
        K_piedra.vy += K_G*dt;
        K_piedra.x += K_piedra.vx*dt; K_piedra.y += K_piedra.vy*dt;
        K_piedra.gi += K_piedra.vgi*dt;
        K_estela.push({ x: K_piedra.x, y: K_piedra.y, t: 0.5 });
        if (kPiedraChoca(K_piedra, dt) || K_piedra.y > kSuelo()){
          K_piedra = null; K_fase = 'asienta';
        }
      }
    }
    K_lento = 0;
    if (K_piedra){ K_camX = K_piedra.x; K_camZ = 0.8; }
  } else {
    /* el rey aplastado: es la promesa del juego, así que el último plano la
       muestra hecha y no la anuncia */
    K_rey.vida = 22;
    K_msg = 'gano'; K_msgT = 1.5;
    const dt = 1/120;
    for (const b of K_bloques) if (kAz() < 0.55){ b.vida = 0; }
    for (let s = 0; s < 1.2; s += dt) kFisica(dt);
  }
  /* ── Y LA CINEMATICA DIBUJA SU PROPIO AMBIENTE ──
     En modo `cine` el bucle NO llama a `ambAtras`: la pantalla se limpia y lo
     unico que se pinta es lo que devuelve el plano. Sin esto, los tres planos
     salen sobre NEGRO —medido en la captura, el fondo generado no aparecia por
     ningun lado— y la cinematica se ve de otro juego que la partida. */
  ambAtras();
  kPinta(g);
  ambAdelante();

  K_nivel = gn; K_bloques = gb; K_rey = gr; K_fase = gf; K_arr = ga;
  K_piedra = gp; K_estela = ge; K_camX = gx; K_camZ = gz;
  K_msg = gm; K_msgT = gmt; K_tiros = gt;
}
