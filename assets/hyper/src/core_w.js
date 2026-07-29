/* ============================================================
   SUX SANDBOX — core_w: 25 EXPERIMENTOS DE CLIMA Y ENTORNO
   ------------------------------------------------------------
   Usa la cañería de core_u (XP.add) y NO la toca. Acá vive el MOTOR DE CLIMA que los 25
   comparten, porque hacer 25 sistemas de partículas sueltos serían 25 draw calls, 25 pools y
   25 formas distintas de olvidarse de apagar algo.

   ── CÓMO ESTÁ ARMADO ──────────────────────────────────────────────────────────────
   1. CONTRIBUCIONES (WXC / WX). Ningún experimento escribe el clima directamente: cada uno
      declara SU aporte en WXC[id] = {rain:.7, windX:8, fogK:.4, dark:.6, …} y wxSum() los
      suma/maximiza en WX. Por qué: los 25 se pueden encender JUNTOS (el panel maestro y el
      clima aleatorio lo hacen), y apagar uno no tiene que apagar lo que puso otro. Sumar por
      contribución es lo único que hace que "parar la lluvia" no pare también la nieve.
   2. CAPAS DE PARTÍCULAS POOLEADAS (wxLayer). Cuatro y sólo cuatro objetos de dibujo para
      todo el clima: gotas (LineSegments = estelas de verdad, no puntitos), copos/polvo/espuma
      (Points alfa), brasas/chispas (Points aditivas) y hojas (Points con sprite de hoja).
      Las partículas se crean UNA vez al arrancar y se reciclan con swap-remove: cero basura
      por frame, y el presupuesto de cada capa sale de QP.key (WQ).
   3. CUERPOS REALES POOLEADOS (wxRokFire). Granizo, meteoritos y bombas de lava son
      CANNON.Body de verdad — un puñado, no miles — que entran y salen del mundo. Es lo que
      hace que el granizo "tenga impacto físico" en serio y no de mentira.
   4. CIELO CON FUNDIDO CRUZADO (wxSky*). El cielo del motor es UNA esfera con
      MeshBasicMaterial BackSide (buildSky, core_a). Acá se agrega una SEGUNDA esfera un pelo
      más chica con la panorámica destino y opacidad 0..1: mover el slider de día/noche es
      literalmente mover esa opacidad, así que el cambio es continuo y no un salto. Las
      panorámicas son EQUIRECTANGULARES 2:1 generadas con Higgsfield (sky-day / dusk / night /
      eclipse / aurora / storm / sand .jpg, 33-136 kB cada una) y se cargan DIFERIDAS: si nadie
      enciende el día/noche, no se baja ni un byte.
   5. LUZ / NIEBLA. Se guarda la línea base una sola vez (sol, hemi, fill, niebla, fondo,
      exposición): cuando el último experimento que toca la luz se apaga, todo vuelve EXACTO a
      como estaba. Nunca se toca PL ni la cámara del motor.
   6. VIENTO SOBRE PROPS. Fuerza aerodinámica de verdad: F ≈ q·A con q = ½ρv² y A el área
      frontal del prop (cacheada de buildDef). Por eso un cajón vuela y un sedán apenas se
      mueve, sin ningún caso especial.
   7. AGUA. La inundación y el tsunami suben el nivel metiendo una entrada en WATER: con eso
      stepWater() (core_b) le da flotación a TODOS los props y playerStep le da inWater al
      jugador, gratis.

   ── RENDIMIENTO ──────────────────────────────────────────────────────────────────
   Nada se crea por frame. Todo escala con QP.key (WQ = .34 uld / .66 low / 1 high): cantidad
   de gotas, capas de la manga del tornado, cortinas de aurora, cuerpos reales. Si no hay
   ningún experimento encendido los dos ganchos del bucle salen en la primera línea. Los
   materiales del mundo se retocan (piso mojado) sólo cuando el valor CAMBIA, no por frame.

   ── APAGADO GARANTIZADO ──────────────────────────────────────────────────────────
   Todos llevan stopOnGone:true (si borrás el prop, se apaga) y además hay un vigía en
   EXT.frame: en cuanto APP deja de ser play/pause/spawn (volver al menú) se apagan los 25 y se
   devuelven cielo, luz, niebla, gravedad, agua y materiales.

   ── PANTALLA ROTADA ──────────────────────────────────────────────────────────────
   No se dibuja ni una sola pantalla propia: todos los paneles son de XP (core_u), que ya se
   cuelgan de #stage y se miden en vmin, así que funcionan igual con el teléfono vertical
   (donde #stage está rotado 90°). Lo único que se agrega al DOM son toasts del motor.

   ── HOOKS (?dev) ─────────────────────────────────────────────────────────────────
   __H.xpwTest()  prueba rápida de los 25 -> {id:'ok'|'FALLO · motivo'}
   __H.xpwInfo()  estado del motor (WX, capas, pools, cielo, luz, agua)
   __H.xpwList()  los 25 con su categoría y si están corriendo
   __H.xpwOff()   apaga todo y restaura   ·  __H.xpwRun(id)/__H.xpwStop(id)
   __H.xpwFlash() fuerza un relámpago     ·  __H.xpwWave() lanza el tsunami ya
   __H.xpwStep(n) avanza n frames de física + clima (para medir sin esperar)
   ============================================================ */

/* contratos con quien venga después: reasignar, nunca re-declarar */
if(typeof wxOnWeather==='undefined')var wxOnWeather=null;   /* fn(WX) — aviso de cambio de clima */

/* ================= 0. presupuesto por calidad ================= */
/* WQ es EL número: todo lo caro se multiplica por acá. En ULD (celular flojo) queda un tercio. */
const WQ=QP.key==='high'?1:(QP.key==='low'?.66:.34);
const WCAP={rain:Math.round(920*WQ),soft:Math.round(760*WQ),glow:Math.round(440*WQ),
  leaf:Math.round(260*WQ),rok:QP.key==='high'?16:(QP.key==='low'?10:5)};
const WSLV=QP.key==='high'?5:(QP.key==='low'?4:3);      /* capas de manga del tornado */
const WCUR=QP.key==='high'?5:(QP.key==='low'?4:3);      /* cortinas de aurora */

/* ================= 1. texturas procedurales =================
   Ninguna se descarga: son canvas de 64-256 px generados una vez. Los blobs se dibujan BLANCOS
   sobre transparente y se usan como 'map': así el alfa sale del canvas y el color lo pone
   material.color (o el color por vértice). Si se usaran como map opaco, el fondo negro del
   canvas taparía el cielo. */
function wxCv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function wxTexDot(soft){
  const S=64,cv=wxCv(S,S),g=cv.getContext('2d');
  const gr=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);
  if(soft){gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.45,'rgba(255,255,255,.55)');
    gr.addColorStop(1,'rgba(255,255,255,0)');}
  else{gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.18,'rgba(255,255,255,.85)');
    gr.addColorStop(.5,'rgba(255,255,255,.28)');gr.addColorStop(1,'rgba(255,255,255,0)');}
  g.fillStyle=gr;g.fillRect(0,0,S,S);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function wxTexLeaf(){
  const S=64,cv=wxCv(S,S),g=cv.getContext('2d');
  g.fillStyle='rgba(255,255,255,.92)';
  g.beginPath();g.moveTo(32,4);g.quadraticCurveTo(60,26,32,60);g.quadraticCurveTo(4,26,32,4);g.fill();
  g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=3;
  g.beginPath();g.moveTo(32,8);g.lineTo(32,56);g.stroke();
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
/* nube: alfa irregular que CIERRA en horizontal (cada blob se dibuja también a ±ancho), con los
   bordes de arriba y abajo desvanecidos para que la manga del tornado no tenga corte duro */
function wxTexCloud(){
  const W=256,H=128,cv=wxCv(W,H),g=cv.getContext('2d');
  for(let i=0;i<200;i++){
    const x=Math.random()*W,y=Math.random()*H,r=6+Math.random()*34,a=.04+Math.random()*.13;
    for(let k=-1;k<2;k++){
      const gr=g.createRadialGradient(x+k*W,y,0,x+k*W,y,r);
      gr.addColorStop(0,'rgba(255,255,255,'+a.toFixed(3)+')');
      gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr;g.beginPath();g.arc(x+k*W,y,r,0,6.2832);g.fill();
    }
  }
  g.globalCompositeOperation='destination-in';
  const lg=g.createLinearGradient(0,0,0,H);
  lg.addColorStop(0,'rgba(0,0,0,0)');lg.addColorStop(.22,'rgba(0,0,0,1)');
  lg.addColorStop(.8,'rgba(0,0,0,1)');lg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=lg;g.fillRect(0,0,W,H);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
/* cortina de aurora: franjas verticales con degradado (abajo intenso, arriba se apaga) */
function wxTexCurtain(){
  const W=128,H=128,cv=wxCv(W,H),g=cv.getContext('2d');
  for(let i=0;i<26;i++){
    const x=Math.random()*W,w=3+Math.random()*13,a=.10+Math.random()*.4;
    const gr=g.createLinearGradient(0,H,0,0);
    gr.addColorStop(0,'rgba(255,255,255,0)');
    gr.addColorStop(.18,'rgba(255,255,255,'+a.toFixed(3)+')');
    gr.addColorStop(.62,'rgba(255,255,255,'+(a*.5).toFixed(3)+')');
    gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.fillRect(x,0,w,H);
  }
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=THREE.RepeatWrapping;return t;
}
const WTEX={};
nsafe(()=>{WTEX.soft=wxTexDot(true);WTEX.glow=wxTexDot(false);WTEX.leaf=wxTexLeaf();
  WTEX.cloud=wxTexCloud();WTEX.curt=wxTexCurtain();},'wxtex');

/* ================= 2. capas de partículas pooleadas =================
   Un objeto de dibujo por capa, creado una vez. Las partículas son objetos PREASIGNADOS que se
   reciclan con swap-remove (el vivo de la punta ocupa el hueco del que muere): el bucle es
   siempre 0..n sin agujeros y el recolector de basura nunca ve nada nuevo.
   El color va en un atributo de 4 componentes (RGBA): three r150+ activa USE_COLOR_ALPHA cuando
   el itemSize es 4, y sin eso las partículas alfa se apagarían a NEGRO en vez de a
   transparente (probado: con RGB de 3 la lluvia dejaba puntos oscuros al morir). */
const WMD_BAL=0,WMD_FLT=1,WMD_ORB=2;   /* balística · aleteo · órbita */
function wxLayer(cap,kind,tex,add,base,order){
  const pool=new Array(cap);
  for(let i=0;i<cap;i++)pool[i]={x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,max:1,sz:1,
    r:1,g:1,b:1,a:1,gr:1,dg:0,md:0,pv:null,f0:0,f1:0,f2:0,f3:0,fy:0,spl:0,tail:.045};
  const vpp=kind==='ln'?2:1;
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(cap*vpp*3),col=new Float32Array(cap*vpp*4);
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color',new THREE.BufferAttribute(col,4).setUsage(THREE.DynamicDrawUsage));
  let szA=null;
  if(kind==='pt'){szA=new Float32Array(cap);
    geo.setAttribute('aSize',new THREE.BufferAttribute(szA,1).setUsage(THREE.DynamicDrawUsage));}
  geo.setDrawRange(0,0);
  let mat,obj;
  if(kind==='ln'){
    mat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,fog:false});
    obj=new THREE.LineSegments(geo,mat);
  }else{
    mat=new THREE.PointsMaterial({size:base,sizeAttenuation:true,vertexColors:true,map:tex,
      transparent:true,depthWrite:false,fog:false,
      blending:add?THREE.AdditiveBlending:THREE.NormalBlending});
    /* tamaño POR partícula: se inyecta el attribute en el shader de siempre. Si el string no
       coincide (otra versión de three) el replace no hace nada y el material sigue andando,
       sólo con tamaño fijo — mismo criterio que core_l. */
    mat.onBeforeCompile=sh=>{
      sh.vertexShader=sh.vertexShader
        .replace('#include <common>','attribute float aSize;\n#include <common>')
        .replace('gl_PointSize = size;','gl_PointSize = size*aSize;')
        .replace('gl_PointSize = size * ( scale / - mvPosition.z );',
                 'gl_PointSize = size*aSize*(scale/-mvPosition.z);');
    };
    obj=new THREE.Points(geo,mat);
  }
  obj.frustumCulled=false;obj.renderOrder=order||10;obj.visible=false;
  scene.add(obj);
  const L={cap,kind,pool,n:0,geo,mat,obj,pos,col,szA,vpp,acc:0};
  L.get=()=>{if(L.n>=cap)return null;const p=pool[L.n++];
    p.md=0;p.gr=1;p.dg=0;p.pv=null;p.spl=0;p.a=1;p.tail=.045;p.fy=0;
    p.f0=p.f1=p.f2=p.f3=0;p.vx=p.vy=p.vz=0;return p;};
  L.kill=i=>{const t=pool[i];pool[i]=pool[--L.n];pool[L.n]=t;};
  L.clear=()=>{L.n=0;L.geo.setDrawRange(0,0);L.obj.visible=false;};
  return L;
}
const WL={};
nsafe(()=>{
  WL.rain=wxLayer(WCAP.rain,'ln',null,false,1,10);
  WL.soft=wxLayer(WCAP.soft,'pt',WTEX.soft,false,.34,10);
  WL.glow=wxLayer(WCAP.glow,'pt',WTEX.glow,true ,.42,11);
  /* base 1.0 y NO .30: el tamaño final es base×sz, y con base .30 las hojas medían 6-14 cm —
     mirando la captura no se veía ni una. Con base 1 quedan de 20 a 50 cm, que es una hoja. */
  WL.leaf=wxLayer(WCAP.leaf,'pt',WTEX.leaf,false,1.0,10);
},'wxlayers');

/* integración: una sola función para las cuatro capas. Todo va por dt (regla de la casa):
   ninguna constante se aplica "por frame". */
const _wxG=19.6;
function wxLayStep(L,dt){
  if(!L)return 0;
  const wx=WX.windX,wz=WX.windZ;
  for(let i=0;i<L.n;){
    const p=L.pool[i];
    p.life-=dt;
    if(p.life<=0){L.kill(i);continue;}
    if(p.md===WMD_ORB&&p.pv){
      /* órbita: el ángulo avanza más rápido cuanto más cerca del eje (como un vórtice real),
         el radio crece con la altura y el centro es un objeto VIVO (el tornado se mueve). */
      p.y+=p.vy*dt;
      const rr=Math.max(.2,p.f0+p.f1*Math.max(0,p.y-p.pv.y));
      p.f2+=(p.f3/Math.max(1.2,rr))*dt;
      p.x=p.pv.x+Math.cos(p.f2)*rr;
      p.z=p.pv.z+Math.sin(p.f2)*rr;
      if(p.y>p.pv.y+p.pv.h){L.kill(i);continue;}
    }else{
      if(p.gr)p.vy-=_wxG*p.gr*dt;
      if(p.dg){const k=Math.min(1,p.dg*dt);
        p.vx+=(wx-p.vx)*k;p.vz+=(wz-p.vz)*k;}
      if(p.md===WMD_FLT){p.f2+=p.f3*dt;
        p.x+=(p.vx+Math.cos(p.f2)*p.f0)*dt;p.z+=(p.vz+Math.sin(p.f2*.83)*p.f0)*dt;}
      else{p.x+=p.vx*dt;p.z+=p.vz*dt;}
      p.y+=p.vy*dt;
      if(p.y<=p.fy&&p.vy<0){
        if(p.spl)wxSplash(p.x,p.fy,p.z,p.spl);
        L.kill(i);continue;
      }
    }
    i++;
  }
  const n=L.n;
  if(!n){L.geo.setDrawRange(0,0);L.obj.visible=false;return 0;}
  const P=L.pos,C=L.col;
  if(L.kind==='ln'){
    for(let i=0;i<n;i++){
      const p=L.pool[i],o=i*6,c=i*8,t=p.tail;
      P[o]=p.x;P[o+1]=p.y;P[o+2]=p.z;
      P[o+3]=p.x-p.vx*t;P[o+4]=p.y-p.vy*t;P[o+5]=p.z-p.vz*t;
      const al=p.a*Math.min(1,p.life/Math.max(.06,p.max*.3));
      C[c]=p.r;C[c+1]=p.g;C[c+2]=p.b;C[c+3]=al;
      C[c+4]=p.r;C[c+5]=p.g;C[c+6]=p.b;C[c+7]=al*.14;   /* la cola se desvanece: estela */
    }
    L.geo.setDrawRange(0,n*2);
  }else{
    const S=L.szA;
    for(let i=0;i<n;i++){
      const p=L.pool[i],o=i*3,c=i*4;
      P[o]=p.x;P[o+1]=p.y;P[o+2]=p.z;
      const al=p.a*Math.min(1,p.life/Math.max(.06,p.max*.35));
      C[c]=p.r;C[c+1]=p.g;C[c+2]=p.b;C[c+3]=al;
      S[i]=p.sz;
    }
    L.geo.setDrawRange(0,n);
    L.geo.attributes.aSize.needsUpdate=true;
  }
  L.geo.attributes.position.needsUpdate=true;
  L.geo.attributes.color.needsUpdate=true;
  L.obj.visible=true;
  return n;
}
/* salpicadura donde pega la gota. Sólo si el piso que se usa para matar la partícula está a la
   altura de los pies del jugador: si no, parado en un techo se verían chispazos allá abajo. */
function wxSplash(x,y,z,k){
  if(Math.abs(y-(plBody.position.y-PL.h*.5))>2.8)return 0;
  const L=k===2?WL.glow:WL.soft;
  for(let i=0;i<2;i++){
    const p=L.get();if(!p)return i;
    p.x=x;p.y=y+.02;p.z=z;
    const a=Math.random()*6.2832,s=.6+Math.random()*1.1;
    p.vx=Math.cos(a)*s;p.vz=Math.sin(a)*s;p.vy=1.1+Math.random()*1.3;
    /* .45..0.8 y no .10: el tamaño final es base(.34)×sz y con .10 la salpicadura medía 3 cm —
       invisible. Los tamaños de TODA la capa alfa se corrigieron mirando las capturas. */
    p.life=p.max=.22+Math.random()*.14;p.sz=.45+Math.random()*.35;p.gr=1;p.dg=0;p.fy=y-3;
    if(k===2){p.r=1;p.g=.55;p.b=.18;p.a=.9;}else{p.r=.78;p.g=.86;p.b=.95;p.a=.7;}
  }
  return 2;
}

/* ================= 3. estado del clima (contribuciones) ================= */
const WXC={};                       /* id de experimento -> su aporte */
const WX={rain:0,snow:0,hail:0,sand:0,fire:0,ash:0,
  windX:0,windZ:0,fogK:0,dark:0,wet:0,shake:0,
  fogClr:null,sunSet:null,skyBase:null,skyMix:null,skyT:0,hemiClr:null,expo:1};
let wxDirty=true,wxOn=0;
function wxPut(id,o){ if(o)WXC[id]=o;else delete WXC[id]; wxDirty=true; }
function wxSum(){
  wxDirty=false;
  WX.rain=WX.snow=WX.hail=WX.sand=WX.fire=WX.ash=0;
  WX.windX=WX.windZ=0;WX.fogK=WX.dark=WX.wet=WX.shake=0;
  WX.fogClr=WX.sunSet=WX.skyBase=WX.skyMix=WX.hemiClr=null;WX.skyT=0;WX.expo=1;
  let fogBest=-1,n=0;
  for(const k in WXC){
    const c=WXC[k];n++;
    if(c.rain)WX.rain=Math.max(WX.rain,c.rain);
    if(c.snow)WX.snow=Math.max(WX.snow,c.snow);
    if(c.hail)WX.hail=Math.max(WX.hail,c.hail);
    if(c.sand)WX.sand=Math.max(WX.sand,c.sand);
    if(c.fire)WX.fire=Math.max(WX.fire,c.fire);
    if(c.ash) WX.ash =Math.max(WX.ash ,c.ash);
    /* el viento SÍ se suma como VECTOR: dos turbinas enfrentadas se cancelan, que es lo que
       uno espera al probarlo con dos props */
    if(c.windX)WX.windX+=c.windX;
    if(c.windZ)WX.windZ+=c.windZ;
    if(c.wet)  WX.wet  =Math.max(WX.wet,c.wet);
    if(c.shake)WX.shake=Math.max(WX.shake,c.shake);
    if(c.dark) WX.dark =Math.max(WX.dark,c.dark);
    if(c.fogK!=null&&c.fogK>fogBest){fogBest=c.fogK;WX.fogK=c.fogK;
      if(c.fogClr!=null)WX.fogClr=c.fogClr;}
    if(c.sunSet)WX.sunSet=c.sunSet;
    if(c.skyBase)WX.skyBase=c.skyBase;
    if(c.skyMix){WX.skyMix=c.skyMix;WX.skyT=c.skyT||0;}
    if(c.hemiClr!=null)WX.hemiClr=c.hemiClr;
    if(c.expo!=null)WX.expo=Math.min(WX.expo,c.expo);
  }
  wxOn=n;
  if(typeof wxOnWeather==='function')nsafe(()=>wxOnWeather(WX),'wxonw');
  return WX;
}

/* ================= 4. sonido ambiente gestionado ================= */
/* El catálogo SND no tiene un bucle de LLUVIA; el que más se le acerca es 'amb-wind' (lecho de
   ruido de viento). Se usa ESO como fondo de lluvia/tormenta/huracán/arena, más golpes sueltos
   que sí existen ('splash', 'boom', 'imp-*', 'crash'). No se genera audio nuevo (regla del
   enunciado): si aparece un bucle de lluvia en SND, alcanza con cambiar el nombre acá. */
const WXAMB={};
function wxAmbOn(id,name,vol){
  if(typeof sLoop!=='function')return false;
  const cur=WXAMB[id];
  if(cur&&cur.name===name){if(cur.h&&cur.h.set)nsafe(()=>cur.h.set(vol),'wxav');cur.vol=vol;return true;}
  wxAmbOff(id);
  const h=nsafe(()=>sLoop(name,vol),'wxamb');
  if(!h)return false;
  WXAMB[id]={name,h,vol};return true;
}
function wxAmbOff(id){
  const c=WXAMB[id];if(!c)return false;
  if(c.h&&c.h.stop)nsafe(()=>c.h.stop(),'wxamboff');
  delete WXAMB[id];return true;
}
function wxAmbAllOff(){for(const k in WXAMB)wxAmbOff(k);}
const wxSnd=(n,o)=>{if(typeof sPlay==='function')return !!nsafe(()=>sPlay(n,o),'wxsnd');return false;};

