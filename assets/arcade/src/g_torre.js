/* ============================================================================
   TORRE LOCA — apilar bloques que se deslizan, cortando el sobrante
   ----------------------------------------------------------------------------
   Un bloque va y viene sobre la torre; al tocar la pantalla se apoya. Lo que
   sobresale se CORTA y se cae; lo que pisa queda. Si clavás el centro es
   PERFECTO: anillo + brillo + tono más agudo, el bloque recupera tamaño y la
   racha paga monedas. Los ejes alternan (X, Z, X, Z...), la velocidad sube y el
   recorrido se acorta con la altura. Sin niveles: es de récord.

   MUNDO: un cielo VERTICAL de 2048 px (ciudad generada + brillo de horizonte abajo,
   degradado violeta, nebulosas, luna y estrellas arriba) del que se ve una ventana
   que sube con la torre: se ve mundo en el piso 1 y en el 100, y se siente que se
   trepa. Más una ciudad de cajas 3D en la banda baja de la pantalla (con
   perspectiva falsa, porque la cámara es ortográfica), jirones de nube y niebla del
   color exacto del cielo que se está viendo. Todo escala con ARC.gfxP().
   ENCUADRE: la cámara sigue el CENTRO del bloque de arriba (x/z, no sólo la
   altura), así la torre nunca se va del cuadro aunque los cortes la corran
   (medido con dbg.enc(): la cima queda en x=0.50 y en y=0.60-0.64 de la pantalla
   del piso 1 al 160, y los extremos del recorrido nunca pasan de 0.34/0.66).
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
       groan:A('sfx-groan.mp3'),
       perfect:A('sfx-torre-perfect.mp3'),drop:A('sfx-torre-drop.mp3')},
  i18n:{
    es:{sub:'Tocá para apoyar el bloque: lo que sobra se corta y se cae. Si clavás el centro es PERFECTO, el bloque recupera tamaño y la racha paga monedas. La torre no tiene techo.',
      bestL:'PISOS',points:'PISOS',place:'APOYAR',tapPlace:'TOCÁ PARA APOYAR',streak:'RACHA',
      perfect:'PERFECTO',floors:'Pisos',bStreak:'Mejor racha',coinsW:'Monedas',
      newRec:'¡NUEVO RÉCORD!',fell:'SE CAYÓ',mile:'PISOS',saved:'¡AL FILO! (los primeros 6 pisos son regalados)'},
    en:{sub:'Tap to drop the block: whatever sticks out is sliced off and falls. Nail the centre for a PERFECT — the block grows back and the streak pays coins. The tower has no ceiling.',
      bestL:'FLOORS',points:'FLOORS',place:'DROP',tapPlace:'TAP TO DROP',streak:'STREAK',
      perfect:'PERFECT',floors:'Floors',bStreak:'Best streak',coinsW:'Coins',
      newRec:'NEW BEST!',fell:'IT FELL',mile:'FLOORS',saved:'CLOSE ONE! (the first 6 floors are free)'},
    pt:{sub:'Toque para apoiar o bloco: o que sobra é cortado e cai. Acerte o centro e é PERFEITO — o bloco recupera tamanho e a sequência paga moedas. A torre não tem teto.',
      bestL:'ANDARES',points:'ANDARES',place:'APOIAR',tapPlace:'TOQUE PARA APOIAR',streak:'SEQUÊNCIA',
      perfect:'PERFEITO',floors:'Andares',bStreak:'Melhor sequência',coinsW:'Moedas',
      newRec:'NOVO RECORDE!',fell:'CAIU',mile:'ANDARES',saved:'POR POUCO! (os 6 primeiros andares são de graça)'}
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
function colFor(i){const h=163+32*Math.sin(i*.45);
  return 'hsl('+h.toFixed(0)+',64%,'+(54+Math.sin(i*.9)*7)+'%)';}
/* velocidad y recorrido: suben/se acortan con la altura, con techo para que a los
   30 pisos siga siendo jugable (ver informe: medido con dbg.autoMove) */
function spdFor(n){return Math.min(6.6,2.4+n*.15);}
function spanFor(n){return Math.max(3.8,5.2-n*.03);}

