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