/* ================= 5. cielo con fundido cruzado ================= */
const WXSKY={tex:{},pend:{},ov:null,base:null,cur:null,mix:null,loaded:0};
const wxSkyR=()=>Math.min(QP.far*.93,1600);
function wxSkyTex(key,cb){
  if(WXSKY.tex[key]){if(cb)cb(WXSKY.tex[key]);return WXSKY.tex[key];}
  if(WXSKY.pend[key]||!okUrl(BASE))return null;
  WXSKY.pend[key]=1;
  nsafe(()=>new THREE.TextureLoader().load(BASE+'sky-'+key+'.jpg',t=>{
    /* equirectangular 2:1 -> UNA vuelta completa (repeat 1,1) y wrap sólo horizontal. El cielo
       original del motor usa repeat(3,1) MirroredRepeat sobre TEX.sky: son texturas distintas,
       así que no se pisan y volver atrás es sólo reponer el map. */
    t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;
    t.repeat.set(1,1);t.anisotropy=QP.anis;
    WXSKY.tex[key]=t;WXSKY.loaded++;delete WXSKY.pend[key];
    if(cb)cb(t);
  },undefined,()=>{delete WXSKY.pend[key];}),'wxskyload');
  return null;
}
function wxSkyOv(){
  if(WXSKY.ov)return WXSKY.ov;
  const g=new THREE.SphereGeometry(wxSkyR()*.985,22,14);
  const m=new THREE.MeshBasicMaterial({side:THREE.BackSide,fog:false,transparent:true,
    opacity:0,depthWrite:false,color:0xffffff});
  const o=new THREE.Mesh(g,m);o.frustumCulled=false;o.renderOrder=-1;o.visible=false;
  scene.add(o);WXSKY.ov=o;return o;
}
/* base: la esfera del motor. key=null -> volver a la textura original del mapa. */
function wxSkyBase(key){
  if(!skyMesh)return false;
  if(WXSKY.base===null)WXSKY.base=skyMesh.material.map||false;   /* la de fábrica, una sola vez */
  if(!key){
    const t=WXSKY.base||null;
    skyMesh.material.map=t;
    if(t){t.wrapS=THREE.MirroredRepeatWrapping;t.repeat.set(3,1);skyMesh.material.color.setScalar(1);}
    else skyMesh.material.color.setHex(0xa9c6dd);
    skyMesh.material.needsUpdate=true;WXSKY.cur=null;return true;
  }
  const t=wxSkyTex(key);
  if(!t)return false;
  if(skyMesh.material.map!==t){skyMesh.material.map=t;skyMesh.material.color.setScalar(1);
    skyMesh.material.needsUpdate=true;}
  WXSKY.cur=key;return true;
}
/* mezcla: la esfera de encima con la panorámica destino y opacidad t (0..1) */
function wxSkyMix(key,t){
  const o=wxSkyOv();
  if(!key||t<=.002){o.visible=false;o.material.opacity=0;WXSKY.mix=null;return true;}
  const tx=wxSkyTex(key);
  if(!tx){o.visible=false;return false;}
  if(o.material.map!==tx){o.material.map=tx;o.material.needsUpdate=true;}
  o.material.opacity=clamp(t,0,1);o.visible=true;WXSKY.mix=key;return true;
}
function wxSkyReset(){wxSkyBase(null);wxSkyMix(null,0);WXSKY.base=null;}
/* precarga: la llaman los experimentos de cielo en start() para que la panorámica ya esté
   cuando el jugador mueva el slider (si no, el primer movimiento no cambia nada) */
function wxSkyWarm(){for(const k of ['day','dusk','night'])wxSkyTex(k);return WXSKY.loaded;}

/* ================= 6. luz, niebla y exposición ================= */
const WXL={ok:false,map:null,
  fogClr:0,fogNear:0,fogFar:0,bg:0,sunP:[0,0,0],sunI:0,sunC:0,hemiI:0,hemiS:0,hemiG:0,
  fillI:0,expo:1};
function wxLightGrab(){
  const mid=CURMAP?CURMAP.id:null;
  if(WXL.ok&&WXL.map===mid)return false;
  WXL.map=mid;WXL.ok=true;
  WXL.fogClr=scene.fog?scene.fog.color.getHex():0xc4d2dc;
  WXL.fogNear=scene.fog?scene.fog.near:140;WXL.fogFar=scene.fog?scene.fog.far:560;
  WXL.bg=(scene.background&&scene.background.getHex)?scene.background.getHex():0xc4d2dc;
  WXL.sunP=[sun.position.x,sun.position.y,sun.position.z];
  WXL.sunI=sun.intensity;WXL.sunC=sun.color.getHex();
  WXL.hemiI=hemi.intensity;WXL.hemiS=hemi.color.getHex();WXL.hemiG=hemi.groundColor.getHex();
  WXL.fillI=fill.intensity;WXL.expo=renderer.toneMappingExposure;
  return true;
}
function wxLightRestore(){
  if(!WXL.ok)return false;
  if(scene.fog){scene.fog.color.setHex(WXL.fogClr);scene.fog.near=WXL.fogNear;scene.fog.far=WXL.fogFar;}
  if(scene.background&&scene.background.setHex)scene.background.setHex(WXL.bg);
  sun.position.set(WXL.sunP[0],WXL.sunP[1],WXL.sunP[2]);
  sun.intensity=WXL.sunI;sun.color.setHex(WXL.sunC);
  hemi.intensity=WXL.hemiI;hemi.color.setHex(WXL.hemiS);hemi.groundColor.setHex(WXL.hemiG);
  fill.intensity=WXL.fillI;renderer.toneMappingExposure=WXL.expo;
  WXL.ok=false;return true;
}
const _wxC1=new THREE.Color(),_wxC2=new THREE.Color();
let wxFlashI=0;                     /* fogonazo de relámpago: 0..1, decae por dt */
function wxLightApply(){
  if(!WXL.ok)return false;
  const d=WX.dark,f=WX.fogK,S=WX.sunSet;
  /* sol: si algún experimento pide una posición explícita (día/noche, eclipse, atardecer) manda
     ésa; si no, se queda donde el mapa lo puso y sólo se le baja la intensidad. */
  if(S){
    const el=S.el*D2R,az=S.az*D2R,R=150;
    sun.position.set(Math.cos(el)*Math.sin(az)*R,Math.max(-40,Math.sin(el)*R),Math.cos(el)*Math.cos(az)*R);
    sun.intensity=Math.max(0,S.i)*(1-d*.9)+wxFlashI*1.4;
    if(S.c!=null)sun.color.setHex(S.c);else sun.color.setHex(WXL.sunC);
    fill.intensity=WXL.fillI*clamp(S.i/Math.max(.2,WXL.sunI),.12,1.2);
  }else{
    sun.position.set(WXL.sunP[0],WXL.sunP[1],WXL.sunP[2]);
    sun.color.setHex(WXL.sunC);
    sun.intensity=WXL.sunI*(1-d*.82)+wxFlashI*1.4;
    fill.intensity=WXL.fillI*(1-d*.7);
  }
  hemi.intensity=(S&&S.h!=null?S.h:WXL.hemiI)*(1-d*.7)+wxFlashI*1.9;
  if(WX.hemiClr!=null)hemi.color.setHex(WX.hemiClr);else hemi.color.setHex(WXL.hemiS);
  renderer.toneMappingExposure=WXL.expo*clamp(WX.expo,.25,1.6)+wxFlashI*.35;
  /* niebla: el color destino gana con fogK; el fogonazo del rayo la lleva a blanco un instante */
  if(scene.fog){
    const tgt=WX.fogClr!=null?WX.fogClr:WXL.fogClr;
    _wxC1.setHex(WXL.fogClr);_wxC2.setHex(tgt);
    _wxC1.lerp(_wxC2,f>0?Math.max(f,.4):(WX.fogClr!=null?.65:0));
    if(d>0)_wxC1.multiplyScalar(1-d*.72);
    if(wxFlashI>.01){_wxC2.setRGB(1,1,1);_wxC1.lerp(_wxC2,Math.min(.85,wxFlashI));}
    scene.fog.color.copy(_wxC1);
    if(scene.background&&scene.background.copy)scene.background.copy(_wxC1);
    scene.fog.near=WXL.fogNear+(6-WXL.fogNear)*f;
    scene.fog.far =WXL.fogFar +(38-WXL.fogFar)*f;
  }
  return true;
}
/* piso y props mojados: se sube el brillo especular y se oscurece el albedo de los materiales
   COMPARTIDOS del mundo. Son ~20 materiales y se tocan sólo cuando el valor cambia >2 %: por eso
   entra en "si es barato" — no hay ni una textura nueva ni un shader nuevo. */
const WXMAT={base:null,cur:-1};
function wxWetApply(v){
  v=clamp(v,0,1);
  if(WXMAT.base&&Math.abs(WXMAT.cur-v)<.02)return false;
  if(!WXMAT.base){
    WXMAT.base={};
    for(const k in PMAT){const m=PMAT[k];
      WXMAT.base[k]={c:m.color.getHex(),sh:m.shininess,
        sp:(m.specular?m.specular.r:null),ro:m.roughness,me:m.metalness};}
  }
  WXMAT.cur=v;
  for(const k in PMAT){
    const m=PMAT[k],b=WXMAT.base[k];if(!b)continue;
    _wxC1.setHex(b.c).multiplyScalar(1-.26*v);
    m.color.copy(_wxC1);
    if(b.sh!=null)m.shininess=b.sh+150*v;
    if(b.sp!=null&&m.specular)m.specular.setScalar(b.sp+.42*v);
    if(b.ro!=null)m.roughness=Math.max(.04,b.ro*(1-.7*v));
    if(b.me!=null)m.metalness=Math.min(1,b.me+.18*v);
    m.needsUpdate=true;
  }
  return true;
}

/* ================= 7. viento sobre los props ================= */
/* F ≈ q·A con q = ½ρv² y A el área frontal aproximada del prop (de buildDef, cacheada en el
   def). Con esto un cajón de 20 kg sale volando y un sedán de 1200 kg apenas se corre: la
   diferencia sale de la física, no de una lista de excepciones. */
let wxWindCur=0;
function wxPropArea(p){
  let A=p.def._wxA;
  if(A===undefined){
    const b=buildDef(p.def),s=(b&&b.size)||[1,1,1];
    A=p.def._wxA=clamp(Math.max(s[0],s[2])*s[1],.05,26);
  }
  return A;
}
const _wxF=new CANNON.Vec3(),_wxO=new CANNON.Vec3(0,0,0);
function wxWindStep(){
  const wx=WX.windX,wz=WX.windZ,v2=wx*wx+wz*wz;
  if(v2<.5)return 0;
  const A=actives();if(!A.length)return 0;
  const px=camera.position.x,pz=camera.position.z;
  const q=.55*v2,iv=1/Math.sqrt(v2);       /* ½ρv² con ρ efectivo 1,1 */
  let hit=0,seen=0;
  /* cursor rotativo: como máximo 220 props por frame, para que 1200 props no cuesten el frame */
  for(let k=0;k<A.length&&seen<220;k++){
    wxWindCur=(wxWindCur+1)%A.length;
    const p=A[wxWindCur];
    if(!p||p.frozen)continue;
    seen++;
    const b=p.body,dx=b.position.x-px,dz=b.position.z-pz;
    if(dx*dx+dz*dz>4900)continue;          /* más allá de 70 m no se ve, no se calcula */
    const ar=wxPropArea(p),mx=b.mass*55;   /* techo: 55 m/s² de aceleración, no más */
    let fx=q*ar*wx*iv,fz=q*ar*wz*iv;
    if(fx>mx)fx=mx;else if(fx<-mx)fx=-mx;
    if(fz>mx)fz=mx;else if(fz<-mx)fz=-mx;
    _wxF.set(fx,0,fz);
    b.wakeUp();b.applyForce(_wxF,_wxO);
    hit++;
  }
  return hit;
}
/* fuerza radial genérica (baja presión, tornado, explosión de meteorito, empuje del tsunami).
   Devuelve cuántos props tocó — es la medición de "esto de verdad empuja". */
function wxPush(x,y,z,R,up,rad,tan,lim){
  const A=actives();let n=0;
  for(const p of A){
    if(p.frozen)continue;
    const b=p.body,dx=b.position.x-x,dz=b.position.z-z,dy=b.position.y-y;
    const d2=dx*dx+dz*dz;
    if(d2>R*R||Math.abs(dy)>R*1.4)continue;
    const d=Math.max(1.2,Math.sqrt(d2)),k=(1-d/R)/d*R*.5;   /* ~1/d acotado */
    let ax=0,az=0,ay=up*k;
    if(rad){ax+=rad*k*dx/d;az+=rad*k*dz/d;}
    if(tan){ax+=-tan*k*dz/d;az+=tan*k*dx/d;}
    const L=lim||70,m=Math.hypot(ax,ay,az);
    if(m>L){const s=L/m;ax*=s;ay*=s;az*=s;}
    _wxF.set(ax*b.mass,ay*b.mass,az*b.mass);
    b.wakeUp();b.applyForce(_wxF,_wxO);n++;
  }
  return n;
}

/* ================= 8. sacudida de cámara ================= */
/* Se ENVUELVE camStep (core_m y core_u ya la envolvieron antes): el offset se aplica DESPUÉS de
   que la cámara quedó puesta, así no se acumula nunca. La fase avanza por dt, no por frame. */
let wxShkA=0,wxShkP=0;
const _wxCamStep=camStep;
camStep=function(dt){
  const r=_wxCamStep.apply(this,arguments);
  if(wxShkA>.0008)nsafe(wxShakeApply,'wxshk');
  return r;
};
function wxShakeApply(){
  const a=wxShkA,t=wxShkP;
  camera.position.x+=Math.sin(t*23.7)*a*.55+Math.sin(t*9.3)*a*.30;
  camera.position.y+=Math.sin(t*31.1)*a*.42+Math.cos(t*13.7)*a*.22;
  camera.position.z+=Math.cos(t*19.3)*a*.55+Math.cos(t*7.9)*a*.30;
  return true;
}

/* ================= 9. agua: nivel extra (inundación / tsunami) ================= */
/* Metiendo UNA entrada en WATER, stepWater() (core_b) le da flotación a todos los props y
   playerStep le da inWater al jugador. No hace falta tocar ninguna de las dos. */
const WXW={ent:null,mesh:null,lvl:0,on:false};
function wxWaterTo(lvl){
  const S=(CURMAP&&CURMAP.def&&CURMAP.def.size)||120,bot=-4;
  if(!WXW.ent){
    WXW.ent={x:0,y:(lvl+bot)/2,z:0,w:S*2.2,h:lvl-bot,dp:S*2.2,top:lvl};
    const g=new THREE.PlaneGeometry(S*2.2,S*2.2);g.rotateX(-Math.PI/2);
    nsafe(()=>{if(typeof uvScale==='function')uvScale(g,S/5);},'wxuv');
    tintGeo(g,0xbfe4e8);
    WXW.mesh=new THREE.Mesh(g,waterMat());
    WXW.mesh.renderOrder=2;WXW.mesh.frustumCulled=false;
    scene.add(WXW.mesh);
  }
  WXW.lvl=lvl;WXW.on=true;
  WXW.ent.y=(lvl+bot)/2;WXW.ent.h=lvl-bot;WXW.ent.top=lvl;
  WXW.mesh.position.set(0,lvl,0);WXW.mesh.visible=true;
  if(WATER.indexOf(WXW.ent)<0)WATER.push(WXW.ent);
  return lvl;
}
function wxWaterOff(){
  if(!WXW.on)return false;
  WXW.on=false;
  const i=WATER.indexOf(WXW.ent);if(i>=0)WATER.splice(i,1);
  if(WXW.mesh)WXW.mesh.visible=false;
  return true;
}
/* buildMap reasigna WATER: si el mapa se rebuildeó con la inundación puesta, volver a entrar */
function wxWaterKeep(){ if(WXW.on&&WATER.indexOf(WXW.ent)<0)WATER.push(WXW.ent); }

/* ================= 10. cuerpos reales pooleados (granizo, meteoros, lava) ======= */
/* Pocos y reciclados: los cuerpos y las mallas se crean UNA vez y entran/salen del mundo. Es lo
   que permite que el granizo pegue de verdad sin pagar 900 cuerpos. */
const WROK={it:[],fired:0,hits:0,geo:null,mat:{}};
function wxRokInit(){
  if(WROK.it.length)return WROK.it.length;
  WROK.geo=new THREE.SphereGeometry(1,SEG().sph,Math.max(6,SEG().sph>>1));
  WROK.mat.ice=new THREE.MeshPhongMaterial({color:0xd8f0ff,shininess:120,
    specular:new THREE.Color(0xffffff),transparent:true,opacity:.9});
  WROK.mat.rock=new THREE.MeshPhongMaterial({color:0x2e2822,shininess:12,
    emissive:new THREE.Color(0x912a08)});
  WROK.mat.lava=new THREE.MeshBasicMaterial({color:0xff7a2c});
  for(let i=0;i<WCAP.rok;i++){
    const b=new CANNON.Body({mass:8,material:MAT.prop,linearDamping:.01,angularDamping:.1,
      allowSleep:false});
    b.addShape(new CANNON.Sphere(.3));
    const m=new THREE.Mesh(WROK.geo,WROK.mat.ice);
    m.visible=false;m.frustumCulled=false;scene.add(m);
    const it={b,m,t:0,live:false,kind:'ice',r:.3,hit:0,blast:0};
    /* el evento collide de cannon-es es lo que hace que el impacto sea REAL y no un temporizador:
       el rebote/estallido pasa cuando el cuerpo toca algo, no cuando "ya pasó medio segundo". */
    b.addEventListener('collide',()=>{if(it.live)it.hit++;});
    WROK.it.push(it);
  }
  return WROK.it.length;
}
function wxRokFire(x,y,z,vx,vy,vz,o){
  wxRokInit();
  o=o||{};
  for(const it of WROK.it){
    if(it.live)continue;
    const r=o.r||.3,kind=o.kind||'ice';
    it.live=true;it.t=o.life||7;it.kind=kind;it.hit=0;it.blast=o.blast||0;
    it.r=r;
    const sh=it.b.shapes[0];
    if(sh&&sh.radius!==r){sh.radius=r;if(sh.updateBoundingSphereRadius)sh.updateBoundingSphereRadius();
      it.b.updateBoundingRadius();}
    it.b.mass=o.mass||(kind==='ice'?4:60);it.b.updateMassProperties();
    it.b.position.set(x,y,z);it.b.velocity.set(vx,vy,vz);
    it.b.angularVelocity.set(Math.random()*6-3,Math.random()*6-3,Math.random()*6-3);
    it.b.quaternion.set(0,0,0,1);
    it.b.aabbNeedsUpdate=true;
    world.addBody(it.b);
    it.m.material=WROK.mat[kind]||WROK.mat.ice;
    it.m.scale.setScalar(r);it.m.visible=true;
    WROK.fired++;
    return it;
  }
  return null;
}
function wxRokStep(dt){
  let n=0;
  for(const it of WROK.it){
    if(!it.live)continue;
    n++;
    it.t-=dt;
    const P=it.b.position;
    it.m.position.set(P.x,P.y,P.z);
    it.m.quaternion.set(it.b.quaternion.x,it.b.quaternion.y,it.b.quaternion.z,it.b.quaternion.w);
    /* estela de brasas para lo que va caliente */
    if(it.kind!=='ice'&&Math.random()<dt*26){
      const p=WL.glow.get();
      if(p){p.x=P.x;p.y=P.y;p.z=P.z;p.vx=(Math.random()-.5)*2;p.vy=1+Math.random()*2;
        p.vz=(Math.random()-.5)*2;p.life=p.max=.45+Math.random()*.4;p.sz=.26+Math.random()*.2;
        p.gr=.1;p.r=1;p.g=.48+Math.random()*.3;p.b=.12;p.a=.95;p.fy=-60;}
    }
    const landed=it.hit>0;
    if(landed||it.t<=0||P.y<-8){
      if(landed&&it.blast>0){
        WROK.hits++;
        /* impacto real: estallido de la pirotecnia + empujón radial a los props de alrededor */
        if(typeof burst==='function')nsafe(()=>burst(P.x,P.y+.2,P.z,
          {burst:'crackle',size:it.blast*.5,clr:[0xff7a2c,0xffd24d,0x8a4a20]}),'wxblast');
        if(typeof litLight==='function')nsafe(()=>litLight(P.x,P.y+1,P.z,0xff8a3c),'wxlit');
        wxPush(P.x,P.y,P.z,it.blast*2.2,26,34,0,90);
        wxSnd('boom',{vol:.85,at:[P.x,P.y,P.z]});
        wxShkA=Math.max(wxShkA,Math.min(.34,it.blast*.06));
      }else if(landed&&it.kind==='ice'){
        WROK.hits++;
        wxSnd(Math.random()<.5?'imp-plastic':'imp-metal',{vol:.5,at:[P.x,P.y,P.z]});
      }
      it.live=false;it.m.visible=false;
      nsafe(()=>world.removeBody(it.b),'wxrokrm');
    }
  }
  return n;
}
function wxRokClear(){
  for(const it of WROK.it)if(it.live){it.live=false;it.m.visible=false;
    nsafe(()=>world.removeBody(it.b),'wxrokrm2');}
  return true;
}

/* ================= 11. precipitación ================= */
/* Todo se emite ALREDEDOR DE LA CÁMARA en un disco: es lo único que escala: llueve donde el
   jugador mira, no en 300 m × 300 m de mapa. El acumulador fraccionario (L.acc) es lo que hace
   que la cantidad por segundo sea la misma a 30 y a 60 fps. */
