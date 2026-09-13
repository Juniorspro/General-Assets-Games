#!/usr/bin/env python3
"""Parche del MOTOR para los 8 mundos nuevos. Arregla, en los 8 de una:
  1. MANOS: la palma miraba ADELANTE con los dedos abiertos (pose de bind del
     rig). Ahora se rola el antebrazo sobre su propio eje para que la palma
     mire HACIA EL CUERPO, y los brazos se abren lo justo para no cruzarlo.
  2. ESCALADA: la altura de la cámara se fijaba DIRECTO al terreno, así que al
     topar una ladera te teletransportaba arriba. Ahora hay tope de pendiente
     (te deslizás por la ladera en vez de subir de golpe) y la altura del ojo
     se interpola.
Uso: python3 parche_motor.py [slug ...]   (sin args: los 8)
"""
import re, sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']


def parche_brazos(t):
    """brazos: mas separados del cuerpo + rolido del antebrazo para que la
    palma mire adentro/atras (antes miraba adelante, con los dedos abiertos)."""
    if 'ROLL_PALMA' in t:
        return t, 'brazos(ya)'
    # 1) valores por defecto: mas afuera para que el brazo no cruce el torso
    t = t.replace("outX = outX == null ? 0.17 : outX;", "outX = outX == null ? 0.26 : outX;")
    t = t.replace("fwdZ = fwdZ == null ? 0.12 : fwdZ;", "fwdZ = fwdZ == null ? 0.16 : fwdZ;")
    # 2) rolido del antebrazo sobre su eje: gira la palma hacia el cuerpo
    viejo = """  if (A.lf && A.lf.userData.bindQ){ A.lf.quaternion.copy(A.lf.userData.bindQ); A.lf.rotateX(forebend); }
  if (A.rf && A.rf.userData.bindQ){ A.rf.quaternion.copy(A.rf.userData.bindQ); A.rf.rotateX(forebend); }"""
    nuevo = """  /* ROLL_PALMA: el rig viene en A-pose con la PALMA HACIA ADELANTE y los dedos
     abiertos; con el brazo colgando eso se ve como una mano de zombi. Rolamos el
     antebrazo sobre su propio eje (Y del hueso apunta a la mano en estos rigs)
     para que la palma quede mirando al cuerpo, que es como cuelga una mano. */
  if (A.lf && A.lf.userData.bindQ){ A.lf.quaternion.copy(A.lf.userData.bindQ);
    A.lf.rotateX(forebend); A.lf.rotateY(-ROLL_PALMA); }
  if (A.rf && A.rf.userData.bindQ){ A.rf.quaternion.copy(A.rf.userData.bindQ);
    A.rf.rotateX(forebend); A.rf.rotateY(ROLL_PALMA); }
  /* la muneca: se relaja el gesto abierto del bind y se cierra un poco */
  if (A.lh && A.lh.userData.bindQ){ A.lh.quaternion.copy(A.lh.userData.bindQ);
    A.lh.rotateZ(-0.22); A.lh.rotateY(-0.30); }
  if (A.rh && A.rh.userData.bindQ){ A.rh.quaternion.copy(A.rh.userData.bindQ);
    A.rh.rotateZ(0.22); A.rh.rotateY(0.30); }"""
    if viejo not in t:
        return t, 'brazos(NO ENCONTRE)'
    t = t.replace(viejo, nuevo)
    # 3) la constante del rolido, antes de la funcion
    t = t.replace("const _brAim = new T.Vector3()",
                  "const ROLL_PALMA = 1.35;   /* ~77 grados: palma de adelante a adentro */\nconst _brAim = new T.Vector3()")
    # 4) capturar tambien los huesos de la mano
    t = t.replace("""        else if (o.name === 'RightForeArm') arm.rf = o;
      } });""",
                  """        else if (o.name === 'RightForeArm') arm.rf = o;
        else if (o.name === 'LeftHand') arm.lh = o;
        else if (o.name === 'RightHand') arm.rh = o;
      } });""")
    # 4b) idem para los NPC (tienen su propia captura, en una linea)
    t = t.replace("""          else if (o.name === 'RightForeArm') arm.rf = o; } });""",
                  """          else if (o.name === 'RightForeArm') arm.rf = o;
          else if (o.name === 'LeftHand') arm.lh = o;
          else if (o.name === 'RightHand') arm.rh = o; } });""")
    return t, 'brazos OK'


