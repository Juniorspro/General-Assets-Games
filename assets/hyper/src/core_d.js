/* ============================================================
   HYPER SANDBOX — ICONOS DE LOS CONTROLES
   Los botones del HUD arrancan con un emoji (así el juego se ve completo incluso
   sin red) y acá se reemplaza por la IMAGEN GENERADA en cuanto carga. Si la imagen
   no llega (sin conexión, CDN caída) el emoji se queda donde estaba.
   ============================================================ */
const UIIC={bPause:'ic-pause',bChat:'ic-chat',bTools:'ic-wrench',bRag:'ic-rag',
  bCam:'ic-cam',bAim:'ic-scope',bRel:'ic-reload',bFire:'ic-fire',bFrz:'ic-frz',
  bJump:'ic-jump',bTrash:'ic-trash'};
let uiIcOk=0;
function uiIcon(el,name,cls){
  if(!el||!okUrl(BASE))return;
  const im=new Image();
  im.decoding='async';im.alt='';
  if(cls)im.className=cls;
  im.onload=()=>{el.textContent='';el.appendChild(im);uiIcOk++;};
  im.src=BASE+'ui/'+name+'.webp';
}
function uiIcons(){
  for(const id in UIIC)uiIcon(document.getElementById(id),UIIC[id]);
  uiIcon(document.querySelector('#hp em'),'ic-heart');
}
uiIcons();

/* ---- el personaje se leía casi negro de espaldas ----
   La ropa del modelo generado es azul muy oscuro y el hemisférico del cielo no alcanza
   para separarlo del pasto: se le suben las bases de color un 22 % (sólo al personaje,
   una vez, cuando el GLB ya está en la escena). El mundo queda igual. */
let charLit=0;
function litChar(){
  if(charLit||!charRoot)return;
  let n=0;
  charRoot.traverse(o=>{ if(!o.isMesh||!o.material)return;
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(!m||m._lit)continue; m._lit=1;
      if(m.color)m.color.multiplyScalar(1.22);
      n++; } });
  if(n)charLit=1;
}
EXT.frame.push(()=>{ if(!charLit)litChar(); });

if(DEV&&window.__H)Object.assign(window.__H,{
  charLit:()=>charLit,
  /* cuántos botones quedaron con imagen generada y cuáles */
  icons:()=>({ok:uiIcOk,
    img:Object.keys(UIIC).filter(id=>{const e=document.getElementById(id);
      return !!(e&&e.querySelector('img'));}),
    heart:!!document.querySelector('#hp em img')})});
