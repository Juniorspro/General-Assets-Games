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
