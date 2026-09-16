# -*- coding: utf-8 -*-
"""Arma el atlas de SESENTA cuadros: los 12 que ya andaban (8 de correr, 4 de quieto) mas 48
   nuevos, ocho tandas de seis.

   POR QUE LA ALTURA VA DECLARADA A MANO Y NO MEDIDA.
   Con 16 cuadros la regla del ANCHO DE CABEZA funcionaba: en una pose de pie, arriba de todo hay
   cabeza y nada mas. Con 60 se rompe, y se rompe medido: en los cuadros agachados el tercio de
   arriba de la figura es la ESPALDA ARQUEADA, que es anchisima, y la regla devolvia 429 px de
   "cabeza" para una figura de 430 de alto — o sea que escalaba el muneco a 18 px.
   Probe otras tres reglas rigidas y las tres se caen con la pose: contar pixeles de zapatilla da
   5415 en una tanda y 6 en el festejo (ahi las zapatillas estan mas claras); contar rojo de
   campera da 29913 en una y 958 en el tumbo; contar piel de la cara varia hasta un 111% DENTRO de
   la misma tanda, porque la cara se da vuelta y las manos se esconden.
   Lo que SI es cierto y esta medido: dentro de cada tanda el modelo mantuvo la escala (agCamina
   da 430,430,430,430,430,430; frena da 669..675). O sea que hace falta UN numero por tanda, no una
   regla universal. Y ese numero lo se: se cuanto mide un chico parado -118 px de atlas- y se que
   animacion es cada tanda. Se declara, y despues se COMPRUEBA imprimiendo el alto dibujado de los
   60 cuadros."""
from PIL import Image
import numpy as np, os, sys, io, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cortar

CELDA_VIEJA=140; ALTO_VIEJO=86.0
PARADO=118.0            # lo que mide el muneco parado, en px de atlas (medido en la vuelta 3)

# tanda: (cuantos, cuanto mide su cuadro MAS ALTO, en veces "parado")
TANDAS=[
 ('agCamina', 6, 0.58),   # agachado caminando: un chico en cuclillas mide algo mas de la mitad
 ('agQuieto', 6, 0.60),   # agachado quieto, la cabeza un poco mas alta que caminando
 ('salto',    6, 1.06),   # el cuadro estirado del despegue pasa un poco al parado
 ('cae',      6, 1.02),   # cayendo estirado
 ('golpe',    6, 1.00),   # el mas extendido es de pie
 ('muere',    6, 0.98),   # el primero, antes del tumbo, casi de pie
 ('festeja',  6, 1.32),   # brazos arriba: un chico con los brazos en alto mide un tercio mas
 ('frena',    6, 1.00),   # frenando y empujando, de pie
]

def alfa(im,u=24): return np.asarray(im.convert('RGBA'))[:,:,3]>u
def caja(im):
    m=alfa(im); f=np.where(m.any(axis=1))[0]; c=np.where(m.any(axis=0))[0]
    return None if not len(f) else (int(c.min()),int(f.min()),int(c.max())+1,int(f.max())+1)
def recortar(im):
    c=caja(im); return im.crop(c) if c else im
def por_factor(im,k):
    im=recortar(im)
    return im.resize((max(1,round(im.size[0]*k)), max(1,round(im.size[1]*k))), Image.LANCZOS)
def webp(im,q=86):
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6); return b.getvalue()

if __name__=='__main__':
    ANIM=sys.argv[1]; SAC=sys.argv[2]; OUT=sys.argv[3]
    os.makedirs(OUT, exist_ok=True)
    viejo=Image.open(os.path.join(SAC,'maicol.webp')).convert('RGBA')
    cw=viejo.size[0]//16
    marcos=[recortar(viejo.crop((k*cw,0,(k+1)*cw,viejo.size[1]))) for k in range(12)]
    nom=['corre']*8+['quieto']*4
    print('los 12 que quedan: altos %s'%[m.size[1] for m in marcos])
    for nombre, n, veces in TANDAS:
        cs=cortar.cortar_parejo(os.path.join(ANIM,nombre+'.png'), n, piso=True)
        if len(cs)!=n: cs=cortar.cortar(os.path.join(ANIM,nombre+'.png'), n, piso=True)
        cs=[recortar(c) for c in cs]
        altos=[c.size[1] for c in cs]
        k=(PARADO*veces)/max(altos)
        print('  %-9s %d cuadros, altos crudos %s -> x%.5f  (el mas alto queda en %.0f px)'%(
              nombre, len(cs), altos, k, max(altos)*k))
        marcos.extend(por_factor(c,k) for c in cs)
        nom.extend([nombre]*n)

    H=max(m.size[1] for m in marcos)+3
    W=max(m.size[0] for m in marcos)+3
    hoja=Image.new('RGBA',(W*len(marcos),H),(0,0,0,0))
    for i,m in enumerate(marcos):
        hoja.paste(m,(i*W+(W-m.size[0])//2, H-m.size[1]), m)
    d=webp(hoja)
    hoja.save(os.path.join(OUT,'maicol.png')); open(os.path.join(OUT,'maicol.webp'),'wb').write(d)
    alto=ALTO_VIEJO*H/CELDA_VIEJA
    print('\natlas de %d cuadros, celda %dx%d, %.1f KB'%(len(marcos),W,H,len(d)/1024))
    print('ALTO_SPR = %d   (era %d con celda %d)'%(round(alto), ALTO_VIEJO, CELDA_VIEJA))
    print('\nLA COMPROBACION: alto DIBUJADO de los 60 cuadros')
    ini=0
    for g,cuantos in [('corre',8),('quieto',4)]+[(t[0],t[1]) for t in TANDAS]:
        hs=[round(marcos[i].size[1]*alto/H,1) for i in range(ini,ini+cuantos)]
        print('  %-9s %s'%(g,hs)); ini+=cuantos
    par=np.mean([marcos[i].size[1] for i in range(8,12)])*alto/H
    con=np.mean([marcos[i].size[1] for i in (0,2,4,6)])*alto/H
    print('\n  parado %.1f px, contacto de correr %.1f px -> %+.1f%%'%(par,con,(par/con-1)*100))
    ag=max(marcos[i].size[1] for i in range(12,24))*alto/H
    print('  el agachado mas alto: %.1f px (el tunel tiene 48)'%ag)
