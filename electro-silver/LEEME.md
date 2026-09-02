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
- [x] `admin.html` — panel para cargar publicaciones (foto + texto + precio + WhatsApp)
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


## El panel de publicaciones (`admin.html`)

Se abre en `tudominio/admin.html`. Cargás una foto, título, descripción, precio,
cuotas y el WhatsApp, ves cómo va a quedar mientras escribís, y le das Publicar.
Aparece en la web arriba de todo, en «Novedades del local».

La foto se achica sola a 1200 px y se guarda en webp: una foto de celular de 4 MB
queda en 100-200 KB. Eso es lo que hace que el plan gratis alcance.

### Entrar

Si el proyecto ya está conectado, el panel abre directo en una pantalla de
**mail y contraseña**. Nada más. La sesión queda guardada, así que no lo pide
en cada visita.

Si abrís el panel en otra computadora o en otro navegador, esa misma pantalla
te pide una vez la dirección del proyecto y la clave anon (te dice dónde
encontrarlas). Para saltear eso para siempre, completá al principio del
archivo:

```js
var CFG_FIJA = { url:"https://xxxx.supabase.co", key:"eyJhbGciOi…" };
```

Con eso el panel arranca apuntado al proyecto en cualquier dispositivo y sólo
pide usuario y contraseña. La clave anon puede ir escrita ahí: es pública por
diseño y no deja escribir nada.

### Dos modos

**Sin configurar nada** guarda en el navegador. Sirve para probar todo el flujo,
pero las publicaciones sólo las ve quien usa esa computadora.

**Conectado a Supabase** las guarda en internet y las ve todo el mundo. El botón
«Configurar» abre un asistente que va paso por paso y verifica cada uno antes de
seguir. Es gratis y no pide tarjeta.

Lo que hace solo el asistente:

- abre la pantalla exacta de Supabase que hace falta en cada paso, con el enlace
  armado para *tu* proyecto (no el genérico)
- de un pegote cualquiera saca la dirección y la clave que sirve
- **rechaza la clave secreta** (service_role) si la pegás de más, y te avisa
- copia el SQL de un toque y después verifica que la tabla y el depósito existan
- crea tu usuario y te deja adentro, sin volver al panel de Supabase
- si la confirmación de mail está encendida, te dice exactamente dónde apagarla
- sube a internet las publicaciones que ya tenías guardadas en el navegador, con
  las fotos

Lo único que no puedo hacer por vos es crear la cuenta y el proyecto, y apretar
«Run» en el editor SQL: eso pide tu sesión de Supabase.

### Sobre la seguridad

La clave que se pega en el panel es la **anon public**, que es pública a propósito:
no da permiso de escribir. Escribir requiere iniciar sesión con el usuario que creás
en el paso 3, y eso lo controla el servidor, no la página. Así que aunque alguien
abra `admin.html`, sin tu usuario y contraseña no puede publicar nada.

La **service_role key** no va nunca en una página. Si la pegás ahí, cualquiera que
mire el código fuente puede borrar toda la base.

### Copias

«Bajar copia» te da un JSON con todas las publicaciones (y lo copia al portapapeles).
«Subir copia» las vuelve a cargar, sólo en modo demostración.


## El botón mágico de la descripción

Debajo del cuadro de descripción hay un botón con una chispa: escribís cuatro
palabras sueltas y la IA te devuelve la descripción redactada. Se puede deshacer
de un toque si no gusta.

La IA recibe el título, el rubro, el precio y las cuotas además de lo que
escribiste, así que la descripción sale con datos de verdad. Y tiene prohibido
inventar: si no le pasás una medida o una garantía, no la nombra.

**Para activarlo** hace falta una clave gratis de Google AI Studio
(aistudio.google.com/apikey, no pide tarjeta). El panel te guía: «activar el
botón» al lado de la chispa.

**Ojo con esta clave, que no es como la de Supabase.** Ésta sí sirve desde
cualquier lado. Cuando la web esté publicada, entrá a la clave en Google Cloud,
en **Application restrictions** elegí **Websites** y agregá tu dominio: así sólo
funciona desde tu página. Mientras tanto el plan gratis tiene tope diario, así
que el daño posible es que alguien te gaste la cuota del día.

El panel prueba varios modelos hasta encontrar uno que exista en tu cuenta
(gemini-3.8-flash, 3.5, 2.5, 2.0) y se queda con el que anduvo.

El ícono está en `imagenes/chispa.png` (blanco sobre transparente, se usa como
máscara para que tome el color del botón) y en `imagenes/chispa-color.png`.
