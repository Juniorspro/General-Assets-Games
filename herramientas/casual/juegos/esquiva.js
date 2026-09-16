/* ══════════════════════════════ ESQUIVA ══════════════════════════════
   Un duelo de espadas: el rival levanta el arma, y en ese instante ya dice por
   dónde va a venir. Hay que salir de ahí y devolver el golpe.

   ── EL VERBO ES LEER Y RESPONDER EN UNA DIRECCIÓN ──
   ARCO apunta, PENAL dibuja, DUELO espera, PESCA modula y SALTO carga. Acá el
   gesto es un MANOTAZO en una de tres direcciones, y lo único que importa es
   cuál: el golpe de arriba se esquiva agachándose, el de abajo saltando, y la
   estocada del medio dando un paso al costado. La dirección de la esquiva es la
   contraria a la del golpe, así que no hay que memorizar una tabla — hay que
   mirar el arma.

   ── Y LA FINTA ES LO QUE CONVIERTE EL REFLEJO EN LECTURA ──
   Sin ella, el juego óptimo es responder al primer cuadro del aviso, o sea puro
   tiempo de reacción. Con la finta, el que responde primero se equivoca: el
   aviso puede cambiar a mitad de camino, y entonces esperar cuesta menos que
   apurarse. Aparece pasado el nivel 12, que es cuando ya se entendió el gesto. */

const E_NIVELES = 45;
const E_GOLPES = [
  { k: 'alto',  esq: 'abajo', col: '#c4553c' },   /* espada arriba → agacharse */
  { k: 'medio', esq: 'atras', col: '#c4a03c' },   /* estocada → paso al costado */
  { k: 'bajo',  esq: 'arriba', col: '#4a8fc4' },  /* hacha baja → saltar */
];

let E_fase = 'quieto';         /* quieto · avisa · golpea · esquiva · contra · resuelve */
let E_t = 0, E_golpe = 0, E_real = 0, E_finta = false;
let E_aviso = 0, E_vent = 0;
let E_nivel = 1, E_vidaR = 0, E_vidaY = 0, E_ronda = 0;
let E_riv = null;
let E_res = '', E_resT = 0, E_lento = 0, E_sac = 0;
let E_yoPose = 0;              /* 0 guardia · 1 corte */
let E_esq = '';                /* la esquiva que se hizo */
let E_azar = 13;
function eAz(){ E_azar = (E_azar*1664525 + 1013904223) >>> 0; return E_azar / 4294967296; }

const JT = {
  es: { sub:'Mirá el arma y salí para el otro lado. Después contraatacá.',
        c1:'El arma dice por dónde viene.',
        c2:'Arriba se esquiva agachándose. Abajo, saltando.',
        c3:'Y a veces finta. Cuarenta y cinco duelos.',
        nivelC:'DUELO', vidaC:'VIDA', rivalC:'RIVAL',
        arriba:'SALTÁ', abajo:'AGACHATE', atras:'AL COSTADO',
        bien:'¡ESQUIVÓ!', mal:'TE DIO', tarde:'TARDE', contra:'¡CONTRA!',
        gano:'¡GANASTE!' },
  en: { sub:'Watch the weapon and go the other way. Then hit back.',
        c1:'The weapon tells you where it comes from.',
        c2:'High is dodged by ducking. Low, by jumping.',
        c3:'And sometimes he feints. Forty-five duels.',
        nivelC:'DUEL', vidaC:'LIFE', rivalC:'RIVAL',
        arriba:'JUMP', abajo:'DUCK', atras:'STEP ASIDE',
        bien:'DODGED!', mal:'HE HIT YOU', tarde:'TOO LATE', contra:'COUNTER!',
        gano:'YOU WIN!' },
  pt: { sub:'Olhe a arma e vá para o outro lado. Depois contra-ataque.',
        c1:'A arma diz de onde vem.',
        c2:'Em cima se esquiva agachando. Embaixo, pulando.',
        c3:'E às vezes finta. Quarenta e cinco duelos.',
        nivelC:'DUELO', vidaC:'VIDA', rivalC:'RIVAL',
        arriba:'PULE', abajo:'AGACHE', atras:'PRO LADO',
        bien:'ESQUIVOU!', mal:'ELE ACERTOU', tarde:'TARDE', contra:'CONTRA!',
        gano:'VOCÊ VENCEU!' }
};
const PIEL = { ac:'#8fb8d8', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tensa', pierde:'grito', gana:'gana',
                    clic:'clic', caida:'tira' };
