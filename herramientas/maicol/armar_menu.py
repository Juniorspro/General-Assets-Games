# -*- coding: utf-8 -*-
"""Las piezas del menu: el nombre recortado, los dos hermanos recortados y el telon."""
from PIL import Image
import numpy as np, os, sys, io, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cortar

def caja(im,u=24):
    m=np.asarray(im.convert('RGBA'))[:,:,3]>u
    f=np.where(m.any(axis=1))[0]; c=np.where(m.any(axis=0))[0]
    return None if not len(f) else (int(c.min()),int(f.min()),int(c.max())+1,int(f.max())+1)
def recortado(ruta):
    rgba,_=cortar.quitar_fondo(Image.open(ruta))
    b=caja(rgba); return rgba.crop(b) if b else rgba
def a_ancho(im,w):
    return im.resize((w, max(1,round(im.size[1]*w/im.size[0]))), Image.LANCZOS)
def a_alto(im,h):
    return im.resize((max(1,round(im.size[0]*h/im.size[1])), h), Image.LANCZOS)
def webp(im,q=84):
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6); return b.getvalue()

if __name__=='__main__':
    D=sys.argv[1]; OUT=sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    h={}
    h['logo']    = a_ancho(recortado(os.path.join(D,'logo.png')), 620)
    h['menuIzq'] = a_alto (recortado(os.path.join(D,'izq.png')),  360)
    h['menuDer'] = a_alto (recortado(os.path.join(D,'der.png')),  330)
    t=Image.open(os.path.join(D,'telon.png')).convert('RGB')
    h['arte']    = t.resize((1024, round(1024*t.size[1]/t.size[0])), Image.LANCZOS)
    tot=0
    for k,v in h.items():
        d=webp(v, 78 if k=='arte' else 88); tot+=len(d)
        v.save(os.path.join(OUT,k+'.png')); open(os.path.join(OUT,k+'.webp'),'wb').write(d)
        print('  %-9s %s  %6d bytes'%(k, v.size, len(d)))
    print('total %.1f KB'%(tot/1024))
