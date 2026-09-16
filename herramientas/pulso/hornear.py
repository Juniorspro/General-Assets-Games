#!/usr/bin/env python3
"""Mete los assets generados con Rezona adentro del HTML, en base64.

Los originales viven en herramientas/pulso/crudo/ en WebP casi sin pérdida: en
PNG los diez pesaban 17 MB y en el repo eso es peso muerto, porque de acá salen
siempre reducidos a 384 o 512.

POR QUÉ HORNEAR Y NO ENLAZAR: PULSO es un archivo solo. Un `<img src>` a un CDN
significa que el juego no arranca sin red, y este juego se juega en un teléfono
en cualquier lado.

LAS DOS DECISIONES QUE PESAN, Y LAS DOS SON DE TAMAÑO:

  · LAS CARAS VAN A 384 px. Se ven 0,4 segundos ocupando media pantalla de un
    teléfono: 512 no agrega nada que se llegue a mirar y pesa el doble. Van en
    WebP CON alfa, porque el fondo tiene que desaparecer — una cara recortada
    contra un rectángulo negro se lee a calcomanía y no a algo que apareció.
  · LAS TEXTURAS VAN A 512 y se repiten EN ESPEJO. No son perfectamente
    embaldosables —ninguna generación lo es— y en un pasillo de 120 metros una
    costura cada dos metros es lo único que se mira. En espejo no hay costura
    posible: el borde de una copia ES el borde de la de al lado.
"""
import base64, io, pathlib, sys
from PIL import Image

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CRUDO = RAIZ / 'herramientas/pulso/crudo'
SALIDA = RAIZ / 'herramientas/pulso/partes/y_assets.js'

CARAS = ['craneo', 'palida', 'pelo', 'sangre', 'maniqui', 'ahogado']
TEX = [('pared', 512, 74), ('piso', 512, 74), ('techo', 512, 72), ('puerta', 384, 76)]


def recorta(im):
    """recorta al contenido: la generación deja aire alrededor y ese aire, sobre
       un plano de tamaño fijo, es cara más chica por nada"""
    a = im.split()[3]
    caja = a.getbbox()
    return im.crop(caja) if caja else im


def ovalo(im):
    """── EL RECORTE DEL GENERADOR NO ALCANZA, Y SE VIO EN LA CAPTURA ──
    Pedí las caras con fondo transparente y las devolvió con fondo transparente
    *donde había fondo*. Pero son retratos: el sujeto ocupa el cuadro entero, así
    que lo que queda opaco es entre el 39 % y el 77 % de la imagen — cuello,
    hombros y pared incluidos. Medido en la foto del juego, la cara aparecía
    dentro de un RECTÁNGULO con borde recto y un pedazo de pared clara al lado:
    se lee a estampilla pegada en la pantalla y mata el susto de una.

    Lo que se hace es un óvalo suave centrado en la cara. Y el alfa se aplica
    TAMBIÉN al color, no sólo al canal: con alfa sola, un fondo claro se va
    aclarando hasta desaparecer y en el camino pasa por gris, que sobre un
    pasillo negro es una mancha. Multiplicando el color, el borde se va a NEGRO
    mientras se va a transparente, y entonces la cara emerge de la oscuridad —
    que es exactamente lo que hace un susto de verdad."""
    import math
    w, h = im.size
    px = im.load()
    cx, cy = w/2, h*0.47
    rx, ry = w*0.47, h*0.52
    for y in range(h):
        dy = (y - cy)/ry
        for x in range(w):
            dx = (x - cx)/rx
            d = math.sqrt(dx*dx + dy*dy)
            if d <= 0.68:
                continue
            k = 0.0 if d >= 1.0 else (1.0 - d)/0.32
            k = k*k*(3 - 2*k)                      # suavizado, sin canto duro
            r, g, b, a = px[x, y]
            px[x, y] = (int(r*k), int(g*k), int(b*k), int(a*k))
    return im


def cuadra(im, n):
    """encaja en un cuadrado de n sin deformar — una cara estirada deja de ser
       una cara"""
    im.thumbnail((n, n), Image.LANCZOS)
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    out.paste(im, ((n - im.width)//2, (n - im.height)//2))
    return out


def embaldosa(im, f=0.16):
    """── HACERLA EMBALDOSABLE DE VERDAD, PORQUE EL ESPEJO SE VE ──
    Primer intento: `MirroredRepeatWrapping`. Elimina la costura, sí — pero a
    cambio la pared queda con SIMETRÍA ESPEJO cada dos baldosas, y sobre un muro
    liso de tres metros eso se lee como un calidoscopio. Medido en la captura:
    las manchas de humedad formaban mariposas perfectas. Cambiar una costura
    cada metro y medio por un dibujo que es obviamente artificial no es un
    arreglo, es otro defecto.

    Esto la vuelve embaldosable de verdad, que es lo que había que hacer desde
    el principio: se recorta una banda del ancho `f` y se FUNDE encima del borde
    opuesto con un peso que va de 0 a 1. La imagen sale más chica —w−k por h−k—
    y el borde izquierdo pasa a ser, por construcción, la continuación del
    derecho. Con eso se puede usar repetición normal y no hay espejo ni costura.
    """
    import numpy as np
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    kx, ky = int(w*f), int(h*f)
    t = np.linspace(0, 1, kx, dtype=np.float32)[None, :, None]
    base = a[:, :w-kx].copy()
    base[:, :kx] = base[:, :kx]*t + a[:, w-kx:]*(1-t)
    t = np.linspace(0, 1, ky, dtype=np.float32)[:, None, None]
    out = base[:h-ky].copy()
    out[:ky] = out[:ky]*t + base[h-ky:]*(1-t)
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'))


def webp(im, q, alfa):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6, exact=alfa)
    return b.getvalue()


def main():
    lineas = ["/* ══════════ ASSETS GENERADOS (Rezona Lab, proyecto WUMdrRxs) ══════════",
              "   Seis caras y cuatro texturas, horneadas por herramientas/pulso/hornear.py.",
              "   NO SE EDITAN A MANO: se regeneran corriendo ese script. */",
              "const AS = {};"]
    total = 0
    for n in CARAS:
        im = ovalo(recorta(Image.open(CRUDO / f'cara_{n}-g1.webp').convert('RGBA')))
        d = webp(cuadra(im, 384), 74, True)
        total += len(d)
        lineas.append(f"AS.cara_{n} = 'data:image/webp;base64,{base64.b64encode(d).decode()}';")
        print(f'cara_{n:9s} {len(d)//1024:4d} KB')
    for n, tam, q in TEX:
        im = Image.open(CRUDO / f'tex_{n}-g1.webp').convert('RGBA')
        if n == 'puerta':
            im = cuadra(recorta(im), tam)
        else:
            im = embaldosa(im).resize((tam, tam), Image.LANCZOS).convert('RGB')
        d = webp(im, q, n == 'puerta')
        total += len(d)
        lineas.append(f"AS.tex_{n} = 'data:image/webp;base64,{base64.b64encode(d).decode()}';")
        print(f'tex_{n:10s} {len(d)//1024:4d} KB')
    SALIDA.write_text('\n'.join(lineas) + '\n')
    print(f'TOTAL {total//1024} KB binario, {total*4//3//1024} KB en base64 → {SALIDA}')


main()
