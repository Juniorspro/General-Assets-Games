// Chequeo de sintaxis del <script type="module"> sin abrir un navegador.
import fs from 'fs'; import * as acorn from 'acorn';
const s=fs.readFileSync(process.argv[2],'utf8');
const re=/<script type="module">([\s\S]*?)<\/script>/g; let m,n=0;
while((m=re.exec(s))){ n++;
  try{ acorn.parse(m[1],{ecmaVersion:'latest',sourceType:'module'}); console.log('modulo',n,'OK',m[1].length,'chars'); }
  catch(e){ console.log('modulo',n,'ERROR',e.message); process.exit(1); } }
if(!n){ console.log('no hay modulos'); process.exit(1); }
