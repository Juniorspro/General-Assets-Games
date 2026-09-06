# El Valle · assets

Materiales PBR y modelos escaneados que usa `juegos-pc/Valle.html`, servidos por
jsDelivr desde este repositorio. **El mundo no está acá**: el relieve se esculpe
en el navegador con brochas escritas a mano. Esto son sólo los materiales.

| qué | de dónde | licencia |
|---|---|---|
| `pasto`, `pasto2`, `tierra`, `roca`, `sendero` (2K, `_d` color `_n` normales `_a` ARM) | AmbientCG | CC0 |
| `arena`, `corteza` (2K) | Poly Haven | CC0 |
| `*.glb` — rocas, tronco, tocón, helecho, ortiga, arbusto y matas de pasto | Poly Haven, escaneos fotogramétricos | CC0 |
| `cielo.hdr` — panorámica HDR 2K, se ve y además ilumina | Poly Haven | CC0 |
| `matas_*`, `follaje_*` — atlas recortados sobre negro | generados | — |

Las rocas venían con más de un millón de triángulos cada una y se podaron a unos
pocos miles agrupando vértices en cuadrícula. A las plantas **no** se las poda:
agrupar funde puntos de zonas distintas del atlas y les arruina las UV — la
primera versión salió toda negra por eso.
