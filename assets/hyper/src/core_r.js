/* ============================================================
   SUX SANDBOX — core_r: MENÚ DE SPAWN SIN SCROLL Y MÁS RÁPIDO
   ------------------------------------------------------------
   Dos problemas que resuelve este archivo:

   1) NAVEGAR OBLIGABA A DESLIZAR. #sptabs era una fila con overflow-x:auto y #spfold una
      columna con overflow-y:auto: con 5 pestañas y 8+ carpetas (y más si mañana se agregan
      secciones) había que arrastrar para llegar a "Entidades" o a la última carpeta.
      Solución: las pestañas envuelven (flex-wrap, en head.html) y acá se MIDE su alto real
      para bajar el techo de #spbody; y la columna de carpetas pasa a ser una grilla cuyo
      número de columnas y alto de fila se CALCULAN para que las N carpetas entren justas.
      Nada de overflow:auto en las dos listas de navegación => scrollHeight == clientHeight.
      (#spgrid, la grilla de items, SÍ sigue deslizando: 112 pirotecnias no entran en 430 px
      sin volverlas ilegibles, y ahí deslizar es lo normal — es la lista de contenido.)

   2) ABRIR UNA CARPETA GRANDE ERA CARÍSIMO. buildGrid() hacía innerHTML='' (destruía y
      recreaba 112 botones + 112 canvas en cada cambio de pestaña) y encolaba las 112
      miniaturas 3D, que se dibujaban a UNA POR FRAME: la carpeta Pirotecnia tardaba >7 s
      en terminar de pintarse y se recalculaba entera cada vez que se volvía a entrar.
      Solución: pool de botones reutilizados (cero DOM nuevo al cambiar de pestaña), caché
      de la miniatura ya renderizada (canvas 128x96 por prop id, se copia con drawImage:
      cero render 3D) y encolado SÓLO de los items visibles por índice + un listener de
      scroll con rAF. Además stepThumbs() dibuja varias por frame con presupuesto de ms.

   REGLA DEL MOTOR: este es el último core alfabéticamente, así que todo lo que toca de
   core_a/core_b/core_i se REASIGNA (jamás se re-declara).
   ============================================================ */

/* ---------- estado propio ---------- */
const SPTC=new Map();          /* id de prop -> canvas 128x96 ya renderizado (caché) */
const SPTMAX=340;              /* techo de la caché: 340 * 48 kB ≈ 16 MB, y hay 398 props */
const SPPOOL=[];               /* botones .pit reutilizables (nunca se recrean) */
let spKey=null;                /* qué sección está realmente montada en el DOM */
let spLastMs=0;                /* ms del último buildGrid (para __H.spawnOpenMs) */
let spRaf=0,spFitPend=0;
const SPCFG={rowMin:23,rowMax:40,colMax:3,colW:104,budget:5,perFrame:8};

/* ---------- 1) AJUSTE DE LAYOUT (sin scroll en pestañas ni carpetas) ---------- */
/* EL BUG DEL TELÉFONO VERTICAL (menú "vacío"): acá se medía con window.innerWidth/innerHeight
   y getBoundingClientRect(). Los dos hablan en coordenadas del VIEWPORT REAL, pero
   body.style.top/bottom se aplican en el layout INTERNO de #stage, y cuando el teléfono está
   vertical core_a rota el escenario 90° (width=innerHeight, transform:rotate(90deg)): la fila
   de pestañas, vista desde el viewport real, pasa a ser una tira VERTICAL cuyo rect "bottom"
   es el ANCHO del juego (~900), no su alto (~412). El panel quedaba en top:920px/bottom:916px
   dentro de un escenario de 412 px => carpetas y grilla enteras fuera de pantalla, que es
   exactamente el "no aparecen los props" del celular. En un chromium horizontal viewport y
   escenario coinciden y el bug no se ve.
   Solución de RAÍZ: medir TODO en el espacio de layout del escenario, que no se entera de la
   rotación: clientWidth/clientHeight del propio #stage (core_a le fija el tamaño en px) y
   offsetTop/offsetHeight (offsets del árbol, inmunes a transform) en vez de rects de viewport.
   La detección de miniaturas visibles (spVisRange) ya era por scrollTop/offsetWidth —también
   layout puro— así que con el panel bien ubicado funciona igual en las dos orientaciones. */
