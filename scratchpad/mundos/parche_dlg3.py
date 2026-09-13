#!/usr/bin/env python3
"""El dialogo POR ENCIMA de los controles.

#dlg, #joy y #bSalta son hermanos dentro de #hud y ninguno declara z-index, asi
que manda el orden del DOM: la palanca (linea 239) y el salto (240) se pintan
DESPUES del globo (238) y por eso se le ponen encima. Con el globo pegado abajo y
la palanca abajo a la izquierda, el solape es constante.

No se cambia el orden del DOM porque la palanca tiene que quedar donde esta para
el pulgar: se le da z-index al globo. Y con el dialogo abierto ya existia
body.hablando, que apaga la palanca y el salto; se le suma el boton USAR, que
seguia encima del globo tapando el texto.
"""
import pathlib

D = pathlib.Path('/home/user/mundos/assets/mundos')
MUNDOS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis',
          'secuoya', 'marte', 'luna', 'exo', 'hielo']

n = 0
for w in MUNDOS:
    p = D / (w + '.html')
    s = p.read_text(encoding='utf-8')
    o = s

    # 1) el globo gana al resto del HUD
    i = s.find('  #dlg{position:absolute')
    if i < 0:
        i = s.find('#dlg{position:absolute')
    if i < 0:
        print('  !! %s: no encuentro #dlg' % w)
        continue
    if 'z-index' not in s[i:i + 260]:
        j = s.find('}', i)
        s = (s[:j] + ';z-index:5' + s[j:])

    # 2) con dialogo abierto, USAR tampoco estorba
    if 'body.hablando' in s and '.b.usar' in s and 'body.hablando .b.usar' not in s:
        k = s.find('body.hablando #joy')
        if k >= 0:
            fin = s.find('\n', s.find('}', k))
            s = (s[:fin + 1]
                 + '  /* el boton USAR tambien se aparta: pegado abajo a la derecha, se le ponia\n'
                   '     encima del globo y tapaba el final de cada linea */\n'
                   '  body.hablando .b.usar{opacity:0;pointer-events:none}\n'
                 + s[fin + 1:])

    if s != o:
        p.write_text(s, encoding='utf-8')
        n += 1
        print('  ok %s' % w)
    else:
        print('  -- %s (ya estaba)' % w)
print('%d de %d mundos parcheados' % (n, len(MUNDOS)))
