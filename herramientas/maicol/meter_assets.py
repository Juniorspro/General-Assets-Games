# -*- coding: utf-8 -*-
"""Mete las hojas nuevas dentro del HTML: reemplaza la del personaje y agrega las otras.
   Es idempotente: se puede volver a correr sin duplicar nada."""
import re, os, sys, base64
D=sys.argv[1]; H=sys.argv[2]
listo=os.path.join(D,'listo')
s=open(H,encoding='utf-8').read()

def linea(k):
    d=open(os.path.join(listo,k+'.webp'),'rb').read()
    return "  ['%s','data:image/webp;base64,%s'],"%(k, base64.b64encode(d).decode()), len(d)

# 1) el personaje: se reemplaza en el lugar
l,n = linea('maicol')
s2=re.sub(r"  \['maicol','data:image/webp;base64,[A-Za-z0-9+/=]+'\],", l.replace('\\','\\\\'), s, count=1)
assert s2!=s, 'no encontre la linea de maicol'
s=s2; print('maicol reemplazado (%d bytes)'%n)

# 2) las nuevas: se agregan antes del cierre de CARGA, sin repetir
nuevas=['decobosque','decocueva','decofabrica','arbol','pajaro','hoja']
faltan=[k for k in nuevas if ("['%s','data:image/webp"%k) not in s]
if faltan:
    bloque='\n'.join(linea(k)[0] for k in faltan)
    i=s.index("];\ncargarTodo(CARGA)")
    # el ULTIMO de la lista no lleva coma. Si se agrega abajo sin ponersela, JS lee las dos lineas
    # como ['a','b']['c','d'] -o sea un acceso por indice- y se come DOS elementos de un saque.
    if not s[:i].rstrip().endswith(','):
        j=s.rindex("'],", 0, i) if "'],"in s[:i] else -1
        k=s.rindex("']", 0, i)
        s=s[:k+2]+','+s[k+2:]; i+=1
    s=s[:i]+bloque+'\n'+s[i:]
    print('agregadas:', ', '.join(faltan))
else:
    print('las nuevas ya estaban; se reemplazan')
    for k in nuevas:
        l,_=linea(k)
        s=re.sub(r"  \['%s','data:image/webp;base64,[A-Za-z0-9+/=]+'\],"%k, l.replace('\\','\\\\'), s, count=1)

open(H,'w',encoding='utf-8').write(s)
print('HTML ahora %.1f KB'%(len(s.encode())/1024))
