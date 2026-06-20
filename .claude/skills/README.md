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

**Total: 71 skills.**

## Formato

Todos los skills siguen el formato estándar de Claude Code: una carpeta por skill
con un `SKILL.md` que contiene frontmatter YAML (`name`, `description`). Los packs
`majid` y `natea` incluyen recursos auxiliares (`references/`, `agents/`, `scripts/`).

Los skills del pack ECS originalmente venían como archivos `.md` planos referenciados
por un manifiesto de plugin; se convirtieron a carpetas `SKILL.md` individuales sin
alterar su contenido.
