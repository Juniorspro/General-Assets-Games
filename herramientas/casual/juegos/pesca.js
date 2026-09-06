/* ══════════════════════════════ PESCA ══════════════════════════════
   Se tira la línea, pica algo, y ahí empieza el juego: recogerlo sin cortar el
   hilo.

   ── EL VERBO ES SOSTENER MODULANDO, Y ESO NO LO PIDE NINGÚN OTRO ──
   ARCO y CASTILLO piden un impulso: un gesto y a esperar el resultado. DUELO
   pide un instante. Acá el dedo está abajo durante todo el forcejeo y lo que
   importa es CUÁNDO se lo levanta y por cuánto: apretado se recoge y la tensión
   sube; suelto la tensión baja pero el pez se lleva hilo. La partida es una
   línea que hay que mantener adentro de una banda mientras el pez tira cuando
   se le antoja.

   O sea: no es puntería ni tiempo de reacción, es CONTROL SOSTENIDO. Es la
   única de la familia en la que soltar es una jugada.

   ── Y LA BANDA NO ES UN NÚMERO, ES UN DIBUJO ──
   La zona verde se ve en la barra, así que la regla no hay que leerla. */

const S_NIVELES = 45;
const S_TMAX = 1.0;            /* tensión: 1 es el hilo cortado */
const S_LARGO0 = 100;          /* metros de hilo al enganchar */

let S_fase = 'tira';           /* tira · pica · pelea · resuelve */
let S_t = 0, S_nivel = 1, S_intento = 0, S_tope = 0;
let S_pez = null;              /* {fuerza, aguante, ritmo, largo, vida} */
let S_ten = 0, S_dist = 0, S_hold = false, S_tir = 0;
let S_arr = null, S_cast = 0;
let S_res = '', S_resT = 0, S_lento = 0;
let S_ola = 0;
let S_azar = 5;
function sAz(){ S_azar = (S_azar*1664525 + 1013904223) >>> 0; return S_azar / 4294967296; }

/* ── LAS SEIS ESPECIES ──
   Se distinguen por RITMO, no por tamaño: el atún tira largo y parejo, la
   trucha da sacudones cortos. Contra cada uno la mano hace otra cosa. */
const S_PECES = [
  { k: 'trucha',  f: 0.55, per: 0.9, largo: 55,  col: '#8fb8c4' },
  { k: 'dorado',  f: 0.72, per: 1.6, largo: 80,  col: '#e0b040' },
  { k: 'lubina',  f: 0.66, per: 1.2, largo: 70,  col: '#7a8f6b' },
  { k: 'atun',    f: 0.92, per: 2.6, largo: 120, col: '#4a6b8f' },
  { k: 'raya',    f: 0.80, per: 3.4, largo: 95,  col: '#9a8a7a' },
  { k: 'aguja',   f: 1.00, per: 0.7, largo: 110, col: '#5a4a8f' },
];

