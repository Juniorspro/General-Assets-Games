#!/usr/bin/env python3
"""Hornea las texturas generadas con Higgsfield a WebP chicos y escribe assets/recreo/tex/.

EL LADO SE ELIGIO MIDIENDO EL PESO, NO ADIVINANDO. La primera pasada las horneo a 256 y las nueve
juntas dieron 17,4 KB — o sea que el presupuesto no era el problema: son fotos SUAVES, sin detalle
fino, y WebP con eso pesa nada. A 512 (y 384 las que son puro ruido) las nueve suman 78 KB y el
mapa aguanta que la camara se pegue a una pared, que es lo que pasa en cada aula.

POR QUE WEBP Y NO PNG. Son fotos: el PNG de 2048 pesa 6-10 MB y el WebP de 256 pesa 12-20 KB. Todo
esto viaja adentro del HTML en base64, que abulta un tercio mas.

LO QUE NO SE HACE ACA: coser la costura. El modelo devuelve texturas "sin costura" que NO lo son, y
arreglarlo a mano —desplazar media imagen y difuminar el cruce— ensucia justo el centro. Se resuelve
del otro lado, en el juego, con MirroredRepeatWrapping: la copia de al lado va espejada, asi que los
bordes que se tocan son el MISMO borde y la costura no puede existir. Cuesta que el patron se lea
simetrico cada dos repeticiones, que en manchas —asfalto, pasto, revoque, baldosa— no se nota.

    python3 herramientas/recreo/hornear_texturas.py /tmp/tex
"""
import io, json, os, sys
from PIL import Image, ImageStat

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDA = os.path.join(RAIZ, 'assets', 'recreo', 'tex')

# nombre -> (lado, calidad). El pizarron y los lockers llevan mas lado porque tienen bordes
# NITIDOS —el marco de un locker, la rejilla de ventilacion— y un borde nitido es lo unico que
# delata una textura chica; el asfalto y el pasto son ruido y aguantan cualquier cosa.
PLAN = {
    'piso':    (512, 82),
    'pared':   (512, 80),
    'techo':   (512, 78),
    'locker':  (512, 84),
    'piza':    (384, 78),
    'asfalto': (384, 76),
    'pasto':   (256, 62),   # el unico que es ruido de verdad: a 384 pesaba 41 KB, mas que las otras ocho juntas, y solo se ve al fondo del patio en la cinematica final
    'fachada': (512, 80),
    'madera':  (384, 80),
}

def main():
    orig = sys.argv[1] if len(sys.argv) > 1 else '/tmp/tex'
    os.makedirs(SALIDA, exist_ok=True)
    info = {}
    total = 0
    for nombre, (lado, cal) in PLAN.items():
        src = os.path.join(orig, nombre + '.png')
        if not os.path.exists(src):
            print('falta', src, file=sys.stderr); return 1
        im = Image.open(src).convert('RGB').resize((lado, lado), Image.LANCZOS)
        dst = os.path.join(SALIDA, nombre + '.webp')
        im.save(dst, 'WEBP', quality=cal, method=6)
        n = os.path.getsize(dst); total += n
        # EL PROMEDIO SE GUARDA PORQUE LOS MATERIALES TIÑEN. Varios llevan `color` ademas del mapa,
        # y color*textura oscurece: sin saber cuanto vale la foto no hay forma de compensar.
        m = ImageStat.Stat(im).mean
        info[nombre] = {'px': lado, 'kb': round(n / 1024, 1),
                        'medio': [round(c) for c in m]}
        print('%-8s %3d px  %6.1f KB  medio %s' % (nombre, lado, n / 1024, info[nombre]['medio']))
    print('---- total %.1f KB, en base64 %.1f KB' % (total / 1024, total / 1024 * 4 / 3))
    io.open(os.path.join(SALIDA, 'info.json'), 'w', encoding='utf8').write(
        json.dumps(info, indent=1, ensure_ascii=False))
    return 0

if __name__ == '__main__':
    sys.exit(main())
