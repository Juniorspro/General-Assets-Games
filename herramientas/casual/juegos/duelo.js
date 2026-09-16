/* ══════════════════════════════ DUELO ══════════════════════════════
   Dos pistoleros, uno en cada punta. Suena la campana y los dos desenfundan.

   ── EL VERBO ES SOSTENER, Y ESA ES TODA LA DECISIÓN ──
   No hay arrastre. Se aprieta y se SOSTIENE: mientras el dedo está abajo la
   mira se cierra —el pulso se calma— y al soltar sale el tiro. Cuanto más
   esperás, mejor apuntás. Y el rival está haciendo lo mismo del otro lado.

   O sea que el juego es una sola cuenta hecha a ojo: cuánto puedo esperar antes
   de que dispare él. Eso es distinto de apuntar (ARCO), de leer una estructura
   (CASTILLO) y de dibujar una curva (PENAL): acá no hay nada que apuntar, hay
   algo que ESPERAR. Y por eso no se puede ganar apurándose: un tiro apurado
   sale con la mira abierta y falla solo.

   ── Y HAY QUE ESPERAR LA CAMPANA ──
   Apretar antes es salida en falso, y cuesta el duelo. Sin eso, la respuesta
   óptima sería tener el dedo apoyado desde el principio y el juego se convierte
   en un botón. */

const D_NIVELES = 40;
const D_MIRA0 = 0.42;          /* radio de la mira al soltar en seco, en fracción */
const D_MIRA1 = 0.055;         /* y con el pulso del todo calmado */
/* ── EL PULSO SE CALMA EN 0,85 s Y NO EN 1,35, Y ESO SE MIDIO ──
   Con 1,35, contra el bandido —que tira a los 0,52— quedan cuatro decimas de
   sosten y la mira todavia mide 0,227 de pantalla: la chance de pegarle era del
   22 %. Un juego donde la unica decision es esperar no puede castigar al que
   espera todo lo que puede. */
const D_CALMA = 0.85;

let D_fase = 'espera';         /* espera · ya · tiro · resuelve */
let D_t = 0, D_campana = 0;    /* cuándo suena */
let D_hold = -1;               /* cuándo se apretó, −1 si no */
let D_nivel = 1, D_ronda = 0, D_vidas = 3, D_ganadas = 0;
let D_riv = null;
let D_res = '', D_resT = 0;
let D_tiroYo = null, D_tiroEl = null;   /* {t, r, x, y, pega} */
let D_sac = 0, D_lento = 0;
let D_azar = 3;
function dAz(){ D_azar = (D_azar*1664525 + 1013904223) >>> 0; return D_azar / 4294967296; }

/* ── LOS RIVALES: SEIS CABEZAS, Y CADA UNA ES UNA APUESTA DISTINTA ──
   No se distinguen por «ser más rápidos» sino por CÓMO reparten su tiempo: el
   pistolero tira antes y peor, el francotirador tarda y no falla. Contra cada
   uno la espera correcta es otra, y eso es lo que hace que haya algo que
   aprender en vez de un reflejo que entrenar. */
const D_CABEZAS = [
  { k: 'pistolero', esp: 0.62, dsv: 0.10, pun: 0.62, col: '#c4553c' },
  { k: 'sheriff',   esp: 0.86, dsv: 0.09, pun: 0.80, col: '#3c7ac4' },
  { k: 'bandido',   esp: 0.52, dsv: 0.16, pun: 0.48, col: '#8a6134' },
  { k: 'francotir', esp: 1.18, dsv: 0.07, pun: 0.95, col: '#4a7a4a' },
  { k: 'novato',    esp: 0.74, dsv: 0.22, pun: 0.40, col: '#9a7ab8' },
  { k: 'maestro',   esp: 0.94, dsv: 0.05, pun: 0.90, col: '#c4a03c' },
];

