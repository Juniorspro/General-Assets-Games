#!/usr/bin/env python3
"""Arma juegos-pc/Recreo.html juntando las partes de herramientas/recreo/partes/ y metiendo
el modelo de Baldi (assets/recreo/baldi_p.glb) como data URI.

Por que el juego vive partido en once archivos y no en uno solo: el HTML final pesa 750 KB y
490 de esos son el GLB en base64. Editar un archivo asi con parches de texto es como operar
con guantes de horno — y ya me costo una vez el archivo entero en cero bytes. Las partes son
la fuente; el HTML es la salida.

    python3 herramientas/recreo/armar.py
"""
import base64, io, json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PARTES = ['a2.html',   # el marco, el CSS y el HUD
          'b2.js',     # three.js, el mapa de la escuela, los idiomas
          'c2.js',     # el render, la camara, las texturas pintadas por codigo
          'd2.js',     # la escuela, el aula, el pizarron, el escritorio, los libros
          'e2.js',     # el rig de cajas, la tabla de animaciones y el modelo generado
          'f2.js',     # los rieles de camara, el profesor en el mundo y el guion
          'g2.js',     # MediaPipe: leer la mano, contar dedos, el teclado de respaldo
          'g3.js',     # las manos en 3D, reconstruidas desde la pantalla
          'h2b.js',    # las pantallas, el audio, la calidad
          'h3.js',     # la voz generada de Baldi y la musica procedural
          'p2.js',     # los dos filtros (saturacion y baja calidad)
          'i2.js',     # el guion corriendo, el paso fijo y el dibujado
          'j2.js']     # los ganchos de prueba

def main():
    partes = os.path.join(RAIZ, 'herramientas', 'recreo', 'partes')
    s = ''.join(io.open(os.path.join(partes, p), encoding='utf8').read() for p in PARTES)
    glb = open(os.path.join(RAIZ, 'assets', 'recreo', 'baldi_p.glb'), 'rb').read()
    uri = 'data:model/gltf-binary;base64,' + base64.b64encode(glb).decode('ascii')
    if '__BALDI_GLB__' not in s:
        print('no aparece __BALDI_GLB__ en las partes', file=sys.stderr); return 1
    s = s.replace('__BALDI_GLB__', uri, 1)
    # las voces horneadas, como un objeto de data URIs
    vp = os.path.join(RAIZ, 'herramientas', 'recreo', 'voz', 'voz.json')
    voz = io.open(vp, encoding='utf8').read().strip() if os.path.exists(vp) else '{}'
    s = s.replace('__VOZ_JSON__', voz, 1)
    # los cuatro temas generados, horneados por hornear_musica.py
    mp_ = os.path.join(RAIZ, 'herramientas', 'recreo', 'musica', 'musica.json')
    mus = io.open(mp_, encoding='utf8').read().strip() if os.path.exists(mp_) else '{}'
    s = s.replace('__MUSICA_JSON__', mus, 1)
    # EL ARTE DEL MENU. Van como data URI por lo mismo que todo lo demas: el juego se sube como UN
    # archivo HTML y no puede depender de que un servidor le sirva nada al lado. Los tres suman 41 KB.
    for clave, arch in (('__MENU_FONDO__',  'menu_fondo.webp'),
                        ('__MENU_TITULO__', 'menu_titulo.webp'),
                        ('__MENU_BOTON__',  'menu_boton.webp')):
        ruta = os.path.join(RAIZ, 'assets', 'recreo', arch)
        if not os.path.exists(ruta):
            print('falta', ruta, file=sys.stderr); return 1
        dat = open(ruta, 'rb').read()
        s = s.replace(clave, 'data:image/webp;base64,' + base64.b64encode(dat).decode('ascii'))
    # LAS TEXTURAS DE FOTO, horneadas por hornear_texturas.py. Van como un objeto de data URIs y no
    # como nueve claves distintas: son nueve y podrian ser quince, y una lista se agrega sola.
    tex = {}
    td = os.path.join(RAIZ, 'assets', 'recreo', 'tex')
    for arch in sorted(os.listdir(td)) if os.path.isdir(td) else []:
        if not arch.endswith('.webp'):
            continue
        dat = open(os.path.join(td, arch), 'rb').read()
        tex[arch[:-5]] = 'data:image/webp;base64,' + base64.b64encode(dat).decode('ascii')
    if '__TEX_JSON__' not in s:
        print('no aparece __TEX_JSON__ en las partes', file=sys.stderr); return 1
    s = s.replace('__TEX_JSON__', json.dumps(tex), 1)

    # SE ESCRIBE RECIEN CUANDO EL TEXTO ESTA COMPLETO. io.open(p,'w') trunca el archivo ANTES de
    # evaluar lo que se le pasa: una vez un NameError en el argumento me dejo Recreo.html en cero.
    salida = os.path.join(RAIZ, 'juegos-pc', 'Recreo.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0

if __name__ == '__main__':
    sys.exit(main())
