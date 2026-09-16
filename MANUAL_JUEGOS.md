# Manual de creación de juegos

Todo lo que hay acá para hacer juegos: las skills, las herramientas, el método y las reglas que
ya se pagaron con una vuelta cada una. Está escrito para **llevarse a otro repo**: lo que depende
de este repo está marcado.

---

## 1. Qué se hace acá

Un juego = **UN archivo HTML autocontenido** en `juegos-pc/`, sin dependencias fuera del CDN de
three.js. Se prueba **en el celular, en vertical** (412×892). Tres idiomas. Todos los assets van
adentro del archivo en base64.

Los juegos grandes **viven partidos** en `herramientas/<juego>/partes/` y se arman con
`python3 herramientas/<juego>/armar.py`. **Las partes son la fuente; el HTML es la salida.**
Un HTML de dos megas con base64 adentro no se edita con parches de texto — ya costó un archivo
en cero bytes.

---

## 2. Las skills

### 2.1 De proyecto (viven en `.claude/skills/`, se llevan copiando la carpeta)

| skill | cuándo se usa |
|---|---|
| **`arranque`** | El manual corto del repo: reglas del usuario, banco de pruebas, horneado de assets, el contenedor que se revierte. **Lo primero que hay que leer en una sesión nueva.** |
| **`deteccion-plataforma`** | Distinguir PC de teléfono sin equivocarse. Un `mousemove` sintético después de un toque en Android hacía pasar a modo PC y apagaba el joystick. |

### 2.2 Las cinco de creación y animación

| skill | cuándo se usa |
|---|---|
| **`game-asset-pipeline`** | Generar y optimizar modelos y texturas. Algo se ve oscuro, gigante, blanco con motas, o el decimador no baja triángulos. |
| **`game-character-animation`** | Esqueletos, mezcla de clips, retarget entre rigs distintos, pies que patinan, un hueso que gira en el eje equivocado. |
| **`game-physics-rapier`** | Colisión, gravedad, salto, vehículos, ragdolls. Tiembla, atraviesa paredes o se queda trabado. |
| **`open-world-streaming`** | Mundos grandes, chunks, LOD, generación procedural con semilla, persistencia. |
| **`realtime-rendering-quality`** | Se ve plano o de prototipo. Tone mapping, HDRI, sombras, post-proceso, espacio de color. |

### 2.3 La familia three.js (~85 skills)

**Directores y orquestadores** — son los que hay que invocar primero, deciden qué otras skills hacen falta:

- `threejs-game-director` — construir un juego 3D de punta a punta
- `threejs-app-director` — una app/experiencia 3D que no es un juego
- `threejs-choose-skills` — «no sé qué skill necesito»
- `threejs-aaa-graphics-builder` — subir la calidad visual de algo que ya funciona

**Generadores de assets:**

- `threejs-3d-generator` — modelos 3D
- `threejs-image-generator` — texturas e imágenes
- `threejs-audio-generator` — música y efectos
- `threejs-image-pipeline` — cadena de horneado de imágenes
- `threejs-agents-model-optimizer` — bajar triángulos y bytes
- `threejs-agents-scene-builder` — armar la escena
- `threejs-object-sculptor` — modelar por código

**Sistemas de juego:**

- `threejs-gameplay-systems` — reglas, estados, progresión
- `threejs-interaction-systems` / `threejs-interaction` — entrada, dedo, raycast
- `threejs-game-ui-designer` — HUD y menús
- `threejs-camera` / `threejs-camera-controls-and-rigs` — cámaras y rieles
- `threejs-animation` / `threejs-impl-animation` — animación
- `threejs-physics` / `threejs-impl-physics` — física
- `threejs-audio` / `threejs-impl-audio` — audio

**Fundamentos y núcleo:**

- `threejs-fundamentals`, `threejs-core`, `threejs-core-math`, `threejs-core-scene-graph`,
  `threejs-core-renderer`, `threejs-core-raycaster`
- `threejs-geometry`, `threejs-materials`, `threejs-textures`, `threejs-lighting`,
  `threejs-shaders`, `threejs-loaders`

**Sintaxis (referencia rápida de API):**

- `threejs-syntax-geometries`, `threejs-syntax-materials`, `threejs-syntax-shaders`,
  `threejs-syntax-loaders`, `threejs-syntax-controls`

**Implementación específica:**

- `threejs-impl-lighting`, `threejs-impl-shadows`, `threejs-impl-post-processing`,
  `threejs-impl-webgpu`, `threejs-impl-xr`, `threejs-impl-drei`,
  `threejs-impl-react-three-fiber`, `threejs-impl-ifc-viewer`

**Rendimiento y depuración:**

- `threejs-performance`, `threejs-debug-profiler`, `threejs-debugging`,
  `threejs-errors-performance`, `threejs-errors-rendering`,
  `threejs-compatibility-fallbacks`, `threejs-qa-release`, `threejs-visual-validation`

**Procedural:**

- `threejs-procedural-geometry`, `threejs-procedural-materials`, `threejs-procedural-vegetation`,
  `threejs-procedural-buildings-and-cities`, `threejs-procedural-creatures`,
  `threejs-procedural-planets`, `threejs-procedural-fields`, `threejs-procedural-motion-systems`

**Efectos visuales:**

- `threejs-visual-systems`, `threejs-postprocessing`, `threejs-bloom`,
  `threejs-exposure-color-grading`, `threejs-ambient-contact-shading`,
  `threejs-scalable-real-time-shadows`, `threejs-dynamic-surface-effects`,
  `threejs-particles-trails-and-effects`, `threejs-volumetric-clouds`,
  `threejs-sky-atmosphere-and-haze`, `threejs-water-optics`, `threejs-spectral-ocean`,
  `threejs-rain-snow-and-wet-surfaces`, `threejs-black-holes-and-space-effects`

**Otras plataformas:**

- `threejs-react`, `threejs-xr`, `webgpu-threejs-tsl`

### 2.4 Bibliotecas

| skill | qué es |
|---|---|
| **`three-js`** | Referencia de three.js |
| **`gsap`** | Animación por tweens (UI, transiciones) |
| **`theatre-js`** | Animación por línea de tiempo / cinemáticas |
| **`mint-threejs-skills`** | Generar skills nuevas de three.js |

### 2.5 Fuera de juegos pero útil

- **`claude-api`** — construir apps con la API de Claude (por ejemplo: un juez de IA adentro de un
  juego, como en CUBOS, donde tres fotos de la obra van a `api.anthropic.com` con la llave **del
  jugador**, que vive sólo en su teléfono).

---

## 3. Cómo se arma un juego

### 3.1 La estructura

