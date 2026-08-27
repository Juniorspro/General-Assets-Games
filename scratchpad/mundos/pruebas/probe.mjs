/* Probe minimo: corre npcTick? avanzan los mixers? se mueve alguien? */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const PAG = process.argv[2] || '_zz-nuevo.html';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 480, height: 320 }, hasTouch: true });
p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 200)));
await p.goto(base + PAG + '?local', { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => { const c = document.querySelector('canvas'); return c && c.width > 0; }, null, { timeout: 120000 });
await p.waitForTimeout(2000);
await p.evaluate(() => document.getElementById('mJugar').click());
await p.waitForTimeout(1200);
await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
await p.waitForTimeout(1500);
await p.evaluate(() => { const o = window.__S.npcs()[0]; window.__S.tp(o.x + 12, o.z + 12); });
await p.waitForTimeout(2500);
const t = () => p.evaluate(() => {
  const d = window.__S.dbg ? window.__S.dbg() : null;
  return { fps: d && d.fps, dist: d && d.dist,
           pose: window.__S.npcPose().map(x => ({ n: x.nombre, h: x.huesos.Hips, v: x.vel })),
           pos: window.__S.npcs().map(x => x.x + ',' + x.z) };
});
const a1 = await t();
await p.waitForTimeout(3000);
const a2 = await t();
console.log('fps', a1.fps, '->', a2.fps, '   dist', a1.dist, '->', a2.dist);
for (let i = 0; i < a1.pose.length; i++) {
  const x = a1.pose[i], y = a2.pose[i];
  const cambio = JSON.stringify(x.h) !== JSON.stringify(y.h);
  console.log('  ' + x.n.padEnd(8) + ' Hips ' + JSON.stringify(x.h) + ' -> ' + JSON.stringify(y.h)
              + '  mixer_avanza=' + cambio + '  vel ' + x.v + '->' + y.v);
}
console.log('posiciones iguales?', JSON.stringify(a1.pos) === JSON.stringify(a2.pos));
console.log(' antes ', a1.pos.join(' | '));
console.log(' luego ', a2.pos.join(' | '));
await b.close(); server.close();
