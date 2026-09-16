# -*- coding: utf-8 -*-
"""
Eco: el menu deja de ir a tirones, dice menos, trae tres calidades, y el TUTORIAL SE MUDA A UNA SALA
APARTE — para que no se confunda con el juego de verdad.

IDEMPOTENTE. Guardia: si el texto NUEVO ya esta, no se toca. Nada de "y ademas el viejo no esta".
"""
import io, os

RUTA = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'juegos-pc', 'Eco.html'))
s = io.open(RUTA, encoding='utf8').read()
ANTES = len(s)
hechos = saltados = 0

def cam(a, b):
    global s, hechos, saltados
    if b in s:
        saltados += 1; return
    if a not in s:
        raise SystemExit('NO ENCONTRADO:\n' + a[:220])
    s = s.replace(a, b, 1); hechos += 1

# =========================================================================================
# 1. EL MENU YA NO REPINTA LA PANTALLA ENTERA TRES VECES POR CUADRO
# =========================================================================================
cam(
"""  #ondasM i{ position:absolute; left:50%; top:50%; width:12px; height:12px; margin:-6px 0 0 -6px;
    border-radius:50%; border:1px solid rgba(150,175,205,.30);
    animation:crecer 6.2s linear infinite; }
  #ondasM i:nth-child(2){ animation-delay:2.07s; }
  #ondasM i:nth-child(3){ animation-delay:4.14s; }
  @keyframes crecer{
    0%{   transform:scale(1);   opacity:0; border-width:2px; }
    12%{  opacity:.55; }
    100%{ transform:scale(130); opacity:0; border-width:.4px; } }""",
"""  /* EL ANCHO DEL BORDE ESTABA ANIMADO, Y ESO NO SE PUEDE COMPONER EN LA GPU. Un `transform` y un
     `opacity` los resuelve el compositor sin volver a pintar nada; un `border-width` obliga a
     recalcular y REPINTAR el elemento en cada cuadro — y estos elementos llegan a escala 130, o sea
     que cada uno tapa la pantalla entera. Tres anillos = tres repintados de pantalla completa por
     cuadro, para dibujar un aro. Ahora el borde es fijo y solo se mueven transform y opacity.
     `will-change` lo manda a su propia capa, asi el resto del menu ni se entera. */
  #ondasM i{ position:absolute; left:50%; top:50%; width:12px; height:12px; margin:-6px 0 0 -6px;
    border-radius:50%; border:1px solid rgba(150,175,205,.30);
    will-change:transform,opacity; animation:crecer 6.2s linear infinite; }
  #ondasM i:nth-child(2){ animation-delay:2.07s; }
  #ondasM i:nth-child(3){ animation-delay:4.14s; }
  @keyframes crecer{
    0%{   transform:scale(1);   opacity:0; }
    12%{  opacity:.5; }
    100%{ transform:scale(130); opacity:0; } }""")

# el titulo latia con text-shadow, que tambien repinta. Va a opacity sobre un resplandor aparte.
cam(
"""  #tit{ font-size:clamp(38px,9.4vw,96px); font-weight:900; letter-spacing:.34em;
    margin-left:.34em; line-height:.98;
    animation:latir 3.6s ease-in-out infinite; }
  @keyframes latir{ 0%,100%{ text-shadow:0 0 0 rgba(255,255,255,0); color:#8b98a6; }
                    50%{ text-shadow:0 0 44px rgba(255,255,255,.60); color:#ffffff; } }""",
"""  /* MISMO PROBLEMA QUE LOS ANILLOS: animar `text-shadow` repinta el texto y su halo en cada
     cuadro. El latido ahora es una COPIA del titulo, borrosa, detras, a la que solo se le mueve la
     opacidad — que si se compone. Se ve igual y no cuesta nada. */
  #titW{ position:relative; }
  #tit{ font-size:clamp(38px,9.4vw,96px); font-weight:900; letter-spacing:.34em;
    margin-left:.34em; line-height:.98; color:#aab6c4; }
  #titG{ position:absolute; inset:0; pointer-events:none; color:#ffffff;
    font-size:clamp(38px,9.4vw,96px); font-weight:900; letter-spacing:.34em;
    margin-left:.34em; line-height:.98; filter:blur(13px); opacity:.2;
    will-change:opacity; animation:latir 3.6s ease-in-out infinite; }
  @keyframes latir{ 0%,100%{ opacity:.10; } 50%{ opacity:.72; } }""")

