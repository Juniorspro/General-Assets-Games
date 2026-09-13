#!/usr/bin/env python3
"""LUGARES PROPIOS. CANON, ESTEPA, ACROPOLIS y SECUOYA salieron clonados de
DUNAS y quedaron con los MISMOS puntos de interes: el recorrido era identico en
los cuatro, con lo que el mapa se sentia igual aunque el terreno fuera distinto.
Aca cada mundo recibe:
  · sus PROPIAS coordenadas (otro recorrido, otra forma de ruta)
  · LUGARES NUEVOS ademas de los seis del guion (mirador, cueva, puente...)
  · sus propios NOMBRES de lugar en los textos del objetivo
Uso: python3 parche_lugares.py [slug ...]"""
import re, sys

M = '/home/user/General-Assets-Games/assets/mundos/'

# Las seis claves del guion se conservan (las usan CAPS y el terreno) pero
# cambian de sitio; y se agregan lugares NUEVOS por mundo.
#   ruta: recorrido propio -> inicio, mojon, campamento, ruinas, oasis, cresta
#   extra: lugares de mas, con nombre visible
LUG = {
 # CAÑON: la ruta BAJA por la garganta y vuelve a subir por el otro lado.
 # Zigzag entre las dos paredes, no una diagonal como en dunas.
 'canon': dict(
   ruta=[(-330, 366, 20), (-208, 250, 18), (-64, 176, 26), (36, 44, 30),
         (-58, -104, 34), (206, -300, 26)],
   extra=[('mirador', 262, 120, 20, 'el balcón de piedra'),
          ('cueva', -170, 8, 16, 'la cueva de las manos'),
          ('vado', -6, -224, 22, 'el vado del río'),
          ('agujas', 300, 30, 18, 'las agujas rojas')]),
 # ESTEPA: la ruta es un ARCO enorme y abierto, todo a la vista. Nada de
 # pasillos: en la estepa se camina hacia lo que se ve.
 'estepa': dict(
   ruta=[(340, 350, 24), (188, 296, 22), (-24, 262, 30), (-236, 128, 34),
         (-300, -132, 40), (54, -338, 26)],
   extra=[('kurgan', 128, -60, 22, 'el túmulo'),
          ('pozo', -132, -286, 18, 'el pozo de piedra'),
          ('rebano', 260, 44, 26, 'el rebaño'),
          ('molino', -330, 300, 18, 'el molino de viento')]),
 # ACROPOLIS: la ruta SUBE en espiral por la ladera hasta el santuario del
 # borde del acantilado. Cada tramo gana altura, ninguno es plano.
 'acropolis': dict(
   ruta=[(-40, -348, 20), (96, -250, 18), (232, -96, 26), (150, 62, 32),
         (-46, 118, 36), (-268, 24, 24)],
   extra=[('teatro', -160, -190, 24, 'el teatro tallado'),
          ('cisterna', 300, 150, 16, 'la cisterna'),
          ('faro', 44, 236, 20, 'el faro del borde'),
          ('cantera', -320, -300, 22, 'la cantera de mármol')]),
 # SECUOYA: la ruta CRUZA el arroyo dos veces y se mete al bosque cerrado.
 # Es la mas corta y la mas revuelta: en el bosque no se ve lejos.
 'secuoya': dict(
   ruta=[(300, 320, 20), (176, 208, 18), (46, 246, 26), (-96, 96, 30),
         (-30, -108, 34), (-286, -258, 24)],
   extra=[('tronco', 240, 34, 18, 'el tronco caído'),
          ('cascada', -230, 210, 20, 'la cascada'),
          ('nido', 130, -200, 16, 'el nido alto'),
          ('quemado', -60, -320, 22, 'el claro quemado')]),
}
CLAVES = ['inicio', 'mojon', 'campamento', 'ruinas', 'oasis', 'cresta']

# nombre visible de cada lugar del guion, por mundo (pisa los textos de dunas)
NOMBRE = {
 'canon': ['el filo de arriba', 'la primera marca', 'el campamento del talud',
           'la ciudad de abajo', 'la poza del fondo', 'la boca del cañón'],
 'estepa': ['la última cerca', 'el mojón de crin', 'el campamento de fieltro',
            'las piedras paradas', 'la aguada', 'la loma del vigía'],
 'acropolis': ['el sendero de sal', 'el hito de mármol', 'el campamento de los obreros',
               'el santuario', 'la fuente sagrada', 'el promontorio'],
 'secuoya': ['el linde del bosque', 'el mojón de musgo', 'el campamento de la partida',
             'el claro del árbol madre', 'el remanso', 'la loma del helecho'],
}


def parche(t, slug):
    if slug not in LUG:
        return t, 'lug(no toca)'
    if '/* LUGARES PROPIOS' in t:
        return t, 'lug(ya)'
    d = LUG[slug]
    msgs = []
    # 1) el bloque POI: las seis claves del guion, mudadas, mas los lugares nuevos
    lin = ['const POI = {', '  /* LUGARES PROPIOS de este mundo: el recorrido no se parece al de',
           '     los hermanos. Las seis primeras claves son las del guion; las de abajo',
           '     son lugares de mas, para que haya adonde desviarse. */']
    for k, (x, z, pr) in zip(CLAVES, d['ruta']):
        lin.append('  %-11s { x: %5d, z: %5d, pr: %2d },' % (k + ':', x, z, pr))
    for i, (k, x, z, pr, nom) in enumerate(d['extra']):
        coma = ',' if i < len(d['extra']) - 1 else ''
        lin.append('  %-11s { x: %5d, z: %5d, pr: %2d }%s   /* %s */'
                   % (k + ':', x, z, pr, coma, nom))
    lin.append('};')
    nuevo = '\n'.join(lin)
    m = re.search(r"const POI = \{.*?\n\};", t, re.S)
    if not m:
        return t, 'lug(POI NO)'
    t = t[:m.start()] + nuevo + t[m.end():]
    msgs.append('POI')
    # Los NOMBRES visibles de los lugares NO se tocan aca: los trae
    # parche_hist.py con los capitulos nuevos. Reemplazarlos por texto plano
    # pisaba tambien los identificadores POI.ruinas / POI.oasis del motor.
    return t, 'lug[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(LUG))
