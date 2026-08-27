# -*- coding: utf-8 -*-
"""
Hornea los ocho fondos de mundo para POMPOM.

TRES COSAS, Y LAS TRES SON PORQUE EL JUEGO ES BLANCO:
1. RECORTE DEL MARCO. z_image devuelve algunos como "poster": la ilustracion con un borde blanco
   alrededor. Ese borde, escalado a pantalla completa, se ve como una franja clara pegada al costado.
   Se detecta comparando cada fila y columna del borde contra el centro y se recorta.
2. SE ACLARAN MEZCLANDO CON EL PAPEL. El juego dibuja tinta oscura, un rojo y un verde encima: un
   fondo con contraste propio compite con la linea de puntos, que es el enunciado del nivel. Mezclar
   contra #F7F6F3 en el horno -y no solo bajar el alfa al dibujar- deja el archivo mas chico y no
   cuesta nada por cuadro.
3. QUEDAN CHICOS A PROPOSITO. 360x640 estirado a pantalla completa se ve BIEN porque no hay un solo
   detalle fino en estas imagenes: son manchas suaves. Los ocho juntos pesan menos que una foto.
"""
import io, os, glob, base64
from PIL import Image, ImageChops, ImageStat

AQUI = os.path.dirname(os.path.abspath(__file__))
DIR  = os.path.normpath(os.path.join(AQUI, '..', '..', 'assets', 'pompom', 'fondos'))
PAPEL = (247, 246, 243)
# MEZCLA FIJA, Y PROBE LA OTRA. Intente sacarla del contraste de cada imagen -apuntar a una
# desviacion estandar final de 12 sobre 255- y MIDIO PEOR: la desviacion de la imagen entera esta
# dominada por las zonas palidas, que son casi todo el cuadro, asi que la cascada de hielo -cuyo
# contraste es local, en las columnas- salia con std 15,8 y le tocaba MENOS mezcla que antes.
# Una regla que mide lo que no es el problema no es mejor que un numero elegido a ojo y comprobado
# en una foto. 46% deja las ocho legibles debajo de la tinta, el rojo y el verde del juego.
MEZCLA = 0.46
ANCHO, ALTO = 360, 640

def recortar_marco(im):
    """
    Saca el borde de poster, si lo hay. TRES CONDICIONES Y LAS TRES HACEN FALTA:
      · plano (stddev < 3)
      · CASI BLANCO EN ABSOLUTO (media > 243), no "mas claro que el centro"
      · y FINO: como maximo el 8% del lado

    La primera version pedia solo las dos primeras con el umbral relativo, y se comio la mitad de
    cuatro de las ocho imagenes: un cielo pálido liso es plano y es mas claro que el centro, o sea
    que cumplia — el recorte le arrancaba 512 px de cielo al desierto y a la salina. El cielo es
    parte del dibujo; un margen de poster no llega nunca al 8% del lado ni deja de ser blanco.
    """
    g = im.convert('L')
    w, h = g.size
    topeX, topeY = int(w*0.08), int(h*0.08)
    def plano(caja):
        st = ImageStat.Stat(g.crop(caja))
        return st.stddev[0] < 3.0 and st.mean[0] > 238
    izq = 0
    while izq < topeX and plano((izq, 0, izq+1, h)): izq += 1
    der = w
    while der > w-topeX and plano((der-1, 0, der, h)): der -= 1
    arr = 0
    while arr < topeY and plano((0, arr, w, arr+1)): arr += 1
    aba = h
    while aba > h-topeY and plano((0, aba-1, w, aba)): aba -= 1
    if (izq, arr, der, aba) != (0, 0, w, h):
        print('   marco recortado:', (izq, arr, der, aba), 'de', (w, h))
        return im.crop((izq, arr, der, aba))
    return im

def hornear():
    fuentes = sorted(glob.glob(os.path.join(DIR, 'm*.png')))
    if not fuentes:
        raise SystemExit('no hay m*.png en ' + DIR)
    total = 0
    for f in fuentes:
        im = Image.open(f).convert('RGB')
        im = recortar_marco(im)
        im = im.resize((ANCHO, ALTO), Image.LANCZOS)
        papel = Image.new('RGB', im.size, PAPEL)
        im = Image.blend(im, papel, MEZCLA)
        dst = f.replace('.png', '.webp')
        im.save(dst, 'WEBP', quality=76, method=6)
        n = os.path.getsize(dst); total += n
        print('%-10s %6d B' % (os.path.basename(dst), n))
    print('total %d B' % total)

if __name__ == '__main__':
    hornear()
