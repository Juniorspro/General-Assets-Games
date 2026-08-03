const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await(await b.newContext({viewport:{width:900,height:506},deviceScaleFactor:2,hasTouch:true})).newPage();
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-nudillos.html?local',{waitUntil:'load'});
  await sleep(4500);
  await pg.evaluate(()=>window.__ARC.goMenu()); await sleep(900);
  await pg.screenshot({path:'nudillos-menu.png'});
  await pg.evaluate(()=>window.__ARC.play()); await sleep(3500); // dejar que aparezcan enemigos
  await pg.evaluate(()=>{const d=window.__ARC.dbg();if(d.autoPlay)d.autoPlay();}); // apuntar a uno
  await sleep(200);
  await pg.screenshot({path:'nudillos-game.png'});
  console.log('st',JSON.stringify(await pg.evaluate(()=>window.__ARC.dbg().state())));
  await b.close();
})().catch(e=>console.log('X',e.message));
