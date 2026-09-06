# Frutiger Aero

Una foto de fondo, la barra de vidrio arriba y un cartel que dice
«Próximamente :)» con la mascota. Nada más.

    https://frutiger-aero-86q.pages.dev

La mascota es un **modelo 3D de verdad**, animado por código. Se puede
arrastrar para girarla y tocarla para que salte. El sitio pesa 1,8 MB, de los
cuales 1,2 MB son three.js y el modelo.

## Todo lo que se cachea lleva el hash de su contenido en el nombre

`immutable` es una promesa: *esta URL nunca cambia de contenido*. Se rompió una
vez —se reemplazaron las imágenes de la mascota con el mismo nombre y el
navegador del dueño siguió mostrando las viejas durante un año, porque se lo
habíamos pedido—. Ahora cada archivo de `img/`, `js/`, `vendor/` y `modelos/`
lleva ocho dígitos de su propio hash: si el archivo cambia, cambia la URL, y no
hay caché que pueda quedarse con lo viejo. El mapa de nombres queda en
`nombres.json` y `nombres-js.json`.

## Las animaciones son por código, no grabadas

El modelo es **una malla sola, sin huesos** —eso es lo que devuelve una
reconstrucción hecha a partir de una imagen—, así que no hay clips que
reproducir. Todo se calcula en cada cuadro, en `sitio/js/mascota.js`:

- **flote** — un seno lento en Y, período 4 s;
- **respiración** — escala no uniforme (sube y se angosta lo mismo, para no
  cambiar de volumen), período 2 s;
- **bamboleo** — una inclinación mínima en Z, período 6 s;
- **te mira** — el cuerpo gira hacia el puntero con un resorte, no de golpe;
- **arrastrar** — gira libre y sigue girando al soltar, con roce;
- **tocarla** — un salto con aplastado antes y después.

Los tres períodos son 4, 2 y 6 a propósito: si fueran iguales, el conjunto se
repetiría cada cuatro segundos y el ojo engancharía el bucle.

Con `prefers-reduced-motion` queda quieta, de frente.

Si no hay WebGL o el modelo no baja, el guión saca el `<canvas>` y queda la
imagen que ya estaba en el HTML. Un cuadro vacío sería peor que una foto.

Lo que tuvo antes —siete secciones, seis personajes en 3D, dieciocho íconos,
ocho láminas de estéticas y cinco pantallas de error escritas en CSS— se sacó a
pedido y sigue en la historia de git (`git log -- frutiger-aero`).

## Dos trampas que costaron un rato, las dos silenciosas

- **`img{display:block}` le gana al `[hidden]` del navegador.** Es una regla de
  autor contra una de la hoja del agente, así que esconder el respaldo no lo
  escondía: se veían la foto y el modelo, uno arriba del otro. Hace falta
  `[hidden]{display:none !important}`.
- **Mover un módulo de carpeta rompe sus propios imports.** `visor.js` pasó a
  `js/` y siguió pidiendo `./vendor/three…`, que desde ahí es
  `/js/vendor/three…`. No hubo error visible: el módulo no cargó y la página se
  quedó con la foto, que es exactamente lo que tenía que hacer al fallar.

## El vidrio

Son tres capas y hacen falta las tres. Con sólo la primera queda un rectángulo
borroso, que es lo que hace todo el mundo y no es esto.

1. **El cuerpo** — `backdrop-filter: blur(30px) saturate(190%)` sobre un tinte
   oscuro. El tinte no es decoración: sobre una foto de cielo, el vidrio claro
   deja el texto blanco ilegible.
2. **`::before`, el filo** — un degradado diagonal recortado a 1 px con
   `mask-composite: exclude`, para que el borde parezca doblar la luz.
3. **`::after`, el brillo** de la mitad de arriba.

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

## La mascota

Ocho poses en `sitio/img/mascota/`, generadas con Rezona a partir de un
personaje que trajo el dueño: saludando, en una burbuja, sentada en una nube,
jugando, bajo el agua, surfeando, haciendo la V y dormida. Los prompts están en
`modelos.json`.

Son WebP de 760x760 **con canal alfa**, 44–54 KB cada una. `transparent: true`
devuelve PNG con alfa de verdad, y el canvas de Playwright lo conserva al pasar
a WebP.

**Salen de una imagen de referencia, no de una descripción.** La primera vuelta
se hizo describiendo al personaje con palabras y salió un cubito de voxels: el
cuerpo es **suave y redondeado** —mangas que caen, pantalón ancho, manos
redondas sin dedos— y sólo el pelo y el visor tienen el escalonado de píxeles.
Eso, en palabras, no se acierta.

`submit_image_generation` acepta `source_urls`, que son **URLs y no archivos**.
La referencia se publicó un rato en el propio sitio, bajo un nombre al azar, se
generaron las ocho, y se sacó en el despliegue siguiente. Con la referencia
salieron iguales a la primera.

En la página va `m-saludando`, con un flote de cinco segundos y medio que se
apaga con `prefers-reduced-motion`.

## Publicar

    npx wrangler pages deploy sitio --project-name frutiger-aero --branch main
