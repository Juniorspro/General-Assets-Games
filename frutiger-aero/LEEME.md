# Frutiger Aero

Una página sobre la estética de 2004 a 2012: qué fue, de qué está hecha, dónde
vivía y por qué desapareció de golpe en 2013.

Vive aparte del sitio de IBLO, en su propio proyecto de Cloudflare Pages, porque
no tiene nada que ver con esa marca.

## Las ilustraciones no vienen de ningún lado

No hay banco de imágenes ni fotos de nadie: las diecinueve imágenes del sitio se
dibujan con canvas y se guardan como WebP. La receta está en
`generar-imagenes.mjs`, con las piezas del lenguaje —cielo, rayos, nubes,
burbuja, agua con caústicas, pasto, vidrio, orbe, gotas, peces, aluminio— y las
escenas que las combinan.

Para rehacerlas (salen distintas cada vez, porque llevan azar):

    node generar-imagenes.mjs

Necesita Playwright, que es quien pone el navegador que sabe dibujar en canvas y
exportar WebP. Las imágenes quedan versionadas en `sitio/img/`, así publicar no depende
de correr esto.

El mismo dibujante, recortado a cuatro escenas, corre en la página: es el taller
de «Hacé el tuyo», que genera un fondo y lo deja descargar como PNG.

## Detalles que costaron

- **Dos elementos con el mismo `id`.** La sección de la galería y la rejilla de
  adentro se llamaban las dos `galeria`. `getElementById` devuelve el primero, así
  que el guión le escribía adentro a la *sección* y le borraba el título y el
  texto. No dio ningún error: simplemente faltaba media sección.
- **`aspect-ratio` sin `height:auto`.** Los `<img>` llevan `width` y `height` en
  el HTML para que el navegador reserve el lugar y la página no salte al cargar,
  pero ese alto le gana a `aspect-ratio`. Las tarjetas salían de 640 px de alto en
  vez de 184.

## Publicar

    npx wrangler pages deploy sitio --project-name frutiger-aero --branch main

Se publica **sólo `sitio/`**. El generador y estas notas quedan afuera: son del
repo, no de la web.
