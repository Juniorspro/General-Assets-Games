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
| `POST /api/mejorar` | Reescribe la descripción. Pasa por la cadena de proveedores como todo lo demás; si se queda sin cupo, la app lo reintenta contra Pollinations desde el teléfono. Sin sesión. |
| `GET /api/destacado` | El aviso de la portada, con su color. Sin sesión. |
| `POST /api/destacado` | Guarda el aviso desde la app. Requiere sesión. |
| `POST /api/clave` | Cambia la contraseña sabiendo la actual. Requiere sesión. |
| `GET /api/instagram` | Archivo que se llena solo desde la cuenta de IG. Sin sesión. |
| `POST /api/sugerir` | El botón «Nuevo» de la app: trae lo último de Instagram y devuelve los posteos que anuncian algo ya armados como publicación, más qué descartó y por qué. **No sube nada**: el dueño mira y toca publicar. Requiere sesión. |
| `GET /api/archivo` | Las secciones del archivo. Con `?seccion=` trae la grilla de esa sección; con `?id=` devuelve el archivo original (foto o video). Sin sesión. |
| `POST /api/archivo` | Sube una foto o un video a una sección, o crea una sección con `nuevaSeccion`. Requiere sesión. |
| `PUT /api/archivo` | Le cambia el texto o lo pasa a otra sección, sin volver a subir el archivo. Requiere sesión. |
| `DELETE /api/archivo?id=` | Lo saca, y borra el archivo del depósito. Con `?seccion=` borra la sección, sólo si está vacía. Requiere sesión. |
| `POST /api/prop` | Genera el adorno de una publicación: el objeto de la temática sobre pantalla verde. El recorte lo hace la app. Si ese objeto ya está en la biblioteca lo devuelve ya recortado y no gasta IA; con `rehacer: true` genera uno nuevo igual. Requiere sesión. |
| `PUT /api/prop` | La app deja acá el recorte terminado, para que el próximo que pida lo mismo salga gratis. Requiere sesión. |
| `POST /api/asistente` | Le pasás una frase suelta ("el 25 de octubre hacemos halloween en el club juventud, entradas a 10 mil") y/o el flyer en `imagen`, y devuelve la propuesta ya cargada: tipo, título, fecha, lugar, hora, precio, color y detalle. Con `publicar: true` la sube él mismo, pero la app no lo usa así: muestra la propuesta y publica cuando el dueño toca. Requiere sesión. |

## El cartel de la portada rota solo

`/api/destacado` devuelve **la fecha más cercana que todavía no pasó**, así que
cuando una fiesta se vence la siguiente ocupa su lugar sola, sin tocar nada.

La parte que faltaba estaba en la página, no en la API: el evento venía escrito a
mano en el HTML y el guión sólo lo reemplazaba si la API traía algo (`if(!d)
return`). Es decir que cuando no quedara ninguna fecha por venir, la web iba a
seguir mostrando la última para siempre. Ahora la sección **arranca oculta** y la
muestra la API; si no hay nada por venir no se muestra nada, y los links que
apuntan a `#fecha` se esconden con ella. Igual en escritorio y en móvil.

Probado moviendo las fechas: con dos publicadas manda la más cercana, al vencerse
esa pasa la otra sola, y al vencerse las dos la sección desaparece de las dos
versiones del sitio.

## De dónde sale la IA

`_modelos.js` es una cadena, no un proveedor solo: Cloudflare (sin clave, la de
casa) y detrás OpenRouter, Groq, Gemini, Cerebras y GitHub Models. Cada uno entra
sólo si su clave está guardada como secreto del Worker:

    cd sitio && wrangler pages secret put GROQ_API_KEY --project-name iblo-eventos

Ojo: **el secreto recién toma efecto en el despliegue siguiente.** Si no, sigue
sin verlo.

Se salta al próximo de la fila cuando el error es de **cupo, saturación o clave
mala** —una clave vencida no tiene que dejar sin IA a los que sí andan; eso se
descubrió probando con una clave falsa, que cortaba la cadena—. Con cualquier
otro error se corta, porque un pedido mal armado va a fallar igual con todos. Si
varios fallan, se reporta el de cupo, que es el que le dice algo al dueño.

Los que no saben mirar imágenes (Cerebras) se saltean solos cuando lo que se pide
es leer un flyer.

