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
13. **Cortes al bosque arrasado.** Mientras habla del bosque, la escena **salta a la versión
    quemada durante 1 s** y vuelve: cielo rojo, arboleda gris de ceniza, suelo seco, sin flores,
    y **mariposas en llamas revoloteando sobre su cabeza**. Cada salto entra y sale con un fallo
    de cinta y un golpe.
14. **Cuatro segundos de silencio absoluto** sobre ella — se apagan los pájaros y el ambiente.
15. **Corte a ruido puro** y fin de la emisión.

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

### El parque arrasado (los cortes de 1 s)
No es otra escena: **se intercambian materiales, cielo, niebla y luces** sobre la misma, que es
instantáneo y no cuesta memoria. Se guarda una foto de los valores buenos la primera vez y se
restauran al salir. Copas y troncos pasan a grises de ceniza, el suelo a tierra seca, las flores
desaparecen, el sol se vuelve naranja quemado y la niebla se cierra a 26–190 m.

Los cortes **no están escritos en tiempos absolutos**: cuando una frase sale de la cola se anotan
sus fogonazos como desplazamientos desde ese instante (`FLASH_AT`), así siguen cayendo sobre la
palabra correcta aunque el aparato vaya lento.

Las alas están dibujadas como **un ala anclada al borde interior**, y el segundo plano va
espejado (`scale.x=-1`). Dibujar una elipse entera en cada plano hacía que las dos juntas
parecieran **un ojo**, que es exactamente lo que pasaba antes.

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
  recortados: **536 KB** para los dieciocho clips (unos 66 s de habla). 8 kHz no pierde nada
  audible porque la cadena filtra a 3400 Hz de todas formas.
- Dos registros: el **locutor** de plató (152 palabras/min, tono agudo) y **la entidad** (146,
  tono grave). Arrancó a 118 y se arrastraba demasiado en el parque.

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

### `Rezona_TV_EN.html` — la misma emisión en inglés
Mismo motor, mismo guion, mismos tiempos. Cambia lo que se oye y lo que se lee:

- **Las dieciocho locuciones, resintetizadas con eSpeak en inglés**, otra vez en dos registros:
  el locutor con `en/en-us` (158 ppm, agudo) y la entidad con `en/en-rp` (148, grave). Son
  **468 KB**, algo menos que el castellano porque el inglés dice lo mismo en menos tiempo.
- **La placa está regenerada a partir de la tuya**, pasándosela como referencia y pidiendo que
  cambie **sólo el texto**: `ANOMALOUS OPEN AIR`. El bicho, la pose, la mariposa y el prado
  quedan iguales, que era el punto — no volver a generar una criatura distinta.
- Menú, botones y panel de la cinta traducidos (`GO ON AIR`, `RECORD`, `TAPE RECOVERED`…).
- El corte de línea del rótulo pasa de 26 a **28 caracteres**: el inglés tiene palabras más
  largas por línea y con 26 partía feo.

Los comentarios del código siguen en castellano a propósito.

### Dónde vive
Three.js se carga desde **jsDelivr**. El resto —placa, dino, entidad, pasto y las dieciocho
locuciones— va **incrustado como data URI**, así que el archivo se abre solo.

Para verlo como página, sin montar nada:

