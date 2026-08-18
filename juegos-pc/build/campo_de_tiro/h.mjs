// Harness: sirve Campo_de_Tiro.html y los assets DESDE DISCO (route), entra al nivel y saca fotos.
// uso: node h.mjs shots.json
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const HTML = '/home/user/General-Assets-Games/juegos-pc/Campo_de_Tiro.html';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const plan = JSON.parse(fs.readFileSync(process.argv[2] || 'shots.json', 'utf8'));
const errs = [];
const mime = u => u.endsWith('.html') ? 'text/html' : u.endsWith('.js') ? 'text/javascript' : u.endsWith('.glb') ? 'model/gltf-binary'
  : u.endsWith('.jpg') ? 'image/jpeg' : u.endsWith('.png') ? 'image/png' : u.endsWith('.mp3') ? 'audio/mpeg' : 'text/plain';

const b = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox',
         '--autoplay-policy=no-user-gesture-required'],
});
const pg = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await pg.addInitScript(() => {
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, a) {
    if (t === 'webgl2' || t === 'webgl') a = Object.assign({}, a || {}, { preserveDrawingBuffer: true });
    return gc.call(this, t, a);
  };
  window.__err = [];
  addEventListener('error', e => window.__err.push('' + (e.message || e.error)));
});
pg.on('console', m => { const s = m.text(); if (/rror|not a function|Shader|redefinition|NaN/.test(s)) errs.push(s.slice(0, 300)); });
pg.on('pageerror', e => errs.push('PAGEERROR ' + ('' + e).slice(0, 400)));

// TODO desde disco: nada de red
await pg.route('**/*', async route => {
  const u = route.request().url();
  let f = null;
  if (u.includes('tiro.local/index.html')) f = HTML;
  else if (u.includes('/npm/three@0.170.0/build/')) f = HERE + '/three/build/' + u.split('/build/')[1];
  else if (u.includes('/npm/three@0.170.0/examples/jsm/')) f = HERE + '/three/examples/jsm/' + u.split('/examples/jsm/')[1];
  else if (u.endsWith('parkour.glb')) f = HERE + '/parkour.glb';
  if (f && fs.existsSync(f)) return route.fulfill({ status: 200, contentType: mime(u), body: fs.readFileSync(f) });
  if (/mqtt.*\.js$/.test(u)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.mqtt={connect(){throw new Error("sin red en el harness");}};' });
  return route.fulfill({ status: 404, contentType: 'text/plain', body: 'no' });   // resto (skins, cielos, sfx): 404 rapido
});

await pg.goto('https://tiro.local/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
try { await pg.waitForSelector('#npGo', { timeout: 6000 }); await pg.fill('#npName', 'Test'); await pg.click('#npGo'); }
catch (e) { console.log('(sin pantalla de nombre)'); }
await pg.waitForFunction(() => !!window.__tiro, null, { timeout: 40000 }).catch(() => console.log('(__tiro no aparecio)'));
await pg.waitForFunction(() => { const l = document.getElementById('loader'); return !l || l.classList.contains('hide'); }, null, { timeout: 40000 }).catch(() => console.log('(loader no se escondio)'));
await pg.waitForTimeout(800);
await pg.click('#mPlay').catch(e => errs.push('mPlay: ' + e.message.slice(0, 120)));
await pg.waitForTimeout(2500);
console.log('estado:', JSON.stringify(await pg.evaluate(() => (window.__tiro ? window.__tiro.est() : 'sin __tiro'))));

for (const sh of plan) {
  if (sh.js) { const r = await pg.evaluate(sh.js).catch(e => 'ERR ' + e.message.slice(0, 160)); if (r !== undefined && r !== null) console.log('  js ->', JSON.stringify(r)); }
  if (sh.wait !== 0) await pg.waitForTimeout(sh.wait == null ? 500 : sh.wait);
  const f = 'out/' + sh.n + '.png';
  // La pagina corre su propio rAF continuo y con swiftshader cada frame tarda: cuando el jugador se mueve
  // (esprint), page.screenshot se queda esperando "frame estable" y se cae por timeout. No es un error del
  // juego, es el harness: timeout largo + un reintento, y si igual falla se avisa sin ensuciar el conteo.
  const opt = sh.clip ? { path: f, clip: { x: sh.clip[0], y: sh.clip[1], width: sh.clip[2], height: sh.clip[3] } } : { path: f };
  opt.timeout = 90000; opt.animations = 'disabled';
  try { await pg.screenshot(opt); }
  catch (e) { console.log('(reintento de captura', sh.n + ')'); await pg.waitForTimeout(1500);
    try { await pg.screenshot(opt); } catch (e2) { console.log('(SIN CAPTURA', sh.n + ':', e2.message.slice(0, 90) + ')'); continue; } }
  const med = await pg.evaluate(() => {   // brillo medio del frame: medir, no adivinar
    const c = document.querySelector('#app canvas'); const w = 160, h = 90;
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data; let s = 0, mx = 0;
    for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; if (v > mx) mx = v; }
    return [Math.round(s / (w * h)), Math.round(mx)];
  }).catch(() => ['?', '?']);
  console.log('foto', sh.n, '· medio', med[0], '· max', med[1], '·', fs.statSync(f).size, 'bytes');
}
console.log('--- errores (' + errs.length + ') ---');
for (const e of errs.slice(0, 20)) console.log(e);
for (const e of (await pg.evaluate(() => window.__err || [])).slice(0, 8)) console.log('win.err:', e);
await b.close();
