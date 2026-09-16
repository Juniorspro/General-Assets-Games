#!/bin/bash
# uso: ./run2.sh plan.json salida.log [ancho alto] [pc]
cd /tmp/ui; mkdir -p out; node h2.mjs "$1" x "${3:-900}" "${4:-460}" "$5" 2>&1 | tee "$2"
