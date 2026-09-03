/* ══════════════════════════════ ARCO ══════════════════════════════
   Dos arqueros, uno en cada punta del valle, y por turnos. Se arrastra hacia
   atrás desde el propio arquero —como se tensa un arco de verdad— y al soltar
   sale la flecha. Gana el que baja al otro. Doce rivales en escalera, cada uno
   con su cabeza y su forma de apuntar.

   ── LAS CUATRO COSAS QUE HACEN QUE ESTO NO SEA UN JUEGO DE FÍSICA ──
   Un tiro parabólico entre dos puntos lo resuelve cualquiera en veinte líneas.
   Lo que separa eso de un juego son cuatro decisiones, y ninguna es la física:

   1. LA CÁMARA SIGUE LA FLECHA Y VUELVE. Con la cámara quieta, el tiro es un
      arco que cruza la pantalla y ya; siguiéndola, el tiro DURA, y el segundo y
      medio que tarda en llegar es todo el suspenso que el juego tiene.
   2. EL IMPACTO VA EN CÁMARA LENTA. El cuadro en que la flecha llega es el único
      que importa de todo el turno, y a velocidad normal pasa en 16 ms.
   3. EL VIENTO CAMBIA CADA TURNO Y SE VE. Sin él, el segundo tiro es el primero
      repetido: una vez que encontraste el ángulo, ganaste. Con viento hay que
      volver a calcular, y por eso se DIBUJA —la bandera, las hojas, la flecha
      del indicador— en vez de escribirlo en un número.
   4. Y DÓNDE PEGA IMPORTA. Un tiro a la cabeza vale el triple que uno al pie, o
      sea que apuntar bien no es sólo acertar: es elegir a qué acertar.

   ── EL MUNDO ES MÁS ANCHO QUE LA PANTALLA, Y ESO ES A PROPÓSITO ──
   En un marco vertical de 720, dos arqueros en los bordes están a un dedo de
   distancia y la parábola no tiene dónde crecer. El valle mide 1300 y la cámara
   se aleja para encuadrarlos a los dos y se acerca para seguir la flecha: el
   zoom no es un efecto, es lo que hace que quepan las dos cosas. */

const A_MUNDO = 1300;          /* ancho del valle en unidades de diseño */
const A_G = 1350;              /* gravedad: sale de querer un vuelo de ~1,6 s */
const A_VMAX = 1380;           /* la velocidad con el arco tensado al tope */
const A_TENSA = 260;           /* cuánto hay que arrastrar para el tope */
const A_VIDA = 100;
/* ── EL ALTO DEL ARQUERO, MEDIDO EN PANTALLA Y NO ELEGIDO ──
   Lo usan el dibujo Y el choque, que es lo que garantiza que se le pegue a lo
   que se ve. Estaba en 150 y en un telefono de 412x892 eso da SETENTA pixeles
   de alto en el duelo 1 y CINCUENTA Y SIETE en el 6 —medido con `ver()`: el
   zoom en reposo sale de la separacion, 0,82 y 0,67— o sea menos del ocho por
   ciento de la pantalla para el unico personaje del juego. En 260 pasa a 122 y
   100 pixeles, que es la escala a la que la cara y el arco se leen. */
const A_ALTO = 260;

/* ── LOS DOCE RIVALES ──
   `p` es la puntería: cuánto se desvía del tiro perfecto, en fracción. `v` es
   cuánto varía su error entre tiro y tiro — uno que siempre falla PARA EL MISMO
   LADO es predecible y se le gana leyéndolo, y uno que falla al azar no. Los dos
   números juntos son la personalidad, y por eso ninguno es «más difícil»: son
   difíciles de maneras distintas. */
const A_RIV = [
  { k: 'novato',  cara: 0, p: 0.26, v: 0.9, vida: 100 },
  { k: 'guardia', cara: 1, p: 0.20, v: 0.5, vida: 110 },
  { k: 'cazador', cara: 2, p: 0.15, v: 0.8, vida: 100 },
  { k: 'nomade',  cara: 3, p: 0.17, v: 0.3, vida: 105 },
  { k: 'barbaro', cara: 4, p: 0.22, v: 1.0, vida: 130 },
  { k: 'mago',    cara: 5, p: 0.13, v: 0.6, vida: 95 },
  { k: 'capitan', cara: 1, p: 0.11, v: 0.4, vida: 125 },
  { k: 'sombra',  cara: 2, p: 0.09, v: 0.7, vida: 100 },
  { k: 'reina',   cara: 3, p: 0.10, v: 0.2, vida: 115 },
  { k: 'coloso',  cara: 4, p: 0.15, v: 0.9, vida: 160 },
  { k: 'arquera', cara: 5, p: 0.07, v: 0.4, vida: 110 },
  { k: 'rey',     cara: 0, p: 0.05, v: 0.3, vida: 150 },
];

/* ── LAS ZONAS DEL CUERPO ──
   La altura se mide desde los PIES en fracción del alto, así que el reparto no
   cambia si el personaje cambia de tamaño. Y la cabeza es chica a propósito: si
   midiera un tercio, el triple de daño saldría de casualidad. */
const A_ZONAS = [
  { alto: [0.82, 1.00], k: 'cabeza', dano: 34, col: '#ff5a4a' },
  { alto: [0.48, 0.82], k: 'pecho',  dano: 20, col: '#ffb03c' },
  { alto: [0.00, 0.48], k: 'piernas', dano: 11, col: '#8ad7ff' },
];

let A_duelo = 1, A_puntos = 0, A_rachaG = 0;
let A_yo = { x: 150, y: 0, vida: A_VIDA, max: A_VIDA, cara: 0 };
let A_el = { x: A_MUNDO - 150, y: 0, vida: A_VIDA, max: A_VIDA, cara: 1 };
let A_riv = A_RIV[0];
let A_turno = 0;               /* 0 vos, 1 el rival */
let A_fase = 'apunta';         /* apunta · vuela · impacto · turno · fin */
let A_t = 0;
let A_viento = 0;              /* unidades/s², positivo empuja a la derecha */
let A_flecha = null;
let A_estela = [];
let A_lento = 0;               /* la cámara lenta del impacto */
let A_ultZona = '', A_ultT = 0;
let A_arrastre = null;         /* {x0,y0,x,y} mientras se tensa */
let A_camX = 0, A_camZ = 1, A_camMX = 0, A_camMZ = 1;
let A_sacIA = 0;               /* lo que el rival espera antes de tirar */
let A_props = [];              /* la decoración del valle, sembrada por duelo */
let A_azar = 5;
function aAz(){ A_azar = (A_azar*1664525 + 1013904223) >>> 0; return A_azar / 4294967296; }

