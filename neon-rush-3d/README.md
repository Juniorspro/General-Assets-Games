# Neon Rush 3D 🏎️🌆

Racer arcade **3D en Three.js** estilo synthwave. Secuela 3D de [Neon Rush](../neon-rush/).

## Cómo jugar
- **Abrir `index.html` suelto (doble clic / file://)** → carga motor y assets desde este repo vía **jsDelivr CDN** (rápido y cacheado).
- **Servido junto a sus carpetas** (clon del repo, GitHub Pages, cualquier hosting) → carga relativa.
- Forzar modo: `?cdn=1` o `?local=1`. Overlay de desarrollo: `?dev=1`. Post-procesado bloom experimental: `?bloom=1`.

## Características
- 3 pistas desbloqueables: **Costa Neón** (océano, palmeras, hotel), **Cañón Violeta** (colinas, pinos, rocas), **Autopista Medianoche** (ciudad, edificios, tráfico).
- 5 rivales con IA (velocidad por curvatura, rubber-banding, esquivas) + tráfico urbano del pack del repo.
- Nitro con orbes, choques con chispas, derrapes, muros, vueltas, posiciones, récords y desbloqueos en localStorage.
- **Espectadores 3D animados** (rig + clip "Cheer with both hands up" de Meshy vía Higgsfield), multitud con volumen por distancia.
- Carretera spline Catmull-Rom con **PBR real** (asfalto/hierba/roca/metal del repo: ambientCG/Poliigon), líneas de borde neón, farolas y vallas instanciadas, arco de meta 3D, sol de franjas y cielo degradado procedurales, skyline panorámico.
- Teclado (WASD/flechas), táctil (botones multitouch) y gamepad. Español/inglés. Calidad ALTA/BAJA (DPR, sombras, densidad).
- Canvas de efectos 2D (líneas de velocidad, viñeta), minimapa en vivo, audio WebAudio (2 músicas + 6 SFX generados).

## Estructura
- `index.html` — juego completo (un solo archivo, ~56KB de código).
- `vendor/` — Three.js r172 + addons vendorizados (sirve desde el repo, sin npm).
- `assets/models/gen/` — 8 GLB generados con Higgsfield (imagen→3D Meshy): héroe, 2 rivales, espectador riggeado, hotel, oficina, palmera, arco.
- `assets/models/repo/` — GLB del repo preparados (pack 10 coches, pinos PS1, camión, coche oxidado).
- `assets/textures/` — 6 sets PBR 1K extraídos de los zips del repo.
- `assets/images/`, `assets/audio/` — arte de pantallas, vallas, skyline, logo; músicas y SFX.
- `design/assets.csv` — manifiesto de assets (contrato de generación).

Todos los assets generados usan **una única fórmula de estilo** synthwave (la misma del juego 2D).
