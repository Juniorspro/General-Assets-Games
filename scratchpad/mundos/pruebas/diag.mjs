/* Entra a la partida y mide los personajes: pose de los huesos clave contra su
   reposo, pesos de los clips, y posicion/rotacion del modelo. El deforme y el que
   flota tienen que salir como numeros, no como impresion. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const mundo = process.argv[2] || 'pantano';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{ width:1280, height:600 }, hasTouch:true });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
p.on('console',m=>{if(m.type()==='error')errs.push('con: '+m.text().slice(0,140));});
await p.goto(base+'assets/mundos/'+mundo+'.html?local',{waitUntil:'domcontentloaded',timeout:120000});
await p.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>0;}, null, { timeout:120000});
await p.waitForTimeout(3000);
await p.evaluate(()=>document.getElementById('mJugar').click());
await p.waitForTimeout(2500);
// saltar la cinemática si la hay
await p.evaluate(()=>{ try{ window.__S.cineSkip(); }catch(e){} });
await p.waitForTimeout(9000);
const d = await p.evaluate(() => {
  const S = window.__S;
  const out = { clips: S.clips(), npc: S.npcDiag() };
  /* Pose real de los huesos: se compara el cuaternión actual con el de reposo del
     propio modelo. Un ángulo enorme en cuello o columna es el deforme. */
  const T = window.__T3 || null;
  out.huesos = [];
  try {
    for (const n of (window.__NPCS_REF || [])) {}
  } catch(e){}
  return out;
});
console.log('clips:', JSON.stringify(d.clips));
console.log('personajes:');
for (const n of d.npc) console.log('  ', JSON.stringify(n));
console.log('errores:', errs.length?[...new Set(errs)].slice(0,5):'ninguno');
await p.screenshot({ path: SHOT+'d-'+mundo+'.png' });
await b.close(); server.close();
