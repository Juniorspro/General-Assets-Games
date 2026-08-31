/* Vuelca el plan de un workflow a ficheros del repositorio.

   El resultado de un workflow vive en /tmp y se pierde al reiniciarse el contenedor, que es
   exactamente cuando hace falta. Se guarda el JSON entero y una version legible, para poder
   retomar por el paso donde se quedo sin volver a gastar los agentes. */
import { readFileSync, writeFileSync } from 'node:fs';

const [src, outMd] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(src, 'utf8'));
const plan = raw.plan || (raw.result && raw.result.plan) || raw;

writeFileSync(outMd.replace(/\.md$/, '.json'), JSON.stringify(plan, null, 1));

const md = ['# Plan: Redline Rider en movil', '', '## Resumen', '', plan.summary, ''];
md.push('## Pasos', '');
for (const s of plan.steps || []){
  md.push('### ' + s.n + '. ' + s.file, '', '**Que:** ' + s.what, '', '**Por que:** ' + s.why, '',
          '```', s.code, '```', '');
}
if (plan.constants && plan.constants.length){
  md.push('## Constantes', '');
  for (const c of plan.constants) md.push('- `' + c.name + '` = ' + c.value + ' — ' + c.why);
  md.push('');
}
for (const [k, t] of [['test_plan', 'Plan de pruebas'], ['risks', 'Riesgos']]){
  if (!plan[k] || !plan[k].length) continue;
  md.push('## ' + t, '');
  for (const x of plan[k]) md.push('- ' + x);
  md.push('');
}
writeFileSync(outMd, md.join('\n'));
console.log(outMd + ': ' + (plan.steps || []).length + ' pasos, ' + md.join('\n').length + ' caracteres');
