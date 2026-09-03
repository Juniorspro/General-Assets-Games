/* ══════════════════════════════ DADOS ══════════════════════════════
   Se SACUDE el teléfono y los dados se tiran. Se guardan los que sirven, se
   tira otra vez, y la mano puntúa por lo que salió. Cada ronda pide más, y al
   pasarla se elige una reliquia que queda para toda la corrida.

   POR QUE ESTE GENERO Y ESTE SENSOR:
   Sacudir para tirar un dado no es una idea: es el gesto que la gente YA hace
   con un cubilete, y es el unico caso en el que un sensor no se siente pegado
   encima. Y un roguelike de dados es la forma mas barata que existe de que una
   partida de dos minutos importe: las reliquias se acumulan, asi que la corrida
   veinte no se parece a la corrida uno aunque el juego sea el mismo.

   ── LA ESTRUCTURA ES DE TRES NIVELES, Y ESO ES A PROPOSITO ──
   TIRADA (se sacude) -> MANO (tres tiradas, puntua una vez) -> RONDA (tres
   manos, hay que llegar a un objetivo). Con un solo nivel no hay decision: se
   tira y sale lo que sale. La decision esta en QUE GUARDAR, y guardar solo
   significa algo si queda otra tirada; y la tension esta en el objetivo, que
   solo significa algo si hay varias manos para llegar. */

const D_CARAS = 6;
const D_DADOS0 = 5, D_TIRADAS0 = 3, D_MANOS0 = 3;
const D_TOPE_DADOS = 7;

/* ── LOS COMBOS ──
   Base mas multiplicador, que es lo que hace que un poker no sea «un poco mejor
   que un par» sino OTRA cosa: con solo la base, la diferencia entre el mejor y
   el peor combo es de tres veces; con el multiplicador encima es de veinte, y
   ahi buscar el combo grande vale arriesgar una tirada. */
const D_COMBOS = [
  { k:'quintilla', base:120, mult:6 },
  { k:'poker',     base: 75, mult:4 },
  { k:'full',      base: 55, mult:3 },
  { k:'escalera',  base: 45, mult:3 },
  { k:'terna',     base: 30, mult:2 },
  { k:'doblepar',  base: 20, mult:2 },
  { k:'par',       base: 10, mult:1 },
  { k:'nada',      base:  0, mult:1 }
];

/* ── LAS RELIQUIAS ──
   Doce, y cada una cambia una cosa distinta: cuantas tiradas hay, cuantas
   manos, cuantos dados, como se suma, como multiplica, o el objetivo. Doce que
   todas dieran «mas puntos» serian una sola reliquia con doce nombres. */
/* ── Y CADA UNA TIENE TOPE, QUE ES LO QUE FALTABA Y ROMPIA EL JUEGO ──
   Sin tope, `+1 tirada` y `+1 mano` se acumulan: cada ronda da mas tiradas y
   mas manos, o sea que la ronda siguiente es MAS FACIL que la anterior. Medido
   con el auto-jugador, la corrida llegaba a la RONDA 419 con ciento cinco
   tiradas y ciento ocho manos por ronda y un puntaje de 1,4 por diez a la
   dieciseis. Eso no es un roguelike: es una cuenta que crece sola.
   Los topes son distintos a proposito: las dos que multiplican todo lo demas
   —tiradas y manos— son las mas cortas, y las que solo suman puntos aguantan
   mas. Y una reliquia con el tope puesto NO SE OFRECE, porque una carta muerta
   en una mano de tres es un tercio de la decision tirado. */
const D_RELIQ = [
  { k:'tirada',  cara:'+1',    tope:3 },
  { k:'mano',    cara:'+1',    tope:3 },
  { k:'dado',    cara:'+1',    tope:2 },
  { k:'unos',    cara:'1→6',   tope:1 },
  { k:'pares',   cara:'+15',   tope:3 },
  { k:'escala',  cara:'×2',    tope:2 },
  { k:'poker',   cara:'+40',   tope:3 },
  { k:'suma',    cara:'+1',    tope:3 },
  { k:'mult',    cara:'+1',    tope:5 },
  { k:'terna',   cara:'+25',   tope:3 },
  { k:'guarda',  cara:'×2',    tope:1 },
  { k:'facil',   cara:'−12%',  tope:4 }
];

let D_dados = [];          /* {v, guardado, gi, vgi, tumba} */
let D_ronda = 1, D_mano = 1, D_tirada = 0;
let D_puntosRonda = 0, D_objetivo = 0;
let D_rel = {};            /* clave -> cuantas veces se tomo */
let D_fase = 'espera';     /* espera · tirando · elegir · fin */
let D_tumba = 0;           /* reloj de la tirada, cosmético */
let D_ultCombo = null, D_ultPts = 0, D_ultT = 0;
let D_oferta = [];         /* las tres reliquias que se ofrecen */
let D_azar = 7;
let D_maxRonda = 1;
let D_SEM = 991;
let D_cadena = null;       /* el combo de la mano anterior, para la reliquia */
function dAz(){ D_azar = (D_azar*1664525 + 1013904223) >>> 0; return D_azar / 4294967296; }