# =========================================================================================
# 2. MENOS TEXTO: tres parrafos pasan a tres lineas
# =========================================================================================
cam(
"""  #fichas{ display:flex; gap:clamp(8px,1.4vw,20px); justify-content:center; flex-wrap:nowrap;
    padding:0 3%; max-width:96%; }
  .ficha{ flex:1 1 0; min-width:0; max-width:230px; padding:clamp(8px,1.2vw,15px) clamp(8px,1.1vw,15px);
    border:1px solid rgba(255,255,255,.075); background:rgba(160,185,215,.028); text-align:left; }
  .ficha h4{ margin:0 0 .5em; font-size:clamp(7.5px,.86vw,9.5px); font-weight:900;
    letter-spacing:.26em; color:#7c8b9b; text-transform:uppercase; }
  .ficha p{ margin:0; font-size:clamp(9px,1.02vw,12px); line-height:1.62; color:#9fb0c1; }
  .ficha b{ color:#e2ebf4; font-weight:800; }""",
"""  /* TRES PARRAFOS PASAN A TRES LINEAS. Habia tres fichas de sesenta palabras cada una en la
     pantalla que el jugador mira durante ocho segundos: eso no se lee, se saltea, y lo que se
     saltea es lo mismo que despues no se entiende. Lo largo se cuenta en la historia y se APRENDE
     en la sala de practica; el menu solo tiene que decir de que va. */
  #fichas{ display:flex; gap:clamp(10px,1.8vw,26px); justify-content:center; flex-wrap:wrap;
    padding:0 4%; max-width:96%; }
  .ficha{ font-size:clamp(8.5px,1.0vw,11.5px); font-weight:700; letter-spacing:.20em;
    color:#8b9bab; text-transform:uppercase; }
  .ficha b{ color:#dbe6f1; font-weight:900; }

  /* ---------- LAS TRES CALIDADES ----------
     Va en el menu principal y no adentro de un submenu: es lo primero que hay que poder tocar
     cuando el juego va a tirones, y si esta escondido detras de dos toques no existe. */
  #calFila{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:center; }
  #calFila .rot{ font-size:clamp(7.5px,.86vw,9.5px); font-weight:900; letter-spacing:.26em;
    color:#5d6a78; text-transform:uppercase; }
  .calB{ font:inherit; font-size:clamp(8px,.92vw,10.5px); font-weight:800; letter-spacing:.20em;
    text-transform:uppercase; padding:6px 13px; border-radius:999px; cursor:pointer;
    color:#8b9bab; background:transparent; border:1px solid rgba(255,255,255,.13);
    transition:color .18s ease, border-color .18s ease, background .18s ease; }
  .calB:hover{ color:#e8eef5; border-color:rgba(232,238,245,.42); }
  .calB.si{ color:#04060a; background:#c9d6e3; border-color:#c9d6e3; }""")

cam(
"""      <img id="logoEco" alt="ECO">
      <div id="tit">ECO</div>
      <div id="sub" data-i18n="sub"></div>
      <div id="fichas">
        <div class="ficha"><h4 data-i18n="f1t"></h4><p data-i18n="f1b"></p></div>
        <div class="ficha"><h4 data-i18n="f2t"></h4><p data-i18n="f2b"></p></div>
        <div class="ficha"><h4 data-i18n="f3t"></h4><p data-i18n="f3b"></p></div>
      </div>""",
"""      <img id="logoEco" alt="ECO">
      <div id="titW"><div id="titG" aria-hidden="true">ECO</div><div id="tit">ECO</div></div>
      <div id="sub" data-i18n="sub"></div>
      <div id="fichas">
        <div class="ficha" data-i18n="f1b"></div>
        <div class="ficha" data-i18n="f2b"></div>
        <div class="ficha" data-i18n="f3b"></div>
      </div>
      <div id="calFila">
        <span class="rot" data-i18n="calidad"></span>
        <button class="calB" data-cal="baja"  data-i18n="calBaja"></button>
        <button class="calB" data-cal="media" data-i18n="calMedia"></button>
        <button class="calB" data-cal="alta"  data-i18n="calAlta"></button>
      </div>""")


