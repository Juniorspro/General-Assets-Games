#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
#  LOGIN DE REZONA LAB — el enlace y el código, sin salir de acá
#
#      bash herramientas/arranque/login_rezona.sh
#
#  Arranca el flujo de autenticación, IMPRIME EL ENLACE que hay que abrir y se
#  queda esperando hasta que lo apruebes. No pide ni muestra ninguna llave.
# ══════════════════════════════════════════════════════════════════════════════
set -u
LOG=/tmp/rezona_login.log
ESPERA_MAX=600          # 10 minutos para aprobar
ok(){ printf '  \033[32m✓\033[0m %s\n' "$1"; }
no(){ printf '  \033[31m✗\033[0m %s\n' "$1"; }
eh(){ printf '  \033[33m·\033[0m %s\n' "$1"; }

cat <<'AVISO'

╔══════════════════════════════════════════════════════════════════════════════╗
║  ANTES DE EMPEZAR — LO QUE **NO** HAY QUE HACER                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

  ✗ NO pegues la llave en el chat, ni en un commit, ni en un archivo del repo.
      Este repo es PÚBLICO: un token commiteado es un token publicado, y quien
      lo levante genera con tu cuenta. `.rezona/` está en el .gitignore por eso.
      El login de abajo deja la sesión en ~/.rezona/credentials.json y listo.

  ✗ NO corras `npx rezona@latest init` DENTRO del repo.
      `init` deja una marca `.rezona/` en la carpeta donde lo corras, y esa
      carpeta pasa a ser un proyecto de Rezona. Hacelo AFUERA:
          mkdir -p /tmp/rez && cd /tmp/rez && npx rezona@latest init
      Y desde ahí se descargan los assets, que después se hornean al repo.
      `login` (esto) NO toca archivos del proyecto: es sólo la credencial.

  ✗ NO llames a `publish_to_rezona_app`. Es IRREVERSIBLE.
      Publica el juego para todo el mundo. Sólo con pedido explícito y textual.

  ✗ NO esperes que el MCP funcione en ESTA sesión si recién lo agregás.
      Los MCP se cargan al ARRANCAR la sesión. Mientras tanto se le habla por
      stdio:  python3 herramientas/rezona/rz.py tools

  ✗ NO emparejes las respuestas por posición cuando mandes varias llamadas.
      El servidor contesta a medida que termina cada una, así que vuelven
      DESORDENADAS. Ya pasó: una textura llegó con la ruta de otra y no falló
      nada, contestó mal. Hay que ordenar por el `id` del JSON-RPC — `rz.py`
      ya lo hace.

  ✗ NO generes sin pasar `face_limit`. Tripo devuelve UN MILLÓN de triángulos
      y decimarlos después destroza el modelo. Los parámetros que funcionaron
      están en herramientas/rezona/estado.json.

AVISO

echo "──────────────────────────────────────────────────────────────────────────────"
# SE DETECTA POR LO QUE DICE CUANDO **NO** HAY SESIÓN, no por lo que dice cuando
# sí la hay: el texto de éxito trae el nombre y el entorno, que cambian, y el de
# fracaso es una frase fija. Ojo con el patrón — "sign in" NO matchea "signed
# in", y por eso la primera versión daba por buena una sesión que no existía.
printf '\n\033[1m1 · ¿ya estás autenticado?\033[0m\n'
if timeout 120 npx -y rezona@latest status 2>&1 | tee /tmp/rezona_status.log | grep -qiE "not signed in|not authenticated|no credentials|latest.? login|please log ?in"; then
  no "todavía no"
else
  if [ -s /tmp/rezona_status.log ]; then
    ok "ya hay sesión:"
    sed 's/^/     /' /tmp/rezona_status.log | head -8
    echo
    eh "si querés renovarla igual, borrá ~/.rezona y volvé a correr esto."
    exit 0
  fi
  no "no se pudo comprobar; sigo con el login"