const AMB = {
  foto: 'f_esquiva',
  cielo: ['#2a3a5a', '#0d1220'],
  haz: 0.12,
  vineta: 0.46,
  part: { n: 14, dir: 'cae', forma: 'disco', col: '#e8d0e0',
          r0: 1.6, r1: 3.8, v0: 8, v1: 22, amp: 60, gira: 0,
          a0: 0.06, a1: 0.18 }
};

/* ── LO QUE CRECE, Y NO ES LA VELOCIDAD DEL GOLPE ──
   Lo que se achica es el AVISO: cuánto dura el telegrafiado antes del golpe. La
   ventana para esquivar se queda casi igual, así que el juego no pide manos más
   rápidas sino leer antes. Y el piso del aviso es 0,30 s: por debajo de eso ya
   no es lectura, es reacción pura. */
function eGenera(n){
  E_azar = (n*2246822519) >>> 0;
  for (let i = 0; i < 4; i++) eAz();
  const k = Math.min(1, (n - 1)/40);
  return {
    aviso: Math.max(0.30, 0.95 - k*0.60),
    vent: Math.max(0.26, 0.44 - k*0.16),
    finta: n > 12 ? Math.min(0.45, (n - 12)*0.016) : 0,
    vidaR: 3 + Math.floor(k*3),
    vidaY: 3
  };
}

