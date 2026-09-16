# -*- coding: utf-8 -*-
"""Parte el fondo de Maicol en capas: cielo solo, montanas, lomas, arboles/siluetas y adornos.
   Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cambiar(a,b,marca=None):
    global s
    if (marca or b) in s and a not in s: print('  (ya)'); return
    if marca and marca in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:200]
    s=s.replace(a,b,1)

# ---------------------------------------------------------------- 1. las constantes de capa
cambiar("""const DECOS=['decobosque','decocueva','decofabrica'];
const HORIZONTE=ALTO*0.92;             // donde apoya la capa del medio""",
"""const DECOS=['decobosque','decocueva','decofabrica'];
const NDECO=12;                        // cuantos adornos distintos tiene cada tema
const HORIZONTE=ALTO*0.92;             // donde apoyan los arboles
/* LAS CAPAS DEL FONDO Y SU VELOCIDAD. La de mas atras es SOLO CIELO.
   Con el cielo, las montanas, los arboles y el piso metidos en UNA sola foto, no importa cuanto
   camines: nada se mueve respecto de nada. Eso es un telon pintado. Separadas y a velocidades
   distintas, caminar produce PARALAJE, que es lo unico que da distancia en dos dimensiones.
   Las lineas de apoyo estan elegidas para que el borde de abajo de cada banda -que es un corte
   recto- quede TAPADO por la capa de adelante: la loma apoya POR DEBAJO del suelo, asi que su
   corte no se ve nunca, y el monte apoya seis pixeles debajo del techo de la loma. */
const CIELO_V=0.06;
const MONTE_V=0.20, MONTE_Y=0.79;
const LOMA_V =0.36, LOMA_Y =0.96;""")

# ---------------------------------------------------------------- 2. los interruptores
cambiar("const CAPAS={arb:1, paj:1, hoj:1, ado:1, sil:1, lej:1};   // interruptores para medir que cuesta cada capa",
        "const CAPAS={arb:1, paj:1, hoj:1, ado:1, sil:1, lej:1, mon:1, lom:1};  // interruptores para medir que cuesta cada capa")

