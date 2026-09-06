/* ══════════════════════════════ PIEDRA ══════════════════════════════
   Piedra, papel o tijera contra una escalera de rivales, y la jugada se hace
   MOSTRÁNDOLE LA MANO A LA CÁMARA. Cada rival tiene una cabeza distinta; al
   ganarle se elige una de tres cartas y se pasa al siguiente. Roguelike: la
   corrida termina cuando se acaban las vidas.

   ── POR QUÉ ESTE JUEGO NO ES UNA MONEDA AL AIRE ──
   Piedra papel o tijera entre dos personas es azar puro: la estrategia óptima
   contra alguien que juega uniforme es jugar uniforme, y ahí no hay nada que
   decidir. Lo que lo vuelve un juego es que LOS RIVALES NO JUEGAN UNIFORME: uno
   repite, otro cicla, otro copia lo que hiciste vos, otro juega lo que le gana a
   tu última. Cada uno tiene un agujero, y encontrarlo es el juego.
   Y por eso el rival que juega al azar es el MÁS DIFÍCIL de todos, no el más
   fácil — contra él nadie puede pasar del cincuenta por ciento, y eso es un
   teorema y no una opinión. Va último de cada vuelta a propósito.

   ── Y POR ESO EL AUTO-JUGADOR ES LA PRUEBA ──
   El honesto lleva TRES predictores a la vez y usa el que más viene acertando;
   el otro tira uniforme. Si decidir no sirviera, los dos llegarían igual de
   lejos. Está medido abajo y no lo hacen.

   ── LA MANO ──
   `m.js` devuelve el gesto ya votado (tres cuadros seguidos). Acá se lee UNA vez
   en el instante del «¡ya!» y no antes: leyendo continuamente, mover la mano
   mientras se piensa cambiaría la jugada sin que nadie lo haya decidido. Y el
   respaldo táctil no es un extra — sin cámara el juego sería imposible. */

const P_SIM = ['piedra', 'papel', 'tijera'];
/* le gana a: piedra(0) < papel(1) < tijera(2) < piedra(0) */
const pGana = (a, b) => (a + 3 - b) % 3 === 1;

/* ══════════ LOS RIVALES ══════════
   Seis cabezas, cada una con su agujero. El orden NO es arbitrario: `repite` va
   primera porque es la única que se puede leer en dos rondas, o sea que enseña
   sin que nadie explique nada; `azar` va última porque es la que no tiene
   agujero y no se puede aprender. */
/* ── Y CADA CABEZA TIENE LA CARA QUE LE CORRESPONDE ──
   El orden de esta lista es el de la hoja de retratos generada, y no es un
   detalle: el robot es el que cuenta tu símbolo más frecuente y el tahúr el que
   juega lo que le gana a tu última. Con las caras mezcladas, el rival dejaría de
   decir de lejos qué clase de rival es — y eso es exactamente la información que
   el jugador necesita para saber qué agujero buscar. */
const P_RIVALES = [
  { k: 'repite', juega(h){ return this.f != null ? this.f : (this.f = (Math.random()*3)|0); } },
  { k: 'ciclo',  juega(h){ this.c = (this.c == null ? (Math.random()*3)|0 : this.c + 1) % 3; return this.c; } },
  { k: 'copia',  juega(h){ return h.yo.length ? h.yo[h.yo.length-1] : (Math.random()*3)|0; } },
  { k: 'vence',  juega(h){ return h.yo.length ? (h.yo[h.yo.length-1] + 1) % 3 : (Math.random()*3)|0; } },
  { k: 'frec',   juega(h){
      if (!h.yo.length) return (Math.random()*3)|0;
      const c = [0,0,0];
      for (const s of h.yo) c[s]++;
      let m = 0;
      for (let i = 1; i < 3; i++) if (c[i] > c[m]) m = i;
      return (m + 1) % 3;   /* le gana a lo que más jugás */
    } },
  { k: 'azar',   juega(){ return (Math.random()*3)|0; } }
];

/* ══════════ LAS CARTAS ══════════
   Ocho, todas con tope, y NINGUNA es «más puntos»: todas cambian la regla del
   duelo siguiente. Es la lección de DADOS — una mejora sin tope convierte el
   roguelike en una cuenta que se va al infinito. */
const P_CARTAS = [
  { k: 'vida',    tope: 3 },   /* una vida más */
  { k: 'empate',  tope: 1 },   /* el primer empate de cada duelo es tuyo */
  { k: 'escudo',  tope: 2 },   /* la primera derrota de cada duelo no cuenta */
  { k: 'espia',   tope: 1 },   /* ves la última jugada del rival */
  { k: 'lento',   tope: 3 },   /* la cuenta va más despacio */
  { k: 'roca',    tope: 2 },   /* ganar con piedra vale dos */
  { k: 'hoja',    tope: 2 },   /* ganar con papel vale dos */
  { k: 'filo',    tope: 2 },   /* ganar con tijera vale dos */
];
let P_mej = {};
const pM = (k) => P_mej[k] || 0;

let P_duelo = 1, P_vidas = 3, P_puntos = 0;
let P_riv = P_RIVALES[0], P_meta = 3;
let P_mi = 0, P_su = 0;          /* el marcador del duelo */
/* la historia, que es lo que los dos leen — y también dónde vive el modelo que
   el auto-jugador se hace del rival, para que se borre con él */
let P_h = { yo: [], el: [], punt: [0,0,0], ult: [-1,-1,-1] };
let P_fase = 'cuenta';           /* cuenta · revela · elige · fin */
let P_t = 0, P_ronda = 0;
let P_miJug = -1, P_suJug = -1, P_res = 0;   /* -1 pierdo · 0 empate · 1 gano */
let P_escUsado = false, P_empUsado = false;
let P_oferta = [];
let P_toque = -1;                /* el respaldo tactil */
let P_forz = -1;                 /* la sonda escribe aca */
let P_sacude = 0;