const JUEGO = {
  id: 'esquiva',
  tipo: 'niveles',
  nivelesTotal: E_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return E_vidaR; },
  get sub(){ return TX('rivalC'); },
  get ficI(){ return TX('nivelC') + ' ' + NIVEL; },
  get ficD(){ return TX('vidaC') + ' ' + E_vidaY; },
  get resta(){ return this.max ? Math.max(0, E_vidaR/this.max) : 0; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ eDemo(g, u, 0); } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){ eDemo(g, u, 1); } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){ eDemo(g, u, 2); } }
  ],

  arranca(n){
    E_nivel = n || 1;
    const G = eGenera(E_nivel);
    E_riv = G; this.max = G.vidaR;
    E_vidaR = G.vidaR; E_vidaY = G.vidaY; E_ronda = 0;
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
    E_res = ''; E_resT = 0; E_lento = 0;
    this.nueva();
  },

  nueva(){
    E_fase = 'quieto'; E_t = 0; E_esq = ''; E_yoPose = 0;
    /* ── EL GOLPE SE SORTEA AL EMPEZAR LA RONDA Y NO AL AVISAR ──
       Sorteado al avisar, la finta no podría existir: la finta es justamente
       mostrar UNO y tirar OTRO, así que los dos tienen que estar decididos
       antes de que empiece el aviso. */
    E_golpe = (eAz()*3)|0;
    E_finta = eAz() < E_riv.finta;
    E_real = E_finta ? ((E_golpe + 1 + ((eAz()*2)|0)) % 3) : E_golpe;
    E_aviso = E_riv.aviso; E_vent = E_riv.vent;
  },

  paso(dt){
    const dtm = E_lento > 0 ? dt*0.3 : dt;
    if (E_lento > 0) E_lento = Math.max(0, E_lento - dt);
    if (E_resT > 0) E_resT = Math.max(0, E_resT - dt);
    if (E_sac > 0) E_sac = Math.max(0, E_sac - dt*3);
    E_t += dtm;
    if (E_fase === 'quieto'){
      if (E_t > 0.55 + eAz()*0.5){ E_fase = 'avisa'; E_t = 0; son('toque', 0.6); }
      return;
    }
    if (E_fase === 'avisa'){
      /* la finta cambia el aviso a los dos tercios: antes de eso lo que se ve
         es el golpe falso */
      if (E_t > E_aviso){ E_fase = 'golpea'; E_t = 0; son('caida', 0.9); }
      return;
    }
    if (E_fase === 'golpea'){
      /* la ventana para esquivar arranca CON el golpe, no con el aviso: si
         arrancara con el aviso, responder temprano seria gratis y la finta no
         costaria nada */
      if (E_t > E_vent){ this.pega(); }
      return;
    }
    if (E_fase === 'esquiva'){
      if (E_t > 0.42){ E_fase = 'contra'; E_t = 0; }
      return;
    }
    if (E_fase === 'contra'){
      /* la ventana de contraataque: si no se toca, se pierde el golpe pero no
         la vida */
      if (E_t > 0.60){ this.cierra(false); }
      return;
    }
    if (E_fase === 'resuelve'){
      if (E_t > 1.1) this.sigue();
    }
  },

  /* ── LA ESQUIVA: LA DIRECCIÓN DEL DEDO CONTRA LA DEL GOLPE ──
     Y sólo cuenta durante `golpea`: hacerlo durante el aviso es adelantarse a
     un golpe que todavía puede cambiar. */
  esquiva(dir){
    /* ── ESQUIVAR DURANTE EL AVISO ES LEGAL, Y ES UNA APUESTA ──
       La primera version lo castigaba siempre, y eso convertia al bot «rapido»
       en un espantapajaros: medido, tasa 0,000 en las ciento treinta y cinco
       rondas, o sea que la comparacion no medía la finta sino una regla. Lo
       correcto es que la esquiva temprana se juzgue contra el golpe DE VERDAD:
       sin finta acierta, con finta se come el golpe. Asi el que se apura gana
       tiempo y pierde informacion, que es la decision que este juego tiene. */
    if (E_fase !== 'avisa' && E_fase !== 'golpea') return;
    E_esq = dir;
    if (dir === E_GOLPES[E_real].esq){
      E_fase = 'esquiva'; E_t = 0;
      E_res = 'bien'; E_resT = 0.7;
      son('bien', 0.8); E_lento = 0.25;
    } else this.falla('mal');
  },

  golpea(){
    if (E_fase !== 'contra') return;
    E_vidaR--;
    E_res = 'contra'; E_resT = 0.9;
    E_yoPose = 1;
    son('gana', 0.85); sacude(0.35); destella('#ffd76a', 0.6);
    this.cierra(true);
  },

  pega(){ this.falla('mal'); },

  falla(k){
    E_vidaY--;
    E_res = k; E_resT = 1.2;
    son('pierde', 0.9); sacude(0.5); destella('#ff6a5a', 0.7);
    E_fase = 'resuelve'; E_t = 0; E_lento = 0.35;
  },

  cierra(){
    E_fase = 'resuelve'; E_t = 0;
  },

  sigue(){
    E_ronda++;
    if (E_vidaR <= 0){
      this.gano = true;
      this.estrellas = E_vidaY >= 3 ? 3 : (E_vidaY === 2 ? 2 : 1);
      this.finP = TX('vidaC') + ' ' + E_vidaY;
      E_res = 'gano'; E_resT = 1.5;
      this.vivo = false; return;
    }
    if (E_vidaY <= 0){ this.vivo = false; return; }
    this.nueva();
  },

  fondo(g){},
  pinta(g){ ePinta(g); },

  /* el manotazo dispara apenas pasa el umbral, no al soltar: soltando, un dedo
     que se queda apoyado no responde nunca */
  baja(px, py){
    if (MODO !== 'juega') return;
    this.arr = { x: px, y: py, hecho: false };
    if (E_fase === 'contra') this.golpea();
  },
  mueve(px, py){
    if (!this.arr || this.arr.hecho) return;
    const dx = px - this.arr.x, dy = py - this.arr.y;
    if (Math.hypot(dx, dy) < 46) return;
    this.arr.hecho = true;
    this.esquiva(Math.abs(dy) > Math.abs(dx)
                 ? (dy < 0 ? 'arriba' : 'abajo') : 'atras');
  },
  sube(){ this.arr = null; },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto ESPERA a que el golpe salga y recién ahí se mueve —o sea que la
     finta no lo agarra—; el otro responde al aviso, que es lo que haría alguien
     que confunde este juego con uno de reflejos. Si leer no sirviera, los dos
     esquivarían igual. */
  juegaSolo(n, azar){
    let gana = 0, malos = [], rondas = 0, esq = 0;
    const dt = 1/60;
    for (let niv = 1; niv <= (n || E_NIVELES); niv++){
      this.arranca(niv);
      let v = 0;
      while (this.vivo && v < 9000){
        v++;
        if (azar && E_fase === 'avisa' && E_t > E_aviso*0.5){
          /* responde al AVISO: acierta salvo que haya finta */
          rondas++;
          const antes = E_vidaY;
          this.esquiva(E_GOLPES[E_golpe].esq);
          if (E_vidaY === antes) esq++;
          continue;
        }
        if (!azar && E_fase === 'golpea' && E_t > E_vent*0.35){
          rondas++;
          const antes = E_vidaY;
          this.esquiva(E_GOLPES[E_real].esq);
          if (E_vidaY === antes) esq++;
          continue;
        }
        if (E_fase === 'contra' && E_t > 0.12) this.golpea();
        this.paso(dt);
      }
      if (this.gano) gana++; else malos.push(niv);
    }
    return JSON.stringify({ niveles: (n || E_NIVELES), gana,
                            malos: malos.slice(0, 10), nMalos: malos.length,
                            rondas, esq,
                            tasa: rondas ? +(esq/rondas).toFixed(3) : 0 });
  },

  /* ── LA AUDITORÍA: QUE LA VENTANA SEA JUGABLE ──
     Un duelo se puede ganar si la ventana de esquiva es mayor que el tiempo de
     reacción de una persona (unos 0,25 s) y si el aviso alcanza para leer el
     arma. Los dos son números y se comprueban. */
  audita(a, b){
    const malos = [];
    let minV = 9, maxV = 0, minA = 9, maxA = 0;
    for (let n = (a || 1); n <= (b || E_NIVELES); n++){
      const G = eGenera(n);
      if (G.vent < 0.24) malos.push([n, 'ventana de ' + G.vent.toFixed(2) + ' s']);
      if (G.aviso < 0.28) malos.push([n, 'aviso de ' + G.aviso.toFixed(2) + ' s']);
      if (G.vidaR > 7) malos.push([n, 'el rival tiene ' + G.vidaR + ' de vida']);
      minV = Math.min(minV, G.vent); maxV = Math.max(maxV, G.vent);
      minA = Math.min(minA, G.aviso); maxA = Math.max(maxA, G.aviso);
    }
    return JSON.stringify({ niveles: (b || E_NIVELES) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            vent: [+minV.toFixed(2), +maxV.toFixed(2)],
                            aviso: [+minA.toFixed(2), +maxA.toFixed(2)] });
  },

  ver(){
    return JSON.stringify({
      nivel: E_nivel, fase: E_fase, t: +E_t.toFixed(2),
      golpe: E_GOLPES[E_golpe].k, real: E_GOLPES[E_real].k, finta: E_finta,
      aviso: +E_aviso.toFixed(2), vent: +E_vent.toFixed(2),
      vidaR: E_vidaR, vidaY: E_vidaY, esq: E_esq, res: E_res,
      vivo: this.vivo, gano: this.gano, est: this.estrellas });
  },
  cfg(o){
    if (o.esq) this.esquiva(o.esq);
    if (o.contra) this.golpea();
    if (o.pasos) for (let i = 0; i < o.pasos; i++) this.paso(1/60);
    return this.ver();
  }
};

