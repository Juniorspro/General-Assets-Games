/* ============================================================================
   ARCADE SHELL — el motor común de los 5 juegos
   ----------------------------------------------------------------------------
   Un solo archivo, cero dependencias, canvas 2D + overlays de DOM para los
   menús (el texto queda nítido y se estila con CSS en vez de dibujarse).
   Lo que resuelve por todos:
     · APAISADO SIEMPRE (rota #stage 90° si el teléfono está vertical) y puntero
       convertido a mano, porque la rotación del compositor cruza los ejes.
     · Bucle de paso FIJO a 60 Hz con interpolación al dibujar: la simulación no
       cambia con los FPS del celular y el movimiento no tiembla a 120 Hz.
     · Audio (WebAudio con limitador + música por <audio>), con SÍNTESIS de
       respaldo: si un mp3 no está o el navegador no lo decodifica, suena un
       blip generado y el juego no se queda muerto de sonido.
     · Guardado en localStorage, pantallas (menú/pausa/fin/niveles/ajustes),
       partículas, texto flotante, sacudida de cámara, toast, FPS y calidad
       adaptativa (si baja de 45 fps se recortan las partículas).
   Contrato del juego (window.GAME): ver el final del archivo.
   ========================================================================== */
'use strict';
const ARC={W:0,H:0,dpr:1,q:1,t:0,dt:1/60,frame:0,fps:60,paused:false,scr:'load',lvl:1,alive:false};
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a);
const rndi=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const TAU=Math.PI*2;

/* ---------------------------------------------------------------- 1. ESCENARIO
   Si el viewport está vertical se rota el escenario 90° y se le fijan ancho y
   alto EN PX (cruzados). Todo lo demás vive en ese espacio: ARC.W/ARC.H son las
   medidas del juego, siempre apaisadas. */
