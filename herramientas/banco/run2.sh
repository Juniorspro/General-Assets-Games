#!/usr/bin/env bash
# run2.sh — levanta el servidor local y corre un plan.
# Se corre DESDE /tmp/ui, que es donde armar.sh dejo todo:
#
#   cd /tmp/ui && fuser -k 8098/tcp; PAGINA=x.html MOVIL=1 bash run2.sh PLAN.json out/x.log 412 892
#
# El servidor hace falta porque un module ES cargado por file:// choca contra
# CORS. Se apaga solo al terminar.
set -u
PLAN="${1:-PLAN.json}"; LOG="${2:-out/banco.log}"
ANCHO="${3:-412}"; ALTO="${4:-892}"
PUERTO="${PUERTO:-8098}"

command -v fuser >/dev/null && fuser -k "${PUERTO}"/tcp 2>/dev/null
python3 -m http.server "$PUERTO" --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT

for _ in $(seq 1 40); do
    curl -s -o /dev/null "http://127.0.0.1:${PUERTO}/" && break
    sleep 0.25
done

BASE="http://127.0.0.1:${PUERTO}" node banco.js "$PLAN" "$LOG" "$ANCHO" "$ALTO"
