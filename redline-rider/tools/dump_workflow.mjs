/* Vuelca el diario de un workflow al repositorio. Los agentes pueden morir a mitad y el
   diario es lo unico que queda de lo que ya devolvieron, asi que se guarda tal cual. */
import { readFileSync, writeFileSync } from 'node:fs';

const [journal, out] = process.argv.slice(2);
const rows = readFileSync(journal, 'utf8').split('\n').filter(Boolean).map(l => {
  try { return JSON.parse(l); } catch (e) { return null; }
}).filter(Boolean);

const results = rows.filter(r => r.type === 'result');
writeFileSync(out, JSON.stringify(results, null, 1));
console.log(results.length + ' resultados ->  ' + out);
for (const r of results) console.log('  ' + (r.label || r.id || '?'));