/* ══════════════════════════════ EL DIBUJO ══════════════════════════════ */

/* ── EL AVISO ES EL ARMA, NO UN CARTEL ──
   Se dibuja el arma del rival levantada en la posición del golpe que viene, y
   además una flecha grande en la dirección en la que hay que salir. La flecha
   está para los primeros niveles: el arma sola pide saber leer una silueta, y
   este juego tiene que poder empezarse sin instrucciones. */
function eFlecha(g, dir, al){
  const cx = AN/2, cy = AL*0.44;
  g.save();
  g.globalAlpha = al;
  g.strokeStyle = '#ffd76a'; g.lineWidth = 12; g.lineCap = 'round';
  g.lineJoin = 'round';
  const L = 62;
  const d = dir === 'arriba' ? [0, -1] : (dir === 'abajo' ? [0, 1] : [-1, 0]);
  g.beginPath();
  g.moveTo(cx - d[0]*L, cy - d[1]*L);
  g.lineTo(cx + d[0]*L, cy + d[1]*L);
  g.stroke();
  g.beginPath();
  g.moveTo(cx + d[0]*L, cy + d[1]*L);
  g.lineTo(cx + d[0]*L - d[0]*34 - d[1]*30, cy + d[1]*L - d[1]*34 - d[0]*30);
  g.moveTo(cx + d[0]*L, cy + d[1]*L);
  g.lineTo(cx + d[0]*L - d[0]*34 + d[1]*30, cy + d[1]*L - d[1]*34 + d[0]*30);
  g.stroke();
  g.restore();
}