function spFitLayout(){
  const sp=$('spawn'),tabs=$('sptabs'),body=$('spbody'),fold=$('spfold'),foot=$('spfoot');
  if(!sp||!tabs||!body||!fold)return null;
  /* con el menú cerrado (display:none) offsets y alturas son 0: medir ahí no sirve de nada */
  if(!sp.classList.contains('on'))return null;
  /* tamaño del ESCENARIO (no del viewport): vertical => W es el lado largo del teléfono */
  const st=$('stage');
  const W=st?st.clientWidth:window.innerWidth,H=st?st.clientHeight:window.innerHeight;
  /* modo compacto: en 780x360 el tamaño normal no deja lugar para 8 carpetas legibles */
  sp.classList.toggle('cmp',H<400||W<820);
  const gap=Math.max(4,Math.round(H*.012));
  /* el panel arranca DEBAJO de la fila (o filas) de pestañas, medidas de verdad.
     #sptabs y #spfoot son hijos absolutos de #spawn (inset:0 => su 0,0 es el del escenario):
     offsetTop/offsetHeight ya vienen en píxeles de layout del escenario, gire o no gire. */
  body.style.top=Math.round(tabs.offsetTop+tabs.offsetHeight+gap)+'px';
  if(foot&&foot.offsetHeight){
    body.style.bottom=Math.round(H-foot.offsetTop+Math.round(gap*.6))+'px';}
  /* --- carpetas: columnas y alto de fila calculados para que entren TODAS --- */
  const kids=fold.children,n=kids.length;
  if(n){
    const avail=body.clientHeight;              /* alto útil real del panel */
    let cols=1;
    while(cols<SPCFG.colMax&&avail/Math.ceil(n/cols)<SPCFG.rowMin)cols++;
    const rows=Math.ceil(n/cols);
    /* floor: rows*row <= avail siempre, así scrollHeight nunca supera clientHeight */
    const row=Math.max(16,Math.min(SPCFG.rowMax,Math.floor(avail/rows)));
    fold.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';
    fold.style.gridAutoRows=row+'px';
    fold.style.width=(cols>1?Math.min(232,cols*SPCFG.colW):136)+'px';
    /* la fuente va en cada botón: .fold usa la forma corta font:800 13px, que gana a
       cualquier font-size heredado del contenedor */
    const fs=row<25?10:row<30?11:row<35?12:13;
    for(let i=0;i<n;i++)kids[i].style.fontSize=fs+'px';
  }
  /* --- grilla: el "casi entra" se arregla achicando la miniatura, no scrolleando ---
     PORQUE: en el teléfono vertical el escenario mide ~412 de alto (contra 430 del chromium
     horizontal de las sondas) y las 4 filas de la carpeta por defecto quedaban a 8px de
     entrar: se veía la 4ª fila cortada, que parece rota aunque el scroll funcione. Se baja
     --pitH (altura del canvas de la miniatura, ver head.html) de a un escalón hasta que el
     contenido entre. Una carpeta grande (Pirotecnia: 112 props) no entra ni achicando: se
     restaura la altura por defecto y scrollea, que para eso #spgrid tiene overflow-y. */
  const grid=$('spgrid');
  if(grid){
    grid.style.removeProperty('--pitH');
    if(grid.children.length&&grid.scrollHeight>grid.clientHeight){
      let fit=false;
      for(const h of [47,44,41,38]){
        grid.style.setProperty('--pitH',h+'px');
        if(grid.scrollHeight<=grid.clientHeight){fit=true;break;}
      }
      if(!fit)grid.style.removeProperty('--pitH');
    }
  }
  return true;
}
/* si cambia el tamaño de la ventana con el menú abierto hay que recalcular */
window.addEventListener('resize',()=>{ if(spFitPend)return; spFitPend=1;
  setTimeout(()=>{spFitPend=0;nsafe(spFitLayout,'spfit-rz');nsafe(spQueueVis,'spvis-rz');},80); });

/* ---------- 2) MINIATURAS: caché + presupuesto por frame ---------- */
function spBlit(cv,c){
  if(cv.width!==128)cv.width=128;
  if(cv.height!==96)cv.height=96;
  const x=cv.getContext('2d');x.clearRect(0,0,128,96);x.drawImage(c,0,0);
}
/* renderiza (una sola vez en la vida) la miniatura 3D de un prop y la guarda */
function spCache(def){
  let c=SPTC.get(def.id);
  if(c)return c;
  c=document.createElement('canvas');c.width=128;c.height=96;
  if(!nsafe(()=>drawThumb(def,c),'spthumb'))return null;
  SPTC.set(def.id,c);
  /* FIFO: el primero que entró es el que se va; con 340 entradas nunca se llega jugando */
  if(SPTC.size>SPTMAX)SPTC.delete(SPTC.keys().next().value);
  return c;
}
/* REASIGNA core_a.queueThumb: si ya está en caché se copia al instante (0 render 3D) */
queueThumb=function(def,cv){
  if(!def||!cv||cv._q)return;
  const c=SPTC.get(def.id);
  if(c){spBlit(cv,c);cv._tid=def.id;return;}
  cv._q=1;thumbQ.push({def,cv});
};
/* REASIGNA core_a.stepThumbs: varias miniaturas por frame pero con presupuesto de ms,
   así la grilla se llena en 3-4 frames sin tirones (nada por frame sin medir el tiempo) */