const JT = {
  es: { sub:'Apretá para recoger. Soltá antes de que se corte.',
        c1:'Arrastrá para tirar la línea. Cuanto más lejos, más grande.',
        c2:'Apretá para recoger: la tensión sube.',
        c3:'Soltá y el pez se lleva hilo. Mantenela en verde.',
        nivelC:'PESCA', tenC:'HILO', pezC:'METROS',
        pico:'¡PICÓ!', corto:'SE CORTÓ EL HILO', solto:'SE SOLTÓ',
        saco:'¡LO SACASTE!', lejos:'MUY CORTO',
        trucha:'TRUCHA', dorado:'DORADO', lubina:'LUBINA',
        atun:'ATÚN', raya:'RAYA', aguja:'AGUJA' },
  en: { sub:'Hold to reel. Let go before it snaps.',
        c1:'Drag to cast. The further out, the bigger.',
        c2:'Hold to reel in: the tension rises.',
        c3:'Let go and it takes line. Keep it in the green.',
        nivelC:'CATCH', tenC:'LINE', pezC:'METRES',
        pico:'FISH ON!', corto:'THE LINE SNAPPED', solto:'IT GOT OFF',
        saco:'YOU LANDED IT!', lejos:'TOO SHORT',
        trucha:'TROUT', dorado:'GOLDEN', lubina:'BASS',
        atun:'TUNA', raya:'RAY', aguja:'MARLIN' },
  pt: { sub:'Segure para recolher. Solte antes de arrebentar.',
        c1:'Arraste para lançar. Quanto mais longe, maior.',
        c2:'Segure para recolher: a tensão sobe.',
        c3:'Solte e ele leva linha. Mantenha no verde.',
        nivelC:'PESCA', tenC:'LINHA', pezC:'METROS',
        pico:'FISGOU!', corto:'A LINHA ARREBENTOU', solto:'ESCAPOU',
        saco:'PEGOU!', lejos:'CURTO DEMAIS',
        trucha:'TRUTA', dorado:'DOURADO', lubina:'ROBALO',
        atun:'ATUM', raya:'RAIA', aguja:'AGULHÃO' }
};
const PIEL = { ac:'#3c9ac4', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tensa', pierde:'grito', gana:'gana',
                    clic:'clic', caida:'tira' };
const AMB = {
  foto: 'f_pesca',
  cielo: ['#2a4a6b', '#0f1a28'],
  haz: 0.12,
  vineta: 0.40,
  part: { n: 12, dir: 'sube', forma: 'anillo', col: '#bfe0f0',
          r0: 1.4, r1: 3.6, v0: 6, v1: 20, amp: 40, gira: 0,
          a0: 0.05, a1: 0.16 }
};

/* ── LA BANDA SEGURA SE ACHICA CON EL NIVEL, Y ES LO ÚNICO QUE SUBE ──
   No se hace «más rápido»: se hace más FINO. Un juego de control sostenido que
   sube la velocidad deja de pedir control y pasa a pedir reflejos. */
function sGenera(n){
  S_azar = (n*2246822519) >>> 0;
  for (let i = 0; i < 5; i++) sAz();
  const p = S_PECES[(n - 1) % S_PECES.length];
  const k = Math.min(1, (n - 1)/38);
  return {
    pez: { k: p.k, col: p.col,
           f: p.f*(0.85 + k*0.40),
           per: p.per*(1 - k*0.25),
           /* el hilo se topa en 118 m: mas largo no hace la pelea mas dificil,
              la hace mas LARGA — medido, la aguja del nivel 40 tardaba 63 s */
           largo: Math.min(118, p.largo*(0.8 + k*0.5)) },
    /* la banda: de [0,30 … 0,88] a [0,46 … 0,80] */
    b0: 0.30 + k*0.16, b1: 0.88 - k*0.08,
    tope: 3
  };
}

