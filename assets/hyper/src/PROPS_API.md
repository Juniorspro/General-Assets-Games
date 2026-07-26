# HYPER SANDBOX — contrato de módulos de props

Cada módulo es un archivo JS **plano** (sin import/export, sin three.js, sin cannon) que declara props
como **datos**. El motor los convierte en mallas (three.js) y en cuerpos rígidos (cannon-es).
Nunca instancies geometría vos: sólo describís partes.

## Forma del archivo

```js
/* props/industrial.js */
HP.section('industrial','Industrial','acc',[
  { id:'i_crate', name:'Crate', mass:14, parts:[
      {s:'box', d:[1.4,1.4,1.4], m:'wood'},
      {s:'box', d:[1.46,.1,.1], p:[0,1.34,.7], m:'wood', c:0x8a6a44, nc:1},
  ]},
  ...
]);
```

`HP.section(id, nombreVisible, tab, props)` — `tab` es uno de:
`'acc'` (Accesorios), `'veh'` (Vehículos), `'ent'` (Entidades).

## Prop

| campo   | oblig. | qué es |
|---------|--------|--------|
| `id`    | sí | único en TODO el juego. minúsculas, `_`, prefijo de sección (ej. `i_` industrial, `e_` enviroment, `b_` building, `s_` sci-fi, `n_` interior, `r_` road, `l_` rails, `v_` vehicles, `t_` entities) |
| `name`  | sí | nombre corto que se ve en el menú (≤ 16 chars, estilo Hyper Sandbox: `Container1`, `Barier01`, `VendingMachine`) |
| `mass`  | sí | kg, `0.5 … 3000`. Realista: caja de madera 14, barril 18, auto 1200, contenedor 900 |
| `parts` | sí | 1 … 14 partes |
| `col`   | no | `'auto'` (default, compuesto de las partes) · `'box'` (una caja AABB) · `'cyl'` · `'sph'` |
| `tags`  | no | array de strings libres para buscar |

## Parte

`{s, d, p, r, m, c, nc}`

- `s` — forma: `'box'` · `'cyl'` · `'sph'` · `'cone'`
- `d` — medidas en **metros**:
  - `box`: `[ancho, alto, profundo]`
  - `cyl`: `[radio, alto]` o `[radioArriba, radioAbajo, alto]`
  - `sph`: `[radio]`
  - `cone`: `[radio, alto]`
- `p` — posición del centro de la parte `[x,y,z]`, default `[0,0,0]`
- `r` — rotación en **grados** `[rx,ry,rz]`, default `[0,0,0]`
- `m` — material (ver lista). default `'metal'`
- `c` — tinte hex opcional (ej. `0xd94f3a`). Multiplica la textura del material.
- `nc` — `1` = decorativa: NO entra en la colisión (usalo para detalles finos: manijas,
  cables, marcos, luces). Ahorra CPU y evita colisiones raras.

### Convención de origen (importante)
**Construí el prop apoyado en `y=0`**: `y=0` es el piso del objeto. El motor recentra solo.
El objeto va centrado en X y Z alrededor de `0`.

### Materiales disponibles
`wood` `plank` `metal` `steel` `rust` `corrugated` `concrete` `brick` `asphalt` `plastic`
`rubber` `glass` `fabric` `dirt` `grass` `paint` `chrome` `neon` `cardboard` `tile`

`glass` y `neon` son translúcidos/emisivos: usalos poco y siempre con `nc:1` si son finos.

## Reglas de calidad
1. **Se tiene que reconocer qué es** sin leer el nombre: silueta correcta y proporciones humanas
   (el jugador mide 1.8 m, una puerta 2.1 m, una silla 0.45 m de asiento).
2. Entre 2 y 8 partes para casi todo. Un cubo pelado sólo si el objeto ES un cubo.
3. Nada más chico que 0.15 m ni más grande que 20 m en su lado mayor.
4. Sin duplicados: dos props no pueden tener el mismo `name` ni el mismo `id`.
5. `mass` coherente con el volumen y el material (madera liviana, hormigón pesado).
6. No uses más de 3 materiales distintos por prop (para que sea 1-3 draw calls).

## Validación (obligatoria antes de entregar)
```
cd <scratchpad>/hyper && node validate.js props/<tu-archivo>.js
```
Tiene que decir `OK` y listar la cantidad. Si falla, arreglá y volvé a correr.
