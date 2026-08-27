/* SONDA de AGUJERO estilo agar.io: mapa grande, nueve zonas, quince rivales,
   tragarse y ser tragado, culleo por frustum y ojos animados.
   uso: node _ag3.js */
const { chromium } = require('./node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const S='/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/';
const ok=[],bad=[];
const A=(c,m,x)=>{(c?ok:bad).push(m);console.log((c?'ok  ':'FAIL')+' '+m+(x!==undefined?' '+JSON.stringify(x):''));};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await (await b.newContext({viewport:{width:900,height:430},hasTouch:true})).newPage();
  const errs=[];
  pg.on('pageerror',e=>{if(!/decode audio/.test(e.message))errs.push(e.message.slice(0,170))});
  pg.on('console',m=>{if(m.type()==='error'){const t=m.text();if(!/404|Failed to load|decode/.test(t))errs.push('C:'+t.slice(0,150));}});
  await pg.goto('http://127.0.0.1:8951/arc-agujero.html?local',{waitUntil:'load'});
  const ctr=async id=>pg.evaluate(i=>{const e=document.getElementById(i);if(!e)return null;
    const r=e.getBoundingClientRect();if(r.width<2)return null;
    return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};},id);
  let g=null;for(let i=0;i<40&&!g;i++){g=await ctr('ldGo');if(!g)await sleep(500);}
  A(!!g,'la carga termina y ofrece entrar');
  await pg.mouse.click(g.x,g.y);await sleep(1600);
  let r=await ctr('bPlay');await pg.mouse.click(r.x,r.y);await sleep(2200);
  /* ---- 1. el mapa y el reparto ---- */
  const st0=await pg.evaluate(()=>GAME.dbg.state());
  console.log('arranque:',JSON.stringify({MAP:st0.MAP,census:st0.census,vivos:st0.vivos,
    rivals:st0.rivals.length,visibles:st0.visibles,draws:st0.draws,zona:st0.zona}));
  A(st0.MAP>=90,'el mapa es MUCHO más grande (medio lado en unidades)',{MAP:st0.MAP,antes:26});
  A(st0.census>800,'el barrio tiene más de 800 cosas para comer',{census:st0.census,antes:80});
  A(st0.vivos===16,'entran 16 pozos: vos + 15 rivales',{vivos:st0.vivos});
  A(st0.rivals.length===15,'los quince rivales están en juego',{n:st0.rivals.length});
  /* ---- 2. CULLEO: se dibuja una fracción del mapa ---- */
  const cull=await pg.evaluate(()=>({vis:GAME.dbg.state().visibles,cen:GAME.dbg.state().census,
    tris:ARC.rnd.info.render.triangles,calls:ARC.rnd.info.render.calls}));
  console.log('culleo:',JSON.stringify(cull));
  A(cull.vis<cull.cen*.25,'sólo se sube a la GPU una fracción del mapa',
    {visibles:cull.vis,censo:cull.cen,pct:Math.round(cull.vis/cull.cen*100)+'%'});
  A(cull.tris<=25000,'≤25.000 triángulos con el mapa 12 veces más grande',{tris:cull.tris});
  A(cull.calls<=60,'≤60 llamadas de dibujo',{calls:cull.calls});
  /* girar la cámara al otro extremo del mapa: el culleo tiene que seguir acotado */
  const lejos=await pg.evaluate(async()=>{
    GAME.dbg.put&&GAME.dbg.put(-80,-80);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return{vis:GAME.dbg.state().visibles,tris:ARC.rnd.info.render.triangles,
      calls:ARC.rnd.info.render.calls,zona:GAME.dbg.state().zona};});
  console.log('en la otra punta:',JSON.stringify(lejos));
  A(lejos.tris<=25000&&lejos.calls<=60,'en la otra punta del mapa sigue acotado',lejos);
  A(lejos.zona!==st0.zona,'y es OTRA zona',{de:st0.zona,a:lejos.zona});
  /* ---- 3. las nueve zonas se ven distintas ---- */
  const zs=[];
  for(const [x,z] of [[-70,-70],[0,-70],[70,-70],[-70,0],[0,0],[70,0],[-70,70],[0,70],[70,70]]){
    await pg.evaluate(([a,c])=>GAME.dbg.put(a,c),[x,z]);
    await sleep(420);
    const d=await pg.evaluate(()=>({zona:GAME.dbg.state().zona,...ARC.snapGL()}));
    zs.push(d);
  }
  console.log('zonas:',JSON.stringify(zs));
  A(new Set(zs.map(z=>z.zona)).size===9,'las NUEVE zonas existen y son distintas',
    zs.map(z=>z.zona));
  await pg.screenshot({path:S+'AG-zona.png'});
  /* ---- 4. TRAGARSE un rival: se lo lleva puesto y queda fuera ---- */
  const come=await pg.evaluate(async()=>{
    /* al jugador se le da masa y se lo pone encima del rival más chico */
    GAME.dbg.set({mass:900});
    const hs=window.__holes;
    let v=null;for(let i=1;i<hs.length;i++)if(hs[i].alive&&(!v||hs[i].mass<v.mass))v=hs[i];
    const antes={vivos:hs.filter(h=>h.alive).length,cazados:hs[0].ateH,masa:hs[0].mass,
      nick:v.nick};
    GAME.dbg.put(v.x,v.z);
    await new Promise(r=>setTimeout(r,700));
    return{antes,vivos:hs.filter(h=>h.alive).length,cazados:hs[0].ateH,
      masa:Math.round(hs[0].mass),vic:!v.alive,ojo:hs[0].exp};});
  console.log('me lo comí:',JSON.stringify(come));
  A(come.vic,'un pozo más grande se traga al rival COMPLETO',{muerto:come.vic});
  A(come.vivos===come.antes.vivos-1,'y el comido queda FUERA de la partida',
    {antes:come.antes.vivos,ahora:come.vivos});
  A(come.cazados===come.antes.cazados+1,'se cuenta como pozo cazado',{cazados:come.cazados});
  A(come.masa>Math.round(come.antes.masa),'y su masa pasa al que se lo comió',
    {antes:Math.round(come.antes.masa),ahora:come.masa});
  await pg.screenshot({path:S+'AG-come.png'});
  /* ---- 5. QUE TE COMAN: se pierde la ronda ahí mismo ---- */
  const muere=await pg.evaluate(async()=>{
    const hs=window.__holes;
    GAME.dbg.set({mass:8});                    /* chiquito otra vez */
    let big=null;for(let i=1;i<hs.length;i++)if(hs[i].alive&&(!big||hs[i].mass>big.mass))big=hs[i];
    GAME.dbg.set({rival:{i:hs.indexOf(big),mass:600}});
    GAME.dbg.grace&&GAME.dbg.grace(0);
    GAME.dbg.put(big.x,big.z);
    await new Promise(r=>setTimeout(r,900));
    return{scr:ARC.scr,vivo:hs[0].alive,ojo:hs[0].exp,
      ttl:(document.getElementById('oTtl')||{}).textContent||''};});
  console.log('me comieron:',JSON.stringify(muere));
  A(muere.vivo===false,'un pozo más grande TE traga',{vivo:muere.vivo});
  A(muere.scr==='over','y la ronda se termina ahí',{scr:muere.scr});
  A(/TRAGARON|SWALLOW|ENGOL/i.test(muere.ttl),'con el remate que lo dice',{ttl:muere.ttl});
  A(muere.ojo==='dead','y al pozo comido le quedan los ojos en cruz',{ojo:muere.ojo});
  await pg.screenshot({path:S+'AG-muere.png'});
  A(errs.length===0,'cero errores de JS',errs.slice(0,4));
  console.log('\nAGUJERO agar.io: '+ok.length+' ok, '+bad.length+' fail');
  if(bad.length)console.log('fallan:\n - '+bad.join('\n - '));
  await b.close();
})();
