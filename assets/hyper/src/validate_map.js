/* Valida módulos de mapa. uso: node validate_map.js maps/construct.js [...]  (sin args: todos) */
const fs=require('fs'),path=require('path');
const DIR=__dirname;
const MATS=['wood','plank','metal','steel','rust','corrugated','concrete','brick','asphalt',
  'plastic','rubber','glass','fabric','dirt','grass','paint','chrome','neon','cardboard','tile'];
const SHAPES={box:[3],cyl:[2,3],sph:[1],cone:[2]};
let files=process.argv.slice(2);
if(!files.length)files=fs.readdirSync(path.join(DIR,'maps')).filter(f=>f.endsWith('.js')&&f[0]!=='_').map(f=>'maps/'+f);
const maps=[];let CUR='';
global.HP={map:(id,name,def)=>maps.push({id,name,def,file:CUR}),section:()=>{}};
for(const f of files){ CUR=f;
  try{ new Function('HP',fs.readFileSync(path.join(DIR,f),'utf8'))(global.HP); }
  catch(e){ console.log('XX '+f+': '+e.message); process.exit(1); } }
let errs=[],warn=[];
const ids=new Set();
for(const m of maps){
  const F=m.file,d=m.def||{},E=s=>errs.push(F+' · '+m.id+': '+s);
  if(!m.id||!/^[a-z0-9_]{3,20}$/.test(m.id))E('id inválido');
  if(ids.has(m.id))E('id repetido'); ids.add(m.id);
  if(!m.name||m.name.length>18)E('name vacío o > 18 chars');
  if(!(d.size>=60&&d.size<=400))E('size fuera de 60..400');
  if(!MATS.includes(d.ground||''))E('ground "'+d.ground+'" no es un material válido');
  if(!Array.isArray(d.spawns)||d.spawns.length<2)E('necesita al menos 2 spawns');
  else for(const s of d.spawns){ if(!Array.isArray(s)||s.length!==4||s.some(v=>typeof v!=='number'))E('spawn inválido');
    else if(Math.abs(s[0])>d.size-4||Math.abs(s[2])>d.size-4)E('spawn fuera del mapa'); }
  if(d.water)for(const w of d.water){ if(!w.p||!w.d||w.p.length!==3||w.d.length!==3)E('volumen de agua inválido'); }
  if(!Array.isArray(d.parts)||!d.parts.length)E('sin parts');
  if((d.parts||[]).length>420)E('tiene '+d.parts.length+' partes (máx 420)');
  let solid=0,mats=new Set();
  for(const q of d.parts||[]){
    if(!SHAPES[q.s]){E('forma "'+q.s+'" desconocida');continue;}
    if(!Array.isArray(q.d)||!SHAPES[q.s].includes(q.d.length)){E(q.s+': d de largo '+SHAPES[q.s].join('|'));continue;}
    if(q.d.some(v=>typeof v!=='number'||!(v>0)))E('medidas > 0');
    const big=Math.max(...q.d);
    if(big>300)E('una parte mide '+big+' m (máx 300)');
    if(Math.min(...q.d)<0.1)E('una parte mide menos de 0.1 m');
    if(q.p&&(q.p.length!==3||q.p.some(v=>typeof v!=='number')))E('p inválido');
    if(q.r&&(q.r.length!==3||q.r.some(v=>typeof v!=='number')))E('r inválido');
    const mm=q.m||'metal'; if(!MATS.includes(mm))E('material "'+mm+'" no existe'); mats.add(mm);
    if(!q.nc)solid++;
    if(q.p&&Math.abs(q.p[0])>d.size+20)warn.push(F+': parte fuera del mapa en x='+q.p[0]);
  }
  if(!solid)E('todas las partes son nc:1');
  console.log('   '+F+' · '+m.id+' ("'+m.name+'"): '+d.parts.length+' partes ('+solid+' con colisión), '
    +(d.spawns||[]).length+' spawns, '+((d.water||[]).length)+' aguas, '+mats.size+' materiales');
}
if(warn.length){console.log('\n-- avisos --');warn.slice(0,20).forEach(w=>console.log('  ! '+w));}
if(errs.length){console.log('\nXX '+errs.length+' errores:');errs.slice(0,50).forEach(e=>console.log('  - '+e));process.exit(1);}
console.log('\nOK · '+maps.length+' mapas válidos');
