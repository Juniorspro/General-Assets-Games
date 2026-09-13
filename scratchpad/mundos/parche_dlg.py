#!/usr/bin/env python3
"""DIALOGO nuevo para los 8 mundos: el RETRATO GENERADO a la izquierda y, saliendo
de el, un GLOBO DE TEXTO CUADRADO con lo que dice el NPC y el boton SIGUIENTE.
El texto se escribe letra por letra (y el boton lo completa de golpe).
Uso: python3 parche_dlg.py [slug ...]"""
import re, sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

# el bloque viejo, con los colores de CADA mundo como grupos: hay que
# conservarlos, si no los 8 dialogos quedan color desierto.
CSS_RX = re.compile(
    r"  #dlg\{position:absolute;left:50%;bottom:8%;[^\n]*\n"
    r"    background:(?P<bg>rgba\([^)]*\));border:1px solid (?P<bd>rgba\([^)]*\));[^\n]*\n"
    r"[^\n]*\n"
    r"  #dlg\.on\{display:block\}\n"
    r"  #dlgT\{[^\n]*color:(?P<ct>#[0-9a-fA-F]{6})[^\n]*\n"
    r"  #dlgB\{[^\n]*color:(?P<cb>#[0-9a-fA-F]{6})[^\n]*\n"
    r"  #dlgGo\{[^\n]*\n"
    r"    background:(?P<grad>linear-gradient\([^)]*\));border:1px solid (?P<bg2>#[0-9a-fA-F]{6})[^\n]*\n")

CSS_NUEVO = """  /* ------------------------- DIALOGO CON RETRATO --------------------------
     El RETRATO GENERADO va a la IZQUIERDA, pegado al piso de la pantalla, y de
     el sale un GLOBO CUADRADO con lo que dice el personaje. En apaisado van
     lado a lado; en pantallas angostas el globo se mete abajo del retrato pero
     el pico sigue apuntando a la cara. */
  #dlg{position:absolute;left:50%;bottom:5.5%;transform:translateX(-50%);
    width:min(700px,95vw);display:none;pointer-events:auto;
    align-items:flex-end;gap:0}
  #dlg.on{display:flex}
  /* el retrato: imagen generada, recortada de abajo con un degrade para que
     no quede el corte duro del PNG contra el paisaje */
  #dlgFoto{width:min(150px,26vw);aspect-ratio:3/4;flex:0 0 auto;object-fit:cover;
    object-position:50% 12%;border-radius:14px 14px 6px 6px;
    border:1.5px solid @BD@;
    box-shadow:0 10px 28px rgba(0,0,0,.6);background:@BG@;display:none}
  #dlgFoto.on{display:block}
  #dlgCara{width:min(150px,26vw);aspect-ratio:3/4;flex:0 0 auto;border-radius:14px 14px 6px 6px;
    border:1.5px solid @BD@;background:@BG@;display:none;
    box-shadow:0 10px 28px rgba(0,0,0,.6);object-fit:cover}
  #dlgCara.on{display:block}
  /* EL GLOBO: cuadrado, con el pico apuntando al retrato */
  #dlgGlobo{position:relative;flex:1 1 auto;min-width:0;margin-left:14px;
    background:@BG@;border:1.6px solid @BD@;
    border-radius:4px;padding:13px 15px 11px;backdrop-filter:blur(7px);
    box-shadow:0 10px 30px rgba(0,0,0,.55)}
  /* el pico: dos triangulos superpuestos (borde + relleno) */
  #dlgGlobo::before,#dlgGlobo::after{content:'';position:absolute;left:-11px;top:22px;
    width:0;height:0;border:11px solid transparent}
  #dlgGlobo::before{border-right-color:@BD@}
  #dlgGlobo::after{left:-9px;border-right-color:@BG@}
  #dlgT{font-weight:900;letter-spacing:.06em;color:@CT@;font-size:12.5px;margin-bottom:6px}
  #dlgB{font-size:14.5px;line-height:1.5;color:@CB@;white-space:pre-wrap;min-height:3.6em}
  #dlgGo{margin-top:10px;margin-left:auto;width:fit-content;padding:9px 20px;border-radius:8px;
    font-weight:800;font-size:12.5px;letter-spacing:.08em;
    background:@GRAD@;border:1px solid @BG2@;cursor:pointer}
  @media (max-aspect-ratio:1/1){
    #dlg{flex-wrap:wrap;width:min(560px,96vw)}
    #dlgGlobo{flex-basis:100%;margin:-6px 0 0 22px}
    #dlgGlobo::before,#dlgGlobo::after{left:26px;top:-11px;border-right-color:transparent}
    #dlgGlobo::before{border-bottom-color:@BD@}
    #dlgGlobo::after{left:28px;top:-9px;border-bottom-color:@BG@}
  }"""

