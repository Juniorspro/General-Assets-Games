/* MIDE UN PERSONAJE DE per/*.glb QUIETO, CAMINANDO Y CORRIENDO.

   Criterio: caminando, la inclinacion del modelo tiene que dar ~0 grados y los
   huesos Hips/Spine02/Head tienen que quedar dentro de +-15 grados de su reposo.
   El reposo sale de reposo.json (leido de los GLB con glb.py), asi la cuenta es
   exactamente la misma que hace retarget.py fuera del navegador.

   Y una medida que NO depende de la pose de reposo, que es la que se ve: la
   INCLINACION DE LA ESPINA. npcPose expone las rotaciones locales de la cadena
   Hips-Spine02-Spine01-Spine-neck-Head, asi que aca se rearma la cadena por
   cinematica directa con las traslaciones de reposo del GLB y se mide el angulo
   del vector cadera->cabeza contra la vertical. En reposo esos personajes dan
   entre 0,8 y 12,5 grados; un encorvado da mucho mas.

   COMO SE LO HACE CAMINAR: la ronda de npcTick no mueve a nadie en esta build
   (comprobado: las posiciones no cambian en 18 segundos), asi que no sirve para
   medir. Pero el mundo expone window.__SIRA, que ES uno de los personajes de
   per/ (pantano-guia.glb). Poniendole sigue=true camina detras del jugador, y con
   __S.corre(true) pasa a la velocidad de correr. Asi se ejercitan los tres clips
   sin depender de la ronda.

   Uso: node anda.mjs <fichero.html>
*/
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import { serve } from './serve.mjs';

const PAG = process.argv[2] || '_zz-nuevo.html';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const REPOSO = JSON.parse(readFileSync(new URL('./reposo.json', import.meta.url)));
const CAD = ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head'];

const qm = (a, b) => [
  a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
  a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
  a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qv = (q, v) => {
  const [x, y, z, w] = q, [a, b, c] = v;
  const ix = w*a + y*c - z*b, iy = w*b + z*a - x*c, iz = w*c + x*b - y*a,
        iw = -x*a - y*b - z*c;
  return [ix*w + iw*-x + iy*-z - iz*-y, iy*w + iw*-y + iz*-x - ix*-z,
          iz*w + iw*-z + ix*-y - iy*-x];
};
const angq = (a, b) => 2 * Math.acos(Math.min(1,
  Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]))) * 57.3;
function espina(rep, huesos) {
  let W = [0, 0, 0, 1], pos = [0, 0, 0], hip = null;
  for (const b of CAD) {
    const r = rep[b]; if (!r) return null;
    const d = qv(W, r.p);
    pos = [pos[0]+d[0], pos[1]+d[1], pos[2]+d[2]];
    W = qm(W, (huesos && huesos[b]) || r.q);
    if (b === 'Hips') hip = pos.slice();
  }
  const v = [pos[0]-hip[0], pos[1]-hip[1], pos[2]-hip[2]];
  const L = Math.hypot(v[0], v[1], v[2]);
  return L ? Math.acos(Math.max(-1, Math.min(1, v[1]/L))) * 57.3 : null;
}

