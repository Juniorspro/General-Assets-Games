# -*- coding: utf-8 -*-
"""Corta una tira de sprites sobre fondo magenta en cuadros sueltos, con alfa.
   El magenta puro es la clave: se saca por distancia en RGB, no por igualdad exacta, porque el
   modelo devuelve JPEG-ish y los bordes vienen con halo."""
from PIL import Image
import numpy as np, sys, os

def quitar_magenta(im):
    a=np.asarray(im.convert('RGB')).astype(np.int16)
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    # magenta: rojo y azul altos, verde bajo
    d = np.minimum(r,b).astype(np.int16) - g
    fondo = (d > 60) & (r > 120) & (b > 120)
    # alfa suave en el borde para que no queden dientes
    alfa = np.clip((60 - (d - 60)) / 60.0, 0, 1)
    alfa = np.where(fondo, np.clip((60 - d + 60)/60.0, 0, 1)*0, 1.0)
    alfa = alfa.astype(np.float32)
    # descontaminar: los pixeles casi-fondo tiran a magenta, se les baja el rojo/azul
    rgb=a.copy()
    borde = (~fondo) & (d > 20)
    prom = ((rgb[:,:,0]+rgb[:,:,2])/2)
    rgb[:,:,0]=np.where(borde, np.minimum(rgb[:,:,0], g+40), rgb[:,:,0])
    rgb[:,:,2]=np.where(borde, np.minimum(rgb[:,:,2], g+40), rgb[:,:,2])
    out=np.dstack([rgb.astype(np.uint8), (alfa*255).astype(np.uint8)])
    return Image.fromarray(out,'RGBA'), (~fondo)

def cortar(ruta, esperados=None, hueco=14):
    im=Image.open(ruta)
    rgba, mask = quitar_magenta(im)
    cols = mask.any(axis=0)
    # runs de columnas con contenido, uniendo huecos chicos
    runs=[]; i=0; W=len(cols)
    while i<W:
        if cols[i]:
            j=i
            while j<W:
                if cols[j]: j+=1
                else:
                    k=j
                    while k<W and k-j<hueco and not cols[k]: k+=1
                    if k<W and cols[k]: j=k
                    else: break
            runs.append((i,j)); i=j
        else: i+=1
    runs=[r for r in runs if r[1]-r[0] > W*0.02]
    if esperados and len(runs)!=esperados:
        print('  OJO: encontre', len(runs), 'cuadros y esperaba', esperados)
    cuadros=[]
    for (a,b) in runs:
        sub=mask[:,a:b]
        filas=np.where(sub.any(axis=1))[0]
        if not len(filas): continue
        cuadros.append(rgba.crop((a, filas.min(), b, filas.max()+1)))
    return cuadros

def hoja(cuadros, alto, apoyo='abajo'):
    """Los escala a un alto comun y los alinea por el piso, en una tira horizontal."""
    esc=[]
    for c in cuadros:
        w=max(1,round(c.size[0]*alto/c.size[1]))
        esc.append(c.resize((w,alto), Image.LANCZOS))
    W=max(c.size[0] for c in esc)
    out=Image.new('RGBA',(W*len(esc), alto),(0,0,0,0))
    for k,c in enumerate(esc):
        out.paste(c, (k*W + (W-c.size[0])//2, 0), c)
    return out, W, alto

if __name__=='__main__':
    D=os.path.dirname(os.path.abspath(__file__))
    for nombre, esperados, alto in [('corre',4,128),('slime',2,96),('murcielago',2,96)]:
        f=os.path.join(D, nombre+'.png')
        if not os.path.exists(f): continue
        cs=cortar(f, esperados)
        print(nombre, '->', len(cs), 'cuadros', [c.size for c in cs])
        h,W,H=hoja(cs, alto)
        h.save(os.path.join(D, nombre+'_hoja.png'))
        print('   hoja', h.size, 'cuadro', W, 'x', H)
