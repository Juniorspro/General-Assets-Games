
/* ══════════════════════ EL NIVEL ══════════════════════
   ── SE ARMA PEGANDO PATRONES SOBRE LA GRILLA DEL COMPAS ──
   Un patron mide un compas —cuatro tiempos, o sea dieciseis bloques— y todo lo
   que pone cae en corcheas. Asi «el nivel va al ritmo» no es algo que haya que
   sincronizar: es lo unico que el generador sabe hacer.

   ── Y UN NIVEL GENERADO Y NO JUGADO ES UN NIVEL ROTO QUE TODAVIA NO SE SABE ──
   Es la regla que en este repo ya costo siete niveles imposibles en Maicol y una
   nube 37 de 42 en BARRIO. El generador tira, y despues el auto-jugador de `g.js`
   lo tiene que terminar al 100 %: si no llega, se rechaza y se vuelve a tirar con
   otra semilla. El validador y el juego comparten la MISMA fisica, asi que el
   validador no puede aprobar un juego que no existe. */
const MUNDO = {
  largo: 0,            /* en bloques */
  sol: [],             /* solidos: se para arriba, se muere de costado */
  mat: [],             /* mortales: picos y sierras */
  pads: [], orbes: [], portales: [], monedas: [],
  sierras: [],         /* solo para dibujar: su caja mortal ya esta en `mat` */
  techo: [],           /* tramos con techo, para gravedad y nave */
  nivel: 0, med: null,
  tramos: [],          /* los diez tramos de modo, con su paleta */
  /* ── LA REVISION ──
     La sube `generaNivel` y el dibujo la mira para saber si tiene que rearmar
     las mallas. Con una llamada explicita, el dia que se agregue un camino que
     genere un nivel —el demo del menu, una sonda, la validacion— se olvida y se
     dibuja el nivel anterior. */
  rev: 0,
  /* los indices arrancan vacios: `cerca()` se puede llamar antes de generar */
  iSol: [], iMat: []
};

const rect = (x, y, w, h, t) => ({ x, y, w, h, t });

/* ══════════ EL NIVEL, TRAMO POR TRAMO ══════════
   ── ESTE NIVEL ESTA ESCRITO Y NO SORTEADO, Y ES A PROPOSITO ──
   Los tres niveles anteriores se generaban con patrones al azar y semilla, y eso
   servia para tres temas de un solo modo. Con OCHO modos en un nivel el azar no
   sirve: cada modo pide su propia altura de pasillo, su propia distancia entre
   paredes y su propio portal, y un sorteo que respete todo eso ya es una lista
   escrita. Lo que NO cambia es la validacion: el auto-jugador de `g.js` lo tiene
   que terminar al 100 %, y comparte la fisica con el juego.

   ── Y LOS TRAMOS CAEN EN COMPASES ENTEROS ──
   Los tramos de modo miden dos compases —32 bloques, ocho tiempos, 3,04 s a
   158 BPM— asi que los ocho portales caen en el primer tiempo de un compas. A
   mitad de compas el cambio de modo se lee a error. */
const TRAMOS = [
  { x: 0,   w: 24, modo: 'cubo',     arma: 'entrada' },
  { x: 24,  w: 24, modo: 'cubo',     arma: 'cubo' },
  { x: 48,  w: 32, modo: 'nave',     arma: 'nave' },
  { x: 80,  w: 32, modo: 'bola',     arma: 'bola' },
  { x: 112, w: 32, modo: 'ovni',     arma: 'ovni' },
  { x: 144, w: 32, modo: 'onda',     arma: 'onda' },
  { x: 176, w: 32, modo: 'robot',    arma: 'robot' },
  { x: 208, w: 32, modo: 'arana',    arma: 'arana' },
  { x: 240, w: 32, modo: 'columpio', arma: 'columpio' },
  { x: 272, w: 30, modo: 'cubo',     arma: 'orbes' }
];
const LARGO_NIVEL = 302;

