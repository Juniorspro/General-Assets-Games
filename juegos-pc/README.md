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

**Brazos con física (ragdoll).** Los brazos no se posan a mano: cada uno es una **cadena
verlet de dos tramos** (hombro→codo→muñeca) que cae por gravedad, con amortiguación y un
empujoncito lateral para que no se peguen al torso. Se integra, se imponen las longitudes de
los huesos en 3 iteraciones, y luego se **orientan los huesos** para seguir la cadena
(apuntando su eje «hacia el hijo» en la dirección del mundo que toque). Resultado: cuelgan
sueltos y se balancean solos cuando la criatura se agacha o gira, como una marioneta.
La simulación corre después de plantar los pies, para que el hombro ya esté en su sitio final.

**La cabeza gira sobre su eje.** En vez de una rotación fija, se calcula la dirección real
hacia ti y se orienta el eje frontal del hueso `Head` (que se saca del hueso `headfront`, no
se supone) hacia ahí, con **sesgo hacia arriba** para que levante la cara en lugar de mirar al
suelo, y un **tope de giro** para que no se descoyunte. Los tirones desvían esa dirección, así
que te busca a trompicones en vez de girar el cuerpo entero.

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

---

## `Sesion_Figura.html` — sesión de fotos en cuarto negro

Toma de **38 s que se graba sola**: al pulsar **● GRABAR** entra y empieza a registrar en
**4:3**, sin nada que tocar. La figura riggeada aparece sobre **negro puro** y va encadenando
**poses aleatorias**, y en el tramo central se cuelan **los fotogramas encontrados**.

- **Poses aleatorias:** cada 1,1–2,6 s se sortea una pose nueva (agachada o erguida, torsión y
  ladeo de columna, giro y ladeo de cabeza). El 55 % de las veces entra de **golpe seco**
  (stop-motion, con chasquido y fallo de cinta) y el resto en transición lenta.
- **Brazos:** siguen con el **ragdoll** de la cadena verlet. Para las poses de brazos en alto
  no se posan a mano: se **invierte la gravedad** de la simulación y suben solos, colgando.
- **La cabeza** sigue buscando la cámara sobre su propio eje, con desvíos por pose.
- **Encuadres:** la toma alterna plano entero, medio y primer plano, con órbita lenta y
  temblor de mano.
- **Insertos:** las **7 fotos** salen al menos una vez cada una entre el 30 % y el 78 % de la
  toma, más 5 parpadeos de 1–2 cuadros (algunos invertidos o saturados). Se pintan **dentro
  del lienzo** y **encajadas exactamente en el área 4:3 que se graba** (las fotos ya son 4:3,
  así que entran enteras y a sangre, sin recorte); fuera de esa área va negro. Así **quedan
  grabadas** y les cae encima el grano y las scanlines de la cinta. Varias venían casi negras,
  así que se les sube el brillo al insertarlas.
- Al llegar al final corta con un glitch, **para la grabación sola** y ofrece descargar el MP4.
  **OTRA TOMA** genera una sesión distinta (las poses y los insertos se sortean cada vez).

Sobre negro puro hace falta **contraluz**: un cuerpo negro sobre fondo negro no se ve, así que
la iluminación es una clave frontal más dos contras laterales que dibujan el borde de la figura.

---

## `Rezona_TV.html` — cabecera del programa (90s)

Cabecera de canal en **4:3 siempre**: el lienzo vive dentro de un marco de proporción fija
centrado en pantalla, con barras negras a los lados, así que se emite en 4:3 aunque el monitor
sea panorámico o sea un móvil en vertical.

### Guion (≈1 min 45 s) — Parte 1 del programa
1. **La cabecera se construye por mosaico.** La placa generada aparece en teselas de 16×12 en
   orden aleatorio, cada una entrando con un empujón de escala, mientras una línea de barrido
   recorre la construcción. Al completarse: acorde, fallo de cinta y fogonazo blanco.
2. **El dino cae al centro 3 s después** de completarse la cabecera, **sin quitarla de detrás**:
   la placa no es una superposición sino un **plano en la escena 3D**, así que el modelo cae por
   delante y la cabecera sigue viéndose entera. Estirado en la caída y **aplastado con rebote
   amortiguado** al aterrizar.
3. **Gira acercándose**: el giro se dispara mientras avanza hacia cámara y crece, hasta que su
   cuerpo llena el cuadro y **solo queda naranja**.
4. **Del naranja se funde el plató**, ya con la cámara de estudio dentro.
5. **Revisión de lado a lado** del plató y luego **de frente a la mesa**, entrevistando al invitado.
6. **La cámara se le va encima.** El acercamiento está **anclado al hueso de la cabeza**: la
   posición frena a 3,6 m (antes de la mesa) y el resto lo hace la lente, que se cierra de 40° a
   14°. Así el primerísimo plano es la calavera y no el canto de la mesa, que es lo que pasaba
   cuando la cámara avanzaba de verdad y **la atravesaba**.
