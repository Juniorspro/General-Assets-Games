# game-asset-mcp — guía de instalación (equipo local)

`game-asset-mcp` (MubarakHAlketbi) genera **assets 2D y 3D desde texto** usando
Hugging Face Spaces. Expone dos herramientas MCP:

- `generate_2d_asset` — sprite/imagen 2D desde un prompt.
- `generate_3d_asset` — modelo 3D (OBJ/GLB) desde un prompt.

> **Importante:** este MCP **no corre en las sesiones en la nube** de Claude Code,
> porque depende del módulo nativo `canvas`, que aquí no compila (falta el *dev* de
> pango y `apt` está bloqueado). Está pensado para tu **equipo local**. Por eso lo
> dejé en `.mcp.json` pero **fuera del auto-arranque** (`enabledMcpjsonServers`): en
> la nube no se lanza; en tu máquina lo apruebas una vez y queda con sus herramientas
> ya permitidas.

## 1. Requisitos en tu máquina
- **Node.js 18+** y **git**.
- Librerías para compilar `canvas`:
  - **Ubuntu/Debian:** `sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config`
  - **macOS (Homebrew):** `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
  - **Windows:** instala las *build tools* de Node (`npm i -g windows-build-tools`) o usa WSL.

## 2. Token de Hugging Face (HF_TOKEN)
1. Entra a https://huggingface.co/settings/tokens
2. Crea un token tipo **Read** (suficiente para llamar Spaces).
3. Guárdalo; lo pondrás como variable de entorno (paso 4). Puedes revocarlo cuando quieras.

## 3. Duplicar un Space 3D (MODEL_SPACE)
Abre uno de estos y pulsa **"Duplicate this Space"** (queda en tu cuenta):
- **InstantMesh** (recomendado para GLB): https://huggingface.co/spaces/mubarak-alketbi/InstantMesh
- **Hunyuan3D-2:** https://huggingface.co/spaces/mubarak-alketbi/Hunyuan3D-2
- **Hunyuan3D-2mini-Turbo** (más rápido): https://huggingface.co/spaces/mubarak-alketbi/Hunyuan3D-2mini-Turbo

Tu Space quedará como `TU-USUARIO/InstantMesh`. Ese texto es tu `MODEL_SPACE`.

## 4. Variables de entorno
Expórtalas **antes** de abrir Claude Code (así el MCP las hereda):

```bash
# Linux / macOS
export HF_TOKEN="hf_xxxxxxxxxxxxxxxxx"
export MODEL_SPACE="TU-USUARIO/InstantMesh"
```
```powershell
# Windows PowerShell
$env:HF_TOKEN="hf_xxxxxxxxxxxxxxxxx"
$env:MODEL_SPACE="TU-USUARIO/InstantMesh"
```

> Alternativa: crear un archivo `.env` dentro del repo clonado (paso 5) con
> `HF_TOKEN=...` y `MODEL_SPACE=...`.

## 5. Cómo se ejecuta
Ya está declarado en `.mcp.json` con un wrapper que, la primera vez, **clona e
instala** el MCP en `~/.mcp-cache/game-asset-mcp` y lo lanza. Solo tienes que abrir
Claude Code en este repo (con las variables del paso 4 exportadas) y **aprobar el
servidor una vez**.

Manual, si prefieres:
```bash
git clone https://github.com/MubarakHAlketbi/game-asset-mcp ~/.mcp-cache/game-asset-mcp
cd ~/.mcp-cache/game-asset-mcp && npm install
HF_TOKEN=... MODEL_SPACE=TU-USUARIO/InstantMesh node src/index.js
```

## 6. Generar el dinosaurio
Con el MCP activo, pídeme (o llama) `generate_3d_asset` con un prompt, por ejemplo:

> `generate_3d_asset` — prompt: **"low-poly cartoon dinosaur, friendly green T-rex,
> game asset, clean topology, single object, neutral pose"**

Devuelve un **GLB/OBJ**. Guarda el `.glb` como `visor-3d/dino.glb`.

## 7. Verlo
Abre `visor-3d/glb-viewer.html` en tu navegador y arrastra el `.glb` (o déjalo como
`visor-3d/dino.glb` y se carga solo). Puedes rotar, hacer zoom y ver el modelo con luz.
