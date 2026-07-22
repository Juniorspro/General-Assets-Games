# Drift Yard 🏁🛞

Juego de **drift 3D en Three.js**: solo puntúas derrapando. Estilo industrial semi-realista (nada de neón).

## Cómo jugar
- **Abrir `index.html` suelto** (doble clic / file:// / content://) → carga todo desde este repo vía **jsDelivr CDN**.
- Servido junto a sus carpetas → carga relativa. Forzar: `?cdn=1` / `?local=1`. Overlay dev: `?dev=1`.
- Controles: WASD/flechas + **ESPACIO freno de mano** (P pausa) · táctil (botones + ✋) · gamepad (stick, RT/LT, A).

## El juego
- **Parque de drifting gigante de cemento** (300×220 m) con vallas metálicas perimetrales, contenedores, barreras de neumáticos, torres de focos y marcas pintadas — rodeado de naves y oficinas industriales.
- **4 coches elegibles** en showroom 3D rotatorio con stats (POTENCIA/AGARRE/GIRO/DERRAPE): KATANA (JDM equilibrado), BANDIDO (muscle potente), HACHI (panda ágil), TORO (sedán widebody).
- **Ciclo elegible: DÍA / ATARDECER / NOCHE** (noche con focos encendidos y faro en tu coche).
- **Puntuación por drift**: ángulo × velocidad × combo; encadena derrapes para subir el combo (×5 máx.), endereza para **bancar** los puntos, choca y pierdes lo no bancado. Sesión de 3 minutos, medallas 🥉🥈🥇 y récords por coche.
- Física de derrape arcade (agarre lateral separado, kick de freno de mano, contravolante), **marcas de neumático persistentes**, humo, cámara chase con lag de drift.

## Assets
- 8 GLB generados con Higgsfield (imagen→3D): 4 coches, almacén, oficina, contenedor, neumáticos.
- PBR del repo (cemento, metal, suelo, asfalto), logo/menú/carga generados, **drift phonk** + lo-fi + skid loop generados; motor/choque/chime reutilizados.
- `design/assets.csv` = manifiesto. Fórmula de estilo única (industrial motorsport, tarde dorada).