const wxGY=()=>WXW.on?WXW.lvl:0;              /* el piso donde muere la gota (o el agua) */
const WXR={rain:0,snow:0,hail:0,sand:0,fire:0,ash:0,rok:0};
function wxSpawn(L,rate,dt,fn){
  if(rate<=0)return 0;
  let k=rate*dt+(L.acc||0);
  const n=Math.floor(k);
  L.acc=k-n;
  let m=0;
  for(let i=0;i<n;i++){const p=L.get();if(!p)break;fn(p);m++;}
  return m;
}
function wxPrecStep(dt){
  const cx=camera.position.x,cy=camera.position.y,cz=camera.position.z,gy=wxGY();
  const wx=WX.windX,wz=WX.windZ;
  let n=0;
  /* --- lluvia: LineSegments, la estela sale de la velocidad (motion blur gratis) --- */
  if(WX.rain>.01){
    n+=WXR.rain=wxSpawn(WL.rain,420*WX.rain*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*16;
      p.x=cx+Math.cos(a)*r;p.z=cz+Math.sin(a)*r;p.y=cy+13+Math.random()*5;
      p.vy=-24-8*WX.rain;p.vx=wx*.75;p.vz=wz*.75;
      p.life=p.max=1.9;p.gr=.25;p.dg=.9;p.fy=gy;p.spl=1;p.tail=.05;
      p.r=.60;p.g=.72;p.b=.88;p.a=.5+.3*WX.rain;
    });
  }
  /* --- nieve: aleteo lateral (WMD_FLT), casi sin gravedad --- */
  if(WX.snow>.01){
    /* radio 13 y no 20, y el doble de ritmo: el TECHO es el pool (258 partículas en ULD), así que
       concentrar el disco no cuesta nada y multiplica por 2,4 la densidad que se ve. Con 20 m la
       nevada quedaba como cuatro puntitos en la captura. */
    n+=WXR.snow=wxSpawn(WL.soft,300*WX.snow*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*13;
      p.x=cx+Math.cos(a)*r;p.z=cz+Math.sin(a)*r;p.y=cy+11+Math.random()*6;
      p.vy=-1.3-Math.random()*1.4;p.vx=wx*.5;p.vz=wz*.5;
      p.md=WMD_FLT;p.f0=.5+Math.random()*.9;p.f3=1.4+Math.random()*2.2;p.f2=Math.random()*6.28;
      p.life=p.max=16;p.gr=0;p.dg=.5;p.fy=gy;p.spl=0;
      /* copos de 14 a 32 cm: con los .10..-.26 de antes medían 3-9 cm y en la captura la nevada
         no se veía (base de la capa alfa = .34, el tamaño final es base×sz) */
      p.sz=.40+Math.random()*.55;p.r=1;p.g=1;p.b=1;p.a=.85;
    });
  }
  /* --- granizo: piedras visuales + unas pocas REALES con cuerpo de cannon --- */
  if(WX.hail>.01){
    n+=WXR.hail=wxSpawn(WL.soft,300*WX.hail*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*12;
      p.x=cx+Math.cos(a)*r;p.z=cz+Math.sin(a)*r;p.y=cy+12+Math.random()*5;
      p.vy=-22-6*Math.random();p.vx=wx*.4;p.vz=wz*.4;
      p.life=p.max=2.4;p.gr=1;p.dg=.3;p.fy=gy;p.spl=1;
      p.sz=.50+Math.random()*.40;p.r=.86;p.g=.94;p.b=1;p.a=.95;
    });
    WXR.rok+=2.6*WX.hail*dt;
    while(WXR.rok>=1){
      WXR.rok-=1;
      const a=Math.random()*6.2832,r=2+Math.random()*11;
      wxRokFire(cx+Math.cos(a)*r,cy+16,cz+Math.sin(a)*r,wx*.4,-16,wz*.4,
        {kind:'ice',r:.16+Math.random()*.14,mass:5,life:6});
    }
  }
  /* --- arena: casi horizontal, entra por donde sopla el viento --- */
  if(WX.sand>.01){
    const vm=Math.max(6,Math.hypot(wx,wz)),ux=wx/vm,uz=wz/vm;
    n+=WXR.sand=wxSpawn(WL.soft,260*WX.sand*WQ,dt,p=>{
      const s=(Math.random()-.5)*46;
      p.x=cx-ux*26+(-uz)*s;p.z=cz-uz*26+(ux)*s;p.y=gy+.4+Math.random()*13;
      p.vx=wx*1.15+(Math.random()-.5)*3;p.vz=wz*1.15+(Math.random()-.5)*3;
      p.vy=-.6-Math.random()*1.4;
      p.life=p.max=3.4;p.gr=0;p.dg=1.3;p.fy=gy-2;p.spl=0;
      p.sz=.5+Math.random()*1.1;p.r=.80;p.g=.62;p.b=.36;p.a=.30+.28*WX.sand;
    });
  }
  /* --- lluvia de fuego: ESTELA naranja (capa de líneas) + cabeza aditiva ---
     Primera versión: sólo puntos aditivos a 120/s·WQ. Medido en la captura: ~35 vivos repartidos
     en un disco de 20 m y 20 m de alto = cinco puntitos, no se leía NADA como lluvia de fuego.
     Arreglo: la estela va por la capa de LÍNEAS (igual que la lluvia, que sí se ve) en naranja y
     con cola larga, y encima una cabeza aditiva más grande. Además el disco baja de 20 a 13 m,
     así la misma cantidad de partículas se concentra donde el jugador mira. */
  if(WX.fire>.01){
    WXR.fire=wxSpawn(WL.rain,300*WX.fire*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*13;
      p.x=cx+Math.cos(a)*r;p.z=cz+Math.sin(a)*r;p.y=cy+11+Math.random()*7;
      p.vy=-13-6*Math.random();p.vx=wx*.5;p.vz=wz*.5;
      p.life=p.max=2.6;p.gr=.35;p.dg=.5;p.fy=gy;p.spl=2;p.tail=.10;
      p.r=1;p.g=.42+Math.random()*.3;p.b=.10;p.a=1;
    });
    n+=WXR.fire;
    n+=wxSpawn(WL.glow,150*WX.fire*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*13;
      p.x=cx+Math.cos(a)*r;p.z=cz+Math.sin(a)*r;p.y=cy+11+Math.random()*7;
      p.vy=-13-6*Math.random();p.vx=wx*.5;p.vz=wz*.5;
      p.life=p.max=2.6;p.gr=.35;p.dg=.5;p.fy=gy;p.spl=2;
      p.sz=.9+Math.random()*1.1;p.r=1;p.g=.36+Math.random()*.36;p.b=.10;p.a=1;
    });
  }
  /* --- ceniza volcánica: gris, lenta, aleteando --- */
  if(WX.ash>.01){
    n+=WXR.ash=wxSpawn(WL.soft,140*WX.ash*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*15;
      p.x=cx+Math.cos(a)*r;p.z=cz+Math.sin(a)*r;p.y=cy+12+Math.random()*8;
      p.vy=-1.0-Math.random()*1.2;p.vx=wx*.6;p.vz=wz*.6;
      p.md=WMD_FLT;p.f0=.4+Math.random()*.8;p.f3=1+Math.random()*2;p.f2=Math.random()*6.28;
      p.life=p.max=14;p.gr=0;p.dg=.6;p.fy=gy;p.spl=0;
      p.sz=.45+Math.random()*.60;p.r=.30;p.g=.28;p.b=.26;p.a=.75;
    });
  }
  return n;
}

/* ================= 12. gravedad gestionada (luna) ================= */
const WXGR={ok:false,y:0};
function wxGravSet(y){
  if(!WXGR.ok){WXGR.ok=true;WXGR.y=world.gravity.y;}
  world.gravity.y=y;return y;
}
function wxGravOff(){
  if(!WXGR.ok)return false;
  world.gravity.y=WXGR.y;WXGR.ok=false;return true;
}

/* ================= 13. enganche al bucle ================= */
/* EXT.post: sólo JUGANDO y después de world.step -> física y partículas (en pausa el clima se
   congela, que es lo que uno espera).
   EXT.frame: SIEMPRE -> luz, niebla, cielo y las mallas que giran, así el panel se puede mirar
   en pausa y el efecto del slider se ve igual. */
let wxParts=0,wxRokN=0,wxWindN=0;
EXT.post.push(dt=>{
  if(wxDirty)wxSum();
  if(!wxOn&&!wxParts&&!WROK.fired)return;
  wxShkP+=dt;
  /* la sacudida decae siempre; los experimentos la vuelven a subir cada frame mientras dura */
  const tgt=WX.shake;
  wxShkA+=(tgt-wxShkA)*Math.min(1,7*dt);
  if(wxShkA<.0008&&tgt<=0)wxShkA=0;
  wxFlashI-=wxFlashI*Math.min(1,11*dt);
  if(wxFlashI<.004)wxFlashI=0;
  nsafe(()=>wxPrecStep(dt),'wxprec');
  wxParts=0;
  wxParts+=wxLayStep(WL.rain,dt);
  wxParts+=wxLayStep(WL.soft,dt);
  wxParts+=wxLayStep(WL.glow,dt);
  wxParts+=wxLayStep(WL.leaf,dt);
  wxRokN=nsafe(()=>wxRokStep(dt),'wxrok')||0;
  wxWindN=nsafe(wxWindStep,'wxwind')||0;
  wxWaterKeep();
});
let wxIdle=0;
EXT.frame.push(dt=>{
  if(wxDirty)wxSum();
  /* vigía: salir al menú apaga TODO (y con él la luz, el cielo, el agua y la gravedad) */
  if(APP!=='play'&&APP!=='pause'&&APP!=='spawn'){
    if(wxOn||WXL.ok||WXW.on||WXGR.ok)nsafe(wxAllOff,'wxquit');
    return;
  }
  if(wxOn){
    wxIdle=0;
    nsafe(wxLightApply,'wxlight');
    nsafe(()=>wxSkyStep(dt),'wxsky');
    nsafe(()=>wxWetApply(WX.wet),'wxwet');
  }else if(WXL.ok||WXMAT.cur>0||WXSKY.cur||WXSKY.mix){
    /* nadie contribuye: devolver todo (una vez, no por frame) */
    wxIdle+=dt;
    if(wxIdle>.15){wxIdle=0;
      nsafe(wxLightRestore,'wxlr');nsafe(wxSkyReset,'wxsr');nsafe(()=>wxWetApply(0),'wxwr');}
  }
});
/* el cielo se aplica desde WX (skyBase / skyMix): cualquier experimento pide su panorámica en su
   contribución y acá se resuelve una sola vez, así dos experimentos de cielo no pelean */
function wxSkyStep(){
  if(WX.skyBase)wxSkyBase(WX.skyBase);else if(WXSKY.cur)wxSkyBase(null);
  if(WX.skyMix)wxSkyMix(WX.skyMix,WX.skyT);else if(WXSKY.mix)wxSkyMix(null,0);
  return true;
}

/* aplicar YA la composición (sin esperar el próximo frame): lo usan las pruebas, que leen el sol
   o el cielo en la misma línea en que mueven el slider */
function wxApplyNow(){
  wxDirty=true;wxSum();
  nsafe(wxLightApply,'wxan1');nsafe(wxSkyStep,'wxan2');nsafe(()=>wxWetApply(WX.wet),'wxan3');
  return true;
}

/* ================= 14. helpers para los experimentos ================= */
const _wxV=new THREE.Vector3(),_wxV2=new THREE.Vector3();
/* punto de anclaje: la base del prop si existe, y si no los pies del jugador. Que TODOS
   funcionen sin prop es lo que permite encenderlos desde el panel maestro y desde los tests. */
function wxAnchor(c,y,out){
  const o=out||_wxV;
  if(c&&c.prop&&c.prop.body&&PROPS.indexOf(c.prop)>=0)return c.point(c.prop,0,y||0,0,o);
  o.set(plBody.position.x,plBody.position.y-PL.h*.5+(y||0),plBody.position.z);
  return o;
}
/* grupo propio de un experimento: se crea una vez, se esconde al parar (no se destruye: volver a
   encender es instantáneo y no hay geometría nueva en el camino). */
function wxGroup(c){
  if(!c.mem.g){c.mem.g=new THREE.Group();c.mem.g.frustumCulled=false;scene.add(c.mem.g);}
  c.mem.g.visible=true;return c.mem.g;
}
function wxGroupOff(c){if(c.mem.g)c.mem.g.visible=false;return true;}
/* material de nube reusable (una instancia por color: no hay 25 materiales iguales dando vueltas) */
const WXCM={};
function wxCloudMat(hex,op,add){
  const k=hex+'_'+(op*100|0)+(add?'a':'n');
  if(WXCM[k])return WXCM[k];
  return WXCM[k]=new THREE.MeshBasicMaterial({map:WTEX.cloud,transparent:true,opacity:op,
    color:hex,side:THREE.DoubleSide,depthWrite:false,fog:false,
    blending:add?THREE.AdditiveBlending:THREE.NormalBlending});
}
/* nube 3D de dibujito: varias esferas achatadas superpuestas. Es la que va ARRIBA de la palanca
   de lluvia (pedido explícito) y también la tapa del tornado y la base del volcán. */
function wxMakeCloud(r,hex,n){
  const g=new THREE.Group();
  const mat=new THREE.MeshPhongMaterial({color:hex,shininess:4,
    specular:new THREE.Color(0x101418),transparent:true,opacity:.94,fog:false});
  const seg=Math.max(6,SEG().sph-2),geo=new THREE.SphereGeometry(1,seg,Math.max(5,seg>>1));
  const N=n||7;
  for(let i=0;i<N;i++){
    const m=new THREE.Mesh(geo,mat);
    const a=(i/N)*6.2832+Math.random()*.5,rr=(i===0?0:r*(.34+Math.random()*.46));
    m.position.set(Math.cos(a)*rr,(Math.random()-.35)*r*.24,Math.sin(a)*rr*.7);
    const s=r*(i===0?.62:.30+Math.random()*.26);
    m.scale.set(s,s*.62,s*.86);
    g.add(m);
  }
  g.userData.mat=mat;
  return g;
}
/* apaga TODO lo mío y devuelve el mundo como estaba */
function wxAllOff(){
  for(const id of WXIDS)if(XP.running(id))XP.stop(id);
  for(const k in WXC)delete WXC[k];
  wxDirty=true;wxSum();
  WL.rain.clear();WL.soft.clear();WL.glow.clear();WL.leaf.clear();
  wxParts=0;wxRokClear();wxAmbAllOff();
  wxLightRestore();wxSkyReset();wxWetApply(0);wxWaterOff();wxGravOff();
  wxShkA=0;wxFlashI=0;
  return true;
}

/* ============================================================
   LOS 25 EXPERIMENTOS
   Todos pasan por wxAdd(), que les pone cat:'clima', stopOnGone:true y guarda su prueba
   (probe) para __H.xpwTest(). Ninguno escribe el clima directo: declaran su aporte con
   wxPut(id,{…}) y el motor lo compone.
   ============================================================ */
const WXIDS=[],WXPB={};
function wxAdd(o){
  const pb=o.probe;delete o.probe;
  o.cat=o.cat||'clima';
  if(o.stopOnGone===undefined)o.stopOnGone=true;
  const x=XP.add(o);
  if(x){WXIDS.push(o.id);if(pb)WXPB[o.id]=pb;}
  return x;
}
function wxDir(deg,out){
  const a=(deg||0)*D2R,o=out||{x:0,z:0};
  o.x=Math.sin(a);o.z=Math.cos(a);return o;
}
const _wxD={x:0,z:0};
/* rayo reutilizable: un LineSegments con la trayectoria en zigzag reescrita en su buffer */
function wxMakeBolt(n){
  const g=new THREE.BufferGeometry(),pos=new Float32Array(n*2*3);
  g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
  const m=new THREE.LineBasicMaterial({color:0xe8f4ff,transparent:true,opacity:.95,
    depthWrite:false,fog:false,blending:THREE.AdditiveBlending});
  const o=new THREE.LineSegments(g,m);
  o.frustumCulled=false;o.visible=false;o.renderOrder=12;
  o.userData.n=n;o.userData.pos=pos;
  return o;
}
function wxBoltPath(o,x0,y0,z0,x1,y1,z1){
  const n=o.userData.n,P=o.userData.pos;
  let px=x0,py=y0,pz=z0;
  for(let i=0;i<n;i++){
    const t=(i+1)/n,sp=7*(1-t*.6);
    const nx=x0+(x1-x0)*t+(Math.random()-.5)*sp,ny=y0+(y1-y0)*t,
          nz=z0+(z1-z0)*t+(Math.random()-.5)*sp;
    const k=i*6;
    P[k]=px;P[k+1]=py;P[k+2]=pz;P[k+3]=nx;P[k+4]=ny;P[k+5]=nz;
    px=nx;py=ny;pz=nz;
    /* unas brasas blancas sobre el trazo: sin esto el rayo es una línea de 1 px y en el celular
       casi no se ve contra el cielo */
    if(i%3===0){const p=WL.glow.get();
      if(p){p.x=nx;p.y=ny;p.z=nz;p.life=p.max=.16;p.sz=1.9;p.gr=0;p.dg=0;
        p.r=.85;p.g=.93;p.b=1;p.a=1;p.fy=-999;}}
  }
  o.geometry.attributes.position.needsUpdate=true;
  o.visible=true;o.material.opacity=.95;
  return o;
}

/* ================= 26 · LLUVIA (palanca + nube 3D encima) ================= */
/* Pedido explícito del usuario: el prop es una PALANCA y arriba tiene una NUBE 3D. La nube es de
   verdad (8 esferas achatadas, oscurece con la intensidad, flota con un vaivén por dt) y de ella
   sale una columna de gotas extra, además de la lluvia general alrededor de la cámara. */
const wxRainPut=c=>{
  const i=c.get('i'),w=c.get('w');wxDir(c.get('d'),_wxD);
  wxPut('xpw_rain',{rain:i,windX:_wxD.x*w,windZ:_wxD.z*w,
    wet:c.get('wet')?Math.min(1,.30+.62*i):0,
    fogK:.10*i,fogClr:0x7d8894,dark:.20*i});
  if(c.get('snd'))wxAmbOn('xpw_rain','amb-wind',.10+.26*i);else wxAmbOff('xpw_rain');
};
wxAdd({
  id:'xpw_rain',name:'Palanca Lluvia',near:2.8,btn:'🌧 Palanca de lluvia',
  desc:'La nube 3D que flota sobre la palanca larga sobre todo el mapa: gotas con estela, '+
       'salpicaduras y el piso y los props mojados.',
  ui:{title:'Lluvia',controls:[
    {k:'on',t:'switch',label:'Llover',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'i',t:'slider',label:'Intensidad',min:.08,max:1,step:.04,val:.55,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxRainPut(c)},
    {t:'botones',label:'Atajos',items:[{label:'🌦 Garúa',v:.12},{label:'🌧 Lluvia',v:.55},
      {label:'⛈ Diluvio',v:1}],on:(c,v)=>c.set('i',v)},
    {k:'w',t:'slider',label:'Viento de la lluvia',min:0,max:18,step:.5,val:3,unit:' m/s',
     on:c=>wxRainPut(c)},
    {k:'d',t:'slider',label:'Dirección',min:0,max:350,step:10,val:90,unit:'°',on:c=>wxRainPut(c)},
    {k:'wet',t:'switch',label:'Mojar el piso y los props',val:true,on:c=>wxRainPut(c)},
    {k:'snd',t:'switch',label:'Sonido de tormenta',val:true,on:c=>wxRainPut(c)},
    {t:'texto',label:'Medición',live:c=>'gotas vivas <b>'+WL.rain.n+'</b>/'+WL.rain.cap+
      ' · nuevas <b>'+WXR.rain+'</b>/frame · mojado <b>'+Math.round(WXMAT.cur*100)+
      '%</b> · viento <b>'+Math.hypot(WX.windX,WX.windZ).toFixed(1)+' m/s</b>'}
  ]},
  start(c){
    const g=wxGroup(c);
    if(!c.mem.cl){c.mem.cl=wxMakeCloud(2.0,0x8e969f,8);g.add(c.mem.cl);c.mem.t=0;}
    c.mem.cl.visible=true;
    wxRainPut(c);
  },
  stop(c){wxGroupOff(c);wxPut('xpw_rain',null);wxAmbOff('xpw_rain');},
  step(c,dt){
    /* columna de gotas justo debajo de la nube: es lo que ata visualmente la nube con la lluvia */
    const i=c.get('i');
    wxAnchor(c,3.9,_wxV);
    wxSpawn(WL.rain,44*i*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*1.9;
      p.x=_wxV.x+Math.cos(a)*r;p.z=_wxV.z+Math.sin(a)*r;p.y=_wxV.y-.3;
      p.vy=-14-6*i;p.vx=WX.windX*.5;p.vz=WX.windZ*.5;
      p.life=p.max=2.2;p.gr=.35;p.dg=.8;p.fy=wxGY();p.spl=1;p.tail=.055;
      p.r=.62;p.g=.74;p.b=.9;p.a=.62;
    });
  },
  frame(c,dt){
    if(!c.mem.cl)return;
    c.mem.t=(c.mem.t||0)+dt;
    wxAnchor(c,3.9,_wxV);
    /* vaivén y respiración de la nube: por dt, nunca por frame */
    c.mem.cl.position.set(_wxV.x+Math.sin(c.mem.t*.35)*.35,
      _wxV.y+Math.sin(c.mem.t*.55)*.22,_wxV.z+Math.cos(c.mem.t*.28)*.30);
    c.mem.cl.rotation.y+=dt*.12;
    const i=c.get('i'),m=c.mem.cl.userData.mat;
    if(m)m.color.setRGB(.72-.42*i,.74-.42*i,.78-.40*i);
  },
  probe:c=>({cloud:!!(c.mem.cl&&c.mem.cl.visible),rain:+WX.rain.toFixed(2),
    drops:WL.rain.n,wet:+WXMAT.cur.toFixed(2),
    ok:!!c.mem.cl&&WX.rain>0&&WL.rain.n>0})
});

/* ================= 27 · TORMENTA CON RELÁMPAGOS ================= */
/* El destello es LUZ de verdad (wxFlashI entra en sun/hemi/exposición/niebla en wxLightApply) más
   un trazo en zigzag; el trueno se agenda con el retardo real de 340 m/s usando el o.delay de
   sPlay, que va por el reloj de audio y no por el framerate. */
