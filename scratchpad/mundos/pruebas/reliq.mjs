/* RELIQUIA no tiene modo ?local: sus 14 URLs van directo a jsdelivr, y el
   navegador de las pruebas no tiene salida a la red (el proxy del contenedor es
   para las herramientas, no para Chromium). Asi que se INTERCEPTAN las peticiones
   y se contestan con los archivos del disco: three vendorizado y los assets del
   propio repo. Es la unica manera de ver en que idioma arranca sin tocar el juego.
*/
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
import { readFile } from 'node:fs/promises';
const ROOT = '/home/user/mundos';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 520 } });
const errs = [];
p.on('pageerror', e => errs.push((e.stack || e.message).slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') errs.push('con: ' + m.text().slice(0, 200)); });
p.on('requestfailed', r => errs.push('falla: ' + r.url().slice(-70) + ' ' + (r.failure()||{}).errorText));
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
await p.goto(base + 'assets/reliquia/reliquia.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(9000);
/* RELIQUIA pregunta el idioma antes que nada, asi que la portada en si nunca
   sale en espanol sola: se elige. Lo que hay que ver es que ELEGIR INGLES
   repinte de verdad las pantallas siguientes. */
await p.evaluate(() => { const b = document.querySelector('#langScr [data-lang="en"]'); if (b) b.click(); });
await p.waitForTimeout(1200);
const d = await p.evaluate(() => ({
  lang: (typeof LANG !== 'undefined' ? LANG : '-'),
  app: (typeof APP !== 'undefined' ? APP : '-'),
  vis: [...document.querySelectorAll('.panel,#title')].filter(e => !e.classList.contains('hide')).map(e => e.id),
  txt: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200)
}));
console.log('lang=' + d.lang + ' app=' + d.app + ' visible=' + JSON.stringify(d.vis));
console.log('texto: "' + d.txt + '"');
const esp = /TU NOMBRE|JUGAR|IDIOMA|GRÁFICOS|SONIDO|VOLVER|TOCÁ/.test(d.txt);
const ing = /YOUR NAME|PLAY|LANGUAGE|GRAPHICS|SOUND|BACK|TAP/i.test(d.txt);
console.log(ing && !esp ? 'INGLES OK' : (esp ? 'sale en ESPANOL' : '?'));
console.log('errores:', errs.length ? [...new Set(errs)].slice(0, 3) : 'ninguno');
await b.close(); server.close();
