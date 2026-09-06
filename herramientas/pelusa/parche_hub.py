# -*- coding: utf-8 -*-
"""
Pelusa pasa a llamarse POMPOM y el menu pasa a ser un HUB: la pelusa en el medio siguiendo el dedo,
JUGAR abajo, los niveles arriba y las dos tiendas a los costados. Mas cuatro vidas, escudos,
enemigos peludos animados, efectos y ocho mundos que ya no se parecen entre si.

IDEMPOTENTE. Guardia: si el texto NUEVO ya esta, no se toca, y nada mas que eso.
"""
import io, os

RUTA = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'juegos-pc', 'Pelusa.html'))
if not os.path.exists(RUTA):
    RUTA = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'juegos-pc', 'Pompom.html'))
s = io.open(RUTA, encoding='utf8').read()
ANTES = len(s)
hechos = saltados = 0

def cam(a, b):
    global s, hechos, saltados
    if b in s: 
        saltados += 1; return
    if a not in s: raise SystemExit('NO ENCONTRADO:\n' + a[:220])
    s = s.replace(a, b, 1); hechos += 1

# =========================================================================================
# 1. EL NOMBRE
#    "Pelusa" es una palabra que hay que traducir; POMPOM se lee igual en todos lados y ademas
#    DESCRIBE al personaje, que es literalmente un pompon. El bicho sigue llamandose Pelusin.
# =========================================================================================
cam("<title>Pelusa</title>", "<title>Pompom</title>")
cam("""  <div id="pIdioma" class="pan ver">
    <div class="tit">PELUSA</div>""",
"""  <div id="pIdioma" class="pan ver">
    <div class="tit">POMPOM</div>""")

# =========================================================================================
# 2. EL HUB: la pelusa en el medio y cuatro salidas
# =========================================================================================
cam("""  #creditos{ position:absolute; bottom:8px; left:0; right:0; text-align:center;
    font-size:9px; letter-spacing:.24em; color:var(--humo2); }""",
"""  #creditos{ position:absolute; bottom:8px; left:0; right:0; text-align:center;
    font-size:9px; letter-spacing:.24em; color:var(--humo2); }

  /* ===================== EL HUB =====================
     NO HAY BOTON "JUGAR" EN EL MEDIO. Lo que hay en el medio es Pelusin, y sigue el dedo: la
     primera cosa que el jugador hace en este juego es tocar la pantalla y ver que algo peludo le
     contesta. Un boton no ensena nada; un bicho que se mueve con el dedo ensena las dos unicas
     reglas que el juego tiene — se toca, y lo que hay es blando.
     Las cuatro salidas van en los cuatro bordes y el panel NO tapa el centro: es un marco. */
  #pHub{ background:transparent; backdrop-filter:none; padding:0;
    display:none; }
  #pHub.ver{ display:block; }
  #hubVelo{ position:absolute; inset:0; pointer-events:none;
    background:radial-gradient(ellipse at 50% 52%, rgba(247,246,243,0) 26%, rgba(247,246,243,.72) 62%,
      rgba(247,246,243,.93) 100%); }
  #hubTit{ position:absolute; top:calc(16px * var(--esc)); left:0; right:0; text-align:center;
    font-size:clamp(19px,4.6vmin,34px); font-weight:200; letter-spacing:.34em; margin-left:.34em;
    color:var(--tinta); pointer-events:none; }
  #hubSub{ position:absolute; top:calc(52px * var(--esc)); left:0; right:0; text-align:center;
    font-size:max(9px,calc(10px * var(--esc))); font-weight:700; letter-spacing:.22em;
    color:var(--humo); text-transform:uppercase; pointer-events:none; }
  .hubB{ position:absolute; appearance:none; border:1.4px solid var(--humo2); background:var(--papel);
    color:var(--tinta); font:inherit; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
    border-radius:999px; cursor:pointer; padding:11px 22px; font-size:max(10px,calc(11px * var(--esc)));
    display:flex; flex-direction:column; align-items:center; gap:3px; line-height:1.2; }
  .hubB small{ font-size:max(8px,calc(8.5px * var(--esc))); letter-spacing:.14em; color:var(--humo);
    font-weight:700; }
  .hubB:active{ background:var(--tinta); color:var(--papel); }
  .hubB:active small{ color:var(--papel2); }
  /* PLAY tiene que despegarse del pie. Con `calc(30px * esc)` y esc=0,62 en una ventana baja el
     boton arranca a 18 px del borde y se comia la fila de HISTORIA / IDIOMA / sonido. El minimo de
     48 px es lo que mide esa fila mas su aire. */
  #hJugar{ left:50%; transform:translateX(-50%); bottom:max(48px, calc(58px * var(--esc)));
    background:var(--tinta); color:var(--papel); border-color:var(--tinta); padding:14px 40px;
    font-size:max(12px,calc(14px * var(--esc))); }
  #hJugar small{ color:rgba(247,246,243,.62); }
  #hNiveles{ left:50%; transform:translateX(-50%); top:calc(84px * var(--esc)); }
  #hColor{ left:calc(12px * var(--esc)); top:50%; transform:translateY(-50%); }
  #hGorro{ right:calc(12px * var(--esc)); top:50%; transform:translateY(-50%); }
  #hMotas{ position:absolute; right:calc(12px * var(--esc)); top:calc(14px * var(--esc));
    font-size:max(10px,calc(11px * var(--esc))); font-weight:800; letter-spacing:.14em;
    color:var(--tinta); display:flex; align-items:center; gap:6px; pointer-events:none; }
  #hMotas i{ width:9px; height:9px; border-radius:50%; background:var(--calma); display:block; }
  #hPie{ position:absolute; bottom:max(9px, calc(11px * var(--esc))); left:0; right:0;
    text-align:center; display:flex; gap:14px; justify-content:center; align-items:center; }
  .pieB{ appearance:none; border:0; background:transparent; color:var(--humo); cursor:pointer;
    font:inherit; font-size:max(8.5px,calc(9px * var(--esc))); letter-spacing:.22em;
    text-transform:uppercase; font-weight:700; padding:6px; }
  .pieB:active{ color:var(--tinta); }

  /* ===================== LAS DOS TIENDAS ===================== */
  #gTienda{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:11px;
    width:min(430px,92%); max-height:64vh; overflow-y:auto; padding:3px; }
  @media (min-width:720px){ #gTienda{ grid-template-columns:repeat(4,minmax(0,1fr));
    width:min(620px,92%); } }
  .art{ border:1.4px solid var(--humo2); border-radius:16px; padding:9px 6px 8px; cursor:pointer;
    background:var(--papel); display:flex; flex-direction:column; align-items:center; gap:5px;
    transition:.15s ease; }
  .art:hover{ border-color:var(--tinta); }
  .art canvas{ width:52px; height:52px; }
  .art .pr{ font-size:max(9px,calc(9.5px * var(--esc))); font-weight:800; letter-spacing:.10em;
    color:var(--humo); }
  .art.tiene .pr{ color:var(--calma); }
  .art.puesto{ border-color:var(--tinta); background:var(--papel2); }
  .art.puesto .pr{ color:var(--tinta); }
  .art.caro{ opacity:.42; }
  #tMotas{ font-size:max(10px,calc(11px * var(--esc))); font-weight:800; letter-spacing:.16em;
    color:var(--tinta); }

  /* ===================== LAS VIDAS ===================== */
  #vidas{ position:absolute; top:calc(14px * var(--esc)); right:calc(56px * var(--esc));
    display:flex; gap:5px; align-items:center; }
  #vidas b{ width:calc(9px * var(--esc)); height:calc(9px * var(--esc)); min-width:7px; min-height:7px;
    border-radius:50%; background:var(--tinta); display:block; transition:.2s ease; }
  #vidas b.no{ background:transparent; box-shadow:inset 0 0 0 1.4px var(--humo2); }
  #vidas .esc{ width:calc(11px * var(--esc)); height:calc(11px * var(--esc)); min-width:9px;
    min-height:9px; border-radius:3px; background:var(--calma); display:none; }
  body.escudo #vidas .esc{ display:block; }""")

