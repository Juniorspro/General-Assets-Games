// Servidor local + Playwright. El plan es un JSON con pasos: wait, click, key, js, n (foto).
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const plan=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const W=+(process.argv[4]||900), H=+(process.argv[5]||460);
const PC=process.argv[6]==='pc';
const T={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp'};
const srv=http.createServer((q,r)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/'+(process.env.PAGINA||'eco.html');
 const f=path.join('/tmp/ui',u);
 try{ if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){ console.log('[SRV 404]',u); r.writeHead(404); r.end('no'); return; } }catch(e){ console.log('[SRV 404e]',u); r.writeHead(404); r.end('no'); return; }
 r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
 fs.createReadStream(f).pipe(r); });
await new Promise(r=>srv.listen(8098,r));
const nav=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--proxy-bypass-list=<-loopback>','--autoplay-policy=no-user-gesture-required',
 // camara y microfono falsos: sin esto getUserMedia tira NotFoundError en el contenedor y no hay
 // forma de probar ni el microfono de Eco ni el handtracking de Recreo.
 '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
const MOVIL=!!process.env.MOVIL;   // telefono de verdad: pointer:coarse y user agent de Android
const ctx=await nav.newContext(Object.assign({viewport:{width:W,height:H},hasTouch:!PC,deviceScaleFactor:1},
  MOVIL? { isMobile:true, hasTouch:true, userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' } : {}));
const pg=await ctx.newPage(); const cdp=await ctx.newCDPSession(pg);
pg.on('requestfinished',async r=>{ try{ const q=await r.response(); if(q&&q.status()>=400) console.log('[HTTP]',q.status(),r.url().slice(0,140)); }catch(e){} });
pg.on('console',m=>{ if(m.type()==='error') console.log('[err]',m.text().slice(0,200)); });
pg.on('response',r=>{ if(r.status()>=400) console.log('[404]', r.status(), r.url().slice(0,120)); });
pg.on('pageerror',e=>console.log('[PAGE ERROR]',String(e).slice(0,400)));
await pg.goto('http://127.0.0.1:8098/'+(process.env.PAGINA||'eco.html')+'?v='+Date.now(),{waitUntil:'domcontentloaded'});
// EL RECORTE VA EXPLICITO. Sin clip, Page.captureScreenshot devolvia 1024x489 en una ventana de
// 1024x576 -se comia los 87 px de abajo- y el pie de la cinematica parecia no existir cuando en
// realidad estaba dibujado fuera de la foto. Con el clip del tamano de la ventana sale completo.
// El navegador a veces se pone en escala de pagina 0,849 y entonces la foto sale con marco negro
// y encogida aunque el DOM mida exactamente 1024x576. Se fija en 1 y listo.
await cdp.send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,
  mobile:MOVIL, screenWidth:W, screenHeight:H, positionX:0, positionY:0}).catch(()=>{});
await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1}).catch(()=>{});
const foto=async n=>{ const r=await cdp.send('Page.captureScreenshot',{format:'png',
   captureBeyondViewport:false, clip:{x:0,y:0,width:W,height:H,scale:1}});
 fs.writeFileSync('/tmp/ui/out/'+n+'.png',Buffer.from(r.data,'base64'));
 console.log('foto ->',n); };
for(const p of plan){
 if(p.wait) await pg.waitForTimeout(p.wait);
 if(p.click){ try{ await pg.click(p.click); }catch(e){ console.log('click falla',p.click); } }
 if(p.key){ await pg.keyboard.press(p.key); }
 if(p.js){ let v; try{ v=await pg.evaluate(p.js); }catch(e){ v='ERR '+String(e).slice(0,300); }
   console.log('js ->', typeof v==='string'? v : JSON.stringify(v)); }
 if(p.n) await foto(p.n);
}
await nav.close(); srv.close();