### Pollinations: gratis y sin cuenta, pero desde la app

Es la única keyless que de verdad contesta, y estaba mal descartada. El truco es
el parámetro **`referrer`**: sin él devuelve `402 Payment Required` aunque uno no
mande ninguna clave. Con él, `GET https://text.pollinations.ai/<pedido>?referrer=…`
contesta 200. Sólo por GET y sólo texto: el POST con formato de OpenAI y todo
modelo que no sea `openai-fast` piden clave.

**Desde el Worker no sirve.** Todos los Workers de Cloudflare salen por unas pocas
IP compartidas y Pollinations limita el escalón anónimo a un pedido encolado por
IP; desde el servidor la respuesta es siempre la misma —«Queue full for IP:
2a06:98c0:3600::103»—, seis de seis veces que se probó. Por eso **no está en la
cadena de `_modelos.js`** y el respaldo vive en la app: el teléfono del dueño
tiene su propia conexión y no la comparte con nadie.

Cómo quedó: si `/api/mejorar` falla **por cupo**, la app pide el texto a
Pollinations desde el teléfono y avisa que lo escribió el respaldo, para que el
dueño lo lea antes de publicar. Si el respaldo también falla, se muestra el
mensaje del servidor, no uno mío. Si el error del servidor no es de cupo, ni se
intenta: un pedido mal armado va a fallar igual.

### Por qué no hay ninguno sin clave

Se buscó a fondo, probando generación real desde la IP del Worker, no listados:
Pollinations (402; el único URL que contesta es una respuesta cacheada), Hack
Club, HuggingFace, api.airforce, DeepInfra, ArliAI, glhf, Cohere, Mistral,
Together, NVIDIA NIM, Ollama cloud (todos 401) y DuckDuckGo (418, desafío
anti-bot). Puter.js sí existe y es legítimo, pero devuelve `auth_canceled`: le
pide cuenta al usuario final. Lo único keyless que anda es la generación de
imágenes de Pollinations, y su fondo sale con degradado, así que el recorte no lo
puede sacar.

### Cuánto se gasta de verdad

Medido con la API de analytics de Cloudflare, por llamada:

| | neuronas |
|---|---|
| texto | ~20 |
| leer un flyer | ~19 |
| **generar un adorno (flux)** | **~250** |

Publicar algo con la IA son tres llamadas: unas 60 neuronas. Con 10.000 por día
entran ~165 publicaciones o ~40 adornos. **El dueño no va a llegar al límite en
uso normal**; el día que se agotó fue por 425 llamadas de prueba en 24 horas.

### El cupo es uno solo, y por eso hay tope de adornos

No hay un cupo para texto y otro para imágenes: son las mismas 10.000 neuronas.
Como un adorno vale doce veces lo que vale leer un flyer, una tarde de probar
adornos deja a la app sin poder leer ni escribir por el resto del día —que es
justo lo que se usa todos los días—.

Así que `/api/prop` no genera más de **12 adornos nuevos por día** (los que salen
de la biblioteca no cuentan, porque no gastan). Son 3.000 neuronas; quedan 7.000,
unas 350 llamadas de texto, reservadas para lo que importa. La cuenta se lleva en
`cache_ia` con la huella `adornos:AAAA-MM-DD`, y al llegar al tope se contesta 429
explicando que mañana se repone y que los guardados se siguen pudiendo usar.

## El cupo de la IA

El plan gratis de Workers AI trae **10.000 «neuronas» por día** y las lecturas de
imagen las gastan rápido. Cuando se acaba, la IA devuelve un `4006` que no le
dice nada a nadie; `traducirFalla` en `_ia.js` lo convierte en «por hoy se acabó
el cupo, se repone mañana, mientras tanto cargala a mano», que es lo que el dueño
necesita saber. Lo mismo con los errores de saturación.

Por eso también importan las podas de llamadas: `/api/sugerir` no redacta el
texto del aviso mientras propone (lo hace al publicar, una llamada menos por
candidato) y saltea las historias que son la misma imagen comparando una huella
antes de gastar la lectura.

## La app en el teléfono

El panel es una **PWA instalable**: `app.webmanifest` + `sw.js` + los tres iconos
(`icono-192`, `icono-512` y el `icono-mask`, que Android recorta en círculo y por
eso lleva más margen). Con eso Chrome ofrece «Instalar aplicación» y queda en la
pantalla de inicio con su icono, a pantalla completa y sin barra de navegador.

