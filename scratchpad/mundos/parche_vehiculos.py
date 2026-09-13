#!/usr/bin/env python3
"""LOS VEHICULOS QUE ANDABAN SOLOS.

El reporte dice, textual: «Estepa and Hielo: the vehicles moving straight by
itself, it stuck when i started moving». Se midio y es cierto, y ademas hay un
tercero con el mismo defecto que no estaba en el reporte:

  ESTEPA (caballo).  `obj = my < -.15 ? V_GALOPE : (my > .25 ? 0 : V_TROTE)`.
      Con la palanca SUELTA el pedido era V_TROTE = 7,5 m/s: el caballo trotaba
      derecho el solo, y la unica forma de pararlo era tirar la palanca hacia
      ATRAS. Cualquiera que suelte la palanca esperando frenar ve un caballo que
      sigue andando: eso es «se mueve derecho solo».

  LUNA (mochila de salto).  `obj = ... : (my > .2 ? 0 : A.vel)`. Con la palanca
      suelta el pedido era LA VELOCIDAD ACTUAL: sin rozamiento, una vez lanzado
      no paraba nunca. Mismo defecto, no estaba reportado.

  HIELO (trineo).  No tenia NINGUNA forma de impulsarse: la velocidad salia solo
      de la pendiente (`A.vel += -dh * GRAV_T * dt`) y el rozamiento del hielo es
      .07, o sea casi cero. En una bajada arranca solo —«se mueve solo»— y en el
      llano, una vez parado, no hay tecla que lo mueva: quedas clavado ahi para
      siempre. Eso es «it stuck when i started moving».

QUE QUEDA. La misma regla en los tres, que es la que espera cualquiera:
soltar la palanca FRENA, adelante avanza, y cuanto mas lejos mas rapido. Al
trineo ademas se le da un empujon de pie: alcanza para arrancar y para cruzar un
llano, pero la velocidad de verdad la sigue dando la bajada, que es su gracia.
"""
import pathlib, sys

A = pathlib.Path('/home/user/mundos/assets/mundos')

CAMBIOS = [
    ('estepa.html',
     "    const obj = my < -.15 ? V_GALOPE : (my > .25 ? 0 : V_TROTE);",
     "    /* SOLTAR LA PALANCA ES PARAR. Antes, suelta, el caballo seguia al trote\n"
     "       el solo y solo frenaba tirando hacia atras: eso era «se mueve derecho\n"
     "       solo». Ahora adelante empuja y cuanto mas lejos, mas galope. */\n"
     "    const ade = Math.max(0, -my);\n"
     "    const obj = ade > .12 ? V_TROTE + (V_GALOPE - V_TROTE) * cl((ade - .12) / .68, 0, 1) : 0;"),

    ('luna.html',
     "    const obj = my < -.1 ? V_MAX * (-my) : (my > .2 ? 0 : A.vel);",
     "    /* SOLTAR LA PALANCA ES DEJAR DE EMPUJAR. Antes el pedido con la palanca\n"
     "       suelta era la velocidad que ya llevabas, y como aca no hay rozamiento\n"
     "       eso queria decir para siempre. En el AIRE sigue costando frenar (el\n"
     "       clamp de abajo lo baja al 35%), que es lo correcto sin atmosfera. */\n"
     "    const obj = my < -.1 ? V_MAX * (-my) : 0;"),

    ('hielo.html',
     "    const fren = Math.max(0, my) * 7 + Math.abs(carve) * .7 + .07;",
     "    /* EL EMPUJON. El trineo era pura gravedad: en el llano, una vez parado,\n"
     "       no habia forma de arrancar y quedabas clavado —la otra mitad del\n"
     "       reporte—. Adelante ahora empuja con el pie, como se empuja un trineo\n"
     "       de verdad: sirve para arrancar y para cruzar un llano, y nada mas. La\n"
     "       velocidad de verdad la sigue dando la bajada, que es la gracia. */\n"
     "    const emp = Math.max(0, -my);\n"
     "    if (emp > .1 && A.vel < V_EMPUJE) A.vel += EMPUJE * emp * dt;\n"
     "    const fren = Math.max(0, my) * 7 + Math.abs(carve) * .7 + .07;"),

    ('hielo.html',
     "  const V_BAJA = .9;",
     "  const V_BAJA = .9;\n"
     "  /* con que fuerza y hasta que velocidad empuja el pie. Nueve es poco al lado\n"
     "     de los veintiseis de VMAX a proposito: empujar te saca del llano, no te\n"
     "     hace campeon. */\n"
     "  const EMPUJE = 9, V_EMPUJE = 9;"),
]

# los avisos: el texto de la palanca tiene que decir la verdad nueva
AVISOS = [
    ('estepa.html',
     ("'PALANCA adelante galopa · atras frena · SALTO salta'",
      "'PALANCA adelante galopa · soltala y frena · SALTO salta'"),
     ("'PUSH STICK to gallop · pull back to slow · JUMP to leap'",
      "'PUSH STICK to gallop · release to stop · JUMP to leap'"),
     ("'ALAVANCA adiante galopa · atras freia · SALTO salta'",
      "'ALAVANCA adiante galopa · solte para parar · SALTO salta'")),
]

n = 0
for rel, viejo, nuevo in CAMBIOS:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    if nuevo.split('\n')[-1] in s and viejo not in s:
        print('  -- %s: ya' % rel); continue
    if s.count(viejo) != 1:
        print('  !! %s: el ancla aparece %d veces -> %r' % (rel, s.count(viejo), viejo[:60]))
        continue
    p.write_text(s.replace(viejo, nuevo, 1), encoding='utf-8')
    n += 1
    print('  %s: %s' % (rel, nuevo.strip().split('\n')[-1][:70]))

for rel, *pares in AVISOS:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    for viejo, nuevo in pares:
        if viejo in s:
            s = s.replace(viejo, nuevo)
    if s != o:
        p.write_text(s, encoding='utf-8'); n += 1
        print('  %s: avisos al dia' % rel)

print('%d cambios' % n)
sys.exit(0 if n >= 4 else 1)
