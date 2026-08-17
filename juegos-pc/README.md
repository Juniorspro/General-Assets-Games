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

### Las puertas: marco, botón y nada de ruido
La hoja flotaba en un agujero: la arista donde va la puerta era la única del mapa que **no dibujaba
pared**, así que quedaba un hueco de 3,00 × 3,20 m con una hoja de 2,40 × 2,75 m adentro y treinta
centímetros de ranura por cada costado. Ahora esa arista se rellena con **jambas y dintel** —del
mismo ladrillo, con la UV en proporción para que no se estire— y el hueco mide exactamente lo que
mide la hoja.

Y las puertas **no se abren solas ni suenan**: mientras la hoja está puesta **no se pasa**, y cuando
te acercás a menos de 3,4 m aparece abajo a la derecha un **botón de dedo** —`ABRIR` / `CERRAR`, o la
tecla `E`—. Al apretarlo la hoja **desaparece**, no gira; vuelve sola a los seis segundos, cuando ya
te corriste. Teypi no usa el botón: la hoja se le corre sola y en silencio.

De paso se corrigió el rumbo de todas las caras planas: se calculaban con `dx? dx*π/2 : (dy>0?π:0)`,
que da vuelta las paredes en `x` y las de `y`. Por eso el número del aula se leía espejado y los
pizarrones de las paredes laterales no se veían. Ahora es `atan2(dx, dy)` —o `atan2(-dx,-dy)` para lo
que se mira desde adentro de la celda—.

### Sonidos de verdad, y la voz de la serie
No hay nada del juego original: son grabaciones de **Wikimedia Commons, todas de dominio público**,
recortadas y pasadas a mono.

| en el juego | archivo de Commons | licencia |
|---|---|---|
| campana del recreo | `File:Old school bell 1.ogg` | dominio público |
| golpe seco (la regla, el impacto) | `File:Dull thud.ogg` | dominio público |
| chapoteo del agua | `File:Bathtub water splashes.ogg` | dominio público |
| bosque del muelle | `File:20090610 0 ambience.ogg` | dominio público |

Van en **MP3**, no en AAC: un Chromium sin códecs propietarios no decodifica el AAC y el banco entero
quedaba vacío en silencio. El MP3 lo abre todo, Safari incluido. Comprobado: 27 clips de voz y 4
efectos decodificados.

El chirrido de puerta se fue con las puertas que giraban: ahora desaparecen y no suenan.

**La voz es la de Rezona TV y ¡Teypi Time!**: meSpeak horneado con la voz española a velocidad 150 y
tono 62, y encima la misma cadena de siempre —anillo a 38 Hz, banda de 230 a 3400, realce en 1700 y
el bamboleo de la cinta sobre la velocidad de lectura—. Son treinta frases: las nueve del saludo, los
dieciséis lamentos, las dos del final y las tres del grito. Cada frase dura lo que dura su grabación, no un número
inventado.

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
tiene respuesta, y contestarla **te mata**. No hay cacería larga: aparece en el pasillo a la vuelta y
**embiste**. La velocidad se recalcula cada cuadro —lo que le queda de camino dividido lo que le
queda de reloj— así que corras a donde corras llega en **cinco segundos**, y si el reloj llega a cero
sin que te haya tocado, igual te alcanza. Mientras corre se sigue lamentando, cada dos segundos, y la
cinta se va rompiendo con él: el glitch, el ruido, el sangrado de color y el rodillo suben con el
cuadrado de lo que falta.

*(Dos arreglos del movimiento: la velocidad se saca del **largo real** de la polilínea que le queda,
no de la cuenta de celdas; y en cada cuadro se consumen **todos** los puntos del camino que entren en
el paso. Antes avanzaba de a un punto por cuadro, a esa velocidad se pasaba de largo y volvía, y se
quedaba rebotando sin llegar nunca.)*

### Cuando te agarra: el screamer
No hay cartel de derrota. Se te planta a metro y medio de la cara, se abalanza con `poseGrito`
—brazos abiertos, cabeza adelante, temblando a 42 Hz—, la cámara se sacude y el revelado se parte:
glitch al máximo, sangrado de color de 1 a 15, rodillo suelto y ruido.

El grito está **sintetizado**, no bajado: tres sierras que barren de 210 a 1750 Hz y caen, ruido
blanco con la formante barrida de 700 a 4200 y de vuelta a 420, todo a través de un `WaveShaper` con
`tanh(7.5x)` y un anillo a 53 Hz que lo vuelve máquina. Encima va la voz de Teypi gritando, pitcheada
a 0,62.

Recién después llega el rojo sangre y **«enserio perdoname»**, y a los cinco segundos y medio arranca
la cinemática. El muelle se arma mientras la pantalla está rota, para que la toma no tironee.

### La cinemática del muelle
A los cuatro segundos y medio la escuela se apaga y arranca otro recuerdo, en otra escena, con el
mismo revelado de cinta: un **muelle de madera**, el bosque cerrado atrás, mariposas, y una laguna.
Teypi camina por el muelle, baja al agua y **el agua le responde**.

#### El agua, con la técnica del repo
Está hecha con el método del **WebGL Water de Evan Wallace**, el que **jeantimex** portó a three.js
(`jeantimex/threejs-water`). Nada de una textura que se mueve:

- **Simulación en la GPU.** Una textura de 256 × 256 en ping-pong guarda altura en R, velocidad en G
  y las dos componentes de la normal en B y A. Tres pasadas de un cuadrilátero a pantalla completa:
  la gota (perfil de coseno alzado, sin bordes duros), el paso de la ecuación de ondas
  (`v += ½·∇²h ; v *= 0,9955 ; h += v`) y las normales por producto cruzado de las tangentes.
- **Cáusticas por área.** Se dibuja una malla de 200 × 200 donde cada vértice se refracta con la ley
  de Snell y se proyecta al fondo; el fragmento vale `área_plana / área_refractada`. Donde la ola
  junta los rayos, la razón crece y aparece la red de luz sobre la arena. En el canal verde va la
  sombra blanda de las piernas, que corta la red.
- **Reflejo de verdad.** Un render aparte con la cámara **espejada respecto del plano `y = 0`** —con
  el `up` invertido, como hace el `Reflector` de three—. El muestreo es **proyectivo**: se toma el
  punto del mundo y se lo proyecta con `uReflVP = proyección × inversa del mundo` de la cámara
  espejada. Usar la coordenada de pantalla del propio fragmento —que es lo que había antes— sólo vale
  para puntos que estén exactamente sobre el plano, y acá la superficie está levantada por la ola: de
  canto el reflejo se corría entero, que es el «según dónde mires está todo mal». Y la desviación de
  la ola se aplica **en el mundo**, no en pantalla —se desplaza el punto 0,85 m a lo largo de la
  normal y recién ahí se proyecta—, así se mueve como corresponde desde cualquier ángulo en vez de
  quedarse quieto.
- **Refracción de verdad.** Otro render sin la superficie puesta, muestreado con un corrimiento mayor
  y con **absorción de Beer** sobre el camino bajo el agua: cuanto más hondo, menos rojo vuelve.
- Fresnel de Schlick, sol partido en las crestas, espuma en las crestas y en la orilla, y **dos capas
  de movimiento** encima de la simulación: un oleaje largo y lento y el rizo fino del viento, que se
  apaga con la distancia para que no titile la cuadrícula.

**Los reflejos sucios** eran dos cosas. Una: en la pasada del reflejo entraba también todo lo que
está **debajo** del agua —el fondo de arena, los pilotes hundidos, las piernas de Teypi—, así que el
espejo mezclaba cielo con barro. Ahora se recorta en `y = 0`: los materiales comunes con el plano de
corte del renderer, y el shader propio del suelo con un `uCorte` que descarta. La otra: el
corrimiento del muestreo era fijo, y **de canto** un corrimiento chico ya barre metros de reflejo —de
ahí los chorreados verticales—; ahora se achica con el coseno del ángulo de visión.

Tres cosas que costaron encontrar y quedan anotadas:

1. **La superficie no se dibujaba.** La malla está en XY y el vértice la acuesta pasando `y → z`: eso
   es un intercambio de ejes, tiene determinante −1 e invierte el sentido de las caras, así que la
   superficie quedaba mirando al fondo y se descartaba. Lo que se veía era la chapa de agua lejana.
2. **La ola cruzaba el lago en dos segundos.** El esquema discreto avanza ~0,7 celdas por paso; con
   celdas de 0,31 m y dos pasos por cuadro daban 26 m/s. Un solo paso por cuadro y el dominio en 80 m
   dejan la ola en una velocidad de agua.
3. **El lago se hundía.** La estela metía altura negativa todos los cuadros y el nivel entero se iba
   para abajo: máximo 0, ninguna cresta, ningún reflejo. Ahora la estela va en **dipolo** —hunde
   adelante y levanta atrás— y el volumen se conserva.

#### La escalera al agua
Sentarlo en el borde era pelear contra el rig y se perdió esa pelea tres veces. Lo que pasa es que
**el muslo de la malla mide mucho más que su hueso**: el vértice más adelantado salía a `z = −8,03`
pesando 100 % de `LeftUpLeg`, o sea **1,35 m de muslo** colgando de una articulación que está a
0,49 m. Sentado con el muslo horizontal —como se sienta cualquiera— esa malla salía más de un metro
por delante de la punta del muelle y se veía un palo cruzando el aire.

Así que el muelle ahora tiene **una escalera al agua**: seis escalones desde el tablón hasta el
fondo, con largueros, patas y dos agarraderas arriba. Y Teypi la **baja caminando**, con paso corto,
el tronco echado atrás y las manos abiertas a los costados. Caminar es lo único que este esqueleto
hace bien, y bajando escalones no hay ninguna postura rara que lo delate. La altura del cuerpo la da
`alturaEscalon(z)`, que devuelve la tapa del escalón que le toca, así que pisa cada uno. Desde el
tercero para abajo ya está bajo el agua y cada paso rompe la superficie.

#### El bosque, cerrado y saturado
Un solo terreno manda: `tierra(x,z)` va de 0 (agua) a 1 (bosque) sumando la orilla de atrás, las de
los costados y la del fondo, y el suelo se interpola entre el fondo del lago y el piso del bosque.
La laguna queda como una ensenada, con playa de arena, y la orilla lejana cierra el horizonte sin
necesidad de trucos. Los árboles se plantan **sólo donde el suelo está sobre los 0,72 m** —antes
había un bosque entero parado adentro del agua—.

Los verdes se subieron de saturación —hojas, helechos, pasto y musgo— y la luz se hizo más cálida y
menos lavada, para que el follaje no se vaya a gris.

Son **170 árboles** con tronco de anillos que se afinan y se tuercen, ramas con su propia curva y
copas de 96 a 142 tarjetas de hojas con alfa en tres verdes distintos, más pinos, **cientos de matas,
helechos, pasto alto y troncos caídos**: unas 158 000 caras en nueve mallas fusionadas.

Cuarenta y seis mariposas con aleteo —el sprite se achata y se inclina—, polvo al sol, y **cinco planos**: el muelle entero desde la orilla, un
lateral mientras camina, uno desde el agua para verlo sentado y el pie entrando, uno de frente
retrocediendo mientras se hunde, y uno que se va para arriba dejándolo solo.

#### El morse y el cuelgue
Cuando la toma se va a negro no hay cartel de nada: pasa **directo al morse**. Queda una luz
parpadeando, y dice

> *Yo decidí dejar ese lugar también, cuándo podré salir? ya no hay esperanzas*