const dR = (k) => D_rel[k] || 0;
const dTiradas = () => D_TIRADAS0 + dR('tirada');
const dManos = () => D_MANOS0 + dR('mano');
const dNDados = () => Math.min(D_TOPE_DADOS, D_DADOS0 + dR('dado'));
/* ── EL OBJETIVO CRECE GEOMETRICAMENTE, Y ESO SALIO DE MEDIR DOS VECES ──
   Primero fue una potencia de la ronda (`38 * r^1.42`), que es lo que uno
   escribe. Medido con el auto-jugador: llegaba a la RONDA 112. La razon es que
   las reliquias tienen tope, asi que a partir de la ronda ~34 el puntaje que un
   jugador puede sacar se PLANCHA en unos veinte mil por ronda — y una potencia
   con exponente 1,42 tarda cien rondas en llegar ahi. Una corrida de cien
   rondas no es un roguelike, es una tarea.
   Geometrico si alcanza al techo: cada ronda pide un tanto por ciento mas, o
   sea que cruza cualquier techo en unas veinte. La razon se barrio midiendo —
   ver la tabla en `juegaSolo`. */
let D_KOBJ = 44, D_ROBJ = 1.42;
function dObjetivo(r){
  const b = Math.round(D_KOBJ * Math.pow(D_ROBJ, r - 1));
  return Math.max(20, Math.round(b * Math.pow(0.88, dR('facil'))));
}

/* ══════════ EL PUNTAJE DE UNA MANO ══════════
   Una sola funcion, y la usan el juego Y el auto-jugador: con dos cuentas, el
   bot elegiria guardar dados por un puntaje que el juego no paga. */
function dCombo(v){
  const c = new Array(D_CARAS + 1).fill(0);
  for (const x of v) c[x]++;
  const cuentas = c.slice(1).sort((a, b) => b - a);
  const set = new Set(v);
  /* la escalera necesita cinco valores seguidos, y con seis o siete dados puede
     estar adentro de un puñado mas grande: se busca la corrida mas larga */
  let mejorCorr = 0, corr = 0;
  for (let i = 1; i <= D_CARAS; i++){
    if (set.has(i)){ corr++; mejorCorr = Math.max(mejorCorr, corr); }
    else corr = 0;
  }
  if (cuentas[0] >= 5) return 'quintilla';
  if (cuentas[0] === 4) return 'poker';
  if (cuentas[0] === 3 && cuentas[1] >= 2) return 'full';
  if (mejorCorr >= 5) return 'escalera';
  if (cuentas[0] === 3) return 'terna';
  if (cuentas[0] === 2 && cuentas[1] === 2) return 'doblepar';
  if (cuentas[0] === 2) return 'par';
  return 'nada';
}
function dPuntos(v, guardados){
  const k = dCombo(v);
  const C = D_COMBOS.find(c => c.k === k);
  let base = C.base, mult = C.mult;
  if (k === 'par' || k === 'doblepar') base += 15*dR('pares');
  if (k === 'terna' || k === 'full') base += 25*dR('terna');
  if (k === 'poker' || k === 'quintilla') base += 40*dR('poker');
  if (k === 'escalera') mult *= Math.pow(2, dR('escala'));
  mult += dR('mult');
  /* la suma de los dados: los unos pueden valer seis, cada dado puede valer uno
     mas, y los guardados pueden contar doble */
  let suma = 0;
  for (let i = 0; i < v.length; i++){
    let x = v[i];
    if (x === 1 && dR('unos') > 0) x = 6;
    x += dR('suma');
    if (guardados && guardados[i] && dR('guarda') > 0) x *= 2;
    suma += x;
  }
  let p = (base + suma) * mult;
  /* la cadena: dos manos seguidas con el mismo combo pagan mas. Es la unica
     reliquia que premia repetir una jugada en vez de buscar la mejor, o sea la
     unica que cambia COMO se juega y no cuanto se cobra. */
  if (dR('cadena') > 0 && D_cadena === k && k !== 'nada') p = Math.round(p*1.5);
  return { k, base, mult, suma, pts: Math.round(p) };
}

