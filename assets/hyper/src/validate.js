/* Valida módulos de props del sandbox: estructura, materiales, tamaños, masas y unicidad.
   uso: node validate.js props/industrial.js [props/otro.js ...]   (sin args: todos) */
const fs=require('fs'),path=require('path');
const DIR=__dirname;
const MATS=['wood','plank','metal','steel','rust','corrugated','concrete','brick','asphalt',
  'plastic','rubber','glass','fabric','dirt','grass','paint','chrome','neon','cardboard','tile'];
const SHAPES={box:[3],cyl:[2,3],sph:[1],cone:[2]};
const TABS=['acc','veh','ent'];

let files=process.argv.slice(2);
if(!files.length)files=fs.readdirSync(path.join(DIR,'props')).filter(f=>f.endsWith('.js')).map(f=>'props/'+f);

const secs=[];
global.HP={section:(id,name,tab,props)=>secs.push({id,name,tab,props,file:CUR})};
let CUR='';
for(const f of files){ CUR=f;
  const src=fs.readFileSync(path.join(DIR,f),'utf8');
  try{ new Function('HP',src)(global.HP); }
  catch(e){ console.log('XX '+f+': no se puede evaluar -> '+e.message); process.exit(1); } }

const ids=new Map(),names=new Map();
let errs=[],warn=[],total=0;
const bad=(f,id,m)=>errs.push(f+' · '+id+': '+m);

for(const s of secs){
  if(!s.id||!/^[a-z0-9_]+$/.test(s.id))errs.push(s.file+': id de sección inválido');
  if(!TABS.includes(s.tab))errs.push(s.file+': tab "'+s.tab+'" no es acc|veh|ent');
  if(!Array.isArray(s.props)||!s.props.length)errs.push(s.file+': sección sin props');
  for(const p of s.props||[]){
    total++;
    const F=s.file,I=p.id||'(sin id)';
    if(!p.id||!/^[a-z][a-z0-9_]{2,28}$/.test(p.id))bad(F,I,'id inválido');
    if(ids.has(p.id))bad(F,I,'id repetido (ya está en '+ids.get(p.id)+')'); else ids.set(p.id,F);
    if(!p.name||typeof p.name!=='string'||p.name.length>16)bad(F,I,'name vacío o > 16 chars');
    else{ const k=p.name.toLowerCase();
      if(names.has(k))bad(F,I,'name repetido "'+p.name+'" (ya está en '+names.get(k)+')');
      else names.set(k,F); }
    if(typeof p.mass!=='number'||!(p.mass>=0.5&&p.mass<=3000))bad(F,I,'mass fuera de 0.5..3000');
    if(p.col!=null&&!['auto','box','cyl','sph'].includes(p.col))bad(F,I,'col inválido');
    if(!Array.isArray(p.parts)||p.parts.length<1||p.parts.length>14)bad(F,I,'parts debe tener 1..14');
    const mats=new Set(); let solid=0;
    let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
    for(const q of p.parts||[]){
      if(!SHAPES[q.s]){bad(F,I,'forma "'+q.s+'" desconocida');continue;}
      if(!Array.isArray(q.d)||!SHAPES[q.s].includes(q.d.length))
        {bad(F,I,q.s+' necesita d de largo '+SHAPES[q.s].join('|'));continue;}
      if(q.d.some(v=>typeof v!=='number'||!(v>0)))bad(F,I,'medidas d deben ser > 0');
      if(q.p&&(!Array.isArray(q.p)||q.p.length!==3||q.p.some(v=>typeof v!=='number')))bad(F,I,'p inválido');
      if(q.r&&(!Array.isArray(q.r)||q.r.length!==3||q.r.some(v=>typeof v!=='number')))bad(F,I,'r inválido');
      const m=q.m||'metal';
      if(!MATS.includes(m))bad(F,I,'material "'+m+'" no existe');
      mats.add(m);
      if(!q.nc)solid++;
      // AABB grosero (sin rotar): suficiente para detectar props gigantes o minúsculos
      const pp=q.p||[0,0,0];
      let e;
      if(q.s==='box')e=[q.d[0]/2,q.d[1]/2,q.d[2]/2];
      else if(q.s==='cyl'){const r=Math.max(q.d[0],q.d.length===3?q.d[1]:q.d[0]),h=q.d[q.d.length-1];e=[r,h/2,r];}
      else if(q.s==='sph')e=[q.d[0],q.d[0],q.d[0]].map(v=>v);
      else e=[q.d[0],q.d[1]/2,q.d[0]];
      for(let i=0;i<3;i++){mn[i]=Math.min(mn[i],pp[i]-e[i]);mx[i]=Math.max(mx[i],pp[i]+e[i]);}
    }
    if(!solid)bad(F,I,'todas las partes son nc:1 — necesita al menos una que colisione');
    if(mats.size>3)bad(F,I,'usa '+mats.size+' materiales (máx 3)');
    const size=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]];
    const big=Math.max(...size),small=Math.min(...size);
    if(big>20.5)bad(F,I,'mide '+big.toFixed(1)+' m en su lado mayor (máx 20)');
    if(big<0.15)bad(F,I,'mide '+big.toFixed(2)+' m (mín 0.15)');
    if(small<=0)bad(F,I,'tiene un lado de 0 m');
    if(mn[1]<-0.06)warn.push(F+' · '+I+': arranca en y='+mn[1].toFixed(2)+' (debería apoyar en y=0)');
    if(mn[1]>0.35)warn.push(F+' · '+I+': flota, su base está en y='+mn[1].toFixed(2));
  }
}
for(const s of secs)console.log('   '+s.file+' · '+s.id+' ('+s.name+', tab '+s.tab+'): '+s.props.length+' props');
if(warn.length){console.log('\n-- avisos ('+warn.length+') --');warn.slice(0,40).forEach(w=>console.log('  ! '+w));}
if(errs.length){console.log('\nXX '+errs.length+' errores:');errs.slice(0,60).forEach(e=>console.log('  - '+e));process.exit(1);}
console.log('\nOK · '+total+' props válidos en '+secs.length+' secciones ('+files.length+' archivos)');