```
herramientas/<juego>/
  partes/
    a.html     ← marco, CSS, DOM
    b.js       ← constantes y tablas
    c.js       ← el modelo puro (sin DOM, sin three)
    d.js       ← audio
    e.js       ← dibujo
    …
    i_assets.js  ← base64 generado (OPCIONAL)
    i_son.js     ← base64 de audio (OPCIONAL)
  armar.py     ← los concatena en juegos-pc/X.html
  hornear*.py  ← genera i_*.js desde crudo/
  pedir_*.py   ← pide los assets al generador
  crudo/tareas.json  ← los task_id (VERSIONAR: perder un id es perder un asset pagado)
  banco.mjs    ← importa b.js+c.js en node para auditar sin navegador
```

### 3.2 La regla que más costó: TDZ

> **Todo termina siendo UN módulo ES.** Un `let`/`const` leído antes de su línea **no devuelve
> `undefined`: TIRA, y se lleva el módulo entero** — pantalla en blanco, sin error visible en el
> juego. Ya pasó **nueve veces** en este repo. Ni `typeof` lo salva: sobre una zona muerta,
> `typeof` también tira.

Consecuencia: **el `ORDEN` de `armar.py` es el orden en que hacen falta, no el alfabético**, y las
declaraciones van **antes del primer uso**, no «donde corresponde temáticamente».

### 3.3 Los `i_*.js` son opcionales por construcción

`armar.py` imprime `(sin i_assets.js, se arma sin esos assets)` y el juego dibuja y suena igual.
Eso es lo que hace que **un base64 roto cueste una pieza y no la pantalla entera**.

### 3.4 Comprobar la sintaxis después de armar

```bash
node -e "const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
const s=f.readFileSync('juegos-pc/X.html','utf8');
const m=s.match(/<script type=\"module\">([\s\S]*)<\/script>/);
try{a.parse(m[1],{ecmaVersion:'latest',sourceType:'module'});console.log('ok')}catch(e){console.log('ERROR',e.message)}"
```

**La ruta de acorn va ABSOLUTA.** Con `require('acorn')` a secas falla según desde dónde se corra.

### 3.5 Nombres de una letra: no

`function T(k)` para traducir contra `import * as T from 'three'` → `Identifier 'T' has already
been declared` y se cae el juego entero. Pasó nueve veces con `T`, `caja`, `mf`, `bx`, `reja`,
`pack`, `aguaCosto`, `anim`, `cajArrastra`. **Y en un objeto literal de sondas, dos claves iguales
no fallan: gana la última, y la primera deja de existir en silencio.**

---

## 4. El banco de pruebas

```bash
bash herramientas/banco/armar.sh                      # lo rearma en /tmp/ui
python3 herramientas/<juego>/prep_banco.py juegos-pc/X.html /tmp/ui/x.html
cd /tmp/ui && fuser -k 8098/tcp; PAGINA=x.html MOVIL=1 bash run2.sh PLAN.json out/x.log 412 892
```

**`prep_banco.py` reescribe los CDN a `node_modules` local.** Chromium en el contenedor **no usa
el proxy de salida** (curl sí), así que un import a jsdelivr falla con «Failed to fetch dynamically
imported module». Ojo con **de qué CDN** importa cada juego: unpkg y jsDelivr son dos reescrituras
distintas, y eso ya costó media vuelta.

Un plan es una lista de:
- `{"js": "…"}` — evalúa una **expresión** (un `await` suelto arriba de todo da
  `SyntaxError: missing ) after argument list`; una promesa va con `.then(r => JSON.stringify(r))`)
- `{"click": "selector"}`
- `{"wait": ms}`
- `{"n": "nombre"}` — captura

Las capturas salen a `/tmp/ui/out/` en **412×892 vertical y giradas**: hay que enderezarlas con
`Image.rotate(90, expand=True)` para juzgarlas como las ve el jugador. **Sin girarla, la captura
miente**: un pájaro dibujado como una «m» horizontal aparece como un paréntesis vertical.

### 4.1 Las sondas

Cada juego expone `window.__X` con sus mediciones. **Ahí está la mitad del valor de todo esto.**
Las que siempre hacen falta:

| sonda | qué devuelve |
|---|---|
| `est()` / `costo()` | llamadas de dibujo, triángulos, ms por cuadro |
| `cajas()` / `solapes()` | solapamientos del HUD y elementos fuera del marco |
| `brillo()` | lee el búfer con `readPixels` — **no con `drawImage`**: un lienzo WebGL sin `preserveDrawingBuffer` sale en cero |
| `anda(n)` | camina de verdad, por el mismo camino que el dedo |
| `audita(n)` | valida N niveles/semillas sin navegador |
| `juegaSolo()` | el auto-jugador termina la partida |
| `assets()` | cuántos assets llegaron y cuáles fallaron |
| `lang(x)` | cambia idioma en vivo |

### 4.2 Las trampas de las sondas (todas pagadas)

> **La sonda puede estar mal ANTES que el juego.** Señal: un número demasiado redondo, o un
> resultado que no cambia cuando debería.

1. **Números demasiado redondos.** Midiendo temblor de cámara salieron 10,00 · 14,14 · 17,32 mm —
   que son 10·√1, √2 y √3. Era el `toFixed(2)` de la sonda.
2. **Una sonda que ESCRIBE el estado que va a medir** aprueba cualquier cosa. `cajModo(v)`
   repintaba la lista antes de leerla; `verCara(true)` forzaba el estado contrario; `cajon()` sin
   argumento **abría el cajón**.
3. **Una sonda que no adelanta todos los relojes mide un juego que no existe.** Si adelanta la
   física pero no el dibujo, la bufanda nunca vive, las partículas no envejecen y **la cámara se
   queda donde arrancó** — la foto sale con el nivel vacío.
4. **`getBoundingClientRect` devuelve la caja ALINEADA A LOS EJES.** Con el marco girado 90° o con
   un `scale`/`rotate` puesto, infla la caja y denuncia solapamientos que no existen. Va
   `offsetTop`/`offsetLeft`/`offsetWidth`.
5. **Las matrices de three.js se recalculan al DIBUJAR.** Proyectar justo después de mover la
   cámara usa la matriz del cuadro anterior. Hay que llamar a `updateMatrixWorld()` dentro de la
   propia sonda. (Cinco veces.)
6. **Un punto DETRÁS de la cámara proyecta igual, dado vuelta, y cae adentro del cuadro.** «Está en
   pantalla» necesita comprobar también la profundidad.
7. **Medir sin un control no prueba nada.** El A/B va **en el mismo binario** con una constante
   dada vuelta, no contra el recuerdo ni contra otro commit. Y si las dos filas dan lo mismo, lo
   más probable es que el interruptor no esté conectado.
8. **Comparar contra el commit anterior EN EL MISMO BANCO** es lo único que separa «esto lo rompí
   yo» de «esto ya era así» (`git show HEAD:archivo`).
9. **Una prueba que nunca puede dar limpio deja de detectar el defecto de verdad.**
10. **Una sonda que informa una victoria que no ocurrió es el peor defecto posible**, porque
    aprueba todo lo demás. `gano` tiene que salir de que la partida llegó al final, no de una
    global que quedó vieja.

