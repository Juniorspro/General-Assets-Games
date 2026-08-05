#!/usr/bin/env python3
"""ARBOLES GLB DE VERDAD, en lugar de cartulinas.

Lo que habia estaba mal de dos maneras:
  · los IMPOSTORES en X (tres cuadros cruzados con una foto recortada) se ven
    como carton pintado en cuanto te acercas, y
  · en JUNGLA la vegetacion instanciada eran siluetas planas de hojas, que de
    cerca son papel.
Aca se saca todo eso y se planta la BIBLIOTECA GLB del repo, que son mallas de
verdad con tronco, ramas y raices: once modelos entre arboles, arbustos, troncos
caidos y la palmera. Se clonan con propMuchos(), que ya escala al alto que pide
el mundo, apoya en el suelo y respeta el recorte por frustum.
Uso: python3 parche_arboles.py [slug ...]"""
import re, sys

M = '/home/user/General-Assets-Games/assets/mundos/'

# la biblioteca: url, alto en metros, radio de choque
#   los GLB viven fuera de assets/mundos, asi que se resuelven con AR()/AG()
ARB_GLB = {
 'palmera':  ('g3/mdl-palm.glb',            13.0, 1.0),
 'arbol1':   ('reliquia/tree1.glb',         14.0, 1.2),
 'arbol2':   ('reliquia/tree2.glb',         15.5, 1.2),
 'arbol3':   ('reliquia/tree3.glb',         13.0, 1.1),
 'selva':    ('hyper/p-tree.glb',           17.0, 1.3),
 'hueco':    ('arcade/m-agujero-arbol.glb', 11.0, 1.4),
 'seco':     ('aero/tree.glb',               8.5, 0.9),
 'mata':     ('aero/bush.glb',               1.9, 0.0),
 'matorral': ('reliquia/bush.glb',           2.3, 0.0),
 'tronco':   ('reliquia/obs-log.glb',        2.4, 1.0),
 'totem':    ('reliquia/obs-totem.glb',      4.6, 0.9),
}

# por mundo: [(especie, cuantos, alto, sombra)] — el alto pisa el de la tabla
PLAN = {
 'dunas': [                      # oasis de palmeras GLB + matas secas
   ('palmera', 26, 12.0, True), ('seco', 16, 7.0, True), ('mata', 60, 1.7, False),
 ],
 'jungla': [                      # selva cerrada: mucho arbol alto y sotobosque
   ('selva', 46, 19.0, True), ('arbol2', 30, 16.0, True), ('arbol1', 26, 14.0, True),
   ('hueco', 14, 12.0, True), ('palmera', 22, 11.0, True),
   ('matorral', 120, 2.4, False), ('mata', 130, 2.0, False), ('tronco', 10, 2.4, False),
 ],
 'volcan': [                      # lo que aguanta la ceniza: seco y ralo
   ('seco', 26, 7.5, True), ('mata', 60, 1.7, False), ('tronco', 8, 2.3, False),
 ],
 'pantano': [                      # cipreses y juncos: arbol alto + mucha mata
   ('arbol3', 34, 14.0, True), ('selva', 20, 17.0, True),
   ('matorral', 130, 2.5, False), ('tronco', 12, 2.4, False),
 ],
 'canon': [                       # olivos y arbustos en las terrazas
   ('arbol1', 24, 8.5, True), ('seco', 18, 7.0, True),
   ('matorral', 70, 2.2, False), ('mata', 60, 1.7, False),
 ],
 'estepa': [                      # casi nada de arbol: la inmensidad es el tema
   ('seco', 22, 7.5, True), ('arbol1', 12, 9.0, True), ('mata', 150, 1.5, False),
 ],
 'acropolis': [                   # olivar del santuario
   ('arbol3', 40, 6.5, True), ('mata', 90, 1.8, False), ('totem', 14, 5.0, True),
 ],
 'secuoya': [                     # bosque de gigantes: los mas altos del juego
   ('selva', 44, 30.0, True), ('arbol2', 34, 24.0, True), ('arbol1', 26, 20.0, True),
   ('hueco', 12, 14.0, True), ('matorral', 140, 2.4, False), ('tronco', 14, 2.4, False),
 ],
}

