
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
/* ── EL MUNDO ES UNA VARIABLE Y NO UNA CONSTANTE, POR LA VALIDACION DE FONDO ──
   El segundo nivel dura cuatro minutos y validarlo con el bot cuesta cinco
   segundos de hilo: en la pantalla de carga eso es una espera, y en un telefono
   el doble. Se valida en el fondo, en rebanadas de seis milisegundos mientras el
   menu corre — y como toda la fisica lee `MUNDO`, la rebanada cambia la
   referencia por el mundo que esta validando y la devuelve al terminar. Con una
   constante habria que pasarle el mundo a treinta funciones. */
function mundoNuevo(){ return {
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
  iSol: [], iMat: [], adornos: []
}; }
let MUNDO = mundoNuevo();

const rect = (x, y, w, h, t) => ({ x, y, w, h, t });

/* ══════════ EL NIVEL, TRAMO POR TRAMO ══════════
   ── ESTE NIVEL ESTA ESCRITO Y NO SORTEADO, Y ES A PROPOSITO ──
   Los tres niveles anteriores se generaban con patrones al azar y semilla, y eso
   servia para tres temas de un solo modo. Con OCHO modos en un nivel el azar no
   sirve: cada modo pide su propia altura de pasillo, su propia distancia entre
   paredes y su propio portal, y un sorteo que respete todo eso ya es una lista
   escrita. Lo que NO cambia es la validacion: el auto-jugador de `g.js` lo tiene
   que terminar al 100 %, y comparte la fisica con el juego.

   ── Y LOS TRAMOS VIVEN EN `NIVELES[id].tramos` ──
   En bloques (`w`) o en tiempos (`b`), con su velocidad: un tramo de `b` tiempos
   a velocidad `vel` mide `b · 4 · vel` bloques. Los tramos caen en compases
   enteros —32 tiempos son ocho compases— asi que los portales caen en el primer
   tiempo de un compas. A mitad de compas el cambio de modo se lee a error.

   ── LA VELOCIDAD ES DEL SITIO, NO DEL CUERPO ──
   `velEn(x)` devuelve el multiplicador del tramo que contiene a `x`. Lo usan la
   integracion del bot, el reloj de audio (`xDeTiempo`) y la onda: una sola
   tabla, asi que la x que sale del tema y la x integrada recorren el mismo
   camino. En GD la velocidad cambia el avance y NO el salto: el salto sigue
   durando un tiempo, asi que a 1,5x mide seis bloques y a 0,75x mide tres. Es
   lo que hace que el mismo patron sea otro patron a otra velocidad. */
