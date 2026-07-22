# Drift Yard 🏁🛞

Juego de **drift 3D en Three.js** con **6 mapas** (5 de drift + 1 de carrera en bosque). Estilo industrial semi-realista.

## Cómo jugar
- **Abrir `index.html` suelto** (doble clic / file:// / content://) → carga todo desde este repo vía **jsDelivr CDN**.
- Servido junto a sus carpetas → carga relativa. Forzar: `?cdn=1` / `?local=1`. Overlay dev: `?dev=1`.
- Controles: WASD/flechas + **ESPACIO freno de mano** (P pausa) · táctil (botones + ✋) · gamepad (stick, RT/LT, A).
- En móvil vertical el juego **se rota solo 90°** (sin pantalla de "girá el celular").

## Los 6 mapas
1. **PUERTO** (drift) — el parque de cemento clásico: contenedores, isla central, gradas, grúas.
2. **BOSQUE** (carrera, 3 vueltas) — circuito asfaltado entre miles de árboles (billboards en X fotorealistas), casas junto al camino, 10 checkpoints con arco indicador, medallas por tiempo total.
3. **AEROPUERTO** (drift) — pista de aterrizaje gigante con avionetas, números 27/09 y barreras.
4. **AZOTEA** (drift) — helipuerto en un rascacielos, skyline de ciudad alrededor y abajo.
5. **NIEVE** (drift) — explanada nevada con **placas de hielo** (agarre ×0.25), pinos y cabañas.
6. **CAÑÓN** (drift) — arena del desierto, mesas rocosas, cactus y un auto oxidado abandonado.

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
