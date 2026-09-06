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
/* ── LAS FLECHAS CLAVADAS SE QUEDAN, Y ES LO MÁS BARATO QUE HAY ──
   Cuesta tres números por flecha y convierte el valle en el registro del duelo:
   al quinto turno se ve dónde vino fallando cada uno. Y no es sólo adorno —un
   racimo de flechas a la izquierda del rival dice «me quedé corto» mejor que
   cualquier cartel. */
let A_clav = [];
/* ── EL ESTADO DE ANIMACIÓN VIVE EN EL ARQUERO Y SE PONE POR UNA SOLA PUERTA ──
   Con la animación decidida en el sitio donde se dibuja, cada rama del juego
   tendría que acordarse de todas las demás: el que acaba de recibir un flechazo
   y el que está tensando se pisarían. Acá `aPon` es la única que escribe. */
function aPon(a, nom, extra){
  if (a.anim === nom && nom !== 'golpe') return;
  a.anim = nom; a.at = 0; a.zona = extra || a.zona;
}
function aPaso(a, dt){ a.at = (a.at || 0) + dt; }

let A_azar = 5;
function aAz(){ A_azar = (A_azar*1664525 + 1013904223) >>> 0; return A_azar / 4294967296; }

/* ══════════ EL TERRENO ══════════
   Una función del x y no una lista de puntos: así el suelo se puede consultar
   en cualquier sitio —para apoyar un árbol, para saber si la flecha se clavó—
   sin buscar en un array.

   ── Y AHORA SE SIEMBRA POR DUELO, QUE ES LO QUE FALTABA ──
   Era una suma de tres senos FIJA: los doce duelos ocurrían en el mismo valle
   con los arqueros un poco más lejos cada vez, así que el mapa no era parte del
   juego, era un fondo. Ahora cada duelo tiene su perfil, su loma y sus cráteres.

   ── LA LOMA DEL MEDIO ES LA QUE CONVIERTE «APUNTAR» EN «ELEGIR EL ARCO» ──
   Sin nada en el medio, el tiro tenso y bajo es SIEMPRE el mejor: llega antes,
   el viento lo desvía menos y la parábola casi no importa. Con una loma
   enfrente hay que levantarlo, y ahí el ángulo pasa a ser una decisión en vez
   de un número que se encuentra una vez. Sale sólo en seis de cada diez duelos,
   porque una loma siempre presente vuelve a ser una constante.

   ── Y LAS DOS MESETAS NO SON ADORNO ──
   El suelo debajo de cada arquero se aplana. Sin eso, uno de los dos puede
   quedar en una pendiente y su tiro sale con otra altura de partida sin que
   nada lo diga; y peor, los pies se le hunden de un lado. */
let A_terr = null;

function aTerrSiembra(){
  A_terr = { a: [], cr: [], mes: [], loma: null };
  for (let i = 0; i < 4; i++)
    A_terr.a.push({ f: 2.4 + i*3.3 + aAz()*1.6,
                    a: (92/(1 + i*1.25))*(0.55 + aAz()*0.9),
                    d: aAz()*6.283 });
  if (aAz() < 0.62)
    A_terr.loma = { x: 0.36 + aAz()*0.28, h: 70 + aAz()*140,
                    w: 0.085 + aAz()*0.075 };
}

function aBase(x){
  if (!A_terr) return 300;
  const u = x/A_MUNDO;
  let y = 300;
  for (const s of A_terr.a) y += Math.sin(u*s.f + s.d)*s.a;
  if (A_terr.loma){
    const d = (u - A_terr.loma.x)/A_terr.loma.w;
    y -= A_terr.loma.h*Math.exp(-d*d);
  }
  return y;
}

function aSuelo(x){
  if (!A_terr) return 300;
  let y = aBase(x);
  for (const m of A_terr.mes){
    const d = (x - m.x)/m.w;
    const k = Math.exp(-d*d*2.2);
    y = y*(1 - k) + m.y*k;
  }
  /* ── LOS CRÁTERES: EL VALLE SE ACUERDA DE LOS TIROS ──
     Cada flecha que se clava en el suelo deja su marca, y las marcas se
     acumulan a lo largo del duelo. No cambia el juego —son quince unidades—
     pero es lo único que distingue el minuto ocho del minuto uno. */
  for (const c of A_terr.cr){
    const d = (x - c.x)/c.r;
    if (d > -1 && d < 1) y += c.d*(1 - d*d);
  }
  return y;
}

