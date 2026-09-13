/* AGARRE DE sux18 CONGELADO + BALANCEO PROCEDURAL: medicion propia
   1) el viewmodel de manos esta apagado y vuelve el agarre real (arma en la mano, brazos del personaje)
   2) CONGELADO: la raiz del esqueleto no se mueve en 1a persona (drift 0) y el arma deja de bailar
   3) BALANCEO: presente, acotado y proporcional (quieto < caminando < corriendo)
   4) capturas por arma y por angulo, sin errores de JS */
const { chromium } = require('./node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const S='/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/';
const ok=[],bad=[];
const A=(c,m,x)=>{(c?ok:bad).push(m);console.log((c?'ok  ':'FAIL')+' '+m+(x!==undefined?' '+JSON.stringify(x):''));};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const pg=await (await b.newContext({viewport:{width:900,height:430}})).newPage();
  const errs=[];pg.on('pageerror',e=>{const t=String(e.message);if(!/decode audio/.test(t))errs.push(t.slice(0,160));});
  await pg.goto('http://127.0.0.1:8951/hyper-test.html?dev&local',{waitUntil:'load'});
  for(let i=0;i<40;i++){await sleep(500);if(await pg.evaluate(()=>window.__H&&window.__H.app()!=='load'))break;}
  await pg.mouse.click(450,215);
  await pg.evaluate(()=>window.__H.play());await sleep(2200);
  await pg.evaluate(()=>{window.__H.tp(0,2,60);window.__H.look(Math.PI,0);});await sleep(1200);
  await pg.evaluate(()=>{if(!window.__H.fp())window.__H.toggleFP();});await sleep(900);

  /* ---- 1) el viewmodel esta apagado y el arma cuelga de la mano de verdad ---- */
  const st=await pg.evaluate(()=>{const H=window.__H;
    return {vm:H.vmOn?H.vmOn():null, vmInfo:H.vmInfo?!!(H.vmInfo()&&H.vmInfo().on):null,
            frz:H.fpFrz(), sway:H.fpSway(), fp:H.fp(), scr:H.fpScreen()};});
  console.log('estado:',JSON.stringify(st));
  A(st.vm===0,'viewmodel de manos APAGADO (VMC.on)',{vm:st.vm});
  A(st.frz.active===true&&st.frz.ref===1,'congelado ACTIVO con pose de referencia',st.frz);
  A(st.frz.got===1,'referencia sacada del CLIP (determinista)',{got:st.frz.got});
  A(st.scr&&st.scr.arma&&st.scr.arma.x>.15&&st.scr.arma.x<1.2&&st.scr.arma.z>0&&st.scr.arma.z<1,
    'la empuñadura del arma cae en la esquina de abajo a la derecha, delante de la cámara',st.scr&&st.scr.arma);

  /* ---- medidor: NDC pico a pico de arma y mano derecha en N frames ---- */
  const meas=(n)=>pg.evaluate(nn=>new Promise(res=>{
    const ax=[],ay=[],hx=[],hy=[],dr=[];let i=0;
    (function loop(){const s=window.__H.fpScreen(),f=window.__H.fpFrz();
      if(s.arma){ax.push(s.arma.x);ay.push(s.arma.y);}
      if(s.rHand){hx.push(s.rHand.x);hy.push(s.rHand.y);}
      if(f&&f.drift!=null)dr.push(f.drift);
      if(++i<nn)requestAnimationFrame(loop);
      else{const p=a=>a.length?+(Math.max.apply(null,a)-Math.min.apply(null,a)).toFixed(4):null;
        res({aX:p(ax),aY:p(ay),hX:p(hx),hY:p(hy),drift:dr.length?+Math.max.apply(null,dr).toFixed(5):null,n:i});}
    })();}),n);
  const key=(c,d)=>pg.evaluate(o=>{window.dispatchEvent(new KeyboardEvent(o.d?'keydown':'keyup',{code:o.c}));},{c,d});

  /* ---- 2) quieto ---- */
  const mIdle=await meas(150);
  console.log('quieto      :',JSON.stringify(mIdle));
  await pg.screenshot({path:S+'Z-idle.png'});

  /* ---- 3) caminando ---- */
  await key('KeyW',1);await sleep(1500);
  const mWalk=await meas(180);
  console.log('caminando   :',JSON.stringify(mWalk));
  await pg.screenshot({path:S+'Z-walk.png'});

  /* ---- 4) corriendo ---- */
  await key('ShiftLeft',1);await sleep(1500);
  const mRun=await meas(180);
  console.log('corriendo   :',JSON.stringify(mRun));
  await pg.screenshot({path:S+'Z-run.png'});

  /* ---- 5) A/B: lo mismo con el CONGELADO APAGADO (asi bailaba antes) ---- */
  await pg.evaluate(()=>window.__H.fpFrz(0));await sleep(1200);
  const mRunNF=await meas(180);
  console.log('corriendo sin congelar:',JSON.stringify(mRunNF));
  await pg.screenshot({path:S+'Z-run-nofrz.png'});
  await pg.evaluate(()=>window.__H.fpFrz(1));await sleep(800);

  /* ---- 6) balanceo apagado: el arma queda CLAVADA (prueba de que el vaiven es mio) ---- */
  await pg.evaluate(()=>window.__H.fpSwayOn(0));await sleep(900);
  const mRunNS=await meas(180);
  console.log('corriendo sin balanceo:',JSON.stringify(mRunNS));
  await pg.evaluate(()=>window.__H.fpSwayOn(1));await sleep(600);
  await key('ShiftLeft',0);await key('KeyW',0);await sleep(900);

  A(mRun.drift===0&&mWalk.drift===0,'la raiz NO se mueve en 1a persona (drift 0 caminando y corriendo)',
    {walk:mWalk.drift,run:mRun.drift});
  A(mRunNF.aY>mRun.aY*1.3,'congelar el esqueleto BAJA el baile del arma (sin congelar vs congelado)',
    {sinCongelar:mRunNF.aY,congelado:mRun.aY});
  A(mRunNS.aY<mRun.aY*.5&&mRunNS.aX<mRun.aX*.5,'con el balanceo apagado el arma queda clavada',
    {sinBalanceo:[mRunNS.aX,mRunNS.aY],con:[mRun.aX,mRun.aY]});
  A(mIdle.aY<mWalk.aY&&mWalk.aY<mRun.aY,'el balanceo crece: quieto < caminando < corriendo',
    {idle:mIdle.aY,walk:mWalk.aY,run:mRun.aY});
  A(mWalk.aX<.075&&mWalk.aY<.075,'caminando el balanceo es LEVE (< 0.075 NDC pico a pico)',{x:mWalk.aX,y:mWalk.aY});
  A(mRun.aX<.10&&mRun.aY<.10,'corriendo el balanceo queda acotado (< 0.10 NDC pico a pico)',{x:mRun.aX,y:mRun.aY});
  A(mIdle.aX>.0005||mIdle.aY>.0005,'quieto igual respira (balanceo de reposo presente)',mIdle);

  /* ---- 7) capturas por arma, y mirando arriba/abajo ---- */
  const arms=['akm','pistol','sniper','bat','hands','physgun','rpg','shotgun'];
  const dark=async()=>await pg.evaluate(()=>new Promise(res=>requestAnimationFrame(()=>{
    const c=document.querySelector('#wrap canvas');const cv=document.createElement('canvas');
    cv.width=180;cv.height=90;const g=cv.getContext('2d');g.drawImage(c,0,0,180,90);
    const d=g.getImageData(0,0,180,90).data;let dk=0,n=0;
    for(let i=0;i<d.length;i+=4){n++;const l=d[i]*.3+d[i+1]*.6+d[i+2]*.1;if(l<45)dk++;}
    res(+(dk/n).toFixed(3));})));
  /* piel/madera del conjunto por REGIONES del cuadro: centro (tiene que estar limpio, ahi va la
     mira) y esquina de abajo a la derecha (ahi tiene que estar el agarre) */
  const regions=async()=>await pg.evaluate(()=>new Promise(res=>requestAnimationFrame(()=>{
    const c=document.querySelector('#wrap canvas');const cv=document.createElement('canvas');
    cv.width=240;cv.height=120;const g=cv.getContext('2d');g.drawImage(c,0,0,240,120);
    const d=g.getImageData(0,0,240,120).data;
    let cN=0,cS=0,lN=0,lS=0;
    for(let y=0;y<120;y++)for(let x=0;x<240;x++){
      const i=(y*240+x)*4,r=d[i],gg=d[i+1],b=d[i+2];
      const skin=(r>85&&r>gg*1.12&&gg>b*1.02)||(r*.3+gg*.6+b*.1)<45;
      const fx=x/240,fy=y/120;
      if(fx>.33&&fx<.67&&fy>.10&&fy<.72){cN++;if(skin)cS++;}
      if(fx>.55&&fy>.55){lN++;if(skin)lS++;}
    }
    res({centro:+(cS/cN).toFixed(3),esquina:+(lS/lN).toFixed(3)});
  })));
  /* de vuelta al claro: despues de correr 9 s el jugador quedaba DENTRO de un edificio y todo
     el cuadro era una pared a 10 cm (por eso las regiones daban 0). Es la sonda, no el juego. */
  await pg.evaluate(()=>{window.__H.tp(0,2,60);window.__H.look(Math.PI,0);});await sleep(1500);
  const rep={};
  for(const w of arms){
    await pg.evaluate(id=>window.__H.equip(id),w);await sleep(800);
    await pg.evaluate(()=>window.__H.look(Math.PI,0));await sleep(400);
    const s0=await pg.evaluate(()=>window.__H.fpScreen());
    const rg=await regions();
    await pg.screenshot({path:S+'Z-'+w+'-fr.png'});
    await pg.evaluate(()=>window.__H.look(Math.PI,1.0));await sleep(450);
    const dUp=await dark();await pg.screenshot({path:S+'Z-'+w+'-up.png'});
    await pg.evaluate(()=>window.__H.look(Math.PI,-1.15));await sleep(450);
    const dDn=await dark();await pg.screenshot({path:S+'Z-'+w+'-dn.png'});
    await pg.evaluate(()=>window.__H.look(Math.PI,0));await sleep(300);
    rep[w]={hand:s0.rHand?[s0.rHand.x,s0.rHand.y]:null,lh:s0.lHand?[s0.lHand.x,s0.lHand.y]:null,
            centro:rg.centro,esquina:rg.esquina,dUp,dDn};
    console.log('  '+w+': '+JSON.stringify(rep[w]));
    A(rg.esquina>.02&&rg.centro<.09,'agarre en su esquina y centro del cuadro libre ('+w+')',rep[w]);
    if(w==='hands')A(rg.centro<.07,'los puños NO tapan el centro del cuadro',rep[w]);
  }

  /* ---- 8) sin errores ---- */
  A(errs.length===0,'cero errores de JS',errs.slice(0,4));
  console.log('\nRESULTADO: '+ok.length+' ok, '+bad.length+' fail');
  if(bad.length)console.log('fallan:\n - '+bad.join('\n - '));
  await b.close();
})();
