#!/usr/bin/env python3
"""Hornea los PNG de `crudo/` a `partes/i_assets.js` (WebP en base64).

    python3 herramientas/pozo/hornear_assets.py

TRES REGLAS, LAS TRES PAGADAS ANTES EN ESTE REPO:

1. LAS BALDOSAS NO SE RECORTAN. `piso`, `muro` y `muro_cima` se repiten: recortar
   al contenido les corre el borde y la costura aparece como una reja sobre todo
   el suelo. Van a 48x48 exacto, que es CELDA.
2. TODO LO DEMAS SE RECORTA A SU CAJA DE ALFA y se mete en su caja de destino
   CONSERVANDO LA PROPORCION. Escalando cada pieza a su caja, un brazo y una
   pierna salen del mismo ancho y el muneco se deforma segun la pose.
3. EL TAMANO DE DESTINO ES 3x EL DIBUJADO. El juego dibuja a ESC~0,78 con DPR
   hasta 2, o sea que una pieza de 20 px de mundo mide ~31 px de pantalla; 3x
   deja margen y no cuesta casi nada en WebP sin perdida.
4. Y ESCRIBE `IMGM`, la caja EN UNIDADES DE MUNDO de cada pieza. El dibujo la lee
   de ahi en vez de tenerla escrita al lado: con dos listas, el dia que una pieza
   cambie de caja el horneado y el dibujo dirian cosas distintas y nadie se
   enteraria — el sprite saldria estirado y no fallaria nada.
"""
import base64, io, json, os, sys
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CRUDO = os.path.join(RAIZ, 'herramientas', 'pozo', 'crudo')
SAL = os.path.join(RAIZ, 'herramientas', 'pozo', 'partes', 'i_assets.js')

K = 3  # el multiplicador de arriba

# clave: (ancho de mundo, alto de mundo)  — el destino es esto por K
CAJA = {
 'pj_cabeza': (20, 20), 'pj_cuerpo': (20, 17), 'pj_brazo': (14, 7), 'pj_pierna': (7, 13),
 'bala': (13, 13),
 'cofre_cer': (36, 27), 'cofre_abi': (36, 27),
 'moneda': (13, 13), 'corazon': (16, 15), 'escalera': (46, 42),
 'reja': (7, 42),
 'boton': (190, 48), 'boton_oro': (190, 48), 'logo': (300, 84),
}
for a in ('pistola rafaga escopeta rifle astilla orbe trueno canon aguja cruz').split():
    CAJA['arma_' + a] = (22, 9)
# los bichos: 2r del juego, con un poco de aire
for c, r in [('baba',14),('corredor',12),('tirador',13),('torreta',16),
             ('bomba',13),('bruto',20),('jefe1',34),('jefe2',40)]:
    CAJA['en_' + c] = (int(r*2.25), int(r*2.25))

BALDOSA = {'piso': 48, 'muro': 48, 'muro_cima': 48}


def recorta(im):
    """caja de alfa; si no hay alfa util devuelve la imagen entera"""
    a = im.split()[-1]
    b = a.getbbox()
    return im.crop(b) if b else im


def mete(im, w, h):
    """encaja conservando la proporcion, centrado, sobre transparente"""
    e = min(w / im.width, h / im.height)
    nw, nh = max(1, round(im.width*e)), max(1, round(im.height*e))
    im = im.resize((nw, nh), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), (0,0,0,0))
    out.paste(im, ((w-nw)//2, (h-nh)//2))
    return out


def b64(im):
    b = io.BytesIO()
    im.save(b, 'WEBP', lossless=True, quality=100, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


def main():
    salidas, mundo, total = {}, {}, 0
    for f in sorted(os.listdir(CRUDO)):
        if not f.lower().endswith('.png'): continue
        k = os.path.splitext(f)[0]
        im = Image.open(os.path.join(CRUDO, f)).convert('RGBA')
        if k in BALDOSA:
            n = BALDOSA[k]
            im = im.resize((n, n), Image.LANCZOS)
            mundo[k] = [n, n]
        elif k in CAJA:
            w, h = CAJA[k]
            im = mete(recorta(im), w*K, h*K)
            mundo[k] = [w, h]
        else:
            print('  sin caja, salteo:', k); continue
        d = b64(im)
        salidas[k] = d
        total += len(d)
        print('  %-14s %3dx%-3d %6d B' % (k, im.width, im.height, len(d)))
    if not salidas: print('nada que hornear'); return
    txt = ('/* i_assets.js — GENERADO por herramientas/pozo/hornear_assets.py.\n'
           '   No editar a mano. Los PNG crudos viven en herramientas/pozo/crudo/\n'
           '   y NO se versionan; los task_id de Rezona si (crudo/tareas.json),\n'
           '   porque perder un task_id es perder un asset pagado. */\n'
           'const IMGB = ' + json.dumps(salidas, sort_keys=True) + ';\n'
           'const IMGM = ' + json.dumps(mundo, sort_keys=True) + ';\n')
    open(SAL, 'w').write(txt)
    print('%d assets, %d KB de base64 -> %s' % (len(salidas), total//1024, SAL))


if __name__ == '__main__': main()
