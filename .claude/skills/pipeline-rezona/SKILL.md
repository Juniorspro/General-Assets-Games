---
name: pipeline-rezona
description: Guía de pipeline de Rezona (Claude Code + Codex CLI) para trabajar barato, estable y reproducible en este repo de juegos. Usar al ARRANCAR cualquier sesión/tarea de juegos (scaffold, assets, build, debug, plan, auditoría) para elegir modelo+esfuerzo correctos, decidir si abrir sesión nueva, y hacer handoff por archivos en vez de historial de chat. También cuando el usuario mencione ahorrar tokens/créditos, "1 task = 1 session", vn-init/vn-plan/vn-build/vn-audit, o pregunte qué modelo usar.
---

# Pipeline Rezona — barato · estable · reproducible

No "el mejor modelo para todo": **el modelo y esfuerzo justos para cada tarea**.
La lógica vive en la cadena de skills para que el modelo no tenga que sobre-razonar.

## Los 3 principios

1. **1 juego = 1 proyecto.** Cada juego vive en su propia carpeta con sus archivos
   de config/estado. Nunca mezclar varios juegos en un mismo working dir de trabajo.
2. **1 tarea = 1 sesión.** Los chats largos inflan el contexto y **degradan la
   calidad**, no solo el costo. El estado se pasa **por archivos** (notas de
   handoff en el repo), no re-contando el historial. Una sesión al 90-95% de
   contexto ya compactada produce salida medible­mente peor que una fresca:
   la primera auto-compactación es luz amarilla → cerrar, escribir handoff a un
   archivo, abrir sesión nueva.
3. **Elegir modelo + esfuerzo al arrancar** según la tabla. Nunca dejar el default.

## Checklist de arranque de sesión

1. ¿Carpeta correcta? (1 juego = 1 dir)
2. Tipo de tarea → buscarla en la tabla.
3. Fijar modelo + esfuerzo (low/med/high).
4. Cargar SOLO los archivos necesarios. No sobre-cargar contexto.
5. Al terminar → escribir handoff a un archivo → **cerrar la sesión**.

## Tabla: tarea → modelo + esfuerzo

| Tarea | Claude Code | Codex CLI |
|---|---|---|
| Scaffold / operaciones de archivos (init, rename, format) | Haiku 4.5 · low | gpt-5.4-mini · low |
| Implementación con spec clara (build, tag scripts) | Sonnet 4.6 · med | gpt-5.4-mini · med |
| Orquestación de generación de assets (imágenes en lote) | Sonnet 4.6 · low-med | gpt-5.4-mini · med |
| Planificación / narrativa / diseño | Opus 4.8 · high (opusplan) | gpt-5.4 · /plan high |
| Debug duro / bugs de estado (races, bloqueos de pipeline) | Opus 4.8 · high | gpt-5.3-codex · high |
| Arquitectura / decisiones irreversibles | Opus 4.8 · **xhigh** | gpt-5.4 · **xhigh** |
| QA / Auditoría / puerta LAW (antes del handoff) | Opus 4.8 · **xhigh** | gpt-5.3-codex · **xhigh** |
| Review / nivel lint (diffs, docs, test stubs) | Haiku 4.5 · low | gpt-5.4-mini · low |
| Refactor de horizonte largo (10+ archivos, raro) | Fable 5 · high | gpt-5.4 · xhigh |

**Escalera de esfuerzo:** min (trivial) → low (mecánico) → **med (default)** →
high (un error sale caro) → xhigh (SOLO 2 casos: puerta de auditoría y arquitectura).

## Modelos de un vistazo

- **Sonnet 4.6** — caballo de batalla, ~90% de las tareas.
- **Haiku 4.5** — barato/rápido; sin razonamiento extendido — nunca para debug o planning.
- **Opus 4.8** — tareas duras; `opusplan` = Opus planifica → Sonnet ejecuta.
- **Fable 5** — horizonte largo, caro — solo cuando de verdad hace falta.
- Codex: gpt-5.4 (flagship), gpt-5.4-mini (~30% cuota, 2× rápido, workers paralelos),
  gpt-5.3-codex (especialista en código), -spark (tiempo real, Pro).

## Cadena de skills VN (juegos/visual)

| Etapa | Claude | Codex |
|---|---|---|
| vn-init (scaffold) | Haiku · low | mini · low |
| vn-plan (creativo, compuestos) | Opus · high | 5.4 · /plan |
| vn-plan-assets (spec estructurada) | Sonnet · med | mini · med |
| vn-build (ensamblado desde spec) | Sonnet · med | mini · med |
| vn-audit (puerta LAW, keystone) | Opus · **xh** | 5.3-cdx · **xh** |

Estático primero: pase 1 (imágenes estáticas); pase 2 (video) va en **su propia sesión**.

## Anti-patrones (NO hacer)

- ✗ xhigh "por las dudas" en todo — quema cuota y no mejora trabajo mecánico.
- ✗ Una sesión viva todo el día → contexto podrido.
- ✗ Apoyarse en /compact en vez de abrir sesión nueva.
- ✗ Haiku para debug/planning — no tiene razonamiento extendido.
- ✗ Pasar estado re-contando el chat en vez de escribirlo a un archivo.
- ✗ Fast mode como default — quema tokens; solo cuando la velocidad importa de verdad.

## Comandos rápidos

| Acción | Claude Code | Codex |
|---|---|---|
| Reset limpio | /clear | hilo nuevo |
| Cambiar modelo/esfuerzo | /model | /effort |
| Compactar (solo si es inevitable) | /compact | auto — no confiar |
| Ramificar desde un punto anterior | — | /fork |
| Estado | /status | /status |

## Handoff por archivos (cómo se aplica en ESTE repo)

- Estado de un pack de juegos → `scratchpad/<pack>/ESTADO.md` (qué está hecho,
  qué falta, hashes de assets, decisiones tomadas).
- Los `mk_*.py` / `build.js` son la fuente de verdad reproducible: ante la duda,
  regenerar desde ellos en vez de tocar HTML construidos.
- Al cerrar una tarea: commit + push + una línea en el ESTADO.md del pack.
