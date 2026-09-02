# La casa de la langosta

`lacasadelalangosta.html` (y `elplano.html`, el mismo archivo con el nombre
viejo), 1,93 MB en un solo archivo. Sale del plano dibujado a mano
(`plano-original.jpg`), **girado 90°**, en tres niveles con escaleras que
suben y bajan, y encima el bucle de **House of The Locust** de Roblox
(NULLWORKS, personaje de DoctorNowhere).

## El juego viene ya girado

El pedido: que el teléfono **no tenga que rotar la pantalla**. Como una foto
apaisada guardada en un celular con el giro bloqueado — la imagen ya viene
acostada y uno gira el aparato para verla, sin activar nada.

El juego entero —canvas y HUD— vive adentro de `#rot`, un marco que se gira
90° por CSS cuando la ventana está en vertical. El navegador nunca se entera:
para él seguimos parados. Medido: ventana `412x892`, marco y canvas `892x412`,
`transform: rotate(90deg)`.

Girando 90° en el sentido de las agujas, el que mira gira el teléfono al revés
—el borde de arriba hacia la izquierda—, que es como se agarra un celular para
jugar. Y si la ventana **ya** es apaisada (una notebook, o el celular con el
giro automático puesto) no se gira nada: la transición es sola.

**Los controles hubo que traducirlos.** Los botones no: viven adentro del
marco, así que el navegador ya les acierta el toque girado y todo. Pero el
joystick y el arrastre para mirar leen `clientX/clientY`, que vienen en
coordenadas de **pantalla**, sin girar. Con `rotate(90deg)` alrededor del
centro, la vuelta es `q = ((py-cy) + ancho/2, -(px-cx) + alto/2)`, y un
arrastre `(dx,dy)` se lee `(dy,-dx)`.

Un detalle que cuesta encontrar: el centro del joystick sale de
`offsetLeft/offsetTop`, **no** de `getBoundingClientRect()`. El rect de un
elemento girado es su caja alineada a los ejes de la pantalla, no la del
elemento.

## Todo salió de mirar el juego original

No de memoria: se bajaron las miniaturas del propio Roblox por su API y las
portadas de los videos de partidas, y de ahí salió el aspecto.

| | el original | acá |
|---|---|---|
| Papel | damasco **verde** en rombos | ídem, generado con Rezona |
| Zócalo | panel crema | ídem |
| Listel y cornisa | madera miel | ídem |
| Techo | tablas de pino | ídem |
| Piso | alfombra **bordó** | ídem |
| Arañas | hierro negro | ídem |
| Baldosas | tres rectángulos planos **en fila, en un mismo cuarto** | ídem |

El rojo damasco de la versión anterior era de otro juego. En *House of The
Locust* los pasillos son verdes.

## Las habitaciones son cuartos, no naves

La escala también salió de medir las capturas: el personaje de Roblox mide
~1,7 m, el pasillo entra como dos anchos de personaje y el techo queda como a
tres alturas.

| | antes | ahora |
|---|---|---|
| Ojo | 0,55 m | **1,00 m** |
| Pared | 7,0 m | **4,6 m** |
| Sala más grande | 13×13 celdas (29 m) | **5×5 (11 m)** |

Con el ojo a 55 cm contra paredes de 7 m, cada cuarto era una nave de catedral.

## El bucle, sacado de mirar dos partidas completas

Se analizaron dos walkthroughs enteros escena por escena, y de ahí salió todo
esto — no de la memoria ni de un resumen:

1. **Los tres cubos** —rojo, amarillo, azul— a la baldosa de su color. **No se
   levantan: se EMPUJAN** por el piso, raspando. Por eso va de a uno y por eso
   cruzar la casa con uno es la parte que duele.
2. Con los tres puestos se abre la **trampilla del techo** y **cae la pinza al
   piso** con un clanc metálico. Hay que agacharse a levantarla — en el peor
   momento posible.
3. La **llave** está en **uno** de los 24 muebles que se revisan, al azar.
4. La puerta tiene **TRES cerraduras**: el **cableado** se corta con la pinza,
   el **lector** quiere la **tarjeta** y la **cerradura** la llave.

### La tarjeta la lleva ÉL

Es el paso que faltaba y es el mejor del juego: la tarjeta azul le cuelga del
pecho al bicho. **Sólo se la podés sacar por atrás** — el ángulo se mide contra
su frente, y de frente el cartel dice *TE ESTÁ MIRANDO* y nada más. Sacársela
lo despierta al instante.

## Pasos → respiración → verlo

En el juego original el bicho **se anuncia**, y eso no es adorno: es la
mecánica que te da tiempo de retirarte.

| distancia | qué escuchás |
|---|---|
| 26 m | los **pasos**, cada vez más seguido si te está cazando |
| 13 m | la **respiración** |
| 7,5 m | el **latido**, que se acelera al acercarse |
| te ve | el **grito**, una sola vez, con flash rojo y temblor de cámara |

Todo **sintetizado con WebAudio**, no en archivos: cuatro mp3 serían medio mega
en un juego que entero pesa dos, y estos cuatro son ruido y envolventes, justo
lo que un sintetizador hace bien. El grito suena **sólo al pasar de tranquilo a
caza**: si sonara todo el rato que te ve, en diez segundos deja de significar
algo.

## La sala de las baldosas es de yeso blanco

En el original es lo único que rompe con los pasillos verdes, y por eso se
reconoce de lejos y funciona como punto de referencia en un laberinto. Ya no se
forra por dentro con un cascarón: la sala está **escrita en el mapa** con el
tema `pads`, así que sus paredes salen de yeso blanco con tachas redondas
directamente del generador de niveles, y desde el pasillo se ve el encuentro
yeso/papel que sale en la foto del crucifijo.

También salieron de mirar las partidas: los **cuadros con marco dorado** en las
paredes, y que **una de cada cinco lámparas parpadea fuerte**, con cortes secos
— un titileo parejo en todas se lee como un error de render; unas pocas que se
cortan se leen como una instalación vieja.

