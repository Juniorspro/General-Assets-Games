const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const slug=process.argv[2]||'burbujas';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await(await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:2,hasTouch:true})).newPage();
  await pg.goto('http://127.0.0.1:8951/scratchpad/vert/arc-'+slug+'.html?local',{waitUntil:'load'});
  await sleep(500);
  await pg.evaluate(()=>window.__ARC.goMenu()); await sleep(900);
  await pg.screenshot({path:slug+'-menu.png'});
  await pg.evaluate(()=>window.__ARC.play()); await sleep(400);
  for(let i=0;i<8;i++){await pg.evaluate(()=>{const d=window.__ARC.dbg();if(d.autoPlay)d.autoPlay();});await sleep(220);}
  await pg.screenshot({path:slug+'-game.png'});
  console.log('ok');await b.close();process.exit(0);
})().catch(e=>{console.log('X',e.message);process.exit(1);});
