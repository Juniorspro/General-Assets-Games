/* ============================================================================
   TORRE LOCA — apilar bloques que se deslizan, cortando el sobrante
   ----------------------------------------------------------------------------
   Un bloque va y viene sobre la torre; al tocar la pantalla se apoya. Lo que
   sobresale se CORTA y se cae; lo que pisa queda. Si clavás el centro (menos de
   6 cm de error) es PERFECTO: suena más agudo, el bloque recupera tamaño y la
   racha multiplica. Los ejes alternan (X, Z, X, Z...) y la velocidad sube con
   la altura. Sin niveles: es de récord.
   ========================================================================== */
const G={
  slug:'torre',name:'TORRE LOCA',
  title:'TORRE <em>LOCA</em>',
  sub:'Tocá para apoyar el bloque. Lo que sobra se corta y se cae. Si clavás el centro, la racha te devuelve tamaño: la torre puede subir para siempre.',
  acc:'#5ee7c1',acc2:'#2bb99a',levels:0,bestLabel:'PISOS',
  three:true,sky:'#141024',
  art:A('art-torre.jpg'),music:A('mus-torre.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),click:A('sfx-click.mp3'),pop:A('sfx-pop.mp3'),chime:A('sfx-chime.mp3'),
       coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),power:A('sfx-power.mp3')}
};
const BH=.62;                        /* alto de cada piso */
let T3,scene,cam,tower,cur=null,falls=[],dead=false,score=0,combo=0,camY=0,curSize=null,axis=0;
let baseY=0,spd=3.4,dirn=1,tipT=0;
const MAT={};
function mat(c){if(MAT[c])return MAT[c];return MAT[c]=new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function colFor(i){
  const h=(i*11+200)%360;
  return 'hsl('+h+',62%,'+(52+Math.sin(i*.4)*8)+'%)';
}
function addBlock(w,d,x,z,y,col){
  const o=new T3.Mesh(new T3.BoxGeometry(w,BH,d),mat(col));
  o.position.set(x,y,z);tower.add(o);
  return o;
}
function newBlock(){
  const last=curSize||{w:3.2,d:3.2,x:0,z:0};
  axis=score%2;                       /* 0 = se mueve en X, 1 = en Z */
  const col=colFor(score+1);
  const w=last.w,d=last.d;
  const off=5.2;
  const x=axis===0?(dirn>0?-off:off):last.x;
  const z=axis===1?(dirn>0?-off:off):last.z;
  const y=baseY+BH;
  cur={m:addBlock(w,d,x,z,y,col),w,d,x,z,y,col,v:(spd+score*.055)*(dirn>0?1:-1)};
  dirn*=-1;
}
function place(){
  if(!cur||dead)return;
  const last=curSize||{w:3.2,d:3.2,x:0,z:0};
  let over,keepW=cur.w,keepD=cur.d,cx=cur.x,cz=cur.z;
  if(axis===0){
    const d0=cur.m.position.x-last.x;
    over=Math.abs(d0);
    keepW=cur.w-over;
    if(keepW<=.06){lose(cur.m.position.x,cur.y,cur.m.position.z);return;}
    cx=last.x+d0/2;
    /* trozo que cae */
    const fw=over,fx=d0>0?cx+keepW/2+fw/2:cx-keepW/2-fw/2;
    dropPiece(fw,cur.d,fx,cz,cur.y,cur.col,Math.sign(d0));
    if(over<.09){perfect();keepW=Math.min(last.w+.12,3.6);cx=last.x;}
  }else{
    const d0=cur.m.position.z-last.z;
    over=Math.abs(d0);
    keepD=cur.d-over;
    if(keepD<=.06){lose(cur.m.position.x,cur.y,cur.m.position.z);return;}
    cz=last.z+d0/2;
    const fd=over,fz=d0>0?cz+keepD/2+fd/2:cz-keepD/2-fd/2;
    dropPiece(cur.w,fd,cx,fz,cur.y,cur.col,Math.sign(d0),1);
    if(over<.09){perfect();keepD=Math.min(last.d+.12,3.6);cz=last.z;}
  }
  tower.remove(cur.m);
  const b=addBlock(keepW,keepD,cx,cz,cur.y,cur.col);
  curSize={w:keepW,d:keepD,x:cx,z:cz};
  baseY=cur.y;
  score++;
  ARC.hud(score,'RACHA x'+(1+combo)+'  ·  RÉCORD '+Math.max(ARC.S.best||0,score));
  ARC.sfx(combo>0?'chime':'click',{rate:clamp(.8+combo*.09,.8,2.2)});
  ARC.vib(10);
  /* rebote visual del bloque apoyado */
  b.scale.set(1.06,.9,1.06);
  setTimeout(()=>{if(b.scale)b.scale.set(1,1,1);},90);
  cur=null;
  newBlock();
}
function perfect(){
  combo++;
  ARC.fx.text(ARC.W/2,ARC.H*.36,combo>1?('PERFECTO x'+combo):'PERFECTO',
    {color:'#5ee7c1',size:26,life:.8});
  ARC.fx.burst(ARC.W/2,ARC.H*.52,{n:16,color:'#5ee7c1',speed:220,size:4,life:.5,g:200});
  ARC.sfx('pop',{rate:clamp(1+combo*.08,1,2)});
  ARC.shake(3);
}
function dropPiece(w,d,x,z,y,col,sgn,zAxis){
  const o=addBlock(w,d,x,z,y,col);
  falls.push({m:o,vy:0,vr:rnd(2,5)*(sgn||1),ax:zAxis?'x':'z',
    vx:(zAxis?0:sgn*1.4),vz:(zAxis?sgn*1.4:0),t:0});
  combo=0;
}
function lose(x,y,z){
  dead=true;
  if(cur){falls.push({m:cur.m,vy:0,vr:3,ax:'z',vx:rnd(-1,1),vz:rnd(-1,1),t:0});cur=null;}
  ARC.sfx('lose');ARC.shake(9);
  setTimeout(()=>ARC.over({win:false,score,noStars:true,coins:Math.floor(score/2),
    title:score>=(ARC.S.best||0)&&score>0?'¡NUEVO RÉCORD!':'SE CAYÓ',
    sub:'Pisos: '+score+'<br>Récord: '+Math.max(ARC.S.best||0,score)}),820);
}
/* ---- entrada ---- */
G.down=function(){place();};
G.key=function(c,d){if(d&&(c==='Space'||c==='ArrowUp'))place();};
/* ---- ciclo ---- */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  scene.background=new T3.Color('#141024');
  scene.fog=new T3.Fog(0x141024,26,60);
  const asp=ARC.W/ARC.H,H=9.4;
  cam=new T3.OrthographicCamera(-H*asp/2,H*asp/2,H/2,-H/2,.1,140);
  scene.add(new T3.HemisphereLight(0xbfd8ff,0x201838,1.0));
  const d=new T3.DirectionalLight(0xffffff,.7);d.position.set(8,16,10);scene.add(d);
  tower=new T3.Group();scene.add(tower);
};
G.resize=function(){
  if(!cam)return;
  const asp=ARC.W/ARC.H,H=9.4;
  cam.left=-H*asp/2;cam.right=H*asp/2;cam.top=H/2;cam.bottom=-H/2;cam.updateProjectionMatrix();
};
G.start=function(){
  if(!T3)return;
  while(tower.children.length)tower.remove(tower.children[0]);
  falls.length=0;dead=false;score=0;combo=0;spd=3.4;dirn=1;
  /* base */
  const base=addBlock(3.2,3.2,0,0,0,colFor(0));
  for(let i=1;i<7;i++)addBlock(3.2,3.2,0,0,-i*BH,colFor(-i));
  curSize={w:3.2,d:3.2,x:0,z:0};baseY=0;
  camY=0;
  cur=null;newBlock();
  ARC.hud(0,'TOCÁ PARA APOYAR');
  ARC.tray([{id:'drop',txt:'APOYAR',fn:()=>place()}]);
};
G.step=function(dt){
  if(!T3)return;
  if(cur){
    const p=cur.m.position;
    if(axis===0){p.x+=cur.v*dt;if(p.x>5.3){p.x=5.3;cur.v*=-1;}if(p.x<-5.3){p.x=-5.3;cur.v*=-1;}}
    else{p.z+=cur.v*dt;if(p.z>5.3){p.z=5.3;cur.v*=-1;}if(p.z<-5.3){p.z=-5.3;cur.v*=-1;}}
  }
  for(let i=falls.length-1;i>=0;i--){
    const f=falls[i];
    f.vy-=16*dt;f.t+=dt;
    f.m.position.y+=f.vy*dt;
    f.m.position.x+=f.vx*dt;f.m.position.z+=f.vz*dt;
    f.m.rotation[f.ax]+=f.vr*dt;
    if(f.m.position.y<camY-14||f.t>4){tower.remove(f.m);falls.splice(i,1);}
  }
  camY=lerp(camY,baseY+1.1,1-Math.pow(.004,dt));
};
G.draw=function(g){
  if(!ARC.rnd||!scene)return;
  cam.position.set(7.4,camY+6.6,7.4);
  cam.lookAt(0,camY,0);
  ARC.rnd.render(scene,cam);
  /* medidor de precisión del bloque en movimiento */
  if(cur&&!dead){
    const last=curSize;
    const off=axis===0?Math.abs(cur.m.position.x-last.x):Math.abs(cur.m.position.z-last.z);
    const k=clamp(1-off/(axis===0?last.w:last.d),0,1);
    const w=ARC.W*.34,x=(ARC.W-w)/2,y=ARC.H*.845,h=Math.max(5,ARC.H*.014);
    g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x,y,w,h);
    g.fillStyle=k>.94?'#5ee7c1':(k>.6?'#ffd166':'#ff5d73');
    g.fillRect(x,y,w*k,h);
  }
  if(score===0&&!dead){
    g.fillStyle='rgba(255,255,255,.9)';
    g.font='900 '+Math.max(12,ARC.H*.045)+'px system-ui,sans-serif';g.textAlign='center';
    g.fillText('TOCÁ PARA APOYAR',ARC.W/2,ARC.H*.2);g.textAlign='left';
  }
};
G.dbg={
  state:()=>({score,combo,dead,falls:falls.length,size:curSize&&+curSize.w.toFixed(2)}),
  autoMove:()=>{
    if(dead||!cur)return false;
    /* espera a estar cerca del centro y apoya: la sonda juega bien de verdad */
    const last=curSize;
    const off=axis===0?(cur.m.position.x-last.x):(cur.m.position.z-last.z);
    if(Math.abs(off)<1.0){place();return true;}
    return false;
  }
};
window.GAME=G;
