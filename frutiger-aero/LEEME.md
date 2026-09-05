# Frutiger Aero

Una página sobre la estética de 2004 a 2012: qué fue, de qué está hecha, dónde
vivía y por qué desapareció de golpe en 2013.

Vive aparte del sitio de IBLO, en su propio proyecto de Cloudflare Pages, porque
no tiene nada que ver con esa marca.

## Las ilustraciones están generadas

Las quince ilustraciones de `sitio/img/` están generadas con **Rezona Lab**,
proyecto `ZFiGfVPq`, describiendo con palabras lo que hacía un fondo de escritorio
de 2007. El prompt exacto de cada una, y en qué archivos del sitio terminó, está
en `imagenes.json`: sirve para rehacer una sola sin tocar las otras catorce.

Lo que se aprendió generándolas:

- **El modelo por defecto sólo saca PNG.** Un `.jpg` en `output_path` devuelve
  `GENERATION_OUTPUT_FORMAT_MISMATCH`, que es terminal: no hay que reintentar,
  hay que cambiar la extensión.
- **El servidor renombra lo que pedís.** `portada.png` volvió como
  `portada-g1.png`. Hay que leer el `output_path` de *cada* respuesta, nunca
  fiarse del que mandaste ni del orden en que vuelven.
- **`size` respeta la relación, no el número.** Pidiendo `1536x672` devolvió
  `1376x768`, que es el mismo 16:9. Sin `size` sale 1024x1024.
- **Las respuestas vuelven desordenadas** cuando hay varias en vuelo. El cliente
  (`herramientas/rezona/rz.py`) las empareja por el `id` del JSON-RPC; hacerlo por
  posición cruza los resultados en silencio.

De PNG a WebP con recorte *cover*, con `recortar.mjs` y el plan de medidas de
`plan-recorte.json`. Las quince quedan en 1,1 MB.

## El dibujante de canvas sigue vivo, pero de otra cosa

`generar-imagenes.mjs` es el mismo código que corre en la página, en el taller de
«Hacé el tuyo»: dibuja un fondo con canvas en vivo y lo deja bajar como PNG. Ya no
hace las ilustraciones del sitio, y por eso ahora escribe en `pruebas-canvas/` en
vez de en `sitio/img/`. Si siguiera apuntando ahí, correrlo una sola vez pisaría
en silencio las quince imágenes buenas.

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
