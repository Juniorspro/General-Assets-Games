# Helix Jump 3D

Remake en 3D con **three.js** del Helix Jump original (Voodoo / H8games), con niveles
discretos, bola de fuego, escombros físicos, 27 pelotas, misiones y un flujo de menús
completo: carga de assets → selección de idioma → menú principal.

## Jugar

Hay dos versiones, las dos funcionan con doble clic (`file://`) y servidas por http:

| Fichero | Peso | Qué es |
|---|---|---|
| `helix-jump-3d.html` | 8,1 MB | **Un solo fichero, nada más.** Audio empotrado en base64. Para pasarlo por chat o llevarlo en un USB. |
| `index.html` + `assets/` | 641 KB + 9,5 MB | Versión de trabajo. El audio se sirve aparte, así que carga progresiva y cachea mejor. |

```bash
npm run serve       # http://localhost:8080
```

Ninguna necesita instalar nada para jugar; `npm install` sólo hace falta para recompilar.

La única diferencia de contenido: la versión de un fichero no lleva la segunda pista de
gameplay (*Rooftop*, 4 MB de los 8), porque es opcional. El selector de pista se ajusta
solo a lo que viaja en cada build, no aparece una opción muda.

## Controles

| Entrada | Acción |
|---|---|
| Arrastrar (ratón o dedo) | Girar la torre |
| `←` `→` / `A` `D` | Girar la torre |
| Stick izquierdo o D-pad del mando | Girar la torre |
| `Esc` / `P` / botón de pausa | Pausa |
| `Espacio` / `Enter` | Continuar en la carga |

Las teclas están enlazadas a códigos físicos (`KeyA`, `ArrowLeft`), así que funcionan
en teclados con distribución no latina. La sensibilidad y la inversión del giro se
ajustan en Ajustes.

## Mecánicas del original, una por una

| Mecánica del original | Implementación aquí |
|---|---|
| La pelota cae y tú giras la torre | La pelota está fija en el ángulo frontal; gira la torre entera (`game.js`) |
| Plataformas circulares con huecos | Sectores anulares extruidos, 12 slots por anillo (`levelgen.js`) |
| Los tramos rojos terminan la partida | Segmentos `danger`, rojos y con rayas diagonales |
| Niveles discretos, no scroll infinito | N anillos + plataforma de meta al fondo; superarla abre el nivel siguiente |
| Más anillos y menos hueco al avanzar | `8 + nivel·2` anillos (máx. 28); hueco de 3 → 2 slots |
| +1 punto por anillo atravesado | `passRing()` |
| Combos por encadenar anillos | Bonus `combo·2` al aterrizar; aviso en pantalla |
| **3 anillos seguidos → invencible / bola de fuego** | `FIRE_COMBO = 3` activa fuego 3,2 s |
| **Flechas verdes → bola de fuego** | Una o dos por nivel a partir del nivel 2; 5 s de fuego |
| La bola de fuego rompe plataformas | Rompe cualquier anillo, incluidos los rojos, y sigue cayendo |
| Plataformas que se destruyen en pedazos | Cada segmento se parte en 3 escombros con velocidad y giro |
| 27 pelotas desbloqueables por rareza | 27 acabados: 8 comunes, 8 raras, 7 épicas, 4 legendarias |
| Monedas y misiones | Monedas en los huecos; 3 misiones que escalan su objetivo al cobrarlas |
| Dificultad creciente | Más rojo, hueco más estrecho, caída más rápida |
| Anillos móviles | Anillos con giro propio desde el nivel 4 |
| Vibración al impactar | `navigator.vibrate`, desactivable |

## Menús

- **Carga** — barra de progreso real sobre los 14 archivos de audio y el calentamiento
  de la escena, con consejos rotativos.
