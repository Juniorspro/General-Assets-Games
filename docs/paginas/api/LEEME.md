# La API de IBLO

Son *Pages Functions* de Cloudflare. En el despliegue viven en `functions/api/`
del proyecto `iblo-eventos`; acá se guardan para tenerlas versionadas.

| Ruta | Qué hace |
|---|---|
| `GET /api/estado` | Dice si el servidor y la IA están vivos. Sin sesión. |
| `POST /api/login` | Usuario y contraseña; devuelve la sesión. |
| `GET /api/publicaciones` | Todo lo publicado. `?solapa=proximamente\|entradas\|avisos` filtra una solapa de la web. Sin sesión. |
| `POST /api/publicaciones` | Sube una publicación de cualquier tipo. Requiere sesión. |
| `DELETE /api/publicaciones?id=` | La baja de la web. Requiere sesión. |
| `GET /api/entradas` | Las entradas publicadas, con la forma vieja. Es lo que leía la página de entradas. Sin sesión. |
| `POST /api/entradas` | Publica una entrada. Requiere sesión. |
| `DELETE /api/entradas?id=` | Da de baja una publicación. Requiere sesión. |
| `GET /api/mias` | Todas las publicaciones, incluso las dadas de baja. Requiere sesión. |
| `POST /api/mejorar` | Reescribe la descripción con Workers AI. Sin sesión. |
| `GET /api/destacado` | El aviso de la portada, con su color. Sin sesión. |
| `POST /api/destacado` | Guarda el aviso desde la app. Requiere sesión. |
| `POST /api/clave` | Cambia la contraseña sabiendo la actual. Requiere sesión. |
| `GET /api/instagram` | Archivo que se llena solo desde la cuenta de IG. Sin sesión. |
| `POST /api/sugerir` | El botón «Nuevo» de la app: trae lo último de Instagram y devuelve los posteos que anuncian algo ya armados como publicación, más qué descartó y por qué. **No sube nada**: el dueño mira y toca publicar. Requiere sesión. |
| `POST /api/prop` | Genera el adorno de una publicación: el objeto de la temática sobre pantalla verde. El recorte lo hace la app. Requiere sesión. |
| `POST /api/asistente` | Le pasás una frase suelta ("el 25 de octubre hacemos halloween en el club juventud, entradas a 10 mil") y/o el flyer en `imagen`, y devuelve la propuesta ya cargada: tipo, título, fecha, lugar, hora, precio, color y detalle. Con `publicar: true` la sube él mismo, pero la app no lo usa así: muestra la propuesta y publica cuando el dueño toca. Requiere sesión. |

## Una sola tabla

Todo lo que sube el dueño vive en `publicaciones`, con un `tipo`
(`proximamente`, `entrada`, `aviso`). Antes había una tabla por cosa y el
dueño tenía que acertar dónde cargarla.

Las solapas de la web **no miran el `tipo`, miran el contenido** (`filtroSolapa`
en `_pub.js`): próximamente es lo que tiene fecha futura, entradas es lo que
tiene precio y sigue vigente, avisos es lo que no tiene ni una cosa ni la otra.
Así una fiesta con entradas a la venta sale en las dos solapas sola, y elegir
mal el tipo no rompe nada.

El cartel de la portada (`/api/destacado`) es **la fecha más cercana que todavía
no pasó**. Se publica y aparece sola; el `destacado = 1` es sólo para fijar una
a mano cuando el dueño quiere otra.

Las seis horas de gracia que aparecen en todos lados son para que una fiesta no
desaparezca de la web mientras todavía se está haciendo.

## El botón «Nuevo»

`POST /api/sugerir` mira los posteos de `@iblo_eventos` y publica los que sirven.
El orden en que filtra importa, porque cada paso ahorra el siguiente:

1. **Los que ya se usaron quedan afuera.** Cuando publica algo desde un posteo, le
   guarda el código del posteo en `origen`. Así el botón se puede tocar todas las
   veces que se quiera sin repetir nada.
2. **Prefiltro sin IA** (`pareceAviso` en `sugerir.js`): si el pie de foto no
   nombra ni una fecha ni un precio, se descarta ahí mismo. Eso saca las fotos de
   la fiesta del finde, los agradecimientos y los memes sin gastar una llamada, y
   —más importante— **evita que el modelo invente una fecha**, que es lo que hacía
   cuando se le daba un posteo sin fecha.
