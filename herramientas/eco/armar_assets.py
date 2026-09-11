# -*- coding: utf-8 -*-
"""Las piezas de Eco: cuatro planos de la historia, el logo recortado y el telon del menu."""
from PIL import Image
import numpy as np, os, sys, io, base64
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'maicol'))
import cortar

def caja(im,u=24):
    m=np.asarray(im.convert('RGBA'))[:,:,3]>u
    f=np.where(m.any(axis=1))[0]; c=np.where(m.any(axis=0))[0]
    return None if not len(f) else (int(c.min()),int(f.min()),int(c.max())+1,int(f.max())+1)
def webp(im,q=72):
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6); return b.getvalue()

if __name__=='__main__':
    D=sys.argv[1]; OUT=sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    h={}
    for k,n in enumerate(['p1','p2','p3','p4'],1):
        im=Image.open(os.path.join(D,n+'.png')).convert('RGB')
        h['cine%d'%k]=im.resize((720, round(720*im.size[1]/im.size[0])), Image.LANCZOS)
    rgba,_=cortar.quitar_fondo(Image.open(os.path.join(D,'logo.png')))
    b=caja(rgba); lg=rgba.crop(b) if b else rgba
    h['logo']=lg.resize((520, max(1,round(lg.size[1]*520/lg.size[0]))), Image.LANCZOS)
    t=Image.open(os.path.join(D,'telon.png')).convert('RGB')
    h['telon']=t.resize((1024, round(1024*t.size[1]/t.size[0])), Image.LANCZOS)
    tot=0
    for k,v in h.items():
        d=webp(v, 86 if k=='logo' else 66); tot+=len(d)
        v.save(os.path.join(OUT,k+'.png')); open(os.path.join(OUT,k+'.webp'),'wb').write(d)
        print('  %-7s %s  %6d bytes'%(k, v.size, len(d)))
    print('total %.1f KB'%(tot/1024))
