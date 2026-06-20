# Three.js Skills

Skills de Three.js / juegos 3D instaladas en este repositorio (`.claude/skills/`).
Cada subcarpeta es un skill independiente con su propio `SKILL.md`.

## Procedencia

| Pack | Fuente | Skills | Notas |
|------|--------|--------|-------|
| ECS / TS / R3F | [Nice-Wolf-Studio/claude-skills-threejs-ecs-ts](https://github.com/Nice-Wolf-Studio/claude-skills-threejs-ecs-ts) | 51 | Three.js, ECS, React Three Fiber, TypeScript, game-systems, mobile. El skill `threejs-lighting` original se renombró a `threejs-lighting-systems` para evitar colisión con el pack de cloudai-x. |
| Three.js core | [cloudai-x/threejs-skills](https://github.com/cloudai-x/threejs-skills) | 10 | Referencias de API verificadas contra Three.js r160+. |
| Game builder | [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | 9 | Orquestación de juegos completos: gameplay, AAA graphics, UI, QA, generadores 3D/imagen/audio. |
| Game (single) | [natea/fitfinder](https://github.com/natea/fitfinder) (`threejs-game`) | 1 | Player controllers, input, colisiones, GLTF, física básica. |
| R3F anim/shaders/postfx | [EnzeD/r3f-skills](https://github.com/EnzeD/r3f-skills) | 3 | `r3f-animation`, `r3f-shaders`, `r3f-postprocessing`: useFrame, useAnimations, spring, shaderMaterial, @react-three/postprocessing. |
| Three.js especialistas | [taoquo/three-skills](https://github.com/taoquo/three-skills) | 4 | `material-lab` (materiales/PBR/SSS), `shader-port` (portar Shadertoy/GLSL/WGSL a Three.js), `replicator` (recrear efectos de referencia), `perf-doctor` (diagnóstico de FPS/draw calls). Incluyen `references/`, `fixtures/`, `scripts/`. |
| WebGPU + TSL | [dgreenheck/webgpu-claude-skill](https://github.com/dgreenheck/webgpu-claude-skill) | 1 | `webgpu-threejs-tsl`: WebGPURenderer, TSL/node materials, compute shaders, post-proceso GPU, WGSL. Incluye `examples/`, `templates/`, `docs/`. |
| Frontend creativo | [SkylarKitchen/claude-skills](https://github.com/SkylarKitchen/claude-skills) | 1 | `creative-frontend`: Next.js/React 19/Tailwind v4/Framer Motion/R3F, estándares 3D y plantillas. |

**Total: 82 skills.**

> Nota: [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) (`threejs-animation`, `threejs-shaders`, `threejs-postprocessing`) ya estaban instaladas desde el pack *cloudai-x* y se re-sincronizaron (idénticas). [wilwaldon/Claude-Code-Frontend-Design-Toolkit](https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit) es un catálogo curado (solo README), no un skill instalable.

## Formato

Todos los skills siguen el formato estándar de Claude Code: una carpeta por skill
con un `SKILL.md` que contiene frontmatter YAML (`name`, `description`). Los packs
`majid` y `natea` incluyen recursos auxiliares (`references/`, `agents/`, `scripts/`).

Los skills del pack ECS originalmente venían como archivos `.md` planos referenciados
por un manifiesto de plugin; se convirtieron a carpetas `SKILL.md` individuales sin
alterar su contenido.