# =========================================================================================
# 3. LOS TEXTOS: tres lineas cortas, las calidades y la sala
# =========================================================================================
cam(
""" f1t:{en:'The voice', es:'La voz', pt:'A voz'},""",
""" calidad:{en:'GRAPHICS', es:'GRÁFICOS', pt:'GRÁFICOS'},
 calBaja:{en:'LOW', es:'BAJA', pt:'BAIXA'},
 calMedia:{en:'MEDIUM', es:'MEDIA', pt:'MÉDIA'},
 calAlta:{en:'HIGH', es:'ALTA', pt:'ALTA'},
 /* la sala de practica: un cuarto aparte, antes del laberinto */
 sTit:{en:'PRACTICE ROOM', es:'SALA DE PRÁCTICA', pt:'SALA DE PRÁTICA'},
 sObj:{en:'PRACTICE ROOM', es:'SALA DE PRÁCTICA', pt:'SALA DE PRÁTICA'},
 sObjS:{en:'this is not the maze yet · learn here', es:'esto todavía no es el laberinto · aprendé acá', pt:'isto ainda não é o labirinto · aprenda aqui'},
 sEntra:{en:'THE MAZE', es:'EL LABERINTO', pt:'O LABIRINTO'},
 sEntraS:{en:'practice is over · from here it is real', es:'la práctica terminó · de acá en más es de verdad', pt:'a prática acabou · daqui em diante é de verdade'},
 f1t:{en:'The voice', es:'La voz', pt:'A voz'},""")

cam(
""" f1b:{en:'There are no buttons. The game uses <b>your real microphone</b>: whatever you say out loud is the only light there is. A whisper draws six metres of stone; a shout draws fifty.',""",
""" f1b:{en:'your <b>real voice</b> is the only light',
      es:'tu <b>voz de verdad</b> es la única luz',
      pt:'sua <b>voz real</b> é a única luz'},
 f1bViejo:{en:'There are no buttons. The game uses <b>your real microphone</b>: whatever you say out loud is the only light there is. A whisper draws six metres of stone; a shout draws fifty.',""")

cam(
""" f2b:{en:'There is <b>a thing</b> down here and it hunts by sound. It hears <b>exactly as far as you see</b>. Walking costs nothing — your feet make no sound at all. Only your voice does, and every time you use it you are also telling it where you are.',""",
""" f2b:{en:'something <b>hears you as far as you see</b>',
      es:'algo <b>te oye hasta donde ves</b>',
      pt:'algo <b>te ouve até onde você vê</b>'},
 f2bViejo:{en:'There is <b>a thing</b> down here and it hunts by sound. It hears <b>exactly as far as you see</b>. Walking costs nothing — your feet make no sound at all. Only your voice does, and every time you use it you are also telling it where you are.',""")

cam(
""" f3b:{en:'There are <b>four keys</b>, one in each of the four big rooms. A key <b>rings back</b> when your voice reaches it — late, because the sound has to travel there and back. Shout, then shut up and listen. Four keys open the door.',""",
""" f3b:{en:'<b>four keys</b> and the door opens',
      es:'<b>cuatro llaves</b> y la puerta abre',
      pt:'<b>quatro chaves</b> e a porta abre'},
 f3bViejo:{en:'There are <b>four keys</b>, one in each of the four big rooms. A key <b>rings back</b> when your voice reaches it — late, because the sound has to travel there and back. Shout, then shut up and listen. Four keys open the door.',""")

cam(
""" t3:{en:'SHUT UP AND LISTEN', es:'CALLATE Y ESCUCHÁ', pt:'CALE-SE E ESCUTE'},""",
""" t3b:{en:'SHUT UP AND LISTEN', es:'CALLATE Y ESCUCHÁ', pt:'CALE-SE E ESCUTE'},
 t3bs:{en:'there is <b>a practice key</b> in this room · it rang back a moment after your shout · go and take it',
       es:'hay <b>una llave de práctica</b> en esta sala · contestó un momento después de tu grito · andá y agarrala',
       pt:'há <b>uma chave de prática</b> nesta sala · ela respondeu um instante depois do seu grito · vá e pegue'},
 t4b:{en:'THAT IS THE WHOLE GAME', es:'ESO ES TODO EL JUEGO', pt:'ISSO É O JOGO TODO'},
 t4bs:{en:'the maze is next, and it is much bigger · from there on something is hunting you',
       es:'ahora viene el laberinto, y es mucho más grande · de ahí en más algo te caza',
       pt:'agora vem o labirinto, e é bem maior · daí em diante algo te caça'},
 t3:{en:'SHUT UP AND LISTEN', es:'CALLATE Y ESCUCHÁ', pt:'CALE-SE E ESCUTE'},""")

