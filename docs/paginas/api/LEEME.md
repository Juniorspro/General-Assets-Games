# La API de IBLO

Son *Pages Functions* de Cloudflare. En el despliegue viven en `functions/api/`
del proyecto `iblo-eventos`; acá se guardan para tenerlas versionadas.

| Ruta | Qué hace |
|---|---|
| `GET /api/estado` | Dice si el servidor y la IA están vivos. Sin sesión. |
| `POST /api/login` | Usuario y contraseña; devuelve la sesión. |
| `GET /api/entradas` | Las entradas publicadas. Es lo que lee la web. Sin sesión. |
| `POST /api/entradas` | Publica una entrada. Requiere sesión. |
| `DELETE /api/entradas?id=` | Da de baja una publicación. Requiere sesión. |
| `GET /api/mias` | Todas las publicaciones, incluso las dadas de baja. Requiere sesión. |
| `POST /api/mejorar` | Reescribe la descripción con Workers AI. Sin sesión. |
| `GET /api/destacado` | El aviso de la portada, con su color. Sin sesión. |
| `POST /api/destacado` | Guarda el aviso desde la app. Requiere sesión. |
| `POST /api/clave` | Cambia la contraseña sabiendo la actual. Requiere sesión. |
| `GET /api/instagram` | Archivo que se llena solo desde la cuenta de IG. Sin sesión. |

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