7. **Giro descontrolado**: el balanceo se dispara al cuadrado, la pantalla se pone roja y el
   ruido sube. El rojo aguanta bajo casi todo el giro y sólo cierra el cuadro al final, para que
   la figura se siga leyendo mientras da vueltas.
8. **Placa `AIRE LIBRE ANOMÁLICO`** (imagen tuya), a corte limpio con fogonazo.
9. **Vuelve a caer el dino**, otra vez **por delante de la placa**, que sigue detrás.
10. **Sobrevuelo del parque**: la cámara pasa por encima del bosque y baja al claro.
11. **Plano bajo**, mirando un poco hacia arriba: la entidad **aparece por la derecha caminando
    a lo lejos** y **gira la cabeza hacia nosotros a mitad del recorrido**. La cámara está a
    58 cm del suelo para que la silueta quede **contra el cielo** y no se pierda entre los árboles.
12. **Sentada en el pasto**, con una mariposa posada en la cabeza, hablando de la paz: de la paz
    de los animales, y de que los humanos son el problema.
13. **Cuatro segundos de silencio absoluto** sobre ella — se apagan los pájaros y el ambiente.
14. **Corte a ruido puro** y fin de la emisión.

Los tiempos del final no están escritos a mano: se fijan **cuando la última locución termina**
(`hushAt`, `cutAt`, `endAt`), así el silencio dura cuatro segundos de verdad aunque el aparato
vaya lento o falte algún clip.

### El parque (hecho a mano en Three.js)
Suelo de pasto, sendero de tierra, **130 árboles** de tronco y tres masas de copa con variación,
arbustos, **1400 matas** de pasto alto en `InstancedMesh`, **1600 flores** en cinco colores,
**hamacas que se mecen solas**, tobogán, subibaja, calesita, bancos y farolas. Y **ni una
persona**. Mariposas revoloteando en órbitas propias, más la que se posa en la cabeza.

Detalles que costaron:
- **El pasto reciclado del patio era de noche** (media RGB 79/82/48), y por eso el parque salía
  casi negro. Se le subió el nivel a 143/176/64.
- **La niebla no coincidía con el cielo** y quedaba un cinturón gris en el horizonte; ahora la
  niebla usa el mismo color que el final del degradado.
- Las matas y las flores dejan **libre el claro** donde se sienta y **la franja por donde camina**,
  si no le tapaban las piernas.

### Assets generados con Higgsfield
- **La placa "REZONA TV"**: generada con `nano_banana_pro` pasándole **tu logo R y tu dino como
  referencias** (subidos con `media_upload` + `media_confirm`), en estilo ident noventero:
  lettering 3D biselado, confeti Memphis, zigzags y estrellas sobre negro.
- **El dino 3D**: primero una vista limpia y simétrica del mascota sobre fondo plano (otra vez
  usando tu imagen como referencia), y de ahí `image_to_3d`. El GLB pasó de **3,0 MB a 1,17 MB**
  recomprimiendo su textura de 2048² (1,9 MB) a 512² JPEG (29 KB).
- Todo va **incrustado como data URI**: el archivo es autocontenido.

### El plató (hecho a mano en Three.js)
Suelo con brillo, ciclorama curvo, **pantalla gigante con la propia cabecera**, tarima con
canto naranja, parrilla de focos, dos **cámaras de estudio** sobre pedestal con su piloto rojo
y monitores a un lado. La cámara hace un travelling lento de acercamiento.

**Iluminación real, no conos falsos.** Se quitaron los conos transparentes: ahora son
`SpotLight` de verdad con **sombras** (`PCFSoftShadowMap`), con su ángulo y penumbra, tres de
ellos proyectando sombra sobre la tarima. Los charcos de luz del suelo ya no están pintados:
los dibuja la propia luz.

**Mesa y entrevista.** Delante de la butaca hay una **mesa** con canto naranja y dos micrófonos.
La cámara primero hace una **revisión de lado a lado** del plató y después se sitúa **de frente
a la mesa**, encuadrando la entrevista.

**Voz de verdad, con un motor de verdad, y sin gastar créditos.** Se descartaron dos caminos
antes de este: `speechSynthesis` depende de que el aparato traiga voz en español (la caja de
pruebas reportaba **0 voces**), y generar las locuciones en la nube cuesta créditos por línea,
que es justo lo que impide escribir un monólogo largo.

Las dieciocho locuciones se sintetizan con **eSpeak** (`meSpeak`, eSpeak compilado a JS), un
**sintetizador de formantes**: no imita una voz humana, la construye, y por eso **ya suena a
robot de fábrica**. Se sintetizan aquí, no en el navegador, y viajan **dentro del HTML**:
- El motor pesa 4,8 MB, así que **no se embarca**. Se usa sólo para hornear el audio.
- Salen a 22050 Hz y se pasan a **mono, 8000 Hz, 8 bits**, con los silencios de los extremos
  recortados: **658 KB** para los dieciocho clips (unos 80 s de habla). 8 kHz no pierde nada
  audible porque la cadena filtra a 3400 Hz de todas formas.
