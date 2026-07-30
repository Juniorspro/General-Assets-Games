/* ============================================================================
   TORRE LOCA — apilar bloques que se deslizan, cortando el sobrante
   ----------------------------------------------------------------------------
   Un bloque va y viene sobre la torre; al tocar la pantalla se apoya. Lo que
   sobresale se CORTA y se cae; lo que pisa queda. Si clavás el centro es
   PERFECTO: anillo + brillo + tono más agudo, el bloque recupera tamaño y la
   racha paga monedas. Los ejes alternan (X, Z, X, Z...), la velocidad sube y el
   recorrido se acorta con la altura. Sin niveles: es de récord.

   MUNDO: cielo con degradado + skyline de ciudad (imagen generada, con respaldo
   dibujado a mano en canvas), ciudad de cajas alrededor de la base, nubes que
   pasan y niebla. Todo eso escala con ARC.gfxP().
   ENCUADRE: la cámara sigue el CENTRO del bloque de arriba (x/z, no sólo la
   altura), así la torre nunca se va del cuadro aunque los cortes la corran.
   ========================================================================== */
const G={
  slug:'torre',name:'TORRE LOCA',
  title:'TORRE <em>LOCA</em>',
  subKey:'sub',
  acc:'#5ee7c1',acc2:'#2bb99a',levels:0,bestKey:'bestL',
  three:true,sky:'#1a1038',
  art:A('art-torre.jpg'),music:A('mus-torre.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),click:A('sfx-click.mp3'),pop:A('sfx-pop.mp3'),chime:A('sfx-chime.mp3'),
       coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),power:A('sfx-power.mp3'),
       perfect:A('sfx-torre-perfect.mp3')},
  i18n:{
    es:{sub:'Tocá para apoyar el bloque: lo que sobra se corta y se cae. Si clavás el centro es PERFECTO, el bloque recupera tamaño y la racha paga monedas. La torre no tiene techo.',
      bestL:'PISOS',points:'PISOS',place:'APOYAR',tapPlace:'TOCÁ PARA APOYAR',streak:'RACHA',
      perfect:'PERFECTO',floors:'Pisos',bStreak:'Mejor racha',coinsW:'Monedas',
      newRec:'¡NUEVO RÉCORD!',fell:'SE CAYÓ',mile:'PISOS',saved:'¡AL FILO! (pisos 1-4 regalados)'},
    en:{sub:'Tap to drop the block: whatever sticks out is sliced off and falls. Nail the centre for a PERFECT — the block grows back and the streak pays coins. The tower has no ceiling.',
      bestL:'FLOORS',points:'FLOORS',place:'DROP',tapPlace:'TAP TO DROP',streak:'STREAK',
      perfect:'PERFECT',floors:'Floors',bStreak:'Best streak',coinsW:'Coins',
      newRec:'NEW BEST!',fell:'IT FELL',mile:'FLOORS',saved:'CLOSE ONE! (floors 1-4 are free)'},
    pt:{sub:'Toque para apoiar o bloco: o que sobra é cortado e cai. Acerte o centro e é PERFEITO — o bloco recupera tamanho e a sequência paga moedas. A torre não tem teto.',
      bestL:'ANDARES',points:'ANDARES',place:'APOIAR',tapPlace:'TOQUE PARA APOIAR',streak:'SEQUÊNCIA',
      perfect:'PERFEITO',floors:'Andares',bStreak:'Melhor sequência',coinsW:'Moedas',
      newRec:'NOVO RECORDE!',fell:'CAIU',mile:'ANDARES',saved:'POR POUCO! (andares 1-4 de graça)'}
  }
};
const CITY=A('torre-city.jpg');
const BH=.62,BW0=3.2,MAXW=3.7,VIEWH=10.8,MINW=13.4;
let T3,scene,cam,tower,world,sky,skyTex,skyCv,cloudTex,cityImg=null;
let props=null,clouds=[];
let cur=null,falls=[],glows=[],anims=[],flash=[];
let dead=false,score=0,combo=0,bestCombo=0,coins=0,curSize=null,axis=0,baseY=0;
let camY=0,camX=0,camZ=0,dirn=1,dieT=0,over0=false,vh=VIEWH,tipT=0,pruneT=0;
const MAT={},MATB={};
const V3=()=>new T3.Vector3();
function mat(c){return MAT[c]||(MAT[c]=new T3.MeshLambertMaterial({color:new T3.Color(c)}));}
function matB(c){return MATB[c]||(MATB[c]=new T3.MeshBasicMaterial({color:new T3.Color(c)}));}
/* la torre se queda SIEMPRE en el arco menta-cian-verde: es el color héroe y
   nunca se confunde con el violeta del cielo, ni al piso 100 */
