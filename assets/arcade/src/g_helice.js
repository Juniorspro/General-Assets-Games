/* ============================================================================
   HÉLICE — la pelota que baja por la torre en espiral
   ----------------------------------------------------------------------------
   La torre es una pila de ANILLOS: cada uno tiene uno o dos huecos y algunos
   tramos ROJOS que matan. Arrastrando se GIRA la torre (la pelota siempre cae
   por el frente), así se busca el hueco. Pasar un anillo suma piso; caer sobre
   rojo, perder. 12 niveles, cada uno con más anillos, huecos más chicos y más
   rojo. La colisión es analítica: se compara el ángulo de la pelota contra los
   tramos del anillo, sin física de contactos (barato y exacto en el celular).
   ========================================================================== */
const G={
  slug:'helice',name:'HELICE',
  title:'HÉ<em>LICE</em>',
  sub:'Girá la torre con el dedo y hacé caer la pelota por los huecos. El rojo mata. 12 niveles, cada uno más cerrado.',
  acc:'#c9a7ff',acc2:'#8b5cf6',levels:12,bestLabel:'PISOS',
  three:true,sky:'#eaf0f7',
  art:A('art-helice.jpg'),music:A('mus-helice.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),pop:A('sfx-pop.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-coin.mp3'),
       win:A('sfx-win.mp3'),lose:A('sfx-lose.mp3'),power:A('sfx-power.mp3'),chime:A('sfx-chime.mp3')}
};
const RIN=1.15,ROUT=2.5,RH=1.55;     /* radio interno/externo y separación de anillos */
let T3,scene,cam,tower,ball,pole,rings=[];
let by=0,bvy=0,rot=0,rotV=0,dead=false,won=false,passed=0,total=12,combo=0,lvl=1;
let drag=null,shakeY=0;
const MAT={};
function mat(c){if(MAT[c])return MAT[c];return MAT[c]=new T3.MeshLambertMaterial({color:new T3.Color(c)});}
/* un tramo de anillo = cilindro recortado (ThetaLength) */
function seg(a0,len,y,col){
  const g=new T3.CylinderGeometry(ROUT,ROUT,.34,26,1,false,a0,len);
  const o=new T3.Mesh(g,mat(col));
  o.position.y=y;
  const inner=new T3.Mesh(new T3.CylinderGeometry(RIN,RIN,.36,20,1,true,a0,len),mat('#cfd6e4'));
  inner.position.y=y;
  tower.add(o);tower.add(inner);
  return o;
}
function buildLevel(n){
  while(tower.children.length)tower.remove(tower.children[0]);
  rings=[];
  const nr=6+n*2;                        /* anillos del nivel */
  const gapBase=Math.max(.78,1.5-n*.055);/* radianes de hueco */
  const redP=Math.min(.42,.05+n*.035);
  for(let i=0;i<nr;i++){
    const y=-i*RH-RH;
    const holes=[];
    const g1=rnd(0,TAU);
    holes.push([g1,gapBase*rnd(.9,1.15)]);
    if(i>2&&Math.random()<.35)holes.push([g1+Math.PI+rnd(-.6,.6),gapBase*rnd(.8,1)]);
    /* los tramos son lo que queda entre huecos: se recorre el círculo */
    const cuts=[];
    holes.forEach(h=>{cuts.push({a:h[0],l:h[1]});});
    cuts.sort((a,b)=>a.a-b.a);
    const segs=[];
    let a=cuts[cuts.length-1].a+cuts[cuts.length-1].l;
    for(const c of cuts){
      let len=c.a-a;
      while(len<0)len+=TAU;
      if(len>.08)segs.push({a0:a%TAU,len});
      a=c.a+c.l;
    }
    const R={y,segs:[],meshes:[]};
    segs.forEach(s=>{
      /* cada tramo se parte en 2-3 pedazos para poder pintar rojo alguno */
      const parts=Math.max(1,Math.round(s.len/1.1));
      for(let p=0;p<parts;p++){
        const a0=s.a0+s.len*p/parts,len=s.len/parts;
        /* los dos primeros anillos NUNCA son rojos: morir en el primer rebote,
           sin tiempo de reaccionar, se siente injusto (pasó en las pruebas) */
        const red=i>1&&Math.random()<redP;
        R.segs.push({a0,len,red});
        R.meshes.push(seg(a0,len,y,red?'#ff5d73':(i%2?'#b79bff':'#a689f7')));
      }
    });
    rings.push(R);
  }
  /* poste central */
  const p=new T3.Mesh(new T3.CylinderGeometry(RIN*.92,RIN*.92,nr*RH+RH*3,20),mat('#e7ecf5'));
  p.position.y=-(nr*RH)/2;tower.add(p);
  total=nr;
}
/* ---- ¿el ángulo del frente está sobre un tramo? ---- */
function hitSeg(R){
  /* la pelota cae por el frente de la cámara: ángulo 0 en el espacio de la torre
     una vez descontada su rotación */
  let a=(-rot)%TAU;if(a<0)a+=TAU;
  for(const s of R.segs){
    let d=a-s.a0;while(d<0)d+=TAU;while(d>=TAU)d-=TAU;
    if(d<s.len)return s;
  }
  return null;
}
/* ---- entrada: arrastrar gira ---- */
G.down=function(p){drag={x:p.x,r:rot};};
G.move=function(p){
  if(!drag)return;
  rot=drag.r+(p.x-drag.x)*.0075;
  rotV=0;
};
G.up=function(){drag=null;};
G.key=function(c,d){if(!d)return;
  if(c==='ArrowLeft')rot-=.22;if(c==='ArrowRight')rot+=.22;};