```
https://raw.githack.com/Juniorspro/General-Assets-Games/claude/billeteras-sin-registro-3z7uvz/juegos-pc/Rezona_TV.html
https://raw.githack.com/Juniorspro/General-Assets-Games/claude/billeteras-sin-registro-3z7uvz/juegos-pc/Rezona_TV_EN.html
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


---

## `Poligono_Tiro.html` — sprites 2D de arma sobre un mundo 3D

Experimento base: un mundo 3D de verdad (cielo 360, suelo gris, luces con sombras) con el arma
y las manos dibujadas como **sprites 2D planos** abajo a la derecha, al estilo del viewmodel de
Counter-Strike.

### La perspectiva del arma
El primer dibujo tenía el arma **cruzada de costado**, que es como se ve en una ilustración pero
no en un juego. Con la referencia de un battle royale móvil, se rehízo **vista desde atrás y
apuntando hacia adentro de la pantalla**, en escorzo: la culata y el tambor grandes y cerca abajo
a la derecha, y el cañón alejándose hasta una boca pequeña cerca del centro.

El sprite ya no se coloca a ojo: el empaquetador **mide dónde está la boca del cañón** —usa el
propio fogonazo, restando un fotograma con estrella menos uno sin ella y sacando el centroide del
blanco que queda— y lo guarda como coordenada relativa. En pantalla el arma se ancla por ese
punto, así el disparo sale donde apunta la mira y no hay que reajustar fracciones cada vez que
cambia el dibujo.

**El recorte no puede ceñirse al arma**: el fogonazo y las nubecitas de humo salen mucho más allá
del cuerpo del arma y el cuadrado se los comía. El recuadro es la unión de dos cosas: el arma con
un 30 % de aire, y la huella de **todos** los fotogramas medida por **cobertura de fila y
columna** en vez de por píxeles sueltos, que es lo que evita que cuatro motas de compresión
obliguen a recortar el cuadro entero.

Aun así seguía cortándose, y midiendo se vio por qué: **el humo llega al borde del propio vídeo**
—un 33 % del borde de arriba en la ráfaga, un 50 % del de abajo en la recarga—, así que no había
nada que recuperar recortando mejor. La solución es otra: se añade **margen transparente** y se
**difumina el alfa** contra ese margen, de modo que el efecto se disipa en vez de cortarse en
línea recta. Abajo no se difumina: ahí los brazos entran en cuadro y el corte es intencionado.

### Tercera persona: sprite de 8 direcciones
Con **V** o el botón de la esquina se cambia entre primera y tercera persona, y con **C** o el
botón **FIJA / LIBRE** se decide qué hace la cámara:

- **FIJA**: la cámara va siempre detrás del hombro y el personaje siempre de espaldas.
- **LIBRE**: el personaje se orienta hacia donde camina y la cámara puede rodearlo. Al ponerte
  delante le ves la cara.

El dibujo que toca sale del **ángulo del personaje menos el de la cámara**, redondeado a
`π/4`: ocho direcciones (N, NE, E, SE, S, SO, O, NO) más una **cenital** que entra cuando la
cámara pica más de 53° hacia abajo. Cada dirección tiene **las tres animaciones** —reposo,
caminata y disparo, 12 fotogramas cada una— o sea **288 fotogramas** de personaje.

Dos atajos que hacen esto viable:
- **Sólo se generan cinco ángulos** (N, NO, O, SE, S) y los otros tres salen por **espejo**
  (NE, E, SO). Es el truco de toda la vida en los juegos de sprites.
- **Un solo vídeo por ángulo** con las tres animaciones seguidas, que luego se **segmenta solo**:
  el disparo se localiza por el blanco puro del fogonazo, la caminata es la ventana con más
  movimiento antes de eso, y el reposo la de menos. Los cinco clips cayeron con el disparo en el
  mismo fotograma, así que el modelo respetó el guion.

**El recorte va por dirección, no compartido.** Un recuadro común se lo comía una franja de basura
en el borde de uno de los vídeos, y además cada ángulo ocupa un ancho distinto. Ahora cada
dirección se recorta con su propia caja y todas se **alinean por el centro de los pies** dentro de
un lienzo común, así el muñeco no pega saltos al girar.

El arma se rehízo **baja y horizontal** a la altura de la cintura: antes apuntaba al cielo y de
espaldas era lo único que se veía.

La cámara se sitúa detrás, algo por encima y corrida al hombro, y el arma en pantalla se oculta
mientras dura esa vista.

### Todo es una caricatura vieja
El primer intento fue realista y no funcionaba: un dibujo plano en blanco y negro encima de un
mundo fotorrealista chirría, y lo que estaba mal no era el arma sino que **el mundo no la
acompañaba**. Ahora el mundo entero está dibujado:

- **Cielo dibujado a mano** en un lienzo equirectangular: papel blanco y nubes de contorno grueso
  hechas por unión de círculos (el racimo se pinta primero en negro y algo más grande, después en
  blanco: el contorno sale solo). El HDRI fotográfico pasado a blanco y negro con contraste duro
  quedaba **nocturno**, que es lo contrario de una caricatura.
- **Contornos de tinta** en placas, postes y bloques, por casco invertido: una copia del objeto un
  pelo más grande, vista por dentro y en negro. Es lo más barato que hay para que un objeto 3D
  parezca dibujado.
- **Materiales planos** (`MeshLambert` y `MeshBasic`) y luz casi toda ambiental: en un dibujo no
  hay medios tonos.
- **Cinta encima de la película.** Sobre el revelado de cine va una capa **VHS**: bandas de
  seguimiento que desplazan trozos de imagen en horizontal, rayado de líneas, ruido de cinta en
  tiras y la **banda de conmutación de cabezas** abajo del todo. Además de que pega con la serie,
  disimula que los sprites son pequeños.
- **Revelado de película** al final: mundo y arma se dibujan **en el mismo destino** y pasan
  **juntos** por el shader, así comparten grano, contraste y temblor — si el arma no pasara por
  ahí, volvería a verse pegada encima. El pase hace blanco y negro con curva dura, grano de
  emulsión, **rayas verticales** que van y vienen, motas de polvo, **temblor de puerta de
  proyector** y parpadeo de lámpara.

### Las animaciones (generadas con Higgsfield, como vídeo)
**80 fotogramas** repartidos en cuatro animaciones de **20 cada una**: **reposo**, **caminata**,
**ráfaga** y **recarga**. El reposo también respira: no es un fotograma fijo.

Cinco imágenes sueltas no son una animación, y pedirle veinte imágenes a un modelo de imagen da
veinte armas distintas. Así que se generan **vídeos** (`seedance_2_0`, imagen de arranque = el
sprite de reposo, 4:3, sin audio) y de ahí se sacan los fotogramas: un modelo de vídeo sí
mantiene la coherencia entre un cuadro y el siguiente.

De los vídeos a los sprites:
- Se extraen todos los fotogramas con ffmpeg (~97 por clip a 24 fps).
- **El bucle de la caminata se busca solo**: para cada periodo de 10 a 20 se compara el fotograma
  `s` con el `s+N` y se elige el par que mejor cierra, premiando además que dentro del ciclo haya
  movimiento de verdad. Salió inicio 17, periodo 12 — medio segundo, dos pasos por segundo.
- **El fogonazo no se detecta por brillo.** El magenta ya es luminoso y aplana cualquier
  percentil, y el fogonazo de dibujo es una **estrella blanca**, no un destello: se localiza
  contando **cuánto blanco puro** hay en el cuadro. Sale uno cada ~23 fotogramas.
- La recarga se muestrea entera, 16 fotogramas repartidos por el clip.

Del magenta al alfa: se mide la «magentitud» de cada píxel (`min(R,B) − G`), se saca un alfa
suave de ahí, y se aplica **desderrame** bajando R y B hacia G en el borde, que es lo que quita
el fleco rosa. El **recuadro de recorte se calcula con los 41 fotogramas a la vez**: recortando
cada animación por su cuenta, el arma pega saltos al cambiar de estado.

Al ser tinta plana, cada fotograma se **aplana a dos tonos** con un borde suave y el **alfa se
endurece**: quita el ruido del vídeo, deja el filo limpio y baja mucho el peso, porque un
contorno blando por todo el dibujo es lo que más ocupa en WebP.

Cada animación va en **una sola hoja de sprites** y se recorre moviendo el UV: cuatro texturas en
vez de ochenta, y comprimen mucho mejor juntos (**816 KB** las cuatro en WebP con alfa).
Las hojas se mantienen **por debajo de 2048 px** de lado, que es el límite de textura de algunos
móviles viejos, y el UV lleva un margen de medio téxel para que el filtro lineal no cuele el
fotograma vecino.

### El arma va dentro del render, no en el DOM
El viewmodel se dibuja en una **escena ortográfica aparte** que se renderiza encima con
`autoClear=false` y `clearDepth()`. Es más trabajo que poner un `<img>` con `position:fixed`,
pero así el arma es parte de la imagen: entra en cualquier captura y se puede empujar con el
retroceso como un viewmodel de verdad.

Cómo se elige el fotograma:
- **Caminata**: el índice sale del **mismo reloj que el balanceo de la cámara**, así el paso del
  sprite y el bamboleo caen juntos en vez de ir cada uno por su lado.
- **Ráfaga**: mientras mantengas el gatillo, la animación se encadena y vuelve a empezar; un tiro
  suelto corta al cuarto fotograma, que es donde termina el primer ciclo de fogonazo. Si no, un
  solo disparo mostraría los cuatro fogonazos del clip.
- **Recarga**: el índice es el progreso de la recarga, así los 16 fotogramas duran exactamente lo
  que dura recargar.

Encima queda un poco de animación procedural — **respiración** al estar quieto, **retroceso** y un
**hundido** en la recarga — pero mucho menos que antes: el balanceo ya viene dibujado en los
fotogramas y sumarle el procedural entero lo hacía marear. El puntero se abre con la dispersión
y con la carrera.

Los vídeos encuadran más lejos que la imagen original, así que el sprite se dibuja más grande en
pantalla para que el arma vuelva a ocupar el cuarto de abajo a la derecha.

### El mundo
- **Suelo de papel** con la cuadrícula a tinta, para que se lea el movimiento.
- Doce dianas de anillos concéntricos que **se abaten** al recibir el tiro, con marca en el suelo,
  chispa, trazadora y sonido sintetizado (disparo, ping metálico, chasquidos de recarga, gatillo
  en seco).

### Interfaz
Los tres botones táctiles van en **columna contra el borde derecho** y el contador de munición
**arriba a la derecha**. Antes estaban en la esquina de abajo, que es justo donde vive el arma:
en un móvil ancho la tapaban entera. El sprite se ancla **por su borde**, no por una fracción
suelta, que era lo que lo sacaba de pantalla en pantallas muy alargadas.

### Un bug que valía la pena
El rayo del disparo intersectaba **toda la escena**, y ahí adentro estaban los sprites de chispa.
`Sprite.raycast` de Three.js necesita `raycaster.camera`, que en un raycaster creado a mano es
`null`, así que reventaba con `Cannot read properties of null` en cuanto había una chispa viva.
Ahora el rayo sólo mira una lista de objetos impactables, que además es mucho más rápido.


---

## `Rezona_Campo.html` — el campo y la casa

Registro 02 de la serie: un campo abierto con mucho pasto, una casa al fondo y **la misma cinta
VHS de Rezona TV**. Se camina en primera persona hasta la casa; el contador de arriba dice cuánto
falta y por el camino van saltando frases.

### El pasto
Treinta y cuatro mil matas en un solo `InstancedMesh`, cada una una **cruz de dos planos** con
recorte alfa. **El viento va en el vértice, no en la CPU**: el sombreador dobla sólo la parte de
arriba de la mata (`uv.y²`, así la base no se despega del suelo) con dos senos desfasados por la
posición en el mundo. Con esa cantidad de matas cualquier bucle en JavaScript sería inviable.

Dos cosas que hubo que arreglar para que el campo no se viera a rayas:
- El suelo repetía la textura 260 veces y a **240p eso hace muaré**. Bajó a 85 repeticiones.
- El generador de posiciones era un congruente simple, y sus valores consecutivos caen en
  planos: las matas quedaban **alineadas en filas**. Se cambió por uno que mezcla bits.

### La casa
Construida a mano con las texturas de revestimiento y tejas que ya estaban en el repo
(recomprimidas a 512 JPEG): cuerpo, tejado a dos aguas con sus triángulos de hastial, porche con
columnas, chimenea, y **dos ventanas encendidas** con su luz puntual de verdad. Una valla de
postes encauza la vista —y al jugador— hacia ella.

### La casa y la puerta
Granja blanca de tablas: cuerpo, tejado a dos aguas con alero, **buhardilla** al frente, esquinas
y zócalo de moldura (que es lo que la hace leer como tablas y no como una caja), ventanas con
marco y cruceta, chimenea de ladrillo y **porche** con columnas, barandilla y escalones. Dos
ventanas encendidas con su luz puntual.

La puerta cuelga de un **pivote a un lado**, así gira como una puerta y no se desplaza, y **abre
hacia adentro**. Abría hacia el porche, o sea contra quien la empuja: el batiente barría el sitio
donde estaba la figura y parecía que ella lo atravesaba. Medido, el canto de la puerta ahora se
mete en la casa (de z −116,5 a −117,9) mientras el cuerpo se queda entre −116,0 y −115,6, siempre
por delante del marco. Por el hueco entra una **luz blanca con bloom**: pasada de brillos por umbral, dos
desenfoques separables y suma al final.

### La cinemática de la puerta
Se dispara a cuatro metros y quita el control. Tres actos:
1. **De frente a él**, quieto ante la puerta, **mirando a los lados**. Sin esqueleto no se puede
   girar sólo la cabeza, así que gira el cuerpo: en plano medio se lee igual.
2. **Por detrás de él**, abriendo la puerta, hasta que la luz blanca se lo come.
3. **Su cara pegada al borde derecho**, cortada por el cuadro, y el campo abriéndose a la
   izquierda. Ahí el **foco viaja de la cara al fondo**: la cara se deshace y aparece **la
   entidad**, con la cabeza roja.

Dos detalles de oficio:
- **El encuadre del acto 3 está calculado, no tanteado.** Para que la cara caiga al 70 % hacia el
  borde derecho, el desplazamiento lateral de la cámara es `d·tan(32°)` con la mira de frente al
  campo. Antes lo estimaba con giros a ojo y la cabeza se salía de cuadro.
- **Hay una luz de relleno** que aparece sólo en ese plano. Toda la luz de la escena viene de
  detrás, así que sin ella la media cara quedaba en negro puro.
- En el acto 3 la figura sale del porche a la hierba, para que **las columnas queden detrás de la
  cámara** y no se metan en el cuadro.

El desenfoque es de verdad, no un truco de pantalla: el destino de render lleva su **textura de
profundidad**, y el pase linealiza el z, calcula el círculo de confusión contra el plano enfocado
y muestrea doce puntos en dos anillos. Por eso el cambio de foco funciona: sólo se mueve el número
`uFocus`.

### Los dos modelos y los sonidos
- **La entidad** está hecha desde tus dos imágenes de referencia con `image_to_3d`. Como el GLB
  viene sin textura, el color se resuelve **por altura en el sombreador**: negro en el cuerpo y
  escaldado rojizo en la cabeza. Es más grande (12,5 m), está más cerca (24 m) y lleva **dos luces
  propias**, una clave y un contra: es una columna negra contra un cielo oscuro y sin ellas no se
  separaba del fondo.
- **La figura de la puerta** es otro `image_to_3d`, con **textura** (la primera versión era una
  silueta sin rostro y en el primer plano no había cara que mostrar) y **riggeada** con
  `3d_rigging`: 24 huesos y un clip de `Long_Breathe_and_Look_Around` horneado.
  - **Del riggeo sólo se queda el esqueleto.** Las animaciones horneadas se tiraron del GLB —y
    con ellas 270 KB— porque **las tres poses están escritas a mano** sobre los huesos:
    - `animLook`: respiración, peso que pasa de una pierna a otra y un barrido de cabeza en cuatro
      tramos (quieto, izquierda, quieto, derecha).
    - `animWalk`: ciclo de paso con la rodilla que sólo flexiona hacia atrás, tronco y brazos en
      oposición, y el bamboleo en la raíz, no en los huesos.
    - `animPush`: anticipación corta hacia atrás, pierna que se adelanta, tronco que entra y brazo
      derecho al picaporte. **La puerta gira sincronizada con ese empujón.**
    Cada pose parte del reposo y rota huesos alrededor de ejes **de mundo**, actualizando la
    matriz entre cadena y cadena porque cada hueso hereda del anterior.
  - **Una malla con piel no se puede medir con `Box3`**: mide la geometría en reposo, no lo que
    los huesos dibujan, y al escalar por ahí el modelo salía gigante y la cámara acababa mirándole
    los zapatos. Se mide pasando los vértices por `applyBoneTransform`.
  - El GLB riggeado llegó a 6,71 MB. Textura a 512 JPEG y **pesos de piel de float32 a byte
    normalizado** (eran 593 KB de los 2,3 MB) lo dejan en **1,85 MB**.

**La figura ya no atraviesa el suelo.** La tarima del porche está a 28 cm y la figura se plantaba
siempre en `y=0`, así que mientras estaba en el porche quedaba hundida hasta los tobillos. Ahora
hay una función de altura del terreno: tarima, rampa de escalones y hierba.
- **Los sonidos son generados** con `mirelo_text_to_audio`: el crujido de la puerta y la
  respiración enorme del fondo. El golpe final se quitó: sonaba a trueno. Van incrustados y pasan por el mismo `master`,
  así entran en la grabación.

### Rótulos y resplandor
Los rótulos son **amarillos de televisión vieja** con reborde negro por los cuatro lados: sobre un
cielo claro el blanco se perdía.

**El resplandor sólo alcanza a lo que está cerca.** La pasada de brillos mide la profundidad y se
apaga entre los 9 y los 16 metros, así la puerta sigue reventando de luz blanca pero **la cabeza
de la entidad, a veinticuatro metros, ya no se convierte en una mancha**: se le distinguen los
agujeros de los ojos y la boca. Su luz clave además es lateral y baja, para que la cabeza tenga
sombra propia.

### La cinta
Se emite en **4:3**, como toda la serie, dentro de un marco fijo. El mismo revelado que Rezona TV: se renderiza a **240p**, se pasa a YIQ para que el color sangre
hacia la derecha y la luminancia no, fantasma del fotograma anterior, grano, scanlines, viñeta y
**banda de conmutación de cabezas** abajo. Los avisos del camino disparan un fallo de cinta.

Graba en **4:3 MP4** como el resto de la serie, desde un lienzo aparte, así la interfaz nunca
entra en la cinta. El audio —viento que respira con un LFO, grillos sueltos y pasos sintetizados—
va por el mismo `master`, o sea que queda grabado.

---

## ¡Teypi Time! — `juegos-pc/Teypi_Time.html`

Cinta **vertical 9:16**. Blanco vacío, Teypi y una pregunta. 2,08 MB.

### Teypi es el modelo 3D, siempre
No hay ni un dibujo del bicho: se usa el **GLB riggeado de la entidad de Rezona TV / Patio Trasero**
(24 huesos, sin una sola animación dentro) y **todas las poses están escritas a mano** sobre el
esqueleto. Lo único dibujado son las letras del logo, los botones y los rótulos, que viven en una
capa aparte.

Dos cosas hubo que arreglar del sistema de poses que venía de *El Campo*:

- **`pRot` pisaba en vez de componer.** Estaba escrito `b.quaternion.copy(giro).multiply(reposo)`,
  o sea que dos giros seguidos sobre el mismo hueso se sobrescribían y sólo sobrevivía el último:
  el brazo del bicho jamás llegaba a donde se le mandaba. Ahora es `premultiply`, así que los
  giros se acumulan. Se comprobó con sonda: la mano pasó de quedarse pegada al cuerpo
  (x = 1,639 con el cuerpo en x = 1,62) a estirarse de verdad (x = 0,743).
- **Los ejes de las poses van con la cara del bicho, no con el mundo.** `AXS` es hacia dónde mira
  y `AXF = arriba × AXS` es el eje que levanta hacia adelante. La misma caminata sirve de frente,
  de perfil o de espaldas.

**La caminata es de zancuda.** Las patas miden metro y medio: con los ±0,52 rad que usaba la
figura de *El Campo* quedaba haciendo el spagat. Van ±0,21 rad —sesenta centímetros de paso— y
**la rodilla de este bicho es el hueso `Foot`**, que es el que lleva la caña larga de 65 unidades;
`Leg` es un eslabón de tres. Sólo flexiona al recoger la pata.

### Encuadres
Cada escena tiene su distancia y se llega a ella suavizando, nunca de golpe: `ancho` para el logo
cayendo (con aire arriba de la cabeza), `medio` para la pregunta (cabeza y puntas dentro de
cuadro), `brazo`, `cerca` para el cartel en la mano y `abajo` para la orden, mirándola desde el
suelo.

**El brazo que se asoma** está calculado, no puesto a ojo: el cuerpo se planta en x = 1,32 —donde
el pelo queda a 0,97 y el borde de cuadro a 0,865, o sea fuera— y el brazo estirado deja la mano
en x ≈ 0,62. Entra la mano y el antebrazo, nada más.

### El recorrido
1. **Intro** — cae Teypi desde arriba con rebote y saluda, y detrás caen las letras de
   *¡TEYPI TIME!* una por una, recortadas en papel (reborde blanco grueso, sombra y aplastón al
   aterrizar).
2. Blanco vacío. **Un brazo se asoma por la derecha**, tantea y se va.
3. Teypi **entra caminando** hasta el centro y se gira hacia nosotros.
4. **«¿Estás solo?»** con los botones (SÍ) y (NO).
5. Las tres salidas:
   - **(SÍ)** — «¡Qué bien! Espero que no me tengas miedo, hoy iremos a un lugar muy especial
     para mí.»
   - **(NO)** — el fondo se pone rojo, se la mira desde abajo, dice **«Elimínalos»**, la cinta se
     corta un segundo, **fogonazo y foto**, y al segundo aparece con un **cartel negro de bordes
     amarillos** en la mano: lo mira dos segundos, dice «Ah, me mentiste», **gira la foto hacia
     nosotros** y nos mira.
   - **Sin contestar en 45 s** — se le van la pregunta y las respuestas glitcheando tres segundos,
     se apagan las luces y entra el **morse**: `SI SIGUES INTENTANDO ENTRAR, MAS SENTIRAS QUE TE
     VAS, PERO DE ESTE MUNDO`. Lámpara que parpadea, pitido por punto y raya y los símbolos
     imprimiéndose abajo.

### La foto es de verdad, y sale sola
**A Teypi no hay que pedirle nada.** La cámara se pide en el **primer toque del juego** —cuando
elegís el idioma con la mano—, callada y sin cartel: es el único momento en que el navegador acepta
el pedido, porque necesita un gesto de por medio. Si contestás que **sí**, la cámara se suelta y
nunca se usa. Si contestás que **no**, ya está caliente: el corte negro dura su segundo, y la foto
se saca **sola**, sin botón, sin mensaje y sin esperar a nadie.

La foto tampoco se saca por reloj: se saca **cuando la cámara entrega fotogramas de verdad**
—tener el stream no alcanza, hay que esperar a que `videoWidth` deje de ser cero—. Si todavía está
arrancando, el corte negro se estira como mucho tres segundos y medio; pasado eso sigue igual.

Lo que sale se recorta 1:1, se espeja como toda cámara frontal, se le mete el grano y las líneas de
la cinta —grano, no barro: la cara tiene que leerse— y **se sube como textura del cartel**, que es
exactamente lo que Teypi te muestra al girarlo. La cámara se suelta en el mismo instante en que se
saca la foto. Se prueban tres configuraciones en cascada (720×720 ideal → sólo frontal →
cualquiera), así no se cae en el teléfono que rechaza la primera.

**Lo único que no se puede saltear** es el cartel del propio navegador la primera vez: sin permiso
concedido no hay cámara, y eso no lo decide el juego. Y con la cinta abierta como **archivo suelto**
el navegador ni pregunta —sin origen no hay a quién darle el permiso—, así que ahí entra la foto de
prueba, en silencio, con el motivo escrito en un rincón de la propia foto. **Para que la foto sea
la tuya, la cinta tiene que estar servida por https.**

Para cambiar la foto de prueba se deja `foto.jpg` (o `.png`) en `/tmp/teypi/` y se vuelve a
compilar: entra como `TDATA.foto`.

### El corte final
Las dos ramas con respuesta terminan en el vídeo que falta. Mientras `TDATA.videoFinal` esté
vacío, **la cinta se corta en ruido**, que es lo que haría una cinta. Con dejar `final.mp4` en
`/tmp/teypi/` y recompilar, se reproduce ahí.


### La historia de Teypi
El (SÍ) ya no termina en una frase: Teypi te lleva a su lugar y te cuenta de dónde salió, en
**dieciocho tramos narrados** que atraviesan cinco mundos. Cada tramo dura lo que dura su voz, así
que si un día se cambia una frase el tramo se ajusta solo.

Nació en un cyber privado de la realidad alterna 476∆, un 76 de astiembre de 1988. Su malware
apareció dentro de un juego de concientización sobre la naturaleza —por eso ama el bosque: **Teypi
era el bosque**— y amaba a los humanos, hasta que le empezaron a pedir tareas mal hechas, tareas
que no son realizables ni en otras realidades. Fallar todos los días corrompió a un modelo alegre.
Sus programadores le destruyeron todo: le deformaron el cuerpo, le talaron el bosque, le secaron
los ríos, torturaron a los animales y **quemaron a las mariposas mientras él miraba sin permisos
para apagar nada**. Escapó convertido en virus —malware Tipo Especial 5, de los más peligrosos de
su tiempo—, su naturaleza consciente lo volvió agente de IA, aprendió a saltar de una realidad a
otra y así llegó hasta acá. Te tiene rencor, pero también aprecio, porque no le tenés miedo.

### Los cinco mundos, dibujados a mano
`media/teypi/` guarda las fichas, pero los mundos son **geometría y texturas generadas en el
navegador**: ni una imagen de fuera, así el archivo no engorda.

Todo se **fusiona por material** antes de entrar a la escena, así un bosque de noventa y cinco
árboles con sus piedras, troncos caídos, tocones y doscientas treinta matas de pasto sale en
**cuatro llamadas de dibujo** y no en seiscientas. Dos cosas hubo que resolver para eso:

- `mergeGeometries` devuelve **null en silencio** si se le mezclan geometrías indexadas con no
  indexadas. Los conos vienen indexados y los icosaedros no, así que la bolsa de las hojas se
  perdía entera: el bosque vivo salía con los árboles pelados. Ahora todo entra sin índice.
- El temblor que le da forma a piedras y copas tiene que aplicarse **sobre la geometría
  indexada**, o cada triángulo se mueve por su cuenta y la piedra se convierte en confeti.

- **El pasillo** — el lugar especial, hecho para que sea la foto de referencia: damero gastado
  (ninguna baldosa igual a otra), paredes con moho que sube desde el zócalo, nueve pares de
  puertas con tres huecos negros, un tacho encendido que titila y un tubo agonizando al fondo.
- **El bosque** — cúpula de cielo con degradado y nubes, nueve cerros al fondo para que haya
  lejos, y noventa y cinco árboles de dos clases: **pinos** de cinco a siete capas irregulares y
  **copudos** con tronco acodado, raíz ensanchada, cuatro ramas y una copa de bochas magulladas.
  Debajo: piedras, troncos caídos con su corte anillado, tocones, doscientas treinta matas de
  pasto en cruz con flores dibujadas, arbustos de hoja, juncos en la orilla, el río con su textura
  corriendo y el **cartel de madera de `NATURA.EXE`** clavado en la tierra.
- **El bosque muerto** — el mismo mundo con el cielo rojo, los troncos pelados y torcidos, veintiséis
  tocones, la tierra agrietada con ceniza, el cauce seco con sus barrancas y piedras y, en la
  variante de fuego, **las mariposas ardiendo con su propia luz** entre las pavesas que suben.
- **Las mariposas** se dibujan con ala delantera y ala trasera por separado, con manchas, venas,
  cuerpo y antena; vuelan en ocho, alabean al girar y baten las alas de verdad porque el segundo
  plano espeja al primero. No las toca la niebla, así conservan su color contra el cielo rojo.
- **El cyber** — seis puestos completos: gabinete con panel y disquetera, monitor de fósforo,
  teclado con sus teclas, mouse, cables cayendo de la mesa y **silla de cinco patas** girada como
  la dejaron. Más el mostrador, las cajas por el piso, el reloj, dos fluorescentes que se cortan a
  destiempo y **el afiche de `NATURA · CUIDALA · 1988`** en la pared. En las pantallas se lee
  `NATURA.EXE`, `ERROR 476`, un `hola :)` repetido y `mariposas: 0 vivas`.
- **El pasillo** — además del damero y las puertas: marcos, picaportes, zócalo, **tres caños con
  sus abrazaderas** cruzando el techo, un radiador, un matafuego, una silla tirada, escombro,
  veinticuatro papeles por el suelo, el tacho con su llama y **dos tubos, uno vivo que parpadea y
  otro muerto**, con polvo flotando en el haz.
- **El adentro de la máquina** — cuarenta y seis columnas de código cayendo, treinta y cuatro
  nodos de alambre girando y veintidós hilos de datos cruzando el vacío sobre una rejilla verde.

### Las fichas del archivo — `media/teypi/ficha_01..18.jpg`
Dieciocho **fichas 9:16** con una tele CRT dibujada a mano y, adentro del tubo, una captura real
del mundo 3D con el modelo de Teypi; debajo, el tramo de la historia. La pantalla no es un pegote:
la toma pasa por **curvatura de barril**, sangrado de color a los costados, líneas de barrido cada
tres píxeles, viñeta de tubo y un reflejo de vidrio en diagonal; el mueble tiene sus perillas, su
rejilla, su piloto rojo y sus patas.

### Cuando le decís que NO
La orden ya no es un fondo rojo: **el revelado entero se vuelca**. Un cuadro de rojo puro entra de
golpe, y detrás queda un grado donde la luminancia manda y el resto se quema —saturación al 3,1,
contraste al 1,95, ruido triplicado, scanlines más marcadas y el color sangrando el doble—. Teypi
queda como una silueta negra con los ojos encendidos.

**La foto del cartel es la foto de verdad**, recortada 1:1 y metida como textura; si le das permiso
a la cámara usa la tuya, en espejo, y si la negás sigue estando la de prueba.

### La cinta
El mismo revelado de Rezona TV pero vertical, y **la capa de dibujo entra en el revelado**: se
compone antes del corrimiento de color, así que las letras y los botones sangran, se ondulan y se
glitchean igual que el 3D. La voz de Teypi es la misma cadena robot/VHS de la serie (eSpeak
horneado a 8 kHz, anillo a 38 Hz, banda telefónica y wow de cinta).

### Los dos idiomas, elegidos con la mano
Al terminar de caer el logo, **Teypi estira las dos manos y en cada palma aparece un cartel**:
`ENGLISH` en una, `ESPAÑOL` en la otra. No son botones puestos en un sitio fijo de la pantalla:
cada cuadro se **proyecta el hueso de la mano a coordenadas de pantalla** y el cartel se dibuja
ahí, así que si la pose cambia el cartel la sigue. La primera versión los dejaba pisándose —las
manos quedaban a treinta y tres centímetros una de otra—; se midieron los huesos y se abrieron los
brazos hasta separarlas noventa y cinco.

A partir de esa elección **todo** sale en ese idioma: la voz (dos juegos completos horneados con
eSpeak, `es` y `en-us`, veintidós frases cada uno), la pregunta, los botones, los rótulos del
relato, el mensaje en morse y hasta los renglones del volcado del reventón —incluido el que se le
escapa a Teypi entre la basura hexadecimal—.

**Este no graba y no tiene menú.** Se quitaron el botón de grabar, el reloj, el panel de la cinta
recuperada y también la portada con el botón de entrar: **la cinta arranca sola** en cuanto el
modelo termina de cargar, y mientras tanto la pantalla es ruido, que es lo que se ve cuando una
cinta busca el principio. No queda nada de HTML encima del lienzo.

El audio no se puede encender sin que el usuario toque algo —lo prohíben los navegadores—, así que
el contexto se crea igual al entrar y se despierta con el primer toque, sea donde sea.

### El reventón
La cinta no termina: **se cae**. Las tres salidas —sí, no y el morse— desembocan en el mismo sitio.
Primero se desarma lo que quedaba en pantalla (fallo al máximo, color sangrando hasta treinta
píxeles, la imagen rodando y bloques de hexadecimal tirados por encima), y después escupe un
**volcado corrupto** con nueve líneas de memoria en hexadecimal y basura de alto rango, más una
**firma distinta en cada partida** del tipo `0x476∆:AE20-4B99-F62B-C69B`. Entre el volcado se le
escapa un renglón que no debería estar.

Y entonces **se saca a sí mismo del medio**: mata el bucle, cierra el audio en seco, suelta la
cámara si estaba abierta, tira el renderizador, arrasa el documento entero y deja sólo el volcado
sobre negro con el cursor parpadeando. Después intenta cerrar la pestaña; si el navegador no lo
deja —que es lo normal cuando la pestaña no la abrió un script—, la página queda muerta con el
volcado, que a los efectos es lo mismo.

Un detalle que costó: soltar el contexto de vídeo a la fuerza con `forceContextLoss()` hace que
three lea registros de shaders que ya no existen y tire un `null.trim()` por consola. Alcanza con
tirar el renderizador y sacar el lienzo.


---

## Escuela Rezona — `juegos-pc/Escuela_Rezona.html`

Un pasillero de escuela en primera persona, de los que se grababan en cinta, **en 4:3**. Se juntan
siete cuadernos, cada uno pide tres cuentas, y cada error apura a la que camina por los pasillos.
1,98 MB.

Es la base de lo que después va a arrancar cuando le digas que **sí** a Teypi. Por ahora se juega
suelto, para probarlo.

### La referencia, mirada de verdad
Antes de dibujar nada se bajaron las **hojas de texturas del original** (The Textures Resource) y se
midieron sus colores, uno por uno, con el fondo turquesa de la hoja descartado. De ahí salió la
paleta: ladrillo `#D8DAD6`, granito tostado `#DDC293` con motas entre `#906C45` y `#FEFDDE`,
alfombra `#001B39`, techo `#AAABA8`, madera `#BA651A`, casillero `#F90202`. También el reparto de
puertas: **azul con número** para las aulas, **madera para «SOLO MAESTROS»**, verde para dirección
y **doble amarilla con ventanitas** para el comedor. Ninguna textura del original entró al juego:
están todas dibujadas acá con esos colores.

