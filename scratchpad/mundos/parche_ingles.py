#!/usr/bin/env python3
"""Que abran en INGLES por defecto, sin perder el cambio de idioma.

Dos cosas, no una:

1. El idioma por defecto pasa de 'es' a 'en'. Eso solo alcanza para quien nunca
   jugo: los siete guardan la eleccion en localStorage, asi que a quien ya abrio el
   juego en espanol le seguiria saliendo en espanol para siempre y parecia que el
   cambio no habia entrado.
2. Por eso la CLAVE de guardado cambia de nombre (sufijo 2). Con clave nueva no hay
   eleccion previa que la pise: todos abren en ingles la primera vez, y desde ahi
   lo que el jugador elija se guarda y se respeta como antes.

RELIQUIA guarda el idioma dentro de su propio objeto de partida (SV), asi que ahi
se toca el valor por defecto y se ignora el idioma viejo del guardado.
"""
import pathlib, re

A = pathlib.Path('/home/user/mundos/assets')
JUEGOS = [('senda/senda.html', 'senda'), ('mundos/luna.html', 'luna'),
          ('mundos/marte.html', 'marte'), ('mundos/exo.html', 'exo'),
          ('mundos/hielo.html', 'hielo')]

n = 0
for rel, slug in JUEGOS:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    viejo = ("let LANG = 'es';\n"
             "try { LANG = localStorage.getItem('%s_lang') || 'es'; } catch(e){}\n"
             "if (!L[LANG]) LANG = 'es';" % slug)
    nuevo = ("/* INGLES por defecto. La clave de guardado lleva sufijo 2 a proposito: con la\n"
             "   vieja, a quien ya habia abierto el juego en espanol le seguia saliendo en\n"
             "   espanol para siempre y parecia que el cambio no habia entrado. El idioma se\n"
             "   sigue pudiendo cambiar y se sigue recordando, bajo la clave nueva. */\n"
             "let LANG = 'en';\n"
             "try { LANG = localStorage.getItem('%s_lang2') || 'en'; } catch(e){}\n"
             "if (!L[LANG]) LANG = 'en';" % slug)
    if s.count(viejo) == 1:
        s = s.replace(viejo, nuevo)
    else:
        print('  !! %s: el bloque de idioma no aparece 1 vez (%d)' % (slug, s.count(viejo)))
    # y que guarde en la clave nueva
    vg = "localStorage.setItem('%s_lang'" % slug
    if vg in s:
        s = s.replace(vg, "localStorage.setItem('%s_lang2'" % slug)
    else:
        print('  ~  %s: no encuentro el setItem del idioma' % slug)
    if s != o:
        p.write_text(s, encoding='utf-8'); n += 1
        print('  ok %s' % slug)

# ---- MAREA: usa SLUG + '_lang' ----
p = A / 'g3/marea.html'
s = p.read_text(encoding='utf-8'); o = s
s = s.replace("let LANG = 'es'; try { LANG = localStorage.getItem(SLUG + '_lang') || 'es'; } catch (e) {}",
              "/* ingles por defecto; clave nueva para que una eleccion vieja no la pise */\n"
              "let LANG = 'en'; try { LANG = localStorage.getItem(SLUG + '_lang2') || 'en'; } catch (e) {}")
s = s.replace("localStorage.setItem(SLUG + '_lang', LANG)", "localStorage.setItem(SLUG + '_lang2', LANG)")
if s != o:
    p.write_text(s, encoding='utf-8'); n += 1; print('  ok marea')
else:
    print('  !! marea: sin cambios')

# ---- RELIQUIA: el idioma vive dentro del guardado SV ----
p = A / 'reliquia/reliquia.html'
s = p.read_text(encoding='utf-8'); o = s
if s.count("let LANG=SV.lang||'es';") == 1:
    s = s.replace("let LANG=SV.lang||'es';",
                  "/* ingles por defecto. Se ignora el idioma que hubiera en el guardado viejo:\n"
                  "   si no, a quien ya jugo en espanol le seguia saliendo en espanol. */\n"
                  "let LANG=SV.lang2||'en';")
    s = s.replace("LANG=b.dataset.lang; SV.lang=LANG;", "LANG=b.dataset.lang; SV.lang2=LANG;")
    p.write_text(s, encoding='utf-8'); n += 1; print('  ok reliquia')
else:
    print('  !! reliquia: no encuentro el default de idioma')

print('%d juegos en ingles por defecto' % n)
