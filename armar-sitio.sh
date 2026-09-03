#!/bin/sh
# Arma la carpeta que se sube a Cloudflare Pages, a partir de docs/paginas/.
#
# Existe porque estos tres pasos no son obvios y una vez ya se perdieron:
#
#   1. `docs/paginas/index.html` es el índice del REPO, no la portada del sitio.
#      Si se copia tal cual, iblo-eventos.pages.dev muestra «Páginas del repo».
#      La portada es `iblo.html`, que además detecta sola si el que entra está en
#      teléfono y lo manda a la versión de celular.
#   2. Las funciones de la API viven en `functions/api/`, no en `api/`.
#   3. `wrangler` sólo compila las funciones si se lo corre PARADO ADENTRO de la
#      carpeta. Si en la salida no dice «Compiled Worker successfully», las rutas
#      de la API van a contestar 405.
#
# Uso:  ./armar-sitio.sh  &&  cd sitio  &&  wrangler pages deploy . --project-name iblo-eventos --branch main
set -e
cd "$(dirname "$0")"

rm -rf sitio
mkdir -p sitio
cp -r docs/paginas/. sitio/

# la portada del sitio, no el índice del repo
cp docs/paginas/iblo.html sitio/index.html

# la API pasa a ser funciones de Pages
mkdir -p sitio/functions
mv sitio/api sitio/functions/api
rm -f sitio/functions/api/LEEME.md      # las notas no se publican

echo "sitio/ armado. Portada: $(grep -o '<title>[^<]*</title>' sitio/index.html | head -1)"
echo "Ahora:  cd sitio && npx wrangler pages deploy . --project-name iblo-eventos --branch main --commit-dirty=true"