cam("""  <div id="pMenu" class="pan">
    <div class="tit">PELUSA</div>
    <div class="sub" data-i18n="sub"></div>
    <div style="height:6px"></div>
    <button class="bot lleno" id="bJugar" data-i18n="jugar"></button>
    <div class="fila">
      <button class="bot" id="bMundos" data-i18n="mundos"></button>
      <button class="bot" id="bCuento" data-i18n="cuento"></button>
      <button class="bot" id="bIdioma" data-i18n="idioma"></button>
    </div>
    <div id="creditos">REZONA</div>
  </div>""",
"""  <div id="pHub" class="pan">
    <div id="hubVelo"></div>
    <div id="hubTit">POMPOM</div>
    <div id="hubSub" data-i18n="sub"></div>
    <div id="hMotas"><i></i><span id="hMotasN">0</span></div>
    <button class="hubB" id="hNiveles"><span data-i18n="niveles"></span><small id="hNivelesS"></small></button>
    <button class="hubB" id="hColor"><span data-i18n="colores"></span><small data-i18n="tienda"></small></button>
    <button class="hubB" id="hGorro"><span data-i18n="gorros"></span><small data-i18n="tienda"></small></button>
    <button class="hubB" id="hJugar"><span data-i18n="jugar"></span><small id="hJugarS"></small></button>
    <div id="hPie">
      <button class="pieB" id="bCuento" data-i18n="cuento"></button>
      <button class="pieB" id="bIdioma" data-i18n="idioma"></button>
      <button class="pieB" id="bSon2">♪</button>
    </div>
  </div>

  <div id="pTienda" class="pan">
    <div class="sub" id="tTit"></div>
    <div id="tMotas"></div>
    <div id="gTienda"></div>
    <button class="bot" id="bVolver3" data-i18n="volver"></button>
  </div>""")

cam("""    <div id="aviso"></div>
    <div id="toque"></div>""",
"""    <div id="vidas"><b></b><b></b><b></b><b></b><span class="esc"></span></div>
    <div id="aviso"></div>
    <div id="toque"></div>""")


# =========================================================================================
# 3. LOS TEXTOS DEL HUB Y DE LAS TIENDAS
# =========================================================================================
cam(
""" jugar:{en:'PLAY', es:'JUGAR', pt:'JOGAR'},""",
""" jugar:{en:'PLAY', es:'JUGAR', pt:'JOGAR'},
 niveles:{en:'LEVELS', es:'NIVELES', pt:'NÍVEIS'},
 colores:{en:'COLOURS', es:'COLORES', pt:'CORES'},
 gorros:{en:'HATS', es:'GORRITOS', pt:'CHAPÉUS'},
 tienda:{en:'shop', es:'tienda', pt:'loja'},
 motas:{en:'{n} specks', es:'{n} motas', pt:'{n} motas'},
 comprar:{en:'{n}', es:'{n}', pt:'{n}'},
 puesto:{en:'ON', es:'PUESTO', pt:'POSTO'},
 tengo:{en:'OWNED', es:'TENGO', pt:'TENHO'},
 sigue:{en:'{m} · {n}', es:'{m} · {n}', pt:'{m} · {n}'},
 hechos:{en:'{n} of {t}', es:'{n} de {t}', pt:'{n} de {t}'},
 arrastra:{en:'drag Pompom around', es:'arrastrá a Pelusín', pt:'arraste o Pelusin'},
 gane:{en:'+{n}', es:'+{n}', pt:'+{n}'},
 vidaMas:{en:'ONE MORE LIFE', es:'UNA VIDA MÁS', pt:'MAIS UMA VIDA'},
 escudoAv:{en:'SHIELD', es:'ESCUDO', pt:'ESCUDO'},
 sinVidas:{en:'AGAIN, FROM THE TOP', es:'DE NUEVO, DESDE ARRIBA', pt:'DE NOVO, DESDE O COMEÇO'},""")

# =========================================================================================
# 4. LA TIENDA: colores y gorritos, y las motas que los pagan
# =========================================================================================
cam(
"""/* ===================== EL SONIDO =====================""",
"""/* ===================== LA TIENDA =====================
   Las motas se ganan pasando niveles y no se pueden comprar con nada: es la unica moneda y sale de
   jugar. Un nivel nuevo da 2, y darlo LIMPIO da 3 — o sea que pasarlo sin que te toquen vale una vez
   y media, que es lo unico que premia jugar bien en un juego sin puntaje ni reloj.
   Y no se puede farmear: se cobra la PRIMERA vez, y la mejora de "pasado" a "limpio" se cobra una
   sola vez tambien. Repetir un nivel es gratis y no da nada, que es como tiene que ser en un juego
   de tranquilidad. */
const COLORES=[
  {id:'tinta',   c:'#24242B', p:0},   {id:'mar',     c:'#2E5A6B', p:6},
  {id:'musgo',   c:'#3C5A3A', p:6},   {id:'ciruela', c:'#553049', p:8},
  {id:'arena',   c:'#7A6647', p:8},   {id:'ladrillo',c:'#8A4436', p:10},
  {id:'indigo',  c:'#33356B', p:12},  {id:'nieve',   c:'#9AA0A6', p:14},
  {id:'oro',     c:'#8C6D1F', p:18},  {id:'noche',   c:'#101018', p:22}
];
const GORROS=[
  {id:'nada',p:0}, {id:'gorrito',p:6}, {id:'cinta',p:6},   {id:'mono',p:8},
  {id:'hoja',p:8}, {id:'antenas',p:10},{id:'flor',p:12},   {id:'corona',p:16},
  {id:'sombrero',p:18}
];
const TIENDA=(()=>{
  const d={ motas:0, col:['tinta'], gor:['nada'], colAct:'tinta', gorAct:'nada' };
  try{ const g=JSON.parse(localStorage.getItem('pelusa_tienda')||'null');
       if(g && typeof g==='object'){ return Object.assign(d, g); } }catch(e){}
  return d;
})();
function guardarTienda(){ try{ localStorage.setItem('pelusa_tienda', JSON.stringify(TIENDA)); }catch(e){} }
function colorAct(){ const c=COLORES.find(x=>x.id===TIENDA.colAct); return c? c.c : '#24242B'; }
function darMotas(n){ if(n<=0) return; TIENDA.motas+=n; guardarTienda(); }

/* EL GORRO SE DIBUJA POR CODIGO, como todo lo demas. No hay un solo asset en este archivo y no lo va
   a haber: nueve gorros como imagenes serian nueve descargas para nueve dibujos de treinta lineas.
   Y VA DERECHO, no gira con el cuerpo: un gorro que rota con la pelusa se lee a objeto pegado; uno
   que se queda arriba se lee a gorro. */
function dibujarGorro(g, r, id, tono){
  if(!id || id==='nada') return;
  const T=tono||'#24242B';
  g.save();
  g.lineCap='round'; g.lineJoin='round';
  if(id==='gorrito'){
    g.fillStyle=T; g.beginPath();
    g.moveTo(-r*0.72,-r*0.66); g.quadraticCurveTo(0,-r*1.86, r*0.72,-r*0.66); g.closePath(); g.fill();
    /* el vivo del gorro va redondeado: un fillRect blanco encima de una cabeza redonda se lee a
       barra pegada, no a gorro */
    g.fillStyle='#F7F6F3'; g.beginPath();
    g.ellipse(0,-r*0.70, r*0.80, r*0.19, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(0,-r*1.72, r*0.20, 0, 7); g.fill();
  } else if(id==='cinta'){
    g.strokeStyle=T; g.lineWidth=r*0.22;
    g.beginPath(); g.arc(0,0, r*1.02, -Math.PI*0.92, -Math.PI*0.08); g.stroke();
  } else if(id==='mono'){
    g.fillStyle='#D9695A';
    for(const sg of [-1,1]){ g.beginPath();
      g.moveTo(0,-r*0.92); g.lineTo(sg*r*0.78,-r*1.34); g.lineTo(sg*r*0.78,-r*0.52); g.closePath(); g.fill(); }
    g.beginPath(); g.arc(0,-r*0.92, r*0.19, 0, 7); g.fill();
  } else if(id==='hoja'){
    g.strokeStyle='#3C5A3A'; g.lineWidth=r*0.11;
    g.beginPath(); g.moveTo(0,-r*0.82); g.lineTo(r*0.10,-r*1.26); g.stroke();
    g.fillStyle='#7FB2A2'; g.beginPath();
    g.moveTo(r*0.10,-r*1.26); g.quadraticCurveTo(r*0.86,-r*1.62, r*0.16,-r*1.90);
    g.quadraticCurveTo(-r*0.18,-r*1.52, r*0.10,-r*1.26); g.fill();
  } else if(id==='antenas'){
    g.strokeStyle=T; g.lineWidth=r*0.10;
    for(const sg of [-1,1]){ g.beginPath(); g.moveTo(sg*r*0.26,-r*0.86);
      g.quadraticCurveTo(sg*r*0.62,-r*1.50, sg*r*0.40,-r*1.86); g.stroke();
      g.fillStyle='#D9695A'; g.beginPath(); g.arc(sg*r*0.40,-r*1.92, r*0.19, 0, 7); g.fill(); }
  } else if(id==='flor'){
    g.fillStyle='#D9695A';
    for(let i=0;i<5;i++){ const a=-Math.PI/2 + i/5*Math.PI*2;
      g.beginPath(); g.ellipse(r*0.42+Math.cos(a)*r*0.30, -r*1.18+Math.sin(a)*r*0.30, r*0.24, r*0.18, a, 0, 7); g.fill(); }
    g.fillStyle='#F7F6F3'; g.beginPath(); g.arc(r*0.42,-r*1.18, r*0.15, 0, 7); g.fill();
  } else if(id==='corona'){
    g.fillStyle='#C79A2B'; g.beginPath();
    g.moveTo(-r*0.74,-r*0.82); g.lineTo(-r*0.74,-r*1.44); g.lineTo(-r*0.37,-r*1.06);
    g.lineTo(0,-r*1.66); g.lineTo(r*0.37,-r*1.06); g.lineTo(r*0.74,-r*1.44);
    g.lineTo(r*0.74,-r*0.82); g.closePath(); g.fill();
  } else if(id==='sombrero'){
    g.fillStyle=T;
    g.beginPath(); g.ellipse(0,-r*0.86, r*1.42, r*0.26, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-r*0.62,-r*0.90); g.lineTo(-r*0.50,-r*1.72);
    g.lineTo(r*0.50,-r*1.72); g.lineTo(r*0.62,-r*0.90); g.closePath(); g.fill();
    g.fillStyle='#D9695A'; g.fillRect(-r*0.60,-r*1.10, r*1.20, r*0.20);
  }
  g.restore();
}

/* ===================== EL SONIDO =====================""")