const P_CUENTA = 2.6;            /* segundos de «piedra, papel, tijera…» */
const P_REVELA = 1.5;            /* lo que dura ver el resultado */
const pCuenta = () => P_CUENTA*(1 + pM('lento')*0.24);

/* ══════════ LOS TEXTOS ══════════ */
const JT = {
  es: { sub:'Mostrá la mano a la cámara antes del ¡YA!',
        c1:'Mostrale la mano a la cámara.',
        c2:'Piedra, papel o tijera. Cada rival juega distinto.',
        c3:'Ganá el duelo, elegí una carta y seguí subiendo.',
        dueloC:'DUELO', ganasteR:'¡GANASTE!', perdisteR:'PERDISTE', empateR:'EMPATE',
        ya:'¡YA!', elegi:'ELEGÍ UNA CARTA', ganaste:'DUELO GANADO',
        sinCam:'Sin cámara: tocá uno de los tres',
        conCam:'Se juega mostrando la mano a la cámara',
        piedra:'PIEDRA', papel:'PAPEL', tijera:'TIJERA',
        r_repite:'EL PIBE', r_ciclo:'LA ABUELA', r_copia:'EL LUCHADOR',
        r_vence:'EL TAHÚR', r_frec:'EL ROBOT', r_azar:'EL ENCAPUCHADO',
        m_vida:'UNA VIDA MÁS', m_empate:'EMPATE A FAVOR', m_escudo:'ESCUDO',
        m_espia:'ESPÍA', m_lento:'MÁS TIEMPO', m_roca:'PUÑO DE PIEDRA',
        m_hoja:'MANO DE PAPEL', m_filo:'FILO',
        d_vida:'Empezás con una vida más.',
        d_empate:'Los empates cuentan como punto tuyo.',
        d_escudo:'La primera derrota de cada duelo no cuenta.',
        d_espia:'Ves la última jugada del rival.',
        d_lento:'La cuenta va más despacio.',
        d_roca:'Ganar con piedra vale dos puntos.',
        d_hoja:'Ganar con papel vale dos puntos.',
        d_filo:'Ganar con tijera vale dos puntos.' },
  en: { sub:'Show your hand to the camera before GO!',
        c1:'Show your hand to the camera.',
        c2:'Rock, paper or scissors. Every rival plays differently.',
        c3:'Win the duel, pick a card and keep climbing.',
        dueloC:'DUEL', ganasteR:'YOU WIN!', perdisteR:'YOU LOSE', empateR:'DRAW',
        ya:'GO!', elegi:'PICK A CARD', ganaste:'DUEL WON',
        sinCam:'No camera: tap one of the three',
        conCam:'Played by showing your hand to the camera',
        piedra:'ROCK', papel:'PAPER', tijera:'SCISSORS',
        r_repite:'THE KID', r_ciclo:'GRANDMA', r_copia:'THE WRESTLER',
        r_vence:'THE GAMBLER', r_frec:'THE ROBOT', r_azar:'THE HOODED ONE',
        m_vida:'ONE MORE LIFE', m_empate:'DRAWS ARE YOURS', m_escudo:'SHIELD',
        m_espia:'SPY', m_lento:'MORE TIME', m_roca:'STONE FIST',
        m_hoja:'PAPER HAND', m_filo:'EDGE',
        d_vida:'Start with one extra life.',
        d_empate:'Draws count as your point.',
        d_escudo:'The first loss of each duel does not count.',
        d_espia:'You see the rival last play.',
        d_lento:'The countdown runs slower.',
        d_roca:'Winning with rock is worth two points.',
        d_hoja:'Winning with paper is worth two points.',
        d_filo:'Winning with scissors is worth two points.' },
  pt: { sub:'Mostre a mão para a câmera antes do JÁ!',
        c1:'Mostre a mão para a câmera.',
        c2:'Pedra, papel ou tesoura. Cada rival joga diferente.',
        c3:'Ganhe o duelo, escolha uma carta e continue subindo.',
        dueloC:'DUELO', ganasteR:'VOCÊ GANHOU!', perdisteR:'VOCÊ PERDEU', empateR:'EMPATE',
        ya:'JÁ!', elegi:'ESCOLHA UMA CARTA', ganaste:'DUELO GANHO',
        sinCam:'Sem câmera: toque em um dos três',
        conCam:'Jogue mostrando a mão para a câmera',
        piedra:'PEDRA', papel:'PAPEL', tijera:'TESOURA',
        r_repite:'O GAROTO', r_ciclo:'A VOVÓ', r_copia:'O LUTADOR',
        r_vence:'O APOSTADOR', r_frec:'O ROBÔ', r_azar:'O ENCAPUZADO',
        m_vida:'MAIS UMA VIDA', m_empate:'EMPATE A FAVOR', m_escudo:'ESCUDO',
        m_espia:'ESPIÃO', m_lento:'MAIS TEMPO', m_roca:'PUNHO DE PEDRA',
        m_hoja:'MÃO DE PAPEL', m_filo:'FIO',
        d_vida:'Comece com uma vida a mais.',
        d_empate:'Empates contam como ponto seu.',
        d_escudo:'A primeira derrota de cada duelo não conta.',
        d_espia:'Você vê a última jogada do rival.',
        d_lento:'A contagem vai mais devagar.',
        d_roca:'Ganhar com pedra vale dois pontos.',
        d_hoja:'Ganhar com papel vale dois pontos.',
        d_filo:'Ganhar com tesoura vale dois pontos.' }
};
const PIEL = { ac:'#ff8a5c', tela:'fondo' };
const SON_ALIAS = { bien:'fusion', toque:'clic', pierde:'perder', gana:'gana',
                    clic:'clic', caida:'caida' };