# =========================================================================================
# 4. LAS TRES CALIDADES
# =========================================================================================
cam(
"""const MAX_ONDAS=8;""",
"""/* ===================== LAS TRES CALIDADES =====================
   Que cambia cada una, y por que esas tres cosas y no otras:
   · LA RESOLUCION es el unico ajuste que siempre paga. Todo lo que se dibuja aca pasa por el shader
     del sonido, que recorre las ocho ondas POR PIXEL: la mitad de pixeles es literalmente la mitad
     de trabajo. Es el mismo hallazgo que en Maicol, donde el lienzo se estaba dibujando al doble de
     la resolucion de diseno.
   · LAS ONDAS SIMULTANEAS, porque ese bucle es el costo del shader y nada mas.
   · LOS MODELOS 3D, que son 537 KB de la cosa mas cuatro props con esqueleto e instancias. En baja
     vuelve el cuerpo de cajas, que ya existe y sigue siendo un monstruo.
   No se toca el grano ni las rayas: son LA imagen del juego, y un ajuste de calidad que cambia lo
   que el juego ES no es un ajuste de calidad, es otro juego. */
const CAL={ baja:{ px:0.60, ondas:4, modelos:false, grano:0 },
            media:{ px:0.85, ondas:6, modelos:true,  grano:1 },
            alta:{ px:2.00, ondas:8, modelos:true,  grano:1 } };
let calidad='media';
try{ const g=localStorage.getItem('eco_cal'); if(g && CAL[g]) calidad=g; }catch(e){}
let ONDAS_TOPE=CAL[calidad].ondas;
/* VA ACA ARRIBA Y NO AL LADO DE cargarModelos(), QUE ES DONDE "CORRESPONDE" TEMATICAMENTE.
   aplicarCalidad() se llama al armar el menu, mil lineas antes, y llama a calModelos(): un `let`
   leido antes de su linea tira ReferenceError y eso no rompe una funcion, rompe el modulo ENTERO.
   Es la tercera vez en este proyecto que una declaracion puesta donde queda linda tira todo abajo. */
let modelosPedidos=false, modelosListos=false;
const MAX_ONDAS=8;""")

cam(
"""  let i=-1;
  for(let k=0;k<MAX_ONDAS;k++) if(!ondas.some(o=>o.i===k)){ i=k; break; }""",
"""  let i=-1;
  /* el tope de calidad se aplica ACA y no en el shader: los huecos por encima del tope no se usan
     nunca, asi que su uDat queda en -1 y el bucle del fragmento los saltea en la primera linea */
  const tope=Math.min(MAX_ONDAS, ONDAS_TOPE);
  for(let k=0;k<tope;k++) if(!ondas.some(o=>o.i===k)){ i=k; break; }""")

cam(
"""    uEco:{value:0},
    uAbierta:{value:0},
    uT:{value:0}""",
"""    uEco:{value:0},
    uAbierta:{value:0},
    uGrano:{value:CAL[calidad].grano},
    uT:{value:0}""")

cam(
"""    uniform float uEco; uniform float uAbierta;""",
"""    uniform float uEco; uniform float uAbierta; uniform float uGrano;""")

cam(
"""      float grano=fract(sin(dot(vW.xz*4.1 + vW.y*2.7, vec2(12.9898,78.233)))*43758.5453);
      luz *= 0.93 + 0.14*grano;""",
"""      if(uGrano > 0.5){
        float grano=fract(sin(dot(vW.xz*4.1 + vW.y*2.7, vec2(12.9898,78.233)))*43758.5453);
        luz *= 0.93 + 0.14*grano;
      }""")

cam(
"""cargarModelos();""",
"""/* EN BAJA NO SE PIDEN LOS MODELOS. No es solo el medio mega de descarga: es el esqueleto de la
   cosa, que se recalcula por cuadro, y cuatro mallas instanciadas mas. El cuerpo de cajas no se
   borro nunca justamente para esto. */
function calModelos(){ if(CAL[calidad].modelos && !modelosPedidos){ modelosPedidos=true; cargarModelos(); } }
modelosListos=true;
calModelos();""")

