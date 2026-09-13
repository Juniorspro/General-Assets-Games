#!/usr/bin/env python3
"""EL LOTE COMPLETO. Todo lo que quedaba de la lista, en una pasada:

 1. SUELO PBR DE VERDAD. El terreno era un MeshLambertMaterial, que no tiene
    normalMap ni roughnessMap: por eso los suelos se veian planos y peor que las
    texturas procedurales. Pasa a MeshStandardMaterial con el normal y el
    roughness de los packs PBR (ambientCG / Poliigon) que estan en el repo. El
    splat de cuatro capas sigue igual: se inyecta en el mismo `map_fragment`,
    que existe tambien en Standard.
 2. HUD ARRIBA. Pausa y sonido pasan a la barra de ARRIBA, cuadrados (44x44) y
    no alargados. El boton CORRER desaparece: al correr lo decide la palanca
    (empujarla del todo) o Shift, no un boton que ocupa lugar.
 3. FOV EN MEDIO SEGUNDO. Era dt*3.2 (~0,3 s). Pasa a dt*2.1, que es la
    constante de tiempo de medio segundo que se pidio.
 4. EL DIALOGO NO SE TAPA. Con los controles abajo, el globo quedaba debajo del
    joystick y del salto. Ahora el dialogo empuja los controles fuera de la
    pantalla mientras esta abierto y se apoya en el borde de abajo.
 5. IDLE CALMO. El clip que se estaba usando de reposo es `Idle_02`, que es el
    de MIRAR A LOS COSTADOS: molesta y encima pelea con el de caminar. Pasa a
    `Idle`, que es respirar y nada mas.
 6. NADIE CAMINA QUIETO. Si un personaje no tiene por que moverse, su velocidad
    se fuerza a cero: el robot de ACROPOLIS caminaba para siempre porque su
    clip propio se reproducia sin mirar la velocidad.
Uso: python3 parche_lote.py [slug ...]"""
import re
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']


# ------------------------------------------------------------------ 1. SUELO --
def suelo_pbr(t, slug):
    if 'MeshStandardMaterial({ map: TX.pasto' in t:
        return t, 'suelo(ya)'
    v = 'const matTerr = new T.MeshLambertMaterial({ map: TX.pasto });'
    if v not in t:
        return t, 'suelo NO'
    n = """/* MeshSTANDARD, no Lambert: Lambert no tiene normalMap ni roughnessMap, y por
   eso los suelos se veian planos —peor que las texturas procedurales— aunque la
   foto de base fuera buena. Con Standard el relieve del normal agarra la luz del
   sol y el roughness decide donde brilla. El splat de cuatro capas no cambia: se
   inyecta en el mismo `map_fragment`, que existe igual en Standard. */
const matTerr = new T.MeshStandardMaterial({ map: TX.pasto,
  roughness: .92, metalness: 0 });"""
    t = t.replace(v, n, 1)
    # cargar normal y roughness junto con las fotos del suelo
    v2 = """  if (MUNDO_TEX.sotavento) car(MUNDO_TEX.sotavento, t => {
    uniTerr.tHoja.value = t; });"""
    n2 = """  if (MUNDO_TEX.sotavento) car(MUNDO_TEX.sotavento, t => {
    uniTerr.tHoja.value = t; });
  /* NORMAL y ROUGHNESS del pack PBR: es lo que le da relieve al suelo. Van con
     el MISMO tileado que el color (repite/MAPA), si no el relieve flota. */
  if (MUNDO_TEX.nrm) car(MUNDO_TEX.nrm, t => {
    t.colorSpace = T.NoColorSpace;
    t.repeat.set(uniTerr.repite.value, uniTerr.repite.value);
    matTerr.normalMap = t;
    matTerr.normalScale.set(.85, .85);
    matTerr.needsUpdate = true;
  });
  if (MUNDO_TEX.rgh) car(MUNDO_TEX.rgh, t => {
    t.colorSpace = T.NoColorSpace;
    t.repeat.set(uniTerr.repite.value, uniTerr.repite.value);
    matTerr.roughnessMap = t; matTerr.needsUpdate = true;
  });"""
    if v2 in t:
        t = t.replace(v2, n2, 1)
    # y el bloque MUNDO_TEX declara los dos archivos nuevos
    t = re.sub(r"const MUNDO_TEX = \{ arena: '([^']*)', sotavento: '([^']*)' \};",
               lambda m: ("const MUNDO_TEX = { arena: '%s', sotavento: '%s',\n"
                          "  nrm: 'pbr/%s-nrm.jpg', rgh: 'pbr/%s-rgh.jpg' };"
                          % (m.group(1), m.group(2), slug, slug)), t, count=1)
    return t, 'suelo PBR'