/* ══════════ EL AMBIENTE ══════════
   Un callejón de arcade de noche. Las motas de neón suben LENTAS: el juego
   entero pasa en el medio de la pantalla y dura dos segundos y medio por ronda,
   así que cualquier cosa que cruce rápido roba el ojo justo en el «¡ya!». */
const AMB = {
  foto: 'f_piedra',
  cielo: ['#1b1220', '#0a0710'],
  haz: 0.12,
  vineta: 0.48,
  granoK: 0.016,
  part: { n: 16, dir: 'sube', forma: 'disco', col: '#ff8a5c',
          r0: 1.2, r1: 3.0, v0: 8, v1: 26, amp: 34, gira: 0,
          a0: 0.08, a1: 0.22 }
};

/* ══════════ GEOMETRIA ══════════ */
let PG = { rY: 0, mY: 0, r: 0 };
function pGeo(){
  PG.r = Math.min(150, AN*0.21);
  PG.rY = AL*0.345;         /* la mano del rival, arriba */
  PG.mY = AL*0.615;         /* la mía, abajo */
}

/* ── Y A PARTIR DE LA TERCERA VUELTA EL RIVAL MIENTE A VECES ──
   Sin esto la escalera no tiene techo: las cabezas son deterministas, así que
   un jugador que ya aprendió las seis gana para siempre y la corrida no se
   termina nunca — medido, el auto-jugador honesto llegaba al duelo 39 y seguía
   vivo con tres vidas. Desde la vuelta 3, con probabilidad `1-p` el rival juega
   uniforme en vez de su estrategia, y `p` baja de 1 a 0,45. Eso NO es hacer
   trampa: es que el rival también aprende a no ser leído, y hace que el techo
   aparezca solo en vez de estar escrito en una constante. */
function pMezcla(n){
  const vuelta = Math.floor((n - 1)/P_RIVALES.length);
  return Math.max(0.45, 1 - Math.max(0, vuelta - 1)*0.09);
}
function pRivalDe(n){
  const r = P_RIVALES[(n - 1) % P_RIVALES.length];
  /* se CLONA: las cabezas guardan estado (`f` del terco, `c` del ciclo) y sin
     clonar, el terco de la segunda vuelta repetiría el mismo símbolo que en la
     primera — o sea que el jugador ya sabría la respuesta */
  const c = Object.assign(Object.create(Object.getPrototypeOf(r)), r, { f: null, c: null });
  const p = pMezcla(n), suyo = c.juega;
  c.juega = function(h){
    return Math.random() < p ? suyo.call(this, h) : (Math.random()*3)|0;
  };
  return c;
}
/* los puntos que hay que hacer crecen de a poco, y la vuelta entera vale más:
   el mismo rival otra vez con el mismo largo se sentiría a relleno */
const pMeta = (n) => 3 + Math.floor((n - 1)/4);