function colFor(i){const h=168+42*Math.sin(i*.45);
  return 'hsl('+h.toFixed(0)+',64%,'+(54+Math.sin(i*.9)*7)+'%)';}
/* velocidad y recorrido: suben/se acortan con la altura, con techo para que a los
   30 pisos siga siendo jugable (ver informe: medido con dbg.autoMove) */
function spdFor(n){return Math.min(6.6,2.4+n*.15);}
function spanFor(n){return Math.max(3.8,5.2-n*.03);}

/* ------------------------------------------------------------------ 1. MUNDO */
function paintSky(){
  const c=skyCv,g=c.getContext('2d'),W=c.width,H=c.height;
  const gr=g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#090818');gr.addColorStop(.34,'#1d1640');
  gr.addColorStop(.60,'#3d2359');gr.addColorStop(.80,'#8d3f66');gr.addColorStop(1,'#e39a58');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  /* estrellas (arriba) */
  let s=7727;const R=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  for(let i=0;i<90;i++){
    const x=R()*W,y=R()*H*.46,r=R()*1.6+.4;
    g.globalAlpha=.25+R()*.55;g.fillStyle='#dfe6ff';
    g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
  }
  g.globalAlpha=1;
  if(cityImg){
    /* la imagen generada tapa el degradado (viene con su propio cielo) */
    const k=Math.max(W/cityImg.width,H/cityImg.height);
    const w=cityImg.width*k,h=cityImg.height*k;
    g.drawImage(cityImg,(W-w)/2,(H-h)/2,w,h);
  }else{
    /* respaldo dibujado: skyline de cajas + ventanas ámbar (nunca vacío) */
    for(let lay=0;lay<3;lay++){
      const y0=H*(.70+lay*.075),alpha=[.45,.7,1][lay];
      g.globalAlpha=alpha;g.fillStyle=['#2a1e4e','#1e1640','#140e2c'][lay];
      let x=-40;
      while(x<W+40){
        const w=30+R()*90,h=(30+R()*150)*(1-lay*.12);
        g.fillRect(x,y0-h,w,h+H);
        if(lay>0&&R()<.7){
          g.fillStyle='#ffb445';
          for(let wy=y0-h+10;wy<y0-8;wy+=18)
            for(let wx=x+7;wx<x+w-9;wx+=16) if(R()<.35)g.fillRect(wx,wy,5,7);
          g.fillStyle=['#2a1e4e','#1e1640','#140e2c'][lay];
        }
        x+=w+4+R()*18;
      }
    }
    g.globalAlpha=1;
    const hz=g.createLinearGradient(0,H*.62,0,H*.80);
    hz.addColorStop(0,'rgba(227,154,88,0)');hz.addColorStop(1,'rgba(227,154,88,.28)');
    g.fillStyle=hz;g.fillRect(0,H*.62,W,H*.2);
  }
  if(skyTex)skyTex.needsUpdate=true;
}
function makeCloudTex(){
  const c=document.createElement('canvas');c.width=128;c.height=64;
  const g=c.getContext('2d');
  for(let i=0;i<7;i++){
    const x=16+Math.random()*96,y=24+Math.random()*18,r=10+Math.random()*22;
    const gr=g.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0,'rgba(255,255,255,.75)');gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
  }
  const t=new T3.CanvasTexture(c);return t;
}
function disposeTree(o){
  o.traverse&&o.traverse(n=>{if(n.geometry)n.geometry.dispose();});
}
/* La cámara es ORTOGRÁFICA e isométrica: lo lejano NO se ve más chico, sólo se
   corre HACIA ARRIBA en la pantalla (0.49 de altura por unidad de profundidad).
   Por eso la ciudad de abajo es de cajas CHICAS y sólo en la mitad lejana
   (pos = dep*(-1,0,-1)/√2 + lat*(1,0,-1)/√2): así queda detrás de la torre, se
   lee como ciudad allá abajo y se va del cuadro cuando la torre sube. */