HTML_VIEJO = """  <div id="dlg"><div id="dlgFila"><canvas id="dlgCara" width="96" height="96"></canvas><div style="flex:1;min-width:0"><div id="dlgT"></div><div id="dlgB"></div></div></div><div id="dlgGo">SEGUIR ▸</div></div>"""

HTML_NUEVO = """  <div id="dlg"><img id="dlgFoto" alt=""><canvas id="dlgCara" width="192" height="256"></canvas><div id="dlgGlobo"><div id="dlgT"></div><div id="dlgB"></div><div id="dlgGo">SIGUIENTE ▸</div></div></div>"""

FN_VIEJO = """function dialogo(titulo, cuerpo, alCerrar, cara){
  enDlg = true;
  $('dlgT').textContent = titulo;
  $('dlgB').textContent = cuerpo;
  /* si habla un PERSONAJE, su retrato se pinta al vuelo (canvas) */
  const cv = $('dlgCara');
  if (cara){
    const g = cv.getContext('2d');
    g.clearRect(0, 0, 96, 96);
    cara(g, 96);
    cv.classList.add('on');
  } else cv.classList.remove('on');
  $('dlg').classList.add('on');
  $('dlgGo').onclick = () => {
    $('dlg').classList.remove('on');
    enDlg = false;
    if (alCerrar) alCerrar();
  };
}"""

FN_NUEVO = """/* el texto se escribe LETRA POR LETRA; el boton, si todavia esta escribiendo,
   lo completa de golpe en vez de cerrar (asi nadie se pierde una linea). */
let _dlgTim = null, _dlgFull = '';
function dialogo(titulo, cuerpo, alCerrar, cara, retrato){
  enDlg = true;
  $('dlgT').textContent = titulo;
  /* RETRATO: si el personaje tiene imagen generada va esa; si no, la carita
     pintada a mano en canvas (los bichos y los perros no tienen retrato) */
  const img = $('dlgFoto'), cv = $('dlgCara');
  if (retrato){
    img.src = retrato; img.classList.add('on'); cv.classList.remove('on');
  } else if (cara){
    const g = cv.getContext('2d');
    g.clearRect(0, 0, 192, 256);
    /* la carita se pinto para un cuadrado: se centra arriba en el retrato 3:4 */
    g.save(); g.translate(0, 24); cara(g, 192); g.restore();
    cv.classList.add('on'); img.classList.remove('on');
  } else { cv.classList.remove('on'); img.classList.remove('on'); }
  /* maquina de escribir */
  if (_dlgTim) clearInterval(_dlgTim);
  _dlgFull = cuerpo; let i = 0;
  $('dlgB').textContent = '';
  _dlgTim = setInterval(() => {
    i += 2;
    $('dlgB').textContent = _dlgFull.slice(0, i);
    if (i >= _dlgFull.length){ clearInterval(_dlgTim); _dlgTim = null; }
  }, 18);
  $('dlg').classList.add('on');
  $('dlgGo').onclick = () => {
    if (_dlgTim){                                  /* todavia escribiendo: completar */
      clearInterval(_dlgTim); _dlgTim = null;
      $('dlgB').textContent = _dlgFull;
      return;
    }
    $('dlg').classList.remove('on');
    enDlg = false;
    if (alCerrar) alCerrar();
  };
}"""


def parche(t):
    msgs = []
    if '#dlgGlobo' in t:
        return t, 'dlg(ya)'
    m = CSS_RX.search(t)
    if not m:
        msgs.append('css NO')
    else:
        g = m.groupdict()
        css = CSS_NUEVO
        for k, tag in (('bg', '@BG@'), ('bd', '@BD@'), ('ct', '@CT@'),
                       ('cb', '@CB@'), ('grad', '@GRAD@'), ('bg2', '@BG2@')):
            css = css.replace(tag, g[k])
        t = t[:m.start()] + css + '\n' + t[m.end():]
        msgs.append('css')
    for nom, viejo, nuevo in (('html', HTML_VIEJO, HTML_NUEVO), ('fn', FN_VIEJO, FN_NUEVO)):
        if viejo not in t:
            msgs.append(nom + ' NO')
        else:
            t = t.replace(viejo, nuevo, 1); msgs.append(nom)
    # hablaNPC pasa el retrato del NPC
    t = t.replace("  dialogo(npc.nombre, txt, npc.alHablar || null, npc.cara);",
                  "  dialogo(npc.nombre, txt, npc.alHablar || null, npc.cara, npc.retrato);")
    return t, 'dlg[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, m = parche(t)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {m}')


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
