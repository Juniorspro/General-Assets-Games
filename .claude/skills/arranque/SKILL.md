---
name: arranque
description: Cómo se trabaja en este repo de juegos HTML autocontenidos — el arranque de una sesión nueva, los MCP, el banco de pruebas, las tuberías de assets de Rezona Lab y Higgsfield, y las diez reglas que ya costaron una vuelta cada una. Usar al empezar una sesión en General-Assets-Games, al retomar cualquiera de los juegos de juegos-pc/, al generar un asset 3D, una textura, una voz o una animación, y cuando algo del contenedor, del banco de pruebas o del login de Rezona no funcione.
---

# Cómo se trabaja acá

Este repo hace **juegos HTML autocontenidos** para el portal **Rezona**. Un juego = **un archivo**
en `juegos-pc/`, sin dependencias fuera del CDN de three.js. El usuario prueba **en el celular, en
vertical**, y escribe en castellano rioplatense.

## Lo primero, siempre

```bash
bash herramientas/arranque/preparar.sh
```

Comprueba dependencias, el estado del repo contra el remoto, los MCP, el login de Rezona y arma el
banco de pruebas. Es idempotente.

**EL CONTENEDOR SE REVIERTE SOLO, y no avisa.** En una sola sesión pasó dos veces: el `HEAD` saltó
noventa commits hacia atrás y `herramientas/barrio/` dejó de existir. Consecuencias prácticas:

- **Pushear seguido.** Lo pusheado sobrevive; lo demás no.
- **Antes de commitear, MIRAR el diff.** Después de una reversión, `git add -A` agarra un árbol
  viejo y commitearlo *revierte* trabajo bueno. Pasó: el commit se hizo sobre una base de noventa
  commits atrás y el push lo rechazó — eso fue lo único que lo salvó.
- Si el push sale rechazado: `git fetch` y comparar `git log HEAD..@{u}` contra `git log @{u}..HEAD`
  **antes** de rebasear. Si lo de allá ya contiene lo de acá, se descarta lo local.

## Las reglas fijas del usuario

- **Nunca** usar cuadros de `AskUserQuestion`: *«se buguea, uso celular»*. Preguntar en texto plano.
- Desarrollar, commitear y pushear **sólo** a la rama de trabajo indicada.
- **No** abrir pull requests salvo pedido explícito.
- **No** poner el identificador del modelo en commits, PRs, comentarios de código ni nada que se
  pushee.
- **Verificar midiendo antes de afirmar que algo funciona.** Historial textual: *«apenas hacés algo
  nuevo rompés otra cosa»*. Esto no es una formalidad: es el criterio con el que se juzga el trabajo.
- Cuando pide *«dame el HTML»*, quiere el archivo adjunto.
- **«Pope»** = seguir con la lista de pendientes de `CLAUDE.md`.

## Cómo está hecho un juego

Los juegos grandes **viven partidos** en `herramientas/<juego>/partes/` y se arman con
`python3 herramientas/<juego>/armar.py`. **Las partes son la fuente; el HTML es la salida.**

Un HTML de dos megas con base64 adentro no se edita con parches de texto: ya costó un archivo en
cero bytes. Y todo termina siendo **UN módulo ES**, así que:

> **Un `let`/`const` leído antes de su línea no devuelve `undefined`: TIRA, y se lleva el módulo
> entero.** Ya pasó ocho veces en este repo. Las declaraciones van **antes del primer uso**, no
> «donde corresponde temáticamente». El orden de `ORDEN` en `armar.py` es el orden en que hacen
> falta, no el alfabético.

Comprobar la sintaxis después de armar:

```bash
node -e "const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
const s=f.readFileSync('juegos-pc/X.html','utf8');
const m=s.match(/<script type=\"module\">([\s\S]*)<\/script>/);
try{a.parse(m[1],{ecmaVersion:'latest',sourceType:'module'});console.log('ok')}catch(e){console.log('ERROR',e.message)}"
```

## El banco de pruebas

```bash
bash herramientas/banco/armar.sh                      # lo rearma en /tmp/ui
python3 herramientas/<juego>/prep_banco.py juegos-pc/X.html /tmp/ui/x.html
cd /tmp/ui && fuser -k 8098/tcp; PAGINA=x.html MOVIL=1 bash run2.sh PLAN.json out/x.log 412 892
```

`prep_banco.py` reescribe los CDN a `node_modules` local: **Chromium en el contenedor no usa el
proxy de salida** (curl sí), así que un import a jsdelivr falla.

