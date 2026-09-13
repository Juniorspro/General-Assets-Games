#!/usr/bin/env python3
"""LOS CINCO VIEJOS, CON LA MISMA INTERFAZ QUE LOS OCHO NUEVOS.

senda, marte, luna, exo y hielo se quedaron con la interfaz de antes, y en una
captura al lado de los otros ocho salta a la vista:

  · NO TIENEN PALANCA DIBUJADA. Se mueven arrastrando el dedo por la mitad
    izquierda de la pantalla, sin nada que lo diga. En los ocho nuevos hay una
    palanca dibujada, con la trama del mundo, que se ve y se entiende sin leer.
  · LOS BOTONES ESTAN EN LA COLUMNA DE LA DERECHA, apilados —USAR, sonido,
    CORRER, MENU—, justo lo que se pidio cambiar hace rato: que arriba se vean el
    de pausa, el de sonido y el de correr, y que abajo quede solo el de accion.
  · NO TIENEN SELLO DE BUILD en la linea de los fps, asi que no hay manera de
    distinguir «no entro el cambio» de «el navegador te dio la copia vieja». Es
    exactamente lo que paso: la captura no tenia sello y no se podia saber.

QUE SE HACE. Se les pone la palanca de los ocho —la misma, copiada de dunas, con
la trama de cada mundo— y los tres botones suben a la barra de arriba CON LOS
MISMOS IDS, asi que todos los enganches que ya existian siguen funcionando sin
tocarlos: lo que cambia es donde viven y como se ven, no que hacen. Abajo a la
derecha queda solo el boton redondo de USAR.

LO QUE NO SE LES PONE, y conviene decirlo: el boton de SALTO. Estos cinco no
tienen salto —no existen `aireY` ni `enAire` en su fisica— y un boton que no hace
nada es peor que no tenerlo. Sus mundos estan construidos sin salto a proposito.
"""
import pathlib, re, sys

A = pathlib.Path('/home/user/mundos/assets')
FUENTE = A / 'mundos/dunas.html'
DEST = [('senda/senda.html', 'senda', 'anillos', '#7fd8c8', '#c9f4ec', '⌘'),
        ('mundos/marte.html', 'marte', 'roca', '#f0a488', '#ffd8c8', '◎'),
        ('mundos/luna.html', 'luna', 'roca', '#c8d4e8', '#eef2ff', '☾'),
        ('mundos/exo.html', 'exo', 'hoja', '#9ff0d8', '#d8fff0', '❋'),
        ('mundos/hielo.html', 'hielo', 'marmol', '#a8d8f0', '#e0f4ff', '❄')]

# ------------------------------------------------- la palanca, tal cual de dunas
src = FUENTE.read_text(encoding='utf-8')
i = src.index('/* ========================= JOYSTICK DIBUJADO ')
j = src.index("const cv = $('gl');")
JOY = src[i:j].rstrip()
# el salto no va: estos cinco no tienen salto
JOY = re.sub(r"\n  /\* SALTO: tactil y con la barra espaciadora \*/\n"
             r"  const salta = e => \{[^\n]*\n"
             r"  \$\('bSalta'\)\.addEventListener\('pointerdown', salta\);", "", JOY)
# el indicador de "corriendo" no existe en estos cinco: se guarda
JOY = JOY.replace("    /* el boton CORRER ya no existe: lo decide la palanca o Shift */\n"
                  "    $('corriendo').classList.toggle('on', corre);\n"
                  "  $('corriendo').classList.toggle('on', corre);",
                  "    /* CORRER lo decide la palanca (o Shift): el boton de arriba solo se pinta */\n"
                  "    marcaCorre();")
JOY = JOY.replace("    corre = false; \n    $('corriendo').classList.remove('on');",
                  "    corre = false;\n    marcaCorre();")
assert 'corriendo' not in JOY, 'quedo una referencia al indicador que no existe'
assert 'bSalta' not in JOY, 'quedo una referencia al boton de salto'
MARCA = """/* CORRER se pinta en el boton de arriba: estos cinco no tienen el indicador
   `#corriendo` que tienen los ocho nuevos, y la palanca necesita avisar de algun
   modo que ya estas corriendo. */
function marcaCorre(){
  const e = document.getElementById('bCorre');
  if (e) e.classList.toggle('on', !!corre);
}
"""

