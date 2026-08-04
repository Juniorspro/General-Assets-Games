# ESTADO — pack g3 (5 juegos GOTY apaisados)

## Qué es
5 juegos 3D apaisados (giro 90° en celular vertical), pantalla completa al JUGAR,
móvil + PC. Motor compartido `shell.js` + `char.js` (personaje con arma en el
hueso RightHand, patrón del sux). Build: `node build.js [--test] [slug]` desde
este dir. Sonda: `node _g3.js <slug>` (necesita server 8951 sobre el repo).

## Juegos
| slug | qué es | estado |
|---|---|---|
| horda | CAMPAÑA distrito cero: 5 misiones, NPCs con diálogo, minimapa, jefe | 20/20 + E2E campaña |
| nudillos | brawler 3ª persona (bate, combos, oleadas) | 20/20 |
| furia | derby de destrucción (autos fp/cdn texturizados) | 20/20 |
| vertigo | contrarreloj urbano por puertas | 20/20 |
| alas | vuelo entre anillos sobre nubes | 20/20 |

## Assets generados (assets/g3/)
- Cielos 360: sky-horda.jpg (atardecer bélico), sky-furia.jpg (desierto), sky-alas.jpg (nubes doradas)
- Música (sonilo, 40s loop): mus-{horda,nudillos,furia,vertigo,alas}.m4a
  (AAC: no decodifica en el chromium del sandbox — en celu/PC real sí; hay respaldo sintetizado)
- Portadas 16:9 con título: art-{horda,nudillos,furia,vertigo,alas}.jpg
- Textura: tex-asfalto.jpg (tileable)

## Reutilizado del repo
char.glb + anim-{idle,run,punch1,punch2,bat} y armas w-smg/w-bat (assets/hyper),
enemigos m-arena-{run,atk,jefe} y nave m-orbita-nave (assets/arcade),
vehículos texturizados (assets/fp/cdn/*.glb), PBR fp/tex/*.webp.

## Publicación (dos pasos SIEMPRE)
1. commit de assets/fuentes → hash corto → `scratchpad/g3/HASH`
2. `node build.js` (todos) → commit de assets/g3/*.html → push
Los HTML cargan three.js r0.170 desde cdn.jsdelivr.net/npm (no _vthree, que no está commiteado).

## Props (densificado)
`props.js` (inyectado en todos): `PROPS.spawn(THREE,scene,defs,opts)` carga GLB del
repo y los CLONA en masa para llenar los mundos. Modelos que RENDERIZAN bien:
`hyper/p-tree`, `hyper/p-crate`, `arcade/m-agujero-arbol`, `arcade/m-arena-pua`,
`reliquia/obs-totem`, `reliquia/obs-log`. OJO: `reliquia/tree1-3.glb` y `bush.glb`
NO aparecieron en escena (por eso VÉRTIGO/ALAS usan p-tree/m-agujero-arbol).
HORDA/NUDILLOS/FURIA/VÉRTIGO llenos de escombros/árboles; ALAS con islas flotantes
+ 72 nubes. Verificado por captura (`*-props.png`) y sonda 20/20 en los 5.

## LINK (causa de "no anda"): CONTENT-TYPE
jsDelivr sirve el HTML como `text/plain` → el celular mostraba el código, no el juego.
Solución: entregar SIEMPRE por **raw.githack.com** (sirve `text/html`). Los assets
internos (three, glb, jpg, m4a) sí pueden ir por jsdelivr sin problema.
Portal: `assets/g3/index.html` con links RELATIVOS (quedan en githack, hash-agnóstico).

## MAREA (juego nuevo GOTY) + HUB unificado + ALAS arreglado
- **MAREA** (`g_marea.js`): moto de agua contrarreloj cruzando puertas de boyas
  sobre océano. Agua = plano subdividido con olas por vértice (`waveH`) + reflejo
  del cielo por envMap. Moto de agua 3D GENERADA (Higgsfield image_to_3d
  texturizado) en `assets/g3/mdl-marea.glb`; ojo: viene de perfil → `m.rotation.y=PI/2`.
  Respaldo procedural si el GLB falla. Assets generados: `sky-marea.jpg` (atardecer
  oceánico), `tex-agua.jpg`, `art-marea.jpg` (portada AAA), `mus-marea.m4a` (sonilo).
- **ALAS arreglado**: nubes ahora son sprites suaves (miran a cámara, sin efecto
  vidrio); se quitaron los árboles flotantes (quedaban feos).
- **HUB**: `assets/mundos/index.html` es la página única con TODOS los juegos:
  sección ARCADE (MAREA, ALAS, RELIQUIA, NITRO GP) + los 5 MUNDOS. Links RELATIVOS.
  `assets/g3/index.html` redirige al hub. HORDA/NUDILLOS/FURIA/VÉRTIGO quedaron
  fuera del hub (rechazados por el usuario: "mugre") pero siguen deployados.
- Higgsfield: `generate_3d image_to_3d` DEFAULTEA `should_texture:false` → pasar
  `should_texture:true` para que el GLB traiga textura. `sonilo_music` sí acepta.

## MAREA v4 (rivales/skins/circuitos) + CRIPTA (roguelike FP)
- **MAREA**: piloto 3D sentado sobre la moto con 4 SKINS elegibles (menú), 4
  RIVALES NPC que corren el circuito con puesto P1..P5, 3 CIRCUITOS
  (laguna/atolón/bahía) y boyas blancas que marcan el canal. Agua de pileta:
  arena + cáusticas aditivas animadas + ripple por bumpMap. Moto flota con
  resorte y cabecea/rola según la pendiente de la olita.
  OJO orientación: `craft.rotateY(yaw)` (sin +π) ⇒ la plantilla lleva `m.rotation.y = +PI/2`.
- **CRIPTA** (`g_cripta.js`): roguelike 1ª persona. 10 salas, matás los golems y
  se abre la puerta al norte; jefe cada 5 salas; mejoras al pasar (vida/daño/vel).
  Espada y golem 3D generados (Higgsfield). Antorchas PointLight (2 castean sombra).
  `ren.toneMappingExposure = 1.75` — sin eso la cripta se ve NEGRA.
- **TRAMPA del menú**: el panel `#mOpts` tapaba el botón JUGAR ⇒ contenedor con
  `pointer-events:none` y los chips con `pointer-events:auto`. Si agregás opciones,
  mantené eso o la sonda falla en "el botón JUGAR recibe el toque".
- Perf: el chromium del sandbox (swiftshader) sufre con muchos casters ⇒ sombra
  512, rivales no castean, islas solo reciben. Las sondas tardan ~2-3 min.

## Pendiente / notas
- La sonda no corre el m4a (AAC): verificar música solo en dispositivo real.
- dbg de horda tiene tp(x,z) y def(t) para tests rápidos de campaña.
- Cielos son 1376x768 reescalados a 2048x1024 (banana no da 2:1 exacto).
