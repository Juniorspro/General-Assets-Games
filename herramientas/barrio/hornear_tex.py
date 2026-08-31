#!/usr/bin/env python3
"""Hornea las siete texturas de BARRIO y escribe partes/x.js.

    python3 herramientas/barrio/hornear_tex.py

DE DÓNDE SALEN: generadas con Higgsfield (`z_image`), pedidas como muestras de
material planas, vistas de frente y sin sombras — un pedido de «textura» que no
dice «sin sombras» devuelve una foto con la luz horneada, y esa luz pelea con la
del juego en cada superficie.

TRES COSAS QUE HACE ESTE SCRIPT Y NINGUNA ES OBVIA:

1. NO SE COSEN LOS BORDES. Al modelo se le pidió «sin costura» y ninguna imagen
   generada lo es de verdad; coserlas a mano —desplazando media imagen y
   difuminando el cruce— ensucia justo el centro, que es lo que más se mira. Se
   resuelve del otro lado, con `MirroredRepeatWrapping`: la copia de al lado va
   dada vuelta, así que los dos bordes que se tocan son EL MISMO BORDE y la
   costura no puede existir. Lo que se paga es que el patrón queda simétrico
   cada dos repeticiones, y en manchas —asfalto, pasto, revoque— eso no se ve.
   Es la misma solución que RECREO.

2. SE MIDE CUÁNTOS METROS CUBRE CADA IMAGEN, contando los elementos que tienen
   medida conocida: las hiladas del ladrillo, las tablas del revestimiento, las
   filas de teja. Sin eso una pared de ladrillo sale con hiladas de veintidós
   centímetros y la casa se lee a casa de muñecas. El número va al lado de cada
   textura y NO en el código del juego, porque es una propiedad de la imagen.

3. Y SE ACHICAN MUCHO. El juego dibuja a 1/1,7 de resolución y estira con
   NEAREST: una textura de dos mil píxeles sería lo único nítido de la pantalla.
   A 384 y en WebP las siete pesan lo que pesa una foto.
"""
import base64, io, os, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ENTRADA = '/tmp/tex2'

#  nombre      archivo         lado  calidad  metros que cubre (contados en la imagen)
#
# LA SEGUNDA TANDA ES FOTORREALISTA (Recraft V4.1 en `utility`, 2048 px), y por
# eso los metros CAMBIARON: la escala no es una preferencia, sale de contar los
# elementos que tienen medida conocida. Contados sobre la imagen nueva, con el
# perfil de bordes y después a ojo sobre el recorte:
#   · ladrillo  12 hiladas  × 7,5 cm  = 0,90 m
#   · tabla      9 tablas   × 18 cm   = 1,62 m
#   · teja       5 hiladas  × 16 cm   = 0,80 m
#   · madera    24 tablas   × 9 cm    = 2,16 m
# Con los números viejos, la pared nueva salía con hiladas de 8,3 cm en vez de
# 7,5 y el revestimiento con tablas de 23 — la casa se lee a casa de muñecas, que
# es exactamente el defecto que estos números existen para evitar.
#
# Y LOS TRES QUE SE MIRAN DE CERCA SUBEN A 448. El juego dibuja a 1/1,7 y estira
# con NEAREST, así que 384 alcanzaba para un dibujo plano; una foto con grano de
# árido y veta de madera pierde justo eso, y ladrillo, revestimiento y teja son
# las tres que el jugador tiene a tres metros de la cara caminando por la vereda.
PLAN = [
    ('asfalto',  'asfalto.png',  384, 76, 2.40),
    ('vereda',   'vereda.png',   384, 78, 1.30),
    ('pasto',    'pasto.png',    384, 74, 1.60),
    ('madera',   'madera.png',   384, 80, 2.16),
    ('ladrillo', 'ladrillo.png', 448, 78, 0.90),
    ('tabla',    'tabla.png',    448, 80, 1.62),
    ('teja',     'teja.png',     448, 76, 0.80),
]


def main():
    piezas, inf, metros = [], [], []
    for nom, arch, lado, q, m in PLAN:
        p = os.path.join(ENTRADA, arch)
        if not os.path.exists(p):
            print('  falta', p); continue
        im = Image.open(p).convert('RGB').resize((lado, lado), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
        by = b.getvalue()
        piezas.append("  %s: '%s'" % (nom, base64.b64encode(by).decode('ascii')))
        metros.append('  %s: %.2f' % (nom, m))
        inf.append((nom, lado, len(by)))

    js = ("\n/* ═════════════════════ LAS SIETE TEXTURAS GENERADAS ═════════════════════\n"
          "   Asfalto, vereda, pasto, madera de cerca, ladrillo, revestimiento y teja,\n"
          "   generadas con Higgsfield y horneadas con\n"
          "   `herramientas/barrio/hornear_tex.py`.\n"
          "   NO REEMPLAZAN A LAS DIBUJADAS POR CÓDIGO: LAS PISAN CUANDO LLEGAN. Un\n"
          "   data URI se decodifica de forma asincrónica, así que un material que\n"
          "   naciera esperando la foto daría veinte cuadros en negro. Nace con el\n"
          "   lienzo, que ya funciona, y la foto entra encima. Si una no decodifica,\n"
          "   ese material se queda con su dibujo y no hay estado roto posible.\n"
          "   `TEX_M` es cuántos METROS cubre cada imagen, contados sobre ella: de ahí\n"
          "   sale la repetición de cada superficie. */\n"
          "const TEX_B64 = {\n" + ",\n".join(piezas) + "\n};\n"
          "const TEX_M = {\n" + ",\n".join(metros) + "\n};\n")
    io.open(os.path.join(AQUI, 'partes', 'x.js'), 'w', encoding='utf8').write(js)

    tot = 0
    for n, l, b in inf:
        print('%-9s %4dpx %7d bytes' % (n, l, b)); tot += b
    print('total %d KB · en base64 %d KB' % (tot//1024, tot*4//3//1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
