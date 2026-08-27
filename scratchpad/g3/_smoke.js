const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await(await b.newContext({viewport:{width:900,height:430},deviceScaleFactor:1,hasTouch:true})).newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message.slice(0,160))); pg.on('console',m=>{if(m.type()==='error'&&!/404|decodeAudio|Failed to load/.test(m.text()))errs.push('C:'+m.text().slice(0,140));});
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-horda.html?local',{waitUntil:'load'});
  await sleep(5000); // esperar carga de GLB
  const ready=await pg.evaluate(()=>!!(window.__ARC&&window.ARC&&window.ARC.renderer));
  console.log('ready',ready,'errs',JSON.stringify(errs.slice(0,4)));
  await pg.evaluate(()=>window.__ARC.goMenu()); await sleep(1200);
  const s1=await pg.evaluate(()=>window.__ARC.snap());
  await pg.evaluate(()=>window.__ARC.play()); await sleep(600);
  const s2=await pg.evaluate(()=>window.__ARC.snap());
  const d0=await pg.evaluate(()=>window.__ARC.dbg().state());
  for(let i=0;i<16;i++){await pg.evaluate(()=>{const d=window.__ARC.dbg();if(d.autoPlay)d.autoPlay();});await sleep(180);}
  const d1=await pg.evaluate(()=>window.__ARC.dbg().state());
  console.log('menu',JSON.stringify(s1),'game',JSON.stringify(s2));
  console.log('d0',JSON.stringify(d0),'d1',JSON.stringify(d1));
  console.log('errs',JSON.stringify(errs.slice(0,4)));
  await pg.screenshot({path:'horda-game.png'});
  await b.close();
})().catch(e=>console.log('X',e.message));
