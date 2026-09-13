#!/usr/bin/env python3
"""LA FALDA DEL HORIZONTE ESTABA ENTERRANDO EL FONDO DE LOS MUNDOS.

Lo de la captura NO es agua: es la falda del horizonte. Es un disco de 1.150 m de
radio, color de niebla, que tapa la parte baja de la foto del cielo (que es
oscura). Estaba clavada a `y = -10` en todos los mundos hechos con la misma
plantilla... y el terreno de varios baja MUCHO mas que eso. Medido, barriendo el
mapa entero cada 10 m:

    mundo      terreno minimo      falda      enterrado
    canon           -25,2           -10         15,2 m
    acropolis       -37,3           -10         27,3 m
    dunas           -13,6           -10          3,6 m
    secuoya         -10,9           -10          0,9 m

O sea: en el CAÑON los ultimos quince metros de la garganta —el rio, el pozo
verde, los escalones tallados: donde pasa la historia— estaban debajo de una chapa
lisa color ladrillo. Y en ACROPOLIS, veintisiete metros. Es exactamente el borron
marron de la captura, con su canto perfectamente recto donde el disco corta el
terreno.

EL ARREGLO. La falda deja de estar en un numero escrito a mano y se pone DEBAJO
del punto mas bajo del terreno, que se mide al arrancar barriendo el mapa cada
12 m (unas 5.000 llamadas a H, una vez, imperceptible). Se le restan 8 m de
respiro. La PARED de lomas lejanas baja lo mismo, porque si no queda una ranura
entre la falda y la pared por donde se ve la franja negra de la foto del cielo.

Bajar la falda no cambia el horizonte: a 1.150 m de distancia, veinte metros son
un grado. Lo que cambia es que el fondo del mundo existe.
"""
import pathlib, re, sys

A = pathlib.Path('/home/user/mundos/assets')
MUNDOS = ['mundos/dunas.html', 'mundos/canon.html', 'mundos/estepa.html',
          'mundos/acropolis.html', 'mundos/secuoya.html']

MEDIDA = """/* EL SUELO MAS BAJO DEL MUNDO. Se mide una vez, barriendo el mapa cada 12 m: unas
   5.000 llamadas a H, imperceptible al lado de las 150.000 que cuesta el terreno.
   Hace falta porque la falda del horizonte estaba clavada en -10 y en este mundo
   el suelo baja mas: los metros de abajo quedaban tapados por una chapa lisa. */
const SUELO_MIN = (() => {
  let m = 1e9;
  for (let x = -MITAD; x <= MITAD; x += 12)
    for (let z = -MITAD; z <= MITAD; z += 12){
      const h = H(x, z);
      if (h < m) m = h;
    }
  return m;
})();
"""

n = 0
for rel in MUNDOS:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []

    if 'SUELO_MIN' not in s:
        # la medida va justo antes de la falda (ahi H ya existe hace rato)
        anc = "/* falda del horizonte: tapa la parte BAJA de la foto del cielo (que es oscura)"
        if s.count(anc) == 1:
            s = s.replace(anc, MEDIDA + anc, 1)
        else:
            err.append('el comentario de la falda aparece %d veces' % s.count(anc))

        A1 = "  f.position.y = -10;"
        B1 = ("  /* DEBAJO del suelo mas bajo, no en -10 a mano: con -10 la falda enterraba\n"
              "     15 m de la garganta del cañon y 27 m de acropolis, y se veia como una\n"
              "     mancha lisa con el canto recto. A 1.150 m, veinte metros de diferencia\n"
              "     son un grado de horizonte: no se nota, y el fondo del mundo aparece. */\n"
              "  f.position.y = Math.min(-10, SUELO_MIN - 8);")
        if s.count(A1) == 1:
            s = s.replace(A1, B1, 1)
        else:
            err.append('la altura de la falda aparece %d veces' % s.count(A1))

        A2 = "  pared.position.y = 31;         /* base -8, borde +70 */"
        B2 = ("  /* la pared baja LO MISMO que la falda: si no, queda una ranura entre las dos\n"
              "     por donde se ve la franja negra de la foto del cielo. */\n"
              "  pared.position.y = 31 + Math.min(0, SUELO_MIN - 8 + 10);")
        if s.count(A2) == 1:
            s = s.replace(A2, B2, 1)
        else:
            err.append('la altura de la pared aparece %d veces' % s.count(A2))

    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); continue
    if s == o:
        print('  %s: sin cambios' % rel); continue
    p.write_text(s, encoding='utf-8')
    n += 1
    print('  %s: la falda va debajo del suelo (%+d bytes)' % (rel, len(s) - len(o)))
print('%d de %d' % (n, len(MUNDOS)))
sys.exit(0 if n == len(MUNDOS) else 1)