---

## 5. Los assets generados

### 5.1 Rezona Lab (Tripo para 3D, más imagen y audio)

Cliente por stdio, treinta líneas:

```bash
python3 herramientas/rezona/rz.py tools
python3 herramientas/rezona/rz.py call submit_model3d_generation '{"project_id":"…","output_path":"assets/x.glb","prompt":"…"}'
```

Herramientas: `submit_image_generation` · `submit_model3d_generation` ·
`submit_rig3d_generation` · `submit_audio_generation` · `check_generation_tasks` ·
`fetch_generated_asset`.

**Autenticación por la variable de entorno `REZONA_PAT`.** Si una sesión dice «Not authenticated»,
comprobar `${REZONA_PAT:+definida}` antes de pedir un login nuevo. La credencial también puede
vivir en `~/.rezona/credentials.json` (la escribe `npx rezona@latest login` con un código de un
solo uso). **`.rezona/` va en `.gitignore`: el cliente puede vivir en el repo, la llave no.**

#### Las trampas de Rezona (todas pagadas)

- **Las respuestas vuelven DESORDENADAS.** Emparejar por posición cruza los resultados en silencio.
  Hay que ordenar por el `id` del JSON-RPC.
- **`check_generation_tasks` devuelve la lista bajo `items`.** Leyendo `tasks` o `results` el bucle
  de espera se cuelga sin decir nada.
- **`fetch_generated_asset` escribe RELATIVO A SU PROPIO directorio de trabajo** y se planta si ahí
  no hay marca `.rezona/`. Hay que hacer `npx rezona@latest init` en una carpeta **fuera del repo**
  y llamarlo con `cwd=` esa carpeta.
- **`fetch_generated_asset` se vence a los 300 s CON EL ARCHIVO YA BAJADO.** Medido: un PNG de
  1.404.170 bytes aterrizó exactamente a los 5m00 mientras el cliente tiraba `TimeoutExpired`.
  Hay que esperar **al archivo** (dos lecturas de tamaño iguales), no al proceso — con `Popen`,
  no con `run`.
- **Todas las tareas devuelven el MISMO `asset_path`.** Hay que copiar al repo después de cada
  fetch, antes del siguiente.
- **El tope de tareas en vuelo es 12, POR CUENTA y no por proyecto.**
- **El `output_path` que hay que pedir lleva el sufijo del servidor**: no `assets/x.mp3` sino
  `assets/x-g1.mp3`.
- **`publish_to_rezona_app` es IRREVERSIBLE.** No llamarlo nunca sin pedido explícito.
- **TODO SE GENERA EN UN SOLO PROYECTO DESCARTABLE**, no en uno por juego. Y el borrado no se puede
  hacer desde la API: `DELETE` y `PATCH` de `/api/projects/{id}` devuelven **403
  PAT_ROUTE_FORBIDDEN**. Lo único que está de nuestro lado es que haya **uno** y que el nombre diga
  que se puede borrar.
- **`list_projects` pagina de a 20 y devuelve `total`.** Leyendo sólo los items, una cuenta con 339
  proyectos parece tener veinte.
- **Hay dos credenciales y no son la misma cuenta.** Lo generado por una no se ve desde la otra —
  contesta «Not your project», que se lee a proyecto borrado y no lo es.

### 5.2 Higgsfield

MCP a nivel de cuenta: `generate_image`, `generate_video`, `generate_audio` (TTS y efectos),
`generate_3d`, `media_upload` (devuelve una URL pública permanente, que es lo que permite usar
**la imagen del propio usuario** como `source_url` de un modelo 3D — así el modelo no se parece:
**es** el dibujo).

Conviene generar con los dos y **comparar dentro del juego**, no en la hoja de contactos.

### 5.3 Las reglas de horneado — cada una costó una vuelta

1. **Pedir `face_limit` AL GENERAR.** Tripo devuelve **un millón** de triángulos; bajar eso a dos
   mil es tirar el 99,8 % y el simplificador se come los tiradores de los cajones — los muebles
   salen «corruptos». Con `extra:{face_limit:6000}` entran con 5.000 y se bajan a 3.000.
   También existe `extra:{"smart_low_poly": true}`, que remalla de verdad (23 % más abajo) y trae
   PBR — pero **no respeta `face_limit`**: pedido 1.100 devolvió 2.544.
2. **El objetivo es un NÚMERO DE TRIÁNGULOS, no un ratio.** `-si 0.06` parecía trabado y hacía
   exactamente el 6 % de lo que se le daba — de un millón.
3. **`gltfpack` va con `-noq`.** La cuantización entra como `KHR_mesh_quantization` en
   `extensionsRequired` y un lector que no la soporte no muestra **nada**.
4. **La textura se hornea EN LOS VÉRTICES antes de decimar.** Con UV puestas el simplificador tiene
   que respetar las costuras y se planta (medido: 30.673 → 11.184 con `-si` de 0,04 a 0,20, o sea
   que el parámetro no hacía nada). Y el punto de muestreo es **el CENTROIDE del triángulo**, no el
   UV del vértice: el atlas de Tripo son miles de manchitas de nueve píxeles y el UV de un vértice
   cae en la ESQUINA de su isla — agarra el borde, el relleno o el color de la isla de al lado.
   **La V no se da vuelta** (glTF pone el origen arriba a la izquierda): con el volteo puesto, un
   muslo que tiene que ser denim devuelve gris.
   Y se convierte **de sRGB a lineal** al muestrear, porque glTF trata `COLOR_0` como lineal.
5. **Leer `COLOR_0` COMO VENGA, no como uno supone.** gltfpack lo devuelve en VEC4 de bytes
   normalizados aunque se le pase `-noq`; leído como tres floats sin normalizar, todo sale **blanco
   puro con motas de colores**. Ni falla ni avisa. El número de componentes sale del accesor y la
   marca de normalizado de que el array no sea de floats.
6. **Contar LOS METROS que cubre cada foto** —hiladas de ladrillo, filas de teja, tablas— y usar ese
   número para la repetición. Sin eso salen hiladas de 22 cm y la casa se lee a casa de muñecas.
   **Y la escala se promedia POR MATERIAL, no por nombre ni por textura**: la misma textura puede
   ser una alfombra de 16 m y el vestido de una muñeca.
7. **El tinte se RECALCULA cuando cambia la foto.** three.js multiplica
   `map × vertexColor × material.color`: el color del material es un **tinte sobre la imagen**. Se
   divide **en lineal** el promedio viejo por el nuevo. Sin esto, poner una foto de pasto puede
   dejar el jardín verde manzana, o un valle entero naranja.
8. **El mapa emisivo se DERIVA de la propia foto** (lo que pasa un percentil de luminancia, con
   rampa — un corte duro deja las ventanas dentadas), no se pide como segunda imagen: si no, hay
   ventanas que brillan sin estar dibujadas.
