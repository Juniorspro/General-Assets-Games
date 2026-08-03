const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await(await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:1,hasTouch:true})).newPage();
  pg.on('pageerror',e=>console.log('ERR',e.message.slice(0,140)));
  await pg.goto('http://127.0.0.1:8951/scratchpad/vert/arc-rebote.html?local',{waitUntil:'load'});
  await sleep(400);
  await pg.evaluate(()=>{window.__ARC.goMenu();window.__ARC.play();});
  await sleep(200);
  for(let i=0;i<8;i++){ await pg.evaluate(()=>{const d=window.__ARC.dbg();if(d.autoPlay)d.autoPlay();});
    const s=await pg.evaluate(()=>({st:window.__ARC.state(),g:window.__ARC.dbg().state(),ball:window.__BALL?window.__BALL():null}));
    console.log(i, JSON.stringify(s)); await sleep(300); }
  await b.close();
})().catch(e=>console.log('X',e.message));
