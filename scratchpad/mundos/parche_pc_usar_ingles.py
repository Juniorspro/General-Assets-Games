#!/usr/bin/env python3
"""Tres cosas de una: ingles por defecto en los 8, el boton USAR redondo y abajo, y
deteccion de PC / tactil en los 13.

1) INGLES POR DEFECTO en los 8 mundos nuevos. Los 7 juegos ya lo tenian; estos no.
   Igual que ahi, la CLAVE de guardado cambia de nombre (sufijo 2): con la vieja, a
   quien ya abrio el mundo en espanol le seguiria saliendo en espanol para siempre y
   parece que el cambio no entro.

2) EL BOTON USAR: aparecia ARRIBA en movil. La causa es de libro y estaba en mi
   parche anterior: #btns se subio arriba a la derecha y es position:absolute, asi
   que el .b.usar que vive dentro —tambien absolute— dejo de colgar de la pantalla y
   paso a colgar de #btns. Su "bottom" se medía desde la caja de los botones de
   arriba, no desde el borde inferior. Va con position:fixed, y de paso REDONDO y del
   tamano del salto, porque es un boton de accion que se toca con el pulgar en medio
   del juego: la pastilla alargada era la unica cosa cuadrada en ese rincon.

3) DETECCION DE PC / TACTIL en los 13. Los 8 nuevos ya la tenian completa; a los 4
   originales y a senda les faltaba la marca sinTactil, que es la que decide si se
   dibuja la palanca en pantalla. Sin ella, un PC sin pantalla tactil se quedaba con
   la palanca y el boton de salto encima del paisaje. Se anade la misma marca, y se
   deja igual en los trece: teclado o raton -> modo PC; un toque -> vuelven los
   controles tactiles; y la marca de "este aparato no tiene tactil" se decide UNA vez
   por lo que el aparato puede hacer, no por lo que se acaba de usar.
"""
import pathlib, re

A = pathlib.Path('/home/user/mundos/assets')
NUEVOS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']
ORIG = ['marte', 'luna', 'exo', 'hielo']

# ---------------------------------------------------------------- 1) ingles
for w in NUEVOS:
    p = A / 'mundos' / (w + '.html')
    s = p.read_text(encoding='utf-8')
    viejo = ("let LANG = 'es';\n"
             "try { LANG = localStorage.getItem('%s_lang') || 'es'; } catch(e){}\n"
             "if (!L[LANG]) LANG = 'es';" % w)
    nuevo = ("/* INGLES por defecto. La clave lleva sufijo 2 a proposito: con la vieja, a quien ya\n"
             "   abrio el mundo en espanol le seguia saliendo en espanol para siempre y parecia que\n"
             "   el cambio no habia entrado. Se sigue pudiendo cambiar, y se sigue recordando. */\n"
             "let LANG = 'en';\n"
             "try { LANG = localStorage.getItem('%s_lang2') || 'en'; } catch(e){}\n"
             "if (!L[LANG]) LANG = 'en';" % w)
    if s.count(viejo) == 1:
        s = s.replace(viejo, nuevo)
        s = s.replace("localStorage.setItem('%s_lang'" % w, "localStorage.setItem('%s_lang2'" % w)
        p.write_text(s, encoding='utf-8')
        print('  ingles ok %s' % w)
    else:
        print('  !! ingles %s: %d coincidencias' % (w, s.count(viejo)))

# ------------------------------------------------------- 2) USAR redondo y abajo
USAR_NUEVO = """  /* USAR: REDONDO, abajo, al lado del salto. Dos motivos.
     Sitio: position FIXED y no absolute. #btns se subio arriba a la derecha y es
     absolute, asi que un hijo absolute dejaba de colgar de la pantalla y colgaba de
     EL: su "bottom" se medía desde la caja de arriba y el boton aparecia arriba.
     Forma: es el unico boton de accion que se toca en medio del juego, con el pulgar
     y sin mirar; una pastilla alargada al lado de un salto redondo se toca peor y se
     ve peor. Mismo diametro que el salto, a su izquierda. */
  .b.usar{position:fixed;right:calc(max(14px,3.5vw) + min(84px,19vw) + 12px);
    bottom:max(16px,5vh);width:min(72px,16vw);height:min(72px,16vw);
    aspect-ratio:1;border-radius:50%;padding:0;display:none;place-items:center;
    font-size:clamp(10px,2.6vw,13px);line-height:1.05;text-align:center;
    letter-spacing:.04em}
  .b.usar.on{display:grid}"""

for w in NUEVOS:
    p = A / 'mundos' / (w + '.html')
    s = p.read_text(encoding='utf-8')
    m = re.search(r"  /\* USAR sigue abajo[^/]*?\*/\n  \.b\.usar\{.*?\n  \.b\.usar\.on\{display:grid\}", s, re.S)
    if not m:
        m = re.search(r"  \.b\.usar\{position:absolute;.*?\n  \.b\.usar\.on\{display:grid\}", s, re.S)
    if m:
        s = s[:m.start()] + USAR_NUEVO + s[m.end():]
        p.write_text(s, encoding='utf-8')
        print('  usar ok %s' % w)
    else:
        print('  !! usar %s: no encuentro la regla' % w)

for w in ORIG:
    p = A / 'mundos' / (w + '.html')
    s = p.read_text(encoding='utf-8')
    m = re.search(r"  /\* USAR es de accion[^/]*?\*/\n  #btns \.b\.usar\{.*?border-radius:14px\}", s, re.S)
    if m:
        s = s[:m.start()] + USAR_NUEVO.replace('.b.usar{', '#btns .b.usar{').replace(
            '.b.usar.on{', '#btns .b.usar.on{') + s[m.end():]
        p.write_text(s, encoding='utf-8')
        print('  usar ok %s' % w)
    else:
        print('  ~  usar %s: sin la regla nueva, se deja' % w)

# --------------------------------------------------- 3) sinTactil en los que faltan
MARCA = """
/* SIN TACTIL: se marca UNA vez, mirando de que es capaz el aparato y no con que se lo
   esta usando ahora. Es lo que decide si se dibuja la palanca y el boton de salto: sin
   esta marca, un PC de escritorio se quedaba con los dos encima del paisaje. */
try {
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0))
    document.body.classList.add('sinTactil');
} catch(e){ }
"""
CSS_MARCA = """  /* en un aparato sin tactil no se dibujan los controles de dedo */
  body.sinTactil #joy,body.sinTactil #bSalta{display:none}
"""
for rel in ['mundos/marte.html', 'mundos/luna.html', 'mundos/exo.html',
            'mundos/hielo.html', 'senda/senda.html']:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    if 'sinTactil' in s:
        print('  -- sinTactil %s ya' % rel); continue
    anc = "addEventListener('touchstart', desactivaPC, { passive: true, capture: true });"
    if s.count(anc) != 1:
        print('  !! sinTactil %s: no encuentro donde' % rel); continue
    s = s.replace(anc, anc + MARCA, 1)
    # y el CSS que la usa
    m = re.search(r"\n  #pcHelp\{", s)
    if m:
        s = s[:m.start() + 1] + CSS_MARCA + s[m.start() + 1:]
    p.write_text(s, encoding='utf-8')
    print('  sinTactil ok %s' % rel)
print('listo')