const JT = {
  es: { sub:'Esperá la campana. Apretá y sostené: la mira se cierra.',
        c1:'Esperá la campana. Ni un segundo antes.',
        c2:'Sostené el dedo: la mira se cierra sola.',
        c3:'El rival también está esperando. Cuarenta duelos.',
        nivelC:'DUELO', vidasC:'VIDAS', rivalC:'RIVAL',
        ya:'¡YA!', falso:'SALIDA EN FALSO', ganaste:'LE DISTE',
        perdiste:'TE DIO', fallaste:'FALLASTE', ambos:'LOS DOS',
        pistolero:'EL PISTOLERO', sheriff:'EL SHERIFF', bandido:'EL BANDIDO',
        francotir:'EL FRANCOTIRADOR', novato:'EL NOVATO', maestro:'EL MAESTRO' },
  en: { sub:'Wait for the bell. Press and hold: the sight closes.',
        c1:'Wait for the bell. Not one second early.',
        c2:'Hold your finger: the sight closes by itself.',
        c3:'He is waiting too. Forty duels.',
        nivelC:'DUEL', vidasC:'LIVES', rivalC:'RIVAL',
        ya:'NOW!', falso:'FALSE START', ganaste:'YOU HIT',
        perdiste:'HE HIT YOU', fallaste:'YOU MISSED', ambos:'BOTH',
        pistolero:'THE GUNMAN', sheriff:'THE SHERIFF', bandido:'THE BANDIT',
        francotir:'THE SHARPSHOOTER', novato:'THE ROOKIE', maestro:'THE MASTER' },
  pt: { sub:'Espere o sino. Aperte e segure: a mira fecha.',
        c1:'Espere o sino. Nem um segundo antes.',
        c2:'Segure o dedo: a mira fecha sozinha.',
        c3:'Ele também está esperando. Quarenta duelos.',
        nivelC:'DUELO', vidasC:'VIDAS', rivalC:'RIVAL',
        ya:'JÁ!', falso:'QUEIMOU A LARGADA', ganaste:'ACERTOU',
        perdiste:'ELE ACERTOU', fallaste:'ERROU', ambos:'OS DOIS',
        pistolero:'O PISTOLEIRO', sheriff:'O XERIFE', bandido:'O BANDIDO',
        francotir:'O ATIRADOR', novato:'O NOVATO', maestro:'O MESTRE' }
};
const PIEL = { ac:'#c4a03c', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tensa', pierde:'grito', gana:'gana',
                    clic:'clic', caida:'tira' };
const AMB = {
  foto: 'f_duelo',
  cielo: ['#c98a4a', '#3a2418'],
  haz: 0.20,
  vineta: 0.50,
  part: { n: 12, dir: 'lado', forma: 'disco', col: '#e8d0a8',
          r0: 1.2, r1: 3.0, v0: 10, v1: 30, amp: 50, gira: 0,
          a0: 0.06, a1: 0.16 }
};

function dGenera(n){
  D_azar = (n*2654435761) >>> 0;
  for (let i = 0; i < 4; i++) dAz();
  const c = D_CABEZAS[(n - 1) % D_CABEZAS.length];
  /* ── EL RIVAL MEJORA CON EL NIVEL, PERO NO SIN TECHO ──
     Su espera baja hasta un piso: por debajo de 0,34 s no hay decisión posible
     —es tiempo de reacción puro— y eso deja de ser un juego de nervio. */
  const k = Math.min(1, (n - 1)/34);
  return {
    riv: { k: c.k, col: c.col,
           /* el piso es 0,46 y no 0,34: con 0,34 y el desvio del bandido
              encima, la mira no llega a cerrar ni sosteniendo todo lo posible —
              medido, siete de cuarenta niveles daban menos de 0,28 de chance */
           esp: Math.max(0.46, c.esp - k*0.26),
           dsv: c.dsv,
           pun: Math.min(0.97, c.pun + k*0.16) },
    ronda: 3
  };
}

