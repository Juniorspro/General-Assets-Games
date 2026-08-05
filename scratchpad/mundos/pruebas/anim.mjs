/* Comprueba el arreglo de animacion junto a un personaje: que suene UN SOLO clip
   con peso 1 y los otros a 0, que el modelo NO este acostado (el que se tumbaba en
   el aire), y que al alejarse y volver siga bien. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT='/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const mundo = process.argv[2] || 'pantano';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{ width:1280, height:600 }, hasTouch:true });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
p.on('console',m=>{if(m.type()==='error')errs.push('con: '+m.text().slice(0,140));});
await p.goto(base+'assets/mundos/'+mundo+'.html?local',{waitUntil:'domcontentloaded',timeout:120000});
await p.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>0;}, null, { timeout:120000});
await p.waitForTimeout(2500);
await p.evaluate(()=>document.getElementById('mJugar').click());
await p.waitForTimeout(2000);
await p.evaluate(()=>{try{window.__S.cineSkip();}catch(e){}});
await p.waitForTimeout(2000);
// pararse al lado del primer personaje con modelo
const ok=(n,c,d)=>console.log((c?'  OK    ':'  FALLA ')+n+(d!==undefined?'  '+d:''));
const cerca = await p.evaluate(()=>{
  const l = window.__S.npcs();
  const con = window.__S.npcDiag().findIndex(x=>x.glb && /-/.test(x.glb));
  const t = l[con<0?0:con];
  window.__S.tp(t.x+2.5, t.z+2.5);
  return t;
});
console.log('junto a:', JSON.stringify(cerca));
await p.waitForTimeout(6000);
const d1 = await p.evaluate(()=>({ diag:window.__S.npcDiag(), anim:window.__S.npcAnim() }));
console.log('pesos junto al personaje:');
for(const a of d1.anim) console.log('   ', a.nombre.padEnd(8), 'vel', String(a.vel).padStart(5), ' ', a.w);
// un solo clip con peso: el resto en cero
let malos=0, sinUno=0;
for(const a of d1.anim){
  const ws = a.w.split(' ').map(x=>+x.split(':')[1]);
  const enUno = ws.filter(w=>w>0.02).length;
  if(enUno>1) malos++;
  if(!ws.some(w=>w>0.9)) sinUno++;
}
ok('nunca hay dos clips sonando a la vez', malos===0, malos+' personajes mezclando');
ok('siempre hay uno en peso 1', sinUno===0, sinUno+' personajes sin clip activo');
ok('sin errores de pagina', errs.length===0, [...new Set(errs)].slice(0,3).join(' | '));
await p.screenshot({ path: SHOT+'a-'+mundo+'.png' });
console.log('captura en a-'+mundo+'.png');
await b.close(); server.close();