- Dos registros: el **locutor** de plató (rápido y agudo) y **la entidad** (lenta y grave).

**Cadena robot/VHS** por la que pasa cada locución:
- **Modulación en anillo** a 38 Hz — el timbre metálico.
- **Banda de teléfono**, 230–3400 Hz, con realce en 1700 Hz.
- **Wow de cinta**: un LFO a 1,7 Hz sobre el `playbackRate`, más un 0,97 fijo.
- **Mezcla seca/húmeda** 0,62 / 0,55: eSpeak ya es metálico, así que el anillo se dosifica.

**Cola de voz: ya no se pisan.** Antes cada señal del guion arrancaba su clip al instante y dos
frases podían sonar encimadas (se oía en «Sí, anomalías cuánticas»). Ahora las señales entran en
una cola y **una locución sólo arranca cuando termina la anterior** (`onended`), y el **rótulo se
escribe al desencolar**, no al programar, así el texto en pantalla siempre es el que suena. Si un
clip faltara, la cola avanza igual con un temporizador y el rótulo se lee. El rótulo descuenta con
el delta del cuadro, no con un `1/60` fijo.

### Grabación 4:3 en MP4
Como el resto de la serie: un lienzo aparte de **960×720** recorta el centro del render cada
cuadro, así que **la interfaz DOM nunca sale en la cinta**. El audio entra por un
`MediaStreamAudioDestinationNode` colgado del `master`, con lo que la voz, los golpes y el
ambiente del plató quedan **en la pista de sonido**. La grabación **arranca sola** 120 ms
después de EMITIR, y la barra de abajo permite pararla; al parar sale el panel **CINTA
RECUPERADA** con descarga y, si el aparato lo permite, compartir.

Se prefiere `video/mp4;codecs=avc1.42E01E,mp4a.40.2` y se va bajando hasta WEBM; en un teléfono
sale MP4/H.264. Verificado extrayendo fotogramas de la cinta grabada: 960×720 reales, sin
interfaz, con la cabecera, el plató y el rótulo. La grabación **se corta sola** al terminar la
emisión.

### Dónde vive
Three.js se carga desde **jsDelivr**. El resto —placa, dino, entidad, pasto y las dieciocho
locuciones— va **incrustado como data URI**, así que el archivo se abre solo.

Para verlo como página, sin montar nada:

```
https://raw.githack.com/Juniorspro/General-Assets-Games/claude/billeteras-sin-registro-3z7uvz/juegos-pc/Rezona_TV.html
```

`cdn.jsdelivr.net/gh/...` **no sirve** para esto: devuelve el HTML como `text/plain` y el
navegador muestra el código en vez de la página. Para los módulos de Three.js sí, que es para lo
que se usa.

**Público y el invitado.** Cuatro semicírculos de **sillas** rodean por detrás la butaca
central, ocupadas por **figuras negras sentadas** (construidas con primitivas: torso, cuello,
cabeza, muslos, pantorrillas, pies y brazos, en material negro mate), todas vueltas hacia la
cámara. En el centro, sentada en su butaca, está **la entidad riggeada del patio**: se le posa
la sentada con el mismo sistema de huesos (muslos al frente, rodillas abajo, tronco erguido,
brazos caídos), se la baja hasta que la cadera apoya en el asiento, y **la cabeza se orienta
cada cuadro hacia la cámara** con tope de giro. No parpadea: solo mira.

El post es una cinta de emisión a **240p** con sangrado de croma, scanlines, grano y viñeta.
Al pulsar **EMITIR** entra en **pantalla completa** (y bloquea horizontal en móvil), y el marco
4:3 se recalcula solo tras el cambio de tamaño.

---

## `Rezona_Transmision.html` — la señal recuperada

Página que aloja el vídeo de la sesión, con un mensaje arriba y otro abajo.

- **Arriba, morse.** Un piloto parpadea el mensaje en código morse mientras va escribiendo los
  puntos y rayas debajo; se puede activar el **tono** (oscilador a 620 Hz) y repetir. El
  mensaje se codifica en el propio navegador desde el texto, con las duraciones estándar
  (raya = 3 unidades, hueco de letra = 3, hueco de palabra = 7).
- **En medio, el vídeo**, en un marco 4:3 con aspecto de monitor. Si no encuentra
  `media/rezona_sesion.mp4` al lado, ofrece **abrirlo a mano** en vez de quedarse en negro.
- **Abajo, un fragmento cifrado** en un alfabeto de 26 signos rúnicos (sustitución simple),
  que aparece signo a signo. Es descifrable por frecuencias.

> El vídeo va como archivo aparte en `media/` porque son 29 MB: incrustarlo en el HTML lo
> dejaría en ~39 MB. Hay que mantener el HTML y la carpeta `media/` juntos.