let ROT=false,OFFX=0;
function fit(){
  const vw=Math.round(window.innerWidth),vh=Math.round(window.innerHeight);
  const st=$('stage');
  /* GAME.portrait = el juego se juega VERTICAL de verdad (tipo Crossy Road): no se
     rota nada. En una ventana apaisada (escritorio) se centra una columna 9:16 y
     el resto queda negro, para que el encuadre sea el mismo que en el teléfono. */
  if(GAME.portrait){
    ROT=false;
    const w=Math.min(vw,Math.round(vh*.58));
    OFFX=Math.round((vw-w)/2);
    st.style.width=w+'px';st.style.height=vh+'px';
    st.style.transform=OFFX?('translateX('+OFFX+'px)'):'none';
  }else{
    OFFX=0;
    ROT=vh>vw;
    if(ROT){
      st.style.width=vh+'px';st.style.height=vw+'px';
      st.style.transform='translateX('+vw+'px) rotate(90deg)';
    }else{
      st.style.width=vw+'px';st.style.height=vh+'px';st.style.transform='none';
    }
  }
  ARC.W=st.clientWidth;ARC.H=st.clientHeight;
  const cv=$('cv');
  ARC.dpr=clamp(window.devicePixelRatio||1,1,2.5);
  cv.style.width=ARC.W+'px';cv.style.height=ARC.H+'px';
  cv.width=Math.round(ARC.W*ARC.dpr);cv.height=Math.round(ARC.H*ARC.dpr);
  ARC.g=cv.getContext('2d');
  ARC.g.setTransform(ARC.dpr,0,0,ARC.dpr,0,0);
  /* la escena 3D usa su propio lienzo y su propio DPR (más barato en el celular:
     el 3D a 1.5x se ve igual y cuesta la mitad que a 3x) */
  const gl=$('gl');
  gl.style.width=ARC.W+'px';gl.style.height=ARC.H+'px';
  if(ARC.rnd){
    ARC.rnd.setPixelRatio(Math.min(ARC.dpr,1.75));
    ARC.rnd.setSize(ARC.W,ARC.H,false);
  }
  if(GAME.resize)GAME.resize();
}
window.addEventListener('resize',()=>{fit();},{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(fit,120),{passive:true});

/* ---- puntero: del evento del navegador al espacio del escenario ----
   Con el escenario rotado 90° y corrido vw en X, un punto (sx,sy) del escenario
   cae en pantalla en (vw−sy, sx). La inversa es la que hace falta acá. NO se usa
   getBoundingClientRect: devuelve la caja YA rotada y mezcla los ejes. */
ARC.pt=function(e){
  const x=e.clientX,y=e.clientY;
  if(ROT)return{x:y,y:Math.round(window.innerWidth)-x};
  return{x:x-OFFX,y:y};      /* OFFX = columna centrada de los juegos verticales */
};

/* ------------------------------------------------------------------ 2. GUARDADO */
const SAVE={};
function saveKey(){return 'arc.'+GAME.slug;}
function saveLoad(){
  try{Object.assign(SAVE,JSON.parse(localStorage.getItem(saveKey())||'{}'));}catch(e){}
  if(SAVE.mus===undefined)SAVE.mus=1;
  if(SAVE.sfx===undefined)SAVE.sfx=1;
  if(SAVE.vib===undefined)SAVE.vib=1;
  if(SAVE.fx===undefined)SAVE.fx=1;
  if(SAVE.fps===undefined)SAVE.fps=0;
  if(!SAVE.stars)SAVE.stars={};
  if(!SAVE.best)SAVE.best=0;
  if(!SAVE.coins)SAVE.coins=0;
  if(!SAVE.done)SAVE.done=0;      /* nivel más alto superado */
  if(!SAVE.lang)SAVE.lang=(navigator.language||'es').slice(0,2).toLowerCase();
  if(!STR[SAVE.lang])SAVE.lang='es';
  if(SAVE.gfx==null)SAVE.gfx=2;
}
function saveNow(){try{localStorage.setItem(saveKey(),JSON.stringify(SAVE));}catch(e){}}
ARC.save=saveNow;ARC.S=SAVE;


/* ------------------------------------------------------------------ 2b. IDIOMAS
   Todo texto visible sale de acá (data-i18n en el DOM + T() en el código). Cada
   juego puede sumar sus propias claves con GAME.i18n={es:{},en:{},pt:{}} y se
   mezclan sobre estas. El idioma se elige en la pantalla de carga la primera vez
   y después en Ajustes; queda guardado. Si falta una clave se cae al español. */
const LANGS=[['es','ES'],['en','EN'],['pt','PT']];
const STR={
  es:{loading:'CARGANDO',lang:'IDIOMA',tapPlay:'TOCÁ PARA JUGAR',play:'JUGAR',levels:'NIVELES',
    settings:'AJUSTES',pause:'PAUSA',resume:'SEGUIR',retry:'REINTENTAR',menu:'MENÚ',next:'SIGUIENTE',
    again:'OTRA VEZ',back:'VOLVER',done:'LISTO',wipe:'BORRAR PROGRESO',music:'Música',sfx:'Sonidos',
    vib:'Vibración',extraFx:'Efectos extra',showFps:'Mostrar FPS',graphics:'Gráficos',
    gfx0:'Bajo',gfx1:'Medio',gfx2:'Alto',gfx3:'Ultra',record:'RÉCORD',level:'NIVEL',
    win:'¡NIVEL SUPERADO!',lost:'PERDISTE',points:'PUNTOS',wiped:'Progreso borrado',
    art:'arte',sounds:'sonidos',models:'modelos',engine:'motor 3D',ready:'listo'},
  en:{loading:'LOADING',lang:'LANGUAGE',tapPlay:'TAP TO PLAY',play:'PLAY',levels:'LEVELS',
    settings:'SETTINGS',pause:'PAUSED',resume:'RESUME',retry:'RETRY',menu:'MENU',next:'NEXT',
    again:'AGAIN',back:'BACK',done:'DONE',wipe:'WIPE PROGRESS',music:'Music',sfx:'Sound',
    vib:'Vibration',extraFx:'Extra effects',showFps:'Show FPS',graphics:'Graphics',
    gfx0:'Low',gfx1:'Medium',gfx2:'High',gfx3:'Ultra',record:'BEST',level:'LEVEL',
    win:'LEVEL COMPLETE!',lost:'GAME OVER',points:'SCORE',wiped:'Progress wiped',
    art:'art',sounds:'sounds',models:'models',engine:'3D engine',ready:'ready'},
  pt:{loading:'CARREGANDO',lang:'IDIOMA',tapPlay:'TOQUE PARA JOGAR',play:'JOGAR',levels:'NÍVEIS',
    settings:'AJUSTES',pause:'PAUSA',resume:'CONTINUAR',retry:'TENTAR DE NOVO',menu:'MENU',next:'SEGUINTE',
    again:'DE NOVO',back:'VOLTAR',done:'PRONTO',wipe:'APAGAR PROGRESSO',music:'Música',sfx:'Sons',
    vib:'Vibração',extraFx:'Efeitos extra',showFps:'Mostrar FPS',graphics:'Gráficos',
    gfx0:'Baixo',gfx1:'Médio',gfx2:'Alto',gfx3:'Ultra',record:'RECORDE',level:'NÍVEL',
    win:'NÍVEL COMPLETO!',lost:'VOCÊ PERDEU',points:'PONTOS',wiped:'Progresso apagado',
    art:'arte',sounds:'sons',models:'modelos',engine:'motor 3D',ready:'pronto'}
};
function lang(){return SAVE.lang||'es';}
ARC.T=function(k){
  const g=(GAME.i18n&&GAME.i18n[lang()])||{};
  if(g[k]!=null)return g[k];
  const d=STR[lang()]||STR.es;
  if(d[k]!=null)return d[k];
  const ge=(GAME.i18n&&GAME.i18n.es)||{};
  return ge[k]!=null?ge[k]:(STR.es[k]!=null?STR.es[k]:k);
};
const T=ARC.T;
ARC.i18nApply=function(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=T(el.getAttribute('data-i18n'));});
  if(GAME.subKey)$('mSub').innerHTML=T(GAME.subKey);
  if(ARC.scr==='menu')refreshMenu();
  if(GAME.i18nDone)nsafe2(()=>GAME.i18nDone());
};
const nsafe2=f=>{try{return f();}catch(e){console.warn(e);}};
ARC.lang=function(l){
  if(l){SAVE.lang=l;saveNow();ARC.i18nApply();paintSegs();}
  return lang();
};

