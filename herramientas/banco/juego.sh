#!/usr/bin/env bash
# Arma un juego, le comprueba la sintaxis y lo copia al banco.
#   bash herramientas/banco/juego.sh <juego> [PLAN.json] [log]
# El cwd del shell se reinicia entre llamadas, asi que todo va con rutas absolutas.
set -e
R=/home/user/General-Assets-Games
J="$1"; PLAN="$2"; LOG="${3:-$J.log}"
declare -A HTML=( [dash]=Dash [cruce]=Cruce [vigilia]=Vigilia [despegue]=Despegue [cubos]=Cubos )
N="${HTML[$J]}"
[ -z "$N" ] && { echo "juego desconocido: $J"; exit 1; }
python3 "$R/herramientas/$J/armar.py" >/dev/null
node -e "
const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
const s=f.readFileSync('$R/juegos-pc/$N.html','utf8');
const ms=[...s.matchAll(/<script type=\"module\">([\s\S]*?)<\/script>/g)];
if(!ms.length){console.log('sin modulo');process.exit(0)}
for(const m of ms){try{a.parse(m[1],{ecmaVersion:'latest',sourceType:'module'})}
catch(e){console.log('SINTAXIS ERROR',e.message);process.exit(1)}}
console.log('sintaxis ok')"
python3 "$R/herramientas/$J/prep_banco.py" "$R/juegos-pc/$N.html" "/tmp/ui/$J.html"
[ -z "$PLAN" ] && exit 0
cd /tmp/ui && fuser -k 8098/tcp 2>/dev/null || true
cd /tmp/ui && PAGINA="$J.html" MOVIL=1 bash run2.sh "$PLAN" "out/$LOG" 412 892
