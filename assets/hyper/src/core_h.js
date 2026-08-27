/* ============================================================
   SUX SANDBOX — CONTROLES A GUSTO + BRAZOS EN 1ª PERSONA
   ------------------------------------------------------------
   1) EDITOR DE CONTROLES: en Ajustes se puede mover cada botón con el dedo y cambiarles el
      tamaño con una barra. Queda guardado en la partida (SV.hud) y se aplica al arrancar.
   2) BRAZOS Y PIERNAS EN 1ª PERSONA: el personaje se dibuja igual y lo único que se saca es la
      CABEZA, con un PLANO DE RECORTE sobre el material del personaje. Es lo único que funciona
      con esta malla: colapsar el hueso de la cabeza estira los vértices con peso repartido y
      deja astillas negras, y recortar el plano cercano de la CÁMARA corta también el arma.
      El plano va sólo en el material del personaje, así el arma (material propio) queda intacta,
      y como recorta por fragmento no hay geometría estirada. Además arregla lo que se veía al
      CORRER: la cabeza se metía en la pantalla porque el cuerpo se adelanta con la zancada.
   3) ARRASTRAR SOBRE EL BOTÓN DE DISPARO GIRA LA CÁMARA: los botones marcados con la clase
      `look` no cortan el evento, así que el mismo dedo que dispara puede mover la vista
      (es lo normal en cualquier shooter de celular).
   ============================================================ */

/* ---------- 1. editor de controles ---------- */
const HUDIDS=['bPause','bChat','bTools','bRag','bCam','bAim','bRel','bFire','bFrz','bJump',
  'bTrash','stick','wslot','hp'];
if(!SV.hud)SV.hud={k:1,pos:{}};
if(SV.hud.k==null)SV.hud.k=1;
if(!SV.hud.pos)SV.hud.pos={};
let hudEdit=false;

