import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT='/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
for (const f of (process.argv.slice(2).length?process.argv.slice(2):['per/pantano-guia.glb','per/pantano-pescador.glb'])){
  const p = await b.newPage({ viewport:{ width:520, height:640 } });
  p.on('pageerror',e=>console.log('ERR',e.message.slice(0,120)));
  await p.goto(base+'_t/solo.html?f='+encodeURIComponent(f),{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction('window.__LISTO',{timeout:60000});
  const d = await p.evaluate(()=>window.__LISTO);
  const nom = f.split('/').pop().replace('.glb','');
  await p.screenshot({ path: SHOT+'crudo-'+nom+'-frente.png' });
  await p.evaluate(()=>window.__PERFIL());
  await p.waitForTimeout(300);
  await p.screenshot({ path: SHOT+'crudo-'+nom+'-perfil.png' });
  console.log(nom.padEnd(22), 'alto', d.alto+'m', ' animaciones', d.anims);
  await p.close();
}
await b.close(); server.close();