Un plan es una lista de `{"js": …}`, `{"click": …}`, `{"wait": ms}`, `{"n": "nombre"}` (captura).
Las capturas salen a `/tmp/ui/out/` en **412×892 vertical y giradas**: hay que enderezarlas con
`Image.rotate(90, expand=True)`.

**Cada juego expone sus sondas en `window.__X`** y ahí está la mitad del valor del repo: `est()`
para el costo del cuadro, `anda(n)` para caminar de verdad, `brillo()` que lee el búfer con
`readPixels`, `ejeH()` que dice para dónde mueve un hueso a otro. **Una afirmación sin número no
vale.** Y ojo:

> **La sonda puede estar mal antes que el juego.** Señal: números demasiado redondos. Midiendo el
> temblor de una cámara salieron 10,00 · 14,14 · 17,32 mm, que son 10·√1, √2 y √3 — era el
> `toFixed(2)` de la sonda, no la cámara.

## Los assets

### Rezona Lab (Tripo + imagen)

MCP declarado en `.mcp.json`. **Los MCP se cargan al arrancar la sesión**, así que si no está
cargado se le habla por stdio con el cliente chiquito del repo:

```bash
python3 herramientas/rezona/rz.py tools
python3 herramientas/rezona/rz.py call submit_model3d_generation '{"project_id":"…","output_path":"assets/x.glb","prompt":"…"}'
```

- `submit_image_generation` · `submit_model3d_generation` · `submit_rig3d_generation` (rig +
  animaciones sobre **un modelo propio**, no sobre uno que ya esté en el juego) · `submit_audio_generation`
  · `check_generation_tasks` · `fetch_generated_asset`.
- **El estado que NO es secreto está en `herramientas/rezona/estado.json`**: en qué proyecto va
  cada cosa (`PwVerjWD` para BARRIO), qué assets ya existen con su `output_path`, y **con qué
  parámetros salieron bien**. Leerlo antes de generar nada. Se refresca con
  `python3 herramientas/rezona/estado.py`.
- **La credencial vive en `~/.rezona/credentials.json`**, la escribe `npx rezona@latest login` con
  un código de un solo uso. `.rezona/` está en `.gitignore`: **el cliente puede vivir en el repo, la
  llave no.** Este repo es público.
- `fetch_generated_asset` no escribe en una carpeta sin marca `.rezona/`: hacer `npx rezona@latest
  init` en una carpeta **fuera del repo** (p. ej. `/tmp/rez_x`).
- **Las respuestas vuelven desordenadas.** Emparejar por posición cruza los resultados en silencio
  — hay que ordenar por el `id` del JSON-RPC. Ya pasó: el asfalto llegó con el `output_path` de la
  vereda.
- **`publish_to_rezona_app` es IRREVERSIBLE.** No llamarlo nunca sin pedido explícito.
- **TODO SE GENERA EN UN SOLO PROYECTO DESCARTABLE** (`YlgCbidN`, «tmp — descartable, borrar»), no en
  uno por juego. Pedido del usuario: nada queda a la vista en la app de Rezona Lab como si fuera un
  trabajo. Lo que vale es la copia del repo; el proyecto es un andamio. **Y el borrado no se puede
  hacer desde acá**: `DELETE` y `PATCH` de `/api/projects/{id}` devuelven **403 PAT_ROUTE_FORBIDDEN**
  con credencial de API, así que lo único que está de nuestro lado es que haya **uno** y que su
  nombre diga que se puede borrar.

### Higgsfield

MCP a nivel de cuenta: `generate_image`, `generate_video`, `generate_audio` (TTS y efectos),
`generate_3d`. Sirve para lo mismo; conviene generar con los dos y **comparar dentro del juego**.

### Y las diez reglas de horneado que ya costaron una vuelta cada una

1. **Pedir `face_limit` al generar.** Tripo devuelve **un millón** de triángulos; bajar eso a dos
   mil es tirar el 99,8 % y el simplificador se come los tiradores de los cajones — los muebles
   salen «corruptos». Con `extra:{face_limit:6000}` entran con 5.000 y se bajan a 3.000.
2. **El objetivo es un número de triángulos, no un ratio.** `-si 0.06` parecía trabado y hacía
   exactamente el 6 % de lo que se le daba.
3. **`gltfpack` va con `-noq`**: la cuantización entra como `KHR_mesh_quantization` en
   `extensionsRequired` y un lector que no la soporte no muestra **nada**.
