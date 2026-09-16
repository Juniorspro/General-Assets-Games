# -*- coding: utf-8 -*-
"""Atlas de 60 con las hojas REHECHAS DESDE UNA REFERENCIA.

   POR QUE SE REHIZO TODO. La primera tanda de 48 cuadros salio con OTRO personaje: mismo gorro de
   ropa pero cabeza de un tercio del cuerpo contra un quinto en el original — un chibi. Al jugar,
   pasar de correr a agacharse cambiaba el dibujo entero. El modelo de la primera vuelta no acepta
   imagen de referencia, asi que la unica atadura eran las palabras del prompt, y las palabras no
   fijan proporciones.
   Ahora: se saca el cuadro 8 del atlas -el quieto ORIGINAL, que es el personaje de verdad-, se
   agranda, se limpia con un modelo que SI acepta referencia, y esa limpieza es la referencia de
   las ocho hojas. El personaje queda atado por construccion y no por descripcion.
"""
from PIL import Image
import numpy as np, os, sys, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cortar

CELDA_VIEJA=140; ALTO_VIEJO=86.0
PARADO=118.0

# tanda: (cuantos, cuanto mide su cuadro MAS ALTO en veces "parado", como esta armada la hoja)
TANDAS=[
 ('agCamina', 6, 0.58, 'fila'),
 ('agQuieto', 6, 0.60, 'fila'),
 ('salto',    6, 1.06, 'fila'),
 ('cae',      6, 1.02, 'fila'),
 ('golpe',    6, 1.00, 'fila'),
 ('muere',    6, 0.98, 'fila'),
 ('festeja',  6, 1.32, 'rejilla2x3'),   # esta vino en DOS FILAS DE TRES, no en una de seis
 ('frena',    6, 1.00, 'fila'),
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

def cortar_hoja(ruta, n, modo):
    if modo=='fila':
        return [recortar(c) for c in cortar.cortar_parejo(ruta, n, piso=True, auto=True)]
    # rejilla de dos filas por tres: se parte al medio a lo alto y cada mitad en tres
    im=Image.open(ruta); W,H=im.size
    fuera=[]
    for r in range(2):
        tmp='/tmp/_fila%d.png'%r
        im.crop((0, r*H//2, W, (r+1)*H//2)).save(tmp)
        fuera.extend(recortar(c) for c in cortar.cortar_parejo(tmp, n//2, piso=True, auto=True))
    return fuera

if __name__=='__main__':
    ANIM=sys.argv[1]; SAC=sys.argv[2]; OUT=sys.argv[3]
    os.makedirs(OUT, exist_ok=True)
    viejo=Image.open(os.path.join(SAC,'maicol.webp')).convert('RGBA')
    N0=60 if viejo.size[0]//viejo.size[1] > 20 else 16
    cw=viejo.size[0]//N0
    marcos=[recortar(viejo.crop((k*cw,0,(k+1)*cw,viejo.size[1]))) for k in range(12)]
    print('los 12 que quedan (del atlas de %d): %s'%(N0,[m.size[1] for m in marcos]))
    for nombre, n, veces, modo in TANDAS:
        cs=cortar_hoja(os.path.join(ANIM,nombre+'.png'), n, modo)
        assert len(cs)==n, '%s dio %d cuadros'%(nombre,len(cs))
        altos=[c.size[1] for c in cs]
        k=(PARADO*veces)/max(altos)
        print('  %-9s %s -> x%.5f (el mas alto queda en %.0f px)'%(nombre, altos, k, max(altos)*k))
        marcos.extend(por_factor(c,k) for c in cs)

    H=max(m.size[1] for m in marcos)+3
    W=max(m.size[0] for m in marcos)+3
    hoja=Image.new('RGBA',(W*len(marcos),H),(0,0,0,0))
    for i,m in enumerate(marcos):
        hoja.paste(m,(i*W+(W-m.size[0])//2, H-m.size[1]), m)
    d=webp(hoja)
    hoja.save(os.path.join(OUT,'maicol.png')); open(os.path.join(OUT,'maicol.webp'),'wb').write(d)
    alto=ALTO_VIEJO*H/CELDA_VIEJA
    print('\natlas de %d cuadros, celda %dx%d, %.1f KB'%(len(marcos),W,H,len(d)/1024))
    print('ALTO_SPR = %d'%round(alto))
    print('\nLA COMPROBACION: alto dibujado')
    ini=0
    for g,c in [('corre',8),('quieto',4)]+[(t[0],t[1]) for t in TANDAS]:
        print('  %-9s %s'%(g,[round(marcos[i].size[1]*alto/H) for i in range(ini,ini+c)])); ini+=c
    par=np.mean([marcos[i].size[1] for i in range(8,12)])*alto/H
    con=np.mean([marcos[i].size[1] for i in (0,2,4,6)])*alto/H
    print('\n  parado %.1f px, contacto de correr %.1f px -> %+.1f%%'%(par,con,(par/con-1)*100))
    print('  el agachado mas alto: %.1f px (el tunel tiene 48)'%(max(marcos[i].size[1] for i in range(12,24))*alto/H))