const JUEGO = {
  id: 'pesca',
  tipo: 'niveles',
  nivelesTotal: S_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return Math.max(0, Math.round(S_dist)); },
  get sub(){ return TX('pezC'); },
  get ficI(){ return TX('nivelC') + ' ' + NIVEL; },
  get ficD(){ return S_pez ? TX(S_pez.k) : ''; },
  get resta(){ return Math.max(0, 1 - S_ten); },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ sDemo(g, u, 0); } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){ sDemo(g, u, 1); } },
    { dur: 3.4, pie: 'c3', dibuja(g, u){ sDemo(g, u, 2); } }
  ],

  arranca(n){
    S_nivel = n || 1;
    const G = sGenera(S_nivel);
    S_pez = G.pez; this.b0 = G.b0; this.b1 = G.b1; S_tope = G.tope;
    S_intento = 0;
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
    this.nueva();
  },

  nueva(){
    S_fase = 'tira'; S_t = 0; S_cast = 0; S_arr = null;
    S_ten = 0; S_dist = S_pez.largo; S_hold = false; S_tir = 0;
    S_res = ''; S_resT = 0;
  },

  paso(dt){
    const dtm = S_lento > 0 ? dt*0.3 : dt;
    if (S_lento > 0) S_lento = Math.max(0, S_lento - dt);
    if (S_resT > 0) S_resT = Math.max(0, S_resT - dt);
    S_ola += dt;
    S_t += dtm;
    if (S_fase === 'pica'){
      if (S_t > 0.9){ S_fase = 'pelea'; S_t = 0; son('toque', 1); }
      return;
    }
    if (S_fase === 'resuelve'){
      if (S_t > 1.6) this.sigue();
      return;
    }
    if (S_fase !== 'pelea') return;

    /* ── EL TIRÓN DEL PEZ: DOS SENOS QUE NO SON MÚLTIPLOS ──
       Con uno solo el ciclo se repite igual y se aprende de memoria en veinte
       segundos; con dos de períodos que no encajan, el patrón no vuelve nunca a
       caer en el mismo sitio y hay que MIRAR la barra en vez de contar. */
    const a = Math.sin(S_t*(6.283/S_pez.per));
    const b = Math.sin(S_t*(6.283/(S_pez.per*1.618)) + 1.1);
    S_tir = Math.max(0, 0.55 + 0.45*(a*0.62 + b*0.38));

    const sube = S_hold ? (0.72 + S_tir*S_pez.f) : (S_tir*S_pez.f*0.55 - 0.95);
    S_ten = Math.max(0, Math.min(1.2, S_ten + sube*dtm));
    /* recogiendo se acorta; soltando, el pez se lleva hilo */
    /* ── SE RECOGE A 13 Y NO A 7,5, Y ESE NUMERO SALIO DE LA AUDITORIA ──
       Con 7,5 el forcejeo tardaba hasta 59,7 segundos y veinticinco niveles de
       cuarenta y cinco no terminaban dentro del minuto: no eran imposibles, eran
       LARGOS. Un minuto sosteniendo el dedo con una barra oscilando no es
       control, es paciencia. */
    S_dist += (S_hold ? -15 : 4.2*S_tir)*dtm;

    if (S_ten >= S_TMAX){ this.termina('corto'); return; }
    if (S_dist <= 0){ this.termina('saco'); return; }
    if (S_dist > S_LARGO0 + 60){ this.termina('solto'); return; }
  },

  termina(k){
    S_res = k; S_resT = 1.6;
    S_fase = 'resuelve'; S_t = 0;
    S_intento++;
    if (k === 'saco'){
      son('gana', 0.95); destella('#7fe08a', 0.9); sacude(0.35); S_lento = 0.5;
    } else {
      son(k === 'corto' ? 'pierde' : 'caida', 0.9); sacude(0.3);
    }
  },

  sigue(){
    if (S_res === 'saco'){
      this.gano = true;
      this.estrellas = S_intento <= 1 ? 3 : (S_intento === 2 ? 2 : 1);
      this.finP = TX('pezC') + ' ' + Math.round(S_pez.largo);
      this.vivo = false; return;
    }
    if (S_intento >= S_tope){ this.vivo = false; return; }
    this.nueva();
  },

  fondo(g){},
  pinta(g){ sPinta(g); },

  baja(px, py){
    if (MODO !== 'juega') return;
    if (S_fase === 'tira'){ S_arr = { y0: py, y: py }; return; }
    if (S_fase === 'pelea') S_hold = true;
  },
  mueve(px, py){ if (S_arr) S_arr.y = py; },
  sube(){
    if (S_fase === 'tira' && S_arr){
      const d = Math.max(0, S_arr.y - S_arr.y0);
      S_arr = null;
      if (d < 30) return;
      /* el tiro no cambia al pez —ya está elegido por el nivel— pero sí cuánto
         hilo hay que recoger: tirar corto es menos pelea y menos estrellas */
      S_cast = Math.min(1, d/260);
      S_dist = S_pez.largo*(0.55 + S_cast*0.45);
      S_fase = 'pica'; S_t = 0; son('caida', 0.8);
      return;
    }
    S_hold = false;
  },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto MIRA LA BANDA: aprieta por debajo y suelta por encima. El otro
     aprieta y suelta al azar. Si controlar no sirviera, los dos sacarían la
     misma cantidad de peces. */
  juegaSolo(n, azar){
    let gana = 0, malos = [], intentos = 0;
    const dt = 1/60;
    for (let niv = 1; niv <= (n || S_NIVELES); niv++){
      this.arranca(niv);
      let v = 0;
      while (this.vivo && v < 9000){
        v++;
        if (S_fase === 'tira'){
          S_cast = 1; S_dist = S_pez.largo; S_fase = 'pica'; S_t = 0;
          intentos++;
          continue;
        }
        if (S_fase === 'pelea'){
          if (azar) S_hold = Math.random() < 0.5;
          else {
            /* margen: se suelta ANTES del techo porque la tensión sigue subiendo
               un instante mientras el dedo se levanta */
            if (S_ten > this.b1 - 0.06) S_hold = false;
            else if (S_ten < this.b0 + 0.04) S_hold = true;
          }
        }
        this.paso(dt);
      }
      if (this.gano) gana++; else malos.push(niv);
    }
    return JSON.stringify({ niveles: (n || S_NIVELES), gana,
                            malos: malos.slice(0, 10), nMalos: malos.length,
                            intentos });
  },

  /* ── LA AUDITORÍA: QUE EL PEZ SE PUEDA SACAR ──
     La cuenta es directa: con la banda puesta, ¿el hilo se acorta más de lo que
     el pez lo alarga? Se simula el forcejeo con un control ideal y se mide en
     cuántos segundos sale — y si NO sale, el nivel es imposible por
     construcción y no por dificultad. */
  audita(a, b){
    const malos = [];
    let minT = 99, maxT = 0;
    for (let n = (a || 1); n <= (b || S_NIVELES); n++){
      this.arranca(n);
      S_fase = 'pelea'; S_t = 0; S_dist = S_pez.largo; S_ten = 0;
      const dt = 1/60;
      let v = 0, sale = false;
      while (v < 5400){
        v++;
        if (S_ten > this.b1 - 0.06) S_hold = false;
        else if (S_ten < this.b0 + 0.04) S_hold = true;
        this.paso(dt);
        if (S_res === 'saco'){ sale = true; break; }
        if (S_res === 'corto' || S_res === 'solto') break;
      }
      const seg = v/60;
      if (!sale) malos.push([n, 'no se puede sacar (' + (S_res || 'no termina') + ')']);
      else if (seg > 42) malos.push([n, 'la pelea dura ' + seg.toFixed(0) + ' s']);
      else { minT = Math.min(minT, seg); maxT = Math.max(maxT, seg); }
      if (this.b1 - this.b0 < 0.22) malos.push([n, 'la banda es muy fina']);
      this.nueva();
    }
    return JSON.stringify({ niveles: (b || S_NIVELES) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            seg: [+minT.toFixed(1), +maxT.toFixed(1)] });
  },

  ver(){
    return JSON.stringify({
      nivel: S_nivel, fase: S_fase, ten: +S_ten.toFixed(3),
      dist: +S_dist.toFixed(1), hold: S_hold, tir: +S_tir.toFixed(2),
      banda: [this.b0, +this.b1.toFixed(2)],
      pez: S_pez ? S_pez.k : null, intento: S_intento, tope: S_tope,
      res: S_res, vivo: this.vivo, gano: this.gano, est: this.estrellas });
  },
  cfg(o){
    if (o.tira){ S_cast = 1; S_dist = S_pez.largo; S_fase = 'pica'; S_t = 0; }
    if (o.hold != null) S_hold = !!o.hold;
    if (o.pasos) for (let i = 0; i < o.pasos; i++) this.paso(1/60);
    return this.ver();
  }
};

