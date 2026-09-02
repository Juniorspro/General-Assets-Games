#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hornea las texturas PBR de PUERTA BLANCA: 24 fotos generadas -> un solo .js.

QUE HACE Y POR QUE, en orden:

1. **ACHICA.** El juego dibuja a 1/1,x de resolucion y con filtro VHS encima: una
   foto de 1024 es detalle que no llega a la pantalla y cuatro veces la memoria.
   El tamano sale de cuanto se mira la superficie, no de una constante.

2. **MIDE EL PROMEDIO DE COLOR EN LINEAL.** Es lo unico que hace falta para la
   regla 7: three.js multiplica `map × vertexColor × material.color`, asi que el
   color del material es un TINTE sobre la imagen. Cambiar la foto sin recalcular
   el tinte corre el color de toda la superficie. El factor se calcula en el
   juego, dividiendo el promedio del lienzo por el de la foto — los dos medidos,
   ninguno a mano.

3. **NO COSE LAS COSTURAS.** Al modelo se le pidieron texturas «sin costura» y
   ninguna imagen generada lo es de verdad; coserlas ensucia justo el centro, que
   es lo que mas se mira. Se resuelve del otro lado con `MirroredRepeatWrapping`:
   la copia de al lado va dada vuelta, asi que los dos bordes que se tocan son EL
   MISMO borde y la costura no puede existir. Igual se MIDE el salto de borde,
   para poder decir cuanto era.

4. **NO GENERA MAPAS DE NORMAL NI DE RUGOSIDAD.** Se derivan en el navegador de
   la propia foto, que es la tuberia que este repo ya tenia en Campo de Tiro y en
   BARRIO: pedirlos como imagenes aparte serian 46 descargas mas y habria
   relieve que no cuadra con lo que se ve. Lo que viaja es la foto y nada mas.
"""
import io, json, os, sys, math
from PIL import Image, ImageFilter

DIR = os.environ.get('PBR_DIR', '/tmp/rez_barrio/assets')
SAL = 'assets/puerta/pbr.js'

# nombre : (lado en px, calidad webp, metros que cubre la foto, fuerza de normal,
#           contraste de rugosidad)
# EL LADO SALE DE CUANTO SE MIRA LA SUPERFICIE. El piso del calabozo y el
# parquet de la biblioteca se caminan con la camara a metro y medio; el
# cielorraso de la escuela se ve de refilon.
TEX = {
 'campo_wood':     (512, 72, 0.45, 1.00, 0.45),
 'campo_wall':     (448, 70, 2.50, 0.85, 0.40),
 'granja_barn':    (512, 72, 2.40, 1.00, 0.45),
 'granja_wall':    (512, 72, 2.40, 1.00, 0.45),
 'granja_dirt':    (512, 70, 3.00, 0.90, 0.50),
 'granja_metal':   (448, 70, 1.60, 0.60, 0.35),
 'granja_rust':    (448, 70, 1.60, 0.75, 0.45),
 'escuela_floor':  (512, 74, 1.20, 0.45, 0.30),
 'escuela_wall':   (448, 70, 2.40, 0.70, 0.35),
 'escuela_ceil':   (384, 68, 1.20, 0.60, 0.30),
 'escuela_board':  (384, 70, 2.00, 0.35, 0.25),
 'escuela_locker': (448, 72, 0.60, 0.55, 0.30),
 'biblio_floor':   (512, 74, 1.00, 0.75, 0.40),
 'biblio_wall':    (448, 70, 1.20, 0.70, 0.35),
 'biblio_carpet':  (448, 70, 1.60, 0.85, 0.50),
 'biblio_stone':   (448, 70, 1.50, 0.55, 0.35),
 'calabozo_floor': (512, 72, 2.00, 1.10, 0.50),
 'calabozo_wall':  (512, 72, 1.50, 1.10, 0.50),
 'calabozo_straw': (448, 70, 0.60, 0.90, 0.50),
 'capucha_tela':   (384, 70, 0.60, 0.80, 0.45),
 'muneca_piel':    (448, 74, 0.45, 0.40, 0.55),
 'simio_piel':     (448, 72, 1.40, 0.75, 0.45),
 'verdugo_piel':   (448, 72, 0.35, 0.65, 0.40),
 'criatura_piel':  (448, 70, 0.17, 0.70, 0.40),
}


def lineal(im):
    """promedio de color en LINEAL, que es el espacio en el que se multiplica"""
    p = im.convert('RGB').resize((64, 64), Image.LANCZOS)
    d = list(p.getdata())
    n = len(d)
    return [round(sum((c[i] / 255.0) ** 2.2 for c in d) / n, 4) for i in range(3)]


def costura(im):
    """cuanto salta el borde contra el salto normal de adentro de la imagen.
    1,0 = la costura no se distingue del resto; 3,0 = se ve una linea."""
    g = im.convert('L')
    w, h = g.size
    px = g.load()
    def dif(a, b):
        return sum(abs(a[i] - b[i]) for i in range(len(a))) / max(1, len(a))
    izq = [px[0, y] for y in range(h)]
    der = [px[w - 1, y] for y in range(h)]
    ar = [px[x, 0] for x in range(w)]
    ab = [px[x, h - 1] for x in range(w)]
    borde = (dif(izq, der) + dif(ar, ab)) / 2
    dentro = 0.0
    for k in (w // 4, w // 2, 3 * w // 4):
        a = [px[k, y] for y in range(h)]
        b = [px[k + 1, y] for y in range(h)]
        dentro += dif(a, b)
    dentro /= 3
    return round(borde / max(dentro, 0.01), 2)


def main():
    salida = {}
    total = 0
    print('%-18s %5s %8s %7s %8s  %s' % ('textura', 'lado', 'bytes', 'costura', 'metros', 'color lineal'))
    for nom in sorted(TEX):
        lado, q, metros, nrm, rug = TEX[nom]
        ruta = os.path.join(DIR, 'pbr_%s-g1.png' % nom)
        if not os.path.exists(ruta):
            print('%-18s FALTA %s' % (nom, ruta)); continue
        im = Image.open(ruta).convert('RGB')
        cos = costura(im)
        lin = lineal(im)
        chico = im.resize((lado, lado), Image.LANCZOS)
        buf = io.BytesIO()
        chico.save(buf, 'WEBP', quality=q, method=6)
        b = buf.getvalue()
        total += len(b)
        import base64
        salida[nom] = {'b64': base64.b64encode(b).decode('ascii'),
                       'lin': lin, 'm': metros, 'nrm': nrm, 'rug': rug,
                       'lado': lado, 'costura': cos}
        print('%-18s %5d %8d %7s %8.2f  %s' % (nom, lado, len(b), cos, metros, lin))
    js = ['// GENERADO por herramientas/puerta/hornear_pbr.py — no editar a mano.',
          '// Las %d texturas PBR de los seis niveles: la foto, su promedio de color EN' % len(salida),
          '// LINEAL (para recalcular el tinte), los metros que cubre y la fuerza con la',
          '// que se derivan el relieve y la rugosidad en el navegador.',
          'window.__PB_PBR = {']
    for nom in sorted(salida):
        d = salida[nom]
        js.append("  %s: { m: %s, nrm: %s, rug: %s, lin: [%s], b64: '%s' }," %
                  (nom, d['m'], d['nrm'], d['rug'], ', '.join(str(x) for x in d['lin']), d['b64']))
    js.append('};')
    io.open(SAL, 'w', encoding='utf8').write('\n'.join(js) + '\n')
    print('\n%d texturas · %d KB de webp · %s' % (len(salida), total // 1024, SAL))


main()
