# Notas del proyecto

## Palabra clave: "Pope"

Cuando el usuario escriba **"Pope"** (solo, o dentro de un mensaje), significa
**"seguí con la lista de pendientes de abajo"**, sin volver a preguntar qué hacer.
Arrancar por el primero que siga sin tildar, y tildarlo acá al terminarlo y pushearlo.


## Encargo permanente: los HTML que llegan se mejoran graficamente sin que lo pidan

Autorizado por el usuario (2026-09-01), y vale para **todo HTML que entre a la sesion**, no
para uno solo:

> mejoralo graficamente por mas que no te lo pida — menos movimiento, camara, animaciones,
> texturas las generas, cielo 360 adecuado, texturas de suelo y pisos

O sea que llegar un HTML **ya es el pedido**: no hay que preguntar si se puede pulir. Lo que si
hay que hacer antes de tocar nada:

1. **Mirar si es 2D o 3D, y decirlo.** Casi todo el encargo es de three.js: el cielo 360, las
   texturas PBR de piso, la camara. En un juego 2D —Maicol, Pompom, que dibujan todo por codigo
   en canvas— nada de eso existe y la mejora es otra: paleta, parallax, particulas, tipografia,
   transiciones. No suponerlo: abrirlo y ver.
2. **Comprobar si el HTML es la SALIDA de un juego partido.** Los grandes viven en
   `herramientas/<juego>/partes/` y se arman con `armar.py`. Editar el HTML de uno de esos es
   trabajo que el proximo armado pisa. Si esta partido: se tocan las partes y se rearma.
3. **`Campo_de_Tiro.html` no se toca ni se borra**, llegue como llegue.
4. **Medir antes de decir que quedo mejor.** Las sondas de `window.__X` y el banco de
   `/tmp/ui` estan para eso; una captura antes y otra despues valen mas que un parrafo.
5. **Lo generado no reemplaza nada hasta que llega.** Se arranca con lo dibujado por codigo y
   la foto o la malla lo pisa cuando decodifica, asi que un asset que falla cuesta una pieza y
   no la pantalla entera.

Las texturas y el cielo se generan con Rezona (`herramientas/rezona/rz.py`, un proyecto por
juego) o con Higgsfield, y conviene sacar las dos y comparar **dentro del juego**. Las diez
reglas de horneado —`face_limit`, los metros que cubre cada foto, el tinte, las costuras— estan
en la skill `arranque`, y saltearse la de los metros es lo que convierte una casa en casa de
munecas.


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
- **`Recreo.html` es "RECREO"** (~1,40 MB: 489 KB son el modelo 3D de Baldi generado con Higgsfield
  y horneado, y 507 el diálogo completo hablado en tres idiomas; la música es procedural y pesa cero). **Recreación de fan, no comercial y sin publicar**, del colegio y del
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
- **`RezUno.html` es "RezUno"** (~303 KB, de los cuales 40 son las dos imágenes del menú generadas con
  Higgsfield y recortadas; **el juego en sí no tiene un solo asset**: todo dibujado por código). El
  quinto juego. **3D con three.js sobre una mesa blanca**. Un UNO que se juega **con la mano por la
  cámara trasera** —se sostiene el teléfono y se mete la mano por detrás, como en RECREO; la frontal
  se abre sólo en un aparato que no tenga trasera—: todo, absolutamente todo, se hace con
  un **pellizco** (pulgar e índice). Enfrente hay **dos rivales con brazos y manos** que agarran su
  carta del abanico y la llevan a la pila a la vista; las cartas **flotan**. Tiene **selección gráfica
  de tres escalones** y el ritmo del detector de manos **se ajusta solo** al costo medido. Pellizcás
  una carta y aparecen dos opciones, **TIRAR** y **DEJAR**. Al tocar JUGAR se elige entre **contra
  bots** (tres jugadores, sin conexión) y **1 vs 1 en línea** por un relevo MQTT público, sin servidor
  y con código de sala. Se prueba con dos páginas y un broker local: `node /tmp/ui/broker.mjs`;
  si la carta no pega con la pila, **TIRAR se ve apagado** antes de intentarlo. Pedido textual: *"un
  UNO de handtracking simple, la idea es que el menú sea muy minimalista y el juego se llame RezUno,
  te pide idioma primero y después se abre un menú todo god minimalista con el nombre y donde en el
  menú debes tocar play tutorial si o si al inicio ... y te da un tutorial súper bien explicado"*.
  El botón JUGAR **está bloqueado hasta que el tutorial esté hecho**. Vive partido en
  `herramientas/rezuno/partes/` y se arma con `python3 herramientas/rezuno/armar.py`.
- **`Eco.html` es "Eco"** (~2,97 MB: la foto de la hoja, los cinco modelos 3D, la voz de la historia en
  tres idiomas, la música y el video del final). Laberinto a ciegas: el mundo está
  negro y solo se ve por ecolocación, en blanco y negro. Cuatro llaves abren **una puerta de cuatro
  cerraduras**, cerca de la puerta suena una trompeta que llama a la cosa, y al salir hay una cinemática
  y un prado donde despertás. Se parchea con los scripts de `herramientas/eco/`. Pedido textual: *"un entorno 3D
  con las mismas características de primera persona buen movimiento etc y manos en primera
  persona no armas y un menú super simple ... puedes ver tu cuerpo completo pero no ves el
  entorno solo lo ves al caminar porque hacer ruido manda impulsos que hace que puedas ver
  en blanco y negro ondas que remarcan todo el laberinto"*.
- **`Lemi.html` es "LEMI"** (~919 KB, de los cuales el logo generado con Rezona Lab es casi todo; el
  mundo entero es procedural y no tiene un solo asset). El séptimo juego. Isla pixelada de 660 m de
  lado que se dibuja sola con ruido: terreno, mar, bosque, nubes, cuatro sitios —campamento, mojón,
  círculo de piedras y arco de costa— y una **cueva excavada en la propia función de altura**, con su
  ladera detrás. **Sos Lemi**: viniste a acampar con tres amigos a una isla que no está en ningún
  mapa. Está en **inglés, castellano y portugués**, y el idioma se elige antes que nada. Se abre con una
  **cinemática de 38 s en seis tiempos** —llegan al claro, arman las carpas y prenden la fogata, los
  cuatro sentados al atardecer, Lemi que oye un ruido y se para, se van a dormir, y Lemi que se
  despierta solo con un rastro de sangre saliendo del campamento— y de ahí arranca el día. **Cinco misiones en orden**:
  juntar 5 ramas · buscar el inflador en la camioneta y agacharse a inflar la rueda pinchada (**un
  minijuego de siete golpes** con un bloque que se angosta de 22 % a 9 %) · seguir el rastro hasta la
  cueva, que no te deja pasar · armar una antorcha (rama + lona de una carpa + el encendedor del
  auto) · y las llaves, que abren una **cinemática en primera persona**: agarrás la llave con las dos
  manos, levantás la vista y **el camello está mirándote**, con una cara creepy dibujada por código en
  la cara delantera de su cabeza. De ahí en más te persigue sin importar la hora (correr le gana:
  12,8 contra 7,4). El pixelado no es un filtro: la escena se dibuja a media resolución en un render
  target con NEAREST y recién eso se estira. Vive partido en `herramientas/lemi/partes/` y se arma con
  `python3 herramientas/lemi/armar.py`.
- **`Barrio.html` es "BARRIO"** (~1,28 MB, de los cuales el personaje generado y su cara son casi
  todo; **el barrio en sí no tiene un solo asset**: las diez texturas, los sonidos de ambiente y las
  doscientas treinta y cuatro casas se dibujan por código). El octavo juego. Un damero de
  **5 × 5 cuadras** —274 m de lado— a las tres de la mañana y bajo la lluvia, en primera persona y
  sin más objetivo que caminarlo. Calles con línea cortada, veredas con cordón de quince
  centímetros, césped, **234 casas** con su cerca de piquetes, su entrada de auto y alguna ventana encendida,
  **96 faroles** con su cable colgando en catenaria, autos estacionados y árboles. El damero lleva
  además una **vuelta de cuadras de borde** y una arboleda detrás, así que para donde uno mire hay
  vecindario. Las siete texturas del suelo y de las casas están generadas con Higgsfield. Pixelación suave
  —el destino de render va a 1/1,7— y de noche: lo único que ilumina de verdad son los faroles.
  Hay relámpagos con su trueno a destiempo, linterna, y las tres calidades y los tres idiomas en el
  menú. **La cinemática termina en una habitación**: uno se despierta en una cama, y al asomarse a la
  ventana resulta que está en la cima de un edificio con la ciudad lloviendo noventa y seis metros
  abajo; el barrio queda del otro lado de la puerta. Se abre con una **cinemática de 48 segundos en
  cinco planos**: primera persona bajando por la
  calle, corte, y un primer plano de la cara con lente largo y el fondo desenfocado en el que abre los
  ojos y los vuelve a cerrar mientras el cuerpo sigue caminando — **sin bandas negras**, y la cabeza
  está dibujada por código como todo lo demás. Vive partido en `herramientas/barrio/partes/` y se arma
  con `python3 herramientas/barrio/armar.py`. **No reemplaza a `Vecindario.html`**, que es una
  cinemática de 38 segundos sin controles y sigue igual.
- **`Visor3D.html` es "Maicol 3D"** (~3,8 MB, casi todo el GLB en base64): visor del modelo generado
  y riggeado con **Rezona Lab** (proveedor Tripo), con **10 animaciones** de botón. Fuente y cadena
  de armado en `herramientas/visor3d/` (fusionar → gltfpack → hornear → armar).

### Octogésima primera vuelta (2026-09-01): **PUERTA BLANCA**, el noveno juego — el cielo 360 y las flores gigantes del nivel 1

Llegó un HTML de afuera —`bosque3d31verdugo.html`, 422 KB, three.js r128 desde cdnjs y **sin un solo
asset**: sus 31 texturas son lienzos 2D dibujados por código—. Es "PUERTA BLANCA", cinco pisos más un
prólogo, y el pedido fue sobre el **nivel 1, el campo**: *"genera un cielo 360 como textura … también
genera modelos 3D gigantes de flores reales y decora mejor todo ese nivel … cielo celeste con nubes
bien god"*.

Vive en `juegos-pc/Puerta_Blanca.html`, y **es la salida**: la fuente es `herramientas/puerta/base.html`
más `armar.py`, que inyecta los assets y aplica once parches, **cada uno con su ancla y su `assert`**.
Eso no es ceremonia: a mitad de la vuelta un reemplazo mío pisó la línea de un ancla en vez de la del
reemplazo, y lo que evitó escribir un HTML a medias fue justamente que el assert falló en voz alta.

#### EL CIELO: TRES DEFECTOS, Y EL TERCERO ERA DE FÁBRICA

1. **La panorámica volvió 1376×768, o sea 1,792:1.** Una equirectangular mapea 360 grados de ancho
   contra 180 de alto: la relación **tiene** que ser 2:1 o las nubes salen aplastadas. Se reescala en
   el horneado.
2. **Y SU CENIT ERA GRIS** (`0x9aabc3`). Lo que devuelve el generador no es una equirect rigurosa: su
   parte más azul cae a media altura y el borde de arriba es pálido, así que mapeada tal cual, mirar
   hacia arriba devuelve el mismo gris del que uno se quería ir. El horneado le empuja **el azul de la
   propia foto** (`0x00549c`, sacado del percentil 97 de saturación) hacia el cenit, con dos cuidados:
   sube con la elevación —abajo el cielo palidece de verdad— y **no toca las nubes**, detectadas por lo
   que son, claras y poco saturadas. Sin esa máscara los cúmulos se pintan de azul y se pierde lo único
   que hace que el cielo se lea a foto. Cenit medido después: **`0x2fb3ed`**.
3. **EL DOBLE ENCODE DE sRGB, que el juego ya tenía.** En un `ShaderMaterial` propio, `texture2D`
   devuelve el texel **crudo** —three inyecta la conversión sólo en sus materiales— y más abajo el
   `#include <encodings_fragment>` lo codifica a sRGB **otra vez**. Codificado dos veces, todo se va al
   blanco. Medido mirando 43 grados hacia arriba: las bandas daban **(220,223,225)**, gris parejo, con
   un cenit que es celeste. Con `pow(tx, 2.2)` al muestrear pasan a **(199,210,217) · (184,203,216) ·
   (159,192,208)**, con el azul ya por encima del verde y del rojo. El degradado de respaldo tenía el
   mismo defecto y se corrigió igual.

4. **Y ESTABA DADA VUELTA EN VERTICAL, que es lo que el usuario vio: «el cielo está mal ubicado».**
   three sube la textura invertida por omisión (`flipY`), así que la fila 0 de la imagen —que en una
   equirectangular **es el cenit**— termina en `v = 1`, y este shader la busca en `v = 0`. O sea que le
   estaba mostrando el horizonte pálido al cenit y el cenit al ras del suelo. Se veía como dos bandas
   claras, una arriba de todo y otra en el horizonte, con el azul en una franja en el medio. Medido
   barriendo el cabeceo, el azul-rojo **bajaba** al mirar hacia arriba —de 41 cerca del horizonte a 19
   en lo alto— cuando en la propia imagen va de 65,6 a 188,6. Con `flipY = false` pasa a **93 → 123**,
   subiendo con la altura hasta que el borde del cuadro cruza el cenit y empieza a bajar por el otro
   lado, que es lo que tiene que pasar.
   La lección: **medir la imagen no alcanza, hay que medir lo que sale en pantalla.** El horneado estaba
   perfecto —gradiente monótono, costura 0,00— y el cielo igual estaba al revés.

**Y LA FOTO SE MUESTREA POR DIRECCIÓN Y NO POR LA UV DE LA ESFERA.** Así el mapeo no depende de cómo
esté partida la geometría del domo y —lo que importa— se la puede **girar con un uniform** para que su
parte más brillante caiga donde está el sol que tira las sombras: medido, el sol de la foto está en
azimut −0,818 rad y el de la escena en +0,494, o sea 1,312 de giro. Con un sol de cada lado la luz se
contradice y eso se ve. El brillo del sol dibujado se suma **sólo sobre el degradado**: la foto ya trae
el suyo, y dos soles en el mismo cielo se leen a dos soles.

**LAS 16 NUBES-SPRITE SE APAGAN EN EL CAMPO.** Son manchas de un lienzo de 128 px puestas por delante
de una panorámica fotográfica. Y acá hay que anotar un error mío: **las acusé de lavar el cielo y no
eran** — apagándolas con la sonda, el cuadro se movía **una unidad sobre 220**. Se van igual, pero por
lo que cuestan y no por lo que yo creía: **de 134 a 126 llamadas de dibujo**, que es más de lo que
suman las cuatro mallas de flores nuevas.

#### LAS FLORES: `face_limit` ES LA DIFERENCIA ENTRE UNA FLOR Y UNA MANCHA

Cuatro especies reales —girasol, amapola, margarita, tulipán— con `extra:{face_limit:6000}`. Entran
con **5.502 a 5.768 triángulos** en vez del millón que Tripo devuelve por defecto, y eso es lo que
permite que los pétalos finos sobrevivan al decimado.

**EL PUNTO DE DECIMADO SE BUSCÓ MIDIENDO, Y LAS DOS PUNTAS SE DESCARTARON:**

| objetivo | bytes en base64 | qué pasa |
|---|---|---|
| 2.000 tri | 182 KB | **se rompe**: la amapola pierde las hojas de abajo y quedan dos formas rojas flotando |
| **3.200** | **372 KB** | el punto |
| 5.400 tri | 868 KB | **no cambia nada** |

Lo de 5.400 vale anotarlo porque mi hipótesis estaba mal: yo atribuía el grumo del color a la densidad
de vértices, y duplicando el presupuesto **la imagen sale idéntica**. El grumo es de la textura de
origen, que trae manchas verdes en los pétalos del tulipán. 496 KB que no compraban nada.

**Y `COLOR_0` VOLVIÓ EN VEC4 DE BYTES NORMALIZADOS** aunque se escribió como tres floats y se pasó
`-noq`. Es la regla 5 del horneado y esta vez se sabía de antemano: el lector saca el número de
componentes del accesor y la normalización de que el array no sea de floats. Leído como floats sin
normalizar, las cuatro salen blanco puro con motas.

Van **cuatro `InstancedMesh`, una por especie**: veinte flores de cinco a once metros cuestan cuatro
llamadas de dibujo. Con `frustumCulled` apagado, porque el centro de la instancia no es el de la flor.
Y sus obstáculos se vuelven a poner dentro de `applyFlowerDensity`, que **vacía la lista** y la
rellena con las del campo: sin eso, cambiar la calidad en caliente hace que un tallo de once metros
deje de existir para el choque.

#### EL SUELO, Y LA ESCALA QUE SE CUENTA

La foto de pasto se midió con la **autocorrelación horizontal**: el primer mínimo cae en 9 px, o sea
que "brizna + hueco" mide unos 18, y con una brizna real de 8-10 mm los 1024 px cubren **0,46 a 0,57
m**. A escala real serían ~720 repeticiones sobre los 360 m del terreno, y pasados quince metros eso
es ruido sub-texel; quedó en **300 (1,2 m por baldosa) contra las 90 (4 m) del lienzo**, y lo que
sostiene el detalle cerca son las briznas 3D, que son geometría. El tinte se recalculó **en lineal**
(`0xa8bf88 → 0x98aba5`), porque three multiplica `map × vertexColor × material.color` y una foto que ya
trae su verde con el tinte del lienzo encima sale color musgo. Costura: **0,9 veces el salto normal**,
o sea que no hace falta coser — la resuelve `MirroredRepeatWrapping`.

Y la niebla pasa a `0x97bcd9`, que es **el color del horizonte de la propia panorámica**: con la niebla
de otro color aparece una banda a la altura del horizonte.

#### TRES VECES QUE LA MEDICIÓN ME CORRIGIÓ

Vale anotarlas juntas porque son la misma lección: acusé a las nubes-sprite de lavar el cielo (movían
una unidad sobre 220), atribuí el grumo de las flores a la densidad de vértices (duplicarla no cambia
un píxel), y di por gris un cielo que **es azul en las ocho direcciones** —medido, azul-rojo de 93 a
155— cuando lo que veía era **cobertura de nubes**: 24-29 % en los sectores pálidos contra 1-3 % en los
azules. Las tres se veían ciertas mirando la pantalla.

#### MEDIDO AL CERRAR

Los **seis niveles** cargan y se recorren, y volviendo al 1 el cielo sigue puesto. Cielo 1536×768 en
uso con la niebla en `#97bcd9`; suelo 512 con repetición 300; **4 especies y 20 flores gigantes, 63.700
triángulos, cero errores de carga**. Costo contra un control que es `base.html` **con las sondas y nada
más** —hubo que construirlo, porque el juego no exponía ninguna—: **134 → 126 llamadas** en alta y
270.992 → 396.830 triángulos, y ese delta de 125.838 cuadra con las gigantes contadas por su propia
sonda (63.700 × 2 pasadas con la de sombra), que es la comprobación de que los dos números miden lo
mismo. En baja, 50 llamadas en los dos casos. `window.__errs` vacío en las nueve corridas. El HTML pasó
de 422 KB a **1,09 MB**, y esos 670 KB son el cielo (123 en base64), las cuatro flores (372) y el pasto
(152).

**LO QUE QUEDA PENDIENTE, Y ES HONESTO DECIRLO:** las gigantes se plantan con giro al azar, así que
algunas muestran el dorso de la cabeza — un girasol de verdad mira al sol. Se arregla midiendo una vez
hacia dónde mira la cabeza de cada modelo y orientando las instancias, pero es otra vuelta.


### Octogésima vuelta (2026-09-01): **BARRIO** — la cámara de la cinemática se queda fija

Pedido, después de que la vuelta anterior bajara las amplitudes a la mitad y siguiera temblando:
*"arreglá el temblor de la cinemática, que sea fijo pero con movimiento suave"*.

#### LO QUE TEMBLABA NO ERA LA AMPLITUD SINO LA FRECUENCIA

Es el diagnóstico que faltaba, y explica por qué bajar los números a la mitad no había servido de
nada. Lo que quedaba moviendo la cámara era:

- el **cabeceo del paso** (`sy`, `sx`, `rl`, `pt` de `cuerpo()`), que sale de la fase de la caminata:
  a 1,28 m/s con zancada de 0,80 son **1,6 pisadas por segundo**;
- y cinco senos a **1,97 · 1,43 · 1,9 · 1,23 y 1,61 Hz**.

A esa velocidad **cualquier amplitud se lee a temblor, aunque midiera un milímetro**. Un plano de cine
no cabecea con cada pisada. Se van los cinco senos rápidos y el cabeceo del paso entero.

**Y NO SE DEJA QUIETA DEL TODO, porque «fijo» no es «congelado».** Queda una deriva que sale del
**reloj y no del paso**: 0,83 · 0,61 · 0,42 · 0,29 y 0,23 Hz, o sea vueltas de siete a veintisiete
segundos, con amplitudes de un centímetro. Eso es respirar. Y quedan **dos** y no una en cada eje, por
la razón de siempre: un seno solo se repite igual y el ojo lo aprende; dos de frecuencias que no son
múltiplos entre sí, no.

#### Y HUBO QUE ARREGLAR LA MEDICIÓN ANTES QUE LA CÁMARA

El temblor se mide con la **segunda diferencia de la trayectoria** —cuánto cambia el desplazamiento
entre muestra y muestra— sobre el plano A a 20 Hz. Los primeros números salieron así:

    10,000 mm de mediana · 14,142 de rms · 17,321 el peor

y esos tres números son **10·√1, 10·√2 y 10·√3**. O sea que no estaba midiendo la cámara: estaba
midiendo el redondeo. La sonda `cine` devuelve la posición con `toFixed(2)`, y con un paso de
cuantización de un centímetro la segunda diferencia sólo puede valer 0, 10, 14,1 o 17,3 mm. Con cinco
decimales:

| | rms | mediana | el peor |
|---|---|---|---|
| antes | 2,309 mm | 1,065 | 9,003 |
| **ahora** | **0,011 mm** | **0,010** | **0,022** |

**Doscientas diez veces menos.** Es la tercera vez en este proyecto que la medición está mal antes que
el juego, y la firma es siempre la misma: números demasiado redondos.

### Septuagésima novena vuelta (2026-09-01): **BARRIO** — la puerta lleva al cielo, y hay parkour entre nubes

Pedido: *"que sea en primera persona una vez termina la cinemática, pero que sí demos sombra del
personaje real; al pasar la puerta no volvamos al barrio, ya pasemos a un lugar súper raro donde es
puro cielo y de la nada caemos en una nube y vamos viajando entre nubes saltando en parkour y tenemos
gravedad baja; agregá buena movilidad; y generá mejores modelos 3D de props, la wea que generás está
toda corrupta"*.

El cielo vive en `herramientas/barrio/partes/u.js`, que es archivo nuevo.

#### VIVE EN LA MISMA ESCENA QUE EL BARRIO Y QUE EL CUARTO

Por la misma razón que el cuarto: una segunda escena obligaría a duplicar el cielo, las luces, la
lluvia y el post, que son las cuatro cosas que hacen que los tres sitios se vean del mismo juego. Lo
único que los separa es la altura —las nubes viven en y = 400— y una lista que se prende y se apaga.

**Y LA COLISIÓN ES UN DISCO Y NO LA MALLA.** Una nube son ocho o diez esferas achatadas fundidas:
probar contra eso sería un rayo por cuadro contra cuatrocientos triángulos para averiguar algo que un
centro y un radio ya dicen. Además el disco es lo que el jugador **lee**: la silueta de la nube vista
desde arriba.

#### LOS TRES NÚMEROS DEL SALTO SALEN DE LO QUE SE QUIERE, NO AL REVÉS

No se eligen la gravedad y el impulso por separado: se elige **cuánto se sube y cuánto se tarda**, y
de ahí salen los dos. Con 2,6 m de alto y 1,05 s de subida, `g = 2h/t² = 4,72` y `v = 2h/t = 4,95`.
Eso da **2,1 s de aire** —se siente flotar, que es lo que se pidió— y, con la carrera en 3,2 m/s,
**6,7 m de alcance**. Los huecos entre nubes se dibujan por debajo de eso.

La movilidad son otras tres cosas, y ninguna se ve:
- **Control en el aire al 55 %.** En cero, un salto mal apuntado no se corrige y el parkour es
  lotería; en cien, el salto deja de tener peso y da lo mismo desde dónde se salte.
- **Y el roce del aire al 12 %:** lo que hace que un salto largo llegue es que la velocidad que se
  traía no se evapore a mitad de camino.
- **Coyote de 0,12 s y salto guardado de 0,17.** Se puede saltar un pestañeo después de haberse ido
  del borde, y un salto apretado un pestañeo antes de tocar vale igual.

#### EL CAMINO SE JUEGA SOLO, PORQUE UNO GENERADO Y NO JUGADO ES UNO ROTO QUE TODAVÍA NO SE SABE

`nubJuega()` apunta a la nube siguiente, corre y salta **en el labio de la nube en la que está** —
midiendo contra la de destino, el salto sale antes o después según el tamaño de la de enfrente, que
no tiene nada que ver.

Y encontró el defecto: con el hueco creciendo hasta 5,7 m y **la subida sorteada aparte del hueco**,
el auto-jugador se clavaba en la **nube 37 de 42** y no pasaba de ahí en nueve mil cuadros. La causa
es que el salto llega a 2,6 m de alto **y** a 6,7 de largo, pero **no a las dos cosas a la vez**: cada
tanto salían las dos grandes juntas y ese salto no existía. Con el hueco topado en 4,0 y la subida en
1,15 lo termina: **42 de 42 nubes, 41 saltos, 22 cuadros de caída**.

**Y CAERSE NO ES PERDER: SE VUELVE A LA ÚLTIMA NUBE PISADA.** Un parkour en el que un error cuesta el
nivel entero se cierra a los cinco minutos.

**Y LA ÚLTIMA NUBE DEVUELVE AL BARRIO.** Si la puerta lleva al cielo y el cielo no lleva a ninguna
parte, doscientas treinta y cuatro casas y noventa y seis faroles dejan de ser jugables y pasan a
verse sólo en la cinemática. El camino tiene que terminar en algún lado, y terminar donde empezó la
historia es lo único que cierra.

#### TRES COSAS DE LUZ QUE SÓLO APARECEN MIRANDO

1. **EL DOMO DEL CIELO SEGUÍA PUESTO, y no está en la lista del barrio.** `esconde()` lo saltea a
   propósito —de noche el cielo es el cielo en los tres sitios— así que apagar el barrio lo dejaba
   encendido: medido en la captura, **una banda negra cruzando el horizonte** por delante del azul.
   Acá el fondo es un color y no un domo.
2. **EL HEMISFÉRICO CAMBIA DE COLOR Y NO SÓLO DE INTENSIDAD.** El del barrio es azul de noche arriba
   y casi negro abajo. Subiéndole sólo la intensidad, el personaje sigue recibiendo azul oscuro por
   arriba y nada por abajo: contra un cielo casi blanco **los hombros salían negros**. Acá arriba hay
   cielo claro y **abajo también**, porque lo que hay debajo son nubes blancas.
3. **Y LA LUNA PASA A PROYECTAR SOMBRA**, que es lo único que apoya al personaje sobre la nube —el
   pedido decía *«pero que sí demos sombra del personaje real»*—. Con una caja de sombra **chica** que
   sigue al jugador: la resolución del mapa se reparte sobre el área que cubre, y una de trescientos
   metros para una sombra de dos deja el contorno hecho un peine.

#### Y LA PRIMERA PERSONA AL SALIR DE LA CINEMÁTICA

La vista elegida se guarda, así que quien venía jugando al hombro volvía al hombro apenas terminaba la
escena — y la escena es en primera. Se fija dónde empieza; el botón VISTA sigue estando, porque lo que
se pidió es dónde arranca y no qué se puede elegir.

#### LOS MUEBLES ESTABAN CORRUPTOS, Y LA CAUSA ERA EL DECIMADO

*"La wea que generás está toda corrupta"* — tenía razón. La primera tanda venía con **un millón de
triángulos** y bajarla a dos mil es tirar el 99,8 %: el simplificador se come los detalles finos —el
tirador de un cajón, el aro de una pantalla— y lo que queda es una mancha con la textura estirada
encima. La segunda se pidió con **`extra: {face_limit: 6000}`**, o sea con el generador haciendo la
reducción él, que sabe qué es qué, y con `texture_quality: detailed`. Entran con 4.400-5.700
triángulos y bajan a tres mil, que es tirar el 40 % y no el 99,8.

#### MEDIDO AL CERRAR

Cadena completa: cinemática → cuarto **en primera persona** → puerta → cielo → **42 de 42 nubes** →
barrio, y desde ahí 72,3 m caminados con **0 cuadros dentro de una casa**. El cielo cuesta **13
llamadas de dibujo**. `window.__errs` vacío en las once corridas. El HTML pasó de 2,09 a **2,29 MB**.

### Septuagésima octava vuelta (2026-09-01): **BARRIO** — pasos reales en vez de hormigas, y la ciudad del cuarto pasa a ser foto

Pedido: *"tiembla mucho en la cinemática, agregá más suavidad; también al correr más suave y sin
temblar mucho, y que sean pasos reales no hormigas; también que la cabeza se vea por más que me tape
visión, porque así lo veo yo; también los edificios de la ciudad en el departamento y la carretera
deben ser reales"*.

#### «PASOS DE HORMIGA» ERA UNA CADENCIA, Y SE CUENTA

La fase avanzaba π cada **0,82 m** con la velocidad en **3,15 y 6,0 m/s**. O sea **3,8 pasos por
segundo caminando y 7,3 corriendo**: nadie da siete pasos por segundo. Y encima el ciclo sólo barre
0,70 m con el pie, así que los otros doce centímetros de cada paso los hacía **patinando**.

**EL PASO NO SE ESCRIBE EN EL JUEGO: LO TRAE EL CICLO.** Durante el apoyo el pie está clavado en el
piso, así que el cuerpo avanza exactamente lo que el pie barre hacia atrás — ese número se mide al
hornear la tabla y se guarda como `PASO_M`. El juego divide por él, y con eso **el patinaje es cero
por construcción**; con un número a mano al lado de otro medido, los dos se separan el día que se
cambia el ciclo.

De ahí sale la velocidad, y no al revés: `pasos por segundo = velocidad ÷ paso`, y un humano camina a
1,9-2,4 y corre a 3-4.

| | antes | ahora |
|---|---|---|
| caminar | 3,15 m/s ÷ 0,82 = **3,8 pasos/s** | 1,90 ÷ 0,70 = **2,7** |
| correr | 6,00 ÷ 0,82 = **7,3** | 3,20 ÷ 0,77 = **4,1** |

**Y EL CICLO SE ESTIRA HASTA QUE EL PASO MIDA ESO** —amplificando el delta contra el reposo, que para
factor 1 devuelve exactamente lo que entró—. **Pero no se puede estirar mucho:** probado, para llevar
la carrera a 1,15 m hay que amplificar **2,70** y ahí el ciclo deja de ser el mismo movimiento — el
pie sube 71 cm y la cadera baja 75. Con 1,36 y 1,28 el paso llega a 0,70 y 0,77 y la pose aguanta.

**Y EL REBOTE SE TOPA, PORQUE UNA CARRERA TIENE VUELO.** La cadera baja por fase lo que haga falta
para que el pie de apoyo toque; pero en los cuadros en que los **dos** pies están en el aire el cuerpo
se va a buscarlos, y medido eso hundía la cadera **26 cm** — corriendo en cuclillas. El cuerpo nunca
baja más de un palmo por debajo de su punto más alto; en esos cuadros los pies no tocan, que es
justamente lo que hace un vuelo.

#### EL TEMBLOR: LO QUE SE VA ES EL PICO, NO EL RITMO

Corriendo, el ojo subía y bajaba **7 cm** y se corría 5,6 de costado **cuatro veces por segundo**. Un
cabeceo real caminando son dos o tres centímetros. Las cuatro amplitudes bajan a la mitad **y además
pasan por un filtro de primer orden** —el mismo `lerp` con el que ya se suavizaban el alabeo y el
campo—: el seno cambia de golpe en cada apoyo, y lo que se lee a temblor es ese golpe, no la
oscilación.

En la cinemática, lo mismo con un criterio: de los cuatro senos que mueven la cabeza, **los rápidos
—1,97 y 1,43 Hz— son los que se leen a temblor y los lentos son los que dan el aire de que alguien la
está llevando**. Los rápidos se cortan a un tercio y los lentos casi no se tocan.

#### LA CABEZA EN PRIMERA PERSONA: SE IMPLEMENTÓ ENTERA Y NO SE PUEDE

Es la parte que vale anotar, porque el resultado fue **descartarla**. Se hizo la primera persona de
verdad: la cámara en el **globo del ojo** —no en la placa de la cara, que es la superficie: puesto el
lente ahí, la nariz queda encima y no se dibuja nada—, el corrimiento del cuerpo **medido cuadro a
cuadro** sobre el hueso `caraOjos` en vez de una constante, el tronco enderezado con un `sumaH` que
compone sobre lo que la pose dejó, y el plano de recorte a 3,5 cm.

**Y la razón por la que no funciona es una medida del modelo:** lleva **los ojos 21,7 cm por delante
del esternón** (z 0,281 contra 0,064), cuando en una persona son ocho o diez. Con el lente en los
ojos, el pecho queda casi a la espalda del lente: mirando hacia abajo todo lo que entra es **el
agujero del cuello por dentro** y el forro del torso. Fotografiadas las cuatro combinaciones de cabeza
achicada o entera por enderezado sí o no, **las cuatro se ven rotas**.

La conclusión es la de siempre y conviene dejarla escrita: **una cámara metida en la cabeza no puede
ver la cabeza, sólo su interior.** En primera persona la cabeza sigue achicándose a la centésima
parte, y se ve con VISTA, que para eso está.

#### LA CIUDAD Y LA CALLE, DE FOTO

Cuatro imágenes generadas con Rezona Lab —dos fachadas de noche (una torre de oficinas y un bloque de
departamentos), la trama de calles vista desde arriba y una azotea con sus equipos— que pisan a los
lienzos de 128 píxeles con los que la ciudad se venía dibujando.

**EL MAPA EMISIVO NO SE PIDE APARTE: SE DERIVA DE LA MISMA FOTO.** Las ventanas encendidas y los
faroles no se ven tan claros como la luz que les llegue, porque a noventa y seis metros no les llega
ninguna. Tienen que emitir. Y pidiendo una segunda imagen habría ventanas que brillan sin estar
dibujadas: el mapa sale de quedarse con lo que pasa un percentil de luminancia de la propia foto, con
rampa —un corte duro deja las ventanas con el borde dentado—, así que **lo que brilla es exactamente
lo que se ve encendido, por construcción**.

**Y LA ESCALA SE CUENTA, igual que las siete del barrio:** un piso mide unos tres metros y pico, así
que la cantidad de filas de ventanas de la foto dice cuántos metros cubre una copia (29,7 × 40,3 la
de oficinas, 49,4 × 63,8 la de departamentos). Sin eso un edificio de cien metros sale con pisos de
diez.

Más dos cosas de geometría:
- **Retranqueos.** Una torre que es un prisma parejo de cien metros se lee a caja; lo que distingue
  una silueta de ciudad de un gráfico de barras es que el edificio suba, se corte y siga más angosto.
- **Dos familias de fachada y no una.** Con una sola foto repetida en doscientos edificios la ciudad
  se lee a un edificio copiado doscientas veces. Cuesta **una** llamada de dibujo más.

#### MEDIDO AL CERRAR

La zancada, medida en el juego: **de 0,21 m de recorrido de pie a 0,70-0,74**, con la relación
adelante/costado **de 1,1 a 5,8-7,2**. 224 m caminados por dos calles con **0 cuadros dentro de una
casa**; ida y vuelta al cuarto con 4,6 m hasta la ventana y la vista que vuelve sola al salir.
**7 de 7 texturas del barrio y 7 de 7 de la ciudad** decodificadas y puestas con su escala. 174
llamadas de dibujo en el barrio y **81 en el cuarto**. `window.__errs` vacío en las once corridas. El
HTML pasó de 1,90 a **2,09 MB**, y esos 190 KB son las cuatro fotos de la ciudad con sus emisivos.

### Septuagésima séptima vuelta (2026-09-01): **BARRIO** — el muslo giraba en el eje equivocado, y el paso pasa a venir de Tripo

Pedido: *"mejora la animación de caminar está horrible xd ... se ve como tus piernas van de lado a
lado no adelante, agrégale pue con Tripo una animación, ya tenés Rezona; también props como lámparas,
muebles, usa Tripo 3D"*.

#### EL DIAGNÓSTICO ERA LITERAL: EL MUSLO NO SE MOVÍA HACIA ADELANTE

`poseCamina` giraba el muslo en **X**, con el comentario de siempre de que `giraH` pide los ejes en
el marco del personaje. Los ejes de un rig no se deducen: se giran y se mira dónde quedó la punta.
Entró `ejeH(hueso, destino, ax, ay, az)`, que gira un hueso un radián y devuelve el desplazamiento
del **pie** en el marco del personaje —adelante, costado y alto—, y contestó esto:

| hueso | eje | adelante | costado | alto |
|---|---|---|---|---|
| **muslo** | X | 7,0 cm | **8,9 cm** | 0,8 | ← lo que se venía usando |
| | **Y** | **57,3 cm** | 9,3 | 28,2 | ← la flexión de verdad |
| | Z | 20,3 | **54,9** | 25,6 | ← la abducción |
| rodilla | **X** | **34,9** | 2,1 | 14,4 | ← ésa sí estaba bien |
| pie | **X** | **10,1** | 0,2 | 4,6 | ← y ésa también |

O sea que el muslo se movía **más de costado que hacia adelante**, y encima ocho veces menos de lo
que ese hueso podía dar. Medido en el juego, el pie recorría **20,8 cm de adelante contra 18,2 de
costado**: una relación de 1,1. Eso es exactamente «las piernas van de lado a lado».

**Y NO SE ARREGLA CORRIGIENDO `giraH`.** La composición que usa —`bind · (P⁻¹RP)` en vez de
`(P⁻¹RP) · bind`— es la que está calibrada contra TODO lo demás del personaje: los cuatro ángulos del
solver de la mano izquierda, los del brazo derecho con el frasco, la cabeza, el idle. Cambiarla
arregla la pierna y rompe seis cosas medidas. Lo que se cambia es **qué eje se le pide**.

#### Y DE PASO EL CICLO ENTERO PASA A VENIR DE AFUERA

`submit_rig3d_generation` **no puede riggear el personaje que el juego ya tiene**: sólo acepta el
`task_id` de un modelo generado por uno mismo. Así que se genera un peatón cualquiera, se lo riggea
con `preset:walk` y `preset:run`, y **lo que se trae al juego no es la malla sino el movimiento**.

**LOS CANALES NO SE COPIAN, SE PASAN POR EL MUNDO.** Un canal de rotación es local al padre, así que
copiado sobre un hueso que arranca mirando para otro lado deja al personaje doblado en dos — la
lección que en Eco costó una vuelta entera. Y acá hizo falta un paso más que en Eco:

**EL DELTA HAY QUE CONJUGARLO, PORQUE LOS DOS RIGS NO MIRAN PARA EL MISMO LADO.** Medido por el eje
que va de una cadera a la otra, el peatón de Tripo y el personaje del juego están a **97,5 grados**.
Con el retarget de libro —`Rw_src · inv(Rw_reposo_src) · Rw_reposo_dest`— el delta llega girado y la
caminata sale **de costado**: medido, 51 cm de recorrido lateral contra 4,7 de adelante, o sea el
mismo defecto que se estaba arreglando, ahora importado. Lo correcto es `Q · Δ · Q⁻¹` con Δ el delta
contra el reposo y Q el giro entre los dos mundos.

**Y LA CADERA BAJA POR FASE LO QUE HAGA FALTA PARA QUE EL PIE DE APOYO TOQUE.** El clip trae sólo
rotaciones, así que sin esto el cuerpo se queda a altura fija y el pie flota: medido sobre
`preset:run`, el tobillo más bajo del ciclo queda en 17,2 cm contra los 10,3 que mide en reposo, o
sea siete centímetros de aire. Y de paso ese número **es** el rebote de la caminata: sin él el
personaje se desliza a altura constante.

**NO SE GUARDA UN CLIP, SE GUARDA UNA TABLA POR FASE.** El juego ya tiene `AND.fase`, de la que
dependen el sonido de la pisada, el cabeceo de la cámara y el balanceo del cuerpo; un
`AnimationMixer` con su propio reloj se desincronizaría de las tres. Diez huesos —las dos piernas y
la columna— por veinticuatro fases, **16 KB**. Los brazos, la cabeza y las manos **no están en la
tabla**, porque los maneja el juego: la mirada, el idle, la linterna y las pastillas de la
cinemática. Y la tabla viene **girada** para que el pie izquierdo toque el suelo en la fase 0, que es
donde suena el paso.

Medido en el juego, con el mismo gancho antes y después:

| | recorrido del pie adelante | de costado | relación |
|---|---|---|---|
| como estaba | 0,21 m | 0,18 m | **1,1** |
| el muslo en Y | 0,51 | 0,13 | 3,8 |
| **el ciclo de Tripo** | **0,53** | **0,10** | **5,3** |

#### LOS CUATRO MUEBLES

Velador, silla, mesa de luz y cómoda, generados con Tripo para el cuarto — que es el único sitio del
juego que se mira de cerca y con luz, y estaba armado con cajas. Misma cadena que los props de LEMI:
la textura se hornea en los vértices —sin UV no hay costuras y el simplificador baja hasta donde uno
quiera— y se decima con `gltfpack -noq`.

**EL OBJETIVO ES UN NÚMERO DE TRIÁNGULOS Y NO UN RATIO, y eso costó una pasada.** `-si 0.06`
devolvía 59.800 triángulos y parecía que el simplificador estaba trabado, que es justo lo que le pasó
a LEMI con las UV. No lo estaba: hacía exactamente el 6 % que se le pedía, y **la entrada tiene un
millón de triángulos**. Un ratio no dice nada si no se sabe de cuánto se parte. Con el objetivo en
2.000, los cuatro pesan **166 KB en base64**.

**Y UN DEFECTO PROPIO DE `armaProp` QUE NO FALLA NI AVISA:** leía `COLOR_0` como **tres floats sin
normalizar**, que es lo que necesitaba el frasco. gltfpack devuelve estos muebles con el color en
**VEC4 de bytes normalizados** aunque se le pase `-noq`, así que los valores llegaban entre 0 y 255:
en la captura, los cuatro muebles salieron **blanco puro con motas de colores**. El número de
componentes sale del accesor y la marca de normalizado de que el array no sea de floats, igual que en
el personaje.

**LA LUZ DEL VELADOR HUBO QUE VOLVER A SUBIRLA, y es la tercera vez en este cuarto.** Con la lámpara
dibujada a mano la luz iba a 14 cm de la mesa, o sea por debajo del borde del cono; la lámpara
generada mide 42 cm y su pantalla arranca más arriba, así que esos 14 cm caen en el medio del fuste y
la pantalla salía blanca y sin forma. Va a 34.

**Y LOS TRES MUEBLES QUE REEMPLAZAN UNA CAJA VAN EN SU PROPIA MALLA.** El resto del cuarto se funde
en cuatro mallas y una pieza fundida no se puede esconder sola. Cuestan tres llamadas de dibujo más y
son lo que hace que un base64 roto cueste **un mueble y no un cuarto vacío**. La cómoda no tiene caja
de respaldo porque es un mueble nuevo, no el reemplazo de uno que ya estaba — y su caja de colisión
sale de dónde se la puso, no escrita a mano.

#### MEDIDO AL CERRAR

**271,6 m caminados** por dos calles —al hombro y en primera— con **0 cuadros dentro de una casa**.
Ida y vuelta al cuarto: 4,6 m hasta la ventana con el aviso, y la vista vuelve sola al salir. La
cinemática entera, los cuatro planos y el final en el cuarto. 7 de 7 texturas con su escala.
**174 llamadas de dibujo en el barrio** (sin cambio) y **80 en el cuarto contra 52**, con los mismos
14 cuadros por segundo. `window.__errs` vacío en las nueve corridas. El HTML pasó de 1,70 a
**1,90 MB**, y esos 190 KB son los cuatro muebles y el ciclo de paso.

### Septuagésima sexta vuelta (2026-08-31): **BARRIO** — el pasto y la cerca pasan a Rezona, y los metros de la foto por fin llegan al juego

Pedido: *"quiero que generes con Rezona imágenes para las texturas fotorrealistas"* — y antes de eso,
*"por qué esta sesión sí puede"*, con la captura de otra sesión generando un modelo con Rezona.

#### PRIMERO: LA DIFERENCIA ENTRE LAS DOS SESIONES ERA UN LOGIN EN DISCO, Y YO LO HABÍA DICHO MAL

En vueltas anteriores escribí que Rezona estaba bloqueado. **No lo estaba.** Medido hoy: el servidor
levanta con `npx -y rezona@latest mcp` y lista sus herramientas; lo que devolvía era
`Not authenticated. Run npx rezona@latest login`. O sea que no faltaba permiso, faltaba **la
credencial en disco** — que la escribe el login por código de un solo uso, y que por eso no puede
salir del aparato: `~/.rezona/credentials.json`, con `.rezona/` en el `.gitignore`. Este repo es
público, así que **el cliente puede vivir en el repo y la llave no**. El cliente quedó en
`herramientas/rezona/rz.py`, treinta líneas de JSON-RPC por stdio, porque las herramientas
`mcp__rezona__*` no están cargadas en esta sesión y esperar un reinicio no era necesario.

**UN DEFECTO PROPIO DE ESE CLIENTE, Y SILENCIOSO:** las respuestas volvían **desordenadas**, así que
la textura de asfalto llegaba con el `output_path` de la vereda. Se vio porque el nombre del archivo
no cuadraba con lo pedido, no porque fallara nada. Las respuestas de JSON-RPC llevan `id`: hay que
ordenar por ahí y no por el orden en que salen del proceso.

#### LA ELECCIÓN ENTRE LAS DOS TANDAS NO SE HACE MIRANDO LAS IMÁGENES

Es la parte que vale anotar. Generadas las siete con Rezona, las dos tandas se ven bien **en la hoja
de contactos**, y esa hoja miente: en el juego la misma imagen se ve achicada a 384 o 448, a 1/1,7 de
resolución, de noche, con la repetición puesta y con el tinte del material encima. Así que se
hornearon **las dos** —para eso `hornear_tex.py` aprendió a leer de otra carpeta y escribir a otro
archivo— y se fotografiaron **los mismos cuatro encuadres** con las dos, en primera persona y sin HUD.

Gana **Rezona en dos**:

- **pasto** — es la única en la que Rezona conserva más detalle al achicarla (67,9 contra 50,4 de
  desviación local), y en el jardín eso se ve: el césped deja de ser una franja verde plana.
- **madera** — sus tablas son más anchas, así que a 1,12 m **cada piquete de la cerca se lee por
  separado**; con la otra, la cerca de noche es una mancha oscura.

Y **Higgsfield en las otras cinco**, sobre todo en **teja**: la de Rezona es pizarra oscura y de noche
el techo entero desaparece en una silueta negra — medido, 25,0 de detalle contra 48,3, que es
exactamente el defecto que la vuelta anterior había arreglado dando vuelta las caras del techo.

**Y EL ENCUADRE DE PRUEBA SE ELIGIÓ MIDIENDO, no a ojo.** La primera tanda de fotos salió con la
linterna encendida y **no servía**: a dos metros, una luz de intensidad 34 quema la carpintería blanca
a blanco puro y deja el resto en negro, o sea que la textura no se ve ni bien ni mal. Lo que sí
ilumina una superficie sin quemarla es **un farol**, y dónde cae uno es una cuenta: los postes van
sobre la vereda a `CALLE/2 + 0,9` del eje y el brazo lleva la cabeza 1,9 m hacia la calle, así que
sobre la calle `z = −26,5` hay una cabeza de farol en `(0 · −23)`. Los cuatro encuadres se plantaron
alrededor de ése.

#### EL HALLAZGO: `TEX_M` SE VENÍA CALCULANDO Y NO LO LEÍA NADIE

`hornear_tex.py` tiene desde que existe una sección que explica que **se cuentan los metros que cubre
cada foto** —doce hiladas de ladrillo por 7,5 cm son 0,90 m— y escribe esos números en `x.js` como
`TEX_M`. Buscado en las diecinueve partes del juego: **cero usos**. La repetición de cada material la
seguía poniendo `METROS`, que es cuántos metros cubre el **lienzo dibujado por código**, y el
reemplazo de la textura la copiaba tal cual.

No son el mismo número, y no pueden serlo: el dibujo de ladrillo trae treinta y dos hiladas y la foto
doce. Medido, lo que se estaba viendo: **hiladas de 8,3 cm en vez de 7,5, tejas de 26 en vez de 16 y
tablas de revestimiento de 22,8 en vez de 18** — que es literalmente el defecto de «casa de muñecas»
que esa sección del script existe para evitar, escrito en el comentario y no en el código.

El arreglo es una línea: al poner la foto, la repetición se multiplica por `METROS[nom] / TEX_M[nom]`.
Y **tiene que ser un factor y no un reemplazo**, porque el lienzo dibujado sigue existiendo de
respaldo y él sí cubre `METROS`. Medido después: madera ×1,16 · ladrillo ×1,11 · tabla ×1,27 ·
**teja ×1,63**, y asfalto y vereda ×1 —los suyos ya coincidían—, con la repetición de 167,17 del
asfalto conservada.

#### EL TINTE SE RECALCULA CANAL POR CANAL, Y ES LA TERCERA VEZ EN ESTE JUEGO

three.js multiplica `map × vertexColor × material.color`, así que el color del material es un **tinte
sobre la imagen**. El pasto de Rezona tiene más del doble de verde y **la mitad de azul**
(0,105 · 0,226 · 0,039 en lineal contra 0,070 · 0,150 · 0,064): dejando el tinte donde estaba, el
jardín se iba a verde manzana. El tinte nuevo sale de dividir en **lineal** el promedio viejo por el
nuevo — `0x8a9b7e → 0x72809e` el pasto y `0x6d6558 → 0x716b5e` la madera — y el producto queda
idéntico hasta la quinta cifra, que es la prueba de que compensa y no de que quedó lindo.

#### Y DESPUÉS: «SE VE SIN CABEZA», Y NO ERA LA CABEZA

Reporte, con la captura del cuarto: *"se ve sin cabeza we xd"*. Lo que llenaba el cuadro era el
**interior del propio cráneo**, y la causa es la cámara al hombro.

El recorte contra las paredes se marcha ocho pasos hacia atrás y se corta en el último punto libre;
con la pared pegada devolvía distancia **cero**, o sea el lente exactamente en la cabeza — **y en
tercera persona la cabeza se dibuja a tamaño real**, porque la que se achica a la centésima parte es
la de primera. Desde afuera eso no se lee a «la cámara está adentro»: se lee a que al personaje le
falta la cabeza.

**EN EL CUARTO PASABA SIEMPRE, y es una cuenta:** mide 5,2 × 6,8 m y la cámara pide 1,55 m hacia
atrás, así que no hay un solo sitio del cuarto donde entre. **Y EN EL BARRIO TAMBIÉN ERA
ALCANZABLE** — medido barriendo media manzana, en `z = −20,0` y en `z = −17,0`, o sea parado delante
de una casa.

Se arregla con dos cosas y la segunda es la que importa:

- **Un piso: por debajo de 0,62 m el lente está adentro del cuerpo.** La cabeza vive en y = 1,50 y
  mide unos once centímetros de radio.
- **Y por debajo de ese piso la vista PASA A PRIMERA PERSONA ENTERA**, no sólo se acerca: el balanceo,
  la altura del ojo y —sobre todo— la cabeza achicada. Una cámara «al hombro» a veinte centímetros no
  es una cámara al hombro, es estar adentro del muñeco.
- **Y el cuarto va en primera y punto.** No es sólo que no entre: son cuatro metros y medio de
  caminata hasta una ventana, y lo único que esa escena tiene que mostrar es lo que se ve por ella —
  con la cámara detrás, lo que se mira desde la ventana es la propia nuca.
- **Con histéresis** (se apaga en 0,62 y vuelve en 0,85): sin ella, caminando pegado a una cerca la
  vista salta entre primera y tercera varias veces por segundo, y eso se ve peor que cualquiera de las
  dos.

**Y LA DECISIÓN SE TOMA ANTES DEL BALANCEO, no después de colocar la cámara.** El recorte se marchó
arriba de todo justo por eso: de él depende también cuánto balanceo hay y qué escala tiene la cabeza,
así que calcularlo después obligaría a deshacer medio cuadro.

**UN DEFECTO DE LA MEDICIÓN, y del tipo que ya costó vueltas acá:** para comprobarlo usé
`__V.verCara(true)`, que **fuerza el estado contrario antes de medir** —para eso existe— así que
devolvía `escCabeza: 1` siempre y parecía que el arreglo no hacía nada. Lo que no miente es la
distancia entre los huesos `Head` y `head_end`: **0,269 m con la cabeza entera y 0,003 con la cabeza
achicada**. Una sonda que escribe el estado que va a medir no está midiendo el juego.

Medido: en el cuarto `d 0 · fp true · cráneo 0,003`; en la calle abierta `d 1,55 · fp false · cráneo
0,269`; delante de una casa, `d 0 · fp true`. Partida completa de ida y vuelta —135,8 m en el barrio
al hombro, 4,6 m en el cuarto hasta la ventana, y **la cámara al hombro vuelve sola al salir**
(d 1,55) para otros 138,7 m— con **0 cuadros dentro de una casa** y `window.__errs` vacío.

#### MEDIDO AL CERRAR

7 de 7 texturas decodificadas y puestas con su escala. **271,6 m caminados de verdad por dos calles
—una en cada sentido— con 0 cuadros dentro de una casa**. **174 llamadas de dibujo** con 12 cuadras a
la vista, 426 mil triángulos, y los **12 cuadros por segundo son los mismos que antes**: el cuadro lo
manda el relleno y no la textura. `window.__errs` vacío en las seis corridas. El HTML pasó de 1,69 a
**1,70 MB**.

### Septuagésima quinta vuelta (2026-08-31): **BARRIO** — el idle de verdad, y la cámara pasa a ser al hombro

Pedido: *"agrégale animaciones Idle al modelo 3D del personaje y yo quería la cámara al hombro xd no
en tercera persona no tan al hombro que la parte derecha se vea un poco el personaje y así"*.

#### QUIETO NO ES UNA POSE: SON CINCO GESTOS Y UN CAMBIO DE PESO

La pose de quieto era una respiración y nada más, y una respiración sola se lee a maniquí que sube y
baja. Entran **cinco gestos** que salen cada tres a nueve segundos y duran lo que duran de verdad
—encoger los hombros 1,9 s · estirar el cuello 2,4 · mirar alrededor 3,6 · tiritar 1,5 · acomodarse
la mochila 2,8— más un **cambio de peso de una pierna a la otra cada siete a trece segundos**, que es
lo que hace de verdad alguien parado bajo la lluvia.

**EL CAMBIO DE PESO ES EL QUE MÁS SE NOTA Y EL QUE MENOS SE VE VENIR.** No es una animación: es un
escalar entre −1 y 1 que mueve la cadera, las rodillas y los hombros a la vez, interpolado lento. Sin
él, los cinco gestos se leen a tics sobre un cuerpo clavado.

#### `giraH` ESCRIBE EL CUATERNIÓN ENTERO, ASÍ QUE LOS GESTOS SE SUMAN ANTES DE ESCRIBIR

Éste es el defecto que costó la vuelta y es el mismo de siempre con otro disfraz: `giraH` no compone,
**pisa**. Un segundo `giraH` sobre el mismo hueso borra el primero, así que un gesto que toca el cuello
y una respiración que también lo toca no se mezclan: gana el último. Los deltas se suman y se escribe
**una sola vez por hueso**.

**Y `poseCamina` TENÍA QUE APRENDER A DEVOLVER LOS HOMBROS A CERO.** No los escribía —nunca los había
tocado— así que al arrancar a caminar en medio del gesto de encoger los hombros, **quedaban levantados
para siempre**: no hay nada que los baje.

#### LA CÁMARA AL HOMBRO NO ES TERCERA PERSONA CON MENOS DISTANCIA

Se pidió explícitamente *"no tan al hombro"* y *"que la parte derecha se vea un poco el personaje"*, o
sea que el personaje tiene que ocupar **una franja del cuadro y no el medio**. Va a 1,55 m detrás,
0,26 arriba y **0,62 corridos de costado**, y ahí apareció el error de signo: **corriendo la cámara
hacia la derecha, el cuerpo aparece a la IZQUIERDA del cuadro**. Es obvio dicho así y no lo es
mirando el número.

**Y LA ROTACIÓN NO SE TOCA.** Sólo se mueve la posición: girando además la cámara hacia el personaje,
el centro del cuadro deja de ser hacia dónde se camina y apuntar la linterna se vuelve otra cosa. Más
un recorte contra el barrio (`camLibre`, sobre la misma rejilla que usa el choque) para que la cámara
no se meta dentro de una casa ni de una cerca.

**Y HAY QUE TAPARSE LA CABEZA, otra vez.** En tercera persona el modelo se dibuja entero, así que la
cabeza que en primera persona se achica a la centésima parte vuelve a existir — y con ella el defecto
inverso: mirando hacia abajo, **la propia cabeza llenaba el cuadro**. `despejaCabeza()` reasigna a
`Head` los 486 vértices que el hueso `neck` domina por encima de 1,520, que es la línea del cuello
medida sobre este modelo. Achicar `neck` no sirve: colapsa el tapón del cuello, que vive en 1,483.

**Y EL PERSONAJE FLOTABA.** No le faltaba luz: le faltaba **sombra de contacto**. `PJ.malla.castShadow`
estaba apagado desde que el personaje sólo se veía desde adentro. Con la sombra puesta —y con
`shadow.bias −0,002` y `normalBias 0,02`, que es lo que saca el acné sobre el asfalto— se apoya.

### Septuagésima cuarta vuelta (2026-08-31): **BARRIO** — los techos estaban al revés, la cámara en tercera persona, y las siete texturas fotorrealistas

Pedido: *"quiero que agregues a las casas el techo también · me gusta esa cámara detrás del tipo al
estar jugando · quiero que generes con Rezona imágenes para las texturas fotorrealistas"*.

#### LOS TECHOS: EL BOBINADO ESTABA INVERTIDO Y LAS NORMALES SE PROMEDIABAN

«Agregales el techo» era literal: las casas TIENEN techo desde el primer día y no se ve. Medido
sobre la propia lista de caras, no mirando la pantalla:

- **Las dos faldas del gablete daban normal de cara Y = −0,707** —o sea mirando al piso— y las dos
  caras de abajo **Y = +1**. Con `FrontSide`, que es lo que usa todo el barrio, la cara de afuera del
  techo es una cara **trasera** y se descarta: lo que se veía era el interior de la falda de
  enfrente, que es una silueta negra.
- **Y `computeVertexNormals` sobre una geometría INDEXADA promedia** las caras que comparten cada
  vértice. Acá los seis vértices los comparten las faldas, los dos hastiales y el fondo: los dos de
  la cumbrera terminaban con **Y = −0,905**. O sea que aun con el bobinado bien, el sombreado decía
  que la parte de arriba del techo mira al suelo — y con un hemisférico eso es el color de abajo, que
  es casi negro.
- La pirámide del techo a cuatro aguas, lo mismo: cuatro faldas en −0,707 y la punta promediada en
  **Y = −1**.

Se arregla invirtiendo el bobinado y pasando las dos geometrías a **`toNonIndexed()`**, que le da a
cada cara sus tres vértices propios y por lo tanto su normal exacta. Que además es lo que un techo
necesita: aristas duras, no suavizadas.

#### LA CÁMARA EN TERCERA PERSONA

Botón VISTA, tecla **V**, y se guarda.

- **LA ROTACIÓN NO SE TOCA.** La cámara se queda mirando exactamente para donde miraba en primera y
  lo único que cambia es DÓNDE está. Componer un `lookAt` acá sería reabrir la trampa del orden del
  Euler que ya costó una vuelta en la cinemática —cerca de los noventa grados de cabeceo, un grado de
  guiñada se convierte en decenas de alabeo— y además garantiza que **apuntar se sienta igual en las
  dos vistas**, porque la dirección de la mirada es la misma cuenta.
- **De tres cuartos por detrás**, no justo atrás: de frente al eje del cuerpo las piernas se tapan
  entre ellas y la zancada casi no se lee. Es lo mismo que se midió cuando la cinemática tenía su
  plano de seguimiento.
- **No atraviesa paredes.** Se marcha desde la cabeza hacia atrás en ocho pasos y se corta en el
  último punto libre, contra **la misma rejilla de colisiones** que usa el cuerpo: una segunda lista
  de paredes sólo para la cámara se desincroniza el día que se agregue un obstáculo.
- **El cabeceo del paso baja a un tercio.** En primera el balanceo *es* la caminata; en tercera la
  caminata ya se ve en las piernas, y el mismo balanceo aplicado a una cámara a tres metros se lee a
  que tiembla el pulso de quien filma.
- **La luz del cuerpo pasa de alcance 1,6 a 5,0 m**, y es aritmética: el cuerpo pasa de estar a
  treinta centímetros del lente a estar a casi tres metros, y con `decay 1,1` ahí no llegaba nada.
- **Y EL PERSONAJE PROYECTA SOMBRA.** Sin ella se ve flotando sobre el asfalto por más que los pies
  estén exactamente en y = 0: lo que dice que algo toca el piso no es dónde está, es la sombra de
  contacto.

#### LAS SIETE TEXTURAS, FOTORREALISTAS

**Rezona Lab no está conectada en esta sesión** —no hay ninguna herramienta `mcp__rezona__*` y las
credenciales se perdieron con el reinicio del contenedor—, así que van con Higgsfield, que es lo que
generó las siete anteriores: Recraft V4.1 en modo `utility` a 2048 px, pedidas como muestra de
material plana, ortográfica y sin sombras.

- **LA ESCALA SE VUELVE A CONTAR**, porque no es una preferencia sino una propiedad de la imagen.
  Contadas sobre la nueva —con el perfil de bordes y después a ojo sobre el recorte— son **12 hiladas
  de ladrillo, 9 tablas de revestimiento, 5 hiladas de teja y 24 tablas de cerca**: 0,90 · 1,62 ·
  0,80 · 2,16 metros. Con los números viejos la pared salía con hiladas de 8,3 cm en vez de 7,5 y el
  revestimiento con tablas de 23.
- **Y EL TINTE SE RECALCULA.** three.js multiplica `map × vertexColor × material.color`, así que
  cambiar la foto y dejar el tinte corre el color de toda la superficie. Medido el promedio de cada
  textura contra la anterior: asfalto **×0,76** · vereda ×0,91 · pasto ×0,87 · ladrillo ×0,93 ·
  revestimiento ×1,02 · madera **×1,31** · teja **×0,74**. Se compensan las tres que se salen del
  ruido, y la teja importa especialmente porque el techo acaba de dejar de ser negro y no puede
  volver a apagarse. Es la misma cuenta que en el battle royale de Z Force.
- Los tres que se miran de cerca —ladrillo, revestimiento y teja— suben de 384 a **448 px**: el juego
  estira con NEAREST y 384 alcanzaba para un dibujo plano, pero una foto con grano de árido y veta
  pierde justo eso.

#### DOS COSAS QUE SALIERON DE LAS SKILLS NUEVAS, Y LAS DOS MEDIDAS

Llegaron cinco skills de creación de juegos y quedaron en `.claude/skills/`
(`game-asset-pipeline`, `game-character-animation`, `game-physics-rapier`,
`open-world-streaming`, `realtime-rendering-quality`). Contrastadas contra BARRIO, casi todo ya
estaba —color de salida en sRGB, `antialias:false`, destino de render reducido, fundido por cuadra,
`alphaTest` en vez de transparencia, tres calidades, 244 llamadas de dibujo—. Lo que **no** estaba:

- **Los shaders de la habitación se compilaban en el corte de la cinemática.** Medido: el barrio
  corre con **23 programas** y con la habitación en pantalla son **26**. Compilar un shader son
  decenas o cientos de milisegundos en un teléfono, y ese es el peor momento posible. Ahora el cuarto
  se arma durante la barra de carga y se calienta ahí — y `compileAsync` sólo recorre lo **visible**,
  así que hay que encenderlo un instante: apagado, la llamada no compila nada. Tras la carga hay 44
  programas calientes, o sea que de paso se calientan los del barrio.
- **`shadow.normalBias = 0,02`** y el bias a la mitad. Corre el punto de muestreo a lo largo de la
  normal, que es donde el error de profundidad está, así que saca el acné sin despegar la sombra del
  pie del poste.

#### MEDIDO AL CERRAR

**225 metros caminados por tres calles** —89,2 + 92,1 en primera y **43,7 en tercera**— con **0
cuadros dentro de una casa**. Partida completa: cinemática → habitación → se despierta → camina 4,8 m
a la ventana → cruza la puerta → barrio con la niebla de vuelta en 0,0165. La cámara de tercera a 3 m
y recortada contra las paredes. **7 de 7 texturas** decodificadas con su repetición. Los tres idiomas
y las tres calidades en caliente. **0 NaN** y `window.__errs` vacío en las once corridas. El HTML pasó
de 1,39 a **1,69 MB**, y 207 KB de esos son las texturas nuevas.

### Septuagésima tercera vuelta (2026-08-31): **BARRIO** — te despertás en una habitación, y por la ventana estás en la cima de un edificio

Pedido: *"genera que una vez despiertes aparezcas en una habitación con una cama y en la ventana al ir
a ver ves que estás en la cima de un edificio y ciudad lloviendo"*. Todo nuevo en
`herramientas/barrio/partes/p.js`.

#### LA CINEMÁTICA YA NO TERMINA EN LA CALLE

Terminaba con el hombre desmayándose y los ojos cerrándose, y el cuadro siguiente era el barrio de
pie: dos sitios distintos pegados, y el corte se leía a error. Ahora se despierta en el cuarto y el
barrio queda **del otro lado de la puerta**. **Saltear la escena también lleva al cuarto**, a
propósito: si saltear entrara derecho al barrio, el botón estaría cambiando la historia en vez de
ahorrar tiempo.

**ES UN LUGAR Y NO OTRA CINEMÁTICA**, porque el pedido dice «AL IR A VER»: la ventana tiene que
costar caminar hasta ella. Contado con la cámara sobre rieles el jugador no descubre nada —se lo
muestran— y el descubrimiento es todo lo que esta escena tiene: hasta que uno llega a la ventana,
esto es un cuarto cualquiera.

#### EL BARRIO NO SE BORRA, SE APAGA

Las dos cosas viven en la **misma escena** y en las mismas coordenadas de x y de z; lo único que las
separa es la altura —el cuarto está noventa y seis metros arriba— y una lista que se prende y se
apaga. Una segunda escena obligaría a duplicar la lluvia, el cielo, las luces y el post, que son
justamente las cuatro cosas que hacen que los dos sitios se vean del mismo juego.

**Y LA LISTA SALE DE UNA FOTO** de lo que había en la escena al terminar de construir, no de anotar a
mano cuáles son las mallas del barrio: anotarlas garantiza que la próxima que se agregue quede sin
apagar. La foto se saca **antes** de construir el cuarto — al revés, el grupo del cuarto queda dentro
de «lo que es barrio» y `esconde()` lo apaga y lo prende dos veces en la misma pasada, que funciona
sólo por el orden en que están escritas las dos líneas.

#### UNA CORNISA ANGOSTA Y UN PARAPETO BAJO, Y ES UNA CUENTA DE ÁNGULOS

La primera versión tenía cinco metros de azotea y un parapeto de 1,05, y desde la ventana lo único
que se veía mirando hacia abajo era la losa. Con el ojo a 1,66 el parapeto tapa **todo lo que esté
por debajo de los veinte grados** y la losa lo que esté por debajo de los veintisiete: o sea que la
ciudad de abajo **no se ve nunca**, que es exactamente lo que la escena tiene que mostrar. Con 1,6 m
de cornisa y 0,55 de parapeto la vista se abre por debajo de los treinta y tres grados y ahí aparece
el suelo, a unos ciento sesenta metros. Sigue habiendo algo cerca —el borde mojado y el parapeto—
que es lo que da la escala; lo que se fue es lo que tapaba.

#### LA CIUDAD

Doscientas cajas fundidas en dos mallas, con las **UV en metros**: sin eso, un edificio de setenta
metros y uno de veinte comparten la misma grilla estirada y las ventanas del alto miden tres pisos —
es la misma cuenta que en el barrio dejó las hiladas de ladrillo en 5,5 cm y no en 22.

**LAS VENTANAS ENCENDIDAS Y LOS FAROLES DE LA CALLE VAN POR MAPA EMISIVO Y NO POR DIFUSO.** A noventa
y seis metros de altura no les llega una sola luz: en la primera captura el suelo entre los edificios
era una mancha negra sin un punto. Y la fachada y su mapa emisivo salen **del mismo sorteo**,
recorrido en el mismo orden — con dos sorteos habría ventanas que brillan sin estar dibujadas.

**Y NADA ALTO AL LADO.** Un vecino más alto a treinta metros deshace de un cuadro lo único que la
escena tiene que decir. De ciento veinte metros para afuera sí, y una de cada cuatro de las lejanas
es una torre de sesenta a ciento diez: con todas repartidas parejo la ciudad sale como una manta
chata y el horizonte es una línea.

#### CUATRO DEFECTOS DE LUZ, LOS CUATRO MEDIDOS

1. **La luz del velador estaba ADENTRO de la pantalla**, y es la única de las seis que proyecta
   sombra: el cono le tapaba el cuarto entero. Medido, brillo medio del cuadro **3 sobre 255**.
2. **Y estaba en 5,4 de intensidad.** Estas seis luces se crearon con `decay 1,9`, o sea que caen
   casi con el cuadrado —a tres metros, un 5 se convierte en 0,6—. Los faroles del barrio usan 26 a
   cinco metros; un velador a dos tiene que estar en el mismo orden.
3. **La mesa de luz estaba detrás de la cabecera**, así que el respaldo de noventa centímetros se
   interponía entre el velador y el cuarto: la única luz del sitio proyectaba un rectángulo negro de
   punta a punta de la cama. Al costado, la luz sale limpia.
4. **La luz fría de la ciudad estaba a la altura del antepecho**, a sesenta centímetros del alféizar:
   con `decay 1,9` eso multiplica por veinte y el alféizar salía **blanco puro**, la banda más
   brillante del cuadro y delante de la ciudad. Va en el dintel. Y el alféizar dejó de ser
   `C_BLANCO`, que es el de la carpintería de las casas del barrio —que se mira de noche y a diez
   metros— y acá está a medio metro del ojo.

#### DOS COSAS QUE LA LLUVIA TUVO QUE APRENDER

La caída se calcula en **Y absoluto** (`mod(semilla.y − t·v, alto)`), o sea que la nube vive entre 0
y 26 metros: en el cuarto la cámara está a noventa y siete y sin `baseY` no habría una sola gota — y
el defecto no se vería como «falta la lluvia» sino como que la escena está mal iluminada. Y **no
puede llover adentro del cuarto**: las gotas de más allá de las paredes quedan tapadas solas por la
prueba de profundidad, pero las que caen dentro de los cinco por siete metros caen en la cara. Seis
comparaciones en el vertex shader y se apagan.

#### Y DE PASO, UN DEFECTO VIEJO DEL BARRIO

En primera persona la cabeza se achica a la centésima parte, pero **`Head` no domina la cabeza
entera**. Medido girando cada hueso un radián y viendo cuánto se mueven sus propios vértices, `neck`
domina **102 vértices que se desplazan 7,5 cm de promedio y 12,7 el que más** — o sea un pedazo de
cráneo. Mirando treinta grados hacia abajo aparecía la propia nuca llenando el cuadro, **en el barrio
también**, y salta a la vista en la habitación, donde lo primero que uno hace es asomarse a la
ventana.

**No se arregla achicando también `neck`**: el tapón que cierra el agujero que deja la cabeza está
pesado a ese mismo hueso —vive en y = 1,483 del bind— y achicándolo se abre el agujero y lo que se ve
es el forro de la campera desde adentro. Se arregla pasándole a `Head` los **486 vértices de `neck`
que están por encima del tapón**, una vez al cargar y sobre el atributo de pesos: no cuesta un solo
ciclo por cuadro.

#### MEDIDO AL CERRAR

Partida completa desde el menú: cinemática → cuarto → se despierta → camina **4,8 m** hasta la
ventana (y ahí salta el aviso) → cruza la puerta → barrio, con la niebla de vuelta en 0,0165 y las
seis luces otra vez en los faroles. Entrar y salir del cuarto **dos veces seguidas** sin residuo.
Pausa → menú principal desde el cuarto: el barrio vuelve. Los tres idiomas cambian el rótulo en vivo
—y ése era un defecto propio: el rótulo del cuarto lo escribe `entraCuarto` una sola vez y no
`ponCalle`, así que sin engancharlo a `repintaJuego` se quedaba en el idioma anterior—. Las tres
calidades se aplican en caliente. Cuarto: **45-48 llamadas de dibujo y 53,8k triángulos**. Barrio:
241 y 354k, sin cambio. **118,4 m caminados con 0 cuadros dentro de una casa.** 0 NaN y
`window.__errs` vacío en las diez corridas. El HTML pasó de 1,35 a **1,39 MB**, y no entró un solo
asset: la ciudad son cajas y dos lienzos de 128 y 256 píxeles.

### Septuagésima segunda vuelta (2026-08-31): **BARRIO** — los árboles dejan de ser un cono y un icosaedro

Pedido: *"arregla el barrio literalmente agrega mejores árboles esos ya se pasan de low Poly"*.

#### LO QUE DELATA A UN ÁRBOL DE MAQUETA NO ES LA CANTIDAD DE CARAS, ES LA REGULARIDAD

Un cono y un icosaedro tienen las dos la silueta **perfectamente regular**, y de noche —con el
follaje casi negro y sin detalle interior— la silueta es lo único que llega. Subdividir no arregla
eso: un cono de treinta lados sigue teniendo la generatriz recta y sigue leyéndose a gorro de fiesta.

- **El piso de ramas no es un cono.** El anillo de la base alterna radio largo y radio corto y sube
  y baja de altura, así que el contorno queda **dentado** —lo que se ve son puntas de rama— en vez
  de una recta. Cuesta un triángulo por segmento, exactamente lo mismo que el cono.
- **La bola abollada.** Cada vértice se mueve sobre su propio radio. **El desplazamiento sale de la
  DIRECCIÓN del vértice y no de su índice**, porque `IcosahedronGeometry` viene **sin índice**: cada
  cara trae su copia de los tres vértices y, moviendo cada copia por su cuenta, la bola se abre en
  veinte triángulos sueltos. Redondeando la dirección a milésimas, las copias reciben el mismo
  número.
- **Tres variantes de cada una y no una.** Una irregularidad repetida doscientas veces se lee como
  un patrón, que es peor que la esfera regular.
- **Un piso más alto es un piso más claro.** Con todos los pisos del mismo verde la copa vuelve a
  ser **una** silueta y partirla en cuatro no sirvió de nada: lo que separa una masa de otra no es
  el contorno, es que una esté más iluminada que la de abajo. El color ya viaja en los vértices, así
  que cuesta cero.
- **El árbol de hoja ancha del jardín pasa a cinco masas chicas y no tres grandes.** Con tres, cada
  bola mide dos metros y sus facetas medio metro, y a cinco metros de la vereda eso se ve como un
  **repollo**. Y las amplitudes de abolladura son distintas según las caras: la de ochenta necesita
  ±19 % o los pliegues se marcan de más, la de veinte necesita ±27 % o vuelve a ser un icosaedro.

#### DOS COSAS QUE NO SE VEN Y HAY QUE HACER IGUAL

- **La variante de cada pieza sale de la POSICIÓN del árbol, no de `az()`.** Cada tirada nueva del
  azar compartido corre **todo** lo que viene después —dónde cae cada casa, cada farol, cada árbol—
  y el barrio tiene que ser el mismo de siempre. Lo mismo con las geometrías, que se arman al cargar
  el módulo y llevan **su propio generador de tres líneas**.
- **La arboleda del fondo lleva dos pisos y sin tapa de abajo.** A cuarenta metros y detrás de la
  niebla nadie mira por debajo de un árbol, y la tapa es **la mitad** de los triángulos del piso.

#### DÓNDE SE VE CADA COSA, MEDIDO Y NO SUPUESTO

La arboleda de novecientos árboles **no se ve** desde la calle exterior mirando hacia afuera: la
vuelta de cuadras de borde la tapa entera, y por encima de los techos no asoma nada (verificado con
la foto aclarada 2,6 veces). Donde **sí** se ve —y ahí cierra el final del mundo, que es para lo que
está— es por el **corredor de la calle**, a unos cincuenta metros, cerrando la perspectiva.

Medido a 412×892 con SwiftShader, mismo encuadre en las dos versiones: calle larga 238.538 →
**278.838** triángulos, cuadra 366.470 → **415.366**, y los **doce cuadros por segundo son los mismos
en las dos** — el cuadro lo manda el relleno (lluvia, niebla, resolución) y no la geometría.
`window.__errs` vacío y la cinemática de 48 s sigue corriendo entera.

### Septuagésima primera vuelta (2026-08-31): **BARRIO** — los sonidos del hombre, el viento que respira y el pitido del desmayo

Pedido: *"genera sonidos ambientales también sonidos del hombre y todo eso bien cinemático"*.

**LA DIVISIÓN NO ES CAPRICHOSA: LA AMBIENTACIÓN SIGUE SIENDO PROCEDURAL Y EL HOMBRE ES ARCHIVO.** La
lluvia es ruido filtrado — un clip grabado pesa cientos de KB y además se corta cada vez que da la
vuelta, y ese corte se escucha más que la lluvia. Un jadeo, un trago o una arcada son lo contrario:
no salen de filtrar ruido, y duran menos de dos segundos.

**Nueve sonidos del hombre**, generados con `seed_audio` (voz Holden) y horneados a MP3 mono de
16 kHz a 24 kbps: respiración cansada, suspiro, inhalación de miedo, trago, arcada, tos, quejido, el
aire que se le va al golpear el piso, y jadeo. **81 KB de MP3, 109 en base64.** Todos **no verbales a
propósito**: el juego habla en tres idiomas, una frase habría que grabarla tres veces y un suspiro se
entiende igual en los tres — misma decisión que con los ladridos de RECREO.
**El recorte es por extremos y no por ráfaga**, al revés que en RECREO: allá el clip era una
interjección y quedarse con la ráfaga de más energía era correcto; acá un jadeo son varias
respiraciones seguidas **con huecos**, y cortar por ráfagas lo partiría al medio.

**LA AMBIENTACIÓN GANA UNA TERCERA CAPA: EL VIENTO.** La lluvia sola, por bien filtrada que esté, es
**estacionaria** — suena siempre igual y a los veinte segundos el oído deja de escucharla. Lo que la
vuelve un lugar es que respire. Un pasabajos muy grave cuya ganancia y corte se mueven con dos senos
de períodos que no son múltiplos entre sí (17 y 23 s), así que la racha nunca cae dos veces en el
mismo sitio y no se puede aprender.

**Y EL DESMAYO SE OYE ANTES DE VERSE.** El jadeo entra con el desenfoque y el quejido cuando ceden
las rodillas, o sea que el sonido va medio segundo **por delante** de la imagen: es lo que hace que
la caída se sienta venir en vez de sorprender. El latido va de 62 a 110 por minuto y es lo único que
ocupa el lugar de la música en ese plano — **dos golpes y no uno**, porque un corazón hace «tum-TUM»
y con uno solo se lee a bombo, con el segundo a 0,26 s del primero, que es el intervalo real entre el
cierre de las válvulas. Al final entra un pitido que se lleva todo lo demás: la lluvia se agacha 85 %
mientras el tono sube, que es como se apaga el oído.

**LOS VOLÚMENES ESTÁN MEDIDOS, NO ELEGIDOS.** Disparados a 1,0 los clips daban rms de 0,19 a 0,45
contra 0,025 de la cama —diez a dieciocho veces el fondo, que no es una voz en una calle sino una voz
en la cara— y `golpe` y el latido llegaban a **1,00 de pico, o sea recortando**. Bajados, la escala
queda: lluvia 0,021 · voz 0,05-0,08 · el golpe contra el piso **0,19**, que es el sonido más fuerte de
la escena y tiene que serlo. Misma regla que en Eco y en RECREO.
Medido: 9 de 9 clips decodificados con su duración real, y sobre la escena corrida entera el fondo se
queda en 0,021 de rms con los picos de voz en 0,052.

**DE PASO, `herramientas/barrio/prep_banco.py`.** El `prep2.py` del banco reescribe los CDN de
**unpkg** y BARRIO importa three desde **jsDelivr**, así que había que parchearlo a mano — y el
contenedor se reinició **tres veces** en esta sesión, borrando el parche cada vez. El síntoma siempre
era el mismo y desorientaba igual: `window.__V is not defined`, que parece un error del juego y es
del banco. Ahora vive en el repo.

**LO QUE NO PUEDE VERIFICARSE:** no puedo escuchar. Que los nueve suenan y a qué nivel está medido;
si la **voz** es la correcta para un pibe de veinte años —es la misma que hacía de profesor en
RECREO— no lo sé, y si suena mal se cambia el `voice_id` y se rehornea con un comando.

### Septuagésima vuelta (2026-08-31): **BARRIO** — la izquierda agarra la pastilla y se la come, y la derecha no se mueve

Pedido: *"ahora la animación de comer hazlo bien o sea ese se mantiene y con la otra mano en la misma
escena con animaciones de brazo y mano agarra una pastilla y se la come llevando a la boca y volviendo
al estado neutral"*.

La derecha se queda sosteniendo el frasco con la palma arriba —es lo que el jugador ya vino mirando—
y todo el trabajo lo hace la izquierda, **que es como lo hace una persona**: la mano que sostiene el
frasco no es la que se lleva la pastilla.

**LOS DOS DESTINOS DEL BRAZO IZQUIERDO NO ESTÁN ELEGIDOS, SALEN DE UN SOLVER.** Se buscó sobre los
cuatro ángulos de `giraH` el mínimo de la distancia de la yema del índice izquierdo al destino, con
penalización por meter el antebrazo en el torso: primero una rejilla de 4.900 ternas y después
afinado por coordenadas.

| destino | error | |
|---|---|---|
| **toma** — la yema al centro de la palma derecha, donde están las pastillas | **2,1 cm** | cero vértices dentro del torso |
| **boca** — la yema al hueso `caraBoca` | **10,7 cm** | mínimo local; como `LeftIndiceB` es la falange y no la punta, la yema de verdad queda unos 7 cm |

**EL BRAZO IZQUIERDO ENTRA COMO UN SOLO ESCALAR**, `GESTO.izq` de 0 a 2: 0 colgando, 1 sobre la palma
derecha, 2 en la boca. Uno y no dos mezclas separadas porque el recorrido **es una línea** — nunca
hay que estar yendo a la palma y a la boca a la vez. Y los ángulos se mezclan **antes** de aplicarse:
encadenar dos giros moviéndose juntos es exactamente lo que hacía el tirabuzón del brazo derecho.

**LA PASTILLA QUE VIAJA ES UNA CÁPSULA APARTE** colgada del índice izquierdo, no una de las tres del
montón: ésas viven en la mano derecha y tienen que seguir ahí mientras la izquierda se lleva la suya.
Sacarla del montón obligaría a reparentarla en pleno movimiento, y un objeto que cambia de padre a
mitad de camino **salta un cuadro**.

Seis tiempos, cada uno lo que tarda de verdad: viaja a la palma (1,2 s) · cierra los dedos sobre la
pastilla (0,5) · la lleva a la boca (1,3) · cierra los ojos y traga (0,8) · el asco y el sacudón
(1,4) · el brazo vuelve a colgar (1,8). **Los ojos se cierran mientras la mano sube**, o sea que se la
toma sin mirar.

Verificado con catorce cuadros seguidos del plano: se ve la izquierda ir, juntarse con la derecha,
subir a la boca y volver. `window.__errs` vacío.

### Sexagésima novena vuelta (2026-08-31): **BARRIO** — el personaje denso, la cara vuelta a medir y las pastillas en la palma

Pedido: *"fíjate como las pastillas no están bien sobre la palma de la mano"*. Y tenía razón: la mano
era un abanico de cuñas planas con el frasco atravesado.

#### LA MANO NO AGUANTABA UN PRIMER PLANO PORQUE NO HABÍA MANO

**259 vértices para diecinueve centímetros.** Ninguna pose arregla eso, y ya lo había medido en la
vuelta anterior alejando la cámara. El modelo nuevo —la misma imagen de referencia, `target_polycount`
60.000— entra con 60.609 triángulos y se decima a **24.566** (`PJ_RATIO=0.40` contra 0,22). El número
que importa es el de la mano: **1.920 vértices dominados por `RightHand`, 7,4 veces los 259**, en una
caja de 11,1 × 17,0 × 14,8 cm.

#### DOS PARTES DEL PIPELINE NO SOBREVIVIERON AL CAMBIO DE MODELO, Y LAS DOS CALLARON

1. **El detector de dedos contaba vértices en absoluto.** El umbral era `h[i] >= 15` sobre el
   histograma de los nudillos. Con una malla seis veces más densa ese quince lo cruza cualquier grumo:
   daba **seis** dedos, y el sexto se comía el nombre del quinto — dos huesos llamados `Pulgar`, que
   rompe cualquier búsqueda por nombre. El umbral pasa a ir contra el pico más alto de la propia mano,
   que escala solo, y después entra lo único que de verdad se sabe del problema: **una mano tiene cinco
   dedos**. Medido, los cinco que sobreviven caen en los bins 6, 11, 16, 20 y 25 —separados de a
   cinco—, que es la firma de cinco dedos parejos y no de un grumo. Largos 8,1 a 9,1 cm, pulgar 7,2.
2. **Las alturas de la cara eran del modelo viejo.** Éste tiene las facciones cuatro centímetros más
   abajo y la cara treinta milímetros más adelante, así que la ventana de aplanado caía sobre el cráneo
   y el pelo: medido, el vértice que más entraba se hundía **149,5 mm**. Ahora 4,5.

#### LA LUMINANCIA VOLVIÓ A MENTIR, Y ES LA TERCERA VEZ

El perfil de franjas oscuras daba ojos en 1,548 y boca en 1,440. La **regla proyectada** sobre la foto
de la cara pelada —`__V.punto` dibujando alturas encima de la imagen— las pone en **1,510 y 1,435**. La
franja de 1,548 no son los ojos: es el borde del flequillo, que en esta cabeza cae justo encima.

Y la **boca pintada del propio modelo cae en 1,39**, o sea sobre el borde de la mandíbula: eso es un
error del generador y no una boca. La placa va donde va una boca —tres centímetros y medio bajo la
punta de la nariz— y la ventana de repintado se estira hasta 1,36 para tapar la pintada.

Las placas también se miden contra la cara: el frente mide 0,155 m de ancho a la altura de los ojos y
el par de ojos pintado 0,12, así que la de ojos baja de **0,158 a 0,120** y la de boca de 0,100 a
0,062. Con los 0,158 tapaba de oreja a oreja y los ojos salían del tamaño de la cabeza.

#### LAS PASTILLAS: TRES DEFECTOS Y NINGUNO ERA EL QUE PARECÍA

1. **La mano se estaba cerrando** (`puno = 0,22 + 0,40`), o sea que terminaba en un puño con el frasco
   atravesado. Una pastilla no se ve dentro de un puño.
2. **La supinación estaba a un tercio de lo que hacía falta**, y eso se midió. `__V.normal` devuelve
   hacia dónde apunta la palma; barridos nueve ángulos, la componente vertical va −2,6→+0,55 · 0→−0,82
   · +1,4→**+0,24** · +2,6→**+0,93**. Con el 1,40 que había, la palma miraba de costado: apoyarle algo
   era ponerlo en un plano inclinado sesenta grados.
3. **Y la cámara estaba del lado del dorso.** Éste era el defecto de fondo. Estaba puesta «adelante del
   personaje», y adelante del personaje no es donde mira la palma: se veía el dorso y las pastillas
   quedaban tapadas por sus propios dedos. Probé tres supinaciones buscando el ángulo que diera vuelta
   la mano y ninguna sirve, **porque el problema no era la muñeca**. Ahora la cámara se pone sobre la
   **normal de la palma** y la palma da a la lente por construcción, aunque el brazo se mueva.

**LA NORMAL SALE DE TRES HUESOS Y NO DE UN EJE DEL BIND**: muñeca, base del dedo medio y el ancho entre
índice y meñique definen el plano de la palma, así que su normal es correcta en cualquier pose. El
**signo se comprueba y no se deduce** —igual que `DEDO_SIGNO`—: fotografiado en los dos sentidos, con
+1 la cámara se va abajo de la mano, a oscuras.

El punto de apoyo tampoco se escribe: `puntoPalma()` lo saca de la muñeca y del dedo medio. Con la
interpolación a la mitad caía sobre el puño de la campera —**el hueso del dedo medio no está en la base
del dedo sino a media falange**—, así que va a 0,60 para el frasco y 0,80 para las pastillas.

El frasco va **acostado y cruzado** a los dedos: parado no se apoya en nada, se clava, y a lo largo de
los dedos la cámara lo mira por la tapa y de 8,5 cm se ven 3. Las pastillas pasan de dos a tres y ganan
un milímetro de radio: a 38 cm con lente de 30 grados el cuadro mide 20 cm de alto, y con dos de 2,1 cm
había que contarlas con esfuerzo.

#### DOS COSAS DEL BANCO

`prep2.py` reescribía **unpkg** y BARRIO importa three desde **jsDelivr**, así que el módulo nunca
cargaba y todas las sondas contestaban `__V is not defined` — parecía un error del juego y era del
banco. Y `window.__V` se define **después** de la pantalla de idioma: el plan tiene que tocar
`#idioma button[data-lang=es]` antes de medir nada.

#### MEDIDO AL CERRAR

Los tres planos corridos de punta a punta (A primera persona · B la cara y el cabeceo · P la palma),
`window.__errs` vacío. El HTML pasa de 853 KB a **1,89 MB**, y 1,29 de esos son el personaje en base64.
`hornear_pj.py` y `riggear.py` toman el modelo por `PJ_FUENTE`, así que el viejo sigue reproducible.

### Sexagésima octava vuelta (2026-08-31): **BARRIO** — se va el plano de espaldas, y los dedos que ya estaban se riggean

Pedido textual: *"en la Cinemática se ve de espaldas no quiero eso me gustaría que siempre sea de la
cabeza nomás ahí y después miré abajo y después pase a ver su mano con las pastillas riggea la mano y
ajusta bien las pastillas ahí está mal"*.

Se va el plano de seguimiento por detrás. Quedan **tres**: primera persona · la cara · las pastillas. Y
la mano pasa de un hueso a **veintiuno**: los cinco dedos de cada mano, con dos huesos cada uno, sobre
la geometría que ya estaba.

#### EL DETECTOR DE DEDOS QUE NO SIRVE Y EL QUE SÍ

Esto es lo que vale anotar de la vuelta, porque **la primera respuesta fue la equivocada y era mía**:
medí los vértices de la mano buscando huecos en la `x` y concluí que era una manopla sin dedos, y me
puse a agregarle dedos de cero. No hacía falta: los dedos estaban modelados desde el principio.

Tres detectores probados:

- **Huecos en la x: no encuentra nada.** Los dedos están juntos y curvados, así que sus rangos de `x`
  se pisan — medido, en la banda de las puntas no hay un hueco mayor a un centímetro.
- **Componentes conexas: tampoco.** En la malla decimada los dedos quedaron soldados, y en la
  original la malla viene partida en **ciento diecisiete islas sueltas**, que es como la devuelve el
  generador: cada isla es un puñado de triángulos, no un dedo.
- **Lo que sí:** proyectar la banda de las **puntas** sobre su propio **eje principal** en el plano de
  la palma. Ahí aparecen **cuatro picos limpios más el pulgar**, separados un centímetro y ocho:
  `[−0,042 · −0,025 · −0,004 · +0,020 · +0,038]`. Los cortes son los valles.

La medición va sobre la malla **original** —que tiene la resolución para verlo— y los cortes se
aplican sobre la que se publica. Cada dedo se lleva dos huesos: uno en el nudillo y otro a la mitad.

**LOS PESOS VAN CON DOS RAMPAS Y NO CON UN CORTE.** Una a lo largo del dedo, que reparte entre las dos
falanges, y otra en el nudillo, que reparte entre el dedo y la mano: con un corte duro en la base,
doblar el dedo le abre un tajo a la palma.

**Y EL MARCO DEL HUESO SALE DE LA GEOMETRÍA.** El hueso se crea con su **+Y a lo largo del dedo
medido** y su **+X sobre el eje de los nudillos**, así que doblar un dedo pasa a ser un número —girar
sobre su propio X— en vez de tres. Para eso hizo falta un constructor nuevo, `nuevo_hueso_rot`: el que
había deja el bind sin rotación, o sea alineado con los ejes del mundo, y ahí «doblar el dedo» no es
ninguno de los tres ejes.

**EL SIGNO SE COMPRUEBA, NO SE DEDUCE.** Fotografiado en los dos sentidos: con `+1` los dedos se abren
hacia atrás —una mano rota— y con `−1` se cierran sobre la palma. Y la pose de reposo de esta malla
**ya es un puño flojo**, así que el recorrido útil va de ahí a cerrado y no de abierto a cerrado.

Medido, cuánto se mueve cada dedo al cerrar el puño: **índice 31 mm de promedio · meñique 36 · medio
24 · pulgar 20**. Un hueso mal pesado gira igual y no desplaza un solo vértice, así que ese número es
la única prueba de que el rig hace algo.

#### LAS PASTILLAS CUELGAN DEL DEDO Y NO DEL FRASCO

Colgadas del frasco quedaban flotando al costado del puño, sin tocar nada — y una pastilla que flota
no se lee a pastilla que alguien tiene, se lee a error. Ahora cuelgan de la **falange de arriba del
índice**, o sea que están apoyadas en algo y ese algo se mueve cuando el dedo se mueve. Y el punto se
dice en el MUNDO —«hacia la cámara» y «hacia arriba»— y se lo trae al espacio del dedo, por lo mismo
que el frasco: los ejes locales de un hueso son los que dejó el bind y no significan nada.

#### EL PLANO DE ESPALDAS SE VA, Y LO QUE LO REEMPLAZA ES UN MOVIMIENTO

No hay plano nuevo: la cara se queda los doce segundos y **el final del plano es que baja la vista**.
No es un fundido: la cabeza y los ojos se van hacia abajo —con el cuadro `abajo` del atlas, que para
esto está— y recién ahí se corta a lo que está mirando. Sin ese movimiento, el corte a la mano no
tiene causa, y un corte sin causa se lee a que faltó un plano.

**Y LA BAJADA ES DE TREINTA Y CUATRO CENTÉSIMAS Y NO DE SESENTA.** Con sesenta la cabeza se va tanto
que lo que se ve es la coronilla, y eso no es bajar la vista: es agachar la cabeza.

De paso, el relámpago vuelve al plano A —donde estaba pensado, con la cámara mirando al frente y las
casas de los dos lados— porque con el plano de seguimiento afuera había quedado cayendo en medio del
primer plano de la cara.

#### MEDIDO AL CERRAR

**48 huesos · 9.221 triángulos** — los mismos triángulos que antes: los dedos no agregaron geometría,
sólo huesos y pesos sobre la que ya estaba. Los cinco dedos de la derecha, medidos girándolos y
comparando dónde quedaron sus propios vértices: **índice 31,2 mm de desplazamiento medio · meñique
36,3 · medio 23,6 · pulgar 19,9**. Los tres planos fotografiados instante por instante: la primera
persona, la cara pasando de `cansado` a `triste` y de ahí a `abajo`, y el frasco entrando fuera de
foco y resolviéndose con las dos pastillas apoyadas en el índice — **del 36,6 al 41,3 % del alto del
cuadro, visible y delante de la cámara**. Al terminar, el juego arranca en `juego` con el HUD **sin un
solo solapamiento**, y desde ahí se caminan **99,4 m con 0 cuadros dentro de una casa**. **254 llamadas
de dibujo**. **0 NaN** y `window.__errs` vacío en las nueve corridas. El HTML pasó de 829 a **837 KB**.

#### Y DESPUÉS: LA MANO NO SE PUEDE FILMAR DE CERCA, Y ESO SE MIDIÓ

Pedido: *"está mal hecho se ve horrible y si mejor lo muestras como lo sostiene en su palma?"*, y
después *"si generas un modelo 3D con highsfield ya igualito a ese pero a este si le haces cada parte
del cuerpo para animaciones complejas"*.

**LO SEGUNDO NO SE PUEDE PEDIR, Y ESTÁ MEDIDO.** Volví a generar el mismo personaje desde la misma
imagen de referencia, con `enable_rigging`, en pose de A y a 60.000 triángulos. Volvió con **56.959
vértices, 60.265 triángulos, una animación de 72 canales… y 24 huesos: exactamente la misma lista que
la primera vez, sin un solo dedo.** El riggeador de Meshy arma un esqueleto humanoide fijo con una
articulación por mano, y en sus parámetros no hay ninguno para pedir más: sólo `enable_rigging`, la
altura y el clip. Generar otra vez no cambia eso — es una propiedad del riggeador, no de cómo se lo
pida. (Por eso los dedos hubo que detectarlos y riggearlos a mano, que es lo que hace la vuelta.)

**Y LO PRIMERO TAMPOCO ERA LA POSE.** Probé seis supinaciones de muñeca y tres cierres de puño —nueve
combinaciones fotografiadas— y las nueve se ven rotas. La causa no es cómo está la mano: **la mano
decimada tiene 259 vértices para diecinueve centímetros**, así que a treinta y seis centímetros del
lente lo que hay son facetas planas, y ninguna pose arregla eso.

Lo que sí lo arregla es **no filmarla de cerca**: a 62 cm el low poly vuelve a leerse a estilo y el
héroe del plano pasa a ser el frasco, que es lo que el plano tiene que mostrar.

**LO QUE QUEDA PENDIENTE, Y ES HONESTO DECIRLO:** el arreglo de fondo es cambiar el personaje por el
de 60k que se generó en esta vuelta —con esa densidad la mano aguanta un primer plano— pero eso obliga
a volver a medir todo lo que está calibrado sobre el modelo actual: las alturas de los ojos y de la
boca, el aplanado de la cara, el tapón del cuello, la mochila y los ángulos del brazo. Es una vuelta
entera, no un reemplazo de archivo.

### Sexagésima séptima vuelta (2026-08-31): **BARRIO** — la cinemática pasa a cuatro planos, y hay un frasco

Pedido textual: *"puedes hacer más realista todo y tiene que ser un momento melancólico haz que el
tipo literalmente esté caminando y después agrega otra vista de cámara desenfocada que después se
enfoca en algo que el tiene en la mano que son unas pastillas hace el frasco generalo"*.

De dos planos a **cuatro**, de 27 segundos a **32,4**: A primera persona · **S el plano que lo sigue**
· B la cara · **P las pastillas**. Y un frasco de remedios generado con Higgsfield (imagen → 3D),
horneado a color por vértice y decimado a **1.935 triángulos**.

#### «LITERALMENTE CAMINANDO» ES UN PLANO NUEVO, NO UN AJUSTE

En primera persona la caminata se **deduce** del cabeceo, y en el primer plano de la cara ni eso: del
cuello para abajo no se ve nada. Así que la palabra «caminando» no se podía comprobar mirando en
ninguno de los dos planos que había. El plano S lo sigue desde atrás y de costado, con la cámara
enganchada al cuerpo y acercándose de 4,35 a 2,95 metros: ahí están la mochila, los brazos, las
piernas y la zancada.

**VA DE TRES CUARTOS POR DETRÁS Y NO DE FRENTE**, y no es gusto: de frente las piernas se tapan entre
ellas y el paso casi no se lee; de tres cuartos la zancada se abre en el cuadro.

**Y LA CÁMARA CAMINA CON ÉL, no lo persigue.** Enganchada al cuerpo con un desfase fijo, lo que se
mueve en el cuadro es la calle pasando; persiguiéndolo, lo que se ve es alguien que se escapa. El
acercamiento es de la distancia y no del zoom, y el temblor son tres senos que no son múltiplos entre
sí más un resto del propio paso — quien filma también camina.

#### EL PLANO DE LAS PASTILLAS: EL FOCO SE HACE, NO APARECE

Hacía falta un uniforme nuevo. El post ya tenía `dof` —el desenfoque del **fondo**— y con eso solo el
sujeto nace nítido, que es exactamente lo que un rack focus NO hace. `dofS` desenfoca la capa del
sujeto y **se mezcla por su alfa desenfocado**, así que la silueta se ablanda sola: un objeto fuera de
foco no tiene borde. El foco se hace en 2,6 segundos y **arranca recién en el 1,2** — un plano que ya
está enfocándose desde el primer cuadro no se lee a plano nuevo, se lee a error del anterior.

**Y SIGUE CAMINANDO.** `GESTO.mano` mezcla el brazo derecho sobre el ciclo de la caminata en vez de
reemplazarlo, así que las piernas no se enteran: lo que se ve es alguien que camina mirándose la mano.
El brazo mezcla desde **lo que la pose dejó** (`POSE.bdX/bdZ/bdA`) y no desde una copia de la fórmula
del vaivén: dos sitios que describen el mismo movimiento terminan siempre desincronizados.

#### CUATRO DEFECTOS DE ESE PLANO, Y LOS CUATRO SE MIDIERON

1. **LA Y HACÍA FALTA Y NO ESTABA.** Con giros en X y en Z el brazo baja y se adelanta pero **no
   cruza**: barridas dieciocho combinaciones, la mano no bajó de **cuarenta centímetros de costado**.
   Lo que la trae al eje del cuerpo es el giro alrededor de la vertical, y el signo importa — con la Y
   negativa la mano se va **para atrás** (medido, `adelante −0,25`). Quedó en
   `[-0,55 · 1,55 · 0,70 · -1,95]`: mano a **1,28 de alto, 36 cm adelante y 13 de costado**.
2. **EL FRASCO ESTABA ADENTRO DEL PUÑO.** Puesto con un desplazamiento en los ejes del hueso de la
   mano —que son los que dejó el bind, o sea nada— lo único que asomaba era una astilla naranja, y
   desde la foto eso se ve igual que un frasco que no se dibuja. La sonda decía `vis: true`,
   `delante: true`, **30,9 % del alto**: los tres ciertos. Lo que pasaba es que **el hueso está en la
   muñeca y los dedos llegan quince centímetros más allá**. Ahora el punto se calcula en el MUNDO
   —«delante» es la dirección en la que camina— y se lo trae al espacio del padre, que es exacto y se
   corrige solo cuando la mano gira. Sigue colgado del hueso, así que no hay dos cuentas.
3. **LA LUZ QUEMABA LA MANO.** Una luz puntual cae con el cuadrado de la distancia: la misma
   intensidad que modela una cara a dos metros deja un antebrazo a ochenta centímetros **blanco puro**
   —medido en la captura, tapaba el frasco entero—. Y el frasco es plástico brillante con una etiqueta
   casi blanca, así que además hubo que bajar el especular.
4. **Y EL FONDO DEL PLANO ERA SU PROPIA CARA.** A la altura de la mano, detrás queda su cabeza; y como
   el cuerpo entero va en la capa nítida, la cara salía **enfocada** y se llevaba la atención del
   plano. Bajando la vista treinta grados, detrás de la mano queda el asfalto mojado —capa 0, o sea
   desenfocado— y lo único resuelto del cuadro es lo que tiene en la mano.

Y las dos pastillas —que van por código, porque una pastilla es una cápsula de doce milímetros y
generar un modelo para eso sería bajar cincuenta kilobytes para dibujar un poroto— estaban **del lado
equivocado**: puestas en el +Z local del grupo quedaban detrás del frasco, porque ese eje apunta al
revés que la cámara del plano. Y sueltas debajo del puño **flotaban**: una pastilla que flota no se lee
a pastilla que alguien tiene, se lee a error.

#### MELANCÓLICO NO ES UNA CARA TRISTE PUESTA TODO EL PLANO

Con `neutro` desde el primer cuadro, los ojos grandes y redondos del atlas se leen a **sorpresa**, que
es lo contrario del plano. El arco es: entra pesado (`cansado`), después mira alrededor —y ahí es
donde las miradas diagonales de la segunda hoja tienen algo que hacer— y recién al final se le cae la
cara (`triste`). En el plano S mira al piso, que es lo que hace alguien caminando solo a las tres de
la mañana.

#### EL FRASCO

Generado con `image_to_3d` sobre una foto de producto también generada. **La misma cadena que el
personaje** —hornear la textura en los vértices, decimar sin UV, base64— y por eso `hornear_frasco.py`
importa `color_en_vertices` en vez de copiarla: dos horneados que hacen lo mismo terminan divergiendo
justo en el sitio donde hay que corregir un defecto.

Dos cosas propias: **se escala a tamaño de frasco** (el generador devuelve la malla en una caja de
lado 2, o sea dos metros: un tacho) y **se para**, midiéndole la caja y llevando su eje más largo a
+Y con la base en el origen. 8,5 cm de alto, 1.935 triángulos, 77 KB en base64.

#### MEDIDO AL CERRAR

Los cuatro planos fotografiados instante por instante: la primera persona bajando por la calle, **el
plano que lo sigue con el cuerpo entero caminando**, la cara pasando de `cansado` a las miradas y a
`triste`, y el frasco entrando fuera de foco y resolviéndose. El frasco medido en pantalla: **visible,
delante de la cámara y del 38 al 41 % del alto del cuadro**, con las dos pastillas al lado. La mano en
la pose de sostener: **1,279 de alto contra un pecho a 1,200 · 36 cm adelante · 13 de costado**.
Al terminar, el juego arranca en `juego` con el HUD **sin un solo solapamiento**, y desde ahí se
caminan dos calles enteras: **109,3 y 109,3 m con 0 cuadros dentro de una casa**. **254 llamadas de
dibujo** con 16 cuadras a la vista. **0 NaN** y `window.__errs` vacío en las once corridas. El HTML
pasó de 732 a **829 KB**, y esos 77 son el frasco.

### Sexagésima sexta vuelta (2026-08-31): **BARRIO** — la cara se dibuja, y treinta y dos sprites en una carpeta

Pedido textual: *"buena pero los ojos no deben ser ahí ni redondos, detecta bien los ojos y dibuja le
textura o incluso podés generar como ojos dibujados y hacer la cara plana o almenos los ojos y las cejas
y boca plana y ahí metes las texturas y vas cambiando eso es más profesional y generas totalmente todos
los Sprites de movimiento de boca ojos y expresiones etc y lo guardas en una carpeta para poder realizar
cualquier animación de cara"*.

Se van los seis huesos de ojo y de párpado de la vuelta anterior y entran **dos placas con textura**:
una de ojos y cejas y otra de boca, cada una con un **atlas de dieciséis cuadros** generado con
Higgsfield, recortado y registrado por `herramientas/barrio/hornear_cara.py`. Los **treinta y dos
sprites sueltos** quedan en `assets/barrio/cara/` con su `cara.json`, que es literalmente lo que se
pidió: con esa carpeta se arma cualquier animación de cara sin volver a generar nada.

#### POR QUÉ ESTO ES MEJOR Y NO SÓLO DISTINTO

En una cabeza low poly **sin cuenca excavada**, un globo ocular o queda enterrado —medido la vuelta
pasada, veintidós milímetros adentro del cráneo— o queda saltado, y no hay punto medio. Y aunque
quedara bien, seis huesos de párpado dan **una** forma de ojo. Un atlas da dieciséis y se le agregan
más sin tocar el modelo ni el esqueleto. Cambiar de expresión pasa a costar **dos números**: el
desplazamiento del atlas.

#### LAS ALTURAS DE LA CARA NO SE DEDUCEN DE LA LUMINANCIA, Y ESO COSTÓ LA VUELTA

Para poner una placa hay que saber dónde están los ojos del modelo. Lo hice contando **vértices
oscuros por franja de altura**, que parece la medición obvia y es la equivocada: en esta cabeza el
pelo, la ceja pintada y la cuenca son todos oscuros y caen en franjas pegadas. El resultado —ojos en
1,618 y boca en 1,534— salió con los **ojos dieciocho milímetros arriba** y, sobre todo, con la
**boca sesenta y seis milímetros arriba**: el dibujo de la boca aparecía a la altura del puente de la
nariz, o sea pegado debajo de los ojos.

Lo que no se puede confundir es **una regla proyectada sobre la foto de la cara pelada**. Entró
`__V.punto(x,y,z)`, que lleva un punto escrito en el espacio del modelo —el mismo en el que están
escritas las medidas de `riggear.py`— a fracciones de pantalla; se apagan las dos placas, se
fotografía la cabeza y se dibujan las líneas encima. Ahí no hay nada que interpretar: los ojos del
modelo caen en **1,585–1,615**, el flequillo baja hasta **1,62**, la punta de la nariz está en
**1,510** y la línea de la boca en **1,468**. Quedaron en 1,589 y 1,480.

#### LA CARA SE APLANA, Y ES LA MITAD DEL PEDIDO

No es una preferencia de estilo. El **arco superciliar** de este modelo sobresale hasta z = 0,175 y
la placa vive en 0,166: sin aplanar, la ceja de bulto **atraviesa el dibujo** y lo que se ve son dos
barras de piel cruzando los ojos por la mitad. Se lleva a un casquete suave —plano, pero no un plano:
una cara perfectamente plana se lee a máscara— y **sólo hacia atrás**, con un mínimo, así que nada de
lo que ya estaba adentro se mueve.

**Y LA NORMAL TAMBIÉN.** Aplanando sólo la posición, la ceja ya no sobresale pero **sigue sombreada
como si sobresaliera**, y en una cara eso se ve igual. La normal sale de la pendiente del propio
casquete: `(2c·x, 0, 1)`.

Tres cosas del aplanado que salieron de medir y no de mirar:

- **La nariz queda afuera de la ventana.** La primera versión cortaba en 1,508 y la punta está en
  1,510: medido, **cuarenta y tres milímetros de nariz** metidos para adentro.
- **El pelo tampoco se aplana, y por eso el orden importa.** El flequillo baja hasta 1,654 con
  z = 0,190, o sea cuarenta y tres milímetros por delante del casquete, y aplanarlo se lo mete adentro
  de la frente. **Después** de repintar la cara, lo único que sigue oscuro en esa franja *es* el pelo,
  así que la luminancia alcanza para distinguirlo — antes no, porque la ceja pintada era igual de
  oscura.
- **La boca se aplana más hondo que los ojos** (0,140 contra 0,147). Entre el labio y la barbilla la
  cara llega a z = 0,160 y la placa vivía en 0,160 con las esquinas arqueadas en 0,144, o sea
  **detrás** de la cara.

#### EL REPINTADO ESTABA CORTANDO EN EL SITIO EQUIVOCADO

Los ojos y las cejas del modelo están **pintados en la textura**, así que dejándolos cada expresión
sale con un segundo par de ojos debajo. El corte de luminancia estaba en 0,055 y **la cuenca pintada
llega a 0,30**: medido franja por franja, en la banda de los ojos la piel da 0,63 y lo pintado va de
0,004 a 0,30 — o sea que hay un hueco enorme entre las dos cosas y el corte estaba metido adentro de
lo pintado. Con 0,055 quedaban dos ojeras puestas debajo del dibujo.

#### LAS SEIS FOTOS SALÍAN IDÉNTICAS, Y NO ERA DEL DIBUJO

El defecto más caro de la vuelta, y la parte que vale anotar es **cómo se encontró**. Fotografiando
seis expresiones, las seis salían pixel por pixel iguales y la boca no aparecía nunca. Descarté
oclusión midiendo: con `depthTest` apagado la imagen **no cambia en un solo píxel**, así que la
barbilla no estaba tapando nada. Descarté la textura: `diagCara()` decía que los dos atlas estaban
decodificados, que el material era el mismo objeto y que la matriz de la textura llevaba el
desplazamiento puesto — pero **el desplazamiento que llevaba no era el que la sonda había pedido**.

Ahí quedó claro: la sonda escribía la expresión y **el cuadro siguiente la cinemática la pisaba**,
porque el plano B maneja la cara entera —apertura, mirada, cansancio y mandíbula— en cada vuelta del
bucle. Con `CONGELADO` la simulación no avanza, pero el bucle sigue dibujando y sigue llamando a
`pon(t)`.

La solución no es un atajo de sonda: es que **la cara tenga dueño**. `GESTO.libre` dice que alguien
más la está manejando, y mientras esté puesto la cinemática no la escribe. Es lo mismo que ya hizo
falta con `FUEGO_ON` contra el parpadeo de la fogata en LEMI, con la agachada de la música en LEMI y
con la mezcla de animación durante el grito de RECREO: **una línea que corre todos los cuadros gana
siempre contra una que corre una vez.**

Y de paso: la sonda pasó a empujar `GESTO` y no `ponOjos()` directo. Una sonda que escribe el estado
por un camino que el juego no usa no está midiendo el juego.

#### EL HORNEADO: TRES COSAS QUE HAY QUE HACER BIEN

1. **El fondo se saca por relleno desde el borde y no por umbral de brillo.** El blanco de afuera y el
   blanco de **adentro del ojo** son el mismo blanco: con un umbral se va la esclerótica junto con el
   fondo y quedan dos anillos huecos. Y lo que no se alcanza desde el borde queda **opaco del todo**;
   mezclando el alfa con la luminancia, el blanco del ojo quedaba al 55 % y sobre la piel se veía
   beige — o sea un ojo sin esclerótica. El suavizado del contorno se hace después, difuminando la
   máscara un píxel, que es donde hace falta y en ningún otro sitio.
2. **Cada cuadro se registra, y es lo único que separa un atlas de una hoja de dibujos.** Los dieciséis
   pares no están en el mismo sitio ni miden lo mismo —medido, el centro se corre treinta píxeles de
   columna a columna— y un parpadeo con los ojos corridos tres milímetros se ve como un tic. **La
   escala es la misma para los dieciséis**: escalando cada cuadro a su propia caja, una boca cerrada
   —que es una raya— se agranda hasta el ancho de una boca abierta y al hablar la cara late. Lo único
   que se corrige por cuadro es el centro. Y en los ojos la caja de registro **excluye las cejas**,
   que suben y bajan a propósito: se busca el hueco vertical más grande de la tinta y se registra por
   lo de abajo.
3. **La grilla se mide, no se supone.** El generador no deja las celdas donde uno se las imagina: acá
   el paso es de 481 píxeles y no de 512, y cortando de a 512 el último cuadro sale partido al medio.

Los dos atlas van **cuantizados a 32 colores** (`FASTOCTREE`, que `MEDIANCUT` no acepta RGBA) y
achicados a 448×336 y 384×336: en el primer plano la cabeza mide unos ciento cincuenta píxeles de alto,
así que un cuadro de 112 alcanza y sobra, y el dibujo tiene tres colores. **67 KB los dos.** Los
sprites sueltos de la carpeta se quedan grandes, que para eso están.

#### DOS DETALLES DE LA PLACA

- **Va con `alphaTest` y no con transparencia.** Un material transparente no escribe profundidad, así
  que la placa de la boca y la de los ojos se dibujarían en el orden equivocado contra la nariz. Es la
  misma corrección que las cercas de piquetes.
- **Y sin mipmaps.** Un atlas con mipmaps mezcla el cuadro de al lado en cuanto la cara se aleja, y en
  una cara eso es un ojo con la ceja de otra expresión encima.
- **El ancho es lo único que se elige; el alto sale de la celda.** Los atlas tienen celdas de 112×84 y
  de 96×84: una placa con otra proporción estira el dibujo, y un ojo estirado no se lee a estilo sino
  a error. La cara mide 0,18 de oreja a oreja a la altura de los ojos y la tinta ocupa el 78,6 % de la
  celda, así que 0,158 deja el par de ojos en 0,124 — dos tercios de la cara.
- **La mandíbula sigue siendo un hueso.** El sprite dice qué forma tiene la boca y el hueso le da el
  movimiento del mentón: con sólo el sprite, hablar se ve como una calcomanía que cambia; con sólo el
  hueso, como alguien que abre la boca sin labios.

#### MEDIDO AL CERRAR

**28 huesos · 4.916 vértices · 9.221 triángulos** — exactamente los mismos que antes de esta vuelta:
las dos placas son sesenta y cuatro triángulos y la geometría de los ojos y los párpados que se fueron
los devolvió. Las **seis expresiones
fotografiadas y distintas** (neutro · sonrisa · cerrado · sorpresa · enojo · feliz), con el cuadro del
atlas verificado por nombre en cada una. La cinemática, corrida de punta a punta: la cara pasa de
`cerrado` a `der` a `cansado` y de vuelta a `cerrado`, y la boca de `cerrada` a `entreabierta`, con la
mandíbula acompañando (0 → 0,095 rad). Cara aplanada: **210 vértices, el que más entró 16,7 mm**;
cara limpiada: **123 vértices repintados**. Caminata de verdad por tres calles —una de adentro en cada sentido y la
del borde—: **109,3 · 136,3 · 109,3 m y 0 cuadros dentro de una casa**. HUD sin un solo solapamiento. **254 llamadas de dibujo** con 16
cuadras a la vista. **0 NaN** y `window.__errs` vacío en las catorce corridas. El HTML pasó de 618 a
**660 KB**, y esos 42 son los dos atlas en base64.

#### Y DESPUÉS, EL DOBLE DE CUADROS: DE 32 A 64

Pedido: *"es hermoso, puedes lograr más fotogramas?"*. Entran **dos hojas más** —una de ojos y una de
bocas—, generadas con la hoja anterior **como referencia de estilo** para que no se noten dos dibujantes.
Los atlas pasan de 4×4 a **4×8** y la carpeta a **64 sprites**.

**LA MITAD DE LOS CUADROS NUEVOS SON UNA RAMPA DE PARPADEO, y ésa es la ganancia de verdad.** Con un
solo cuadro intermedio un parpadeo tiene tres estados —abierto, a medias, cerrado— y a sesenta cuadros
por segundo eso no se ve como un párpado, se ve como un interruptor. Los cuatro nuevos
(`ab90 · ab70 · ab50 · ab25`) lo llevan a **seis escalones**. El resto son las cuatro miradas diagonales
—que convierten la mirada de un eje en un punto, con `miraY`—, los dos guiños, la ceja levantada, el
terror, el llanto, la sospecha, el asco y el dormido; y del lado de la boca, los visemas que faltaban
(`i · f · l · sellada`), la risa, las dos medias sonrisas, el beso, el gruñido, el bostezo y la lengua.

**LAS DOS HOJAS SE HORNEAN JUNTAS, Y NO ES COMODIDAD.** La escala de registro tiene que ser **una sola
para los treinta y dos cuadros**: sacándola por hoja, el ojo abierto de la primera y el de la rampa de
la segunda quedan de tamaños distintos y entonces **parpadear también cambia el tamaño del ojo**. Es el
mismo defecto de «hoja de dibujos contra atlas» que ya había costado el registro por cuadro, ahora entre
hojas. Medido: las dos hojas dan celdas de 458 y 457 px y una referencia común de 361.

**Y LA GRILLA LA ESCRIBE EL HORNO** (`CARA_OJOS_G`, `CARA_BOCA_G`). Con el cuarto clavado a mano en el
juego, agregar una hoja deja la mitad del atlas fuera de alcance sin que nada avise.

**UN DEFECTO DE LA SONDA, otra vez del mismo tipo:** `expr()` traducía algunos nombres a apertura
—«medio» a 0,4— y con la rampa puesta eso pasó a devolver **otro cuadro**: pedir `medio` fotografiaba
`ab50`. Ahora pide el cuadro por nombre y nada más. Una sonda que traduce lo que le piden no está
fotografiando lo que le piden.

Y en la cinemática los cuadros nuevos se usan de verdad, que es lo que separa agregarlos de tenerlos:
la mirada recorre las diagonales (`arribaDer` medido en el segundo 17,6) y el cierre del final pasa por
la rampa (`ab90` en el 18,9, `ab70` en el 23,0). **Y ahí apareció un defecto propio:** la rampa manda
sobre la expresion —un ojo a medio cerrar es un ojo a medio cerrar— asi que con el cansancio entrando
en el segundo 7,9 y el cierre empezando en el 7,55, el cuadro `cansado` **no se veia nunca**. Entra en
el 6,75 y ahora se mide.

Medido: **64 de 64 cuadros fotografiados dentro del juego**, cada uno verificado por nombre contra el
que se pidió. Atlas de 448×672 y 384×672, **99 KB los dos** con la misma paleta de 32 colores — el doble
de cuadros por un 48 % más de bytes, porque lo que se agrega es dibujo plano sobre transparencia. El
HTML pasó de 660 a **732 KB**.

### Sexagésima quinta vuelta (2026-08-30): **BARRIO** — un personaje generado, riggeado a mano en la cara, y el cuerpo en primera persona

Pedido textual: *"puedes generar con highsfield un modelo 3D y animarlo ... necesito que tenga huesos en
los ojos y párpados reales, y con ese haz las animaciones, también prueba riggear la boca ... también
agrega animaciones generales para primera persona al mirar abajo debes ver el personaje, igualito a la
imagen pero lo quiero joven y con mochila y ropa casual"*, con una foto de referencia de un low poly.

`herramientas/barrio/hornear_pj.py` (hornear y decimar), `herramientas/barrio/riggear.py` (la cara y la
mochila), `herramientas/barrio/glb.py` (leer y escribir GLB) y tres partes nuevas del juego: `y.js` (el
modelo en base64), `k.js` (el lector) y `l.js` (los huesos y las animaciones).

#### LO QUE NINGÚN RIGGEADOR AUTOMÁTICO DA, Y POR ESO HAY QUE PONERLO

El riggeado automático devuelve **veinticuatro huesos**: caderas, columna, brazos, piernas, cuello y
cabeza. Ni ojos, ni párpados, ni mandíbula. Y en este modelo los ojos **ni siquiera son geometría**: son
dos manchas oscuras pintadas en la textura — **un párpado no se puede animar sobre una malla que no
tiene párpado**.

Así que se agregan las dos cosas a la vez, y ése es el trabajo de la vuelta: **los huesos Y la geometría
que mueven**. Siete huesos nuevos —`ojoI`, `ojoD`, `parpSupI`, `parpInfI`, `parpSupD`, `parpInfD` y
`mandibula`— colgados de `Head`, más `mochila` colgado de `Spine01`. De 24 huesos a **32**.

La mandíbula es distinta de las otras: **no trae geometría propia, se lleva la que ya estaba**. Se le
pasa peso a los vértices que están por debajo del labio y adelante de la bisagra, **con una rampa** —con
un corte duro, abrir la boca parte la cara en dos.

**Y TODO ESTO VA DESPUÉS DE DECIMAR**, porque el simplificador se comería justo lo que se acaba de poner:
el ojo mide un centímetro.

#### LA REGLA QUE ORDENA UNA CARA HECHA DE BULTOS

Una cara armada con esferas y cajas no se compone «poniendo cada pieza donde va»: se compone **contra la
superficie del cráneo**, porque cualquier cosa que quede por detrás de esa superficie **no se ve** — acá
no hay cuenca excavada, hay una esfera opaca.

Los ojos fueron exactamente eso: con el globo puesto en z 0,072 y el cráneo llegando a 0,094 a esa
altura, los dos ojos estaban **veintidós milímetros adentro de la cabeza**. Y las mediciones no avisaban:
la sonda decía *cabeza en cuadro · delante de la cámara · 68 % del alto*, los tres ciertos. Lo que se veía
en la captura eran los **pómulos**, que sí sobresalían dos centímetros.

**Y LA ALTURA DEL OJO SALIÓ DE CONTAR VÉRTICES OSCUROS POR FRANJA.** Promediando todos los vértices
oscuros de la cara sale y = 1,646, y ahí lo que hay son **las cejas**. El histograma muestra dos grupos
separados por un hueco —uno en 1,575..1,610 y otro en 1,635..1,665— y el de abajo es el de los ojos. Con
el promedio, los dos globos quedaban cuatro centímetros por encima de las manchas pintadas.

**Y EL OJO VA GRANDE PORQUE LA CABEZA ES GRANDE**: esta cabeza mide treinta y cinco centímetros —es un
personaje estilizado, no una persona— así que un globo de radio anatómico se lee a alfiler.

#### DOS DEFECTOS DEL HORNEADO DE COLOR, Y LOS DOS SE VIERON MIDIENDO

1. **EL COLOR SE MUESTREA EN EL CENTRO DEL TRIÁNGULO Y NO EN EL VÉRTICE.** El atlas que devuelve el
   generador es **una isla por triángulo** —miles de manchitas de nueve píxeles— y el UV de un vértice
   cae en la **esquina** de su isla, que es el peor sitio posible: agarra el borde, el relleno o el color
   de la isla de al lado. El personaje horneado así salió **entero de camuflaje**, con la piel manchada
   de azul y el pantalón de gris.
2. **Y LA V NO SE DA VUELTA.** glTF pone el origen de la textura arriba a la izquierda, así que la fila
   es `v·(H−1)` y no `(1−v)·(H−1)`. **Esto no se puede ver, hay que medirlo**: con el volteo puesto, el
   muslo —que tiene que ser denim— devolvía (0,32 0,33 0,37), un gris; sin el volteo devuelve
   (0,30 0,43 0,56), que es azul, y la cara pasa de gris a (0,45 0,31 0,25), que es piel. La prueba no es
   mirar el modelo: es promediar el color muestreado en una zona que uno **sabe** de qué color tiene que
   ser.

Y el color por vértice **se guarda en LINEAL y no en sRGB**: three.js toma `COLOR_0` como lineal y no le
aplica ninguna conversión, así que escribiéndolo codificado la campera casi negra salía gris claro.

**EL MATERIAL SE REEMPLAZA ENTERO Y NO SE LE SACAN LAS TEXTURAS DE A UNA.** El que viene trae
`emissiveTexture`, `KHR_materials_ior` y un `KHR_materials_specular` con el factor en 2,0 —fuera de
especificación—; sacando sólo `baseColorTexture` queda una referencia a una textura que ya no existe y
gltfpack contesta «invalid GLTF» sin decir cuál.

#### EL ESQUELETO SE PASA A METROS

Viene en centímetros con un `Armature` que escala por 0,01, y esa mezcla ya había costado una vuelta en
el visor 3D. Multiplicando cada traslación por 0,01 y sacándole la escala al Armature, el espacio de los
huesos y el de los vértices pasan a ser el mismo — y **las matrices de bind hay que rehacerlas también**,
porque traían esa escala adentro del 3×3: dejándolas como estaban, el producto hueso × bind deja de ser
la identidad y el personaje sale cien veces más grande.

#### LAS ANIMACIONES SE ESCRIBEN, NO SE TRAEN

El generador ofrece una biblioteca de clips enlatados. No se usó ninguno, y no es por gusto: **con un
clip no hay forma de mezclar la caminata con la mirada, el parpadeo y la mandíbula**, que es justo lo que
este personaje tiene de más que un maniquí. Van como funciones del tiempo sobre el esqueleto, igual que
los cuatro de LEMI.

**Y EL GIRO SE PIDE EN EJES DE MUNDO, NO EN LOS DEL HUESO.** Los ejes locales de un hueso son los que
dejó el bind, así que no significan nada: en este rig la cabeza viene con cuarenta grados de inclinación
sobre X. Escribiendo `rotation.x` se le **borra** esa rotación y el personaje se dobla en dos — la
lección que en RECREO costó una vuelta con los brazos de Baldi. El delta se lleva al espacio del hueso
con `P⁻¹·R·P`, donde P es la rotación de mundo del **padre** en la pose de reposo.

**LOS BRAZOS SE BAJAN CINCUENTA Y CINCO CENTÉSIMAS, y está medido:** el modelo se generó en pose de A
porque es lo que el riggeador necesita, y medido sobre el bind el brazo sale a **41 grados** de la
vertical. Sin bajarlos, mirándose el pecho lo que se ve son dos manos flotando en los costados.

#### LA CADENCIA DEL PASO ESTABA MAL Y EL CUERPO LO DESTAPÓ

`AND.fase += (AND.v·dt)/0,82` decía en su comentario «0,82 m por medio paso» y hacía otra cosa: la fase
avanzaba **uno** cada 82 cm, pero la pisada dispara cuando cambia `floor(fase/π)`, o sea **cada 2,58 m**.
El jugador daba un paso cada dos metros y medio. Sin cuerpo eso se leía a deslizarse; con piernas, los
pies patinan — el defecto que en RECREO tenía a Baldi a 2,7 metros por paso. Va `π` por cada 0,82 m, y
con eso el cabeceo de la cámara, la pisada y la zancada son **el mismo número**.

#### EL CUERPO EN PRIMERA PERSONA: TRES INTENTOS Y UNA CUENTA

Lo anatómicamente correcto es poner el **ojo** del modelo en la cámara. Y sale mal: el ojo está quince
centímetros **por delante** del torso, así que el pecho queda quince centímetros detrás de uno. Medido,
con la vista a sesenta y seis grados hacia abajo el esternón proyectaba en **−0,66** y lo único que
entraba en el cuadro eran las zapatillas. Y con setenta grados de campo vertical **no hay ángulo que
alcance**: el pecho está más allá de la vertical del ojo.

Adelantar el cuerpo tampoco: con cinco centímetros la cámara queda encima del cuello y el cuadro entero
es el forro de la campera. Bajar el cuerpo entero hunde las zapatillas en el asfalto.

Lo que funciona es bajar **sólo el torso**: en primera persona el hueso `Spine02` —el primero por encima
de la cadera— se corre quince centímetros y medio hacia abajo y tres hacia adelante. El cuello queda a
treinta y siete centímetros por debajo del ojo, el pecho aparece a partir de los cincuenta grados, y **la
pelvis y las piernas no se mueven**, así que los pies siguen pisando el suelo. Lo que se deforma es la
cintura, que es justamente lo único que desde adentro no se ve.

**Y HAY QUE TAPAR EL CUELLO.** La cabeza se achica a la centésima parte —el truco de siempre— y una
cabeza que desaparece deja un **agujero**: el cuello del modelo está abierto por arriba porque ahí
empezaba el cráneo. Medido en la captura, mirando hacia abajo el cuadro entero era el interior del
torso. Va un casquete pegado al hueso del cuello, que desde afuera no se ve porque queda por dentro de
la cabeza.

**Y UNA LUZ MÍNIMA COLGADA DE LA CÁMARA**, con alcance 1,6 m — o sea que se apaga antes de llegar al
asfalto y no rompe la regla del juego, que es que lo único que ilumina de verdad son los faroles. Sin
ella, mirarse el pecho a las tres de la mañana entre farol y farol es mirar una silueta negra.

#### LA MOCHILA VA POR CÓDIGO

El generador **no la puso**: leyó las correas como parte de la campera. Se agrega en `riggear.py` —cuerpo,
tapa, base, bolsillo trasero y dos correas— y eso además es lo que garantiza que **las dos correas se
vean en primera persona**, que es la única señal de que uno lleva mochila cuando no se ve la espalda. Las
correas siguen el pecho **escalón por escalón**, con las alturas medidas sobre el modelo: una correa
recta atraviesa el pecho a la altura del esternón y sale por el otro lado.

#### LA CINEMÁTICA PASA A USAR EL PERSONAJE, Y APARECIÓ LA NUCA

La cabeza dibujada por código de la vuelta anterior se fue entera. El plano A es ahora la misma primera
persona del juego —o sea que **también se ve el cuerpo**— y el plano B filma la cara del modelo.

**Y LA CÁMARA ESTABA DEL LADO EQUIVOCADO.** Iba en `cabeza − adelante·dist`, o sea DETRÁS, y funcionaba
sólo porque la cabeza de código se giraba media vuelta para mirarla. Con un cuerpo entero eso es alguien
caminando en una dirección con la cabeza puesta al revés: en la captura, la nuca llenando el cuadro. La
cámara pasa adelante y camina de espaldas, que es lo que hace una cámara que filma a alguien de frente.

**Y LA DISTANCIA SE CALCULA SOBRE LA CABEZA QUE HAY**: a noventa centímetros y con 26 grados el cuadro
medía cuarenta y dos centímetros y la coronilla salía cortada (y 1,38 de 1). A 1,18 m mide 54 y la cabeza
ocupa el 64 %.

#### UN LECTOR DE GLB DE CIENTO VEINTE LÍNEAS, Y NO `GLTFLoader`

Este juego depende de que llegue `three` y de nada más. El cargador de three.js es otra descarga de un
CDN que puede no llegar, más una entrada en el importmap, para leer un archivo que generamos **nosotros**
y cuya forma controlamos entera. Es la misma decisión que en LEMI con los dos props.

#### MEDIDO AL CERRAR

**32 huesos · 10.045 triángulos · 5.467 vértices**, y lo que importa: **cada hueso nuevo mueve
geometría**, medido girándolo y comparando dónde quedaron sus propios vértices —un hueso mal pesado gira
igual y no desplaza nada—:

| hueso | vértices | desplazamiento medio | máximo |
|---|---|---|---|
| mandíbula (0,34 rad) | 50 | **55,9 mm** | 66,8 |
| párpado superior (0,90) | 55 | **12,9 mm** | 16,0 |
| párpado inferior (−0,50) | 55 | **7,3 mm** | 9,0 |
| ojo (0,50 en Y) | 204 | **5,7 mm** | 8,4 |
| mochila (0,30) | 120 | 75,5 mm | 98,7 |
| muslo (−0,60) | 45 | 100,5 mm | 198,8 |
| antebrazo (−0,70) | 46 | 83,8 mm | 147,3 |

Los párpados **simétricos hasta el tercer decimal** en los tres tiempos del plano B —no pueden bizquear—,
cerrados en el segundo 15,4 y abiertos en el 20,5. Cabeza en cuadro y delante de la cámara. En primera
persona la escala de la cabeza pasa de 1 a 0,01 y el esternón proyecta en **0,119** del alto —o sea que
se ve—. Sesenta y tres metros corridos con **0 cuadros dentro de una casa**, HUD sin un solo
solapamiento, **245 llamadas de dibujo**, **0 NaN** y `window.__errs` vacío en las once corridas. El HTML
pasó de 333 KB a **631 KB**, y esos 286 son el personaje.

**LO QUE NO SE PUDO HACER:** la mochila no salió del generador y las manos no tienen huesos de dedos —el
riggeado automático da una sola articulación por mano—. Y la cara sigue teniendo las cejas y la boca
pintadas en la textura: lo que se mueve de verdad son los ojos, los párpados y la mandíbula.

### Sexagésima cuarta vuelta (2026-08-30): **BARRIO** — la cinemática de dos planos, y la cara

Pedido textual: *"agrega una cinematica sin los bordes negros de arriba y abajo ... haz que sea en
primera persona y obviamente con movimientos de cámara súper realistas, también agrega filtros y
efectos ... la Cinemática sea caminando después otra cámara enfrente del personaje con fov bajo bien en
la cabeza y con el fondo difuminado de como abre los ojos y después lo cierra mientras tiene el
balanceo de caminar"*.

Veintisiete segundos, dos planos y un corte seco en el medio. Vive en
`herramientas/barrio/partes/j.js`, que es archivo nuevo.

#### SIN BANDAS NEGRAS, Y NO ES SÓLO OBEDECER

Es lo primero que se pidió y encima es lo correcto acá: el juego ya se dibuja apaisado y girado dentro
de un teléfono vertical, así que recortarlo más deja el barrio en una ranura. **Lo que hace que algo se
lea a cinemática no es el recorte sino lo que sí está**: el desenfoque, la aberración del lente, el
grano más alto, la viñeta cerrada y, sobre todo, que nadie tenga el control.

Y el pedido cierra solo: los ojos que se abren y se cierran son **los del personaje, vistos de frente**,
no un antifaz de pantalla. Un fundido con forma de párpado ES una banda negra.

#### ES UNA FUNCIÓN DEL TIEMPO, Y POR ESO SE PUDO ARREGLAR

`CINEMA.pon(t)` no es una máquina de estados: recibe el segundo y deja la cámara, la cabeza y los
párpados. Por eso el banco fotografía el segundo 17,4 con `__V.cine(17.4)` sin esperarlo. Los siete
defectos de abajo salieron todos de fotografiar un instante, no de leer el código.

Que sea puro obliga a una cosa: **los giros de cabeza no pueden ser un resorte integrado**. Van con
`smoothstep` entre una tabla de miradas —al frente, una casa a la izquierda, los cables, el charco, al
frente— y eso ya tiene derivada cero en las dos puntas, o sea que arranca y termina frenando, que es
justo lo que se ve de un resorte. Encima, **tres senos de frecuencias que no son múltiplos entre sí**
sobre el rumbo y el cabeceo: sin eso, los tramos en los que mira al frente se leen a trípode que camina.
El cabeceo es el ocho de siempre —vertical al doble de frecuencia que el lateral, porque hay dos pisadas
por ciclo— y **la pisada va atada a la fase del paso**, la misma regla que el juego, así que el sonido y
el balanceo no se pueden desincronizar.

#### EL PLANO DE LA CARA: DOS DESTINOS Y UNA CÁMARA

El fondo desenfocado y la cara nítida no se pueden separar en una sola pasada sin un mapa de
profundidad. Van dos: el mundo a `rt` y **la cabeza sola a `rtH`**, y el shader compone por el alfa.
Lo que hace que las dos pasadas no se puedan desalinear es que son **la misma cámara con las capas
cambiadas** —el barrio en la 0 y la cabeza en la 1— en vez de dos cámaras que habría que mantener
sincronizadas.

**Y LAS TRES LUCES DE LA CARA TAMBIÉN VAN EN LA CAPA 1.** three.js junta las luces comparando sus capas
contra las de la CÁMARA, así que una luz en la capa 1 no existe para el mundo: la cara se ilumina sola,
sin que el farol de mentira le pinte las casas de atrás.

El desenfoque son **trece muestras en espiral de ángulo áureo**. La espiral no es coquetería: con un
anillo regular de doce puntos, un farol desenfocado sale como doce copias del farol en círculo. Y va con
el muestreo NEAREST del destino, que acá es lo correcto — este juego se estira con NEAREST, así que un
desenfoque suave por interpolación sería lo único liso del cuadro.

**LA ABERRACIÓN CROMÁTICA VA SÓLO DONDE HAY ALGO NÍTIDO.** Un fondo ya desenfocado no puede mostrar
franjas de color en un borde que no tiene: hacerlo igual cuesta veintiséis muestras más para no cambiar
un píxel. Van dos taps sobre la cabeza, que es lo único con filo.

#### LA CARA: SIETE DEFECTOS, Y SEIS SÓLO SE VEN MIRANDO

1. **EL PLANO MOSTRABA LA NUCA.** La cara del modelo está sobre su +Z local y la cámara se planta en
   `cabeza − adelante·dist`, así que el ángulo correcto es `yaw0` y no `yaw0 + π` — que es lo que
   parecía «darlo vuelta». La sonda decía *cabeza en cuadro · delante de la cámara · 68 % del alto*, y
   los tres eran ciertos.
2. **LOS OJOS ESTABAN VEINTIDÓS MILÍMETROS ADENTRO DE LA CABEZA.** Y ésta es la regla que ordena todo lo
   demás: **una cara hecha de bultos convexos no se compone poniendo cada pieza donde va, se compone
   contra la SUPERFICIE DEL CRÁNEO**, porque lo que quede por detrás no se ve — acá no hay cuenca
   excavada. Lo que se veía en la captura eran los pómulos, que sí sobresalían dos centímetros. El
   cráneo se acható de frente y cada pieza lleva su cuenta: el ojo asoma 2,7 mm, el pómulo 2,7, la ceja
   4,5 y la nariz veinte.
3. **EL PELO TAPABA MEDIA CARA.** Un casquete de esfera cortado en 0,60π baja **dieciocho grados por
   debajo del ecuador**: la línea del pelo caía por debajo de los ojos. En 0,40π el nacimiento queda en
   y 0,051, justo encima de la ceja, y atrás va otra pieza porque si no la nuca queda pelada.
4. **LAS CEJAS ERAN UNA SOLA BARRA.** Cuatro coma ocho centímetros de ancho puestas a ±3,1 se pisan en
   el medio: con el flequillo justo encima, la frente quedaba entre dos travesaños negros paralelos.
5. **EL SIGNO DE LOS PÁRPADOS ESTABA AL REVÉS.** El casquete de arriba cubre el hemisferio de su polo, y
   girándolo un ángulo `a` sobre X el borde queda `a` radianes POR DEBAJO del eje de la pupila — o sea
   que cualquier `a` positivo la tapa. Con el «abierto» escrito en +0,30, los dos párpados estaban
   cerrados siempre.
6. **Y AUN CERRADOS, EL IRIS LOS ATRAVESABA.** Éste es el que hacía que cerrar los ojos no se viera. El
   iris estaba en z 0,0097 con medio grosor 0,0049, o sea que llegaba a 0,0146: **por fuera del párpado,
   que mide 0,0142, y hasta por fuera del propio globo, que mide 0,0125.** Ampliadas al lado, la foto
   del ojo cerrado y la del abierto eran idénticas. Los dos discos van aplastados y por dentro del globo.
7. **ABIERTO ES UNA ALMENDRA, NO UN CÍRCULO.** El casquete que asoma del cráneo es un disco de dieciséis
   milímetros; con los párpados apenas tocándolo el ojo salía redondo, o sea saltón. En ±0,23 los bordes
   quedan a trece grados del eje y queda una franja de dieciséis por cinco y medio.

#### LA LUZ: EL FAROL ELIGE EL LADO, EL PLANO ELIGE EL ÁNGULO

Primero puse la clave **sobre la recta al poste de verdad**, con el argumento de que la sombra tiene que
caer del lado del farol que se ve en el fondo. El argumento sigue siendo bueno y el resultado era malo:
el farol más cercano está adelante y arriba, o sea **detrás de la cámara**, así que la luz terminaba casi
en el eje del lente — y una luz frontal NO MODELA. Medido en la ampliación: cara plana, sin sombra de
nariz, sin ceja y sin pómulo.

Ahora el farol decide **lo único que el ojo puede comprobar contra el fondo** —de qué lado viene la luz—
y el ángulo lo pone el plano: cuarenta grados de costado y treinta y cinco de alto, que es la clave de
siempre. Más un contra frío del lado contrario, que es lo que separa la silueta del fondo desenfocado
—la lección que en LEMI costó una vuelta con el screamer adentro de la cueva— y un relleno hemisférico
que **no puede ser negro abajo**, porque si no el mentón y el cuello reciben cero.

#### LA GOTA DE CERCA ERA UNA TABLA BLANCA CRUZANDO LA CARA

La lluvia del juego se apaga por debajo de los setenta centímetros, que es lo correcto para primera
persona; pero en este plano la cabeza está justo a setenta, o sea en la franja apagada, y una cara bajo
la lluvia sin una gota pasándole por delante no está bajo la lluvia. Va otra nube, chica y en la capa 1.
Y **la primera versión copió los tamaños de la del juego**: a sesenta centímetros del lente y con 26
grados de campo, el cuadro mide veintiocho centímetros de alto, así que una tira de dieciséis
centímetros por dos de ancho sale de **doscientos treinta píxeles por treinta** — medido en la captura,
tapaba media frente. Con 4,5 cm de largo y 3 mm de ancho quedan sesenta píxeles por cuatro, que es una
gota.

#### LA CÁMARA VA MEDIO ENGANCHADA, Y ESO ES EL PEDIDO

Enganchada del todo a la cabeza, la cara queda clavada en el cuadro y el balanceo no se ve en ninguna
parte: se ve el fondo moviéndose y la cabeza quieta, que es el error clásico de un plano así. Siguiendo
**el 66 % del cabeceo**, en la cara queda un tercio de residuo —que es lo que se mira— y el fondo se
mueve entero.

Y **se apunta un poco por debajo de los ojos**: apuntando justo a ellos quedan clavados en el medio del
cuadro, que es donde no van, y medido la coronilla tocaba el borde de arriba.

#### DÓNDE ARRANCA LA CAMINATA, QUE TAMBIÉN ES DEL PLANO DE LA CARA

En el plano B la cámara mira **hacia atrás**, así que el fondo desenfocado es la cuadra que acaba de
pasar. Arrancando a dieciséis metros del cruce, la cara caía con la **esquina a seis metros por detrás
de la cabeza** — y el flanco de una casa de esquina, a fov 26, ocupa casi cincuenta grados: en la
captura, una tapia negra detrás del personaje y ni un punto de luz. Arrancando **tres metros antes del
cruce** se lo cruza en el segundo dos y para cuando empieza el plano B la esquina quedó a dieciséis
metros: el fondo es la calle entera con sus faroles, que desenfocados son las manchas que un lente largo
tiene que dar.

#### LO QUE SE FUNDE Y LO QUE NO

La cabeza son treinta y cinco piezas y **sólo se mueven doce**: los dos globos, los cuatro párpados y los
cuatro discos del iris. Todo lo demás está clavado, así que va por `fundir()` —la misma función que junta
las doscientas piezas de una cuadra— y quedan cinco mallas en vez de veintitrés. Medido: el plano B pasó
de **236 a 217 llamadas de dibujo**.

#### Y SE PUEDE SALTEAR, CON MEDIO SEGUNDO DE GRACIA

Una cinemática obligatoria que se ve una vez es una escena; vista cinco veces es un peaje — la lección de
POMPOM. Se ve sola la primera vez que se toca JUGAR y después queda en su propio botón. El toque que la
abre es un `click` y el que la saltea un `pointerdown`: sin la guarda de 0,55 s, un doble toque sobre
JUGAR —que en un teléfono pasa todo el tiempo— la arranca y la saltea en el mismo gesto.

**Y SE ENTRA AL JUEGO DONDE TERMINÓ LA ESCENA**, mirando para el mismo lado. Devolviendo al jugador a la
esquina de siempre, el último cuadro de la cinemática y el primero del juego son dos sitios distintos y
el corte se lee a error.

#### MEDIDO AL CERRAR

Los dos planos fotografiados instante por instante: entrada desde negro con el desenfoque que se acomoda,
la casa, los cables, el charco, el corte, y la cara **en cuadro y delante de la cámara** en los cuatro
tiempos. Ojos: cerrados en el segundo 15,4 (0,24 / −0,08), abiertos en el 20,5 (−0,23 / +0,23), **los dos
iguales hasta el último decimal** — no pueden bizquear. Costo: **225 llamadas de dibujo en el plano A y
217 en el B**, contando las dos pasadas. La escena termina sola en `juego` en x 47,9, que es exactamente
donde terminó la caminata; el HUD vuelve **sin un solo solapamiento** y desde ahí se corren 67,3 m con
**0 cuadros dentro de una casa**. Saltear también deja `juego`. Los dos textos nuevos en los tres
idiomas. **0 NaN** y `window.__errs` vacío en las nueve corridas. El HTML pasó de 287 KB a **333 KB**, y
no entró un solo asset: la cabeza son cajas y esferas.

### Sexagésima tercera vuelta (2026-08-30): **BARRIO** — la vuelta de afuera, las casas de verdad y las cercas de piquetes

Pedido textual: *"podés mejorar las calles o sea hace que los bordes también sean vecindario así no queda
como un vecindario vacío ... también necesito que las casas las mejores en un 100% también agrega que
las cercas sean de madera mejor hechas genera texturas con Rezona ... también genera imágenes y todo
para texturas del suelo nomás y esas cosas ... conecta bien las cercas y casas"*.

**REZONA NO CONECTÓ EN ESTA SESIÓN.** Está en `.mcp.json` —`npx rezona@latest mcp`— pero el servidor no
levantó: las herramientas cargadas son Higgsfield, GitHub y las de three.js, y no hay ninguna
`mcp__rezona__*`. Las siete texturas se generaron con Higgsfield, que es lo que ya había funcionado
para las nueve de RECREO. No lo intenté con la URL: en la vuelta 56 quedó medido que
`https://lab.rezona.ai/mcp` devuelve HTML en un GET y 405 en el POST.

#### LOS BORDES: EL BARRIO SE CIERRA CON UNA VUELTA MÁS

Parado en la calle exterior y mirando hacia afuera no había NADA: el damero terminaba en un plano de
asfalto perdiéndose en niebla, y un plano que se pierde en gris se lee a maqueta recortada. Ahora hay
**veinticuatro cuadras de borde** —una vuelta completa— y detrás de ellas una franja de **900 árboles**.

**Y LAS DE BORDE LLEVAN CASAS EN UN SOLO LADO.** Sus otras tres caras dan al campo, y una casa mirando
al campo es una casa que nadie va a ver nunca por su frente: seis por cuadra serían ciento cuarenta
casas puestas de espaldas. Las cuatro esquinas llevan dos frentes. De 150 casas a **234**.

**LA VEREDA VA SÓLO DONDE HAY CALLE**, y por lo mismo: en una cuadra de borde, una vereda en la cara que
da al campo es una vereda que no lleva a ningún lado y que encima delata que la cuadra está cortada.

Y el plano de asfalto se pasa del damero por dos cuadras: con el plano justo al tamaño del barrio, las
cuadras nuevas quedaban apoyadas en el vacío.

#### LAS CASAS: LO QUE SE MIRA A TRES METROS SON LOS BORDES

La versión anterior era una caja, un techo a dos aguas y dos ventanas. De lejos pasaba; de cerca —que
es donde uno camina— era una caja. **Lo que hace que una casa se lea a casa no es el volumen grande
sino los bordes**, y son todos piezas de diez centímetros:

- **El alero**, que sobresale cincuenta y cinco centímetros y tira su sombra horizontal bajo el techo.
  Un techo al ras se lee a maqueta.
- **La fascia**, la tabla clara que cierra el canto del alero: es lo que separa el techo de la pared
  cuando los dos están en penumbra.
- **El zócalo de ladrillo.** Sin él la casa nace del pasto, y una casa que nace del pasto se lee a caja
  apoyada encima.
- **El alféizar de cada ventana**, que es lo único que sobresale de la pared y por eso lo único que
  atrapa la luz de un farol de costado.
- **La canaleta y su bajada.** Una casa con lluvia y sin canaleta es una casa a la que no le llueve.
- **Y LOS ESCALONES DEL PORCHE**, que no son un detalle: el piso está a cincuenta y cinco centímetros
  del pasto por el zócalo, así que sin escalones la puerta queda flotando y el porche es una repisa.

Más: tres formas de techo —dos aguas al frente, dos aguas a lo largo y cuatro aguas—, frontón del color
de la casa y no del techo, porche con columnas y baranda, garaje en una de cada tres, postigos, chimenea
con capucha, número de casa, aire acondicionado al costado, y ventanas con marco, crucero y postigos.

**LA CARPINTERÍA BLANCA VA APARTE Y CLARA A PROPÓSITO.** De noche, una casa entera del mismo tono es una
silueta; lo único que le devuelve la forma son los bordes claros. Es la pieza más chica de todas y la
que más se ve.

#### LAS CERCAS: UNA TEXTURA CON ALFA, Y LA CUENTA ES LA QUE DECIDE

Un cerco de frente mide doce metros y lleva unos setenta y cinco piquetes; por doscientas treinta y
cuatro casas son **diecisiete mil cajas** —doscientos mil triángulos— para algo que de noche y a quince
metros es una silueta con rayas.

Y lo que hace que una cerca se lea a piquetes **no es el volumen de cada tabla: son los HUECOS entre
ellas**. Un plano recortado con alfa los da exactos —con la punta en pico, porque una tabla cortada a
escuadra se lee a tapia— y los postes y los dos travesaños, que sí son cajas, ponen el volumen donde se
ve, que es al lado de uno. Va con `alphaTest` y no con transparencia: un material transparente no
escribe profundidad y dos cercas cruzadas se dibujan en el orden equivocado.

#### CONECTADAS, QUE ERA LA MITAD DEL PEDIDO

- **La puerta del cerco cae exactamente sobre la vereda de acceso**, y la vereda va del portón a los
  escalones del porche. Sin ella el cerco tiene una puerta que da al pasto y el porche unos escalones
  que bajan a la nada.
- **La entrada de auto termina en el garaje** cuando lo hay. Una entrada que muere contra una pared lisa
  no lleva a ningún lado.
- **La medianera la pone UNO SOLO de los dos vecinos.** Con las dos, cada límite entre lotes queda con
  dos cercas superpuestas — y eso no se ve como una cerca más gruesa, se ve como un parpadeo entre dos
  planos que pelean el mismo píxel.
- Y los postes del portón van más altos, con su tapa: es lo que hace que se lea a entrada y no a un
  pedazo de cerca que falta.

#### EL LOTE SE ESCRIBE UNA VEZ Y SE USA CUATRO

La versión anterior tenía casas en dos lados de la cuadra y el código escrito para esos dos. Con los
bordes hacen falta los cuatro. Todo el lote —casa, jardín, entrada, veredas y cercas— se escribe en un
marco LOCAL donde `u` corre a lo largo de la calle y `v` entra en la cuadra, y una tabla de cuatro
entradas lo lleva al mundo. Escribirlo cuatro veces es la forma más rápida de que tres de los cuatro
lados terminen con la puerta contra el patio.

#### LAS SIETE TEXTURAS GENERADAS, Y LA ESCALA SE CUENTA SOBRE LA IMAGEN

Asfalto, vereda, pasto, madera, ladrillo, revestimiento y teja. **106 KB las siete.**

**LAS UV PASAN A ESCRIBIRSE EN METROS.** Antes cada pieza dividía por un número propio —1,6 acá, 2,2
allá, 0,9 en el zócalo— así que cambiar una textura obligaba a encontrar los once sitios donde se la
usaba. Ahora hay una sola tabla, `METROS`, que dice cuántos metros cubre cada imagen, y el factor de
cada pieza divide por eso. **Los números están contados sobre la imagen generada**: trece hiladas de
ladrillo son un metro, diez tablas de revestimiento son dos metros cinco. Sin esa cuenta una pared sale
con hiladas de veintidós centímetros y la casa se lee a casa de muñecas — el mismo defecto que en RECREO
costó una vuelta con los lockers.

**NO SE COSEN LOS BORDES.** Al modelo se le pidieron texturas «sin costura» y ninguna imagen generada lo
es de verdad; coserlas a mano ensucia justo el centro, que es lo que más se mira. Va
`MirroredRepeatWrapping`: la copia de al lado va dada vuelta, los dos bordes que se tocan son **el mismo
borde** y la costura no puede existir.

**Y LA REPETICIÓN SE COPIA DE LA QUE HABÍA.** El asfalto no toma su escala de las UV sino de `repeat`
—es un plano de doscientos metros con UV de 0 a 1— así que reemplazar el mapa sin copiarla deja la calle
con UN texel estirado sobre el barrio entero.

#### TRES MALLAS MENOS POR CUADRA

La carpintería oscura y la blanca son el mismo material con otro color, y lo mismo pasa con las ventanas
encendidas, los televisores y la chapita del número, y con los troncos y las copas. Separados eran seis
mallas por cuadra —o sea seis llamadas de dibujo por cuadra visible, y hay quince a la vez— para pintar
cosas que sólo se distinguen por el tono. Con color por vértice son tres.

**Y LA DISTANCIA DE VISTA BAJA DE 168 A 116 METROS**, que sale de la niebla y no del gusto: con `FogExp2`
en 0,0165, a 120 m el factor ya es 0,98. Con la vuelta de borde el barrio pasó de veinticinco manzanas a
cuarenta y nueve, y con el corte viejo se dibujaban veintiséis a la vez —336 llamadas— para mostrar gris.

#### MEDIDO AL CERRAR

**234 casas · 96 faroles · 49 cuadras.** Las 7 texturas decodificadas y puestas en sus materiales, con la
repetición del asfalto conservada (167,17). Mil quinientos cuadros caminados de verdad por tres calles
—una de adentro en cada sentido y **la del borde**—: **686 metros y 0 cuadros dentro de una casa**. HUD sin
un solo solapamiento. **218-246 llamadas de dibujo** con 11-14 cuadras a la vista, contando las dos pasadas
y la de sombra. **0 NaN** y `window.__errs` vacío en las siete corridas. El HTML pasó de 119 KB a **287 KB**,
y esos 167 son las siete texturas.

**Y LA PRIMERA MEDICIÓN DE LA CAMINATA ESTABA MAL, que es lo que vale anotar.** La solté en (0,−2) y en
(−2, 0) dando por sentado que el origen es un cruce. No lo es: las calles caen en −132,5 · −79,5 · −26,5 ·
26,5 · 79,5 · 132,5, o sea que **el (0,0) es el medio de una manzana**. Una de las dos corridas se clavó a
3,4 m contra la pared del fondo de una casa —correcto— y la otra recorrió 133 m por el callejón de un metro
que queda entre las dos cercas de fondo. Los dos números eran ciertos y ninguno de los dos medía lo que yo
decía que medía: una prueba que camina por donde el jugador no camina no prueba que el barrio se pueda
recorrer.

### Sexagésima segunda vuelta (2026-08-30): **BARRIO**, el octavo juego — cinco por cinco cuadras, de noche y lloviendo

Pedido textual: *"ok hagamos el mejor juego HTML del mundo ahora dejemos Lemi atrás, necesito que hagas
una ciudad o bueno un vencidario de aproximadamente 5 cuadras por 5 cuadras, que tenga casas cercas
texturas de calle de veredas pasto también luces postes de luz cables etc de noche con pixelacion suave
y buenos gráficos en primera persona lloviendo"*.

`juegos-pc/Barrio.html` (~119 KB, **sin un solo asset**: todo dibujado por código). Vive partido en
`herramientas/barrio/partes/` y se arma con `python3 herramientas/barrio/armar.py`.
**Vecindario NO se tocó**: ése es una cinemática de 38 segundos sin controles, y esto es otra cosa.

#### TODO SALE DE TRES NÚMEROS

Cuadra de 44 m, calle de 9 y vereda de 2,6. De ahí salen el paso de la grilla (53 m), los doscientos
setenta y cuatro metros de lado, los seis ejes de cada sentido y la posición de cada casa, cada farol y
cada cable. **Escritas cuadra por cuadra, mover una calle sería mover cien cosas**; así el barrio se
agranda cambiando `CUADRAS`.

Y el barrio es SIEMPRE EL MISMO: la semilla está fija. Con un azar de verdad, «la casa de la esquina»
dejaría de querer decir algo y el jugador no podría orientarse en veinticinco cuadras iguales.

#### TRES CASAS POR LADO Y SÓLO EN DOS LADOS, Y ESO ES UNA CUENTA

La primera versión ponía casas en los cuatro lados de cada cuadra, y las de las esquinas se pisan: una
casa ocupa trece metros hacia adentro contando el jardín, y el rincón de trece por trece lo reclaman
las dos. Con tres mirando al norte y tres al sur quedan doce metros de fondo entre las dos filas —o sea
**patios**— y los lados de este y oeste se llenan con medianeras, que es exactamente como está armado
cualquier barrio de damero. Son **150 casas**.

#### HAY 96 FAROLES Y SEIS LUCES, Y ÉSA ES LA DECISIÓN DE FONDO DEL JUEGO

Una `PointLight` por farol es imposible: el renderer directo de three.js compila un shader con TODAS
las luces adentro, y noventa y seis revientan el límite de uniformes de cualquier teléfono. Bajar la
cantidad de faroles arruinaría el barrio. Así que **los faroles son geometría y las luces son seis
objetos que se mudan cada cuadro a los seis faroles más cercanos**. Lo que se ve de un farol a treinta
metros es su cabeza encendida y su halo —no la luz que tira sobre el asfalto— y a diez metros nunca hay
más de seis. Medido: con el jugador en una esquina, las seis luces caen a 3,5 · 26,7 · 26,7 · 49,5 ·
53,1 m y la sexta se apaga porque el sexto farol está a 180.

**Y UNA SOLA PROYECTA SOMBRA**, la más cercana. Cada luz con sombra es una pasada entera de la escena
desde su punto de vista: seis serían siete pasadas por cuadro. Con una, el poste y la cerca que uno
tiene al lado tiran su sombra —que es lo único que se mira— y las otras cinco iluminan.

#### EL HALO NO ES UN CONO, Y ESO COSTÓ DOS CAPTURAS

La primera versión era un cono aditivo, que es lo que uno dibujaría pensando en «el aire iluminado
debajo del farol». **No funciona, y el motivo se ve en la primera captura: un cono TIENE SILUETA.** Su
borde es una recta que corta el cielo, así que sobre un fondo casi negro y con mezcla aditiva lo que
aparece son pirámides pálidas y sólidas — dos o tres superpuestas tapaban media pantalla. Bajarle la
opacidad no lo arregla: lo hace más tenue y sigue siendo una pirámide. Ponerle un degradado en los
vértices tampoco, porque un cono sólo tiene rim y ápice: el borde sigue estando.

Lo que no tiene silueta es un **degradado radial**, y para que funcione desde cualquier ángulo tiene
que mirar a la cámara. Noventa y seis `Sprite` serían noventa y seis llamadas de dibujo, así que van
como una malla instanciada con el encaramiento hecho en el vertex shader: **una llamada**, y el brillo
se calcula por PÍXEL en vez de por vértice, que es de donde salía el borde duro.

**Y EL REFLEJO EN EL ASFALTO TENÍA EL MISMO DEFECTO.** Los parches debajo de cada farol eran planos
aditivos de color parejo: en la captura, rectángulos de cartulina naranja tirados en el piso. Van con
una textura radial. Y a **0,20 de opacidad y no 0,42**: la mezcla es aditiva y hay tres parches por
farol, así que lo que se ve no es un reflejo sino la suma de los tres — la calle entera quedaba naranja
plana y el asfalto dejaba de existir.

#### CUATRO MIL GOTAS Y CERO TRABAJO DE JAVASCRIPT POR CUADRO

La forma obvia no sirve: con un `InstancedMesh` normal hay que componer y escribir cuatro mil matrices
en cada cuadro, y eso solo se come el presupuesto de un teléfono. Acá **la caída la calcula el vertex
shader** a partir de una semilla por gota y del reloj — la gota cae, llega abajo y vuelve a aparecer
arriba con un módulo. Lo único que se manda por cuadro son dos números.

**Y CADA GOTA MIRA A LA CÁMARA.** Una tira vertical es un plano, y un plano visto de canto no tiene un
solo píxel: girando la cabeza, la mitad de la lluvia desaparecería. El eje horizontal de cada tira sale
del producto cruzado entre la vertical y la dirección a la cámara, así que se ve de frente siempre sin
dejar de estar inclinada con el viento.

**Y LA CAJA DE LLUVIA SE CENTRA EN LA CÁMARA REDONDEADA A LA UNIDAD.** Sin redondear, la nube entera se
desliza con el jugador y la lluvia se ve QUIETA respecto de uno, que es lo contrario de lo que pasa.

Las salpicaduras del piso sí se mueven desde JavaScript, porque son doscientas veinte. Y **son mucho
más chicas de lo que uno pondría**: la primera versión medía medio metro de radio y en la captura lo
que había en el piso eran anillos de tiza. Una salpicadura mide un palmo; lo que la hace leer no es el
tamaño sino que haya muchas y que duren poco.

#### EL COLOR POR VÉRTICE ES LO QUE HACE QUE FUNDIR NO CUESTE VARIEDAD

Una cuadra son seis casas y unas doscientas piezas. Sueltas, cada pieza es una llamada de dibujo, y con
sombras se paga dos veces. Fundidas por material, una cuadra cuesta ocho llamadas. Pero sin color por
vértice las seis casas tendrían que compartir el color del material —o sea que serían la misma casa
seis veces— y la única salida sería un material por casa, que es justo lo que la fusión estaba tratando
de evitar. three.js multiplica `map × vertexColor × material.color`, así que el tinte por casa sale
gratis.

**Y SE FUNDE POR CUADRA Y NO POR BARRIO.** Con todo en una malla no hay recorte por frustum posible y
las veinticinco cuadras se dibujan siempre, mire uno donde mire. Por cuadra, el recorte tira las que
están detrás y un apagado por distancia tira las que la niebla ya se comió — que el motor no puede
saber, porque no sabe que a ciento sesenta metros no queda un píxel visible. Medido: **8 cuadras
visibles de 25 en una esquina, 13 en el medio**, con 124-141 llamadas de dibujo y 108 mil triángulos.

#### DOS COSAS QUE ESTABAN NEGRAS Y POR QUÉ

- **Las casas eran siluetas.** El ambiente estaba en 0,55 y lo único que se veía del barrio eran los
  faroles. Una noche de verdad tiene cielo nublado encima, y un cielo nublado sobre una ciudad **no es
  negro**: rebota la luz de la propia ciudad.
- **Y EL COLOR DE ABAJO DEL HEMISFÉRICO NO PUEDE SER NEGRO.** Un `HemisphereLight` reparte según hacia
  dónde mira la cara: con el suelo en negro, toda cara que no mire al cielo —o sea las cuatro paredes
  de cada casa— recibe cero. Medido: metido en un patio y de frente a una medianera, el cuadro era
  negro en un noventa por ciento. Es el mismo defecto que en Eco dejó un óvalo malva plano donde no se
  distinguía el piso del techo.

#### EL PIXELADO VA EN 1,7, QUE ES LO QUE SE PIDIÓ

«Pixelación suave». En un marco de 892×412 el 1,7 deja el destino de render en **525×242**: el escalón
se ve —los cables, las rejas y la lluvia salen con el borde escalonado, que es lo que da el aire— pero
un número de casa a veinte metros se sigue distinguiendo. Y el posterizado va en **26 bandas y no en 9**
como el de LEMI: un cielo nocturno es un degradado de arriba abajo, y con nueve escalones sale a rayas
horizontales marcadas.

#### LO QUE HACE QUE LA CALLE SE VEA MOJADA SON TRES COSAS Y NINGUNA ES «MÁS OSCURA»

El asfalto es **lo único de la escena con especular** —un `MeshPhongMaterial` entre veinte materiales
Lambert— porque una calle mojada refleja los faroles en una raya larga; los parches radiales debajo de
cada farol; y el agua en el lente, que va **antes de muestrear** en el post-proceso, o sea que deforma
la imagen en vez de pintarse encima. La amplitud es de menos de un píxel del destino de render: más que
eso ya no es un vidrio mojado, es estar borracho.

#### EL RELÁMPAGO ES LUZ DE ESCENA Y NO UN VELO BLANCO

Lo que hace un relámpago es que por un cuarto de segundo se vea **todo** el barrio con sombras duras
desde otra dirección, y eso un velo encima no lo puede fingir. Es una direccional apagada que se
enciende de golpe, más un velo de CSS chiquito que entra DESPUÉS del pixelado — o sea luz en el ojo y
no luz en la escena. **Y son dos destellos y no uno**: un relámpago casi nunca es un solo golpe de luz,
y con uno se lee a que alguien apretó un interruptor. El trueno llega después, con el retardo
proporcional a la distancia, que es lo único que convierte dos efectos en un solo fenómeno.

#### EL SONIDO ES PROCEDURAL, Y ACÁ ESO NO ES UNA LIMITACIÓN

Lo que suena en este juego es **lluvia**, o sea ruido filtrado. Un clip grabado pesa cientos de
kilobytes y encima se corta cada vez que da la vuelta, y ese corte se escucha más que la lluvia; un
ruido generado no tiene vuelta que dar. Va en **dos capas** —una ancha y grave, que es el agua cayendo
sobre todo el barrio, y otra aguda, que es el agua golpeando cerca— porque con una sola suena a
estática de radio. Y una pisada en el agua **son dos cosas**: el golpe del zapato y la salpicadura que
le sigue.

Medido con el analizador colgado del maestro: fondo de lluvia **rms 0,0231**, trueno **pico 0,319 y rms
0,0824**, o sea **3,6 veces el fondo**.

#### MEDIDO AL CERRAR

**150 casas · 96 faroles · 274 m de lado.** Novecientos cuadros caminados de verdad —con la física y el
choque— por tres calles distintas: **261 metros y 0 cuadros dentro de una casa**. El escalón del cordón
medido a los tres lados: calle 0 · vereda 0,150 · pasto 0,162. Las tres calidades se aplican en
caliente: 372×172 con 1.100 gotas · 525×242 con 2.600 · 714×330 con 4.200. HUD sin un solo solapamiento
en teléfono y en PC, con los controles correctos en cada uno. Los tres idiomas cambian el pie del menú
en vivo. Relámpago y trueno verificados. **0 NaN** y `window.__errs` vacío en las ocho corridas.

### Sexagésima primera vuelta (2026-08-30): **LEMI** — te mata y volvés a la cueva, el camello más lento, y dos props 3D

Pedido textual: *"está bien pero el boto. saltar tiene textura bugueada, el camello debe ir despacio al
morir moris y se repite desde la cueva adentro escapando, también debes hacer que al caerte aún puedas
caminar un poco, también que el camello no vaya tan rápido y que al atraparte tenga screamer, genera
modelos 3D low Poly de antorcha e inflador con highsfield"*.

#### EL BOTÓN DE SALTAR SALÍA EMBALDOSADO, Y ERA UN ATAJO DE CSS

`.ac` ponía la chapa con el atajo `background: … center/contain no-repeat`, y `#acSalta` —que
necesita su propio color de fondo— lo volvía a escribir entero. **Un atajo repone a su valor inicial
todo lo que no nombra**, así que le devolvía `background-size: auto` y `background-repeat: repeat`
justo al único botón que mide 88 px con una chapa de 56: la flecha salía a tamaño natural y repetida,
o sea una flecha y media cortada. Los otros tres miden 58 contra 56 y disimulaban el defecto — que es
lo que lo hizo durar una vuelta entera. Medido ahora: los cuatro en `contain` · `no-repeat`, el de
saltar de 78×78 con una sola flecha.

**Y `#acUsar` TENÍA EL MISMO ATAJO Y NO SE HABÍA VISTO.** Apareció recién cuando la sonda midió los
cuatro botones en vez de mirar el de saltar: seguía en `auto`/`repeat` con su fondo amarillo puesto
por encima de la chapa. Una sonda que mide UNO de cuatro elementos iguales encuentra un defecto de
cuatro.

De paso el estado «tiene imagen» dejó de ser `[style*="background-image"]`. Ese selector busca una
subcadena dentro del atributo `style` —o sea que depende de cómo el navegador serialice la línea— y
encima pierde contra un ID, que es exactamente lo que dejaba el tinte verde por debajo de la chapa.
Ahora la chapa entra por una variable (`--spr`) y el estado es una clase.

#### TE ALCANZA Y TE MATA, PERO SÓLO DURANTE LA HUIDA

Que el camello te toque pasa a ser el final de esa vida —con screamer— **desde que la escena de la
llave enciende `BICHO.caza`, y no antes**. Antes de eso el bicho ronda de noche por una isla en la que
uno está juntando ramas: morir ahí obligaría a rehacer cinco misiones por un encuentro que ni siquiera
es el nudo del juego. `caza` ya es la marca exacta de que la huida empezó, así que es la condición
correcta y no una bandera nueva. Verificado: con el camello traído a dos metros antes de la llave, te
empuja al campamento y `MODO` sigue en `juego`.

**Y SE VUELVE AL FONDO DE LA CUEVA, no al campamento.** El campamento es la isla de la mañana, o sea
otro juego; lo que quedaba por jugar es la huida. `reviveEnCueva()` reconstruye el mismo estado que
deja la escena de la llave: adentro, a doce metros del fondo, mirando a la boca, con la pierna rota,
la viñeta puesta, la antorcha en la mano y el camello detrás.

**OJO CON EL ORDEN AHÍ ADENTRO:** `esconde(true)` apaga el mundo de afuera y en esa lista está el
camello, así que encenderlo tiene que ir DESPUÉS — al revés, la cosa que te persigue queda invisible y
`pasoCamello` ni siquiera corre, porque arranca con `if (!CAM3.visible) return`.

**DOCE METROS Y NO OCHO, y el número salió de una medición.** Con ocho, el camello —que se planta a
metro y medio de la pared del fondo— quedaba a seis y medio: medido en el banco, un jugador quieto se
comía la segunda muerte antes de terminar de levantarse. Son los mismos diez metros y pico de gracia
que la escena de la llave ya había tenido que dar por exactamente la misma razón.

#### EL SCREAMER: TRES COSAS QUE SÓLO APARECIERON MIRANDO

Son 2,3 segundos en los que el juego saca el control, gira la cabeza hacia el bicho, se lo trae encima
y grita. Y las tres correcciones son de puesta en escena, no de código:

1. **LA CÁMARA TERMINABA ENTRE LAS PATAS.** La primera versión ponía el CENTRO del camello a la
   distancia que quería. El animal mide cuatro metros de largo: con el centro a 1,15 m, la cabeza
   queda **medio metro detrás del ojo**. Medido en la captura, lo que llenaba el cuadro eran dos patas
   delanteras y la panza. Ahora `arranca()` lo coloca una vez, **lee dónde cayó la cabeza** y de ahí
   sale el corrimiento; de ese punto en más todo se mide contra la cabeza, que es lo que el plano
   tiene que mostrar.
2. **ESCONDER LA ANTORCHA APAGABA LA ÚNICA LUZ.** Se esconde porque cuelga de la cámara y quedaría una
   llama flotando delante de la cara del bicho —y porque es una luz naranja a medio metro que lo pinta
   de rojo—. Pero apagando el grupo entero se apaga también su `PointLight`, y adentro de la cueva ésa
   es toda la luz que hay: medido en la captura, el screamer era **un bulto negro sobre fondo negro**.
   Ahora se esconden las mallas y se deja la luz, más una luz casi blanca colgada de la cámara que
   sube con la escena — que es literalmente el flash de una foto de noche.
3. **Y LA SATURACIÓN BAJA A 1,20 MIENTRAS DURA.** El post multiplica por 2,2, y con una sola luz de
   color eso no separa nada: tiñe. Es la misma corrección que ya había hecho falta adentro de la cueva.

#### UN NaN QUE NO SE VE COMO UN ERROR

Al reescribir el arranque borré `d0` del objeto y dejé una línea que seguía leyendo `this.d0`:
`undefined` entra en una multiplicación y sale NaN, NaN va a `BICHO.x`, de ahí a la posición de la
cabeza, de ahí a `JUG.pitch` y de ahí a **la matriz de la cámara**. El resultado no es un mensaje en
la consola: es que deja de dibujarse todo, en silencio. `window.__errs` estaba vacío. Lo delató la
sonda, que devolvió `d: null` —porque `JSON.stringify(NaN)` es `null`— y no la pantalla.
Quedó además una guarda: si la posición de la cabeza no es finita, no se toca el rumbo.

#### Y UNA SONDA QUE SE PISABA A SÍ MISMA

`__V.muere()` arrancaba la secuencia si no estaba corriendo. Cada foto que se quería sacar DURANTE la
muerte empezaba una muerte nueva, así que las cuatro muestras daban `t: 0` y parecía que el reloj no
avanzaba — cuando lo que pasaba era que la sonda lo reiniciaba. Con `'ver'` la sonda sólo mira. Es la
tercera vez en este proyecto que la medición está mal antes que el juego.

#### EL CAMELLO VA MÁS DESPACIO Y EN EL PISO TE ARRASTRÁS

Embestía a **7,4** y acecha a 3,6; ahora **6,2** y 3,1. Con la pierna rota corriendo a 10,2 —y a 8,7
de promedio contando las caídas— la ventaja pasa de un 17 % a un 40 %.

Y `factorRoto()` devolvía **cero** mientras se está en el piso: cada tropiezo era un segundo y medio
de pantalla que no responde, que no se lee como estar caído sino como que el juego se colgó, y encima
con un camello viniendo. Ahora devuelve 0,30 y en el piso no se puede correr. Medido: **0,5 m en 0,4 s
de juego, o sea 1,25 m/s** — era 0.

#### LOS DOS PROPS 3D, Y EL PASO QUE HACE POSIBLE TODO LO DEMÁS

La antorcha y el inflador: una imagen generada con `z_image` y pasada por `image_to_3d`. Tripo
devuelve **30.000 triángulos y un JPEG de 2,5 MB por pieza**, o sea cuatro megas por un palo con un
trapo.

**LA TEXTURA SE HORNEA EN LOS VÉRTICES, Y ÉSE ES EL PASO QUE IMPORTA.** Decimando con la textura
puesta, el simplificador tiene que respetar las costuras de UV y se planta: medido, 30.673 → **11.184
triángulos con `-si` a cualquier valor entre 0,04 y 0,20**, o sea que el parámetro no hacía nada. Sin
UV no hay costuras y baja hasta donde uno quiera. Quedaron en **2.889 y 2.781 triángulos y 50 KB cada
uno**, que es lo que se pidió («low poly») y lo que corresponde a un objeto que se mira a cuarenta
centímetros del ojo en un juego que dibuja a 446×206.

**Y SE CONVIERTE DE sRGB A LINEAL AL MUESTREAR.** glTF trata `COLOR_0` como lineal y una textura de
color como sRGB: copiando el píxel tal cual, todo sale lavado. Más una **desaturación del 42 % al
hornear**, que no es corregir la foto — el post de este juego multiplica la saturación por 2,2, y sin
eso el palo de la antorcha sale rojo fuego. Es la misma corrección que ya costó el cromo del auto.

**NO SE USA `GLTFLoader`.** Lo que sale del horneado es un nodo, una malla, una primitiva y cuatro
accesores con las vistas compactas: para eso alcanza un lector de cuarenta líneas. Bajar el cargador
de three.js de un CDN sería una dependencia más que puede no llegar —este juego depende de que llegue
`three` y de nada más— aparte de una entrada nueva en el importmap.

**Y NO REEMPLAZAN NADA HASTA QUE LLEGAN.** El objeto dibujado por código se arma igual y sus piezas
quedan marcadas con `userData.proc`; cuando la malla está decodificada se apagan y entra la de verdad.
La llama de la antorcha y su luz **siguen siendo de código**, porque una llama no es geometría.

**UN `const` LEÍDO EN SU ZONA MUERTA, POR SEXTA VEZ.** `PROPS.carga()` iba al lado de `cargaUI()`, que
es el sitio temáticamente correcto — y que corre mientras se evalúa `e.js`, o sea antes de que exista
`PROPS`, que es un `const` de `i.js`. Ni siquiera `typeof` lo salva: sobre una declaración en zona
muerta, `typeof` **tira**. Pasó al arranque, después de `armaPanel()`.

#### MEDIDO AL CERRAR

Los cuatro botones del HUD en `contain` · `no-repeat` · fondo transparente, el de saltar de 78×78 con
una sola flecha. Los dos props cargados —**2.889 y 2.781 triángulos**— con 2 y 10 piezas dibujadas por
código apagadas. Arrastrarse en el piso: **1,25 m/s** (era 0). La muerte, jugada de punta a punta
adentro de la cueva: el camello a 4,6 m al empezar, la cabeza llenando el cuadro a 1,1 s, los tres
destellos, el negro, y la vida nueva en `avance 64,3 de 76,3` mirando a la boca, con la pierna rota,
la viñeta encendida, la antorcha de vuelta en la mano y el camello en `embiste` a 10,5 m. Antes de la
llave, alcanzarte deja `MODO` en `juego` y te manda al campamento. **0 NaN** y `window.__errs` vacío en
las siete corridas. El HTML pasó de 1,25 a **1,41 MB**, y esos 160 KB son los dos props.

### Quincuagesimonovena vuelta (2026-08-30): **LEMI** — el menú de madera, el final que vuelve, y menos pixelado

Pedido: *"el menú también cámbialo agrégale imágenes y botones UI, y esas cosas, también termina y
vuelve al menú y sácale un poco lo pixelado"*.

#### EL MENÚ: TRES IMÁGENES Y UN DEFECTO QUE VOLVIÓ

Los dos botones eran píldoras —una de vidrio esmerilado y otra con un degradado verde a celeste— o sea
la biblioteca de widgets de cualquier aplicación. Y el degradado era lo único del menú que no aparece
en ningún otro lado del juego: la isla no tiene un solo píxel celeste que no sea el cielo. Ahora son
**dos tablas clavadas** y un **cartel colgado**, generados y horneados a 192×60 y 208×130, más un
**marco de follaje** que cierra los bordes.

**EL RADIO Y EL VIDRIO SE VAN CON LA CHAPA.** Un `border-radius` de CSS por encima de una tabla que ya
trae su contorno dibujado deja **dos** bordes, uno nítido y uno pixelado, y el nítido gana. Lo mismo el
`backdrop-filter`: una tabla de madera con vidrio esmerilado detrás no es una tabla.

**EL MARCO SE HORNEA GIRADO NOVENTA GRADOS.** El menú vive adentro de `#escenario`, que lleva un
`rotate(90deg)`; una imagen 9:16 puesta ahí se estira a un rectángulo apaisado y las hojas salen
aplastadas. Girada al revés ANTES de guardarla, la rotación del escenario la endereza.

**Y SE DESVANECE HACIA EL CENTRO.** A opacidad pareja el follaje de abajo le caía encima al pie y a la
línea de la historia — medido en la captura, el pie salía partido por una hoja. Con una máscara radial
el marco cierra los bordes y suelta el medio, que es lo único que tiene que hacer.

**EL DEFECTO QUE VOLVIÓ:** con el cartel puesto quedaron el emblema generado arriba **y** la palabra
LEMI escrita en la tabla, o sea el nombre del juego dos veces — que es exactamente lo que este menú ya
había arreglado una vuelta atrás. Saqué el texto y quedó peor: el logo generado es **un sello circular,
no la palabra**, así que el cartel quedó con un emblema dorado y nada que dijera cómo se llama el
juego. Van los dos **en fila y adentro de la misma tabla**: el sello a la izquierda, la palabra a la
derecha, como cualquier chapa de local. Una sola marca, y el nombre se lee.

#### EL FINAL VUELVE AL MENÚ

Se quedaba en negro con el nombre y ahí terminaba todo: el juego entraba en un estado del que no se
sale sin recargar la página. No hay pantalla de victoria con puntaje —tampoco hay una de derrota— pero
eso no es lo mismo que no tener salida. Los **2,6 segundos de negro** son a propósito: cortar del
último plano al menú en el mismo cuadro se lee a que el juego se cerró, no a que se terminó.

**Y LOS DOS CAMINOS DE SALIDA COMPARTEN UNA FUNCIÓN.** `limpiaPartida()` apaga la noche fija, la pierna
rota, la viñeta, la cueva y el modo caza del camello, y devuelve la camioneta a donde estaba
estacionada —la cinemática la mueve noventa metros y el menú orbita justo por ahí—. La llaman el botón
de menú del panel de pausa, el arranque de una partida nueva y el final. Repartido en tres sitios, el
próximo que se agregue va a quedar sin apagar algo: es literalmente lo que acababa de pasar con
`BICHO.caza`.

#### `visibility` ADEMÁS DE `opacity`, Y LA RAZÓN ES EL `backdrop-filter`

Al volver al menú se veían dos barras claras al costado del cartel. Eran los botones de pantalla
completa y de pausa, que viven dentro de `#hud` — y `#hud` estaba en `opacity:0`. **Un
`backdrop-filter` se aplica contra lo que hay DETRÁS del elemento, no contra su propio píxel**, así que
en un padre transparente el navegador lo compone igual. `visibility:hidden` no se compone, y va con
`transition-delay` para que el fundido de salida se llegue a ver antes de desaparecer.

#### EL PIXELADO BAJA A 2,4

Empezó en 2, subió a 3 y ahí se pasó. Con `pix` en 3 y un marco de 892×412 el destino de render queda
en **298×138**, y a esa resolución la cueva, los cuerpos y las ramas sueltas dejan de distinguirse de
las manchas del piso — que en un juego donde hay que ENCONTRAR cosas no es un estilo sino dificultad de
más. En **2,4** el destino queda en **372×172**: un 55 % más de píxeles que en 3 y un 30 % menos que en
2. El escalón se sigue viendo y las copas se vuelven a contar.
**Y ES DECIMAL A PROPÓSITO**: `medir()` divide y redondea, así que el ajuste no tiene por qué ser
entero. Con 2 y 3 como únicas opciones no hay nada entre «casi limpio» y «empastado».

#### MEDIDO AL CERRAR

11 de 11 imágenes cargadas y puestas. Destino de render **372×172** con `pix 2,4`. Menú: los seis
elementos apilados sin un solo solapamiento. Final: `final` → `fin` → **`menu`** solo, con el camello
de vuelta en `ronda` a 193,7 m y la camioneta otra vez en (8,7 · 9,1). `window.__errs` vacío en todas
las corridas.

### Sexagésima vuelta (2026-08-30): **LEMI** — la carga con la piel del juego, calidad e idioma en el menú, y la huida que se puede ganar

Pedido textual: *"agrega una pantalla de carga igual a la del menú inicial porque la pantalla azul es
fea, también elimina el otra isla, y disminuye la pixelacion está muy pixelados hacelo un poco menos,
también lemo cuando te persigue vos corres rápido con la pierna mal pero te caes a veces y agrega
selección gráfica e idioma en el menú de inicio y genera un nuevo logo de LEMI para el menú"*.

#### LA HUIDA NO SE PODÍA GANAR, Y ERA ARITMÉTICA

Es el defecto de fondo de la vuelta y lo encontró el jugador antes que el banco. Con la pierna rota,
correr daba **6,4 m/s** y el camello embiste a **7,4**: o sea que la persecución estaba **decidida
antes de empezar**, hicieras lo que hicieras. Eso no es una huida, es una cuenta regresiva — y encima
el juego te acababa de sacar el control con la escena del susto para meterte en algo que no se puede
jugar.

La vuelta pasada eso lo escribí como una virtud (*«o sea que ahora te alcanza, y llegar al auto deja
de ser un trámite»*), y el error de razonamiento es de los que conviene anotar: **estaba mirando el
problema de a un número por vez**. Bajar la velocidad hace que la huida cueste, sí, pero cuando el
número queda por debajo de la embestida deja de costar y pasa a ser imposible, y las dos cosas se ven
igual desde el código — lo único que las separa es una comparación con OTRO número, que estaba
escrito trescientas líneas más allá.

Ahora correr roto da **10,2**, o sea que se le saca ventaja, y **lo que te pone en peligro son los
tropiezos**: cada cinco a nueve segundos la pierna no responde, te caés, y el camello recupera de una
todo lo que habías ganado. La diferencia no es de dificultad sino de **de qué depende escapar**: antes
de nada, ahora de cuántas veces te trabás y de cuánto tardás en levantarte.

#### LA PANTALLA AZUL SE FUE, Y NO ERA SÓLO FEA

La carga y la elección de idioma eran dos degradados azules con letras finas: la portada de una
aplicación. Y son **lo primero que se ve**, o sea que la primera impresión de este juego era la de
otro juego — con el menú de madera de la vuelta pasada esperando dos pantallas más adelante. Las dos
pasan a la misma piel: fondo de selva, el cartel de madera con el logo, y los tres idiomas como las
mismas tablas que ya son los botones del menú. Una sola familia de controles desde el primer cuadro.

**EL VERDE NO PUEDE DEPENDER DE NINGUNA IMAGEN, y ésa es la parte que hay que hacer bien.** La
pantalla de carga se pinta **antes de que el módulo se haya evaluado siquiera** —para eso existe—, así
que si el fondo fuera el follaje horneado habría un cuadro azul de todos modos justo en el instante
que se quería arreglar. El verde es un degradado de CSS y el follaje entra encima cuando puede.

**Y EL FOLLAJE VA HORNEADO DOS VECES, sin girar y girado.** El menú vive adentro de `#escenario`, que
lleva un `rotate(90deg)` para que un juego apaisado entre en un teléfono vertical; la carga y el
idioma viven **afuera**, porque se leen con el teléfono como uno lo agarra. Poniendo la versión girada
en las dos, las hojas salían aplastadas. Son 16 KB de más por no estirar una imagen a la fuerza.

#### TRES CALIDADES Y TRES IDIOMAS EN EL MENÚ

Las dos filas cambian **lo que cuesta** y no lo que el juego es: la isla, la cueva y el camello son los
mismos en las tres. Lo que se mueve es cuántos píxeles hay que rellenar —que es lo único que siempre
paga, porque todo pasa por el destino de render reducido—, las sombras —que son una pasada entera de
la escena—, las nubes y el viento del pasto.

| | píxel | destino de render | sombras | llamadas | triángulos |
|---|---|---|---|---|---|
| baja | 2,8 | 319×148 | no | 65 | 721k |
| media | 2,0 | **446×206** | sí | 66 | 775k |
| alta | 1,5 | 595×275 | sí | 66 | 775k |

**SE APLICA EN CALIENTE**, que es la lección de RezUno: un ajuste que pide recargar la página no se
prueba — el jugador lo toca una vez, no ve nada y no vuelve. Y **el mapa de sombra hay que soltarlo a
mano**: three.js no recrea la textura porque cambie `mapSize`, se queda con la de antes y el cambio no
hace nada.

**Y EL IDIOMA TAMBIÉN VA EN EL MENÚ Y NO SÓLO EN LA PANTALLA PREVIA.** Elegir mal el idioma en la
primera pantalla obligaba a recargar el juego entero, o sea a volver a sembrar la isla.

**UN DEFECTO PROPIO, Y DE ORDEN:** la ficha del idioma se marcaba desde `window.repintaJuego`, que se
asigna al **final** del arranque —después de sembrar la isla, que son diez segundos— mientras que la
pantalla de idioma se toca en el primer segundo. Medido: con el castellano elegido, la fila del menú
seguía mostrando **EN** resaltada. La llamada pasó adentro de `ponIdioma()`, que es quien sabe que el
idioma cambió.

#### EL PIXELADO BAJA A 2,0 — Y EL RECORRIDO DICE ALGO

Fue 2 → 3 → 2,4 → **2,0**. El 3 empastaba: en un marco de 892×412 deja el destino de render en 298×138
y a esa resolución la cueva, los cuerpos y las ramas sueltas dejan de distinguirse de las manchas del
piso, que en un juego donde hay que **encontrar** cosas no es un estilo sino dificultad de más. En 2,0
el destino queda en 446×206, el escalón se sigue viendo y las copas se vuelven a contar. Y ahora es
además el eje de la selección gráfica, así que el que quiera más grano lo tiene en BAJA.

#### «OTRA ISLA» SE FUE, Y ARRASTRÓ UN REINICIO QUE HACÍA LO MISMO

El botón se sacó del menú. Pero **REINICIAR, en el panel de pausa, llamaba a la misma función**: era
«otra isla» con otro nombre, y encima dejaba puesto todo lo de la partida vieja —las misiones ya
hechas, los objetos plantados en coordenadas que ya no existen, y desde la vuelta pasada también la
pierna rota y la viñeta roja—. Reiniciar en medio de la huida te dejaba **cojeando en una isla recién
sembrada**. Ahora hace los mismos tres pasos que el arranque normal y en el mismo orden: apagar lo de
la partida anterior, replantar las misiones y volver a poner al jugador en el campamento.

Y `resembrar()` se borró entera. Una función viva que ya no llama nadie es una que el día que se toque
va a estar rota sin que nada lo diga; la limpieza que hacía sigue existiendo adentro de `sembrar()`,
así que lo que se fue es el camino y no la maquinaria.

#### EL LOGO DICE «LEMI», Y ESO SACA UN ELEMENTO EN VEZ DE AGREGARLO

El anterior era un **sello circular** —un dibujo, no la palabra—, y por eso el cartel de madera tenía
que llevar además el nombre escrito al lado: dos cosas peleándose el mismo cartel, y la palabra
dibujada con la tipografía del sistema, que es Roboto en Android, San Francisco en iPhone y Segoe en
Windows. O sea que el nombre del juego cambiaba de forma según el aparato.

El nuevo son **cuatro letras de tablones atados con soga y el camello encima de la I**: trae el nombre
dibujado, con la forma que le corresponde a este juego, y pega con la madera del menú y con el
antagonista. Con eso el texto se va y queda **una** imagen adentro del cartel.

De paso pesa **15 KB contra 309**. El anterior era un PNG a todo color de 1024; éste va recortado a su
caja, con el blanco pasado a alfa con la misma rampa que el resto de la interfaz, achicado a 384 de
ancho y **cuantizado a 64 colores** —que es pixel art, o sea que la paleta corta es la forma correcta
y no una degradación—. En base64 son 20 KB contra 412: el HTML baja casi 400 KB.

(Y `Image.MEDIANCUT` no sirve sobre RGBA: PIL sólo acepta `FASTOCTREE` o libimagequant, y lo dice con
un error que nombra los métodos por número.)

#### DOS DEFECTOS DE LA PRUEBA QUE MIDE LA HUIDA, Y SON PEORES QUE UNO DEL JUEGO

Para poder afirmar lo de arriba hay que medir cuánto se avanza corriendo. Las dos primeras corridas
devolvieron números plausibles y los dos estaban mal:

1. **`anda(n, correr)` NO PODÍA CORRER.** Ponía `teclas.ShiftLeft = true`, y correr no es una tecla
   del mapa: es la variable `corre`, que encienden `keydown`/`keyup`. Medido con el defecto puesto,
   «corriendo» daba **5,78 m/s** — que es la velocidad de caminar clavada. Una prueba que no puede
   activar lo que dice medir no falla: contesta.
2. **Y MEDÍA EL TIEMPO CON EL RELOJ DE PARED.** El `dt` del juego está topado en 0,08 s, así que en el
   banco —que dibuja por software y con el píxel en 2,0 baja a **1,7 cuadros por segundo**— un segundo
   de reloj de pared son ocho centésimas de juego. Dividiendo por el reloj de pared, cualquier
   velocidad sale diez veces menor. Va con `RELOJ.value`, que es el reloj que la física usa.

Y de paso: **para medir la huida el banco corre con el píxel en 3,2**. Lo que se mide es la física, no
el dibujo, y a 1,7 cuadros por segundo una corrida de cuatrocientos cuadros son tres minutos.

#### MEDIDO AL CERRAR

La huida, caminada de verdad —con la física, los tropiezos y el recorte del terreno—:

| | metros | segundos de juego | cuadros en el piso | m/s |
|---|---|---|---|---|
| sano, corriendo | 86,8 | 6,9 | 0 | **12,6** |
| roto, caminando | 27,2 | 6,4 | 18 de 90 | **5,5** |
| roto, corriendo | 243,6 | 28,1 | **57 de 400** | **10,4 en movimiento** |

Contando las caídas, la huida rota promedia **8,7 m/s contra los 7,4 de la embestida**: se le gana,
pero por poco y sólo si se corre. El 14 % del tiempo se pasa en el piso.

Reiniciar desde la pausa: vuelve a la **misión 0**, con la pierna sana, la viñeta apagada y el camello
en `ronda`. **0 NaN**.

Menú: las fichas quedan marcadas en el idioma y la calidad elegidos (`es:SEL`, `media:SEL`), el botón
`mOtra` ya no existe, y **cero solapamientos** entre los siete bloques apilados en 412×892. El pie del
menú sigue el idioma en vivo en los tres (`2259 árboles…` · `2259 árvores…` · `2259 trees…`) — y ése era
**un tercer gancho llamado antes de existir**: `window.repintaJuego` se colgaba DESPUÉS del `await` que
espera la elección de idioma, o sea que en el instante en que se elige todavía no estaba, y el pie se
quedaba en inglés bajo un menú en castellano. Las tres calidades se aplican en caliente.
Carga e idioma con la piel de madera y el follaje puesto. `window.__errs` vacío en todas las corridas.
El HTML pasó de **1,61 MB a 1,25 MB**, y esos 360 KB son el logo viejo.

### Quincuagesimoctava vuelta (2026-08-30): **LEMI** — voces, controles de pixel art, y cinco defectos de una lista de siete

Pedido: *"al empezar la Cinemática inicial aparecen caminando para atrás · el auto al final va volando
hacia arriba en vez de tener físicas god · el camello debe aparecer al frente nuestro no atrás porque
nos atrapa apenas queremos salir corriendo · al resetear el juego no nos debe buscar · agrega tts de
voces, y más sonidos · genera imágenes de mejores controles pixel art incluído la nota de objetivos
como hoja de papel · elimina las estadísticas arriba"*.

#### CAMINABAN DE ESPALDAS, Y ERA UNA RESTA AL REVÉS

`p.rotation.y = atan2(sx - c.x, sz - c.z)`. Vienen del auto **hacia** el claro —`d0` baja con `k`— así
que el rumbo es `atan2(c.x - sx, c.z - sz)` y estaba restado al revés: los cuatro entraban al
campamento caminando para atrás. La convención de este rig es la misma en todo el juego —los que
ponen leña miran el fuego con `atan2(destino − propio)`— y sólo esta línea la tenía dada vuelta.

#### EL AUTO VOLABA PORQUE LA ALTURA ESTABA CLAVADA

`a.g.position.set(x, a.y, z)`: `a.y` es la altura del sitio donde estaba **estacionado**, y la
camioneta recorre noventa y dos metros. La isla no es plana, así que a los pocos metros el terreno
bajaba y el auto seguía derecho — se iba volando. Ahora la altura sale de `H()` en cada cuadro.

**Y APOYARLO NO ALCANZA.** Un vehículo que sigue el terreno sin inclinarse se lee a calcomanía que se
desliza. El **cabeceo** sale de medir el suelo 1,9 m adelante y 1,9 atrás —la pendiente de verdad, en
radianes— y el **balanceo** de medirlo a los dos costados, que es literalmente lo que hace un eje. La
altura es el promedio de las cuatro ruedas y no la del centro: con la del centro, en una loma el auto
se hunde y en un pozo flota. Los dos ángulos se suavizan, porque una suspensión no copia el terreno al
instante. Y la mira de la cámara pasó a seguir la altura **del auto** y no la del sitio: si no, en
cuanto el terreno baja el auto se va del cuadro mientras la cámara apunta al aire.

#### EL CAMELLO APARECÍA DEL LADO DE LA SALIDA

La vuelta pasada lo puse mirando a la boca con el argumento de que así quedaba entre uno y la puerta.
Jugado, eso es una trampa: la escena termina y el bicho ya está encima del único camino. Ahora se
planta **hacia el fondo**, o sea de frente: uno levanta la vista, lo ve, se da vuelta y tiene setenta
metros de pasillo — que es justo lo que la pierna rota convierte en una huida. Para que hubiera dónde
plantarlo, **los cuerpos y la llave se corrieron de 7 y 3,2 metros del fondo a 13 y 9**.

#### AL REINICIAR, LA COSA VENÍA DERECHO AL CAMPAMENTO

`BICHO.caza` lo enciende la escena de la llave y no lo apagaba nadie. `ponCamello()` —que lo manda a
120-190 m, lo pone en ronda y apaga la caza— existía y sólo lo llamaban las dos cinemáticas, nunca el
arranque de partida. O sea que empezar de nuevo dejaba al camello **en modo caza, que persigue desde
CUATROCIENTOS metros** contra los 95 del olfato normal. Ahora `INTRO.arranca()` lo llama, y de paso
apaga la pierna rota, la viñeta y —con `cuevaReinicia()`— devuelve las luces guardadas y vuelve a
encender el mundo de afuera, que reiniciar desde adentro de la cueva dejaba apagado.

#### TREINTA VOCES Y OCHO SONIDOS

Las diez frases del guion —siete de la apertura y tres del final— en los tres idiomas, generadas con
`seed_audio`. **Guardan la MISMA CLAVE que el subtítulo** (`g0`..`g6`, `f0`..`f2`): no hay dos listas,
así que lo que se lee y lo que se escucha no pueden decir cosas distintas, y si falta el clip de un
idioma se ve el subtítulo y no suena nada. Se decodifican **sólo las del idioma elegido** —veinte de
las treinta no se van a escuchar nunca en esa partida— y la voz es **una sola fuente**: la nueva corta
a la anterior, porque hay un narrador, o sea una boca.

**Y LA APERTURA PASÓ DE 38 A 40 SEGUNDOS.** El último tramo iba de 34,5 a 38, o sea 3,5 s, y la frase
grabada dura 4,6 en castellano: se cortaba en seco justo en la línea que dice qué hay que hacer.

**LA AGACHADA DE LA MÚSICA NO PUEDE SER UNA RAMPA PROGRAMADA.** `camasPaso()` le escribe la ganancia a
las dos camas todos los cuadros, así que un `linearRampToValueAtTime` se pisa al cuadro siguiente —el
mismo defecto que ya había tenido el parpadeo de la fogata contra el apagado de la cinemática—. Va
como un factor (`CAMA.duck`) que el propio `camasPaso` suaviza. Medido: 0,44 mientras habla, 0,81 al
soltar.

Ocho efectos nuevos: murciélagos, gota, el motor que falla, el que arranca, el golpe de caerse, las
llaves, el latido y la puerta. Cada uno donde corresponde: el motor del final dejó de ser dos sonidos
prestados —`mal`, que es el pitido de equivocarse, y `bomba`, que es el inflador—; caerse suena a
cuerpo contra la piedra y no a una pisada más; el **latido va más rápido cuanto más cerca está el
bicho**, que es lo único que lo convierte en información; y en la cueva la gota y los murciélagos
suenan **al azar y sólo si hay alguno a menos de doce metros**, así que el pasillo suena distinto
según por dónde se vaya.

**Y OTRA VEZ: UN PROMPT QUE PIDE UN SONIDO CHIQUITO DEVUELVE SILENCIO.** `metal` volvió con pico 0,078
y rms 0,0032 pidiendo *un tintineo*; rehecho como *un llavero de hierro tirado al piso de piedra,
fuerte y cerca*, volvió con nivel. Van tres juegos seguidos con la misma lección: **el nivel se pone
en el código, nunca en el prompt.**

#### LOS CONTROLES SON IMÁGENES, Y VAN CHICAS A PROPÓSITO

Joystick, cuatro botones y la hoja de objetivos, generados y horneados con `hornear_ui.py`. Tres cosas
que no son obvias:

- **El recorte va por componentes conectadas y no por una tabla de coordenadas.** La hoja de botones
  vino con siete círculos repartidos a ojo por el modelo; escribir dónde cae cada uno funciona hasta
  que se regenera la imagen y todos se corren veinte píxeles.
- **El fondo se saca por distancia al blanco CON RAMPA.** Estas imágenes traen una sombra suave: con
  un umbral duro, la sombra queda entera y el botón aparece con una mancha gris pegada.
- **Y SE ACHICAN MUCHO.** El juego se dibuja a un tercio de resolución y se estira con NEAREST: un
  control nítido de 512 píxeles sería lo único nítido de la pantalla y se leería como pegado encima.
  Horneados a 40-72 px y estirados con `image-rendering: pixelated`, sus píxeles miden lo mismo que
  los del mundo. Los siete pesan **20 KB**.

El panel de objetivos pasó de una píldora de vidrio oscuro a una **hoja de papel viejo con los bordes
rotos**, y eso da vuelta el color del texto: sobre papel lo único que se lee es tinta oscura. El borde
de color se fue con el vidrio — sobre una hoja rota no hace falta un borde para distinguirla del reloj.
Y el joystick sigue teniendo sus dos círculos dibujados de respaldo: son un WebP en base64 que se
decodifica de forma asincrónica, así que los primeros cuadros tienen que tener joystick igual.

#### ARRIBA VA LA HORA Y NADA MÁS

Estaban los cuadros por segundo, el tamaño del destino de render, el pixelado, las llamadas de dibujo
y los triángulos: cinco números para medir el juego que a quien lo juega no le dicen nada. La hora se
queda porque **no es una estadística**: el camello caza de noche, así que saber qué hora es cambia lo
que uno hace. `fps`, `DIB` y `TRI` se siguen calculando para las sondas del banco.

#### MEDIDO AL CERRAR

7 de 7 imágenes cargadas y puestas (la hoja y los cuatro botones). 10 de 10 voces del idioma elegido
decodificadas, sonando durante la apertura, con las camas agachadas a 0,44 y de vuelta a 0,81.
Al reiniciar, el camello en **`ronda` a 172,9 m** (era caza). La franja de arriba dice `10:17` y nada
más. `window.__errs` vacío en todas las corridas. El HTML pasó de 919 KB a **1,52 MB**, y esos 600 KB
son las treinta voces y los ocho sonidos.

### Quincuagesimoséptima vuelta (2026-08-30): **LEMI** — la cueva por dentro, la pierna rota y el escape

Pedido textual: *"agrega que al tener la llave hay que entrar al auto y escapar también la idea es que
todo se encuentre dentro de la cueva ahí con la antorcha entremos y sea largo el pasillo hayan
murciélagos sangre y después encontremos a los cuerpos grotescamente asesinados y la llave y ahí
recién miramos arriba pero no podemos correr tanto a veces nos trabamos porque estamos rotos de la
pierna nos caemos en la Cinemática al salir corriendo y se pone un viñeta rojo pixelado y después ahí
jugamos hasta llegar al auto y escapar al subirnos hay una cinematica"*. Todo nuevo en
`herramientas/lemi/partes/j.js`; las misiones pasan de cinco a **siete**.

#### EL PASILLO NO TENÍA PAREDES, Y ESTUVE UNA HORA ILUMINÁNDOLO

Es el defecto de la vuelta y explica todo lo demás. El túnel se arma con cuatro tiras por tramo —piso,
dos paredes y techo— y las normales están escritas a mano, apuntando hacia adentro. **El descarte de
caras traseras no mira la normal: mira el ORDEN de los vértices.** Con el orden que emitía, el techo y
las dos paredes quedaban de espaldas al jugador y se tiraban antes de sombrearse.

Y no se veía como "faltan paredes": se veía como "está oscuro". Así que subí el ambiente, subí la
antorcha, cambié el color, barrí cuarenta combinaciones. Los números no cerraban nunca: **con el
ambiente barrido de 0,62 a 2,4 el brillo del destino de render se movía 0,6 sobre 255**, o sea nada. La
que lo dijo fue una prueba de treinta segundos: cambiarle el material al túnel por uno de **normales**.
El pasillo entero salió de **un solo verde —(0,1,0), que es PISO—** y arriba no había nada. Estaba
iluminando un tubo que sólo tenía suelo. `side: DoubleSide` y listo.

**La lección es de método**: cuando subir la luz cuatro veces no cambia el brillo, el problema no es la
luz. Un material de diagnóstico contesta en un cuadro lo que un barrido de parámetros no contesta nunca.

#### Y LA GEOMETRÍA TAMPOCO TENÍA UV

Misma familia: `armaTunel` escribía `position` y `normal` y nada más, con un material que lleva `map`.
**Un `map` sin coordenadas no falla ni avisa**: WebGL le pasa (0,0) al atributo que falta, así que los
setenta y seis metros de pasillo salían pintados con **un solo texel**. Paredes de color plano y liso,
que es exactamente lo que delata a un decorado. Las UV salen de la longitud de arco y del ancho, en
metros, así que la piedra mide lo mismo en el piso, en la pared y en el techo por construcción.

#### TRES COSAS MÁS QUE ILUMINABAN MAL, Y NINGUNA ERA "LA LUZ DE LA CUEVA"

1. **`luzCueva()` corría ANTES que `ponSol()`.** `ponSol` reescribe el sol, la luna y el ambiente todos
   los cuadros: la cueva apagaba el mundo y una línea más abajo el sol volvía a encenderse. La sonda
   devolvía **`sol: 2,55` a setenta metros adentro del cerro** — lo que se veía era el pasillo
   iluminado por el amanecer, y de ahí venía el naranja.
2. **El relleno quedaba prendido.** Es una direccional **celeste** que existe para que la sombra del sol
   no sea negra. Adentro pintaba el techo de turquesa y una pared de azul marino, y yo se lo estaba
   atribuyendo al color del ambiente —que ya estaba en gris neutro y no tenía nada que ver.
3. **El hemisférico con los dos colores iguales no tiene forma.** Un `HemisphereLight` reparte según
   hacia dónde mira la cara; puestos los dos en el mismo gris, **todas las caras reciben exactamente lo
   mismo**: medido, un óvalo malva plano donde no se distinguía el piso del techo. Va claro arriba
   (0xaeaeb0) y casi negro abajo (0x141312), que es lo que hace la luz de una cueva — lo único que
   ilumina está a la altura de la mano.

Y la **saturación baja a 1,25 adentro**. El post multiplica por 2,2, que afuera es lo que hace que el
pasto y el mar se lean; adentro la única luz de color es la antorcha, y saturar por 2,2 una piedra gris
iluminada de naranja devuelve una pared **roja**.

#### EL PASILLO SE ANGOSTA Y AL FINAL SE ABRE

Empezó en 3,4 de medio ancho —**8,6 metros de pared a pared**— y eso no se lee a pasillo, se lee a
galpón; encima con las paredes a cuatro metros la antorcha no llegaba a ninguna. A 2,2 las dos entran
en el cuadro. Y los **últimos catorce metros son una sala**: ahí están los cuerpos y ahí se planta el
camello, que mide 3,90 y no entra en un techo de 3,10. Un tubo que termina en una tapa es un tubo; uno
que termina en una sala es una cueva.

#### EL MUNDO DE AFUERA SE APAGA, Y NO ES UN AHORRO

El pasillo baja 4,5 cm por metro y el cerro no baja igual, así que a partir de la mitad **la superficie
del terreno le pasa por adentro al tubo**: medido en la captura de los 52 m, una mancha de pasto verde
que ocupaba un cuarto del cuadro. Bajarle el piso al pasillo corre el problema unos metros pero no lo
resuelve, porque el mapa de alturas no tiene agujero. Estando adentro no hay un solo píxel de afuera
que sea legítimo, así que se apaga entero. De paso el pasillo pasa a dibujarse con **11 llamadas**.

#### AL ENTRAR SE MIRABA LA PARED DE LA ENTRADA

`JUG.yaw = atan2(-ex,-ez) + PI`. El frente de este motor es `(-sin yaw, -cos yaw)`, así que el rumbo
para mirar hacia `(ex,ez)` es `atan2(-ex,-ez)` **y nada más**: con el `+ PI` de más, entrar a la cueva
te dejaba mirando la tapa de piedra de la boca a dos metros, con el pasillo a la espalda. Lo cantó la
sonda de los cuerpos: los tres daban **`delante: false`** parado a siete metros de ellos.

#### EL CAMELLO APARECÍA NUEVE METROS Y MEDIO EN EL AIRE

`H()` es el mapa de alturas de la isla, o sea **la ladera del cerro**: adentro devuelve el techo de la
montaña. Medido, el camello de la escena de la llave se plantaba en y=29,45 con el jugador en 19,76 —
fuera del cuadro por arriba, o sea que el plano del susto no mostraba nada. Y no alcanzaba con
arreglarlo al plantarlo, porque **`pasoCamello()` lo vuelve a apoyar en `H()` todos los cuadros**. Ahora
hay una sola función, `pisoDe()`, y la usan los tres sitios.
Adentro, además, **el rumbo no se elige**: `rumboLibre()` prueba ocho direcciones buscando una sin
árboles y adentro las ocho están tapadas por la misma pared. Se lo pone sobre el eje del pasillo,
**hacia la boca** — que es por donde hay que salir, o sea que la cosa queda entre uno y la salida.

#### LA VIÑETA ROJA VA EN EL SHADER, Y POR ESO SALE PIXELADA

Empezó como un `box-shadow` de CSS encima del lienzo: un degradado suave y continuo pegado sobre una
imagen escalonada, que se lee como el filtro de daño de otro juego puesto arriba de éste. Ahora es un
uniforme del post-proceso y entra **antes del posterizado**, así que sale con los mismos escalones y los
mismos píxeles gordos que el resto del juego. Y late: más fuerte justo cuando la pierna falla, que es
lo único que convierte el filtro en información en vez de decoración.

#### LA PIERNA ROTA SON TRES COSAS Y NO UNA

Bajar un número no se lee como estar herido, se lee como que el juego se puso pesado. Van las tres:
la velocidad baja **y correr casi no suma** (12,8/5,8 sano contra 6,4/4,6 roto, con la embestida del
camello en 7,4 — o sea que ahora te alcanza); la cámara **cojea** a la mitad de la frecuencia del paso,
que es lo que distingue una renguera de un temblor; y cada siete a trece segundos **la pierna no
responde**, te caés y hay que levantarse. Medido en la huida: 600 cuadros corriendo del fondo del
pasillo hacia la boca, **63 cuadros en el piso**, avance de 70 m a 29,8.

#### LA CINEMÁTICA FINAL NO ENTRA A LA CABINA

La primera versión ponía el ojo "al volante" —35 cm adelante y 42 al costado del origen—. Medido en la
captura, desde el segundo tres el cuadro entero eran **dos paneles rojos y una franja celeste**: el ojo
estaba dentro de la chapa, y no es cuestión de correr los números porque esta camioneta **no tiene
interior modelado**. Lo que sí tiene es un exterior que se ve bien, así que el plano es de afuera: tres
cuartos a seis metros, la cámara se acerca despacio, el motor falla y arranca —con el sacudón en la
cámara, que un motor que no prende además se SIENTE— y la camioneta se va mientras el bicho sale del
monte demasiado tarde. Y la antorcha se apaga: cuelga de la cámara, así que en un plano de afuera
quedaba una llama flotando en el medio del cuadro.

#### MEDIDO AL CERRAR

Partida completa desde la cueva: entrar, los **3 cuerpos** con `delante: true` a 7-11 m, los **26
murciélagos** y la sangre, agarrar las llaves, la escena de la llave con el camello encuadrado
(y [0,20 · 0,78] del cuadro), la pierna rota con la viñeta en 0,49, la huida con 63 cuadros de caída,
el auto y `MODO: 'final'`. **Cero errores de página** en todas las corridas. Costo adentro: **11
llamadas de dibujo y 2,3k triángulos**, 36-43 fps con SwiftShader.

### Quincuagesimosexta vuelta (2026-08-30): **LEMI** — tres idiomas, dos escenas nuevas, el inflador y la llave rehecha

Pedido: *"la animación de agarrando la llave re nada que ver, también ahí nunca más se tiene que hacer
de día debe ser programado, también debe haber un modelo 3D de inflador, también selector de idiomas
antes de empezar a jugar, también te faltó el que llegaban al campamento y después comenzaban a armar
todo, también están mal sentados, y falta mejores animaciones y pixelacion en 3-4 mejor, también todos
los sonidos generados por IA de Rezona lab, fíjate que puedo hacer y por qué no anda"*.

#### POR QUÉ NO ANDABA REZONA: DOS COSAS, Y NINGUNA ERA DEL JUEGO

1. **La entrada del MCP apuntaba a una URL que no es un MCP.** En `.mcp.json` estaba
   `rezona-lab → https://lab.rezona.ai/mcp`. Medido: un `GET` ahí devuelve **200 con
   `content-type: text/html`** —la página web— y el `POST` que hace el cliente devuelve **405 de
   nginx**. Probadas también `/api/mcp`, `/mcp/`, `/sse` y `/mcp/sse`: las cuatro, 405. El transporte
   que sí existe es el paquete de npm en modo stdio.
2. **La cola de generación está parada, y no por falta de lugares.** El tope son **12 en vuelo**, y las
   8 de la vuelta anterior siguen ahí. Pero lo que importa es lo otro: **cuatro sonidos enviados con la
   sesión nueva y sana quedaron igual de trabados**, en `pending` con `progress: null` cuarenta minutos
   después. O sea que liberar lugares no arreglaría nada. Y el tope es **por cuenta y no por proyecto**:
   comprobado creando un proyecto nuevo, que da el mismo error. **No hay forma de cancelar**: el cliente
   tiene exactamente cuatro rutas —`/api/projects/{id}`, `/versions`, `/generations`,
   `/rezona/publish`— más `/api/generations/status`, todas POST, y ninguna cancela.

#### LOS TRES IDIOMAS, Y LA PANTALLA VA ANTES DEL MENÚ

Elegir idioma dentro de un menú ya escrito en un idioma que no entendés no sirve: para cuando lo
encontrás ya leíste todo lo demás sin entenderlo. La isla se siembra mientras tanto, que son segundos
que no dependen de qué idioma se elija.

**Las misiones y el guion guardan la CLAVE y no el texto.** Con el texto ya resuelto adentro, la lista
se arma una sola vez al empezar y cambiar de idioma en medio de la partida deja el panel en el idioma
viejo hasta la misión siguiente. Es la misma corrección que en Z Force costó 107 claves.

**Y probé meter la pantalla adentro de `#escenario` para que girara con el menú: no se ve.**
`#escenario` lleva un `transform`, y un `transform` crea contexto de apilado, así que el z-index 95 de
adentro **no le gana** al 90 de `#carga`, que está afuera. Queda afuera y sin girar, que además es
coherente con la pantalla de carga que viene justo antes.

#### LA CINEMÁTICA DE LA LLAVE: EL PROBLEMA ERA EL ENCUADRE, NO LA MANO

Eran dos antebrazos cuadrados subiendo y bajando juntos. Se rehizo entero —muñeca con pivote, palma,
cuatro dedos y pulgar, cada uno con su nudillo; los dedos se abren mientras la mano llega y se cierran
**recién cuando llegó**, que con una sola curva se cerraban en el aire— y aun así seguía sin leerse.

**La proporción estaba mal:** antebrazo 0,26 y mano entera 0,10, cuando una mano es **dos tercios** del
antebrazo. Por eso se leían a postes.

**Y aun corregida no alcanzaba.** Mirada desde arriba, una mano de cajas a cuarenta píxeles **es** una
caja. Probé cuatro encuadres del agarre a ras del suelo y ninguno se leía; uno de ellos —girar los dos
brazos hacia adentro para que convergieran— midió **peor**: con medio radián de guiñada la palma se
despega del antebrazo y las dos piezas se leen como bloques sueltos. A esta resolución lo único que se
lee es el **contorno**, y un contorno partido no se lee.

Lo que funciona es lo que hacen todos los juegos en primera persona: **agarrar abajo, donde no importa
que se vea poco, y LEVANTAR el objeto hasta el ojo**. Medido, la llave queda en x 0,48–0,67 e
y 0,24–0,56.

Tres cosas más que salieron de mirar la captura:
- **La antorcha tapaba el plano.** Su llama es amarillo puro sin luz y quedaba delante de la mano, que
  salía en silueta. Se guarda durante la escena — y encima tiene sentido: para juntar algo con las dos
  manos hay que soltar lo que llevabas.
- **La luz de relleno quemaba las manos.** Pegada a la cámara, lo que está a cuarenta centímetros
  recibe **dieciséis veces** más que lo que está a seis metros y medio: los dos brazos salían blancos
  puros. Corrida dos metros adelante, la relación cae a 2,7.
- **Y el camello volvió a salir con un tronco cruzándolo.** El rayo que elige el rumbo era **uno solo,
  por el centro**, y un tronco al costado no descarta la dirección. Van tres, separados el ancho del
  animal.

#### ESTABAN SENTADOS EN EL AIRE, Y ERAN DOS LISTAS

Los troncos a radio 3,5 en los ángulos 0,50 · 2,59 · 4,69; la gente a radio 3,4 en 5,55 · 3,62 · 4,58 ·
0,28. **Ninguno coincidía.** Dos listas que describen la misma cosa y que nadie mantiene juntas terminan
así siempre. Ahora el tronco se construye y en el mismo paso deja anotado dónde se sienta uno encima,
con la altura de **su** tapa. Cuatro asientos en tres troncos: el primero lleva dos, porque un cuarto
tronco taparía el hueco por donde se entra al círculo.

Y la pose salía del tanteo: muslo −1,42 y rodilla +1,05 suman −0,37, o sea **la pantorrilla 21° hacia
adelante**, que es alguien resbalándose. Sentarse es muslo horizontal (−π/2) y pantorrilla a plomo
(+π/2), escrito como la cuenta y no como el número.

#### LAS DOS ESCENAS QUE FALTABAN

La apertura pasa de cuatro tiempos a seis y de 31 a 38 segundos: **llegan** al claro con el sitio
todavía pelado —sin carpas y sin fuego, que es lo que hace que la siguiente se lea como que lo armaron
ellos— y **arman todo**, dos poniendo troncos hasta prender la fogata y dos levantando las carpas, que
van saliendo del piso una por una. Cada uno hace **una** cosa y se queda en su sitio: cuatro personas
yendo y viniendo se leen a caos.

**Los tiempos pasan a una tabla.** Estaban como números sueltos repartidos por toda la función —el sol
miraba 12, el fuego 9 y 22,5, la noche 12 y 22,5— y agregar una escena al principio obligaba a
encontrarlos todos.

**Y el parpadeo del fuego pisaba el apagado.** Esa línea corre todos los cuadros y escribe la intensidad
entera, así que apagar la fogata desde la cinemática no servía de nada: se volvía a prender al cuadro
siguiente. `FUEGO_ON` decide si hay fuego; el parpadeo sólo lo hace latir.

**La cámara de la llegada caía DENTRO de la camioneta** —el plano salía todo rojo— porque estaba sobre
la misma línea por la que vienen. Va al costado, y mira el punto que sale de la misma cuenta que los
coloca. Medido: **4 de 4 en el cuadro** en las cinco escenas en que están, y 0 de 4 en la mañana.

#### LA NOCHE SE CLAVA, Y EL PIXELADO SUBE A 3

Después de la llave el reloj deja de correr y la hora baja hasta medianoche cerrada y se queda: con el
ciclo andando, a los pocos minutos amanecía y la persecución quedaba a pleno sol sobre pasto verde, o
sea lo contrario de lo que la escena acaba de plantar. Baja en unos segundos y no de golpe.

`CFG.pix` de 2 a 3: el destino de render pasa de 446×206 a **298×138**. Comparados los tres al lado, en
2 se lee a «3D con poco filtro» y en 4 el bosque del fondo se empasta y las copas dejan de contarse.

#### LAS ANIMACIONES, Y LA SONDA QUE LAS PRUEBA

El ritmo de la caminata sale de la velocidad y la zancada (`ω = π·v/zancada`). Estaba en
`t*(2,4 + v*1,2)*2` con `v` valiendo 0,55 o 0,7 —un número que no era la velocidad de nada— así que los
pies patinaban, que es el mismo defecto que en RECREO tenía a Baldi a 2,7 metros por paso. Más:
basculación de pelvis, tronco girando al revés que la cadera, cabeza que compensa el rebote, cambio de
peso en la pose quieta, y respiración corta y rápida en la de alerta —que con `k` en 1 no movía
**nada**, porque todos los términos vivos iban multiplicados por `(1−k)`—.

| | pie (z) | mano | cabeza |
|---|---|---|---|
| camina 1,65 m/s | 0,343 | 0,19 | 0,044 |
| camina 1,20 | 0,295 | 0,16 | 0,044 |
| quieto | 0,038 | 0,053 | 0,040 |
| leña | 0 | 0,103 | 0,018 |
| sentado | 0,027 | 0,061 | 0,033 |
| alerta | 0 | 0,014 | 0,027 |

**Y la sonda tuvo tres defectos propios que valen más que los números:**
- **Los centinelas del mínimo estaban en ±9 y la isla llega a 22 m de altura**, así que
  `Math.min(9, 22.4)` devuelve 9 para siempre: un pie que se mueve tres centímetros medía **13,44 m**.
  Un centinela que puede caer dentro del rango de los datos no es un centinela.
- **La ventana era de 2 s y las cosas lentas no entraban:** el cambio de peso dura quince segundos.
  Decía «no se mueve» sobre movimientos que sí están.
- **Medir el PIVOTE del cuello no ve el giro de la cabeza**, porque girar un pivote no mueve su propio
  origen. Y por lo mismo, el giro en Y que tenía la pose de la leña movía la cabeza exactamente cero:
  está sobre el eje. Lo que mueve una cabeza es asentir.

#### EL INFLADOR

Buscar el inflador en el auto era tocar un botón y que un cartel dijera que ya lo tenías: el objeto de
la segunda misión **no existía en ninguna parte**. Bomba de pie con pedales, cilindro, manija en T,
manómetro y la manguera enroscada. **La misma función arma las dos copias** con un parámetro de escala
—la de la caja de la camioneta y la de la mano— porque con dos modelos el de la mano no sería el que se
levantó del auto. Medido: puesta a −0,46 caía en y 0,83–1,13, con el 83 % por debajo del borde;
corregida queda en 31,3 % del alto. Y la caja está **detrás de la cabina**: la cuenta anterior lo dejaba
a 1,10 del centro, o sea adentro de la cabina.

#### MEDIDO AL CERRAR

Los tres idiomas cambiando el panel de misión y el cartel de lo que hay cerca en vivo. Partida completa
por el mismo camino que usa el jugador. `window.__errs` vacío y **0 NaN** en todas las corridas. El HTML
quedó en **919 KB**.

#### LOS DIEZ SONIDOS, Y SALIERON POR HIGGSFIELD

La cola de Rezona no se destrabó nunca —**y borrar el proyecto tampoco las libera**: comprobado,
las doce tareas siguen contestando `pending` con el proyecto ya inexistente, y siguen contando contra
el tope de la cuenta—. Así que se generaron con Higgsfield: `mirelo_text_to_audio` para los ocho
efectos y `sonilo_music` para las dos camas.

**TRES SALIERON MUDOS, y se vio midiendo y no escuchando.** `ok` daba pico **0,002**, `tela` 0,011 y
`bomba` 0,019 — archivos de tamaño normal, con contenido, y en silencio. Se rehicieron con prompts que
dicen *fuerte, cerca y seco* y que describen el **objeto físico**: «una campanita golpeada dos veces»
en vez de «un chime de confirmación». La tela costó tres intentos.

Dos cosas del horneado:
- **Se nivela por RMS y no por pico.** El pico no sabe cuánto dura: nivelando por pico, un chasquido
  de dos centésimas queda tan «fuerte» como un grito sostenido.
- **Y hace falta una `tanh` antes de nivelar.** Un clip con pico 0,92 y rms 0,020 —el fogonazo del
  encendedor— **no se puede subir**: el tope de pico lo baja todo de nuevo. Aplastando la punta con
  una curva suave, el mismo clip llega a 0,040.

**Las dos camas suenan siempre las dos** y lo que cambia es la ganancia cruzada. Con un tema que se
corta y arranca otro, el cambio de hora se escucharía como un corte.

**La pisada va atada a la fase del paso y no a un temporizador**, que es la corrección que en Maicol
convirtió veinticuatro pisadas por segundo superpuestas —o sea ruido blanco— en un trote.

Medido con el analizador colgado del maestro, que es lo único que prueba que sonó:

| | rms | contra el fondo |
|---|---|---|
| fondo (sólo la cama) | 0,0054 | — |
| pisada | 0,0141 | 2,6× |
| **grito del camello** | **0,0887** | **16×** |

Los diez decodifican. El cruce día/noche: poniendo el sol en 0,92, las camas pasan de 0,63/0 a
0,27/0,54 en cinco segundos. 219 KB en base64; el HTML queda en **919 KB**.

### Quincuagesimoquinta vuelta (2026-08-30): **LEMI** — el día tiene cinco misiones, hay una cueva y el camello te encuentra

Pedido: *"el auto no debe llegar y que ya esté todo armado, tambien el camello no debe aparecer
solamente debe aparecer una cinematica de como Lemi se preocupa al escuchar un ruido, también después
se van a dormir y ahí Lemi despierta sin sus amigos y hay rastros de sangre ... 5 misiones objetivos
del día ... juntar 5 ramas ... buscar el inflador en el auto y agacharte e inflar ... una pantallita
de minijuego donde hay una barra con una línea ... 7 veces ... seguir rastros de sangre ... una cueva
procedural en el terreno ... al llegar no te dejé pasar ... armarte una antorcha recolectando una
rama, romper una carpa, enliarla y prenderla fuego con un encendedor en el auto ... buscar las llaves
del auto, en eso te persigue el camello ... una cinematica en primera persona de como agarras con los
brazos la llave, y miras arriba y está el camello viéndote ... una cara creepy para meterla como
textura al camello"*.

Las misiones viven en `herramientas/lemi/partes/i.js`, que es archivo nuevo.

#### TODO PASA POR UNA SOLA LISTA

`COSAS` es el registro de cada cosa del mundo con la que se puede hacer algo: su posición, su radio y
qué pasa al usarla. El bucle busca la más cercana y de ahí salen **el cartel y el botón USAR**. Con un
`if` por objeto desparramado, el próximo que se agregue queda sin cartel y nadie se entera hasta
jugarlo. Y el radio es generoso —2,8 m— por la misma razón que el blanco de los bichos de RECREO: lo
que tiene que costar es llegar, no clavar el píxel.

**Y `usa()` NO SE APOYA EN LO QUE DEJÓ EL CUADRO ANTERIOR.** La primera versión leía `this.cerca`, que
lo escribe `paso()`: dos funciones, una lee lo que la otra dejó, y eso funciona hasta el día en que
cambia el orden del bucle. Las dos llaman a `buscaCerca()`.

**LA RUEDA GANABA EL CARTEL ANTES DE TIEMPO.** Parado junto a la camioneta, la rueda queda **más
cerca** que el centro del auto —medido, 1,62 m contra 1,70— así que el cartel decía «agachate a
inflar» para después contestar que falta el inflador. Con la marca `requiere`, hasta tenerlo la única
cosa usable ahí es la camioneta.

#### EL MINIJUEGO: EL BLOQUE SE ANGOSTA, LA LÍNEA NO ACELERA

De 22 % a 9 % del ancho de la barra a lo largo de los siete golpes, medido: 0,220 · 0,198 · 0,177 ·
0,155 · 0,133 · 0,112 · 0,090. **La línea NO acelera** a propósito: lo que sube es la puntería, no el
reflejo, y con las dos cosas a la vez el último golpe sería lotería. **Fallar no reinicia** —perder
seis golpes por uno malo convierte treinta segundos en cinco minutos y nada en el pedido lo pide—, y
el centro del bloque nunca queda pegado al borde, porque ahí la línea rebota y la ventana se duplica
sola: el golpe más difícil saldría más fácil.

**Y `cierra()` TUVO QUE HACERSE IDEMPOTENTE.** El cierre llega por un `setTimeout` de 0,7 s y en ese
rato el botón sigue vivo: dos toques rápidos al final agendaban **dos** cierres y cada uno avanzaba
una misión. Medido, los siete golpes dejaban el juego en la misión 4 en vez de la 2, **salteando el
rastro y la antorcha enteros**.

#### LA CUEVA SE EXCAVA EN LA FUNCIÓN DE ALTURA

`H(x,z)` le resta un cuenco de 12,5 m de radio y 5,4 de hondo. Pero un cuenco en un prado se lee a
pozo, no a cueva: hace falta ladera. Así que la misma función **le suma un cerro** de 40 m de radio y
18 de alto **centrado veinte metros detrás de la boca**, multiplicado por la máscara de la isla. En la
boca las dos cosas casi se cancelan (+4,5 contra −5,4) y lo que crece es todo lo que hay alrededor.

**Y EL NEGRO DEL FONDO HUBO QUE TRAERLO ADELANTE.** Estaba a dieciocho metros, con un túnel largo por
delante. Pero ese cerro sube **2,8 m en los primeros tres metros y 6,3 en cinco**, así que el túnel y
su fondo quedaban **enterrados**: en la captura no había agujero, había un montón de piedras oscuras
sobre el pasto. Con el negro a metro y medio de la boca —delante de donde el suelo empieza a trepar—
el arco se lee como lo que es.

#### LA CINEMÁTICA DE LA LLAVE, Y EL DEFECTO QUE LA SONDA NO VEÍA

**EL CAMELLO SE PLANTABA DETRÁS DEL JUGADOR.** El adelante de esta cámara es `(-sin yaw, -cos yaw)` y
estaba escrito `(+sin, +cos)`, así que el bicho quedaba siete metros y medio **a la espalda**. Y la
sonda decía que estaba en cuadro: **un punto detrás de la cámara proyecta igual, dado vuelta, y cae
dentro del rectángulo**. Es la misma trampa que en RECREO dio un autobús «entero y centrado» con la
cámara mirando para el otro lado. Comprobado midiendo lo único que no miente: con la malla apagada y
encendida, **cero píxeles de diferencia en 367.504** — no se estaba dibujando, el recorte del frustum
lo descartaba. Ahora `donde()` mira también la profundidad y devuelve `delante`.

**Y LA SONDA MEDÍA UN CUADRO QUE NO ERA EL QUE SE FOTOGRAFIABA.** `LLAVE.paso()` no mueve la cámara:
mueve `JUG.pitch`, y quien lo copia a `cam.rotation.x` es `ponCam`, que corre en el bucle. Midiendo
justo después de `paso(0)` se proyectaba con la cámara del instante anterior. El gancho llama a
`ponCam(0)` y a `pasoCamello(0)` antes de proyectar.

**DE FRENTE UN CAMELLO ES UNA COLUMNA.** Medido, la silueta ocupaba el **1,7 % del cuadro**, porque lo
que se ve de frente son ochenta y seis centímetros de pecho. Lo que lo hace grande es el largo, así
que se lo planta **girado cuarenta grados** y con el **cuello girado lo mismo para el otro lado**: el
cuerpo de tres cuartos y la cara mirándote, que es lo que se pidió.

**CUÁNTO SE LEVANTA LA VISTA SE CALCULA.** Estaba clavado en +0,10 rad, sacado de suponer que los dos
pisan la misma altura. No la pisan: la llave está al lado de la cueva, que está en una ladera, y ahí
la cabeza terminaba **diecisiete centésimas de pantalla por encima del borde** y en el cuadro se veían
cuatro patas. Ahora se promedian el ángulo a la cabeza y el ángulo a las patas. Medido después:
**y 0,16–0,78 del alto**.

**Y LA DIRECCIÓN SE ELIGE MIRANDO SI HAY ALGO EN EL MEDIO.** Plantado en el rumbo en el que uno venía,
el camello salió con **un tronco de árbol cruzándolo por la mitad**. Se prueban ocho rumbos con un
rayo desde el ojo y se toma el primero con la vista libre — el mismo defecto que en Vecindario dejó el
farol roto justo entre la cámara y la casa fea.

**UNA LUZ EN EL OJO, Y SÓLO CUANDO SE LEVANTA LA VISTA.** El bicho se planta contra el cielo, o sea a
contraluz, y la cara —que es la textura que este pedido pide que se vea— salía en un marrón casi
negro. Una luz colgada de la cámara es el flash de una foto de noche. Encendida desde el primer cuadro
quemaba las manos a medio metro (**dos brazos blancos puros y el pasto plano**), así que sube con el
mismo número que levanta la vista.

**Y LA LLAVE SALÍA CELESTE, POR CUARTA VEZ EN ESTE JUEGO.** En el momento en que se la agarra la única
luz es el cielo, que es azul; un gris bajo cielo azul pasado por la saturación del post-proceso sale
cian. Va de bronce y con emisivo. Además **cuelga de la mano derecha y no del grupo** —suelta se
quedaba quieta mientras el brazo subía— y **atravesada y no apuntando adelante**, que de punta eran
dos píxeles de canto asomando por encima del puño.

#### LA APERTURA CAMBIA: NO LLEGA NADIE Y NO APARECE EL CAMELLO

Cuatro tiempos: los cuatro en la fogata al atardecer · **el ruido** · se van a dormir · Lemi se
despierta solo. El auto ya está estacionado desde el primer cuadro y el camello no sale.

**LA ESCENA DEL RUIDO COSTÓ TRES ENCUADRES Y LOS TRES ERRORES ERAN DISTINTOS:**
1. **Detrás de él:** se ve lo que él mira —oscuridad— y no se lo ve a él. Medido, ocupaba el 68 % del
   alto y en la captura no se distinguía nada.
2. **Delante de él, con el monte oscuro puesto a mano:** ese rumbo caía **del otro lado del
   campamento**, así que Lemi se daba vuelta para mirar por encima de la fogata y **la cámara
   terminaba adentro del fuego** —medido, la fogata ocupaba el 310 % del alto y todo salía rojo—. Lo
   que hay a espaldas de alguien sentado alrededor de un fuego es el bosque, y ésa es la dirección.
3. **Y aun bien encuadrado era una silueta negra**, porque termina de espaldas al fuego. Un farolito
   que sólo se enciende en ese tramo lo resuelve sin tocar los otros tres.

**EL RASTRO SE PLANTA AL EMPEZAR LA CINEMÁTICA Y NO AL TERMINARLA.** El último pie dice «sólo un
rastro que salía del campamento» y lo construye `MIS.arma()`, que corría recién al entrar al juego: el
plano que lo nombra mostraba pasto limpio. Ahora las misiones se arman en `INTRO.arranca()` y lo único
que se esconde es el panel de objetivos.

**Y ESE ÚLTIMO PLANO VIAJA.** Con una sola posición no entran las dos cosas: el campamento vacío pide
estar lejos y las manchas piden estar cerca —miden medio metro y el cuadro abre 108° en horizontal—.
La cámara va del campamento al principio del rastro mientras baja, que además es lo que hace alguien
que se levanta y camina hasta lo que encontró.

#### Y TE AGARRABA ANTES DE QUE PUDIERAS ARRANCAR

Terminando la cinemática con el bicho a seis metros y medio y embistiendo a 7,4 m/s, el **primer
cuadro de partida ya venía con el golpe puesto** y el camello a ciento treinta metros: la escena del
susto terminaba en un castigo que nadie pudo evitar. A diez metros y con nueve décimas de quedarse
clavado —lo que tarda uno en ponerse a correr— la persecución empieza a la par, y correr son 12,8
contra 7,4.

#### MEDIDO AL CERRAR

Partida completa por el mismo camino que usa el jugador: **5 ramas → inflador → rueda → los 7 golpes
del minijuego → la cueva → lona y encendedor → «Las llaves» → la cinemática → `modo juego` con el
camello en `embiste` a 10,5 m**. Antorcha en la mano al 46,6 % del alto y 8,1 % del ancho. Camello en
el plano del susto: **x 0,42–0,61 · y 0,16–0,78, delante de la cámara**. Cero solapamientos entre los
seis elementos del HUD en 412×892. `window.__errs` vacío y **0 NaN** en todas las corridas. El HTML
quedó en **630 KB**.

**Lo que no se pudo hacer:** los ocho pedidos a Rezona —tres logos, la cara del camello y los cuatro
modelos 3D (camello, auto, carpa, personaje)— siguen en `pending` después de horas. El juego no
depende de ellos: la cara creepy está dibujada por código en un lienzo de 32 px y va en la cara +Z de
la cabeza, y todo lo demás sigue siendo procedural.

### Quincuagesimocuarta vuelta (2026-08-30): **LEMI** — el séptimo juego: carpas, el auto, el camello y una apertura de tres escenas

Pedido: *"mejora las carpas, también agrega mejores pastos y árboles, también que la Cinemática de
fondo del menú no esté invertida y que el logo generes con Rezona un mejor logo goty, y agrega una
historia como de un camello asesino, nosotros somos Lemi, y veníamos a acampar con nuestros amigos a
esta isla, agrega autos en el mapa cerca uno, uno nomás, y bien detallado y texturas piexl art,
también agrega una cinematica al empezar el juego del auto llegando a la isla, después cambia de
escena de los 3 amigos con Lemi 4 haciendo la fogata y poniendo los troncos todo god y animado
cartoon, y después una dónde están sentados todos de noche, y después haz que de esa Cinemática
empiece el juego"*.

El juego venía de afuera como `lemi.html` (se llamaba «Vergel»). Ahora es `juegos-pc/Lemi.html`,
partido en `herramientas/lemi/partes/` y armado con `python3 herramientas/lemi/armar.py` — el
armado se comprobó reproduciendo el original BYTE POR BYTE antes de tocar una línea.

#### «LA CINEMÁTICA DEL MENÚ ESTÁ INVERTIDA»: ERA EL ORDEN DEL EULER

El horizonte del menú salía torcido, y torcido **de a poco distinto en cada instante**, que es lo que
se lee como que la imagen está dada vuelta. Aislado en un solo cuadro: `cam.lookAt()` deja la cámara
con **0,00°** de inclinación y la línea siguiente, `cam.rotation.z = deriva`, la deja con **29,81°**.

La causa es el orden del Euler. Escribir `rotation.z` recompone la rotación ENTERA desde el Euler, y
el orden de fábrica es `XYZ`, o sea R = Rx·Ry·Rz: el cabeceo se aplica alrededor del eje X **del
mundo** después del giro, y eso ladea el horizonte tanto más cuanto más grande sea el giro. Como la
cámara del menú ORBITA, el giro barre la vuelta entera y la inclinación va y viene: medido 17,3° en
un instante y 29,8° en otro. El juego no lo sufría porque `ponCam` pone `rotation.order='YXZ'`, que
es el orden correcto para una cámara de girar-y-cabecear; pero el menú corre **antes de que `ponCam`
haya existido siquiera una vez**. La deriva pasó a aplicarse como cuaternión local
(`cam.quaternion.multiply`), que gira sobre el eje óptico y no depende de ningún orden. Medido
después: **0,10°**.

**Y EL ENCUADRE NO ENTRABA CIELO.** Con la cámara 11 a 24 m por encima de un radio de 34 a 56, el
cabeceo daba 20 a 30° hacia abajo y el teleobjetivo abre 15° para arriba del eje: el borde superior
del cuadro caía **por debajo del horizonte** y el menú era una alfombra verde. Si el horizonte va a
la fracción f del alto, el cabeceo vale `mediaAbertura·(1−2f)`; con f = 0,26 son 6,6°, o sea
alto = radio × 0,116 **por encima del punto al que mira**, que no es lo mismo que por encima del
suelo. Medido después: cabeceo 7,28° y horizonte en **0,257** del alto.

#### DOS DEFECTOS QUE VENÍAN DE ANTES Y NO SE VEÍAN

- **«Otra isla» devolvía una isla SIN UN SOLO ÁRBOL.** El barrido de limpieza hacía
  `g.geometry.dispose()` sobre todo lo de `GRUPOS`, y ahí no hay sólo mallas: el campamento y los
  otros tres sitios se guardan como `Group`, y un Group **no tiene `geometry`**. La primera vuelta
  del `forEach` tiraba un TypeError que se llevaba puesto el sembrado entero — y no aparecía en
  `window.__errs` porque una promesa rechazada no dispara el evento `error` de la ventana. Medido:
  **96 llamadas de dibujo y 747k triángulos antes de tocar el botón, 23 y 282k después**. Con el
  barrido recursivo, 97 y 762k.
- **Al SALTEAR la apertura, el auto se quedaba a setenta metros.** La escena 1 lo hace entrar desde
  78 m; salteando en el segundo 1, la partida empezaba sin camioneta. Se veía como que el auto no
  existía, y la proyección lo confirmó: la caja ocupaba el **2,3 %** del alto del cuadro donde le
  tocaba el 26 % — que es justo lo que da un objeto de dos metros a setenta. `termina()` ahora lo
  devuelve a su lugar. Medido después: **57,9 %** a seis metros y medio.

#### LAS CARPAS: UNA CARPA NO ES UN TECHO A DOS AGUAS

Eran tres rectángulos de lona. Ahora son iglús de verdad: la tela es media cápsula
(`SphereGeometry` cortada por phi, que ya trae la curvatura), dos **arcos** cruzados, una **puerta**
con el faldón enrollado al lado, un **sobretecho** un 10 % más afuera que **no llega al suelo** —la
franja de sombra entre las dos telas es lo único que hace que se lean como dos y no como una—,
cuatro vientos con estaca y una mochila tirada al lado. Tres colores, porque tres carpas idénticas se
leen a copia y pega. **Y las tres miran al fuego**: antes se orientaban con un `+Math.random()` y
alguna quedaba de espaldas.

**FUNDIDAS EN TRES MALLAS Y NO EN QUINCE.** Sueltas, cada pieza es una llamada de dibujo, y con las
sombras encendidas se paga dos veces: la carpa nueva sola había subido el cuadro de 70 a 96 llamadas.
`fundir()` transforma cada pieza y hornea las posiciones en los vértices — con índice en Uint32 y no
Uint16, que un auto entero no entra en 65.535 vértices y el desborde no avisa: dibuja triángulos que
apuntan a cualquier lado.

#### EL AUTO: UNO, DETALLADO, CON TEXTURAS DE PÍXEL

Camioneta de 4,30 m en cinco mallas fundidas —chapa, vidrio, goma, cromo, luces—. Cuerpo en dos
bloques (el bajo y la cabina más angosta) porque un solo prisma se lee a ladrillo; capó más bajo que
el techo; guardabarros; estribo; parabrisas inclinado; parrilla; equipaje atado arriba; auxilio
atrás; espejos. Las texturas son lienzos de 32 píxeles dibujados con `fillRect` y filtro NEAREST,
igual que la corteza y el pasto: **una foto acá se vería pegada encima**.

Cuatro cosas salieron de mirar capturas:
- **Las ruedas eran dos manchas negras planas.** El negro absoluto no tiene sombreado que mostrar,
  así que la pieza pierde el volumen y se lee a agujero en la carrocería. Goma a gris oscuro y, sobre
  todo, **llanta**: el centro claro es lo que convierte un disco en rueda.
- **El cromo salía CIAN.** Este juego satura al tope en el post-proceso, así que cualquier gris con
  un pelo de azul se va a celeste. Gris cálido.
- **La parrilla era un bloque oscuro entre los dos faros.** Tenía su textura de listones escrita y
  sin usar.
- **Los faros eran dos rectángulos amarillos flotando de noche.** Estaban en `MeshBasic`, que ignora
  la luz. Un auto **estacionado** tiene las luces apagadas: lo que se ve de su óptica es el reflejo.
  Pasaron a Lambert con un emisivo bajo; los haces de verdad son dos `SpotLight` que enciende la
  cinemática.
- Y **el claro del campamento creció de 13 a 17 m**: la camioneta está a 12,6 del centro y mide 4,3,
  así que con el claro viejo había un tronco justo delante del capó.

#### PASTO Y ÁRBOLES

- **La brizna pasó de 32 a 48 píxeles**, de 7 a 11 hojas, con curva en vez de inclinación recta, una
  de cada cinco seca y una de cada seis con espiga. Y **la base arranca en 0,74 de luminancia y no en
  0,52**: con la base oscura, contra un suelo verde clarísimo, las briznas se leían como palitos
  secos clavados en el pasto.
- **EL COLOR POR MATA, que era lo que faltaba y es lo que más se nota.** El pasto no tenía
  `setColorAt`, así que todas las matas salían del mismo verde y el prado era UNA mancha lisa por más
  briznas que tuviera la silueta. Ahora el tono y la claridad se mueven por mata y una de cada nueve
  tira a amarillo.
- **Flores**: una malla instanciada, cuatro colores, sólo donde hay pasto y pocas. Comparten el mismo
  material y el mismo viento que el pasto — con shader propio se quedarían quietas mientras el pasto
  se mueve.
- **Árboles**: especie nueva de **acacia** con la copa en sombrilla (la copa chata **cortada por
  abajo**: achatada a secas sigue siendo una lenteja y desde el suelo se le ve la panza), coníferas
  de **cinco** pisos en vez de tres —con tres se leen a pila de sombreros—, rango de tamaños abierto
  con ejemplares gigantes, y troncos caídos, que es lo más barato que hay para que un bosque deje de
  ser un campo de postes verticales.

#### LOS CUATRO, EL CAMELLO Y LA APERTURA

Personajes con **rig propio de pivotes**: cada articulación es un Object3D puesto donde está la
articulación y la caja del hueso cuelga de él corrida media longitud, así girar el pivote gira el
hueso alrededor de su punta de arriba, que es lo que hace un codo. Cinco poses escritas como
funciones del tiempo: quieto, camina, leña, sentado y susto. Existen SÓLO durante la cinemática — los
tres amigos se quedan en las carpas, que por eso son tres, y la partida no paga un triángulo.

**LA CINEMÁTICA ES UNA FUNCIÓN DEL TIEMPO**, `INTRO.pon(t)`, no una máquina de estados: por eso el
banco fotografía el segundo 30,5 con `__V.cine(30.5)` sin esperar treinta segundos. Así se encontró
todo lo de abajo.

- **La curva del sol restaba y saltaba.** Con la primera, en el segundo 16 la fase iba en 0,772 —o
  sea de noche— mientras el subtítulo decía «antes de que cayera el sol», y en el segundo 24 saltaba
  de 0,456 a 0,756 en un cuadro. Ahora los tres tramos empalman, no baja nunca, y **los cortes caen
  donde corta el guion**: el tramo de la fogata termina en 0,745, o sea con el sol rozando el
  horizonte, que es literalmente lo que dice el texto.
- **El camello era negro sobre negro.** Estaba en pardo casi negro con el argumento de que una
  silueta da más miedo; el gancho de proyección decía que estaba en cuadro ocupando el 22 % del alto
  y en la captura no había nada que ver, porque de noche el fondo también es negro. En **arena
  oscura** se recorta, y los ojos —sin luz, y grandes a propósito— son lo único suyo que no depende
  de la hora: a veinte metros, con el juego dibujando a media resolución, unos ojos de tamaño real no
  llegan a un píxel.
- **LEMI TAPABA LA FOGATA, Y DOS VECES.** De noche, sentado en el eje de la cámara, su espalda se
  comía el centro: medido, el fuego caía en y 0,64-0,97 y él en 0,66-1,47. Y en la escena de la
  fogata pasaba lo mismo de día: la cámara rodea de 0,90 a 2,05 rad y él se paraba en 1,60, o sea
  exactamente en el medio —fuego en x 0,468-0,538, él en 0,445-0,553—. Los cuatro se reparten ahora
  **fuera del arco que barre el lente** (5,60 · 3,60 · 4,55 · 0,25) y de noche **contra la boca por
  donde entra el camello**. Composición final medida: camello en y 0,28-0,58 y 30 % del alto, fuego
  en 0,61-0,83, Lemi a la derecha en x 0,58-0,83, y en la escena de día fuego 0,477-0,530 contra
  Lemi 0,579-0,655, sin tocarse.
  Había una lista única de tres ángulos que servía para las dos escenas, y justamente por servir para
  las dos no servía para ninguna: cada escena decide contra SU cámara.
- **Y CADA UNO LLEVA SU TRONCO**, que es lo que se pidió. El leño cuelga del ANTEBRAZO y no de la
  escena: así lo lleva la mano por construcción y no hay dos animaciones que puedan
  desincronizarse. Sentados de noche ya no lo llevan —lo pusieron en el fuego—, que si no serían
  cuatro personas cenando con un tronco en la mano.
- **La noche del juego es demasiado oscura para un plano fijo.** Está bien cuando uno la camina con
  una fogata cerca, pero en ocho segundos quietos el cuadro salía negro entero. Se sube la luna y el
  rebote **sólo** durante la escena 3, y la fogata se multiplica por 3,4 — que es lo que hace que la
  luz llegue al bicho a siete metros.
- **El juego empieza en la fase 0,185 y no en 0,865.** Salir a un mediodía radiante contradiría lo
  que se acaba de ver, pero soltar al jugador en 0,865 son **setenta segundos de oscuridad** antes
  del primer amanecer. En 0,185 todavía es de noche —el camello está activo— y el sol sale a los
  once segundos: se empieza con miedo y se ve amanecer.

**EL CAMELLO EN LA ISLA.** Después de la apertura ronda a 2,2 m/s; de noche, a menos de 95 m,
acecha a 3,6 y embiste a 7,4. Correr son 12,8: **se le gana**, que es la regla de Eco. No hay
pantalla de derrota —este juego no tiene una—: te alcanza, te sacude y aparecés en el campamento.
Y **se va a noventa metros** al soltarte: dejándolo donde estaba, si el encuentro fue cerca del
campamento, al pasársele el aturdimiento lo tenés otra vez encima sin haber podido hacer nada.
De noche **la mitad de sus destinos apuntan al jugador**, porque con destinos al azar en una isla de
660 m de lado quedarse en un rincón era una partida ganada.

#### MEDIDO AL CERRAR

Roll del menú **0,10°** (era 17 a 30) y horizonte en 0,257 del alto. Menú: **cero solapamientos**
entre los seis elementos, todo entre 40 y 420 de 460. Los seis planos de la apertura fotografiados
uno a uno, con el camello, el fuego y Lemi **proyectados a coordenadas de pantalla** y los tres
delante de la cámara. Camello: ronda 2,2 · a 70 m de noche acecha 3,6 · a 18 m embiste 7,4 · te
agarra y pasa a 91,8 m de distancia; de día no acecha. «Otra isla» replanta (97 llamadas, 762k
triángulos). Auto al 57,9 % del alto a 6,5 m. `window.__errs` vacío y **0 NaN** en todas las
corridas.

### Quincuagesimotercera vuelta (2026-08-29): **VISOR 3D** — un modelo con 10 animaciones, todo de Rezona Lab

Pedido: *"puedes generar un modelo 3D y animarlo con 10 animaciones? todo de Rezona lab y haz un
HTML viewer del modelo 3D"*. Salió `juegos-pc/Visor3D.html` (3,8 MB): Maicol en 3D sobre una tarima
de estudio, órbita con el dedo, pinza para acercar, y un botón por animación con fundido de 0,25 s.
Fuente en `herramientas/visor3d/` (plantilla + fusionar + hornear + armar).

#### LAS 10 ANIMACIONES COSTARON DESCUBRIR UN VOCABULARIO QUE NINGÚN ERROR TE DICE

La cadena de Rezona Lab (proveedor Tripo) para esto es `submit_model3d_generation` →
`submit_rig3d_generation` con `animations`. Tres cosas que hubo que averiguar a los golpes:

- **Como mucho 5 animaciones por tarea.** El MCP devuelve un VALIDATION_ERROR genérico; el detalle
  (`max_length: 5`) solo aparece pegándole al endpoint crudo con el Bearer. 10 animaciones = 2 tareas.
- **Los nombres tienen un vocabulario cerrado y los desconocidos se IGNORAN en silencio.** Pedí
  `idle, walk, run…` y las tareas salieron `ready` con `ignored_animations` lleno: rigs facturados
  sin un solo clip pedido. El endpoint que lista los nombres válidos (`rig3d/precheck`) contesta
  `PAT_ROUTE_FORBIDDEN` con API key. **La respuesta estaba adentro del GLB**: el rig vino con 3 clips
  de regalo llamados `preset:walk`, `preset:idle`, `preset:jump` — el vocabulario es el de Tripo con
  prefijo `preset:`, confirmado después en su documentación (idle, walk, run, dive, climb, jump,
  slash, shoot, hurt, fall, turn…). Con `preset:run, preset:slash, preset:shoot, preset:hurt,
  preset:fall` + `preset:climb, preset:turn` las dos tareas volvieron con `ignored_animations: null`
  y los 7 clips adentro. 3 + 5 + 2 = **10 exactos**.
- **`fusionar.py` junta los clips de los tres GLB en uno.** Acá NO hace falta el retarget por espacio
  de mundo que costó una vuelta entera en Eco: las tres tareas parten del MISMO modelo con el MISMO
  esqueleto, así que basta copiar `animations` a nivel glTF remapeando los nodos POR NOMBRE (los
  índices crudos no, que el orden del JSON no está garantizado). Con filtro de repetidos, porque dos
  botones QUIETO son un defecto visible.

#### TRIPO DEVUELVE 741.010 TRIÁNGULOS Y ESO NO SE ARREGLA CUANTIZANDO

El GLB fusionado pesaba **32,6 MB — 8,9 MB solo de índices** (383.018 vértices). La poda de Eco
(cuantizar normales, pesos, rotaciones) hubiera dejado ~21 MB: cuando el problema son los triángulos
hay que TIRAR triángulos conservando el rig, y eso lo hace meshoptimizer:
`npx gltfpack -si 0.12 -kn -noq` → **3,2 MB con 88.920 triángulos**, los 10 clips con sus nombres
(`-kn`; sin eso los botones pierden el rótulo) y **sin extensiones** (`-noq` apaga la cuantización a
propósito: KHR_mesh_quantization iría en `extensionsRequired` y un cargador sin ella muestra NADA;
3,2 MB sin extensiones le gana a 1,8 con una). Después `hornear.py` baja las tres texturas de 2048 a
JPEG 512 (441 KB → 67 KB) y reempaqueta. HTML final: **3,8 MB**.

#### MEDIDO AL CERRAR

Los 10 clips cargados y MEDIDOS con `__visor.medirClip()` (el recorrido de una mano y un pie por el
mundo, la única prueba de que una animación anima): camina 0,25/0,47 m · quieto 0,20/0,12 · salta
0,19/0,15 · corre 0,52/0,57 · espadazo 0,71/0,16 · dispara 0,45/0,58 · dolor 0,12/0,02 · cae
1,64/0,65 · trepa 0,66/0,50 · gira 0,86/0,49 — los diez distintos y ninguno quieto. 4 llamadas de
dibujo, cero errores de página. Y el encuadre se midió, no se estimó: con dist 4,2 y el objetivo en
y=1,0 el personaje ocupaba el 27% del alto hundido abajo; con el objetivo al medio del cuerpo (0,78)
y dist 2,7 ocupa ~50% centrado, verificado en 412×892. Los botones traducen el prefijo del proveedor
(`preset:hurt` → DOLOR): un botón que dice PRESET:HURT no le dice nada a nadie.

Los GLB crudos de las tareas (90 MB) no se versionan: se regeneran con `fetch_generated_asset`
(proyecto `PwVerjQL`, tareas `gtask-0d284df5…` modelo, `gtask-34e913…/0d7787…/7435a4…` rigs).
Se versionan `maicol3d_sim.glb` (la fuente podada) y `maicol3d_p.glb` (lo que pega `armar.py`).

### Quincuagesimosegunda vuelta (2026-08-29): **VECINDARIO** — el sexto juego: una cinemática de noche en primera persona

Pedido: *"genera un mundo 3D de noche genera en highsfield el cielo y también texturas de calle y
vereda, pasto, y también de las casas ... una animación en HTML de una persona en primera persona ...
un vecindario bueno de noche god iluminación gráficos god, y el movimiento de cámara debe ser dinámico
y de la nada llega a una casa super fea y abandonada, mira un cartel que dice no entrar y después se
gira atrás y hay una abuela genera una imagen de una abuela con un bate 3D y como lo golpea y la cámara
cae al suelo y se apaga y después se prende despertando de la cama y el se debe poder ver el cuerpo y
se mira las manos y ahí termina, haz que dure entre 20-40s"*.

`juegos-pc/Vecindario.html` (~3,4 MB), partido en `herramientas/vecindario/partes/` y armado con
`python3 herramientas/vecindario/armar.py`. **38 segundos, sin controles**: caminata por la vereda con
miradas a las casas y a los propios pies, llegada a la casa abandonada, el cartel NO ENTRAR, el giro,
la abuela con el bate (imagen generada → `image_to_3d` con rig de 24 huesos, 10,3 MB → 2,0 MB con el
horno de Baldi), el golpe con fogonazo y caída, negro, y despertar en una cama mirándose las manos.

**LA CINEMATICA ES UNA FUNCION DE t, no una máquina de estados**: `poner(t)` recibe el segundo y deja
la cámara, el cuerpo y la abuela. Por eso el banco puede fotografiar el segundo 26,4 directo con
`__vec.ir(t)` sin esperar 26 segundos — así se encontró todo lo de abajo.

Lo que las capturas y las cuentas corrigieron:
- **Las casas de la derecha estaban construidas ENCIMA de la vereda**: giradas −90°, su frente es su
  medio fondo (D/2≈3,9 m) hacia −x; en 11,5 el frente caía en 7,6 y la vereda termina en 6,3.
- **El poste del cartel atravesaba la palabra**: tabla y poste centrados en el mismo plano z=0.
- **El farol roto quedaba EXACTO entre la cámara parada y la casa fea**: un palo cruzando el plano
  más importante. A z=−30.
- **El cuerpo acostado estaba ESPEJADO**: el pecho armado hacia la almohada dejaba las manos "en
  reposo" flotando delante de la cara antes de que el guion las pidiera.
- **El marco vertical no perdona**: a 0,63 m el semiancho visible es 0,18 m — las manos con hombros
  reales (±0,24) subían por los bordes como garras ajenas. Y el eje que las acerca es `rotation.y`,
  NO `rotation.z`: con el brazo casi horizontal, z es el eje del brazo y girarlo es torsión (medido
  con `manosNDC()`: clavadas en 0,08/0,93 de pantalla hasta cambiar de eje — la misma trampa de ejes
  de los hombros de Baldi). Quedaron en 0,35/0,65.
- **El cuerpo propio se mira siempre en sombra** (la luna viene de atrás): las zapatillas eran dos
  manchas negras. Un pelín de emisivo en los cuatro materiales del cuerpo.
- **La pose de la abuela es un DELTA sobre el reposo del rig** (la lección de RECREO): carga en dos
  tiempos —espalda y brazo atrás 0,7 s, latigazo 0,2 s— sobre Spine/RightArm/RightForeArm, con
  respaldo de cuerpo entero si el rig no carga.
- Los pasos suenan desde la MISMA fase que mueve las piernas: son el mismo número, no pueden
  desincronizarse. La fase sale de la DISTANCIA, no del tiempo: frenar no patina.

Audio generado (grillos, tensión, paso, golpe, susto, latido — 218 KB) con el horno de RezUno; el
recorte por energía se quedó solo con el impacto del golpe (0,25 s) porque el vuelo del bate vino casi
mudo: se aflojó el mínimo de ventana. Cielo y 7 texturas generadas, cosidas por bordes en el horno
(WebP 512, 421 KB los ocho).

Medido al cerrar: corrida entera en vivo sin un error de página, 46 llamadas de dibujo, grillos rms
0,077 · tensión 0,056 · latido 0,112, y los diez planos del guion fotografiados uno a uno.

### Quincuagesimoprimera vuelta (2026-08-29): **Eco** — la puerta de las cuatro llaves, nadie te guía, la trompeta, y salir a un prado

Pedido: *"en Eco hace que haya una puerta que se abre con las llaves que recolectas, nada se te guía,
vos encontras la notas y las llaves por tu cuenta una vez pasas el tutorial, también haz que al estar
cerca de esa puerta suena una trompeta que alerta al monstruo pero no va más rápido, solamente esa zona
no tan grande cerca de la puerta, también al salir debe hacer un difuminado en blanco y genera un mini
vídeo de Cinemática del tipo saliendo de la caberna cayendo del cielo y se apaga para prenderse como en
primera persona despertando en un mundo lleno de pasto etc hermoso cielos hermosos y realista"*, más
*"al ganar el de baldi debe llevarte al menú después de irte en el bus"* y *"música de fondo y de UI en
todos los juegos"*.

#### LA PUERTA EXISTÍA EN LA FICCIÓN Y NO EN EL JUEGO

La salida era **un faro**: un punto del mapa que latía con el eco y, al llegar con los cuatro sellos, se
ganaba. Y la hoja que está en esa misma celda dice, desde hace vueltas, *"la puerta tiene **cuatro
cerraduras** y no se abre con tres"*. O sea que el texto describía una puerta que no estaba: las cuatro
llaves no abrían nada, sólo contaban.

Ahora hay puerta, y las cuatro llaves son sus cuatro cerraduras. Va contra la pared **enfrente de la
abertura** de la celda de salida —al meterse en el fondo del laberinto, lo que hay adelante es la
puerta— y si la celda tuviera más de una abertura se elige la pared más opuesta al promedio, así que el
criterio no depende de que sea un sin salida.

**El marco va con el material del sonido y las cerraduras no**, y ese reparto es el mismo que ya usan
las hojas y las llaves: la piedra aparece y desaparece con las ondas, y las cerraduras —que son el
marcador de cuántas llaves llevás— tienen luz propia. Medido: apagadas 0,012 de piso, encendidas 0,075,
y con eco 0,23 contra 0,92.

**Y SE ABRE ANTES DE GANAR.** Ganar en el mismo cuadro en que se toca la puerta tira a la basura lo
único que las cuatro llaves construyeron: hay que verla abrirse. Son 2,6 s de piedra moviéndose, con el
fogonazo de la propia puerta.

**UN DEFECTO QUE SÓLO SE VIO MIRANDO:** el grupo de la puerta se orientaba con `atan2(dx,dz)`, o sea con
su +Z apuntando **al muro**. Las cuatro cerraduras —puestas a z=+0,14— y los dos escalones —a +0,72—
quedaban enterrados en la pared. En la captura la puerta se veía entera y lisa: no faltaban las
cerraduras, estaban del otro lado.

#### NADIE TE GUÍA, Y ERAN DOS COSAS

La **flecha** decía dónde estaba lo que faltaba y los **rastros rojos** del suelo llevaban de una hoja a
la siguiente. Las dos se van al terminar el tutorial. En la sala de práctica la flecha se queda, y no es
una excepción caprichosa: el tutorial enseña a despertar una llave a los gritos y para eso hay que poder
llegar a la de práctica.

#### LA TROMPETA: ALERTA, NO VELOCIDAD

Zona de 8,5 m alrededor de la puerta, una trompeta cada 7 s, y **sale de la puerta y no de vos**: la cosa
va hacia la puerta, que es peor, porque ahí tenés que llegar igual. Y **enciende**, como cualquier otro
ruido: ésa es la única regla que este juego tiene y no puede tener una excepción — de paso es lo único
que te muestra la puerta entera de una.

Que sea alerta y no velocidad es lo que la hace justa, y está medido: con la cosa a 26 m, la trompeta la
pasa de `ronda`/1,35 m/s a **`caza`/`caminar`/2,30 m/s**, que es la velocidad de persecución de siempre.
Corriendo se le sigue ganando (5,50 contra 3,55). A 50 m no la oye —el alcance es 46— así que la zona
tampoco es un despertador global.

#### EL FINAL: BLANCO, CINEMÁTICA Y UN PRADO

Cuatro tiempos: **blanco** 1,15 s —blanco y no negro, porque se sale de un lugar sin luz y lo que ciega
es la luz—, la **cinemática generada** (la boca de la cueva, el fogonazo, la caída sobre un mundo verde),
un **negro** corto, y **despertar tirado en el pasto**. Los ojos se abren de verdad: dos franjas negras
que se separan, porque un fundido desde negro se lee a transición de video y esto tiene que leerse a
abrir los ojos.

**EL VIDEO VA EN DOS FORMATOS, Y ES LA LECCIÓN DEL AUDIO DE MAICOL OTRA VEZ.** Chromium no trae los
códecs propietarios: medido, `canPlayType('video/mp4; codecs="avc1.42E01E"')` devuelve **cadena vacía** y
el video no arranca nunca, mientras que VP9 da "probably". Pero al revés pasa en un iPhone viejo, donde
WebM no existe y H.264 sí. Van los dos, WebM primero porque pesa 156 KB contra 236.

**Y EL PRADO ES OTRA ESCENA, no el laberinto con luces puestas.** El juego entero se dibuja con el shader
del sonido, donde todo lo que no tocó una onda es negro: un prado con ese material sería un prado negro.

Cinco cosas del prado que salieron de medir y no de mirar:

- **La niebla empezaba a 55 m y se comía el prado entero.** Con la cámara a 1,62 m mirando al horizonte,
  casi todo el suelo que entra en el cuadro está más lejos de 55 m: salía blanco azulado de punta a
  punta. Pasó a 300-1800.
- **El suelo era un `CircleGeometry` de 56 cuñas.** Con Lambert la luz se interpola por vértice y el
  prado salía con rayas verticales en abanico, que son literalmente los triángulos. Un plano de 80×80
  reparte los vértices parejo.
- **El color por vértice competía con la textura.** Los dos verdes se multiplican: 0,33 × 0,35 deja el
  prado en 0,12 y el suelo salía casi negro al lado del pasto. El color base vive en la textura y el
  vértice sólo lo mancha.
- **LAS CUARENTA Y SEIS NUBES NO SE VEÍAN, y estaban.** `Matrix4.lookAt` orienta el objeto mirando por su
  **−Z** —la convención de three.js— y un `PlaneGeometry` tiene la cara en +Z: con `FrontSide` las
  cuarenta y seis miraban para el otro lado. Van a dos caras. (Y sin `renderOrder`: con −1 se dibujaban
  antes que el domo del cielo, que no escribe profundidad pero sí color, y las tapaba.)
- **EL PASTO NO SE VEÍA Y NO ERA POR NO DIBUJARSE.** Apagando y prendiendo las briznas sobre la misma
  imagen, la diferencia eran **32 píxeles de 455.400**. Con el pasto pintado de rojo y la cámara puesta
  arriba se vio el disco entero, sólido: estaba todo bien. Lo que fallaba era la **vista de pie** — a
  1,62 m de altura, unas briznas de 20 a 55 cm se miran casi desde arriba, se tapan entre ellas y no
  aportan un píxel, que es exactamente lo que hace un césped cortado. Con pasto de 55 a 125 cm y la vista
  en reposo inclinada 0,22 rad hacia abajo, las briznas pasan del **0,005 % al 3,4 %** de la pantalla y
  el prado se llena.

Cuesta 8 llamadas de dibujo y 300 mil triángulos, y es una escena estática sin juego encima.

#### RECREO: EL FINAL NO TERMINABA

La fase 3 del autobús **esperaba cinco dedos para seguir**. Quien juega sin cámara —o quien simplemente
no adivina que hay que saludar— se quedaba parado en la vereda mirando el autobús **para siempre**, con
el juego ya ganado y sin forma de llegar al menú. Saludar sigue estando; a los nueve segundos el autobús
se va igual, que es lo que hace un autobús. Y la pantalla de resultado vuelve sola al menú a los ocho
segundos. Verificado sin saludar: fase 0 → 2 → 3 → 4 → `fin` → **`menu`**.

#### MÚSICA Y TOQUE DE BOTÓN EN LOS TRES JUEGOS

Cinco temas y un toque de interfaz generados, horneados a 16 s con la cola fundida sobre la cabeza —un
tema cortado en seco y puesto en loop da un golpe cada vuelta que se escucha más que la música—, mono a
40 kbps. La capa es la misma en Eco, POMPOM y RECREO y cuelga del maestro que cada juego ya tiene, así
que el analizador con el que cada uno se mide la sigue midiendo. **La muestra primero y el sintetizado
después**: si un clip no decodifica, suena el de osciladores de siempre.

**Y LOS PROMPTS QUE PIDEN UN SONIDO CHIQUITO SIGUEN DEVOLVIENDO SILENCIO.** El toque de interfaz se pidió
cuatro veces —*"soft UI click"*, *"warm rounded tap"*— y volvió con pico 0,006, 0,009 y 0,020. El que
sirve es el golpe de madera que RezUno ya tenía grabado. La regla quedó clara: **el nivel se pone en el
código, nunca en el prompt.**

Los volúmenes son distintos a propósito: Eco 0,075 —ahí el sonido *es* la vista y una cama que compita
con el eco rompe la única regla del juego—, POMPOM 0,115 y RECREO 0,055, que además conserva su música
procedural en partida porque ésa se agacha sola cuando Baldi habla y cambia según el aula.

Medido en Eco, en partida: fondo rms 0,0143 · **trompeta 0,166 (11,6× el fondo)** · grito 0,223 —el grito
sigue siendo lo más fuerte, que es lo que este juego necesita.

#### MEDIDO AL CERRAR

Eco: laberinto **121 de 121 celdas alcanzables**, salida a 22 pasos, 4 llaves en 4 salas, la puerta en la
celda de salida, `window.__errs` vacío en todas las corridas. RECREO: partida completa **24 libros de 24,
24 aciertos, 0 muertes** en 9.818 vueltas, y el final llega al menú solo. POMPOM: **160 de 160 niveles
jugados solos con 0 choques**, y los ocho mundos por encima de su ventana mínima. Audio: 5 de 5 clips
decodificados en Eco, 3 de 3 en POMPOM, 2 de 2 en RECREO. Tamaños: Eco 2,97 MB, RECREO 2,04, POMPOM 0,35.

### Quincuagésima vuelta (2026-08-28): **RezUno** — el logo acomodado, dos temas y quince efectos generados, y un índice para los cinco

Pedido: *"acomoda el logo está mal acomodado, también genera música y sonidos para todo, y no digas
que no se puede porque si ya lo hiciste y dame un link de Github raw para jugar los 5 juegos"*.

#### EL LOGO ESTABA DETRÁS DEL TÍTULO, Y ESTAR DETRÁS NO ARREGLA NADA

La mano estaba en absoluto contra la esquina de arriba, con `z-index:0`, o sea de fondo. El problema
es que el contenido de un menú centrado en vertical **arranca justo ahí**: medido, la imagen ocupaba
de 0,081 a 0,288 del alto y el título de 0,24 a 0,33. Lo que se encima es el **dibujo con las
letras**, y el orden de pintado no cambia eso — sólo decide cuál de los dos se ve peor.

Ahora la mano es **un elemento más de la columna, arriba del título**: mano y palabra forman una sola
marca y el solapamiento pasa a ser imposible por construcción, que es la misma lección que ya había
costado una vuelta con el HUD de Eco. Y va **medida en alto y no en ancho**: el menú tiene nueve cosas
apiladas y en un teléfono corto se come todo el aire por abajo; con `height` en vh la marca se achica
justo cuando el alto escasea. Verificado en 412×892, 412×732 y 360×640: **cero solapamientos** entre
los nueve elementos, y todo entre 0,12 y 0,88 del alto en el caso más apretado.

#### LA MÚSICA SE PUEDE GENERAR, Y TENÍA RAZÓN EL USUARIO

En RECREO escribí que no había con qué generar música. Ya no es cierto: `sonilo_music` y
`mirelo_text_to_audio` están disponibles. **Dos temas** —uno de menú y uno de partida, 24 s cada uno—
y **quince efectos**.

**LOS PROMPTS QUE PIDEN UN SONIDO CHIQUITO DEVUELVEN SILENCIO.** Es el hallazgo de la vuelta y costó
tres tandas. Pedí *"very short soft pick-up click, tiny paper tick, muted"* y volvió con **pico
0,005**; *"tirar una carta"* con 0,032; *"+2"* con 0,002. O sea: pedí que sonara bajito y me lo dieron
—tan bajito que no existe—. Los que salieron bien fueron los que describían un sonido **fuerte y
concreto**: `roba` 0,787, `salta` 0,762. Reescritos como *"loud clear close-up recording of a playing
card slapped hard onto a wooden table, full volume"*, `tira` pasó de 0,032 a **0,729**. **El nivel se
pone en el código, no en el prompt.**

Dos no salieron ni al tercer intento, y **se derivan de los que sí**: agarrar una carta de un abanico
*es* deslizar una carta —`roba` recortado a 0,10 s y subido un tono y medio— y el castigo de +2/+4 *es*
varias cartas repartidas, que es lo que grabó `reparte`. No se inventa un sonido: se usa el de la misma
cosa física.

**Y EL NIVEL SE MIDE DESPUÉS DE CODIFICAR, NO ANTES.** Normalizar el float a 0,46 y dar el número por
bueno es creerle a una cuenta que no se hizo: el remuestreo a 16 kHz suaviza los picos angostos y el
codificador tampoco los conserva. Medido, el campanazo de `turno` se caía de **0,46 a 0,146** — la
tercera parte, y lo habría enviado así. El horneado ahora **abre el MP3 terminado**, mide el pico real
y corrige; los quince quedan dentro del **6 %** de su nivel de diseño.

La mezcla es la de siempre en este proyecto: la victoria es lo más fuerte y lo que se dispara cien
veces por partida va abajo. Medido con el analizador colgado del maestro, en partida: música de fondo
rms **0,0095** · agarrar 0,242 de pico · tirar 0,402 · UNO 0,420 · **ganar 0,494 de pico y 0,0532 de
rms, o sea 5,6 veces la música**. Y la música **se agacha** mientras suena la fanfarria: gain 0,13 →
0,058 y vuelve sola a 0,13.

Tres decisiones más:
- **Un tema por pantalla y no uno solo con el volumen bajado.** El menú y la partida son dos estados y
  el jugador tiene que oír que algo cambió al empezar. Se cruzan en 0,9 s, porque un corte en seco se
  lee a error.
- **La música cuelga de `verPantalla()` y de ningún otro sitio.** Repartiendo llamadas por cada botón,
  la próxima pantalla que se agregue va a quedar muda y nadie se va a enterar hasta jugarla.
- **El sintetizado no se borra.** Si un clip no decodifica —un navegador viejo, un MP3 que no le
  gusta— suena el de osciladores de siempre. Un juego mudo por un decodificador es peor que un juego
  con bips.

Y el clic de botón va **delegado en captura sobre el documento**: en cada `onclick` habría que
acordarse en los dieciocho botones y en el próximo.

Costo: 386 KB en base64 (298 de los dos temas a 44 kbps mono 22 kHz, 88 de los quince efectos a
40 kbps mono 16 kHz). El HTML pasa de 340 KB a **744 KB**.

#### UN ÍNDICE PARA LOS CINCO

`juegos-pc/index.html`: una página con los cinco y **enlaces relativos**, así el mismo archivo sirve
desde cualquier rama o commit sin tocar una URL.

#### MEDIDO AL CERRAR

17 de 17 clips decodificados con su duración real, música sonando en las dos pantallas y volviendo de
la agachada. **120/120 partidas con bots y 120/120 a dos, 0 jugadas ilegales**; **30/30 por rayo, 0
fallos de apuntado**; tutorial completo en los tres idiomas; separación dibujo-apuntado **0**; frenada
16,7 ms; atenuación de temblor 2,69; reja con desvío de hueco 0; escalera de ritmo 4 ms→60 Hz …
40→12; interpolación despareja 1,00-1,01; control de 60 cuadros con **0 cambios ya asentado**; 97
llamadas de dibujo en alta y 50 en baja; partida entre dos páginas con la misma huella (`6|91`) y **0
errores de protocolo**. `window.__errs` vacío en todas las corridas.

### Cuadragésima novena vuelta (2026-08-28): **RezUno** — el logo naranja con su 10, monitores por cabeza, la mano del otro y la cámara que sigue tu cabeza

Pedido: *"puedes hacer que la mano del logo al inicio sea naranja y la carta 10 naranja también, puedes
agregar otra vez las cabezas almenos para el jugador los bots son computadoras así que los pondrás
monitores como cabeza, cuando juegues 1vs1 con otra persona vos podrás ver exactamente como mueve sus
manos las que haga aparecer en la pantalla, al tener seguimiento de cabeza podrás mirar arriba y verla,
la idea es que con el seguimiento sirva para mover la cámara real del juego"*.

#### EL SEGUIMIENTO DE CABEZA NO PUEDE SER LA CARA, Y LA RAZÓN ES LA CÁMARA TRASERA

Lo obvio sería detectar la cara con MediaPipe. **No se puede**: hace tres vueltas que este juego usa la
**cámara trasera**, porque es la que apunta a la mano. Con la trasera la cara no está en cuadro nunca, y
encender las dos cámaras a la vez es duplicar el trabajo del detector en el aparato más lento, que es
justo lo que las últimas tres vueltas estuvieron sacando.

Pero el dato ya existe y no cuesta nada: **el teléfono sabe cómo está orientado**. `deviceorientation`
da alpha y beta a 60 Hz, sin cámara, sin modelo y sin un milisegundo de detección — y la orientación del
teléfono **es** para dónde estás mirando, porque el teléfono lo tenés en la mano delante de la cara.
Inclinarlo hacia arriba es levantar la vista.

Cómo está hecho: el primer evento **fija el cero** —nadie juega con el teléfono perfectamente vertical,
así que la referencia tiene que ser la postura en la que empezaste, no una constante—, hay **zona muerta
de 1,6 grados** (una mano nunca está quieta, y sin zona muerta la cámara del juego tiembla despacio todo
el tiempo) y **recentrado lento** para que dejarlo un poco inclinado no te deje mirando al techo. El
alpha se normaliza a la vuelta corta: sin eso, cruzar de 359 a 1 grado hace que la cámara pegue media
vuelta.

Medido, y en las dos direcciones: partiendo de beta 60, inclinarlo a **44** —o sea levantar la vista 16
grados— da `alza 0,588` y **mueve la cámara 5,29 unidades**; las cabezas de los rivales pasan de la franja
`y 0,072-0,129` (pegadas al borde de arriba) a `y 0,298-0,350`, o sea al medio de la pantalla. Al revés,
inclinarlo a **76** las deja arriba de todo. Y girando el aparato 24 grados, `giro 0,609` mueve las dos
cabezas de x 0,245 y 0,623 a **0,392 y 0,777**: la cámara orbita.

Los topes no son simétricos a propósito: **arriba 9,0 unidades y abajo 1,2**. Mirar arriba es lo que el
pedido quiere que sirva —ver a quien tenés enfrente—; mirar abajo no muestra nada que no estés viendo ya,
porque tu propio abanico ocupa el borde de abajo de la pantalla.

#### LAS CABEZAS VUELVEN, Y UN BOT NO TIENE CARA

En la vuelta 45 se sacaron porque el pedido fue sacarlas. Vuelven, pero **con dos clases distintas, y no
es un adorno**: un bot es una computadora, así que su cabeza es un **monitor** —carcasa, panel oscuro y
dos píxeles verdes por ojos—, y del otro lado de un 1v1 hay una persona, así que ahí va un **cráneo**. En
una partida se sabe contra qué estás jugando **sin leer un cartel**, que es la única razón por la que la
distinción vale la pena.

Las seis mallas nuevas van **instanciadas** —cráneo, carcasa, panel, cuello, torso y ojos— así que dos
rivales con cabeza cuestan lo mismo que uno. Los ojos llevan `instanceColor` porque el mismo par de
esferas hace de pupila oscura en una cara y de píxel verde en un monitor.

**Y HUBO QUE MEDIR EL MONITOR DISTINTO QUE EL CRÁNEO.** El gancho `rivales()` proyectaba la caja de la
cabeza suponiendo radio 1, que es lo que mide la esfera; una caja tiene **medio lado 0,5**. Midiendo las
dos igual, el monitor salía **el doble de ancho** y la prueba de solapamiento denunciaba un choque con el
rótulo que no existía. Una prueba que miente en contra es tan mala como una que miente a favor.

#### LA MANO DEL OTRO ES SU MANO, NO UNA ANIMACIÓN

En 1v1 se publican los **21 puntos** que MediaPipe midió en el teléfono del otro, redondeados a tres
decimales, a 8 Hz, por el mismo MQTT que ya lleva las jugadas. Del otro lado se dibujan **espejados en x**
porque están enfrentados: su derecha es tu izquierda, y sin el espejo la mano se movería al revés de como
él la mueve. Si dejan de llegar puntos por más de 600 ms la mano desaparece, que es el comportamiento
correcto cuando alguien saca la mano del cuadro.

**DOS DEFECTOS, LOS DOS ENCONTRADOS PROYECTANDO Y NO MIRANDO:**

1. **Que lleguen 63 números no prueba que se vean.** El primer intento usaba **un solo factor** para
   mapear el cuadro entero de su cámara a unidades de mesa, y de ahí salía también el tamaño de la mano.
   Medido: la mano ocupaba el **7,3% del ancho de la pantalla** contra el **29,2% del abanico** —o sea la
   cuarta parte de sus propias cartas— y encima caía justo encima del abanico. En la captura no se veía
   nada, y sin embargo todos los números de red estaban bien. **Dónde viaja la muñeca y cuánto mide la
   mano son dos cosas distintas**: el recorrido tiene que ser chico (mover la mano de punta a punta de su
   cámara no puede barrer media mesa) y la mano tiene que ser grande. Con los dos factores separados
   —4,6 de recorrido y 13,6 de forma— la mano pasa a **15,6% del ancho**, la mitad del abanico, delante
   de las cartas. Ahí sí se ve.
2. **Con la mano de verdad, el rival tenía TRES manos.** Las dos posadas que sostienen el abanico están
   justamente para ocupar el lugar de las de verdad mientras no las hay; con la real en pantalla dejan de
   dibujarse. Y **la carta la lleva su mano de verdad**: `R.garra` sale del medio entre la punta de su
   pulgar y la de su índice, que es exactamente la misma regla que usa tu propia mano — si la carta
   siguiera a la mano de mentira, él estaría pellizcando en un sitio y la carta saldría de otro.

Y **el `const` que decide si se dibujan las posadas se declara ANTES del bucle**, no donde temáticamente
correspondería. Es la sexta vez en este proyecto que un `let`/`const` leído antes de su línea no rompe una
función sino el módulo entero.

#### EL PUNTO DE CONEXIÓN Y EL RÓTULO DEL RIVAL ESTABAN ENCIMADOS

`#rivales` reparte con `justify-content:space-between`, y **con un solo hijo eso lo pega a la izquierda**
— que es exactamente donde vive el punto de conexión del multijugador. Y el 1v1 es el único modo con un
solo rival, o sea que los dos elementos que sólo existen en multijugador se pisaban entre ellos. Medido en
la captura: "7 cartas" debajo de "MANOS · P-W8Y". Con un rival el rótulo se va **a la derecha**, donde no
hay nada, y la cabeza en 1v1 se proyecta en el medio (x 0,426-0,574), así que tampoco le cae encima a la
cara. Verificado: `choques:[]` entre los seis elementos de la franja de arriba.

#### EL LOGO

Generado de nuevo con Higgsfield: mano naranja sosteniendo una carta naranja **con el 10 grande y el 10
chico de la esquina**. Recortado a su caja y a 560×313 en WebP, **21 KB**. El encuadre se corrigió midiendo:
con el anterior el borde derecho caía en **1,07** del ancho, o sea que la carta —que es donde ahora está
el número— quedaba cortada por fuera de la pantalla. Queda en 1,01.

#### MEDIDO AL CERRAR

**120 partidas con bots terminadas de 120, 0 jugadas ilegales**; **120 partidas a dos terminadas de 120,
0 ilegales**; **30 partidas jugadas por rayo, 30 terminadas, 0 fallos de apuntado**; tutorial completo en
los tres idiomas (7 pasos). Mano: separación entre lo que se dibuja y lo que apunta **0**, frenada
**16,7 ms**, atenuación de temblor **2,69**, un flanco de pinza en diez cuadros, histéresis 0,411/0,591.
Reja: pedir 22 o 28 Hz da 24 —el ritmo de la cámara— con **desvío de hueco 0**. Escalera de ritmo
4 ms→60 Hz · 10→45 · 20→22,5 · 30→15 · 40→12. Interpolación despareja 1,00-1,01 de 60 a 12 Hz. Control de
60 cuadros: llega al objetivo y **0 cambios ya asentado**. 98 llamadas de dibujo en alta, 51 en baja.
Partida de multijugador entre dos páginas: misma huella de estado en las dos (`8|86`), manos espejadas,
**0 errores de protocolo**, chat en los dos sentidos, y la mano del rival entrando en pantalla. HTML:
**340 KB**. `window.__errs` vacío en todas las corridas.

### Cuadragésima octava vuelta (2026-08-28): **RezUno** — el aliasing que hacía la detección entrecortada, y multijugador 1v1 por MQTT sin servidor

Pedido: *"no con lag sino que como que detecta entrecortado la mano... obliga a 60fps si o si"* y
*"agrega un modo multijugador que al tocar jugar podés elegir entre multijugador y con bots, 1vs1
nomás"*, con el pliego de condiciones del relevo MQTT.

#### ENTRECORTADO NO ES LENTO, Y LA CAUSA ERA ARITMÉTICA

Una medición sólo puede ocurrir **cuando llega un cuadro de cámara**. Y la reja era dura: *si no
pasaron `periodo` milisegundos, no midas*. Con la cámara a 30 (33,3 ms) y un período pedido de 35,
**ningún cuadro llega con 35 ms de diferencia**: llegan a los 33,3 —que la reja rechaza por 1,7 ms— y
el siguiente a los 66,6. Pidiendo 28 mediciones por segundo se conseguían **quince**, la mitad justa.
Y como el período pedido se mueve solo con el costo, el ritmo real saltaba entre 30 y 15 sin nada en el
medio. Eso es exactamente lo que se ve como entrecortado: no es lento, es **desparejo**.

Medido con cuadros de cámara simulados a 30 por segundo:

| pedido | 12 | 15 | 18 | 22 | 25 | 28 | 30 | 37 |
|---|---|---|---|---|---|---|---|---|
| logrado, reja dura | 10 | 10,2 | 15 | **15** | **15** | **15** | 16,2 | 30 |
| **logrado ahora** | 15 | **15** | 15 | **30** | **30** | **30** | **30** | 30 |

Y con la cámara a 60: pidiendo 28 se conseguían 20 y ahora 30; pidiendo 45, 30 y ahora **60**.

El arreglo no es aflojar la reja sino **redondear el período a lo que la cámara puede dar**: los únicos
ritmos que existen son fps, fps/2, fps/3… Se redondea al múltiplo **más cercano** y no al de arriba —al
de arriba se desperdicia hasta un tercio del presupuesto y la mano va más lenta de lo que el aparato
aguanta— y el desvío del hueco pasa a ser **0** en todos los casos: perfectamente parejo.

Dos cosas más del mismo reclamo:

- **La caducidad se mide en mediciones y no en milisegundos.** 280 ms fijos son once mediciones a
  40 Hz y **tres y media a 12**: en un aparato lento, dos detecciones fallidas seguidas hacían
  desaparecer la mano y volver. Ahora son cuatro huecos, con un piso de 280.
- **Si la cámara no da cuadros, se le baja la resolución.** El ritmo no puede pasar del de la cámara, y
  una trasera a 640×480 puede quedarse en 15 en un teléfono modesto. Como la resolución es gratis para
  el detector —medido en la vuelta anterior—, cambiar resolución por cuadros sólo tiene lado bueno. Se
  mide el intervalo **real** entre cuadros, no lo que dice `getSettings().frameRate`, que informa lo
  que se configuró y no lo que llega.

#### MULTIJUGADOR 1v1, Y POR QUÉ ESTE JUEGO NO NECESITA SERVIDOR NI ANFITRIÓN

Relevo MQTT (`broker.emqx.io` por WebSocket seguro), prefijo `rezuno_v1_` para no chocar con otros
juegos en un broker que es de todo el mundo, tres temas por sala (`/state`, `/action`, `/chat`),
identificador estable al azar, indicador de conexión, caducidad de 5 s y chat. Y **no bloquea el juego
solo**: el cliente MQTT va con `defer` —un `<script src>` sin `defer` frena el parseo hasta que llega o
falla, y ya costó doce segundos de arranque en Campo\_de\_Tiro— así que si el CDN no contesta, lo único
que no hay es multijugador. Verificado: con la biblioteca ausente el juego entra al menú, juega contra
bots y la pantalla de sala dice por qué.

**Un juego de acción con dos jugadores moviéndose a la vez necesita a alguien que decida quién tiene
razón. Uno de cartas por turnos no**: en cada instante hay exactamente **un** jugador que puede hacer
algo, así que no hay dos verdades que reconciliar. Los dos clientes corren la misma partida y se mandan
sólo las jugadas. Y el mazo tampoco necesita servidor, **porque el mazo es una semilla**: `repartir()`
es determinista, así que lo único que viaja al empezar son dos datos y no ciento ocho cartas.

Tres decisiones que salen de eso:

- **Quién reparte se decide comparando los dos identificadores**, gana el menor como texto. Elegirlo
  con mensajes sería un protocolo con sus carreras y sus empates; así los dos llegan a la misma
  conclusión por su cuenta y **sin mandar nada**.
- **Las dos sillas se espejan.** Cada uno es J\_VOS en su pantalla; el que no reparte intercambia las
  dos manos y el turno. Con dos sillas el intercambio es su propio inverso, así que no hay tabla que
  mantener.
- **La jugada viaja como carta, no como índice.** Cada uno ordena su propia mano por color y valor, así
  que la carta número 3 de uno no es la número 3 del otro. Robar y pasar no llevan nada: los dos sacan
  del mismo mazo, en el mismo orden.

#### DOS DEFECTOS DE RED ENCONTRADOS JUGANDO, NO LEYENDO

- **"Publicar sólo si algo cambió" mataba la presencia.** El pliego lo pide, y es correcto para el
  estado y catastrófico para la presencia: son dos trabajos distintos que viajan en el mismo mensaje.
  Un jugador que se queda **pensando su turno** no cambia nada, por lo tanto deja de hablar, y a los
  cinco segundos el otro lo da por ido y le corta la partida. Medido: la partida se moría sola **antes
  de la primera jugada**, porque entre el reparto y el primer movimiento no cambia nada. Ahora:
  cambios hasta diez veces por segundo, silencio una vez por segundo.
- **Un reparto perdido dejaba dos partidas distintas para siempre.** `qos 0` no garantiza entrega, y
  hay un mensaje cuya pérdida no se repara sola: si se pierde el reparto, uno arranca una partida nueva
  y el otro sigue en la vieja, **los dos creen que le toca al otro** y la mesa se queda muerta. Se
  detecta con dos números en el latido: `ronda` —el que reparte ve que el otro se quedó atrás y repite
  el reparto— y `huella` —el tamaño de la pila y del mazo—; si discrepan un segundo entero, se reparte
  de nuevo. Y sólo el que reparte puede reparar: si los dos repartieran, el remedio sería el mismo mal.

#### CÓMO SE PROBÓ: DOS PÁGINAS Y UN BROKER DE VERDAD

No alcanza con leer el código. Se montó un **broker MQTT local** (`aedes` sobre WebSocket en el banco),
se sirvió el cliente `mqtt` local, y `h2.mjs` aprendió a abrir **dos páginas** que juegan una contra la
otra por el relevo, cada una moviendo **sólo sus propias fichas**.

**Tres partidas seguidas, terminadas las tres, y las dos páginas coinciden en todo:**

| partida | página A | página B |
|---|---|---|
| 1 | gana 0 · manos [0,4] · mazo 80 · pila 24 · color 3 valor 9 | gana 1 · manos [4,0] · mazo 80 · pila 24 · color 3 valor 9 |
| 2 | gana 1 · manos [7,0] · mazo 89 · pila 12 · color 3 valor 2 | gana 0 · manos [0,7] · mazo 89 · pila 12 · color 3 valor 2 |
| 3 | gana 0 · manos [0,3] · mazo 70 · pila 35 · color 0 valor 13 | gana 1 · manos [3,0] · mazo 70 · pila 35 · color 0 valor 13 |

Sillas espejadas exactamente, mazo y pila idénticos, **0 errores de protocolo y 0 errores de página en
las dos**. Chat verificado en los dos sentidos, y la caducidad también: desconectando una página, la
otra suelta al rival y vuelve al menú con el aviso.

#### EL JUEGO APRENDE A SER DE DOS

El 3 estaba escrito en cuatro lugares. Ahora hay un número, y **no es sólo un número**: con dos
jugadores el giro no puede invertir nada —la vuelta de dos siempre devuelve al otro— así que la carta
de girar pasa a comportarse como la de saltar, que es la regla del UNO de dos. Sin eso sería una carta
que no hace absolutamente nada. Y el rival único va **centrado**: dejándolo en su costado la mesa queda
con un lado ocupado y el otro vacío, y eso se lee a que falta alguien y no a un mano a mano.

#### MEDIDO AL CERRAR

**120 partidas contra bots (3 jugadores)**: 120 terminadas, **0 cartas ilegales**. **120 partidas de
dos**: 120 terminadas, **0 ilegales**. **30 apuntando con el rayo**: 30 terminadas, 0 fallos de
puntería. Tutorial completo en los tres idiomas. Separación entre la mano dibujada y el punto que
apunta **0**. Retardo 6,5–7,6 ms de 60 a 12 Hz. El control de 60 cuadros llega con hasta 60 ms de
relleno y **cero cambios una vez asentado**. 87 llamadas de dibujo en alta y 45 en baja.
`window.__errs` vacío en las dos páginas. El HTML quedó en **303 KB**.

### Cuadragésima séptima vuelta (2026-08-28): **RezUno** — la entrada del detector estaba tirando detección a la basura, y dos "arreglos" míos que la medición desmintió

Reporte: *"la mano va súper mal y no detecta a full, la mano va lenta lagueada y súper mal... y elimina
el uso de la cámara frontal"*.

#### LO QUE ARREGLA LA DETECCIÓN: LA ENTRADA ESTABA EN 256×192 POR UNA OPTIMIZACIÓN QUE NO SIRVE

La entrada del detector estaba en 256×192, y estaba ahí por una suposición que **nunca se comprobó**.
Medida —cronometrando `detectForVideo()` sobre una veintena de detecciones en cada tamaño— dice lo
contrario:

| entrada | 192×144 | 320×240 | 480×360 | **640×480** |
|---|---|---|---|---|
| costo | 557 ms | 547 | 523 | **494** |

**Diez veces más píxeles no sólo no cuestan más: la medición da un poco menos**, o sea que la
diferencia es ruido y el costo **no depende de la entrada**. MediaPipe redimensiona adentro al tamaño
fijo de sus modelos —192×192 el detector de palma, 224×224 el de puntos—, así que mandarle menos
píxeles no le ahorra nada **y le saca detalle**: un dedo que a 256×192 son cuatro píxeles, a 640×480
son diez. Bajar la entrada era **regalar detección a cambio de nada**, y eso es exactamente lo que se
reportó. Sube a 640×480.

Y bajan los tres umbrales de confianza (0,4 · 0,4 · **0,3** en seguimiento). El que importa es el de
seguimiento: es el que decide cuánto se sostiene una mano ya encontrada, y soltarla no cuesta un
cuadro — al perder el seguimiento la medición siguiente tiene que volver a correr **el buscador de
palma**, que es la parte cara. Dudar sale más caro que seguir.

#### LO QUE ARREGLA LA LENTITUD: EL DETECTOR SE LLEVA EL 45 % DEL HILO Y NO EL 30 %

El 0,30 estaba copiado de RECREO, donde la mano es **uno** de los sistemas: allá también hay un
profesor caminando, siete actividades y una escuela que dibujar. En RezUno **la mano es la entrada** —
no hay teclado, ni joystick, ni nada más que apuntar y pellizcar— así que darle menos de la mitad del
hilo al único sensor del juego es una prioridad mal puesta. Y hay con qué pagarlo: el control de
resolución de la vuelta anterior existe justamente para recomprar tiempo de dibujo.

| medir cuesta | 4 ms | 8 | 12 | 16 | 20 | 25 | 30 | 40 | sin mano |
|---|---|---|---|---|---|---|---|---|---|
| ritmo con 0,30 | 60 | 37,5 | 25 | 18,8 | 15 | 12 | 12 | 12 | 10 |
| **ritmo con 0,45** | **60** | **56,3** | **37,5** | **28,1** | **22,5** | **18** | **15** | **12** | 10 |

Con una detección de 12 ms —un teléfono común— el ritmo pasa de 25 a **37,5 mediciones por segundo**
sin tocar una línea del filtro.

#### Y DOS "ARREGLOS" MÍOS QUE LA MEDICIÓN DESMINTIÓ, PORQUE LA MEDICIÓN ESTABA MAL

Para medir lo que el jugador llama "va lenta" hice falta una prueba nueva, porque **la que había
engañaba**: la rampa mide con velocidad **constante**, y a velocidad constante la predicción compensa
el muestreo entero — medido, el retardo da 6,4 ms lo mismo a 62 Hz que a 12. Ese número es cierto y no
describe nada: una mano de verdad acelera, para y cambia de dirección, y **en esos instantes** se paga
el muestreo. La prueba nueva mueve la mano, **la frena en seco** y cuenta hasta que el punto dibujado
se queda quieto.

Y la primera versión de esa prueba también estaba mal: **calibraba el desvío de la mano con la mano en
movimiento**, así que se llevaba puesto el adelanto de la predicción y devolvía **117 y 167 ms** de
asentamiento en ritmos donde el juego asienta en uno solo. Contra ese número falso, dos cambios
*parecían* mejoras y los hice: achicar la predicción cuando el hueco es grande, y hacer que la
velocidad estimada bajara más rápido de lo que sube.

Calibrando con la mano **quieta** —donde la predicción vale cero por construcción— y midiendo de
nuevo:

- El asentamiento es **16,7 ms** —un cuadro, el mínimo que la prueba puede ver— a 60, 37,5, 25, 18, 15
  **y 12 Hz**.
- Las cuatro combinaciones de suavizado de velocidad (0,55/0,55 · 0,85/0,45 · 1/0,35 · 1/0,55) dan
  **exactamente los mismos números** en sobrepico, desparejo, retardo y atenuación.
- Achicar la predicción no mejora el asentamiento —ya está en el piso— y **sí empeora** el desparejo a
  12 Hz, de 1,01 a 1,44.

Así que los dos se sacaron. **Lo que sí crece al bajar el ritmo es el SOBREPICO** —cuánto se pasa de
largo el punto al frenar—: 0 % a 60 Hz, 1,0 a 37,5, **2,1 a 25, 4,2 a 15 y 5,7 a 12**. Y contra eso la
palanca no es el filtro: es no bajar tanto el ritmo, que es justamente lo que hace el 45 %.

#### LA CÁMARA FRONTAL SE VA ENTERA

Se va la opción, el botón del menú y **el reconocimiento de cara** —que existía sólo para mover la
vista girando la cabeza y sólo tenía sentido con la frontal, porque con la trasera tu cara está del
otro lado del teléfono—. Con eso se van también un segundo modelo de 3,7 MB que había que bajar y un
detector corriendo a 12 Hz sobre el mismo video: **dos cosas menos peleándose el hilo con la mano**.
Si el aparato no tiene trasera —una notebook— se abre la que haya y se espeja, porque si no no habría
juego; pero ya no es algo que el jugador elija. La órbita de la cámara queda en cero y el menú pierde
un botón: medido, cero solapamientos y el último termina en 676 de 732.

#### UNA LECCIÓN DE MÉTODO, QUE ES LA DE LA VUELTA

Los dos ajustes que saqué no eran errores de código: eran errores de **medición**. Una prueba que
calibra su cero en el momento equivocado no falla ruidosamente — devuelve un número plausible y
mueve el diseño en la dirección equivocada. Las dos veces que esta vuelta cambié algo por una
medición, la medición estaba mal, y las dos veces se vio porque el número era **absurdo** (117 ms de
asentamiento donde el muestreo solo explica 83) o porque **no cambiaba con lo que tenía que cambiar**
(cuatro constantes de suavizado dando resultados idénticos hasta el último decimal).

#### MEDIDO AL CERRAR

**120 partidas** internas: 120 terminadas, **0 cartas ilegales**. **30 apuntando con el rayo**: 30
terminadas, 0 ilegales, **0 fallos de puntería**. Tutorial completo en los tres idiomas. Separación
entre la mano dibujada y el punto que apunta **0**, con y sin espejo. Retardo de seguimiento 6,5 a
7,6 ms de 60 a 12 Hz; desparejo 1,00–1,01 en todo el rango; atenuación de temblor 2,69; histéresis
0,411/0,591; flanco 1 de 15. El control de 60 cuadros sigue llegando con hasta 60 ms de relleno y
**cero cambios una vez asentado**. 87 llamadas de dibujo en alta y 45 en baja. `window.__errs` vacío.
El HTML quedó en **255 KB**.

### Cuadragésima sexta vuelta (2026-08-28): **RezUno** — la cámara con `exact`, el ritmo de mano de RECREO, y los 60 cuadros forzados

Reporte: *"la mano va lentísima y lagueadísima y aún sigue usando la cámara frontal, te pedí la
trasera... usa el juego de baldi para ver cómo lograr un buen handtracking y fluido, obliga a 60fps si
o si incluso en gamas bajas"*. Los dos reclamos eran ciertos y los dos eran míos.

#### LA CÁMARA: PEDIR `environment` A SECAS ES UN DESEO, NO UNA ORDEN

`facingMode:'environment'` sin `exact` es una **preferencia**: el navegador puede abrir la que quiera,
y muchos Android abren la frontal igual. Y peor: con la petición blanda **no hay forma de saber cuál
abrió**, porque `getSettings()` no siempre trae `facingMode` — medido en el banco, la cámara del
contenedor no la trae. Ahí la versión anterior tenía que adivinar, y adivinaba "frontal": con la
trasera abierta el juego espejaba la mano al revés y escribía *"la mano adelante"*. Desde afuera eso es
indistinguible de estar usando la frontal, que es exactamente lo que se reportó.

Con `exact` no hay nada que adivinar: si la petición vuelve, **es** esa cámara. Se pide
`{exact:'environment'}`; si tira `OverconstrainedError` —una notebook no tiene trasera— se prueba
`{exact:'user'}`; y sólo si las dos fallan se pide cualquier cámara y ahí sí se lee el track.

Verificado en los dos caminos:

| aparato | qué pasa | `usa` | espejo | cartel |
|---|---|---|---|---|
| webcam (rechaza `exact`) | cae al tercer intento | user | sí | *la mano adelante* |
| teléfono (acepta `exact`) | primer intento | **environment** | **no** | *la mano por detrás del teléfono* |
| teléfono, tocando el botón | primer intento | user | sí | *la mano adelante* |

Y de paso se le piden **60 cuadros a la cámara**: la medición cuelga de `requestVideoFrameCallback`,
o sea que corre al mínimo entre el ritmo que pide el juego y el de la cámara. Con una cámara a 30 no
hay forma de medir más de 30 por mucho que sobre procesador.

#### EL RITMO DE LA MANO: RECREO YA TENÍA ESCRITO MI PROPIO ERROR

La vuelta pasada bajé el piso de medición a 8 Hz y lo presenté como la optimización. En `CLAUDE.md`,
una vuelta de RECREO **anterior a esa**, está el mismo error cometido y corregido, con el reporte
textual del jugador —*"ahora la mano va lento y súper lagueada"*— y la tabla que lo explica:

| ritmo | 24 Hz | 15 | 12 | 10 | 8 | 6 |
|---|---|---|---|---|---|---|
| retardo de seguimiento | 21 ms | 34 | 43 | 52 | **64** | 88 |

O sea que mi piso de 8 Hz dejaba la mano **64 ms atrasada**. La interpolación tapa el **escalonado**
—eso se midió y es cierto— pero no puede tapar el **retardo**, porque el dato no existe todavía. Medir
menos seguido no hace la mano más suave: la hace **más vieja**. Se copian las cuatro reglas de RECREO:

1. **El techo es 60 y no 24.** El 24 no era una decisión sino un resto de cuando no había forma de
   saber cuánto costaba medir en *este* aparato. Un teléfono rápido con una detección de 5 ms puede
   permitirse 60 mediciones por segundo y el techo se las cortaba a la mitad.
2. **Lo que se fija es cuánto hilo se le presta** (30 %), no cuántas veces se mide: `hz = carga / lo
   que tarda`. El rápido sube solo y el lento baja solo.
3. **El piso es 12 y no 8.** Por debajo de 12 el retardo pasa de 43 ms.
4. **El ritmo de reposo (10 Hz) es para cuando NO HAY MANO EN CUADRO**, no para cuando el juego no
   pregunta. Sin mano no hay nada que seguir y encima es el caso barato; y la misma medición que la
   encuentra ya sube el ritmo al máximo.

Medido, forzando el costo de medición:

| medir cuesta | 3 ms | 5 | 8 | 12 | 16 | 20 | 25 y más | sin mano |
|---|---|---|---|---|---|---|---|---|
| ritmo | 60 | 60 | 37,5 | 25 | 18,8 | 15 | 12 | **10** |

**Y UN DEFECTO DE ORDEN EN ESA MISMA CUENTA.** Estaba escrita `max(piso, min(techo, calc))`, así que
un aparato lento en reposo daba `max(12, min(10, 0,23)) = 12`: **el piso pisaba al techo** y el ritmo
de reposo no se aplicaba nunca. El piso va por dentro del techo.

#### LA VENTANA DE PREDICCIÓN SALE DEL HUECO MEDIDO, NO DEL PERÍODO PEDIDO

La predicción tiene que cubrir el hueco **de verdad**, y ése no es el período que el juego pidió: la
medición cuelga del cuadro de cámara, así que con una cámara a 30 el juego puede pedir 60 y recibir
30. Derivándola del pedido, la predicción cubriría la mitad de cada hueco. Medido: en cuanto el pedido
y el hueco discrepaban, el desparejo a 24 Hz pasaba de 1,00 a **1,47**. Ahora el hueco se mide.

Con eso, la interpolación aguanta todo el rango de ritmos (paso más grande ÷ paso medio; 1 es
perfecto):

| ritmo | 60 Hz | 40 | 24 | 17 | 12 |
|---|---|---|---|---|---|
| sin predicción | 1,00 | 1,65 | 2,37 | 3,36 | 4,54 |
| **con** | **1,00** | **1,00** | **1,01** | **1,01** | **1,01** |

Retardo 6,4 ms, atenuación de temblor 2,69, histéresis 0,411/0,591 y flanco 1 de 15: sin cambio.

#### LOS 60 CUADROS SE FUERZAN, Y ESO ES UN LAZO CERRADO

*"Obliga a 60fps sí o sí"* no lo puede dar una lista de tres calidades: la elige una persona que no
sabe cuánto le cuesta a **su** teléfono, y encima el costo cambia dentro de la partida —una mano en
cuadro cuesta más que ninguna—. Lo único que sostiene un número de cuadros es un control cerrado sobre
el tiempo **medido**. Se porta la regla de RECREO, con sus tres propiedades: escalones geométricos de
razón 1,12 (k² = 1,25, por debajo de la banda muerta de 1,359, que es lo que impide que oscile),
asimétrica y con enfriamiento, y con la racha necesaria para subir **duplicándose** en cada subida.
Lo que el jugador eligió en el menú manda como **techo**: el control sólo baja desde ahí.

**Y EL ÚLTIMO ESCALÓN NO ES LA RESOLUCIÓN: SON LAS SOMBRAS**, que valen la mitad de las llamadas de
dibujo. Se sacan últimas porque se notan más.

Medido **con el lazo cerrado** —el tiempo saliendo de lo que el control hizo, que es como oscila de
verdad— sobre 120 ventanas:

| relleno a plena resolución | dónde se queda | ms finales | ¿60? | cambios ya asentado |
|---|---|---|---|---|
| 10 ms | esc 0,89 · sombras | 18,3 | sí | **0** |
| 18 ms | esc 0,64 · sombras | 17,4 | sí | **0** |
| 26 ms | esc 0,57 · sombras | 19,1 | sí | **0** |
| 40 ms | esc 0,45 · sombras | 18,6 | sí | **0** |
| 60 ms | esc 0,45 · **sin sombras** | 18,2 | sí | **0** |

**Cero cambios una vez asentado en los cinco casos**: no parpadea. Y recupera — bajado al piso, con
9 ms de tiempo de cuadro vuelve a subir hasta el escalón 2 con las sombras puestas.

**EL LÍMITE HONESTO, MEDIDO:** el control no puede tocar el costo **fijo** —la detección de manos y el
JS del juego—. Con 4 ms de fijo llega a 60 aun con 60 ms de relleno; con 10 ms de fijo ya no llega por
mucho que baje la resolución. Por eso el presupuesto del 30 % para el detector no es un lujo sino la
otra mitad del mismo problema.

#### Y SE CORTARON LAS LLAMADAS DE DIBUJO A LA MITAD

Las llamadas de dibujo de este juego **son las cartas**: cada una lleva tres grupos de geometría
—cantos, cara y dorso— o sea tres llamadas cada una. Pero las de los rivales y el mazo **no muestran
la cara nunca**: para ellas los tres grupos son un gasto sin contrapartida. Con una geometría sin
grupos y un solo material pasan a **una** llamada. Lo único que cambia en pantalla es el canto, que
deja de ser `#f2f3f4` y pasa a ser el gris del dorso: cuatro centímetros de espesor a esa distancia son
uno o dos píxeles.

| | antes | ahora |
|---|---|---|
| alta (con sombras) | 149 | **87** |
| baja (sin sombras) | 77 | **45** |

#### MEDIDO AL CERRAR

**120 partidas** internas: 120 terminadas, **0 cartas ilegales**. **30 apuntando con el rayo**: 30
terminadas, 0 ilegales, **0 fallos de puntería**. Tutorial completo en los tres idiomas. Separación
entre la mano dibujada y el punto que apunta **0**, con y sin espejo. Los dos abanicos enteros dentro
del cuadro. Las tres calidades se aplican y se revierten. Los dos caminos de cámara verificados.
`window.__errs` vacío. El HTML quedó en **240 KB**.

**Quinta vez que un `const` puesto "donde corresponde temáticamente" tira el módulo entero:**
`MANO` se declara con `hz:MANO_HZ_TOPE` y las constantes del ritmo estaban cien líneas más abajo.
`Cannot access 'MANO_HZ_TOPE' before initialization` y la página en blanco. Antes del primer uso.

### Cuadragésima quinta vuelta (2026-08-28): **RezUno** — fuera las cabezas, selección gráfica, menú generado, y el lag de MediaPipe atacado donde estaba

Pedido: *"elimina lo de la cabeza y agrega selección gráfica y un buen menú god al principio, genera el
título y todo con highsfield fotos recortadas y eso, también las manos con la cámara trasera hermano,
también optimiza en un 300% lo de mediapipe porque entra la mano y se súper laguea igual que baldi"*.

#### LAS CABEZAS SE VAN

Estaban el cráneo, los ojos, el cuello y el torso. Se van los cuatro: sin la cabeza, el cuello y el
torso no sostienen nada, y un torso sin cabeza es peor que ninguno de los dos. Quedan las manos y los
antebrazos, que son lo que el jugador mira. Medido igual que antes: **81 → 75 llamadas de dibujo y
7.894 → 5.690 triángulos**.

#### EL LAG DE MEDIAPIPE: LO PRIMERO FUE DESCARTAR LA PALANCA OBVIA

Lo obvio para acelerar MediaPipe es bajarle la resolución de entrada. **Es lo que no sirve, y se
midió**, cronometrando `detectForVideo()` sobre 24 detecciones en cada tamaño:

| entrada | costo |
|---|---|
| 320×240 | 295,8 ms |
| 256×192 | 292,2 ms |
| 192×144 | 285,5 ms |
| **160×120** | **285,4 ms** |

**Cuatro veces menos píxeles compran el 3,5 %.** La razón es que MediaPipe redimensiona adentro al
tamaño fijo de sus modelos —192×192 el detector de palma, 224×224 el de puntos— así que lo único que
cambia con la cámara es la subida y el reescalado, que al lado de la inferencia no es nada. La entrada
se queda en 256×192 justamente porque no cuesta más que 160×120 y a esa resolución la mano se detecta
desde más lejos.

O sea: **el costo está en el modelo, y contra eso hay una sola palanca: cuántas veces se lo corre.**

#### EL RITMO SE AJUSTA SOLO AL COSTO MEDIDO

Y ahí está la explicación del reclamo. Sin mano, MediaPipe corre **sólo** el detector de palma; con
mano corre **además** el modelo de puntos. O sea que la detección se encarece **justo en el momento en
que aparece la mano** — que es exactamente lo que el jugador reportó. Con el período clavado en 42 ms,
ese costo extra sale del presupuesto del cuadro y el juego se cae.

La regla nueva es un **presupuesto** y no un número: la detección no puede llevarse más de **35 % del
tiempo de reloj**. Medido, forzando el costo de medición:

| medir cuesta | ritmo elegido |
|---|---|
| 4 ms | 24 Hz (el techo) |
| 10 ms | 24 Hz |
| 20 ms | **17,5 Hz** |
| 30 ms | **11,7 Hz** |
| 45 ms y más | **8 Hz** (el piso) |

Sube rápido y baja despacio a propósito: un pico aislado tiene que aliviar en el acto, pero para
volver a medir seguido hay que haber estado barato un rato. Y en el propio banco —donde cada detección
cuesta 1.491 ms con render por software— el juego se baja solo al piso de 8 Hz sin que nadie le diga
nada.

**ESTO SÓLO SE PUEDE HACER PORQUE LA MANO SE SIGUE DIBUJANDO A 60.** Medido en régimen, con el antes y
el después en la misma corrida, mirando el paso más grande dividido por el paso medio (1 es
perfectamente parejo):

| ritmo de medición | sin predicción | con |
|---|---|---|
| 24 Hz | 2,37 | **1,00** |
| 17 Hz | 3,36 | **1,01** |
| 12 Hz | 4,54 | **1,01** |
| 8 Hz | 7,51 | **1,01** |

Ése es el 300 %: se puede medir **tres veces menos seguido** —24 Hz a 8— y la mano dibujada sale igual
de pareja. Retardo de seguimiento 6,4 ms y atenuación de temblor 2,69, sin cambio.

**Y PARA QUE ESO FUERA CIERTO A 8 Hz HUBO QUE CORREGIR UN TOPE MAL PLANTEADO.** El tope de predicción
era una DISTANCIA fija (0,05 de pantalla), y estaba calibrado para los 42 ms de 24 Hz: en un aparato
lento —125 ms entre medidas— tapaba el último tercio de cada hueco y la mano volvía a ir a los saltos
justo donde más hacía falta que no. Medido: el desparejo a 8 Hz se quedaba en **2,51**. Lo que se está
afirmando con ese tope es *"una mano no se mueve más rápido que esto"*, y eso **no depende de cada
cuánto se la mida**: pasó a ser una velocidad (1,2 pantallas por segundo). A 24 Hz da exactamente los
mismos 0,050 de antes —o sea que donde ya andaba bien no cambia nada— y a 8 Hz da 0,150, que es lo que
hacía falta. Con eso el desparejo a 8 Hz baja de 2,51 a **1,01**.

#### LA SELECCIÓN GRÁFICA, Y NO ES UN ADORNO DE MENÚ

En este juego la cámara y el detector comparten el hilo con el dibujo, así que **cada píxel que no se
rellena es presupuesto que le queda a MediaPipe**. Tres opciones que cambian lo que cuesta, no lo que
el juego es — las cartas, los colores y la regla son las mismas en las tres:

| | píxeles | llamadas de dibujo | triángulos | mapa de sombra |
|---|---|---|---|---|
| alta | 301.584 | 149 | 14.150 | 1024 |
| media | 217.700 | 149 | 14.150 | 512 |
| **baja** | **108.433** | **77** | **7.126** | — |

**LAS SOMBRAS SON UNA PASADA ENTERA DE LA ESCENA**, no un matiz: con sombras, todo lo que proyecta se
dibuja dos veces. Apagarlas es literalmente la mitad de las llamadas.

**Y ESO CASI NO SE VE, PORQUE LA MEDICIÓN ESTABA MAL.** `render.info` se pone a cero al empezar cada
`render()`, y la pasada de sombra es *otra* pasada dentro de la misma llamada: leyendo sin apagar el
reset automático, las llamadas de la sombra no aparecen y apagar las sombras **parece no cambiar
nada** — el primer barrido daba 75 llamadas en las tres calidades. Es la misma trampa que ya había
costado una medición en Campo\_de\_Tiro. Con `info.autoReset=false` aparecen las dos pasadas.

Dos detalles de implementación que no son obvios:

- **La escala va en el `pixelRatio`, no en `setSize`.** Bajando el tamaño con `setSize(w*esc, h*esc,
  false)` el lienzo CSS también encoge y el juego queda dibujado en una esquina. Con el pixel ratio el
  lienzo mide lo mismo en pantalla y lo que baja es cuántos píxeles se rellenan de verdad.
- **El mapa de sombra viejo hay que soltarlo a mano.** three.js no recrea la textura porque cambie
  `mapSize`: se queda con la de antes y el cambio no hace nada.

Se aplica **en caliente** y se guarda: un ajuste que pide recargar la página no se prueba — el jugador
lo toca una vez, no ve nada y no vuelve.

#### EL MENÚ: EL TÍTULO PASA A SER UNA IMAGEN, Y ES UN CAMBIO DE CRITERIO

Estaba dibujado con tipografía, y el argumento era que pesa cero y queda nítido. Lo que ese argumento
pasaba por alto es que `font-family:inherit` sobre `system-ui` **no es la misma letra en cada
aparato**: en Android sale Roboto, en iPhone San Francisco y en Windows Segoe. O sea que el título del
juego —lo único que uno reconoce de lejos— cambiaba de forma según el teléfono.

Dos imágenes generadas con Higgsfield (`nano_banana_pro`), las dos **recortadas**:

- **El título** "RezUno", con `Rez` fino y `Uno` grueso. Va en **negro liso con todo el detalle en el
  canal alfa**, que en un texto negro sobre blanco es exacto y comprime muchísimo mejor: **14,4 KB**.
- **Una mano mate blanca haciendo una pinza y sosteniendo una carta**, recortada con el quitafondos:
  **15,7 KB**. Entra **por el borde de arriba a la derecha**, cortada, detrás del contenido. Centrada
  y entera se lee a calcomanía pegada encima del menú; entrando desde afuera del cuadro se lee a que
  hay algo más allá — es la misma lección del menú de Maicol. Y así no gasta alto, que en un marco 9:16
  con cuatro botones, el aviso de cámara y la fila de gráficos es justo lo que no sobra.

**EL FONDO DE LA IMAGEN GENERADA NO ERA BLANCO PURO, y eso rompía el recorte del título.** Medido:
1,49 millones de píxeles caen entre 253 y 255 —ruido de compresión— así que invirtiendo la luminancia
a secas ese ruido queda con alfa 2 y **la caja útil pasa a ser la imagen entera**: el recorte no
recortaba nada. Con el corte en 250 el ruido va a cero y el antialiasing de las letras, que va de 0 a
250, se conserva entero.

**Y LAS IMÁGENES NO VIVEN EN EL CÓDIGO FUENTE.** Están en `assets/rezuno/` y las pega `armar.py` sobre
dos marcas. Guardarlas ya en base64 dentro de `a.html` haría que la parte donde uno lee el CSS y la
estructura empiece con veinte mil caracteres de basura. La fuente sigue siendo legible y la salida
sigue siendo un archivo solo.

**EL AIRE DEL MENÚ SALIÓ DE LOS HUECOS.** Medido en 412×732: con los huecos viejos el botón de IDIOMA
terminaba en 732 clavado, o sea pegado al borde de abajo sin un píxel de aire. Bajando el hueco de
3,4vh a 2,6 y el margen de 6vh a 4: **cero solapamientos en 412×732, 360×640 y 430×764**, y el último
botón termina en 705, 630 y 746.

#### MEDIDO AL CERRAR

**120 partidas** por el camino interno: 120 terminadas, **0 cartas ilegales**. **30 partidas apuntando
con el rayo**: 30 terminadas, 0 ilegales, **0 fallos de puntería**. Tutorial completo en los tres
idiomas. Separación entre la mano dibujada y el punto que apunta **0**, con y sin espejo. Giro de
cabeza 17,8 grados. Los dos abanicos enteros dentro del cuadro. Las tres calidades se aplican y se
revierten en caliente. `window.__errs` vacío. El HTML pasó de 177 a **238 KB**, de los cuales 40 son
las dos imágenes en base64.

### Cuadragésima cuarta vuelta (2026-08-28): **RezUno** — manos humanas, la interpolación que no interpolaba, y dos rivales con cabeza

Pedido: *"mejora la mano a una más humanoide y aplícale una optimización igual a la de baldi, y que los
bots estén enfrentados sus manos también, agrégales una cabeza que se mueven animado, las cartas
flotando también y ver cómo con sus manos seleccionan las cartas"*.

#### LA MANO: TRES COSAS, Y NINGUNA ES AGREGAR POLÍGONOS

La anterior tenía la forma correcta y **un solo grosor para todo**. Veintiún esferas del mismo tamaño
unidas por cilindros más finos no se leen a mano: se leen a **collar de cuentas**.

1. **Cada articulación tiene su radio.** La muñeca es lo más gordo y cada dedo **afina** hacia la
   punta. Es una tabla de veintiún números, sacada de una mano adulta —palma de 9,5 cm, muñeca de
   1,75 de radio— y guardada **en fracción de la palma**, no en unidades del mundo: así la misma tabla
   sirve para tu mano, que cambia de tamaño según cuánto la acerques a la cámara, y para las de los
   rivales, que son fijas.
2. **El hueso toma el promedio de sus dos puntas y un pelo más**, no el mínimo. Con el mínimo el
   cilindro queda más fino que las dos esferas que une y **cada juntura se marca**: eso es el collar.
3. **La palma va en una base ortonormal.** La versión anterior componía la matriz con el ancho y el
   largo de la palma tal cual, y esos dos vectores **no son perpendiculares** en una mano de verdad:
   componer con ellos no rota el elipsoide, lo **cizalla**. Ahora la normal sale del producto cruzado y
   el ancho se recalcula contra ella.

Y la optimización de la forma es la de RECREO: las esferas bajan a 6×5 segmentos y los cilindros a 6
lados. Un nudillo ocupa unos pocos píxeles en un teléfono. Resultado medido: **cinco manos completas
—105 articulaciones, 109 huesos, 5 palmas— en TRES llamadas de dibujo**, y el archivo entero pasó de
**8.008 a 7.894 triángulos** *agregando* dos rivales con cabeza, torso y brazos.

**Y HUBO QUE ARREGLAR LA PRUEBA ANTES QUE EL DIBUJO.** La mano de mentira daba a los tres tramos de
cada dedo el **mismo largo**, y corto: 0,30 de la palma cada uno. Con los radios nuevos eso deja cada
tramo midiendo **dos veces su propio grosor**, y un cilindro de relación 2 entre dos esferas se ve
como una cuenta. O sea que la mano de mentira se veía a collar **aunque la de verdad no**, y una
prueba que no representa lo que se mira no sirve para mirarlo. Los tramos pasaron a 0,45 · 0,27 · 0,18
de la palma, que es la proporción de un dedo.

#### LA OPTIMIZACIÓN DE BALDI: LA INTERPOLACIÓN NO INTERPOLABA, Y LO DIJO LA MEDICIÓN

De RECREO faltaba la mitad. La que ya estaba: la medición cuelga de `requestVideoFrameCallback` del
propio `<video>`, o sea que dispara por cuadro de **cámara** y no de **render**. La que faltaba: **el
techo de mediciones y la interpolación**. Estaba en 45, o sea midiendo en cada cuadro que la cámara
entregara — que en un teléfono es todo el trabajo que hay.

Bajarlo a 24 **a secas habría sido peor**, y por eso el primer intento no sirvió: el filtro corría
dentro de la medición, así que la mano dibujada se movía **sólo cuando había medición**. Se separó el
filtro y se lo llamó en cada cuadro de dibujo… y el gancho nuevo dijo que **seguía sin interpolar**:
el 1-euro acercándose a un destino quieto converge en dos cuadros y después se queda.

Así que entró la predicción de verdad, con las tres protecciones que RECREO ya había pagado:

- **Acotada en tiempo a 45 ms.** A 24 Hz hay 42 ms entre medidas: la predicción cubre el hueco entero
  y ni un milisegundo más. Extrapolar más lejos que el próximo dato no es interpolar, es inventar.
- **Atada a la velocidad.** Con la mano quieta, la diferencia entre dos medidas **no es movimiento: es
  el ruido del detector**. Por debajo de 0,15 de pantalla por segundo no se predice nada.
- **Y acotada en distancia**, que fue un defecto propio encontrado midiendo: con un salto sintético de
  0,58 en un cuadro la velocidad sale enorme y la predicción la multiplica — **el punto se iba a 2,39
  de pantalla**, o sea bien fuera del cuadro. Ahora el adelanto se topa en 0,05 y se escala **la mano
  entera con el mismo factor**, porque escalando por punto la mano se deformaría justo al moverse.

**Medido en régimen** —midiendo cada 42 ms y dibujando cada 16,7, que es lo que pasa de verdad— y con
el antes y el después **en la misma corrida**, porque una mejora contada contra el recuerdo no es una
medición:

| mano a | desparejo sin predicción | con predicción |
|---|---|---|
| 0,6 pantallas/s | **2,19** | **1,00** |
| 1,2 pantallas/s | **2,33** | **1,00** |
| casi quieta (0,02) | 1,21 | **1,21** |

`desparejo` es el paso más grande dividido por el paso medio: 1 es perfectamente parejo. El cuadro que
cae justo después de una medición saltaba 2,2 veces lo que saltaban los otros — eso es el escalonado.
Y la última fila es la que prueba que la puerta de velocidad funciona: con la mano quieta la
predicción **no cambia absolutamente nada**, así que no puede amplificar el ruido.

Lo demás quedó igual, que también hay que comprobarlo: retardo **6,4 ms**, atenuación de temblor
**2,69**, histéresis 0,411/0,591, flanco 1 de 15.

**Y VEINTICUATRO EN TODOS LADOS.** La primera versión partía el techo con `pointer:coarse` —24 en
teléfono, 45 en PC— y esa rama **no se puede comprobar**: el navegador del banco dice `coarse` también
corriéndolo como escritorio, así que la mitad del código quedaba sin medir. Con la interpolación
puesta, 24 dibujan igual de parejo que 45.

**Lo que NO se pudo medir:** en el banco cada detección cuesta 440 ms (SwiftShader) y la cámara falsa
entrega 20 cuadros por segundo, así que el techo de 24 **nunca llega a morder** — medido, 2,83
mediciones por segundo. El ahorro del techo es aritmética conocida (una cámara de 30 fps pasa de 30 a
24 detecciones por segundo, y cada una cuesta entre 8 y 20 ms en un teléfono); lo que sí está medido
de verdad es la otra mitad, que es que bajar el ritmo ya **no** cuesta suavidad.

#### LOS RIVALES DEJAN DE SER UN ABANICO

Antes un rival era un abanico de dorsos apoyado en la mesa y dos manos de pose fija al costado, y
jugaba **teletransportando** la carta: en un cuadro estaba en su mano y en el siguiente arriba del
montón. Se veía que algo había pasado, no **quién** lo había hecho.

**LA MANO SE CONSTRUYE EN SU PROPIO MARCO Y DESPUÉS SE COLOCA.** La versión anterior calculaba cada
punto directo en coordenadas de mundo con senos y cosenos metidos en el bucle: girar la mano un poco
era reescribir la fórmula. Ahora hay una **pose local** —muñeca en el origen, dedos hacia +Z, palma
hacia abajo— con un parámetro de cierre, y una matriz que la lleva a donde va. Girar, inclinar o
cerrar la mano son tres números.

**El turno de un rival pasa a ser una secuencia de tres tiempos**: piensa 0,45 s mirando su abanico,
agarra 0,34 s con la mano viajando hasta la carta, y lleva 0,42 s con la carta colgada de la pinza
hasta la pila. La carta se baja de verdad recién al final. **Y la elección se hace al empezar a
agarrar, no al bajar**: eligiendo al final, la mano habría estado viajando hacia una carta todavía sin
decidir.

**EL SITIO DE LA CARTA AGARRADA *ES* EL PUNTO DE LA PINZA**, calculado de los mismos veintiún puntos
que se dibujan. No es una animación pegada al lado: si la mano se mueve, la carta se mueve, y no
pueden separarse. Cuatro números salieron de mirar el resultado:

- **La carta cuelga media carta por debajo de la pinza**, no centrada en ella. Centrada, la mano queda
  dibujada encima de la mitad de la carta y se lee a mano **tapando** una carta. Y la mano apunta a
  esa misma distancia por encima del sitio de la carta, así que al engancharse la carta no se mueve
  ni un milímetro.
- **La carta no se engancha hasta que la mano llegó** (alcance 0,55 y no 0,02). Enganchándola apenas
  la mano arranca, la carta salía volando del abanico **hacia** la mano, al revés de lo que pasa.
- **Se acuesta recién en el último tercio del viaje.** Acostada desde el principio, una carta plana
  vista desde una cámara que mira de arriba queda debajo de la mano y no se ve — y lo que se pidió es
  justamente verla.
- **El antebrazo termina justo antes del abanico.** Llevándolo hasta el hombro, que está dos unidades
  detrás de las cartas, el cilindro **atraviesa el abanico por el medio**: a la altura de las cartas
  pasaría por y 1,93 con el abanico ocupando de 0,45 a 2,65. Y entra por la **misma malla instanciada**
  que los huesos de los dedos, así que los cuatro antebrazos cuestan **cero llamadas de dibujo**.

#### LA CABEZA MIRA LO QUE EL RIVAL ESTÁ HACIENDO

Piensa → mira su abanico. Agarra y lleva → mira la pila. Si no es su turno → mira la mesa, y cada
tanto **te mira a vos**. Una cabeza que se mueve al azar se lee a adorno; una que mira lo que pasa se
lee a alguien jugando. Encima respira, se balancea con dos senos de frecuencias que no son múltiplos
—para que el ciclo no se repita nunca igual— y **parpadea** cada 7,7 segundos durante 0,22: es lo más
barato que existe, un seno y un umbral, y es lo único que separa "una cabeza que rota" de "alguien
mirándote". Cada rival lleva su propio desfase: dos personas sincronizadas se leen a una animación
repetida, que es lo que son.

Cuatro mallas instanciadas **para los dos rivales**, no cuatro por rival, y **los ojos salen de la
matriz del cráneo** con un desplazamiento local: siguen la cabeza por construcción y no hay dos
animaciones que puedan desincronizarse. El cuello y el torso **no** giran con la cabeza — si giraran,
mirar de reojo giraría el cuerpo entero y se leería a torreta.

**Y EL TORSO ESTABA AL REVÉS.** Con el radio de arriba en 0,60 y el de abajo en 1, la parte que asoma
por encima del abanico era **la más angosta**: 1,32 de medio ancho contra las 2,12 que mide el
abanico, o sea tapada entera, y en pantalla **la cabeza salía flotando sola como un globo**. Los
hombros son lo más ancho de un torso visto de frente. Dado vuelta y con 2,45 asoman ocho décimas por
cada lado; más no, porque a 2,9 los dos rivales se tocarían en el medio de la mesa.

#### LAS CARTAS FLOTAN, Y NO ES SÓLO ESTÉTICA

Los abanicos de los rivales estaban **apoyados en la mesa y casi acostados** (74 grados), así que desde
una cámara que mira de arriba se veían como una franja de cantos. Levantados y parados a 31 grados el
dorso queda de frente y el abanico crece **hacia arriba**, que es justo donde hay pantalla libre y
donde ahora está la cabeza. El vaivén va **desfasado carta por carta**: con todas en fase el abanico
entero sube y baja como un bloque, que se lee a error de cámara y no a cartas flotando. **Tu** abanico
flota la mitad —cuatro centésimas— porque sobre tus cartas se apunta.

#### DOS DEFECTOS PROPIOS QUE SÓLO APARECIERON MIDIENDO

- **El reloj del filtro se congelaba yendo para atrás.** Al separar el filtro de la medición puse
  `if(dt<=0) return`, y los ganchos de prueba inyectan con marcas de tiempo sintéticas: después de una
  prueba que dejó el reloj adelantado, la siguiente pasaba **setenta cuadros sin filtrar nada** y
  reportaba **792 ms de retardo donde hay 6,4**. Reanclando el reloj se pierde una muestra y listo.
- **La cabeza le caía encima al rótulo.** Desde que cada rival tiene cara, el cráneo proyecta entre el
  21% y el 36% del ancho, y el nombre arrancaba en el 7% midiendo el 19%. Los rótulos se pegaron al
  2,5% y adelgazaron, y los rivales se corrieron de 4,9 a 2,95: **cero solapamientos** medidos contra
  las cajas del DOM.

#### EL ORDEN DEL BUCLE CAMBIÓ, Y ES POR UNA RAZÓN

`manosPintar` va **antes** de `armarMesa`. La carta que un rival está agarrando se coloca en el punto
de la pinza de su mano; armando la mesa primero, esa carta usaría la pinza del cuadro **anterior**. Un
cuadro a 60 son 17 ms, pero la mano viaja medio metro en medio segundo: la carta se vería despegada
del pulgar justo en el momento en que hay que mirarla.

#### MEDIDO AL CERRAR

**120 partidas** por el camino interno: 120 terminadas, **0 cartas ilegales**. **30 partidas apuntando
con el rayo**: 30 terminadas, 0 ilegales, **0 fallos de puntería** — o sea que las cartas flotando no
movieron un solo blanco. Tutorial completo en los tres idiomas, y sin rivales dibujados durante el
tutorial (0 cabezas, 0 manos). Separación entre la mano dibujada y el punto que apunta **0**, con y sin
espejo. Giro de cabeza 17,8 grados con el abanico entero en cuadro. Cabezas y abanicos de los dos
rivales **enteros dentro del cuadro y por encima de su propio abanico**. **81 llamadas de dibujo y
7.894 triángulos**. `window.__errs` vacío. El HTML pasó de 138 a **177 KB**.

### Cuadragésima tercera vuelta (2026-08-28): **RezUno** — la cámara trasera, y el espejo que se deducía mal

Pedido: *"quiero ver la mano we como el de baldi cámara trasera we"*. La cámara trasera pasa a ser
**la de por omisión**, como en RECREO, y hay un botón en el menú para volver a la frontal.

#### POR QUÉ LA TRASERA ES LA CORRECTA PARA ESTE JUEGO

Con la frontal hay que apoyar el teléfono en algo y jugar de lejos, apuntándose a uno mismo. Con la
trasera se sostiene el teléfono con una mano y se mete **la otra por detrás**: la mano entra en la
escena por donde entraría de verdad, que es exactamente lo que hace que se lea a mano y no a cursor.

Se pide como **preferencia y no con `exact`**. Una notebook no tiene cámara trasera, y `exact` la
dejaría sin manos por pedir algo que no existe. Si la preferida falla, se prueba la otra antes de
darse por vencido.

#### EL DEFECTO DE FONDO: `getSettings()` NO SIEMPRE TRAE `facingMode`

La primera versión leía `MANO.usa = s.facingMode || CAM_PREF`, o sea "lo que diga el track, y si no
lo que pedí". Medido en el banco con una cámara de las que tiene una notebook: **`getSettings()` NO
trae la clave `facingMode`** — `getCapabilities()` la lista, pero el valor no está. Así que el
respaldo devolvía `'environment'` de puro descarte y dejaba **sin espejo una cámara que apunta a la
cara del jugador**. En un aparato así, mover la mano a la derecha mueve la mano del juego a la
izquierda y no hay forma de apuntar a una carta: el juego queda injugable en toda la clase de
aparatos donde la trasera ni siquiera existe.

La regla correcta es **asimétrica**, y ésa es la parte que importa: *una cámara que no dice para
dónde mira no es la trasera*. Un teléfono informa su `facingMode`; una webcam callada es de las que
te apuntan a la cara. Así que **sólo un track que diga `environment` apaga el espejo**, y el silencio
se lee frontal. Y el cartel de estado sale del mismo valor, así que no pueden contradecirse.

Medido con las dos clases de aparato, entrando por el mismo camino que una persona:

| el track dice | `usa` | espejo | cartel |
|---|---|---|---|
| `environment` (teléfono, trasera) | environment | **no** | *la mano por detrás del teléfono* |
| `user` (teléfono, frontal) | user | sí | *la mano adelante, girá la cabeza para mirar* |
| **nada** (webcam de notebook) | user | **sí** | *la mano adelante…* |

Antes del arreglo, la tercera fila daba `environment` y espejo **no**.

#### LA CARA SÓLO SE PIDE CON LA FRONTAL, Y NO ES UNA OPTIMIZACIÓN MENOR

Con la trasera tu cara está **del otro lado del teléfono**: girar la cabeza no puede mover la vista
porque no hay nada que mirar. En vez de dejar un detector corriendo que no va a encontrar nada nunca,
**ni siquiera se pide el modelo**: son **3.758.596 bytes** que no se bajan y **0 detecciones de cara**
en la misma ventana en la que la frontal hace 13. La línea de estado lo dice, así que el jugador
elige: TRASERA para meter la mano por detrás, FRONTAL para que además se pueda mirar a los lados.
Las dos cosas no caben en una cámara.

El modelo de la cara tarda: medido, entra entre 8 y 10 s después de tocar el botón. Por eso se pide
**sin bloquear** — si no llegó, se juega igual con la cámara quieta.

#### CAMBIAR DE CÁMARA REARRANCA EL DETECTOR ENTERO

El flujo de video, el espejo y el detector de caras dependen de cuál cámara es, así que media docena
de cosas tendrían que reconciliarse en caliente. Se sueltan las pistas, se cierran los dos detectores,
se pone el estado en cero y se vuelve a pedir.

**Y EL BOTÓN SE BLOQUEA MIENTRAS ARRANCA.** Medido tocándolo tres veces seguidas: con el detector a
medio abrir quedaban **dos `manosIniciar()` en vuelo**, y la que terminaba segunda pisaba el espejo y
el cartel de la primera — o sea el juego diciendo una cámara y espejando la otra. Con el cerrojo, tres
toques seguidos producen **un** rearranque.

La elección **se guarda** (`rezuno_cam`): verificado recargando la página, vuelve con la que se eligió.

#### EL GANCHO DE PRUEBA APRENDIÓ EL ESPEJO

`manoInyectar()` forzaba `espejo=false`, o sea que **todas** las pruebas de mano probaban un solo
camino. Ahora el espejo es un parámetro: por omisión sigue sin espejo —que es la trasera, la de por
omisión del juego— y pasando `true` se prueba el de la frontal por el mismo gancho. Medido, la
separación entre **la mano dibujada y el punto que apunta es 0 en los dos**, que es la propiedad que
no puede romperse: si fueran dos caminos, el jugador vería su pinza en un lugar y agarraría una carta
en otro.

#### MEDIDO AL CERRAR

120 partidas por el camino interno: **120 terminadas, 0 cartas ilegales**. 30 partidas apuntando con
el rayo: **30 terminadas, 0 ilegales, 0 fallos de puntería** (la más larga, 4.137 vueltas). Tutorial
completo en los tres idiomas y JUGAR bloqueado hasta terminarlo. Manos 110 articulaciones y 105 huesos
en 2 llamadas de dibujo, separación dibujo-puntería 0 con y sin espejo. Flanco 1 de 15 cuadros,
histéresis 0,411/0,591, retardo 6,4 ms, atenuación de temblor 2,69. Giro de cabeza 17,8 grados con el
abanico entero en cuadro. 76 llamadas de dibujo, 8.008 triángulos. `window.__errs` vacío. El HTML
quedó en **138 KB**.

**Lo que no se pudo probar de verdad:** el banco no tiene una cámara trasera, así que el caso del
teléfono se probó **simulando el track** —envolviendo `getUserMedia` para que `getSettings()` informe
el `facingMode` que se pidió, que es exactamente lo que hace un teléfono—. Lo que sí es real es la
otra mitad: la cámara del contenedor **no** informa `facingMode`, y ése es justamente el caso que
estaba roto.

### Cuadragésima segunda vuelta (2026-08-28): **RezUno** — las manos se ven, y la cabeza mueve la vista

Pedido: *"no aparecen las manos y deben ser 7 cartas por jugador, también agrega reconocimiento facial
o sea solamente para el movimiento y pon que el jugador pueda mirar a los lados con solo girar su
cabeza, y que al otro cpu también se le vean las manos, que las manos sean blancas y minimalistas"*.

**LAS 7 CARTAS YA ESTABAN**, y lo mejor es que se puede decir con un número en vez de discutirlo: el
reparto da `[7,7,7]` con 86 en el mazo y 1 en la pila, o sea **108** — el mazo entero, sin una carta
de más ni de menos. Queda medido en la batería para que no haya que volver a preguntarlo.

#### LA MANO SE RECONSTRUYE SOBRE SU PROPIO RAYO DE PANTALLA

MediaPipe da también `worldLandmarks` en metros y parece lo obvio: anclar la mano en la muñeca y
escalar la forma. Pero el juego **apunta con el punto de pantalla** —el rayo sale de ahí— y una mano
colocada por su geometría métrica **no cae donde están esos puntos**: verías la pinza en un lugar y
agarrarías una carta en otro. Es el mismo defecto que en RECREO costó una vuelta entera.

Acá cada punto se pone **sobre su propio rayo**, a una profundidad que sale de su z relativa. El
dibujo y el apuntado son la misma cosa *por construcción*. Medido: la punta de la pinza dibujada y el
punto que apunta caen en la misma fracción de pantalla con **separación 0,00000**.

Y los 21 puntos pasan por **el mismo filtro y el mismo espejo** que el punto del aro. Que compartan
las dos cosas no es ahorro de líneas: es lo que garantiza que la mano dibujada y el punto que apunta
no puedan separarse nunca.

#### BLANCAS Y MINIMALISTAS, PERO SOBRE UNA MESA BLANCA

Una mano blanca mate sobre una mesa blanca es una mancha. Lo que la separa no es el color sino **la
luz**: material lambert, la direccional, y sobre todo **proyecta sombra**. La sombra es lo que dice
"esto está flotando encima", y es lo único que permite que una mano blanca sobre blanco se lea. Sin
sombra habría que oscurecerla, y entonces ya no sería blanca.

**Y LE FALTABA LA PALMA.** La primera captura mostraba cinco varillas con pelotitas en las junturas:
un esqueleto. Lo que vuelve una mano a un montón de huesos es el volumen que los une. Es la misma
esfera instanciada, achatada y orientada según la propia palma, así que **no cuesta ni una llamada de
dibujo más**. Y las articulaciones bajaron a casi el grosor de los huesos: con las pelotitas más
gordas cada juntura se marca y el dedo se lee a hueso articulado.

Los rivales tienen manos por el mismo camino: **no se miden de ninguna cámara, se arman** con los
mismos veintiún puntos en una pose fija. Reusar la estructura no es elegancia — es lo que hace que se
vean de la misma familia que la tuya sin escribir un segundo dibujante de manos. Su única animación es
estirarse hacia la mesa cuando les toca, y alcanza para que se lea que fueron ellos los que jugaron.
Todo instanciado: **dos llamadas de dibujo para las cinco manos**.

#### LA CARA: UN SOLO NÚMERO, Y A 12 Hz

Se pidió *"solamente para el movimiento"* y se tomó literal: no se lee ningún gesto, se lee **el giro
horizontal de la cabeza** y nada más. Sale de la matriz de transformación que devuelve el modelo y no
de deducirlo de dónde cae la nariz entre los ojos — eso funciona hasta que la persona se inclina o se
acerca.

**Y VA A 12 Hz CONTRA LOS 45 DE LA MANO.** Son dos modelos sobre el mismo video, así que el costo se
suma; y no hace falta más: una cabeza tarda medio segundo en girar de un lado al otro, o sea que a 12
Hz se la mide seis veces en el camino. La mano **sí** necesita ritmo, porque es la que apunta. El
modelo de la cara además se pide **después y sin bloquear**: si no llega, se juega igual con la vista
quieta.

#### MIRAR A LOS LADOS: SE ORBITA, Y TUS CARTAS GIRAN CON VOS

Girar la cámara en el sitio es lo que suena a "mirar a los lados", pero acá no se puede: el campo
**horizontal** de este encuadre son 26 grados, así que con 13 de giro las cartas se van del cuadro — y
el juego entero consiste en apuntarles. Orbitando alrededor del centro de la mesa, la mesa se queda
donde está y lo que cambia es **el ángulo desde el que se la ve**.

**Pero orbitar movía tu propio abanico**, que está a nueve unidades del pivote: medido, con dos grados
ya asomaba fuera de pantalla. Y la solución no es girar menos, es que **tus cartas son tuyas**: cuando
alguien sentado a una mesa gira la cabeza para mirar de reojo, sus propias cartas no se quedan atrás.
El abanico y los dos botones viven en un grupo que gira lo mismo que la cámara alrededor del mismo
pivote, así que su sitio **en la pantalla** no cambia mientras la mesa sí rota.

#### Y EL LÍMITE ERAN 14 GRADOS POR DOS DEFECTOS DE **MEDICIÓN**, NO DEL JUEGO

El barrido decía que el abanico se salía del cuadro a partir de los 3 grados. Dos cosas estaban mal en
el gancho que mide, y las dos son la misma familia de error:

1. **Medía la caja alineada a los ejes.** `Box3.setFromObject` devuelve la caja envolvente en el
   mundo, y para una carta inclinada y girada esa caja es bastante más grande que la carta — y crece
   cuando la vista rota. Se estaba midiendo una caja imaginaria. Ahora se proyectan las ocho esquinas
   del objeto **en su propio espacio**.
2. **Ponía al día la matriz del hijo pero no la del padre.** `updateMatrixWorld()` sobre una carta no
   actualiza el grupo que la contiene, así que desde que el abanico vive en un grupo que gira, la
   carta se proyectaba con la matriz **vieja** del grupo. Es exactamente el mismo defecto que ya había
   costado una prueba en el rayo, con otro disfraz.

Con las dos cosas arregladas, el abanico cae **exactamente en la misma fracción de pantalla de 2 a 16
grados de giro**: `x:[0,065 · 0,940]` en todos. El límite lo pone ahora lo que se quiere ver y no lo
que se rompe, y quedó en **20 grados**.

#### DOS GANCHOS DE PRUEBA QUE SE ROMPIERON AL CAMBIAR LA MANO SINTÉTICA, Y POR QUÉ IMPORTA

La mano de mentira pasó de cuatro puntos útiles a los veintiuno con sus falanges —hacía falta, porque
con la anterior la mano dibujada en 3D salía un palito y no se podía juzgar nada—. Y al hacerla real
apareció que **el punto que apunta no está en el centro de la mano**: el medio entre pulgar e índice
está corrido 0,093 de pantalla. Eso rompió dos mediciones de una forma que hay que saber leer:

- el gancho del **retardo** reportó **193 ms** donde hay 6, porque sumaba ese corrimiento constante al
  atraso del filtro. Ahora se calibra el desvío antes de medir.
- el del **temblor** reportó que el filtro *amplificaba* el ruido 25 veces, porque medía la desviación
  alrededor de 0,5 en vez de alrededor de la media real. Ahora usa la media medida: atenúa **2,69**.

Los dos números anteriores eran falsos y los dos parecían resultados. Es el recordatorio de siempre:
una prueba que cambia de respuesta cuando cambia el *generador de datos* estaba midiendo el generador.

#### MEDIDO AL CERRAR

Reparto **[7,7,7] + 86 + 1 = 108**. **30 partidas jugadas apuntando con el rayo: las 30 terminan, 0
cartas ilegales, 0 fallos de apuntado.** 120 por el camino interno: 120 terminadas, 0 ilegales,
ganador 43/41/36. Tutorial completo. Manos 3D: **110 articulaciones y 105 huesos en dos llamadas de
dibujo**, y la pinza dibujada coincide con la que apunta con **separación 0**. Giro de cabeza: 20
grados de tope y el abanico invariante entre 0 y 20. Retardo del aro 11,2 / 6,4 / 3,0 ms según la
velocidad; temblor atenuado 2,69. Flanco 1 de 15. Histéresis 0,411 / 0,591. 76 llamadas de dibujo,
8.008 triángulos. `window.__errs` vacío. El HTML pasa de 103 a **128 KB**.

**Lo que no pude verificar:** cómo responde el detector de caras con una cabeza de verdad, y los fps
reales con los dos modelos corriendo a la vez. El banco inyecta caras y manos sintéticas y renderiza
por software.

### Cuadragésima primera vuelta (2026-08-28): **RezUno pasa a 3D** — mesa blanca, y cuatro defectos que sólo aparecen apuntando con un rayo

Pedido: *"pero 3D hermano 3D en un ambiente 3D blanco no negro"*. La primera versión dibujaba las
cartas con un contexto 2D sobre fondo casi negro. Ahora es una escena de three.js: cartas con grosor,
sombra de contacto y perspectiva, sobre una mesa blanca.

#### POR QUÉ BLANCO, Y NO SÓLO "PORQUE NO NEGRO"

Este juego tiene **una** regla y es *"del mismo color"*. Sobre fondo oscuro los cuatro colores se
acercan entre sí —todos leen como "claro contra oscuro"— y sobre blanco se leen por lo que son.
Además una mesa de cartas es blanca. El fondo no es decoración: es lo que hace legible la única
decisión del juego. El dorso también pasó a claro por lo mismo: con dorsos negros, los dos abanicos
de los rivales y el mazo eran los tres bloques más pesados del cuadro, y son lo que menos importa.

#### APUNTAR EN 3D ES UN RAYO, Y ESO CAMBIÓ CUATRO COSAS

La mano vive en la cámara web —dos dimensiones, normalizadas— y las cartas viven en el mundo. El
puente es tirar un rayo desde el punto de pantalla donde está el aro. Comparar en el mundo obligaría
al jugador a acertar una profundidad, que es lo que se pidió evitar con todas las letras.

Pasar de rectángulos a un rayo destapó **cuatro defectos**, y ninguno se ve en una captura:

**1. La carta agarrada tapaba el botón.** Al levantarla queda MÁS CERCA de la cámara que TIRAR y
DEJAR, así que el rayo la tocaba primero, veía que tiene tipo, y devolvía una carta desactivada — o
sea que pellizcar TIRAR no hacía nada. Marcarla como inactiva no alcanzaba: una carta que ya está
agarrada no es un blanco, así que directamente no entra en la lista.

**2. Los botones desaparecían de la lista en el primer cuadro.** La lista de blancos se vacía en cada
cuadro —las cartas cambian de número y de sitio— y los botones estaban anotados una sola vez al
crearse. Medido: `pellizcarZona('tirar')` devolvía *"no hay tirar"*.

**3. EL RAYO USABA MATRICES DEL CUADRO ANTERIOR.** three.js recalcula las matrices de mundo **cuando
dibuja**, así que un rayo tirado antes de dibujar apunta a donde estaban las cosas antes. En el juego
eso queda tapado porque se dibuja todos los cuadros, pero es una dependencia de **orden** invisible, y
la prueba —que apunta sin dibujar— la destapó: apuntar a la carta 2 devolvía la 3, porque la 3 seguía
donde estaba en la mano anterior. Ahora el rayo pone las matrices al día él mismo.

**4. Y EL ABANICO SE SUPERPONÍA EN EL ORDEN EQUIVOCADO.** La profundidad venía del arco: las cartas
del medio quedaban más lejos que las de las puntas, así que las de afuera tapaban a las de adentro y
el centro de una carta del medio podía estar debajo de su vecina. Medido: de 25 partidas jugadas
apuntando al centro de cada carta, **9 se trababan**. Ahora la profundidad la decide únicamente el
índice —cada carta tapa a la anterior y a ninguna otra, como un abanico de verdad— y con eso todas
tienen una franja visible del mismo lado.

**Y el arco en altura tuvo que irse, que es la segunda mitad del mismo defecto:** con las cartas
inclinadas 45 grados, subir una carta 0,04 la acerca a la cámara 0,028, o sea que el arco metía una
profundidad propia **del mismo tamaño** que el escalón del solape. Con el escalón en 0,05 y sin arco
de altura, el orden es inconfundible. El abanico se sigue viendo abanico porque el giro de cada carta
no se tocó.

#### LO QUE SE APUNTA ES LA FRANJA VISIBLE, NO EL CENTRO

Con solape, el centro de una carta puede estar debajo de la siguiente. Lo que el jugador ve —y por lo
tanto dónde apunta— es la tira que asoma, y su ancho sale de la geometría: el ancho de la carta menos
el paso del abanico. El punto se calcula **pasando por la matriz de la propia carta** y no
reconstruyéndolo a mano: la carta está girada en dos ejes, y escribir *"x más dx por el coseno del
giro"* es adivinar en qué orden three.js compone los ángulos — adivinarlo mal manda el punto a otra
carta, y fallaba en una de cada siete.

#### EL ENCUADRE SE MIDIÓ, Y LA PRIMERA RESPUESTA FUE CAMBIAR LA MESA, NO LA CÁMARA

Entró un gancho que proyecta las ocho esquinas de **todas** las piezas y devuelve el rectángulo que
ocupan en pantalla. Con la primera mesa —casi cuadrada, 9,2 de ancho por 13,8 de fondo— barrí **200
combinaciones** de campo, altura y distancia, y la mejor usaba el **34 % del alto**: en un marco 9:16
eso deja el tercio de arriba y el sexto de abajo vacíos. **No hay cámara que lo arregle, porque el
problema es la forma de lo que se mira.** Estirada a 21 de fondo por 9 de ancho —una proporción de
2,3 contra el 1,78 de la pantalla— el mismo barrido encuentra encuadres que llenan el alto. Quedó en
campo 44, a 16 de alto y 21 de fondo: **97 % del ancho, todo adentro del cuadro**.

Dos medidas más salieron del mismo gancho: **la carta mide 1,72 y no 2,00** —el abanico entero tiene
que entrar en 7,2 unidades, que es lo que entra, así que el paso lo fija la pantalla y no la carta;
con cartas de 2,00 el solape era del 55 % y de siete cartas se leían cuatro— y **las cartas de la mano
se paran a 45 grados en vez de acostarse a 58**, porque tumbadas la cara se escorza tanto que el
número pierde la mitad de su alto.

#### TRES GRUPOS Y NO SEIS: LA MITAD DE LAS LLAMADAS DE DIBUJO

Una `BoxGeometry` trae un grupo por cara, o sea **seis llamadas por carta**. Los cuatro cantos y el
dorso comparten material —el dorso **no se ve nunca**, porque "boca abajo" en este juego es ponerle el
dorso a la cara de arriba, no dar vuelta la carta— así que quedan tres grupos. Medido: **de 142
llamadas a 73**.

#### UN DEFECTO DE DIBUJO QUE SE VIO EN LA PRIMERA CAPTURA EN 3D

Las cartas de los rivales y el mazo salían como **rectángulos blancos**. `ponerCara(null)` dejaba el
material sin mapa, y un material blanco sobre una mesa blanca es un rectángulo invisible.

#### LOS ROTULOS VUELVEN A DOM

Los nombres de los rivales, sus cuentas de cartas y la línea de turno son DOM y no textura: son texto
que hay que traducir y que tiene que verse nítido en cualquier densidad. Y ocupan la franja de arriba,
que con una mesa larga y angosta queda libre **por geometría**. Se escriben **sólo cuando cambian** —
escribir en el DOM cada cuadro obliga al navegador a recalcular el layout sesenta veces por segundo
para poner el mismo texto.

Dos posiciones salieron de mirar la captura: el rótulo de turno caía encima de la carta levantada
—que proyecta entre el 47 % y el 62 % del alto— así que **con una carta en la mano el rótulo se va
entero**, porque los dos botones que acaban de aparecer *son* la instrucción; y el *"ELEGÍ COLOR"*
caía encima de los cuatro cuadros de color, que empiezan en el 34 %.

#### MEDIDO AL CERRAR

**30 partidas jugadas de punta a punta apuntando con el rayo: las 30 terminan, 0 cartas ilegales y 0
fallos de apuntado.** 120 partidas por el camino interno: 120 terminadas, 0 ilegales, ganador
43/41/36. Tutorial completo en los tres idiomas y JUGAR sigue bloqueado hasta hacerlo. Encuadre: todo
adentro, 95 % del ancho. **73 llamadas de dibujo, 370 triángulos, 52 mallas.** Flanco: 15 cuadros de
pinza sostenida = 1 click. Histéresis 0,415 / 0,585. Retardo del aro 6,4 ms a media velocidad.
`window.__errs` vacío. El HTML pasa de 71 a **103 KB**.

**Lo que no pude verificar:** los fps reales. El contenedor renderiza por software, así que el costo
está medido en llamadas de dibujo y triángulos —que son exactos— y no en cuadros por segundo.

### Cuadragésima vuelta (2026-08-28): **RezUno**, el quinto juego — un UNO que se juega con un solo gesto

#### LA DECISIÓN DE FONDO: UN SOLO GESTO, Y TODO LO DEMÁS SALE DE AHÍ

Se pidió *"todo se maneja mediante pinchs"*, y tomárselo literalmente es lo que hace que el juego
funcione. No hay arrastrar, no hay mantener, no hay apuntar y esperar: **hay un pellizco**. Eso obliga
a que cada decisión sea una lista de blancos grandes y separados, que es exactamente lo que una webcam
puede resolver bien — y es lo contrario de lo que pasó en RECREO cuando una actividad pedía precisión
de profundidad.

De ahí sale la mecánica de dos tiempos que se pidió: **pellizcás una carta y aparecen dos opciones**,
TIRAR y DEJAR. Un solo tiempo —pellizcar la carta y que se tire— haría que cualquier temblor tirara
una carta que no querías, y en un juego de cartas eso no se puede deshacer.

#### EL BOTÓN APAGADO **ES** LA REGLA, Y ESO NO ES UNA FRASE

Se pidió que *"si el color no es el mismo directamente la de tirar aparece medio apagada"*. La
tentación es escribir la condición del botón por un lado y la del juego por otro. Acá hay **una sola
función**, `pega(carta, colorMesa, valorMesa)`, y la usan las cinco cosas que la necesitan: el botón,
el jugador, los dos rivales, el sombreado de las cartas que no sirven y el tutorial. Si fueran dos
cuentas, el botón diría una cosa y el juego haría otra — que es el defecto más difícil de encontrar
que puede tener un juego de cartas, porque solo aparece en el caso raro.

Y se comprueba: **25 partidas jugadas de punta a punta pellizcando las zonas** —o sea el camino
literal del jugador, buscando la zona donde se dibuja y activando su centro— con **0 cartas ilegales
bajadas**. Más 60 partidas por el camino interno: 60 terminadas, 0 ilegales.

#### LAS ZONAS SE CALCULAN MIENTRAS SE DIBUJA, EN LA MISMA LÍNEA

`pintarMesa()` dibuja una carta y **acto seguido** registra su zona, con los mismos números. No hay
una tabla de rectángulos en otro lado. Es la lección que en RECREO costó una vuelta entera: el
rompecabezas agarraba las piezas de la izquierda con la mano a la derecha porque el dibujo y el área
sensible eran dos cuentas distintas.

#### EL TUTORIAL: SEIS PASOS QUE SON SEIS COSAS QUE HACER, NO SEIS PANTALLAS DE TEXTO

Obligatorio, como se pidió: **JUGAR está bloqueado** hasta que esté hecho, y el pie dice por qué —un
botón apagado sin explicación se lee a juego roto, con la línea de abajo se lee a orden.

Cada paso **espera a que hagas la cosa**, así que no se puede saltear ni pasar sin entender:
levantar la mano · pellizcar · pellizcar una carta · pellizcar TIRAR · **una carta que no pega** ·
pellizcar el mazo. El quinto es el que importa y es el único que no se puede explicar con palabras:
la regla se aprende **viendo** que TIRAR está apagado con esa carta y encendido con la otra.

**Y LA MANO DEL TUTORIAL ESTÁ ARMADA CARTA POR CARTA, no repartida al azar.** El paso 5 *necesita* una
carta que no pegue con nada, y con un reparto aleatorio ese paso a veces no existe. Un tutorial que a
veces no puede enseñar lo que tiene que enseñar no es un tutorial. Verificado: los siete pasos en
orden, sin cámara, y en los tres idiomas.

#### DOS COSAS DE LA MANO QUE NO SON OBVIAS

**EL ARO VA EN EL MEDIO DEL PULGAR Y EL ÍNDICE, no en la punta del índice.** Es donde el jugador *ve*
que se cierra la pinza, así que es donde tiene que estar el cursor. Con la punta del índice, al cerrar
la pinza el aro se corre un centímetro justo en el momento de elegir.

**Y EL UMBRAL DEL PELLIZCO TIENE HISTÉRESIS Y NO UN NÚMERO SOLO.** Con un umbral único, una pinza que
queda justo en el borde parpadea varias veces por segundo, y **cada parpadeo es un click**: tirás una
carta que no quisiste. Cierra en 0,42 y abre recién en 0,58, medido: `cierra 0,415 · abre 0,585`.
Además vale el **flanco** y no el estado — una pinza sostenida quince cuadros da **un** click, medido.

Medido el filtro (1-euro con zona muerta sobre la derivada, normalizado por el tamaño de la palma):
retardo **11,2 ms** con la mano lenta, **6,4** a media y **3,0** rápido — o sea que cuanto más rápido
movés, menos atrasa, que es justo lo que hace falta para apuntar. Temblor atenuado 2,7 veces.

#### EL ARO TIENE TRES ESTADOS Y NO DOS

Apagado (no hay mano), abierto (hay mano) y cerrado (estás pellizcando). Sin el estado del medio, el
jugador no puede distinguir *"el juego no me ve"* de *"el pellizco no me sale"*, y esas dos cosas se
arreglan de maneras opuestas.

#### TRES RIVALES Y NO DOS, POR UNA CARTA

Con dos jugadores el "gira" es idéntico al "salta" —le devuelve el turno al que la tiró—, así que una
de las cuatro cartas de acción dejaría de significar algo. Con tres, girar cambia a quién le toca.
Medido en **200 partidas**: gana 70 / 74 / 56, o sea que ninguno de los tres asientos está roto.

#### UN DEFECTO PROPIO, ENCONTRADO FOTOGRAFIANDO Y NO LEYENDO

La pantalla de final se miraba **adentro** del `if(fase==='juego')` del bucle, o sea que solo se
enteraba en el mismo cuadro en que la partida terminaba. Con el pellizco eso siempre pasa —se consume
dentro del bucle—, pero **el respaldo táctil entra por `pointerdown`, que corre afuera**: ganando de
un toque, `fase` quedaba en `'fin'`, en el cuadro siguiente el `if` ya era falso y nadie mostraba
nada. El juego se quedaba congelado en la última imagen. Se vio sacando la foto del final.

**Y EL RESPALDO TÁCTIL NO ES UN EXTRA**: sin cámara —permiso negado, sin cámara, http— el juego sería
imposible de jugar, y eso no es degradar, es romperse. El toque y el pellizco terminan los dos en la
misma función con las mismas coordenadas: si fueran dos, el respaldo se desincronizaría en cuanto se
agregue una zona, y el respaldo es justo lo que nadie prueba.

#### DOS AJUSTES QUE SALIERON DE MIRAR UNA CAPTURA

- **El cartel del tutorial estaba abajo y tapaba el abanico de la mano** — o sea la parte de la
  pantalla que el propio cartel te pide que mires. Se mudó arriba, a la franja de los dos rivales, y
  los rivales no se dibujan durante el tutorial: ningún paso habla de ellos, así que el hueco existe
  porque se lo hace existir.
- **La carta agarrada se superponía con la mano.** Mide 190 de alto y subía 160, así que su borde
  caía en 1.120 y el abanico empieza en 1.090. Entre la pila y el abanico hay 386 px y botón + hueco
  + carta suman 304: sube 210 y entran con aire.

#### SIN UN SOLO ASSET, Y EL TÍTULO TAMPOCO

71 KB, todo dibujado por código: las cartas, el dorso, los cuatro cuadrantes del comodín, los seis
sonidos. **El título del menú es tipografía y no una imagen generada** — se pidió "muy minimalista", y
una palabra bien espaciada *es* el diseño minimalista: queda nítida en cualquier pantalla, pesa cero
y se puede recolorear.

#### MEDIDO AL CERRAR

Mazo **108 cartas** exactas (4 ceros, 8 comodines de los cuales 4 son +4, 25 por color). **60 partidas
por el camino interno y 25 por las zonas: las 85 terminan, 0 cartas ilegales.** 200 partidas para el
equilibrio: 70/74/56. Tutorial completo en los tres idiomas. Flanco: 15 cuadros de pinza sostenida =
1 click. Histéresis 0,415 / 0,585. Retardo del aro 3–11 ms según la velocidad. **0,17 ms por cuadro**
de dibujo. Cámara probada de verdad en el banco: `estado lista · delegado GPU · espejo true`.
`window.__errs` vacío en las once corridas.

**Lo que no pude verificar:** cómo se siente pellizcar con una mano de verdad y con la luz de una
habitación cualquiera. El banco inyecta manos sintéticas y la cámara del contenedor es un patrón de
prueba: los umbrales están medidos contra el modelo, no contra una persona.

### Trigésima novena vuelta (2026-08-28): **RECREO** — una sola boca, y el profesor deja de atravesarte

Pedido: *"evita que los audios se sobrepongan y también elimina que baldi se quede mientras completas
el minijuegos y te espere y lo haces y el se viene devuelta para ti y te atraviesa y después tarda en
volver eso no debería pasar"*.

#### EL AUDIO: HAY UN PERSONAJE, O SEA UNA BOCA — Y HABÍA TRES FORMAS DE QUE SONARAN DOS

**1. El bip por letra sonaba ENCIMA de la voz grabada.** El bip nació cuando el juego no tenía voz:
era lo que hacía que el subtítulo se leyera *como si* alguien lo estuviera diciendo. Desde la vuelta
26 hay **59 clips grabados** y el bip se quedó ahí, así que en cada línea sonaban una voz de hombre y
una onda cuadrada bipeando cada dos letras, las dos diciendo lo mismo al mismo tiempo. Es el más
audible de los tres y el más fácil de no ver en el código, porque las dos mitades viven en archivos
distintos. Ahora los bips salen **sólo cuando esa línea no tiene clip**, que es el caso para el que se
escribieron.

**2. La voz se guardaba POR CLAVE y no por canal.** Dos `dBien` encimados se cortaban entre sí, pero
`dBien` y `dSale` —dos claves distintas— sonaban a la vez. Y eso pasa todo el rato, porque las líneas
se disparan una detrás de otra sin esperar a la anterior: acertás la última cuenta y 0,7 s después
`terminarClase()` habla; terminás la tanda de bichos y enseguida habla la escena nueva; en la tableta
dibujás rápido y el *"otra más"* se monta sobre el *"muy bien"*; y el grito de la muerte entra encima
de lo que estuviera sonando. Ahora la fuente es **una sola** y la nueva corta a la que estaba, sea
cual sea su clave.

**3. Y UNA LÍNEA SIN CLIP NO CALLABA A LA ANTERIOR, que lo destapó la prueba.** `hablar()` corta lo
que suena, pero sólo se lo llama con éxito si la línea nueva **tiene** clip. Una línea sin grabar —las
de la tableta, por ejemplo— dejaba la anterior sonando *y encima* le ponía los bips. Medido: después
de `dice('dTabPide')` la fuente que seguía sonando era `es:dBien`. Una línea nueva es una boca nueva
aunque no tenga audio propio.

Verificado con el audio decodificado de verdad: `d1` → una fuente, `es:d1`, bips apagados; `dBien`
inmediatamente después → una fuente, `es:dBien`; `dTabPide` (sin clip) → **ninguna fuente** y bips
encendidos.

#### EL PROFESOR: TRES DEFECTOS ENCADENADOS, Y UNA AUDITORÍA NUEVA QUE LOS ENCONTRÓ

Un *"se viene de vuelta y te atraviesa"* dura dos segundos y en una captura no se ve. Entró
`auditarProfe()`: juega la partida entera y en cada paso anota **cuánto camina en total** y **a qué
distancia pasa de la cámara**. Los tres defectos salieron de mirar esos dos números.

**1. Caminaba el viaje ENTERO y te dejaba solo.** Su ruta era `[...ruta, ...restoRuta]`: se iba al
fondo del pasillo mientras el jugador hacía la actividad. Ahora camina lo mismo que la cámara y
**espera al lado tuyo, mirándote** — quedándose de espaldas parece que se olvidó de vos.

**2. Y AL RETOMAR TE ATRAVESABA.** Al terminar la actividad arranca la escena `sigue`, que hace
`ruta = restoRuta` — y ahí se le volvía a dar esa ruta a alguien que ya estaba parado en su último
punto. `rutaDesde()` sólo descarta el primer punto si le queda encima, así que el resto quedaban
**todos detrás de él**: caminaba para atrás hasta el principio del tramo, se cruzaba con la cámara, y
recién después volvía a avanzar. Es exactamente lo reportado, palabra por palabra.

**3. UN PUNTO REPETIDO EN LA JUNTURA ANULABA EL ARREGLO.** Una ruta se arma pegando la salida del aula
con el camino de pasillo, y la última celda de la primera y la primera de la segunda **son la misma**:
la boca. Ese duplicado parecía inofensivo. No lo era: la dirección en la que él tiene que seguir se
calcula restando dos puntos consecutivos, y restar un punto de sí mismo da cero — o sea que el
adelanto no se aplicaba y se quedaba parado en la boca, en el mismo sitio que la cámara, **a 8 cm de
ella** durante toda la actividad. (De paso, cada punto repetido es una parada de 10 cm donde el
resorte del giro de la cámara vuelve a arrancar, que es justo lo que `esquinas()` existe para evitar.)

#### Y QUEDA UN CRUCE QUE NO SE ARREGLA CON RUTAS, PORQUE ES GEOMETRÍA

Dentro del aula él se para **2,35 m más lejos de la salida** que la cámara, y en el pasillo tiene que
terminar **2,8 m más cerca** de donde sigue el camino. O sea que en algún momento tiene que pasar por
donde está el jugador, sí o sí — y con las dos rutas sobre la misma línea, *"pasar por donde está"* es
atravesarlo.

La solución no es cambiarle el camino sino **correrlo de costado**, que es lo que hacen dos personas
en un pasillo. Cada punto de su ruta se desplaza perpendicular a la dirección en la que va, y la
perpendicular sale de la dirección **entre el punto anterior y el siguiente** —no de un solo
segmento— para que en una esquina el desvío gire con el camino en vez de dar un salto.

**El desvío mide 0,85 m y el número salió del encuadre, no del gusto.** Empezó en 1,15: parado 2,8 m
adelante, eso lo deja a 22,3 grados del centro contra 29,4 de medio campo horizontal, o sea al 76 %
del borde — y en la captura salía cortado por el canto del cuadro. A 0,85 son 16,9 grados, el 57 %, y
sigue habiendo 85 cm de aire entre él y la cámara, que con un cuerpo de 45 cm de ancho es de sobra.

**Y `PROFE_ADELANTE` vale 2,8 y no 3,2 por una razón aritmética**: tiene que ser **menor** que el
umbral de `rutaDesde()`, que son 0,75 celdas = 3,15 m. Al retomar, el primer punto de la ruta nueva es
justamente el punto del que ya se corrió esos metros; con 3,2 quedaba fuera del umbral por cinco
centímetros y el profesor volvía a caminar hacia atrás. Con 2,8 lo descarta la misma regla que ya
protege las esquinas, y no hace falta una segunda bandera que se acuerde de nada.

#### LA MEDICIÓN, Y LA PRUEBA DE QUE LA MEDICIÓN SIRVE

Primero medí *"pasos en los que se da vuelta"* y **no servía**: un ida y vuelta de tres metros son dos
pasos de 7 cm en los que el rumbo se invierte, o sea 0,14 m en la cuenta, y eso no distingue un rebote
de un redondeo. El **camino total** sí: caminar de más se paga metro a metro.

| | camino total | cuadros encima de la cámara | lo más cerca |
|---|---|---|---|
| como estaba | **351,4 m** | **1.252** | **0,00 m** |
| sin el desvío de costado | 289,9 m | 107 | 0,02 m |
| ahora | **278,2 m** | **0** | **0,85 m** |

O sea: **73 metros de caminata de más**, que es literalmente el *"después tarda en volver"*. Y las
tres filas están medidas sobre el mismo binario con una constante cambiada, así que la prueba detecta
el defecto además de aprobar el arreglo.

**UNA CORRECCIÓN HONESTA:** también relajé la guarda de `rutaDesde()` de `R.length>2` a `>1`, porque
con un pasillo único las rutas de pasillo son de dos puntos y con `>2` el descarte no corría nunca.
Cuando lo hice, arregló un cruce a 3 cm en el saludo. Pero **hoy ya no cambia ningún número** —lo
comprobé volviéndolo a `>2` y sale idéntico—, y la razón es que al profesor siempre se le agrega el
punto de adelanto, así que su ruta nunca tiene menos de tres puntos. Se queda porque la guarda seguía
estando mal escrita, no porque esté haciendo algo hoy.

#### MEDIDO AL CERRAR

Partida completa **24 de 24**, 0 muertes, 9.818 pasos. **0 pasos dentro de paredes en 9.834.**
Profesor: **0 cuadros encima de la cámara**, mínimo 0,85 m, 278,2 m caminados. Contestando mal:
muerte, y desde el reintento la partida se termina igual (24/24 con 1 muerte). El final: cinco fases,
1.233 pasos. Voz: una sola fuente en los tres casos, y bips sólo cuando no hay clip. Tableta **9 de 9**
en la matriz. Espejo y lectura de mano en verde, 10 fotos puestas. Costo alternando **15 · 23**
llamadas. `window.__errs` vacío.

### Trigésima octava vuelta (2026-08-28): **RECREO** — un pasillo, cero puertas, sombras y nueve texturas generadas

Pedido: *"haz que los salones estén seguiditos y que no hayan puertas así el juego es más rápido y
bueno etc mejores los gráficos en altos agrega sombras y mejores colores también genera en highsfield
texturas para todo"*.

#### EL COLEGIO SE ACHICA A LA MITAD, Y LAS DOS MITADES DEL PEDIDO ERAN LA MISMA COSA

Era una reja de **23×19 —96,6 × 79,8 m—** con tres pasillos horizontales, tres verticales y las ocho
aulas repartidas por las cuatro esquinas, cada una con su puerta en un anillo de pared. El recorrido
tenía tramos de **catorce celdas**: 58,8 m que a 2,9 m/s son veinte segundos de pasillo vacío entre
una cuenta y la siguiente. Y cada aula costaba además acercarse a una puerta y esperar a que girara.

Ahora es **un solo pasillo** —la fila 4— con cuatro salones de un lado y cuatro del otro, pegados
entre sí y separados por una única celda de pared. El salón **no tiene puerta**: su lado del pasillo
está abierto de punta a punta, así que desde el pasillo se ven las ocho bocas y se entra caminando.
La reja baja a **17×9 = 71,4 × 37,8 m**, el 44 % de la superficie.

**El tramo más largo pasa de 14 celdas a 4**, medido con el propio BFS del juego. La partida entera
pasa de **15.039 pasos a 9.828**: un 35 % más corta con las mismas 24 cuentas y las mismas 7
actividades.

Un tramo mide **cero**, y es el del 4 al 8: el 8 está justo enfrente del 4, se cruza el pasillo y ya.
No rompe nada y se comprobó por qué: la ruta de una escena de viaje lleva además los cuatro puntos de
salir del aula anterior y los cuatro de entrar a la siguiente, así que nunca queda vacía, y la
actividad de ese tramo cae en el pasillo entre las dos bocas.

#### LO QUE ESTO OBLIGÓ A GENERALIZAR, Y ES EL TRABAJO DE VERDAD

Hasta ahora **todas las aulas se entraban por el norte**, y esa suposición estaba metida *adentro de
las fórmulas*: «la pared del fondo es la fila j1+1», «él va en la última fila del aula». Con salones a
los dos lados de un mismo pasillo, los del norte se entran **por el sur** y las cinco cuentas se dan
vuelta. Cada aula lleva ahora su **`dir`** —+1 entrando por el norte, −1 por el sur— y las fórmulas lo
multiplican: fondo, profesor, escritorio, cámara y pizarrón. De ahí salen también hacia dónde mira
cada uno (`giroCam`, `giroProfe`), que antes eran las constantes 0 y π escritas a mano.

Y **las coordenadas del patio dejaron de estar clavadas en metros**. `[-46,2 · 0]`, `[-48,5 · -0,4]`,
`[-52 · -1,6]`… estaban escritas para una reja de 23×19 con la salida en \[0,9\]. Con el mapa nuevo
los cinco quedaban dentro del colegio o a cuarenta metros de donde tenían que estar. Ahora salen de la
cara oeste del edificio y de la fila de la salida, y **las distancias relativas —las que se midieron—
se quedan**: la cámara para 3,7 m pasada la fachada y el autobús está a 17,7. La prueba de que
funcionó es que la cinemática del final no se tocó y el autobús sigue midiendo **64,5 % del ancho,
entero, centrado en el 50,1 %, con 0,7 grados de error de rumbo** — los mismos números que antes de
mover el colegio entero.

#### LAS SOMBRAS: UNA SOLA, CHICA, Y QUE SIGUE AL JUGADOR

Lo que faltaba no era iluminación —la escuela ya estaba bien iluminada— sino **apoyo**: sin sombra el
profesor, los pupitres y los lockers flotan un centímetro sobre el piso, y eso es lo que hace que una
escena 3D se lea a maqueta. Tres decisiones, las tres por la misma razón: **un mapa de sombra cubre un
área fija**.

1. **La cámara de sombra sigue al jugador**, con un cuadro de 11 metros de lado. Cubriendo el colegio
   entero serían 14 texels por metro y la sombra de una pierna cuatro píxeles temblando; siguiendo a
   la cámara son **93,1 texels por metro**.
2. **La escuela no proyecta, sólo recibe.** Paredes, pisos y techos son tres mallas fundidas con
   `frustumCulled=false`: ponerlas a proyectar obliga a redibujar el colegio entero en la pasada de
   sombra todos los cuadros para conseguir la sombra de una pared bajo una luz que viene de arriba, o
   sea nada. Proyectan las cosas que se apoyan.
3. **Sólo en calidad alta**, que es una pasada de render más y la elige el jugador.

**Y el ángulo de la luz se corrigió mirando la captura.** A 63 grados de elevación la sombra de una
persona mide medio cuerpo tirada por el piso y se leía a mancha. Una escuela está iluminada por tubos
en el techo: la sombra útil es la de **contacto**, la que dice «está parado ahí». A 77 grados mide
0,23 veces la altura, o sea 40 cm para un cuerpo de 1,80.

**Y va a 30 Hz y no a 60.** Medido contando llamadas de dibujo cuadro por cuadro: con la sombra a 60
cada cuadro cuesta 20 llamadas y 18.082 triángulos; alternando, la secuencia real es
`12 · 20 · 12 · 20` — **la pasada de sombra cuesta 8 llamadas y 7.648 triángulos, y ahora se paga la
mitad de las veces**. Una sombra de contacto de una figura que camina a 3,4 m/s se mueve dos
centímetros por actualización a 30 Hz.

#### NUEVE TEXTURAS GENERADAS, Y LA COSTURA SE RESUELVE SIN TOCAR UN PÍXEL

Piso de vinílico a cuadros, pared, placas de techo, lockers, pizarrón, asfalto, pasto, ladrillo de la
fachada y madera, generadas con `z_image` y horneadas a WebP. **Las nueve suman 47 KB**, que en base64
son 63.

Primero las horneé a 256 y las nueve dieron **17,4 KB**: o sea que el presupuesto nunca fue el
problema —son fotos suaves, sin detalle fino, y WebP con eso pesa nada—. A 512 suman 47 y el mapa
aguanta que la cámara se pegue a una pared, que es lo que pasa en cada aula. La única que se quedó
chica es **el pasto**: es el único que es ruido de verdad y a 384 pesaba **41,6 KB, más que las otras
ocho juntas**, para algo que sólo se ve al fondo del patio en la cinemática final.

**LA COSTURA.** Al modelo se le pidieron texturas «sin costura» y no lo son —ninguna lo es de verdad—;
coserlas a mano desplazando media imagen y difuminando el cruce ensucia justo el centro, que es lo que
más se mira. Se resuelve del otro lado con **`MirroredRepeatWrapping`**: la copia de al lado va dada
vuelta, así que los dos bordes que se tocan son **el mismo borde** y la costura no puede existir. Lo
que se paga es que el patrón queda simétrico cada dos repeticiones, y en manchas —revoque, asfalto,
pasto, baldosa— eso no se ve.

**NO REEMPLAZAN A LAS DIBUJADAS: LAS PISAN CUANDO LLEGAN.** Un data URI se decodifica de forma
asincrónica, así que un material que naciera esperando la foto daría un cuadro —o veinte— en negro.
Nace con el lienzo pintado por código, que ya funciona, y la foto entra encima cuando está lista. Si
una no decodifica, ese material se queda con su dibujo: no hay estado roto posible.

**Y LA REPETICIÓN CORRIGE LA ESCALA FÍSICA**, que es lo que más trabajo dio. Las UV ya venían
escaladas en la geometría y estaban calculadas para dibujos de 64 px que no representan nada de un
tamaño concreto. Una foto sí: con repetición 1 cada hilada de ladrillo medía **22 cm** y la pared se
leía a casa de muñecas; a 2×2 quedan 5,5 cm. Los lockers fueron el más difícil, porque la foto son
**cuatro** lockers de frente: un banco de 3,28 m tiene once lockers de 30 cm, así que la UV final
tiene que dar 11/4 = 2,75 de ancho y 1 de alto, y horneada viene 2,98 × 1,4 — de ahí 0,92 y 0,71.

**TRES TINTES BAJARON DESPUÉS DE MIRAR UNA FOTO, no antes:**
- **El techo**, de `0xd6d4c8` a `0xa9a79c`: con el dibujo por código el tinte alto estaba bien; con
  una foto que ya trae su propio gris, el producto dejaba el tercio de arriba del cuadro casi blanco
  y el techo brillaba más que el piso.
- **La madera**, dos veces: primero se le sacó el marrón (multiplicaba a la foto y la dejaba color
  barro) y después se le bajó lo cálido, porque el escritorio en primer plano salía naranja fuerte y
  en un aula beige el mueble no puede ser lo más saturado del cuadro.
- **El asfalto** lleva un tinte **frío** aunque la foto ya es gris neutro, y no es corregir la foto:
  la hemisférica de este juego tiene el cielo en `0xfff6e2` porque adentro imita tubos cálidos, y
  encima el filtro sube la saturación. Un gris neutro bajo esa luz sale arena — en la captura el
  patio parecía una playa.

#### UN COLOR POR SALÓN, Y NO ES SÓLO ESTÉTICA

El colegio entero era beige: pared beige, piso beige, techo beige y madera marrón. Con las fotos ganó
textura pero seguía siendo una escala de arena, y en un pasillo con ocho bocas iguales eso tiene un
costo que no es decorativo: **no hay forma de saber en cuál estás parado**.

Cada salón estrena un **dintel de su color** cruzando la boca, a la altura del techo. Es una viga y no
un cartel a propósito: se ve desde el otro extremo del pasillo, se ve de reojo al pasar, y no hay que
leer nada. Los ocho colores van **mezclados un 30 % con el beige de la pared**, porque el filtro del
juego *suma* saturación y a plena pureza el pasillo se leía a parque de diversiones. Y van en **una
sola malla con color por vértice**: ocho materiales serían ocho llamadas de dibujo para ocho cajas.

#### MEDIDO AL CERRAR

Partida completa **24 de 24**, 0 muertes, **9.828 pasos** (eran 15.039), terminando en la pantalla de
final después del autobús. Auditoría de rumbo **0 pasos dentro de paredes en 9.844**. Contestando mal:
muerte, y **desde el reintento la partida se termina igual** (24/24 con 1 muerte). El final jugado
solo: las cinco fases en orden, 1.419 pasos. Autobús 64,5 % del ancho, entero, 0,7 grados de error.
Tramo más largo del recorrido **4 celdas**. Las **10 fotos decodificadas** y puestas en sus materiales
con su repetición. Sombra: 93,1 texels por metro, 56 mallas proyectando de 62. Costo por cuadro
alternando **12 · 20 llamadas** (10.434 y 18.082 triángulos). La tableta puntúa **9 de 9** en la
matriz. Espejo y lectura de mano en verde. `window.__errs` vacío en las once corridas. El HTML pasa de
1,93 a **2,01 MB**.

**Lo que no pude verificar:** los fps reales en el teléfono. El contenedor renderiza por software, así
que el costo de la sombra está medido en llamadas y triángulos —que son exactos— y no en cuadros por
segundo. Si en el teléfono pesa, la calidad media la apaga entera.

### Trigésima séptima vuelta (2026-08-28): **RECREO** — la salida al patio, el autobús, y el control de resolución que rebotaba

Pedido: *"agrega que al terminar la clase estás saliendo afuera con un autobús que te espera y en la
puerta de salida te está saludando baldi y debes saludarlo … primero la Cinemática de saliendo de la
escuela con un buen brillo disminuyendo así realista al salir afuera de un entorno cerrado y el
autobús ahí pipi y después caminas automáticamente hasta ahí y se gira para saludar a baldi y después
se desvanece y te lleva al menú, también el juego a veces se puede poner lag de la nada debes
optimizar aún más eso"*.

#### CINCO FASES, Y EL DESLUMBRE ES EL PEGAMENTO

`ganar()` ya no muestra la pantalla de final: **arranca la salida**. Fase 0, la cámara sale del aula
hasta la puerta oeste y el brillo crece a medida que se acerca; fase 1, cruza y **satura**; fase 2,
camina a la vereda mientras el ojo se acomoda; fase 3, se queda mirando el autobús, se da vuelta y
pide el saludo; fase 4, funde y recién ahí aparece la pantalla.

**El brillo sube rápido y baja LENTO** (2,6 contra 0,42 por segundo), y no es un adorno: así se
comporta un ojo de verdad saliendo de un interior — deslumbrarse es instantáneo y acomodarse tarda.
Bajando igual de rápido se lee a transición de video y no a salir a la calle.

#### CUATRO ERRORES DE PUESTA EN ESCENA, Y NINGUNO SE VEÍA EN UNA CAPTURA CHICA

1. **El autobús estaba adentro del colegio y a espaldas del jugador** (x = −38). Va donde la cámara
   camina, no donde quedaba cómodo escribirlo.
2. **Se veía de culata**: con el eje largo en X y la cámara llegando desde el este, lo que aparecía
   era la trasera, un cuadrado amarillo de tres metros por dos y medio. Girado noventa grados se ven
   los nueve metros y la fila de ventanas.
3. **El último tramo del camino iba PARA ATRÁS** —llegaba a −52 y volvía a −51—, y como el riel gira
   la cámara hacia donde camina con un resorte más fuerte que el de `mirarA`, la cámara terminaba
   mirando 39,6 grados fuera del autobús, con medio campo de 29: o sea el autobús literalmente fuera
   del cuadro. Con los dos tramos hacia el mismo lado y el resorte de `mirarA` subido a 6,0 el error
   quedó en **1,6 grados**.
4. **Y estaba demasiado cerca**: medido proyectando su caja a píxeles, ocupaba el **101,6 % del ancho
   del cuadro**, o sea cortado por los dos lados. Corrido a x = −66 quedan 12,5 m y ocupa **64,6 %,
   entero y centrado en el 50,1 %**.

#### EL DEFECTO DE MÉTODO DE ESTA VUELTA: LA FOTO NO ERA DEL INSTANTE QUE YO CREÍA

Tres capturas seguidas del autobús salieron **sin autobús**, y llegué a comprobar que la malla
existía, era visible, tenía sus 208 triángulos y su caja proyectaba dentro del cuadro. Todo eso era
cierto **y la foto seguía sin mostrarlo**.

La causa: `avanzar()` simula sin dibujar, pero **entre ese paso y la captura el navegador sigue
corriendo su propio bucle**, así que para cuando se sacaba la foto la cámara ya se había dado vuelta
a mirar al profesor. La foto era de tres segundos después. Se arregla con un `CONGELADO` que frena la
simulación y deja el dibujo: la escena se queda en el instante que se quiere fotografiar.

Y hay un segundo error de medición del mismo tipo, ya conocido en este proyecto: **`camara` solo se
acomoda al dibujar**, así que proyectar después de `avanzar()` usa la posición del menú. Sin
sincronizar, el autobús daba **3.094 % del ancho**. Con `ponerCamara(1)` antes de proyectar, 64,6 %.
Y un tercero: **un punto detrás de la cámara proyecta igual, dado vuelta, y cae dentro del cuadro** —
el autobús daba "entero" con la cámara mirando justo para el otro lado. Ahora se comprueba que las
ocho esquinas estén delante.

#### LAS RUEDAS SALÍAN AMARILLAS, Y ESA ERA LA RAZÓN DE QUE NO SE LEYERA A AUTOBÚS

Todo fundido en una sola malla es una sola malla **y un solo material**. En la captura eso era un
ladrillo amarillo con cuatro tacos amarillos abajo. Van **dos** mallas fundidas —lo amarillo y lo
oscuro (ruedas, parachoques, la franja de abajo de las ventanas, los siete paños y la puerta)—, o sea
dos llamadas de dibujo para las veinte piezas. Y lo oscuro va **sin luz** a propósito: son vidrio y
goma, las dos cosas de un autobús que no tienen difuso.

Dos cosas más que salieron de mirar la captura: la franja negra va **debajo** de las ventanas y no
encima —arriba compite con el techo y el costado entero se lee oscuro—, y las ventanas son **siete
paños y no una tira corrida**, porque los cortes son lo que da la escala de "acá adentro van chicos
sentados".

#### EL COLEGIO NO TENÍA CÁSCARA, PORQUE NADIE LO HABÍA MIRADO DESDE AFUERA

Está construido de adentro hacia afuera: cubos de pared de celda entera y una losa de techo por
celda. Desde la vereda eso es **un montón de bloques con el techo colgando y el interior asomando por
arriba**. Entró una fachada de tres piezas con el hueco de la puerta y su dintel.

**Y ACÁ APAGUÉ PIEZAS DE A UNA EN VEZ DE ADIVINAR.** Había puesto además una losa de techo y un alero
sobre la puerta, y el tercio de arriba del cuadro salía casi negro justo donde el profesor levanta el
brazo. Apagándolos por separado quedó claro: los dos son planos **horizontales vistos DESDE ABAJO**
—la cámara está a metro y medio y a tres metros de la pared— y una cara que mira al piso recibe de la
hemisférica el color del suelo. Los dos se fueron. La fachada sola alcanza para tapar el interior:
mide 4,15 m y las paredes de adentro 3,6.

#### EL PROFESOR SALE A LA VEREDA

En la celda \[1,9\] quedaba a nueve metros y metido en el pasillo: medido en la captura, **un muñeco de
veinte píxeles al fondo de un túnel beige**, que no se lee a nadie despidiéndote. Metro y medio afuera
de la puerta queda a 4,7 m de donde para la cámara —el 26 % del alto del cuadro— y con cielo detrás.

Y **la cámara se queda 1,4 s mirando el autobús antes de darse vuelta**. Sin esa espera, el cuadro en
que termina de caminar es el mismo en que empieza a girar: el autobús entra encuadrado y se va por el
borde derecho antes de que nadie lo vea.

#### "SE PONE LAG DE LA NADA": DOS CAUSAS MEDIDAS Y UNA PREDICCIÓN MÍA QUE SALIÓ MAL

**1. El control de resolución rebotaba, y la razón es aritmética.** Cada cambio llama a
`postRT.setSize()`, que tira la textura y el buffer de profundidad y se los vuelve a pedir a la GPU:
un tirón. Así que lo que hay que minimizar no es el error de la resolución, es **la cantidad de
cambios**.

La banda muerta va de 15,86 a 21,55 ms, o sea un factor 1,359. El tiempo de cuadro va con los píxeles,
o sea con el **cuadrado** de la escala. Si dos escalones vecinos están en razón *k*, saltar de uno al
otro multiplica el tiempo por *k²*: **con *k²* > 1,359 el escalón de arriba queda por encima de la
banda y el de abajo por debajo, y entonces el control NO PUEDE quedarse quieto**. Mi primera escalera
tenía 0,58 y 0,45 pegados (*k* = 1,289, *k²* = 1,66) y medido daba dieciséis cambios por minuto **ya
asentado**. La escalera nueva es geométrica de razón 1,12: *k²* = 1,25, con margen.
Más: subir necesita rachas de ventanas buenas y **la racha se duplica en cada subida** (3, 6, 12, 24,
48), así que recuperar sigue siendo posible al salir de un aula cargada pero dejar de rebotar está
garantizado. Y hay enfriamiento de segundo y medio después de cada cambio.

Medido en **336 corridas de un minuto** (tiempos de 14 a 68 ms, ruido de 0 a ±12 ms, y el lazo
**cerrado** —el tiempo simulado sale de los píxeles—, que es la única forma de que un control oscile
de verdad; con tiempos fijos casi cualquier regla se queda quieta):

| | cambios totales | el peor caso | ya asentado (>20 s) | peor asentado |
|---|---|---|---|---|
| regla anterior | 2.752 | 31 | 701 | **16** |
| ésta | **1.460** | **10** | **213** | **5** |

**2. `postTam()` preguntaba el tamaño del marco DOS VECES POR CUADRO.** Leer `clientWidth` obliga al
navegador a recalcular el layout antes de contestar: son 120 vaciados de layout por segundo mezclados
con las escrituras al DOM del contador de dedos y de las miras. Es el *layout thrashing* de manual y
**no aparece en ningún perfil de WebGL**: se ve como tirones que van y vienen. El marco solo cambia de
tamaño cuando cambia la ventana, así que se guarda en `ajustar()`.

**3. Y ACÁ ME EQUIVOQUÉ Y LA MEDICIÓN ME CORRIGIÓ.** Predije que el patio iba a costar una compilación
de shaders en medio de la cinemática: el autobús y la fachada viven en un grupo apagado toda la
partida, así que su primer cuadro dibujado es el primero del final. El razonamiento parecía sólido y
es el mismo que ya había valido para las manos y los bichos. Se midió calentando **con** el patio y
**sin** el patio, en dos cargas distintas: **19 programas en los dos casos**, y 19 también después de
que el patio aparece. La razón es que sus materiales son Lambert y Basic **pelados**, sin textura, y
esos dos programas ya estaban compilados por otras piezas del juego — la caché de three.js es por
combinación de características, no por material. El cambio se sacó en vez de dejarlo con un
comentario que dijera algo que no pasa.

#### MEDIDO AL CERRAR

Partida completa **24 de 24**, 0 muertes, 15.039 pasos, terminando en la pantalla de final **después
del autobús**. Auditoría de rumbo **0 pasos dentro de paredes en 15.055**. Contestando mal: muerte y
pantalla de agarrón. El final jugado solo: las cinco fases en orden, 1.239 pasos, termina en `fin`.
La tableta puntúa **9 de 9** en la matriz (diagonal perfecta: cada figura acepta la suya y rechaza las
otras dos). Reparto de manos y espejo en verde; `manoLeerVer` da 5 dedos sin pinza para la mano
abierta y 1 dedo con pinza para la pinza. Manos 3D a **0,111 ms por cuadro**. **0 bytes por cuadro**
de basura en 900 cuadros. 17 llamadas de dibujo y 16.386 triángulos con el patio en pantalla.
`window.__errs` vacío en las nueve corridas.

### Vigesimoséptima vuelta (2026-08-27): **RECREO** — las manos 3 veces más rápidas y siete pasillos distintos

Pedido: *"hace que sea 3 veces más rápido el movimiento de las manos, también que por ejemplo en el
segundo pasillo tengas que armar un rompecabezas con las manos, en el tercero tengas una espada y
vengan bloques hacia a ti porque te teletransportas a un mundo neón, y ahora tu mano en ese lugar si o
si cerrada con la espada, no importa si abris tu mano va a estar cerrada, y debes cortar los bloques
verdes; si pierdes se reinicia ese nivel, y así agrega más hasta el último salón 8"*. Y una aclaración
que mandó a mitad de camino y que ordena **todo** lo demás: *"recuerda que la mano no puede ir más
lejos, tienes que hacer simples juegos fáciles de usar la mano, por ejemplo que los monstruos para
matarlos en el primer salón hay que hacer pinch con dos dedos por encima de ellos **en pantalla, no en
profundidad**"*.

#### LAS MANOS: DE 65 ms A 21 ms, Y EL TEMBLOR MEJORÓ EN VEZ DE EMPEORAR

**Primero hubo que medir la cosa correcta.** La vuelta pasada el retardo se medía con un ESCALÓN, y una
mano no da escalones: se mueve. Lo que el jugador siente como "van lentas" es que la mano dibujada va
**atrás** de la suya mientras la arrastra, o sea el error de seguimiento en movimiento sostenido.
`manoRampa()` arrastra una mano a velocidad constante, mide cuánto queda atrás la salida y divide por
la velocidad: el resultado está **en milisegundos**, y ése es el número que había que dividir por tres.

Y al escalón se le agregó el **sobrepico**, porque antes la prueba cortaba al llegar al 90 %: la
predicción adelanta la salida, así que un ajuste podía cruzar el 90 % antes *y pasarse de largo*, y
cortando ahí eso no se veía. Un sobrepico es exactamente lo que se siente como "la mano rebota".

**LO QUE EL BARRIDO ENCONTRÓ, Y NO ERA LO QUE YO ESPERABA.** Subir `beta` —la perilla que abre el corte
del 1-euro con la velocidad— casi no cuesta temblor: de beta 3 a beta 9 la atenuación caía sólo de 3,83
a 3,47. Pero seguía cayendo, y a beta 16 ya estaba en 3,17. **La causa: con la mano quieta la derivada
NO ES CERO, es el ruido del detector dividido por el intervalo.** Así que subir beta para que la mano
siga rápido también multiplica ese ruido y abre el corte justo cuando no hay que abrirlo.

El arreglo es una resta: **una zona muerta en la derivada**. `fc = fcMin + beta·max(0, |d| − dz)`. Una
derivada de nivel de ruido aporta **cero** y una de movimiento real aporta todo. Medido, con `dz` de
0,10 en adelante la atenuación se **clava en 4,10 para beta 9, 14, 20 y 28 por igual**: las dos cosas
dejan de estar atadas y beta se puede subir sin pagar nada.

| | retardo de seguimiento | atenuación del temblor | latido de grosor |
|---|---|---|---|
| antes | **65 ms** | 3,83 | 1,12 % |
| ahora | **21 ms** (3,1×) | **4,10** | 1,12 % |

Sin subir la frecuencia de medición: sigue en 24 Hz en teléfono, porque el reclamo original de todo
esto era el rendimiento. Lo que quedó como costo es **10,3 % de sobrepico** en un escalón del 20 % del
marco — un salto instantáneo que una mano de verdad no puede dar.

#### SIETE PASILLOS, SIETE COSAS DISTINTAS, Y TODAS EN PANTALLA

Eran tres actividades rotando en siete tramos, o sea la tercera vez que hacés lo mismo antes del aula
8. Ahora cada una pide algo que ninguna otra pide: **apuntar** (bichos) · **arrastrar**
(rompecabezas) · **cortar** (espada) · **el tiempo** (tizas) · **elegir** (casilleros) ·
**distinguir** (globos) · **todo junto** (dos espadas y bloques rojos).

Y las siete se juzgan igual: el blanco se proyecta a la pantalla y se compara ahí, en fracciones del
marco. **Ninguna pide estirarse hacia adelante ni acertar una profundidad**, que es lo que el jugador
pidió con todas las letras — y además es lo único que una webcam sola mide bien.

**EL ROMPECABEZAS es la única que se juega con la pinza SOSTENIDA.** Las otras seis usan el *flanco*:
el cuadro en el que la pinza aparece. Hasta acá la mano sólo sabía decir "acá"; ésta la obliga a decir
"esto, y llevalo allá". Y tiene dos caminos que terminan en el mismo sitio: con la mano es agarrar y
arrastrar, con el dedo es tocar la pieza y después tocar el hueco — el mismo criterio por el que existe
el teclado de números.

**LA ESPADA NO USA PINZA, y eso es el punto.** Con la mano cerrada no hay pinza que hacer, así que lo
que corta es **el movimiento**: el camino que la mano recorrió entre este cuadro y el anterior. Es la
única actividad del juego que se juega con velocidad y no con un gesto. Y se compara contra el
**segmento** y no contra el punto, porque con las manos ahora a 21 ms y a 60 cuadros una mano rápida
salta 30 o 40 píxeles **entre un cuadro y el siguiente**: mirando sólo la posición de este cuadro, el
bloque queda entre dos posiciones y el corte no existe.

**LA MANO CERRADA A LA FUERZA** se hace acercando los puntos al centro de la palma, no rotando falanges.
No es la curva anatómica de un puño, pero al tamaño al que se ve una mano en un teléfono se lee como
uno, cuesta una resta por punto y —lo que importa— **es estable**: no depende de que MediaPipe acierte
la flexión de un dedo tapado por los otros, que es justo lo que no acierta con la mano cerrada.
Medido: se inyecta una mano **abierta, con los cinco dedos leídos**, y las puntas dibujadas se recogen
un **65,2 %** hacia la palma.

#### CINCO DEFECTOS PROPIOS, TODOS ENCONTRADOS MIRANDO O MIDIENDO

- **El túnel neón estaba armado en el origen del mundo** y el pasillo donde cae la actividad está a
  treinta metros de ahí: le quedaba al jugador abajo y de costado. Un túnel que no está centrado en vos
  no se lee como un lugar en el que estás parado. Se planta en la cámara con el rumbo del tramo.
- **Los bloques flotaban ARRIBA del túnel.** Los repartía por posición de *pantalla*, que es lo que
  hacen las otras seis, y acá no sirve: la sección del túnel se angosta con la distancia, así que una
  altura de pantalla fija sale por encima del techo apenas se aleja. Van en coordenadas del túnel; el
  corte se sigue juzgando en pantalla.
- **Los cuatro huecos del rompecabezas eran UN rectángulo gris.** Con los centros a 0,23 del ancho y la
  pieza midiendo 0,21, los cuatro se tocaban — el mismo defecto que ya había convertido cinco
  casilleros en una pared roja. Y las dos piezas de abajo estaban en 0,78 del alto, o sea **tapadas por
  el globo de diálogo justo mientras el cartel explica que hay que agarrarlas**.
- **`setRGB` TOMA LOS NÚMEROS EN LINEAL, no en sRGB**, y es la misma trampa que ya había costado una
  vuelta en Eco. `(0,44 · 1,00 · 0,52)` —que escrito parece un verde vivo— sale en pantalla como
  `(0,69 · 1,00 · 0,75)`: un verde salvia lavado. Los globos verdes se confundían con el suéter del
  profesor, que también es verde y estaba justo detrás de ellos.
- **LA ESPADA, TRES VECES.** Primero con un piso fijo de escala: una cruz cian que tapaba la pantalla.
  Después "bien" calculada, en palmas (una espada mide unas siete): medido, la hoja daba **1,058 veces
  el alto del marco**, más larga que la pantalla entera. Y la razón no es un error de cuenta —**la mano
  se dibuja a 40 cm del ojo**, así que cualquier cosa pegada a ella con proporciones de verdad es
  gigante en el cuadro. La espada está deliberadamente sub-escalada y escorzada hacia adentro de la
  pantalla, y quedó en **0,21 del alto**. La tercera fue de proporciones: con la guarda casi cuatro
  veces más ancha que la hoja y todo escorzado, lo que se veía era un **martillo**.

#### MEDIDO AL CERRAR

Partida completa **24 de 24** con las siete actividades nuevas jugadas por el mismo camino que usa el
jugador, 0 pasos dentro de paredes en 20.913, contestando mal la partida se termina igual (24/24 con 1
muerte), `window.__errs` vacío. Retardo de seguimiento **21 ms** (era 65), atenuación **4,10** (era
3,83), puño forzado **65,2 %**, las tres pruebas de reparto de manos en verde. Costo: 10 llamadas de
dibujo y 16.302 triángulos sin actividad —igual que antes, porque las mallas nuevas están ocultas
mientras no se usan—, 19 y 23.382 con el mundo neón, las dos manos y la espada en pantalla.

**Probado por casos, no sólo de punta a punta:** el rompecabezas agarra con la pinza sostenida, sigue
al dedo y encaja (4→3), y soltado a 0,63 del hueco **no** encaja; dejar pasar un bloque verde reinicia
la tanda; cortar un rojo también (5→6, y los ocho bloques vuelven); reventar un globo rojo sube el
contador de 4 a 5 y uno verde lo baja.

### Vigesimoctava vuelta (2026-08-27): **RECREO** — el espejo del punto de la mano y el aro de puntería

Reporte: *"el del rompecabezas no anda, y también deberías poner un indicador a la hora de matar a los
monstruos; por ejemplo el rompecabezas agarra los de la izquierda cuando mi mano está a la derecha, re
nada que ver"*.

#### NO ERA DEL ROMPECABEZAS: LO TENÍAN LAS SIETE ACTIVIDADES

`manoPinzas()` espejaba la x **siempre**, con un `1-x` escrito a mano. La función se escribió cuando el
juego usaba la cámara **frontal**, donde la imagen siempre va espejada. Después el juego pasó a la
cámara **trasera** —donde la imagen NO va espejada— y `MANO.espejo` pasó a leerse del track del video;
pero de eso se enteraron sólo el dibujo de las manos 3D y los números de cada mano. Acá seguía el `1-x`
fijo.

O sea que en un teléfono la mano **dibujada** aparecía en `x` y el punto que **agarra** estaba en `1-x`:
los dos reflejados uno del otro, a **0,452 del ancho de distancia** cuando la mano está a un costado.
El rompecabezas no tiene nada de especial — sólo lo hace obvio, porque ahí se mira la pieza mientras se
arrastra en vez de un bicho que desaparece. Con los bichos el mismo defecto se siente como "no le
pego", que es más fácil de confundir con puntería propia.

**Y LA PRUEBA QUE FALTABA NO ERA DE APUNTADO.** El apuntado estaba probado: había manos falsas, radios
medidos y actividades jugadas de punta a punta. Lo que no estaba probado es que el apuntado y el
**dibujo** caigan en el mismo sitio, que es la pareja que estaba rota — y encima las pruebas del
rompecabezas usaban `manoArrastrar`, que escribe `MANO.pinzas` directo y por eso **salteaba justamente
la función con el defecto**. `manoEspejo()` inyecta la misma mano con el espejo puesto y sacado y
compara dónde se dibuja contra dónde agarra. Verificado que la prueba detecta el defecto: revirtiendo
el arreglo, el caso `espejo:false` pasa de 0,053 a **0,452** de diferencia y da `ok:false`.

Y el rompecabezas se volvió a probar por el camino de verdad —landmarks inyectados, cámara trasera—:
con la mano en 0,87 agarra la pieza de la **derecha**.

#### EL ARO DE PUNTERÍA, Y POR QUÉ HACÍA FALTA

En este juego la mano no se ve como un cursor: se ve un **modelo 3D de una mano con veintiún puntos**,
y el juego apunta con **uno** de ellos (el punto medio entre el pulgar y el índice). Cuál de los
veintiuno es, no hay forma de adivinarlo mirando. Sin el aro, fallar no enseña nada: no se sabe si
fallaste por poco o si estabas apuntando con otra parte de la mano.

Tres decisiones:

- **El aro CRECE hasta el radio de verdad cuando hay un blanco debajo.** En reposo mide 45 px —un
  cursor— y sobre un blanco se abre a **86,5 px**, que es exactamente `BICHO_R·ancho·2`. Así la
  tolerancia deja de ser un secreto del código y se aprende jugando.
- **La pinza cerrada engorda el aro.** Es el acuse de recibo del gesto: sin eso no hay forma de saber
  si el juego vio que cerraste los dedos o si no llegaste a cerrarlos.
- **`miraBlanco()` pasa por `golpeEnLista()` y el mismo radio**, no por una cuenta propia. Un aro con
  su propia cuenta podría decir "le estás dando" en un sitio donde el golpe falla, y un indicador que
  miente es peor que no tener indicador.

Sólo aparece mientras hay actividad: en el aula lo que se hace es contar con los dedos, y ahí un aro de
puntería es ruido encima del único momento en que hay que mirar el libro.

#### Y LA PINZA ERA CERRAR LA MANO ENTERA

Tercer reporte de la misma tanda: *"además el pinch es cerrando pulgar e índice, no la mano entera"*.
`manoLeer()` pedía la distancia pulgar-índice **y además** `largos.filter(Boolean).length<=2`, o sea
que como mucho dos de los cuatro dedos podían estar estirados. Una pinza natural —pulgar e índice
juntos y el medio, el anular y el meñique afuera— deja **tres** estirados: no contaba.

**Y la condición no estaba protegiendo de nada, lo cual se ve en cuanto se miden los números.**
Distancia pulgar-índice en palmas: pinza **0,061** · puño 0,878 · dos dedos 1,405 · mano abierta
1,379. La distancia sola separa la pinza de todo lo demás por **catorce veces**, y el umbral de 0,45
cae en el medio de un hueco enorme — ni siquiera el puño cerrado lo cruza. La cuenta de dedos no
aportaba margen: sólo rechazaba pinzas de verdad.

**POR QUÉ SOBREVIVIÓ, Y ES LO MISMO QUE PASÓ CON EL ESPEJO: LA PRUEBA COMPARTÍA EL ERROR.**
`manoFalsa(dedos, pinza, …)` cuenta los dedos estirados **desde el índice hacia afuera**, así que para
juntar el pulgar con el índice tenía que cerrar también el índice y todo lo que viniera después. La
única pinza que el banco sabía dibujar era la de puño cerrado — justo la que el código aceptaba. Ahora
`manoFalsaPinza(cx, cy, afuera)` arma el índice doblado hacia el pulgar y deja los otros tres a
elección, que es la pose que hace cualquiera sin pensarlo.

Medido después del arreglo: las cuatro variantes de pinza (3, 2, 1 y 0 dedos afuera) dan `pinza:true`,
y **ninguna** pose que no sea pinza da falso positivo — mano abierta, puño, y 1, 2, 3 y 4 dedos, todas
en `false`. Y el rompecabezas, jugado por el camino de verdad con una pinza natural: agarra la pieza de
la derecha, la arrastra al hueco, y al abrir la mano encaja (4→3).

#### MEDIDO AL CERRAR

`manoEspejo` en verde en los dos casos (0,053 de diferencia, que es el desvío real del punto de la
pinza respecto de la muñeca, no un espejo). Partida completa **24 de 24** dos veces —limpia y después
de morir—, 0 pasos dentro de paredes en 20.913, `window.__errs` vacío. Aro medido: 86,52 px sobre un
blanco y 45,32 px en el aire, `hit` verdadero sólo cuando el golpe también pegaría. Costo sin cambios:
10 llamadas de dibujo y 16.302 triángulos.

### Vigesimonovena vuelta (2026-08-27): **RECREO** — la tableta, el menú con arte y el ritmo que se ajusta solo

Pedido: *"el de los láseres con la espada saca nomás, no me gusta; agrega otros más simple como una
tableta con ojos donde debes escribir o dibujar algo que te pida como un círculo, y eso con el pinch;
y mejora el menú, agrega un menú parecido al de Baldi's, y genera las imágenes y botones con
Higgsfield; mejora la optimización también porque en mi Poco X8 Pro me va a 30-25 cuando aparece la
mano"*.

#### LA TABLETA CON OJOS REEMPLAZA A LA ESPADA

Se fue entero el mundo neón: los bloques, la espada, el puño forzado, el túnel y su CSS. En su lugar,
en los pasillos 3 y 7, una tableta que pide una forma y hay que dibujarla con la pinza apoyada como un
lápiz. Bajar la pinza es apoyar; subirla es levantar, y ahí se corrige.

**Es la segunda actividad que usa la pinza sostenida, y la única que mira el CAMINO.** El rompecabezas
también arrastra, pero a él sólo le importan dónde agarraste y dónde soltaste; acá lo único que importa
es lo que quedó dibujado en el medio.

**Y SE CORRIGE SOLA, CON GEOMETRÍA DE TRES LÍNEAS:** el círculo pide radio parejo **y** casi la vuelta
entera (parejo sin dar la vuelta es un arco; la vuelta sin ser parejo es un garabato); la raya pide que
ningún punto se aleje de la cuerda; el zigzag pide al menos dos cambios de sentido.

**DOS DEFECTOS DEL PUNTUADOR, LOS DOS ENCONTRADOS POR LA MATRIZ DE PRUEBA** —cada forma contra cada
regla, que es lo único que demuestra que además de aceptar lo correcto RECHAZA lo incorrecto:

- **Un zigzag pasaba como raya.** Medido, el desvío de un zigzag respecto de su propia cuerda es 0,104
  —los picos se cancelan porque la cuerda va por el medio— contra 0,075 de una raya temblorosa: tres
  centésimas de hueco, que no alcanzan para un umbral. Lo que los separa de verdad no es cuánto se
  desvía sino **cuántas veces cambia de sentido**.
- **Pero contar cambios comparando con el punto anterior contaba al revés.** Medido: una raya
  temblorosa daba **cinco** cambios y un zigzag de verdad **tres**, porque el ruido cambia de signo
  todo el tiempo mientras que un zigzag cambia pocas veces y en grande. Contando contra el último
  **extremo** con histéresis de 0,045, el ruido no puede acumular: raya limpia 0, raya ruidosa **0**,
  zigzag **3**. Es detección de picos de toda la vida, e inmune al pulso por construcción y no por un
  umbral elegido a ojo.

Matriz final: cada forma se acepta **sólo como sí misma**, y medio círculo, círculo chico, raya corta,
raya torcida y garabato no pasan como nada. Las tres siguen aceptándose con un temblor de ±0,028 del
marco, que son once píxeles en un teléfono.

**Y LA TABLETA SE ACERCÓ DE 2,7 A 1,7 M** porque en una captura **el profesor quedaba delante de la
hoja**: él camina el tramo y espera, así que a dos metros y medio su cuerpo tapa justo el área de
dibujo. Los tamaños no hubo que recalcularlos: están en fracciones del marco.

#### LA OPTIMIZACIÓN: PRIMERO MEDIR CUÁL DE LOS CUATRO SOSPECHOSOS ERA

`costoPartes()` corre cada etapa sola, con y sin manos. El render sube 0,145 ms al aparecer la mano, de
los cuales el armado de las manos 3D es 0,033 y el aro 0,012: **el resto es lo que se dibuja**. Y la
cuenta que explica los 25-30 fps del teléfono sin misterio: `detectForVideo()` tarda entre 8 y 20 ms y
**corre en el hilo principal** —no hay forma de sacarlo, tasks-vision usa `document.createElement`
adentro y no arranca en un worker—. A 24 Hz eso son entre 190 y 480 ms de cada segundo mirando la mano:
en el peor caso, **la mitad del hilo**. Los 60 fps no se pierden dibujando, se pierden midiendo.

Dos cambios:

1. **EL RITMO SE AJUSTA SOLO.** Un número fijo de mediciones por segundo no puede estar bien en los dos
   extremos: 24 le sobra a un teléfono rápido y hunde a uno lento. Lo que sí se puede fijar es **cuánto
   del hilo se le presta al detector**, y de ahí sale el ritmo. Medido: con 4 y 12 ms se queda en 24 Hz
   (un aparato rápido no pierde nada); con 20 ms baja a **15 Hz** y con 28 a **12**, dejando la carga
   acotada en ~30 % en vez de 48 % o 67 %. Y esto **sólo se puede hacer porque la interpolación ya
   estaba**: medir menos veces no es dibujar menos veces.
2. **LOS TRIÁNGULOS DE LAS MANOS: 7.080 → 2.680.** De los 7.080, **5.880 eran las 42 esferas de las
   articulaciones a 10×8 segmentos**. Un nudillo ocupa unos pocos píxeles —y encima el juego dibuja a
   resolución reducida y estira con NEAREST—, así que 6×5 se ve igual. Es el mismo criterio que decidió
   los 14 lados de los discos de la tableta.

#### EL MENÚ

Era un panel negro con texto centrado, o sea la pantalla de opciones de cualquier cosa, delante de un
colegio de 1999 dibujado a propósito con colores planos. **Tres imágenes generadas y nada más, 41 KB
las tres**: el pasillo de fondo, el logo recortado y una chapa de botón vacía que se estira debajo del
texto —un botón por imagen serían seis descargas para seis rectángulos iguales, y encima el texto tiene
que poder traducirse a tres idiomas—.

**El logo salió mal la primera vez y decía "RECEO".** Un modelo de imagen no deletrea a pedido: se
pidieron tres variantes con la palabra escrita letra por letra en el prompt y se eligió la que estaba
bien. Y el fondo se recorta con un **relleno desde el borde** y no con un umbral de brillo: el logo
tiene contorno negro *adentro* de cada letra, y un umbral se los lleva junto con el fondo.

#### MEDIDO AL CERRAR

Partida completa **24 de 24** dos veces —limpia y después de morir—, 0 pasos dentro de paredes en
19.752, `window.__errs` vacío. Matriz del puntuador con diagonal perfecta. Manos: 21 ms de retardo,
atenuación 4,10, las tres pruebas de reparto y la del espejo en verde. Costo sin actividad: 10 llamadas
de dibujo y 16.302 triángulos.

**Lo que no pude verificar:** no tengo el teléfono del jugador, así que el ritmo adaptativo está
probado por su decisión (dado un tiempo de detección, qué ritmo elige) y no contra MediaPipe corriendo
de verdad. Si sigue yendo a 25-30, el próximo paso es bajar la entrada del detector de 320×240.

### Trigésima vuelta (2026-08-27): **RECREO** — el juego se mide solo y se baja la calidad

Pedido: *"puedes mejorarlo aún más, incluso para dispositivos más gama baja"*.

#### EL AGUJERO MÁS GRANDE NO ERA UNA CONSTANTE: ERA QUE NADIE TOCA LOS AJUSTES

El juego arranca en calidad `media` **y ahí se queda**. Los ajustes existen desde hace vueltas y están
en el menú, pero nadie entra al menú a bajarse los gráficos — y menos alguien que no sabe que el
problema son los gráficos. **Un ajuste que hay que descubrir para que sirva, en la práctica no
existe.**

Y el escalón que nadie usaba es el más grande que hay: de `media` a `baja` el pixel ratio pasa de 0,90
a 0,60, o sea **2,25 veces menos píxeles que rellenar**, en un juego que está limitado por relleno
(todo pasa por el filtro de baja calidad, que ya dibuja a un destino reducido).

Ahora hay un **vigía**: mide los cuadros y baja solo. Tres reglas, y las tres son lecciones viejas de
este proyecto:

1. **BAJAR A CIEGAS ES UNA APUESTA.** En un aparato que *no* está limitado por relleno, bajar la
   resolución no gana nada y sólo deja la imagen más blanda — medido en Maicol: de 590 mil a 389 mil
   píxeles, 29,45 → 29,60 cuadros por segundo, o sea **cero**. Así que después de cada escalón se
   vuelve a medir, y si no ganó al menos un 8 % **se vuelve para arriba y no se toca más**.
2. **NO SE MIDE EL PRIMER SEGUNDO.** Los primeros cuadros traen la compilación de shaders, la subida
   de texturas y el primer paso de MediaPipe: medir ahí es concluir que el aparato es lento cuando lo
   único lento fue empezar.
3. **SI EL JUGADOR ELIGE, EL VIGÍA SE CALLA.** Un ajuste automático que le pisa la elección a alguien
   que acaba de elegir no es una ayuda, es un forcejeo — y desde afuera se ve como que el menú no
   guarda lo que le ponen.

La escalera: `calidad baja` → `entrada del detector a 224×168` → `calidad mínima` (px 0,45, un escalón
nuevo que **no aparece en el menú**: no es una opción, es a donde llega el vigía solo; ofrecerle a
alguien elegir la peor imagen del juego sin saber si la necesita no es una opción, es una trampa).

**La entrada del detector se baja con `applyConstraints`, no volviendo a pedir `getUserMedia`**, y la
diferencia importa: pedir la cámara otra vez en algunos navegadores **vuelve a preguntar el permiso**,
y preguntarlo en medio de una partida —cuando el gesto del jugador ya expiró— es la forma más rápida
de quedarse sin manos a la mitad del juego.

#### PROBADO SIN UN TELÉFONO LENTO, PORQUE LO QUE HAY QUE PROBAR ES LA POLÍTICA

No puedo hacer que el contenedor vaya a 25 fps a pedido, pero el aparato no es lo que hay que probar:
es qué **decide**. Se le inyectan tiempos de cuadro:

| lo que mide | qué hace | dónde termina |
|---|---|---|
| 60 fps | **no toca nada**, 0 escalones | media |
| 26 → 45 → 58 | baja dos escalones | mínima |
| 26 → 27 (no gana) | aplica uno, mide, **lo devuelve** | media |
| 18 → 24 → 31 | baja hasta el fondo | mínima |

La tercera fila es la que importa: es la regla de Maicol funcionando, y es la que evita dejar la imagen
peor a cambio de cero.

#### MEDIDO AL CERRAR

Partida completa **24 de 24** dos veces —limpia y después de morir—, 0 pasos dentro de paredes en
19.752, `window.__errs` vacío, matriz del puntuador con diagonal perfecta, las tres pruebas de reparto
de manos en verde, manos a 21 ms con atenuación 4,10, 10 llamadas de dibujo y 16.302 triángulos.

#### UNA ADVERTENCIA SOBRE EL CONTENEDOR, QUE COSTÓ MEDIA VUELTA

**El contenedor revirtió la copia local del repo tres veces en esta sesión**, y una de esas veces lo
hizo *en medio* de una tanda de ediciones: quedaron archivos míos nuevos encima de otros archivos
viejos. Peor todavía, en un momento `git log` mostraba la rama en un commit anterior y me llevó a
concluir —mirando el HEAD equivocado— que trabajo ya empujado se había perdido. **No se había
perdido: `origin` tenía todo.** La regla que queda: cuando algo parezca faltar, comprobar contra
`origin` con `git fetch` ANTES de sacar conclusiones, y recuperar con
`git reset --hard origin/<rama>` en vez de rehacer.

### Trigésima primera vuelta (2026-08-27): **RECREO** — el detector deja de trabajar de más

Reporte: *"optimiza la mano, porque eso es lo que laguea cuando aparece; mejoraste un poquito antes de
esta versión, ahora mejoralo aún más"*.

Y tenía razón en el diagnóstico: **cuando aparece** es la parte importante de la frase. HandLandmarker
en modo VIDEO tiene **dos** modelos, no uno. El caro es el **detector de palma**, que busca la mano en
el cuadro entero; el barato es el de puntos, que la sigue una vez que ya sabe dónde está. Y el de
puntos **corre una vez por mano**. Sin una mano en cuadro sólo hay búsqueda; con la mano aparecen los
dos, y con dos manos el de puntos se paga doble.

Las vueltas anteriores atacaron *cada cuánto* se mide. Ésta ataca **cuánto trabajo se pide en cada
medición**, que era donde quedaba lo grande — y estaba escrito como tres constantes.

#### 1. `numHands: 2` PARA TODO EL JUEGO, CUANDO CASI NADA NECESITA DOS

Era una constante puesta cuando el juego era sólo contar dedos: cuatro más cuatro son ocho, y ocho
dedos son las dos manos. Pero desde entonces el juego tiene **siete actividades de pasillo** y
**ninguna** necesita dos manos: la pinza, el arrastre y el dibujo se hacen con una. Se estaba pagando
el modelo de puntos dos veces en todos los pasillos para nada.

Ahora el número se lo pide el juego a la escena. Auditada la partida entera: **44 escenas, y sólo 15
momentos piden dos manos** — los que tienen una cuenta cuya respuesta pasa de cinco, porque seis dedos
no entran en una mano. De las 24 cuentas, 14 pasan de cinco. Todo lo demás va con una.
Y **se cambia en los bordes de escena, nunca por cuadro**: `setOptions` rearma el grafo del detector,
así que llamarlo seguido costaría más de lo que ahorra.

#### 2. LOS UMBRALES BAJAN, Y NO ES PARA DETECTAR MEJOR: ES PARA DETECTAR MENOS VECES

En modo VIDEO el detector de palma **no corre siempre**: corre cuando el seguimiento se cae por debajo
de `minTrackingConfidence`. O sea que un umbral alto no da más precisión — da **más veces que se vuelve
a buscar la mano de cero**, que es justo lo caro. Bajado a 0,40, el seguimiento se sostiene más y el
modelo caro entra menos. El riesgo de sostener una mano que ya no está lo cubre la caducidad de 260 ms,
que ya estaba.

#### 3. 320×240 ERAN PÍXELES QUE SE COPIABAN PARA TIRARLOS

Los modelos tienen entrada fija y chica —el de palma trabaja alrededor de 192 px de lado y el de puntos
alrededor de 224—, así que todo lo que se le mande por encima **se achica antes de mirarlo**. Bajar a
**256×192** son 1,56 veces menos píxeles que mover en cada medición, sin perder detalle que el modelo
fuera a usar.

#### 4. Y MIENTRAS EL PROFESOR CAMINA, LA MANO NO DECIDE NADA

Los pasillos son largos y ahí no hay nada que contestar. Medir 24 veces por segundo para dibujar una
mano que no hace nada era el gasto más fácil que quedaba, y es **la mayor parte del juego**: medido,
**26 de las 44 escenas (59 %) están en reposo**. Ahí el ritmo baja a 8 Hz y vuelve al normal en cuanto
hay algo que contestar — con margen, porque si subiera recién cuando el jugador ya levantó la mano, el
primer gesto de cada aula llegaría tarde.

#### MEDIDO AL CERRAR

Auditoría de la partida entera: 44 escenas, 15 momentos con dos manos, 26 en reposo. Verificado escena
por escena: `saludo` 1 mano y 8 Hz · `act2` (pasillo) 1 mano y 24 Hz · `viaje3` 1 mano y 8 Hz · una
cuenta que da 6 → **2 manos pedidas**. Partida completa **24 de 24** dos veces —limpia y después de
morir—, 0 pasos dentro de paredes en 19.752, `window.__errs` vacío, diagonal perfecta en el puntuador
de la tableta, las tres pruebas de reparto de manos en verde.

**Lo que no pude verificar, y es lo mismo de siempre:** no hay cámara ni MediaPipe de verdad en el
banco, así que lo medido es *qué le pide el juego al detector*, no cuántos milisegundos ahorra eso en
un teléfono. Las tres primeras cosas son estructurales —la mitad de trabajo del modelo de puntos en
los pasillos, menos corridas del modelo caro y 1,56 veces menos píxeles de entrada— pero el número
final sólo lo dice el aparato.

### Trigésima segunda vuelta (2026-08-27): **RECREO** — el ritmo de reposo estaba al revés

Reporte: *"ok bien, pero ahora la mano va lento y súper lagueada, y el fondo del juego bien"*.

**Era mío y de la vuelta anterior.** Bajé el ritmo de medición a 8 Hz "mientras el profesor camina,
porque ahí la mano no decide nada". El razonamiento estaba mal y el jugador lo vio en un segundo: **la
mano se sigue viendo en esas escenas**, y una mano muestreada ocho veces por segundo se ve exactamente
como lag, decida algo o no. Que el fondo fuera bien y sólo la mano no es la firma exacta de esto: el
render no cambió, cambió cada cuánto se mide la mano.

Y el número deja poco que discutir. Retardo de seguimiento contra el ritmo:

| ritmo | 24 Hz | 15 | 12 | 10 | 8 | 6 |
|---|---|---|---|---|---|---|
| retardo | **21 ms** | 34 | 43 | 52 | **64** | 88 |

A 8 Hz la mano quedaba en **64 ms**, o sea **peor que los 65 ms de los que se había partido dos vueltas
atrás** — deshaciendo justo lo que se había pedido arreglar.

#### LA REGLA CORRECTA ES LA DE AL LADO

El ritmo de reposo es para cuando **no hay mano en cuadro**, no para cuando el juego no pregunta.
Sin mano no hay nada que dibujar ni que seguir —y encima es el caso barato, porque sólo corre el
buscador de palma—, así que mirar diez veces por segundo alcanza de sobra: en cuanto aparece, **la
misma medición que la encontró sube el ritmo al máximo**. Si hay una mano, el jugador la está usando, y
va a fondo camine el profesor o no.

Y el tope pasó a decidirse **en la medición y no en el borde de escena**, que era el otro defecto de la
misma idea: decidido por escena, la mano aparecía y seguía a ritmo de reposo hasta el siguiente cambio.

Tabla de verdad, medida:

| hay mano | la escena pide | ritmo |
|---|---|---|
| no | no | 10 |
| no | sí | 24 |
| **sí** | **no** | **24** ← la casilla que estaba en 8 |
| sí | sí | 24 |

**Lo honesto es decir que el ahorro de esa idea era chico y estaba en el lugar equivocado.** Lo que sí
ahorra de la vuelta anterior sigue en pie y no se tocó: una sola mano en los siete pasillos (la mitad
del modelo de puntos), los umbrales que hacen que el modelo caro entre menos veces, y 256×192 de
entrada.

#### MEDIDO AL CERRAR

Retardo de vuelta en **21 ms** con atenuación 4,10. En `viaje3` —pasillo, escena que no pide nada— con
una mano en cuadro el tope es **24**. Partida completa **24 de 24** dos veces, 0 pasos dentro de
paredes en 19.752, `window.__errs` vacío, diagonal perfecta en el puntuador y las tres pruebas de
reparto de manos en verde.

### Trigésima tercera vuelta (2026-08-27): **RECREO** — el techo de 24 Hz y la predicción tímida

Pedido: *"ahora haz que vaya a 60 fps sí o sí la mano, sin lentitud, súper ajustada a la mano real, y
que siga movimientos bruscos"*.

Quedaban **dos techos**, y los dos estaban escritos como constantes de cuando no había con qué decidir
mejor.

#### 1. EL RITMO ESTABA CLAVADO EN 24 AUNQUE SOBRARA PROCESADOR

`MANO_HZ_MOVIL=24` se puso cuando medir costaba entre 8 y 20 ms y no había forma de saber cuál de los
dos era este aparato. Desde la vuelta anterior **hay una regla que lo sabe** —el ritmo sale de cuánto
tarda la detección y de cuánto hilo se le presta—, y con esa regla puesta el tope de 24 lo único que
hacía era impedirle a un teléfono rápido usar lo que le sobra: **con una detección de 6 ms, el 30 % del
hilo da cincuenta mediciones por segundo, y el tope las cortaba en 24.**

El techo sube a 60 y deja de ser la regla. Medido, lo que elige ahora:

| detección | 4 ms | 6 | 10 | 20 | 28 |
|---|---|---|---|---|---|
| ritmo | **60 Hz** | 50 | 30 | 15 | 12 |

Y se piden **60 cuadros de cámara**, que faltaban: la medición cuelga de `requestVideoFrameCallback`,
o sea que corre al mínimo entre lo que pide el juego y **lo que da la cámara** — con una cámara a 30 no
hay forma de medir más de 30 por mucho que sobre procesador. Se arranca a 30 y no en el techo: todavía
no hay ni una medición de este aparato, y empezar a 60 es apostar a que es rápido justo mientras se
compilan los shaders.

#### 2. LA PREDICCIÓN ESTABA EN 8 ms, QUE ES NO PREDECIR

Y acá **se probó una idea, se midió, y se sacó**, que es la parte que vale anotar. La idea era una
segunda puerta: mirar si la mano viene **derecho** o está **doblando** —comparando el último
desplazamiento con el anterior— y apagar la predicción en la curva, que es el único momento en que
predecir hace daño. Con esa puerta, el tope se podría subir sin pagar sobrepico.

**No cambiaba absolutamente nada.** El barrido dio columnas **idénticas** para umbrales de 0,0 a
0,9999 — la firma de un parámetro que no toca nada. Y la razón no es que estuviera mal conectada (lo
estaba, se verificó en el archivo armado): **es que la puerta no puede funcionar.** El sobrepico de una
vuelta ocurre *antes* de que la vuelta se pueda ver — mientras la mano todavía va derecho a toda
velocidad, la predicción la empuja más allá, y recién la medición siguiente muestra que dio la vuelta.
Para cuando la puerta se entera, el pico ya pasó. **Un predictor no puede anticipar un cambio de
sentido que todavía no ocurrió**, y ninguna cantidad de historia lo arregla. Se sacó entera en vez de
dejar una perilla que no hace nada.

Así que el tope se elige midiendo el intercambio, que es lo que había que hacer desde el principio:

| predicción | seguimiento | manotazo | se pasa al frenar |
|---|---|---|---|
| 8 ms | 21 ms | 11 ms | 0,0 % |
| **20 ms** | **9 ms** | **−1 ms** | **5,8 %** |
| 30 ms | −1 ms | −11 ms | 11,2 % |

A 20 la mano deja de ir atrás en el movimiento sostenido y **empata en un manotazo**, que es lo que se
pidió. Lo que se paga es un 5,8 % de exceso al frenar de golpe: siete píxeles en un teléfono, dos
cuadros. Eso no se lee como rebote, se lee como inercia — 30, que ya adelanta a la mano de verdad, sí
se nota mal.

#### LO QUE QUEDA, JUNTANDO LAS DOS COSAS

| ritmo | seguimiento | manotazo | atenuación del temblor |
|---|---|---|---|
| 24 Hz | 9 ms | −1 ms | 4,10 |
| 40 Hz | −1 ms | −9 ms | 5,25 |
| 60 Hz | **−7 ms** | −15 ms | **6,16** |

Partiendo de los 65 ms de tres vueltas atrás, a 24 Hz son **7,2 veces menos retardo**, y en un aparato
que llegue a 60 la mano dibujada va **por delante** de la medición — que no es un defecto: la pantalla
y el compositor agregan sus propios veinte o treinta milisegundos, así que adelantarse un poco es lo
que hace que se vea pegada a la mano de verdad. Y el temblor **mejora** con el ritmo (4,10 → 6,16),
porque más muestras es más filtro.

#### MEDIDO AL CERRAR

Partida completa **24 de 24** dos veces, 0 pasos dentro de paredes en 19.752, `window.__errs` vacío,
diagonal perfecta en el puntuador de la tableta, las tres pruebas de reparto de manos y la del espejo
en verde, y la tabla de reposo intacta (sin mano 10 Hz, con mano 24 o más).

### Trigésima cuarta vuelta (2026-08-27): **RECREO** — la mano a lo lejos y la calidad alta para todos

Pedido: *"mejoralo aún más para gráficos altos así gamas bajas pueden disfrutar de buena calidad
también, y agrega una mejor detección de manos a lo lejos así no se buguean o desaparecen"*.

#### LA MANO A LO LEJOS: ERA MI FILTRO FRENÁNDOLA, NO MEDIAPIPE PERDIÉNDOLA

Cuatro constantes —la zona muerta del filtro, las dos puertas de velocidad y la separación mínima
entre dos manos— estaban en fracciones **del marco**, como si una mano midiera siempre lo mismo. Una
mano al doble de distancia se ve a la mitad de tamaño **y se mueve la mitad en pantalla para el mismo
gesto de verdad**, así que su movimiento real caía por debajo de umbrales pensados para una mano cerca:
el filtro lo tomaba por ruido y lo aplastaba, y la predicción no se encendía nunca.

**Y la regla ya estaba escrita en este archivo desde la primera vuelta** —*"todo se mide en proporción
al tamaño de la palma, que es invariante a la distancia"*—, aplicada a contar dedos y a la pinza, pero
nunca al filtro ni a la predicción, que se escribieron después.

Medido, con el movimiento escalado por la distancia como pasa de verdad:

| lejanía | cerca | media | lejos |
|---|---|---|---|
| **antes** | 9 ms | 35 ms | **82 ms** |
| **ahora** | 9 ms | **9 ms** | **9 ms** |

A cuatro veces la distancia la mano iba **nueve veces más atrasada**; ahora el retardo es **plano** y la
atenuación del temblor se queda en 4,10 a cualquier distancia.

Hicieron falta **dos** correcciones y la segunda no era obvia: escalar la zona muerta llevó 82 a 36,
pero el corte del filtro sale de `beta·|derivada|` y la derivada de una mano lejana **es** más chica
para el mismo gesto, así que seguía saliendo más suavizada. Dividiendo beta por la escala, lo que manda
pasa a ser la velocidad **en palmas por segundo** y no en pantalla por segundo: el mismo gesto abre el
filtro lo mismo esté cerca o lejos. Ahí quedó plano.

#### LA CALIDAD ALTA DEJA DE SER UN PRIVILEGIO DE LOS APARATOS RÁPIDOS

`calidad` mezclaba **dos cosas distintas** en una sola perilla: cuántos píxeles se dibujan y **qué se
ve** (los lockers, cuánto alcanza la niebla). Bajarla en un teléfono lento le sacaba las dos, o sea que
el aparato que menos podía era además el único que veía un colegio más pobre y más corto.

Ahora van separadas. Lo que **cuesta** —el relleno— se ajusta solo cuadro a cuadro con **resolución
dinámica**; lo que **se ve** se queda puesto. Es como lo resuelven las consolas, y acá es todavía más
adecuado: el juego ya dibuja pixelado a propósito, así que bajarle resolución cae dentro de su propio
estilo, mientras que un pasillo sin lockers se nota siempre.

Medido, la política: 40 ms por cuadro → baja al piso 0,45 · 10 ms → se queda en 1,0 · 18 ms → se
sostiene en 0,97 sin latir, porque tiene banda muerta (un ajuste que persigue cada cuadro hace latir la
imagen, y eso se ve peor que quedarse un escalón por debajo).

Con eso, **el juego arranca en `alta`**, que antes habría hundido a medio mundo. Un teléfono lento
termina con el mismo relleno que tenía en `media` —0,45 × 0,58 contra 0,9 × 0,58— pero con el colegio
completo. Y **la resolución tiene prioridad sobre el vigía**: mientras a la resolución le quede margen,
el vigía espera; sólo entra a apagar cosas cuando ya tocó fondo y aun así no alcanza.

#### MEDIDO AL CERRAR

Retardo plano a toda distancia (9 ms), temblor 4,10 en todas, las tres pruebas de reparto de manos en
verde. Resolución dinámica probada en sus tres regímenes. Partida completa **24 de 24** dos veces, 0
pasos dentro de paredes en 19.752, `window.__errs` vacío, diagonal perfecta en el puntuador.

**Lo que no pude verificar:** `PALMA_REF` (0,14) está calibrado contra la mano sintética del banco. Si
en un teléfono real la palma se ve bastante más grande o más chica que eso, el escalado sigue siendo
correcto en su forma —es una proporción— pero el punto donde vale 1 se corre, y con él el ajuste fino
de la zona muerta. Se corrige con un solo número si hace falta.

### Trigésima quinta vuelta (2026-08-27): **RECREO** — nadie te baja los gráficos, y el colegio deja de ser lento

Pedido: *"que no se baje automáticamente los gráficos, volvé a optimizar todo, y mejorá el movimiento y
la velocidad con el cambio de salones así no se vuelve tan aburrido; e intentá generar música con
Higgsfield, yo sé que se puede"*.

#### EL VIGÍA SE FUE ENTERO

Bajaba la calidad por escalones —apagaba los lockers, acortaba la niebla—, o sea que **le sacaba cosas
que se ven a quien menos podía**. Y desde que existe la resolución dinámica ya no hacía falta: lo que
cuesta es el relleno de píxeles y eso se ajusta solo **sin tocar nada de lo que hay en el colegio**. La
calidad la elige el jugador en el menú y nadie se la cambia por atrás. Se fue también el escalón
`minima`, que sólo existía como destino del vigía: un escalón que nadie puede elegir y que aparece
cuando el juego decide bajarte los gráficos es exactamente lo que se pidió sacar.

#### EL COLEGIO SE MUEVE UN 29 % MÁS RÁPIDO

El tramo más largo son catorce celdas = 58,8 m; a 2,6 m/s eran veintitrés segundos de pasillo, y
aunque la actividad cae en la mitad, las dos mitades siguen siendo caminata. A **3,7** el mismo tramo
son dieciséis segundos. El profesor sube en la misma proporción (3,0 → 4,2) para que siga llegando
antes que la cámara, y **el ciclo de la caminata no hubo que tocarlo**: `CAMINA_W` sale de la
velocidad, así que la zancada se acomoda sola — eso es lo que se ganó cuando se derivó en su momento.
Más las esperas de escena recortadas un tercio.

Medido, la partida completa: **19.736 pasos → 14.062**, o sea de ~5,5 minutos a ~3,9 con exactamente el
mismo contenido. Y 0 pasos dentro de paredes en 14.078, que era el riesgo de subir la velocidad.

#### LA MÚSICA: TRES PROGRESIONES, EL TEMPO QUE SUBE, Y UN GIRO AL CAMBIAR DE AULA

Había **una** vuelta de cuatro compases para toda la partida. Ahora hay tres progresiones que comparten
escala y bajo, así que cambiar de una a otra no suena a "empezó otra canción" —eso cortaría la partida
en pedazos— sino a que la misma pieza dobló la esquina. Se eligen por aula, así que **ninguna suena dos
aulas seguidas**: 0·1·2·0·1·2·0·1. El tempo sube de 92 a 116 de a seis pulsos, que es poco a propósito:
un salto grande se oye como que cambió la música, y lo que tiene que oírse es que el colegio aprieta.

Y al entrar a cada aula suena un **giro corto** que marca el cambio. Sin él la progresión nueva empieza
en medio de la anterior y no se percibe que pasó algo — se percibe que la música se equivocó.

**UN DEFECTO PROPIO, Y DE LOS SILENCIOSOS:** cambié la forma de `MUS_BAJO` de pares `[frecuencia,
grado]` a una lista plana de frecuencias, y dejé los tres accesos como `MUS_BAJO[compas][0]` —
indexar un número da `undefined`, y eso entra al grafo de audio como `setValueAtTime(NaN)`. La consola
lo cantó; a oído habría sido "la música dejó de sonar en algún momento".

#### LA MÚSICA GENERADA: LA BUSQUÉ Y NO LA VOY A FORZAR

El modelo existe en esta cuenta —`sonilo_music`, texto a música— pero está declarado **"game pipeline
only"** y la herramienta dice explícitamente que no se use para audio suelto. Busqué además en el
mercado de apps (`apps_search "music"`): no hay ninguna. O sea que no es que no lo intenté: la
restricción es de la plataforma y no la voy a rodear. Lo que sí se puede hacer bien es lo de arriba, y
encima pesa **cero bytes** y puede cambiar con el aula, que un archivo suelto no puede.

#### MEDIDO AL CERRAR

Partida completa **24 de 24** dos veces (limpia y después de morir), 0 pasos dentro de paredes en
14.078, `window.__errs` vacío. Música sonando con rms 0,034 y **0 % de muestras mudas**. Retardo de la
mano plano a toda distancia (9 ms) con atenuación 4,10, las tres pruebas de reparto y la del espejo en
verde, diagonal perfecta en el puntuador de la tableta, y `vigiaVer` ya no existe.

### Trigésima sexta vuelta (2026-08-27): **RECREO** — la música SÍ se puede generar, y me equivoqué

Reporte, de una línea: *"damn hermano, pero para Maicol sí generaste música"*.

**Tenía razón y el error fue mío.** La vuelta anterior dije que no se podía, apoyándome en que
`sonilo_music` está marcado *"game pipeline only"* y en que la herramienta pide no usarlo para audio
suelto. Me quedé con la lectura más estrecha de una nota en vez de comprobarlo — y la prueba de que
estaba mal la tenía en el propio repo: los temas de Maicol son **M4A de un mega generados con este
mismo proveedor**, y `herramientas/maicol/armar_audio.py` existe justamente para hornearlos. Lo
intenté en vez de discutirlo y **funcionó a la primera**.

La lección no es sobre el modelo: es que cuando el usuario dice "yo sé que se puede" y hay evidencia en
el repo, lo que corresponde es probar, no citar la documentación.

#### CUATRO TEMAS, 245 KB LOS CUATRO

`aula` · `pasillo` · `final` · `menu`, generados con `sonilo_music` y horneados con
`herramientas/recreo/hornear_musica.py`. El tema sale del estado del juego y no de quien llama, así que
no hay dos sitios que puedan pedir cosas distintas a la vez, y se cruzan con un fundido de 0,9 s.

**Tres cosas del horneado, y las tres se aprendieron antes:**

- **El empalme del bucle es lo que más se nota.** Un tema cortado en seco y puesto a repetir da un
  golpe seco en cada vuelta, y ese golpe se escucha *más* que la música. Se funde la cola sobre la
  cabeza — el mismo problema que la costura de una textura, en una dimensión.
- **Va con `BufferSource` y no con un `<audio loop>`**: el loop de un `<audio>` vuelve al cero con un
  hueco de milisegundos, y en un tema de trece segundos ese hueco se escucha en cada vuelta.
- **Y LO PROCEDURAL NO SE BORRA.** Queda de respaldo: si un navegador no decodifica el MP3, sin
  respaldo el juego se queda mudo. Ya pasó una vez con el audio de Campo de Tiro.

#### DOS COSAS QUE LA MEDICIÓN CORRIGIÓ

1. **El volumen venía del archivo y no de la mezcla.** Los temas están normalizados y a ganancia 1 el
   analizador daba **rms 0,166**: más fuerte que la voz de Baldi (0,067) y más de la mitad del grito
   (0,280), o sea que la música habría tapado justo las dos cosas a las que hay que prestar atención.
   La escala de esta mezcla ya estaba fijada hace vueltas y la música va abajo de todo: a 0,24 queda en
   **0,039**.
2. **Normalizar por PICO deja los temas con distinta sonoridad.** Medido en el juego, con los cuatro al
   mismo pico el del aula daba rms 0,0226 y el del pasillo 0,0501 — **el doble**, o sea que cambiar de
   pasillo a aula sonaba a que alguien bajaba el volumen. Un tema denso y uno espaciado con el mismo
   pico no se escuchan igual; lo que sigue el oído es la energía media. Igualados por **rms** (0,16
   ±0,003 los cuatro, verificado decodificando los MP3), el pico pasa a ser sólo un techo.

   Y el resto de diferencia que sigue apareciendo al medir en vivo **no es de nivel**: es que la ventana
   del analizador cae en distintos pedazos de cada bucle, y un tema con pausas mide menos en una
   ventana de segundo y medio aunque su energía total sea la misma.

#### MEDIDO AL CERRAR

Los cuatro temas decodifican, suenan y se cambian solos según la escena (pasillo → `pasillo`, aula →
`aula`), **0 % de muestras mudas**, `procedural:false` mientras hay tema generado. Partida completa
**24 de 24** dos veces, 0 pasos dentro de paredes, `window.__errs` vacío, retardo de la mano plano a
toda distancia y diagonal perfecta en el puntuador. El HTML pasa de 1,56 a **1,89 MB**, y esos 330 KB
son la música.

### Vigesimosexta vuelta (2026-08-27): **RECREO** — el temblor, las dos manos fantasma y el diálogo hablado

Reporte: *"la interpolación está bien pero tiembla mucho y se crean dos manos eso hace que el conteo
esté mal … y las voces de highsfield las quería diciendo el diálogo completo"*.

#### LAS DOS MANOS FANTASMA: LA CAUSA ERA LA CÁMARA TRASERA

Yo repartía las dos ranuras por **`handedness`** —Left/Right— convencido de que era lo estable. Es lo
contrario, y la razón es justamente el cambio de la vuelta anterior: **MediaPipe decide la mano
suponiendo una imagen espejada**, la de una cámara frontal. Con la trasera la imagen no está espejada,
así que la etiqueta se da vuelta y, peor, **parpadea entre cuadros**. Una sola mano real alternando
Left/Right cae un cuadro en la ranura 0 y el siguiente en la 1, las dos quedan vivas los 260 ms de
caducidad, y el juego ve **dos manos y suma el doble de dedos**.

La posición no parpadea: una mano está donde estaba hace 40 ms. Ahora cada detección se empareja con
la ranura cuya última muñeca esté más cerca. Y aparte, **se descartan las detecciones duplicadas**:
MediaPipe puede devolver la misma mano física dos veces, y a menos de 0,13 de cuadro no hay dos manos
—una mano abierta mide 0,25 de ancho— sino una vista dos veces.

Tres pruebas que entran por el mismo reparto que usa la cámara: dos detecciones encimadas → **1 mano,
5 dedos** (antes 10); dos manos separadas → 2 manos, 10 dedos; y una mano cuya etiqueta se da vuelta
cada cuadro → **1 mano, 4 dedos**.

#### EL TEMBLOR: DOS CAUSAS, Y UNA ERA MI PROPIA PREDICCIÓN

1. **La predicción amplificaba el ruido.** Extrapolaba siempre: `objetivo = b + (b−a)·(f−1)`. Con la
   mano quieta `(b−a)` **no es movimiento, es el ruido del detector** — o sea que el código tomaba el
   ruido y lo multiplicaba antes de dibujarlo. Ahora la predicción está atada a la velocidad: quieta
   no predice nada.
2. **Un filtro de constante fija no puede ganar.** Si suaviza poco pasa el ruido; si suaviza mucho la
   mano llega tarde. No hay valor que sirva, porque las dos cosas no pasan al mismo tiempo. Entró un
   **1-euro**: mira la velocidad y baja el corte cuando la mano está quieta —donde lo único que se
   mueve es el ruido— y lo abre cuando se mueve.

**Y acá me equivoqué en una predicción y la medición me corrigió:** puse dos etapas en cascada
esperando que la atenuación se elevara al cuadrado (de 4,8 a 23 veces). Dio **4,0**. La razón es que el
ruido que sale de la primera etapa ya está dentro de la banda de paso de la segunda, así que cascadear
no lo vuelve a atenuar. Barrí 48 combinaciones midiendo las dos cosas que se pelean y la frontera real
está en **atenuar 3,8 veces con 100 ms de retardo**; bajar más el corte lleva el retardo a 400 ms, que
para apuntar es inaceptable.

**Y había una tercera causa que no está en la posición:** la **z** de MediaPipe es la coordenada más
ruidosa —es profundidad estimada de una sola cámara— y en este juego no decide dónde está el punto en
pantalla sino el **tamaño** del dedo y la escala de la mano. Con la z al mismo corte que x e y, la mano
quieta **latía de grosor** varias veces por segundo: a ojo eso se lee como "tiembla" aunque la posición
esté perfectamente quieta. La z lleva su propio corte, cuatro veces más bajo, y la escala de la mano se
suaviza en el tiempo. Medido: latido **1,12 %** del grosor, y con el doble de ruido 1,95 %.

Y un cuarto: `estirados` —lo que pinta las puntas de las manos 3D— se tomaba crudo, así que un dedo a
medio estirar cruzaba el umbral varias veces por segundo y la punta parpadeaba de color. Ahora cada
dedo necesita dos lecturas iguales para cambiar de estado: un dedo que se estira tarda más de dos
cuadros, el ruido no.

#### EL DIÁLOGO COMPLETO, HABLADO EN LOS TRES IDIOMAS

**59 clips**: 19 líneas × 3 idiomas + el grito y la risa, generados con Higgsfield (seed_audio, voz
Holden), recortados y horneados a MP3 mono de 16 kHz. Las frases van a **20 kbps** y los dos no
verbales a 40: 380 KB de MP3, 507 en base64. El archivo pasa de 902 KB a **1,40 MB**, y es el precio
de tener el diálogo actuado en tres idiomas dentro de un solo HTML.

Dos decisiones del horneado:

- **Las frases se recortan sólo por los extremos**, a diferencia de los ladridos de la vuelta anterior
  que se recortaban a la ráfaga de más energía. Una frase tiene pausas entre palabras que superan
  cualquier hueco razonable: cortar por ráfagas la partiría al medio.
- **`dAula` se graba sin el número.** El subtítulo dice "Aula 3" porque tiene la variable; la voz dice
  "Otra aula" — grabar ocho variantes por idioma serían 24 clips para que diga un número que ya está
  escrito en pantalla.

Y **la clave viaja con el texto**. Antes las llamadas eran `decir(TX('dBien'))`: el texto llegaba
traducido y la clave se perdía, o sea que no había con qué elegir el archivo. Ahora `dice(clave)` hace
las dos cosas, así que subtítulo y voz no pueden desincronizarse — y si falta el clip de un idioma se
ve el subtítulo y no suena nada, que es el comportamiento correcto y no un error.

La mezcla quedó en tres escalones medidos con ventana de 0,7 a 0,9 s: **música rms 0,035 · voz 0,067 ·
grito 0,280**, con la música agachándose a 0,35 mientras habla y a 0,08 cuando grita.

#### MEDIDO AL CERRAR

Partida completa **24 de 24**, 0 pasos dentro de paredes en 19.706, los 59 clips decodificados (19 ·
19 · 19 · 2), atenuación de temblor 3,83 con 100 ms de retardo, latido de grosor 1,12 %, las tres
pruebas de reparto de manos en verde, y `window.__errs` vacío.

**Lo que no pude verificar:** no puedo escuchar el audio, así que la calidad del español y del
portugués de esta voz —que es una voz inglesa hablando los tres idiomas— está sin comprobar. Si suena
mal, se cambia la voz y se rehornea con un comando.

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
