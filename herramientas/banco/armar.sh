#!/usr/bin/env bash
# armar.sh — arma el banco de pruebas en /tmp/ui. Idempotente.
#
# /tmp/ui es carpeta de trabajo, no del repo: se pierde con el contenedor y se
# rearma con esto. La fuente vive en herramientas/banco/.
set -eu
UI="${UI:-/tmp/ui}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$UI/node_modules" "$UI/out"

# three para escenas de prueba, acorn para chequear la sintaxis del modulo
# antes de molestarse en abrir el navegador.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
[ -f "$UI/package.json" ] || echo '{"name":"banco","private":true}' > "$UI/package.json"
for m in three acorn; do
    [ -d "$UI/node_modules/$m" ] || (cd "$UI" && npm install --silent --no-audit --no-fund "$m")
done

# El enlace a playwright va DESPUES del npm install: npm poda lo que no figura
# en package.json, y se lleva puesto el enlace si se hace antes.
GLOBAL="$(npm root -g 2>/dev/null || echo /opt/node22/lib/node_modules)"
for m in playwright playwright-core; do
    if [ -d "$GLOBAL/$m" ] && [ ! -e "$UI/node_modules/$m" ]; then
        ln -s "$GLOBAL/$m" "$UI/node_modules/$m"
    fi
done

cp "$AQUI/banco.js" "$AQUI/run2.sh" "$UI/"

node -e "require('$UI/node_modules/playwright');require('$UI/node_modules/acorn')" \
    && echo "banco en $UI  (playwright · acorn · three)"
