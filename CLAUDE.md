# Notas del proyecto

## Palabra clave: "Pope"

Cuando el usuario escriba **"Pope"** (solo, o dentro de un mensaje), significa
**"seguí con la lista de pendientes de abajo"**, sin volver a preguntar qué hacer.
Arrancar por el primero que siga sin tildar, y tildarlo acá al terminarlo y pushearlo.


## Los juegos de `juegos-pc/`

- **`Campo_de_Tiro.html` ES "Z Force"** (1,83 MB). Es el proyecto grande: FPS con campo de
  tiro, todos-contra-todos, duelo de equipos y battle royale. **NO SE TOCA NI SE BORRA**:
  el usuario lo quiere guardado para retomarlo. Sus pendientes son la lista de abajo.
- **`Maicol.html` es "Maicol"** (~300 KB, de los cuales ~200 KB son los sprites y los fondos).
  Plataformas 2D, siete niveles, hay que rescatar a Maicolito. Arte generado con Higgsfield.
- **`Pompom.html` es "POMPOM"** (~150 KB, sin un solo asset: todo se dibuja por código, incluidos la
  historia, el fondo, los gorritos y la música). **Se llamaba `Pelusa.html`**; el personaje sigue
  siendo Pelusín. Juego 2D de tranquilidad: la pelusa está pegada a un punto, hay una línea recta
  marcada hasta el siguiente y alrededor de ese punto giran pelusas con espinas. Se toca y sale; si
  una espina la toca en el camino, se pierde una de las **cuatro vidas**. **8 mundos × 20 niveles =
  160**, procedurales con semilla y **validados uno por uno** — y jugados solos de punta a punta.
  El menú es un **hub**: Pelusín en el medio siguiendo el dedo, JUGAR abajo, niveles arriba y las dos
  tiendas (colores y gorritos) a los costados.
  Pedido textual: *"un juego 2D de tranquilidad, de 20 niveles y 6 mundos ... apretamos y nuestro
  muñequito peludo se moverá hacia un punto ya que pasará por una línea recta marcada, pero hay que
  tener cuidado ya que al punto en el que quiere ir hay bolas malas con espinas girando alrededor de
  la bola y hay que tocar justo ... procedural con físicas ... una beta del nivel 1 tutorial ...
  buenos gráficos blancos minimalistas"*.
- **`Recreo.html` es "RECREO"** (~902 KB: 489 son el modelo 3D de Baldi generado con Higgsfield y
  horneado, y 25 la voz generada; la música es procedural y pesa cero). **Recreación de fan, no comercial y sin publicar**, del colegio y del
  profesor de Baldi's Basics (Basically Games / mystman12). **Vertical (9:16), FOV 90 y el jugador no
  maneja la cámara**: va sobre rieles. Baldi te saluda, te enseña a usar las manos —cinco dedos,
  pinza, dos dedos— te lleva a un aula, se pone del otro lado del escritorio con el pizarrón, y
  aparece **un libro flotante con una cuenta que se contesta con los dedos**: cuatro más cuatro son
  ocho dedos, o sea las dos manos (MediaPipe, `numHands:2`). Son **8 aulas con un libro y 3 cuentas
  cada una (24)**, y en los pasillos de en medio hay **7 tandas de bichos que se revientan haciendo
  pinza encima**. **Una cuenta mal y te mata con un screamer**; volvés al principio de esa aula.
  Las manos se ven **en 3D dentro del juego**, con profundidad, reconstruidas punto por punto sobre su
  rayo de pantalla; MediaPipe corre **fuera del hilo de render** a 24 Hz con los puntos interpolados a
  60. Usa la **cámara trasera** y no se muestra en pantalla. En los pasillos rotan **tres**
  actividades: bichos, tizas que caen y casilleros. Con **filtro de saturación y de baja calidad**
  (pixelado real) y respaldo de teclado numérico —y de toque— para quien no tenga cámara. Simulación a **60 pasos fijos con
  interpolación**. El juego vive partido en `herramientas/recreo/partes/` y se arma con
  `python3 herramientas/recreo/armar.py`.
- **`Eco.html` es "Eco"** (~215 KB, de los cuales 77 KB son la foto de la hoja), beta nueva y aparte. Laberinto a ciegas: el mundo está
  negro y solo se ve por ecolocación, en blanco y negro. Pedido textual: *"un entorno 3D
  con las mismas características de primera persona buen movimiento etc y manos en primera
  persona no armas y un menú super simple ... puedes ver tu cuerpo completo pero no ves el
  entorno solo lo ves al caminar porque hacer ruido manda impulsos que hace que puedas ver
  en blanco y negro ondas que remarcan todo el laberinto"*.

### Vigesimoquinta vuelta (2026-08-27): **RECREO** — MediaPipe fuera del render, manos 3D, cámara trasera, tres actividades, voz y música

Pedido: cámara trasera; interpolar cuadros porque *"baja mucho el rendimiento solamente por las manos
y el mediapipe"*, y forzar 60 estables; sacar la cámara de la pantalla pero dejarla activa; manos 3D
riggeadas humanas con profundidad; que Baldi no se desvíe; más cosas al salir del salón; animaciones
más rápidas y fluidas; y voz y música generadas.

#### EL RENDIMIENTO: MEDIR MENOS, DIBUJAR IGUAL

`detectForVideo()` tarda entre 8 y 20 ms en un teléfono, **y estaba llamándose dentro del
`requestAnimationFrame` del juego**. Con 16,6 ms de presupuesto para 60 fps, cada cuadro pagaba la
medición. No se arregla midiendo más rápido:

1. La medición la maneja **`requestVideoFrameCallback` del propio `<video>`**, que dispara una vez por
   cuadro de *cámara* y no por cuadro de *render* — corre al mínimo entre los fps del video y los del
   navegador. Y encima se limita a 24 Hz en teléfono.
2. Entre medición y medición los 21 puntos de cada mano se **interpolan**, con predicción acotada a
   45 ms y suavizado exponencial de τ=32 ms. Es el mismo criterio que el juego ya usaba con su paso
   fijo de 60 y sus cuadros de 120: la verdad se calcula pocas veces y el dibujo rellena.
3. Entrada a **320×240**, que son 2,25 veces menos píxeles que 480×360 para la misma mano.