/* --------------------------------------------------------------- 2c. GRÁFICOS
   Un solo número (0-3) que decide DPR, sombras, partículas y niebla. Se aplica en
   caliente: no hace falta reiniciar el juego. */
const GFXP=[{dpr:1,part:.45,sh:0,fog:.7},{dpr:1.25,part:.75,sh:0,fog:.85},
            {dpr:1.75,part:1,sh:1,fog:1},{dpr:2.5,part:1.35,sh:1,fog:1.15}];
ARC.gfx=function(v){
  if(v!==undefined){SAVE.gfx=clamp(v|0,0,3);saveNow();applyGfx();paintSegs();}
  return SAVE.gfx==null?2:SAVE.gfx;
};
function applyGfx(){
  const p=GFXP[ARC.gfx()];
  ARC.q=p.part;
  if(ARC.rnd){
    ARC.rnd.setPixelRatio(Math.min(window.devicePixelRatio||1,p.dpr));
    ARC.rnd.shadowMap.enabled=!!(GAME.shadows&&p.sh);
    ARC.rnd.setSize(ARC.W,ARC.H,false);
  }
  if(GAME.gfxApply)nsafe2(()=>GAME.gfxApply(p));
}
ARC.gfxP=()=>GFXP[ARC.gfx()];
function paintSegs(){
  const mk=(host,items,cur,fn)=>{
    const el=$(host);if(!el)return;
    el.innerHTML='';
    items.forEach(it=>{
      const b=document.createElement('b');
      b.textContent=it[1];b.className=(it[0]===cur?'on':'');
      b.addEventListener('pointerdown',e=>{e.preventDefault();ARC.sfx('tap');ARC.vib(8);fn(it[0]);});
      el.appendChild(b);
    });
  };
  mk('langs',LANGS,lang(),l=>ARC.lang(l));
  mk('segLang',LANGS,lang(),l=>ARC.lang(l));
  mk('segGfx',[[0,T('gfx0')],[1,T('gfx1')],[2,T('gfx2')],[3,T('gfx3')]],ARC.gfx(),v=>ARC.gfx(v));
}
ARC.paintSegs=paintSegs;

/* -------------------------------------------------------------------- 3. AUDIO */
const SND={ctx:null,buf:{},gain:null,mus:null,ready:false};
function actx(){
  if(SND.ctx)return SND.ctx;
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  SND.ctx=new C();
  const lim=SND.ctx.createDynamicsCompressor();
  lim.threshold.value=-6;lim.knee.value=0;lim.ratio.value=12;lim.attack.value=.003;lim.release.value=.15;
  SND.gain=SND.ctx.createGain();SND.gain.gain.value=.85;
  SND.gain.connect(lim);lim.connect(SND.ctx.destination);
  return SND.ctx;
}
ARC.sndResume=function(){const c=actx();if(c&&c.state==='suspended')c.resume();};
/* carga de efectos: si algo no llega o no se puede decodificar, se deja sin
   buffer y sonará el blip sintetizado (nunca silencio total ni excepción) */
ARC.sndLoad=function(map,done){
  const ks=Object.keys(map);let n=0;
  if(!ks.length){done&&done();return;}
  ks.forEach(k=>{
    fetch(map[k]).then(r=>r.arrayBuffer()).then(b=>{
      const c=actx();if(!c)throw 0;
      return new Promise((res,rej)=>c.decodeAudioData(b,res,rej));
    }).then(buf=>{SND.buf[k]=buf;}).catch(()=>{}).then(()=>{
      if(++n===ks.length){SND.ready=true;done&&done();}
    });
  });
};
/* blips de respaldo por nombre: no pretenden imitar el mp3, pero dan feedback */
const BEEP={tap:[520,.05,'square',.25],pop:[720,.08,'sine',.3],chime:[1040,.16,'triangle',.28],
  coin:[1180,.1,'square',.25],win:[880,.4,'triangle',.3],lose:[180,.4,'sawtooth',.25],
  click:[1400,.04,'square',.22],wood:[240,.12,'sawtooth',.3],glass:[2200,.1,'triangle',.22],
  splat:[300,.14,'sine',.3],groan:[120,.35,'sawtooth',.22],launch:[420,.14,'sawtooth',.28],
  boom:[90,.35,'sawtooth',.35],power:[1320,.22,'triangle',.28],shoot:[640,.07,'square',.22]};
