# Neon Rush 🏎️🌇

Juego de carreras arcade pseudo-3D estilo synthwave. / Synthwave pseudo-3D arcade racer.

**Jugar / Play:** https://cosy-tribe-588.higgsfield.gg/

## Características
- 3 pistas desbloqueables (Costa Neón, Cañón Violeta, Autopista Medianoche), 3 vueltas, 5 rivales con IA (rubber-banding, esquiva, trazada).
- Nitro con orbes recogibles, choques, derrapes, salidas de pista.
- Récords y desbloqueos guardados en localStorage.
- Controles: teclado (WASD/flechas + ESPACIO nitro + P pausa), táctil (botones en pantalla) y gamepad (stick + RT/LT + A), todos de primera clase.
- Español e inglés (textos externalizados en `strings.js`).
- Música y efectos de sonido generados; motor con pitch ligado a la velocidad.
- Canvas 2D, bucle de simulación a paso fijo (60 Hz), RNG con semilla (determinista), overlay de desarrollo con `?dev=1`.

## Estructura
- `index.html` — página del juego.
- `game.js` — motor completo (proyección pseudo-3D, IA, HUD, menús, audio WebAudio).
- `strings.js` — todos los textos visibles (ES/EN).
- `logic.js` — módulo de reglas requerido por la plataforma (juego solo).
- `assets/` — sprites, fondo, logo y audio generados con Higgsfield (fórmula de estilo única synthwave).
- `design/assets.csv` — manifiesto de assets (contrato de generación).

## Despliegue (Higgsfield)
- `game_id`: `81b23a82-c151-4982-be66-71bbbb31ccac` — pásalo a `deploy_game` para actualizar el juego manteniendo la misma URL.
- El zip de despliegue lleva en su raíz: `logic.js`, `index.html`, `game.js`, `strings.js`, `assets/`, `design/`.