- **Idioma** — se pregunta una sola vez y queda guardado (es / en / pt / fr).
- **Menú principal** — nivel, récord y monedas, con la torre girando de fondo.
- **Pelotas** — las 27, con rareza, precio y nivel requerido.
- **Misiones** — 3 activas con barra de progreso y recompensa.
- **Ajustes** — idioma, volumen de música y efectos, pista, calidad, sensibilidad,
  vibración, invertir giro y borrado de progreso.
- **En partida** — nivel, puntos, barra de progreso del nivel, medidor de bola de fuego,
  pausa, derrota y nivel completado.

La calidad ajusta la resolución de render, el polvo de fondo y la luz de la bola de
fuego, así que se puede bajar en móviles antiguos.

## Estructura

```
src/i18n.js       textos (es/en/pt/fr)
src/state.js      progreso, ajustes, pelotas y misiones en localStorage
src/audio.js      audio con HTMLAudioElement, pools y crossfade
src/palette.js    8 temas de color + fórmula de estilo
src/gfx.js        texturas de canvas y geometría de sectores
src/levelgen.js   generación de niveles, huecos, peligro, monedas y flechas
src/world.js      escena three.js, torre, pelota, escombros y cámara
src/game.js       física, colisiones y reglas
src/ui.js         pantallas y HUD
src/main.js       arranque, carga y bucle principal
template.html     HTML + CSS de la interfaz
build.mjs         empaqueta todo en index.html
design/assets.csv manifiesto de assets
vendor/three/     three.js 0.185.1 (licencia MIT incluida)
```

## Compilar

```bash
npm install
npm run build     # -> index.html (audio en assets/)
npm run single    # -> helix-jump-3d.html (audio empotrado en base64)
npm run dev       # como build, sin minificar
```

Se compila a un IIFE clásico a propósito: un `<script type="module">` no carga desde
`file://`, y el objetivo es que el juego se pueda abrir haciendo doble clic.

Añade `?debug=1` a la URL para exponer `window.__hx` (juego, escena, estado) y poder
pilotarlo desde un script.

## Notas de implementación

Tres decisiones que no son obvias:

- **Todo el arte es procedural.** Una imagen cargada desde `file://` llega al WebGL
  como origen opaco y `texImage2D` falla, así que las texturas se pintan en `<canvas>`.
  Eso es también lo que permite jugar sin servidor.
- **Audio con `HTMLAudioElement`, no WebAudio.** `decodeAudioData` necesita `fetch`,
  bloqueado en `file://`. Cada efecto se descarga una vez a un blob y todas las copias
  del pool salen de ahí; si `fetch` falla se recurre a la ruta directa.
- **Materiales permanentes.** Se crean una sola vez y por nivel sólo cambian de color:
  crear materiales nuevos obliga a compilar shaders y eso bloquea el hilo principal
  justo al empezar el nivel. Al arrancar se compilan de golpe todas las variantes,
  incluidas las que aún no están en escena (escombros, estela, halos).
- **La torre no usa materiales PBR.** El look es de paleta plana, y bajo un material
  iluminado el color autorizado no sobrevive: la irradiancia del cielo, el mapa de
  entorno y el recorte de canales desvían el tono — un anillo dorado acababa saliendo
  oliva, indistinguible del lima de otro tema. Sin iluminar, cada anillo sale
  exactamente del color del tema (verificado: el píxel del anillo mide `#ffd23f`, su
  color autorizado). El volumen lo dan la silueta, la pared al 72% y una sombra de
  contacto; el sombreado cilíndrico de la columna va horneado en su textura. La pelota
  sí es PBR, que es donde los reflejos y los acabados metálicos importan.

## Assets

Audio tomado de los packs de este repositorio (`Ui.zip`, `Sonidos Rocket liga.zip`,
`Enemigos.zip`, `Combate.zip`, `Cinemáticas.zip`, `frutiger aero.mp3`,
`School Rooftop.mp3`, `Obtención de cualquier item.mp3`). El detalle de qué archivo
cumple cada función está en `design/assets.csv`.

three.js se distribuye bajo licencia MIT (`vendor/three/LICENSE`).