/* ── LOS CONSTRUCTORES DE TRAMO ──
   Cada uno pone lo que su modo necesita y NADA MAS: no declara la solucion. La
   solucion la encuentra el auto-jugador, que es lo que garantiza que exista. */
const ARMA = {

  /* la entrada: compas y medio casi vacio. Aparecer al lado de un pico no es
     dificultad, es una emboscada — y ademas el primer compas es la entrada del
     tema, o sea que el nivel arranca cuando arranca la cancion. */
  /* ── Y LLEVA EL PAD AMARILLO, PORQUE UN PAD NO SE DECIDE ──
     El pad lanza al pisarlo y el orbe hay que apretarlo: son las dos mitades del
     genero y las dos tienen que ESTAR en el nivel, no solo en el codigo. Va en la
     entrada porque es donde no hay nada que esquivar todavia. Su apice son
     `2·2,4 = 4,8` bloques y cae en `u = 0,707`, o sea 2,83 bloques despues del
     pad: ahi va la moneda, que es el unico sitio del vuelo al que se llega. El
     vuelo mide `4·√2 = 5,66` bloques, asi que se aterriza en x+13,66 y quedan
     4,3 hasta el primer pico — un salto entero. */
  entrada(P, x, w){
    P.pad(x + 8, 'amar'); P.moneda(x + 10.83, 5.2);
    P.pico(x + 18); P.pico(x + 22);
  },

  cubo(P, x, w){
    P.pico(x + 2); P.pico(x + 6);
    P.pico(x + 10); P.pico(x + 11);          /* dobles: 2,50 de ancho, entra */
    P.hueco(x + 14, x + 17.0);               /* 3,0 de hueco contra 4,0 de salto */
    /* el pad rosa lanza 0,68 del cubo, o sea apice 1,11: es un salto corto y su
       gracia es que no se puede elegir — pisarlo obliga */
    P.pad(x + 19, 'rosa');
    P.pico(x + 21);
  },

  /* ── LA NAVE: UN PASILLO CON PAREDES CADA OCHO BLOQUES ──
     Lo unico que la mata es el techo, el piso y las paredes: sin techo, «volar»
     seria subir sin limite y el modo no significaria nada. */
  nave(P, x, w){
    P.techo(x, w, ALTO_PASILLO);
    /* la primera pared va a ocho bloques y no a seis: la nave entra pegada al
       piso y tiene que trepar hasta el hueco, y con seis no alcanza contando la
       aceleracion */
    for (let i = 0; i*8 + 8 < w; i++){
      const bx = x + 8 + i*8, hueco = 3.4;
      const abajo = [1.0, 2.6, 0.8][i % 3];
      P.bloque(bx, 0, 1.2, abajo);
      P.bloque(bx, abajo + hueco, 1.2, ALTO_PASILLO - (abajo + hueco));
    }
    P.moneda(x + 12, 2.6);
  },

  /* ── LA BOLA: PICOS QUE ALTERNAN PISO Y TECHO ──
     La bola no salta: da vuelta la gravedad. Asi que lo que hay que medir es el
     CRUCE: con el pasillo en 6 bloques y la gravedad del cubo, ir de una cara a
     la otra tarda `sqrt(2·6/g)` = 0,30 s, o sea 3,2 bloques. Los picos van cada
     ocho, que deja mas de un cruce de aire para decidir. */
  bola(P, x, w){
    P.techo(x, w, ALTO_BOLA);
    for (let i = 0; i < 4; i++){
      const bx = x + 6 + i*8;
      if (i % 2 === 0){ P.pico(bx); P.pico(bx + 1); }
      else { P.picoInv(bx, ALTO_BOLA); P.picoInv(bx + 1, ALTO_BOLA); }
    }
  },

  /* ── EL OVNI: PILARES QUE SE SALTAN EN EL AIRE ──
     Su apice son 2,0 bloques desde donde este, y puede tocar cuantas veces
     quiera: lo que lo acota es que cada toque sube poco. Los pilares miden 1,6 —
     un solo toque los clarea— y el hueco del final pide DOS. */
  ovni(P, x, w){
    P.techo(x, w, ALTO_OVNI);
    P.bloque(x + 6, 0, 1.2, 1.6);
    P.bloque(x + 13, 0, 1.2, 1.6);
    P.bloque(x + 20, 0, 1.2, 2.4);
    P.hueco(x + 25, x + 29.0);
    P.moneda(x + 27, 3.0);
  },

  /* ── LA ONDA: EL PASILLO EN ZIGZAG ──
     Va a 45 grados exactos, asi que la geometria es la unica dificultad: para
     pasar de un hueco al siguiente hay que subir `dy` en `dx` bloques, y a 45
     grados eso pide `dy <= dx`. Con paredes cada seis y huecos que se corren 2,2,
     sobra — y con el hueco en 1,9 no perdona un cuadro de mas. */
  onda(P, x, w){
    P.techo(x, w, ALTO_ONDA);
    const alturas = [1.0, 3.2, 1.0, 3.2, 1.6];
    for (let i = 0; i < alturas.length; i++){
      const bx = x + 6 + i*6, abajo = alturas[i], hueco = 1.9;
      if (bx + 1.0 > x + w) break;
      P.bloque(bx, 0, 1.0, abajo);
      P.bloque(bx, abajo + hueco, 1.0, ALTO_ONDA - (abajo + hueco));
    }
  },

  /* ── EL ROBOT: TRES MUROS QUE PIDEN TRES CARGAS DISTINTAS ──
     Su apice va de 1,54 a 3,51 bloques segun cuanto se mantenga el dedo, asi que
     el modo se juega MIDIENDO el tiempo. Los muros van en 1,2 · 2,2 · 3,0: el
     primero sale con un toque corto, el ultimo pide la carga entera y deja medio
     bloque de sobra. */
  robot(P, x, w){
    P.bloque(x + 7, 0, 0.9, 1.2);
    P.bloque(x + 15, 0, 0.9, 2.2);
    P.bloque(x + 24, 0, 0.9, 3.0);
    P.moneda(x + 24.4, 4.2);
  },

  /* ── LA ARANA: SE TELETRANSPORTA A LA CARA DE ENFRENTE ──
     Necesita las dos caras a la vez, asi que su tramo lleva techo; y como el
     cambio es instantaneo, lo que se prueba es el TIEMPO y no la trayectoria. */
  arana(P, x, w){
    P.techo(x, w, ALTO_ARANA);
    P.pico(x + 7); P.pico(x + 8);
    P.picoInv(x + 14, ALTO_ARANA); P.picoInv(x + 15, ALTO_ARANA);
    P.pico(x + 21); P.pico(x + 22);
    P.picoInv(x + 27, ALTO_ARANA);
  },

  /* ── EL COLUMPIO: PAREDES ANCHAS, PORQUE EL ARCO ES MAS GRANDE ──
     Invierte su gravedad, asi que no tiene tope de subida como la nave: el arco
     es simetrico y mas amplio. Con el hueco de la nave (3,4) se pasaba de largo,
     asi que va en 4,4 y las paredes cada diez. */
  columpio(P, x, w){
    P.techo(x, w, ALTO_COL);
    const abajos = [1.2, 2.4, 1.0];
    for (let i = 0; i < abajos.length; i++){
      const bx = x + 9 + i*10, hueco = 4.4, abajo = abajos[i];
      if (bx + 1.1 > x + w) break;
      P.bloque(bx, 0, 1.1, abajo);
      P.bloque(bx, abajo + hueco, 1.1, ALTO_COL - (abajo + hueco));
    }
  },

  /* ── EL FINAL: UNA CADENA DE ORBES SOBRE EL VACIO ──
     Es el unico tramo donde el vacio dura mas que un salto, asi que los orbes
     dejan de ser un adorno y pasan a ser el piso. Van cada cuatro bloques, que es
     exactamente lo que mide un salto: el que mantiene apretado los engancha en
     fila, y el que suelta se cae. */
  orbes(P, x, w){
    /* ── LA ALTURA DE LOS ORBES SALE DEL ARCO, NO SE ELIGE ──
       El salto describe `y = 9,6·u(1−u)` con `u = dx/4`, asi que a dos bloques del
       labio el cuerpo esta en 2,40 y el orbe se engancha si su y esta a menos de
       0,95 de `y + 0,43`. La primera version los puso en 2,0 a CUATRO bloques del
       labio, donde el arco ya bajo a 0,37: medido, la diferencia daba 1,20 y el
       orbe NO se enganchaba — el bot no saltaba nunca porque las dos ramas morian,
       y eso es exactamente la firma de un tramo imposible. A 2,5 de alto y cada
       cuatro bloques —que es lo que mide un salto— la cadena se engancha sola.
       Y todos amarillos: el rosa impulsa 0,72, o sea un arco de 2,88 bloques, y
       en el medio de una cadena de cuatro eso deja al jugador corto. */
    P.hueco(x + 4, x + 16);
    P.orbe(x + 6, 2.5, 'amar');
    P.orbe(x + 10, 2.5, 'amar');
    P.orbe(x + 14, 2.5, 'amar');
    P.moneda(x + 10, 4.6);
    P.pico(x + 20); P.pico(x + 24);
  }
};