function velEn(x){
  const L = MUNDO.tramos;
  for (let i = L.length - 1; i >= 0; i--) if (x >= L[i].x) return L[i].vel || 1;
  return L.length ? (L[0].vel || 1) : 1;
}

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
    /* 2,2 y no 3,0: el robot llega a 3,51 a plena carga, pero 3,0 pide el 78 %
       de la carga y el bot —que aprieta tarde— la perdia en una fase de doce; con
       2,6 la perdia en una de veinticuatro. Con 2,2 sigue haciendo falta cargar
       (el toque minimo da 1,54) y las veinticuatro fases pasan. */
    P.bloque(x + 24, 0, 0.9, 2.2);
    P.moneda(x + 24.4, 3.5);
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
    /* ── Y VAN CADA 3,6 BLOQUES, NO CADA CUATRO ──
       Cuatro es exactamente el largo del salto, o sea que el siguiente orbe cae
       donde el arco vuelve a su altura: un filo. Con 3,6 el cuerpo llega todavia
       bajando y entra por el medio de la ventana, no por el borde. */
    P.hueco(x + 4, x + 16);
    P.orbe(x + 6, 2.5, 'amar');
    P.orbe(x + 9.6, 2.5, 'amar');
    P.orbe(x + 13.2, 2.5, 'amar');
    P.moneda(x + 9.6, 4.6);
    P.pico(x + 20); P.pico(x + 24);
  },

  /* ══════════ LOS CONSTRUCTORES DEL SEGUNDO NIVEL ══════════
     ── TODO SE ESCRIBE EN TIEMPOS, Y `J` SON LOS BLOQUES DE UN TIEMPO ──
     `J = 4·vel`: a 1x son cuatro bloques, a 1,5x seis, a 0,75x tres. Un salto
     mide exactamente `J` de largo en cualquier velocidad, asi que «un pico cada
     dos tiempos» es `2·J` y sirve en los tres. Las alturas NO se escalan: el
     apice es 2,4 bloques a cualquier velocidad, porque la gravedad no cambia.
     Y cada cosa cae en un tiempo o en una corchea (`J/2`), que es la grilla. */

  /* la entrada: cuatro compases casi vacios sobre la intro del tema, con dos
     picos sueltos al final para que la primera decision llegue con el primer
     golpe de bombo */
  intro(P, x, w, J){
    P.pico(x + 11*J); P.pico(x + 13*J);
    P.pico(x + 14.5*J); P.pico(x + 14.5*J + 1);
  },

  /* ── EL CUBO LARGO: LO QUE EN GD ES «BLOCK DESIGN» ──
     Picos sueltos, dobles, un pilar al que hay que SUBIRSE y desde el que se
     baja (se puede estar parado: lo unico que mata es el pico), un pad, una
     cadena corta de orbes y un hueco. Los pilares miden 1,6 de alto —un salto
     los clarea y tambien los pisa— y 2 de ancho, que es lo que hace falta para
     caer y volver a despegar. */
  cubo2(P, x, w, J){
    P.pico(x + 2*J); P.pico(x + 4*J);
    P.pico(x + 6*J); P.pico(x + 6*J + 1);                 /* doble */
    /* el pilar: se puede subir y quedarse; la moneda va arriba */
    P.bloque(x + 9*J, 0, 2.0, 1.6);
    P.pico(x + 12*J);
    P.pico(x + 14*J); P.pico(x + 14*J + 1);
    /* un pad amarillo lanza al doble: cae 5,66 bloques despues, o sea antes del
       pico que viene a 2·J */
    P.pad(x + 17*J, 'amar'); P.moneda(x + 17*J + 2.83, 5.0);
    P.pico(x + 19.5*J);
    /* ── DOS PILARES SEGUIDOS, ESCALON, Y LA DISTANCIA ES UNA CUENTA ──
       Al segundo se llega saltando desde el primero: el salto mide 4 y el
       despegue puede ser en cualquier punto de los 2,43 del pilar, asi que el
       aterrizaje cae entre 0,7 y 5,8 bloques despues del borde. Con el segundo
       pilar a 3,0 del inicio del primero hay solape; a un tiempo entero (4) no
       habia ninguno —medido en la primera version: el bot bajaba al piso y desde
       el piso un pilar de 3,0 no se alcanza, porque el apice es 2,4—. */
    P.bloque(x + 22*J, 0, 2.0, 1.6);
    P.bloque(x + 22*J + 3.0, 0, 2.0, 2.6);
    P.pico(x + 26*J);
    /* el hueco del final con un orbe amarillo en el medio */
    P.hueco(x + 28*J, x + 28*J + 1.6*J);
    P.orbe(x + 28*J + 0.8*J, 2.3, 'amar');
    P.pico(x + 31*J);
  },

  /* la nave larga: ocho paredes, huecos que suben y bajan, y dos monedas */
  nave2(P, x, w, J){
    P.techo(x, w, ALTO_PASILLO);
    const abajos = [1.0, 2.6, 0.8, 3.0, 1.6, 2.8, 1.0, 2.2];
    for (let i = 0; i < abajos.length; i++){
      const bx = x + 2*J + i*3.5*J, hueco = 3.4, abajo = abajos[i];
      if (bx + 1.2 > x + w - 2) break;
      P.bloque(bx, 0, 1.2, abajo);
      P.bloque(bx, abajo + hueco, 1.2, ALTO_PASILLO - (abajo + hueco));
    }
  },

  /* la bola larga: picos que alternan piso y techo cada dos tiempos, con un par
     de bloques bajos que obligan a pasar por arriba */
  bola2(P, x, w, J){
    P.techo(x, w, ALTO_BOLA);
    for (let i = 0; i < 12; i++){
      const bx = x + 2*J + i*2.4*J;
      if (bx + 2 > x + w - 1) break;
      if (i % 3 === 2){ P.bloque(bx, 0, 1.4, 1.2); continue; }
      if (i % 2 === 0){ P.pico(bx); P.pico(bx + 1); }
      else { P.picoInv(bx, ALTO_BOLA); P.picoInv(bx + 1, ALTO_BOLA); }
    }
  },

  /* ── EL CUBO A 1,5x: EL MISMO VOCABULARIO, EL DOBLE DE RITMO ──
     Con `J = 6` el salto mide seis bloques y clarea hasta 4,9 de picos: entran
     los triples, que a 1x son imposibles. Y los huecos pueden medir cinco. */
  cuboRapido(P, x, w, J){
    P.pico(x + 2*J); P.pico(x + 3*J);
    P.pico(x + 5*J); P.pico(x + 5*J + 1); P.pico(x + 5*J + 2);      /* triple */
    P.pico(x + 7.5*J);
    P.bloque(x + 9*J, 0, 2.4, 1.6);
    P.pico(x + 11*J); P.pico(x + 11*J + 1);
    P.hueco(x + 13*J, x + 13*J + 4.6);
    P.pico(x + 15.5*J); P.pico(x + 15.5*J + 1); P.pico(x + 15.5*J + 2);
    P.pad(x + 18*J, 'rosa'); P.pico(x + 18*J + 3);
    P.pico(x + 20*J); P.pico(x + 21*J); P.pico(x + 22*J);
    P.orbe(x + 24*J, 2.4, 'amar'); P.hueco(x + 23.5*J, x + 23.5*J + 5.0);
    P.pico(x + 27*J); P.pico(x + 27*J + 1);
    P.pico(x + 29.5*J); P.pico(x + 29.5*J + 1); P.pico(x + 29.5*J + 2);
  },

  /* la onda larga: zigzag con paredes cada tiempo y medio; los huecos suben y
     bajan como maximo 2,2 por pared, que a 45 grados es lo que se puede */
  onda2(P, x, w, J){
    P.techo(x, w, ALTO_ONDA);
    const alturas = [1.0, 3.2, 1.0, 2.2, 3.2, 1.6, 0.8, 2.6, 1.2, 3.0, 1.8, 1.0, 2.8, 1.4, 2.4, 1.0, 3.0, 1.6, 2.6];
    for (let i = 0; i < alturas.length; i++){
      const bx = x + 2*J + i*1.5*J, abajo = alturas[i], hueco = 1.9;
      if (bx + 1.0 > x + w - 1.5) break;
      P.bloque(bx, 0, 1.0, abajo);
      P.bloque(bx, abajo + hueco, 1.0, ALTO_ONDA - (abajo + hueco));
    }
  },

  /* el ovni largo: pilares de dos alturas y dos huecos */
  ovni2(P, x, w, J){
    P.techo(x, w, ALTO_OVNI);
    const alt = [1.6, 1.6, 2.4, 1.6, 2.4, 3.2, 1.6, 2.4];
    for (let i = 0; i < alt.length; i++){
      const bx = x + 2*J + i*3*J;
      if (bx + 1.2 > x + w - 4) break;
      P.bloque(bx, 0, 1.2, alt[i]);
    }
    P.hueco(x + 12.5*J, x + 12.5*J + 4.0);
    P.hueco(x + 26*J, x + 26*J + 4.0);
  },

  /* el robot largo: muros de tres alturas que piden tres cargas, y uno alto que
     se PISA en vez de saltarse: el robot tambien puede quedarse arriba */
  robot2(P, x, w, J){
    const alt = [1.2, 2.2, 1.2, 2.2, 1.6, 2.2, 1.2, 2.2, 1.6];
    for (let i = 0; i < alt.length; i++){
      const bx = x + 2*J + i*3*J;
      if (bx + 1 > x + w - 3) break;
      P.bloque(bx, 0, 0.9, alt[i]);
    }
    P.bloque(x + 29*J, 0, 3.0, 1.8);
  },

  /* la arana larga: picos alternando piso y techo, con dos bloques en el medio */
  arana2(P, x, w, J){
    P.techo(x, w, ALTO_ARANA);
    for (let i = 0; i < 10; i++){
      const bx = x + 2*J + i*2.8*J;
      if (bx + 2 > x + w - 1) break;
      if (i % 2 === 0){ P.pico(bx); P.pico(bx + 1); }
      else { P.picoInv(bx, ALTO_ARANA); P.picoInv(bx + 1, ALTO_ARANA); }
    }
  },

  /* el columpio largo: paredes anchas cada dos tiempos y medio */
  columpio2(P, x, w, J){
    P.techo(x, w, ALTO_COL);
    const abajos = [1.2, 2.4, 1.0, 2.0, 1.4, 2.6, 1.0, 2.2, 1.6, 2.4];
    for (let i = 0; i < abajos.length; i++){
      const bx = x + 2*J + i*2.5*J, hueco = 4.4, abajo = abajos[i];
      if (bx + 1.1 > x + w - 2) break;
      P.bloque(bx, 0, 1.1, abajo);
      P.bloque(bx, abajo + hueco, 1.1, ALTO_COL - (abajo + hueco));
    }
  },

  /* ── EL TRAMO LENTO: A 0,75x EL SALTO MIDE TRES BLOQUES ──
     Es donde entra la GRAVEDAD INVERTIDA del cubo, que es un estilo de GD por
     derecho propio: se camina por el techo con los picos colgando. El portal
     azul va con techo puesto, y el de vuelta antes de que se acabe el techo.
     Los picos van cada dos tiempos porque a esta velocidad un tiempo son tres
     bloques y un pico ocupa uno: cada tiempo seria un muro. */
  lento(P, x, w, J){
    /* sin picos dobles: a 0,75x el salto mide tres bloques y clarea 2,56 de
       pico, y un doble con la caja interior ocupa 2,53 — eso no es dificultad,
       es un cuadro de margen */
    P.pico(x + 2*J); P.pico(x + 4*J);
    P.pico(x + 6*J);
    P.bloque(x + 8*J, 0, 1.6, 1.4);
    /* el techo del tramo invertido, y los dos portales de gravedad */
    P.techo(x + 11*J, 14*J, ALTO_GRAV);
    P.gravedad(x + 12*J, 'grav');
    for (let i = 0; i < 5; i++) P.picoInv(x + 14*J + i*2*J, ALTO_GRAV);
    P.gravedad(x + 24*J, 'norm');
    P.pico(x + 27*J); P.pico(x + 29*J);
  },

  /* la nave a 1,5x: paredes cada dos tiempos —doce bloques— y el hueco de 3,4 */
  naveRapida(P, x, w, J){
    P.techo(x, w, ALTO_PASILLO);
    const abajos = [1.4, 2.8, 1.0, 3.0, 1.8, 2.6, 1.2, 2.4, 1.6, 2.8, 1.0, 2.2, 1.8];
    for (let i = 0; i < abajos.length; i++){
      const bx = x + 2*J + i*2*J, hueco = 3.4, abajo = abajos[i];
      if (bx + 1.2 > x + w - 2) break;
      P.bloque(bx, 0, 1.2, abajo);
      P.bloque(bx, abajo + hueco, 1.2, ALTO_PASILLO - (abajo + hueco));
    }
  },

  /* ── LAS ESCALERAS: BLOQUES QUE SE PISAN, SUBIENDO Y BAJANDO ──
     Es el tramo que existe porque «sobre un bloque se puede estar». Cada escalon
     sube 1,6 —el apice es 2,4— y esta a un salto del anterior; despues se baja
     por escalones mas anchos, y en el llano hay picos entre pilares. */
  escaleras(P, x, w, J){
    P.pico(x + 2*J); P.pico(x + 2*J + 1);
    /* escalones de 1,4 y no de 1,6: la camara sube como mucho 3,2, asi que el
       borde de arriba de la vista queda en 8,6, y desde el cuarto escalon (5,6)
       el apice del salto llega a 8,0 — con 1,6 se salia del cuadro */
    for (let i = 0; i < 4; i++) P.bloque(x + 4*J + i*J, 0, J*0.6, 1.4*(i + 1));
    P.moneda(x + 7*J + 1.8, 5.6 + 1.2);
    for (let i = 0; i < 4; i++) P.bloque(x + 8*J + i*J, 0, J*0.6, 1.4*(4 - i));
    P.pico(x + 13*J); P.pico(x + 13*J + 1);
    P.bloque(x + 15*J, 0, 2.4, 1.6);
    P.pico(x + 17*J); P.pico(x + 17*J + 1); P.pico(x + 17*J + 2);
    /* el pilar con el pico ENCIMA: la pieza mas vista de GD. Mide 1,0 y el pico
       0,82, o sea 1,82 en total: se pasa por arriba con el arco entre u 0,21 y
       0,79, que a 1,5x son 3,5 bloques de ventana */
    P.bloque(x + 19.5*J, 0, 2.4, 1.0); P.picoEn(x + 19.5*J + 0.9, 1.0);
    /* 2,2 y no 3,0: desde el piso el apice es 2,4 y un pilar de 3,0 no se pisa */
    P.bloque(x + 22*J, 0, 2.4, 2.2);
    /* picos a tiempo y medio: a un tiempo exacto —seis bloques, lo que mide el
       salto— se aterriza justo en el siguiente */
    P.pico(x + 25*J); P.pico(x + 26.5*J); P.pico(x + 28*J);
    P.hueco(x + 29.5*J, x + 29.5*J + 4.8);
  },

  /* ── EL FINAL: ORBES SOBRE EL VACIO Y PADS, TODO LO QUE EL NIVEL ENSEÑO ──
     Tres cadenas de orbes cada 0,9·J, un pad rojo que lanza alto y una moneda
     en el apice, y la ultima fila de picos. */
  final2(P, x, w, J){
    P.pico(x + 2*J); P.pico(x + 3*J);
    P.hueco(x + 5*J, x + 5*J + 3*J);
    P.orbe(x + 5.5*J, 2.5, 'amar'); P.orbe(x + 6.4*J, 2.5, 'amar'); P.orbe(x + 7.3*J, 2.5, 'amar');
    P.pico(x + 10*J); P.pico(x + 10*J + 1);
    /* el pad rojo lanza 1,18·√2 del impulso: apice 6,7 y vuelo 6,7 bloques. La
       moneda va en el apice, que es el unico sitio del vuelo al que se llega */
    P.pad(x + 12*J, 'rojo'); P.moneda(x + 12*J + 3.34, 6.9);
    P.pico(x + 14*J); P.pico(x + 14*J + 1);
    P.hueco(x + 17*J, x + 17*J + 3*J);
    P.orbe(x + 17.5*J, 2.5, 'amar'); P.orbe(x + 18.4*J, 2.5, 'amar'); P.orbe(x + 19.3*J, 2.5, 'amar');
    P.pico(x + 22*J); P.pico(x + 24*J); P.pico(x + 24*J + 1);
    P.bloque(x + 26*J, 0, 2.0, 1.6);
    P.pico(x + 28.5*J); P.pico(x + 28.5*J + 1);
    P.pico(x + 30.5*J);
  },

  /* la salida: tres compases vacios para llegar a la meta con el acorde final */
  salida(P, x, w, J){ }
};