function aCrater(x, d){
  A_terr.cr.push({ x, r: 26 + Math.random()*16, d });
  if (A_terr.cr.length > 40) A_terr.cr.shift();
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
/* ── EL ANCLA DE LA CÁMARA, EN CONSTANTES Y NO EN NÚMEROS SUELTOS ──
   `aCam` y `aAMundo` son la misma transformación y su inversa, así que un
   número cambiado en una y no en la otra hace que el dedo apunte a un sitio
   distinto del que se ve — y eso no falla, contesta mal. */
const A_ANCLA_Y = 0.82, A_OJO = 30;
let A_camY = 0, A_camMY = 0;

function aCam(g){
  g.save();
  g.translate(AN/2, AL*A_ANCLA_Y);
  g.scale(A_camZ, A_camZ);
  g.translate(-A_camX, -(aSuelo(A_camX) - A_OJO + A_camY));
}

/* ══════════ EL ZOOM SE ATA A LA TENSIÓN, Y ESO ES EL CAMBIO GRANDE ══════════
   Antes la cámara encuadraba a los dos arqueros TODO el turno: el resultado
   medido es que cada uno ocupaba noventa píxeles de una pantalla de ochocientos
   noventa, o sea que el personaje del juego era una calcomanía y no había nada
   que mirar mientras se apuntaba.

   Ahora arranca ENCIMA del que tira —se le ve tensar el arco, que es lo único
   que pasa en ese momento— y se aleja a medida que se tensa, hasta encuadrar a
   los dos con el arco al tope. Y eso no es una decisión estética: la
   información que uno necesita ver crece con la fuerza del tiro. Con poca
   tensión la flecha cae cerca y alcanza con ver el propio arquero; con el arco
   al tope hay que ver el otro extremo del valle. El zoom muestra exactamente lo
   que el tiro va a usar.

   Y al impactar se ACERCA sobre el punto del golpe: es el único cuadro que
   importa de todo el turno y hasta ahora pasaba en un plano general. */
function aZoomLejos(){
  const ancho = Math.abs(A_el.x - A_yo.x) + 260;
  return Math.max(0.44, Math.min(1.05, AN/ancho));
}
function aCamMeta(){
  const zl = aZoomLejos();
  if (A_fase === 'vuela' && A_flecha){
    /* siguiendo la flecha se acerca, pero NO se pega: con el zoom al tope la
       flecha llena la pantalla y no se ve hacia dónde va */
    A_camMX = A_flecha.x;
    A_camMZ = Math.min(0.92, zl + 0.30);
    /* y la sigue TAMBIÉN en alto, porque una parábola que sale del cuadro por
       arriba es un tiro que el jugador no ve */
    A_camMY = Math.min(0, (A_flecha.y - aSuelo(A_flecha.x)) + AL*0.30/A_camZ);
  } else if (A_fase === 'impacto' && A_flecha){
    A_camMX = A_flecha.x;
    A_camMZ = Math.min(1.30, zl + 0.62);
    A_camMY = Math.min(0, (A_flecha.y - aSuelo(A_flecha.x)) + AL*0.26/A_camZ);
  } else {
    const tira = A_turno === 0 ? A_yo : A_el;
    const k = (A_turno === 0 && A_arrastre) ? aTension().f : 0;
    /* de cerca del que tira hasta encuadrar a los dos, gobernado por la tensión */
    const zc = Math.min(1.42, zl + 0.72);
    A_camMZ = zc + (zl - zc)*k;
    const medio = (A_yo.x + A_el.x)/2;
    A_camMX = tira.x + (medio - tira.x)*k;
    A_camMY = -A_ALTO*0.20*(1 - k*0.55);
  }
}
function aCamPaso(dt){
  aCamMeta();
  /* el seguimiento va con constante de tiempo y no lineal: lineal se ve a
     cámara motorizada, y con resorte se ve a alguien apuntando la cámara. Y el
     zoom sigue MÁS LENTO que el paneo: cambiando los dos a la misma velocidad,
     soltar el arco da un tirón que marea. */
  const k = Math.min(1, dt*(A_fase === 'vuela' ? 7 : 4.2));
  const kz = Math.min(1, dt*(A_fase === 'vuela' ? 4.5 : 3.0));
  A_camX += (A_camMX - A_camX)*k;
  A_camY += (A_camMY - A_camY)*k;
  A_camZ += (A_camMZ - A_camZ)*kz;
}
/* de pantalla a mundo: hace falta para saber dónde tocó el dedo */
function aAMundo(px, py){
  return { x: (px - AN/2)/A_camZ + A_camX,
           y: (py - AL*A_ANCLA_Y)/A_camZ + aSuelo(A_camX) - A_OJO + A_camY };
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
    /* ── EL ORDEN IMPORTA: PRIMERO EL PERFIL, DESPUÉS LAS MESETAS ──
       La altura de una meseta es la del terreno SIN meseta en ese punto; si se
       midiera después, la cuenta se estaría preguntando por sí misma. */
    aTerrSiembra();
    A_terr.mes = [{ x: A_yo.x, w: 105, y: aBase(A_yo.x) },
                  { x: A_el.x, w: 105, y: aBase(A_el.x) }];
    A_yo.y = aSuelo(A_yo.x); A_el.y = aSuelo(A_el.x);
    A_yo.pal = 0; A_el.pal = A_duelo % A_PAL.length;
    A_yo.anim = 'quieto'; A_el.anim = 'listo'; A_clav.length = 0;
    A_yo.at = 0; A_el.at = 0;
    A_yo.vida = A_yo.max = A_VIDA + Math.min(40, A_rachaG*8);
    A_el.vida = A_el.max = A_riv.vida;
    A_el.cara = A_riv.cara;
    A_turno = 0;
    aSiembraProps();
    this.turnoNuevo();
    A_camX = A_yo.x; A_camZ = aZoomLejos(); A_camY = 0;
  },
  turnoNuevo(){
    A_fase = 'apunta'; A_t = 0; A_flecha = null; A_estela.length = 0;
    A_arrastre = null;
    if (A_yo.vida > 0) aPon(A_yo, A_turno === 0 ? 'apunta' : 'quieto');
    if (A_el.vida > 0) aPon(A_el, A_turno === 1 ? 'apunta' : 'listo');
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
    aPaso(A_yo, dtm); aPaso(A_el, dtm);
    /* ── LAS ANIMACIONES DE UNA SOLA PASADA VUELVEN SOLAS AL REPOSO ──
       Sin esto, el que recibió un flechazo se queda en la pose del golpe el
       resto del duelo: `golpe` dura medio segundo y después hay que volver a
       estar de pie. `muere` no vuelve, que para eso es. */
    for (const a of [A_yo, A_el]){
      if (a.vida <= 0){ if (a.anim !== 'muere') aPon(a, 'muere'); continue; }
      if ((a.anim === 'golpe' && a.at > 0.62) || (a.anim === 'suelta' && a.at > 0.50))
        aPon(a, a === A_yo ? 'quieto' : 'listo');
    }

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
      /* ── EL RIVAL SE BURLA MIENTRAS APUNTA, Y NO SIEMPRE ──
         Es lo unico que lo separa de una torreta: espera lo mismo, tira igual,
         pero cada tanto levanta el arco y te mira. Una de cada tres veces,
         porque una burla en cada turno deja de ser una burla. */
      if (A_el.anim === 'apunta' && A_t > A_sacIA*0.35 && A_sacIA > 1.1
          && (A_duelo + A_t*100 | 0) % 3 === 0) aPon(A_el, 'burla');
      if (A_el.anim === 'burla' && A_el.at > 0.9) aPon(A_el, 'apunta');
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
    aPon(a, 'suelta');
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
      /* ── EL CUERPO REACCIONA, Y REACCIONA DISTINTO SEGÚN DÓNDE ──
         Con una sola pose de golpe, acertarle a la cabeza y acertarle al pie se
         ven igual, y este juego se trata justamente de elegir a qué apuntarle. */
      aPon(vic, vic.vida <= 0 ? 'muere' : 'golpe', z.k);
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
      /* clavada en el suelo: deja su marca */
      if (f.y >= aSuelo(f.x) - 8) aCrater(f.x, 9 + Math.random()*7);
    }
    /* la flecha se queda clavada un instante: desapareciendo en el cuadro del
       golpe, el jugador no llega a ver DÓNDE pegó */
    A_flecha.clavada = true;
    /* y después se queda en el valle. Doce y no más: pasadas doce, el suelo se
       vuelve un peine y deja de decir nada. */
    if (Math.abs(f.x) < A_MUNDO + 200){
      A_clav.push({ x: f.x, y: Math.min(f.y, aSuelo(f.x) + 6), gi: f.gi });
      if (A_clav.length > 12) A_clav.shift();
    }
  },

  cambiaTurno(){
    if (A_el.vida <= 0){
      aPon(A_yo, 'gana');
      A_rachaG++;
      A_puntos += sumaPuntos(200 + A_duelo*40 + A_yo.vida*2, AN/2, AL*0.36);
      son('gana', 1); destella('#ffd76a', 1.0);
      A_duelo++;
      if (A_duelo > A_RIV.length){ this.gano = true; this.vivo = false; return; }
      this.dueloNuevo();
      return;
    }
    if (A_yo.vida <= 0){ aPon(A_yo, 'pierde'); son('pierde'); this.vivo = false; return; }
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
  mueve(px, py){
    if (!A_arrastre) return;
    A_arrastre.x = px; A_arrastre.y = py;
    aPon(A_yo, 'tensa');
  },
  sube(){
    if (!A_arrastre || A_fase !== 'apunta' || A_turno !== 0){ A_arrastre = null; return; }
    const t = aTension();
    A_arrastre = null;
    if (t.f < 0.10){ aPon(A_yo, 'apunta'); return; }   /* un toque no es un tiro */
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

  ver(){
    return JSON.stringify({
      duelo: A_duelo, rival: A_riv.k, fase: A_fase, turno: A_turno,
      yo: [Math.round(A_yo.x), Math.round(A_yo.vida)],
      el: [Math.round(A_el.x), Math.round(A_el.vida)],
      anim: [A_yo.anim, +(A_yo.at || 0).toFixed(2), A_el.anim],
      viento: Math.round(A_viento), zona: A_ultZona,
      cam: [Math.round(A_camX), +A_camZ.toFixed(2), Math.round(A_camY)],
      loma: A_terr && A_terr.loma ? Math.round(A_terr.loma.h) : 0,
      crat: A_terr ? A_terr.cr.length : 0,
      flecha: A_flecha ? [Math.round(A_flecha.x), Math.round(A_flecha.y)] : null,
      props: A_props.length, puntos: A_puntos, vivo: this.vivo });
  },

  /* ── CUÁNTAS POSES HAY DE VERDAD, CONTADAS Y NO ESTIMADAS ──
     Se muestrea cada animación y se arma el vector de los once ángulos más los
     tres corrimientos; dos muestras cuentan como la misma pose sólo si los
     catorce números coinciden a la milésima. Es la única forma honesta de decir
     un número: «tiene diez animaciones» no dice nada, y «trescientos sprites»
     sería falso porque no hay trescientos archivos, hay una función. */
  poses(m){
    const n = m || 40;
    const nom = ['quieto','listo','apunta','tensa','suelta','golpe','muere',
                 'gana','pierde','burla'];
    const vis = new Set();
    const det = [];
    for (const k of nom){
      const propio = new Set();
      for (let i = 0; i < n; i++){
        const u = i/(n - 1);
        /* cada animación se muestrea sobre lo que la gobierna: las cíclicas
           sobre su período, las de una pasada sobre su duración, y las que
           dependen del juego sobre SU parámetro — con el tiempo solo, `tensa`
           daría una pose repetida cuarenta veces */
        const e = {};
        /* ── CADA UNA SE MUESTREA SOBRE SU PROPIA DURACION ──
           Con una ventana comun de 1,6 s, las de una pasada terminan a la
           mitad y el resto de las muestras son la misma pose repetida: medido,
           `suelta` daba 11 poses distintas de 40 y `pierde` 21. El numero no
           era del rig, era de la sonda. */
        const dur = { suelta: 0.42, golpe: 0.55, muere: 0.95, gana: 0.60,
                      pierde: 0.80 }[k];
        let t = dur ? u*dur : u*10;
        if (k === 'tensa' || k === 'apunta'){ e.k = u; e.ang = -0.15 - u*1.05; t = u*2; }
        if (k === 'suelta') e.ang = -0.15 - u*1.05;
        if (k === 'golpe') e.zona = ['cabeza','pecho','piernas'][i % 3];
        const p = aAnim(k, t, e);
        const v = ['torso','cabeza','cuello','braF','antF','braN','antN',
                   'musF','pieF','musN','pieN','dx','dy','tensa']
                  .map(q => (p[q] || 0).toFixed(3)).join('|');
        vis.add(v); propio.add(v);
      }
      det.push([k, propio.size]);
    }
    return JSON.stringify({ animaciones: nom.length, muestras: n,
                            poses: vis.size, porAnim: det });
  },

  /* ── LA AUDITORÍA: QUE EN LOS DOCE DUELOS EXISTA UN TIRO QUE ENTRE ──
     El terreno pasó a tener una loma en el medio, y una loma alta de más deja
     un duelo en el que NO se le puede pegar al rival hicieras lo que hicieras.
     Se barre ángulo por potencia contra el terreno de verdad y se cuenta en qué
     fracción de los tiros la flecha llega: cero es un duelo imposible. */
  audita(){
    const malos = [];
    let minV = 9, maxV = 0;
    const gd = A_duelo, gy = A_yo.x, ge = A_el.x, gt = A_terr, gv = A_viento;
    for (let d = 1; d <= A_RIV.length; d++){
      A_duelo = d; this.dueloNuevo();
      A_viento = 0;
      let ok = 0, tot = 0;
      for (let ia = 0; ia < 24; ia++){
        for (let ip = 0; ip < 16; ip++){
          const ang = 0.08 + ia*(1.30/23), f = 0.30 + ip*(0.70/15);
          tot++;
          if (aVuela(A_yo, 1, ang, f)) ok++;
        }
      }
      const q = ok/tot;
      if (ok === 0) malos.push([d, 'sin tiro posible']);
      /* ── Y QUE EL TIRO PERFECTO SEA PERFECTO ──
         Es la otra propiedad que este juego necesita y no se puede mirar: si la
         solución de la parábola está mal, el rival falla siempre y el jugador
         no tiene con qué comparar. Se prueba con los dos sentidos del viento,
         porque el viento entra en la cuenta. */
      for (const w of [-Math.min(300, 40 + d*22), 0, Math.min(300, 40 + d*22)]){
        A_viento = w;
        const t1 = aTiroPerfecto(A_yo, A_el, 1);
        if (!aVuela(A_yo, 1, t1.ang, t1.f)) malos.push([d, 'el tiro perfecto falla con viento ' + Math.round(w)]);
        const t2 = aTiroPerfecto(A_el, A_yo, -1);
        if (!aVuela(A_el, -1, t2.ang, t2.f)) malos.push([d, 'el rival no puede acertar con viento ' + Math.round(w)]);
      }
      A_viento = 0;
      minV = Math.min(minV, q); maxV = Math.max(maxV, q);
    }
    A_duelo = gd; A_yo.x = gy; A_el.x = ge; A_terr = gt; A_viento = gv;
    this.dueloNuevo();
    return JSON.stringify({ duelos: A_RIV.length, malos, nMalos: malos.length,
                            ventana: [+minV.toFixed(3), +maxV.toFixed(3)] });
  },

  cfg(o){
    if (o.poses) return this.poses(o.poses === true ? 40 : o.poses);
    if (o.anim) aPon(o.quien === 1 ? A_el : A_yo, o.anim, o.zona);
    if (o.at != null){ (o.quien === 1 ? A_el : A_yo).at = o.at; }
    if (o.duelo){ A_duelo = o.duelo; this.dueloNuevo(); }
    if (o.tira) this.tira(0, o.tira[0], o.tira[1]);
    if (o.pasos) for (let i = 0; i < o.pasos; i++) this.paso(1/60);
    return this.ver();
  }
};

/* ── UN TIRO SIMULADO CONTRA EL TERRENO DE VERDAD ──
   La misma física del juego, sin dibujar: es lo que le permite a la auditoría
   preguntar «¿existe un tiro que entre?» en vez de suponerlo. Y usa `aPega`,
   que es la misma prueba de choque con la que se juega — con dos cuentas, la
   auditoría aprobaría un juego que no existe. */
function aVuela(de, s, ang, f){
  const v = Math.max(0.12, Math.min(1, f))*A_VMAX;
  const fl = { x: de.x + s*34, y: de.y - A_ALTO*0.62,
               vx: Math.cos(ang)*v*s, vy: -Math.sin(ang)*v, gi: 0, de: s > 0 ? 0 : 1 };
  const h = 1/240;
  for (let i = 0; i < 1400; i++){
    fl.vx += A_viento*h; fl.vy += A_G*h;
    fl.x += fl.vx*h; fl.y += fl.vy*h;
    if (aPega(fl, h)) return true;
    if (fl.y > aSuelo(fl.x)) return false;
    if (fl.x < -260 || fl.x > A_MUNDO + 260 || fl.y > 3000) return false;
  }
  return false;
}

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
    if (Math.abs(x - A_yo.x) < 155 || Math.abs(x - A_el.x) < 155) continue;
    /* ── LA PROFUNDIDAD SE SIEMBRA, NO SE DIBUJA ──
       Un tercio de la decoracion va DETRAS —mas chica, lavada y corrida hacia
       el fondo— y el resto adelante. Con todo al mismo plano, veintidos objetos
       del mismo tamano se leen a una fila, que es lo que se veia. */
    const atras = aAz() < 0.38;
    A_props.push({ x, y: aSuelo(x), t: (aAz()*6)|0,
                   e: atras ? 0.34 + aAz()*0.20 : 0.62 + aAz()*0.55,
                   z: atras, f: aAz()*6.283 });
  }
  /* los de atras primero: el pintor los tapa con los de adelante */
  A_props.sort((a, b) => (a.z === b.z ? 0 : (a.z ? -1 : 1)));
}

