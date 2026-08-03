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

## Pendiente / notas
- La sonda no corre el m4a (AAC): verificar música solo en dispositivo real.
- dbg de horda tiene tp(x,z) y def(t) para tests rápidos de campaña.
- Cielos son 1376x768 reescalados a 2048x1024 (banana no da 2:1 exacto).
