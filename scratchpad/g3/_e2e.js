const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ok=[],bad=[];const A=(c,m,x)=>{(c?ok:bad).push(m);console.log((c?'ok   ':'FALLA')+' '+m+(x!==undefined?'  '+JSON.stringify(x):''));};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await(await b.newContext({viewport:{width:900,height:506},deviceScaleFactor:2,hasTouch:true})).newPage();
  pg.on('pageerror',e=>bad.push('JS:'+e.message.slice(0,100)));
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-horda.html?local',{waitUntil:'load'});
  await sleep(6000);
  await pg.evaluate(()=>{window.__ARC.goMenu();window.__ARC.play();});
  await sleep(400);
  const st0=await pg.evaluate(()=>window.__ARC.dbg().state());
  A(st0.dlg===true,'arranca con el diálogo de radio',st0.dlg);
  const D=()=>pg.evaluate(()=>{const d=window.__ARC.dbg();if(d.state().dlg)d.autoPlay();});
  const S=()=>pg.evaluate(()=>window.__ARC.dbg().state());
  const step=async(n)=>{for(let i=0;i<n;i++){await pg.evaluate(()=>{const d=window.__ARC.dbg();d.autoPlay();});await sleep(160);}};
  await D();await sleep(300);
  await pg.evaluate(()=>window.__ARC.dbg().tp(86,86)); await step(6);
  for(let i=0;i<8;i++){await D();await sleep(200);}
  let s=await S(); A(s.cap===1,'M1 completa -> escolta (cap 1)',s.cap);
  await pg.screenshot({path:'horda-city.png'});
  await pg.evaluate(()=>window.__ARC.dbg().tp(-92,-58)); await step(8);
  for(let i=0;i<6;i++){await D();await sleep(200);}
  s=await S(); A(s.cap===2,'M2 completa -> suministros (cap 2)',s.cap);
  for(const c of [[-50,40],[40,-48],[-6,96]]){
    await pg.evaluate(p=>window.__ARC.dbg().tp(p[0],p[1]),c); await step(5);
    await pg.evaluate(()=>window.__ARC.dbg().vida()); }
  for(let i=0;i<6;i++){await D();await sleep(200);}
  s=await S(); A(s.cap===3,'M3 completa -> defensa (cap 3)',s.cap);
  await pg.screenshot({path:'horda-dlg.png'});
  await pg.evaluate(()=>{window.__ARC.dbg().tp(92,92);window.__ARC.dbg().def(2);});
  await step(16); await pg.evaluate(()=>window.__ARC.dbg().vida());
  for(let i=0;i<6;i++){await D();await sleep(200);}
  s=await S(); A(s.cap===4,'M4 completa -> jefe (cap 4)',s.cap);
  await pg.evaluate(()=>window.__ARC.dbg().tp(-6,-98));
  for(let i=0;i<220;i++){ await pg.evaluate(()=>{const d=window.__ARC.dbg();d.autoPlay();});
    if(i%20===0)await pg.evaluate(()=>window.__ARC.dbg().vida());
    if(i%10===0){s=await S(); if(s.won||s.dead)break;} await sleep(150); }
  s=await S();
  A(s.won===true,'M5: jefe muerto -> CAMPANA COMPLETA',{won:s.won,dead:s.dead,score:s.score});
  await pg.screenshot({path:'horda-game.png'});
  console.log('\nE2E: '+ok.length+' bien / '+bad.length+' mal');
  if(bad.length)console.log('mal: '+bad.join(' | '));
  await b.close(); process.exit(bad.length?1:0);
})().catch(e=>{console.log('ROTO',e.message);process.exit(1);});