ARC.sfx=function(name,o){
  if(!SAVE.sfx)return;
  const c=actx();if(!c)return;
  o=o||{};
  const b=SND.buf[name];
  if(b){
    const s=c.createBufferSource();s.buffer=b;
    s.playbackRate.value=o.rate||1;
    const g=c.createGain();g.gain.value=(o.vol==null?1:o.vol);
    s.connect(g);g.connect(SND.gain);s.start(0);return;
  }
  const d=BEEP[name]||BEEP.tap;
  const os=c.createOscillator(),g=c.createGain();
  os.type=d[2];os.frequency.value=d[0]*(o.rate||1);
  const v=d[3]*(o.vol==null?1:o.vol);
  g.gain.setValueAtTime(0,c.currentTime);
  g.gain.linearRampToValueAtTime(v,c.currentTime+.008);
  g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d[1]);
  os.connect(g);g.connect(SND.gain);os.start();os.stop(c.currentTime+d[1]+.02);
};
ARC.music=function(url){
  if(!url)return;
  if(!SND.mus){
    SND.mus=new Audio();SND.mus.loop=true;SND.mus.volume=.42;
    SND.mus.addEventListener('error',()=>{},{passive:true});
  }
  if(SND.mus.src!==url){SND.mus.src=url;}
  if(SAVE.mus){const p=SND.mus.play();if(p&&p.catch)p.catch(()=>{});}
};
ARC.musicStop=function(){if(SND.mus)SND.mus.pause();};
ARC.vib=function(ms){if(SAVE.vib&&navigator.vibrate)try{navigator.vibrate(ms||12);}catch(e){}};

/* ---------------------------------------------------------------- 4. EFECTOS */
const PT=[],TX=[];
let shake=0,shakeT=0;
ARC.fx={
  burst(x,y,o){
    o=o||{};
    let n=Math.round((o.n||14)*ARC.q*(SAVE.fx?1:.45));
    const sp=o.speed||220,life=o.life||.55,g=o.g==null?900:o.g;
    for(let i=0;i<n;i++){
      const a=o.a==null?rnd(0,TAU):o.a+rnd(-.6,.6);
      const v=sp*rnd(.35,1);
      PT.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:life*rnd(.6,1.2),L:life,
        s:(o.size||5)*rnd(.6,1.4),c:o.color||'#ffd166',g,sq:!!o.sq,
        rot:rnd(0,TAU),spin:rnd(-8,8),fade:o.fade!==false});
    }
  },
  ring(x,y,o){o=o||{};PT.push({ring:1,x,y,r:o.r0||6,R:o.r||90,l:o.life||.35,L:o.life||.35,
    c:o.color||'#fff',w:o.w||4});},
  text(x,y,txt,o){o=o||{};TX.push({x,y,t:txt,l:o.life||.8,L:o.life||.8,c:o.color||'#fff',
    s:o.size||22,vy:o.vy==null?-46:o.vy});}
};
ARC.shake=function(m){shake=Math.max(shake,m||6);};
function fxStep(dt){
  for(let i=PT.length-1;i>=0;i--){const p=PT[i];
    p.l-=dt;if(p.l<=0){PT.splice(i,1);continue;}
    if(p.ring){p.r=lerp(p.r,p.R,1-Math.pow(.001,dt));continue;}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.spin*dt;
    if(p.bounce&&p.y>p.bounce){p.y=p.bounce;p.vy*=-.42;p.vx*=.7;}
  }
  for(let i=TX.length-1;i>=0;i--){const t=TX[i];t.l-=dt;if(t.l<=0){TX.splice(i,1);continue;}
    t.y+=t.vy*dt;}
  if(shake>0){shakeT+=dt*46;shake=Math.max(0,shake-dt*shake*7-dt*3);}
}
function fxDraw(g){
  for(const p of PT){
    const k=p.l/p.L;
    g.globalAlpha=p.fade===false?1:clamp(k*1.4,0,1);
    if(p.ring){g.strokeStyle=p.c;g.lineWidth=p.w*k;g.beginPath();g.arc(p.x,p.y,p.r,0,TAU);g.stroke();continue;}
    g.fillStyle=p.c;
    if(p.sq){g.save();g.translate(p.x,p.y);g.rotate(p.rot);
      g.fillRect(-p.s/2,-p.s/2,p.s,p.s);g.restore();}
    else{g.beginPath();g.arc(p.x,p.y,p.s*(.4+.6*k),0,TAU);g.fill();}
  }
  g.globalAlpha=1;
  for(const t of TX){
    const k=t.l/t.L;
    g.globalAlpha=clamp(k*1.6,0,1);
    g.font='900 '+t.s+'px system-ui,sans-serif';g.textAlign='center';
    g.lineWidth=4;g.strokeStyle='rgba(0,0,0,.55)';g.strokeText(t.t,t.x,t.y);
    g.fillStyle=t.c;g.fillText(t.t,t.x,t.y);
  }
  g.globalAlpha=1;g.textAlign='left';
}

