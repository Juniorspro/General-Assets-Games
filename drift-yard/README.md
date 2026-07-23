# Drift Yard 🏁🛞

Juego de **drift 3D en Three.js** con **8 mapas**, **12 autos + 8 ruedas + 5 pilotos** elegibles, daño con **deformación real de la carrocería**, y **modo a pie** (bajás del auto, caminás/corrés/saltás/pegás). El derrape puntúa **solo si lo inicias con el freno de mano ✋**.

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
