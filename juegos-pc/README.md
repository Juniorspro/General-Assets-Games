# Juegos adaptados a PC + móvil (detección automática)

Tres juegos web adaptados para funcionar **tanto en PC (teclado + mouse) como en
móvil (táctil)**, detectando la plataforma automáticamente y sin que el usuario
configure nada.

- `Color_balls_3D.html`
- `Sakura_game.html`
- `Impossible_obby_3D.html`

## Qué se agregó

**Detección de plataforma (spec):** se trata como **MÓVIL** solo si el dispositivo
tiene táctil **Y** puntero grueso (`navigator.maxTouchPoints > 0` **y**
`matchMedia('(pointer: coarse)')`). En cualquier otro caso, **PC**. Un laptop con
pantalla táctil arranca en modo PC.

**Hot-swap:** el método de entrada activo manda. El primer toque cambia a UI móvil;
mover el mouse o pulsar una tecla vuelve a UI de PC. Se detecta por el `pointerType`
real de los eventos (evita falsos positivos por eventos de mouse sintéticos).

**Modo PC:**
- Teclado: `WASD` / flechas para moverse, `Espacio` saltar, `E` usar/puertas, `Esc` pausa.
- Mouse para mirar/apuntar (pointer lock en las vistas en primera persona; arrastre en el obby).
- Sin joystick ni botones táctiles en pantalla.
- Pista de teclado en la pantalla de inicio + leyenda de teclas que se desvanece a los ~5 s.

**Modo móvil:** joystick virtual, botones táctiles de acción, arrastre para mirar,
horizontal forzado donde corresponde. Sin ninguna referencia a teclas.

**Textos por plataforma:** cada instrucción/pista/etiqueta se muestra según la
plataforma activa (p. ej. «Pulsa E» en PC vs «Toca» en móvil), en los idiomas que
cada juego ya soportaba (ES/EN, y PT en el del bosque).

## Notas técnicas

- Las librerías (three.js, cannon-es) se cargan desde su CDN original, igual que los
  archivos de origen. Requieren conexión a internet la primera vez.
- Cada archivo es autocontenido: se abre directamente en el navegador.
- La lógica de detección reutilizable está documentada en la skill
  `.claude/skills/deteccion-plataforma`.

---

## `Fumikiri_Crossing.html` — demo de prueba (cruce de trenes, cel-shading)

Juego de prueba en primera persona ambientado en un **paso a nivel japonés
(踏切 *fumikiri*)** con estética **cel-shading (toon)**, hecho con Three.js.
Implementa el sistema que pediste en HTML jugable:

- **Cel-shading:** `MeshToonMaterial` con rampa de luz de 3 tonos +
  **luz de borde (rim)** inyectada por shader (`onBeforeCompile`) y **contorno**
  por *inverted hull* (casco invertido extruido por normales).
- **Sistema del cruce (máquina de estados):** `ABIERTO → ¡ALERTA! (5 s) →
  CERRANDO (4 s, barreras 90°→0° con EaseInOutQuad) → TREN PASANDO → ABRIENDO
  (3 s)`, con **campana** (WebAudio) y **luces rojas parpadeantes** alternas.
  Pulsa **T** para llamar al tren; las barreras bloquean el paso cuando está cerrado.
- **Interacción en primera persona:** raycast de mira; **E** para comprar en la
  **máquina expendedora** (suena moneda, cae una lata, la recoges y suma al contador).
- **Ambiente:** dos expendedoras, postes de luz con **catenaria (cables)**, un
  **taxi retro amarillo**, señales 踏切, árboles de sakura con **pétalos** en caída
  con turbulencia, y un **tren serie E233** que cruza a ~60 km/h con *camera shake*.
- **Controles (PC):** `WASD` mover · `Espacio` saltar · **mouse** mirar (pointer lock) ·
  `E` interactuar · `T` llamar tren · `Esc` pausa.
- **Controles (móvil):** detecta el móvil automáticamente (táctil + puntero grueso) y, al
  tocar **JUGAR**, entra en **pantalla completa** y bloquea la orientación **horizontal**.
  Joystick virtual (izquierda) para moverse, arrastre (derecha) para mirar y botones
  **T (tren) · E (usar) · Salto**. El gesto «atrás» del sistema (salir de pantalla completa)
  vuelve al menú. En móvil no se usa *pointer lock* (que no existe ahí y provocaba un error).

Es autocontenido y carga three.js desde su CDN (necesita internet la primera vez).
Se abre directamente en el navegador (en PC, clic en **JUGAR** para capturar el mouse;
en móvil, toca **JUGAR** y se pone en horizontal a pantalla completa).

---

## `Liminal_VHS.html` — mundo liminal con cámara VHS y grabación limpia

Espacio liminal infinito (pasillos amarillos tipo *backrooms*) en primera persona,
filmado con una **cámara de camcorder emulada**: ojo de pez, VHS y fallos de cinta.

### La cadena de señal (por qué se ve "real")
El realismo no viene de un filtro encima, sino de emular cómo degrada la señal una cinta:

- **Croma bajo (color-under).** El VHS guarda la **luma a ~3 MHz** pero el **croma a ~0.4 MHz**.
  Por eso se trabaja en **YIQ**: la luma se mantiene casi nítida y los canales **I/Q se
  arrastran hacia la derecha** (sentido del barrido) sobre 5 muestras. Es el efecto que hace
  que los tubos fluorescentes "sangren" color a un lado.
- **Error de base de tiempo.** Cada línea de barrido se desplaza horizontalmente un poco
  (ruido por línea + una onda lenta): es lo que da el temblor característico.
- **Head switching.** La banda rota de los ~6 renglones inferiores, donde el cabezal conmuta.
- **Dropouts.** Rayas blancas cortas de pérdida de señal.
- **Ghosting.** Eco del cuadro anterior desplazado (arrastre de cabezal) → estelas al moverse.
- **Grano, scanlines, entrelazado y viñeta**, más una gradación de cinta vieja
  (negros levantados, saturación baja, tinte cálido).
- **Resolución real de 240p** escalada a pantalla. Esto es lo que más engaña al ojo:
  la falta de detalle impide juzgar si algo es CGI.

### Ojo de pez
No basta subir el FOV. Se renderiza con FOV alto y se **remapea con distorsión radial
normalizada al radio de esquina**: el centro se magnifica y los bordes se comprimen, así las
rectas se curvan como en una lente ancha **sin salirse del cuadro** ni perder imagen.

### Grabación sin los controles en pantalla
El botón **● GRABAR** usa `canvas.captureStream()` + `MediaRecorder`, es decir **captura solo
el lienzo**. El joystick, los botones y los chips son **elementos DOM que viven por encima del
canvas**, así que por definición **no entran en el video**. El OSD de cámara (● REC, contador
de cinta, fecha y hora) sí se dibuja *dentro* del lienzo, por lo que sí queda grabado, como en
una cinta real. El audio (zumbido de fluorescente, tono de sala, siseo, pasos) se mezcla al
video con un `MediaStreamDestination`. Al terminar se puede **descargar** o **compartir**
(`navigator.share`, útil para subirlo a TikTok desde el móvil).

### Contenido y controles
- Planta generada por celdas con hash determinista: pasillos infinitos que se reconstruyen
  alrededor del jugador. A veces **la planta cambia detrás de ti**.
- Una **figura** aparece a lo lejos y desaparece si te acercas o dejas de mirarla; al hacerlo
  dispara un fallo de cinta y **la fecha del OSD se corrompe**.
- Parpadeos de fluorescente, ráfagas de glitch y bamboleo de cámara en mano.
- Tres cintas seleccionables: **VHS-C**, **HANDYCAM** (más ojo de pez, menos ruido) y
  **CORRUPTO** (192p, mucho fallo).
- **PC:** `WASD` mover · `Shift` correr · mouse mirar · `R` grabar · `C` cambiar cinta · `Esc` salir.
- **Móvil:** joystick, arrastre para mirar, botón de correr; entra en pantalla completa horizontal.

---

## `Patio_Trasero.html` — el patio de la casa enorme

Misma cámara de camcorder (ojo de pez + VHS + grabación limpia) que `Liminal_VHS.html`,
pero en exteriores: apareces en el **patio trasero de una casa gigantesca**, al atardecer y
encapotado. El patio mide **215 metros** y termina en alguna parte. Al fondo hay **algo muy
alto que solo está ahí, quieto**.

### Texturas generadas con Higgsfield
Todo el material fotográfico está **generado con Higgsfield** (`nano_banana_pro`) e
**incrustado en el propio HTML como data URI**, así que el archivo sigue siendo autocontenido
y funciona sin conexión a los assets:

- césped descuidado, losas de hormigón agrietado, tablas de valla envejecidas, seto,
  revestimiento de madera pintada de la casa y tejas asfálticas — todas pedidas como
  **texturas seamless tileables** con iluminación plana;
- un **cielo encapotado de atardecer**, recompuesto en un canvas con un degradado que lo funde
  con el color de la niebla, para que el horizonte no corte con una banda dura;
- la **cara de la entidad**: una máscara pálida y demacrada con ojos hundidos y pelo enmarañado,
  a la que se le calcula el **canal alfa a partir de la luminancia** para que el fondo negro
  desaparezca y solo quede la cara y el pelo.

### La entidad
Construida con geometría (zancos larguísimos que se afilan, cadera acampanada, columna fina,
brazos largos y quebrados) en negro mate, ~21 m de alto, con la cara generada como *billboard*
que **siempre te mira**. Solo respira, muy despacio. Conforme te acercas:

- sube un **zumbido subgrave** (dos senoidales a 41 y 57 Hz),
- el **temblor de la cinta se multiplica**,
- y el **año del OSD se corrompe** (la cinta recuerda mal la fecha).

Con la niebla calibrada, desde la casa no se ve nada; a ~70 m es una mancha alta entre la
bruma; a ~35 m ya se lee la silueta; y al llegar tienes que **levantar la vista** porque no
cabe en el encuadre.