JS = """
/* ========================= ARBOLES GLB DE VERDAD ==========================
   Antes esto eran CARTULINAS: tres cuadros cruzados con una foto recortada. De
   lejos pasaban, de cerca eran papel pintado. Ahora se plantan los GLB del
   repo, que son mallas con tronco, ramas y raices.
   Se reparten alrededor de los lugares del mundo (nunca ENCIMA, que ahi va lo
   construido) con un azar determinista: el mismo mundo tiene siempre el mismo
   bosque, asi el mapa se puede aprender. */
{
  let semA = @SEM@;
  const azA = () => { semA = (semA * 1103515245 + 12345) & 0x7fffffff; return semA / 0x7fffffff; };
  const LUGA = Object.values(POI);
  /* un sitio libre: cerca de algun lugar pero fuera de su explanada, dentro del
     mapa y sin pisar lo que ya se planto */
  const puestos = [];
  function sitioA(margen){
    for (let intento = 0; intento < 30; intento++){
      const L = LUGA[(azA() * LUGA.length) | 0];
      const a = azA() * 6.2832, d = (L.pr || 24) * (1.2 + azA() * 3.6);
      const x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d;
      if (Math.abs(x) > MITAD - 22 || Math.abs(z) > MITAD - 22) continue;
      let mal = false;
      for (const P of LUGA) if (Math.hypot(x - P.x, z - P.z) < (P.pr || 24) * .92){ mal = true; break; }
      if (!mal && margen > 0)
        for (const q of puestos) if (Math.hypot(x - q[0], z - q[1]) < margen){ mal = true; break; }
      if (!mal){ puestos.push([x, z]); return [x, z, 1, azA() * 6.283]; }
    }
    return null;
  }
  const bosque = (url, n, alto, sombra, choque, margen) => {
    const l = [];
    for (let i = 0; i < n; i++){ const p = sitioA(margen); if (p) l.push(p); }
    propMuchos(url, l, { altoObjetivo: alto, sombra,
      choque: choque > 0 ? choque : 0 });
    window.__ARBOLES = (window.__ARBOLES || 0) + l.length;
  };
@SIEMBRA@
}
"""


def parche(t, slug):
    if slug not in PLAN:
        return t, 'arb(no toca)'
    msgs = []
    # 1) FUERA los impostores en X y sus troncos de cilindro
    i = t.find('\n/* ======================= VEGETACION CON VOLUMEN')
    if i >= 0:
        j = t.index('  window.__VEG = nVeg;\n}\n', i) + len('  window.__VEG = nVeg;\n}\n')
        t = t[:i] + t[j:]
        msgs.append('fuera-impostores')
    if '/* ========================= ARBOLES GLB' in t:
        return t, 'arb(ya)'
    # 2) el bosque GLB
    lin = []
    for esp, n, alto, sombra in PLAN[slug]:
        url, _alto, choque = ARB_GLB[esp]
        margen = max(3.0, alto * .45)
        lin.append("  bosque('%s', %d, %s, %s, %s, %s);   /* %s */"
                   % (url, n, alto, 'true' if sombra else 'false', choque, margen, esp))
    js = (JS.replace('@SIEMBRA@', '\n'.join(lin))
            .replace('@SEM@', str(sum(ord(c) * (i + 5) for i, c in enumerate(slug)) * 31 + 7)))
    # va donde estaba la vegetacion: despues de la recoleccion (ya hay POI, H,
    # ARB, MITAD y propMuchos)
    for a in ('window.__RECOL = RECOL;', 'window.__MISION = MISION;'):
        if a in t:
            t = t.replace(a, a + js, 1); msgs.append('bosque%d' % len(PLAN[slug]))
            break
    else:
        return t, 'arb(sin ancla)'
    return t, 'arb[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(PLAN))