Cuatrocientos diecinueve pulsos a 45 ms el punto —treinta y un segundos y medio— con su pitido, los
símbolos acumulándose abajo y la frase revelada al final.

Y ahí **no hay botón de volver a empezar**: el juego se rompe. Dos segundos y medio de basura —bandas
de color, volcado de caracteres, el rodillo suelto y ruido en cada cuadro— y después la pantalla de
excepción con un código corrupto (`0x476∆:` y cuatro grupos de cuatro hexa), sin lienzo ni controles,
y un intento de `window.close()`.

**La grabación llega hasta el final.** El marcador y todo lo que se dibuja va dentro del lienzo, así
que la persecución, el grito, el rojo, el muelle, el morse y la basura del cuelgue entran en la
cinta; el `MediaRecorder` **se corta solo dos segundos antes de que el juego se caiga**, para que el
archivo cierre bien, y la caja de la cinta se saca de `#rot` —que arma su propio contexto de apilado
por el `transform`— y se pone a pantalla completa por encima de la pantalla de error, así se puede
descargar igual.

Mientras la pantalla está negra —el morse y el cuelgue— **se deja de dibujar el lago**: se conserva el
último cuadro en el destino y se pasa sólo la capa de interfaz por el revelado. Son treinta segundos
de no mover un polígono al pedo.

El bosque se arma mientras la pantalla está en rojo, no al empezar la toma, para que no haya tirón.

---

## Agua · un visor — `juegos-pc/Agua_Viewer.html`

Un archivo solo, 62 KB, sin más dependencia que three.js del CDN: todo lo demás —texturas, árboles,
piedras, cielo, sonido— se dibuja y se sintetiza en el momento. Es un estanque en un claro, hecho
para mirar el agua de cerca y para tirarle cosas adentro.

### El agua
La técnica es la del **WebGL Water de Evan Wallace**, en la versión que **jeantimex** portó a three.js
(`jeantimex/threejs-water`):

- **La ola corre en la GPU**, sobre una textura de **512 × 512** en ping-pong: R altura, G velocidad,
  B y A la normal. Cinco pasadas de cuadrilátero a pantalla completa —gota, desplazamiento por
  esfera, paso de la ecuación de ondas, normales— y ninguna vuelve a la CPU.
- **Las cáusticas** salen de comparar el área de un haz antes y después de refractarse con Snell
  sobre una malla de 260 × 260: donde la ola junta los rayos, la razón de áreas crece y aparece la
  red de luz en la arena.
- **El reflejo** es un render de verdad con la cámara espejada respecto de `y = 0`, recortando con el
  plano del renderer todo lo que está bajo el agua, y muestreado **proyectivamente** con la matriz de
  esa cámara —no con la coordenada de pantalla del fragmento, que sólo valdría si la superficie fuera
  plana—.
- **La refracción** es otro render sin la superficie, con **absorción de Beer** sobre el camino bajo
  el agua: cuanto más hondo, menos rojo vuelve.
- El borde del estanque **lo decide el terreno**, no la malla: el shader tiene la misma función de
  cuenco que el JS y descarta el fragmento donde el suelo asoma. De ahí salen gratis la línea de
  costa, la espuma de la orilla y la hondura exacta para la absorción.

### Lo que se tira adentro
Esferas, cajas, troncos y piedras. Cada uno tiene masa, volumen y densidad; la piedra se va al fondo
y la madera flota. **El acople va para los dos lados**: el objeto corre agua con la pasada de esfera
del original —suma el volumen que había en su posición vieja y resta el de la nueva, así el agua se
desplaza en vez de inventarse— y el agua lo empuja de vuelta con Arquímedes sobre la fracción
sumergida, más resistencia cuadrática y frenado angular.

Para saber la altura del agua donde está cada objeto sin frenar la GPU con una lectura, corre un
**espejo chico de la misma ecuación en CPU** (96 × 96) alimentado por los mismos golpes. Dos cosas
que costaron: la física hay que **subdividirla** —recortar el paso sin repetirlo hacía que en un
aparato lento todo cayera al treinta por ciento de velocidad, flotando— y la estela en el espejo de
CPU tiene que ir **chica y con tope**, porque si no la altura local salta y la flotación se vuelve
loca.

Al entrar hay chapuzón: gota en la simulación, salpicadura de partículas que a su vez vuelven a picar
el agua al caer, y un sonido sintetizado en el momento —ruido con la formante barrida más un plop
grave—.

### Los árboles
Los del bosque anterior, un escalón más arriba: el tronco y las ramas son **tubos por recursión en
tres niveles** —cada rama se abre en tres o cuatro, con su propia curva y su afinado—, la copa son
tarjetas de hojas con alfa en tres verdes distintos, y **todo se mueve con el viento** en el shader:
cada vértice trae en un atributo cuánto le toca balancearse según su altura sobre la base, así el
tronco queda quieto y las puntas se sacuden. Ciento dieciocho árboles, más helechos, pasto y piedras,
fusionados en diez mallas.

### Assets generados con Higgsfield
Ya no está todo dibujado a mano: las texturas y el edificio se generaron con **Higgsfield** y viajan
adentro del archivo.

| qué | cómo |
|---|---|
| corteza | `nano_banana_pro`, escaneo plano de corteza de roble, 1024², pasado por un cruce de bordes para que repita sin junta |
| hojas | `nano_banana_pro`, hojas reales sobre **negro puro**; el alfa sale de la luminancia |
| suelo del bosque | `nano_banana_pro`, hojarasca, musgo y tierra húmeda, sin costura |
| lecho del lago | `nano_banana_pro`, arena con ondas y cantos rodados, sin costura |
| cielo 360° | `nano_banana_pro` en 16:9, recompuesto a una **equirectangular 2048×1024**: la foto va del cenit al horizonte, espejada para que cierre a la vuelta, y debajo una bruma desaturada |
| edificio | `nano_banana_pro` para la vista de referencia y `image_to_3d` con texturas PBR; el GLB venía de 14 MB y se rebajó a 2 recomprimiendo sus cuatro texturas a 1024² |

Las hojas se guardan como **dos JPEG —color y alfa— que se juntan en un lienzo al arrancar**: el PNG
con alfa pesaba tres megas y así pesa doscientos kilos, y de paso salen las tres variantes de tono de
una sola foto.

### La ola que nunca para
Aunque no le tires nada, el agua se mueve: cuatro trenes de seno cruzados que levantan **la geometría**
—no la normal— en el vértice de la superficie, con su pendiente derivada a mano sumada a la normal en
el fragmento. La misma fórmula corre en JS dentro de `alturaAgua`, así lo que flota sube y baja con
ella en vez de quedarse clavado. El deslizador de oleaje maneja las dos cosas: la amplitud de esa ola
y la amortiguación de la simulación.

### Primera persona
Un botón cambia entre la órbita y caminar. En primera persona hay **palanca** en el pulgar izquierdo
—aparece donde apoyás el dedo—, **arrastre en la mitad derecha para mirar**, mira en el centro y un
**botón LANZAR** que tira una bola desde el ojo hacia donde estás mirando. Con teclado: `WASD`,
espacio para lanzar, `P` para cambiar de modo.

El cuerpo se pega al terreno, se frena y se hunde al meterse al agua —la cámara baja con vos—, y al
caminar dentro del estanque **cada paso rompe la superficie**: mete una gota en la simulación,
salpica y suena. Parado en el agua, el cuerpo también desplaza con la pasada de esfera. La caminata
va **subdividida**, igual que la física de los objetos: recortar el paso sin repetirlo hacía andar al
treinta por ciento en un aparato lento.

### Texturas PBR
Las texturas se rehicieron pidiéndolas como **escaneo de fotogrametría** —DSLR macro, luz plana
polarizada, sin sombras, «no ilustración, no pintado, no estilizado»—, que es lo que les saca el aire
de dibujo. Y de cada albedo se derivan sus mapas: **normal** por Sobel sobre la luminancia
—desenfocada primero, para que no salga ruido— y **rugosidad** por luminancia invertida. El suelo
usa los tres en un shader propio: la normal del mapa se suma a la del terreno —como el suelo es casi
horizontal alcanza con sumar la pendiente— y hay un especular Blinn-Phong cuyo exponente lo maneja la
rugosidad. La corteza pasó a `MeshStandardMaterial` con normal y rugosidad de verdad.

### Que una textura no parezca papel pintado
El problema más grande de una textura en un piso grande no es la foto: es **el repetido**. Una imagen
repetida en cuadrícula se delata a los tres metros y el ojo la lee como papel pintado por buena que
sea. El suelo ahora la muestrea **tres veces con giros y corrimientos distintos y las mezcla con un
ruido suave**, así no hay grilla; le suma una **capa de detalle** a otra escala que sólo aparece
cerca de la cámara —lo que se ve cuando estás parado encima— y **manchones de color en grande**,
porque ningún suelo real es de un solo tono. La normal sigue el mismo camino, así el relieve tampoco
repite.

### Los rascacielos
Dos torres generadas con `image_to_3d`, unos 29 000 y 27 500 triángulos con texturas PBR: una de
vidrio y acero de sesenta pisos y otra art déco de piedra. Van lejos y grandes —78 y 62 metros,
del otro lado del bosque— así que asoman por encima de las copas y se reflejan enteras en el
estanque. Los GLB venían de 14 MB cada uno y se rebajaron a 1,5 recomprimiendo sus texturas.

### Controles
Arrastre para orbitar, pellizco o rueda para acercar, y un toque sobre el agua hace olas. `TIRAR`
—o la barra espaciadora— larga un objeto desde la cámara; `ESFERA` cambia el tipo; `LLUVIA` la
prende; `VISTA` recorre cuatro encuadres, uno de ellos al ras del agua. En `AJUSTES` hay oleaje
—que es la amortiguación de la ecuación—, viento, turbiedad, fuerza de las cáusticas, altura del sol
(el cielo y la luz se recalculan) y peso del tiro.

---

## Pradera (`Pradera.html`)

Un mundo en primera persona con lomas, un lago que se simula de verdad y **pasto**. Pasto en serio:
un manto que tapa el terreno entero, no unas matas puestas acá y allá. Se juega con el teléfono de
costado —la pantalla se acuesta sola— con palanca en el pulgar izquierdo y la mirada en el derecho.

### El truco del pasto: las instancias no se mueven nunca
La forma obvia de hacer un campo infinito es mover las matas cuando el jugador camina, y es la que no
escala: reescribir treinta mil matrices y subirlas a la GPU cada vez que cruzás medio metro son
megabytes por segundo. Acá **ninguna instancia se toca jamás**. Cada una tiene un índice fijo `(i,j)`
en una grilla de N×N, y el propio shader calcula qué celda del mundo le toca según dónde está parado
el jugador:

```glsl
vec2 g = uBase + mod(iIdx - uBase, vec2(uN));   // celda del mundo
```

`uBase` es la celda del jugador menos N/2. Cuando cruza una celda, `uBase` cambia en uno y las matas
de **una sola columna** reaparecen del otro lado del campo. Todo el trabajo por cuadro es escribir dos
floats en un uniform. Por eso se pueden poner treinta mil matas y que igual corra en un teléfono.

El precio de decidir la posición adentro del shader es que **la altura del suelo también tiene que
salir de ahí**. Así que la fórmula del terreno está escrita dos veces —`suelo()` en JavaScript, que
es la que camina el jugador, y `sueloT()` en GLSL, que es la que planta el pasto— y si no dieran
exactamente lo mismo el pasto flotaría. Hay una prueba que lo verifica de verdad: `__dbg.probarSuelo()`
corre la versión GLSL sobre una grilla, la lee de vuelta de la GPU y la compara con la de JavaScript
punto por punto. El peor caso medido sobre 520×520 metros es **1,8 milímetros**.