/* foto de la escena 3D para las sondas: se lee el framebuffer DENTRO de un
   requestAnimationFrame, que corre después del render del bucle en el MISMO
   frame — ahí el buffer todavía está intacto (después del compositado ya no). */
ARC.snapGL=function(){
  return new Promise(res=>{
    requestAnimationFrame(()=>{
      const r=ARC.rnd;if(!r){res(null);return;}
      const gl=r.getContext();
      const W=gl.drawingBufferWidth,H=gl.drawingBufferHeight;
      const px=new Uint8Array(W*H*4);
      gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,px);
      let sum=0,n=0;const uniq={};
      for(let i=0;i<px.length;i+=4*37){n++;
        sum+=px[i]*.3+px[i+1]*.6+px[i+2]*.1;
        uniq[(px[i]>>5)+','+(px[i+1]>>5)+','+(px[i+2]>>5)]=1;}
      res({luz:+(sum/Math.max(1,n)).toFixed(1),colores:Object.keys(uniq).length});
    });
  });
};

/* ---------------------------------------------------------------- 5. PANTALLAS */
const SCRS=['menu','pause','over','levels','opts'];
let optFrom='menu';
ARC.show=function(s){
  for(const k of SCRS)$(k).classList.toggle('on',k===s);
  if(s!=='load')$('load').style.display='none';
  $('hud').style.display=(s==='game')?'block':'none';
  ARC.scr=s;
};
ARC.toast=function(t,ms){
  const el=$('toast');el.textContent=t;el.classList.add('on');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),ms||1100);
};
ARC.hud=function(score,info){
  if(score!==undefined)$('pScore').textContent=score;
  if(info!==undefined)$('pInfo').innerHTML=info;
};
/* bandeja de botones del juego (impulsar, boosters, etc.) */
ARC.tray=function(list){
  const t=$('tray');t.innerHTML='';
  (list||[]).forEach(b=>{
    const el=document.createElement('div');
    el.className='btn '+(b.gh?'gh ':'')+(b.sq?'sq':'');
    el.id='tb_'+b.id;el.innerHTML=b.txt;
    el.addEventListener('pointerdown',ev=>{ev.preventDefault();ARC.sfx('tap');ARC.vib(10);b.fn&&b.fn(el);});
    t.appendChild(el);
  });
};
ARC.trayTxt=function(id,txt){const el=$('tb_'+id);if(el)el.innerHTML=txt;};

/* --------------------------------------------------------------- 6. PARTIDA */
ARC.play=function(lvl){
  ARC.lvl=lvl||1;
  ARC.alive=true;ARC.paused=false;
  PT.length=0;TX.length=0;shake=0;
  ARC.show('game');
  GAME.start(ARC.lvl);
  ARC.music(GAME.music);
};
ARC.over=function(o){
  o=o||{};ARC.alive=false;
  const st=Math.max(0,Math.min(3,o.stars==null?(o.win?3:0):o.stars));
  if(o.win){
    const key=String(ARC.lvl);
    if((SAVE.stars[key]||0)<st){SAVE.stars[key]=st;}
    if(ARC.lvl>SAVE.done)SAVE.done=ARC.lvl;
  }
  if(o.score!=null&&o.score>SAVE.best)SAVE.best=o.score;
  if(o.coins)SAVE.coins+=o.coins;
  saveNow();
  $('oTtl').textContent=o.title||(o.win?T('win'):T('lost'));
  $('oScore').textContent=o.score!=null?(T('points')+' '+o.score):'';
  $('oSub').innerHTML=o.sub||'';
  const S=$('oStars').children;
  $('oStars').style.display=o.noStars?'none':'flex';
  for(let i=0;i<3;i++)S[i].classList.toggle('on',i<st);
  $('bNext').style.display=(o.win&&GAME.levels&&ARC.lvl<GAME.levels)?'flex':'none';
  ARC.sfx(o.win?'win':'lose');
  ARC.vib(o.win?[10,40,10]:60);
  ARC.show('over');
};
ARC.pause=function(){
  if(!ARC.alive||ARC.paused)return;
  ARC.paused=true;ARC.show('pause');GAME.pause&&GAME.pause();
};
ARC.resume=function(){
  if(!ARC.alive)return;
  ARC.paused=false;ARC.show('game');GAME.resume&&GAME.resume();
};
ARC.menu=function(){
  ARC.alive=false;ARC.paused=false;ARC.show('menu');refreshMenu();
};

