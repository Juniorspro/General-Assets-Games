# -*- coding: utf-8 -*-
"""EL LAG. Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:220]
    s=s.replace(a,b,n)

cam("""  DPR=Math.min(devicePixelRatio||1, 2);
  lienzo.width=Math.round(w*DPR); lienzo.height=Math.round(h*DPR);""",
"""  /* EL LIENZO NO PASA DE LA RESOLUCION DE DISENO, Y ESTO ERA EL LAG.
     El mundo esta dibujado para 1024x576: el sprite del jugador mide 86 px de alto y la casilla 48.
     En un telefono de 412x915 con DPR 2 el lienzo salia de 1464x824 = 1.206.336 pixeles, o sea
     2,04 VECES los 589.824 del diseno. El doble de relleno por cuadro, cada cuadro, y lo unico que
     se ganaba era resamplear para arriba dibujos que no tienen mas detalle que dar.
     Medido en 412x915 con DPR 2: 19,5 cuadros por segundo antes de poner el techo.
     El dibujado en si cuesta 0,19 ms de JS por cuadro: el costo no esta en las ordenes, esta en
     los pixeles que hay que rellenar. Por eso el unico boton que mueve la aguja es este. */
  DPR=Math.min(devicePixelRatio||1, 2);
  let bw=Math.round(w*DPR), bh=Math.round(h*DPR);
  const tope=PX_DISENO*calidad;
  if(bw*bh > tope){ const k=Math.sqrt(tope/(bw*bh));
    bw=Math.max(384,Math.round(bw*k)); bh=Math.max(216,Math.round(bh*k)); }
  lienzo.width=bw; lienzo.height=bh;""")

cam("function ajustarCuadro(){",
"""const PX_DISENO=ANCHO*ALTO;
/* EL VIGIA. No todos los telefonos son iguales y no hay forma de saberlo de antemano: se mide.
   Dos segundos de cuadros y si no llega a 45 baja un escalon de resolucion. NUNCA vuelve a subir:
   subir y bajar da un parpadeo peor que quedarse un escalon abajo. Y arranca un segundo despues de
   cargar el nivel, porque el primer segundo trae el tiron de la carga y no mide nada real. */
const CALIDADES=[1, 0.66, 0.44];
let calidad=1, cIdx=0, vigN=0, vigT=0, vigEspera=0, vigFin=false, vigUlt=0, vigAntes=0;
/* EL VIGIA MIDE SI SIRVE, no baja a ciegas. Bajar la resolucion es una apuesta: en un aparato que
   NO esta limitado por relleno no gana nada y lo unico que deja es la imagen mas blanda. Medido en
   este contenedor: de 590 mil pixeles a 389 mil, 29,45 -> 29,60 cuadros por segundo, o sea cero.
   Asi que se baja un escalon, se vuelve a medir, y si no gano al menos un 8% SE VUELVE PARA ARRIBA
   y se deja de tocar. */
function ponerCalidad(k){
  cIdx=k; calidad=CALIDADES[k]; ajustarCuadro();
  PAT=null; PAT_T=-1;              // el patron cuelga del contexto, y el contexto se reinicio
}
function vigia(dt){
  if(vigFin || !jugando || pausa) return;
  if(vigEspera>0){ vigEspera-=dt; return; }
  vigN++; vigT+=dt;
  if(vigT<2.2) return;
  vigUlt=vigN/vigT; vigN=0; vigT=0;
  if(vigAntes>0){                                  // veniamos de bajar un escalon: ¿gano algo?
    if(vigUlt < vigAntes*1.08){ ponerCalidad(cIdx-1); vigFin=true; vigAntes=0; return; }
    vigAntes=0;
  }
  if(vigUlt<45 && cIdx<CALIDADES.length-1){ vigAntes=vigUlt; ponerCalidad(cIdx+1); }
  else vigFin=true;
}
function ajustarCuadro(){""")

cam("  ponerAdornos(); ponerFondo(); ponerArbolesTerreno();",
    "  ponerAdornos(); ponerFondo(); ponerArbolesTerreno();\n  vigEspera=1.0; vigN=0; vigT=0;")
cam("    pasoFondo(dt);\n    if(avisoT>0) avisoT-=dt;",
    "    vigia(dt);\n    pasoFondo(dt);\n    if(avisoT>0) avisoT-=dt;")
cam("  capasFondo:()=>{",
"""  calidad:(n)=>{ if(n){ calidad=n; cIdx=CALIDADES.indexOf(n); if(cIdx<0) cIdx=0; ajustarCuadro(); PAT=null; PAT_T=-1; }
    vigFin=true;   // medir a mano apaga el vigia, si no cambia la resolucion en medio de la medicion
    return { calidad, lienzo:[lienzo.width,lienzo.height], px:lienzo.width*lienzo.height,
             disenoPx:PX_DISENO, fpsVisto:+vigUlt.toFixed(1) }; },
  vigia:()=>({ calidad, cIdx, fin:vigFin, fpsVisto:+vigUlt.toFixed(1),
               px:lienzo.width*lienzo.height, disenoPx:PX_DISENO }),
  capasFondo:()=>{""")
open(H,'w',encoding='utf-8').write(s)
print('techo de resolucion y vigia puestos')
