# Frutiger Aero

Una foto de fondo, la barra de vidrio arriba y un cartel que dice
«Próximamente :)» con la mascota. Nada más.

    https://frutiger-aero-86q.pages.dev

La mascota es un **modelo 3D con rig**: 41 huesos, animación de reposo, salto
al tocarla, y una capa de movimiento hecha por código encima. Se arrastra para
girarla.

El sitio pesa 3,1 MB, de los cuales 2,4 MB son el modelo, three.js y
GLTFLoader. **Es mucho para una página que dice «próximamente»**, y se paga por
tener un 3D de verdad. La imagen de la mascota carga primero y el 3D la
reemplaza cuando termina de bajar, así que la página se ve completa desde el
primer momento.

## Todo lo que se cachea lleva el hash de su contenido en el nombre

`immutable` es una promesa: *esta URL nunca cambia de contenido*. Se rompió una
vez —se reemplazaron las imágenes de la mascota con el mismo nombre y el
navegador del dueño siguió mostrando las viejas durante un año, porque se lo
habíamos pedido—. Ahora cada archivo de `img/`, `js/`, `vendor/` y `modelos/`
lleva ocho dígitos de su propio hash: si el archivo cambia, cambia la URL, y no
hay caché que pueda quedarse con lo viejo. El mapa de nombres queda en
`nombres.json` y `nombres-js.json`.

## El modelo tiene rig, y encima una capa por código

`submit_rig3d_generation` sobre el `task_id` del modelo devolvió **41 huesos y
tres animaciones**: `preset:walk`, `preset:idle` y `preset:jump`. Se usan idle
como base y jump al tocarla; walk se sacó del GLB a mano porque para una mascota
parada eran ~260 KB que nunca se iban a reproducir.

Encima del esqueleto va una capa hecha por código, y **las dos cosas conviven
porque tocan lugares distintos**: el esqueleto mueve las partes por dentro y el
código mueve, gira y escala al muñeco entero, desde un envoltorio. Si el código
tocara los huesos, pisaría a la animación en cada cuadro.

La capa por código, en `sitio/js/mascota.js`:

- **flote** — un seno lento en Y, período 4 s;
- **respiración** — escala no uniforme (sube y se angosta lo mismo, para no
  cambiar de volumen), período 2 s;
- **bamboleo** — una inclinación mínima en Z, período 6 s;
- **te mira** — el cuerpo gira hacia el puntero con un resorte, no de golpe;
- **arrastrar** — gira libre y sigue girando al soltar, con roce;
- **tocarla** — un salto con aplastado antes y después.

Los tres períodos son 4, 2 y 6 a propósito: si fueran iguales, el conjunto se
repetiría cada cuatro segundos y el ojo engancharía el bucle.

Con `prefers-reduced-motion` se apaga esa capa, pero **el esqueleto sigue**:
quieto del todo sería un maniquí, no una mascota.

## La pixelación es del renderizador, no un filtro

El lienzo dibuja a **128 px de lado** y el CSS lo estira con
`image-rendering: pixelated`. No hay segundo pase ni shader. Y de paso resuelve
un problema real: la malla sale de reconstruir **una sola foto**, así que de
cerca se le ven los bultos y la textura estirada. A 128 px eso desaparece y
queda el mismo escalonado que el personaje ya tiene en el pelo y el visor.

Dos detalles que hay que respetar para que funcione:
`motor.setPixelRatio(1)` —si no, en una pantalla retina el buffer sale al doble
y se pierde la mitad del efecto— y `setSize(LADO, LADO, false)`: con `true`,
three le escribe el CSS al lienzo y anula todo.

## El encuadre se mide por los huesos

`Box3.setFromObject` sobre una malla con skin devuelve la caja de la **pose de
amarre**, que no es la que se ve: el muñeco quedaba chico y corrido hacia abajo.
Los huesos, en cambio, ya están donde los puso la animación, así que la caja se
arma con sus posiciones y se agranda un 16% para que no le corte la ropa.

La escala va en un envoltorio y no en el nodo del skin: tocarle la escala a un
nodo con esqueleto desalinea los huesos de la malla.

## GLTFLoader está copiado, no traído de un CDN

El lector de GLB hecho a mano no sabe de esqueletos ni de animaciones, y
escribirlo era medio día de trabajo para reinventar algo que ya existe.
`GLTFLoader` no está en cdnjs, pero sí en jsDelivr como parte del paquete de
three: se bajó junto con su dependencia `BufferGeometryUtils`, se les reescribió
el `from 'three'` a la ruta local, y quedaron en `sitio/vendor/`. Cero
dependencias de un CDN en tiempo de ejecución.

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

## El ícono de la barra

Lo trajo el dueño: el monigote de vidrio con el globo terráqueo. Venía en PNG
**sin canal alfa**, sobre fondo blanco.

Sacarle el blanco por color —«todo lo que sea claro es fondo»— le comería los
brillos blancos que tiene *encima* del cuerpo azul, que son justamente lo que lo
hace parecer de vidrio. Así que el fondo se busca por **contigüidad**: se inunda
desde los cuatro bordes y sólo se borra lo que se toca con el borde.

El reflejo de abajo no caía por color —es gris azulado, no blanco—, así que
aparte se busca la última fila con un pixel saturado (esa es la figura de
verdad) y todo lo de abajo se declara fondo.

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