/* ══════════════════════════ DIBUJO ══════════════════════════ */
function aPinta(g){
  aCam(g);

  /* ── EL SUELO: UNA SOLA FIGURA Y NO UNA COLUMNA POR PÍXEL ──
     Muestreando cada 14 unidades salen unas noventa y cinco, y a este zoom eso
     es medio píxel entre muestra y muestra: por debajo de eso se estarían
     calculando senos para nada. */
  /* ── LA ARBOLEDA DE ATRÁS, A MEDIA VELOCIDAD ──
     Va antes que todo lo demás y se mueve la mitad que el valle. Sin una capa
     intermedia, entre la foto del cielo —que está clavada— y el suelo no hay
     nada, y el valle se lee a un decorado plano por muy bien pintado que esté
     el fondo. */
  aArboleda(g);

  /* ── EL SUELO VA EN TRES CAPAS Y NO EN UN RELLENO VERDE ──
     Era `fillStyle = '#3f6b3a'` con la foto de pasto encima: medido en la
     captura, la parte de abajo de la pantalla era una banda verde plana que no
     pertenecía ni al valle de la foto ni al juego. Ahora hay roca abajo, tierra
     con su veta en el medio y el pasto arriba, y el borde entre las capas es lo
     que le da espesor al terreno. */
  const cont = [];
  for (let x = -340; x <= A_MUNDO + 340; x += 12) cont.push([x, aSuelo(x)]);
  const tapa = (dy, col, pat, alfa) => {
    g.beginPath();
    g.moveTo(cont[0][0], cont[0][1] + dy);
    for (const c of cont) g.lineTo(c[0], c[1] + dy);
    g.lineTo(A_MUNDO + 340, 5000); g.lineTo(-340, 5000);
    g.closePath();
    g.fillStyle = col; g.fill();
    if (pat){ g.save(); g.clip(); g.globalAlpha = alfa; g.fillStyle = pat;
              g.fillRect(-340, -200, A_MUNDO + 680, 5200); g.restore(); }
  };
  /* ── Y EL ORDEN ES DE ARRIBA HACIA ABAJO, QUE ES AL REVES DE LO QUE UNO
     ESCRIBE ── Cada capa rellena desde su contorno HASTA EL FONDO, asi que la
     ultima dibujada tapa a todas las anteriores. Dibujando la roca primero y el
     pasto ultimo —que es el orden «de atras hacia adelante» que uno escribe sin
     pensar— lo unico que se ve es pasto: medido en la captura, el terreno era
     otra vez una banda verde plana. Se dibuja el pasto PRIMERO y las capas de
     abajo encima, corridas hacia abajo, y ahi cada una deja ver su franja. */
  tapa(0, '#3f6b3a', patron('a_pasto'), 0.75);            /* el pasto */
  tapa(A_ALTO*0.055, '#6b5334', patron('k_terr'), 0.62);  /* la tierra */
  tapa(A_ALTO*0.170, '#5a4636', patron('k_terr'), 0.34);  /* la roca del fondo */
  /* el labio claro del borde: es lo único que separa el pasto del cielo cuando
     los dos están en penumbra, y cuesta un trazo */
  g.beginPath();
  for (let i = 0; i < cont.length; i++){
    if (i === 0) g.moveTo(cont[i][0], cont[i][1]); else g.lineTo(cont[i][0], cont[i][1]);
  }
  g.strokeStyle = '#6ea34e'; g.lineWidth = 6; g.stroke();

  /* la decoración, ordenada por x para que la de adelante tape a la de atrás */
  for (const p of A_props) aProp(g, p);
  /* ── LAS CLAVADAS SE ENDEREZAN PARA QUE SE LEAN ──
     Una flecha que llega rasante se clava rasante, que es lo correcto y a esta
     escala se ve como un triangulito blanco tirado en el pasto. Se les fuerza
     un minimo de inclinacion: es mentira fisica de treinta grados a cambio de
     que se lean a flechas clavadas, que es todo lo que tienen que hacer. */
  for (const c of A_clav){
    const gi = Math.max(0.62, Math.min(1.35, Math.abs(c.gi)))*(c.gi < 0 ? -1 : 1);
    aFlecha(g, { x: c.x, y: c.y, gi }, 0.66);
  }

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
  aBrujula(g);
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

/* ══════════════════════════════ EL ARQUERO ══════════════════════════════
   ── EL PERSONAJE DEJA DE SER UN SPRITE Y PASA A SER UN ESQUELETO ──
   Antes era UNA imagen generada, dibujada siempre igual, con un arco de dos
   trazos al lado. Eso tiene una pose y nada mas: medido en la captura, el
   arquero era una calcomania de noventa pixeles apoyada sobre el pasto, sin
   arco visible, que no se movia ni cuando tiraba ni cuando le pegaban.

   Un esqueleto tiene TODAS las poses. Once huesos en cuatro cadenas —tronco,
   dos brazos, dos piernas— y la pose es una FUNCION del tiempo y de lo que esta
   pasando: cuanto tensaste, a que angulo apuntas, en que zona te pegaron. No
   hay lista de fotogramas que mantener, no hay dos animaciones que se puedan
   desincronizar, y agregar una pose cuesta diez lineas y cero bytes.

   ── Y POR ESO SON MAS DE TRESCIENTAS POSES Y NO TRESCIENTOS ARCHIVOS ──
   Diez animaciones muestreadas a cuarenta cuadros dan cuatrocientas poses
   distintas, y `__J.cfg({poses:1})` las CUENTA: arma el vector de los once
   angulos en cada muestra y cuenta cuantos son distintos. Trescientos dibujos
   generados de a uno, ademas de pesar megas, saldrian cada uno con otra
   proporcion y otra luz — que es exactamente lo que le pasa a una hoja de
   animacion pedida a un generador de imagenes.

   ── LO GENERADO ES LA CARA, QUE ES LO QUE EL CODIGO NO SABE DIBUJAR ──
   El cuerpo va por codigo para que las proporciones sean las que el juego
   necesita y no las que devolvio el generador; la cabeza, el arco, el carcaj y
   la capa son piezas generadas puestas sobre sus huesos. Es el mismo reparto
   que en RECREO y en BARRIO: el cuerpo se rigea, la cara se dibuja. */

const ABAJO = Math.PI/2, ARRIBA = -Math.PI/2;

/* las proporciones del cuerpo, en fraccion del alto total. Salen de una figura
   humana de ocho cabezas y no de tantear: cambiando `A_ALTO` el arquero crece
   entero y sigue siendo el mismo arquero. */
const A_P = {
  cadera: 0.47,   /* altura de la cadera sobre los pies */
  torso: 0.27, cuello: 0.045, cabeza: 0.125,
  brazo: 0.165, ante: 0.155, mano: 0.035,
  muslo: 0.245, pierna: 0.225, pie: 0.055
};

/* ── UNA POSE SON ONCE ANGULOS, Y NADA MAS ──
   Absolutos y medidos desde el eje +x con la y hacia abajo, o sea el marco del
   lienzo: `ABAJO` es media vuelta y `ARRIBA` menos media. Absolutos y no
   relativos al padre a proposito: asi «el antebrazo apunta al blanco» se
   escribe con el angulo del blanco y no componiendo tres rotaciones, que es
   justo lo que hace falta para que el arco apunte a donde va la flecha. */
function aPoseBase(){
  return { torso: ARRIBA, cabeza: ARRIBA, cuello: ARRIBA,
           braF: ABAJO, antF: ABAJO, braN: ABAJO, antN: ABAJO,
           musF: ABAJO, pieF: ABAJO, musN: ABAJO, pieN: ABAJO,
           dx: 0, dy: 0, esc: 1, arco: 0, tensa: 0 };
}

/* cinematica directa: de los angulos salen los puntos. El origen es el suelo
   entre los pies, con la y hacia arriba negativa, que es donde el juego apoya
   al arquero. */
function aFK(p, H){
  const pt = (o, a, l) => ({ x: o.x + Math.cos(a)*l, y: o.y + Math.sin(a)*l });
  const cad = { x: p.dx, y: -H*A_P.cadera + p.dy };
  const hom = pt(cad, p.torso, H*A_P.torso);
  const cue = pt(hom, p.cuello, H*A_P.cuello);
  const cab = pt(cue, p.cabeza, H*A_P.cabeza);
  const coF = pt(hom, p.braF, H*A_P.brazo), maF = pt(coF, p.antF, H*A_P.ante);
  const coN = pt(hom, p.braN, H*A_P.brazo), maN = pt(coN, p.antN, H*A_P.ante);
  const roF = pt(cad, p.musF, H*A_P.muslo), toF = pt(roF, p.pieF, H*A_P.pierna);
  const roN = pt(cad, p.musN, H*A_P.muslo), toN = pt(roN, p.pieN, H*A_P.pierna);
  return { cad, hom, cue, cab, coF, maF, coN, maN, roF, toF, roN, toN };
}

/* ── CINEMATICA INVERSA DE DOS HUESOS ──
   Dado el hombro y el punto al que la mano tiene que llegar, devuelve los dos
   angulos. Hace falta por una razon concreta y no por elegancia: la mano de la
   cuerda tiene que caer EXACTAMENTE sobre la cuerda, y la cuerda esta donde el
   arco la puso, que a su vez cuelga de la otra mano. Escribiendo los angulos a
   ojo —que es lo que habia— la mano quedaba medio cuerpo adelante del arco y el
   arquero parecia estar saludando en vez de tensando. */
function aIK(S, T, L1, L2, signo){
  const dx = T.x - S.x, dy = T.y - S.y;
  /* el alcance se acota: pedirle a un brazo que llegue mas lejos de lo que mide
     devuelve un coseno fuera de rango y de ahi sale NaN, que en este repo ya
     costo una pantalla en negro */
  const d = Math.max(1, Math.min(Math.hypot(dx, dy), (L1 + L2)*0.995));
  const a0 = Math.atan2(dy, dx);
  const c = (d*d + L1*L1 - L2*L2)/(2*d*L1);
  const a1 = Math.acos(Math.max(-1, Math.min(1, c)));
  const A = a0 + signo*a1;
  const E = { x: S.x + Math.cos(A)*L1, y: S.y + Math.sin(A)*L1 };
  return { bra: A, ant: Math.atan2(T.y - E.y, T.x - E.x) };
}

/* ── DONDE ESTA LA CUERDA, RESUELTO UNA VEZ ──
   El brazo del arco va estirado sobre la linea del tiro, asi que la mano del
   arco sale de una cuenta; el punto de la cuerda esta esa misma linea hacia
   atras, y cuanto, lo dice la tension. Los mismos numeros que usa el dibujo del
   arco, para que no puedan decir cosas distintas. */
function aCuerda(p, H, a, k){
  const cad = { x: p.dx, y: -H*A_P.cadera + p.dy };
  const hom = { x: cad.x + Math.cos(p.torso)*H*A_P.torso,
                y: cad.y + Math.sin(p.torso)*H*A_P.torso };
  const L = H*(A_P.brazo + A_P.ante)*0.985;
  const maN = { x: hom.x + Math.cos(a)*L, y: hom.y + Math.sin(a)*L };
  const px = -k*H*0.145 - H*0.010;
  return { hom, maN,
           cue: { x: maN.x + Math.cos(a)*px, y: maN.y + Math.sin(a)*px } };
}

/* ══════════ LAS DIEZ ANIMACIONES ══════════
   Cada una devuelve la pose; el tiempo entra normalizado o en segundos segun lo
   que la animacion sea. Las que dependen de algo del juego —la tension, el
   angulo de tiro, la zona del golpe— lo reciben, que es lo que hace que el
   cuerpo diga lo que esta pasando en vez de repetir un bucle. */
function aAnim(nom, t, e){
  const p = aPoseBase();
  e = e || {};
  const sen = (f, a, d) => Math.sin(t*f*6.283 + (d || 0))*a;

  /* la base de todas: parado, con el peso en una pierna */
  p.musF = ABAJO + 0.17; p.pieF = ABAJO - 0.09;
  p.musN = ABAJO - 0.15; p.pieN = ABAJO + 0.07;
  p.braF = ABAJO - 0.16; p.antF = ABAJO - 0.30;
  p.braN = ABAJO + 0.20; p.antN = ABAJO + 0.34;

  if (nom === 'quieto'){
    /* respira y cambia el peso. Dos senos de periodos que no son multiplos
       entre si: con uno solo el ciclo se aprende en tres segundos */
    const r = sen(0.28, 1), c = Math.sin(t*0.62 + 1.3);
    p.torso = ARRIBA + r*0.030 + c*0.045;
    p.cuello = ARRIBA - r*0.020;
    p.cabeza = ARRIBA + c*0.10 + sen(0.19, 0.06, 2.0);
    p.dy = -Math.abs(r)*H_RESP;
    p.musF += c*0.05; p.musN -= c*0.05;
    p.braF += r*0.05; p.antF += r*0.07;
    p.braN -= r*0.04; p.antN -= r*0.06;
    p.arco = 0.10;
  } else if (nom === 'apunta'){
    /* de perfil, el arco levantado hacia donde se va a tirar. El angulo entra
       de afuera, asi que el cuerpo apunta a donde apunta el tiro */
    const a = e.ang == null ? -0.5 : -e.ang;
    p.torso = ARRIBA + 0.06; p.cuello = ARRIBA + a*0.14;
    p.cabeza = ARRIBA + a*0.30 + sen(0.5, 0.02);
    p.braN = a; p.antN = a;                       /* el brazo del arco, estirado */
    p.musF = ABAJO + 0.20; p.pieF = ABAJO - 0.12;
    p.musN = ABAJO - 0.17; p.pieN = ABAJO + 0.09;
    p.dy = sen(0.5, 1.5);
    p.arco = 0.16;
    aManoCuerda(p, a, 0.10);
  } else if (nom === 'tensa'){
    /* ── LA POSE SALE DE LA TENSION DE VERDAD ──
       El brazo del arco se estira hacia el tiro y el de la cuerda se va para
       atras: cuanto, lo dice `k`, que es el mismo numero que le da velocidad a
       la flecha. Asi el cuerpo NO puede mentir sobre cuanta fuerza lleva. */
    const k = Math.max(0, Math.min(1, e.k == null ? 1 : e.k));
    const a = e.ang == null ? -0.5 : -e.ang;
    p.torso = ARRIBA + 0.05 - k*0.16;
    p.cuello = ARRIBA + a*0.16; p.cabeza = ARRIBA + a*0.34;
    p.braN = a; p.antN = a;
    p.musF = ABAJO + 0.24 + k*0.06; p.pieF = ABAJO - 0.16;
    p.musN = ABAJO - 0.20 - k*0.05; p.pieN = ABAJO + 0.12;
    p.dx = -k*H_PASO; p.dy = k*H_BAJA;
    p.arco = 0.16 + k*0.10; p.tensa = k;
    aManoCuerda(p, a, k);
  } else if (nom === 'suelta'){
    /* el retroceso: el brazo de la cuerda pasa de largo hacia atras y el cuerpo
       se endereza de golpe. Un tiro sin retroceso se lee a que la flecha salio
       sola */
    const u = Math.min(1, t/0.42), q = Math.sin(u*3.1416);
    const a = e.ang == null ? -0.5 : -e.ang;
    p.torso = ARRIBA + 0.05 + q*0.10;
    p.cuello = ARRIBA + a*0.16; p.cabeza = ARRIBA + a*0.34 - q*0.10;
    p.braN = a - q*0.10; p.antN = a + q*0.06;
    p.musF = ABAJO + 0.22; p.pieF = ABAJO - 0.14;
    p.musN = ABAJO - 0.18; p.pieN = ABAJO + 0.10;
    p.arco = 0.14;
    /* el retroceso: la mano de la cuerda pasa DE LARGO hacia atras, o sea que
       la tension aparente se hace negativa por un instante */
    aManoCuerda(p, a, -q*0.55);
  } else if (nom === 'golpe'){
    /* ── Y EL GOLPE ES DISTINTO SEGUN DONDE PEGO ──
       Con una sola reaccion, acertar a la cabeza y acertar al pie se ven igual
       — y este juego se trata justamente de elegir a que apuntarle. */
    const u = Math.min(1, t/0.55), q = Math.sin(u*3.1416)*(1 - u*0.3);
    const z = e.zona || 'pecho';
    const f = z === 'cabeza' ? 1.35 : (z === 'piernas' ? 0.6 : 1);
    p.torso = ARRIBA - q*0.34*f;
    p.cuello = ARRIBA - q*0.30*f;
    p.cabeza = ARRIBA - q*(z === 'cabeza' ? 0.85 : 0.34);
    p.braF = ABAJO - 0.5 - q*1.5*f; p.antF = ABAJO - 0.8 - q*1.1*f;
    p.braN = ABAJO + 0.5 + q*1.2*f; p.antN = ABAJO + 0.9 + q*0.8*f;
    if (z === 'piernas'){
      p.musF = ABAJO + 0.34 + q*0.5; p.pieF = ABAJO - 0.55 - q*0.6;
      p.musN = ABAJO - 0.10; p.pieN = ABAJO + 0.30 + q*0.4;
      p.dy = q*H_ROD;
    } else {
      p.musF = ABAJO + 0.22 + q*0.20; p.pieF = ABAJO - 0.18 - q*0.2;
      p.musN = ABAJO - 0.18 - q*0.12; p.pieN = ABAJO + 0.14;
    }
    p.dx = -q*H_EMP*f;
    p.arco = 0.10;
  } else if (nom === 'muere'){
    /* cae de espaldas: el cuerpo entero gira sobre los pies */
    const u = Math.min(1, t/0.95), q = u*u*(3 - 2*u);
    p.torso = ARRIBA - q*1.25; p.cuello = ARRIBA - q*1.10;
    p.cabeza = ARRIBA - q*1.45;
    p.braF = ABAJO - 0.6 - q*1.6; p.antF = ABAJO - 0.9 - q*1.4;
    p.braN = ABAJO + 0.6 + q*1.1; p.antN = ABAJO + 1.0 + q*0.9;
    p.musF = ABAJO + 0.2 + q*0.9; p.pieF = ABAJO - 0.2 - q*1.1;
    p.musN = ABAJO - 0.2 + q*0.7; p.pieN = ABAJO + 0.2 - q*0.9;
    p.dx = -q*H_CAE; p.dy = q*H_SUELO;
    p.arco = 0.05;
  } else if (nom === 'gana'){
    /* levanta el arco: la unica pose en la que los dos brazos van arriba */
    const u = Math.min(1, t/0.6), q = u*u*(3 - 2*u);
    const s2 = sen(1.1, 0.10);
    p.torso = ARRIBA - 0.06*q; p.cuello = ARRIBA; p.cabeza = ARRIBA - 0.12*q;
    p.braN = ABAJO + q*(ARRIBA - ABAJO - 0.35) + s2;
    p.antN = p.braN - 0.20;
    p.braF = ABAJO + q*(ARRIBA - ABAJO + 0.45) - s2;
    p.antF = p.braF + 0.25;
    p.musF = ABAJO + 0.16; p.pieF = ABAJO - 0.10;
    p.musN = ABAJO - 0.14; p.pieN = ABAJO + 0.08;
    p.dy = -q*H_SALTO*Math.abs(Math.sin(t*4.6));
    p.arco = 0.10;
  } else if (nom === 'pierde'){
    /* de rodillas, con el arco caido */
    const u = Math.min(1, t/0.8), q = u*u*(3 - 2*u);
    p.torso = ARRIBA + q*0.42; p.cuello = ARRIBA + q*0.34;
    p.cabeza = ARRIBA + q*0.75;
    p.braF = ABAJO + q*0.3; p.antF = ABAJO + q*0.5;
    p.braN = ABAJO - q*0.2; p.antN = ABAJO + q*0.6;
    p.musF = ABAJO + q*1.30; p.pieF = ABAJO - q*1.45;
    p.musN = ABAJO + q*0.55; p.pieN = ABAJO - q*0.30;
    p.dy = q*H_ROD;
    p.arco = 0.05;
  } else if (nom === 'listo'){
    /* la espera del rival: mira al frente y el arco descansa */
    const r = sen(0.34, 1);
    p.torso = ARRIBA + 0.02 + r*0.025;
    p.cuello = ARRIBA; p.cabeza = ARRIBA + r*0.05;
    p.braF = ABAJO - 0.10 + r*0.04; p.antF = ABAJO - 0.62 + r*0.05;
    p.braN = ABAJO + 0.14; p.antN = ABAJO + 0.10 - r*0.04;
    p.dy = -Math.abs(r)*H_RESP*0.6;
    p.arco = 0.12;
  } else if (nom === 'burla'){
    /* entre turnos, cada tanto: es lo que hace que el rival parezca alguien */
    const q = Math.sin(t*5.0);
    p.torso = ARRIBA + q*0.10; p.cuello = ARRIBA - q*0.08;
    p.cabeza = ARRIBA + q*0.22;
    p.braF = ABAJO - 0.9 - q*0.35; p.antF = ABAJO - 1.5 - q*0.5;
    p.braN = ABAJO + 0.3; p.antN = ABAJO + 0.5 + q*0.2;
    p.musF = ABAJO + 0.16; p.pieF = ABAJO - 0.10;
    p.musN = ABAJO - 0.14; p.pieN = ABAJO + 0.08;
    p.arco = 0.10;
  }
  return p;
}

/* la mano de la cuerda resuelta por IK, y el codo hacia ARRIBA: con el signo al
   reves el brazo se dobla al reves y el arquero se disloca el hombro */
function aManoCuerda(p, a, k){
  const c = aCuerda(p, A_ALTO, a, k);
  const r = aIK(c.hom, c.cue, A_ALTO*A_P.brazo, A_ALTO*A_P.ante, -1);
  p.braF = r.bra; p.antF = r.ant;
}

/* ── LOS NUMEROS DE LAS ANIMACIONES, EN FRACCION DEL ALTO ──
   Sueltos serian doce constantes magicas repartidas por diez animaciones; asi
   el arquero se agranda entero y el paso atras al tensar sigue midiendo lo
   mismo respecto del cuerpo. */
const H_RESP = A_ALTO*0.008, H_PASO = A_ALTO*0.030, H_BAJA = A_ALTO*0.018;
const H_EMP = A_ALTO*0.055, H_ROD = A_ALTO*0.150, H_CAE = A_ALTO*0.090;
const H_SUELO = A_ALTO*0.330, H_SALTO = A_ALTO*0.035;

/* ── UN MIEMBRO ES UN TRAPECIO REDONDEADO, NO UNA LINEA GRUESA ──
   Una linea con punta redonda es un chorizo del mismo grosor de punta a punta:
   lo que hace que un muslo se lea a muslo es que ADELGACE. Cuesta seis lineas
   y es la diferencia entre un mono de palitos y una figura. */
function aMiembro(g, p, q, r0, r1, col, bor){
  const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy/L, ny = dx/L, a = Math.atan2(dy, dx);
  g.beginPath();
  g.arc(p.x, p.y, r0, a + 1.5708, a - 1.5708);
  g.lineTo(q.x + nx*r1, q.y + ny*r1);
  g.arc(q.x, q.y, r1, a - 1.5708, a + 1.5708);
  g.closePath();
  if (bor){ g.strokeStyle = bor; g.lineWidth = A_ALTO*0.013; g.lineJoin = 'round'; g.stroke(); }
  g.fillStyle = col; g.fill();
}

/* la paleta de cada rival: la tunica cambia y el resto no, asi los doce se
   distinguen de una ojeada sin generar doce personajes */
const A_PAL = [
  { t:'#4a8f5a', c:'#2f5f3c' }, { t:'#8a94a8', c:'#5a6474' },
  { t:'#6b7a4a', c:'#48532f' }, { t:'#c9a05a', c:'#96733a' },
  { t:'#a85a3c', c:'#7a3d28' }, { t:'#6b5a9a', c:'#463a6b' },
  { t:'#3c7a8a', c:'#28545f' }, { t:'#2f3440', c:'#1c202a' },
  { t:'#b04a6a', c:'#7d3149' }, { t:'#8a6b3c', c:'#5f4826' },
  { t:'#4a6ba8', c:'#324a78' }, { t:'#c9b45a', c:'#96843a' }
];
const A_PIEL = '#e8b48a', A_PIELF = '#c08f68';
const A_CUERO = '#6b4a2c', A_CUEROF = '#4d3520';
const A_BOR = 'rgba(26,18,12,.72)';

/* ── EL ARQUERO ENTERO ──
   Los miembros lejanos van oscurecidos y se dibujan primero: es lo unico que le
   da profundidad a una figura de perfil, que si no se lee a recorte de papel. */
function aDibArquero(g, a, s, pose){
  const H = A_ALTO, j = aFK(pose, H);
  const pal = A_PAL[(a.pal || 0) % A_PAL.length];
  g.save();
  g.translate(a.x, a.y);
  g.scale(s*pose.esc, pose.esc);

  /* la sombra de contacto, achatada segun cuanto se agacho: sin ella el
     arquero flota sobre la colina */
  g.save(); g.globalAlpha = 0.30;
  g.beginPath(); g.ellipse(pose.dx*0.5, 0, H*0.14, H*0.030, 0, 0, 7);
  g.fillStyle = '#000'; g.fill(); g.restore();

  const rB = H*0.040, rA = H*0.030, rM = H*0.052, rP = H*0.038;

  /* pierna lejana */
  aMiembro(g, j.cad, j.roF, rM*0.92, rP*0.86, A_CUEROF, A_BOR);
  aMiembro(g, j.roF, j.toF, rP*0.86, rP*0.62, A_CUEROF, A_BOR);
  aBota(g, j.roF, j.toF, H, '#3d2a18', A_BOR);
  /* brazo lejano */
  aMiembro(g, j.hom, j.coF, rB*0.90, rA*0.86, pal.c, A_BOR);
  aMiembro(g, j.coF, j.maF, rA*0.86, rA*0.66, A_PIELF, A_BOR);
  aMano(g, j.coF, j.maF, H, A_PIELF, A_BOR);

  aCapa(g, j, H, pal.c);
  aTorso(g, j, H, pal, s);
  aCarcaj(g, j, H);

  /* pierna cercana */
  aMiembro(g, j.cad, j.roN, rM, rP*0.92, A_CUERO, A_BOR);
  aMiembro(g, j.roN, j.toN, rP*0.92, rP*0.68, A_CUERO, A_BOR);
  aBota(g, j.roN, j.toN, H, '#4d3520', A_BOR);

  aCabeza(g, j, H, a, pose);

  /* brazo cercano: el del arco */
  aMiembro(g, j.hom, j.coN, rB, rA*0.92, pal.t, A_BOR);
  aMiembro(g, j.coN, j.maN, rA*0.92, rA*0.72, A_PIEL, A_BOR);
  aMano(g, j.coN, j.maN, H, A_PIEL, A_BOR);

  aArcoDib(g, j, H, pose);
  g.restore();
}

/* ── UNA PIEZA GENERADA PUESTA SOBRE SU HUESO ──
   `ky` dice donde cae el pivote dentro de la pieza: 1 abajo, 0 arriba. Es lo
   unico que hay que saber de un recorte para colgarlo de un esqueleto, y va
   declarado por pieza en vez de deducido — el generador no promete donde puso
   el hombro. */
function aPieza(g, i, p, ang, alto, ky){
  g.save();
  g.translate(p.x, p.y);
  g.rotate(ang);
  const ok = dibCuadro('k_partes', i, 0, alto*(1 - ky), alto);
  g.restore();
  return ok;
}

function aTorso(g, j, H, pal, s){
  /* ── EL TRONCO, LA CAPA, EL CARCAJ Y LA BOTA VAN GENERADOS; LOS MIEMBROS NO ──
     El reparto no es caprichoso: un tronco y una capa tienen UNA forma y la
     conservan, asi que un recorte los dibuja mejor de lo que los dibuja el
     codigo. Un antebrazo, en cambio, tiene que estirarse entre dos puntos que
     se mueven, y un recorte rigido ahi se despega del codo. Y el arco tiene que
     DOBLARSE con la tension, que es justo lo que un sprite no puede hacer. */
  const ang = Math.atan2(j.hom.y - j.cad.y, j.hom.x - j.cad.x) - ARRIBA;
  if (aPieza(g, 0, j.cad, ang, H*A_P.torso*1.62, 0.80)) return;
  aTorsoCod(g, j, H, pal, s);
}

function aTorsoCod(g, j, H, pal, s){
  const dx = j.hom.x - j.cad.x, dy = j.hom.y - j.cad.y;
  const L = Math.hypot(dx, dy) || 1, nx = -dy/L, ny = dx/L;
  const wc = H*0.062, wh = H*0.082;
  g.beginPath();
  g.moveTo(j.cad.x + nx*wc, j.cad.y + ny*wc);
  g.quadraticCurveTo(j.cad.x + (j.hom.x - j.cad.x)*0.5 + nx*wc*1.15,
                     j.cad.y + (j.hom.y - j.cad.y)*0.5 + ny*wc*1.15,
                     j.hom.x + nx*wh, j.hom.y + ny*wh);
  g.lineTo(j.hom.x - nx*wh, j.hom.y - ny*wh);
  g.quadraticCurveTo(j.cad.x + (j.hom.x - j.cad.x)*0.5 - nx*wc*1.15,
                     j.cad.y + (j.hom.y - j.cad.y)*0.5 - ny*wc*1.15,
                     j.cad.x - nx*wc, j.cad.y - ny*wc);
  g.closePath();
  g.strokeStyle = A_BOR; g.lineWidth = H*0.013; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = pal.t; g.fill();
  /* la faldita de la tunica: es lo que separa el tronco de las piernas cuando
     los dos van del mismo color */
  g.beginPath();
  g.moveTo(j.cad.x - nx*wc*1.05, j.cad.y - ny*wc*1.05);
  g.lineTo(j.cad.x + nx*wc*1.05, j.cad.y + ny*wc*1.05);
  g.lineTo(j.cad.x + nx*wc*1.30 - dx*0.30, j.cad.y + ny*wc*1.30 - dy*0.30);
  g.lineTo(j.cad.x - nx*wc*1.30 - dx*0.30, j.cad.y - ny*wc*1.30 - dy*0.30);
  g.closePath();
  g.strokeStyle = A_BOR; g.stroke(); g.fillStyle = pal.c; g.fill();
  /* el cinto */
  g.save(); g.translate(j.cad.x, j.cad.y); g.rotate(Math.atan2(dy, dx));
  g.fillStyle = '#3d2a18';
  g.fillRect(-H*0.012, -wc*1.12, H*0.026, wc*2.24);
  g.fillStyle = '#c9a05a';
  g.fillRect(-H*0.008, -H*0.014, H*0.016, H*0.028);
  g.restore();
}

function aCapa(g, j, H, col){
  const a2 = Math.atan2(j.hom.y - j.cad.y, j.hom.x - j.cad.x) - ARRIBA;
  /* el viento le mete un giro extra: el mismo numero que empuja la flecha,
     asi que la capa tambien dice para donde sopla */
  const w2 = (typeof A_viento === 'number' ? A_viento : 0)/1400;
  if (aPieza(g, 7, j.hom, a2 + w2, H*0.52, 0.06)) return;
  const dx = j.hom.x - j.cad.x, dy = j.hom.y - j.cad.y;
  const nx = -dy/(Math.hypot(dx, dy) || 1), ny = dx/(Math.hypot(dx, dy) || 1);
  /* el viento la mueve: el mismo numero que empuja la flecha, asi que la capa
     tambien dice para donde sopla */
  const w = (typeof A_viento === 'number' ? A_viento : 0)/420;
  const on = performance.now()*0.0016;
  const f = -H*0.095 - w*H*0.06 + Math.sin(on)*H*0.014;
  g.beginPath();
  g.moveTo(j.hom.x + nx*H*0.055, j.hom.y + ny*H*0.055);
  g.quadraticCurveTo(j.hom.x + f*1.4, j.hom.y + H*0.16,
                     j.cad.x + f*1.9, j.cad.y + H*0.20);
  g.quadraticCurveTo(j.cad.x + f*0.4, j.cad.y + H*0.10,
                     j.cad.x - nx*H*0.02, j.cad.y - ny*H*0.02);
  g.closePath();
  g.strokeStyle = A_BOR; g.lineWidth = H*0.012; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = col; g.fill();
}

function aCarcaj(g, j, H){
  const dx = j.hom.x - j.cad.x, dy = j.hom.y - j.cad.y;
  const a = Math.atan2(dy, dx);
  if (aPieza(g, 8, { x: j.hom.x - Math.cos(a)*H*0.09, y: j.hom.y - Math.sin(a)*H*0.09 },
             a - ARRIBA + 0.34, H*0.30, 0.55)) return;
  g.save();
  g.translate(j.hom.x - Math.cos(a)*H*0.10, j.hom.y - Math.sin(a)*H*0.10);
  g.rotate(a + 0.30);
  caja2(-H*0.030, -H*0.085, H*0.060, H*0.170, H*0.014, '#5f3f22', A_BOR);
  g.strokeStyle = '#c9a06a'; g.lineWidth = H*0.010; g.lineCap = 'round';
  for (let i = -1; i <= 1; i++){
    g.beginPath();
    g.moveTo(i*H*0.016, -H*0.085);
    g.lineTo(i*H*0.022, -H*0.150);
    g.stroke();
  }
  g.restore();
}

function aBota(g, ro, to, H, col, bor){
  const a = Math.atan2(to.y - ro.y, to.x - ro.x);
  if (aPieza(g, 6, to, a - ABAJO, H*0.155, 0.82)) return;
  g.save(); g.translate(to.x, to.y); g.rotate(a - 1.5708);
  caja2(-H*0.028, -H*0.020, H*0.088, H*0.042, H*0.014, col, bor);
  g.restore();
}

function aMano(g, co, ma, H, col, bor){
  const a = Math.atan2(ma.y - co.y, ma.x - co.x);
  g.save(); g.translate(ma.x, ma.y); g.rotate(a);
  g.beginPath(); g.ellipse(H*0.012, 0, H*0.026, H*0.021, 0, 0, 7);
  g.strokeStyle = bor; g.lineWidth = H*0.011; g.stroke();
  g.fillStyle = col; g.fill();
  g.restore();
}

/* ── LA CABEZA VA GENERADA, QUE ES LO QUE EL CODIGO NO SABE DIBUJAR ──
   Y con el cuello por debajo dibujado a mano, porque la pieza generada corta
   justo ahi y si no queda una cabeza flotando sobre los hombros. */
function aCabeza(g, j, H, a, pose){
  const ang = Math.atan2(j.cab.y - j.cue.y, j.cab.x - j.cue.x);
  aMiembro(g, j.hom, j.cue, H*0.030, H*0.026, A_PIEL, A_BOR);
  g.save();
  g.translate(j.cue.x, j.cue.y);
  g.rotate(ang - ARRIBA);
  const alto = H*A_P.cabeza*1.9;
  if (!dibCuadro('k_cabezas', (a.cara || 0) % 6, 0, H*0.020, alto)){
    disco(0, -alto*0.42, alto*0.36, A_PIEL);
    g.strokeStyle = A_BOR; g.lineWidth = H*0.012;
    g.beginPath(); g.arc(0, -alto*0.42, alto*0.36, 0, 7); g.stroke();
    g.fillStyle = '#3d2a18';
    g.beginPath(); g.arc(0, -alto*0.46, alto*0.37, 3.34, 6.0); g.fill();
    g.fillStyle = '#2a1a12';
    g.beginPath(); g.arc(alto*0.16, -alto*0.44, alto*0.055, 0, 7); g.fill();
  }
  g.restore();
}

/* ── EL ARCO SE DIBUJA POR CODIGO PORQUE TIENE QUE DOBLARSE ──
   Un sprite de arco tiene una curvatura y este arco cambia de curvatura con la
   tension: es la unica cosa en pantalla que dice cuanta fuerza lleva el tiro
   sin escribir un numero. Y la flecha se encaja en la cuerda, no al lado. */
function aArcoDib(g, j, H, pose){
  const ang = Math.atan2(j.maN.y - j.coN.y, j.maN.x - j.coN.x);
  const R = H*0.235, k = pose.tensa || 0;
  g.save();
  g.translate(j.maN.x, j.maN.y);
  g.rotate(ang);
  /* las dos palas, mas cerradas cuanto mas tensado */
  const ab = 1.05 - k*0.22;
  g.strokeStyle = '#7a5326'; g.lineWidth = H*0.026; g.lineCap = 'round';
  g.beginPath(); g.arc(0, 0, R, -ab, ab); g.stroke();
  g.strokeStyle = '#a87a3c'; g.lineWidth = H*0.012;
  g.beginPath(); g.arc(0, 0, R, -ab, ab); g.stroke();
  /* la cuerda, con el punto de tiro corrido hacia atras */
  const px = -k*H*0.145 - H*0.010;
  g.strokeStyle = 'rgba(250,244,228,.92)'; g.lineWidth = H*0.007;
  g.beginPath();
  g.moveTo(R*Math.cos(-ab), R*Math.sin(-ab));
  g.lineTo(px, 0);
  g.lineTo(R*Math.cos(ab), R*Math.sin(ab));
  g.stroke();
  if (pose.arco > 0.12 || k > 0){
    /* la flecha nocada: sale del punto de la cuerda hacia adelante */
    g.save(); g.translate(px, 0);
    caja2(0, -H*0.008, H*0.32, H*0.016, H*0.006, '#c9a06a', null);
    g.fillStyle = '#e8e2d4';
    g.beginPath(); g.moveTo(H*0.36, 0); g.lineTo(H*0.30, -H*0.026);
    g.lineTo(H*0.30, H*0.026); g.closePath(); g.fill();
    g.fillStyle = '#c94a3c';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(H*0.048, -H*0.026);
    g.lineTo(H*0.062, 0); g.lineTo(H*0.048, H*0.026); g.closePath(); g.fill();
    g.restore();
  }
  g.restore();
}

/* ── QUÉ POSE LE TOCA A CADA UNO, RESUELTO EN UN SOLO SITIO ──
   El estado lo pone `aPon`; acá sólo se traduce a los argumentos que la
   animación necesita. Repartido, el que tensa y el que acaba de recibir un
   flechazo se pisarían. */
function aArquero(g, a, s, activo){
  const nom = a.anim || 'quieto';
  const e = {};
  if (nom === 'tensa' || nom === 'apunta' || nom === 'suelta'){
    /* el ángulo del cuerpo es el ángulo del TIRO: por eso el arco apunta a
       donde va a ir la flecha y no a un sitio decorativo */
    e.ang = (a === A_yo && A_arrastre) ? aTension().ang : 0.62;
    e.k = (a === A_yo && A_arrastre) ? aTension().f : 0.5;
  }
  if (nom === 'golpe') e.zona = a.zona;
  const pose = aAnim(nom, a.at || 0, e);
  aDibArquero(g, a, s, pose);
  /* el aro del que tira: sin él, con dos arqueros iguales no hay forma de saber
     de quién es el turno sin leer la ficha del HUD */
  if (activo && a.vida > 0){
    const la = 0.5 + 0.3*Math.sin(performance.now()*0.005);
    g.save();
    g.globalAlpha = la;
    g.strokeStyle = '#ffd76a'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(a.x, a.y + 2, A_ALTO*0.17, A_ALTO*0.05, 0, 0, 7);
    g.stroke();
    g.restore();
  }
}

function aFlecha(g, f, al){
  g.save();
  if (al) g.globalAlpha = al;
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

/* ── LA CAPA DE EN MEDIO ──
   Se dibuja DENTRO de la transformación de la cámara pero con la mitad del
   desplazamiento, así que se mueve la mitad: eso es todo el paralaje, y es lo
   que convierte un fondo pintado en un valle con profundidad. */
function aArboleda(g){
  const o = IMG['k_medio'];
  const y = aSuelo(A_camX) - A_ALTO*0.30;
  g.save();
  g.translate(A_camX*0.50, 0);
  /* ── LO LEJANO VA LAVADO, Y NO ES MAQUILLAJE ──
     La silueta volvio en azul casi negro y puesta a plena opacidad se lee a
     PARED: medido en la captura, una banda navy maciza detras del arquero, mas
     oscura que el propio arquero. Lo que hace que algo se lea LEJOS no es que
     sea mas chico, es que pierde contraste contra el cielo — que es lo que hace
     el aire de verdad. */
  g.globalAlpha = 0.58;
  if (o && o.ok){
    /* ── SE ESPEJA UNA COPIA SI Y UNA NO ──
       La silueta que devolvio el generador arranca baja a la izquierda y
       termina alta a la derecha: repetida derecha, cada empalme es un escalon.
       Espejando las copias impares, los dos bordes que se tocan son EL MISMO
       borde y la costura no puede existir. Es la regla 9 del horneado, en una
       dimension. */
    const alto = A_ALTO*0.86, ancho = alto*(o.w/o.h);
    let i = 0;
    for (let x = -900; x < A_MUNDO + 900; x += ancho, i++){
      g.save();
      g.translate(x + (i % 2 ? ancho : 0), y - alto);
      if (i % 2) g.scale(-1, 1);
      g.drawImage(o.im, 0, 0, o.w, o.h, 0, 0, ancho, alto);
      g.restore();
    }
  } else {
    /* respaldo por código: una fila de conos. Sin él, el primer cuadro de cada
       partida —una imagen en base64 decodifica de forma asincrónica— no tendría
       capa de en medio y el valle se vería plano justo al empezar */
    g.fillStyle = '#2f4a44';
    for (let x = -600; x < A_MUNDO + 600; x += 46){
      const h = A_ALTO*(0.42 + 0.30*Math.abs(Math.sin(x*0.031)));
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x + 23, y - h); g.lineTo(x + 46, y);
      g.closePath(); g.fill();
    }
  }
  g.restore();
}

function aProp(g, p){
  g.save();
  g.translate(p.x, p.y);
  if (p.z) g.globalAlpha = 0.55;      /* lo de atras pierde contraste */
  g.scale(p.e, p.e);
  /* el meneo del viento: el mismo numero que empuja la flecha mueve los
     arboles, asi que el jugador puede LEER el viento en la escena y no solo en
     el indicador — que es lo que lo vuelve un dato del mundo y no del HUD */
  const w = A_viento/300;
  const on = performance.now();
  if (p.t < 2 || p.t === 4){
    /* los que tienen tronco se mecen desde la base */
    g.rotate(w*0.085 + Math.sin(on*0.0011 + p.f)*0.028);
  }
  const ALTOS = [200, 190, 92, 84, 210, 110];
  if (!dibCuadro('k_props', p.t, 0, 0, ALTOS[p.t])){
    /* respaldo por codigo: es lo que se ve el primer cuadro de cada partida,
       porque una imagen en base64 decodifica de forma asincronica */
    if (p.t === 2 || p.t === 5){
      g.fillStyle = '#8a8478';
      g.beginPath(); g.ellipse(0, -22, 34, 22, 0, 0, 7); g.fill();
    } else {
      caja2(-7, -60, 14, 60, 5, '#5a4028', null);
      disco(0, -84, 40, '#3f7a3a'); disco(-22, -66, 27, '#4a8f42');
      disco(23, -70, 24, '#357030');
    }
  }
  g.restore();

  /* y las matas de pasto alto van aparte y SIEMPRE, porque son lo mas barato
     que hay para que la colina no sea una franja lisa */
  if (p.t === 3){
    g.save();
    g.translate(p.x, p.y);
    g.rotate(w*0.34 + Math.sin(on*0.0017 + p.f)*0.06);
    g.strokeStyle = '#6ba84e'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = -2; i <= 2; i++){
      g.beginPath(); g.moveTo(i*6, 0);
      g.quadraticCurveTo(i*8, -17, i*11 + 7, -31);
      g.stroke();
    }
    g.restore();
  }
}