/* ── LA MIRA: DE CUÁNTO SE SOSTUVO SALE EL RADIO ──
   La curva no es lineal: el primer tercio del tiempo se lleva más de la mitad
   de la mejora. Así, esperar poquito ya sirve —el juego no castiga al que se
   apura hasta el ridículo— y esperar mucho tiene rendimientos decrecientes, que
   es lo que hace que el techo lo ponga el rival y no la curva. */
function dRadio(t){
  const u = Math.max(0, Math.min(1, t/D_CALMA));
  return D_MIRA0 + (D_MIRA1 - D_MIRA0)*(1 - Math.pow(1 - u, 2.2));
}

const JUEGO = {
  id: 'duelo',
  tipo: 'niveles',
  nivelesTotal: D_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return D_ganadas; },
  get sub(){ return TX('nivelC'); },
  get ficI(){ return TX('nivelC') + ' ' + NIVEL; },
  get ficD(){ return TX('vidasC') + ' ' + D_vidas; },
  get resta(){ return Math.max(0, D_vidas/3); },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ dDemo(g, u, 0); } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){ dDemo(g, u, 1); } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){ dDemo(g, u, 2); } }
  ],

  arranca(n){
    D_nivel = n || 1;
    const G = dGenera(D_nivel);
    D_riv = G.riv;
    D_vidas = 3; D_ganadas = 0; D_ronda = 0;
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
    this.nueva();
  },

  nueva(){
    /* la campana llega entre 1,1 y 2,6 s, y el rango importa: con un tiempo
       fijo se aprende de memoria y deja de haber espera */
    D_campana = 1.1 + dAz()*1.5;
    D_fase = 'espera'; D_t = 0; D_hold = -1;
    D_tiroYo = null; D_tiroEl = null;
    D_res = ''; D_resT = 0;
  },

  paso(dt){
    const dtm = D_lento > 0 ? dt*0.25 : dt;
    if (D_lento > 0) D_lento = Math.max(0, D_lento - dt);
    if (D_resT > 0) D_resT = Math.max(0, D_resT - dt);
    if (D_sac > 0) D_sac = Math.max(0, D_sac - dt*3);
    D_t += dtm;
    if (D_fase === 'espera'){
      if (D_t >= D_campana){ D_fase = 'ya'; D_t = 0; son('toque', 1); }
      return;
    }
    if (D_fase === 'ya'){
      /* el rival dispara en su instante, con su propio nervio */
      const esp = D_riv.esp + (dAz() - 0.5)*D_riv.dsv*2;
      if (D_t >= esp && !D_tiroEl){
        D_tiroEl = { t: D_t, pega: dAz() < D_riv.pun };
        son('caida', 0.8);
        if (!D_tiroYo) this.cierra();
      }
      if (D_t > 3.2 && !D_tiroYo) this.cierra();
      return;
    }
    if (D_fase === 'resuelve'){
      D_t += dt;
      if (D_t > 1.5) this.sigue();
    }
  },

  /* ── QUIÉN GANA: EL QUE DISPARÓ ANTES, Y SI ACERTÓ ──
     Los dos disparos existen aunque uno llegue tarde: un empate donde los dos
     pegan es un resultado del juego y no un caso raro que haya que evitar. */
  cierra(){
    if (!D_tiroEl) D_tiroEl = { t: 9, pega: false };
    if (!D_tiroYo) D_tiroYo = { t: 9, r: 1, pega: false };
    const yoAntes = D_tiroYo.t < D_tiroEl.t;
    let k;
    if (D_tiroYo.pega && !D_tiroEl.pega) k = 'ganaste';
    else if (!D_tiroYo.pega && D_tiroEl.pega) k = 'perdiste';
    else if (D_tiroYo.pega && D_tiroEl.pega) k = yoAntes ? 'ganaste' : 'perdiste';
    else k = 'fallaste';
    this.resuelve(k);
  },

  resuelve(k){
    D_res = k; D_resT = 1.5;
    D_fase = 'resuelve'; D_t = 0;
    D_lento = 0.5; D_sac = 1;
    if (k === 'ganaste'){ D_ganadas++; son('gana', 0.9); destella('#ffd76a', 0.7); }
    else { D_vidas--; son('pierde', 0.9); destella('#ff6a5a', 0.8); }
  },

  sigue(){
    D_ronda++;
    if (D_ganadas >= 3){
      this.gano = true;
      this.estrellas = D_vidas >= 3 ? 3 : (D_vidas === 2 ? 2 : 1);
      this.finP = TX('vidasC') + ' ' + D_vidas;
      this.vivo = false; return;
    }
    if (D_vidas <= 0){ this.vivo = false; return; }
    this.nueva();
  },

  fondo(g){},
  pinta(g){ dPinta(g); },

  baja(px, py){
    if (MODO !== 'juega') return;
    if (D_fase === 'espera'){
      /* salida en falso: cuesta una vida y la ronda */
      this.resuelve('falso');
      D_res = 'falso';
      return;
    }
    if (D_fase === 'ya' && D_hold < 0){ D_hold = D_t; son('toque', 0.5); }
  },
  mueve(){},
  sube(){
    if (D_fase !== 'ya' || D_hold < 0 || D_tiroYo) return;
    this.dispara(D_t - D_hold);
  },

  /* ── EL TIRO: LA MIRA DECIDE, Y SE SORTEA UNA VEZ ──
     `r` es el radio de la mira; el disparo cae en un punto al azar dentro de
     ella y pega si cae sobre el rival, que mide 0,17 de ancho de pantalla. O
     sea que la puntería no es un número escondido: es exactamente el círculo
     que el jugador está viendo. */
  dispara(sost){
    const r = dRadio(sost);
    const a = dAz()*Math.PI*2, d = Math.sqrt(dAz())*r;
    const x = Math.cos(a)*d, y = Math.sin(a)*d;
    /* ── EL BLANCO ES UNA ELIPSE, Y ESTABA AL REVES ──
       Un tipo parado mide 0,085 de ancho y unas 0,19 de alto en fraccion de
       pantalla, o sea que errarle para ARRIBA perdona mucho mas que errarle al
       costado. Estaba escrito `hypot(x, y*1.6)`, que castiga el error vertical
       MAS que el lateral: exactamente al reves de la silueta que se ve. */
    D_tiroYo = { t: D_t, r, x, y,
                 pega: Math.hypot(x/0.085, y/0.19) < 1 };
    son('caida', 0.9); sacude(0.3);
    if (D_tiroEl || D_tiroYo) this.cierra();
  },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto ESPERA lo que le conviene contra esa cabeza —un pelín menos que
     la espera del rival— y el otro suelta apenas puede. Si sostener no
     sirviera, los dos ganarían igual. */
  juegaSolo(n, azar){
    let gana = 0, malos = [], rondas = 0, aciertos = 0;
    const dt = 1/60;
    for (let niv = 1; niv <= (n || D_NIVELES); niv++){
      this.arranca(niv);
      let v = 0;
      while (this.vivo && v < 9000){
        v++;
        if (D_fase === 'ya' && D_hold < 0 && !D_tiroYo){
          D_hold = D_t;
        }
        if (D_fase === 'ya' && D_hold >= 0 && !D_tiroYo){
          /* el objetivo: soltar justo antes que él. Con margen, porque su
             espera tiene desvío y adivinarla exacta seria hacer trampa. */
          const obj = azar ? 0.02 : Math.max(0.05, D_riv.esp - D_riv.dsv - 0.05);
          if (D_t - D_hold >= obj){
            const antes = D_ganadas;
            this.dispara(D_t - D_hold);
            rondas++;
            if (D_ganadas > antes) aciertos++;
          }
        }
        this.paso(dt);
      }
      if (this.gano) gana++; else malos.push(niv);
    }
    return JSON.stringify({ niveles: (n || D_NIVELES), gana,
                            malos: malos.slice(0, 10), nMalos: malos.length,
                            rondas, aciertos,
                            tasa: rondas ? +(aciertos/rondas).toFixed(3) : 0 });
  },

  /* ── LA AUDITORÍA: QUE LA ESPERA SIEMPRE SEA POSIBLE ──
     Un duelo se puede ganar sólo si existe un tiempo de sostén que llegue antes
     que el rival Y cierre la mira lo suficiente. Se calcula, no se estima: con
     el rival esperando `esp` y desvío `dsv`, lo mejor que se puede sostener es
     `esp − dsv`, y de ahí sale la probabilidad de pegar. */
  audita(a, b){
    const malos = [];
    let minP = 1, maxP = 0, minE = 9, maxE = 0;
    for (let n = (a || 1); n <= (b || D_NIVELES); n++){
      const G = dGenera(n);
      /* se audita con el sosten de alguien que ARRIESGA UN POCO —medio desvio
         y no uno entero—, que es lo que hace una persona: esperar el peor caso
         siempre es tirar antes de lo necesario en todas las rondas menos una */
      const sost = Math.max(0.05, G.riv.esp - G.riv.dsv*0.5 - 0.04);
      const r = dRadio(sost);
      /* la chance de pegar: el area del rival (una elipse) sobre la de la mira */
      const p = Math.min(1, (0.085*0.19)/(r*r));
      if (p < 0.28) malos.push([n, 'la mira no cierra a tiempo (' + p.toFixed(2) + ')']);
      if (G.riv.esp < 0.30) malos.push([n, 'el rival tira antes de poder pensar']);
      minP = Math.min(minP, p); maxP = Math.max(maxP, p);
      minE = Math.min(minE, G.riv.esp); maxE = Math.max(maxE, G.riv.esp);
    }
    return JSON.stringify({ niveles: (b || D_NIVELES) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            pega: [+minP.toFixed(2), +maxP.toFixed(2)],
                            espera: [+minE.toFixed(2), +maxE.toFixed(2)] });
  },

  ver(){
    return JSON.stringify({
      nivel: D_nivel, fase: D_fase, t: +D_t.toFixed(2),
      campana: +D_campana.toFixed(2), hold: +D_hold.toFixed(2),
      mira: +dRadio(D_hold >= 0 ? D_t - D_hold : 0).toFixed(3),
      vidas: D_vidas, ganadas: D_ganadas, riv: D_riv ? D_riv.k : null,
      esp: D_riv ? +D_riv.esp.toFixed(2) : 0,
      res: D_res, vivo: this.vivo, gano: this.gano, est: this.estrellas });
  },
  cfg(o){
    if (o.salta){ D_t = D_campana; }
    if (o.sost != null){
      D_fase = 'ya'; D_t = o.sost; D_hold = 0; this.dispara(o.sost);
    }
    return this.ver();
  }
};

