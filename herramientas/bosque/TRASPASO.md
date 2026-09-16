# BOSQUE — traspaso de sesión (2026-09-16)

Juego de terror en primera persona, un solo HTML autocontenido, **three.js r128
desde cdnjs** (script clásico, no módulo). Vertical, escenario girado 90°.
El usuario lo prueba **en el celular**. Escribe en castellano rioplatense.

- **El archivo vive en `juegos-pc/Bosque.html`** (rama `claude/billeteras-sin-registro-7yc7u3`).
  Durante la sesión se editó en `/tmp/bq/bosquev21.html`, que es efímero: **usar el del repo**.
- Cada entrega se le manda al usuario como archivo adjunto.

---

## 1 · CÓMO PROBARLO — esto es lo que más vale de esta sesión

El navegador del banco **no tiene salida a internet**, pero `curl` **sí**. Por eso
durante muchas vueltas no se pudo correr nada. La solución:

```bash
cd /tmp/ui && curl -sS -o three128.js \
  https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
sed 's#https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js#three128.js#' \
  juegos-pc/Bosque.html > /tmp/ui/bq.html
PAGINA=bq.html bash run2.sh plan.json out/x.log 412 892
```

- Si `/tmp/ui` no existe: `bash herramientas/banco/armar.sh`.
- Las capturas salen a `/tmp/ui/out/*.png` **giradas**: enderezar con
  `Image.rotate(90, expand=True)`.
- **Sonda del juego**: `window.__B = {BAJO, CFG, FIN, bajar, subir, abrirTrampilla,
  activarNotas, cuenta, jug, aplicarGfx}`. Con `__B.bajar()` se entra al laboratorio
  sin jugar las 13 reliquias.
- Para entrar: `document.getElementById('intro').dispatchEvent(new Event('click',{bubbles:true}))`.
- **Los botones responden a `touchstart`, no a `click`**, porque en el banco
  `'ontouchstart' in window` es true y el camino de click se saltea a propósito
  (evita la doble activación por el click sintético del móvil).
- Chequeo de sintaxis (es `<script>` clásico, `sourceType` por defecto):
  ```bash
  node -e "const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
  const m=f.readFileSync('juegos-pc/Bosque.html','utf8').match(/<script>([\s\S]*)<\/script>/);
  try{a.parse(m[1],{ecmaVersion:'latest'});console.log('ok')}catch(e){console.log('ERROR',e.message)}"
  ```

---

## 2 · CÓMO SE EDITA

Parches de Python con **reemplazo de cadena exacta y `assert s.count(a)==1`**.
Nunca `sed` a ciegas sobre este archivo. Dos trampas ya pagadas:

- Una cadena corta puede ser **subcadena de otra** (el `else{...}` con 10 espacios
  de sangría aparece dentro del de 12): reemplazar **primero el más largo**.
- `io.open(p,'w').write(expr)` **trunca el archivo antes de evaluar `expr`**: si
  `expr` falla, queda en cero bytes. Calcular el texto completo y recién después escribir.

---

## 3 · ESTADO DEL JUEGO

**Fase 1 — 13 reliquias.** Una por casa (12 sitios en 3 anillos) + 1 repartida.
Cuando quedan 2, la que falta lleva un **contorno dorado sin atenuación por
distancia** (se ve desde cualquier parte del mapa). Al juntar la 12ª, **la sombra
deja la última donde empezaste** (`INICIO`, sacado del propio `jugador.pos` inicial).

**Fase 2 — 5 notas** en los mismos sitios que las reliquias (o sea dentro de las
casas, alcanzables por construcción). Cada una tiene **halo propio** con `depthTest`,
niebla y atenuación apagados; la siguiente lleva además un marco tipo mira.

**Fase 3 — el laboratorio.** Con las 5 notas se abre una **trampilla en el claro**,
marcada con un haz verdoso de 30 m y un contorno visible a través de todo, y **la
sombra te guía** hasta ella (camina 8 m delante tuyo; mientras guía no hay sustos).

**El laboratorio** es un **pasillo de 45 × 6,8 m** a −13,6, con **22 tubos** en dos
filas cada 3,9 m: 15 sombras oscuras (5 de ellas **con los ojos rojos**), 5 cuerpos
**de color humano**, uno vacío y **uno reventado** (`BAJO.rotoX/rotoZ`), que es donde
se dispara el **final**: la sombra sale de ese tubo, se acerca, funde a negro y
cierra con seis líneas (`FIN_LINEAS`, en segundos).

**Otros**: malla metálica de rombos cerrando el bosque a 264 m (el jugador se topa
en 262), 12 carteles numerados delante de cada casa, y **botón ⚙** con sensibilidad
(0,4–2,4) y gráficos (baja/media/alta), los dos en `localStorage`.