/* ══════════════════════════════ EL DIBUJO ══════════════════════════════ */

/* ── LA BARRA DE TENSIÓN ES EL JUEGO, ASÍ QUE ES LO MÁS GRANDE DE LA PANTALLA ──
   La banda verde va dibujada DENTRO de la barra: la regla no se lee, se ve. Y
   la aguja tiene su propia sombra para que se distinga del relleno cuando los
   dos están en el mismo tono. */
function sBarra(g){
  const w = AN*0.72, x = (AN - w)/2, y = AL*0.20, h = 44;
  caja2(x - 3, y - 3, w + 6, h + 6, 12, 'rgba(12,10,8,.55)', 'rgba(255,255,255,.18)');
  /* la zona segura */
  const a = x + w*JUEGO.b0, b = x + w*JUEGO.b1;
  g.fillStyle = 'rgba(127,224,138,.30)';
  g.fillRect(a, y, b - a, h);
  g.strokeStyle = 'rgba(127,224,138,.75)'; g.lineWidth = 2;
  g.strokeRect(a, y, b - a, h);
  /* y la franja roja del final, que dice dónde se corta */
  g.fillStyle = 'rgba(255,106,90,.28)';
  g.fillRect(x + w*0.92, y, w*0.08, h);
  /* el relleno */
  const u = Math.max(0, Math.min(1, S_ten));
  const col = S_ten > JUEGO.b1 ? '#ff6a5a' : (S_ten < JUEGO.b0 ? '#8fb8c4' : '#7fe08a');
  caja2(x + 2, y + 2, Math.max(4, (w - 4)*u), h - 4, 8, col, null);
  /* la aguja */
  const px = x + w*u;
  g.strokeStyle = 'rgba(12,10,8,.7)'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(px, y - 8); g.lineTo(px, y + h + 8); g.stroke();
  g.strokeStyle = '#fff6e0'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(px, y - 8); g.lineTo(px, y + h + 8); g.stroke();
  texto(TX('tenC'), x, y - 16, 20, 'rgba(242,238,230,.6)', '700', 'left');
}