De cada celda salen también, por hash, el corrimiento dentro de la celda, el giro, la altura, el
arco, el tono y **cuál de las dieciséis matas del atlas** le toca. Nada de eso vive en memoria.

### Que parezca pasto y no cartones verdes
Cuatro cosas, y ninguna cuesta casi nada:

- **El arco.** Cada mata se vuelca para su lado con su propia curva (`hh²`). Sin esto el pastizal es
  un cepillo de cerdas parejas, que es exactamente como se ve el pasto malo.
- **Ráfagas.** El viento no sopla parejo: dos trenes largos cruzan el campo modulando la amplitud, y
  se ven las olas pasar por encima del pastizal. Es el detalle que más lo vuelve vivo.
- **La normal gira a lo ancho de la hoja.** Una brizna es una cinta acanalada, no un plano: si se le
  pone la normal del plano se prende entera de golpe. Con la normal girada devuelve una franja de
  brillo, que es lo que hace un pastizal a contraluz.
- **Translucidez.** A contraluz la hoja se enciende. Sin eso todo pasto parece de plástico.

Encima va un degradado vertical —base fría y oscura, punta clara y dorada—, algún manojo seco suelto
y oclusión en la base del manojo.

### Tres capas, no una
Una sola capa densa es un desperdicio: a treinta metros una mata de veinte centímetros no llega ni a
un píxel y se paga igual. Van tres, cada una para su distancia, y cada una cuesta más o menos lo
mismo en pantalla:

| capa | celda | alcance | matas (PC) | geometría |
|---|---|---|---|---|
| manto corto | 0,34 m | 0 – 15 m | 8 464 | 3 planos cruzados × 3 tramos |
| manojos medios | 0,80 m | 4,5 – 36 m | 8 464 | 2 planos × 2 tramos |
| matas grandes | 1,85 m | 30 – 125 m | 17 424 | 2 planos × 1 tramo |

La tarjeta se **afina hacia arriba** —la punta ocupa la mitad que la base— así se pintan menos
píxeles transparentes y el contorno deja de ser un rectángulo.

### La colisión con el pasto
No hay colisión por hoja, que sería un disparate: hay **respuesta**. En el vértice, cada brizna que
cae cerca del jugador se aparta radialmente y se aplasta, proporcional a lo alto que esté sobre su
base, así que se abre un claro que te sigue y las puntas se doblan hacia afuera mientras la base
queda quieta. El terreno, los troncos y las piedras grandes sí tienen colisión dura, con un empuje
hacia afuera del círculo.

### La caminata
Se mueve por velocidad, no por teletransporte: hay aceleración, rozamiento y peso. **La cuesta arriba
frena y la cuesta abajo empuja**, proyectando el gradiente del terreno sobre la dirección de marcha.
Y la cámara hace todo lo que hace un cuerpo:

- **bamboleo en ocho** —el vaivén lateral va a la mitad de frecuencia que el vertical, que es la
  figura que dibuja la cabeza al caminar—, con amplitud según la velocidad;
- **inclinación con el terreno**: cabecea con la pendiente que tiene adelante y se ladea con la que
  tiene al costado, sólo mientras camina y con topes chicos, así se siente el desnivel sin marear;
- **ladeo al doblar y al andar de costado**, proporcional a la velocidad de giro;
- un **resorte de hundida** que junta las pisadas, el salto y el aterrizaje en una sola variable:
  cada paso hunde el ojo un toque y caer de alto lo flexiona de golpe;
- el **campo de visión se abre al correr** y se cierra al meterse al agua.

Todo resortea con la constante del cuadro; nada salta.

### El terreno son lomas, no montañas
Suma de senos con dos escalas: la corta ondula el campo cercano y la larga —sólo dos frecuencias,
anchas y redondeadas— levanta las lomas de lejos hasta unos 35 metros. No hay pared de cierre; el
horizonte se funde en la neblina, que es del color del cielo bajo y no gris, así el mundo no se corta.
El terreno es de 520 metros con 460 divisiones por lado: unos 423 000 triángulos, estáticos.

### El pase de post y la paleta
Antes cada shader propio escribía directo a la pantalla **sin codificar a sRGB**, que es por qué todo
se veía apagado y había que ir subiéndole el brillo a cada material a mano. Ahora la escena entera se
dibuja **en lineal** sobre un buffer en coma flotante —con multimuestreo, que el lienzo directo ya no
da— y al final se hace una sola vez lo que hay que hacer una sola vez:

1. **bright-pass** con rodilla suave y desenfoque separable a un cuarto de resolución;
2. **ACES** en su versión ajustada de Narkowicz, que tiene el hombro que evita que el cielo se queme
   en blanco plano;
3. contraste, saturación, **sombras al cian y luces a lo cálido**, y una viñeta apenas;
4. codificación a sRGB.

Eso es la paleta: cian saturado, verdes vivos, brillo derramado en los bordes. Los reflejos del agua
también van en coma flotante, porque en ocho bits el cielo se recortaría a blanco antes de llegar a
la superficie.

### Los árboles
Tronco de tubo que se afina, se tuerce y **se ensancha en la base**; ramas por recursión; y la copa
son tarjetas de un atlas de nueve manojos de hojas de arce fotografiados sobre negro. Dos detalles
hacen casi toda la diferencia con un montón de cartones: las tarjetas llevan la **normal apuntando
hacia afuera del centro de la copa** —así se sombrea como una bola, no como planos sueltos— y el
follaje **se prende a contraluz**. Hay tres especies: roble ancho, álamo alto y angosto, y una copa
abierta y caída.

### El follaje no es transparente, es recortado
Los árboles bajaron el cuadro a cero hasta que se encontró por qué: las hojas estaban con
`transparent: true`. Eso las manda a la pasada de mezcla, dejan de escribir profundidad y el follaje
se dibuja diez veces encima de sí mismo. Con `alphaTest` sola —`transparent: false`— se descarta el
píxel y listo: de 0 a 32 fps con la misma imagen.

### El agua
La del visor: mapa de altura en ping-pong sobre la GPU, cáusticas por diferencia de área del haz
refractado, reflejo con cámara espejada y muestreo proyectivo, absorción de Beer. Acá va a **1024²
de simulación, 320 divisiones de malla y 430² de haces para las cáusticas** en computadora, la mitad
en teléfono. Y se le agregó algo que importa cuando el lago es una parte chica de un mundo grande:
**si el lago no entra en cuadro no se paga nada**. Un `Frustum.intersectsSphere` contra la esfera del
lago decide, y caminando por las lomas eso es la mitad del trabajo del cuadro. En las dos pasadas del
agua, además, las capas de pasto cercanas se apagan y la lejana se recorta: en un espejo movido no se
nota, y se gana la mitad de lo que queda.

### El campo se mide solo
No hay forma de saber de antemano qué aguanta el aparato de cada uno, así que se mide: si el cuadro
no llega a 26 fps se recortan el alcance del pasto, la densidad, la resolución del reflejo y el
brillo derramado; si sobran más de 52, se devuelven. Tres niveles, y el que está puesto se ve abajo
a la izquierda.

### Las texturas
Generadas en Higgsfield como escaneos de fotogrametría: césped esmeralda, pasto seco con tierra a la
vista, arena de orilla y corteza de haya, cada una con su normal por Sobel sobre la luminancia
desenfocada y su rugosidad por luminancia invertida. El terreno las reparte por altura, pendiente y
manchones en tres escalas, y las muestrea tres veces giradas para que no se vea la grilla.

Las matas son **fotos de plantas de verdad**, y costó pedirlas bien. Los primeros intentos salían
dibujados o acostados —el modelo entendía «tuft» como un manojo cortado apoyado de costado— y hubo que
decirle la orientación con todas las letras: *base y raíz tocando el borde de abajo de su cuadrado,
hojas creciendo hacia arriba, como crece el pasto en un césped*. Con eso salieron dos láminas de
dieciséis matas distintas a 2K, todas diferentes entre sí: una de césped corto y lustroso y otra de
pastizal alto con espigas.

El procesado: el alfa sale del brillo sobre el negro, el color se des-premultiplica para recuperar el
borde, cada mata se recorta a su contenido y se reempaqueta apoyada en la base de su celda. Y una cosa
más: la foto trae el **cepellón** —los pelos marrones de la raíz colgando abajo—, que en el juego no
va porque la mata sale del suelo. Se corta subiendo desde el borde inferior mientras la fila siga
siendo tierra, y se para en la primera fila que ya es mayoritariamente verde.

El césped corto se usa en las dos capas de cerca; el pastizal alto queda sólo para el fondo, porque de
cerca convierte la pradera en un juncal y de lejos es justo lo que le faltaba al horizonte. El cielo es una panorámica de mediodía que se
envuelve en equirectangular —espejada para que no se note la costura— y se funde a la neblina por
debajo del horizonte. Ojo con el cenit: es la fila de **arriba** de la foto, y con `flipY` eso es
`v=1`; sin ese menos uno ve el suelo por encima de la cabeza.

### El giro de noventa grados
Igual que en Escuela Rezona: si el teléfono está parado se acuesta **todo** —lienzo, mandos y
botones— con un `rotate(90deg)` sobre un envoltorio, en vez de pedir pantalla completa. El dedo llega
en coordenadas de pantalla y hay que deshacer el giro a mano, porque el rectángulo que informa el
navegador es el envolvente y miente.

### Controles
Pulgar izquierdo: palanca, aparece donde apoyás el dedo. Derecho: mirar. `SALTO` y `TIRAR` son los
dos botones redondos de abajo a la derecha. Con teclado: `WASD`, espacio para saltar, `F` para tirar,
`R` para correr. En `AJUSTES` van densidad y altura del pasto, viento —que mueve pasto, hojas y
rizos del agua a la vez—, altura del sol, niebla, oleaje, brillo derramado y color.

---

## Fitz Roy (`Fitz_Roy.html`) · beta

Un pedazo real del planeta, explorable: **diez por diez kilómetros del macizo del
Cerro Fitz Roy**, en El Chaltén, Santa Cruz. Centro en −49,2900 / −73,0000. Nada
del relieve está inventado.

A diferencia de todo lo anterior, **este archivo no lleva nada adentro**: son
sesenta kilobytes y los treinta y cinco megas del mundo los sirve **jsDelivr**
desde este mismo repositorio (`mundo/fitzroy/`), anclados al commit para que la
URL sea inmutable y el CDN la cachee para siempre.

### De dónde sale cada cosa
| dato | fuente | resolución |
|---|---|---|
| altura del terreno | tiles *terrarium* de AWS (SRTM + Copernicus) | 6,2 m/px remuestreado a 2048² |
| color del suelo, 10 km | ESRI World Imagery | 2,4 m/px, 4096² |
| color del suelo, 4 km | ESRI World Imagery | 0,98 m/px, 4096² |
| cielo | Poly Haven, CC0 | panorámica HDR 4K |

Todo se remuestrea a una **grilla métrica regular**: el juego trabaja en metros,
no en Mercator, así que la ortofoto y el relieve encajan exactamente y el mapeo
de coordenadas es una resta y una división.

### La luz está horneada
Esto es lo que separa un mundo real de una foto pegada sobre un molde. Antes de
empaquetar, un script barre el propio mapa de alturas:

