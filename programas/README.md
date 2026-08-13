# Programas

Herramientas, no juegos. Mismo criterio que `juegos-pc/`: un solo HTML que se
abre y anda, sin instalar nada.

---

## Captura de movimiento (`Captura_Movimiento.html`) · beta

Se le suelta un video de una persona y devuelve la animación puesta en un modelo
3D, para exportar a Blender o a un motor. Todo pasa en el navegador: **el video
no sale de la máquina**.

Son sesenta y nueve kilobytes. El detector de huesos se baja aparte la primera
vez y queda cacheado.

### Las tres etapas
La del medio es la que decide si el resultado se ve vivo o se ve como un muñeco
con epilepsia.

**1 · Detectar.** MediaPipe Pose Landmarker devuelve treinta y tres puntos por
cuadro, en dos juegos que conviene no confundir:

| juego | qué es | para qué |
|---|---|---|
| `landmarks` | coordenadas de la imagen, de 0 a 1 | dibujar el esqueleto sobre el video |
| `worldLandmarks` | **metros**, origen entre las caderas | animar |

El video no se reproduce: se lo va posicionando cuadro por cuadro con
`currentTime` y se espera el `seeked`. Es más lento que mirarlo pasar, pero es
exacto —no se saltea ni repite cuadros— y no depende de que la máquina llegue a
tiempo.

**2 · Arreglar.** Lo que sale del detector no se puede usar tal cual:

- **Tiembla.** Un promedio corriente lo calma pero deja todo pastoso y con
  retraso. Va un **filtro de un euro**: mide qué tan rápido se mueve cada punto y
  sube el corte del filtro con la velocidad. Quieto queda firme, en movimiento no
  arrastra. Es la diferencia entre suavizado y suavizado *con* respuesta.
- **Los huesos cambian de largo.** El detector estima cada punto por separado, así
  que el antebrazo mide dieciocho centímetros en un cuadro y veintiséis en el
  siguiente. Se le fija a cada hueso su largo mediano de toda la toma y se
  reproyecta cada articulación sobre la dirección que ya tenía, de adentro hacia
  afuera. **Esto solo limpia más que cualquier filtro.**
- **No hay desplazamiento.** Como el origen son las caderas, el sujeto camina en
  el lugar para siempre. El desplazamiento se saca **al revés, de los pies**:
  cuando un pie está apoyado el mundo no se puede mover debajo de él, así que lo
  que se movió el pie es —cambiado de signo— lo que se movió el cuerpo. Un pie
  cuenta como apoyado si casi no se movió y está cerca del piso; si ninguno
  califica, se clava el más bajo, porque siempre hay uno que sostiene.

Los cuatro deslizadores son exactamente esos cuatro controles, y `CRUDO` los
apaga todos para ver de dónde se partió.

**3 · Pasar al modelo.** Cada hueso se orienta contra **su propio reposo en
mundo**, y recién al final se convierte a local dividiendo por el mundo del
padre:

- la **cadera** recibe una terna completa: el eje de una cadera a la otra, el de
  la cadera al hombro, y el producto cruz;
- el **pecho**, otra terna, la de los hombros. Entre cadera y pecho se interpolan
  las vértebras, y de ahí sale la torsión del torso, que es lo primero que se
  nota cuando falta;
- **brazos y piernas** reciben sólo el giro mínimo que lleva al hueso desde donde
  apunta en reposo hasta donde apunta ahora.

Si se hace al revés —acumulando de padre a hijo— cualquier error de la cadera se
multiplica por toda la cadena y la mano termina a un metro de donde va.

### El modelo
Trae un maniquí de fábrica con nombres de hueso al estilo Mixamo. Eso no es
decorativo: es lo que permite que el mismo código maneje un `.glb` que traiga el
usuario. Hay una tabla de alias que reconoce lo de Mixamo, Blender, VRoid, Ready
Player Me y los `Bip01` viejos; si falta algún hueso clave, lo dice y no rompe.

El modelo conserva su tamaño; lo que se escala es el desplazamiento del sujeto,
para que un personaje de dos metros no camine pasos de uno setenta.

### Exporta
- **BVH** — texto plano, lo lee Blender, Unity y medio mundo. Se escribe la
  jerarquía canónica, no la del `.glb` cargado: así el archivo lo entiende
  cualquiera. Ángulos en grados, orden `Z X Y`, que es el que espera el formato.
- **GLB** — el modelo con la animación adentro.
- **JSON** — los puntos crudos y los procesados, por si alguien quiere hacer sus
  propias cuentas.

### Verificado
Con un video de prueba de ocho segundos, cuatro poses claras, a quince cuadros
por segundo:

| qué | resultado |
|---|---|
| detección | 120 de 120 cuadros con persona |
| altura estimada del sujeto | 1,63 m (la referencia era 1,7) |
| pose de T | manos a ±0,52 m, altura 1,16 m |
| caminata | un pie a z = −0,37 y el otro a −0,06: hay zancada |
| brazos arriba | manos a 1,59 y 1,68 m, con la cabeza a 1,39 |
| sentadilla | cadera de 0,87 a 0,46 m |
| BVH | 84 canales declarados, 84 números por fila, llaves 32/32, 10.080 números, cero NaN |
| GLB | 265 KB con la animación |

### Lo que le falta a la beta
- **No hay torsión de antebrazo ni de tibia.** El giro es el mínimo que alinea el
  hueso; el roll sobre su propio eje no se estima. Se nota en las manos.
- **Los dedos no se capturan.** El detector da un punto por mano.
- **La profundidad es la que es.** Sale de una sola cámara: si el sujeto se mueve
  de frente a la lente, el eje Z es el más ruidoso de los tres.
- **Con el piso activado el personaje no salta**: siempre apoya. Se apaga con
  `PISO`, y ahí la altura queda en su mediana.
- **Una sola persona.** Si hay dos en cuadro, toma una.

### De dónde sale cada cosa
El detector viene en dos partes, y cada una de un lado a propósito:

- el **código y el WASM**, del paquete oficial `@mediapipe/tasks-vision` en npm,
  clavados a la versión 1.0.1: son veintitrés megas y **jsDelivr no sirve
  archivos de más de veinte**, así que no podrían vivir en el repositorio aunque
  uno quisiera;
- los **modelos**, de `mundo/mocap/` en este repositorio, anclados al commit,
  porque una URL de terceros que se cae deja el programa inservible y estos sí
  entran bajo el límite.

El modelo pesado, de treinta megas, queda afuera por lo mismo.

### Tres cosas que costaron encontrar
Van anotadas porque ninguna se ve mirando el código:

- **El Chromium de prueba no trae H.264.** El video mp4 no cargaba y el elemento
  no avisaba nada: se quedaba callado para siempre. De ahí salió el plazo de doce
  segundos en el cargador, que ahora le dice al usuario que su navegador no puede
  con ese códec en vez de dejar la pantalla esperando.
- **Sin peticiones Range no se puede saltar dentro de un video.** El servidor de
  pruebas era un `SimpleHTTPRequestHandler`, que no las soporta, así que
  `currentTime` se quedaba clavado en cero y el detector analizaba ciento veinte
  veces el mismo cuadro. Los cuatro momentos daban la misma pose y parecía un
  error del pase al esqueleto.
- **Dar vuelta un solo eje espeja el mundo.** El detector usa la terna de OpenCV
  —x a la derecha, y hacia abajo, z alejándose de la cámara—. Para pasar a three
  hay que invertir **y y z**, que es girar media vuelta sobre X. Invirtiendo sólo
  la y el resultado se ve bien hasta que el sujeto levanta una mano y resulta que
  es zurdo.