/* ── EL TERRENO ──
   Una función del x y no una lista de puntos: así el suelo se puede consultar
   en cualquier sitio —para apoyar un árbol, para saber si la flecha se clavó—
   sin buscar en un array, y las dos plataformas salen de la misma cuenta que
   dibuja la colina. */
function aSuelo(x){
  const u = x/A_MUNDO;
  return 300
       + Math.sin(u*3.1 + 0.7)*70
       + Math.sin(u*7.3 + 2.1)*26
       + Math.sin(u*13.0 + 4.0)*9;
}

/* ══════════ LOS TEXTOS ══════════ */
const JT = {
  es: { sub:'Arrastrá hacia atrás para tensar y soltá.',
        c1:'Arrastrá hacia atrás desde tu arquero.',
        c2:'La flecha sigue el viento. Mirá la bandera.',
        c3:'A la cabeza duele el triple. Doce rivales te esperan.',
        dueloC:'DUELO', vientoC:'VIENTO', tuTurno:'TU TURNO', suTurno:'TIRA ÉL',
        cabeza:'¡A LA CABEZA!', pecho:'AL PECHO', piernas:'EN LA PIERNA',
        fallo:'FALLÓ', ganaste:'GANASTE EL DUELO', sigue:'SEGUÍ',
        r_novato:'EL NOVATO', r_guardia:'EL GUARDIA', r_cazador:'EL CAZADOR',
        r_nomade:'EL NÓMADE', r_barbaro:'EL BÁRBARO', r_mago:'EL MAGO',
        r_capitan:'EL CAPITÁN', r_sombra:'LA SOMBRA', r_reina:'LA REINA',
        r_coloso:'EL COLOSO', r_arquera:'LA ARQUERA', r_rey:'EL REY' },
  en: { sub:'Drag back to draw, then release.',
        c1:'Drag back from your archer.',
        c2:'The arrow follows the wind. Watch the flag.',
        c3:'A headshot hurts three times as much. Twelve rivals await.',
        dueloC:'DUEL', vientoC:'WIND', tuTurno:'YOUR TURN', suTurno:'HIS SHOT',
        cabeza:'HEADSHOT!', pecho:'BODY HIT', piernas:'LEG HIT',
        fallo:'MISSED', ganaste:'DUEL WON', sigue:'NEXT',
        r_novato:'THE ROOKIE', r_guardia:'THE GUARD', r_cazador:'THE HUNTER',
        r_nomade:'THE NOMAD', r_barbaro:'THE BARBARIAN', r_mago:'THE WIZARD',
        r_capitan:'THE CAPTAIN', r_sombra:'THE SHADOW', r_reina:'THE QUEEN',
        r_coloso:'THE COLOSSUS', r_arquera:'THE ARCHER', r_rey:'THE KING' },
  pt: { sub:'Arraste para trás para esticar e solte.',
        c1:'Arraste para trás a partir do seu arqueiro.',
        c2:'A flecha segue o vento. Olhe a bandeira.',
        c3:'Na cabeça dói três vezes mais. Doze rivais esperam.',
        dueloC:'DUELO', vientoC:'VENTO', tuTurno:'SUA VEZ', suTurno:'ELE ATIRA',
        cabeza:'NA CABEÇA!', pecho:'NO PEITO', piernas:'NA PERNA',
        fallo:'ERROU', ganaste:'DUELO GANHO', sigue:'SEGUIR',
        r_novato:'O NOVATO', r_guardia:'O GUARDA', r_cazador:'O CAÇADOR',
        r_nomade:'O NÔMADE', r_barbaro:'O BÁRBARO', r_mago:'O MAGO',
        r_capitan:'O CAPITÃO', r_sombra:'A SOMBRA', r_reina:'A RAINHA',
        r_coloso:'O COLOSSO', r_arquera:'A ARQUEIRA', r_rey:'O REI' }
};
const PIEL = { ac:'#ffb03c', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tensa', pierde:'grito', gana:'gana',
                    clic:'clic', caida:'tira' };

/* ══════════ EL AMBIENTE ══════════ */
const AMB = {
  foto: 'f_arco',
  cielo: ['#2e4a6b', '#c98a5a'],
  haz: 0.10,
  vineta: 0.36,
  part: { n: 14, dir: 'cae', forma: 'hoja', col: '#e8c98a',
          r0: 5, r1: 12, v0: 16, v1: 40, amp: 60, gira: 1.1,
          a0: 0.10, a1: 0.24 }
};

/* ══════════ LA CÁMARA ══════════
   Todo lo del valle se dibuja adentro de una transformación, así que el juego
   piensa en coordenadas de MUNDO y no se entera de que la cámara existe. Es lo
   que permitió que el seguimiento de la flecha se agregara sin tocar una sola
   línea de la física. */
/* ── EL ANCLA DE LA CÁMARA, EN DOS CONSTANTES Y NO EN CUATRO NÚMEROS ──
   `aCam` y `aAMundo` son la misma transformación y su inversa, así que un número
   cambiado en una y no en la otra hace que el dedo apunte a un sitio distinto
   del que se ve — y eso no falla, contesta mal. Ya pasó acá: el ancla se movió
   del 60 % al 78 % y hubo que acordarse de tocar los dos sitios a mano.
   `A_ANCLA_Y` es dónde cae el suelo en la pantalla y `A_OJO` cuánto por encima
   del suelo mira la cámara. Con el suelo en el 82 % quedan unos ciento cuarenta
   píxeles abajo, que es lo que ocupan el pie y el borde del marco: menos deja al
   arquero pegado al canto y más es pasto que no informa nada — medido en la
   captura, con el ancla en el 78 % y el ojo 120 por debajo del suelo sobraban
   doscientos noventa de verde plano. */