# =========================================================================================
# 5. EL HUB: la pelusa sigue el dedo
# =========================================================================================
cam(
"""  if(pant!=='juego' && pant!=='historia'){
    camObj=0; camY += (0-camY)*Math.min(1, dt*3.0);
    pelusa.x = Math.sin(tiempo*0.55)*0.30;
    /* abajo del todo y no en el medio: en el medio queda justo detras de los botones y no se ve */
    pelusa.y = camY - 0.058*H/Math.max(1,U) + Math.sin(tiempo*1.15)*0.16;
  } else camY += (camObj-camY)*Math.min(1, dt*3.4);""",
"""  if(pant!=='juego' && pant!=='historia'){
    camObj=0; camY += (0-camY)*Math.min(1, dt*3.0);
    /* EL CENTRO DE LA PANTALLA, no el centro del juego. py() apoya en el 76% del alto porque en
       partida lo que importa es lo que viene arriba; en el hub Pelusin va en el medio y punto. */
    const cy = camY + (0.76-0.50)*H/Math.max(1,U);
    let tx = Math.sin(tiempo*0.55)*0.22, ty = cy + Math.sin(tiempo*1.15)*0.14;
    /* Y SIGUE EL DEDO. Con un resorte y no con un salto: la velocidad del cuerpo es lo que alimenta
       el viento del pelo, asi que teletransportarlo al dedo dejaria el pelo tieso — justo lo que
       hay que mostrar. Se topa a media pantalla para que no se meta debajo de los botones. */
    if(pant==='menu' && punt.activo){
      const mx=(punt.x-W/2)/Math.max(1,U), my=camY+(H*0.76-punt.y)/Math.max(1,U);
      const lim=Math.min(W,H)*0.30/Math.max(1,U);
      const dx=Math.max(-lim,Math.min(lim,mx-0)), dy=Math.max(-lim,Math.min(lim,my-cy));
      tx=dx; ty=cy+dy;
    }
    pelusa.x += (tx-pelusa.x)*Math.min(1, dt*7.5);
    pelusa.y += (ty-pelusa.y)*Math.min(1, dt*7.5);
  } else camY += (camObj-camY)*Math.min(1, dt*3.4);""")

cam(
"""    const X=px(pelusa.x), Y=py(pelusa.y), k=Math.max(1.7, Math.min(3.0, H/260));""",
"""    /* NO TAN GIGANTE. Estaba en 3,0 y en un telefono eso da un pompon de 90 px de radio con el
       pelo: ocupaba media pantalla y tapaba los botones de los costados. */
    /* En un telefono, a 2,05 el pompon mide 34 px de cuerpo y el pelo llega a 61: a esa escala las
       118 cerdas se cuentan de a una y el bicho se lee a erizo y no a pelusa. A 1,70 el pelo vuelve
       a ser una mancha con textura, que es lo que tiene que ser. */
    const X=px(pelusa.x), Y=py(pelusa.y), k=Math.max(1.25, Math.min(1.70, H/430));""")

cam(
"""let ultimoToque=-1e9;
addEventListener('pointerdown', ()=>{ ultimoToque=performance.now(); }, {passive:true});""",
"""let ultimoToque=-1e9;
/* el dedo, para el hub. Se guarda en pixeles de pantalla y se pasa a unidades al usarlo: el mapeo
   depende de U y de camY, que cambian, y guardar unidades seria guardar una foto vieja. */
const punt={ activo:false, x:0, y:0 };
addEventListener('pointerdown', e=>{ punt.activo=true; punt.x=e.clientX; punt.y=e.clientY; }, {passive:true});
addEventListener('pointermove', e=>{ if(punt.activo){ punt.x=e.clientX; punt.y=e.clientY; } }, {passive:true});
for(const ev of ['pointerup','pointercancel','pointerleave'])
  addEventListener(ev, ()=>{ punt.activo=false; }, {passive:true});
addEventListener('pointerdown', ()=>{ ultimoToque=performance.now(); }, {passive:true});""")

# =========================================================================================
# 6. LAS PANTALLAS Y LOS BOTONES DEL HUB
# =========================================================================================
cam(
"""  for(const [id,n] of [['pIdioma','idioma'],['pHistoria','historia'],['pMenu','menu'],
                       ['pMundos','mundos'],['pNiveles','niveles'],['pFin','fin']])""",
"""  for(const [id,n] of [['pIdioma','idioma'],['pHistoria','historia'],['pHub','menu'],
                       ['pMundos','mundos'],['pNiveles','niveles'],['pTienda','tienda'],['pFin','fin']])""")

cam(
"""document.getElementById('bJugar').onclick=()=>{ audioIniciar(); const [m,n]=primerSinHacer(); cargarNivel(m,n); };
document.getElementById('bMundos').onclick=()=>{ pintarMundos(); verPantalla('mundos'); };""",
"""/* SE JUEGA SIEMPRE EL ULTIMO AL QUE LLEGASTE. Es lo que el jugador quiere el 95% de las veces, y
   tenerlo detras de dos pantallas de seleccion convierte "seguir jugando" en un tramite. */
function ultimoNivel(){
  let mm=1, nn=1;
  for(let m=1;m<=MUNDOS;m++){ if(!mundoAbierto(m)) break;
    for(let n=1;n<=NIVELES;n++){ if(!nivelAbierto(m,n)) break; mm=m; nn=n; if(!hechoDe(m,n)) return [m,n]; } }
  return [mm,nn];
}
function hechosTotal(){ let n=0; for(let m=1;m<=MUNDOS;m++) n+=mundoHechos(m); return n; }
function pintarHub(){
  const [m,n]=ultimoNivel();
  const a=document.getElementById('hJugarS'); if(a) a.textContent=TX('sigue',{m,n});
  const b=document.getElementById('hNivelesS');
  if(b) b.textContent=TX('hechos',{n:hechosTotal(), t:MUNDOS*NIVELES});
  const c=document.getElementById('hMotasN'); if(c) c.textContent=TIENDA.motas;
  const s=document.getElementById('hubSub'); if(s) s.textContent=TX('arrastra');
}
/* ---------- LA TIENDA ---------- */
let tiendaTipo='color';
function abrirTienda(t){ tiendaTipo=t; pintarTienda(); verPantalla('tienda'); }
function pintarTienda(){
  const col = tiendaTipo==='color';
  document.getElementById('tTit').textContent = TX(col?'colores':'gorros');
  document.getElementById('tMotas').textContent = TX('motas',{n:TIENDA.motas});
  const c=document.getElementById('gTienda'); c.innerHTML='';
  const lista = col? COLORES : GORROS;
  const tengo = col? TIENDA.col : TIENDA.gor;
  const act   = col? TIENDA.colAct : TIENDA.gorAct;
  for(const it of lista){
    const mio=tengo.indexOf(it.id)>=0, puesto=act===it.id, caro=!mio && TIENDA.motas<it.p;
    const d=document.createElement('div');
    d.className='art'+(mio?' tiene':'')+(puesto?' puesto':'')+(caro?' caro':'');
    d.innerHTML='<canvas width="104" height="104"></canvas><div class="pr">'+
      (puesto? TX('puesto') : mio? TX('tengo') : it.p)+'</div>';
    d.onclick=()=>{
      if(puesto) return;
      if(!mio){
        if(TIENDA.motas<it.p){ son('choque'); return; }
        TIENDA.motas-=it.p; tengo.push(it.id); son('llega',4);
      } else son('toque');
      if(col) TIENDA.colAct=it.id; else TIENDA.gorAct=it.id;
      guardarTienda(); pintarTienda(); pintarHub();
    };
    c.appendChild(d);
    muestraArt(d.querySelector('canvas'), it, col);
  }
}
/* la muestra de cada articulo: la MISMA pelusa, con ese color o ese gorro. Un cuadradito de color
   no dice como va a quedar; el bicho puesto, si. */
function muestraArt(cv, it, esColor){
  const g=cv.getContext('2d'), s=104, r=21;
  g.clearRect(0,0,s,s); g.save(); g.translate(s/2, s*0.58);
  const tono = esColor? it.c : colorAct();
  g.strokeStyle=tono; g.globalAlpha=0.82; g.lineCap='round';
  for(let q=0;q<3;q++){
    g.lineWidth=0.9+q*0.55; g.beginPath();
    for(let i=q;i<54;i+=3){ const a=i/54*Math.PI*2, l=r*(1.30+0.20*Math.sin(i*2.3));
      g.moveTo(Math.cos(a)*r*0.95, Math.sin(a)*r*0.95); g.lineTo(Math.cos(a)*l, Math.sin(a)*l); }
    g.stroke();
  }
  g.globalAlpha=1;
  g.beginPath(); g.arc(0,0,r,0,7); g.fillStyle=tono; g.fill();
  g.fillStyle='#F7F6F3';
  g.beginPath(); g.arc(-r*0.33,-r*0.08,r*0.15,0,7); g.fill();
  g.beginPath(); g.arc( r*0.33,-r*0.08,r*0.15,0,7); g.fill();
  dibujarGorro(g, r, esColor? TIENDA.gorAct : it.id, tono);
  g.restore();
}
document.getElementById('hJugar').onclick=()=>{ audioIniciar(); const [m,n]=ultimoNivel(); cargarNivel(m,n); };
document.getElementById('hNiveles').onclick=()=>{ pintarMundos(); verPantalla('mundos'); };
document.getElementById('hColor').onclick=()=>{ audioIniciar(); abrirTienda('color'); };
document.getElementById('hGorro').onclick=()=>{ audioIniciar(); abrirTienda('gorro'); };
document.getElementById('bVolver3').onclick=()=>{ pintarHub(); verPantalla('menu'); };
document.getElementById('bSon2').onclick=()=>{ AUD.on=!AUD.on; musicaVol(AUD.on? MUS_VOL : 0);
  document.getElementById('bSon2').textContent = AUD.on? '♪' : '♪̸'; };""")