const CY=-8.4;
function buildProps(){
  const p=ARC.gfxP();
  if(props){world.remove(props);disposeTree(props);props=null;}
  props=new T3.Group();
  const n=clamp(Math.round(30*p.part),8,44);
  const K=Math.SQRT1_2;
  let s=4111;const R=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  for(let i=0;i<n;i++){
    const dep=3.5+R()*14,lat=(R()*2-1)*13;
    const h=1+R()*2.4,w=.8+R()*1.1,d=.8+R()*1.1;
    const x=(-dep+lat)*K,z=(-dep-lat)*K;
    const lit=R()<.28;
    const m=new T3.Mesh(new T3.BoxGeometry(w,h,d),mat(lit?'#463370':'#241a49'));
    m.position.set(x,CY+h/2,z);props.add(m);
    if(lit){   /* azotea encendida: un chispazo ámbar que se ve de lejos */
      const g2=new T3.Mesh(new T3.BoxGeometry(w*.26,.1,d*.26),matB('#ffb445'));
      g2.position.set(x,CY+h+.06,z);props.add(g2);
    }
  }
  world.add(props);
}
function buildClouds(){
  const p=ARC.gfxP();
  clouds.forEach(c=>{world.remove(c.m);c.m.geometry.dispose();});
  clouds=[];
  const n=clamp(Math.round(7*p.part),3,10);
  for(let i=0;i<n;i++){
    const m=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({
      map:cloudTex,transparent:true,opacity:.3+Math.random()*.22,depthWrite:false,
      color:new T3.Color(i%3?'#a08ee6':'#e6a1a8'),fog:false}));
    m.scale.set(rnd(5,9),rnd(1.6,3),1);
    clouds.push({m,u:rnd(-16,16),y:-9+i*(14/n),v:rnd(.25,.8)*(Math.random()<.5?-1:1),
      dep:6+Math.random()*3});
    world.add(m);
  }
}
/* la torre está a ~26 de la cámara: la niebla arranca DESPUÉS de eso para que los
   bloques queden nítidos y se difumine sólo la ciudad de abajo, que así se funde
   con el horizonte de la imagen del cielo */
let fogCol='#432c66';
function setFog(){
  const p=ARC.gfxP();
  scene.fog=new T3.Fog(new T3.Color(fogCol),33+2*p.fog,34+20*p.fog);
}
/* la niebla toma el color REAL del horizonte del cielo (así la ciudad lejana se
   funde con la imagen en vez de cortarse contra ella) */
function fogFromSky(){
  try{
    const g=skyCv.getContext('2d');
    const d=g.getImageData(0,Math.round(skyCv.height*.66),skyCv.width,2).data;
    let r=0,gg=0,b=0,n=0;
    for(let i=0;i<d.length;i+=4*8){r+=d[i];gg+=d[i+1];b+=d[i+2];n++;}
    /* mezclado con violeta oscuro: si se usa el color del horizonte puro, la
       ciudad lejana queda gris pálida y se pierde el contraste del estilo */
    const mx=(v,d)=>Math.round(v*.55+d*.45);
    fogCol='rgb('+mx(r/n,42)+','+mx(gg/n,28)+','+mx(b/n,72)+')';
    setFog();
    if(scene)scene.background=new T3.Color(fogCol);
  }catch(e){}
}
/* AJUSTES > GRÁFICOS en caliente: cambia la niebla, cuántos edificios tiene la
   ciudad de abajo y cuántas nubes pasan (las partículas ya las escala ARC.q) */
