#!/usr/bin/env python3
# Campo_de_Tiro.html = base.html + block.js (el nivel + arma + postura) + ediciones por ancla.
#
# NOTA DE PROCEDENCIA (17-Ago, reconstruccion):
#   El upload original 781c68a5-base.html y el scratchpad entero se perdieron al reciclarse el
#   contenedor. base.html de aca es el HTML generado del commit 4d4ec82 (el ultimo publicado) con
#   el bloque del campo de tiro sacado y reemplazado por el marcador /*__BLOQUE_TIRO__*/.
#   O sea: base.html == juego completo MENOS block.js. Con block.js sin tocar, este script
#   reproduce 4d4ec82 byte a byte (verificado). Las ediciones nuevas van abajo, en rep()/cut().
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'base.html')
BLK  = os.path.join(HERE, 'block.js')
DST  = '/home/user/General-Assets-Games/juegos-pc/Campo_de_Tiro.html'
MARK = '/*__BLOQUE_TIRO__*/\n'

s   = open(SRC, encoding='utf-8').read()
blk = open(BLK, encoding='utf-8').read()
N   = [0]


def rep(old, new, cnt=1):
    global s
    if s.count(old) != cnt:
        print('FALLA ancla (%d != %d): %r' % (s.count(old), cnt, old[:120])); sys.exit(1)
    N[0] += 1
    s = s.replace(old, new)


def cut(a, b, new='', keep_b=True):
    """borra desde el ancla a hasta el ancla b (b se conserva si keep_b)"""
    global s
    i = s.find(a); j = s.find(b, i + 1)
    if i < 0 or j < 0:
        print('FALLA cut: %r / %r' % (a[:70], b[:70])); sys.exit(1)
    N[0] += 1
    s = s[:i] + new + (s[j:] if keep_b else s[j + len(b):])


# ===================== 1) el nivel (bloque completo) =====================
rep(MARK, blk.rstrip() + '\n\n')

# ===================== 2) ediciones por ancla fuera del bloque =====================

# --- 2a) LA DESLIZADA VUELVE A 1a PERSONA -------------------------------------------------
# Se habia mandado a 3a persona porque el clip de slide tiraba la cabeza adelante de los hombros y
# los antebrazos se metian dentro del recorte. Con la mascara de tren superior eso ya no pasa: el
# torso no lo toca el clip, asi que la deslizada se ve desde adentro como corresponde.
rep("""  const tpTarget=(camView==='tp'||player.sliding)?1:0;   // deslizada → 3ª persona (y vuelve sola)""",
    """  const tpTarget=(camView==='tp')?1:0;   // la deslizada NO sale de 1ª persona (sólo el modo 'tp' manual)""")
rep("""    const want=TP_DIST*(player.sliding?0.66:1)*player.camTP;   // en la deslizada, la cámara va más cerca""",
    """    const want=TP_DIST*player.camTP;""")

# --- 2b) CAPTURA DE LA POSE DE REPOSO DEL TREN SUPERIOR ----------------------------------
# Tiene que correr con la jerarquia ya armada y ANTES del primer bodyMixer.update(): el callback
# del GLTFLoader es exactamente ese momento. Se captura del rig LOCAL, no de mpBodySrc.
rep("""  bodyHipsBind=bodyHips?bodyHips.position.clone():null;""",
    """  try{ mskCapturar(inner, gl.animations); }catch(e){ console.warn('mascara',e); }   // pose de reposo del tren superior (15 huesos)
  bodyHipsBind=bodyHips?bodyHips.position.clone():null;""")

# --- 2c) LA CAMARA YA NO BAJA 20 CM AL DESLIZARSE ----------------------------------------
# Ese bajon existia porque el clip acostaba el torso y habia que seguirlo. Ahora el torso queda erguido
# y la cadera (animada) ya baja la cabeza sola: con -0,20 m extra la lente quedaba a la altura de los
# hombros y los brazos cruzaban por delante del recorte (laminas de piel en toda la pantalla).
rep("""  const targetLow = player.sliding ? 0.2 : 0;""",
    """  const targetLow = 0;   // la cadera animada ya baja la cabeza sola; bajar la lente ademas la dejaba a la altura del hombro""")

# (Probado y descartado: anclar la camara a player.pos en XZ y tomar del hueso solo la altura. Deja los
#  hombros descentrados respecto a la lente, _limitarArma corre el arma para dejar los agarres delante de
#  los hombros y el fusil se va contra el borde derecho de la ventana. La camara se queda EN la cabeza.)

# --- 2d) FUERA EL ESPEJO DEL CUERPO ------------------------------------------------------
# bodyInner.scale.x=-bodyScale (deslizada hacia la derecha / wallrun a la derecha) mete una escala
# NEGATIVA en un ancestro de todos los huesos. getWorldQuaternion() sobre una matriz reflejada
# devuelve una rotacion sin sentido, y de ahi salen el IK de los brazos y la orientacion del arma:
# ese es el fusil "de costado". El espejo era un detalle de las piernas; el arma vale mas.
rep("""  if(bodyInner){ const mir=(curAnim==='wallrun'&&player.wallrun>0)||(curAnim==='slide'&&player.slideRight); bodyInner.scale.x=mir?-bodyScale:bodyScale; }""",
    """  // NADA de espejo en el cuerpo local: una escala negativa en un ancestro rompe getWorldQuaternion()
  // y con eso el IK de los brazos y la orientación del arma (el fusil salía de costado al deslizarse).
  if(bodyInner && bodyInner.scale.x!==bodyScale) bodyInner.scale.x=bodyScale;""")

open(DST, 'w', encoding='utf-8').write(s)
print('ediciones:', N[0], '· bytes:', len(s), '→', DST)