/* ---- ciclo ---- */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  scene.background=new T3.Color('#eaf0f7');
  scene.fog=new T3.Fog(0xeaf0f7,16,34);
  cam=new T3.PerspectiveCamera(46,ARC.W/ARC.H,.1,80);
  scene.add(new T3.HemisphereLight(0xffffff,0xc8d2e6,1.05));
  const d=new T3.DirectionalLight(0xffffff,.55);d.position.set(4,10,8);scene.add(d);
  tower=new T3.Group();scene.add(tower);
  ball=new T3.Mesh(new T3.SphereGeometry(.42,20,14),mat('#ff7a4d'));
  scene.add(ball);
};
G.resize=function(){if(cam){cam.aspect=ARC.W/ARC.H;cam.updateProjectionMatrix();}};
G.start=function(l){
  if(!T3)return;
  lvl=l||1;
  buildLevel(lvl);
  by=0;bvy=0;rot=0;dead=false;won=false;passed=0;combo=0;
  ball.position.set(0,by,ROUT*.62);
  ARC.hud(0,'NIVEL '+lvl+'  ·  0/'+total);
  ARC.tray([
    {id:'lf',txt:'◀',gh:1,fn:()=>{rot-=.3;}},
    {id:'rt',txt:'▶',gh:1,fn:()=>{rot+=.3;}}
  ]);
};
G.step=function(dt){
  if(!T3||dead||won)return;
  bvy-=17*dt;
  by+=bvy*dt;
  /* ¿cruzó el plano de un anillo cayendo? */
  for(const R of rings){
    if(R.done)continue;
    const top=R.y+.28;
    if(by-.42<=top&&by-.42>top-.6&&bvy<0){
      const s=hitSeg(R);
      if(s){
        if(s.red){
          dead=true;
          ARC.sfx('lose');ARC.shake(12);
          ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:22,color:'#ff5d73',speed:260,size:5,life:.6});
          setTimeout(()=>ARC.over({win:false,score:passed,stars:0,
            title:'ROJO = FUERA',sub:'Anillos: '+passed+'/'+total}),700);
          return;
        }
        /* rebote */
        by=top+.42;bvy=8.4;
        combo=0;
        ARC.sfx('click',{rate:1.1,vol:.6});
        ARC.fx.burst(ARC.W/2,ARC.H*.52,{n:5,color:'#fff',speed:110,size:3,life:.25,g:200});
        break;
      }else{
        R.done=true;passed++;combo++;
        ARC.sfx('pop',{rate:clamp(1+combo*.06,1,1.9)});
        if(combo>1)ARC.fx.text(ARC.W/2,ARC.H*.3,'x'+combo,{color:'#8b5cf6',size:24,life:.6});
        ARC.hud(passed,'NIVEL '+lvl+'  ·  '+passed+'/'+total);
      }
    }
  }
  if(passed>=total&&!won){
    won=true;
    ARC.sfx('win');
    const st=combo>=total*.6?3:(combo>=total*.3?2:1);
    setTimeout(()=>ARC.over({win:true,score:passed,stars:st,coins:20+lvl*5,
      sub:'Anillos: '+passed+'/'+total+'<br>Racha máxima: '+combo}),450);
  }
  /* la torre acompaña el arrastre con inercia suave */
  tower.rotation.y=rot;
  ball.position.set(Math.sin(0)*0,by,ROUT*.62);
};
G.draw=function(g){
  if(!ARC.rnd||!scene)return;
  const cy=lerp(cam.position.y,by+1.9,.14);
  cam.position.set(0,cy,7.4);
  cam.lookAt(0,cy-1.5,0);
  ARC.rnd.render(scene,cam);
  /* barra de avance del nivel */
  const w=ARC.W*.4,x=(ARC.W-w)/2,y=ARC.H*.94,h=Math.max(5,ARC.H*.013);
  g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x,y,w,h);
  g.fillStyle='#8b5cf6';g.fillRect(x,y,w*clamp(passed/total,0,1),h);
  if(passed===0&&!dead){
    g.fillStyle='rgba(20,24,32,.85)';
    g.font='900 '+Math.max(12,ARC.H*.042)+'px system-ui,sans-serif';g.textAlign='center';
    g.fillText('ARRASTRÁ PARA GIRAR LA TORRE',ARC.W/2,ARC.H*.14);g.textAlign='left';
  }
};
G.dbg={
  state:()=>({passed,total,dead,won,by:+by.toFixed(2),lvl,combo}),
  autoMove:()=>{
    if(dead||won)return false;
    /* busca el anillo de abajo y gira al centro de su hueco más grande */
    const R=rings.find(r=>!r.done&&r.y<by);
    if(!R)return false;
    /* huecos = lo que no está cubierto por segmentos */
    let bestA=0,bestL=0;
    const segs=R.segs.slice().sort((a,b)=>a.a0-b.a0);
    for(let i=0;i<segs.length;i++){
      const a=segs[i],b=segs[(i+1)%segs.length];
      let gap=b.a0-(a.a0+a.len);while(gap<0)gap+=TAU;
      if(gap>bestL){bestL=gap;bestA=(a.a0+a.len+gap/2)%TAU;}
    }
    rot=-bestA;
    return true;
  }
};
window.GAME=G;
