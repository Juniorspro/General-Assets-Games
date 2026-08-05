#!/usr/bin/env python3
"""ROMPER LA GRILLA DEL SUELO.

Las texturas del suelo son buenas —son fotos PBR— pero el shader del terreno
tomaba UNA sola muestra a escala fija: `repite = MAPA/7`, o sea 128 repeticiones
a lo largo de 900 m. Con eso, el mismo parche de 7 m aparece 128 veces alineado
en cuadricula, y a media distancia el ojo encuentra el patron enseguida: se ven
las bandas diagonales que se notaban en ESTEPA y en SECUOYA.

El arreglo es el que usan los juegos grandes para terreno grande, sin agregar ni
una textura:
  · DOS muestras de la misma foto a escalas que NO son multiplos (1 y 0,37), una
    de ellas girada 90 grados, mezcladas con una mascara de ruido suave. El
    patron de una no coincide con el de la otra en ningun lado, asi que la
    cuadricula desaparece.
  · MODULACION DE BRILLO de baja frecuencia, para que no todo el suelo tenga
    exactamente la misma luz: es lo que hace que un terreno real no se lea como
    un mosaico.
  · Y la escala de cerca sube un poco (7 m -> 5 m por parche), que es donde la
    foto tiene detalle para dar.
Uso: python3 parche_suelo.py [slug ...]"""
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

GLSL_COMUN = """#include <common>
      uniform sampler2D tTierra, tHoja, tRoca, tSplat;
      uniform float repite;
      varying float vRocoso;
      /* ------------------- SUELO SIN CUADRICULA -------------------------
         Con una sola muestra a escala fija el mismo parche de 7 m se repite
         128 veces ALINEADO, y a media distancia se ven las bandas. Se mezclan
         DOS muestras a escalas que no son multiplos (1 y 0,37), una girada 90
         grados, con una mascara de ruido suave: el patron de una no coincide
         con el de la otra en ningun punto y la cuadricula deja de existir.
         Es la misma idea del «stochastic tiling», sin texturas de mas. */
      float h21_(vec2 p){ return fract(sin(dot(p, vec2(41.31, 289.07))) * 43758.5453); }
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

GLSL_FRAG = """
      vec2 uvT = vMapUv * repite;
      vec3 spl = texture2D(tSplat, vMapUv).rgb;
      vec3 c = sinGrilla_(map, uvT, vMapUv);
      c = mix(c, sinGrilla_(tHoja, uvT * 1.3, vMapUv + 0.41), clamp(spl.g * 1.5, 0., 1.));
      c = mix(c, texture2D(tTierra, uvT * 1.6).rgb, clamp(spl.r * 1.35, 0., 1.));
      c = mix(c, sinGrilla_(tRoca, uvT * .9, vMapUv + 0.77), vRocoso);
      /* la luz del suelo varia de a manchones grandes: sin esto, incluso sin
         cuadricula, todo el terreno se lee con el mismo brillo y parece mosaico */
      c *= 0.87 + 0.26 * ruido_(vMapUv * 5.7);
      diffuseColor.rgb *= c;"""

VIEJO_COMUN = """#include <common>
      uniform sampler2D tTierra, tHoja, tRoca, tSplat;
      uniform float repite;
      varying float vRocoso;"""

VIEJO_FRAG = """
      vec2 uvT = vMapUv * repite;
      vec3 spl = texture2D(tSplat, vMapUv).rgb;
      vec3 c = texture2D(map, uvT).rgb;
      c = mix(c, texture2D(tHoja, uvT*1.3).rgb, clamp(spl.g*1.5, 0., 1.));
      c = mix(c, texture2D(tTierra, uvT*1.6).rgb, clamp(spl.r*1.35, 0., 1.));
      c = mix(c, texture2D(tRoca, uvT*.9).rgb, vRocoso);
      diffuseColor.rgb *= c;"""


def parche(t, slug):
    if 'sinGrilla_' in t:
        return t, 'suelo(ya)'
    msgs = []
    if VIEJO_COMUN in t:
        t = t.replace(VIEJO_COMUN, GLSL_COMUN, 1); msgs.append('comun')
    else:
        msgs.append('comun NO')
    if VIEJO_FRAG in t:
        t = t.replace(VIEJO_FRAG, GLSL_FRAG, 1); msgs.append('frag')
    else:
        msgs.append('frag NO')
    # el parche de cerca, un poco mas chico: es donde la foto tiene detalle
    if 'repite: { value: MAPA / 7 }' in t:
        t = t.replace('repite: { value: MAPA / 7 }',
                      'repite: { value: MAPA / 5 }   /* parche de 5 m, no de 7 */', 1)
        msgs.append('escala')
    return t, 'suelo[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
