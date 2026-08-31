/* Vuelca el diario de un workflow a un fichero legible del repositorio.
   Los agentes pueden morir a mitad y el diario es lo unico que queda de lo que ya
   devolvieron, asi que se guarda cada vez que hay algo nuevo, sin esperar al final. */
import { readFileSync, writeFileSync } from 'node:fs';

const [journal, out] = process.argv.slice(2);
const rows = readFileSync(journal, 'utf8').split('\n').filter(Boolean)
  .map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
  .filter(Boolean);

const results = rows.filter(r => r.type === 'result' && r.result);
const md = ['# Investigacion: Redline Rider en movil', '',
  'Devuelto por los agentes del workflow. ' + results.length + ' de 7.', ''];

const block = (t, v, depth) => {
  const h = '#'.repeat(Math.min(6, depth));
  if (v === null || v === undefined) return;
  if (Array.isArray(v)){
    md.push(h + ' ' + t, '');
    for (const it of v){
      if (it && typeof it === 'object') md.push('- ' + Object.entries(it).map(([k, x]) => '**' + k + '**: ' + x).join(' — '));
      else md.push('- ' + it);
    }
    md.push('');
  } else if (typeof v === 'object'){
    md.push(h + ' ' + t, '');
    for (const [k, x] of Object.entries(v)) block(k, x, depth + 1);
  } else {
    md.push(h + ' ' + t, '', String(v), '');
  }
};

for (const r of results) block(r.result.area || r.result.summary || r.agentId, r.result, 2);
writeFileSync(out, md.join('\n'));
writeFileSync(out.replace(/\.md$/, '.json'), JSON.stringify(results.map(r => r.result), null, 1));
console.log(results.length + ' resultados -> ' + out);
for (const r of results) console.log('  ' + String(r.result.area || r.result.summary || r.agentId).slice(0, 70));
