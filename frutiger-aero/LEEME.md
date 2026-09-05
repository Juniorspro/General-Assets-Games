# Frutiger Aero

Una página sobre la estética de 2004 a 2012: qué fue, de qué está hecha, dónde
vivía y por qué desapareció de golpe en 2013.

Vive aparte del sitio de IBLO, en su propio proyecto de Cloudflare Pages, porque
no tiene nada que ver con esa marca.

## Las ilustraciones se dibujan solas

Las diecinueve ilustraciones del sitio no salen de ningún banco de imágenes: se
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

## Las fotos sí son de alguien

Aparte de las ilustraciones hay una sección de fotos de verdad, en `sitio/fotos/`.
Están buscadas en la API de [Openverse](https://api.openverse.org) —sin clave,
sin cuenta— filtrando `license=cc0,pdm,by`: sólo licencias que permiten usarlas y
modificarlas, también con fines comerciales. Google Imágenes no sirve para esto:
casi todo lo que devuelve tiene dueño y republicarlo sería robarlo.

De cada foto se guarda autor, licencia, enlace a la licencia y enlace al original.
Eso no es decorativo: la CC BY **obliga** a nombrar al autor. Por eso el crédito
viaja pegado a la foto, dentro del array `REALES` de `index.html`, y no en una
lista aparte que se despega la primera vez que alguien reordena la galería.

Cada foto va dos veces: `nombre.webp` (1400 px, la que abre el visor) y
`nombre-min.webp` (480 px, la miniatura de la rejilla). Como en esta máquina no
hay `cwebp` ni ImageMagick, la conversión la hace el mismo navegador de
Playwright: `canvas.toDataURL("image/webp", calidad)`.

Dos cosas para acordarse si hay que traer más:

- **Wikimedia corta el original.** Bajar `upload.wikimedia.org/.../Foto.jpg` de a
  varias devuelve `429 Too many requests`. Hay que pedir la miniatura
  (`/commons/thumb/a/ab/Foto.jpg/1280px-Foto.jpg`) y sólo en los anchos que
  ellos publican: 1600 px, por ejemplo, tampoco existe.
- **`crossOrigin="anonymous"` sin CORS no falla al dibujar, falla al cargar.** El
  servidor local que sirve las fotos al navegador tiene que mandar
  `Access-Control-Allow-Origin`, o `img.decode()` tira `EncodingError` y parece
  que la foto estuviera rota.

## Publicar

    npx wrangler pages deploy sitio --project-name frutiger-aero --branch main

Se publica **sólo `sitio/`**. El generador y estas notas quedan afuera: son del
repo, no de la web.
