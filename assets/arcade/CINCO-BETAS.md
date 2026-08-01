# CINCO BETAS — juegos 3D apaisados, cada uno con una misión que se gana o se pierde

Todos entran al motor ARCADE (`g_<slug>.js`), apaisados (girados 90° en celular
vertical, que es lo que hace el shell), 3D con luz HORNEADA en color de vértice y
`MeshBasicMaterial`: cero luces por fragmento, que es lo que mata en celular.
Presupuesto por juego: ≤60 llamadas de dibujo, ≤25.000 triángulos, ≥40 fps headless.

## Los cinco

| slug | escenario | misión (se gana / se pierde) |
|---|---|---|
| `bosque` | bosque / claro | Encender los 5 tótems con semillas del manantial antes de que la marchitez llegue al árbol madre |
| `orbita` | espacio | Remolcar 6 cápsulas a la puerta de salto antes de que la estación caiga a la atmósfera |
| `fosa`   | fosa marina | Bajar 2.000 m, encontrar la caja negra y volver: oxígeno y casco son los dos límites |
| `forja`  | volcán | Llevar 6 coladas de mineral al yunque antes de que se enfríen, sobre suelo que se derrumba |
| `duna`   | desierto | Bajar las dunas en trineo y entregar 3 barriles ENTEROS a la caravana antes del anochecer |

Cinco escenarios distintos a propósito: verde, negro, azul profundo, rojo, ocre.
Cinco verbos distintos: llevar, remolcar, descender, cronometrar, conducir.

## Modelos 3D

Se generaron con `tripo_3d` (texto→3D, 2,5 créditos cada uno, sin textura):

- `m-bosque-guardian.glb` — guardián del bosque (el jugador)
- `m-orbita-nave.glb` — remolcador espacial
- `m-fosa-sumergible.glb` — batiscafo
- `m-forja-golem.glb` — gólem de lava

El quinto (`duna`) lleva trineo procedural: una tabla y un piloto son geometría
simple y no vale gastar el crédito ahí.

Los GLB vienen sin textura y se hornean a color por vértice con `ag/bake.py`, que
es lo que ya se hizo para zumba y agujero: caras planas, `COLOR_0`, y así el
motor no los vuelve a simplificar ni hace falta una sola luz.

**Créditos**: quedaban 10,39. Cuatro modelos = 10,0. No alcanzaba para cinco, y se
dice acá para que quede escrito por qué el quinto es procedural.

## Estado

- [ ] bosque
- [ ] orbita
- [ ] fosa
- [ ] forja
- [ ] duna
