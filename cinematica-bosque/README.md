# La curva — la intro de La casa de la vieja

La cinemática de apertura de `lacasadelavieja9.html`: el chico maneja de
noche, mira el celular, y cuando levanta la vista tiene a la vieja parada en
el medio del asfalto. Dobla, se va de la ruta y choca contra un árbol. De ahí
engancha con el despertar encerrado que el juego ya tenía, y sigue el juego.

Reemplaza a la intro anterior (la llamada del contrato, llegar en auto a la
casa, el montaje de días, el sótano y la sábana). El orden de escenas quedó:

```
night-pass · pov-drive · pov-phone · look-up · silhouette · swerve · crash
black-out · title · wake-locked · chase · hide
```

## Los planos nuevos

1. **night-pass** (7,2 s) — el auto cruza de noche, los faros barren los
   troncos, polvo detrás de las ruedas. Se lo ve al chico manejando.
2. **pov-drive** (6 s) — primera persona en el asiento, la radio puesta, la
   cabeza cabeceando con la música.
3. **pov-phone** (7,4 s) — suena el teléfono, lo saca del bolsillo y baja la
   vista. La cámara hace zoom hasta la pantalla.
4. **look-up** (1,4 s) — levanta la vista de golpe. La música se va.
5. **silhouette** (2,3 s) — la vieja parada en el asfalto, recortada contra
   los faros. La cámara cierra el encuadre.
6. **swerve** (2,4 s) — volantazo: el auto tira a la banquina, la cámara
   rueda, las gomas levantan tierra.
7. **crash** (2,6 s) — plano exterior: pega contra el árbol, sacudón, polvo,
   los faros se apagan.
8. **black-out** (3,2 s) — adentro del auto, la cabeza cae sobre el volante y
   todo se va a negro.

Después entra el título y el despertar: **"No sé cuánto estuve tirado ahí. /
Alguien me metió adentro. Y cerró la puerta por fuera."**

## Lo que se mejoró de paso

- **Árboles.** Las hojas ahora cuelgan de la punta de cada rama en vez de
  estar sorteadas alrededor de la copa, y son cartas cruzadas en vez de
  planos sueltos: la copa tiene volumen desde cualquier ángulo y el follaje
  se corresponde con las ramas que se ven. 8 ramas por árbol, 3 racimos por
  rama.
- **Sombras.** La luna proyecta (2048², frustum de 140 m) y **la sigue al
  auto**: una luz direccional sólo sombrea una caja alrededor de su target,
  así que sin moverla las sombras se cortaban a los pocos metros. Troncos,
  ramas, auto y personajes proyectan; el asfalto y la banquina reciben.
- **Iluminación de noche.** Niebla más abierta (9–118 m en vez de 5–60) para
  que la silueta se lea a 40 m, cielo hemisférico más frío y la luna más
  fuerte.
- **El personaje en el auto.** Estaba anclado por los pies: la pose de
  sentado rota las piernas pero no mueve el root, así que quedaba parado
  adentro del auto. Ahora se lo ancla por la **pelvis** al punto del asiento,
  medido después de aplicar la pose.

### Bosque + neblina (en toda la parte exterior)
- ~900 pinos colocados con `InstancedMesh` (3 draw calls: tronco + dos capas de
  copa) en un radio de 190 m alrededor de la carretera, con un corredor libre de
  9,5 m a cada lado del asfalto.
- 16 planos de neblina que derivan lentamente, más `fog` de escena en 5–60 m.
  Entre la niebla y la densidad de árboles no se ve ningún borde del mapa en
  ninguna dirección.
- La carretera y el suelo se agrandaron (300 m y 420 × 420 m) para que el auto
  pueda recorrer toda la escena sin salirse de la geometría.
- Iluminación nocturna propia (`look("forest-night")`): luna fría, ambiente
  azulado y niebla clara para que los árboles del fondo se recorten en capas.

### Escena 1 — el auto pasa (`forest-pass`, 7,2 s)
- La cámara aparece progresivamente desde negro (fade de 1,6 s), apoyada en el
  suelo a 22 cm de altura, entre césped que se mueve con el viento y con la
  ráfaga del auto.
- Mira la carretera desde abajo; el Bentley descapotable cruza a 33 m/s con
  polvo levantándose detrás de las ruedas y los faros barriendo los troncos.
- El personaje va sentado adentro manejando (se ve poco porque pasa rápido,
  como se pidió).

### Llegada — sigue manejando y se baja del auto
Reemplaza a la escena del chico parado en la carretera mientras pasa un auto.

4. `drive-arrive`: después de aceptar el contrato sigue manejando, sale de la
   carretera y frena frente a la casa. El motor se apaga al llegar.
5. `get-out`: se baja del auto — la cámara sale del asiento y se endereza a 1,62 m.
6. `walk-to-door`: **tercera persona**. Camina desde el auto hasta la puerta con
   la animación `preset:walk` del propio personaje. El recorrido rodea el auto
   (sale por el costado, avanza hasta pasar el capot y recién ahí cruza) para que
   no lo atraviese. Al llegar estira el brazo derecho, la puerta gira sobre su
   bisagra siguiendo la mano, entra y la vuelve a cerrar detrás suyo con el mismo
   gesto. La orientación sale de la velocidad real y no de apuntar al objetivo,
   que se daba vuelta 180° en cuanto lo pasaba de largo.

La puerta de entrada no es un asset aparte: el generador de la casa la arma como
un grupo con pivote en la bisagra y la hoja como hijo. Se la ubica buscando en la
escena el grupo más cercano a `exitDoor` cuyo hijo tenga tamaño de puerta, y se
le anima el giro.