### Escena
Casa de 72 × 24 m con tejado a dos aguas, **36 ventanas** (dos encendidas) y la puerta trasera
al final del camino de losas; vallas y setos a los lados, un columpio y un cobertizo.
Los **árboles** son recortes generados con Higgsfield (uno seco y uno frondoso) montados como
*billboards* en cruz de dos planos, con el alfa sacado de la luminancia; hay cinco secos dentro
del patio y ocho frondosos detrás de la valla que sugieren bosque alrededor. Al ser solo dos
texturas + una función, se reutilizan tal cual en cualquier otro juego del repo.

### La entidad: modelo 3D generado y **riggeado**, animado por código
El personaje está **riggeado con Higgsfield** (`3d_rigging`) y sale con **24 huesos**:
caderas, dos piernas completas (muslo, rodilla, pie y punta), columna de tres tramos,
los dos hombros, brazos con antebrazo y mano, cuello y cabeza. Se le pidió una animación
**Idle** solo para confirmar que el esqueleto salía bien, y **se descartó**: en el juego
**toda la animación es procedural**.

El GLB riggeado venía a **8,9 MB**; se reempaquetó a **1,49 MB** quitando la animación,
recomprimiendo la textura (PNG de 7 MB → JPEG de 29 KB) y pasando los pesos de skinning de
float32 a byte normalizado (519 KB → 129 KB), sin tocar geometría, UVs ni esqueleto.

**Cómo se anima la sentadilla** (`poseCreature(k, aim, jerk, t)`):
- Los huesos se giran alrededor de **ejes del mundo**, no de sus ejes locales, convirtiendo el
  eje al espacio del padre. Así da igual cómo esté orientado cada hueso en el rig.
- La sentadilla pliega muslo, rodilla y la punta larga con distinta intensidad (el pliegue
  fuerte va en la punta, que es lo que le da el aire de insecto), más columna, hombros y brazos.
- Los **pies quedan clavados en el suelo**: tras posar se baja el hueso de la cadera lo que
  sobresalga la punta del pie. El factor de conversión cadera→pie **se mide en tiempo de carga**
  moviendo la cadera una unidad, porque el nodo del esqueleto trae su propia escala.
- La **cabeza** se orienta hacia ti por separado, y los tirones de «te mira» giran **solo la
  cabeza**, no el cuerpo entero.
- Respira siempre, con dos senoidales desfasadas sobre la columna.

> Para escalar el personaje hay que calcular la caja **aplicando el skinning**
> (`applyBoneTransform` sobre una muestra de vértices): la caja normal de la geometría da una
> altura falsa, porque la malla vive en otro espacio que el esqueleto.

### El modelo base
La criatura es un **modelo 3D real generado con Higgsfield** (`image_to_3d`) a partir de una
referencia hecha a medida: insecto palo erguido, torso de anillos segmentados, brazos como
látigos, patas de aguja, cara pálida de máscara y pelo de alambre — con los hilos de marioneta
incluidos. El GLB venía a 4,7 MB; se reempaquetó a **1,3 MB** conservando geometría y UVs y
recomprimiendo la textura de 2048² (3,3 MB) a 512² JPEG (**31 KB**). Se conserva el mapa para que
el cuerpo salga casi negro y **la cara, pálida**.

> Nota de montaje: el ancla de la cabeza está al **82 %** de la altura, no arriba del todo,
> porque el *bounding box* incluye los hilos de marioneta que suben por encima.

### El final
La entidad **no se ve durante el paseo**. Al cruzar el fondo del patio aparece delante de ti y
arranca una cinemática de ~10,6 s en la que pierdes el control:

1. **Aparece** con un fallo de cinta y un golpe de sonido.
2. **Levantas la vista** siguiéndola hasta la cabeza, a 21 m de altura.
3. **Se agacha de verdad**: pliega las piernas por muslo, rodilla y punta, curva la columna y
   baja la cabeza hasta dejártela encima, con los pies clavados en el suelo.
4. **Te mira** girando **la cabeza** a tirones, en pasos secos de stop-motion.
5. **Corta con un glitch** y funde a negro.

Y en negro aparece un **código morse** (punto de luz + pitido, 16,4 s) que dice
*«ayuda, yo no pedí estar aquí»*. No se muestra el texto: hay que descifrarlo.

### Grabación en 4:3 y MP4
La grabación se hace sobre un **segundo lienzo de 960 × 720 (4:3)** en el que se recorta el
centro de la imagen, aunque el juego se esté jugando en panorámico. Como es otro lienzo —y los
controles son DOM— **no entra nada de la interfaz**. El OSD de cámara se dibuja dentro de la
**zona segura 4:3** (marcada en pantalla con guías punteadas) para que no se pierda al recortar.
El códec se pide como **MP4 primero** (`avc1`, luego `video/mp4`) y solo cae a WEBM si el
navegador no ofrece MP4, avisándolo en el panel de la cinta.
