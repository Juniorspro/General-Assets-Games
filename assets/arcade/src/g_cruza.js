/* ============================================================================
   CRUZA CALLE — saltar de fila en fila esquivando autos, trenes y el río
   ----------------------------------------------------------------------------
   Mundo por FILAS generadas al infinito (pasto, ruta, vías, río). Se salta una
   celda por toque o deslizada. En el río hay que caer sobre un tronco y viajar
   con él; en la ruta y las vías, esquivar. Si te quedás atrás, el águila te
   levanta. Todo el arte es geometría (cubos low-poly), sin modelos que bajar:
   arranca al instante y corre en cualquier celular.
   ========================================================================== */
const G={
  slug:'cruza',name:'CRUZA CALLE',
  title:'CRUZA <em>CALLE</em>',
  sub:'Cruzá rutas, vías y ríos saltando de a una celda. Tocá para avanzar, deslizá para los costados. Si te quedás atrás, te levanta el águila.',
  acc:'#ffd166',acc2:'#f0913a',levels:0,bestLabel:'RÉCORD',
  three:true,sky:'#8fd3ff',shadows:true,portrait:true,
  art:A('art-cruza.jpg'),music:A('mus-cruza.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),
       boom:A('sfx-boom.mp3'),splat:A('sfx-splat.mp3'),power:A('sfx-power.mp3'),click:A('sfx-click.mp3')}
};
let T3,scene,cam,sun,plr,plrG,shadow;
const ROWS=new Map();            /* z -> {type,objs[],cars[],logs[],block:Set,coin} */
const XMIN=-8,XMAX=8;
const AHEAD=26,BEHIND=6;
let px=0,pz=0,hop=null,dead=false,best=0,score=0,coins=0,idleT=0,camZ=0,camX=0;
let farZ=1,trainWarn=new Map(),CAMW=9.4;
const MAT={},GEO={};
function mat(c,o){const k=c+(o||'');if(MAT[k])return MAT[k];
  return MAT[k]=new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function box(w,h,d){const k='b'+w+'_'+h+'_'+d;if(GEO[k])return GEO[k];
  return GEO[k]=new T3.BoxGeometry(w,h,d);}
function m(w,h,d,c,x,y,z,parent){
  const o=new T3.Mesh(box(w,h,d),mat(c));
  o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=false;
  (parent||scene).add(o);return o;
}
/* ---------------------------------------------------------------- mundo */
function rowType(z){
  /* dificultad: al principio casi todo pasto; después más ruta/río/vías */
  const d=Math.min(1,z/240);
  if(z<3)return 'grass';
  const r=Math.random();
  if(r<.30-d*.14)return 'grass';
  if(r<.72-d*.06)return 'road';
  if(r<.86)return 'water';
  return 'rail';
}
function buildRow(z){
  if(ROWS.has(z))return;
  const type=z<3?'grass':rowType(z);   /* las primeras filas y las de atrás: pasto */
  const R={type,z,objs:[],cars:[],logs:[],block:new Set(),coin:-99,dir:Math.random()<.5?1:-1,
    speed:0,gap:0,t:0,trainT:rnd(3,9),trainOn:0};
  const g=new T3.Group();g.position.z=-z;scene.add(g);R.g=g;
  const W=(XMAX-XMIN+1)+18;
  if(type==='grass'){
    m(W,.5,1,z%2?'#7fc95c':'#74bf53',0,-.25,0,g);
    const n=z<3?0:rndi(0,4);
    for(let i=0;i<n;i++){
      const x=rndi(XMIN,XMAX);
      if(R.block.has(x)||x===0&&z<6)continue;
      R.block.add(x);
      if(Math.random()<.7){                     /* árbol */
        m(.55,.7,.55,'#6b4b2a',x,.35,0,g);
        const h=rnd(1,2.1);
        m(.95,h,.95,Math.random()<.5?'#2f8f4e':'#27803f',x,.7+h/2,0,g);
      }else{                                    /* roca */
        m(.8,.6,.8,'#9aa3ad',x,.3,0,g);
      }
    }
    if(Math.random()<.34){let cx=rndi(XMIN,XMAX);
      if(!R.block.has(cx)){R.coin=cx;
        const c=m(.34,.34,.1,'#ffd166',cx,.55,0,g);c.rotation.y=.6;R.coinM=c;}}
  }
  else if(type==='road'){
    m(W,.5,1,'#3c4148',0,-.25,0,g);
    m(W,.02,.08,'#e9edf2',0,.01,0,g);
    R.speed=rnd(2.0,4.0)*(1+Math.min(.8,z/320));
    R.gap=rnd(7.5,13);
    const n=Math.ceil(W/R.gap);
    for(let i=0;i<n;i++){
      const cg=new T3.Group();
      const col=pick(['#e0503f','#2f6df6','#f6c343','#8b5cf6','#16a34a','#ff7ab8']);
      const long=Math.random()<.16;
      const L=long?3.1:1.9;
      m(L,.55,.95,col,0,.42,0,cg);
      m(L*.52,.34,.9,'#dbe6f2',long?-L*.18:.05,.82,0,cg);
      m(.22,.22,1.02,'#111418',L/2-.18,.2,0,cg);
      m(.22,.22,1.02,'#111418',-L/2+.18,.2,0,cg);
      m(.16,.16,.06,'#fff3b0',R.dir>0?L/2:-L/2,.45,.3,cg);
      cg.position.set(XMIN-9+i*R.gap+rnd(0,1.5),0,0);
      g.add(cg);R.cars.push({g:cg,len:L});
    }
  }
  else if(type==='water'){
    m(W,.42,1,'#2f7fd6',0,-.29,0,g);
    m(W,.02,.9,'#59a8f2',0,-.07,0,g);
    R.speed=rnd(1.1,2.3);
    R.gap=rnd(4.6,7.2);
    const n=Math.ceil(W/R.gap);
    for(let i=0;i<n;i++){
      const L=rndi(2,4);
      const lg=new T3.Group();
      m(L,.42,.86,'#8a5a33',0,.05,0,lg);
      m(L,.06,.86,'#a06d3f',0,.27,0,lg);
      lg.position.set(XMIN-9+i*R.gap+rnd(0,1.2),0,0);
      g.add(lg);R.logs.push({g:lg,len:L});
    }
  }
  else{                                          /* vías */
    m(W,.5,1,'#5b6068',0,-.25,0,g);
    m(W,.1,.14,'#8e959e',0,.03,-.24,g);
    m(W,.1,.14,'#8e959e',0,.03,.24,g);
    R.speed=17;
    const L=rnd(1,1);
    const tg=new T3.Group();
    for(let i=0;i<7;i++){
      m(3.6,1.1,1,i?'#c8ced6':'#f2f4f7',i*3.8,.62,0,tg);
      m(3.2,.4,1.02,'#2a2f36',i*3.8,1.05,0,tg);
    }
    tg.visible=false;tg.position.x=R.dir>0?XMIN-32:XMAX+32;
    g.add(tg);R.train=tg;
    const lamp=m(.3,.3,.3,'#ff3b3b',R.dir>0?XMIN-1.6:XMAX+1.6,1.1,0,g);
    R.lamp=lamp;lamp.visible=false;
  }
  ROWS.set(z,R);
}
function dropRow(z){
  const R=ROWS.get(z);if(!R)return;
  scene.remove(R.g);
  R.g.traverse(o=>{if(o.isMesh){/* geo y material son compartidos: no se liberan */}});
  ROWS.delete(z);
}
function ensureRows(){
  const top=Math.floor(pz)+AHEAD;
  for(let z=Math.floor(pz)-BEHIND;z<=top;z++)if(z>=-7)buildRow(z);
  if(top>farZ)farZ=top;
  for(const z of Array.from(ROWS.keys()))if(z<Math.floor(pz)-BEHIND-2&&z<-7===false)dropRow(z);
}
/* ---------------------------------------------------------------- jugador */
function makePlayer(){
  plrG=new T3.Group();
  plr=new T3.Group();
  plrG.add(plr);plr.scale.setScalar(1.12);
  /* pollo low-poly: cuerpo, cabeza, pico, cresta, patas */
  m(.72,.6,.62,'#f7f7fa',0,.42,0,plr);
  m(.5,.42,.44,'#ffffff',0,.86,-.02,plr);
  m(.2,.16,.24,'#f6a13a',0,.84,-.3,plr);
  m(.16,.2,.14,'#e0503f',0,1.12,.02,plr);
  m(.12,.12,.12,'#111418',.16,.92,-.18,plr);
  m(.12,.12,.12,'#111418',-.16,.92,-.18,plr);
  m(.14,.3,.14,'#f6a13a',.16,.15,.05,plr);
  m(.14,.3,.14,'#f6a13a',-.16,.15,.05,plr);
  scene.add(plrG);
  shadow=new T3.Mesh(new T3.CircleGeometry(.42,16),
    new T3.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22}));
  shadow.rotation.x=-Math.PI/2;scene.add(shadow);
}
function blocked(x,z){
  const R=ROWS.get(z);
  if(!R)return false;
  if(R.type==='grass'&&R.block.has(x))return true;
  return x<XMIN||x>XMAX;
}
function tryHop(dx,dz){
  if(dead||hop)return;
  const nx=px+dx,nz=pz+dz;
  if(nz<0)return;
  if(blocked(Math.round(nx),Math.round(nz))){ARC.sfx('click',{rate:.6,vol:.5});ARC.vib(8);return;}
  hop={x0:px,z0:pz,x1:nx,z1:nz,t:0,d:.135};
  ARC.sfx('tap',{rate:1.4});ARC.vib(9);
  idleT=0;
}
let lastDie='';
function die(kind){
  if(dead)return;
  dead=true;lastDie=kind+'@'+pz.toFixed(1)+' x='+px.toFixed(2);
  const p=plrG.position;
  ARC.shake(12);
  if(kind==='car'){plr.scale.set(1.5,.18,1.5);ARC.sfx('boom');}
  else if(kind==='water'){plr.position.y=-.5;ARC.sfx('splat');}
  else if(kind==='train'){plr.scale.set(1.9,.12,1.9);ARC.sfx('boom',{rate:.8});}
  else{ARC.sfx('lose');}
  ARC.fx.burst(ARC.W/2,ARC.H*.55,{n:20,color:'#ff5d73',speed:260,size:5,life:.6});
  setTimeout(()=>{
    ARC.over({win:false,score,noStars:true,coins,
      title:kind==='water'?'¡AL AGUA!':(kind==='eagle'?'¡TE LLEVÓ EL ÁGUILA!':'¡APLASTADO!'),
      sub:'Filas: '+score+'  ·  Monedas: '+coins+'<br>Récord: '+Math.max(ARC.S.best||0,score)});
  },700);
}
/* ---------------------------------------------------------------- entrada */
let sw=null;
G.down=function(p){sw={x:p.x,y:p.y,t:ARC.t};};
G.up=function(p){
  if(!sw)return;
  const dx=p.x-sw.x,dy=p.y-sw.y,dt=ARC.t-sw.t;
  sw=null;
  const L=Math.hypot(dx,dy);
  if(L<26&&dt<.6){tryHop(0,1);return;}          /* toque = adelante */
  if(L<26)return;
  if(Math.abs(dx)>Math.abs(dy))tryHop(dx>0?1:-1,0);
  else tryHop(0,dy>0?-1:1);
};
G.key=function(c,d){
  if(!d)return;
  if(c==='ArrowUp'||c==='KeyW')tryHop(0,1);
  if(c==='ArrowDown'||c==='KeyS')tryHop(0,-1);
  if(c==='ArrowLeft'||c==='KeyA')tryHop(-1,0);
  if(c==='ArrowRight'||c==='KeyD')tryHop(1,0);
};
/* ---------------------------------------------------------------- ciclo */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  scene.background=new T3.Color('#8fd3ff');
  scene.fog=new T3.Fog(0x8fd3ff,26,46);
  /* el encuadre se fija por el ANCHO del mundo (9 columnas), no por el alto: en
     vertical eso da una vista profunda como el original, y en apaisado sigue
     entrando lo mismo de ancho. */
  /* ANCHO 9,4 unidades como objetivo, pero con TOPE de alto en 15: en vertical
     9,4/0,45 daría 21 filas de profundidad (autos diminutos y medio cuadro vacío,
     medido en V-cruza-play), así que se recorta el alto y el ancho sale de ahí:
     ~7 columnas y ~15 filas, que es el encuadre del original. */
  const asp=ARC.W/ARC.H;
  const hU=Math.min(9.4/asp,15),wU=hU*asp;
  cam=new T3.OrthographicCamera(-wU/2,wU/2,hU/2,-hU/2,.1,140);
  scene.add(new T3.HemisphereLight(0xffffff,0x8fb98f,.95));
  sun=new T3.DirectionalLight(0xfff3d0,.85);
  sun.position.set(6,14,8);scene.add(sun);
  makePlayer();
};
G.resize=function(){
  if(!cam)return;
  const asp=ARC.W/ARC.H;
  const hU=Math.min(9.4/asp,15),wU=hU*asp;
  cam.left=-wU/2;cam.right=wU/2;cam.top=hU/2;cam.bottom=-hU/2;
  cam.updateProjectionMatrix();
  CAMW=wU;
};
G.start=function(){
  if(!T3)return;
  for(const z of Array.from(ROWS.keys()))dropRow(z);
  px=0;pz=0;score=0;coins=0;dead=false;hop=null;idleT=0;farZ=1;
  plr.scale.set(1,1,1);plr.position.set(0,0,0);
  plrG.position.set(0,0,0);
  for(let z=-7;z<0;z++)buildRow(z);
  ensureRows();
  camZ=0;camX=0;
  ARC.hud(0,'RÉCORD '+(ARC.S.best||0));
  ARC.tray([
    {id:'up',txt:'▲',fn:()=>tryHop(0,1)},
    {id:'lf',txt:'◀',gh:1,fn:()=>tryHop(-1,0)},
    {id:'rt',txt:'▶',gh:1,fn:()=>tryHop(1,0)},
    {id:'dn',txt:'▼',gh:1,fn:()=>tryHop(0,-1)}
  ]);
};
G.step=function(dt){
  if(!T3)return;
  /* filas: autos, troncos y trenes */
  for(const [z,R] of ROWS){
    if(R.type==='road'){
      for(const c of R.cars){
        c.g.position.x+=R.speed*R.dir*dt;
        if(R.dir>0&&c.g.position.x>XMAX+11)c.g.position.x=XMIN-11;
        if(R.dir<0&&c.g.position.x<XMIN-11)c.g.position.x=XMAX+11;
      }
    }else if(R.type==='water'){
      for(const l of R.logs){
        l.g.position.x+=R.speed*R.dir*dt;
        if(R.dir>0&&l.g.position.x>XMAX+11)l.g.position.x=XMIN-11;
        if(R.dir<0&&l.g.position.x<XMIN-11)l.g.position.x=XMAX+11;
      }
    }else if(R.type==='rail'){
      R.trainT-=dt;
      if(R.trainT<=0&&!R.trainOn){
        R.trainOn=1;R.train.visible=true;
        R.train.position.x=R.dir>0?XMIN-30:XMAX+30;
        ARC.sfx('power',{rate:.6,vol:.5});
      }
      if(R.lamp)R.lamp.visible=(R.trainT<1.6&&R.trainT>0)?(Math.sin(ARC.t*18)>0):false;
      if(R.trainOn){
        R.train.position.x+=R.speed*R.dir*dt;
        if((R.dir>0&&R.train.position.x>XMAX+34)||(R.dir<0&&R.train.position.x<XMIN-34)){
          R.trainOn=0;R.train.visible=false;R.trainT=rnd(4,9);
        }
      }
    }
  }
  /* salto */
  if(hop){
    hop.t+=dt;
    const k=clamp(hop.t/hop.d,0,1);
    px=lerp(hop.x0,hop.x1,k);pz=lerp(hop.z0,hop.z1,k);
    const up=Math.sin(k*Math.PI)*.42;
    plr.position.y=up;
    plr.scale.set(1+up*.35,1-up*.28,1+up*.35);
    if(k>=1){
      hop=null;plr.position.y=0;plr.scale.set(1,1,1);
      px=Math.round(px);pz=Math.round(pz);
      if(pz>score){score=pz;ARC.hud(score,'RÉCORD '+Math.max(ARC.S.best||0,score));
        if(score%10===0)ARC.fx.text(ARC.W/2,ARC.H*.3,score+' FILAS',{color:'#ffd166',size:26,life:.9});}
      const R=ROWS.get(Math.round(pz));
      if(R&&R.coin===Math.round(px)&&R.coinM){
        R.coinM.visible=false;R.coin=-99;coins++;
        ARC.sfx('coin');ARC.fx.text(ARC.W/2+40,ARC.H*.5,'+1',{color:'#ffd166',size:20});
      }
    }
  }
  /* viajar con el tronco */
  const R=ROWS.get(Math.round(pz));
  let onLog=false;
  if(R&&R.type==='water'&&!hop&&!dead){
    for(const l of R.logs){
      const lx=l.g.position.x,h=l.len/2+.34;
      if(px>lx-h&&px<lx+h){onLog=true;px+=R.speed*R.dir*dt;break;}
    }
    if(!onLog)die('water');
    if(px<XMIN-1.4||px>XMAX+1.4)die('water');
  }
  /* choques */
  if(R&&!dead){
    if(R.type==='road'){
      for(const c of R.cars){
        const cx=c.g.position.x,h=c.len/2+.34;
        if(px>cx-h&&px<cx+h){die('car');break;}
      }
    }
    if(R.type==='rail'&&R.trainOn){
      const tx=R.train.position.x;
      if(px>tx-1.2&&px<tx+7*3.8+1.2)die('train');
    }
  }
  /* el águila: si te quedás muy atrás del máximo alcanzado */
  if(!dead){
    idleT+=dt;
    const behind=score-pz;
    if(behind>4||idleT>11){die('eagle');}
  }
  /* cámara */
  camZ=lerp(camZ,pz+2.6,1-Math.pow(.001,dt));
  /* la cámara sigue al pollo lo suficiente para que nunca se salga del cuadro,
     sin mostrar el borde del mundo */
  const lim=Math.max(0,XMAX-CAMW/2+.6);
  camX=lerp(camX,clamp(px*.92,-lim,lim),1-Math.pow(.0015,dt));
  plrG.position.set(px,0,-pz);
  shadow.position.set(px,.02,-pz);
  /* cámara ISOMÉTRICA SIN GIRO EN Y: si se le corre la X, las filas salen en
     diagonal y el juego se lee mucho peor (probado con capturas). Mirando 1,5
     filas más adelante que el objetivo, el pollo queda en el tercio de abajo. */
  /* 31° sobre el horizonte (no 46°): se ven los COSTADOS de los autos y el mundo
     deja de leerse plano. Medido con capturas: a 46° todo parecía visto de arriba. */
  cam.position.set(camX,9,-camZ+14.5);
  cam.lookAt(camX,.4,-camZ-(ARC.H>ARC.W?3.4:2));
  ensureRows();
};
G.draw=function(g){
  if(!ARC.rnd||!scene)return;
  ARC.rnd.render(scene,cam);
  /* aviso de tren y flechas de ayuda las primeras filas */
  if(score<3&&!dead){
    g.fillStyle='rgba(255,255,255,.9)';
    const fs=Math.max(12,Math.min(ARC.W,ARC.H)*.052);
    g.font='900 '+fs+'px system-ui,sans-serif';g.textAlign='center';
    g.fillText('TOCÁ PARA SALTAR',ARC.W/2,ARC.H*(ARC.H>ARC.W?.78:.86));g.textAlign='left';
  }
};
G.dbg={
  state:()=>({score,coins,px,pz:+pz.toFixed(2),dead,rows:ROWS.size,farZ,how:lastDie}),
  rowsInfo:(a,b)=>{const o=[];for(let z=a;z<=b;z++){const R=ROWS.get(z);
    if(!R){o.push(z+':-');continue;}
    o.push(z+':'+R.type+(R.type==='road'?(' v'+R.speed.toFixed(1)+' n'+R.cars.length):'')
      +(R.type==='water'?(' n'+R.logs.length):'')+(R.block.size?(' bl'+Array.from(R.block).join('/')):''));}
    return o;},
  /* piloto: la celda tiene que estar libre en toda la VENTANA de tiempo que el
     jugador va a pasar ahí (0 a 0,85 s), no en dos instantes sueltos: con dos
     muestras un auto podía llegar justo en el medio (medido: car@16.0). Para cada
     auto se resuelve el intervalo de tiempo en que solapa la celda. */
  autoMove:()=>{
    if(dead||hop)return false;
    const T0=0,T1=.85;
    const freeRow=(x,z)=>{
      const R2=ROWS.get(z);if(!R2)return true;
      if(R2.type==='grass')return !R2.block.has(x);
      if(R2.type==='rail')return !R2.trainOn&&R2.trainT>1.5;
      if(R2.type==='road'){
        const v=R2.speed*R2.dir;
        for(const c of R2.cars){
          const h=c.len/2+.55,cx=c.g.position.x;
          let t0=(x-cx-h)/v,t1=(x-cx+h)/v;
          if(t0>t1){const t=t0;t0=t1;t1=t;}
          if(t1>T0-.15&&t0<T1)return false;
        }
        return true;
      }
      if(R2.type==='water'){
        const v=R2.speed*R2.dir;
        return R2.logs.some(l=>{
          const h=l.len/2-.2,lx=l.g.position.x;
          let t0=(x-lx-h)/v,t1=(x-lx+h)/v;
          if(t0>t1){const t=t0;t0=t1;t1=t;}
          return t0<=.2&&t1>=.6;            /* tiene que estar cuando aterrizo */
        });
      }
      return true;
    };
    const x0=Math.round(px),z0=Math.round(pz);
    /* en el tronco, si me estoy yendo del borde salto YA para el lado de adentro
       (el tronco te lleva y morís afuera: es así en el original) */
    const RN=ROWS.get(z0);
    if(RN&&RN.type==='water'&&Math.abs(px)>5.2){
      const dir=px>0?-1:1;
      if(freeRow(x0+dir,z0)){tryHop(dir,0);return true;}
      if(freeRow(x0,z0+1)){tryHop(0,1);return true;}
    }
    if(freeRow(x0,z0+1)&&(ROWS.get(z0+1)||{}).type!=='water'||
       (freeRow(x0,z0+1)&&(ROWS.get(z0+1)||{}).type==='water')){
      if(freeRow(x0,z0+1)){tryHop(0,1);return true;}
    }
    if(freeRow(x0+1,z0)&&freeRow(x0+1,z0+1)){tryHop(1,0);return true;}
    if(freeRow(x0-1,z0)&&freeRow(x0-1,z0+1)){tryHop(-1,0);return true;}
    /* QUEDARSE QUIETO EN LA RUTA ES MORIR: si la celda de abajo ya no es segura,
       hay que salir para donde sea (adelante, al costado o atrás) */
    if(!freeRow(x0,z0)){
      if(freeRow(x0,z0+1)){tryHop(0,1);return true;}
      if(freeRow(x0+1,z0)){tryHop(1,0);return true;}
      if(freeRow(x0-1,z0)){tryHop(-1,0);return true;}
      if(z0>0&&freeRow(x0,z0-1)){tryHop(0,-1);return true;}
    }
    return true;
  }
};
window.GAME=G;
