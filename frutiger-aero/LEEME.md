# Frutiger Aero

Una página sobre la estética de 2004 a 2012, armada como un escritorio: el fondo
es una foto fija y todo lo demás son ventanas de vidrio encima, con la barra de
tareas abajo haciendo de navegación.

    https://frutiger-aero-86q.pages.dev

## Lo que hay

`sitio/index.html` es la estructura y el estilo; `pagina.js` es todo lo que se
mueve; `visor.js` es el lector de modelos 3D. Se publica **sólo `sitio/`**.

- **El fondo** son dos imágenes, no una: `fondo.webp` (1536x864) para pantalla
  ancha y `fondo-alto.webp` (864x1536) para el celular, cambiadas por
  `@media (orientation: portrait)`. Con una sola, `cover` recorta tanto en un
  teléfono que se pierde el cielo y queda todo pasto. En vertical va con
  `background-attachment: scroll`: `fixed` se ancla al viewport visual en varios
  navegadores móviles y el fondo salta con la barra de direcciones.
- **Seis personajes en 3D** en `sitio/modelos/`, que se giran arrastrando.
- **Quince ilustraciones** en `sitio/img/`.

Todo generado con **Rezona Lab**, proyecto `ZFiGfVPq`. Los prompts exactos están
en `imagenes.json` y `modelos.json`, para poder rehacer una sola cosa sin tocar
el resto.

## Los modelos 3D

Salen de Tripo3D vía `submit_model3d_generation`, unos tres minutos cada uno.
**Crudos son inservibles para web: 28–30 MB y ~960 mil triángulos.** La cadena
que los deja usables:

    gltf-transform simplify --ratio 0.014 --error 0.004
    gltf-transform resize --width 1024 --height 1024
    gltf-transform webp --quality 72
    gltf-transform prune

Quedan en 410–480 KB cada uno, ~29 mil triángulos, y a tamaño de pantalla no se
nota la diferencia. La textura a 512 borraba los detalles chicos; a 1024 se leen
y cuesta poco más.

Lo que hay que saber al pedirlos:

- **No respetan la orientación.** El robot salió con la cara mirando para atrás
  y el pez de canto. No se arregla regenerando: se arregla con un giro por
  personaje, que está anotado en el campo `giro` de `pagina.js`.
- **La primera vez no siempre sale.** El robot llevó tres intentos: el primero
  fue un amasijo, el segundo tenía el visor en el costado de la cabeza. Lo que
  lo destrabó fue pedir explícitamente «front view … facing the viewer» y
  describir la cara *en el frente*.
- **Ninguno da vidrio.** Todos hornean una textura opaca. Por eso la medusa se
  pide blanca y sin color, y el material de vidrio se aplica en el visor con
  `MeshPhysicalMaterial`. Es el botón «De vidrio».

## El lector de GLB

`visor.js` trae su propio lector en vez de `GLTFLoader`, porque los
`examples/jsm` de three no están publicados en cdnjs y traerlo significaba
depender de otro origen más. Son 110 líneas y hay que saber dos cosas:

- **Los atributos vienen entrelazados** (`byteStride` 32): posición, normal y uv
  intercalados en el mismo bufferView. Leerlos de corrido da una malla
  deformada, sin ningún error.
- **Las texturas van por `EXT_texture_webp`**, así que la imagen está en
  `texture.extensions.EXT_texture_webp.source` y no en `texture.source`.
  Ignorarlo deja el modelo gris, tampoco con error.

`three` está **copiado** en `sitio/vendor/`, no traído de un CDN: así lo que se
prueba en local es exactamente lo que se publica, y la página no se rompe si el
CDN cambia.

El encuadre también es del visor: Tripo ignora las medidas que le pidas, así que
se mide la caja con `Box3`, se lleva el centro al origen y se normaliza el lado
mayor a 1,25 unidades, con la cámara en z=3,7 y fov 32.

## Publicar

    npx wrangler pages deploy sitio --project-name frutiger-aero --branch main
