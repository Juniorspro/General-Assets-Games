# -*- coding: utf-8 -*-
"""Arma las CAPAS DEL FONDO de Maicol: cielo solo, montañas, lomas, y junta los adornos
   viejos con los nuevos en una tira de doce.

   POR QUE SEPARAR EL CIELO. Con el cielo, las montañas, los árboles y el piso metidos en una
   sola foto, no importa cuánto camines: nada se mueve respecto de nada. Eso es un telón.
   Separadas y a velocidades distintas, caminar produce PARALAJE, que es lo único que da
   distancia en dos dimensiones.

   LAS BANDAS NO SE REPITEN DENTRO DE UN NIVEL. Una banda de 2400 px a 0,20 de velocidad dura
   12000 px de mundo = 250 casillas, y el nivel más ancho tiene 70. Aun así se le cose la
   costura por si acaso: se funde el borde derecho sobre el izquierdo y el corte desaparece.
"""
from PIL import Image
import numpy as np, os, sys, io, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cortar

ALTO_JUEGO=576

def caja_alfa(im, u=24):
    a=np.asarray(im.convert('RGBA')); m=a[:,:,3]>u
    f=np.where(m.any(axis=1))[0]; c=np.where(m.any(axis=0))[0]
    if not len(f): return None
    return (int(c.min()), int(f.min()), int(c.max())+1, int(f.max())+1)

def banda(ruta, ancho, alto):
    """Saca el magenta, recorta a lo que quedó y lo lleva al tamaño exacto que va a tener.
       SE APLASTA A LO ALTO A PROPOSITO, sin respetar la proporción. Respetándola, una sierra de
       2400x930 llevada a 176 de alto queda de 456 px de ancho: a 0,20 de velocidad eso dura 2280
       px de mundo y el nivel más ancho tiene 3384, así que la misma sierra se ve dos veces y
       media EN LA MISMA PANTALLA. Aplastada entra entera y no se repite nunca dentro de un
       nivel; una sierra lejana más chata sigue leyéndose a sierra lejana."""
    rgba, mask = cortar.quitar_magenta(Image.open(ruta))
    cj=caja_alfa(rgba)
    return rgba.crop(cj).resize((ancho, alto), Image.LANCZOS)

def tono(im, mul=1.0, sat=1.0):
    """Aclara/oscurece y baja el color de una banda. Hace falta porque las bandas vienen con el
       color a full: el escombro azul de la cueva sobre un fondo casi negro PEGA EN EL OJO y se
       lee mas cerca que el piso, que es exactamente al revés de lo que tiene que pasar. Bajar
       el color es lo que hace que algo se lea LEJOS -es lo que hace el aire en la realidad- y no
       simplemente mas chico."""
    a=np.asarray(im.convert('RGBA')).astype(np.float32)
    rgb=a[:,:,:3]
    gris=(rgb[:,:,0]*0.299+rgb[:,:,1]*0.587+rgb[:,:,2]*0.114)[:,:,None]
    rgb=(gris + (rgb-gris)*sat)*mul
    a[:,:,:3]=rgb.clip(0,255)
    return Image.fromarray(a.astype(np.uint8),'RGBA')

TONOS={   # mul, sat por banda
 'montebosque':(1.00,0.86), 'lomabosque':(0.92,0.80),
 'montecueva' :(1.06,0.86), 'lomacueva' :(0.60,0.52),
 'montefabrica':(0.92,0.56),'lomafabrica':(0.84,0.56),
}

def costura(im, frac=0.10):
    """Funde el borde derecho sobre el izquierdo: al repetir, el corte no se ve."""
    a=np.asarray(im.convert('RGBA')).astype(np.float32)
    H,W,_=a.shape; n=max(2,int(W*frac))
    izq=a[:, :n].copy(); der=a[:, W-n:].copy()
    t=np.linspace(0,1,n,dtype=np.float32)[None,:,None]     # 0 en el borde, 1 adentro
    a[:, :n] = izq*t + der*(1-t)
    a=a[:, :W-n]                                            # el trozo derecho ya se fundió
    return Image.fromarray(a.clip(0,255).astype(np.uint8),'RGBA')

# El aire de cada tema: paradas de un degrade vertical (posicion, r,g,b, alfa) mas un
# oscurecido parejo. VA HORNEADO EN EL CIELO, no pintado en cada cuadro. Pintarlo cuesta un
# relleno de PANTALLA ENTERA por cuadro -590 mil pixeles mezclados con alfa- y el resultado es
# exactamente el mismo, porque ni el degrade ni el oscurecido cambian nunca.
AIRE={
 'bosque': ([(0.00,(255,240,200),0.00),(0.62,(255,236,186),0.10),(1.00,(168,196,128),0.20)], ((10,13,20),0.14)),
 'cueva':  ([(0.00,( 24, 40, 58),0.34),(0.52,( 28, 86,104),0.20),(1.00,( 42,168,176),0.26)], ((10,13,20),0.14)),
 'fabrica':([(0.00,( 28, 16, 10),0.34),(0.55,(216,118, 44),0.12),(1.00,(255,158, 64),0.22)], ((10,13,20),0.14)),
}

