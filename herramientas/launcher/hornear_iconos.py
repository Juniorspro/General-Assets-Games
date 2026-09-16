#!/usr/bin/env python3
"""Los cuatro fondos del pack de iconos Aero -> partes/i_iconos.js

── EL BORDE REDONDEADO DEL GENERADOR SE RECORTA ──
Tres de los cuatro volvieron con su propio canto redondeado y su brillo, que es
lindo y es EL problema: `.baldosa` ya redondea con su propio radio, así que al
poner la imagen entera quedan DOS radios y entre uno y otro asoma el color de
afuera del canto generado. Se entra un 9 % por cada lado y desaparece.

── Y SE ACHICAN MUCHO, PORQUE UN ICONO ES CHICO ──
El icono más grande que este launcher dibuja mide 92 px de CSS. A 256 px la
imagen cubre densidad 2,8 y no hay un solo detalle fino que perder: son
degradados y burbujas, o sea justo lo que un WebP comprime a nada.
"""
import base64, io, os, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = '/tmp/rez_aero/assets'
SAL = os.path.join(AQUI, 'partes', 'i_iconos.js')

LADO = 320
ENTRA = 0.09          # cuánto se entra desde el borde, por lado
TOPE = 26 * 1024      # por imagen

FONDOS = ['agua', 'cielo', 'pasto', 'atardecer']

# ── DOS TANDAS, Y GANA LA SEGUNDA ──
# `ico_*` son las cuatro FOTOS de la vuelta 123: acuario, cielo, pasto y
# atardecer. `bad_*` son las cuatro BALDOSAS de vidrio de la 125, que es lo que
# el usuario pidió al decir que los iconos salían feos: una foto detrás de una
# silueta blanca se lee a calcomanía, y un vidrio Aero con su brillo y sus gotas
# se lee a icono. Se prueban en ese orden y se usa la última que exista, así que
# borrar las `bad_` devuelve exactamente el pack anterior.
PREFIJOS = ['ico_', 'bad_']


def hornea(p):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    d = int(min(w, h) * ENTRA)
    im = im.crop((d, d, w - d, h - d)).resize((LADO, LADO), Image.LANCZOS)
    # escalera de calidad: la primera que entra en el tope
    for q in (86, 80, 74, 68, 62, 56, 50):
        b = io.BytesIO()
        im.save(b, 'WEBP', quality=q, method=6)
        if b.tell() <= TOPE or q == 50:
            return b.getvalue(), q
    return b.getvalue(), q


def main():
    if not os.path.isdir(CRUDO):
        sys.exit('no está %s' % CRUDO)
    out = ["/* Los cuatro fondos del pack de iconos Aero, generados con Rezona.",
           "   Los escribe herramientas/launcher/hornear_iconos.py — no se editan a mano. */",
           "const ICONOS = {"]
    tot = 0
    for n in FONDOS:
        p = None
        for pre in PREFIJOS:
            q2 = os.path.join(CRUDO, '%s%s-g1.png' % (pre, n))
            if os.path.exists(q2): p = q2
        if not p:
            print('  falta', n); continue
        b, q = hornea(p)
        tot += len(b)
        print('  %-10s %5d B  q%d' % (n, len(b), q))
        out.append("  %s: 'data:image/webp;base64,%s'," % (n, base64.b64encode(b).decode()))
    out.append('};')
    open(SAL, 'w').write('\n'.join(out) + '\n')
    print('%s  %d KB binario, %d KB en base64' % (SAL, tot // 1024, (tot * 4 // 3) // 1024))


main()
