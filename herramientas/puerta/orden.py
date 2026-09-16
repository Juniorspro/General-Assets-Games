# -*- coding: utf-8 -*-
"""Los seis niveles salen en orden al azar; la habitacion negra siempre primero.

POR QUE LA HABITACION QUEDA FIJA Y NO ENTRA EN EL SORTEO: es el prologo. No
tiene mecanica ni enemigo —es un cuarto negro y una puerta blanca— y lo unico
que hace es ensenar a caminar y a mirar. Sorteada en el medio, un jugador que
viene de la biblioteca aterriza en un tutorial; y sorteada al final, el juego
termina en la pieza mas vacia que tiene.

EL DEFECTO DE FONDO QUE ESTO ARREGLA: la cadena estaba escrita SEIS VECES. La
puerta del cuarto llamaba a `transitionToField`, la salida del campo a
`transitionToFarm`, el porton de la granja a `transitionToSchool`… o sea que el
orden no vivia en ningun sitio: vivia repartido en seis condiciones de choque a
dos mil lineas de distancia una de otra. Con eso, cambiar el orden es editar
seis sitios y olvidarse de uno deja un nivel inalcanzable sin que nada avise.

Ahora los seis llaman a `pbSiguiente()` y el orden vive en UN array. Eso es lo
que permite que sea al azar, y de paso lo que hace que agregar un nivel septimo
sea agregarlo a una lista.

Y EL ULTIMO NIVEL LLEVA AL FINAL, sea cual sea. Antes el final estaba clavado en
la puerta de servicio del local, asi que con el orden sorteado el local podia
salir tercero y el juego se habria terminado ahi, con tres niveles sin jugar.
`pbSiguiente()` es quien decide: si no queda nada en la lista, termina.
"""

# ══════════════════════════════════════════════════════════════════════════════
# EL ORDEN Y EL PASO
# ══════════════════════════════════════════════════════════════════════════════
JS = r"""
  // ==================================================================
  // EL ORDEN DE LOS NIVELES
  // ==================================================================
  // La habitacion (0) no esta en la lista: es el prologo y va siempre primera.
  // Los seis que si se sortean son el campo, la granja, la escuela, la
  // biblioteca, el calabozo y el local.
  const PB_NIVELES = [1, 2, 3, 4, 5, 6];
  let PB_ORDEN = PB_NIVELES.slice();
  let pbPaso = -1; // -1 es el prologo; de 0 en adelante indexa PB_ORDEN

  // Fisher-Yates y no `sort(() => Math.random() - 0.5)`: ese comparador no es
  // consistente, asi que el reparto que devuelve depende del algoritmo de
  // ordenamiento del navegador y no es uniforme en ninguno.
  function pbMezclaOrden() {
    PB_ORDEN = PB_NIVELES.slice();
    for (let i = PB_ORDEN.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = PB_ORDEN[i]; PB_ORDEN[i] = PB_ORDEN[j]; PB_ORDEN[j] = t;
    }
    pbPaso = -1;
    return PB_ORDEN.slice();
  }

  // EL MISMO if-chain QUE `startLevel`, EN UN SOLO SITIO. Escrito dos veces, el
  // dia que se agregue un nivel uno de los dos se queda corto y el nivel nuevo
  // se vuelve inalcanzable por el camino del jugador pero alcanzable por la
  // sonda, que es el defecto mas difícil de ver que puede tener esto.
  function pbEntra(n) {
    if (n === 0) enterRoom();
    else if (n === 1) enterField();
    else if (n === 2) enterFarm();
    else if (n === 3) enterSchool();
    else if (n === 4) enterLibrary();
    else if (n === 5) enterDungeon();
    else enterStore();
  }

  // LA UNICA PUERTA DE SALIDA DE CUALQUIER NIVEL.
  function pbSiguiente() {
    pbPaso++;
    if (pbPaso >= PB_ORDEN.length) {
      // EL TEXTO DEL FINAL ES GENERICO A PROPOSITO: con el orden sorteado, el
      // ultimo nivel cambia en cada partida, asi que un final que hable del
      // calabozo o del local seria falso cinco de cada seis veces.
      endTitle.innerHTML = '&#128682; Cruzaste las seis puertas';
      endText.textContent = pbTrad('Seis puertas, seis sitios, y ninguno era una salida. Fin de esta version de la demo.');
      transitionToEnd();
      return;
    }
    fadeTo(() => { pbEntra(PB_ORDEN[pbPaso]); });
  }
"""

# ══════════════════════════════════════════════════════════════════════════════
# LAS SEIS SALIDAS PASAN A SER UNA
# ══════════════════════════════════════════════════════════════════════════════
SALIDAS = [
    ('la puerta del cuarto',
     "if (!transitioning && Math.hypot(dx, dz) < 1.6) { transitioning = true; transitionToField(); }",
     "if (!transitioning && Math.hypot(dx, dz) < 1.6) { transitioning = true; pbSiguiente(); }"),
    ('la salida del campo', "        transitionToFarm();", "        pbSiguiente();"),
    ('el porton de la granja', "        transitionToSchool();", "        pbSiguiente();"),
    ('la puerta de la escuela', "        transitionToLibrary();", "        pbSiguiente();"),
    ('la puerta de la biblioteca', "        transitionToDungeon();", "        pbSiguiente();"),
]

# el local: su puerta de servicio terminaba el juego con su propio texto
VIEJO_STORE = """        transitioning = true;
        endTitle.innerHTML = '&#127828; Saliste del local';
        endText.textContent = 'Armaste la hamburguesa entera con esa cosa pisandote los talones y cruzaste la puerta de servicio. Fin de esta version de la demo.';
        transitionToEnd();
        return;"""
NUEVO_STORE = """        transitioning = true;
        pbSiguiente();
        return;"""

# UNA SONDA QUE SALTA A UN NIVEL TIENE QUE DEJAR EL PASO DONDE CORRESPONDE, si
# no, salir de ese nivel manda al primero de la lista y la cadena queda mintiendo.
VIEJO_START = """  function startLevel(n) {
    closeMenu();"""
NUEVO_START = """  function startLevel(n) {
    closeMenu();
    pbPaso = (n === 0) ? -1 : PB_ORDEN.indexOf(n);"""
