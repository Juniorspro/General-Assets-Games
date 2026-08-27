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
 # (especie, cuantos, alto, sombra). Presupuesto en triangulos Y en DIBUJADOS:
 # cada clon GLB es su propio dibujado, asi que la cantidad tambien se paga ahi.
 #
 # 'hueco' (arcade/m-agujero-arbol) NO SE USA: es de baja resolucion y se veia
 # como un globo verde. La vegetacion baja la pone el matorral GLB en poca
 # cantidad (pesa 30 mil triangulos por copia) mas la maleza instanciada que ya
 # trae cada mundo, que es barata y no tiene ese problema de silueta.
 'dunas': [                       # el oasis son las palmeras
   ('palmera', 12, 12.0, True), ('seco', 5, 7.0, True), ('matorral', 6, 2.2, False),
 ],
 'jungla': [                      # selva cerrada; el fondo lo llena el relleno
   ('selva', 62, 19.0, True), ('palmera', 5, 12.0, True), ('matorral', 8, 2.6, False),
 ],
 'volcan': [                      # el volcan tiene que estar pelado
   ('seco', 7, 7.5, True), ('matorral', 6, 2.0, False),
 ],
 'pantano': [                     # cipreses altos
   ('selva', 44, 15.0, True), ('arbol3', 3, 14.0, True), ('matorral', 8, 2.4, False),
 ],
 'canon': [                       # ralo, en las terrazas
   ('selva', 26, 9.0, True), ('seco', 6, 7.0, True), ('matorral', 6, 2.2, False),
 ],
 'estepa': [                      # la inmensidad es el tema, casi sin arbol
   ('seco', 8, 7.5, True), ('matorral', 8, 1.9, False),
 ],
 'acropolis': [                   # olivar retorcido del santuario
   ('arbol3', 9, 6.5, True), ('matorral', 7, 2.1, False),
 ],
 'secuoya': [                     # los mas altos del juego
   ('selva', 52, 30.0, True), ('arbol2', 3, 26.0, True), ('matorral', 8, 2.4, False),
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
  /* triangulos por modelo, medidos del propio GLB: sin esto es facil clonar
     cuarenta veces una malla de treinta mil y fundir el telefono */
  const TRIM = { "g3/mdl-palm.glb": 28763, "reliquia/tree1.glb": 30498, "reliquia/tree2.glb": 29945, "reliquia/tree3.glb": 29657, "hyper/p-tree.glb": 5020, "arcade/m-agujero-arbol.glb": 1306, "aero/tree.glb": 26288, "aero/bush.glb": 30867, "reliquia/bush.glb": 30648, "reliquia/obs-log.glb": 30824, "reliquia/obs-totem.glb": 30373 };
  const bosque = (url, n, alto, sombra, choque, margen) => {
    const l = [];
    for (let i = 0; i < n; i++){ const p = sitioA(margen); if (p) l.push(p); }
    propMuchos(url, l, { altoObjetivo: alto, sombra,
      choque: choque > 0 ? choque : 0 });
    window.__ARBOLES = (window.__ARBOLES || 0) + l.length;
    window.__TRI_ARB = (window.__TRI_ARB || 0) + l.length * (TRIM[url] || 0);
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
