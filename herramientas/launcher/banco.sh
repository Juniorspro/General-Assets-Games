#!/usr/bin/env bash
# Arma la interfaz y la corre en el banco. El cwd de Bash se reinicia entre
# llamadas, así que todo va con rutas absolutas: es el mismo motivo por el que
# cada juego de este repo tiene su envoltorio.
set -e
R=/home/user/General-Assets-Games
python3 "$R/herramientas/launcher/armar.py"
cp "$R/herramientas/launcher/app/assets/ui.html" /tmp/ui/aero.html
PLAN="${1:-AERO1.json}"; LOG="${2:-aero.log}"
cd /tmp/ui
fuser -k 8098/tcp 2>/dev/null || true
PAGINA=aero.html MOVIL=1 bash run2.sh "$PLAN" "out/$LOG" 412 892