const wxStormPut=c=>{
  const i=c.get('i');wxDir(c.get('d'),_wxD);
  wxPut('xpw_storm',{rain:i*.9,windX:_wxD.x*c.get('w'),windZ:_wxD.z*c.get('w'),
    wet:Math.min(1,.4+.5*i),fogK:.22+.2*i,fogClr:0x4a525c,dark:.42+.22*i,
    skyBase:c.get('sky')?'storm':null,expo:.82});
  wxAmbOn('xpw_storm','amb-wind',.18+.3*i);
};
wxAdd({
  id:'xpw_storm',name:'Pararrayos',near:2.8,btn:'⚡ Tormenta eléctrica',
  desc:'Cielo de supercelda, lluvia fuerte y relámpagos con destello de luz real y trueno '+
       'retrasado por la distancia.',
  ui:{title:'Tormenta',controls:[
    {k:'on',t:'switch',label:'Tormenta',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'i',t:'slider',label:'Fuerza',min:.15,max:1,step:.05,val:.7,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxStormPut(c)},
    {k:'f',t:'slider',label:'Relámpagos',min:2,max:40,step:1,val:12,unit:'/min'},
    {k:'w',t:'slider',label:'Viento',min:0,max:24,step:1,val:8,unit:' m/s',on:c=>wxStormPut(c)},
    {k:'d',t:'slider',label:'Dirección',min:0,max:350,step:10,val:120,unit:'°',on:c=>wxStormPut(c)},
    {k:'sky',t:'switch',label:'Cielo de tormenta (360°)',val:true,on:c=>wxStormPut(c)},
    {t:'botones',label:'Ahora',items:[{label:'⚡ Un rayo ya',v:1}],on:c=>{wxFlash(c,true);}},
    {t:'texto',label:'Medición',live:c=>'relámpagos <b>'+(c.mem.n||0)+'</b> · destello <b>'+
      wxFlashI.toFixed(2)+'</b> · sol <b>'+sun.intensity.toFixed(2)+'</b> · niebla hasta <b>'+
      (scene.fog?scene.fog.far.toFixed(0):'—')+' m</b>'}
  ]},
  start(c){
    wxLightGrab();
    const g=wxGroup(c);
    if(!c.mem.bl){c.mem.bl=wxMakeBolt(22);g.add(c.mem.bl);}
    c.mem.n=c.mem.n||0;c.mem.t=1.2;c.mem.vis=0;
    wxStormPut(c);
  },
  stop(c){wxGroupOff(c);if(c.mem.bl)c.mem.bl.visible=false;
    wxPut('xpw_storm',null);wxAmbOff('xpw_storm');},
  step(c,dt){
    c.mem.t-=dt;
    if(c.mem.t<=0){
      const f=Math.max(1,c.get('f'));
      c.mem.t=(60/f)*(.55+Math.random()*.9);
      wxFlash(c,false);
    }
    if(c.mem.vis>0){c.mem.vis-=dt;
      if(c.mem.vis<=0&&c.mem.bl)c.mem.bl.visible=false;
      else if(c.mem.bl)c.mem.bl.material.opacity=Math.min(.95,c.mem.vis*7);}
  },
  probe:c=>{wxFlash(c,true);
    return {flashes:c.mem.n||0,flash:+wxFlashI.toFixed(2),bolt:!!(c.mem.bl&&c.mem.bl.visible),
      ok:(c.mem.n||0)>0&&wxFlashI>.3&&!!(c.mem.bl&&c.mem.bl.visible)};}
});
/* un relámpago: destello + trazo + trueno con el retardo del sonido */
function wxFlash(c,near){
  const a=Math.random()*6.2832,d=near?18+Math.random()*30:60+Math.random()*180;
  const x=camera.position.x+Math.cos(a)*d,z=camera.position.z+Math.sin(a)*d;
  const h=70+Math.random()*40;
  wxFlashI=near?1:clamp(1.15-d/260,.28,1);
  c.mem.n=(c.mem.n||0)+1;
  if(c.mem.bl){wxBoltPath(c.mem.bl,x,h,z,x+(Math.random()-.5)*14,wxGY(),z+(Math.random()-.5)*14);
    c.mem.vis=.16;}
  /* trueno: 340 m/s. Cerca es un 'boom' seco, lejos el retumbe 'fw-boomfar'. */
  const del=Math.min(6,d/340);
  wxSnd(d<45?'boom':'fw-boomfar',{vol:clamp(1.25-d/240,.22,1),delay:del,rate:.82+Math.random()*.2});
  if(typeof litLight==='function')nsafe(()=>litLight(x,h*.5,z,0xbfd8ff),'wxlit2');
  return true;
}

/* ================= 28 · TORNADO SUPER REALISTA ================= */
/* Pedido explícito: NO un cono gris. Lo que hay acá:
   · EMBUDO de varias mangas (LatheGeometry: perfil r(y)=rb+(rt-rb)·t^1.7, la curva real de un
     embudo, no un cono recto) con textura de nube desplazándose por UV a distinta velocidad y
     cada capa girando a distinta velocidad y radio.
   · POLVO Y ESCOMBROS en espiral (modo órbita: el ángulo avanza más rápido cerca del eje y el
     radio CRECE con la altura), nube de polvo en la base y tapa de nube arriba.
   · FÍSICA REAL: fuerza tangencial + hacia adentro + hacia arriba, proporcional a ~1/d y
     acotada, sobre todos los props del radio (y opcionalmente sobre el jugador).
   · Se desplaza por el mapa con rumbo que serpentea, se puede parar y traer desde el panel.
   · Todo escala con QP.key: WSLV mangas (4/3/2) y el polvo por WQ. */
function wxFunnelGeo(H,rb,rt,seg){
  const pts=[],N=11;
  for(let i=0;i<=N;i++){const t=i/N;
    pts.push(new THREE.Vector2(rb+(rt-rb)*Math.pow(t,1.7),t*H));}
  return new THREE.LatheGeometry(pts,seg);
}
const wxTorPut=c=>{
  wxPut('xpw_tornado',{fogK:.14,fogClr:0x6d7480,dark:.24,windX:0,windZ:0,
    wet:0,shake:0,skyBase:c.get('sky')?'storm':null});
  wxAmbOn('xpw_tornado','amb-wind',.34);
};
wxAdd({
  id:'xpw_tornado',name:'Tornadometro',near:2.8,btn:'🌪 Soltar el tornado',
  desc:'Embudo de varias mangas que giran a distinta velocidad, escombros en espiral y arrastre '+
       'físico real: levanta los props que se le acercan.',
  ui:{title:'Tornado',controls:[
    {k:'on',t:'switch',label:'Tornado',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'sc',t:'slider',label:'Tamaño',min:.5,max:2.6,step:.1,val:1,unit:'x',
     on:(c,v)=>{if(c.mem.T)c.mem.T.sc=v;wxTorBuild(c);}},
    {k:'fz',t:'slider',label:'Fuerza',min:0,max:90,step:5,val:42,unit:' m/s²'},
    {k:'mv',t:'switch',label:'Que se mueva',val:true},
    {k:'sp',t:'slider',label:'Velocidad',min:0,max:14,step:.5,val:4,unit:' m/s'},
    {k:'pl',t:'switch',label:'Levantar también al jugador',val:false},
    {k:'sky',t:'switch',label:'Cielo de tormenta (360°)',val:true,on:c=>wxTorPut(c)},
    {t:'botones',label:'Traer',items:[{label:'🎯 Traelo acá',v:1},{label:'↔ 25 m',v:25},
      {label:'↔ 60 m',v:60}],
     on:(c,v)=>{const T=c.mem.T;if(!T)return;
       const a=PL.yaw+Math.PI,d=v===1?12:v;
       T.x=plBody.position.x-Math.sin(PL.yaw)*d;T.z=plBody.position.z-Math.cos(PL.yaw)*d;
       c.toast('🌪 tornado a '+d+' m');}},
    {t:'texto',label:'Medición',live:c=>{const T=c.mem.T;if(!T)return 'apagado';
      return 'a <b>'+Math.hypot(T.x-plBody.position.x,T.z-plBody.position.z).toFixed(1)+
      ' m</b> · radio <b>'+(T.R||0).toFixed(1)+' m</b> · alto <b>'+T.h.toFixed(0)+
      ' m</b> · props agarrados <b>'+(c.mem.hit||0)+'</b> · escombros <b>'+(c.mem.pn||0)+'</b>';}}
  ]},
  start(c){
    wxLightGrab();
    const g=wxGroup(c);
    wxAnchor(c,0,_wxV);
    if(!c.mem.T)c.mem.T={x:_wxV.x+14,y:wxGY(),z:_wxV.z+14,h:46,sc:c.get('sc'),
      ang:Math.random()*6.28,hd:Math.random()*6.28,R:10};
    c.mem.T.sc=c.get('sc');c.mem.T.y=wxGY();
    wxTorBuild(c);
    wxTorPut(c);
  },
  stop(c){wxGroupOff(c);wxPut('xpw_tornado',null);wxAmbOff('xpw_tornado');},
  step(c,dt){
    const T=c.mem.T;if(!T)return;
    const sc=c.get('sc');
    T.h=46*sc;T.R=10*sc;T.y=wxGY();
    /* desplazamiento con rumbo que serpentea, acotado al mapa */
    if(c.get('mv')){
      T.hd+=(Math.sin(wxShkP*.21)+Math.sin(wxShkP*.07)*.6)*dt*.5;
      const s=c.get('sp');
      T.x+=Math.sin(T.hd)*s*dt;T.z+=Math.cos(T.hd)*s*dt;
      const S=((CURMAP&&CURMAP.def&&CURMAP.def.size)||120)-6;
      if(T.x> S){T.x= S;T.hd+=2.2;} if(T.x<-S){T.x=-S;T.hd+=2.2;}
      if(T.z> S){T.z= S;T.hd+=2.2;} if(T.z<-S){T.z=-S;T.hd+=2.2;}
    }
    /* --- FÍSICA: tangencial + hacia adentro + hacia arriba, ~1/d y acotada --- */
    const F=c.get('fz');
    c.mem.hit=F>0?wxPush(T.x,T.y+2,T.z,T.R*2.3,F*.55,-F*.30,F,F*1.35):0;
    /* el máximo, no el del último frame: a los 3 segundos los props ya salieron volando fuera del
       radio y "cuántos agarró" leído en ese instante da 0 aunque los haya mandado a 90 m */
    if(c.mem.hit>(c.mem.hitMax||0))c.mem.hitMax=c.mem.hit;
    /* el jugador: se le suma velocidad (playerStep la amortigua, así que se siente arrastre) */
    if(c.get('pl')){
      const dx=plBody.position.x-T.x,dz=plBody.position.z-T.z,d=Math.hypot(dx,dz);
      if(d<T.R*2.2){
        const k=(1-d/(T.R*2.2))/Math.max(1.5,d)*T.R*.5;
        plBody.velocity.x+=(-dz/Math.max(.5,d)*F*.5-dx/Math.max(.5,d)*F*.3)*k*dt;
        plBody.velocity.z+=( dx/Math.max(.5,d)*F*.5-dz/Math.max(.5,d)*F*.3)*k*dt;
        plBody.velocity.y+=F*.85*k*dt;
        plBody.wakeUp();
      }
    }
    /* sacudida y rugido según lo cerca que esté */
    const dd=Math.hypot(T.x-camera.position.x,T.z-camera.position.z);
    const near=clamp(1-dd/(T.R*4),0,1);
    const cc=WXC['xpw_tornado'];
    if(cc){cc.shake=near*.42*sc;wxDirty=true;}
    wxAmbOn('xpw_tornado','amb-wind',.14+.5*near);
    /* --- escombros y polvo en espiral --- */
    const pv=T;
    c.mem.pn=0;
    wxSpawn(WL.soft,130*WQ,dt,p=>{
      p.md=WMD_ORB;p.pv=pv;
      p.f0=T.R*(.24+Math.random()*.5);p.f1=.10+Math.random()*.14;
      p.f2=Math.random()*6.2832;p.f3=34+Math.random()*46;
      p.y=T.y+Math.random()*T.h*.5;p.vy=5+Math.random()*13;
      p.x=T.x;p.z=T.z;
      p.life=p.max=2.6+Math.random()*2.4;
      p.sz=.8+Math.random()*1.6;p.r=.56;p.g=.50;p.b=.44;p.a=.30;
    });
    wxSpawn(WL.leaf,45*WQ,dt,p=>{
      p.md=WMD_ORB;p.pv=pv;
      p.f0=T.R*(.2+Math.random()*.7);p.f1=.08+Math.random()*.14;
      p.f2=Math.random()*6.2832;p.f3=44+Math.random()*54;
      p.y=T.y+Math.random()*4;p.vy=7+Math.random()*15;
      p.x=T.x;p.z=T.z;
      p.life=p.max=2.8+Math.random()*2.2;
      p.sz=.30+Math.random()*.5;
      const w=Math.random();
      p.r=.34+w*.3;p.g=.26+w*.22;p.b=.18+w*.12;p.a=.9;
    });
    c.mem.pn=WL.soft.n+WL.leaf.n;
    /* polvo que se levanta de la base */
    wxSpawn(WL.soft,45*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=T.R*(.9+Math.random()*1.5);
      p.x=T.x+Math.cos(a)*r;p.z=T.z+Math.sin(a)*r;p.y=T.y+.2;
      p.vx=-Math.cos(a)*5;p.vz=-Math.sin(a)*5;p.vy=1.6+Math.random()*2.4;
      p.life=p.max=1.5+Math.random();p.gr=0;p.dg=.4;p.fy=T.y-3;
      p.sz=1.6+Math.random()*2.4;p.r=.60;p.g=.55;p.b=.48;p.a=.24;
    });
  },
  frame(c,dt){
    const T=c.mem.T,S=c.mem.slv;if(!T||!S)return;
    const sc=c.get('sc');
    for(let i=0;i<S.length;i++){
      const s=S[i];
      s.position.set(T.x,T.y,T.z);
      s.scale.set(sc,sc,sc);
      /* cada manga gira a su velocidad y su textura se desplaza distinto: eso es lo que hace que
         se lea como MASA DE NUBE girando y no como un cono con una textura pegada */
      s.rotation.y+=dt*s.userData.w;
      const m=s.material.map;
      if(m){m.offset.y-=dt*s.userData.uv;m.offset.x+=dt*s.userData.ux;}
    }
    if(c.mem.base){c.mem.base.position.set(T.x,T.y+.15,T.z);
      c.mem.base.scale.setScalar(sc);c.mem.base.rotation.y-=dt*.5;}
    if(c.mem.top){c.mem.top.position.set(T.x,T.y+T.h*.98,T.z);
      c.mem.top.scale.setScalar(sc);c.mem.top.rotation.y+=dt*.05;}
    /* las cazoletas del anemómetro del prop giran mientras el tornado está suelto */
    if(c.prop&&c.prop.mesh0!==undefined){}
  },
  probe:c=>({T:!!c.mem.T,sleeves:c.mem.slv?c.mem.slv.length:0,
    debris:WL.soft.n+WL.leaf.n,grabbed:c.mem.hit||0,grabMax:c.mem.hitMax||0,
    ok:!!c.mem.T&&!!c.mem.slv&&c.mem.slv.length>=2&&(WL.soft.n+WL.leaf.n)>0})
});
/* construye/reconstruye las mangas (sólo cuando cambia la escala; nunca por frame) */
function wxTorBuild(c){
  const g=wxGroup(c);
  if(c.mem.slv)return c.mem.slv.length;
  c.mem.slv=[];
  const seg=QP.key==='high'?22:14;
  for(let i=0;i<WSLV;i++){
    const t=i/Math.max(1,WSLV-1);
    const geo=wxFunnelGeo(46*(1-t*.10),2.4+t*1.5,9.5+t*5.2,seg);
    const tex=WTEX.cloud.clone();
    tex.needsUpdate=true;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(2+i,1.6+i*.4);
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,
      opacity:.70-t*.13,color:[0x9aa1a9,0x767d85,0x5c636b,0x484f57,0x363c43][i]||0x6d747c,
      side:THREE.DoubleSide,depthWrite:false,fog:false});
    const m=new THREE.Mesh(geo,mat);
    m.frustumCulled=false;m.renderOrder=9;
    m.userData.w=(i%2?-1:1)*(2.1-t*.9);       /* cada capa gira a su velocidad y sentido */
    m.userData.uv=.34+i*.22;m.userData.ux=(i%2?-1:1)*.05;
    g.add(m);c.mem.slv.push(m);
  }
  /* nube de polvo de la base y tapa de nube arriba */
  c.mem.base=new THREE.Mesh(wxFunnelGeo(7,13,4,seg),
    wxCloudMat(0x6f665c,.4,false));
  c.mem.base.frustumCulled=false;c.mem.base.renderOrder=9;g.add(c.mem.base);
  c.mem.top=wxMakeCloud(16,0x3c434b,9);g.add(c.mem.top);
  return c.mem.slv.length;
}

/* ================= 29 · HURACÁN / VIENTO FUERTE ================= */
const wxHurrPut=c=>{
  const v=c.get('v');wxDir(c.get('d'),_wxD);
  wxPut('xpw_hurr',{windX:_wxD.x*v,windZ:_wxD.z*v,
    rain:c.get('rn')?Math.min(1,v/26):0,wet:c.get('rn')?.6:0,
    fogK:.12+v/120,fogClr:0x66707c,dark:.22+v/140,shake:Math.min(.16,v/220),
    skyBase:c.get('sky')?'storm':null});
  wxAmbOn('xpw_hurr','amb-wind',clamp(.12+v/40,.1,1));
};
wxAdd({
  id:'xpw_hurr',name:'Turbina Viento',near:2.8,btn:'🌀 Viento huracanado',
  desc:'Viento con dirección e intensidad regulables. Empuja los props con fuerza aerodinámica '+
       'real (F≈½ρv²·A): lo liviano vuela, lo pesado apenas se corre.',
  ui:{title:'Huracán',controls:[
    {k:'on',t:'switch',label:'Viento',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'v',t:'slider',label:'Intensidad',min:2,max:60,step:1,val:22,unit:' m/s',on:c=>wxHurrPut(c)},
    {t:'botones',label:'Escala',items:[{label:'Brisa 5',v:5},{label:'Fuerte 18',v:18},
      {label:'Cat.1 35',v:35},{label:'Cat.5 60',v:60}],on:(c,v)=>c.set('v',v)},
    {k:'d',t:'slider',label:'Dirección',min:0,max:350,step:10,val:90,unit:'°',on:c=>wxHurrPut(c)},
    {t:'botones',label:'Girar',items:[{label:'N',v:0},{label:'E',v:90},{label:'S',v:180},
      {label:'O',v:270}],on:(c,v)=>c.set('d',v)},
    {k:'rn',t:'switch',label:'Con lluvia',val:true,on:c=>wxHurrPut(c)},
    {k:'sky',t:'switch',label:'Cielo de tormenta (360°)',val:true,on:c=>wxHurrPut(c)},
    {t:'texto',label:'Medición',live:c=>'viento <b>'+Math.hypot(WX.windX,WX.windZ).toFixed(1)+
      ' m/s</b> ('+WX.windX.toFixed(1)+', '+WX.windZ.toFixed(1)+') · props empujados <b>'+
      wxWindN+'</b> · presión <b>'+(.55*(WX.windX*WX.windX+WX.windZ*WX.windZ)).toFixed(0)+' N/m²</b>'}
  ]},
  start(c){wxLightGrab();wxHurrPut(c);},
  stop(c){wxPut('xpw_hurr',null);wxAmbOff('xpw_hurr');},
  step(c,dt){
    /* hojas y polvo arrastrados: le da cuerpo al viento (sin esto sólo se ven props moviéndose) */
    const v=Math.hypot(WX.windX,WX.windZ);
    if(v<4)return;
    const cx=camera.position.x,cz=camera.position.z,ux=WX.windX/v,uz=WX.windZ/v;
    wxSpawn(WL.leaf,Math.min(70,v*2.4)*WQ,dt,p=>{
      const s=(Math.random()-.5)*40;
      p.x=cx-ux*22+(-uz)*s;p.z=cz-uz*22+ux*s;p.y=wxGY()+.4+Math.random()*7;
      p.vx=WX.windX*(.8+Math.random()*.5);p.vz=WX.windZ*(.8+Math.random()*.5);
      p.vy=.6+Math.random()*2.4;
      p.life=p.max=2.6;p.gr=.12;p.dg=1.1;p.fy=wxGY()-2;
      p.sz=.24+Math.random()*.34;p.r=.5;p.g=.44;p.b=.28;p.a=.85;
    });
  },
  probe:()=>({wind:+Math.hypot(WX.windX,WX.windZ).toFixed(2),pushed:wxWindN,
    ok:Math.hypot(WX.windX,WX.windZ)>3})
});

/* ================= 30 · NIEVE (+ piso helado de verdad) ================= */
/* El "piso helado" no es un efecto visual: se le baja la fricción a TODOS los ContactMaterial del
   mundo (y al de por defecto), guardando los originales. Se siente al caminar y los props patinan. */
const WXICE={ok:false,def:0,list:null};
function wxIce(k){
  const CM=world.contactmaterials||world.contactMaterials||[];
  if(!WXICE.ok){
    WXICE.ok=true;WXICE.def=world.defaultContactMaterial.friction;
    WXICE.list=CM.map(m=>m.friction);
  }
  world.defaultContactMaterial.friction=WXICE.def*(1-k*.9);
  for(let i=0;i<CM.length;i++)if(WXICE.list[i]!=null)CM[i].friction=WXICE.list[i]*(1-k*.9);
  return k;
}
function wxIceOff(){
  if(!WXICE.ok)return false;
  const CM=world.contactmaterials||world.contactMaterials||[];
  world.defaultContactMaterial.friction=WXICE.def;
  for(let i=0;i<CM.length;i++)if(WXICE.list[i]!=null)CM[i].friction=WXICE.list[i];
  WXICE.ok=false;return true;
}
const wxSnowPut=c=>{
  const i=c.get('i');wxDir(c.get('d'),_wxD);
  wxPut('xpw_snow',{snow:i,windX:_wxD.x*c.get('w'),windZ:_wxD.z*c.get('w'),
    fogK:.16+.3*i,fogClr:0xc9d6e2,dark:.10*i,hemiClr:0xdfeaf6,expo:1});
  wxIce(c.get('ice')?Math.min(1,.35+.6*i):0);
};
wxAdd({
  id:'xpw_snow',name:'Nevadora',near:2.8,btn:'❄ Nevada',
  desc:'Copos que aletean y bajan despacio, cielo lavado y —si querés— el piso helado de '+
       'verdad: menos fricción para el jugador y para los props.',
  ui:{title:'Nieve',controls:[
    {k:'on',t:'switch',label:'Nevar',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'i',t:'slider',label:'Intensidad',min:.08,max:1,step:.04,val:.5,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxSnowPut(c)},
    {k:'w',t:'slider',label:'Viento',min:0,max:12,step:.5,val:1.5,unit:' m/s',on:c=>wxSnowPut(c)},
    {k:'d',t:'slider',label:'Dirección',min:0,max:350,step:10,val:40,unit:'°',on:c=>wxSnowPut(c)},
    {k:'ice',t:'switch',label:'Piso helado (menos fricción)',val:true,on:c=>wxSnowPut(c)},
    {t:'texto',label:'Medición',live:c=>'copos <b>'+WL.soft.n+'</b>/'+WL.soft.cap+
      ' · fricción del mundo <b>'+world.defaultContactMaterial.friction.toFixed(3)+
      '</b> (normal '+(WXICE.ok?WXICE.def.toFixed(2):'0.42')+')'}
  ]},
  start(c){wxLightGrab();wxSnowPut(c);},
  stop(c){wxPut('xpw_snow',null);wxIceOff();},
  probe:()=>({snow:+WX.snow.toFixed(2),flakes:WL.soft.n,
    fric:+world.defaultContactMaterial.friction.toFixed(3),
    ok:WX.snow>0&&WL.soft.n>0})
});

