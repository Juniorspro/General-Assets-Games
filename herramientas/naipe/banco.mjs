import fs from 'fs';
const d = 'herramientas/naipe/partes/';
const src = fs.readFileSync(d+'b.js','utf8') + '\n' + fs.readFileSync(d+'c.js','utf8')
  + '\nexport { auditaManos, audita, juegaSolo, puntua, objetivoDe, CIEGA_BASE, detecta, carta, MANOS, JU, partidaNueva, mejorJugada, baseAnte, CIEGAS, JEFES, COM };\n';
fs.writeFileSync('/tmp/naipe_m.mjs', src);
const M = await import('/tmp/naipe_m.mjs');
if (process.argv[2] === 'manos'){ console.log('manos:', JSON.stringify(M.auditaManos())); }
else if (process.argv[2] === 'diag'){
  const rs = [];
  for (let i = 0; i < 120; i++) rs.push(M.juegaSolo(1000 + i*37, 'honesto', 8));
  const hist = {};
  rs.forEach(r => { const k = r.ante + '-' + r.ronda; hist[k] = (hist[k]||0)+1; });
  console.log('muere en ante-ronda:', JSON.stringify(hist));
  const pa = {};
  rs.forEach(r => { pa[r.ante] = (pa[r.ante]||0)+1; });
  console.log('ante alcanzado:', JSON.stringify(pa));
  const med = k => (rs.reduce((a,r)=>a+r[k],0)/rs.length).toFixed(2);
  console.log('com', med('com'), 'niveles', med('niveles'), 'dinero', med('dinero'));
}
else {
  console.log('honesto:', JSON.stringify(M.audita(120,'honesto',8)));
  console.log('azar   :', JSON.stringify(M.audita(120,'azar',8)));
}