/* --------------------------------------------------------------- 7. EL BUCLE
   Paso FIJO de 1/60 con acumulador y alpha de interpolación al dibujar: la
   física no depende de los FPS (un celular a 30 y otro a 120 simulan igual) y
   el dibujo no tiembla. Se cortan los saltos grandes (pestaña en segundo plano)
   a 5 pasos por frame para no colgar el hilo. */
const STEP=1/60;
let acc=0,last=0,fpsA=60,slowT=0;
function loop(ts){
  requestAnimationFrame(loop);
  if(!last)last=ts;
  let d=(ts-last)/1000;last=ts;
  if(d>.25)d=.25;
  ARC.fps=fpsA=lerp(fpsA,1/Math.max(.001,d),.06);
  if(SAVE.fps)$('fps').textContent=Math.round(fpsA)+' fps';
  /* calidad adaptativa: dos segundos por debajo de 45 fps y se recortan
     partículas (ARC.q lo leen los juegos y ARC.fx.burst) */
  if(fpsA<45){slowT+=d;if(slowT>2&&ARC.q>.5){ARC.q=.5;slowT=0;}}
  else{slowT=Math.max(0,slowT-d);if(fpsA>56&&ARC.q<1)ARC.q=Math.min(1,ARC.q+d*.2);}
  const run=ARC.alive&&!ARC.paused;
  acc+=d;
  let n=0;
  while(acc>=STEP&&n<5){
    acc-=STEP;n++;ARC.t+=STEP;ARC.frame++;
    if(run)GAME.step(STEP);
    fxStep(STEP);
  }
  if(acc>STEP*5)acc=0;
  const g=ARC.g;if(!g)return;
  g.setTransform(ARC.dpr,0,0,ARC.dpr,0,0);
  g.clearRect(0,0,ARC.W,ARC.H);
  if(shake>.05){
    g.translate(Math.sin(shakeT*1.7)*shake,Math.cos(shakeT*2.3)*shake*.8);
  }
  /* en el menú no se dibuja el juego: el canvas queda limpio (el arte del menú es
     DOM) y el celular no gasta batería dibujando un tablero que nadie ve */
  if(ARC.scr==='game'||ARC.scr==='pause'||ARC.scr==='over'){
    GAME.draw(g,acc/STEP);
    fxDraw(g);
  }else if(ARC.rnd&&ARC.clearGL){ARC.rnd.clear();}
}

