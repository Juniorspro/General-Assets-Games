#!/usr/bin/env bash
# Arma, comprueba la sintaxis y copia al banco. Todo con rutas absolutas: el cwd
# del shell se reinicia entre llamadas y ya costo tres corridas en falso.
set -e
R=/home/user/General-Assets-Games
python3 "$R/herramientas/cubos/armar.py"
node -e "
const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
const s=f.readFileSync('$R/juegos-pc/Cubos.html','utf8');
const m=s.match(/<script type=\"module\">([\s\S]*)<\/script>/);
try{a.parse(m[1],{ecmaVersion:'latest',sourceType:'module'});console.log('sintaxis ok')}
catch(e){console.log('SINTAXIS ERROR',e.message);process.exit(1)}"
python3 "$R/herramientas/cubos/prep_banco.py" "$R/juegos-pc/Cubos.html" /tmp/ui/cubos.html
