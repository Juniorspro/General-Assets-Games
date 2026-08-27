/* MAREA en PC. Igual que reliquia, marea no tiene modo ?local para three (su TRE
   apunta siempre a jsdelivr) y el navegador de las pruebas no sale a la red: sin
   3D el canvas queda negro y no se puede ver el HUD. Se le INTERCEPTAN las
   peticiones y se contestan desde el disco. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
import { readFile } from 'node:fs/promises';
const SHOT='/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const ROOT='/home/user/mundos';
const TACTIL = process.argv[2] === 'tactil';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
/* hasTouch SI, isMobile NO: con isMobile el escenario se gira 90 grados y el HUD
   se va fuera de una ventana apaisada, y eso mide el giro y no los controles. */
const p = await b.newPage({ viewport:{width:900,height:520}, hasTouch:TACTIL });
const errs=[]; p.on('pageerror',e=>errs.push((e.stack||e.message).slice(0,200)));
await p.route('**cdn.jsdelivr.net/**', async route => {
  const u = route.request().url();
  let f = null;
  if (u.includes('three@0.170.0/build/three.module.js')) f = ROOT+'/_vthree/build/three.module.js';
  else if (u.includes('three@0.170.0/examples/jsm/')) f = ROOT+'/_vthree/examples/jsm/'+u.split('examples/jsm/')[1];
  else if (u.includes('/gh/Juniorspro/General-Assets-Games@') && u.includes('/assets/'))
    f = ROOT+'/assets/'+u.split('/assets/')[1];
  if (!f) return route.abort();
  try {
    const buf = await readFile(f);
    const ct = f.endsWith('.js')?'text/javascript':(f.endsWith('.jpg')?'image/jpeg'
      :(f.endsWith('.glb')?'model/gltf-binary':(f.endsWith('.mp3')?'audio/mpeg':'application/octet-stream')));
    return route.fulfill({ status:200, contentType:ct, body:buf });
  } catch(e){ return route.abort(); }
});
await p.goto(base+'assets/g3/marea.html',{waitUntil:'domcontentloaded',timeout:180000});
await p.waitForTimeout(11000);
await p.evaluate(()=>{const g=document.getElementById('ldGo'); if(g)g.click();});
await p.waitForTimeout(1600);
await p.evaluate(()=>{const g=document.getElementById('bPlay'); if(g)g.click();});
await p.waitForTimeout(5000);
/* el HUD se dibuja en el canvas 2D: se mira si hay pixeles del cartel de teclas
   (arriba a la izquierda del bloque logico 34,430) o de los botones tactiles */
console.log('  __ESPC=', await p.evaluate(()=>window.__ESPC),
  '· fine=', await p.evaluate(()=>matchMedia('(pointer:fine)').matches),
  '· coarse=', await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),
  '· HUDERR=', await p.evaluate(()=>window.__HUDERR||'ninguno'));
const d = await p.evaluate(()=>{
  const cv = document.getElementById('cv');
  const g = cv.getContext('2d');
  const zona = (x,y,w,h)=>{ const im=g.getImageData(x,y,w,h).data; let n=0;
    for(let i=0;i<im.length;i+=4) if(im[i+3]>40) n++; return n; };
  return { w:cv.width, h:cv.height,
    /* en coordenadas logicas de 960x540 escaladas al canvas */
    escala: cv.width/960,
    tecla: zona(Math.round(34*cv.width/960), Math.round(430*cv.height/540),
                Math.round(260*cv.width/960), Math.round(92*cv.height/540)),
    botonL: zona(Math.round(40*cv.width/960), Math.round(396*cv.height/540),
                 Math.round(110*cv.width/960), Math.round(112*cv.height/540)),
    /* el boton de pausa se dibuja DESPUES del cartel: si esta en cero, el HUD se
       corta antes y hay una excepcion en el medio */
    pausa: zona(Math.round((960-52)*cv.width/960), Math.round(16*cv.height/540),
                Math.round(36*cv.width/960), Math.round(36*cv.height/540)) };
});
console.log((TACTIL?'TACTIL':'PC')+': canvas '+d.w+'x'+d.h+' · pixeles en la zona del cartel de teclas: '+
  d.tecla+' · boton ◀: '+d.botonL+' · boton de pausa: '+d.pausa);
console.log('errores:', errs.length?[...new Set(errs)].slice(0,2):'ninguno');
await p.screenshot({path:SHOT+'marea-'+(TACTIL?'tactil':'pc')+'.png'});
await b.close(); server.close();
