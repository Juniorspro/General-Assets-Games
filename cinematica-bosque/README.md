# Cinemática del bosque — La casa de la vieja

Dos escenas nuevas al principio de la cinemática de `lacasadelavieja8.html`,
más el bosque y la neblina que tapan los límites del mapa.

## Qué se agregó

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

## Archivos

```
modelos/car_body.glb    carrocería SIN ruedas (12.850 tris, 1024² WebP PBR)
modelos/car_wheel.glb   una rueda suelta       (4.012 tris, 512² WebP PBR)
modelos/phone.glb       celular                (2.380 tris, 512² WebP PBR)
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
