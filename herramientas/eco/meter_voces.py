# -*- coding: utf-8 -*-
"""Cambia las doce voces de la cinematica de Eco por las nuevas.

   Hace falta porque el guion cambio: los planos 2, 3 y 4 dicen otra cosa, y el pie de pantalla es
   EL MISMO texto que se escucha. Dejar la voz vieja seria peor que no tener voz — se leeria una
   frase y se oiria otra. Se rehacen los doce y no los nueve que cambiaron para que la cinematica
   entera vaya con la misma voz: mezclar dos narradores en cuatro planos se nota mas que el cambio.
   uso: python3 meter_voces.py <carpeta con es1.mp3 ... pt4.mp3> <Eco.html>
"""
import io, os, sys, base64

D, H = sys.argv[1], sys.argv[2]
CLAVES = ['%s%d' % (i, n) for i in ('es', 'en', 'pt') for n in (1, 2, 3, 4)]

lineas, total = [], 0
for k in CLAVES:
    f = os.path.join(D, k + '.mp3')
    if not os.path.exists(f):
        print('FALTA', f); sys.exit(1)
    d = open(f, 'rb').read(); total += len(d)
    lineas.append("  %s:'data:audio/mpeg;base64,%s'," % (k, base64.b64encode(d).decode()))
nuevo = 'const VOZ={\n' + '\n'.join(lineas)[:-1] + '\n};'

s = io.open(H, encoding='utf-8').read()
i = s.find('const VOZ={')
j = s.find('\n};', i)
if i < 0 or j < 0:
    print('no encuentro el bloque VOZ'); sys.exit(1)
viejo = j + 3 - i
s = s[:i] + nuevo + s[j + 3:]
io.open(H, 'w', encoding='utf-8').write(s)
print('VOZ: %d claves, %.1f KB de mp3, bloque %d -> %d' % (len(CLAVES), total / 1024, viejo, len(nuevo)))
