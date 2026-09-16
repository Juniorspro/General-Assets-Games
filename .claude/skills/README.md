# Skills de Three.js instaladas en este repo

85 skills copiadas de diez colecciones publicas (solo el arbol `skills/`, sin docs ni demos ni
binarios). Se saltearon las cinco que no tienen nada que ver con un juego 3D (payload, shadcn-base,
nuqs, react-19, base-ui) y los duplicados: `mintdotgg` es un fork de `majidmanzarpour`, asi que de las
ocho repetidas quedo la original y solo se agregaron las cuatro propias de mint.

| origen | skills |
|---|---|
| linegel/threejs-complete-set-of-skill | 27 |
| OpenAEC-Foundation/Three.js-Claude-Skill-Package | 24 |
| CloudAI-X/threejs-skills | 10 |
| majidmanzarpour/threejs-game-skills | 9 |
| alton47/threejs-skills | 7 |
| mintdotgg/mint-threejs-skills | 4 (las que no estan en majidmanzarpour) |
| noklip-io/agent-skills | 3 (three-js, gsap, theatre-js) |
| dgreenheck/webgpu-claude-skill | 1 |

El MCP `threejs-devtools-mcp` (DmitriyGolub) esta declarado en `.mcp.json` de la raiz. OJO: ese MCP
necesita un navegador con el bridge inyectado en `localhost:9222` y la pestana ABIERTA, o sea un
servidor de desarrollo corriendo; en una sesion headless como esta no se conecta. Los MCP se cargan al
ARRANCAR la sesion, asi que queda disponible para la proxima, no para la que lo instalo.

Cada skill conserva su licencia y su README original dentro de su carpeta.
