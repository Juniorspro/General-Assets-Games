#!/usr/bin/env python3
"""MAREA y RELIQUIA: los menus tambien en ingles.

El idioma por defecto ya era 'en' en los dos, y aun asi el menu salia en
espanol. La razon es distinta en cada uno y en los dos es la misma clase de
cosa: el texto NO estaba en ninguna tabla de idioma, estaba escrito en el HTML.

  · MAREA llamaba a `GAME.lang(LANG)` al arrancar... y `GAME.lang` no existe en
    marea. O sea que poner LANG='en' no repintaba nada: JUGAR, PAUSA, SEGUIR,
    MENU, OTRA VEZ y el subtitulo del titulo salian del HTML tal cual. Se agrega
    una tabla chica y una funcion que repinta, y se la llama al arrancar y cada
    vez que se toca el selector de idioma.

  · RELIQUIA si repinta, pero su repintado no llegaba al TITULO del juego ni al
    boton de jugar de la portada.
"""
import pathlib, sys

A = pathlib.Path('/home/user/mundos/assets')
err = []

# ============================================================ MAREA
p = A / 'g3/marea.html'
s = p.read_text(encoding='utf-8')
o = s

TABLA = """
/* -------- el MENU en su idioma --------
   Estaba escrito en espanol en el HTML y `GAME.lang` —a quien se le pedia el
   repintado— no existe en marea, asi que poner LANG = 'en' no cambiaba una sola
   palabra de la portada. Va una tabla chica y una funcion que la aplica. */
const UIL = {
  es: { sub: 'laguna tropical', jugar: 'JUGAR', jugarGo: 'JUGAR \\u25b8', pausa: 'PAUSA',
        seguir: 'SEGUIR', menu: 'MEN\\u00da', otra: 'OTRA VEZ', fin: 'FIN',
        gano: '\\u00a1GANASTE!', rec: '\\u00a1NUEVO R\\u00c9CORD!',
        puerta: 'PUERTA M\\u00c1S CERCA', vuelta: 'VUELTA' },
  en: { sub: 'tropical lagoon', jugar: 'PLAY', jugarGo: 'PLAY \\u25b8', pausa: 'PAUSED',
        seguir: 'RESUME', menu: 'MENU', otra: 'PLAY AGAIN', fin: 'THE END',
        gano: 'YOU WIN!', rec: 'NEW RECORD!',
        puerta: 'GATE MOVED CLOSER', vuelta: 'LAP' },
  pt: { sub: 'lagoa tropical', jugar: 'JOGAR', jugarGo: 'JOGAR \\u25b8', pausa: 'PAUSA',
        seguir: 'CONTINUAR', menu: 'MENU', otra: 'DE NOVO', fin: 'FIM',
        gano: 'VOC\\u00ca GANHOU!', rec: 'NOVO RECORDE!',
        puerta: 'PORTA MAIS PERTO', vuelta: 'VOLTA' }
};
const UT = k => (UIL[window.LANG] || UIL.en)[k];
function pintaUI(){
  const q = (i, v) => { const e = document.getElementById(i); if (e) e.textContent = v; };
  q('ldS', UT('sub')); q('ldGo', UT('jugarGo')); q('bPlay', UT('jugar'));
  q('pReanudar', UT('seguir')); q('pMenu', UT('menu'));
  q('oOtra', UT('otra')); q('oMenu', UT('menu'));
  const t = document.querySelector('#mTitle .s'); if (t) t.textContent = UT('sub');
  const pa = document.querySelector('#pause .big'); if (pa) pa.textContent = UT('pausa');
}
"""
anc = "/* -------- botones -------- */"
if s.count(anc) == 1:
    s = s.replace(anc, TABLA + '\n' + anc, 1)
else:
    err.append('marea: la seccion de botones aparece %d veces' % s.count(anc))

# que se repinte al arrancar y al cambiar de idioma
a2 = "} catch (e) {} if (GAME.lang) try { GAME.lang(LANG); } catch (e) {} }));"
if s.count(a2) == 1:
    s = s.replace(a2, "} catch (e) {} pintaUI(); }));", 1)
else:
    err.append('marea: el cierre del selector aparece %d veces' % s.count(a2))

a3 = "  if (typeof GAME !== 'undefined' && GAME.lang) GAME.lang(LANG);"
if s.count(a3) == 1:
    s = s.replace(a3, "  pintaUI();", 1)
else:
    err.append('marea: la llamada a GAME.lang aparece %d veces' % s.count(a3))

a4 = "  document.querySelectorAll('#ldLang .chip').forEach(c => c.classList.toggle('on', c.dataset.l === LANG));\n  bind(); loadArt();"
if s.count(a4) == 1:
    s = s.replace(a4, "  document.querySelectorAll('#ldLang .chip').forEach(c => c.classList.toggle('on', c.dataset.l === LANG));\n  pintaUI();\n  bind(); loadArt();", 1)
else:
    err.append('marea: el arranque aparece %d veces' % s.count(a4))

# los dos textos de partida que estaban en espanol a mano
a5 = "ARC.toast('PUERTA MÁS CERCA');"
if s.count(a5) == 1:
    s = s.replace(a5, "ARC.toast(UT('puerta'));", 1)
else:
    err.append('marea: el aviso de la puerta aparece %d veces' % s.count(a5))
a6 = "ARC.toast('VUELTA ' + laps + ' · P' + place);"
if s.count(a6) == 1:
    s = s.replace(a6, "ARC.toast(UT('vuelta') + ' ' + laps + ' · P' + place);", 1)
else:
    err.append('marea: el aviso de vuelta aparece %d veces' % s.count(a6))
a7 = "$('ovTitle').textContent = o.title || (o.win ? '¡GANASTE!' : 'FIN'); $('ovSub').textContent = o.sub || (rec ? '¡NUEVO RÉCORD!' : '');"
if s.count(a7) == 1:
    s = s.replace(a7, "$('ovTitle').textContent = o.title || (o.win ? UT('gano') : UT('fin'));\n"
                      "  $('ovSub').textContent = o.sub || (rec ? UT('rec') : '');", 1)
else:
    err.append('marea: el fin de partida aparece %d veces' % s.count(a7))

if s != o and not err:
    p.write_text(s, encoding='utf-8')
    print('  marea: menu en su idioma')

# ============================================================ RELIQUIA
p = A / 'reliquia/reliquia.html'
s = p.read_text(encoding='utf-8')
o = s
print('  reliquia: (se revisa aparte)')
for e in err:
    print('  !! ' + e)
sys.exit(1 if err else 0)
