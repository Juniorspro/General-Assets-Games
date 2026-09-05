# Frutiger Aero

Una página sobre la estética de 2004 a 2012, hecha con el material que la
reemplazó: **Liquid Glass**. Una foto de fondo y encima piezas de vidrio
flotando. Ninguna ilustración, ningún degradado dibujado.

    https://frutiger-aero-86q.pages.dev

## El vidrio

Son tres capas y hacen falta las tres. Con sólo la primera queda un rectángulo
borroso, que es lo que hace todo el mundo y no es esto.

1. **El cuerpo** — `backdrop-filter: blur(30px) saturate(190%)` sobre un tinte
   oscuro. El tinte no es decoración: sobre una foto de cielo, el vidrio claro
   deja el texto blanco ilegible.
2. **`::before`, el filo** — un degradado diagonal recortado a 1 px con
   `mask-composite: exclude`, para que el borde parezca doblar la luz. Es lo que
   separa esto de un `div` con blur.
3. **`::after`, el reflejo** — un brillo radial que sigue al puntero. Las
   coordenadas las escribe `pagina.js` **relativas a la pieza**, no a la
   ventana: si no, el reflejo de una hoja de abajo aparece corrido.

Se apaga entero con `prefers-reduced-motion`.

## El fondo

Dos imágenes, no una: `fondo.webp` (1536x864) para pantalla ancha y
`fondo-alto.webp` (864x1536) para el celular, cambiadas por
`@media (orientation: portrait)`. Con una sola, `cover` recorta tanto en un
teléfono que se pierde el cielo. En vertical va con
`background-attachment: scroll`: `fixed` se ancla al viewport visual en varios
navegadores móviles y el fondo salta con la barra de direcciones.

Las dos son azul de arriba abajo con apenas una franja de pasto: **las versiones
con nubes grandes no sirven**, porque a través del vidrio el blanco de las nubes
lava el texto y la página entera se ve descolorida.

## Los personajes 3D

Seis modelos en `sitio/modelos/`, generados con Rezona Lab (proyecto `ZFiGfVPq`,
Tripo3D), unos tres minutos cada uno. Los prompts están en `modelos.json`.

**Crudos son inservibles: 28–30 MB y ~960 mil triángulos.** La cadena que los
deja usables:

    gltf-transform simplify --ratio 0.014 --error 0.004
    gltf-transform resize --width 1024 --height 1024
    gltf-transform webp --quality 72
    gltf-transform prune

Quedan en 410–480 KB cada uno, ~29 mil triángulos, y a tamaño de pantalla no se
nota. La textura a 512 borraba los detalles chicos; a 1024 se leen.

Tres cosas para acordarse:

- **No respetan la orientación.** El robot salió mirando para atrás y el pez de
  canto. Regenerar no lo arregla: salen mirando a otro lado igual. Se corrige
  con un giro fijo por modelo, en el campo `giro` de `pagina.js`. Para
  averiguarlo, renderizar el mismo modelo a 0, 0.8, 1.57, 2.35, 3.14 y 4.7 rad
  en una hoja y elegir.
- **Para que la cara quede en el frente hay que decirlo dos veces**: «front view
  … facing the viewer» *y* describir los rasgos «on the front of the face». Sin
  eso, dos intentos seguidos pusieron el visor en el costado de la cabeza.
- **Ninguno da vidrio.** Todos hornean una textura opaca. Por eso la medusa se
  pide blanca y sin color, y el material de vidrio se aplica en el visor con
  `MeshPhysicalMaterial`. Es el botón «De vidrio».

## El lector de GLB

`visor.js` trae su propio lector en vez de `GLTFLoader`, porque los
`examples/jsm` de three no están publicados en cdnjs. Son 110 líneas y dos
trampas que **no dan error**, sólo resultado malo:

- **Los atributos vienen entrelazados** (`byteStride` 32): posición, normal y uv
  intercalados en el mismo bufferView. Leerlos de corrido da una malla
  deformada.
- **Las texturas van por `EXT_texture_webp`**: la imagen está en
  `texture.extensions.EXT_texture_webp.source`, no en `texture.source`.
  Ignorarlo deja el modelo gris.

`three` está **copiado** en `sitio/vendor/`, no traído de un CDN: así lo que se
prueba en local es exactamente lo que se publica.

El encuadre también es del visor: Tripo ignora las medidas que le pidas, así que
se mide la caja con `Box3`, se lleva el centro al origen y se normaliza el lado
mayor a 1,25 unidades, con la cámara en z=3,7 y fov 32.

## Un aviso sobre las capturas de prueba

Chromium mezcla mal `background-attachment: fixed` con `backdrop-filter` cuando
se hace `scrollIntoView` y se saca la foto enseguida: salen capturas con capas
viejas, paneles sin su color de selección o la página entera corrida. **No es un
bug de la página.** Antes de perseguir uno de esos, comprobar el estado con
`getComputedStyle` en vez de mirar la captura.

## Publicar

    npx wrangler pages deploy sitio --project-name frutiger-aero --branch main
