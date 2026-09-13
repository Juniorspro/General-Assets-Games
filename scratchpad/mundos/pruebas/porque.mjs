/* Diagnostico corto: por que los personajes no caminan en la prueba.
   Imprime distancia, velocidad, banderas y clips a lo largo del tiempo. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const PAG = process.argv[2] || '_zz-nuevo.html';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 }, hasTouch: true });
p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 140)));
await p.goto(base + PAG + '?local', { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => { const c = document.querySelector('canvas'); return c && c.width > 0; }, null, { timeout: 120000 });
await p.waitForTimeout(2000);
await p.evaluate(() => document.getElementById('mJugar').click());
await p.waitForTimeout(1500);
await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
await p.waitForTimeout(1500);
console.log('cine:', JSON.stringify(await p.evaluate(() => window.__S.cine())));
console.log('clips:', JSON.stringify(await p.evaluate(() => window.__S.clips())));
console.log('npcs:', JSON.stringify(await p.evaluate(() => window.__S.npcs())));
// acercarse para que carguen los modelos
await p.evaluate(() => { const o = window.__S.npcs()[0]; window.__S.tp(o.x + 2, o.z + 2); });
await p.waitForTimeout(3500);
console.log('diag cerca:', JSON.stringify(await p.evaluate(() => window.__S.npcDiag())));
for (const dd of [9, 11, 14]) {
  await p.evaluate(d => { const o = window.__S.npcs()[0]; window.__S.tp(o.x + d, o.z + d); }, dd);
  console.log('--- jugador a ~' + dd + 'm');
  for (let k = 0; k < 12; k++) {
    await p.waitForTimeout(500);
    const d = await p.evaluate(() => window.__S.npcDiag().map(x =>
      x.nombre + ' d' + x.d + ' v' + x.vel + (x.sigue ? ' SIGUE' : '') + ' [' + x.acc + ']'));
    console.log('   ' + d.join(' | '));
  }
}
await b.close(); server.close();