3. **Cada posteo pasa por el mismo motor que el asistente** (`_ia.js`): el pie de
   foto hace de «lo que dijo el dueño» y la imagen de flyer. Todos en paralelo.
4. **Se descarta lo que ya pasó** y lo que quedó sin fecha ni precio.
5. **No duplica lo que ya está arriba**: si hay una publicación con la misma fecha
   (mismo día) o el mismo nombre, es la misma fiesta. No la vuelve a publicar; le
   anota el `origen` a la que ya estaba, para no volver a mirar ese posteo. Pasa
   seguido, porque el dueño carga la fiesta a mano antes de postearla en IG.

## Nada se publica sin que el dueño lo vea

Las dos rutas que piensan devuelven una propuesta y no tocan la base. La app la
muestra con todo lo que sacó —qué es, fecha, lugar, hora, precio, el texto— y
recién publica cuando él toca «Publicar»; el otro camino es «Editar y decorar»,
que lo lleva al formulario con todo cargado. Se probó publicando solo y el dueño
prefirió mirar primero.

Cuando la publicación sale de un posteo de Instagram, la app manda el `origen` y
la foto **no viaja**: `POST /api/publicaciones` la busca en la tabla `ig` por ese
código. Son cientos de kilobytes que ya están del lado del servidor.

## Los adornos

`POST /api/prop` devuelve el objeto de la temática **sobre pantalla verde**, y el
recorte lo hace la app en el teléfono (`sacarVerde`, en `app-recorte.js`). El
verde no se saca en el servidor porque el plan gratis de Workers corta a los
10 ms de CPU y pasar un millón de píxeles no entra ahí ni cerca.

Qué objeto pedir se resuelve primero con una tabla de las estéticas de la casa
(wéstern → sombrero, Halloween → calabaza, realeza → corona…), que es instantáneo
y predecible; sólo si no pega ninguna se le pregunta a la IA. El dueño también
puede escribir él mismo qué quiere.

El recorte tiene tres pasos y los tres hacen falta:

1. **Alfa por «cuánto verde de más» tiene el píxel**, con banda blanda en el
   borde, y bajándole el verde a lo que se queda. El generador pinta el rebote
   verde de la pantalla sobre el objeto y eso es lo que dejaba un halo.
2. **Se queda con la mancha más grande.** Tira la sombra del piso y las pelusas
   del fondo que no eran lo bastante verdes como para que el umbral las saque.
3. **Recorta al objeto** y lo baja a 420 px. Sale un WebP con transparencia de
   5 a 20 KB, en unos 50 ms.

Se trabaja sobre una copia de 512 px: es cuatro veces menos laburo que el
original de 1024 y el recorte final igual sale de 420.

En la tarjeta el adorno va **adentro** —la tarjeta recorta lo que se sale— y se
le hace lugar: se apoya sobre la foto si hay foto, y si no hay se le reserva una
banda arriba con `padding`. Sin eso le tapaba el título.

## Cómo está atado

