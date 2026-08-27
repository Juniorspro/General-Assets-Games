/* CAPTURAS DE LA POSE: el propio cuerpo mirando hacia abajo mientras se camina,
   y un personaje del mundo caminando al lado. Es lo único que permite juzgar
   «la pose del modelo al moverse es rara» sin adivinar.
   Uso: node verpose.mjs <mundo> */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
import { mkdirSync, writeFileSync } from 'fs';
const mundo = process.argv[2] || 'dunas';
const RUTA = mundo === 'senda' ? 'senda/senda.html' : 'mundos/' + mundo + '.html';
const DIR = '/tmp/pose/' + mundo;
mkdirSync(DIR, { recursive: true });
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 700, height: 440 }, hasTouch: true });
p.on('pageerror', e => console.log('  PAGEERROR ' + e.message.slice(0, 160)));
await p.goto(base + 'assets/' + RUTA + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__S && document.querySelector('canvas'), null, { timeout: 180000 });
await p.waitForTimeout(3000);
await p.evaluate(() => document.getElementById('mJugar').click());
await p.waitForTimeout(1800);
for (let i = 0; i < 8; i++){
  await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
  await p.evaluate(() => { try { window.__S.dlgOk(); } catch (e) {} });
  await p.waitForTimeout(250);
}
const foto = async n => { await p.screenshot({ path: DIR + '/' + n + '.png' }); console.log('  ' + n); };

/* 1) quieto, mirando al frente */
await p.evaluate(() => window.__S.mira(0, 0));
await p.waitForTimeout(900); await foto('1-quieto-frente');
/* 2) quieto, mirando los pies */
await p.evaluate(() => window.__S.mira(0, -1.1));
await p.waitForTimeout(900); await foto('2-quieto-pies');
/* 3) caminando, mirando los pies */
await p.keyboard.down('KeyW');
await p.waitForTimeout(2200); await foto('3-anda-pies');
/* 4) corriendo, mirando los pies */
await p.keyboard.down('ShiftLeft');
await p.waitForTimeout(2200); await foto('4-corre-pies');
/* 5) corriendo, al frente */
await p.evaluate(() => window.__S.mira(0, -.25));
await p.waitForTimeout(1500); await foto('5-corre-frente');
await p.keyboard.up('KeyW'); await p.keyboard.up('ShiftLeft');

/* 6) al lado de un personaje que camina */
try {
  const dg = await p.evaluate(() => window.__S.npcDiag());
  const l = await p.evaluate(() => window.__S.npcs());
  let i = dg.findIndex(x => x.glb && /-/.test(x.glb)); if (i < 0) i = 0;
  const o = l[i];
  await p.evaluate(o => { window.__S.tp(o.x + 4, o.z + 4); window.__S.mira(Math.PI * .75, -.15); }, o);
  await p.waitForTimeout(4000); await foto('6-personaje');
  console.log('  personaje: ' + JSON.stringify(dg[i]));
} catch (e) { console.log('  sin personajes: ' + String(e).slice(0, 100)); }
const c = await p.evaluate(() => { try { return { cuerpo: window.__S.cuerpo(),
  glb: window.__S.cuerpoGLB(), clips: window.__S.clips() }; } catch (e) { return String(e); } });
console.log('  ' + JSON.stringify(c));
await b.close(); server.close();