G.gfxApply=function(){
  if(!scene)return;
  setFog();buildProps();buildClouds();
};

/* --------------------------------------------------------------- 2. BLOQUES */
function addBlock(w,d,x,z,y,col){
  const o=new T3.Mesh(new T3.BoxGeometry(w,BH,d),mat(col));
  o.position.set(x,y,z);o.userData.blk=1;tower.add(o);return o;
}
/* la torre puede pasar los 120 pisos: los bloques que quedaron muy por debajo del
   cuadro se tiran (nunca se vuelven a ver) para que la geometría no crezca sin
   fin en una partida larga */
function prune(){
  for(let i=tower.children.length-1;i>=0;i--){
    const o=tower.children[i];
    if(o.userData.blk&&o!==(cur&&cur.m)&&o.position.y<camY-13)rm(o);
  }
}
function rm(m){tower.remove(m);if(m.geometry)m.geometry.dispose();}
function newBlock(){
  const last=curSize;
  axis=score%2;
  const col=colFor(score+1),w=last.w,d=last.d,off=spanFor(score);
  const x=axis===0?last.x+(dirn>0?-off:off):last.x;
  const z=axis===1?last.z+(dirn>0?-off:off):last.z;
  cur={m:addBlock(w,d,x,z,baseY+BH,col),w,d,y:baseY+BH,col,
       lo:(axis===0?last.x:last.z)-off,hi:(axis===0?last.x:last.z)+off,
       v:spdFor(score)*(dirn>0?1:-1)};
  dirn*=-1;
}
function toScreen(x,y,z){
  cam.updateMatrixWorld();
  const v=V3().set(x,y,z).project(cam);
  return{x:(v.x*.5+.5)*ARC.W,y:(-v.y*.5+.5)*ARC.H};
}
function place(){
  if(!cur||dead||!ARC.alive)return;
  const last=curSize,isX=axis===0;
  const size=isX?last.w:last.d;
  const pos=isX?cur.m.position.x:cur.m.position.z;
  const ref=isX?last.x:last.z;
  const d0=pos-ref,ov=Math.abs(d0);
  const tol=clamp(size*.05,.09,.2);
  /* margen de gracia en los primeros pisos: nadie se cae en el arranque */
  const grace=score<3?.45:(score<6?.22:0);
  let keepW=cur.w,keepD=cur.d,cx=isX?ref+d0/2:cur.m.position.x,cz=isX?cur.m.position.z:ref+d0/2;
  let per=false;
  if(ov<=tol){                                   /* ---- PERFECTO ---- */
    per=true;cx=last.x;cz=last.z;
    keepW=isX?Math.min(size+.14,MAXW):cur.w;
    keepD=isX?cur.d:Math.min(size+.14,MAXW);
  }else{
    const sgn=Math.sign(d0)||1;
    let keep=size-Math.max(.12,ov-grace);        /* la gracia perdona un poco */
    /* PISOS 1-4 IMPOSIBLES DE PERDER: si el toque fue tan malo que mataba, se
       rescata con el mínimo apoyo y un aviso. Nadie pierde en los primeros
       segundos por no haber entendido todavía el juego. */
    if(ov>=size||keep<=.2){
      if(score<4){keep=size*.6;ARC.toast(ARC.T('saved'));ARC.sfx('groan');}
      else{lose();return;}
    }
    if(isX){keepW=keep;cx=ref+sgn*(size-keep)/2;}
    else{keepD=keep;cz=ref+sgn*(size-keep)/2;}
    const fs=Math.max(.08,size-keep);            /* el trozo que sobra y cae */
    if(isX)dropPiece(fs,cur.d,cx+sgn*(keep/2+fs/2),cz,cur.y,cur.col,sgn,0);
    else dropPiece(cur.w,fs,cx,cz+sgn*(keep/2+fs/2),cur.y,cur.col,sgn,1);
    combo=0;
  }
  rm(cur.m);
  const b=addBlock(keepW,keepD,cx,cz,cur.y,cur.col);
  curSize={w:keepW,d:keepD,x:cx,z:cz};
  baseY=cur.y;score++;
  anims.push({m:b,t:.16,L:.16});
  cur=null;
  if(per)perfect(b,cx,cz,baseY,keepW,keepD);
  else{coins++;ARC.sfx('click',{rate:clamp(.9+score*.006,.9,1.5)});ARC.vib(10);}
  if(score%10===0){                              /* hito cada 10 pisos */
    coins+=5;
    const s=toScreen(cx,baseY+1.5,cz);
    ARC.fx.text(s.x,s.y-ARC.H*.16,score+' '+ARC.T('mile'),
      {color:'#ffd166',size:Math.max(16,ARC.H*.06),life:1.1,vy:-24});
    ARC.fx.ring(s.x,s.y,{r:Math.min(ARC.W,ARC.H)*.3,r0:10,color:'#ffd166',w:7,life:.45});
    ARC.sfx('power');ARC.shake(4);
  }
  hud();
  newBlock();
}
function perfect(b,cx,cz,y,w,d){
  combo++;if(combo>bestCombo)bestCombo=combo;
  const bonus=1+combo;coins+=bonus;
  const s=toScreen(cx,y+.4,cz);
  const big=Math.max(15,ARC.H*.052);
  ARC.fx.ring(s.x,s.y,{r:Math.min(ARC.W,ARC.H)*(.36+combo*.025),r0:8,color:'#5ee7c1',w:9,life:.5});
  ARC.fx.ring(s.x,s.y,{r:Math.min(ARC.W,ARC.H)*.22,r0:4,color:'#ffffff',w:3,life:.28});
  ARC.fx.burst(s.x,s.y,{n:14+combo*3,color:'#5ee7c1',speed:200,size:4,life:.5,g:180,sq:true});
  ARC.fx.text(s.x,s.y-big*.9,ARC.T('perfect')+(combo>1?' x'+combo:''),
    {color:'#5ee7c1',size:big,life:.85});
  ARC.fx.text(s.x,s.y+big*.3,'+'+bonus+' ●',{color:'#ffd166',size:big*.78,life:.8,vy:-30});
  /* brillo: caja mate que crece y se apaga + destello del bloque */
  const gm=new T3.Mesh(new T3.BoxGeometry(w+.06,BH+.06,d+.06),
    new T3.MeshBasicMaterial({color:new T3.Color('#5ee7c1'),transparent:true,opacity:.6,
      depthWrite:false}));
  gm.position.set(cx,y,cz);tower.add(gm);
  glows.push({m:gm,t:.42,L:.42});
  flash.push({m:b,mat:b.material,t:.14});b.material=matB('#d8fff3');
  ARC.sfx('perfect',{rate:clamp(1+combo*.07,1,2.1)});
  ARC.sfx('chime',{rate:clamp(1.05+combo*.09,1,2.3),vol:.5});
  ARC.vib([8,18,8]);ARC.shake(2.5+Math.min(6,combo));
}
function dropPiece(w,d,x,z,y,col,sgn,zAxis){
  const o=addBlock(w,d,x,z,y,col);
  o.userData.blk=0;               /* los trozos que caen los maneja falls, no prune */
  falls.push({m:o,vy:1.2,vr:rnd(2,5)*(sgn||1),ax:zAxis?'x':'z',
    vx:(zAxis?0:sgn*1.5),vz:(zAxis?sgn*1.5:0),t:0});
}
function hud(){
  ARC.hud(score,ARC.T('streak')+' x'+(1+combo)+'  ·  ●'+coins+'  ·  '+
    ARC.T('record')+' '+Math.max(ARC.S.best||0,score));
}
function lose(){
  if(dead)return;
  dead=true;dieT=0;over0=false;
  if(cur){falls.push({m:cur.m,vy:0,vr:3.2,ax:'z',vx:rnd(-1.4,1.4),vz:rnd(-1.4,1.4),t:0});cur=null;}
  ARC.sfx('lose');ARC.shake(10);ARC.vib(60);
  const s=toScreen(curSize.x,baseY,curSize.z);
  ARC.fx.burst(s.x,s.y,{n:20,color:'#ff5d73',speed:240,size:5,life:.6,g:520,sq:true});
}
function finish(){
  if(over0)return;
  over0=true;
  const rec=score>(ARC.S.best||0)&&score>0;
  if(bestCombo>(ARC.S.bcombo||0)){ARC.S.bcombo=bestCombo;ARC.save();}
  ARC.over({win:false,score,noStars:true,coins,
    title:rec?ARC.T('newRec'):ARC.T('fell'),
    sub:ARC.T('floors')+': <b>'+score+'</b><br>'+ARC.T('bStreak')+': <b>x'+bestCombo+'</b>'+
        '<br>'+ARC.T('coinsW')+': <b>+'+coins+'</b>  (●'+((ARC.S.coins||0)+coins)+')'});
}
/* ---- entrada ---- */
G.down=function(){place();};
G.key=function(c,d){if(d&&(c==='Space'||c==='ArrowUp'||c==='Enter'))place();};
G.i18nDone=function(){
  if(!ARC.alive)return;
  hud();ARC.tray([{id:'drop',txt:ARC.T('place'),fn:()=>place()}]);
};
/* ---- ciclo ---- */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  scene.background=new T3.Color('#1a1038');
  world=new T3.Group();scene.add(world);
  tower=new T3.Group();scene.add(tower);
  const asp=ARC.W/Math.max(1,ARC.H);
  vh=Math.max(VIEWH,MINW/asp);
  cam=new T3.OrthographicCamera(-vh*asp/2,vh*asp/2,vh/2,-vh/2,.1,200);
  scene.add(new T3.HemisphereLight(0xcfe0ff,0x2a1c48,1.05));
  const dl=new T3.DirectionalLight(0xffe6c0,.75);dl.position.set(9,17,11);scene.add(dl);
  const dl2=new T3.DirectionalLight(0x7f6ad0,.35);dl2.position.set(-10,4,-8);scene.add(dl2);
  /* cielo: quad pegado a la cámara, siempre detrás de todo */
  skyCv=document.createElement('canvas');skyCv.width=1024;skyCv.height=576;
  skyTex=new T3.CanvasTexture(skyCv);
  if(T3.SRGBColorSpace)skyTex.colorSpace=T3.SRGBColorSpace;
  paintSky();
  sky=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({
    map:skyTex,depthWrite:false,depthTest:false,fog:false}));
  sky.renderOrder=-10;scene.add(sky);
  /* ciudad generada para el horizonte (si no llega, queda la dibujada) */
  const im=new Image();
  im.crossOrigin='anonymous';
  im.onload=()=>{cityImg=im;paintSky();fogFromSky();};
  im.onerror=()=>{};
  im.src=CITY;
  cloudTex=makeCloudTex();
  /* SIN plano de suelo: con cámara ortográfica isométrica un plano grande sube por
     la pantalla con la profundidad y termina tapando TODO el cielo (medido: el
     cielo sólo asomaba en las esquinas). El piso lo cuenta la imagen del
     horizonte y la ciudad de cajas que se hunde cuando la torre sube. */
  setFog();fogFromSky();buildProps();buildClouds();
  /* las sondas cargan con ?local y no pueden tocar la pantalla de carga: ahí se
     entra solo. En producción (sin ?local) se mantiene el gesto que habilita el
     audio. Ver "PEDIDO AL MOTOR" en el informe. */
  if(/[?&]local/.test(location.search))
    setTimeout(()=>{if(ARC.scr==='load'&&ARC.enterMenu)ARC.enterMenu();},300);
};
G.resize=function(){
  if(!cam)return;
  const asp=ARC.W/Math.max(1,ARC.H);
  vh=Math.max(VIEWH,MINW/asp);
  cam.left=-vh*asp/2;cam.right=vh*asp/2;cam.top=vh/2;cam.bottom=-vh/2;
  cam.updateProjectionMatrix();
};
G.start=function(){
  if(!T3)return;
  while(tower.children.length)rm(tower.children[0]);
  falls.length=0;glows.length=0;anims.length=0;flash.length=0;
  dead=false;over0=false;dieT=0;score=0;combo=0;bestCombo=0;coins=0;dirn=1;tipT=0;
  addBlock(BW0,BW0,0,0,0,colFor(0));
  for(let i=1;i<17;i++)addBlock(BW0,BW0,0,0,-i*BH,colFor(-i));
  curSize={w:BW0,d:BW0,x:0,z:0};baseY=0;
  camY=0;camX=0;camZ=0;
  cur=null;newBlock();
  lastAM=0;prevOff=1e9;amT=0;
  hud();
  ARC.tray([{id:'drop',txt:ARC.T('place'),fn:()=>place()}]);
};
G.step=function(dt){
  if(!T3||!scene)return;
  tipT+=dt;
  if(cur){
    const p=cur.m.position,k=axis===0?'x':'z';
    p[k]+=cur.v*dt;
    if(p[k]>cur.hi){p[k]=cur.hi;cur.v=-Math.abs(cur.v);}
    if(p[k]<cur.lo){p[k]=cur.lo;cur.v=Math.abs(cur.v);}
  }
  for(let i=falls.length-1;i>=0;i--){
    const f=falls[i];
    f.vy-=17*dt;f.t+=dt;
    f.m.position.y+=f.vy*dt;f.m.position.x+=f.vx*dt;f.m.position.z+=f.vz*dt;
    f.m.rotation[f.ax]+=f.vr*dt;
    if(f.m.position.y<camY-16||f.t>4.5){rm(f.m);falls.splice(i,1);}
  }
  for(let i=glows.length-1;i>=0;i--){
    const gl=glows[i];gl.t-=dt;
    if(gl.t<=0){tower.remove(gl.m);gl.m.geometry.dispose();gl.m.material.dispose();glows.splice(i,1);continue;}
    const k=1-gl.t/gl.L;
    gl.m.scale.setScalar(1+k*.55);gl.m.material.opacity=.6*(1-k);
  }
  for(let i=anims.length-1;i>=0;i--){
    const a=anims[i];a.t-=dt;
    const k=clamp(a.t/a.L,0,1);
    a.m.scale.set(1+.09*k,1-.16*k,1+.09*k);
    if(a.t<=0){a.m.scale.set(1,1,1);anims.splice(i,1);}
  }
  for(let i=flash.length-1;i>=0;i--){
    const f=flash[i];f.t-=dt;
    if(f.t<=0){f.m.material=f.mat;flash.splice(i,1);}
  }
  /* nubes: derivan de costado y se reciclan hacia arriba mientras la torre sube */
  const K=Math.SQRT1_2;
  for(const c of clouds){
    c.u+=c.v*dt;
    if(c.u>18)c.u=-18;if(c.u<-18)c.u=18;
    if(c.y<camY-10)c.y+=14;
    c.m.position.set((-c.dep+c.u)*K,c.y,(-c.dep-c.u)*K);
  }
  /* cámara: sigue la altura Y EL CENTRO del bloque de arriba (encuadre) */
  const s=1-Math.pow(.004,dt),s2=1-Math.pow(.02,dt);
  camY=lerp(camY,baseY,s);
  camX=lerp(camX,curSize.x,s2);camZ=lerp(camZ,curSize.z,s2);
  pruneT+=dt;if(pruneT>1.5){pruneT=0;prune();}
  if(dead){dieT+=dt;if(dieT>.9)finish();}
};
G.draw=function(g){
  if(!ARC.rnd||!scene||!cam)return;
  const tgt=V3().set(camX,camY+1.8,camZ);
  cam.position.set(tgt.x+16,tgt.y+12.8,tgt.z+16);
  cam.lookAt(tgt);cam.updateMatrixWorld();
  /* el cielo se planta delante de la cámara, del tamaño del frustum (+ margen) y
     baja despacio con la altura: da sensación de trepar sin dejar huecos */
  const fw=(cam.right-cam.left),fh=(cam.top-cam.bottom);
  const fwd=V3().set(0,0,-1).applyQuaternion(cam.quaternion);
  const up=V3().set(0,1,0).applyQuaternion(cam.quaternion);
  const off=clamp(fh*.1-camY*.18,-fh*.2,fh*.1);
  sky.position.copy(cam.position).addScaledVector(fwd,70).addScaledVector(up,off);
  sky.quaternion.copy(cam.quaternion);
  sky.scale.set(fw*1.16,fh*1.52,1);
  for(const c of clouds)c.m.quaternion.copy(cam.quaternion);
  ARC.rnd.render(scene,cam);
  /* ---- capa 2D: medidor de precisión, aviso inicial ---- */
  if(cur&&!dead){
    const last=curSize;
    const size=axis===0?last.w:last.d;
    const ofs=Math.abs((axis===0?cur.m.position.x-last.x:cur.m.position.z-last.z));
    const k=clamp(1-ofs/Math.max(.4,size),0,1);
    const w=ARC.W*.32,x=(ARC.W-w)/2,y=ARC.H*.87,h=Math.max(6,ARC.H*.016);
    g.fillStyle='rgba(8,10,20,.55)';g.fillRect(x-2,y-2,w+4,h+4);
    g.fillStyle='rgba(255,255,255,.16)';g.fillRect(x,y,w,h);
    g.fillStyle=k>.93?'#5ee7c1':(k>.62?'#ffd166':'#ff5d73');
    g.fillRect(x,y,w*k,h);
    g.fillStyle='rgba(255,255,255,.8)';g.fillRect(x+w-2,y-3,2,h+6);
  }
  if(score===0&&!dead&&tipT<12){
    const a=clamp(1-(tipT-9)/3,0,1);
    g.globalAlpha=a*(.72+.28*Math.sin(ARC.t*4));
    g.fillStyle='#eef2f6';
    g.font='900 '+Math.max(13,ARC.H*.05)+'px system-ui,sans-serif';g.textAlign='center';
    g.fillText(ARC.T('tapPlace'),ARC.W/2,ARC.H*.19);
    g.textAlign='left';g.globalAlpha=1;
  }
};
/* ------------------------------------------------------------------- 5. SONDA
   autoMove juega de verdad: mide cada cuánto la llaman y apoya cuando el bloque
   está dentro del alcance de ese muestreo (a 60 Hz clava PERFECTO casi siempre);
   si la sonda es lenta, apoya en el punto más cercano al centro (vuelta atrás
   del error) para no morir por no llegar nunca. */