const A_ANCLA_Y = 0.82, A_OJO = 30;
function aCam(g){
  g.save();
  /* ── EL SUELO SE ANCLA AL 78 % DEL ALTO Y NO AL 60 % ──
     Medido en la captura: con el 60 %, el tercio de abajo de la pantalla era
     verde plano —trescientos cincuenta píxeles de pasto sin nada que mirar— y
     la parábola, que es donde pasa TODO, quedaba apretada arriba. La acción de
     este juego ocurre en el aire, así que el aire es lo que tiene que ocupar la
     pantalla. */
  g.translate(AN/2, AL*A_ANCLA_Y);
  g.scale(A_camZ, A_camZ);
  g.translate(-A_camX, -(aSuelo(A_camX) - A_OJO));
}
function aCamMeta(){
  if (A_fase === 'vuela' && A_flecha){
    /* siguiendo la flecha se acerca, pero NO se pega: con el zoom al tope la
       flecha llena la pantalla y no se ve hacia dónde va, que es lo único que
       hay para mirar mientras vuela */
    A_camMX = A_flecha.x;
    A_camMZ = 0.86;
  } else {
    /* en reposo encuadra a los dos, y el zoom sale del ANCHO que hay que
       mostrar y no de un número: con dos arqueros que se mueven de duelo en
       duelo, un zoom fijo deja a uno afuera */
    A_camMX = (A_yo.x + A_el.x)/2;
    /* el margen baja de 320 a 170: con 320 los arqueros quedaban en setenta y
       siete píxeles de alto sobre una pantalla de ochocientos noventa, o sea que
       no se distinguía a quién se le estaba tirando */
    const ancho = Math.abs(A_el.x - A_yo.x) + 170;
    A_camMZ = Math.max(0.46, Math.min(1.05, AN/ancho));
  }
}
function aCamPaso(dt){
  aCamMeta();
  /* el seguimiento va con constante de tiempo y no lineal: lineal se ve a
     cámara motorizada, y con resorte se ve a alguien apuntando la cámara */
  const k = Math.min(1, dt*(A_fase === 'vuela' ? 7 : 3.4));
  A_camX += (A_camMX - A_camX)*k;
  A_camZ += (A_camMZ - A_camZ)*k;
}
/* de pantalla a mundo: hace falta para saber dónde tocó el dedo */
function aAMundo(px, py){
  return { x: (px - AN/2)/A_camZ + A_camX,
           y: (py - AL*A_ANCLA_Y)/A_camZ + aSuelo(A_camX) - A_OJO };
}