## Perfil bajo, o él viene

El cartel de la pared del juego original dice que hay que mantener un perfil
bajo. Acá es literal:

| | ruido |
|---|---|
| deslizarse | 1,5 |
| correr | 1,0 |
| caminar | 0,22 |
| **agachado** | **0** |

Con ruido te oye a `9 + ruido·5` metros. Te **ve** a 16 m si estás en su cono
y no hay pared en el medio (línea de vista por la grilla, celda por celda: un
rayo contra el laberinto entero costaría mucho más y daría lo mismo).

Cazando va a **3,6 m/s** y vos corriendo a 4,6 — o sea que correr sirve para
escapar, pero es lo que lo trajo. Y **por los huecos de 62 cm no entra**: mide
2,60 m. Agacharse y cruzar un hueco es la salida de verdad.

Si te agarra: soltás el cubo que llevabas y aparecés lejos. No se pierde el
progreso, se pierde el viaje.

### El bicho

Mide **3,20 m** y es la **malla generada con Rezona** a partir del turnaround
del modelo real: zancos terminados en púas negras en vez de pies, brazos igual
de largos con púas en vez de manos, torso de hueso, trapo oscuro en la cadera
y una columna de soga por cabeza con una maraña de tentáculos.

#### El rig: varillas rígidas, no un esqueleto con pesos

Se le pidió a Rezona el rig con `preset:walk` y `preset:run` y volvió con los
dos clips, pero **la malla sale aplastada** — también la copia sin animar, así
que no es el clip: un esqueleto humanoide con pesos suaves no le entra a un
bicho de zancos sin pies. Se comprobó renderizándolo aparte.

Así que el rig se hace en `bicho.js`, **partiendo la malla en varillas
rígidas**. Es lo que corresponde: es un títere de palos. Una pantorrilla que
gira entera alrededor de la rodilla es exactamente lo que hace una pierna de
zanco, y el suavizado de un skin no aportaría nada salvo artefactos en las
uniones.

**Los cortes salieron de medir, no de suponer.** Se recorrió el bicho en
rebanadas horizontales mirando cuánto se ensancha en el eje lateral:

| | |
|---|---|
| A `\|z\|` > 0,105 | aparecen los brazos |
| El ancho se derrumba en y = 0,27 | ahí está el hombro |
| Debajo de y = −0,28 | sólo quedan las dos piernas |

Diez huesos: cabeza, torso, dos muslos, dos pantorrillas, dos brazos y dos
antebrazos. Las caderas marcan la zancada; **las rodillas van medio ciclo más
tarde y sólo se doblan hacia atrás**, que es lo que hace una rodilla; los
brazos van cruzados con las piernas y los codos casi no se mueven, cuelgan. La
cabeza acompaña con retraso, que es lo que la hace parecer pesada.

Medido sobre el archivo construido: el muslo va de +0,226 a −0,320, la rodilla
llega a −0,822 y el codo a −0,235.

#### Se tiene que ver

Estuvo **invisible** y te mataba igual. No era que faltara dibujarlo: se midió
y estaban las **13 mallas presentes, visibles, sin recorte de frustum y las 13
proyectando dentro de la pantalla**. El problema era el contraste.

| | brillo del bicho | brillo del fondo | contraste |
|---|---|---|---|
| antes | 110 | 127 | **0,87** |
| ahora | 166 | 131 | **1,27** |

Con 0,87 el bicho era un 13% **más oscuro** que la pared de atrás: a esa
diferencia el ojo no lo separa del fondo. Lo tapaba el tinte gris que yo le
había puesto para que no pareciera un juguete — funcionó demasiado bien.

Lo que lo arregla es **emisivo**: un piso de brillo propio que no depende de
ninguna luz de la escena. Es lo correcto para este bicho y no un parche: se
lee igual contra una pared clara que en un pasillo negro, y algo que te tiene
que ver venir necesita exactamente eso. El tinte además se aclaró, el halo
pasó de 1,5 a 3,4 y la luz roja de la cara de 3,4 a 4,2.

#### La cara

La primera malla vino con **ojos de dibujito** —redondos, con esclerótica
blanca, iris verde, cejas y una boca sonriente—, o sea simpática en vez de
aterradora.

Parchear la textura **no se pudo**: los islotes UV del atlas de 4096² se pisan
entre sí, así que pintar por posición 3D tapaba un ojo y el otro no. Se
comprobó con una banda **roja** de prueba: cayó justo sobre el ojo izquierdo y
se cortó en la nariz.

Se resuelve con **geometría**, que no depende del atlas: una banda oscura que
cruza toda la cara a la altura medida de los ojos, más un tajo por boca. La
altura es firme (la banda roja lo confirmó); el z de cada ojo no se pudo medir,
así que **se eliminó el parámetro dudoso** en vez de seguir midiendo — una
banda tapa los dos ojos donde sea que estén, y encima se lee como cuenca
hundida, que es justo el efecto buscado.

Y en el juego va con un tinte gris frío encima, **luz desde abajo de la cara**
—la misma cara alumbrada de arriba es una persona y alumbrada de abajo es otra
cosa— y, cazando, se encorva 0,20 rad más.

## Los assets ya no van embebidos: se bajan en paralelo

El juego era **un HTML de 7,1 MB** con todo adentro como data URL: las
texturas, los doce muebles, la langosta, los cuadros y el menú. El teléfono
tiene que bajarlo entero —más el tercio que agrega base64— antes de pintar el
primer píxel, y no hay forma de mostrar progreso: o está el HTML o no está.

Ahora los archivos viven en el repo y los sirve **jsDelivr**, que sirve
cualquier repo público de GitHub.

**7,12 MB → 0,68 MB de HTML**, más 4,84 MB de assets que se bajan aparte.

### Se fija a un COMMIT, no a la rama

jsDelivr cachea una rama **doce horas**. Apuntando a la rama, cambiar un
mueble no se vería hasta el día siguiente. Con el sha, cada build pide
exactamente los archivos de ese commit y la caché juega a favor.

