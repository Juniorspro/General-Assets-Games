# HYPER SANDBOX — contrato de mapas

Mismo estilo que los props: **datos planos**, sin three.js. Un mapa = geometría estática
(todo colisiona salvo lo marcado `nc:1`), agua, puntos de aparición y ambiente.

```js
/* maps/construct.js */
HP.map('construct','Construct',{
  size:280,                    // medio lado del mundo: el piso base va de -size a +size
  ground:'grass',              // material del piso base
  wall:12,                     // altura del muro perimetral (0 = sin muro)
  sky:'city',                  // 'city' = panorama generado · 'plain' = degradé liso
  fogColor:0xc4d2dc, fogNear:140, fogFar:560,
  sun:[70,110,50],             // dirección del sol
  amb:0.55,                    // intensidad del hemisférico
  spawns:[[0,1.2,26,180],[18,1.2,-30,0]],       // [x,y,z,yawGrados] — mínimo 2
  water:[{p:[0,-0.4,-38], d:[46,3,34]}],        // volúmenes de agua: centro + tamaño
  parts:[
    {s:'box', d:[64,1,54], p:[0,-0.5,0], m:'concrete'},          // plaza
    {s:'box', d:[12,6,0.6], p:[-30,3,-12], m:'brick'},           // pared
    {s:'cyl', d:[0.3,9], p:[24,4.5,18], m:'steel', nc:1},        // poste decorativo
    ...
  ]
});
```

## Reglas
- `parts`: hasta **420** partes. Formas y campos idénticos a los props
  (`s`,`d`,`p`,`r`,`m`,`c`,`nc`) — ver `PROPS_API.md`.
- Lado mayor de una parte: hasta **300 m**. Nada menor a 0.1 m.
- El piso base y el muro perimetral los pone el motor con `size`/`wall`/`ground`:
  **no** los repitas en `parts`.
- `nc:1` para todo lo puramente decorativo (postes finos, cables, marcos, carteles):
  menos cuerpos estáticos = más FPS.
- Los `spawns` tienen que estar sobre suelo firme y separados entre sí.
- El agua es un volumen: el motor le pone flotación, tinte y superficie animada.
- Materiales: los mismos 20 de `PROPS_API.md`.

## Validación
```
cd <scratchpad>/hyper && node validate_map.js maps/<archivo>.js
```
Tiene que decir `OK`.