cam(
"""/* ===================== EL MENU ===================== */
let jugando=false, tiempo=0, ganado=false, selloAviso=0;""",
"""/* ===================== EL MENU ===================== */
let jugando=false, tiempo=0, ganado=false, selloAviso=0;
function aplicarCalidad(c, guardar){
  if(!CAL[c]) return;
  calidad=c;
  if(guardar!==false){ try{ localStorage.setItem('eco_cal', c); }catch(e){} }
  const q=CAL[c];
  ONDAS_TOPE=q.ondas;
  matMundo.uniforms.uGrano.value=q.grano;
  render.setPixelRatio(Math.min(devicePixelRatio||1, q.px));
  ajustarCuadro();                 // setPixelRatio sin volver a medir no cambia el buffer
  /* OJO: solo DESPUES de que exista la tabla de modelos. aplicarCalidad() corre al armar el menu,
     mil lineas antes de MOD, y calModelos() lee MOD: un const leido antes de su linea tira
     ReferenceError y se cae el modulo entero. Es exactamente el mismo defecto que modelosPedidos,
     dos veces en el mismo parche. La primera carga la dispara el propio calModelos() de mas abajo. */
  if(modelosListos) calModelos();
  for(const b of document.querySelectorAll('.calB')) b.classList.toggle('si', b.dataset.cal===c);
}
for(const b of document.querySelectorAll('.calB')){
  const ir=()=>aplicarCalidad(b.dataset.cal);
  b.addEventListener('click', ir);
  b.addEventListener('touchstart', ev=>{ ev.preventDefault(); ir(); }, {passive:false});
}
aplicarCalidad(calidad, false);""")

# =========================================================================================
# 5. NO SE DIBUJA EL MUNDO DEBAJO DEL MENU
# =========================================================================================
cam(
"""function animar(){
  requestAnimationFrame(animar);
  const dt=Math.min(0.05, reloj.getDelta());
  matMundo.uniforms.uT.value+=dt;
""",
"""function animar(){
  requestAnimationFrame(animar);
  const dt=Math.min(0.05, reloj.getDelta());
  matMundo.uniforms.uT.value+=dt;

  /* EL MENU IBA A OCHO CUADROS POR SEGUNDO Y LA CULPA NO ERA DEL MENU: debajo se estaba dibujando
     EL JUEGO ENTERO —29 llamadas, 80.487 triangulos, la cosa con esqueleto— tapado por un panel
     negro y opaco que no deja ver ni un pixel de eso. Se dibujaba para nadie.
     Mientras no se juega no hay nada que mostrar, asi que no se dibuja: ni el mundo, ni el HUD, ni
     el medidor del microfono, que ademas hacia tres querySelector por cuadro. */
  if(!jugando){ return; }
""")


