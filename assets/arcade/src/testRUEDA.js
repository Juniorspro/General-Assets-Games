/* SONDA del TOCADISCOS de RUEDA: que estén las 15 pistas, que se puedan elegir con
   un toque real, que la elección se guarde y que en automático suene la de la zona.
   uso: node _rd2.js */
const { chromium } = require('./node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const S='/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/';
const ok=[],bad=[];
const A=(c,m,x)=>{(c?ok:bad).push(m);console.log((c?'ok  ':'FAIL')+' '+m+(x!==undefined?' '+JSON.stringify(x):''));};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await (await b.newContext({viewport:{width:412,height:915},hasTouch:true})).newPage();
  const errs=[],net={};
  pg.on('pageerror',e=>{if(!/decode audio/.test(e.message))errs.push(e.message.slice(0,150))});
  pg.on('response',r=>{const u=r.url();if(/mus-r\d+\.m4a/.test(u))net[u.split('/').pop()]=r.status();});
  await pg.goto('http://127.0.0.1:8951/arc-rueda.html?local',{waitUntil:'load'});
  await sleep(4500);
  const ctr=async id=>pg.evaluate(i=>{const e=document.getElementById(i);if(!e)return null;
    const r=e.getBoundingClientRect();if(r.width<2)return null;
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
    return{x,y,hit:(document.elementFromPoint(x,y)||{}).id||(document.elementFromPoint(x,y)||{}).className};},id);
  let g=await ctr('ldGo');await pg.mouse.click(g.x,g.y);await sleep(1400);
  /* ---- el botón redondo propio abre el panel ---- */
  let r=await ctr('bExtra');
  A(!!r,'el menú tiene el botón del panel',r);
  await pg.mouse.click(r.x,r.y);await sleep(700);
  const abre=await pg.evaluate(()=>{const p=document.getElementById('rdP');
    return p?{on:p.classList.contains('on'),tabs:[...p.querySelectorAll('.rdTabs b')].map(e=>e.textContent)}:null;});
  console.log('panel:',JSON.stringify(abre));
  A(abre&&abre.on,'el panel abre',abre);
  A(abre&&abre.tabs.length===3,'hay TRES pestañas (pelotas, medallas, música)',abre&&abre.tabs);
  /* ---- pestaña de música ---- */
  const t2=await ctr('rdT2');
  A(!!t2&&/rdT2/.test(String(t2.hit)),'el toque llega a la pestaña de MÚSICA',t2);
  await pg.mouse.click(t2.x,t2.y);await sleep(600);
  const lista=await pg.evaluate(()=>{const b=document.getElementById('rdBody');
    return{n:b.children.length,
      filas:[...b.children].map(e=>e.querySelector('b').textContent.trim()).slice(0,4),
      activa:[...b.children].findIndex(e=>e.className.includes('dn'))};});
  console.log('lista:',JSON.stringify(lista));
  A(lista.n===16,'aparecen las 15 pistas + AUTOMÁTICO',{filas:lista.n});
  A(lista.activa===0,'arranca en AUTOMÁTICO',{activa:lista.activa});
  await pg.screenshot({path:S+'R-rueda-musica.png'});
  /* ---- elegir la pista 7 con un toque real ---- */
  const p7=await pg.evaluate(()=>{const e=document.getElementById('rdBody').children[7];
    const r=e.getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
    return{x,y,txt:e.querySelector('b').textContent.trim(),
      hit:(document.elementFromPoint(x,y)||{}).className};});
  await pg.mouse.click(p7.x,p7.y);await sleep(800);
  const sel=await pg.evaluate(()=>({trk:ARC.S.trk,
    marca:[...document.getElementById('rdBody').children].findIndex(e=>e.className.includes('dn'))}));
  console.log('elegida:',JSON.stringify({toco:p7.txt,...sel,red:Object.keys(net)}));
  A(sel.trk===6,'la pista elegida queda guardada',{trk:sel.trk});
  A(!!net['mus-r07.m4a'],'y es LA que el navegador se pone a bajar',
    {pedidas:Object.keys(net)});
  A(sel.marca===7,'la fila elegida queda marcada',{marca:sel.marca});
  /* ---- sobrevive al recargar (está en el guardado) ---- */
  await pg.reload({waitUntil:'load'});await sleep(4500);
  const g2=await ctr('ldGo');await pg.mouse.click(g2.x,g2.y);await sleep(1200);
  const tras=await pg.evaluate(()=>ARC.S.trk);
  A(tras===6,'la elección sobrevive al recargar',{trk:tras});
  /* ---- volver a AUTOMÁTICO y comprobar que suena la del nivel ---- */
  r=await ctr('bExtra');await pg.mouse.click(r.x,r.y);await sleep(600);
  const t2b=await ctr('rdT2');await pg.mouse.click(t2b.x,t2b.y);await sleep(500);
  const p0=await pg.evaluate(()=>{const e=document.getElementById('rdBody').children[0];
    const r=e.getBoundingClientRect();
    return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};});
  await pg.mouse.click(p0.x,p0.y);await sleep(600);
  const auto=await pg.evaluate(()=>ARC.S.trk);
  A(auto==null,'se puede volver a AUTOMÁTICO',{trk:auto});
  await pg.evaluate(()=>{const x=document.getElementById('rdX');
    x.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
  await sleep(400);
  /* jugar el nivel 1: en automático tiene que sonar la pista de la zona 1 */
  const pl=await ctr('bPlay');await pg.mouse.click(pl.x,pl.y);await sleep(2200);
  const enJuego=await pg.evaluate(()=>({lvl:ARC.lvl,zona:GAME.dbg.state().zone}));
  console.log('jugando:',JSON.stringify({...enJuego,red:Object.keys(net)}));
  A(!!net['mus-r01.m4a'],'en automático, el nivel 1 pide su pista de zona',
    {zona:enJuego.zona,pedidas:Object.keys(net)});
  /* ---- y NO se bajaron las 15: sólo las que hicieron falta ---- */
  console.log('pistas pedidas a la red:',JSON.stringify(net));
  const pedidas=Object.keys(net).length;
  A(pedidas<=4,'no se precargan las 15 pistas (se baja la que suena)',{pedidas});
  A(Object.values(net).every(c=>c===200||c===206),'las pistas que se piden responden 200',net);
  A(errs.length===0,'cero errores de JS',errs.slice(0,3));
  console.log('\nRUEDA tocadiscos: '+ok.length+' ok, '+bad.length+' fail');
  if(bad.length)console.log('fallan:\n - '+bad.join('\n - '));
  await b.close();
})();
