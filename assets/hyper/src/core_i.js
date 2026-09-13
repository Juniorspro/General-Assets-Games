/* ============================================================
   SUX SANDBOX — CAPA DE ICONOS GENERADOS  (body.gicons)
   ------------------------------------------------------------
   Todos los controles del juego (HUD, palanca, botones del vehículo, pestañas y
   herramientas del menú de spawn) muestran IMÁGENES generadas, no emojis.

   CÓMO ESTÁ ARMADO — el mismo patrón que ya funciona en Drift Yard (body.uipng):
     1. el HTML trae el emoji adentro de <i class="ic ic-x">…</i>  (respaldo visible)
     2. acá se precargan TODAS las imágenes que el CSS va a pedir
     3. sólo cuando cargaron TODAS se agrega  document.body.classList.add('gicons'),
        que enciende la capa de background-image y apaga el emoji (font-size:0)
   Si una sola falla (sin conexión, CDN caída, 404) la clase no se agrega nunca y el
   juego queda con los emojis: NUNCA un botón vacío.

   Las URL no pueden estar en el CSS porque BASE lleva el hash del CDN, así que se
   publican como variables --u-<archivo> sobre :root y el CSS las consume con var().

   POR QUÉ ESTE ARCHIVO ENVUELVE FUNCIONES DE core_b:
   buildTabs()/buildGrid() rearman el menú de spawn con emojis cada vez que se cambia
   de pestaña o de idioma. En vez de duplicar esas funciones (200 líneas de miniaturas
   y eventos) se las envuelve: corre la original y después se decoran los <i>. Igual
   con los botones del HUD, que core_d.js reescribe con textContent='' cuando le llega
   su <img>: un MutationObserver repone el <i> si se lo llevaron.

   ELECCIÓN DE ICONOS: se prefirió SIEMPRE el icono que dice lo que hace el botón. Por
   eso bCam usa la cámara (ic-cam) y no la puerta de auto, bRel el círculo de recarga
   (ic-reload) y no el chevrón de freno, y bAim la mira (ic-scope) y no la mano: los
   iconos de vidrio de auto (puerta, freno de mano, base y perilla de palanca) se
   usan donde SÍ corresponden — la palanca y los dos botones de manejar de core_e.
   ============================================================ */

/* botón del HUD -> archivo (todos existen en <BASE>ui/) */
const GIC_HUD={bPause:'ic-pause',bChat:'ic-chat',bTools:'ic-tool',bRag:'ic-rag',
  bCam:'ic-cam',bAim:'ic-scope',bRel:'ic-reload',bFire:'ic-fire',bFrz:'ic-freeze',
  bJump:'ic-jump',bTrash:'ic-trash'};
/* emoji de respaldo por botón: si core_d.js ya vació el botón hay que reponerlo */
const GIC_EM={bPause:'⏸',bChat:'💬',bTools:'🔧',bRag:'🧍',bCam:'📷',bAim:'◎',bRel:'↻',
  bFire:'✥',bFrz:'❄',bJump:'⬆',bTrash:'🗑'};
/* pestañas del menú de spawn (data-tab) — 'veh' se queda con 🚗: no hay icono de auto */
const GIC_TAB={acc:'ic-crate',ent:'ic-spawn',arm:'ic-phys',tool:'ic-tool'};
/* herramientas (data-tool) — globo, propulsor y descongelar se quedan con su emoji */
const GIC_TOOL={physgun:'ic-phys',weld:'ic-weld',remove:'ic-trash',dup:'ic-spawn',
  freeze:'ic-freeze'};
/* las que el CSS pide por id y no por clase */
const GIC_CSS=['joybase','joyknob','door','hand'];

const GIC_ALL=Object.keys(GIC_HUD).map(k=>GIC_HUD[k])
  .concat(Object.keys(GIC_TAB).map(k=>GIC_TAB[k]))
  .concat(Object.keys(GIC_TOOL).map(k=>GIC_TOOL[k]))
  .concat(GIC_CSS)
  .filter((n,i,a)=>a.indexOf(n)===i);

let gicOn=false,gicOk=0;const gicBad=[];

/* --- las URL, como variables CSS sobre :root --- */
function gicVars(){
  const r=document.documentElement;
  for(const n of GIC_ALL)r.style.setProperty('--u-'+n,'url("'+BASE+'ui/'+n+'.webp")');
}

