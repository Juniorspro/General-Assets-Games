# Bot de WhatsApp — comandos de prueba

Un motor de comandos y **dos proveedores intercambiables**. El motor
(`src/comandos.js`) no sabe nada de WhatsApp: recibe texto y devuelve texto.
Por eso puedes probarlo en la terminal sin teléfono, y cambiar de proveedor
sin tocar un solo comando.

```
npm install
npm run probar        # la batería completa, sin WhatsApp
npm run probar -- /dado 20
```

## ¿Se puede gratis? Sí, con matices

| Camino | Coste | Tu número | Trámites | El pero |
|---|---|---|---|---|
| **`web`** · WhatsApp Web | Gratis del todo | **Tu número personal** | Ninguno, escaneas un QR | **No es oficial.** WhatsApp puede banear el número. Necesita el proceso encendido |
| **`cloud`** · Cloud API de Meta | Responder al usuario dentro de su ventana de 24 h no se cobra; las plantillas que inicias tú sí | **Número aparte** — el que migres deja de funcionar en la app normal de WhatsApp | Cuenta de Meta Business, app, webhook con HTTPS público | Para desarrollo Meta te presta un número de prueba gratis, limitado a unos pocos destinatarios |

Para **probar hoy**: `web`.
Para el **negocio**: `cloud`, y empieza por el número de prueba que regala Meta.

> Las tarifas de Meta han cambiado varias veces. Confirma la vigente en la
> documentación de precios de WhatsApp Business antes de calcular costes.

## Comandos

| Comando | Qué hace |
|---|---|
| `/bot` | Menú con todos los comandos |
| `/ping` | Responde `pong` y mide cuánto tardó |
| `/hora` | Fecha y hora del servidor, local y UTC |
| `/eco <texto>` | Repite lo que le escribas |
| `/dado [caras]` | Tira un dado, 6 caras por defecto |
| `/id` | Tu nombre, número y id de chat — para depurar |
| `/estado` | Tiempo encendido, mensajes atendidos, memoria |
| `/ia <pregunta>` | Le pregunta a Claude. Solo si pones `ANTHROPIC_API_KEY` |

Los mensajes que no empiezan por `/` se ignoran: el bot no interrumpe
conversaciones normales.

## Arrancar con tu número (`web`)

```bash
cp .env.example .env      # PROVEEDOR=web
npm install
npm run web
```

Sale un QR en la terminal → WhatsApp del teléfono → **Dispositivos vinculados**
→ escanear. La sesión queda guardada en `.wwebjs_auth/`, así que la próxima vez
arranca sin QR. Ahora pídele a alguien que te escriba `/bot`.

Descarga un Chromium la primera vez (~150 MB) porque controla WhatsApp Web por
debajo. En un servidor sin escritorio hacen falta las librerías de Chrome.

## Arrancar con la API oficial (`cloud`)

1. developers.facebook.com → crea una app de tipo **Business** → añade el
   producto **WhatsApp**.
2. Copia a `.env`: el **token** temporal y el **Phone number ID**. Inventa
   cualquier cadena para `WHATSAPP_VERIFY_TOKEN`.
3. `npm run cloud` y expón el puerto:
   ```bash
   npx localtunnel --port 3000
   ```
4. En el panel → WhatsApp → Configuración → Webhook: pega
   `https://TU-URL/webhook`, el mismo verify token, y **suscríbete al campo
   `messages`** (sin esto no llega nada y es el error más común).
5. Añade tu número a la lista de destinatarios de prueba y mándale `/bot`.

El token que da el panel dura unas horas; para algo permanente hace falta un
token de sistema. `GRAPH_VERSION` en `.env` fija la versión de Graph API —
comprueba cuál es la vigente.

## Añadir un comando

Un objeto más en `src/comandos.js`. Aparece solo en el menú de `/bot`:

```js
saludo: {
  descripcion: "Saluda por tu nombre",
  uso: "/saludo",
  ejecutar(args, ctx) {
    return `Hola ${ctx.nombre || "desconocido"} 👋`;
  },
},
```

`ejecutar` puede ser `async` y recibe `ctx` con `de`, `nombre`, `chatId` y
`proveedor`. Si lanza una excepción, el bot responde con el error en vez de
caerse.