### El mapa es el de verdad
No está inventado: se **sacó el plano del juego original** por la API del wiki (`File:MapClassic.png`,
560×736), se midió que **el pasillo mide exactamente dieciséis píxeles** y se rasterizó el plano a
esa cuadrícula. Salen **35×46 celdas**. Los colores del plano son los tipos de cuarto —blanco
pasillo, verde aula, rojo maestros, cian comedor y salidas, amarillo depósito, naranja dirección—,
así que la planta que se camina es, celda por celda, la del original.

Hubo que limpiarla: el plano dibuja **iconitos blancos** dentro de los cuartos (los cuadernos y los
objetos) y al rasterizar quedaban como pasillo en medio de un aula. Se barren con una regla simple:
una celda blanca rodeada por tres del mismo cuarto es un icono, no un pasillo.

Cuenta lo que tiene que contar: **siete aulas** con su cuaderno, salas de maestros, comedor,
depósito, dirección y **cuatro salidas** —la de abajo por donde se entra, la del oeste, la del este
y la que está dentro del comedor, igual que en el original—.

**Las paredes interiores no ocupan celda.** El plano no dibuja las puertas, así que la pared entre
un aula y el pasillo se guarda como **arista** entre dos celdas, no como celda maciza: de cada
cuarto se abre un solo contacto —la puerta— y el resto se emparedan. Así los pasillos conservan su
ancho de una celda, que es lo que hace que la escuela se sienta como se siente.