El service worker guarda **sólo el armazón** —el HTML, que ya trae el CSS y el JS
adentro— y **nunca `/api/`**: una respuesta vieja de la API sería peor que un
error, porque mostraría publicaciones que ya no están. Red primero, caché de
respaldo: sin señal el dueño abre la app y la ve, aunque no pueda publicar.

**Ojo con la URL en el manifiesto**: Pages le saca el `.html` con un 308, así
que la página real es `/iblo-app` y no `/iblo-app.html`. El manifiesto arrancó
apuntando al `.html` y con eso la propia app quedaba fuera de su `scope`, que es
lo que decide si abre a pantalla completa o como una pestaña más. `start_url`,
`scope` e `id` van sin extensión.

El HTML se sirve con `cache-control: public, max-age=0, must-revalidate` y el
service worker es red-primero, así que **un despliegue nuevo se ve en la app la
próxima vez que se abre**, sin reinstalar el APK. Probado: con el service worker
ya instalado, se desplegó un cambio y la segunda apertura lo mostró.

Para el APK (una TWA) hace falta además `/.well-known/assetlinks.json` con la
huella SHA-256 de la clave con que se firma. Sin eso el APK abre igual pero con
la barra del navegador arriba. La clave vive fuera del repo: si se pierde, no se
puede publicar una actualización de esa misma app, hay que empezar con otra.

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

## Varias imágenes de una

La solapa IA acepta hasta seis imágenes juntas y arma una publicación por cada
una: el dueño saca captura de tres historias y las manda en tanda.

Se procesan **de a una, no en paralelo**. Con dos llamadas a la vez la IA se
degradaba y devolvía cualquier cosa para la segunda; lo peor es *qué* devolvía:
copiaba el ejemplo que el prompt traía como few-shot, así que salían dos
publicaciones idénticas de una fiesta que no existía. Por eso el few-shot ya no
está —las descripciones del esquema alcanzan— y además quedó `saleDeLaFuente`,
que descarta un título cuyas palabras no aparezcan en lo que le dimos.

Ojo con esa guardia: **a la fecha no se le aplica**. «6 de diciembre» sale como
«06.12.26» y nunca coincide literal con la fuente, así que borraba fechas buenas.

Las miniaturas se guardan en su lugar, no con `push`: comprimir es asincrónico y
terminaban en orden distinto del que las eligió el dueño.

## Historias

Sí, se leen. La ruta del feed de Instagram anda sin sesión, pero las historias
no: `highlights_tray`, `reels_tray` y `reels_media` devuelven vacío sin cuenta.
Así que salen de un visor público, que es lo que usa cualquiera para verlas sin
loguearse.

El detalle que costó: **casi todos esos visores están detrás de un captcha de
Cloudflare** y un Worker es justo el bot que bloquean. Probados y descartados:
anonyig (`CAPTCHA_REQUIRED` y encima pide firma), dumpor («Verify you are
human»), imginn, storiesig, iganony, inflact, insta-story. El que contesta con un
GET pelado es `insta-story-viewer.io`:

    content.php?url=<cuenta>                    → perfil
    content.php?url=<cuenta>&method=allstories  → historias

Devuelve `{"status":"ok","html":"…"}`. De cada tarjeta sacamos el **id del medio
en Instagram**, que viene en el link de descarga (`…_iblo_eventos_39781187875…`);
ese es el ancla para no proponer dos veces la misma. La foto fija sale del
`poster` del video y se baja por el proxy del propio visor (`media.php`), que es
el que lleva la firma del CDN de Instagram.

`_historias.js` está armado como **cadena de espejos**, no atado a un sitio: el
día que ése se caiga o se ponga captcha se prueba el siguiente, y si no anda
ninguno la app lo dice en vez de quedarse muda. Las publicaciones del feed no
dependen de esto.

## El botón «Nuevo»## El botón «Nuevo»

`POST /api/sugerir` mira las **historias** y los **posteos** de `@iblo_eventos` y
devuelve los que sirven, armados como publicación. No sube nada.
El orden en que filtra importa, porque cada paso ahorra el siguiente:

1. **Los que ya se usaron quedan afuera.** Cuando publica algo desde un posteo, le
   guarda el código del posteo en `origen`. Así el botón se puede tocar todas las
   veces que se quiera sin repetir nada.
