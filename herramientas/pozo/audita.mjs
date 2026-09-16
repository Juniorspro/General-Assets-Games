/* audita los diez pisos sin navegador: b.js + c.js no necesitan
   ni lienzo ni DOM mas que dos stubs, y eso es lo que permite
   comprobar 10 pisos x N semillas en milisegundos. */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
/* la ruta sale del propio archivo: relativa al cwd, esto solo corre
   parado en la carpeta justa. */
const P = path.join(path.dirname(fileURLToPath(import.meta.url)), 'partes') + '/';
const stub = `
const document = { querySelector: () => ({ getContext: () => ({}) }) };
const localStorage = { getItem:()=>null, setItem:()=>{} };
`;
const src = stub + fs.readFileSync(P+'b.js','utf8') + '\n' + fs.readFileSync(P+'c.js','utf8')
  + '\nexport { auditaPisos, generaPiso, validaPiso, ARMAS, ENEM, SALA_W, SALA_H, rng };';
fs.writeFileSync('/tmp/pozo_mod.mjs', src);
const M = await import('/tmp/pozo_mod.mjs?' + Date.now());
const sem = Number(process.argv[2] || 40);
const r = M.auditaPisos(sem);
console.log(JSON.stringify({pisos:r.pisos, malos:r.malos.length, enem:r.enem,
  salas:[r.salasMin,r.salasMax], ms:r.ms}, null, 1));
if (r.malos.length) console.log(r.malos.slice(0,14).join('\n'));
