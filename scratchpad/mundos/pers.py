#!/usr/bin/env python3
"""BAJA, ADELGAZA Y CABLEA los personajes generados.

Cada mundo pasa a tener SU gente, en lugar de los tres modelos de siempre
repartidos entre los ocho. Los modelos salen de image_to_3d con rigging humanoide
(mismo esqueleto Meshy que ya usaban los del repo, verificado hueso por hueso),
asi que los clips prestados de la biblioteca —quieto, andar, correr— les atan sin
tocar nada mas. Por eso NO se pago animacion por modelo: se genero la malla y la
animacion se recicla.

Cada uno viene con una textura de 2048x2048 en PNG, o sea 8 MB por personaje.
opt_glb.py la baja a 512 en JPEG y deja el archivo en menos de 1 MB, conservando
nodos, huesos y skin, que es lo que hace que los clips le aten.

Uso: python3 pers.py bajar        (descarga y adelgaza)
     python3 pers.py cablear      (reemplaza los glb en los ocho mundos)
"""
import os
import subprocess
import sys

RAIZ = '/home/user/General-Assets-Games'
PER = RAIZ + '/assets/mundos/per/'
M = RAIZ + '/assets/mundos/'

# nombre, job de image_to_3d, altura en metros
MODELOS = [
    ('jungla-explorador',  '6b67399b-7909-41c8-b585-d02584eb47cd'),
    ('dunas-arriero',      'd6c5f3af-2558-4523-be84-ddde10d57768'),
    ('jungla-guia',        'ef73edbd-cd7b-4bc7-83f0-e847be2195b1'),
    ('volcan-vulcanologa', '1cb0276d-10d1-47e4-9d05-ff61408e308a'),
    ('volcan-obrero',      'b13d570c-9cc6-410f-b5da-cc92430ea104'),
    ('pantano-guia',       'e7d5daf6-4720-40ff-876e-085f2fd1fc78'),
    ('pantano-pescador',   'f37f53a0-7a81-4c0a-9aab-2ae20db74270'),
    ('canon-cuerdas',      '83182a52-c5fb-4f98-bb00-5380839eb96e'),
    ('estepa-jinete',      '24a791ab-241c-4e46-87bb-07cafc406629'),
    ('acropolis-cantero',  '2bf8f28a-f069-4564-9541-e10529103647'),
    ('secuoya-botanica',   '672fcc4f-da9a-4990-8428-0ea429099b7f'),
]

# a que personaje de cada mundo le toca cada modelo. El primero de la lista es
# el que te acompaña, asi que va el que mejor pinta.
#   mundo -> [(glb viejo a reemplazar, glb nuevo, cuantas veces)]
CABLEADO = {
    'dunas':     [('npc/viajera.glb', 'per/dunas-arriero.glb', 1),
                  ('npc/dante.glb',   'per/dunas-arriero.glb', 1)],
    'jungla':    [('npc/viajera.glb', 'per/jungla-guia.glb', 2),
                  ('npc/dante.glb',   'per/jungla-explorador.glb', 2)],
    'volcan':    [('npc/viajera.glb', 'per/volcan-vulcanologa.glb', 2),
                  ('npc/dante.glb',   'per/volcan-obrero.glb', 2),
                  ('npc/muro.glb',    'per/volcan-obrero.glb', 1)],
    'pantano':   [('npc/viajera.glb', 'per/pantano-guia.glb', 2),
                  ('npc/dante.glb',   'per/pantano-pescador.glb', 2)],
    'canon':     [('npc/viajera.glb', 'per/canon-cuerdas.glb', 2),
                  ('npc/dante.glb',   'per/canon-cuerdas.glb', 2)],
    'estepa':    [('npc/viajera.glb', 'per/estepa-jinete.glb', 2),
                  ('npc/dante.glb',   'per/estepa-jinete.glb', 2)],
    'acropolis': [('npc/viajera.glb', 'per/acropolis-cantero.glb', 2),
                  ('npc/dante.glb',   'per/acropolis-cantero.glb', 2)],
    'secuoya':   [('npc/viajera.glb', 'per/secuoya-botanica.glb', 2),
                  ('npc/dante.glb',   'per/secuoya-botanica.glb', 2)],
}


def bajar(pares):
    """pares: nombre=url ..."""
    os.makedirs(PER, exist_ok=True)
    import urllib.request
    for par in pares:
        nom, u = par.split('=', 1)
        dst = PER + nom + '.glb'
        if os.path.exists(dst) and os.path.getsize(dst) > 200_000:
            print('%-22s ya esta (%d KB)' % (nom, os.path.getsize(dst) // 1024))
            continue
        tmp = '/tmp/%s.raw.glb' % nom
        urllib.request.urlretrieve(u, tmp)
        subprocess.run([sys.executable, RAIZ + '/scratchpad/mundos/opt_glb.py',
                        tmp, dst, '512', '86'], check=True)
        os.unlink(tmp)


def cablear():
    for slug, pares in CABLEADO.items():
        p = M + slug + '.html'
        t = open(p, encoding='utf8').read()
        hechos = []
        for viejo, nuevo, veces in pares:
            if not os.path.exists(M + nuevo):
                hechos.append(nuevo.split('/')[-1] + ':falta')
                continue
            n = t.count("glb: '%s'" % viejo)
            if not n:
                continue
            t = t.replace("glb: '%s'" % viejo, "glb: '%s'" % nuevo)
            hechos.append('%s x%d' % (nuevo.split('/')[-1][:-4], n))
        open(p, 'w', encoding='utf8').write(t)
        print('%-10s %s' % (slug, ' · '.join(hechos) or 'nada'))


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'cablear'
    if cmd == 'bajar':
        bajar(sys.argv[2:])
    else:
        cablear()