cam(
"""document.getElementById('bVolver1').onclick=()=>verPantalla('menu');""",
"""document.getElementById('bVolver1').onclick=()=>{ pintarHub(); verPantalla('menu'); };""")
cam(
"""document.getElementById('bFin').onclick=()=>verPantalla('menu');""",
"""document.getElementById('bFin').onclick=()=>{ pintarHub(); verPantalla('menu'); };""")
cam(
"""  if(histI>=HIST.length){ verPantalla('menu'); return; }""",
"""  if(histI>=HIST.length){ pintarHub(); verPantalla('menu'); return; }""")
cam(
"""document.getElementById('hSaltar').onclick=(e)=>{ e.stopPropagation(); verPantalla('menu'); };""",
"""document.getElementById('hSaltar').onclick=(e)=>{ e.stopPropagation(); pintarHub(); verPantalla('menu'); };""")
cam(
"""                    if(vioHistoria) verPantalla('menu'); else { vioHistoria=true; histVer(); } };""",
"""                    pintarHub();
                    if(vioHistoria) verPantalla('menu'); else { vioHistoria=true; histVer(); } };""")


# =========================================================================================
# 7. EL COLOR Y EL GORRO PUESTOS
# =========================================================================================
cam(
"""  g.strokeStyle='rgba(36,36,43,0.78)'; g.lineCap='round'; g.lineJoin='round';
  for(let gi=0; gi<GROSORES.length; gi++){""",
"""  g.strokeStyle=tinta(0.78); g.lineCap='round'; g.lineJoin='round';
  for(let gi=0; gi<GROSORES.length; gi++){""")

cam(
"""  g.save(); g.translate(X,Y); g.scale(sx,sy);
  g.beginPath(); g.arc(0,0,RP*U,0,7); g.fillStyle='#24242B'; g.fill();""",
"""  g.save(); g.translate(X,Y); g.scale(sx,sy);
  g.beginPath(); g.arc(0,0,RP*U,0,7); g.fillStyle=colorAct(); g.fill();""")

cam(
"""    g.ellipse(sg*se + mx*oj*0.5, -my*oj*0.5, RP*U*0.15, RP*U*0.15*cerr, 0, 0, 7);
    g.fill();
  }
  g.restore();
}""",
"""    g.ellipse(sg*se + mx*oj*0.5, -my*oj*0.5, RP*U*0.15, RP*U*0.15*cerr, 0, 0, 7);
    g.fill();
  }
  g.restore();
  /* EL GORRO VA AFUERA DEL scale(). Adentro se aplastaria con el muelle del aterrizaje, y un
     sombrero que se achata cuando el bicho rebota se lee a error de dibujo, no a fisica. */
  /* EL GORRO VA ARRIBA DEL PELO, NO ARRIBA DEL CUERPO. Puesto sobre el radio del cuerpo -0,42- la
     corona quedaba adentro de los mechones, que llegan a 0,75: se compraba un sombrero y no se veia
     ninguno. Se corre 0,62 radios para arriba y se agranda un 15%, asi apoya justo sobre el pelo. */
  g.save(); g.translate(X, Y - RP*U*0.62);
  dibujarGorro(g, RP*U*1.15, TIENDA.gorAct, colorAct());
  g.restore();
  /* el escudo puesto: un aro que respira alrededor. Va afuera del cuerpo y no encima, para que no
     tape ni los ojos ni el gorro que el jugador acaba de comprar */
  if(escudo){
    g.beginPath(); g.arc(X, Y, RP*U*(1.62+0.10*Math.sin(tiempo*3.4)), 0, 7);
    g.strokeStyle='rgba(127,178,162,0.55)'; g.lineWidth=Math.max(1.4,U*0.030); g.stroke();
  }
}
/* el color puesto, con alfa. El pelo y el cuerpo tienen que ser el MISMO color o el bicho se lee a
   dos cosas pegadas. */
function tinta(a){
  const c=colorAct(), n=parseInt(c.slice(1),16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}""")

# =========================================================================================
# 8. CUATRO VIDAS, ESCUDOS Y PREMIOS
# =========================================================================================
cam(
"""let pant='idioma';            // idioma | menu | mundos | niveles | juego | fin""",
"""/* ===================== CUATRO VIDAS =====================
   El juego nacio SIN vidas a proposito -"de tranquilidad", fallar costaba volver a tocar y nada mas-
   y ahora las tiene porque el jugador las pidio. La forma de que no se peleen con el tono es que la
   vida no se pierda para siempre: quedarse sin las cuatro no es un game over, es volver al primer
   punto del mismo nivel con las cuatro otra vez. Lo unico que se pierde es el LIMPIO.
   Y hay dos premios que aparecen en algunos sectores: el escudo, que se come un golpe entero, y la
   vida, que devuelve una. Con eso un tramo de cinco saltos difíciles deja de ser un muro. */
const VIDAS_MAX=4;
let vidas=VIDAS_MAX, escudo=false, brillos=[], rastro=[];
let pant='idioma';            // idioma | menu | mundos | niveles | juego | tienda | fin""")

cam(
"""  const anillos=[];
  for(let k=1;k<nodos.length;k++) anillos.push(anilloDe(R, mundo, d, k));
  const niv={ mundo, nivel, trazado:TRAZADOS[(mundo+nivel)%4], nodos, anillos, ventanas:[] };""",
"""  const anillos=[];
  for(let k=1;k<nodos.length;k++) anillos.push(anilloDe(R, mundo, d, k));
  /* LOS PREMIOS SE TIRAN AL FINAL Y NO EN EL MEDIO. El nivel entero sale de una semilla, asi que
     cualquier R() intercalado antes correria todos los numeros de atras y el 12 del mundo 4 pasaria
     a ser otro nivel. Al final, no toca nada de lo que ya se decidio.
     Y NUNCA EN EL PRIMER SALTO: un escudo regalado antes de haber arriesgado nada no se lee a
     premio, se lee a adorno. */
  const premios=[];
  for(let k=0;k<nodos.length;k++) premios.push(null);
  if(mundo>=2) for(let k=2;k<nodos.length;k++){
    const q=R();
    if(q<0.11) premios[k]='vida';
    else if(q<0.26) premios[k]='escudo';
  }
  const niv={ mundo, nivel, trazado:TRAZADOS[(mundo+nivel)%4], nodos, anillos, premios, ventanas:[] };""")

