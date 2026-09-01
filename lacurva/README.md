# La curva — animación + Misión 1

Animación nueva, aparte de `lacasadelavieja8.html`, en un solo HTML
(`lacurva.html`, ~5,8 MB). No comparte código con el juego viejo: motor,
escenas y mission están escritos de cero acá.

## La historia

1. **La ruta.** El chico maneja de tarde por la carretera con la radio puesta.
   Se lo ve desde afuera (travelling lateral y después el auto pasando de
   frente) y en seguida desde adentro, en primera persona.
2. **El celular.** Cabecea con la música y baja la vista al teléfono. La
   cámara hace zoom hasta la pantalla.
3. **La silueta.** Levanta la vista de golpe: hay una vieja parada en el
   medio del asfalto. La música se apaga detrás de un filtro y entra un
   golpe grave.
4. **El volantazo.** Dobla, la goma chilla, el auto se va de la ruta.
5. **El choque.** Derrapa por el pasto y pega contra un árbol. Flash,
   sacudón, el motor se apaga, la vista se cae de costado y se va a negro
   con los latidos.
6. **Despierta.** Tres parpadeos desde el piso de una casa abandonada. Se
   incorpora, la cámara sube de 22 cm a 1,62 m, y ve pasar a la vieja por el
   fondo del pasillo. Cartel: **MISIÓN 1 — Escapar de la casa**.
7. **Se juega.** Termina la cinemática y arranca la misión.

`Saltar intro`, `Esc` o `K` saltean la cinemática.

## Misión 1 — escapar

Primera persona con pointer lock. El teléfono que venía mirando es ahora la
única linterna.

- **WASD / flechas** moverse · **Shift** correr · **C** agacharse ·
  **E** interactuar · **M** silenciar
- La puerta del frente está clavada con tablones. Hay que encontrar **la llave
  oxidada**, que cae en el dormitorio, el depósito o la despensa — **distinto en
  cada partida**.
- Al agarrarla se caen los tablones y queda salir por la puerta.
- **La vieja** patrulla la casa. Si te ve, persigue; si te oye correr, va hacia
  el ruido; agachado hacés casi nada de ruido y te ve desde mucho más cerca.
  Si te toca, perdiste. `R` reinicia.
- El drone de tensión sube cuando se acerca, y la viñeta se cierra.

## Cómo está hecho

### La casa
Se arma desde una grilla de texto (`house.js`, `MAP`), y esa misma grilla es
después el colisionador del jugador y el grafo de navegación de la vieja
(BFS + línea de vista sobre celdas). Cambiar el plano de la casa es editar el
dibujo ASCII; no hay nada más que tocar.

```
########################
#......#........#......#      dormitorio · cuarto del fondo · depósito
#......D........#......#
###D######D#######D#####
#......................#      pasillo
####D#######D#######D###
#......#..........#....#      sala · cocina · despensa
#########E##############      E = la salida
```

Las paredes se juntan en tiras horizontales antes de subirlas a la GPU: una
sola malla en vez de 300 cajas.

### El bosque y el viento
420 árboles instanciados (tronco + 6 ramas + 14 tarjetas de hoja) en 3 draw
calls, más 20.000 matas de pasto. El viento es un `onBeforeCompile` que empuja
los vértices en el vertex shader, con tres modos: las ramas casi no se mueven,
las hojas flamean y el pasto se dobla desde la base.

### El auto
Es el Bentley de la foto, generado con Tripo. La carrocería y las ruedas son
archivos separados a propósito, así las ruedas giran sin deformar la carcasa.
El parabrisas se separa **en runtime**: se recorre la malla triángulo por
triángulo y los que están arriba, adelante y bastante horizontales se pasan a
un material transparente.

### Los personajes
Los rigs de Tripo miran a **+X** y toda la escena asume **+Z**, así que
`Rig` los gira -90° al normalizar. Los nombres de animación van con prefijo
(`preset:walk`); pedirlos como `walk` hace que el servicio los ignore en
silencio.

El bate de la vieja es geometría hecha en código colgada del hueso `R_Hand`:
el generado salía curvado.

