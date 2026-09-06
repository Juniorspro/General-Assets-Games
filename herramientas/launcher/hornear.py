#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mete el fondo y la mascota adentro del HTML, en base64.

Los crudos salen de Rezona (proyecto `uSEsgNYW`) y viven en `crudo/`; lo que se
versiona es esto y la salida, no los PNG de un mega.
"""
import base64, io, os, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
SAL = os.path.join(AQUI, 'partes', 'i_img.js')


def webp(im, q, sinperdida=False):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6, lossless=sinperdida)
    return b.getvalue()


def uri(d, mime='image/webp'):
    return 'data:%s;base64,%s' % (mime, base64.b64encode(d).decode())


# ══════════ EL FONDO ══════════
def fondo():
    im = Image.open(os.path.join(CRUDO, 'fondo9x16.png')).convert('RGB')
    # ── EL ANCHO SALE DE LA PANTALLA, NO DEL ARCHIVO ──
    # Un teléfono de 412 px de ancho a densidad 2 pide 824; a 3, 1236. Con 824 el
    # fondo se ve nítido en la enorme mayoría y pesa la mitad que a 1236 — y acá
    # no hay un solo borde fino que se pueda ver pixelado: es cielo, agua y pasto.
    im = im.resize((824, round(824*im.height/im.width)), Image.LANCZOS)
    mejor, q = None, None
    for cal in (82, 76, 70, 64, 58):
        d = webp(im, cal)
        mejor, q = d, cal
        if len(d) <= 140*1024:
            break
    print('  fondo   %dx%d  q%d  %d KB' % (im.width, im.height, q, len(mejor)//1024))
    return uri(mejor), im.width, im.height


# ══════════ LA MASCOTA ══════════
# ── LAS TRES HOJAS Y EL ORDEN DE LA TIRA ──
# Cada hoja trae sus poses en el orden en que el generador las dibujó, y ese
# orden NO es el que las animaciones necesitan: `quieto` viene (quieto, mando,
# saluda) y saludar es quieto↔saluda, o sea dos celdas que en la hoja no son
# vecinas. Una animación de CSS sólo puede recorrer celdas CONTIGUAS, así que el
# reorden se hace acá, al hornear, y no con tres tiras y tres imágenes.
#
#   `ref` es el cuadro con el que se mide la cabeza, y tiene que ser uno con los
#   brazos abajo: con los brazos levantados la cabeza mide 349 en vez de 248 y
#   la hoja entera sale un 40% chica.
HOJAS = [
    # archivo          ref  orden de los cuadros dentro de la hoja
    ('masc_baila',      1,  [0, 1, 2]),        # celdas 0,1,2 → baila
    ('masc_quieto',     0,  [0, 2, 1]),        # celdas 3,4 → saluda · celda 5 → mando
    ('masc_duerme',     0,  [0, 1]),           # celdas 6,7 → duerme
]

# Las animaciones, en celdas de la tira: [primera, cuántas]. El nombre lo usa el
# JS para armar los `@keyframes`, así que agregar una es una línea acá y otra en
# la tabla de duraciones — y nada de porcentajes escritos a mano en el CSS.
ANIM = {
    'baila':  (0, 3),
    'saluda': (3, 2),
    'quieto': (3, 1),
    'mando':  (5, 1),
    'duerme': (6, 2),
}

CABEZA = 76   # el ancho de la cabeza en la tira, en píxeles de CSS
#   Con 64 la mascota medía 151 px de alto en una pantalla de 892 y a esa
#   escala se leía a icono, no a personaje. Con 76 mide 179 y sigue entrando
#   con aire debajo de los resultados de una búsqueda de dos apps.


def cajas_alfa(a, umbral=24):
    """Las columnas con tinta separan los cuadros: el generador no los deja donde
    uno se los imagina, así que se miden."""
    W, H = a.size
    px = a.load()
    col = [False]*W
    for x in range(W):
        for y in range(0, H, 2):
            if px[x, y] > umbral:
                col[x] = True
                break
    tramos, i = [], 0
    while i < W:
        if col[i]:
            j = i
            while j < W and col[j]:
                j += 1
            if j - i > W//40:
                tramos.append((i, j))
            i = j
        else:
            i += 1
    return tramos


def perfil(c, umbral=24):
    """Ancho de la tinta fila por fila."""
    a = c.split()[3]
    px = a.load()
    W, H = c.size
    out = []
    for y in range(H):
        x0 = x1 = None
        for x in range(W):
            if px[x, y] > umbral:
                if x0 is None:
                    x0 = x
                x1 = x
        out.append(0 if x0 is None else x1 - x0 + 1)
    return out


def ancho_cabeza(c):
    """── LA CABEZA ES LO ÚNICO INVARIANTE ENTRE POSES ──
    Las tres hojas se generaron con la cámara donde le pareció al generador: los
    tres cuadros miden 585 px de alto, pero uno sentado ocupa mucha menos altura
    real que uno de pie, así que al sentado lo dibujó un 20% más grande. Medido:
    la cabeza da 248 y 251 de pie —o sea que esas dos hojas comparten cámara— y
    299 sentado. Escalando por el alto del cuadro, la mascota CRECE al dormirse.
    La cabeza es un bloque rígido: no cambia con la pose. Se la encuentra
    barriendo de arriba y cortando en el CUELLO, que es la primera vez que el
    ancho cae por debajo del 75% de lo que venía midiendo."""
    p = perfil(c)
    H = len(p)
    mx = 0
    for y, w in enumerate(p):
        if w > mx:
            mx = w
        elif mx > 0 and w < mx*0.75 and y > H*0.15:
            return mx, y
    return mx, H


def mascota():
    celdas = []       # (imagen recortada, escala)
    for arch, ref, orden in HOJAS:
        im = Image.open(os.path.join(CRUDO, arch + '.png')).convert('RGBA')
        tramos = cajas_alfa(im.split()[3])
        if len(tramos) != len(orden):
            sys.exit('%s tiene %d cuadros y se esperaban %d: %s'
                     % (arch, len(tramos), len(orden), tramos))
        recortes = []
        for x0, x1 in tramos:
            sub = im.crop((x0, 0, x1, im.height))
            recortes.append(sub.crop(sub.split()[3].getbbox()))
        cab, cuello = ancho_cabeza(recortes[ref])
        k = CABEZA/cab
        print('  %-12s %d cuadros · cabeza %d px (cuello en la fila %d) · escala %.3f'
              % (arch, len(recortes), cab, cuello, k))
        for i in orden:
            celdas.append((recortes[i], k))

    esc = [r.resize((max(1, round(r.width*k)), max(1, round(r.height*k))), Image.LANCZOS)
           for r, k in celdas]

    # ── UNA SOLA CELDA Y UNA SOLA LÍNEA DE PISO PARA LAS OCHO ──
    # Escalando cada cuadro a su propia caja, el que levanta los brazos se
    # agranda y la mascota LATE en vez de bailar. Y el centrado no va por la caja
    # de tinta sino por el CENTROIDE DEL CUARTO DE ABAJO —los pies, o las piernas
    # cruzadas— porque un brazo levantado corre la caja y con ella el cuerpo:
    # saludar movería a la mascota de costado en vez de mover el brazo.
    # los ocho píxeles de aire no son decoración: medido, los dos cuadros del
    # baile con los brazos abiertos llegaban EXACTO al borde de su celda, y el
    # navegador estira la tira con `background-size:100% 100%` — un redondeo de
    # medio píxel deja asomando una tira del cuadro de al lado.
    cw = max(r.width for r in esc) + 8
    ch = max(r.height for r in esc)
    hoja = Image.new('RGBA', (cw*len(esc), ch), (0, 0, 0, 0))
    for i, r in enumerate(esc):
        a = r.split()[3]
        px = a.load()
        y0 = int(r.height*0.75)
        sx = n = 0
        for y in range(y0, r.height):
            for x in range(r.width):
                if px[x, y] > 24:
                    sx += x
                    n += 1
        cx = (sx/n) if n else r.width/2
        dx = round(i*cw + cw/2 - cx)
        dx = max(i*cw, min(i*cw + cw - r.width, dx))
        hoja.paste(r, (dx, ch - r.height), r)

    d = webp(hoja, 90)
    print('  mascota %dx%d  celda %dx%d  %d cuadros  %d KB'
          % (hoja.width, hoja.height, cw, ch, len(esc), len(d)//1024))
    return uri(d), cw, ch, len(esc)


def main():
    print('horneando:')
    f, fw, fh = fondo()
    m, mw, mh, mn = mascota()
    anim = ',\n  '.join('%s:[%d,%d]' % (k, v[0], v[1]) for k, v in ANIM.items())
    for k, (i, c) in ANIM.items():
        if i + c > mn:
            sys.exit('la animación %s pide la celda %d y la tira tiene %d' % (k, i+c-1, mn))
    txt = (
        '/* ══════════════════════ LOS ASSETS ══════════════════════\n'
        '   Generados con Rezona (proyecto descartable `uSEsgNYW`) y horneados por\n'
        '   `hornear.py`. Los crudos viven en `crudo/` y no se versionan.\n'
        '   El fondo es la única imagen grande del launcher. La mascota es UNA tira\n'
        '   de %d celdas iguales con la misma línea de piso y la misma escala de\n'
        '   cabeza, así que animarla es correr la x por pasos; `MASC_ANIM` dice qué\n'
        '   celdas usa cada animación y de ahí salen los `@keyframes`, que no se\n'
        '   escriben a mano: un porcentaje escrito a mano deja de valer el día que\n'
        '   se agrega un cuadro. */\n'
        'const IMG_FONDO = "%s";\n'
        'const FONDO_W = %d, FONDO_H = %d;\n'
        'const IMG_MASCOTA = "%s";\n'
        'const MASC_W = %d, MASC_H = %d, MASC_N = %d;\n'
        'const MASC_ANIM = {\n  %s\n};\n'
    ) % (mn, f, fw, fh, m, mw, mh, mn, anim)
    io.open(SAL, 'w', encoding='utf-8').write(txt)
    print('→ %s  %d KB' % (SAL, len(txt.encode())//1024))


if __name__ == '__main__':
    main()
