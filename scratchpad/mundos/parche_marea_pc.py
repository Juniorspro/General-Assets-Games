#!/usr/bin/env python3
"""MAREA ADAPTADA A PC.

El juego YA se manejaba con teclado —A/D o flechas para el rumbo, W/arriba/espacio
o shift para el gas— y con el raton. Lo que no hacia era DARSE CUENTA: dibujaba los
tres botones tactiles (◀ ▶ GAS) siempre, en el medio de la pantalla, incluso en una
computadora donde nunca se van a tocar. Y como no los explicaba, en PC no habia
manera de enterarse de que el teclado servia.

Se le pone la misma deteccion que a los trece mundos, ni una linea distinta:

  · una tecla o el raton -> MODO PC: se apagan los botones tactiles y aparece,
    abajo a la izquierda, el cartel de teclas;
  · un toque de dedo -> vuelven los botones;
  · y la marca de "este aparato no tiene tactil" se decide UNA vez por lo que el
    aparato puede hacer (`ontouchstart` / `maxTouchPoints` / `pointer:fine`), no
    por lo que se acaba de usar, asi que una computadora de escritorio arranca ya
    en modo PC sin tener que tocar nada.

El cartel se dibuja en el mismo canvas del juego (no hay DOM para el HUD) y con las
mismas coordenadas logicas de 960x540 que usa el resto del HUD, asi que aguanta el
giro de pantalla y el escalado igual que los botones que reemplaza.
"""
import pathlib, sys

p = pathlib.Path('/home/user/mundos/assets/g3/marea.html')
s = p.read_text(encoding='utf-8')
o = s
err = []

# ------------------------------------------------------- 1) la deteccion
DET = """
/* -------- PC o dedo: se detecta, no se supone --------
   El juego ya andaba con teclado y raton; lo que faltaba era darse cuenta para
   no dibujar los botones tactiles encima del agua y para decir que teclas hay.
   La marca de "sin tactil" se decide por lo que el aparato PUEDE hacer, una sola
   vez, y no por lo que se acabo de usar. */
let ES_PC = false;
function modoPC(v){ ES_PC = v; }
try {
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) modoPC(true);
  if (window.matchMedia && matchMedia('(pointer:fine)').matches
      && !matchMedia('(pointer:coarse)').matches) modoPC(true);
} catch (e) {}
addEventListener('keydown', e => { if (/^(Key|Arrow|Shift|Space|Enter)/.test(e.code)) modoPC(true); }, true);
addEventListener('mousedown', e => { if (e.pointerType !== 'touch') modoPC(true); }, true);
addEventListener('touchstart', () => modoPC(false), { passive: true, capture: true });
"""
anc = "/* -------- botones -------- */"
if s.count(anc) == 1:
    s = s.replace(anc, DET + '\n' + anc, 1)
else:
    err.append('la seccion de botones aparece %d veces' % s.count(anc))

# ------------------------------------- 2) los botones tactiles solo si hace falta
A = "  if (pad) pad.draw(g, '#2fd1e0');"
B = """  /* EN PC no se dibujan los botones tactiles —no se pueden tocar y tapan el
     agua— y en su lugar va el cartel de teclas, que es la unica manera de
     enterarse de que el teclado sirve. */
  if (pad && !ES_PC) pad.draw(g, '#2fd1e0');
  else if (ES_PC) teclasPC(g);"""
if s.count(A) == 1:
    s = s.replace(A, B, 1)
else:
    err.append('el dibujado del pad aparece %d veces' % s.count(A))

# --------------------------------------------------- 3) el cartel de teclas
CARTEL = """
/* el cartel de teclas de PC: mismo canvas y mismas coordenadas logicas de
   960x540 que el resto del HUD, asi que aguanta el giro de pantalla y el
   escalado igual que los botones que reemplaza. Se traduce con la misma tabla. */
const TEC = { es: ['A D  o  \\u2190 \\u2192   girar', 'W / ESPACIO   gas', 'ESC / \\u275a\\u275a   pausa'],
              en: ['A D  or  \\u2190 \\u2192   steer', 'W / SPACE   throttle', 'ESC / \\u275a\\u275a   pause'],
              pt: ['A D  ou  \\u2190 \\u2192   virar', 'W / ESPA\\u00c7O   acelerador', 'ESC / \\u275a\\u275a   pausa'] };
function teclasPC(g){
  const L = TEC[window.LANG] || TEC.en;
  const x = 34, y = 430, w = 260, h = 92;
  g.fillStyle = 'rgba(6,20,28,.5)';
  g.strokeStyle = 'rgba(120,220,240,.34)';
  g.lineWidth = 2;
  g.beginPath();
  const r = 12;
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.fill(); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#cfeaf2';
  g.font = '800 17px system-ui';
  for (let i = 0; i < L.length; i++) g.fillText(L[i], x + 16, y + 24 + i * 24);
  g.textBaseline = 'alphabetic';
}
"""
anc2 = "let menuA = 0;"
if s.count(anc2) == 1:
    s = s.replace(anc2, CARTEL + '\n' + anc2, 1)
else:
    err.append('el arranque del atractor aparece %d veces' % s.count(anc2))

# ------------------------------------------- 4) ESC pausa, que en PC es lo natural
A = "addEventListener('keydown', e => { if (GAME.key) GAME.key(e.code, true); });"
B = ("addEventListener('keydown', e => { if (GAME.key) GAME.key(e.code, true);\n"
     "  /* en PC la pausa es ESC: el boton de pausa esta arriba a la derecha y con\n"
     "     raton hay que ir a buscarlo en medio de una carrera */\n"
     "  if (e.code === 'Escape' && window.ARC_pause) window.ARC_pause(); });")
if s.count(A) == 1:
    s = s.replace(A, B, 1)
else:
    err.append('el keydown global aparece %d veces' % s.count(A))

if err:
    print('\n'.join('  !! ' + e for e in err)); sys.exit(1)
p.write_text(s, encoding='utf-8')
print('  marea adaptada a PC (%+d bytes)' % (len(s) - len(o)))