Eso obliga a un orden: **los assets tienen que estar commiteados antes de
buildear**. `build.py` avisa por consola si hay cambios sin commitear en
`dungeon/`.

### El progreso se mide en bytes, no en archivos

`src/carga.js` pide todo de a ocho a la vez y lee el progreso del cuerpo de la
respuesta con un reader. Contando archivos terminados, con doce archivos de
tamaños muy distintos, la barra salta de 30 a 70 y se queda.

Lo bajado se guarda como **blob** y se reemplaza la URL por la del blob: si no,
three vuelve a pedir el archivo al armar la escena. Iría a la caché, pero eso
depende de las cabeceras y no quiero depender de eso.

### Y si no baja, se juega igual

Cada archivo que falla se saltea, la barra igual llega al final y el menú dice
cuántos faltaron. **Probado apuntando a una carpeta que no existe: los 26
fallan, el juego arranca igual** —las noventa arañas, el mapa y las paredes con
sus colores de reserva— y no se rompe nada.

Medido contra un servidor local: **26 de 26 en 187 ms**, la barra en 100 % con
el texto en MB, y el `src` del logo es un `blob:` — o sea que el intercambio
funcionó y nada se pide dos veces.

**El costo:** hace falta internet la primera vez. `python3 build.py salida.html
--embebido` vuelve a generar el archivo autocontenido de siempre.

## El arranque: el cajón, el hueco y la caída

En el original no aparecés en la casa: aparecés **arriba**, en un cajón de
madera oscuro, caminás hacia adelante, hay un hueco en el piso y te dejás caer.
Recién ahí empieza la casa.

Acá es lo mismo. El cajón flota a **16,5 m** sobre el vestíbulo, con su lámpara
y el agujero al fondo. Al pisarlo te soltás y **la caída es gravedad de
verdad** (19 m/s²), no una interpolación: interpolada dura lo mismo desde
cualquier altura y se lee como un ascensor. Mientras caés pasan **nubes** —
carteles con un degradado radial dibujado en un canvas, difuminadas a propósito
porque a veinte metros por segundo un borde nítido delata el cartel— y suena el
viento, que sube con la velocidad. Al tocar el piso hay golpe y sacudón.

## El menú

Con la forma del de Roblox: el título arriba, el botón grande en el medio, y el
bicho **recortado** a los dos costados mirando hacia adentro.

- **El logo** se generó y dice *THE HOUSE OF THE LOCUST* en letras agrietadas
  que chorrean. Costó tres intentos: los generadores escriben *LOCUT*.
- **Los recortes del bicho salen del propio juego**: se renderizó el modelo
  contra un fondo magenta con el resto de la escena apagada, y se recortó por
  croma. No es una ilustración parecida, es la criatura que te va a matar.
- **El fondo son dos capturas del mapa**, difuminadas y cruzándose cada
  diecisiete segundos, con viñeta encima.
- El botón **JUGAR** no aparece hasta que los muebles terminaron de entrar: si
  te deja empezar antes, el primer cuarto se puebla delante tuyo.

Los seis archivos del menú pesan **328 KB**.

Y el final es la palabra **GANASTE** generada igual —agrietada, chorreando— con
un resplandor verde y el HUD apagado.

## El audio, todo sintetizado

No hay un solo mp3. El menú es un colchón grave en la menor con un arpegio
lento y **desafinado a propósito** —afinado suena a menú de app—. El final son
cuatro acordes que suben con el bajo sostenido debajo y un platillo de ruido en
cada uno. El viento de la caída es ruido rosa filtrado que sube con la
velocidad, y el golpe de la embestida es un seno que se desploma de 150 a 34 Hz
con un chasquido arriba.

Un mp3 de menú son 700 KB para algo que son cuatro notas y un colchón.

## Que se vea sin arruinarlo

Tercera vuelta con *"el monstruo es invisible"*, y la primera en la que el
diagnóstico salió de medir.

Las dos causas anteriores fueron otras: el emisivo primero, y después el
empaquetador que buscaba el modelo en la carpeta equivocada. Con el archivo ya
cargando quedó a la vista la de verdad: **el bicho es pálido y la casa nueva
tiene dos salas enteras de yeso blanco**. Contra una pared de yeso a siete
metros, el bicho y la pared daban el mismo brillo.

Y el primer arreglo fue peor que el problema: teñirlo plano —cuerpo gris
oscuro, cara clara, sin mapa de textura— lo dejó de plastilina. **La textura es
todo lo que el modelo tiene de bueno**: la cara tallada, los brazos vendados,
los pantalones negros, los zancos. Dos formas de arruinarla:

1. **un emisivo constante** le suma el mismo gris a cada píxel, así que la cara
   tallada y el pantalón negro terminan igual de claros;
2. **anular el mapa** directamente, que es lo que hice.

Lo que quedó:

- **el color en blanco**: la textura tal como está pintada;
- **`emissiveMap` = el mapa**, con un emisivo gris de fondo. El piso de brillo
  *sigue* la textura en vez de inundarla: lo claro brilla un poco, lo negro
  sigue negro, el relieve se conserva y en un pasillo apagado igual se lee;
- **un contorno**: una copia agrandada un 6 % con las caras dadas vuelta, en
  negro. Es lo único que da contraste contra el yeso blanco, y **no toca la
  textura**.

Para poder darle contorno hubo que arreglar algo del rig: **todos los huesos
compartían el material de la malla original**. Ahora cada hueso clona el suyo.

Medido con dos capturas idénticas, una con la malla y otra sin ella, restadas:

| dónde | la silueta tapa un fondo de | y lo baja a | diferencia |
|---|---|---|---|
| pared de yeso blanco, 7 m | 138 | 88 | **50 niveles** |
| pasillo iluminado, 7 m | 167 | 125 | **42 niveles** |
| pasillo con las arañas apagadas | 143 | 68 | **76 niveles** |

