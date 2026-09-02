# Electro Silver — Presidencia Roca, Chaco

Carpeta del sitio. Esto es lo que se arrastra a Netlify: **la carpeta `electro-silver`
entera**, no los archivos sueltos.

## Estado

- [x] Carpeta `imagenes/` creada
- [x] `index.html` — página completa, 5,6 MB, todo embebido (no depende de internet
      salvo las fuentes de Google y three.js)
- [x] `<head>` con título, descripción, favicon, Open Graph y datos estructurados
      (`HomeGoodsStore` con dirección, horarios, coordenadas y las 6 localidades)
- [x] `sitemap.xml` y `robots.txt`
- [ ] `imagenes/logo.png` — cuadrado, mínimo 512×512, PNG con fondo
- [ ] Archivo de verificación de Google Search Console (mandame el nombre **y** la
      línea de adentro: si el archivo va vacío, la verificación falla)
- [ ] Reemplazar los datos de ejemplo (ver abajo)

## Qué hay que reemplazar antes de publicar

Están marcados en el pie de la página y en comentarios del HTML:

| dónde | qué dice ahora |
|---|---|
| JSON-LD y sección «El local» | Av. San Martín 480 · (3725) 00-0000 |
| JSON-LD `geo` | -26.1333, -59.6000 (centro del pueblo, no del local) |
| `canonical`, `og:url`, `og:image`, sitemap, robots | electrosilver.com.ar |
| Precios del catálogo | valores de ejemplo |
| Tarifas de instalación y de envío | valores de ejemplo |
| Las tres opiniones | inventadas para la demostración |
| Botón de WhatsApp | copia el mensaje al portapapeles; con `wa_link` cargado abre WhatsApp |

El `wa_link` se carga en el JSON de datos que está dentro del propio `index.html`
(buscá `"wa_link": ""` y poné `https://wa.me/549372500000`, con el número real).

## Datos del negocio que hacen falta

Sin esto el SEO local queda inventado, y eso a Google le sirve poco y a un cliente
que llama a un teléfono equivocado, menos:

1. Dirección exacta (calle y número, o la referencia que usen)
2. Teléfono y WhatsApp
3. Horario de atención
4. Qué venden y qué reparan
5. Si ya existe la ficha de Google (Perfil de Empresa) y con qué nombre
6. Redes: Facebook / Instagram, si tienen
7. Si hacen envíos y hasta dónde

## Datos de la localidad (verificados)

| dato | valor |
|---|---|
| Localidad | Presidencia Roca |
| Departamento | Libertador General San Martín |
| Provincia | Chaco, Argentina |
| Código postal | 3511 |
| Habitantes | ~4.987 en el municipio (censo 2001) |
| Accesos | Rutas Provinciales 3 y 3bis |
| Cerca | Pampa del Indio (41 km por RP 3), General José de San Martín |
| Coordenadas | -26.13, -59.60 (aprox., hay que afinarlas con la dirección real) |

## Los pasos manuales que quedan para vos

1. Guardar el logo como `imagenes/logo.png`
2. Arrastrar la carpeta `electro-silver` a Netlify
3. En Search Console, tocar "Verificar" (el archivo ya va a estar en su lugar)
4. Crear o reclamar el Perfil de Empresa de Google — para un local de barrio esto
   pesa más que cualquier etiqueta del HTML