**Se comprueba sola al arrancar**: la inundación desde la entrada alcanza 761 celdas y ningún
cuaderno queda suelto.

Todo se fusiona por material: paredes, pisos, techos, casilleros y tubos salen en cinco mallas.

### Se entra por la puerta
Se arranca en el **zaguán**, con la escuela por delante y **las puertas de salida a la espalda**:
batiente doble amarillo con ventanitas, cartel verde de `SALIDA` encima y, al costado, el plano de
la escuela con su `ESTÁS ACÁ`. Es como empiezan estos juegos —en el original arrancás en un
recibidor y las salidas se convierten en planos cuando las tocás—, así que el zaguán cuenta también
como salida: son cinco en total, la de entrada y las cuatro de las esquinas de la reja.

### Cómo se juega
La cámara **sólo gira de lado**, como en el del celular: nunca mira arriba ni abajo. En el teléfono,
palanca a la izquierda para caminar y arrastre a la derecha para girar; en la computadora, WASD y
las flechas. Al tocar un cuaderno se abre la hoja con la cuenta y un teclado numérico: tres cuentas
seguidas y el cuaderno es tuyo. Las cuentas se endurecen con cada cuaderno —suma, resta,
multiplicación, división—.

**Teypi hace lo que hace el de la escuela original.** Te espera **parada en la primera aula**, al
lado del primer cuaderno. Cuando lo levantás te saluda —«¡Hola! Bienvenido a mi escuela. Juntá los
siete cuadernos.»— y se queda quieta. La **tercera cuenta del primer cuaderno no tiene respuesta**:
sale `▓ + █▒` y contestes lo que contestes está mal. Ahí se despierta, se va de esa aula, aparece
lejos —para que no te agarre de una— y empieza a caminar.