### Costo y trucos de dibujo que hay que respetar
- Los 22 tubos = **6 llamadas de dibujo**: vidrio y metal **fundidos**, cuerpos y ojos
  **instanciados** (flotan).
- Los cuerpos son **una silueta humana fundida en UNA geometría** (cabeza, cuello,
  torso, cadera, 2 brazos, 2 piernas). Con una esfera estirada se leían a huevo.
- **Los ojos laten con la ESCALA, no con la opacidad**: un material instanciado tiene
  una sola opacidad y latirían todos a la vez.
- **Una sola luz en el laboratorio, y sigue al jugador** por el pasillo: una puntual
  fija deja los extremos negros y no entran más luces en el límite de uniformes que ya
  comparten los faroles y la linterna.
- Los carteles: los 12 números en **un atlas** y los 12 paneles en **una geometría**.

---

## 4 · REGLAS FIJAS DEL USUARIO

- **Nunca** usar cuadros de `AskUserQuestion` — *"se buguea, uso celular"*. Preguntar en texto.
- Desarrollar, commitear y pushear **sólo** a `claude/billeteras-sin-registro-7yc7u3`.
- **No** abrir pull requests salvo pedido explícito.
- **No** poner el identificador del modelo en nada que se pushee.
- **Verificar midiendo antes de afirmar que algo funciona.**
- **Rezona Lab**: todo lo que se genere va al proyecto descartable **`YlgCbidN`**
  ("tmp — descartable, borrar"), se baja al repo y se borra desde la web. **No hay
  borrado por MCP** y `project_id` es obligatorio. Los proyectos de los juegos no se
  tocan con pruebas. Mientras el proyecto exista, cada asset tiene **link público sin auth**.
- Pendiente del usuario: borrar a mano `assets/perro-g1.png` del proyecto `PwVerjWD`.

---

## 5 · DEFECTOS QUE YA COSTARON UNA VUELTA

1. **`pantallaCompleta()` no puede pedir fullscreen sobre `#stage`.** El navegador le
   impone su propio tamaño y le pisa ancho, alto y rotación: el stage pasaba de
   892×412 girado a 412×892 sin girar y el lienzo quedaba **recortado a la mitad** —
   media pantalla negra al cruzar la puerta. Va sobre `documentElement`.
2. **`fusionar()` es la de los árboles**: exige `aFlex`, `aFase` y `color`. Con otras
   geometrías tira `Cannot read properties of undefined (reading 'array')` y se cae la
   construcción entera. El laboratorio tiene su propia `fundir()` mínima.
3. **`Group.add()` devuelve el grupo, no el hijo**: `q.add(new Mesh()).position.y=…`
   le mueve la Y al grupo entero.
4. **Un `let`/`const` leído antes de su línea no devuelve `undefined`: TIRA**, y se
   lleva el módulo entero. Las declaraciones van antes del primer uso.
5. **Medir el brillo antes de tocar la luz.** Un cuadro a 6,0/255 parecía falta de
   luz y era el recorte del lienzo: subir sol/ambiente/exposición sólo dio +0,7.
6. El banco mide `renderer.info.render` **después** de la última pasada: se pone a
   cero en cada `render()`. Para el cuadro entero hace falta `info.autoReset=false`.

### Números de la última corrida (412×892)
| | |
|---|---|
| brillo medio del cuadro | 13,4 / 255 (era 6,0) |
| stage · lienzo tras entrar | 892×412 · 892×412 |
| pasillo | 45 × 6,8 m |
| cuerpos · ojos | 15 oscuros + 5 humanos · 30 ámbar + 10 rojos |
| errores de página | 0 |

---

## 6 · PENDIENTES / IDEAS ABIERTAS

- **three r128 es de 2021.** Subir de versión es la mejora de más impacto y la de más
  riesgo: a partir de r152 cambia la gestión de color y **todo** se ve distinto.
  No tocar sin decidirlo con el usuario.
- El cielo es un shader de degradado y **no ilumina**: no hay `scene.environment`.
  Un 360 que además ilumine es el mayor salto visual disponible.
- **Ninguna textura tiene normal ni rugosidad**; todas son canvas de 256–512 px.
  Aquí entra generar texturas (regla: pedirlas *sin sombras*, `MirroredRepeatWrapping`
  para las costuras, y **contar los metros que cubre cada foto** para la repetición).
- El suelo repite 150×150 sobre 1020 m → una copia cada 6,8 m, y sin normal se lee plano.
- El VHS desatura y viñetea al final del cuadro: cualquier mejora de color pasa por
  ahí después, hay que ajustar las dos puntas juntas.
