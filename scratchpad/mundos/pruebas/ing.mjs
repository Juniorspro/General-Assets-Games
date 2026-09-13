import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const F=[['luna','assets/mundos/luna.html'],['marte','assets/mundos/marte.html'],
        ['exo','assets/mundos/exo.html'],['hielo','assets/mundos/hielo.html'],
        ['senda','assets/senda/senda.html'],['marea','assets/g3/marea.html'],
        ['reliquia','assets/reliquia/reliquia.html']];
for (const [n,f] of F){
  const p = await b.newPage({ viewport:{ width:900, height:520 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
  await p.goto(base+f+'?local',{waitUntil:'domcontentloaded',timeout:90000});
  await p.waitForTimeout(6000);
  const d = await p.evaluate(()=>{
    const t = document.body.innerText.replace(/\s+/g,' ').slice(0,190);
    let lang=null; try{ lang = (window.LANG||null); }catch(e){}
    return { t, lang };
  });
  const esp = /EMPEZAR|JUGAR|IDIOMA|GR[ÁA]FICOS|SONIDO|VOLVER/.test(d.t);
  const ing = /START|PLAY|LANGUAGE|GRAPHICS|SOUND|BACK/i.test(d.t);
  console.log(n.padEnd(9), (ing&&!esp)?'INGLES OK ':(esp?'sale en ESPANOL':'?'),
    ' lang='+(d.lang||'-'), errs.length?(' ERR '+errs[0]):'');
  console.log('          "'+d.t.slice(0,110)+'"');
  await p.close();
}
await b.close(); server.close();