/* ------------------------------------------------------------------ 1. MUNDO
   El cielo NO es una imagen fija: es un lienzo ALTO (1024x2048) que contiene el
   mundo entero de abajo arriba —ciudad + brillo del horizonte, degradado violeta,
   nebulosas, luna y campo de estrellas— y del que se muestra una VENTANA de 1/2.9
   que sube con la altura de la torre. Así se ve mundo en todos los pisos (antes,
   medido con capturas, a partir del piso ~10 quedaba un lavanda plano y vacío) y
   además se siente que se trepa. La ciudad se mueve MUCHO menos que la ciudad de
   cajas 3D: es paralaje, está lejos. */
const SKYW=1024,SKYH=2048,SKYIMG=580,WIN=1/2.9;
let FOGB=null;
/* cuánto se ensancha la ventana del lienzo al cubrir el frustum */
function skyStretch(){
  const asp=ARC.W/Math.max(1,ARC.H);
  return asp/(SKYW/(SKYH*WIN));
}
function paintSky(){
  const c=skyCv,g=c.getContext('2d'),W=SKYW,H=SKYH;
  let s=7727;const R=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  const y0=H-SKYIMG;                 /* el cielo propio va de 0 a y0 */
  let topc='#241a4a';                /* con qué color empalma la franja de ciudad */
  /* se pinta TODO el lienzo de arranque: un solo píxel transparente en el cielo
     sale NEGRO en pantalla (el material no es transparente). Pasó de verdad: sin la
     imagen de ciudad quedaba una banda negra cruzando el cuadro. */
  g.fillStyle='#140e2c';g.fillRect(0,0,W,H);
  if(cityImg){
    /* la imagen tiene la misma proporción que la franja: entra sin deformarse */
    g.drawImage(cityImg,0,y0,W,SKYIMG);
    try{const d=g.getImageData(3,y0+3,1,1).data;topc='rgb('+d[0]+','+d[1]+','+d[2]+')';}catch(e){}
  }
  /* degradado: noche profunda arriba -> violeta -> el color con el que sigue la
     franja de ciudad. NUNCA negro puro: el negro se lee como "falta el fondo" */
  const gr=g.createLinearGradient(0,0,0,y0);
  gr.addColorStop(0,'#0b0d24');gr.addColorStop(.30,'#111033');
  gr.addColorStop(.62,'#1d1544');gr.addColorStop(1,topc);
  g.fillStyle=gr;g.fillRect(0,0,W,y0);
  /* nebulosas suaves: manchas de color para que la parte alta tenga algo que ver */
  for(let i=0;i<5;i++){
    const x=R()*W,y=R()*y0*.9,r=180+R()*260;
    const rg=g.createRadialGradient(x,y,0,x,y,r);
    const col=i%2?'94,231,193':'150,120,235';
    rg.addColorStop(0,'rgba('+col+',.13)');rg.addColorStop(1,'rgba('+col+',0)');
    g.fillStyle=rg;g.fillRect(x-r,y-r,r*2,r*2);
  }
  if(!cityImg){
    /* respaldo dibujado: la MISMA franja que ocuparía la imagen, entera —degradado
       que empalma con el cielo, brillo de horizonte y skyline de cajas con ventanas
       ámbar— para que no quede ni un hueco si la imagen no llega */
    const gb=g.createLinearGradient(0,y0,0,H);
    gb.addColorStop(0,topc);gb.addColorStop(.5,'#3b2a5c');
    gb.addColorStop(.72,'#b9d6c4');gb.addColorStop(.82,'#332452');
    gb.addColorStop(1,'#140e2c');
    g.fillStyle=gb;g.fillRect(0,y0,W,SKYIMG);
    for(let lay=0;lay<3;lay++){
      const yb=H-SKYIMG*(.28-lay*.075);
      g.globalAlpha=[.5,.75,1][lay];g.fillStyle=['#2a1e4e','#1e1640','#140e2c'][lay];
      let x=-40;
      while(x<W+40){
        const w=30+R()*90,h=(30+R()*110)*(1-lay*.12);
        g.fillRect(x,yb-h,w,h+SKYIMG);
        if(lay>0&&R()<.7){
          g.fillStyle='#ffb445';
          for(let wy=yb-h+10;wy<yb-8;wy+=18)
            for(let wx=x+7;wx<x+w-9;wx+=16) if(R()<.35)g.fillRect(wx,wy,5,7);
          g.fillStyle=['#2a1e4e','#1e1640','#140e2c'][lay];
        }
        x+=w+4+R()*18;
      }
    }
    g.globalAlpha=1;
  }
  /* luna: entra en cuadro alrededor del piso 16 y acompaña hasta el ~100.
     La ventana del lienzo (1024 x 706) se estira para cubrir un frustum mucho más
     ancho, así que TODO sale ensanchado ~1.45x: la luna se dibuja aplastada a mano
     (SX) para que en pantalla salga redonda. Se repinta al cambiar de tamaño. */
  const SX=clamp(1/skyStretch(),.45,1);
  const mx=W*.74,my=y0*.75,mr=46;
  g.save();g.translate(mx,my);g.scale(SX,1);
  const hg=g.createRadialGradient(0,0,mr*.7,0,0,mr*4.2);
  hg.addColorStop(0,'rgba(226,236,255,.30)');hg.addColorStop(1,'rgba(226,236,255,0)');
  g.fillStyle=hg;g.beginPath();g.arc(0,0,mr*4.2,0,Math.PI*2);g.fill();
  g.fillStyle='#eef2ff';g.beginPath();g.arc(0,0,mr,0,Math.PI*2);g.fill();
  g.fillStyle='rgba(180,196,232,.55)';
  g.beginPath();g.arc(-14,-10,9,0,Math.PI*2);g.fill();
  g.beginPath();g.arc(12,14,13,0,Math.PI*2);g.fill();
  g.restore();
  /* estrellas: más densas y más grandes hacia arriba */
  for(let i=0;i<330;i++){
    const y=Math.pow(R(),1.7)*y0,x=R()*W;
    const r=(R()*1.5+.45)*(1.35-y/y0*.5);
    g.globalAlpha=(.22+R()*.66)*clamp(1.15-y/y0*.62,.4,1);
    g.fillStyle=R()<.18?'#ffe7bb':'#e8eeff';
    g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
  }
  /* seis estrellas con destello en cruz: dan escala al campo */
  for(let i=0;i<6;i++){
    const x=R()*W,y=R()*y0*.7,r=2.6+R()*1.6;
    g.globalAlpha=.85;g.fillStyle='#ffffff';
    g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
    g.globalAlpha=.35;g.strokeStyle='#ffffff';g.lineWidth=1.4;
    g.beginPath();g.moveTo(x-r*4,y);g.lineTo(x+r*4,y);
    g.moveTo(x,y-r*4);g.lineTo(x,y+r*4);g.stroke();
  }
  g.globalAlpha=1;
  buildFogBands();
  if(skyTex)skyTex.needsUpdate=true;
}
/* tabla de 48 colores promedio (una por banda horizontal del lienzo) para que la
   niebla y el fondo del renderer sean SIEMPRE el color del cielo que se está
   viendo: así la ciudad de cajas se funde con el horizonte en vez de cortarse */
