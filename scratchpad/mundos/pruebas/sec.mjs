/* Sonda propia de SECUOYA: mide fps mirando un sitio concreto, saca captura y
   permite correr un trozo de JS dentro de la pagina. Se usa para el antes/despues
   del reflejo del agua y para ver la tirolesa en uso. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from '/home/user/mundos/serve.mjs';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const nom = arg('nom') || 'sec';
const gfx = arg('gfx') || 'm';
const guion = arg('js');           /* fichero .js a evaluar dentro de la pagina */
const seg = +(arg('seg') || 8);
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 600 }, hasTouch: true });
const errs = [];
p.on('pageerror', e => errs.push('ERR ' + e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') errs.push('con: ' + m.text().slice(0, 180)); });
await p.goto(base + 'assets/mundos/secuoya.html?local', { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => { const c = document.querySelector('canvas'); return c && c.width > 0; }, null, { timeout: 120000 });
await p.waitForTimeout(2500);
await p.evaluate(g => { try { window.__S.setGfx(g); } catch (e) {} }, gfx);
await p.evaluate(() => document.getElementById('mJugar').click());
await p.waitForTimeout(1500);
await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
await p.waitForTimeout(600);
if (guion){
  const src = (await import('node:fs/promises')).then;
  const txt = await (await import('node:fs/promises')).readFile(guion, 'utf8');
  const r = await p.evaluate(new Function('return (async () => {' + txt + '})()')).catch(e => 'EVAL ' + e.message);
  console.log('js ->', typeof r === 'string' ? r : JSON.stringify(r));
}
/* deja correr para que el fps se estabilice (la media es exponencial) */
await p.waitForTimeout(seg * 1000);
const linea = await p.evaluate(() => {
  const e = [...document.querySelectorAll('*')].map(x => x.textContent || '')
    .find(t => /\bdib\b.*\btri\b/.test(t) && t.length < 90);
  return e && e.replace(/\s+/g, ' ');
});
const est = await p.evaluate(() => { try { return window.__S.get(); } catch (e) { return null; } });
console.log(nom, 'gfx=' + gfx, '->', linea || '(sin linea de fps)');
if (est) console.log('  fps', est.fps, 'dib', est.dib, 'tri', est.tri, 'rs', est.rs,
  '| pos', est.px, est.pz, 'cap', est.cap, 'usar', est.usar);
console.log('errores:', errs.length ? [...new Set(errs)].slice(0, 6) : 'ninguno');
await p.screenshot({ path: SHOT + nom + '.png' });
await b.close(); server.close();
