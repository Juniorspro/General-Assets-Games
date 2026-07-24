# Drift Yard 🏁🛞

Juego de **drift 3D en Three.js** con **8 mapas**, **12 autos + 8 ruedas + 5 pilotos** elegibles, daño con **deformación real de la carrocería**, y **modo a pie** (bajás del auto, caminás/corrés/saltás/pegás). El derrape puntúa **solo si lo inicias con el freno de mano ✋**.

## Novedades 5.7 — onboarding, 3 idiomas, nombre, cámara 1ª/3ª y destrucción física
- **Arranque guía**: la primera vez te pide **idioma (Español / English / Português) → gráficos → tu nombre**, antes de cargar.
- **Portugués** completo agregado (ES/EN/PT).
- **Tu nombre flota** sobre tu auto y, cuando bajás, sobre vos.
- **Cámara 1ª / 3ª persona**: botón 👁 al lado de la pausa.
- **Destrucción física en tiempo real**: al morir/caer, el auto se **rompe en pedazos** que vuelan, giran y rebotan con gravedad (no una animación de desvanecimiento).
- **Trituradora** con discos **más juntos y engranados** (doble eje, como la referencia).
- **Motor nuevo**: sonido más lleno y con gruñido (armónicos + filtro resonante + "chug" de ralentí + turbo).
- Fixes: movimiento a pie no vibra cerca del centro del joystick (histéresis) y anti "doble fantasma".

## Novedades 5.6 — MULTIJUGADOR + arreglos a pie + trituradora real
- **Multijugador serverless** 👥 (MQTT sobre WebSocket, broker público, sin servidor propio): **una sala por mapa**, ves los autos de los demás jugadores en tiempo real con su nombre flotando, y **chat** con teclado propio en pantalla + burbujas sobre los autos. Contador de gente por sala en la pantalla de mapas y badge en carrera. (Re-integrado desde tu build con multiplayer.)
- **Movimiento y cámara a pie corregidos**: la derecha ya va a la derecha (estaba espejado) y la cámara gira en el sentido correcto al arrastrar.
- **UI a pie**: el botón de subir/bajar del auto 🚪 ahora está grande arriba de los pedales (antes escondido en la esquina), la **pausa funciona a pie** (el HUD estaba tapado por la zona de cámara), y saqué el cartel "de pie".
- **Piñas en combo** 👊: derecha e izquierda alternadas, encadenables, con impacto corto (antes una sola y larga). **Saltás aunque estés en movimiento** (control en el aire).
- **Trituradora de verdad**: rediseñada como **doble eje de discos dentados** que giran hacia adentro (como la referencia), y **se recorta el piso del mapa** sobre el pozo para verla (antes la tapaba el suelo).
- **Más saturación**: tone mapping Neutral → colores más vivos sin quemar.

## Novedades 5.5 — cámara libre a pie, trampa de engranajes y saltos por física
- **Cámara a pie con el dedo**: la cámara se orienta arrastrando la pantalla (lado derecho), ya **no persigue** al personaje. El piloto camina/corre relativo a donde apunta la cámara.
- **Trampa: piso de cristal + trituradora de engranajes** ⚙ (Aeropuerto y Azotea): en el centro hay una compuerta de cristal sobre un pozo con **engranajes gigantes girando** (modelos 3D reales generados con Higgsfield). Acercate a la **palanca** → aparece **ACTIVAR** → abrís la compuerta → se activa la trituradora. Si caés, morís triturado (auto o a pie).
- **Saltos de rampa por física real**: el impulso vertical = velocidad × pendiente (proyectil), así que **saltás más lejos cuanto más rápido vas**; gravedad y arco realistas.
- **Hazards fuera de los contenedores**: los brazos giratorios ya no quedan clavados dentro de las cajas (reubicados a zonas abiertas).

## Novedades 5.4 — colisión total + rampas + mapas más llenos
- **Colisión en TODO**, hasta los árboles: cada árbol del bosque (1600+) y del touge (1300+) es un tronco sólido. Motor de colisión nuevo con **grilla espacial** → miles de colliders sin bajar los FPS (solo se testean los cercanos).
- **Colisión a pie**: el piloto ya no atraviesa props/árboles/contenedores (mismo set que el auto).
- **Rampas de salto** 🛫: nueva física vertical del auto (subís la rampa, saltás por el aire con el morro arriba, y caés con polvo + golpe). Repartidas por Puerto, Aeropuerto, Nieve, Cañón, Azotea y Estadio (2–4 por mapa).
- **Mapas más llenos**: cada arena drift suma rampas, pilas de gomas, chicanas de contenedores/stacks y slalom de conos en las zonas vacías (sobre todo el Aeropuerto, que era una pista pelada).

