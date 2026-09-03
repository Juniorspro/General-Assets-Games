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
| `POST /api/asistente` | Le pasás una frase suelta ("el 25 de octubre hacemos halloween en el club juventud, entradas a 10 mil") y/o el flyer en `imagen`, y devuelve la propuesta ya cargada: tipo, título, fecha, lugar, hora, precio, color y detalle. Con `publicar: true` la sube él mismo y devuelve la fila creada. Requiere sesión. |

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