# ---------------------------------------------------------------- 3. el fondo en capas
i=s.index('function dibujarFondo(){')
j=s.index('function dibujarCasillas(){')
NUEVO = r"""function dibujarFondo(){
  const W=ANCHO, H=ALTO, t=performance.now()/1000, tm=FONDOS[tema];
  /* 1. EL CIELO, y nada mas que el cielo. Se estira al alto de la pantalla y se repite.
     A 0,06 de velocidad una foto de 1200 px dura 20000 px de mundo: dentro de un nivel no se
     repite NUNCA, asi que no hace falta que empalme. */
  const ci=IMG['cielo'+tm];
  if(ci && CAPAS.lej){
    const esc=H/ci.height, an=ci.width*esc;
    let off=(-camX*CIELO_V)%an; if(off>0) off-=an;
    for(let x=off; x<W; x+=an) cx.drawImage(ci, Math.round(x), 0, Math.ceil(an), H);
  } else { cx.fillStyle='#16202e'; cx.fillRect(0,0,W,H); }

  /* 2 y 3. LAS BANDAS. Cada una apoya en su linea y se repite a lo ancho. El monte va con menos
     opacidad que la loma: eso es perspectiva aerea -lo lejano se lava contra el aire- y es lo que
     hace que se lea como MAS LEJOS y no como mas chico. */
  bandaFondo(IMG['monte'+tm], MONTE_V, ALTO*MONTE_Y, 0.80, CAPAS.mon);
  bandaFondo(IMG['loma'+tm],  LOMA_V,  ALTO*LOMA_Y,  0.96, CAPAS.lom);

  /* 4. LA CAPA CERCA, a 0,55 */
  const base=HORIZONTE - camY*0.55;
  if(tema===0){
    const ca=cacheArbol();
    if(ca && CAPAS.arb){
      cx.globalAlpha=0.74;
      for(const a of arboles){
        const X=a.x - camX*0.55;
        if(X < -180 || X > W+180) continue;
        /* el meneo esta DIBUJADO DE ANTEMANO en doce posiciones. Un drawImage torcido lo resuelve
           el procesador pixel por pixel; uno derecho lo copia de una. Se elige el cuadro por la
           fase y sale una copia y nada mas. */
        const n=Math.floor((((t*a.v + a.f)/6.28318)%1+1)%1 * ca.n)%ca.n;
        cx.drawImage(ca.c, n*ca.an, 0, ca.an, ca.al,
                     Math.round(X - ca.an*a.e/2), Math.round(base - ca.al*a.e),
                     Math.round(ca.an*a.e), Math.round(ca.al*a.e));
      }
    }
    cx.globalAlpha=1;
    const paj=IMG.pajaro;
    if(paj && CAPAS.paj) for(const p of pajaros){
      const c=Math.floor(p.f)%3;
      cx.save(); cx.translate(Math.round(p.x), Math.round(p.y - camY*0.22));
      if(p.d<0) cx.scale(-1,1);
      cx.globalAlpha=0.85;
      const cw=paj.width/3;
      cx.drawImage(paj, c*cw, 0, cw, paj.height, -cw/2, -paj.height/2, cw, paj.height);
      cx.restore();
    }
    cx.globalAlpha=1;
  } else {
    /* la cueva y la fabrica no tienen arboles, pero SI tienen que tener capa cerca: se arma con
       los mismos adornos, oscurecidos, que es como se hace una silueta sin pedir dibujos nuevos */
    const im2=IMG[DECOS[tema]];
    if(im2 && CAPAS.sil){
      const cw=im2.width/NDECO, sil=(tema===1? [2,4,2,10,4,6] : [0,1,4,2,10,1]), paso=228;
      cx.save(); cx.globalAlpha=(tema===1? 0.30 : 0.36);
      for(let n=0;n<26;n++){
        const X=n*paso + (n%3)*47 - ((camX*0.55)%(26*paso));
        const e=1.5+((n*7)%5)*0.35;
        const c=sil[n%6];
        if(X < -200 || X > W+200) continue;
        cx.drawImage(im2, c*cw, 0, cw, im2.height,
                     X-cw*e/2, base-im2.height*e, cw*e, im2.height*e);
      }
      cx.restore();
    }
    cx.save();
    for(const m of motas){
      const b=0.35+0.45*Math.abs(Math.sin(m.f));
      cx.fillStyle = tema===1? 'rgba(150,220,255,'+b.toFixed(2)+')'
                             : 'rgba(255,168,80,'+b.toFixed(2)+')';
      cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 6.284); cx.fill();
    }
    cx.restore();
  }
  cx.fillStyle='rgba(10,13,20,0.14)'; cx.fillRect(0,0,W,H);
}
/* Una banda que apoya en una linea y se repite a lo ancho. linea es la pantalla donde va el
   borde de ABAJO con la camara arriba de todo; la camara la corre a su propia velocidad. */
function bandaFondo(im, v, linea, alfa, prendida){
  if(!im || !prendida) return;
  const an=im.width, Y=Math.round(linea - camY*v - im.height);
  let off=(-camX*v)%an; if(off>0) off-=an;
  cx.globalAlpha=alfa;
  for(let x=off; x<ANCHO; x+=an) cx.drawImage(im, Math.round(x), Y);
  cx.globalAlpha=1;
}
"""
if 'function bandaFondo' not in s:
    s = s[:i] + NUEVO + s[j:]
    print('fondo en capas puesto')
else:
    print('  (fondo ya estaba)')

# ---------------------------------------------------------------- 4. doce adornos, no seis
cambiar("    adornos.push({ x:x, y:y, k:Math.floor(azar(nivel*104729 + i*31 + j*7)*6)%6,",
        "    adornos.push({ x:x, y:y, k:Math.floor(azar(nivel*104729 + i*31 + j*7)*NDECO)%NDECO,")
cambiar("    dibujarSprite(im, a.k, 6, X, a.y-camY, im.height, a.m);",
        "    dibujarSprite(im, a.k, NDECO, X, a.y-camY, im.height, a.m);")

# ---------------------------------------------------------------- 5. el gancho de medir
cambiar("""  fondo:()=>({ tema, arboles:arboles.length,""",
        """  capasFondo:()=>{ const tm=FONDOS[tema]; const q=k=>IMG[k]? [IMG[k].width,IMG[k].height] : null;
    return { cielo:q('cielo'+tm), monte:q('monte'+tm), loma:q('loma'+tm), deco:q(DECOS[tema]),
             velocidades:{cielo:CIELO_V, monte:MONTE_V, loma:LOMA_V, cerca:0.55, mundo:1},
             lineas:{monte:Math.round(ALTO*MONTE_Y), loma:Math.round(ALTO*LOMA_Y), arboles:Math.round(HORIZONTE), suelo:11*TAM},
             /* cuantos px de mundo aguanta cada banda antes de repetirse */
             alcance:{ cielo:Math.round((IMG['cielo'+tm]? IMG['cielo'+tm].width*ALTO/IMG['cielo'+tm].height:0)/CIELO_V),
                       monte:Math.round((IMG['monte'+tm]? IMG['monte'+tm].width:0)/MONTE_V),
                       loma:Math.round((IMG['loma'+tm]? IMG['loma'+tm].width:0)/LOMA_V) },
             nivelAncho:MW*TAM }; },
  fondo:()=>({ tema, arboles:arboles.length,""")

open(H,'w',encoding='utf-8').write(s)
print('parche de capas puesto')
