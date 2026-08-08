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