/* ------------------------------------------------------------- 8. ENTRADA */
function bindInput(){
  const cv=$('cv');
  const down=e=>{
    e.preventDefault();ARC.sndResume();
    if(ARC.alive&&!ARC.paused&&GAME.down)GAME.down(ARC.pt(e),e);
  };
  const move=e=>{
    e.preventDefault();
    if(ARC.alive&&!ARC.paused&&GAME.move)GAME.move(ARC.pt(e),e);
  };
  const up=e=>{
    e.preventDefault();
    if(ARC.alive&&!ARC.paused&&GAME.up)GAME.up(ARC.pt(e),e);
  };
  cv.addEventListener('pointerdown',down);
  cv.addEventListener('pointermove',move);
  cv.addEventListener('pointerup',up);
  cv.addEventListener('pointercancel',up);
  const B=(id,fn)=>{const el=$(id);if(!el)return;
    el.addEventListener('pointerdown',e=>{e.preventDefault();ARC.sndResume();ARC.sfx('tap');ARC.vib(10);fn(el);});};
  B('bPlay',()=>ARC.play(GAME.levels?Math.min(GAME.levels,(SAVE.done||0)+1):1));
  B('bLevels',()=>{buildLevels();ARC.show('levels');});
  B('bLvBack',()=>ARC.menu());
  /* AJUSTES se puede abrir desde el MENÚ y desde la PAUSA, y LISTO vuelve a donde
     se abrió. Lo pidieron los tres verificadores: antes, cambiar idioma o gráficos
     obligaba a abandonar la partida (bOptBack llamaba siempre a ARC.menu()). */
  B('bOpts',()=>{optFrom='menu';ARC.show('opts');});
  B('bOpts2',()=>{optFrom='pause';ARC.show('opts');});
  B('bOptBack',()=>{if(optFrom==='pause'&&ARC.alive){ARC.show('pause');}else ARC.menu();});
  B('pPause',()=>ARC.pause());
  B('bRes',()=>ARC.resume());
  B('bRetry',()=>ARC.play(ARC.lvl));
  B('bQuit',()=>ARC.menu());
  B('bAgain',()=>ARC.play(ARC.lvl));
  B('bMenu',()=>ARC.menu());
  B('bNext',()=>ARC.play(Math.min(GAME.levels||1,ARC.lvl+1)));
  B('bWipe',()=>{const m=SAVE.mus,s=SAVE.sfx,v=SAVE.vib,f=SAVE.fx;
    for(const k in SAVE)delete SAVE[k];
    SAVE.mus=m;SAVE.sfx=s;SAVE.vib=v;SAVE.fx=f;SAVE.stars={};SAVE.best=0;SAVE.done=0;SAVE.coins=0;
    saveNow();ARC.toast(T('wiped'));refreshMenu();});
  const SW=(id,key,fn)=>{const el=$(id);if(!el)return;
    el.classList.toggle('on',!!SAVE[key]);
    el.addEventListener('pointerdown',e=>{e.preventDefault();
      SAVE[key]=SAVE[key]?0:1;el.classList.toggle('on',!!SAVE[key]);saveNow();
      ARC.sfx('tap');ARC.vib(10);fn&&fn(SAVE[key]);});};
  SW('swMus','mus',v=>{if(v)ARC.music(GAME.music);else ARC.musicStop();});
  SW('swSfx','sfx');
  SW('swVib','vib');
  SW('swFx','fx');
  SW('swFps','fps',v=>{$('fps').style.display=v?'block':'none';});
  document.addEventListener('keydown',e=>{
    if(e.code==='Escape'){if(ARC.alive&&!ARC.paused)ARC.pause();else if(ARC.paused)ARC.resume();}
    if(GAME.key)GAME.key(e.code,true);
  });
  document.addEventListener('keyup',e=>{if(GAME.key)GAME.key(e.code,false);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&ARC.alive)ARC.pause();});
}

/* -------------------------------------------------------- 9. MENÚ / NIVELES */
function refreshMenu(){
  $('mTtl').innerHTML=GAME.title;
  $('mSub').innerHTML=GAME.subKey?T(GAME.subKey):GAME.sub;
  const b=[];
  if(GAME.bestLabel!==null)b.push('<b>'+(GAME.bestKey?T(GAME.bestKey):(GAME.bestLabel||T('record')))+'</b> '+(SAVE.best||0));
  if(GAME.levels)b.push(T('level')+' '+Math.min(GAME.levels,(SAVE.done||0)+1)+'/'+GAME.levels);
  b.push('★ '+Object.values(SAVE.stars||{}).reduce((s,v)=>s+v,0));
  $('best').innerHTML=b.join('<br>');
  $('bLevels').style.display=GAME.levels?'flex':'none';
  ARC.music(GAME.music);
}
function buildLevels(){
  const g=$('lvGrid');g.innerHTML='';
  const n=GAME.levels||1;
  const cols=Math.min(8,Math.ceil(Math.sqrt(n)+1));
  g.style.gridTemplateColumns='repeat('+cols+',auto)';
  for(let i=1;i<=n;i++){
    const st=SAVE.stars[String(i)]||0;
    const lock=i>(SAVE.done||0)+1;
    const el=document.createElement('div');
    el.className='lvl'+(st?' done':'')+(lock?' lock':'');
    el.innerHTML=i+(st?'<b>'+'★'.repeat(st)+'</b>':'');
    if(!lock)el.addEventListener('pointerdown',e=>{e.preventDefault();ARC.sfx('tap');ARC.play(i);});
    g.appendChild(el);
  }
}