stepThumbs=function(){
  if(!thumbQ.length)return;
  const t0=performance.now();
  for(let n=0;n<SPCFG.perFrame&&thumbQ.length;n++){
    const it=thumbQ.shift();it.cv._q=0;
    const c=spCache(it.def);
    if(c){spBlit(it.cv,c);it.cv._tid=it.def.id;}
    if(performance.now()-t0>SPCFG.budget)break;
  }
};

/* ---------- 3) GRILLA: pool de nodos + encolado por índice visible ---------- */
function spMakePit(){
  const b=document.createElement('button');b.className='pit';
  const cv=document.createElement('canvas');cv.width=128;cv.height=96;
  const s=document.createElement('span');
  b.appendChild(cv);b.appendChild(s);
  b._cv=cv;b._lb=s;b._pid=null;
  /* un único listener por botón para toda la vida: lee el prop actual del nodo */
  b.addEventListener('click',()=>nsafe(()=>{if(b._pid)spawnAhead(b._pid);},'spit'));
  return b;
}
/* rango de items visibles calculado por índice (no hace falta IntersectionObserver:
   la grilla es uniforme, así que con scrollTop y el tamaño de celda alcanza y sobra) */
function spVisRange(g){
  const n=g.children.length;if(!n)return null;
  const b0=g.children[0];
  const cw=b0.offsetWidth+5,ch=b0.offsetHeight+5;      /* +5 = el gap del CSS */
  if(cw<10||ch<10)return{a:0,b:Math.min(n,40)};        /* sin layout todavía: primeros 40 */
  const per=Math.max(1,Math.floor((g.clientWidth-10)/cw));
  const a=Math.max(0,Math.floor((g.scrollTop-ch)/ch))*per;          /* una fila de colchón */
  const b=Math.min(n,Math.ceil((g.scrollTop+g.clientHeight+ch)/ch)*per);
  return{a,b};
}
function spQueueVis(){
  const g=$('spgrid');
  if(!g||spKey===null)return 0;
  const r=spVisRange(g);if(!r)return 0;
  let k=0;
  for(let i=r.a;i<r.b;i++){
    const b=g.children[i];if(!b||!b._pid)continue;
    if(b._cv._tid===b._pid)continue;                   /* ya dibujada */
    const d=PDEF[b._pid];if(!d)continue;
    queueThumb(d,b._cv);k++;
  }
  return k;
}
/* REASIGNA buildGrid (la de core_i, que ya envuelve la de core_b para los iconos de
   herramientas): sólo cambia el camino de props; Armas y Herramientas siguen igual
   porque son 15 y 8 items y ahí no hay nada que optimizar. */
const _rGrid=buildGrid;
buildGrid=function(){
  const g=$('spgrid');
  if(!g)return;
  if(spTab==='arm'||spTab==='tool'){ spKey=null; return _rGrid.apply(this,arguments); }
  const sec=SECTS.find(s=>s.id===spFold);
  if(!sec){ g.replaceChildren();spKey=null;return; }
  const t0=performance.now();
  /* la cola vieja apuntaba a canvas de otra carpeta: se descarta y se limpian las marcas */
  for(const it of thumbQ)it.cv._q=0;
  thumbQ.length=0;
  const props=sec.props,N=props.length;
  while(SPPOOL.length<N)SPPOOL.push(spMakePit());
  const nodes=[];
  for(let i=0;i<N;i++){
    const b=SPPOOL[i],p=props[i];
    if(b._pid!==p.id){                                 /* recién ahí vale tocar el nodo */
      b._pid=p.id;b.dataset.prop=p.id;b._lb.textContent=p.name;
      const c=SPTC.get(p.id);
      if(c){spBlit(b._cv,c);b._cv._tid=p.id;}
      else if(b._cv._tid!==null){b._cv.getContext('2d').clearRect(0,0,b._cv.width,b._cv.height);
        b._cv._tid=null;}
    }
    nodes.push(b);
  }
  /* si la sección montada ya es esta, NO se toca el DOM (volver de otra pestaña es gratis) */
  if(spKey!==sec.id){ g.replaceChildren.apply(g,nodes); g.scrollTop=0; spKey=sec.id; }
  nsafe(spQueueVis,'spvis');
  spLastMs=+(performance.now()-t0).toFixed(2);
};
/* el scroll de la grilla encola lo que va entrando, throttleado a un rAF */
(function spBindScroll(){
  const g=$('spgrid');if(!g)return;
  g.addEventListener('scroll',()=>{ if(spRaf)return;
    spRaf=requestAnimationFrame(()=>{spRaf=0;nsafe(spQueueVis,'spvis-sc');}); },{passive:true});
})();