const JUEGO = {
  id: 'piedra',
  tipo: 'puntos',
  usa: ['mano'],
  vivo: true, gano: false,
  get marca(){ return P_puntos; },
  get sub(){ return TX('r_' + P_riv.k); },
  get ficI(){ return '♥ '.repeat(Math.max(0, P_vidas)).trim() || '—'; },
  get ficD(){ return P_mi + ' — ' + P_su; },
  get resta(){ return P_fase === 'cuenta' ? Math.max(0, 1 - P_t/pCuenta()) : 0; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ pDemo(g, u, 0); } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){ pDemo(g, u, 1); } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){ pDemo(g, u, 2); } }
  ],

  arranca(){
    P_duelo = 1; P_puntos = 0; P_vidas = 3; P_mej = {};
    this.vivo = true; this.gano = false;
    this.dueloNuevo();
  },
  dueloNuevo(){
    P_riv = pRivalDe(P_duelo);
    P_meta = pMeta(P_duelo);
    P_mi = 0; P_su = 0; P_ronda = 0;
    P_h = { yo: [], el: [], punt: [0,0,0], ult: [-1,-1,-1] };
    P_escUsado = false; P_empUsado = false;
    this.rondaNueva();
  },
  rondaNueva(){
    P_fase = 'cuenta'; P_t = 0;
    P_miJug = -1; P_suJug = -1; P_res = 0;
    P_toque = -1; P_forz = -1;
  },

  paso(dt){
    pGeo();
    if (P_sacude > 0) P_sacude = Math.max(0, P_sacude - dt*3);
    if (P_fase === 'cuenta'){
      P_t += dt;
      if (P_t >= pCuenta()) this.resuelve();
    } else if (P_fase === 'revela'){
      P_t += dt;
      if (P_t >= P_REVELA) this.sigue();
    }
  },

  /* ── LA JUGADA SE LEE UNA VEZ, EN EL «¡YA!» ──
     Leyendo continuamente, mover la mano mientras se piensa cambiaría la jugada
     sin que nadie lo haya decidido — y con un detector que vota tres cuadros,
     la jugada de verdad sería la de hace medio segundo. */
  resuelve(){
    let mi = P_forz >= 0 ? P_forz : (P_toque >= 0 ? P_toque : -1);
    if (mi < 0 && MANO.gesto) mi = P_SIM.indexOf(MANO.gesto);
    /* sin mano y sin toque: se pierde la ronda. NO se elige por el jugador —
       jugarle una al azar y que pierda sería peor, porque no sabría por qué */
    if (mi < 0){ mi = -1; }
    const su = P_riv.juega(P_h);
    P_miJug = mi; P_suJug = su;
    P_h.yo.push(mi < 0 ? ((Math.random()*3)|0) : mi);
    P_h.el.push(su);
    P_ronda++;

    P_res = mi < 0 ? -1 : (mi === su ? 0 : (pGana(mi, su) ? 1 : -1));
    /* ── EL EMPATE A FAVOR VALE UNA VEZ POR DUELO, Y ESO SE MIDIÓ ──
       Con «todos los empates son tuyos», la tasa de ganar una ronda pasa de un
       tercio a DOS tercios, o sea que la carta sola gana la corrida: medido, el
       auto-jugador que tira UNIFORME —que no decide nada— la sacó temprano y
       llegó al duelo 36 con tasa 0,646, cuando sin ella muere en el 2. Una carta
       que convierte al que juega al azar en el que gana no es una mejora: es un
       botón de ganar. Acotada a una por duelo sigue salvando la ronda que
       importa y no cambia la aritmética del juego. */
    if (P_res === 0 && pM('empate') && !P_empUsado){ P_res = 1; P_empUsado = true; }

    if (P_res === 1){
      const vale = 1 + ((mi === 0 && pM('roca')) || (mi === 1 && pM('hoja')) ||
                        (mi === 2 && pM('filo')) ? 1 : 0);
      P_mi += vale;
      son('bien', 0.9);
      P_puntos += sumaPuntos(10*vale + P_duelo*2, AN/2, AL*0.46);
      destella('#7fe08a', 0.5);
    } else if (P_res === -1){
      if (!P_escUsado && pM('escudo')){ P_escUsado = true; son('clic'); }
      else { P_su++; son('mal', 0.85); sacude(0.35); P_sacude = 1; }
    } else son('toque', 0.7);
    P_fase = 'revela'; P_t = 0;
  },

  sigue(){
    if (P_mi >= P_meta){
      /* el duelo ganado paga por lo que sobró del marcador: barrer 3-0 y ganar
         3-2 no pueden valer lo mismo */
      P_puntos += sumaPuntos(50 + P_duelo*15 + (P_meta - P_su)*10, AN/2, AL*0.42);
      son('gana', 0.9);
      destella('#ffd76a', 1.0);
      P_oferta = pSorteaOferta();
      P_fase = 'elige';
      if (!P_oferta.length){ P_duelo++; this.dueloNuevo(); }
      return;
    }
    if (P_su >= P_meta){
      P_vidas--;
      if (P_vidas <= 0){ son('pierde'); this.vivo = false; return; }
      /* se pierde una vida y se REINTENTA el mismo duelo: mandar al jugador
         cinco duelos atrás por una racha mala es la forma más rápida de que
         cierre el juego */
      this.dueloNuevo();
      return;
    }
    this.rondaNueva();
  },

  eligeCarta(i){
    const c = P_oferta[i];
    if (!c) return false;
    P_mej[c.k] = (P_mej[c.k] || 0) + 1;
    if (c.k === 'vida') P_vidas++;
    P_oferta.length = 0;
    P_duelo++;
    son('clic');
    this.dueloNuevo();
    return true;
  },

  baja(x, y){
    if (MODO !== 'juega') return;
    if (P_fase === 'elige'){
      const i = pCartaEn(x, y);
      if (i >= 0) this.eligeCarta(i);
      return;
    }
    if (P_fase !== 'cuenta') return;
    const i = pBotonEn(x, y);
    if (i >= 0){ P_toque = i; son('clic', 0.7); }
  },

  fondo(g){ pGeo(); },
  pinta(g){ pPinta(g); },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto lleva TRES predictores y en cada ronda usa el que más viene
     acertando. No es adorno: cada uno captura una de las cabezas y ninguno las
     captura todas —
       · `fijo`     : lo que el rival más juega           → el terco
       · `suyo`     : lo que juega DESPUÉS de cada símbolo suyo   → el ciclo
       · `mio`      : lo que juega DESPUÉS de cada símbolo MÍO    → el espejo y el luchador
     Contra `azar` ninguno puede acertar más del tercio, y eso es correcto: ese
     rival no tiene agujero. */
  juegaSolo(n, azar){
    this.arranca();
    let v = 0, dueloMax = 1, rondas = 0, gane = 0, perdi = 0;
    const dt = 1/60;
    while (v < (n || 20000) && this.vivo){
      v++;
      if (P_fase === 'elige'){
        let i = 0;
        if (!azar){
          const pref = ['empate', 'escudo', 'vida', 'espia', 'roca', 'hoja', 'filo'];
          let mejor = 99;
          for (let j = 0; j < P_oferta.length; j++){
            const p = pref.indexOf(P_oferta[j].k);
            if (p >= 0 && p < mejor){ mejor = p; i = j; }
          }
        } else i = (Math.random()*P_oferta.length) | 0;
        this.eligeCarta(i);
        continue;
      }
      dueloMax = Math.max(dueloMax, P_duelo);
      if (P_fase === 'cuenta' && P_forz < 0){
        P_forz = azar ? ((Math.random()*3)|0) : pBotJuega();
        rondas++;
      }
      const a = P_mi, b = P_su;
      this.paso(dt);
      if (P_mi > a) gane++;
      if (P_su > b) perdi++;
    }
    P_forz = -1;
    return JSON.stringify({ duelo: P_duelo, dueloMax, puntos: P_puntos,
                            vidas: P_vidas, rondas, gane, perdi,
                            tasa: rondas ? +(gane/rondas).toFixed(3) : 0,
                            vueltas: v, vivo: this.vivo });
  },

  /* ── LA AUDITORÍA: QUE CADA CABEZA SEA LA QUE DICE SER ──
     Se juega a cada rival mil rondas con un jugador que EXPLOTA su agujero, y se
     comprueba que gane mucho; y con uno uniforme, que gane un tercio. Sin esto,
     una cabeza mal escrita —el ciclo que no cicla, el espejo que no copia— se ve
     exactamente igual que una que anda: como un rival que juega raro. */
  audita(){
    const r = {};
    for (const R of P_RIVALES){
      const h = { yo: [], el: [] };
      const riv = Object.assign(Object.create(Object.getPrototypeOf(R)), R, { f: null, c: null });
      let ganE = 0, ganU = 0;
      const H = { yo: [], el: [] };
      for (let i = 0; i < 1200; i++){
        const pred = pPredice(H);
        const mi = pred >= 0 ? (pred + 1) % 3 : (Math.random()*3)|0;
        const su = riv.juega(H);
        if (pGana(mi, su)) ganE++;
        H.yo.push(mi); H.el.push(su);
      }
      const riv2 = Object.assign(Object.create(Object.getPrototypeOf(R)), R, { f: null, c: null });
      const H2 = { yo: [], el: [] };
      for (let i = 0; i < 1200; i++){
        const mi = (Math.random()*3)|0, su = riv2.juega(H2);
        if (pGana(mi, su)) ganU++;
        H2.yo.push(mi); H2.el.push(su);
      }
      r[R.k] = { explota: +(ganE/1200).toFixed(3), uniforme: +(ganU/1200).toFixed(3) };
    }
    return JSON.stringify(r);
  },

  ver(){
    return JSON.stringify({
      duelo: P_duelo, rival: P_riv.k, meta: P_meta, fase: P_fase,
      marcador: P_mi + '-' + P_su, vidas: P_vidas, ronda: P_ronda,
      mi: P_miJug, su: P_suJug, res: P_res, t: +P_t.toFixed(2),
      mej: P_mej, oferta: P_oferta.map(o => o.k),
      mano: MANO.estado, gesto: MANO.gesto, puntos: P_puntos, vivo: this.vivo });
  },
  cfg(o){
    if (o.jug != null) P_forz = o.jug;
    if (o.duelo){ P_duelo = o.duelo; this.dueloNuevo(); }
    return this.ver();
  }
};

