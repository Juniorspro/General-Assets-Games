# -*- coding: utf-8 -*-
"""Mete los dibujos de la cinematica, el arte del menu, las texturas del piso y las doce voces.
   Idempotente."""
import re, os, sys, base64
D3=sys.argv[1]; VOC=sys.argv[2]; H=sys.argv[3]
s=open(H,encoding='utf-8').read()

def img(k):
    d=open(os.path.join(D3,k+'.webp'),'rb').read()
    return "  ['%s','data:image/webp;base64,%s'],"%(k, base64.b64encode(d).decode()), len(d)

NUEVAS=['cine1','cine2','cine3','cine4','arte','pisobosque','pisocueva','pisofabrica']
faltan=[k for k in NUEVAS if ("['%s','data:image/webp"%k) not in s]
tot=0
if faltan:
    i=s.index("];\ncargarTodo(CARGA)")
    if not s[:i].rstrip().endswith(','):
        k=s.rindex("']", 0, i); s=s[:k+2]+','+s[k+2:]; i+=1
    bl=[]
    for k in faltan: l,n=img(k); bl.append(l); tot+=n
    s=s[:i]+'\n'.join(bl)+'\n'+s[i:]
    print('imagenes agregadas:', ', '.join(faltan), '%.1f KB'%(tot/1024))
else:
    for k in NUEVAS:
        l,n=img(k); tot+=n
        pat=r"  \['%s','data:image/webp;base64,[A-Za-z0-9+/=]+'\],"%k
        assert re.search(pat,s), 'falta la linea de '+k
        s=re.sub(pat, lambda m: l, s, count=1)
    print('imagenes reemplazadas %.1f KB'%(tot/1024))

# LAS VOCES VAN EN SU PROPIO MAPA, no en CARGA: cargarTodo hace new Image() con cada entrada y una
# imagen con un mp3 adentro no carga nunca — la promesa quedaria colgada y el juego no arrancaria.
voces=[]; tv=0
for idi in ('es','en','pt'):
    for k in (1,2,3,4):
        f=os.path.join(VOC,'%s%d.mp3'%(idi,k))
        d=open(f,'rb').read(); tv+=len(d)
        voces.append("  %s%d:'data:audio/mpeg;base64,%s'"%(idi,k, base64.b64encode(d).decode()))
bloque="/* LAS DOCE VOCES DE LA CINEMATICA: cuatro lineas por idioma. Van en un mapa aparte y no en\n"\
       "   CARGA, porque cargarTodo hace new Image() con cada entrada y una imagen con un mp3 adentro\n"\
       "   no carga nunca: la promesa quedaria colgada y el juego no arrancaria jamas. */\n"\
       "const VOZ={\n"+",\n".join(voces)+"\n};\n"
if 'const VOZ={' in s:
    i=s.index('/* LAS DOCE VOCES'); j=s.index('};\n', s.index('const VOZ={'))+3
    s=s[:i]+bloque+s[j:]
    print('voces reemplazadas %.1f KB'%(tv/1024))
else:
    i=s.index('const CARGA=[')
    s=s[:i]+bloque+s[i:]
    print('voces agregadas %.1f KB'%(tv/1024))

open(H,'w',encoding='utf-8').write(s)
print('HTML %.1f KB'%(len(s.encode())/1024))