fi

printf '\n\033[1m2 · arrancando el flujo\033[0m\n'
rm -f "$LOG"; : > "$LOG"
# --no-browser IMPRIME la URL en vez de intentar abrir un navegador, que es lo
# correcto en un contenedor sin escritorio: sin esto el comando se queda mudo
# esperando un navegador que no existe.
setsid npx -y rezona@latest login --no-browser > "$LOG" 2>&1 &
PID=$!

echo "  esperando el enlace…"
URL=""
for i in $(seq 1 60); do
  sleep 2
  URL=$(grep -oE 'https?://[^ ")]+' "$LOG" | head -1)
  [ -n "$URL" ] && break
  kill -0 $PID 2>/dev/null || break
done

if [ -z "$URL" ]; then
  no "no apareció ningún enlace. Esto es lo que dijo el comando:"
  sed 's/^/     /' "$LOG" | head -20
  eh "alternativa: npx rezona@latest login --paste   (pegás una llave que ya tengas)"
  exit 1
fi

cat <<FIN

╔══════════════════════════════════════════════════════════════════════════════╗
║  ABRÍ ESTE ENLACE Y APROBÁ                                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

    $URL

FIN
# EL CÓDIGO VA ENTERO. El CLI lo imprime en cuatro grupos —KF7J-RERC-LOEN-MJKS—
# y un patrón de dos grupos se queda con la mitad: eso no sirve para lo único
# para lo que existe, que es COMPARARLO con el que muestra la página antes de
# aprobar. Se toma la línea propia del CLI y, si cambiara, el código del enlace.
COD=$(grep -iE 'confirmation code' "$LOG" | grep -oE '[A-Z0-9]{4}(-[A-Z0-9]{4})+' | head -1)
[ -z "$COD" ] && COD=$(printf '%s' "$URL" | grep -oE 'code=[A-Z0-9-]+' | cut -d= -f2)
[ -n "$COD" ] && echo "    código: $COD"
echo "    (tiene que ser EL MISMO que muestra la página; si no, no aprobés)"
echo "  (podés abrirlo en el celular; el código es de un solo uso y vence solo)"
echo

printf '\033[1m3 · esperando que apruebes…\033[0m\n'
T=0
while [ $T -lt $ESPERA_MAX ]; do
  sleep 5; T=$((T+5))
  if ! kill -0 $PID 2>/dev/null; then break; fi
  [ $((T % 60)) -eq 0 ] && echo "  … $((T/60)) min"
done
wait $PID 2>/dev/null

printf '\n\033[1m4 · comprobando\033[0m\n'
if timeout 120 npx -y rezona@latest status 2>&1 | tee /tmp/rezona_status.log \
   | grep -qiE "not signed in|not authenticated|no credentials|latest.? login"; then
  no "sigue sin sesión. Lo que dijo el login:"
  sed 's/^/     /' "$LOG" | tail -15
  exit 1
fi
ok "autenticado"
sed 's/^/     /' /tmp/rezona_status.log | head -8

printf '\n\033[1m5 · los proyectos que hay\033[0m\n'
EST="$(dirname "$0")/../rezona/estado.py"
RZ="$(dirname "$0")/../rezona/rz.py"
if [ -f "$EST" ]; then python3 "$EST" 2>&1 | sed 's/^/  /'
elif [ -f "$RZ" ]; then timeout 180 python3 "$RZ" call list_projects '{}' 2>&1 | head -20 | sed 's/^/  /'
else eh "para ver los proyectos: python3 herramientas/rezona/rz.py call list_projects '{}'"
fi

cat <<'FIN'

  listo. Recordá:
    · los assets se bajan a una carpeta FUERA del repo (/tmp/rez, con `init` ahí)
    · los parámetros que funcionan están en herramientas/rezona/estado.json
    · publish_to_rezona_app NO se llama nunca sin pedido explícito

FIN
