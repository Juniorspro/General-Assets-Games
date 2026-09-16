# -*- coding: utf-8 -*-
"""Mete los GLB podados adentro del HTML de Eco, como data: URI.

   Van EN EL ARCHIVO y no en una CDN a proposito: Eco se sube a Rezona como un HTML suelto que se
   abre de un click, y un modelo que no baja es un monstruo invisible. Es el mismo criterio que ya
   se uso con la hoja de papel, la voz de la cinematica y el ambiente.

   uso: python3 meter_modelos.py <carpeta con cosa_p.glb ...> <Eco.html>
"""
import io, os, sys, base64

D, H = sys.argv[1], sys.argv[2]
CLAVES = ['cosa', 'pozo', 'figura', 'brasero', 'columna']

lineas, total = [], 0
for k in CLAVES:
    f = os.path.join(D, k + '_p.glb')
    if not os.path.exists(f):
        print('FALTA', f); sys.exit(1)
    d = open(f, 'rb').read(); total += len(d)
    lineas.append("  %s:'data:model/gltf-binary;base64,%s'," % (k, base64.b64encode(d).decode()))
bloque = ('/* Los cinco modelos, generados con Higgsfield y podados con herramientas/eco/podar_glb.py.\n'
          '   Sin coordenadas de textura ni tangentes —nada de eso se dibuja acá—, la normal a un byte,\n'
          '   la posición a dos y los pesos del esqueleto a uno. */\n'
          'const MOD={\n' + '\n'.join(lineas)[:-1] + '\n};\n')

s = io.open(H, encoding='utf-8').read()
i = s.find('const MOD={')
if i >= 0:
    j = s.find('\n};', i) + 3
    ini = s.rfind('/* Los cinco modelos', 0, i)
    if ini < 0: ini = i
    viejo = j - ini
    s = s[:ini] + bloque.rstrip('\n') + s[j:]
else:
    ancla = '/* ===================== LOS MODELOS 3D ====================='
    if ancla not in s: print('no encuentro donde meterlo'); sys.exit(1)
    viejo = 0
    s = s.replace(ancla, bloque + ancla, 1)
io.open(H, 'w', encoding='utf-8').write(s)
print('MOD: %d modelos, %.0f KB de GLB, bloque %d -> %d bytes' % (len(CLAVES), total/1024, viejo, len(bloque)))