Y donde hace falta hace lo contrario: las partes claras suben de 73 a 125
contra el yeso, y de 40 a 104 en el pasillo a oscuras. Contra el 13 % de
contraste de la primera vez, ahora se ve en las tres situaciones **y sigue
siendo el modelo que era**.

En la embestida el contorno **se apaga** —a sesenta centímetros la silueta
negra se comía la cara— y el rojo se aplica **multiplicando** la textura, no
reemplazándola: la cara tiene que seguir tallada, roja pero tallada.

## La embestida

Cuando te agarra, el juego original hace esto —sacado de mirar el momento del
contacto cuadro por cuadro y de la captura que mandó el jugador
(`referencia/embestida-original.png`)—:

1. el contacto es **instantáneo y mata**: no hay vida ni forcejeo;
2. la cámara **no se suelta** — sigue siendo primera persona, se ve la mira en
   el medio de la cara;
3. la cara **llena el cuadro entero**, iluminada de **rojo sangre**, con las
   cuencas negras, sobre fondo completamente negro;
4. la cámara tiembla fuerte y el campo se cierra de golpe;
5. chillido **más un golpe grave**, y recién después la pantalla a negro;
6. reaparecés lejos y el bicho vuelve a rondar.

Cómo está hecho:

- **La cara se planta sobre el rayo de la cámara**, no en un punto del mundo.
  Se calcula el vector hacia adelante desde el giro y la inclinación y se pone
  la cabeza ahí, así llena el cuadro mires a donde mires. Se acerca de 95 a
  62 cm mientras dura. Más cerca la cara le pasa por adentro a la cámara y se
  ven los polígonos de atrás: deja de ser una cara y es un error.
- La raíz del bicho se baja `ALTO_BICHO × 0,9257`, que es dónde tiene los ojos
  medidos sobre el rig. El cuerpo queda colgando abajo del piso y no se ve.
- **El fondo negro no se pinta: se cierra la niebla a metro y medio.** Todo lo
  que no es la cara queda del color de la niebla, que ya es casi negro, y la
  cara —que está a 60 cm— se salva. Es una línea y sale gratis. Los valores
  previos se guardan y se devuelven, porque el menú de gráficos también toca
  la niebla.
- **La cara se tiñe de rojo cambiando el material**, no sólo con una luz. La
  malla lleva un emisivo claro —el que la hace visible en un pasillo negro— y
  ese emisivo gana siempre: con una luz roja encima la cara salía **rosa**.
- El temblor de cámara es **otro**: cuatro veces más grande y más rápido que el
  de verlo a lo lejos, y el FOV se cierra 18°.
- **Se apaga el HUD entero** y aparece la mira. Joystick, botones, tareas e
  inventario encima de la cara arruinan el único cuadro que importa.
- Audio: el chillido que ya estaba **más un golpe grave** nuevo —un seno que se
  desploma de 150 a 34 Hz con un chasquido arriba—. El chillido solo se lee
  como un efecto; el golpe se lee como un cuerpo.

Y de paso apareció el bug de verdad detrás de *"la langosta ni siquiera se ve,
te mata pero es invisible"*: **el empaquetador buscaba el modelo en la carpeta
equivocada**. Cuando se agregaron los muebles de alta, `MUE_DIR` pasó a apuntar
a `muebles/hd/`, y la línea del bicho usaba esa misma variable — pero la
langosta vive en `muebles/`. Desde ese día el juego salía **sin el bicho**: te
mataba algo que nunca se había cargado.

En su momento eso se diagnosticó como falta de contraste y se le subió el
emisivo. El emisivo estaba bien; lo que faltaba era el archivo. Ahora el
empaquetador mira `muebles/` primero y avisa por consola si no lo encuentra,
que es lo que tendría que haber hecho desde el principio.

Medido después de la embestida: `embestida` vuelve a `null`, el bicho vuelve a
`ronda`, **la niebla vuelve exactamente a los valores que tenía**, el jugador
aparece a 93,7 m y la clase del HUD se saca sola.

## La casa nueva: una planta, paredes finas, sectores grandes

El mapa anterior tenía tres laberintos apilados de 31×31 donde **la pared
ocupaba una celda entera: 2,20 m de espesor**. Por eso las salas parecían
búnkers y los pasillos túneles, y por eso había toda una familia de bugs de
pisos falsos: había que adivinar en cuál de las tres grillas estabas.

Se rehizo desde cero contra las capturas nuevas:

- **una sola planta**, como el juego original, que es un *single-stage nest*;
- la pared es un **tabique de 22 cm** que vive en el **borde** entre dos
  celdas, no en la celda;
- el piso se reparte en **sectores**: nueve salas de 24 a 31 m de lado y
  cuatro pasillos de 7,2 m de ancho que las cosen;
- entre dos sectores hay tabique y el tabique se abre en **puertas**; entre
  dos pasillos no hay nada, así que los cuatro pasillos son un solo espacio.

Es la casa de algo que mide tres metros y pico: los cuartos tienen que dejarlo
pasar. Son **6964 m² de casa**, 1209 celdas de piso, 302 tabiques, 56 puertas
y 14 gateras.

### El tabique se emite en dos caras

Cada tabique sale como **dos lozas de medio espesor**, una por cara, con el
tema del sector que tiene enfrente. Por eso desde el pasillo ves papel damasco
y desde la sala blanca ves yeso, y en la esquina se ve el encuentro yeso/papel
que sale en la foto del crucifijo. Con una caja sola eso no se puede.

### La bóveda de cañón

El pasillo del original **no tiene techo plano**: tiene un túnel de tabla clara
que arranca a 2,95 m y sube 1,50 m más en el eje. Se construye como una tira de
arco extruida a lo largo del tramo, con una **costilla de madera** en cada
punta que tapa la junta donde un pasillo cruza al otro.

Los tramos se emiten sólo donde el sector **todavía posee** sus celdas: en los
cruces el pasillo horizontal se quedó con ellas, así que el vertical corta ahí
y la bóveda que cruza es una sola.

### Las ruedas de sombra

Es la firma visual del juego y costó dos cosas:

