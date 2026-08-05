/* Carga un mundo en local, espera a que dibuje, y saca una captura + diagnostico
   de los personajes: donde estan, si tienen acciones, que peso tiene cada clip y
   la rotacion de su modelo. Sirve para ver el deforme y el que flota. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const mundo = process.argv[2] || 'pantano';
const seg = +(process.argv[3] || 12);
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{ width:1280, height:600 }, hasTouch:true });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
p.on('console',m=>{if(m.type()==='error')errs.push('con: '+m.text().slice(0,140));});
p.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url().split('/').pop());});
await p.goto(base + 'assets/mundos/' + mundo + '.html?local', { waitUntil:'domcontentloaded', timeout:120000 });
await p.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>0;}, null, { timeout:120000});
await p.waitForTimeout(seg*1000);
const d = await p.evaluate(() => {
  const fps = [...document.querySelectorAll('*')].map(e=>e.textContent||'')
    .find(t=>/\bdib\b.*\btri\b/.test(t)&&t.length<90);
  const D = window.__DIAG || null;
  return { fps: fps && fps.replace(/\s+/g,' '), diag: D };
});
console.log('fps:', d.fps || '-');
console.log('errores:', errs.length ? [...new Set(errs)].slice(0,6) : 'ninguno');
await p.screenshot({ path: SHOT + 'm-' + mundo + '.png' });
console.log('captura en m-' + mundo + '.png');
await b.close(); server.close();
