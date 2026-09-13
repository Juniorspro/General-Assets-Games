#!/usr/bin/env python3
"""«IN GENERAL, THE MODEL MOVEMENT POSE IS WEIRD».

Tenia razon, y la causa es peor de lo que parecia. El cuerpo del jugador en
primera persona es un GLB riggeado que se carga en `cargarCuerpoGLB()`, y ese
GLB VIENE SIN NINGUNA ANIMACION: `g.animations` esta vacio, asi que nunca se
crea el mixer. Medido desde la sonda, en los trece: `cuerpoGLB() ->
{cargado:true, mixer:false}`.

O sea que lo que ves cuando mirás para abajo es UNA ESTATUA deslizandose por el
suelo: las piernas nunca se mueven, y lo unico que se anima son los brazos, que
se apuntan a mano hacia abajo con `apuntarBrazos()`. De ahi el amasijo de botas
y antebrazos de las capturas.

Y al lado hay una maquinaria completa que hace exactamente lo que falta: la de
los personajes. `armarAcciones()` le presta a cualquier modelo los clips
compartidos —quieto, andar, correr—, los retargetea a su esqueleto, y
`mezclaAcciones()` los cambia segun la velocidad de verdad con histeresis. Los
personajes del mundo ya la usan y ya esta probada. El cuerpo del jugador ES un
modelo del mismo tipo (en varios mundos, literalmente el mismo GLB que un NPC).

QUE SE HACE. Se le pasa el cuerpo a esa misma maquinaria. Nada nuevo, nada que
no este ya andando en pantalla. Los brazos apuntados a mano quedan SOLO como
respaldo, para el caso de que los clips no lleguen a cargar.
"""
import pathlib, re, sys

A = pathlib.Path('/home/user/mundos/assets')
DEST = ['mundos/dunas.html', 'mundos/jungla.html', 'mundos/volcan.html',
        'mundos/pantano.html', 'mundos/canon.html', 'mundos/estepa.html',
        'mundos/acropolis.html', 'mundos/secuoya.html', 'mundos/marte.html',
        'mundos/luna.html', 'mundos/exo.html', 'mundos/hielo.html',
        'senda/senda.html']

# 1) al cargar el GLB, darlo de alta como si fuera un personaje mas
ANCLA_CARGA = "    CUERPO.glb = m;"
NUEVA_CARGA = """    CUERPO.glb = m;
    /* LOS CLIPS PRESTADOS, IGUAL QUE UN PERSONAJE. Este GLB no trae animaciones
       propias: sin esto el cuerpo es una estatua que se desliza, que es lo que
       se reporto como «la pose al moverse es rara». `armarAcciones` le presta
       quieto/andar/correr retargeteados a su esqueleto, y si los clips todavia
       no cargaron lo deja en la cola y lo arma solo cuando lleguen. */
    CUERPO.npc = { modelo: m, clipsPropios: (g.animations || []) };
    armarAcciones(CUERPO.npc);"""

# 2) en el tick, mezclar con la velocidad de verdad y dejar lo de antes de respaldo
ANCLA_TICK = """    if (CUERPO.mixer){
      /* el clip avanza con la velocidad: parado se congela, corriendo vuela.
         Las PIERNAS y el torso los mueve el clip; los brazos los pisamos abajo. */
      CUERPO.mixer.timeScale = v * (corre ? 2.4 : 1.4);
      CUERPO.mixer.update(dt);
    }
    /* brazos apuntados HACIA ABAJO (independiente del bind de cada modelo),
       con vaivén al caminar y respiración mínima al estar quieto */
    if (CUERPO.arms){
      const sw = Math.sin(bobF) * v * (corre ? 0.5 : 0.34) + Math.sin(t0 * 1.4) * 0.03 * (1 - v);
      apuntarBrazos(CUERPO.arms, sw);
    }"""
NUEVA_TICK = """    /* PRIMERO, LOS CLIPS. Si los prestados llegaron, el cuerpo camina y corre
       como cualquier personaje del mundo, con la mezcla que sigue a la velocidad
       de verdad: es lo que arregla la pose. El mixer lo actualiza `npcTick`
       junto con los demas, asi que aca solo se elige el clip. */
    if (CUERPO.npc && !CUERPO.npc.acc) armarAcciones(CUERPO.npc);
    if (CUERPO.npc && CUERPO.npc.acc){
      mezclaAcciones(CUERPO.npc, Math.hypot(pvx, pvz), dt);
    } else {
      /* RESPALDO, para el caso de que los clips no lleguen: lo de antes, que es
         mejor que una estatua con los brazos en cruz. */
      if (CUERPO.mixer){
        CUERPO.mixer.timeScale = v * (corre ? 2.4 : 1.4);
        CUERPO.mixer.update(dt);
      }
      if (CUERPO.arms){
        const sw = Math.sin(bobF) * v * (corre ? 0.5 : 0.34) + Math.sin(t0 * 1.4) * 0.03 * (1 - v);
        apuntarBrazos(CUERPO.arms, sw);
      }
    }"""

n = 0
for rel in DEST:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []
    if 'CUERPO.npc = {' in s:
        print('  -- %s: ya' % rel); continue
    if s.count(ANCLA_CARGA) == 1:
        s = s.replace(ANCLA_CARGA, NUEVA_CARGA, 1)
    else:
        err.append('la carga del GLB aparece %d veces' % s.count(ANCLA_CARGA))
    if s.count(ANCLA_TICK) == 1:
        s = s.replace(ANCLA_TICK, NUEVA_TICK, 1)
    else:
        err.append('el tick del cuerpo aparece %d veces' % s.count(ANCLA_TICK))
    for f in ('function armarAcciones', 'function mezclaAcciones'):
        if f not in s:
            err.append('no existe %s' % f)
    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); continue
    p.write_text(s, encoding='utf-8')
    n += 1
    print('  %s: el cuerpo camina con los clips de los personajes (%+d bytes)' % (rel, len(s) - len(o)))
print('%d de %d' % (n, len(DEST)))
sys.exit(0 if n == len(DEST) else 1)