const JT = {
  es: { sub:'Sacudí el teléfono para tirar. Guardá los que sirven y tirá otra vez.',
        c1:'Sacudí y los dados caen.',
        c2:'Tocá un dado para guardarlo y volvé a tirar.',
        c3:'Llegá al objetivo de la ronda y elegí una reliquia.',
        tirar:'TIRAR', sacudi:'SACUDÍ', obj:'OBJETIVO', rondaC:'RONDA',
        manoC:'MANO', tiradaC:'TIRADA', elegi:'ELEGÍ UNA RELIQUIA',
        nada:'nada', par:'par', doblepar:'doble par', terna:'terna',
        escalera:'escalera', full:'full', poker:'póker', quintilla:'quintilla',
        r_tirada:'Una tirada más por mano', r_mano:'Una mano más por ronda',
        r_dado:'Un dado más', r_unos:'Los unos valen seis al sumar',
        r_pares:'Par y doble par valen más', r_escala:'La escalera multiplica el doble',
        r_poker:'Póker y quintilla valen mucho más', r_suma:'Cada dado suma uno más',
        r_mult:'Multiplicador más uno', r_terna:'Terna y full valen más',
        r_guarda:'Los dados guardados suman doble', r_facil:'El objetivo baja un doceavo',
        llegaste:'¡RONDA {0}!', faltaron:'FALTARON {0}' },
  en: { sub:'Shake the phone to roll. Keep the ones you want and roll again.',
        c1:'Shake and the dice fall.',
        c2:'Tap a die to keep it, then roll again.',
        c3:'Hit the round target and pick a relic.',
        tirar:'ROLL', sacudi:'SHAKE', obj:'TARGET', rondaC:'ROUND',
        manoC:'HAND', tiradaC:'ROLL', elegi:'PICK A RELIC',
        nada:'nothing', par:'pair', doblepar:'two pair', terna:'three',
        escalera:'straight', full:'full house', poker:'four', quintilla:'five',
        r_tirada:'One more roll per hand', r_mano:'One more hand per round',
        r_dado:'One more die', r_unos:'Ones count as six',
        r_pares:'Pairs are worth more', r_escala:'Straights multiply twice as much',
        r_poker:'Four and five of a kind are worth much more', r_suma:'Every die adds one more',
        r_mult:'Multiplier plus one', r_terna:'Three of a kind and full house worth more',
        r_guarda:'Kept dice count double', r_facil:'The target drops a twelfth',
        llegaste:'ROUND {0}!', faltaron:'{0} SHORT' },
  pt: { sub:'Sacuda o telefone para rolar. Guarde os que servem e role de novo.',
        c1:'Sacuda e os dados caem.',
        c2:'Toque num dado para guardar e role de novo.',
        c3:'Chegue ao alvo da rodada e escolha uma relíquia.',
        tirar:'ROLAR', sacudi:'SACUDA', obj:'ALVO', rondaC:'RODADA',
        manoC:'MÃO', tiradaC:'ROLAGEM', elegi:'ESCOLHA UMA RELÍQUIA',
        nada:'nada', par:'par', doblepar:'dois pares', terna:'trinca',
        escalera:'sequência', full:'full house', poker:'quadra', quintilla:'quina',
        r_tirada:'Uma rolagem a mais por mão', r_mano:'Uma mão a mais por rodada',
        r_dado:'Um dado a mais', r_unos:'Os uns valem seis',
        r_pares:'Par e dois pares valem mais', r_escala:'A sequência multiplica o dobro',
        r_poker:'Quadra e quina valem muito mais', r_suma:'Cada dado soma um a mais',
        r_mult:'Multiplicador mais um', r_terna:'Trinca e full valem mais',
        r_guarda:'Os dados guardados somam o dobro', r_facil:'O alvo cai um doze avos',
        llegaste:'RODADA {0}!', faltaron:'FALTARAM {0}' }
};
const PIEL = { ac:'#f2c33c', tela:'fondo', rachaFin:false };
const SON_ALIAS = { bien:'dado', toque:'clic', pierde:'perder', gana:'gana', clic:'clic' };

/* ══════════ EL AMBIENTE ══════════
   Un tapete de casino bajo un foco. El haz es el más fuerte de los seis (0,18)
   y eso es la puesta en escena entera: lo que separa una mesa de juego de un
   fondo verde es que haya UN cono de luz cayendo sobre los dados, con el polvo
   dorado flotando adentro. */
const AMB = {
  foto: 'f_dados',
  cielo: ['#10231a', '#0a1710'],
  haz: 0.18,
  vineta: 0.50,
  part: { n: 22, dir: 'cae', forma: 'disco', col: '#ffd76a',
          r0: 1.2, r1: 3.0, v0: 5, v1: 18, amp: 40, gira: 0,
          a0: 0.08, a1: 0.22 }
};


/* ══════════ GEOMETRIA ══════════ */
let DG = { s: 96, y: 700, x0: 0, hueco: 12 };
function dGeo(){
  const n = dNDados();
  /* el lado del dado sale del ancho: cinco dados y siete tienen que entrar los
     dos, y con un lado fijo el septimo se sale del marco */
  /* el margen es 120 y no 80: el dado se dibuja GIRADO, y girado 45 grados su
     media diagonal es 1,41 veces su medio lado — medido en la captura, el
     primero de la fila llegaba a cinco pixeles del borde izquierdo */
  DG.s = Math.floor(Math.min(112, (AN - 120) / n - 10));
  DG.hueco = Math.floor(DG.s*0.14);
  const tot = n*DG.s + (n-1)*DG.hueco;
  DG.x0 = (AN - tot)/2;
  DG.y = AL*0.46;
}
function dCaja(i){
  return { x: DG.x0 + i*(DG.s + DG.hueco), y: DG.y - DG.s/2, s: DG.s };
}