/* ══════════ LOS TRES PREDICTORES ══════════
   Cada uno guarda su propia tabla y su propio marcador de aciertos, y el que
   manda es el que más viene acertando EN ESTA PARTIDA. Escrito como uno solo
   con reglas encadenadas, agregar una cabeza nueva obligaría a reescribirlo. */
function pTabla(H, clave){
  const t = {};
  for (let i = 1; i < H.el.length; i++){
    const c = clave(H, i);
    if (c == null) continue;
    (t[c] || (t[c] = [0,0,0]))[H.el[i]]++;
  }
  return t;
}
function pMayor(a){
  if (!a) return -1;
  let m = 0;
  for (let i = 1; i < 3; i++) if (a[i] > a[m]) m = i;
  return a[m] > 0 ? m : -1;
}
function pPredice(H){
  const n = H.el.length;
  if (n < 2) return -1;
  const cand = [
    /* lo que más juega, a secas */
    (() => { const c = [0,0,0]; for (const s of H.el) c[s]++; return pMayor(c); })(),
    /* lo que juega DESPUÉS de su propio símbolo anterior */
    pMayor(pTabla(H, (h, i) => h.el[i-1])[H.el[n-1]]),
    /* lo que juega DESPUÉS de MI símbolo anterior */
    pMayor(pTabla(H, (h, i) => h.yo[i-1])[H.yo[n-1]])
  ];
  /* se puntúa cada predictor sobre la historia y gana el que más acertó: un
     solo predictor fijo pierde contra cuatro de las seis cabezas */
  const punt = [0, 0, 0];
  for (let i = 2; i < n; i++){
    const sub = { yo: H.yo.slice(0, i), el: H.el.slice(0, i) };
    const m = sub.el.length;
    const p = [
      (() => { const c = [0,0,0]; for (const s of sub.el) c[s]++; return pMayor(c); })(),
      pMayor(pTabla(sub, (h, k) => h.el[k-1])[sub.el[m-1]]),
      pMayor(pTabla(sub, (h, k) => h.yo[k-1])[sub.yo[m-1]])
    ];
    for (let j = 0; j < 3; j++) if (p[j] === H.el[i]) punt[j]++;
  }
  let mej = 0;
  for (let j = 1; j < 3; j++) if (punt[j] > punt[mej]) mej = j;
  return cand[mej] >= 0 ? cand[mej] : cand.find(c => c >= 0) ?? -1;
}
/* ── Y LA PUNTUACIÓN SE HACE INCREMENTAL, DENTRO DE LA HISTORIA ──
   La de arriba recorre la historia entera en cada ronda, que para auditar mil
   rondas es O(n²) y tarda. El bot de partida lleva los tres marcadores al día.

   PERO VIVEN ADENTRO DE `P_h` Y NO EN UNA GLOBAL SUELTA, y eso arregló el peor
   defecto de esta vuelta. Con los marcadores en una global, lo aprendido de un
   rival sobrevivía al siguiente — y cada rival es una CABEZA DISTINTA, así que
   el selector llegaba al duelo cuatro eligiendo el predictor que le servía al
   terco para jugar contra el espejo. Medido: el auto-jugador honesto pasó de
   morir en el duelo 4-6 a llegar al 26, y la diferencia era ésa y nada más.
   Guardado con la historia, `dueloNuevo()` lo resetea POR CONSTRUCCIÓN: no hay
   un sitio del que alguien se pueda olvidar. */
function pBotJuega(){
  const H = P_h, n = H.el.length;
  if (!H.punt){ H.punt = [0,0,0]; H.ult = [-1,-1,-1]; }
  if (n) for (let j = 0; j < 3; j++) if (H.ult[j] === H.el[n-1]) H.punt[j]++;
  if (n < 2) return (Math.random()*3)|0;
  const p = [
    (() => { const c = [0,0,0]; for (const s of H.el) c[s]++; return pMayor(c); })(),
    pMayor(pTabla(H, (h, i) => h.el[i-1])[H.el[n-1]]),
    pMayor(pTabla(H, (h, i) => h.yo[i-1])[H.yo[n-1]])
  ];
  H.ult = p;
  let mej = 0;
  for (let j = 1; j < 3; j++) if (H.punt[j] > H.punt[mej]) mej = j;
  const pr = p[mej] >= 0 ? p[mej] : (p.find(c => c >= 0) ?? -1);
  return pr >= 0 ? (pr + 1) % 3 : (Math.random()*3)|0;
}

