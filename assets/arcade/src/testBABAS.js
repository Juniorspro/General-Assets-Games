/* SONDA de BABAS fase 1: las 65 babas exactas del original, el índice con sus ocho
   pestañas, la olla con la suerte, el inventario y la tabla de posiciones.
   uso: node _bb.js */
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
  await pg.goto('http://127.0.0.1:8951/arc-babas.html?local',{waitUntil:'load'});
  const ctr=async id=>pg.evaluate(i=>{const e=document.getElementById(i);if(!e)return null;
    const r=e.getBoundingClientRect();if(r.width<2)return null;
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
    return{x,y,hit:(document.elementFromPoint(x,y)||{}).id||(document.elementFromPoint(x,y)||{}).className};},id);
  let g=null;for(let i=0;i<40&&!g;i++){g=await ctr('ldGo');if(!g)await sleep(500);}
  A(!!g,'carga y ofrece entrar');
  await pg.mouse.click(g.x,g.y);await sleep(1600);
  let r=await ctr('bPlay');await pg.mouse.click(r.x,r.y);await sleep(1800);
  /* ---- 1. la tabla de las 65 babas es la del original ---- */
  const tb=await pg.evaluate(()=>{
    const t=GAME.dbg.tbl(),V=t.valores,N=t.nombres;
    return{n:t.n,rar:t.rar,porRareza:t.porRareza,
      primeras:N.slice(0,3).map((x,i)=>x+'='+V[i]),
      ultimas:N.slice(62).map((x,i)=>x+'='+V[62+i]),
      /* los valores clave leídos de las capturas, uno por rareza */
      hitos:{metalAmarillo:V[0],hojaAmarilla:V[11],circuloVerde:V[17],
        vorticeAmarillo:V[23],neonBlanco:V[29],fantasmaBlanco:V[35],
        envoltorio:V[36],esmeralda:V[56],brilloNaranja:V[57],brilloArcoiris:V[64]},
      /* y que los NOMBRES sean los del original */
      nombres:{p0:N[0],p11:N[11],p35:N[35],p56:N[56],p64:N[64]}};});
  console.log('tabla:',JSON.stringify(tb));
  A(tb.n===65,'hay exactamente 65 babas, como el "Total 49/65" del original',{n:tb.n});
  A(tb.rar===8,'hay ocho rarezas',{r:tb.rar});
  A(JSON.stringify(tb.porRareza)==='[6,6,6,6,6,6,21,8]',
    'el reparto por rareza es 6-6-6-6-6-6-21-8 como en las capturas',tb.porRareza);
  const h=tb.hitos;
  A(h.metalAmarillo===5&&h.hojaAmarilla===25&&h.circuloVerde===60,
    'COMÚN/NO COMÚN/RARO arrancan y terminan en los valores leídos',h);
  A(h.vorticeAmarillo===150&&h.neonBlanco===500&&h.fantasmaBlanco===1500,
    'ÉPICO/LEGENDARIO/MÍTICO también',h);
  A(h.envoltorio===3000&&h.esmeralda===20000,'SECRETO va de $3K/s a $20K/s',h);
  A(h.brilloNaranja===50000&&h.brilloArcoiris===350000,
    'DIVINO va de $50K/s a $350K/s',h);
  /* ---- 2. el formato de números es el del original (K, B, T, Qa) ---- */
  A(tb.nombres.p0==='Metal amarillo'&&tb.nombres.p35==='Fantasma blanco'&&
    tb.nombres.p56==='Esmeralda'&&tb.nombres.p64==='Brillo de arcoíris',
    'los NOMBRES son los del original, no inventados',tb.nombres);
  const F=v=>pg.evaluate(x=>GAME.dbg.fmt(x),v);
  const fm={k:await F(96250),b:await F(884.98e9),t:await F(849.58e12),
    qa:await F(2.61e15),chico:await F(500)};
  console.log('formato:',JSON.stringify(fm));
  A(/^96\.25K$/.test(fm.k)&&/B$/.test(fm.b)&&/T$/.test(fm.t)&&/Qa$/.test(fm.qa),
    'los números se escriben como en el original ($96.25K, $884.98B, $2.61Qa)',fm);
  /* ---- 3. el ÍNDICE: se abre con un toque real y tiene las ocho pestañas ---- */
  const ib=await ctr('bb_idx');
  A(!!ib&&ib.hit==='bb_idx','el botón ÍNDICE recibe el toque',ib);
  await pg.mouse.click(ib.x,ib.y);await sleep(700);
  const ix=await pg.evaluate(()=>{const p=document.getElementById('bbP');
    return{on:p.classList.contains('on'),
      tabs:[...document.querySelectorAll('#bbTabs b')].map(e=>e.textContent),
      celdas:document.getElementById('bbBody').children.length,
      pie:document.getElementById('bbFt').textContent.replace(/\s+/g,' ').trim()};});
  console.log('índice:',JSON.stringify(ix));
  A(ix.on,'el índice abre',{on:ix.on});
  A(ix.tabs.length===8,'tiene las OCHO pestañas de rareza',ix.tabs);
  A(ix.celdas===6,'la pestaña COMÚN muestra sus 6 fichas',{celdas:ix.celdas});
  A(/Total/.test(ix.pie)&&/\/65/.test(ix.pie),'el pie cuenta como el original',{pie:ix.pie});
  await pg.screenshot({path:S+'BB-indice.png'});
  /* la pestaña SECRETO tiene 21 */
  const t7=await pg.evaluate(()=>{const b=document.querySelectorAll('#bbTabs b')[6];
    const r=b.getBoundingClientRect();
    return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};});
  await pg.mouse.click(t7.x,t7.y);await sleep(500);
  const sec=await pg.evaluate(()=>({celdas:document.getElementById('bbBody').children.length,
    pie:document.getElementById('bbFt').textContent.replace(/\s+/g,' ').trim()}));
  A(sec.celdas===21,'la pestaña SECRETO muestra sus 21 fichas',sec);
  await pg.screenshot({path:S+'BB-secreto.png'});
  await pg.evaluate(()=>{const x=document.getElementById('bbX');
    x.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
  await sleep(400);
  /* ---- 4. LA OLLA: abrir da babas, y la suerte cambia lo que sale ---- */
  const a0=await pg.evaluate(()=>GAME.dbg.state());
  await pg.evaluate(()=>{GAME.dbg.luck(1);GAME.dbg.open(40);});
  await sleep(500);
  const conPoca=await pg.evaluate(()=>GAME.dbg.rarezas());
  await pg.evaluate(()=>{GAME.dbg.reset();GAME.dbg.luck(2000000);GAME.dbg.open(40);});
  await sleep(500);
  const conMucha=await pg.evaluate(()=>GAME.dbg.rarezas());
  console.log('suerte:',JSON.stringify({poca:conPoca,mucha:conMucha}));
  A(Math.max(...conMucha)>Math.max(...conPoca),
    'con MUCHA suerte salen rarezas más altas que con poca',
    {maxPoca:Math.max(...conPoca),maxMucha:Math.max(...conMucha)});
  const st=await pg.evaluate(()=>GAME.dbg.state());
  A(st.openN>=40,'la olla se abrió decenas de veces sin romperse',{openN:st.openN});
  A(st.found>0,'las babas encontradas quedan marcadas en el índice',
    {antes:a0.found,ahora:st.found});
  /* ---- 5. INVENTARIO: poner llena parcelas y sube la Base ---- */
  const inv=await ctr('bb_inv');
  await pg.mouse.click(inv.x,inv.y);await sleep(700);
  const iv=await pg.evaluate(()=>({on:document.getElementById('bbP').classList.contains('on'),
    filas:document.getElementById('bbBody').children.length,
    pie:document.getElementById('bbFt').textContent.replace(/\s+/g,' ').trim()}));
  A(iv.on&&iv.filas>0,'el inventario abre y muestra las babas sueltas',iv);
  /* toque real en PONER de la primera fila */
  const pl=await pg.evaluate(()=>{const e=document.querySelector('#bbBody .pl');
    if(!e)return null;const r=e.getBoundingClientRect();
    return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),
      hit:(document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2))||{}).className};});
  A(!!pl&&/pl/.test(String(pl.hit)),'el botón PONER recibe el toque',pl);
  const b0=await pg.evaluate(()=>GAME.dbg.state());
  await pg.mouse.click(pl.x,pl.y);await sleep(600);
  const b1=await pg.evaluate(()=>GAME.dbg.state());
  console.log('poner:',JSON.stringify({antes:{slots:b0.slots,dps:b0.dps},despues:{slots:b1.slots,dps:b1.dps}}));
  A(b1.slots===b0.slots+1,'PONER ocupa una parcela',{antes:b0.slots,ahora:b1.slots});
  A(b1.dps>b0.dps,'y la Base ($/s) sube',{antes:b0.dps,ahora:b1.dps});
  await pg.screenshot({path:S+'BB-inv.png'});
  await pg.evaluate(()=>{const x=document.getElementById('bbX');
    x.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
  /* ---- 6. la plata entra por segundo y la tabla se ordena ---- */
  await pg.evaluate(()=>GAME.dbg.fill());
  await sleep(300);
  const c0=await pg.evaluate(()=>GAME.dbg.state().cash);
  await sleep(2600);
  const c1=await pg.evaluate(()=>GAME.dbg.state().cash);
  A(c1>c0,'el dinero entra por segundo solo',{antes:c0,ahora:c1});
  const lb=await pg.evaluate(()=>{const t=document.getElementById('bbLbT');
    return{filas:t.querySelectorAll('tr').length,
      cols:[...t.querySelectorAll('tr th')].map(e=>e.textContent),
      hayYo:!!t.querySelector('tr.me')};});
  console.log('tabla:',JSON.stringify(lb));
  A(lb.filas===5,'la tabla tiene cabecera y cuatro jugadores, como el original',lb);
  A(lb.cols.length===5,'con las cinco columnas #/Nombre/Coche/Base/Dinero',lb.cols);
  A(lb.hayYo,'y tu fila queda marcada',{hayYo:lb.hayYo});
  /* ---- 7. rendimiento con la base llena ---- */
  await pg.evaluate(()=>{window.__bot=1;window.__s=[];let last=performance.now(),n=0;
    const f=()=>{if(!window.__bot)return;const t=performance.now();
      window.__s.push(1000/Math.max(1,t-last));last=t;
      if(n++%4===0)try{GAME.dbg.autoMove()}catch(e){}
      if(ARC.rnd&&n%8===0){window.__t=Math.max(window.__t||0,ARC.rnd.info.render.triangles);
        window.__c=Math.max(window.__c||0,ARC.rnd.info.render.calls);}
      requestAnimationFrame(f);};requestAnimationFrame(f);});
  await sleep(18000);
  const perf=await pg.evaluate(()=>{window.__bot=0;const s=window.__s.slice(30).filter(x=>x>1&&x<200);
    s.sort((a,b)=>a-b);
    return{fpsP3:+s[Math.floor(s.length*.03)].toFixed(1),fpsMed:+s[Math.floor(s.length/2)].toFixed(1),
      tris:window.__t,calls:window.__c,dbg:GAME.dbg.state()};});
  console.log('perf:',JSON.stringify({fpsP3:perf.fpsP3,fpsMed:perf.fpsMed,tris:perf.tris,calls:perf.calls}));
  A(perf.tris<=25000,'≤25.000 triángulos',{tris:perf.tris});
  A(perf.calls<=60,'≤60 llamadas de dibujo',{calls:perf.calls});
  A(perf.fpsMed>=40,'≥40 fps de mediana',{fpsMed:perf.fpsMed,fpsP3:perf.fpsP3});
  A(perf.dbg.slots===12,'el piloto llenó las doce parcelas',{slots:perf.dbg.slots});
  await pg.screenshot({path:S+'BB-final.png'});
  A(errs.length===0,'cero errores de JS',errs.slice(0,4));
  console.log('\nBABAS fase 1: '+ok.length+' ok, '+bad.length+' fail');
  if(bad.length)console.log('fallan:\n - '+bad.join('\n - '));
  await b.close();
})();