function generaNivel(id, semilla){
  const N = NIVELES[id];
  sem((semilla || 1)*7919 + id*104729 + 11);
  const M = MUNDO;
  M.nivel = id; M.med = medidasDe(N.bpm);
  M.sol.length = 0; M.mat.length = 0; M.pads.length = 0; M.orbes.length = 0;
  M.portales.length = 0; M.monedas.length = 0; M.sierras.length = 0; M.techo.length = 0;
  M.tramos = [];
  M.largo = LARGO_NIVEL;

  /* la caja de herramientas de los tramos. Va como metodos y no como funciones
     sueltas para que un tramo no pueda escribir en otra cosa. */
  const huecos = [];
  const P = {
    pico(x){ M.mat.push(rect(x + 0.18, 0, 0.64, 0.82, 'pico')); },
    /* el pico invertido cuelga del techo, o sea que su punta mira abajo */
    picoInv(x, alto){ M.mat.push(rect(x + 0.18, alto - 0.82, 0.64, 0.82, 'picoInv')); },
    bloque(x, y, w, h){ M.sol.push(rect(x, y, w, h, 'bloque')); },
    sierra(x, y, r){ M.sierras.push({ x, y, r });
                     M.mat.push(rect(x - r*0.66, y - r*0.66, r*1.32, r*1.32, 'sierra')); },
    pad(x, t){ M.pads.push({ x, y: 0, t: t || 'amar' }); },
    orbe(x, y, t){ M.orbes.push({ x, y, t: t || 'amar', usado: false }); },
    moneda(x, y){ if (M.monedas.length < 3) M.monedas.push({ x, y, tomada: false }); },
    hueco(a, b){ huecos.push([a, b]); },
    /* el techo va a las DOS listas: `techo` es para dibujarlo y `sol` para que
       choque. Con una sola, el techo se ve y no frena, o frena y no se ve. */
    techo(x, w, alto){
      M.techo.push(rect(x, alto, w, 1.4, 'techo'));
      M.sol.push(rect(x, alto, w, 1.4, 'techo'));
    }
  };

  /* ── LOS PORTALES SE PONEN AL ARMAR EL TRAMO, NO EN UNA SEGUNDA LISTA ──
     Con dos listas —los tramos y sus portales— el dia que se mueva un tramo el
     portal queda donde estaba y el modo cambia a mitad de camino. */
  for (let i = 0; i < TRAMOS.length; i++){
    const T = TRAMOS[i], ant = i > 0 ? TRAMOS[i - 1] : null;
    if (ant && ant.modo !== T.modo) M.portales.push({ x: T.x + 1.0, t: T.modo });
    M.tramos.push({ x: T.x, w: T.w, modo: T.modo, pal: i });
    ARMA[T.arma](P, T.x, T.w);
  }

  /* ── EL PISO SE ARMA AL FINAL, DESCONTANDO LOS HUECOS ──
     Al revés —piso entero y después agujerearlo— habría que partir rectángulos
     que ya existen, y eso deja bordes duplicados que el choque resuelve dos veces. */
  huecos.sort((a, b) => a[0] - b[0]);
  let px = -20;
  for (const [a, b] of huecos){
    if (a > px) M.sol.push(rect(px, -6, a - px, 6, 'piso'));
    px = Math.max(px, b);
  }
  M.sol.push(rect(px, -6, M.largo + 40 - px, 6, 'piso'));
  /* la pared del final: no se puede pasar de largo */
  M.sol.push(rect(M.largo + 2, -6, 4, 30, 'meta'));
  indexaMundo();
  M.rev++;
  return M;
}

