#!/usr/bin/env python3
"""RETARGET de los clips prestados.

El problema, medido en una pagina de prueba: el clip prestado ata el 100% de sus
72 pistas al personaje generado (los nombres de hueso coinciden), pero al
reproducirlo los CODOS SE VAN PARA AFUERA y los antebrazos se doblan hacia
arriba. No es que el clip no ate: es que ata de mas.

Por que: una pista de animacion de glTF guarda la rotacion LOCAL ABSOLUTA de
cada hueso en cada instante, no un delta respecto de su reposo. Si el modelo
donante y el destino comparten la jerarquia de huesos pero tienen distinta POSE
DE REPOSO —y eso pasa porque el rig se ajusta a cada malla— aplicar el clip tal
cual reemplaza la pose del destino por la del donante y la deformacion se suma
dos veces.

El arreglo es el retarget de manual:
    delta   = inversa(reposoDonante) * clip
    destino = reposoDestino * delta
o sea, se le saca al clip la pose de reposo del donante y se le pone la del
destino. Para eso hace falta la pose de reposo DEL DONANTE, que viaja dentro del
propio GLB de solo-animacion (extrae_clip.py conserva los nodos con su
transformada), asi que no hay que sumar ningun archivo.

Las pistas de POSICION se tratan igual, en delta: si no, la cadera del donante
teletransporta al destino a su propia altura y el personaje flota o se hunde.
Uso: python3 parche_retarget.py [slug ...]"""
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

RETARGET = r"""
/* ======================== RETARGET DE LOS CLIPS ===========================
   Una pista de glTF guarda la rotacion LOCAL ABSOLUTA del hueso, no un delta
   respecto de su reposo. Los personajes comparten los nombres de hueso pero NO
   la pose de reposo (el rig se ajusta a cada malla), asi que aplicar el clip tal
   cual le reemplaza la pose de reposo por la del donante y la deformacion se
   suma dos veces: los codos se van para afuera y los antebrazos se doblan.
   Se convierte el clip al reposo del destino:
       delta   = inv(reposoDonante) * clip
       destino = reposoDestino * delta
   La pose de reposo del donante viaja dentro del propio GLB de solo-animacion,
   asi que no hace falta ningun archivo de mas. */
const _rtQd = new T.Quaternion(), _rtCorr = new T.Quaternion(), _rtQ = new T.Quaternion();
function reposoDe(raiz){
  const R = {};
  raiz.traverse(o => {
    if (o.isBone || o.type === 'Bone' || R[o.name] === undefined)
      R[o.name] = { q: o.quaternion.clone(), p: o.position.clone() };
  });
  return R;
}
function retargetClip(clip, restDon, modelo){
  if (!clip || !restDon) return clip;
  const restDst = reposoDe(modelo);
  const c2 = clip.clone();
  for (const tr of c2.tracks){
    const i = tr.name.lastIndexOf('.');
    if (i < 0) continue;
    const nom = tr.name.slice(0, i), prop = tr.name.slice(i + 1);
    const rd = restDon[nom], rt = restDst[nom];
    if (!rd || !rt) continue;
    if (prop === 'quaternion'){
      _rtCorr.copy(rt.q).multiply(_rtQd.copy(rd.q).invert());
      for (let k = 0; k < tr.values.length; k += 4){
        _rtQ.set(tr.values[k], tr.values[k + 1], tr.values[k + 2], tr.values[k + 3]);
        _rtQ.premultiply(_rtCorr);
        tr.values[k] = _rtQ.x; tr.values[k + 1] = _rtQ.y;
        tr.values[k + 2] = _rtQ.z; tr.values[k + 3] = _rtQ.w;
      }
    } else if (prop === 'position'){
      /* en delta: si no, la cadera del donante lleva al destino a SU altura y
         el personaje flota o se hunde en el suelo */
      for (let k = 0; k < tr.values.length; k += 3){
        tr.values[k]     += rt.p.x - rd.p.x;
        tr.values[k + 1] += rt.p.y - rd.p.y;
        tr.values[k + 2] += rt.p.z - rd.p.z;
      }
    }
  }
  return c2;
}
"""


def parche(t, slug):
    if 'retargetClip' in t:
        return t, 'retarget(ya)'
    msgs = []
    # 1) la funcion, antes de armarAcciones
    a = "/* le arma a un personaje las tres acciones"
    if a not in t:
        return t, 'retarget(sin ancla)'
    t = t.replace(a, RETARGET.strip('\n') + '\n' + a, 1)
    msgs.append('fn')

    # 2) los donantes guardan TAMBIEN su pose de reposo
    t = t.replace("""    new GLTF().load(u, g => {
      if (g.animations && g.animations.length) CLIPS[k] = g.animations[0];
      fin();
    }, undefined, fin);""",
"""    new GLTF().load(u, g => {
      if (g.animations && g.animations.length){
        CLIPS[k] = g.animations[0];
        /* la POSE DE REPOSO del donante: sin esto no se puede retargetear */
        CLIPS[k + 'Rest'] = reposoDe(g.scene);
      }
      fin();
    }, undefined, fin);""", 1)
    msgs.append('reposo' if "Rest'] = reposoDe" in t else 'reposo NO')

    # 3) armarAcciones retargetea lo prestado (lo propio ya viene en su reposo)
    t = t.replace("""  const cQuieto = buscar(/idle|quiet/i) || CLIPS.quieto;
  const cAndar  = buscar(/walk|camin/i) || CLIPS.andar;
  const cCorrer = buscar(/run|corr/i)   || CLIPS.correr || cAndar;""",
"""  /* lo PROPIO ya viene en su propio reposo: no se toca. Lo PRESTADO se
     retargetea al reposo de este modelo. */
  const pQuieto = buscar(/idle|quiet/i), pAndar = buscar(/walk|camin/i),
        pCorrer = buscar(/run|corr/i);
  const cQuieto = pQuieto || retargetClip(CLIPS.quieto, CLIPS.quietoRest, m);
  const cAndar  = pAndar  || retargetClip(CLIPS.andar,  CLIPS.andarRest,  m);
  const cCorrer = pCorrer || retargetClip(CLIPS.correr, CLIPS.correrRest, m) || cAndar;""", 1)
    msgs.append('usa' if 'retargetClip(CLIPS.andar' in t else 'usa NO')
    return t, 'retarget[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
