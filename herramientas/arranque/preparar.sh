#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
#  ARRANQUE DE UNA SESIÓN NUEVA
#
#      bash herramientas/arranque/preparar.sh
#
#  Deja lista una sesión recién clonada: dependencias, los MCP declarados, el
#  login de Rezona y el banco de pruebas. Es idempotente — correrlo dos veces no
#  hace daño y no vuelve a bajar lo que ya está.
#
#  POR QUÉ EXISTE: el contenedor es efímero y se revierte solo. En esta misma
#  sesión pasó DOS VECES: el HEAD saltó noventa commits hacia atrás y
#  `herramientas/barrio/` dejó de existir. Todo lo que estaba pusheado sobrevive;
#  lo que estaba en /tmp o sin commitear, no. Esto lo rearma en un comando.
# ══════════════════════════════════════════════════════════════════════════════
set -u
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ"
ok(){ printf '  \033[32m✓\033[0m %s\n' "$1"; }
no(){ printf '  \033[31m✗\033[0m %s\n' "$1"; }
eh(){ printf '  \033[33m·\033[0m %s\n' "$1"; }
tit(){ printf '\n\033[1m%s\033[0m\n' "$1"; }

tit "1 · lo que tiene que estar instalado"
for c in node npx python3 git; do
  if command -v $c >/dev/null 2>&1; then ok "$c $($c --version 2>&1 | head -1)"; else no "falta $c"; fi
done
python3 - <<'PY' 2>/dev/null && ok "python: numpy y Pillow" || no "faltan numpy/Pillow → pip install numpy Pillow"
import numpy, PIL
PY

tit "2 · el repo"
if ! git rev-parse HEAD >/dev/null 2>&1; then
  no "no hay commits acá — ¿estás en el repo equivocado, o en un clon vacío?"
  eh "el trabajo vive en: git fetch origin claude/billeteras-sin-registro-3z7uvz"
else
echo "  rama   $(git rev-parse --abbrev-ref HEAD)"
echo "  HEAD   $(git rev-parse --short HEAD)  $(git log -1 --format=%s | cut -c1-60)"
git fetch origin "$(git rev-parse --abbrev-ref HEAD)" -q 2>/dev/null
ATRAS=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0)
if [ "$ATRAS" -gt 0 ]; then
  no "el local está $ATRAS commits ATRÁS del remoto — el contenedor se revirtió"
  eh "arreglalo con:  git reset --hard @{u}      (nada local se pierde: todo lo bueno está pusheado)"
else
  ok "al día con el remoto"
fi
SUCIO=$(git status --porcelain | wc -l)
[ "$SUCIO" -eq 0 ] && ok "árbol limpio" || eh "$SUCIO archivos sin commitear — MIRALOS antes de commitear, pueden ser de un snapshot viejo"
JUEGOS=$(ls -1 juegos-pc/*.html 2>/dev/null | wc -l)
if [ "$JUEGOS" -eq 0 ]; then
  no "no hay juegos-pc/ — estás en una rama que salió de main"
  eh "main tiene 28 commits y sólo el volcado de assets; el trabajo (563 commits)"
  eh "está en claude/billeteras-sin-registro-3z7uvz. Traelo con:"
  eh "    git fetch origin claude/billeteras-sin-registro-3z7uvz && git checkout FETCH_HEAD"
else
  ok "$JUEGOS juegos en juegos-pc/"
fi
fi

tit "3 · los MCP declarados en .mcp.json"
if [ -f .mcp.json ]; then
  python3 - <<'PY'
import json, io
d = json.load(io.open('.mcp.json', encoding='utf8'))
for n, s in d.get('mcpServers', {}).items():
    print('  · %-18s %s %s' % (n, s.get('command',''), ' '.join(s.get('args', []))))
print('\n  OJO: los MCP se cargan al ARRANCAR la sesión. Si acabás de agregar uno,')
print('  esta sesión NO lo tiene: hay que reiniciar el cliente. Mientras tanto se')
print('  le puede hablar por stdio — ver herramientas/rezona/rz.py.')
PY
else
  no "no hay .mcp.json"
fi

tit "4 · Rezona Lab"
if [ -f "$HOME/.rezona/credentials.json" ]; then
  ok "hay credencial en ~/.rezona/credentials.json"
else
  no "sin credencial"
  eh "corré:  npx rezona@latest login    (código de un solo uso; la llave NUNCA va al repo)"
  eh "el estado NO secreto —proyectos, assets, parámetros— está en herramientas/rezona/estado.json"
fi
python3 herramientas/rezona/estado.py --ver 2>/dev/null | sed 's/^/  /'
echo "  probando el servidor…"
timeout 180 python3 herramientas/rezona/rz.py call list_projects '{}' 2>/dev/null | head -3 \
  | grep -qi "not authenticated" && no "el servidor responde pero falta el login" \
  || ok "el servidor contesta"

tit "5 · el banco de pruebas"
if [ -f /tmp/ui/run2.sh ] && [ -d /tmp/ui/node_modules/playwright ]; then
  ok "ya está en /tmp/ui"
else
  eh "armándolo (baja playwright, three y acorn la primera vez)…"
  bash herramientas/banco/armar.sh && ok "banco listo en /tmp/ui" || no "falló"
fi
[ -x /opt/pw-browsers/chromium*/chrome-linux/chrome ] 2>/dev/null && ok "chromium del contenedor" \
  || eh "chromium: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers (no correr 'playwright install')"

tit "6 · skills"
N=$(ls -1 .claude/skills 2>/dev/null | grep -v README | wc -l)
[ "$N" -gt 0 ] && ok "$N skills en .claude/skills/" || no "no hay skills en el repo"
eh "las de creación y animación: game-asset-pipeline · game-character-animation ·"
eh "game-physics-rapier · open-world-streaming · realtime-rendering-quality"

tit "listo"
echo "  Leé la skill 'arranque' para saber cómo se trabaja en este repo:"
echo "      /arranque      (o mirá .claude/skills/arranque/SKILL.md)"
echo