/* --- repone/marca el <i class="ic …"> de un control --- */
function gicFix(el,name,em){
  if(!el)return null;
  let i=el.querySelector('i.ic');
  if(!i){i=document.createElement('i');i.textContent=em||'';el.appendChild(i);}
  i.className='ic '+name;
  return i;
}
function gicHud(){ for(const id in GIC_HUD)gicFix($(id),GIC_HUD[id],GIC_EM[id]); }

/* core_d.js hace el.textContent='' cuando le llega su <img>, y eso se lleva el <i>.
   El observador lo repone: los dos iconos son el mismo dibujo, y el CSS esconde el
   <img> mientras gicons esté puesto, así que no se ve nada duplicado. */
function gicWatch(){
  if(typeof MutationObserver!=='function')return;
  const ob=new MutationObserver(ms=>{
    for(const m of ms){const el=m.target,n=GIC_HUD[el.id];
      if(n&&!el.querySelector('i.ic'))gicFix(el,n,GIC_EM[el.id]);}
  });
  for(const id in GIC_HUD){const e=$(id);if(e)ob.observe(e,{childList:true});}
}

/* --- menú de spawn --- */
function gicTabs(){
  const t=document.querySelectorAll('#sptabs .sptab');
  for(let k=0;k<t.length;k++){
    const b=t[k],n=GIC_TAB[b.dataset.tab];if(!n)continue;
    const i=b.querySelector('i');if(i)i.className='ic '+n;
  }
}
function gicGrid(){
  const p=document.querySelectorAll('#spgrid .pit[data-tool]');
  for(let k=0;k<p.length;k++){
    const b=p[k],n=GIC_TOOL[b.dataset.tool];
    if(!n||b.querySelector('i.ic'))continue;
    const i=document.createElement('i');i.className='ic '+n;
    const cv=b.querySelector('canvas');
    if(cv)b.replaceChild(i,cv);else b.insertBefore(i,b.firstChild);
  }
}
/* envolver las dos de core_b (mismo módulo: se pueden reasignar) */
const _gicTabs=buildTabs,_gicGrid=buildGrid;
buildTabs=function(){const r=_gicTabs.apply(this,arguments);
  if(gicOn){try{gicTabs();}catch(e){}}return r;};
buildGrid=function(){const r=_gicGrid.apply(this,arguments);
  if(gicOn){try{gicGrid();}catch(e){}}return r;};

/* --- encender la capa --- */
function gicEnable(){
  if(gicOn)return;
  gicOn=true;gicVars();
  document.body.classList.add('gicons');
  try{gicHud();gicWatch();}catch(e){}
  try{gicTabs();gicGrid();}catch(e){}
}
(function gicPreload(){
  gicVars();                                  // inofensivo: el CSS recién las usa con .gicons
  if(!okUrl(BASE)){gicBad.push('BASE');return;}
  for(const n of GIC_ALL){
    const im=new Image();im.decoding='async';im.alt='';
    im.onload=()=>{ if(++gicOk===GIC_ALL.length)gicEnable(); };
    im.onerror=()=>{ gicBad.push(n); };       // falta una => se queda el emoji
    im.src=BASE+'ui/'+n+'.webp';
  }
})();

if(DEV&&window.__H)Object.assign(window.__H,{
  /* estado de la capa de iconos + qué controles quedaron con imagen de verdad */
  gicons:()=>{
    const bg=el=>el?getComputedStyle(el).backgroundImage:'none';
    const has=s=>{const b=bg(s);return !!b&&b!=='none'&&b.indexOf('url')===0;};
    return{on:document.body.classList.contains('gicons'),
      ok:gicOk,total:GIC_ALL.length,bad:gicBad.slice(),
      hud:Object.keys(GIC_HUD).filter(id=>{const e=$(id);
        return !!e&&has(e.querySelector('i.ic'));}),
      emoji:Object.keys(GIC_HUD).filter(id=>{const e=$(id);
        return !!e&&!has(e.querySelector('i.ic'));}),
      stick:has($('stick')),knob:has($('knob')),
      veh:has($('bVeh')),brake:has($('bBrake')),
      tabs:[].slice.call(document.querySelectorAll('#sptabs .sptab')).map(b=>
        b.dataset.tab+(has(b.querySelector('i'))?':img':':emoji')),
      tools:[].slice.call(document.querySelectorAll('#spgrid .pit[data-tool]')).map(b=>
        b.dataset.tool+(has(b.querySelector('i.ic'))?':img':':emoji'))};
  },
  gicNames:()=>GIC_ALL.slice()
});
