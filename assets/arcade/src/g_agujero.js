/* ============================================================================
   AGUJERO — un pozo negro que se come el barrio y crece
   ----------------------------------------------------------------------------
   Arrastrá para mover el agujero. Se traga TODO lo que sea más chico que él y
   cada cosa lo agranda, así que primero bancos y arbolitos y al final las casas.
   Hay dos agujeros rivales comiendo al mismo tiempo: gana el más grande cuando
   se termina el tiempo. 6 barrios, cada uno con más cosas y rivales más rápidos.
   ========================================================================== */
const G={
  slug:'agujero',name:'AGUJERO',
  title:'A<em>GUJERO</em>',
  sub:'Movés el pozo con el dedo y te tragás el barrio: cada cosa que cae te agranda. Dos rivales compiten por la misma cuadra.',
  acc:'#c084fc',acc2:'#8b5cf6',levels:6,bestLabel:'MASA',
  three:true,sky:'#cfe3f5',shadows:false,
  art:A('art-agujero.jpg'),music:A('mus-agujero.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),pop:A('sfx-pop.mp3'),wood:A('sfx-wood.mp3'),glass:A('sfx-glass.mp3'),
       coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),power:A('sfx-power.mp3'),
       boom:A('sfx-boom.mp3')}
};
const MAP=26;                       /* medio lado del barrio */
let T3,scene,cam,ground,props=[],holes=[],time=0,lvl=1,drag=null,dirv={x:0,z:0},done=false;
const MAT={},GEO={};
function mat(c){if(MAT[c])return MAT[c];return MAT[c]=new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function box(w,h,d){const k=w+'_'+h+'_'+d;return GEO[k]||(GEO[k]=new T3.BoxGeometry(w,h,d));}
function addProp(kind,x,z){
  const g=new T3.Group();g.position.set(x,0,z);
  let r=.5,mass=1;
  if(kind==='banco'){
    g.add(new T3.Mesh(box(1.1,.16,.42),mat('#c58a4e')));g.children[0].position.y=.42;
    g.add(new T3.Mesh(box(.14,.42,.4),mat('#8a95a3')));g.children[1].position.set(-.42,.21,0);
    g.add(new T3.Mesh(box(.14,.42,.4),mat('#8a95a3')));g.children[2].position.set(.42,.21,0);
    r=.62;mass=1;
  }else if(kind==='arbol'){
    g.add(new T3.Mesh(box(.3,.9,.3),mat('#6b4b2a')));g.children[0].position.y=.45;
    const c=new T3.Mesh(new T3.SphereGeometry(.72,10,8),mat('#3f9e5c'));c.position.y=1.35;g.add(c);
    r=.82;mass=2;
  }else if(kind==='auto'){
    g.add(new T3.Mesh(box(2.1,.6,1),mat(pick(['#e0503f','#2f6df6','#f6c343','#16a34a']))));
    g.children[0].position.y=.5;
    g.add(new T3.Mesh(box(1.1,.42,.94),mat('#dbe6f2')));g.children[1].position.set(-.1,.95,0);
    r=1.18;mass=5;
  }else if(kind==='kiosco'){
    g.add(new T3.Mesh(box(2.2,2,2.2),mat('#f0a02a')));g.children[0].position.y=1;
    g.add(new T3.Mesh(box(2.5,.2,2.5),mat('#e0503f')));g.children[1].position.y=2.1;
    r=1.6;mass=12;
  }else if(kind==='casa'){
    const h=rnd(3,5.2);
    g.add(new T3.Mesh(box(3.4,h,3.4),mat(pick(['#dfe6ee','#e8d9c5','#cfd8e3']))));
    g.children[0].position.y=h/2;
    g.add(new T3.Mesh(box(3.8,.4,3.8),mat('#8c4b3a')));g.children[1].position.y=h+.2;
    r=2.5;mass=30;
  }else{                            /* farol */
    g.add(new T3.Mesh(box(.16,2.4,.16),mat('#5a6472')));g.children[0].position.y=1.2;
    const l=new T3.Mesh(box(.4,.3,.4),mat('#fff3b0'));l.position.y=2.5;g.add(l);
    r=.5;mass=1;
  }
  scene.add(g);
  props.push({g,x,z,r,mass,kind,taken:0,fy:0,vr:rnd(-4,4)});
}
function buildCity(n){
  for(const p of props)scene.remove(p.g);
  props=[];
  if(ground)scene.remove(ground);
  ground=new T3.Group();
  const base=new T3.Mesh(box(MAP*2,.4,MAP*2),mat('#c9d3c0'));
  base.position.y=-.2;ground.add(base);
  /* calles */
  for(let i=-2;i<=2;i++){
    const r1=new T3.Mesh(box(MAP*2,.06,4.2),mat('#4a5058'));r1.position.set(0,.02,i*11);ground.add(r1);
    const r2=new T3.Mesh(box(4.2,.06,MAP*2),mat('#4a5058'));r2.position.set(i*11,.02,0);ground.add(r2);
  }
  scene.add(ground);
  const kinds=['banco','arbol','farol','auto','kiosco','casa'];
  const N=90+n*26;
  for(let i=0;i<N;i++){
    const k=kinds[Math.min(kinds.length-1,Math.floor(Math.pow(Math.random(),1.5)*kinds.length))];
    let x=rnd(-MAP+3,MAP-3),z=rnd(-MAP+3,MAP-3);
    /* no encima de las calles */
    if(Math.abs(x%11)<3.2||Math.abs(z%11)<3.2){x+=5;z+=5;}
    addProp(k,clamp(x,-MAP+3,MAP-3),clamp(z,-MAP+3,MAP-3));
  }
}
function mkHole(col,ai){
  const g=new T3.Group();
  const disc=new T3.Mesh(new T3.CircleGeometry(1,28),new T3.MeshBasicMaterial({color:0x05060a}));
  disc.rotation.x=-Math.PI/2;disc.position.y=.06;g.add(disc);
  const ring=new T3.Mesh(new T3.RingGeometry(.98,1.16,28),
    new T3.MeshBasicMaterial({color:new T3.Color(col),side:T3.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.07;g.add(ring);
  scene.add(g);
  return {g,disc,ring,x:rnd(-8,8),z:rnd(-8,8),r:1,mass:0,ai:!!ai,col,tx:0,tz:0,t:0,sp:ai?5.6:7.4};
}
function radiusFor(mass){return Math.sqrt(1+mass*.055)*1.02;}
/* ---- entrada ---- */
G.down=function(p){drag={x:p.x,y:p.y};};
G.move=function(p){
  if(!drag)return;
  const dx=p.x-drag.x,dy=p.y-drag.y,L=Math.hypot(dx,dy);
  if(L<4){dirv.x=dirv.z=0;return;}
  const k=Math.min(1,L/(ARC.H*.22));
  dirv.x=dx/L*k;dirv.z=dy/L*k;
};
G.up=function(){drag=null;dirv.x=dirv.z=0;};
G.key=function(c,d){
  const v=d?1:0;
  if(c==='ArrowLeft'||c==='KeyA')dirv.x=-v;
  if(c==='ArrowRight'||c==='KeyD')dirv.x=v;
  if(c==='ArrowUp'||c==='KeyW')dirv.z=-v;
  if(c==='ArrowDown'||c==='KeyS')dirv.z=v;
};
/* ---- ciclo ---- */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  scene.background=new T3.Color('#cfe3f5');
  scene.fog=new T3.Fog(0xcfe3f5,44,86);
  cam=new T3.PerspectiveCamera(52,ARC.W/ARC.H,.5,180);
  scene.add(new T3.HemisphereLight(0xffffff,0x9fb08f,1.05));
  const d=new T3.DirectionalLight(0xfff6e0,.6);d.position.set(10,20,12);scene.add(d);
};
G.resize=function(){if(cam){cam.aspect=ARC.W/ARC.H;cam.updateProjectionMatrix();}};
G.start=function(l){
  if(!T3)return;
  lvl=l||1;done=false;
  buildCity(lvl);
  for(const h of holes)scene.remove(h.g);
  holes=[mkHole('#c084fc',false),mkHole('#4dd0ff',true),mkHole('#ff7ab8',true)];
  holes[0].x=0;holes[0].z=6;
  time=95-lvl*4;
  ARC.hud(0,'TIEMPO '+Math.ceil(time));
  ARC.tray([{id:'inf',txt:'BARRIO '+lvl,gh:1,fn:()=>ARC.toast('Comé todo lo que puedas antes que los rivales')}]);
};
function eatStep(h,dt){
  for(const p of props){
    if(p.taken)continue;
    const dx=p.x-h.x,dz=p.z-h.z,d=Math.hypot(dx,dz);
    if(d<h.r*.92&&p.r<=h.r*1.02){
      p.taken=1;p.hole=h;
      h.mass+=p.mass;h.r=radiusFor(h.mass);
      if(!h.ai){
        ARC.sfx(p.mass>=12?'boom':(p.mass>=5?'wood':'pop'),{rate:1.1-Math.min(.4,p.mass*.02)});
        if(p.mass>=5)ARC.shake(Math.min(9,3+p.mass*.2));
        ARC.hud(Math.round(h.mass),'TIEMPO '+Math.ceil(time));
        ARC.fx.text(ARC.W/2+rnd(-60,60),ARC.H*.5,'+'+p.mass,{color:'#c084fc',size:18});
      }
    }
  }
}
function aiStep(h,dt){
  h.t-=dt;
  if(h.t<=0||!h.target||h.target.taken){
    h.t=rnd(.6,1.4);
    let best=null,bd=1e9;
    for(const p of props){
      if(p.taken||p.r>h.r*1.02)continue;
      const d=Math.hypot(p.x-h.x,p.z-h.z)-p.mass*.35;
      if(d<bd){bd=d;best=p;}
    }
    h.target=best;
  }
  if(h.target){
    const dx=h.target.x-h.x,dz=h.target.z-h.z,L=Math.hypot(dx,dz)||1;
    h.x+=dx/L*h.sp*dt;h.z+=dz/L*h.sp*dt;
  }
}
G.step=function(dt){
  if(!T3||done)return;
  time-=dt;
  const me=holes[0];
  me.x=clamp(me.x+dirv.x*me.sp*dt,-MAP+1,MAP-1);
  me.z=clamp(me.z+dirv.z*me.sp*dt,-MAP+1,MAP-1);
  for(const h of holes){
    if(h.ai)aiStep(h,dt);
    h.x=clamp(h.x,-MAP+1,MAP-1);h.z=clamp(h.z,-MAP+1,MAP-1);
    eatStep(h,dt);
    h.g.position.set(h.x,0,h.z);
    h.g.scale.setScalar(h.r);
  }
  /* cosas cayendo */
  for(const p of props){
    if(!p.taken)continue;
    p.fy-=13*dt;
    p.g.position.y+=p.fy*dt;
    p.g.position.x=lerp(p.g.position.x,p.hole.x,1-Math.pow(.02,dt));
    p.g.position.z=lerp(p.g.position.z,p.hole.z,1-Math.pow(.02,dt));
    p.g.rotation.x+=p.vr*dt;p.g.rotation.z+=p.vr*.6*dt;
    p.g.scale.setScalar(Math.max(0,p.g.scale.x-dt*.55));
    if(p.g.position.y<-6){scene.remove(p.g);p.taken=2;}
  }
  ARC.hud(Math.round(me.mass),'TIEMPO '+Math.max(0,Math.ceil(time)));
  if(time<=0){
    done=true;
    const rank=holes.slice().sort((a,b)=>b.mass-a.mass);
    const pos=rank.indexOf(me)+1;
    const win=pos===1;
    ARC.over({win,score:Math.round(me.mass),stars:win?(me.mass>rank[1].mass*1.6?3:2):0,
      title:win?'¡PRIMER PUESTO!':'PUESTO '+pos,coins:Math.round(me.mass/3),
      sub:'Tu masa: '+Math.round(me.mass)+'<br>Rivales: '+rank.filter(h=>h!==me).map(h=>Math.round(h.mass)).join(' · ')});
  }
};
G.draw=function(g){
  if(!ARC.rnd||!scene)return;
  const me=holes[0];
  /* la cámara mira BIEN de arriba (1,75 de alto por 0,8 de atrás): con el ángulo
     bajo de antes el horizonte partía la pantalla al medio y media pantalla era
     cielo vacío (medido en la captura P-agujero). */
  const d=10+me.r*3.2;
  cam.position.set(me.x,d*1.75,me.z+d*.8);
  cam.lookAt(me.x,0,me.z-me.r*.5);
  ARC.rnd.render(scene,cam);
  /* marcador de rivales */
  const rank=holes.slice().sort((a,b)=>b.mass-a.mass);
  const fs=Math.max(10,ARC.H*.032);
  g.font='900 '+fs+'px system-ui,sans-serif';
  rank.forEach((h,i)=>{
    const y=ARC.H*.2+i*fs*1.5;
    g.fillStyle=h===me?'#fff':'rgba(255,255,255,.72)';
    g.fillText((i+1)+'.',ARC.W*.035,y);
    g.fillStyle=h.col;
    g.fillRect(ARC.W*.035+fs*1.2,y-fs*.7,Math.max(4,ARC.W*.1*clamp(h.mass/Math.max(1,rank[0].mass),.05,1)),fs*.7);
    g.fillStyle=h===me?'#fff':'rgba(255,255,255,.72)';
    g.fillText(Math.round(h.mass)+'',ARC.W*.035+fs*1.2+ARC.W*.11,y);
  });
  if(time>90-lvl*4-2.5){
    g.fillStyle='rgba(20,24,32,.85)';
    g.font='900 '+Math.max(12,ARC.H*.042)+'px system-ui,sans-serif';g.textAlign='center';
    g.fillText('ARRASTRÁ PARA MOVER EL POZO',ARC.W/2,ARC.H*.9);g.textAlign='left';
  }
};
G.dbg={
  state:()=>({mass:Math.round(holes[0]?holes[0].mass:0),r:+(holes[0]?holes[0].r:0).toFixed(2),
    time:+time.toFixed(1),props:props.filter(p=>!p.taken).length,done,lvl}),
  autoMove:()=>{
    if(done||!holes.length)return false;
    const h=holes[0];
    let best=null,bd=1e9;
    for(const p of props){
      if(p.taken||p.r>h.r*1.02)continue;
      const d=Math.hypot(p.x-h.x,p.z-h.z);
      if(d<bd){bd=d;best=p;}
    }
    if(!best)return false;
    const dx=best.x-h.x,dz=best.z-h.z,L=Math.hypot(dx,dz)||1;
    dirv.x=dx/L;dirv.z=dz/L;
    return true;
  }
};
window.GAME=G;