/* ── EL AGUA: TRES ONDAS Y NADA MÁS ──
   Un relleno liso se lee a papel; tres senos de períodos que no son múltiplos
   se leen a agua sin costar un solo asset. */
function sAgua(g, hz){
  const pat = patron('s_agua');
  g.fillStyle = '#16405e';
  g.fillRect(0, hz, AN, AL - hz);
  if (pat){
    g.save();
    g.beginPath(); g.rect(0, hz, AN, AL - hz); g.clip();
    g.globalAlpha = 0.55; g.fillStyle = pat; g.fillRect(0, hz, AN, AL);
    g.restore();
  }
  g.save();
  g.beginPath(); g.rect(0, hz, AN, AL - hz); g.clip();
  for (let i = 0; i < 3; i++){
    const A = 5 + i*3, w = 0.008 + i*0.004, v = 0.6 + i*0.35;
    g.beginPath();
    for (let x = 0; x <= AN; x += 12){
      const yy = hz + 40 + i*72 + Math.sin(x*w + S_ola*v)*A;
      if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.strokeStyle = 'rgba(190,224,240,' + (0.16 - i*0.04).toFixed(2) + ')';
    g.lineWidth = 3; g.stroke();
  }
  g.restore();
}

function sPinta(g){
  const hz = AL*0.30;
  sAgua(g, hz);

  /* ── EL MUELLE, Y SIN EL EL PESCADOR ESTABA PARADO EN EL AGUA ──
     El horizonte cae en 0,30 del alto y el pescador vive en 0,80, o sea que
     todo lo que hay debajo de el es mar: medido en la captura, un tipo de pie
     sobre las olas. Cuatro tablas y dos pilotes lo apoyan en algo. */
  const mY = AL*0.855;
  g.fillStyle = '#4a3524';
  g.fillRect(0, mY, AN*0.52, AL - mY);
  g.fillStyle = 'rgba(0,0,0,.22)';
  for (let i = 0; i < 5; i++) g.fillRect(0, mY + 12 + i*26, AN*0.52, 3);
  g.fillStyle = '#5c4430';
  g.fillRect(0, mY - 9, AN*0.52, 11);
  for (const px of [AN*0.14, AN*0.40]){
    g.fillStyle = '#3a2a1c';
    g.fillRect(px - 11, mY + 2, 22, AL - mY);
  }
  g.strokeStyle = 'rgba(12,10,8,.45)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(AN*0.52, mY - 9); g.lineTo(AN*0.52, AL); g.stroke();

  /* la caña y el pescador, parados en el muelle: el hilo sale de la punta */
  const cx = AN*0.16, cy = mY - 6;
  const px = AN*0.42, py = AL*0.44;   /* la punta de la caña */
  if (!dibCuadro('s_pescador', 0, cx, cy + 60, 190)){
    caja2(cx - 26, cy - 74, 52, 74, 14, '#3c6b8f', 'rgba(10,14,22,.6)');
    disco(cx, cy - 92, 22, '#e8b48a');
    caja2(cx - 26, cy - 118, 52, 16, 6, '#c4a03c', null);
  }
  g.strokeStyle = '#8a6134'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx + 10, cy - 78);
  g.quadraticCurveTo((cx + px)/2 + 10, (cy + py)/2 - 60, px, py); g.stroke();

  /* dónde está el pez, en pantalla: la distancia se lee como profundidad */
  const u = Math.max(0, Math.min(1, S_dist/Math.max(1, S_pez ? S_pez.largo : 1)));
  /* ── Y SE ACERCA DE VERDAD: MAS CERCA ES MAS GRANDE Y MAS ABAJO ──
     Con la posicion casi fija y un tamano fijo, recoger noventa metros no se
     veia en ninguna parte: medido en la captura, el atun era una mancha de
     treinta y ocho pixeles pegada al horizonte y el unico marcador del avance
     era un numero. Ahora el pez viaja de la linea del agua al muelle. */
  const fx = AN*0.56 + u*AN*0.32;
  const fy = AL*0.70 - u*(AL*0.70 - (hz + 96)) + Math.sin(S_ola*2.4)*10;

  /* el hilo: se comba menos cuanto más tensa está, que es la lectura de siempre */
  const comba = (1 - Math.min(1, S_ten))*140;
  g.strokeStyle = S_ten > JUEGO.b1 ? 'rgba(255,106,90,.9)' : 'rgba(240,246,255,.75)';
  g.lineWidth = S_ten > JUEGO.b1 ? 3.5 : 2.2;
  g.beginPath(); g.moveTo(px, py);
  g.quadraticCurveTo((px + fx)/2, (py + fy)/2 + comba, fx, fy); g.stroke();

  if (S_fase === 'pelea' || S_fase === 'pica' || S_fase === 'resuelve'){
    /* el pez: una silueta que se mueve con el tirón. Cuanto más tira, más se
       tuerce — es lo único que dice que está peleando y no arrastrándose */
    g.save();
    g.translate(fx, fy);
    g.rotate(Math.sin(S_ola*5)*0.16*(0.3 + S_tir));
    const L = (168 + (1 - u)*210)*(0.72 + (S_pez ? S_pez.largo : 60)/300);
    /* ── EL QUINTO ARGUMENTO ES EL ALTO DE LA CAJA, NO EL LARGO DEL PEZ ──
       `celda_cuadrada` deja cada pieza CUADRADA con el pez centrado, asi que un
       pez horizontal ocupa como mucho la mitad de esa caja de alto. Pidiendo
       `L*0.55` de alto, el atun salia de cuarenta y nueve pixeles: se veia como
       una mota en el horizonte. Pidiendo `L`, la caja mide L y el pez L de
       largo, que es lo que uno cree estar escribiendo.
       Y el ancla de `dibCuadro` son los PIES, asi que para centrar un pez hay
       que pasarle medio alto. */
    if (!dibCuadro('s_peces', (S_PECES.findIndex(p => p.k === (S_pez ? S_pez.k : '')) + 6) % 6,
                   0, L*0.5, L)){
      g.fillStyle = S_pez ? S_pez.col : '#8fb8c4';
      g.strokeStyle = 'rgba(10,20,28,.6)'; g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-L*0.5, 0);
      g.quadraticCurveTo(-L*0.1, -L*0.20, L*0.34, 0);
      g.quadraticCurveTo(-L*0.1, L*0.20, -L*0.5, 0);
      g.closePath(); g.fill(); g.stroke();
      g.beginPath();
      g.moveTo(-L*0.46, 0); g.lineTo(-L*0.66, -L*0.16);
      g.lineTo(-L*0.62, 0); g.lineTo(-L*0.66, L*0.16);
      g.closePath(); g.fill(); g.stroke();
      disco(L*0.20, -L*0.04, L*0.045, '#12181e');
    }
    g.restore();
    /* la espuma en la superficie, justo encima del pez */
    g.save(); g.globalAlpha = 0.35 + S_tir*0.3;
    g.strokeStyle = '#dff0ff'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(fx, hz + 26, 46 + S_tir*26, 9, 0, 0, 7); g.stroke();
    g.restore();
  }

  if (S_fase === 'pelea') sBarra(g);

  if (S_fase === 'tira'){
    const d = S_arr ? Math.max(0, S_arr.y - S_arr.y0) : 0;
    const u2 = Math.min(1, d/260);
    const w = AN*0.6, x = (AN - w)/2, y = AL*0.22;
    caja2(x, y, w, 18, 9, 'rgba(12,10,8,.5)', 'rgba(255,255,255,.2)');
    caja2(x + 2, y + 2, (w - 4)*u2, 14, 7, '#7fe08a', null);
    texto(TX('c1'), AN/2, y - 14, 21, 'rgba(242,238,230,.62)', '700', 'center');
  }
  if (S_fase === 'pica')
    texto(TX('pico'), AN/2, AL*0.36, 62, '#ffd76a', '800', 'center');
  if (S_resT > 0){
    const al = Math.min(1, S_resT/0.4);
    const col = S_res === 'saco' ? '127,224,138' : '255,106,90';
    texto(TX(S_res), AN/2, AL*0.36, 46,
          'rgba(' + col + ',' + al.toFixed(2) + ')', '800', 'center');
  }
  /* y los metros NO se repiten en el lienzo: ya estan arriba, en la marca del
     HUD, que es la mas grande de la pantalla */
}