# =========================================================================================
# 6. LA SALA DE PRACTICA: UN CUARTO APARTE, LEJOS DEL LABERINTO
# =========================================================================================
cam(
"""/* se llena mas abajo, cuando se plantan los tambores. Va declarado ACA porque corregir() lo lee y
   una constante leida antes de su linea tira ReferenceError y se cae el modulo entero. */
const OBST=[];""",
"""/* se llena mas abajo, cuando se plantan los tambores. Va declarado ACA porque corregir() lo lee y
   una constante leida antes de su linea tira ReferenceError y se cae el modulo entero. */
const OBST=[];

/* ===================== LA SALA DE PRACTICA =====================
   EL TUTORIAL SE MUDA A UN CUARTO APARTE. Antes se aprendia adentro del laberinto de verdad, y eso
   tiene un problema que no es de comodidad: en un juego donde no se ve nada, el jugador no puede
   distinguir "esto es una leccion" de "esto es la partida". Aprendia mientras se perdia, y despues
   no sabia cual de las dos cosas le estaba pasando.
   Ahora es un cuarto RECTANGULAR de trece por trece, sin un solo cruce: cuatro paredes rectas son
   la forma mas rapida de decir "esto no es el laberinto", porque el laberinto es justamente lo que
   no tiene cuatro paredes rectas.

   VA A CIENTO DIEZ METROS AL NORTE, y el numero sale de una cuenta: el grito mas fuerte alcanza 50 m
   y el laberinto mide 46 de lado, o sea 33 de centro a esquina. A 110 la esquina mas cercana queda a
   77 m, mas que cualquier grito: desde la sala no se puede despertar ni una llave ni a la cosa.
   Y las colisiones no salen de la grilla —afuera de la grilla toda celda es pared y el jugador
   quedaria clavado en el lugar— sino de un recorte al rectangulo, que para un cuarto es exacto. */
const SALA_Z=-110, SALA_MEDIO=6.5;
let enSala=true;
const salaLlave={ x:0, z:SALA_Z-4.4, oida:false, tomada:false, giro:0, g:null, mat:null };
const salaGrupo=new THREE.Group(); escena.add(salaGrupo);
(function construirSala(){
  const gs=[], meter=(w,h,d,x,y,z)=>{ const g=new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); gs.push(g); };
  const L=SALA_MEDIO*2, GR=0.34;
  meter(L+2, 0.4, L+2, 0, -0.2, SALA_Z);                     // piso
  meter(L+2, 0.4, L+2, 0, ALTO+0.2, SALA_Z);                 // techo
  meter(L+GR, ALTO, GR, 0, ALTO/2, SALA_Z-SALA_MEDIO);       // norte
  meter(L+GR, ALTO, GR, 0, ALTO/2, SALA_Z+SALA_MEDIO);       // sur
  meter(GR, ALTO, L+GR, -SALA_MEDIO, ALTO/2, SALA_Z);        // oeste
  meter(GR, ALTO, L+GR,  SALA_MEDIO, ALTO/2, SALA_Z);        // este
  /* cuatro pilastras y dos escalones. No es adorno: en un cuarto vacio todas las paredes devuelven
     la onda igual y no hay con que medir cuanto caminaste. Un objeto en el medio es una regla. */
  for(const [px,pz] of [[-3.2,-3.2],[3.2,-3.2],[-3.2,3.2],[3.2,3.2]])
    meter(0.5, ALTO, 0.5, px, ALTO/2, SALA_Z+pz);
  meter(3.2, 0.22, 1.0, 0, 0.11, SALA_Z+4.2);
  /* el pedestal de la llave de practica */
  const pe=new THREE.CylinderGeometry(0.26,0.38,0.70,10,1); pe.translate(salaLlave.x,0.35,salaLlave.z); gs.push(pe);
  const g=mergeGeometries(gs,false);
  for(const q of gs) q.dispose();
  const m=new THREE.Mesh(g, matMundo); m.frustumCulled=false; salaGrupo.add(m);

  /* LA LLAVE DE PRACTICA. Es la misma pieza que las cuatro de verdad y contesta igual —con la misma
     demora de ida y vuelta— pero NO cuenta como sello: si contara, el jugador entraria al laberinto
     con una llave regalada y las cuatro salas dejarian de tener sentido. */
  const mat=new THREE.MeshBasicMaterial({color:0x000000});
  const gr=new THREE.Group();
  const aro=new THREE.Mesh(new THREE.TorusGeometry(0.19,0.045,8,16), mat); aro.position.y=0.20; gr.add(aro);
  const cana=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.46,0.055), mat); cana.position.y=-0.20; gr.add(cana);
  for(let d=0;d<2;d++){ const di=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.05,0.058), mat);
    di.position.set(0.085, -0.28-d*0.11, 0); gr.add(di); }
  gr.position.set(salaLlave.x, 1.02, salaLlave.z); gr.frustumCulled=false;
  salaGrupo.add(gr);
  salaLlave.g=gr; salaLlave.mat=mat;
})();
function salaOye(x,z,alcance){
  if(!enSala || salaLlave.tomada) return;
  const d=Math.hypot(salaLlave.x-x, salaLlave.z-z);
  if(d > alcance*0.86) return;
  const era=salaLlave.oida; salaLlave.oida=true;
  setTimeout(()=>{ if(!salaLlave.tomada){ son('llave', 0.9);
    if(!era) avisar(TX('aLlaveSuena'), 2.2); } }, Math.round(2*d/VEL_SONIDO*1000));
}
function salaTick(dt){
  if(!enSala || salaLlave.tomada) return;
  salaLlave.giro+=dt*0.9;
  salaLlave.g.rotation.y=salaLlave.giro;
  salaLlave.g.position.y=1.02+Math.sin(salaLlave.giro*1.7)*0.045;
  const d=Math.hypot(jug.x-salaLlave.x, jug.z-salaLlave.z);
  const b=0.05+0.55*Math.max(0,1-d/8.5)+0.35*eco;
  salaLlave.mat.color.setRGB(b*0.98, b*0.86, b*0.52);
  if(jugando && d<2.20){ salaLlave.tomada=true; salaLlave.g.visible=false; son('sello', 1); }
}
/* SALIR DE LA SALA. La sala entera se apaga —no se borra— y el jugador aparece en la entrada del
   laberinto con un fogonazo, que es la unica forma de que se entienda que cambio de lugar en un
   juego donde no se ve nada. */
function salirSala(){
  if(!enSala) return;
  enSala=false;
  salaGrupo.visible=false;
  jug.x=(0-(N-1)/2)*CEL; jug.z=(0-(N-1)/2)*CEL;
  jug.vx=jug.vz=0;
  tiempo=0;                                  // la cosa cuenta sus doce segundos desde el laberinto
  emitir(jug.x, jug.y, jug.z, 1.0, 46);
  eco=1; flashT=1.1;
  avisar(TX('sEntra'), 3.0);
}""")

