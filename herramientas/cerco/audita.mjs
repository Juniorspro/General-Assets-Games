import fs from 'fs';
const D='herramientas/cerco/partes/';
let src = fs.readFileSync(D+'b.js','utf8') + '\n' + fs.readFileSync(D+'c.js','utf8');
src += '\nexport { cfgNivel, generaMapa, auditaMapa, paso, reclama, MUNDOS, NIV_MUNDO, VEL, VIDAS, nuevoJug, auditaRegla, tajada };\n';
fs.writeFileSync('/tmp/mod.mjs', src);
const M = await import('/tmp/mod.mjs');

// regla
let reg = null;
try { reg = M.auditaRegla(); } catch(e) { reg = 'sin auditaRegla'; }
console.log('REGLA  ', JSON.stringify(reg));

// mapas
const malos = [];
const N = M.MUNDOS.length * M.NIV_MUNDO;
for (let m=0;m<M.MUNDOS.length;m++) for (let n=0;n<M.NIV_MUNDO;n++){
  const cfg = M.cfgNivel(m,n), mapa = M.generaMapa(cfg);
  const r = M.auditaMapa(mapa);
  if (r && r.length) malos.push(`${m+1}-${n+1}:${r}`);
}
console.log('MAPAS  ', N-malos.length, 'de', N, 'malos', JSON.stringify(malos));

function corre(m,n,modo){
  const cfg = M.cfgNivel(m,n), mapa = M.generaMapa(cfg);
  const yo = mapa.jug[0];
  yo.topeCortes = M.VIDAS;
  yo.bot = modo==='azar' ? {azar:true} : modo==='ciego' ? {per:0.80, ciego:true} : {per:0.80};
  let g=0, fin=null;
  const dt = 1/M.VEL;
  while (g++ < 12000){
    M.paso(mapa, dt);
    const mio = M.tajada(mapa, yo.id);
    if (mio >= cfg.meta) { fin='gana'; break; }
    if (!yo.vivo && yo.cortes >= M.VIDAS) { fin='vidas'; break; }
    if (cfg.seg && mapa.reloj >= cfg.seg) { fin='tiempo'; break; }
  }
  const mio = M.tajada(mapa, yo.id);
  return {gana: fin==='gana', pct: mio*100, cortes: yo.cortes};
}
for (const modo of ['bot','ciego','azar']){
  const t0=Date.now(); let g=0, sp=0, sc=0;
  for (let m=0;m<M.MUNDOS.length;m++) for (let n=0;n<M.NIV_MUNDO;n++){
    const r = corre(m,n,modo); if (r.gana) g++; sp+=r.pct; sc+=r.cortes;
  }
  console.log(modo.padEnd(6), `${g}/${N}`, ' pct', (sp/N).toFixed(1), ' cortes', (sc/N).toFixed(2), ' ms', Date.now()-t0);
}