4. **La textura se hornea en los vértices** antes de decimar: con UV puestas el simplificador tiene
   que respetar las costuras y se planta. Y al muestrear se convierte **de sRGB a lineal**, porque
   glTF trata `COLOR_0` como lineal.
5. **Leer `COLOR_0` como venga, no como uno supone.** gltfpack lo devuelve en VEC4 de bytes
   normalizados aunque se le pase `-noq`; leído como tres floats sin normalizar, los muebles salen
   **blanco puro con motas de colores**. Ni falla ni avisa.
6. **Contar los metros que cubre cada foto** —hiladas de ladrillo, filas de teja, tablas— y usar ese
   número para la repetición. Sin eso salen hiladas de 22 cm y la casa se lee a casa de muñecas.
   Y si hay un lienzo de respaldo, la repetición se **escala** por `metros_lienzo / metros_foto`, no
   se copia.
7. **El tinte se recalcula cuando cambia la foto.** three.js multiplica `map × vertexColor ×
   material.color`: el color del material es un tinte sobre la imagen. Se divide **en lineal** el
   promedio viejo por el nuevo.
8. **El mapa emisivo se DERIVA de la propia foto** (lo que pasa un percentil de luminancia), no se
   pide como segunda imagen: si no, hay ventanas que brillan sin estar dibujadas.
9. **Las costuras se resuelven con `MirroredRepeatWrapping`**, no cosiéndolas a mano: la copia de al
   lado va dada vuelta, así que los dos bordes que se tocan son el mismo borde.
10. **Los ejes de un hueso no se adivinan, se giran y se mira dónde quedó la punta.** Los ejes
    locales son los que dejó el bind y no significan nada. En BARRIO el muslo se movía **más de
    costado que hacia adelante** porque estaba en X y la flexión era Y — 7,0 cm contra 57,3.

## Las reglas de diseño que se repiten

- **Paso fijo con interpolación.** Un teléfono a 30 y una notebook a 144 tienen que jugar el mismo
  juego, si no la velocidad y el alcance salen distintos y eso no es rendimiento, es **otro juego**.
- **Un nivel generado y no jugado es un nivel roto que todavía no se sabe.** El generador tira, un
  validador comprueba, y un auto-jugador lo termina de punta a punta. Costó siete niveles imposibles
  en Maicol y una nube 37 de 42 en BARRIO.
- **El validador y el juego usan la MISMA cuenta.** Con dos, el validador aprueba un juego que no
  existe.
- **Los assets generados NO reemplazan nada hasta que llegan.** Se arranca con lo dibujado por
  código y la foto o la malla lo pisa cuando decodifica. Un base64 roto cuesta una pieza, no una
  pantalla vacía.
- **La cadencia es un dato del cuerpo:** `pasos por segundo = velocidad ÷ paso`. Un humano camina a
  1,9-2,4. Y el paso lo pone el ciclo de animación, no una constante al lado — si no, los pies
  patinan.
- **Lo que se lee a «tiembla» es la FRECUENCIA, no la amplitud.** Por encima de un hertz, cualquier
  amplitud tiembla aunque mida un milímetro.

## Las skills que ya están en el repo

91 en `.claude/skills/`. Las cinco de creación y animación:

| skill | cuándo |
|---|---|
| `game-asset-pipeline` | generar y optimizar modelos y texturas; algo se ve oscuro, gigante o roto |
| `game-character-animation` | esqueletos, mezcla de clips, retarget entre rigs, pies que patinan |
| `game-physics-rapier` | colisión, gravedad, salto, vehículos, ragdolls; tiembla o atraviesa |
| `open-world-streaming` | mundos grandes, chunks, LOD, procedural con semilla, persistencia |
| `realtime-rendering-quality` | se ve plano o de prototipo; tone mapping, HDRI, sombras, post |

Y ~85 de three.js específicas (`threejs-*`), de geometría a WebGPU. `.claude/skills/README.md`
dice de dónde salió cada una.

## Los juegos que ya existen

`juegos-pc/`: **Campo_de_Tiro.html** (Z Force, FPS — *no se toca ni se borra*), **Maicol** (2D),
**Pompom** (2D de tranquilidad, 8×20 niveles), **Recreo** (manos con MediaPipe), **Eco**
(ecolocación), **Barrio** (barrio de noche + cuarto + parkour en nubes), **Lemi**, **Vecindario**,
**Visor3D**. `CLAUDE.md` tiene la bitácora completa, vuelta por vuelta, con lo que salió mal y por
qué — **es el documento más valioso del repo y hay que escribirlo después de cada vuelta.**
