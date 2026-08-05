#!/usr/bin/env python3
"""RELIQUIA ADAPTADA A PC.

Este era el unico de los quince que en PC no se podia jugar como se juega en PC:
sus controles eran SOLO gesto —`pointerdown`/`pointerup` con un swipe de 18 px— y
no habia una sola tecla. Con raton hay que arrastrar para cambiar de carril, en un
juego de correr donde la decision dura dos decimas. Se comprobo leyendo el codigo:
el unico `keydown` que existia era el que desbloquea el audio.

Se le agrega lo que ya tienen los trece mundos, con la misma deteccion:

  · TECLAS: flechas o WASD para el carril, arriba/W/ESPACIO para saltar,
    abajo/S para deslizarse y clavarse, ESC para pausar y ESPACIO/ENTER para
    saltear la cinematica. Se reusan `doJump()` y `doSlide()`, que ya existian:
    las teclas entran por la misma puerta que el gesto, asi que no hay dos
    caminos que puedan desincronizarse.
  · UN CARTEL con esas teclas, abajo a la izquierda, que aparece SOLO en PC. Sin
    el, nadie se enteraria de que ahora hay teclado.
  · La deteccion es la de siempre: una tecla o el raton -> modo PC; un toque ->
    modo dedo; y la marca de "este aparato no tiene tactil" se decide una vez por
    lo que el aparato puede hacer y no por lo que se acaba de usar.
"""
import pathlib, sys

p = pathlib.Path('/home/user/mundos/assets/reliquia/reliquia.html')
s = p.read_text(encoding='utf-8')
o = s
err = []

# --------------------------------------------------------------- 1) el CSS
CSS = """  /* CARTEL DE TECLAS: solo en PC. Este juego era 100% gesto y en una computadora
     no habia manera de saber que ahora hay teclado. */
  #pcTec{ position:fixed; left:12px; bottom:12px; z-index:40; display:none;
    padding:9px 12px; border-radius:12px; background:rgba(10,14,8,.62);
    border:1px solid rgba(255,216,94,.34); color:#ffe9a8;
    font:800 12px/1.5 system-ui,sans-serif; letter-spacing:.04em;
    text-shadow:0 1px 6px rgba(0,0,0,.7); pointer-events:none; }
  body.pc #pcTec{ display:block; }
  body.pc.cine #pcTec, body.pc #pcTec.hide{ display:none; }
  #pcTec b{ color:#fff; }
"""
anc = "  #bPause{ position:absolute;"
if s.count(anc) == 1:
    s = s.replace(anc, CSS + anc, 1)
else:
    err.append('el css de bPause aparece %d veces' % s.count(anc))

anc = '    <div id="bPause">⏸</div>'
if s.count(anc) == 1:
    s = s.replace(anc, anc + '\n    <div id="pcTec"></div>', 1)
else:
    err.append('el div de bPause aparece %d veces' % s.count(anc))

# ------------------------------------------------- 2) las teclas y la deteccion
JS = """
/* ================= PC: TECLADO Y DETECCION =================
   El juego era SOLO gesto: un swipe de 18 px con pointerdown/pointerup y ni una
   tecla (el unico keydown que habia desbloqueaba el audio). Con raton eso obliga a
   ARRASTRAR para cambiar de carril, en un juego donde la decision dura dos
   decimas. Las teclas entran por las MISMAS puertas que el gesto —doJump() y
   doSlide() ya existian— asi que no hay dos caminos que puedan desincronizarse. */
const TECR = {
  es: ['<b>&#8592; &#8594;</b> o <b>A D</b> — carril',
       '<b>&#8593;</b> / <b>W</b> / <b>ESPACIO</b> — saltar',
       '<b>&#8595;</b> / <b>S</b> — deslizarse',
       '<b>ESC</b> — pausa'],
  en: ['<b>&#8592; &#8594;</b> or <b>A D</b> — lane',
       '<b>&#8593;</b> / <b>W</b> / <b>SPACE</b> — jump',
       '<b>&#8595;</b> / <b>S</b> — slide',
       '<b>ESC</b> — pause'],
  pt: ['<b>&#8592; &#8594;</b> ou <b>A D</b> — pista',
       '<b>&#8593;</b> / <b>W</b> / <b>ESPA&#199;O</b> — saltar',
       '<b>&#8595;</b> / <b>S</b> — deslizar',
       '<b>ESC</b> — pausa']
};
let ESPC = false;
function pintaTec(){
  const e = $id('pcTec');
  if (e) e.innerHTML = (TECR[LANG] || TECR.en).join('<br>');
}
function modoPC(v){
  if (ESPC === v) return;
  ESPC = v;
  document.body.classList.toggle('pc', v);
  if (v) pintaTec();
}
try {
  /* una vez, por lo que el aparato PUEDE hacer */
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) modoPC(true);
  if (window.matchMedia && matchMedia('(pointer:fine)').matches
      && !matchMedia('(pointer:coarse)').matches) modoPC(true);
} catch (e) {}
addEventListener('mousedown', e => { if (e.pointerType !== 'touch') modoPC(true); }, true);
addEventListener('touchstart', () => modoPC(false), { passive: true, capture: true });
addEventListener('keydown', e => {
  const c = e.code;
  if (/^(Key|Arrow|Space|Enter|Escape|Shift)/.test(c)) modoPC(true);
  if (APP === 'cine'){
    if (c === 'Space' || c === 'Enter' || c === 'Escape'){ cineT = Math.max(cineT, 3.9); e.preventDefault(); }
    return;
  }
  if (APP === 'pause'){
    if (c === 'Escape'){ APP = 'run'; $id('pauseScr').classList.add('hide'); e.preventDefault(); }
    return;
  }
  if (APP !== 'run') return;
  const carril = d => {
    const nl = THREE.MathUtils.clamp(R.lane + d, -1, 1);
    if (nl !== R.lane) S.swipe();
    R.lane = nl;
  };
  if (c === 'ArrowLeft' || c === 'KeyA'){ carril(-1); e.preventDefault(); }
  else if (c === 'ArrowRight' || c === 'KeyD'){ carril(1); e.preventDefault(); }
  else if (c === 'ArrowUp' || c === 'KeyW' || c === 'Space'){ doJump(); e.preventDefault(); }
  else if (c === 'ArrowDown' || c === 'KeyS'){ doSlide(); e.preventDefault(); }
  else if (c === 'Escape'){ APP = 'pause'; $id('pauseScr').classList.remove('hide'); e.preventDefault(); }
});
"""
anc = "/* ================= HUD power-ups ================= */"
if s.count(anc) == 1:
    s = s.replace(anc, JS + '\n' + anc, 1)
else:
    err.append('la seccion de power-ups aparece %d veces' % s.count(anc))

# ------------------------------------- 3) que el cartel siga el idioma elegido
A = "  if(typeof syncTogs==='function')syncTogs(); }"
B = ("  /* el cartel de teclas de PC tambien tiene idioma */\n"
     "  if(typeof pintaTec==='function')pintaTec();\n"
     "  if(typeof syncTogs==='function')syncTogs(); }")
if s.count(A) == 1:
    s = s.replace(A, B, 1)
else:
    err.append('el final de applyLang aparece %d veces' % s.count(A))

if err:
    print('\n'.join('  !! ' + e for e in err)); sys.exit(1)
p.write_text(s, encoding='utf-8')
print('  reliquia adaptada a PC (%+d bytes)' % (len(s) - len(o)))
