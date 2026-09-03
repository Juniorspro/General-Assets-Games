# -*- coding: utf-8 -*-
"""Eco completo: historia con voz, logo, telon y cama de ambiente. Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:240]
    s=s.replace(a,b,n)

# ---------------------------------------------------------------- 1. textos
cam(" jugar:{en:'START', es:'EMPEZAR', pt:'COMEÇAR'},",
""" jugar:{en:'START', es:'EMPEZAR', pt:'COMEÇAR'},
 verCuento:{en:'THE STORY', es:'LA HISTORIA', pt:'A HISTÓRIA'},
 saltarCine:{en:'SKIP', es:'SALTAR', pt:'PULAR'},
 cine1:{en:'You woke up somewhere with no light. You do not know how you got there, and there is no door behind you.',
        es:'Te despertaste en un lugar sin luz. No sabés cómo llegaste, y no hay puerta detrás tuyo.',
        pt:'Você acordou num lugar sem luz. Não sabe como chegou, e não há porta atrás de você.'},
 cine2:{en:'Here you do not see. You hear. Every noise you make draws the walls for one second, and then the black comes back.',
        es:'Acá no se ve. Se oye. Cada ruido que hacés dibuja las paredes por un segundo, y después vuelve el negro.',
        pt:'Aqui não se vê. Se ouve. Cada barulho que você faz desenha as paredes por um segundo, e depois volta o preto.'},
 cine3:{en:'But you are not the only one listening. Something walks toward every noise you make.',
        es:'Pero no sos el único que escucha. Algo camina hacia cada ruido que hacés.',
        pt:'Mas você não é o único que escuta. Algo caminha na direção de cada barulho que você faz.'},
 cine4:{en:'There are written pages on the walls. Someone was here before you. Someone tried to get out.',
        es:'En las paredes hay hojas escritas. Alguien estuvo antes que vos. Alguien quiso salir.',
        pt:'Nas paredes há folhas escritas. Alguém esteve aqui antes de você. Alguém quis sair.'},""")

# ---------------------------------------------------------------- 2. el DOM
cam("""  <div id="menu" class="tapado">
    <div id="ondasM"><i></i><i></i><i></i></div>
    <div id="menuIn">
      <div id="tit">ECO</div>""",
"""  <div id="cine">
    <div id="cineFoto"></div>
    <div id="cinePie"></div>
    <div id="cinePuntos"></div>
    <button id="cineSalta" data-i18n="saltarCine"></button>
  </div>

  <div id="menu" class="tapado">
    <div id="ondasM"><i></i><i></i><i></i></div>
    <div id="telonMenu"></div>
    <div id="menuIn">
      <img id="logoEco" alt="ECO">
      <div id="tit">ECO</div>""")
cam("""      <button id="jugar" data-i18n="jugar"></button>""",
"""      <div class="filaB">
        <button id="jugar" data-i18n="jugar"></button>
        <button id="verCuento" data-i18n="verCuento"></button>
      </div>""")

# ---------------------------------------------------------------- 3. CSS
cam("</style>",
"""  /* ---------- LA HISTORIA ----------
     Cuatro planos, cuatro lineas y cuatro voces por idioma. En un juego que empieza en negro
     absoluto y sin una sola palabra, lo primero que le falta al jugador no es una mecanica: es
     saber DONDE ESTA y por que le importa. */
  #cine{ position:absolute; inset:0; z-index:70; background:#000; display:none; overflow:hidden; }
  #cine.ver{ display:block; }
  #cineFoto{ position:absolute; inset:0; background-position:center; background-size:cover;
    background-repeat:no-repeat; animation:ecoAcerca 10s linear both; }
  @keyframes ecoAcerca{ from{ transform:scale(1.00); } to{ transform:scale(1.09) translateX(-1%); } }
  #cine::after{ content:''; position:absolute; inset:0; pointer-events:none;
    background:linear-gradient(to bottom, rgba(0,0,0,.6) 0%, rgba(0,0,0,0) 24%,
      rgba(0,0,0,0) 42%, rgba(0,0,0,.9) 80%, #000 100%); }
  #cinePie{ position:absolute; left:8%; right:8%; bottom:max(46px,calc(56px * var(--esc,1)));
    z-index:3; text-align:center; color:#cfe6ee; line-height:1.55;
    font-size:max(12px,calc(17px * var(--esc,1))); font-weight:600; letter-spacing:.02em;
    text-shadow:0 2px 10px #000, 0 0 22px rgba(0,0,0,.95); }
  #cinePuntos{ position:absolute; left:0; right:0; bottom:max(22px,calc(26px * var(--esc,1)));
    z-index:3; display:flex; gap:10px; justify-content:center; }
  #cinePuntos i{ width:max(6px,calc(7px * var(--esc,1))); height:max(6px,calc(7px * var(--esc,1)));
    border-radius:50%; background:#2b3a42; }
  #cinePuntos i.on{ background:#8fd8ea; box-shadow:0 0 8px rgba(143,216,234,.7); }
  #cineSalta{ position:absolute; top:max(12px,calc(15px * var(--esc,1)));
    right:max(12px,calc(15px * var(--esc,1))); z-index:4;
    background:rgba(10,16,20,.7); color:#9fc4d0; border:1px solid rgba(143,216,234,.35);
    border-radius:4px; cursor:pointer; letter-spacing:.18em;
    padding:max(6px,calc(7px * var(--esc,1))) max(10px,calc(13px * var(--esc,1)));
    font-size:max(9px,calc(11px * var(--esc,1))); }
  /* el nombre, dibujado y no escrito */
  #logoEco{ display:none; width:min(58%, calc(340px * var(--esc,1))); margin:0 auto;
    filter:drop-shadow(0 0 26px rgba(143,216,234,.28)); }
  #logoEco.hay{ display:block; }
  #menu.conLogo #tit{ display:none; }
  #telonMenu{ position:absolute; inset:0; z-index:0; pointer-events:none;
    background-position:center; background-size:cover; opacity:.55;
    -webkit-mask-image:linear-gradient(to bottom, #000 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.15) 100%);
    mask-image:linear-gradient(to bottom, #000 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.15) 100%); }
  .filaB{ display:flex; gap:12px; align-items:center; justify-content:center; flex-wrap:wrap; }
  #verCuento{ background:rgba(10,16,20,.6); color:#9fc4d0;
    border:1px solid rgba(143,216,234,.32); border-radius:4px; cursor:pointer;
    letter-spacing:.18em; font-weight:700;
    padding:max(9px,calc(12px * var(--esc,1))) max(14px,calc(20px * var(--esc,1)));
    font-size:max(10px,calc(12px * var(--esc,1))); }
  #verCuento:hover{ border-color:rgba(143,216,234,.7); color:#d6eef5; }
</style>""")
open(H,'w',encoding='utf-8').write(s)
print('DOM, textos y CSS de la historia')

# ---------------------------------------------------------------- 4. la logica
cam("""/* ===================== EL MENU ===================== */""",
r"""/* ===================== LA HISTORIA Y EL AMBIENTE ===================== */
/* Todo por WebAudio y colgado del MAESTRO, que es lo que ya mide el analizador: en este juego el
   sonido no es adorno, es el mecanismo, asi que cualquier cosa que se agregue tiene que poder
   compararse contra un grito. */
const BUFE={};
let cineK=-1, cineFuente=null, cineReloj=null, ambFuente=null, ambGan=null, ambK='';
const CINE_N=4, CINE_TOPE=11000;
function b64aBytes(d){
  const t=atob(d.slice(d.indexOf(',')+1));
  const b=new Uint8Array(t.length);
  for(let k=0;k<t.length;k++) b[k]=t.charCodeAt(k);
  return b.buffer;
}
function decodificar(k, dato, luego){
  if(!AUD.ctx || BUFE[k]) return;
  try{ AUD.ctx.decodeAudioData(b64aBytes(dato), b=>{ BUFE[k]=b; if(luego) luego(k); }, ()=>{}); }catch(e){}
}
function cargarAmbiente(){ if(AUD.ctx) for(const k in AMB) decodificar(k, AMB[k], n=>{ if(ambK===n) ambiente(n); }); }
function cargarVoces(){ if(AUD.ctx) for(const k in VOZ) decodificar(k, VOZ[k]); }
/* EL AMBIENTE VA MUY ABAJO Y ESO ESTA MEDIDO. La regla de este juego ya estaba escrita para el
   zumbido: a 0,030 competia con un grito -0,0228 de RMS el grito contra 0,0122 el zumbido, o sea
   vez y media- y un grito tiene que ser un ACONTECIMIENTO, no un matiz. La cama de ambiente se
   pone al mismo criterio: se sube hasta donde el grito siga midiendo al menos el doble. */
const AMB_VOL=0.055;
function ambiente(k){
  ambK=k||'';
  if(ambFuente){ try{ ambFuente.stop(); }catch(e){} ambFuente=null; }
  if(!k || !AUD.on || !AUD.ctx || !AUD.maestro) return;
  const b=BUFE[k]; if(!b) return;
  try{
    ambGan=AUD.ctx.createGain(); ambGan.gain.value=AMB_VOL;
    const f=AUD.ctx.createBufferSource(); f.buffer=b; f.loop=true;
    f.connect(ambGan); ambGan.connect(AUD.maestro); f.start();
    ambFuente=f;
  }catch(e){ ambFuente=null; }
}
function ambienteVol(v){ if(ambGan) try{ ambGan.gain.value=v; }catch(e){} }

function cineHecha(){ try{ return localStorage.getItem('eco_cine')==='1'; }catch(e){ return true; } }
function marcarCine(){ try{ localStorage.setItem('eco_cine','1'); }catch(e){} }
function cineParar(){
  if(cineFuente){ try{ cineFuente.onended=null; cineFuente.stop(); }catch(e){} cineFuente=null; }
  if(cineReloj){ clearTimeout(cineReloj); cineReloj=null; }
}
function cinePlano(k){
  cineParar(); cineK=k;
  if(k>=CINE_N){ cerrarCine(); return; }
  const foto=document.getElementById('cineFoto');
  const im=IMGC['cine'+(k+1)];
  foto.style.backgroundImage = im? 'url('+im+')' : 'none';
  foto.style.animation='none'; void foto.offsetWidth; foto.style.animation='';
  document.getElementById('cinePie').textContent=TX('cine'+(k+1));
  const p=document.getElementById('cinePuntos'); p.innerHTML='';
  for(let n=0;n<CINE_N;n++){ const i=document.createElement('i'); if(n<=k) i.className='on'; p.appendChild(i); }
  let dur=0;
  const b=BUFE[IDIOMA+(k+1)];
  if(b && AUD.on && AUD.ctx){
    try{
      if(AUD.ctx.state==='suspended') AUD.ctx.resume();
      const f=AUD.ctx.createBufferSource(); f.buffer=b;
      const g=AUD.ctx.createGain(); g.gain.value=0.95;
      f.connect(g); g.connect(AUD.maestro);
      f.onended=()=>{ if(cineK===k) cinePlano(k+1); };
      f.start(); cineFuente=f; dur=b.duration;
    }catch(e){}
  }
  cineReloj=setTimeout(()=>{ if(cineK===k) cinePlano(k+1); }, dur>0? dur*1000+800 : CINE_TOPE);
}
function abrirCine(){
  audioIniciar(); cargarVoces(); cargarAmbiente();
  ambiente('ambMenu'); ambienteVol(AMB_VOL*0.35);
  document.getElementById('cine').classList.add('ver');
  cinePlano(0);
}
function cerrarCine(){
  cineParar(); cineK=-1; marcarCine();
  ambienteVol(AMB_VOL);
  document.getElementById('cine').classList.remove('ver');
}
(function armarCine(){
  const b=document.getElementById('cineSalta');
  b.addEventListener('click', e=>{ e.stopPropagation(); cerrarCine(); });
  b.addEventListener('touchstart', e=>{ e.preventDefault(); e.stopPropagation(); cerrarCine(); },{passive:false});
  const c=document.getElementById('cine');
  const seguir=()=>{ if(cineK>=0) cinePlano(cineK+1); };
  c.addEventListener('click', seguir);
  c.addEventListener('touchstart', e=>{ e.preventDefault(); seguir(); },{passive:false});
  const v=document.getElementById('verCuento');
  if(v){ const ver=()=>abrirCine();
    v.addEventListener('click', ver);
    v.addEventListener('touchstart', e=>{ e.preventDefault(); ver(); },{passive:false}); }
})();

/* ===================== EL MENU ===================== */""")

# la historia la primera vez, despues de elegir idioma
cam("""      setTimeout(()=>{ const e=document.getElementById('idioma'); if(e) e.style.display='none'; }, 420); };""",
"""      setTimeout(()=>{ const e=document.getElementById('idioma'); if(e) e.style.display='none';
        /* la primera vez la historia se cuenta sola: un juego que arranca en negro absoluto y sin
           una palabra no deja claro DONDE esta uno ni por que le importa */
        if(!cineHecha()) abrirCine();
      }, 420); };""")

# el ambiente arranca con el juego
cam("""  audioIniciar();
  menuEl.classList.add('ir');""",
"""  audioIniciar(); cargarAmbiente(); ambiente('ambJuego');
  menuEl.classList.add('ir');""")

# las imagenes del menu, cuando el DOM ya esta
cam("""/* ===================== EL MENU ===================== */
let jugando=false""",
"""(function piezasMenu(){
  const lg=document.getElementById('logoEco');
  if(lg && IMGC.logo){ lg.src=IMGC.logo; lg.classList.add('hay');
    document.getElementById('menu').classList.add('conLogo'); }
  const tl=document.getElementById('telonMenu');
  if(tl && IMGC.telon) tl.style.backgroundImage='url('+IMGC.telon+')';
})();

/* ===================== EL MENU ===================== */
let jugando=false""")

# ganchos
cam("window.__eco={",
"""window.__eco={
  cine:()=>({ k:cineK, hecha:cineHecha(), n:CINE_N,
              ver:document.getElementById('cine').classList.contains('ver'),
              voces:Object.keys(BUFE).length, imgs:Object.keys(IMGC).length }),
  verCuento:()=>{ abrirCine(); return true; },
  cineSig:()=>{ cinePlano(cineK+1); return cineK; },
  ambiente:()=>({ suena:ambK, viva:!!ambFuente, vol:ambGan? +ambGan.gain.value.toFixed(4) : 0 }),
  ambienteVol:(v)=>{ ambienteVol(v); return v; },""")
open(H,'w',encoding='utf-8').write(s)
print('logica de la historia y el ambiente')