# -------------------------------------------------------------------- 2. HUD --
def hud(t, slug):
    if '#hudTop' in t:
        return t, 'hud(ya)'
    msgs = []
    # los botones de arriba: cuadrados, en su propia barra
    css = """
  /* ---------------------- BARRA DE ARRIBA: PAUSA Y SONIDO -------------------
     Estaban abajo a la derecha, alargados y peleando lugar con el salto. Van
     ARRIBA y CUADRADOS, que es donde no molestan al pulgar ni al dialogo. */
  #hudTop{position:absolute;right:max(10px,2.5vw);top:max(10px,2vh);display:flex;
    gap:8px;pointer-events:auto;z-index:6}
  #hudTop .bt{width:44px;height:44px;border-radius:12px;display:grid;
    place-items:center;font-size:19px;line-height:1;cursor:pointer;
    background:rgba(0,0,0,.46);border:1.5px solid @BD@;color:@CT@;
    backdrop-filter:blur(4px)}
  #hudTop .bt:active{transform:translateY(1px);filter:brightness(1.35)}
"""
    a = "  /* ayuda de controles de PC: sale sola al detectar mouse/teclado */"
    if a in t:
        mct = re.search(r"#dlgT\{[^}]*color:(#[0-9a-fA-F]{6})", t)
        mbd = re.search(r"#dlgGlobo\{[^}]*border:1\.5px solid (rgba\([^)]*\))", t) \
            or re.search(r"#dlgGlobo\{[^}]*border:1\.6px solid (rgba\([^)]*\))", t)
        ct = mct.group(1) if mct else '#f0e4d4'
        bd = mbd.group(1) if mbd else 'rgba(255,255,255,.34)'
        t = t.replace(a, css.replace('@CT@', ct).replace('@BD@', bd) + a, 1)
        msgs.append('css')
    else:
        msgs.append('css NO')
    # la barra en el HTML, y sacar los dos botones de la columna de abajo
    a2 = '  <div id="obj">'
    if a2 in t:
        t = t.replace(a2, '  <div id="hudTop"><div class="bt" id="bSon">\U0001F50A</div>'
                          '<div class="bt" id="bMenu">☰</div></div>\n' + a2, 1)
        msgs.append('html')
    else:
        msgs.append('html NO')
    # los viejos, fuera: el CORRER no vuelve, y pausa/sonido ya estan arriba
    t = re.sub(r'\s*<div class="b" id="bSon">[^<]*</div>', '', t, count=1)
    t = re.sub(r'\s*<div class="b corre" id="bCorre">[^<]*</div>', '', t, count=1)
    t = re.sub(r'\s*<div class="b" id="bMenu">[^<]*</div>', '', t, count=1)
    msgs.append('viejos')
    # el codigo que tocaba bCorre tiene que sobrevivir a que no exista
    t = t.replace("$('bCorre').classList.toggle('on', corre);",
                  "/* el boton CORRER ya no existe: lo decide la palanca o Shift */")
    t = t.replace("$('bCorre').classList.add('on');", "")
    t = t.replace("$('bCorre').classList.remove('on');", "")
    t = re.sub(r"\$\('bCorre'\)\.addEventListener\('pointerdown', e => \{ e\.preventDefault\(\);\n"
               r"\s*corre = !corre;[^\n]*\n?[^\n]*\}\);", "", t)
    t = re.sub(r"\$\('bCorre'\)[^\n]*\n", "", t)
    return t, 'hud[' + '+'.join(msgs) + ']'


