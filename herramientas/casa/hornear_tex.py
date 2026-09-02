#!/usr/bin/env python3
"""Hornea las texturas de foto de LA CASA y calcula el tinte que las compensa.

    TEX_DIR=/tmp/rez_casa/assets python3 herramientas/casa/hornear_tex.py

QUE HACE Y POR QUE CADA COSA:

1. ACHICA. El juego dibuja a 1,5 de pixel ratio, de noche, y encima le pasa
   grano, croma arrastrado y lineas de barrido. Una foto de 1024 px es detalle
   que el post destruye antes de que llegue al ojo — y son bytes dentro de un
   HTML autocontenido. Las dos que se miran de cerca van a 512 y el resto a 256.

2. NO COSE LOS BORDES. Al modelo se le pidieron texturas "sin costura" y ninguna
   lo es de verdad: medido, el salto en el borde va de 1,2 a 2,4 veces la
   variacion interna. Coserlas a mano ensucia el centro, que es lo que mas se
   mira. Se resuelve del otro lado con MirroredRepeatWrapping: la copia de al
   lado va dada vuelta, asi que los dos bordes que se tocan son EL MISMO borde y
   la costura no puede existir. Lo que se paga es que el patron queda simetrico
   cada dos repeticiones — y acá no se ve, porque lo unico que ilumina es el
   cono de una linterna y nunca hay dos repeticiones en el cuadro a la vez.

3. CALCULA EL TINTE. three.js multiplica map x vertexColor x material.color, o
   sea que el color del material es un TINTE SOBRE LA IMAGEN. La pared dibujada
   promedia 0,078 en lineal y la foto 0,353: dejando el tinte donde estaba, la
   casa entera se iba lavada. El tinte nuevo sale de dividir EN LINEAL el
   promedio viejo por el nuevo, canal por canal, y multiplicar el tinte viejo
   por eso. El producto queda igual por construccion, que es la prueba de que
   compensa y no de que quedo lindo.
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image

DIR = os.environ.get('TEX_DIR', '/tmp/rez_casa/assets')
SAL = os.environ.get('SALIDA', '/tmp/casa_tex.json')

# nombre -> (archivo, lado en px)
# TODAS A 256, Y EL NUMERO SALE DE UNA MEDICION, NO DE UNA CORAZONADA.
# Se probo con madera y pared a 512 y se midio el detalle —energia de alta
# frecuencia sobre la zona iluminada, con la imagen reducida para que las lineas
# de barrido del post no taparan el material— contra las texturas dibujadas:
#     reducido /1  foto/canvas 1,002
#     reducido /2              1,020
#     reducido /3              1,033
#     reducido /4              0,976
# o sea NADA en todas las escalas, con la dispersion mas grande que el efecto.
# Si 512 no se distingue de 256, 512 son bytes regalados: la casa se ve por el
# cono de una linterna y el post le pasa croma arrastrado, grano y lineas
# encima. Lo que la foto SI aporta es estructura —la junta entre dos tablas, la
# veta irregular— y eso sobrevive a 256.
TEX = {
    'madera':    ('tex-madera-g1.png',    256),
    'pared':     ('tex-pared-g1.png',     256),
    'cemento':   ('tex-cemento-g1.png',   256),
    'machimbre': ('tex-machimbre-g1.png', 256),
}

# lo medido DENTRO del juego con __casa.promedio(): promedio en lineal del
# lienzo que cada material usa hoy, y el tinte con el que esta calibrado.
VIEJO = {
    'wall':  ([0.07765, 0.06483, 0.04400], '8f8a7c', 'pared'),
    'ceil':  ([0.07765, 0.06483, 0.04400], '55503f', 'pared'),
    'floor': ([0.02582, 0.01546, 0.00815], '9c917f', 'madera'),
    'wood':  ([0.02582, 0.01546, 0.00815], '7d6c58', 'madera'),
    'bark':  ([0.02582, 0.01546, 0.00815], '3a3128', 'madera'),
    'conc':  ([0.02318, 0.02377, 0.02064], '93938d', 'cemento'),
    'machi': ([0.02991, 0.01707, 0.00888], '8d8271', 'machimbre'),
    'machiD':([0.02991, 0.01707, 0.00888], '5d5445', 'machimbre'),
}


def a_lineal(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def a_srgb(l):
    l = np.clip(np.asarray(l, dtype=np.float64), 0.0, 1.0)
    s = np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055)
    return np.clip(np.round(s * 255), 0, 255).astype(int)


def hex_a_lin(h):
    return a_lineal([int(h[i:i + 2], 16) for i in (0, 2, 4)])


def main():
    if not os.path.isdir(DIR):
        print('no existe %s' % DIR); return 1
    salida = {'tex': {}, 'tintes': {}}
    total = 0
    for nom, (arch, lado) in TEX.items():
        p = os.path.join(DIR, arch)
        if not os.path.exists(p):
            print('falta %s' % p); return 1
        im = Image.open(p).convert('RGB')
        im = im.resize((lado, lado), Image.LANCZOS)
        prom = a_lineal(np.asarray(im).astype(np.float64)).reshape(-1, 3).mean(axis=0)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=82, method=6)
        b = buf.getvalue()
        total += len(b)
        salida['tex'][nom] = {
            'b64': base64.b64encode(b).decode(),
            'px': lado, 'bytes': len(b), 'prom': [round(x, 5) for x in prom],
        }
        print('%-10s %4d px  %6.1f KB  promedio lineal %.4f %.4f %.4f'
              % (nom, lado, len(b) / 1024, *prom))

    print()
    for mat, (viejo_prom, viejo_hex, tex) in VIEJO.items():
        nuevo = np.asarray(salida['tex'][tex]['prom'])
        razon = np.asarray(viejo_prom) / np.maximum(nuevo, 1e-6)
        nl = hex_a_lin(viejo_hex) * razon
        # SI EL TINTE SE PASA DE 1 NO SE PUEDE COMPENSAR DEL TODO: un color de
        # material no va mas alla de blanco. Se avisa en vez de mentir.
        tope = float(nl.max())
        nl_c = np.clip(nl, 0, 1)
        r, g, b = a_srgb(nl_c)
        nh = '%02x%02x%02x' % (r, g, b)
        prod_v = hex_a_lin(viejo_hex) * np.asarray(viejo_prom)
        prod_n = nl_c * nuevo
        err = float(np.abs(prod_v - prod_n).max())
        salida['tintes'][mat] = nh
        print('%-7s %s -> %s   razon %.3f %.3f %.3f   error del producto %.2e%s'
              % (mat, viejo_hex, nh, *razon, err, '  OJO: topado' if tope > 1 else ''))

    io.open(SAL, 'w').write(json.dumps(salida))
    print('\ntotal %.1f KB en webp  ·  %.1f KB en base64  ->  %s'
          % (total / 1024, total * 4 / 3 / 1024, SAL))
    return 0


if __name__ == '__main__':
    sys.exit(main())