const JUEGO = {
  id: 'arco',
  tipo: 'puntos',
  vivo: true, gano: false,
  get marca(){ return A_puntos; },
  get sub(){ return TX('r_' + A_riv.k); },
  get ficI(){ return TX('dueloC') + ' ' + A_duelo; },
  get ficD(){ return A_fase === 'apunta' && A_turno === 0 ? TX('tuTurno') : TX('suTurno'); },
  get resta(){ return Math.max(0, Math.min(1, A_yo.vida/A_yo.max)); },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ aDemo(g, u, 0); } },
    { dur: 3.2, pie: 'c2', dibuja(g, u){ aDemo(g, u, 1); } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){ aDemo(g, u, 2); } }
  ],

  arranca(){
    A_duelo = 1; A_puntos = 0; A_rachaG = 0;
    this.vivo = true; this.gano = false;
    this.dueloNuevo();
  },
  dueloNuevo(){
    A_riv = A_RIV[Math.min(A_RIV.length - 1, A_duelo - 1)];
    A_azar = (A_duelo*2654435761) >>> 0;
    for (let i = 0; i < 5; i++) aAz();
    /* la distancia crece con el duelo: el primero se resuelve de un tiro y el
       último obliga a leer el viento. Y crece MENOS que la potencia del arco,
       porque si no el último sería imposible en vez de difícil. */
    const sep = Math.min(A_MUNDO - 220, 620 + A_duelo*46);
    A_yo.x = (A_MUNDO - sep)/2;
    A_el.x = A_yo.x + sep;
    A_yo.y = aSuelo(A_yo.x); A_el.y = aSuelo(A_el.x);
    A_yo.vida = A_yo.max = A_VIDA + Math.min(40, A_rachaG*8);
    A_el.vida = A_el.max = A_riv.vida;
    A_el.cara = A_riv.cara;
    A_turno = 0;
    aSiembraProps();
    this.turnoNuevo();
    A_camX = (A_yo.x + A_el.x)/2; A_camZ = 0.6;
  },
  turnoNuevo(){
    A_fase = 'apunta'; A_t = 0; A_flecha = null; A_estela.length = 0;
    A_arrastre = null;
    /* ── EL VIENTO CAMBIA CADA TURNO Y CRECE CON EL DUELO ──
       Sin que cambie, el segundo tiro es el primero repetido y el duelo se gana
       encontrando el ángulo una sola vez. */
    const t = Math.min(300, 40 + A_duelo*22);
    A_viento = (aAz()*2 - 1)*t;
    A_sacIA = 0.9 + aAz()*0.6;
  },

  paso(dt){
    if (A_ultT > 0) A_ultT = Math.max(0, A_ultT - dt);
    /* ── LA CÁMARA LENTA VA EN EL PASO Y NO EN EL RELOJ DE DIBUJO ──
       Ralentizando el dibujo, la física seguiría a velocidad normal y el
       impacto pasaría igual de rápido: lo que hay que estirar es el TIEMPO del
       mundo. Y la cámara sí se mueve a velocidad real, porque una cámara que se
       ralentiza con la escena no se lee a cámara lenta, se lee a que el juego se
       colgó. */
    const dtm = A_lento > 0 ? dt*0.22 : dt;
    if (A_lento > 0) A_lento = Math.max(0, A_lento - dt);
    aCamPaso(dt);

    if (A_fase === 'vuela'){
      const f = A_flecha;
      f.vx += A_viento*dtm;
      f.vy += A_G*dtm;
      f.x += f.vx*dtm; f.y += f.vy*dtm;
      f.gi = Math.atan2(f.vy, f.vx);
      A_estela.push({ x: f.x, y: f.y, t: 0.5 });
      if (A_estela.length > 90) A_estela.shift();
      for (const e of A_estela) e.t -= dtm;
      /* ── EL BLANCO SE PRUEBA CONTRA EL SEGMENTO Y NO CONTRA EL PUNTO ──
         La flecha llega a 1400 unidades por segundo, o sea 23 por cuadro: contra
         el punto, atraviesa un cuerpo de 40 de ancho una vez de cada dos. Es el
         mismo defecto que en BURBUJAS tuvo el tirador. */
      const z = aPega(f, dtm);
      if (z) return this.impacto(z);
      if (f.y > aSuelo(f.x)) return this.impacto(null);
      if (f.x < -260 || f.x > A_MUNDO + 260 || f.y > 3000) return this.impacto(null);
      return;
    }
    if (A_fase === 'turno'){
      A_t += dt;
      if (A_t > 1.1) this.cambiaTurno();
      return;
    }
    if (A_fase === 'apunta' && A_turno === 1){
      A_t += dt;
      if (A_t > A_sacIA) this.tiraIA();
    }
  },

  /* ── EL TIRO, Y LOS DOS TIRADORES PASAN POR ACÁ ──
     Con dos funciones —una para el jugador y otra para el rival— la física se
     duplica, y el día que cambie la gravedad una de las dos se queda vieja: el
     rival tiraría distinto que uno y nadie se enteraría hasta jugar mucho. */
  tira(quien, ang, fuerza){
    const a = quien === 0 ? A_yo : A_el;
    const s = quien === 0 ? 1 : -1;
    const v = Math.max(0.12, Math.min(1, fuerza))*A_VMAX;
    A_flecha = { x: a.x + s*34, y: a.y - A_ALTO*0.62,
                 vx: Math.cos(ang)*v*s, vy: -Math.sin(ang)*v,
                 gi: 0, de: quien };
    A_estela.length = 0;
    A_fase = 'vuela';
    son('caida', 0.9);
    sacude(0.12);
  },

  tiraIA(){
    /* ── EL RIVAL RESUELVE LA PARÁBOLA Y DESPUÉS SE EQUIVOCA A PROPÓSITO ──
       Un rival que tira al azar no es fácil, es ABURRIDO: no aprende y no se
       puede leer. Éste calcula el tiro perfecto y le mete SU error, así que su
       personalidad es de cuánto falla y no de qué tan tonto es. */
    const t = aTiroPerfecto(A_el, A_yo, -1);
    const e = A_riv.p*(1 + (aAz()*2 - 1)*A_riv.v);
    this.tira(1, t.ang*(1 + e*0.35), t.f*(1 + e));
  },

  impacto(z){
    A_fase = 'impacto'; A_t = 0;
    const f = A_flecha;
    if (z){
      const vic = z.quien === 0 ? A_yo : A_el;
      vic.vida = Math.max(0, vic.vida - z.dano);
      A_ultZona = z.k; A_ultT = 1.4;
      /* ── Y ACÁ ES DONDE ENTRA LA CÁMARA LENTA ──
         Sólo cuando PEGA: ralentizando también los fallos, cada tiro fallado
         costaría un segundo de nada y el juego se haría lento en vez de tenso. */
      A_lento = z.k === 'cabeza' ? 0.85 : 0.5;
      son('bien', 1);
      son('pierde', 0.7);
      sacude(z.k === 'cabeza' ? 0.9 : 0.5);
      destella(z.col, z.k === 'cabeza' ? 1.0 : 0.55);
      chispas(f.x, f.y, z.k === 'cabeza' ? 26 : 14, z.col, 190);
      if (f.de === 0) A_puntos += sumaPuntos(z.dano*3, AN/2, AL*0.36);
    } else {
      A_ultZona = 'fallo'; A_ultT = 1.0;
      son('toque', 0.6);
      chispas(f.x, f.y, 8, '#c9b48a', 90);
    }
    /* la flecha se queda clavada un instante: desapareciendo en el cuadro del
       golpe, el jugador no llega a ver DÓNDE pegó */
    A_flecha.clavada = true;
  },

  cambiaTurno(){
    if (A_el.vida <= 0){
      A_rachaG++;
      A_puntos += sumaPuntos(200 + A_duelo*40 + A_yo.vida*2, AN/2, AL*0.36);
      son('gana', 1); destella('#ffd76a', 1.0);
      A_duelo++;
      if (A_duelo > A_RIV.length){ this.gano = true; this.vivo = false; return; }
      this.dueloNuevo();
      return;
    }
    if (A_yo.vida <= 0){ son('pierde'); this.vivo = false; return; }
    A_turno = 1 - A_turno;
    this.turnoNuevo();
  },

  /* ── EL ARRASTRE: SE TENSA HACIA ATRÁS ──
     Al revés de arrastrar hacia donde uno quiere tirar, que es lo que uno
     escribiría primero. Tensar hacia atrás es lo que hace el cuerpo con un arco
     de verdad, y encima deja la mano FUERA del sitio al que se apunta: con el
     otro esquema, el dedo tapa exactamente lo que hay que mirar. */
  baja(px, py){
    if (MODO !== 'juega') return;
    if (A_fase === 'impacto'){ A_fase = 'turno'; A_t = 0; return; }
    if (A_fase !== 'apunta' || A_turno !== 0) return;
    A_arrastre = { x0: px, y0: py, x: px, y: py };
    son('toque', 0.5);
  },
  mueve(px, py){ if (A_arrastre){ A_arrastre.x = px; A_arrastre.y = py; } },
  sube(){
    if (!A_arrastre || A_fase !== 'apunta' || A_turno !== 0){ A_arrastre = null; return; }
    const t = aTension();
    A_arrastre = null;
    if (t.f < 0.10) return;      /* un toque no es un tiro */
    this.tira(0, t.ang, t.f);
  },

  fondo(g){},
  pinta(g){ aPinta(g); },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto resuelve la parábola CON el viento puesto; el otro tira al azar.
     Si leer el viento no sirviera, los dos llegarían igual de lejos. */
  juegaSolo(n, azar){
    this.arranca();
    let v = 0, dueloMax = 1, tiros = 0, pegue = 0, cabezas = 0;
    const dt = 1/60;
    while (v < (n || 40000) && this.vivo){
      v++;
      if (A_fase === 'impacto'){ A_fase = 'turno'; A_t = 0; continue; }
      if (A_fase === 'apunta' && A_turno === 0){
        tiros++;
        if (azar) this.tira(0, 0.25 + Math.random()*1.1, 0.35 + Math.random()*0.65);
        else {
          const t = aTiroPerfecto(A_yo, A_el, 1);
          /* apunta a la cabeza y no al centro: es lo que hace una persona que
             ya entendió que la cabeza vale el triple */
          this.tira(0, t.ang, t.f);
        }
        const antes = A_el.vida;
        while (A_fase === 'vuela' && v < (n || 40000)){ this.paso(dt); v++; }
        if (A_el.vida < antes) pegue++;
        if (A_ultZona === 'cabeza') cabezas++;
        continue;
      }
      dueloMax = Math.max(dueloMax, A_duelo);
      this.paso(dt);
    }
    return JSON.stringify({ duelo: A_duelo, dueloMax, puntos: A_puntos,
                            tiros, pegue, cabezas,
                            tasa: tiros ? +(pegue/tiros).toFixed(3) : 0,
                            vueltas: v, vivo: this.vivo });
  },

  /* ── LA AUDITORÍA: QUE EL TIRO PERFECTO SEA PERFECTO ──
     Es la única propiedad que este juego necesita y no se puede mirar: si la
     solución de la parábola está mal, el rival falla siempre y el jugador no
     tiene con qué comparar. Se prueba con los doce duelos y con los dos
     sentidos del viento. */
  audita(){
    const gd = A_duelo, gv = A_viento;
    let peor = 0, malos = 0, n = 0, fuera = 0;
    const dt = 1/240;
    for (let d = 1; d <= A_RIV.length; d++){
      A_duelo = d; this.dueloNuevo();
      for (const w of [-1, -0.4, 0, 0.4, 1]){
        A_viento = w*Math.min(300, 40 + d*22);
        const t = aTiroPerfecto(A_yo, A_el, 1);
        if (!t.alcanza){ fuera++; continue; }
        /* se SIMULA el tiro con la misma integración del juego: comprobar la
           fórmula contra sí misma no probaría nada */
        let x = A_yo.x + 34, y = A_yo.y - A_ALTO*0.62;
        let vx = Math.cos(t.ang)*t.f*A_VMAX, vy = -Math.sin(t.ang)*t.f*A_VMAX;
        let dmin = 1e9;
        for (let i = 0; i < 3000; i++){
          vx += A_viento*dt; vy += A_G*dt; x += vx*dt; y += vy*dt;
          dmin = Math.min(dmin, Math.hypot(x - A_el.x, y - (A_el.y - A_ALTO*0.46)));
          if (y > aSuelo(x) && i > 20) break;
        }
        n++;
        peor = Math.max(peor, dmin);
        if (dmin > 46) malos++;
      }
    }
    A_duelo = gd; A_viento = gv; this.dueloNuevo();
    /* `fuera` son los tiros que NO ENTRAN en el tope del arco. Tiene que ser
       CERO: si el mejor tiro posible no llega, el duelo no se puede ganar y eso
       no se ve como dificultad, se ve como un rival invencible. */
    return JSON.stringify({ casos: n, malos, fuera, peorError: +peor.toFixed(1) });
  },

  ver(){
    return JSON.stringify({
      duelo: A_duelo, rival: A_riv.k, fase: A_fase, turno: A_turno,
      yo: [Math.round(A_yo.x), A_yo.vida], el: [Math.round(A_el.x), A_el.vida],
      viento: Math.round(A_viento), zona: A_ultZona, lento: +A_lento.toFixed(2),
      cam: [Math.round(A_camX), +A_camZ.toFixed(2)],
      flecha: A_flecha ? [Math.round(A_flecha.x), Math.round(A_flecha.y)] : null,
      props: A_props.length, puntos: A_puntos, vivo: this.vivo });
  },
  cfg(o){
    if (o.duelo){ A_duelo = o.duelo; this.dueloNuevo(); }
    if (o.viento != null) A_viento = o.viento;
    if (o.tira) this.tira(0, o.tira[0], o.tira[1]);
    return this.ver();
  }
};