1. **La luz va 75 cm DEBAJO del aro**, no pegada a él. Pegada, la luz sale casi
   en el plano de la rueda, la rueda no tapa nada hacia arriba y el techo queda
   limpio. A 75 cm, la rueda se proyecta contra el techo aumentada unas tres
   veces.
2. **El techo tiene que recibir sombra.** Estaba en `receiveShadow = false` y
   por eso el techo salía parejo por más que las luces proyectaran.

Además la cámara de sombra del *point light* llega por defecto a 500 m: con un
mapa de 512 eso deja varios centímetros por texel y un aro de 3,5 cm no
proyecta nada. Recortada a 13 m, aparece.

Y las arañas **cuelgan bajo** (1,15–1,45 m). Pegadas al techo queman un disco
blanco encima y no se ve nada.

### Culling de luces

La casa tiene **noventa arañas** y three evalúa TODAS las luces en cada
fragmento: con noventa *point lights* no dibuja ni un cuadro. Quedan
encendidas las **N más cercanas** —6 en bajo, 10 en medio, 14 en alto, 18 en
ultra— y el número es **fijo**: si cambia, three recompila el shader y el juego
pega un tirón cada vez.

### Los sectores

```
vestíbulo · sala blanca · biblioteca
comedor   · galería     · capilla
depósito  · taller      · salida
                    + los cuatro pasillos
```

| tema | qué lo hace |
|---|---|
| `pasillo` | damasco, zócalo y marco de madera, bóveda de cañón |
| `salon` | yeso blanco con tachas, piso de baldosa, dos columnas, las tres baldosas |
| `libros` | estanterías de pared a pared, una vitrina cada cinco |
| `reloj` | el reloj de pie, el piano, el sofá, la cómoda, la vitrina |
| `capilla` | bancos de iglesia en filas con pasillo al medio, el crucifijo |
| `deposito` | pilas de cajones y tablones de contrachapado apoyados |
| `cocina` | mesas largas con las sillas de los dos lados |
| `taller` | hormigón, columnas, sin marcos de madera |
| `salida` | blanco, la doble puerta gris con el cartel |

### Los props nuevos

Cuatro más, generados de a uno y horneados como los otros ocho: **piano**
(1,28 m), **banco de iglesia** (0,98 m), **mesa larga** (0,78 m) y **vitrina**
(2,05 m, se revisa buscando la llave). Los doce juntos pesan 4,1 MB.

Y los que no son mallas: los **cajones de listones**, el **tablón de
contrachapado** apoyado contra la pared, las **columnas** y el **crucifijo**,
todos armados con geometría.

### Los cuadros

Los retratos de las paredes son **dibujos generados**: cuatro bocetos a lápiz
sobre papel viejo —una cara de ojos enormes, una mujer de ojos hundidos, la
figura de patas largas en el umbral, y una casa cuyas ventanas forman una
sonrisa—, recortados a 256×341. Los cuatro pesan 52 KB.

### Los botones

Los controles táctiles se rehicieron con el aspecto del original en el celular:
**círculos grandes translúcidos, texto blanco sin adornos y sin bordes finos**.
Chicos y con letra espaciada no se leían de un vistazo y encima no se acertaban
con el pulgar en movimiento.

### Medido

- **1209 celdas de piso, 1209 alcanzables** cruzando puertas
- **0 celdas de piso desde las que haga falta un rescate**
- 12 modelos de mueble, 213 sólidos, 55 muebles revisables
- los tres cubos en biblioteca, depósito y capilla; las tres baldosas en la
  sala blanca; la puerta en la salida
- la cadena entera llega a `escapo`

## El mapa, mirado foto por foto

El mapa era un laberinto generado con cinco rectángulos anónimos por nivel.
Todos los cuartos se veían igual y el juego era un pasillo verde infinito. Se
rehizo mirando **todo el material que existe del original**: las dos capturas
oficiales de la página de Roblox (universo `10530261598`), seis capturas de
partida sacadas del walkthrough de allthings.how, y dos análisis
escena-por-escena de dos gameplays completos de YouTube. Las seis capturas
quedaron en `referencia/mapa-*.png` para poder comparar.

Lo que las fotos dicen, y que el mapa NO tenía:

| En la foto | Antes | Ahora |
|---|---|---|
| alfombra roja tejida | piso de madera | textura de alfombra dibujada en canvas |
| zócalo **naranja** bajo | zócalo crema de 1,12 m + moldura | zócalo naranja de 36 cm |
| marco naranja en cada puerta | no había | jambas + dintel en cada entrada |
| puertas con pared arriba | huecos de piso a techo | dintel a 2,78 m |
| casetón oscuro con la araña | techo plano | panel oscuro + borde crema |
| arañas doradas | hierro negro | bronce |
| frases pintadas en la pared | no había | cuatro por nivel, negras |
| yeso blanco con tachas | papel verde en todos lados | la sala de las baldosas y la salida |
| hormigón y columnas | papel verde | el sótano |
| cajones apilados | no había | el depósito y el desván |
| doble puerta gris + cartel EXIT | una hoja verde | dos hojas, barral y cartel |
| bloques de un metro que brillan | dados de 34 cm | 1,05 m, con luz propia |

### Las salas ahora tienen nombre

`SALAS` en `map.js` es una lista escrita a mano: dieciocho salas con `id`,
`nombre` y **`tema`**, y el tema decide el papel, el piso, la luz y los muebles.
Los rectángulos se recortan **después** de rotar la grilla, así que sus
coordenadas son las mismas que usa todo el resto del juego.

```
planta baja  vestíbulo · sala blanca (baldosas) · salón (reloj) · biblioteca
             depósito · comedor · cuarto · salida
nivel alto   galería · capilla · desván · estudio · costurero
cisternas    cisterna · calderas · bodega · pozo · cruce
```

