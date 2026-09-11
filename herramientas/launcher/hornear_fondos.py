#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Los ocho fondos de la galería, en base64 adentro del HTML.

── POR QUÉ SE RECORTAN A 9:16 ACÁ Y NO EN CSS ──
Los ocho volvieron CUADRADOS de 1024: a Rezona se le pidió 9:16 y el generador
ignora la proporción. `background-size:cover` recortaría igual en el teléfono,
pero entonces se estarían embebiendo 1024 px de ancho para mostrar 576 — el 44 %
de los bytes viaja para no verse nunca. Recortado acá, cada fondo pesa lo que se
ve. Y el sujeto viene centrado, así que el recorte al centro no pierde nada:
medido mirando los ocho.

── Y EL ANCHO ES EL MISMO QUE EL DEL FONDO DE FÁBRICA ──
824 px cubre un teléfono de 412 a densidad 2 y pesa la mitad que a densidad 3.
Acá no hay un solo borde fino que se pueda ver pixelado: son cielo, agua y coral.
"""
import base64, io, json, os
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
SAL = os.path.join(AQUI, 'partes', 'i_fondos.js')
ANCHO = 824
TOPE = 150*1024

# el orden es el de la galería: primero los que se leen a Frutiger Aero de una
FONDOS = ['isla', 'pasto', 'nube', 'burbujas', 'arrecife', 'atardecer', 'lluvia', 'hielo']


def webp(im, q):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6)
    return b.getvalue()


def uno(nom):
    im = Image.open(os.path.join(CRUDO, 'f_%s.png' % nom)).convert('RGB')
    w = round(im.height*9/16)
    if w < im.width:
        im = im.crop(((im.width - w)//2, 0, (im.width + w)//2, im.height))
    im = im.resize((ANCHO, round(ANCHO*im.height/im.width)), Image.LANCZOS)
    mejor, q = None, None
    for cal in (80, 74, 68, 62, 56):
        d = webp(im, cal)
        mejor, q = d, cal
        if len(d) <= TOPE:
            break
    print('  %-10s %dx%d  q%d  %d KB' % (nom, im.width, im.height, q, len(mejor)//1024))
    return 'data:image/webp;base64,' + base64.b64encode(mejor).decode()


# ══════════ LAS BALDOSAS DE LOS ICONOS ══════════
# La textura que va DETRÁS del icono de cada app: agua, pasto o nubes, que son
# las tres de Frutiger Aero.
#
# ── NO HACEN FALTA SIN COSTURA, Y ESO SE RAZONÓ MAL LA PRIMERA VEZ ──
# Las hice espejadas en cuatro cuadrantes «porque se repiten», y NO se repiten:
# cada baldosa mide 60 px y las muestra UNA vez con `background-size:cover`. Lo
# único que la simetría agregaba era un dibujo de Rorschach en cada icono. Va el
# recorte tal cual.
#
# EL VIDRIO GENERADO SE DESCARTO, y vale anotar por que: es un panel de vidrio
# casi blanco, o sea EXACTAMENTE lo que `.baldosa` ya dibuja con
# `backdrop-filter` — a 60 px comprimia a CERO KB porque no tiene nada adentro.
# Un segundo estilo que no se distingue del primero no es una opcion, es una
# fila de mas en el panel. En su lugar van las otras dos texturas de Frutiger
# Aero que ya estan generadas: el pasto con rocio y las nubes.
BALDOSAS = {
    'agua':  ('b_agua',  None),
    'pasto': ('f_pasto', (120, 560, 760, 1000)),
    'nube':  ('f_nube',  (60, 620, 700, 1000)),
}


def baldosa(nom, recorte):
    im = Image.open(os.path.join(CRUDO, nom + '.png')).convert('RGB')
    if recorte:
        im = im.crop(recorte)
    else:
        # el agua vino como 2x2 de la misma foto: se toma un cuarto
        im = im.crop((0, 0, im.width//2, im.height//2))
    lado = min(im.width, im.height)
    im = im.crop(((im.width - lado)//2, (im.height - lado)//2,
                  (im.width + lado)//2, (im.height + lado)//2))
    im = im.resize((192, 192), Image.LANCZOS)
    d = webp(im, 78)
    print('  %-10s 192x192  %d KB' % (nom, len(d)//1024))
    return 'data:image/webp;base64,' + base64.b64encode(d).decode()


def main():
    print('horneando fondos:')
    d = {n: uno(n) for n in FONDOS}
    b = {k: baldosa(v[0], v[1]) for k, v in BALDOSAS.items()}
    txt = (
        '/* ══════════════════════ LOS OCHO FONDOS ══════════════════════\n'
        '   Generados con Rezona (proyecto descartable `uSEsgNYW`) y horneados por\n'
        '   `hornear_fondos.py`. Los crudos viven en `crudo/` y no se versionan; sus\n'
        '   `task_id` sí, en `crudo/tareas.json`.\n'
        '   Volvieron cuadrados —el generador ignora la proporción pedida— y se\n'
        '   recortan al centro a 9:16 al hornear, no en CSS: recortando en el\n'
        '   teléfono, el 44 %% de los bytes viaja para no verse nunca. */\n'
        'const FONDOS = %s;\n'
        'const FONDOS_ORDEN = %s;\n'
        '/* Las baldosas de los iconos: el agua y el vidrio que van DETRAS del\n'
        '   icono de cada app. Se hacen sin costura espejando un cuarto en los\n'
        '   cuatro cuadrantes, porque CSS no tiene repeticion espejada. */\n'
        'const BALDOSAS = %s;\n'
    ) % (json.dumps(d), json.dumps(FONDOS), json.dumps(b))
    io.open(SAL, 'w', encoding='utf-8').write(txt)
    print('-> %s  %d KB' % (SAL, len(txt.encode())//1024))


if __name__ == '__main__':
    main()
