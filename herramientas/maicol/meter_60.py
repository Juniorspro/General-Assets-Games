# -*- coding: utf-8 -*-
"""Mete el atlas de 60 cuadros, los ocho efectos y los cuatro temas. Idempotente."""
import re, os, sys, base64
ATL=sys.argv[1]; AUD=sys.argv[2]; H=sys.argv[3]
s=open(H,encoding='utf-8').read()

# 1) el atlas
d=open(os.path.join(ATL,'maicol.webp'),'rb').read()
l="  ['maicol','data:image/webp;base64,%s'],"%base64.b64encode(d).decode()
pat=r"  \['maicol','data:image/webp;base64,[A-Za-z0-9+/=]+'\],"
assert re.search(pat,s), 'no encontre maicol'
s=re.sub(pat, lambda m: l, s, count=1)
print('atlas %d cuadros -> %.1f KB'%(60, len(d)/1024))

# 2) efectos y temas, cada uno en su mapa. NO van en CARGA: cargarTodo hace new Image() con cada
#    entrada y una imagen con un mp3 adentro no carga nunca.
def mapa(nombre, claves, coment):
    e=[]; tot=0
    for k in claves:
        b=open(os.path.join(AUD,k+'.mp3'),'rb').read(); tot+=len(b)
        e.append("  %s:'data:audio/mpeg;base64,%s'"%(k, base64.b64encode(b).decode()))
    return coment+"const "+nombre+"={\n"+",\n".join(e)+"\n};\n", tot

EF=['sSalto','sPisa','sEstrella','sDano','sMuerte','sResorte','sMeta','sAgacha']
MU=['musMenu','musBosque','musCueva','musFabrica']
b1,t1=mapa('SFX', EF,
 "/* LOS OCHO EFECTOS, grabados. Reemplazan a los osciladores: un oscilador sirve para probar que\n"
 "   suena algo, no para que suene bien. */\n")
b2,t2=mapa('MUS', MU,
 "/* LOS CUATRO TEMAS: menu, bosque, cueva y fabrica. Vienen en AAC de 1 MB cada uno; se recorta un\n"
 "   pedazo de 13 a 14 segundos que DA LA VUELTA -la cola fundida sobre la cabeza, porque un tema\n"
 "   cortado en seco da un golpe cada vuelta y ese golpe se escucha mas que la musica- y se pasa a\n"
 "   MP3 mono de 40 kbps: de 3,9 MB a 276 KB. Ver herramientas/maicol/armar_audio.py. */\n")
for nombre, bloque in (('SFX',b1), ('MUS',b2)):
    if 'const '+nombre+'={' in s:
        i=s.index('const '+nombre+'={'); i=s.rindex('/*', 0, i)
        j=s.index('};\n', s.index('const '+nombre+'={'))+3
        s=s[:i]+bloque+s[j:]
        print(nombre, 'reemplazado')
    else:
        i=s.index('const CARGA=[')
        s=s[:i]+bloque+s[i:]
        print(nombre, 'agregado')
print('efectos %.1f KB, temas %.1f KB'%(t1/1024, t2/1024))
open(H,'w',encoding='utf-8').write(s)
print('HTML %.1f KB'%(len(s.encode())/1024))
