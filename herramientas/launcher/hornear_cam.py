#!/usr/bin/env python3
"""El fondo Frutiger de la cámara.

── POR QUÉ ES UNA FOTO PROPIA Y NO LA DEL ESCRITORIO ──
La del escritorio la puede haber cambiado el dueño por una suya: la cámara
quedaría con un fondo que no es Frutiger y el pedido dejaría de cumplirse
justo cuando alguien personaliza el launcher. Ésta es de la cámara y no la
toca nadie.

── Y SE HORNEA A 824, NO A LO QUE VINO ──
El teléfono a densidad 2 la cubre entera con 824 de ancho; a densidad 3 pediría
1236 y pesaría el doble para una imagen que además está casi siempre tapada por
el visor. El mismo número que ya usan el fondo del launcher y los ocho de la
galería.
"""
import io, os, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rez_aero/assets/cam_fondo-g1.png'
SAL   = os.path.join(AQUI, 'partes', 'i_cam.js')
ANCHO = 824
TOPE  = 130 * 1024

im = Image.open(CRUDO).convert('RGB')
w, h = im.size
# recorte a 9:16 por el centro
r = 9/16
if w/h > r:
    nw = int(round(h*r)); im = im.crop(((w-nw)//2, 0, (w-nw)//2+nw, h))
else:
    nh = int(round(w/r)); im = im.crop((0, (h-nh)//2, w, (h-nh)//2+nh))
im = im.resize((ANCHO, int(round(ANCHO/r))), Image.LANCZOS)

mejor = None
for q in (86, 80, 74, 68, 62, 56, 50):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
    mejor = (q, b.getvalue())
    if len(mejor[1]) <= TOPE: break
q, dat = mejor
import base64
uri = 'data:image/webp;base64,' + base64.b64encode(dat).decode()
with open(SAL, 'w') as f:
    f.write("/* El fondo Frutiger de la cámara. Lo escribe hornear_cam.py — no se edita\n"
            "   a mano. %d×%d, WebP q%d, %d KB. */\n"
            % (im.size[0], im.size[1], q, len(dat)//1024))
    f.write("const CAM_FONDO = '%s';\n" % uri)
print('%s  %d×%d  q%d  %d KB' % (SAL, im.size[0], im.size[1], q, len(dat)//1024))
