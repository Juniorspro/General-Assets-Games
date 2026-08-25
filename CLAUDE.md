# Notas del proyecto

## Palabra clave: "Pope"

Cuando el usuario escriba **"Pope"** (solo, o dentro de un mensaje), significa
**"seguí con la lista de pendientes de abajo"**, sin volver a preguntar qué hacer.
Arrancar por el primero que siga sin tildar, y tildarlo acá al terminarlo y pushearlo.


## Los juegos de `juegos-pc/`

- **`Campo_de_Tiro.html` ES "Z Force"** (1,83 MB). Es el proyecto grande: FPS con campo de
  tiro, todos-contra-todos, duelo de equipos y battle royale. **NO SE TOCA NI SE BORRA**:
  el usuario lo quiere guardado para retomarlo. Sus pendientes son la lista de abajo.
- **`Eco.html` es "Eco"** (~167 KB, de los cuales 77 KB son la foto de la hoja), beta nueva y aparte. Laberinto a ciegas: el mundo está
  negro y solo se ve por ecolocación, en blanco y negro. Pedido textual: *"un entorno 3D
  con las mismas características de primera persona buen movimiento etc y manos en primera
  persona no armas y un menú super simple ... puedes ver tu cuerpo completo pero no ves el
  entorno solo lo ves al caminar porque hacer ruido manda impulsos que hace que puedas ver
  en blanco y negro ondas que remarcan todo el laberinto"*.

### Cómo está hecho `Eco.html`

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
