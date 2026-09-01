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

## El bucle: cuatro pasos

1. **Los tres cubos** —rojo, amarillo, azul— a la baldosa de su color. **De a
   uno**: no se pueden cargar dos.
2. Con los tres puestos **baja una soga** del techo. Ahí está la **pinza**.
3. La **llave** está en **uno** de los 24 muebles que se pueden revisar, al
   azar. Hay que abrirlos.
4. La **puerta verde** pide primero la pinza y después la llave.

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

Mide **2,60 m**. Con el ojo a 55 cm eso es casi cinco veces nuestra altura:
por eso da miedo sin necesidad de una cara. Va **articulado** —caderas,
rodillas, hombros, codos— y no es una malla sola deslizándose: una figura que
se traslada sin mover las piernas se lee como un cartel, no como algo que
camina. Lleva un halo tenue encima: en un pasillo negro, sin eso aparece
arriba tuyo sin aviso, y eso no asusta, enoja.

Camina por la grilla con una búsqueda en anchura sobre 31×31, que cuesta nada
y se rehace cada medio segundo cazando y cada 1,2 s rondando.

## Los muebles

Ocho piezas generadas con **Tripo** (Rezona Lab) y horneadas: **652 KB las
ocho juntas**, entre 934 y 2.191 triángulos cada una, textura de 512 en WebP.
Una sola sin tocar pesaba 1,4 MB.

```
armario · cómoda · estantería · reloj de pie · mesa · silla · sillón · sofá
```

Dos cosas que hay que saber de lo que devuelve Tripo:

1. **Vienen normalizadas** a un cubo de lado 1. El alto real lo pone el juego,
   no el archivo: cada pieza lleva su altura en metros en `CATALOGO`.
2. **Todas miran a +X.** Se comprobó girando cada una en cuatro y mirando en
   cuál se le ve el frente — las ocho dieron lo mismo. Así que para que una
   pieza mire hacia `(dx,dz)` el giro es `atan2(-dz, dx)`, no `atan2(dz,dx)`.

Las que van contra la pared miran al centro del cuarto; las sueltas (mesas,
sillas, sofás) sólo entran donde hay 3×3 abierto, o sea en las salas. Y
**ninguna cae sobre el punto de aparición ni sus vecinas**: sin eso el juego
arrancaba con la cara adentro de un ropero.

Los muebles llegan tarde y no pasa nada: el nivel ya está armado y entran
encima. Un base64 roto cuesta una cómoda, no la pantalla.

## Las piernas al deslizarse

Son un **modelo de vista**, no geometría del mundo: se dibujan siempre encima,
sin consultar la profundidad, con material plano. Tres cosas que costaron una
vuelta cada una:

- **El signo del giro.** Girando en X, la pierna —que cuelga en −Y— va a parar
  a `(0,-cos,-sin)`: hace falta ángulo **positivo** para que salga hacia
  adelante. Con el signo al revés quedaban atrás de la cabeza.
- **El piso las tapaba.** Deslizando el ojo va a 19 cm del suelo; con la
  cadera colgando, el pie terminaba en `y = -0,14` con el piso en 0. De ahí
  el `depthTest: false`.
- **Se veían de punta.** Estiradas al frente apuntan al mismo lado que la
  cámara y quedan dos puntitos. La rodilla se dobla **fuerte** para que la
  pantorrilla **caiga** y se le vea el largo.

Y el muslo no se dibuja: naciendo a cuatro centímetros del lente salía una
cuña gris que tapaba media pantalla. Se ve de la rodilla para abajo, que es lo
que uno se ve de sí mismo.

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
