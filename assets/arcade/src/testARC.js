/* verificacion generica de los juegos del pack ARCADE
   uso: node _arc.js <slug> [--shot]
   comprueba: arranca, menu con titulo, JUGAR entra al juego, el juego corre sin
   errores JS, el escenario queda APAISADO en celular vertical, hay HUD y la
   pantalla no queda en negro; despues corre la sonda propia del juego (__G). */
const { chromium } = require('./node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const S='/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/';
const slug=process.argv[2]||'gemas';
const ok=[],bad=[];
const A=(c,m,x)=>{(c?ok:bad).push(m);console.log((c?'ok  ':'FAIL')+' '+m+(x!==undefined?' '+JSON.stringify(x):''));};
const ink=pg=>pg.evaluate(()=>window.ARC&&ARC.rnd?ARC.snapGL():null).then(r=>r||ink2(pg));
const ink2=pg=>pg.evaluate(()=>new Promise(res=>requestAnimationFrame(()=>{
  const c=document.getElementById('cv');const cv=document.createElement('canvas');
  cv.width=160;cv.height=90;const g=cv.getContext('2d');g.drawImage(c,0,0,160,90);
  const d=g.getImageData(0,0,160,90).data;
  let n=0,sum=0,uniq={};
  for(let i=0;i<d.length;i+=4){n++;const l=d[i]*.3+d[i+1]*.6+d[i+2]*.1;sum+=l;
    uniq[(d[i]>>5)+','+(d[i+1]>>5)+','+(d[i+2]>>5)]=1;}
  res({luz:+(sum/n).toFixed(1),colores:Object.keys(uniq).length});
})));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  for(const [w,h,tag] of [[412,915,'celular vertical'],[900,430,'apaisado']]){
    const pg=await (await b.newContext({viewport:{width:w,height:h},hasTouch:true})).newPage();
    const errs=[];
    pg.on('pageerror',e=>{const t=String(e.message);if(!/decode audio|Unable to decode/.test(t))errs.push(t.slice(0,180));});
    pg.on('console',m=>{if(m.type()==='error'){const t=m.text();if(!/404|Failed to load|decode/.test(t))errs.push('C:'+t.slice(0,140));}});
    await pg.goto('http://127.0.0.1:8951/arc-'+slug+'.html?local',{waitUntil:'load'});
    await sleep(3500);
    const st=await pg.evaluate(()=>{const s=document.getElementById('stage');
      return {w:s.clientWidth,h:s.clientHeight,tr:s.style.transform,
        load:getComputedStyle(document.getElementById('load')).display,
        menu:document.getElementById('menu').classList.contains('on'),
        ttl:document.getElementById('mTtl').textContent};});
    console.log(tag+':',JSON.stringify(st));
    const vert=await pg.evaluate(()=>!!GAME.portrait);
    if(vert)A(st.h>st.w,tag+': el escenario queda VERTICAL (juego portrait)',{w:st.w,h:st.h});
    else A(st.w>st.h,tag+': el escenario queda APAISADO',{w:st.w,h:st.h});
    A(st.load==='none'&&st.menu,tag+': el menú aparece y la carga se va',{load:st.load,menu:st.menu});
    A(!!st.ttl&&st.ttl.length>2,tag+': el menú muestra el título',{ttl:st.ttl});
    await pg.screenshot({path:S+'A-'+slug+'-menu-'+(w<h?'v':'h')+'.png'});
    /* JUGAR */
    await pg.evaluate(()=>{const el=document.getElementById('bPlay');
      el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
    await sleep(1400);
    const g1=await pg.evaluate(()=>({alive:ARC.alive,scr:ARC.scr,lvl:ARC.lvl,
      hud:document.getElementById('hud').style.display,dbg:(GAME.dbg&&GAME.dbg.state)?GAME.dbg.state():null}));
    console.log('  al entrar:',JSON.stringify(g1));
    A(g1.alive&&g1.scr==='game',tag+': JUGAR arranca la partida',g1);
    const px=await ink(pg);
    A(px.luz>8&&px.colores>6,tag+': se dibuja el juego (no pantalla negra)',px);
    await pg.screenshot({path:S+'A-'+slug+'-play-'+(w<h?'v':'h')+'.png'});
    /* sonda propia del juego: 12 acciones automaticas */
    if(await pg.evaluate(()=>!!(GAME.dbg&&GAME.dbg.autoMove))){
      let acted=0;
      for(let i=0;i<14;i++){
        acted+=await pg.evaluate(()=>GAME.dbg.autoMove()?1:0);
        await sleep(500);
      }
      const g2=await pg.evaluate(()=>({dbg:GAME.dbg.state(),over:ARC.scr,fps:Math.round(ARC.fps)}));
      console.log('  tras '+acted+' movidas:',JSON.stringify(g2));
      A(acted>=3||g2.over==='over',tag+': la sonda jugó '+acted+' movidas (o ya ganó)',{acted,scr:g2.over});
      const prog=Object.keys(g2.dbg||{}).some(k=>typeof g2.dbg[k]==='number'&&g2.dbg[k]>0);
      A(prog||g2.over==='over',tag+': el juego responde (avanza o termina)',g2);
      await pg.screenshot({path:S+'A-'+slug+'-mid-'+(w<h?'v':'h')+'.png'});
    }
    /* pausa y menu */
    await pg.evaluate(()=>{const el=document.getElementById('pPause');
      if(el)el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
    await sleep(500);
    const ps=await pg.evaluate(()=>ARC.scr);
    A(ps==='pause'||ps==='over',tag+': la pausa funciona',{scr:ps});
    A(errs.length===0,tag+': cero errores de JS',errs.slice(0,3));
    await pg.context().close();
  }
  console.log('\n'+slug+': '+ok.length+' ok, '+bad.length+' fail');
  if(bad.length)console.log('fallan:\n - '+bad.join('\n - '));
  await b.close();
})();