/* ── LA TENSIÓN: DE DÓNDE SALEN EL ÁNGULO Y LA FUERZA ──
   El vector va del dedo AL ARQUERO, o sea al revés del arrastre: tirando hacia
   abajo y a la izquierda, la flecha sale hacia arriba y a la derecha. */
function aTension(){
  if (!A_arrastre) return { ang: 0.7, f: 0 };
  const dx = A_arrastre.x0 - A_arrastre.x, dy = A_arrastre.y0 - A_arrastre.y;
  const d = Math.hypot(dx, dy);
  return { ang: Math.atan2(-dy, Math.abs(dx) < 1 ? 1 : Math.abs(dx))*Math.sign(1),
           f: Math.min(1, d/A_TENSA), dx, dy, d };
}

/* ── EL TIRO PERFECTO, Y LA PRIMERA VERSIÓN ESTABA MAL ──
   Empezó como una bisección sobre el ÁNGULO: para cada ángulo se despejaba la
   velocidad que hacía llegar la flecha al blanco en x, y se miraba si a esa
   altura pasaba por arriba o por abajo. Suena bien y la auditoría lo desmintió:
   **24 casos malos de 60, con un error peor de 1034 unidades**. Dos razones, y
   las dos son de la misma familia — el viento ACOPLA las dos ecuaciones:
     · el tiempo y la velocidad se despejaban uno del otro con un punto fijo de
       seis vueltas, que no converge cuando el viento es fuerte, y
     · la función no es monótona en el ángulo, así que la bisección se queda con
       cualquier cosa aunque el punto fijo hubiera convergido.

   ── LO QUE SÍ FUNCIONA: BUSCAR SOBRE EL TIEMPO DE VUELO ──
   Fijado un tiempo `t`, las dos ecuaciones se DESACOPLAN y las dos tienen
   solución cerrada:
       vx = (dx − w·t²/2)/t        vy = (dy − g·t²/2)/t
   O sea que para CADA `t` hay un tiro exacto que pasa por el blanco: no hay
   nada que resolver, sólo que elegir. Y de todos ellos se toma el de velocidad
   mínima, que además es el que más margen deja contra el tope del arco.
   La velocidad como función de `t` tiene un solo mínimo —para `t` chico hace
   falta mucha vx y para `t` grande mucha vy— así que un barrido grueso y un
   refinado alrededor del mejor alcanzan y sobran.

   Y devuelve `alcanza`: si ni el mejor `t` entra en el tope del arco, el tiro
   NO EXISTE. Eso hay que poder decirlo — sin ese dato, un duelo con los
   arqueros demasiado lejos se vería como un rival que falla siempre. */
function aTiroPerfecto(de, a, s){
  const x0 = de.x + s*34, y0 = de.y - A_ALTO*0.62;
  const bx = a.x, by = a.y - A_ALTO*0.46;     /* se apunta al pecho alto, no a los pies */
  const dx = (bx - x0)*s, dy = by - y0, w = A_viento*s;
  const prueba = (t) => {
    const vx = (dx - w*t*t/2)/t, vy = (dy - A_G*t*t/2)/t;
    /* hacia atrás no es un tiro: la flecha sale del arco hacia adelante */
    if (vx <= 0) return null;
    return { t, vx, vy, v: Math.hypot(vx, vy), ang: Math.atan2(-vy, vx) };
  };
  let mej = null;
  for (let k = 0; k <= 70; k++){
    const c = prueba(0.22 + k*(3.6 - 0.22)/70);
    if (c && (!mej || c.v < mej.v)) mej = c;
  }
  if (!mej) return { ang: 0.8, f: 1, alcanza: false };
  /* el refinado: diez vueltas de sección alrededor del mejor grueso */
  let lo = Math.max(0.16, mej.t - 0.06), hi = mej.t + 0.06;
  for (let k = 0; k < 12; k++){
    const m1 = prueba(lo + (hi - lo)/3), m2 = prueba(hi - (hi - lo)/3);
    if (!m1 || !m2) break;
    if (m1.v < m2.v) hi = m2.t; else lo = m1.t;
    if (m1.v < mej.v) mej = m1;
    if (m2.v < mej.v) mej = m2;
  }
  return { ang: mej.ang, f: Math.min(1, mej.v/A_VMAX),
           alcanza: mej.v <= A_VMAX };
}

