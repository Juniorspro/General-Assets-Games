# -*- coding: utf-8 -*-
"""El nivel se pinta UNA VEZ, y el cielo se pre-escala. Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:240]
    s=s.replace(a,b,n)

# ---------------------------------------------------------------- 1. el nivel horneado
cam("""function dibujarCasillas(){
  const C=COLORES[tema], pat=patron();
  const i0=Math.max(0,Math.floor(camX/TAM)-1), i1=Math.min(MW-1,Math.ceil((camX+ANCHO)/TAM)+1);
  const j0=Math.max(0,Math.floor(camY/TAM)-1), j1=Math.min(MH-1,Math.ceil((camY+ALTO)/TAM)+1);
  cx.save(); cx.translate(-Math.round(camX), -Math.round(camY));
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){""",
"""/* EL NIVEL SE PINTA UNA SOLA VEZ, Y ESTO ERA LA OTRA MITAD DEL LAG.
   Las casillas no se mueven. Repintar las 286 que entran en pantalla cada cuadro -y cada una lleva
   un relleno de textura MAS un velo, o sea 572 rellenos- es rehacer 16 veces por segundo un dibujo
   que sale siempre igual. Se pinta el nivel completo en un lienzo aparte al cargarlo, y despues
   cada cuadro es UNA copia de la ventana visible.
   Medido en un telefono de 412x915: con todas las capas de fondo apagadas el juego va a 60,1
   cuadros por segundo y con ellas prendidas a 27,3, o sea que el fondo cuesta 20 ms por cuadro.
   Los adornos van horneados tambien -son estaticos-; los arboles del terreno no, porque se mecen. */
let LIENZO_NIV=null;
function hornearNivel(){
  LIENZO_NIV=null;
  const W=MW*TAM, H=MH*TAM;
  let g;
  try{ g=document.createElement('canvas'); g.width=W; g.height=H; }catch(e){ return; }
  const q=g.getContext('2d'); if(!q) return;
  let pat=null;
  const im=IMG['piso'+FONDOS[tema]];
  if(im){ try{ pat=q.createPattern(im,'repeat'); }catch(e){} }
  pintarCasillas(q, pat, COLORES[tema], 0, MW-1, 0, MH-1);
  const ad=IMG[DECOS[tema]];
  if(ad) for(const a of adornos){
    const cw=ad.width/NDECO, esc=ad.height/ad.height;
    q.save(); q.translate(Math.round(a.x), Math.round(a.y));
    if(a.m<0) q.scale(-1,1);
    q.drawImage(ad, a.k*cw, 0, cw, ad.height, -cw/2, -ad.height, cw, ad.height);
    q.restore();
  }
  LIENZO_NIV=g;
}
function pintarCasillas(cx, pat, C, i0, i1, j0, j1){
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){""")

cam("""      cx.beginPath(); cx.moveTo(bx+w/2,Y+TAM*0.18); cx.lineTo(bx+w,Y+TAM); cx.lineTo(bx+w*0.62,Y+TAM); cx.closePath(); cx.fill(); }
    }
  }
  cx.restore();
}""",
"""      cx.beginPath(); cx.moveTo(bx+w/2,Y+TAM*0.18); cx.lineTo(bx+w,Y+TAM); cx.lineTo(bx+w*0.62,Y+TAM); cx.closePath(); cx.fill(); }
    }
  }
}
/* la copia de la ventana. Si por lo que sea el lienzo del nivel no se pudo crear -memoria, un
   navegador viejo- se vuelve a pintar casilla por casilla, que anda igual y solo cuesta cuadros. */