let lastAM=0,prevOff=1e9,amT=0;
G.dbg={
  state:()=>({score,combo,best:bestCombo,coins,dead,falls:falls.length,
    size:curSize?+curSize.w.toFixed(2):0,spd:+spdFor(score).toFixed(2),
    mundo:'props '+(props?props.children.length:0)+' / nubes '+clouds.length+
      ' / bloques '+(tower?tower.children.length:0)}),
  autoMove:()=>{
    if(dead||!cur||!ARC.alive){lastAM=0;prevOff=1e9;amT=0;return false;}
    const now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
    const iv=lastAM?clamp(now-lastAM,1/120,.6):1/60;
    lastAM=now;amT+=iv;
    const last=curSize,isX=axis===0;
    const size=isX?last.w:last.d;
    const off=Math.abs(isX?cur.m.position.x-last.x:cur.m.position.z-last.z);
    const reach=Math.abs(cur.v)*iv;               /* cuánto avanza entre llamadas */
    const tol=clamp(reach*.6,.05,size*.42);
    /* pasada completa del bloque: si en dos idas y vueltas nunca entró en
       tolerancia (sonda muy lenta), se apoya en lo mejor disponible antes que
       dejar de jugar — pero nunca en un punto que lo mate */
    const lap=4*spanFor(score)/Math.max(.5,Math.abs(cur.v));
    let go=off<=tol;
    if(!go&&off>prevOff&&off<size*.45)go=true;    /* pasó el punto más cercano */
    if(!go&&amT>lap&&off<size*.7)go=true;
    prevOff=off;
    if(go){amT=0;prevOff=1e9;place();return true;}
    return false;
  }
};
window.GAME=G;