9. **Las costuras se resuelven con `MirroredRepeatWrapping`**, no cosiéndolas a mano: la copia de al
   lado va dada vuelta, así que los dos bordes que se tocan son **el mismo borde** y la costura no
   puede existir. Coserlas a mano ensucia el centro, que es lo que más se mira.
10. **Los ejes de un hueso NO SE ADIVINAN: se giran y se mira dónde quedó la punta.** Los ejes
    locales son los que dejó el bind y no significan nada. En BARRIO el muslo se movía **más de
    costado que hacia adelante** porque estaba en X y la flexión era Y — 7,0 cm contra 57,3.
    La sonda es `ejeH(hueso, destino, ax, ay, az)`: gira un radián y devuelve el desplazamiento del
    pie en el marco del personaje.

### 5.4 Más cosas del horneado

- **El fondo se saca por RELLENO DESDE EL BORDE, no por umbral de luminancia.** Un umbral también
  se come las partes claras **de adentro** del dibujo (el blanco del ojo, la llama de una vela, el
  brillo adentro de una letra). Lo que no se alcanza desde afuera es dibujo, por construcción.
- **El recorte de un sprite va por COMPONENTES CONEXAS**, no por reja: la reja que se pide es una
  sugerencia. Se pidieron tres esquiadores en 3×1 y volvieron **2×3 con las filas repetidas**.
- **La escala de un cuadro se mide contra algo INVARIANTE a la pose.** La altura del cuadro no
  sirve (uno sentado ocupa menos alto y el generador lo dibuja más grande para llenar el cuadro).
  Lo que no cambia es la **cabeza**, y se la encuentra por el **cuello**: el primer sitio donde el
  ancho de la tinta cae por debajo del 75 % de lo que venía midiendo.
- **El nivel de audio se mide SOBRE EL MP3 YA ESCRITO**, no sobre el float. A 24-40 kbps el
  codificador se lleva casi todo el brillo, y en un chasquido ahí está la mayor parte de la
  energía: medido, dos tercios de lo pedido. El lazo se cierra: escribir, medir, corregir, volver a
  escribir.
- **Se nivela por RMS y no por pico**, y la fuerza del aplaste (`tanh`) se **busca**, no se elige:
  un clip con pico 0,92 y rms 0,020 no se puede subir sin recortar.
- **El pico del MP3 no es el del float** — el codificador se pasa entre muestras. El techo manda
  sobre el objetivo.
- **Se recorta la ráfaga de más ENERGÍA, no el pico más alto.** Un clip de treinta segundos trae
  respiraciones y a veces un chasquido al final que mide más que el grito. Pero **una frase se
  recorta sólo por los extremos**: tiene pausas entre palabras y cortar por ráfagas la parte al
  medio.
- **Un bucle de música se cose**: la cola se funde sobre la cabeza. Un tema cortado en seco da un
  golpe en cada vuelta que se escucha más que la música. Y va con `BufferSource` y no con
  `<audio loop>`, que vuelve al cero con un hueco de milisegundos.
- **`duration` es un TECHO y no una orden.** Se piden 20 s y vuelven 10.
- **Un prompt que pide un sonido chiquito devuelve SILENCIO.** «soft UI click» vuelve con pico
  0,005. Los prompts describen el **objeto físico** y piden *fuerte, cerca y seco*; **el nivel lo
  pone el código, nunca el prompt.**
- **Un rig se rechaza por la SILUETA, y la caja lo dice antes de gastar.** Si el hondo se parece al
  alto, el pre-chequeo lo va a rechazar (`RIG_SOURCE_NOT_RIGGABLE`): eso no es una figura de pie,
  es una losa. Un busto o una calavera **no se pueden riggear nunca**.
- **El vocabulario de animaciones lleva prefijo** (`preset:walk`, no `walk`) y los nombres
  desconocidos **se ignoran EN SILENCIO**, devolviendo los clips de regalo. Tope de 5 por tarea.
- **Un GLB se poda**: fuera las UV si el shader no las usa, normal a un byte, posición a dos bytes
  (short normalizado da 3 centésimas de milímetro sobre dos metros), pesos e índices de esqueleto a
  un byte. **Y el `min`/`max` de un accesor va en las UNIDADES GUARDADAS**, no en metros: con el
  min/max en float sobre un accesor normalizado, three.js calcula una caja de 47 micras, pone la
  cámara adentro y **no dibuja nada**.
- **El material se reemplaza ENTERO, no se le sacan las texturas de a una.** Tripo devuelve tres
  imágenes (color, metal-rugosidad, normales) y sacando sólo la de color quedan referencias
  colgadas: gltfpack contesta «invalid GLTF» sin decir cuál.
- **Un esqueleto puede venir en centímetros con un `Armature` que escala por 0,01.** Hay que
  pasarlo a metros **y rehacer las matrices de bind**, que traen esa escala adentro del 3×3.
- **WebP dentro de un GLB necesita `EXT_texture_webp` declarada**; si el lector no la soporta, el
  modelo aparece **sin textura**. JPEG es núcleo de glTF.
- **41 huesos no entran en un teléfono viejo**: WebGL1 garantiza 128 vectores de uniform de
  vértice, o sea 32 mat4. 41 huesos son 164 vectores y **el shader no compila** — y eso no falla
  con un dibujo feo, falla con una pantalla vacía. Los huesos de torsión se colapsan a sus padres.

---

## 6. Las reglas de diseño que se repiten

### 6.1 El reloj

**Paso fijo con interpolación.** La simulación corre a 60 pasos por segundo fijos y el dibujo
interpola con el sobrante del acumulador. Sin esto, un teléfono a 30 y una notebook a 144 **no
juegan el mismo juego**: la velocidad, el alcance y la persecución salen distintos, y eso no es una
diferencia de rendimiento, es **otro juego**.

Dos protecciones: el `dt` se topa (una pestaña dormida no simula cuarenta pasos de golpe) y los
pasos por cuadro también (si el aparato no llega, va en cámara lenta pero no se cuelga persiguiendo
el reloj).

**Y las pausas van DENTRO del paso fijo, no en `setTimeout`** — una pausa con `setTimeout` es la
única parte del juego que no respeta el reloj.

### 6.2 La generación

> **Un nivel generado y no jugado es un nivel roto que todavía no se sabe.**

El generador tira, un **validador** comprueba, y un **auto-jugador** lo termina de punta a punta.
Costó siete niveles imposibles en Maicol y una nube 37 de 42 en BARRIO.

- **El validador y el juego usan la MISMA cuenta.** Con dos, el validador aprueba un juego que no
  existe. `chocaRotor()`, `pega()`, `puedeSalir()`, `reclama()`, `pedirToque()` — una función, y la
  llaman el dibujo, la regla, el generador y el validador.
- **«Existe una ventana» no es «se puede jugar».** Barrer los primeros segundos dice algo del
  principio del nivel; lo que vale es una **fracción mínima de instantes seguros**, que es una
  propiedad del sector y vale en cualquier momento.
