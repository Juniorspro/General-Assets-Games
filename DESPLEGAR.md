# Desplegar — cómo publicar cambios

Guía para una sesión nueva. Todo lo de acá está probado en este repo.

> ## ⚠️ Por qué la clave NO está en este archivo
>
> **Este repositorio es PÚBLICO**
> (github.com/Juniorspro/General-Assets-Games).
>
> Un token de Cloudflare escrito acá se publica en internet apenas se hace
> `git push`. Hay bots que escanean GitHub buscando exactamente eso y lo
> encuentran en minutos — no es un riesgo teórico, es la forma más común de
> perder una cuenta.
>
> Y ese token no sólo despliega: **lee y borra las dos bases de datos**. Ahí
> viven las cuentas de la gente, el muro, los pagos y las llaves de acceso.
>
> Por eso el token se pega a mano al empezar cada sesión, o se saca del medio
> del todo conectando Pages a GitHub (§3, es la mejor opción).

---

## 1. Lo que hay que pegar al empezar la sesión

Una línea, la primera de la sesión:

```bash
export CLOUDFLARE_API_TOKEN=pega-acá-tu-token
```

Vale para toda la sesión. **Nunca** lo escribas en un archivo del repo.

Si te lo olvidás, los comandos fallan con *"Authentication error"* o piden
iniciar sesión en el navegador (que acá no se puede).

### Un token angosto, no el de todo

En el panel de Cloudflare → **My Profile → API Tokens → Create Token →
Custom token**, dale sólo estos permisos:

| permiso | para qué |
|---|---|
| Account · **Cloudflare Pages** · Edit | desplegar los sitios |
| Account · **D1** · Edit | aplicar esquemas y mirar datos |
| Account · **Workers AI** · Read | la fábrica de fondos |

Y limitalo a **una sola cuenta**. Si un token así se filtra, el daño queda
acotado a esto; el token "de todo" deja tocar dominios, DNS y correo.

### Si se filtró

No hay que pensarlo: **borralo y creá uno nuevo**, en el mismo lugar del panel.
Un token borrado no sirve más ni para el que lo robó. Cambiarle la contraseña a
la cuenta **no** lo desactiva.

---

## 2. Desplegar, sitio por sitio

### Frutiger Aero

```bash
cd frutiger-aero
python3 sellar.py                              # sólo si tocaste css o js
npx wrangler pages deploy --branch main
```

⚠️ **Sin `--branch main` va a una vista previa**, que además no tiene los
secretos cargados y contesta `{"error":"sin configurar"}` en todo. Si ves eso,
es esto y nada más.

### IBLO Eventos

```bash
./desplegar-iblo.sh      # arma, despliega y verifica, en un comando
```

⚠️ Si la salida no dice **"Compiled Worker successfully"**, las funciones no
compilaron y toda la API va a dar 404 — incluidas las de cobro. El script lo
comprueba solo.

### Comprobar que salió bien

El navegador de esta máquina **no llega a internet**, así que producción se
verifica con `curl`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://frutiger-aero-86q.pages.dev/
curl -s https://frutiger-aero-86q.pages.dev/ | grep -oE "escritorio\.[a-f0-9]+\.js"
```

El segundo tiene que devolver el mismo nombre que el archivo que hay en
`sitio/js/`. Si devuelve otro, estás mirando el caché del borde (tarda hasta
~23 h) o el despliegue no salió.

---

## 3. La mejor opción: que no haga falta token

Hoy los dos sitios se despliegan a mano. Se puede hacer que **Cloudflare
despliegue solo cada vez que hacés `git push`**, y entonces una sesión nueva no
necesita token para nada: commitea, pushea, y listo.

En el panel: **Workers & Pages → frutiger-aero → Settings → Builds &
deployments → Connect to Git**, y ahí:

| campo | valor |
|---|---|
| repositorio | `Juniorspro/General-Assets-Games` |
| rama de producción | `main` |
| directorio raíz | `frutiger-aero` |
| comando de build | *(vacío)* |
| carpeta de salida | `sitio` |

Lo hacés una vez y queda. Para IBLO es lo mismo pero con el comando de build
`./armar-sitio.sh` y la raíz del repo, porque ese sitio se arma antes de subir.

**Esto lo tenés que hacer vos**: conectar GitHub con Cloudflare pide entrar con
tu usuario, y yo no puedo (ni debo) entrar a tus cuentas.

---

## 4. Bases de datos

```bash
# produccion
npx wrangler d1 execute frutiger-social --remote --file=esquema12.sql
npx wrangler d1 execute frutiger-social --remote --command "SELECT COUNT(*) FROM usuarios"

# local (para probar sin tocar nada de verdad)
npx wrangler d1 execute frutiger-social --local --file=esquema12.sql
```

Las dos bases son `frutiger-social` e `iblo`.

**`--remote` toca los datos de la gente de verdad.** Antes de un `DELETE` o un
`UPDATE` sin `WHERE`, corré el `SELECT` equivalente y mirá cuántas filas son.

Los esquemas se aplican **en orden** (`esquema.sql` … `esquema12.sql`) y son
acumulativos: uno nuevo va en un archivo nuevo, nunca editando uno viejo, porque
los viejos ya corrieron en producción.

---

## 5. Los otros secretos

Ninguno vive en el repo. En producción son **secretos de Cloudflare Pages**: se
escriben, no se leen. Si hace falta uno, se vuelve a cargar; no se recupera.

| qué | dónde está en producción |
|---|---|
| `SECRETO` | firma las sesiones y los pases |
| `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` / `PAYPAL_MERCHANT_ID` | cobro por PayPal |
| `DISCORD_CLIENT_ID` / `DISCORD_SECRET` | entrar con Discord |
| `CLAVE_ADMIN` | panel del dueño |
| `CUOTA_EDITOR_USD` | la cuota mensual (si no está, vale 10) |
| `VIRUSTOTAL` | *todavía no está* — sin esto no hay revisión de apps |

Cargar uno:

```bash
npx wrangler pages secret put NOMBRE --project-name frutiger-aero
```

Para desarrollo local van en `frutiger-aero/.dev.vars`, que **está
gitignoreado**. Comprobalo antes de escribir ahí:

```bash
git check-ignore -v frutiger-aero/.dev.vars    # tiene que decir que lo ignora
```

---

## 6. Antes de cada `git push`

Este repo es público. Un minuto ahora vale más que rotar todo después:

```bash
git diff --cached --name-only                  # ¿qué estoy subiendo?
git grep -nIE "cfat_[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN .*PRIVATE KEY"
```

El segundo tiene que devolver **nada**.

Y si alguna vez subís un secreto: borralo del archivo **no alcanza**. Queda en
la historia de git y se puede leer igual. Hay que **rotar la credencial** — o
sea borrarla y crear una nueva. Es lo único que la desactiva de verdad.

> **Revisado el 17/09/2026:** se buscaron tokens de Cloudflare, claves de API y
> claves privadas en **toda la historia** del repositorio. No apareció ninguno.
> Los únicos resultados fueron identificadores de tareas de Rezona
> (`gtask-…`), que no son credenciales y no abren nada.