- **hacia el sol**, 420 pasos: si algo se levanta por encima de la recta que sube
  con la pendiente del sol, ese punto está a la sombra. Las aristas de granito
  proyectan sombras largas sobre el glaciar de al lado.
- **en dieciséis direcciones**, buscando el ángulo del horizonte: cuanto más alto
  el horizonte, menos cielo ve el punto. El fondo de los valles queda apagado y
  las cumbres, abiertas.

Las dos van en un PNG —rojo la sombra, verde la oclusión— y el shader las lee
como quien lee una textura. Calcularlas cuesta seis segundos una vez; hacerlo en
tiempo real con sombras dinámicas sobre dos millones de triángulos no daría.

### El pasto y el bosque le preguntan al satélite
Las instancias siguen sin moverse desde JavaScript (misma grilla envolvente que
en Pradera), pero acá la mata además **mira el píxel de la ortofoto donde le tocó
caer**: si el verdor no llega al umbral, o está por encima del límite del bosque,
o la máscara dice que ahí hay agua, no crece. Por eso la vegetación termina justo
donde termina en la realidad y el bosque de lenga aparece exactamente en la
ladera donde el satélite lo ve, sin que nadie lo haya colocado.

La altura la resuelve el shader con una bilineal a mano sobre la textura de
relieve —a propósito con filtro *nearest*, porque interpolar bytes de una altura
codificada daría saltos de mil metros al cruzar de 255 a 0—. La misma bilineal
está escrita en JavaScript para que camine el jugador, y `__dbg.probarAltura()`
compara las dos leyendo la GPU de vuelta: **6,7 milímetros de peor caso** sobre
los diez kilómetros.

### Los filtros
La escena entera se dibuja en lineal sobre un buffer en coma flotante con
multimuestreo, y al final va un solo pase: brillo derramado, ACES, contraste,
color, **nitidez de contraste adaptativo** y viñeta. La nitidez es la que más se
nota en un mundo hecho de fotos —realza sólo lo que ya tiene filo y se limita con
el mínimo y el máximo del vecindario, así no aparecen halos—. Todo se puede tocar
en vivo desde `AJUSTES`.

A eso se le suma, en el terreno, una capa de **detalle a escala de metros**: a un
metro por píxel la ortofoto sola se ve como un cuadro borroso, y multiplicarla
por un grano fino centrado en 0,5 —que además entra por la normal, no sólo por el
color— la devuelve a la realidad.

### Lagunas
Salen de una máscara horneada: dónde el relieve está plano y la ortofoto es
turquesa glaciar o muy oscura. Comparten la malla del terreno —cero geometría
extra— y se descarta el píxel donde no hay agua. El agua de deshielo casi no deja
ver el fondo, así que el shader es fresnel contra el cielo HDR más un color
propio, sin refracción.

### Controles
Pulgar izquierdo: palanca. Derecho: mirar. `SALTO` y `VOLAR` abajo a la derecha
—con el mundo a esta escala, a pie se tarda media hora en cruzarlo—. `MIRADOR`
vuelve al punto de partida, que tampoco se eligió a ojo: se buscó sobre los datos
el lugar con más verdor, pendiente caminable, entre 450 y 1050 metros y con línea
de vista despejada a la cumbre. Con teclado: `WASD`, espacio, `V` para volar,
`R` para correr.

### Qué le falta a la beta
- La ortofoto de ESRI tiene términos de uso propios: sirve para probar, pero para
  publicar habría que pasar a Sentinel-2, que es abierta aunque llega a 10 m/px.
- El relieve viene de un modelo de 30 metros: las agujas de granito del Fitz Roy
  salen redondeadas y la cumbre marca 2866 m en vez de 3405.
- No hay nieve propia ni hielo con material aparte: lo blanco es blanco porque la
  foto es blanca.
- Falta el agua con simulación y objetos, que sí está en Pradera.

---

## Valle (`Valle.html`)

El intento de mundo hecho a mano con **materiales PBR descargados** (AmbientCG,
Poly Haven, todos CC0) servidos por jsDelivr desde `mundo/valle/`. El archivo son
setenta y siete kilobytes y los treinta y cinco megas de texturas y modelos viven
en el repositorio.

Sirve como referencia de tres cosas que costaron encontrar:

- **Choque de nombres de archivo.** El mapa ARM del pasto se llamaba `pasto_a.jpg`
  y pisó al alfa del atlas de matas, que se llamaba igual. Resultado: todas las
  matas dibujaban el fondo negro del atlas y el mundo entero se veía negro. Se
  arregló renombrando el atlas a `matas_rgb.jpg` / `matas_a.jpg`. Cuando algo se
  ve negro y el shader está bien, mirá los nombres antes que el código.
- **La decimación por agrupamiento de vértices destruye los UV.** Fusionar
  vértices cercanos junta puntos que están en zonas distintas del atlas, y la
  planta escaneada sale negra. A las rocas se les puede aplicar; a nada que use
  atlas.
- **El lago plano.** El plano del agua estaba rotado con `mesh.rotation`, así que
  dentro del shader `position.z` valía cero para todos los vértices y el lago
  colapsaba a una línea. La rotación va en la geometría —`.rotateX(-Math.PI/2)`—,
  no en el objeto, si el shader lee `position`.

Quedó fuera de la línea principal porque el pedido cambió: nada de PBR
descargado, todo procedural. De ahí sale lo que sigue.

---

## Pastizal (`Pastizal.html`)

Un campo verde y **pasto de verdad**: geometría, no fotos pegadas en cartelitos.
**Cero archivos externos** —ni una imagen, ni un modelo, ni un sonido—. Lo único
que baja de la red es three.js. Ahora también hay **un casco de estancia**, y
sigue sin bajar un solo archivo.

### Los edificios

Casa grande con galería, galpón, dos silos, dos molinos, un rancho lejano y
alambrado. **5.248 triángulos** para todo, un solo material y una sola malla.

No son cajas: la pared se emite **con aberturas de verdad**. Se le pasa de dónde
a dónde va y una lista de huecos, y sale como machones entre huecos, dinteles
arriba y antepechos abajo, más el marco con espesor y el vidrio. Por eso la
puerta es un agujero real y **se entra caminando**.

Tres cosas hacen que no queden pegoteados encima del pasto:

1. **Comparten el sol y la niebla.** El material se anota en `MATS`, así que
   cuando se mueve el sol o se cierra la niebla, los edificios acompañan. Un
   material con luz propia cantaría a la legua.
2. **El pasto no los atraviesa.** Cada edificio deja su *huella* —uno o varios
   círculos— en un uniforme que miran los tres materiales del pasto y el del
   suelo. Las briznas de adentro mueren con borde suave, y el suelo en ese
   sitio se pela y se pone tierra pisada, con un oscurecido de contacto contra
   las paredes que hace las veces de sombra propia.
3. **Se chocan.** Cada trozo de pared deja una caja orientada. El jugador se
   resuelve pasándolo al sistema de cada caja y sacándolo **por el lado del que
   menos hundido está**: sacarlo por el otro eje lo teletransportaría a la
   vuelta de la pared. Las cajas bajas —el alambrado— dejan de contar si venís
   saltando, así que el alambrado se salta.

La textura es de shader y **en metros del mundo**: el acanalado de la chapa, los
tablones, las hiladas trabadas del ladrillo y los canales de la teja salen de la
posición, así que dos paredes nunca repiten el mismo dibujo. La chapa no modela
la onda: la mete en la normal, una línea, y da todo el relieve.

**Dos errores que sólo se ven con una captura**, y por eso se corrió en un
navegador de verdad antes de subir:

- El techo no llevaba la rotación de las paredes. La casa quedaba con el techo
  cruzado en diagonal. En el código se leía perfecto.
- La cumbrera corría a lo ancho en vez de a lo largo, así que una casa de trece
  por ocho quedaba con el techo como una carpa.

### PBR de verdad

La iluminación pasó de una difusa con un brillo puestos a ojo a
**Cook-Torrance**: GGX para la distribución, Smith para el sombreado
geométrico, Schlick para el Fresnel. Lo que separa una superficie de otra no es
el color: es **cuánto se abre el reflejo** (rugosidad) y si el reflejo se tiñe
del color propio (metal) o queda blanco (dieléctrico). Con eso, el mismo gris
es zinc o es revoque.

| Material | Rugosidad | Metal |
|---|---|---|
| revoque a la cal | 0,94 | 0 |
| chapa de zinc | 0,38 → 0,82 con óxido | 0,70 |
| teja | 0,62 → 0,92 con musgo | 0 |
| madera | 0,78 | 0 |
| ladrillo | 0,90 | 0 |
| vidrio | 0,045 | 0 |
| hierro | 0,40 | 0,92 |

Todo procedural: no hay un solo archivo de textura. El acanalado, las hiladas y
los canales de la teja salen de la posición en metros del mundo, y la onda de
la chapa se mete en la normal en vez de modelarse.

**Un tercer error que costó otra captura:** con Lambert crudo, todo lo que no
mira al sol se queda sólo con el cielo, y el cielo es azul saturado — así que
la casa, los silos y el techo se pusieron **azules**. Se arregló con **difusa
envolvente** (se corre el coseno medio grado y se renormaliza, porque al aire
libre el sol rebota y sigue llegando algo) y **desaturando el cielo antes de
usarlo como luz**: como color del cielo está bien saturado, como iluminación
tiñe todo y las paredes blancas dejan de ser blancas.

### Sombras sin mapa de sombras

El suelo es un plano en y=0 y cada edificio es un bulto de altura conocida, así
que la sombra sale por geometría: se corre la huella en sentido contrario al
sol una distancia `alto/tan(elevación)` y se la estira en esa dirección. Para
un bulto redondo sobre un plano es **exacta**, y —a diferencia de un shadow
map— **la reciben también las briznas**, que son cientos de miles y se dibujan
por instancia. El borde se difumina cuanto más larga es la sombra, porque con
sol rasante una sombra no tiene filo.

### El pasto se aplasta donde caminás

Una textura de un canal cubre una ventana de 140 m alrededor del jugador. Cada
pisada estampa un disco; el buffer se **corre en texeles enteros** cuando te
alejás del centro, así la huella queda anclada al mundo y no a vos. El shader
de las briznas la lee y las acuesta —volcándolas hacia su propio lado al azar,
que es como queda el pasto pisoteado de verdad, no todo peinado para el mismo
lado— y el suelo debajo se oscurece. Se levanta solo en unos 35 segundos. Al
caer de un salto se aplasta más y más ancho.

Un arreglo de uniformes no servía: se queda corto a los pocos metros de rastro.

### El personaje en primera persona

Cuerpo riggeado de verdad, esqueleto Mixamo de 49 huesos, mezclando
**Idle / Walk / Run** por velocidad, con el paso acelerado según lo rápido que
vayas — si no, los pies patinan contra el piso.

Cuatro decisiones que lo hacen funcionar:

1. **La cabeza y el cuello se esconden**, achicando sus huesos **después** de
   que el mixer escribió las poses; antes, la animación los vuelve a pisar. La
   cámara está dentro del cráneo: sin esto se ve el interior de la cara.
2. **La escala sale del hueso de la cabeza, no de la caja del modelo** — pero
   con los once centímetros de descuento que hay entre ese hueso y los ojos.
3. **El cuerpo no cuelga de la cámara.** Es tentador colgarla del hueso de la
   cabeza para que el cabeceo sea "real", pero entonces al mirarte los pies se
   ven patinar, porque el mundo se mueve con tu cabeza. El cuerpo se queda
   plantado y va 30 cm atrás.