### Dentro de la casa — el batazo
Reemplaza al montaje de días que caminaba al personaje en círculo hasta el día 12.
Apenas cruza la puerta entra el batazo: la escena de los pasos por el pasillo
(`enter-house`) también se sacó, así que después de entrar no hay animación de
relleno.

7. `bat-hit`: la vieja entra por detrás y le pega con el bate. Golpe, flash rojo,
   la cámara se desploma girando hasta el piso y desde ahí se la ve parada encima
   levantando el bate otra vez, antes del negro. El swing en sí queda fuera de
   cuadro a propósito: la cámara recién gira hacia ella cuando el golpe ya cayó.
8. `wake-locked`: despierta a parpadeos, se levanta y la puerta está cerrada por
   fuera.

El modelo de la vieja se generó con Tripo (imagen → 3D → rig), **sin bate**: el
generador lo devolvía curvado. El bate es geometría hecha en código (mango, barril
cónico, pomo y punta) colgada del hueso `R_Hand`, así sale perfectamente recto y
se puede reusar.

Los nombres de animación del rig van con prefijo (`preset:walk`); pedirlos como
`walk` hace que el servicio los ignore en silencio y devuelva un set por defecto.
No existe un clip de golpe, así que **el batazo está animado a mano sobre los
huesos** del brazo y la columna, después de que corre el mixer: el impacto cae en
el frame exacto.

### Escena 2 — POV manejando y el contrato
1. `pov-drive` (6 s): primera persona bien puesta en el asiento del conductor.
   Se ve el pecho, las piernas, los dos brazos y las manos sobre el volante,
   con el bosque pasando al costado.
2. `pov-phone` (8,4 s): suena el celular, el brazo derecho suelta el volante,
   busca en el bolsillo, saca el teléfono y lo levanta. La cámara hace zoom
   (68° → 31° de FOV) hasta encuadrar la pantalla.
3. `office-split` (~20 s): una línea blanca vertical abre la pantalla al medio;
   del lado derecho entra la oficina en sombras y se juega el diálogo del
   contrato (limpiar y remodelar la casa de una señora mayor). El jugador
   acepta y la línea se cierra llevándose la oficina hacia la derecha mientras
   la vista del protagonista vuelve desde la izquierda.

El diálogo está en **español, inglés y portugués**: el idioma se elige solo con
`navigator.language` y se puede forzar desde la consola con
`window.__CDLV_LANG = "pt"` antes de arrancar.

## Debug

Desde la consola del navegador, mientras corre la cinemática:

```js
window.__CDLV_DBG          // en qué escena va, tiempo, qué está visible
window.__CDLV_JUMP = 9     // salta a esa escena
```

```js
window.__CDLV_IDS           // la lista de escenas en orden
```

Índices: `0` auto pasando · `1` POV manejando · `2` el celular · `3` pantalla
partida · `4` título · `5` llega a la casa · `6` se baja del auto · `7` camina a
la puerta · `8` el batazo · `9` despierta encerrado · `10` persecución · `11` se
esconde.

También se sacaron la bajada al sótano (`descent`), la sábana (`sheet`), la
aparición de la vieja en el sótano (`reveal`) y los pasos por el pasillo
(`enter-house`).

El botón **Saltar intro** del HUD era sólo una etiqueta sin handler: el juego
salteaba con `E` o con click en el canvas, pero tocar el botón no hacía nada.
Ahora tiene su propio listener (`wireSkipButton`).

## Archivos

```
modelos/car_body.glb    carrocería SIN ruedas (12.850 tris, 1024² WebP PBR)
modelos/car_wheel.glb   una rueda suelta       (4.012 tris, 512² WebP PBR)
modelos/phone.glb       celular                (2.380 tris, 512² WebP PBR)
modelos/vieja.glb       la vieja rigueada (preset:walk / preset:idle), sin bate
audio/vo_office_{es,en,pt}.mp3   la oferta del contrato
audio/vo_player_{es,en,pt}.mp3   "Acepto." / "I'll take it." / "Eu aceito."
referencias/            las imágenes que se usaron para generar cada modelo
```

### Cómo usar el auto en otra escena

La carrocería y las ruedas son archivos separados a propósito: se instancian
cuatro `car_wheel.glb` como hijos de un grupo vacío cada una y se las hace girar
sobre su eje X sin tocar la carrocería.

```js
const hub = new THREE.Group();
hub.add(wheelModel);              // la rueda ya viene con el eje en X
hub.position.set(±ancho/2, 0.39, ±largo*0.295);
car.add(hub);
// cada frame:
hub.rotation.x -= velocidad * dt;
```

Los modelos vienen normalizados: la carrocería mide 5,35 m de largo sobre el eje
Z (frente hacia +Z) y la rueda 0,78 m de diámetro con el eje de giro en X. Usan
`KHR_mesh_quantization` (soportado nativamente por three.js, no hace falta
decoder) y texturas WebP.

## Generación

Modelos 3D con **Tripo vía Rezona Lab** (`texture: true`, `pbr: true`,
`texture_quality: "detailed"`), a partir de imágenes de referencia generadas
desde la foto del Bentley original. Los originales salen en ~30 MB y 988k
triángulos cada uno; acá están optimizados con `gltf-transform`
(simplify + quantize + WebP) para que el juego siga cargando de un solo archivo.

Voces con Seed Audio (ByteDance), recortadas y normalizadas a mono 24 kHz.