function hudApply(){
  const k=SV.hud.k||1;
  for(const id of HUDIDS){
    const e=document.getElementById(id); if(!e)continue;
    const p=SV.hud.pos[id];
    if(p){ e.style.left=p[0]+'%'; e.style.top=p[1]+'%';
      e.style.right='auto'; e.style.bottom='auto';
      e.style.transform=(id==='bTrash'?'translateX(-50%) ':'')+'scale('+k+')'; }
    else e.style.transform=(id==='bTrash'?'translateX(-50%) ':'')
      +(id==='fps'?'':'scale('+k+')');
    e.style.transformOrigin='center center';
  }
}
/* dónde está cada control ahora, en % del escenario (para arrancar a moverlo desde ahí) */
function hudPct(e){
  const st=document.getElementById('stage')||document.body;
  const rs=st.getBoundingClientRect(), r=e.getBoundingClientRect();
  return [+(((r.left-rs.left)/rs.width)*100).toFixed(2),
          +(((r.top-rs.top)/rs.height)*100).toFixed(2)];
}
/* ---- arrastre de cada control en modo edición ---- */
const HUDDRAG={};
function hudBind(e){
  if(HUDDRAG[e.id])return; HUDDRAG[e.id]=1;
  let on=false,ox=0,oy=0,sx=0,sy=0;
  const st=()=>document.getElementById('stage')||document.body;
  const down=(x,y)=>{ if(!hudEdit)return;
    on=true; const p=SV.hud.pos[e.id]||hudPct(e);
    SV.hud.pos[e.id]=p; ox=p[0]; oy=p[1];
    const d=dStage(0,0); sx=x; sy=y; e.classList.add('hedon'); };
  const move=(x,y)=>{ if(!on)return;
    const r=st().getBoundingClientRect();
    /* el escenario está rotado 90°, así que el movimiento del dedo se pasa por dStage */
    const d=dStage(x-sx,y-sy);
    SV.hud.pos[e.id]=[clamp(ox+d.x/r.width*100,0,96),clamp(oy+d.y/r.height*100,0,94)];
    hudApply(); };
  const up=()=>{ if(!on)return; on=false; e.classList.remove('hedon'); save(); };
  e.addEventListener('touchstart',ev=>{ if(!hudEdit)return; ev.preventDefault();ev.stopPropagation();
    const t=ev.changedTouches[0]; down(t.clientX,t.clientY); },{passive:false});
  e.addEventListener('touchmove',ev=>{ if(!on)return; ev.preventDefault();
    const t=ev.changedTouches[0]; move(t.clientX,t.clientY); },{passive:false});
  e.addEventListener('touchend',up); e.addEventListener('touchcancel',up);
  e.addEventListener('mousedown',ev=>{ if(!hudEdit)return; ev.preventDefault();ev.stopPropagation();
    down(ev.clientX,ev.clientY);
    const mm=ev2=>move(ev2.clientX,ev2.clientY);
    const mu=()=>{up();removeEventListener('mousemove',mm);removeEventListener('mouseup',mu);};
    addEventListener('mousemove',mm); addEventListener('mouseup',mu); });
}
function hudEditMode(on){
  hudEdit=!!on;
  document.body.classList.toggle('hedit',hudEdit);
  for(const id of HUDIDS){ const e=document.getElementById(id); if(e)hudBind(e); }
  const b=document.getElementById('hedBar'); if(b)b.classList.toggle('hide',!hudEdit);
  if(hudEdit){ /* la UI del juego tiene que estar a la vista para poder acomodarla */
    const h=document.getElementById('hud'); if(h)h.classList.add('on'); }
  else save();
}
/* ---- lo que se agrega a la pantalla de Ajustes ---- */
(function(){
  const card=document.getElementById('optcard'); if(!card)return;
  const css=document.createElement('style');
  css.textContent=
   '.hedit .rb,.hedit #stick,.hedit #wslot,.hedit #hp{outline:2px dashed var(--acc);'+
   '  outline-offset:2px;pointer-events:auto!important}'+
   '.hedit #hud{pointer-events:auto}'+
   '.hedon{outline-color:var(--acc2)!important;filter:brightness(1.25)}'+
   '#hedBar{position:fixed;left:50%;bottom:2vmin;transform:translateX(-50%);z-index:25;'+
   '  display:flex;gap:8px;align-items:center;background:rgba(10,14,20,.9);padding:8px 12px;'+
   '  border-radius:12px;border:1px solid rgba(108,196,255,.45);pointer-events:auto}'+
   '#hedBar button{border:0;border-radius:8px;padding:8px 12px;font:800 13px inherit;'+
   '  background:#232c38;color:var(--ink)}'+
   '#hedBar button.go{background:linear-gradient(180deg,#ffc24d,#f59a17);color:#20160a}'+
   '#hedBar span{font:800 12px inherit;color:var(--dim)}'+
   '#hedBar input{width:32vmin;max-width:160px}';
  document.head.appendChild(css);

  const row=document.createElement('div');
  row.style.marginTop='8px';
  row.innerHTML=
   '<div style="display:flex;align-items:center;gap:8px;margin:6px 0">'+
   '<span id="oHudKL" style="flex:none;font:700 12.5px inherit;color:var(--dim)">Tamaño de botones</span>'+
   '<input type="range" id="oHudK" min="0.7" max="1.6" step="0.05" style="flex:1">'+
   '<b id="oHudKV" style="flex:none;font:800 12px inherit">100%</b></div>'+
   '<button class="btn" id="oHudMove"><span id="oHudMoveL">✋ Mover los controles</span>'+
   '<small id="oHudMoveS">Arrastrá cada botón a donde te quede cómodo</small></button>';
  card.appendChild(row);

  const bar=document.createElement('div');
  bar.id='hedBar'; bar.className='hide';
  bar.innerHTML='<span id="hedTxt">Arrastrá los controles</span>'+
    '<button id="hedReset">Volver al original</button>'+
    '<button class="go" id="hedOk">Listo</button>';
  (document.getElementById('stage')||document.body).appendChild(bar);

  const sl=document.getElementById('oHudK'), sv=document.getElementById('oHudKV');
  sl.value=SV.hud.k;
  sv.textContent=Math.round(SV.hud.k*100)+'%';
  sl.addEventListener('input',()=>{ SV.hud.k=+sl.value;
    sv.textContent=Math.round(SV.hud.k*100)+'%'; hudApply(); });
  sl.addEventListener('change',()=>save());
  document.getElementById('oHudMove').addEventListener('click',()=>{
    const o=document.getElementById('opts'); if(o)o.classList.remove('on');
    hudEditMode(true); });
  document.getElementById('hedOk').addEventListener('click',()=>hudEditMode(false));
  document.getElementById('hedReset').addEventListener('click',()=>{
    SV.hud.pos={}; SV.hud.k=1; sl.value=1; sv.textContent='100%';
    for(const id of HUDIDS){ const e=document.getElementById(id);
      if(e){e.style.left=e.style.top=e.style.right=e.style.bottom=''; e.style.transform='';} }
    hudApply(); save(); });
  hudApply();
})();

/* (la cabeza en 1ª persona la maneja fpHead() en core_c: es la forma de la versión que
   el usuario mandó, y con ella las manos quedan bien sobre el arma) */

/* ---------- 3. arrastrar sobre los botones de acción mueve la cámara ---------- */
(function(){
  for(const id of ['bFire','bAim']){ const e=document.getElementById(id); if(e)e.classList.add('look'); }
})();

if(DEV&&window.__H)Object.assign(window.__H,{
  hud:(k)=>{ if(k!=null){SV.hud.k=k;hudApply();} return {k:SV.hud.k,pos:SV.hud.pos}; },
  hudEdit:v=>{ if(v!==undefined)hudEditMode(v); return hudEdit; },
  hudMove:(id,x,y)=>{ SV.hud.pos[id]=[x,y]; hudApply();
    const e=document.getElementById(id); return e?hudPct(e):null; },
  fpHead:()=>{const b=bones.head;return b?+b.scale.x.toFixed(4):null;}});