def parche_fisica(t):
    """no mas teletransporte al subir: tope de pendiente + ojo interpolado."""
    if 'PEND_MAX' in t:
        return t, 'fisica(ya)'
    viejo = """  let nx = cl(px + pvx * dt, -MITAD + 6, MITAD - 6);
  let nz = cl(pz + pvz * dt, -MITAD + 6, MITAD - 6);"""
    nuevo = """  let nx = cl(px + pvx * dt, -MITAD + 6, MITAD - 6);
  let nz = cl(pz + pvz * dt, -MITAD + 6, MITAD - 6);
  /* TOPE DE PENDIENTE: antes la altura se fijaba directo al terreno, asi que
     caminar contra una ladera te SUBIA de golpe (parecia teletransporte). Si el
     escalon es mas empinado que PEND_MAX no se sube: se DESLIZA por la ladera
     (se proyecta el movimiento sobre la curva de nivel), que es lo que hace un
     personaje de verdad. */
  {
    const h0 = H(px, pz), h1 = H(nx, nz);
    const dl = Math.hypot(nx - px, nz - pz);
    if (dl > 1e-5 && (h1 - h0) / dl > PEND_MAX){
      /* gradiente del terreno por diferencias finitas */
      const e = 1.2;
      const gx = H(px + e, pz) - H(px - e, pz), gz = H(px, pz + e) - H(px, pz - e);
      const gl = Math.hypot(gx, gz) || 1;
      const ux = gx / gl, uz = gz / gl;              /* cuesta arriba */
      const dvx = nx - px, dvz = nz - pz;
      const proy = dvx * ux + dvz * uz;              /* cuanto va cuesta arriba */
      nx = px + (dvx - ux * proy) * .92;             /* se lo saca: queda el roce */
      nz = pz + (dvz - uz * proy) * .92;
      const h2 = H(nx, nz);
      if ((h2 - h0) / (Math.hypot(nx - px, nz - pz) || 1) > PEND_MAX){ nx = px; nz = pz; }
    }
  }"""
    if viejo not in t:
        return t, 'fisica(NO ENCONTRE)'
    t = t.replace(viejo, nuevo, 1)
    # la altura del ojo se suaviza ACA (fisica tiene dt; ponCam no lo recibe)
    t = t.replace("""  px = nx; pz = nz;
  bobF += dt""", """  px = nx; pz = nz;
  /* la altura del ojo PERSIGUE al suelo en vez de pegarse a el: sin esto, cada
     bache era un tironcito vertical, y una ladera un teletransporte. */
  {
    const hs = H(px, pz);
    ojoY = ojoY == null ? hs : ojoY + (hs - ojoY) * Math.min(1, dt * 9);
    if (Math.abs(hs - ojoY) > 3) ojoY = hs;   /* teleport de guion: sin arrastre */
  }
  bobF += dt""", 1)
    t = t.replace("function fisica(dt){",
                  "const PEND_MAX = 0.80;   /* ~39 grados: mas empinado que esto no se sube */\n"
                  "let ojoY = null;         /* altura del ojo interpolada (sin saltos) */\n"
                  "function fisica(dt){", 1)
    return t, 'fisica OK'


def parche_ojo(t):
    """la camara usa la altura interpolada, no la del terreno cruda."""
    if 'ojoY' not in t:
        return t, 'ojo(sin fisica)'
    viejo = "cam.position.set(ex, H(px, pz) + OJO + Math.abs(Math.sin(bobF)) * .06 * v, ez);"
    if viejo not in t:
        return t, 'ojo(NO ENCONTRE)'
    # ojoY lo calcula fisica(dt); aca solo se lee (ponCam no recibe dt)
    nuevo = "cam.position.set(ex, (ojoY != null ? ojoY : H(px, pz)) + OJO + Math.abs(Math.sin(bobF)) * .06 * v, ez);"
    return t.replace(viejo, nuevo, 1), 'ojo OK'


def parche_cuerpo_y(t):
    """el cuerpo tambien usa la altura interpolada (si no, se hunde/flota)."""
    viejo = "CUERPO.root.position.set(px, H(px, pz), pz);"
    if viejo not in t:
        return t, 'cuerpoY(NO ENCONTRE)'
    if 'CUERPO.root.position.set(px, ojoY' in t:
        return t, 'cuerpoY(ya)'
    return t.replace(viejo, "CUERPO.root.position.set(px, ojoY != null ? ojoY : H(px, pz), pz);", 1), 'cuerpoY OK'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        msgs = []
        for fn in (parche_brazos, parche_fisica, parche_ojo, parche_cuerpo_y):
            t, m = fn(t)
            msgs.append(m)
        open(p, 'w', encoding='utf8').write(t)
        print(f"{s:10} " + ' · '.join(msgs))


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
