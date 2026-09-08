#!/bin/sh
# Sube el sitio a Cloudflare Pages y deja el contenido cargado. Un comando.
#
#   export CLOUDFLARE_API_TOKEN=...      # cuenta -> Cloudflare Pages -> Edit
#   export IBLO_CLAVE=...                # la del panel, solo la primera vez
#   ./desplegar-iblo.sh
#
# Las dos se leen del entorno y se usan en el momento: no quedan escritas en
# ningun archivo del repositorio.
#
# Lo que hace, en orden:
#   1. arma sitio/ con armar-sitio.sh, que es el que sabe los tres pasos que no
#      se adivinan (la portada, functions/api y compilar parado adentro)
#   2. despliega
#   3. espera a que /api/sitio conteste, que es la prueba de que las funciones
#      compilaron: si contesta 405 o 404, no compilaron
#   4. carga el contenido inicial, una sola vez
#   5. comprueba que las paginas sigan sirviendo
set -e
cd "$(dirname "$0")"

SITIO=${IBLO_SITIO:-https://iblo-eventos.pages.dev}

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Falta CLOUDFLARE_API_TOKEN. Necesita la politica Account -> Cloudflare Pages -> Edit."
  echo "Con solo Read, crear el proyecto devuelve «Authentication error» (10000) y despista."
  exit 1
fi

echo "-- 1/5  armando la carpeta"
./armar-sitio.sh >/dev/null
echo "   $(find sitio -type f | wc -l) archivos . funciones: $(ls sitio/functions/api | wc -l)"

echo "-- 2/5  desplegando"
( cd sitio && npx --yes wrangler pages deploy . \
    --project-name iblo-eventos --branch main --commit-dirty=true ) | tail -5

echo "-- 3/5  esperando a que la API conteste"
i=0
cod=000
while [ $i -lt 30 ]; do
  cod=$(curl -s -o /tmp/iblo-sitio.json -w '%{http_code}' "$SITIO/api/sitio" || echo 000)
  [ "$cod" = "200" ] && break
  i=$((i+1)); sleep 4
done
if [ "$cod" != "200" ]; then
  echo "   /api/sitio contesto $cod."
  echo "   Si es 405 o 404, wrangler no compilo las funciones: en su salida tiene que"
  echo "   decir «Compiled Worker successfully». Se compila solo si se lo corre PARADO"
  echo "   ADENTRO de sitio/, que es lo que hace este script."
  exit 1
fi
echo "   200 . $(head -c 120 /tmp/iblo-sitio.json)"

echo "-- 4/5  contenido inicial"
if [ -n "$IBLO_CLAVE" ]; then
  IBLO_API="$SITIO/api" python3 herramientas/iblo/sembrar.py
else
  IBLO_API="$SITIO/api" python3 herramientas/iblo/sembrar.py --ver
  echo "   (sin IBLO_CLAVE no siembro; la web sigue mostrando su copia de respaldo)"
fi

echo "-- 5/5  comprobando las paginas"
for r in / /esteticas /m/iblo /iblo-app; do
  printf '   %-12s %s\n' "$r" "$(curl -s -o /dev/null -w '%{http_code} %{size_download} B' "$SITIO$r")"
done
echo "listo . $SITIO"