function buildFogBands(){
  try{
    const g=skyCv.getContext('2d');FOGB=[];
    for(let i=0;i<48;i++){
      const y=clamp(Math.round((i+.5)/48*SKYH),0,SKYH-1);
      const d=g.getImageData(0,y,SKYW,1).data;
      let r=0,gg=0,b=0,n=0;
      for(let k=0;k<d.length;k+=4*16){r+=d[k];gg+=d[k+1];b+=d[k+2];n++;}
      FOGB.push([r/n,gg/n,b/n]);
    }
  }catch(e){FOGB=null;}
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
/* La cámara es ORTOGRÁFICA e isométrica y NO gira: la altura en pantalla de un
   punto es una función lineal fija de su profundidad y su Y. camCoef() la mide
   sobre la cámara real: alto_pantalla = a*profundidad + b*(y - centro). Con eso la
   ciudad de abajo se coloca por su POSICIÓN EN PANTALLA (banda su, en unidades del
   frustum, 5.4 = media pantalla) en vez de por su Y en el mundo.
   ANTES (medido en las capturas): las cajas se ponían todas en y=CY, y como en
   ortográfica cada unidad de profundidad SUBE 0.49 en pantalla, las más lejanas
   terminaban a media pantalla, del mismo tamaño que la torre y encimadas a ella:
   se leía como un montón de cubos flotando, no como una ciudad allá abajo. */
const CY=-8.4,CAMO=[16,12.8,16];
let COEF={a:.4924,b:.8704};
function camCoef(){
  const d=new T3.Vector3(-CAMO[0],-CAMO[1],-CAMO[2]).normalize();
  const u=new T3.Vector3(0,1,0);u.addScaledVector(d,-u.dot(d)).normalize();
  const K=Math.SQRT1_2;
  COEF={a:new T3.Vector3(-K,0,-K).dot(u),b:u.y};
}
function buildProps(){
  const p=ARC.gfxP();
  if(props){world.remove(props);disposeTree(props);props=null;}
  props=new T3.Group();
  const n=clamp(Math.round(34*p.part),10,52);
  const K=Math.SQRT1_2;
  let s=4111;const R=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  for(let i=0;i<n;i++){
    const dep=4+R()*17;
    let lat=(R()*2-1)*15;
    if(Math.abs(lat)<3.4)lat=(lat<0?-1:1)*(3.4+R()*2);   /* no tapar la torre */
    /* perspectiva FALSA: en ortográfica nada se achica solo, así que lo lejano se
       construye más chico a mano. Sin esto la ciudad compite con la torre. */
    const k=1-dep/29;
    const w=(.75+R()*.95)*k,d=(.75+R()*.95)*k,h=(1.3+R()*3.6)*k;
    /* banda baja de la pantalla: lo más lejano un poco más arriba (eso es la
       profundidad), lo cercano casi al borde de abajo */
    const su=-6.2+(dep-4)/17*3.9;
    const y=(su-COEF.a*dep)/COEF.b+1.8;
    const x=(-dep+lat)*K,z=(-dep-lat)*K;
    const lit=R()<.3;
    const m=new T3.Mesh(new T3.BoxGeometry(w,h,d),mat(lit?'#463370':'#241a49'));
    m.position.set(x,y+h/2,z);props.add(m);
    if(lit){   /* azotea encendida: un chispazo ámbar que se ve de lejos */
      const g2=new T3.Mesh(new T3.BoxGeometry(w*.3,.09,d*.3),matB('#ffb445'));
      g2.position.set(x,y+h+.05,z);props.add(g2);
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
    /* jirones finos y tenues: con nubes grandes y opacas (medido en capturas) el
       cielo alto se llenaba de manchones desenfocados que parecían suciedad */
    const m=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({
      map:cloudTex,transparent:true,opacity:.16+Math.random()*.14,depthWrite:false,
      color:new T3.Color(i%3?'#a08ee6':'#e6a1a8'),fog:false}));
    m.scale.set(rnd(4,7),rnd(1.1,2),1);
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
/* la ventana del cielo sube con la torre y la niebla toma el color REAL de la
   franja que se está viendo (así la ciudad lejana se funde con el cielo en vez de
   cortarse contra él, y sigue funcionando a 100 pisos de altura) */
let fogI=-1;
function skyScroll(){
  if(!skyTex)return;
  const climb=1-Math.exp(-Math.max(0,camY)/50);
  const off=(1-WIN)*climb;
  skyTex.offset.y=off;
  const v=off+WIN*.30;                            /* tercio bajo de lo visible */
  const i=clamp(Math.round((1-v)*47),0,47);
  if(i!==fogI){
    fogI=i;
    const c=FOGB&&FOGB[i];
    if(c){
      /* mezclado con violeta oscuro: con el color del cielo puro la ciudad lejana
         queda gris pálida y se pierde el contraste del estilo */
      const mx=(a,b)=>Math.round(a*.62+b*.38);
      fogCol='rgb('+mx(c[0],38)+','+mx(c[1],26)+','+mx(c[2],66)+')';
      setFog();
      if(scene)scene.background=new T3.Color(fogCol);
    }
  }
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
  /* margen de gracia, que se va cerrando: nadie se cae en el arranque. Medido con
     12 toques seguidos a lo bruto en el primer segundo y medio (ver informe). */
  const grace=score<4?.5:(score<8?.26:(score<12?.12:0));
  let keepW=cur.w,keepD=cur.d,cx=isX?ref+d0/2:cur.m.position.x,cz=isX?cur.m.position.z:ref+d0/2;
  let per=false;
  if(ov<=tol){                                   /* ---- PERFECTO ---- */
    per=true;cx=last.x;cz=last.z;
    keepW=isX?Math.min(size+.14,MAXW):cur.w;
    keepD=isX?cur.d:Math.min(size+.14,MAXW);
  }else{
    const sgn=Math.sign(d0)||1;
    let keep=size-Math.max(.12,ov-grace);        /* la gracia perdona un poco */
    /* PISOS 1-6 IMPOSIBLES DE PERDER: si el toque fue tan malo que mataba, se
       rescata con un apoyo que sigue siendo jugable (nunca menos de 1.15 de ancho:
       con size*0.6 a secas, seis rescates seguidos dejaban un bloque de 0.15 y la
       partida quedaba invencible pero imposible) y un aviso. */
    if(ov>=size||keep<=.22){
      if(score<6){keep=Math.max(size*.62,1.15);ARC.toast(ARC.T('saved'));ARC.sfx('groan');}
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
  /* golpe del bloque al asentarse: sube de tono con la altura. Se usa 'pop' y NO
     'click'/'wood' porque medí los buffers decodificados: click está en silencio
     (pico RMS 0.000) y wood tiene el golpe a 225 ms, o sea llega tarde. 'pop' tiene
     el ataque en los primeros 25 ms, que es lo que hace que se sienta el toque. */
  else{coins++;ARC.sfx('pop',{rate:clamp(.86+score*.008,.86,1.5),vol:1.8});ARC.vib(10);}
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
  /* el anillo crece con la racha pero con TECHO: con .36+combo*.025 a los 20
     perfectos ya era más grande que la pantalla y se veía como una línea recta */
  ARC.fx.ring(s.x,s.y,{r:Math.min(ARC.W,ARC.H)*Math.min(.62,.36+combo*.02),r0:8,
    color:'#5ee7c1',w:9,life:.5});
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
  /* el trozo cortado se desmorona: el sonido propio (piedra) va acá, corto y bajo,
     y en la caída de la torre entero y grave */
  ARC.sfx('drop',{rate:rnd(1.35,1.65),vol:.3});
  const o=addBlock(w,d,x,z,y,col);
  o.userData.blk=0;               /* los trozos que caen los maneja falls, no prune */
  falls.push({m:o,vy:1.2,vr:rnd(2,5)*(sgn||1),ax:zAxis?'x':'z',
    vx:(zAxis?0:sgn*1.5),vz:(zAxis?sgn*1.5:0),t:0});
}
/* la racha se muestra CONTADA (x3 = tres perfectos seguidos) y encendida en el
   color del juego; en 0 queda apagada. Antes decía "x1" con la racha en cero, que
   se leía como si siempre hubiera racha. */
function hud(){
  const st=combo>0
    ?'<b style="color:#5ee7c1">'+ARC.T('streak')+' x'+combo+'</b>'
    :'<span style="opacity:.6">'+ARC.T('streak')+' —</span>';
  ARC.hud(score,st+'  ·  ●'+coins+'  ·  '+
    ARC.T('record')+' '+Math.max(ARC.S.best||0,score));
}
function lose(){
  if(dead)return;
  dead=true;dieT=0;over0=false;
  if(cur){falls.push({m:cur.m,vy:0,vr:3.2,ax:'z',vx:rnd(-1.4,1.4),vz:rnd(-1.4,1.4),t:0});cur=null;}
  /* el derrumbe: sólo la piedra grave. El 'lose' lo toca ARC.over 0.9 s después,
     tocarlo también acá lo hacía sonar dos veces pisado */
  ARC.sfx('drop',{rate:.72,vol:.9});ARC.shake(10);ARC.vib(60);
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
  camCoef();
  /* cielo: quad pegado a la cámara, siempre detrás de todo. El lienzo es ALTO y se
     muestra una ventana que sube con la altura (ver paintSky/skyScroll). */
  skyCv=document.createElement('canvas');skyCv.width=SKYW;skyCv.height=SKYH;
  skyTex=new T3.CanvasTexture(skyCv);
  if(T3.SRGBColorSpace)skyTex.colorSpace=T3.SRGBColorSpace;
  skyTex.wrapS=skyTex.wrapT=T3.ClampToEdgeWrapping;
  skyTex.repeat.set(1,WIN);skyTex.offset.set(0,0);
  paintSky();
  sky=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({
    map:skyTex,depthWrite:false,depthTest:false,fog:false}));
  sky.renderOrder=-10;scene.add(sky);
  /* ciudad generada para el horizonte (si no llega, queda la dibujada) */
  const im=new Image();
  im.crossOrigin='anonymous';
  im.onload=()=>{cityImg=im;paintSky();fogI=-1;skyScroll();};
  im.onerror=()=>{};
  im.src=CITY;
  cloudTex=makeCloudTex();
  /* SIN plano de suelo: con cámara ortográfica isométrica un plano grande sube por
     la pantalla con la profundidad y termina tapando TODO el cielo (medido: el
     cielo sólo asomaba en las esquinas). El piso lo cuenta la imagen del
     horizonte y la ciudad de cajas que se hunde cuando la torre sube. */
  setFog();skyScroll();buildProps();buildClouds();
  /* NO se entra solo al menú, ni con ?local: las dos sondas ahora TOCAN de verdad
     "TOCÁ PARA JUGAR", y entrar solo tapaba justo eso (si el botón dejara de recibir
     el toque, la sonda no se enteraría). Verificado: 18/18 y 28/28 sin el atajo. */
};
let lastStr=0;
G.resize=function(){
  if(!cam)return;
  const asp=ARC.W/Math.max(1,ARC.H);
  vh=Math.max(VIEWH,MINW/asp);
  cam.left=-vh*asp/2;cam.right=vh*asp/2;cam.top=vh/2;cam.bottom=-vh/2;
  cam.updateProjectionMatrix();
  /* el estirado del cielo cambió: hay que repintar la luna con la nueva forma */
  const s=skyStretch();
  if(skyCv&&Math.abs(s-lastStr)>.04){lastStr=s;paintSky();fogI=-1;}
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
  /* el cielo se planta delante de la cámara y cubre EXACTAMENTE el frustum (con
     ortográfica el tamaño no depende de la distancia): la sensación de trepar la da
     la ventana de textura que sube, no el mover el plano — así no hay forma de que
     se abra un hueco por un borde */
  const fw=(cam.right-cam.left),fh=(cam.top-cam.bottom);
  const fwd=V3().set(0,0,-1).applyQuaternion(cam.quaternion);
  sky.position.copy(cam.position).addScaledVector(fwd,70);
  sky.quaternion.copy(cam.quaternion);
  sky.scale.set(fw*1.02,fh*1.02,1);
  skyScroll();
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
  /* encuadre medido en fracciones de pantalla (0..1): dónde cae la cima, dónde la
     base visible y hasta dónde llegan los extremos del recorrido del bloque. Con
     esto se verifica que la torre NUNCA se sale del cuadro (ver informe). */
  enc:()=>{
    if(!cam||!curSize)return null;
    const f=(x,y,z)=>{const s=toScreen(x,y,z);return[+(s.x/ARC.W).toFixed(3),+(s.y/ARC.H).toFixed(3)];};
    const isX=axis===0,lo=cur?cur.lo:0,hi=cur?cur.hi:0;
    const A1=isX?f(lo,baseY+BH,curSize.z):f(curSize.x,baseY+BH,lo);
    const B1=isX?f(hi,baseY+BH,curSize.z):f(curSize.x,baseY+BH,hi);
    return{cima:f(curSize.x,baseY,curSize.z),pie:f(curSize.x,baseY-9*BH,curSize.z),
      ext:[A1,B1],vh:+vh.toFixed(2)};
  },
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
