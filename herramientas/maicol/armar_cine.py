# -*- coding: utf-8 -*-
"""Prepara los dibujos de la cinematica, el arte del menu y las texturas del terreno.

   LAS TEXTURAS TIENEN QUE EMPALMAR. Se dibujan con createPattern, o sea repitiendo en las dos
   direcciones, y cualquier diferencia entre el borde derecho y el izquierdo se ve como una
   REJILLA sobre todo el piso: es el mismo defecto que la cuadricula de casillas, pero peor,
   porque el ojo la lee como suciedad y no como diseno. Se cose fundiendo los dos bordes."""
from PIL import Image
import numpy as np, os, sys, io, base64

def webp(im, q=76):
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6); return b.getvalue()

def costura2(im, frac=0.12):
    """Cose los CUATRO bordes: funde el derecho sobre el izquierdo y el de abajo sobre el de
       arriba. La imagen se recorta eso, y lo que queda repite sin junta visible."""
    a=np.asarray(im.convert('RGB')).astype(np.float32)
    for eje in (1,0):
        if eje==0: a=a.transpose(1,0,2)
        H,W,_=a.shape; n=max(2,int(W*frac))
        t=np.linspace(0,1,n,dtype=np.float32)[None,:,None]
        a[:, :n] = a[:, :n]*t + a[:, W-n:]*(1-t)
        a=a[:, :W-n]
        if eje==0: a=a.transpose(1,0,2)
    return Image.fromarray(a.clip(0,255).astype(np.uint8),'RGB')

if __name__=='__main__':
    CIN=sys.argv[1]; TEX=sys.argv[2]; OUT=sys.argv[3]
    os.makedirs(OUT, exist_ok=True)
    hojas={}
    for k,n in enumerate(['p1','p2','p3','p4'],1):
        im=Image.open(os.path.join(CIN,n+'.png')).convert('RGB')
        hojas['cine%d'%k]=im.resize((720, round(720*im.size[1]/im.size[0])), Image.LANCZOS)
    im=Image.open(os.path.join(CIN,'menu.png')).convert('RGB')
    hojas['arte']=im.resize((1024, round(1024*im.size[1]/im.size[0])), Image.LANCZOS)
    for t in ('bosque','cueva','fabrica'):
        im=Image.open(os.path.join(TEX,'t'+t+'.png')).convert('RGB')
        im=im.resize((196,196), Image.LANCZOS)          # 196 y no 144: al coser queda en 172
        hojas['piso'+t]=costura2(im)
    lineas=[]; total=0
    for k,v in hojas.items():
        q = 82 if k.startswith('piso') else (74 if k=='arte' else 64)
        d=webp(v,q); total+=len(d)
        v.save(os.path.join(OUT,k+'.png')); open(os.path.join(OUT,k+'.webp'),'wb').write(d)
        lineas.append("  ['%s','data:image/webp;base64,%s'],"%(k, base64.b64encode(d).decode()))
        print('  %-10s %7d bytes  %s'%(k,len(d),v.size))
    open(os.path.join(OUT,'lineas.txt'),'w').write('\n'.join(lineas))
    print('total %.1f KB'%(total/1024))
