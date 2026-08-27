/* SONDA DE INTERFAZ con TOQUES REALES (no dispatchEvent al botón: eso tapaba el
   bug de que el canvas se comía el toque en pausa/fin/niveles/ajustes).
   uso: node _arcui.js <slug>
   Recorre: carga -> idioma -> TOCÁ PARA JUGAR -> menú -> ajustes (gráficos) ->
   niveles -> jugar -> pausa -> reintentar -> seguir -> menú, comprobando en cada
   paso QUÉ elemento recibe el toque y a qué pantalla se llega. */
const { chromium } = require('./node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const S='/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/';
const slug=process.argv[2]||'torre';
const ok=[],bad=[];
const A=(c,m,x)=>{(c?ok:bad).push(m);console.log((c?'ok  ':'FAIL')+' '+m+(x!==undefined?' '+JSON.stringify(x):''));};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  for(const [w,h,tag] of [[412,915,'celular'],[900,430,'apaisado']]){
    const pg=await (await b.newContext({viewport:{width:w,height:h},hasTouch:true})).newPage();
    const errs=[];
    pg.on('pageerror',e=>{const t=String(e.message);if(!/decode audio/.test(t))errs.push(t.slice(0,140));});
    await pg.goto('http://127.0.0.1:8951/arc-'+slug+'.html?local',{waitUntil:'load'});
    await sleep(4200);
    /* toque real sobre un id: devuelve quién recibió el toque y dónde quedó la app */
    const tap=async(id,waitMs)=>{
      const r=await pg.evaluate(i=>{const e=document.getElementById(i);if(!e)return null;
        const b=e.getBoundingClientRect();
        if(b.width<2||b.height<2)return{oculto:1};
        const cx=Math.round(b.left+b.width/2),cy=Math.round(b.top+b.height/2);
        const el=document.elementFromPoint(cx,cy);
        return{x:cx,y:cy,hit:el?(el.id||el.className||el.tagName):null};},id);
      if(!r||r.oculto)return{id,hit:null,scr:await pg.evaluate(()=>ARC.scr)};
      await pg.mouse.click(r.x,r.y);
      await sleep(waitMs||650);
      return{id,hit:r.hit,scr:await pg.evaluate(()=>ARC.scr),alive:await pg.evaluate(()=>ARC.alive)};
    };
    /* ---- carga ---- */
    const ld=await pg.evaluate(()=>({scr:ARC.scr,pct:document.getElementById('ldPct').textContent,
      go:document.getElementById('ldGo').classList.contains('on'),
      bg:!!document.getElementById('load').style.backgroundImage,
      langs:document.getElementById('langs').children.length}));
    console.log(tag+' carga:',JSON.stringify(ld));
    A(ld.pct==='100%'&&ld.go,tag+': la carga llega al 100% y ofrece entrar',ld);
    A(ld.bg,tag+': la pantalla de carga tiene el fondo del juego',{bg:ld.bg});
    A(ld.langs>=3,tag+': se puede elegir idioma en la carga',{langs:ld.langs});
    await pg.screenshot({path:S+'U-'+slug+'-load-'+(w<h?'v':'h')+'.png'});
    /* idioma inglés y de vuelta a español */
    const en=await pg.evaluate(()=>{const b=document.getElementById('langs').children[1];
      b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      return document.getElementById('bPlay').textContent;});
    A(/PLAY/i.test(en),tag+': el idioma cambia los textos',{play:en});
    await pg.evaluate(()=>document.getElementById('langs').children[0]
      .dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
    /* ---- entrar ---- */
    let r=await tap('ldGo',900);
    A(r.scr==='menu',tag+': TOCÁ PARA JUGAR entra al menú',r);
    /* ---- ajustes: gráficos ---- */
    r=await tap('bOpts');A(r.scr==='opts',tag+': AJUSTES abre',r);
    const g0=await pg.evaluate(()=>ARC.gfx());
    await pg.evaluate(()=>{const s=document.getElementById('segGfx');
      s.children[0].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
    const g1=await pg.evaluate(()=>ARC.gfx());
    A(g1===0&&g0!==0,tag+': se puede bajar la calidad de gráficos',{antes:g0,ahora:g1});
    await pg.evaluate(()=>{const s=document.getElementById('segGfx');
      s.children[2].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
    r=await tap('bOptBack');A(r.scr==='menu',tag+': LISTO vuelve al menú',r);
    /* ---- niveles (si tiene) ---- */
    const hasLv=await pg.evaluate(()=>!!GAME.levels);
    if(hasLv){
      r=await tap('bLevels');A(r.scr==='levels',tag+': NIVELES abre',r);
      r=await tap('bLvBack');A(r.scr==='menu',tag+': VOLVER cierra niveles',r);
    }
    /* ---- jugar / pausa / reintentar / seguir / menú ---- */
    r=await tap('bPlay',1100);A(r.scr==='game'&&r.alive,tag+': JUGAR arranca',r);
    await sleep(900);
    r=await tap('pPause');A(r.scr==='pause',tag+': PAUSA abre',r);
    r=await tap('bRetry',1200);
    A(r.scr==='game'&&r.alive&&r.hit==='bRetry',tag+': REINTENTAR reinicia la partida',r);
    r=await tap('pPause');
    r=await tap('bRes',800);
    A(r.scr==='game'&&r.hit==='bRes',tag+': SEGUIR vuelve al juego',r);
    r=await tap('pPause');
    r=await tap('bQuit',900);
    A(r.scr==='menu'&&r.hit==='bQuit',tag+': MENÚ sale de la partida',r);
    await pg.screenshot({path:S+'U-'+slug+'-menu-'+(w<h?'v':'h')+'.png'});
    A(errs.length===0,tag+': cero errores de JS',errs.slice(0,3));
    await pg.context().close();
  }
  console.log('\n'+slug+' UI: '+ok.length+' ok, '+bad.length+' fail');
  if(bad.length)console.log('fallan:\n - '+bad.join('\n - '));
  await b.close();
})();
