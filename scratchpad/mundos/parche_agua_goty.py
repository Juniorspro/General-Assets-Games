#!/usr/bin/env python3
"""EL AGUA DE PANTANO, ADAPTADA A CADA MUNDO.

Lo que tenian estos cinco era un DISCO PLANO con una textura de agua desplazandose:
`CircleGeometry` + `map.offset += dt`. Eso no tiene olas —un CircleGeometry es un
abanico: un vertice en el centro y el resto en el borde, no hay vertices por dentro
que puedan moverse—, ni bajio, ni orilla: el canto es un poligono seco. Al lado del
agua del PANTANO, que si tiene ola, profundidad y alga lamiendo la orilla, se ve
como un charco de pintura.

Se les pone el mismo tratamiento y se les cambia solo la PALETA:

  · la OLA en el vertice, con dominio deformado (la posicion se tuerce con dos
    senos lentos antes de calcular la altura, asi las crestas serpentean en vez de
    ser rectas) y aplanandose al llegar a la orilla;
  · la MASA por profundidad: color de bajio en el canto, color de hondo en el
    medio, con la mezcla suave;
  · la ORILLA se DESVANECE en alfa, asi no hay corte poligonal;
  · la NORMAL sale del gradiente de tres capas de ruido a distinta escala y
    velocidad, que es lo que hace que el reflejo se rompa en rizos en vez de ser
    un espejo de chapa;
  · y el reflejo real (el Reflector que ya estaba) sigue debajo: la ola le rompe la
    imagen, que es exactamente lo que hace el agua.

Y la GEOMETRIA pasa de CircleGeometry a PlaneGeometry de 40x40: hacen falta
vertices por dentro para que la ola exista. El borde circular ya no lo da la
geometria sino el desvanecido de alfa, que ademas queda mejor.

PALETAS. La del cañon es la que se pidio: marron de barro en el bajio —es un rio
de canon rojo, arrastra tierra— y verde oscuro en el hondo, que es el "pozo verde"
del guion. Las otras cuatro salen del sitio: pozo de arena, remanso de estepa,
cisterna de caliza y poza de bosque.
"""
import pathlib, re, sys

A = pathlib.Path('/home/user/mundos/assets')

# mundo: (radio, hondo, bajio, ola, rugosidad, opacidad)
PAL = {
    'canon':     (22.0, '.055,.115,.085', '.30,.20,.125', .085, .30),
    'dunas':     ( 9.0, '.055,.20,.235',  '.42,.40,.30',  .045, .18),
    'estepa':    (22.0, '.05,.14,.145',   '.26,.28,.185', .075, .26),
    'acropolis': (22.0, '.045,.145,.16',  '.34,.36,.32',  .07,  .22),
    'secuoya':   (21.0, '.04,.115,.10',   '.16,.24,.145', .065, .28),
}

SHADER = """  /* ================== EL AGUA, CON OLA Y ORILLA ==================
     Antes era un disco con la textura corriendose: `CircleGeometry` + map.offset.
     Eso no puede tener olas —un CircleGeometry es un abanico, un vertice en el
     centro y el resto en el borde: no hay vertices por dentro que puedan moverse—
     ni bajio ni orilla, y el canto era un poligono seco. Este es el mismo
     tratamiento del agua del PANTANO con la paleta de ESTE sitio.
     La geometria pasa a PlaneGeometry de 40x40 porque la ola necesita vertices
     por dentro; el borde circular lo da ahora el desvanecido de alfa, que ademas
     no tiene canto. */
  const AGUAU = { value: 0 };
  window.__AGUAU = AGUAU;
  const R_AGUA = RADIO_AGUA;
  aguaMat = new T.MeshStandardMaterial({ color: 0xHONDO_HEX, roughness: RUGOS,
    metalness: .55, map: TX.agua, transparent: true, opacity: .96,
    envMapIntensity: .5 });
  aguaMat.map.repeat.set(7, 7);
  aguaMat.onBeforeCompile = sh => {
    sh.uniforms.uT = AGUAU;
    sh.uniforms.tOla = { value: TX.agua };
    aguaMat.userData.sh = sh;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\\nuniform float uT;varying vec2 vWp;varying float vD;varying float vProf;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vWp = position.xy;
        /* PROFUNDIDAD por radio: 0 en la orilla, 1 en el medio. Sin mapa de
           profundidad porque esto es una poza, no un mapa de agua. */
        vProf = smoothstep(1.0, 0.55, length(position.xy) / ${R_AGUA_JS});
        /* DOMINIO DEFORMADO: la posicion se tuerce con dos senos lentos antes de
           calcular la ola, asi las crestas serpentean en vez de ser rectas. */
        vec2 pw = position.xy + vec2(sin(position.y * .21 + uT * .27),
                                     cos(position.x * .17 - uT * .21)) * 2.4;
        float hh = sin(pw.x * .52 + uT * .95) * .34
                 + cos(pw.y * .44 - uT * .78) * .28
                 + sin((pw.x + pw.y) * .95 + uT * 1.4) * .17;
        hh *= OLA_AMP * smoothstep(0.0, 0.35, vProf);   /* se aplana en la orilla */
        transformed.z += hh;
        vD = -(modelViewMatrix * vec4(transformed, 1.0)).z;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\\nuniform float uT;uniform sampler2D tOla;varying vec2 vWp;varying float vD;varying float vProf;')
      /* OJO CON EL ORDEN: color_fragment y roughnessmap corren ANTES que
         normal_fragment_begin. Todo el calculo se hace aca y la normal solo
         CONSUME el gradiente despues. */
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 aguaG;
        {
          /* tres capas de rizo a distinta escala y velocidad; la normal sale de su
             GRADIENTE, que es lo que rompe el reflejo en vez de teñirlo */
          float lejos = clamp(1.0 - vD / 140.0, .35, 1.0);
          vec2 uvA = vWp * .085 + vec2(uT * .016,  uT * .011);
          vec2 uvB = vWp * .27  + vec2(-uT * .026, uT * .021);
          vec2 uvC = vWp * .74  + vec2(uT * .038, -uT * .031);
          float e2 = .02;
          float n1 = texture2D(tOla, uvA).r, n2 = texture2D(tOla, uvB).r, n3 = texture2D(tOla, uvC).r;
          aguaG = vec2(
            (texture2D(tOla, uvA + vec2(e2, 0.)).r - n1) * 2.1 +
            (texture2D(tOla, uvB + vec2(e2, 0.)).r - n2) * 2.6 +
            (texture2D(tOla, uvC + vec2(e2, 0.)).r - n3) * 1.5,
            (texture2D(tOla, uvA + vec2(0., e2)).r - n1) * 2.1 +
            (texture2D(tOla, uvB + vec2(0., e2)).r - n2) * 2.6 +
            (texture2D(tOla, uvC + vec2(0., e2)).r - n3) * 1.5) * lejos;
        }
        /* MASA: color de bajio en el canto -> color de hondo en el medio */
        diffuseColor.rgb = mix(vec3(BAJIO_RGB), vec3(HONDO_RGB),
                               smoothstep(0.0, 0.62, vProf));
        /* y la ORILLA se desvanece: nada de corte poligonal seco */
        diffuseColor.a *= smoothstep(0.0, 0.16, vProf);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        /* en el bajio el agua es mas mate: hay barro y espuma, no espejo */
        roughnessFactor = mix(.86, roughnessFactor, smoothstep(0.0, 0.5, vProf));`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        normal = normalize(normal + vec3(aguaG.x, aguaG.y, 0.0));`);
  };
"""