- Base **D1** llamada `iblo` (`27c22f67-3b11-4c92-bb75-37f30f63b84d`), atada como `DB`.
- **Workers AI** atada como `AI`, modelo `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
- Variable secreta `SECRETO`, con la que se firma la sesión (HMAC-SHA256, 30 días).
- Contraseña: PBKDF2-SHA256 con sal por usuario.

## Cuentas

**No hay registro por la web.** La cuenta del dueño (`iblo`) ya está creada y el endpoint
que la creaba fue borrado: cualquiera que dé con el link sólo ve la pantalla de entrar.
Para dar de alta otra cuenta hay que insertarla a mano en D1 con su hash PBKDF2.

Contra la fuerza bruta, la tabla `intentos` guarda los fallos y `login` frena con 429:
**8 fallos desde una misma IP** o **25 contra el mismo usuario**, en una ventana de 15
minutos. El tope por usuario es el que importa: no se esquiva cambiando de IP. Al entrar
bien se borra el historial de esa IP y de ese usuario.

## El archivo de Instagram

`instagram.js` lee `api/v1/feed/user/iblo_eventos/username/` con la cabecera
`X-IG-App-ID`, la misma vía pública que se usó en el relevamiento. **Sale desde los
servidores de Cloudflare y funciona** (probado: 200 y 12 items). No hay tarea programada:
se refresca sola cuando pasaron 2 horas y alguien entra a la página. Guarda hasta 4
publicaciones nuevas por visita para no pasarse del tiempo de CPU, y conserva las
últimas 60.

Las imágenes se bajan y se guardan en base64 dentro de D1 (20-40 KB cada una) porque
**las URLs del CDN de Instagram vencen**; si sólo se guardara el link, el archivo se
rompería en unos días.

## Trampas que costaron encontrar

- **Wrangler sólo compila `functions/` si lo corrés desde la carpeta que la contiene.**
  `wrangler pages deploy sitio` con `sitio/functions/` dentro **no** las toma: hay que
  hacer `cd sitio && wrangler pages deploy .`. Si en la salida no aparece
  «Compiled Worker successfully», las rutas van a responder 405.
- **El plan gratis corta a los 10 ms de CPU.** PBKDF2 con 150.000 vueltas revienta el
  Worker con `error code: 1101`. Con 25.000 entra bien.
- Los modelos de Workers AI se dan de baja seguido: `@cf/meta/llama-3.1-8b-instruct`
  ya no existe. La lista viva está en
  `GET /accounts/{cuenta}/ai/models/search?task=Text Generation`.
- **`response_format: {type:"json_schema"}` garantiza JSON válido pero el modelo deja de
  seguir el system prompt.** Las reglas hay que meterlas en el `description` de cada
  propiedad del esquema. Aun así contesta cortito: por eso `/api/asistente` hace una
  segunda llamada en texto libre sólo para el `detalle`, y decide `tipo` en el código
  (una regex sobre el texto del dueño), no en el modelo.
- **Los modelos con visión de Workers AI no son todos usables.**
  `llama-3.2-11b-vision-instruct` pide aceptar una licencia antes de correr, y
  `llava-1.5-7b` inventa. El que anda sin trámite y lee bien un flyer es
  `@cf/meta/llama-4-scout-17b-16e-instruct`, con la imagen como `image_url`
  (data URI) dentro de `messages`.
- **Cuando el flyer dice una cosa y el dueño escribió otra, el modelo se planta
  y devuelve el título vacío.** El prompt le aclara que manda lo que escribió el
  dueño, y si aun así vuelve vacío, `/api/asistente` reintenta con el texto solo.
- **El `falta` que devuelve el modelo miente**: listaba campos que había
  completado. Se calcula en el código, mirando qué quedó vacío de verdad.
- **El que sabe leer el flyer no es el que sabe ponerle nombre a la fiesta.**
  A `llama-4-scout` se le pedía todo junto y devolvía «IBLO Eventos» de título
  (el logo de la imagen) o el pie de foto entero copiado. Ahora scout sólo
  transcribe la imagen y `llama-3.3-70b` saca los datos del texto, que es lo que
  hace bien. Los dos pasos viven en `_ia.js`, uno solo para las dos rutas que
  piensan: cada arreglo de calidad vale para las dos.
- **El modelo escribe la fecha como se le canta**: `2026-09-19T22:00`,
  `19/09/2026`, `19.09.26`, `19/09`, `18 de julio de 2026`. Pedirle un formato
  exacto y validarlo con una regex tiraba a la basura publicaciones buenas.
  `leerFecha` en `_pub.js` las entiende todas (día primero, y sin año toma la
  próxima que no pasó) y arma el timestamp y el texto que se muestra.
- **El precio venía suelto**: el modelo devuelve «8000» o «8 mil» tan seguido
  como «$8.000». `precioSano` en `_ia.js` lo deja siempre con signo y separador,
  cuidando de no comerse el espacio de antes (quedaba «y$15.000») y de no tocar
  un «2x1».
- **Una fecha ya pasada no aparece en ninguna solapa** —las tres miran lo
  vigente— así que la app avisa antes de publicarla en vez de dejarla arriba y
  que no se vea.
- **El precio no es exclusivo de las entradas.** Al principio el formulario sólo
  lo mandaba con tipo «entrada» y una fiesta con entradas a la venta se publicaba
  sin precio. Ahora se manda siempre que esté escrito, y con eso la publicación
  sale también en la solapa Entradas.