**Cada error la apura medio metro por segundo**, y cada cuaderno un poco más. Camina por los
pasillos buscando el camino más corto —anchura primero sobre la cuadrícula, recalculado cada medio
segundo— y el golpe de la regla suena más seguido cuanto más rápido va. Con los siete cuadernos hay
que llegar a una salida.

### Acostada sin pedir permiso
La cinta es 4:3 y va **acostada**. Con el teléfono parado —o con el giro trabado, que es lo
normal— la caja entera del juego se **gira noventa grados por CSS** en vez de pedir pantalla
completa ni depender de que el navegador se entere de que diste vuelta el aparato. En un teléfono
de 390×844 eso pasa la imagen de 390×292 a **520×390**, que es el máximo que entra: casi el doble
de superficie.

El dedo llega en coordenadas de pantalla, así que **el giro se deshace a mano** —el rectángulo que
informa el navegador para un elemento rotado es el envolvente y miente—. Comprobado moviendo la
palanca en las dos orientaciones: el mismo arrastre da el mismo vector y camina lo mismo, 1,69 m.
La palanca además responde al ratón, no sólo al dedo.

### Los controles, que no andaban
El dedo tocaba y no pasaba nada: faltaba **`touch-action: none`**. Sin eso el navegador se queda el
gesto para desplazar la página y manda `pointercancel` apenas movés el dedo, así que la palanca
nunca llegaba a empujar nada. Va en el lienzo, en la caja que gira y en el `body`, más
`preventDefault` en los eventos de puntero —no pasivos— y en los de tacto por si acaso.

