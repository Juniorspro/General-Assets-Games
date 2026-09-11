# Fitz Roy · datos del mundo

Diez kilómetros por diez centrados en el macizo del Cerro Fitz Roy, El Chaltén,
Santa Cruz. Centro en **-49,2900 / -73,0000**. Los sirve jsDelivr desde este
repositorio; el juego (`juegos-pc/Fitz_Roy.html`) los pide por CDN.

| archivo | qué es | de dónde sale |
|---|---|---|
| `altura.png` | relieve, 2048², dos bytes por punto (R·256+G) sobre el rango 246,8 – 2866,1 m | tiles *terrarium* de AWS (SRTM + Copernicus) |
| `normal.png` | normales del terreno a resolución plena | calculado del relieve |
| `luz.png` | R sombra del sol · G oclusión de cielo · B máscara de agua | horneado barriendo el relieve |
| `orto_lejos.jpg` | ortofoto de los 10 km, 4096² (2,4 m/px) | ESRI World Imagery |
| `orto_cerca.jpg` | ortofoto de 4 km, 4096² (0,98 m/px) | ESRI World Imagery |
| `detalle.jpg` | grano fino para multiplicar sobre la foto | derivado de un escaneo |
| `cielo.hdr` | panorámica HDR 4K, ilumina y se ve | Poly Haven, CC0 |
| `pasto_*`, `follaje_*` | atlas recortados de plantas | generados |

La imagen satelital de ESRI tiene términos de uso propios: sirve para probar,
pero para publicar conviene Sentinel-2, que es abierta aunque llega a 10 m/px.
