# -*- coding: utf-8 -*-
"""Cambia la foto del cuarto plano de la cinematica de Eco.

   El plano 4 contaba las hojas en las paredes; ahora cuenta la puerta de cuatro cerraduras y las
   llaves. La foto vieja mostraba unos papeles escritos: con el guion nuevo, la imagen decia una cosa
   y el pie decia otra. Se rehace con el mismo tratamiento que las otras tres —720 px de ancho y WEBP
   de calidad 66— para que las cuatro pesen y se vean igual.
   uso: python3 meter_cine4.py <p4.png> <Eco.html>
"""
import io, sys, base64
from PIL import Image

F, H = sys.argv[1], sys.argv[2]
im = Image.open(F).convert('RGB')
im = im.resize((720, round(720 * im.size[1] / im.size[0])), Image.LANCZOS)
b = io.BytesIO(); im.save(b, 'WEBP', quality=66, method=6)
dato = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

s = io.open(H, encoding='utf-8').read()
i = s.find("\n  cine4:'data:image/webp;base64,")
if i < 0: print('no encuentro cine4'); sys.exit(1)
j = s.find("',", i)
viejo = j - i
s = s[:i] + "\n  cine4:'" + dato + s[j:]
io.open(H, 'w', encoding='utf-8').write(s)
print('cine4 %s  %d -> %d bytes de base64' % (im.size, viejo, len(dato)))