2. **Prefiltro sin IA** (`pareceAviso` en `sugerir.js`): si el pie de foto no
   nombra ni una fecha ni un precio, se descarta ahí mismo. **A las historias no
   se les aplica**: no tienen texto, la imagen es todo lo que hay. Eso saca las fotos de
   la fiesta del finde, los agradecimientos y los memes sin gastar una llamada, y
   —más importante— **evita que el modelo invente una fecha**, que es lo que hacía
   cuando se le daba un posteo sin fecha.
3. **Cada posteo pasa por el mismo motor que el asistente** (`_ia.js`): el pie de
   foto hace de «lo que dijo el dueño» y la imagen de flyer. Todos en paralelo.
4. **Se descarta lo que ya pasó** y lo que quedó sin fecha ni precio.
5. **Junta las historias de la misma fiesta.** Suelen ser varias seguidas: una
   con el flyer y otra con el precio. Si dos candidatos de la misma tanda tienen
   el mismo nombre o el mismo día, se ofrecen como uno solo, completándose entre
   ellos.
6. **No duplica lo que ya está arriba**: si hay una publicación con la misma fecha
   (mismo día) o el mismo nombre, es la misma fiesta. No la vuelve a publicar; le
   anota el `origen` a la que ya estaba, para no volver a mirar ese posteo. Pasa
   seguido, porque el dueño carga la fiesta a mano antes de postearla en IG.
   Pero si trae algo que a la publicada le falta —el precio, casi siempre, porque
   en la historia lo ponen y en el posteo no— se ofrece como **«agregarle el
   precio»**, que va por `POST /api/publicaciones` con `actualizar: <id>`.
   Esa actualización **sólo completa lo vacío, nunca pisa** lo que el dueño
   cargó: la primera versión le reemplazó un lugar bien escrito a mano por la
   lectura del flyer, que venía peor.

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

### La biblioteca: por qué el adorno se genera una sola vez

Medido, un adorno son **~250 neuronas**: doce veces lo que cuesta leer un flyer, y
con 10.000 por día son apenas 40. Es lo único caro que hay acá; todo lo demás
junto no llega. Así que en vez de buscar más proveedores, se dejó de gastar dos
veces en lo mismo.

Cuando la app termina de recortar manda el recorte con `PUT /api/prop` y queda en
la tabla `adornos`, con el nombre en inglés del objeto como clave. El `POST`
consulta esa tabla **antes** de llamar al generador: si el sombrero de vaquero ya
está, vuelve en medio segundo, sin IA, y suma uno a `usos`. Como el objeto sale de
la tabla de estéticas, «noche wéstern» y «fiesta vaquera» caen en la misma clave y
comparten el mismo dibujo. El botón **Otro** manda `rehacer` y sí genera uno
nuevo, que reemplaza al guardado: si al dueño no le gustó el que había, no tiene
sentido conservarlo.

La otra llamada, la que elige qué objeto pedir cuando no pega ninguna estética, se
guarda en `cache_ia` con la pista como huella. La segunda vez que se escriba esa
misma fiesta tampoco cuesta.

Con eso el uso normal —el dueño publica sus fiestas, que se repiten temporada a
temporada— tiende a cero: la primera Halloween del año gasta, las demás no.

Probado contra la base de verdad: se guarda un recorte, el siguiente pedido de
«noche western» y el de «fiesta vaquera» vuelven con `deLaBase: true` y `usos`
en 2, `rehacer: true` saltea la biblioteca y va al generador, y el `PUT` sin
sesión da 401. Del lado de la app, en teléfono y en computadora, el adorno
guardado se pinta sin pasar por el canvas y el recién generado se recorta y se
manda al `PUT` sin trabar la pantalla.

En la tarjeta el adorno va **adentro** —la tarjeta recorta lo que se sale— y se
le hace lugar: se apoya sobre la foto si hay foto, y si no hay se le reserva una
banda arriba con `padding`. Sin eso le tapaba el título.

## Las historias: dos bichos que se comían fiestas buenas

El dueño avisó que tenía historias y la app le contestaba «no hay nada nuevo».
Las historias se leían bien —el visor devolvía las cinco y el parser las sacaba
todas—; el problema estaba después.

### La huella de imagen tachaba historias para siempre

