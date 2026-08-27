import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{ width:1280, height:600 }, hasTouch:true });
p.on('pageerror',e=>console.log('PAGEERROR',e.message.slice(0,150)));
await p.goto(base+'assets/mundos/pantano.html?local',{waitUntil:'domcontentloaded',timeout:120000});
await p.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>0;}, null, { timeout:120000});
await p.waitForTimeout(2500);
await p.evaluate(()=>document.getElementById('mJugar').click());
await p.waitForTimeout(1800);
await p.evaluate(()=>{try{window.__S.cineSkip();}catch(e){}});
await p.waitForTimeout(2500);
// pararse junto a un personaje humano: los lejanos no tienen modelo cargado todavia
const t = await p.evaluate(()=>{
  const l = window.__S.npcs(), dg = window.__S.npcDiag();
  const i = dg.findIndex(x=>x.glb && /-/.test(x.glb));
  const o = l[i<0?0:i]; window.__S.tp(o.x+2.5, o.z+2.5); return o; });
console.log('junto a', JSON.stringify(t));
await p.waitForTimeout(7000);
const d = await p.evaluate(()=>window.__S.npcPose());
for (const n of d){
  console.log(n.nombre.padEnd(8), n.glb.padEnd(24), 'inclina', String(n.inclinaGrados).padStart(6)+'°',
              'rotXZ', JSON.stringify(n.modeloRotXZ), n.anim);
  console.log('        huesos', JSON.stringify(n.huesos));
}
await b.close(); server.close();
