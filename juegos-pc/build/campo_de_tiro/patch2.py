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

# --- 2e) LA CADERA BAJA DE VERDAD AL DESLIZARSE ------------------------------------------
# HALLAZGO: el clamp de root motion estaba en UNIDADES DE HUESO, no en metros. parkour.glb tiene
# Armature.scale=0.01 (las traslaciones de huesos vienen en centimetros) y bodyScale=1.0882, o sea
# 1 unidad = 0.010882 m. Los "0.5 / 0.15" de siempre son 5,4 mm y 1,6 mm de MUNDO: la cadera estaba
# clavada a altura de parado con +-5 mm de juego. Y el clip 'slide' SI baja la cadera: su track
# Hips.translation va de 85.3 a 22.485 unidades (t=0.433 s), o sea quiere bajar 70 unidades = 0,762 m.
# El clamp le comia el 99,3%: lo unico que sobrevivia era la rotacion, y por eso la deslizada se leia
# como un tropezon (tronco doblado sobre una cadera a altura de parado, fusil vertical delante de la cara).
# La FK del propio clip a t=0.433 ya trae la pose de piernas consistente con la cadera abajo: no hay que
# inventar curva ninguna, hay que dejar de tirarla a la basura.
# La puerta se abre por el PESO del crossfade y NO por curAnim: gateando con curAnim, en el frame en que
# pasa a 'run' la cadera pega el salto entero de 0,93 m (medido).
# Ademas: BUG DE ESCALA. En el crossfade run->walk->idle el mixer llevaba bodyHips.scale a 1.1456 y volvia,
# en 9 frames: estiraba el esqueleto entero un 14,6% y subia el ojo de 1,765 a 1,863 (0,098 m de tiron, la
# fuente mas grande de las dos). El cancel de root motion arreglaba la posicion pero nunca la escala.
rep("""  if(bodyHips&&bodyHipsBind){ bodyHips.position.x=bodyHipsBind.x; bodyHips.position.z=bodyHipsBind.z;
    bodyHips.position.y=Math.max(bodyHipsBind.y-0.5,Math.min(bodyHipsBind.y+0.15,bodyHips.position.y)); }   // slide baja, wallrun no dispara la cámara""",
    """  if(bodyHips&&bodyHipsBind){ bodyHips.position.x=bodyHipsBind.x; bodyHips.position.z=bodyHipsBind.z;
    bodyHips.scale.set(1,1,1);   // el mixer le mete escala a la cadera en los crossfades: 14,6% = 0,098 m de tirón
    // isRunning() es imprescindible: getEffectiveWeight() de una acción que NUNCA se reprodujo devuelve 1
    // (el peso arranca en 1 aunque no esté en la lista activa del mixer), así que sin este test la puerta
    // quedaba abierta SIEMPRE y la cadera bobeaba 0,12 m corriendo.
    const _aS=bodyActions.slide, _wS=(_aS&&_aS.isRunning())?_aS.getEffectiveWeight():0;
    // G6 (bug de unidades, la otra mitad). La rama de deslizada ya convertia metros -> unidades de hueso,
    // pero la rama NORMAL usaba los literales 0.5 / 0.15 crudos, que en unidades de hueso son 5,4 mm y
    // 1,6 mm de mundo: la cadera quedaba CLAVADA a altura de parado y no rebotaba nunca. Ahora las dos
    // ramas hablan metros. NRM_DIP/NRM_UP son chicos a proposito: dejan pasar el rebote real de la
    // zancada (~5 cm) y siguen cortando la deriva de 0,12 m que metia el crossfade.
    const _u=1/(bodyScale*0.01);   // 1 m en unidades de hueso (Armature.scale=0.01 · bodyScale)
    const _lo=(_wS>0.001? SLD_DIP_MAX : NRM_DIP)*_u, _up=NRM_UP*_u;
    bodyHips.position.y=Math.max(bodyHipsBind.y-_lo,Math.min(bodyHipsBind.y+_up,bodyHips.position.y)); }""")

# --- 2f) SOSTEN DE LA DESLIZADA: el clip se congela en su fotograma mas bajo -------------
# La deslizada dura hasta 0,9 s pero el clip llega a su minimo (Hips 22.485) a t=0.433 y despues SUBE.
# Sin congelar, a mitad de deslizada el personaje se vuelve a parar solo. El congelado se gatea por
# player.sliding (no por curAnim), asi que el clip sale del sosten desde su pose mas baja mientras se
# desvanece. SLD_TS=0.85 estira la entrada a 0,506 s de reloj.
rep("""function tickBody(dt,gameState){ if(!bodyRoot)return; setAnim(gameState||'idle');""",
    """const SLD_DIP_MAX=0.80, SLD_T_HOLD=0.43, SLD_TS=0.85;   // m de bajada máxima · s del fotograma más bajo · timescale
const NRM_DIP=0.050, NRM_UP=0.035;   // m: cuánto puede rebotar la cadera FUERA de la deslizada (ver 2e)
function tickBody(dt,gameState){ if(!bodyRoot)return; setAnim(gameState||'idle');
  { const a=bodyActions.slide; if(a){ a.setEffectiveTimeScale(SLD_TS);
      if(player.sliding && a.time>SLD_T_HOLD) a.time=SLD_T_HOLD; } }""")

