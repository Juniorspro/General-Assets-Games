# Renderer Routing

Choose the lightest route that still proves the look, but do not confuse backend choice with material-model choice.

## Backend Choice

| Need | Route | Why |
| --- | --- | --- |
| Highest-fidelity desktop prototype | `WebGPU` | better headroom for complex node graphs, premium materials, and imported MaterialX |
| Broad browser reach | `WebGL2` | simpler compatibility story and safer public demo target |
| Stock PBR with texture maps | `WebGL2` or `WebGPU` | backend rarely changes the actual route |
| TSL-heavy or node-heavy study | `WebGPU` preferred | smoother access to the current node-first path |

## Authoring Path Choice

| Situation | Preferred path |
| --- | --- |
| Standard dielectric or metal look | stock `MeshStandardMaterial` |
| Clearcoat, sheen, transmission, iridescence, anisotropy, specular, volume-adjacent look | `MeshPhysicalMaterial` |
| Need custom logic while preserving the built-in lighting model | NodeMaterial or `TSL` |
| Material authored in DCC and delivered as asset | `glTF` or `MaterialX` import |
| Existing material model is mostly correct but needs targeted override | interop wrapper or light shader extension |
| Genuinely custom BSDF or experimental look | raw shader fallback |

## Routing Rule

Do not choose `WebGPU` just because it exists. Choose it when it changes the outcome, removes real authoring pain, or unlocks a route that the study actually needs.
