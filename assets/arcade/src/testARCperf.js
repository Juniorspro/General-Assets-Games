/* MEDICION FINAL propia: menu (atraccion viva + captura), y rendimiento EN PARTIDA
   con piloto real corriendo en cada rAF. uso: node _god.js <slug> */
const { chromium } = require('./node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const S='/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/';
const slug=process.argv[2];
const ctr=async(pg,id)=>pg.evaluate(i=>{const e=document.getElementById(i);if(!e)return null;
  const b=e.getBoundingClientRect();if(b.width<2)return null;
  const x=Math.round(b.left+b.width/2),y=Math.round(b.top+b.height/2);
  return{x,y,hit:(document.elementFromPoint(x,y)||{}).id};},id);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const out={slug};
  for(const [w,h,tag] of [[412,915,'v'],[900,430,'h']]){
    const pg=await (await b.newContext({viewport:{width:w,height:h},hasTouch:true})).newPage();
    const errs=[];pg.on('pageerror',e=>{if(!/decode audio/.test(e.message))errs.push(e.message.slice(0,120))});
    await pg.goto('http://127.0.0.1:8951/arc-'+slug+'.html?local',{waitUntil:'load'});
    await sleep(4200);
    /* la carga puede tardar mas (cruza trae varios GLB): esperar a que "TOCA PARA
       JUGAR" este realmente visible antes de tocarlo, en vez de asumir 4,2 s */
    let go=null;for(let i=0;i<40&&!go;i++){go=await ctr(pg,'ldGo');if(!go)await sleep(500);}
    out['ldWait_'+tag]=go?'ok':'TIMEOUT';
    await pg.mouse.click(go.x,go.y);await sleep(1600);
    /* MENU: atraccion viva (dos fotos separadas 1.2s deben diferir) y captura */
    const a1=await pg.evaluate(()=>ARC.snapGL());await sleep(1200);
    const a2=await pg.evaluate(()=>ARC.snapGL());
    const mi=await pg.evaluate(()=>{const m=document.getElementById('menu');
      const p=document.getElementById('bPlay'),r=p.getBoundingClientRect(),cs=getComputedStyle(p);
      return{live:m.classList.contains('live'),
        play:{txt:p.textContent.trim(),op:+cs.opacity,w:Math.round(r.width),h:Math.round(r.height),
              cyPct:Math.round((r.top+r.height/2)/innerHeight*100)},
        ttl:document.getElementById('mTtl').textContent.trim(),
        top:document.querySelector('.mTop').textContent.replace(/\s+/g,' ').trim().slice(0,60)};});
    out['menu_'+tag]={live:mi.live,mueve:(a1&&a2)?(a1.luz!==a2.luz||a1.colores!==a2.colores):null,a1,a2,...mi};
    await pg.screenshot({path:S+'F-'+slug+'-menu-'+tag+'.png'});
    /* PARTIDA con piloto en cada rAF */
    const pl=await ctr(pg,'bPlay');
    out['play_hit_'+tag]=pl.hit;
    await pg.mouse.click(pl.x,pl.y);await sleep(1400);
    await pg.evaluate(()=>{window.__bot=1;window.__s=[];let last=performance.now(),n=0;
      const f=()=>{if(!window.__bot)return;
        const t=performance.now();window.__s.push(1000/Math.max(1,t-last));last=t;
        if(GAME.dbg&&GAME.dbg.autoMove&&(n++%4===0))try{GAME.dbg.autoMove()}catch(e){}
        if(ARC.rnd&&(n%10===0)){window.__tri=Math.max(window.__tri||0,ARC.rnd.info.render.triangles);
          window.__cal=Math.max(window.__cal||0,ARC.rnd.info.render.calls);}
        requestAnimationFrame(f);};requestAnimationFrame(f);});
    await sleep(22000);
    const perf=await pg.evaluate(()=>{window.__bot=0;const s=window.__s.slice(30).filter(x=>x>1&&x<200);
      s.sort((a,b)=>a-b);
      return{fpsP3:+s[Math.floor(s.length*.03)].toFixed(1),fpsMed:+s[Math.floor(s.length/2)].toFixed(1),
        tris:window.__tri,calls:window.__cal,scr:ARC.scr,dbg:GAME.dbg.state()};});
    out['juego_'+tag]=perf;
    await pg.screenshot({path:S+'F-'+slug+'-play-'+tag+'.png'});
    out['errs_'+tag]=errs;
    await pg.context().close();
  }
  console.log(JSON.stringify(out));
  await b.close();
})();