# -------------------------------------------------------------------- 3. FOV --
def fov(t, slug):
    v = 'fovSuave += (fovObj - fovSuave) * Math.min(1, dt0 * 3.2);'
    n = ('/* dt0*2.1 = constante de tiempo de medio segundo, que es lo que se pidio:\n'
         '     antes con 3.2 se abria en tres decimas y se notaba el tiron. */\n'
         '  fovSuave += (fovObj - fovSuave) * Math.min(1, dt0 * 2.1);')
    if 'dt0 * 2.1' in t:
        return t, 'fov(ya)'
    if v not in t:
        return t, 'fov NO'
    return t.replace(v, n, 1), 'fov 0.5s'


# ---------------------------------------------------------------- 4. DIALOGO --
def dlg_libre(t, slug):
    if 'body.hablando #joy' in t and 'translateY(140%)' in t:
        return t, 'dlg(ya)'
    v = ("  body.hablando #joy,body.hablando #bSalta{opacity:0;pointer-events:none;\n"
         "    transition:opacity .18s}")
    n = """  /* con dialogo abierto los controles SE VAN de la pantalla, no solo se
     transparentan: quedaban encima del globo y tapaban el texto. */
  body.hablando #joy,body.hablando #bSalta{opacity:0;pointer-events:none;
    transform:translateY(140%);transition:opacity .18s,transform .22s}
  /* y el globo se apoya abajo, que es el lugar que quedo libre */
  body.hablando #dlg{bottom:max(10px,2vh)}"""
    if v not in t:
        return t, 'dlg NO'
    return t.replace(v, n, 1), 'dlg libre'


# ------------------------------------------------------------------ 5. IDLE ---
def idle_calmo(t, slug):
    """el reposo pasa de Idle_02 (mirar a los costados) a Idle (respirar)"""
    if "anim/quieto2.glb" in t:
        return t, 'idle(ya)'
    v = "['quieto', AX('anim/quieto.glb')]"
    n = ("['quieto', AX('anim/quieto2.glb')]   /* Idle, no Idle_02: el 02 es el de\n"
         "                 MIRAR A LOS COSTADOS, que molesta y encima pelea con el de\n"
         "                 caminar cada vez que se cambia de clip */")
    if v not in t:
        return t, 'idle NO'
    return t.replace(v, n, 1), 'idle calmo'


# -------------------------------------------------------- 6. NADIE CAMINA QUIETO
def quieto_de_verdad(t, slug):
    if 'PARADO DE VERDAD' in t:
        return t, 'quieto(ya)'
    v = "    npc.vel = npc.vel == null ? vIns : npc.vel + (vIns - npc.vel) * Math.min(1, dt * 4.5);"
    n = """    /* PARADO DE VERDAD: si el personaje no se movio nada en el cuadro, su
       velocidad es CERO y no «casi cero». Sin esto el suavizado exponencial
       deja una cola de 0,2 m/s para siempre, el estado se queda en `andar` y el
       robot de ACROPOLIS caminaba eternamente parado en el mismo lugar. */
    npc.vel = npc.vel == null ? vIns : npc.vel + (vIns - npc.vel) * Math.min(1, dt * 4.5);
    if (vIns < 0.02 && npc.vel < 0.30) npc.vel = 0;"""
    if v not in t:
        return t, 'quieto NO'
    return t.replace(v, n, 1), 'quieto OK'


PASOS = [suelo_pbr, hud, fov, dlg_libre, idle_calmo, quieto_de_verdad]


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        msgs = []
        for fn in PASOS:
            t, m = fn(t, s)
            msgs.append(m)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} ' + ' · '.join(msgs))


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