### Cosas que costaron y por qué

Las dejo anotadas porque son las que se vuelven a morder solas:

- **El auto salía negro.** La pintura es metálica y no había nada que
  reflejar. Se arregló poniendo el panorama del cielo como `scene.environment`
  vía `PMREMGenerator`; de paso levanta todos los demás materiales PBR.
- **El bosque lejano parecía palos blancos.** No eran las texturas: era la
  niebla a 260 m lavando todo. Ahora arranca a 190 m y sólo tapa el borde.
- **El parabrisas quedaba opaco.** Los umbrales de `splitGlass` estaban en
  metros, y el GLB viene cuantizado: el atributo de posición guarda enteros
  normalizados con la escala en el nodo, así que ningún valor fijo en metros
  engancha. El test va en fracciones del bounding box de la propia malla.
- **El chico flotaba dentro del auto.** La pose de sentado rota las piernas
  pero no mueve el root, así que apoyarlo por los pies lo dejaba parado con la
  cabeza afuera. Se lo ancla por la pelvis al punto del asiento, medido
  después de aplicar la pose.
- **La cámara POV filmaba el forro de la capucha.** El buzo tiene capucha
  pesada al cuello, así que un ojo puesto en el hueso de la cabeza queda
  adentro. Va a un punto fijo bastante adelante del cráneo.
- **Saltar a un plano mostraba la escena equivocada.** Cada plano ahora arma
  su propio escenario (`roadSetup()` / `houseSetup()`) y fija su look, FOV y
  visibilidades, en vez de heredar lo que dejó el anterior.
- **Las paredes estiraban el papel.** Las cajas de `BoxGeometry` traen UV 0..1
  por cara, así que un tramo largo estira y uno corto comprime. Se reproyectan
  las UV desde la posición de mundo.
- **La vieja patinaba al perseguir.** Su rig sólo trajo `walk` e `idle`;
  pedirle `run` devolvía nada. `Rig.play` acepta un `fallback` y la cadencia
  sale de la velocidad real.

### El audio
La radio y el ambiente son mp3 generados; el resto (chirrido de gomas, golpe
grave, latidos, crujidos, grito, drone de tensión) está sintetizado con
WebAudio, que suena mejor que repetir un mp3 corto. La radio pasa por un
lowpass: cuando aparece la vieja se cierra a 420 Hz y la música queda "detrás
del vidrio".

## Debug

```js
window.__CRASH        // fase, plano, tiempo, si tenés la llave
window.__CRASH_JUMP=6 // saltar a ese plano
window.__CRASH_SKIP=1 // saltear la cinemática
```

Planos: `0` travelling · `1` el auto pasa · `2` POV con el celular ·
`3` levanta la vista · `4` la silueta · `5` el volantazo · `6` se va de la ruta ·
`7` el impacto · `8` se desmaya · `9` parpadea · `10` se incorpora · `11` la ve pasar.

Cada plano se puede entrar en frío: arma su propio escenario, así que saltar a
cualquiera muestra lo que tiene que mostrar.

## Archivos

```
src/            el código (core, world, actors, house, cine, escape, audio, main)
src/build.py    bundlea con esbuild y mete los assets como data URLs
src/shell.html  el HTML con el HUD y la pantalla de carga
modelos/        boy.glb (rigueado) · car_body · car_wheel · phone · vieja
texturas/       pared y piso de la casa, corteza, hoja, pasto, cielo
audio/          music · ambience · crash
referencias/    la foto del Bentley y la referencia en T-pose del chico
preview/        un cuadro de cada momento
```

### Reconstruir

```bash
cd /home/user/lemi-game/crash && python3 build.py salida.html
```

Espera `assets/dist/` del proyecto `lemi-game` con los GLB y texturas ya
optimizados (`gltf-transform simplify` + `optimize --compress quantize
--texture-compress webp`). El chico salió de Tripo en 25 MB y 298k vértices;
en el bundle entra en 1,5 MB y 54k triángulos con las tres animaciones
intactas.
