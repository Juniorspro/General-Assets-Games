/* RELIQUIA EN PC: ¿se detecta y se juega con el teclado?
   Abre sin táctil (un PC de verdad), elige inglés, entra al juego y prueba las
   cuatro teclas comprobando que el carril, el salto y el deslizarse responden. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
import { readFile } from 'node:fs/promises';
const ROOT = '/home/user/mundos';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });

for (const pc of [true, false]){
  const p = await b.newPage({ viewport: { width: 640, height: 400 }, hasTouch: !pc,
    isMobile: !pc, ...(pc ? {} : { userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' }) });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  await p.route('**cdn.jsdelivr.net/**', async route => {
    const u = route.request().url();
    let f = null;
    if (u.includes('three@0.170.0/build/three.module.js')) f = ROOT + '/_vthree/build/three.module.js';
    else if (u.includes('three@0.170.0/examples/jsm/'))
      f = ROOT + '/_vthree/examples/jsm/' + u.split('examples/jsm/')[1];
    else if (u.includes('/gh/Juniorspro/General-Assets-Games@') && u.includes('/assets/'))
      f = ROOT + '/assets/' + u.split('/assets/')[1];
    if (!f) return route.abort();
    try {
      const buf = await readFile(f);
      const ct = f.endsWith('.js') ? 'text/javascript' : (f.endsWith('.jpg') ? 'image/jpeg'
        : (f.endsWith('.glb') ? 'model/gltf-binary' : (f.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream')));
      return route.fulfill({ status: 200, contentType: ct, body: buf });
    } catch (e) { return route.abort(); }
  });
  await p.goto(base + 'assets/reliquia/reliquia.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.waitForTimeout(3500);
  /* la pantalla de idioma va primero: ENGLISH */
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('button,div,span')]
      .find(e => /ENGLISH/i.test(e.textContent || '') && e.children.length < 3);
    if (b) b.click();
  });
  await p.waitForTimeout(2500);
  /* saltear el cine y empezar */
  for (let i = 0; i < 10; i++){
    await p.keyboard.press('Space');
    await p.waitForTimeout(400);
    const st = await p.evaluate(() => window.APP || null);
    if (st === 'run') break;
    await p.evaluate(() => {
      const b = [...document.querySelectorAll('button,div')]
        .find(e => /^(PLAY|JUGAR|START)/i.test((e.textContent || '').trim()));
      if (b) b.click();
    });
  }
  await p.waitForTimeout(1200);
  const est = await p.evaluate(() => ({
    pc: document.body.classList.contains('pc'),
    tec: (document.getElementById('pcTec') || {}).offsetHeight > 0,
    app: window.APP || null,
    carril: window.R ? window.R.lane : null
  }));
  /* teclas */
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(260);
  const c1 = await p.evaluate(() => window.R ? window.R.lane : null);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(260);
  const c2 = await p.evaluate(() => window.R ? window.R.lane : null);
  await p.keyboard.press('Space'); await p.waitForTimeout(300);
  const salta = await p.evaluate(() => window.R ? (window.R.y > .05 || window.R.vy > 0) : null);
  await p.screenshot({ path: '/tmp/pose/reliquia-' + (pc ? 'pc' : 'tactil') + '.png' });
  console.log((pc ? 'PC     ' : 'TÁCTIL ') + ' body.pc=' + est.pc + '  panel de teclas=' + est.tec +
    '  APP=' + est.app + '  carril ' + est.carril + '→' + c1 + '→' + c2 + '  salta=' + salta +
    (errs.length ? '  ERR ' + errs[0] : ''));
  await p.close();
}
await b.close(); server.close();