/* ── LA BRÚJULA DEL RIVAL, QUE ES LA CONTRACARA DEL ZOOM NUEVO ──
   Ahora la cámara arranca encima del que tira, así que mientras no se tensa el
   rival está FUERA DE LA PANTALLA. Eso es lo que se quería —se ve al arquero
   tensar— pero deja el primer tiro a ciegas: no hay forma de saber para dónde
   ni a qué distancia. Un triángulo contra el canto y los metros lo resuelven, y
   desaparece solo en cuanto el rival entra en cuadro, que es cuando estorbaría. */
function aBrujula(g){
  if (A_fase !== 'apunta' || A_el.vida <= 0) return;
  const sx = AN/2 + (A_el.x - A_camX)*A_camZ;
  if (sx > 40 && sx < AN - 40) return;
  const der = sx >= AN - 40;
  const x = der ? AN - 58 : 58, y = AL*0.52;
  const d = Math.round(Math.abs(A_el.x - A_yo.x));
  g.save();
  g.globalAlpha = 0.72 + 0.18*Math.sin(performance.now()*0.004);
  g.translate(x, y);
  g.scale(der ? 1 : -1, 1);
  g.fillStyle = '#ffd76a';
  g.strokeStyle = 'rgba(26,18,12,.6)'; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(24, 0); g.lineTo(-13, -21); g.lineTo(-13, 21);
  g.closePath(); g.stroke(); g.fill();
  g.restore();
  texto(d + ' m', x, y + 50, 20, 'rgba(255,215,106,.92)', '800', 'center');
  /* y la cara del rival al lado del triángulo: dice A QUIÉN se le está por
     tirar, que con doce rivales distintos no es un detalle */
  dibCuadro('k_cabezas', A_el.cara % 6, x, y - 30, 54, !der);
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
    dibCuadro('k_cabezas', a.cara % 6, esp ? AN - 34 : 34, y + h + 52, 52, esp);
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
  /* ── EL ARO VA POR ENCIMA DEL DEDO Y NO DEBAJO ──
     Dibujado en el punto del arrastre queda TAPADO por el pulgar, que es
     exactamente donde no sirve: el numero que dice cuanta fuerza llevas es lo
     unico que hay que leer mientras se tensa. */
  const r = 46;
  g.save();
  g.translate(a.x, a.y - 96);
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
  /* ── Y LA CINEMATICA DIBUJA SU PROPIO AMBIENTE ──
     En modo `cine` el bucle NO llama a `ambAtras`: la pantalla se limpia y lo
     unico que se pinta es lo que devuelve el plano. Sin esto, los tres planos
     salen sobre NEGRO —medido en la captura, el fondo generado no aparecia por
     ningun lado— y la cinematica se ve de otro juego que la partida. */
  ambAtras();
  aPinta(g);
  ambAdelante();
  A_duelo = gd; A_fase = gf; A_turno = gt; A_arrastre = ga;
  A_flecha = gfl; A_viento = gv; A_ultZona = gz; A_ultT = gzt;
}