cam(
"""function chocar(){
  intentos++; limpio=false; tutoChoques++;
  pelusa.viajando=false;
  const A=nivel.nodos[pelusa.en];
  pelusa.x=A.x; pelusa.y=A.y; pelusa.sqv=9.5; pelusa.sacude=0.42;
  sacudon=0.34;
  camObj=A.y;
  son('choque');
  for(let i=0;i<14;i++){
    const a=Math.random()*Math.PI*2, v=1.6+Math.random()*2.6;
    chispas.push({x:pelusa.x, y:pelusa.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, t:0, T:0.5+Math.random()*0.3});
  }
  avisoToque(true);
}""",
"""function chocar(){
  intentos++; limpio=false; tutoChoques++;
  pelusa.viajando=false;
  const A=nivel.nodos[pelusa.en];
  const conEscudo=escudo;
  if(escudo){ escudo=false; }
  else vidas--;
  pintarVidas();
  pelusa.x=A.x; pelusa.y=A.y; pelusa.sqv=9.5; pelusa.sacude=0.42;
  sacudon=conEscudo? 0.20 : 0.34;
  camObj=A.y;
  son(conEscudo? 'escudo' : 'choque');
  /* el estallido: con escudo es verde y hacia afuera en anillo, sin escudo es rojo y desparramado.
     Que se distingan de un vistazo importa mas de lo que parece — es la unica forma de saber, en el
     medio de un salto fallado, si el golpe costo algo. */
  const n=conEscudo? 20 : 16;
  for(let i=0;i<n;i++){
    const a=conEscudo? (i/n)*Math.PI*2 : Math.random()*Math.PI*2;
    const v=conEscudo? 3.2 : 1.6+Math.random()*2.6;
    chispas.push({x:pelusa.x, y:pelusa.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v,
                  t:0, T:0.5+Math.random()*0.3, verde:conEscudo});
  }
  ondas.push({x:A.x, y:A.y, r:0, v:1, verde:conEscudo});
  if(vidas<=0) reiniciarNivel();
  else avisoToque(true);
}
/* SIN VIDAS NO HAY PANTALLA DE DERROTA. Se vuelve al primer punto del mismo nivel con las cuatro
   puestas. Un cartel de "perdiste" en un juego que se anuncia como de tranquilidad es exactamente
   la cosa que el juego dijo que no iba a hacer. */
function reiniciarNivel(){
  vidas=VIDAS_MAX; escudo=false; pintarVidas();
  pelusa.en=0; pelusa.viajando=false;
  const A=nivel.nodos[0];
  pelusa.x=A.x; pelusa.y=A.y; camObj=A.y;
  for(const an of nivel.anillos) for(const ro of an) delete ro.duerme;
  if(nivel.premios) for(let k=0;k<nivel.premios.length;k++)
    if(nivel.premios[k]==='usado') nivel.premios[k]=nivel.premiosOrig[k];
  avisar(TX('sinVidas'), 1.6);
  pintarHud();
  avisoToque(true);
}
function pintarVidas(){
  const c=document.getElementById('vidas'); if(!c) return;
  const bs=c.querySelectorAll('b');
  for(let i=0;i<bs.length;i++) bs[i].classList.toggle('no', i>=vidas);
  document.body.classList.toggle('escudo', escudo);
}
function tomarPremio(k){
  if(!nivel.premios) return;
  const p=nivel.premios[k];
  if(!p || p==='usado') return;
  nivel.premios[k]='usado';
  if(p==='escudo'){ escudo=true; avisar(TX('escudoAv'), 1.1); son('escudo'); }
  else { if(vidas<VIDAS_MAX){ vidas++; avisar(TX('vidaMas'), 1.1); } else darMotas(2);
         son('llega', 5); }
  pintarVidas();
  for(let i=0;i<16;i++){ const a=(i/16)*Math.PI*2;
    chispas.push({x:nivel.nodos[k].x, y:nivel.nodos[k].y, vx:Math.cos(a)*2.6, vy:Math.sin(a)*2.6,
                  t:0, T:0.55, verde:true}); }
}""")

cam(
"""  son('llega', pelusa.en);
  ondas.push({x:B.x, y:B.y, r:0, v:1});
  camObj=B.y;
  pintarHud();""",
"""  son('llega', pelusa.en);
  ondas.push({x:B.x, y:B.y, r:0, v:1});
  tomarPremio(pelusa.en);
  camObj=B.y;
  pintarHud();""")

cam(
"""  tiempo=0; intentos=0; limpio=true; terminado=0; chispas.length=0; ondas.length=0;
  jugando=true;""",
"""  tiempo=0; intentos=0; limpio=true; terminado=0; chispas.length=0; ondas.length=0;
  rastro.length=0; brillos.length=0;
  vidas=VIDAS_MAX; escudo=false;
  if(nivel.premios) nivel.premiosOrig=nivel.premios.slice();
  pintarVidas();
  jugando=true;""")

# las motas que paga el nivel
cam(
"""  const antes=hechoDe(mundoAct,nivelAct);
  const val=limpio?2:1;
  if(val>antes){ prog[clave(mundoAct,nivelAct)]=val; guardar(); }""",
"""  const antes=hechoDe(mundoAct,nivelAct);
  const val=limpio?2:1;
  /* SE COBRA LA MEJORA, NO LA REPETICION. Pasar un nivel nuevo da 2; pasarlo limpio da 3. Si ya
     estaba pasado y ahora sale limpio, se cobra la diferencia y nada mas. Repetir es gratis: en un
     juego de tranquilidad, obligar a repetir para juntar monedas seria el peor incentivo posible. */
  if(val>antes){
    darMotas(val===2? (antes===1? 1 : 3) : 2);
    prog[clave(mundoAct,nivelAct)]=val; guardar();
  }""")


# =========================================================================================
# 9. MAS SECTORES Y MAS ESPINOSOS
# =========================================================================================
cam(
"""  const saltos=Math.min(11, 2 + Math.round(d*3) + Math.floor(mundo/2));""",
"""  /* MAS SECTORES A MEDIDA QUE SE AVANZA. De 2-9 saltos a 3-13: el mundo 1 arranca en tres, que ya
     es un nivel y no una demostracion, y el ultimo del 8 son trece puntos seguidos. */
  const saltos=Math.min(13, 3 + Math.round(d*4) + Math.floor(mundo*0.75));""")

cam(
"""  const cuantos = 1 + ((mundo>=2 && d>0.25)?1:0) + ((mundo>=4 && d>0.55)?1:0) + ((mundo>=6 && d>0.7)?1:0);
  const base = 1.55 + mundo*0.17 + d*0.85;
  const ro=[];
  for(let i=0;i<Math.min(3,cuantos);i++){
    let r = ORB_MIN + (ORB_MAX-ORB_MIN)*((mundo>=3)? ((i%2)? 0.92 : 0.14) + R()*0.08 : R());""",
"""  /* HASTA CUATRO POR SECTOR, y entran antes. Antes el cuarto no existia y el tercero recien
     aparecia en el mundo 6 pasado el 70% — o sea que catorce de los veinte niveles de casi todos los
     mundos tenian uno o dos y nada mas. */
  const cuantos = 1 + ((mundo>=2 && d>0.20)?1:0) + ((mundo>=3 && d>0.45)?1:0)
                    + ((mundo>=5 && d>0.35)?1:0) + ((mundo>=7 && d>0.60)?1:0);
  const base = 1.55 + mundo*0.17 + d*0.85;
  /* CUATRO RADIOS DISTINTOS Y NO DOS ALTERNADOS. Con el patron viejo (cerca, lejos, cerca, lejos) el
     tercero y el primero caian en la misma orbita: dos bolas girando sobre la misma circunferencia
     no son dos peligros, son uno con un hueco. */
  const RAD=[0.10, 0.44, 0.74, 0.98];
  const ro=[];
  for(let i=0;i<Math.min(4,cuantos);i++){
    let r = ORB_MIN + (ORB_MAX-ORB_MIN)*((mundo>=3)? RAD[i] + R()*0.06 : R());""")