- **El auto-jugador tiene que entrar POR EL MISMO CAMINO que el dedo.** Si escribe el estado
  directo, está jugando otro juego y que gane no prueba nada.
- **Hacen falta DOS auto-jugadores**: el honesto y el que juega al azar. La separación entre los dos
  es la única prueba de que hay una decisión adentro. Si los dos dan lo mismo, no hay juego.
- **Y un tercero, el «torpe»**, para distinguir «hay que decidir» de «hay que tener reflejos».
- **Si el nivel no se puede generar con la dificultad pedida, se BAJA la dificultad.** Un nivel
  vacío no es fácil: es un nivel que no existe.

### 6.3 Los assets

> **Lo generado NO reemplaza nada hasta que llega.**

Se arranca con lo dibujado por código y la foto o la malla lo pisa cuando decodifica. Un base64
roto cuesta **una pieza**, no una pantalla vacía. Y lo procedural **no se borra**: si un MP3 no
decodifica, suena el oscilador de siempre — un juego mudo por un decodificador es peor que uno con
bips.

**Y hace falta una sonda `assets()`**: un base64 que no decodifica **no falla ni avisa**, la pieza
se sigue dibujando por código y desde afuera se ve igual que si el asset nunca se hubiera pedido.

### 6.4 El cuerpo

- **La cadencia es un dato del cuerpo:** `pasos por segundo = velocidad ÷ paso`. Un humano camina a
  1,9-2,4 y corre a 3-4. **Y el paso lo pone el CICLO de animación, no una constante al lado** — se
  mide al hornear la tabla. Con un número a mano, los dos se separan el día que se toca el ciclo y
  los pies patinan.
- **El patinaje cero es por construcción**, no por ajuste: durante el apoyo el pie está clavado, así
  que el cuerpo avanza exactamente lo que el pie barre hacia atrás.
- **Una pose es un DELTA sobre el reposo del rig, no un absoluto.** `rotation.set(mi_pose)` **borra**
  la pose de bind y la cadera salta media vuelta.
- **El giro se pide en ejes de MUNDO y se lleva al hueso con `P⁻¹·R·P`**, donde P es la rotación de
  mundo del padre en reposo.
- **Un hueso mal pesado gira igual y no desplaza un vértice.** La única prueba de que un rig hace
  algo es **medir cuánto se movieron sus propios vértices**.
- **La cabeza se achica a la centésima parte en primera persona** — y eso deja un agujero en el
  cuello, que hay que tapar con un casquete.
- **`Head` no domina la cabeza entera**: hay vértices de cráneo pesados a `neck`, y mirando hacia
  abajo aparece la propia nuca llenando el cuadro.

### 6.5 El movimiento y la cámara

- **Lo que se lee a «tiembla» es la FRECUENCIA, no la amplitud.** Por encima de un hertz cualquier
  amplitud tiembla aunque mida un milímetro. Un plano de cine no cabecea con cada pisada.
- **Coyote y salto guardado** (0,10-0,16 s): un gesto de dos manos no se suelta en el mismo cuadro.
- **El movimiento de un tirador**: se agrega **sólo lo que falta en la dirección pedida** y el roce
  va **sólo a la componente de costado**. Sumando aceleración al vector y topando la velocidad
  total, doblar **frena** y el tope real queda 10 % por debajo del ajuste.
- **`rotation.z` sobre una cámara recompone el Euler ENTERO**, y el orden de fábrica es `XYZ`: el
  cabeceo se aplica alrededor del X del mundo después del giro y **ladea el horizonte** tanto más
  cuanto más grande sea el giro. Para una cámara de girar-y-cabecear va `rotation.order='YXZ'`, o
  la deriva como cuaternión local.
- **Una cámara metida en la cabeza no puede ver la cabeza, sólo su interior.**
- **La cámara al hombro por debajo de cierta distancia tiene que pasar a primera persona entera**,
  con histéresis: a veinte centímetros no es «al hombro», es estar adentro del muñeco.

### 6.6 El HUD y los paneles

- **El solapamiento se hace IMPOSIBLE POR CONSTRUCCIÓN**, no se ajusta: los elementos van en una
  columna flex, no posicionados en absoluto con píxeles.
- **Las posiciones pueden encoger; el texto no.** Todo el texto lleva mínimo con `max()`: medido,
  un objetivo a 6,3 px es invisible justo en el aparato donde se juega.
- **Un elemento nuevo que ninguna prueba mira es un solapamiento esperando.**
- **Un elemento con `opacity:0` SIGUE recibiendo el puntero.** Y un `backdrop-filter` se compone
  aunque el padre esté en `opacity:0` — hace falta `visibility:hidden`.
- **Un `preventDefault` en `touchstart` cancela el `click`.** Con los escuchas colgados de la
  ventana, tocar JUGAR en un teléfono no hace absolutamente nada. La entrada del juego cuelga del
  **lienzo**; los paneles viven por encima.
- **Un ID le gana a dos clases** aunque las dos tengan `!important`. Y **un estilo en línea le gana
  a cualquier selector** — eso ya dejó el vidrio sin recalibrar y la flecha de un botón embaldosada.
- **`font: 700 13px/1.2 inherit` es una declaración INVÁLIDA** (el atajo no acepta `inherit` como
  familia) y el navegador **descarta la declaración entera**. Había 49 en un archivo: todo el texto
  salía 60 % más grande y sin peso.
- **Un atajo de CSS repone a su valor inicial todo lo que no nombra.** `b.style.background = color`
  se lleva puesta la imagen de fondo.
- **Medir contra el padre devuelve «entra» siempre** si el padre es un ítem de grilla con
  `min-width:auto`: no puede achicarse por debajo de su contenido. Se mide contra el marco.
- **`textContent` sobre el padre BORRA a los hijos.**
- **El tamaño de un título se MIDE y se divide**, no se elige: el mismo texto mide distinto en cada
  idioma, y el ancho es lineal en el cuerpo de la letra (el espaciado va en em), así que una sola
  pasada alcanza.
- **En un marco girado 90°, `vh` resuelve contra la VENTANA y no contra el lado corto del marco.**
  Hay que publicar `--mh`/`--mw` y usar eso.
- **Un juego apaisado dentro de un teléfono vertical se GIRA** (el marco entero, una sola
  transformación), no se encoge: un 16:9 sin girar en un 412×892 mide 412×232, el 11 % de la
  pantalla. Y **no hay pantalla de «gira el celular»**, que es una pantalla que no hace nada.

### 6.7 La traducción

> **Una tabla de datos no se traduce con una cadena.** Las tablas se arman una vez al arrancar, así
> que si el texto queda ya resuelto, cambiar de idioma **no lo cambia nunca**.

- **El texto se guarda como CLAVE, no resuelto**, y una sola función lo repinta todo
  (`pintaIdioma()`). Repartido campo por campo, el próximo panel que se agregue queda sin traducir.
