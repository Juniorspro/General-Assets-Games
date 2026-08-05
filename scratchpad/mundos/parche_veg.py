#!/usr/bin/env python3
"""VEGETACION con volumen para los mundos que estaban pelados. CANON, ESTEPA,
ACROPOLIS y SECUOYA salieron del clon sin un solo prop GLB; JUNGLA tenia arboles
del repo pero ninguno de selva de verdad.

Dos tecnicas, cada una donde sirve:
  · IMPOSTORES: la planta generada, recortada a alfa, en TRES cuadrilateros
    cruzados. Es lo que usan los juegos grandes para vegetacion densa: da
    silueta y parallax por muy poco costo, y con InstancedMesh entran cientos.
  · TRONCOS DE VERDAD: para lo que se camina alrededor (las secuoyas gigantes y
    las columnas del santuario) un cuadro plano canta, asi que van cilindros con
    la corteza/marmol generado como textura repetida.
Uso: python3 parche_veg.py [slug ...]"""
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'

# por mundo: lista de siembras
#   ('imp', archivo, cuantos, alto, variacion, radio_choque, semilla_lugar)
#   ('tronco', textura, cuantos, alto, radio, color)
PLAN = {
 'jungla': [
   ('imp', 'arbol-jungla.png', 46, 17.0, .38, 1.3, 'todo'),
   ('imp', 'helecho.png', 150, 2.2, .45, 0, 'todo'),
 ],
 'secuoya': [
   ('tronco', 'corteza-secuoya.jpg', 34, 46.0, 2.5, 0xb08050),
   ('imp', 'helecho.png', 170, 2.4, .5, 0, 'todo'),
   ('imp', 'arbol-jungla.png', 26, 13.0, .35, 1.2, 'todo'),
 ],
 'acropolis': [
   ('tronco', 'marmol-columna.jpg', 18, 9.0, .62, 0xece4d2),
   ('imp', 'olivo.png', 54, 5.2, .4, 1.0, 'todo'),
 ],
 'estepa': [
   ('imp', 'olivo.png', 30, 4.4, .45, .9, 'todo'),
   ('imp', 'helecho.png', 90, 1.5, .5, 0, 'todo'),
 ],
 'canon': [
   ('imp', 'olivo.png', 34, 4.0, .45, .9, 'todo'),
   ('imp', 'helecho.png', 70, 1.6, .5, 0, 'todo'),
 ],
 'pantano': [
   ('imp', 'helecho.png', 120, 2.6, .5, 0, 'todo'),
   ('imp', 'arbol-jungla.png', 22, 14.0, .35, 1.2, 'todo'),
 ],
}