def aplica(w):
    rad, hondo, bajio, ola, rug = PAL[w]
    rel = 'mundos/%s.html' % w
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []
    if 'window.__AGUAU' in s:
        print('  %s: ya estaba' % rel); return False

    # 1) el material: se reemplaza el bloque entero de creacion
    m = re.search(r"  aguaMat = new T\.MeshStandardMaterial\(\{[^;]*?\}\);\n"
                  r"  aguaMat\.map\.repeat\.set\([0-9]+, [0-9]+\);\n", s, re.S)
    if not m:
        err.append('no encuentro la creacion del material del agua')
    else:
        hondo_hex = '%02x%02x%02x' % tuple(int(float(c) * 255) for c in hondo.split(','))
        blo = (SHADER.replace('RADIO_AGUA', '%.1f' % rad)
                     .replace('${R_AGUA_JS}', '${R_AGUA.toFixed(1)}')
                     .replace('0xHONDO_HEX', '0x' + hondo_hex)
                     .replace('RUGOS', '%.2f' % rug)
                     .replace('OLA_AMP', '%.3f' % ola)
                     .replace('BAJIO_RGB', bajio)
                     .replace('HONDO_RGB', hondo))
        s = s[:m.start()] + blo + s[m.end():]

    # 2) la geometria: hacen falta vertices por dentro
    m2 = re.search(r"  aguaMesh = new T\.Mesh\(new T\.CircleGeometry\(([A-Za-z0-9_.]+), [0-9]+\), aguaMat\);", s)
    if not m2:
        err.append('no encuentro la malla del agua')
    else:
        s = (s[:m2.start()] +
             "  /* PlaneGeometry y no CircleGeometry: la ola vive en los vertices y un\n"
             "     abanico no tiene vertices por dentro. El borde circular lo da el alfa. */\n"
             "  aguaMesh = new T.Mesh(new T.PlaneGeometry(R_AGUA * 2, R_AGUA * 2, 40, 40), aguaMat);"
             + s[m2.end():])

    # 3) el reloj de la ola, donde ya se corria la textura
    A3 = "    if (aguaMat.map){ aguaMat.map.offset.x += dt * .013; aguaMat.map.offset.y += dt * .009; }"
    B3 = ("    /* el reloj de la ola. La textura ya no se corre a mano: la mueve el\n"
          "       sombreador, en tres capas y a tres velocidades. */\n"
          "    if (window.__AGUAU) window.__AGUAU.value += dt;")
    if s.count(A3) == 1:
        s = s.replace(A3, B3, 1)
    else:
        err.append('el corrimiento de la textura del agua aparece %d veces' % s.count(A3))

    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); return False
    if s == o:
        print('  %s: sin cambios' % rel); return False
    p.write_text(s, encoding='utf-8')
    print('  %s: agua con ola y orilla (%+d bytes)' % (rel, len(s) - len(o)))
    return True


ok = 0
for w in ['canon', 'dunas', 'estepa', 'acropolis', 'secuoya']:
    ok += 1 if aplica(w) else 0
print('%d de 5' % ok)
sys.exit(0 if ok == 5 else 1)