/* ── EL CHOQUE, POR SEGMENTO Y CONTRA LAS TRES ZONAS ── */
function aPega(f, dt){
  const quien = f.de === 0 ? 1 : 0;
  const a = quien === 0 ? A_yo : A_el;
  /* el alto del blanco es el MISMO que el del dibujo, y por eso está escrito una
     sola vez: con dos números, la flecha pasaría por encima de una cabeza que se
     ve, o pegaría en un aire que se ve vacío */
  const ax = a.x, base = a.y, alto = A_ALTO, ancho = 46;
  /* el segmento que la flecha recorrió en este paso */
  const px = f.x - f.vx*dt, py = f.y - f.vy*dt;
  for (let i = 1; i <= 6; i++){
    const t = i/6, x = px + (f.x - px)*t, y = py + (f.y - py)*t;
    if (Math.abs(x - ax) > ancho/2) continue;
    const h = (base - y)/alto;
    if (h < 0 || h > 1) continue;
    for (const z of A_ZONAS)
      if (h >= z.alto[0] && h < z.alto[1])
        return { quien, k: z.k, dano: z.dano, col: z.col, x, y };
  }
  return null;
}

function aSiembraProps(){
  A_props.length = 0;
  /* nada entre los dos arqueros a menos de 90 de cada uno: un árbol pegado al
     tirador tapa exactamente el sitio desde el que sale la flecha */
  for (let i = 0; i < 22; i++){
    const x = 40 + aAz()*(A_MUNDO - 80);
    if (Math.abs(x - A_yo.x) < 95 || Math.abs(x - A_el.x) < 95) continue;
    A_props.push({ x, y: aSuelo(x), t: (aAz()*4)|0, e: 0.7 + aAz()*0.6,
                   f: aAz()*6.283 });
  }
}

