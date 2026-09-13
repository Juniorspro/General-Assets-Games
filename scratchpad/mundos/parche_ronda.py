#!/usr/bin/env python3
"""QUE LOS PERSONAJES CAMINEN.

El diagnostico dio esto: los clips de caminar y correr estan bien atados a cada
personaje, y los que estan cerca SI encaran al jugador (2 a 18 grados de
desvio). El problema era otro y mas simple: NADIE LOS HACIA CAMINAR. Se plantaban
en su sitio y se quedaban ahi para siempre, asi que la animacion que corria era
la de estar quieto —correctamente— y el mundo se veia lleno de estatuas.

Aca cada personaje que no te acompaña hace una RONDA CORTA alrededor de su
puesto: tres paradas a menos de nueve metros, camina de una a otra, se queda un
rato en cada una. Con eso el clip de caminar corre de verdad y el mundo se mueve.
Y si te acercas a menos de siete metros se DETIENE y te encara, para que hablar
con alguien no sea perseguirlo.

El PERRO no tiene huesos (su GLB es una sola pieza), asi que ningun clip lo
puede mover: se lo balancea a mano mientras trota, que a esa escala se lee como
paso.
Uso: python3 parche_ronda.py [slug ...]"""
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

# se engancha justo antes del calculo de la velocidad, que ya existe
ANCLA = """    /* SUAVIZADA: el que te sigue entra y sale del radio de 3,4 m, asi que su"""

RONDA = r"""    /* ---------------------- LA RONDA ------------------------------------
       Los personajes se plantaban en su sitio para siempre: la animacion que
       corria era la de estar quieto (bien) y el mundo quedaba lleno de estatuas.
       El que no te acompaña hace una ronda corta alrededor de su puesto —tres
       paradas a menos de nueve metros— y se queda un rato en cada una. Asi el
       clip de caminar corre de verdad.
       Si te acercas a menos de siete metros se DETIENE y te encara: hablar con
       alguien no puede ser perseguirlo. */
    if (!npc.sigue && !npc.vuela && !npc.quieto){
      if (!npc.ronda){
        const bx = f.position.x, bz = f.position.z;
        npc.ronda = [];
        for (let k = 0; k < 3; k++){
          const a = npc.fase + k * 2.094;
          const r = 4.5 + (k % 2) * 4.0;
          npc.ronda.push([bx + Math.cos(a) * r, bz + Math.sin(a) * r]);
        }
        npc.ri = 0; npc.espera = rr(1.5, 5.0);
      }
      if (d < 7){
        /* cerca del jugador: quieto y encarandolo */
        npc.espera = Math.max(npc.espera, .6);
      } else if (npc.espera > 0){
        npc.espera -= dt;
      } else {
        const P = npc.ronda[npc.ri];
        const dx = P[0] - f.position.x, dz = P[1] - f.position.z;
        const dd = Math.hypot(dx, dz);
        if (dd < .8){
          npc.ri = (npc.ri + 1) % npc.ronda.length;
          npc.espera = rr(2.0, 6.5);
        } else {
          const paso = 1.35 * dt;                 /* paso de paseo, no de marcha */
          f.position.x += dx / dd * Math.min(paso, dd);
          f.position.z += dz / dd * Math.min(paso, dd);
          const objY = Math.atan2(dx, dz);
          let dy2 = objY - f.rotation.y;
          while (dy2 > Math.PI) dy2 -= 6.283;
          while (dy2 < -Math.PI) dy2 += 6.283;
          f.rotation.y += dy2 * Math.min(1, dt * 4);
          anda = 1;
        }
      }
    }
""" + ANCLA


BALANCEO = r"""    /* el PERRO no tiene huesos: su GLB es una sola pieza, asi que ningun clip lo
       puede mover. Se lo balancea a mano mientras trota, que a esa escala se lee
       como paso, y se le da un cabeceo al estar quieto para que respire. */
    if (npc.modelo && !npc.acc){
      const v2 = npc.vel || 0;
      npc.balPh = (npc.balPh || 0) + dt * (2.2 + v2 * 2.6);
      npc.modelo.rotation.z = Math.sin(npc.balPh) * (v2 > .3 ? .09 : .012);
      npc.modelo.position.y = (npc.glbY || 0) + Math.abs(Math.sin(npc.balPh)) * (v2 > .3 ? .07 : .012);
    }
    const L2 = f.userData.lim || {};"""


def parche(t, slug):
    if 'LA RONDA' in t:
        return t, 'ronda(ya)'
    msgs = []
    if ANCLA in t:
        t = t.replace(ANCLA, RONDA, 1); msgs.append('ronda')
    else:
        msgs.append('ronda NO')
    if '    const L2 = f.userData.lim || {};' in t:
        t = t.replace('    const L2 = f.userData.lim || {};', BALANCEO, 1)
        msgs.append('perro')
    else:
        msgs.append('perro NO')
    return t, 'ronda[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
