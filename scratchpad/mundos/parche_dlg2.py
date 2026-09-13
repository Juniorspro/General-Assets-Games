#!/usr/bin/env python3
"""DIALOGOS PARTIDOS EN PAGINAS. El problema: cada dialogo tiraba TODO el texto
en un solo cuadro, y como los textos de capitulo tienen cinco parrafos el cuadro
ocupaba media pantalla en medio de la cara y tapaba el paisaje.

Ahora:
  · el texto se PARTE por parrafo (linea en blanco) en paginas cortas;
  · SIGUIENTE pasa de pagina y solo cierra en la ultima, con el numero de pagina
    a la vista para que se entienda que hay mas;
  · la caja es CHICA y va ABAJO, con alto fijo, asi no salta de tamano entre
    paginas ni se come el paisaje;
  · el retrato queda al costado y no encima del texto.
Uso: python3 parche_dlg2.py [slug ...]"""
import re, sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

FN_NUEVO = r"""/* el texto se PARTE EN PAGINAS por parrafo: antes entraba entero en un solo
   cuadro que ocupaba media pantalla en medio de la cara. Cada pagina se escribe
   letra por letra; SIGUIENTE completa si esta escribiendo, pasa de pagina si
   quedan, y recien cierra en la ultima. */
let _dlgTim = null, _dlgFull = '', _dlgPags = [], _dlgP = 0, _dlgCerrar = null;
function _dlgPinta(){
  const txt = _dlgPags[_dlgP] || '';
  if (_dlgTim) clearInterval(_dlgTim);
  _dlgFull = txt;
  let i = 0;
  $('dlgB').textContent = '';
  _dlgTim = setInterval(() => {
    i += 2;
    $('dlgB').textContent = _dlgFull.slice(0, i);
    if (i >= _dlgFull.length){ clearInterval(_dlgTim); _dlgTim = null; }
  }, 16);
  const hay = _dlgPags.length > 1;
  $('dlgPag').textContent = hay ? (_dlgP + 1) + '/' + _dlgPags.length : '';
  $('dlgGo').textContent = (_dlgP < _dlgPags.length - 1) ? Tx('dlgMas') : Tx('dlgGo');
}
function dialogo(titulo, cuerpo, alCerrar, cara, retrato){
  enDlg = true;
  $('dlgT').textContent = titulo;
  const img = $('dlgFoto'), cv = $('dlgCara');
  if (retrato){
    img.src = retrato; img.classList.add('on'); cv.classList.remove('on');
  } else if (cara){
    const g = cv.getContext('2d');
    g.clearRect(0, 0, 192, 256);
    g.save(); g.translate(0, 24); cara(g, 192); g.restore();
    cv.classList.add('on'); img.classList.remove('on');
  } else { cv.classList.remove('on'); img.classList.remove('on'); }
  /* partir por parrafo; si un parrafo es larguisimo se corta por oracion */
  _dlgPags = [];
  for (const par of String(cuerpo).split(/\n\s*\n/)){
    const p = par.trim();
    if (!p) continue;
    if (p.length <= 185){ _dlgPags.push(p); continue; }
    let acc = '';
    for (const or of p.split(/(?<=[.!?»])\s+/)){
      if ((acc + ' ' + or).trim().length > 185 && acc){ _dlgPags.push(acc.trim()); acc = or; }
      else acc = (acc + ' ' + or).trim();
    }
    if (acc) _dlgPags.push(acc);
  }
  if (!_dlgPags.length) _dlgPags = [''];
  _dlgP = 0; _dlgCerrar = alCerrar || null;
  _dlgPinta();
  $('dlg').classList.add('on');
  document.body.classList.add('hablando');
  $('dlgGo').onclick = () => {
    if (_dlgTim){                                  /* escribiendo: completar */
      clearInterval(_dlgTim); _dlgTim = null;
      $('dlgB').textContent = _dlgFull;
      return;
    }
    if (_dlgP < _dlgPags.length - 1){ _dlgP++; _dlgPinta(); return; }
    $('dlg').classList.remove('on');
    document.body.classList.remove('hablando');
    enDlg = false;
    const f = _dlgCerrar; _dlgCerrar = null;
    if (f) f();
  };
}"""

