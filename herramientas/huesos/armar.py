#!/usr/bin/env python3
"""Arma juegos-pc/Huesos.html a partir de partes/.

Las partes son la FUENTE; el HTML es la salida. Un archivo de un mega con
base64 adentro no se edita con parches de texto: ya costó un archivo en cero
bytes en este repo.

El ORDEN es el de DEPENDENCIA y no el alfabético: todo termina siendo UN
módulo ES, y un `let`/`const` leído antes de su línea tira y se lleva el
módulo entero.
"""
import pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent
PARTES = RAIZ / 'partes'
SALIDA = RAIZ.parent.parent / 'juegos-pc' / 'Huesos.html'

ORDEN = [
    'a.html',      # doctype, CSS, DOM, importmap y el <script type=module>
    'i_assets.js', # GENERADO: los 24 sprites y los 3 suelos en base64
    'b.js',        # constantes y los tres idiomas
    'c.js',        # utilidades y el azar con semilla
    'd.js',        # el mundo: altura, siembra y la auditoría
    'e.js',        # renderer, pixelado y luces
    'f.js',        # texturas y materiales
    'g.js',        # vegetación instanciada y suelo
    'h.js',        # el rig y las animaciones
    'i.js',        # el jugador y la cámara
    'j.js',        # los esqueletos
    'k.js',        # daño, xp y zonas
    'l.js',        # sonido e interfaz
    'm.js',        # entrada y bucle
    'z.html',      # arranque, sondas y el cierre del documento
]

def main():
    faltan = [p for p in ORDEN if not (PARTES / p).exists()]
    if faltan:
        print('FALTAN:', ', '.join(faltan)); return 1
    txt = []
    for p in ORDEN:
        s = (PARTES / p).read_text(encoding='utf-8')
        txt.append(s if s.endswith('\n') else s + '\n')
    out = ''.join(txt)
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(out, encoding='utf-8')
    kb = len(out.encode('utf-8')) / 1024
    print(f'{SALIDA}  {kb:.0f} KB  ({len(ORDEN)} partes)')
    return 0

if __name__ == '__main__':
    sys.exit(main())
