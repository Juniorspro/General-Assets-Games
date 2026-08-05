#!/usr/bin/env python3
"""CONTROLES TACTILES nuevos para los 8 mundos:
  · JOYSTICK VISIBLE dibujado en canvas, con estilo PROPIO de cada mundo (aro,
    color, textura y glifo distintos), no un area invisible como antes.
  · AUTO-CORRER: empujando la palanca del todo hacia ARRIBA arranca a correr
    sola (y se apaga al soltar o al aflojar).
  · BOTON DE SALTO, con fisica de salto de verdad (gravedad + aterrizaje).
Uso: python3 parche_control.py [slug ...]"""
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'

# estilo del joystick por mundo: (aro, palanca, glifo, trama)
#  trama: 'arena' rayas de duna · 'hoja' nervaduras · 'lava' grietas
#         'junco' burbujas · 'roca' estratos · 'viento' rafagas
#         'marmol' venas · 'anillo' anillos de tronco
EST = {
    'dunas':     ("#f0c088", "#ffe6c4", "≈", "arena"),
    'jungla':    ("#a8e07a", "#e6ffd0", "❦", "hoja"),
    'volcan':    ("#ff9a52", "#ffd9b0", "▲", "lava"),
    'pantano':   ("#7fd6c8", "#d6f5ee", "≋", "junco"),
    'canon':     ("#e8a068", "#ffdcb8", "⛰", "roca"),
    'estepa':    ("#c6d2e0", "#eef4fb", "➤", "viento"),
    'acropolis': ("#eae2cf", "#fffaf0", "◈", "marmol"),
    'secuoya':   ("#b7c99f", "#e8f2dc", "✦", "anillo"),
}

CSS = """
  /* ------------------------ JOYSTICK Y SALTO (TACTIL) ---------------------
     Antes el medio izquierdo de la pantalla era una zona invisible de arrastre:
     nadie sabia donde tocar. Ahora hay una PALANCA dibujada, con el estilo del
     mundo, y un boton de SALTO. La palanca del todo hacia ARRIBA = correr. */
  #joy{position:absolute;left:max(14px,3.5vw);bottom:max(16px,5vh);
    width:min(150px,32vw);aspect-ratio:1;pointer-events:auto;touch-action:none;
    opacity:.9;transition:opacity .25s}
  body.pc #joy,body.pc #bSalta{display:none}
  #joy canvas{width:100%;height:100%;display:block}
  #bSalta{position:absolute;right:max(14px,3.5vw);bottom:max(16px,5vh);
    width:min(84px,19vw);aspect-ratio:1;border-radius:50%;pointer-events:auto;
    touch-action:none;display:grid;place-items:center;font-weight:900;
    font-size:11px;letter-spacing:.1em;cursor:pointer;
    background:@JBG@;border:2px solid @ARO@;color:@PAL@;
    box-shadow:0 6px 20px rgba(0,0,0,.45);backdrop-filter:blur(3px)}
  #bSalta:active{transform:translateY(2px) scale(.96);filter:brightness(1.35)}
  #bSalta span{display:block;font-size:24px;line-height:1}"""

HTML = """  <div id="joy"><canvas width="300" height="300"></canvas></div>
  <div id="bSalta"><span>⤒</span>SALTO</div>
"""

