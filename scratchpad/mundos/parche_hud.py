#!/usr/bin/env python3
"""HUD: menu y sonido ARRIBA, fuera el boton CORRER, y el FOV que suba de a poco.

  · MENU y SONIDO estaban abajo a la derecha, alargados, apretados contra el
    salto y contra el pulgar con el que se juega. Van ARRIBA a la derecha,
    cuadrados y chicos: son botones que se tocan una vez cada tanto, no en medio
    de la accion.
  · El boton CORRER ya no tiene razon de existir: se corre empujando la palanca
    del todo hacia arriba, y en PC con Shift. Queda como indicador chiquito, no
    como boton que ocupa el pulgar.
  · El FOV pasaba de 72 a 77 DE GOLPE al empezar a correr, y de vuelta de golpe
    al soltar: se veia como un tironcito de la imagen. Ahora sigue a la
    velocidad REAL del jugador con un seguimiento exponencial, asi que el campo
    se abre y se cierra solo.
Uso: python3 parche_hud.py [slug ...]"""
import re
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

CSS = """  /* ---------------------------- HUD DE ARRIBA -----------------------------
     MENU y SONIDO se tocan una vez cada tanto, no en medio de la accion: van
     ARRIBA a la derecha y CUADRADOS. Antes estaban abajo, alargados y apretados
     contra el boton de salto, o sea justo donde apoya el pulgar con el que se
     juega. */
  #btns{position:absolute;right:max(10px,2.5vw);top:max(10px,2.5vh);display:flex;
    flex-direction:row;gap:8px;align-items:flex-start;pointer-events:auto}
  .b{width:46px;height:46px;min-width:0;padding:0;display:grid;place-items:center;
    text-align:center;border-radius:12px;font-weight:800;font-size:16px;
    background:@BG@;border:1.5px solid @BD@;
    color:@CT@;pointer-events:auto;cursor:pointer;backdrop-filter:blur(3px)}
  .b:active{transform:translateY(1px);filter:brightness(1.3)}
  /* USAR sigue abajo: es de accion, tiene que estar donde esta el pulgar */
  .b.usar{position:absolute;right:calc(20px + min(84px,19vw));bottom:max(16px,5vh);
    width:auto;height:auto;padding:13px 20px;font-size:15px;border-radius:14px;
    background:@USAR@;border-color:@BDU@;display:none}
  .b.usar.on{display:grid}
  /* CORRER ya no es un boton: es un indicador chiquito al lado del contador */
  .b.corre{display:none}
  #corriendo{position:absolute;left:12px;top:calc(10px + 2.3em);pointer-events:none;
    display:none;font:800 11px/1 ui-sans-serif,system-ui,sans-serif;
    letter-spacing:.14em;padding:5px 8px;border-radius:7px;
    background:@BG@;border:1px solid @BD@;color:@CT@}
  #corriendo.on{display:block}"""

JS_FOV_VIEJO = "  cam.fov = 72 + (corre ? 5 : 0);"
JS_FOV_NUEVO = """  /* EL CAMPO SE ABRE DE A POCO. Antes saltaba de 72 a 77 en el cuadro en que
     empezabas a correr, y volvia de golpe al soltar: se veia como un tiron de
     la imagen. Ahora persigue a la velocidad REAL, asi que se abre y se cierra
     solo, y de paso vale igual para el auto-correr de la palanca. */
  const fovObj = 72 + 6 * cl((Math.hypot(pvx, pvz) - VEL * .96) / (VEL_CORRE - VEL), 0, 1);
  fovSuave += (fovObj - fovSuave) * Math.min(1, dt0 * 3.2);
  cam.fov = fovSuave;"""