const JUEGO = {
  id: 'dados',
  tipo: 'puntos',
  /* el giroscopio ES la tirada. Y hay boton igual, porque sin sensor —una
     notebook, un permiso negado— el juego tiene que poder jugarse. */
  usa: ['giro'],
  vivo: true, gano: false,
  get marca(){ return D_puntosRonda; },
  get sub(){ return TX('obj') + ' ' + D_objetivo; },
  get ficI(){ return TX('rondaC') + ' ' + D_ronda; },
  get ficD(){ return TX('manoC') + ' ' + Math.min(D_mano, dManos()) + '/' + dManos(); },
  get resta(){ return Math.max(0, Math.min(1, D_puntosRonda/Math.max(1, D_objetivo))); },

  planos: [
    { dur: 2.8, pie: 'c1', dibuja(g, u){
        dFondo(g);
        dGeo();
        /* los dados cayendo: es la unica cosa que se mueve en el plano */
        const s = suave(Math.min(1, u*1.4));
        for (let i = 0; i < 5; i++){
          const c = dCaja(i);
          const t = Math.max(0, Math.min(1, u*2.2 - i*0.14));
          const y = c.y - (1 - suave(t))*420;
          dDado(g, c.x, y, c.s, 1 + Math.floor(dAz()*6), false, (1-t)*7);
        }
      } },
    { dur: 3.2, pie: 'c2', dibuja(g, u){
        dFondo(g);
        dGeo();
        /* dos guardados y tres girando: la decision del juego, sin palabras */
        const v = [4, 4, 2, 6, 3];
        for (let i = 0; i < 5; i++){
          const c = dCaja(i);
          const gu = i < 2 && u > 0.30;
          const tum = (!gu && u > 0.55) ? (u - 0.55)*9 : 0;
          dDado(g, c.x, c.y - (gu ? 18 : 0), c.s,
                tum ? 1 + Math.floor(dAz()*6) : v[i], gu, tum);
        }
      } },
    { dur: 3.4, pie: 'c3', dibuja(g, u){
        dFondo(g);
        /* las tres cartas de reliquia: es la promesa del juego, o sea lo que
           hace que perder no importe */
        const s = suave(Math.min(1, u*1.3));
        dCartas(g, [D_RELIQ[0], D_RELIQ[5], D_RELIQ[8]], -1, s);
        texto(TX('elegi'), AN/2, AL*0.30, 28, '#ffd76a', '800', 'center');
      } }
  ],

  arranca(){
    D_azar = (Date.now() ^ 0x1d3f7b) >>> 0;
    D_rel = {};
    D_ronda = 1; D_maxRonda = 1;
    D_fase = 'espera';
    D_oferta.length = 0;
    D_cadena = null;
    this.vivo = true; this.gano = false;
    this.rondaNueva();
    /* ── LA SACUDIDA ENTRA POR UN GANCHO Y NO SE CONSULTA CADA CUADRO ──
       Mirando `GIRO.sac > 0` en `paso`, una sola sacudida dispara sesenta veces
       —el valor decae en varios cuadros— y la mano se tiraria sola hasta el
       final. Un gancho es un acontecimiento, que es lo que una sacudida es. */
    GIRO.alSacudir = () => { if (MODO === 'juega') this.tira(); };
    GIRO.rango = 34;
  },

  rondaNueva(){
    D_objetivo = dObjetivo(D_ronda);
    D_puntosRonda = 0;
    D_mano = 1;
    D_cadena = null;
    this.manoNueva();
  },
  manoNueva(){
    dGeo();
    D_dados = [];
    for (let i = 0; i < dNDados(); i++)
      D_dados.push({ v: 1 + Math.floor(dAz()*D_CARAS), guardado: false, gi: 0, vgi: 0 });
    D_tirada = 0;
    D_fase = 'espera';
  },

  /* ── TIRAR: SOLO LOS QUE NO ESTAN GUARDADOS ──
     Y con la reliquia de los unos, cada dado que caiga en 1 se vuelve a tirar
     una vez: es la unica reliquia que toca la TIRADA y no el puntaje, asi que
     se siente distinta aunque el numero final se parezca. */
  tira(){
    if (MODO !== 'juega' || D_fase !== 'espera') return false;
    if (D_tirada >= dTiradas()) return false;
    D_tirada++;
    for (const d of D_dados){
      if (d.guardado) continue;
      d.v = 1 + Math.floor(dAz()*D_CARAS);
      d.vgi = (dAz() - 0.5)*20;
    }
    D_fase = 'tirando';
    D_tumba = 0.62;
    son('toque', 0.9);
    sacude(0.20);
    return true;
  },

  /* al terminar de rodar: si era la ultima tirada, la mano puntua sola. Sin eso
     el jugador tiene que tocar un boton para cobrar algo que ya no puede
     cambiar, o sea un toque que no decide nada. */
  asienta(){
    D_fase = 'espera';
    for (const d of D_dados) d.vgi = 0;
    if (D_tirada >= dTiradas()) this.puntua();
  },

  puntua(){
    const v = D_dados.map(d => d.v);
    const gu = D_dados.map(d => d.guardado);
    const r = dPuntos(v, gu);
    D_puntosRonda += r.pts;
    PUNTOS += r.pts;
    D_ultCombo = r.k; D_ultPts = r.pts; D_ultT = 1.5;
    D_cadena = r.k;
    if (r.k === 'nada'){ son('mal', 0.5); }
    else {
      son('bien', 0.6 + Math.min(0.4, r.mult*0.06));
      const c = dCaja(Math.floor(D_dados.length/2));
      sumaPuntos(0, 0, 0);          /* sostiene la racha del nucleo */
      flota('+' + r.pts, c.x + c.s/2, DG.y - DG.s, '#ffd76a', 44);
      chispas(c.x + c.s/2, DG.y, Math.min(24, 6 + r.mult*3), '#ffd76a', 160);
      if (r.mult >= 3){ destella('#ffd76a', 0.4 + r.mult*0.10); sacude(0.28); }
    }
    if (D_puntosRonda >= D_objetivo){
      /* la ronda salio: se ofrecen tres reliquias y el juego ESPERA. Dandole una
         al azar, la reliquia deja de ser una decision y pasa a ser un premio. */
      D_maxRonda = Math.max(D_maxRonda, D_ronda);
      D_fase = 'elegir';
      D_oferta = dSorteaOferta();
      son('gana', 0.6);
      fogonazo(0.3);
      return;
    }
    if (D_mano >= dManos()){
      /* no llego: la corrida termina. Y lo que se guarda es la RONDA a la que
         llego, que es la medida que un roguelike usa. */
      this.gano = false;
      this.finP = TX('faltaron', D_objetivo - D_puntosRonda);
      this.vivo = false;
      return;
    }
    D_mano++;
    this.manoNueva();
  },

  eligeReliquia(i){
    if (D_fase !== 'elegir') return false;
    const r = D_oferta[i];
    /* ── SIN OFERTA SE SIGUE IGUAL ──
       Con las doce reliquias en su tope no queda ninguna que ofrecer, y ahi el
       juego se quedaria esperando un toque en una carta que no existe. Se pasa
       de ronda sin premio, que es lo que corresponde: el jugador ya tiene todo. */
    if (!r){
      if (!D_oferta.length){ D_ronda++; son('clic'); this.rondaNueva(); return true; }
      return false;
    }
    D_rel[r.k] = (D_rel[r.k] || 0) + 1;
    D_oferta.length = 0;
    D_ronda++;
    son('clic');
    this.rondaNueva();
    return true;
  },

  paso(dt){
    dGeo();
    if (D_ultT > 0) D_ultT = Math.max(0, D_ultT - dt);
    if (D_fase === 'tirando'){
      D_tumba -= dt;
      for (const d of D_dados){
        if (d.guardado) continue;
        d.gi += d.vgi*dt; d.vgi *= 0.94;
      }
      if (D_tumba <= 0) this.asienta();
    }
    /* ── EL GUARDADO SE ENDEREZA ──
       Medido en la captura: los dos dados guardados seguian girados el angulo
       con el que cayeron, y un dado torcido se lee a «todavia esta rodando»
       justo en los que ya estan apartados. Un dado que uno saca del cubilete y
       deja al costado lo deja derecho. */
    for (const d of D_dados)
      if (d.guardado && d.gi !== 0) d.gi += (0 - d.gi)*Math.min(1, dt*9);
  },

  baja(x, y){
    if (MODO !== 'juega') return;
    if (D_fase === 'elegir'){
      const i = dCartaEn(x, y);
      if (i >= 0) this.eligeReliquia(i);
      return;
    }
    if (D_fase !== 'espera') return;
    /* el boton de tirar: el respaldo de la sacudida, y ademas lo unico que
       existe en una notebook */
    if (y > AL - 210 && y < AL - 90 && Math.abs(x - AN/2) < 170){ this.tira(); return; }
    /* guardar un dado. No se puede antes de la primera tirada: guardar un valor
       que todavia no se tiro no significa nada. */
    if (D_tirada === 0) return;
    const i = dDadoEn(x, y);
    if (i >= 0){
      D_dados[i].guardado = !D_dados[i].guardado;
      son('clic', 0.7);
    }
  },

  fondo(g){ dGeo(); dFondo(g); },

  pinta(g){
    /* los dados */
    for (let i = 0; i < D_dados.length; i++){
      const d = D_dados[i], c = dCaja(i);
      dDado(g, c.x, c.y - (d.guardado ? 20 : 0), c.s, d.v, d.guardado, d.gi);
    }
    /* ── LO QUE LOS DADOS VALEN AHORA MISMO ──
       El nombre del combo y los puntos que pagaria, arriba de la fila. Es la
       pieza que le faltaba al juego: sin ella el jugador no sabe si le conviene
       guardar dos pares o ir por la terna, y peor, no aprende que combos
       existen — o sea que nunca los busca. Va apagado, porque es una cuenta y
       no un acontecimiento. */
    /* y NO mientras el combo grande esta en pantalla: medido en la captura,
       «ESCALERA» salia dos veces, una encima de la otra, porque el que acaba de
       pagar y el que vale ahora son el mismo. */
    if (D_tirada > 0 && D_fase === 'espera' && D_ultT <= 0){
      const v = D_dados.map(d => d.v);
      const r = dPuntos(v, D_dados.map(d => d.guardado));
      const yy = DG.y - DG.s*0.95 - 30;
      texto(TX(r.k).toUpperCase(), AN/2, yy, 30,
            r.k === 'nada' ? 'rgba(242,238,230,.34)' : 'rgba(255,215,106,.80)',
            '800', 'center');
      if (r.k !== 'nada')
        texto('+' + r.pts + '   ×' + r.mult, AN/2, yy + 30, 20,
              'rgba(242,238,230,.50)', '700', 'center');
    }
    /* y el combo que ACABA de pagar, grande y encima: es el acontecimiento */
    if (D_ultT > 0 && D_ultCombo){
      const a = Math.min(1, D_ultT/0.5);
      texto(TX(D_ultCombo).toUpperCase(), AN/2, DG.y - DG.s*0.95 - 86, 40,
            'rgba(255,215,106,' + a.toFixed(2) + ')', '800', 'center');
    }
    /* las tiradas que quedan, como puntos y no como un numero: se lee de reojo */
    const T = dTiradas();
    for (let i = 0; i < T; i++){
      const x = AN/2 - (T-1)*13 + i*26, y = DG.y + DG.s*0.92;
      g.beginPath(); g.arc(x, y, 7, 0, 7);
      g.fillStyle = i < (T - D_tirada) ? '#f2c33c' : 'rgba(255,255,255,.16)';
      g.fill();
    }
    /* las reliquias que se juntaron, chiquitas arriba: es el rastro de la
       corrida, y sin verlo el jugador no siente que junto nada */
    /* ── Y VAN CENTRADAS, que es lo que costo una captura ──
       Con `x = 38 + i*44` la fila arranca pegada al borde izquierdo y crece
       hacia el medio: con seis reliquias se lee a que algo se salio de sitio, y
       encima el rastro de la corrida —que es lo unico que dice «junte todo
       esto»— queda en la esquina donde nadie mira. */
    const ks = Object.keys(D_rel);
    if (ks.length){
      const POR = 8, sep = 44;
      for (let f = 0; f*POR < ks.length; f++){
        const n = Math.min(POR, ks.length - f*POR);
        const x0 = AN/2 - (n-1)*sep/2;
        for (let i = 0; i < n; i++)
          dFicha(g, x0 + i*sep, 118 + f*sep, ks[f*POR+i], D_rel[ks[f*POR+i]]);
      }
    }
    /* ══ LA BARRA DEL OBJETIVO, EN EL HUECO QUE HABIA ══
       Medido en la captura: entre la fila de dados y el boton de tirar quedaban
       quinientos sesenta puntos de nada, y el unico sitio donde se leia cuanto
       faltaba era una barra de tres pixeles pegada al borde de abajo. En un
       juego cuyo verbo entero es «llegar al objetivo», eso es esconder la
       pregunta. Va grande, en el medio del hueco, con los dos numeros adentro:
       el marcador de arriba dice cuanto llevas y esto dice cuanto falta, que no
       es la misma pregunta.
       Y lo que se dibuja en dorado claro por delante es LO QUE LA MANO PAGARIA
       si se anotara ahora: asi se ve de una si esta tirada alcanza. */
    if (D_fase !== 'elegir'){
      const bw = Math.min(460, AN - 140), bx = (AN - bw)/2, by = AL*0.63, bh = 26;
      const u = Math.max(0, Math.min(1, D_puntosRonda/Math.max(1, D_objetivo)));
      caja2(bx, by, bw, bh, 13, 'rgba(255,255,255,.07)', null);
      if (u > 0) caja2(bx, by, Math.max(bh, bw*u), bh, 13, '#f2c33c', null);
      /* la parte de adelante es la mano de ahora, y solo mientras haya algo
         tirado: dibujarla siempre pondria una franja fantasma en cero */
      if (D_tirada > 0 && D_fase === 'espera'){
        const pr = dPuntos(D_dados.map(d => d.v), D_dados.map(d => d.guardado));
        const u2 = Math.max(0, Math.min(1, (D_puntosRonda + pr.pts*pr.mult)/Math.max(1, D_objetivo)));
        if (u2 > u){
          g.save();
          g.beginPath();
          g.rect(bx + bw*u, by, bw*(u2 - u), bh);
          g.clip();
          caja2(bx, by, Math.max(bh, bw*u2), bh, 13, 'rgba(255,215,106,.42)', null);
          g.restore();
        }
      }
      texto(D_puntosRonda + ' / ' + D_objetivo, AN/2, by + bh/2 + 1, 20,
            u > 0.42 ? '#171410' : 'rgba(242,238,230,.72)', '800', 'center');
    }
    if (D_fase === 'elegir'){
      dCartas(g, D_oferta, -1, 1);
      texto(TX('elegi'), AN/2, AL*0.28, 26, '#ffd76a', '800', 'center');
      return;
    }
    /* el boton de tirar, y dice SACUDÍ cuando el sensor esta andando: si dijera
       siempre lo mismo, el jugador con giroscopio no se enteraria de que puede
       sacudir, y el que no lo tiene creeria que le falta algo */
    if (D_fase === 'espera' && D_tirada < dTiradas()){
      const hay = GIRO.estado === 'lista' && GIRO.on;
      dBoton(g, AN/2, AL - 150, 340, 96, hay ? TX('sacudi') : TX('tirar'), hay);
    }
  },

  /* ══════════ EL AUTO-JUGADOR ══════════
     Guarda lo que una persona guardaria: el grupo mas grande, o la corrida si
     esta a un dado de la escalera. Contra uno que no guarda NADA y tira las
     tres veces a lo bruto, la diferencia dice si decidir sirve. Y es lo unico
     que puede decir si la curva del objetivo esta bien: si el honesto se queda
     en la ronda tres, el juego es imposible; si pasa de veinte, no hay tension. */
  juegaSolo(n, azar){
    this.arranca();
    /* ── LA SEMILLA VA DESPUES DE `arranca`, PORQUE `arranca` LA PISA ──
       `arranca` la siembra con el reloj, asi que sembrandola antes las seis
       corridas del barrido salian identicas: medido, `rondaMin` y `rondaMax`
       daban el MISMO numero en las seis. Es la tercera vez en esta tanda que la
       semilla no llega a donde tiene que llegar. */
    D_azar = D_SEM;
    let vueltas = 0;
    const rel = [];
    while (this.vivo && vueltas < (n || 40000)){
      vueltas++;
      if (D_fase === 'elegir'){
        /* elige la reliquia por un orden de preferencia fijo, que es lo que
           hace una persona que ya jugo: mas tiradas y mas manos antes que mas
           puntos, porque las dos primeras multiplican todo lo demas */
        const pref = azar ? null : ['mano','tirada','dado','mult','poker','escala',
                                    'suma','terna','pares','guarda','unos','facil'];
        let i = 0;
        if (pref){
          let mejor = 99;
          for (let j = 0; j < D_oferta.length; j++){
            const p = pref.indexOf(D_oferta[j].k);
            if (p >= 0 && p < mejor){ mejor = p; i = j; }
          }
        } else i = Math.floor(dAz()*D_oferta.length);
        /* con las doce reliquias en su tope la oferta viene VACIA, y la primera
           version leia `D_oferta[i].k` sin comprobar: el auto-jugador se caia en
           la ronda 34 con un TypeError y la corrida terminaba ahi por un defecto
           de la prueba y no del juego */
        if (D_oferta[i]) rel.push(D_oferta[i].k);
        this.eligeReliquia(i);
        continue;
      }
      if (D_fase === 'espera'){
        if (D_tirada === 0){ this.tira(); }
        else if (D_tirada < dTiradas()){
          if (!azar) dGuardaBien();
          this.tira();
        }
      }
      /* la tirada tarda 0,62 s en asentarse: sin adelantar el reloj la mano no
         termina nunca y el bucle se va en vacio */
      for (let k = 0; k < 40 && D_fase === 'tirando'; k++) this.paso(1/60);
    }
    return { ronda: D_maxRonda, puntos: PUNTOS, vueltas,
             reliquias: rel.length, tomadas: rel.slice(0, 10),
             dados: dNDados(), tiradas: dTiradas(), manos: dManos(),
             obj: D_objetivo, vivo: !!this.vivo };
  },

  cfg(o){
    if (o.sem != null) D_SEM = o.sem;
    if (o.kobj != null) D_KOBJ = o.kobj;
    if (o.robj != null) D_ROBJ = o.robj;
    return { sem: D_SEM, kobj: D_KOBJ, robj: D_ROBJ,
             obj: [1,5,10,15,20].map(dObjetivo) };
  },

  ver(){
    const v = D_dados.map(d => d.v);
    return { ronda: D_ronda, mano: D_mano + '/' + dManos(),
             tirada: D_tirada + '/' + dTiradas(), fase: D_fase,
             dados: v, guardados: D_dados.map(d => d.guardado ? 1 : 0),
             combo: dCombo(v), pts: dPuntos(v, D_dados.map(d => d.guardado)).pts,
             ronPts: D_puntosRonda, obj: D_objetivo,
             rel: D_rel, oferta: D_oferta.map(r => r.k),
             giro: GIRO.estado, sacN: GIRO.sacN };
  }
};

