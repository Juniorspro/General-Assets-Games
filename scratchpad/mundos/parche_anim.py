#!/usr/bin/env python3
"""CLIPS PRESTADOS entre personajes, y el que te sigue que camine de frente.

Dos problemas, uno de animacion y otro de orientacion:

1. ANIMACION. Los personajes del repo comparten los MISMOS nueve huesos
   estandar (Hips, Spine, LeftArm, RightForeArm, LeftUpLeg...), asi que un clip
   de uno SIRVE PARA TODOS: el AnimationMixer de three ata las pistas por NOMBRE
   DE NODO, no por modelo. Pero el motor solo tocaba `animations[0]` del propio
   GLB, y viajera.glb y dante.glb traen unicamente `Idle`: los de DUNAS
   patinaban por la arena sin mover una pierna.
   Ahora hay una BIBLIOTECA: se cargan tres donantes UNA VEZ
     · andar  <- hyper/char.glb       (Armature|Casual_Walk)
     · correr <- reliquia/hero.glb    (Armature|RunFast)
     · quieto <- aero/hero-idle.glb   (Armature|Idle)
   y cada personaje recibe los tres, con mezcla cruzada segun a que velocidad va
   de verdad. Cero creditos: es reciclar lo que ya esta en el repo.

2. EL QUE TE SIGUE IBA DE ESPALDAS. Al seguirte, si estaba a menos de 3,4 m no
   se le tocaba ni la rotacion ni la animacion: quedaba clavado en el angulo del
   spawn (casi siempre dandote la espalda) y quieto. Y como suele mantener el
   paso, eso era casi todo el tiempo. Ahora apunta SIEMPRE a donde camina, y la
   animacion sale de cuanto se movio de verdad.
Uso: python3 parche_anim.py [slug ...]"""
import re, sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

BIBLIO = r"""
/* ====================== BIBLIOTECA DE CLIPS PRESTADOS =====================
   Los personajes del repo salieron todos del mismo tipo de rig: comparten los
   NUEVE huesos estandar (Hips, Spine, LeftArm, RightArm, LeftForeArm,
   RightForeArm, LeftUpLeg, RightUpLeg, Head). El AnimationMixer de three ata
   las pistas de un clip POR NOMBRE DE NODO, asi que un clip de un modelo anda
   igual en otro. Por eso no hace falta generar animacion para cada personaje:
   se PRESTA la que ya existe en el repo.
     viajera.glb / dante.glb  ->  solo traen Idle (patinaban sin mover la pierna)
     hyper/char.glb           ->  Casual_Walk
     reliquia/hero.glb        ->  RunFast
     aero/hero-idle.glb       ->  Idle
   Se cargan los tres donantes UNA sola vez y se reparten a todos. */
const CLIPS = { quieto: null, andar: null, correr: null, listos: 0, cola: [] };
{
  const DON = [['andar', 'hyper/char.glb'], ['correr', 'reliquia/hero.glb'],
               ['quieto', 'aero/hero-idle.glb']];
  const fin = () => {
    CLIPS.listos++;
    if (CLIPS.listos < DON.length) return;
    /* los personajes que cargaron antes que la biblioteca esperan en la cola */
    for (const npc of CLIPS.cola.splice(0)) armarAcciones(npc);
  };
  for (const [k, u] of DON){
    if (!GLTF){ fin(); continue; }
    new GLTF().load(@RES@(u), g => {
      if (g.animations && g.animations.length) CLIPS[k] = g.animations[0];
      fin();
    }, undefined, fin);
  }
}
/* le arma a un personaje las tres acciones, con lo propio primero y lo prestado
   despues: si el GLB ya trae un clip de caminar, ese gana. */
function armarAcciones(npc){
  const m = npc.modelo;
  if (!m) return;
  if (CLIPS.listos < 3){ if (CLIPS.cola.indexOf(npc) < 0) CLIPS.cola.push(npc); return; }
  const propios = npc.clipsPropios || [];
  const buscar = rx => propios.find(c => rx.test(c.name || '')) || null;
  const cQuieto = buscar(/idle|quiet/i) || CLIPS.quieto;
  const cAndar  = buscar(/walk|camin/i) || CLIPS.andar;
  const cCorrer = buscar(/run|corr/i)   || CLIPS.correr || cAndar;
  if (!cQuieto && !cAndar) return;
  const mix = npc.mixer || new T.AnimationMixer(m);
  if (!npc.mixer){ npc.mixer = mix; MIXERS.push(mix); }
  const A = npc.acc = {};
  for (const par of [['quieto', cQuieto], ['andar', cAndar], ['correr', cCorrer]]){
    if (!par[1]) continue;
    let a;
    try { a = mix.clipAction(par[1]); } catch(e){ continue; }
    a.enabled = true;
    a.setEffectiveWeight(par[0] === 'quieto' ? 1 : 0);
    a.play();
    A[par[0]] = a;
  }
}
/* la MEZCLA: los pesos siguen a la velocidad de verdad del personaje, asi que
   nadie patina ni corre en el lugar. */
function mezclaAcciones(npc, vel, dt){
  const A = npc.acc;
  if (!A) return;
  /* vel en metros por segundo; caminar ~2, correr ~6 */
  const wCor = cl((vel - 3.4) / 3.0, 0, 1);
  const wAnd = cl((vel - 0.25) / 1.6, 0, 1) * (1 - wCor);
  const wQui = 1 - wAnd - wCor;
  const k = Math.min(1, dt * 7);
  const pon = (a, w) => { if (a) a.setEffectiveWeight(
    a.getEffectiveWeight() + (w - a.getEffectiveWeight()) * k); };
  pon(A.quieto, wQui); pon(A.andar, wAnd); pon(A.correr, wCor);
  /* el clip avanza al ritmo del paso: si no, se arrastra o patina */
  if (A.andar) A.andar.timeScale = cl(vel / 1.9, .55, 2.1);
  if (A.correr) A.correr.timeScale = cl(vel / 5.4, .6, 1.9);
}
"""