## Novedades 5.3 — modo a pie que anda de verdad
- **Animaciones nuevas y buenas**: idle (parado quieto, ya no marcha en el lugar), correr real hacia adelante (RunFast), salto rápido y vertical (Regular_Jump), y **piña de una sola trompada** (Right_Jab) rápida — no más rutina de boxeo de 7 s. Las viejas eran clips equivocados (correr "BackLeft", salto de 9,9 s, boxeo de 6,9 s).
- **Joystick recalibrado**: adelante en el joystick = el piloto camina/corre hacia donde mira la cámara (antes iba invertido). Empuje suave = caminar, a fondo = correr; gira suave hacia donde vas.
- **Bug de escala horneada**: los clips de Meshy traían escala animada en los huesos (el piloto crecía ~18 % al quedarse quieto). Ahora se quitan las pistas de escala → tamaño constante ~1,8 m en toda animación.
- **Sin NPCs a pie**: andás solo (pediste "solamente yo").
- **Bajar del auto es instantáneo**: los pilotos y animaciones se precargan con el resto de los assets (chau "cargando").

## Novedades 5.2
- **Joystick analógico a pie** 🕹️: el modo a pie ahora se controla con un joystick virtual (empujá suave = caminás, a fondo = corrés) en vez de la cruceta. Salto y piña siguen a la derecha.
- **Vida solo a pie** ❤️: la barra de vida aparece **únicamente cuando estás fuera del auto** y muestra la salud del piloto (manejando no molesta en pantalla).
- **Fix pilotos gigantes**: los personajes riggeados de Meshy guardan la malla en miniatura y la escalan con los huesos; medíamos el tamaño sin el skinning y salían de ~200 m. Ahora se mide el tamaño real posado → pilotos y NPCs a ~1.8 m.

## Novedades 5.0
- **Personalización**: 12 carrocerías, 8 juegos de ruedas y 5 pilotos — todo elegible en el garaje.
- **Modo a pie** 🚪: tocá la puerta para bajar del auto y andar con tu piloto (joystick para moverte; caminar/correr/saltar/piña con animaciones reales riggeadas). Hay NPCs a los que podés pegar; volvé al auto acercándote y tocando la puerta.
- **Daño y destrucción**: los choques abollan la chapa de verdad (deformación de malla acumulativa), y si te destrozás entero morís con desvanecimiento al menú. Barra de vida en pantalla.
- **Hazards giratorios** en Estadio y Puerto que destrozan autos.
- **Motor 100% procedural** (Web Audio) con petardeo de escape al subir de cambio; choques con volumen por impacto.

## Cómo jugar
- **Abrir `index.html` suelto** (doble clic / file:// / content://) → carga todo desde este repo vía **jsDelivr CDN**.
- Servido junto a sus carpetas → carga relativa. Forzar: `?cdn=1` / `?local=1`. Overlay dev: `?dev=1`.
- Controles: WASD/flechas + **ESPACIO freno de mano** (P pausa) · táctil (botones + ✋) · gamepad (stick, RT/LT, A).
- En móvil vertical el juego **se rota solo 90°** (sin pantalla de "girá el celular").

## Los 8 mapas
1. **PUERTO** (drift) — el parque de cemento clásico: contenedores, isla central, gradas, grúas.
2. **BOSQUE** (carrera, 3 vueltas) — circuito asfaltado entre miles de árboles (billboards en X fotorealistas), casas junto al camino, 10 checkpoints con arco indicador, medallas por tiempo total.
3. **AEROPUERTO** (drift) — pista de aterrizaje gigante con avionetas, números 27/09 y barreras.
4. **AZOTEA** (drift) — helipuerto en un rascacielos, skyline de ciudad alrededor y abajo.
5. **NIEVE** (drift) — explanada nevada con **placas de hielo** (agarre ×0.25), pinos y cabañas.
6. **CAÑÓN** (drift) — pueblito fantasma ruta 66: diner, gasolinera, torre de agua, mesas y cactus.
7. **ESTADIO** (drift) — arena asfaltada con tribunas llenas, pantallas gigantes y chicanas de contenedores.
8. **TOUGE** (carrera, 2 vueltas) — paso de montaña japonés con horquillas, guardarraíles, torii y expendedoras.

Cada mapa con **cielo 360 propio por bioma** en los 3 horarios: **DÍA / ATARDECER / NOCHE**.

## Juego
- **4 coches elegibles** en showroom 3D con stats: KATANA / BANDIDO / HACHI / TORO — cada uno con **velocidad tope y aceleración progresiva** propias.
- **Drift**: ángulo × velocidad × combo; endereza para **bancar**; choque pierde lo no bancado. Medallas 🥉🥈🥇 y récords por mapa.
- **Carrera (bosque)**: 3 vueltas, mejor vuelta, medallas por tiempo (5:30 / 4:45 / 4:10). Fuera del asfalto el pasto frena.
- Física v2: agarre lateral separado, kick de freno de mano, contravolante, scrub en derrape; menú de inicio = **vistas orbitando el mapa en vivo**.

## Assets
- 21 GLB generados con Higgsfield (imagen→3D): 4 coches, edificios, contenedores, grúas, avioneta, casa, cabaña, etc. (texturas comprimidas: 145 MB → ~17 MB).
- Billboards de vegetación fotorealistas (chroma key + alpha-bleed anti-halo), 15 cielos equirect 360, PBR del repo (cemento, metal, suelo, asfalto, roca).
- Música drift phonk + lo-fi + skid loop generadas; motor/choque/chime reutilizados.
- `design/assets.csv` = manifiesto completo.