JS = """
/* ======================= VEGETACION CON VOLUMEN ===========================
   Antes este mundo no tenia un solo arbol de verdad: solo el ruido del terreno.
   Dos tecnicas, cada una donde corresponde.

   1) IMPOSTOR: la planta generada, recortada a alfa, en TRES cuadros cruzados a
      60 grados. De frente se ve la silueta entera; al caminar alrededor los tres
      planos se relevan y da parallax. Es lo que hacen los juegos grandes para
      vegetacion densa, y con InstancedMesh entran cientos por un dibujo.
      alphaTest (no transparent) para que ordene bien contra el terreno.
   2) TRONCO: para lo que se camina alrededor (las secuoyas, las columnas) un
      cuadro plano canta, asi que va cilindro con la corteza generada repetida.
*/
const VEG = (() => {
  let sem = @SEM@;
  const az = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff; };
  const LUG = Object.values(POI);
  /* un sitio al azar cerca de algun lugar del mundo, sin encimarse a los POI
     (que ahi va lo construido) ni salirse del mapa */
  function sitio(){
    for (let intento = 0; intento < 24; intento++){
      const L = LUG[(az() * LUG.length) | 0];
      const a = az() * 6.2832, d = (L.pr || 24) * (1.25 + az() * 3.4);
      const x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d;
      if (Math.abs(x) > MITAD - 20 || Math.abs(z) > MITAD - 20) continue;
      let choca = false;
      for (const P of LUG) if (Math.hypot(x - P.x, z - P.z) < (P.pr || 24) * .95){ choca = true; break; }
      if (!choca) return [x, z];
    }
    return null;
  }
  const CRUCE = (() => {                 /* tres planos cruzados, ya unidos */
    const g = [];
    for (let k = 0; k < 3; k++){
      const p = new T.PlaneGeometry(1, 1);
      p.translate(0, .5, 0);
      p.rotateY(k * 1.0472);
      g.push(p);
    }
    /* unir a mano: tres planos = 3 dibujos si van sueltos */
    const pos = [], uv = [], nor = [], idx = [];
    let base = 0;
    for (const p of g){
      pos.push(...p.attributes.position.array);
      uv.push(...p.attributes.uv.array);
      nor.push(...p.attributes.normal.array);
      for (const i of p.index.array) idx.push(i + base);
      base += p.attributes.position.count;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);
    return geo;
  })();
  function impostor(arch, n, alto, varia, choque){
    const tex = new T.TextureLoader().load(AX('veg/' + arch));
    tex.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshLambertMaterial({ map: tex, alphaTest: .42,
      side: T.DoubleSide });
    const im = new T.InstancedMesh(CRUCE, mat, n);
    im.castShadow = SOMBRAS && alto > 6;      /* la hojarasca no proyecta */
    im.receiveShadow = true;
    im.frustumCulled = false;                 /* el volumen abarca el mapa */
    const M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler();
    const V = new T.Vector3(), S = new T.Vector3();
    let k = 0;
    for (let i = 0; i < n; i++){
      const p = sitio(); if (!p) continue;
      const h = alto * (1 - varia + az() * varia * 2);
      E.set(0, az() * 6.2832, 0); Q.setFromEuler(E);
      V.set(p[0], H(p[0], p[1]) - .06, p[1]);
      S.set(h * .72, h, h * .72);
      im.setMatrixAt(k++, M4.compose(V, Q, S));
      if (choque > 0) ARB.push([p[0], p[1], choque]);
    }
    im.count = k;
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    return k;
  }
  function troncos(arch, n, alto, radio, color){
    const tex = new T.TextureLoader().load(AX('veg/' + arch));
    tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(2, Math.max(2, Math.round(alto / (radio * 5))));
    const mat = new T.MeshLambertMaterial({ map: tex, color });
    /* abierto arriba y abajo: nadie ve las tapas y son la mitad de los triangulos */
    const geo = new T.CylinderGeometry(radio * .62, radio, alto, 11, 1, true);
    geo.translate(0, alto / 2, 0);
    const im = new T.InstancedMesh(geo, mat, n);
    im.castShadow = SOMBRAS; im.receiveShadow = true;
    im.frustumCulled = false;
    const M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler();
    const V = new T.Vector3(), S = new T.Vector3();
    let k = 0;
    for (let i = 0; i < n; i++){
      const p = sitio(); if (!p) continue;
      const e = .72 + az() * .62;
      /* una inclinacion chica: un bosque de troncos a plomo parece un decorado */
      E.set((az() - .5) * .05, az() * 6.2832, (az() - .5) * .05);
      Q.setFromEuler(E);
      V.set(p[0], H(p[0], p[1]) - .3, p[1]);
      S.set(e, e * (.85 + az() * .4), e);
      im.setMatrixAt(k++, M4.compose(V, Q, S));
      ARB.push([p[0], p[1], radio * e * 1.05]);
    }
    im.count = k;
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    return k;
  }
  return { impostor, troncos };
})();
{
  let nVeg = 0;
@SIEMBRA@
  window.__VEG = nVeg;
}
"""


def parche(t, slug):
    if slug not in PLAN:
        return t, 'veg(no toca)'
    if 'const VEG = (() =>' in t:
        return t, 'veg(ya)'
    lin = []
    for p in PLAN[slug]:
        if p[0] == 'imp':
            _, arch, n, alto, varia, choque, _lug = p
            lin.append("  nVeg += VEG.impostor('%s', %d, %s, %s, %s);"
                       % (arch, n, alto, varia, choque))
        else:
            _, arch, n, alto, radio, color = p
            lin.append("  nVeg += VEG.troncos('%s', %d, %s, %s, 0x%06x);"
                       % (arch, n, alto, radio, color))
    js = (JS.replace('@SIEMBRA@', '\n'.join(lin))
            .replace('@SEM@', str(sum(ord(c) * (i + 13) for i, c in enumerate(slug)) * 7 + 101)))
    # va DESPUES de la recoleccion: ya estan POI, H, ARB, SOMBRAS, AX y MITAD
    a = 'window.__RECOL = RECOL;'
    if a not in t:
        return t, 'veg(sin ancla)'
    t = t.replace(a, a + js, 1)
    # el MIOS del mundo tiene que servir veg/ por rama (son archivos nuevos)
    t = t.replace("|^prop\\/%s/;" % slug, "|^prop\\/%s|^veg\\//;" % slug, 1)
    return t, 'veg[%d siembras]' % len(PLAN[slug])


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(PLAN))