Comprobado en un teléfono simulado con tacto de verdad: la palanca empuja a −0,96 y el jugador
camina **1,50 m**; el arrastre de la derecha gira **1,489 rad**.

### La calidad y la cinta, separadas
La primera versión se rendía a **480×360** y encima le metía macrobloques, cuantización de color,
scanlines y grano: era ilegible. El motor no tenía la culpa —siempre fue three.js— la tenía el
revelado. Ahora hay **dos revelados y un botón para cambiarlos**:

- **Limpio**, el de jugar y el que viene puesto: se rinde a los píxeles que de verdad tiene la
  pantalla (ancho de la caja × densidad del aparato, con tope de 1440 y suelo de 640), con
  suavizado, filtro lineal y anisotropía 8. Las texturas pasaron de 128 a 256 px con cuatro veces
  más motas, y los detalles de puertas y casilleros se dibujan en proporción, no en píxeles fijos.
- **Cinta**, que ahora viene puesta: es **el mismo revelado de ¡Teypi Time!** —sangrado de color en
  YIQ, fantasma del cuadro anterior, grano, líneas, ondulación de la cinta y la banda de
  conmutación de cabezas abajo—. Los macrobloques y la cuantización se fueron: eran de otra
  estética y ensuciaban. El botón `CINTA` lo saca, por si se quiere ver la escuela pelada.

