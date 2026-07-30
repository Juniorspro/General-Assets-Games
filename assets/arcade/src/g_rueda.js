/* ============================================================================
   RUEDA NEÓN — la pelota que corre por una pista de neón en el vacío
   ----------------------------------------------------------------------------
   La pelota avanza sola; el dedo la mueve de costado. La pista tiene AGUJEROS
   (te caés), MUROS (te frenan), SIERRAS que giran y DIAMANTES para juntar.
   Cada nivel es un patrón más largo y más rápido, con un puesto de control a la
   mitad: si morís después, vuelves ahí (una sola vez).
   La pista se genera desde una semilla del nivel: mismo nivel = misma pista, así
   se puede aprender de memoria como en los juegos de ritmo.
   ========================================================================== */
const G={
  slug:'rueda',name:'RUEDA NEON',
  title:'RUEDA <em>NEÓN</em>',
  sub:'Pista de neón en el vacío: esquivá agujeros, muros y sierras, juntá diamantes y llegá al final. 8 niveles y una sola vuelta de control.',
  acc:'#22d3ee',acc2:'#0891b2',levels:8,bestLabel:'METROS',
  three:true,sky:'#05070f',
  art:A('art-rueda.jpg'),music:A('mus-rueda.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),
       lose:A('sfx-lose.mp3'),boom:A('sfx-boom.mp3'),power:A('sfx-power.mp3'),chime:A('sfx-chime.mp3')}
};
const LANES=5,CW=1.25;                /* carriles y ancho de carril */
let T3,scene,cam,ball,trackG,cells=[],obs=[],gems=[],lvl=1,LEN=0;
let bx=0,bz=0,vz=9,dead=false,won=false,drag=null,dragX=0,gemN=0,check=0,used=0,tilt=0;
const MAT={},GEO={};
function mat(c,e){const k=c+(e?'e':'');if(MAT[k])return MAT[k];
  return MAT[k]=e?new T3.MeshBasicMaterial({color:new T3.Color(c)})
                 :new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function box(w,h,d){const k=w+'_'+h+'_'+d;return GEO[k]||(GEO[k]=new T3.BoxGeometry(w,h,d));}
/* generador determinista (misma pista para el mismo nivel) */
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function buildTrack(n){
  while(trackG.children.length)trackG.remove(trackG.children[0]);
  cells=[];obs=[];gems=[];
  const R=rng(1000+n*77);
  LEN=170+n*38;
  /* CAMINO GARANTIZADO: se lleva un carril "camino" que se corre como máximo un
     carril por metro, y NUNCA se le hace un agujero ni se le pone un obstáculo.
     Sin esto la pista aleatoria arma filas imposibles y se muere sin culpa: en la
     prueba se caía al vacío a los 41 m de 208 sin haber tocado nada evitable. */
  let lane=Math.floor(LANES/2);
  for(let z=0;z<LEN;z++){
    /* el camino se corre UN carril cada 3 metros como máximo. MEDIDO: a 7,6 m/s
       la pelota tarda ~0,17 s en cambiar de carril, o sea 1,3 m; si el camino
       zigzaguea metro a metro no hay forma humana (ni de la sonda) de seguirlo y
       se cae al vacío siempre en el mismo lugar (fall@59.5 con la fila 60=00111). */
    if(z>18&&z%3===0&&R()<.55)lane=clamp(lane+(R()<.5?-1:1),0,LANES-1);
    const row=new Array(LANES).fill(1);
    if(z>24){
      const r=R();
      if(r<.30){                                   /* agujeros, nunca en el camino */
        const k=1+Math.floor(R()*2);
        for(let i=0;i<k;i++){const c=Math.floor(R()*LANES);if(c!==lane)row[c]=0;}
      }
      if(r>.74&&z%3===0){                          /* pasillo angosto alrededor del camino */
        for(let i=0;i<LANES;i++)if(Math.abs(i-lane)>1)row[i]=0;
      }
    }
    cells.push(row);
    for(let i=0;i<LANES;i++){
      if(!row[i])continue;
      const t=new T3.Mesh(box(CW*.94,.24,.94),mat(((z+i)&1)?'#2596b8':'#1d7f9e',1));
      t.position.set((i-(LANES-1)/2)*CW,-.12,-z);
      trackG.add(t);
    }
    if(z%4===0&&row[lane]){
      const e=new T3.Mesh(box(CW*LANES*.98,.05,.1),mat('#7ef0ff',1));
      e.position.set(0,.02,-z);trackG.add(e);
    }
    if(z>26){
      const r=R();
      /* los obstáculos van SIEMPRE fuera del camino */
      const free=[];for(let i=0;i<LANES;i++)if(i!==lane&&row[i])free.push(i);
      if(free.length){
        const i=free[Math.floor(R()*free.length)];
        if(r<.13){                                 /* muro */
          const w=new T3.Mesh(box(CW*.9,.8,.35),mat('#ff5da2',1));
          w.position.set((i-(LANES-1)/2)*CW,.4,-z);trackG.add(w);
          obs.push({t:'wall',x:w.position.x,z,m:w,w:CW*.45,d:.3});
        }else if(r<.20){                            /* sierra */
          const sw=new T3.Mesh(new T3.CylinderGeometry(.52,.52,.1,16),mat('#ff3b6b',1));
          sw.rotation.z=Math.PI/2;
          sw.position.set((i-(LANES-1)/2)*CW,.5,-z);trackG.add(sw);
          obs.push({t:'saw',x:sw.position.x,z,m:sw,w:.5,d:.5,ph:R()*TAU,amp:0});
        }
      }
      if(r>=.20&&r<.38){                            /* diamante EN el camino */
        const d0=new T3.Mesh(new T3.OctahedronGeometry(.3),mat('#c7f4ff',1));
        d0.position.set((lane-(LANES-1)/2)*CW,.6,-z);trackG.add(d0);
        gems.push({x:d0.position.x,z,m:d0,got:0});
      }
    }
  }
  const fin=new T3.Mesh(box(CW*LANES,.1,1.4),mat('#7ef0ff',1));
  fin.position.set(0,.06,-LEN);trackG.add(fin);
}
function cellAt(x,z){
  const zi=Math.round(z);
  if(zi<0||zi>=cells.length)return 0;
  const i=Math.round(x/CW+(LANES-1)/2);
  if(i<0||i>=LANES)return 0;
  return cells[zi][i];
}
let lastDie='';
function die(kind){
  if(dead||won)return;
  dead=true;lastDie=kind+'@'+bz.toFixed(1)+' x='+bx.toFixed(2);
  ARC.sfx(kind==='fall'?'lose':'boom');ARC.shake(11);
  ARC.fx.burst(ARC.W/2,ARC.H*.6,{n:20,color:'#ff3b6b',speed:250,size:5,life:.6});
  setTimeout(()=>{
    if(check>0&&used<1){                       /* vuelta de control */
      used++;bz=check;bx=0;dead=false;vz=7.6+lvl*.5;
      ARC.toast('¡Vuelta de control!');ARC.sfx('power');
      return;
    }
    ARC.over({win:false,score:Math.round(bz),stars:0,
      title:kind==='fall'?'AL VACÍO':'CHOCASTE',
      sub:'Metros: '+Math.round(bz)+'/'+LEN+'<br>Diamantes: '+gemN});
  },620);
}
/* ---- entrada ---- */
G.down=function(p){drag={x:p.x,bx};};
G.move=function(p){
  if(!drag)return;
  bx=clamp(drag.bx+(p.x-drag.x)*.011,-(LANES-1)/2*CW,(LANES-1)/2*CW);
};
G.up=function(){drag=null;};
G.key=function(c,d){
  if(!d)return;
  if(c==='ArrowLeft'||c==='KeyA')bx=clamp(bx-CW,-(LANES-1)/2*CW,(LANES-1)/2*CW);
  if(c==='ArrowRight'||c==='KeyD')bx=clamp(bx+CW,-(LANES-1)/2*CW,(LANES-1)/2*CW);
};
/* ---- ciclo ---- */
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  scene=new T3.Scene();
  scene.background=new T3.Color('#05070f');
  scene.fog=new T3.Fog(0x05070f,30,64);
  cam=new T3.PerspectiveCamera(58,ARC.W/ARC.H,.1,120);
  scene.add(new T3.HemisphereLight(0xd8f6ff,0x1b2b44,1.25));
  const d=new T3.DirectionalLight(0xffffff,.75);d.position.set(3,9,6);scene.add(d);
  trackG=new T3.Group();scene.add(trackG);
  ball=new T3.Mesh(new T3.SphereGeometry(.42,18,12),mat('#ffd166',1));
  scene.add(ball);
};
G.resize=function(){if(cam){cam.aspect=ARC.W/ARC.H;cam.updateProjectionMatrix();}};
G.start=function(l){
  if(!T3)return;
  lvl=l||1;
  buildTrack(lvl);
  bx=0;bz=0;vz=7.6+lvl*.5;dead=false;won=false;gemN=0;used=0;check=0;
  ball.position.set(0,.38,0);
  ARC.hud(0,'NIVEL '+lvl+'  ·  0/'+LEN+' m');
  ARC.tray([
    {id:'lf',txt:'◀',gh:1,fn:()=>{bx=clamp(bx-CW,-(LANES-1)/2*CW,(LANES-1)/2*CW);}},
    {id:'rt',txt:'▶',gh:1,fn:()=>{bx=clamp(bx+CW,-(LANES-1)/2*CW,(LANES-1)/2*CW);}}
  ]);
};
G.step=function(dt){
  if(!T3||dead||won)return;
  bz+=vz*dt;
  /* sierras */
  for(const o of obs){
    if(o.t!=='saw')continue;
    o.m.rotation.x+=dt*14;
    if(o.amp){o.m.position.x=o.x+Math.sin(ARC.t*1.7+o.ph)*o.amp*.5;}
  }
  /* piso */
  if(!cellAt(bx,bz)){die('fall');return;}
  /* choques */
  for(const o of obs){
    if(Math.abs(o.z-bz)>.6)continue;
    const ox=o.t==='saw'?o.m.position.x:o.x;
    if(Math.abs(ox-bx)<o.w+.3){die('hit');return;}
  }
  /* diamantes */
  for(const gm of gems){
    if(gm.got||Math.abs(gm.z-bz)>.6)continue;
    if(Math.abs(gm.x-bx)<.6){
      gm.got=1;gm.m.visible=false;gemN++;
      ARC.sfx('coin',{rate:1+gemN*.02});
      ARC.fx.text(ARC.W/2,ARC.H*.42,'+1',{color:'#7dd3fc',size:18});
    }
  }
  /* puesto de control a la mitad */
  if(!check&&bz>LEN/2){check=Math.floor(LEN/2);ARC.toast('Puesto de control');ARC.sfx('chime');}
  if(bz>=LEN){
    won=true;
    const st=gemN>=gems.length*.8?3:(gemN>=gems.length*.45?2:1);
    ARC.sfx('win');
    setTimeout(()=>ARC.over({win:true,score:Math.round(bz),stars:st,coins:15+gemN*2,
      sub:'Diamantes: '+gemN+'/'+gems.length+(used?'<br>Usaste la vuelta de control':'')}),350);
    return;
  }
  ARC.hud(Math.round(bz),'NIVEL '+lvl+'  ·  '+Math.round(bz)+'/'+LEN+' m');
  tilt=lerp(tilt,(bx-ball.position.x)*3.2,.2);
  ball.position.set(lerp(ball.position.x,bx,1-Math.pow(1e-7,dt)),.42,-bz);
  ball.rotation.x-=vz*dt*2.4;
};
G.draw=function(g){
  if(!ARC.rnd||!scene)return;
  cam.position.set(ball.position.x*.5,2.5,-bz+5.6);
  cam.lookAt(ball.position.x*.25,.2,-bz-6);
  cam.rotation.z=tilt*.02;
  ARC.rnd.render(scene,cam);
  const w=ARC.W*.44,x=(ARC.W-w)/2,y=ARC.H*.94,h=Math.max(5,ARC.H*.013);
  g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x,y,w,h);
  g.fillStyle='#22d3ee';g.fillRect(x,y,w*clamp(bz/LEN,0,1),h);
  if(check){g.fillStyle='#fff';g.fillRect(x+w*.5-1,y-2,2,h+4);}
  if(bz<6&&!dead){
    g.fillStyle='rgba(255,255,255,.9)';
    g.font='900 '+Math.max(12,ARC.H*.042)+'px system-ui,sans-serif';g.textAlign='center';
    g.fillText('ARRASTRÁ PARA MOVERTE',ARC.W/2,ARC.H*.18);g.textAlign='left';
  }
};
G.dbg={
  state:()=>({bz:+bz.toFixed(1),LEN,gems:gemN,dead,won,lvl,used,how:lastDie}),
  rows:(a,b)=>{const o=[];for(let z=a;z<=b;z++){
    const r=cells[z]?cells[z].join(''):'?';
    const ob=obs.filter(x=>x.z===z).map(x=>x.t[0]+Math.round((x.x/CW+(LANES-1)/2)));
    o.push(z+':'+r+(ob.length?'('+ob.join(',')+')':''));}return o;},
  /* piloto con PLANIFICACIÓN: el greedy de un carril por paso se quedaba pegado
     (medido: fall@46.8 en el carril 3, con la fila 47 = 01101 — el camino existía
     por el 2 y el 4 pero había que empezar a moverse 4 filas antes). Acá se hace
     programación dinámica sobre 9 filas x 5 carriles: se marca qué carriles son
     alcanzables moviéndose como máximo uno por fila y se elige el primer paso de
     un camino que sobreviva las 9. Con esto termina el nivel. */
  autoMove:()=>{
    if(dead||won)return false;
    const z0=Math.floor(bz)+1,DEEP=14;  /* 20 filas ≈ lo que ve un humano en pantalla */
    const okAt=(i,z)=>{
      if(!cells[z]||!cells[z][i])return false;
      const x=(i-(LANES-1)/2)*CW;
      for(const o of obs){
        if(Math.abs(o.z-z)>1.0)continue;
        const ox=o.t==='saw'?o.m.position.x:o.x;
        if(Math.abs(ox-x)<o.w+.5)return false;
      }
      return true;
    };
    const cur=Math.round(bx/CW+(LANES-1)/2);
    /* la fila donde ESTOY parado cuenta: el colisionador usa Math.round(bz) y el
       plan arrancaba en floor(bz)+1, así que el piloto se corría a un carril bueno
       para las filas de adelante pero con agujero en la de abajo (fall@39.3). */
    const zNow=Math.round(bz);
    /* alcanzables: capa por capa, guardando de dónde vino cada uno */
    let layer=[];
    for(let i=0;i<LANES;i++)layer.push(Math.abs(i-cur)<=1&&okAt(i,zNow)&&okAt(i,z0)?[i]:null);
    for(let d=1;d<DEEP;d++){
      const nx=new Array(LANES).fill(null);
      for(let i=0;i<LANES;i++){
        if(!okAt(i,z0+d))continue;
        for(const k of [i-1,i,i+1]){
          if(k<0||k>=LANES||!layer[k])continue;
          nx[i]=layer[k];break;
        }
      }
      if(nx.some(Boolean))layer=nx;else break;
    }
    /* de los caminos que sobreviven, el que empieza más cerca de donde estoy */
    let best=null;
    for(const p2 of layer)if(p2&&(best===null||Math.abs(p2[0]-cur)<Math.abs(best-cur)))best=p2[0];
    if(best===null){
      /* sin camino de 20 filas: el más CERCANO que aguante 3 filas. Ojo el orden:
         recorrer 0..LANES y quedarse con el primero empujaba la pelota al carril 0
         y la tiraba al vacío siempre en el mismo lugar (fall@59.5 x=-2.50). */
      for(const i of [cur,cur-1,cur+1]){
        if(i<0||i>=LANES)continue;
        if(okAt(i,zNow)&&okAt(i,z0)&&okAt(i,z0+1)&&okAt(i,z0+2)){best=i;break;}
      }
      if(best===null)for(const i of [cur,cur-1,cur+1]){
        if(i<0||i>=LANES)continue;
        if(okAt(i,zNow)&&okAt(i,z0)){best=i;break;}
      }
    }
    if(best!==null)bx=clamp((best-(LANES-1)/2)*CW,-(LANES-1)/2*CW,(LANES-1)/2*CW);
    return true;
  }
};
window.GAME=G;
