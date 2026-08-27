#!/usr/bin/env python3
"""SUELO SIN REJILLA, de verdad esta vez.

Lo que habia no podia funcionar, y se ve por que en cuanto se miran las frecuencias:

  - las DOS muestras estaban alineadas a los ejes (la segunda giraba 90 grados, que
    en una textura sigue siendo alineada), y a escalas emparentadas (1 y 0,37);
  - la mascara que las cruzaba corria a `ruido_(uvw * 3.1)`, y uvw es el uv GLOBAL
    del mapa de 900 m: eso es una manchita cada 290 m, o sea CONSTANTE en lo que
    entra en pantalla. Con la mascara constante se ve una sola muestra, y una sola
    muestra alineada es exactamente la rejilla de la captura.

Ahora el parche de textura lleva DESPLAZAMIENTO Y GIRO PROPIOS POR CELDA y se
cruzan las cuatro celdas vecinas con pesos bilineales elevados a una potencia. Al
tener cada celda su propio origen y su propio angulo no hay periodo que el ojo
pueda encontrar: es teselado estocastico, la solucion de siempre para esto.

Cuesta cuatro muestras en vez de dos, asi que en BAJOS se queda en una sola con
giro por celda (una muestra bien desalineada ya rompe la rejilla mas obvia) y el
presupuesto no se mueve. La variacion de brillo tambien sube de frecuencia: a
5,7 sobre el mapa entero era un solo manchon y no rompia nada.
"""
import pathlib

D = pathlib.Path('/home/user/mundos/assets/mundos')
MUNDOS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

VIEJO = """      float h21_(vec2 p){ return fract(sin(dot(p, vec2(41.31, 289.07))) * 43758.5453); }
      float ruido_(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21_(i), h21_(i + vec2(1.0, 0.0)), f.x),
                   mix(h21_(i + vec2(0.0, 1.0)), h21_(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      vec3 sinGrilla_(sampler2D t, vec2 uv, vec2 uvw){
        vec3 a = texture2D(t, uv).rgb;
        vec3 b = texture2D(t, vec2(-uv.y, uv.x) * 0.37 + vec2(0.31, 0.67)).rgb;
        return mix(a, b, smoothstep(0.34, 0.66, ruido_(uvw * 3.1)));
      }"""

NUEVO = """      float h21_(vec2 p){ return fract(sin(dot(p, vec2(41.31, 289.07))) * 43758.5453); }
      vec2 h22_(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                                               dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      float ruido_(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21_(i), h21_(i + vec2(1.0, 0.0)), f.x),
                   mix(h21_(i + vec2(0.0, 1.0)), h21_(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      /* ---- teselado ESTOCASTICO: cada celda con su origen y su angulo ----
         Antes se cruzaban dos muestras alineadas a los ejes con una mascara de
         frecuencia 3 sobre 900 m: constante en pantalla, o sea una sola muestra
         alineada, o sea la rejilla. Aqui cada celda del parche se lee con un
         desplazamiento y un giro sacados de su propia posicion, y las cuatro
         vecinas se cruzan con pesos bilineales al cubo. Sin periodo no hay
         rejilla que encontrar. */
      vec3 sinGrilla_(sampler2D t, vec2 uv, vec2 uvw){
        vec2 cel = floor(uv), f = fract(uv);
        #if defined(SUELO_BARATO)
          /* un solo tap: la celda le da el giro y el origen. No borra el patron
             tan bien como cuatro, pero lo desalinea, que es lo que se ve. */
          vec2 h = h22_(cel);
          float a = h.x * 6.2831853;
          mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
          return texture2D(t, R * (uv - cel - 0.5) + h).rgb;
        #else
          vec3 acc = vec3(0.0);
          float ws = 0.0;
          for (int j = 0; j < 2; j++){
            for (int i = 0; i < 2; i++){
              vec2 c = cel + vec2(float(i), float(j));
              vec2 h = h22_(c);
              float a = h.x * 6.2831853;
              mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
              float w = (1.0 - abs(f.x - float(i))) * (1.0 - abs(f.y - float(j)));
              w = w * w * w;
              acc += texture2D(t, R * (uv - c) + h).rgb * w;
              ws += w;
            }
          }
          return acc / max(ws, 1e-4);
        #endif
      }"""

VIEJO_BR = """      c *= 0.87 + 0.26 * ruido_(vMapUv * 5.7);"""
NUEVO_BR = """      /* dos frecuencias: manchones grandes de luz Y variacion cercana. A 5,7 sobre
         el mapa entero era UN solo manchon y no rompia nada de lo que se ve. */
      c *= 0.86 + 0.20 * ruido_(vMapUv * 6.3) + 0.14 * ruido_(vMapUv * 71.0);"""

n = 0
for w in MUNDOS:
    p = D / (w + '.html')
    s = p.read_text(encoding='utf-8')
    o = s
    if s.count(VIEJO) != 1:
        print('  !! %s: el sombreador viejo no aparece 1 vez (%d)' % (w, s.count(VIEJO)))
        continue
    s = s.replace(VIEJO, NUEVO)
    if s.count(VIEJO_BR) == 1:
        s = s.replace(VIEJO_BR, NUEVO_BR)
    else:
        print('  ~  %s: sin la linea de brillo, se deja' % w)
    # el camino barato se activa en calidad BAJOS, que es donde no sobra relleno
    anc = 'matTerr.onBeforeCompile = sh => {\n  Object.assign(sh.uniforms, uniTerr);'
    if s.count(anc) == 1:
        s = s.replace(anc, anc + """
  /* en BAJOS el suelo va a un solo tap: cuatro muestras a pantalla llena es
     relleno de pixeles, que es justo lo que mata a un telefono de gama baja. */
  if (GFX === 'bajos') sh.defines = Object.assign({}, sh.defines, { SUELO_BARATO: '' });""")
    else:
        print('  ~  %s: no encuentro donde poner el define' % w)
    if s != o:
        p.write_text(s, encoding='utf-8')
        n += 1
        print('  ok %s' % w)
print('%d de %d mundos parcheados' % (n, len(MUNDOS)))