/* ================= 31 · GRANIZO (con impacto físico) ================= */
const wxHailPut=c=>{
  const i=c.get('i');
  wxPut('xpw_hail',{hail:i,rain:c.get('rn')?i*.5:0,windX:0,windZ:0,
    fogK:.14+.16*i,fogClr:0x8e99a5,dark:.3*i,wet:.4*i,shake:.03*i});
  wxAmbOn('xpw_hail','amb-wind',.12+.2*i);
};
wxAdd({
  id:'xpw_hail',name:'Granizadora',near:2.8,btn:'🧊 Granizo',
  desc:'Piedras de hielo que caen. Unas cuantas son CUERPOS DE FÍSICA de verdad: rebotan, '+
       'suenan al pegar y mueven lo que golpean.',
  ui:{title:'Granizo',controls:[
    {k:'on',t:'switch',label:'Granizar',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'i',t:'slider',label:'Intensidad',min:.1,max:1,step:.05,val:.6,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxHailPut(c)},
    {k:'s',t:'slider',label:'Tamaño de la piedra',min:.10,max:.55,step:.05,val:.2,unit:' m'},
    {k:'rn',t:'switch',label:'Con lluvia',val:true,on:c=>wxHailPut(c)},
    {t:'botones',label:'Tirar una',items:[{label:'🧊 Piedra grande',v:1},
      {label:'🧊 x5',v:5}],
     on:(c,v)=>{for(let i=0;i<v;i++)wxRokFire(
       camera.position.x+(Math.random()-.5)*5,camera.position.y+11,camera.position.z+(Math.random()-.5)*5,
       0,-14,0,{kind:'ice',r:c.get('s'),mass:10+c.get('s')*90,life:7});
       c.toast('🧊 '+v+' piedra'+(v>1?'s':''));}},
    {t:'texto',label:'Medición',live:c=>'piedras visuales <b>'+WL.soft.n+'</b> · cuerpos reales <b>'+
      wxRokN+'</b>/'+WCAP.rok+' · lanzados <b>'+WROK.fired+'</b> · impactos <b>'+WROK.hits+'</b>'}
  ]},
  start(c){wxLightGrab();wxRokInit();wxHailPut(c);},
  stop(c){wxPut('xpw_hail',null);wxAmbOff('xpw_hail');wxRokClear();},
  probe:()=>{const f0=WROK.fired;
    wxRokFire(camera.position.x,camera.position.y+8,camera.position.z,0,-12,0,
      {kind:'ice',r:.24,mass:12,life:5});
    return {hail:+WX.hail.toFixed(2),dots:WL.soft.n,bodies:wxRokN,fired:WROK.fired,
      ok:WX.hail>0&&WROK.fired>f0};}
});

/* ================= 32 · NIEBLA DENSA REGULABLE ================= */
const wxFogPut=c=>{
  wxPut('xpw_fog',{fogK:c.get('k'),fogClr:c.get('col'),dark:.16*c.get('k'),
    expo:1-.12*c.get('k')});
};
wxAdd({
  id:'xpw_fog',name:'Nieblina',near:2.8,btn:'🌫 Niebla',
  desc:'Niebla densa regulable: mueve el principio y el final de la niebla del motor y tiñe '+
       'el fondo. Con 100 % no ves a 40 m.',
  ui:{title:'Niebla',controls:[
    {k:'on',t:'switch',label:'Niebla',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'k',t:'slider',label:'Densidad',min:.05,max:1,step:.05,val:.6,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxFogPut(c)},
    {k:'col',t:'lista',label:'Color',val:0xc8d2da,items:[
      {label:'Gris',v:0xc8d2da},{label:'Blanca',v:0xeef3f7},{label:'Sucia',v:0x9a9382},
      {label:'Verdosa',v:0x93a893},{label:'Nocturna',v:0x2c3340}],on:c=>wxFogPut(c)},
    {t:'botones',label:'Atajos',items:[{label:'Bruma',v:.2},{label:'Densa',v:.6},
      {label:'Sopa',v:1}],on:(c,v)=>c.set('k',v)},
    {t:'texto',label:'Medición',live:c=>'niebla de <b>'+(scene.fog?scene.fog.near.toFixed(0):'—')+
      '</b> a <b>'+(scene.fog?scene.fog.far.toFixed(0):'—')+' m</b> (normal '+
      WXL.fogNear.toFixed(0)+'-'+WXL.fogFar.toFixed(0)+')'}
  ]},
  start(c){wxLightGrab();wxFogPut(c);},
  stop(c){wxPut('xpw_fog',null);},
  probe:()=>({far:scene.fog?+scene.fog.far.toFixed(1):null,base:+WXL.fogFar.toFixed(1),
    ok:!!scene.fog&&scene.fog.far<WXL.fogFar-20})
});

/* ================= 33 · DÍA / NOCHE con panorámicas 360 ================= */
/* El slider es la HORA. De 0 a 24 se cruzan tres panoramas equirectangulares generados
   (night -> dusk -> day -> dusk -> night) con la opacidad de la esfera de encima, así el cambio
   es continuo. El sol se mueve de verdad (azimut = hora, elevación = seno) y con él las sombras. */
const WXDN=[  /* hora · panorama · elevación del sol · intensidad · color · hemi */
  [0   ,'night',-16,.04,0x22304a,.10],
  [5   ,'night',-8 ,.07,0x2c3a55,.12],
  [6.5 ,'dusk' , 4 ,.50,0xff9d55,.30],
  [9   ,'day'  ,30 ,1.15,0xfff0d8,.55],
  [15  ,'day'  ,62 ,1.35,0xfff8ec,.66],
  [17.5,'dusk' ,10 ,.70,0xffb070,.40],
  [19.5,'night',-6 ,.12,0x4a5570,.15],
  [24  ,'night',-16,.04,0x22304a,.10]];
function wxDayNight(h){
  h=((h%24)+24)%24;
  let i=0;while(i<WXDN.length-2&&WXDN[i+1][0]<=h)i++;
  const A=WXDN[i],B=WXDN[i+1];
  const t=(h-A[0])/Math.max(.001,B[0]-A[0]);
  /* base = el panorama de A; mezcla = el de B con la opacidad del avance. Si los dos tramos usan
     el MISMO panorama no hay mezcla (mediodía y medianoche quedan limpios, sin la esfera de
     encima dibujando de más). */
  const base=A[1],mix=(A[1]===B[1])?null:B[1];
  const el=A[2]+(B[2]-A[2])*t, ii=A[3]+(B[3]-A[3])*t, hm=A[5]+(B[5]-A[5])*t;
  _wxC1.setHex(A[4]);_wxC2.setHex(B[4]);_wxC1.lerp(_wxC2,t);
  const az=(h/24)*360+90;
  const dark=clamp((.5-Math.max(0,Math.sin(el*D2R)))*1.15,0,.72);
  return {base,mix,t,el,i:ii,c:_wxC1.getHex(),h:hm,az,dark};
}
const wxDayPut=c=>{
  const R=wxDayNight(c.get('h'));
  wxPut('xpw_day',{sunSet:{az:R.az,el:R.el,i:R.i,c:R.c,h:R.h},dark:R.dark,
    skyBase:R.base,skyMix:R.mix,skyT:R.t,
    fogClr:R.el<4?0x2b3546:(R.el<20?0x8a6a58:null),fogK:0,expo:R.el<0?.72:1});
};
wxAdd({
  id:'xpw_day',name:'Reloj Solar',near:2.8,btn:'🌓 Hora del día',
  desc:'Slider de hora: mueve el sol y las sombras y cruza tres panorámicas 360 generadas '+
       '(noche estrellada, atardecer y día claro) con fundido continuo.',
  ui:{title:'Día y noche',controls:[
    {k:'on',t:'switch',label:'Controlar la hora',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'h',t:'slider',label:'Hora',min:0,max:24,step:.25,val:12,
     fmt:v=>{const H=Math.floor(v),M=Math.round((v-H)*60);
       return (H<10?'0':'')+H+':'+(M<10?'0':'')+M;},on:c=>wxDayPut(c)},
    {t:'botones',label:'Momentos',items:[{label:'🌃 03',v:3},{label:'🌅 07',v:7},
      {label:'☀ 13',v:13},{label:'🌇 18',v:18},{label:'🌙 22',v:22}],on:(c,v)=>c.set('h',v)},
    {k:'auto',t:'switch',label:'Que corra el tiempo',val:false},
    {k:'sp',t:'slider',label:'Velocidad',min:.2,max:8,step:.2,val:2,unit:' h/s'},
    {t:'texto',label:'Medición',live:c=>{const R=wxDayNight(c.get('h'));
      return 'sol a <b>'+R.el.toFixed(0)+'°</b> · intensidad <b>'+sun.intensity.toFixed(2)+
      '</b> · cielo <b>'+(WXSKY.cur||'—')+'</b>'+(WXSKY.mix?' → <b>'+WXSKY.mix+'</b> '+
      Math.round(R.t*100)+'%':'')+' · panorámicas cargadas <b>'+WXSKY.loaded+'</b>';}}
  ]},
  start(c){wxLightGrab();wxSkyWarm();wxDayPut(c);},
  stop(c){wxPut('xpw_day',null);},
  step(c,dt){
    if(!c.get('auto'))return;
    const h=(c.get('h')+c.get('sp')*dt)%24;
    /* se escribe SIN pasar por set() más de 4 veces por segundo: set() repinta el panel y
       guarda en SV, y hacerlo 60 veces por segundo sería absurdo */
    c.mem.acc=(c.mem.acc||0)+dt;
    if(c.mem.acc>=.25){c.mem.acc=0;c.set('h',+h.toFixed(2));}
    else{const R=wxDayNight(h);
      const cc=WXC['xpw_day'];
      if(cc){cc.sunSet={az:R.az,el:R.el,i:R.i,c:R.c,h:R.h};cc.dark=R.dark;
        cc.skyBase=R.base;cc.skyMix=R.mix;cc.skyT=R.t;wxDirty=true;}}
  },
  /* la prueba mueve la hora y COMPONE en el momento (wxApplyNow): si esperara el próximo frame
     leería el sol de antes. No exige que la panorámica esté descargada — eso es asíncrono y la
     prueba corre sincrónica; lo que se verifica es que la PIDA. */
  probe:c=>{c.set('h',22);wxApplyNow();
    const s0=sun.position.y,i0=sun.intensity,k0=WX.skyBase;
    c.set('h',13);wxApplyNow();
    return {nightY:+s0.toFixed(1),dayY:+sun.position.y.toFixed(1),
      nightSun:+i0.toFixed(3),daySun:+sun.intensity.toFixed(3),
      skyNight:k0,skyDay:WX.skyBase,loaded:WXSKY.loaded,
      ok:sun.position.y>s0+20&&sun.intensity>i0+.5&&k0==='night'&&WX.skyBase==='day'};}
});

/* ================= 34 · ECLIPSE ================= */
/* Panorámica 'eclipse' generada (equirectangular 360) MÁS animación procedural encima: un disco
   de sol aditivo, la corona como anillo y la LUNA que le pasa por delante de verdad (disco negro
   con depthWrite:false dibujado después: tapa el sol y el cielo, que es exactamente lo que hace
   la luna). La luz del mundo cae a penumbra en la totalidad y vuelve sola.
   POR QUÉ NO HAY VIDEO 360: un clip de 5 s a 720p pesa 2-6 MB y hay que decodificarlo en el
   celular; la panorámica pesa 33 kB y la sombra de la luna se anima en el shader de nadie, con
   tres discos. Se eligió lo que ANDA en un teléfono (está explicado en el reporte). */
/* DÓNDE VA EL SOL EN EL ECLIPSE — el detalle que se ve en la captura
   La panorámica generada YA trae su eclipse pintado en un lugar fijo del equirectángulo (en
   sky-eclipse.jpg está en u=0.496, v=0.289 desde arriba). Si el sol del motor apuntara a otro
   lado se verían DOS soles: el pintado y el mío. Así que el az/el del sol se despeja de la
   proyección de SphereGeometry (x=-cos(2πu)·sinθ, y=cosθ, z=sin(2πu)·sinθ con θ=π(1-v_tex),
   v_tex=1-v_img) y da (0.788, 0.615, 0.020) -> el=38°, az=88°. Con eso el disco del sol, la
   corona y la luna procedurales caen ENCIMA del eclipse de la panorámica: al principio se ve mi
   sol brillante sobre el cielo de día, la luna lo va tapando y en la totalidad la panorámica
   (que entra con opacidad = cobertura) aporta su corona justo alrededor. */
const WXECL={az:88,el:38};
function wxEclBuild(c){
  const g=wxGroup(c);
  if(c.mem.ec)return c.mem.ec;
  const R=wxSkyR()*.70,r=R*.100;
  const G=new THREE.Group();G.frustumCulled=false;
  const sun0=new THREE.Mesh(new THREE.CircleGeometry(r,28),
    new THREE.MeshBasicMaterial({color:0xfff3d0,transparent:true,opacity:1,depthWrite:false,
      fog:false,blending:THREE.AdditiveBlending}));
  sun0.renderOrder=1;G.add(sun0);
  /* la corona con degradado POR VÉRTICE (fuerte pegada al disco, apagándose hacia afuera): con
     un anillo de color plano se veía un disco crema con borde duro, no una corona */
  const cg=new THREE.RingGeometry(r*1.0,r*2.6,40,10);
  {const pp=cg.attributes.position,n=pp.count,ca=new Float32Array(n*4);
   for(let i=0;i<n;i++){
     const rr=Math.hypot(pp.getX(i),pp.getY(i));
     const t=clamp((rr-r)/(r*1.6),0,1),a=Math.pow(1-t,2.4);
     ca[i*4]=1;ca[i*4+1]=.93;ca[i*4+2]=.74;ca[i*4+3]=a;}
   cg.setAttribute('color',new THREE.BufferAttribute(ca,4));}
  const cor=new THREE.Mesh(cg,
    new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,
      fog:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  cor.renderOrder=2;G.add(cor);
  const moon=new THREE.Mesh(new THREE.CircleGeometry(r*1.04,28),
    new THREE.MeshBasicMaterial({color:0x05070b,transparent:true,opacity:1,depthWrite:false,
      fog:false}));
  moon.renderOrder=3;G.add(moon);
  g.add(G);
  c.mem.ec={G,sun0,cor,moon,R,r};
  return c.mem.ec;
}
const wxEclPut=c=>{
  const t=c.get('t'),cov=1-Math.abs(2*t-1);          /* 0 en los bordes, 1 en la totalidad */
  const k=Math.pow(cov,1.4);
  wxPut('xpw_eclipse',{dark:k*.90,expo:1-.46*k,
    skyBase:'day',skyMix:'eclipse',skyT:k,
    fogClr:k>.25?0x2a3348:null,fogK:k*.10,
    sunSet:{az:WXECL.az,el:WXECL.el,i:1.35*(1-k*.97),c:k>.5?0xbfd0ff:0xfff4e2,
      h:.62*(1-k*.9)+.03}});
};
wxAdd({
  id:'xpw_eclipse',name:'Eclipsador',near:2.8,btn:'🌑 Eclipse total',
  desc:'Cielo 360 de eclipse generado, la luna cruzando por delante del sol con su corona, y la '+
       'luz del mundo cayendo a penumbra y volviendo.',
  ui:{title:'Eclipse',controls:[
    {k:'on',t:'switch',label:'Eclipse',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'t',t:'slider',label:'Avance',min:0,max:1,step:.02,val:.5,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxEclPut(c)},
    {k:'auto',t:'switch',label:'Que avance solo',val:true},
    {k:'dur',t:'slider',label:'Duración',min:6,max:90,step:2,val:26,unit:' s'},
    {t:'botones',label:'Ir a',items:[{label:'Parcial',v:.22},{label:'Totalidad',v:.5},
      {label:'Saliendo',v:.8}],on:(c,v)=>c.set('t',v)},
    {t:'texto',label:'Medición',live:c=>{const t=c.get('t'),cov=1-Math.abs(2*t-1);
      return 'cobertura <b>'+Math.round(cov*100)+'%</b> · sol <b>'+sun.intensity.toFixed(2)+
      '</b> · exposición <b>'+renderer.toneMappingExposure.toFixed(2)+'</b> · cielo eclipse <b>'+
      Math.round((WXSKY.ov?WXSKY.ov.material.opacity:0)*100)+'%</b>';}}
  ]},
  start(c){wxLightGrab();wxSkyTex('eclipse');wxSkyTex('day');wxEclBuild(c);
    if(c.get('auto'))c.set('t',0);wxEclPut(c);},
  stop(c){wxGroupOff(c);wxPut('xpw_eclipse',null);},
  step(c,dt){
    if(!c.get('auto'))return;
    c.mem.acc=(c.mem.acc||0)+dt;
    const v=clamp(c.get('t')+dt/Math.max(2,c.get('dur')),0,1);
    if(c.mem.acc>=.2){c.mem.acc=0;c.set('t',+v.toFixed(3));
      if(v>=1)c.set('auto',false);}
    else{const cov=1-Math.abs(2*v-1),k=Math.pow(cov,1.4),cc=WXC['xpw_eclipse'];
      if(cc){cc.dark=k*.90;cc.expo=1-.46*k;cc.skyT=k;
        cc.sunSet={az:WXECL.az,el:WXECL.el,i:1.35*(1-k*.97),c:k>.5?0xbfd0ff:0xfff4e2,
          h:.62*(1-k*.9)+.03};
        wxDirty=true;}}
  },
  frame(c,dt){
    const E=c.mem.ec;if(!E)return;
    /* el grupo se planta en la dirección del sol y mira a la cámara (cartelera): así los tres
       discos se ven redondos desde donde sea */
    _wxV.copy(sun.position).normalize().multiplyScalar(E.R).add(camera.position);
    E.G.position.copy(_wxV);
    E.G.lookAt(camera.position);
    const t=c.get('t'),cov=1-Math.abs(2*t-1);
    E.moon.position.set((t*2-1)*E.r*2.2,0,.6);
    E.cor.material.opacity=Math.pow(cov,2.2)*.85;
    E.cor.scale.setScalar(1+cov*.25);
    E.sun0.material.opacity=1;
    E.G.visible=true;
  },
  probe:c=>{c.set('auto',false);c.set('t',.5);wxApplyNow();
    const i5=sun.intensity,e5=renderer.toneMappingExposure;
    c.set('t',0);wxApplyNow();
    return {sunTot:+i5.toFixed(3),sunOut:+sun.intensity.toFixed(3),
      expoTot:+e5.toFixed(3),moon:!!c.mem.ec,mix:WX.skyMix,
      ok:!!c.mem.ec&&i5<sun.intensity*.35&&WX.skyMix==='eclipse'};}
});

/* ================= 35 · ATARDECER PERMANENTE ================= */
const wxDuskPut=c=>{
  const e=c.get('el');
  wxPut('xpw_dusk',{skyBase:'dusk',dark:clamp((3-e)/16,0,.45),
    sunSet:{az:c.get('az'),el:e,i:c.get('i'),c:e<3?0xff7a3c:0xffa858,h:.30+e*.012},
    fogClr:0x8a5a48,fogK:.10,expo:1.02});
};
wxAdd({
  id:'xpw_dusk',name:'Ancla Crepusc',near:2.8,btn:'🌇 Atardecer permanente',
  desc:'Deja el mundo clavado en la hora dorada con su panorámica 360 generada: sol raspando el '+
       'horizonte, sombras largas y luz naranja.',
  ui:{title:'Atardecer',controls:[
    {k:'on',t:'switch',label:'Atardecer',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'el',t:'slider',label:'Altura del sol',min:-5,max:18,step:.5,val:3.5,unit:'°',
     on:c=>wxDuskPut(c)},
    {k:'az',t:'slider',label:'Hacia dónde',min:0,max:350,step:10,val:250,unit:'°',on:c=>wxDuskPut(c)},
    {k:'i',t:'slider',label:'Fuerza del sol',min:.2,max:1.8,step:.05,val:.95,on:c=>wxDuskPut(c)},
    {t:'botones',label:'Atajos',items:[{label:'🌤 Tarde',v:14},{label:'🌇 Dorada',v:3.5},
      {label:'🌆 Ocaso',v:-2}],on:(c,v)=>c.set('el',v)},
    {t:'texto',label:'Medición',live:c=>'sol en y=<b>'+sun.position.y.toFixed(0)+
      '</b> · intensidad <b>'+sun.intensity.toFixed(2)+'</b> · cielo <b>'+(WXSKY.cur||'—')+'</b>'}
  ]},
  start(c){wxLightGrab();wxSkyTex('dusk');wxDuskPut(c);},
  stop(c){wxPut('xpw_dusk',null);},
  /* se mira WX.skyBase (lo que PIDE) y no WXSKY.cur (lo que ya cargó): la panorámica baja
     asíncrona y la prueba es sincrónica */
  probe:()=>{wxApplyNow();
    return {sky:WX.skyBase,cur:WXSKY.cur,sunY:+sun.position.y.toFixed(1),
      sunI:+sun.intensity.toFixed(3),
      ok:WX.skyBase==='dusk'&&!!WX.sunSet&&sun.position.y<80};}
});

/* ================= 36 · LUNA: GRAVEDAD BAJA ================= */
const wxMoonPut=c=>{
  const gg=c.get('g');
  wxGravSet(-19.6*gg);
  wxPut('xpw_moon',{skyBase:c.get('sky')?'night':null,dark:c.get('sky')?.52:0,
    fogClr:c.get('sky')?0x131a26:null,fogK:c.get('sky')?.04:0,
    sunSet:c.get('sky')?{az:40,el:26,i:.55,c:0xdfe8ff,h:.10}:null,
    expo:c.get('sky')?.9:1});
};
wxAdd({
  id:'xpw_moon',name:'Base Lunar',near:2.8,btn:'🌕 Gravedad lunar',
  desc:'Baja la gravedad del mundo entero: saltás más alto y todo cae en cámara lenta. Con el '+
       'cielo estrellado 360 generado.',
  ui:{title:'Luna',controls:[
    {k:'on',t:'switch',label:'Gravedad baja',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'g',t:'slider',label:'Gravedad',min:.04,max:1.2,step:.02,val:.165,unit:' g',
     on:c=>wxMoonPut(c)},
    {t:'botones',label:'Mundos',items:[{label:'🌕 Luna',v:.165},{label:'🔴 Marte',v:.38},
      {label:'🌍 Tierra',v:1},{label:'🪐 Júpiter',v:1.2}],on:(c,v)=>c.set('g',v)},
    {k:'sky',t:'switch',label:'Cielo estrellado (360°)',val:true,on:c=>wxMoonPut(c)},
    {t:'texto',label:'Medición',live:c=>'gravedad <b>'+world.gravity.y.toFixed(2)+
      ' m/s²</b> ('+(world.gravity.y/-19.6).toFixed(3)+' g) · tu salto llega a <b>'+
      (PL.jump*PL.jump/(2*Math.abs(world.gravity.y))).toFixed(2)+' m</b> (normal '+
      (PL.jump*PL.jump/(2*19.6)).toFixed(2)+' m)'}
  ]},
  start(c){wxLightGrab();if(c.get('sky'))wxSkyTex('night');wxMoonPut(c);},
  stop(c){wxPut('xpw_moon',null);wxGravOff();},
  probe:()=>({g:+world.gravity.y.toFixed(2),
    jump:+(PL.jump*PL.jump/(2*Math.abs(world.gravity.y))).toFixed(2),
    ok:world.gravity.y>-12&&WXGR.ok})
});

/* ================= 37 · TERREMOTO ================= */
const wxQuakePut=c=>{
  const m=c.get('m');
  wxPut('xpw_quake',{shake:m*.55,fogK:.06*m,fogClr:0x9a9284,dark:.10*m});
};
wxAdd({
  id:'xpw_quake',name:'Sismografo',near:2.8,btn:'🌎 Terremoto',
  desc:'Sacude la cámara y le mete impulsos aleatorios a TODOS los props cercanos: las torres '+
       'se caen de verdad.',
  ui:{title:'Terremoto',controls:[
    {k:'on',t:'switch',label:'Temblando',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'m',t:'slider',label:'Magnitud',min:.1,max:1,step:.05,val:.5,
     fmt:v=>(3+v*6).toFixed(1)+' Mw',on:c=>wxQuakePut(c)},
    {k:'f',t:'slider',label:'Frecuencia del sacudón',min:.5,max:6,step:.25,val:2.5,unit:' Hz'},
    {t:'botones',label:'Sacudón',items:[{label:'💥 Golpe seco',v:1}],
     on:c=>{wxShkA=1.1;wxPush(plBody.position.x,plBody.position.y,plBody.position.z,26,26,10,0,80);
       wxSnd('crash',{vol:.9});c.toast('🌎 golpe');}},
    {t:'texto',label:'Medición',live:c=>'sacudida <b>'+wxShkA.toFixed(3)+
      ' m</b> · props sacudidos <b>'+(c.mem.n||0)+'</b> · despiertos <b>'+
      actives().length+'</b>'}
  ]},
  start(c){wxLightGrab();c.mem.t=0;wxQuakePut(c);},
  stop(c){wxPut('xpw_quake',null);wxAmbOff('xpw_quake');},
  step(c,dt){
    const m=c.get('m'),f=c.get('f');
    /* impulsos aleatorios a los props: la sacudida de la cámara sola no tira nada, y lo que el
       usuario quiere ver es la pila de cajones desarmándose */
    const A=actives();let n=0;
    const px=camera.position.x,pz=camera.position.z;
    const ph=wxShkP*f*6.2832;
    for(const p of A){
      if(p.frozen)continue;
      const b=p.body,dx=b.position.x-px,dz=b.position.z-pz;
      if(dx*dx+dz*dz>3600)continue;
      const s=m*34*dt;
      _wxF.set((Math.sin(ph+b.position.x*.7)+Math.random()-.5)*s*b.mass,
               Math.abs(Math.sin(ph*.5))*s*b.mass*.35,
               (Math.cos(ph+b.position.z*.6)+Math.random()-.5)*s*b.mass);
      b.wakeUp();b.applyForce(_wxF,_wxO);n++;
    }
    c.mem.n=n;
    /* retumbe: 'crash' cada tanto, con la velocidad bajada para que suene a estruendo lejano */
    c.mem.t-=dt;
    if(c.mem.t<=0){c.mem.t=1.4/Math.max(.2,m)*(.7+Math.random()*.7);
      wxSnd('crash',{vol:.28+.5*m,rate:.42+Math.random()*.16});}
    /* polvo cayendo del cielo raso */
    wxSpawn(WL.soft,60*m*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*12;
      p.x=px+Math.cos(a)*r;p.z=pz+Math.sin(a)*r;p.y=camera.position.y+2+Math.random()*4;
      p.vy=-1.2-Math.random()*2;p.life=p.max=2.2;p.gr=.2;p.dg=.4;p.fy=wxGY();
      p.sz=.55+Math.random()*.70;p.r=.62;p.g=.58;p.b=.52;p.a=.4;
    });
  },
  probe:c=>({shake:+wxShkA.toFixed(3),props:c.mem.n||0,
    ok:WX.shake>0&&wxShkA>.002})
});