- **Y hay que guardar el ESTADO, no el texto.** Un panel de final que ya está en pantalla necesita
  saber si la victoria fue perfecta y cuántos toques costó para poder repintarse.
- **El plural no es un sufijo**: «cut/cuts» y «solicitud/solicitudes» son palabras distintas en la
  tabla. (Tres veces.)
- **Hay texto que no es `textContent`**: los `placeholder` necesitan su propio barrido, y lo que
  vive en un `::after` de CSS va por variable.
- **La auditoría compara contra los valores EN CASTELLANO de las propias tablas**, no por acentos ni
  por diccionario: el portugués y el castellano comparten casi todo. Cero falsos positivos por
  construcción. Y hay que **decodificar las entidades** antes de comparar.
- Medido una vez: 137 claves en castellano contra 30 en inglés, y ~40 cadenas escritas derecho en
  el código sin pasar por la tabla.

### 6.8 El audio

- **Todo cuelga de un maestro**, y ahí se cuelga el analizador: es lo único que prueba que sonó.
  «No tiró excepción» no es «se escuchó».
- **Un `<audio>` suelto NO SE PUEDE MEDIR** y en un teléfono, pasado el límite de elementos, **no
  suena y no avisa**. Va todo por WebAudio con `BufferSource`.
- **El contexto de audio se crea con el PRIMER GESTO de verdad**, en captura sobre el documento —
  no en el botón JUGAR, que no siempre es el primero. Y los clips se decodifican ahí: antes, el
  contexto está suspendido y se pierden en silencio.
- **La escala de la mezcla se mide y es fija:** cama ≪ acción < monstruo ≪ grito. Lo que cuesta una
  vida es lo más fuerte del juego. La música tiene que quedar **por debajo** del sonido de llegar.
- **Igualar por PICO deja los temas con distinta sonoridad**: un tema denso y uno espaciado con el
  mismo pico no se escuchan igual. Se iguala por **rms**; el pico es sólo un techo.
- **La ventana del analizador son 23-43 ms.** Una sola lectura cae donde caiga: hay que **barrer el
  clip entero** y quedarse con el pico, **y medir el fondo con la misma regla**.
- **Un auto-jugador apila todos los sonidos en el mismo instante de audio**: `anda()` comprime
  miles de pasos en una vuelta sincrónica de JS y `AudioContext.currentTime` no avanza adentro de
  una. Los cientos de disparos **se suman en fase** y el pico da 1,0 o 12,8. No es la mezcla: es
  que la mezcla no se puede medir ahí.
- **Un pasabanda estrecho sobre ruido blanco se come casi toda la energía.** Un efecto que «suena
  flojo» puede ser un Q de 1,3 que tiene que ser 0,8.
- **La pisada va atada a la FASE del paso, no a un temporizador.** Con la fase, el sonido y el
  balanceo son el mismo número y no se pueden desincronizar. Y en la rama de choque del eje Y se
  dispara **24 veces por segundo** — o sea ruido blanco.
- **Una voz es UNA boca**: la fuente es una sola y la nueva corta a la anterior, sea cual sea su
  clave. Y **una línea sin clip también tiene que callar a la anterior**.
- **La música se agacha mientras habla alguien**, y eso va como un **factor** que el propio bucle
  suaviza — una rampa programada se pisa al cuadro siguiente si hay una línea que escribe la
  ganancia todos los cuadros.

### 6.9 Los assets del menú

- **El menú tiene que mostrar el juego.** Un panel opaco encima de una escena que ya está dibujada
  tira a la basura lo único que el juego tiene para enseñar. El velo va en **degradado** —cerrado
  arriba donde va el título, abierto en la franja donde pasa el juego— y detrás corre el mismo
  auto-jugador que valida, así no hay una segunda animación que mantener.
- **El título escrito con la tipografía del sistema cambia de forma según el aparato** (Roboto en
  Android, San Francisco en iPhone, Segoe en Windows). Lo único que uno reconoce de lejos tiene que
  ser una imagen.
- **Un modelo de imagen no deletrea a pedido.** Se piden tres variantes con la palabra escrita
  letra por letra y se elige la que está bien. (Volvió «RECEO».)
- **Una ficha de un objeto es el objeto puesto**, no una muestra de su material: la textura sola en
  un cuadrado es un pedazo de pared.
- **Una imagen entra CORTADA por el borde**, no centrada: centrada y entera se lee a calcomanía
  pegada encima; entrando desde afuera del cuadro se lee a que el mundo sigue.

### 6.10 Lo que hace que se vea bien

- **La silueta gana sobre el detalle.** Un modelo fotorrealista de cuarenta píxeles pierde contra
  seis cajas, porque lo que hace que un personaje exista en una escena monocroma no es el detalle:
  es que su color no esté en ninguna otra parte y que su silueta tenga tres bloques planos.
- **El negro absoluto no tiene sombreado que mostrar.** Una pieza en `0x14100f` no se lee a bicho,
  se lee a agujero. Va gris pardo con brillo húmedo y un emisivo bajo.
- **El emisivo POR MAPA no levanta a un objeto negro, porque multiplica.** A un objeto oscuro se le
  da un piso **plano, sin mapa**.
- **Un `HemisphereLight` con los dos colores iguales no tiene forma**: reparte según hacia dónde
  mira la cara, así que todas reciben lo mismo. Y con el suelo en negro, **toda cara que no mire al
  cielo recibe cero**.
- **La caída al cuadrado no sirve adentro de un cuarto** (`1/d²` describe una bombita en el vacío;
  adentro, casi todo lo que se ve es el segundo rebote). Va en 1,1-1,35.
- **Una luz frontal NO MODELA.** La clave va 40° de costado y 35° de alto, con un contra frío del
  otro lado, que es lo único que separa una silueta de un fondo desenfocado.
- **La intensidad de una luz pegada a la cámara tiene que crecer con la distancia al objeto**: la
  misma que modela una cara a dos metros deja un antebrazo a ochenta centímetros en blanco puro.
- **El aplaste y el estire** separan un muñeco que se traslada de un personaje que se mueve, y se
  anclan **en la cara que toca**, no en el centro.
- **Un cono tiene silueta.** Para un halo hace falta un degradado radial encarado a la cámara, que
  no tiene borde en ningún lado.
- **Un plano de color parejo se lee a cartulina.** Un reflejo en el piso, un rayo de sol, una nube:
  todo lo que no tiene borde en la realidad no puede tener borde en el dibujo.
- **Lo que se mira a tres metros son los BORDES**: el alero, la fascia, el zócalo, el alféizar, la
  canaleta. Piezas de diez centímetros, y son las que hacen que una casa no sea una caja.
- **Una cara hecha de bultos convexos se compone CONTRA LA SUPERFICIE DEL CRÁNEO**, porque lo que
  quede por detrás no se ve — no hay cuenca excavada.