function dibujarCasillas(){
  if(LIENZO_NIV){
    const W=MW*TAM, H=MH*TAM;
    const sx=Math.max(0, Math.min(W-ANCHO, Math.round(camX)));
    const sy=Math.max(0, Math.min(H-ALTO,  Math.round(camY)));
    cx.drawImage(LIENZO_NIV, sx, sy, ANCHO, ALTO, 0, 0, ANCHO, ALTO);
    return;
  }
  const i0=Math.max(0,Math.floor(camX/TAM)-1), i1=Math.min(MW-1,Math.ceil((camX+ANCHO)/TAM)+1);
  const j0=Math.max(0,Math.floor(camY/TAM)-1), j1=Math.min(MH-1,Math.ceil((camY+ALTO)/TAM)+1);
  cx.save(); cx.translate(-Math.round(camX), -Math.round(camY));
  pintarCasillas(cx, patron(), COLORES[tema], i0, i1, j0, j1);
  cx.restore();
}""")

# los adornos, ahora horneados: solo se dibujan sueltos si no hay lienzo
cam("""function dibujarAdornos(){
  const im=IMG[DECOS[tema]]; if(!im || !CAPAS.ado) return;""",
"""function dibujarAdornos(){
  if(LIENZO_NIV) return;                    // ya estan pintados adentro del lienzo del nivel
  const im=IMG[DECOS[tema]]; if(!im || !CAPAS.ado) return;""")

cam("  ponerAdornos(); ponerFondo(); ponerArbolesTerreno();\n  vigEspera=1.0;",
    "  ponerAdornos(); ponerFondo(); ponerArbolesTerreno();\n  hornearNivel();\n  vigEspera=1.0;")

# ---------------------------------------------------------------- 2. el cielo pre-escalado
cam("""  const ci=IMG['cielo'+tm];
  if(ci && CAPAS.lej){
    const esc=H/ci.height, an=ci.width*esc;
    let off=(-camX*CIELO_V)%an; if(off>0) off-=an;
    for(let x=off; x<W; x+=an) cx.drawImage(ci, Math.round(x), 0, Math.ceil(an), H);
  } else { cx.fillStyle='#16202e'; cx.fillRect(0,0,W,H); }""",
"""  /* EL CIELO YA VIENE AL ALTO JUSTO. Dibujado con drawImage escalado, cada cuadro hay que
     remuestrear 590 mil pixeles para llegar siempre al mismo resultado; pre-escalado una vez, la
     copia es 1 a 1 y el navegador la hace de un tiron. */
  const ci=cacheCielo();
  if(ci && CAPAS.lej){
    const an=ci.width;
    let off=(-camX*CIELO_V)%an; if(off>0) off-=an;
    for(let x=off; x<W; x+=an) cx.drawImage(ci, Math.round(x), 0);
  } else { cx.fillStyle='#16202e'; cx.fillRect(0,0,W,H); }""")
cam("let CACHE_TECHO=null;",
"""let CACHE_CIELO=null;
function cacheCielo(){
  const im=IMG['cielo'+FONDOS[tema]]; if(!im) return null;
  if(CACHE_CIELO && CACHE_CIELO.src===im) return CACHE_CIELO.c;
  const an=Math.ceil(im.width*ALTO/im.height);
  const g=document.createElement('canvas'); g.width=an; g.height=ALTO;
  g.getContext('2d').drawImage(im, 0, 0, an, ALTO);
  CACHE_CIELO={ src:im, c:g };
  return g;
}

let CACHE_TECHO=null;""")

# ganchos
cam("  capasFondo:()=>{",
"""  horno:()=>({ hay:!!LIENZO_NIV, tam:LIENZO_NIV? [LIENZO_NIV.width,LIENZO_NIV.height] : null,
               px:LIENZO_NIV? LIENZO_NIV.width*LIENZO_NIV.height : 0,
               cielo:(()=>{ const c=cacheCielo(); return c? [c.width,c.height] : null; })() }),
  sinHorno:()=>{ LIENZO_NIV=null; return true; },
  capasFondo:()=>{""")
open(H,'w',encoding='utf-8').write(s)
print('nivel horneado y cielo pre-escalado')