/* -------------------------------------------------------------- 10. ARRANQUE */
ARC.boot=async function(){
  document.documentElement.style.setProperty('--acc',GAME.acc||'#ffd166');
  document.documentElement.style.setProperty('--acc2',GAME.acc2||'#f0a02a');
  saveLoad();
  if(GAME.portrait)document.body.classList.add('vert');
  $('ldName').textContent=GAME.name||'';
  ARC.i18nApply();paintSegs();
  fit();bindInput();
  $('fps').style.display=SAVE.fps?'block':'none';

  /* ---------------- CARGA DE ASSETS con barra de verdad ----------------
     Se cuentan TODOS los pasos (motor 3D, arte, sonidos, modelos) y la barra
     avanza por paso terminado. El fondo de la pantalla de carga es el arte del
     propio juego, como en los otros juegos del repo. Al final NO se entra solo:
     aparece "TOCÁ PARA JUGAR", porque ese toque es lo que habilita el audio en
     el celular (sin gesto, el navegador no deja sonar nada). */
  const steps=[];
  if(GAME.three)steps.push('engine');
  if(GAME.art)steps.push('art');
  const sfxN=Object.keys(GAME.sfx||{}).length;
  if(sfxN)steps.push('sounds');
  const glbN=Object.keys(GAME.glb||{}).length;
  if(glbN)steps.push('models');
  let done=0;
  const total=Math.max(1,steps.length);
  const prog=(k)=>{
    done++;
    const pc=Math.round(done/total*100);
    $('ldBar').style.width=pc+'%';$('ldPct').textContent=pc+'%';
    $('ldTxt').textContent=T(k)||'';
  };
  $('ldTxt').textContent=T(steps[0]||'loading');

  /* 1. motor 3D (por importmap, sólo si el juego es 3D) */
  if(GAME.three){
    try{
      const THREE=await import('three');
      ARC.THREE=THREE;
      const gl=$('gl');
      ARC.rnd=new THREE.WebGLRenderer({canvas:gl,antialias:true,alpha:false,powerPreference:'high-performance'});
      ARC.rnd.setClearColor(new THREE.Color(GAME.sky||'#0d1014'),1);
      if(THREE.SRGBColorSpace)ARC.rnd.outputColorSpace=THREE.SRGBColorSpace;
      ARC.rnd.shadowMap.enabled=!!GAME.shadows;
      if(GAME.shadows)ARC.rnd.shadowMap.type=THREE.PCFSoftShadowMap;
      fit();
    }catch(e){console.warn('three',e);}
    prog('engine');
  }
  applyGfx();

  /* 2. arte del menú (y fondo de esta misma pantalla) */
  if(GAME.art){
    await new Promise(res=>{
      const im=new Image();
      im.onload=()=>{
        $('load').style.backgroundImage='url('+GAME.art+')';
        const el=$('menu');
        if(GAME.portrait){
          el.style.backgroundImage='url('+GAME.art+'), linear-gradient(180deg,'+
            (GAME.acc2||'#222')+'55 0%, #0a0d12 46%, #05070a 100%)';
          el.style.backgroundSize='100% auto, 100% 100%';
          el.style.backgroundRepeat='no-repeat, no-repeat';
          el.style.backgroundPosition='center 14%, center';
        }else{
          el.style.backgroundImage='url('+GAME.art+')';
        }
        el.classList.add('hasart');res();
      };
      im.onerror=()=>res();
      im.src=GAME.art;
    });
    prog('art');
  }
  /* 3. sonidos */
  if(sfxN){
    await new Promise(res=>ARC.sndLoad(GAME.sfx,res));
    prog('sounds');
  }
  /* 4. modelos 3D (opcional: los juegos que usan GLB los declaran en GAME.glb) */
  if(glbN&&ARC.THREE){
    try{
      const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
      const ld=new GLTFLoader();
      ARC.glb={};
      await Promise.all(Object.keys(GAME.glb).map(k=>new Promise(res=>{
        ld.load(GAME.glb[k],g=>{ARC.glb[k]=g;res();},undefined,()=>{ARC.glb[k]=null;res();});
      })));
    }catch(e){console.warn('glb',e);ARC.glb=ARC.glb||{};}
    prog('models');
  }
  /* 5. listo: el juego se prepara y se espera el toque */
  nsafe2(()=>GAME.init&&GAME.init());
  requestAnimationFrame(loop);
  $('ldBar').style.width='100%';$('ldPct').textContent='100%';
  $('ldTxt').textContent=T('ready');
  $('ldGo').classList.add('on');
  const enter=()=>{
    $('ldGo').removeEventListener('pointerdown',enter);
    ARC.sndResume();
    $('load').style.display='none';
    ARC.show('menu');refreshMenu();
    ARC.music(GAME.music);
  };
  $('ldGo').addEventListener('pointerdown',e=>{e.preventDefault();enter();});
  /* atajo para las sondas y para el teclado */
  ARC.enterMenu=enter;
  document.addEventListener('keydown',e=>{if(ARC.scr==='load'&&(e.code==='Space'||e.code==='Enter'))enter();});
};

/* ============================ CONTRATO DEL JUEGO ============================
   window.GAME = {
     slug, name, title (HTML), sub (HTML), acc, acc2,   // identidad y colores
     art, music, sfx:{nombre:url},                      // assets
     levels, bestLabel,                                 // progresión
     init(), start(lvl), step(dt), draw(g,alpha),       // ciclo
     down(p,e), move(p,e), up(p,e), key(code,down),     // entrada (p en px del stage)
     resize(), pause(), resume()                        // opcionales
   }
   El juego avisa el final con ARC.over({win,score,stars,sub,coins}).
   ========================================================================== */
