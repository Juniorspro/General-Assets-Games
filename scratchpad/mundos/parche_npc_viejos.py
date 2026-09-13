#!/usr/bin/env python3
"""LOS PERSONAJES DE LOS CINCO VIEJOS, TAMBIEN CON LOS CLIPS QUE CORRESPONDEN.

marte, luna, exo, hielo y senda cargan sus personajes asi:

    const mix = new T.AnimationMixer(m);
    mix.clipAction(g.animations[0]).play();

o sea, reproducen EL PRIMER CLIP DEL ARCHIVO, sea cual sea y pase lo que pase.
Para los modelos que solo traen `Idle` —la mayoria— eso quiere decir que el
personaje camina hacia vos patinando, sin mover una pierna, con la animacion de
estar quieto puesta encima. Es la otra mitad de «la pose al moverse es rara».

Ahora que estos cinco tienen la biblioteca de clips prestados (parche anterior),
se los pasa por la misma maquinaria que los ocho nuevos:

  · `armarAcciones(npc)` le arma las tres acciones —quieto, andar, correr—
    prefiriendo SIEMPRE los clips propios del modelo si los trae, y prestandole
    los compartidos retargeteados si no;
  · `mezclaAcciones(npc, vel, dt)` elige cual suena segun la velocidad de verdad
    del personaje, con histeresis para que no parpadee en la frontera.

La velocidad sale de lo que el propio `npcTick` ya calcula para moverlo, asi que
no hay una segunda fuente de verdad que se pueda desincronizar.
"""
import pathlib, re, sys

A = pathlib.Path('/home/user/mundos/assets')
DEST = ['mundos/marte.html', 'mundos/luna.html', 'mundos/exo.html',
        'mundos/hielo.html', 'senda/senda.html']

VIEJO_CARGA = """      const mix = new T.AnimationMixer(m);
      mix.clipAction(g.animations[0]).play();"""
NUEVO_CARGA = """      /* LOS CLIPS QUE CORRESPONDEN, NO EL PRIMERO DEL ARCHIVO. Antes esto era
         `mix.clipAction(g.animations[0]).play()`, y para los modelos que solo
         traen `Idle` eso es la animacion de ESTAR QUIETO puesta encima de un
         personaje que camina: patinaba sin mover una pierna. `armarAcciones` usa
         los clips propios si los hay y presta los compartidos si no. */
      npc.clipsPropios = g.animations || [];
      armarAcciones(npc);
      const mix = npc.mixer || new T.AnimationMixer(m);
      if (!npc.acc) mix.clipAction(g.animations[0]).play();"""

# la velocidad con la que se mezcla: sale de lo que npcTick ya calcula
VIEJO_TICK = """    const suelo = H(f.position.x, f.position.z);"""
NUEVO_TICK = """    /* la mezcla de animacion, con la velocidad de verdad de este personaje:
       `anda` ya lo calculo el bloque de arriba para moverlo. */
    if (npc.acc) mezclaAcciones(npc, anda ? (corre ? 10.8 : 5.8) : 0, dt);
    const suelo = H(f.position.x, f.position.z);"""

n = 0
for rel in DEST:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []
    if 'npc.clipsPropios = g.animations' in s:
        print('  -- %s: ya' % rel); continue
    if s.count(VIEJO_CARGA) == 1:
        s = s.replace(VIEJO_CARGA, NUEVO_CARGA, 1)
    else:
        err.append('la carga del personaje aparece %d veces' % s.count(VIEJO_CARGA))
    if s.count(VIEJO_TICK) == 1:
        s = s.replace(VIEJO_TICK, NUEVO_TICK, 1)
    else:
        err.append('el tick del personaje aparece %d veces' % s.count(VIEJO_TICK))
    if 'let anda = 0;' not in s:
        err.append('no encuentro la bandera `anda` del tick')
    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); continue
    p.write_text(s, encoding='utf-8')
    n += 1
    print('  %s: los personajes eligen clip por velocidad (%+d bytes)' % (rel, len(s) - len(o)))
print('%d de %d' % (n, len(DEST)))
sys.exit(0 if n == len(DEST) else 1)
