# -*- coding: utf-8 -*-
"""
EL CARTEL DEL NOMBRE
====================
Recorta el logo generado, le saca el fondo y lo mete en `partes/i_ui.js`.

POR QUE UN CARTEL Y NO LA TIPOGRAFIA DEL SISTEMA. `font-family:monospace` no
es la misma letra en cada aparato: en Android sale Roboto Mono, en iPhone
Menlo y en Windows Consolas. O sea que el nombre del juego —lo unico que uno
reconoce de lejos— cambiaba de forma segun el telefono. Con el cartel las
letras son las mismas en todos.

EL FONDO SE SACA COMO ALFA PREMULTIPLICADO Y NO CON UN UMBRAL. El logo esta
sobre negro puro, o sea que cada pixel ya es `color x alfa`: tomando la
luminancia como alfa, componerlo sobre cualquier fondo devuelve exactamente
lo mismo que se ve sobre negro, y de paso el contorno oscuro de cada letra se
desvanece solo en vez de quedar recortado con sierra. Con un umbral duro el
canto sale dentado y las dunas de adentro —que son el dibujo— se parten.

Y EL TAMANO SE MIDE, no se elige: la ranura del menu mide `mh*0,150` de alto
—61,8 px en un marco de 412— y el navegador la dibuja con `contain`, asi que
lo que manda es el alto y no el ancho. Un fondo de CSS lo dibuja el navegador
a la densidad DE VERDAD del aparato —el tope de 2 del juego es del lienzo, no
de esto— asi que el caso peor es densidad 3: 185 px. Se hornea a 200 y no a
248, que medido son 39 KB contra 51 para cubrir una densidad que no existe.
"""
import io, os, sys, base64
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
SAL  = os.path.join(AQUI, 'partes', 'i_ui.js')

ALTO_DEST = 200          # 61,8 px de ranura x densidad 3, con un pelo de aire
LO, HI    = 6.0, 46.0    # la rampa del alfa, en luminancia de 0 a 255

def carga(ruta):
    im = Image.open(ruta).convert('RGB')
    px = im.load()
    W, H = im.size
    sal = Image.new('RGBA', (W, H))
    sp = sal.load()
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            a = (lum - LO) / (HI - LO)
            a = 0.0 if a < 0 else (1.0 if a > 1 else a)
            sp[x, y] = (r, g, b, int(round(a * 255)))
    return sal

def recorta(im):
    """a la caja de lo que se ve. Un logo centrado en un cuadrado de 1024 trae
       mas de la mitad de aire, y ese aire lo paga el `contain` achicando el
       dibujo."""
    caja = im.split()[3].point(lambda v: 255 if v > 6 else 0).getbbox()
    return im.crop(caja), caja

def main():
    if len(sys.argv) < 2:
        print('uso: hornear_ui.py <png>'); sys.exit(1)
    im = carga(sys.argv[1])
    im, caja = recorta(im)
    W, H = im.size
    w2 = max(1, int(round(W * ALTO_DEST / H)))
    im = im.resize((w2, ALTO_DEST), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=88, method=6)
    b = buf.getvalue()
    b64 = base64.b64encode(b).decode()
    with io.open(SAL, 'w', encoding='utf-8') as f:
        f.write('/* el cartel del nombre, generado y recortado por\n'
                '   `herramientas/duna/hornear_ui.py`. %d x %d, %d KB.        */\n'
                % (w2, ALTO_DEST, len(b) // 1024))
        f.write("const UI_CARTEL = 'data:image/webp;base64,%s';\n" % b64)
    print('caja %s  ->  %dx%d  %d KB  (base64 %d KB)'
          % (caja, w2, ALTO_DEST, len(b) // 1024, len(b64) // 1024))

main()
