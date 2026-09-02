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

## La sala de las baldosas es de hormigón

En el original es lo único que rompe con los pasillos verdes, y por eso se
reconoce de lejos y funciona como punto de referencia en un laberinto. Acá se
forra por dentro con un cascarón claro: sale más barato que meterle mano al
generador del nivel y no puede romper el laberinto.

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

## El cuerpo: un R6 de verdad

**R6 son seis partes y nada más**: cabeza, torso, dos brazos y dos piernas. No
tiene codos ni rodillas — es lo que lo hace R6 y no R15, y meterle una rodilla
sería mentir.

Las medidas son las de Roblox, en **studs**:

| pieza | studs |
|---|---|
| torso | 2 × 2 × 1 |
| brazo | 1 × 2 × 1 |
| pierna | 1 × 2 × 1 |
| cabeza | 2 × 1 × 1 con la malla escalada 1,25 → **2,5 × 1,25 × 1,25** |

Alto total **5,25 studs**; el ojo va en el centro de la cabeza, a **4,625**.

Las articulaciones también son las de Roblox: **el hombro va en la esquina de
arriba y afuera del torso**, no en el centro del costado, y por eso el brazo de
un R6 cuelga pegado y gira desde el vértice. Ese detalle es medio R6.

El cuerpo se escala para que la cabeza caiga justo en el ojo del juego:
**0,216 m por stud**, o sea 1,14 m de alto. Las proporciones son exactas; el
tamaño es el de este juego.

**La animación es la del juego**: brazo derecho con pierna izquierda, todo
rígido, girando sólo en el hombro y la cadera. Medido sobre el archivo final,
corriendo: brazo I −0,84 y brazo D +0,84, pierna I +0,74 y pierna D −0,74 — o
sea contrafase perfecta, y el brazo y la pierna del mismo lado opuestos entre
sí, como corresponde.

Va **18 cm detrás del ojo**: el techo del torso le queda 13 cm abajo a la
cabeza, así que pegado ocupa un tercio de pantalla. Roblox directamente
esconde el cuerpo en primera persona por esto mismo.

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

Tres niveles de 31×31, girados 90°: **planta alta** (+8,2 m), **planta baja**
y **cisternas** (−8,2 m), con salas grandes recortadas encima del laberinto.
El laberinto se genera con un backtracker y después se rompen unas 30 paredes
sueltas: un laberinto perfecto es un árbol y te obliga a desandar todo el
tiempo.

Las celdas de la rampa están **excluidas del piso plano de cada nivel**. Los
niveles ocupan el mismo XZ, así que si la rampa y el piso son ambos
candidatos, el piso gana siempre por estar más cerca de tu altura actual — y
la escalera no sube nunca.

## Archivos

```
src/map.js       la grilla, escaleras, colisión y altura de superficie
src/main.js      motor, jugador, controles, cámara
src/pantalla.js  el marco girado y la traducción de coordenadas
src/piernas.js   el modelo de vista de las piernas
src/muebles.js   carga, escala, orientación y colisión de los muebles
src/langosta.js  la misión y el bicho
src/shell.html   HUD y joystick
muebles/*.glb    las ocho piezas horneadas
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