`/api/sugerir` le saca una huella a cada imagen para no gastar una lectura de IA
en el mismo flyer subido tres veces seguidas. Esa huella se guardaba en
`revisados`, la misma tabla que lo descartado. Y `revisados` se carga entera al
empezar cada pedido.

Entonces: vuelta 1, la historia se mira, se le guarda la huella y se ofrece como
candidata. La app encadena la vuelta 2 sola —eso es lo que hace desde que dejó de
pedirle al dueño que tocara «Buscar» de nuevo—, la historia todavía está sin
publicar así que vuelve a entrar en la cola, se encuentra **su propia huella** ya
guardada y se tacha como «imagen repetida». Para siempre: eso también se anota.
Cada historia tenía una sola oportunidad, y si el dueño no publicaba en esos
segundos, no la veía nunca más. Había 17 historias tachadas así.

Dos arreglos:

- La huella guarda **de quién es** (el id de la historia va en `motivo`). Sólo
  descarta cuando el dueño de la huella es OTRA historia, que es de lo que se
  trataba: el mismo flyer subido dos veces.
- La app manda en cada vuelta los códigos que ya tiene en pantalla (`yaVistos`).
  Son candidatos pendientes, no cosas descartadas, así que van en el pedido y no
  se guardan en ninguna tabla.

Se limpiaron las 36 filas que había dejado el bicho (17 tachadas + 19 huellas con
el formato viejo, que sin dueño habrían tachado todo lo que tocaran).

### El año que el modelo se inventaba

Un posteo de mayo que dice «06/06» habla del 6 de junio de **ese** año. El sistema
le decía al modelo «hoy es tal fecha, si no dicen año usá el próximo que no pasó»,
así que en septiembre lo leía como junio del año siguiente: una fiesta de hace
tres meses volvía como próxima, y encima el filtro de fechas viejas no la
frenaba, porque la fecha había quedado en el futuro. Así reaparecía el FIESTÓN
wéstern del 06.06.26 convertido en 06.06.27.

Ahora el ancla es **cuándo se publicó el aviso**, no cuándo lo estamos mirando:
`proponer` toma `opc.desde` y se lo pasa a `leerFecha` y al sistema.

Y como el modelo se manda el año de más igual —«19/09» en una historia de
septiembre salió 19.09.27 aunque el sistema le dijera la fecha—, hay una
corrección que no le pide nada: si la fecha cae a más de once meses del aviso, se
rehace con el día y el mes solos, que es lo único que dijo la fuente. Once meses
porque IBLO no anuncia con un año de anticipación. Al dueño no lo afecta: lo que
escribe a mano no pasa por ahí.

### Una fiesta, una tarjeta

El servidor junta las historias de la misma fiesta —el flyer en una, el precio en
la otra— pero sólo las que le tocan en la **misma vuelta**, porque cada vuelta es
un pedido aparte y no ve las anteriores. Tres historias de la misma noche
repartidas en dos vueltas salían como dos tarjetas y el dueño terminaba subiendo
la misma fiesta dos veces. Ahora la app junta con la misma regla —mismo nombre, o
fechas a menos de doce horas—, completa lo que le falta a la que ya está sin
pisar lo que tiene, y la tarjeta avisa de cuántos avisos salió.

Y cuando la fiesta **ya está en la web**, la única acción es completarla: se sacó
el botón «Subirla aparte» que había al lado, que invitaba justo a lo que no hay
que hacer. Si de verdad son dos fiestas distintas la misma noche, queda «Cambiar
algo», que la lleva al formulario y de ahí sale como nueva.

### Y que la app diga qué miró

«No hay nada nuevo» a secas no deja distinguir «te miré las cinco historias y son
todas de la fiesta que ya subiste» de «no pude ver ni una». Ahora dice qué miró y
por qué no salió nada, y si el visor falla lo dice con esas palabras.

Probado contra Instagram de verdad, encadenando vueltas como la app: las cinco
historias se miran todas, ninguna se tacha por su propia huella, cuatro salen
reconocidas como la fiesta que ya está publicada y una por fecha vencida; el
FIESTÓN ya no aparece como 2027. En el navegador, los cuatro mensajes —nada
nuevo, visor caído, fiesta encontrada y cuenta vacía— y el `yaVistos` viajando
entre vueltas.

## Que Google encuentre la página

Lo que se dejó listo, todo en el sitio, sin depender de nadie:

- **`robots.txt` y `sitemap.xml`.** El sitemap lleva sólo las seis direcciones
  canónicas; las de `/m/` no van, porque apuntan a éstas y meterlas sería
  pedirle a Google que elija entre duplicados.
- **Canónicas y alternas.** La versión de escritorio es la canónica y declara
  cuál es su gemela de celular; la de celular apunta a la de escritorio. Sin eso
  son doce páginas con el mismo título compitiendo entre ellas.
- **`noindex` donde corresponde**, por `X-Robots-Tag` en `_headers`: el panel del
  dueño —es una pantalla de inicio de sesión— y las páginas de otros proyectos
  que viven en el mismo repo y salen publicadas en el mismo dominio.
  Ojo: el panel **no** se bloquea además en `robots.txt`. Bloquear y marcar
  `noindex` a la vez se anula solo: para leer la marca, Google primero tiene que
  poder entrar, y si no puede, la dirección aparece igual, pelada.
- **Ficha del negocio** (`EntertainmentBusiness`) en la portada, con teléfono,
  localidad e Instagram.
- **Ficha de eventos** en publicaciones: se arma con lo que ya trajo la API, así
  que no cuesta un pedido de más, y **sólo con las fechas que no pasaron**.
  Anunciar una fiesta vencida en el buscador es peor que no anunciar nada.

Probado en el navegador con la respuesta real de la API: la fiesta que viene sale
como `Event` con lugar y precio en pesos, la que ya pasó no aparece, y no hay
errores. En vivo: `robots.txt` y `sitemap.xml` con su tipo, las canónicas de las
cuatro direcciones y el `noindex` sólo donde va.

**Las páginas no tenían `<head>` escrito.** Arrancaban directo con las etiquetas y
el `<body>` aparecía recién en el medio del archivo. El navegador es tolerante y
arma la cabecera solo —por eso al probarlo con Playwright daba bien, porque eso
mira lo que el navegador *interpretó*—, pero Search Console lee el archivo crudo y
rechazó la verificación con «la etiqueta meta no está en la sección `<head>`».

Lección para la próxima: para algo que lee un archivo y no un navegador, hay que
mirar el archivo. Las doce páginas quedaron con `<!DOCTYPE html>`, `<html
lang="es">` —que además le dice a Google que el sitio está en castellano—, la
cabecera abierta y cerrada, y el cuerpo después. Comprobado con un parser sobre
las trece páginas y en el navegador que las doce siguen andando igual, sin
errores. La etiqueta de verificación va en la portada, en las dos versiones.

**Lo único que no se puede hacer desde acá** es dar de alta la propiedad en Search
Console: pide la cuenta de Google del dueño.

## El lugar abre el mapa

En las publicaciones y en el cartel de la portada, el lugar es un link a Google
Maps: `https://www.google.com/maps/search/?api=1&query=<lugar>`. Es la dirección
universal de Maps —en la computadora abre el mapa en el navegador y en el celular
abre la app si está instalada—, no pide ninguna clave ni ninguna API.

Al lugar se le agrega «Chaco, Argentina» si no lo nombra ya, porque «Club
Juventud» solo puede caer en cualquier parte del mundo. Lo que **no** se hace es
forzarle «Margarita Belén»: si la fiesta es en Resistencia, mandaríamos a la
gente al pueblo equivocado, y eso es peor que no poner el link. Cuando no hay
lugar cargado queda el texto suelto, sin link a ninguna parte.

No se usó Google Earth: no tiene una dirección de búsqueda por texto que se pueda
armar así, y además no da cómo llegar, que es para lo que uno toca un lugar.

Probado en el navegador en las cuatro pantallas —publicaciones y portada, en
computadora y en celular—: el lugar sale como link con la consulta bien armada, la
hora sigue sin ser link, la publicación sin lugar no muestra ninguno, y el link
abre en otra pestaña con `rel="noopener"`.

Detalle de la prueba, que casi me hizo buscar un bicho que no existía: la portada
trae los chips escritos a mano en el HTML como muestra y los reemplaza la API.
La primera versión del simulacro devolvía el destacado pelado en vez de
`{destacado, colores}`, así que el guión se escondía solo y quedaban los chips de
muestra. El error era de la prueba, no de la página.

## El archivo de eventos