JS = """
/* ========================= JOYSTICK DIBUJADO =============================
   Se dibuja en un canvas propio (no en el del juego) para no tocar el render:
   solo se repinta cuando la palanca se mueve. El estilo lo pone cada mundo. */
const JOY = { el: $('joy'), cv: null, g: null, x: 0, y: 0, act: false, id: -1,
  aro: '@ARO@', pal: '@PAL@', glifo: '@GLIFO@', trama: '@TRAMA@' };
JOY.cv = JOY.el.querySelector('canvas'); JOY.g = JOY.cv.getContext('2d');
function joyDibuja(){
  const g = JOY.g, N = 300, c = N / 2, R = N * .42;
  g.clearRect(0, 0, N, N);
  /* el aro: doble trazo con la trama del mundo por dentro */
  g.save();
  g.beginPath(); g.arc(c, c, R, 0, 6.2832);
  g.fillStyle = 'rgba(0,0,0,.34)'; g.fill();
  g.clip();
  joyTrama(g, N, c, R);
  g.restore();
  g.lineWidth = 6; g.strokeStyle = JOY.aro; g.globalAlpha = .78;
  g.beginPath(); g.arc(c, c, R, 0, 6.2832); g.stroke();
  g.lineWidth = 1.5; g.globalAlpha = .34;
  g.beginPath(); g.arc(c, c, R - 12, 0, 6.2832); g.stroke();
  g.globalAlpha = 1;
  /* la marca de AUTO-CORRER arriba: se prende cuando la palanca llega */
  const autoOn = JOY.act && -JOY.y > .80;
  g.save();
  g.globalAlpha = autoOn ? 1 : .3;
  g.strokeStyle = autoOn ? JOY.pal : JOY.aro; g.lineWidth = autoOn ? 7 : 4;
  g.beginPath(); g.arc(c, c, R - 3, -2.36, -0.78); g.stroke();
  g.restore();
  /* la palanca */
  const kx = c + JOY.x * (R - 34), ky = c + JOY.y * (R - 34), r = N * .155;
  g.beginPath(); g.arc(kx, ky + 4, r, 0, 6.2832);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
  const grd = g.createRadialGradient(kx - r * .3, ky - r * .4, r * .1, kx, ky, r);
  grd.addColorStop(0, JOY.pal); grd.addColorStop(1, JOY.aro);
  g.beginPath(); g.arc(kx, ky, r, 0, 6.2832); g.fillStyle = grd; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
  /* el glifo del mundo en la palanca */
  g.fillStyle = 'rgba(0,0,0,.55)'; g.font = '900 ' + Math.round(r * 1.05) + 'px system-ui';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(JOY.glifo, kx, ky + 1);
}
/* la TRAMA del fondo del aro: cada mundo tiene la suya */
function joyTrama(g, N, c, R){
  g.globalAlpha = .26; g.strokeStyle = JOY.aro; g.fillStyle = JOY.aro;
  const T = JOY.trama;
  if (T === 'arena' || T === 'viento'){                 /* rayas / rafagas */
    g.lineWidth = T === 'viento' ? 2 : 3.5;
    for (let i = -6; i <= 6; i++){
      g.beginPath();
      for (let k = 0; k <= 20; k++){
        const x = c - R + (k / 20) * R * 2;
        const y = c + i * 22 + Math.sin(k * .6 + i) * (T === 'viento' ? 9 : 4);
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  } else if (T === 'hoja'){                             /* nervaduras */
    g.lineWidth = 2.5;
    for (let i = 0; i < 9; i++){
      const a = i / 9 * 6.2832;
      g.beginPath(); g.moveTo(c, c);
      g.quadraticCurveTo(c + Math.cos(a) * R * .5 - Math.sin(a) * 26,
                         c + Math.sin(a) * R * .5 + Math.cos(a) * 26,
                         c + Math.cos(a) * R, c + Math.sin(a) * R);
      g.stroke();
    }
  } else if (T === 'lava'){                             /* grietas */
    g.lineWidth = 3;
    for (let i = 0; i < 7; i++){
      const a = i / 7 * 6.2832;
      g.beginPath(); g.moveTo(c, c);
      let x = c, y = c;
      for (let k = 0; k < 5; k++){
        x += Math.cos(a + Math.sin(k * 2.3 + i) * .7) * R / 5;
        y += Math.sin(a + Math.sin(k * 2.3 + i) * .7) * R / 5;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  } else if (T === 'junco'){                            /* burbujas */
    for (let i = 0; i < 26; i++){
      const a = i * 2.399, rr = R * Math.sqrt(i / 26) * .93;
      g.beginPath(); g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr,
        3 + (i % 4) * 2.2, 0, 6.2832); g.fill();
    }
  } else if (T === 'roca' || T === 'marmol'){           /* estratos / venas */
    g.lineWidth = T === 'marmol' ? 1.8 : 5;
    for (let i = -5; i <= 5; i++){
      g.beginPath();
      for (let k = 0; k <= 24; k++){
        const x = c - R + (k / 24) * R * 2;
        const y = c + i * 25 + (T === 'marmol'
          ? Math.sin(k * 1.1 + i * 2) * 14 : Math.sin(k * .35 + i) * 3);
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  } else {                                              /* anillos de tronco */
    g.lineWidth = 2.4;
    for (let i = 1; i <= 8; i++){
      g.beginPath();
      for (let k = 0; k <= 40; k++){
        const a = k / 40 * 6.2832, rr = R * i / 8.6 * (1 + Math.sin(a * 3 + i) * .06);
        const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  }
  g.globalAlpha = 1;
}
joyDibuja();
{
  const R = () => JOY.el.getBoundingClientRect();
  const mueve = e => {
    const b = R(), c = b.width / 2;
    let dx = (e.clientX - b.left - c) / (c * .78), dy = (e.clientY - b.top - c) / (c * .78);
    const d = Math.hypot(dx, dy); if (d > 1){ dx /= d; dy /= d; }
    JOY.x = dx; JOY.y = dy;
    movV.x = dx; movV.y = dy;
    /* AUTO-CORRER: palanca del todo hacia ARRIBA (y con poco desvio lateral) */
    const arriba = -dy, lateral = Math.abs(dx);
    corre = arriba > .80 && lateral < .62;
    $('bCorre').classList.toggle('on', corre);
    joyDibuja();
  };
  JOY.el.addEventListener('pointerdown', e => {
    e.preventDefault(); JOY.act = true; JOY.id = e.pointerId;
    JOY.el.setPointerCapture(e.pointerId); JOY.el.style.opacity = '1'; mueve(e);
  });
  JOY.el.addEventListener('pointermove', e => { if (JOY.act && e.pointerId === JOY.id) mueve(e); });
  const suelta = e => {
    if (!JOY.act || e.pointerId !== JOY.id) return;
    JOY.act = false; JOY.id = -1; JOY.x = JOY.y = 0; movV.x = movV.y = 0;
    corre = false; $('bCorre').classList.remove('on');
    JOY.el.style.opacity = '.9'; joyDibuja();
  };
  JOY.el.addEventListener('pointerup', suelta);
  JOY.el.addEventListener('pointercancel', suelta);
  /* SALTO: tactil y con la barra espaciadora */
  const salta = e => { if (e) e.preventDefault(); if (fase === 'juego' && !enDlg) saltar(); };
  $('bSalta').addEventListener('pointerdown', salta);
}
"""

