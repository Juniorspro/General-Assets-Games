# Frutiger Aero

Una foto de fondo, la barra de vidrio arriba y un cartel que dice
«Próximamente :)» con la mascota. Nada más.

    https://frutiger-aero-86q.pages.dev

**No carga ni un byte de JavaScript**: no hay nada que mover todavía. El sitio
entero pesa 504 KB, y de eso 384 KB son las ocho poses de la mascota.

Lo que tuvo antes —siete secciones, seis personajes en 3D, dieciocho íconos,
ocho láminas de estéticas y cinco pantallas de error escritas en CSS— se sacó a
pedido y sigue en la historia de git (`git log -- frutiger-aero`).

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

Lo que las hace parecer el mismo personaje en las ocho es repetir **la misma
descripción física completa** —pelo celeste de píxeles, visor espejado,
auriculares, buzo grande, pantalón blanco, zapatillas azules— en cada prompt, y
cambiar sólo la pose. Con una descripción corta («el personaje de antes,
saludando») salen ocho personajes distintos.

En la página va `m-saludando`, con un flote de cinco segundos y medio que se
apaga con `prefers-reduced-motion`.

## Publicar

    npx wrangler pages deploy sitio --project-name frutiger-aero --branch main