def degrade(im, paradas, plano):
    """Le mezcla encima un degrade vertical y despues un color parejo, igual que lo haria el
       lienzo, pero una sola vez y para siempre."""
    a=np.asarray(im.convert('RGB')).astype(np.float32)
    H,W,_=a.shape
    y=np.linspace(0,1,H,dtype=np.float32)
    col=np.zeros((H,3),np.float32); alf=np.zeros((H,1),np.float32)
    for k in range(len(paradas)-1):
        p0,c0,a0 = paradas[k]; p1,c1,a1 = paradas[k+1]
        m=(y>=p0)&(y<=p1)
        if not m.any(): continue
        t=((y[m]-p0)/max(1e-6,(p1-p0)))[:,None]
        col[m]=np.array(c0,np.float32)*(1-t)+np.array(c1,np.float32)*t
        alf[m]=a0*(1-t)+a1*t
    a = a*(1-alf[:,None,:]) + col[:,None,:]*alf[:,None,:]
    c,al = plano
    a = a*(1-al) + np.array(c,np.float32)*al
    return Image.fromarray(a.clip(0,255).astype(np.uint8),'RGB')

def cielo(ruta, alto=ALTO_JUEGO, ancho=1200):
    im=Image.open(ruta).convert('RGB')
    h=round(ancho*im.size[1]/im.size[0])
    im=im.resize((ancho,h), Image.LANCZOS)
    # el cielo se dibuja estirado al alto de la pantalla, asi que se guarda a 1200 de ancho y listo
    return im

def celdas(im, n):
    """Parte una tira de n celdas iguales y devuelve cada figura recortada."""
    cw=im.size[0]//n; out=[]
    for k in range(n):
        c=im.crop((k*cw,0,(k+1)*cw,im.size[1]))
        cj=caja_alfa(c)
        out.append(c.crop(cj) if cj else c)
    return out

def a_alto(im, alto):
    w=max(1, round(im.size[0]*alto/im.size[1]))
    return im.resize((w,alto), Image.LANCZOS)

def tira(cs):
    W=max(c.size[0] for c in cs); H=max(c.size[1] for c in cs)
    out=Image.new('RGBA',(W*len(cs),H),(0,0,0,0))
    for k,c in enumerate(cs): out.paste(c,(k*W+(W-c.size[0])//2, H-c.size[1]), c)
    return out, W, H

def webp(im, q=86):
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6); return b.getvalue()

# el alto EN PANTALLA de cada banda, en px de los 576 del mundo
ANCHO_MONTE, ALTO_MONTE = 1040, 176
ANCHO_LOMA,  ALTO_LOMA  =  900, 104
# los adornos nuevos, en px del mundo
DECO2={
 'bosque': [40,42,30,34,40,42],
 'cueva':  [36,48,20,34,36,26],
 'fabrica':[28,32,44,26,30,44],
}
TEMAS=['bosque','cueva','fabrica']

if __name__=='__main__':
    CAP=sys.argv[1]           # carpeta con lo bajado (cielo*.png, monte*.png, loma*.png, deco2*.png)
    SAC=sys.argv[2]           # carpeta con lo sacado del HTML (decobosque.webp, ...)
    OUT=sys.argv[3]
    os.makedirs(OUT, exist_ok=True)
    hojas={}
    for t in TEMAS:
        hojas['cielo'+t]=degrade(cielo(os.path.join(CAP,'cielo'+t+'.png')), *AIRE[t])
        hojas['monte'+t]=tono(costura(banda(os.path.join(CAP,'monte'+t+'.png'), ANCHO_MONTE, ALTO_MONTE)), *TONOS['monte'+t])
        hojas['loma'+t] =tono(costura(banda(os.path.join(CAP,'loma'+t+'.png'),  ANCHO_LOMA,  ALTO_LOMA)),  *TONOS['loma'+t])
        # los doce adornos: seis que ya estaban mas seis nuevos, en una sola tira
        viejos=celdas(Image.open(os.path.join(SAC,'deco'+t+'.webp')).convert('RGBA'), 6)
        nuevos=[a_alto(c, DECO2[t][i]) for i,c in
                enumerate(cortar.cortar_parejo(os.path.join(CAP,'deco2'+t+'.png'), 6))]
        h,W,H=tira(viejos+nuevos)
        hojas['deco'+t]=h
        print('deco%-8s 12 celdas de %dx%d'%(t,W,H))
    total=0; lineas=[]
    for k,v in sorted(hojas.items()):
        d=webp(v); total+=len(d)
        v.save(os.path.join(OUT,k+'.png')); open(os.path.join(OUT,k+'.webp'),'wb').write(d)
        lineas.append("  ['%s','data:image/webp;base64,%s'],"%(k, base64.b64encode(d).decode()))
        print('  %-14s %7d bytes  %s'%(k,len(d),v.size))
    open(os.path.join(OUT,'lineas.txt'),'w').write('\n'.join(lineas))
    print('total %.1f KB'%(total/1024))