/* ══════════════════════════════ EL DIBUJO ══════════════════════════════ */

/* ── UN PISTOLERO ──
   Silueta plana con sombrero y poncho: a contraluz de un atardecer, lo único
   que se lee es el contorno, así que el dibujo es el contorno y nada más. */
function dTipo(g, x, y, alto, col, esp, brazo){
  g.save();
  g.translate(x, y);
  if (esp) g.scale(-1, 1);
  g.save();
  g.globalAlpha = 0.34;
  g.beginPath(); g.ellipse(0, 0, alto*0.30, alto*0.07, 0, 0, 7);
  g.fillStyle = '#000'; g.fill();
  g.restore();
  const H = alto;
  /* piernas y poncho */
  g.fillStyle = col;
  g.strokeStyle = 'rgba(24,14,10,.65)'; g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-H*0.10, 0); g.lineTo(-H*0.09, -H*0.34);
  g.lineTo(-H*0.24, -H*0.60); g.lineTo(-H*0.13, -H*0.74);
  g.lineTo(H*0.13, -H*0.74); g.lineTo(H*0.24, -H*0.60);
  g.lineTo(H*0.09, -H*0.34); g.lineTo(H*0.10, 0);
  g.closePath(); g.fill(); g.stroke();
  /* la cabeza y el sombrero: el ala es la firma del western */
  disco(0, -H*0.83, H*0.095, '#e8b48a');
  g.beginPath(); g.arc(0, -H*0.83, H*0.095, 0, 7); g.stroke();
  g.fillStyle = '#3a2418';
  g.beginPath();
  g.ellipse(0, -H*0.885, H*0.24, H*0.035, 0, 0, 7); g.fill();
  caja2(-H*0.10, -H*1.00, H*0.20, H*0.12, H*0.03, '#3a2418', null);
  /* el brazo con el revólver, que sube al desenfundar */
  g.save();
  g.translate(H*0.13, -H*0.60);
  g.rotate(-brazo*1.15);
  g.strokeStyle = col; g.lineWidth = H*0.075; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(H*0.30, 0); g.stroke();
  g.fillStyle = '#4a4a52';
  caja2(H*0.28, -H*0.035, H*0.16, H*0.055, H*0.02, '#4a4a52', null);
  g.restore();
  g.restore();
}

