# -*- coding: utf-8 -*-
"""Cambia las imagenes del HTML por las capas nuevas: saca las fotos enteras de fondo (que ahora
   las reemplaza el cielo mas las bandas), reemplaza las tiras de adornos por las de doce y agrega
   cielo, monte y loma. Idempotente."""
import re, os, sys, base64
D=sys.argv[1]; H=sys.argv[2]
s=open(H,encoding='utf-8').read()

def dato(k):
    d=open(os.path.join(D,k+'.webp'),'rb').read()
    return "  ['%s','data:image/webp;base64,%s'],"%(k, base64.b64encode(d).decode()), len(d)

FUERA=['bosque','cueva','fabrica']
TEMAS=['bosque','cueva','fabrica']
CAMBIA=['deco'+t for t in TEMAS]
NUEVAS=[p+t for p in ('cielo','monte','loma') for t in TEMAS]

# 1) afuera las fotos enteras. El patron pide ['bosque', y no ['decobosque', porque el corchete
#    y la comilla del arranque no matchean en el medio de otra palabra.
for k in FUERA:
    n=len(re.findall(r"  \['%s','data:image/webp;base64,[A-Za-z0-9+/=]+'\],?\n"%k, s))
    s=re.sub(r"  \['%s','data:image/webp;base64,[A-Za-z0-9+/=]+'\],?\n"%k, '', s)
    print('fuera %-9s x%d'%(k,n))

# 2) las tiras de adornos, reemplazadas en el lugar
for k in CAMBIA:
    l,n=dato(k)
    pat=r"  \['%s','data:image/webp;base64,[A-Za-z0-9+/=]+'\],"%k
    # se compara CONTRA EL PATRON, no contra el texto: si la hoja nueva es igual a la que ya
    # estaba, re.sub no cambia nada y comparar textos diria "falta" cuando en realidad esta bien
    assert re.search(pat, s), 'no encontre la linea de '+k
    s=re.sub(pat, lambda m: l, s, count=1)
    print('cambia %-12s %6d bytes'%(k,n))

# 3) las nuevas, antes del cierre. OJO: el ultimo elemento no lleva coma; sin ponersela, JS lee
#    ['a','b']['c','d'] como un acceso por indice y se come dos elementos.
faltan=[k for k in NUEVAS if ("['%s','data:image/webp"%k) not in s]
if faltan:
    i=s.index("];\ncargarTodo(CARGA)")
    if not s[:i].rstrip().endswith(','):
        k=s.rindex("']", 0, i); s=s[:k+2]+','+s[k+2:]; i+=1
    bloque='\n'.join(dato(k)[0] for k in faltan)
    s=s[:i]+bloque+'\n'+s[i:]
    print('agregadas:', ', '.join(faltan))
else:
    for k in NUEVAS:
        l,_=dato(k)
        s=re.sub(r"  \['%s','data:image/webp;base64,[A-Za-z0-9+/=]+'\],"%k, lambda m: l, s, count=1)
    print('las nuevas ya estaban; reemplazadas')

open(H,'w',encoding='utf-8').write(s)
print('HTML %.1f KB'%(len(s.encode())/1024))