4. **Plano cercano propio para el cuerpo**, hecho en el fragmento.

#### La herradura negra
Esto tardó tres vueltas en salir bien, y las tres se vieron sólo mirando
capturas. Mirando para abajo aparecía **una herradura negra gigante** tapando
media pantalla, más un brazo cruzado por delante.

El motivo de fondo: el hueso `mixamorig:Head` **no está en los ojos**, está en
la base del cráneo, unos once centímetros más abajo. Igualarlo a `altoOjo`
hacía un cuerpo un 7% más grande de la cuenta y, peor, dejaba la cámara metida
en el hueco del cuello. Lo que se veía era el **interior del torso**: caras de
atrás, que no reciben luz, o sea negras.

Esconder huesos no alcanza —el hombro y el trapecio siguen ahí, y la malla está
pesada a varios huesos, así que achicar uno deforma al de al lado—. La solución
que usan los juegos es un plano cercano propio para el cuerpo; acá sale más
barato hacerlo en el fragmento, con `onBeforeCompile` sobre el material que trae
el glb:

```glsl
// vértice
vProf = -mvPosition.z;
// fragmento
if(vProf < 0.30) discard;
```

Treinta centímetros. Nada de lo que uno **quiere** ver cae adentro de ese radio
—el pecho mirando abajo está a 45 cm, las piernas a 90— y todo lo que se veía
por dentro sí.

**El salto no venía en el modelo** —trae Idle, Walk y Run y nada más—. En vez
de cambiar a un modelo de robot, se fabrica: rotaciones sobre doce huesos en
cuatro tiempos (impulso, encogida en el aire, estirada para caer, vuelta a lo
normal) armadas como un `AnimationClip` en tiempo de ejecución.

Y una que sólo se ve corriendo el juego: **el cuerpo se dibujaba negro**. Todo
el campo usa materiales propios que resuelven la luz a mano, así que la escena
no tenía ni una luz; el glb viene con `MeshStandardMaterial` y sin luces es una
silueta. Se agregaron una direccional y una hemisférica pegadas al mismo sol
que el resto — y sólo las mira el personaje.

El modelo son 2 MB y se baja **en segundo plano**: el campo anda desde el
primer cuadro y si el cuerpo no llega, se juega igual.

### El cielo 360, el río y los interiores

**La panorámica 360 va como CAPA DE NUBES sobre el cielo calculado, no en su
lugar.** A propósito: la foto trae la estructura de nube que ninguna cuenta te
da, pero el degradado, el color de la hora y el sol siguen saliendo de la
dispersión, porque son los mismos que iluminan el pasto. Pegando la foto entera,
al mover el sol el cielo se quedaría quieto mientras el campo cambia, y eso
canta de lejos. De la foto se toma sólo lo que sobresale de su propio cielo de
fondo —o sea la forma de la nube— y se la vuelve a iluminar con el sol de la
escena. La costura se fundió a mano sobre 160 px antes de subirla.

**El río tiene la línea del cauce ANALÍTICA**, una senoide. Eso importa más de
lo que parece: el pasto, el suelo, la geometría de las barrancas y el agua
consultan todos la misma curva con una línea de cuenta, en vez de pasarse una
lista de puntos. Curvas gratis y siempre coinciden entre sí.

El agua no es simulación de fluidos —eso no entra en un cuadro— pero sí tiene lo
que hace que el ojo lea agua: normal de tres capas de olas corriendo río abajo,
Fresnel (de frente se ve el fondo, de canto el cielo), reflejo calculado con la
**misma función de dispersión** que el cielo real, absorción tipo Beer (el rojo
se va primero con la profundidad), refracción del lecho movida por la propia
ola, destellos del sol rotos sobre las crestas y espuma contra las orillas.

**Un bug que sólo se ve mirando:** el suelo es un plano infinito a y=0 y el agua
va más abajo, así que el plano tapaba el río entero. El suelo ahora descarta el
canal.

**Interiores.** Adentro de una casa la luz no es la de afuera bajada de volumen:
es otra luz. Se resuelve con dos cosas exactas y baratas:

- **Una caja por interior.** Si el punto está adentro, se cortan el sol y casi
  todo el cielo; queda el rebote cálido.
- **Un test de visibilidad por abertura.** Desde el punto se tira el rayo hacia
  el sol y se pregunta si cruza el rectángulo de alguna ventana o puerta. Si lo
  cruza, ese punto ve el sol. Eso da **el paño de luz en el piso**, movido según
  la hora, sin ningún mapa de sombras.

Lo que hace que se lea como interior no es que esté más oscuro: es que **el
contraste se da vuelta** — el piso junto a la ventana queda más claro que la
pared del fondo.

**El suelo de tierra** pasó de una sola frecuencia de sesenta centímetros —un
manchón marrón a medio metro del ojo— a cuatro escalas, con pedregullo, grietas
de barro seco y relieve por derivadas del propio ruido, todo desvanecido con la
distancia para que no aliasee.

### El render, efecto por efecto

**Luz y materiales (28)** — dispersión de Rayleigh · dispersión de Mie ·
absorción tipo ozono · extinción del camino del sol · disco solar con
oscurecimiento de limbo · perspectiva aérea · sombras de nubes proyectadas al
plano de nubes · sombras de edificios analíticas · penumbra que crece con la
longitud de la sombra · oscurecimiento de contacto · GGX · Smith · Fresnel de
Schlick · metalicidad y rugosidad por material · difusa envolvente ·
irradiancia hemisférica del cielo · rebote verde del suelo · especular
ambiental con Fresnel a rugosidad · translucidez de la brizna a contraluz ·
especular de hoja en franja · normal abombada de la brizna · normal procedural
de la chapa acanalada · normal procedural de la teja · óxido que sube la
rugosidad · musgo que sube la rugosidad · humedad capilar en el revoque ·
direccional y hemisférica para el personaje · pisadas que apagan el pasto.

**Post (28 etapas)** — extracción de brillo con rodilla suave · bloom en cinco
escalas · borrón separable en cruz · reconstrucción ascendente · rayos
crepusculares por marcha radial · luminancia logarítmica · reducción 64→8→1 ·
adaptación temporal asimétrica del ojo · exposición automática acotada ·
desenfoque de movimiento direccional · distorsión de barril · aberración
cromática radial · nitidez de contraste adaptativo · suciedad de lente ·
estiramiento anamórfico · halación · destellos fantasma · ACES · balance de
blancos · levante y ganancia · tinte separado de sombras y luces · contraste ·
vibranza · viñeteo cos⁴ · grano animado por luminancia · tramado ordenado ·
paso a sRGB · MSAA 4× en escritorio.

El orden importa y es el orden físico: todo lo que imita a la **escena** (rayos,
exposición, bloom) va antes del mapeo de tono; todo lo que imita a la **lente y
al sensor** (aberración, distorsión, suciedad, grano) va después.

**Tres errores de escala que sólo se ven con una captura:**

1. Los coeficientes de dispersión están en unidades de la atmósfera real —por
   metro, del orden de 1e-6— y las distancias acá son de juego. Usarlos tal
   cual sumaba luz dispersada del orden de **3 en lineal a cincuenta metros**:
   la imagen entera salía lavada de cian. De ellos se toma sólo la **proporción
   entre canales**, que es lo que da el color, y la densidad la pone el
   deslizador de niebla.
2. La luz que entra en el camino va con `(1 − transmitancia)`, **no** con la
   distancia suelta: así está acotada y a mil metros satura en vez de crecer
   sin freno.
3. La aberración cromática desplaza con `q · uAber · r²`, o sea **al cubo del
   radio**. Con 0,10 los postes del alambrado salían con borde rojo de un lado
   y cian del otro, de veinte píxeles. El valor útil es diez veces más chico.

Y una de exposición: una autoexposición suelta (`clamp(0.36/L, 0.25, 3.2)`)
lavaba la escena entera en cuanto el promedio bajaba. Los límites quedaron
estrechos a propósito — esto corrige, no reinventa.

El material va con `DoubleSide` y la normal invertida en las caras traseras
(`gl_FrontFacing`), que blinda cualquier triángulo mal ordenado: sin eso, una
cara al revés se ilumina como si el sol le pegara desde adentro.

**460.500 briznas** en pantalla, **460.500 triángulos** —uno por brizna— y cada
una es una hoja rígida que se afina hasta la punta, se inclina entera con el
viento y se aparta cuando pasás caminando.

### La brizna: un triángulo, y por qué
Antes cada brizna era una cinta de S tramos: dos vértices por tramo más uno de
punta, o sea **once vértices y nueve triángulos** con S=5. La capa cercana sola
eran 810.000 triángulos, y toda esa geometría existía para **una** cosa: poder
arquear la hoja a lo largo. Sacado el arco, la cinta no tiene nada que hacer.

Queda el triángulo pelado:

```
posición = (-1,0,0)  (1,0,0)  (0,1,0)
```

El afinado hacia la punta sale **gratis de la forma** —el vértice de arriba ya
está sobre el eje—, así que no hace falta ni el `pow(v)` del ancho ni índices.

| | antes | ahora |
|---|---|---|
| triángulos por brizna | 9 / 7 / 3 | 1 |
| triángulos del campo | 1.640.000 | 460.500 |
| briznas | 248.000 | 460.500 |
| ancho de la hoja cercana | 9 mm | 27 mm |

O sea: **la cuarta parte de la geometría, casi el doble de pasto** y hojas tres
veces más anchas, que es lo que hace que se lean como hoja y no como pelo. Es el
pasto de Roblox, y no es una concesión: a esa distancia una cinta arqueada de
nueve triángulos y un triángulo del mismo ancho dan la misma silueta.

### Sin arco: la hoja es rígida
El arco se fue del todo. La brizna se inclina **entera** sobre su base, como una
aguja clavada que el viento vuelca:

```glsl
float incl = uArco*(0.06+r6*0.10) + uViento*raf*osc*0.30;
incl += pisado*(1.15+r3*0.30);
float ci=cos(incl), si=sin(incl);
vec3 eje = vec3(dir.x*si, ci, dir.y*si) * (v*alto);
```

No hay `v*v`, no hay derivada del arco y no hay normal que cambie a lo largo de
la hoja: la tangente **es** el eje. Eso es lo que permite que sea un solo
triángulo, porque un triángulo no puede curvarse.

La normal sale del producto cruz entre el lateral y ese eje, más un
**abultamiento lateral** —`+ lat3 · lado · 0.55`— que le miente a la iluminación
diciéndole que la brizna es una hoja acanalada y no un triángulo plano. Sin eso,
media brizna se apaga de golpe cuando cruza el ángulo del sol y el campo
parpadea.

### El descarte temprano
Lo primero que hacía el shader de briznas eran **dos fbm**, la distancia a cada
edificio, el río, el mapa de sombras y la sombra de las nubes. Todo eso corría
igual para una brizna que estaba detrás de la nuca del jugador, y después se
multiplicaba por cero.

La grilla es un **cuadrado** y lo que se dibuja es un **círculo** adentro: las
esquinas son un cuarto de las briznas y no se ven nunca. Y de las que quedan, la
mitad larga está detrás de la cámara.

```glsl
vec2 rel = P - uOjo.xz;
float dcam = length(rel);
float atras = dot(rel, uMira.xz);
if(dcam > uDist || atras < -3.0){ gl_Position = vec4(2.0,2.0,2.0,1.0); return; }
```