function generaNivel(id, semilla){
  const N = NIVELES[id];
  sem((semilla || 1)*7919 + id*104729 + 11);
  const M = MUNDO;
  M.nivel = id; M.med = medidasDe(N.bpm);
  M.sol.length = 0; M.mat.length = 0; M.pads.length = 0; M.orbes.length = 0;
  M.portales.length = 0; M.monedas.length = 0; M.sierras.length = 0; M.techo.length = 0;
  M.tramos = []; M.adornos = [];

  /* la caja de herramientas de los tramos. Va como metodos y no como funciones
     sueltas para que un tramo no pueda escribir en otra cosa. */
  const huecos = [];
  const P = {
    pico(x){ M.mat.push(rect(x + 0.18, 0, 0.64, 0.82, 'pico')); },
    /* un pico apoyado sobre un pilar: la misma piramide, a otra altura */
    picoEn(x, y){ M.mat.push(rect(x + 0.18, y, 0.64, 0.82, 'pico')); },
    /* el pico invertido cuelga del techo, o sea que su punta mira abajo */
    picoInv(x, alto){ M.mat.push(rect(x + 0.18, alto - 0.82, 0.64, 0.82, 'picoInv')); },
    bloque(x, y, w, h){ M.sol.push(rect(x, y, w, h, 'bloque')); },
    sierra(x, y, r){ M.sierras.push({ x, y, r });
                     M.mat.push(rect(x - r*0.66, y - r*0.66, r*1.32, r*1.32, 'sierra')); },
    pad(x, t){ M.pads.push({ x, y: 0, t: t || 'amar' }); },
    orbe(x, y, t){ M.orbes.push({ x, y, t: t || 'amar', usado: false }); },
    moneda(x, y){ if (M.monedas.length < 3) M.monedas.push({ x, y, tomada: false }); },
    hueco(a, b){ huecos.push([a, b]); },
    /* los portales de gravedad que pone un tramo (el lento camina por el techo) */
    gravedad(x, t){ M.portales.push({ x, t: t || 'grav' }); },
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
  /* ── LA X DE CADA TRAMO SE ACUMULA, Y EL LARGO SALE DE LA SUMA ──
     Un tramo mide `w` bloques si los declara, o `b · 4 · vel` si declara tiempos.
     `t0` y `dur` son sus tiempos de compas, que es lo que `xDeTiempo` necesita
     para llevar el reloj de audio a bloques con la velocidad de cada tramo. */
  const TL = N.tramos;
  let xa = 0, ta = 0;
  const tramos = TL.map((T, i) => {
    const vel = T.vel || 1;
    const w = T.w != null ? T.w : T.b*BLOQ_POR_TIEMPO*vel;
    const dur = w/(BLOQ_POR_TIEMPO*vel);
    const o = { x: xa, w, modo: T.modo, pal: i, vel, t0: ta, dur, estilo: T.estilo || 'sol',
                frente: !!T.frente, arma: T.arma };
    xa += w; ta += dur;
    return o;
  });
  M.tramos = tramos;
  M.largo = xa;
  for (let i = 0; i < tramos.length; i++){
    const T = tramos[i], ant = i > 0 ? tramos[i - 1] : null;
    /* ── EL PORTAL DE VELOCIDAD VA UN PASO ANTES DEL TRAMO ──
       La velocidad cambia en `T.x` por construccion (`velEn` mira la tabla); el
       portal es el AVISO y por eso va justo antes, donde el jugador lo cruza un
       instante antes de que el avance cambie. Es como van en GD: el portal de
       velocidad delante de la seccion que acelera. */
    if (ant && ant.vel !== T.vel) M.portales.push({ x: T.x - 0.4, t: 'vel', k: T.vel });
    if (ant && ant.modo !== T.modo){
      M.portales.push({ x: T.x + 1.0, t: T.modo });
      /* ── DESPUES DE UN MODO QUE DA VUELTA LA GRAVEDAD VA UN PORTAL DE GRAVEDAD ──
         La bola y la arana salen de su tramo con la gravedad que les quedo. Medido
         con doce fases de entrada: en una, la bola termino invertida, el ovni
         «cayo» hasta su techo de 8,2 y entro al tramo de la onda POR ENCIMA de su
         techo de 5,6 — fuera del pasillo, sin nada que la frenara, hasta el plano
         de muerte en y 20. Es lo que hace GD: el portal de modo va en pareja con el
         de gravedad normal. */
      /* Y VA DESPUES DEL DE MODO, NO ANTES. Puesto un bloque antes, entre los dos
         portales el cuerpo sigue siendo bola y un toque contra el piso le da vuelta
         la gravedad OTRA VEZ: medido, con el portal de gravedad adelante la fase 5
         volvia a morir en x 157. Despues del cambio de modo ya no hay quien la
         deshaga. Un bloque y pico de separacion, que es como van en pareja en GD. */
      if (ant.modo === 'bola' || ant.modo === 'arana') M.portales.push({ x: T.x + 2.2, t: 'norm' });
    }
    ARMA[T.arma](P, T.x, T.w, BLOQ_POR_TIEMPO*T.vel, T);
    armaAdornos(M, T, i);
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
/* ── Y VAN POR TRAMOS, PORQUE LA VELOCIDAD CAMBIA ──
   Dentro de un tramo la x es lineal en el tiempo con la pendiente `4·vel`;
   entre tramos se empalma con `x` y `t0`, que se acumularon al generar. Antes
   del primer tramo y despues del ultimo rige la velocidad del que toca. */
function xDeTiempo(t){
  const L = MUNDO.tramos;
  if (!L.length) return t*BLOQ_POR_TIEMPO;
  let T = L[0];
  for (let i = L.length - 1; i >= 0; i--) if (t >= L[i].t0){ T = L[i]; break; }
  return T.x + (t - T.t0)*BLOQ_POR_TIEMPO*(T.vel || 1);
}
function tiempoDeX(x){
  const L = MUNDO.tramos;
  if (!L.length) return x/BLOQ_POR_TIEMPO;
  let T = L[0];
  for (let i = L.length - 1; i >= 0; i--) if (x >= L[i].x){ T = L[i]; break; }
  return T.t0 + (x - T.x)/(BLOQ_POR_TIEMPO*(T.vel || 1));
}

/* ══════════ LOS ADORNOS DENTRO DEL MAPA ══════════
   ── LO QUE EL PEDIDO LLAMA «DENTRO DEL MAPA»: COSAS EN EL NIVEL QUE NO SON
   OBSTACULOS ──
   Columnas detras del plano de juego, faroles encima, cadenas colgando de los
   techos de los pasillos. Van a z negativa —detras de la banda de juego— asi
   que no pueden tapar un pico, y su forma sale del estilo del tramo: el neon
   lleva postes finos con luz arriba, el blanco bloques limpios, el sol columnas
   de piedra. Salen del azar con semilla, o sea que son parte del nivel y no
   cambian entre intentos. */
function armaAdornos(M, T, i){
  const J = BLOQ_POR_TIEMPO*(T.vel || 1);
  const conTecho = M.techo.some(r => r.x <= T.x + 1 && r.x + r.w >= T.x + T.w - 1);
  const alto = conTecho ? (ALTO_MODO[T.modo] || 7) : 0;
  /* una columna cada dos tiempos, corrida media corchea al azar */
  for (let bx = T.x + J*1.5; bx < T.x + T.w - J; bx += J*2){
    const h = conTecho ? alto : azr(2.2, 5.6);
    const x = bx + azr(-0.4, 0.4);
    if (T.estilo === 'neon'){
      M.adornos.push({ x, y: 0, w: 0.22, h: conTecho ? alto : h, z: -PROF - 0.6, d: 0.22, t: 'poste' });
      M.adornos.push({ x: x - 0.12, y: h - 0.10, w: 0.46, h: 0.20, z: -PROF - 0.7, d: 0.46, t: 'luz' });
    } else if (T.estilo === 'blanco'){
      M.adornos.push({ x, y: 0, w: 0.9, h: h*0.55, z: -PROF - 1.2, d: 0.9, t: 'bloque' });
    } else {
      M.adornos.push({ x, y: 0, w: 0.6, h, z: -PROF - 0.9, d: 0.6, t: 'columna' });
      M.adornos.push({ x: x - 0.15, y: h, w: 0.9, h: 0.24, z: -PROF - 1.05, d: 0.9, t: 'capitel' });
    }
  }
  /* y del techo cuelgan cadenas, en los tramos que lo tienen */
  if (conTecho){
    for (let bx = T.x + J*2.5; bx < T.x + T.w - J; bx += J*3){
      const L = azr(0.8, 1.8);
      M.adornos.push({ x: bx, y: alto - L, w: 0.10, h: L, z: -PROF - 0.5, d: 0.10, t: 'cadena' });
      M.adornos.push({ x: bx - 0.16, y: alto - L - 0.28, w: 0.42, h: 0.30, z: -PROF - 0.55, d: 0.42, t: 'luz' });
    }
  }
}

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