CSS_NUEVO = """  /* ---------------------- DIALOGO: CHICO Y ABAJO -------------------------
     Antes el globo crecia con el texto y un capitulo de cinco parrafos ocupaba
     media pantalla en medio de la cara. Ahora el texto va PARTIDO EN PAGINAS y
     la caja tiene alto FIJO y chico, pegada abajo: no salta entre paginas y
     deja ver el paisaje, que es de lo que se trata. */
  #dlg{position:absolute;left:50%;bottom:max(12px,3vh);transform:translateX(-50%);
    width:min(720px,94vw);display:none;pointer-events:auto;align-items:flex-end;gap:0}
  #dlg.on{display:flex}
  #dlgFoto,#dlgCara{width:min(104px,17vw);aspect-ratio:3/4;flex:0 0 auto;
    border-radius:10px 10px 4px 4px;border:1.5px solid @BD@;background:@BG@;
    display:none;object-fit:cover;object-position:50% 10%;
    box-shadow:0 8px 22px rgba(0,0,0,.55)}
  #dlgFoto.on,#dlgCara.on{display:block}
  #dlgGlobo{position:relative;flex:1 1 auto;min-width:0;margin-left:11px;
    background:@BG@;border:1.5px solid @BD@;border-radius:4px;
    padding:9px 13px 8px;backdrop-filter:blur(7px);
    box-shadow:0 8px 26px rgba(0,0,0,.5);display:flex;flex-direction:column}
  #dlgGlobo::before,#dlgGlobo::after{content:'';position:absolute;left:-10px;top:16px;
    width:0;height:0;border:10px solid transparent}
  #dlgGlobo::before{border-right-color:@BD@}
  #dlgGlobo::after{left:-8px;border-right-color:@BG@}
  #dlgT{font-weight:900;letter-spacing:.06em;color:@CT@;font-size:11.5px;margin-bottom:4px}
  /* ALTO FIJO: cuatro renglones. Lo que sobre queda en blanco, que es mejor que
     una caja que cambia de tamano en cada SIGUIENTE. */
  #dlgB{font-size:13.5px;line-height:1.42;color:@CB@;white-space:pre-wrap;
    height:5.7em;overflow:hidden;flex:0 0 auto}
  #dlgPie{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
  #dlgPag{font:800 10.5px ui-monospace,monospace;letter-spacing:.1em;color:@CT@;opacity:.65}
  #dlgGo{padding:7px 16px;border-radius:7px;font-weight:800;font-size:11.5px;
    letter-spacing:.08em;background:@GRAD@;border:1px solid @BG2@;cursor:pointer;
    white-space:nowrap}
  @media (max-height:430px){
    #dlgB{height:4.3em;font-size:12.5px}
    #dlgFoto,#dlgCara{width:min(86px,15vw)}
  }"""

HTML_NUEVO = """  <div id="dlg"><img id="dlgFoto" alt=""><canvas id="dlgCara" width="192" height="256"></canvas><div id="dlgGlobo"><div id="dlgT"></div><div id="dlgB"></div><div id="dlgPie"><div id="dlgPag"></div><div id="dlgGo">SIGUIENTE &#9656;</div></div></div></div>"""


def parche(t, slug):
    if '#dlgPie' in t:
        return t, 'dlg2(ya)'
    msgs = []
    mm = re.search(r"  /\* ------------------------- DIALOGO CON RETRATO -+.*?\n  \}\n", t, re.S)
    if not mm:
        return t, 'dlg2(css NO)'
    viejo = mm.group(0)
    col = {
        'BG': re.search(r"#dlgGlobo\{[^}]*background:(rgba\([^)]*\))", viejo),
        'BD': re.search(r"#dlgGlobo\{[^}]*border:1\.6px solid (rgba\([^)]*\))", viejo),
        'CT': re.search(r"#dlgT\{[^}]*color:(#[0-9a-fA-F]{6})", viejo),
        'CB': re.search(r"#dlgB\{[^}]*color:(#[0-9a-fA-F]{6})", viejo),
        'GRAD': re.search(r"#dlgGo\{[^}]*background:(linear-gradient\([^)]*\))", viejo, re.S),
        'BG2': re.search(r"#dlgGo\{[^}]*border:1px solid (#[0-9a-fA-F]{6})", viejo, re.S),
    }
    falta = [k for k, v in col.items() if not v]
    if falta:
        return t, 'dlg2(color %s)' % ','.join(falta)
    css = CSS_NUEVO
    for k, v in col.items():
        css = css.replace('@%s@' % k, v.group(1))
    t = t.replace(viejo, css + '\n', 1)
    msgs.append('css')
    mh = re.search(r'  <div id="dlg"><img id="dlgFoto".*?</div></div>\n', t, re.S)
    if not mh:
        return t, 'dlg2[%s] html NO' % '+'.join(msgs)
    t = t[:mh.start()] + HTML_NUEVO + '\n' + t[mh.end():]
    msgs.append('html')
    mf = re.search(r"/\* el texto se escribe LETRA POR LETRA.*?\n\}\n", t, re.S)
    if not mf:
        return t, 'dlg2[%s] fn NO' % '+'.join(msgs)
    t = t[:mf.start()] + FN_NUEVO + '\n' + t[mf.end():]
    msgs.append('fn')
    for a, b in (("dlgGo: 'SIGUIENTE ▸'", "dlgGo: 'CERRAR ▸', dlgMas: 'SIGUIENTE ▸'"),
                 ("dlgGo: 'NEXT ▸'", "dlgGo: 'CLOSE ▸', dlgMas: 'NEXT ▸'"),
                 ("dlgGo: 'SEGUINTE ▸'", "dlgGo: 'FECHAR ▸', dlgMas: 'SEGUINTE ▸'")):
        if a in t:
            t = t.replace(a, b, 1)
    msgs.append('txt')
    return t, 'dlg2[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