function eSamurai(g, x, suelo, alto, pose, esp, col){
  g.save();
  g.translate(x, suelo);
  if (esp) g.scale(-1, 1);
  g.save(); g.globalAlpha = 0.32;
  g.beginPath(); g.ellipse(0, 0, alto*0.28, alto*0.06, 0, 0, 7);
  g.fillStyle = '#000'; g.fill(); g.restore();
  const H = alto;
  g.fillStyle = col;
  g.strokeStyle = 'rgba(14,18,26,.65)'; g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-H*0.13, 0); g.lineTo(-H*0.11, -H*0.36);
  g.lineTo(-H*0.22, -H*0.66); g.lineTo(-H*0.12, -H*0.76);
  g.lineTo(H*0.12, -H*0.76); g.lineTo(H*0.22, -H*0.66);
  g.lineTo(H*0.11, -H*0.36); g.lineTo(H*0.13, 0);
  g.closePath(); g.fill(); g.stroke();
  disco(0, -H*0.85, H*0.10, '#e8b48a');
  g.beginPath(); g.arc(0, -H*0.85, H*0.10, 0, 7); g.stroke();
  /* la katana: su ángulo ES el aviso */
  g.save();
  g.translate(H*0.16, -H*0.60);
  g.rotate(pose);
  g.strokeStyle = '#dfe6f0'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(H*0.62, -H*0.10); g.stroke();
  g.strokeStyle = '#3a2418'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-H*0.14, H*0.03); g.stroke();
  g.restore();
  g.restore();
}

