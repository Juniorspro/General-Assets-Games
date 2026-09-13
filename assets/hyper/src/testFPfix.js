/* REGRESION del arreglo de la DEFORMACION y de la MUÑECA BAJA
   1) las pistas de escala de los clips ya no encogen el esqueleto (largos de hueso constantes)
   2) el IK del brazo nunca se satura (need < reach) saltando y corriendo
   3) los pies quedan apoyados en 3a persona (antes flotaban hasta 77 cm)
   4) la muñeca y la empuñadura ya no quedan debajo del borde de abajo
   5) el congelado sigue en pie y no hay errores JS */
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
  await pg.evaluate(()=>{window.__H.tp(0,2,60);window.__H.look(Math.PI,0);});await sleep(1300);
  const key=(c,d)=>pg.evaluate(o=>window.dispatchEvent(new KeyboardEvent(o.d?'keydown':'keyup',{code:o.c})),{c,d});

  /* --- 0) las pistas de escala existen (o sea: el problema era real) --- */
  const tr=await pg.evaluate(()=>window.__H.ztracks());
  const nsc=Object.keys(tr).reduce((s,k)=>s+tr[k].length,0);
  A(nsc>0,'los clips traen pistas de ESCALA de huesos (la causa de la deformacion)',
    {clips:Object.keys(tr).length,pistas:nsc});
  const z=await pg.evaluate(()=>window.__H.zsc());
  A(z.on===1&&z.huesos>0&&z.conRef===z.huesos,'la escala del esqueleto esta CLAVADA con la del clip de reposo',z);

  /* --- 1) 1a persona: 20 s saltando/corriendo --- */
  await pg.evaluate(()=>{if(!window.__H.fp())window.__H.toggleFP();});await sleep(700);
  await pg.evaluate(()=>window.__H.equip('akm'));await sleep(1200);
  await pg.evaluate(()=>{const H=window.__H;const D=window.__D={f:[]};
    (function loop(){const zb=H.zbones(),d=H.fpDiag(),s=H.fpScreen(),fz=H.fpFrz();
      D.f.push({rLo:zb.seg.rLo,lLo:zb.seg.lLo,reach:zb.reach,need:d?d.needR:null,
        hy:s.rHand?s.rHand.y:null,ay:s.arma?s.arma.y:null,drift:fz?fz.drift:null});
      requestAnimationFrame(loop);})();});
  await key('KeyW',1);await key('ShiftLeft',1);
  for(let i=0;i<7;i++){await key('Space',1);await sleep(130);await key('Space',0);await sleep(2100);}
  await key('KeyW',0);await key('ShiftLeft',0);await sleep(1200);
  await pg.screenshot({path:S+'F2-fp-akm.png'});
  const r=await pg.evaluate(()=>{const f=window.__D.f;
    const col=k=>f.map(x=>x[k]).filter(v=>v!=null);
    const rg=k=>{const a=col(k);return {min:+Math.min.apply(null,a).toFixed(4),max:+Math.max.apply(null,a).toFixed(4)};};
    return {n:f.length,rLo:rg('rLo'),lLo:rg('lLo'),reach:rg('reach'),need:rg('need'),
      hy:rg('hy'),ay:rg('ay'),drift:rg('drift'),
      sat:f.filter(x=>x.need!=null&&x.reach!=null&&x.need>x.reach).length};});
  console.log('1a persona:',JSON.stringify(r));
  A(r.rLo.max-r.rLo.min<.002&&r.lLo.max-r.lLo.min<.002,
    'los huesos del antebrazo NO cambian de largo (antes 3,4 cm de 22,4)',{rLo:r.rLo,lLo:r.lLo});
  A(r.reach.max-r.reach.min<.002,'el alcance del brazo es constante (antes 0,451 a 0,531)',r.reach);
  A(r.sat===0,'el IK del brazo NUNCA se satura (antes 91,7% de los cuadros)',{sat:r.sat,de:r.n,need:r.need,reach:r.reach});
  A(r.hy.max>-1.0,'la muñeca ya NO queda debajo del borde de abajo',r.hy);
  A(r.ay.max>-1.05,'la empuñadura sube al borde (se ve la mano agarrando)',r.ay);
  A(r.drift.max===0,'el congelado de la raiz sigue en pie',r.drift);

  /* --- 2) 3a persona: pies apoyados --- */
  await pg.evaluate(()=>{if(window.__H.fp())window.__H.toggleFP();});await sleep(800);
  const feet=async(ms)=>{let mn=99,mx=-99;const t0=Date.now();
    while(Date.now()-t0<ms){const f=await pg.evaluate(()=>window.__H.zfeet());
      if(f&&f.sobresale!=null){if(f.sobresale<mn)mn=f.sobresale;if(f.sobresale>mx)mx=f.sobresale;}
      await sleep(60);}
    return {min:+mn.toFixed(3),max:+mx.toFixed(3)};};
  await key('KeyW',1);await sleep(1800);
  const fw=await feet(1800);
  await key('ShiftLeft',1);await sleep(1500);
  const fr=await feet(1800);
  await pg.screenshot({path:S+'F2-tp-run.png'});
  await key('KeyW',0);await key('ShiftLeft',0);await sleep(900);
  console.log('pies caminando:',JSON.stringify(fw),' corriendo:',JSON.stringify(fr));
  A(Math.abs(fw.max)<.25&&Math.abs(fw.min)<.25,'caminando los pies quedan apoyados (antes flotaban 77 cm)',fw);
  A(Math.abs(fr.max)<.25&&Math.abs(fr.min)<.25,'corriendo los pies quedan apoyados (antes 31 cm)',fr);
  A(errs.length===0,'cero errores de JS',errs.slice(0,3));
  console.log('\nRESULTADO: '+ok.length+' ok, '+bad.length+' fail');
  if(bad.length)console.log('fallan:\n - '+bad.join('\n - '));
  await b.close();
})();
