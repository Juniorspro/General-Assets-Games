/* Mira el CIELO y el HORIZONTE de un mundo. Para poder apuntar la camara sin que
   el bucle del juego la reescriba, primero se DETIENE el bucle pisando
   requestAnimationFrame, y despues se fuerza un render por cada encuadre. La
   niebla y la geometria quedan intactas, asi que lo que se ve es exactamente lo
   que ve el jugador. Con soloCielo se apagan todas las mallas: lo que sobrevive
   es el equirectangular, y ahi se separa la costura del asset de la banda plana
   que produce la geometria del horizonte. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/vista/';
const mundo = process.argv[2] || 'estepa';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{ width:800, height:400 }, hasTouch:true });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
p.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url().split('/').pop());});
await p.goto(base + 'assets/mundos/' + mundo + '.html?local', { waitUntil:'domcontentloaded', timeout:120000 });
await p.waitForFunction(()=>window.__S && document.querySelector('canvas') &&
  document.querySelector('canvas').width>0, { timeout:120000 });
await p.evaluate(()=>{ try{ window.__S.entrar(); }catch(e){} });
await p.waitForTimeout(10000);
/* el HUD tapa el horizonte en las capturas: se esconde */
await p.addStyleTag({ content:'#hud,#joy,#bSalto,#bUsar,#top,#obj,#vig,#brujula,#minimapa,#reloj{display:none!important}' });
await p.evaluate(()=>{ window.__raf = window.requestAnimationFrame; window.requestAnimationFrame = ()=>0; });

async function foto(nom, o){
  await p.evaluate(o => {
    const S = window.__S;
    if (!window.__vis){ window.__vis = [];
      S.scene.traverse(n => { if (n.isMesh || n.isPoints || n.isSprite) window.__vis.push([n, n.visible]); }); }
    for (const [n, v] of window.__vis) n.visible = o.soloCielo ? false : v;
    S.cam.rotation.set(o.pitch || 0, o.yaw || 0, 0);
    S.cam.updateMatrixWorld(true);
    S.ren.render(S.scene, S.cam);
  }, o);
  await p.screenshot({ path: SHOT + nom + '.png' });
}
/* barrido del horizonte con la escena entera: la banda plana y los escalones */
for (let i = 0; i < 4; i++)
  await foto('h-' + mundo + '-y' + i, { yaw: i * Math.PI / 2, pitch: -.03, soloCielo: 0 });
/* y el mismo rumbo solo con el cielo, para saber que parte es del asset */
await foto('h-' + mundo + '-cielo', { yaw: Math.PI / 4, pitch: -.03, soloCielo: 1 });
await foto('h-' + mundo + '-cenit', { yaw: 0, pitch: 1.3, soloCielo: 0 });
console.log('errores:', errs.length ? [...new Set(errs)].slice(0,6) : 'ninguno');
await b.close(); server.close();