Dos restas y un producto escalar, antes de tocar nada, y se va cerca del **60%
del trabajo del campo**. Funciona porque el pasto tiene **una sola cámara**: no
entra en el mapa de sombras (está en `NO_PROYECTA`) ni en el reflejo planar (ahí
se apaga la malla entera). Si algún día se dibujara desde otro punto de vista,
esto hay que apagarlo.

En el fragmento van tres cosas que hacen la diferencia:

- **Doble cara honesta**: `if(dot(N,E)<0.0) N=-N;` — mirando la brizna desde
  atrás la normal apunta al revés y sale negra.
- **Traslucidez** (`atras`): el pasto contra el sol se prende, no se apaga.
  `pow(max(dot(-E,luz),0.0), 2.4)`, más fuerte cerca de la punta, donde la hoja
  es más fina.
- **Oclusión por altura**: la base de la brizna está metida entre las demás y
  recibe menos cielo; el factor va de 0,42 abajo a 1,10 arriba. Es lo que le da
  profundidad al pastizal cuando mirás para abajo.

### Nada se mueve desde JavaScript
La grilla es de N×N celdas y las instancias **jamás cambian de sitio**. Cuando el
jugador cruza el borde de una celda sólo se actualiza un `vec2`:

```glsl
vec2 g = uBase + mod(iIdx - uBase, vec2(uN));
```

La instancia que quedó atrás reaparece del otro lado con otra semilla y otra
altura. Cero copias de buffers, cero `needsUpdate`, cero picos de recolección de
basura al caminar.

### Tres capas por distancia
| capa | N | celda | ancho | alcance | briznas |
|---|---|---|---|---|---|
| cerca | 430 | 5,2 cm | 0,19 × alto | 11 m | 184.900 |
| media | 400 | 14 cm | 0,24 × alto | 30 m | 160.000 |
| lejos | 340 | 46 cm | 0,42 × alto | 88 m | 115.600 |

El ancho va **relativo al alto**, no en metros: una hoja de 0,19 mide un quinto
de lo que mide de alto, que es la proporción que se lee como hoja.

Cada capa arranca donde termina la anterior (`cerca`) para no pagar dos veces el
mismo metro cuadrado. La lejana lleva pocas briznas por metro, así que las suyas
van más anchas: a treinta metros nadie distingue una brizna de tres juntas, pero
el suelo pelado entre medio sí se ve, y desde arriba canta.

### El viento tiene ráfagas
Un seno solo da un pasto que vibra. Acá hay **dos trenes largos de baja
frecuencia** que modulan la amplitud del temblor rápido:

```glsl
raf = 0.48 + 0.36·sin(P.x·0.13 + P.y·0.10 − t·0.65)
           + 0.20·sin(P.x·0.041 − P.y·0.063 − t·0.33)
```

Se ve la ola cruzar el campo. Es lo que hace que parezca campo y no alfombra.

### El jugador aparta el pasto
No hay colisión: hay un empujón radial en el shader de vértices, con caída suave
desde el centro y proporcional a la altura del vértice, más un aplastado hacia
abajo. La brizna se abre y se agacha al pasar, y vuelve sola.

```glsl
emp = 1.0 − smoothstep(uRJug·0.25, uRJug, dd);
loc.xz += (dj/dd) · emp · v · alto · 0.9;
loc.y  -= emp · v · alto · 0.55;
```

### El suelo cuenta la misma historia
El plano verde sigue al jugador, así que la posición del mundo hay que sacarla de
`modelMatrix` y no del atributo — si no, los manchones de tono viajan con vos y
se nota enseguida. Usa **el mismo campo de ruido** que decide la altura del
pasto: donde el pasto es alto el suelo es más oscuro, donde ralea tira a paja. El
suelo se dejó bien oscuro a propósito: si compite en brillo con las briznas, cada
hueco entre briznas se convierte en un punto claro y el campo se ve sucio.

### Pipeline lineal, una sola pasada de grado
Todo se dibuja **lineal** sobre un render target HalfFloat con MSAA, y una única
pasada final hace bloom, ACES (Narkowicz), contraste, saturación, **nitidez
adaptativa** —acotada por el mínimo y el máximo de los cuatro vecinos, para que
no aparezcan halos— viñeta y codificación sRGB.

Esto no es un lujo: **un `ShaderMaterial` propio no codifica sRGB solo**. Escribir
directo al framebuffer desde un shader a mano es la razón por la que todo lo
anterior se veía apagado, y el diagnóstico costó bastante.

### Calidad automática
Tres niveles. Miden fps y ajustan **alcance** de cada capa y **densidad**; el
nivel 0 además apaga el bloom. Cuando la densidad mata una brizna, su altura pasa
a cero, los vértices colapsan en un punto y el triángulo se descarta antes de
rasterizar: el costo de fragmentos desaparece del todo.

### La optimización, y qué NO la resolvió
En un teléfono de gama media el juego apenas pasaba de 30 fps. Dos cosas que
parecían candidatas y no lo eran:

- **WebAssembly no aporta nada acá.** Acelera trabajo de CPU en JavaScript, y
  este juego casi no hace: las 322.600 briznas no se mueven nunca desde JS —cada
  una resuelve su posición, su viento y su sombra dentro del shader— y por
  cuadro JS escribe unos veinte uniformes y llama a dibujar. El cuello está en
  la GPU, en **fragmentos**, y WASM no toca la GPU.
- **No hay SSAO que sacar.** La oclusión ambiental del pasto y de los edificios
  es analítica desde el principio: sale de la altura de la brizna y de la
  distancia a la pared, adentro del shader, sin ningún pase de pantalla.

Lo que sí lo movió:

| | antes | ahora |
|---|---|---|
| resolución interna (calidad media) | 1,55 | **1,15** — 45% menos píxeles |
| briznas (móvil) | 177.000 | **97.000** |
| desenfoque de movimiento | todos los cuadros | **sólo al girar** |
| reflejo planar del río | siempre | **sólo a <95 m del cauce** |
| nubes dentro del reflejo | 24 pasos | **4** |

**La resolución interna es la palanca más grande que hay**, y por eso va primero.
Todo el costo de este juego escala con el ÁREA: el pastizal sobredibuja, el cielo
marcha nubes por píxel y la cadena de post pasa seis veces por la pantalla
entera. Bajar de 1,55 a 1,15 saca el 45% de los píxeles y con ellos el 45% de
todo lo anterior, sin tocar un solo efecto. La nitidez que se pierde la devuelve
el pase de nitidez, que ya estaba.

El **desenfoque de movimiento** tenía el corte adentro del shader
(`if(l<0.0004) devolvé el píxel tal cual`) y eso **no ahorra nada**: el pase
corría igual, leía la pantalla entera y la escribía otra vez. Nueve lecturas por
píxel a resolución completa es el pase más caro de la cadena y la cámara está
quieta la mayor parte del tiempo. Decidirlo en JavaScript lo saltea de verdad.

Y una trampa que sólo aparece al hacer configurable la calidad: **la marcha
radial de los rayos solares decaía por MUESTRA**, no por distancia. Bajar de 24 a
16 pasos hacía los rayos *más largos y más fuertes*, que es lo contrario de lo
que se buscaba. El factor va elevado a `24/pasos`.

### El menú de inicio
No es una pantalla aparte: el mundo ya está corriendo detrás y **la cámara pasea
sola** alrededor del casco de estancia, a 54 m de radio y 3,4 m de alto. Así el
menú no es una pantalla de carga disfrazada, es la primera postal.

Trae tres cosas y nada más: **idioma** (inglés por defecto, español y portugués),
**gráficos** (auto / baja / media / alta) y `PLAY`. Al tocar jugar, el menú se
funde en un segundo y la cámara vuelve a las manos del jugador en el origen.

El diccionario de idiomas vive entero en un objeto y `aplicarIdioma()` repinta el
DOM. Dos cosas hay que acordarse de repintar a mano porque **no son DOM**: los
botones que se dibujan en el lienzo de mandos, y el globo de diálogo —que
cachea por texto, así que se lo vacía (`GLOBO.texto=''`) para forzarlo—.

Mientras el menú está arriba, `moverMision()` sale temprano: la órbita pasa cerca
de los espíritus y si no, la historia arrancaba antes de tocar `PLAY`.

### Las nubes: salto de vacío y sombra reusada
Las nubes volumétricas son lo más caro del cuadro cuando se mira al horizonte, y
en un teléfono eran **el** cuello. Tres cortes, ninguno visible:

1. **Salto de vacío.** Un rayo rasante cruza cuatro kilómetros y medio de banco y
   la mayor parte de eso es **aire entre cúmulos**. Antes se pagaba el paso
   completo en cada uno de esos pasos vacíos para multiplicarlo por cero. Ahora,
   mientras no hay nada, se avanza al **doble y pico**. El borde de entrada queda
   cuantizado a un paso fino — que es exactamente lo que el jitter ya estaba
   desordenando, así que no se ve.
2. **La sombra hacia el sol se recalcula un paso sí y uno no.** Es la mitad de la
   marcha de luz. Dentro de un cúmulo la sombra cambia despacio: un paso de
   retraso en un degradado suave no se ve, y son catorce muestras del campo menos
   por cada paso salteado.
3. **No se erosiona el núcleo.** La erosión va pesada por `(1-d)`: donde la
   densidad ya es 1 el término vale cero de todas formas, así que calcular dos
   fbm para multiplicarlos por cero es trabajo puro. Con el corte en `d>0.92` se
   saltea uno de cada cinco pasos dentro de nube sin que cambie un píxel.

Contando muestras del campo de ruido por píxel de cielo: de ~490 a ~240.

### El cierre de la escena
Cuando los dos aparceros hacen las paces, el campo **no vuelve a como estaba**.
Es la idea de las dos últimas fases de *Nullscapes* llevada a un campo: ahí el
nivel termina con el sol del fondo estallando en furia fundida, todo minimalista,
y el cuadro se va apagando. Acá el astro no estalla del todo —el jugador se queda
caminando debajo— pero el gesto es el mismo: **una cosa enorme, blanca y
silenciosa que se come el horizonte**.

> Reescrito: ahora esto es la segunda mitad de **una sola cinemática de 34
> segundos**, ver más abajo. La tabla queda como referencia de los tiempos
> relativos al destello.

| segundos | qué pasa |
|---|---|
| 0 – 9 | el sol de la escena baja hasta rasante |
| 2 – 11 | sube la noche y salen las estrellas |
| 4 – 15 | el astro asoma del horizonte y crece hasta cubrirlo |
| 16 – 19 | el núcleo junta luz: se lo ve latir |
| 17 – 19 | **se contrae** a una cúpula chica y densa |
| 19 – 20 | **dispara**: el haz sale al cenit |
| 20 – … | fogonazo, cartel, y queda encendido con un pulso lento |

**Crece, se aprieta, dispara.** La contracción es lo que convierte una postal en
un gesto: si el sol dispara sin apretarse, el rayo parece un adorno; si se
aprieta primero, parece que juntó fuerza.

El **haz** vive en un marco 2D pegado a la dirección del astro —dos vectores
tangentes y una coordenada polar—, y por eso la estrella gira, los anillos salen
y el haz tiembla sin que cueste prácticamente nada. Lo que lo hace leer como rayo
y no como una franja pintada son tres cosas: un núcleo casi puntual de ocho
milirradianes que satura de blanco, un halo seis veces más ancho que le da el
cuerpo, y que los dos se apaguen hacia arriba pero **no del todo**, porque un haz
que termina dentro del cuadro deja de leerse como infinito.