/* ── EL TRAMO EN EL QUE ESTA UNA X ──
   Lo usan la paleta y el rotulo del HUD. Con diez tramos una busqueda lineal
   alcanza, y con un modulo el color cambiaria a mitad de tramo — que es justo lo
   que los portales existen para evitar. */
function tramoDe(x){
  const L = MUNDO.tramos;
  for (let i = L.length - 1; i >= 0; i--) if (x >= L[i].x) return L[i];
  return L[0] || null;
}

/* ── EL SITIO EN BLOQUES DE UN TIEMPO DE COMPAS, Y AL REVES ──
   Estas dos son la juntura entre la musica y el nivel, y por eso viven en un
   solo sitio: con la cuenta escrita en dos lados, el dia que cambie
   `BLOQ_POR_TIEMPO` una de las dos queda apuntando a otro juego. */
const xDeTiempo = (t) => t*BLOQ_POR_TIEMPO;
const tiempoDeX = (x) => x/BLOQ_POR_TIEMPO;

/* ══════════ EL INDICE POR BLOQUE ══════════
   Sin esto el choque recorre los ~250 rectangulos del nivel en CADA paso, y el
   auto-jugador da varios miles de pasos por rama: validar tres niveles pasaria
   de segundos a minutos. Cada balde `i` guarda lo que se solapa con [i-1, i+2),
   asi que consultando por el bloque del jugador no hace falta mirar los vecinos.
   EL DESPLAZAMIENTO NO ES DECORATIVO: el piso arranca en x = -20 y la meta
   termina en largo+6, asi que sin corrimiento los indices negativos se recortan
   a cero y el primer bloque del nivel se consulta en el balde equivocado. */
const IDX_OFS = 26;
const VACIO = [];
function indexaLista(lista, largo){
  const idx = new Array(largo + IDX_OFS*2);
  for (const r of lista){
    const a = cl(Math.floor(r.x) - 1 + IDX_OFS, 0, idx.length - 1);
    const b = cl(Math.ceil(r.x + r.w) + 1 + IDX_OFS, 0, idx.length - 1);
    for (let i = a; i <= b; i++){ (idx[i] || (idx[i] = [])).push(r); }
  }
  for (let i = 0; i < idx.length; i++) if (!idx[i]) idx[i] = VACIO;
  return idx;
}
function cerca(idx, x){
  const i = Math.floor(x) + IDX_OFS;
  return (i >= 0 && i < idx.length) ? idx[i] : VACIO;
}
function indexaMundo(){
  MUNDO.iSol = indexaLista(MUNDO.sol, MUNDO.largo + 40);
  MUNDO.iMat = indexaLista(MUNDO.mat, MUNDO.largo + 40);
}
