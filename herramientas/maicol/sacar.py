# -*- coding: utf-8 -*-
"""Saca las imagenes incrustadas del HTML a archivos sueltos. Hace falta cada vez que el
   contenedor se recicla: las hojas ya armadas viven adentro del HTML, que es lo unico que
   sobrevive porque esta en git."""
import re, base64, os, sys
H=sys.argv[1] if len(sys.argv)>1 else 'juegos-pc/Maicol.html'
D=sys.argv[2] if len(sys.argv)>2 else 'sacado'
os.makedirs(D, exist_ok=True)
txt=open(H, encoding='utf-8').read()
n=0
for m in re.finditer(r"\['([A-Za-z_0-9]+)','data:image/(webp|png);base64,([A-Za-z0-9+/=]+)'\]", txt):
    k, tipo, b64 = m.group(1), m.group(2), m.group(3)
    d=base64.b64decode(b64)
    open(os.path.join(D, k+'.'+tipo),'wb').write(d)
    print('%-14s %7d bytes'%(k, len(d))); n+=1
print(n, 'imagenes')