cam(
"""function corregir(px,pz,nx,nz){
  /* se resuelve eje por eje: asi al raspar una pared uno DESLIZA por ella en vez de frenar en seco,
     que es la diferencia entre un movimiento que se siente bien y uno que se traba en cada esquina */
  const [i,j]=celdaDe(px,pz);""",
"""function corregir(px,pz,nx,nz){
  /* EN LA SALA NO HAY GRILLA. celdaDe() de un punto a 110 m del laberinto da indices fuera de rango,
     y paredEn() devuelve true fuera de rango —que es lo correcto para el laberinto, porque el borde
     es pared— asi que el jugador quedaria trabado en el lugar. Un cuarto rectangular se resuelve
     recortando, y recortar es exacto: no hay esquina que raspar. */
  if(enSala){
    const m=SALA_MEDIO-0.17-RADIO;
    let x=Math.max(-m, Math.min(m, nx)), z=Math.max(SALA_Z-m, Math.min(SALA_Z+m, nz));
    for(const o of OBST){
      const dx=x-o.x, dz=z-o.z, d=Math.hypot(dx,dz), l2=o.r+RADIO;
      if(d>1e-4 && d<l2){ x=o.x+dx/d*l2; z=o.z+dz/d*l2; }
    }
    return [x,z];
  }
  /* se resuelve eje por eje: asi al raspar una pared uno DESLIZA por ella en vez de frenar en seco,
     que es la diferencia entre un movimiento que se siente bien y uno que se traba en cada esquina */
  const [i,j]=celdaDe(px,pz);""")

# el jugador arranca EN LA SALA
cam(
"""const jug={
  x:(0-(N-1)/2)*CEL, z:(0-(N-1)/2)*CEL, y:OJO,
  vx:0, vz:0, vy:0, giro:0, alto:0, enPiso:true, agachado:false,""",
"""const jug={
  /* arranca en la SALA DE PRACTICA, no en el laberinto, Y MIRANDO AL LARGO DEL CUARTO.
     Se midio y estaba mal: ADEL es (sin giro, 0, cos giro), o sea que giro=0 mira hacia +Z — que
     desde el arranque es la pared de atras a 1,9 m. El grito llenaba la pantalla de un gris
     PERFECTAMENTE PAREJO (brillo medio 59,7 y las cinco franjas en 59,7: una sola superficie a
     quemarropa) y no se veia el cuarto por ningun lado. En el laberinto nunca se noto porque ahi se
     empezaba en una esquina y para cualquier lado hay pared a dos metros. */
  x:0, z:SALA_Z+4.6, y:OJO,
  vx:0, vz:0, vy:0, giro:Math.PI, alto:0, enPiso:true, agachado:false,""")

# el ruido despierta la llave de practica
cam(
"""  if(!jugando || !enciende) return;
  llavesOyen(x, z, alcance);""",
"""  if(!jugando || !enciende) return;
  if(enSala){ salaOye(x, z, alcance); }
  else llavesOyen(x, z, alcance);""")

# =========================================================================================
# 7. EL TUTORIAL PASA A SER EL DE LA SALA
# =========================================================================================
cam(
"""  { t:()=>TX('t3'), s:()=>TX('t3s'), k:()=>'',
    p:()=>Math.min(1, nSellos()? 1 : tutoT/70), ok:()=>nSellos()>0 || tutoT>70 },
  { t:()=>TX('t4'), s:()=>TX('t4s'), k:()=>'',
    p:()=>Math.min(1, tutoT/6), ok:()=>tutoT>6 }
];""",
"""  { t:()=>TX('t3b'), s:()=>TX('t3bs'), k:()=>'',
    p:()=>Math.min(1, salaLlave.tomada? 1 : tutoT/70), ok:()=>salaLlave.tomada || tutoT>70 },
  { t:()=>TX('t4b'), s:()=>TX('t4bs'), k:()=>'',
    p:()=>Math.min(1, tutoT/5), ok:()=>tutoT>5 }
];""")