# --- fisica del salto -------------------------------------------------------
SALTO_VIEJO = """const PEND_MAX = 0.80;   /* ~39 grados: mas empinado que esto no se sube */
let ojoY = null;         /* altura del ojo interpolada (sin saltos) */"""
SALTO_NUEVO = """const PEND_MAX = 0.80;   /* ~39 grados: mas empinado que esto no se sube */
let ojoY = null;         /* altura del ojo interpolada (sin saltos) */
/* SALTO: altura fija (los saltos de altura variable dejaban repisas
   inalcanzables), gravedad fuerte para que no se sienta lunar. */
const GRAV = 22, SALTO_V = 8.2;
let aireY = 0, aireV = 0, enAire = false;
function saltar(){ if (enAire) return; enAire = true; aireV = SALTO_V; }"""

# el suelo del ojo/cuerpo suma la altura del salto
AIRE_TICK = """  /* el SALTO vive sobre la altura del suelo: se integra aparte y se suma, asi
     el tope de pendiente y el suavizado del ojo siguen valiendo. */
  if (enAire){
    aireV -= GRAV * dt; aireY += aireV * dt;
    if (aireY <= 0){ aireY = 0; aireV = 0; enAire = false; }
  }
  bobF += dt"""


def parche(t, slug):
    if '#joy{' in t:
        return t, 'ctrl(ya)'
    aro, pal, glifo, trama = EST[slug]
    msgs = []
    # 1) CSS: se cuelga del bloque de #pcHelp (existe en los 8)
    ancla = "  /* ayuda de controles de PC: sale sola al detectar mouse/teclado */"
    css = (CSS.replace('@ARO@', aro).replace('@PAL@', pal)
              .replace('@JBG@', 'rgba(0,0,0,.42)'))
    if ancla in t:
        t = t.replace(ancla, css.strip('\n') + '\n' + ancla, 1); msgs.append('css')
    else:
        msgs.append('css NO')
    # 2) HTML: los dos controles, antes del medidor
    ancla2 = '  <div id="medidor">'
    if ancla2 in t:
        t = t.replace(ancla2, HTML + ancla2, 1); msgs.append('html')
    else:
        msgs.append('html NO')
    # 3) fisica del salto
    if SALTO_VIEJO in t:
        t = t.replace(SALTO_VIEJO, SALTO_NUEVO, 1); msgs.append('salto')
    else:
        msgs.append('salto NO')
    if '  bobF += dt' in t and 'if (enAire){' not in t:
        t = t.replace('  bobF += dt', AIRE_TICK, 1)
    # el ojo y el cuerpo suben con el salto
    t = t.replace("cam.position.set(ex, (ojoY != null ? ojoY : H(px, pz)) + OJO",
                  "cam.position.set(ex, (ojoY != null ? ojoY : H(px, pz)) + aireY + OJO", 1)
    t = t.replace("CUERPO.root.position.set(px, ojoY != null ? ojoY : H(px, pz), pz);",
                  "CUERPO.root.position.set(px, (ojoY != null ? ojoY : H(px, pz)) + aireY, pz);", 1)
    # 4) el JS del joystick, despues del handler de bMenu (ya definido movV/corre)
    ancla3 = "/* -------------------------- entrada táctil / teclado ----------------------- */"
    js = (JS.replace('@ARO@', aro).replace('@PAL@', pal)
            .replace('@GLIFO@', glifo).replace('@TRAMA@', trama))
    if ancla3 in t:
        t = t.replace(ancla3, ancla3 + js, 1); msgs.append('js')
    else:
        msgs.append('js NO')
    # 5) la barra espaciadora salta (teclado de PC)
    kd = "  if (c === 'KeyE') usarAccion();"
    if kd in t:
        t = t.replace(kd, "  if (c === 'Space' && fase === 'juego' && !enDlg){ e.preventDefault(); saltar(); }\n" + kd, 1)
        msgs.append('espacio')
    else:
        msgs.append('espacio NO')
    # 6) la ayuda de PC menciona el salto, en los 3 idiomas
    for a, b in (("cor: 'correr', usa: 'usar'", "cor: 'correr', usa: 'usar', sal: 'saltar'"),
                 ("cor: 'run', usa: 'use'", "cor: 'run', usa: 'use', sal: 'jump'"),
                 ("cor: 'correr', usa: 'usar', dlg: 'seguir' }\n};",
                  "cor: 'correr', usa: 'usar', sal: 'saltar', dlg: 'seguir' }\n};")):
        t = t.replace(a, b)
    t = t.replace("""    '<div class="row"><kbd>Shift</kbd> ' + d.cor + ' · <kbd>E</kbd> ' + d.usa + '</div>' +""",
                  """    '<div class="row"><kbd>Shift</kbd> ' + d.cor + ' · <kbd>E</kbd> ' + d.usa + '</div>' +
    '<div class="row"><kbd>Espacio</kbd> ' + (d.sal || 'saltar') + '</div>' +""", 1)
    return t, 'ctrl[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, m = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {m}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(EST))