def parche(t, slug):
    if '#corriendo{' in t:
        return t, 'hud(ya)'
    msgs = []

    # --- 1) el CSS, conservando los colores del mundo ------------------------
    m = re.search(r"  #btns\{position:absolute;right:[^\n]*\n[^\n]*\n"
                  r"  \.b\{[^\n]*\n[^\n]*\n[^\n]*\n"
                  r"  \.b:active\{[^\n]*\n"
                  r"  \.b\.usar\{[^\n]*\n"
                  r"  \.b\.usar\.on\{[^\n]*\n"
                  r"  \.b\.corre\.on\{[^\n]*\n", t)
    if not m:
        return t, 'hud(css NO)'
    viejo = m.group(0)
    def buscar(rx, dflt):
        r = re.search(rx, viejo)
        return r.group(1) if r else dflt
    css = (CSS.replace('@BG@', buscar(r"\.b\{[^}]*background:(rgba\([^)]*\))", 'rgba(0,0,0,.55)'))
              .replace('@BD@', buscar(r"\.b\{[^}]*border:1\.5px solid (rgba\([^)]*\))", 'rgba(255,255,255,.35)'))
              .replace('@CT@', buscar(r"\.b\{[^}]*color:(#[0-9a-fA-F]{6})", '#f0f0f0'))
              .replace('@USAR@', buscar(r"\.b\.usar\{[^}]*background:(rgba\([^)]*\))", 'rgba(160,72,30,.78)'))
              .replace('@BDU@', buscar(r"\.b\.usar\{[^}]*border-color:(#[0-9a-fA-F]{6})", '#ffd2a0')))
    t = t.replace(viejo, css + '\n', 1)
    msgs.append('css')

    # --- 2) el indicador de que vas corriendo -------------------------------
    if '<div id="recol">' in t:
        t = t.replace('  <div id="recol"></div>\n',
                      '  <div id="recol"></div>\n  <div id="corriendo"></div>\n', 1)
        msgs.append('ind')

    # --- 3) el FOV progresivo ----------------------------------------------
    if JS_FOV_VIEJO in t:
        t = t.replace(JS_FOV_VIEJO, JS_FOV_NUEVO, 1)
        # dt no llega a ponCam(): se guarda el del cuadro
        t = t.replace("function ponCam(){",
                      "let fovSuave = 72, dt0 = .016;   /* el dt del cuadro, que ponCam no recibe */\n"
                      "function ponCam(){", 1)
        t = t.replace("    if (!enDlg) fisica(dt);",
                      "    dt0 = dt;\n    if (!enDlg) fisica(dt);", 1)
        msgs.append('fov')
    else:
        msgs.append('fov NO')

    # --- 4) el rotulo de CORRER pasa al indicador --------------------------
    t = t.replace("  $('bCorre').classList.toggle('on', corre);",
                  "  $('bCorre').classList.toggle('on', corre);\n"
                  "  $('corriendo').classList.toggle('on', corre);")
    t = t.replace("    $('bCorre').classList.toggle('on', corre);",
                  "    $('bCorre').classList.toggle('on', corre);\n"
                  "    $('corriendo').classList.toggle('on', corre);")
    t = t.replace("$('bCorre').classList.add('on'); }",
                  "$('bCorre').classList.add('on'); $('corriendo').classList.add('on'); }")
    t = t.replace("$('bCorre').classList.remove('on'); }",
                  "$('bCorre').classList.remove('on'); $('corriendo').classList.remove('on'); }")
    t = t.replace("    corre = false; $('bCorre').classList.remove('on');",
                  "    corre = false; $('bCorre').classList.remove('on');\n"
                  "    $('corriendo').classList.remove('on');")
    t = t.replace("  $('bCorre').textContent = Tx('correr');",
                  "  $('bCorre').textContent = Tx('correr');\n"
                  "  $('corriendo').textContent = '» ' + Tx('correr');")
    msgs.append('rotulo')

    # --- 5) los iconos de los botones de arriba ----------------------------
    #     MENU alargado no cabe en 46x46: va el glifo de pausa
    t = t.replace('<div class="b" id="bMenu">MENÚ</div>',
                  '<div class="b" id="bMenu" aria-label="menu">II</div>')
    t = t.replace('<div class="b" id="bMenu">MENU</div>',
                  '<div class="b" id="bMenu" aria-label="menu">II</div>')
    t = t.replace("  $('bMenu').textContent = Tx('menu');", "")
    msgs.append('iconos')
    return t, 'hud[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