El pedido del dueño de la fiesta fue textual: «que cada cosa vaya al lugar que
corresponda, no subir y que quede ahí random. Si subo cosas de primavera que vaya
al sector de Primavera». Así que la sección **no es un campo más del formulario**:
va primera, es obligatoria, y el servidor rechaza lo que venga con una sección que
no existe. El botón de subir dice a dónde va —«Subir a Recepciones»— para que no
haya forma de equivocarse sin darse cuenta.

Las secciones las puede crear el dueño desde la app. Con una lista fija, la
primera fiesta con una temática nueva volvía al montón único.

### Dónde vive cada cosa

- El archivo pesado —la foto original, el video— va a **KV** (`MEDIOS`), no a D1.
  Un video de celular son decenas de megas y en una fila de base no entra; y
  aunque entrara, D1 corta el tamaño de la respuesta de una consulta, así que
  pedir una grilla de treinta con los originales adentro fallaría.
- En **D1** queda la ficha y la **miniatura**, que es lo único que necesita la
  grilla. La miniatura la hace el teléfono antes de subir: unos 15 KB contra los
  300 del original. La del video sale del primer cuadro, con un `<video>`
  escondido y un canvas; sin eso, en la grilla sería un rectángulo negro.
- Al tocar algo, el original se pide aparte, a `?id=`, y sale de KV con su tipo
  de verdad: la foto se ve, el video se reproduce.

Se sube de a uno, en fila. Todos juntos en paralelo le vuela la memoria al
teléfono con archivos de 20 MB y, si algo falla, no se sabe qué entró.

Tope por archivo: **24 MB** (KV no guarda valores de más de 25). El plan gratis de
KV son 1 GB en total, así que entran miles de fotos y unas decenas de videos. Si
algún día hace falta más, es R2 —10 GB gratis y sin cargo por bajada—, pero hay
que habilitarlo desde el panel de Cloudflare, y hoy no lo está.

En la web, una sección **vacía no se muestra**: una sección con cero fotos es una
promesa incumplida. Si no hay nada en ninguna, la sección entera desaparece.

Probado de punta a punta contra el servidor de verdad, con el navegador: se
eligen dos fotos y un video, se preparan con su miniatura —la del video sacada
del primer cuadro—, se suben las tres, los campos quedan limpios y aparecen en la
sección. En la web, escritorio y celular: la grilla, el ▶ sobre el video, el
visor con título, descripción y de qué sección es, la foto y el video cargando de
verdad desde el depósito, y al cerrar el video se saca del DOM para que no siga
sonando. Sin errores.

## Cómo está atado

- Base **D1** llamada `iblo` (`27c22f67-3b11-4c92-bb75-37f30f63b84d`), atada como `DB`.
- **KV** `iblo_medios` (`d067d54f03574a73b90805e6b98a213c`), atado como `MEDIOS`: las
  fotos y los videos del archivo. Se ató por la API de Cloudflare, cuidando de no
  pisar lo que ya había en el proyecto.
  Tablas propias de esto: `adornos` (`concepto`, `imagen`, `usos`, `creado`) y
  `cache_ia` (`huella`, `salida`, `creado`).
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
- **El nombre de la fiesta no siempre viene en `titulo`.** Midiéndolo: de seis
  lecturas de la misma historia, tres traían lugar, hora y fecha perfectos y el
  nombre metido en `detalle`, con `titulo` vacío. Reintentar no alcanzaba (fallaba
  la mitad de las veces igual); `rescatarTitulo` lo busca donde el modelo lo pone
  —`detalle`, `subtitulo`, o el primer renglón del flyer que no sea fecha, hora
  ni precio.
- **La línea «Onda:» del prompt se filtraba al título.** Es andamiaje nuestro
  para elegir el color; iba pegada a la transcripción y una publicación quedó
  llamándose «Onda: azul oscuro a negro degradé». Ahora viaja aparte y rotulada.
- **Sólo se procesan cuatro por toque.** Cada una son unos doce segundos (visión,
  extracción y el texto del aviso), y en paralelo la IA se degrada. La respuesta
  dice cuántas quedaron sin mirar y la app lo muestra.
- **La foto de la historia no viaja de vuelta.** Se guarda en la tabla `ig` con
  el código `st:<id>`, igual que un posteo, así al publicar la app manda sólo el
  código y `POST /api/publicaciones` la busca ahí.
