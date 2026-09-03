# -*- coding: utf-8 -*-
"""El menu: nombre recortado y los dos hermanos entrando por los costados. Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:240]
    s=s.replace(a,b,n)

cam("""  <div id="menu" class="pant">
    <div id="arteMenu"></div>
    <div class="pantVelo"></div>
    <div id="tit">MAICOL</div>""",
"""  <div id="menu" class="pant">
    <div id="arteMenu"></div>
    <div class="pantVelo"></div>
    <img id="hIzq" alt="">
    <img id="hDer" alt="">
    <img id="logoMenu" alt="MAICOL">
    <div id="tit">MAICOL</div>""")

cam("""  #tit{ position:relative; z-index:2;""",
"""  /* EL NOMBRE ES UNA IMAGEN RECORTADA. Un titulo escrito con la fuente del sistema y tres
     sombras encima es lo que delata a un menu hecho en HTML; un logo dibujado se lee a juego. */
  #logoMenu{ position:relative; z-index:4; display:none;
    width:min(66%, calc(430px * var(--esc,1)));
    filter:drop-shadow(0 5px 0 rgba(0,0,0,.42)) drop-shadow(0 0 18px rgba(0,0,0,.35));
    animation:latir 3.4s ease-in-out infinite; }
  #logoMenu.hay{ display:block; }
  #menu #tit{ display:none; }
  @keyframes latir{ 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.035); } }
  /* LOS DOS HERMANOS, uno entrando por cada costado. Van pegados al borde de abajo y CORTADOS por
     el lado: un personaje entero y centrado se lee a calcomania pegada encima; uno que entra desde
     afuera del cuadro se lee a que el mundo sigue mas alla del menu. */
  #hIzq,#hDer{ position:absolute; bottom:0; z-index:2; display:none; pointer-events:none;
    height:min(58%, calc(330px * var(--esc,1)));
    filter:drop-shadow(0 0 12px rgba(0,0,0,.4)); }
  #hIzq.hay,#hDer.hay{ display:block; }
  #hIzq{ left:0;  animation:entraIzq .7s ease-out both, flotaI 4.2s ease-in-out 1s infinite; }
  #hDer{ right:0; animation:entraDer .7s ease-out both, flotaD 3.6s ease-in-out 1s infinite; }
  @keyframes entraIzq{ from{ transform:translate(-120%,0); } to{ transform:translate(-14%,0); } }
  @keyframes entraDer{ from{ transform:translate(120%,0);  } to{ transform:translate(14%,0); } }
  @keyframes flotaI{ 0%,100%{ transform:translate(-14%,0); } 50%{ transform:translate(-14%,-2.5%); } }
  @keyframes flotaD{ 0%,100%{ transform:translate(14%,0); }  50%{ transform:translate(14%,-3%); } }
  /* el contenido por encima de los hermanos */
  #menu #sub, #menu #cuento, #menu #niveles, #menu .fila, #menu #pie{ z-index:4; }
  #tit{ position:relative; z-index:2;""")

# el arte de fondo vuelve a verse entero: el telon nuevo no tiene personaje que tapar
cam("""    -webkit-mask-image:linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 26%, #000 62%, #000 100%);
    mask-image:linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 26%, #000 62%, #000 100%); }""",
"""    -webkit-mask-image:linear-gradient(to bottom, rgba(0,0,0,.62) 0%, #000 18%, #000 100%);
    mask-image:linear-gradient(to bottom, rgba(0,0,0,.62) 0%, #000 18%, #000 100%); }""")

cam("""  const am=document.getElementById('arteMenu');
  if(am && IMG.arte) am.style.backgroundImage='url('+IMG.arte.src+')';""",
"""  const am=document.getElementById('arteMenu');
  if(am && IMG.arte) am.style.backgroundImage='url('+IMG.arte.src+')';
  /* las piezas del menu se enganchan cuando ya cargaron: puestas antes, el navegador dibuja el
     hueco del <img> roto por un cuadro y se ve el parpadeo */
  for(const [id,k] of [['logoMenu','logo'],['hIzq','menuIzq'],['hDer','menuDer']]){
    const e=document.getElementById(id);
    if(e && IMG[k]){ e.src=IMG[k].src; e.classList.add('hay'); }
  }""")
open(H,'w',encoding='utf-8').write(s)
print('menu con logo y hermanos')