/* ── LA MIRA: DOS ANILLOS Y LAS CUATRO ESCUADRAS ──
   El anillo dice cuánto se cerró el pulso y las escuadras dicen que esto es una
   mira y no un aro decorativo. Va SOBRE el rival, que es donde se apunta. */
function dMira(g, cx, cy, r, col){
  g.save();
  g.strokeStyle = col; g.lineWidth = 3.5;
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  g.globalAlpha = 0.5;
  g.beginPath(); g.arc(cx, cy, r*0.55, 0, 7); g.stroke();
  g.globalAlpha = 1;
  g.lineWidth = 4; g.lineCap = 'round';
  for (const [sx, sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    const a = r*1.28;
    g.beginPath();
    g.moveTo(cx + sx*a, cy + sy*a*0.72);
    g.lineTo(cx + sx*a*0.66, cy + sy*a*0.72);
    g.moveTo(cx + sx*a, cy + sy*a*0.72);
    g.lineTo(cx + sx*a, cy + sy*a*0.42);
    g.stroke();
  }
  g.restore();
}

function dPinta(g){
  const suelo = AL*0.72;
  const sac = D_sac > 0 ? D_sac : 0;
  /* el desierto: una franja y su línea de horizonte */
  const pat = patron('d_tierra');
  g.fillStyle = '#6b4a30';
  g.fillRect(0, suelo, AN, AL - suelo);
  if (pat){
    g.save();
    g.beginPath(); g.rect(0, suelo, AN, AL - suelo); g.clip();
    g.globalAlpha = 0.7; g.fillStyle = pat; g.fillRect(0, suelo, AN, AL);
    g.restore();
  }
  g.strokeStyle = 'rgba(255,220,180,.28)'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, suelo); g.lineTo(AN, suelo); g.stroke();

  const H = 300;
  const bYo = D_fase === 'espera' ? 0 : Math.min(1, D_t/0.18);
  const bEl = D_fase === 'espera' ? 0 : Math.min(1, D_t/(D_riv ? D_riv.esp : 1));
  if (!dibCuadro('d_tipos', 0, AN*0.20, suelo, H, false))
    dTipo(g, AN*0.20, suelo, H, '#3c6b8f', false, bYo);
  if (!dibCuadro('d_tipos', 1, AN*0.80, suelo, H, true))
    dTipo(g, AN*0.80, suelo, H, D_riv ? D_riv.col : '#c4553c', true, bEl);

  /* la mira, sobre el rival y en coordenadas de pantalla */
  const cx = AN*0.80, cy = suelo - H*0.62;
  if (D_fase === 'ya'){
    const sost = D_hold >= 0 ? D_t - D_hold : 0;
    const r = dRadio(sost)*AN;
    const cerca = r < AN*0.12;
    dMira(g, cx, cy, r, D_hold < 0 ? 'rgba(242,238,230,.45)'
                                   : (cerca ? '#7fe08a' : '#ffd76a'));
    /* ── Y LA BARRA DEL RIVAL NO EXISTE A PROPÓSITO ──
       Mostrar cuánto le falta a él para tirar convierte la apuesta en una
       cuenta: el juego entero es no saberlo y decidir igual. Lo único que se
       sabe es a quién se está enfrentando, que es lo que el rótulo dice. */
  }
  if (D_tiroYo && D_tiroYo.r != null && D_fase !== 'ya'){
    const px = cx + D_tiroYo.x*AN, py = cy + D_tiroYo.y*AN;
    g.strokeStyle = D_tiroYo.pega ? '#7fe08a' : '#ff6a5a'; g.lineWidth = 4;
    g.beginPath(); g.arc(px, py, 16, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(px - 22, py); g.lineTo(px + 22, py);
    g.moveTo(px, py - 22); g.lineTo(px, py + 22); g.stroke();
  }

  /* el cartel grande del estado, que es lo único que hay que mirar */
  if (D_fase === 'espera'){
    const p = 0.5 + 0.5*Math.sin(performance.now()*0.006);
    texto('· · ·', AN/2, AL*0.34, 60,
          'rgba(242,238,230,' + (0.25 + p*0.3).toFixed(2) + ')', '800', 'center');
  } else if (D_fase === 'ya' && !D_tiroYo){
    const k = Math.max(0, 1 - D_t*2.2);
    texto(TX('ya'), AN/2, AL*0.34, 80 + k*40,
          'rgba(255,215,106,' + (0.55 + k*0.45).toFixed(2) + ')', '800', 'center');
  }
  if (D_resT > 0){
    const al = Math.min(1, D_resT/0.4);
    const col = D_res === 'ganaste' ? '127,224,138'
              : (D_res === 'falso' ? '255,215,106' : '255,106,90');
    texto(TX(D_res), AN/2, AL*0.34, 54,
          'rgba(' + col + ',' + al.toFixed(2) + ')', '800', 'center');
  }
  /* el nombre del rival: es lo que dice qué espera esperar */
  if (D_riv)
    texto(TX(D_riv.k), AN*0.80, suelo + 46, 22, 'rgba(242,238,230,.62)', '700', 'center');
  /* las tres rondas ganadas, como tres muescas */
  for (let i = 0; i < 3; i++){
    const x = AN/2 - 34 + i*34, y = AL*0.115;
    caja2(x - 11, y, 22, 22, 5,
          i < D_ganadas ? '#ffd76a' : 'rgba(255,255,255,.14)',
          'rgba(255,255,255,.25)');
  }
  if (MODO === 'juega' && D_fase === 'espera' && D_ronda === 0 && D_ganadas === 0)
    texto(TX('c1'), AN/2, AL - 250, 22, 'rgba(242,238,230,.62)', '700', 'center');
}

/* ══════════ LA CINEMÁTICA ══════════ */
function dDemo(g, u, plano){
  const gn = D_nivel, gf = D_fase, gt = D_t, gh = D_hold, gr = D_riv;
  const gy = D_tiroYo, ge = D_tiroEl, gs = D_res, gst = D_resT, gg = D_ganadas;

  const G = dGenera(plano === 2 ? 24 : 2);
  D_riv = G.riv; D_ganadas = plano === 2 ? 2 : 0;
  D_tiroYo = null; D_tiroEl = null; D_res = ''; D_resT = 0;
  if (plano === 0){ D_fase = 'espera'; D_t = u*1.2; D_hold = -1; }
  else if (plano === 1){ D_fase = 'ya'; D_hold = 0; D_t = 0.05 + u*1.15; }
  else {
    D_fase = 'resuelve'; D_t = 0; D_hold = 0;
    D_tiroYo = { t: 0.7, r: D_MIRA1, x: 0.01, y: -0.01, pega: true };
    D_res = 'ganaste'; D_resT = 1.5;
  }
  ambAtras();
  dPinta(g);
  ambAdelante();

  D_nivel = gn; D_fase = gf; D_t = gt; D_hold = gh; D_riv = gr;
  D_tiroYo = gy; D_tiroEl = ge; D_res = gs; D_resT = gst; D_ganadas = gg;
}