const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 760, height: 480 }, hasTouch: true });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.goto(base + PAG + '?local', { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => { const c = document.querySelector('canvas'); return c && c.width > 0; }, null, { timeout: 120000 });
await p.waitForTimeout(2000);
await p.evaluate(() => document.getElementById('mJugar').click());
await p.waitForTimeout(1200);
await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
await p.waitForTimeout(1500);
// __SIRA es un personaje de per/: se lo hace acompañante para que camine
const listo = await p.evaluate(() => {
  if (!window.__SIRA) return null;
  window.__SIRA.sigue = true;
  return { glb: window.__SIRA.glb, nombre: window.__SIRA.nombre };
});
if (!listo) { console.log('no hay window.__SIRA en esta pagina'); await b.close(); server.close(); process.exit(0); }
console.log('personaje de prueba:', JSON.stringify(listo));
// acercarse para que cargue el modelo
await p.evaluate(() => window.__S.tp(window.__SIRA.fig.position.x + 2, window.__SIRA.fig.position.z + 2));
await p.waitForTimeout(4000);

const muestras = [];
async function junta(seg) {
  for (let k = 0; k < seg; k++) {
    await p.waitForTimeout(420);
    const m = await p.evaluate(() => {
      const s = window.__SIRA, ps = window.__S.npcPose();
      const mio = ps.find(x => x.nombre === s.nombre);
      return mio ? { ...mio, velReal: +(s.vel || 0).toFixed(2) } : null;
    });
    if (m) muestras.push(m);
  }
}
// QUIETO: al lado del jugador se detiene
await junta(6);
// ANDAR: lejos, camina a 5,8 m/s
for (let r = 0; r < 5; r++) {
  await p.evaluate(() => window.__S.tp(window.__SIRA.fig.position.x + 17, window.__SIRA.fig.position.z + 17));
  await junta(5);
}
// CORRER: con corre(true) la velocidad pasa a 10,8 m/s
await p.evaluate(() => window.__S.corre(true));
for (let r = 0; r < 4; r++) {
  await p.evaluate(() => window.__S.tp(window.__SIRA.fig.position.x + 26, window.__SIRA.fig.position.z + 26));
  await junta(5);
}

const glb = listo.glb.split('/').pop();
const rep = REPOSO[glb];
const grupos = { quieto: [], andar: [], correr: [] };
for (const m of muestras) {
  const g = m.velReal < 0.2 ? 'quieto' : (m.velReal < 5.4 ? 'andar' : 'correr');
  grupos[g].push(m);
}
console.log('\npagina: ' + PAG + '   personaje: ' + glb);
console.log('espina EN REPOSO (referencia): ' + espina(rep, null).toFixed(1) + ' grados\n');
console.log('estado    n   ' + ['Hips', 'Spine02', 'Head'].map(x => (x + ' med/max').padEnd(17)).join('')
            + 'inclModelo  espina med/max');
let peor = 0;
for (const g of ['quieto', 'andar', 'correr']) {
  const L = grupos[g]; if (!L.length) { console.log(g.padEnd(9) + '  sin muestras'); continue; }
  const col = h => {
    // rep[h] es {q,p}: la comparacion va contra la rotacion de reposo, rep[h].q
    const v = L.map(m => m.huesos[h] && rep[h] ? angq(m.huesos[h], rep[h].q) : null).filter(x => x != null);
    if (!v.length) return '-';
    const med = v.reduce((a, c) => a + c, 0) / v.length, mx = Math.max(...v);
    if (g !== 'correr') peor = Math.max(peor, mx);
    return (med.toFixed(1) + '/' + mx.toFixed(1)).padEnd(17);
  };
  const inc = L.map(m => m.inclinaGrados), esp = L.map(m => espina(rep, m.huesos)).filter(x => x != null);
  console.log(g.padEnd(9) + String(L.length).padStart(3) + '  '
    + ['Hips', 'Spine02', 'Head'].map(col).join('')
    + (Math.max(...inc).toFixed(1) + '        ').slice(0, 12)
    + (esp.reduce((a, c) => a + c, 0) / esp.length).toFixed(1) + '/' + Math.max(...esp).toFixed(1));
}
console.log('\npeor hueso vigilado quieto+caminando: ' + peor.toFixed(1) + ' grados  (criterio 15)');
console.log('errores de pagina:', errs.length ? [...new Set(errs)].slice(0, 3) : 'ninguno');

// captura: mirar al personaje mientras camina hacia el jugador
try {
  await p.evaluate(() => window.__S.corre(false));
  await p.evaluate(() => window.__S.tp(window.__SIRA.fig.position.x + 7, window.__SIRA.fig.position.z + 7));
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    const s = window.__SIRA.fig.position;
    window.__S.mira(Math.atan2(s.x - (s.x + 7), s.z - (s.z + 7)), -0.02);
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: SHOT + 'anda-' + PAG.replace(/[^a-z0-9]/gi, '') + '.png', timeout: 120000 });
  console.log('captura: anda-' + PAG.replace(/[^a-z0-9]/gi, '') + '.png');
} catch (e) { console.log('captura FALLO: ' + e.message.slice(0, 90)); }
await b.close(); server.close();
