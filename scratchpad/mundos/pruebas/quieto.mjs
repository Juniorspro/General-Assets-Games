/* ¿EL VEHÍCULO SE QUEDA QUIETO CON LA PALANCA SUELTA, Y ARRANCA AL EMPUJARLA?
   Monta el traslado, lo deja SIN TOCAR NADA un rato y mide cuánto se movió;
   después empuja a fondo y vuelve a medir. Lo primero tiene que ser ~0 y lo
   segundo tiene que ser mucho.
   Uso: node quieto.mjs <mundo> <gancho> */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const mundo = process.argv[2], gan = process.argv[3];
const RUTA = mundo === 'senda' ? 'senda/senda.html' : 'mundos/' + mundo + '.html';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 400, height: 260 }, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { try { for (const k of ['estepa', 'hielo', 'luna', 'marte', 'exo'])
  localStorage.setItem(k + '_gfx', 'b'); } catch (e) {} });
await p.goto(base + 'assets/' + RUTA + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__S && document.querySelector('canvas'), null, { timeout: 180000 });
await p.waitForTimeout(2600);
await p.evaluate(() => document.getElementById('mJugar').click());
await p.waitForTimeout(1600);
for (let i = 0; i < 8; i++){
  await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {}
    try { window.__S.dlgOk(); } catch (e) {} });
  await p.waitForTimeout(240);
}
await p.evaluate(g => window.__S[g + 'Ir'](0), gan);
await p.waitForTimeout(800);
await p.evaluate(() => window.__S.usar());
await p.waitForTimeout(700);
const est = async () => await p.evaluate(g => window.__S[g](), gan);
const pos = async () => await p.evaluate(() => { const g = window.__S.get(); return [g.px, g.pz]; });
const e0 = await est();
console.log(mundo + ' · montado: ' + (e0.modo ? 'sí' : 'NO') + '  vel=' + (e0.vel != null ? e0.vel : '?'));

/* fase 1: sin tocar nada, 5 s de mundo simulado */
const esperaSim = async (g, seg) => {
  const t0 = (await est()).tSim || 0;
  for (let i = 0; i < 400; i++){
    await p.waitForTimeout(120);
    const e = await est();
    if ((e.tSim || 0) - t0 >= seg) return;
  }
};
const a0 = await pos();
await esperaSim(gan, 5);
const a1 = await pos();
const solo = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);

/* fase 2: palanca a fondo adelante, 5 s de mundo simulado */
await p.evaluate(() => { if (window.__S.palanca) window.__S.palanca(0, -1); });
if (!(await p.evaluate(() => !!window.__S.palanca))) await p.keyboard.down('KeyW');
await esperaSim(gan, 5);
const a2 = await pos();
const conPalanca = Math.hypot(a2[0] - a1[0], a2[1] - a1[1]);
const e2 = await est();

console.log('  SIN tocar nada, 5 s de mundo: ' + solo.toFixed(1) + ' m' +
  (solo < 8 ? '   ✔ se queda quieto' : '   *** ANDA SOLO ***'));
console.log('  con la palanca a fondo:      ' + conPalanca.toFixed(1) + ' m' +
  (conPalanca > 15 ? '   ✔ arranca' : '   *** NO ARRANCA ***') +
  '  vel=' + (e2.vel != null ? (+e2.vel).toFixed(1) : '?'));
if (errs.length) console.log('  errores: ' + errs.slice(0, 2).join(' | '));
await b.close(); server.close();