- **biblioteca** — estanterías contra las cuatro paredes, como la foto del cubo rojo
- **sala blanca** — vacía, yeso con tachas, las tres baldosas en fila
- **salón** — el reloj de pie, el sofá y la cómoda
- **capilla** — dos filas de sillas con pasillo al medio y el crucifijo
- **depósito** — pilas de dos y tres cajones de listones contra las paredes
- **sótano** — hormigón, columnas, sin marcos de madera
- **salida** — blanca, la doble puerta gris con el cartel verde

Los tres cubos ya no caen en celdas al azar: uno por sala con nombre
(biblioteca, depósito, cuarto), en un rincón y no en el centro —el centro es
por donde entrás y donde va el mueble grande.

### Las escaleras se corrieron

Las cuatro escaleras estaban escritas a mano y **tres de las cuatro pasaban por
adentro de las salas nuevas**: una subía por el medio de la capilla dejando una
baranda cruzando el cuarto, otra desembocaba dentro de la sala de la salida. Se
barrió la grilla buscando rectángulos que no pisen ninguna sala de **ninguno de
los dos niveles** que conecta cada escalera, y se eligió uno por cuadrante.

Medido después del cambio:

- **1703 celdas abiertas de los tres niveles, 100 % alcanzables**; las
  dieciocho salas, enteras
- **1535 celdas de piso barridas: peor caída 0,00 m** (antes 0,49)
- **799 celdas sólidas: 0 sin salida**
- la cadena entera —tres cubos, pinza, cableado, tarjeta, llave, puerta— llega
  a `escapo`

## Los muebles: uno por uno, y ordenados

Los ocho props estaban deformes porque salían con **934–2191 triángulos**: a
esa cuenta una estantería pierde los estantes y queda un bloque con manchas.
Se regeneraron **de a uno**, cada uno con su propia descripción y con
`face_limit: 20000`, y se hornearon con `--simplify-error 0.0004` y textura de
1024. Resultado medido:

| Mueble | Antes | Ahora |
|---|---|---|
| armario | 1876 | 15 402 |
| cómoda | 1204 | 12 690 |
| estantería | 2191 | 17 596 |
| reloj | 1522 | 14 118 |
| sofá | 1840 | 16 244 |
| mesa | 934 | 8 874 |
| silla | 1108 | 10 366 |
| sillón | 1690 | 15 030 |

2,7 MB los ocho. Cada uno se verificó con una hoja de contacto de cuatro
vistas antes de aceptarlo, y los ocho miran a **+X** (Tripo normaliza así), que
es lo que asume `miraHacia(dx,dz) = atan2(-dz, dx)`.

**Y ahora están ordenados.** Antes cada mueble caía en una celda al azar con un
ángulo al azar, y un cuarto con tres sillas apuntando a tres lados distintos se
lee como escombro, no como una casa. `poblar()` ahora:

- redondea todos los ángulos a los cuatro de la grilla;
- camina las piezas de pared **en orden de mapa** y pone una cada cuatro
  lugares válidos, pegada a la pared y mirando al cuarto;
- arma juegos de **mesa + sillas** alrededor de la mesa;
- pone los sillones **de a dos, enfrentados**;
- apoya los sofás contra la pared.

## Los pisos falsos: se fueron con las escaleras

Te caías por el piso donde había una escalera debajo, porque una escalera
marcaba sus celdas **en los tres niveles** y `surfaceAt` daba prioridad a la
rampa. Se arregló midiendo (peor caída 0,49 m → 0,00), y después **el problema
desapareció solo**: la casa nueva es una planta, el piso es cero y no hay nada
que adivinar.

## El cuerpo: R15, con rodillas

**El R6 estricto NO tiene rodillas ni codos** — son seis partes rígidas y eso
es justo lo que lo define. Lo que se ve en el juego original, y lo que Roblox
usa por defecto desde hace años, es **R15**: quince partes, con rodilla, codo,
muñeca, cintura y cuello. Por eso las piernas se doblan al correr.

Las quince:

```
Cabeza · TorsoAlto · TorsoBajo
BrazoAlto · BrazoBajo · Mano        (×2)
PiernaAlta · PiernaBaja · Pie       (×2)
```

Medidas del rig por defecto, en **studs**. La documentación pública de Roblox
da **rangos** y no un número fijo —las proporciones cambian con el tipo de
cuerpo—, así que estas son las del rig en bloques del Rig Builder:

| pieza | studs |
|---|---|
| TorsoAlto | 2 × 1,6 × 1 |
| TorsoBajo | 2 × 0,4 × 1 |
| BrazoAlto · BrazoBajo | 1 × 1,2 × 1 |
| Mano · Pie | 1 × 0,4 × 1 |
| PiernaAlta · PiernaBaja | 1 × 1,2 × 1 |
| Cabeza | 2 × 1 × 1 con malla 1,25 |

Alto = piernas 2,8 + torso 2,0 + cabeza 1,0 = **5,8 studs**, que es por qué un
R15 es más alto que un R6 (5).

### Las animaciones son las de Roblox, sacadas del asset

No están a ojo ni copiadas de una foto. Se bajaron los **assets de las
animaciones por defecto** desde `assetdelivery.roblox.com`, se parseó el
formato binario `.rbxm` y se sacaron los ángulos de cada articulación en cada
keyframe.

| animación | asset | cuadros |
|---|---|---|
| correr | 913376220 | 16 a 24 fps · 0,667 s |
| caminar | 913402848 | 25 |
| quieto | 507766951 | 48 |
| saltar | 507765000 | 27 |
| caer | 507767968 | 19 |
| trepar | 507765644 | 25 |

Parsear el `.rbxm` no es abrir un JSON. Es un formato binario con trozos
`INST` / `PROP` / `PRNT`, los arreglos van **intercalados** —primero todos los
bytes 0 de cada número, después todos los 1— los enteros van en zigzag y
acumulativos, los float tienen **el bit de signo rotado al final**, y el
`CFrame` mezcla dos formatos en el mismo tipo: un byte de id por elemento, la
matriz cruda sólo para los que dan 0, y recién después las posiciones, esas sí
intercaladas. Está todo en `herramientas/rbxm.py`.