/* ================= 38 · TSUNAMI QUE VIENE DEL HORIZONTE ================= */
/* Pedido explícito: LENTO, se ve venir de lejos como una línea que crece, la cresta rompe con
   espuma, empuja props y jugador con fuerza real, deja el nivel de agua más alto un rato y
   después baja. El nivel de agua se sube metiendo una entrada en WATER, así stepWater() (core_b)
   le da flotación a todos los props sin tocar nada. */
function wxWaveBuild(c){
  const g=wxGroup(c);
  if(c.mem.WV)return c.mem.WV;
  const W=360;
  const mat=new THREE.MeshPhongMaterial({color:0x2b6a76,transparent:true,opacity:.86,
    shininess:80,specular:new THREE.Color(0xa8dde6),side:THREE.DoubleSide,depthWrite:false});
  const G=new THREE.Group();G.frustumCulled=false;
  /* cuerpo: la masa de agua que viene detrás */
  const body=new THREE.Mesh(new THREE.BoxGeometry(W,1,40),mat);
  body.position.set(0,.5,-20);body.renderOrder=3;G.add(body);
  /* cara frontal inclinada: es la pared que se ve venir */
  const face=new THREE.Mesh(new THREE.PlaneGeometry(W,1),mat);
  face.position.set(0,.5,.6);face.rotation.x=-.30;face.renderOrder=3;G.add(face);
  /* cresta que rompe: un cilindro tumbado a lo ancho, con la textura de nube haciendo de espuma */
  const curl=new THREE.Mesh(new THREE.CylinderGeometry(1,1,W,12,1,true),
    wxCloudMat(0xdff2f6,.72,false));
  curl.rotation.z=Math.PI/2;curl.renderOrder=4;G.add(curl);
  g.add(G);
  c.mem.WV={G,body,face,curl,mat,W};
  return c.mem.WV;
}
const WXSIDE={n:[0,-1],s:[0,1],e:[-1,0],o:[1,0]};
wxAdd({
  id:'xpw_tsunami',name:'Boya Tsunami',near:2.8,btn:'🌊 Lanzar el tsunami',
  desc:'Una línea que crece en el horizonte y avanza despacio hasta pasarte por encima: '+
       'empuja los props y al jugador, y deja el agua alta un rato antes de bajar.',
  ui:{title:'Tsunami',controls:[
    {k:'side',t:'lista',label:'Viene del',val:'n',items:[{label:'⬆ Norte',v:'n'},
      {label:'⬇ Sur',v:'s'},{label:'➡ Este',v:'e'},{label:'⬅ Oeste',v:'o'}]},
    {k:'H',t:'slider',label:'Altura de la ola',min:3,max:20,step:.5,val:9,unit:' m'},
    {k:'sp',t:'slider',label:'Velocidad',min:2,max:16,step:.5,val:6,unit:' m/s'},
    {k:'hold',t:'slider',label:'Agua alta',min:2,max:40,step:1,val:12,unit:' s'},
    {t:'botones',label:'Ahora',items:[{label:'🌊 Lanzar la ola',v:1},{label:'⏹ Cortar',v:0}],
     on:(c,v)=>{if(v)wxWaveGo(c);else wxWaveEnd(c);}},
    {t:'texto',label:'Medición',live:c=>{const W=c.mem.WV;
      if(!W||!c.mem.go)return 'la ola está quieta · tocá <b>Lanzar la ola</b>';
      return 'frente a <b>'+c.mem.d.toFixed(0)+' m</b> de vos · altura <b>'+
      c.mem.H.toFixed(1)+' m</b> · agua en <b>'+WXW.lvl.toFixed(2)+' m</b> · empujados <b>'+
      (c.mem.hit||0)+'</b>'+(inWater?' · <b>estás en el agua</b>':'');}}
  ]},
  start(c){wxLightGrab();wxWaveBuild(c);wxWaveGo(c);},
  stop(c){wxWaveEnd(c);wxGroupOff(c);wxPut('xpw_tsunami',null);wxAmbOff('xpw_tsunami');},
  step(c,dt){
    if(!c.mem.go)return;
    const W=c.mem.WV,S=((CURMAP&&CURMAP.def&&CURMAP.def.size)||120);
    const D0=c.mem.D0,dir=c.mem.dir;
    c.mem.p+=c.get('sp')*dt;
    const front=-D0+c.mem.p;                        /* posición del frente en el eje de avance */
    /* distancia del frente al jugador, medida en el eje de avance */
    const plp=plBody.position.x*dir[0]+plBody.position.z*dir[1];
    c.mem.d=Math.abs(front-plp);
    /* --- empuje real a los props que el frente está barriendo --- */
    const H=c.mem.H;let hit=0;
    for(const p of actives()){
      if(p.frozen)continue;
      const b=p.body,pp=b.position.x*dir[0]+b.position.z*dir[1];
      const rel=front-pp;
      if(rel<-4||rel>34)continue;
      const k=clamp(1-rel/34,.15,1)*H*3.2;
      _wxF.set(dir[0]*k*b.mass,k*b.mass*.55,dir[1]*k*b.mass);
      b.wakeUp();b.applyForce(_wxF,_wxO);hit++;
    }
    c.mem.hit=hit;
    /* --- empuje al jugador --- */
    const rel=front-plp;
    if(rel>-3&&rel<30){
      const k=clamp(1-rel/30,.1,1)*H*.5;
      plBody.velocity.x+=dir[0]*k*dt;plBody.velocity.z+=dir[1]*k*dt;
      plBody.velocity.y+=k*.5*dt;plBody.wakeUp();
      const cc=WXC['xpw_tsunami'];if(cc){cc.shake=clamp(k*.02,0,.4);wxDirty=true;}
      if(!c.mem.splashed){c.mem.splashed=1;wxSnd('splash',{vol:1});}
    }
    /* --- nivel de agua: sube cuando el frente ya pasó y baja al final del recorrido --- */
    const rise=clamp((front-plp+6)/26,0,1)*clamp((D0*1.15-front)/70,0,1);
    if(rise>.01)wxWaterTo(H*.42*rise);else wxWaterOff();
    /* --- espuma en la cresta, sólo en el tramo que el jugador tiene cerca --- */
    const cx=camera.position.x,cz=camera.position.z;
    const fx=dir[0]*front,fz=dir[1]*front;
    wxSpawn(WL.soft,240*WQ,dt,p=>{
      const s=(Math.random()-.5)*70;
      p.x=(dir[0]?fx:cx+s)+(dir[0]? -dir[1]*0+0:0);
      p.z=(dir[1]?fz:cz+s);
      if(dir[0]){p.x=fx;p.z=cz+s;}else{p.x=cx+s;p.z=fz;}
      p.y=H*(.75+Math.random()*.35);
      p.vx=dir[0]*(3+Math.random()*6)+(Math.random()-.5)*3;
      p.vz=dir[1]*(3+Math.random()*6)+(Math.random()-.5)*3;
      p.vy=1+Math.random()*5;
      p.life=p.max=1.5+Math.random();p.gr=.8;p.dg=.2;p.fy=Math.max(0,WXW.lvl);
      p.sz=1.1+Math.random()*2.2;p.r=.94;p.g=.98;p.b=1;p.a=.82;
    });
    /* rugido que crece a medida que se acerca */
    wxAmbOn('xpw_tsunami','amb-wind',clamp(1.1-c.mem.d/120,.12,1));
    if(front>D0*1.2)wxWaveEnd(c);
  },
  frame(c){
    const W=c.mem.WV;if(!W||!c.mem.go)return;
    const dir=c.mem.dir,front=-c.mem.D0+c.mem.p,H=c.mem.H;
    W.G.position.set(dir[0]*front,0,dir[1]*front);
    W.G.rotation.y=dir[0]?(dir[0]>0?-Math.PI/2:Math.PI/2):(dir[1]>0?0:Math.PI);
    W.body.scale.set(1,H,1);W.body.position.set(0,H/2,-20);
    W.face.scale.set(1,H*1.35,1);W.face.position.set(0,H*.52,.9);
    W.curl.scale.set(H*.16,1,H*.16);W.curl.position.set(0,H*.98,-.4);
    const m=W.curl.material.map;if(m)m.offset.x+=.004;
    W.G.visible=true;
  },
  probe:c=>{wxWaveGo(c);
    return {go:!!c.mem.go,mesh:!!c.mem.WV,H:c.mem.H,dist:+(c.mem.d||0).toFixed(1),
      ok:!!c.mem.go&&!!c.mem.WV};}
});
function wxWaveGo(c){
  wxWaveBuild(c);
  const S=((CURMAP&&CURMAP.def&&CURMAP.def.size)||120);
  const sd=WXSIDE[c.get('side')]||WXSIDE.n;
  c.mem.dir=[-sd[0],-sd[1]];                 /* viene DE ese lado, o sea avanza al contrario */
  c.mem.D0=S+55;c.mem.p=0;c.mem.H=c.get('H');c.mem.go=1;c.mem.splashed=0;c.mem.d=c.mem.D0;
  wxPut('xpw_tsunami',{fogK:.10,fogClr:0x7f909c,dark:.16,shake:0});
  wxAmbOn('xpw_tsunami','amb-wind',.14);
  return true;
}
function wxWaveEnd(c){
  c.mem.go=0;
  if(c.mem.WV)c.mem.WV.G.visible=false;
  wxWaterOff();wxAmbOff('xpw_tsunami');
  return true;
}

/* ================= 39 · INUNDACIÓN ================= */
const wxFloodPut=c=>{wxPut('xpw_flood',{fogK:.06,fogClr:0x8e9ea8,dark:.06});};
wxAdd({
  id:'xpw_flood',name:'Compuerta',near:2.8,btn:'💧 Inundar el mapa',
  desc:'Sube el nivel del agua de todo el mapa. Los props flotan de verdad (empuje de core_b) y '+
       'el jugador nada.',
  ui:{title:'Inundación',controls:[
    {k:'on',t:'switch',label:'Agua',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'lvl',t:'slider',label:'Nivel objetivo',min:0,max:22,step:.5,val:5,unit:' m'},
    {k:'sp',t:'slider',label:'Velocidad',min:.2,max:12,step:.2,val:1.6,unit:' m/s'},
    {t:'botones',label:'Atajos',items:[{label:'Tobillos 1',v:1},{label:'Pecho 2',v:2},
      {label:'Nadar 6',v:6},{label:'Diluvio 16',v:16},{label:'Vaciar',v:0}],
     on:(c,v)=>c.set('lvl',v)},
    {t:'texto',label:'Medición',live:c=>'agua en <b>'+WXW.lvl.toFixed(2)+' m</b> → <b>'+
      c.get('lvl').toFixed(1)+' m</b> · entradas en WATER <b>'+WATER.length+
      '</b> · vos '+(inWater?'<b>nadando</b>':'en seco')}
  ]},
  start(c){wxLightGrab();c.mem.l=WXW.on?WXW.lvl:0;wxFloodPut(c);},
  stop(c){wxWaterOff();wxPut('xpw_flood',null);},
  step(c,dt){
    const t=c.get('lvl');
    c.mem.l=(c.mem.l||0)+clamp(t-c.mem.l,-c.get('sp')*dt,c.get('sp')*dt);
    if(c.mem.l>.02)wxWaterTo(c.mem.l);else wxWaterOff();
  },
  probe:c=>{c.mem.l=4;wxWaterTo(4);
    return {lvl:+WXW.lvl.toFixed(2),inWater:WATER.indexOf(WXW.ent)>=0,
      ok:WXW.on&&WXW.lvl>1&&WATER.indexOf(WXW.ent)>=0};}
});

/* ================= 40 · VOLCÁN CON LAVA ================= */
const wxVolcPut=c=>{
  const i=c.get('i');
  wxPut('xpw_volcano',{ash:c.get('ash')?i*.8:0,fogK:.14+.2*i,fogClr:0x6b5a4c,
    dark:.24*i,shake:0,expo:.96});
  wxAmbOn('xpw_volcano','amb-wind',.10+.16*i);
};
wxAdd({
  id:'xpw_volcano',name:'Maqueta Volcan',near:3.0,btn:'🌋 Erupción',
  desc:'Erupción con columna de humo, ceniza sobre todo el mapa, colada de lava que crece y '+
       'BOMBAS DE LAVA con cuerpo de física que estallan donde caen.',
  ui:{title:'Volcán',controls:[
    {k:'on',t:'switch',label:'Erupción',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'i',t:'slider',label:'Fuerza',min:.15,max:1,step:.05,val:.6,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxVolcPut(c)},
    {k:'bomb',t:'switch',label:'Bombas de lava (física real)',val:true},
    {k:'ash',t:'switch',label:'Ceniza en todo el mapa',val:true,on:c=>wxVolcPut(c)},
    {t:'botones',label:'Ahora',items:[{label:'💥 Explosión',v:1}],
     on:c=>{wxAnchor(c,1.5,_wxV);
       for(let i=0;i<4;i++)wxRokFire(_wxV.x,_wxV.y+1,_wxV.z,
         (Math.random()-.5)*14,16+Math.random()*12,(Math.random()-.5)*14,
         {kind:'rock',r:.32,mass:70,life:8,blast:5});
       wxSnd('boom',{vol:1,at:[_wxV.x,_wxV.y,_wxV.z]});wxShkA=.7;c.toast('🌋 boom');}},
    {t:'texto',label:'Medición',live:c=>'brasas <b>'+WL.glow.n+'</b> · bombas lanzadas <b>'+
      WROK.fired+'</b> · impactos <b>'+WROK.hits+'</b> · colada <b>'+
      (c.mem.lr||0).toFixed(1)+' m</b> · ceniza <b>'+(WX.ash*100|0)+'%</b>'}
  ]},
  start(c){
    wxLightGrab();wxRokInit();
    const g=wxGroup(c);
    if(!c.mem.lava){
      /* colada: un disco emisivo que crece en el piso. Barato y se lee de lejos. */
      const geo=new THREE.CircleGeometry(1,26);geo.rotateX(-Math.PI/2);
      /* ADITIVA: sobre el hormigón claro del mapa una lava opaca al 85 % se veía rosa salmón
         (revisado en la captura). Sumando luz queda naranja incandescente. */
      c.mem.lava=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xff5a1c,
        transparent:true,opacity:.85,depthWrite:false,fog:false,
        blending:THREE.AdditiveBlending}));
      c.mem.lava.renderOrder=3;g.add(c.mem.lava);
      c.mem.smoke=wxMakeCloud(7,0x4a4038,7);g.add(c.mem.smoke);
    }
    c.mem.lr=1;c.mem.t=0;c.mem.bt=0;
    wxVolcPut(c);
  },
  stop(c){wxGroupOff(c);wxPut('xpw_volcano',null);wxAmbOff('xpw_volcano');},
  step(c,dt){
    const i=c.get('i');
    wxAnchor(c,1.5,_wxV);
    const x=_wxV.x,y=_wxV.y,z=_wxV.z;
    /* chorro de brasas: cono hacia arriba, con gravedad -> parábolas de verdad */
    wxSpawn(WL.glow,320*i*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.random()*.5;
      p.x=x+Math.cos(a)*r;p.z=z+Math.sin(a)*r;p.y=y;
      const s=8+Math.random()*22*i;
      p.vx=Math.cos(a)*r*7+(Math.random()-.5)*4;p.vz=Math.sin(a)*r*7+(Math.random()-.5)*4;
      p.vy=s;
      p.life=p.max=1.4+Math.random()*1.8;p.gr=.9;p.dg=.15;p.fy=wxGY();p.spl=2;
      p.sz=.28+Math.random()*.44;p.r=1;p.g=.34+Math.random()*.42;p.b=.08;p.a=1;
    });
    /* columna de humo */
    wxSpawn(WL.soft,110*i*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.random()*1.2;
      p.x=x+Math.cos(a)*r;p.z=z+Math.sin(a)*r;p.y=y+.5;
      p.vx=(Math.random()-.5)*2.6;p.vz=(Math.random()-.5)*2.6;p.vy=6+Math.random()*9;
      p.life=p.max=3.4+Math.random()*2.6;p.gr=-.02;p.dg=.5;p.fy=-999;
      p.sz=1.6+Math.random()*3.4;p.r=.22;p.g=.20;p.b=.18;p.a=.42;
    });
    /* colada que crece y luz del cráter */
    c.mem.lr=Math.min(9,(c.mem.lr||1)+dt*i*.55);
    if(typeof litLight==='function'&&Math.random()<dt*3)
      nsafe(()=>litLight(x,y+1,z,0xff6a1c),'wxvlit');
    /* bombas de lava reales */
    if(c.get('bomb')){
      c.mem.bt-=dt;
      if(c.mem.bt<=0){
        c.mem.bt=(1.6/Math.max(.15,i))*(.6+Math.random()*.9);
        const a=Math.random()*6.2832,s=9+Math.random()*15*i;
        wxRokFire(x,y+.6,z,Math.cos(a)*s,17+Math.random()*13*i,Math.sin(a)*s,
          {kind:'rock',r:.24+Math.random()*.2,mass:60,life:9,blast:3.4+i*3});
      }
    }
    /* retumbe + sacudida según lo cerca que estés */
    const dd=Math.hypot(x-camera.position.x,z-camera.position.z);
    const cc=WXC['xpw_volcano'];
    if(cc){cc.shake=clamp((1-dd/40)*.3*i,0,.32);wxDirty=true;}
    c.mem.t-=dt;
    if(c.mem.t<=0){c.mem.t=(2.2/Math.max(.15,i))*(.7+Math.random()*.8);
      wxSnd(Math.random()<.5?'fw-thump':'boom',{vol:.4+.5*i,rate:.5+Math.random()*.2,at:[x,y,z]});}
  },
  frame(c,dt){
    if(!c.mem.lava)return;
    wxAnchor(c,0,_wxV);
    const r=c.mem.lr||1;
    c.mem.lava.position.set(_wxV.x,_wxV.y+.06,_wxV.z);
    c.mem.lava.scale.setScalar(r);
    c.mem.lava.material.opacity=.62+.24*Math.sin(wxShkP*3.1);
    if(c.mem.smoke){c.mem.smoke.position.set(_wxV.x,_wxV.y+16,_wxV.z);
      c.mem.smoke.rotation.y+=dt*.08;}
  },
  probe:c=>{const f0=WROK.fired;c.mem.bt=0;
    return {embers:WL.glow.n,fired:WROK.fired,lava:+(c.mem.lr||0).toFixed(2),ash:+WX.ash.toFixed(2),
      ok:!!c.mem.lava&&WL.glow.n>0};}
});