/* ── QUE GUARDARIA UNA PERSONA ──
   El grupo mas grande, salvo que falte UN dado para la escalera: ahi conviene
   guardar la corrida. Es la misma cuenta que hace cualquiera jugando al
   generala, y esta escrita una sola vez asi que el bot no puede elegir por una
   regla que el juego no premia. */
function dGuardaBien(){
  const v = D_dados.map(d => d.v);
  const c = new Array(D_CARAS + 1).fill(0);
  for (const x of v) c[x]++;
  let mejorCara = 1, mejorN = 0;
  for (let i = 1; i <= D_CARAS; i++) if (c[i] > mejorN){ mejorN = c[i]; mejorCara = i; }
  /* cuantos valores distintos seguidos hay: si son cuatro, la escalera esta a
     un dado y vale mas que un par */
  let mejorCorr = 0, corr = 0, corrIni = 1, iniMejor = 1;
  for (let i = 1; i <= D_CARAS; i++){
    if (c[i] > 0){ if (corr === 0) corrIni = i; corr++;
                   if (corr > mejorCorr){ mejorCorr = corr; iniMejor = corrIni; } }
    else corr = 0;
  }
  const porEscalera = mejorCorr >= 4 && mejorN < 3;
  const usados = new Set();
  for (let i = 0; i < D_dados.length; i++){
    const d = D_dados[i];
    if (porEscalera){
      const dentro = d.v >= iniMejor && d.v < iniMejor + mejorCorr;
      /* y un solo dado por valor: dos cuatros no ayudan a una escalera */
      d.guardado = dentro && !usados.has(d.v);
      if (d.guardado) usados.add(d.v);
    } else {
      d.guardado = (d.v === mejorCara);
    }
  }
}