- **El ojo no se pone donde va anatómicamente**: los ojos suelen quedar por delante del esternón, y
  con el lente ahí lo único que se ve mirando abajo es el interior del cuello.
- **Perspectiva aérea**: lo lejano va con menos color y menos contraste, si no se lee más cerca que
  lo cercano.
- **`setRGB` y `new THREE.Color(0x…)` toman los números como LINEALES** (según la versión), así que
  un color escrito como sRGB sale lavado: un rosa fuerte sale rosa pálido y un verde sale blanco.
  Va `convertSRGBToLinear()`. **Y esto ya costó cuatro vueltas.**
- **Una pasada de post con `ShaderMaterial` crudo NO recibe la conversión a sRGB** que three.js
  inyecta en sus materiales: hay que escribirla a mano o todo sale oscuro. Y **un render target
  declarado `SRGBColorSpace` guarda codificado y el hardware decodifica al muestrear**, así que sin
  volver a codificar la pantalla mide 3,7 donde el destino mide 36,6.
- **El tone mapping no se aplica dibujando a un render target**, así que la exposición no mueve
  nada.
- **Un parámetro que no cambia lo que tiene que cambiar es un parámetro que no está en el camino.**
  Barrer el ambiente de 0,62 a 2,4 y ver que el brillo se mueve 0,6 sobre 255 no significa que haga
  falta más luz: significa que el problema es otro. Un **material de diagnóstico** (pintar las
  normales) contesta en un cuadro lo que un barrido no contesta nunca.
- **El descarte de caras traseras no mira la normal: mira el ORDEN de los vértices.** Un techo con
  el bobinado invertido no se ve como «falta el techo», se ve como «está oscuro».
- **`computeVertexNormals` sobre una geometría indexada PROMEDIA** las caras que comparten cada
  vértice: la cumbrera de un techo termina con la normal mirando al piso. Va `toNonIndexed()`.
- **Un `map` sin coordenadas UV no falla ni avisa**: WebGL pasa (0,0) y setenta metros de pasillo
  salen pintados con **un solo texel**.
- **`Matrix4.lookAt` orienta el objeto mirando por su −Z** y un `PlaneGeometry` tiene la cara en +Z:
  con `FrontSide` las nubes miran para el otro lado y no se ven.
- **Los mipmaps mezclan la baldosa de al lado.** Un atlas se muestrea con `NEAREST` y sin mipmaps, y
  la UV se mete medio texel para adentro.

### 6.11 El rendimiento

- **Lo que siempre se paga es el RELLENO de píxeles.** Todo lo demás es secundario. La palanca
  principal es dibujar a un destino reducido y estirarlo — y en un juego pixelado eso además **es**
  el estilo, así que sale gratis.
- **`renderer.info.render` se pone a cero al empezar CADA `render()`**, y la pasada de sombra es
  otra pasada dentro de la misma llamada: leído sin apagar `autoReset`, apagar las sombras
  **parece no cambiar nada**. (Tres veces.)
- **Una sombra es una pasada entera de la escena.** Con sombras, todo lo que proyecta se dibuja dos
  veces. Y el mapa cubre un **área fija**: una caja de sombra del tamaño del mundo deja la sombra de
  una persona en cuatro píxeles. La caja chica sigue al jugador.
- **El mapa de sombra viejo hay que SOLTARLO a mano**: three.js no recrea la textura porque cambie
  `mapSize`.
- **Una luz con intensidad cero no puede proyectar sombra**: la sombra sólo puede oscurecer su
  propia contribución.
- **Fundir geometría es la palanca más grande de llamadas de dibujo.** Una caja suelta es una
  llamada: 359 piezas → 15 mallas, 331 llamadas → 49. **Con índice en `Uint32`**, que pasados 65.535
  vértices el desborde no avisa: dibuja triángulos que apuntan a cualquier lado.
- **El color por vértice es lo que hace que fundir no cueste variedad.** three.js multiplica
  `map × vertexColor × material.color`.
- **Instanciar**: una malla instanciada cuesta una llamada haya uno o haya catorce. Y para esconder
  una instancia se le pone la **matriz en cero**, no se la saltea — las instancias son un rango
  contiguo y saltear una corre el índice.
- **`frustumCulled = false`** cuando el centro de la instancia no es el del objeto.
- **Se funde por CUADRA y no por mundo**: con todo en una malla no hay recorte por frustum posible.
  Y los trozos chicos son los que el frustum descarta — por eso partir más fino puede **bajar** los
  triángulos aunque suba las llamadas.
- **El ritmo de un sensor se ajusta solo al COSTO MEDIDO**, no se fija: `hz = carga / lo que tarda`.
  Un número fijo le sobra a un teléfono rápido y hunde a uno lento.
- **Y bajar el ritmo de un sensor no puede bajar el ritmo del DIBUJO**: entre medición y medición se
  interpola, con predicción acotada en tiempo (cubre el hueco y ni un milisegundo más), atada a la
  velocidad (con la mano quieta la diferencia entre dos medidas es ruido, no movimiento) y acotada
  en distancia.
- **Un control de resolución dinámica necesita banda muerta y escalones geométricos.** Si dos
  escalones vecinos están en razón *k*, el tiempo se multiplica por *k²*: con *k²* mayor que la
  banda muerta, **el control no puede quedarse quieto** y late. Medido: 16 cambios por minuto ya
  asentado con *k²*=1,66, cero con 1,25.
- **Y el lazo se mide CERRADO** (el tiempo sale de lo que el control hizo): con tiempos fijos casi
  cualquier regla se queda quieta.
- **`will-change` RESERVA una superficie.** Cuatro capas promovidas detrás de una hoja opaca son
  cincuenta megas de textura sostenida para no dibujar nada.
- **Una custom property HEREDA**: escribirla en un nodo con 2.537 descendientes marca a los 2.537
  para recálculo de estilo. Medido: 85,4 ms por escritura contra 0,17 en un nodo sin hijos, o 0,248
  con `@property{inherits:false}`.
- **Un `background-color` animado no es componible**: obliga a repintar la capa en cada cuadro **y
  daña la pantalla entera**, o sea que rehace todos los `backdrop-filter` de la página. Va como la
  opacidad de un pseudo.
- **Lo que cuesta un `backdrop-filter` es la PASADA, no el radio.** Bajar de 34 px a 4 midió peor.
  La única palanca es que la pasada no exista: apagarlo detrás de algo opaco, u **hornear** el
  desenfoque una vez cuando el fondo no cambia.
- **Y el horneado tiene que llevar los VELOS adentro**: un `backdrop-filter` desenfoca todo lo que
  hay debajo, y el horneado sale de la foto cruda.
- **Leer `clientWidth` obliga a recalcular el layout**: dos lecturas por cuadro son 120 vaciados de
  layout por segundo mezclados con escrituras. Es *layout thrashing* y **no aparece en ningún perfil
  de WebGL**.
- **`content-visibility:auto` se probó y midió PEOR** (el alto crece 9 % y el scroll sube de 0,067 a
  0,103 ms/cuadro).