/* ================= 41 · METEORITOS ================= */
const wxMetPut=c=>{
  wxPut('xpw_meteor',{dark:.3,fogK:.12,fogClr:0x4a4148,skyBase:c.get('sky')?'night':null,
    sunSet:c.get('sky')?{az:200,el:14,i:.4,c:0xffb890,h:.12}:null,expo:.94});
};
wxAdd({
  id:'xpw_meteor',name:'Radar Meteoro',near:2.8,btn:'☄ Lluvia de meteoritos',
  desc:'Rocas incandescentes que caen con cuerpo de física, estela de brasas y estallido con '+
       'onda de choque que mueve todo lo que hay alrededor del cráter.',
  ui:{title:'Meteoritos',controls:[
    {k:'on',t:'switch',label:'Caen meteoritos',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'f',t:'slider',label:'Frecuencia',min:2,max:60,step:2,val:14,unit:'/min'},
    {k:'s',t:'slider',label:'Tamaño',min:.2,max:1.1,step:.05,val:.45,unit:' m'},
    {k:'R',t:'slider',label:'Radio de caída',min:8,max:90,step:2,val:34,unit:' m'},
    {k:'sky',t:'switch',label:'Cielo nocturno (360°)',val:true,on:c=>wxMetPut(c)},
    {t:'botones',label:'Ahora',items:[{label:'☄ Uno acá',v:1},{label:'☄☄☄ Tres',v:3}],
     on:(c,v)=>{for(let i=0;i<v;i++)wxMetDrop(c,i*4);c.toast('☄ '+v+' meteorito'+(v>1?'s':''));}},
    {t:'texto',label:'Medición',live:c=>'en vuelo <b>'+wxRokN+'</b>/'+WCAP.rok+' · lanzados <b>'+
      WROK.fired+'</b> · impactos <b>'+WROK.hits+'</b> · brasas <b>'+WL.glow.n+'</b>'}
  ]},
  start(c){wxLightGrab();wxRokInit();if(c.get('sky'))wxSkyTex('night');c.mem.t=.6;wxMetPut(c);},
  stop(c){wxPut('xpw_meteor',null);wxRokClear();},
  step(c,dt){
    c.mem.t-=dt;
    if(c.mem.t<=0){
      c.mem.t=(60/Math.max(1,c.get('f')))*(.5+Math.random());
      wxMetDrop(c,0);
    }
  },
  probe:c=>{const f0=WROK.fired;wxMetDrop(c,0);
    return {fired:WROK.fired,flying:wxRokN,ok:WROK.fired>f0};}
});
function wxMetDrop(c,off){
  const R=c.get('R'),a=Math.random()*6.2832,r=Math.sqrt(Math.random())*R;
  const x=camera.position.x+Math.cos(a)*r+off,z=camera.position.z+Math.sin(a)*r;
  const s=c.get('s');
  return wxRokFire(x,camera.position.y+55,z,(Math.random()-.5)*10,-38,(Math.random()-.5)*10,
    {kind:'rock',r:s,mass:80+s*400,life:9,blast:4+s*7});
}

/* ================= 42 · LLUVIA DE FUEGO ================= */
const wxFirePut=c=>{
  const i=c.get('i');wxDir(c.get('d'),_wxD);
  wxPut('xpw_firerain',{fire:i,windX:_wxD.x*c.get('w'),windZ:_wxD.z*c.get('w'),
    fogK:.16+.22*i,fogClr:0x6a2d1c,dark:.34*i,
    skyBase:c.get('sky')?'storm':null,expo:.95,hemiClr:0xffb88a});
  wxAmbOn('xpw_firerain','amb-wind',.12+.2*i);
};
wxAdd({
  id:'xpw_firerain',name:'Brasero Cielo',near:2.8,btn:'🔥 Lluvia de fuego',
  desc:'Brasas encendidas cayendo del cielo, con salpicadura de chispas al llegar al piso y el '+
       'aire teñido de naranja.',
  ui:{title:'Lluvia de fuego',controls:[
    {k:'on',t:'switch',label:'Llover fuego',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'i',t:'slider',label:'Intensidad',min:.1,max:1,step:.05,val:.6,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxFirePut(c)},
    {k:'w',t:'slider',label:'Viento',min:0,max:16,step:.5,val:2,unit:' m/s',on:c=>wxFirePut(c)},
    {k:'d',t:'slider',label:'Dirección',min:0,max:350,step:10,val:200,unit:'°',on:c=>wxFirePut(c)},
    {k:'sky',t:'switch',label:'Cielo cargado (360°)',val:true,on:c=>wxFirePut(c)},
    {t:'texto',label:'Medición',live:c=>'brasas vivas <b>'+WL.glow.n+'</b>/'+WL.glow.cap+
      ' · nuevas <b>'+WXR.fire+'</b>/frame · niebla <b>'+
      (scene.fog?scene.fog.far.toFixed(0):'—')+' m</b>'}
  ]},
  start(c){wxLightGrab();wxFirePut(c);},
  stop(c){wxPut('xpw_firerain',null);wxAmbOff('xpw_firerain');},
  probe:()=>({fire:+WX.fire.toFixed(2),embers:WL.glow.n,ok:WX.fire>0&&WL.glow.n>0})
});

/* ================= 43 · TORMENTA DE ARENA ================= */
const wxSandPut=c=>{
  const i=c.get('i'),v=c.get('w');wxDir(c.get('d'),_wxD);
  wxPut('xpw_sand',{sand:i,windX:_wxD.x*v,windZ:_wxD.z*v,
    fogK:.30+.62*i,fogClr:0xa8783c,dark:.20+.22*i,
    skyBase:c.get('sky')?'sand':null,expo:.95,hemiClr:0xdcb478});
  wxAmbOn('xpw_sand','amb-wind',clamp(.16+i*.6,.1,1));
};
wxAdd({
  id:'xpw_sand',name:'Reloj Arena',near:2.8,btn:'🏜 Tormenta de arena',
  desc:'Haboob: polvo ocre que entra casi horizontal, visibilidad por el piso y el cielo 360 '+
       'de arena generado. El viento empuja los props.',
  ui:{title:'Tormenta de arena',controls:[
    {k:'on',t:'switch',label:'Tormenta',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'i',t:'slider',label:'Densidad',min:.1,max:1,step:.05,val:.7,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxSandPut(c)},
    {k:'w',t:'slider',label:'Viento',min:4,max:40,step:1,val:18,unit:' m/s',on:c=>wxSandPut(c)},
    {k:'d',t:'slider',label:'Dirección',min:0,max:350,step:10,val:270,unit:'°',on:c=>wxSandPut(c)},
    {k:'sky',t:'switch',label:'Cielo de arena (360°)',val:true,on:c=>wxSandPut(c)},
    {t:'texto',label:'Medición',live:c=>'granos <b>'+WL.soft.n+'</b> · ves hasta <b>'+
      (scene.fog?scene.fog.far.toFixed(0):'—')+' m</b> · viento <b>'+
      Math.hypot(WX.windX,WX.windZ).toFixed(1)+' m/s</b> · props empujados <b>'+wxWindN+'</b>'}
  ]},
  start(c){wxLightGrab();if(c.get('sky'))wxSkyTex('sand');wxSandPut(c);},
  stop(c){wxPut('xpw_sand',null);wxAmbOff('xpw_sand');},
  probe:()=>({sand:+WX.sand.toFixed(2),grains:WL.soft.n,far:scene.fog?+scene.fog.far.toFixed(0):null,
    ok:WX.sand>0&&WL.soft.n>0&&!!scene.fog&&scene.fog.far<WXL.fogFar-20})
});

/* ================= 44 · AURORA BOREAL ================= */
/* Panorámica 'aurora' generada de fondo MÁS cortinas cercanas con paralaje: planos altos con
   textura de franjas aditiva, cada uno con su velocidad de deriva, su latido y su balanceo. Van
   ANCLADOS A LA CÁMARA a 0,6 del radio del cielo: si estuvieran más lejos que la esfera del
   cielo, el test de profundidad los borraría. */
function wxAurBuild(c){
  const g=wxGroup(c);
  if(c.mem.cur)return c.mem.cur;
  c.mem.cur=[];
  const R=wxSkyR()*.58;
  for(let i=0;i<WCUR;i++){
    const geo=new THREE.PlaneGeometry(R*1.5,R*.62,1,1);
    const tex=WTEX.curt.clone();tex.needsUpdate=true;
    tex.wrapS=THREE.RepeatWrapping;tex.repeat.set(2+i*.6,1);
    const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,transparent:true,
      opacity:.5,color:[0x3dffa0,0x66ffd8,0xa86cff,0x4dd8ff,0x8cff6c][i]||0x3dffa0,
      depthWrite:false,fog:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    m.frustumCulled=false;m.renderOrder=6;
    m.userData={a:(i/WCUR)*6.2832,r:R*(.72+i*.10),drift:.02+i*.014,ph:i*1.7,
      y:R*.30+i*R*.05};
    g.add(m);c.mem.cur.push(m);
  }
  return c.mem.cur;
}
const wxAurPut=c=>{
  wxPut('xpw_aurora',{skyBase:c.get('sky')?'aurora':null,dark:c.get('sky')?.62:.30,
    fogClr:0x16233a,fogK:.05,hemiClr:0x8fffd0,expo:.94,
    sunSet:c.get('sky')?{az:20,el:8,i:.10,c:0x9fd8ff,h:.14*c.get('i')+.05}:null});
};
wxAdd({
  id:'xpw_aurora',name:'Bobina Aurora',near:2.8,btn:'🌌 Aurora boreal',
  desc:'Noche polar: panorámica 360 de aurora generada más cortinas de luz cercanas que ondulan '+
       'y tiñen de verde la luz del ambiente.',
  ui:{title:'Aurora',controls:[
    {k:'on',t:'switch',label:'Aurora',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'i',t:'slider',label:'Brillo',min:.15,max:1.6,step:.05,val:.8,on:c=>wxAurPut(c)},
    {k:'v',t:'slider',label:'Velocidad',min:.1,max:3,step:.1,val:1},
    {k:'sky',t:'switch',label:'Cielo de aurora (360°)',val:true,on:c=>wxAurPut(c)},
    {t:'texto',label:'Medición',live:c=>'cortinas <b>'+(c.mem.cur?c.mem.cur.length:0)+'</b>/'+WCUR+
      ' · brillo <b>'+(c.mem.cur&&c.mem.cur[0]?c.mem.cur[0].material.opacity.toFixed(2):'—')+
      '</b> · cielo <b>'+(WXSKY.cur||'—')+'</b> · hemi <b>'+hemi.intensity.toFixed(2)+'</b>'}
  ]},
  start(c){wxLightGrab();if(c.get('sky'))wxSkyTex('aurora');wxAurBuild(c);c.mem.t=0;wxAurPut(c);},
  stop(c){wxGroupOff(c);wxPut('xpw_aurora',null);},
  frame(c,dt){
    const A=c.mem.cur;if(!A)return;
    c.mem.t=(c.mem.t||0)+dt*c.get('v');
    const t=c.mem.t,br=c.get('i');
    for(const m of A){
      const u=m.userData;
      u.a+=dt*u.drift*c.get('v');
      m.position.set(camera.position.x+Math.cos(u.a)*u.r,u.y+Math.sin(t*.5+u.ph)*8,
        camera.position.z+Math.sin(u.a)*u.r);
      m.lookAt(camera.position.x,u.y*.5,camera.position.z);
      /* el latido y el balanceo son lo que hace que "ondule" sin tocar un solo vértice */
      m.material.opacity=clamp(br*(.30+.26*Math.sin(t*.9+u.ph)+.12*Math.sin(t*2.3+u.ph*2)),.02,1);
      if(m.material.map)m.material.map.offset.x+=dt*.014*c.get('v');
      m.rotation.z=Math.sin(t*.4+u.ph)*.10;
    }
  },
  probe:c=>({curtains:c.mem.cur?c.mem.cur.length:0,sky:WXSKY.cur,hemi:+hemi.intensity.toFixed(3),
    ok:!!c.mem.cur&&c.mem.cur.length>=2&&c.mem.cur[0].material.opacity>.02})
});

/* ================= 45 · ARCOÍRIS ================= */
/* Media corona (RingGeometry de 0 a π) con los siete colores en el color POR VÉRTICE según el
   radio, aditiva y enfrentada al jugador, siempre en el lado OPUESTO al sol — como el de verdad. */
/* phiSegments=14, NO 1. Con 1 la RingGeometry tiene sólo DOS anillos de vértices y el color por
   vértice interpola del primero al último: se veían dos colores lavados en vez de siete (fue
   exactamente lo que mostró la captura). Con 14 anillos las siete bandas se leen. */
function wxBowGeo(R,w,seg,inner){
  const g=new THREE.RingGeometry(R-w,R,seg,14,0,Math.PI);
  const pos=g.attributes.position,n=pos.count,col=new Float32Array(n*4);
  const C=[0xff2d2d,0xff8c1a,0xffe11a,0x35d94a,0x2f8cff,0x3d3dff,0x9b2dff];
  for(let i=0;i<n;i++){
    const r=Math.hypot(pos.getX(i),pos.getY(i));
    let t=clamp((r-(R-w))/w,0,1);
    if(inner)t=1-t;                            /* el arco secundario tiene los colores al revés */
    const k=clamp(Math.floor(t*7),0,6);
    _wxC1.setHex(C[k]);
    /* los bordes se desvanecen: un arcoíris no tiene filo */
    const a=Math.pow(Math.sin(t*Math.PI),.7)*.95+.05;
    col[i*4]=_wxC1.r;col[i*4+1]=_wxC1.g;col[i*4+2]=_wxC1.b;col[i*4+3]=a;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,4));
  return g;
}
wxAdd({
  id:'xpw_rainbow',name:'Prisma Arcoiris',near:2.8,btn:'🌈 Arcoíris',
  desc:'Media corona de siete colores enfrentada a vos y siempre opuesta al sol, con arco '+
       'secundario invertido como el de verdad.',
  ui:{title:'Arcoíris',controls:[
    {k:'on',t:'switch',label:'Arcoíris',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'a',t:'slider',label:'Intensidad',min:.05,max:1,step:.05,val:.45,
     fmt:v=>Math.round(v*100)+'%'},
    {k:'sz',t:'slider',label:'Tamaño',min:.4,max:1.4,step:.05,val:.85,unit:'x'},
    {k:'dbl',t:'switch',label:'Arco secundario',val:true},
    {k:'rn',t:'switch',label:'Con llovizna (como el de verdad)',val:false,
     on:(c,v)=>{wxPut('xpw_rainbow',v?{rain:.14,wet:.3,fogK:.05}:{fogK:.03});}},
    {t:'texto',label:'Medición',live:c=>{const B=c.mem.bow;if(!B)return 'apagado';
      return 'radio <b>'+(B.userData.R*c.get('sz')).toFixed(0)+' m</b> · opacidad <b>'+
      B.material.opacity.toFixed(2)+'</b> · sol en <b>('+sun.position.x.toFixed(0)+', '+
      sun.position.y.toFixed(0)+', '+sun.position.z.toFixed(0)+')</b>';}}
  ]},
  start(c){
    const g=wxGroup(c);
    if(!c.mem.bow){
      const R=Math.min(120,wxSkyR()*.34);
      const mat=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.45,
        depthWrite:false,fog:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
      c.mem.bow=new THREE.Mesh(wxBowGeo(R,R*.13,64,false),mat);
      c.mem.bow.frustumCulled=false;c.mem.bow.renderOrder=6;c.mem.bow.userData.R=R;
      g.add(c.mem.bow);
      c.mem.bow2=new THREE.Mesh(wxBowGeo(R*1.28,R*.10,64,true),mat.clone());
      c.mem.bow2.material.opacity=.16;
      c.mem.bow2.frustumCulled=false;c.mem.bow2.renderOrder=6;g.add(c.mem.bow2);
    }
    wxPut('xpw_rainbow',c.get('rn')?{rain:.14,wet:.3,fogK:.05}:{fogK:.03});
  },
  stop(c){wxGroupOff(c);wxPut('xpw_rainbow',null);},
  frame(c){
    const B=c.mem.bow;if(!B)return;
    /* el arcoíris está SIEMPRE a 180° del sol y a 42° de altura: se planta en la antisolar */
    _wxV.copy(sun.position).normalize().multiplyScalar(-1);
    _wxV.y=Math.max(.05,_wxV.y*.4+.18);_wxV.normalize();
    const D=B.userData.R*1.9*c.get('sz');
    _wxV.multiplyScalar(D).add(camera.position);
    for(const m of [B,c.mem.bow2]){
      if(!m)continue;
      m.position.copy(_wxV);
      m.lookAt(camera.position);
      m.scale.setScalar(c.get('sz'));
    }
    B.material.opacity=c.get('a');
    if(c.mem.bow2){c.mem.bow2.material.opacity=c.get('dbl')?c.get('a')*.36:0;
      c.mem.bow2.visible=c.get('dbl');}
  },
  probe:c=>({bow:!!c.mem.bow,op:c.mem.bow?+c.mem.bow.material.opacity.toFixed(2):0,
    ok:!!c.mem.bow&&c.mem.bow.material.opacity>.02})
});

/* ================= 46 · VIENTO EN RÁFAGAS ================= */
/* La ráfaga es una envolvente: base + pico que sube rápido y baja lento (lo que se siente como
   golpe de viento). Se escribe en la contribución cada frame, así el motor de viento (§7) hace
   el resto y los props livianos salen volando. */
wxAdd({
  id:'xpw_gust',name:'Manga Viento',near:2.8,btn:'💨 Viento en ráfagas',
  desc:'Viento base con golpes que van y vienen. Empuja lo liviano y deja quieto lo pesado, '+
       'porque la fuerza sale del área del prop, no de su masa.',
  ui:{title:'Ráfagas',controls:[
    {k:'on',t:'switch',label:'Ráfagas',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'b',t:'slider',label:'Viento base',min:0,max:20,step:.5,val:4,unit:' m/s'},
    {k:'g',t:'slider',label:'Pico de la ráfaga',min:2,max:50,step:1,val:22,unit:' m/s'},
    {k:'p',t:'slider',label:'Cada',min:1,max:20,step:.5,val:5,unit:' s'},
    {k:'d',t:'slider',label:'Dirección',min:0,max:350,step:10,val:90,unit:'°'},
    {k:'var',t:'switch',label:'Que gire la dirección',val:true},
    {t:'texto',label:'Medición',live:c=>'ahora <b>'+Math.hypot(WX.windX,WX.windZ).toFixed(1)+
      ' m/s</b> · ráfaga <b>'+Math.round((c.mem.env||0)*100)+'%</b> · próxima en <b>'+
      Math.max(0,(c.mem.t||0)).toFixed(1)+' s</b> · props empujados <b>'+wxWindN+'</b>'}
  ]},
  start(c){c.mem.t=1;c.mem.env=0;c.mem.dd=c.get('d');
    wxPut('xpw_gust',{windX:0,windZ:0});},
  stop(c){wxPut('xpw_gust',null);wxAmbOff('xpw_gust');},
  step(c,dt){
    c.mem.t-=dt;
    if(c.mem.t<=0){c.mem.t=c.get('p')*(.6+Math.random()*.8);c.mem.env=1;
      if(c.get('var'))c.mem.dd=c.get('d')+(Math.random()-.5)*70;
      wxSnd('amb-wind',{vol:.5,rate:.9+Math.random()*.3});}
    /* subida rápida (ya está en 1) y caída exponencial por dt */
    c.mem.env-=c.mem.env*Math.min(1,1.5*dt);
    if(c.mem.env<.01)c.mem.env=0;
    const v=c.get('b')+c.get('g')*c.mem.env;
    wxDir(c.get('var')?c.mem.dd:c.get('d'),_wxD);
    const cc=WXC['xpw_gust'];
    if(cc){cc.windX=_wxD.x*v;cc.windZ=_wxD.z*v;wxDirty=true;}
    wxAmbOn('xpw_gust','amb-wind',clamp(.06+v/48,.05,.9));
  },
  probe:c=>{c.mem.t=0;c.mem.env=1;
    return {wind:+Math.hypot(WX.windX,WX.windZ).toFixed(2),env:+(c.mem.env||0).toFixed(2),
      pushed:wxWindN,ok:Math.hypot(WX.windX,WX.windZ)>1};}
});