cam(
"""    if(tutoPaso>=TUTO.length){ tutoListo=true; document.body.classList.remove('tutorial'); }""",
"""    if(tutoPaso>=TUTO.length){ tutoListo=true; document.body.classList.remove('tutorial');
      salirSala(); }""")

# la flecha y el objetivo, mientras se practica
cam(
"""function objetivo(){
  if(ganado) return { t:TX('oSaliste'), s:'' };""",
"""function objetivo(){
  if(enSala) return { t:TX('sObj'), s:TX('sObjS') };
  if(ganado) return { t:TX('oSaliste'), s:'' };""")

cam(
"""function objetivoLugar(){
  if(ganado) return null;""",
"""function objetivoLugar(){
  /* en la sala la flecha apunta a la llave de practica, y SOLO despues de que contesto: si apuntara
     desde el principio, el paso de gritar y escuchar no ensenaria nada */
  if(enSala) return (salaLlave.oida && !salaLlave.tomada)
    ? new THREE.Vector3(salaLlave.x, 1.1, salaLlave.z) : null;
  if(ganado) return null;""")

cam(
"""  ondasTick(dt);
  llavesTick(dt);
  cosaTick(dt);""",
"""  ondasTick(dt);
  if(enSala) salaTick(dt); else llavesTick(dt);
  if(!enSala) cosaTick(dt);""")

# =========================================================================================
# 8. GANCHOS
# =========================================================================================
cam(
"""  tutorial:()=>({ paso:tutoPaso, listo:tutoListo, t:+tutoT.toFixed(2),
                  ok:(()=>{ try{ return !!TUTO[tutoPaso] && !!TUTO[tutoPaso].ok(); }catch(e){ return 'ERR '+e.message; } })(),
                  andado:+tutoAndado.toFixed(2),""",
"""  calidad:(c)=>{ if(c) aplicarCalidad(c);
    return { cal:calidad, px:+render.getPixelRatio().toFixed(2), ondas:ONDAS_TOPE,
             grano:matMundo.uniforms.uGrano.value, modelos:modelosPedidos }; },
  sala:()=>({ enSala, z:SALA_Z, medio:SALA_MEDIO, visible:salaGrupo.visible,
              llave:{ oida:salaLlave.oida, tomada:salaLlave.tomada },
              lejosDelLaberinto:+Math.hypot(jug.x, jug.z-0).toFixed(1),
              pos:[+jug.x.toFixed(2), +jug.z.toFixed(2)] }),
  salirSala:()=>{ salirSala(); return { enSala, pos:[+jug.x.toFixed(2), +jug.z.toFixed(2)] }; },
  tutorial:()=>({ paso:tutoPaso, listo:tutoListo, andado:+tutoAndado.toFixed(2),""")

cam(
"""  #menu.conLogo #tit{ display:none; }""",
"""  /* con el logo puesto se esconde el titulo escrito Y SU RESPLANDOR. La primera version solo
     escondia #tit: el halo borroso seguia dibujado encima de la imagen y se leian las dos ECO
     superpuestas, una nitida y una fantasma. */
  #menu.conLogo #titW{ display:none; }""")

cam(
"""  /* la primera onda, de regalo: si el juego empieza en negro absoluto nadie entiende que paso */
  emitir(jug.x, jug.y, jug.z, 1.0, 40);
  eco=1;
  avisar(TX('aEscucha'), 3.0);""",
"""  /* la primera onda, de regalo: si el juego empieza en negro absoluto nadie entiende que paso.
     ALCANCE 15 Y NO 40: la sala mide trece metros, y una onda de cuarenta la cruza entera, rebota en
     nada y deja la pantalla blanca — que es justo lo contrario de ensenar como se ve una onda.
     Y el cartel decia "escuchá, hay una hoja acá al lado", que era cierto cuando se empezaba adentro
     del laberinto pegado a la primera nota. Ahora se empieza en la sala y ahi no hay ninguna hoja:
     un cartel que miente en el primer segundo es peor que no tener cartel. */
  emitir(jug.x, jug.y, jug.z, 1.0, 15);
  eco=1;
  avisar(TX('sTit'), 3.0);""")

io.open(RUTA,'w',encoding='utf8').write(s)
print('parche_sala parte 1: %d cambios, %d ya estaban. %d -> %d' % (hechos, saltados, ANTES, len(s)))
