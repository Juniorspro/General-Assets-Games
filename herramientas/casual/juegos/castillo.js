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

const K_MUNDO = 1250;
const K_G = 1500;
const K_VMAX = 1300;
const K_TENSA = 250;
const K_ALTO_A = 0.82;         /* dónde cae el suelo en la pantalla */
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

function kGenera(n){
  K_azar = (n*2654435761) >>> 0;
  for (let i = 0; i < 6; i++) kAz();
  const plantas = Math.min(5, 2 + Math.floor((n - 1)/9));
  const x0 = K_MUNDO - 420, ancho = 170;
  const b = [];
  let y = kSuelo();
  for (let p = 0; p < plantas; p++){
    /* el hielo sólo aparece pasado el nivel 12, y nunca en la planta de abajo:
       una base de hielo hace que la torre se caiga sola y el nivel se gana sin
       tirar */
    let mat = 0;
    if (n > 5) mat = kAz() < 0.45 ? 1 : 0;
    if (n > 12 && p > 0 && kAz() < 0.30) mat = 2;
    const tipo = p === plantas - 1 ? 3 : (kAz()*3)|0;
    const dx = (kAz() - 0.5)*22;
    const pl = kPlanta(tipo, x0 + dx, ancho, y, mat);
    for (const z of pl) b.push(z);
    y -= (tipo === 3 ? 92 : (tipo === 1 ? 46 : (tipo === 0 ? 78 : 74)));
  }
  /* ── EL REY VA APOYADO, Y ESE «−r» NO ES UN DETALLE ──
     `y + 92` es la SUPERFICIE sobre la que se para (el techo de la planta de
     abajo), así que poniendo ahí su CENTRO queda medio rey enterrado en el
     bloque. Y enterrado, el empuje de separación lo saca por una normal
     degenerada —el centro justo sobre el borde da distancia cero— y lo manda
     para abajo atravesando la torre: medido, nacía herido en los 60 niveles. */
  const rr = 17;
  const rey = { x: x0 + ancho/2, y: y + 92 - rr - 1, r: rr, vida: 100, vx: 0, vy: 0 };
  /* los tiros que da el nivel: sale de las PLANTAS y no de un número a mano —
     una torre de cinco pisos con tres tiros es imposible y con doce es un
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
  foto: 'k_fondo',
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
    K_camMX = K_MUNDO*0.5 + 60;
    K_camMZ = Math.max(0.42, Math.min(0.9, AN/(K_MUNDO*0.86)));
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
    K_camX = K_MUNDO*0.5 + 60; K_camZ = 0.58;
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
          const b = azar ? K_bloques[(Math.random()*K_bloques.length)|0] : kBotBlanco();
          if (!b) break;
          const t = kTiroA(b.x + b.w/2, b.y + b.h/2);
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
      let sost = false;
      for (const z of K_bloques)
        if (Math.abs(K_rey.y + K_rey.r - z.y) < 6 &&
            K_rey.x > z.x - 10 && K_rey.x < z.x + z.w + 10) sost = true;
      if (!sost) fall.push('el rey flota');
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

/* ── A QUÉ LE APUNTA EL BOT ──
   A la pieza más BAJA de la columna más cargada, o sea a la pata que sostiene
   más peso. No es un truco: es lo que hace una persona que ya entendió que
   sacarle la base a una torre la tira entera. */
function kBotBlanco(){
  let mej = null, mejP = -1;
  for (const b of K_bloques){
    if (b.vida <= 0) continue;
    /* cuánto peso tiene encima: los bloques cuyo x se solapa y están más arriba */
    let p = 0;
    for (const o of K_bloques)
      if (o !== b && o.y + o.h <= b.y + 4 &&
          o.x < b.x + b.w && o.x + o.w > b.x) p += o.w*o.h*K_MAT[o.mat].dens;
    /* se prefiere lo bajo y cargado, y se castiga lo que ya está roto */
    const s = p*(1 + (kSuelo() - b.y)/400) - b.vida*6;
    if (s > mejP){ mejP = s; mej = b; }
  }
  return mej;
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
  /* ── DOS PASADAS DE CONTACTOS ──
     Con una, una pila de cinco bloques se hunde: el de abajo se resuelve contra
     el suelo y los de arriba se quedan penetrando hasta el cuadro siguiente. Con
     dos, la pila se sostiene y no hace falta un solver iterativo entero. */
  for (let pasada = 0; pasada < 2; pasada++){
    for (const b of K_bloques){
      if (b.vida <= 0) continue;
      if (b.y + b.h > kSuelo()){
        const vy = b.vy;
        b.y = kSuelo() - b.h;
        if (vy > 240) kDana(b, vy*0.05);
        b.vy = 0;
        b.vx *= K_MAT[b.mat].roce;
        b.quieto++;
        b.vgi = 0;
      }
      for (const o of K_bloques){
        if (o === b || o.vida <= 0) continue;
        if (b.x + b.w <= o.x || b.x >= o.x + o.w) continue;
        if (b.y + b.h <= o.y || b.y >= o.y + o.h) continue;
        /* se separa por el eje de MENOR penetración: por el otro, dos bloques
           apilados se empujarían de costado y la torre se abriría sola */
        const py1 = (b.y + b.h) - o.y, py2 = (o.y + o.h) - b.y;
        const px1 = (b.x + b.w) - o.x, px2 = (o.x + o.w) - b.x;
        const py = Math.min(py1, py2), px = Math.min(px1, px2);
        if (py <= px){
          const dv = Math.abs(b.vy - o.vy);
          if (py === py1){ b.y -= py; if (dv > 260) kDana(b, dv*0.04), kDana(o, dv*0.04);
                           b.vy = Math.min(0, b.vy); b.quieto++; b.vgi = 0; }
          else { b.y += py; b.vy = Math.max(0, b.vy); }
          b.vx *= K_MAT[b.mat].roce;
        } else {
          if (px === px1){ b.x -= px*0.5; o.x += px*0.5; }
          else { b.x += px*0.5; o.x -= px*0.5; }
          const t = (b.vx - o.vx)*0.5;
          b.vx -= t; o.vx += t;
        }
      }
      if (Math.abs(b.vx) < 3 && Math.abs(b.vy) < 3) b.quieto++;
      else b.quieto = 0;
    }
    /* ── EL REY: LO QUE LE CAE ENCIMA LE DUELE ──
       El daño sale de la energía del bloque y no de que lo toque: un bloque
       apoyado sobre él no puede matarlo de a poco, que es lo que pasaría con un
       daño por contacto. */
    if (K_rey){
      if (K_rey.y + K_rey.r > kSuelo()){
        K_rey.y = kSuelo() - K_rey.r; K_rey.vy = 0; K_rey.vx *= 0.7;
      }
      for (const o of K_bloques){
        if (o.vida <= 0) continue;
        const cx = Math.max(o.x, Math.min(K_rey.x, o.x + o.w));
        const cy = Math.max(o.y, Math.min(K_rey.y, o.y + o.h));
        const d = Math.hypot(K_rey.x - cx, K_rey.y - cy);
        if (d > K_rey.r) continue;
        const e = K_asentando ? 0 : Math.abs(o.vy - K_rey.vy) + Math.abs(o.vx)*0.4;
        if (e > 200){
          const dn = Math.min(60, e*o.w*o.h*K_MAT[o.mat].dens/22000);
          if (dn > 2){
            K_rey.vida -= dn;
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
      }
    }
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
      kDana(b, e*0.055);
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
  if (!dibCuadro('k_catapulta', 0, 0, 0, 132)){
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
  const y = AL - 62;
  for (const m of usados){
    const M = K_MAT[m];
    caja2(x, y, 18, 18, 4, M.col, M.bor);
    texto(TX(M.k), x + 25, y + 15, 19, 'rgba(242,238,230,.72)', '700', 'left');
    x += 32 + TX(M.k).length*11;
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
  if (K_fase === 'apunta' && !K_arr && K_tiros === 0)
    texto(TX('c1'), AN/2, AL - 104, 22, 'rgba(242,238,230,.5)', '700', 'center');
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
  K_camX = K_MUNDO*0.5 + 60;
  K_camZ = Math.max(0.42, Math.min(0.9, AN/(K_MUNDO*0.86)));

  if (plano === 0){
    /* el arrastre, que es el verbo entero y no se puede contar con una frase */
    const d = 40 + u*200;
    K_arr = { x0: AN*0.32, y0: AL*0.60,
              x: AN*0.32 - d*0.84, y: AL*0.60 + d*0.52 };
  } else if (plano === 1){
    /* el derrumbe: se le pega a la pata cargada y se adelanta la simulación
       hasta el instante pedido, así el plano MUESTRA la torre cayéndose en vez
       de decir que se cae */
    const b = kBotBlanco();
    const t = kTiroA(b.x + b.w/2, b.y + b.h/2);
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
  kPinta(g);

  K_nivel = gn; K_bloques = gb; K_rey = gr; K_fase = gf; K_arr = ga;
  K_piedra = gp; K_estela = ge; K_camX = gx; K_camZ = gz;
  K_msg = gm; K_msgT = gmt; K_tiros = gt;
}