function pSorteaOferta(){
  const hay = P_CARTAS.filter(c => (P_mej[c.k] || 0) < c.tope);
  for (let i = hay.length - 1; i > 0; i--){
    const j = (Math.random()*(i + 1)) | 0;
    const t = hay[i]; hay[i] = hay[j]; hay[j] = t;
  }
  return hay.slice(0, 3);
}

/* ══════════ DIBUJO ══════════ */
function pPinta(g){
  pGeo();
  const r = PG.r;
  /* la cabeza del rival, arriba de todo y grande: es lo que dice contra QUIÉN se
     está jugando, y en un juego cuya decisión entera es «qué clase de rival es
     éste» eso no puede ser un detalle de sesenta píxeles */
  pCabeza(g, AN/2, AL*0.145, 84, (P_duelo - 1) % P_RIVALES.length);
  texto(TX('r_' + P_riv.k), AN/2, AL*0.145 + 108, 24, 'rgba(242,238,230,.86)', '800', 'center');

  /* ── LAS DOS MANOS ──
     Durante la cuenta se SACUDEN las dos, que es lo que hacen dos personas
     jugando de verdad, y en el «¡ya!» se abren. Sin la sacudida, la cuenta atrás
     es un número cambiando y no un duelo. */
  const cuenta = P_fase === 'cuenta';
  const b = cuenta ? Math.abs(Math.sin(P_t*9))*r*0.16 : 0;
  pMano(g, AN/2, PG.rY + b, r, cuenta ? -1 : P_suJug, false);
  pMano(g, AN/2, PG.mY - b, r, cuenta ? (P_forz >= 0 ? P_forz : P_toque) : P_miJug, true);

  if (cuenta){
    /* la cuenta: tres golpes y el ¡ya! */
    const k = Math.floor(P_t/pCuenta()*4);
    const s = k >= 3 ? TX('ya') : String(3 - k);
    const u = (P_t/pCuenta()*4) % 1;
    texto(s, AN/2, AL*0.465, 60 + (1 - u)*22,
          k >= 3 ? '#ffd76a' : 'rgba(242,238,230,.55)', '800', 'center');
    /* el espía: la última del rival, que es exactamente lo que un predictor
       necesita y por eso la carta vale */
    if (pM('espia') && P_h.el.length)
      texto(TX(P_SIM[P_h.el[P_h.el.length-1]]), AN/2, AL*0.145 + 134, 18,
            'rgba(255,138,92,.75)', '700', 'center');
  } else if (P_fase === 'revela'){
    const a = Math.min(1, (P_REVELA - P_t)/0.4);
    const txt = P_res > 0 ? 'ganasteR' : (P_res < 0 ? 'perdisteR' : 'empateR');
    const col = P_res > 0 ? '127,224,138' : (P_res < 0 ? '255,106,90' : '242,238,230');
    texto(TX(txt), AN/2, AL*0.465, 44, 'rgba(' + col + ',' + a.toFixed(2) + ')', '800', 'center');
  }

  /* el marcador del duelo: puntos y no un número, se lee de reojo */
  for (let i = 0; i < P_meta; i++){
    const x = AN/2 - (P_meta-1)*20 + i*40;
    /* los míos abajo y los suyos arriba, del lado de cada uno. Y el suyo va a
       AL*0.058 y no a 0,088, que ahí empieza el medallón. */
    disco(x, AL*0.058, 9, i < P_su ? '#ff6a5a' : 'rgba(255,255,255,.16)');
    disco(x, AL*0.755, 9, i < P_mi ? '#7fe08a' : 'rgba(255,255,255,.16)');
  }

  /* los tres botones: el respaldo, y también la única forma de saber cuáles son
     los tres símbolos si uno nunca jugó a esto */
  if (P_fase === 'cuenta' && !CINE.on) for (let i = 0; i < 3; i++){
    const c = pBotonCaja(i);
    const sel = (P_forz >= 0 ? P_forz : P_toque) === i;
    caja2(c.x, c.y, c.w, c.h, 16,
          sel ? 'rgba(255,138,92,.28)' : 'rgba(18,14,20,.72)',
          sel ? '#ff8a5c' : 'rgba(255,255,255,.20)');
    pSimbolo(g, c.x + c.w/2, c.y + c.h*0.44, c.h*0.28, i,
             sel ? '#ffd0b8' : 'rgba(242,238,230,.72)');
    texto(TX(P_SIM[i]), c.x + c.w/2, c.y + c.h - 16, 13,
          'rgba(242,238,230,.55)', '700', 'center');
  }

  if (P_fase === 'elige'){
    pCartas(g, P_oferta);
    texto(TX('elegi'), AN/2, AL*0.19, 26, '#ffd76a', '800', 'center');
  }
}

/* ── LA MANO: SÓLO EL SÍMBOLO, Y EL ANTEBRAZO SE FUE ──
   La primera versión llevaba antebrazo, porque «una mano flotando no se lee a
   brazo». Medido en la captura: con el radio en 140, el antebrazo mide 182 de
   largo y lo que aparecía eran DOS CÁPSULAS ROSAS gigantes, una arriba y otra
   abajo, que llenaban la pantalla y en las que no se distinguía el puño del
   papel. O sea que el detalle que se agregó para que se leyera mejor es
   exactamente lo que impedía leer nada.
   Lo que sí se lee es el símbolo solo y grande, que es el mismo dibujo que está
   en los tres botones — y que se lea IGUAL en los dos sitios no es un ahorro:
   es lo que hace que el jugador reconozca su propia jugada.
   Y va con sombra abajo, que es lo único que hace falta para que no flote. */
