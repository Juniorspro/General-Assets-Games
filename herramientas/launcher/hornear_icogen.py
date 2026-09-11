#!/usr/bin/env python3
"""Corta las hojas generadas en celdas y las hornea a `partes/i_icogen.js`.

   ── SE CORTA POR REJA DECLARADA Y SE AJUSTA POR TINTA ──
   La reja dice QUÉ celda es cada icono —eso no se detecta, se declara, porque
   es el orden en que se pidieron— y dentro de la celda la caja de la baldosa
   se MIDE: el generador nunca la deja exactamente en el tercio, y un recorte
   por tercios deja media baldosa vecina asomando por un canto.

   ── Y LAS ESQUINAS SE ENMASCARAN ──
   La baldosa viene con su borde redondeado dibujado, así que su caja
   envolvente trae cuatro esquinas de fondo negro. Puestas tal cual, cada icono
   sale con cuatro tacos negros. Se recorta con la misma máscara redondeada que
   usa `.baldosa`, un pelo más abierta.
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ── QUÉ PACK VA CON ALFA ──
# Pedido textual: *«no de fondo negro sino transparente»*. `generado` NO va:
# sus baldosas son de color y opacas a propósito, y transparentarlas le
# borraría el color, que es todo lo que ese pack tiene.
ALFA = {'cristal': True}

RAIZ = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(RAIZ, 'crudo')
LADO = 112          # la baldosa mide como mucho 92 px lógicos
RADIO = 0.215       # el mismo canto que `.baldosa`, apenas más abierto
UMBRAL = 20         # por debajo de esto es fondo, no baldosa


def caja(im):
    """La caja de la baldosa dentro de la celda: lo que no es negro."""
    g = im.convert('L').filter(ImageFilter.MedianFilter(3))
    m = g.point(lambda v: 255 if v > UMBRAL else 0)
    b = m.getbbox()
    if not b:
        return (0, 0, im.width, im.height)
    x0, y0, x1, y1 = b
    # cuadrada y centrada: una baldosa es cuadrada, y estirarla al recortarla
    # deforma el símbolo justo en el objeto que más se mira
    l = max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    x0 = max(0, int(cx - l / 2)); y0 = max(0, int(cy - l / 2))
    return (x0, y0, min(im.width, x0 + l), min(im.height, y0 + l))


def mascara(l):
    m = Image.new('L', (l * 4, l * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, l * 4 - 1, l * 4 - 1],
                                        radius=int(l * 4 * RADIO), fill=255)
    return m.resize((l, l), Image.LANCZOS)


def transparenta(cel, piso=0.10, gan=1.55):
    """El vidrio fotografiado sobre negro es alfa premultiplicado.

       ── POR QUÉ ESTO NO ES UN TRUCO ──
       La hoja se genera sobre fondo negro puro, y un negro puro no aporta nada
       a lo que la cámara ve: todo lo que hay en la celda es luz que el vidrio
       AGREGA —el bisel, la barrida especular, el tallado—. O sea que el píxel
       ya ES `color × alfa` sobre alfa cero, que es exactamente la definición de
       premultiplicado. Deshaciendo la multiplicación, el cuerpo del vidrio
       —mediana 16 de 255, medido— se vuelve transparente y quedan opacos el
       canto y el símbolo, que es lo que un vidrio de verdad deja ver.

       El `piso` es lo único que no sale de la foto: sin él la baldosa no existe
       hasta que uno le pone el dedo encima, porque más de la mitad de sus
       píxeles están por debajo de 20. Con un décimo de cuerpo se lee a pieza de
       vidrio apoyada sobre el fondo de pantalla y se sigue viendo lo de atrás.
    """
    a = np.asarray(cel.convert('RGB')).astype(np.float32) / 255.0
    lum = a.max(2)
    al = np.clip(lum * gan, 0.0, 1.0)
    al = piso + (1.0 - piso) * al
    # deshacer la premultiplicación: donde el alfa es chico el color no está
    # definido, así que se lo lleva a blanco en vez de dejar ruido oscuro
    col = np.where(al[..., None] > 0.004, a / np.maximum(al[..., None], 0.004), 1.0)
    col = np.clip(col, 0.0, 1.0)
    # ── DONDE EL VIDRIO ES FINO, EL COLOR SE VA A BLANCO ──
    # Dividir por un alfa chico amplifica el ruido del JPEG del generador, y ese
    # ruido no se ve —está al diez por ciento de opacidad— pero NO COMPRIME: la
    # celda pasaba de 3,3 a 6,3 KB por píxeles que nadie mira. Un vidrio fino
    # además no tiene color, así que blanquearlo es lo correcto y no una
    # concesión.
    w = np.clip((al[..., None] - piso) / 0.45, 0.0, 1.0)
    col = col * w + (1.0 - w)
    out = np.dstack([col * 255.0, al * 255.0]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def hornea(pack, nombre, hoja):
    ruta = os.path.join(CRUDO, ('%s.png' % nombre) if pack == 'generado'
                        else 'ico_%s_%s.png' % (pack, nombre))
    if not os.path.exists(ruta):
        return {}
    im = Image.open(ruta).convert('RGB')
    cw, ch = im.width // 3, im.height // 3
    msk = mascara(LADO)
    out = {}
    for i in range(hoja['reales']):
        f, c = i // 3, i % 3
        cel = im.crop((c * cw, f * ch, (c + 1) * cw, (f + 1) * ch))
        cel = cel.crop(caja(cel)).resize((LADO, LADO), Image.LANCZOS)
        if ALFA.get(pack):
            cel = transparenta(cel)
            # las dos máscaras se MULTIPLICAN: el canto redondeado recorta y el
            # alfa del vidrio adelgaza. Con `putalpha` la segunda pisa a la
            # primera y la baldosa vuelve a salir cuadrada.
            cel.putalpha(Image.fromarray(
                (np.asarray(cel.split()[3]).astype(np.float32) *
                 np.asarray(msk).astype(np.float32) / 255.0).astype(np.uint8)))
        else:
            cel.putalpha(msk)
        b = io.BytesIO()
        # ── EL ALFA VA LOSSY, Y SÓLO EN LOS PACKS QUE LO USAN ──
        # Pillow guarda el canal alfa SIN pérdida por omisión, y acá el alfa es
        # un degradado suave de vidrio: bajarlo a 60 corta la celda a la mitad
        # (6,3 → 3,3 KB) y no se distingue compuesta sobre un fondo claro ni
        # sobre uno oscuro. En un pack opaco el alfa es la máscara del canto
        # redondeado —un borde duro— y ahí sí se le verían las abolladuras.
        if ALFA.get(pack):
            cel.save(b, 'WEBP', quality=82, alpha_quality=60, method=6)
        else:
            cel.save(b, 'WEBP', quality=82, method=6)
        out[hoja['claves'][i]] = base64.b64encode(b.getvalue()).decode()
    return out


if __name__ == '__main__':
    sys.path.insert(0, RAIZ)
    import recetas
    hojas = json.load(open(os.path.join(CRUDO, 'icogen.json')))
    packs = {}
    for pack in sorted(recetas.RECETAS):
        todo = {}
        for n in sorted(hojas):
            r = hornea(pack, n, hojas[n])
            if r:
                todo.update(r)
        if todo:
            packs[pack] = todo
            print('%-9s %3d de %d celdas  %d KB' % (pack, len(todo), 207,
                  sum(len(v) for v in todo.values()) // 1024))
    if not packs:
        sys.exit('no hay una sola hoja en crudo/')
    cuerpo = []
    for pack in sorted(packs):
        li = ["    %s: 'data:image/webp;base64,%s'" % (k, v) for k, v in packs[pack].items()]
        cuerpo.append('  %s: {\n%s\n  }' % (pack, ',\n'.join(li)))
    txt = ("/* ═══════════ LOS PACKS GENERADOS ═══════════\n"
           "   Celdas recortadas de las hojas de Rezona. NO son glifos dibujados\n"
           "   por código: es la celda de la hoja tal cual salió, recortada a su\n"
           "   baldosa y enmascarada al canto de `.baldosa`.\n"
           "\n"
           "   %s\n"
           "\n"
           "   Lo escribe `hornear_icogen.py`; no se edita a mano. */\n"
           "const ICOGEN_PACKS = {\n%s\n};\n"
           "/* el pack original se sigue llamando así en el resto del código */\n"
           "const ICOGEN = ICOGEN_PACKS.generado || {};\n") % (
              ' · '.join('%s %d' % (p, len(packs[p])) for p in sorted(packs)),
              ',\n'.join(cuerpo))
    dst = os.path.join(RAIZ, 'partes', 'i_icogen.js')
    open(dst, 'w').write(txt)
    print('%d packs  %d KB en base64' % (len(packs), len(txt) // 1024))
