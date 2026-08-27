#!/usr/bin/env python3
"""UN SOLO CLIP A LA VEZ, y el Idle calmado.

El jugador lo dijo antes que yo y tenia razon: "se deforma todo al caminar porque
intenta combinar animaciones". La mezcla de tres clips por peso no es un promedio
inocente. El AnimationMixer de three acumula los cuaterniones de cada pista y los
normaliza; cuando dos poses estan lejos —y el Idle de Meshy mira a los costados
mientras el Casual_Walk mira al frente— la interpolacion del hueso Hips puede
salir por el camino largo y ACOSTAR al personaje. Eso es exactamente el vecino
tumbado en el aire de la captura, y los torsos retorcidos con la cabeza metida en
el pecho de los otros dos.

Se cambian tres cosas:

1. mezclaAcciones deja de mezclar: elige UN clip por velocidad y le pone peso 1,
   los otros a 0 en el mismo cuadro. Con histeresis en los umbrales, porque
   elegir por un umbral seco hace que a velocidad de frontera el personaje
   parpadee entre quieto y caminando cada cuadro.

2. El Idle va a timeScale 0,42 y con desfase propio por personaje. La queja no es
   que mire a los costados, es que lo hace rapido, todo el tiempo y todos a la
   vez. A 0,42 el mismo clip se lee como respirar.

3. armarAcciones solo ata clips si el modelo TIENE HUESOS. El perro es una sola
   pieza sin esqueleto: se le ataban las acciones igual, npc.acc quedaba definido,
   y por eso el balanceo a mano —que es lo unico que puede moverlo— no corria
   nunca. Estaba congelado.
"""
import re, sys, pathlib

D = pathlib.Path('/home/user/mundos/assets/mundos')
MUNDOS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

VIEJO_MEZCLA = """function mezclaAcciones(npc, vel, dt){
  const A = npc.acc;
  if (!A) return;
  /* vel en metros por segundo; caminar ~2, correr ~6 */
  const wCor = cl((vel - 3.4) / 3.0, 0, 1);
  const wAnd = cl((vel - 0.25) / 1.6, 0, 1) * (1 - wCor);
  const wQui = 1 - wAnd - wCor;
  const k = Math.min(1, dt * 7);
  const pon = (a, w) => { if (a) a.setEffectiveWeight(
    a.getEffectiveWeight() + (w - a.getEffectiveWeight()) * k); };
  pon(A.quieto, wQui); pon(A.andar, wAnd); pon(A.correr, wCor);"""

NUEVO_MEZCLA = """function mezclaAcciones(npc, vel, dt){
  const A = npc.acc;
  if (!A) return;
  /* UN SOLO CLIP A LA VEZ. Mezclar por peso parece lo elegante y es lo que
     rompia todo: el mixer acumula los cuaterniones de cada pista y los normaliza,
     y con el Idle mirando a un costado y el Casual_Walk al frente, el hueso Hips
     interpolaba por el camino largo y ACOSTABA al personaje en el aire. Los
     torsos retorcidos con la cabeza en el pecho eran lo mismo, mas suave.
     Con histeresis: elegir por un umbral seco hace que a velocidad de frontera
     el personaje parpadee entre quieto y caminando cada cuadro. */
  const est = npc.estAnim || 'quieto';
  let q = est;
  if (est === 'quieto')      q = vel > 0.55 ? (vel > 4.2 ? 'correr' : 'andar') : 'quieto';
  else if (est === 'andar')  q = vel < 0.30 ? 'quieto' : (vel > 4.2 ? 'correr' : 'andar');
  else                       q = vel < 3.4 ? (vel < 0.30 ? 'quieto' : 'andar') : 'correr';
  if (!A[q]) q = A.andar ? 'andar' : 'quieto';
  if (q !== est){
    npc.estAnim = q;
    for (const k in A){
      const a = A[k];
      a.setEffectiveWeight(k === q ? 1 : 0);
      if (k === q){ a.paused = false; a.enabled = true; }
    }
  }"""

VIEJO_TS = """  /* el clip avanza al ritmo del paso: si no, se arrastra o patina */
  if (A.andar) A.andar.timeScale = cl(vel / 1.9, .55, 2.1);
  if (A.correr) A.correr.timeScale = cl(vel / 5.4, .6, 1.9);
}"""

NUEVO_TS = """  /* el clip avanza al ritmo del paso: si no, se arrastra o patina */
  if (A.andar) A.andar.timeScale = cl(vel / 1.9, .55, 2.1);
  if (A.correr) A.correr.timeScale = cl(vel / 5.4, .6, 1.9);
  /* el Idle de Meshy mira a los costados. La queja no era que mire: era que lo
     hace rapido, sin parar y todos a la vez. A 0,42 el MISMO clip se lee como
     respirar, y el desfase por personaje rompe el coro. */
  if (A.quieto) A.quieto.timeScale = 0.42;
}"""

VIEJO_ATA = """  if (!cQuieto && !cAndar) return;
  const mix = npc.mixer || new T.AnimationMixer(m);"""

NUEVO_ATA = """  if (!cQuieto && !cAndar) return;
  /* Sin HUESOS no se ata nada. El perro es una sola pieza: se le ataban las tres
     acciones igual, npc.acc quedaba definido, y el balanceo a mano —lo unico que
     puede moverlo— no corria nunca porque su condicion es justamente !npc.acc.
     Estaba congelado desde el primer dia. */
  let _hue = false;
  m.traverse(o => { if (o.isBone) _hue = true; });
  if (!_hue) return;
  const mix = npc.mixer || new T.AnimationMixer(m);"""

VIEJO_PLAY = """    a.enabled = true;
    a.setEffectiveWeight(par[0] === 'quieto' ? 1 : 0);
    a.play();
    A[par[0]] = a;
  }
}"""

NUEVO_PLAY = """    a.enabled = true;
    a.setEffectiveWeight(par[0] === 'quieto' ? 1 : 0);
    a.play();
    /* desfase propio: sin esto los seis personajes de un mundo respiran y giran
       la cabeza en el mismo fotograma, y se ve a un coro, no a gente */
    a.time = Math.random() * (a.getClip().duration || 1);
    A[par[0]] = a;
  }
  npc.estAnim = 'quieto';
}"""

n = 0
for w in MUNDOS:
    p = D / (w + '.html')
    s = p.read_text(encoding='utf-8')
    o = s
    for a, b, tag in [(VIEJO_MEZCLA, NUEVO_MEZCLA, 'mezcla'),
                      (VIEJO_TS, NUEVO_TS, 'timescale'),
                      (VIEJO_ATA, NUEVO_ATA, 'huesos'),
                      (VIEJO_PLAY, NUEVO_PLAY, 'desfase')]:
        c = s.count(a)
        if c != 1:
            print('  !! %s / %s: %d coincidencias' % (w, tag, c))
            continue
        s = s.replace(a, b)
    if s != o:
        p.write_text(s, encoding='utf-8')
        n += 1
        print('  ok %s' % w)
print('%d de %d mundos parcheados' % (n, len(MUNDOS)))