# =========================================================================================
# 10. LOS ESPINOSOS: PELUDOS Y ANIMADOS
# =========================================================================================
cam(
"""function dibujarEspinosa(X,Y,u,giro,alfa){
  const g=cx;
  g.save(); g.translate(X,Y); g.rotate(giro);
  g.strokeStyle='rgba(217,105,90,'+(0.92*alfa).toFixed(3)+')';
  g.lineWidth=Math.max(1.1,u*0.030); g.lineCap='round';
  g.beginPath();
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    g.moveTo(Math.cos(a)*R_BOLA*u*0.86, Math.sin(a)*R_BOLA*u*0.86);
    g.lineTo(Math.cos(a)*R_ESP*u*0.94, Math.sin(a)*R_ESP*u*0.94);
  }
  g.stroke();
  g.beginPath(); g.arc(0,0,R_BOLA*u,0,7);
  g.fillStyle='rgba(217,105,90,'+(0.95*alfa).toFixed(3)+')'; g.fill();
  g.beginPath(); g.arc(-R_BOLA*u*0.25,-R_BOLA*u*0.25,R_BOLA*u*0.30,0,7);
  g.fillStyle='rgba(255,255,255,'+(0.35*alfa).toFixed(3)+')'; g.fill();
  g.restore();
}""",
"""/* ===================== EL ESPINOSO =====================
   Era un circulo liso con ocho palitos rectos. Ahora es una PELUSA con espinas: el mismo bicho que
   el jugador, pero al reves — un pompon rojo erizado. Que el enemigo sea de la misma familia que el
   personaje es lo que hace que el juego se lea como un mundo y no como un muneco esquivando
   obstaculos geometricos.

   TRES ANIMACIONES Y LAS TRES SON GRATIS, porque salen del reloj y no de un estado guardado:
   · las espinas RESPIRAN (se estiran y se encogen), cada bicho con su fase
   · el cuerpo se APLASTA en la direccion en la que va, como el de la pelusa
   · deja tres FANTASMAS atras sobre su propia orbita, que es lo que se lee como velocidad

   Y LO IMPORTANTE: EL RESPIRO ES SOLO DIBUJO. La espina jamas se dibuja mas larga que R_ESP, que es
   el radio con el que choca. Si el dibujo se pasara del radio de choque el jugador veria una espina
   atravesarlo sin que pase nada -o al reves- y a partir de ahi no podria confiar en lo que ve, que
   en un juego de puntería es lo unico que tiene. */
function dibujarEspinosa(X,Y,u,giro,alfa,fase,vx,vy){
  const g=cx;
  const t=tiempo*2.2 + (fase||0);
  const resp=0.82 + 0.18*(0.5+0.5*Math.sin(t));       // 0,82 a 1,00 de R_ESP. Nunca mas.
  g.save(); g.translate(X,Y);
  /* el aplaste va en la direccion del movimiento, si es que se sabe cual es */
  if(vx||vy){
    const l=Math.hypot(vx,vy);
    if(l>0.001){ g.rotate(Math.atan2(vy,vx)); g.scale(1.09, 0.92); g.rotate(-Math.atan2(vy,vx)); }
  }
  g.rotate(giro);
  const rojo=(a)=>'rgba(217,105,90,'+(a*alfa).toFixed(3)+')';
  /* el pelo corto del bicho: veinte cerdas cortas, que es lo que lo vuelve pelusa y no bola */
  g.strokeStyle=rojo(0.38); g.lineWidth=Math.max(0.8,u*0.016); g.lineCap='round';
  g.beginPath();
  for(let i=0;i<20;i++){
    const a=i/20*Math.PI*2 + 0.15;
    const l=R_BOLA*(1.16+0.16*Math.sin(i*2.7+t*1.3));
    g.moveTo(Math.cos(a)*R_BOLA*u*0.92, Math.sin(a)*R_BOLA*u*0.92);
    g.lineTo(Math.cos(a)*l*u, Math.sin(a)*l*u);
  }
  g.stroke();
  /* las ocho espinas, que respiran */
  g.strokeStyle=rojo(0.92); g.lineWidth=Math.max(1.1,u*0.032); g.lineCap='round';
  g.beginPath();
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    const larga=R_ESP*resp*(i%2? 1 : 0.90);
    g.moveTo(Math.cos(a)*R_BOLA*u*0.80, Math.sin(a)*R_BOLA*u*0.80);
    g.lineTo(Math.cos(a)*larga*u, Math.sin(a)*larga*u);
  }
  g.stroke();
  g.beginPath(); g.arc(0,0,R_BOLA*u,0,7); g.fillStyle=rojo(0.95); g.fill();
  /* dos ojitos, y miran para adelante: es lo que lo pasa de obstaculo a bicho */
  g.rotate(-giro);
  g.fillStyle='rgba(247,246,243,'+(0.90*alfa).toFixed(3)+')';
  for(const sg of [-1,1]){
    g.beginPath(); g.arc(sg*R_BOLA*u*0.34, -R_BOLA*u*0.10, R_BOLA*u*0.17, 0, 7); g.fill();
  }
  g.restore();
}""")

cam(
"""        dibujarEspinosa(BX, BY, U, a*1.6, alfa);
        if(ro.forma==='doble') dibujarEspinosa(px(2*nodo.x-p.x), py(2*nodo.y-p.y), U, a*1.6+1.1, alfa);""",
"""        /* los tres fantasmas de atras, sobre la propia orbita: es la unica forma de que se lea a
           que velocidad va sin dibujar una raya de comic */
        const sgg=(ro.w<0)? 1 : -1;
        for(let q=3;q>=1;q--){
          const aq=a+sgg*q*0.13;
          g.beginPath(); g.arc(NX+Math.cos(aq)*rr*U, Y-Math.sin(aq)*rr*U, R_BOLA*U*(1-q*0.13), 0, 7);
          g.fillStyle='rgba(217,105,90,'+((0.16-q*0.04)*alfa).toFixed(3)+')'; g.fill();
        }
        const vgx=-Math.sin(a)*ro.w, vgy=Math.cos(a)*ro.w;
        dibujarEspinosa(BX, BY, U, a*1.6, alfa, ro.fase, vgx, -vgy);
        if(ro.forma==='doble') dibujarEspinosa(px(2*nodo.x-p.x), py(2*nodo.y-p.y), U, a*1.6+1.1, alfa,
                                               ro.fase+2.1, -vgx, vgy);""")

# =========================================================================================
# 11. MAS EFECTOS: rastro, premios dibujados, chispas verdes
# =========================================================================================
cam(
"""      pelusa.ang += dt*7.5;""",
"""      pelusa.ang += dt*7.5;
      /* EL RASTRO. Nueve fantasmas del propio cuerpo, que es lo que convierte un punto que se
         traslada en algo que salio disparado. Se guarda la posicion y no una copia del pelo: el pelo
         son 590 puntos por cuadro y guardar nueve copias seria guardar cinco mil puntos para
         dibujar nueve manchas. */
      rastro.push({x:pelusa.x, y:pelusa.y});
      if(rastro.length>9) rastro.shift();""")

cam(
"""    } else {
      pelusa.ang *= Math.max(0, 1-dt*4);
    }""",
"""    } else {
      pelusa.ang *= Math.max(0, 1-dt*4);
      if(rastro.length) rastro.shift();
    }""")

cam(
"""  for(const c of chispas){
    const a=1-c.t/c.T;
    g.beginPath(); g.arc(px(c.x),py(c.y), U*0.035*a, 0, 7);
    g.fillStyle='rgba(217,105,90,'+(0.75*a).toFixed(3)+')'; g.fill();
  }""",
"""  for(const c of chispas){
    const a=1-c.t/c.T;
    g.beginPath(); g.arc(px(c.x),py(c.y), U*0.035*a, 0, 7);
    g.fillStyle=(c.verde? 'rgba(127,178,162,' : 'rgba(217,105,90,')+(0.75*a).toFixed(3)+')'; g.fill();
  }
  /* LOS PREMIOS, dibujados en su nodo: el escudo es un arco y la vida es un circulo lleno. Los dos
     laten, porque en una pantalla donde todo lo demas gira, lo que late se mira. */
  if(nivel.premios) for(let k=0;k<nivel.premios.length;k++){
    const p=nivel.premios[k]; if(!p || p==='usado') continue;
    const n=nivel.nodos[k], X=px(n.x), Y=py(n.y)-U*0.72;
    if(Y<-60||Y>H+60) continue;
    const la=1+0.09*Math.sin(tiempo*3.1+k);
    g.save(); g.translate(X,Y); g.scale(la,la);
    g.strokeStyle='rgba(127,178,162,0.92)'; g.lineWidth=Math.max(1.3,U*0.030); g.lineCap='round';
    if(p==='escudo'){
      g.beginPath();
      g.moveTo(-U*0.19,-U*0.16); g.lineTo(-U*0.19, U*0.02);
      g.quadraticCurveTo(-U*0.19, U*0.22, 0, U*0.28);
      g.quadraticCurveTo(U*0.19, U*0.22, U*0.19, U*0.02);
      g.lineTo(U*0.19,-U*0.16); g.closePath();
      g.fillStyle='rgba(127,178,162,0.20)'; g.fill(); g.stroke();
    } else {
      g.beginPath(); g.arc(0,0,U*0.19,0,7);
      g.fillStyle='rgba(127,178,162,0.92)'; g.fill();
      g.strokeStyle='rgba(247,246,243,0.95)'; g.lineWidth=Math.max(1.2,U*0.026);
      g.beginPath(); g.moveTo(-U*0.09,0); g.lineTo(U*0.09,0);
      g.moveTo(0,-U*0.09); g.lineTo(0,U*0.09); g.stroke();
    }
    g.restore();
  }""")