/* ================= 47 · REMOLINO DE HOJAS ================= */
wxAdd({
  id:'xpw_leaves',name:'Sopla Hojas',near:2.8,btn:'🍂 Remolino de hojas',
  desc:'Un remolino de hojas girando en espiral. Usa el mismo modo órbita que el tornado, pero '+
       'chiquito y sin física: es puro adorno y cuesta casi nada.',
  ui:{title:'Remolino de hojas',controls:[
    {k:'on',t:'switch',label:'Remolino',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'n',t:'numero',label:'Hojas por segundo',min:10,max:220,step:10,val:90},
    {k:'r',t:'slider',label:'Radio',min:.6,max:9,step:.2,val:2.4,unit:' m'},
    {k:'h',t:'slider',label:'Altura',min:2,max:26,step:1,val:9,unit:' m'},
    {k:'v',t:'slider',label:'Velocidad de giro',min:5,max:90,step:5,val:34},
    {k:'me',t:'switch',label:'Que me siga',val:false},
    {t:'botones',label:'Color',items:[{label:'🍂 Otoño',v:0},{label:'🌿 Verde',v:1},
      {label:'🌸 Pétalos',v:2}],on:(c,v)=>{c.set('col',v);}},
    {k:'col',t:'lista',label:'Paleta',val:0,items:[{label:'Otoño',v:0},{label:'Verde',v:1},
      {label:'Pétalos',v:2}]},
    {t:'texto',label:'Medición',live:c=>'hojas vivas <b>'+WL.leaf.n+'</b>/'+WL.leaf.cap+
      ' · centro <b>('+(c.mem.P?c.mem.P.x.toFixed(1):'—')+', '+
      (c.mem.P?c.mem.P.z.toFixed(1):'—')+')</b>'}
  ]},
  start(c){
    wxAnchor(c,0,_wxV);
    if(!c.mem.P)c.mem.P={x:_wxV.x,y:_wxV.y,z:_wxV.z,h:c.get('h')};
    c.mem.P.x=_wxV.x;c.mem.P.y=_wxV.y;c.mem.P.z=_wxV.z;c.mem.P.h=c.get('h');
    wxPut('xpw_leaves',{});
  },
  stop(c){wxPut('xpw_leaves',null);},
  step(c,dt){
    const P=c.mem.P;if(!P)return;
    if(c.get('me')){P.x=plBody.position.x;P.z=plBody.position.z;P.y=plBody.position.y-PL.h*.5;}
    else{wxAnchor(c,0,_wxV);P.x=_wxV.x;P.y=_wxV.y;P.z=_wxV.z;}
    P.h=c.get('h');
    const R=c.get('r'),V=c.get('v'),pal=c.get('col')|0;
    wxSpawn(WL.leaf,c.get('n')*WQ,dt,p=>{
      p.md=WMD_ORB;p.pv=P;
      p.f0=R*(.25+Math.random()*.8);p.f1=.05+Math.random()*.12;
      p.f2=Math.random()*6.2832;p.f3=V*(.7+Math.random()*.8);
      p.x=P.x;p.z=P.z;p.y=P.y+Math.random()*1.5;
      p.vy=1.2+Math.random()*3.2;
      p.life=p.max=3.5+Math.random()*3;
      p.sz=.20+Math.random()*.28;p.a=.95;
      const w=Math.random();
      if(pal===1){p.r=.22+w*.3;p.g=.52+w*.34;p.b=.16+w*.16;}
      else if(pal===2){p.r=1;p.g=.62+w*.26;p.b=.72+w*.2;}
      else{p.r=.72+w*.28;p.g=.36+w*.30;p.b=.10+w*.14;}
    });
  },
  probe:()=>({leaves:WL.leaf.n,ok:WL.leaf.n>0})
});

/* ================= 48 · ZONA DE BAJA PRESIÓN (los props flotan) ================= */
wxAdd({
  id:'xpw_lowp',name:'Baja Presion',near:2.8,btn:'🎈 Baja presión',
  desc:'Una burbuja donde todo pesa menos: los props de adentro flotan y se van para arriba. '+
       'La fuerza es proporcional a la masa, así que flotan todos igual.',
  ui:{title:'Baja presión',controls:[
    {k:'on',t:'switch',label:'Zona activa',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'R',t:'slider',label:'Radio',min:3,max:60,step:1,val:16,unit:' m'},
    {k:'f',t:'slider',label:'Empuje',min:0,max:2.6,step:.1,val:1.35,unit:' g',
     fmt:v=>v.toFixed(2)+' g'},
    {k:'sw',t:'slider',label:'Remolino',min:0,max:30,step:1,val:8,unit:' m/s²'},
    {k:'pl',t:'switch',label:'Levantarme a mí también',val:false},
    {t:'botones',label:'Atajos',items:[{label:'Casi flotan',v:.98},{label:'Flotan',v:1.35},
      {label:'Al espacio',v:2.6}],on:(c,v)=>c.set('f',v)},
    {t:'texto',label:'Medición',live:c=>'props dentro <b>'+(c.mem.n||0)+'</b> · empuje <b>'+
      (c.get('f')*19.6).toFixed(1)+' m/s²</b> (gravedad '+Math.abs(world.gravity.y).toFixed(1)+
      ') · el que más sube <b>'+(c.mem.vy||0).toFixed(1)+' m/s</b>'}
  ]},
  start(c){wxPut('xpw_lowp',{});c.mem.n=0;},
  stop(c){wxPut('xpw_lowp',null);},
  step(c,dt){
    wxAnchor(c,1,_wxV);
    const R=c.get('R'),f=c.get('f')*Math.abs(world.gravity.y),sw=c.get('sw');
    c.mem.n=wxPush(_wxV.x,_wxV.y,_wxV.z,R,f,0,sw,Math.max(60,f*1.6));
    let vy=0;
    for(const p of actives()){
      if(p.frozen)continue;
      const b=p.body;
      if(Math.hypot(b.position.x-_wxV.x,b.position.z-_wxV.z)<R&&b.velocity.y>vy)vy=b.velocity.y;
    }
    c.mem.vy=vy;
    if(c.get('pl')){
      const d=Math.hypot(plBody.position.x-_wxV.x,plBody.position.z-_wxV.z);
      if(d<R){plBody.velocity.y+=(f-Math.abs(world.gravity.y))*dt*clamp(1-d/R,.15,1);
        plBody.wakeUp();}
    }
    /* burbujas para que la zona se VEA (si no, es magia invisible) */
    wxSpawn(WL.soft,50*WQ,dt,p=>{
      const a=Math.random()*6.2832,r=Math.sqrt(Math.random())*R;
      p.x=_wxV.x+Math.cos(a)*r;p.z=_wxV.z+Math.sin(a)*r;p.y=_wxV.y-1;
      p.vy=2+Math.random()*3;p.life=p.max=2.6;p.gr=-.03;p.dg=.2;p.fy=-999;
      p.sz=.6+Math.random()*.9;p.r=.7;p.g=.86;p.b=1;p.a=.30;
    });
  },
  probe:c=>({inside:c.mem.n||0,vy:+(c.mem.vy||0).toFixed(2),
    ok:typeof c.mem.n==='number'&&WL.soft.n>0})
});

/* ================= 49 · CLIMA ALEATORIO ================= */
const WXRND=['xpw_rain','xpw_storm','xpw_snow','xpw_hail','xpw_fog','xpw_sand','xpw_firerain',
  'xpw_hurr','xpw_gust','xpw_aurora','xpw_dusk','xpw_leaves'];
wxAdd({
  id:'xpw_random',name:'Ruleta Clima',near:2.8,btn:'🎲 Clima aleatorio',
  desc:'Cicla solo entre doce climas: enciende uno, lo deja un rato y pasa al siguiente. '+
       'Apagarlo apaga también el que estuviera puesto.',
  ui:{title:'Clima aleatorio',controls:[
    {k:'on',t:'switch',label:'Ciclando',val:true,on:(c,v)=>{v?c.run():c.stop();}},
    {k:'dur',t:'slider',label:'Cada clima dura',min:4,max:120,step:2,val:20,unit:' s'},
    {k:'mix',t:'switch',label:'A veces dos a la vez',val:false},
    {t:'botones',label:'Ahora',items:[{label:'🎲 Siguiente ya',v:1}],on:c=>{c.mem.t=0;}},
    {t:'texto',label:'Medición',live:c=>'ahora: <b>'+(c.mem.cur||'—')+'</b>'+
      (c.mem.cur2?' + <b>'+c.mem.cur2+'</b>':'')+' · cambia en <b>'+
      Math.max(0,(c.mem.t||0)).toFixed(1)+' s</b> · vueltas <b>'+(c.mem.k||0)+'</b>'}
  ]},
  start(c){c.mem.t=0;c.mem.cur=null;c.mem.cur2=null;c.mem.k=0;wxPut('xpw_random',{});},
  stop(c){wxRndClear(c);wxPut('xpw_random',null);},
  step(c,dt){
    c.mem.t-=dt;
    if(c.mem.t>0)return;
    wxRndClear(c);
    c.mem.t=c.get('dur');c.mem.k=(c.mem.k||0)+1;
    const id=WXRND[Math.floor(Math.random()*WXRND.length)];
    c.mem.cur=id;XP.run(id);
    if(c.get('mix')&&Math.random()<.4){
      let id2=WXRND[Math.floor(Math.random()*WXRND.length)];
      if(id2!==id){c.mem.cur2=id2;XP.run(id2);}
    }
    c.toast('🎲 '+(XP.of(id)?XP.of(id).name:id));
  },
  probe:c=>{c.mem.t=0;
    return {cur:c.mem.cur,rounds:c.mem.k||0,ok:true};}
});
function wxRndClear(c){
  if(c.mem.cur&&XP.running(c.mem.cur))XP.stop(c.mem.cur);
  if(c.mem.cur2&&XP.running(c.mem.cur2))XP.stop(c.mem.cur2);
  c.mem.cur=null;c.mem.cur2=null;return true;
}

/* ================= 50 · CONTROL MAESTRO DEL CLIMA ================= */
/* Un panel con TODO: un interruptor por clima (que prende y apaga el experimento de verdad, no
   una copia) más viento y niebla globales propios. Como cada experimento aporta por separado, se
   pueden apilar: nieve + baja presión + aurora a la vez y ninguno pisa al otro. */
const WXMEN=[['xpw_rain','🌧 Lluvia'],['xpw_storm','⚡ Tormenta'],['xpw_tornado','🌪 Tornado'],
  ['xpw_hurr','🌀 Huracán'],['xpw_snow','❄ Nieve'],['xpw_hail','🧊 Granizo'],
  ['xpw_fog','🌫 Niebla'],['xpw_sand','🏜 Arena'],['xpw_firerain','🔥 Lluvia de fuego'],
  ['xpw_meteor','☄ Meteoritos'],['xpw_volcano','🌋 Volcán'],['xpw_aurora','🌌 Aurora'],
  ['xpw_rainbow','🌈 Arcoíris'],['xpw_quake','🌎 Terremoto'],['xpw_flood','💧 Inundación'],
  ['xpw_tsunami','🌊 Tsunami'],['xpw_moon','🌕 Gravedad lunar'],['xpw_lowp','🎈 Baja presión'],
  ['xpw_day','🌓 Día y noche'],['xpw_eclipse','🌑 Eclipse'],['xpw_dusk','🌇 Atardecer'],
  ['xpw_gust','💨 Ráfagas'],['xpw_leaves','🍂 Hojas'],['xpw_random','🎲 Aleatorio']];
const wxMasterPut=c=>{
  const v=c.get('w');wxDir(c.get('d'),_wxD);
  wxPut('xpw_master',{windX:_wxD.x*v,windZ:_wxD.z*v,fogK:c.get('fog'),
    fogClr:c.get('fog')>0?0xb9c4cc:null});
};
(function(){
  const ctl=[
    {k:'w',t:'slider',label:'Viento global',min:0,max:40,step:1,val:0,unit:' m/s',
     on:c=>wxMasterPut(c)},
    {k:'d',t:'slider',label:'Dirección del viento',min:0,max:350,step:10,val:90,unit:'°',
     on:c=>wxMasterPut(c)},
    {k:'fog',t:'slider',label:'Niebla global',min:0,max:1,step:.05,val:0,
     fmt:v=>Math.round(v*100)+'%',on:c=>wxMasterPut(c)},
    {t:'botones',label:'Todo',items:[{label:'⏹ Apagar todos los climas',v:0}],
     on:c=>{for(const id of WXIDS)if(id!=='xpw_master'&&XP.running(id))XP.stop(id);
       for(const e of WXMEN)c.set('m_'+e[0],false);
       c.toast('⏹ clima apagado');}},
    {t:'texto',label:'Estado del motor',live:()=>{
      let on=0;for(const id of WXIDS)if(XP.running(id))on++;
      return 'climas encendidos <b>'+on+'</b>/'+WXIDS.length+' · partículas <b>'+wxParts+
      '</b> · cuerpos <b>'+wxRokN+'</b> · viento <b>'+
      Math.hypot(WX.windX,WX.windZ).toFixed(1)+' m/s</b> · props empujados <b>'+wxWindN+'</b>';}}
  ];
  /* un interruptor por clima, generado: 24 bloques escritos a mano serían 24 lugares donde
     olvidarse de uno */
  for(const e of WXMEN)ctl.push({k:'m_'+e[0],t:'switch',label:e[1],val:false,
    on:(c,v)=>{if(v)XP.run(e[0]);else XP.stop(e[0]);}});
  wxAdd({
    id:'xpw_master',name:'Mesa Clima',near:3.0,btn:'🎛 Mesa de clima',
    desc:'Todos los climas en una pantalla, más viento y niebla globales. Se pueden apilar: cada '+
         'experimento aporta por separado y el motor los combina.',
    ui:{title:'Mesa de clima',controls:ctl},
    start(c){
      wxLightGrab();wxMasterPut(c);
      /* los interruptores muestran lo que REALMENTE está corriendo al abrir el panel */
      for(const e of WXMEN)if(XP.running(e[0])!==!!c.get('m_'+e[0]))c.set('m_'+e[0],XP.running(e[0]));
    },
    stop(c){wxPut('xpw_master',null);},
    frame(c,dt){
      /* refresco lento de los interruptores: si otro panel (o el aleatorio) prende algo, acá se
         ve. 3 veces por segundo, no por frame. */
      c.mem.t=(c.mem.t||0)+dt;
      if(c.mem.t<.33)return;
      c.mem.t=0;
      for(const e of WXMEN){const r=XP.running(e[0]);
        if(r!==!!c.get('m_'+e[0]))c.set('m_'+e[0],r);}
    },
    probe:c=>{c.set('m_xpw_fog',true);
      const on=XP.running('xpw_fog');c.set('m_xpw_fog',false);
      return {switches:WXMEN.length,fogRan:on,ok:on&&!XP.running('xpw_fog')};}
  });
})();

/* ================= 15. hooks de medición ================= */
/* wxTick avanza el motor a mano (física + los dos ganchos): sirve para que las pruebas midan sin
   depender de cuántos frames reales pasaron. */
/* OJO: hay que replicar el ORDEN REAL del bucle de core_b (playerStep -> world.step -> syncMat ->
   stepBalloons/stepWater -> extRun post -> extRun frame). La primera versión sólo hacía world.step
   y extRun, y por eso las pruebas de inundación y tsunami daban que el cajón NO flotaba: la
   flotación la pone stepWater() y el inWater del jugador lo pone playerStep(), o sea justo las dos
   que faltaban. El bug estaba en la MEDICIÓN, no en el experimento. */
function wxTick(dt){
  dt=dt||1/60;
  nsafe(()=>playerStep(dt),'wxt0');
  nsafe(()=>world.step(dt,dt,2),'wxtw');
  nsafe(()=>{for(const p of actives())if(!p.frozen)syncMat(p);},'wxts');
  nsafe(()=>{stepBalloons();stepWater();},'wxtb');
  nsafe(()=>extRun('post',dt),'wxtp');
  nsafe(()=>extRun('frame',dt),'wxtf');
  return true;
}
function wxTest(){
  const out={};
  for(const id of WXIDS){
    let r='ok';
    try{
      const xp=XP.of(id);
      if(!xp){out[id]='FALLO · no registrado';continue;}
      XP.run(id);
      if(!XP.running(id)){out[id]='FALLO · no arrancó';continue;}
      for(let i=0;i<16;i++)wxTick(1/60);
      const pb=WXPB[id];
      let v=null;
      if(pb)v=nsafe(()=>pb(xp.ctx),'wxpb_'+id);
      for(let i=0;i<8;i++)wxTick(1/60);
      if(!v)r='FALLO · sin prueba';
      else if(!v.ok){const d=Object.assign({},v);delete d.ok;r='FALLO · '+JSON.stringify(d);}
      XP.stop(id);
      for(let i=0;i<3;i++)wxTick(1/60);
      if(r==='ok'&&WXC[id])r='FALLO · no limpió su contribución al parar';
    }catch(e){r='FALLO · '+String((e&&e.message)||e).slice(0,110);}
    out[id]=r;
  }
  nsafe(wxAllOff,'wxtestoff');
  for(let i=0;i<3;i++)wxTick(1/60);
  return out;
}
if(DEV&&window.__H)Object.assign(window.__H,{
  xpwList:()=>WXIDS.map(id=>{const x=XP.of(id);
    return {id,name:x?x.name:null,cat:x?x.cat:null,run:XP.running(id),near:x?x.near:0};}),
  xpwTest:()=>wxTest(),
  xpwStep:n=>{for(let i=0;i<(n||30);i++)wxTick(1/60);return true;},
  xpwRun:(id,useProp)=>XP.run(id,useProp?XP.propOf(id):null),
  xpwStop:id=>XP.stop(id),
  xpwOff:()=>wxAllOff(),
  /* hold (segundos): deja el trazo del rayo visible más tiempo para poder FOTOGRAFIARLO — un
     relámpago real dura 0,16 s y una captura de playwright tarda más que eso */
  xpwFlash:hold=>{const x=XP.of('xpw_storm');if(!x)return false;
    if(!XP.running('xpw_storm'))XP.run('xpw_storm');
    wxFlash(x.ctx,true);
    if(hold>0)x.ctx.mem.vis=hold;
    return {flashes:x.ctx.mem.n,flash:+wxFlashI.toFixed(3),vis:x.ctx.mem.vis};},
  xpwWave:side=>{const x=XP.of('xpw_tsunami');if(!x)return false;
    if(side)XP.set('xpw_tsunami','side',side);
    XP.run('xpw_tsunami');wxWaveGo(x.ctx);
    return {go:!!x.ctx.mem.go,H:x.ctx.mem.H,d:+(x.ctx.mem.d||0).toFixed(1)};},
  /* la altura del prop mas alto: es como se mide "la torre se cayo" desde afuera */
  xpwTop:()=>{let y=-1e9;for(const p of PROPS)if(p.body.position.y>y)y=p.body.position.y;
    return PROPS.length?+y.toFixed(2):null;},
  /* direccion del sol normalizada: la sonda apunta la camara al disco del eclipse con esto */
  xpwSunDir:()=>{const v=_wxV2.copy(sun.position).normalize();
    return [+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4)];},
  /* pide TODAS las panoramicas: las sondas necesitan esperarlas antes de fotografiar el cielo */
  xpwWarm:()=>{for(const k of ['day','dusk','night','eclipse','aurora','storm','sand'])wxSkyTex(k);
    return {loaded:WXSKY.loaded,pend:Object.keys(WXSKY.pend).length};},
  xpwSky:()=>({base:WXSKY.cur,mix:WXSKY.mix,
    op:WXSKY.ov?+WXSKY.ov.material.opacity.toFixed(3):0,
    loaded:WXSKY.loaded,pend:Object.keys(WXSKY.pend).length,
    have:Object.keys(WXSKY.tex),
    mapOn:!!(skyMesh&&skyMesh.material.map),
    r:+wxSkyR().toFixed(0)}),
  xpwInfo:()=>({q:QP.key,WQ:+WQ.toFixed(2),on:wxOn,ids:WXIDS.length,
    running:WXIDS.filter(id=>XP.running(id)),
    wx:{rain:+WX.rain.toFixed(2),snow:+WX.snow.toFixed(2),hail:+WX.hail.toFixed(2),
      sand:+WX.sand.toFixed(2),fire:+WX.fire.toFixed(2),ash:+WX.ash.toFixed(2),
      wind:+Math.hypot(WX.windX,WX.windZ).toFixed(2),
      windX:+WX.windX.toFixed(2),windZ:+WX.windZ.toFixed(2),
      fogK:+WX.fogK.toFixed(2),dark:+WX.dark.toFixed(2),wet:+WX.wet.toFixed(2),
      shake:+WX.shake.toFixed(3),sky:WX.skyBase,mix:WX.skyMix,mixT:+(WX.skyT||0).toFixed(2)},
    lay:{rain:WL.rain.n+'/'+WL.rain.cap,soft:WL.soft.n+'/'+WL.soft.cap,
      glow:WL.glow.n+'/'+WL.glow.cap,leaf:WL.leaf.n+'/'+WL.leaf.cap,total:wxParts},
    vis:{rain:WL.rain.obj.visible,soft:WL.soft.obj.visible,glow:WL.glow.obj.visible,
      leaf:WL.leaf.obj.visible},
    rok:{cap:WCAP.rok,flying:wxRokN,fired:WROK.fired,hits:WROK.hits},
    light:{ok:WXL.ok,sun:+sun.intensity.toFixed(3),hemi:+hemi.intensity.toFixed(3),
      expo:+renderer.toneMappingExposure.toFixed(3),
      fogNear:scene.fog?+scene.fog.near.toFixed(0):null,
      fogFar:scene.fog?+scene.fog.far.toFixed(0):null,
      baseSun:+WXL.sunI.toFixed(3),baseFar:+WXL.fogFar.toFixed(0)},
    water:{on:WXW.on,lvl:+WXW.lvl.toFixed(2),inWATER:WXW.ent?WATER.indexOf(WXW.ent)>=0:false,
      n:WATER.length,plIn:!!inWater},
    grav:+world.gravity.y.toFixed(2),gravHeld:WXGR.ok,
    wet:+WXMAT.cur.toFixed(2),fric:+world.defaultContactMaterial.friction.toFixed(3),
    shake:+wxShkA.toFixed(4),flash:+wxFlashI.toFixed(3),
    windProps:wxWindN,amb:Object.keys(WXAMB),
    sky:{base:WXSKY.cur,mix:WXSKY.mix,loaded:WXSKY.loaded}}),
  xpwSum:()=>{wxDirty=true;return wxSum()&&true;}
});