**Y me corrigió dos cosas que yo había estimado mirando una foto quieta:**

| | lo que yo tenía | lo que dice el asset |
|---|---|---|
| rodilla al correr | −1,35 (77°) | **−2,52 (144°)** |
| cadera | seno simétrico ±1,05 | **+1,24 adelante / −0,34 atrás** |
| codo | se estiraba a −0,42 | **nunca baja de +0,95** |

La rodilla se dobla casi el doble de lo que yo creía, la cadera es
**asimétrica** —tira mucho más hacia adelante que hacia atrás— y el codo no se
estira **nunca** en todo el ciclo.

La fase avanza con la velocidad y no con el tiempo, así el pie no patina: el
ciclo real cubre unos 4,4 m.

**Los brazos van amortiguados y las piernas no.** El clip real levanta el
antebrazo hasta 1,90 rad —la mano a la altura del pecho—, y visto desde una
cámara puesta en la cabeza eso tapa media pantalla. Roblox lo resuelve
escondiendo el personaje entero en primera persona; acá se bajan el hombro a
0,72 y el codo a 0,40, y las piernas quedan **clavadas al clip**.

### Cada parte con su color y su contorno

En la referencia cada pieza tiene su color y una **línea negra alrededor**. Sin
eso —y así estaba— el cuerpo entero era una mancha del mismo tono: al correr
no se distinguía una pierna del torso y parecía que no se movía nada.

Ahora: camisa gris, **jean azul**, piel en antebrazos y manos, **zapatillas
rojas con suela clara**. Y contorno con el truco viejo de la tinta — una copia
de cada pieza apenas más grande, dibujada por dentro.

### Los estados de animación

Un paquete de animación de Roblox trae **siete**: Run, Walk, Fall, Jump, Idle,
Swim y Climb. El script `Animate` agrega encima **dos idles** —uno quieto y
otro de *mirar alrededor* que salta cada tanto—, sentarse y las poses de
herramienta. Acá están los que este juego usa de verdad más los propios:

| estado | qué hace |
|---|---|
| **idle** | respira: los hombros se mecen 0,035 rad |
| **idle 2** | cada 9–15 s mira alrededor — es lo que separa un idle de una estatua |
| **walk** | brazos 0,55 / piernas 0,50, con rebote de 6 cm |
| **run** | brazos 0,85 / piernas 0,75, rebote 10 cm y torso inclinado |
| **fall** | brazos arriba y abiertos, piernas sueltas |
| **crouch** | caderas a 0,85, brazos pegados, torso adelante |
| **slide** | piernas al frente, brazos atrás, torso tirado |
| **push** | los dos brazos al frente, a la altura del cubo |

Los estados **se mezclan**, no saltan: interpolan a 13/s. Un R6 que cambia de
pose de un cuadro al otro se ve como un glitch.

### La cabeza no se dibuja

El ojo está adentro de ella, así que al caminar se le veía la nuca por dentro
y al mirar para abajo tapaba medio cuadro. Roblox esconde el personaje entero
en primera persona por esto mismo; acá se esconde sólo la cabeza y el cuerpo
queda.

## Los tres bugs que trababan el juego

**Paredes que se atravesaban y pisos por los que se caía.** El salto entre
niveles se interpolaba, y mientras interpolabas `levelAt(y)` ya devolvía el
otro nivel: la colisión usaba la grilla equivocada. Ahora el salto grande es
**de golpe** y sólo se suaviza el escalón chico de una escalera.

**Quedarse trabado.** Los muebles chocaban *después* de las paredes, así que
el mueble te empujaba dentro de una pared, la pared te devolvía al mueble y
rebotabas entre los dos. Ahora los muebles van **primero** y la pared tiene la
última palabra. Encima hay una red: si igual quedaste dentro de algo sólido,
`rescatar()` te saca a la celda abierta más cercana. **Barrido de las 271
celdas sólidas del nivel: 0 sin salida.**

**El botón de deslizar parecía roto.** Pedía ir corriendo, y en el celular eso
significa empujar el joystick pasado el 70%: el que lo tocaba caminando no
veía pasar nada. Ahora **alcanza con estar moviéndose**. Y los botones
táctiles aparecen con la media query **y también** con una clase que el juego
pone apenas ve un dedo — había teléfonos donde la media query no daba y el
jugador se quedaba sin joystick, sin USAR y sin DESLIZAR.

## El menú de gráficos

El engranaje arriba a la derecha, con los **fps** al lado. Cuatro niveles, y
la elección **se guarda en el navegador**.

Arranca en **medio** y no en alto a propósito: más vale que el primer minuto
vaya fluido y que suba el que quiera.

| | resolución | sombras | faroles que proyectan | pisos dibujados | niebla | contorno |
|---|---|---|---|---|---|---|
| **Bajo** | ×0,55 | **no** | 0 | sólo el tuyo | 34 m | no |
| **Medio** | ×0,85 | 512 | 1 | 2 | 46 m | sí |
| **Alto** | ×1,3 | 1024 | 3 | 3 | 52 m | sí |
| **Ultra** | ×2 | 2048 | 5 | 3 | 64 m | sí |

Toca lo que **de verdad** cuesta, en orden de cuánto pesa:

1. **La resolución.** Es la palanca más grande y la más barata: de ×2 a ×0,55
   son **trece veces menos píxeles** que sombrear.
2. **Las sombras.** Una luz puntual con sombra cuesta **seis pases de render**
   —uno por cara del cubo—, así que cada farol que proyecta es como dibujar la
   escena seis veces más. Por eso el nivel no cambia sólo la resolución del
   mapa de sombras: cambia **cuántos faroles proyectan**.
3. **Cuántos niveles se dibujan.** El mapa son tres laberintos enteros; en bajo
   se dibuja sólo en el que estás.
4. **El contorno del cuerpo**, que duplica sus mallas.

La resolución se limita al `devicePixelRatio` real: pedir ×2 en una pantalla
que es ×1 es dibujar cuatro veces de gusto.

Dos cosas que hubo que resolver:

- **Prender y apagar sombras obliga a recompilar los materiales.** Sin marcar
  `needsUpdate` en todos, el shader viejo sigue puesto y el botón no hace nada.
- **El menú se crea último en el constructor.** Aplica los ajustes apenas
  nace, y creándolo antes los valores por defecto de más abajo se los pisaban:
  arrancaba en medio pero con los tres faroles de alto proyectando. Medido y
  corregido.

Con el menú abierto el dedo no mueve la cámara ni el joystick.

## Las paredes se miden en vivo

No son constantes del generador: **se miden desde donde estás parado, cada
cuadro**, caminando la grilla celda por celda en las cuatro direcciones hasta
chocar. Así el juego sabe de verdad si está en un pasillo o en el medio de una
sala, y no porque alguien lo escribió en una tabla.

El hueco de 62 cm cuenta como pared: para medir el espacio en el que te movés,
un agujero por el que sólo pasás agachado no es una salida.

Y se usa para algo: **en un pasillo angosto el FOV se cierra 7°** y el balanceo
de la cámara se achica a la mitad. Un pasillo de 2,2 m con el mismo campo que
una sala de 11 se lee como un tubo de ojo de pez.

Medido en el archivo final: en un pasillo da `ancho 2,20 · largo 6,60 ·
encajonado 1,00 · sala false`; en la sala de las baldosas, `ancho 37,4 · largo
8,80 · encajonado 0,00 · sala true`.

```js
window.__DUNGEON.espacio   // ancho, largo, encajonado, sala
```

## Sin barra de aguante

Se corre todo lo que uno quiera. El límite del juego es el **ruido** —correr
lo trae— y no una barra que se vacía. El botón **DESLIZAR** se enciende
siempre que estés corriendo, que ahora es siempre que quieras.

## La luz

El pedido era que no esté todo tan apagado. Se midió el brillo medio de la
imagen en vez de mirarla de reojo:

| | brillo medio | quemado |
|---|---|---|
| antes | 55,6 | 0 % |
| primer intento | 199 | **28 %** |
| ahora | 49 – 100 | **0 %** |

Dos cosas que arreglaron el quemado:

- **El farol va a altura fija sobre el piso** (72 cm), no pegado al ojo.
  Pegado al ojo, agachado o deslizando quedaba a 30 cm del suelo y lo
  reventaba en blanco.
- **Caída 1,2 y no 1,55.** Con la caída fuerte, a treinta centímetros de una
  pared el farol la quemaba. Aplanando la curva, a dos metros alumbra casi lo
  mismo y de cerca pega menos de la mitad.

El resto sube parejo: hemisférica 0,85, ambiente 0,16, exposición 1,06, y la
niebla arranca a 13 m en vez de 6 — antes se comía el cuarto entero.

## Los faroles del techo

**38 en la planta baja**. La luz de cada uno va **justo debajo del aro**, así
el aro y los brazos proyectan su **sombra de rueda sobre el techo**: es el
detalle que los hace leer como lámparas y no como bolitas flotando.

Sólo **las tres más cercanas proyectan** a la vez: una luz puntual con sombra
cuesta seis pases de render, y son las únicas cuya rueda se llega a ver.

## Controles

- **WASD / flechas** moverse · **Shift** correr · **C** agacharse
- **E / Enter** usar · **Espacio / X** deslizarse (sólo corriendo)
- **R** alternar carrera automática · **Mouse** mirar (click para el puntero)
- **Táctil**: joystick abajo a la izquierda, botones **USAR**, **AGACHARSE**,
  **Alternar carrera** y **DESLIZAR** a la derecha. **Un toque en la pantalla
  sin arrastrar también es "usar"** — en táctil nadie busca un botón chico.
- El joystick arranca a correr solo pasado el **70 %** del recorrido hacia
  arriba.

## La escala sigue siendo el truco

| | |
|---|---|
| Ojo del jugador | **0,55 m** (agachado 0,34 · deslizando 0,19) |
| Alto de pared | **7 m** |
| Ancho de pasillo | **2,2 m** |
| FOV | **100** (106 corriendo, 122 deslizando) |

## El mapa

Una planta de 41×33 celdas de 2,4 m: **98 × 79 m**, 6964 m² de piso. Nueve
salas con nombre y cuatro pasillos de 7,2 m de ancho, tabiques de 22 cm en los
bordes, 56 puertas con marco y dintel, 14 gateras. Sin laberinto generado y sin
escaleras: la casa está escrita a mano en `SECTORES`.

## Archivos

```
src/map.js       la grilla, los SECTORES, los tabiques, puertas y colisión
src/main.js      motor, jugador, controles, cámara, y el armado del nivel
src/deco.js      texturas dibujadas en canvas, frases de pared, cajones, cruz
src/pantalla.js  el marco girado y la traducción de coordenadas
src/r15.js       el cuerpo de quince partes del jugador
src/animdata.js  los clips de animación de Roblox, horneados
src/muebles.js   carga, escala, orientación, colisión y reparto por tema
src/langosta.js  la misión y el bicho
src/calidad.js   el menú de gráficos
src/sonido.js    todo el audio, sintetizado
shell.html       HUD y joystick
texturas/*.webp  papel, cornisa y vetas (las demás se dibujan al arrancar)
muebles/hd/*.glb las ocho piezas horneadas en alta
cuadros/*.webp   los cuatro dibujos generados que van en los marcos
referencia/      las capturas del juego original con las que se comparó
```

### Reconstruir

```bash
cd /home/user/lemi-game/dungeon && python3 build.py salida.html
```

### Probar

```bash
bash herramientas/banco/armar.sh
cp lacasadelalangosta.html /tmp/ui/x.html
cd /tmp/ui && PAGINA=x.html MOVIL=1 bash run2.sh PLAN.json out/x.log 412 892
```

## Debug

```js
window.__DUNGEON   // posición, nivel, carrera, deslizamiento, bicho, muebles
window.__game      // el juego entero; __game.mision para la misión
```