cam(
"""  for(const o of ondas){
    g.beginPath(); g.arc(px(o.x),py(o.y),o.r*U,0,7);
    g.strokeStyle='rgba(36,36,43,'+(0.20*o.v).toFixed(3)+')'; g.lineWidth=Math.max(1,U*0.02); g.stroke();
  }""",
"""  for(const o of ondas){
    g.beginPath(); g.arc(px(o.x),py(o.y),o.r*U,0,7);
    g.strokeStyle=(o.verde? 'rgba(127,178,162,' : 'rgba(36,36,43,')+(0.20*o.v).toFixed(3)+')';
    g.lineWidth=Math.max(1,U*0.02); g.stroke();
  }""")

cam(
"""function dibujarPelusa(){
  const g=cx;
  const X=px(pelusa.x), Y=py(pelusa.y);""",
"""function dibujarPelusa(){
  const g=cx;
  const X=px(pelusa.x), Y=py(pelusa.y);
  /* el rastro va ANTES que la sombra y que el cuerpo: si fuera despues taparia al bicho, que es lo
     unico que hay que mirar */
  for(let i=0;i<rastro.length;i++){
    const q=rastro[i], f=(i+1)/(rastro.length+1);
    g.beginPath(); g.arc(px(q.x), py(q.y), RP*U*(0.30+0.55*f), 0, 7);
    g.fillStyle=tinta(0.055*f); g.fill();
  }""")

# =========================================================================================
# 12. EL SONIDO DEL ESCUDO
# =========================================================================================
cam(
"""    else if(tipo==='toque'){ nota(PENTA[3]+24, 0.22, 0.05); }""",
"""    else if(tipo==='escudo'){ nota(PENTA[2]+12, 0.55, 0.11); nota(PENTA[5]+12, 0.45, 0.07); }
    else if(tipo==='toque'){ nota(PENTA[3]+24, 0.22, 0.05); }""")

# =========================================================================================
# 13. LOS OCHO MUNDOS DEJAN DE PARECERSE
# =========================================================================================
cam(
"""      const X=px(o.x) + Math.sin(tiempo*o.w+o.f)*U*C.v*0.55;
      g.beginPath(); g.arc(X,Y,r,0,7);
      if(C.forma==='aro') g.stroke(); else g.fill();""",
"""      const X=px(o.x) + Math.sin(tiempo*o.w+o.f)*U*C.v*0.55;
      /* CADA MUNDO DIBUJA OTRA FIGURA. Antes los ocho eran discos y aros y lo unico que cambiaba era
         un par de grises: dos mundos seguidos se veian iguales con el brillo apenas movido, o sea
         que avanzar no se notaba. Ahora el mundo 3 son triangulos y el 6 son hexagonos, y eso se
         nota de una ojeada sin leer un solo rotulo. */
      dibujarFig(g, X, Y, r, DECOR[Math.max(0,Math.min(DECOR.length-1,fondoMundo))],
                 C.forma==='aro', tiempo*0.10+o.f);""")

cam(
"""let fondo=null, fondoMundo=0;""",
"""/* una figura por mundo. El 0 es el del hub y el menu. */
const DECOR=['disco','disco','aro','triangulo','rombo','arco','hexa','cruz','estrella'];
function dibujarFig(g, X, Y, r, forma, soloLinea, giro){
  g.save(); g.translate(X,Y);
  if(forma!=='disco' && forma!=='aro') g.rotate(giro||0);
  g.beginPath();
  if(forma==='disco' || forma==='aro'){ g.arc(0,0,r,0,7); }
  else if(forma==='triangulo'){ for(let i=0;i<3;i++){ const a=-Math.PI/2+i/3*Math.PI*2;
      i? g.lineTo(Math.cos(a)*r,Math.sin(a)*r) : g.moveTo(Math.cos(a)*r,Math.sin(a)*r); } g.closePath(); }
  else if(forma==='rombo'){ g.moveTo(0,-r); g.lineTo(r*0.72,0); g.lineTo(0,r); g.lineTo(-r*0.72,0); g.closePath(); }
  else if(forma==='hexa'){ for(let i=0;i<6;i++){ const a=i/6*Math.PI*2;
      i? g.lineTo(Math.cos(a)*r,Math.sin(a)*r) : g.moveTo(Math.cos(a)*r,Math.sin(a)*r); } g.closePath(); }
  else if(forma==='cruz'){ const b=r*0.34;
      g.moveTo(-b,-r); g.lineTo(b,-r); g.lineTo(b,-b); g.lineTo(r,-b); g.lineTo(r,b); g.lineTo(b,b);
      g.lineTo(b,r); g.lineTo(-b,r); g.lineTo(-b,b); g.lineTo(-r,b); g.lineTo(-r,-b); g.lineTo(-b,-b);
      g.closePath(); }
  else if(forma==='estrella'){ for(let i=0;i<10;i++){ const a=-Math.PI/2+i/10*Math.PI*2, q=(i%2)? r*0.46 : r;
      i? g.lineTo(Math.cos(a)*q,Math.sin(a)*q) : g.moveTo(Math.cos(a)*q,Math.sin(a)*q); } g.closePath(); }
  else if(forma==='arco'){ g.arc(0,0,r,Math.PI*0.08,Math.PI*0.92); }
  if(soloLinea || forma==='arco') g.stroke(); else g.fill();
  g.restore();
}
let fondo=null, fondoMundo=0;""")


# =========================================================================================
# 14. GANCHOS
# =========================================================================================
cam(
"""  progreso:()=>({ prog:Object.keys(prog).length,""",
"""  vidas:()=>({ vidas, max:VIDAS_MAX, escudo,
               premios: nivel&&nivel.premios? nivel.premios.slice() : null,
               puntos: nivel? nivel.nodos.length-1 : 0 }),
  golpe:()=>{ const v=vidas, e=escudo; chocar();
              return { antes:{vidas:v, escudo:e}, ahora:{vidas, escudo}, en:pelusa.en }; },
  tienda:(tipo,id)=>{
    if(tipo && id){ const L=(tipo==='color')?COLORES:GORROS, it=L.find(x=>x.id===id);
      if(it){ const t=(tipo==='color')?TIENDA.col:TIENDA.gor;
        if(t.indexOf(id)<0 && TIENDA.motas>=it.p){ TIENDA.motas-=it.p; t.push(id); }
        if(t.indexOf(id)>=0){ if(tipo==='color') TIENDA.colAct=id; else TIENDA.gorAct=id; }
        guardarTienda(); pintarTienda&&pintarTienda(); } }
    return { motas:TIENDA.motas, col:TIENDA.col.length, gor:TIENDA.gor.length,
             colAct:TIENDA.colAct, gorAct:TIENDA.gorAct,
             colores:COLORES.length, gorros:GORROS.length }; },
  motas:(n)=>{ if(n) darMotas(n); return TIENDA.motas; },
  hub:()=>({ pant, ultimo:ultimoNivel(), hechos:hechosTotal(), total:MUNDOS*NIVELES,
             pos:[+pelusa.x.toFixed(2), +pelusa.y.toFixed(2)],
             sigue:(document.getElementById('hJugarS')||{}).textContent||'' }),
  dedo:(x,y)=>{ if(x==null){ punt.activo=false; return false; }
                punt.activo=true; punt.x=x; punt.y=y; return true; },
  progreso:()=>({ prog:Object.keys(prog).length,""")

cam(
"""  formas:()=>{ const c={};
    for(let m=1;m<=MUNDOS;m++) for(let n=1;n<=NIVELES;n++){
      const nv=generar(m,n);
      for(const an of nv.anillos) for(const r of an) c[r.forma]=(c[r.forma]||0)+1; }
    return c; },""",
"""  formas:()=>{ const c={}; let nodos=0, prem={escudo:0,vida:0}, maxRo=0;
    for(let m=1;m<=MUNDOS;m++) for(let n=1;n<=NIVELES;n++){
      const nv=generar(m,n);
      nodos+=nv.nodos.length-1;
      for(const p of nv.premios) if(p) prem[p]++;
      for(const an of nv.anillos){ if(an.length>maxRo) maxRo=an.length;
        for(const r of an) c[r.forma]=(c[r.forma]||0)+1; } }
    return { formas:c, sectores:nodos, premios:prem, maxPorSector:maxRo }; },""")