function pMano(g, x, y, r, sim, mia){
  const col = mia ? '#ffd0b8' : '#ffb89c';
  g.save();
  g.globalAlpha = 0.30;
  g.beginPath(); g.ellipse(x, y + r*0.86, r*0.62, r*0.16, 0, 0, 7);
  g.fillStyle = '#000'; g.fill();
  g.globalAlpha = 1;
  g.restore();
  /* ── LA DEL RIVAL VIENE DADA VUELTA, Y ESO SE PERDIÓ AL SACAR EL ANTEBRAZO ──
     Medido en la captura: los dos puños apuntaban para el mismo lado, o sea que
     parecían dos manos del mismo jugador. Lo que dice que hay dos personas
     enfrentadas no es la posición —una arriba y otra abajo— sino que las manos
     entren desde lados opuestos, que es lo que pasa en una mesa de verdad. */
  g.save();
  g.translate(x, y);
  if (!mia) g.rotate(Math.PI);
  pSimbolo(g, 0, 0, r*0.62, sim < 0 ? 0 : sim, col);
  g.restore();
}
/* ── EL SÍMBOLO NECESITA SOMBRA Y CONTORNO, Y ESO COSTÓ UNA CAPTURA ──
   La primera versión dibujaba los nudillos DEL MISMO COLOR que el puño, con el
   argumento de que «sin ellos un puño es un círculo». Y era cierto y no
   alcanzaba: un bulto del mismo color que su fondo no existe, así que lo que
   salió en pantalla fueron dos discos rosas lisos de noventa píxeles. Lo que
   hace legible una silueta plana son dos cosas y ninguna es más forma:
     · un DEGRADADO, que es lo que convierte un círculo en algo con volumen —la
       misma cuenta que hace que la canica de CANICA se lea a esfera—, y
     · un CONTORNO oscuro, que es lo que la separa del fondo. */
function pSimbolo(g, x, y, r, sim, col){
  /* ── LA MANO GENERADA PISA A LA DIBUJADA ──
     Y la dibujada se queda entera de respaldo, que es la regla del repo: un
     data URI decodifica de forma asincrónica, así que los primeros cuadros —o
     todos, si la imagen no llega— tienen que tener mano igual. Va con el ancho
     y el alto propios porque los tres cuadros salen del mismo lado de la reja y
     una mano abierta es más ancha que un puño: proporcional, la tijera saldría
     recortada. */
  if (dibCuadroWH('manos', sim, x, y, r*2.5, r*2.5)) return;
  g.save(); g.translate(x, y);
  /* el degradado va de un tono claro arriba a la izquierda al color base: es
     una luz, no un adorno, y viene del mismo lado en los tres símbolos */
  const vol = (cx, cy, rr) => {
    const gr = g.createRadialGradient(cx - rr*0.36, cy - rr*0.36, rr*0.08, cx, cy, rr*1.15);
    gr.addColorStop(0, '#ffece2');
    gr.addColorStop(0.55, col);
    gr.addColorStop(1, '#c98a72');
    return gr;
  };
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(58,28,20,.55)';
  g.lineWidth = Math.max(2, r*0.055);
  if (sim === 0){
    g.fillStyle = vol(0, 0, r);
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
    /* los nudillos, ahora con su propia línea: cuatro arcos oscuros */
    for (let i = 0; i < 4; i++){
      const cx = -r*0.54 + i*r*0.36;
      g.beginPath(); g.arc(cx, -r*0.34, r*0.21, Math.PI*1.06, Math.PI*1.94); g.stroke();
    }
    /* y el pliegue del pulgar cruzado, que es lo que dice «puño» y no «pelota» */
    g.beginPath(); g.moveTo(-r*0.72, r*0.16); g.lineTo(r*0.52, r*0.30); g.stroke();
  } else if (sim === 1){
    g.fillStyle = vol(0, r*0.1, r*1.1);
    caja2(-r*0.62, -r*0.22, r*1.24, r*1.05, r*0.20, g.fillStyle, 'rgba(58,28,20,.55)');
    for (let i = 0; i < 4; i++)
      caja2(-r*0.58 + i*r*0.32, -r*1.12, r*0.24, r*1.0, r*0.12,
            g.fillStyle, 'rgba(58,28,20,.55)');
    caja2(-r*1.02, -r*0.10, r*0.46, r*0.26, r*0.12, g.fillStyle, 'rgba(58,28,20,.55)');
  } else {
    g.fillStyle = vol(0, r*0.3, r*0.7);
    const f = g.fillStyle;
    /* los dos dedos primero y la palma encima: al revés, la palma tapa la base
       de los dedos y la V se parte en dos palitos sueltos */
    for (const a of [-0.42, 0.24]){
      g.save(); g.translate(0, r*0.10); g.rotate(a);
      caja2(-r*0.15, -r*1.30, r*0.30, r*1.42, r*0.14, f, 'rgba(58,28,20,.55)');
      g.restore();
    }
    g.beginPath(); g.arc(0, r*0.30, r*0.56, 0, 7);
    g.fillStyle = f; g.fill(); g.stroke();
  }
  g.restore();
}

/* la cabeza del rival: seis siluetas distintas dibujadas por código, con la
   foto generada por encima cuando llega. Cada una tiene UN rasgo que la
   distingue de lejos, que es lo único que hace falta a este tamaño. */
