import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
import { readFile } from 'node:fs/promises';
const ROOT='/home/user/mundos';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:640,height:400} });
p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0,200)));
p.on('console', m => { if (m.type()==='error') console.log('CON', m.text().slice(0,160)); });
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
await p.goto(base+'assets/reliquia/reliquia.html', { waitUntil:'domcontentloaded', timeout:180000 });
await p.waitForTimeout(4000);
console.log(await p.evaluate(() => ({
  clase: document.body.className,
  touch: 'ontouchstart' in window, maxTP: navigator.maxTouchPoints,
  fine: matchMedia('(pointer:fine)').matches, coarse: matchMedia('(pointer:coarse)').matches,
  pcTec: !!document.getElementById('pcTec'),
  vis: document.getElementById('pcTec') ? getComputedStyle(document.getElementById('pcTec')).display : null,
  txt: document.body.innerText.slice(0,120).replace(/\n/g,' | '),
  tecHTML: (document.getElementById('pcTec')||{}).innerHTML,
  tecAlto: (document.getElementById('pcTec')||{}).offsetHeight
})));
await p.keyboard.press('KeyA'); await p.waitForTimeout(500);
console.log('tras tecla:', await p.evaluate(() => document.body.className));
await b.close(); server.close();
