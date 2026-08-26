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
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--proxy-bypass-list=<-loopback>','--autoplay-policy=no-user-gesture-required'] });
const ctx=await nav.newContext({viewport:{width:W,height:H},hasTouch:!PC,deviceScaleFactor:1});
const pg=await ctx.newPage(); const cdp=await ctx.newCDPSession(pg);
pg.on('requestfinished',async r=>{ try{ const q=await r.response(); if(q&&q.status()>=400) console.log('[HTTP]',q.status(),r.url().slice(0,140)); }catch(e){} });
pg.on('console',m=>{ if(m.type()==='error') console.log('[err]',m.text().slice(0,200)); });
pg.on('response',r=>{ if(r.status()>=400) console.log('[404]', r.status(), r.url().slice(0,120)); });
pg.on('pageerror',e=>console.log('[PAGE ERROR]',String(e).slice(0,400)));
await pg.goto('http://127.0.0.1:8098/'+(process.env.PAGINA||'eco.html')+'?v='+Date.now(),{waitUntil:'domcontentloaded'});
const foto=async n=>{ const r=await cdp.send('Page.captureScreenshot',{format:'png'});
 fs.writeFileSync('/tmp/ui/out/'+n+'.png',Buffer.from(r.data,'base64')); console.log('foto ->',n); };
for(const p of plan){
 if(p.wait) await pg.waitForTimeout(p.wait);
 if(p.click){ try{ await pg.click(p.click); }catch(e){ console.log('click falla',p.click); } }
 if(p.key){ await pg.keyboard.press(p.key); }
 if(p.js){ let v; try{ v=await pg.evaluate(p.js); }catch(e){ v='ERR '+String(e).slice(0,300); }
   console.log('js ->', typeof v==='string'? v : JSON.stringify(v)); }
 if(p.n) await foto(p.n);
}
await nav.close(); srv.close();