CSS = """  /* ---- PALANCA DIBUJADA, igual que en los ocho mundos nuevos. Antes este mundo
       se movia arrastrando el dedo por la mitad izquierda de la pantalla, sin
       nada que lo dijera. ---- */
  #joy{position:absolute;left:max(14px,3.5vw);bottom:max(16px,5vh);
    width:min(150px,32vw);aspect-ratio:1;pointer-events:auto;touch-action:none;
    opacity:.9;transition:opacity .25s}
  #joy canvas{width:100%;height:100%;display:block}
  /* se esconde SOLO si el aparato no tiene tactil: escondiendola al detectar
     raton, un portatil tactil se quedaba sin ningun control a la vista. */
  body.sinTactil #joy{display:none}
  body.hablando #joy{opacity:0;pointer-events:none}
  /* ---- LA BARRA DE ARRIBA: sonido, correr y pausa. Estaban apilados en la
       columna de la derecha; arriba es donde se pidieron y donde no estorban al
       pulgar que juega. Abajo queda solo el boton de accion. ---- */
  #hudTop{position:absolute;right:max(10px,2.5vw);top:max(10px,2vh);display:flex;
    gap:8px;pointer-events:auto;z-index:6}
  #hudTop .bt{min-width:44px;height:44px;padding:0 10px;border-radius:12px;display:grid;
    place-items:center;font:900 15px/1 ui-sans-serif,system-ui,sans-serif;
    letter-spacing:.04em;cursor:pointer;background:rgba(0,0,0,.46);
    border:1.5px solid rgba(255,255,255,.28);color:#eaf2ff;backdrop-filter:blur(4px)}
  #hudTop .bt.ico{font-size:19px;padding:0}
  #hudTop .bt:active{transform:translateY(1px);filter:brightness(1.35)}
  #hudTop .bt.on{background:rgba(120,190,255,.32);border-color:rgba(255,255,255,.6);color:#fff}
"""

n = 0
for rel, slug, trama, aro, pal, glifo in DEST:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []
    if 'id="joy"' in s:
        print('  --', rel, 'ya'); continue

    # 1) el CSS, antes del de la ayuda de PC
    m = re.search(r"\n  #pcHelp\{", s)
    if m:
        s = s[:m.start() + 1] + CSS + s[m.start() + 1:]
    else:
        err.append('no encuentro #pcHelp para poner el css')

    # 2) el markup: barra de arriba + palanca, y el resto sale de #btns
    VA = re.search(r'  <div id="btns">\n(.*?)\n  </div>\n', s, re.S)
    if not VA:
        err.append('no encuentro el bloque de botones')
    else:
        s = (s[:VA.start()] +
             '  <div id="hudTop">\n'
             '    <div class="bt ico" id="bSon">\U0001f50a</div>\n'
             '    <div class="bt" id="bCorre">RUN</div>\n'
             '    <div class="bt ico" id="bMenu">☰</div>\n'
             '  </div>\n'
             '  <div id="btns">\n'
             '    <div class="b usar" id="bUsar">◉ USAR</div>\n'
             '  </div>\n'
             '  <div id="joy"><canvas width="300" height="300"></canvas></div>\n'
             + s[VA.end():])

    # 3) la palanca, antes del manejo del lienzo
    anc = "const cv = $('gl');"
    if s.count(anc) == 1:
        estilo = ("JOY.aro = '%s'; JOY.pal = '%s'; JOY.glifo = '%s'; JOY.trama = '%s';\n"
                  "joyDibuja();\n" % (aro, pal, glifo, trama))
        s = s.replace(anc, MARCA + '\n' + JOY + '\n' + estilo + '\n' + anc, 1)
    else:
        err.append('el lienzo aparece %d veces' % s.count(anc))

    # 4) el sello de build en la linea de los fps
    if 'const BUILD' not in s:
        m2 = re.search(r"\n(let|const) t0 = 0", s)
        if not m2:
            m2 = re.search(r"\nlet t0 = 0", s)
        if m2:
            s = (s[:m2.start() + 1] +
                 "/* SELLO DE BUILD. La linea de abajo dice con que version estas jugando, y es\n"
                 "   lo unico que distingue «no entro el cambio» de «el navegador te dio la copia\n"
                 "   vieja». Los ocho mundos nuevos lo tenian y estos cinco no. */\n"
                 "const BUILD = 'PENDIENTE';\n" + s[m2.start() + 1:])
        else:
            err.append('no encuentro donde declarar el sello')
        m3 = re.search(r"(\$\('fps'\)\.textContent = [^;]*?)(;)", s, re.S)
        if m3 and 'BUILD' not in m3.group(1):
            s = s[:m3.end(1)] + " + ' · b' + BUILD" + s[m3.end(1):]
        else:
            err.append('no encuentro la linea de los fps')

    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); continue
    if s == o:
        print('  %s: sin cambios' % rel); continue
    p.write_text(s, encoding='utf-8')
    n += 1
    print('  %s: palanca, barra de arriba y sello (%+d bytes)' % (rel, len(s) - len(o)))
print('%d de %d' % (n, len(DEST)))
sys.exit(0 if n == len(DEST) else 1)