**Por qué NO un Web Worker**, que es lo que dice todo el mundo: `@mediapipe/tasks-vision` hace
`document.createElement('canvas')` adentro, que no existe en un worker, y el caso de iOS 17 sigue
abierto en el repositorio de MediaPipe ([#5292](https://github.com/google-ai-edge/mediapipe/issues/5292)).
Un worker que no arranca en la mitad de los teléfonos es peor que 24 Hz interpolados que arrancan en
todos.

Detalle que también costaba: la salida suavizada se convertía a 21 objetos por mano **por cuadro**, o
sea 2.520 objetos por segundo a la basura. Ahora se escriben los mismos objetos siempre.

#### LAS MANOS 3D: RECONSTRUIDAS POR RAYO DE PANTALLA, NO DESDE LOS worldLandmarks

MediaPipe da `worldLandmarks` métricos y parece lo obvio, pero anclando la mano en la muñeca y
escalando la forma **el pulgar y el índice en 3D no caen donde están los mismos puntos en pantalla** —
y el juego apunta a los bichos con los puntos de pantalla. Verías la pinza en un lugar y reventarías
un bicho en otro.

Así que cada punto se coloca **sobre su propio rayo de pantalla**, a una profundidad que sale de la z
relativa. El dibujo y el apuntado son la misma cosa *por construcción*: medido, la muñeca proyecta en
(536, 994) y el punto de pantalla es (536, 994). Y la perspectiva sale gratis, porque los puntos
normalizados ya la traen puesta.

Lo demás es lo que hace que se lean a manos y no a palitos: falanges con volumen, articulaciones
redondeadas, **palma rellena** (con sólo huesos se lee a araña), punta afinada, y el **grosor derivado
de la propia palma** — con radios en metros absolutos los dedos salían como chorizos, porque el grosor
dependía de una constante y el ancho en pantalla, en cambio, sale de los puntos. Van instanciadas: 84
piezas, **dos llamadas de dibujo**, 0,125 ms por cuadro.

#### LA CÁMARA: TRASERA, INVISIBLE, Y EL ESPEJO DEJA DE SER UNA CONSTANTE

`facingMode: environment`. Y con la trasera **la imagen NO va espejada** —con la frontal sí— así que
el espejo se lee del propio track con `getSettings()`: si se espeja al revés, mover la mano a la
derecha mueve la mano del juego a la izquierda y no hay forma de apuntar.

La miniatura sale de la pantalla, pero el `<video>` **no va con `display:none`**: un video que el
compositor considera que no se dibuja puede dejar de entregar cuadros, y sin cuadros no hay detección.
Queda de 2 px y transparente.

#### BALDI NO SE DESVÍA: ERAN DOS COSAS Y NINGUNA ERA EL RUMBO

- `rutaDesde()` descartaba **todos** los puntos a menos de una celda, y en un pasillo con esquina eso
  se come el punto de la esquina: la ruta \[entrada, esquina, destino\] queda en \[destino\] y camina
  en diagonal atravesando la pared.
- Y **el saludo pasaba justo en una esquina del mapa**: los dos estaban en el cruce, así que su primer
  movimiento era ir hacia atrás hasta la celda de la cámara para poder doblar. Salteándole ese punto,
  cortaba la esquina. Poniendo a los dos sobre la columna 11 y la cámara mirando a −Z, la ruta sale
  derecho y no hay esquina que cortar.

**Auditoría nueva**, y es la parte importante: se juega la partida entera preguntando en cada paso si
la celda del profesor es pisable. Una diagonal por dentro de una pared dura dos segundos y en una
captura no se ve. Medido: **113 pasos dentro de paredes antes, 0 ahora** — y verificado que la prueba
detecta el defecto, revirtiendo el arreglo y viendo volver los 113.

#### LAS ANIMACIONES: EL CICLO SALE DE LA VELOCIDAD

Estaba en `t*2,0` —un paso cada 1,57 s— mientras el riel lo movía a 3,4 m/s: **2,7 metros por paso**,
o sea los pies arrastrando mientras el cuerpo avanza. El patinaje clásico. Ahora el ritmo se **deriva**
de la velocidad y la zancada (`CAMINA_W = 2π·v/(2·zancada)`), así que si cambia la velocidad el ciclo
la sigue solo. Más: desfase de 0,45 rad entre cadera y rodilla (sin desfase todo el cuerpo cambia de
dirección en el mismo cuadro y se lee a marioneta), la cabeza compensando el rebote, y la mezcla entre
animaciones de 0,40 a **0,22 s** — 0,40 s a 60 pasos son veinticuatro cuadros mezclando dos poses, o
sea medio segundo en el que el personaje no está haciendo ninguna de las dos cosas. Recorrido de
rodilla medido: de 0,21 a **0,57 m**.

#### TRES ACTIVIDADES DE PASILLO, Y EL CRITERIO NO ES LA VARIEDAD

Siete tandas de bichos son una tanda repetida siete veces. Las tres piden algo **distinto** de la mano:

- **bichos** vienen hacia vos → se entrena *apuntar* a un blanco que se mueve.
- **tizas** caen → se entrena el *tiempo*; hay que llegar antes de que toquen el piso.
- **casilleros**: tiembla uno de cinco, todos a la misma distancia → se entrena *elegir*.

Las tres pasan por el mismo `golpesJuntar()` y el mismo radio de blanco, y eso no es ahorro de líneas:
es lo que garantiza que apuntar se sienta igual en las tres. Dos números salieron de mirar: los
casilleros eran **ocho de 0,62 m cada 0,66** puestos a 3 m, o sea un abanico de 5,3 metros donde
entran 3,4 — no eran ocho casilleros, era una **pared roja** tapando el pasillo, y encima 5,3 m no
caben en un pasillo de 4,2. Y la tiza a escala real mide 1 cm, que a tres metros son **ocho píxeles**
con el filtro de baja calidad puesto: lo que tiene que costar es llegar a tiempo, no distinguir el
objeto.

#### LA VOZ ESTÁ GENERADA, LA MÚSICA ESTÁ COMPUESTA, Y LA DIFERENCIA NO ES CAPRICHO

**La voz**: cinco ladridos con text-to-speech (Higgsfield / seed_audio, voz Holden), recortados,
mono 16 kHz, MP3 a 40 kbps: **19 KB los cinco**. Son **interjecciones a propósito** —"¡eh!", "mm-hm",
"uh-uh", el grito, la risa— y no frases: el juego habla en tres idiomas y una frase habría que
grabarla tres veces, mientras que un grito se entiende igual en los tres. Los subtítulos siguen
haciendo el trabajo del idioma.

El horneado tiene un paso que costó dos intentos: **se queda con la ráfaga de más ENERGÍA, no con la
del pico más alto**. El TTS devuelve dos tomas de la misma línea con silencio en el medio y a veces un
chasquido al final: en `bien.wav` ese chasquido mide 0,276 de amplitud, **más alto** que el "mm-hm"
real que está en el medio a 0,20. La regla del pico se llevaba el chasquido y devolvía un ladrido de
0,11 s cortado al medio. La energía total —amplitud *por* duración— no se deja engañar: 5 cuadros de
0,2 suman 0,2 y 23 cuadros de 0,15 suman 0,52.

**La música es procedural**, y hay que decir por qué: no hubo con qué generarla. El único modelo de
música disponible está reservado para otro flujo y no había llave del otro proveedor. En vez de dejar
el juego en silencio, se compone — y encima resulta lo correcto acá: pesa **cero bytes**, no se corta
nunca, y puede cambiar de intensidad según el aula, que un archivo suelto no puede. Cuatro compases en
la menor con el último acorde tenso (Am–F–G–**E**): el E mayor sobre una escala menor es lo que hace
que el loop no se cierre nunca del todo.

Dos cosas que la medición corrigió, y que a oído se habrían pasado:

- **La agenda no va colgada del bucle de dibujo.** Un rAF se atrasa y se pausa en segundo plano; el
  reloj de `AudioContext` no. Un temporizador de 100 ms agenda lo que entra en los próximos 300 ms.
- **El 96 % de las muestras salían MUDAS.** El sobre de cada nota decaía exponencialmente a cero a lo
  largo de toda su duración, así que una nota "sostenida" de un segundo pasa el 80 % de ese segundo
  casi en silencio. Eso no es una música tenue: es silencio con un bip. Se agregó un sobre con
  sostenimiento y —la pieza que faltaba— un **colchón de tres osciladores encendidos para todo el
  juego**, que sólo cambian de afinación siguiendo el acorde. Medido con una ventana de 1,4 s:
  **0 % mudas**, rms 0,033, pico 0,13.

Y el grito quedó donde tenía que quedar: **rms 0,291 contra 0,033 de la música, o sea nueve veces más
fuerte**, con la música agachándose a 0,08 cuando suena.

#### MEDIDO AL CERRAR

Partida completa: **24 cuentas de 24**, las 8 aulas, las 7 tandas —bichos, tizas y casilleros—
reventadas por el mismo camino que usa el jugador, `window.__errs` vacío. **0 pasos dentro de paredes**
en 19.706 pasos. Contestando mal: muerte, y desde el reintento la partida se termina igual (24/24 con
1 muerte). Voces decodificadas: 0,54 · 0,43 · 0,58 · 1,37 · 0,90 s. Manos 3D a **0,125 ms por cuadro**,
proyección exacta contra el punto de pantalla. 10 llamadas de dibujo y 16.302 triángulos sin manos, 16
con manos y bichos.

### Vigesimocuarta vuelta (2026-08-27): **RECREO** — el permiso de cámara y las dos manos dibujadas en el juego

Reporte del usuario probando en el teléfono: *"no está usando MEDIAPIPE ni me pide permiso de cámara
y además la mano debe aparecer en el juego debe hasta detectar 2 manos"*. Las dos cosas eran mías.

#### POR QUÉ NO PEDÍA LA CÁMARA

El permiso se pedía **sólo al tocar el botón `MANOS`**, que es una de seis opciones chicas del menú
—entre calidad y filtro— **y que ya aparecía elegida**, porque el modo manos es el de por defecto. O
sea: el botón que había que tocar se veía como si ya estuviera tocado. Nadie tenía razón para
tocarlo, así que `manosIniciar()` no corría nunca, MediaPipe no se bajaba nunca y el juego arrancaba
con el teclado de números. Desde afuera eso es exactamente *"no usa la cámara"*.

Ahora la cámara se pide **al tocar JUGAR**, que es el gesto que todos hacen. Y no bloquea nada: si
falla, arranca con los números.

**Y EL ORDEN DENTRO DE `manosIniciar()` CAMBIÓ: LA CÁMARA VA PRIMERO.** El detector son dos descargas
de un CDN más un modelo de **7,8 MB** de Google, o sea varios segundos. Pidiéndolos antes del permiso,
cuando por fin se llama a `getUserMedia` el gesto del jugador ya expiró y Safari lo rechaza con
`NotAllowedError` **sin mostrar el cartelito**. Pidiendo la cámara en la primera línea, el permiso
aparece al instante y la descarga pasa después.

#### CADA FALLA SE NOMBRA, Y EL MOTIVO SE QUEDA PUESTO

Antes cualquier problema terminaba en un cartel de 2,6 s **dentro del juego** que decía "sin cámara":
el mismo mensaje para negaste-el-permiso, no-hay-cámara, el-CDN-no-contesta y estás-en-http. Un aviso
de 2,6 segundos en una pantalla que no se está mirando no es un aviso. Ahora hay una línea de estado
**en el menú**, permanente, con el motivo. Cinco motivos separados, y uno de ellos no se arregla desde
el código: **sin HTTPS `navigator.mediaDevices` no existe**, así que no hay permiso que negar — el
navegador ni pregunta. Es la causa más fácil de confundir con un error del juego.

Más: **dos CDN** (jsDelivr y unpkg de respaldo — el detector es una descarga de un tercero y si ese
tercero no contesta el juego se queda sin manos), y **GPU primero, CPU de respaldo**, porque en
teléfonos viejos el delegado de GPU tira al crear la tarea y un detector a 15 fps en CPU sigue siendo
jugable.

#### LAS DOS MANOS, DIBUJADAS SOBRE EL JUEGO

Estaban sólo dentro de la camarita de la esquina, **de 78 a 132 px de ancho**: a ese tamaño una mano
son veinte puntos en dos centímetros y no se ve si el detector te está siguiendo. Ahora el esqueleto
de las **dos** manos se dibuja sobre todo el marco. Cada decisión del dibujo tiene un motivo:

- **Contorno oscuro debajo de cada hueso.** El pasillo es beige claro y el aula también: una línea
  verde sola desaparece sobre el piso. Se pinta dos veces, grueso y oscuro primero.
- **La palma rellena.** Con sólo huesos se lee a araña; con el polígono de la palma se lee a mano.
- **Las puntas que el juego CONTÓ van rellenas y grandes; las que no, huecas y chicas.** Cuando el
  número no es el que el jugador esperaba, ahí se ve cuál dedo no estiró. Un número solo no explica
  nada — para esto `manoLeer()` ahora devuelve también **cuáles**.
- **Un número por mano, en la muñeca.** Con dos manos el total no alcanza: si dice 7 y pusiste 4 y 3,
  hay que poder ver que leyó 4 en una y 3 en la otra.
- **Todo espejado en x**, igual que la camarita: sin el espejo, mover la mano a la derecha mueve el
  dibujo a la izquierda y no hay forma de apuntar.

El aro DOM que marcaba la pinza se fue: ahora el punto de la pinza se dibuja en el lienzo, y así
salen **las dos manos** en vez de una.

#### DOS COSAS QUE APARECIERON DE PASO

- **`window.pintarFiltro` no existía y la llamada nunca corría.** Esto es un módulo ES, así que una
  `function` declarada arriba **no aparece en `window`**: `pintarIdioma()` la llamaba con un guard
  `if(window.pintarFiltro)` que era falso para siempre, o sea que al cambiar de idioma los botones del
  filtro no se repintaban nunca. El guard está para saltear la llamada del arranque —cuando el `let
  filtro` de un archivo posterior todavía no existe y leerlo rompe el módulo entero—, no para
  desactivarla siempre. Se arregla asignando `window.pintarFiltro=pintarFiltro` al final de su
  archivo. Mismo par —guard allá, asignación acá— para el `manosTam()` nuevo.
- **`MANO.dedos` y "lo que la cámara ve" son dos números distintos.** `MANO.dedos` es el que ya pasó
  el voto de tres cuadros y arranca en −1 mientras no hay acuerdo; el cartelito decía "2 MANOS · −1".
  El cartel muestra el crudo, que es la respuesta inmediata a *"¿me está viendo?"*.

#### MEDIDO

Con la cámara falsa del contenedor: al tocar JUGAR, `estado: lista · on: true · delegado: GPU ·
video 480×360 readyState 4 · aviso "CÁMARA LISTA · las dos manos"`. Con dos manos sintéticas de cinco
dedos: `dedos 10 · manos 2`, el cartel dice **"2 MANOS · 10"** y los dos esqueletos se dibujan con su
número al pie. El lienzo de manos mide 788×1400 y dibujar las dos manos cuesta **0,098 ms por cuadro**
(300 pasadas). Partida completa detrás de todo esto: **24 de 24**, sin errores en consola.

#### HOSTEO PARA PROBAR EN EL TELÉFONO

`raw.githubusercontent.com` **no sirve**: devuelve 200 pero con `content-type: text/plain` y
`X-Content-Type-Options: nosniff`, así que el navegador muestra el código en vez de correr el juego.
jsDelivr, igual. Lo que sí funciona es **githack**, que sirve el mismo archivo con `text/html`:

    https://raw.githack.com/Juniorspro/General-Assets-Games/claude/billeteras-sin-registro-3z7uvz/juegos-pc/Recreo.html

Ojo al probarlo: **githack contesta 403 a los HEAD y 200 a los GET**, así que `curl -I` lo hace
parecer roto. Y `getUserMedia` exige HTTPS, que githack cumple.

### Vigesimotercera vuelta (2026-08-27): **RECREO se vuelve un juego** — ocho aulas, bichos con pinza y el screamer

Pedido: *"en cada salon hayan un libro y 3 problemas para hacer y minis actividades por el camino a
otro salón, por ejemplo yendo al segundo salon aparece un bicho en la pantalla 3D que con las manos
puedes hacer pinch para matarlos y explotan si haces mal una ecuación baldi te mata o sea un
screamer"*.

De un aula con ocho libros a **ocho aulas con un libro y tres cuentas cada una (24)**, con **siete
tandas de bichos** en los pasillos del medio y **muerte instantánea con grito** si una cuenta sale mal.

#### LO QUE ANTES ESTABA ESCRITO A MANO AHORA SE CALCULA

Había **una** aula amueblada con cuatro números puestos a dedo (pizarrón 27,47 · escritorio 23,6 ·
él 25,2 · cámara 22,85) y **dos rutas** escritas en celdas. Con ocho aulas eso serían cuarenta números
y quince rutas, y el primero que se escriba mal deja un pizarrón dentro de una pared en el aula 7 sin
que nadie se entere hasta llegar ahí.

- **El sitio de cada aula sale de su rectángulo**: la pared del fondo es la fila `j1+1`, él va en la
  última fila del aula, el escritorio 1,6 m delante y la cámara 2,35 — la distancia medida donde ocupa
  el 51,9 % del alto del marco.
- **Las rutas salen de un BFS** sobre el mismo mapa que ya decide dónde va cada puerta, simplificadas
  a las esquinas: un riel con veinte puntos en línea recta hace temblar la cámara, porque cada punto
  es una parada de 10 cm donde el resorte del giro vuelve a arrancar.
- **El guión de las aulas se genera** del recorrido: 8 aulas × 3 escenas + 7 tandas de bichos = 31
  escenas, y cada una lleva adentro el número de aula, así que ninguna parte del código tiene que
  adivinar en qué aula está.

#### EL PIZARRÓN ESTUVO ENTERRADO EN LA PARED DESDE SIEMPRE Y SE VIO RECIÉN AHORA

La fórmula era `ZC(j1+1) − CEL/2 + GRUESO/2 + 0,02`, o sea **17 cm pasada la cara interior de la
pared** — y una pared acá es un cubo de celda entera (4,2 m), no un panel de `GRUESO` de espesor. El
pizarrón quedaba adentro y la pared lo tapaba.

**Por qué nunca se notó:** la única aula amueblada era la 6, y la 6 tenía su **segunda puerta justo en
esa celda del fondo**. Donde hay puerta el constructor no levanta pared, así que el pizarrón se veía
**por el agujero**. Al mover las segundas puertas a las paredes laterales —para que no quedaran detrás
del pizarrón— la pared del fondo se cerró en las ocho aulas y el defecto salió a la luz en las ocho a
la vez. Es el mejor ejemplo de la vuelta: **amueblar la segunda aula reveló un error de la primera**.

#### LOS BICHOS: EL PROBLEMA NO ES EL BICHO, ES EL "ENCIMA"

La regla es una: se revienta poniéndole la **pinza** encima. Todo el trabajo está en ese *encima*,
porque la mano vive en la cámara web —dos dimensiones, normalizadas y **espejadas**— y el bicho vive
en el mundo 3D. El puente es proyectar el bicho a la pantalla y comparar ahí, en fracciones del marco:
en píxeles habría que rehacer el número en cada tamaño de pantalla.

- **El radio del blanco es el 10,5 % del ancho, y es grande a propósito.** Una punta de dedo detectada
  por MediaPipe tiembla unos puntos por cuadro. Lo que tiene que costar es *llegar* con la mano, no
  acertar el píxel.
- **Vale el FLANCO de la pinza, no el estado.** Una pinza sostenida medio segundo son treinta cuadros:
  si cada cuadro matara, una sola pinza limpiaría el pasillo. Solo cuenta el cuadro en que la pinza
  aparece, y para eso hay que recordar la de cada mano en el cuadro anterior.
- **Una pinza mata UN bicho**, el más cercano al dedo. Con "todos los que estén dentro del radio" una
  pinza en el medio de un grupo se llevaba tres de una.
- **Van instanciados.** Un bicho creíble son nueve piezas; seis bichos sueltos serían 54 mallas en un
  juego que dibuja la escuela entera con una. Fundido, un bicho es una geometría y seis bichos son un
  `InstancedMesh`: **dos llamadas contando los ojos**, haya uno o haya seis. Los ojos van en otra malla
  a propósito —sin luz— porque son lo único que dice "eso está vivo y viene hacia vos".

**TRES DEFECTOS MEDIDOS, LOS TRES INVISIBLES EN UNA FOTO:**
- **`mergeGeometries` devolvía null.** `IcosahedronGeometry` viene **sin índice** y `Box`/`Sphere`
  vienen **con** índice, y no acepta la mezcla: el bicho se quedaba sin geometría. Se desindexa todo,
  porque desindexar siempre existe y reindexar hay que calcularlo.
- **La cámara se proyectaba desde el menú.** `camara` sólo se acomoda al dibujar, así que dentro del
  paso fijo tenía la posición del cuadro anterior — y el auto-jugador, que corre sin dibujar un solo
  cuadro, la tenía **en el menú**: los bichos se proyectaban a cualquier lado. Medido: **56.400 pasos
  en un pasillo con dos bichos que no morían nunca**. Se sincroniza antes de proyectar.
- **Aparecían aplastados contra una pared.** Al salir de un aula el último tramo va de la puerta al
  pasillo, o sea que la cámara queda mirando **la pared de enfrente**: medido en la celda (4,1), giro
  −3,14 contra un muro de lockers a dos metros. Ahora se apunta al final del tramo que queda —donde el
  profesor está esperando— y la cámara gira sola en medio segundo.
- Y **se acercan en zigzag**: apuntando exacto a la cámara todos convergen a la misma línea y terminan
  uno detrás del otro (medido después de un rato largo: cinco bichos en x = −29,40 los cinco, o sea un
  solo blanco apilado).

#### EL GRITO ES UN MOMENTO, NO UN SONIDO

1,55 s en los que se planta a **noventa centímetros** de la cámara —más cerca la cabeza no entra en el
cuadro, más lejos no es un susto sino alguien que se acercó—, la vista se va sola hacia él, grita, y la
pantalla se enciende **a tirones** (un fogonazo que se apaga suave se lee a transición; uno que corta
se lee a susto). Es lo único del juego que le saca el control al jugador.

- **El grito corta, no se funde.** `profeAnim()` deja la mezcla en 1 —o sea 100 % la animación vieja— y
  la baja `profeTick()`; pero durante el grito `profeTick` **no corre**, así que la mezcla se quedaba
  clavada y en pantalla el pobre gritaba **con los brazos colgando** en pose de 'quieto'.
- **El cartel va al medio y con fondo propio.** El globo de diálogo vive en el tercio de abajo, que es
  exactamente donde queda su pecho al plantarse: tapaba el susto con una caja gris.
- **Es el sonido más fuerte del juego**, y tiene que serlo. Medido con el analizador: fondo 0 · reventar
  un bicho 0,0557 · acertar una cuenta 0,1155 · **grito 0,244 de pico y 0,077 de rms**. Tres formantes
  que **bajan** más un soplo ancho: un grito que sube suena a persona, uno que baja suena a animal
  grande. De paso, `revienta` medía **0,0136** —doce veces por debajo de acertar una cuenta— porque un
  pasabanda de Q 0,7 se come casi toda la energía del ruido blanco.

#### DÓNDE VOLVÉS, QUE ES LA ÚNICA DECISIÓN DE DIFICULTAD

Una cuenta mal y te mata: **no hay segundo intento**, y no es una decisión de dificultad sino la única
forma de que contestar tenga peso — con reintento libre el jugador tira números hasta que uno pegue
(diez opciones, tres segundos) y las veinticuatro cuentas dejan de ser cuentas. Lo que **sí** es una
decisión es dónde volvés: **al principio de esa aula, no de la escuela**. Perder veinte minutos por una
resta es la forma más rápida de que alguien cierre el juego, y el susto ya lo dio el grito.
Y **los bichos no matan**: te muerden, suenan, y vuelven al fondo del pasillo. La muerte de este juego
es una sola cosa.

#### EL RECORRIDO, Y POR QUÉ NO ES 1..8

`[1,2,3,4,8,7,6,5]`: las cuatro de arriba por el pasillo de la fila 1, se baja por la columna 21 y las
cuatro de abajo por la fila 9. Recorrerlas en orden obligaría a cruzar la escuela entera entre la 4 y
la 5. El tramo más largo son catorce celdas = **58,8 m**, que a 2,2 m/s son veintisiete segundos de
pasillo sin nada que hacer: la caminata subió a 2,9 (él a 3,4) **y se parte al medio**, con los bichos
en la juntura — la actividad tiene que estar *en* el camino, no al final.
Y el número que se dice es el del recorrido y no el del mapa: el aula 5 es la octava que se visita, así
que decir "Aula 5" con el cartel en "AULA 8/8" son dos números para la misma cosa.

#### MEDIDO AL CERRAR

Partida completa desde el arranque, sin saltos: **24 cuentas de 24, 24 aciertos**, las 8 aulas en orden
de recorrido, **las 7 tandas de bichos reventadas por el mismo camino que usa el jugador** (un toque en
el píxel donde cae el bicho), 18.171 pasos ≈ 5 minutos, `window.__errs` vacío. Contestando **mal**:
muerte en la primera cuenta, pantalla de agarrón, y **desde el reintento la partida se termina igual**
(24/24 con 1 muerte). Pinza de MediaPipe verificada con mano sintética: apuntada al blanco (0,199 ·
0,579) cae en (0,200 · 0,579) y **mata exactamente un bicho, con nueve esquirlas**. Costo: **14 llamadas
de dibujo y 16.340 triángulos** con el aula amueblada, 16 con los bichos en pantalla. Encuadre 51,9 %
del alto a 790×1400 y 50 % a 360×800.

### Vigesimosegunda vuelta (2026-08-27): **RECREO, "sigue de la mierda"** — el rig, el encuadre y las poses

Pedido: una captura del celular con el aula y el personaje hecho una **mancha verde**, y tres palabras:
*"sigue de la mierda"*. Tenía razón, y lo peor es que la vuelta anterior yo había reportado que
funcionaba.

#### EL ERROR DE MÉTODO, ANTES QUE EL DE CÓDIGO

Yo estaba juzgando el modelo en capturas de **412 px de ancho, donde el personaje medía 130 px de
alto**. A ese tamaño una mancha verde con la silueta correcta y una mancha verde con un zapato al lado
de la oreja se ven igual. Lo que arregló esto no fue mirar mejor: fue **armar un visor de 900×900 con
el modelo solo** —`/tmp/ui/visor.html`— y **sacar las fotos del juego a la resolución real del
teléfono del usuario, 790×1400**. Con eso a la vista, los defectos se cuentan solos.

Y para no volver a ajustar el encuadre a ojo, ahora hay dos ganchos que **devuelven píxeles**:
`__recreo.caja()` proyecta la caja del personaje y del libro a coordenadas de pantalla, y
`__recreo.encuadre({z, pitch, ojo, fov})` mueve la cámara en vivo. Un encuadre se mide, no se estima.

#### DEFECTO 1 — LA POSE LE BORRABA EL BIND AL RIG (era EL defecto)

Un rig de Meshy trae la pose de reposo escrita **EN LAS ROTACIONES** de los huesos, no solo en la
jerarquía: medido en este modelo, `caderaI` viene con X = **−3,078 radianes** —casi media vuelta— y
`hombroD` con (0,743 · −0,743 · 0), que es la dirección del brazo en T. Mi código hacía
`rotation.set(mi_pose)`, o sea que **borraba todo eso**: la cadera saltaba de −176 grados a 0 y la
pierna se le iba a la altura de la cabeza (**la rodilla medida en y = 1,529 cuando tiene que estar en
0,44**), y a los brazos les borraba la Y y quedaban metidos dentro del torso. El resultado en pantalla
era una mancha verde con un zapato al lado de la oreja. **La pose es un DELTA sobre el reposo del
rig.** Siempre lo fue; yo estaba escribiendo absolutos.

#### DEFECTO 2 — LOS EJES DEL HUESO NO SON EJES ANATÓMICOS

Arreglado el bind, los brazos seguían raros y ninguna constante los acomodaba. La razón: **los ejes
locales de un hueso son los que dejó el bind**, y acá el bind del hombro es el brazo en T, así que
ninguno de los tres ejes locales significa nada. Medido con `probarHueso()` sobre este modelo: girar
el eje X mueve la mano en el plano XY (sirve de abducción), pero girar Z la mueve 0,27 en Z **y además
0,39 en Y** — o sea que "levantar el brazo hacia adelante" también lo subía. Con eso, la pose de
"explicando" —que pide 1,06 de flexión— le ponía las dos manos a la altura de la oreja: **mano medida
a y = 629 px con la cabeza a 618**. Dos palos en cruz.

La salida no fue buscar mejores números para los mismos ejes: fue **dejar de usar los ejes del hueso**.
La abducción es un giro alrededor del **Z del cuerpo**, la flexión alrededor del **X del cuerpo** y la
torsión alrededor del Y, y eso se pasa al espacio del padre con **P⁻¹·R·P**, calculado una sola vez al
cargar. Verificado midiendo: abducción pedida 0,60 → 0,704 medidos; 1,40 → 1,503; 2,40 → 2,50. Flexión
pedida 1,06 → 1,03 medidos; 1,44 → 1,41. **El orden importa y es abducción adentro, flexión afuera**:
al revés la abducción deja de ser un ángulo en el plano frontal y se mezcla.

Los **codos NO** van por ahí: ahí el eje local X del hueso ya es la bisagra buena —medido, mueve la
mano en el plano del brazo— y encima acompaña al brazo solo, que es justo lo que tiene que hacer un
codo. Su eje Y, en cambio, mueve la mano **1 mm**: es el eje del propio hueso, o sea torsión. Las
poses que lo usaban estaban girando la nada.

Y el reposo del hombro **ya no es una constante a mano**. Estuvo en 0,42 y después en 0,65, y los dos
eran el mismo parche: tapar con un número que el eje estaba mal. Ahora se **mide el ángulo del brazo
del bind contra la vertical** al cargar y el reposo sale de ahí. Si Meshy manda el próximo modelo en
A-pose en vez de T-pose, esto se acomoda solo.

#### DEFECTO 3 — LA CÁMARA SE QUEDABA EN EL VANO DE LA PUERTA

`ZC(14,238)` da z = 22,0 y a esa altura la cámara **no había entrado al aula**. Medido a 790×1400: el
personaje ocupaba **36,8 % del alto**, los pupitres de los costados hacían de marco y el tercio de
abajo era piso vacío. `ZC(14,44)` = 22,85 la mete dentro, a 2,35 m de él, y pasa a ocupar **51,9 %**
con el escritorio de primer plano abajo. El mismo 51,9 % a 360×800, así que el encuadre no depende del
tamaño de pantalla.

El libro flotante se salía del marco por la izquierda: a 22,85 flota a 1,75 m y el medio ancho visible
ahí es 0,98 m. A 0,95 del eje quedaba mitad afuera; a 0,70 todavía se salían **28 px** (medidos con
`caja()`); entra entero a 0,55 con escala 1,02.

#### DEFECTO 4 — LAS ANIMACIONES ESTABAN ESCRITAS PARA OTRO PUNTO DE VISTA

Con el rig por fin correcto, quedó a la vista que las poses eran el problema. En la escena de clase
**él mira a la cámara**, y un brazo levantado hacia adelante apunta al lente: en pantalla no se lee
como un brazo que gesticula sino como un palo saliendo del hombro. De frente lo que se lee es el
**antebrazo**, así que "explicando" pasó a hombros casi pegados al cuerpo y codos a 70 grados.

- **Saludar**: 2,42 de abducción más los 0,14 de base son 2,56 — el brazo **pasado de la vertical**,
  cruzándose por encima de la cabeza. Bajado a 2,15.
- **Abrir la puerta**: el tronco giraba con **el mismo `f`** que el brazo, y el tronco es antepasado
  del hombro: los dos movimientos se restaban y la mano quedaba clavada. Medido, **3 mm de recorrido
  en todo el ciclo** — un empujón que no empuja. El giro del tronco pasó a constante.
- Y **el empujón dura lo que dura el empujón**: se quedaba en la pose de 'puerta' los siete segundos
  que tarda en cruzar el aula, medido empujando aire en z = 18,45. Ahora camina.

#### DEFECTO 5 — TRES COSAS MÁS QUE SE VIERON RECIÉN AL MIRAR EN GRANDE

- **El pasillo terminaba en un agujero negro.** La celda de una salida es puerta, así que el
  constructor de paredes no levanta pared ahí, y del otro lado de la reja del mapa no hay nada.
  Medido: **90 px de lado a 42 m**, o sea los 4,2 m enteros de la celda — el vacío de afuera de la
  escuela, visible por arriba y por los costados de la hoja (que mide 0,92 de celda de ancho y 0,86
  de alto). Dos paneles pegados por fuera.
- **El profesor caminaba hacia atrás y quedaba detrás de la cámara.** Su ruta empezaba con el primer
  punto de la ruta de la cámara —la celda 11— y él arranca en la 10,35, o sea **delante**. Lo primero
  que hacía era caminar 2,7 m hacia atrás y cruzarse con la cámara: en la captura del pasillo no había
  nadie y el *"vení conmigo"* lo decía una voz sin cuerpo.
- **El teclado de números estaba visible toda la partida**, también en la escena del saludo, donde no
  hay nada que responder: diez botones pidiendo algo que el juego no estaba preguntando. Ahora se
  muestra con la misma condición que el aro, `esperando`. Y el cartel de la cuenta debajo del aro
  estaba en beige sobre la pared beige del aula: se leía como una marca de agua. Fondo propio.

#### AHORA EL JUEGO VIVE PARTIDO Y SE ARMA CON UN SCRIPT

`herramientas/recreo/partes/` (once archivos) + `python3 herramientas/recreo/armar.py` →
`juegos-pc/Recreo.html`. El HTML final pesa 769 KB y **490 de esos son el GLB en base64**: editar un
archivo así con parches de texto es operar con guantes de horno, y ya me costó una vez el archivo
entero en cero bytes. Las partes son la fuente; el HTML es la salida.

#### MEDIDO AL CERRAR

Partida completa desde el arranque, sin saltos: las **nueve escenas** en orden
(`presenta · t5 · tp · t2 · listo · viaje · entra · clase`), **8 libros de 8, 8 aciertos**, 2831 pasos,
`window.__errs` vacío. Encuadre 51,9 % del alto a 790×1400 y **el mismo 51,9 % a 360×800**. Libro
entero dentro del marco (20…129 px de 360). Filtro fuerte: destino 188×334 = 62.792 píxeles contra
186.624 de pantalla, y la cara sigue legible.

### Vigesimoprimera vuelta (2026-08-27): **RECREO se rehace** — el modelo generado, vertical, cámara sobre rieles y los dedos

Pedido: *"con highsfield generes el modelo 3D de baldis, si o si, y que a él lo animés, y que no haya
joystick ni movimiento de cámara y que el juego sea vertical con buen fov de 90 aprox … inicie como el
juego en sí, saludando él y que baldi te vaya dando un tutorial de como usar las manos … después la
cámara y el mismo se va a un salón … al llegar baldi se pone del otro lado de la mesa con la pizarra y
aparece un libro flotante a un costado debes responder con los dedos o sea 4+4 8 dedos y así habrán 8
libros"*. Después: *"hazlo así"* (con tres fotos del modelo low-poly) *"y si le puedes agregar ese
filtro de saturación y filtro baja calidad"*.

#### EL MODELO: GENERADO CON HIGGSFIELD, Y AL SEGUNDO INTENTO

`image_to_3d` (Meshy) con texturizado y **rigging automático**. Vino con un esqueleto humanoide de
**24 huesos y nombres estándar** —Hips, Spine01, Head, LeftArm, LeftForeArm, LeftUpLeg…— que es
exactamente lo que hacía falta.

**El primer intento salió aplanado** y hay una razón: la fuente era el *sprite 2D* del personaje, y
Meshy interpretó un dibujo plano como papel extruido. Con la foto del modelo low-poly de verdad que
mandó el usuario —volúmenes, luz, fondo liso— salió el personaje que se quería. La lección no es
"Meshy es malo": es que **una imagen plana no contiene la información de profundidad que se le está
pidiendo**, y ninguna cantidad de parámetros la inventa.

De **7,80 MB a 489 KB (6,3%)**, y casi todo el ahorro es una sola cosa: la textura venía en PNG de
2048 sin comprimir (7,39 MB) y sale en **JPEG de 512 (77 KB)**. A JPEG y no a WebP a propósito: WebP
dentro de un GLB necesita la extensión `EXT_texture_webp` declarada, y si el cargador no la soporta el
modelo aparece **sin textura**. JPEG es núcleo de glTF. Y se tira el clip que Meshy pega por defecto,
con reempaquetado del binario — si no se reempaqueta, los accesores huérfanos quedan y el ahorro es
imaginario.

#### LAS ANIMACIONES SE ESCRIBEN A MANO SOBRE ESE ESQUELETO, Y LOS EJES SE MIDEN

De las cuatro que el juego necesita, **dos no existen en ninguna biblioteca**: "abrir la puerta" y
"explicando". Con el esqueleto en la mano una animación es una función del tiempo a diez rotaciones,
así que se escriben las cinco y se comparten con el rig de cajas de respaldo.

**El problema real es la pose de reposo.** Puse el desvío sobre la Z local "porque es lo que suele
ser" y el personaje apareció en **T perfecta**. Los ejes locales de un hueso dependen de cómo quedó el
bind, así que no se adivinan: `__recreo.probarHueso()` gira un hueso un radián en cada eje y devuelve
**para dónde se fue la mano en el mundo**. Medido:

| | resultado |
|---|---|
| `hombroD` +1,0 en **X** | mano `dy = −0,625` → **baja** |
| `hombroD` −1,0 en X | `dy = +0,473` → sube |
| `hombroD` +1,0 en **Z** | `dz = +0,549` → **adelante** |
| `hombroD` +1,0 en Y | `dy = −0,017` → nada (es el eje del hueso) |
| `caderaD` +0,6 en X | rodilla `dy = −0,241` → pierna atrás |

O sea: en este rig el brazo **sube y baja sobre X y se mece sobre Z**, justo al revés de lo que asumen
mis poses. Las poses no se reescriben: se **remapean los canales** con una tabla de diez líneas, y
las dos versiones del personaje siguen compartiendo las mismas curvas. Y el signo del meceo también
estaba invertido — se vio en *explicando*, donde el brazo se iba para atrás: el personaje explicaba
de espaldas a sus propias manos.

Medido el recorrido real: **caminar** mueve la mano 46 cm y las rodillas 52; **saludar** mueve la
derecha 37 cm y la izquierda **1,4 cm**; **explicando** las dos, desfasadas.

#### LOS DOS FILTROS SON LA MISMA COSA, Y NO SON SOLO UN LOOK

La escena no se dibuja en la pantalla: se dibuja en un destino de render **chico** y ese destino se
estira con NEAREST. Así, el filtro de baja calidad no es un efecto encima — es la razón por la que
esto corre en un teléfono viejo:

| | píxeles dibujados | fps medidos |
|---|---|---|
| fuerte (0,40) | 39.072 | **58,9** |
| apagado (1,00) | 244.489 | 27,6 |

Más de **el doble de cuadros**. Un `filter: saturate()` de CSS satura pero no baja la resolución
—solo desenfoca— y el navegador lo aplica **después** de haber dibujado todos los píxeles.
El tercer ingrediente es la **cuantización de color**: sin escalones, una pared con niebla se ve
suave y moderna aunque esté pixelada.

**Y UN DEFECTO QUE SÓLO SE VE MIRANDO:** three.js aplica `outputColorSpace` **sólo** cuando dibuja en
el buffer de pantalla; con un `WebGLRenderTarget` la imagen queda en **lineal**. Mi pasada la copiaba
tal cual y todo salía oscuro con tinte verde-oliva —el techo casi blanco se veía verde musgo—. No era
la saturación (saturar un beige lo pone naranja, no oliva): era el gamma. Dos líneas en el shader.
Y bajé la mano de 1,50/14 escalones a 1,28/22: con los primeros el pasillo era un solo bloque de
color y la línea del zócalo desaparecía. El filtro tiene que **ensuciar** la imagen, no borrarla.

#### CONTAR DEDOS, Y EL PULGAR NO SE MIDE COMO LOS DEMÁS

Cuatro más cuatro son ocho dedos, o sea las dos manos: `numHands: 2` y el número es la suma.
Los otros cuatro dedos se estiran **alejando** la punta de la muñeca y con eso alcanza; el pulgar se
abre **hacia el costado** y su punta puede quedar a la misma distancia de la muñeca abierto o cerrado.
Se mide contra el nudillo del **meñique**: abierto se aleja de él, cerrado se le cruza por delante.
Sin esa distinción, "cinco dedos" no existe.
Y el número **no se toma, se sostiene**: 1,1 s con un aro que se llena. Eso mata el temblor de un dedo
a medio estirar Y le da al jugador tiempo de cambiar de idea. Verificado con manos sintéticas: una
mano de 5 → 5, **dos manos de 4 → 8**, 0 → 0, pinza detectada, y el voto de tres cuadros medido paso
a paso (cuadro 1 y 2 el número firme sigue vacío; en el 3 pasa a valer).

#### DOS DEFECTOS MÁS, LOS DOS ENCONTRADOS POR EL AUTO-JUGADOR

- **Las pausas estaban en `setTimeout`** y el juego se clavaba después del primer libro: 6.001
  vueltas con `bloqueo` en true para siempre. Pero el defecto no es del test — una pausa medida con
  `setTimeout` es la única parte del juego que **no** respeta el paso fijo. Metida en el paso fijo,
  dura lo mismo a 30 y a 144 cuadros.
- **El pizarrón invisible**: el marco de madera estaba a `zP−0,03` y la pizarra a `zP+0,03`, o sea que
  desde la cámara el marco tapaba la pizarra entera. Tres centímetros. Y el `PlaneGeometry` con
  `FrontSide` girado quedaba invisible desde este lado: va a dos caras.
- Y la composición del aula: el aula mide cinco celdas, **21 metros de fondo**. Con el escritorio en
  el centro el personaje quedaba a doce metros y en un marco vertical se veía del tamaño de un dedo.
  Todo se corrió al fondo y la cámara termina a **3,6 m**. Lo mismo en el saludo: de 5,88 m a 2,73.

Verificado de punta a punta: el guión entero corre solo —saludo, los tres pasos de manos, el viaje, la
puerta, el aula— y los **ocho libros se contestan bien**. FOV 90 vertical = 58,7 horizontal en 9:16.
9 llamadas de dibujo. Cero errores de página en nueve corridas.

### Vigésima vuelta (2026-08-27): **RECREO**, el cuarto juego — la escuela, handtracking y el reloj clavado

Pedido: *"genera un juego nuevo ya será el 4to, en este tendremos acceso a MEDIAPIPE para handtracking
y debes lograr una interpolación de fps para que vaya fluido en todos los dispositivos, los gráficos
serán simples ya que tienes que descargar y rehacer a la perfección la escuela de baldis y generar un
modelo 3D del mismo, con animaciones de saludar, caminar abrir puerta, animaciones de explicando"*.
El usuario aclaró después: *"no es para uso comercial y el creador es flexible además que ni los
publico"*. **Es una recreación de fan hecha desde cero**: los assets del original no se pueden
descargar ni redistribuir, así que la escuela sale de un mapa escrito a mano y el profesor está
modelado por código copiando la referencia que mandó el usuario.

#### LO QUE HAY QUE HACER BIEN NO SE VE EN UNA FOTO

**1. EL RELOJ.** La simulación corre a **60 pasos por segundo fijos** y el dibujo **interpola** entre
el paso anterior y el actual con el sobrante del acumulador. Sin esto un teléfono a 30 cuadros y una
notebook a 144 no juegan el mismo juego: la velocidad, el alcance del oído del profesor y su
persecución salen distintos, y eso no es una diferencia de rendimiento, es **otro juego**.
Medido con el mismo input durante 12 s a cuatro ritmos distintos:

| cuadros/s | cuadros | pasos simulados | z final |
|---|---|---|---|
| 24 | 288 | 719 | 32,770833 |
| 60 | 720 | **720** | **32,816667** |
| 120 | 1440 | **720** | **32,816667** |

60 y 120 dan **el mismo número hasta el último decimal**. A 24 se pierde exactamente **un paso** —
4,6 cm, o sea 1/60 de segundo de movimiento— porque `1440 × (1/144)` acumula un déficit de coma
flotante de ~1e-14 y el último paso no llega a disparar. Es el error residual del acumulador, es de un
paso, y **es justo lo que la interpolación tapa**.
Y las dos protecciones: el `dt` se topa en 0,25 s (una pestaña que estuvo dormida no simula cuarenta
pasos de golpe) y los pasos por cuadro en 8 (si el aparato no llega, va en cámara lenta pero no se
cuelga persiguiendo el reloj).

**2. LAS MANOS.** MediaPipe da 21 puntos; el juego necesita **cuatro decisiones**. Todo el problema
está en ese salto y son tres problemas distintos:
- **La escala**: la mano puede estar a 20 cm o a un metro de la cámara, así que ninguna distancia en
  píxeles sirve. Todo se mide **en proporción al tamaño de la palma** (muñeca→nudillo del medio), que
  es invariante a la distancia y al tamaño de la mano de quien juega.
- **El temblor**: los puntos vibran unos píxeles por cuadro. Media exponencial sobre el rumbo, más
  zona muerta del 16% — sin ella la cámara nunca está quieta, porque una mano humana nunca lo está.
- **El parpadeo del gesto**: cada gesto tiene que **ganar tres cuadros seguidos** para valer. Medido
  con manos sintéticas: cuadro 1 y 2 el gesto firme sigue vacío y `ade=0`; en el 3 pasa a `puño` y
  recién ahí `ade=1, correr=true`. Un gesto mal leído en un juego de persecución es una muerte que el
  jugador no entiende, así que esto no es opcional.

`manoGesto()` es **pura** —entran 21 puntos, sale el gesto— y por eso se puede comprobar inyectando
manos de mentira: `palma` (4 dedos estirados, pinza 1,59), `puño` (0 estirados), `pinza` (1 estirado,
pinza 0,06). Los tres correctos. Y el pipeline entero **se inicializa de verdad** en el banco
(`estado: lista`) después de servir MediaPipe localmente.

#### EL PROFESOR: RIGGEADO A MANO, NO IMPORTADO

Veinte cajas y dos esferas: cabeza pelada de piel clara con ojos grandes y boca roja, suéter verde
ancho, brazos flacos con manos de cinco dedos, dos piernas azules separadas, zapatos naranjas.
**Cinco animaciones que son funciones del tiempo a diez rotaciones** — nada de clips ni keyframes: con
un rig propio, escribir la curva es más corto que describirla, y mezclar dos es evaluarlas y
promediarlas, que es todo lo que un crossfade es. En la vuelta de Eco importar un esqueleto de un GLB
costó un retarget entero en espacio de mundo porque cada generación trae otro rig; acá no hay nada que
retargetear.

Medido el **recorrido real** de cada parte en un ciclo, que es la única prueba de que una animación
anima y de que las cinco son distintas:

| | mano derecha | rodilla | qué se ve |
|---|---|---|---|
| quieto | 4,5 cm | 2,4 cm | respira |
| caminar | **78 cm en Z** | 67 cm | zancada |
| saludar | 54 cm en X · 41 en Y, la izquierda 4,5 cm | 2,4 cm | un solo brazo |
| explicar | 59 cm, la izquierda 53 desfasada | 8 cm | las dos manos hablando |
| puerta | la mano llega a **1,2 m adelante** y a 1,42 de alto | 14 cm | empuja |

#### CUATRO DEFECTOS PROPIOS, TODOS ENCONTRADOS MIDIENDO

- **Ocho aulas sin puerta.** La primera versión pegaba las aulas directo a los pasillos, así que no
  quedaba ni una celda de pared donde abrir la puerta. El gancho lo cantó en dos números:
  `puertasPorAula:[0,0,0,0,0,0,0,0]` y las ocho aulas alcanzables **sin abrir nada**. Un aula sin
  puerta no es un aula, es un ensanchamiento del pasillo — y eso no se ve en una foto del pasillo.
- **Ninguna puerta se podía abrir.** Aritmética: una puerta cerrada no se pisa, así que el cuerpo
  queda frenado a 1,63 m del centro de la celda de al lado, o sea a **2,57 m** del centro de la
  puerta. Con 2,4 m de alcance el juego era ocho aulas selladas para siempre.
- **El profesor arrancaba encerrado en su propia aula.** Con una sola función de "se pisa" para los
  dos, el BFS desde el jugador no llegaba hasta él, `rumbo` devolvía null y caminaba en línea recta
  contra su propia pared: la distancia bajaba 6,9 m en tres segundos y después 2,2 m en cuatro.
  Ahora **para él todas las puertas están abiertas**, porque las abre.
- **El profesor enterrado un metro.** La cadena cadera→pierna→pantorrilla→zapato medía 1,485 y el
  torso estaba a 1,06, así que el pie terminaba en y = −1,06. En pantalla se leía como "tiene las
  piernas cortas". Se resolvió con la cuenta, no probando: torso a 1,44 y el pie en −0,045.

Y uno del techo: con Lambert la cara del techo apunta **hacia abajo**, o sea que recibe el color de
suelo de la hemisférica y el pasillo quedaba con el techo casi negro justo arriba de la cámara. Va sin
luz, que además es la referencia.

#### UNA LECCIÓN QUE NO ES DEL JUEGO SINO DE MIS PROPIOS PARCHES

`io.open(p,'w').write(expr)` **evalúa `io.open` antes que `expr`**: si `expr` falla, el archivo ya
quedó **en cero bytes**. Un `NameError` en el argumento me borró el juego entero (y sólo se pudo
reconstruir porque estaba partido en trozos en `/tmp`). De acá en más: se calcula el texto nuevo
completo, se comprueba, y **recién entonces** se abre para escribir.

#### EL BANCO
`prep2.py` ahora reescribe también las URL de MediaPipe a `/tmp/ui/mp`, por la misma razón que
three.js: **Chromium en el contenedor no usa el proxy de salida** (curl sí), así que un import
dinámico a jsdelivr falla con "Failed to fetch dynamically imported module". Y `h2.mjs` recuperó
`--use-fake-device-for-media-stream`, que se había perdido en una reversión: sin eso `getUserMedia`
tira `NotFoundError` y no se puede probar ni el micrófono de Eco ni las manos de Recreo.

Costo: 19 llamadas de dibujo y 8.988 triángulos. Con SwiftShader (software) **baja 42 fps · alta 20,3**.
Cero errores de página en diez corridas.

### Decimonovena vuelta (2026-08-27): **POMPOM** — un fondo generado por mundo, cinemática por nivel, bloom y estallidos

Pedido: *"agrega fondos diferentes para cada mundo de pompom generalos con highsfield y también agrega
que cada terminar un nivel haya una cinematica, también en algunos mundos pon Bloom efectos de
explosiones y fondos animados ya que debemos representar una historia, también los fondos no deben ser
súper elaborados o sea árboles y plantas sino que puede ser un fondo de hielo en cascada esas cosas"*.
`herramientas/pompom/hornear_fondos.py` + `herramientas/pompom/parche_cine.py`, idempotente.

#### OCHO FONDOS QUE PESAN 13 KB **LOS OCHO JUNTOS**

Generados con `z_image` en 9:16: niebla, dos lunas, dunas, mar, **una cascada congelada** (el ejemplo
textual del pedido), un cañón, una salina y un pico. Nada de árboles ni plantas, como se pidió.
De 1152×2048 PNG (3 MB cada uno) a **360×640 WebP**: se ven igual de bien estirados a pantalla
completa porque **no hay un solo detalle fino en ellos** — son manchas suaves, y no hay nada que se
pueda ver pixelado si no hay nada nítido.

**Se repiten EN ESPEJO.** Un nivel del mundo 8 son 40 unidades de alto y la imagen cubre unas 18:
repetirla derecha deja una costura cada vuelta; en espejo **no hay costura posible**, porque el borde
de arriba de una copia es exactamente el borde de arriba de la de al lado.

**Dos cosas que medí y salieron mal antes de salir bien:**
- El recorte de marco se comió medio dibujo. Pedía "plano y más claro que el centro", y **un cielo
  pálido liso cumple**: le arrancó 512 px de cielo al desierto y a la salina. Ahora exige plano, casi
  blanco en absoluto (>238) **y fino** (≤8% del lado) — un margen de póster nunca pasa de ahí.
- La mezcla contra el papel intenté sacarla del contraste de cada imagen y **midió peor**: la
  desviación estándar de la imagen entera está dominada por las zonas pálidas, que son casi todo el
  cuadro, así que la cascada —cuyo contraste es *local*— salía con std 15,8 y le tocaba menos mezcla
  que antes. Una regla que mide lo que no es el problema no le gana a un número comprobado en una
  foto. Quedó fijo en 46%.

#### EL BLOOM ES SELECTIVO, Y EN UN JUEGO BLANCO NO ES UNA PREFERENCIA

Un bloom de pantalla completa toma lo más brillante del cuadro y lo derrama — **y acá lo más brillante
del cuadro es el papel**. Sobre `#F7F6F3` devuelve una pantalla lavada donde ya no se lee ni la línea
de puntos. Así que el brillo **no se deduce de la imagen: se declara**. Cada cosa que tiene que brillar
se anota en una lista mientras se dibuja y al final se pinta a mitad de resolución como degradados
radiales, sumada con `lighter`. Cuatro o cinco degradados por cuadro contra un desenfoque de pantalla
completa: más barato **y** más correcto.
Y **no en todos los mundos**: va en el 5, 6, 7 y 8, donde la historia lo pide. Un brillo que está
siempre deja de significar algo. Los estallidos brillan en los ocho.

| | ms por cuadro |
|---|---|
| con efectos | 1,01 |
| sin efectos | 0,69 |

#### UNA CINEMÁTICA AL TERMINAR CADA NIVEL

**La línea es del MUNDO y no del nivel.** Veinte frases distintas por mundo serían ciento sesenta
frases que nadie lee a partir de la tercera; lo que cambia nivel a nivel es la barra, y lo que cambia
de mundo a mundo es el capítulo. Al cerrar un mundo, la cinemática dura 4,6 s en vez de 2,8 y agrega
"MUNDO {m} ATRÁS".
Se dibuja **en el lienzo de siempre** —el mismo fondo, el mismo clima, el mismo Pelusín con su pelo de
verdad cruzando el plano a saltitos— y lo único en DOM es el texto, que tiene que ser nítido en un
teléfono y poder traducirse. Y **se saltea con un toque en cualquier lado**: una cinemática obligatoria
repetida ciento sesenta veces deja de ser una historia y pasa a ser un peaje.

#### CLIMA: OCHO COSAS MOVIÉNDOSE

Niebla, polvo, arena, espuma, nieve, brasas, calor y aurora. **Las partículas viven en la pantalla y
no en el mundo**: el clima no es geometría —no hay que poder aprendérselo, ni tiene que ser igual en
todos los teléfonos— así que se guarda de 0 a 1 y se envuelve por módulo. Ponerlo en unidades de mundo
obligaría a toda la maquinaria de repetición del parallax para algo que el jugador no mira de frente.
La aurora del mundo 8 pasa por el bloom, y por eso ese mundo se siente distinto de los otros siete.

#### UN ESTALLIDO SON TRES COSAS A LA VEZ

La onda de choque que sale, las esquirlas que vuelan y **el fogonazo que brilla en el medio**. Con dos
de las tres se ve a medio hacer; el fogonazo es el que hace el trabajo y dura tres cuadros.

Verificado después de todo esto: los **160 niveles siguen jugándose solos con cero choques** y la
fracción segura mínima sigue en 0,121. Cero errores de página. El HTML pasó de 114 KB a **150 KB**,
de los cuales 18 son los ocho fondos en base64.

### Decimoctava vuelta (2026-08-27): **Pelusa pasa a llamarse POMPOM** — hub, tiendas, vidas y enemigos peludos

Pedido: *"haz que pelusa tenga un mejor nombre universal, haz que al entrar no sea botón jugar y eso
sino que sea nuestra pelusa siguiendo nuestro dedo ... abajo dice jugar y a los costados estará el
menú de tiendas para comprar colores o gorritos ... arriba para seleccionar niveles siempre pelusin
centrado no tan gigante y abajo al jugar siempre juegas el último nivel ... mejores enemigos peluzas
espinas con animaciones goty y que no solamente haya uno por sector ... también tienes 4 vida, hay
veces que en sectores puede Spawn un escudo o una vida más ... y los 5 mundos deben ser diferentes
entre si con mejor decoración"*. Todo con `herramientas/pelusa/parche_hub.py`, idempotente y
verificado: `commit anterior → parche_grande → parche_hub` da el mismo md5.

#### EL NOMBRE

**"Pelusa" es una palabra que hay que traducir; POMPOM se lee igual en todos lados** y además
*describe* al personaje, que es literalmente un pompón. El archivo pasó a `juegos-pc/Pompom.html`
(`git mv`, con el historial conservado). El bicho sigue llamándose Pelusín.

#### LA PRUEBA DE LA VUELTA: **160/160 JUGADOS SOLOS, 1.280 SALTOS, CERO CHOQUES**

Con 1.280 sectores (eran 880), hasta **cuatro enemigos por sector** (eran tres, y el tercero recién
aparecía en el mundo 6 pasado el 70%) y cinco formas. La cuenta sigue siendo una sola: `chocaRotor()`
la usan el validador y el choque de verdad.

#### EL AGUJERO DE FONDO DEL VALIDADOR: **"existe una ventana" no es "se puede jugar"**

Es el hallazgo de la vuelta y sólo salió porque el auto-jugador falló donde la auditoría decía que
todo estaba bien. El 5·16 daba 0,167 s de ventana —por encima de su mínimo— y el sector 8 era
**injugable**. Las dos cosas eran ciertas y el defecto estaba justo en el medio:

`ventana()` barre los **primeros 3,6 segundos** del nivel. Pero el jugador llega al sector 8 cuando
llega —a los treinta segundos, o a los noventa— y con cuatro rotores a frecuencias que no son
múltiplos entre sí (2,44 · −2,29 · 2,26 · −2,57) **el patrón nunca se repite igual**: el hueco que
existe al principio puede no volver a abrirse en los diez segundos siguientes al instante en que el
jugador está parado ahí. Con uno o dos rotores no se notaba porque el patrón casi se repetía; con
cuatro la fracción segura cayó al 6,4% y salió a la luz.

**El arreglo no es barrer más tiempo** —eso corre el problema más lejos— sino exigir también una
**fracción mínima de instantes seguros**. "Hay un hueco" es una propiedad del principio del nivel;
"el 12% de los instantes sirve" es una propiedad del sector, y ésa sí vale en cualquier momento.
Medido sobre los 1.280 sectores: la fracción más baja es **0,121**.

Y dos defectos más del generador, los dos aritmética:
- **La luna del satélite se paraba encima del nodo.** Gira a 0,71 de su bola; con la bola en la
  órbita nueva más chica (1,25) la luna llega a 0,54 del centro y la pelusa más la luna miden 0,62.
  Aterrizar era chocar **siempre**. Es el mismo defecto que ya había costado el pulso, con otro
  disfraz: todo lo que orbite más cerca que RP+su radio se come el punto de llegada.
- **Un rotor no puede quedar casi quieto.** La red de seguridad lo frenaba hasta el 10,7% de su
  velocidad: 0,2 rad/s son treinta segundos por vuelta. Ahora hay piso (0,55 rad/s) y, si con el piso
  puesto el sector sigue sin servir, el rotor se saca del todo — un respiro es infinitamente mejor
  que un sector imposible o que una espina congelada.

#### EL HUB: NO HAY BOTÓN JUGAR EN EL MEDIO, HAY UN BICHO

Lo que hay en el medio es Pelusín, y **sigue el dedo con un resorte**. Con un salto al dedo el pelo
quedaría tieso —el viento del pelo se alimenta de la velocidad del cuerpo— y justamente el pelo es lo
que hay que mostrar. La primera cosa que el jugador hace es tocar la pantalla y ver que algo peludo
le contesta: un botón no enseña nada.

`JUGAR` abajo y **arranca siempre en el último nivel al que llegaste** (lo dice abajo del rótulo:
`3 · 12`); `NIVELES` arriba con el progreso; `COLORES` y `GORROS` a los costados. Y **no tan
gigante**: estaba en escala 3,0, que en un teléfono da 90 px de radio con el pelo y tapa los botones
de los costados. A 1,70, además, las 118 cerdas dejan de contarse de a una y el bicho vuelve a
leerse a pelusa y no a erizo.

#### DIEZ COLORES Y NUEVE GORRITOS, DIBUJADOS POR CÓDIGO

Ni un asset: nueve gorros como imágenes serían nueve descargas para nueve dibujos de treinta líneas.
La muestra de cada artículo **es la misma pelusa con ese color o ese gorro puesto** — un cuadradito
de color no dice cómo va a quedar.

**El gorro va arriba del PELO, no arriba del cuerpo.** Puesto sobre el radio del cuerpo (0,42) la
corona quedaba adentro de los mechones, que llegan a 0,75: se compraba un sombrero y no se veía
ninguno. Y va **afuera del `scale()`** del muelle de aterrizaje: un sombrero que se achata cuando el
bicho rebota se lee a error de dibujo.

Las **motas** salen sólo de jugar: 2 por nivel nuevo y 3 si sale limpio. **No se puede farmear** —
repetir un nivel es gratis y no da nada, que es lo único coherente en un juego de tranquilidad.

#### CUATRO VIDAS, Y SIGUE SIN HABER PANTALLA DE DERROTA

El juego nació sin vidas a propósito y ahora las tiene porque el jugador las pidió. La forma de que
no se peleen con el tono: quedarse sin las cuatro **no es un game over**, es volver al primer punto
del mismo nivel con las cuatro otra vez. Lo único que se pierde es el *limpio*.
Y hay dos premios: el **escudo**, que se come un golpe entero, y la **vida**. Medido: 151 escudos y
121 vidas repartidos en los 160 niveles; con escudo puesto un golpe cuesta el escudo y **cero vidas**,
y el siguiente ya cuesta una.

#### LOS ESPINOSOS SON PELUSAS

Era un círculo liso con ocho palitos. Ahora es **la misma familia que el personaje**: un pompón rojo
erizado, con veinte cerdas cortas, dos ojitos, y tres animaciones que salen del reloj y no cuestan
estado — las espinas **respiran**, el cuerpo se **aplasta** en la dirección en la que va, y deja tres
**fantasmas** atrás sobre su propia órbita.
**El respiro es sólo dibujo**: la espina jamás se dibuja más larga que `R_ESP`, que es el radio con
el que choca. Si el dibujo se pasara del radio de choque, el jugador vería una espina atravesarlo sin
que pase nada — y a partir de ahí no podría confiar en lo que ve, que en un juego de puntería es lo
único que tiene.

#### LOS OCHO MUNDOS DEJAN DE PARECERSE

Antes los ocho eran discos y aros y lo único que cambiaba era un par de grises: dos mundos seguidos
se veían iguales con el brillo apenas movido. Ahora cada uno dibuja **otra figura** — disco, aro,
triángulo, rombo, arco, hexágono, cruz y estrella — y eso se nota de una ojeada sin leer un rótulo.

Costo: **0,74 ms por cuadro** con cuatro enemigos por sector, el rastro, los premios y las cuatro
capas. El HTML pasó de 81 KB a **114 KB**. Cero errores de página en las nueve corridas, en 900×460 y
en 412×915 táctil, sin solapamientos en el hub (medido: JUGAR 792-853, pie 880-903, niveles 89-141).

### Decimoséptima vuelta (2026-08-27): **Eco** — el menú a 60, menos texto, tres calidades y el tutorial en una sala aparte

Pedido: *"arregla eco, el menú es muy lag también en el menú quita un poco de texto we es demasiado y
haz que el tutorial sea en un espacio diferente si? así no nos confundimos con el juego real, también
que en el menú principal esté la regulación de 3 tipos de gráficos"*. Todo con
`herramientas/eco/parche_sala.py`, idempotente y verificado: parchear el commit anterior da el mismo md5.

#### EL MENÚ IBA A 8,4 CUADROS POR SEGUNDO Y LA CULPA NO ERA DEL MENÚ

**Debajo se estaba dibujando el juego entero.** Medido con el contador del propio renderer: **29
llamadas de dibujo y 80.487 triángulos** —el laberinto, los cinco modelos, la cosa con esqueleto—
tapados por un panel negro y opaco que no deja ver ni un píxel de eso. Se dibujaba para nadie.

| | antes | ahora |
|---|---|---|
| cuadros por segundo en el menú | **8,4** | **59,5** |
| mediana de cuadro | 127,7 ms | 16,7 ms |
| llamadas de dibujo en el menú | 29 | **0** |

Y dos animaciones de CSS que **no se pueden componer en la GPU**: los tres anillos del fondo tenían
el `border-width` animado —y llegan a escala 130, o sea que cada uno tapa la pantalla entera: tres
repintados de pantalla completa por cuadro para dibujar un aro— y el título latía con `text-shadow`.
El borde ahora es fijo y el latido es una copia borrosa del título a la que sólo se le mueve la
opacidad, que sí se compone.

#### TRES PÁRRAFOS PASAN A TRES LÍNEAS

Había tres fichas de sesenta palabras cada una en la pantalla que el jugador mira ocho segundos: eso
no se lee, se saltea, y lo que se saltea es lo mismo que después no se entiende. Quedan tres líneas —
*tu voz de verdad es la única luz · algo te oye hasta donde ves · cuatro llaves y la puerta abre*.
Lo largo lo cuenta la historia y **se aprende en la sala**.

#### TRES CALIDADES, Y CAMBIAN LO QUE CUESTA, NO LO QUE EL JUEGO ES

| | resolución | ondas a la vez | modelos 3D | grano | fps medidos |
|---|---|---|---|---|---|
| baja | 0,60 | 4 | no | no | **23,1** |
| media | 0,85 | 6 | sí | sí | **17,1** |
| alta | ×2 (o el del aparato) | 8 | sí | sí | **14,8** |

La resolución es el único ajuste que siempre paga: **todo** lo que se dibuja acá pasa por el shader
del sonido, que recorre las ocho ondas **por píxel**. En baja los modelos ni se piden — verificado
recargando con `baja` guardado: `modelos:false`, o sea 537 KB de la cosa más cuatro props que no se
descargan ni se animan. No se toca ni el grano ni las rayas en media/alta: son **la** imagen del
juego, y un ajuste de calidad que cambia lo que el juego *es* no es un ajuste, es otro juego.

#### EL TUTORIAL SE MUDA A UNA SALA DE PRÁCTICA

Antes se aprendía adentro del laberinto de verdad, y el problema no es de comodidad: **en un juego
donde no se ve nada, el jugador no puede distinguir "esto es una lección" de "esto es la partida"**.
Aprendía mientras se perdía.

Ahora es un cuarto rectangular de 13×13 con cuatro pilastras y una **llave de práctica** que contesta
igual que las de verdad —con la misma demora de ida y vuelta— pero **no cuenta como sello**:
verificado, al entrar al laberinto los sellos siguen en 0. Cuatro paredes rectas son la forma más
rápida de decir "esto no es el laberinto", porque el laberinto es justamente lo que no las tiene.

**VA A 110 METROS AL NORTE, y el número sale de una cuenta**: el grito más fuerte alcanza 50 m y el
laberinto mide 46 de lado (33 de centro a esquina), así que la esquina más cercana queda a 77 m.
Desde la sala no se puede despertar ni una llave ni a la cosa. Medido: el jugador arranca a **105,4 m**
del laberinto y caminar 200 cuadros emite **0 ondas**.

**Y LAS COLISIONES NO SALEN DE LA GRILLA.** Fuera de la grilla toda celda es pared —que es lo correcto
para el laberinto, porque el borde es pared— así que el jugador habría quedado clavado en el lugar.
Un cuarto rectangular se resuelve **recortando**, y recortar es exacto: no hay esquina que raspar.

**UN DEFECTO PROPIO, ENCONTRADO MIDIENDO Y NO MIRANDO:** el jugador arrancaba mirando la pared de
atrás, a 1,9 m. `ADEL` es `(sin giro, 0, cos giro)`, o sea que `giro=0` mira hacia **+Z**. El grito
llenaba la pantalla de un gris **perfectamente parejo** —brillo medio 59,7 y las cinco franjas en
59,7, que es la firma de una sola superficie a quemarropa— y no se veía el cuarto por ningún lado. En
el laberinto nunca se notó porque ahí se empieza en una esquina y para cualquier lado hay pared a dos
metros. Con `giro=Math.PI` las franjas pasan a 24,9 · 42,6 · 70 · 50,1 · 39,8: hay cuarto.

Y el cartel de arranque decía *"escuchá, hay una hoja acá al lado"*, que era cierto empezando pegado
a la primera nota del laberinto. En la sala no hay ninguna hoja: un cartel que miente en el primer
segundo es peor que no tener cartel.

**DOS TDZ EN EL MISMO PARCHE**, las dos del mismo tipo y las dos fatales —un `let`/`const` leído antes
de su línea no rompe una función, rompe el módulo entero—: `modelosPedidos` y `MOD`, los dos leídos
desde `aplicarCalidad()`, que corre al armar el menú, mil líneas antes de donde estaban declarados.
Es la cuarta vez en este proyecto que una declaración puesta "donde corresponde temáticamente" en vez
de "antes del primer uso" tira todo abajo.

Partida verificada de punta a punta: los cinco pasos del tutorial en la sala, la llave de práctica
levantada, y el salto al laberinto — `enSala:false`, la sala apagada, el jugador en la celda [0,0] a
26 pasos de la salida y con 0 sellos. Cero errores de página en nueve corridas.

### Decimosexta vuelta (2026-08-27): **Pelusa, segunda pasada** — pelo, fondo, historia y música

Pedido textual: *"ahora sí agrega más pelo y físicas mejores fondos parallax también más enemigos
niveles mapas etc etc etc y mejor menú we y una historia que aparece siempre al inicio, música
tranquilizadora sonidos tranquilos todo hermoso yayaya"*. Todo con
`herramientas/pelusa/parche_grande.py`, que es idempotente y **reproduce el archivo entero desde el
commit anterior** (verificado: parchear `9116b3a` da el mismo md5 que lo que está en disco).

#### LA PRUEBA DE LA VUELTA: **160 de 160 NIVELES JUGADOS SOLOS, 880 SALTOS, CERO CHOQUES**

Es la única afirmación que importa y es la que hace que las cinco formas nuevas se puedan dar por
buenas. **Todas las formas pasan por `chocaRotor()` y por nada más**: el validador que decide si un
nivel se puede pasar y el choque de verdad llaman a la misma función. Si fueran dos cuentas, el
validador estaría aprobando un juego que no existe — y el auto-jugador chocaría. No choca ninguna vez.

| | |
|---|---|
| auditoría de los 160 | 2,70 s |
| jugarlos solos | 6,8 s, 880 saltos, **0 choques**, 160/160 terminados |
| ventana más angosta usada | 0,071 s |

Y la ventana peor de cada mundo le gana a su propio mínimo: 1,010 · 0,635 · 0,250 · 0,187 · 0,156 ·
0,146 · 0,115 · 0,115 contra mínimos de 0,239 · 0,218 · 0,197 · 0,176 · 0,155 · 0,134 · 0,113 · 0,092.

#### CINCO ENEMIGOS, Y UNO CASI SALE IMPOSIBLE

`bola` (850) · `doble`, la bola y su antípoda (440) · `barra`, una hélice de dos brazos (303) ·
`cometa`, con tres bolitas de cola (129) · `satélite`, con una luna que gira encima (127).

**LA HÉLICE NO PUEDE LLEGAR AL CENTRO, y es aritmética.** El nodo es el centro de giro y también es
donde aterriza la pelusa: una barra que pase por el centro convierte *llegar* en *chocar* siempre,
gire como gire, y ningún ajuste de velocidad lo arregla. Los brazos arrancan a **0,86** del centro y
la pelusa mide 0,42 + 0,22 de barra = **0,64**: quedan 22 cm de aire en el punto de llegada.

**Y EL PULSO TAMPOCO.** Un anillo con `tipo:'pulso'` encoge su radio; con radio 1,15 y amplitud 0,58
la bola pasaba **por encima del nodo**. Va topado a `pa ≤ r − 1,05`, y si lo que queda es menor a
0,05 el rotor vuelve a fijo — un pulso de dos centímetros no se ve, sólo cuesta.

#### EL PELO: 118 MECHONES Y **DESVÍO DE 0,0021 A 0,3251**

De 62 mechones de tres tramos a **118 de cuatro**. El número no es capricho: con 62 sobre un círculo
de 0,42 hay una cerda cada 6 grados y el contorno se cuenta de a una — es un peine, no una pelusa.

Dos cosas nuevas y las dos salen de la **velocidad del cuerpo**, que se mide restando la posición del
cuadro anterior (el vuelo es una interpolación, así que no hay otra forma honesta de saberla):
1. **VIENTO**: el aire empuja el pelo hacia atrás mientras avanza. Sin esto el mechón sólo se atrasa
   por inercia, y la inercia se agota en dos cuadros: el latigazo dura un pestañeo y después el pelo
   va tieso a 12 unidades por segundo, que es exactamente lo que el pelo no hace.
2. **LA RIGIDEZ AFLOJA CON LA VELOCIDAD**: quieta es un cardo, disparada se peina sola.

Medido con `__pelusa.pelo()`, que compara cada punta contra dónde estaría un pelo tieso:

| | desvío de la punta | largo recto del mechón |
|---|---|---|
| quieta | **0,0021** | 0,23 |
| a 9,02 u/s | **0,3251** (155×) | 0,19 (se enrosca) |

Y **tres trazos por cuadro y no 118**: los mechones van agrupados en tres grosores y cada grupo es un
solo `stroke()`. Cada stroke es una orden de dibujo; 118 por cuadro a 60 por segundo son siete mil
órdenes por segundo para dibujar lo mismo. Con curva de Bézier por tramo, porque una polilínea de
cuatro segmentos en un mechón de 25 píxeles muestra los tres codos y el pelo queda de alambre.

#### EL FONDO: CUATRO CAPAS, Y SE REPITEN POR MÓDULO

Velocidades 0,045 · 0,130 · 0,300 · 0,560. Con una sola capa quieta detrás, subir doce unidades y
subir una se ven igual: no hay nada respecto de lo cual moverse, así que la pelusa no sube, la
pantalla se desliza.

**Se repiten por módulo sobre 42 unidades** y no se generan sin fin: un nivel del mundo 8 son 40
unidades de alto y una lista que no se repita nunca serían cientos de objetos por nivel para algo que
está al 40% de opacidad. Con 42 —más alto que las ~18 que ve la pantalla— la costura no cae nunca
adentro del cuadro. 60 objetos por mundo, y un par de grises por mundo: el fondo cambia de
**temperatura**, no de color.

**LAS OPACIDADES SE BAJARON DESPUÉS DE MIRAR UNA FOTO**, no antes: con 0,55 y 0,62 los discos lentos
competían con la línea de puntos —que es el enunciado del nivel— y el cuadro se leía a burbujas.

#### OCHO MUNDOS Y CUATRO TRAZADOS

De 6×20 a **8×20 = 160**. Y los caminos ya no son todos zigzag: `zigzag`, `ancho`, `columna` y
`espiral`, elegidos por **mundo + nivel**, así que dentro de un mundo los veinte no se parecen entre
sí. Un mundo entero de zigzag son veinte niveles que se sienten uno.
**Siempre se sube**: un paso de costado se paga alargando la separación, no achatando la subida — con
un salto casi horizontal la cámara no acompaña y el nivel se lee a pasillo.

#### LA HISTORIA, SIEMPRE Y DIBUJADA

Cinco planos al arrancar, salteables en un toque y repetibles desde el menú. **Por qué siempre**: el
juego no dice una sola palabra mientras se juega —no hay reloj, ni puntaje, ni texto— y sin la
historia lo único que el jugador sabe es que hay una bolita y unas espinas.
Y está **dibujada en un lienzo**, con la misma tinta y el mismo rojo de peligro que el juego: no hay
una sola foto en todo el archivo y no la va a haber, porque una foto pegada arriba de un juego de dos
colores se ve pegada arriba. El lienzo se achica **por los dos lados** (`max-width` y `max-height` en
un elemento reemplazado, que respeta la proporción solo): con el ancho fijo, en una ventana de 460 px
el plano se comía 300 y el texto y el botón se salían del panel.

#### LA MÚSICA ESTÁ MEDIDA, COMO EN ECO

Un acorde que no termina nunca: cuatro senos (fundamental, quinta, octava, novena) **doblados y
desafinados un 0,23 por mil** respecto de su gemelo. Ese desajuste minúsculo es todo el truco: dos
senos idénticos suenan a tono de prueba de audio, y dos que baten cada pocos segundos suenan a
instrumento. Encima, un pasabajos que se abre y se cierra a **0,055 Hz** —una vuelta cada dieciocho
segundos— que es lo que hace que respire en vez de zumbar. Cada mundo **transporta la raíz**, no
cambia de tema: ocho temas serían ocho cortes.

Medido con el analizador colgado del maestro, que es lo único que prueba que sonó:

| | rms |
|---|---|
| en mudo | **0,0000** |
| sólo la cama | 0,0109 – 0,0165 |
| `salta` | 0,0401 |
| `choque` | 0,0554 |
| `llega` | **0,0666** (6,1× la cama) |

La regla es la misma que en Eco: la música tiene que quedar **por debajo** del sonido de llegar a un
punto, porque llegar a un punto es la recompensa.

#### EL MENÚ

Los paneles pasan a ser **translúcidos** para que el mismo parallax del juego siga corriendo detrás, y
**la pelusa flota ahí con su pelo de verdad** — el pelo es física y la única forma de que se vea que
lo es antes de tocar nada es que esté ahí respirando. Va agrandada con una **transformación del
lienzo** y no con un radio distinto, así el pelo, la sombra y los ojos crecen juntos: a la escala del
juego mide 11 px de radio en un teléfono.
**Se le sacó el `backdrop-filter`**: desenfocaba todo lo de atrás, la pelusa incluida, o sea que el
único personaje del juego se veía como una mancha.
El velo del menú es un **degradé** y no una opacidad pareja: cerrado en la franja del texto, abierto
arriba y abajo. Y el icono de cada mundo dibuja **la forma que ese mundo estrena** — deducirla de la
lista de formas daba cuatro iconos iguales del 5 al 8, porque los cuatro terminan en la hélice.

Costo: **0,26 ms por cuadro** con las cuatro capas, los 118 mechones y el nivel dibujado. El HTML pasó
de 50 KB a **81 KB**, sin una sola dependencia y sin un solo asset. Cero errores de página en las seis
corridas, en 900×460 y en 412×915 táctil.

### Decimoquinta vuelta (2026-08-27): **Pelusa**, un juego nuevo

Un 2D de tranquilidad: tocás y la pelusa sale por una línea recta marcada hasta el punto siguiente,
donde giran bolas con espinas. Hay que tocar justo. **6 mundos × 20 niveles**, procedurales.

#### UN NIVEL GENERADO Y NO COMPROBADO ES UN NIVEL ROTO QUE TODAVÍA NO SE DESCUBRIÓ

Es la misma lección que costó siete niveles imposibles en Maicol. Acá el generador tira los nodos y
los anillos, y después **un validador barre los cuatro segundos de instantes posibles de salida**,
simula el vuelo entero y devuelve **la ventana más larga en la que se puede salir sano**. Si la
ventana es más corta que el mínimo del mundo, se afloja (menos vueltas, o un rotor menos) y se vuelve
a medir; si más del 82% del barrido es seguro, se aprieta — porque un salto que se puede hacer en
cualquier momento no es un salto, es un botón.

**Auditados los 120 en 2,25 s:**

| mundo | ventana más corta de todo el mundo | mínimo exigido |
|---|---|---|
| 1 · primer respiro | 1,008 s | 0,229 |
| 2 · dos lunas | 0,683 s | 0,203 |
| 3 · lejos y cerca | 0,642 s | 0,177 |
| 4 · la marea | 0,383 s | 0,151 |
| 5 · anillos que respiran | 0,367 s | 0,125 |
| 6 · todo junto | **0,308 s** | 0,099 |

El mínimo **nunca baja de 90 ms**: por debajo de eso deja de ser puntería y pasa a ser lotería.

#### EL VALIDADOR Y EL JUEGO USAN LA MISMA CUENTA, Y ESO TAMBIÉN SE COMPROBÓ

De nada sirve un validador que aprueba un juego distinto del que se juega. La posición de una espina
es una fórmula cerrada —`rotorPos(rotor, nodo, t)`— y la usan los dos: el barrido y el choque de cada
cuadro. La prueba es un jugador automático que salta **en el medio de la ventana** que dice el
validador: **8 niveles de 6 mundos, todos terminados, cero choques**.

Primera corrida: 4 de 8 con choques. No era el juego — era la prueba: devolvía **el primer instante
seguro**, o sea el borde exacto de la ventana, y redondearlo al cuadro más cercano cae ocho
milisegundos del lado malo. Un jugador tampoco apunta al borde.

#### EL PELO ES FÍSICA, Y CON VERLET A SECAS QUEDA UNA FREGONA

62 mechones de tres puntos con verlet. La primera versión tenía gravedad y restricciones de
distancia y nada más: los mechones **se caen todos para abajo** porque la gravedad es lo único que
los orienta, y el bicho quedaba con barba y calvo. Un pelo real tiene **rigidez**: sale perpendicular
a la piel y sólo se dobla. Cada punto se tira hacia donde estaría el mechón tieso, con la rigidez
bajando hacia la punta — la raíz casi no cede y la punta sigue al cuerpo, que es de donde sale el
latigueo al salir disparada.

#### LA GEOMETRÍA NO SE TOCA; LA CÁMARA SE ALEJA

Un nivel con semilla tiene que ser **el mismo nivel en cualquier pantalla**: si los nodos se
corrieran para caber, el 12 del mundo 4 sería otro nivel en cada teléfono. Medido: con los nodos en
una banda de ±2,3 y órbitas de hasta 2,15, hay que ver **5,16 unidades a cada lado**, y en un
teléfono 9:19,5 la altura sola daba 4,11 — las bolas de la derecha quedaban cortadas por el borde.
La escala la decide el lado que aprieta: `U = min(H/17,8 , W/10,32)`. Verificado en 412×892
(`entraTodo: true`) y en 1280×720.

#### LO QUE NO TIENE, A PROPÓSITO

No hay reloj, no hay vidas y no hay pantalla de derrota. Fallar cuesta **volver a tocar**: la pelusa
vuelve exactamente al punto del que salió —comprobado, `mismoLugar: true`— y ya. Un contador de
vidas convierte cada error en una pérdida, que es lo contrario de lo que pide un juego "de
tranquilidad". Lo único que se anota es si el nivel salió **limpio**.

Y **el anillo se duerme al llegar**: si siguiera girando, pararse en un punto sería pararse adentro
de un molinete. El peligro es el camino y nada más que el camino.

#### EL SONIDO, MEDIDO

Procedural, senos con ataque lento sobre **pentatónica** — la escala en la que cualquier nota suena
bien con cualquier otra, que en un juego de tocar cien veces por partida es la diferencia entre
música y tortura. En silencio el analizador da **0,0000**; salto 0,0707 de pico, nivel completo
0,1143, y el choque **0,1061** — el choque es lo más fuerte, que es lo que corresponde.

48 KB, un archivo, sin un solo asset: todo dibujado por código.

### Decimocuarta vuelta (2026-08-27): **cuatro animaciones y un screamer**

Pedido: *"agrégale rig al monstruo y animaciones de búsqueda caminar correr y screamer"*. Los cuatro
clips salieron de la biblioteca de Meshy vía `image_to_3d` (`Walk_Slowly_and_Look_Around` 341,
`Casual_Walk_inplace` 613, `Lean_Forward_Sprint_inplace` 644 y `Zombie_Scream` 386) y se juntaron en
un solo GLB con `herramientas/eco/juntar_clips.py`.

#### CADA GENERACIÓN TRAE SU PROPIO RIG, Y ESO ROMPE EL COPIAR Y PEGAR

El generador da **un archivo por animación**, cada uno con su copia de la malla: cuatro clips serían
cuatro mallas de 8.374 triángulos adentro del HTML para dibujar siempre la misma criatura. Lo obvio
es tomar una malla y copiarle los canales de las otras por nombre de hueso. **No funciona, y se
midió por qué:** aun con la misma imagen y la misma semilla, cada tanda devuelve mallas de 9.314,
9.387 y 9.457 vértices y **poses de reposo distintas** — la rotación de reposo de la cadera es
(-0,33 -0,33 -0,68 0,57) en una y (0,49 0,49 -0,59 0,43) en otra. Un canal de rotación es **local al
padre**: copiado sobre un hueso que arranca mirando para otro lado, el bicho sale doblado en dos. Se
probó y se vio: el torso a noventa grados y un brazo saliéndose del cuadro.

**Lo que sí funciona es pasar por el mundo**, que es el retarget de siempre:
1. cinemática directa sobre el esqueleto de origen → rotación mundial de cada hueso por fotograma;
2. corregir por la diferencia de reposo, que sale de las **matrices de bind** y no de los nodos:
   `Rw_destino = Rw_origen · inv(Rw_reposo_origen) · Rw_reposo_destino`;
3. volver a local dividiendo por la rotación mundial del padre **ya corregido**, de arriba abajo.

**Y HUBO UN SEGUNDO ERROR, DE UNIDADES.** La altura de la cadera se tomó primero de `inv(matriz de
bind)`, que devuelve la pose en el mundo del esqueleto — o sea **con la escala del Armature**, 0,01,
porque el rig viene en centímetros — mientras que la traslación de un nodo está en centímetros.
Mezclarlos ponía la cadera a un centímetro del piso: el cuerpo quedaba hecho un acordeón y en
pantalla sólo se veía la cabeza. Va en el espacio de los nodos.

Comprobado midiendo el recorrido de un pie y de una mano a lo largo de cada clip:

| clip | pie en Z | pie en Y | mano en Z | qué es |
|---|---|---|---|---|
| caminar | 0,62 m | 0,05 | 0,45 | zancada de caminata |
| correr | **1,18 m** | **0,44** | 0,95 | zancada larga y rodilla alta |
| busqueda | 0,65 m | 0,14 | **0,25** | camina, pero los brazos quietos |
| screamer | **0,12 m** | 0,16 | **0,65** | no camina: tira los brazos |

#### EL ANDAR Y LA VELOCIDAD SON LA MISMA DECISIÓN

Antes había dos velocidades y **un** ciclo estirado por un factor: a 3,30 m/s el ciclo de caminata
iba al doble y los pies patinaban. Ahora hay tres andares y cada uno trae su velocidad y el ritmo
para el que está hecho su clip, así que la zancada avanza lo que avanza el cuerpo por construcción:

| andar | velocidad | cuándo |
|---|---|---|
| **búsqueda** | 1,35 m/s | ronda: camina despacio y mira para todos lados |
| **caminar** | 2,30 m/s | te oyó y viene, a más de 13 m |
| **correr** | 3,55 m/s | te tiene a menos de 13 m |

Correr sigue siendo 5,50: sigue siendo cierto que corriendo se le gana. Y ahora **el andar se puede
leer**: si la ves caminando todavía hay tiempo. Verificado en partida: `ronda` → búsqueda a 1,35;
`caza` a 21,08 m → caminar a 2,30; `caza` a 8,58 m → correr a 3,55. El cambio de clip se **funde** en
0,28 s, porque un corte se ve aunque la criatura esté a veinte metros y la ilumine media onda.

#### EL SCREAMER ES UN MOMENTO, NO UN SONIDO

El agarrón era una línea: te teletransportaba en el mismo cuadro y **no se llegaba a ver nada**, que
en un juego a oscuras es tirar a la basura el único momento que da miedo. Ahora son **1,35 s** en los
que la cosa se planta, te obliga a mirarla —la vista se va sola hacia ella—, grita, y **el mundo se
enciende entero**, porque la luz de este juego es el sonido y ese grito es un sonido. Recién después
te tira a la entrada.

Es lo único del juego que le saca el control al jugador. Verificado: durante el grito, `caminar(30)`
deja al jugador clavado (`velMax 0`), el fogonazo está en 1, y al terminar aparece en la entrada con
la cosa aturdida 9 s y a 45 m.

El grito **es el sonido más fuerte del juego**, y tiene que serlo: es el único momento en que el
juego habla más fuerte que el jugador. Medido con el analizador: fondo 0,0130 de RMS, grito del
jugador 0,0356, **screamer 0,0708** — o sea **2,0× el grito del jugador** y 5,4× el fondo. Tres
formantes que **bajan**: un grito que sube suena a persona, uno que baja suena a animal grande.

#### COSTO

El GLB de la cosa pasó de un clip a cuatro: 370 → **537 KB**, con las rotaciones de la animación a
dos bytes (un cuaternión siempre está entre -1 y 1 y el formato admite short normalizado sin ninguna
extensión: la mitad de la animación, con cinco milésimas de grado de error) y a 24 fotogramas por
segundo. En partida: 29 llamadas de dibujo, 81.388 triángulos, **0,6 ms por cuadro**, cero errores.
El HTML quedó en **2,18 MB**.

### Decimotercera vuelta (2026-08-26): **modelos 3D de verdad** — la cosa y cuatro props

Pedido: *"por cierto genera modelos 3D de props y el monstruo también como la imagen"*, con un dibujo
de la criatura adjunto. Cinco GLB generados con Higgsfield (`image_to_3d`), podados con
`herramientas/eco/podar_glb.py` y metidos con `meter_modelos.py`; el enganche lo hace
`parche_modelos.py`.

#### LA COSA VIENE RIGGEADA, ASÍ QUE NO HAY QUE ELEGIR ENTRE FORMA Y ANIMACIÓN

`image_to_3d` acepta `enable_rigging` + `enable_animation`: la criatura salió del dibujo del usuario
**con esqueleto de 24 huesos y ciclo de caminata**. Sin eso habría habido que elegir entre un modelo
que se parece al dibujo y un bicho de cajas que camina. Mide 2,45 m, 8.363 triángulos, y el ciclo va
**con la velocidad y no con el reloj** (`mixer.update(dt · vel/1,45)`): un ciclo a paso fijo sobre
algo que acelera de 1,55 a 3,30 m/s patina los pies, y patinar es lo único que hace que un monstruo
se lea a muñeco.

El cuerpo de cajas **no se borra, se apaga** (`cosa.viejo.visible=false`): si un GLB no decodifica,
se vuelve a prender y el juego sigue teniendo monstruo.

#### TRES COSAS QUE HAY QUE RESOLVER PARA QUE UN GLB ENTRE EN *ESTE* JUEGO

1. **Acá nada tiene material propio.** Todo se dibuja con el shader del sonido; un modelo con su
   material se vería en silencio y el juego se cae. Se les tira el material y se les pone `matMundo`
   — y para eso el shader tuvo que aprender **esqueleto** e **instancias**. Va todo en el MISMO
   material: three.js pone `USE_SKINNING`/`USE_INSTANCING` según el **objeto**, no según el material,
   y compila un programa por combinación. Una definición cubre las tres.
2. **El prop repetido va instanciado.** 17 props sueltos serían 17 llamadas de dibujo; con
   `InstancedMesh` son **4**, haya los que haya.
3. **Carga en diferido y degrada.** Los cinco GLB se decodifican después de arrancar.

#### PODAR EL GLB: 1,45 MB → 734 KB, Y SE COMPRUEBA QUE NO CAMBIÓ NADA

Se pueden tirar muchos bytes justamente porque el shader sólo lee POSITION y NORMAL:

| | antes | después |
|---|---|---|
| cosa (con esqueleto) | 597 KB | **370 KB** |
| pozo | 222 KB | **99 KB** |
| figura | 194 KB | **89 KB** |
| brasero | 239 KB | **105 KB** |
| columna | 196 KB | **88 KB** |

Fuera las coordenadas de textura; la **normal a un byte** (es un versor: medio grado de error sobre
un coseno no se ve ni midiendo); la **posición a dos bytes** en las mallas sin esqueleto (Meshy
devuelve la malla dentro de una caja de lado 2, así que un short normalizado da 3 centésimas de
milímetro de error sobre dos metros); y los **pesos y los índices del esqueleto a un byte** — 108 KB
sólo eso. Comprobado renderizando podado contra original en el mismo encuadre: **diferencia media
0,03 sobre 255 y 0,02% de píxeles distintos**. O sea: idéntico.

**TRES DEFECTOS PROPIOS, Y LOS TRES SILENCIOSOS:**
- **El `min`/`max` de un accesor va en las unidades GUARDADAS, no en metros.** Con el min/max en
  float sobre un accesor normalizado, three.js —que divide esos números por 32767 al armar la caja—
  calculaba un volumen de **47 micras**, ponía la cámara adentro y **no dibujaba nada**. La malla
  estaba perfecta; la que mentía era la caja.
- **`[] is None` es falso.** `soldar()` devuelve listas, así que una malla sin esqueleto salía con
  `joi=[]` y la guarda `joi is None` no se cumplía nunca: la cuantización de posición **no se
  aplicaba jamás** y no fallaba nada, sólo no ahorraba.
- **Un VEC3 de shorts son 6 bytes y la especificación pide múltiplo de 4.** Va con paso 8 y dos
  bytes de relleno: apretado a 6 three.js igual lo lee, pero el archivo queda inválido y eso se paga
  en la próxima versión de la biblioteca, no hoy.

#### LOS OJOS SE MUDAN AL HUESO DE LA CABEZA

Son lo único de la cosa que emite luz propia y de cerca, o sea el aviso de "la tenés encima". Van
colgados del hueso `Head`, que **el rig trae en centímetros**: su escala mundial es 0,0102, así que
un offset puesto a ojo en metros deja los ojos a ocho metros de la cabeza. Se divide por esa escala.
El gancho `__eco.huesos()` es el que lo dice.

#### MEDIDO CON TODO PUESTO

35 llamadas de dibujo, **84.796 triángulos**, **0,5 ms por cuadro** con SwiftShader, cero errores.
5 de 5 modelos cargados, 17 props en 4 mallas instanciadas. Y lo de la vuelta anterior sigue en pie:
caminar y correr con la cosa al lado dan **0 ondas** y no la despiertan; gritar hace contestar a las
llaves y se puede ir a buscarlas. El HTML pasó de 937 KB a **1,95 MB**.

### Duodécima vuelta (2026-08-26): **Eco se juega con el micrófono de verdad**

Pedido textual: *"que solamente te puedas mover pero no hagas ruido al caminar, que se use el
micrófono y eso es lo único que debes poder usar para ver alrededor y ya"*. Se hizo con
`herramientas/eco/parche_micro.py`, que es idempotente (comprobado: dos pasadas dan el mismo archivo).

#### LOS BOTONES DE VOZ ERAN UNA IMITACIÓN

HABLAR y GRITAR eran dos botones con dos esperas y dos alcances fijos. Ahora entra
`getUserMedia` y **el alcance de la onda sale del nivel que entra por el micrófono**: no hay dos
opciones, hay una rampa. Verificado en el navegador con el micrófono de verdad (`estado:'si'`,
`on:true`), y medido inyectando el nivel crudo con el gancho `__eco.micNivel(rms)`:

| | alcance | brillo medio | pantalla encendida |
|---|---|---|---|
| silencio | — | **0,0** | **0 %** |
| susurro (k=0,10) | 10,4 m | 6,0 | 0 % |
| hablando (k=0,40) | 23,6 m | 15,3 | 63,1 % |
| gritando (k=1,0) | 50 m | 67,4 | 100 % |

**La escala es logarítmica y no lineal**, porque el oído lo es: en lineal, hablar normal y gritar
quedan los dos pegados arriba y el susurro no existe.

#### CAMINAR NO HACE ABSOLUTAMENTE NADA

Se fueron la pisada, el ruido del salto y el del aterrizaje. Medido con la cosa **a 4,2 m** y
despierta, andando 120 cuadros:

| | andado | ondas de luz | la cosa |
|---|---|---|---|
| caminar | 5,63 m | **0** | ronda |
| correr | 9,99 m | **0** | ronda |
| agachado | 2,58 m | **0** | ronda |

Y cruzando **20 celdas** del laberinto: **0 ondas**, la cosa sigue en `ronda`. Antes correr se oía a
24 m; ahora moverse es gratis y lo único que existe es lo que sale de tu boca.

#### LA REGLA SIGUE SIENDO UNA: TE OYE HASTA DONDE VES

`COSA_OYE` pasó de 46 a **50**, que es exactamente el alcance máximo de la voz: con 46 contra 50 la
frase dejaba de ser cierta justo en el grito más fuerte, que es cuando el jugador la comprueba.
Medido, con la cosa puesta a una distancia exacta:

| voz | alcance | 4,2 m | 12,6 | 21 | 25,2 | 37,8 | 42 |
|---|---|---|---|---|---|---|---|
| susurro | 10,4 m | caza | ronda | — | — | — | — |
| hablando | 23,6 m | — | — | caza | ronda | — | — |
| gritando | 50 m | — | — | — | — | caza | caza |

Y las llaves contestan por el mismo alcance: con llaves a 33,9 / 29,7 / 17,3 / 29,7 m, un susurro no
despierta ninguna, hablando contesta **sólo la de 17,3**, y gritando contestan **las cuatro**.

#### DOS COSAS QUE HAY QUE HACER Y NO SON OBVIAS

- **EL PISO SE MIDE Y DESPUÉS SE SIGUE AJUSTANDO.** Un micrófono de teléfono en un cuarto callado y
  uno de notebook al lado de un ventilador no dan ni parecido: con un umbral fijo el juego queda
  encendido para siempre o apagado para siempre. Se escucha segundo y medio al empezar y ése es el
  cero. Y sigue corrigiendo **despacio y sólo mientras estás callado** (ocho segundos de constante):
  medido, con un fondo nuevo de 0,006 el piso sube 0,004 → 0,00639 (5 s) → 0,00823 (13 s) y **`k`
  nunca deja de ser 0**, o sea que el ruido del cuarto no enciende el laberinto. Si siguiera también
  mientras hablás, hablar mucho rato te dejaría ciego.
- **EL MICRÓFONO NO SE CONECTA AL MAESTRO.** Si se conectara, el jugador se oiría a sí mismo por los
  parlantes con el retardo del navegador: eso no es un efecto, es un acople. El micrófono va **sólo
  al analizador**. Y lo que devuelve el juego es la **cola** de reverb y no una voz sintetizada —
  el jugador ya se oyó con sus orejas; repetírsela suena a doblaje mal hecho.

#### EL RESPALDO, QUE HACE FALTA

Si el permiso se niega o el aparato no tiene micrófono, el juego quedaría imposible de jugar. Con el
micrófono negado a propósito: aparece el aviso, sale el botón VOZ y la tecla `E` emite una onda
media. Verificado: `bVoz` en `flex`, `E` produce una onda, cero errores.

#### EL MEDIDOR VA EN LA COLUMNA DE ARRIBA, Y ESO SE APRENDIÓ ANTES

El aviso del micrófono empezó suelto en el medio de la pantalla y se pisaba con el tutorial, que
ocupa justo esa franja. Va adentro de `#top`, donde el solapamiento es **imposible por
construcción** — la misma lección que ya había costado una vuelta con el HUD. El medidor sí va
abajo, y en teléfono sube a 78 px porque el botón LEER vive en el borde.

### Undécima vuelta (2026-08-26): **Eco cambia de juego** — llaves, voz y un perseguidor

Pedido textual: *"cambiemos el plan de eco ahora no hay formas de ver a menos que hables o grites y
hay que escapar de uno que te persigue y hay que andar callado hay que escapar buscando llaves en
habitaciones etc cambia todo"*. Se hizo con `herramientas/eco/parche_llaves.py`, que es idempotente.

#### LA REGLA NUEVA, Y ES UNA SOLA: **te oye hasta donde ves**

`ruido()` pasó a llevar un parámetro más, `ver`. Un ruido siempre **suena** y la cosa siempre lo
**oye**; lo que cambia es si además **enciende**. Los pies, el salto y la caída van con `ver:false`.
Y la cosa dejó de oír por *fuerza* y pasó a oír por *alcance*, que es el mismo número que ve el
jugador. Medido con el gancho `__eco.pisada(fuerte, agachado)`, con la cosa puesta a una distancia
exacta y sin dejarla moverse:

| lo que hacés | ondas de luz | la oye a 12,6 m | a 16,8 m | a 21 m | a 25,2 m |
|---|---|---|---|---|---|
| caminar (15 m) | **0** | caza | ronda | — | — |
| correr (24 m) | **0** | — | — | caza | ronda |
| agachado (4 m) | **0** | — | — | — | — (ni a 4,2 m) |

Y la voz, con el mismo método: **hablar** (15 m) despierta a la cosa a 12,6 m y no a 25,2;
**gritar** (46 m) la despierta a 25,2 y a 42.

#### DOS VOCES Y NO UNA

Con el grito solo, un laberinto a oscuras son cuatro segundos de espera por cada paso: eso no es
tensión, es un semáforo. **HABLAR** (`Q`, o el botón nuevo) espera 1,15 s, llega a 15 m y da un
destello del 26%. **GRITAR** (`E`) espera 4 s, llega a 46 m y da el destello entero. Medido con
`__eco.brillo()`, que lee el búfer de verdad con `readPixels`:

| | brillo medio | pantalla encendida |
|---|---|---|
| en silencio | 0,0 | 0 % |
| hablando | 10,6 | 22,3 % |
| gritando | 60,5 | 100 % |

#### LAS LLAVES CONTESTAN, Y ESO ES LO QUE HACE QUE BUSCARLAS SEA UN JUEGO

Cuatro llaves, una en cada una de las cuatro salas (las salas ya existían y son los únicos cuatro
lugares que no se parecen a un pasillo). Cuando una onda tuya toca una llave, la llave **suena** —
pero **tarde**, a `2·d / 13,5 m/s`: un tintineo a los tres segundos quiere decir veinte metros. Sin
esa demora las cuatro sonarían igual y no dirían nada. Y **la flecha sólo apunta a una llave que ya
te contestó**: si apuntara siempre a la más cercana, buscar sobraría.

Los cuatro enigmas viejos (los tambores, el corredor silencioso, el aro de los golpes y el eco
largo) se fueron; los tambores, los arcos, el aro y los postes **quedan como ruina**, porque eran
los mojones que hacían que una celda se distinguiera de otra.

#### DOS COSAS QUE SE MIDIERON Y ESTABAN MAL

- **La llave no se levantaba al pasarle por encima.** El radio era 1,30 m, pero la llave va en el
  centro de su celda y el pedestal frena el cuerpo a 0,80 m: cruzar la celda por el borde te deja a
  2,1 m, y en diagonal a 2,97. En un juego a oscuras eso es pisar lo que buscás y no enterarte.
  Ahora **estar en su celda ya cuenta**, además del radio de 2,20 m.
- **Un material compartido por las cuatro llaves.** El brillo se calcula por llave y se escribía en
  el mismo sitio: mandaba la última del bucle. O sea que la llave que tenías al lado se veía apagada
  si la cuarta estaba lejos. Un material por llave.

#### LA CINEMÁTICA HABÍA QUEDADO MINTIENDO

El pie de pantalla de la cinemática **es** el texto que se escucha, así que cambiar el guion sin
rehacer la voz sería peor que no tener voz. Se rehicieron **las doce** (cuatro planos × tres
idiomas) con una sola voz —mezclar dos narradores en cuatro planos se nota más que el cambio— y
también **la foto del plano 4**, que mostraba unas hojas escritas cuando el texto nuevo habla de una
puerta de cuatro cerraduras. 284 KB de voz y 24 KB de foto; el archivo quedó en 929 KB.

#### LA COSA APARECE ANTES Y NO SE OLVIDA DE VOS

`COSA_GRACIA` bajó de 25 s a 12: aparece apenas termina el tutorial, que es cuando el jugador recién
sabe hablar y gritar. Y la ronda dejó de ser al azar puro: la mitad de las veces elige una celda a
tres o cuatro de donde estás. Sin eso, quedarse agachado en un rincón sin hacer un ruido era una
partida ganada — la cosa se iba a la otra punta y no volvía nunca.

### Décima vuelta (2026-08-26): la estática de Maicol y **Eco terminado**

#### LA ESTÁTICA AL CAMINAR NO ERA EL SONIDO, ERA EL DISPARADOR

`son('pisa')` estaba en la rama de choque del eje Y, y **esa rama corre todos los cuadros mientras
se está parado en el piso**: la gravedad empuja la caja dentro del suelo en cada cuadro y el choque
se resuelve de nuevo. Medido con un contador de llamadas, corriendo dos segundos: **24 pisadas por
segundo superpuestas**. Eso no es una pisada, es ruido blanco.

Ahora la pisada de aterrizar suena sólo en la transición **aire → piso**, y los pasos de caminar van
por el **ciclo de la animación**: el ciclo tiene ocho cuadros y dos apoyos, el 0 y el 4, que es donde
el pie toca. Atado ahí, la cadencia del sonido y la de las piernas son la misma cosa por
construcción y cambian juntas con la velocidad. Medido igual: **4,5 por segundo**, que es un trote.
Y la muestra también: el paso lleva su propio sonido, más corto y con el ruido filtrado bajado de
0,50 a 0,22, que es lo que sonaba a estática al repetirse.

#### ECO: HISTORIA, IMÁGENES Y AMBIENTE

Eco ya tenía tutorial, cuatro enigmas, el monstruo que caza por el ruido y las notas. Le faltaba
todo lo que rodea al juego.

- **Historia de cuatro planos con voz en tres idiomas** (12 clips), misma arquitectura que Maicol:
  la voz manda el tiempo de cada plano y hay plazo de respaldo si el audio no arranca. En un juego
  que empieza en **negro absoluto y sin una sola palabra**, lo primero que le falta al jugador no es
  una mecánica: es saber dónde está y por qué le importa.
- **Imágenes en el tono del juego**, no en el de Maicol: casi todo negro, contornos apenas
  insinuados, grano alto. El plano 2 es un pasillo dibujado **sólo** por anillos de sonar, que es
  literalmente lo que hace el juego.
- **El nombre dibujado** con anillos de eco, y telón de fondo en el menú.
- **Cama de ambiente, y el volumen está MEDIDO.** Acá el sonido no es adorno, es el mecanismo: la
  regla de este juego ya estaba escrita para el zumbido de fondo —a 0,030 competía con un grito y un
  grito tiene que ser un **acontecimiento**, no un matiz—. La cama nueva se puso al mismo criterio y
  se comprobó: fondo con ambiente **0,0117** de RMS, durante un grito **0,0238**, o sea que **el
  grito queda 2,03× por encima**. Sin ambiente el fondo era 0,0089, así que la cama sube el piso un
  31% y no se come el grito.
- Todo el audio cuelga del **maestro**, que es lo que ya medía el analizador de Eco.
- El HTML de Eco pasó de 229 a **835 KB**.

### Novena vuelta de `Maicol.html` (2026-08-26)

Pedido: *"el salto suena nada que ver y hay otros sonidos que no da"*. Las dos cosas ciertas, y las
dos se pueden medir en vez de discutir.

#### EL MEDIDOR: DIRECCIÓN DEL TONO POR AUTOCORRELACIÓN

Un blip de arcade es una **envolvente de tono**: el salto sube, el golpe baja. Eso se mide. Se
rastrea el tono ventana por ventana y se compara el primer tercio contra el último.

Primero lo hice con el **centroide espectral** y estaba mal: en una onda cuadrada los armónicos
pesan más que el fundamental, así que una arpegiada que **sube una octava** movía el centroide
apenas un 10% y el control la daba por "plana". La **autocorrelación** busca el período que se
repite, o sea el fundamental, que es lo que el oído llama tono. Dos trampas más, las dos
encontradas mirando el rastro cuadro por cuadro:
- **`fmin` = 90 Hz dejaba fuera las caídas.** El golpe termina en 80 Hz y la muerte en 70: el
  período de esas notas no entraba en la ventana de búsqueda, el algoritmo se agarraba de un
  **armónico** y reportaba **+575% y +738% de subida en dos sonidos que bajan**. Con `fmin` = 55 Hz
  entran.
- **Si el máximo cae en el borde de la búsqueda no es un pico, es que no encontró nada.** Devolvía
  2756 Hz —justo el límite de arriba— en las ventanas donde el sonido ya se había apagado, y esas
  ventanas falsas daban vuelta la lectura.

#### EL VEREDICTO: 1 DE 7 CONTRA 10 DE 10

Con el medidor andando, los efectos que había:

| efecto | tiene que | estaba |
|---|---|---|
| **salto** | subir, ~0,2 s | **plano y de 0,91 s** |
| **resorte** | subir | **bajaba** |
| **golpe** | bajar | **plano** |
| estrella | subir | plano y a 0,357 de pico contra 0,81 del resto |

Los volví a pedir al modelo con prompts mucho más explícitos y **pasó uno de siete**. Sintetizados
—escribiendo la envolvente de tono a mano— pasan **diez de diez**. Un modelo de texto-a-audio no
toma órdenes sobre la dirección del tono ni sobre el largo. **La música sigue generada**, que es
donde el modelo aporta algo que no se escribe a mano.

#### LOS QUE NO DABAN

- **`son('agacha')` no lo llamaba nadie.** El archivo estaba cargado y mapeado desde la vuelta
  pasada, y no había una sola llamada en todo el juego: un sonido que nunca se dispara es un sonido
  que no existe. Ahora suena al pasar de parado a agachado.
- **`pisotón` no tenía sonido propio** y caía al oscilador viejo.
- **`final` sonaba igual que `meta`**: terminar el juego sonaba igual que terminar un nivel. Ahora
  tiene su propia fanfarria, más larga y con acorde final.

Comprobado en el navegador, disparando cada uno y leyendo el pico del analizador: **los diez suenan**
— salto 0,48 · pisa 0,37 · estrella 0,69 · daño 0,51 · muerte 0,68 · resorte 0,55 · meta 0,81 ·
final 0,67 · agacha 0,68 · pisotón 0,51. Y agachándose de verdad en el juego el pico sube de 0,171
(sólo música) a 0,215.

### Octava vuelta de `Maicol.html` (2026-08-26)

Pedido: *"agrégale que el menú sea más god, métele una foto recortada del nombre y de fondo una
foto de esos dos, una de Maicol saliendo de un lado a la izquierda y otro a la derecha... también
genera los fakin sonidos we no cargan, mejora todos los sonidos y música de fondo"*.

#### LOS SONIDOS NO CARGABAN, Y LA CAUSA ERA LA ARQUITECTURA

Estaban hechos con elementos `<audio>` sueltos. Dos problemas, los dos de fondo:

1. **Con `<audio>`, para que un efecto suene encima de sí mismo hace falta una copia por voz.** Ocho
   efectos × tres copias, más cuatro temas, más doce líneas de la cinemática = **28 elementos de
   audio vivos**, cada uno decodificando su propio base64. Los teléfonos limitan cuántos se pueden
   tener a la vez y **cuando se pasa el límite no tiran error: simplemente no suenan**.
2. **Un `<audio>` suelto no pasa por el contexto de audio, así que NO SE PUEDE MEDIR si sonó.** El
   analizador leía **pico 0** con la música supuestamente sonando. O sea que ni siquiera había forma
   de saber si andaba: sólo se podía comprobar que la llamada no tiraba error.

Ahora va todo por **WebAudio**: se decodifica una vez al arrancar y cada disparo es un
`BufferSource` nuevo. No hay límite, se superponen solos, y **todo pasa por el maestro**, así que el
pico del analizador es la prueba. Medido: los 24 clips decodificados, y `estrella` 0,33 ·
`salto` 0,38 · `dano` 0,52 · `meta` 0,56 de pico, con la música sola en 0,10. Antes: **0**.

De yapa, el bucle de la música ahora es exacto: `loop` de un `BufferSource` vuelve al cero del
buffer sin el hueco de milisegundos que deja el `loop` de un `<audio>`, que en un tema de 14
segundos se escucha en cada vuelta. Y las voces de la cinemática se decodifican **sólo si se mira
la historia**, no al arrancar.

Un detalle del re-encodeo: el recorte de silencio dejaba el sonido de la estrella en **0,03 s** —un
click— porque venía bajito y el umbral se lo llevaba entero. Ahora baja el umbral hasta que quede
al menos 0,12 s, y si aun así no alcanza no recorta: mejor un efecto con silencio adelante que un
efecto que no existe.

#### EL MENÚ

- **El nombre es una imagen recortada.** Un título escrito con la fuente del sistema y tres sombras
  encima es lo que delata a un menú hecho en HTML; un logo dibujado se lee a juego.
- **Los dos hermanos entran uno por cada costado**, pegados al borde de abajo y **cortados por el
  lado**: un personaje entero y centrado se lee a calcomanía pegada encima, uno que entra desde
  afuera del cuadro se lee a que el mundo sigue más allá del menú. Entran deslizándose y después
  flotan despacio, cada uno a su ritmo.
- Telón nuevo de bosque con el centro vacío a propósito, y **el velo violeta bajó de 0,62 a 0,30**:
  con el anterior el bosque quedaba morado y turbio. El logo y las cajas traen su propio contraste,
  así que el scrim casi no hacía falta.

- Música y efectos regenerados con prompts de chiptune de 16 bits en vez de descripciones genéricas.
- El HTML quedó en **1668 KB**. En el perfil del teléfono: **53 fps**, cero errores.

### Séptima vuelta de `Maicol.html` (2026-08-26)

Pedido: *"las animaciones nada que ver"*. Tenía razón y se ve al medirlo.

- **LOS 48 CUADROS NUEVOS ERAN OTRO PERSONAJE.** Puestos al mismo alto que el original, la cabeza
  pasaba de **un quinto del cuerpo a un tercio**: un chibi con la misma ropa. Al jugar, pasar de
  correr a agacharse **cambiaba el dibujo entero**.
- **La causa es concreta:** el modelo de la vuelta anterior (`recraft_v4_1`) **no acepta imagen de
  referencia**, así que lo único que ataba al personaje eran las palabras del prompt — y las
  palabras describen ropa, no proporciones. Cada hoja salió con el chibi que le pareció.
- **El arreglo es de construcción, no de descripción.** Se saca el cuadro 8 del atlas —el quieto
  **original**, que es el personaje de verdad—, se agranda, se limpia con `nano_banana_pro` usando
  ese cuadro como referencia, y **esa limpieza es la referencia de las ocho hojas**. Ahora el
  personaje queda atado por la imagen y no por el texto.
- **Y ESTA VEZ SE MIRÓ ANTES DE EMBEBER.** La comprobación que faltó: un cuadro de cada ciclo, todos
  llevados al mismo alto de figura, uno al lado del otro contra el original. Eso es lo que hace
  visible un cambio de proporciones; medir sólo la ALTURA no lo detecta nunca, porque la altura ya
  la estaba normalizando.
- **Dos cosas del cortador que se rompieron y por qué:**
  1. `quitar_magenta` pide magenta puro. Los modelos con referencia **no tienen el parámetro
     `background_color`** y devuelven el magenta que se les canta — uno devolvió **(191,83,145)** —,
     así que el recorte no sacaba nada y la hoja entera salía como un solo cuadro. Va un
     `quitar_fondo` que muestrea las cuatro esquinas y saca por distancia.
  2. Ese mismo keyer calculaba la distancia en `int16`: **(255−0)² = 65025 y el máximo de un int16
     es 32767**, así que desbordaba y `sqrt` recibía negativos. La máscara salía con agujeros.
- **La hoja de agacharse costó tres intentos.** Las dos primeras devolvieron una caminata **de pie**
  por más que el prompt dijera "crouch" y "duck-walk". La tercera funcionó describiendo la mecánica
  cuadro por cuadro y prohibiendo lo contrario: *"las rodillas siempre dobladas, la cadera nunca
  sube por encima de las rodillas, la cabeza queda a la misma altura baja en los seis"*.
- Comprobado en el navegador sobre píxeles dibujados: **parado 72,5 px contra correr 68,8 = 5,5%**,
  los doce agachados entre **38 y 44 px** (el túnel tiene 48), y cero errores.

### Sexta vuelta de `Maicol.html` (2026-08-26)

Pedido: *"genera música efectos de sonido voces todo por highsfield también va muy pero MUY Lag y
también genera Sprites de caminar agachado, ahora quiero que generes 60 fotogramas de animaciones
en todo puedes hacer varias imágenes y después juntar las pero si o si 60"*.

#### EL LAG: dos causas, las dos medidas, las dos arregladas

Lo primero fue medir en vez de adivinar. **Dibujar cuesta 0,19 ms de JS por cuadro** — o sea que el
problema no estaban las órdenes, estaba en los **píxeles que hay que rellenar**. Con eso el
diagnóstico se vuelve aritmética.

1. **EL LIENZO SE DIBUJABA AL DOBLE DE LA RESOLUCIÓN DE DISEÑO.** El mundo está hecho para
   1024×576: el sprite del jugador mide 86 px y la casilla 48. Pero `lienzo.width = ancho * DPR`
   con `DPR` hasta 2, así que en un teléfono de 412×915 el lienzo salía de **1464×824 =
   1.206.336 píxeles contra los 589.824 del diseño: 2,04 veces**. El doble de relleno por cuadro,
   cada cuadro, y lo único que se ganaba era **resamplear para arriba dibujos que no tienen más
   detalle que dar**. Ahora hay techo. Medido en 412×915 con DPR 2: **19,5 → 29,25** cuadros por
   segundo.
   Y hay un **vigía que mide si sirve** antes de bajar más: bajar la resolución a ciegas es una
   apuesta, y en un aparato que no está limitado por relleno no gana nada y sólo deja la imagen más
   blanda. Medido acá: de 590 mil a 389 mil píxeles, 29,45 → 29,60, o sea **cero**. Así que baja un
   escalón, vuelve a medir, y si no ganó al menos un 8% **se vuelve para arriba y deja de tocar**.
2. **EL NIVEL SE REPINTABA CASILLA POR CASILLA, SESENTA VECES POR SEGUNDO.** Las casillas no se
   mueven. Las 286 que entran en pantalla, cada una con un relleno de textura **más** un velo, son
   **572 rellenos cada 16 ms para obtener siempre el mismo dibujo**. Ahora el nivel entero se pinta
   una vez en un lienzo aparte al cargarlo (3072×768 en el nivel 1) y cada cuadro es **una copia de
   la ventana visible**. Los adornos van horneados también, que son estáticos; los árboles del
   terreno no, porque se mecen. Medido en la misma sesión: **25,15 → 37,65**.
   Más el cielo pre-escalado al alto justo: dibujado con `drawImage` escalado hay que remuestrear
   590 mil píxeles por cuadro para llegar siempre al mismo resultado.

**Total en el perfil del teléfono: 19,5 → 37,65 cuadros por segundo, casi el doble, y eso CON los
60 fotogramas y todo el audio encima.**

#### 60 FOTOGRAMAS, en diez tandas

`corre` 8 · `quieto` 4 · `agCamina` 6 · `agQuieto` 6 · `salto` 6 · `cae` 6 · `golpe` 6 · `muere` 6 ·
`festeja` 6 · `frena` 6. Cada ciclo se recorre por **la variable física que lo causa** y no por
tiempo: el salto por la velocidad vertical, la caída por la velocidad de caída, el golpe y la muerte
por su reloj. Un ciclo recorrido por tiempo cuando la física va a otra velocidad se ve patinando.

**POR QUÉ LA ALTURA VA DECLARADA A MANO Y NO MEDIDA.** Con 16 cuadros la regla del **ancho de
cabeza** funcionaba: en una pose de pie, arriba de todo hay cabeza y nada más. Con 60 se rompe, y
se rompe medido: en las poses agachadas el tercio de arriba de la figura es la **espalda arqueada**,
que es anchísima, y la regla devolvía **429 px de "cabeza" para una figura de 430 de alto** — o sea
que escalaba el muñeco a 18 px. Probé tres reglas rígidas más y las tres se caen con la pose:
- contar píxeles de **zapatilla**: 5415 en una tanda y **6** en el festejo (ahí son más claras);
- contar **rojo de campera**: 29913 en una y **958** en el tumbo de la muerte;
- contar **piel de la cara**: varía hasta un **111% dentro de la misma tanda**, porque la cara se da
  vuelta y las manos se esconden.

Lo que **sí** es cierto y está medido: dentro de cada tanda el modelo mantuvo la escala (`agCamina`
da 430, 430, 430, 430, 430, 430; `frena` da 669..675). O sea que hace falta **un número por tanda**,
no una regla universal. Y ese número se sabe: se sabe cuánto mide un chico parado (118 px de atlas,
medido en la vuelta 3) y se sabe qué animación es cada tanda. Se declara y **se comprueba midiendo
el resultado en el navegador**: parado **73,3 px** contra contacto de correr **69,0** = **6,2%**, los
60 centrados dentro de 2 px, y los doce agachados entre **40 y 44 px**, todos por debajo de los 48
del túnel — ya no hace falta aplastar el dibujo a mano para que entre.

#### AUDIO GRABADO: 4 temas y 8 efectos

- Los temas vienen en **AAC de 1 MB cada uno**, 3,9 MB los cuatro. El contenedor no tiene `ffmpeg`
  de línea de comandos y Chromium **no trae el decodificador de AAC** (es Chromium, no Chrome:
  `decodeAudioData` devuelve EncodingError). Se decodifican con **PyAV**, que trae las bibliotecas
  adentro. De 3,9 MB a **270 KB**.
- **El empalme del bucle es lo que más se nota.** Un tema cortado en seco y puesto en loop da un
  golpe seco cada vuelta, y ese golpe se escucha más que la música. Se funde la cola sobre la
  cabeza — el mismo problema que la costura de una textura, pero en una dimensión.
- **Cada efecto es una pila de tres `Audio`.** Un solo elemento no puede sonar encima de sí mismo:
  al segundo disparo salta al principio y corta el primero, y dos monedas seguidas pasan todo el
  tiempo. Y la música se guarda una vez por tema: creando un `Audio` nuevo en cada cambio hay que
  volver a decodificar 65 KB de base64 justo cuando arranca el nivel.
- Los osciladores quedan como respaldo: si un efecto no está, suena el sintetizado.
- La música arranca con el **primer toque**, no al cargar: ningún navegador deja sonar nada sin un
  gesto. Y baja a 0,08 mientras habla la cinemática.

Bytes: el HTML pasó de 994 KB a **1562 KB** (atlas 163, música 270, efectos 29, y lo que ya estaba).

### Quinta vuelta de `Maicol.html` (2026-08-26)

Pedido: *"ahora sí haz un mejor menú también haz que los árboles estén sobre el terreno we no de
fondo, también las rocas y eso mejoralo, mejora el menú de inicio haz una Cinemática generando
voces de highsfield e imágenes representativas también genera que los pájaros no se muevan con el
player porque nunca salen de la cámara xd también mejora todo etc etc y haz algo útil con las
estrellas y un botón de agacharte para espacios pequeños etc"*.

- **LOS PÁJAROS VIAJABAN PEGADOS A LA CÁMARA.** Estaban guardados en coordenadas de **pantalla**,
  así que por más que corrieras nunca salían del cuadro — y un pájaro que te sigue a todos lados no
  se lee a pájaro. Ahora la x es del **mundo** y se dibujan a 0,45 de la cámara. El reciclado va
  contra la cámara, que es lo único que sabe dónde está el borde.
- **AGACHARSE ES UNA MEDIDA, no un dibujo.** Parado el jugador mide 62 px y la casilla 48: ocupa
  **dos** filas. Agachado mide 34 y entra en **una**. El generador pone losas en la fila `FILA-1`
  sobre piso firme, y **adentro va una estrella** — así el botón tiene para qué existir.
  Medido: parado, corriendo contra el túnel, avanza **1512 → 1568 y se clava** (vx=0). Agachado,
  **1512 → 1804 a 118 px/s** y se lleva la estrella. La estrella del túnel **no se puede juntar de
  ninguna otra manera**.
  No se puede estirar si hay techo: si se pudiera, el jugador saldría disparado atravesando la losa.
  Y el dibujo también se aplasta a 46 px, porque el cuadro de agacharse mide 62 dibujado y el túnel
  tiene 48: sin aplastarlo la cabeza atraviesa la losa.
- **EL VALIDADOR TUVO QUE APRENDER A AGACHARSE.** Se partió `parado` en dos: `pisable` (hay piso y
  una casilla de aire) y `parado` (además hay lugar para la cabeza). Al costado se puede ir
  agachado; **saltar solo se puede parado**. Sin esa distinción un túnel corta el nivel en dos y el
  validador lo rechaza aunque se pase de sobra. Los 7 salieron **al primer intento**, con 1 o 2
  túneles cada uno.
- **CUATRO ESTRELLAS, UNA VIDA** (tope 5). Una estrella que solo sube un número es decoración; se
  junta la cuarta, la barra de corazones **crece**, y eso sí se siente. Además el selector de
  niveles muestra `★n/total` por nivel, guardado.
- **ÁRBOLES SOBRE EL TERRENO**, a velocidad de cámara. Los del fondo van a 0,55 y por eso se leen a
  fondo. La regla para no arruinar el nivel: **solo donde hay cinco filas de aire limpias** y dos
  columnas a cada lado, y lejos de estrellas, bichos, resortes, banderas, la meta y el arranque. Un
  árbol de tres casillas y media tapa lo que hay detrás, así que va únicamente donde no hay nada
  que tapar. La mitad van espejados: es **un solo dibujo**, y cuatro copias idénticas en pantalla se
  leen a copia y pega.
- **EL PISO CON TEXTURA.** Un relleno de color plano con dos manchitas encima se lee a casilla de
  prueba. Las tres texturas están **cosidas por los cuatro bordes**: se dibujan con `createPattern`,
  o sea repitiendo, y cualquier diferencia entre bordes pinta una **rejilla** sobre todo el piso.
  Y van con el lienzo corrido a coordenadas de mundo: un patrón de canvas está clavado al origen de
  la transformación, así que dibujando en pantalla el piso **se desliza por debajo de sí mismo**.
- **CINEMÁTICA CON VOZ: cuatro planos, cuatro líneas y cuatro voces por idioma** (12 en total).
  **La voz manda el tiempo** — cada plano dura lo que dura la línea, no un número fijo, porque en
  tres idiomas la misma frase dura distinto. Con plazo de respaldo: si el audio no arranca (teléfono
  en silencio, autoplay bloqueado) la cinematica se quedaría clavada para siempre en el primer plano.
  Los WAV venían a 700 KB cada uno (8 MB los doce): van a MP3 mono de 24 kbps a 22 kHz, sin el medio
  segundo de silencio de cada punta y con el volumen igualado — **244 KB los doce**.
- **MENÚ CON ARTE**, con degradé encima y no solo con opacidad: bajándole nada más la opacidad el
  dibujo compite con el título en todo el cuadro y no se lee ninguno de los dos.
- **Y SALIÓ 49% MÁS RÁPIDO.** Medido en la misma sesión, los dos en juego: `3f774d9` daba **18,2**
  cuadros por segundo con SwiftShader y esto da **27,2**. La textura reemplazó **dos `fillRect` por
  casilla de tierra** (las manchitas) por un relleno de patrón: con 110 casillas de tierra a la
  vista son 220 rellenos menos por cuadro.
- **DOS BUGS PROPIOS, los dos del mismo tipo.** `jug.quieto += dt` había quedado escrito **cuatro
  veces** y la respiración corría a 4×; y `const EST_X_VIDA` salió **seis veces** y el juego no
  arrancaba. Los dos por el mismo guardia mal escrito en el parche: decía
  `if b in s and a not in s`, y cuando el texto nuevo **contiene** al viejo —que es el caso normal,
  porque casi siempre se agrega alrededor de lo que ya estaba— después de parchear `a` sigue estando
  dentro de `b`, el guardia no salta y el parche se aplica de nuevo. El guardia correcto es
  **`if b in s` y nada más**.
- Y una del banco de pruebas: `Page.captureScreenshot` devolvía **1024×489** en una ventana de
  1024×576 mientras el DOM medía exacto. El pie de la cinematica estaba dibujado 87 px por debajo
  del borde de la foto y parecía no existir. Se arregló con `clip` explícito y escala de página 1.
- Bytes: el HTML pasó de 372 a **994 KB**, casi todo cinemática (210 KB de dibujos + 244 KB de voz,
  que en base64 son 605).

### Cuarta vuelta de `Maicol.html` (2026-08-26)

Pedido: *"la foto de atrás hacele de cielo nomás después otra parallax de montaña después más
decoración y así we"*.

- **CINCO CAPAS, cada una a su velocidad.** Cielo 0,06 · montaña 0,20 · loma 0,36 · árboles o
  siluetas 0,55 · adornos y mundo 1,00. Con el cielo, las montañas, los árboles y el piso metidos
  en UNA sola foto no importa cuánto camines: nada se mueve respecto de nada, y eso es un telón
  pintado. Separadas, caminar produce **paralaje**, que es lo único que da distancia en 2D.
- **LAS LÍNEAS DE APOYO ESTÁN ELEGIDAS PARA QUE NO SE VEA NINGÚN CORTE.** El borde de abajo de una
  banda es una línea recta y se delata. La loma apoya en el 96% del alto — o sea **por debajo del
  suelo** — así que su corte queda tapado por la tierra siempre; la montaña apoya en el 79%, seis
  píxeles por debajo del techo de la loma. Con la cámara mirando hacia abajo el suelo sube y tapa
  todavía más, así que el caso justo es con la cámara arriba de todo, que es el que se midió.
- **NINGUNA BANDA SE REPITE DENTRO DE UN NIVEL, y es una cuenta.** Alcance = ancho ÷ velocidad:
  cielo 22948 px, montaña 4680 px, loma 2250 px, contra 3552 px del nivel más ancho. Solo la loma
  da una vuelta y media, y por eso a las bandas se les **cose la costura**: se funde el borde
  derecho sobre el izquierdo y el empalme desaparece.
- **LAS BANDAS VAN APLASTADAS A PROPÓSITO.** Respetando la proporción, una sierra de 2400×930
  llevada a 176 px de alto queda de 456 px de ancho: a 0,20 eso dura 2280 px de mundo y **la
  misma sierra se ve dos veces y media en la misma pantalla**. Aplastada a 1040×176 entra entera.
  Una sierra lejana más chata sigue leyéndose a sierra lejana.
- **EL TECHO ES LA MISMA BANDA DE MONTAÑA DADA VUELTA.** En la cueva los bastones de roca colgando
  son estalactitas y en la fábrica los caños son la estructura del galpón. Sin eso, los dos
  tercios de arriba quedaban de un color plano y liso, que es lo que más delata a un fondo pintado.
  Se da vuelta una sola vez a un lienzo aparte.
- **BAJARLE EL COLOR A LO LEJANO NO ES UN GUSTO, ES LA CUENTA.** El escombro azul de la cueva
  venía a todo color y sobre un fondo casi negro **pegaba en el ojo y se leía más cerca que el
  piso** — al revés de lo que tiene que pasar. Va horneado por banda (`TONOS`): el de la cueva a
  0,60 de brillo y 0,52 de color, los rojos de la fábrica a 0,56 de color. Eso es lo que hace el
  aire en la realidad, y es lo que hace que algo se lea **lejos** y no simplemente más chico.
- **36 ADORNOS, doce por tema** (eran 18). Los seis nuevos de cada tema se juntan con los seis que
  ya estaban en una sola tira de doce, así el juego sigue teniendo una imagen de adornos por tema.
- **Y SALIÓ MÁS RÁPIDO QUE ANTES.** Cinco capas contra una foto: 21,5 → 17,0 cuadros por segundo
  con SwiftShader. El degradé de aire y el velo final eran **dos rellenos de pantalla entera por
  cuadro — 1,2 millones de píxeles mezclados con alfa para dar siempre lo mismo**, porque ninguno
  de los dos cambia nunca. Horneados adentro de la imagen del cielo: **23,3**, más que las 21,5
  que daba con una sola foto.
- **NO SE TOCÓ NADA DEL JUEGO, otra vez.** El mismo bot contra `d869e03` y contra esto da los
  mismos números en los 7 niveles: mismo avance, mismas caídas, mismos pasos. Y el muñeco sigue
  midiendo 6,5% más parado que corriendo.
- Bytes: salieron las tres fotos enteras de fondo (120 KB) y entraron nueve bandas más las tiras
  de doce. El HTML pasó de 349 a **372 KB**.

### Tercera vuelta de `Maicol.html` (2026-08-26)

Pedido: *"agrega mejor decoración también el personaje es un poco más grande estando quieto y al
moverse se achica, también necesito una animación Idle mientras está quieto, también niveles más
decorados no solo una imagen por detrás, un menú más pixel art y nintendo Snes también, agrega
animaciones de fondo como pájaros árboles en movimiento que largan hojas etc"*.

- **EL MUÑECO CAMBIABA DE PORTE, y era medible.** Cada tanda de dibujos viene con su propia escala,
  y al recortar cada pose por separado quedaba **parado 139 px de atlas contra 112 corriendo: 24%
  más grande**. En pantalla eran 85,4 px contra 68,8 — 16,6 px de salto **cada vez que arrancabas a
  caminar**.
  LA REGLA PARA ARREGLARLO ES LA CABEZA. Es una parte rígida: no cambia con la pose. Medida en los
  cuadros de contacto (que son los únicos donde arriba de todo hay solo cabeza y no un brazo
  levantado) da **31,0 px, clavado en los cuatro**. Se escaló cada fuente para que su cabeza mida
  eso. Medido **en el navegador, sobre los píxeles dibujados**: parado 73,3 px contra 68,8 corriendo,
  **6,5% de diferencia** — que es lo que mide una persona parada contra la misma persona en el apoyo
  de una zancada. Los cuatro cuadros de quieto dan 73, 74, 73, 73 y todos centrados dentro de 0,5 px,
  así que tampoco se corre de costado al respirar.
- **QUIETO DE VERDAD: cuatro cuadros que respiran**, en ida y vuelta (0-1-2-3-3-2-1-0) a 3,5 por
  segundo = **2,3 s de ciclo**, que es una respiración tranquila. Va con **reloj propio**: si
  compartía el de correr, la respiración salía a cámara rápida al frenar.
- **TRES CAPAS, no una foto.** Lejos (la imagen, a 0,30), **medio a 0,55** y **cosas apoyadas en el
  piso** a velocidad de cámara. Sin la tercera no hay profundidad, hay papel tapiz.
  - **18 adornos** nuevos, seis por tema, puestos sobre las caras de casilla que dan al aire con un
    **azar clavado** por (nivel, i, j): tiene que salir igual cada vez que se entra, porque si cambia
    al morir el nivel se lee a otro nivel. 23, 12, 25, 19, 17, 21 y 15 por nivel.
  - Bosque: árboles que se **mecen**, pájaros que cruzan (3 cuadros) y **hojas que caen** (4 dibujos,
    girando).
  - Cueva y fábrica no tienen árboles: la capa del medio se arma con los **mismos adornos
    oscurecidos**, que es cómo se hace una silueta sin pedir dibujos nuevos. Más motas que flotan
    (cueva) y chispas que suben (fábrica).
- **LAS HOJAS CAÍAN DETRÁS DEL PISO.** Soltadas desde la copa de los árboles del medio recorrían
  150 px y se metían atrás del bloque de tierra: **no se veía ninguna**. Ahora salen de arriba de la
  pantalla y se dibujan **adelante de todo**, así cruzan los 576 px enteros.
- **EL ÁRBOL MENEADO VA DIBUJADO DE ANTEMANO.** Un `drawImage` torcido lo resuelve el procesador
  píxel por píxel; uno derecho lo copia de una. Doce sesgos precalculados y después son copias:
  el costo de los árboles pasó de **4,07 ms a 1,85 ms por cuadro**.
- **DOS TRAMPAS AL PEGAR LOS DIBUJOS EN EL HTML:**
  1. El **último** elemento de `CARGA` no lleva coma. Agregando abajo sin ponérsela, JS lee las dos
     líneas como `['a','b']['c','d']` — un acceso por índice — y **se come dos elementos**. Se caía
     con "undefined is not iterable" y quedaban 7 de 14 dibujos.
  2. Las hojas de origen traen una **línea de piso de punta a punta**. Como cruza toda la imagen, el
     recorte se la lleva y **ensancha la caja de cada cuadro un poco distinto**: el muñeco queda
     descentrado y se mueve de costado al animar (458, 636, 692 y 758 px de ancho para la misma
     figura). Sacándola quedan 358, 356, 358, 358. Hay que borrar **también lo de abajo**: las suelas
     asoman uno o dos píxeles por debajo de la línea.
- **NO SE TOCÓ NADA DEL JUEGO.** Verificado corriendo el mismo bot contra la versión vieja y la
  nueva: los 7 niveles dan **exactamente los mismos números** — mismo avance, mismas caídas, mismos
  pasos. Todo lo de esta vuelta es dibujo.
- Costo: 24,2 → 20,8 cuadros por segundo **con SwiftShader** (el render por software del contenedor,
  que hace cada `drawImage` a mano en el procesador). En un teléfono con canvas acelerado esto no se
  paga. La capa que más cuesta sigue siendo **la imagen de fondo**, que ya estaba.

### Segunda vuelta de `Maicol.html` (2026-08-26)

Pedido: *"mejora todo hazlo un juego profesional mejora los Sprites a 24 Sprites de fps y todo esas
cosas muy simple y el suelo está muy abajo"*.

- **EL SUELO ESTABA MUY ABAJO, y tenía dos causas.** Una: el mundo se dibujaba a 1280×720, que es
  **exactamente** el alto del mapa (15 filas × 48), así que la cámara **no podía moverse en vertical**
  y el suelo quedaba clavado al borde. Ahora el mundo va a **1024×576** (todo se ve 25% más grande) y
  el mapa tiene **16 filas** con el piso de la 11 a la 15 — 240 px de tierra. Medido: la línea de
  caminar pasó del **84% al 58%** de la pantalla.
- **24 CUADROS POR SEGUNDO Y 14 SPRITES**, contra 7 y ritmo por distancia. Ocho de caminar (el ciclo
  entero: contacto, bajo, pasada, alto, por cada pierna), dos de quieto que respiran, agachado, golpe,
  salto y caída. El ritmo va a 24 fps **escalado por la velocidad**: parado no cicla, corriendo cicla
  rápido. Solo por distancia se ve mecánico a baja velocidad; solo por tiempo, patina.
  TRAMPA AL CORTAR: los ocho cuadros vienen **superpuestos**, y el cortador por columnas vacías juntó
  dos figuras en una y devolvió cuatro. Va un cortador que parte en octavos y corre cada corte al
  mínimo de contenido que haya cerca.
- **APLASTE Y ESTIRE**, que es lo que separa un muñeco que se traslada de un personaje que se mueve:
  se estira al despegar, se aplasta al aterrizar en proporción a la velocidad de caída, y vuelve con
  un muelle que pasa de largo. No cuesta un sprite y se nota más que cuatro cuadros extra.
- **POLVO, CHISPAS Y SACUDÓN.** Un salto sin polvo se lee a personaje flotando; un enemigo que
  desaparece sin nada se lee a error. Y cartel de nivel al empezar.
- **YA NO ES "CORRER A LA DERECHA Y SALTAR":** resortes (rompen la altura fija del salto), plataformas
  móviles **que te llevan** (sin arrastrar al jugador con ellas uno se queda en el aire mientras la
  plataforma se va, que es el error clásico) y **banderas de control** a un tercio y dos tercios.
- **TRES DEFECTOS DE GENERACIÓN, todos encontrados por el bot y todos del mismo tipo — geometría que
  corta el salto:**
  1. **Plataformas apiladas sin espacio para la cabeza.** El jugador mide 62 px y la casilla 48: parado
     sobre una plataforma su cabeza llega a la fila *j−2*. Con una sola fila libre se generaban repisas
     donde **no se puede estar parado**, y el bot se encajaba ahí y no salía. Ahora se piden **dos**.
  2. **Plataformas justo encima de los pinches.** Cortan el salto en el aire y te dejan caer **justo
     sobre el pinche**. Ahora un pinche pide cuatro filas de aire encima en todo el tramo del salto.
  3. Y de la vuelta anterior: el aire sobre los huecos.
  Verificado con vidas infinitas y sin bichos: **los 7 llegan a la meta**, con 0 o 1 caída cada uno.

### Cómo está hecho `Maicol.html`

Pedido: *"haz otro juego 2D de Maicol, con 7 niveles donde tiene que rescatar a Maicolito su hermano,
ahí tienes highsfield para los Sprites y animaciones buena decoración"*.

- **LIENZO 2D Y NO WEBGL.** Todo lo que se dibuja son rectángulos y recortes de sprites, que es justo
  lo que un contexto 2D hace por hardware. WebGL acá no compra nada y cuesta mil líneas.
- **LOS SPRITES SON GENERADOS Y VIVEN ADENTRO DEL ARCHIVO.** Se pidieron a Higgsfield sobre fondo
  **magenta puro**, se cortaron por columnas con contenido, se les sacó el fondo **por distancia en
  RGB y no por igualdad** (los bordes vienen con halo) y se empaquetaron en tiras.
  DOS COSAS QUE SALIERON MAL: la primera tanda de poses vino en **pixel art** y no pegaba con el
  ciclo de carrera (vectorial), hubo que regenerarla diciendo explícitamente "NOT pixel art"; y
  escalar cada pose a un alto común hacía que **el personaje cambiara de tamaño según la pose** — la
  de caída, más achatada, salía el doble de grande. Va **una sola escala para todos los cuadros**,
  sacada del primero, y alineados abajo y al centro. Herramientas en `herramientas/maicol/`.
- **LOS NIVELES SE GENERAN Y SE VALIDAN, NO SE DIBUJAN A OJO.** Los primeros siete los escribí a mano
  y **los siete eran imposibles**: tenían huecos de hasta **nueve casillas** cuando el salto llega a
  cuatro. Un comprobador de alcanzabilidad (BFS sobre casillas donde se puede estar parado, con el
  alcance real del salto) rechaza cualquier nivel del que no se pueda llegar a la meta, y el
  generador reintenta hasta 900 veces. Verificado: **los 7 se terminan** con un bot que corre a la
  derecha y salta.
- **Y LAS MEDIDAS DEL SALTO MANDAN SOBRE EL DISEÑO.** Con `SALTO=700` el ápice subía 111 px = 2,3
  casillas, o sea que **ninguna plataforma era alcanzable**: la más baja que se puede poner sobre el
  piso está a 3 casillas (144 px). Con 820 el ápice sube 160 px y el vuelo dura 0,78 s = 219 px de
  largo. `v = raíz(2·g·h)`.
- **EL AIRE SOBRE CADA HUECO ES SAGRADO.** Al saltar un hueco la cabeza barre de la fila 11 a la 8;
  una plataforma ahí frena el salto en seco y el jugador cae al pozo. Fue exactamente lo que pasaba:
  el bot moría siempre en la casilla 9,7, que es el primer hueco. Ahora las columnas del hueco y
  cinco antes quedan prohibidas para plataformas.
- **194 PINCHES FLOTANDO.** Los pinches sobre un pozo quedan a la altura de la **cabeza** del jugador
  parado en el piso de al lado: matan al primer paso. Se quitan todos los que no tengan piso justo
  abajo y se ponen de a uno o dos sobre tramos de al menos cinco casillas, con dos libres a cada
  lado — tres seguidos al borde de un hueco dejan un tramo que no se puede saltar.
- **CAER A UN POZO CUESTA UNA VIDA, NO LA PARTIDA.** Se guarda el último piso firme y se vuelve ahí.
  Perder dos minutos de nivel por un salto es la forma más rápida de que alguien cierre el juego.
  Y hay zona segura: nada de bichos ni pinches en las primeras 12 casillas ni en las últimas 8 —
  aparecer al lado de un enemigo no es dificultad, es una emboscada.
- Salto con **coyote** (0,10 s) y **pedido guardado** (0,14 s), aceleración y roce, animación por
  distancia recorrida, cámara con suavizado, y audio procedural.

### Idiomas (los dos juegos)

Pedido: *"que venga por predeterminado en inglés"*. Pantalla de idioma **antes** del menú —elegir
idioma dentro de un menú ya escrito en un idioma que no entendés no sirve— y desde el menú se puede
volver a cambiar. Arranca en **inglés**, se guarda en `localStorage`.
Nada de texto suelto en el código: todo sale de una tabla. Las hojas de Eco guardan la **clave** y no
el texto, así cambiar de idioma también cambia las que ya encontraste — verificado en vivo con una
hoja abierta.
**LA FUNCIÓN SE LLAMA `TX` Y NO `t`.** Una función global de una letra es una bomba: cualquier script
que comparta la página —o un `eval` con un `var t` adentro— la pisa, y cuando se pisa no falla el
idioma, falla **todo**, porque no queda un solo texto que no pase por ahí. Pasó de verdad en una
prueba y dejó el juego sin poder cargar nivel.

### Cómo está hecho `Eco.html`

**Sexta vuelta (2026-08-26).** Pedido: *"no sé entiende ni mierda que hay que hacer, también podes
mejorar los props aún más y hacer el juego más fácil y agregar un monstruo que nos sigue con
extremidades y eso"*.

- **EL BANCO DE PRUEBAS AHORA VIVE EN EL REPO**: `herramientas/banco/`. El contenedor se revirtió
  cuatro veces en esta sesión y cada vez había que rearmar todo a mano. Ahora es
  `bash herramientas/banco/armar.sh`.
- **TUTORIAL DE CINCO PASOS QUE ENSEÑA HACIENDO.** El juego te soltaba en una pantalla negra y
  esperaba que descubrieras solo que el ruido es la vista, que hay hojas en las paredes y que hay que
  gritarles. Ahora cada paso **espera a que hagas la cosa** y recién ahí pasa al siguiente: MOVETE →
  eso que ves son tus pasos → ahora GRITÁ → hay una hoja acá, gritale tres veces → así se juega. No
  se puede trabar ni saltear sin haber entendido. Verificado paso por paso: 0→1 a los 4,1 m, 1→2 a
  los 13,9 m, 2→3 con el primer grito, 3→4 al revelar la hoja, y `listo:true` al final.
- **UNA FLECHA QUE DICE DÓNDE.** El objetivo escrito dice QUÉ; en un laberinto a oscuras faltaba el
  DÓNDE, y sin eso el jugador entiende la consigna y da vueltas veinte minutos igual. Un marcador
  proyectado sobre el destino: rombo con los metros cuando está en pantalla, flecha girada contra el
  borde cuando está fuera o detrás. El destino se recalcula **3 veces por segundo y no por cuadro**:
  adentro hay un BFS del laberinto entero.
- **MÁS FÁCIL, con números**: laberinto de 13×13 a **11×11** (169 → 121 celdas; entre enigma y enigma
  se caminaban 40-50 salas a oscuras y eso no es tensión, es aburrimiento), atajos del **6% al 14%**
  (un laberinto perfecto es un árbol y cada error obliga a desandar el ramal entero), espera del
  grito de **6 s a 4 s** (1,6 al lado de una hoja), y los rastros rojos pasan a **una marca por sala**
  — perder el rastro en un pasillo negro es perder el juego.
- **LA COSA.** Un monstruo que caza **por el ruido**, que es la única forma que puede funcionar acá:
  para ver hay que hacer ruido, y hacer ruido es exactamente lo que la trae. Agacharse deja de ser un
  truco de un enigma y pasa a ser la forma de escapar. Va con **el material de las ondas**, así que
  se ve cuando una onda la toca y desaparece cuando pasa, igual que las paredes; lo único propio son
  los ojos, que emiten de cerca. **No mata**: te agarra, te sacude y aparecés en la entrada con los
  sellos puestos.
  Verificado: duerme 25 s, un grito la pasa a `caza` y cierra de 12,6 m a 1,2 m a 3,05 m/s (correr
  son 5,5: siempre se le gana corriendo), agarra, teletransporta al jugador a la entrada y se aturde
  11 s; agachado emite **0 ondas** y vuelve a `ronda`.
  TRES DEFECTOS ENCONTRADOS MIDIENDO, los tres del mismo corte prematuro en su `tick`:
  1. Con las patas en +1,75 el **ángulo neto del antebrazo daba +0,70**: caminaba con las cuatro
     patas dobladas al revés y las garras por encima del lomo. Las cuentas: hombro a 1,65 m, tramos
     de 0,92 y 1,00; hombro −1,15 baja el codo a 0,79 y codo −0,62 (neto −1,77) apoya la garra en el
     piso. Verificado: garras en y = −0,14 / 0,11 / 0,19 / −0,24.
  2. Con la cosa aturdida no se actualizaban **ni la distancia ni los ojos**: la distancia quedaba en
     infinito (el HUD no avisaba) y el material de los ojos se quedaba en **negro puro** — y un negro
     puro no es invisible, se pinta y escribe profundidad, así que salían dos agujeros negros
     recortados sobre la pared.
  3. Y **la malla no se movía** mientras estaba aturdida: al agarrarte se teletransportaba lejos pero
     seguía dibujada al lado tuyo los 11 segundos.
  El giro de apertura de la pata va en **Y y no en Z**: la pata se extiende sobre −Z, así que rotar
  en Z la retuerce sobre sí misma en vez de abrirla.
- **PROPS**: de 5 tipos a **9** y de una cada 5 celdas a **una cada 3**. Nuevos: el **pozo** con
  brocal y horca (el mojón más fuerte que hay, porque hay que rodearlo), la **columna partida**, el
  **brasero** apagado de trípode, y **la figura** — algo que fue una estatua, sin cabeza y sin un
  brazo; es el único prop con forma de persona y a oscuras eso pega distinto que una caja. Y la cosa
  se agrandó: con el tronco chico, a cuatro metros se leía como cuatro patas sueltas.
- Costo: **27 llamadas de dibujo, 10.486 triángulos, 0,8 ms por cuadro** con todo a la vista.
  Partida completa verificada: tutorial de punta a punta, los cuatro enigmas y la victoria.

### Cómo estaba hecho la quinta vuelta

**Quinta vuelta (2026-08-26).** Pedido: *"el objetivo debe aparecer en pantalla we no en el menú"*.

- **NO ES QUE FALTARA: ERA ILEGIBLE.** La línea de objetivo ya estaba en el HUD, pero se dibujaba
  escalada por `--esc`. Medido en un teléfono (cuadro girado 732×412, escala 0,60): **6,3 px** el
  objetivo y **5,4 px** el subtítulo, encima al **62% de opacidad**. O sea que el único cartel que
  dice *qué hay que hacer* era invisible justo en el aparato donde se juega.
- **LAS POSICIONES PUEDEN ENCOGER; EL TEXTO NO.** Todo el texto del HUD tiene ahora mínimo con
  `max()`: objetivo 12 px, subtítulo 10 px, aviso de hoja 11 px, reloj 17 px. Verificado: **12 px /
  10 px en los tres tamaños** (1280×720, 480×270 y 412×915 girado), contra 6,3/5,4 de antes.
- **Y EL BLOQUE DE ARRIBA PASA A SER UNA COLUMNA FLEX** (`#top` con `#eco`, `#reloj`, `#sellos`,
  `#meta`). Antes cada uno iba posicionado en absoluto con px por el factor de escala, y eso tiene
  dos problemas que se muerden la cola: con el factor chico el texto queda ilegible, y si se agranda
  el texto los bloques se solapan porque las posiciones son fijas. En columna el solapamiento es
  **imposible por construcción** y las fuentes quedan libres de tener un mínimo. Verificado: cero
  solapamientos en los cuatro pares y en los tres tamaños.
- El objetivo además tiene **fondo propio** (píldora oscura con desenfoque) y contraste al 95%:
  tiene que leerse igual sobre el negro que sobre el **fogonazo**, que deja la pantalla clara.
- Verificado en modo teléfono de verdad (por tacto, sin ratón): joystick, GRITAR, SALTAR y AGACHAR
  visibles, leyenda de teclas oculta, y el objetivo a 12 px.

### Cómo estaba hecho la cuarta vuelta

**Cuarta vuelta (2026-08-25).** Pedido textual: *"las notas no se pueden leer we me acerco y nada,
también mejora los props y pistas y habitaciones we no se siente god al jugarlo ni se cómo
completarlo"*.

- **EL DEFECTO DE LAS NOTAS ERA REAL Y TENÍA DOS MITADES.**
  1. **Alcance corto.** La hoja va pegada a una pared, o sea a 1,90 m del centro de su celda. El
     jugador puede pararse en el lado opuesto de **esa misma celda**, a 1,59 m del centro: 3,49 m de
     la hoja, y en diagonal **3,84**. Con el alcance en 3,0 buena parte de la propia celda **no
     contaba**. Ahora 4,4.
  2. **Cero aviso.** El cartel de proximidad solo salía para hojas **ya reveladas** y solo en **PC**.
     O sea que acercarse a una pared con una hoja sin revelar no producía absolutamente nada: no
     había forma de saber que ahí había algo ni que había que gritarle. Ahora avisa en los dos casos
     y en las dos plataformas, con la cuenta: *"HAY UNA HOJA EN ESTA PARED · E · 1 DE 3 GRITOS"*, y
     en teléfono el botón GRITAR late.
  3. Y las hojas eran una mancha **oscura** sobre pared iluminada: a oscuras invisibles, con luz se
     leían como una sombra. Ahora tienen **luz propia** (piso 0,030 lineal, +0,045 por cada grito):
     una hoja de papel viejo tiene que ser lo más claro del cuadro, no lo más oscuro.
- **NO SE SABÍA CÓMO COMPLETARLO → LÍNEA DE OBJETIVO EN EL HUD.** Una línea bajo los sellos que dice
  qué hacer ahora y cuánto falta: *"LOS TRES TAMBORES · gritale al de DOS BANDAS · van 0 de 3"*,
  *"LA CUENTA · contá las paredes del aro y golpeá el piso esa cantidad · llevás 1 golpe"*.
  REGLA: un enigma solo aparece como objetivo si **su hoja ya se leyó**. Si no, el HUD estaría
  contando cosas que el jugador no tiene forma de saber, y eso no es guiar, es spoilear. Mientras no
  leyó ninguna, el objetivo es *"BUSCÁ UNA HOJA · seguí las marcas rojas"*.
- **HABITACIONES.** Un laberinto perfecto son 169 cajas del mismo tamaño, y por eso no se sentía un
  lugar: sin puntos de referencia uno no explora, da vueltas. Se abren **4 plazas de 2×2** tirando
  las paredes internas (8,5 m de lado) con una **columna con base y capitel** en el cruce. Van
  **antes** de calcular distancias porque cambian el laberinto de verdad; verificado 169/169
  alcanzables después de abrirlas.
- **PROPS COMO MOJONES.** Una de cada cinco celdas lleva algo, elegido por un hash de la celda (fijo
  por partida): escombros contra la pared, una losa partida, una cadena colgada del techo, un nicho
  con repisa, o dos pilastras. No es decoración: en un laberinto a oscuras donde todas las celdas
  miden lo mismo, un objeto es la **única** forma de decir "por acá ya pasé". Todo va fundido en la
  misma malla que las marcas de los enigmas → sigue siendo **una** llamada de dibujo. Y los arcos del
  corredor ganaron jambas: un dintel flotando no se lee como arco, se lee como una viga suelta.
- **SONIDO, que era lo que más faltaba.** Todo el diseño dice "esto se oye" y el juego era **mudo**:
  el grito era un botón que prendía luces. Ahora hay audio **procedural**, ni un archivo: ruido
  blanco de un segundo generado una vez y filtrado distinto para cada golpe, más osciladores.
  **La reverb es la pieza central, no un adorno**: la respuesta al impulso se arma con ruido que
  decae en 2,8 s — literalmente un eco de piedra. Cada sonido va por dos caminos (seco y envío), y el
  grito manda **3× más** a la reverb que una pisada; esa diferencia es lo que hace que gritar suene a
  laberinto y un paso suene a paso.
  MEDIDO con un analizador colgado del maestro (si no, "el audio anda" sería "no tiró excepción"):
  fondo pico 0,0120 / rms 0,0087 · grito 0,1418 / 0,0497 (**5,7× el fondo en rms**) · cola de reverb
  1 s después 0,0373 · caída 0,2230 · **en mudo 0,0000**.
  PRIMER AJUSTE DESCARTADO: el zumbido de fondo a 0,030 **competía** con todo — un grito daba 1,5× el
  fondo. Un grito tiene que ser un acontecimiento, no un matiz. A 0,012 se sigue sintiendo el aire y
  deja lugar.
- **EL HUD ESCALA CON EL CUADRO** (`--esc` = alto/720, topado entre 0,60 y 1,15). Con medidas fijas
  en px, en un cuadro bajo —un teléfono girado da 732×412— el reloj, los sellos, la línea de
  objetivo, el aviso de la hoja y la leyenda de teclas **se pisaban**. Medido a 480×270: el objetivo
  se encimaba con la leyenda **y** con el aviso. Verificado ahora en 1280×720, 800×450, 480×270 y
  412×915 girado: **cero solapamientos** en los seis pares.
  OJO al medir con el cuadro girado: `getBoundingClientRect` devuelve la caja alineada a los ejes y
  da falsos positivos. Se mide con `offsetTop/offsetLeft`, que son coordenadas de la caja.
- Costo: **14 llamadas de dibujo, 7.016 triángulos, 0,5 ms por cuadro**. Partida completa verificada
  caminando de verdad hasta una hoja (53 celdas), leyéndola con la espera real del grito, los cuatro
  enigmas y la victoria. Cero errores de página.

### Cómo estaba hecho la tercera vuelta

**Tercera vuelta (2026-08-25).** Pedido textual: *"mejora la calidad agrega que los brazos no se vean
así we que feo sácalos también agrega mejores gráficos y que el entorno brille entero por 2 segundos
y después se apague y que el eco sean rayas, también agrega buenas pistas y una hoja de papel o sea
al leerlo que lo leas en una hoja no un pinche globo de texto generalo con highsfield la foto de la
hoja o hazla vos, también deja rastros en el suelo rojos que se ven pocos pero te guían de a poco que
encuentres hojas y si mejora todo en general y un menú más goty we"*.

- **BRAZOS FUERA, y tenía razón.** Dos cajas a 20 cm del ojo se proyectan enormes y entran en cuña
  desde las esquinas de abajo: cada antebrazo se comía una franja de ~30°, y en una pantalla casi
  toda negra eso no lee como un brazo, lee como dos tablones grises tapando el juego. El cuerpo de
  abajo queda (pecho, muslos, piernas, pies): mirando al piso los pies dan y=−0,80 sobre un borde
  de −1,00, y mirando adelante no hay nada colgado en el cuadro.
- **EL ECO PASA A SER RAYAS**, y el primer intento se midió y se descartó: anillos finísimos (coseno
  a la 26). Se veía **un** aro grande y borroso en la pared de enfrente y nada más — los anillos de
  atrás caen todos dentro de la misma celda y no hay geometría donde dibujarlos. El brillo pasó de
  ~80% de pantalla encendida a **9,8%**: injugable.
  **Lo que funciona**: dejar la zona iluminada ancha y **modularla** con franjas (`0.26 + 0.74·cosⁿ`).
  La franja no es la luz, es el dibujo sobre la luz: cruzando una pared plana es una banda recta, al
  doblar una esquina se **quiebra**, al pasar un hueco se **corta**. Eso es lo que se lee como sonar.
- **EL FOGONAZO: 2 s enteros y después se apaga.** Se sostiene **plano** y no se desvanece durante
  los dos segundos; si se desvanece no se lee como fogonazo, se lee como una onda más grande.
  Medido: 1,000 durante 85 cuadros y después baja lineal a 0 en 0,55 s.
  PRIMER INTENTO MEDIDO Y DESCARTADO: nivel parejo con término de cara contra el ojo → la pantalla
  quedó **blanca de punta a punta** (220/255 de brillo medio, 100% de píxeles encendidos) y no se leía
  **una** esquina. El problema no era el nivel: sin variación entre caras, un laberinto de cajas es
  una sola superficie.
  **Lo que funciona son tres tonos por eje**: paredes X 0,340, paredes Z 0,240, piso 0,160, techo
  0,100, más una caída floja (100%→45% entre 6 y 55 m). Cada quiebre del laberinto aparece como un
  quiebre, gratis, sin sombras. Medido en un pasillo de 10 celdas: medio 69,4 y máximo 140.
- **GRANO ANCLADO AL MUNDO** en el shader (no a la pantalla, así no titila al moverse). Sin él una
  pared es un plano de un solo valor, y un plano de un solo valor se lee a plástico.
- **LA HOJA DE PAPEL.** Antes el texto más importante del juego se leía en un globo con borde de un
  píxel, o sea como un cartel de sistema. Ahora es una **foto de papel de trapo envejecido** generada
  con Higgsfield (manchas de humedad, esquinas dobladas, borde roto), apoyada de costado, girada 1,4°,
  con tinta sepia y sombra. Va **adentro del archivo**, 58 KB en WebP: es una hoja, no vale bajarla de
  una red que puede no estar. Copia también en `assets/fp/eco/hoja.webp`.
  DOS COSAS QUE SALIERON MAL:
  1. La primera versión era WebP **opaco** y arrastraba el fondo negro de la foto: se veía un
     rectángulo negro alrededor de la hoja, porque las esquinas dobladas son oscuras y el recorte por
     luminancia no las separa del fondo. Con **canal alfa** (rampa de 14 a 30 de luminancia) la
     sombra sigue la silueta de verdad, borde roto incluido.
  2. El último párrafo de la nota más larga quedaba **cortado** abajo. Verificado ahora nota por nota
     y en los dos tamaños: **6 de 6 sin recorte** en 1280×720 y en 412×915.
- **RASTROS ROJOS EN EL SUELO**, en **cadena** de una hoja a la siguiente y no todos desde la
  entrada: con seis rastros saliendo del mismo punto la primera sala queda una telaraña y no guían
  nada. Cada tramo se apaga al 22% cuando su hoja de destino ya apareció, así siempre hay **uno**
  encendido: el que lleva a lo que falta. Verificado: 5 de 5 tramos se apagan al abrir las seis hojas.
  UNA MARCA CADA DOS SALAS (una por sala se lee a línea pintada), y la forma son **tres tiras de
  ancho decreciente más gotas**: un rectángulo limpio se lee a calcomanía pegada.
  **EL PISO SALIÓ DE UNA MEDICIÓN.** Con 0,006 en lineal el brillo máximo del cuadro a oscuras daba
  **CERO**: son 15/255 en un solo canal y en luminancia no llega a 5. Con **0,09** el canal rojo sale
  a 53/255 — una mancha roja oscura que a oscuras se adivina y no ilumina nada, que es lo pedido.
- **MENÚ.** Fondo de tres anillos que salen del centro y se apagan (la mecánica del juego funcionando
  antes de tocar nada), título con latido, y lo que hay que saber en **tres fichas** —el ruido, el
  silencio, las hojas— en vez de un párrafo, que en un menú no se lee. Botón con relleno que barre.
  TRAMPA: los huecos en **porcentaje** en una columna de altura automática resuelven contra **cero**,
  así que el subtítulo se montaba sobre la base del título y "beta" quedaba pegado al botón. Van en
  `clamp` de px.
- **VIÑETA** de CSS: cero triángulos, y empuja la vista al centro, que en un juego a oscuras es justo
  lo que hace falta.
- **La caída de la onda pasó de 0,020 a 0,013**: con la anterior una pisada dejaba de verse a los
  10 m (medido: 0,7 de brillo medio a 9,5 m) y en pasillos de 20 m eso es caminar a ciegas entre paso
  y paso.
- Costo final: **19 llamadas de dibujo, 5.720 triángulos, 0,4 ms por cuadro**. Partida completa
  re-verificada con los cuatro enigmas y la victoria. Cero errores de página.

### Cómo estaba hecho la segunda vuelta

**Segunda vuelta (2026-08-25).** Pedido textual: *"el movimiento nada que ver hacelo más realista pue
y que no se vean a menos que hagas ruido también que sea tirador 90° 16:9 y también movimiento goty
no así de choto mejora todo agrega notas en las paredes que al acercarte debes gritar unas cuantas
veces para que aparezca y leer pistas y agrega 4 puzlles etc"*.

- **CUADRO 16:9 Y 90 GRADOS HORIZONTALES.** Ojo: three.js pide el campo **vertical**. Con 16:9, 90
  horizontales son **58,72 verticales**; ponerle 90 a three.js da 121 horizontales y sale ojo de pez.
  Medido: `relacion 1.7778`, `fovH 90.00`, `fovV 58.72`.
  Y **en vertical el cuadro se GIRA 90°** en vez de encogerse: en 412×915 un 16:9 sin girar mide
  412×232 (el 11% de la pantalla), girado mide 732×412. Adentro del `#caja` va TODO —lienzo, HUD,
  botones y menú— así que hay **una sola transformación** y nada queda desalineado.
  TRAMPA: con el cuadro girado `getBoundingClientRect` devuelve la caja **alineada a los ejes**, y
  para un joystick redondo eso da el cuadrado equivocado. Va `aCuadro(px,py)` (inversa de
  `rotate(90deg)`: `lx=(py-H/2)+w/2`, `ly=h/2-(px-W/2)`) más `dCuadro` para los arrastres, y el
  rectángulo del joystick sale de `offsetLeft/offsetTop`, que son coordenadas de la caja.
  Verificado con toques sintéticos: un toque a 66 px del centro del joystick da desviación 1,00 y a
  105 px da 1,59, con el cuadro girado.
- **NADA SE VE SIN RUIDO, y antes sí se veía.** El agujero era el faro de la salida: estaba
  encendido siempre. Ahora hay un uniforme `uEco` (cuánta onda viva hay, 0 a 1) y **todo** lo que no
  sea el frente de una onda cuelga de él: el faro, el brillo del cuerpo y el de las notas.
  Medido: en silencio absoluto `medio 1.1`, **`pctEncendido 0`**, franjas `[0,0,0,1.9,3.6]`;
  gritando `medio 98.4` y `pctEncendido 100`.
  **TRAMPA DE GAMMA que costó una medición:** three.js guarda el color del material en espacio
  **lineal** y la salida lo convierte a sRGB, así que multiplicar por 0,12 **no** da 12% en pantalla,
  da `0,12^(1/2,2)` = **36%**. Con el piso en 0,12 el cuerpo se leía a 60/255 en silencio: un gris
  bien visible, justo lo contrario del pedido. `CUERPO_PISO=0.012` sale a 13%.
- **MOVIMIENTO.** Lo que estaba mal: se sumaba aceleración al vector velocidad y después se topaba
  la velocidad **total**, y el roce se aplicaba a **todo**. Dos consecuencias medidas:
  1. doblar **frenaba** (la velocidad vieja y la nueva se recortaban juntas);
  2. el tope real quedaba **10% por debajo del ajuste** (4,96 con el tope en 5,50), porque el roce y
     la aceleración se equilibran antes de llegar.
  Ahora, como en los tiradores desde Quake: se agrega **solo lo que falta en la dirección pedida**, y
  el roce se aplica **solo a la componente de costado** mientras se pide movimiento. Medido:
  topes exactos **2,85 / 5,50 / 1,30** (caminar / correr / agachado), arranque 0→5,5 en **6 cuadros**,
  frenada con umbral en **0,310 m**, salto de **0,694 m** de ápice y **34 cuadros** (0,57 s) de aire.
  Media vuelta corriendo: 5,5 → 0,28 → 5,5 en 11 cuadros, o sea **inercia de verdad**.
  Más: coyote de 0,12 s y pedido de salto guardado 0,16 s, muelle de aterrizaje amortiguado
  (ω=12,6, ζ=0,71) con golpe proporcional a la caída, bamboleo **en ocho** (vertical al doble de la
  frecuencia del vaivén de cadera, porque hay dos pisadas por ciclo), inclinación al ir de costado,
  tirón de campo de +5° al correr y −2° agachado, y ojo que baja a 1,04 al agacharse con muelle.
- **JOYSTICK ANALÓGICO, y el "correr" estaba roto de raíz.** El umbral era 0,90 de desviación **ya
  recortada**, y un joystick de pulgar se lleva al borde para caminar normal: medido, en teléfono el
  personaje **corría siempre** y la velocidad de caminar no existía. Ahora se guarda la desviación
  **en bruto** antes de recortarla, y correr es empujar el dedo **más allá del aro** (>1,35). La
  velocidad es analógica: media desviación, media velocidad, con piso en 0,34.
- **AGACHADO NO HACE RUIDO.** No es sabor: es la herramienta del enigma del corredor. Verificado:
  300 cuadros andando agachado emiten **0 ondas**.
- **LAS PISADAS VAN POR DISTANCIA, no por tiempo.** Antes el reloj de la zancada avanzaba con la
  velocidad y disparaba en un umbral fijo, o sea que la zancada **medía distinto** según lo rápido
  que fueras. Ahora es una distancia en metros por ciclo (3,4 caminando, 4,3 corriendo, 2,6
  agachado), así la pisada cae siempre en el mismo punto del paso y las piernas van clavadas con ella.
- **SEIS NOTAS EN LAS PAREDES.** Se revelan con **tres gritos** cerca (3 m). Cada una va en una pared
  de su celda (`mezclar(LADOS).filter(l => MAPA[j][i][l])`: si no, una nota puede quedar colgada en
  el aire en el medio de un cruce). Se leen con **F** en PC o el botón LEER en teléfono, y la primera
  se abre sola al revelarse.
  DEFECTO ENCONTRADO MIDIENDO: con la espera del grito en 6 s, revelar una nota son **18 segundos**
  parado mirando una pared — la prueba dejaba la nota en 1 de 3 porque los otros dos gritos caían en
  la espera. Ahora **al lado de una nota sin revelar la espera es 2 s** y lejos sigue siendo 6.
  Verificado: 6,00 lejos, 2,00 al lado.
- **CUATRO ENIGMAS, CUATRO SELLOS.** La salida no abre sin los cuatro (verificado: con 3/4 el cartel
  dice `SELLADA · 3/4` y no gana; con 4/4 gana).
  1. **Los tres tambores**: tres cilindros con **una, dos y tres bandas** talladas. Gritarles al lado
     en el orden que da la nota. Orden equivocado → vuelve a cero. Las bandas son el enunciado: sin
     algo que los distinga, "en este orden" no quiere decir nada.
  2. **El pasillo dormido**: la tirada recta más larga del laberinto, con un arco en cada punta.
     Cualquier ruido adentro lo despierta. Se cruza **agachado y a ciegas**. Verificado los dos
     caminos: gritar adentro deja `desde=-2` y cruzar **no** sella; agachado cruza 32 celdas con
     **1 sola onda** (la del propio sello) y **sí** sella.
  3. **La cuenta**: contar las paredes de la sala del aro y **golpear el piso** esa cantidad de veces
     (saltar es golpear; solo cuenta el **aterrizaje**, no el despegue). Pasarse vuelve a cero.
  4. **El eco largo**: el sin salida más profundo (BFS), marcado con cuatro postes. Gritar ahí.
- **LOS TAMBORES FRENAN.** Las colisiones salen de la grilla, así que un cilindro plantado en el
  medio de una celda no existe para ellas y se cruzaba como si fuera humo. Un círculo por obstáculo
  (`OBST`), y va **declarado arriba** porque `corregir()` lo lee: un `const` leído antes de su línea
  tira ReferenceError y se cae el módulo entero. Es la tercera vez en este proyecto.
- **TODO EL RUIDO PASA POR `ruido(tipo,...)`.** Con cuatro enigmas que escuchan, dejar que cada sitio
  llame a `emitir()` por su cuenta obliga a repetir el aviso en cinco lugares y garantiza olvidarse
  de uno.
- Costo medido: **19-21 llamadas de dibujo, 4.878 triángulos, 0,1-0,3 ms por cuadro**. Las marcas de
  los enigmas van fundidas en **una sola malla** con el mismo material del sonido (o sea que tampoco
  se ven sin ruido); las notas van sueltas porque cada una se enciende sola.
- Partida completa verificada de punta a punta: laberinto 169/169 alcanzable, los cuatro sellos, el
  cartel de sellada con 3/4, y `SALISTE · 0:28` con 4/4. Cero errores de página.

### Cómo estaba hecho la primera vuelta

- Laberinto 13×13 (`CEL=4.2`, `N=13`) por vuelta atrás recursiva + ~6% de atajos, para que
  no sea un árbol puro y haya bucles. La salida va en la celda **más lejana en pasos**
  (BFS desde la entrada), no en la esquina.
- Todo el laberinto fundido en **una sola malla** con `mergeGeometries` → 16 llamadas de
  dibujo en total, 2.436 triángulos, 0,1 ms por cuadro.
- Un `ShaderMaterial` con hasta **8 ondas** (`uPos` xyz+t0, `uDat` fuerza/alcance). Cada
  onda ilumina donde `abs(dist - radio) < uBanda` (frente, 1,15 m) más una cola que decae
  (`uCola`, 5,2 m). Término de cara (`dot(normal, hacia la onda)`) para que las esquinas
  se lean. `VEL_SONIDO=13,5` m/s: con 343 el laberinto parpadea y no se ve nada.
- Ruido = ondas: una por zancada (`jug.paso>1.55`), una al caer, y `gritar()` con alcance
  46 y espera de 6 s (anillo de `conic-gradient` como recarga).
- Cuerpo completo visible (pecho, muslos, pantorrillas, pies, dos brazos con manos y dedos)
  en `MeshBasicMaterial`, así se ve siempre aunque el resto esté negro. El tronco se
  inclina con el pitch (`tronco.rotation.x = -pitch`).
- Movimiento con aceleración y roce (`ACEL` 34/8, roce 9,5/16/1,4, `VEL` 2,9/5,6), no
  velocidad instantánea.
- Colisiones desde la grilla, **eje por eje**, así se desliza por la pared en vez de
  clavarse; más un re-chequeo de la celda nueva en diagonal.
- El cuerpo tuvo tres arreglos medidos con `__eco.manos()` (proyecta manos y pies a NDC):
  1. Los brazos colgando dejaban las manos a 37 grados debajo del centro y el vaiven del paso las
     empujaba a 51: con 39 grados de medio campo vertical desaparecian **justo al caminar**.
     Ahora van casi horizontales (`BRAZO_BASE=-0.02`, `BRAZO_VAIVEN=0.16`), como quien tantea a
     oscuras: lo peor medido caminando es y=-0.60 sobre un borde de -1.00.
  2. El antebrazo arrancaba a 3 cm del ojo: una caja de 11 cm ahi tapa media pantalla en cuna hasta
     las esquinas. Se corrio a 22 cm y se afino a 8,5 cm.
  3. El pecho puesto donde va de verdad (22 cm bajo el ojo) tapaba la pantalla ENTERA al mirar al
     piso. `tronco.position.set(0,-0.10,0.10)`: la trampa que hacen todos los primera persona con
     cuerpo. Mirando a -1,2 rad ahora se leen pecho, manos y los dos pies, y el laberinto alrededor.
- El detector de plataforma tenia un agujero grave para telefono: **Chrome de Android dispara
  `mousemove` sintetico despues de cada toque**, y eso pasaba a modo PC y apagaba el joystick. Un
  `mousemove` ahora solo cuenta si movio de verdad Y si no viene dentro de 1,2 s de un toque.
  Verificado: toque+mousemove sintetico queda en `movil` con joystick/grito/salto visibles; un
  mousemove real 1,4 s despues pasa a `pc` con la leyenda de teclas encendida y el joystick apagado.
- Ganchos de prueba en `window.__eco`: `estado, ondas, emitir, gritar, laberinto, poner,
  mirar, caminar, perfil, brillo`. `brillo()` lee el cuadro con `gl.readPixels` (no
  `drawImage`: un lienzo WebGL sin `preserveDrawingBuffer` sale en cero) y devuelve media,
  máximo, % encendido y 5 franjas horizontales.
## Pendientes de Campo_de_Tiro.html

Pedidos el 2026-08-23, todos sobre `juegos-pc/Campo_de_Tiro.html`:

- [x] **Mira del sniper: RESUELTA DE RAIZ** (2026-08-23). Se saco la segunda pasada de escena
      entera. El aumento lo hace la camara del juego (por tangente) y el aro es un CONTORNO fino con
      la reticula — SIN negro alrededor. Una sola imagen: el mismo mundo, al mismo aumento, adentro
      y afuera del aro. El negro era el error: se leia como dos pantallas distintas.
      AWM 6,00x, Dragunov 4,00x. Referencia: Blood Strike, M700 mira x6.
      **Y EL FUSIL SE VE** (pedido "PERO ESO CON LA MIRS Y EL ARMA DEL SNIPER"): el mundo se dibuja
      con el campo angosto del aumento y el arma va en una SEGUNDA PASADA propia (`_vmEsc`,
      `_vmCam` a 34 grados, `autoClear=false` + `clearDepth()`), asi el fusil no se estira con el
      zoom. El tubo del visor se apaga mientras se apunta y no es un descuido: mide 30 cm y el ojo
      queda a 6,5 cm del ocular, o sea que la campana abarca 24 grados de SEMIangulo contra los
      18,9 que mide todo el campo a 6x — por el tubo se ve la pared de adentro, no el otro lado.
      Por eso el aro es un contorno y no una ventana.
      Medido en cuadro completo (`__tiro.costo()`): AWM cadera 428 llamadas / 1.072.624 triangulos
      contra 260 / 1.055.934 apuntando (-168 y -16.690); Dragunov -52 llamadas; AK sin visor 0 y 0,
      que es el testigo de que la medicion mide lo que dice.
      OJO con `renderer.info.render`: three.js lo pone a cero al empezar cada `render()`, asi que
      leerlo despues de un cuadro deja solo la ultima pasada. Para el cuadro entero va
      `info.autoReset=false`, que es lo que hace `__tiro.costo()`.
- [x] **El borde metalico del aro** (2026-08-23), pedido "LE FALTA LOS BORDES METALICOS DEL MODELO
      3D": el aro era SOLO una linea de CSS, y una linea no tiene canto ni brillo. Ahora hay un
      BISEL de verdad (`_telBiselG`): dos torneados de revolucion, la cara pulida (metalness 0,96 /
      roughness 0,22) y la pared mate oscura (0,85 / 0,58). El quiebre entre los dos acabados es lo
      que lo hace leer como pieza torneada; con un solo material salia un aro gris plano, porque
      metalness 1 no tiene difuso y todo el aro reflejaba lo mismo.
      Va APARTE de `gMira` y al REVES: es el unico pedazo de la mira que se enciende apuntando. Y
      puede, porque no es un tubo: 15 mm de fondo casi no se proyectan, asi que lo que se ve es la
      CARA de frente.
      DEFECTO DE FONDO QUE APARECIO ACA: `vmAroPx()` ESTIMABA el radio suponiendo que el ojo estaba
      a |_telOcularZ| del ocular, o sea que el origen del arma caia en la camara. No cae: gunRoot
      tiene su posicion y el apuntado la corre otra vez. Medido, el error era de 1,44 veces — el aro
      de CSS se venia dibujando 44% mas grande que el ocular de verdad desde el principio, y por eso
      el metal aparecia bien adentro de la linea. Ahora se PROYECTA el punto de verdad con la camara
      del arma, asi que la linea y el metal caen en el mismo sitio por construccion.
      Y como el ocular de verdad se proyecta en el 35% del alto y el aro aprobado estaba en el 50%,
      el bisel se ESCALA hasta dar en el blanco (`vmAroAjustar`, VM_ARO_ALTO=0.50). Es una decision
      de imagen y esta anotada como tal, igual que VM_FOV=34. Una sola multiplicacion clava el
      blanco porque el radio proyectado va lineal con el radio del objeto.
      Medido: abertura 50,0% del alto y canto exterior 59,0% con lienzos de 420, 430 y 600 px de
      alto; la pasada del arma pasa de 5 a 7 llamadas; apuntando sigue costando menos que la cadera
      (-51 llamadas la AWM, -50 la Dragunov). Cadera, apuntado y arma sin visor verificados: el
      bisel y el visor son exactamente inversos, y el AK no enciende ninguno de los dos.
- [x] **Controles para los que recien empiezan** (2026-08-23): apuntar de UN TOQUE por omision
      (CFG_DEF.apuntar='tap'), botones un 10% mas chicos, y FUEGO y APUNTAR del 50% al 81% del alto
      de la pantalla — estaban justo sobre la linea del horizonte. Con la mira puesta el HUD se
      esconde salvo joystick, apuntar y disparar.
- [x] **EL JUEGO ESTA TRADUCIDO DE VERDAD** (2026-08-23). Los dos que lo probaron dijeron lo mismo:
      "the game is not fully translated into English, still a lot of Spanish". Medido: LANG.es tenia
      137 claves y LANG.en solo 30, asi que 107 caian al respaldo de t() —que devuelve el castellano
      cuando falta la traduccion— y el jugador en ingles leia el menu en ingles y todo lo demas en
      castellano. Aparte habia unas cuarenta cadenas escritas derecho en el codigo, sin pasar por la
      tabla: esas no se arreglaban traduciendo, habia que hacerlas pasar por t() primero.
      QUE SE HIZO: las 107 que faltaban, en ingles y portugues. Mas 60 claves nuevas para lo que
      estaba suelto: el aviso de quien te mato, el panel de amigos entero, el microfono, los rotulos
      del HUD, los nueve grados militares, los seis escalones de rango, los tres modos, los cinco
      mapas de arena, los ocho acabados de arma, las nueve skins de ropa, las 16 descripciones de
      arma, las frases del teclado rapido y la tienda de personajes.
      TRES TRAMPAS QUE VALE ANOTAR:
      1. UNA TABLA DE DATOS NO SE TRADUCE CON UNA CADENA. Las tablas se arman una sola vez al
         arrancar, asi que si el texto queda ya resuelto, cambiar de idioma no lo cambia nunca. Van
         como objeto {es,en,pt} y quien los MUESTRA los pasa por tl(). Y como no todas se
         convirtieron a la vez, el mismo sitio puede recibir cadena u objeto: para eso esta tv(),
         que resuelve las dos. Sin tv(), la tabla ya convertida sale como "[object Object]".
      2. HAY TEXTO QUE NO ES textContent. El placeholder del cuadro de nombre necesita su propio
         barrido (data-i18n-ph), y el rotulo NIVEL de abajo del avatar vive en un ::after de CSS:
         a ese no lo alcanza ningun atributo y va por variable, como ya se hacia con CONSEJO.
      3. EL PLURAL NO ES UNA 's'. "solicitud/solicitudes" contra "request/requests" son dos palabras
         distintas en la tabla, no una con sufijo.
      Medido con el juego corriendo en ingles, barriendo TODO el texto visible mas los placeholder
      mas las variables de CSS: de 288 cadenas visibles quedaban 25 en castellano al empezar; ahora
      queda UNA, y es "Español" en el selector de idioma, que tiene que quedar asi. Verificado
      tambien en portugues (sale portugues, no castellano) y en partida, no solo en el menu. Cero
      errores de pagina.
- [x] **PC DE VERDAD, Y SE ELIGE AL ABRIR** (2026-08-24). Pedido: "agrega PC control e interfaz PC
      al entrar al juego antes del menu de carga te debe aparecer si eres de PC o movil".
      HALLAZGO: los CONTROLES de PC ya estaban casi completos (WASD, mouse con pointer lock, click
      izquierdo dispara, derecho apunta, R, E, Q, C, I, B, 1/2). Lo que NO existia era la INTERFAZ:
      el joystick y los nueve botones tactiles se dibujaban igual en PC, tapando media pantalla para
      hacer cosas que ya hacia el teclado.
      Ahora hay un cartel de PC/Movil ANTES del de idioma, con la opcion probable ya marcada por
      `platAdivinar()` (tactil Y puntero grueso; con una sola de las dos no alcanza, porque una
      notebook tactil da tactil y puntero fino). Se pregunta igual: adivinar y aplicar sin preguntar
      falla justo en los casos raros (monitor tactil, telefono con teclado, emulador).
      La interfaz cuelga de `body.plat-pc` / `body.plat-movil`, no de ifs desparramados. En PC se
      esconden joystick, los nueve botones, el menu ☰ y el editor de botones, y entran la leyenda de
      teclas (13 teclas, dos columnas) mas una pista de una linea.
      TECLAS QUE FALTABAN: Esc pausa (en PC no hay boton ☰, asi que no habia forma de pausar), T
      abre el chat, Ctrl desliza. Y se borro una rama muerta: el `else if` de Shift+apuntar era
      inalcanzable porque el de arriba ya atrapaba Shift.
      CUATRO COSAS QUE SALIERON MAL Y VALE ANOTAR:
      1. `let plat` choca con una `function plat()` que ya existia para construir plataformas de
         nivel. La variable pasa a `plataf`.
      2. La leyenda decia "Shift apunta" porque lo puse de memoria, y Shift DESLIZA: el apuntado es
         con click derecho. Una leyenda que miente es peor que no tenerla.
      3. La fila de ajustes GUARDABA la plataforma, y eso pisaba la eleccion de la pantalla de carga
         —que es justo el valor al que vuelve 'Automatico'. Medido: movil -> PC -> Automatico se
         quedaba en PC para siempre. Ahora no guarda, y el ciclo cierra.
      4. `ct_ayuda2` no lo dibuja NINGUN elemento hoy: es una clave viva en la tabla sin consumidor,
         asi que barrer por data-i18n no hacia nada. Se pisa la ENTRADA DE LA TABLA, y entonces
         cualquiera que llame t('ct_ayuda2') recibe la version de su plataforma.
      Medido: en PC los seis controles tactiles ocultos y la leyenda visible; en movil exactamente
      al reves. Segunda visita no pregunta. Si nadie elige, a los 15 s se toma lo adivinado y no
      queda trabado (y no se sella, asi que la proxima vez vuelve a preguntar). El texto de ayuda
      cambia con la plataforma, verificado leyendo la clave. Cero errores de pagina en 9 corridas.
      Y despues, en la pasada de arreglos:
      · **BUG GRAVE: el battle royale NO SE PODIA JUGAR con teclado.** La logica de "el mismo boton,
        tres trabajos" (avion -> tirarse, cayendo -> abrir campana, piso -> saltar) vivia SOLO en el
        manejador del boton tactil; la barra espaciadora se limitaba a `jumpReq=true`. O sea que con
        teclado no habia forma de salir del avion ni de abrir el paracaidas. Ahora es una funcion,
        `saltoBoton()`, y la llaman las tres entradas: boton, teclado y mando (el boton A del mando
        tenia el mismo defecto). Verificado: avion -> Espacio -> caida -> Espacio -> para.
      · **El boton del salto ganaba por especificidad de ID.** `body.enAvion #bJump{...!important}`
        lleva un ID, y un ID le gana a dos clases aunque ambas tengan !important: en una partida de
        PC aparecia un boton tactil de 104 px en el medio de la pantalla. Se agrego
        `body.plat-pc.enAvion #bJump`. Esconderlo recien es seguro DESPUES de arreglar lo de arriba.
      · **`#salHud` no es un control.** Lo habia escondido en PC de puro barrido, y es el marcador de
        ALTURA: en la caida es lo unico que te dice cuanto falta. Vuelve.
      · **OTRO TDZ, y grave.** Las declaraciones de plataforma estaban abajo, con el resto de su
        logica, y `ldTips()` llama a `esPC()` al armar la pantalla de carga — antes de que se
        evaluara `let plataf`. Un `let` leido antes de su linea tira ReferenceError, y eso corto el
        modulo COMPLETO: se cayo hasta la precarga de audio. Es la segunda vez en este archivo que
        una declaracion puesta "donde corresponde tematicamente" en vez de "antes del primer uso"
        tira todo abajo. Las cuatro declaraciones se subieron al principio del modulo.
      · Los avisos del salto decian "TOCÁ SALTAR" en PC, donde no hay boton: ahora hay `tp()`, que es
        tl() pero eligiendo primero el aparato. Y los dos consejos de la carga que nombran un boton
        van por plataforma (DESLIZAR / SHIFT); los otros diez hablan del juego y sirven igual.
      · Y aparecieron cuatro etiquetas en castellano que el barrido de traduccion no habia pescado
        porque no llevan acento: VIVOS, BAJAS, bajas y "RONDA 1 · A 20 BAJAS".
- [ ] **NO REPRODUCIDO: los NPC desaparecen al cambiar ajustes.** Medido en la arena con 7 bots:
      barrido de 360 grados antes y despues de cambiar preajuste (bajo/ultra), calidad general
      (baja/alta), calidad de texturas y detalle de personajes -> 7 de 7 visibles en todos los
      casos, 58-78 mallas encendidas. Si vuelve a pasar hace falta saber EN QUE MODO y QUE ajuste.
      De paso se arreglo un defecto real del mismo tipo: `mundoGZ()`.
- [~] **Armas de verdad**: buscar referencias reales y rehacer los modelos. **P90 hecha**
      (2026-08-23): rehecha con las medidas de FN Herstal — bullpup, cargador acostado arriba,
      hueco del pulgar, guardamonte-aro, expulsion para abajo, manijas ambidiestras y apagallamas
      en diagonal. Medida: 522x227x79 mm contra 505x210x55 reales.
      **Faltan las otras 16.** Ir de a una, con referencia y medidas, y verificar con
      `__tiro.armaMedir()` (mide el arma sola, en su marco local, en milimetros).
- [x] **Reticulas reales** (2026-08-23): mil-dot en la AWM y PSO-1 en la Dragunov, calcadas.
- [x] **Zoom del visor invertido** (2026-08-23): el campo del visor sale de cuanto ocupa el disco
      en pantalla, asi que el aumento que se ve es el que dice el arma. AWM 6,00x, Dragunov 4,00x.
- [x] **Lag del visor** (2026-08-23): la camara del visor va en el ojo, sin lerp de posicion.
- [ ] **Bug: reaparecés sin nada**. Al salir o al morir y revivir, te quedás sin equipo.
- [ ] **Bug: el cambio de gráficos borra a los enemigos**. Tocar los ajustes de imagen
      hace desaparecer a los bots / jugadores.
- [x] **EL HTML BAJA A LA MITAD Y LOS ASSETS SALEN DE jsDELIVR, TODOS JUNTOS** (2026-08-23).
      Treinta y un assets vivian incrustados en base64: 9 texturas de mapa, 11 pistas de audio, 6
      insignias de rango, la portada y el arte del menu y las 3 tarjetas de modo. Eran 2,16 MB de
      3,83 —el 56,6%— y en base64, que abulta un tercio sobre el binario (1,62 MB de verdad).
      **HTML: 3,83 MB -> 1,68 MB.** Cero data: URI.
      TRES COSAS QUE SE MIDIERON Y CAMBIARON EL DISENO:
      1. EL SCRIPT DE MQTT FRENABA TODO. Un `<script src>` sin defer bloquea el parseo hasta que
         llega o falla, y estaba ARRIBA de la precarga. Medido con los tiempos del navegador: el
         primer byte de un asset se pedia **12,7 segundos** despues de abrir la pagina en una red
         donde unpkg no contesta. Poniendo la precarga arriba y `defer` en el de mqtt: la ventana
         de descarga completa paso de **12.778 ms a 239 ms**, y los 31 arrancan dentro de 160 ms
         unos de otros. La suma de las duraciones individuales es 1.573 ms, o sea que el paralelismo
         da **6,6x**. Ese es el numero del pedido "no uno por uno sino en simultaneo".
      2. CORS, o no anda nada. De las texturas del mapa se LEEN PIXELES para derivar normal,
         rugosidad y oclusion, y un lienzo con una imagen de otro dominio queda tenido: getImageData
         tira SecurityError. Mientras venian en data: URI el problema no existia (mismo origen).
         Va `crossOrigin='anonymous'` en las imagenes y `crossorigin` en el `<img>` del arte, que se
         sube a la GPU. Verificado con curl: jsDelivr manda `access-control-allow-origin: *` en los
         seis caminos probados.
      3. EL AUDIO YA NO SE CONVIERTE. Antes cada pista pasaba de base64 a ArrayBuffer con atob() y
         un bucle byte por byte: casi un mega de trabajo en el hilo principal en cada arranque.
         Ahora la precarga deja los ArrayBuffer listos. OJO: `decodeAudioData` VACIA el buffer que
         recibe, asi que va `ab.slice(0)` — sin la copia, un segundo intento encuentra cero bytes.
      Y no se decodifica dos veces: `hgTexCargar` usa la imagen que ya bajo la precarga en vez de
      crear otra con la misma URL (pega en el cache, pero decodificar nueve WebP de 512 de nuevo son
      medio segundo de telefono regalado).
      Medido: 31 de 31 en 210 ms, los 11 audios decodifican con su duracion real (m_menu 20,04 s,
      m_combate 25,08 s) y `sinte:false`, la insignia carga a 176 px, cero errores de pagina.
      DEGRADA BIEN: con la CDN caida a proposito (31 de 31 fallados) el juego entra a la arena y se
      juega — texturas dibujadas por codigo, audio sintetizado, bots presentes.
      NO SE PUDO PROBAR de punta a punta contra jsDelivr desde el arnes: el navegador de prueba no
      tiene salida a internet (unpkg tambien da ERR_CONNECTION_RESET, con y sin proxy). Lo que si
      se verifico es que jsDelivr responde 200 con CORS en los seis caminos, y que el juego anda con
      los mismos archivos servidos local.
      EL PIN VA A UN COMMIT (`@73fde79`) y no a una rama: jsDelivr cachea por URL para siempre con
      hash y 12 horas con nombre de rama. **Al cambiar un asset hay que mover el pin.**
- [ ] **Lobby de BR**: al iniciar partida de battle royale, caer primero en un lobby
      (antes del avión), no directo a la partida.
- [x] **PBR en el BR** (2026-08-23): los 26 materiales del valle mas el suelo derivan rugosidad,
      normales, oclusion y metal de su propio lienzo de color, igual que los mapas de la arena.
      Todo en segundo plano y autoregulado por costo medido.
- [x] **EL BR DEJA DE SER PROCEDURAL** (2026-08-23), preguntado por el usuario: "veo que el br tiene
      texturas procedurales". Tenia razon y era un pendiente abierto de verdad. Los 26 materiales del
      valle se dibujaban con lienzos 2D; el PBR de antes derivaba rugosidad, normales y oclusion DE
      ESE LIENZO —mapas de verdad, color base dibujado—, y eso se ve.
      HALLAZGO: en el repo ya habia 42 texturas de foto hechas con Higgsfield que NADIE usaba. La
      tuberia (`armTex`/`hfArma`) existia y estaba enchufada a 3 materiales, los tres del arma.
      Ahora `ALC_HF` mapea 24 materiales del valle a foto, en diferido igual que las del arma: el
      mapa arranca con los lienzos y las fotos entran cuando llegan, asi que sin red se juega igual.
      Quedan a proposito en lienzo `ventana`, `vidrio` y `hoja`: su lienzo dibuja la cuadricula del
      marco, que es geometria disfrazada de textura, y una foto no la trae.
      Se generaron las 6 que faltaban (ladrillo, ladrillorojo, ceniza, grava, quemado, rejilla).
      DOS COSAS QUE HAY QUE HACER Y NO SON OBVIAS:
      · LA ESCALA SE MIDE. Un mosaico del valle son 2,2 m y el lienzo del ladrillo dibuja 32 hiladas
        de 6,9 cm. La foto tiene 20 hiladas (medido con el perfil de filas de la imagen), de ahi sale
        repeat 1,60; el rojo tiene 16,8 y va en 1,90. Sin esta cuenta las paredes salen de casa de
        munecas o de gigante.
      · EL TINTE SE CALCULA. Poniendo el color en blanco manda la foto y el valle se puso NARANJA
        entero: la teja promedia #c0815f y el techo estaba autorizado en #9c5541. El tinte es la
        division canal por canal EN LINEAL entre el color del material y el promedio de la foto.
        Donde la foto es mas oscura que el color, el tinte se topa en blanco y el material queda mas
        oscuro que antes (el ladrillo rojo).
      Medido y asentado: 24 de 24 materiales en foto, 23 con normal de archivo, 26/26 con rugosidad.
      Memoria de texturas del valle: 21,5 MB procedural -> 33,1 MB en calidad baja (sin normales de
      archivo, que son 24 MB) -> 60,4 MB en media/alta. Es un costo real y por eso esta escalonado.
      De paso se solto el lienzo viejo de la placa al reemplazarlo, que se quedaba ocupando lugar sin
      que nadie lo dibujara.
      OJO: `alcPBRUno` pedia `getContext`, o sea un lienzo, asi que con textura de foto se rendia y
      el material se quedaba sin rugosidad. Ahora pide que tenga ancho y sirve para los dos.
- [ ] **Mas VARIEDAD de materiales en el BR**: distinto de lo de arriba. Ya no son procedurales,
      pero siguen siendo 26 materiales para todo el mapa; hacen falta mas materiales DISTINTOS.
- [ ] **Cinco mapas distintos** — EL PEDIDO CONCRETO (2026-08-23): que sean **islas**, un
      **lugar de trafico con contenedores** (tipo Shipment) y **Nuketown**. Con referencias.
      HALLAZGO IMPORTANTE de por que los cinco se sienten iguales: `buildArena()` envuelve
      SIEMPRE el mapa en la misma MURALLA DE CASTILLO con almenas, cuatro torres en las esquinas
      y cuatro tiendas (linea ~20050). Los `bloques` de cada mapa cambian el interior pero el
      marco es identico, y el marco es lo que uno ve. Antes de hacer Nuketown o Shipment hay que
      hacer el CERCO configurable por mapa: muralla / malla de alambre / cerco de suburbio con
      bloqueo. Ese es el desbloqueo, no los bloques.
      Referencias ya buscadas:
      · Nuketown: dos casas enfrentadas (norte verde-azul, sur amarilla) con garaje y jardin
        atras, calle en el medio con un colectivo y una camioneta, al oeste un auto delante de
        una casa rosa en el fondo ciego, al este un bloqueo, maniquies en los jardines.
      · Shipment: cuadrado chico, cuatro bloques de contenedores formando un cruce, cerco de
        malla, contenedores inclinados contra las paredes.
- [ ] **Bots con slide-cancel** (pedido viejo).
- [ ] **Menú de skins / personalización de ropa** (pedido viejo).

## Reglas fijas de este usuario

- **Nunca** usar cuadros de `AskUserQuestion`: *"elimina este tipo de cuadros porque se
  buguea, uso celular"*. Preguntar en texto plano si hace falta.
- Desarrollar, commitear y pushear **solo** a la rama `claude/billeteras-sin-registro-3z7uvz`.
- **No** abrir pull requests salvo que lo pida explícitamente.
- **No** poner el identificador del modelo en commits, PRs, comentarios de código ni en
  nada que se pushee.
- Cuando pide "dame el HTML", quiere el archivo `juegos-pc/Campo_de_Tiro.html` adjunto.
- El juego se sube al portal **Rezona**. Es un HTML autocontenido: todo va adentro del
  archivo, sin dependencias externas más allá del CDN de three.js.
- Verificar con mediciones antes de afirmar que algo funciona. Historial: *"apenas hacés
  algo nuevo rompes otra cosa"*.

## Cómo probar (banco de pruebas)

El contenedor es efímero y se reclona: si `/tmp/ui` no existe, hay que rearmarlo.
- `prep.py` reescribe los CDN a `node_modules` local y los brokers MQTT a `ws://127.0.0.1:9001/9002`.
- `h1.mjs` levanta un server en 8099 y maneja Playwright (los módulos ES no cargan por `file://`).
- `run.sh <json> <log> [ancho alto]`.
- Chromium en `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` con
  `--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
  --proxy-bypass-list=<-loopback> --autoplay-policy=no-user-gesture-required`.
- Al abrir hay que sacar del medio: el selector de idioma (`#ldIdioma .ldIdB[data-lang=es]`),
  el cartel del nombre (`#npGo`) y a veces el `#loader`.
- Chequeo de sintaxis: `acorn.parse(<script type=module>, {ecmaVersion:'latest', sourceType:'module'})`.
- Para grepear sin que los blobs en base64 ensucien todo:
  `awk '{ if (length($0)>3000) print "<<<datos>>>"; else print $0 }' juegos-pc/Campo_de_Tiro.html > /tmp/cdt.txt`