PON_VIEJO = """    if (g.animations && g.animations.length){
      const mix = new T.AnimationMixer(m);
      mix.clipAction(g.animations[0]).play();
      npc.mixer = mix; MIXERS.push(mix);"""
PON_NUEVO = """    /* los clips PROPIOS se guardan y se mezclan con los prestados: antes se
       reproducia animations[0] a ciegas, y para viajera.glb y dante.glb eso es
       `Idle`, asi que patinaban por el suelo sin mover una pierna. */
    npc.clipsPropios = g.animations || [];
    armarAcciones(npc);
    if (g.animations && g.animations.length){
      const mix = npc.mixer || new T.AnimationMixer(m);
      if (!npc.mixer){ npc.mixer = mix; MIXERS.push(mix); }"""

TICK_VIEJO = """      } else if (d > 3.4){
        const vel2 = (corre ? 10.8 : 5.8) * dt;
        f.rotation.y = Math.atan2(px - f.position.x, pz - f.position.z);
        f.position.x += (px - f.position.x) / d * Math.min(vel2, d - 3.2);
        f.position.z += (pz - f.position.z) / d * Math.min(vel2, d - 3.2);
        anda = 1;
      }
    } else if (d < 11){"""
TICK_NUEVO = """      } else if (d > 3.4){
        const vel2 = (corre ? 10.8 : 5.8) * dt;
        f.position.x += (px - f.position.x) / d * Math.min(vel2, d - 3.2);
        f.position.z += (pz - f.position.z) / d * Math.min(vel2, d - 3.2);
        anda = 1;
      }
      /* MIRA A DONDE CAMINA. Antes, con el jugador a menos de 3,4 m no se le
         tocaba ni la rotacion ni la animacion: quedaba clavado en el angulo del
         spawn —casi siempre de espaldas— y quieto. Y como suele mantener el
         paso, eso era casi todo el tiempo. Parado, encara al jugador. */
      {
        const mvx = f.position.x - _x0, mvz = f.position.z - _z0;
        const objY = (mvx * mvx + mvz * mvz > 1e-6)
          ? Math.atan2(mvx, mvz)
          : Math.atan2(px - f.position.x, pz - f.position.z);
        let dy = objY - f.rotation.y;
        while (dy > Math.PI) dy -= 6.283;
        while (dy < -Math.PI) dy += 6.283;
        f.rotation.y += dy * Math.min(1, dt * 8);
      }
    } else if (d < 11){"""

X0_VIEJO = """    const d = Math.hypot(px - f.position.x, pz - f.position.z);
    let anda = 0;"""
X0_NUEVO = """    const d = Math.hypot(px - f.position.x, pz - f.position.z);
    let anda = 0;
    /* de donde salio este cuadro: sirve para saber a que velocidad va de verdad
       y para saber hacia donde esta caminando */
    const _x0 = f.position.x, _z0 = f.position.z;"""

MEZ_VIEJO = """    const L2 = f.userData.lim || {};"""
MEZ_NUEVO = """    /* la velocidad DE VERDAD del personaje (metros por segundo): con esto la
       mezcla de clips no depende de banderas sino de cuanto se movio */
    npc.vel = dt > 0 ? Math.hypot(f.position.x - _x0, f.position.z - _z0) / dt : 0;
    mezclaAcciones(npc, npc.vel, dt);
    const L2 = f.userData.lim || {};"""


def parche(t, slug):
    if 'BIBLIOTECA DE CLIPS PRESTADOS' in t:
        return t, 'anim(ya)'
    msgs = []
    res = 'AR' if 'const AR = ' in t else 'AG'
    a = 'function ponerModelo(npc){'
    if a not in t:
        return t, 'anim(sin ponerModelo)'
    t = t.replace(a, BIBLIO.replace('@RES@', res).strip('\n') + '\n' + a, 1)
    msgs.append('biblio(' + res + ')')
    for nom, viejo, nuevo in (('poner', PON_VIEJO, PON_NUEVO),
                              ('x0', X0_VIEJO, X0_NUEVO),
                              ('sigue', TICK_VIEJO, TICK_NUEVO),
                              ('mezcla', MEZ_VIEJO, MEZ_NUEVO)):
        if viejo in t:
            t = t.replace(viejo, nuevo, 1); msgs.append(nom)
        else:
            msgs.append(nom + ' NO')
    return t, 'anim[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