/* ---------- 4) CARPETAS: mismo aspecto, con el nombre en un hijo para el ellipsis ---------- */
const _rFold=buildFolders;
buildFolders=function(){
  const f=$('spfold');
  if(!f)return _rFold.apply(this,arguments);
  f.replaceChildren();
  const list=foldersFor(spTab);
  if(!spFold&&list.length)spFold=list[0].id;
  for(const s of list){
    const b=document.createElement('button');b.className='fold'+(s.id===spFold?' on':'');
    const l=document.createElement('span');l.className='fl';l.textContent=s.name;
    b.appendChild(l);b.dataset.fold=s.id;b.title=s.name;
    b.addEventListener('click',()=>nsafe(()=>{spFold=s.id;buildFolders();},'spfd'));
    f.appendChild(b);
  }
  buildGrid();
  nsafe(spFitLayout,'spfit-fd');
  nsafe(spQueueVis,'spvis-fd');
};
/* las pestañas pueden pasar a dos filas al cambiar de idioma: re-medir el techo del panel */
const _rTabs=buildTabs;
buildTabs=function(){ const r=_rTabs.apply(this,arguments); nsafe(spFitLayout,'spfit-tb'); return r; };
/* abrir el menú: primero arma (core_o ya envuelve openSpawn para el sonido), después ajusta */
const _rOpen=openSpawn;
openSpawn=function(tab){
  const r=_rOpen.apply(this,arguments);
  nsafe(spFitLayout,'spfit-op');
  nsafe(spQueueVis,'spvis-op');
  return r;
};

/* ---------- hooks de medición ---------- */
if(typeof DEV!=='undefined'&&DEV&&window.__H)Object.assign(window.__H,{
  /* [{id,scrollH,clientH,overflow,...}] — overflow true = hay que deslizar.
     OJO: w/h/top/bot van en píxeles de LAYOUT del escenario (offsets acumulados), no en
     rect de viewport: con el teléfono vertical el rect real está rotado y esos números
     mentían (el "alto" del panel era su ancho). Así la sonda mide lo mismo en las dos
     orientaciones y top/bot se comparan contra el alto del escenario, no del viewport. */
  spawnFit:()=>['sptabs','spfold','spgrid'].map(id=>{
    const e=$(id);if(!e)return{id,miss:true};
    let top=0;for(let o=e;o;o=o.offsetParent)top+=o.offsetTop;
    return{id,scrollH:e.scrollHeight,clientH:e.clientHeight,
      scrollW:e.scrollWidth,clientW:e.clientWidth,
      overflow:e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1,
      n:e.children.length,w:e.offsetWidth,h:e.offsetHeight,
      top,bot:top+e.offsetHeight};
  }),
  /* mide abrir una carpeta (por defecto Pirotecnia): ms de armado + estado de la caché */
  spawnOpenMs:f=>{
    const id=f||'fw',sec=SECTS.find(s=>s.id===id);
    closeSpawn();
    if(sec){spTab=sec.tab;spFold=null;}
    openSpawn(sec?sec.tab:undefined);
    const t0=performance.now();
    if(sec){spFold=sec.id;buildFolders();}
    const ms=+(performance.now()-t0).toFixed(2);
    const g=$('spgrid');
    return{ms,build:spLastMs,items:g?g.children.length:0,queued:thumbQ.length,cached:SPTC.size};
  },
  /* estado de la optimización: cuántos nodos hay en el pool y cuántas miniaturas cacheadas */
  spawnPerf:()=>({pool:SPPOOL.length,cached:SPTC.size,queued:thumbQ.length,mounted:spKey,
    drawn:[].slice.call(($('spgrid')||{children:[]}).children).filter(b=>b._cv&&b._cv._tid).length,
    lastMs:spLastMs,cmp:$('spawn')?$('spawn').classList.contains('cmp'):false}),
  spawnFitApply:()=>!!nsafe(spFitLayout,'spfit-h'),
  spawnVis:()=>nsafe(spQueueVis,'spvis-h')
});
