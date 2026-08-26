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

def sin_linea_de_piso(mask, frac=0.55, zona=0.12):
    """El modelo suele dibujar una LINEA DE PISO de punta a punta abajo. Como cruza toda la
       imagen, el recorte se la lleva y ensancha la caja de cada cuadro un poco distinto: el
       muneco queda descentrado y se mueve de costado al animar.
       Se busca en la franja de abajo la fila mas alta que este llena de punta a punta y se borra
       de ahi para abajo. Hay que borrar TAMBIEN lo de abajo: las suelas asoman uno o dos pixeles
       por debajo de la linea, y si se corta solo la linea el recorte sigue midiendo de punta a
       punta por culpa de esas suelas."""
    m=mask.copy()
    cols=np.where(m.any(axis=0))[0]; filas=np.where(m.any(axis=1))[0]
    if not len(cols) or not len(filas): return m
    ancho = int(cols.max()-cols.min()+1)
    y0, y1 = int(filas.min()), int(filas.max())
    desde = max(y0, y1 - int(max(6, (y1-y0)*zona)))
    corte=None
    for y in range(desde, y1+1):
        if m[y].sum() > ancho*frac: corte=y; break
    if corte is not None: m[corte:]=False
    return m

def cortar(ruta, esperados=None, hueco=14, piso=False):
    im=Image.open(ruta)
    rgba, mask = quitar_magenta(im)
    if piso: mask = sin_linea_de_piso(mask)
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

def cortar_parejo(ruta, n, margen=0.28, piso=False):
    """Corta en enesimos. Hace falta cuando las figuras se TOCAN o se pisan y el corte por
       huecos las une: ahi no hay hueco que buscar, hay que repartir el ancho.
       Cada corte se corre al minimo de contenido dentro de una ventana, asi cae por el punto
       mas flaco entre dos figuras y no por el medio de una."""
    im=Image.open(ruta)
    rgba, mask = quitar_magenta(im)
    if piso: mask = sin_linea_de_piso(mask)
    cuenta = mask.sum(axis=0)
    llenas = np.where(cuenta>0)[0]
    if not len(llenas): return []
    x0, x1 = int(llenas.min()), int(llenas.max())+1
    paso = (x1-x0)/n
    vent = max(2, int(paso*margen))
    cortes=[x0]
    for k in range(1, n):
        ideal = int(round(x0 + k*paso))
        a=max(x0+1, ideal-vent); b=min(x1-1, ideal+vent)
        if b<=a: cortes.append(ideal); continue
        cortes.append(a + int(np.argmin(cuenta[a:b])))
    cortes.append(x1)
    cuadros=[]
    for k in range(n):
        a,b = cortes[k], cortes[k+1]
        sub=mask[:, a:b]
        filas=np.where(sub.any(axis=1))[0]; cols=np.where(sub.any(axis=0))[0]
        if not len(filas) or not len(cols): continue
        cuadros.append(rgba.crop((a+int(cols.min()), int(filas.min()),
                                  a+int(cols.max())+1, int(filas.max())+1)))
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