function pCabeza(g, x, y, r, i){
  /* ── EL RETRATO VA EN MEDALLÓN, Y NO ES ADORNO ──
     La hoja generada trae cada retrato con su propio fondo púrpura dentro de la
     celda, y separarlo del separador magenta a golpe de umbral no se puede: son
     dos púrpuras. Recortado en círculo, ese fondo pasa a leerse como el fondo de
     un medallón —o sea deliberado— y de paso el borde dorado lo separa de la
     calle oscura del fondo, que es lo que un rectángulo pegado encima no hace. */
  const o = IMG['rivales'];
  if (o && o.ok){
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
    dibCuadro('rivales', i, x, y + r*1.16, r*2.32);
    g.restore();
    g.strokeStyle = 'rgba(255,215,106,.72)'; g.lineWidth = 4;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    return;
  }
  const cols = ['#e8b48a', '#e8c9a8', '#d59a76', '#e8b48a', '#9fb4c4', '#6b5f7a'];
  disco(x, y, r, cols[i]);
  g.fillStyle = 'rgba(0,0,0,.55)';
  disco(x - r*0.34, y - r*0.10, r*0.12, 'rgba(20,16,14,.85)');
  disco(x + r*0.34, y - r*0.10, r*0.12, 'rgba(20,16,14,.85)');
  if (i === 0) caja2(x - r*1.02, y - r*0.72, r*2.04, r*0.44, r*0.14, '#4a6ea8', null);
  if (i === 1){ g.strokeStyle = '#d8d8e0'; g.lineWidth = 3;
    g.beginPath(); g.arc(x - r*0.34, y - r*0.10, r*0.26, 0, 7);
    g.arc(x + r*0.34, y - r*0.10, r*0.26, 0, 7); g.stroke(); }
  if (i === 2){ g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke(); }
  if (i === 3) caja2(x - r*1.0, y + r*0.34, r*2.0, r*0.34, r*0.10, '#c8503c', null);
  if (i === 4){ disco(x, y - r*0.86, r*0.14, '#7fe8ff');
    caja2(x - r*0.06, y - r*1.30, r*0.12, r*0.44, r*0.05, '#9fb4c4', null); }
  if (i === 5){ g.fillStyle = 'rgba(12,8,16,.88)';
    g.beginPath(); g.arc(x, y, r*1.12, Math.PI, 0); g.fill(); }
}

let PC = { w: 0, h: 0, x0: 0, y: 0 };
function pCartas(g, lista){
  PC.w = Math.min(196, (AN - 56)/3 - 12);
  PC.h = PC.w*1.58;
  const tot = lista.length*PC.w + (lista.length - 1)*14;
  PC.x0 = (AN - tot)/2; PC.y = AL*0.29;
  for (let i = 0; i < lista.length; i++){
    const x = PC.x0 + i*(PC.w + 14);
    caja2(x, PC.y, PC.w, PC.h, 18, 'rgba(16,10,18,.95)', 'rgba(255,138,92,.60)');
    const ii = P_CARTAS.findIndex(c => c.k === lista[i].k);
    const conIc = ii >= 0 && dibCuadroWH('iconos', ii, x + PC.w/2, PC.y + 46, 52, 52);
    const y0 = conIc ? PC.y + 92 : PC.y + 40;
    texto(TX('m_' + lista[i].k), x + PC.w/2, y0, 19, '#ffd76a', '800', 'center');
    const pal = TX('d_' + lista[i].k).split(' ');
    let ln = '', yy = y0 + 34;
    for (const p of pal){
      const pr = ln ? ln + ' ' + p : p;
      g.font = '600 15px ui-sans-serif,system-ui,sans-serif';
      if (g.measureText(pr).width > PC.w - 22 && ln){
        texto(ln, x + PC.w/2, yy, 15, 'rgba(242,238,230,.78)', '600', 'center');
        ln = p; yy += 20;
      } else ln = pr;
    }
    if (ln) texto(ln, x + PC.w/2, yy, 15, 'rgba(242,238,230,.78)', '600', 'center');
    const n = P_mej[lista[i].k] || 0;
    if (n) texto('×' + n, x + PC.w/2, PC.y + PC.h - 22, 15, 'rgba(255,215,106,.65)', '800', 'center');
  }
}
function pCartaEn(x, y){
  if (y < PC.y || y > PC.y + PC.h) return -1;
  for (let i = 0; i < P_oferta.length; i++){
    const cx = PC.x0 + i*(PC.w + 14);
    if (x >= cx && x <= cx + PC.w) return i;
  }
  return -1;
}

function pBotonCaja(i){
  const w = Math.min(196, (AN - 64)/3 - 10), h = 128;
  const tot = 3*w + 2*12, x0 = (AN - tot)/2;
  return { x: x0 + i*(w + 12), y: AL - h - 46, w, h };
}
function pBotonEn(x, y){
  for (let i = 0; i < 3; i++){
    const c = pBotonCaja(i);
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return i;
  }
  return -1;
}

/* la cinemática usa el mismo dibujo que el juego, así que lo que se ve en la
   escena es exactamente lo que se ve jugando */
function pDemo(g, u, plano){
  const gd = P_duelo, gf = P_fase, gm = P_miJug, gs = P_suJug, gr = P_res;
  const go = P_oferta, gme = P_mi, gsu = P_su, gt = P_t, gri = P_riv;
  P_duelo = plano === 2 ? 3 : 1;
  P_riv = pRivalDe(P_duelo);
  P_meta = 3; P_mi = plano === 2 ? 3 : 1; P_su = plano === 2 ? 1 : 0;
  if (plano === 2){ P_fase = 'elige'; P_oferta = P_CARTAS.slice(1, 4); }
  else { P_fase = 'cuenta'; P_t = u*pCuenta()*0.95; P_oferta = []; }
  pPinta(g);
  P_duelo = gd; P_fase = gf; P_miJug = gm; P_suJug = gs; P_res = gr;
  P_oferta = go; P_mi = gme; P_su = gsu; P_t = gt; P_riv = gri;
}