/* ══════════ LA CINEMÁTICA ══════════ */
function sDemo(g, u, plano){
  const gn = S_nivel, gf = S_fase, gt = S_t, gp = S_pez, gd = S_dist;
  const gte = S_ten, gh = S_hold, gr = S_res, grt = S_resT, ga = S_arr;
  const gb0 = JUEGO.b0, gb1 = JUEGO.b1;

  const G = sGenera(plano === 2 ? 20 : 4);
  S_pez = G.pez; JUEGO.b0 = G.b0; JUEGO.b1 = G.b1;
  S_res = ''; S_resT = 0; S_arr = null;
  if (plano === 0){
    S_fase = 'tira'; S_dist = S_pez.largo;
    S_arr = { y0: AL*0.52, y: AL*0.52 + u*240 };
  } else {
    S_fase = 'pelea'; S_t = 0; S_ten = 0; S_dist = S_pez.largo;
    const dt = 1/120, T = plano === 1 ? 0.2 + u*2.2 : 0.2 + u*4.5;
    for (let s = 0; s < T; s += dt){
      if (plano === 1) S_hold = true;
      else {
        if (S_ten > JUEGO.b1 - 0.06) S_hold = false;
        else if (S_ten < JUEGO.b0 + 0.04) S_hold = true;
      }
      JUEGO.paso(dt);
      if (S_fase !== 'pelea') break;
    }
  }
  ambAtras();
  sPinta(g);
  ambAdelante();

  S_nivel = gn; S_fase = gf; S_t = gt; S_pez = gp; S_dist = gd;
  S_ten = gte; S_hold = gh; S_res = gr; S_resT = grt; S_arr = ga;
  JUEGO.b0 = gb0; JUEGO.b1 = gb1;
}