# --- 2g) crossfade mas largo cuando la deslizada es origen O destino ---------------------
# Con 0,16 s la vuelta de 0,75 m de cadera se hacia en ~10 frames (salto de 0,07 m/frame). Con 0,30 la
# recuperacion es monotona y ningun frame se pasa de 0,06 m.
rep("""function setAnim(name){ if(!bodyActions[name]||curAnim===name)return;""",
    """function setAnim(name){ if(!bodyActions[name]||curAnim===name)return;
  // G5. El pop de salida de la deslizada (cadera 0,244 m EN UN FRAME, medido) no lo hacía el crossfade
  // slide->walk: lo hacía el TERCER crossfade encima, walk->idle, tres frames después, con la deslizada
  // todavía al 0,56 de peso. Tres acciones mezclándose y una recién reseteada = salto. Mientras la
  // deslizada se está yendo NO se acepta ningún cambio más (salvo volver a deslizarse): la transición
  // termina en un solo crossfade y después el estado real se aplica solo, en el frame siguiente.
  { const _sa=bodyActions.slide;
    if(name!=='slide' && curAnim!=='slide' && _sa && _sa.isRunning() && _sa.getEffectiveWeight()>0.02) return; }""")

rep("""  if(curAnim&&bodyActions[curAnim]) nx.crossFadeFrom(bodyActions[curAnim],0.16,true);   // transición suave entre animaciones""",
    """  if(curAnim&&bodyActions[curAnim]) nx.crossFadeFrom(bodyActions[curAnim], (curAnim==='slide'||name==='slide')?0.42:0.16, true);   // transición suave (la deslizada, más larga)""")

# --- 2j) G8: en 3a persona el arma NO puede quedar escondida dentro del torso ------------
# Medido (__tiro.esq() en tp, parado): gunRoot cae a x=+0.078 del eje de camara y z=-3.507, o sea 0.456 m
# DELANTE del pecho y sobre el eje. La camara 3a persona esta EXACTAMENTE detras y centrada, asi que el
# fusil (0.062 m de ancho) proyecta en ndc.x [0.013,0.031] y el torso en [-0.064,0.061]: el arma queda
# tapada entera. La cuenta de cuanto hay que correr la camara para destaparla: con el arma a 3.5 m y los
# hombros a 3.05, la condicion (x_arma - L)/3.5 + 0.009 > (0.19 - L)/3.05 da L > 0.734 m.
# Correr el ARMA en vez de la camara no sirve: para sacarla del torso hace falta GUN_OJO.x >= 0.25, y ahi
# la cadena hombro izquierdo -> agarre pide 0.63 m contra 0.513 de alcance (el fusil quedaria de una mano).
# Asi que la camara se va al HOMBRO (over-the-shoulder), que es lo que hace cualquier 3a persona con arma.
# Solo en el campo de tiro, y con el mismo anti-clip de paredes que ya usa el retroceso.
rep("""    camera.position.set(cx-bx*back, cy, cz-bz*back);                     // SIEMPRE a la altura de los hombros (nunca por debajo)""",
    """    camera.position.set(cx-bx*back, cy, cz-bz*back);                     // SIEMPRE a la altura de los hombros (nunca por debajo)
    if(world==='tiro'){                                                  // ← 3ª persona SOBRE EL HOMBRO (ver 2j)
      const rx=Math.cos(_yv), rz=-Math.sin(_yv);                         // eje derecha de la cámara
      const maxL=camClipDist(camera.position.x,cy,camera.position.z, rx,0,rz, TP_LAT+0.25);
      const lat=Math.min(TP_LAT*player.camTP, Math.max(0, maxL-0.25));
      camera.position.x+=rx*lat; camera.position.z+=rz*lat; }""")
rep("""const TP_DIST=3.1;   // distancia de la cámara en 3ª persona""",
    """const TP_DIST=3.1;   // distancia de la cámara en 3ª persona
const TP_LAT=0.80;   // corrimiento lateral (hombro) en 3ª persona dentro del campo de tiro: ver 2j""")

# --- 2i) G2: el tope de pitch del campo de tiro tambien para el tactil -------------------
# Mismo clamp que el del mouse (block.js). pitMax() vive en el bloque, que se inserta arriba (linea 534).
rep("""    const lk=LOOK*sensMul; player.yaw-=ddx*lk; player.pitch=Math.max(-0.9,Math.min(1.3,player.pitch-ddy*lk)); } });""",
    """    const lk=LOOK*sensMul; player.yaw-=ddx*lk; player.pitch=Math.max(-0.9,Math.min(pitMax(),player.pitch-ddy*lk)); } });""")

# --- 2h) UN SOLO ANCLA DE OJO, compartida por la camara y el arma ------------------------
# tiroPostura ya calcula la altura del ojo (hueso de la cabeza + limitador de velocidad) y la deja en
# tiroOjoY; tickBody corre ANTES que la camara en el mismo frame, asi que leerla aca garantiza que vista
# y arma no discrepen nunca. La altura del jugador pasa cruda por dentro de tiroOjoY: el filtro es sobre
# el OFFSET DE POSE, no sobre player.pos.y (si no se comeria saltos y caidas).
rep("""  if(bodyHead && !player.rolling){ bodyHead.getWorldPosition(_camAnchor); }     // la cámara va EN la cabeza (sigue su posición; la cabeza queda oculta por el near-plane)""",
    """  if(bodyHead && !player.rolling){ bodyHead.getWorldPosition(_camAnchor);
    if(typeof tiroOjoY==='number' && isFinite(tiroOjoY)) _camAnchor.y=tiroOjoY; }   // ← la MISMA altura que usa el arma""")

open(DST, 'w', encoding='utf-8').write(s)
print('ediciones:', N[0], '· bytes:', len(s), '→', DST)
