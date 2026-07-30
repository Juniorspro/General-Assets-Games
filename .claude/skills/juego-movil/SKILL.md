---
name: juego-movil
description: Armar un juego móvil completo en UN archivo HTML autocontenido con el motor ARCADE de este repo (menú con arte generado, apaisado forzado en celular vertical, audio con respaldo sintetizado, guardado, niveles, partículas y sonda de verificación headless). Usar cuando se pide un juego nuevo tipo Crossy Road / Stack / Helix / hole.io / Rolling Sky / endless runner, un clon de un juego móvil, o modificar/agregar juegos al pack ARCADE (assets/arcade + scratchpad/arcade).
---

# Juego móvil en un archivo (motor ARCADE)

Cómo se hacen los juegos de este repo: **un HTML autocontenido por juego**, arte y
audio generados con Higgsfield y publicados por jsDelivr, y el mismo motor
compartido para menú, apaisado, audio, guardado y efectos.

## Lo que ya existe (no reescribir)

```
scratchpad/arcade/
  head.html     ← DOM + CSS de todas las pantallas (menú, pausa, fin, niveles, ajustes, carga)
  shell.js      ← motor ARCADE (ver abajo)
  build.js      ← arma dist/<slug>.html (CDN) o arc-<slug>.html (--test, assets locales)
  g_<slug>.js   ← UN archivo por juego, con window.GAME
  ast/          ← assets antes de commitear
  HASH          ← hash corto del commit de assets, lo lee build.js
assets/arcade/  ← assets publicados (arte, música, efectos)
scratchpad/_arc.js ← sonda headless: node _arc.js <slug>
```

Construir: `cd scratchpad/arcade && node build.js --test` (prueba) o `node build.js` (entrega).
Probar: servidor en 8951 sobre el repo y `node _arc.js <slug>` (usa `?local`).

## El contrato del juego

```js
window.GAME={
  slug,name,title,sub,acc,acc2,       // identidad y colores del tema
  three:true, sky:'#05070f',          // sólo si es 3D (carga three.js por importmap)
  art:A('art-x.jpg'),music:A('mus-x.m4a'),sfx:{tap:A('sfx-tap.mp3'),...},
  levels:8,        // 0 = infinito (esconde NIVELES y usa RÉCORD)
  bestLabel:'METROS',
  init(),start(lvl),step(dt),draw(g,alpha),resize(),
  down(p,e),move(p,e),up(p,e),key(code,down),
  dbg:{state(),autoMove()}            // OBLIGATORIO: es lo que prueba la sonda
}
```
El final se avisa con `ARC.over({win,score,stars,sub,coins,title,noStars})`.

Lo que da el motor: `ARC.W/H` (siempre apaisado), `ARC.g` (canvas 2D de efectos),
`ARC.rnd/ARC.THREE` (3D), `ARC.hud(score,info)`, `ARC.tray([botones])`,
`ARC.sfx(n,{vol,rate})`, `ARC.music(url)`, `ARC.vib(ms)`, `ARC.fx.burst/ring/text`,
`ARC.shake(m)`, `ARC.toast(t)`, `ARC.S` (guardado), `ARC.q` (calidad adaptativa),
`ARC.snapGL()` (foto del framebuffer para las sondas).

## Las cinco reglas que NO se negocian

1. **Apaisado siempre.** Si el viewport está vertical, `#stage` se rota 90° y se le
   fijan ancho/alto en px cruzados. Todo lo que mida la UI se mide en el espacio
   del stage (`clientWidth/clientHeight`), **nunca** contra `window.inner*` ni con
   `getBoundingClientRect` (con el stage rotado viven en ejes distintos). El
   puntero se convierte a mano: rotado, `x=clientY`, `y=vw−clientX` (`ARC.pt`).
2. **Paso fijo de 1/60 con acumulador** y alpha de interpolación al dibujar. Nada
   de mover cosas "por frame": el celular va de 30 a 120 fps.
3. **Audio con respaldo sintetizado.** Los mp3 se decodifican a buffers; si alguno
   no llega o el navegador no lo decodifica, suena un blip generado (`BEEP`). El
   audio necesita un gesto: el primer toque despierta el contexto.
4. **Todo el arte del juego es geometría o canvas**; las imágenes generadas son
   para el MENÚ (traen el título dibujado, así que el menú las usa a pantalla
   completa y esconde el título de DOM cuando la imagen carga: `#menu.hasart`).
5. **Cada juego trae `dbg.autoMove()`** que juega solo de verdad. Sin eso no hay
   forma de verificar el juego headless, y un juego sin verificar no se entrega.

## Assets con Higgsfield

- **Una FÓRMULA DE ESTILO por juego** (60-90 palabras: técnica de render, formas y
  contornos, paleta POR ROL —fondo / héroe que contrasta / peligros con un color
  señal—, luz y ánimo, legibilidad + palabra de perspectiva) e insertada **byte a
  byte** en cada prompt. Para un pack, que los bloques 1/2/5 sean iguales entre
  juegos y cambien sólo paleta y ánimo: se ven del mismo estudio.
- Arte de portada: `nano_banana_pro`, 16:9, con el título pedido **dentro** del
  prompt entre comillas. Revisar que el texto salga bien escrito; presupuesto de
  2 intentos por asset.
- Música: `sonilo_music`, 40 s, "seamless loop, no vocals". Efectos:
  `mirelo_text_to_audio`, 1-2 s, "dry". Un juego entero sale por ~10 créditos.
- Los efectos son GENÉRICOS y se comparten entre los cinco juegos (tap, pop,
  chime, coin, win, lose, click, wood, glass, splat, swipe, groan, launch, boom,
  power, shoot): un set nuevo por juego es plata tirada.
- Publicar: `cp ast/* assets/arcade/`, commit, `git rev-parse --short HEAD` a
  `scratchpad/arcade/HASH`, `node build.js`, y comprobar un `200` de jsDelivr
  antes de entregar.

## Verificación mínima antes de entregar (por juego)

`node _arc.js <slug>` corre en 412x915 y 900x430 y exige: escenario apaisado,
menú con título, JUGAR entra en partida, la escena dibuja (luminancia y colores
del framebuffer, no pantalla negra), la sonda juega ~14 acciones y el juego
avanza o termina, la pausa responde y **cero errores de JS**. 18 asserts por
juego. Si algo falla, primero sospechar de la sonda (pasó: teleport a un
edificio, tocar un botón con `mousedown` cuando escucha `click`, medir el canvas
2D cuando la escena está en el de WebGL).

## Errores ya cometidos (no repetirlos)

- Dibujar el juego mientras el menú está abierto: el `draw` explota si el estado
  del nivel todavía no existe. El bucle sólo dibuja en `game/pause/over`.
- `getBoundingClientRect` con el stage rotado: coordenadas cruzadas.
- Sonda que mide el canvas 2D en un juego 3D: siempre "pantalla negra". Usar
  `ARC.snapGL()`.
- three.js desde el CDN en las pruebas: usar `?local` (vendorizado en `/_vthree`).
- Cámara isométrica con la X corrida: las filas salen en diagonal y el juego se
  lee mucho peor. Sin giro en Y, ~30° sobre el horizonte.
- Matar al jugador en el primer obstáculo (sin tiempo de reacción): los primeros
  metros/anillos/filas van siempre limpios.