Alrededor flotan **150 esquirlas**: triángulos oscuros instanciados que suben
despacio, giran sobre sí mismos y encaran a la cámara, con el filo de arriba
agarrando luz fría. Son lo que le da escala al rayo — sin nada delante, un haz de
luz podría medir un metro o un kilómetro.

#### Lo que lavaba el cierre
La primera versión salía crema, no negra con un sol blanco. Medido sobre la media
del cuadro, se iba de 63 a 225 justo cuando el astro se hacía grande. Tres causas:

1. **Los rayos de pantalla sembraban desde el astro.** La marcha radial siembra
   desde todo lo muy brillante que hay en cuadro; con un disco de sesenta grados
   valiendo 7 en lineal, regaba la pantalla entera. Son rayos del sol de la
   tarde, y ese sol ya se puso: se apagan con `uAstro`.
2. **El decaimiento por muestra**, ya explicado más arriba.
3. **La noche llegaba tarde.** Mientras `uNoche` no llega a uno, el velo cálido de
   la lente y la compensación a contraluz siguen medio encendidos; si para
   entonces el astro ya es grande, el cuadro entero sale crema. Ahora la noche
   termina a los once y el astro a los quince.

Tres detalles más:

- **El astro sale por donde se puso el sol.** La escena ya viene mirando ahí.
- **Se lo mantiene apenas por debajo del horizonte** (`y = −R·0.30`) para que lo
  corte el suelo. Un disco entero flotando parece una luna; **medio** disco
  cortado por el campo parece que se te viene encima.
- **Va debajo de las nubes marchadas**, a propósito: que una nube le pase por
  delante es lo que le da la escala.

El radio final son 0,55 rad — **63 grados de disco**, más ancho que el alto
entero de la pantalla. Es la única forma de que se lea como "cubre el horizonte"
y no como una luna grande.

La noche no es bajarle el brillo al cielo de día: es otro color —azul de tinta,
casi sin degradado— más un campo de estrellas sacado de una grilla sobre la
esfera, una estrella por celda que gana el dado, titilando con su propia fase.

### PC o teléfono, decidido por lo que toca el jugador
No se pregunta ni se adivina por el user-agent —que miente, y que además no sabe
si hay un teclado enchufado—. **Se espera.** El primer teclado o el primer mouse
de verdad dice que esto es una PC, y ahí el juego se convierte en un juego de PC:
se van la palanca, los botones y el contador, queda la mira sola, la calidad sube
a alta y el mouse toma la cámara con bloqueo de puntero. Si en cambio llega un
dedo, no pasa nada. Es la única detección que no se equivoca nunca, porque no
infiere: ve.

### Los mandos
Los botones cuadrados con la palabra adentro se fueron. Ahora son **vidrio con
iconos dibujados a trazos**: un disco con degradado radial, un aro que se
enciende al tocar, un brillo de arco arriba —que es lo que lo hace parecer vidrio
y no un círculo— y el icono encima. `»` para correr, que se queda prendido
mientras esté enganchado, y `↑` para saltar. El de pausa es un círculo con dos
barras, arriba a la izquierda.

Van dibujados y no generados a propósito: un PNG de icono pesa cientos de
kilobytes, hay que bajarlo y a 3× de densidad se ve blando. Estas tres funciones
pesan cero bytes y salen nítidas en cualquier pantalla.

El menú de **pausa** junta seguir, idioma, calidad y los deslizadores. En
teléfono se llega por el botón redondo; en PC, con `Escape`.

### Controles
Teléfono: pulgar izquierdo palanca, derecho mirar, `↑` saltar, `»` correr, `‖`
pausa. PC: `WASD`, mouse para mirar, `ESPACIO` saltar, `R` correr, `ESC` menú.

### Lo que no tiene
Sin árboles y sin relieve: el suelo es plano a propósito. Era el pedido, y
también deja ver el pasto sin que nada le robe cuadros.

---

## Bosque de las diez arenas (`Bosque_Arenas.html`)

El terreno de Pastizal —briznas de geometría, grilla envolvente, viento con
ráfagas— pero adentro de un bosque, con un caminito de tierra que va de arena en
arena. Diez arenas, cinco oleadas cada una, y los troncos que tapan la salida no
se hunden hasta que cae la última.

El HTML son noventa y cuatro kilobytes; los cinco megas de modelos viven en
`mundo/bosque/` y los sirve jsDelivr anclados al commit.

### Los ocho modelos
Todos generados: imagen del objeto aislado con **FLUX.2 en su variante max**, y
de ahí a malla texturizada con **Tripo H3.1**.

| modelo | triángulos | para qué |
|---|---|---|
| roble | 11.142 | el árbol de copa maciza, 9,5 m |
| pino | 9.504 | el conífero, 12 m |
| abedul | 8.346 | el flaco, 8 m |
| troncos | 7.541 | la barrera que traba las bocas |
| caja | 1.817 | todo el parkour sale de acá |
| duende de musgo | 5.588 | el bicho lento que viene de a muchos |
| lobo | 7.858 | el que corre |
| treant | 13.602 | el que aguanta |

Lo que hay que saber para que esto funcione:

- **Las texturas venían en 4096 por lado.** Ocho modelos así son seiscientos
  megas de memoria de video: en un celular, pantalla negra o pestaña muerta. Un
  script rearma el GLB con las imágenes rebajadas a mil y pico —recalculando los
  `bufferViews` uno por uno y realineando el búfer a cuatro bytes—. El paquete
  pasó de catorce megas y medio a cinco.
- **El material del GLTF se tira y se pone uno propio.** Todo el juego se dibuja
  en lineal y el paso a sRGB lo hace el pase final; un `MeshStandardMaterial`
  codifica por su cuenta y saldría de otro color que el pasto. Con shader propio,
  además, la niebla es una sola para todos y el follaje se prende a contraluz.
- **Con instancias hay que multiplicar `instanceMatrix` a mano.** Un
  `ShaderMaterial` crudo no trae los trozos que three le inyecta a los suyos.
- **En GLSL un identificador no puede llevar `ñ`.** Un uniform `uDaño` tira
  `'?' : syntax error` y el shader entero no compila. Costó encontrarlo porque el
  error no menciona la letra.
- **El arbusto no se pudo generar.** Una esfera de follaje perfectamente lisa no
  le da geometría al reconstructor: salieron 8 triángulos la primera vez y 96 la
  segunda. Quedó afuera.

### El mapa sale de una cadena
No hay una sola posición escrita a mano. Once claros encadenados —el de arranque
más las diez arenas—, y de uno al siguiente un corredor recto cuyo ángulo gira al
azar en cada tramo, así el camino serpentea y nunca se ve la arena que viene.

Todo lo demás sale de **una sola función**, `holgura(x,z)`: la distancia al claro
más cercano, negativa adentro y positiva en el bosque. La usan el color del
suelo, la siembra de los árboles, el pasto, el choque del jugador y el de los
bichos. Cambiar el ancho de un camino es cambiar un número.

Para el shader esa función está horneada en una textura de 768 —rojo: cuán
abierto; verde: cuánta tierra— porque veintiún tests de distancia por píxel es
otra cosa.

**El pasto se moría por esto.** La huella de tierra arrancaba con un radio de
cinco metros y el umbral que mata el pasto estaba en 0,10: el resultado era un
claro pelado a diez metros del camino a cada lado, que en la captura parecía un
bug de instanciado. Eran dos números.

### La pared del bosque no tiene colisión
Diez mil novecientos árboles y ni uno tiene caja. El jugador no puede salir del
claro porque `holgura` dice cuánto sobresale y el empujón va por su gradiente. Un
test contra una función en vez de diez mil contra cajas, y de paso los bichos
usan exactamente el mismo.

### Los árboles de lejos se retratan a sí mismos
Al arrancar, cada árbol se dibuja una vez con una cámara ortográfica contra fondo
transparente, y ese render queda como textura. De ahí en más, todo lo que está a
más de veinte metros es una **carta de dos triángulos** que gira en su eje para
mirar a la cámara. Los cuarenta más cercanos sí son el modelo entero, y la lista
se rehace tres veces por segundo ordenando por distancia: si te metés contra la
pared del bosque, los que sobran caen a carta y el presupuesto no se desborda.

El abedul quedó en el catorce por ciento del bosque: es finito y su carta sale
moteada. El roble y el pino tienen copa maciza y aguantan el impostor.

### Novecientos mil triángulos que no se veían
La primera versión dibujaba **las diez arenas y las diecinueve barreras siempre**,
estuvieras donde estuvieras: 472.000 triángulos de cajas más 430.000 de troncos
por cuadro, para no mostrar nada. Ahora la madera es una malla instanciada **por
arena** y se apaga a más de setenta y ocho metros. La colisión también: sólo
contra la madera de la arena que estás pisando.

### El parkour se genera y siempre cierra
Cada arena se arma con su semilla: cajas sueltas por el piso, torres de dos o
tres cajas apiladas con la de arriba corrida, y encima las plataformas. Las
plataformas no caen al azar: **cada una se cuelga de una torre o de otra
plataforma** a menos de 0,95 m de altura y menos de 2,0 m de distancia, que es
exactamente lo que se salta con la gravedad y el impulso del juego. Por eso
siempre se puede subir.

Una plataforma es la misma caja generada, aplastada. Todo el parkour de las diez
arenas es un modelo de 1.817 triángulos repetido 260 veces.

El choque resuelve primero lo horizontal y después lo vertical, y lo vertical
sólo si venías cayendo: al revés, caminar contra una caja te sube encima sola.
Los escalones de menos de 42 cm se suben sin saltar.

### Las oleadas
Cinco por arena. La cuenta es `3 + oleada + arena·0,7`; la vida sube 26% por
oleada y 30% por arena; la velocidad, mucho menos. La mezcla también cambia:
puros duendes al principio, lobos a partir de la tercera, y el treant recién en
la última oleada de la cuarta arena en adelante —y de a más a medida que avanzás.

Los bichos no tienen esqueleto ni animación importada. **Se menean desde el
shader**: el vértice se corre más cuanto más arriba está, con una fase propia por
bicho, así el cuerpo bambolea al caminar y se estira al pegar. En primera persona
alcanza, y cuesta cero.

Se separan entre ellos con un empujón radial —si no, se apilan todos en el mismo
punto— y no se meten en el bosque porque usan la misma `holgura` que el jugador.

### La cinemática
Al entrar bien adentro de la arena —no al pisar el borde: si los troncos cayeran
con vos todavía en la boca, el empujón te podría dejar afuera con la puerta
cerrada— la cámara gira sola hacia por donde entraste y ve caer la barrera. Cae
con un rebote, porque el rebote es lo que la hace pesada. Barras negras arriba y
abajo y el cartel de la arena.

### El sonido no es un archivo
Nada está grabado. Un bosque suena a viento entre las hojas, pájaros y madera que
cruje, y las tres cosas salen del mismo ruido blanco por filtros distintos: el
viento es paso-bajo con la banda paseándose, las hojas son un pasa-banda angosto
en tres mil cuatrocientos, los pájaros son senoidales de setenta milisegundos.

Los golpes son ataques de milisegundos sobre ese mismo ruido, con la frecuencia
del filtro cayendo. El paso cambia según lo que pisás: sobre tierra es seco y
grave, sobre pasto es un roce agudo.

**La música es un bordón** de cuatro dientes de sierra apenas desafinados detrás
de un paso-bajo. En silencio no se oye. Cuando arranca una oleada la ganancia
sube, el filtro se abre, el viento se pone denso y los pájaros se callan. Es el
mismo motor haciendo de banda sonora.