/* ══════════════════════════ DIBUJO ══════════════════════════ */
function aPinta(g){
  aCam(g);

  /* ── EL SUELO: UNA SOLA FIGURA Y NO UNA COLUMNA POR PÍXEL ──
     Muestreando cada 14 unidades salen unas noventa y cinco, y a este zoom eso
     es medio píxel entre muestra y muestra: por debajo de eso se estarían
     calculando senos para nada. */
  const pat = patron('a_pasto');
  g.beginPath();
  g.moveTo(-320, 4000);
  for (let x = -320; x <= A_MUNDO + 320; x += 14) g.lineTo(x, aSuelo(x));
  g.lineTo(A_MUNDO + 320, 4000);
  g.closePath();
  g.fillStyle = '#3f6b3a'; g.fill();
  if (pat){ g.save(); g.clip(); g.globalAlpha = 0.75; g.fillStyle = pat;
            g.fillRect(-320, 0, A_MUNDO + 640, 4000); g.restore(); }
  /* el labio claro del borde: es lo único que separa el pasto del cielo cuando
     los dos están en penumbra, y cuesta un trazo */
  g.beginPath();
  for (let x = -320; x <= A_MUNDO + 320; x += 14){
    if (x === -320) g.moveTo(x, aSuelo(x)); else g.lineTo(x, aSuelo(x));
  }
  g.strokeStyle = '#7fb85a'; g.lineWidth = 7; g.stroke();

  /* la decoración, ordenada por x para que la de adelante tape a la de atrás */
  for (const p of A_props) aProp(g, p);

  /* ── LA TRAZA DEL TIRO ANTERIOR ──
     Se queda puesta y desvanecida: es lo que convierte «fallé» en «fallé por
     poco y para este lado», o sea la única forma de corregir sin adivinar. */
  if (A_estela.length){
    g.beginPath();
    let n = 0;
    for (const e of A_estela){
      if (e.t <= 0) continue;
      if (n++ === 0) g.moveTo(e.x, e.y); else g.lineTo(e.x, e.y);
    }
    g.strokeStyle = 'rgba(255,246,224,.42)'; g.lineWidth = 4/A_camZ*0.5;
    g.lineCap = 'round'; g.stroke();
  }

  aArquero(g, A_yo, 1, A_turno === 0);
  aArquero(g, A_el, -1, A_turno === 1);
  if (A_flecha) aFlecha(g, A_flecha);

  /* ── LA GUÍA DEL TIRO ──
     Muestra los primeros tramos y NO la parábola entera: con la trayectoria
     completa el juego se resuelve solo y apuntar deja de ser una habilidad. Y
     con nada, un jugador nuevo no tiene forma de entender qué hace el arrastre.
     Ocho tramos son medio segundo de vuelo. */
  if (A_arrastre && A_turno === 0){
    const t = aTension();
    let x = A_yo.x + 34, y = A_yo.y - A_ALTO*0.62;
    let vx = Math.cos(t.ang)*t.f*A_VMAX, vy = -Math.sin(t.ang)*t.f*A_VMAX;
    const h = 0.055;
    g.fillStyle = 'rgba(255,246,224,.75)';
    for (let i = 0; i < 8; i++){
      vx += A_viento*h; vy += A_G*h; x += vx*h; y += vy*h;
      g.globalAlpha = 0.85 - i*0.09;
      g.beginPath(); g.arc(x, y, 7 - i*0.5, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }

  g.restore();

  /* ══ LO QUE VA EN PANTALLA Y NO EN EL MUNDO ══ */
  aBarras(g);
  aViento(g);
  if (A_arrastre && A_turno === 0) aTensor(g);
  if (A_ultT > 0 && A_ultZona){
    const al = Math.min(1, A_ultT/0.4);
    const z = A_ZONAS.find(z => z.k === A_ultZona);
    texto(TX(A_ultZona), AN/2, AL*0.30, A_ultZona === 'cabeza' ? 52 : 40,
          'rgba(' + (z ? hexRGB(z.col) : '201,180,138') + ',' + al.toFixed(2) + ')',
          '800', 'center');
  }
  if (A_fase === 'impacto')
    texto(TX('sigue'), AN/2, AL - 96, 22, 'rgba(242,238,230,.55)', '700', 'center');
}
function hexRGB(h){
  const n = parseInt(h.slice(1), 16);
  return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
}

/* ── EL ARQUERO ──
   Sprite generado si llegó, y si no un muñeco por código. El de código NO es un
   respaldo de compromiso: es lo que se ve el primer cuadro de cada partida
   —una imagen en base64 decodifica de forma asincrónica— así que tiene que ser
   presentable, no un rectángulo. */
function aArquero(g, a, s, activo){
  const alto = A_ALTO;
  g.save();
  g.translate(a.x, a.y);
  g.scale(s, 1);
  /* la sombra de contacto: sin ella el arquero flota sobre la colina */
  g.save();
  g.globalAlpha = 0.32;
  g.beginPath(); g.ellipse(0, 0, 34, 9, 0, 0, 7); g.fillStyle = '#000'; g.fill();
  g.restore();
  if (!dibCuadro('a_arqueros', a.cara % 6, 0, 0, alto)){
    const col = ['#4a8f5a', '#8a94a8', '#5a6b4a', '#c9a05a', '#a85a3c', '#6b5a9a'][a.cara % 6];
    /* piernas, tronco, cabeza: tres piezas y el contorno, que es lo que hace
       que una silueta plana se separe del pasto */
    g.strokeStyle = 'rgba(30,20,14,.55)'; g.lineWidth = 3;
    /* las medidas salen de `A_ALTO` y no son números sueltos: cambiando el alto
       del arquero, el muñeco de respaldo tiene que seguirlo o deja de coincidir
       con el blanco contra el que choca la flecha */
    const H = A_ALTO;
    caja2(-14, -H*0.42, 12, H*0.42, 5, '#3a2d22', 'rgba(30,20,14,.55)');
    caja2(3, -H*0.42, 12, H*0.42, 5, '#3a2d22', 'rgba(30,20,14,.55)');
    caja2(-20, -H*0.83, 40, H*0.44, 11, col, 'rgba(30,20,14,.55)');
    disco(2, -H*0.92, H*0.13, '#e8b48a');
    g.beginPath(); g.arc(2, -H*0.92, H*0.13, 0, 7); g.stroke();
  }
  /* el arco: se tensa de verdad cuando le toca, o sea que la cuerda dice cuánta
     fuerza lleva el tiro sin escribir un número */
  const t = (activo && A_arrastre && A_turno === 0) ? aTension().f : 0.12;
  g.save();
  g.translate(28, -A_ALTO*0.62);
  g.strokeStyle = '#8a6134'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.arc(0, 0, 34, -1.15, 1.15); g.stroke();
  g.strokeStyle = 'rgba(255,246,224,.85)'; g.lineWidth = 2;
  g.beginPath();
  g.moveTo(34*Math.cos(-1.15), 34*Math.sin(-1.15));
  g.lineTo(-t*26, 0);
  g.lineTo(34*Math.cos(1.15), 34*Math.sin(1.15));
  g.stroke();
  g.restore();
  g.restore();
  /* el aro del que tira: sin él, en una pantalla con dos arqueros iguales no
     hay forma de saber de quién es el turno sin leer la ficha del HUD */
  if (activo){
    const la = 0.5 + 0.3*Math.sin(performance.now()*0.005);
    g.save();
    g.globalAlpha = la;
    g.strokeStyle = '#ffd76a'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(a.x, a.y + 2, 44, 13, 0, 0, 7); g.stroke();
    g.restore();
  }
}

function aFlecha(g, f){
  g.save();
  g.translate(f.x, f.y);
  g.rotate(f.gi);
  caja2(-30, -2.5, 46, 5, 2, '#c9a06a', null);
  g.fillStyle = '#e8e2d4';
  g.beginPath(); g.moveTo(24, 0); g.lineTo(10, -7); g.lineTo(10, 7);
  g.closePath(); g.fill();
  g.fillStyle = '#c94a3c';
  g.beginPath(); g.moveTo(-30, 0); g.lineTo(-18, -7); g.lineTo(-14, 0);
  g.lineTo(-18, 7); g.closePath(); g.fill();
  g.restore();
}

function aProp(g, p){
  g.save();
  g.translate(p.x, p.y);
  g.scale(p.e, p.e);
  /* el meneo del viento: el mismo número que empuja la flecha mueve los
     árboles, así que el jugador puede LEER el viento en la escena y no sólo en
     el indicador — que es lo que lo vuelve un dato del mundo y no del HUD */
  const w = A_viento/300;
  if (p.t === 0){
    if (!dibCuadro('a_cosas', 2, 0, 0, 96)){
      caja2(-6, -42, 12, 42, 4, '#5a4028', null);
      g.save(); g.rotate(w*0.10 + Math.sin(performance.now()*0.0011 + p.f)*0.03);
      disco(0, -58, 30, '#3f7a3a'); disco(-16, -46, 20, '#4a8f42');
      disco(17, -48, 18, '#357030');
      g.restore();
    }
  } else if (p.t === 1){
    if (!dibCuadro('a_cosas', 3, 0, 0, 46)){
      g.fillStyle = '#8a8478';
      g.beginPath(); g.ellipse(0, -14, 26, 16, 0, 0, 7); g.fill();
    }
  } else if (p.t === 2){
    if (!dibCuadro('a_cosas', 4, 0, 0, 42))
      caja2(-15, -34, 30, 34, 6, '#7a5230', 'rgba(30,20,14,.5)');
  } else {
    /* matas de pasto alto: se inclinan con el viento y son lo más barato que
       hay para que la colina no sea una franja lisa */
    g.save();
    g.rotate(w*0.34 + Math.sin(performance.now()*0.0017 + p.f)*0.06);
    g.strokeStyle = '#6ba84e'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = -2; i <= 2; i++){
      g.beginPath(); g.moveTo(i*5, 0);
      g.quadraticCurveTo(i*7, -14, i*9 + 6, -26);
      g.stroke();
    }
    g.restore();
  }
  g.restore();
}

/* ── LAS BARRAS DE VIDA VAN EN PANTALLA Y NO SOBRE LA CABEZA ──
   Sobre la cabeza serían del mundo, o sea que encogerían con el zoom justo
   cuando la cámara se aleja para encuadrar a los dos — y ahí es cuando hay que
   leerlas. Arriba, y con la cara al lado para saber cuál es cuál. */
function aBarras(g){
  /* ── Y VAN A 0,115 Y NO A 0,075 ──
     Ahí arriba está el nombre del rival, que lo escribe el HUD del núcleo: se
     pisaban, y medido en la captura «EL NOVATO» salía partido por las dos
     barras. Un solapamiento con el HUD no lo puede ver `solapes()`, porque esto
     se dibuja en el lienzo y aquello en el DOM. */
  const w = AN*0.36, h = 22, y = AL*0.115;
  for (const [a, x, col, esp] of [[A_yo, 26, '#7fe08a', false],
                                  [A_el, AN - 26 - w, '#ff6a5a', true]]){
    caja2(x, y, w, h, 11, 'rgba(12,10,8,.72)', 'rgba(255,255,255,.18)');
    const u = Math.max(0, a.vida/a.max);
    if (u > 0) caja2(x + 2, y + 2, Math.max(h - 4, (w - 4)*u), h - 4, 9, col, null);
    texto(Math.round(a.vida), x + w/2, y + h/2 + 1, 14, '#12100a', '800', 'center');
    /* ── Y LA CARA VA DEBAJO DE LA BARRA, NO AL COSTADO ──
       Al costado quedaba en `x − 22` = 4 y en `AN − 4`, o sea MITAD AFUERA del
       cuadro por los dos lados: medido en la captura, dos figuras cortadas
       pegadas a los bordes. Debajo entra entera y no tapa el numero. */
    dibCuadro('a_arqueros', a.cara % 6, esp ? AN - 32 : 32, y + h + 46, 44, esp);
  }
}

/* ── EL VIENTO: UNA FLECHA Y UNA BANDERA ──
   El número solo no dice nada —«120» no se compara con nada— y la bandera sola
   no dice cuánto. Las dos juntas sí: la flecha da el sentido y la fuerza de un
   vistazo y la bandera lo confirma en la escena. */
function aViento(g){
  const y = AL*0.055, k = A_viento/300;
  texto(TX('vientoC'), AN/2, y - 16, 13, 'rgba(242,238,230,.45)', '700', 'center');
  g.save();
  g.translate(AN/2, y + 8);
  g.strokeStyle = 'rgba(255,255,255,.20)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-92, 0); g.lineTo(92, 0); g.stroke();
  const L = k*88;
  g.strokeStyle = Math.abs(k) > 0.55 ? '#ff8a5c' : '#8ad7ff';
  g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(L, 0); g.stroke();
  if (Math.abs(L) > 6){
    const s = Math.sign(L);
    g.beginPath();
    g.moveTo(L, 0); g.lineTo(L - s*13, -8); g.moveTo(L, 0); g.lineTo(L - s*13, 8);
    g.stroke();
  }
  g.restore();
}

/* ── EL TENSOR: LO QUE SE VE MIENTRAS SE ARRASTRA ──
   Va en PANTALLA y no en el mundo porque es el dedo: dibujado en el mundo, el
   zoom lo cambiaría de tamaño y el mismo arrastre se vería distinto según lo
   lejos que estén los arqueros. */
function aTensor(g){
  const t = aTension();
  const a = A_arrastre;
  g.save();
  g.strokeStyle = 'rgba(255,246,224,.35)'; g.lineWidth = 3;
  g.setLineDash([10, 8]);
  g.beginPath(); g.moveTo(a.x0, a.y0); g.lineTo(a.x, a.y); g.stroke();
  g.setLineDash([]);
  g.restore();
  /* el aro de fuerza: se llena y cambia de color al llegar al tope, que es lo
     que dice «más no hay» sin escribirlo */
  const r = 46;
  g.save();
  g.translate(a.x, a.y);
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 7;
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
  g.strokeStyle = t.f >= 0.995 ? '#ff8a5c' : '#ffd76a';
  g.beginPath(); g.arc(0, 0, r, -Math.PI/2, -Math.PI/2 + t.f*6.283); g.stroke();
  texto(Math.round(t.ang*57.3) + '°', 0, 2, 20, '#f2eee6', '800', 'center');
  g.restore();
}

/* la cinemática usa el juego de verdad, así que lo que se ve en la escena es
   exactamente lo que se ve jugando */
function aDemo(g, u, plano){
  const gd = A_duelo, gf = A_fase, gt = A_turno, ga = A_arrastre;
  const gfl = A_flecha, gv = A_viento, gz = A_ultZona, gzt = A_ultT;
  A_duelo = plano === 2 ? 4 : 1;
  JUEGO.dueloNuevo();
  A_viento = plano === 1 ? 240 : 60;
  A_camX = (A_yo.x + A_el.x)/2;
  /* el mismo encuadre que en partida, y no una copia con otros numeros: con
     320 de margen la cinematica mostraba arqueros mas chicos que el juego */
  A_camZ = Math.max(0.46, Math.min(1.05, AN/(Math.abs(A_el.x - A_yo.x) + 170)));
  if (plano === 0){
    /* se ve el arrastre: es el verbo entero del juego y no se puede contar con
       una frase */
    const d = 40 + u*200;
    A_arrastre = { x0: AN*0.30, y0: AL*0.62,
                   x: AN*0.30 - d*0.86, y: AL*0.62 + d*0.5 };
  } else if (plano === 1){
    A_arrastre = null;
    A_fase = 'vuela';
    const t = aTiroPerfecto(A_yo, A_el, 1);
    A_flecha = { x: A_yo.x + 34, y: A_yo.y - A_ALTO*0.62,
                 vx: Math.cos(t.ang)*t.f*A_VMAX, vy: -Math.sin(t.ang)*t.f*A_VMAX,
                 gi: 0, de: 0 };
    /* se adelanta la simulación hasta el instante `u`: la cinemática es una
       función del tiempo, así que el plano tiene que poder pintarse en
       cualquier momento sin haber corrido los anteriores */
    const dt = 1/120, T = u*1.15;
    A_estela.length = 0;
    for (let s = 0; s < T; s += dt){
      A_flecha.vx += A_viento*dt; A_flecha.vy += A_G*dt;
      A_flecha.x += A_flecha.vx*dt; A_flecha.y += A_flecha.vy*dt;
      A_estela.push({ x: A_flecha.x, y: A_flecha.y, t: 0.5 });
    }
    A_flecha.gi = Math.atan2(A_flecha.vy, A_flecha.vx);
    A_camX = A_flecha.x; A_camZ = 0.86;
  } else {
    A_arrastre = null; A_flecha = null;
    A_el.vida = A_el.max*0.34;
    A_ultZona = 'cabeza'; A_ultT = 1.4;
  }
  aPinta(g);
  A_duelo = gd; A_fase = gf; A_turno = gt; A_arrastre = ga;
  A_flecha = gfl; A_viento = gv; A_ultZona = gz; A_ultT = gzt;
}
