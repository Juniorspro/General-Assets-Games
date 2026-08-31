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

# DOS TANDAS Y UNA MEZCLA, Y LA MEZCLA ESTÁ MEDIDA DENTRO DEL JUEGO.
#
#   hf = Higgsfield (`z_image`, Recraft V4.1, 2048 px)  → /tmp/tex2
#   rz = Rezona Lab (`generate_image`, 1024 px)         → /tmp/tex3
#
# NO SE ELIGE POR LA HOJA DE CONTACTOS, y esa es la parte que importa. Una
# textura mirada al tamaño en el que sale del generador miente: en el juego la
# misma imagen se ve a 1/1,7 de resolución, achicada a 384 o 448, de noche, con
# la repetición puesta y con el tinte del material encima. Horneadas las dos
# tandas y fotografiados los mismos cuatro encuadres con las dos, la de Rezona
# gana en dos:
#   · pasto  — es la única en la que Rezona conserva más detalle al achicarla
#              (67,9 contra 50,4 de desviación local), y en el jardín eso se ve.
#   · madera — sus tablas son más anchas, así que a 1,12 m cada piquete de la
#              cerca se lee por separado; con la otra, la cerca de noche es una
#              mancha oscura.
# y la de Higgsfield gana en las otras cinco, sobre todo en TEJA: la de Rezona es
# pizarra oscura y de noche el techo entero desaparece en una silueta negra —
# medido, 25,0 de detalle contra 48,3.
#
# Se puede forzar una tanda entera para volver a comparar:
#     TEX_DIR=/tmp/tex3 TEX_SAL=partes/x_rz.js python3 hornear_tex.py
FUENTES = {'hf': '/tmp/tex2', 'rz': '/tmp/tex3'}
FORZAR = os.environ.get('TEX_DIR')
SALIDA = os.environ.get('TEX_SAL', os.path.join('partes', 'x.js'))

#  nombre      de   lado  calidad  metros que cubre (contados en la imagen)
#
# LOS METROS SE CUENTAN SOBRE LA IMAGEN QUE SE USA, no sobre «la textura»: son
# dos fotos distintas y tienen distinta cantidad de elementos. Sin esta cuenta
# una pared sale con hiladas de veintidós centímetros y la casa se lee a casa de
# muñecas.
#   hf · ladrillo 12 hiladas × 7,5 cm · tabla 9 × 18 cm · teja 5 × 16 cm
#   rz · madera    8 tablas  × 14 cm  · pasto sin elemento con medida, va por ojo
#
# Y LOS TRES QUE SE MIRAN DE CERCA VAN A 448. El juego dibuja a 1/1,7 y estira
# con NEAREST, así que 384 alcanzaba para un dibujo plano; una foto con grano de
# árido y veta de madera pierde justo eso, y ladrillo, revestimiento y teja son
# las tres que el jugador tiene a tres metros de la cara caminando por la vereda.
PLAN = [
    ('asfalto',  'hf', 384, 76, 2.40),
    ('vereda',   'hf', 384, 78, 1.30),
    ('pasto',    'rz', 384, 74, 1.60),
    ('madera',   'rz', 384, 80, 1.12),
    ('ladrillo', 'hf', 448, 78, 0.90),
    ('tabla',    'hf', 448, 80, 1.62),
    ('teja',     'hf', 448, 76, 0.80),
]

# Si se fuerza una tanda entera, los metros de la otra no valen: son de la foto.
METROS_FORZADO = {
    '/tmp/tex3': {'ladrillo': 1.12, 'tabla': 1.98, 'teja': 0.80, 'madera': 1.12},
    '/tmp/tex2': {'ladrillo': 0.90, 'tabla': 1.62, 'teja': 0.80, 'madera': 2.16,
                  'pasto': 1.60},
}


def main():
    piezas, inf, metros = [], [], []
    for nom, de, lado, q, m in PLAN:
        dir_ = FORZAR or FUENTES[de]
        if FORZAR:
            m = METROS_FORZADO.get(FORZAR, {}).get(nom, m)
        p = os.path.join(dir_, nom + '.png')
        if not os.path.exists(p):
            print('  falta', p); continue
        im = Image.open(p).convert('RGB').resize((lado, lado), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
        by = b.getvalue()
        piezas.append("  %s: '%s'" % (nom, base64.b64encode(by).decode('ascii')))
        metros.append('  %s: %.2f' % (nom, m))
        inf.append((nom, de if not FORZAR else '--', lado, len(by)))

    js = ("\n/* ═════════════════════ LAS SIETE TEXTURAS GENERADAS ═════════════════════\n"
          "   Asfalto, vereda, pasto, madera de cerca, ladrillo, revestimiento y teja,\n"
          "   generadas con Higgsfield y con Rezona Lab y horneadas con\n"
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
    io.open(os.path.join(AQUI, SALIDA), 'w', encoding='utf8').write(js)

    tot = 0
    for n, d, l, b in inf:
        print('%-9s %-3s %4dpx %7d bytes' % (n, d, l, b)); tot += b
    print('total %d KB · en base64 %d KB' % (tot//1024, tot*4//3//1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
