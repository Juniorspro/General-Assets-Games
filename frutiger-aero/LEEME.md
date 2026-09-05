# Frutiger Aero

Una página vacía con un fondo, en su propio proyecto de Cloudflare Pages.

    https://frutiger-aero-86q.pages.dev

Antes tenía siete secciones, una galería y un generador de fondos en canvas. Todo
eso se sacó a pedido: quedó el fondo y nada más. Sigue en la historia de git por
si alguna vez hace falta (`git log -- frutiger-aero`).

## El fondo

Generado con **Rezona Lab**, proyecto `ZFiGfVPq`. Los prompts están en
`imagenes.json`.

Son **dos** imágenes, no una: `fondo.webp` (1536x864) para pantalla ancha y
`fondo-alto.webp` (864x1536) para el celular, cambiadas por
`@media (orientation: portrait)`. Con una sola, `background-size: cover` recorta
tanto en un teléfono que se pierde el cielo y queda todo pasto.

En vertical el fondo va con `background-attachment: scroll`. `fixed` se ancla al
viewport visual en varios navegadores móviles y el fondo salta cuando aparece o
se esconde la barra de direcciones.

234 KB las dos.

## Publicar

    npx wrangler pages deploy sitio --project-name frutiger-aero --branch main

Se publica **sólo `sitio/`**. Estas notas y `imagenes.json` quedan afuera: son del
repo, no de la web.
