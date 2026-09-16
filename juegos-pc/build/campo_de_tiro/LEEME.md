# Cadena de build de `Campo_de_Tiro.html`

El HTML del juego es **generado**. No editarlo a mano.

    python3 patch2.py     # base.html + block.js  →  ../../Campo_de_Tiro.html

- `base.html` — el motor (parkour FP) con el bloque del campo de tiro sacado y reemplazado
  por el marcador `/*__BLOQUE_TIRO__*/`.
- `block.js` — el nivel, el arma, la postura procedural y los hooks de consola.
- `patch2.py` — inserta el bloque y aplica las ediciones al motor por anclas de texto.
  Si un ancla no matchea, aborta con `FALLA ancla` en vez de generar algo roto.
- `h.mjs` — harness headless (Playwright + Chromium SwiftShader) que sirve todo desde disco,
  entra al nivel y saca capturas. Uso: `node h.mjs plan.json` (ver ejemplos en el README del juego).

Está versionado acá porque el contenedor de trabajo se recicla: sin esto, reconstruir la cadena
cuesta una sesión entera.
