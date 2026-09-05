#!/usr/bin/env bash
set -e
R=/home/user/General-Assets-Games
python3 "$R/herramientas/tono/armar.py"
node -e "
const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
const s=f.readFileSync('$R/juegos-pc/Tono.html','utf8');
const m=s.match(/<script type=\"module\">([\s\S]*)<\/script>/);
try{a.parse(m[1],{ecmaVersion:'latest',sourceType:'module'});console.log('sintaxis ok')}
catch(e){console.log('SINTAXIS ERROR',e.message);process.exit(1)}"
python3 "$R/herramientas/tono/prep_banco.py" "$R/juegos-pc/Tono.html" /tmp/ui/tono.html