### El contador de fps mentía
Vale la pena anotarlo. El bucle recorta `dt` a 0,08 para que un tirón no
descalabre la física, y el contador de cuadros sumaba **el `dt` recortado**: con
el juego a un cuadro por segundo, el HUD informaba quince. Toda la tarde
optimizando lo que no era. Ahora suma el tiempo real.

El rasterizador por software con el que se probó esto corre a menos de un cuadro
por segundo —Pastizal, con la mitad de cosas, corre igual de lento—, así que de
acá no sale ninguna medición de rendimiento que valga. Lo que sí se pudo medir y
arreglar es el trabajo que se mandaba a la GPU al pedo.

### Controles
Pulgar izquierdo palanca, derecho mirar, `GOLPE` y `SALTO` abajo a la derecha,
`CORRER` arriba. Con teclado: `WASD`, espacio, `E` o `F` para pegar, `R` para
correr. `AJUSTES` abre árboles, pasto, viento, sol, exposición, color, nitidez,
neblina y volumen.


### La cinemática de 34 segundos

Una sola secuencia, con reloj propio, que encadena las tres cosas que antes eran
piezas sueltas. Dura exactamente lo que dura la música.

| segundos | qué pasa |
|---|---|
| 0,0 – 7,8 | **El reencuentro.** Cámara suelta alrededor del molino mientras los dos espíritus convergen y se funden |
| 7,8 – 9,6 | **La cámara vuelve.** Vuelo continuo del molino al jugador; no hay corte |
| 9,6 – 15,0 | **La ascensión.** Él se eleva y se va hacia atrás mirando el cielo; el suelo se quiebra, el pasto se desprende, los edificios se desarman |
| 15,0 | **El destello.** Blanco pleno |
| 15,0 – 34,0 | **El astro.** Aparece, crece, se contrae y dispara. Cartel y fin |

#### Nada de patrones
El problema de un recorrido con puntos y suavizado es que **se nota que es un
recorrido**: la cámara acelera y frena en los mismos sitios, siempre. Encima del
recorrido va una **mano**: tres senos de períodos inconmensurables por eje —el
ciclo común no existe, así que nunca vuelve a la misma combinación—, más una
deriva del punto al que mira y un balanceo del horizonte. Es lo mismo que separa
una cámara en mano de una en un riel.

```js
function manoCine(t, s){
  return Math.sin(t*0.731+s)*0.55 + Math.sin(t*1.373+s*2.13)*0.29
       + Math.sin(t*2.617+s*3.71)*0.16;
}
```
La amplitud baja en la ascensión —ahí la cámara está apoyada— y sube al final,
cuando ya no hay nada que sostenga el encuadre.

#### El desarme
**Un solo uniforme que miran cuatro shaders a la vez.** Cada celda del mundo
tiene su hora de romperse, sacada de su distancia al centro —la onda avanza hacia
afuera— más un desorden por celda, para que el borde no sea un círculo perfecto:

```glsl
float horaRotura(vec2 P, float tam){
  vec2 c=floor(P/tam);
  float h=fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);
  return 0.06 + clamp(length((c+0.5)*tam-uDesCen)/78.0,0.0,1.0)*0.62 + h*0.26;
}
```

Que la hora salga del **mismo hash** para todos es lo que hace que la losa que cae
salga del agujero exacto que dejó el suelo, y no al lado.

- **El suelo** se descarta por celda. Por el agujero se ve el cielo de abajo, que
  de noche es tinta.
- **Las losas** son una grilla aparte de 26×26 de cinco metros que vive apagada
  todo el juego: el suelo del juego es un plano de cuatro kilómetros con cuatro
  vértices, ahí no hay nada que romper. Caen con gravedad, se inclinan y giran.
- **El pasto** se suelta y sube girando. La primera versión subía todas las
  briznas de la misma celda igual y armaba una **pared** que tapaba la pantalla y
  al personaje con ella; ahora cada una sale para su lado, más lejos que arriba,
  y **se achica hasta desaparecer**.
- **Los edificios** se parten en ladrillos de 1,4 m. No hay atributo de pieza —son
  cajas fundidas en una sola malla—, así que la pieza sale de la propia posición
  redondeada a una rejilla: todos los vértices del mismo cubo reciben el mismo
  empujón y viajan juntos, y los que quedan a caballo de dos cubos se separan,
  que es exactamente lo que hace algo al romperse.

#### El corte
El destello es **el único corte de toda la cinemática**, y por eso pega. Detrás
del blanco el mundo se rearma —el campo tiene que estar entero para lo que viene,
y para que después se pueda seguir caminando— y la hora salta a noche cerrada.
Nada de eso se ve.

#### El botón
En el menú de pausa hay un **▶ CINEMÁTICA**. Es la única forma de pulirla sin
jugar diez minutos cada vez. El click además destraba el audio, que los
navegadores no dejan sonar sin un gesto del usuario.

---

## `Campo_de_Tiro.html` — el campo de tiro con la primera persona del parkour

Es el juego de parkour multijugador (mismo motor, mismos personajes, mismas
animaciones, mismo multijugador) con **un mundo nuevo**: una galería de tiro gris.
Arranca directo ahí (el carrusel del menú igual deja entrar a todos los demás
niveles).

### Por qué el arma no cuelga de la mano
Lo obvio sería colgar el fusil del hueso `RightHand` y listo. No sirve: la mano
va donde la manda la animación —al costado del cuerpo cuando estás quieto—, así
que el arma apuntaría al piso y bailaría con cada paso.

Acá va al revés: **el arma se coloca respecto a la cámara** (un *viewmodel*
clásico) y **las manos van a buscarla** con IK de dos huesos sobre el mismo
esqueleto del juego. Resultado: ves *tus* brazos, con *tu* skin, agarrando el
fusil, y el arma queda siempre pegada a la retícula.

### El número que define todo el agarre
Antes de tocar una sola posición medí el rig en el propio juego:

- el hombro derecho está a **0,182 m a la derecha, 0,231 abajo y 0,10 detrás** del ojo
- el brazo **alcanza 0,54 m** (0,267 de brazo + 0,273 de antebrazo)

Con eso el agarre se cae solo: la mano derecha a ~0,30 m del hombro (codo bien
doblado, como una empuñadura de verdad) y la izquierda a ~0,52 m (brazo casi
estirado). Por eso **la mano de apoyo va sobre el cargador y no en la punta del
guardamanos**: un guardamanos largo queda literalmente fuera del alcance del
brazo, y el IK lo único que puede hacer ahí es estirar el brazo y dejar la mano
colgando en el aire. Error medido mano→empuñadura: **8 mm**.

El IK es el clásico de dos huesos con ley de cosenos:

```js
const ca=Math.acos((L1*L1+d*d-L2*L2)/(2*L1*d));
_ikU.copy(_ikD).applyAxisAngle(_ikN,ca);   // dirección del hueso de arriba
```
El plano lo define un *pole* (una pista de hacia dónde apunta el codo): afuera y
abajo a la derecha, abajo a la izquierda. El peso se interpola sobre la
cuaternión **animada**, no la reemplaza, así que al deslizarse o rodar el brazo
vuelve solo a la animación del parkour.

### Los dedos
El hueso de la mano **no tiene hijos**, así que su eje `+Y` local es el eje de los
dedos (lo hereda de la cadena del brazo). En vez de adivinar ángulos de Euler,
ese eje se **apunta** a una dirección del mundo: la derecha empuña (adelante y
abajo), la izquierda abraza cruzando hacia la derecha. Ahí la mano dejó de ser un
bulto pegado al arma y pasó a agarrarla.

### Tres cosas que se veían mal y por qué
- **El arma parecía chapa pulida blanca.** `scene.environment` es un
  `RoomEnvironment` (un estudio con luces): con `metalness` alta el fusil reflejaba
  todo eso y salía blanco. Gunmetal = metalness baja, roughness alta y
  `envMapIntensity` 0,22.
- **La culata tapaba la pantalla.** El modelo está corrido hacia adelante y con
  culata corta: lo que queda detrás de 0,20 m lo recorta el near plane, igual que
  en la vida real no ves la culata que tenés apoyada en el pómulo.
- **El fogonazo no aparecía nunca.** Se descontaba el tiempo *antes* de decidir si
  se dibuja, así que con `dt` grande (celular a 20 fps) moría en el mismo frame en
  que nacía. Ahora se muestra en el frame del disparo y después se descuenta. Y el
  plano liso se veía como un cuadrado blanco: ahora es una estrella con degradé
  dibujada en un canvas.

### El galpón
Hormigón gris con textura de canvas (cero descargas), **bafles inclinados en el
techo** —que es lo que hace que una galería *parezca* una galería—, puestos con
divisorias y mesada (el carril central queda libre para caminar), línea de fuego
amarilla, carteles de distancia y tablero de puntaje en el fondo.

Adentro del galpón **el sol no entra**: el techo lo tapa, así que su shadow map
sólo costaría fps. Se apaga en este mundo (`sun.castShadow=false`) y las sombras
de contacto se **pintan**: un degradé radial en un plano bajo cada blanco y cada
mesada. La luz la dan las luminarias emisivas, ocho luces puntuales y un
`HemisphereLight` **que vive dentro del grupo del nivel** — three no recolecta
luces de objetos invisibles, así que se apaga solo al cambiar de mundo y no toca
a los otros niveles.

### Los blancos
- **Papel a 10, 25 y 45 m**: anillos concéntricos en canvas. El puntaje sale del
  `uv` del raycast (distancia al centro → 10…3) multiplicado por la distancia, y
  en el mismo `uv` se deja el **agujero** (un disco negro hijo del blanco, pool de 48).
- **Acero a 15, 29 y 45 m**: se caen hacia atrás girando el pivote y se levantan
  solos a los 3 s.
- **Uno móvil a 34 m** sobre un riel, y vale más.

### El disparo
Raycast desde la cámara con dispersión mínima (más si corrés o estás en el aire),
trazadora desde la boca del caño hasta el impacto, chispas en el acero, retroceso
de arma **y** de cámara, cargador de 30 y recarga de 1,85 s.

El sonido es **sintetizado con WebAudio**: ruido filtrado con barrido de paso bajo
+ un golpe de graves para el disparo, dos senos para el *ping* del acero, y todo
con un `ConvolverNode` de impulso propio para la reverb del galpón. Cero archivos
nuevos.

### Controles
- **Celular**: botón **FUEGO** (mantenerlo = automático) y **↺** para recargar.
  Los dos se pueden reubicar con el editor de HUD del juego.
- **PC**: en el modelo de dos dedos original mirar y disparar serían el mismo
  gesto (arrastrar), así que al detectar teclado/mouse **WASD camina** (escribe el
  mismo `joy` que el joystick), el mouse mira con **pointer lock** y el **click
  izquierdo** queda libre para el gatillo. `R` recarga, espacio salta, shift
  desliza. En celular no cambia nada.

### Gancho de consola
`window.__tiro` para calibrar sin recompilar: `pos(x,z)`, `mira(yaw,pitch)`,
`tirar()`, `auto(v)`, `off(x,y,z)`, `esc(v)`, `grip(...)`, `tors(a,b)`,
`mundo(k)`, `est()`, `brazo()`, `manos()`, `aceros()`, `fx()`.
`manos()` devuelve el error en metros entre cada mano y su empuñadura: es la forma
de saber si el agarre cierra sin depender del ojo.