- **Un cambio que no mide mejor NO SE DEJA PUESTO por parecer razonable.** Se sacaron: un bloom
  selectivo, una cascada de filtros, un domo de cielo, el repintado selectivo, la coalescencia con
  rAF, una máscara de shader para el agua, `will-change` en una hoja.

### 6.12 Los tutoriales y el arranque

- **Un tutorial es una lista de cosas que HACER, no de carteles.** Cada paso **espera a que se haga
  la cosa**: así no se puede saltear, y lo que se saltea es exactamente lo que después no se
  entiende.
- **El orden de los pasos sale de la aritmética**, no del gusto: si una maniobra necesita velocidad,
  el paso que la enseña va después del que la da.
- **Qué se enciende sale de la CLAVE del paso, no de su índice.** Atado al índice, reordenar deja el
  indicador pulsando en la mitad equivocada de la pantalla sin que nada falle.
- **Un tutorial obligatorio visto cinco veces deja de ser un tutorial y pasa a ser un peaje.** Se ve
  entero la primera vez y después queda en su botón. (Salvo pedido explícito en contra.)
- **La pantalla de idioma va ANTES del menú**: elegir idioma dentro de un menú escrito en un idioma
  que no entendés no sirve.
- **El mundo del tutorial se escribe A MANO** aunque el resto sea procedural: un tutorial que dice
  «el bloque de allá» no puede tener una geometría que cambia cada vez. Pero **se audita con el
  mismo validador** que los demás niveles.

### 6.13 Las cinemáticas

- **Es una FUNCIÓN DEL TIEMPO, no una máquina de estados.** `pon(t)` recibe el segundo y deja la
  cámara, el cuerpo y todo lo demás. Así se puede fotografiar el segundo 26,4 sin esperar 26
  segundos, que es lo único que hace posible encontrar los defectos.
- **Y hay que poder CONGELARLA**: si el bucle sigue corriendo entre la sonda y la captura, la foto
  es de otro instante. (Cuatro veces.)
- **Congelar tiene que congelar TODO**, no sólo la física: la cámara, las partículas, el fogonazo y
  el resorte viven en el bucle de dibujo.
- **Se puede saltear, con medio segundo de gracia**: el mismo toque que la abre llega a veces como
  un segundo evento y se la comería entera.
- **Los ojos que se abren son DOS BANDAS, no un velo.** Un fundido desde negro se lee a transición
  de video; dos bandas que se separan se leen a alguien abriendo los ojos.
- **La voz manda el tiempo de cada plano**, no un número fijo: en tres idiomas la misma frase dura
  distinto. Con plazo de respaldo, o si el audio no arranca la escena se clava para siempre.
- **La interfaz se apaga.** Un joystick dibujado sobre una escena que no responde no se lee a
  cinemática: se lee a juego trabado.
- **El plano de una criatura no es el plano de una cabeza:** `dist` coloca el **origen** del grupo, y
  la cara puede estar a metro y medio de ahí.

---

## 7. Las reglas fijas del usuario

- **Nunca** usar cuadros de `AskUserQuestion`: *«se buguea, uso celular»*. Preguntar en texto plano.
- Desarrollar, commitear y pushear **sólo** a la rama de trabajo indicada.
- **No** abrir pull requests salvo pedido explícito.
- **No** poner el identificador del modelo en commits, PRs, comentarios de código ni nada que se
  pushee.
- **Verificar midiendo antes de afirmar que algo funciona.** Textual: *«apenas hacés algo nuevo
  rompés otra cosa»*.
- **Siempre adjuntar el HTML** armado al cerrar cada vuelta, sin que lo pida. Si hace falta un
  enlace, va por **githack**: `raw.githubusercontent.com` y jsDelivr sirven el HTML como
  `text/plain` con `nosniff`, así que el navegador muestra el código en vez de correr el juego.
- **Ahorrar tokens.** Nada de barridos exploratorios, ni de esperas con monitores, ni de narración
  larga.
- Escribir en **castellano rioplatense**.

---

## 8. El contenedor se revierte solo

Y no avisa. En una sola sesión pasó dos veces: el `HEAD` saltó noventa commits hacia atrás y una
carpeta entera dejó de existir. Consecuencias prácticas:

- **Pushear seguido.** Lo pusheado sobrevive; lo demás no.
- **Antes de commitear, MIRAR el diff.** Después de una reversión, `git add -A` agarra un árbol
  viejo y commitearlo **revierte** trabajo bueno.
- Si algo parece faltar: **comprobar contra `origin` con `git fetch` ANTES de sacar conclusiones**.
  Una vez concluí que se había perdido trabajo mirando el HEAD equivocado, y `origin` lo tenía todo.
- Antes de un `reset --hard`: `git branch -r --contains <commit>` para cada commit local. Si están
  en `origin`, no se pierde nada.

---

## 9. Y una lección de método, que es la que más vale

**`io.open(p,'w').write(expr)` evalúa `io.open` ANTES que `expr`**: si `expr` falla, el archivo ya
quedó **en cero bytes**. Un `NameError` en el argumento borró un juego entero. Se calcula el texto
nuevo completo, se comprueba, y **recién entonces** se abre para escribir.

**Y el guardia de un parche idempotente se escribe `if b in s`, no `if b in s and a not in s`.**
Cuando el texto nuevo contiene al viejo —que es el caso normal, porque casi siempre se agrega
alrededor de lo que ya estaba— el segundo guardia no salta nunca y el parche se aplica de nuevo.
Eso ya dejó una línea escrita cuatro veces y una constante seis.

**Cada parche lleva su `assert` de ancla.** Un reemplazo que no encuentra su sitio tiene que fallar
en voz alta, no dejar el archivo a medias. Ya salvó dos vueltas.

**Un corte grande de un archivo ya parchado es una apuesta; cuatro parches chicos sobre literales
únicos no lo son.** Cortar «de la función hasta su llamada» se lleva puesto lo que alguien metió en
el medio, y falla doscientas líneas más allá.

**Y lo más caro de todo:** cuando subir un parámetro cuatro veces no mueve el número, el problema
**no es ese parámetro**. Tres horas iluminando un pasillo que no tenía paredes, cuando un material
de diagnóstico lo contestaba en un cuadro.

---

## 10. La bitácora

**`CLAUDE.md` es el documento más valioso del repo.** Tiene la bitácora completa, vuelta por vuelta,
con **lo que salió mal y por qué** — no con lo que funcionó. Hay que escribirlo después de cada
vuelta, y hay que escribir los errores: los aciertos se vuelven a encontrar solos, los errores no.

Cada entrada lleva:
- el pedido **textual** del usuario,
- qué se cambió y **por qué esa decisión y no la otra**,
- los **números medidos**, con el antes y el después,
- **lo que se probó y se descartó**, con el número que lo descartó,
- **lo que quedó sin resolver**, dicho con todas las letras.
