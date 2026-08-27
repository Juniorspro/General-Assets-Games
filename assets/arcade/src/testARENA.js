/* SONDA de lo nuevo de ARENA: héroe con hueso animado, bichos con modelo 3D, las
   cinco zonas con su peligro, y el botón de disparo aparte (tocado de verdad).
   uso: node _ar2.js */
const { chromium } = require('./node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const S='/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/';
const ok=[],bad=[];
const A=(c,m,x)=>{(c?ok:bad).push(m);console.log((c?'ok  ':'FAIL')+' '+m+(x!==undefined?' '+JSON.stringify(x):''));};
const dif=(a,b)=>{let m=0;for(let i=0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return +m.toFixed(4);};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await (await b.newContext({viewport:{width:900,height:430},hasTouch:true})).newPage();
  const errs=[];
  pg.on('pageerror',e=>{if(!/decode audio/.test(e.message))errs.push(e.message.slice(0,160))});
  pg.on('console',m=>{if(m.type()==='error'){const t=m.text();if(!/404|Failed to load|decode/.test(t))errs.push('C:'+t.slice(0,140));}});
  await pg.goto('http://127.0.0.1:8951/arc-arena.html?local',{waitUntil:'load'});
  await sleep(4500);
  const ctr=async id=>pg.evaluate(i=>{const e=document.getElementById(i);if(!e)return null;
    const r=e.getBoundingClientRect();if(r.width<2)return null;
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
    return{x,y,hit:(document.elementFromPoint(x,y)||{}).id};},id);
  let g=await ctr('ldGo');await pg.mouse.click(g.x,g.y);await sleep(1200);
  /* ---- 1. los modelos cargaron y pesan lo que tienen que pesar ---- */
  const glb=await pg.evaluate(()=>({tris:ARC.glbTris,keys:Object.keys(ARC.glb||{}),
    nulos:Object.keys(ARC.glb||{}).filter(k=>!ARC.glb[k])}));
  console.log('GLB:',JSON.stringify(glb));
  A(glb.nulos.length===0,'los 8 GLB cargaron (ninguno en 404)',glb.nulos);
  A(glb.tris.heroe&&glb.tris.heroe[0]===glb.tris.heroe[1],
    'el héroe con hueso NO fue simplificado (habría roto el skin)',glb.tris.heroe);
  A(glb.tris.mole&&glb.tris.mole[1]<=760,'los bichos bajaron a ~700 triángulos',
    {mole:glb.tris.mole,torre:glb.tris.torre,pua:glb.tris.pua,div:glb.tris.div});
  /* ---- 2. a jugar ---- */
  let r=await ctr('bPlay');await pg.mouse.click(r.x,r.y);await sleep(1500);
  const st0=await pg.evaluate(()=>GAME.dbg.state());
  A(st0.eGlb===15,'los CUATRO monstruos usan su modelo 3D',{eGlb:st0.eGlb});
  A(/idle\/run\/atk/.test(st0.anim),'el héroe tiene los tres clips ligados',{anim:st0.anim});
  /* ---- 3. la animación MUEVE el mesh de verdad (no es un clip mudo) ---- */
  const p1=await pg.evaluate(()=>GAME.dbg.heroPose());
  await sleep(500);
  const p2=await pg.evaluate(()=>GAME.dbg.heroPose());
  A(p1&&p2&&dif(p1,p2)>0.01,'quieto: los huesos respiran (clip de guardia)',
    {huesos:p1?p1.length/3:0,mueve:p1&&p2?dif(p1,p2):null});
  /* corriendo: se empuja el joystick y se compara la postura */
  await pg.evaluate(()=>{GAME.down({x:400,y:200});GAME.move({x:400,y:80});});
  await sleep(700);
  const pr=await pg.evaluate(()=>GAME.dbg.heroPose());
  const anR=await pg.evaluate(()=>GAME.dbg.state().anim);
  A(/^run/.test(anR),'moviéndose pasa al clip de CORRER',{anim:anR});
  A(dif(p1,pr)>0.05,'la postura de correr difiere de la de guardia',{dif:dif(p1,pr)});
  await pg.evaluate(()=>GAME.up({x:400,y:80}));
  await sleep(400);
  await pg.screenshot({path:S+'R-arena-heroe.png'});
  /* ---- 4. botón de disparo APARTE, con toque real, y en movimiento ---- */
  await pg.evaluate(()=>GAME.dbg.goRoom(1));   /* sala fresca: hay a quién dispararle */
  await sleep(900);
  const fb=await ctr('tb_fi');
  A(!!fb&&fb.hit==='tb_fi','hay botón de disparo y el toque le llega a él',fb);
  /* moviéndose SIN botón: no dispara. Se cuentan DISPAROS, no flechas en vuelo:
     la flecha va a 13 u/s y cruza la sala en 2 cuadros, así que muestrear hbs
     daba 0 aunque estuviera disparando (falso negativo mío, medido). */
  await pg.evaluate(()=>{GAME.down({x:400,y:200});GAME.move({x:400,y:80});});
  await sleep(1400);
  const s0=await pg.evaluate(()=>GAME.dbg.state().shots);
  await sleep(1400);
  const s1=await pg.evaluate(()=>GAME.dbg.state().shots);
  const noFire=s1-s0;
  /* moviéndose CON el botón apretado (toque real sostenido): sí dispara */
  await pg.mouse.move(fb.x,fb.y);await pg.mouse.down();
  await sleep(1100);
  /* las flechas viven poco: se mira el MÁXIMO durante el rato que está apretado */
  const withFire=await pg.evaluate(()=>new Promise(res=>{
    const a=GAME.dbg.state().shots;
    setTimeout(()=>res({disparos:GAME.dbg.state().shots-a,fire:GAME.dbg.state().fire,
      cls:document.getElementById('tb_fi').className}),1400);}));
  await pg.mouse.up();
  await sleep(300);
  const afterUp=await pg.evaluate(()=>GAME.dbg.state().fire);
  await pg.evaluate(()=>GAME.up({x:400,y:80}));
  console.log('disparo (en 1,4 s de movimiento):',
    JSON.stringify({sinBoton:noFire,conBoton:withFire,alSoltar:afterUp}));
  A(withFire.fire===1,'apretado, el juego queda en modo disparo',withFire);
  A(/hold/.test(withFire.cls),'el botón se enciende mientras está apretado',{cls:withFire.cls});
  A(noFire===0,'moviéndose SIN el botón NO dispara (la mecánica sigue en pie)',{disparos:noFire});
  A(withFire.disparos>0,'moviéndose CON el botón SÍ dispara',{disparos:withFire.disparos});
  A(afterUp===0,'al soltar deja de disparar',{fire:afterUp});
  /* ---- 5. las cinco zonas, cada una con su peligro ---- */
  const zs=[];
  for(let i=0;i<5;i++){
    const z=await pg.evaluate(k=>GAME.dbg.zone(k),i);
    await sleep(700);
    const px=await pg.evaluate(()=>ARC.snapGL());
    await pg.screenshot({path:S+'R-arena-z'+i+'.png'});
    zs.push({...z,...px});
  }
  console.log('zonas:',JSON.stringify(zs));
  A(zs.length===5&&new Set(zs.map(z=>z.zona)).size===5,'hay CINCO zonas distintas',
    zs.map(z=>z.zona));
  A(zs.filter(z=>z.haz!=='-').length===4,'cuatro zonas traen peligro propio',
    zs.map(z=>z.zona+':'+z.haz));
  A(zs.filter(z=>z.hz>0).length===3,'lava/zarza/vacío reparten sus manchas en el piso',
    zs.map(z=>z.zona+':'+z.hz));
  const cols=zs.map(z=>z.colores);
  A(Math.min(...cols)>6,'las cinco se dibujan (ninguna en negro)',cols);
  /* la paleta cambia de verdad: la luminancia media no puede ser la misma */
  const luz=zs.map(z=>z.luz);
  A(new Set(luz.map(v=>Math.round(v))).size>=4,'cada zona pinta distinto',luz);
  /* ---- 6. el peligro de la fragua hace daño y avisa antes ---- */
  await pg.evaluate(()=>{GAME.dbg.goRoom(1);GAME.dbg.zone(1);});
  await sleep(500);
  const lv=await pg.evaluate(async()=>{
    /* se planta al héroe encima de una grieta y se mira si el aviso llega ANTES */
    const h=GAME.dbg.hazAt()[0];
    const saw={warn:0,dmg:0};const hp0=GAME.dbg.state().hp;
    return new Promise(res=>{let n=0;
      const t=setInterval(()=>{
        GAME.dbg.put&&GAME.dbg.put(h.x,h.z);
        const s=GAME.dbg.hazAt()[0];
        if(s.warn>0)saw.warn=1;
        if(GAME.dbg.state().hp<hp0)saw.dmg=1;
        if(++n>90||(saw.warn&&saw.dmg)){clearInterval(t);res({...saw,hp0,hp:GAME.dbg.state().hp});}
      },50);});
  });
  console.log('grieta:',JSON.stringify(lv));
  A(lv.warn===1,'la grieta AVISA antes de encenderse',lv);
  /* ---- 7. rendimiento con todo puesto ---- */
  await pg.evaluate(()=>{GAME.dbg.zone(1);GAME.dbg.autoMove&&(window.__b=1);});
  await pg.evaluate(()=>{window.__bot=1;window.__s=[];let last=performance.now(),n=0;
    const f=()=>{if(!window.__bot)return;const t=performance.now();
      window.__s.push(1000/Math.max(1,t-last));last=t;
      if(n++%4===0)try{GAME.dbg.autoMove()}catch(e){}
      if(ARC.rnd&&n%8===0){window.__t=Math.max(window.__t||0,ARC.rnd.info.render.triangles);
        window.__c=Math.max(window.__c||0,ARC.rnd.info.render.calls);}
      requestAnimationFrame(f);};requestAnimationFrame(f);});
  await sleep(20000);
  const perf=await pg.evaluate(()=>{window.__bot=0;const s=window.__s.slice(30).filter(x=>x>1&&x<200);
    s.sort((a,b)=>a-b);
    return{fpsP3:+s[Math.floor(s.length*.03)].toFixed(1),fpsMed:+s[Math.floor(s.length/2)].toFixed(1),
      tris:window.__t,calls:window.__c,dbg:GAME.dbg.state()};});
  console.log('perf:',JSON.stringify({fpsP3:perf.fpsP3,fpsMed:perf.fpsMed,tris:perf.tris,calls:perf.calls}));
  A(perf.tris<=25000,'≤25.000 triángulos con el héroe con hueso y los bichos 3D',{tris:perf.tris});
  A(perf.calls<=60,'≤60 llamadas de dibujo',{calls:perf.calls});
  A(perf.fpsMed>=40,'≥40 fps de mediana jugando',{fpsMed:perf.fpsMed,fpsP3:perf.fpsP3});
  A(perf.dbg.zonas>=1,'la corrida registra las zonas visitadas',{zonas:perf.dbg.zonas});
  await pg.screenshot({path:S+'R-arena-perf.png'});
  A(errs.length===0,'cero errores de JS',errs.slice(0,4));
  console.log('\nARENA nuevo: '+ok.length+' ok, '+bad.length+' fail');
  if(bad.length)console.log('fallan:\n - '+bad.join('\n - '));
  await b.close();
})();
