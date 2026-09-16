# -*- coding: utf-8 -*-
"""Arma las hojas de sprites de Maicol y escupe las lineas base64 listas para pegar.

   Lo importante de aca es UNA SOLA REGLA DE TAMANO. El personaje no puede cambiar de
   porte segun la pose: la cabeza es una parte rigida, asi que se mide su ancho y se
   escala cada fuente para que la cabeza mida lo mismo en todas. El resto (la decoracion,
   el arbol, el pajaro, las hojas) se escala al alto que va a tener EN EL JUEGO, asi el
   juego dibuja la celda entera y no hace falta una tabla de tamanos por objeto.
"""
from PIL import Image
import numpy as np, os, sys, io, base64, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cortar

def caja(im):
    a=np.asarray(im.convert('RGBA')); m=a[:,:,3]>24
    f=np.where(m.any(axis=1))[0]; c=np.where(m.any(axis=0))[0]
    return (int(c.min()), int(f.min()), int(c.max())+1, int(f.max())+1)

def ancho_cabeza(im):
    """El ancho de la cabeza: parte rigida, no cambia con la pose. Es la regla."""
    a=np.asarray(im.convert('RGBA')); m=a[:,:,3]>24
    f=np.where(m.any(axis=1))[0]
    y0,y1=int(f.min()),int(f.max()); h=y1-y0+1
    anchos=[]
    for y in range(y0, y0+max(3,int(h*0.28))):
        c=np.where(m[y])[0]
        if len(c): anchos.append(int(c.max()-c.min()+1))
    return max(anchos) if anchos else 0

def a_alto(im, alto):
    im=im.crop(caja(im))
    w=max(1, round(im.size[0]*alto/im.size[1]))
    return im.resize((w, alto), Image.LANCZOS)

def por_factor(im, f):
    im=im.crop(caja(im))
    return im.resize((max(1,round(im.size[0]*f)), max(1,round(im.size[1]*f))), Image.LANCZOS)

def tira(cuadros, celda=None, abajo=True):
    """Los mete en una tira horizontal de celdas iguales, pegados ABAJO y centrados.
       Abajo, porque los pies (o la base del objeto) son lo que apoya en el suelo."""
    W=max(c.size[0] for c in cuadros); H=max(c.size[1] for c in cuadros)
    if celda: W,H = max(W,celda[0]), max(H,celda[1])
    out=Image.new('RGBA',(W*len(cuadros), H),(0,0,0,0))
    for k,c in enumerate(cuadros):
        x = k*W + (W-c.size[0])//2
        y = (H-c.size[1]) if abajo else (H-c.size[1])//2
        out.paste(c,(x,y),c)
    return out, W, H

def webp(im, q=88):
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6)
    return b.getvalue()

# ---------------------------------------------------------------- el personaje
def armar_maicol(D, atlas_viejo, salida):
    """Reusa los 8 cuadros de correr del atlas que ya andaba (son la referencia de tamano)
       y le cambia el resto: 4 cuadros de quieto nuevos y las 4 poses reescaladas."""
    viejo=Image.open(atlas_viejo).convert('RGBA')
    N=14; cw=viejo.size[0]//N; ch=viejo.size[1]
    celdas=[viejo.crop((k*cw,0,(k+1)*cw,ch)) for k in range(N)]
    corre=[celdas[k] for k in range(8)]
    # la regla: el ancho de cabeza promedio de los cuadros de contacto (0,2,4,6), que son
    # los unicos donde arriba de todo hay SOLO cabeza y no un brazo levantado
    regla=np.mean([ancho_cabeza(celdas[k]) for k in (0,2,4,6)])
    quieto_viejo=np.mean([caja(celdas[8])[3]-caja(celdas[8])[1],
                          caja(celdas[9])[3]-caja(celdas[9])[1]])

    idle=[Image.open(os.path.join(D,'cortes','idle_%d.png'%i)) for i in range(4)]
    fi = regla/np.mean([ancho_cabeza(c) for c in idle])
    quieto=[por_factor(c, fi) for c in idle]
    alto_parado=np.mean([c.size[1] for c in quieto])

    # las cuatro poses vienen de la MISMA hoja que el quieto viejo, asi que les toca a todas
    # el mismo factor: el que lleva ese quieto viejo al alto que ahora sabemos que va
    fp = alto_parado/quieto_viejo
    poses=[por_factor(celdas[k], fp) for k in (10,11,12,13)]

    cuadros = corre + quieto + poses
    hoja, W, H = tira(cuadros, celda=(cw,ch))
    return hoja, W, H, dict(regla=float(regla), fi=float(fi), fp=float(fp),
                            alto_parado=float(alto_parado))

# ---------------------------------------------------------------- la decoracion
DECO = {
 'bosque':  [('arbusto',42),('piedra',34),('flores',30),('hongo',36),('tronco',30),('pasto',26)],
 'cueva':   [('cristal',42),('geoda',44),('estalag',54),('hongoluz',40),('escombro',34),('charco',14)],
 'fabrica': [('barril',46),('caja',42),('engranaje',40),('valvula',44),('chapas',32),('cartel',48)],
}

def armar_deco(D, tema, piso=False):
    n=len(DECO[tema])
    cs=[Image.open(os.path.join(D,'cortes','deco%s_%d.png'%(tema.capitalize(), i))) for i in range(n)]
    esc=[a_alto(c, DECO[tema][i][1]) for i,c in enumerate(cs)]
    return tira(esc)

if __name__=='__main__':
    D=os.path.dirname(os.path.abspath(__file__)) if len(sys.argv)<2 else sys.argv[1]
    ATL=sys.argv[2] if len(sys.argv)>2 else os.path.join(D,'sacado','maicol.webp')
    out={}
    hoja,W,H,info = armar_maicol(D, ATL, None)
    out['maicol']=hoja
    print('maicol: celda %dx%d, %d cuadros'%(W,H,hoja.size[0]//W))
    print('   regla de cabeza %.1f px | idle x%.5f | poses x%.5f | parado %.1f px'%(
        info['regla'], info['fi'], info['fp'], info['alto_parado']))
    for tema in DECO:
        h,w,hh = armar_deco(D, tema)
        out['deco'+tema]=h
        print('deco%-8s celda %dx%d'%(tema, w, hh))
    out['arbol'] = a_alto(Image.open(os.path.join(D,'cortes','arbol_0.png')), 210)
    print('arbol', out['arbol'].size)
    paj=[a_alto(Image.open(os.path.join(D,'cortes','pajaro_%d.png'%i)), 22) for i in range(3)]
    out['pajaro'],w,h = tira(paj, abajo=False); print('pajaro celda %dx%d'%(w,h))
    hj=[a_alto(Image.open(os.path.join(D,'cortes','hojas_%d.png'%i)), 15) for i in range(4)]
    out['hoja'],w,h = tira(hj, abajo=False); print('hoja celda %dx%d'%(w,h))

    os.makedirs(os.path.join(D,'listo'), exist_ok=True)
    lineas=[]
    total=0
    for k,v in out.items():
        d=webp(v); total+=len(d)
        v.save(os.path.join(D,'listo',k+'.png'))
        open(os.path.join(D,'listo',k+'.webp'),'wb').write(d)
        lineas.append("  ['%s','data:image/webp;base64,%s'],"%(k, base64.b64encode(d).decode()))
        print('  %-12s %7d bytes  %s'%(k, len(d), v.size))
    open(os.path.join(D,'listo','lineas.txt'),'w').write('\n'.join(lineas))
    print('total %.1f KB'%(total/1024))
