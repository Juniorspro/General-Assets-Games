#!/usr/bin/env python3
"""RELIQUIA EN PC: ESTABA A MEDIAS, Y NO SE VEIA.

Las teclas ya existian (flechas / WASD / espacio / ESC) y la deteccion tambien:
`body.pc` se pone bien en un PC de verdad. Lo que faltaba es todo lo que se VE,
que es lo unico que le importa a quien juega:

  1. EL PANEL DE TECLAS VIVE DENTRO DE `#hud`, y `#hud` esta oculto en la
     portada. O sea que el cartel que explica las teclas aparece recien cuando
     ya estas corriendo, y en la portada —que es donde uno se pregunta como se
     juega— no hay nada. Medido: `#pcTec` con el texto correcto en ingles,
     `display:block`, y `offsetHeight = 0` porque el padre esta en `display:none`.
     Se lo saca de `#hud` y pasa a colgar de la interfaz, como en los otros
     catorce.

  2. EL TUTORIAL DE LA CARRERA SIGUE DICIENDO «DESLIZA». El renglon `#tut` que
     sale al empezar dice «⬅️➡️ swipe to change lane», que en un teclado es una
     instruccion falsa. Ahora hay una version por teclas y `applyLang()` elige
     la que corresponde al aparato.

  3. `pintaTec()` SE LLAMABA ANTES DE QUE EXISTIERA `LANG`. La deteccion corre en
     la linea ~930 y `let LANG` se declara en la 1327: en un modulo eso es la
     zona muerta temporal, asi que `pintaTec()` tiraba ReferenceError. La
     excepcion se la comia el `try` de alrededor, pero como `ESPC` ya habia
     quedado en `true`, ninguna llamada posterior volvia a intentarlo. Se
     salvaba de casualidad porque `applyLang()` lo vuelve a llamar mas tarde.
     Se arregla igual: si `LANG` todavia no existe, ingles y a otra cosa.
"""
import pathlib, sys

p = pathlib.Path('/home/user/mundos/assets/reliquia/reliquia.html')
s = p.read_text(encoding='utf-8')
o = s
err = []

# ---- 1) el panel de teclas, fuera del HUD ---------------------------------
if '<div id="pcTec"></div>\n    <div id="pups"></div>' in s:
    s = s.replace('    <div id="pcTec"></div>\n    <div id="pups"></div>',
                  '    <div id="pups"></div>', 1)
    # colgarlo del contenedor de interfaz, al lado del boton de pausa del titulo
    ancla = '  <!-- HUD -->\n'
    if ancla not in s:
        err.append('no encuentro donde colgar el panel de teclas')
    else:
        s = s.replace(ancla,
            '  <!-- TECLAS DE PC: fuera del HUD a proposito. Adentro solo se veia\n'
            '       corriendo, y la portada —que es donde uno se pregunta como se\n'
            '       juega— no decia nada. -->\n'
            '  <div id="pcTec"></div>\n' + ancla, 1)
elif s.count('<div id="pcTec"></div>') == 1 and '<!-- TECLAS DE PC' in s:
    print('  -- el panel ya esta fuera del HUD')
else:
    err.append('el panel de teclas no esta donde deberia')

# ---- 2) el tutorial por teclas --------------------------------------------
TUT = [
    ("tut:'⬅️➡️ deslizá para cambiar de carril<br>⬆️ saltá · ⬇️ barrida'",
     "tut:'⬅️➡️ deslizá para cambiar de carril<br>⬆️ saltá · ⬇️ barrida',"
     "tutPC:'← → o A D para cambiar de carril<br>↑ / ESPACIO saltá · ↓ barrida'"),
    ("tut:'⬅️➡️ swipe to change lane<br>⬆️ jump · ⬇️ slide'",
     "tut:'⬅️➡️ swipe to change lane<br>⬆️ jump · ⬇️ slide',"
     "tutPC:'← → or A D to change lane<br>↑ / SPACE jump · ↓ slide'"),
    ("tut:'⬅️➡️ deslize para mudar de pista<br>⬆️ pule · ⬇️ deslize'",
     "tut:'⬅️➡️ deslize para mudar de pista<br>⬆️ pule · ⬇️ deslize',"
     "tutPC:'← → ou A D para mudar de pista<br>↑ / ESPAÇO pule · ↓ deslize'"),
]
if 'tutPC:' in s:
    print('  -- el tutorial por teclas ya esta')
else:
    for viejo, nuevo in TUT:
        if s.count(viejo) != 1:
            err.append('el tutorial %r aparece %d veces' % (viejo[:24], s.count(viejo)))
        else:
            s = s.replace(viejo, nuevo, 1)

VIEJO_TUT = "$id('tut').innerHTML=T('tut');"
NUEVO_TUT = ("$id('tut').innerHTML=T(ESPC?'tutPC':'tut');"
             "   /* con teclado, el renglon del tutorial no puede decir «deslizá» */")
if NUEVO_TUT.split('/*')[0].strip() in s:
    pass
elif s.count(VIEJO_TUT) == 1:
    s = s.replace(VIEJO_TUT, NUEVO_TUT, 1)
else:
    err.append('la linea del tutorial aparece %d veces' % s.count(VIEJO_TUT))

# ---- 3) pintaTec sin depender de que LANG ya exista ------------------------
VIEJO_PT = """function pintaTec(){
  const e = $id('pcTec');
  if (e) e.innerHTML = (TECR[LANG] || TECR.en).join('<br>');
}"""
NUEVO_PT = """function pintaTec(){
  const e = $id('pcTec');
  if (!e) return;
  /* OJO: esto corre al DETECTAR el aparato, y `let LANG` se declara cuatrocientas
     lineas mas abajo: en un modulo eso es la zona muerta temporal y leerlo aca
     tira ReferenceError. Antes la excepcion se la comia el try de la deteccion y
     el cartel quedaba vacio. Si todavia no existe, ingles: `applyLang()` lo
     vuelve a pintar en cuanto se sepa el idioma. */
  let L = 'en';
  try { L = LANG || 'en'; } catch (err) {}
  e.innerHTML = (TECR[L] || TECR.en).join('<br>');
}"""
if 'la zona muerta temporal' in s:
    print('  -- pintaTec ya es tolerante')
elif s.count(VIEJO_PT) == 1:
    s = s.replace(VIEJO_PT, NUEVO_PT, 1)
else:
    err.append('pintaTec aparece %d veces' % s.count(VIEJO_PT))

# ---- 4) al cambiar de modo, repintar el tutorial ---------------------------
VIEJO_MP = """  document.body.classList.toggle('pc', v);
  if (v) pintaTec();"""
NUEVO_MP = """  document.body.classList.toggle('pc', v);
  pintaTec();
  /* el renglon del tutorial cambia con el modo: si pasas de dedo a teclado a
     mitad de partida, deja de decirte que deslices */
  try { if (typeof applyLang === 'function') applyLang(); } catch (err) {}"""
if 'el renglon del tutorial cambia con el modo' in s:
    print('  -- modoPC ya repinta')
elif s.count(VIEJO_MP) == 1:
    s = s.replace(VIEJO_MP, NUEVO_MP, 1)
else:
    err.append('modoPC aparece %d veces' % s.count(VIEJO_MP))

if err:
    print('\n'.join('  !! ' + e for e in err)); sys.exit(1)
if s == o:
    print('  sin cambios'); sys.exit(0)
p.write_text(s, encoding='utf-8')
print('  reliquia: panel de teclas visible en la portada, tutorial por teclas, pintaTec tolerante (%+d bytes)'
      % (len(s) - len(o)))