function dSorteaOferta(){
  /* tres distintas, y ninguna que ya llego a su tope: una carta muerta es un
     tercio de la decision tirado */
  const pool = D_RELIQ.filter(r => dR(r.k) < r.tope);
  const o = [];
  while (o.length < 3 && o.length < pool.length){
    const r = pool[Math.floor(dAz()*pool.length)];
    if (o.indexOf(r) < 0) o.push(r);
  }
  return o;
}

/* ══════════ DIBUJO ══════════ */
function dDadoEn(x, y){
  for (let i = 0; i < D_dados.length; i++){
    const c = dCaja(i);
    /* el blanco se infla: un dado mide 96 de diseño, o sea 55 px en un
       telefono, y pedir el toque exacto en algo que se toca cien veces por
       partida es hacer fallar al jugador por el pixel y no por la decision */
    if (x > c.x - 12 && x < c.x + c.s + 12 &&
        y > c.y - 34 && y < c.y + c.s + 22) return i;
  }
  return -1;
}
const D_PIPS = {
  1: [[.5,.5]],
  2: [[.28,.28],[.72,.72]],
  3: [[.26,.26],[.5,.5],[.74,.74]],
  4: [[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
  5: [[.26,.26],[.74,.26],[.5,.5],[.26,.74],[.74,.74]],
  6: [[.28,.24],[.72,.24],[.28,.5],[.72,.5],[.28,.76],[.72,.76]]
};
function dDado(g, x, y, s, v, guardado, gi){
  g.save();
  g.translate(x + s/2, y + s/2);
  if (gi) g.rotate(gi);
  /* la sombra de contacto: sin ella el dado flota sobre el fieltro */
  g.save();
  g.globalAlpha = 0.30;
  g.beginPath(); g.ellipse(0, s*0.56, s*0.42, s*0.10, 0, 0, 7);
  g.fillStyle = '#000'; g.fill();
  g.restore();
  if (!dibCuadro('dados', v - 1, 0, s/2, s, false)){
    const r = s*0.20;
    /* el cuerpo con degradado y el canto claro arriba: un cuadrado de un solo
       color se lee a ficha y no a dado */
    const gr = g.createLinearGradient(0, -s/2, 0, s/2);
    gr.addColorStop(0, guardado ? '#fff8e0' : '#f4f1e8');
    gr.addColorStop(1, guardado ? '#d8bd72' : '#c9c4b4');
    caja2(-s/2, -s/2, s, s, r, gr, null);
    g.strokeStyle = 'rgba(0,0,0,.20)'; g.lineWidth = Math.max(1.5, s*0.022);
    g.beginPath();
    g.moveTo(-s/2 + r, -s/2); g.lineTo(s/2 - r, -s/2);
    g.stroke();
    const pips = D_PIPS[v] || D_PIPS[1];
    for (const [px, py] of pips){
      g.beginPath();
      g.arc(-s/2 + px*s, -s/2 + py*s, s*0.085, 0, 7);
      g.fillStyle = '#2a2620'; g.fill();
    }
  }
  if (guardado){
    /* el guardado se ve por DOS cosas: levantado y con aro. Solo levantado, en
       una fila de siete no se nota cual esta arriba. */
    g.beginPath();
    caja2(-s/2 - 6, -s/2 - 6, s + 12, s + 12, s*0.24, null, null);
    g.strokeStyle = '#f2c33c'; g.lineWidth = 4;
    g.strokeRect(-s/2 - 6, -s/2 - 6, s + 12, s + 12);
  }
  g.restore();
}

function dFicha(g, x, y, k, n){
  const r = 17;
  g.beginPath(); g.arc(x, y, r, 0, 7);
  g.fillStyle = 'rgba(242,195,60,.16)'; g.fill();
  g.strokeStyle = 'rgba(242,195,60,.55)'; g.lineWidth = 2; g.stroke();
  const R = D_RELIQ.find(z => z.k === k);
  texto(R ? R.cara : '?', x, y + 5, 12, '#ffd76a', '800', 'center');
  if (n > 1) texto('x' + n, x + 13, y + 15, 10, '#ffd76a', '800', 'center');
}

/* las tres cartas de reliquia. Van dibujadas en el lienzo y no en DOM porque
   son parte de la partida —aparecen y se van— y el texto igual pasa por TX(),
   asi que estan traducidas. */
function dCartas(g, lista, sel, k){
  const w = Math.min(190, (AN - 60)/3 - 12), h = w*1.5;
  const tot = lista.length*w + (lista.length-1)*14;
  const x0 = (AN - tot)/2, y = AL*0.40;
  for (let i = 0; i < lista.length; i++){
    const r = lista[i];
    if (!r) continue;
    const x = x0 + i*(w + 14);
    const yy = y + (1 - k)*220;
    g.save();
    g.globalAlpha = k;
    caja2(x, yy, w, h, 18, 'rgba(20,18,26,.92)', null);
    g.strokeStyle = '#f2c33c'; g.lineWidth = 3;
    g.strokeRect(x, yy, w, h);
    texto(r.cara, x + w/2, yy + h*0.34, Math.min(46, w*0.36), '#ffd76a', '800', 'center');
    /* la descripcion partida en lineas: una frase de cuarenta caracteres en una
       carta de 190 se sale por los dos lados */
    const pal = TX('r_' + r.k).split(' ');
    const lin = [];
    let cur = '';
    for (const p of pal){
      if ((cur + ' ' + p).trim().length > 15){ lin.push(cur.trim()); cur = p; }
      else cur += ' ' + p;
    }
    if (cur.trim()) lin.push(cur.trim());
    for (let j = 0; j < lin.length; j++)
      texto(lin[j], x + w/2, yy + h*0.56 + j*20, 14, '#f2eee6', '600', 'center');
    g.restore();
  }
}
function dCartaEn(x, y){
  const n = D_oferta.length;
  if (!n) return -1;
  const w = Math.min(190, (AN - 60)/3 - 12), h = w*1.5;
  const tot = n*w + (n-1)*14, x0 = (AN - tot)/2, yy = AL*0.40;
  for (let i = 0; i < n; i++){
    const cx = x0 + i*(w + 14);
    if (x > cx - 8 && x < cx + w + 8 && y > yy - 8 && y < yy + h + 8) return i;
  }
  return -1;
}

function dBoton(g, cx, cy, w, h, txt, fuerte){
  g.save();
  caja2(cx - w/2, cy - h/2, w, h, h/2,
        fuerte ? 'rgba(242,195,60,.92)' : 'rgba(242,238,230,.14)', null);
  if (!fuerte){
    g.strokeStyle = 'rgba(242,238,230,.34)'; g.lineWidth = 2;
    g.strokeRect(cx - w/2, cy - h/2, w, h);
  }
  texto(txt, cx, cy + 11, 30, fuerte ? '#1a1608' : '#f2eee6', '800', 'center');
  g.restore();
}

function dFondo(g){
  /* el degradado y la foto los pone `ambAtras()`: acá va el fieltro y la banda */
  /* el fieltro: una trama fina anclada al mundo. Sin ella el fondo es un
     degradado liso, que es lo que delata a un juego hecho a las apuradas. */
  g.fillStyle = 'rgba(255,255,255,.022)';
  for (let y = 24; y < AL; y += 18) g.fillRect(0, y, AN, 1);
  /* y la banda de la mesa donde caen los dados */
  const b = g.createLinearGradient(0, AL*0.38, 0, AL*0.66);
  b.addColorStop(0, 'rgba(255,255,255,0)');
  b.addColorStop(0.5, 'rgba(255,255,255,.045)');
  b.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = b; g.fillRect(0, AL*0.38, AN, AL*0.28);
}