function ePinta(g){
  const suelo = AL*0.74;
  const pat = patron('e_piso');
  g.fillStyle = '#b8ae98';
  g.fillRect(0, suelo, AN, AL - suelo);
  if (pat){
    g.save();
    g.beginPath(); g.rect(0, suelo, AN, AL - suelo); g.clip();
    g.globalAlpha = 0.62; g.fillStyle = pat; g.fillRect(0, suelo, AN, AL);
    g.restore();
  }
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, suelo); g.lineTo(AN, suelo); g.stroke();

  const H = 290;
  /* el que se muestra durante el aviso es el golpe FALSO hasta que sale el
     verdadero: eso es la finta, y por eso el aviso se lee del `E_golpe` */
  const muestro = (E_fase === 'avisa') ? E_golpe : E_real;

  /* el jugador, a la izquierda, esquivando de verdad */
  let dx = 0, dy = 0, ag = 1;
  if (E_fase === 'esquiva' || (E_fase === 'resuelve' && E_res === 'bien')){
    if (E_esq === 'arriba') dy = -78;
    else if (E_esq === 'abajo') ag = 0.62;
    else dx = -60;
  }
  g.save();
  g.translate(dx, dy);
  if (!dibCuadro('e_ninja', E_yoPose, AN*0.30, suelo, H*ag))
    eSamurai(g, AN*0.30, suelo, H*ag, E_yoPose ? -1.25 : -0.35, false, '#3c6b8f');
  g.restore();

  /* el rival, a la derecha y espejado */
  const pose = [-1.35, -0.10, 0.65][muestro];
  const golpeando = E_fase === 'golpea' || E_fase === 'esquiva';
  if (!dibCuadro('e_rival', muestro, AN*0.72, suelo, H, false))
    eSamurai(g, AN*0.72, suelo, H, golpeando ? pose*0.25 : pose, true,
             E_GOLPES[muestro].col);

  /* la línea del golpe: sale del arma y cruza hasta el jugador. Es lo que hace
     que «arriba» y «abajo» se vean como alturas y no como palabras */
  if (E_fase === 'golpea' || E_fase === 'avisa'){
    const y = suelo - H*[0.86, 0.55, 0.20][muestro];
    const u = E_fase === 'golpea' ? Math.min(1, E_t/E_vent) : 0;
    const x0 = AN*0.72, x1 = AN*0.30;
    g.save();
    g.globalAlpha = E_fase === 'avisa' ? 0.30 : 0.85;
    g.strokeStyle = E_GOLPES[muestro].col;
    g.lineWidth = E_fase === 'avisa' ? 5 : 9;
    g.setLineDash(E_fase === 'avisa' ? [14, 12] : []);
    g.beginPath();
    g.moveTo(x0, y); g.lineTo(x0 + (x1 - x0)*(E_fase === 'avisa' ? 1 : u), y);
    g.stroke();
    g.restore();
  }

  /* la flecha de la esquiva, en los primeros niveles */
  if (E_nivel <= 8 && (E_fase === 'avisa' || E_fase === 'golpea'))
    eFlecha(g, E_GOLPES[muestro].esq, E_fase === 'golpea' ? 0.85 : 0.35);

  /* las dos vidas, como muescas */
  for (let i = 0; i < (JUEGO.max || 3); i++){
    const x = AN*0.60 + i*26, y = AL*0.115;
    caja2(x, y, 18, 18, 4, i < E_vidaR ? '#ff6a5a' : 'rgba(255,255,255,.14)',
          'rgba(255,255,255,.25)');
  }
  for (let i = 0; i < 3; i++){
    const x = AN*0.16 + i*26, y = AL*0.115;
    caja2(x, y, 18, 18, 4, i < E_vidaY ? '#7fe08a' : 'rgba(255,255,255,.14)',
          'rgba(255,255,255,.25)');
  }

  if (E_fase === 'contra'){
    const p = 0.5 + 0.5*Math.sin(performance.now()*0.02);
    texto(TX('contra'), AN/2, AL*0.32, 52,
          'rgba(255,215,106,' + (0.5 + p*0.5).toFixed(2) + ')', '800', 'center');
  }
  if (E_resT > 0){
    const al = Math.min(1, E_resT/0.4);
    const col = (E_res === 'bien' || E_res === 'contra' || E_res === 'gano')
              ? '127,224,138' : '255,106,90';
    texto(TX(E_res), AN/2, AL*0.32, 48,
          'rgba(' + col + ',' + al.toFixed(2) + ')', '800', 'center');
  }
  if (MODO === 'juega' && E_ronda === 0 && E_fase === 'quieto')
    texto(TX('c1'), AN/2, AL - 250, 22, 'rgba(242,238,230,.62)', '700', 'center');
}

/* ══════════ LA CINEMÁTICA ══════════ */
function eDemo(g, u, plano){
  const gn = E_nivel, gf = E_fase, gt = E_t, gg = E_golpe, gr = E_real;
  const gv = E_vidaR, gy = E_vidaY, gs = E_res, gst = E_resT, ge = E_esq;
  const gp = E_yoPose, gro = E_ronda, gm = JUEGO.max;

  const G = eGenera(plano === 2 ? 26 : 3);
  E_riv = G; JUEGO.max = G.vidaR; E_vidaR = G.vidaR; E_vidaY = 3;
  E_aviso = G.aviso; E_vent = G.vent; E_ronda = 1;
  E_res = ''; E_resT = 0; E_esq = ''; E_yoPose = 0;
  if (plano === 0){
    E_golpe = 0; E_real = 0; E_fase = 'avisa'; E_t = u*G.aviso;
    E_nivel = 3;
  } else if (plano === 1){
    E_golpe = 2; E_real = 2; E_fase = 'golpea'; E_t = u*G.vent*0.9;
    E_nivel = 3;
  } else {
    E_golpe = 1; E_real = 1; E_fase = 'esquiva'; E_esq = 'atras';
    E_t = 0; E_yoPose = 1; E_res = 'contra'; E_resT = 1.2;
    E_nivel = 26; E_vidaR = 2;
  }
  ambAtras();
  ePinta(g);
  ambAdelante();

  E_nivel = gn; E_fase = gf; E_t = gt; E_golpe = gg; E_real = gr;
  E_vidaR = gv; E_vidaY = gy; E_res = gs; E_resT = gst; E_esq = ge;
  E_yoPose = gp; E_ronda = gro; JUEGO.max = gm;
}