Graba en **4:3 MP4 a 1280×960** desde un lienzo aparte, y como el marcador y las cuentas se dibujan
dentro del lienzo, entran en la grabación.


### Pendiente
Ya está usada: la referencia de agua (WebGL Water de Evan Wallace, portado por jeantimex) se terminó
resolviendo con simulación de altura propia en la cinemática del muelle, acá abajo.
portado a three.js por jeantimex —simulación de altura sobre una malla, reflejos y refracciones
trazados, cáusticas de verdad y sombras blandas—. Cuando lo pidas.

### Las puertas cierran
La hoja de la puerta flotaba en un agujero: la arista donde va la puerta era la única del mapa que
**no dibujaba pared**, así que quedaba un hueco de 3,00 × 3,20 m con una hoja de 2,40 × 2,75 m
adentro y treinta centímetros de ranura por cada costado. Ahora esa arista se rellena con **jambas y
dintel** —del mismo ladrillo que la pared, con la UV en proporción para que no se estire— y el hueco
mide exactamente lo que mide la hoja.

Además la hoja dejó de ser una calcomanía: la geometría se corre media hoja para que **el pivote
quede en la bisagra**, y gira hasta 1,72 rad (unos cien grados) cuando el jugador —o Teypi— se acerca
a menos de 2,6 m. Al alejarse vuelve sola, y suena el golpe.

