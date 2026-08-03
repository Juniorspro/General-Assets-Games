const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await(await b.newContext({viewport:{width:900,height:506},deviceScaleFactor:2,hasTouch:true})).newPage();
  pg.on('pageerror',e=>console.log('ERR',e.message.slice(0,140)));
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-horda.html?local',{waitUntil:'load'});
  await sleep(6000);
  await pg.evaluate(()=>window.__ARC.goMenu()); await sleep(600);
  await pg.evaluate(()=>window.__ARC.play()); await sleep(500);
  let caps=new Set(), shots=0;
  for(let i=0;i<300;i++){
    await pg.evaluate(()=>{const d=window.__ARC.dbg();if(d.autoPlay)d.autoPlay();});
    if(i%10===0){const s=await pg.evaluate(()=>window.__ARC.dbg().state());
      caps.add(s.cap);
      if(i%50===0)console.log('t='+(i*0.3|0)+'s',JSON.stringify(s));
      if(s.cap>=1&&shots===0){await pg.screenshot({path:'horda-city.png'});shots=1;}
      if(s.dlg&&shots<2){await pg.screenshot({path:'horda-dlg.png'});shots=2;}
      if(s.dead||s.won)break;}
    await sleep(280);
  }
  const fin=await pg.evaluate(()=>window.__ARC.dbg().state());
  console.log('FINAL',JSON.stringify(fin),'caps visitadas:',[...caps].join(','));
  await pg.screenshot({path:'horda-game.png'});
  await b.close();
})().catch(e=>console.log('X',e.message));
