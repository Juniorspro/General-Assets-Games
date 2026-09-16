/* Banco de la ARENA en node. `b.js`+`c.js` no tocan ni el DOM ni el lienzo,
   asi que la arena se puede afinar ANTES de dibujar un solo pixel — que es lo
   unico que permite saber si hay un juego adentro antes de gastar en interfaz. */
import fs from 'fs';
const D = 'herramientas/cerco/partes/';
let src = fs.readFileSync(D + 'b.js', 'utf8') + '\n' + fs.readFileSync(D + 'c.js', 'utf8');
src += '\nexport { cfgArena, generaMapa, paso, tajada, tablaPos, puestoDe, juegaArena, auditaArena, VEL, ARENA_N, ARENA_RIV, OCUPA };\n';
fs.writeFileSync('/tmp/arena.mjs', src);
const M = await import('/tmp/arena.mjs');

const segs = +(process.argv[2] || 120), veces = +(process.argv[3] || 12);
console.log(`tablero ${M.ARENA_N}²=${M.ARENA_N*M.ARENA_N} · ${M.ARENA_RIV+1} cuerpos · parte pareja ${(M.OCUPA/(M.ARENA_RIV+1)*100).toFixed(1)}% · ${segs}s × ${veces}`);
for (const modo of ['bot', 'ciego', 'azar']) {
  const r = M.auditaArena(modo, veces, segs);
  console.log(modo.padEnd(6),
    'seg', String(r.segMedio).padStart(6),
    ' mejor%', String(r.mejorMedio).padStart(6),
    ' puesto', String(r.posMedio).padStart(5),
    ' bajas', String(r.matasMedio).padStart(5),
    ' vivos', `${r.vivos}/${r.de}`,
    ' pos', `${r.mejorPos}-${r.peorPos}`,
    ' ms', r.ms);
}