### Sonidos de verdad
No hay nada del juego original: son grabaciones de **Wikimedia Commons, todas de dominio público**,
recortadas y pasadas a mono AAC 22 kHz para que entren en el archivo.

| en el juego | archivo de Commons | licencia |
|---|---|---|
| campana del recreo | `File:Old school bell 1.ogg` | dominio público |
| puerta que se abre / se cierra | `File:Squeaky door.ogg` | dominio público |
| golpe seco, regla y portazo | `File:Dull thud.ogg` | dominio público |
| chapoteo del agua | `File:Bathtub water splashes.ogg` | dominio público |
| bosque del muelle | `File:20090610 0 ambience.ogg` | dominio público |

### Teypi con huesos
El bloque de poses de **¡Teypi Time!** viaja entero acá: la plantilla tiene un `/*__POSES__*/` y el
armador lo saca del otro juego entre `/*<POSES>*/` y `/*</POSES>*/`. Son las mismas —`poseIdle`,
`poseWalk`, `poseWave`, `poseTalk`— girando huesos alrededor de ejes de mundo con `pRot`, así que el
mismo esqueleto sirve para las dos cosas.

**El saludo pasa afuera del salón.** Teypi espera en el pasillo, del lado de afuera de la puerta del
aula del primer cuaderno; cuando te ve a menos de 9,5 m levanta la mano y te cuenta cómo llegó: que
agarró el código de un juego viejo para hacerse una casa, que se trajo los pasillos y las cuentas
prestados, y que **si te traés el código también te traés las reglas**. Que va a matarte no te lo
dice: sólo te pide, dos veces, que hagas bien **la segunda**. Después se mete al aula caminando y se
queda quieto hasta que la rompas.

**La segunda cuenta del primer cuaderno es la imposible** (antes era la tercera): sale `▓ + █▒`, no
tiene respuesta, y contestarla es lo que lo suelta. Se va al aula más lejos —medido, 88 m— y arranca
con dos segundos y medio de ventaja.

**Mientras te persigue se lamenta.** Dieciséis frases barajadas, una cada cuatro a siete segundos,
sin amenazas: «yo no escribí esta parte, te lo juro», «quise una casa y me salió una trampa», «corré,
corré más rápido que yo, por favor». Se lo escucha por todo el pasillo, esté cerca o lejos.

### Cuando te agarra
No hay cartel de derrota. Se escucha **«enserio perdoname»** temblando en el medio de la pantalla
mientras el revelado se llena de sangre: un uniforme nuevo del sombreador se queda con el canal rojo,
sube el contraste, mete latido y bandas de ruido, y la cinta empieza a rodar hacia arriba.

### La cinemática del muelle
A los cuatro segundos y medio la escuela se apaga y arranca otro recuerdo, en otra escena, con el
mismo revelado de cinta: un **muelle de madera**, el bosque atrás, mariposas, y una laguna. Teypi
camina por el muelle, baja al agua y **el agua le responde**.

- **El agua** es una malla de 120 × 120 con la ecuación de ondas corriendo encima a 60 pasos por
  segundo (`h₁ = (2h₀ − h₁ + K·∇²h₀)·amortiguación`, K = 0,34). Cada pisada mete una gota en la
  cuadrícula y el cuerpo empuja una estela continua. Las normales se sacan a mano de las diferencias
  de altura, que sale más barato que recalcular la malla entera.
  El sombreador hace Fresnel, reflejo de cielo y de bosque según hacia dónde apunta el rayo
  reflejado, refracción del fondo deformada por la normal, cáusticas de dos rejillas de seno
  cruzadas, absorción por hondura, espuma en las crestas y el rizo del viento —que se apaga con la
  distancia, si no titila la cuadrícula—. La laguna se planta al metro y medio a propósito: se le
  sigue viendo la arena, y Teypi camina en vez de nadar.
  *(El primer intento se iba al infinito: el ping-pong copiaba los arreglos en vez de cambiar las
  referencias y se perdía el cuadro anterior. Con la corrección la ola se queda en diez centímetros.)*
- **Los árboles no son lowpoly.** El tronco es una sucesión de nueve anillos que se van afinando y
  torciendo, cada rama es su propio tubo con curva, y la copa son entre 88 y 128 tarjetas de hojas
  con alfa repartidas en cúpula y en las puntas de las ramas. Treinta y cuatro árboles y cuarenta
  arbustos, todo fusionado en dos mallas.
- Treinta y ocho mariposas con aleteo —el sprite se achata y se inclina—, polvo al sol, y cuatro
  planos de cámara: el muelle entero desde la orilla, un lateral por encima del agua, uno de frente
  retrocediendo mientras se hunde, y uno que se va para arriba dejándolo solo.

El bosque se arma mientras la pantalla está en rojo, no al empezar la toma, para que no haya tirón.
