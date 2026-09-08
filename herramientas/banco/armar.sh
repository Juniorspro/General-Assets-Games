#!/bin/bash
# Rearma el banco de pruebas de Eco.html en /tmp/ui.
# El contenedor es efimero y se reclona seguido; esto lo deja andando de nuevo en un comando:
#   bash herramientas/banco/armar.sh
set -e
D=/tmp/ui
mkdir -p $D/out
cp "$(dirname "$0")"/{prep2.py,syn2.mjs,h2.mjs,run2.sh} $D/
chmod +x $D/run2.sh
cd $D
[ -f package.json ] || echo '{"name":"ui","private":true,"type":"module"}' > package.json
[ -d node_modules/playwright ] || npm install --silent playwright@1.49.1 three@0.170.0 acorn@8.14.0
# three r128 UMD: Casa_Abandonada.html lo carga de cdnjs y Chromium aca no sale a la red.
[ -f three128.min.js ] || curl -sL -o three128.min.js \
  https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js || true
echo "banco listo en $D"
