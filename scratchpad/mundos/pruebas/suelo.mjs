/* Mira el suelo de frente y a media distancia, que es donde se veia la rejilla, y
   mide los fps para que el arreglo no salga carisimo. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT='/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const mundo = process.argv[2] || 'secuoya';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{ width:1280, height:600 }, hasTouch:true });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,180)));
p.on('console',m=>{if(m.type()==='error')errs.push('con: '+m.text().slice(0,150));});
await p.goto(base+'assets/mundos/'+mundo+'.html?local',{waitUntil:'domcontentloaded',timeout:120000});
await p.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>0;},{timeout:120000});
await p.waitForTimeout(2500);
await p.evaluate(()=>document.getElementById('mJugar').click());
await p.waitForTimeout(1800);
await p.evaluate(()=>{try{window.__S.cineSkip();}catch(e){}});
// mirar un poco hacia abajo: el suelo a media distancia es donde aparecia la rejilla
await p.evaluate(()=>window.__S.mira(0.6, -0.30));
await p.waitForTimeout(7000);
const fps = await p.evaluate(()=>{const e=[...document.querySelectorAll('*')].map(x=>x.textContent||'')
  .find(t=>/\bdib\b.*\btri\b/.test(t)&&t.length<90); return e&&e.replace(/\s+/g,' ');});
console.log(mundo, '->', fps || '(sin linea de fps)');
console.log('errores:', errs.length?[...new Set(errs)].slice(0,4):'ninguno');
await p.screenshot({ path: SHOT+'s-'+mundo+'.png' });
await b.close(); server.close();
