#!/usr/bin/env python3
"""Hornea las tres texturas de la criatura de CASA 13 y las pega en el HTML.

    TEX_DIR=/tmp/rez_fig/crudo python3 herramientas/casa13/hornear_fig.py

MISMO CRITERIO QUE `herramientas/casa/hornear_tex.py` Y POR LAS MISMAS RAZONES:

1. EL NIVEL LO LLEVA LA IMAGEN, no el tinte. Los tres materiales nacieron sin
   mapa, asi que se veian su propio `color` usado como reflectancia CRUDA —r128
   multiplica hex/255 sin gamma— y compensar con el tinte no alcanza: un color
   de material no pasa de blanco. Se escala la imagen EN LINEAL hasta que su
   promedio de el objetivo y el tinte queda en blanco (razon 1/color).

2. Y LOS OBJETIVOS NO SON GUSTO: son una RAZON. A 40 cm del flash lo que decide
   la composicion es cual de las dos superficies gana. La mortaja es ancha y
   plana y la cara es chica y curva, asi que con reflectancias parecidas la tela
   se lee como el sujeto y la cara como un detalle —fotografiado, el susto era
   un bloque blanco con una cabeza encima—. La piel va al doble que la tela.

3. NO SE COSEN LOS BORDES: `MirroredRepeatWrapping` del lado del juego hace que
   los dos bordes que se tocan sean EL MISMO borde.
"""
import base64, io, json, os, re, sys
import numpy as np
from PIL import Image

DIR = os.environ.get('TEX_DIR', '/tmp/rez_fig/crudo')
HTML = os.environ.get('HTML', os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', '..',
    'juegos-pc', 'Casa_Abandonada.html'))

# nombre -> (archivo, lado, material, objetivo lineal, fuerza del relieve, repeticion)
#
# LOS LADOS: la mortaja es lo que mas superficie ocupa y lo que se mira mas de
# cerca, asi que va a 320; el pelo necesita que se cuenten las hebras y va a 256;
# la piel es casi lisa —la foto no tiene poro— y a 192 no se pierde nada.
#
# LAS REPETICIONES SALEN DE CUANTOS METROS CUBRE LA FOTO. El camison mide 1,4 m
# de alto por 1,7 de vuelta y la tela de la foto cubre unos 0,4 m: de ahi 4 y
# 3,5. En el pelo la V va A LO LARGO DE LA HEBRA, que es como corre el dibujo.
TEX = {
    'mortaja': ('fig_mortaja.png', 320, 'mortaja', [0.108, 0.101, 0.090], 1.6, [4.0, 3.5]),
    'pielm':   ('fig_pielm.png',   192, 'pielm',   [0.205, 0.196, 0.186], 0.7, [2.0, 2.0]),
    'pelom':   ('fig_pelom.png',   256, 'pelom',   [0.0075, 0.0072, 0.0078], 2.2, [0.6, 1.6]),
}


def a_lineal(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def a_srgb(l):
    l = np.clip(np.asarray(l, dtype=np.float64), 0.0, 1.0)
    s = np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055)
    return np.clip(np.round(s * 255), 0, 255).astype(int)


def color_del_material(src, clave):
    """el color que el material tiene ESCRITO en el juego: la razon es 1/ese
    color, asi que en el juego el tinte termina en blanco y el nivel lo lleva
    la imagen. Se lee del propio HTML para que no haya dos verdades."""
    m = re.search(clave + r':\s*new THREE\.MeshStandardMaterial\(\{color:0x([0-9a-fA-F]{6})', src)
    if not m:
        raise SystemExit('no encuentro el color de %s' % clave)
    h = m.group(1)
    return np.asarray([int(h[i:i + 2], 16) for i in (0, 2, 4)]) / 255.0


def main():
    src = io.open(HTML, encoding='utf-8').read()
    ent, total = [], 0
    for nom, (arch, lado, clave, obj, fuerza, rep) in TEX.items():
        p = os.path.join(DIR, arch)
        if not os.path.exists(p):
            print('falta %s' % p); return 1
        im = Image.open(p).convert('RGB').resize((lado, lado), Image.LANCZOS)
        lin = a_lineal(np.asarray(im).astype(np.float64))
        prom0 = lin.reshape(-1, 3).mean(axis=0)
        k = np.asarray(obj) / np.maximum(prom0, 1e-6)
        im = Image.fromarray(a_srgb(np.clip(lin * k, 0, 1)).astype('uint8'), 'RGB')
        prom = a_lineal(np.asarray(im).astype(np.float64)).reshape(-1, 3).mean(axis=0)
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=84, method=6)
        b = buf.getvalue(); total += len(b)
        c = color_del_material(src, clave)
        razon = 1.0 / np.maximum(c, 1e-6)
        ent.append("%s:{b:'%s',m:['%s'],s:%s,r:[%s],rep:[%s]}" % (
            nom, base64.b64encode(b).decode(), clave, fuerza,
            ','.join('%.5f' % x for x in razon),
            ','.join('%g' % x for x in rep)))
        print('%-9s %3d px %6.1f KB  crudo %.4f -> %.4f (objetivo %.4f, error %.1e)'
              ' · tinte %s -> blanco'
              % (nom, lado, len(b) / 1024, prom0.mean(), prom.mean(),
                 np.mean(obj), float(np.abs(prom - obj).max()),
                 ''.join('%02x' % int(round(x * 255)) for x in c)))

    bloque = ('/*<<FIG_TEX>>*/Object.assign(FOTOS,{' + ','.join(ent) +
              '});/*<</FIG_TEX>>*/')
    if '/*<<FIG_TEX>>*/' in src:
        src = re.sub(r'/\*<<FIG_TEX>>\*/.*?/\*<</FIG_TEX>>\*/', lambda m: bloque,
                     src, count=1, flags=re.S)
    else:
        # VA DESPUES DEL LITERAL Y ANTES DEL BUCLE QUE LO RECORRE: puesto
        # despues, las tres entradas no se decodifican nunca.
        anc = '\nconst _FUND=fundirEstatico();'
        i = src.index('const FOTOS={')
        j = src.index('\n};', i) + 3
        src = src[:j] + '\n' + bloque + '\n' + src[j:]
    io.open(HTML, 'w', encoding='utf-8').write(src)
    print('\ntotal %.1f KB en webp · %.1f KB en base64 -> %s'
          % (total / 1024, total * 4 / 3 / 1024, os.path.basename(HTML)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
