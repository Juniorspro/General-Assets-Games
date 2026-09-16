# -*- coding: utf-8 -*-
"""Mete en Eco las imagenes de la historia, el logo, el telon, las doce voces y el ambiente.
   Van en mapas de data URI y NO por el cargador de imagenes del juego: Eco carga sus texturas
   con three.js y no tiene una lista tipo CARGA. Idempotente."""
import re, os, sys, base64
IMG=sys.argv[1]; VOZ=sys.argv[2]; AUD=sys.argv[3]; H=sys.argv[4]
s=open(H,encoding='utf-8').read()

def mapa(nombre, pares, coment):
    e=[]; tot=0
    for k, ruta in pares:
        b=open(ruta,'rb').read(); tot+=len(b)
        mime='image/webp' if ruta.endswith('.webp') else 'audio/mpeg'
        e.append("  %s:'data:%s;base64,%s'"%(k, mime, base64.b64encode(b).decode()))
    return coment+"const "+nombre+"={\n"+",\n".join(e)+"\n};\n", tot

BLOQUES=[
 ('IMGC', [(k, os.path.join(IMG,k+'.webp')) for k in ('cine1','cine2','cine3','cine4','logo','telon')],
  "/* Los cuatro planos de la historia, el nombre dibujado y el telon del menu. */\n"),
 ('VOZ', [('%s%d'%(i,n), os.path.join(VOZ,'%s%d.mp3'%(i,n))) for i in ('es','en','pt') for n in (1,2,3,4)],
  "/* Las doce lineas del relato: cuatro por idioma. Se decodifican SOLO si se mira la historia. */\n"),
 ('AMB', [(k, os.path.join(AUD,k+'.mp3')) for k in ('ambMenu','ambJuego')],
  "/* La cama de ambiente. Va muy abajo a proposito: en este juego el sonido es el mecanismo, y\n"
  "   cualquier cosa que tape un grito rompe el juego. */\n"),
]
tot=0
for nombre, pares, com in BLOQUES:
    b,t=mapa(nombre,pares,com); tot+=t
    if 'const '+nombre+'={' in s:
        i=s.index('const '+nombre+'={'); i=s.rindex('/*',0,i)
        j=s.index('};\n', s.index('const '+nombre+'={'))+3
        s=s[:i]+b+s[j:]; print(nombre,'reemplazado %.1f KB'%(t/1024))
    else:
        # antes del bloque de la historia, que es donde se usan
        i=s.index('/* ===================== LA HISTORIA Y EL AMBIENTE ===================== */')
        s=s[:i]+b+'\n'+s[i:]; print(nombre,'agregado %.1f KB'%(t/1024))
open(H,'w',encoding='utf-8').write(s)
print('total %.1f KB  ->  HTML %.1f KB'%(tot/1024, len(s.encode())/1024))
