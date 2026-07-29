/* HYPER SANDBOX — suite: arranque, mapas, personaje, armas, física, props, herramientas y UI */
const { chromium } = require('./node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  OK  ':'  XX  ')+m);};
const S='/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader',
          '--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:900,height:460}});
  const pg=await ctx.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  const clean=()=>errs.filter(e=>!/404|Failed to load|decode audio/i.test(e));
  await pg.goto('http://127.0.0.1:8951/hyper-test.html?dev&local',{waitUntil:'load'});
  for(let i=0;i<40;i++){await sleep(500);if(await pg.evaluate(()=>typeof window.__H!=='undefined'))break;}
  ok(await pg.evaluate(()=>typeof window.__H!=='undefined'),'el motor arranca');
  for(let i=0;i<30;i++){await sleep(400);
    if(await pg.evaluate(()=>['lang','title'].includes(window.__H.app())))break;}
  ok(clean().length===0,'sin errores JS al cargar'+(clean()[0]?': '+clean()[0].slice(0,140):''));

  /* ---------- contenido: secciones, props y mapas ---------- */
  const secs=await pg.evaluate(()=>window.__H.sections());
  const nprops=await pg.evaluate(()=>window.__H.propCount());
  console.log('   secciones:',secs.map(s=>s.name+'('+s.n+')').join(' '));
  ok(nprops>=240,'hay '+nprops+' props distintos (pedidos: más de 240)');
  ok(secs.length>=9,'repartidos en '+secs.length+' secciones');
  ok(secs.some(s=>s.tab==='veh')&&secs.some(s=>s.tab==='ent'),'con pestañas de Vehículos y Entidades');
  const maps=await pg.evaluate(()=>window.__H.maps());
  ok(maps.includes('construct'),'está el mapa Construct de Garry\'s Mod ('+maps.join(', ')+')');
  ok(maps.length>=4,'y '+maps.length+' mapas en total');

  const CRATE=await pg.evaluate(()=>{
    const ids=window.__H.propIds();
    const crate=ids.map(i=>[i,window.__H.defInfo(i)])
      .filter(x=>x[1]&&/crate|box/i.test(x[1].name+x[0])&&x[1].mass>=20&&x[1].mass<=150)
      .sort((a,b)=>a[1].mass-b[1].mass);
    return (crate[0]&&crate[0][0])||ids[0];});
  const LIGHT=await pg.evaluate(()=>{
    /* prop cúbico y liviano: lo puede levantar un globo */
    const best=window.__H.propIds().map(i=>[i,window.__H.defInfo(i)])
      .filter(x=>{const d=x[1];if(!d)return false;
        const M=Math.max.apply(null,d.size),m=Math.min.apply(null,d.size);
        return d.mass<=18&&M<=1.9&&m>=0.6&&M/m<=1.7;})
      .sort((a,b)=>b[1].mass-a[1].mass);
    return (best[0]&&best[0][0])||window.__H.propIds()[0];});
  await pg.evaluate(a=>{window.CRATE=a[0];window.LIGHT=a[1];},[CRATE,LIGHT]);
  console.log('   props de prueba:',CRATE,'/',LIGHT);

  /* ---------- menús ---------- */
  ok(await pg.evaluate(()=>!document.getElementById('sLang').classList.contains('hide'))
     ||await pg.evaluate(()=>window.__H.app()==='title'),'primero pide idioma');
  await pg.evaluate(()=>document.querySelector('#sLang [data-lang="es"]').click()).catch(()=>{});
  await sleep(350);
  const qb=await pg.evaluate(()=>({sel:['qUld','qLow','qHigh'].map(i=>
    document.getElementById(i).classList.contains('on')),ok:document.getElementById('qOk').textContent}));
  ok(qb.sel[0]&&!qb.sel[1]&&!qb.sel[2],'ULD viene marcado por defecto');
  ok(/OK/.test(qb.ok),'y se confirma con OK');
  await pg.evaluate(()=>document.getElementById('qOk').click());await sleep(450);
  ok(await pg.evaluate(()=>window.__H.app())==='title','llega al título');
  await pg.evaluate(()=>document.getElementById('bPlay').click());await sleep(400);
  const ml=await pg.evaluate(()=>[...document.querySelectorAll('.mapit')].map(b=>b.dataset.map));
  ok(ml.length===maps.length,'el selector de mapa muestra los '+ml.length+' mapas');
  await pg.evaluate(m=>{window.__H.setMap(m);},maps.includes('construct')?'construct':maps[0]);
  await pg.evaluate(()=>document.getElementById('mPlay').click());
  await sleep(2600);
  ok(await pg.evaluate(()=>window.__H.app())==='play','entra a jugar');

  /* ---------- mapa construct ---------- */
  const mi=await pg.evaluate(()=>window.__H.mapInfo());
  console.log('   construct:',JSON.stringify(mi));
  ok(mi.id==='construct'&&mi.parts>=200,'Construct tiene '+mi.parts+' piezas de geometría');
  ok(mi.bodies>=150,'y '+mi.bodies+' cuerpos estáticos con colisión');
  ok(mi.water>=1,'con pileta de agua');
  ok(mi.spawns>=2,'y '+mi.spawns+' puntos de aparición');

  /* ---------- personaje ---------- */
  const ch=await pg.evaluate(()=>window.__H.char());
  ok(ch.loaded,'el personaje 3D generado carga');
  ok(ch.anim,'con su animación de caminar');
  ok(ch.bones.includes('rHand')&&ch.bones.includes('spine'),
     'y esqueleto usable ('+ch.bones.join(',')+')');

  /* ---------- armas ---------- */
  const ws=await pg.evaluate(()=>window.__H.weapons());
  ok(ws.length>=13,'hay '+ws.length+' armas: '+ws.join(', '));
  const glbs=await pg.evaluate(async()=>{const out=[];
    for(const id of['physgun','pistol','revolver','smg','akm','shotgun','sniper','crossbow','rpg','bat','toolgun']){
      window.__H.equip(id);out.push([id,window.__H.weap().glb,window.__H.weap().model]);}
    return out;});
  const withGlb=glbs.filter(g=>g[1]).length;
  ok(withGlb>=10,withGlb+' armas usan su modelo 3D generado');
  ok(glbs.every(g=>g[2]),'y todas tienen modelo en la mano');
  const fp=await pg.evaluate(()=>{const a=window.__H.fp();const b=window.__H.toggleFP();
    const c=window.__H.toggleFP();return{a,b,c};});
  ok(fp.b===true&&fp.c===false,'el botón ◎ pasa a primera persona y vuelve');

  /* ---------- animaciones del personaje ---------- */
  const an=await pg.evaluate(()=>{
    const R={};R.clips=window.__H.anim().clips.slice().sort();
    window.__H.clear();window.__H.tp(0,1.4,20);
    window.__H.press('f',0);window.__H.press('run',0);window.__H.step(40);R.quieto=window.__H.anim().state;
    window.__H.press('f',1);window.__H.step(50);R.camina=window.__H.anim().state;
    window.__H.press('run',1);window.__H.step(70);R.corre=window.__H.anim().state;
    window.__H.press('run',0);window.__H.press('f',0);window.__H.step(30);
    window.__H.press('jump',1);window.__H.step(6);R.salta=window.__H.anim().state;
    window.__H.press('jump',0);window.__H.step(60);
    return R;});
  ok(an.clips.length>=4,'el personaje trae '+an.clips.length+' animaciones: '+an.clips.join(', '));
  ok(an.quieto==='idle','quieto usa la animación de reposo ('+an.quieto+')');
  ok(an.camina==='walk','caminando pasa a caminar ('+an.camina+')');
  ok(an.corre==='run','corriendo pasa a correr ('+an.corre+')');
  ok(an.salta==='jump','y al saltar usa la de salto ('+an.salta+')');
  const gr=await pg.evaluate(()=>{
    const R={};window.__H.equip('akm');
    window.__H.press('f',0);window.__H.press('run',0);window.__H.step(30);
    R.idle=window.__H.holdCheck();
    window.__H.press('f',1);window.__H.step(40);R.walk=window.__H.holdCheck();
    window.__H.press('run',1);window.__H.step(50);R.run=window.__H.holdCheck();
    window.__H.press('f',0);window.__H.press('run',0);window.__H.step(30);
    window.__H.equip('pistol');window.__H.step(10);R.pistol=window.__H.holdCheck();
    return R;});
  ok(gr.idle.parentIsHand&&gr.walk.parentIsHand,
     'el arma cuelga del hueso de la mano (no de un ancla fija)');
  ok(gr.idle.d<0.3&&gr.walk.d<0.3&&gr.run.d<0.3&&gr.pistol.d<0.3,
     'y queda pegada a la mano en reposo/caminando/corriendo ('+
     [gr.idle.d,gr.walk.d,gr.run.d,gr.pistol.d].join(' / ')+' m)');
  ok(gr.idle.aim>.85&&gr.walk.aim>.85,'el caño siempre apunta adelante ('+gr.walk.aim+')');
  const up=await pg.evaluate(()=>{const a=window.__H.anim();
    window.__H.press('f',1);window.__H.step(40);const b=window.__H.anim();
    window.__H.press('f',0);window.__H.step(20);
    return{tracks:a.tracks,upIdle:a.upper,upWalk:b.upper};});
  ok(up.tracks.walk&&up.tracks.walk[0]>0&&up.tracks.walk[1]>0,
     'cada clip se parte en tren inferior y superior ('+JSON.stringify(up.tracks.walk)+' pistas)');
  ok(up.upWalk.indexOf('idle')>=0,
     'caminando, el torso sigue con la animación de reposo (brazos sosteniendo el arma)');

  /* ---------- botones de cámara y mira ---------- */
  const cam=await pg.evaluate(()=>{
    const R={};R.fp0=window.__H.fp();
    document.getElementById('bCam').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    document.getElementById('bCam').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    R.fp1=window.__H.fp();
    document.getElementById('bCam').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    document.getElementById('bCam').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    R.fp2=window.__H.fp();
    window.__H.equip('physgun');
    document.getElementById('bAim').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    document.getElementById('bAim').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    R.aimPhys=window.__H.zoom?window.__H.zoom():null;R.fpPhys=window.__H.fp();
    window.__H.equip('sniper');
    document.getElementById('bAim').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    document.getElementById('bAim').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    R.fpAim=window.__H.fp();R.fov=window.__H.fov?window.__H.fov():null;
    return R;});
  ok(cam.fp1!==cam.fp0&&cam.fp2===cam.fp0,'📷 cambia entre primera y tercera persona');
  ok(cam.fpAim===true&&cam.fov&&cam.fov<70,'◎ apunta con el arma (fov '+cam.fov+') y entra en 1ª persona');

  /* ---------- disparar ---------- */
  const sh=await pg.evaluate(()=>{
    window.__H.clear();window.__H.equip('pistol');
    window.__H.tp(4,1.6,10);window.__H.spawn(window.LIGHT,4,1.2,4);
    window.__H.step(40);window.__H.aimAt(0);
    const before=window.__H.bodyOf(0);
    const a0=window.__H.weap().ammo;
    const a1=window.__H.fire(1);
    window.__H.step(40);
    const after=window.__H.bodyOf(0);
    return{a0,a1,moved:Math.hypot(after.x-before.x,after.z-before.z),before,after};});
  ok(sh.a1===sh.a0-1,'la pistola gasta munición ('+sh.a0+' → '+sh.a1+')');
  ok(sh.moved>0.05,'y el balazo empuja el prop ('+sh.moved.toFixed(2)+' m)');
  const rl=await pg.evaluate(async()=>{window.__H.equip('revolver');
    for(let i=0;i<6;i++)window.__H.fire(1);
    const empty=window.__H.weap().ammo;
    await new Promise(r=>setTimeout(r,1400));
    return{empty,full:window.__H.weap().ammo};});
  ok(rl.empty===0&&rl.full>0,'al vaciarse recarga sola ('+rl.empty+' → '+rl.full+')');

  /* ---------- explosión (RPG) ---------- */
  const ex=await pg.evaluate(()=>{
    window.__H.clear();
    for(let i=0;i<6;i++)window.__H.spawn(window.LIGHT,-4+i*1.7,1.2,0);
    window.__H.step(90);
    const a=[0,1,2,3,4,5].map(i=>window.__H.bodyOf(i));
    window.__H.explodeAt(0,.6,0,9);
    window.__H.step(24);
    const b=[0,1,2,3,4,5].map(i=>window.__H.bodyOf(i));
    return{n:window.__H.props(),y0:a.map(p=>p?p.y:0),y1:b.map(p=>p?p.y:0),
      up:b.filter((p,i)=>p&&a[i]&&p.y>a[i].y+.3).length};});
  ok(ex.n===6,'se ponen 6 cajas para volar ('+ex.n+')');
  ok(ex.up>=4,'y una explosión levanta '+ex.up+' de 6 (y '+ex.y0.map(v=>v.toFixed(1)).join(',')
     +' → '+ex.y1.map(v=>v.toFixed(1)).join(',')+')');

  /* ---------- physgun ---------- */
  const pg2=await pg.evaluate(()=>{
    window.__H.clear();window.__H.equip('physgun');
    window.__H.tp(0,1.6,8);window.__H.spawn(window.CRATE,0,1,3);window.__H.step(40);
    window.__H.aimAt(0);
    window.__H.press('fire',true);window.__H.step(2);
    const g=window.__H.grabbed();
    window.__H.look(window.__H.aim()?0:0,.55);
    window.__H.step(80);
    const up=window.__H.bodyOf(0).y;
    window.__H.press('fire',false);window.__H.step(2);
    const keep=window.__H.grabbed();
    /* CONTRATO NUEVO (core_q): la physgun es por TAP, no por mantener. Levantar el dedo NO
       suelta; hay que dar otro toque (o el botón de lanzar del panel). Antes este assert
       esperaba rel===-1 al levantar el dedo, que es justo lo que el usuario pidió cambiar. */
    window.__H.press('fire',true);window.__H.step(2);window.__H.press('fire',false);
    window.__H.step(2);
    return{g,up,keep,rel:window.__H.grabbed()};});
  ok(pg2.g===0,'la physgun agarra el prop apuntado');
  ok(pg2.up>2.2,'y lo levanta mirando hacia arriba (y='+pg2.up.toFixed(2)+')');
  ok(pg2.keep===0&&pg2.rel===-1,'agarra por tap: al levantar el dedo sigue agarrado y el 2º tap lo suelta');
  const fz=await pg.evaluate(()=>{const a=window.__H.freeze(0);window.__H.step(120);
    const b=window.__H.bodyOf(0);return{a,y:b.y,frozen:b.frozen,type:b.type};});
  ok(fz.frozen===true&&fz.type===2,'congelar lo deja estático en el aire (y='+fz.y+')');
  ok(await pg.evaluate(()=>window.__H.unfreezeAll())>=1,'descongelar todo lo devuelve a la física');

  /* ---------- herramientas del toolgun ---------- */
  const tl=await pg.evaluate(()=>{
    const R={};
    // soldar
    window.__H.clear();window.__H.tp(0,1.6,8);
    window.__H.spawn(window.CRATE,-1.3,1.2,3.4);window.__H.spawn(window.CRATE,1.3,1.2,3.4);
    window.__H.step(50);window.__H.tool(1);
    for(const i of[1,0]){window.__H.aimAt(i);window.__H.press('fire',true);window.__H.step(2);
      window.__H.press('fire',false);window.__H.step(2);}
    R.welds=window.__H.welds();
    // duplicar
    window.__H.clear();window.__H.spawn(window.CRATE,0,1.2,3.4);window.__H.step(40);
    window.__H.tool(3);window.__H.aimAt(0);
    window.__H.press('fire',true);window.__H.step(2);window.__H.press('fire',false);window.__H.step(2);
    R.dup=window.__H.props();
    // globo
    window.__H.clear();window.__H.spawn(window.LIGHT,0,1.2,3.4);window.__H.step(50);
    window.__H.tool(4);window.__H.aimAt(0);
    R.aim=window.__H.aim();
    window.__H.press('fire',true);window.__H.step(2);window.__H.press('fire',false);window.__H.step(2);
    R.bal=window.__H.balloons();
    R.y0=window.__H.bodyOf(0).y;window.__H.step(300);R.y1=window.__H.bodyOf(0).y;
    // borrar
    window.__H.tool(2);R.n0=window.__H.props();window.__H.aimAt(0);
    window.__H.press('fire',true);window.__H.step(2);window.__H.press('fire',false);
    R.n1=window.__H.props();
    return R;});
  ok(tl.welds===1,'SOLDAR une dos props');
  ok(tl.dup===2,'DUPLICAR clona el prop apuntado ('+tl.dup+' props)');
  ok(tl.bal===1,'GLOBO ata un globo con cuerda al prop (mira: '+JSON.stringify(tl.aim)+')');
  ok(tl.y1>tl.y0+.5,'y el globo lo levanta del piso ('+tl.y0.toFixed(2)+' → '+tl.y1.toFixed(2)+')');
  ok(tl.n1===tl.n0-1,'BORRAR quita el prop apuntado ('+tl.n0+' → '+tl.n1+')');

  /* ---------- entidades que hacen cosas ---------- */
  const ent=await pg.evaluate(()=>{
    const R={};
    window.__H.clear();window.__H.spawn('t_balloon',0,3.4,3);window.__H.step(160);
    R.bal=window.__H.bodyOf(0)?window.__H.bodyOf(0).y:0;
    window.__H.clear();window.__H.tp(0,1.6,10);
    window.__H.spawn('t_barrel_exp',0,1.2,3);
    for(let i=0;i<4;i++)window.__H.spawn(window.LIGHT,-2.6+i*1.7,1.2,3);
    window.__H.step(60);
    R.n0=window.__H.props();
    R.y0=[1,2,3,4].map(i=>window.__H.bodyOf(i)).filter(Boolean).map(b=>b.y);
    window.__H.equip('pistol');
    for(let i=0;i<5;i++){window.__H.aimAt(0);window.__H.fire(1);window.__H.step(2);
      if(window.__H.props()<R.n0)break;}
    R.n1=window.__H.props();
    /* seguimos la altura máxima que alcanzan (el pico dura poco) */
    R.y1=[0,1,2,3].map(i=>{const b=window.__H.bodyOf(i);return b?b.y:0;});
    for(let k=0;k<10;k++){window.__H.step(4);
      for(let i=0;i<4;i++){const b=window.__H.bodyOf(i);if(b&&b.y>R.y1[i])R.y1[i]=b.y;}}
    window.__H.clear();window.__H.hurt(40);const h0=window.__H.hp();
    window.__H.tp(0,1.6,4);window.__H.spawn('t_medkit',0,1.2,3.4);window.__H.step(40);
    R.heal=[h0,window.__H.hp()];
    return R;});
  ok(ent.bal>4,'el GLOBO (entidad) flota solo hasta y='+ent.bal.toFixed(1));
  ok(ent.n1<ent.n0,'al balearle al BARRIL EXPLOSIVO explota y desaparece ('+ent.n0+' → '+ent.n1+')');
  ok(Math.max.apply(null,ent.y1)>Math.max.apply(null,ent.y0)+.5,
     'y la explosión manda las cajas de al lado por el aire ('+
     Math.max.apply(null,ent.y0).toFixed(1)+' → '+Math.max.apply(null,ent.y1).toFixed(1)+')');
  ok(ent.heal[1]>ent.heal[0],'el BOTIQUÍN cura al tocarlo ('+ent.heal[0]+' → '+ent.heal[1]+')');

  /* ---------- todos los props se pueden spawnear ---------- */
  const all=await pg.evaluate(()=>{
    window.__H.clear();window.__H.setOpt('maxProps',9999);
    const ids=window.__H.propIds();
    let bad=[],big=[],small=[],okc=0;
    for(const id of ids){
      const d=window.__H.defInfo(id);
      if(!d){bad.push(id);continue;}
      const M=Math.max.apply(null,d.size);
      if(M>21)big.push(id+':'+M.toFixed(1));
      if(M<0.14)small.push(id+':'+M.toFixed(2));
      okc++;
    }
    let spawned=0;
    for(let i=0;i<ids.length;i++)if(window.__H.spawn(ids[i],(i%22)*3-32,3+((i*7)%40),Math.floor(i/22)*3-30))spawned++;
    window.__H.step(30);
    return{n:ids.length,okc,bad,big,small,spawned,info:window.__H.info()};});
  ok(all.bad.length===0,'todos los props se construyen sin fallar');
  ok(all.big.length===0,'ninguno queda gigante'+(all.big.length?': '+all.big.slice(0,4).join(' '):''));
  ok(all.small.length===0,'ninguno queda microscópico'+(all.small.length?': '+all.small.slice(0,4).join(' '):''));
  ok(all.spawned>=all.n*0.98,'se spawnearon '+all.spawned+'/'+all.n+' props a la vez');
  console.log('   con todos en el mundo:',JSON.stringify(all.info));
  ok(all.info.calls<Math.max(90,all.info.pools*1.6),'y el dibujado queda en '+all.info.calls+
     ' draw calls para '+all.info.pools+' tipos (instancing)');

  /* ---------- límite y auto-congelado ---------- */
  const bud=await pg.evaluate(()=>{
    const frozen=(()=>{let f=0;for(let i=0;i<window.__H.props();i++){
      const b=window.__H.bodyOf(i);if(b&&b.frozen)f++;}return f;})();
    return{props:window.__H.props(),frozen,awake:window.__H.info().awake};});
  ok(bud.frozen>bud.props*0.5,'el auto-congelado deja sólo '+(bud.props-bud.frozen)+
     ' props activos de '+bud.props+' (presupuesto '+bud.awake+')');
  const lim=await pg.evaluate(()=>{window.__H.clear();window.__H.setOpt('maxProps',60);
    for(let i=0;i<90;i++)window.__H.spawn(window.CRATE,(i%6)*1.5-4,3+i*.3,0);
    const n=window.__H.props();window.__H.setOpt('maxProps',9999);return n;});
  ok(lim<=60,'respeta el límite de props configurado ('+lim+'/60)');
  ok(await pg.evaluate(()=>window.__H.setOpt('maxProps',9999))===9999,'y se puede subir a 9999');

  /* ---------- guardar / cargar ---------- */
  const sv=await pg.evaluate(()=>{window.__H.clear();
    window.__H.spawn(window.CRATE,2,1,2);window.__H.spawn(window.CRATE,3,1,2,true);
    window.__H.step(30);window.__H.save();
    const n0=window.__H.props();window.__H.clear();
    const mid=window.__H.props();window.__H.load();
    return{n0,mid,n1:window.__H.props(),frozen:window.__H.bodyOf(1)&&window.__H.bodyOf(1).frozen};});
  ok(sv.mid===0&&sv.n1===sv.n0,'Salvar y cargar devuelve los props ('+sv.n0+')');

  /* ---------- ajustes ---------- */
  const op=await pg.evaluate(()=>{const a=window.__H.setOpt('desc',false);
    const b=window.__H.setOpt('fpsm',false);const c=window.__H.setOpt('sens',1.8);
    window.__H.setOpt('desc',true);window.__H.setOpt('fpsm',true);
    return{a,b,c,now:window.__H.opts()};});
  ok(op.a===false&&op.b===false&&op.c===1.8,'los ajustes (Describir, Fps meter, Sensibilidad) responden');

  /* ---------- menú de spawn ---------- */
  const ui=await pg.evaluate(()=>{window.__H.openSpawn();const u=window.__H.spawnUI();
    window.__H.drainThumbs(50);return u;});
  /* 6 y no 5: se agregó la pestaña de EXPERIMENTOS (core_u), que es una función pedida por el
     usuario. El assert viejo afirmaba el estado anterior del juego, no una regla. */
  ok(ui.open&&ui.tabs.length===6,'el menú de spawn abre con 6 pestañas ('+ui.tabs.join(', ')+')');
  ok(ui.folders.length>=7,'y '+ui.folders.length+' carpetas: '+ui.folders.slice(0,8).join(', '));
  ok(ui.items>=20,'con '+ui.items+' props en la carpeta abierta');
  const arm=await pg.evaluate(()=>{window.__H.openSpawn('arm');return window.__H.spawnUI().items;});
  ok(arm>=13,'la pestaña Armas lista '+arm+' armas');
  const too=await pg.evaluate(()=>{window.__H.openSpawn('tool');const n=window.__H.spawnUI().items;
    window.__H.closeSpawn();return n;});
  ok(too>=8,'y la de Herramientas '+too+' herramientas');
  const cl=await pg.evaluate(()=>{window.__H.clear();window.__H.openSpawn('acc');
    const n=window.__H.clickItem(0);window.__H.closeSpawn();return n;});
  ok(cl===1,'al tocar un prop del menú aparece en el mundo');

  /* ---------- vida y ragdoll ---------- */
  const hp=await pg.evaluate(()=>{const h0=window.__H.hp();const a=window.__H.hurt(30);const r=window.__H.ragdoll(true);
    const b=window.__H.rag();window.__H.ragdoll(false);return{h0,a,r,b,off:window.__H.rag()};});
  ok(hp.a===hp.h0-30,'la barra de vida baja al recibir daño ('+hp.h0+' → '+hp.a+')');
  ok(hp.b===true&&hp.off===false,'el botón 🧍 activa y desactiva el ragdoll');

  /* ---------- rotación forzada a horizontal ---------- */
  await pg.setViewportSize({width:420,height:860});await sleep(500);
  const rot=await pg.evaluate(()=>{const s=document.getElementById('stage');
    return{tr:s.style.transform,w:s.style.width,rotMsg:!!document.getElementById('rot')};});
  ok(/rotate\(90deg\)/.test(rot.tr),'en pantalla vertical el juego ya sale rotado 90° ('+rot.tr+')');
  ok(!rot.rotMsg,'y no hay ningún cartel de "girá el teléfono"');
  await pg.setViewportSize({width:900,height:460});await sleep(400);

  /* ---------- capturas ---------- */
  await pg.evaluate(()=>{window.__H.clear();window.__H.setOpt('hideui',false);
    const ids=window.__H.propIds();
    for(let i=0;i<10;i++)window.__H.spawn(ids[(i*17)%ids.length],-6+i*1.6,2+i*.6,-6);
    window.__H.step(120);});
  await sleep(600);await pg.screenshot({path:S+'hs-play.png'});
  await pg.evaluate(()=>{window.__H.openSpawn('acc');window.__H.drainThumbs(60);});
  await sleep(700);await pg.screenshot({path:S+'hs-spawn.png'});
  await pg.evaluate(()=>{window.__H.closeSpawn();window.__H.pause();});
  await sleep(500);await pg.screenshot({path:S+'hs-pause.png'});
  await pg.evaluate(()=>{window.__H.pause();});

  /* ---------- agarre con las DOS manos ----------
     __H.lhand() mide en metros la distancia del hueso de la mano IZQUIERDA al eje del
     arma (el caño): si el personaje la agarra de verdad, tiene que ser de centímetros. */
  const g2=await pg.evaluate(()=>{
    const H=window.__H,R={};
    if(H.fp())H.toggleFP();          // el test de la mira dejó la 1ª persona activada
    H.clear();H.press('f',0);H.press('run',0);H.press('jump',0);
    H.tp(0,1.4,20);H.equip('akm');H.step(40);
    R.idle=[H.holdCheck(),H.lhand()];
    H.press('f',1);H.step(40);R.walk=[H.holdCheck(),H.lhand()];
    H.press('run',1);H.step(50);R.run=[H.holdCheck(),H.lhand()];
    H.press('run',0);H.press('f',0);H.step(40);
    H.press('jump',1);H.step(8);
    R.jump=[H.holdCheck(),H.lhand(),H.anim().state];
    H.press('jump',0);H.step(80);
    R.all=H.lhandAll();                 // todas las armas, en reposo
    return R;});
  ok(g2.jump[2]==='jump'&&g2.jump[0].parentIsHand&&g2.jump[0].d<0.3&&g2.jump[0].aim>0.85,
     'saltando el arma sigue en la mano y el caño adelante (d '+g2.jump[0].d+
     ' m, aim '+g2.jump[0].aim+')');
  ok(g2.idle[1]<0.12&&g2.walk[1]<0.12&&g2.run[1]<0.12&&g2.jump[1]<0.12,
     'la mano izquierda no se despega del eje del arma en las 4 animaciones ('+
     [g2.idle[1],g2.walk[1],g2.run[1],g2.jump[1]].join(' / ')+' m)');
  const gk=Object.keys(g2.all),gw=gk.slice().sort((a,b)=>g2.all[b]-g2.all[a])[0];
  ok(gk.length>=11&&gk.every(k=>g2.all[k]!=null&&g2.all[k]<0.12),
     'y agarra con las dos manos las '+gk.length+' armas con modelo (la peor: '+gw+' '+
     g2.all[gw]+' m)');

  /* ---- iconos generados en los botones ---- */
  const ic=await pg.evaluate(()=>window.__H.icons());
  ok(ic.img.length===11,'los 11 botones del HUD muestran el icono generado ('+
     ic.img.length+'/11: '+ic.img.join(' ')+')');
  ok(ic.heart&&ic.ok>=12,'y la barra de vida usa el corazón generado ('+ic.ok+' imágenes)');
  ok(await pg.evaluate(()=>window.__H.charLit()),'el personaje se aclara para no quedar negro de espaldas');

  /* ---- capa de iconos por CSS: HUD, palanca, vehículo y menú de spawn (core_i.js) ---- */
  const gi=await pg.evaluate(()=>window.__H.gicons());
  ok(gi.on&&gi.ok===gi.total,'la capa de iconos generados quedó encendida: body.gicons con '+
     gi.ok+'/'+gi.total+' imágenes'+(gi.bad.length?' (fallaron: '+gi.bad.join(' ')+')':''));
  ok(gi.hud.length>=8,gi.hud.length+' botones del HUD dibujan su icono en un .ic con '+
     'background-image'+(gi.emoji.length?' (quedaron con emoji: '+gi.emoji.join(' ')+')':''));

  const rest=clean();
  ok(rest.length===0,'sin errores JS al final'+(rest[0]?': '+rest[0].slice(0,150):''));
  console.log('\n== '+pass+' OK / '+fail+' XX ==');
  await b.close();process.exit(fail?1:0);
})().catch(e=>{console.error('FATAL',e&&e.message);process.exit(2)});