# =========================================================================================
# 15. DOS ARREGLOS DEL GENERADOR, LOS DOS ENCONTRADOS POR LA AUDITORIA
#
#     Con cuatro rotores por sector y las cuatro orbitas nuevas, los mundos 5 al 8 empezaron a
#     devolver niveles con VENTANA 0, o sea imposibles. Dos causas, y las dos son aritmetica:
#
#     1. LA LUNA DEL SATELITE SE PARABA ENCIMA DEL NODO. La luna gira a R_ESP*1,55 = 0,71 de su
#        bola; con la bola en la orbita mas chica nueva -1,25- la luna llega a 0,54 del centro, y la
#        pelusa mas la luna miden 0,42+0,20 = 0,62. O sea que aterrizar era chocar SIEMPRE, gire como
#        gire. Es exactamente el mismo defecto que ya habia costado el pulso, en otro disfraz: todo
#        lo que orbite mas cerca que RP+su radio se come el punto de llegada.
#     2. Y EL AFLOJE NO ALCANZABA. Bajar la velocidad no arregla una geometria que tapa el destino:
#        por rapido o lento que gire, el hueco no existe. Ahora, si despues de aflojar la ventana
#        sigue en cero, se SACAN rotores de a uno hasta que exista — y si con uno solo tampoco, ese
#        ultimo se vuelve una bola fija y lenta. Un nivel imposible no puede salir de aca ni aunque
#        el generador tenga un dia malo.
# =========================================================================================
cam(
"""    if(forma==='barra') r=Math.max(r, 1.62);""",
"""    if(forma==='barra') r=Math.max(r, 1.62);
    /* la luna orbita a 0,71 de su bola: con la bola mas cerca de 1,50 la luna pasa por encima del
       punto de llegada y el sector queda imposible */
    if(forma==='satelite') r=Math.max(r, 1.50);""")

cam(
"""    while(v.mejor<min && intentos++<12){
      const a=niv.anillos[k];
      if(a.length>1 && intentos%5===0) a.pop();
      else for(const ro of a) ro.w*=0.88;
      v=ventana(A,B,a,vel);
    }""",
"""    while((v.mejor<min || v.fraccion<FRAC_MIN) && intentos++<14){
      const a=niv.anillos[k];
      if(a.length>1 && intentos%4===0) a.pop();
      else for(const ro of a) ro.w*=0.88;
      v=ventana(A,B,a,vel);
    }
    /* LA RED DE SEGURIDAD. Aflojar la velocidad no arregla una geometria que TAPA el destino: por
       rapido o lento que gire, el hueco no existe. Si despues de todo eso el sector sigue sin servir
       se sacan rotores de a uno; si con uno solo tampoco alcanza, ese ultimo se vuelve una bola fija
       y se frena — pero CON PISO, porque una espina a 0,2 radianes por segundo tarda treinta
       segundos en dar la vuelta y eso no es un peligro, es un adorno. Y si ni asi, el sector queda
       vacio: un respiro es infinitamente mejor que un sector imposible. */
    while((v.mejor<min || v.fraccion<FRAC_MIN) && niv.anillos[k].length>1){
      niv.anillos[k].pop();
      v=ventana(A,B,niv.anillos[k],vel);
    }
    if((v.mejor<min || v.fraccion<FRAC_MIN) && niv.anillos[k].length){
      const ro=niv.anillos[k][0], W_MIN=0.55;
      ro.forma='bola'; ro.tipo='fijo'; ro.amp=0; ro.pa=0;
      ro.r=Math.max(ro.r, 1.45);
      let s2=0;
      while((v.mejor<min || v.fraccion<FRAC_MIN) && s2++<10 && Math.abs(ro.w)>W_MIN){
        ro.w*=0.80;
        if(Math.abs(ro.w)<W_MIN) ro.w=(ro.w<0? -W_MIN : W_MIN);
        v=ventana(A,B,niv.anillos[k],vel);
      }
      if(v.mejor<min || v.fraccion<FRAC_MIN){ niv.anillos[k].length=0;
        v=ventana(A,B,niv.anillos[k],vel); }
    }""")


# =========================================================================================
# 16. UN ROTOR NO PUEDE QUEDAR CASI QUIETO (y el auto-jugador tampoco puede quedarse ciego)
#
#     El 5·16 salio "sin ventana" al jugarlo solo, aunque la auditoria lo daba por bueno. Las dos
#     cosas eran ciertas y el defecto estaba en el medio: la red de seguridad frenaba el rotor hasta
#     diez veces por 0,80, o sea hasta el 10,7% de su velocidad. Un rotor a 0,2 radianes por segundo
#     tarda TREINTA SEGUNDOS en dar una vuelta: la ventana existe -por eso la auditoria la ve, que
#     barre desde cero- pero desde el instante en que el jugador esta parado ahi puede tardar mas de
#     los diez segundos que mira el buscador en volver a abrirse. Y ademas se ve horrible: una espina
#     que practicamente no se mueve no es un peligro, es un adorno.
#     Ahora la velocidad tiene PISO. Si con el piso puesto el sector sigue sin ventana, el rotor se
#     saca del todo: un sector sin enemigo es un respiro, y un respiro es infinitamente mejor que un
#     sector imposible o que uno con una espina congelada.
# =========================================================================================

# =========================================================================================
# 17. EL AUTO-JUGADOR: una ventana que no se cierra sigue siendo una ventana
# =========================================================================================
cam(
"""    return 'sin ventana';
  },""",
"""    /* SI EL BARRIDO TERMINA ADENTRO DE UNA VENTANA, ESO ES UNA VENTANA. La version anterior solo
       devolvia el hueco cuando lo veia CERRARSE, asi que un sector que estuviera libre hasta el
       final de los diez segundos que mira se reportaba como "sin ventana" — o sea que el caso mas
       facil de todos se leia como el imposible. */
    if(ini>=0){
      const fin=tiempo + 4799*P, largo=fin-ini;
      if(largo>=MIN) return { esperar:+((ini + largo/2) - tiempo).toFixed(4), ventana:+largo.toFixed(3) };
    }
    return 'sin ventana';
  },""")


# =========================================================================================
# 18. EL AGUJERO DE FONDO DEL VALIDADOR: "existe una ventana" no es "se puede jugar"
#
#     El 5·16 seguia sin poder jugarse en el sector 8 aunque la auditoria le daba 0,167 s de ventana,
#     por encima del minimo. LAS DOS COSAS ERAN CIERTAS, y el defecto estaba justo en el medio.
#
#     ventana() barre los primeros 3,6 segundos del nivel y devuelve el hueco mas largo QUE HAY AHI.
#     Pero el jugador llega al sector 8 cuando llega —a los treinta segundos, o a los noventa— y con
#     cuatro rotores a frecuencias que no son multiplos entre si (2,44 · -2,29 · 2,26 · -2,57) el
#     patron nunca se repite igual: el hueco de 0,167 s que existe al principio puede no volver a
#     abrirse en los diez segundos siguientes al instante en que el jugador esta parado ahi.
#     Con uno o dos rotores no se notaba porque el patron casi se repetia; con cuatro, la fraccion
#     segura cayo al 6,4% y el problema salio a la luz.
#
#     EL ARREGLO NO ES BARRER MAS TIEMPO -eso solo corre el problema mas lejos- sino pedir tambien
#     una FRACCION MINIMA DE INSTANTES SEGUROS. "Hay un hueco" es una propiedad del principio del
#     nivel; "el 12% de los instantes sirve" es una propiedad del sector, y esa si vale en cualquier
#     momento. Con 12% hay casi medio segundo util por cada 3,6 s, repartido en varios huecos.
# =========================================================================================
cam(
"""const BARRIDO=3.6, PASO_BARRIDO=1/96, PASO_VUELO=1/220;""",
"""const BARRIDO=3.6, PASO_BARRIDO=1/96, PASO_VUELO=1/220;
/* el 12% de los instantes de salida tiene que servir. No alcanza con que EXISTA un hueco: el
   jugador no llega al sector en el segundo cero. */
const FRAC_MIN=0.12;""")




cam(
"""    const vel=velDe(mundoAct), P=1/240, MIN=minVent||0.07;
    let ini=-1;
    for(let k=0;k<2400;k++){""",
"""    const vel=velDe(mundoAct), P=1/240, MIN=minVent||0.07;
    let ini=-1;
    for(let k=0;k<4800;k++){""")

io.open(RUTA,'w',encoding='utf8').write(s)
print('parche_hub: %d cambios, %d ya estaban. %d -> %d' % (hechos, saltados, ANTES, len(s)))
