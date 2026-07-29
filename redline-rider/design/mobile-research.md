# Investigacion: Redline Rider en movil

Devuelto por los agentes del workflow. 7 de 7.

## Presentacion en horizontal por CSS (envoltorio rotado), sin cartel de "gira el movil": bloque contenedor, safe-area remapeada, Screen Orientation API, medida del renderer de three.js

### area

Presentacion en horizontal por CSS (envoltorio rotado), sin cartel de "gira el movil": bloque contenedor, safe-area remapeada, Screen Orientation API, medida del renderer de three.js

### diagnosis

La rotacion NO EXISTE en el juego que se compila. Es codigo muerto y, encima, incompleto.

1. No hay envoltorio. `template.html:165-167` mete `<canvas id="gl">` y `<div id="ui">` directamente en el body, ambos `position:fixed;inset:0` (`template.html:17-18`), y `#nogl` igual (`template.html:161`). No hay ningun elemento que pasarle a `setStage()`.

2. Nadie llama a `setStage()` ni a `layoutStage()`. `src/controls.js` no lo importa NADIE: `src/main.js:3-8` importa state, i18n, audio, World, Game y UI, y `src/game.js:37` sigue instalando su propio `installInput(world.canvas)`. Con `stage === null`, `layoutStage()` (controls.js:46) retorna en la primera linea y `rotated` se queda en `false` para siempre. El jugador ve el juego en vertical. No hay cartel de "gira el movil" en ningun sitio (bien: no hay nada que borrar), pero tampoco hay rotacion.

3. FALTA `transform-origin: 0 0`, y es el fallo que lo rompe todo aunque se conecte. `controls.js:56` escribe `transform: translateX(innerWidth) rotate(90deg)` y el comentario de `controls.js:72` da por hecho el origen en 0 0, pero ni lo escribe el JS ni existe en el CSS de `template.html`. Con el `50% 50%` por defecto, la caja girada queda centrada en el mismo centro y `translateX(vw)` la manda a `x = (vh + vw)/2`: el juego entero fuera de pantalla por la derecha. Tampoco escribe `position:fixed; left:0; top:0`, que es la otra mitad del supuesto.

4. No existe la regla `.rot`. `controls.js:65` hace `document.documentElement.classList.toggle('rot', portrait)` y el comentario promete remapear las muescas, pero en `template.html` no hay ni un selector `.rot`. Las ocho apariciones de `env(safe-area-inset-*)` (`template.html:20,21,119,130,131,136,137,144,156`) siguen apuntando a los lados FISICOS: con el juego girado, `#hudtop{top:calc(9px + env(safe-area-inset-top))}` aparta el HUD del lado del juego que corresponde al borde DERECHO fisico, mientras la muesca (arriba fisico) cae sobre el borde IZQUIERDO del juego, donde estan la distancia y la puntuacion. El HUD se pega a la muesca exactamente por el lado que el comentario dice que evita.

5. Las unidades `vw`/`vh` no se giran. Siguen refiriendose al viewport fisico. Con el escenario rotado, `min(94vw,460px)` de `.panel` (template.html:34) mide sobre el lado CORTO fisico mientras el escenario mide `innerHeight` de ancho, y `max-height:min(74vh,640px)` de `.panel.tall` (template.html:37) limita con el lado LARGO al alto del escenario, que es el corto. Afectados: 28, 31, 34, 37, 55, 57, 63, 67, 133, 137, 142, 143, 149, 257 y los tres `style="width:min(94vw,330px)"` inline (214, 233, 241). Paneles estrechos y listas cortadas: parte de "lo mal ubicada la moto" es en realidad la UI descuadrada alrededor.

6. `mapPointer` (controls.js:75) relee `innerWidth` por su cuenta mientras `layoutStage` (controls.js:54-56) lo lee aparte. Son dos medidas independientes del mismo numero: si cambia entre una y otra (barra de herramientas, teclado), el mapeo del dedo se desplaza. Y `controls.js:160` vuelve a leer `stage.clientWidth` en cada `pointermove`, un reflow sincrono por evento de puntero.

7. La decision es solo `innerHeight > innerWidth` (controls.js:47). Una ventana de escritorio estrecha tambien lo cumple: el juego se giraria 90 grados en un portatil.

8. `world.resize()` (world.js:432-438) mide `this.canvas.clientWidth || window.innerWidth`. Hoy funciona por casualidad; en cuanto el lienzo viva en el envoltorio hay dos trampas: el `|| window.innerWidth` de respaldo dispara si `clientWidth` es 0 durante la construccion (`world.js:77` llama a `resize()` desde el constructor) y deja el renderer con la relacion de aspecto INVERTIDA hasta el siguiente resize — moto descentrada y horizonte torcido; y `main.js:118-119` llama a `world.resize()` directamente en `resize`/`orientationchange`, sin pasar por `layoutStage`, asi que el renderer puede medir el escenario ANTES de que se le haya cambiado el tamano. El `setTimeout(..., 150)` de `main.js:119` es una sola medida a ciegas: en iOS unas veces llega despues de que el navegador actualice las medidas y otras no.

9. `src/game.js:45` y `:50` leen `e.clientX` en crudo y `cv.clientWidth`. Con el escenario girado, `clientX` sigue siendo coordenada de VIEWPORT: un desliz horizontal del dedo se lee como vertical. Esa es literalmente la queja "controles en reversa" en cuanto se gire la pantalla, y el `installInput` de game.js hay que borrarlo.

Verificado en Chromium headless: con `transform-origin:0 0` y `translateX(390px) rotate(90deg)` sobre un viewport de 390x844, la matriz calculada es `matrix(0, 1, -1, 0, 390, 0)` — es decir (x,y) -> (390 - y, x), que confirma el comentario de controls.js:72 y la formula de `mapPointer`. `stage.getBoundingClientRect()` da exactamente {0,0,390,844}: el encaje es perfecto. `stage.clientWidth/clientHeight` da 844x390 (caja de layout, sin transformar) mientras `getBoundingClientRect()` del lienzo da 390x844 (caja ya transformada). Y un hijo `position:fixed;inset:0` dentro del envoltorio resuelve contra el ENVOLTORIO, no contra el viewport, tanto con `rotate(90deg)` como con `rotate(0deg)`.

### recommendation

Un solo envoltorio `#stage` autorado en el HTML (no creado por JS: reparentar el lienzo despues de arrancar provoca un parpadeo y, peor, un `clientWidth` de 0 en el momento en que el World se construye). El envoltorio es `position:fixed; left:0; top:0; transform-origin:0 0`, de tamano fijo en px escrito por JS, y con `transform: translateX(vw) rotate(90deg)` cuando el aparato esta en vertical.

Sobre el ORDEN de las transformaciones: la lista se aplica de derecha a izquierda al punto. Con el origen en 0 0, `rotate(90deg)` lleva el local (x,y) a (-y, x): la caja entera, de `stageW x stageH` = `vh x vw`, queda con x en (-vw, 0) — completamente fuera de pantalla por la IZQUIERDA — y con y en (0, vh). Falta solo empujarla vw hacia la derecha, y eso es lo que hace `translateX(vw)` escrito a la izquierda del rotate. El orden contrario, `rotate(90deg) translateX(vw)`, traslada en el sistema local ANTES de girar, asi que el propio desplazamiento se gira: en vez de mover a la derecha mueve hacia ABAJO, y la caja se queda fuera por la izquierda y encima vw mas abajo. (El equivalente en porcentajes es `rotate(90deg) translateY(-100%)`, que da la misma matriz; uso el explicito porque es el que ya esta escrito y el que documenta la aritmetica de `mapPointer`.)

`position:fixed` dentro del envoltorio: cualquier `transform` distinto de `none` convierte al elemento en bloque contenedor de sus descendientes `position:fixed`. Comprobado: un `fixed;inset:0` dentro del `#stage` mide 844x390 (el escenario) y no 390x844 (el viewport). Eso juega a favor — el lienzo y la UI se quedan encajados en el escenario girado — pero es una referencia que cambia sola: si en horizontal se escribe `transform:none` (controls.js:60), el bloque contenedor desaparece y la mitad del CSS pasa a medir contra el viewport. Dos arreglos, ambos: en horizontal se escribe `rotate(0deg)`, identidad pero NO `none`, para que el bloque contenedor sea el mismo en las dos orientaciones; y `#gl`, `#ui` y `#nogl` pasan a `position:absolute` (el escenario es `fixed`, asi que es su bloque contenedor de todos modos y ya no dependemos de que haya transform).

Las `env(safe-area-inset-*)` no se giran: siguen describiendo el viewport fisico. Con el mapeo (x,y) -> (vw - y, x): local x creciente es viewport Y creciente, o sea el borde IZQUIERDO del juego (x=0) es el borde de ARRIBA fisico; y local y creciente es viewport X decreciente, o sea el borde de ARRIBA del juego (y=0) es el DERECHO fisico. Los cuatro nombres rotan un paso: arriba<-derecha, derecha<-abajo, abajo<-izquierda, izquierda<-arriba. Con el movil en vertical la muesca esta fisicamente arriba, asi que aparece por la IZQUIERDA del juego (consistente: para leer el juego girado el jugador tumba el telefono en sentido antihorario y el borde superior fisico le queda a la izquierda). Se implementa con cuatro custom properties `--sat/--sar/--sab/--sal` en `:root`, redefinidas en `:root.rot`, y todo el CSS del HUD leyendo `var(--sa*)` en vez de `env()` directo. Es la unica forma de no duplicar cada regla, y es comprobable headless sin muesca real: basta inyectar `:root.rot{--sat:44px}` y leer el `top` calculado.

Mismo truco para las unidades: `--vw` y `--vh` valen 1% del ESCENARIO en px, los escribe `layoutStage`, y arrancan en `1vw`/`1vh` para que sin JS todo siga como ahora. `94vw` pasa a `calc(94 * var(--vw))`. La alternativa moderna es `container-type:size` en el escenario y unidades `cqw/cqh`, que es una linea en vez de veinte, pero si el navegador no las conoce la declaracion entera se descarta y los paneles pierden el ancho de golpe; con la custom property la degradacion es exacta.

La Screen Orientation API es un EXTRA, nunca el mecanismo. Se intenta una sola vez, dentro del gesto del boton de jugar: `documentElement.requestFullscreen()` y despues `screen.orientation.lock('landscape')`, cada uno en su propio try/catch. En Android el lock exige pantalla completa y aun asi puede negarse; en iOS Safari `screen.orientation.lock` no existe. Si sale bien, `innerWidth` pasa a ser el mayor y `layoutStage` deja el envoltorio sin girar por si solo: los dos mecanismos se componen sin condicion especial porque la decision es siempre la misma comparacion de medidas. Si sale mal no se entera nadie — hay que capturar el rechazo de la promesa, no solo envolver la llamada, porque un rechazo suelto ensucia la consola y en algunos navegadores empotrados salta un dialogo.

Medidas: la fuente de verdad es `documentElement.clientWidth/clientHeight` (viewport de LAYOUT), no `innerWidth/innerHeight` (incluye barra de desplazamiento) y desde luego no `visualViewport.width/height`, que se dividen por la escala del pinch-zoom y encogerian el escenario al hacer zoom. `visualViewport` sirve para saber CUANDO volver a medir, no para el tamano. Se cachean `vw`/`vh` en el modulo y `mapPointer` usa el mismo numero que se metio en el `translateX`, no una lectura nueva. Y `layoutStage` avisa por callback: es el unico camino por el que el renderer de three.js se re-mide, para garantizar que el escenario ya tiene su tamano nuevo cuando el renderer lo lee.

El renderer mide `clientWidth/clientHeight` — caja de layout, sin transformar, 844x390 — o mejor aun recibe los numeros de `layoutStage` y no mide nada. `getBoundingClientRect()` esta PROHIBIDO aqui: devuelve la caja ya transformada, con ancho y alto intercambiados, y el `camera.aspect` sale del reves. `setSize(w, h, false)` con `updateStyle=false` es correcto y hay que mantenerlo: el CSS ya tiene el lienzo al 100% del escenario.

Y girar solo en aparatos tactiles (`pointer:coarse` o `maxTouchPoints`), para no girar el juego en una ventana de escritorio estrecha.

### code

════════════════════════════════════════════════════════════
1) template.html — envoltorio y variables
════════════════════════════════════════════════════════════

(a) Bloque :root, sustituye lineas 8-11:

  :root{
    --accent:#ff6a1a; --ink:#07080c; --panel:rgba(11,15,23,.82); --line:rgba(255,255,255,.13);
    --text:#eef2f8; --dim:#8b97a8;
    /* Margenes de seguridad DEL JUEGO. Se leen siempre por estas variables y nunca con
       env() directo: al girar el envoltorio los cuatro lados cambian de sitio. El 0px de
       respaldo es obligatorio, sin el un navegador que no conozca env() descarta el calc()
       entero y el HUD pierde su posicion. */
    --sat:env(safe-area-inset-top,0px);    --sar:env(safe-area-inset-right,0px);
    --sab:env(safe-area-inset-bottom,0px); --sal:env(safe-area-inset-left,0px);
    /* 1% del ESCENARIO en px, los escribe layoutStage. Las unidades vw/vh nativas siguen
       midiendo el viewport fisico y con el juego girado significan lo contrario de lo que
       aparenta el diseno. El valor de aqui es el que vale sin JS. */
    --vw:1vw; --vh:1vh;
  }
  /* Escenario girado con transform-origin 0 0 y translateX(vw) rotate(90deg). El punto
     local (x,y) acaba en (vw - y, x), asi que:
       local x crece  -> viewport Y crece   -> el borde IZQUIERDO del juego es ARRIBA fisico
       local y crece  -> viewport X decrece -> el borde de ARRIBA del juego es DERECHO fisico
     Los nombres rotan un paso: arriba<-derecha<-abajo<-izquierda<-arriba. Con el movil en
     vertical la muesca esta arriba, o sea que sale por la IZQUIERDA del juego. */
  :root.rot{
    --sat:env(safe-area-inset-right,0px);
    --sar:env(safe-area-inset-bottom,0px);
    --sab:env(safe-area-inset-left,0px);
    --sal:env(safe-area-inset-top,0px);
  }

(b) Sustituye lineas 17-18 (#gl y #ui):

  /* El envoltorio que se gira. Las dos declaraciones criticas son transform-origin:0 0 y
     left/top:0: toda la aritmetica de layoutStage y de mapPointer las da por hechas.
     En horizontal el transform es rotate(0deg) y NO none, a proposito: un transform
     distinto de none convierte al envoltorio en bloque contenedor de sus descendientes
     fixed, y esa referencia tiene que ser la misma girado y sin girar. */
  #stage{position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden;
    transform-origin:0 0;transform:rotate(0deg)}
  /* absolute y no fixed: el escenario es fixed, asi que ya es su bloque contenedor, y de
     paso deja de depender de si hay transform o no. */
  #gl{position:absolute;inset:0;width:100%;height:100%;display:block}
  #ui{position:absolute;inset:0;pointer-events:none;z-index:2}

(c) Sustituye lineas 19-22 (.screen), padding en los cuatro lados:

  .screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:16px;
    padding:calc(16px + var(--sat)) calc(16px + var(--sar))
            calc(16px + var(--sab)) calc(16px + var(--sal));
    opacity:0;visibility:hidden;pointer-events:none;
    transition:opacity .26s ease,visibility .26s;overflow:hidden}

(d) Bloque HUD, sustituye lineas 119, 130-137, 144 y 156:

  #hudtop{position:absolute;top:calc(9px + var(--sat));left:0;right:0;
    display:flex;align-items:flex-start;justify-content:space-between;
    padding:0 calc(12px + var(--sar)) 0 calc(12px + var(--sal));gap:8px}
  ...
  #speedo{position:absolute;right:calc(14px + var(--sar));
    bottom:calc(16px + var(--sab));text-align:right;
    text-shadow:0 3px 14px rgba(0,0,0,.65)}
  #speedo .n{font-size:clamp(44px,calc(12 * var(--vw)),68px);font-weight:900;line-height:.92;
    font-variant-numeric:tabular-nums}
  ...
  #rpm{position:absolute;right:calc(14px + var(--sar));
    bottom:calc(104px + var(--sab));width:min(calc(46 * var(--vw)),190px);height:5px;
    border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}
  ...
  #combo{position:absolute;left:50%;top:calc(9px + var(--sat) + 58px);
    transform:translateX(-50%);font-size:13px;font-weight:900;letter-spacing:.1em;
    color:var(--accent);opacity:0;transition:opacity .2s;text-shadow:0 2px 10px rgba(0,0,0,.6)}
  ...
  .toast{position:absolute;left:50%;bottom:calc(78px + var(--sab));
    transform:translateX(-50%);background:rgba(6,9,15,.92);border:1px solid var(--line);
    border-radius:11px;padding:9px 15px;font-size:11.5px;font-weight:700;opacity:0;
    transition:opacity .25s;pointer-events:none;white-space:nowrap}

(e) Linea 161, #nogl pasa a absolute:

  #nogl{position:absolute;inset:0;display:none;place-items:center;padding:28px;text-align:center;
    font-size:13.5px;line-height:1.6;color:var(--dim);z-index:9}

(f) Sustituciones mecanicas de vw/vh (todas las demas), viejo -> nuevo:

  L28   clamp(34px,9.5vw,64px)   -> clamp(34px,calc(9.5 * var(--vw)),64px)
  L31   clamp(10px,2.5vw,14px)   -> clamp(10px,calc(2.5 * var(--vw)),14px)
  L34   min(94vw,460px)          -> min(calc(94 * var(--vw)),460px)
  L37   min(74vh,640px)          -> min(calc(74 * var(--vh)),640px)
  L55   min(94vw,330px)          -> min(calc(94 * var(--vw)),330px)
  L57   min(94vw,330px)          -> min(calc(94 * var(--vw)),330px)
  L63   min(80vw,300px)          -> min(calc(80 * var(--vw)),300px)
  L67   min(86vw,420px)          -> min(calc(86 * var(--vw)),420px)
  L142  clamp(20px,5.5vw,30px)   -> clamp(20px,calc(5.5 * var(--vw)),30px)
  L143  clamp(15px,4vw,21px)     -> clamp(15px,calc(4 * var(--vw)),21px)
  L149  clamp(46px,13vw,74px)    -> clamp(46px,calc(13 * var(--vw)),74px)
  L257  clamp(26px,7vw,42px)     -> clamp(26px,calc(7 * var(--vw)),42px)
  L214, L233, L241 (style inline): width:min(94vw,330px)
                                -> width:min(calc(94 * var(--vw)),330px)

(g) El DOM: envuelve el lienzo, la UI y el aviso de WebGL. Linea 165 pasa de

  <canvas id="gl"></canvas>
  <div id="ui">
  ...
  </div>
  <div id="nogl">...</div>

a

  <div id="stage">
    <canvas id="gl"></canvas>
    <div id="ui">
    ...
    </div>
    <div id="nogl">WebGL no está disponible en este navegador.<br>WebGL is not available in this browser.</div>
  </div>

  (autorado en el HTML y no creado por JS a proposito: reparentar el lienzo despues de
   arrancar parpadea y, peor, deja clientWidth en 0 justo cuando se construye el World.)


════════════════════════════════════════════════════════════
2) src/controls.js — sustituye lineas 29-30 y el bloque 36-76
════════════════════════════════════════════════════════════

Fuera las lineas 29-30:
-  let stage = null;               // envoltorio rotado, para mapear el puntero
-  let rotated = false;

y en su sitio:

let stage = null;               // envoltorio rotado, para mapear el puntero
let rotated = false;
let vw = 0, vh = 0;             // viewport de layout medido, UNICA fuente del mapeo
let stageW = 0, stageH = 0;
let onLayout = null;            // aviso al resto del juego: aqui es donde three.js re-mide
let pending = 0;

Y el bloque entero 36-76 pasa a:

/* ---------- pantalla rotada ---------- */

/** El envoltorio se rota 90 grados cuando el movil esta en vertical, para presentar el
    juego en horizontal SIN pedirle al jugador que gire el telefono ni ensenarle un
    cartel de "gira el movil". Si el navegador ya ha girado la pagina, no se toca.
    cb recibe (w, h) del escenario cada vez que cambia: es el unico sitio desde el que se
    debe re-medir el renderer, para que el lienzo nunca lea un escenario a medio cambiar. */
export function setStage(el, cb){ stage = el; onLayout = cb || null; }

export const isRotated = () => rotated;
export const stageSize = () => ({ w:stageW, h:stageH });

/* Girar solo en aparatos tactiles: una ventana de escritorio estrecha tambien cumple
   alto > ancho, y girar el juego 90 grados en un portatil no tiene ningun sentido. */
const coarse = () => (navigator.maxTouchPoints || 0) > 0 ||
  (window.matchMedia ? matchMedia('(pointer:coarse)').matches : false);

/* Se mide el viewport de LAYOUT. innerWidth incluye la barra de desplazamiento, y
   visualViewport viene dividido por la escala del pinch-zoom: usarlo para el tamano del
   escenario encogeria el juego al hacer zoom. visualViewport sirve para saber CUANDO hay
   que volver a medir, no para el tamano. */
function measure(){
  const d = document.documentElement;
  return { w: Math.round(d.clientWidth || innerWidth), h: Math.round(d.clientHeight || innerHeight) };
}

export function layoutStage(){
  if (!stage) return { w:innerWidth, h:innerHeight };
  const m = measure();
  const portrait = m.h > m.w && coarse();
  if (m.w === vw && m.h === vh && portrait === rotated) return { w:stageW, h:stageH };

  vw = m.w; vh = m.h;
  rotated = portrait;
  stageW = portrait ? vh : vw;      // el escenario mide al reves: ancho = alto de pantalla
  stageH = portrait ? vw : vh;
  stage.style.width = stageW + 'px';
  stage.style.height = stageH + 'px';

  /* La lista se aplica de DERECHA a IZQUIERDA sobre el punto: primero rotate, despues
     translate. Con transform-origin en 0 0, rotate(90deg) lleva el local (x,y) a (-y, x):
     la caja queda con x en (-stageH, 0), o sea entera fuera de pantalla por la IZQUIERDA,
     y stageH vale justo vw, asi que translateX(vw) la devuelve encajada.
     Al reves, "rotate(90deg) translateX(vw)", el desplazamiento se gira tambien y en vez
     de mover a la derecha mueve hacia ABAJO: la caja sigue fuera por la izquierda y encima
     se va vw hacia abajo.
     transform-origin:0 0 (esta en el CSS de #stage) no es opcional: con el 50% 50% por
     defecto la caja girada sale centrada y translateX la manda a (vh + vw)/2, fuera de
     pantalla por la derecha.
     En horizontal se escribe la identidad rotate(0deg) y NO none: un transform distinto de
     none es lo que hace del envoltorio bloque contenedor de sus hijos fixed, y esa
     referencia tiene que ser la misma en las dos orientaciones. */
  stage.style.transform = portrait
    ? 'translateX(' + vw + 'px) rotate(90deg)'
    : 'rotate(0deg)';

  /* 1% del escenario en px para el CSS. Sin esto cada vw del diseno mide el lado
     equivocado con el juego girado. */
  const r = document.documentElement.style;
  r.setProperty('--vw', (stageW / 100) + 'px');
  r.setProperty('--vh', (stageH / 100) + 'px');

  /* Las muescas de pantalla cambian de lado al girar: lo que fisicamente es el borde
     superior pasa a ser el IZQUIERDO del juego. El remapeo de env() vive en :root.rot. */
  document.documentElement.classList.toggle('rot', portrait);

  if (onLayout) onLayout(stageW, stageH);
  return { w:stageW, h:stageH };
}

/** Punto de pantalla -> coordenadas locales del escenario rotado.
    clientX/clientY llegan SIN transformar aunque el elemento este rotado, asi que con el
    escenario girado un desliz horizontal del dedo se leeria como vertical.
    Con origen 0 0 y translateX(vw) rotate(90deg) la matriz es (0,1,-1,0,vw,0), o sea que
    el local (x,y) acaba en (vw - y, x). Se invierte: x = clientY, y = vw - clientX.
    Se usa el vw CACHEADO, el mismo numero que se metio en el translateX. Volver a leer
    innerWidth aqui seria una segunda medida del mismo valor, y si cambia entre las dos
    (barra de herramientas, teclado) el dedo se desplaza. */
export function mapPointer(e){
  if (!rotated) return { x:e.clientX, y:e.clientY };
  return { x:e.clientY, y:vw - e.clientX };
}

/** Se engancha una vez desde el arranque. orientationchange llega ANTES de que el
    navegador haya actualizado las medidas, y iOS ademas anima la barra de herramientas:
    una sola medida a 150 ms acierta unas veces y otras no. Se vuelve a medir varias veces
    y layoutStage se corta solo cuando el resultado se repite. */
export function watchLayout(){
  const relayout = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(layoutStage);
  };
  addEventListener('resize', relayout, { passive:true });
  addEventListener('orientationchange', () => {
    relayout();
    for (const ms of [60, 200, 450, 800]) setTimeout(layoutStage, ms);
  }, { passive:true });
  /* El teclado virtual y las barras que aparecen y desaparecen no siempre disparan resize
     en la ventana, pero si en el viewport visual. */
  if (window.visualViewport){
    visualViewport.addEventListener('resize', relayout, { passive:true });
    visualViewport.addEventListener('scroll', relayout, { passive:true });
  }
  if (screen.orientation && screen.orientation.addEventListener)
    screen.orientation.addEventListener('change', relayout);
  layoutStage();
}

/** Bloqueo de orientacion: es un EXTRA, no el mecanismo. Si sale bien, innerWidth pasa a
    ser el mayor y layoutStage deja el envoltorio sin girar el solo, sin ninguna condicion
    especial. Si sale mal no se entera nadie.
      - Android exige pantalla completa antes de lock(), y aun asi puede negarlo.
      - iOS Safari no tiene screen.orientation.lock: la funcion no existe.
    Hay que capturar el RECHAZO de la promesa, no solo envolver la llamada: un rechazo
    suelto ensucia la consola y en algunos navegadores empotrados abre un dialogo.
    Debe llamarse DENTRO de un gesto del usuario. */
export async function tryLockLandscape(){
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen)
      await el.requestFullscreen({ navigationUI:'hide' });
  } catch (e) { /* negado: se sigue con el envoltorio girado, que es lo que ya funciona */ }
  try {
    const o = screen.orientation;
    if (o && typeof o.lock === 'function') await o.lock('landscape');
  } catch (e) { /* no permitido: silencio, ni cartel ni consola */ }
  layoutStage();
}

Y en install(), linea 160, fuera el reflow por evento de puntero:

-    const k = 3.4 / Math.max(240, stage ? stage.clientWidth : innerWidth);
+    const k = 3.4 / Math.max(240, stageW || innerWidth);


════════════════════════════════════════════════════════════
3) src/main.js
════════════════════════════════════════════════════════════

Anade el import (junto a los de la linea 3-8):

+ import { setStage, layoutStage, watchLayout, tryLockLandscape, install, bindPedals,
+          enableGyro, update as updateInput, releaseAll } from './controls.js';

Sustituye el bloque de las lineas 16-25:

  const canvas = document.getElementById('gl');
+ /* El escenario se coloca ANTES de construir el World: si el lienzo mide 0 cuando el
+    constructor llama a resize(), el respaldo || innerWidth deja el renderer con la
+    relacion de aspecto del VIEWPORT, invertida, y la moto sale descentrada. */
+ let world;
+ setStage(document.getElementById('stage'), (w, h) => { if (world) world.resize(w, h); });
+ layoutStage();
- let world;
  try {
    world = new World(canvas);
  } catch (e) {
    document.getElementById('nogl').style.display = 'grid';
    document.getElementById('ui').style.display = 'none';
    return;
  }
  world.setQuality(state.quality || 'high');
+ watchLayout();          // ahora ya hay quien re-medir; el callback avisa al renderer

En el flujo, dentro del gesto del boton de jugar (linea 52 aprox.). Las dos llamadas se
lanzan SIN await entre ellas: iOS pide el permiso del giroscopio dentro del gesto y un
await por delante lo pierde; Android quiere la pantalla completa, que en iPhone no existe.

  onPlay: () => {
+   enableGyro();          // iOS: tiene que ser dentro del gesto
+   tryLockLandscape();    // Android: extra, falla en silencio
    ride();
  },

Y fuera los dos listeners de las lineas 118-119, que se saltan layoutStage y pueden medir
el escenario antes de cambiarlo:

- addEventListener('resize', () => world.resize(), { passive:true });
- addEventListener('orientationchange', () => setTimeout(() => world.resize(), 150), { passive:true });

Linea 100, para poder comprobarlo desde un script:

- if (/[?&]debug=1/.test(location.search)) window.__rr = { game, world, ui, state, audio };
+ if (/[?&]debug=1/.test(location.search))
+   window.__rr = { game, world, ui, state, audio, controls:{ isRotated, stageSize, layoutStage, input } };
  (anade isRotated, stageSize e input al import de controls.js)


════════════════════════════════════════════════════════════
4) src/world.js — resize con medidas explicitas
════════════════════════════════════════════════════════════

Sustituye resize() (lineas 432-438):

  resize(w, h){
    /* Las medidas llegan de layoutStage. NUNCA getBoundingClientRect: con el escenario
       girado devuelve la caja YA transformada, con ancho y alto intercambiados, y el
       camera.aspect saldria del reves. clientWidth/clientHeight si valen de respaldo: son
       la caja de layout, sin transformar. Se redondea porque innerWidth puede ser
       fraccionario y un buffer a medio pixel deja una costura de un pixel. */
    w = Math.max(1, Math.round(w || this.canvas.clientWidth || innerWidth));
    h = Math.max(1, Math.round(h || this.canvas.clientHeight || innerHeight));
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);   // false: el CSS ya tiene el lienzo al 100%
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

Y en setQuality (linea 234), invalida la cache antes de re-medir, porque cambia el
pixelRatio aunque el tamano en CSS no cambie:

-   this.resize();
+   this._w = 0;
+   this.resize();


════════════════════════════════════════════════════════════
5) src/game.js — borrar el installInput propio
════════════════════════════════════════════════════════════

Fuera la linea 37 (this.installInput(world.canvas)) y el metodo entero de las lineas
41-68. Lee e.clientX en crudo (lineas 45 y 50): con el escenario girado clientX sigue
siendo coordenada de VIEWPORT, asi que un desliz horizontal del dedo se lee como vertical
— controles al reves en cuanto se gira la pantalla. La entrada pasa por controls.js, que
mapea el puntero con mapPointer.

### constants

- **name**: rotacion del envoltorio — **value**: translateX(vw) rotate(90deg) con transform-origin:0 0 — **why**: Verificado en Chromium: da la matriz (0,1,-1,0,vw,0), o sea (x,y) -> (vw - y, x), y el getBoundingClientRect del escenario encaja exactamente en el viewport (0,0,390,844 sobre un viewport 390x844). El orden contrario gira tambien el desplazamiento y mueve hacia abajo en vez de a la derecha. Con el transform-origin por defecto (50% 50%) la caja acaba en x=(vh+vw)/2, fuera de pantalla.
- **name**: transform en horizontal — **value**: rotate(0deg) — **why**: Identidad, pero NO none. Cualquier transform distinto de none convierte al envoltorio en bloque contenedor de sus descendientes position:fixed. Escribir none en horizontal haria que esa referencia cambiara con la orientacion. Comprobado: un fixed;inset:0 dentro del escenario mide 844x390 (el escenario) tanto con rotate(90deg) como con rotate(0deg).
- **name**: mapeo de safe-area con rot — **value**: --sat=inset-right, --sar=inset-bottom, --sab=inset-left, --sal=inset-top — **why**: Derivado de (x,y) -> (vw - y, x): local x creciente es viewport Y creciente (izquierda del juego = arriba fisico), local y creciente es viewport X decreciente (arriba del juego = derecha fisico). Los nombres rotan un paso. La muesca esta fisicamente arriba, asi que con el juego girado sale por la izquierda, que es donde estan la distancia y la puntuacion del HUD.
- **name**: --vw / --vh — **value**: stageW/100 px y stageH/100 px, con 1vw/1vh de valor inicial — **why**: Las unidades vw/vh nativas siguen midiendo el viewport fisico: con el juego girado, min(94vw,460px) mide sobre el lado corto mientras el escenario mide vh de ancho. El valor inicial 1vw/1vh hace que sin JS todo se comporte exactamente como ahora.
- **name**: respaldo de env() — **value**: env(safe-area-inset-*, 0px) — **why**: Sin el segundo argumento, un navegador que no conozca env() invalida el calc() completo, la declaracion se descarta y el HUD pierde su posicion (top pasa a auto). Las ocho apariciones actuales en template.html van sin respaldo.
- **name**: reintentos tras orientationchange — **value**: rAF + 60, 200, 450 y 800 ms — **why**: orientationchange se dispara antes de que el navegador actualice clientWidth/clientHeight, y iOS anima la barra de herramientas durante unos cientos de ms. El setTimeout de 150 ms de main.js:119 es una sola medida a ciegas. Con la guarda de layoutStage (si nada cambio, retorna) los reintentos de sobra no cuestan nada.
- **name**: medida del viewport — **value**: documentElement.clientWidth / clientHeight — **why**: Es el viewport de LAYOUT: es lo que vale para un elemento fixed a pantalla completa, no incluye la barra de desplazamiento como innerWidth, y no se divide por la escala del pinch-zoom como visualViewport.width. visualViewport se usa solo como senal de que hay que volver a medir.
- **name**: condicion para girar — **value**: clientHeight > clientWidth Y (maxTouchPoints > 0 o pointer:coarse) — **why**: controls.js:47 solo compara medidas: una ventana de escritorio estrecha tambien cumple alto > ancho y el juego se giraria 90 grados en un portatil.
- **name**: medida del renderer — **value**: clientWidth/clientHeight, jamas getBoundingClientRect — **why**: Comprobado: con el escenario girado, canvas.clientWidth/clientHeight da 844x390 (caja de layout) y getBoundingClientRect da 390x844 (caja transformada). Con el segundo, camera.aspect sale invertido.
- **name**: setSize(w, h, false) — **value**: updateStyle = false — **why**: Ya esta bien en world.js:435 y hay que mantenerlo: el CSS tiene el lienzo a width/height 100% del escenario, y si three.js escribiera el estilo lo fijaria en px y se desincronizaria del escenario en el siguiente giro.

### pitfalls

- getBoundingClientRect() sobre el lienzo o el escenario devuelve la caja YA transformada, con ancho y alto intercambiados. Es la trampa que mas cuesta ver porque el numero es plausible. Medido: 390x844 en vez de 844x390. Solo clientWidth/clientHeight (o los numeros de layoutStage) sirven para el renderer.
- transform-origin por defecto. Es 50% 50%, y toda la aritmetica de translateX(vw) rotate(90deg) supone 0 0. Con el valor por defecto el juego no aparece descuadrado: desaparece entero por la derecha (x = (vh+vw)/2). controls.js:56 lo escribe sin ponerlo en ningun sitio.
- transform:none en horizontal. Quita el bloque contenedor y hace que todos los position:fixed de dentro pasen de medir el escenario a medir el viewport, asi que el CSS se comporta distinto segun la orientacion por motivos que no tienen nada que ver con la rotacion. Usar rotate(0deg).
- clientX/clientY no se transforman nunca. Son coordenadas de viewport aunque el elemento este girado. El hit-testing SI es consciente de la transformacion (los botones dentro del escenario reciben sus pointerdown solos, sin tocar nada), asi que solo hay que mapear la aritmetica de coordenadas en crudo — y ese es justo lo que hace game.js:45 y :50 sin mapear.
- Dos lecturas del mismo viewport. layoutStage mete innerWidth en el translateX y mapPointer relee innerWidth por su cuenta (controls.js:56 y :75). Si el valor cambia entre las dos, el dedo se desplaza justo cuando aparece o desaparece la barra de herramientas. Hay que cachear.
- vw/vh dentro del escenario girado. No se remapean. Es un fallo silencioso: los paneles siguen visibles, solo con el ancho y el alto maximo cruzados, y se confunde facilmente con un problema de diseno.
- env() sin valor de respaldo invalida el calc() entero en un navegador que no lo conozca, y el elemento pierde la posicion (top pasa a auto) en vez de degradar a cero.
- El teclado virtual y las barras de navegacion. En Android Chrome el teclado encoge innerHeight y podria volcar la decision portrait/landscape a mitad de partida; en iOS no toca innerHeight pero si visualViewport. Este juego solo tiene sliders y un confirm() (ui.js:262), asi que la fuente real de cambios de medida son las barras que aparecen y desaparecen; la guarda de igualdad en layoutStage evita el bucle de reflows que se monta si se re-escribe el transform en cada evento de visualViewport.
- screen.orientation.lock() rechaza la promesa, no lanza. Envolverlo en try/catch sin await, o sin .catch(), deja un unhandled rejection en consola y en algunos navegadores empotrados abre un dialogo de error — justo el cartel que se quiere evitar. En iOS Safari la funcion ni existe, hay que comprobar typeof.
- requestFullscreen y DeviceOrientationEvent.requestPermission compiten por el mismo gesto. Si se hace await del fullscreen antes de pedir el giroscopio, iOS ya no considera que se este dentro del gesto y niega el permiso. Hay que lanzar las dos sincronamente desde el handler del boton.
- backdrop-filter dentro de un ancestro girado. .screen.blur y .panel (template.html:25,35) lo usan; en iOS anterior a 16 el desenfoque se muestrea en el sistema de coordenadas equivocado y salen bandas. Si aparece, el respaldo es una regla :root.rot .screen.blur{backdrop-filter:none;background:rgba(6,9,15,.9)}.
- Un envoltorio girado a pantalla completa con hijos desenfocados es una capa compuesta grande. No poner will-change:transform en el escenario: el transform solo cambia al girar, y dejarlo promocionado permanentemente cuesta memoria de GPU en gamas bajas sin ganar nada.
- El orden de los listeners. Si world.resize() se engancha a resize por su cuenta (main.js:118) y layoutStage tambien, gana el orden de registro y el renderer puede medir el escenario con el tamano viejo. Un unico camino: layoutStage avisa por callback.

### verify

- Construir y comprobar el DOM del bundle: node build.mjs && grep -c 'id="stage"' index.html debe dar 1, y grep -c ':root.rot' index.html debe dar 1. Si el marcador se pierde el juego arranca sin girar y en silencio.
- Playwright, vertical: chromium.launch(), newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true }) — hasTouch pone maxTouchPoints>0 y isMobile pone pointer:coarse, que es lo que exige coarse(). Cargar index.html?debug=1 y comprobar: document.documentElement.classList.contains('rot') === true; getComputedStyle(stage).transform === 'matrix(0, 1, -1, 0, 390, 0)'; y la asercion que lo resume todo, stage.getBoundingClientRect() estrictamente igual a {x:0,y:0,width:390,height:844} — si el transform-origin o el orden estan mal, este rect se va y no hay forma de que pase por casualidad.
- Playwright, horizontal: mismo contexto con viewport 844x390. classList NO contiene 'rot', transform === 'matrix(1, 0, 0, 1, 0, 0)' (identidad, que confirma que no se escribio none) y un hijo position:fixed;inset:0 del escenario sigue midiendo 844x390 — prueba de que el bloque contenedor no cambia con la orientacion.
- Relacion de aspecto del renderer: en vertical, window.__rr.world.renderer.getSize(new THREE.Vector2()) debe dar 844x390 y __rr.world.camera.aspect debe ser > 1 y valer 844/390 con un margen de 0.01. Es la comprobacion directa de 'la moto mal ubicada': si aspect < 1 el mundo va aplastado. Repetir tras page.setViewportSize para 844x390 y comprobar 844x390 / mismo aspect.
- Remapeo de safe-area sin muesca real: page.addStyleTag({ content: ':root.rot{--sat:44px;--sar:34px}' }) y leer los estilos calculados. Comprobado que funciona: #hudtop top pasa a 53px (9+44) y #speedo right a 48px (14+34). Si el CSS siguiera con env() directo, ambos se quedarian en 9px y 14px. La misma prueba en horizontal, con :root{--sat:44px}, debe dar 53px tambien: la variable esta declarada en los dos casos.
- Que --vw se refiera al escenario: en vertical, getComputedStyle(documentElement).getPropertyValue('--vw').trim() === '8.44px' (844/100), y en horizontal 8.44px tambien (844/100). Y que llegue al consumidor: getComputedStyle(document.querySelector('.panel')).width === '460px' en vertical, que es min(94*8.44=793px, 460px) — con vw nativo saldria min(366px,460px)=366px, un panel visiblemente estrecho.
- Direccion del dedo con la pantalla girada: __rr.game.start('day'), despues page.touchscreen no permite arrastrar, asi que hay que despachar pointerdown/pointermove/pointerup con clientX/clientY explicitos sobre #gl. Con el escenario girado, mover el dedo HACIA ABAJO fisicamente (clientY creciente) es hacia la derecha en el juego: tras el arrastre, __rr.controls.input.steer debe ser > 0. El mismo gesto en horizontal debe dar steer ~ 0 (ahi lo que gira es clientX). Es la prueba de que mapPointer y el transform son inversos de verdad.
- Que no haya cartel: await page.locator('text=/gira|rota|rotate|landscape|horizontal/i').count() === 0 con el juego en vertical, y ninguna pantalla visible mas alla de la esperada.
- Reintentos tras el giro: page.setViewportSize de 390x844 a 844x390 y volver, con un contador instrumentado en layoutStage. La guarda de igualdad debe hacer que los cuatro setTimeout no reescriban nada: el numero de veces que se escribe stage.style.transform tiene que ser 1 por cambio real de orientacion, no 5.
- Bloqueo de orientacion, que falle en silencio: page.on('pageerror') y page.on('console') recogiendo errores, pulsar el boton de jugar en un contexto sin permiso de pantalla completa, y comprobar que no se registra ni un error ni un unhandled rejection y que el juego entra a conducir igualmente (__rr.game.mode === 'play').

## Direccion por giroscopio en movil (src/controls.js): reconstruccion de la gravedad desde DeviceOrientationEvent, signo del alabeo, calibracion, permiso iOS, respaldo devicemotion, curva de respuesta y verificacion sin telefono

### area

Direccion por giroscopio en movil (src/controls.js): reconstruccion de la gravedad desde DeviceOrientationEvent, signo del alabeo, calibracion, permiso iOS, respaldo devicemotion, curva de respuesta y verificacion sin telefono

### diagnosis

VEREDICTO SOBRE LA TESIS: la tesis es CORRECTA en su nucleo (el alabeo sobre la normal de la pantalla es el observable correcto y es invariante frente a la rotacion del contenido por CSS), pero la IMPLEMENTACION tiene el signo mal, y por eso el jugador dice "controles en reversa". El defecto no depende de la orientacion: es un signo global.

1) BUG DE SIGNO — src/controls.js:116
`const gx = -Math.cos(B) * Math.sin(G);`
La reconstruccion correcta de la direccion "abajo" en los ejes del aparato, a partir del orden intrinseco Z-X'-Y'' del spec (R = Rz(alpha)·Rx(beta)·Ry(gamma), aparato -> tierra ENU; abajo_aparato = R^T·(0,0,-1) = -(tercera fila de R)) es:
  gx = +cos(beta)·sin(gamma)
  gy = -sin(beta)
  gz = -cos(beta)·cos(gamma)
Comprobado con 300.000 triples aleatorios: error maximo 0.00e+0 frente a R^T·(0,0,-1). La linea 117 (`gy = -Math.sin(B)`) SI es correcta, de modo que el error no es un cambio de signo global del vector (que seria inocuo, ver punto 6) sino un ESPEJO en X. Como roll = atan2(gx, -gy), el alabeo sale exactamente negado: roll_codigo = -roll_real en toda postura. Medido en Chromium headless con CDP: inclinar 20 grados en sentido horario da steer = -0.822 (IZQUIERDA) con el codigo actual, y +0.815 (DERECHA) con gx corregido. Igual en vertical, en horizontal y con la pagina rotada por CSS.

2) TODO EL MODULO ES CODIGO MUERTO. src/main.js no importa './controls.js' en ninguna linea, y src/game.js:37 sigue llamando `this.installInput(world.canvas)` (metodo en game.js:41-68) y leyendo su propio `this.keys` / `this.drag` en game.js:193-208. Ningun arreglo del giroscopio llega a la fisica hasta que game.js lea `input`. Ademas game.js:209 (`if (state.invert) steer = -steer;`) actua sobre una variable ya consumida en la linea 205: el ajuste "Invertir giro" no hace nada hoy, asi que el jugador con los controles al reves no tiene ni escape manual.

3) `state.scheme` NO EXISTE en src/state.js:29-40 (DEFAULTS). controls.js:214 evalua `SCHEMES.includes(state.scheme)` -> false -> `defaultScheme()`. Y como state.js:50 copia solo claves ya presentes (`for (const k in state) if (k in s)`), aunque la UI escriba `state.scheme` no se persistira nunca. La eleccion de esquema del jugador se pierde en cada recarga.

4) CALIBRACION FRAGIL — controls.js:126 `if (gyro.zero === null) gyro.zero = roll;`. El cero se toma de UNA sola lectura, y esa lectura llega mientras el dedo del jugador todavia esta sobre el boton, con el movil en una postura cualquiera (a menudo casi plano, donde el alabeo es ruido amplificado por 1/|g_plano|). Un cero mal tomado desplaza el centro y, si el desplazamiento pasa de 90 grados, el mando se siente invertido aunque el signo sea correcto.

5) EL CERO NO SE RETOMA AL CAMBIAR LA PRESENTACION — controls.js:45-67 `layoutStage()` conmuta `rotated` y la transformacion CSS, pero no toca `gyro.zero`. Demostrado analitica y numericamente: con `rotate(90deg)` el alabeo en el marco de la IMAGEN es roll_imagen = roll_aparato + 90 exactos (pendiente +1, solo desplazamiento). Ese +90 lo absorbe el cero, pero la postura neutra del jugador tambien ha girado 90 grados, asi que hay que recalibrar en el instante en que `rotated` cambia. Si no, al quitar el bloqueo de rotacion el mando se vuelve perpendicular.

6) EL MOVIL PLANO CONGELA LA DIRECCION — controls.js:123 `if (gyro.flat < 0.18) return;` sale sin tocar `gyro.raw`, asi que el ultimo alabeo se queda pegado. Si el jugador tumba el movil a tope de giro, la moto se queda a tope de giro indefinidamente.

7) NO HAY DETECCION DE "CONCEDIDO PERO SIN LECTURAS". controls.js:113 descarta las lecturas con beta/gamma nulos sin contarlas, y `gyro.available` (linea 119) solo se pone a true cuando ya hay datos, asi que no se distingue "escritorio que emite eventos vacios" de "iframe sin allow=gyroscope que no emite NADA". controls.js:217 (`if (s === 'tilt' && !gyro.active) return 'touch'`) degrada al arrastre en silencio; eso es exactamente el sintoma "interfaz vertical cuando quiero giroscopio para jugar": el jugador pide inclinacion y el juego se queda con el arrastre sin decir por que. Peor: `gyro.active` puede caerse durante la partida (movil plano un instante) y el esquema cambia EN MEDIO de la carrera.

8) `state.sens` SE APLICA DOS VECES DE FACTO — controls.js:257 multiplica la salida ya conformada por la curva (`steer * state.sens`). Con sens=2 la salida se satura a 11 grados pero la zona muerta sigue en 1,6 grados y la region de control fino queda comprimida: la curva deja de ser la curva. La sensibilidad debe escalar el ANGULO (TILT_FULL), no la salida.

9) template.html no tiene el elemento envoltorio que `setStage()` espera, ni la clase `.rot`, ni los botones de pedales que `bindPedals` bindea. Es area de otro agente, pero `layoutStage()` y `stageSpin()` no pueden funcionar sin el.

### recommendation

La tesis se confirma con dos argumentos independientes, y hay que corregir una sola linea de signo.

PRIMERO, POR QUE EL ALABEO ES INVARIANTE FRENTE A LA ROTACION POR CSS. Rotar el contenido por CSS es una rotacion en el PLANO de la pantalla, es decir alrededor del mismo eje sobre el que se mide el alabeo (la normal de la pantalla). Dos rotaciones alrededor de un eje comun conmutan y conservan la orientacion, asi que el cambio de marco solo puede anadir una constante. Con `transform: rotate(90deg)` (que en CSS es horario, porque el eje Y apunta hacia abajo) el "arriba" de la imagen pasa a ser el borde DERECHO del aparato y la "derecha" de la imagen el borde INFERIOR; midiendo el alabeo en ese marco sale roll_imagen = atan2(-gy, -gx) = roll_aparato + 90, exacto para todo alabeo (medido: -30 -> 60, -10 -> 80, 0 -> 90, +10 -> 100, +30 -> 120; diferencia constante 90,0). Pendiente +1: el SENTIDO se conserva. La constante la borra el cero de calibracion. Por tanto "horario visto por el jugador = derecha" vale en vertical, en horizontal y con la pagina rotada, con la misma formula y sin consultar screen.orientation.

SEGUNDO, POR QUE ELEGIR ENTRE BETA Y GAMMA ES PEOR DE LO QUE SUGIERE LA TESIS. No falla solo porque screen.orientation mienta con la pagina rotada por CSS; falla incluso conociendo la orientacion, por dos razones cuantificadas:
 (a) Con el movil casi vertical, gamma se clava en ±90 y deja de contener el alabeo. Medido con el movil exactamente vertical (cabeceo 90): alabeo -1 grado -> gamma = -90; alabeo 0 -> gamma = 0; alabeo +1 -> gamma = +90. gamma da un salto de 180 grados alrededor del cero, alpha salta ±90 y beta se vuelve 90-|alabeo|, es decir una "V" no monotona que no distingue izquierda de derecha. La reconstruccion, en cambio, entrega (sin phi, -cos phi, 0), perfectamente suave: salto maximo del vector 3,5e-4 por paso de 0,02 grados frente a 177,5 grados de salto en alpha/gamma.
 (b) Aun lejos de la singularidad, la ganancia de gamma respecto al alabeo real depende del cabeceo: gamma/phi = 1,53 con el movil a 60 grados, 2,16 a 70, 3,14 a 80 y 4,50 a 90 (para phi=20; para phi=5 llega a 18). Un mando basado en gamma cambia de sensibilidad segun como sostenga el jugador el telefono. La reconstruccion recupera el alabeo EXACTO para cualquier cabeceo entre 5 y 90 grados (comprobado: -40,-20,-5,0,5,20,40 devueltos con error nulo).

LA DEGENERACION DE EULER: se rompe SOLO la continuidad de los angulos, no la del vector. El alabeo depende unicamente de la parte en el plano (gx, gy) = (cos beta·sin gamma, -sin beta), y esa pareja es invariante bajo la ambiguedad de la representacion (beta, gamma) -> (180-beta, -gamma) que es precisamente la que aparece en gamma = ±90 (diferencia maxima medida 1,3e-15; solo gz cambia de signo, y el alabeo no usa gz). Prueba empirica independiente y muy limpia: al emular la postura que yo construi como (beta=70, gamma=+90), Chrome REPORTA (beta=110, gamma=-90) — la otra rama — y el alabeo reconstruido sale identico, +20,0. Y ojo al detalle demoledor: "20 grados horario" da beta=110 gamma=-90 y "20 grados antihorario" da beta=70 gamma=-90; el MISMO gamma para alabeos opuestos. Cualquier mando que lea gamma da la misma direccion para las dos inclinaciones contrarias.

LO QUE SI HAY QUE ANADIR A LA TESIS. La invariancia es del SENTIDO, no del cero. Como la constante que introduce la presentacion es exactamente ±90 grados, y como el cero mal tomado por encima de 90 grados de error se siente como inversion, la calidad del mando depende por completo de la calibracion: hay que tomar el cero como media CIRCULAR de una ventana corta con el jugador ya en su postura, y retomarlo cuando cambie la presentacion, cuando la pagina vuelva de segundo plano y cuando cambie la fuente de datos. Ademas, con `rotate(90deg)` fijo solo UNA de las dos formas de sostener el movil en horizontal deja la imagen derecha (la imagen sale bien cuando el borde derecho del aparato apunta arriba, es decir con el alabeo cerca de -90); el propio giroscopio debe elegir entre `rotate(90deg)` y `rotate(-90deg)`, y eso ataca de raiz "que este girado 90 grados... sino que ya este rotado" sin cartel de "gira el movil" y sin salir al reves para el jugador que gira el telefono al otro lado.

SOBRE EL RESPALDO devicemotion. El signo invertido de iOS en accelerationIncludingGravity es real y esta documentado desde hace anos (Safari entrega el vector de gravedad, el resto de navegadores la fuerza especifica, que es la opuesta), pero para este mando ES IRRELEVANTE, y esa es la conclusion util: cambiar el signo de (x, y) desplaza el alabeo 180 grados EXACTOS, no lo refleja (comprobado: |atan2(-x,y) - atan2(x,-y) - 180| < 2,9e-14), y ese desplazamiento constante lo cancela el cero de calibracion (|raw_spec - raw_iOS| < 1,2e-13 tras restar un cero tomado con la MISMA convencion). Conclusion: el respaldo conviene, se implementa sin oler el user agent y sin detectar signos; la unica regla obligatoria es no MEZCLAR fuentes con un mismo cero, es decir invalidar el cero cuando la fuente cambia de 'orientation' a 'motion'. El respaldo vale para WebViews de Android donde deviceorientation no llega y como sonda de vitalidad; en iOS no aporta signo porque el permiso de movimiento es uno solo para los dos eventos.

CURVA, ZONA MUERTA Y SUAVIZADO. La curva actual (0,62·m² + 0,38·m sobre m = (|grados|-muerta)/(tope-muerta)) esta bien elegida y hay que conservarla: da 1,9% de tope por grado cerca del centro, que con el temblor de mano residual (~0,5 grados tras filtrar) deja un ruido de direccion del 1%, o 0,06 m/s de deriva lateral, o ~1 cm de vagabundeo — invisible. El tope de 22 grados tambien esta justificado por la propia fisica del juego: en game.js:231 maxLat cae a ~6,2 m/s a 200 km/h y un carril mide 3,6 m (world.js:16-18), asi que cambiar de carril exige tope de giro de forma rutinaria; un tope mas pequeno hace el juego nervioso y uno mas grande obliga a mover los brazos. Lo que hay que cambiar: la zona muerta debe ESCALAR con 1/|g_plano|, porque el error de alabeo se amplifica exactamente por ese factor (1,15x a 60 grados de cabeceo, 2,00x a 30, 5,54x a 10,4); y el suavizado debe quedarse LIGERO (16/s, tau=62 ms) porque el retardo dominante ya lo pone la fisica: game.js:233 limita la aceleracion lateral a 22 m/s², de modo que ir de 0 a maxLat tarda ~273 ms. Anadir un filtro de dos polos en la entrada es gastar presupuesto de latencia donde no hace falta; en su lugar, mediana de 3 por componente (un fotograma, ~16 ms) para matar la muestra suelta de basura, y suavizado asimetrico (22/s volviendo al centro, 16/s saliendo) para que corregir sea mas nitido que provocar.

### code

## 1) src/controls.js — sustituir el bloque de constantes (lineas 17-34)

```js
/* Angulo de inclinacion que equivale a tope de giro. 22 grados es lo que se alcanza
   girando las munecas sin mover los brazos; mas obliga a inclinar el movil hasta perder
   de vista la pantalla. Ademas la fisica lo exige: a 200 km/h maxLat cae a ~6 m/s y un
   carril mide 3,6 m, asi que el tope de giro se usa de forma rutinaria. */
const TILT_FULL = 22;
const TILT_DEAD = 2.0;          // zona muerta base en grados: sin ella la moto vibra sola
const TILT_DEAD_MAX = 6.0;      // techo de la zona muerta con el movil casi plano
const TILT_SMOOTH_OUT = 16;     // suavizado saliendo del centro, por segundo
const TILT_SMOOTH_IN  = 22;     // volviendo al centro: corregir debe ser mas nitido
const FLAT_MIN = 0.18, FLAT_OK = 0.30;   // histeresis de confianza del alabeo
const ZERO_MS = 350;            // ventana para tomar el centro
const ZERO_SPREAD = 14;         // dispersion maxima admitida en esa ventana, en grados
const GLITCH_DPS = 600;         // por encima de esto no es un gesto, es un fallo del sensor
const WATCHDOG_MS = 1500;       // permiso concedido pero sin lecturas
const DEG = Math.PI / 180;

export const input = { throttle:0, brake:0, steer:0, horn:false, tiltDeg:0 };

/* source: de donde salen las lecturas; el cero NO es intercambiable entre fuentes.
   perm:   'unknown' | 'granted' | 'denied' | 'need-gesture' | 'unsupported'
   blocked: no llega ni un evento -> Permissions-Policy (iframe sin allow=gyroscope) */
const gyro = { source:null, perm:'unknown', listening:false, motionOn:false,
  events:0, nulls:0, blocked:false, dead:false, live:false,
  flat:0, conf:0, roll:0, raw:0, zero:null, zeroAcc:null,
  hx:[0,0,0], hy:[0,0,0], n:0, t:0, wd:0, wd2:0 };
let gyroSteer = 0;
let keySteer = 0;
let spinLast = 90;              // sentido de la rotacion CSS elegido por el giroscopio
let stage = null;
let rotated = false;
const keys = new Set();
let touchSteer = 0;
let btnSteer = 0;
const pedal = { gas:false, brake:false, horn:false };
```

## 2) src/controls.js — sustituir TODO el bloque "giroscopio" (lineas 78-132)

```js
/* ---------- giroscopio ---------- */

export const gyroAvailable = () => gyro.events > 0 || gyro.nulls > 0;
export const gyroLive = () => gyro.live;
/** Para que la interfaz pueda decir POR QUE no hay inclinacion en vez de degradar en
    silencio al arrastre, que es lo que hace que el jugador crea que no hay giroscopio. */
export const gyroStatus = () => gyro.live ? 'ok'
  : gyro.perm === 'denied' ? 'denied'
  : gyro.perm === 'need-gesture' ? 'gesture'
  : gyro.perm === 'unsupported' ? 'unsupported'
  : gyro.blocked ? 'blocked'
  : gyro.dead ? 'silent' : 'waiting';

const wrap180 = a => { a = (a + 180) % 360; return (a < 0 ? a + 360 : a) - 180; };
const med3 = (a, b, c) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
const nowMs = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

/* La direccion se saca del ALABEO del aparato sobre la NORMAL de la pantalla, nunca de
   beta ni de gamma por separado, por tres razones medidas:

   1. Con el movil casi vertical gamma se clava en ±90 y da un salto de 180 grados al
      cruzar el cero: gamma vale -90 tanto para 20 grados horario como para 20 grados
      antihorario. beta se vuelve 90-|alabeo|, una "V" que no distingue lado.
   2. Aun lejos de esa singularidad, la ganancia gamma/alabeo depende del cabeceo:
      1,53 a 60 grados, 2,16 a 70, 3,14 a 80. La sensibilidad cambiaria segun como
      sostenga el movil el jugador.
   3. Con la pagina rotada por CSS el navegador sigue diciendo "vertical", asi que
      cualquier decision basada en screen.orientation sale al reves.

   El alabeo no tiene ninguno de esos problemas: rotar el contenido por CSS es una
   rotacion alrededor del MISMO eje sobre el que se mide, luego conmuta y conserva la
   orientacion; solo anade una constante (exactamente +90 con rotate(90deg)) y esa
   constante la borra el cero de calibracion. Inclinar en sentido horario es girar a la
   derecha en vertical, en horizontal y con la pagina rotada. */

/** Direccion "abajo" en los ejes del aparato (x derecha, y arriba, z sale de pantalla),
    a partir de los angulos de Euler del spec en orden intrinseco Z-X'-Y'':
      R = Rz(alpha)·Rx(beta)·Ry(gamma)   (aparato -> tierra, Z arriba)
      abajo = R^T·(0,0,-1) = -(tercera fila de R) = (cosB·sinG, -sinB, -cosB·cosG)
    alpha no aparece: es un giro alrededor de la vertical y no puede cambiar donde cae la
    gravedad respecto al aparato. Solo se usa la parte EN EL PLANO de la pantalla, que es
    invariante bajo la ambiguedad (beta,gamma)->(180-beta,-gamma) de gamma=±90. */
function onOrient(e){
  if (e.beta === null && e.gamma === null){ gyro.nulls++; return; }
  const B = (e.beta || 0) * DEG, G = (e.gamma || 0) * DEG;
  feed(Math.cos(B) * Math.sin(G), -Math.sin(B), 'orientation');
}

/* Respaldo. El signo de accelerationIncludingGravity NO esta acordado: iOS entrega el
   vector de gravedad y el resto la fuerza especifica, que es la opuesta. Da exactamente
   igual: cambiar el signo de (x,y) desplaza el alabeo 180 grados, no lo refleja, y ese
   desplazamiento constante lo cancela el cero. Lo unico prohibido es reutilizar un cero
   tomado con la otra fuente, y de eso se encarga feed(). Por eso aqui no se huele el
   user agent ni se detecta ningun signo. */
function onMotion(e){
  const a = e.accelerationIncludingGravity;
  if (!a || a.x === null || a.y === null) return;
  const k = -1 / 9.80665;
  feed(a.x * k, a.y * k, 'motion');
}

function feed(gx, gy, source){
  const t = nowMs();
  if (source !== gyro.source){        // cambiar de fuente invalida el cero, sin excepcion
    gyro.source = source;
    gyro.zero = null; gyro.zeroAcc = null; gyro.n = 0; gyro.raw = 0;
  }
  gyro.events++;
  gyro.flat = Math.hypot(gx, gy);
  /* El alabeo se define con la componente de la gravedad EN el plano de la pantalla. Con
     el movil casi plano esa componente tiende a cero y el angulo pasa a ser ruido
     amplificado por 1/|g_plano| (5,5x a 10 grados del plano). Se pondera en vez de
     descartar la lectura, que es lo que congelaba la direccion. */
  gyro.conf = clamp((gyro.flat - FLAT_MIN) / (FLAT_OK - FLAT_MIN), 0, 1);

  // mediana de 3 por componente: mata la muestra suelta de basura que llega al conceder
  // el permiso y al volver de segundo plano, y solo cuesta un fotograma
  gyro.hx[gyro.n % 3] = gx; gyro.hy[gyro.n % 3] = gy; gyro.n++;
  if (gyro.n < 3) return;
  const mx = med3(gyro.hx[0], gyro.hx[1], gyro.hx[2]);
  const my = med3(gyro.hy[0], gyro.hy[1], gyro.hy[2]);
  const mag = Math.hypot(mx, my);
  if (mag < 1e-4) return;
  gyro.roll = Math.atan2(mx, -my) / DEG;

  /* Cero: media CIRCULAR de una ventana corta, no la primera lectura. La primera lectura
     llega con el dedo todavia en el boton y el movil en cualquier postura; un cero
     desviado mas de 90 grados hace que el mando se sienta invertido aunque el signo este
     bien. Si el jugador se movia demasiado durante la ventana, se descarta y se reintenta. */
  if (gyro.zero === null){
    if (gyro.conf < 1) return;                       // no se calibra con el movil plano
    const z = gyro.zeroAcc || (gyro.zeroAcc = { x:0, y:0, n:0, t0:t });
    z.x += mx / mag; z.y += my / mag; z.n++;
    if (t - z.t0 < ZERO_MS) return;
    gyro.zeroAcc = null;
    // longitud resultante media: 1 si estaba quieto, cos(dispersion) si temblaba
    if (Math.hypot(z.x, z.y) / z.n < Math.cos(ZERO_SPREAD * DEG)) return;
    gyro.zero = Math.atan2(z.x, -z.y) / DEG;
  }

  let raw = wrap180(gyro.roll - gyro.zero);
  // limite de velocidad angular: un salto imposible es un fallo del sensor, no un gesto
  const dt = Math.max(1e-3, (t - (gyro.t || t)) / 1000);
  const step = wrap180(raw - gyro.raw), cap = GLITCH_DPS * dt;
  if (Math.abs(step) > cap) raw = wrap180(gyro.raw + Math.sign(step) * cap);
  gyro.t = t; gyro.raw = raw; gyro.live = true; gyro.dead = false;
}

/** Debe llamarse DENTRO de un gesto del usuario y como PRIMERA instruccion del manejador:
    cualquier await previo consume la activacion y Safari responde NotAllowedError.
    Al recargar la pagina hay que volver a pedirlo; si ya estaba concedido resuelve
    'granted' sin ensenar nada. Nunca llamarlo fuera de un gesto: el rechazo envenena la
    carga de pagina entera. */
export async function enableGyro(){
  const DOE = window.DeviceOrientationEvent;
  if (!DOE){ gyro.perm = 'unsupported'; return false; }
  if (typeof DOE.requestPermission === 'function'){
    let r;
    // el spec distingue los dos fracasos: sin gesto RECHAZA la promesa, denegar por el
    // jugador la RESUELVE con 'denied'. Solo el primero se puede reintentar al toque siguiente.
    try { r = await DOE.requestPermission(); }
    catch (e) { gyro.perm = 'need-gesture'; return false; }
    if (r !== 'granted'){ gyro.perm = 'denied'; return false; }
  }
  gyro.perm = 'granted';
  if (!gyro.listening){
    gyro.listening = true;
    addEventListener('deviceorientation', onOrient, { passive:true });
  }
  calibrateGyro();
  armWatchdog();
  return true;
}

/* En iOS el permiso de DeviceOrientationEvent y el de DeviceMotionEvent son EL MISMO
   ("Movimiento y orientacion"), asi que aqui no hay que volver a pedir nada. */
function tryMotion(){
  if (gyro.motionOn || !window.DeviceMotionEvent) return;
  gyro.motionOn = true;
  addEventListener('devicemotion', onMotion, { passive:true });
}

/** Concedido pero sin lecturas. Se distinguen dos casos que se arreglan de forma distinta:
    llegan eventos con beta/gamma nulos (escritorio sin sensores) frente a no llega ni un
    evento, que es lo que hace un iframe sin allow="accelerometer; gyroscope" — Chrome no
    entrega nada y no existe API para preguntarlo. */
function armWatchdog(){
  clearTimeout(gyro.wd); clearTimeout(gyro.wd2);
  gyro.wd = setTimeout(() => {
    if (gyro.live) return;
    gyro.blocked = gyro.events === 0 && gyro.nulls === 0;
    tryMotion();
    gyro.wd2 = setTimeout(() => { if (!gyro.live) gyro.dead = true; }, WATCHDOG_MS);
  }, WATCHDOG_MS);
}

/** Vuelve a tomar la postura actual como centro. Obligatorio al empezar la partida, al
    cambiar la presentacion (rotacion CSS), al volver de segundo plano y al pulsar CENTRAR. */
export function calibrateGyro(){
  gyro.zero = null; gyro.zeroAcc = null; gyro.raw = 0; gyro.n = 0; gyroSteer = 0;
}

/** Con la pantalla bloqueada en vertical el juego se presenta rotado por CSS, pero HAY DOS
    formas de sostener el movil en horizontal y solo una coincide con rotate(90deg): esa
    transformacion pone el "arriba" de la imagen en el borde DERECHO del aparato, luego la
    imagen sale derecha cuando ese borde apunta al cielo, es decir con el alabeo cerca de
    -90. Si el jugador gira al otro lado, la imagen sale boca abajo. El giroscopio decide. */
export function stageSpin(){
  if (gyro.live && gyro.flat >= FLAT_OK){
    if (gyro.roll < -35) spinLast = 90;
    else if (gyro.roll > 35) spinLast = -90;
  }
  return spinLast;
}

export const gyroDebug = () => ({ ...gyro, steer:gyroSteer, rotated, spin:spinLast });
```

## 3) src/controls.js — layoutStage y mapPointer con los dos sentidos (sustituye 45-76)

```js
export function layoutStage(){
  if (!stage) return { w:innerWidth, h:innerHeight };
  const portrait = innerHeight > innerWidth;
  const spin = portrait ? stageSpin() : 0;
  const changed = (portrait !== rotated) || (portrait && spin !== stage.__spin);
  rotated = portrait;
  stage.__spin = spin;
  if (portrait){
    stage.style.width = innerHeight + 'px';
    stage.style.height = innerWidth + 'px';
    /* Origen en 0,0: rotate(90deg) manda el contenido fuera por la izquierda y
       translateX lo devuelve; rotate(-90deg) lo manda por arriba y hace falta translateY.
       El translate va PRIMERO en la lista porque las transformaciones se leen de derecha
       a izquierda: primero gira, despues se desplaza. */
    stage.style.transform = spin > 0
      ? 'translateX(' + innerWidth + 'px) rotate(90deg)'
      : 'translateY(' + innerHeight + 'px) rotate(-90deg)';
  } else {
    stage.style.width = innerWidth + 'px';
    stage.style.height = innerHeight + 'px';
    stage.style.transform = 'none';
  }
  document.documentElement.classList.toggle('rot', portrait);
  /* El alabeo conserva el sentido al rotar el contenido, pero la postura NEUTRA del
     jugador tambien gira 90 grados: sin retomar el cero el mando queda perpendicular. */
  if (changed) calibrateGyro();
  return { w: stage.clientWidth, h: stage.clientHeight };
}

export function mapPointer(e){
  if (!rotated) return { x:e.clientX, y:e.clientY };
  return stage && stage.__spin < 0
    ? { x: innerHeight - e.clientY, y: e.clientX }        // rotate(-90deg) translateY(H)
    : { x: e.clientY, y: innerWidth - e.clientX };        // rotate(90deg)  translateX(W)
}
```

## 4) src/controls.js — esquema activo y update() (sustituye 211-263)

```js
/** El esquema activo. La degradacion al arrastre solo ocurre cuando el giroscopio esta
    declarado MUERTO por el watchdog, nunca porque una lectura suelta sea poco fiable: un
    cambio de esquema en mitad de la carrera es peor que un instante sin direccion. */
export function activeScheme(){
  const s = SCHEMES.includes(state.scheme) ? state.scheme : defaultScheme();
  if (s === 'tilt' && gyro.dead) return 'touch';
  return s;
}

export function update(dt){
  const pad = padState();

  let throttle = pedal.gas ? 1 : 0;
  let brake = pedal.brake ? 1 : 0;
  if (keys.has('ArrowUp') || keys.has('KeyW')) throttle = 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) brake = 1;
  if (pad){ throttle = Math.max(throttle, pad.throttle); brake = Math.max(brake, pad.brake); }

  const scheme = activeScheme();

  if (gyro.live && gyro.conf > 0){
    /* La sensibilidad escala el ANGULO, no la salida: multiplicar la salida deforma la
       curva y deja la zona muerta descolocada. */
    const full = clamp(TILT_FULL / (state.sens || 1), 10, 40);
    /* La zona muerta crece con 1/|g_plano| porque ahi el error de alabeo se amplifica
       por ese mismo factor: 1,15x a 60 grados de cabeceo, 2,00x a 30, 5,5x a 10. */
    const dead = clamp(TILT_DEAD / Math.max(0.35, gyro.flat), TILT_DEAD, TILT_DEAD_MAX);
    const mag = clamp((Math.abs(gyro.raw) - dead) / Math.max(4, full - dead), 0, 1);
    // mas resolucion en el centro, para colocarse en el carril
    const target = Math.sign(gyro.raw) * (mag * mag * 0.62 + mag * 0.38) * gyro.conf;
    // volver al centro mas rapido que salir: corregir un error debe sentirse nitido
    const k = Math.abs(target) < Math.abs(gyroSteer) ? TILT_SMOOTH_IN : TILT_SMOOTH_OUT;
    gyroSteer += (target - gyroSteer) * (1 - Math.exp(-k * dt));
  } else {
    // sin lectura fiable se vuelve al centro; congelar el ultimo alabeo dejaba la moto
    // a tope de giro si el jugador tumbaba el movil
    gyroSteer *= Math.exp(-6 * dt);
  }

  let steer = scheme === 'tilt' ? gyroSteer
            : scheme === 'buttons' ? btnSteer
            : touchSteer * (state.sens || 1);

  /* Teclado y mando pisan cualquier esquema, para que el escritorio siempre funcione. El
     rampeo del teclado vive AQUI porque game.js ya no tiene entrada propia. */
  let kb = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kb -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kb += 1;
  if (kb) keySteer = clamp(keySteer + kb * dt * 5, -1, 1);
  else keySteer *= Math.exp(-6 * dt);
  if (Math.abs(keySteer) > 0.002) steer = keySteer;
  else if (pad && pad.steer) steer = pad.steer;

  /* La inversion se aplica AQUI, sobre el valor final. Antes se aplicaba a una variable
     intermedia ya consumida (game.js:205 y 209), asi que el ajuste no hacia nada y no
     habia forma de corregir unos controles al reves. Es la unica valvula de escape para
     un aparato exotico, asi que tiene que funcionar. */
  if (state.invert) steer = -steer;

  input.throttle = clamp(throttle, 0, 1);
  input.brake = clamp(brake, 0, 1);
  input.steer = clamp(steer, -1, 1);
  input.horn = pedal.horn || keys.has('KeyH');
  input.tiltDeg = gyro.live ? gyro.raw : 0;

  if (scheme === 'touch' && !kb) touchSteer *= Math.exp(-5 * dt);
}
```

## 5) src/state.js:29-40 — anadir la clave o no se persiste nunca

```diff
 const DEFAULTS = () => ({
   lang: null,                  // null -> se pregunta al primer arranque
   quality: null,               // null -> se pregunta al primer arranque
   music: 0.5, sfx: 0.85,
-  haptics: true, invert: false, sens: 1,
+  haptics: true, invert: false, sens: 1,
+  /* null -> lo decide defaultScheme() en cada arranque; load() solo copia claves que ya
+     existen en state, asi que sin declararla aqui la eleccion del jugador se pierde. */
+  scheme: null,
   cash: 0, distanceTotal: 0,
```

Y en `wipe()` (state.js:65) anadir `scheme:state.scheme` a `keep`: borrar el progreso no debe cambiarle el mando al jugador.

## 6) src/main.js — cablear la entrada y pedir el permiso dentro del gesto

```diff
 import { World } from './world.js';
 import { Game } from './game.js';
 import { UI } from './ui.js';
+import * as controls from './controls.js';
```
```diff
   const ride = () => {
+    /* PRIMERO y sin ningun await delante: iOS exige que requestPermission salga del gesto
+       del usuario, y cualquier await previo consume la activacion. No se espera el
+       resultado: la carrera arranca igual y el watchdog decide si hay que degradar. */
+    if (state.scheme !== 'touch' && state.scheme !== 'buttons') controls.enableGyro();
     const envs = ['day', 'sunset', 'night'];
     game.start(envs[state.runs % envs.length]);
+    controls.calibrateGyro();       // el centro se toma con el jugador ya en su postura
     ui.show('game');
```
```diff
-    while (acc >= FIXED){ game.step(FIXED); acc -= FIXED; }
+    while (acc >= FIXED){ controls.update(FIXED); game.step(FIXED); acc -= FIXED; }
```
```diff
-  addEventListener('resize', () => world.resize(), { passive:true });
-  addEventListener('orientationchange', () => setTimeout(() => world.resize(), 150), { passive:true });
+  controls.install(canvas);
+  const relayout = () => { controls.layoutStage(); world.resize(); };
+  addEventListener('resize', relayout, { passive:true });
+  addEventListener('orientationchange', () => setTimeout(relayout, 150), { passive:true });
+  relayout();
   document.addEventListener('visibilitychange', () => {
     last = 0; acc = 0;
+    /* iOS corta las lecturas en segundo plano y al volver manda una rafaga con saltos:
+       el cero de antes ya no vale. */
+    if (!document.hidden) controls.calibrateGyro();
     if (document.hidden && game.mode === 'play') ui.h.onPause();
   });
```
Y en el gancho de pruebas (main.js:100) exponer el giroscopio: `window.__rr = { game, world, ui, state, audio, controls };`

## 7) src/game.js — minimo imprescindible (area de otro agente, pero sin esto lo anterior es codigo muerto)

```diff
-import { state, bikeStats, finishRun } from './state.js';
+import { state, bikeStats, finishRun } from './state.js';
+import { input } from './controls.js';
```
```diff
     this.pool = [];
-    this.installInput(world.canvas);
   }
-
-  /* ---------- entrada ---------- */
-  installInput(cv){ ...borrar el metodo completo, lineas 41-68... }
-  padState(){ ...borrar, lo hace controls.js... }
```
En `step()`, sustituir las lineas 193-209 por:
```js
    /* La entrada llega ya resuelta y suavizada: aqui no se decide nada sobre esquemas,
       inversion ni sensibilidad. */
    const throttle = input.throttle, brake = input.brake;
    this.steerInput = input.steer;
```
(el `Escape`/`KeyP`/`KeyH` de game.js:59-67 se queda; es control de flujo, no direccion)

## 8) template.html — indicador de inclinacion y boton CENTRAR

En el `<style>`, junto al HUD:
```css
  #tilt{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));
    transform:translateX(-50%);width:min(52vw,220px);height:4px;border-radius:99px;
    background:rgba(255,255,255,.14);opacity:0;transition:opacity .25s}
  #tilt.on{opacity:1}
  #tilt>i{position:absolute;top:-3px;left:50%;width:10px;height:10px;margin-left:-5px;
    border-radius:50%;background:var(--accent);box-shadow:0 0 10px rgba(255,106,26,.7)}
  #tilt:before{content:"";position:absolute;left:50%;top:-4px;width:1px;height:12px;
    background:rgba(255,255,255,.35)}
```
Dentro de `<div id="hud">`:
```html
    <div id="tilt"><i></i></div>
```
En la pantalla de ajustes, dos filas nuevas (las claves ya existen en i18n.js:37):
```html
        <div class="row"><span class="lb" data-i18n="set.scheme"></span><div class="seg" id="set-scheme"></div></div>
        <div class="row"><span class="lb" data-i18n="set.tilt"></span>
          <button class="btn ghost small" id="b-center" data-i18n="set.calibrate"></button></div>
```

En src/ui.js, dentro de `hud(d)`:
```js
    /* El indicador es la unica forma de que el jugador VEA que el signo es correcto: si
       la bolita va al lado contrario, un toque en "Invertir giro" lo arregla. */
    const tl = $('tilt');
    tl.classList.toggle('on', state.scheme !== 'touch' && state.scheme !== 'buttons');
    tl.firstElementChild.style.left = (50 + Math.max(-50, Math.min(50, d.steer * 50))) + '%';
```
(hay que pasar `steer: input.steer` en `pushHud()` de game.js:352)

## 9) tools/tilt-test.mjs — prueba del signo de un extremo a otro, sin telefono

```js
/* Verifica el SIGNO de la direccion por giroscopio en Chromium headless, sin telefono.
   Emulation.setDeviceOrientationOverride ya NO existe en el CDP actual: hay que usar el
   override de sensores generico, que alimenta el mismo camino que un movil real
   (AbsoluteOrientationSensor -> deviceorientation). */
import { chromium } from 'playwright';
const D = Math.PI / 180;

function quat(a, b, g){
  a *= D; b *= D; g *= D;
  const m = (p,q) => ({ w:p.w*q.w-p.x*q.x-p.y*q.y-p.z*q.z, x:p.w*q.x+p.x*q.w+p.y*q.z-p.z*q.y,
                        y:p.w*q.y-p.x*q.z+p.y*q.w+p.z*q.x, z:p.w*q.z+p.x*q.y-p.y*q.x+p.z*q.w });
  return m(m({x:0,y:0,z:Math.sin(a/2),w:Math.cos(a/2)}, {x:Math.sin(b/2),y:0,z:0,w:Math.cos(b/2)}),
             {x:0,y:Math.sin(g/2),z:0,w:Math.cos(g/2)});
}
/* Postura fisica -> (beta,gamma): cabeceo beta0 desde la horizontal y alabeo phi HORARIO
   visto por el jugador. g_plano = sin(beta0)·(sin phi, -cos phi), gz = -cos(beta0). */
function euler(beta0, phi){
  const s = Math.sin(beta0*D);
  const gx = s*Math.sin(phi*D), gy = -s*Math.cos(phi*D), gz = -Math.cos(beta0*D);
  const beta = Math.asin(Math.max(-1, Math.min(1, -gy))) / D;
  const cB = Math.cos(beta*D);
  return [0, beta, Math.atan2(gx/cB, -gz/cB) / D];
}

const b = await chromium.launch();
const ctx = await b.newContext({ permissions:['accelerometer','gyroscope','magnetometer'],
  viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
const p = await ctx.newPage();
await p.goto(process.env.URL || 'http://localhost:8090/index.html?debug=1');
const cdp = await ctx.newCDPSession(p);
const TYPES = ['absolute-orientation','relative-orientation'];
for (const type of TYPES)
  await cdp.send('Emulation.setSensorOverrideEnabled', { enabled:true, type, metadata:{ available:true } }).catch(()=>{});
const send = async (a,bb,g) => { const q = quat(a,bb,g);
  for (const type of TYPES) await cdp.send('Emulation.setSensorOverrideReadings', { type, reading:{ quaternion:q } }).catch(()=>{}); };
/* El emulador solo emite cuando la lectura CAMBIA; un movil real emite a 60 Hz. Se
   mantiene el flujo con un temblor minimo, que ademas es lo que hace un pulso humano. */
async function hold(beta0, phi, ms){
  const t0 = Date.now();
  while (Date.now() - t0 < ms){ await send(...euler(beta0, phi + (Math.random()-0.5)*0.35)); await p.waitForTimeout(16); }
}

await p.evaluate(() => window.__rr.controls.enableGyro());
let fail = 0;
for (const [nombre, beta0, neutro] of [['horizontal (pagina rotada por CSS)', 90, -90], ['vertical', 60, 0]]){
  await p.evaluate(() => window.__rr.controls.calibrateGyro());
  await hold(beta0, neutro, 700);
  for (const phi of [-20, -10, 10, 20]){
    await hold(beta0, neutro + phi, 300);
    const steer = await p.evaluate(() => { let s = 0;
      for (let i = 0; i < 24; i++){ window.__rr.controls.update(1/120); s = window.__rr.controls.input.steer; } return s; });
    const ok = Math.sign(steer) === Math.sign(phi) && Math.abs(steer) > 0.05;
    if (!ok) fail++;
    console.log(`${nombre} | ${String(phi).padStart(3)} grados horario+ -> steer=${steer.toFixed(3)} ${ok ? 'OK' : 'AL REVES'}`);
  }
}
// el movil tumbado no define alabeo: la direccion debe volver al centro, no congelarse
await hold(4, 0, 600);
const flat = await p.evaluate(() => { let s = 0;
  for (let i = 0; i < 96; i++){ window.__rr.controls.update(1/120); s = window.__rr.controls.input.steer; } return s; });
console.log('movil tumbado -> steer=' + flat.toFixed(3) + (Math.abs(flat) < 0.05 ? ' OK' : ' CONGELADO'));
if (Math.abs(flat) >= 0.05) fail++;
await b.close();
process.exit(fail ? 1 : 0);
```

## 10) src/i18n.js — claves que faltan (las demas ya estan en la linea 37)

Anadir a los cuatro idiomas, junto a `sch.nogyro`:
```js
    'sch.blocked':'El navegador no da acceso al sensor en esta pagina',
    'sch.gesture':'Toca de nuevo para permitir el sensor de movimiento',
    'sch.denied':'Permiso de movimiento denegado; se activa en Ajustes del sistema',
```

### constants

- **name**: gx (signo de la reconstruccion) — **value**: +cos(beta)·sin(gamma)  (hoy -cos·sin en src/controls.js:116) — **why**: Se deriva de abajo_aparato = R^T·(0,0,-1) = -(tercera fila de R) con R = Rz(alpha)Rx(beta)Ry(gamma). Comprobado con 300.000 triples aleatorios: error maximo 0,00e+0. Con el signo actual el alabeo sale exactamente negado y el mando va al reves en TODA postura (medido: 20 grados horario -> steer -0,822).
- **name**: TILT_FULL — **value**: 22 grados — **why**: Se conserva. La fisica lo exige: game.js:231 deja maxLat en ~6,2 m/s a 200 km/h y un carril mide 3,6 m (world.js:16-18), asi que el tope de giro se usa de forma rutinaria y un tope menor haria el juego nervioso. 22 grados es el recorrido de muneca sin mover los brazos ni perder de vista la pantalla.
- **name**: TILT_DEAD — **value**: 2.0 grados, escalada por 1/|g_plano| con techo 6.0 — **why**: El error de alabeo se amplifica exactamente por 1/|g_plano| (medido: 1,15x a 60 grados de cabeceo, 2,00x a 30, 2,92x a 20, 5,54x a 10,4), asi que la zona muerta tiene que seguir esa misma ley o la moto vibra sola cuando el jugador baja el movil. 2,0 grados es ~3 sigma del temblor de mano residual (~0,5 grados) en la postura normal; el techo de 6,0 evita que con el movil casi plano la zona muerta se coma el recorrido util.
- **name**: FLAT_MIN / FLAT_OK — **value**: 0.18 / 0.30 — **why**: |g_plano| = sin(cabeceo desde la horizontal), asi que 0,18 son 10,4 grados del plano (amplificacion 5,5x) y 0,30 son 17,5 grados (3,3x). Entre los dos la lectura se pondera en vez de descartarse; eso da histeresis y, sobre todo, evita el congelado de controls.js:123, que dejaba la moto a tope de giro si el jugador tumbaba el movil.
- **name**: TILT_SMOOTH_OUT / TILT_SMOOTH_IN — **value**: 16 / 22 por segundo — **why**: 16/s son 62 ms de constante de tiempo. El presupuesto de latencia ya lo consume la fisica: game.js:233 limita la aceleracion lateral a 22 m/s², asi que ir de 0 a maxLat tarda ~273 ms; anadir un filtro de dos polos en la entrada seria gastar donde no hace falta. 22/s volviendo al centro porque corregir un error debe sentirse mas nitido que provocarlo. La forma exp(-k·dt) es independiente de la cadencia, asi que funciona igual con el sensor a 20, 30 o 60 Hz y el paso fijo a 120 Hz de main.js:10.
- **name**: curva de respuesta — **value**: 0.62·m² + 0.38·m — **why**: Se conserva la del codigo actual. Da 0,38/(22-2) = 1,9% de tope por grado cerca del centro: con el temblor residual de ~0,5 grados el ruido de direccion es del 1%, o 0,06 m/s de deriva lateral, o ~1 cm de vagabundeo, invisible. Y al 50% de inclinacion entrega el 34,5% del tope, que es la resolucion fina que hace falta para colocarse entre dos coches (CLOSE_TIERS de game.js:20 empieza en 0,45 m de holgura).
- **name**: mediana de 3 — **value**: 3 muestras, por componente — **why**: Un fotograma de retardo (~16 ms a 60 Hz) y mata la muestra suelta de basura que llega justo al conceder el permiso en iOS y al volver de segundo plano. Se aplica a gx y gy por separado, no al angulo, para no tener que desenvolver el salto de ±180.
- **name**: GLITCH_DPS — **value**: 600 grados/s — **why**: Un giro de muneca rapido llega a 200-300 grados/s; 600 deja el doble de margen, asi que lo que lo supere es discontinuidad del sensor (rafaga de reanudacion, re-normalizacion de la fusion) y no un gesto. Se recorta el paso en vez de descartar la muestra, para no perder el seguimiento.
- **name**: ZERO_MS / ZERO_SPREAD — **value**: 350 ms / 14 grados — **why**: 350 ms son ~21 muestras a 60 Hz, suficientes para que la media circular reduzca el temblor por raiz de N (~4,6x) y lo bastante corto para no notarse al arrancar la carrera. 14 grados de dispersion maxima (contrastada con la longitud resultante media, cos 14 = 0,970) descarta la ventana si el jugador todavia estaba colocandose el movil, y se reintenta sola. Sustituye a controls.js:126, que tomaba UNA sola lectura con el dedo aun en el boton.
- **name**: WATCHDOG_MS — **value**: 1500 ms, dos veces — **why**: Un movil que va a entregar lecturas entrega la primera muy por debajo de 300 ms. 1500 ms deja margen para el arranque del sensor tras el permiso sin que el jugador se quede sin direccion mucho tiempo; el segundo tramo es el que da la oportunidad al respaldo devicemotion antes de declarar el giroscopio muerto y degradar el esquema.
- **name**: umbral de stageSpin — **value**: ±35 grados de alabeo absoluto — **why**: Decide entre rotate(90deg) y rotate(-90deg) segun a que lado ha girado el jugador el telefono. 35 grados esta suficientemente lejos de 0 para no conmutar con el movil casi vertical y suficientemente lejos de 90 para reaccionar antes de que la imagen aparezca boca abajo. Con rotate(90deg) el 'arriba' de la imagen es el borde DERECHO del aparato, asi que la imagen sale derecha con el alabeo cerca de -90.
- **name**: escala de la sensibilidad — **value**: TILT_FULL / sens, recortado a [10, 40] grados — **why**: state.sens llega de un deslizador de 50 a 200 (template.html:225), asi que el tope de giro va de 44 a 11 grados. Aplicar sens al ANGULO conserva la forma de la curva y la relacion entre zona muerta y recorrido; aplicarlo a la salida (controls.js:257) comprime la region de control fino y descoloca la zona muerta.

### pitfalls

- El signo mal no se nota en la lectura del codigo porque `atan2(gx, -gy)` SI es la formula correcta: el error esta una linea antes, en gx. Y como es un espejo en X y no un cambio de signo global del vector, no se cancela en ninguna postura. Cualquier revision que compruebe solo 'plano' y 'vertical con gamma=0' pasa: ahi gx = 0 y el bug es invisible (medido: roll_ok = roll_codigo = 0,0 en los dos casos).
- Con el movil EXACTAMENTE vertical (cabeceo 90) la parametrizacion de Euler entra en gimbal lock: gamma se clava en ±90 y salta 180 grados al cruzar el alabeo cero, alpha salta ±90 y beta se convierte en 90-|alabeo|. Medido: alabeo -0,1 -> (alpha 90, beta 89,9, gamma -90); alabeo +0,1 -> (alpha -90, beta 89,9, gamma +90). El vector reconstruido no se entera (salto maximo 3,5e-4 por paso de 0,02 grados). Quien lea gamma directamente tiene un mando que se invierte solo al pasar por el centro.
- El navegador puede reportar CUALQUIERA de las dos ramas de Euler equivalentes y cambiar de rama sin avisar. Emulando la postura que yo construi como (beta=70, gamma=+90), Chrome reporto (beta=110, gamma=-90). Solo la parte en el plano (gx,gy) es invariante bajo (beta,gamma)->(180-beta,-gamma) (diferencia 1,3e-15); gz SI cambia de signo, asi que nunca hay que meter gz en la decision del alabeo ni normalizar por el vector 3D completo.
- El cero de calibracion NO es intercambiable entre fuentes. deviceorientation y devicemotion difieren en 180 grados en iOS (Safari entrega la gravedad, el resto la fuerza especifica). Ese desplazamiento es inocuo por si solo porque lo borra el cero, pero si el cero se tomo con deviceorientation y las lecturas pasan a venir de devicemotion, el mando queda invertido al 100%. La regla es invalidar el cero en el mismo instante en que cambia la fuente, y esa es toda la logica que hace falta: cero olfateo de user agent, cero deteccion de signos.
- Detectar el signo de accelerationIncludingGravity correlacionando el alabeo derivado con rotationRate NO FUNCIONA, aunque parezca lo natural. Invertir el signo del vector desplaza el alabeo 180 grados exactos, y un desplazamiento constante tiene la misma derivada: la correlacion sale identica con las dos convenciones. Cualquier autodeteccion por velocidad angular es tiempo perdido.
- requestPermission tiene que ser la PRIMERA instruccion del manejador del gesto. En main.js el orden `ride()` importa: si se pone un `await audio.unlock()` o cualquier otro await delante, la activacion del usuario ya se ha consumido y Safari rechaza con NotAllowedError. Y el rechazo por falta de gesto no es lo mismo que la denegacion del jugador: sin gesto la promesa se RECHAZA (reintentable en el toque siguiente), denegar la RESUELVE con 'denied' (no reintentable en esa carga). controls.js:88-92 los mete en el mismo saco y se queda sin giroscopio para siempre por un fallo recuperable.
- Al recargar, iOS no garantiza el permiso: hay que volver a pedirlo dentro de un gesto en cada carga (si ya estaba concedido resuelve 'granted' sin ensenar nada). Lo que no se puede hacer NUNCA es llamarlo fuera de un gesto para 'ver si esta concedido': eso envenena la carga de pagina y, con denegaciones repetidas, obliga al jugador a ir a Ajustes del sistema (Safari > Acceso a movimiento y orientacion) para desbloquearlo.
- Concedido y silencioso es un caso real y frecuente, y explica el sintoma 'interfaz vertical cuando quiero giroscopio'. En un iframe sin allow="accelerometer; gyroscope; magnetometer" Chrome no entrega NI UN evento y no hay API para preguntarlo (la Permissions-Policy no es consultable). Si el juego se embebe en un portal, el giroscopio muere en silencio y controls.js:217 degrada al arrastre sin decir nada. Hay que distinguir 'llegan eventos con beta/gamma nulos' (escritorio sin sensores) de 'no llega ni un evento' (bloqueado) y decirselo al jugador.
- En file:// el sensor funciona en Chrome y Safari (file:// cuenta como contexto seguro), pero un index.html abierto desde un gestor de archivos en Android suele acabar en un WebView sin acceso a sensores. Como este proyecto se distribuye tambien como fichero unico (build.mjs --single), el respaldo y el mensaje al jugador son obligatorios, no opcionales.
- Degradar el esquema por una lectura poco fiable arruina la partida. controls.js:217 usa `!gyro.active`, y `active` se cae en cuanto el movil se acerca al plano: el jugador pasa de inclinar a arrastrar en medio de una carrera a 250 km/h. La degradacion solo debe dispararla el watchdog (`gyro.dead`), nunca la confianza instantanea.
- El movil plano no debe congelar la direccion. controls.js:123 sale con `return` sin tocar gyro.raw, asi que el ultimo alabeo se queda pegado: si el jugador tumba el movil a tope de giro, la moto se queda a tope de giro. Comprobado con el arreglo: con el movil tumbado, flat=0,070, conf=0,00 y la direccion decae a 0,007.
- La rotacion por CSS conserva el SENTIDO del alabeo pero desplaza el cero exactamente ±90 grados, y la postura neutra del jugador tambien gira. layoutStage() (controls.js:45-67) conmuta `rotated` sin tocar gyro.zero: al quitar el bloqueo de rotacion, o al conmutar entre las dos manos de horizontal, el mando queda perpendicular. Hay que recalibrar en el cambio.
- rotate(90deg) fijo solo funciona para UNA de las dos formas de sostener el movil en horizontal: pone el 'arriba' de la imagen en el borde derecho del aparato, asi que la imagen sale derecha cuando ese borde apunta al cielo (alabeo cerca de -90) y boca abajo si el jugador gira al otro lado. Con el bug de signo actual, stageSpin() elegiria ademas la mano contraria (medido: -90 en vez de 90), asi que el defecto de signo y 'lo mal ubicada la moto' / la pantalla al reves tienen la misma raiz.
- Emulation.setDeviceOrientationOverride YA NO EXISTE en el CDP de Chrome actual: devuelve "'Emulation.setDeviceOrientationOverride' wasn't found". Cualquier prueba antigua basada en ese comando falla por el motor de pruebas, no por el juego. Hay que usar Emulation.setSensorOverrideEnabled + setSensorOverrideReadings con un cuaternion, sobre absolute-orientation Y relative-orientation.
- El override de sensores solo emite un evento cuando la lectura CAMBIA. Una prueba que fija una postura y espera lecturas se cuelga: el cero (que necesita 350 ms de muestras) nunca se toma. Hay que mantener el flujo con un temblor de ~0,3 grados, que ademas es lo que hace una mano de verdad.
- state.sens multiplicando la salida (controls.js:257) deforma la curva: la saturacion se mueve pero la zona muerta no, y a sens=2 la region de control fino se reduce a la mitad. Y si se corrige aplicando sens a TILT_FULL sin quitar el multiplicador final, se aplica dos veces.

### verify

- Prueba de la matematica sin navegador (segundos, es la que hay que ejecutar primero): un script que compare (cos b·sin g, -sin b, -cos b·cos g) con -(tercera fila de Rz(a)Rx(b)Ry(g)) sobre 300.000 triples aleatorios. Debe dar error 0,00e+0. Con el signo actual de src/controls.js:116 da un error de hasta 2,0. Es la prueba que fija el signo de una vez.
- Tabla de posturas canonicas, tambien sin navegador. (beta,gamma) -> (gx,gy,gz), |g_plano| y alabeo: plano boca arriba (0,0) -> (0,0,-1), plano 0,000, alabeo indefinido; plano boca abajo (180,0) -> (0,0,+1); vertical de pie (90,0) -> (0,-1,0), plano 1,000, alabeo 0; vertical invertido (-90,0) -> (0,+1,0), alabeo 180; horizontal borde DERECHO abajo (0,+90) -> (+1,0,0), alabeo +90; horizontal borde IZQUIERDO abajo (0,-90) -> (-1,0,0), alabeo -90; retrato inclinado 20 horario (70,+90) -> (0,342,-0,940,0), alabeo +20; el mismo antihorario (70,-90) -> alabeo -20. La regla que tiene que cumplirse en las ocho: alabeo positivo = horario visto por el jugador = giro a la DERECHA.
- Barrido de cabeceo: reconstruir el alabeo para cabeceos de 90, 70, 50, 30, 15, 10 y 5 grados con alabeos de -40 a +40. Tiene que devolver el alabeo fisico EXACTO en los siete cabeceos (comprobado). Si aparece una ganancia dependiente del cabeceo, alguien ha vuelto a meter gamma en el camino: gamma/alabeo vale 1,53 a 60 grados, 2,16 a 70, 3,14 a 80 y 4,50 a 90.
- Continuidad en la singularidad: barrer el alabeo de -8 a +8 grados con el movil EXACTAMENTE vertical en pasos de 0,02 grados y medir el salto maximo por paso del vector reconstruido y de los angulos reportados. El vector debe saltar <1e-3 y los angulos ~177,5 grados. Es la prueba que demuestra que se rompe la continuidad de los ANGULOS, no la del vector.
- Prueba de un extremo a otro en Chromium headless con tools/tilt-test.mjs (Playwright + CDP, ya validada en este entorno): contexto con permissions ['accelerometer','gyroscope','magnetometer'] e isMobile, Emulation.setSensorOverrideEnabled sobre absolute-orientation y relative-orientation, y setSensorOverrideReadings con el cuaternion de Rz(a)Rx(b)Ry(g). Dos posturas neutras (horizontal con alabeo -90 que es el caso de la pagina rotada por CSS, y vertical con cabeceo 60) y cuatro inclinaciones cada una. Criterio: sign(input.steer) == sign(inclinacion horaria) con |steer| > 0,05. Salida esperada con el arreglo: -20 -> -0,822 / -10 -> -0,261 / +10 -> +0,243 / +20 -> +0,815. Con el codigo actual la misma prueba da +0,801 / +0,253 / -0,247 / -0,822, es decir AL REVES en las dos posturas.
- En la misma prueba, comprobar el cero: tras 700 ms en la postura horizontal neutra, gyro.zero debe valer -90,0 exactos y gyro.source 'orientation'. Y stageSpin() debe devolver 90 (rotate(90deg)); con el bug de signo devuelve -90, lo que ademas presenta la imagen boca abajo.
- Movil tumbado en la misma prueba: mantener cabeceo 4 grados durante 600 ms y avanzar 800 ms de juego. Esperado flat~0,070, conf 0,00 y steer decayendo a <0,05. Si se queda pegado al ultimo valor, ha vuelto el `return` de controls.js:123.
- Identidad del signo de devicemotion, sin navegador: comprobar |atan2(-x,y) - atan2(x,-y) - 180| < 1e-12 sobre 100.000 pares, y que wrap180(alabeo - cero) es identico con las dos convenciones cuando el cero se toma de la MISMA fuente (< 1e-12). Es lo que autoriza a implementar el respaldo sin olfatear el user agent. Y la prueba negativa correspondiente: forzar la fuente a 'motion' dejando el cero de 'orientation' debe producir 180 grados de error, que es el fallo que evita la invalidacion del cero en feed().
- Prueba del bloqueo por Permissions-Policy, que es la que reproduce 'interfaz vertical cuando quiero giroscopio': cargar el juego dentro de un iframe SIN el atributo allow y comprobar que gyroStatus() devuelve 'blocked' (cero eventos, cero nulos) en menos de 3 s y que la interfaz lo dice, en vez de degradar al arrastre en silencio. Repetir con allow="accelerometer; gyroscope; magnetometer" y comprobar que devuelve 'ok'.
- Permiso de iOS, en telefono real y sin sustituto posible (el CDP no emula requestPermission): (a) primer toque en CONDUCIR -> aparece el dialogo del sistema y al aceptar el mando responde en menos de 300 ms; (b) recargar y volver a jugar -> no aparece dialogo y el mando responde igual; (c) denegar -> gyroStatus() 'denied', mensaje al jugador y arrastre como esquema; (d) llamar enableGyro() desde la consola, fuera de gesto -> gyroStatus() 'gesture' y al toque siguiente vuelve a pedirlo; (e) mandar el juego a segundo plano 30 s y volver -> se retoma el cero y no hay salto de direccion; (f) Ajustes > Safari > Acceso a movimiento y orientacion en OFF -> 'denied' inmediato sin dialogo.
- Comprobacion de que el arreglo esta VIVO y no es codigo muerto: `grep -n "controls" src/main.js src/game.js` debe encontrar el import en los dos, y `grep -n "installInput\|this.drag\|this.keys.has('Arrow" src/game.js` no debe encontrar nada. Mientras game.js:37 siga llamando a su propio installInput, todas las pruebas de arriba pasan sobre un modulo que la fisica no lee.
- Con la partida en marcha y ?debug=1, en el movil real: window.__rr.controls.gyroDebug() debe dar source 'orientation', perm 'granted', live true, flat entre 0,80 y 1,00 en la postura de juego, |raw| < 3 con el movil quieto (si es mayor, la zona muerta esta corta para ese aparato) y zero estable entre carreras salvo tras un cambio de presentacion.

## Mandos tactiles en pantalla (gas, freno, giro, claxon): distribucion, tamanos, multitactil y robustez del pulsado

### area

Mandos tactiles en pantalla (gas, freno, giro, claxon): distribucion, tamanos, multitactil y robustez del pulsado

### diagnosis

Los mandos YA existen en `template.html:179-206` y `src/controls.js:176-193`, pero estan colocados con numeros clavados a mano que no cuadran con los `clamp()` de tamano, y el manejador de pulsado tiene tres fallos que producen exactamente la queja "los botones de avanzar y frenar visibles" / "mal ubicada".

1. EL GAS TAPA EL VELOCIMETRO ENTERO, EN TODOS LOS MOVILES.
`template.html:192-194` `#p-gas{right:calc(16px+var(--sa-r));bottom:calc(16px+var(--sa-b));width:clamp(76px,17vmin,104px)}` y `template.html:145-148` `#speedo{right:calc(14px+var(--sa-r));bottom:calc(16px+var(--sa-b))}` con `.n{font-size:clamp(44px,12vw,68px)}`. Ocupan la MISMA esquina. Medido: en 844x390 el gas ocupa x 752..828 / y 16..92 y el velocimetro x 708..830 / y 16..110 -> solape 76x76 px. En 1180x820 el solape es 104x97. Y `#pedals` (linea 317) va DESPUES de `#speedo` (linea 316) en el DOM, asi que el pad pinta encima, y ademas lleva `background:rgba(9,13,20,.42)` + `backdrop-filter:blur(6px)`: los digitos quedan desenfocados y oscurecidos, y encima el pulgar los cubre. Esto es el defecto de percepcion numero uno: el jugador ve un boton donde esperaba la velocidad.

2. EL FRENO SE MONTA ENCIMA DEL GAS EN CUANTO EL CLAMP CRECE.
`template.html:195` `#p-brake{bottom:calc(112px + var(--sa-b))}`. Ese 112 solo funciona si el gas mide su MINIMO (76+16+20). Con `17vmin` > 76 px (vmin > 447 px CSS, o sea cualquier tableta y los moviles grandes en horizontal) el gas mide 104 y su borde superior queda en 120 > 112: solape medido de 86x8 px en 1180x820. Separacion efectiva entre gas y freno: 0.

3. LAS DOS FLECHAS DE GIRO SE SOLAPAN.
`template.html:199` `#p-right{left:calc(102px + var(--sa-l))}` frente a `#p-left{left:calc(16px + ...);width:clamp(72px,15vmin,92px)}`. El hueco es 86-W: 14 px con W=72 (movil) y **-6 px con W=92** (tableta). Solape medido 6x92.

4. EL CLAXON QUEDA A 2 PX DE LA FLECHA DERECHA.
`template.html:206` `#pedals.btns #p-horn{left:calc(196px + var(--sa-l))}`; `#p-right` acaba en 102+92=194. Dos pixeles de separacion, y encima ese reposicionamiento mueve el claxon a mitad de pantalla, donde no lo alcanza ningun pulgar y tapa carretera.

5. LA BARRA DE RPM PASA A 3 PX DEL FRENO.
`template.html:151-152` `#rpm{bottom:calc(104px+var(--sa-b));height:5px}` acaba en 109; el freno empieza en 112. Y `.pad{box-shadow:0 6px 18px}` (linea 189) la ensucia.

6. `bindButton` SUELTA EL MANDO CON EL SEGUNDO DEDO.
`src/controls.js:178-179`: `up` se ejecuta en CUALQUIER `pointerup` sin comprobar `pointerId`. Dos dedos sobre el gas (pasa constantemente al recolocar la mano): al levantar el segundo, `onUp()` apaga el gas aunque el primero siga puesto. Es un booleano donde hace falta un conjunto de ids.

7. `pointerleave` CORTA EL GAS CON LA DERIVA DEL PULGAR.
`src/controls.js:183`. En un pad redondo de 76 px con una huella de pulgar de ~38 px, el centroide cruza el borde curvo con 2-3 px de movimiento. En tactil el navegador hace captura implicita y `pointerleave` no llega hasta el `pointerup`, asi que ahi es inofensivo, pero con raton (y con los emuladores de movil de escritorio, que es donde se prueba) el gas se apaga al arrastrar. Es cero histeresis en el peor borde posible.

8. GIRO CLAVADO A TOPE, Y GIRO PERDIDO CON LOS DOS BOTONES.
`src/controls.js:190-191`: `() => { if (btnSteer < 0) btnSteer = 0; }`. Secuencia real: pulsar izquierda (btnSteer=-1), pulsar derecha (btnSteer=1), soltar derecha -> `btnSteer > 0` -> 0. La izquierda sigue pulsada y la moto ya no gira hasta soltar y volver a pulsar. Y si el pad se oculta a media pulsacion (`#pedals:not(.btns) .steer{display:none}` en linea 205, disparado por `ui.js:291` `paintPedals` al cambiar de esquema con el dedo puesto) no llega ni `pointerup` ni `pointerleave`: `btnSteer` se queda en +-1 para siempre.

9. `releaseAll()` NO LIMPIA LO VISUAL, Y APAGA EL GAS QUE SIGUE PULSADO.
`src/controls.js:270-277` borra `pedal.*` pero no la clase `.press`. `game.js:315` llama a `releaseAll()` al pausar: el pad se queda encendido en naranja mintiendo. Y al reanudar con el dedo TODAVIA en el gas no hay ningun `pointerdown` nuevo que llegue, asi que la moto sale sin gas hasta que el jugador levanta y vuelve a pulsar. El comentario de `game.js:313-314` intenta arreglar el gas pegado y crea el gas muerto.

10. FALTA `-webkit-touch-callout` Y EL GUARDA GLOBAL DE `contextmenu`.
`template.html:25` pone `user-select:none` y `tap-highlight-color:transparent`, y `touch-action:none` en `html,body` (linea 26) — eso si mata el zoom por doble toque y el rebote elastico. Pero en iOS el globo de "copiar" al mantener pulsado se quita con `-webkit-touch-callout:none`, que no esta en ningun sitio. Y `contextmenu` solo se previene dentro de `bindButton` (`controls.js:184`): una pulsacion larga sobre el LIENZO (que es la superficie de arrastre del esquema `touch`, `controls.js:156`) saca el menu de Android. `user-scalable=no` del meta (linea 2) lo ignora Safari desde iOS 10, no cuenta.

11. NI VIBRACION NI SONIDO EN LOS PADS.
`state.haptics` existe y `game.js:261,302` ya usa `navigator.vibrate`, pero los mandos no vibran. Y `ui.js:361` solo suena el click con `e.target.closest('button')`: los pads son `div`, no suenan. La unica realimentacion es `.press` (linea 190), que el pulgar tapa.

12. LOS PADS SE VEN EN PAUSA.
`ui.js:46` `this.hudEl.classList.toggle('on', name==='game' || name==='pause')`. En pausa los cinco mandos brillan bajo el velo desenfocado invitando a pulsar algo que no responde (`#s-pause`, linea 326, va despues y se come los toques).

13. RAIZ COMPARTIDA: vw/vh CON EL ESCENARIO GIRADO POR CSS.
`#speedo .n{clamp(44px,12vw,68px)}` (linea 148) y `#rpm{width:min(46vw,190px)}` (linea 152). Con la pagina girada por CSS, `vw` sigue midiendo la ventana FISICA: el mismo movil da 12vw=101 px con el aparato en horizontal y 12vw=47 px con el aparato en vertical y el escenario rotado. El velocimetro cambia de tamano segun como sostengas el telefono. `vmin` es el lado corto en los dos casos (en modo rotado stage.height = innerWidth = vmin), asi que es la unica unidad valida aqui. Nota para quien lleve los paneles: `template.html:52` `.panel.tall{max-height:min(74vh,640px)}` tiene el mismo fallo y desborda el escenario rotado (74% de 844 = 625 px dentro de un escenario de 390 px de alto).

### recommendation

La distribucion. Movil en horizontal sujeto por los lados: cada pulgar pivota por DEBAJO de su esquina inferior, y el recorrido barato es el barrido a lo largo del borde de abajo (flexion-extension de la articulacion metacarpofalangica), no la subida por el borde lateral. Por tanto la fila de abajo es la fila buena y ahi va todo lo critico.

Gas en la esquina inferior DERECHA y el mas grande. En una moto el gas es el puno derecho, asi que la correspondencia es la que el jugador ya trae de casa; y es el unico mando que se mantiene pulsado toda la partida, asi que va en la posicion de reposo del pulgar derecho, donde ni hay que apuntar ni hay que mirar. Es el mas grande porque se pulsa a ciegas y fallarlo cuesta la partida.

Freno a la IZQUIERDA del gas, misma fila, bordes inferiores alineados. Mismo pulgar, un barrido lateral: el gesto mas rapido y repetible que tiene ese dedo. Apilarlo ENCIMA del gas (lo que hay hoy) junta los dos bordes mas peligrosos del juego y el pulgar roza el gas cada vez que rueda hacia el freno; de lado se pueden pisar los dos a la vez con el pulgar abierto o con pulgar e indice, que la fisica ya admite (`game.js:186-189` calcula `accel` y `dec` por separado). Bordes inferiores alineados y no centros alineados, porque el arco del pulgar tiene el pivote por debajo del cristal: a radio constante la altura no sube al ir hacia dentro.

Giro en la esquina inferior IZQUIERDA, dos ruedas contiguas. Pulgar izquierdo, que en el esquema de botones no hace nada mas. Izquierda a la izquierda y derecha a la derecha: no hay nada que aprender, y evita entrar en el lio de "controles en reversa" por este lado.

Claxon en la columna izquierda, una fila mas arriba, y en el MISMO sitio en los tres esquemas. Es una pulsacion puntual, nunca simultanea con nada, asi que sale del arco principal. Subir por el borde izquierdo es un recorrido de unos 40 mm; ponerlo a la derecha de las flechas (lo que hace `template.html:206`) son casi 70 mm y encima lo mete en el centro de la imagen. Y dejarlo arriba libera la esquina inferior izquierda, que en el esquema `touch` es justo donde el pulgar apoya y empieza los deslizamientos de direccion (`controls.js:156`, el arrastre escucha en todo el lienzo). No lo muevo entre esquemas: un mando que cambia de sitio se busca dos veces.

Y el cuadro de instrumentos (velocimetro + barra de rpm) se va al CENTRO abajo. Es la unica forma de resolver el solape del punto 1 sin encoger el gas: el centro inferior es donde esta el cuadro de una moto de verdad, cae en la misma linea de vision que la carretera, no lo alcanza ninguno de los dos pulgares y los dos clusters lo flanquean sin tocarlo. Lo monto con un envoltorio `#dash` en flujo (flex column) para que la barra de rpm se apile sobre los digitos SIN un solo desplazamiento clavado a mano.

La regla estructural que arregla los puntos 2, 3 y 4 de una vez: ni un numero de posicion escrito a mano. Todo sale de cuatro variables de tamano y un hueco unico, y los desplazamientos se calculan con `calc()` a partir de ellas. Ese es el patron que hay que dejar, porque el fallo de fondo no es que 112 este mal, es que 112 se derivo del minimo del `clamp()` y el `clamp()` crece.

Multitactil. Un solo manejador en el lienzo no puede acelerar y girar a la vez por dos motivos distintos. El estructural: el elemento recibe TODOS los punteros mezclados y para saber si un dedo es gas o direccion hay que rehacer a mano el reparto por zonas, es decir reimplementar el hit-testing que el navegador ya hace gratis. El concreto que hay en este codigo: `controls.js:157` guarda el arrastre en una sola ranura `drag = {...}` y la sobreescribe sin condicion, asi que el segundo dedo desahucia al primero, y al levantar el segundo `end` deja `drag = null` mientras el primero sigue en el cristal: la direccion muere hasta soltar y volver a pulsar. Un elemento por mando y un `Set` de `pointerId` por elemento resuelve las dos cosas: los eventos llegan ya separados por el navegador y cada mando cuenta sus propios dedos.

`setPointerCapture` AYUDA y hay que llamarlo. En tactil la captura ya es implicita, asi que llamarlo no cambia nada; con raton garantiza que el `pointerup` vuelva al mando aunque el cursor se haya ido, que es precisamente lo que hoy falta. Lo que ESTORBA es depender de `pointerleave`, que es histeresis cero sobre un borde curvo. La captura tiene un solo efecto secundario real: mientras un mando tiene capturado el puntero, el mando vecino no recibe `pointerdown`, o sea que se pierde el deslizar de un boton a otro. Eso se recupera a mano donde interesa (entre las dos flechas de giro, deslizar de izquierda a derecha sin levantar) y se deja perdido a proposito donde no interesa (del gas al freno, que solo produciria frenazos accidentales). Y `lostpointercapture` sale gratis como red: es el evento que salta cuando el mando se oculta o se saca del arbol a media pulsacion, que es el punto 8.

Dedo que sale sin levantar: `pointerleave` fuera, captura mas margen de fuga dentro. Se libera cuando el puntero se sale mas de 44 px del rectangulo del mando (`SLOP_HOLD`), no cuando cruza el borde. 44 px es mas que cualquier deriva involuntaria y menos que la distancia a cualquier mando vecino. Entre las flechas de giro el margen es de 6 px (`SLOP_SLIDE`), lo justo para que el borde compartido no vibre, porque ahi el deslizamiento SI es un gesto deseado. Y el gas no se queda pegado por tres vias independientes: `pointercancel`, `lostpointercapture`, y un par de manejadores en `window` en fase de captura que barren cualquier `pointerup`/`pointercancel` que se haya perdido.

El gas pegado y el gas MUERTO. La segunda mitad del punto 9 importa mas que la primera. Dejo de latir booleanos: el estado de cada mando se DERIVA del tamano de su conjunto de dedos, leido una vez por fotograma en `update()`. Con eso el estado del mando no puede desincronizarse del cristal por construccion, y `releaseAll()` deja de tocar los dedos: los conjuntos solo los mutan eventos de puntero de verdad. Al pausar con el gas pulsado, `game.step()` ya sale antes (`game.js:158-161`) y no hay aceleracion; al reanudar con el dedo aun puesto el gas vuelve al instante en vez de exigir un nuevo toque. Solo el camino de "la pagina se fue a segundo plano" (`main.js:148-152`) borra los dedos a la fuerza, porque ahi si han dejado de existir.

Realimentacion. `.press` cambia `transform` y `background`, las dos cosas que el compositor resuelve sin repintar; la sombra cambia de golpe a proposito, porque animar su desenfoque sobre un lienzo WebGL repinta la zona en cada fotograma. Vibracion de 12 ms solo en la PULSACION, nunca al soltar (dos zumbidos por toque se leen como retardo y como bateria), respetando `state.haptics`, y con guarda: en iOS Safari `navigator.vibrate` no existe y no hay sustituto. Sonido de click en los pads NO: `ui.js:361` no los alcanza porque son `div`, y esta bien asi, porque una muestra de click en cada golpe de gas es una ametralladora; el gas ya se confirma con el motor y el claxon con su propio efecto (`game.js:172`).

Que se oculta segun el esquema. Gas y freno SIEMPRE, en los tres esquemas y tambien en escritorio: es la promesa de `controls.js:9-10` y sin ellos en un movil no hay forma de acelerar. Las dos ruedas de giro SOLO con el esquema `buttons`: con giroscopio o con arrastre solo tapan carretera, y en `touch` roban el inicio del deslizamiento. Claxon siempre visible y siempre en el mismo sitio. Y los cinco desaparecen cuando no se esta conduciendo (punto 12), con una clase `ride` que solo se pone con `screen === 'game'`, en vez de heredar la visibilidad de `#hud`, que en pausa sigue encendido.

### code

=== 1) template.html — sustituir el bloque de mandos, lineas 179-206 completas ===

  /* ---- mandos en pantalla ----
     Movil en horizontal sujeto por los lados: el pulgar derecho pivota por debajo de la
     esquina inferior derecha y el izquierdo por debajo de la izquierda. El recorrido barato
     de un pulgar es el barrido a lo largo del borde de abajo, no la subida por el borde
     lateral, asi que la fila de abajo es la fila buena y ahi va todo lo critico.

     Reparto:
       gas    esquina inferior DERECHA, el mas grande. En una moto el gas es el puno derecho,
              y es el unico mando que se mantiene pulsado toda la partida: va en la posicion
              de reposo del pulgar y no hay que apuntar ni mirar.
       freno  a la IZQUIERDA del gas, misma fila, bordes de abajo alineados. Mismo pulgar, un
              barrido de lado. Apilado ENCIMA junta los dos bordes mas peligrosos y el pulgar
              roza el gas cada vez que va a frenar; de lado se pisan los dos a la vez.
       giro   esquina inferior IZQUIERDA, dos ruedas. Pulgar izquierdo, que en este esquema no
              hace nada mas, e izquierda a la izquierda para que no haya nada que aprender.
       claxon columna izquierda, una fila mas arriba, y en el MISMO sitio en los tres
              esquemas. Es una pulsacion puntual, nunca simultanea, asi que sale del arco
              principal: subir por el borde izquierdo son unos 40 mm frente a los casi 70 que
              costaria ponerlo a la derecha de las flechas. Ademas deja libre la esquina de
              abajo a la izquierda, que con el esquema de arrastre es donde el pulgar apoya y
              empieza los deslizamientos.

     Ni un desplazamiento clavado a mano: todo sale de estas variables. Ese era el fallo de
     antes, y no era que 112 estuviese mal sino que 112 se derivo del MINIMO del clamp: con
     'bottom:112px' el freno se montaba 8 px encima del gas en cuanto 17vmin pasaba de 76, y
     con 'left:102px' las dos flechas se solapaban 6 px en tableta.

     vmin y no vw/vh: el escenario se gira 90 grados por CSS y vw/vh siguen midiendo la
     ventana FISICA, asi que el mismo aparato daria mandos de dos tamanos distintos segun
     como se sostenga. vmin es el lado corto en los dos casos. */
  :root{
    --pad-gap:16px;
    --pad-gas:clamp(96px,21vmin,132px);
    --pad-brake:clamp(80px,18vmin,110px);
    --pad-steer:clamp(76px,17vmin,100px);
    --pad-horn:clamp(56px,12vmin,72px);
  }
  #pedals{position:absolute;inset:0;pointer-events:none}
  .pad{position:absolute;pointer-events:auto;display:grid;place-items:center;gap:2px;
    border-radius:50%;border:1px solid rgba(255,255,255,.22);color:var(--text);
    background:rgba(9,13,20,.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
    font-size:9.5px;font-weight:900;letter-spacing:.1em;text-align:center;line-height:1.15;
    box-shadow:0 6px 18px rgba(0,0,0,.4);
    transition:transform .07s ease,background .12s ease,opacity .18s ease;
    /* touch-action aqui tambien y no solo en html,body: es lo que apaga el zoom por doble
       toque y el arrastre de pagina SOBRE el mando. El meta user-scalable=no no cuenta, lo
       ignora Safari desde iOS 10. touch-callout es lo que quita el globo de "copiar" al
       mantener pulsado: user-select por si solo no basta en iOS. */
    touch-action:none;-webkit-user-select:none;user-select:none;
    -webkit-touch-callout:none;-webkit-user-drag:none;-webkit-tap-highlight-color:transparent}
  .pad .ico{font-size:clamp(17px,4.4vmin,24px);line-height:1;font-weight:400}
  /* Se animan transform y background, que el compositor resuelve sin repintar. La sombra
     cambia de golpe a proposito: animar su desenfoque sobre un lienzo WebGL repinta la zona
     en cada fotograma. */
  .pad.press{transform:scale(.93);background:rgba(255,106,26,.5);border-color:var(--accent);
    box-shadow:0 0 0 2px rgba(255,106,26,.35),0 4px 12px rgba(0,0,0,.5)}

  #p-gas{right:calc(var(--pad-gap) + var(--sa-r));bottom:calc(var(--pad-gap) + var(--sa-b));
    width:var(--pad-gas);height:var(--pad-gas);font-size:11px;
    background:rgba(255,106,26,.26);border-color:rgba(255,140,70,.55)}
  /* Silueta distinta a proposito: a esa distancia y en movimiento el pulgar encuentra el
     mando por forma y tamano, no leyendo la palabra. */
  #p-brake{right:calc(var(--pad-gap)*2 + var(--pad-gas) + var(--sa-r));
    bottom:calc(var(--pad-gap) + var(--sa-b));
    width:var(--pad-brake);height:var(--pad-brake);border-radius:26px}
  #p-left{left:calc(var(--pad-gap) + var(--sa-l));bottom:calc(var(--pad-gap) + var(--sa-b));
    width:var(--pad-steer);height:var(--pad-steer)}
  #p-right{left:calc(var(--pad-gap)*2 + var(--pad-steer) + var(--sa-l));
    bottom:calc(var(--pad-gap) + var(--sa-b));
    width:var(--pad-steer);height:var(--pad-steer)}
  /* Solo tiene que despejar la COLUMNA izquierda, asi que se apila sobre --pad-steer y no
     sobre el gas: con el gas quedaria a media pantalla en un movil bajito. */
  #p-horn{left:calc(var(--pad-gap) + var(--sa-l));
    bottom:calc(var(--pad-gap)*2 + var(--pad-steer) + var(--sa-b));
    width:var(--pad-horn);height:var(--pad-horn);font-size:8.5px;letter-spacing:.06em}

  /* Gas y freno SIEMPRE: sin ellos en un movil no hay forma de acelerar. Las dos ruedas de
     giro solo con el esquema de botones, que con giroscopio o arrastre solo taparian
     carretera y en arrastre roban el inicio del desliz. */
  #pedals:not(.btns) .steer{display:none}
  /* Y nada de mandos si no se esta conduciendo: en pausa el HUD sigue encendido y los
     botones brillarian bajo el velo invitando a pulsar algo que no responde. */
  #pedals:not(.ride) .pad{opacity:0;pointer-events:none}

  /* En calidad baja fuera el desenfoque de fondo: backdrop-filter obliga a copiar la zona
     del lienzo WebGL una vez por mando y por fotograma, y cinco copias se llevan varios
     milisegundos en una GPU de gama media. */
  html[data-q="low"] .pad{backdrop-filter:none;-webkit-backdrop-filter:none;
    background:rgba(9,13,20,.68)}
  html[data-q="low"] #p-gas{background:rgba(255,106,26,.34)}


=== 2) template.html — sustituir #speedo y #rpm, lineas 145-154 ===

  /* Cuadro de instrumentos abajo en el CENTRO, no en la esquina derecha: ahi lo tapaba
     entero el boton de gas (medido en 844x390: gas 752..828 x 16..92, velocimetro
     708..830 x 16..110, solape 76x76; en 1180x820 el solape es 104x97) y encima quedaba
     debajo del pulgar. El centro de abajo es donde esta el cuadro de una moto de verdad,
     cae en la misma linea de vision que la carretera y no lo alcanza ningun pulgar.
     Envoltorio en flujo para apilar la barra sobre los digitos SIN desplazamientos a mano. */
  #dash{position:absolute;left:50%;bottom:calc(8px + var(--sa-b));transform:translateX(-50%);
    display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none}
  #rpm{position:relative;width:clamp(140px,34vmin,260px);height:5px;border-radius:99px;
    background:rgba(255,255,255,.14);overflow:hidden}
  #rpm>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7cf39a,#ffd23f 62%,#ff2d2d)}
  #speedo{position:relative;text-align:center;text-shadow:0 3px 14px rgba(0,0,0,.65)}
  /* vmin y no vw: con el escenario girado por CSS, 12vw daba 101 px con el aparato en
     horizontal y 47 px con el aparato en vertical. El mismo movil, dos velocimetros. */
  #speedo .n{font-size:clamp(38px,11vmin,68px);font-weight:900;line-height:.92;
    font-variant-numeric:tabular-nums}
  #speedo .u{font-size:11px;font-weight:800;letter-spacing:.22em;color:var(--dim)}
  #speedo .g{margin-top:3px;font-size:13px;font-weight:900;letter-spacing:.12em;color:var(--accent)}


=== 3) template.html — sustituir lineas 315-323 (dentro de #hud) ===

    <div id="dash">
      <div id="rpm"><i></i></div>
      <div id="speedo"><div class="n" id="h-kmh">0</div><div class="u">KM/H</div><div class="g" id="h-gear"></div></div>
    </div>
    <div id="pedals">
      <div class="pad" id="p-gas" role="button" tabindex="-1" aria-label="gas">
        <span class="ico">&#9650;</span><span data-i18n="pad.gas"></span></div>
      <div class="pad" id="p-brake" role="button" tabindex="-1" aria-label="brake">
        <span class="ico">&#9660;</span><span data-i18n="pad.brake"></span></div>
      <div class="pad steer" id="p-left" role="button" tabindex="-1" aria-label="left"><span class="ico">&#9664;</span></div>
      <div class="pad steer" id="p-right" role="button" tabindex="-1" aria-label="right"><span class="ico">&#9654;</span></div>
      <div class="pad" id="p-horn" role="button" tabindex="-1" aria-label="horn"><span data-i18n="pad.horn"></span></div>
    </div>

Nota: data-i18n va en el SPAN de dentro, nunca en el div del pad. ui.js:36 hace
`n.textContent = t(...)` y en el div borraria el glifo .ico.
Nota: role=button + tabindex=-1 y no <button>: anunciables, pero fuera del recorrido del
tabulador, asi que no roban el foco ni dejan un anillo de foco ni responden a Espacio.


=== 4) template.html — linea 25, anadir touch-callout global ===

    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;
    -webkit-touch-callout:none;


=== 5) src/controls.js — sustituir lineas 29-34 ===

let stage = null;               // envoltorio rotado, para mapear el puntero
let rotated = false;
const keys = new Set();
let touchSteer = 0;

/* Mandos en pantalla. El estado NO se lata en booleanos: se DERIVA del conjunto de dedos
   que hay encima, leido una vez por fotograma en update(). Asi el mando no puede
   desincronizarse del cristal, que es lo que dejaba el gas encendido en pantalla despues de
   releaseAll() y el gas muerto al reanudar con el dedo todavia puesto. */
const PADS = [];
const pads = {};
/* Margen de fuga para soltar: el dedo tiene que salirse de VERDAD. pointerleave salta con
   2 px de deriva en un borde curvo de 96 px, y eso es el gas cortandose solo. */
const SLOP_HOLD = 44;
/* Entre las dos flechas de giro el deslizamiento SI es un gesto deseado, asi que el margen
   es solo el que evita que el borde compartido vibre. */
const SLOP_SLIDE = 6;
const held = k => !!(pads[k] && pads[k].ids.size);


=== 6) src/controls.js — sustituir install/bindButton/bindPedals, lineas 141-193 ===

export function install(canvas){
  addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'KeyC') calibrateGyro();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); clearPads(); });

  /* El menu contextual hay que cortarlo en TODO el escenario, no solo en los mandos: el
     esquema de arrastre escucha en el lienzo, y una pulsacion larga ahi saca el menu de
     Android. gesturestart es el pellizco de Safari, que touch-action no cubre en iOS
     antiguos, y dblclick remata el zoom por doble toque donde touch-action llegue tarde. */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  document.addEventListener('selectstart', e => {
    if (e.target && e.target.closest && e.target.closest('#pedals')) e.preventDefault();
  });

  /* Red de seguridad en fase de CAPTURA: si un pointerup se pierde por el camino (el
     navegador se traga el gesto, el mando se oculta a media pulsacion) el dedo se borra
     igual. Sin esto el giro se queda clavado a tope para siempre. */
  const sweep = e => { for (const p of PADS) if (p.ids.delete(e.pointerId)) p.sync(); };
  addEventListener('pointerup', sweep, true);
  addEventListener('pointercancel', sweep, true);

  /* Zona de direccion tactil sobre el lienzo. El puntero se mapea al espacio del
     escenario para que arrastrar "a la derecha" sea derecha tambien con la pagina girada. */
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    if (drag) return;                       // un solo dedo dirige: el segundo no desahucia al primero
    drag = { id:e.pointerId, x:mapPointer(e).x };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = mapPointer(e);
    const dx = p.x - drag.x;
    drag.x = p.x;
    const k = 3.4 / Math.max(240, stage ? stage.clientWidth : innerWidth);
    touchSteer = clamp(touchSteer + dx * k, -1, 1);
  });
  const end = e => { if (drag && e.pointerId === drag.id) drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
}

function padHaptic(){
  if (!state.haptics || !navigator.vibrate) return;
  /* Solo al PULSAR. Vibrar tambien al soltar son dos zumbidos por toque, se lee como
     retardo y se nota en la bateria. En iOS Safari navigator.vibrate no existe y no hay
     sustituto: se sale sin hacer nada. */
  try { navigator.vibrate(12); } catch (e) {}
}

/** Un mando en pantalla, con SUS PROPIOS eventos de puntero.
    Un unico manejador en el lienzo recibe todos los dedos mezclados y habria que rehacer a
    mano el reparto por zonas, es decir reimplementar el hit-testing que el navegador ya
    hace: con un elemento por mando los eventos llegan ya separados y acelerar y girar a la
    vez sale gratis. */
export function bindPad(el, opts){
  if (!el) return null;
  const group = (opts && opts.group) || null;
  /* Conjunto de ids ACTIVOS, no un booleano: con un booleano el segundo dedo que toca el
     mismo mando lo apaga al levantarse aunque el primero siga puesto, y recolocar la mano
     apaga el gas. */
  const pad = { el, ids:new Set(), down:false, group };
  const slop = group ? SLOP_SLIDE : SLOP_HOLD;

  const sync = () => {
    const now = pad.ids.size > 0;
    if (now === pad.down) return;
    pad.down = now;
    el.classList.toggle('press', now);
    if (now) padHaptic();
  };
  pad.sync = sync;
  PADS.push(pad);

  el.addEventListener('pointerdown', e => {
    /* preventDefault mata el arrastre de seleccion y los eventos de raton de
       compatibilidad. NO quita el menu contextual ni el zoom por doble toque, eso es CSS
       (touch-action, touch-callout) mas el manejador de contextmenu de install(). */
    e.preventDefault();
    /* La captura AYUDA: en tactil ya es implicita, asi que no cambia nada, y con raton
       garantiza que el pointerup vuelva a este mando aunque el cursor se haya ido. Lo que
       ESTORBA es depender de pointerleave, que es histeresis cero en un borde curvo. */
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    pad.ids.add(e.pointerId);
    sync();
  });

  el.addEventListener('pointermove', e => {
    if (!pad.ids.has(e.pointerId)) return;
    /* getBoundingClientRect ya viene con la rotacion del escenario aplicada, y clientX/Y
       tambien son de pantalla. Aqui NO se usa mapPointer: mezclar los dos espacios es lo
       que dejaria el mando pulsado en cuanto se gira la pagina. */
    const r = el.getBoundingClientRect();
    if (e.clientX >= r.left - slop && e.clientX <= r.right + slop &&
        e.clientY >= r.top - slop && e.clientY <= r.bottom + slop) return;
    pad.ids.delete(e.pointerId);
    try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    sync();
    /* Deslizar sin levantar de un mando a su companero de grupo (izquierda -> derecha). La
       captura impide que el vecino reciba pointerdown, asi que el traspaso se hace a mano, y
       solo dentro del grupo: del gas al freno no interesa, solo darian frenazos. */
    if (!group) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const next = under && under.closest ? under.closest('.pad') : null;
    const hit = next && PADS.find(p => p.el === next && p.group === group);
    if (!hit) return;
    try { hit.el.setPointerCapture(e.pointerId); } catch (err) {}
    hit.ids.add(e.pointerId);
    hit.sync();
  });

  const off = e => { if (pad.ids.delete(e.pointerId)) sync(); };
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  /* Salta cuando el mando se oculta o se saca del arbol a media pulsacion (cambiar de
     esquema con el dedo puesto sobre una flecha). Es la tercera via para no dejar nada
     clavado, y es la que pointerleave no cubria. */
  el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('dragstart', e => e.preventDefault());
  return pad;
}

export function bindPedals(els){
  pads.gas   = bindPad(els.gas);
  pads.brake = bindPad(els.brake);
  pads.left  = bindPad(els.left,  { group:'steer' });
  pads.right = bindPad(els.right, { group:'steer' });
  pads.horn  = bindPad(els.horn);
}

/** Borra a la fuerza los dedos y lo visual. Solo para cuando los dedos han dejado de
    existir de verdad (pagina en segundo plano, perdida de foco), NUNCA al pausar. */
export function clearPads(){
  for (const p of PADS){ p.ids.clear(); p.down = false; p.el.classList.remove('press'); }
}


=== 7) src/controls.js — en update(), sustituir lineas 229-233 ===

  let throttle = held('gas') ? 1 : 0;
  let brake = held('brake') ? 1 : 0;
  if (keys.has('ArrowUp') || keys.has('KeyW')) throttle = 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) brake = 1;
  if (pad){ throttle = Math.max(throttle, pad.throttle); brake = Math.max(brake, pad.brake); }

  /* Se deriva de los dedos que hay AHORA en el cristal, no de una variable que los eventos
     van corrigiendo. Con la version latida, pulsar izquierda, pulsar derecha y soltar
     derecha dejaba el giro en 0 con la izquierda todavia pulsada. Los dos a la vez son 0,
     que es lo correcto. */
  const btnSteer = (held('left') ? -1 : 0) + (held('right') ? 1 : 0);


=== 8) src/controls.js — linea 263, y sustituir releaseAll (270-277) ===

  input.horn = held('horn') || keys.has('KeyH');

export function releaseAll(hard){
  keys.clear();
  touchSteer = 0;
  input.throttle = input.brake = input.steer = 0;
  input.horn = false;
  /* Los dedos que siguen sobre el cristal NO se borran salvo que se pida a las claras. Al
     pausar con el gas pulsado, borrarlos deja la moto SIN gas al reanudar hasta que el
     jugador levanta y vuelve a pulsar, porque no va a llegar ningun pointerdown nuevo. La
     fisica ya ignora la entrada fuera de 'play' (game.js:158-161), asi que no hace falta. */
  if (hard) clearPads();
}


=== 9) src/main.js — linea 150 ===

    controls.releaseAll(true);   // en segundo plano los dedos han dejado de existir de verdad


=== 10) src/world.js — dentro de setQuality, tras la linea 226 ===

    /* Gancho para el CSS: en calidad baja los mandos pierden el backdrop-filter, que sobre
       un lienzo WebGL cuesta una copia de la zona por mando y por fotograma. */
    document.documentElement.dataset.q = q;


=== 11) src/ui.js — sustituir paintPedals (288-292) y anadir la llamada en show() ===

  /** Que mandos se ensenan. Gas y freno siempre; las ruedas de giro solo con el esquema de
      botones; y los cinco solo mientras se conduce, porque en pausa el HUD sigue encendido
      y brillarian bajo el velo invitando a pulsar algo que no responde. */
  paintPedals(){
    const p = $('pedals');
    if (!p) return;
    p.classList.toggle('btns', controls.activeScheme() === 'buttons');
    p.classList.toggle('ride', this.screen === 'game');
  }

  // en show(), al final del metodo (tras la linea 48):
    this.paintPedals();

### constants

- **name**: --pad-gap — **value**: 16px — **why**: Separacion entre mandos y respecto al borde. 16 px es la cota que hace que el error de puntería del pulgar a ciegas (desviacion tipica del centroide ~8 px) quede a ~2 sigma del borde del vecino, y ademas es lo minimo que evita que se fundan las dos sombras 'box-shadow: 0 6px 18px'. Como borde de pantalla, deja fuera los 4-8 px exteiores, poco fiables en moviles de canto curvo, y se suma a var(--sa-*) para no pisar la muesca ni la barra de inicio.
- **name**: --pad-gas — **value**: clamp(96px,21vmin,132px) — **why**: Minimo de 96 px: el minimo tactil de referencia es 44 px CSS (Apple HIG) y 48 dp (Material, y WCAG 2.5.5 AAA en 44), pero eso supone un toque MIRANDO y con el aparato quieto. Aqui se pulsa a ciegas, en movimiento, y fallar cuesta la partida, asi que se dobla. 21vmin y no vw/vh porque el escenario se gira por CSS; el maximo de 132 evita un boton absurdo en tableta.
- **name**: --pad-brake — **value**: clamp(80px,18vmin,110px) — **why**: Algo menor que el gas para que el pulgar los distinga por tamano sin mirar, pero por encima de los 76 px que hacen falta para un mando critico a ciegas. Se pulsa a rafagas, no en continuo, asi que tolera menos superficie.
- **name**: --pad-steer — **value**: clamp(76px,17vmin,100px) — **why**: 76 px es el suelo para dos mandos contiguos: con la huella de pulgar de ~38 px, un pad de 76 deja el borde a 2 anchos de huella del centro, asi que el centroide no se va al vecino. Solo se usan en el esquema de botones.
- **name**: --pad-horn — **value**: clamp(56px,12vmin,72px) — **why**: El mas pequeno porque es el unico no critico: una pulsacion puntual, nunca simultanea, y fallarla no cuesta nada. 56 supera los 48 dp de Material con margen, asi que sigue siendo un objetivo legitimo.
- **name**: SLOP_HOLD — **value**: 44 — **why**: Radio de fuga para soltar gas, freno y claxon. Mayor que cualquier deriva involuntaria del pulgar sobre un borde curvo (2-6 px) y bastante menor que la distancia libre al mando vecino (16 px de hueco mas el radio del vecino), asi que soltar exige una intencion clara y nunca se corta el gas por moverse.
- **name**: SLOP_SLIDE — **value**: 6 — **why**: Margen para las flechas de giro, donde deslizar de una a otra sin levantar SI es un gesto deseado. 6 px es lo justo para que el borde compartido no vibre con el temblor del dedo, y con un hueco de 16 px entre flechas el traspaso ocurre antes de llegar a la otra.
- **name**: vibrate — **value**: 12 ms — **why**: Por debajo de ~10 ms muchos Android ignoran la llamada; por encima de ~25 ms deja de leerse como un click y se percibe como zumbido, o sea como retardo. 12 ms es el pulso mas corto que se nota de forma fiable. Solo en la pulsacion, nunca al soltar.
- **name**: #rpm width — **value**: clamp(140px,34vmin,260px) — **why**: El cuadro se va al centro de abajo y tiene que caber entre los dos clusters. En el peor caso realista (568x320 en horizontal) el cluster derecho empieza en x=360 y el izquierdo acaba en 184; con 140 px la barra ocupa 214..354 y quedan 6 px libres a la derecha y 30 a la izquierda. Con el 46vw de antes ocupaba 159..409 y se comia los dos.
- **name**: #speedo .n font-size — **value**: clamp(38px,11vmin,68px) — **why**: Mismo maximo de 68 px que antes para no perder el efecto en tableta, pero medido en vmin. Con 12vw el mismo movil daba 101 px con el aparato en horizontal y 47 px con el aparato en vertical y el escenario rotado por CSS: dos velocimetros distintos en un solo telefono.

### pitfalls

- No aplicar mapPointer() a los mandos. Es la trampa numero uno en este codigo, porque mapPointer existe y esta justo al lado (controls.js:73-76). getBoundingClientRect() ya devuelve la caja CON la rotacion del escenario aplicada, y clientX/clientY tambien son de pantalla: comparar ambos funciona tal cual. Si se mapea uno de los dos, el mando se queda pulsado en cuanto la pagina se gira. Lo mismo con document.elementFromPoint, que respeta las transformaciones y por eso resuelve el traspaso entre flechas sin ninguna correccion.
- e.preventDefault() en pointerdown NO quita el menu contextual, ni el zoom por doble toque, ni el desplazamiento. Solo evita los eventos de raton de compatibilidad y el arrastre de seleccion. El codigo actual (controls.js:178) parece cubrirse con eso y no cubre nada de eso: el menu contextual es contextmenu mas -webkit-touch-callout, el zoom y el desplazamiento son touch-action, y el pellizco en iOS antiguo es gesturestart.
- Un solo booleano por mando se rompe con dos dedos sobre el mismo boton, que pasa cada vez que el jugador recoloca la mano sin darse cuenta. Hace falta un Set de pointerId y soltar solo cuando se vacia. Lo mismo por el otro lado: no comprobar pointerId en el pointerup (controls.js:178-179) hace que el segundo dedo apague el gas del primero.
- pointerleave es inservible como 'se solto': cero histeresis sobre un borde curvo. En tactil parece funcionar porque la captura implicita lo silencia hasta el pointerup, asi que el fallo NO se ve probando en el movil y si se ve en el emulador de escritorio, o al reves segun el navegador. Captura explicita mas radio de fuga es lo unico que se comporta igual en los dos.
- Ocultar un mando con display:none mientras esta pulsado (#pedals:not(.btns) .steer, disparado desde ui.js paintPedals al cambiar de esquema) no dispara pointerup ni pointerleave. El unico evento que llega es lostpointercapture, y solo si se habia llamado a setPointerCapture. Sin eso el giro se queda a tope para siempre y no hay forma de recuperarlo.
- Zumbir tambien al soltar. Duplica el gasto, y sobre todo el segundo pulso llega cuando el jugador ya esta mirando otra cosa, asi que se interpreta como una pulsacion fantasma. Y navigator.vibrate no existe en iOS Safari: hay que guardarlo, no hay sustituto y los apanos con <label> y un switch no funcionan.
- backdrop-filter en cinco elementos sobre un lienzo WebGL vivo obliga a copiar la zona compuesta una vez por elemento y por fotograma. En un Mali o un Adreno de gama media eso solo se lleva 6-10 ms de presupuesto y hunde el juego justo en el ajuste de calidad baja, que es el que lo activa el movil malo. Hay que apagarlo por calidad.
- clamp() en el tamano y numeros a pelo en la posicion es la combinacion que genero los cuatro solapes. Cualquier desplazamiento tiene que salir por calc() de la misma variable que da el tamano, o el layout solo es correcto en el extremo del clamp en el que se probo.
- vw y vh con el escenario girado por CSS miden la ventana FISICA, no el escenario. Cualquier medida del HUD tiene que ser vmin (lado corto, que coincide con el lado corto del escenario en los dos modos) o px. Ya rompe #speedo .n y #rpm, y rompe .panel.tall{max-height:min(74vh,640px)} en template.html:52, que en modo rotado pide 625 px dentro de un escenario de 390 px de alto.
- El toast esta en .toast{bottom:calc(78px + var(--sa-b))} (template.html:171), justo donde queda el cuadro nuevo. Hoy no coinciden porque el toast solo sale en menus y ajustes, con el HUD apagado, pero si algun dia se usa durante la partida hay que subirlo por encima de --pad-steer.
- No anadir los pads al click de ui.js:361 (e.target.closest('button')). Son div a proposito, y si se amplia el selector a .pad la muestra de click se dispara en cada golpe de gas y suena a ametralladora. El gas ya se confirma con el motor y el claxon con su propio efecto (game.js:172).
- No convertir los pads en <button>. Reciben el foco, dejan anillo de :focus-visible tapando la carretera y responden a Espacio y Enter, que ya estan cogidos por ui.bootReady (ui.js:79). div con role=button, aria-label y tabindex=-1 da la semantica sin ninguno de los tres problemas.

### verify

- Geometria sin navegador, que es lo que ya confirmo el diagnostico y sirve de no-regresion: reproducir en un script de Node las cajas de los cinco pads mas #dash a partir de los clamp() y los calc(), y afirmar que no hay ningun solape par a par en 568x320, 667x375, 844x390, 1180x820 y en el caso rotado 390x844 con --sa-l=47 y --sa-r=34. El estado actual da: gas contra velocimetro 76x76 en movil y 104x97 en tableta, freno sobre gas 86x8, flecha izquierda sobre derecha 6x92, y claxon a 2 px de la flecha derecha.
- Playwright, solapes reales medidos por el navegador (chromium no esta descargado en este entorno, hace falta 'npx playwright install chromium'): abrir index.html con ?debug=1, hasTouch:true, esperar a __rr, ejecutar __rr.ui.show('game'), y para cada par de #p-gas, #p-brake, #p-left, #p-right, #p-horn, #dash comprobar con getBoundingClientRect que la interseccion es nula. Repetir con page.setViewportSize en los cinco tamanos de arriba y con __rr.state.scheme='buttons' mas __rr.ui.paintPedals() para que aparezcan las flechas.
- Playwright, tamanos minimos: afirmar que todos los rect visibles miden >=56x56, y que #p-gas >=96, #p-brake >=80 y las flechas >=76. Y que el hueco minimo entre bordes de dos pads visibles es >=16.
- Playwright, acelerar y girar a la vez (la prueba central del multitactil): con CDP Input.dispatchTouchEvent y DOS touchPoints, uno en el centro de #p-gas y otro en el centro de #p-right, afirmar __rr.controls.input.throttle===1 y __rr.controls.input.steer>0 en el mismo fotograma. Antes del cambio esto no se puede ni escribir contra un manejador unico en el lienzo.
- Playwright, deriva del pulgar: touchStart en el centro de #p-gas, touchMove 20 px fuera del rect, afirmar throttle===1 (con pointerleave era 0); touchMove a 80 px fuera, afirmar throttle===0. Comprueba SLOP_HOLD por los dos lados.
- Playwright, segundo dedo sobre el mismo mando: dos touchPoints los dos dentro de #p-gas, levantar uno, afirmar que throttle sigue en 1 y que #p-gas conserva la clase press. Es el fallo de controls.js:178.
- Playwright, los dos giros a la vez: pulsar #p-left y #p-right, afirmar steer===0; soltar #p-right, afirmar steer<0 (con la version latida quedaba en 0 con la izquierda pulsada).
- Playwright, pausa con el gas pulsado: touchStart en #p-gas, click en #pausebtn, afirmar que __rr.game.mode==='pause' y que la moto no acelera; click en #b-resume SIN levantar el dedo, afirmar throttle===1 otra vez y que #p-gas sigue con press. Antes: press pegado y gas muerto.
- Playwright, mando oculto a media pulsacion: __rr.state.scheme='buttons', ui.paintPedals(), touchStart en #p-left, luego __rr.state.scheme='tilt' y ui.paintPedals() (display:none sobre .steer), afirmar que input.steer vuelve a 0 en el siguiente fotograma. Es lo que cubre lostpointercapture.
- Playwright, gestos del navegador: afirmar getComputedStyle(document.body).touchAction==='none' y userSelect==='none'; despachar un contextmenu sobre #p-gas y sobre #gl y afirmar que en los dos casos defaultPrevented es true; afirmar que getComputedStyle(pad).webkitTouchCallout es 'none'.
- Playwright, visibilidad por esquema: para scheme en tilt, touch y buttons afirmar que #p-gas, #p-brake y #p-horn son visibles y que #p-left y #p-right solo lo son con buttons; y que con __rr.ui.show('pause') los cinco tienen opacity 0 y pointerEvents none.
- Playwright, calidad baja: __rr.world.setQuality('low'), afirmar document.documentElement.dataset.q==='low' y que getComputedStyle(pad).backdropFilter==='none'.
- Captura visual de control: page.screenshot en 844x390 y en 1180x820, con scheme buttons y con scheme tilt, para ver de un vistazo que el velocimetro esta entero en el centro de abajo y que ningun pad pisa el cuadro ni otro pad.

## Coordenadas de puntero a traves de un envoltorio rotado por CSS (mapPointer, captura de puntero, pruebas con Playwright)

### area

Coordenadas de puntero a traves de un envoltorio rotado por CSS (mapPointer, captura de puntero, pruebas con Playwright)

### diagnosis

DEMOSTRACION: la matematica de mapPointer es CORRECTA, y lo he verificado a maquina.

`template.html:30` fija `#stage{position:fixed;left:0;top:0;transform-origin:0 0}` y `src/controls.js:82` aplica `transform:translateX(vw px) rotate(90deg)`. La lista de transformaciones se compone como producto de matrices de izquierda a derecha: M = T(W,0)·R(90). En el sistema del CSS (x a la derecha, y hacia ABAJO) un angulo positivo es horario en pantalla, asi que R(90)=[[0,-1],[1,0]]. Entonces:
  M = [[1,0,W],[0,1,0]] · [[0,-1,0],[1,0,0]] = [[0,-1,W],[1,0,0]]
  local (x,y) -> pantalla (W - y, x)   <- lo que dice el comentario de controls.js:102
Inversa: M^-1 = [[0,1,0],[-1,0,W]] -> x = clientY, y = W - clientX. Es exactamente `src/controls.js:105`.

Verificado en Chromium, no razonado a ojo: `getComputedStyle(stage).transform` devuelve `matrix(0, 1, -1, 0, 412, 0)` con el viewport de 412 px, o sea (a,b,c,d,e,f)=(0,1,-1,0,412,0), que aplicado a un punto da sx=a·x+c·y+e=W-y y sy=b·x+d·y+f=x. Y `new DOMMatrixReadOnly(...).inverse()` devuelve (0,-1,1,0,0,412), o sea x'=clientY e y'=412-clientX, componente por componente. Igual con 390 px. Rangos: local x en [0,stageW=vh] -> sy en [0,vh]; local y en [0,stageH=vw] -> sx en [0,vw]; medido, la envolvente del escenario es exactamente 412x915, cubre el viewport y no sobra ni falta un pixel.

Comprobado tambien de punta a punta en el juego real (index.html?debug=1, esquema 'touch'): con el escenario girado, un arrastre fisicamente HACIA ABAJO da input.steer=+0.163 y la moto se mueve +0.223 m; hacia arriba, -0.163 y -0.223. Sin girar, derecha +0.204 / izquierda -0.203. El signo es coherente en las dos orientaciones, asi que "controles en reversa" NO viene de aqui (viene del giroscopio y del ajuste invert, otras areas).

QUE SI ESTA MAL EN ESTE CODIGO:

1) `src/controls.js:103-106` — la inversa esta escrita a mano y acoplada por convenio al CSS de `src/controls.js:82`. Hoy cuadra; el dia que alguien ponga `rotate(-90deg)` o meta un escalado, mapPointer devuelve el eje al reves SIN AVISAR y el sintoma es literalmente "controles en reversa" solo en vertical. No es hipotetico en este fichero: `src/controls.js:90` ya cambio `none` por `rotate(0deg)` por otro motivo, y `src/controls.js:41` ya tuvo que introducir `stageW` cacheado porque leer innerWidth en caliente daba dos medidas distintas del mismo numero. Medido: con las metricas del viewport cambiadas sin relayout, el transform seguia en `translateX(412)` mientras innerWidth ya decia 1080; la formula a mano se iba 668 px, y la inversa de la matriz real no se movio.

2) `src/controls.js:210` — `drag` es local a `install()`, asi que `releaseAll()` (`src/controls.js:368`) NO puede anularlo. Un puntero CAPTURADO se salta el sondeo de impactos, o sea que la capa de pausa `.screen.on` (z-index 2, por encima del lienzo) no detiene el arrastre en curso. Reproducido: arrastrando (steer 0.446), se pausa -> releaseAll pone steer 0, se sigue arrastrando EN PAUSA -> steer 0.836, y al reanudar la moto sale con el manillar torcido. Con `drag` a nivel de modulo y anulado en releaseAll: 0.836 -> 0.

3) `src/controls.js:231-265` (bindButton) — falta la ultima red. Medido en Chromium: si el pad se saca del DOM mientras esta pulsado, el navegador le retira la captura y NO le manda NADA, ni `pointerup`, ni `pointercancel`, ni `lostpointercapture`; los eventos pasan al lienzo. El `held` se queda con el pointerId dentro y el gas se queda pegado a fondo para siempre. La prueba 7 falla en las 4 configuraciones probadas sobre el codigo actual. (El caso `display:none`, que es el que `src/controls.js:260-263` cubre, SI dispara `lostpointercapture`: eso ya esta bien.)

4) `src/controls.js:368-375` — `releaseAll()` limpia el estado logico pero no toca los pads: se quedan con la clase `.press` puesta y con el pointerId en `held`, asi que tras pausar con el dedo en el gas el circulo sigue pintado como pulsado y el siguiente `pointerup` no dispara `onUp`.

5) COMENTARIO EQUIVOCADO que invita a romper CSS correcto: `src/controls.js:92-94` y `template.html:14-17` dicen "lo que fisicamente es el borde superior pasa a ser el borde DERECHO del juego". Es al contrario. Medido: local (0,0) cae en pantalla en (412,0) y todo el borde local x=0 cae en sy=0, o sea el borde IZQUIERDO del juego es el borde superior fisico. El CSS de `template.html:18-21` esta BIEN (`--sa-l:env(safe-area-inset-top)`); es el comentario el que miente, y el riesgo es que alguien "arregle" el remapeo de muescas guiandose por el.

RESPUESTAS DIRECTAS A LAS PREGUNTAS:
- clientX/clientY llegan SIN transformar. Medido: pinchando en pagina (30,30) el manejador recibe client (30,30) con el escenario girado. pageX/pageY tambien crudos (aqui identicos, la pagina no hace scroll).
- offsetX/offsetY SI vienen ya en el espacio local del BLANCO: para client (30,30) el evento trae offset (30,382), que es exactamente lo que devuelve mapPointer. El navegador aplica la inversa por su cuenta. Dos avisos: Chromium los redondea a enteros (con client 100.0000076/300 dio offset 300/312 mientras la inversa exacta daba 311.99999237), y son relativos a la caja de relleno del BLANCO, no del escenario; aqui coinciden solo porque `template.html:32` pone `#gl{position:absolute;inset:0}` sin borde ni relleno.
- layerX/layerY NO valen: para el mismo evento dieron (-382,30), la coordenada del padre girado, negativa. Son ademas no estandar.
- getBoundingClientRect NO sirve para invertir: de un elemento girado devuelve la caja ENVOLVENTE alineada a los ejes. Medido con un marcador de 6x6 en local (0,0): rect.left=406, no 412; el origen local esta en rect.left+width. Con 90 grados exactos el CENTRO de la envolvente si coincide con el centro real (verificado: 859,356 por los dos caminos), lo que salva a Playwright, pero left/top ya no son ninguna esquina del elemento.
- getScreenCTM es solo de SVGGraphicsElement: no existe en un div HTML. Descartado.
- elementFromPoint SI conoce la transformacion: se le pasan coordenadas de CLIENTE y acierta el pad girado (medido, devuelve el span dentro de #p-gas). Sirve para sondear impactos, no para obtener coordenadas locales.
- devicePixelRatio no entra en mapPointer en absoluto: clientX/clientY y el transform estan los dos en px CSS. Verificado identico con dpr 1, 2, 2.625 y 3. El DPR solo vive en `src/world.js:253` (setPixelRatio) y `src/world.js:452-457` (clientWidth/clientHeight, que ya son px CSS).

### recommendation

Quedarse con la inversa a mano seria apostar a que nadie vuelve a tocar la linea del transform, y en este fichero ya se ha tocado dos veces. La via robusta no es getBoundingClientRect (da la envolvente, pierde el giro), ni getScreenCTM (solo SVG), ni elementFromPoint (sondea impactos, no da coordenadas): es invertir la matriz que el navegador tiene puesta DE VERDAD, con DOMMatrix, y cachearla.

Y cachearla sale gratis porque `layoutStage()` es el UNICO sitio del programa donde la transformacion cambia: se calcula la inversa una vez por relayout y `mapPointer` queda en seis multiplicaciones sin parsear CSS ni medir nada en caliente, que es lo que hace falta cuando puede haber 120 pointermove por segundo. Se aplican las componentes a pelo en vez de `transformPoint` para no crear un DOMPoint por evento. Se resta `stage.offsetLeft/offsetTop` (que el transform NO altera, verificado: 0,0 con offsetParent null en un elemento fijo) para que siga siendo correcto si algun dia el escenario deja de estar clavado en 0,0. Se deja la formula a mano como respaldo por si un navegador viejo no trae DOMMatrix, y se descarta una matriz sin inversa comprobando is2D y Number.isFinite (medido: `scale(0)` invertida sale con NaN e is2D false).

Sobre la captura, lo importante es entender que el tactil YA captura implicitamente: medido, un dedo que empieza en el pad se queda TODOS los eventos en el pad aunque se vaya al lienzo, y `pointerleave` no llega hasta DESPUES del pointerup (orden real: pointerup, lostpointercapture, pointerout, pointerleave). Es decir que `pointerleave` nunca sirvio como "se solto" en movil, y el `setPointerCapture` del lienzo en `src/controls.js:213` es un duplicado inofensivo en tactil (`gotpointercapture` salta igual sin llamarlo) que solo hace falta para raton y lapiz. El bindButton actual ya lo tiene bien resuelto con el conjunto `held` y `lostpointercapture`; lo que falta son las dos consecuencias menos evidentes de la captura: que un pad fuera del DOM no recibe absolutamente nada (hace falta escuchar tambien en la ventana), y que un puntero capturado ignora las capas de interfaz que se pongan encima (hace falta que releaseAll pueda matar el arrastre y soltar la captura).

Para probarlo con Playwright hay dos trampas que me han costado dos vueltas y conviene no repetir: pinchar en coordenadas de pagina "a ojo" acaba dando en el boton de pausa, que con el escenario girado cae donde uno no lo espera y deja el juego en pausa con la capa tapando el lienzo, de modo que todas las pruebas siguientes fallan por un motivo falso; y hay que entrar en partida ANTES de medir, porque cualquier `.screen.on` se come los punteros. La solucion es elegir los puntos en el espacio LOCAL, llevarlos a pantalla con la propia matriz y filtrarlos con `document.elementFromPoint` antes de pinchar. La prueba mas valiosa del guion no es que mapPointer de un numero concreto, sino que mapPointer coincide con `offsetX/offsetY` del propio evento: eso es un contraste independiente calculado por el navegador, y salta si la matematica de aqui y el CSS se separan.

He verificado el parche entero sobre una copia del proyecto en el borrador (no sobre el repo, porque otro agente esta editando src/controls.js ahora mismo: la version que hay en disco ya no es la que me pasaste, ya trae stageW cacheado, documentElement.clientWidth, coarsePointer y el bindButton con held). El diff de abajo esta hecho contra esa version en disco y compila con build.mjs sin tocar nada mas. Antes: 4 fallos de 28 comprobaciones y deriva de 0.836 en pausa. Despues: 28 de 28 y deriva 0.

### code

DIFF contra el src/controls.js que hay AHORA en disco (md5 2f19105233a5f683a9399967ed95a2e6).
Aplicado y verificado en /tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/rrfix/src/controls.js

--- a/src/controls.js
+++ b/src/controls.js
@@ -41,7 +41,14 @@ (junto a `let stageW = 0;`)
 let stageW = 0;
+/* Inversa de la transformacion que el navegador tiene puesta AHORA en el escenario, y esquina
+   sin transformar del propio escenario. Se recalculan solo en layoutStage, el unico sitio donde
+   la transformacion cambia, asi que mapear un puntero no parsea CSS ni mide nada en caliente. */
+let stageInv = null;
+let stageOx = 0, stageOy = 0;
 const keys = new Set();
+let drag = null;                // arrastre tactil en curso; aqui para poder anularlo al pausar
+let dragHost = null;            // el lienzo, para poder soltarle la captura
 let touchSteer = 0;
 let btnSteer = 0;
 const pedal = { gas:false, brake:false, horn:false };

@@ (final de layoutStage, ahora linea 95-97)
   document.documentElement.classList.toggle('rot', portrait);
+  refreshStageMatrix();
   return { w: stage.clientWidth, h: stage.clientHeight };
 }
 
+/** Cachea la inversa de la matriz que el navegador ACABA de aplicar al escenario. */
+function refreshStageMatrix(){
+  stageInv = null;
+  if (!stage) return;
+  /* offsetLeft/offsetTop dan la esquina SIN transformar y el transform no los altera.
+     getBoundingClientRect no sirve para esto: de un elemento girado devuelve la caja
+     envolvente alineada a los ejes, cuyo left/top ya no es ninguna esquina del elemento. */
+  stageOx = stage.offsetLeft;
+  stageOy = stage.offsetTop;
+  const css = getComputedStyle(stage).transform;
+  if (!css || css === 'none') return;                 // identidad: no hay nada que invertir
+  try {
+    const inv = new DOMMatrixReadOnly(css).inverse();
+    // una matriz sin inversa (un escalado a cero) sale con NaN: se descarta
+    if (inv.is2D && Number.isFinite(inv.a) && Number.isFinite(inv.f)) stageInv = inv;
+  } catch (e) { /* navegador sin DOMMatrix: queda la inversa a mano */ }
+}

@@ (mapPointer, lineas 103-106)
 export function mapPointer(e){
-  if (!rotated) return { x:e.clientX, y:e.clientY };
-  return { x:e.clientY, y:(stageW || innerWidth) - e.clientX };
+  const cx = e.clientX - stageOx;
+  const cy = e.clientY - stageOy;
+  /* Camino exacto: se invierte la matriz que el navegador tiene puesta, no una formula escrita
+     a mano. Si el CSS pasa a rotate(-90deg) o le entra un escalado, esto se ajusta solo; la
+     formula a mano seguiria dando el eje al reves sin avisar. Se aplican las componentes a
+     pelo en vez de transformPoint para no crear un DOMPoint en cada pointermove. */
+  if (stageInv)
+    return { x: stageInv.a * cx + stageInv.c * cy + stageInv.e,
+             y: stageInv.b * cx + stageInv.d * cy + stageInv.f };
+  if (!rotated) return { x:cx, y:cy };
+  return { x:cy, y:(stageW || innerWidth) - cx };
 }

@@ (install, linea 210)
   /* Zona de direccion tactil sobre el lienzo. ... */
-  let drag = null;
+  dragHost = canvas;
   canvas.addEventListener('pointerdown', e => {
     drag = { id:e.pointerId, x:mapPointer(e).x };
     try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
   });

@@ (antes de bindButton, linea 231)
+const pads = [];                // pads vivos, para poder soltarlos todos de golpe
+
 export function bindButton(el, onDown, onUp){

@@ (final de bindButton, linea 263-265)
   el.addEventListener('lostpointercapture', release);
   el.addEventListener('contextmenu', e => e.preventDefault());
+  /* Ultima red: si el pad se saca del DOM mientras esta pulsado, el navegador le quita la
+     captura y NO le manda NADA, ni pointerup ni pointercancel ni lostpointercapture (medido en
+     Chromium). El pointerup si llega a la ventana, asi que se escucha tambien ahi. */
+  addEventListener('pointerup', release);
+  addEventListener('pointercancel', release);
+  pads.push({ el, forceUp: () => {
+    if (!held.size) return;
+    held.clear();
+    el.classList.remove('press');
+    onUp();
+  } });
 }

@@ (releaseAll, linea 368)
 export function releaseAll(){
   keys.clear();
   pedal.gas = pedal.brake = pedal.horn = false;
   btnSteer = 0;
   touchSteer = 0;
+  /* Un puntero CAPTURADO se salta el sondeo de impactos: la capa de pausa esta por encima del
+     lienzo y aun asi los pointermove siguen llegando, asi que sin anular el arrastre el juego
+     seguia girando en pausa y volvia a la partida con el manillar torcido. */
+  if (drag && dragHost) try { dragHost.releasePointerCapture(drag.id); } catch (e) {}
+  drag = null;
+  // y los pads se sueltan de verdad: si no, se quedan con el .press puesto y el dedo dentro
+  for (const p of pads) p.forceUp();
   input.throttle = input.brake = input.steer = 0;
   input.horn = false;
 }

Nota: `release` como manejador de ventana es seguro porque empieza por `if (!held.delete(e.pointerId)) return;`. Sin esa guarda seria un bug nuevo: soltar el gas cancelaria el pad de giro que otro dedo tiene pulsado.

--------------------------------------------------------------------------
CORRECCION DE COMENTARIOS QUE MIENTEN (src/controls.js:92-94 y template.html:14-17).
El CSS de template.html:18-21 esta bien; el texto esta al reves. Medido: el borde IZQUIERDO
del juego es el borde superior fisico.

-  /* Las muescas de pantalla cambian de lado al girar: lo que fisicamente es el borde
-     superior pasa a ser el borde DERECHO del juego. Sin remapear, el HUD se aparta del
-     lado equivocado y queda pegado a la muesca. */
+  /* Las muescas cambian de lado al girar: local +x va a la pantalla hacia ABAJO y local +y
+     hacia la IZQUIERDA, asi que el borde superior fisico es el borde IZQUIERDO del juego y el
+     derecho fisico es el borde de ARRIBA del juego. Medido: local (0,0) cae en pantalla en
+     (W,0). Sin remapear, el HUD se aparta del lado equivocado y queda pegado a la muesca. */

--------------------------------------------------------------------------
GUION DE PRUEBA — guardar como tools/pointer.test.mjs y correr con
  node tools/pointer.test.mjs        (una vez: npx playwright install chromium)
Copia verificada en /tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/pointer.test.mjs
(28 comprobaciones: 4 fallos contra el codigo actual, 0 con el parche puesto)

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const url = 'file://' + path.join(root, 'index.html') + '?debug=1';
const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, msg + ' (' + a + ' vs ' + b + ')');

/* Se entra en partida ANTES de medir: mientras hay una .screen encima, esa capa se come los
   punteros y el lienzo no recibe nada, y todas las pruebas fallarian por un motivo falso. */
const enPartida = async page => {
  await page.waitForFunction(() => window.__rr, null, { timeout:60000 });
  await page.waitForFunction(() => document.getElementById('boot-go').classList.contains('on'),
                             null, { timeout:180000 });
  await page.evaluate(() => {
    window.__rr.state.scheme = 'touch';
    window.__rr.state.invert = false;
    window.__rr.ui.h.onPlay();
  });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__rr.game.mode), 'play', 'no se entro en partida');
};

let fallos = 0;
const caso = async (nombre, fn) => {
  try { await fn(); console.log('  ok  ' + nombre); }
  catch (e) { fallos++; console.log('FALLO ' + nombre + '\n      ' + String(e.message).split('\n')[0]); }
};

for (const [viewport, dpr, etiqueta] of [
  [{ width:412, height:915 }, 1,     'vertical dpr1'],
  [{ width:412, height:915 }, 2.625, 'vertical dpr2.625'],
  [{ width:390, height:844 }, 3,     'vertical iPhone dpr3'],
  [{ width:915, height:412 }, 2,     'horizontal dpr2'] ]){

  console.log('\n== ' + etiqueta + ' ' + viewport.width + 'x' + viewport.height + ' ==');
  const browser = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor:dpr, hasTouch:true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('      PAGEERROR ' + e.message));
  await page.goto(url);
  const rotado = viewport.height > viewport.width;
  const W = viewport.width;
  await enPartida(page);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id:1 }] });

  /* 1. La transformacion que el navegador tiene puesta es la que el codigo cree. */
  await caso('transform aplicado', async () => {
    const m = await page.evaluate(() => getComputedStyle(stage).transform);
    /* Sin girar, el escenario lleva rotate(0deg) a proposito (un transform distinto de none
       hace del envoltorio bloque contenedor de sus hijos fijos): la matriz es la identidad,
       no la cadena 'none'. */
    if (!rotado) return assert.ok(m === 'none' || m === 'matrix(1, 0, 0, 1, 0, 0)', m);
    assert.equal(m, 'matrix(0, 1, -1, 0, ' + W + ', 0)');
  });

  /* 2. La inversa de esa matriz ES exactamente x=clientY, y=W-clientX. Se contrasta la inversa
        que calcula el navegador contra la formula a mano: si algun dia el CSS pasa a
        rotate(-90deg), esta prueba salta y la formula a mano no se enteraria. */
  await caso('inversa del navegador == x:clientY y:W-clientX', async () => {
    if (!rotado) return;
    const r = await page.evaluate(() => {
      const inv = new DOMMatrixReadOnly(getComputedStyle(stage).transform).inverse();
      return [inv.a, inv.b, inv.c, inv.d, inv.e, inv.f];
    });
    [0,-1,1,0,0,W].forEach((v, i) => cerca(r[i], v, 1e-9, 'componente ' + i));
  });

  /* 3. clientX/clientY llegan SIN transformar; offsetX/offsetY YA vienen en local (el navegador
        aplica la inversa por su cuenta) y sirven de contraste independiente. layerX no vale. */
  await caso('clientX crudo, offsetX ya local, mapPointer coincide', async () => {
    await page.evaluate(() => {
      window.__ev = [];
      document.getElementById('gl').addEventListener('pointerdown', e => window.__ev.push({
        client:[e.clientX, e.clientY], offset:[e.offsetX, e.offsetY], layer:[e.layerX, e.layerY],
        page:[e.pageX, e.pageY], map: window.__rr.controls.mapPointer(e) }));
    });
    /* Los puntos se eligen en el espacio LOCAL y se llevan a pantalla con la propia matriz:
       pinchar a ojo en coordenadas de pagina acaba dando en el boton de pausa, que con el
       escenario girado cae donde uno no lo espera. */
    const pts = await page.evaluate(() => {
      const css = getComputedStyle(stage).transform;
      const m = new DOMMatrixReadOnly(css === 'none' ? 'matrix(1,0,0,1,0,0)' : css);
      const w = stage.clientWidth, h = stage.clientHeight;
      return [[0.3,0.5],[0.5,0.42],[0.68,0.55]].map(([fx,fy]) => {
        const p = m.transformPoint(new DOMPoint(fx*w, fy*h));
        return [Math.round(p.x), Math.round(p.y)];
      }).filter(([x,y]) => document.elementFromPoint(x,y)?.id === 'gl');
    });
    assert.equal(pts.length, 3, 'los puntos de prueba no caen sobre el lienzo');
    for (const [x,y] of pts) await page.mouse.click(x, y);
    const ev = await page.evaluate(() => window.__ev);
    assert.equal(ev.length, pts.length, 'no llegaron todos los pointerdown al lienzo');
    ev.forEach((e, i) => {
      cerca(e.client[0], pts[i][0], 1, 'clientX venia transformado');
      cerca(e.client[1], pts[i][1], 1, 'clientY venia transformado');
      cerca(e.page[0], pts[i][0], 1, 'pageX venia transformado');
      cerca(e.map.x, e.offset[0], 1, 'mapPointer.x no cuadra con offsetX');
      cerca(e.map.y, e.offset[1], 1, 'mapPointer.y no cuadra con offsetY');
      if (rotado){
        cerca(e.map.x, pts[i][1], 1, 'local x deberia ser clientY');
        cerca(e.map.y, W - pts[i][0], 1, 'local y deberia ser W-clientX');
        assert.ok(e.layer[0] < 0, 'layerX ya no es basura: revisar la suposicion');
      }
    });
  });

  /* 4. elementFromPoint SI conoce la transformacion. getBoundingClientRect da la ENVOLVENTE,
        pero con 90 grados exactos su centro si coincide con el centro real. */
  await caso('elementFromPoint acierta el pad girado', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('p-gas');
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width/2, b.top + b.height/2);
      return { hit: hit && hit.closest('#p-gas') ? 'p-gas' : (hit && hit.id),
               local:[el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight] };
    });
    assert.equal(r.hit, 'p-gas', 'la caja envolvente no cae sobre el pad');
    const c = await page.evaluate(() => {
      const css = getComputedStyle(stage).transform;
      const b = document.getElementById('p-gas').getBoundingClientRect();
      const inv = new DOMMatrixReadOnly(css === 'none' ? 'matrix(1,0,0,1,0,0)' : css).inverse();
      const p = inv.transformPoint(new DOMPoint(b.left + b.width/2, b.top + b.height/2));
      return [p.x, p.y];
    });
    cerca(c[0], r.local[0] + r.local[2]/2, 1, 'centro local x');
    cerca(c[1], r.local[1] + r.local[3]/2, 1, 'centro local y');
  });

  /* 5. El signo del giro TAL COMO LO VE EL JUGADOR: la direccion "derecha" en pantalla se saca
        de la propia matriz, no se supone. Con el escenario girado, la derecha del jugador es
        fisicamente HACIA ABAJO en el movil. */
  await caso('arrastre a la derecha del jugador -> giro a la derecha', async () => {
    const dir = await page.evaluate(() => {
      const css = getComputedStyle(stage).transform;
      const m = new DOMMatrixReadOnly(css === 'none' ? 'matrix(1,0,0,1,0,0)' : css);
      const o = m.transformPoint(new DOMPoint(0,0)), p = m.transformPoint(new DOMPoint(100,0));
      return { dx:(p.x - o.x)/100, dy:(p.y - o.y)/100 };
    });
    const cx = W/2, cy = viewport.height/2;
    const swipe = async k => {
      await page.evaluate(() => window.__rr.controls.releaseAll());
      const x0 = cx - dir.dx*140*k, y0 = cy - dir.dy*140*k;
      await touch('touchStart', x0, y0);
      for (let i = 1; i <= 8; i++)
        await touch('touchMove', x0 + dir.dx*280*k*i/8, y0 + dir.dy*280*k*i/8);
      const s = await page.evaluate(() => window.__rr.controls.input.steer);
      await touch('touchEnd', x0 + dir.dx*280*k, y0 + dir.dy*280*k);
      return s;
    };
    const der = await swipe(1), izq = await swipe(-1);
    assert.ok(der > 0.05, 'a la derecha no gira a la derecha: ' + der.toFixed(3));
    assert.ok(izq < -0.05, 'a la izquierda no gira a la izquierda: ' + izq.toFixed(3));
  });

  /* 6. Captura implicita: un dedo que empieza en el gas se queda TODOS los eventos en el pad
        aunque salga al lienzo, asi que el gas tiene que soltarse igual. */
  await caso('gesto pad->lienzo suelta el gas y no lo deja pintado', async () => {
    await page.evaluate(() => window.__rr.controls.releaseAll());
    const g = await page.evaluate(() => { const b = document.getElementById('p-gas').getBoundingClientRect();
      return { x:b.left + b.width/2, y:b.top + b.height/2 }; });
    await touch('touchStart', g.x, g.y);
    await page.evaluate(() => window.__rr.controls.update(0.016));
    const enPad = await page.evaluate(() => window.__rr.controls.input.throttle);
    await touch('touchMove', W/2, viewport.height/2);
    await touch('touchEnd', W/2, viewport.height/2);
    await page.evaluate(() => window.__rr.controls.update(0.016));
    const tras = await page.evaluate(() => ({
      gas: window.__rr.controls.input.throttle,
      press: !!document.querySelector('#p-gas.press') }));
    assert.equal(enPad, 1, 'el pad de gas no acelero');
    assert.equal(tras.gas, 0, 'el gas se quedo pegado tras salir del pad');
    assert.equal(tras.press, false, 'el pad se quedo pintado como pulsado');
  });

  /* 7. El pad fuera del DOM en mitad del gesto: el navegador le quita la captura y NO le manda
        pointerup, ni pointercancel, ni lostpointercapture. Sin red, gas pegado para siempre. */
  await caso('pad sacado del DOM en mitad del gesto no deja el gas pegado', async () => {
    await page.evaluate(() => window.__rr.controls.releaseAll());
    const g = await page.evaluate(() => { const b = document.getElementById('p-gas').getBoundingClientRect();
      return { x:b.left + b.width/2, y:b.top + b.height/2 }; });
    await touch('touchStart', g.x, g.y);
    await page.evaluate(() => { const e = document.getElementById('p-gas'); window.__pad = e; e.remove(); });
    await touch('touchMove', W/2, viewport.height/2);
    await touch('touchEnd', W/2, viewport.height/2);
    await page.evaluate(() => window.__rr.controls.update(0.016));
    const gas = await page.evaluate(() => window.__rr.controls.input.throttle);
    await page.evaluate(() => document.getElementById('pedals').appendChild(window.__pad));
    assert.equal(gas, 0, 'gas pegado: el pad no recibio ni pointerup ni pointercancel');
  });

  await browser.close();
}
console.log('\n' + (fallos ? fallos + ' FALLOS' : 'todo correcto'));
process.exit(fallos ? 1 : 0);

--------------------------------------------------------------------------
PRUEBA APARTE de la deriva en pausa (la del defecto 2). Antes: 0.836. Despues: 0.
Copia en .../scratchpad/pausedrag.mjs

await multi('touchStart', [{x:206,y:300,id:1}]);
await multi('touchMove',  [{x:206,y:420,id:1}]);          // steer 0.446, mode play
await page.evaluate(() => window.__rr.ui.h.onPause());     // steer 0, pantalla pause
await multi('touchMove',  [{x:206,y:560,id:1}]);
await multi('touchMove',  [{x:206,y:700,id:1}]);
// el puntero capturado se salta la capa de pausa: sin el parche, steer 0.836 EN PAUSA
assert.equal(await page.evaluate(() => window.__rr.controls.input.steer), 0);

### constants

- **name**: matrix del escenario girado = (0, 1, -1, 0, W, 0) — **value**: a=0 b=1 c=-1 d=0 e=W f=0 — **why**: Es lo que devuelve getComputedStyle(stage).transform con translateX(W) rotate(90deg) y origen 0 0 (medido con W=412 y W=390). De ahi sale pantalla=(W-y, x) y la inversa x=clientY, y=W-clientX. Si esta tupla cambia, mapPointer escrito a mano deja de valer sin dar ningun sintoma salvo el eje al reves.
- **name**: inversa = (0, -1, 1, 0, 0, W) — **value**: a=0 b=-1 c=1 d=0 e=0 f=W — **why**: Lo que devuelve DOMMatrixReadOnly(...).inverse() en Chromium. Aplicado como x=a·sx+c·sy+e e y=b·sx+d·sy+f da exactamente clientY y W-clientX: es la prueba de la inversa a mano, componente por componente.
- **name**: tolerancia al comparar mapPointer con offsetX/offsetY — **value**: 1 px — **why**: Chromium devuelve offsetX/offsetY redondeados a entero: medido, con clientX=100.00000762939453 el offset salio 300/312 mientras la inversa exacta daba 311.99999237. Con 1 px de holgura el contraste sigue detectando un eje invertido (error de cientos de px) y no salta por el redondeo.
- **name**: tolerancia al comparar componentes de matriz — **value**: 1e-9 — **why**: La inversa sale exacta salvo el signo del cero: medido, la componente e vale -0 y un deepEqual estricto falla contra 0. Comparar por diferencia absoluta lo resuelve sin aflojar la prueba.
- **name**: umbral de signo del giro en la prueba de arrastre — **value**: 0.05 de input.steer — **why**: Un arrastre de 280 px en el eje que ve el jugador produce 0.45 medido en el juego real. 0.05 deja 9 veces de margen y sigue fallando en el unico caso que importa, que es que el signo se invierta.
- **name**: ganancia del arrastre (ya en controls.js:220) — **value**: 3.4 / max(240, stage.clientWidth) — **why**: Con el escenario girado clientWidth vale el ALTO de la pantalla (915 medido), o sea el mismo eje en el que mapPointer devuelve la x local, asi que la ganancia es coherente en las dos orientaciones. Da 0.00372 por px: tope de giro en 269 px de recorrido. El suelo de 240 evita que en una ventana diminuta un dedo de 30 px llegue a tope.
- **name**: devicePixelRatio dentro de mapPointer — **value**: 0 usos — **why**: clientX/clientY y el transform CSS estan los dos en px CSS, asi que el DPR no entra. Verificado identico con 1, 2, 2.625 y 3. Mezclar aqui canvas.width (px de dispositivo) multiplicaria el mapeo por el DPR.
- **name**: reintentos de relayout tras orientationchange (main.js:142-146) — **value**: 0, 180 y 500 ms — **why**: El navegador informa del tamano nuevo con retardo. Como la inversa se recalcula DENTRO de layoutStage, los tres reintentos la refrescan solos; si se cacheara en otro sitio habria una ventana de hasta 500 ms con la inversa mintiendo.

### pitfalls

- Un puntero CAPTURADO se salta el sondeo de impactos: poner una capa de interfaz encima del lienzo NO detiene un arrastre en curso. Reproducido en el juego: con la pantalla de pausa puesta, input.steer subio a 0.836 mientras el dedo seguia deslizando, y al reanudar la moto salio girando. La unica salida es que releaseAll anule el arrastre y suelte la captura.
- Si el elemento del boton se saca del DOM mientras esta pulsado, el navegador NO le manda nada: ni pointerup, ni pointercancel, ni lostpointercapture. Medido en Chromium: los eventos pasan al lienzo y el pad se queda con el pointerId dentro para siempre. En cambio display:none SI dispara lostpointercapture, asi que probando solo ese caso el fallo no se ve.
- pointerleave no sirve como 'se solto' en movil. Con captura implicita llega DESPUES del pointerup (orden medido: pointerup, lostpointercapture, pointerout, pointerleave), asi que con el dedo parece funcionar solo por casualidad; con raton, ademas, un temblor de dos pixeles sobre un borde curvo suelta el gas.
- El setPointerCapture del lienzo es un duplicado en tactil: gotpointercapture salta igual sin llamarlo, porque el navegador captura implicitamente los punteros directos. Solo hace falta para raton y lapiz. Quitarlo pensando que 'ya lo hace el navegador' rompe el escritorio.
- getBoundingClientRect de un elemento girado da la caja ENVOLVENTE alineada a los ejes: medido, un marcador de 6x6 en local (0,0) da rect.left=406 y no 412. left/top ya no son ninguna esquina del elemento, asi que restarlos de clientX para 'sacar coordenadas locales' es el error clasico. Con 90 grados exactos el CENTRO si se salva, y por eso locator.click de Playwright funciona; con cualquier otro angulo no.
- layerX/layerY dan la coordenada respecto del padre girado y salen negativas (medido -382 para un punto perfectamente dentro del lienzo). Ademas no son estandar. offsetX/offsetY si vienen ya en local, pero son relativas al BLANCO del evento, coinciden con el escenario solo porque #gl esta con inset:0 sin borde ni relleno, y Chromium las redondea a entero.
- getScreenCTM no existe en un div: es de SVGGraphicsElement. Buscarlo en #stage devuelve undefined y no hay equivalente HTML salvo DOMMatrix sobre el transform calculado.
- innerWidth y clientX pueden vivir en espacios distintos. En Chromium innerWidth sigue al viewport de MAQUETACION y aguanta la pinza (medido: innerWidth 412 con visualViewport.width 228.9 al 1.8x, y clientX en el espacio de 412). En iOS Safari innerWidth sigue al viewport VISUAL, y iOS ignora user-scalable=no desde la version 10, o sea que el meta de template.html:2 no protege: en cuanto el jugador hace pinza, innerWidth encoge, clientX no, y el dedo se mapea desplazado. documentElement.clientWidth es el que esta en el mismo espacio que clientX en los dos motores; controls.js ya lo usa para colocar, y mapPointer no debe reintroducir innerWidth.
- Leer una metrica en caliente en mapPointer y otra al colocar el escenario son dos medidas independientes del mismo numero. Medido: con las metricas cambiadas sin relayout, el transform seguia en translateX(412) mientras innerWidth ya decia 1080; la formula a mano se iba 668 px y la inversa de la matriz real no se movio ni un pixel.
- No hace falta ningun ajuste por devicePixelRatio: clientX/clientY y el transform estan los dos en px CSS, verificado igual con dpr 1, 2, 2.625 y 3. Lo que si rompe es meter aqui canvas.width o el tamano del renderer, que van en px de dispositivo.
- Probando con Playwright, pinchar en coordenadas de pagina 'a ojo' acaba dando en el boton de pausa: con el escenario girado, (W-25, H-25) cae en el #pausebtn, que esta en el local arriba-derecha. El juego se pausa, la capa tapa el lienzo y las cinco pruebas siguientes fallan por un motivo inventado. Hay que elegir los puntos en local, llevarlos a pantalla con la matriz y filtrarlos con elementFromPoint.
- Mientras haya una .screen con la clase on, esa capa se come todos los punteros y el lienzo no recibe nada: cualquier prueba de arrastre tiene que entrar en partida primero.
- elementFromPoint devuelve el descendiente mas profundo, no el boton: sobre #p-gas devuelve el span de dentro. Comparar con ===id da un falso fallo; hay que usar closest.
- Anadir un manejador de ventana para soltar los botones sin filtrar por pointerId introduce un bug nuevo de multitactil: soltar el gas cancelaria el pad de giro que el otro dedo tiene pulsado. La guarda if (!held.delete(e.pointerId)) return es obligatoria.
- El comentario de controls.js:92-94 y template.html:14-17 dice que el borde superior fisico pasa a ser el borde DERECHO del juego, y es al contrario: es el IZQUIERDO. El CSS de las muescas esta bien; el peligro es que alguien lo 'arregle' fiandose del comentario.

### verify

- Guardar el guion como redline-rider/tools/pointer.test.mjs, compilar con `cd redline-rider && node build.mjs`, y correr `node tools/pointer.test.mjs`. Son 7 comprobaciones x 4 configuraciones (412x915 dpr1, 412x915 dpr2.625, 390x844 dpr3, 915x412 dpr2), todo sin cabeza sobre file:// con --use-gl=swiftshader. Contra el codigo de hoy salen 4 fallos, todos el mismo: 'pad sacado del DOM en mitad del gesto no deja el gas pegado'. Con el parche puesto: 28 de 28 y 'todo correcto'. Ya ejecutado en las dos versiones.
- Prueba especifica de la deriva en pausa (.../scratchpad/pausedrag.mjs): touchStart+touchMove en el lienzo, ui.h.onPause(), dos touchMove mas y leer input.steer. Antes 0.836 con la pantalla de pausa delante; despues 0, y game.x ya no se mueve al reanudar.
- Contraste independiente que no depende de la matematica de aqui: en cada pointerdown sobre #gl, comparar mapPointer(e) con e.offsetX/e.offsetY con 1 px de holgura. Lo calcula el navegador aplicando su propia inversa, asi que si el CSS del transform y la formula de controls.js se separan, esta comprobacion salta sola.
- Contraste de la inversa contra el navegador: `new DOMMatrixReadOnly(getComputedStyle(stage).transform).inverse()` tiene que dar (0,-1,1,0,0,W) componente por componente con 1e-9. Es la prueba de regresion que hace que cambiar el CSS a rotate(-90deg) falle en vez de pasar en silencio.
- Signo del giro sin suponer la orientacion: sacar el vector 'derecha del jugador' de la propia matriz (m.transformPoint de (100,0) menos (0,0)) y arrastrar en ese eje. Debe dar input.steer > 0.05 y el opuesto < -0.05. Medido en el juego real: +0.163/-0.163 en vertical (arrastre fisicamente vertical) y +0.204/-0.203 en horizontal.
- Comprobar en la propia pagina, con la consola, que la caja del pad girado no se puede usar para invertir: `const b=$('p-gas').getBoundingClientRect()` frente a `[$('p-gas').offsetLeft, offsetTop]`. Con 412 px de ancho da AABB (16,819) y local (819,316): el intercambio de ejes se ve a simple vista.
- Sanidad de la inversa cacheada tras girar el aparato: llamar a layoutStage(), luego mapPointer con un evento sintetico y comprobar que sigue coincidiendo con offsetX. Vale para verificar que los tres reintentos de main.js:142-146 refrescan de verdad la matriz cacheada.

## Encuadre en primera persona: puesto del piloto, campo de vision, normalizacion de los GLB y orientacion del trafico (src/world.js)

### area

Encuadre en primera persona: puesto del piloto, campo de vision, normalizacion de los GLB y orientacion del trafico (src/world.js)

### diagnosis

Medido sobre los propios GLB y sobre el juego en marcha con Playwright + SwiftShader (guion en /home/user/General-Assets-Games/redline-rider/tools/frame-test.mjs). Las lineas son las del commit b1c5883, que es el build que jugo el jugador.

1) LA MOTO NO ESTA MAL COLOCADA: ES QUE SE VA DEL CENTRO EN CADA CURVA. src/world.js:406-420 (setRider) tumba la moto con bg.rotation.z = -lean*0.5 y el pivote esta en y=0, o sea en la huella de los neumaticos, mientras la camara se queda clavada en camera.position.x = x. Un punto del deposito a 1,14 m de altura se desplaza 1,14*sin(21 grados) = 0,41 m mientras el ojo no se mueve. Medido con la silueta real: el centro de la moto se va al 11%, 17% y 21% del ancho de pantalla (movil apaisado, movil vertical, escritorio) con 21 grados de inclinacion. Recto esta centrada al 0,0%. Eso es exactamente "lo mal ubicada la moto": recta bien, curva torcida.

2) EL PUESTO ES UNA CAMARA DE PERSECUCION, NO UN CASCO. src/world.js:74-76: EYE_Z = 0.62. La moto normalizada mide 2,05 m centrada en z=0 (morro z=-1,025, cola z=+1,025) y el ASIENTO medido en la malla esta en z=+0,256, y=0,875 (es el minimo de la linea superior entre el deposito y el colin). El ojo en +0,62 queda 0,36 m DETRAS del asiento y 0,15 m por delante del colin: se ve la moto entera desde arriba y por detras. Medido: la silueta cubre el 5,6% del fotograma con el borde superior al 58% del alto en el movil.

3) EL PLANO CERCANO NUNCA RECORTO LA MOTO, Y EL COMENTARIO QUE LO AFIRMA ES FALSO. src/world.js:65-76 justifica NEAR = 0.12 diciendo que 0,25 recortaba el deposito. Medido con el puesto ANTERIOR (EYE 1,32 / 0,20 y near 0,25) el vertice mas cercano de la malla esta a 0,358 m; con el puesto de HEAD, a 0,361 m. No habia recorte ni con 0,25 ni con 0,30. Bajar a 0,12 solo tira precision de profundidad (near/far pasa de 1520 a 3167) a cambio de nada. Lo que se ve mal a 0,20 no es un recorte, es la perspectiva: con el manillar a 0,63 m del ojo y 0,18 m por debajo, se le ve desde encima.

4) OJO DE PEZ. src/world.js:63 (FOV = 74) y :422 (fov = FOV + speedFrac*14) fijan el campo VERTICAL. three.js deriva el horizontal de la relacion de aspecto, asi que medido: 117,1 grados horizontales en 1280x720 y 126,7 en un movil apaisado de 932x430 a 143 km/h. Ademas el juego se presenta girado por CSS, asi que el lienzo mide 2,17 tanto con el movil en vertical como en horizontal: el ojo de pez es el caso normal, no el raro.

5) EL CABECEO ES UN INTERRUPTOR QUE PARPADEA CON CADA MARCHA. src/game.js:215 pasa accel*60 y dec*20 a src/world.js:412, que hace clamp(accel*0.012 - brake*0.03, -0.05, 0.035). En primera el empuje ronda 11 m/s2, o sea 660 de entrada, y 660*0,012 = 7,9 rad: el clamp esta SIEMPRE saturado. Resultado: +2,0 grados con gas, -2,9 grados frenando, sin nada en medio y sin resorte. Y en src/game.js:181-183 cada cambio de marcha pone torque = 0 durante SHIFT_TIME, con lo que accel cae a 0 y el cabeceo salta 5 grados en un fotograma, seis veces por aceleron.

6) EL TEMBLOR ES RUIDO BLANCO EN LA POSICION. src/world.js:415-419 mueve camera.position con (Math.random()-0.5)*shake*0.25 en X y en Y. Con shake 1,6 (choque, :453) son +-0,2 m de teleporte por fotograma, sin correlacion entre fotogramas. Eso es lo que marea, mas que el campo de vision.

7) LOS MODELOS ESTAN A ESCALA EQUIVOCADA Y EL AUTOBUS OCUPA DOS CARRILES. src/world.js:296-298 escala uniformemente por la LONGITUD. Los seis GLB salen del mismo generador normalizados a una caja fija: los seis miden 1,897 unidades en X (min -0,95, max +0,948), asi que su seccion NO lleva proporcion real. Escalando por longitud sale, frente a la caja declarada en :40-47: bike +15% de ancho / -5% de alto, sedan +16/+18, suv +29/+33, van +35/+44, truck +25/+19, bus +59/+54. El autobus se renderiza de 4,06 m de ancho y 4,78 m de alto con un colisionador de 2,55 x 3,10 en un carril de 3,60: el jugador lo atraviesa a la vista y se le puntua un roce, porque src/game.js:133-134 saca halfW de userData.size, que en :312 es la caja DECLARADA, no la medida. La sombra de contacto (:364, s.wid*1.7) mide 4,34 m: por si sola invade el carril de al lado.

8) _prepare NO AVERIGUA EL MORRO Y NUNCA PODRA HACERLO SOLO. src/world.js:301 gira solo si size.x > size.z y aplica el yaw declarado en :56. El giro declarado (-90 grados, morro a -Z) es CORRECTO para bike, sedan, suv, truck y bus: comprobado con la rebanada mas ancha del eje largo (los espejos y el manillar, que van siempre por delante del centro), que cae en la fraccion 0,38 / 0,38 / 0,38 / 0,04 / 0,04 contando desde el morro. Pero en van.glb cae en 0,71: su carroceria trasera mide 2,70 y los espejos 2,64, y la heuristica se invierte por un 2%. Las otras medidas que uno pensaria usar no sirven de nada: la correlacion largo/alto sale -0,20 en la moto, +0,15 en el sedan, -0,26 en el autobus y -0,04 en el camion (el techo esta detras en un coche y el manillar delante en una moto: el signo depende de la CLASE), y el reparto de masa en la mitad delantera sale entre 0,51 y 0,60 en los seis, o sea ruido.

9) EN EL ARBOL DE TRABAJO YA ESTA APLICADA ESTA CORRECCION (alguien la recogio en caliente) CON UN DEFECTO GRAVE PENDIENTE: src/world.js:532 dice amp = (SHAKE_DEG*(0.25+0.75*speedFrac) + this.shake*12)*DEG. Con shake 1,6 son 19,2 grados de ruido en cabeceo, guinada y balanceo. Medido antes de corregirlo: tras un choque la camara se quedaba con pitch -20,0 grados y el horizonte al 13% del alto. Tiene que ser this.shake*2.5 (4 grados como maximo).

### recommendation

El ojo va a EYE_Y = 1,38 m y EYE_Z = +0,48 m, mirando 3,5 grados hacia abajo, con el campo de vision definido en HORIZONTAL (86 grados en reposo, 96 a fondo) y el vertical derivado de la relacion de aspecto.

De donde sale la altura. El asiento de la malla esta medido a 0,875 m (minimo de la linea superior entre deposito y colin, en z=+0,256) y la altura de ojos de un piloto sentado con casco es de 0,60 a 0,70 m sobre el asiento con postura deportiva, o sea 1,48-1,58 m sobre el asfalto: eso es el numero honesto, y es la razon por la que en una moto se ve por encima del techo de un turismo (1,45 m). Pero el asset es una moto EXTERIOR, no una cabina: no hay manillar, espejos ni cuadro modelados para primer plano, y la unica geometria disponible a la altura de la vista es la punta del manillar, a 1,137 m en z=-0,427. Con el ojo a 1,50 esa punta queda 25 grados por debajo del eje de vision y hace falta cabecear 11 grados hacia abajo para meterla en el fotograma, lo que manda el horizonte al 70% del alto. Lo he calculado y lo he medido: con este asset, anatomia correcta y campo de vision sano son incompatibles. Asi que se baja el ojo a 1,38 (6-10 cm de trampa) y se echa 0,22 m por detras del asiento (frente a los 0,36 m de HEAD). El resultado medido es un encuadre de casco de manual: la moto cubre el 5,7-6,6% del fotograma, su borde superior cae al 71-75% del alto, llega al borde inferior y el horizonte queda al 46-49%. Si en algun momento se anade una cabina (manillar + espejos + cuadro, 60 lineas de cajas y cilindros colgadas de bikeGroup a 1,05-1,20 m de altura y z entre -0,35 y -0,60), entonces si se puede subir el ojo a 1,48 y quitar la trampa: es el arreglo bueno, y este es el arreglo que se puede hacer hoy.

El balanceo se arregla haciendo que el ojo acompane al chasis, y el factor sale de la geometria, no del gusto: la moto gira sobre la huella de los neumaticos, un punto a altura h se desplaza -h*sin(t), y el desplazamiento APARENTE de la cabina respecto al ojo es (h_cabina - k*EYE_Y)*sin(t). Con h_cabina = 1,137 (manillar) y EYE_Y = 1,38, k = 1,137/1,38 = 0,82: con LEAN_SWAY = 0,80 el deposito se queda quieto en el centro del encuadre y el 20% que falta es la cabeza del piloto, que se mantiene mas vertical que la moto, que es justo lo que hace un piloto de verdad. Medido: el desvio en curva pasa de 11-21% a -2,0/-2,3%. Cuidado con el signo: con el signo al reves el desvio se DUPLICA (medido 31% con k=0,35 mal firmado), y es un error que no se ve en una captura estatica.

El campo de vision se fija en horizontal. 74 grados verticales son 106 en 16:9 y 127 en un movil apaisado; fijando 86-96 horizontales el vertical sale 52,6 en el movil y 62,1 en escritorio, y la carretera se ve igual de ancha en los dos, que es lo que permite que un jugador de movil y uno de escritorio compartan puntuaciones. Se le pone un techo VFOV_MAX = 78 para que una ventana estrecha de escritorio no se vaya a 90 grados verticales. La apertura con la velocidad se queda en 10 grados horizontales sobre todo el rango de velocidad y pasa por un filtro de primer orden con tau = 0,35 s: se nota al acelerar y no bombea al soltar el gas ni al frenar.

El plano cercano sube a 0,20 (el vertice mas cercano esta medido a 0,37-0,38 m: mas del doble de margen) y con eso se recupera precision de profundidad para las calcomanias de sombra a y=0,02 sobre el asfalto a y=0. Que no se vea el interior de la malla ya esta resuelto en src/world.js:284, que fuerza m.side = THREE.FrontSide en cada material: con descarte de caras traseras nunca se ve el interior del deposito. La regla es no poner DoubleSide en nada del vehiculo (el cielo si, es BackSide a proposito) y no meter la moto en una segunda pasada con su propia camara y su propio near, que es el truco habitual, porque con niebla activa la pasada extra la aplicaria dos veces.

En _prepare, la escala se ajusta por EJE a la caja declarada para el trafico (fit:'box') y por longitud para la moto (fit:'len'). El trafico es lo que el jugador juzga con el ancho (el sistema de puntuacion entero vive de holguras laterales de 1,20 / 0,80 / 0,45 m, src/game.js:21-22), asi que la malla tiene que medir EXACTAMENTE lo que mide el colisionador; que el autobus quede un poco estirado a lo largo es invisible a 200 km/h y visto por detras. La moto se ajusta por longitud porque ahi el que sobresalga el manillar es lo normal y correcto. Y _prepare escribe en userData.size la caja MEDIDA, no la declarada, de forma que src/game.js:133-134 y las sombras y halos de spawnVehicle se atan al pixel.

Para el trafico, el jugador ve los coches POR DETRAS: el trafico circula en el mismo sentido que el jugador (src/game.js:227, v.z += (this.speed - v.speed)*dt), asi que su morro tiene que apuntar a -Z igual que el de la moto y rotation.y se queda en 0. La forma de no equivocarse no es adivinarlo: se DECLARA por modelo (spec.yaw, que ya existe) y se comprueba de dos maneras independientes. Primera, un aviso en carga con la heuristica de la rebanada mas ancha, que acierta en cinco de los seis modelos y solo canta cuando no cuadra. Segunda, la prueba de pantalla: el guion proyecta el eje -Z de cada vehiculo de delante y comprueba que se APARTA de la camara; eso caza un rotation.y mal puesto en ejecucion (por ejemplo el dia que se anada carril contrario, que necesita rotation.y = PI), pero no puede descubrir la convencion del asset. Para eso hace falta mirar una vez la hoja de contactos (tools/probe_models.mjs, del agente de modelos) y congelar el resultado en MODELS. van.glb es el que hay que mirar a mano: su heuristica sale invertida.

### code

Nota: el arbol de trabajo ya trae casi todo esto aplicado (alguien lo recogio mientras lo medía). Lo que SIGUE MAL y hay que cambiar hoy es el punto 0. El resto queda como referencia del estado objetivo, verificado.

=== 0) src/world.js:532 — LO UNICO QUE FALTA, y es grave ===

-    const amp = (SHAKE_DEG * (0.25 + 0.75 * speedFrac) + this.shake * 12) * DEG;
+    /* 2,5 grados por unidad de sacudida: con addShake(1.5) del choque son 3,75 grados, que
+       es un golpe seco. Con 12 salian 19 grados y la camara se quedaba mirando al suelo
+       (medido: pitch -20 grados y horizonte al 13% del alto tras un choque). */
+    const amp = (SHAKE_DEG * (0.25 + 0.75 * speedFrac) + this.shake * 2.5) * DEG;

=== 1) src/world.js:40-47 — MODELS declara como se ajusta cada modelo ===

 const MODELS = {
-  bike:  { url:'assets/models/bike.glb',  len:2.05, wid:0.78, hei:1.20 },
-  sedan: { url:'assets/models/sedan.glb', len:4.45, wid:1.80, hei:1.45 },
-  suv:   { url:'assets/models/suv.glb',   len:4.80, wid:1.92, hei:1.80 },
-  van:   { url:'assets/models/van.glb',   len:5.40, wid:2.00, hei:2.35 },
-  truck: { url:'assets/models/truck.glb', len:12.0, wid:2.50, hei:3.60 },
-  bus:   { url:'assets/models/bus.glb',   len:11.0, wid:2.55, hei:3.10 }
+  /* fit:'box' ajusta cada eje a la caja declarada, que es la MISMA que usa la fisica.
+     fit:'len' escala uniforme por longitud y deja que el manillar sobresalga, que en una
+     moto es lo correcto. Los seis GLB vienen normalizados por el generador a 1,897 unidades
+     en el eje largo, asi que su seccion NO lleva proporcion real: medido, escalar por
+     longitud da un autobus de 4,06 m de ancho para un carril de 3,60. */
+  bike:  { url:'assets/models/bike.glb',  len:2.05, wid:0.78, hei:1.20, fit:'len' },
+  sedan: { url:'assets/models/sedan.glb', len:4.45, wid:1.80, hei:1.45, fit:'box' },
+  suv:   { url:'assets/models/suv.glb',   len:4.80, wid:1.92, hei:1.80, fit:'box' },
+  van:   { url:'assets/models/van.glb',   len:5.40, wid:2.00, hei:2.35, fit:'box' },
+  truck: { url:'assets/models/truck.glb', len:12.0, wid:2.50, hei:3.60, fit:'box' },
+  bus:   { url:'assets/models/bus.glb',   len:11.0, wid:2.55, hei:3.10, fit:'box' }
 };

=== 2) src/world.js:63-76 — constantes (sustituye FOV, EYE_Y, EYE_Z y NEAR) ===

const DEG = Math.PI / 180;

/* Campo de vision HORIZONTAL, no vertical. three.js recibe el vertical, y fijarlo deja el
   horizontal a merced de la relacion de aspecto: 74 verticales son 106 en un 16:9 y 117
   medidos en un movil apaisado de 2,17, o sea ojo de pez. Se fija el horizontal y se deriva
   el vertical, con un techo para que una ventana estrecha no se vaya a 90. */
const HFOV = 86, HFOV_GAIN = 10, VFOV_MAX = 78;

/* Puesto del piloto, medido SOBRE la malla ya normalizada (2,05 m, morro en z=-1,025):
   manillar a y=1,137 en z=-0,427, asiento a y=0,875 en z=+0,256, colin a y=1,005 en z=+0,769.
   EYE_Y: la altura honesta de los ojos de un piloto son 1,48-1,58 (asiento 0,875 + 0,60/0,70
   de tronco y cabeza). Se usa 1,38 porque el asset es una moto EXTERIOR y no hay cabina
   modelada: con el ojo a 1,50 el manillar cae 25 grados por debajo del eje de vision y para
   verlo hay que cabecear 11 grados, con el horizonte al 70% del alto. Con 1,38 la moto
   ocupa la franja baja (borde superior medido al 71-75% del alto) sin tocar el horizonte.
   EYE_Z: 0,22 m por detras del asiento. Con 0,62 el ojo queda detras del colin y aquello es
   una camara de persecucion; con 0,20 el manillar queda a 0,63 m y se le ve desde arriba.
   NEAR: 0,20. El vertice mas cercano de la malla esta medido a 0,37 m, o sea el doble de
   margen, y frente a 0,12 se gana precision de profundidad para las sombras del asfalto. */
const EYE_Y = 1.38;
const EYE_Z = 0.48;
const NEAR = 0.20;
const PITCH0 = -3.5 * DEG;              // se mira un poco hacia abajo, como sobre una moto

/* Al tumbar, la moto gira sobre la huella de los neumaticos y un punto a altura h se
   desplaza -h*sin(t): el manillar se va 0,41 m con 21 grados de inclinacion. El ojo lo
   acompana en la proporcion h_manillar/EYE_Y = 1,137/1,38 = 0,82, con lo que la cabina se
   queda quieta en el centro y el 20% que falta es la cabeza, que se mantiene mas vertical
   que la moto. Medido: el desvio en curva pasa del 21% del ancho al 2%. */
const LEAN_SWAY = 0.80;
const ROLL_FRAC = 0.32;                 // balanceo de camara: un tercio del de la moto
const PITCH_ACC = 1.5 * DEG, PITCH_BRK = 3.0 * DEG, PITCH_W = 14;
const BOB_LO = 0.006, BOB_HI = 0.012, BOB_HZ_LO = 1.8, BOB_HZ_HI = 3.2;
const SHAKE_HZ = 14, SHAKE_DEG = 0.6;
const FOV_TAU = 0.35;

=== 3) src/world.js — dos ayudantes, antes de export class World ===

/* Ruido suave para el temblor: dos muestras por semilla interpoladas con smoothstep. Con un
   Math.random() por fotograma el temblor es ruido blanco, la camara teleporta, y eso es
   justo lo que marea; asi queda una oscilacion continua a SHAKE_HZ. */
function vnoise(t, seed){
  const x = t * SHAKE_HZ + seed * 71.3;
  const i = Math.floor(x), f = x - i;
  const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

/* Aviso de GLB girado. La rebanada mas ANCHA del eje largo son los espejos, y en una moto el
   manillar: van siempre por delante del centro. Medido en los seis modelos, contando desde
   el morro: bike 0,38 sedan 0,38 suv 0,38 truck 0,04 bus 0,04 y van 0,71, que es el unico
   que falla porque su carroceria trasera (2,70) gana a los espejos (2,64) por un 2%.
   Sirve para AVISAR, no para decidir: la altura del contorno miente de signo (en un coche el
   techo esta detras, en una moto el manillar delante) y el reparto de masa de vertices sale
   entre 0,51 y 0,60 en los seis, o sea ruido. El giro se DECLARA por modelo. */
function checkNose(obj, spec){
  const N = 12, wmin = new Array(N).fill(1e9), wmax = new Array(N).fill(-1e9);
  let zmin = 1e9, zmax = -1e9;
  const pts = [];
  obj.updateWorldMatrix(true, true);
  obj.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 8){          // una muestra de cada ocho: sobra
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      pts.push(v.x, v.z);
      if (v.z < zmin) zmin = v.z;
      if (v.z > zmax) zmax = v.z;
    }
  });
  if (!pts.length || zmax <= zmin) return;
  for (let i = 0; i < pts.length; i += 2){
    const b = Math.min(N - 1, ((pts[i + 1] - zmin) / (zmax - zmin) * N) | 0);
    if (pts[i] < wmin[b]) wmin[b] = pts[i];
    if (pts[i] > wmax[b]) wmax[b] = pts[i];
  }
  let best = 0;
  for (let i = 1; i < N; i++) if (wmax[i] - wmin[i] > wmax[best] - wmin[best]) best = i;
  const frac = (best + 0.5) / N;
  if (frac > 0.5)
    console.warn('[world] ' + spec.url + ': la rebanada mas ancha cae en la fraccion ' +
      frac.toFixed(2) + ' del eje largo. Si son los espejos, el modelo esta girado 180 ' +
      'grados: prueba spec.yaw = ' + ((spec.yaw || 0) + Math.PI).toFixed(4));
}

=== 4) src/world.js:294-313 — _prepare: ajuste por caja y caja MEDIDA ===

     const box = new THREE.Box3().setFromObject(obj);
     const size = new THREE.Vector3(); box.getSize(size);
-    const longest = Math.max(size.x, size.z) || 1;
-    const k = spec.len / longest;
-    obj.scale.setScalar(k);
-
-    if (size.x > size.z) obj.rotation.y = spec.yaw === undefined ? -Math.PI / 2 : spec.yaw;
+    const longX = size.x > size.z;
+    const along = (longX ? size.x : size.z) || 1;
+    const across = (longX ? size.z : size.x) || 1;
+    /* Escalar por la LONGITUD deja el ancho a lo que quiso el generador: medido, el autobus
+       salia de 4,06 m (un 59% mas que su colisionador de 2,55) y se comia el carril de al
+       lado, con lo que el jugador lo atravesaba sin chocar y encima cobraba el roce. El
+       trafico se ajusta eje a eje a la caja declarada, que es la que usa la fisica. */
+    if (spec.fit === 'box'){
+      obj.scale.set(longX ? spec.len / along : spec.wid / across,
+                    spec.hei / (size.y || 1),
+                    longX ? spec.wid / across : spec.len / along);
+    } else {
+      obj.scale.setScalar(spec.len / along);
+    }
+
+    // reorienta para que el MORRO mire a -Z (sentido de la marcha), no solo el eje largo
+    if (longX) obj.rotation.y = spec.yaw === undefined ? -Math.PI / 2 : spec.yaw;

     const b2 = new THREE.Box3().setFromObject(obj);
     const c = new THREE.Vector3(); b2.getCenter(c);
     obj.position.x -= c.x;
     obj.position.z -= c.z;
     obj.position.y -= b2.min.y;
+    const s2 = new THREE.Vector3(); new THREE.Box3().setFromObject(obj).getSize(s2);
     const wrap = new THREE.Group();
     wrap.add(obj);
-    wrap.userData.size = spec;
+    /* La caja MEDIDA, no la declarada: si la malla y el colisionador no son el mismo numero,
+       el jugador ve como pasa por dentro de un coche y se le puntua un roce. */
+    wrap.userData.size = { len:s2.z, wid:s2.x, hei:s2.y };
+    checkNose(obj, spec);
     return wrap;

=== 5) src/world.js:355-368 — spawnVehicle usa la caja medida ===

-    const s = MODELS[kind];
+    const s = obj.userData.size || MODELS[kind];
...
-    const sh = new THREE.Mesh(new THREE.PlaneGeometry(s.wid * 1.7, s.len * 1.15),
+    /* 1,7 veces el ancho son 4,34 m en un autobus: la sombra sola invadia el carril de al
+       lado. Una sombra de contacto no sobresale medio metro del vehiculo. */
+    const sh = new THREE.Mesh(new THREE.PlaneGeometry(s.wid * 1.15, s.len * 1.05),

=== 6) src/world.js:405-427 — campo de vision y setRider ===

  /** Campo de vision: se fija el HORIZONTAL y se deriva el vertical de la relacion de
      aspecto, asi la carretera se ve igual de ancha en un movil de 2,17 que en un 16:9. */
  _applyFov(){
    const v = 2 * Math.atan(Math.tan(this.hfov * DEG / 2) / this.camera.aspect) / DEG;
    const fov = Math.min(VFOV_MAX, v);
    if (Math.abs(this.camera.fov - fov) > 0.02){
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Camara de casco: el ojo va solidario al chasis tumbado, el cabeceo por resorte y el
      temblor SOLO en rotacion, que es lo que se siente sin marear. */
  setRider(x, lean, speedFrac, throttle, brake, dt){
    const bg = this.bikeGroup;
    const leanAng = -lean * 0.5;
    bg.position.set(x, 0, 0);
    bg.rotation.z = leanAng;
    bg.rotation.y = lean * 0.10;

    /* Girando el chasis un angulo t sobre la huella, un punto a altura h se va a -h*sin(t),
       no a +h*sin(t). Con el signo al reves la camara se aparta hacia el mismo lado que la
       moto y el desvio se DUPLICA: medido 31% del ancho frente al 21% de no acompanar. */
    const sway = -LEAN_SWAY * EYE_Y * Math.sin(leanAng);

    /* Cabeceo con resorte criticamente amortiguado, no un salto por fotograma: la moto se
       hunde al frenar y se estira al acelerar con inercia, en vez de parpadear en cada
       cambio de marcha. Entran throttle y brake normalizados 0..1, no aceleraciones: con
       accel*60 el clamp estaba siempre saturado y el cabeceo era un interruptor. */
    const target = PITCH0 + PITCH_ACC * clamp(throttle, 0, 1) - PITCH_BRK * clamp(brake, 0, 1);
    if (dt > 0){
      this.pitchV += (-2 * PITCH_W * this.pitchV - PITCH_W * PITCH_W * (this.pitch - target)) * dt;
      this.pitch += this.pitchV * dt;
    } else {
      this.pitch = target;
      this.pitchV = 0;
    }

    const bobHz = lerp(BOB_HZ_LO, BOB_HZ_HI, speedFrac);
    const bobA = lerp(BOB_LO, BOB_HI, speedFrac);
    const bob = Math.sin(this.time * 2 * Math.PI * bobHz) * bobA;
    // el vaiven lateral va a la mitad de frecuencia: dos senos iguales suenan a metronomo
    const bobX = Math.cos(this.time * Math.PI * bobHz) * bobA * 0.5;

    const amp = (SHAKE_DEG * (0.25 + 0.75 * speedFrac) + this.shake * 2.5) * DEG;
    this.camera.position.set(x + sway + bobX, EYE_Y + bob, EYE_Z);
    this.camera.rotation.set(
      this.pitch + vnoise(this.time, 1) * amp,
      vnoise(this.time, 2) * amp * 0.6,
      leanAng * ROLL_FRAC + vnoise(this.time, 3) * amp);

    // el campo se abre con la velocidad, filtrado para que no bombee al soltar gas
    const want = HFOV + HFOV_GAIN * speedFrac;
    this.hfov += (want - this.hfov) * (dt > 0 ? 1 - Math.exp(-dt / FOV_TAU) : 1);
    this._applyFov();
  }

  // y en resize(), tras camera.aspect = w / h:
    this._applyFov();

  // y en el constructor, en lugar de new THREE.PerspectiveCamera(FOV, ...):
    this.camera = new THREE.PerspectiveCamera(60, 1, NEAR, VIEW_Z + 120);
    this.hfov = HFOV;
    this.pitch = PITCH0;
    this.pitchV = 0;

=== 7) src/game.js — los dos sitios que llaman a setRider ===

-    this.world.setRider(0, 0, 0, 0, 0);                                        // linea 53
+    this.world.setRider(0, 0, 0, 0, 0, 0);
-    this.world.setRider(this.x, this.lean, this.speed / this.vMax, accel * 60, dec * 20);   // 215
+    this.world.setRider(this.x, this.lean, this.speed / this.vMax, throttle, brake, dt);

=== 8) package.json — para que el guion de verificacion corra en cualquier maquina ===

   "devDependencies": { "esbuild": "^0.25.0", "playwright": "^1.56.0" }

### constants

- **name**: EYE_Y — **value**: 1.38 m — **why**: Asiento medido en la malla a 0,875 m; la altura honesta de ojos son 1,48-1,58 (0,60-0,70 de tronco y cabeza sobre el asiento). Se baja a 1,38 porque no hay cabina modelada: con 1,50 el manillar (1,137 m) cae 25 grados por debajo del eje de vision y para verlo hay que cabecear 11 grados. Con 1,38 el borde superior de la moto queda medido al 71-75% del alto.
- **name**: EYE_Z — **value**: +0.48 m (0,22 m por detras del asiento) — **why**: Asiento en z=+0,256, morro en -1,025, colin en +0,769. Con 0,62 (HEAD) el ojo queda detras del colin: camara de persecucion. Con 0,20 el manillar esta a 0,63 m y se le ve desde arriba. 0,48 deja 0,91 m de moto por delante y el colin fuera de plano.
- **name**: NEAR — **value**: 0.20 m — **why**: El vertice mas cercano de la moto esta medido a 0,373 m (movil) y 0,383 (escritorio): mas del doble de margen. Frente a 0,12 baja la relacion near/far de 3167 a 1900 y da precision de profundidad a las sombras a y=0,02 sobre el asfalto a y=0. El comentario de HEAD que dice que 0,25 recortaba el deposito es falso: medido, con 0,25 el vertice mas cercano estaba a 0,358 m.
- **name**: PITCH0 — **value**: -3.5 grados — **why**: Deja el horizonte medido entre el 46% y el 49% del alto: algo por encima del centro, que es donde una vista de conduccion lo pone para dar mas asfalto que cielo sin perder la referencia.
- **name**: HFOV / HFOV_GAIN — **value**: 86 -> 96 grados HORIZONTALES — **why**: Fijar 74 verticales daba 117 horizontales medidos en 16:9 y 126,7 en un movil apaisado de 2,17. Con 86-96 horizontales el vertical sale 52,6 en el movil y 62,1 en escritorio y la carretera se ve igual de ancha en los dos. La apertura de 10 grados en todo el rango de velocidad se nota y no marea; los 14 verticales de HEAD son 10 horizontales mas encima de un ojo de pez.
- **name**: VFOV_MAX — **value**: 78 grados — **why**: Techo para el vertical derivado: en una ventana de escritorio estrecha (aspecto 1,0) el vertical se iria a 90 grados y la escena se estiraria.
- **name**: FOV_TAU — **value**: 0.35 s — **why**: Filtro de primer orden sobre el campo de vision. Sin el, un frenazo cierra el campo tan rapido como cae la velocidad y el objetivo bombea; con 0,35 s el cambio se lee como inercia.
- **name**: LEAN_SWAY — **value**: 0.80 (adimensional) — **why**: Sale de h_manillar/EYE_Y = 1,137/1,38 = 0,82: es el valor exacto que deja quieta la cabina en el encuadre al tumbar. Medido: desvio del centro de la moto del 21% del ancho a 2%. El 20% que falta es la cabeza, que se mantiene mas vertical que la moto.
- **name**: ROLL_FRAC — **value**: 0.32 del angulo de la moto (9,2 grados con 28,6 de inclinacion) — **why**: Un balanceo de camara al 100% de la inclinacion marea; entre 0,30 y 0,35 se siente la curva y el horizonte sigue siendo una referencia. Coincide con el 0,35 que pide design/spec.md:225.
- **name**: PITCH_ACC / PITCH_BRK — **value**: +1.5 / -3.0 grados — **why**: Asimetrico a proposito: la horquilla se hunde mas al frenar de lo que se estira al acelerar. Magnitudes de design/spec.md:231 (1,6 y 2,8). En HEAD el clamp estaba siempre saturado en +2,0/-2,9 porque game.js:215 pasaba accel*60 (hasta 660) contra un factor 0,012.
- **name**: PITCH_W — **value**: 14 rad/s (resorte critico, se asienta en ~0,2 s) — **why**: Estable con el paso fijo de 1/120 (2*w*dt = 0,23, muy por debajo de 2). Sin resorte el cabeceo saltaba 5 grados en un fotograma en cada cambio de marcha, seis veces por aceleron, porque game.js:181-183 pone torque a 0 durante el cambio.
- **name**: BOB_LO / BOB_HI y BOB_HZ_LO / BOB_HZ_HI — **value**: 6 -> 12 mm a 1,8 -> 3,2 Hz — **why**: Valores de design/spec.md:103. En HEAD eran 1,8-7,8 mm a 3,5 Hz fijos: demasiado rapido y demasiado corto, se lee como vibracion de motor y no como marcha. El componente lateral va a la mitad de frecuencia para que no suene a metronomo.
- **name**: SHAKE_DEG / SHAKE_HZ — **value**: 0.15 -> 0.6 grados a 14 Hz, y 2,5 grados por unidad de sacudida — **why**: Solo en ROTACION. En HEAD la sacudida movia la POSICION +-0,25*shake m (0,4 m con el shake 1,6 del choque) con Math.random() por fotograma: ruido blanco, la camara teleporta, y eso es lo que marea. Con 12 grados por unidad la camara acababa mirando al suelo tras un choque (medido: pitch -20 grados, horizonte al 13%).
- **name**: sombra de contacto — **value**: 1.15 x ancho, 1.05 x largo (era 1,7 x 1,15) — **why**: 1,7 veces el ancho de un autobus son 4,34 m: la calcomania sola invadia el carril de al lado (3,60 m).

### pitfalls

- El signo del acompanamiento al tumbar. El chasis gira sobre la huella de los neumaticos, asi que un punto a altura h se desplaza a -h*sin(t). Puesto con el signo contrario el desvio se DUPLICA en vez de anularse: medido, 31% del ancho de pantalla frente al 21% de no acompanar nada. En una captura estatica en linea recta no se ve NADA: hay que medir con la moto tumbada, y por eso el guion de verificacion hace una segunda pasada con la direccion a fondo.
- Fijar el campo de vision VERTICAL. three.js recibe el vertical y deriva el horizontal del aspecto. Con la presentacion girada por CSS el lienzo mide 2,17 tanto con el movil en vertical como en horizontal, asi que el ojo de pez de 127 grados es el caso NORMAL en movil, no el raro. Y al reves: si se fija el horizontal sin techo, una ventana estrecha de escritorio se va a 90 grados verticales.
- Creer que el plano cercano recorta porque la camara esta dentro de la CAJA de la moto. Son cosas distintas: la caja contiene la camara y sin embargo el poligono mas cercano esta a 0,37 m. Hay que medir sobre los VERTICES, no sobre la caja envolvente, o se cambia el near para nada (y bajarlo a 0,12 solo tira precision de profundidad).
- Medir el encuadre con la caja envolvente de la moto. En una moto la caja miente: incluye la altura del manillar tambien en la vertical del morro, y da un borde superior al 55% del alto cuando la silueta real esta al 71%. La diferencia de pixeles entre el fotograma con moto y sin ella es exacta y cuesta dos render y dos readPixels.
- Escalar los GLB de image_to_3d por su eje largo. Los seis vienen normalizados a la misma caja (1,897 unidades en X, min -0,95, max +0,948), asi que su seccion no lleva proporcion real: el autobus sale 59% mas ancho que su colisionador. Si la malla y el colisionador no son EL MISMO numero, el jugador atraviesa coches y encima cobra el roce, porque game.js:240-243 mide holguras de 1,20/0,80/0,45 m contra la caja declarada.
- Intentar deducir el morro de la geometria. La altura del contorno miente de signo segun la CLASE de vehiculo (en un coche el techo esta detras, en una moto el manillar delante), el reparto de masa de vertices sale entre 0,51 y 0,60 en los seis modelos, y la heuristica que mejor funciona (la rebanada mas ancha son los espejos, y van delante) falla en van.glb, cuya carroceria trasera gana a los espejos por un 2%. El giro se DECLARA por modelo y la heuristica solo avisa.
- Comprobar la orientacion del trafico con el producto escalar del eje -Z del objeto. Eso caza un rotation.y mal puesto en ejecucion, pero NO puede descubrir la convencion del asset: si el yaw declarado en _prepare esta al reves, el eje -Z del objeto sigue apuntando hacia delante y la prueba pasa mientras el jugador ve todos los coches de frente. Y hay que filtrar los que van DETRAS del jugador: a esos se les ve el morro y es correcto.
- Un choque congela setRider (game.step sale antes cuando mode deja de ser 'play'), asi que la camara se queda con el ultimo valor, sacudida incluida. Cualquier medida automatica del encuadre tiene que anular crash() o comprobar game.mode: si no, mide un fotograma de choque y las cifras salen sin sentido.
- Cabecear la camara con una aceleracion sin normalizar. game.js pasaba accel*60, hasta 660, contra un factor 0,012: el clamp esta saturado el 100% del tiempo y el cabeceo se convierte en un interruptor de dos posiciones que ademas parpadea en cada cambio de marcha, porque el cambio pone el par a cero durante 0,22 s.
- Sacudir la POSICION de la camara con Math.random() por fotograma. Sin correlacion temporal la imagen entera teleporta; a 0,25 m de amplitud el ojo no puede seguir la escena. La sacudida va en rotacion y con ruido continuo.
- Poner side:DoubleSide en el vehiculo para 'arreglar' agujeros. Con descarte de caras traseras (FrontSide, que ya esta en _prepare) nunca se ve el interior del deposito desde el puesto del piloto; con DoubleSide se ve el interior de la carroceria en cuanto el ojo entra en cualquier hueco. Y no vale dibujar la moto en una segunda pasada con su propia camara y su propio near: con niebla activa se aplicaria dos veces.

### verify

- El guion ya esta escrito y probado: /home/user/General-Assets-Games/redline-rider/tools/frame-test.mjs. Se ejecuta con: node build.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/frame-test.mjs --shots. Sirve un servidor http efimero sobre el repo (index.html carga los GLB por fetch, y file:// no vale), lanza chromium con --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader (sin GPU no hay WebGL y three.js no arranca) y devuelve 0 o 1 segun las comprobaciones, asi que sirve de prueba de regresion.
- Tres aparatos, porque el aspecto del LIENZO es lo que cambia el encuadre: movil 932x430 apaisado, el MISMO movil 430x932 (que el juego gira por CSS y acaba tambien en 2,17) y escritorio 1280x720. Cada uno se mide dos veces: en linea recta y con la direccion a fondo, que es donde aparece el defecto de la moto descentrada.
- Pilota sin depender de la entrada real: con ?debug=1 main.js:116 expone window.__rr, y el guion hace game.start('day'), controls.input.throttle = 1 y 1200 pasos de game.step(1/120), o sea 10 s de simulacion hasta 143 km/h. Anula game.crash para que la medida sea determinista: un choque congela setRider y se mediria un fotograma de sacudida.
- Medida 1, silueta por diferencia de pixeles: render con bikeGroup.visible = false, gl.readPixels, render con true, readPixels otra vez, y se cuentan los pixeles que cambian (umbral 12 sobre la suma de RGB). Da cobertura exacta, borde superior, borde inferior, ancho y centro de la moto. Es la unica medida honesta del encuadre: la caja envolvente de una moto incluye la altura del manillar tambien sobre el morro y da un borde superior 16 puntos mas arriba de lo real. Ojo: readPixels devuelve la primera fila ABAJO.
- Medida 2, proyeccion: caja de cada vehiculo en coordenadas de mundo (recorriendo las mallas y transformando las 8 esquinas de su caja local, no la del envoltorio, porque la sombra de contacto y el halo son hijos suyos y falsean el ancho), distancia punto-caja a la camara, vertice mas cercano muestreado (1 de cada 4000) y producto escalar del eje -Z de cada coche contra la direccion a la camara, solo para los que van delante (z < -3).
- Umbrales que fallan con el codigo de HEAD y pasan con la correccion: la moto se ve (cobertura entre 2% y 30%); su borde superior por debajo del 60% del alto; llega al borde inferior; centrada al 3% en recto y al 10% tumbada; ningun vertice a menos de near+0,05; horizonte entre el 40% y el 60%; campo horizontal entre 70 y 100 grados; al trafico de delante se le ve la trasera; ancho y largo de cada malla dentro de 0,3 y 0,8 m de su colisionador; ningun vehiculo de mas de 2,9 m de ancho.
- Cifras medidas ANTES (commit b1c5883): campo horizontal 117,1 en escritorio y 126,6 en movil; cobertura 5,6% con el borde superior al 58%; desvio en curva 11%, 17% y 21% del ancho segun aparato; vertice mas cercano 0,361 m con near 0,12; camion 3,14 m de ancho y autobus 4,06 m con colisionadores de 2,50 y 2,55.
- Cifras medidas DESPUES: campo horizontal 93,9 en los tres aparatos (vertical 52,6 en movil y 62,1 en escritorio); cobertura 5,7-6,6% con el borde superior al 71-75% y el inferior al 100%; centrada al 0,3-0,9% en recto y al -2,0/-2,3% con 21 grados de inclinacion; vertice mas cercano 0,373-0,383 m con near 0,20; horizonte al 46-49%; malla y colisionador coincidentes en los seis modelos; nada de mas de 2,9 m de ancho. Las 13 comprobaciones por aparato pasan en los tres.
- El aviso de checkNose sale por la consola de la pagina y el guion lo reenvia con page.on('console'). En este repo tiene que cantar exactamente uno: van.glb (fraccion 0,71). Hay que mirarlo una vez en la hoja de contactos de tools/probe_models.mjs y, si esta girado, poner van: { ..., yaw: Math.PI/2 }.
- Las capturas de --shots (/tmp/frame-<aparato>.png y /tmp/frame-<aparato>-curva.png) son para mirarlas DESPUES de que los numeros pasen, no para decidir. En la de movil apaisado se ve el manillar y los espejos cruzando la franja baja, el deposito abajo al centro, el horizonte justo por encima del medio y un camion de frente a lo lejos visto por detras; en la de curva el manillar sigue centrado y lo que se inclina es el horizonte.

## Los tres esquemas de direccion (giroscopio / arrastre / botones) y los ajustes de control

### area

Los tres esquemas de direccion (giroscopio / arrastre / botones) y los ajustes de control

### diagnosis

Premisa corregida antes de nada: el campo `scheme` SI existe en los DEFAULTS (src/state.js:35, con su comentario en :32-34). El defecto real es el contrario, y esta en src/main.js:41 — `if (!controls.SCHEMES.includes(state.scheme)) state.scheme = controls.defaultScheme();` resuelve el valor del aparato y lo escribe en el estado, y como src/main.js:153 guarda en `pagehide`, ese valor deducido queda PERSISTIDO como si el jugador lo hubiera elegido. Contradice literalmente el comentario de state.js:32-34 y hace que el aparato nunca vuelva a opinar (un movil que arranco sin permiso de sensor se queda con 'touch' guardado para siempre).

Todo lo demas lo he comprobado en Chromium headless (probe en /tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/probe_schemes.mjs, salida real citada):

1. Sensibilidad en botones: rota. src/controls.js:343 `btnSteer * sens`, con `btnSteer` = ±1. Medido: sens 0.5 -> steer maximo 0.5 (NO se puede cambiar de carril entero), sens 1 -> 1, sens 2 -> 1 (el clamp de :360 ya recorta, la sensibilidad no hace NADA por encima de 1). El deslizador es dañino por debajo de 1 e inerte por encima.

2. Sensibilidad en arrastre: rota igual. src/controls.js:344 `touchSteer * sens`, pero `touchSteer` ya viene recortado a ±1 en :221. Medido: con sens 0.5, arrastrando 600 px el steer se queda clavado en 0.5 y nunca llega al tope (`pxParaTope: -1`); con sens 2 el tope llega a los 130 px, es decir la sensibilidad recorta el recorrido util del dedo en vez de cambiar la ganancia. El unico sitio correcto es la ganancia `k` de :220, antes del recorte.

3. `gyro.active` nunca vuelve a false: se pone a true en src/controls.js:182 y no hay quien lo baje. Medido: inclino a la derecha (steer 0.49), dejo de emitir eventos 5 segundos (equivalente a cambiar de app, revocar el permiso o que el sensor se duerma) y el resultado es `{steer:0.49, live:true, estado:"live"}`. El manillar se queda PEGADO a medio giro y src/controls.js:307 `gyroStatus()` le miente a la interfaz diciendo "live". Esto es, tal cual, "controles pegados al recuperar el foco".

4. Pedal fantasma, el peor de todos. `bindButton` (src/controls.js:231-265) guarda los punteros en un `Set` local `held`, y `releaseAll()` (:368) no lo toca. Al cambiar de app no siempre llega `pointerup`/`pointercancel`. Medido: pointerdown en #p-gas -> throttle 1; `releaseAll()` -> throttle 0 pero `held` conserva el id y la clase `.press` se queda puesta; el jugador vuelve y pulsa con otro pointerId (siempre es otro) -> `held.size` ya no es 0, `onDown()` no se dispara, **throttle 0: el gas queda muerto el resto de la partida**.

5. Arrastre rancio: `drag` es local a `install()` (src/controls.js:210) y `releaseAll()` no lo cancela. Medido: pointerdown arriba, `releaseAll()`, y el primer `pointermove` al volver compara con la posicion de hace un minuto -> **steer = 1 de golpe sin haber arrastrado**.

6. Deteccion de aparato: hay DOS tests distintos que tienen que coincidir y no coinciden. `coarsePointer()` (:58) usa `maxTouchPoints>0 || pointer:coarse` y decide si se GIRA la pantalla; `defaultScheme()` (:292) usa `maxTouchPoints>0 || 'ontouchstart' in window` y decide el ESQUEMA. En un portatil con pantalla tactil (Windows: `maxTouchPoints` 10, `pointer:fine`, `hover:hover`) ambos dan falso positivo por la rama de `maxTouchPoints`: el juego se gira 90 grados en un ordenador y encima elige giroscopio. `'ontouchstart' in window` es el peor test posible (lo cumple cualquier Chrome de escritorio con la emulacion tocada) y `window.DeviceOrientationEvent` existe en TODOS los Chrome de escritorio sin ningun sensor detras (medido: `{DOE:true}` en 1280x800 sin dedo).

7. El respaldo va al esquema equivocado. src/controls.js:301 cae a 'touch'; design/spec.md:229 dice literalmente "If no DeviceOrientation event arrives within 1.5 s of enabling tilt (or permission is denied on iOS), auto-fall-back to **buttons** and say why". Caer al arrastre deja al jugador sin NADA visible con lo que girar, que es justo su queja. Y `enableGyro()` (:115-129) devuelve true en cuanto hay permiso, sin esperar ninguna lectura, de modo que quien decide si hay sensor es un `setTimeout(1600)` colgado en la interfaz (src/ui.js:260-262) que solo se ejecuta en el instante de tocar el segmento.

8. Izquierda + derecha a la vez pierde el boton que sigue pulsado: src/controls.js:270-271, soltar DERECHA con IZQUIERDA aun pulsada deja `btnSteer` en 0 en vez de volver a -1.

9. Fila de ajustes: `#row-tilt` (template.html:282) tiene id pero NADIE lo referencia (grep: cero usos en src/) — la fila del giroscopio y su boton CENTRAR se ven con cualquier esquema, y las filas que si dependen del esquema (Sensibilidad, Invertir) estan separadas del selector por dos deslizadores de audio (template.html:289-293). El indicador vivo escala con `deg / 22` a pelo (src/ui.js:307), duplicando TILT_FULL y sin tener en cuenta que la sensibilidad divide ese angulo: con sens 2 el manillar esta a tope a 11 grados y el punto solo ha recorrido la mitad, con lo que parece que el sensor no llega. Y `bar.firstElementChild.nextElementSibling` (:308) depende del orden `<u><i>` del HTML.

10. La inversion (src/controls.js:356) se aplica DESPUES de que el teclado y el mando pisen el valor (:350-351), asi que activar "Invertir giro" para arreglar un giroscopio al reves invierte tambien la flecha izquierda del teclado y las flechas ◀ ▶ de la pantalla. Una flecha etiquetada que gira al otro lado no es un ajuste, es un bug.

11. Sensibilidad global: design/spec.md:121 la quiere "stored per scheme" y en rango 0.4-2.0; state.js:37 tiene un escalar y template.html:291 el deslizador va de 50 a 200.

### recommendation

Los cinco defectos del jugador salen de la misma raiz: hay tres esquemas pero ni el codigo ni la pantalla dicen nunca cual esta MANDANDO de verdad. Mi propuesta se sostiene sobre cuatro decisiones.

Primera, una sola funcion de deteccion para todo el modulo. `isCoarse()` = `matchMedia('(pointer: coarse)')`, y solo si el navegador no tiene consultas de puntero se cae a `maxTouchPoints`. Ese es el test que decide GIRAR la pantalla, porque un portatil tactil reporta `pointer:fine` y asi deja de girarse. Encima, `isHandheld()` = `isCoarse() && !matchMedia('(hover: hover)')`, que es el que decide el esquema: un portatil tactil siempre da `hover:hover`. `'ontouchstart' in window` no se usa para nada. Por defecto: aparato de mano con `DeviceOrientationEvent` y sin ser http en claro -> `tilt`; aparato de mano sin sensor -> `buttons`; escritorio -> `touch` (que ahi es un adorno, porque manda el teclado). `buttons` no es nunca un valor por defecto deducido, es el destino del respaldo y la eleccion manual de quien no quiere inclinar.

Segunda, el respaldo se demuestra, no se supone, y termina en botones. `sniffGyro()` engancha el listener sin pedir permiso en todo lo que no sea iOS (donde `requestPermission` no existe), asi que en Android se sabe si hay sensor ANTES de que el jugador pulse CONDUCIR. `enableGyro()` pasa a resolver a `true` solo cuando ha llegado una lectura de verdad, esperando hasta 1500 ms como manda design/spec.md:229. `activeScheme()` devuelve 'buttons' — no 'touch' — mientras `gyro.everActive` sea falso, con lo que las flechas ◀ ▶ aparecen solas en pantalla en el mismo momento en que el giroscopio falla, y el jugador nunca se queda sin saber donde tocar. Se mira `everActive` y no `active` para no cambiar el mando a mitad de curva; si el sensor se queda mudo en marcha no se cambia de esquema, solo se relaja el manillar al centro y la fila de ajustes lo dice.

Tercera, `gyro.active` se deriva de un reloj. `gyro.last = performance.now()` en cada evento y `active = granted && zero!==null && (now - last) < 500`. Es la linea que arregla a la vez los controles pegados al volver del segundo plano y el estado mentiroso del indicador.

Cuarta, la sensibilidad entra al PRINCIPIO de cada cadena y nunca al final, porque cada esquema tiene una unidad distinta: en giroscopio escala el ANGULO de tope (`22/sens`, que es lo unico que ya estaba bien en :334), en arrastre escala la ganancia de PIXELES a manillar antes del recorte, y en botones escala la RAMPA (topes por segundo). Multiplicar el valor final es lo que produce los dos numeros medidos: tope de giro imposible por debajo de 1 y deslizador inerte por encima. Y se guarda por esquema, como pide design/spec.md:121, porque el valor bueno para el pulgar no es el bueno para las muñecas. La inversion, al contrario, es un espejo y va al final, pero SOLO sobre el valor que ha producido el esquema del aparato (tilt y touch) y antes de que el teclado o el mando pisen: nunca sobre botones etiquetados con flechas, ni sobre teclado, ni sobre mando.

En la pantalla de ajustes el grupo de control va PRIMERO, arriba del todo del scroll, porque es la queja: Control (selector) -> linea de estado en palabras -> fila Giroscopio (barra viva + CENTRAR, visible solo con tilt) -> Sensibilidad (con su numero) -> Invertir (oculta con botones) -> y despues Idioma, Calidad, audio y borrado. La linea de estado es la pieza que falta: traduce `gyroStatus()` a una frase ('Giroscopio activo', 'Esperando lecturas del sensor', 'Permiso del sensor denegado — se conduce con botones') y se repinta sola cuando el estado cambia. El indicador vivo escala con `tiltFullDeg()`, no con un 22 a pelo, para que el punto llegue al extremo exactamente cuando el manillar llega al tope. Y CENTRAR se duplica en la pantalla de PAUSA, porque el momento en que uno se da cuenta de que el centro esta torcido es conduciendo, no en el menu (design/spec.md:109 ya pide ahi un panel CONTROLS reducido).

Al pausar y al recuperar el foco: `releaseAll()` tiene que soltar TODO — los `Set` de punteros de cada boton (registrando los botones en una lista al enlazarlos), la sesion de arrastre, la rampa de los botones y el suavizado del giroscopio. Y al reanudar no se recentra a ciegas: se compara la postura actual con el cero guardado y solo si difiere mas de 12 grados se recentra con aviso, tal como manda design/spec.md:229.

Del campo `scheme` en state.js no hay que añadir el valor inicial (ya esta en null, que es lo correcto): hay que BORRAR src/main.js:41 para que null siga significando "lo decide el aparato en cada arranque", y añadir una revision de ajustes con dos migraciones que si hacen falta: el escalar `sens` a un objeto por esquema, y el apagado de una sola vez de `invert` en los guardados anteriores al arreglo del signo de la gravedad (src/controls.js:151), porque quien jugo con el giroscopio al reves activo ese ajuste para compensar y ahora se lo encontraria invertido otra vez.

### code

========================================================================
1) src/state.js — SCHEMES pasa a vivir aqui, sens por esquema, migracion
========================================================================

--- Tras la linea 27 (`export const QUALITIES = ...`), añadir:

+/* Los tres esquemas viven en el estado y no en controls.js para que state.js pueda validar un
+   guardado sin importar el modulo de entrada, que a su vez importa el estado: seria un ciclo. */
+export const SCHEMES = ['tilt', 'touch', 'buttons'];
+export const SETTINGS_REV = 1;
+/* Avisos de la migracion. No viven en state porque no son ajustes: se leen una vez al arrancar
+   para poder decirselo al jugador y se olvidan. */
+export const notes = { invertFixed:false };

--- Reemplazar el bloque DEFAULTS (lineas 29-44) por:

 const DEFAULTS = () => ({
   lang: null,                  // null -> se pregunta al primer arranque
   quality: null,               // null -> se pregunta al primer arranque
   /* null -> lo decide el aparato EN CADA arranque: giroscopio en un movil con sensor, botones
      en un movil sin sensor, arrastre en un escritorio. No se resuelve nunca sobre el estado:
      guardar el valor deducido convierte una suposicion en una eleccion del jugador, y un movil
      que arranco una vez sin permiso se quedaria con el esquema equivocado para siempre. */
   scheme: null,
+  rev: 0,                      // revision de ajustes; migrate() la sube
   music: 0.5, sfx: 0.85,
-  haptics: true, invert: false, sens: 1,
+  haptics: true, invert: false,
+  /* La sensibilidad se guarda POR esquema: el valor bueno para el pulgar arrastrando no es el
+     bueno para las muñecas inclinando. Lo pide design/spec.md:121. */
+  sens: { tilt:1, touch:1, buttons:1 },
   cash: 0, distanceTotal: 0,
   ...
 });

+/** Sensibilidad del esquema dado, siempre un numero valido dentro del rango del deslizador. */
+export const SENS_MIN = 0.4, SENS_MAX = 2.0;
+export function sensOf(scheme){
+  const v = state.sens && +state.sens[scheme];
+  return (isFinite(v) && v >= SENS_MIN && v <= SENS_MAX) ? v : 1;
+}
+export function setSens(scheme, v){
+  if (!state.sens || typeof state.sens !== 'object') state.sens = { tilt:1, touch:1, buttons:1 };
+  state.sens[scheme] = Math.min(SENS_MAX, Math.max(SENS_MIN, +v || 1));
+}

+/* ---------- migracion de ajustes de control ----------
+   Cada regla arregla un guardado que quedo con un valor que hoy ya no puede existir. Se ejecuta
+   sobre el estado YA cargado, para que valga igual para un guardado de hace dos versiones. */
+function migrate(){
+  // Cualquier cosa que no sea uno de los tres esquemas vuelve a null = lo decide el aparato.
+  if (state.scheme !== null && !SCHEMES.includes(state.scheme)) state.scheme = null;
+  // sens era un escalar hasta la rev 1. Un NaN aqui deja el manillar muerto sin sintomas.
+  if (typeof state.sens === 'number' || typeof state.sens === 'string'){
+    const v = +state.sens;
+    const k = (isFinite(v) && v >= SENS_MIN && v <= SENS_MAX) ? v : 1;
+    state.sens = { tilt:k, touch:k, buttons:k };
+  }
+  if (!state.sens || typeof state.sens !== 'object') state.sens = { tilt:1, touch:1, buttons:1 };
+  for (const s of SCHEMES) setSens(s, sensOf(s));
+  if (typeof state.invert !== 'boolean') state.invert = false;
+  /* rev 0 -> 1: hasta esta version el giroscopio tenia negado el signo de la gravedad en X, asi
+     que quien jugo inclinando activo "Invertir giro" para compensar unos controles al reves.
+     Con el signo arreglado ese ajuste vuelve a invertir de verdad, asi que se apaga UNA vez y
+     se avisa: dejarlo puesto reintroduciria exactamente el fallo que se acaba de arreglar. */
+  if ((state.rev | 0) < 1 && state.invert){
+    state.invert = false;
+    notes.invertFixed = true;
+  }
+  state.rev = SETTINGS_REV;
+}

--- En load(), tras la linea 58 (`if (!state.owned.includes(state.bike)) ...`) y FUERA del if(raw),
    justo antes del `return state`:

     } catch (e) { /* guardado corrupto: se empieza limpio */ }
   }
+  migrate();
   return state;
 }

--- wipe() (linea 69): conservar tambien rev, o la migracion se repite y vuelve a apagar invert.

-  const keep = { lang:state.lang, quality:state.quality, scheme:state.scheme,
+  const keep = { lang:state.lang, quality:state.quality, scheme:state.scheme, rev:state.rev,
                  music:state.music, sfx:state.sfx,
                  haptics:state.haptics, invert:state.invert, sens:state.sens };


========================================================================
2) src/controls.js — deteccion, respaldo, sensibilidad y soltado
========================================================================

--- Lineas 12-15, cabecera:

-import { state } from './state.js';
+import { state, SCHEMES, sensOf } from './state.js';
 import { clamp } from './gfx.js';
-export const SCHEMES = ['tilt', 'touch', 'buttons'];
+export { SCHEMES };   // ui.js sigue leyendolo de aqui

--- Lineas 17-22, constantes. Los valores salen de design/spec.md:229:

-const TILT_FULL = 22;
-const TILT_DEAD = 1.6;
-const TILT_SMOOTH = 14;
+const TILT_FULL   = 22;    // grados de alabeo que valen tope de giro a sensibilidad 1
+const TILT_DEAD   = 2.0;   // zona muerta en grados, con renormalizacion despues
+const TILT_CLAMP  = 30;    // mas alla no se lee: ahi ya no se ve la pantalla
+const TILT_EXPO   = 1.3;   // curva de respuesta de la especificacion
+const TILT_SMOOTH = 14;    // 1/s; equivale al alpha 0,20 por fotograma a 60 Hz del spec
+const TILT_REZERO = 12;    // grados de cambio de postura que obligan a recentrar al reanudar
+const GYRO_WAIT    = 1500; // ms de espera a la PRIMERA lectura antes de dar el sensor por muerto
+const GYRO_TIMEOUT = 500;  // ms sin lecturas -> el sensor esta mudo
+const BTN_ATTACK  = 1 / 0.12;   // topes por segundo al pulsar
+const BTN_RELEASE = 1 / 0.08;   // topes por segundo al soltar, mas rapido: endereza
+const TOUCH_GAIN  = 3.4;   // topes de manillar por ancho de pantalla arrastrado
+const TOUCH_DECAY = 5;     // 1/s de autocentrado al soltar el dedo
 const DEG = Math.PI / 180;

--- Lineas 30-45, estado interno:

 const gyro = { available:false, granted:false, denied:false, zero:null, raw:0, active:false,
-               everActive:false, flat:0, samples:[] };
+               everActive:false, flat:0, samples:[], t0:0, last:0 };
-const ZERO_SAMPLES = 6;
+const ZERO_MS = 500, ZERO_MAX = 30, ZERO_MIN = 4;   // media de 0,5 s o 30 lecturas, la que antes
 const ZERO_MIN_FLAT = 0.30;
 let gyroSteer = 0;
 ...
 const keys = new Set();
 let touchSteer = 0;
-let btnSteer = 0;
+let btnL = false, btnR = false;   // dos banderas, no un signo: soltar una devuelve el mando a la
+let btnSteer = 0;                 // otra si sigue pulsada, y las dos juntas dan 0 (spec:229)
 const pedal = { gas:false, brake:false, horn:false };
+let drag = null;                  // sesion de arrastre EN CURSO, a nivel de modulo para poder
+const bound = [];                 // cancelarla; y los botones enlazados, para soltarlos todos

--- Lineas 56-59, deteccion. Sustituir coarsePointer() por dos funciones y usarlas en todo el
    modulo, que es la unica forma de que la decision de girar y la de esquema no se contradigan:

-const coarsePointer = () => (navigator.maxTouchPoints || 0) > 0 ||
-  (window.matchMedia && matchMedia('(pointer: coarse)').matches);
+const mm = q => !!(window.matchMedia && matchMedia(q).matches);
+/** Puntero grueso PRIMARIO: movil o tableta. Es el unico test que decide girar la pantalla.
+    maxTouchPoints solo entra si el navegador no tiene consultas de puntero, porque en un
+    portatil con pantalla tactil vale 10 y ahi no hay absolutamente nada que girar. */
+export const isCoarse = () =>
+  window.matchMedia ? mm('(pointer: coarse)') : (navigator.maxTouchPoints || 0) > 0;
+/** Aparato de mano: puntero grueso y sin raton encima. Un portatil tactil da coarse en algun
+    navegador, pero siempre da hover, y ahi el giroscopio no existe o no se usa nunca.
+    Se cachea porque activeScheme() se llama una vez por fotograma. */
+let handheld = null;
+export const isHandheld = () =>
+  handheld === null ? (handheld = isCoarse() && !mm('(hover: hover)')) : handheld;
+/** http en claro (no localhost): Chrome no entrega los sensores y el evento no llega jamas.
+    Se mira el protocolo y no solo isSecureContext porque file:// no es http y ahi si funciona. */
+const insecureHttp = () => location.protocol === 'http:' && !window.isSecureContext;

--- Linea 68 y 61-72 de layoutStage:

 export function layoutStage(){
+  handheld = null;               // la ventana puede haber cambiado de aparato (escritorio remoto)
   const vw = ...
-  const portrait = vh > vw && coarsePointer();
+  const portrait = vh > vw && isCoarse();

--- Lineas 110-129, API del giroscopio. enableGyro pasa a resolver con la VERDAD:

 export const gyroAvailable = () => gyro.available;
 export const gyroGranted = () => gyro.granted;
 export const gyroLive = () => gyro.active;
+/** Angulo de tope EFECTIVO. La interfaz lo necesita para que el indicador vivo llegue al
+    extremo exactamente cuando el manillar llega al tope, y no a mitad de recorrido. */
+export const tiltFullDeg = () => Math.max(8, TILT_FULL / sensOf('tilt'));
+
+const waitFor = (test, ms) => new Promise(res => {
+  const t0 = performance.now();
+  const tick = () => test() ? res(true)
+            : performance.now() - t0 > ms ? res(false) : setTimeout(tick, 60);
+  tick();
+});
+
+/** Engancha el sensor SIN pedir permiso donde no hay que pedirlo (todo menos iOS). Asi en
+    Android se sabe si hay lecturas antes de que el jugador pulse CONDUCIR, y el respaldo a
+    botones se decide en el menu en vez de en plena autopista. */
+export function sniffGyro(){
+  const DOE = window.DeviceOrientationEvent;
+  if (!DOE || gyro.granted) return false;
+  if (typeof DOE.requestPermission === 'function') return false;   // iOS: hace falta un gesto
+  gyro.granted = true;
+  addEventListener('deviceorientation', onOrient, { passive:true });
+  return true;
+}
 
 /** Debe llamarse DENTRO de un gesto del usuario: iOS rechaza el permiso fuera de uno.
-    Resuelve a true si hay permiso. */
+    Resuelve a true solo si ha llegado una lectura DE VERDAD: conceder el permiso no es tener
+    sensor. En un iframe sin allow="gyroscope", en http sin cifrar o en un aparato sin
+    giroscopio el evento no llega nunca, y quien tiene que enterarse es la interfaz. */
 export async function enableGyro(){
   const DOE = window.DeviceOrientationEvent;
   if (!DOE) return false;
   if (typeof DOE.requestPermission === 'function'){
-    try {
-      if (await DOE.requestPermission() !== 'granted') return false;
-    } catch (e) { return false; }
+    let res = 'denied';
+    try { res = await DOE.requestPermission(); } catch (e) { res = 'denied'; }
+    if (res !== 'granted'){ gyro.denied = true; return false; }
   }
+  gyro.denied = false;
   if (!gyro.granted){
     gyro.granted = true;
     addEventListener('deviceorientation', onOrient, { passive:true });
   }
-  gyro.zero = null;
-  return true;
+  calibrateGyro();
+  if (!gyro.everActive) await waitFor(() => gyro.everActive, GYRO_WAIT);
+  return gyro.everActive;
 }

--- Dentro de onOrient (lineas 154-184). Dos cambios: sellar la hora de CADA lectura antes del
    retorno por movil plano, y dejar de escribir gyro.active a mano:

   gyro.available = true;
+  /* La hora se sella aqui, antes del retorno por movil plano: el sensor esta vivo aunque la
+     lectura no sirva para sacar alabeo. Si se sellara despues, tumbar el movil en la mesa se
+     confundiria con que el sensor ha muerto. */
+  gyro.last = performance.now();
   gyro.flat = Math.hypot(gx, gy);
   if (gyro.flat < 0.18){ gyro.raw *= 0.85; return; }
 
   const roll = Math.atan2(gx, -gy) / DEG;
 
   if (gyro.zero === null){
     if (gyro.flat < ZERO_MIN_FLAT) return;
+    if (!gyro.samples.length) gyro.t0 = gyro.last;
     gyro.samples.push(roll);
-    if (gyro.samples.length < ZERO_SAMPLES) return;
+    /* Media de 0,5 s o de 30 lecturas, la que se cumpla antes (design/spec.md:229 pide 30 en
+       0,5 s = 60 Hz). Contar solo lecturas dejaria 3 segundos de espera en un sensor a 10 Hz. */
+    const enough = gyro.samples.length >= ZERO_MAX ||
+      (gyro.samples.length >= ZERO_MIN && gyro.last - gyro.t0 >= ZERO_MS);
+    if (!enough) return;
     let sx = 0, sy = 0;
     for (const a of gyro.samples){ sx += Math.cos(a * DEG); sy += Math.sin(a * DEG); }
     gyro.zero = Math.atan2(sy, sx) / DEG;
     gyro.samples.length = 0;
   }
 
-  gyro.raw = wrap180(roll - gyro.zero);
-  gyro.active = true;
+  gyro.raw = clamp(wrap180(roll - gyro.zero), -TILT_CLAMP, TILT_CLAMP);
   gyro.everActive = true;
 }

--- Tras calibrateGyro (linea 192), añadir el recentrado condicional del spec:

+/** Recentra SOLO si la postura ha cambiado de verdad. Recentrar siempre al reanudar castiga a
+    quien no ha movido las manos, y no recentrar nunca deja la moto tirando de un lado a quien
+    dejo el movil en la mesa. Devuelve true si ha recentrado, para poder avisar. */
+export function rezeroIfMoved(){
+  if (!gyro.everActive || gyro.zero === null) return false;
+  if (Math.abs(gyro.raw) < TILT_REZERO) return false;
+  calibrateGyro();
+  return true;
+}

--- install() (lineas 196-227): blur delega en releaseAll, drag sube a modulo y la sensibilidad
    entra en la GANANCIA:

   addEventListener('keyup', e => keys.delete(e.code));
-  addEventListener('blur', () => { keys.clear(); pedal.gas = ...; btnSteer = 0; });
+  /* blur soltaba solo el teclado y los pedales, dejando el arrastre y los botones de pantalla
+     puestos. Se suelta TODO por el mismo camino que la pausa: dos formas distintas de soltar
+     son dos sitios donde olvidarse de algo. */
+  addEventListener('blur', releaseAll);
 
-  let drag = null;
   canvas.addEventListener('pointerdown', e => {
     drag = { id:e.pointerId, x:mapPointer(e).x };
     try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
   });
   canvas.addEventListener('pointermove', e => {
     if (!drag || e.pointerId !== drag.id) return;
     const p = mapPointer(e);
     const dx = p.x - drag.x;
     drag.x = p.x;
-    const k = 3.4 / Math.max(240, stage ? stage.clientWidth : innerWidth);
+    /* La sensibilidad entra AQUI, en el paso de pixeles a manillar, ANTES del recorte a +-1.
+       Multiplicando touchSteer despues del recorte (que es lo que se hacia) la sensibilidad al
+       minimo dejaba el tope de giro en 0,5 pasando el dedo por toda la pantalla: 600 px medidos
+       y sin llegar al tope. Y por encima de 1 no hacia nada, porque el clamp ya recortaba. */
+    const k = TOUCH_GAIN * sensOf('touch') / Math.max(240, stage ? stage.clientWidth : innerWidth);
     touchSteer = clamp(touchSteer + dx * k, -1, 1);
   });

--- bindButton (lineas 231-265): registrar un "olvidalo todo" por boton:

   const held = new Set();
+  /* Soltado forzoso, para releaseAll. Al cambiar de app no siempre llega pointerup ni
+     pointercancel: el id se queda dentro del conjunto, el siguiente pointerdown ya no es el
+     primero, onDown no vuelve a dispararse y el gas queda MUERTO el resto de la partida.
+     Comprobado en Chromium: throttle 1 -> releaseAll -> nuevo pointerdown -> throttle 0. */
+  const forget = () => {
+    if (!held.size) return;
+    held.clear();
+    el.classList.remove('press');
+    onUp();
+  };
+  bound.push(forget);
   const press = e => { ... };   // sin cambios

--- bindPedals (lineas 267-273): dos banderas para las flechas:

 export function bindPedals(els){
   bindButton(els.gas,   () => { pedal.gas = true; },   () => { pedal.gas = false; });
   bindButton(els.brake, () => { pedal.brake = true; }, () => { pedal.brake = false; });
-  bindButton(els.left,  () => { btnSteer = -1; },      () => { if (btnSteer < 0) btnSteer = 0; });
-  bindButton(els.right, () => { btnSteer = 1; },       () => { if (btnSteer > 0) btnSteer = 0; });
+  /* Una bandera por flecha: soltar DERECHA con IZQUIERDA aun pulsada tiene que devolver el
+     mando a la izquierda, no dejarlo a cero, y las dos juntas valen 0 (design/spec.md:229). */
+  bindButton(els.left,  () => { btnL = true; },  () => { btnL = false; });
+  bindButton(els.right, () => { btnR = true; },  () => { btnR = false; });
   bindButton(els.horn,  () => { pedal.horn = true; },  () => { pedal.horn = false; });
 }

--- Lineas 290-312, esquemas y estado. El respaldo termina en BOTONES, no en arrastre:

 /** Esquema que toca por defecto en este aparato. NO se guarda: se recalcula en cada arranque. */
 export function defaultScheme(){
-  const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
-  return touch && window.DeviceOrientationEvent ? 'tilt' : 'touch';
+  /* 'ontouchstart' in window lo cumple cualquier Chrome de escritorio con la emulacion tocada,
+     y DeviceOrientationEvent existe en TODOS los Chrome de escritorio sin ningun sensor detras
+     (medido). Ninguno de los dos vale por si solo. */
+  if (!isHandheld()) return 'touch';            // escritorio: el teclado pisa cualquier esquema
+  if (!window.DeviceOrientationEvent) return 'buttons';
+  if (insecureHttp()) return 'buttons';         // http en claro: el navegador retiene el sensor
+  return 'tilt';
 }
 
+/** Lo que el jugador ha PEDIDO, con el aparato decidiendo cuando no ha pedido nada. */
+export const wantedScheme = () =>
+  SCHEMES.includes(state.scheme) ? state.scheme : defaultScheme();
+
 export function activeScheme(){
-  const s = SCHEMES.includes(state.scheme) ? state.scheme : defaultScheme();
-  if (s === 'tilt' && !gyro.everActive) return 'touch';
+  const s = wantedScheme();
+  /* Respaldo a BOTONES y no a arrastre: design/spec.md:229 lo dice, y sobre todo caer al
+     arrastre deja al jugador sin nada visible con lo que girar, que es justo su queja. Con
+     botones aparecen solas las dos flechas en pantalla en el mismo instante del fallo.
+     Se mira everActive y no active para no cambiar el mando a mitad de curva. */
+  if (s === 'tilt' && !gyro.everActive) return 'buttons';
   return s;
 }
 
 export function gyroStatus(){
   if (!window.DeviceOrientationEvent) return 'unsupported';
+  if (insecureHttp()) return 'insecure';
+  if (gyro.denied) return 'denied';
-  if (!gyro.granted) return 'denied';
+  if (!gyro.granted) return 'ask';
   if (!gyro.everActive) return 'waiting';
+  if (!gyro.active) return 'stalled';
   return 'live';
 }

--- update() (lineas 316-366), reescrito de la linea 326 en adelante:

 export function update(dt){
   const pad = padState();
-  const sens = state.sens || 1;
   ... gas y freno sin cambios ...
   const scheme = activeScheme();
+  const now = performance.now();
 
-  if (gyro.active){
-    const full = Math.max(8, TILT_FULL / sens);
+  /* El sensor esta vivo o no segun el RELOJ. gyro.active se ponia a true y no habia quien lo
+     bajara: al cambiar de app dejaban de llegar eventos, el ultimo angulo se quedaba dentro y
+     el manillar se quedaba pegado a medio giro. Medido: steer 0,49 congelado cinco segundos
+     despues del ultimo evento, y gyroStatus() contestando "live". */
+  gyro.active = gyro.granted && gyro.zero !== null && (now - gyro.last) < GYRO_TIMEOUT;
+
+  if (gyro.active){
+    /* La sensibilidad escala el ANGULO de tope, no la salida: multiplicando la salida, con
+       sens 2 se saturaba a 11 grados mientras la zona muerta seguia en 2, y la zona de control
+       fino se comprimia a la mitad. */
+    const full = tiltFullDeg();
     const mag = clamp((Math.abs(gyro.raw) - TILT_DEAD) / (full - TILT_DEAD), 0, 1);
-    const target = Math.sign(gyro.raw) * (mag * mag * 0.62 + mag * 0.38);
+    const target = Math.sign(gyro.raw) * Math.pow(mag, TILT_EXPO);
     gyroSteer += (target - gyroSteer) * (1 - Math.exp(-TILT_SMOOTH * dt));
-  } else { gyroSteer = 0; }
+  } else {
+    // relajar y no cortar en seco: un corte a cero se siente como un tiron del manillar
+    gyroSteer += (0 - gyroSteer) * (1 - Math.exp(-TILT_SMOOTH * dt));
+  }
+
+  /* Botones: la sensibilidad manda en la RAMPA, no en el destino. Multiplicar +-1 por la
+     sensibilidad dejaba el tope de giro en 0,5 con el deslizador al minimo (no se podia
+     cambiar de carril) y no hacia NADA por encima de 1, porque el clamp final ya recortaba.
+     Medido: 0,5 / 1 / 1 para sensibilidades 0,5 / 1 / 2. */
+  const btnDir = (btnR ? 1 : 0) + (btnL ? -1 : 0);
+  const btnRate = (btnDir ? BTN_ATTACK : BTN_RELEASE) * sensOf('buttons');
+  btnSteer += clamp(btnDir - btnSteer, -btnRate * dt, btnRate * dt);
 
   let steer = scheme === 'tilt' ? gyroSteer
             : scheme === 'buttons' ? btnSteer
             : touchSteer;
+  /* Red de seguridad: con giroscopio, un arrastre EN CURSO manda. Si el sensor se queda mudo a
+     200 km/h el pulgar sigue sirviendo, y como hace falta estar arrastrando no pelea nunca con
+     la inclinacion. */
+  if (scheme === 'tilt' && drag) steer = touchSteer;
+
+  /* La inversion es un espejo del esquema del APARATO y se aplica antes de que el teclado o el
+     mando pisen. Nunca sobre botones: una flecha etiquetada ◀ que gira a la derecha no es un
+     ajuste, es un fallo. Y nunca sobre teclado ni mando, por lo mismo. */
+  if (state.invert && (scheme === 'tilt' || scheme === 'touch')) steer = -steer;
 
   let kb = 0;
   if (keys.has('ArrowLeft') || keys.has('KeyA')) kb -= 1;
   if (keys.has('ArrowRight') || keys.has('KeyD')) kb += 1;
   if (kb) steer = kb;
   else if (pad && pad.steer) steer = pad.steer;
-  if (state.invert) steer = -steer;
 
   input.throttle = clamp(throttle, 0, 1);
   input.brake = clamp(brake, 0, 1);
   input.steer = clamp(steer, -1, 1);
   input.horn = pedal.horn || keys.has('KeyH');
-  input.tiltDeg = gyro.active ? gyro.raw : 0;
+  /* El angulo se publica SIEMPRE: el indicador de los ajustes tiene que poder mostrar el punto
+     congelado cuando el sensor calla, que es distinto de mostrarlo centrado. */
+  input.tiltDeg = gyro.raw;
 
-  if (scheme === 'touch' && !kb) touchSteer *= Math.exp(-5 * dt);
+  // el arrastre se autocentra siempre que no haya dedo puesto, tambien con giroscopio activo
+  if (!drag && !kb) touchSteer *= Math.exp(-TOUCH_DECAY * dt);
 }

--- releaseAll (lineas 368-375), completo:

 export function releaseAll(){
   keys.clear();
   pedal.gas = pedal.brake = pedal.horn = false;
-  btnSteer = 0;
+  btnL = btnR = false;
+  btnSteer = 0;
   touchSteer = 0;
+  gyroSteer = 0;
+  /* La sesion de arrastre TAMBIEN se cancela: con el dedo puesto al irse a segundo plano, el
+     primer pointermove al volver comparaba con una posicion de hace un minuto y metia el
+     manillar a tope de golpe. Medido: steer 1 sin haber arrastrado. */
+  drag = null;
+  /* Y los botones de pantalla se dan por soltados uno a uno: sin esto el id fantasma se queda
+     dentro del conjunto y el gas no vuelve a responder. */
+  for (const forget of bound) forget();
   input.throttle = input.brake = input.steer = 0;
   input.horn = false;
 }


========================================================================
3) src/main.js
========================================================================

--- Borrar la linea 41 entera y poner en su lugar:

-  if (!controls.SCHEMES.includes(state.scheme)) state.scheme = controls.defaultScheme();
+  /* NO se resuelve el esquema sobre el estado: state.scheme en null significa "lo decide el
+     aparato en cada arranque", y escribirlo aqui lo persistia por el guardado de pagehide,
+     convirtiendo una suposicion en la eleccion del jugador. Solo se engancha el sensor cuando
+     el esquema que toca es inclinar, para saber si hay lecturas antes de pulsar CONDUCIR. */
+  if (controls.wantedScheme() === 'tilt') controls.sniffGyro();

--- onBootDone (lineas 59-66):

     onBootDone: () => {
-      if (state.scheme === 'tilt') controls.enableGyro().catch(() => {});
+      /* Primer gesto real del jugador, y el unico sitio desde el que iOS acepta conceder el
+         giroscopio. enableGyro ya espera 1,5 s a que llegue una lectura de verdad, asi que si
+         resuelve false hay motivo concreto que contar y el respaldo a botones ya esta activo. */
+      if (controls.wantedScheme() === 'tilt')
+        controls.enableGyro().then(ok => {
+          if (!ok) ui.toast(t('sch.' + controls.gyroStatus()));
+          ui.paintPedals();
+        }).catch(() => {});
+      if (notes.invertFixed) ui.toast(t('sch.invertfix'));
       if (!state.lang) ui.show('lang');

--- ride() (linea 49) y onResume (linea 71):

   const ride = () => {
     const envs = ['day', 'sunset', 'night'];
     game.start(envs[state.runs % envs.length]);
+    ui.paintPedals();          // el respaldo puede haber cambiado el esquema activo
     ui.show('game');

-    onResume: () => { game.resume(); ui.show('game'); },
+    onResume: () => {
+      /* Al reanudar se recentra SOLO si la postura ha cambiado de verdad (mas de 12 grados,
+         design/spec.md:229): recentrar siempre castiga a quien no ha movido las manos, y no
+         recentrar nunca deja tirando de un lado a quien dejo el movil en la mesa. */
+      if (controls.activeScheme() === 'tilt' && controls.rezeroIfMoved())
+        ui.toast(t('sch.calibrated'));
+      game.resume(); ui.show('game');
+    },

--- Importar notes y reforzar pagehide (linea 153):

-import { load, save, state } from './state.js';
+import { load, save, state, notes } from './state.js';
...
-  addEventListener('pagehide', save);
+  /* pagehide llega tambien al congelar la pestaña en iOS, y ahi el dedo puede quedarse puesto:
+     se suelta todo antes de guardar. */
+  addEventListener('pagehide', () => { controls.releaseAll(); save(); });


========================================================================
4) template.html — grupo de control primero, filas condicionales, PAUSA
========================================================================

--- CSS, tras la linea 121 (.seg button.on):

+  .row.off{display:none}
+  /* Linea de estado del control: es la pieza que faltaba. Sin ella el selector puede decir
+     INCLINAR mientras se conduce con botones y el jugador no tiene forma de enterarse. */
+  .row.hint{display:block;padding:0 2px 10px}
+  #scheme-hint{font-size:10.5px;font-weight:600;color:var(--dim);line-height:1.45}
+  #scheme-hint.bad{color:#ffb060}
+  #tiltbar.dead>i{background:var(--dim)}
+  #tiltbar.stall>i{background:#ffb060}
+  #set-sensval{font-size:10.5px;font-weight:800;color:var(--dim);
+    font-variant-numeric:tabular-nums;min-width:34px;text-align:right}
+  .tiltwrap{display:flex;align-items:center;gap:9px}

--- Reemplazar las filas de ajustes (lineas 279-296) por este orden. Control primero porque es
    la queja; idioma y calidad ya se eligen en el primer arranque:

       <div class="scroll">
+        <div class="row"><span class="lb" data-i18n="set.scheme"></span><div class="seg" id="set-scheme"></div></div>
+        <div class="row hint"><span id="scheme-hint"></span></div>
+        <div class="row off" id="row-tilt">
+          <span class="lb" data-i18n="set.tilt"></span>
+          <div class="tiltwrap">
+            <div id="tiltbar" class="dead"><u></u><i></i></div>
+            <button class="btn ghost small" id="b-calib" data-i18n="set.calibrate"></button>
+          </div>
+        </div>
+        <div class="row" id="row-sens"><span class="lb" data-i18n="set.sens"></span>
+          <div class="tiltwrap"><input type="range" id="set-sens" min="40" max="200"><span id="set-sensval"></span></div></div>
+        <div class="row" id="row-invert"><span class="lb" data-i18n="set.invert"></span><div class="seg" id="set-invert"></div></div>
         <div class="row"><span class="lb" data-i18n="set.lang"></span><div class="seg" id="set-lang"></div></div>
         <div class="row"><span class="lb" data-i18n="set.quality"></span><div class="seg" id="set-quality"></div></div>
-        <div class="row"><span class="lb" data-i18n="set.scheme"></span>...</div>
-        <div class="row" id="row-tilt">...</div>
         <div class="row"><span class="lb" data-i18n="set.music"></span><input type="range" id="set-music" min="0" max="100"></div>
         <div class="row"><span class="lb" data-i18n="set.sfx"></span><input type="range" id="set-sfx" min="0" max="100"></div>
-        <div class="row"><span class="lb" data-i18n="set.sens"></span><input type="range" id="set-sens" min="50" max="200"></div>
         <div class="row"><span class="lb" data-i18n="set.haptics"></span><div class="seg" id="set-haptics"></div></div>
-        <div class="row"><span class="lb" data-i18n="set.invert"></span><div class="seg" id="set-invert"></div></div>
         <div class="row" style="justify-content:center">
           <button class="btn ghost small danger" id="b-wipe" data-i18n="set.reset"></button>
         </div>

--- Pantalla de PAUSA (linea 331), CENTRAR donde se necesita de verdad:

     <div class="btnstack">
       <button class="btn" id="b-resume" data-i18n="pause.resume"></button>
+      <!-- El centro torcido se descubre conduciendo, no en el menu. design/spec.md:109 pide
+           aqui un panel CONTROLS reducido; esto es su minimo utilizable. -->
+      <button class="btn ghost off" id="b-calib2" data-i18n="set.calibrate"></button>
       <button class="btn ghost" id="b-restart" data-i18n="pause.restart"></button>


========================================================================
5) src/ui.js
========================================================================

--- Reemplazar el bloque del esquema (lineas 246-269) por:

+    /* Elegir giroscopio pide el permiso AQUI, dentro del gesto del toque: iOS rechaza
+       requestPermission fuera de uno. Volver a tocar el mismo segmento reintenta, que es la
+       unica salida para quien denego sin querer. */
     this.rp.scheme = this.seg($('set-scheme'),
       controls.SCHEMES.map(s => ({ label:t('sch.' + s), value:s })),
-      () => state.scheme || controls.defaultScheme(),
+      () => controls.wantedScheme(),
       v => {
         state.scheme = v;
-        if (v === 'tilt') controls.enableGyro().then(ok => { ...setTimeout(1600)... });
         this.paintPedals();
+        this.paintControlRows();
+        if (v !== 'tilt') return;
+        controls.enableGyro().then(ok => {
+          this.paintControlRows();
+          this.paintPedals();
+          // se dice el motivo concreto, no un "no hay giroscopio" generico
+          if (!ok) this.toast(t('sch.' + controls.gyroStatus()));
+        });
       });
-    $('b-calib').addEventListener('click', () => { controls.calibrateGyro(); this.toast(t('sch.calibrated')); });
+    const calib = () => { controls.calibrateGyro(); this.toast(t('sch.calibrated')); };
+    $('b-calib').addEventListener('click', calib);
+    if ($('b-calib2')) $('b-calib2').addEventListener('click', calib);

--- Deslizador de sensibilidad (linea 285): por esquema y con su numero a la vista

-    slider($('set-sens'), () => Math.round(state.sens * 100), v => { state.sens = v / 100; });
+    /* Por esquema (design/spec.md:121): el valor bueno para el pulgar no es el bueno para las
+       muñecas. Y con el numero delante, porque un deslizador sin cifra no se puede repetir. */
+    slider($('set-sens'), () => Math.round(sensOf(controls.wantedScheme()) * 100),
+      v => { setSens(controls.wantedScheme(), v / 100); this.paintSens(); });

--- Añadir los tres metodos nuevos (junto a paintPedals, linea 295):

+  paintSens(){
+    const el = $('set-sensval');
+    if (el) el.textContent = 'x' + sensOf(controls.wantedScheme()).toFixed(2).replace('.', ',');
+  }
+
+  /** Solo se ensenan las filas que hacen algo con el esquema elegido, y se dice CON PALABRAS
+      por que el giroscopio no responde en vez de degradar en silencio, que es literalmente la
+      queja de "pedi giroscopio y tengo la interfaz de otra cosa". */
+  paintControlRows(){
+    const want = controls.wantedScheme();
+    const act = controls.activeScheme();
+    const st = controls.gyroStatus();
+    const row = (id, on) => { const el = $(id); if (el) el.classList.toggle('off', !on); };
+    row('row-tilt', want === 'tilt');
+    // invertir un boton etiquetado con una flecha no tiene sentido: la fila se esconde
+    row('row-invert', want === 'tilt' || want === 'touch');
+    const c2 = $('b-calib2');
+    if (c2) c2.classList.toggle('off', act !== 'tilt');
+    const hint = $('scheme-hint');
+    if (hint){
+      const bad = want === 'tilt' && act !== 'tilt';
+      hint.textContent = want === 'tilt' && st !== 'live'
+        ? t('sch.' + st) + (bad ? ' — ' + t('sch.fallback') : '')
+        : t('sch.hint.' + want);
+      hint.classList.toggle('bad', bad);
+    }
+    this.paintSens();
+  }

--- tilt() (lineas 301-309), reescrito:

   tilt(deg, live){
-    const bar = $('tiltbar');
-    if (!bar || this.screen !== 'settings') return;
-    bar.classList.toggle('dead', !live);
-    const k = Math.max(-1, Math.min(1, deg / 22));
-    bar.firstElementChild.nextElementSibling.style.transform = 'translateX(' + (k * 52) + 'px)';
+    if (this.screen !== 'settings') return;
+    const bar = $('tiltbar');
+    if (!bar) return;
+    /* Se escala con el angulo de tope EFECTIVO y no con un 22 a pelo: la sensibilidad divide
+       ese angulo, asi que con sens 2 el manillar estaba a tope a 11 grados y el punto se
+       quedaba a mitad de recorrido, con lo que parecia que el sensor no llegaba. */
+    const k = Math.max(-1, Math.min(1, deg / controls.tiltFullDeg()));
+    const st = controls.gyroStatus();
+    bar.classList.toggle('dead', !live && st !== 'stalled');
+    bar.classList.toggle('stall', st === 'stalled');   // punto ambar: hubo sensor y ha callado
+    bar.querySelector('i').style.transform = 'translateX(' + (k * 52).toFixed(1) + 'px)';
+    if (st !== this.lastGyroStatus){ this.lastGyroStatus = st; this.paintControlRows(); }
   }

--- refreshSettings (lineas 311-326): añadir la llamada y quitar la del sens global

     for (const k in this.rp) this.rp[k]();
     this.paintPedals();
+    this.paintControlRows();
     ...
-    $('set-sens').value = Math.round(state.sens * 100);
+    $('set-sens').value = Math.round(sensOf(controls.wantedScheme()) * 100);

--- Import (linea 4): añadir sensOf y setSens
-import { state, save, wipe, BIKES, ... QUALITIES } from './state.js';
+import { state, save, wipe, sensOf, setSens, BIKES, ... QUALITIES } from './state.js';


========================================================================
6) src/i18n.js — 12 claves nuevas x 4 lenguas
========================================================================

es (tras 'sch.calibrated', linea 40):
+    'sch.hint.tilt':'Inclina el móvil como si fuera el manillar. Pulsa CENTRAR sujetándolo en tu postura de conducir.',
+    'sch.hint.touch':'Arrastra el pulgar por la pantalla para girar. Al soltar, la moto se endereza.',
+    'sch.hint.buttons':'Gira con las dos flechas de abajo a la izquierda.',
+    'sch.live':'Giroscopio activo',
+    'sch.waiting':'Esperando lecturas del sensor…',
+    'sch.ask':'Toca INCLINAR otra vez para dar permiso al sensor',
+    'sch.denied':'Permiso del sensor denegado',
+    'sch.unsupported':'Este aparato no tiene giroscopio',
+    'sch.insecure':'Sin https el navegador no entrega el sensor',
+    'sch.stalled':'El sensor ha dejado de responder',
+    'sch.fallback':'se conduce con botones',
+    'sch.invertfix':'Se ha desactivado «Invertir giro»: el giro ya no está al revés',
-    'sch.nogyro':'Este aparato no da lecturas de inclinacion',
+    'sch.nogyro':'Este aparato no da lecturas de inclinación',

en:
+    'sch.hint.tilt':'Tilt the phone like the handlebars. Tap CENTRE while holding it in your riding posture.',
+    'sch.hint.touch':'Drag your thumb across the screen to steer. Let go and the bike straightens up.',
+    'sch.hint.buttons':'Steer with the two arrows at the bottom left.',
+    'sch.live':'Gyroscope live',
+    'sch.waiting':'Waiting for sensor readings…',
+    'sch.ask':'Tap TILT again to allow the sensor',
+    'sch.denied':'Sensor permission denied',
+    'sch.unsupported':'This device has no gyroscope',
+    'sch.insecure':'Without https the browser withholds the sensor',
+    'sch.stalled':'The sensor stopped responding',
+    'sch.fallback':'steering with buttons',
+    'sch.invertfix':'“Invert steering” has been turned off: steering is no longer reversed',

pt:
+    'sch.hint.tilt':'Incline o celular como se fosse o guidão. Toque em CENTRAR segurando-o na sua posição de pilotagem.',
+    'sch.hint.touch':'Arraste o polegar pela tela para virar. Ao soltar, a moto se endireita.',
+    'sch.hint.buttons':'Vire com as duas setas embaixo à esquerda.',
+    'sch.live':'Giroscópio ativo',
+    'sch.waiting':'Aguardando leituras do sensor…',
+    'sch.ask':'Toque em INCLINAR novamente para permitir o sensor',
+    'sch.denied':'Permissão do sensor negada',
+    'sch.unsupported':'Este aparelho não tem giroscópio',
+    'sch.insecure':'Sem https o navegador não entrega o sensor',
+    'sch.stalled':'O sensor parou de responder',
+    'sch.fallback':'pilotando com botões',
+    'sch.invertfix':'“Inverter direção” foi desativado: a direção não está mais invertida',

fr:
+    'sch.hint.tilt':'Inclinez le téléphone comme un guidon. Appuyez sur CENTRER en le tenant dans votre position de conduite.',
+    'sch.hint.touch':'Faites glisser le pouce sur l’écran pour tourner. Au relâchement, la moto se redresse.',
+    'sch.hint.buttons':'Tournez avec les deux flèches en bas à gauche.',
+    'sch.live':'Gyroscope actif',
+    'sch.waiting':'En attente des mesures du capteur…',
+    'sch.ask':'Touchez INCLINER à nouveau pour autoriser le capteur',
+    'sch.denied':'Autorisation du capteur refusée',
+    'sch.unsupported':'Cet appareil n’a pas de gyroscope',
+    'sch.insecure':'Sans https le navigateur ne fournit pas le capteur',
+    'sch.stalled':'Le capteur ne répond plus',
+    'sch.fallback':'direction aux boutons',
+    'sch.invertfix':'« Inverser la direction » a été désactivé : la direction n’est plus inversée',

### constants

- **name**: TILT_FULL — **value**: 22 grados — **why**: Alabeo que vale tope de giro a sensibilidad 1. Es lo que se alcanza girando las muñecas sin mover los brazos; mas obliga a inclinar el movil hasta perder de vista la pantalla. Coincide con design/spec.md:229 ("full lock at 22/sensitivity deg").
- **name**: TILT_DEAD — **value**: 2.0 grados — **why**: Zona muerta con renormalizacion posterior, segun design/spec.md:229. El codigo tenia 1.6; a 2.0 la moto no vibra sola en la mano y la renormalizacion evita el escalon a la salida de la zona muerta.
- **name**: TILT_CLAMP — **value**: 30 grados — **why**: Mas alla no se lee (spec:229). A 30 grados el jugador ya no ve bien la pantalla; leer 60 solo sirve para que un tropiezo meta el manillar a tope.
- **name**: TILT_EXPO — **value**: 1.3 — **why**: Exponente de la curva de respuesta (spec:229). Da mas resolucion en el centro para colocarse en el carril. La curva hibrida que habia (mag^2*0.62+mag*0.38) difiere menos de 0,06 en todo el recorrido; se cambia por alinear con el spec, no por sensacion.
- **name**: TILT_SMOOTH — **value**: 14 /s — **why**: Equivalente continuo del filtro de un polo con alpha 0,20 por fotograma a 60 Hz que pide el spec: -ln(1-0,20)*60 = 13,4. Se aplica una vez por FOTOGRAMA (main.js:128), nunca por paso de fisica, o el suavizado se dispara x120.
- **name**: TILT_REZERO — **value**: 12 grados — **why**: Diferencia de postura que obliga a recentrar al reanudar (spec:229). Por debajo son las manos moviendose; por encima es otra postura. Recentrar siempre castiga a quien no movio nada.
- **name**: GYRO_WAIT — **value**: 1500 ms — **why**: Espera a la PRIMERA lectura antes de dar el sensor por muerto. Lo fija design/spec.md:229. iOS entrega el primer evento en 100-300 ms tras conceder y Android en un periodo de sensor, asi que 1,5 s no da falsos negativos y aun contesta antes de que el jugador se vaya de la fila de ajustes.
- **name**: GYRO_TIMEOUT — **value**: 500 ms — **why**: Silencio que convierte el sensor en mudo. Los sensores mas lentos que he visto reportan a 10 Hz, asi que 500 ms son cinco lecturas perdidas: no hay falso positivo, y medio segundo de manillar congelado es sobrevivible a 200 km/h.
- **name**: ZERO_MS / ZERO_MAX / ZERO_MIN — **value**: 500 ms / 30 lecturas / 4 lecturas — **why**: Media circular del centro: se cierra a los 0,5 s o a las 30 lecturas, la que llegue antes, con un minimo de 4. El spec pide 30 en 0,5 s (60 Hz); contar solo lecturas dejaria 3 segundos de espera en un sensor a 10 Hz y el jugador cree que CENTRAR no funciona.
- **name**: ZERO_MIN_FLAT — **value**: 0.30 (|g| en el plano de la pantalla) — **why**: No se calibra con el movil casi plano: 0,30 son unos 17 grados de inclinacion, por debajo el alabeo es ruido y un centro torcido se siente exactamente igual que unos controles invertidos.
- **name**: BTN_ATTACK — **value**: 1/0.12 = 8.33 topes/s — **why**: Rampa al pulsar una flecha (spec:229 "attack 0.12 s"). Ojo: game.js:169-170 limita el manillar a 5,5 topes/s, asi que hoy el techo real son 182 ms y la sensibilidad por encima de 0,66 no se nota. Hay que subir ese 5.5 a ~9 o aceptar que el ajuste satura.
- **name**: BTN_RELEASE — **value**: 1/0.08 = 12.5 topes/s — **why**: Vuelta al centro al soltar (spec:229 "release 0.08 s"). El spec tambien dice "auto-centre at 4x the attack rate" (33/s), que se contradice con 0,08 s; me quedo con el numero conservador porque endereza de forma predecible en vez de dar un tiron.
- **name**: TOUCH_GAIN — **value**: 3.4 topes de manillar por ancho de pantalla — **why**: Ganancia del arrastre, ya presente en controls.js:220. Un barrido completo da 3,4 topes, o sea que el tope se alcanza con el 29% del ancho: alcanzable con el pulgar sin recolocar la mano. La sensibilidad multiplica AQUI, antes del recorte a +-1.
- **name**: TOUCH_DECAY — **value**: 5 /s — **why**: Autocentrado del arrastre al levantar el dedo: 200 ms de constante de tiempo, el pulgar suelta y la moto se endereza sin que parezca que se ha quedado enganchada. Ahora corre tambien con giroscopio activo, para que touchSteer no se quede acumulado a +-1 en segundo plano.
- **name**: SENS_MIN / SENS_MAX — **value**: 0.4 / 2.0 — **why**: Rango del deslizador segun design/spec.md:121. El template esta en 50-200 y hay que bajar el minimo a 40. Con la sensibilidad puesta en la rampa y en la ganancia (y no en el valor final) el tope de giro sigue siendo alcanzable en todo el rango, que es lo que hoy NO ocurre.
- **name**: Recorrido del punto del indicador — **value**: +-52 px sobre una barra de 124 px — **why**: El punto mide 14 px y arranca centrado en 62: 52 px lo llevan a 114, con el borde en 121, dentro de la barra. Se escala con tiltFullDeg() y no con 22, para que el extremo del recorrido coincida exactamente con el tope de giro a cualquier sensibilidad.

### pitfalls

- window.DeviceOrientationEvent existe en TODOS los Chrome de escritorio sin ningun sensor detras: lo he medido, `{DOE:true}` en una ventana de 1280x800 sin dedo. Existir el constructor no es tener giroscopio, y tampoco lo es tener el permiso concedido. Lo unico que demuestra que hay sensor es una lectura con beta/gamma no nulos, y hasta que llegue el esquema activo tiene que ser otro.
- `'ontouchstart' in window` da verdadero en cualquier Chrome de escritorio con la emulacion tactil tocada y en todo portatil con pantalla tactil. Usarlo como test de movil es el motivo por el que un portatil acaba con el juego girado 90 grados y con giroscopio elegido. `matchMedia('(pointer: coarse)')` es el puntero PRIMARIO y en un portatil tactil vale fine; ahi esta la diferencia.
- Playwright NO puede emular un portatil tactil de verdad: `hasTouch:true` con `isMobile:false` fuerza igualmente `pointer:coarse` y `hover:none` (medido). La deteccion hay que probarla inyectando un matchMedia falso con `page.addInitScript`, no con un perfil de dispositivo.
- Algun WebView de Android antiguo reporta `hover:hover` por error. Por eso la rotacion de pantalla usa solo `isCoarse()` (sin la clausula de hover) y el hover solo interviene en el ESQUEMA por defecto: el peor caso pasa a ser un movil que arranca con arrastre en vez de con inclinacion, que el jugador arregla en un toque, en vez de un movil sin girar.
- iOS recuerda la denegacion por origen: `requestPermission()` vuelve a resolver 'denied' al instante y sin dialogo. Reintentar en bucle no sirve de nada; hay que decirle al jugador que el permiso esta denegado (y que se quita desde Ajustes de Safari), no repetir la peticion.
- `requestPermission()` solo vale dentro de un gesto. `enableGyro()` es async pero llama a requestPermission de forma SINCRONA antes del primer await, y por eso funciona desde el pointerdown de la pantalla de carga (ui.js:78). Si alguien mete un `await` delante, la peticion sale fuera de la ventana de activacion y falla en silencio en iOS.
- Un iframe sin `allow="gyroscope"` concede el permiso y no entrega NUNCA un evento. Es el caso que hace obligatorio esperar una lectura de verdad en vez de fiarse del 'granted', y el que justifica el estado 'waiting' separado de 'denied'.
- http en claro sobre una IP de LAN (probar en el movil contra el portatil) bloquea los sensores en Chrome; localhost y file:// si son contexto seguro (medido: file:// da `isSecureContext:true`). Por eso el test es `location.protocol === 'http:' && !isSecureContext` y no `!isSecureContext` a secas, que romperia la distribucion en un solo fichero abierta desde file://.
- Cambiar de app no garantiza pointerup ni pointercancel. Cualquier estado de pulsacion que viva en un Set dentro de una clausura y no se pueda vaciar desde fuera acaba con un id fantasma dentro, y con un id dentro el siguiente pointerdown no es el primero: el boton queda muerto para siempre. Todo estado de pulsacion tiene que ser alcanzable desde releaseAll.
- Una sesion de arrastre guarda la ULTIMA posicion del dedo. Si sobrevive a un viaje al segundo plano, el primer pointermove al volver produce un delta gigante y mete el manillar a tope de golpe (medido: steer 1 sin arrastrar). Cancelar la sesion es tan obligatorio como poner a cero el valor.
- `gyro.active` como bandera que solo sube es la trampa clasica: en el movil parece funcionar siempre, porque mientras miras la pantalla los eventos llegan. Solo se ve al cambiar de app o al revocar el permiso, y entonces el manillar se queda pegado a medio giro (medido: 0,49 congelado). Tiene que derivarse de la hora de la ultima lectura.
- La sensibilidad multiplicando el valor final es indetectable a ojo porque la moto sigue girando. Solo se ve midiendo: por debajo de 1 el tope de giro es inalcanzable (0,5 con sens 0,5) y por encima de 1 el ajuste es inerte porque el clamp ya recorta. Cada esquema tiene su unidad y la sensibilidad entra en la unidad, no en la salida.
- Invertir el valor final invierte tambien el teclado, el mando y las flechas ◀ ▶ de la pantalla. Una flecha etiquetada que gira al otro lado no se lee como un ajuste, se lee como que el juego esta roto; y quien activo invertir para compensar el giroscopio al reves se encuentra el teclado del reves en el escritorio.
- Un guardado con `invert:true` puesto para compensar el signo negado de la gravedad (controls.js:151) reintroduce el fallo en cuanto se arregla el signo. Es exactamente el caso que exige una revision de ajustes y no un simple valor por defecto: sin la migracion, el jugador que reporto "controles en reversa" los sigue teniendo en reversa despues del arreglo.
- Resolver el esquema por defecto SOBRE el estado lo convierte en persistido en cuanto algo guarde (pagehide guarda siempre). El valor deducido tiene que recalcularse en cada arranque y null tiene que seguir siendo null hasta que el jugador toque el selector.
- design/spec.md:229 manda respaldar a BOTONES, no a arrastre. No es un detalle de estilo: con botones aparecen dos flechas visibles en el mismo instante del fallo, y con arrastre el jugador se queda mirando una pantalla sin nada que tocar, que es literalmente lo que ha reportado.
- El limitador del manillar de game.js:169-170 (5,5 topes/s) es mas lento que la rampa de botones que pide el spec (8,33). Mientras siga ahi, la sensibilidad de botones por encima de 0,66 no cambia nada: el techo lo pone la fisica, no la entrada. Hay que subirlo o documentar que el ajuste satura.
- design/spec.md:229 pide ademas "swipe-into-button" en las flechas: hoy `bindButton` solo escucha pointerdown, asi que deslizar el pulgar desde el hueco hasta la flecha no la pulsa. Hace falta un `pointerenter` con `e.buttons !== 0` para completarlo.

### verify

- El probe que he escrito y ejecutado ya cubre los cinco defectos y hay que moverlo a tools/probe_schemes.mjs para que quede en el repo: `cp /tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/probe_schemes.mjs /home/user/General-Assets-Games/redline-rider/tools/` y `node tools/probe_schemes.mjs`. Salida ANTES del arreglo (real): botones [0.5, 1, 1]; arrastre sens 0,5 con pxParaTope -1; 'FALLA: el gas queda muerto'; 'FALLA: salto a tope sin arrastrar'; 'FALLA: el manillar se queda pegado'.
- Criterios de aceptacion del mismo probe DESPUES del arreglo, uno por defecto: (1) botones -> steer 1.0 con las tres sensibilidades, y el tiempo hasta el tope escala 1/sens; (2) arrastre -> pxParaTope finito con sens 0,4 y proporcional a 1/sens; (3) tras releaseAll con el dedo puesto, un pointerdown con OTRO pointerId devuelve throttle 1 y la clase .press queda limpia; (4) tras releaseAll, un pointermove al otro extremo deja |steer| < 0,05; (5) 500 ms sin eventos de orientacion -> |steer| < 0,05, gyroLive() false y gyroStatus() 'stalled'.
- Matriz de deteccion sin dispositivos, con matchMedia falseado antes del arranque: `page.addInitScript(({c,h}) => { const real = matchMedia; window.matchMedia = q => /pointer: coarse/.test(q) ? {matches:c} : /hover: hover/.test(q) ? {matches:h} : real(q); }, {c,h})`. Cuatro casos y sus valores esperados: movil (coarse true, hover false) -> defaultScheme 'tilt' y html.rot true en vertical; tableta (true,false) -> igual; portatil tactil (false,true) con maxTouchPoints 10 -> 'touch' y rot FALSE (es el falso positivo que hay hoy); escritorio (false,true) -> 'touch' y rot false.
- Cadena de respaldo, cuatro escenarios en el mismo probe: sin DeviceOrientationEvent (`delete window.DeviceOrientationEvent` en addInitScript) -> activeScheme 'buttons', gyroStatus 'unsupported', y `#pedals` con la clase btns puesta y las dos flechas con display distinto de none; requestPermission devolviendo 'denied' (stub) -> 'buttons' y estado 'denied'; permiso concedido y CERO eventos -> enableGyro resuelve false en ~1500 ms y estado 'waiting'; permiso concedido con eventos -> resuelve true, estado 'live' y activeScheme 'tilt'.
- Signo y centro del giroscopio: reutilizar tal cual el bloque 6 de tools/probe_mobile.mjs (deriva beta/gamma de una postura fisica en vez de repetir la formula del modulo, con lo que la contrasta de verdad) y comprobar ademas que el mismo alabeo con `state.invert = true` da el signo opuesto SOLO en tilt y touch, y el MISMO signo con scheme 'buttons', con el teclado y con el mando.
- Indicador vivo: con `setSens('tilt', 2)` y un alabeo de 11 grados, `#tiltbar > i` tiene que estar en translateX(52px) (tope del recorrido) y no en 26; con el sensor mudo la barra lleva la clase 'stall' y `#scheme-hint` contiene el texto de sch.stalled.
- Filas condicionales: recorrer los tres esquemas por `ui.rp.scheme` y comprobar en cada uno que row-tilt solo se ve con tilt, row-invert no se ve con buttons, row-sens se ve siempre, y que el texto de #scheme-hint no queda vacio ni contiene la clave sin traducir (una clave que falte en i18n.js se devuelve tal cual por i18n.js:185, asi que buscar 'sch.' en el textContent detecta cualquier traduccion que se me haya olvidado, en las cuatro lenguas).
- Migracion, sin navegador: `localStorage.setItem('redline.v1', JSON.stringify({sens:1.4, invert:true, scheme:'gyro'}))` antes de arrancar, y tras load() comprobar `state.scheme === null`, `state.sens` = {tilt:1.4, touch:1.4, buttons:1.4}, `state.invert === false`, `state.rev === 1` y `notes.invertFixed === true`. Recargar una segunda vez: invertFixed tiene que ser false y un invert que el jugador vuelva a activar debe sobrevivir. Y tras `wipe()`, rev sigue en 1 (si no, la migracion vuelve a apagar invert).
- Ciclo de pausa completo: pulsar #p-gas, disparar `document.dispatchEvent(new Event('visibilitychange'))` con `document.hidden` forzado a true, volver, y comprobar throttle 0, sin clases .press colgadas y que un toque nuevo en el gas responde; despues, con la pantalla de pausa abierta, inclinar 20 grados y pulsar CONTINUAR: `rezeroIfMoved()` tiene que devolver true, salir el aviso de sch.calibrated y quedar |input.steer| < 0,05 en el fotograma siguiente.
- Al terminar, reconstruir y volver a pasar el probe sobre el fichero empaquetado, no solo sobre src: `node build.mjs && node tools/probe_schemes.mjs index.html && node tools/probe_mobile.mjs index.html`. Todo esto se compila a un IIFE clasico, y una exportacion reexportada (`export { SCHEMES }` desde state.js) es justo el tipo de cosa que funciona en modulos y hay que ver funcionando tambien empaquetada.

## Confirmo las dos tesis matematicas y corrijo la premisa de partida de casi todas las investigaciones: el arbol de trabajo ya NO es el que describen. `src/controls.js` y `src/main.js` se reescribieron a las 08:16 y ya traen aplicado lo gordo (el signo de gx, `stageW` cacheado, `held` como conjunto, `drag` a nivel de modulo, `releaseAll` vaciando los mandos, el vigilante de sensor dormido, la sensibilidad en la unidad correcta de cada esquema, y `main.js` sin persistir el esquema deducido). Medido en Chromium headless: la sensibilidad de botones ya llega SIEMPRE al tope (783/317/167 ms para 0,4/1/2), el gas ya no queda muerto tras `releaseAll`, el arrastre ya no da el tiron, y el giroscopio ya da el signo bueno en las dos posturas.

TESIS DEL ALABEO: CORRECTA, y el codigo en disco (controls.js:165-166) ya la implementa bien. Verificado con 300.000 triples aleatorios: `(cos B*sin G, -sin B, -cos B*cos G)` es exactamente `R^T*(0,0,-1)` con `R = Rz(a)Rx(b)Ry(g)`, error maximo 0,00e+0; con el signo negado el error llega a 2,0. `roll = atan2(gx, -gy)` devuelve el alabeo fisico EXACTO a cualquier cabeceo (probado de 30 a 90 grados, error nulo), y el alabeo es invariante frente a la rotacion por CSS porque rotar el contenido gira alrededor del MISMO eje sobre el que se mide, asi que solo anade una constante que borra el cero. De punta a punta con eventos sinteticos: -20 grados de alabeo horario dan steer -0,854 en vertical y -0,841 en horizontal; +20 dan +0,849 y +0,852. No hay nada que cambiar aqui.

MATEMATICA DE mapPointer: CORRECTA. Medido en Chromium con un viewport de 390x844: `getComputedStyle(stage).transform` es `matrix(0, 1, -1, 0, 390, 0)`, o sea local (x,y) -> pantalla (390-y, x); `DOMMatrixReadOnly(...).inverse()` da (0,-1,1,0,0,390), que componente por componente ES `x = clientY, y = W - clientX`, exactamente controls.js:119. El `getBoundingClientRect()` del escenario da {0,0,390,844}: encaje perfecto. El orden contrario (`rotate(90deg) translateX(W)`) da e=0 en vez de e=W, o sea la caja fuera de pantalla. Y `canvas.clientWidth/clientHeight` da 844x390 (caja de maquetacion) frente a 390x844 del rect transformado, asi que el renderer mide bien. No hay nada que cambiar aqui tampoco.

Lo que SIGUE ROTO, todo medido: (1) el respaldo del giroscopio cae a ARRASTRE, que deja al jugador sin nada visible que tocar — es su queja literal; (2) `defaultScheme()` usa `'ontouchstart' in window` mientras la rotacion usa `pointer:coarse`, asi que un portatil tactil gira el juego 90 grados Y elige giroscopio; (3) soltar la flecha derecha con la izquierda pulsada deja el giro en 0,000 (medido) en vez de volver a la izquierda; (4) los cinco mandos siguen visibles y clicables en PAUSA (opacity 1, pointerEvents auto); (5) `#hudtop` y `.screen` no llevan margen de seguridad horizontal, y con el escenario girado el borde IZQUIERDO del juego ES la muesca fisica, justo donde estan la distancia y la puntuacion; (6) la sacudida de camara llega a 18,28 grados de cabeceo tras un choque (medido, pico sobre 200 fotogramas) y la camara se queda mirando al suelo; (7) `enableGyro()` resuelve true con solo el permiso, y quien decide si hay sensor es un `setTimeout(1600)` que solo existe en la pantalla de ajustes; (8) `gyroStatus()` dice 'denied' a quien nunca ha denegado nada, y no hay ni una cadena traducida para los cinco estados, asi que la interfaz solo sabe decir "no hay giroscopio"; (9) el indicador de inclinacion divide por un 22 clavado a mano y con sens 2 el punto se queda a mitad de recorrido; (10) no hay `-webkit-touch-callout` ni guarda global de `contextmenu`, y una pulsacion larga sobre el lienzo (que ES la superficie de arrastre) saca el menu de Android; (11) los comentarios de controls.js:106-108 y template.html:14-17 dicen que el borde superior fisico pasa a ser el DERECHO del juego, y es el IZQUIERDO — el CSS esta bien, el comentario invita a "arreglarlo" al reves; (12) `layoutStage()` reescribe el transform en cada evento de `visualViewport`, sin guarda de igualdad.

Y lo que NO hay que tocar, contra lo que piden las investigaciones: la geometria de los mandos ya no tiene ni un solape (medido par a par en 390x844, 844x390 y 1180x820: cero), el velocimetro ya esta abajo al centro, y las unidades ya son `vmin`.

### summary

Confirmo las dos tesis matematicas y corrijo la premisa de partida de casi todas las investigaciones: el arbol de trabajo ya NO es el que describen. `src/controls.js` y `src/main.js` se reescribieron a las 08:16 y ya traen aplicado lo gordo (el signo de gx, `stageW` cacheado, `held` como conjunto, `drag` a nivel de modulo, `releaseAll` vaciando los mandos, el vigilante de sensor dormido, la sensibilidad en la unidad correcta de cada esquema, y `main.js` sin persistir el esquema deducido). Medido en Chromium headless: la sensibilidad de botones ya llega SIEMPRE al tope (783/317/167 ms para 0,4/1/2), el gas ya no queda muerto tras `releaseAll`, el arrastre ya no da el tiron, y el giroscopio ya da el signo bueno en las dos posturas.

TESIS DEL ALABEO: CORRECTA, y el codigo en disco (controls.js:165-166) ya la implementa bien. Verificado con 300.000 triples aleatorios: `(cos B*sin G, -sin B, -cos B*cos G)` es exactamente `R^T*(0,0,-1)` con `R = Rz(a)Rx(b)Ry(g)`, error maximo 0,00e+0; con el signo negado el error llega a 2,0. `roll = atan2(gx, -gy)` devuelve el alabeo fisico EXACTO a cualquier cabeceo (probado de 30 a 90 grados, error nulo), y el alabeo es invariante frente a la rotacion por CSS porque rotar el contenido gira alrededor del MISMO eje sobre el que se mide, asi que solo anade una constante que borra el cero. De punta a punta con eventos sinteticos: -20 grados de alabeo horario dan steer -0,854 en vertical y -0,841 en horizontal; +20 dan +0,849 y +0,852. No hay nada que cambiar aqui.

MATEMATICA DE mapPointer: CORRECTA. Medido en Chromium con un viewport de 390x844: `getComputedStyle(stage).transform` es `matrix(0, 1, -1, 0, 390, 0)`, o sea local (x,y) -> pantalla (390-y, x); `DOMMatrixReadOnly(...).inverse()` da (0,-1,1,0,0,390), que componente por componente ES `x = clientY, y = W - clientX`, exactamente controls.js:119. El `getBoundingClientRect()` del escenario da {0,0,390,844}: encaje perfecto. El orden contrario (`rotate(90deg) translateX(W)`) da e=0 en vez de e=W, o sea la caja fuera de pantalla. Y `canvas.clientWidth/clientHeight` da 844x390 (caja de maquetacion) frente a 390x844 del rect transformado, asi que el renderer mide bien. No hay nada que cambiar aqui tampoco.

Lo que SIGUE ROTO, todo medido: (1) el respaldo del giroscopio cae a ARRASTRE, que deja al jugador sin nada visible que tocar — es su queja literal; (2) `defaultScheme()` usa `'ontouchstart' in window` mientras la rotacion usa `pointer:coarse`, asi que un portatil tactil gira el juego 90 grados Y elige giroscopio; (3) soltar la flecha derecha con la izquierda pulsada deja el giro en 0,000 (medido) en vez de volver a la izquierda; (4) los cinco mandos siguen visibles y clicables en PAUSA (opacity 1, pointerEvents auto); (5) `#hudtop` y `.screen` no llevan margen de seguridad horizontal, y con el escenario girado el borde IZQUIERDO del juego ES la muesca fisica, justo donde estan la distancia y la puntuacion; (6) la sacudida de camara llega a 18,28 grados de cabeceo tras un choque (medido, pico sobre 200 fotogramas) y la camara se queda mirando al suelo; (7) `enableGyro()` resuelve true con solo el permiso, y quien decide si hay sensor es un `setTimeout(1600)` que solo existe en la pantalla de ajustes; (8) `gyroStatus()` dice 'denied' a quien nunca ha denegado nada, y no hay ni una cadena traducida para los cinco estados, asi que la interfaz solo sabe decir "no hay giroscopio"; (9) el indicador de inclinacion divide por un 22 clavado a mano y con sens 2 el punto se queda a mitad de recorrido; (10) no hay `-webkit-touch-callout` ni guarda global de `contextmenu`, y una pulsacion larga sobre el lienzo (que ES la superficie de arrastre) saca el menu de Android; (11) los comentarios de controls.js:106-108 y template.html:14-17 dicen que el borde superior fisico pasa a ser el DERECHO del juego, y es el IZQUIERDO — el CSS esta bien, el comentario invita a "arreglarlo" al reves; (12) `layoutStage()` reescribe el transform en cada evento de `visualViewport`, sin guarda de igualdad.

Y lo que NO hay que tocar, contra lo que piden las investigaciones: la geometria de los mandos ya no tiene ni un solape (medido par a par en 390x844, 844x390 y 1180x820: cero), el velocimetro ya esta abajo al centro, y las unidades ya son `vmin`.

### steps

- **n**: 1 — **file**: src/i18n.js — **what**: Anadir las cadenas de estado del control en los cuatro idiomas. Va PRIMERO porque t() devuelve la clave cruda cuando falta (i18n.js:185), asi que sin esto el paso 11 escribe literalmente 'sch.stale' en la pantalla del jugador. — **code**: En el bloque es, sustituir la linea:

    'sch.calibrated':'Centro tomado en esta postura',

por:

    'sch.calibrated':'Centro tomado en esta postura',
    'sch.hint.tilt':'Inclina el móvil como si fuera el manillar. Pulsa CENTRAR sujetándolo en tu postura de conducir.',
    'sch.hint.touch':'Arrastra el pulgar por la pantalla para girar. Al soltar, la moto se endereza.',
    'sch.hint.buttons':'Gira con las dos flechas de abajo a la izquierda.',
    'sch.live':'Giroscopio activo',
    'sch.waiting':'Esperando lecturas del sensor…',
    'sch.ask':'Toca INCLINAR otra vez para dar permiso al sensor',
    'sch.denied':'Permiso del sensor denegado',
    'sch.unsupported':'Este aparato no tiene giroscopio',
    'sch.insecure':'Sin https el navegador no entrega el sensor',
    'sch.stale':'El sensor ha dejado de responder',
    'sch.fallback':'se conduce con botones',

En el bloque en, sustituir:

    'sch.calibrated':'Centre taken at this posture',

por:

    'sch.calibrated':'Centre taken at this posture',
    'sch.hint.tilt':'Tilt the phone like the handlebars. Tap CENTRE while holding it in your riding posture.',
    'sch.hint.touch':'Drag your thumb across the screen to steer. Let go and the bike straightens up.',
    'sch.hint.buttons':'Steer with the two arrows at the bottom left.',
    'sch.live':'Gyroscope live',
    'sch.waiting':'Waiting for sensor readings…',
    'sch.ask':'Tap TILT again to allow the sensor',
    'sch.denied':'Sensor permission denied',
    'sch.unsupported':'This device has no gyroscope',
    'sch.insecure':'Without https the browser withholds the sensor',
    'sch.stale':'The sensor stopped responding',
    'sch.fallback':'steering with buttons',

En el bloque pt, sustituir:

    'sch.calibrated':'Centro definido nesta posição',

por:

    'sch.calibrated':'Centro definido nesta posição',
    'sch.hint.tilt':'Incline o celular como se fosse o guidão. Toque em CENTRAR segurando-o na sua posição de pilotagem.',
    'sch.hint.touch':'Arraste o polegar pela tela para virar. Ao soltar, a moto se endireita.',
    'sch.hint.buttons':'Vire com as duas setas embaixo à esquerda.',
    'sch.live':'Giroscópio ativo',
    'sch.waiting':'Aguardando leituras do sensor…',
    'sch.ask':'Toque em INCLINAR novamente para permitir o sensor',
    'sch.denied':'Permissão do sensor negada',
    'sch.unsupported':'Este aparelho não tem giroscópio',
    'sch.insecure':'Sem https o navegador não entrega o sensor',
    'sch.stale':'O sensor parou de responder',
    'sch.fallback':'pilotando com botões',

En el bloque fr, sustituir:

    'sch.calibrated':'Centre pris dans cette position',

por:

    'sch.calibrated':'Centre pris dans cette position',
    'sch.hint.tilt':'Inclinez le téléphone comme un guidon. Appuyez sur CENTRER en le tenant dans votre position de conduite.',
    'sch.hint.touch':'Faites glisser le pouce sur l’écran pour tourner. Au relâchement, la moto se redresse.',
    'sch.hint.buttons':'Tournez avec les deux flèches en bas à gauche.',
    'sch.live':'Gyroscope actif',
    'sch.waiting':'En attente des mesures du capteur…',
    'sch.ask':'Touchez INCLINER à nouveau pour autoriser le capteur',
    'sch.denied':'Autorisation du capteur refusée',
    'sch.unsupported':'Cet appareil n’a pas de gyroscope',
    'sch.insecure':'Sans https le navigateur ne fournit pas le capteur',
    'sch.stale':'Le capteur ne répond plus',
    'sch.fallback':'direction aux boutons', — **why**: El jugador dice "interfaz vertical cuando quiero giroscopio para jugar": pidio inclinacion, el juego se la nego y no le dijo por que. Sin estas cadenas no hay forma de contarselo, y los pasos 4, 6 y 11 dependen de que existan. Se anaden en los cuatro idiomas de golpe porque t() cae a ingles cuando falta una clave, y una mezcla de idiomas en la misma pantalla es peor que un texto ausente.
- **n**: 2 — **file**: src/controls.js — **what**: Dos banderas independientes para las flechas de giro, en lugar de un solo signo. Medido: pulsar izquierda, pulsar derecha y soltar derecha deja el giro en 0,000 con la izquierda todavia pulsada. — **code**: Sustituir la linea 46:

-let btnDir = 0;                 // -1, 0, +1: lo que piden los botones

por:

/* Una bandera por flecha y no un signo compartido. Con un solo signo, soltar DERECHA teniendo
   IZQUIERDA pulsada dejaba el giro en cero: la guarda `if (btnDir > 0)` no era falsa porque la
   izquierda no habia vuelto a escribir nada, y el jugador se quedaba sin girar hasta levantar el
   dedo y volver a pulsar. Medido: steer 0,000 con la izquierda dentro. Con dos banderas el
   estado se DERIVA de lo que hay pulsado ahora mismo, y las dos a la vez dan cero, que es lo
   correcto para dos mandos opuestos. */
let btnL = false, btnR = false;

Sustituir las lineas 290-291 dentro de bindPedals:

-  bindButton(els.left,  () => { btnDir = -1; },        () => { if (btnDir < 0) btnDir = 0; });
-  bindButton(els.right, () => { btnDir = 1; },         () => { if (btnDir > 0) btnDir = 0; });
+  bindButton(els.left,  () => { btnL = true; },        () => { btnL = false; });
+  bindButton(els.right, () => { btnR = true; },        () => { btnR = false; });

En update(), sustituir las lineas 359-361:

-  // el giro por botones va hacia su tope a una velocidad, no de golpe: ver BTN_RATE
-  btnSteer += clamp(btnDir - btnSteer, -BTN_RATE * sens * dt, BTN_RATE * sens * dt);
-  if (!btnDir && Math.abs(btnSteer) < 0.01) btnSteer = 0;
+  /* El destino se deriva de los dedos que hay AHORA en el cristal, no de una variable que los
+     eventos van corrigiendo: asi el mando no puede desincronizarse del cristal. El barrido hacia
+     el tope va a una velocidad y no de golpe, que es lo unico regulable en un mando digital. */
+  const btnDir = (btnR ? 1 : 0) + (btnL ? -1 : 0);
+  btnSteer += clamp(btnDir - btnSteer, -BTN_RATE * sens * dt, BTN_RATE * sens * dt);
+  if (!btnDir && Math.abs(btnSteer) < 0.01) btnSteer = 0;

En releaseAll(), sustituir la linea 410:

-  btnDir = 0;
+  btnL = btnR = false; — **why**: Es el unico defecto de multitactil que el probe sigue cazando, y aparece en el gesto mas normal del esquema de botones: cruzar de una flecha a la otra sin levantar. Derivar el estado de dos banderas en vez de latir un signo hace el fallo estructuralmente imposible, y ademas deja el paso 3 (respaldo a botones) apoyado en un mando que funciona: no tiene sentido enviar al jugador a las flechas si las flechas se atascan.
- **n**: 3 — **file**: src/controls.js — **what**: Un unico test de aparato para todo el modulo, y respaldo a BOTONES en vez de a arrastre. Hoy hay dos tests que tienen que coincidir y no coinciden: coarsePointer() decide si se gira la pantalla y defaultScheme() decide el esquema, con criterios distintos. — **code**: Sustituir las lineas 70-73:

-/** Coarse: aparato de dedo. Una ventana de escritorio estrecha tambien mide mas alto que
-    ancho, y girar el juego 90 grados en un ordenador seria absurdo. */
-const coarsePointer = () => (navigator.maxTouchPoints || 0) > 0 ||
-  (window.matchMedia && matchMedia('(pointer: coarse)').matches);

por:

const mm = q => !!(window.matchMedia && matchMedia(q).matches);

/** Puntero grueso PRIMARIO. Es el unico test que decide GIRAR la pantalla. maxTouchPoints solo
    entra cuando el navegador no tiene consultas de puntero, porque en un portatil con pantalla
    tactil vale 10 y ahi no hay absolutamente nada que girar: con el test viejo el juego se
    presentaba de lado en un ordenador. */
export const isCoarse = () =>
  window.matchMedia ? mm('(pointer: coarse)') : (navigator.maxTouchPoints || 0) > 0;

/** Aparato de mano: puntero grueso y sin raton encima. Es lo que decide el ESQUEMA, y tiene que
    ser mas estricto que isCoarse porque un portatil tactil declara coarse en algun navegador
    pero siempre declara hover, y ahi el giroscopio no existe o no se usa jamas. Se cachea porque
    activeScheme() se llama una vez por fotograma; layoutStage lo invalida. */
let handheld = null;
export const isHandheld = () =>
  handheld === null ? (handheld = isCoarse() && !mm('(hover: hover)')) : handheld;

/** http en claro y fuera de localhost: el navegador retiene los sensores y el evento no llega
    nunca. Se mira el protocolo y no solo isSecureContext porque file:// SI es contexto seguro y
    este juego se distribuye tambien como fichero unico. */
const insecureHttp = () => location.protocol === 'http:' && !window.isSecureContext;

Dentro de layoutStage, sustituir la linea 82:

-  const portrait = vh > vw && coarsePointer();
+  handheld = null;                 // la ventana puede haber cambiado de aparato (escritorio remoto)
+  const portrait = vh > vw && isCoarse();

Sustituir las lineas 310-323 (defaultScheme y activeScheme):

-/** Esquema que toca por defecto: giroscopio si el aparato lo tiene, arrastre si no. */
-export function defaultScheme(){
-  const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
-  return touch && window.DeviceOrientationEvent ? 'tilt' : 'touch';
-}
-
-/** El esquema activo, con respaldo: si se pide giroscopio y no ha llegado NUNCA una lectura,
-    se conduce con arrastre en vez de quedarse sin direccion. Se mira everActive y no active
-    para que un instante con el movil plano no cambie el mando a mitad de carrera. */
-export function activeScheme(){
-  const s = SCHEMES.includes(state.scheme) ? state.scheme : defaultScheme();
-  if (s === 'tilt' && !gyro.everActive) return 'touch';
-  return s;
-}

por:

/** Esquema que toca por defecto en este aparato. NO se guarda: se recalcula en cada arranque. */
export function defaultScheme(){
  /* 'ontouchstart' in window lo cumple cualquier Chrome de escritorio con la emulacion tactil
     puesta, y DeviceOrientationEvent existe en TODOS los Chrome de escritorio sin ningun sensor
     detras, asi que ninguno de los dos vale por si solo. Y tiene que apoyarse en el MISMO test
     que decide girar la pantalla, o el aparato acaba con el juego de lado y con giroscopio a la
     vez por dos motivos que no tienen nada que ver. */
  if (!isHandheld()) return 'touch';
  if (!window.DeviceOrientationEvent || insecureHttp()) return 'buttons';
  return 'tilt';
}

/** Lo que el jugador ha PEDIDO, con el aparato decidiendo solo cuando no ha pedido nada. */
export const wantedScheme = () =>
  SCHEMES.includes(state.scheme) ? state.scheme : defaultScheme();

export function activeScheme(){
  const s = wantedScheme();
  /* El respaldo termina en BOTONES y no en arrastre. Caer al arrastre deja al jugador mirando una
     pantalla sin nada que tocar, que es literalmente lo que ha reportado: pidio giroscopio y se
     encontro otra cosa sin saber cual. Con botones aparecen las dos flechas en el mismo instante
     del fallo, porque paintPedals cuelga de esta misma funcion.
     Se mira everActive y no active para que un instante con el movil plano no cambie el mando a
     mitad de curva: una vez que ha llegado una lectura valida, el aparato tiene sensor y punto. */
  if (s === 'tilt' && !gyro.everActive) return 'buttons';
  return s;
} — **why**: Resuelve dos quejas de una vez. "Interfaz vertical cuando quiero giroscopio": el respaldo silencioso al arrastre es exactamente eso, y mandarlo a botones lo hace visible sin ningun cartel. "Que este girado 90 grados... sino que ya este rotado": la rotacion se queda, pero solo en aparatos que de verdad se sujetan con la mano, porque hoy un portatil tactil cumple el test por la rama de maxTouchPoints. Un solo test exportado hace imposible que las dos decisiones vuelvan a divergir.
- **n**: 4 — **file**: src/controls.js — **what**: enableGyro() resuelve solo cuando ha llegado una lectura de VERDAD, gyroStatus() distingue 'aun no pedido' de 'denegado', y se exporta el angulo de tope efectivo con su recorte. — **code**: Sustituir las lineas 30-37:

-const gyro = { available:false, granted:false, zero:null, raw:0, active:false,
-               everActive:false, flat:0, samples:[], last:0 };
+const gyro = { available:false, granted:false, perm:'unknown', zero:null, raw:0, active:false,
+               everActive:false, flat:0, samples:[], last:0 };
 /* Sin lecturas durante este tiempo se da el sensor por dormido. Medio segundo es de sobra:
    un giroscopio real emite a 60 Hz. */
 const GYRO_STALE_MS = 500;
+/* Espera a la PRIMERA lectura tras conceder el permiso. Un sensor que va a entregar datos
+   entrega el primer evento muy por debajo de 300 ms, asi que 1500 deja cinco veces de margen sin
+   dejar al jugador esperando, y es lo que pide design/spec.md para el respaldo automatico. */
+const GYRO_WAIT_MS = 1500;
+/* Recorte del angulo de tope. Por encima de 34 grados la pantalla deja de mirar al jugador y hay
+   que mover los antebrazos en vez de las munecas; por debajo de 10 la zona muerta de 1,6 grados
+   se come una quinta parte del recorrido y el temblor de mano pasa a valer un 6% de la direccion.
+   Sin recorte, la sensibilidad minima de 0,4 pedia 55 grados, que es inalcanzable. */
+const TILT_FULL_MIN = 10, TILT_FULL_MAX = 34;
 const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : 0);

Anadir junto a los otros exportadores del giroscopio, tras la linea 126 (gyroLive):

/** Angulo de inclinacion que vale tope de giro con la sensibilidad actual. Lo necesita la
    interfaz: el indicador de los ajustes tiene que llegar al extremo de la barra exactamente
    cuando el manillar llega al tope, y no a mitad de recorrido. */
export const tiltFullDeg = () =>
  clamp(TILT_FULL / (state.sens || 1), TILT_FULL_MIN, TILT_FULL_MAX);

/* Sondeo de una condicion con plazo. No se usa un unico setTimeout porque hace falta cortar en
   cuanto llega la primera lectura, no esperar el plazo completo. */
const waitFor = (test, ms) => new Promise(res => {
  const t0 = nowMs();
  const tick = () => test() ? res(true) : (nowMs() - t0 > ms ? res(false) : setTimeout(tick, 60));
  tick();
});

Sustituir enableGyro completo (lineas 128-143):

-/** Debe llamarse DENTRO de un gesto del usuario: iOS rechaza el permiso fuera de uno. */
-export async function enableGyro(){
-  const DOE = window.DeviceOrientationEvent;
-  if (!DOE) return false;
-  if (typeof DOE.requestPermission === 'function'){
-    try {
-      if (await DOE.requestPermission() !== 'granted') return false;
-    } catch (e) { return false; }
-  }
-  if (!gyro.granted){
-    gyro.granted = true;
-    addEventListener('deviceorientation', onOrient, { passive:true });
-  }
-  gyro.zero = null;
-  return true;
-}

por:

/** Debe llamarse DENTRO de un gesto del usuario y como PRIMERA instruccion del manejador: iOS
    rechaza el permiso fuera de uno, y cualquier await por delante consume la activacion. */
export async function enableGyro(){
  const DOE = window.DeviceOrientationEvent;
  if (!DOE){ gyro.perm = 'unsupported'; return false; }
  if (typeof DOE.requestPermission === 'function'){
    let res = 'denied';
    /* Los dos fracasos no son el mismo. Fuera de un gesto la promesa se RECHAZA, y eso se puede
       reintentar en el toque siguiente; que el jugador deniegue la RESUELVE con 'denied', y en
       esa carga ya no hay nada que hacer. Meterlos en el mismo saco dejaba el juego sin
       giroscopio para siempre por un fallo recuperable. */
    try { res = await DOE.requestPermission(); }
    catch (e) { gyro.perm = 'ask'; return false; }
    if (res !== 'granted'){ gyro.perm = 'denied'; return false; }
  }
  gyro.perm = 'granted';
  if (!gyro.granted){
    gyro.granted = true;
    addEventListener('deviceorientation', onOrient, { passive:true });
  }
  calibrateGyro();
  /* Conceder el permiso NO es tener sensor: en un iframe sin allow="gyroscope", en http sin
     cifrar o en un aparato sin giroscopio el evento no llega jamas y no hay API para
     preguntarlo. Se espera una lectura de verdad para que el respaldo a botones se decida UNA
     vez, con un motivo concreto que contar, en vez de degradar en silencio pasado un rato. */
  if (!gyro.everActive) await waitFor(() => gyro.everActive, GYRO_WAIT_MS);
  return gyro.everActive;
}

Sustituir gyroStatus (lineas 325-333):

-export function gyroStatus(){
-  if (!window.DeviceOrientationEvent) return 'unsupported';
-  if (!gyro.granted) return 'denied';
-  if (!gyro.everActive) return 'waiting';
-  if (!gyro.active) return 'stale';
-  return 'live';
-}

por:

export function gyroStatus(){
  if (!window.DeviceOrientationEvent) return 'unsupported';
  if (insecureHttp()) return 'insecure';
  if (gyro.perm === 'denied') return 'denied';
  /* 'ask' no es 'denied'. Antes se devolvia 'denied' a quien todavia no habia visto el dialogo, y
     la interfaz le decia que habia denegado un permiso que nunca le habian pedido; el estado
     'ask' es el que se puede reintentar volviendo a tocar el segmento. */
  if (!gyro.granted) return 'ask';
  if (!gyro.everActive) return 'waiting';
  if (!gyro.active) return 'stale';
  return 'live';
}

En update(), sustituir la linea 369:

-    const full = Math.max(8, TILT_FULL / sens);
+    const full = tiltFullDeg(); — **why**: Cierra el lazo de la queja "pedi giroscopio y tengo otra cosa": ahora hay un instante determinista en el que se sabe si hay sensor, y un estado con nombre para contarlo. Sin la espera, la decision de degradar se tomaba en un setTimeout de la pantalla de ajustes que main.js ni siquiera ejecuta, asi que en el arranque normal nadie se enteraba nunca. Y tiltFullDeg centraliza el angulo de tope para que el indicador del paso 10 y la fisica no puedan discrepar.
- **n**: 5 — **file**: src/controls.js — **what**: Guarda de igualdad en layoutStage, caja del escenario cacheada (fuera reflows por evento de puntero), guarda global de menu contextual y gestos, y correccion del comentario que miente sobre las muescas. — **code**: Anadir junto a stageW, tras la linea 55:

 let stageW = 0;
+/* Caja del escenario en px, cacheada al colocarlo. Antes se leia stage.clientWidth DENTRO de
+   pointermove: un reflow sincrono por cada evento de puntero, y hasta 120 por segundo. */
+let stageBoxW = 0, stageBoxH = 0;
+let lastVW = 0, lastVH = 0;

Dentro de layoutStage, justo despues de calcular portrait y ANTES del `if (portrait !== rotated ...)`:

   const portrait = vh > vw && isCoarse();
+  /* Si nada ha cambiado no se toca el DOM. visualViewport dispara resize al aparecer y desaparecer
+     las barras del navegador y al hacer pinza, y reescribir width/height/transform en cada uno de
+     esos eventos monta un bucle de reflows sobre una capa compuesta a pantalla completa. */
+  if (vw === lastVW && vh === lastVH && portrait === rotated && stageBoxW)
+    return { w:stageBoxW, h:stageBoxH };
+  lastVW = vw; lastVH = vh;

Sustituir la linea 110 (el return final de layoutStage):

-  return { w: stage.clientWidth, h: stage.clientHeight };
+  /* Se devuelven los numeros que se acaban de escribir, no una medida nueva del DOM: el renderer
+     tiene que dimensionarse con el MISMO valor con el que se coloco el escenario. */
+  stageBoxW = portrait ? vh : vw;
+  stageBoxH = portrait ? vw : vh;
+  return { w:stageBoxW, h:stageBoxH };

Sustituir el comentario de las lineas 106-108:

-  /* Las muescas de pantalla cambian de lado al girar: lo que fisicamente es el borde
-     superior pasa a ser el borde DERECHO del juego. Sin remapear, el HUD se aparta del
-     lado equivocado y queda pegado a la muesca. */
+  /* Las muescas cambian de lado al girar. Con la matriz medida (0,1,-1,0,W,0) el local (x,y) cae
+     en pantalla en (W - y, x): local +x va hacia ABAJO en la pantalla y local +y hacia la
+     IZQUIERDA. Luego el borde superior fisico es el borde IZQUIERDO del juego y el derecho fisico
+     es el borde de ARRIBA del juego; los cuatro nombres rotan un paso, y eso es lo que hace
+     html.rot en el CSS. Ojo: el comentario anterior decia DERECHO y era al reves, con el riesgo
+     de que alguien "arreglase" un CSS que esta bien. */

Dentro de install(), sustituir la linea 234:

-    const k = DRAG_GAIN * (state.sens || 1) / Math.max(240, stage ? stage.clientWidth : innerWidth);
+    const k = DRAG_GAIN * (state.sens || 1) / Math.max(240, stageBoxW || innerWidth);

Y anadir en install(), justo despues de `addEventListener('blur', releaseAll);`:

  /* El menu contextual y el zoom por doble toque hay que cortarlos en TODO el documento, no solo
     sobre los mandos: el esquema de arrastre escucha en el LIENZO, y una pulsacion larga ahi saca
     el menu de Android en mitad de una curva. gesturestart es el pellizco de Safari, que
     touch-action no cubre en iOS antiguos, y el user-scalable=no del meta lo ignora Safari desde
     iOS 10, asi que no cuenta como proteccion. */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault()); — **why**: Tres cosas que no cambian el comportamiento visible pero quitan tres landmines: el bucle de reflows que dispara visualViewport en cuanto el jugador roza la barra de direcciones, el reflow sincrono por evento de puntero (que en un arrastre a 120 Hz es medible), y el menu contextual saliendo sobre la superficie de direccion. El comentario corregido es igual de importante: es el que haria que el siguiente que toque el HUD invierta un remapeo de muescas que esta bien, y lo he verificado por matriz.
- **n**: 6 — **file**: src/main.js — **what**: Actuar sobre el resultado de enableGyro (avisar y repintar), usar wantedScheme, pasar la medida del escenario al renderer y soltar los mandos al ocultar la pagina. — **code**: Sustituir el bloque de onBootDone (lineas 59-67):

-    onBootDone: () => {
-      /* Este es el primer gesto real del jugador, y el unico sitio desde el que iOS acepta
-         conceder el giroscopio. Si lo deniega, activeScheme() cae a arrastre por su cuenta. */
-      if (controls.activeScheme() === 'tilt' || controls.defaultScheme() === 'tilt')
-        controls.enableGyro().catch(() => {});
-      if (!state.lang) ui.show('lang');
-      else if (!state.quality) ui.show('quality');
-      else toMenu();
-    },

por:

    onBootDone: () => {
      /* Primer gesto real del jugador, y el unico sitio desde el que iOS acepta conceder el
         giroscopio. Se lanza SIN await por delante: cualquier espera previa consume la activacion
         del usuario y Safari niega el permiso.
         enableGyro ya espera una lectura de verdad, asi que cuando resuelve false hay un motivo
         concreto que contar y el respaldo a botones ya esta puesto: se avisa y se repintan los
         mandos para que las dos flechas aparezcan solas. */
      if (controls.wantedScheme() === 'tilt')
        controls.enableGyro().then(ok => {
          if (!ok) ui.toast(t('sch.' + controls.gyroStatus()));
          ui.paintPedals();
        }).catch(() => {});
      if (!state.lang) ui.show('lang');
      else if (!state.quality) ui.show('quality');
      else toMenu();
    },

Sustituir la linea 138:

-  const relayout = () => { controls.layoutStage(); world.resize(); };
+  /* El renderer se dimensiona con los MISMOS numeros con los que se acaba de colocar el
+     escenario, no con una medida propia: dos lecturas independientes del mismo valor se separan
+     en cuanto el navegador esta a medio actualizar las metricas, y el resultado es un fotograma
+     con la relacion de aspecto cambiada, o sea la moto descentrada y el horizonte torcido. */
+  const relayout = () => { const s = controls.layoutStage(); world.resize(s.w, s.h); };

Sustituir la linea 153:

-  addEventListener('pagehide', save);
+  /* pagehide llega tambien al congelar la pestana, y ahi el dedo puede quedarse puesto sobre el
+     gas: se suelta todo antes de guardar para no volver acelerando. */
+  addEventListener('pagehide', () => { controls.releaseAll(); save(); }); — **why**: Sin reaccionar al resultado, el respaldo del paso 3 y el estado del paso 4 no llegan nunca al jugador en el arranque normal: solo se evaluaban dentro de la pantalla de ajustes. Pasar la medida a world.resize elimina el `clientWidth || innerWidth` como fuente de verdad, que es el camino por el que el renderer puede arrancar con la relacion de aspecto invertida y dejar "la moto mal ubicada" en el primer fotograma.
- **n**: 7 — **file**: src/world.js — **what**: Bajar la amplitud de la sacudida de camara y aceptar medidas explicitas en resize(), con cache y sin getBoundingClientRect. — **code**: Sustituir la linea 538:

-    const amp = (SHAKE_DEG * (0.25 + 0.75 * speedFrac) + this.shake * 12) * DEG;
+    /* 2,5 grados por unidad de sacudida. Con el factor 12 y el addShake(1.5) del choque el pico
+       medido sobre 200 fotogramas era de 18,28 grados de cabeceo, 10,67 de guinada y 17,58 de
+       balanceo: la camara se quedaba mirando al asfalto justo cuando el jugador necesita ver que
+       ha pasado. Con 2,5 el pico baja a unos 4 grados, que se lee como un golpe seco. */
+    const amp = (SHAKE_DEG * (0.25 + 0.75 * speedFrac) + this.shake * 2.5) * DEG;

Sustituir resize() completo (lineas 577-584):

-  resize(){
-    const w = this.canvas.clientWidth || window.innerWidth;
-    const h = this.canvas.clientHeight || window.innerHeight;
-    this.renderer.setSize(w, h, false);
-    this.camera.aspect = w / h;
-    this.camera.updateProjectionMatrix();
-    this._applyFov();
-  }

por:

  resize(w, h){
    /* Las medidas llegan de layoutStage. clientWidth/clientHeight queda solo de respaldo, y
       getBoundingClientRect esta PROHIBIDO aqui: de un elemento dentro del escenario girado
       devuelve la caja YA transformada, con ancho y alto intercambiados (medido: 390x844 en vez
       de 844x390), y camera.aspect saldria del reves. Se redondea porque un buffer a medio pixel
       deja una costura, y se cachea porque cada setSize reasigna el buffer de dibujo y
       visualViewport dispara resize muchas veces por gesto. */
    w = Math.max(1, Math.round(w || this.canvas.clientWidth || window.innerWidth));
    h = Math.max(1, Math.round(h || this.canvas.clientHeight || window.innerHeight));
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);   // false: el CSS ya tiene el lienzo al 100% del escenario
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._applyFov();
  }

En setQuality, sustituir la linea 329:

-    this.resize();
+    /* Se invalida la cache antes de re-medir: setPixelRatio cambia el tamano del buffer aunque el
+       tamano en CSS sea el mismo, y con la guarda de igualdad el setSize no se ejecutaria. */
+    this._w = 0;
+    this.resize(); — **why**: 18,28 grados de cabeceo tras un choque es una camara que apunta al suelo, y es lo que hace que el juego se sienta "mal ubicado" precisamente en el momento en que el jugador esta mirando. Y resize con medida explicita cierra el camino por el que el renderer puede quedarse con la relacion de aspecto del viewport (390x844) en vez de la del escenario (844x390), que es la version grave y silenciosa del mismo sintoma.
- **n**: 8 — **file**: template.html — **what**: Margen de seguridad en los cuatro lados del HUD y de las pantallas, mandos ocultos cuando no se conduce, guardas tactiles que faltan, y correccion del comentario del remapeo de muescas. — **code**: Sustituir el comentario de las lineas 14-17 (el bloque html.rot de las lineas 18-21 NO se toca, esta bien):

-  /* Con el escenario girado 90 grados, el borde fisico de arriba pasa a ser el borde
-     DERECHO del juego. Sin remapear las muescas el HUD se aparta del lado equivocado y
-     acaba justo debajo de la camara frontal. Local +x va a la pantalla hacia abajo y
-     local +y hacia la izquierda, de donde sale este cambio de nombres. */
+  /* Con el escenario girado 90 grados, la matriz medida es (0,1,-1,0,W,0): el local (x,y) cae en
+     pantalla en (W - y, x), o sea que local +x va hacia ABAJO en la pantalla y local +y hacia la
+     IZQUIERDA. De ahi: el borde superior fisico es el borde IZQUIERDO del juego, y el derecho
+     fisico es el borde de ARRIBA del juego. Los cuatro nombres rotan un paso. Con el movil en
+     vertical la muesca esta arriba, asi que aparece por la IZQUIERDA del juego, que es justo
+     donde el HUD pone la distancia y la puntuacion. */

Sustituir la linea 25 (dentro de html,body), anadiendo touch-callout:

-    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;
+    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;
+    /* En iOS el globo de "copiar" al mantener pulsado NO lo quita user-select: hace falta esto. */
+    -webkit-touch-callout:none;

Sustituir .screen (lineas 34-37):

-  .screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
-    justify-content:center;gap:16px;padding:calc(16px + var(--sa-t)) 16px
-    calc(16px + var(--sa-b));opacity:0;visibility:hidden;pointer-events:none;
-    transition:opacity .26s ease,visibility .26s;overflow:hidden}
+  /* Los cuatro lados, no solo arriba y abajo: con el escenario girado el borde IZQUIERDO del
+     juego es la muesca fisica, y los paneles se metian debajo de ella. */
+  .screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
+    justify-content:center;gap:16px;
+    padding:calc(16px + var(--sa-t)) calc(16px + var(--sa-r))
+            calc(16px + var(--sa-b)) calc(16px + var(--sa-l));
+    opacity:0;visibility:hidden;pointer-events:none;
+    transition:opacity .26s ease,visibility .26s;overflow:hidden}

Sustituir #hudtop (lineas 134-135):

-  #hudtop{position:absolute;top:calc(9px + var(--sa-t));left:0;right:0;
-    display:flex;align-items:flex-start;justify-content:space-between;padding:0 12px;gap:8px}
+  /* El padding lateral lleva margen de seguridad porque con el juego girado la muesca cae en el
+     borde IZQUIERDO del juego, exactamente encima de la distancia; y a la derecha esta el boton
+     de pausa, que la especificacion quiere a 12 px de la zona segura como minimo. */
+  #hudtop{position:absolute;top:calc(9px + var(--sa-t));left:0;right:0;
+    display:flex;align-items:flex-start;justify-content:space-between;
+    padding:0 calc(12px + var(--sa-r)) 0 calc(12px + var(--sa-l));gap:8px}

Sustituir el bloque .pad (lineas 184-188):

-  .pad{position:absolute;pointer-events:auto;display:grid;place-items:center;
-    border-radius:50%;border:1px solid rgba(255,255,255,.22);color:var(--text);
-    background:rgba(9,13,20,.5);font-size:10px;font-weight:900;letter-spacing:.12em;text-align:center;line-height:1.15;
-    transition:transform .07s,background .12s;touch-action:none;-webkit-user-select:none;
-    user-select:none;box-shadow:0 6px 18px rgba(0,0,0,.4)}
+  .pad{position:absolute;pointer-events:auto;display:grid;place-items:center;
+    border-radius:50%;border:1px solid rgba(255,255,255,.22);color:var(--text);
+    background:rgba(9,13,20,.5);font-size:10px;font-weight:900;letter-spacing:.12em;text-align:center;line-height:1.15;
+    transition:transform .07s,background .12s,opacity .18s;touch-action:none;
+    -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none;
+    box-shadow:0 6px 18px rgba(0,0,0,.4)}

Sustituir la linea 209:

-  #pedals:not(.btns) .steer{display:none}
+  #pedals:not(.btns) .steer{display:none}
+  /* Y ningun mando si no se esta conduciendo. En pausa el HUD sigue encendido, asi que los cinco
+     brillaban bajo el velo desenfocado invitando a pulsar algo que no responde, y encima la capa
+     de pausa se comia los toques. Medido antes: opacity 1 y pointer-events auto en pausa. */
+  #pedals:not(.ride) .pad{opacity:0;pointer-events:none}

Anadir tras el bloque #tiltbar.dead (linea 219):

+  /* Estados del indicador: apagado cuando no hay sensor, ambar cuando lo hubo y ha callado. Sin
+     esta distincion el jugador no sabe si el permiso llego a concederse. */
+  #tiltbar.stale>i{background:#ffb060}
+  /* Filas de ajustes que solo tienen sentido con un esquema concreto. */
+  .row.off{display:none}
+  .row.hint{display:block;padding:0 2px 10px;border-bottom:0}
+  #scheme-hint{font-size:10.5px;font-weight:600;color:var(--dim);line-height:1.45}
+  #scheme-hint.bad{color:#ffb060}
+  #set-sensval{font-size:10.5px;font-weight:800;color:var(--dim);
+    font-variant-numeric:tabular-nums;min-width:38px;text-align:right}
+  .ctlwrap{display:flex;align-items:center;gap:9px} — **why**: El HUD se apartaba de la muesca por el lado equivocado, y con el escenario girado eso significa que la distancia y la puntuacion caen justo debajo de la camara frontal: parte de "lo mal ubicada" es esto. Los mandos visibles en pausa son la otra mitad: cinco botones encendidos que no responden se leen como un juego roto. Y las guardas tactiles son las que impiden que una pulsacion larga sobre la superficie de direccion abra el menu del sistema.
- **n**: 9 — **file**: template.html — **what**: Reordenar los ajustes para que el grupo de control vaya primero y se explique, con linea de estado, filas condicionales y numero de sensibilidad; y CENTRAR tambien en la pausa. — **code**: Sustituir el bloque de filas de ajustes (lineas 278-297) por:

      <div class="scroll">
        <!-- El grupo de control va PRIMERO: es la queja del jugador, y el idioma y la calidad ya
             se eligen en el primer arranque, asi que no compiten por el sitio de arriba. -->
        <div class="row"><span class="lb" data-i18n="set.scheme"></span><div class="seg" id="set-scheme"></div></div>
        <!-- La pieza que faltaba: sin ella el selector puede decir INCLINAR mientras se conduce
             con botones y el jugador no tiene ninguna forma de enterarse. -->
        <div class="row hint"><span id="scheme-hint"></span></div>
        <div class="row off" id="row-tilt">
          <span class="lb" data-i18n="set.tilt"></span>
          <div class="ctlwrap">
            <div id="tiltbar" class="dead"><u></u><i></i></div>
            <button class="btn ghost small" id="b-calib" data-i18n="set.calibrate"></button>
          </div>
        </div>
        <div class="row" id="row-sens"><span class="lb" data-i18n="set.sens"></span>
          <div class="ctlwrap">
            <!-- 40-200 = 0,4-2,0, el rango de design/spec.md. El minimo de 50 no llegaba abajo. -->
            <input type="range" id="set-sens" min="40" max="200"><span id="set-sensval"></span>
          </div></div>
        <div class="row" id="row-invert"><span class="lb" data-i18n="set.invert"></span><div class="seg" id="set-invert"></div></div>
        <div class="row"><span class="lb" data-i18n="set.lang"></span><div class="seg" id="set-lang"></div></div>
        <div class="row"><span class="lb" data-i18n="set.quality"></span><div class="seg" id="set-quality"></div></div>
        <div class="row"><span class="lb" data-i18n="set.music"></span><input type="range" id="set-music" min="0" max="100"></div>
        <div class="row"><span class="lb" data-i18n="set.sfx"></span><input type="range" id="set-sfx" min="0" max="100"></div>
        <div class="row"><span class="lb" data-i18n="set.haptics"></span><div class="seg" id="set-haptics"></div></div>
        <div class="row" style="justify-content:center">
          <button class="btn ghost small danger" id="b-wipe" data-i18n="set.reset"></button>
        </div>
      </div>

En la pantalla de pausa, sustituir las lineas 331-335:

     <div class="btnstack">
       <button class="btn" id="b-resume" data-i18n="pause.resume"></button>
+      <!-- El centro torcido se descubre conduciendo, no en el menu de ajustes. Solo aparece si de
+           verdad se esta conduciendo con giroscopio. -->
+      <button class="btn ghost off" id="b-calib2" data-i18n="set.calibrate"></button>
       <button class="btn ghost" id="b-restart" data-i18n="pause.restart"></button>
       <button class="btn ghost" id="b-tomenu" data-i18n="pause.menu"></button>
     </div> — **why**: "Interfaz vertical cuando quiero giroscopio" es, en la practica, que el selector de control estaba enterrado entre dos deslizadores de audio y que la fila del giroscopio se veia con cualquier esquema sin hacer nada. Con el grupo arriba, una frase que dice el estado real y las filas que solo salen cuando sirven, el jugador puede ver y arreglar su propio problema. CENTRAR en la pausa es el remate: el momento en que uno nota el centro desviado es a 200 km/h.
- **n**: 10 — **file**: src/ui.js — **what**: Clase ride en los mandos, repintado al cambiar de pantalla, indicador escalado por el angulo de tope real y estados del indicador. — **code**: Sustituir show() (lineas 42-49):

   show(name){
     this.screen = name;
     for (const s of SCREENS) this.el[s].classList.toggle('on', s === name);
     this.hudEl.classList.toggle('on', name === 'game' || name === 'pause');
+    /* Los mandos se repintan aqui y no solo al cambiar de esquema: la clase 'ride' depende de la
+       pantalla, y en pausa el HUD sigue encendido. */
+    this.paintPedals();
     if (name === 'menu') this.refreshMenu();
     if (name === 'garage') this.refreshGarage();
     if (name === 'settings') this.refreshSettings();
   }

Sustituir paintPedals (lineas 295-299):

-  /** Los pedales de giro solo tienen sentido con el esquema de botones. */
-  paintPedals(){
-    const p = $('pedals');
-    if (p) p.classList.toggle('btns', controls.activeScheme() === 'buttons');
-  }

por:

  /** Que mandos se ensenan. Las flechas de giro solo con el esquema de botones, que con giroscopio
      o arrastre nada mas taparian carretera; y los cinco solo mientras se conduce, porque en pausa
      el HUD sigue encendido y brillaban invitando a pulsar algo que no responde.
      Cuelga de activeScheme y no de state.scheme a proposito: asi el respaldo del giroscopio hace
      aparecer las dos flechas por si solo, en el mismo instante del fallo. */
  paintPedals(){
    const p = $('pedals');
    if (!p) return;
    p.classList.toggle('btns', controls.activeScheme() === 'buttons');
    p.classList.toggle('ride', this.screen === 'game');
  }

Sustituir tilt() (lineas 301-309):

-  tilt(deg, live){
-    const bar = $('tiltbar');
-    if (!bar || this.screen !== 'settings') return;
-    bar.classList.toggle('dead', !live);
-    const k = Math.max(-1, Math.min(1, deg / 22));
-    bar.firstElementChild.nextElementSibling.style.transform = 'translateX(' + (k * 52) + 'px)';
-  }

por:

  /** Punto vivo del angulo de inclinacion: es la unica forma de que el jugador vea que el
      giroscopio responde de verdad y hacia donde. */
  tilt(deg, live){
    if (this.screen !== 'settings') return;
    const bar = $('tiltbar');
    if (!bar) return;
    /* Se escala con el angulo de tope EFECTIVO y no con un 22 clavado a mano: la sensibilidad
       divide ese angulo, asi que con sens 2 el manillar llegaba al tope a 11 grados mientras el
       punto se quedaba a mitad de la barra, y parecia que el sensor no llegaba. */
    const k = Math.max(-1, Math.min(1, deg / controls.tiltFullDeg()));
    const st = controls.gyroStatus();
    bar.classList.toggle('dead', !live && st !== 'stale');
    bar.classList.toggle('stale', st === 'stale');
    /* querySelector y no firstElementChild.nextElementSibling: eso dependia del orden <u><i> del
       HTML y se rompe en silencio si alguien reordena dos etiquetas. */
    bar.querySelector('i').style.transform = 'translateX(' + (k * 52).toFixed(1) + 'px)';
    if (st !== this.lastGyroStatus){ this.lastGyroStatus = st; this.paintControlRows(); }
  } — **why**: El indicador es la unica prueba visible de que el signo del giroscopio es el bueno y de que el permiso se concedio; con el 22 clavado mentia en cuanto se tocaba la sensibilidad. Y la clase ride es la que apaga los cinco mandos en pausa, que es la mitad visible de "los botones de avanzar y frenar visibles": no molestan mientras se conduce, molestan cuando no se conduce.
- **n**: 11 — **file**: src/ui.js — **what**: Linea de estado del control, filas condicionales, numero de sensibilidad y selector de esquema que dice POR QUE no hay giroscopio en vez de degradar en silencio. — **code**: Sustituir el bloque del selector de esquema y el boton de centrar (lineas 246-269):

-    this.rp.scheme = this.seg($('set-scheme'),
-      controls.SCHEMES.map(s => ({ label:t('sch.' + s), value:s })),
-      () => state.scheme || controls.defaultScheme(),
-      v => {
-        state.scheme = v;
-        if (v === 'tilt') controls.enableGyro().then(ok => {
-          if (!ok) return this.toast(t('sch.nogyro'));
-          setTimeout(() => {
-            if (controls.gyroStatus() !== 'live') this.toast(t('sch.nogyro'));
-          }, 1600);
-        });
-        this.paintPedals();
-      });
-    $('b-calib').addEventListener('click', () => {
-      controls.calibrateGyro();
-      this.toast(t('sch.calibrated'));
-    });

por:

    /* Elegir giroscopio pide el permiso AQUI, dentro del gesto del toque: iOS rechaza
       requestPermission fuera de uno. Volver a tocar el mismo segmento reintenta, que es la unica
       salida para quien lo denego sin querer. */
    this.rp.scheme = this.seg($('set-scheme'),
      controls.SCHEMES.map(s => ({ label:t('sch.' + s), value:s })),
      () => controls.wantedScheme(),
      v => {
        state.scheme = v;
        this.paintPedals();
        this.paintControlRows();
        if (v !== 'tilt') return;
        /* enableGyro ya espera una lectura de verdad, asi que aqui no hace falta ningun
           setTimeout a ciegas: cuando resuelve, el estado ya es definitivo y tiene nombre. */
        controls.enableGyro().then(ok => {
          this.paintPedals();
          this.paintControlRows();
          if (!ok) this.toast(t('sch.' + controls.gyroStatus()));
        });
      });
    const calib = () => { controls.calibrateGyro(); this.toast(t('sch.calibrated')); };
    $('b-calib').addEventListener('click', calib);
    if ($('b-calib2')) $('b-calib2').addEventListener('click', calib);

Sustituir el deslizador de sensibilidad (linea 285):

-    slider($('set-sens'), () => Math.round(state.sens * 100), v => { state.sens = v / 100; });
+    /* Con el numero delante: un deslizador sin cifra no se puede repetir ni comparar entre
+       partidas, y la sensibilidad es lo primero que se toca cuando el mando no va como uno quiere. */
+    slider($('set-sens'), () => Math.round((state.sens || 1) * 100),
+      v => { state.sens = v / 100; this.paintSens(); });

Anadir estos dos metodos junto a paintPedals:

  paintSens(){
    const el = $('set-sensval');
    if (el) el.textContent = 'x' + (state.sens || 1).toFixed(2).replace('.', ',');
  }

  /** Solo se ensenan las filas que hacen algo con el esquema elegido, y se dice CON PALABRAS por
      que el giroscopio no responde en vez de degradar en silencio, que es literalmente la queja
      de pedir inclinacion y encontrarse otra cosa. */
  paintControlRows(){
    const want = controls.wantedScheme();
    const act = controls.activeScheme();
    const st = controls.gyroStatus();
    const row = (id, on) => { const el = $(id); if (el) el.classList.toggle('off', !on); };
    row('row-tilt', want === 'tilt');
    /* Invertir un boton etiquetado con una flecha no es un ajuste, es un fallo: la fila se esconde
       con el esquema de botones. */
    row('row-invert', want === 'tilt' || want === 'touch');
    const c2 = $('b-calib2');
    if (c2) c2.classList.toggle('off', act !== 'tilt');
    const hint = $('scheme-hint');
    if (hint){
      const bad = want === 'tilt' && act !== 'tilt';
      hint.textContent = (want === 'tilt' && st !== 'live')
        ? t('sch.' + st) + (bad ? ' — ' + t('sch.fallback') : '')
        : t('sch.hint.' + want);
      hint.classList.toggle('bad', bad);
    }
    this.paintSens();
  }

En refreshSettings, anadir tras `this.paintPedals();` (linea 314) y sustituir la linea 325:

     for (const k in this.rp) this.rp[k]();
     this.paintPedals();
+    this.paintControlRows();
...
-    $('set-sens').value = Math.round(state.sens * 100);
+    $('set-sens').value = Math.round((state.sens || 1) * 100);
+    this.paintSens(); — **why**: Cierra la queja del giroscopio por el lado del jugador: ya no hay ningun camino por el que el juego cambie de mando sin decirlo. La frase de estado traduce los seis estados de gyroStatus, distingue "aun no te lo he pedido" de "lo denegaste", y cuando degrada dice a que degrada. Y quitar el setTimeout(1600) elimina la unica deteccion de sensor que existia, que ademas solo corria si el jugador entraba en ajustes.
- **n**: 12 — **file**: package.json — **what**: Declarar playwright como dependencia de desarrollo y un guion para la prueba de mandos. Hoy playwright se resuelve como enlace global (npm ls lo marca extraneous), asi que funciona por casualidad en esta maquina y en ninguna otra. — **code**: Sustituir las dos ultimas lineas:

-  "devDependencies": { "esbuild": "^0.25.0" }
-}
+  "devDependencies": { "esbuild": "^0.25.0", "playwright": "^1.56.0" }
+}

Y anadir en "scripts", tras la linea de "dev":

    "test:controls": "node build.mjs && node tools/controls.test.mjs", — **why**: El plan de pruebas entero es un guion de Playwright. Sin la dependencia declarada, la prueba pasa aqui y falla en la siguiente maquina por el motor de pruebas y no por el juego, que es la peor forma de perder una tarde.
- **n**: 13 — **file**: tools/controls.test.mjs — **what**: Prueba de regresion completa de mandos y presentacion, sin telefono: viewport vertical, eventos de orientacion sinteticos y medidas sobre el DOM y el renderer. Falla contra el codigo de hoy y pasa con los pasos 1-11 aplicados. — **code**: /* Regresion de mandos y presentacion. Sin telefono: viewport vertical, eventos de orientacion
   sinteticos por el MISMO camino que un movil real (window 'deviceorientation' -> onOrient) y
   medidas sobre el DOM y el renderer.

   Se sirve por http y no por file:// porque index.html carga los GLB por fetch. Y hace falta
   swiftshader: sin WebGL three.js no arranca y el gancho window.__rr no aparece nunca.

     node build.mjs && node tools/controls.test.mjs                                        */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 8151;
const D = Math.PI / 180;

let fails = 0;
const ok = (cond, name, extra) => {
  if (cond) console.log('  ok   ' + name);
  else { fails++; console.log('FALLO  ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const srv = http.createServer((q, s) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => {
    if (e){ s.writeHead(404); s.end(); return; }
    const ext = path.extname(f);
    s.writeHead(200, { 'content-type': ext === '.html' ? 'text/html'
      : ext === '.glb' ? 'model/gltf-binary' : 'application/octet-stream' });
    s.end(d);
  });
});
await new Promise(r => srv.listen(PORT, r));

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

/* Postura fisica -> (beta, gamma). Se DERIVA de la postura en vez de repetir la formula del
   modulo, asi la prueba contrasta de verdad la reconstruccion en vez de copiarla:
   cabeceo desde la horizontal, y alabeo positivo = horario visto por el jugador. */
function euler(pitch0, phi){
  const s = Math.sin(pitch0 * D);
  const gx = s * Math.sin(phi * D), gy = -s * Math.cos(phi * D), gz = -Math.cos(pitch0 * D);
  const beta = Math.asin(Math.max(-1, Math.min(1, -gy))) / D;
  const cB = Math.cos(beta * D);
  return [beta, Math.atan2(gx / cB, -gz / cB) / D];
}

async function open(viewport, init){
  const ctx = await browser.newContext({ viewport, hasTouch:true, isMobile:true, deviceScaleFactor:3 });
  const page = await ctx.newPage();
  page.on('pageerror', e => { fails++; console.log('FALLO  pageerror: ' + e.message); });
  if (init) await page.addInitScript(init);
  await page.goto('http://localhost:' + PORT + '/index.html?debug=1');
  await page.waitForFunction(() => window.__rr, null, { timeout:60000 });
  await page.waitForFunction(
    () => document.getElementById('boot-go').classList.contains('on'), null, { timeout:180000 });
  return { ctx, page };
}
const ride = page => page.evaluate(() => {
  __rr.state.lang = 'es'; __rr.state.quality = 'high'; __rr.state.invert = false;
  __rr.state.sens = 1;
  __rr.ui.h.onBootDone();
  __rr.ui.h.onPlay();
});

/* ============ 1. presentacion en horizontal sin cartel ============ */
{
  console.log('\n== presentacion, 390x844 vertical ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  const r = await page.evaluate(() => {
    const s = document.getElementById('stage');
    const b = s.getBoundingClientRect();
    return { rot:document.documentElement.classList.contains('rot'),
      css:getComputedStyle(s).transform,
      rect:[b.x, b.y, b.width, b.height],
      client:[document.getElementById('gl').clientWidth, document.getElementById('gl').clientHeight],
      buf:[__rr.world.canvas.width, __rr.world.canvas.height],
      aspect:__rr.world.camera.aspect,
      dpr:window.devicePixelRatio };
  });
  ok(r.rot === true, 'html.rot puesto en vertical');
  /* La matriz exacta es la asercion que fija el transform-origin y el ORDEN de la lista a la vez:
     con origen 50% 50% la caja se va a x=(vh+vw)/2, y con "rotate() translateX()" sale e=0 en vez
     de e=390. Ninguna de las dos puede pasar por casualidad. */
  ok(r.css === 'matrix(0, 1, -1, 0, 390, 0)', 'matriz del escenario', r.css);
  ok(r.rect.join() === '0,0,390,844', 'el escenario encaja exacto en el viewport', r.rect.join());
  ok(r.client.join() === '844,390', 'el lienzo mide la caja de MAQUETACION, no la transformada', r.client.join());
  ok(near(r.aspect, 844 / 390, 0.01), 'camera.aspect es el del escenario y no el del viewport', r.aspect);
  ok(r.buf[0] === Math.round(844 * Math.min(2, r.dpr)), 'el buffer sigue al escenario', r.buf.join());
  /* Nada de "gira el movil": el juego se presenta girado por su cuenta. */
  const carteles = await page.locator('text=/gira el|gire el|rotate your|tourne|vire o/i').count();
  ok(carteles === 0, 'ningun cartel de girar el aparato', carteles);
  await ctx.close();
}

/* ============ 2. mapPointer contra el propio navegador ============ */
{
  console.log('\n== mapPointer ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  const r = await page.evaluate(() => {
    const s = document.getElementById('stage'), gl = document.getElementById('gl');
    const m = new DOMMatrixReadOnly(getComputedStyle(s).transform);
    const inv = m.inverse();
    const out = [];
    gl.addEventListener('pointerdown', e => out.push({
      client:[e.clientX, e.clientY], offset:[e.offsetX, e.offsetY],
      map:__rr.controls.mapPointer(e) }));
    /* Los puntos se eligen en el espacio LOCAL y se llevan a pantalla con la propia matriz:
       pinchar en coordenadas de pagina a ojo acaba dando en el boton de pausa, que con el
       escenario girado cae donde uno no lo espera, y todo lo siguiente falla por un motivo falso. */
    for (const [fx, fy] of [[0.3, 0.5], [0.5, 0.42], [0.7, 0.6]]){
      const p = m.transformPoint(new DOMPoint(fx * s.clientWidth, fy * s.clientHeight));
      const x = Math.round(p.x), y = Math.round(p.y);
      if (document.elementFromPoint(x, y) !== gl) continue;
      gl.dispatchEvent(new PointerEvent('pointerdown',
        { pointerId:1, clientX:x, clientY:y, bubbles:true }));
    }
    return { inv:[inv.a, inv.b, inv.c, inv.d, inv.e, inv.f], out };
  });
  /* Contraste de la inversa a mano contra la del navegador, componente por componente. Es la
     asercion que hace que cambiar el CSS a rotate(-90deg) FALLE en vez de pasar en silencio
     dejando el eje del dedo del reves. Se compara por diferencia porque una componente sale -0. */
  [0, -1, 1, 0, 0, 390].forEach((v, i) =>
    ok(near(r.inv[i], v, 1e-9), 'inversa componente ' + i, r.inv[i]));
  ok(r.out.length === 3, 'los tres puntos cayeron sobre el lienzo', r.out.length);
  for (const e of r.out){
    /* offsetX/offsetY ya vienen en el espacio local: los calcula el navegador aplicando su propia
       inversa, asi que es un contraste independiente. 1 px de holgura porque Chromium los
       redondea a entero. */
    ok(near(e.map.x, e.offset[0], 1), 'mapPointer.x == offsetX', e.map.x + ' vs ' + e.offset[0]);
    ok(near(e.map.y, e.offset[1], 1), 'mapPointer.y == offsetY', e.map.y + ' vs ' + e.offset[1]);
    ok(near(e.map.x, e.client[1], 1), 'local x es clientY');
    ok(near(e.map.y, 390 - e.client[0], 1), 'local y es W - clientX');
  }
  await ctx.close();
}

/* ============ 3. giroscopio: signo, invariancia y sensor dormido ============ */
{
  console.log('\n== giroscopio ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  const r = await page.evaluate(async tabla => {
    __rr.state.scheme = 'tilt';
    await __rr.controls.enableGyro();
    /* El emulador de sensores no hace falta: se despacha el mismo evento que emite un movil, con
       lo que se ejercita onOrient tal cual. Se manda un temblor de 0,3 grados porque es lo que
       hace una mano de verdad y porque el cero necesita varias lecturas distintas. */
    const send = (b, g) => dispatchEvent(Object.assign(
      new Event('deviceorientation'), { alpha:0, beta:b, gamma:g }));
    const hold = async (bg, n) => { for (let i = 0; i < n; i++){
      send(bg[0] + (Math.random() - 0.5) * 0.3, bg[1] + (Math.random() - 0.5) * 0.3);
      await new Promise(z => setTimeout(z, 4)); } };
    const settle = () => { let v = 0;
      for (let i = 0; i < 60; i++){ __rr.controls.update(1 / 60); v = __rr.controls.input.steer; }
      return v; };
    const out = {};
    for (const [nombre, neutro, casos] of tabla){
      __rr.controls.calibrateGyro();
      await hold(neutro, 20);
      out[nombre + ':neutro'] = settle();
      for (const c of casos){ await hold(c.bg, 20); out[nombre + ':' + c.phi] = settle(); }
    }
    /* Sensor dormido: se deja de emitir y se avanza el juego. El manillar tiene que volver al
       centro, no quedarse pegado al ultimo angulo. */
    await new Promise(z => setTimeout(z, 700));
    let v = 0;
    for (let i = 0; i < 120; i++){ __rr.controls.update(1 / 60); v = __rr.controls.input.steer; }
    out.dormido = v;
    out.dormidoStatus = __rr.controls.gyroStatus();
    out.tiltFull = __rr.controls.tiltFullDeg();
    /* Movil tumbado en la mesa: el alabeo no esta definido y la direccion no puede congelarse. */
    await hold([4, 0], 20);
    let f = 0;
    for (let i = 0; i < 120; i++){ __rr.controls.update(1 / 60); f = __rr.controls.input.steer; }
    out.tumbado = f;
    return out;
  }, [
    ['cabeceo60', euler(60, 0), [-20, -8, 8, 20].map(phi => ({ phi, bg:euler(60, phi) }))],
    ['cabeceo90', euler(90, 0), [-20, -8, 8, 20].map(phi => ({ phi, bg:euler(90, phi) }))] ]);

  for (const nombre of ['cabeceo60', 'cabeceo90']){
    ok(Math.abs(r[nombre + ':neutro']) < 0.05, nombre + ' neutro centrado', r[nombre + ':neutro']);
    for (const phi of [-20, -8, 8, 20]){
      const v = r[nombre + ':' + phi];
      /* Alabeo horario positivo tiene que ser giro a la DERECHA en las dos posturas: es la
         asercion de la invariancia frente a la rotacion por CSS. Con el signo de gx negado esto
         sale al reves en las dos, y con gamma leido a pelo el cabeceo 90 se vuelve loco. */
      ok(Math.sign(v) === Math.sign(phi) && Math.abs(v) > 0.05,
        nombre + ' alabeo ' + phi + ' -> giro al mismo lado', v);
    }
  }
  ok(Math.abs(r['cabeceo60:20'] - r['cabeceo90:20']) < 0.12,
    'el alabeo da lo mismo a cabeceo 60 y 90 (nada de gamma a pelo)',
    r['cabeceo60:20'] + ' vs ' + r['cabeceo90:20']);
  ok(Math.abs(r.dormido) < 0.05, 'sensor dormido: el manillar vuelve al centro', r.dormido);
  ok(r.dormidoStatus === 'stale', 'y el estado lo dice', r.dormidoStatus);
  ok(Math.abs(r.tumbado) < 0.05, 'movil tumbado: la direccion no se congela', r.tumbado);
  ok(near(r.tiltFull, 22, 0.01), 'tope de giro 22 grados a sensibilidad 1', r.tiltFull);
  await ctx.close();
}

/* ============ 4. arrastre: el eje que ve el JUGADOR ============ */
{
  console.log('\n== arrastre ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  const r = await page.evaluate(() => {
    __rr.state.scheme = 'touch';
    /* La direccion "derecha del jugador" se saca de la propia matriz en vez de suponerla: con el
       escenario girado es fisicamente HACIA ABAJO en el movil. */
    const m = new DOMMatrixReadOnly(getComputedStyle(document.getElementById('stage')).transform);
    const o = m.transformPoint(new DOMPoint(0, 0)), q = m.transformPoint(new DOMPoint(100, 0));
    const dx = (q.x - o.x) / 100, dy = (q.y - o.y) / 100;
    const gl = document.getElementById('gl');
    const swipe = k => {
      __rr.controls.releaseAll();
      const x0 = 195 - dx * 140 * k, y0 = 420 - dy * 140 * k;
      gl.dispatchEvent(new PointerEvent('pointerdown', { pointerId:7, clientX:x0, clientY:y0, bubbles:true }));
      for (let i = 1; i <= 8; i++)
        gl.dispatchEvent(new PointerEvent('pointermove',
          { pointerId:7, clientX:x0 + dx * 280 * k * i / 8, clientY:y0 + dy * 280 * k * i / 8, bubbles:true }));
      __rr.controls.update(1 / 60);
      const v = __rr.controls.input.steer;
      gl.dispatchEvent(new PointerEvent('pointerup', { pointerId:7, bubbles:true }));
      return v;
    };
    const der = swipe(1), izq = swipe(-1);
    /* Arrastre rancio: con el dedo puesto se suelta todo y el siguiente movimiento no puede
       comparar contra la posicion vieja. */
    gl.dispatchEvent(new PointerEvent('pointerdown', { pointerId:8, clientX:195, clientY:200, bubbles:true }));
    __rr.controls.releaseAll();
    gl.dispatchEvent(new PointerEvent('pointermove', { pointerId:8, clientX:195, clientY:820, bubbles:true }));
    __rr.controls.update(1 / 60);
    return { der, izq, rancio:__rr.controls.input.steer };
  });
  ok(r.der > 0.05, 'a la derecha del jugador gira a la derecha', r.der);
  ok(r.izq < -0.05, 'a la izquierda del jugador gira a la izquierda', r.izq);
  ok(Math.abs(r.rancio) < 0.05, 'un arrastre soltado no da un tiron al volver', r.rancio);
  await ctx.close();
}

/* ============ 5. mandos de pantalla ============ */
{
  console.log('\n== mandos de pantalla ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  const r = await page.evaluate(() => {
    __rr.state.scheme = 'buttons'; __rr.ui.paintPedals();
    const at = id => { const b = document.getElementById(id).getBoundingClientRect();
      return { clientX:b.x + b.width / 2, clientY:b.y + b.height / 2 }; };
    const down = (id, pid) => document.getElementById(id).dispatchEvent(
      new PointerEvent('pointerdown', { pointerId:pid, ...at(id), bubbles:true }));
    const up = (id, pid) => document.getElementById(id).dispatchEvent(
      new PointerEvent('pointerup', { pointerId:pid, bubbles:true }));
    const settle = n => { let v = null;
      for (let i = 0; i < (n || 60); i++){ __rr.controls.update(1 / 60);
        v = { steer:__rr.controls.input.steer, throttle:__rr.controls.input.throttle }; }
      return v; };
    const out = {};
    // acelerar y girar a la vez: dos elementos, dos punteros
    __rr.controls.releaseAll(); down('p-gas', 1); down('p-right', 2);
    out.simultaneo = settle();
    up('p-gas', 1); up('p-right', 2);
    // dos dedos sobre el MISMO mando: levantar uno no suelta el otro
    __rr.controls.releaseAll(); down('p-gas', 3); down('p-gas', 4); up('p-gas', 4);
    out.dosDedos = settle(2).throttle;
    up('p-gas', 3);
    // izquierda + derecha, soltar derecha: tiene que volver a la izquierda
    __rr.controls.releaseAll(); down('p-left', 5); down('p-right', 6); up('p-right', 6);
    out.izqTrasSoltarDer = settle().steer;
    up('p-left', 5);
    // gas pulsado + releaseAll + pulsar con OTRO id: el gas no puede quedar muerto
    __rr.controls.releaseAll(); down('p-gas', 7);
    __rr.controls.update(1 / 60);
    out.gasAntes = __rr.controls.input.throttle;
    __rr.controls.releaseAll();
    out.pressPegado = document.querySelector('#p-gas.press') !== null;
    down('p-gas', 8);
    __rr.controls.update(1 / 60);
    out.gasDespues = __rr.controls.input.throttle;
    up('p-gas', 8);
    return out;
  });
  ok(r.simultaneo.throttle === 1 && r.simultaneo.steer > 0.05,
    'se acelera y se gira a la vez', JSON.stringify(r.simultaneo));
  ok(r.dosDedos === 1, 'el segundo dedo no apaga el mando del primero', r.dosDedos);
  ok(r.izqTrasSoltarDer < -0.05,
    'soltar DERECHA con IZQUIERDA pulsada devuelve el giro a la izquierda', r.izqTrasSoltarDer);
  ok(r.gasAntes === 1 && r.gasDespues === 1 && !r.pressPegado,
    'el gas no queda muerto ni pintado tras soltar todo', JSON.stringify(r));
  // los cinco mandos desaparecen en pausa
  const pausa = await page.evaluate(() => { __rr.ui.show('pause');
    return ['p-gas','p-brake','p-left','p-right','p-horn'].map(i => {
      const s = getComputedStyle(document.getElementById(i));
      return s.opacity + '/' + s.pointerEvents; }); });
  ok(pausa.every(v => v === '0/none'), 'ningun mando visible ni clicable en pausa', pausa.join(' '));
  await ctx.close();
}

/* ============ 6. sensibilidad: el tope SIEMPRE se alcanza ============ */
{
  console.log('\n== sensibilidad ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  const r = await page.evaluate(() => {
    const out = {};
    const at = id => { const b = document.getElementById(id).getBoundingClientRect();
      return { clientX:b.x + b.width / 2, clientY:b.y + b.height / 2 }; };
    for (const s of [0.4, 1, 2]){
      __rr.state.sens = s; __rr.state.scheme = 'buttons'; __rr.controls.releaseAll();
      const el = document.getElementById('p-left');
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId:1, ...at('p-left'), bubbles:true }));
      let n = 0;
      while (n < 900){ __rr.controls.update(1 / 60); n++;
        if (Math.abs(__rr.controls.input.steer) > 0.995) break; }
      out['btn' + s] = { ms:Math.round(n * 1000 / 60), steer:__rr.controls.input.steer };
      el.dispatchEvent(new PointerEvent('pointerup', { pointerId:1, bubbles:true }));
      out['tiltFull' + s] = __rr.controls.tiltFullDeg();
    }
    __rr.state.sens = 1;
    return out;
  });
  for (const s of [0.4, 1, 2])
    ok(Math.abs(r['btn' + s].steer) > 0.995,
      'con sens ' + s + ' los botones llegan al tope', JSON.stringify(r['btn' + s]));
  ok(r['btn0.4'].ms > r.btn1.ms && r.btn1.ms > r.btn2.ms,
    'y la sensibilidad cambia la VELOCIDAD, no el tope',
    [r['btn0.4'].ms, r.btn1.ms, r.btn2.ms].join('/'));
  /* El angulo de tope se recorta: con sens 0,4 pediria 55 grados, que es inalcanzable. */
  ok(r['tiltFull0.4'] <= 34.01, 'el angulo de tope se recorta a 34 grados', r['tiltFull0.4']);
  ok(r.tiltFull2 >= 10, 'y no baja de 10 grados', r.tiltFull2);
  await ctx.close();
}

/* ============ 7. respaldo sin sensor: BOTONES, y dicho con palabras ============ */
{
  console.log('\n== respaldo sin sensor ==');
  const { ctx, page } = await open({ width:390, height:844 },
    () => { delete window.DeviceOrientationEvent; });
  await page.evaluate(() => { __rr.state.scheme = 'tilt'; });
  await ride(page);
  const r = await page.evaluate(() => {
    __rr.ui.show('settings');
    return { activo:__rr.controls.activeScheme(),
      pedido:__rr.controls.wantedScheme(),
      estado:__rr.controls.gyroStatus(),
      btns:document.getElementById('pedals').classList.contains('btns'),
      flechaVisible:getComputedStyle(document.getElementById('p-left')).display !== 'none',
      hint:document.getElementById('scheme-hint').textContent,
      filaTilt:document.getElementById('row-tilt').classList.contains('off') };
  });
  ok(r.pedido === 'tilt', 'el esquema PEDIDO sigue siendo inclinar');
  ok(r.activo === 'buttons', 'el respaldo es BOTONES, no arrastre', r.activo);
  ok(r.estado === 'unsupported', 'el estado tiene nombre', r.estado);
  ok(r.btns && r.flechaVisible, 'las dos flechas aparecen solas');
  ok(r.hint.length > 0 && !/^sch\./.test(r.hint.trim()),
    'la interfaz lo explica y la clave esta traducida', JSON.stringify(r.hint));
  await ctx.close();
}

/* ============ 8. no se gira en un portatil tactil ============ */
{
  console.log('\n== portatil con pantalla tactil ==');
  /* Playwright no puede emular esto con un perfil: hasTouch fuerza pointer:coarse y hover:none.
     Se falsea matchMedia, que es justo el par de consultas del que cuelga la decision. */
  const { ctx, page } = await open({ width:800, height:1200 }, () => {
    const real = window.matchMedia.bind(window);
    const fake = m => ({ matches:m, media:'', addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
    window.matchMedia = q => /pointer:\s*coarse/.test(q) ? fake(false)
      : /hover:\s*hover/.test(q) ? fake(true) : real(q);
    Object.defineProperty(navigator, 'maxTouchPoints', { get:() => 10 });
  });
  const r = await page.evaluate(() => ({
    rot:document.documentElement.classList.contains('rot'),
    css:getComputedStyle(document.getElementById('stage')).transform,
    esquema:__rr.controls.defaultScheme() }));
  ok(r.rot === false, 'un portatil tactil NO se gira 90 grados aunque mida mas alto que ancho');
  /* Identidad y no 'none': un transform distinto de none es lo que hace del escenario bloque
     contenedor de sus hijos fixed, y esa referencia tiene que ser la misma en las dos
     orientaciones. */
  ok(r.css === 'matrix(1, 0, 0, 1, 0, 0)', 'en horizontal se escribe rotate(0deg), no none', r.css);
  ok(r.esquema === 'touch', 'y no elige giroscopio', r.esquema);
  await ctx.close();
}

/* ============ 9. muescas remapeadas ============ */
{
  console.log('\n== muescas ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  /* Sin muesca real: se inyectan las variables. Si el CSS del HUD volviera a leer env() directo o
     se quedara sin margen lateral, los numeros no se mueven. */
  await page.addStyleTag({ content: 'html.rot{--sa-l:47px;--sa-r:34px;--sa-t:44px;--sa-b:21px}' });
  const r = await page.evaluate(() => {
    const h = getComputedStyle(document.getElementById('hudtop'));
    const sp = getComputedStyle(document.getElementById('speedo'));
    __rr.ui.show('settings');
    const sc = getComputedStyle(document.getElementById('s-settings'));
    return { hudLeft:h.paddingLeft, hudRight:h.paddingRight, hudTop:h.top,
      speedoBottom:sp.bottom, screenLeft:sc.paddingLeft, screenRight:sc.paddingRight };
  });
  ok(r.hudLeft === '59px', 'el HUD se aparta de la muesca por el borde IZQUIERDO del juego (12+47)', r.hudLeft);
  ok(r.hudRight === '46px', 'y del borde derecho fisico por el otro lado (12+34)', r.hudRight);
  ok(r.hudTop === '53px', 'y arriba del juego, que es el derecho fisico (9+44)', r.hudTop);
  ok(r.speedoBottom === '31px', 'el velocimetro respeta el borde de abajo del juego (10+21)', r.speedoBottom);
  ok(r.screenLeft === '63px' && r.screenRight === '50px',
    'los paneles tambien llevan margen lateral', r.screenLeft + '/' + r.screenRight);
  await ctx.close();
}

/* ============ 10. encuadre y sacudida ============ */
{
  console.log('\n== camara ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  const r = await page.evaluate(() => {
    const DEG = 180 / Math.PI, P0 = -3.5;
    /* Un choque congela setRider, asi que se anula para que la medida sea determinista. */
    __rr.game.crash = () => {};
    __rr.world.shake = 1.5;
    let pico = 0;
    for (let i = 0; i < 200; i++){ __rr.world.time += 1 / 60;
      __rr.world.setRider(0, 0, 0.5, 1, 0, 1 / 60);
      pico = Math.max(pico, Math.abs(__rr.world.camera.rotation.x * DEG - P0)); }
    __rr.world.shake = 0;
    // la moto tiene que quedarse centrada tambien tumbada
    const cam = [];
    for (const lean of [0, 1]){
      for (let i = 0; i < 30; i++) __rr.world.setRider(0, lean, 0.6, 1, 0, 1 / 60);
      cam.push(__rr.world.camera.position.x);
    }
    return { picoChoqueDeg:pico, desvioRecto:cam[0], desvioTumbado:cam[1],
      hfovDeg:__rr.world.hfov, vfovDeg:__rr.world.camera.fov };
  });
  ok(r.picoChoqueDeg < 6,
    'la sacudida de un choque no manda la camara al suelo', r.picoChoqueDeg.toFixed(2) + ' grados');
  ok(Math.abs(r.desvioRecto) < 0.05, 'en recto la camara esta centrada', r.desvioRecto);
  ok(Math.abs(r.desvioTumbado) < 0.35,
    'tumbada, la camara acompana al chasis y la moto no se va del encuadre', r.desvioTumbado);
  ok(r.vfovDeg < 70 && r.hfovDeg < 100, 'nada de ojo de pez', r.hfovDeg + '/' + r.vfovDeg);
  await ctx.close();
}

/* ============ 11. relayout idempotente ============ */
{
  console.log('\n== relayout ==');
  const { ctx, page } = await open({ width:390, height:844 });
  await ride(page);
  const escrituras = await page.evaluate(() => {
    const s = document.getElementById('stage');
    let n = 0;
    const d = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'transform');
    Object.defineProperty(s.style, 'transform', {
      get(){ return d.get.call(this); },
      set(v){ n++; d.set.call(this, v); } });
    for (let i = 0; i < 20; i++) __rr.controls.layoutStage();
    return n;
  });
  ok(escrituras === 0,
    'veinte relayouts sin cambio de tamano no reescriben el transform ni una vez', escrituras);
  await ctx.close();
}

await browser.close();
srv.close();
console.log('\n' + (fails ? fails + ' FALLOS' : 'todo correcto'));
process.exit(fails ? 1 : 0); — **why**: Todo se comprueba sin telefono: viewport vertical, eventos de orientacion despachados por el mismo camino que un movil real, y medidas sobre la matriz calculada, el DOM y el renderer. Las dos aserciones que valen mas son las que fijan acoplamientos que hoy son de palabra: `stage.getBoundingClientRect()` estrictamente igual a {0,0,390,844} (si el transform-origin o el orden de la lista cambian, esto se va y no hay forma de que pase por casualidad) y `mapPointer == e.offsetX/offsetY` (la inversa la calcula el navegador, asi que si alguien pone rotate(-90deg) la prueba falla en vez de dejar el dedo del reves en silencio).
- **n**: 14 — **file**: index.html — **what**: Reconstruir los tres artefactos y comprobar que los marcadores criticos y las traducciones sobrevivieron al empaquetado. — **code**: cd /home/user/General-Assets-Games/redline-rider
node build.mjs && node build.mjs --cdn && node build.mjs --single

# El escenario y el remapeo de muescas tienen que estar en el bundle: si el marcador se pierde,
# el juego arranca sin girar y sin decir nada.
grep -c 'id="stage"' index.html          # 1
grep -c 'html.rot' index.html            # 1
grep -c 'pedals:not(.ride)' index.html   # 1
grep -c 'scheme-hint' index.html         # 3 o mas (CSS, DOM y JS)

# Y ninguna clave de i18n sin traducir en los cuatro idiomas: t() devuelve la clave cruda cuando
# falta, asi que el jugador veria 'sch.stale' en su pantalla de ajustes.
node -e "const s=require('fs').readFileSync('index.html','utf8');
  const k=['sch.live','sch.waiting','sch.ask','sch.denied','sch.unsupported','sch.insecure','sch.stale','sch.fallback','sch.hint.tilt','sch.hint.touch','sch.hint.buttons'];
  let bad=0;
  for(const x of k){const n=(s.match(new RegExp(\"'\"+x.replace(/\\./g,'\\\\.')+\"'\",'g'))||[]).length;
    if(n<4){console.log('FALTA en algun idioma:',x,'->',n);bad++;}}
  console.log(bad?'i18n INCOMPLETO':'i18n comprobado');process.exit(bad?1:0);"

node tools/controls.test.mjs — **why**: El juego se compila a un IIFE clasico y se abre tambien desde file://, asi que hay cosas que funcionan en modulos y no empaquetadas. Y una clave de i18n que falte en un idioma no lanza ningun error: solo se ve mirando la pantalla en ese idioma, que es lo que nadie hace.

### constants

- **name**: gx del giroscopio — **value**: +cos(beta)·sin(gamma)  (ya correcto en src/controls.js:165) — **why**: Verificado con 300.000 triples aleatorios contra abajo_aparato = R^T·(0,0,-1) = -(tercera fila de R) con R = Rz(a)Rx(b)Ry(g): error maximo 0,00e+0. Con el signo negado el error llega a 2,0, que es un espejo en X y niega el alabeo en TODA postura. Una de las investigaciones lo reportaba como bug vivo: ya no lo es, el arbol de trabajo lo tiene bien. No tocar.
- **name**: inversa de mapPointer — **value**: x = clientY, y = W - clientX  (ya correcto en src/controls.js:119) — **why**: Con transform-origin 0 0 y translateX(W) rotate(90deg), Chromium calcula matrix(0, 1, -1, 0, 390, 0) sobre un viewport de 390x844, o sea local (x,y) -> pantalla (W - y, x). Su inversa, leida del propio DOMMatrix, es (0,-1,1,0,0,390): componente por componente ES esa formula. El getBoundingClientRect del escenario da {0,0,390,844}. No tocar; blindar con la prueba del paso 13.
- **name**: respaldo del giroscopio — **value**: 'buttons' (hoy 'touch') — **why**: Lo pide design/spec.md ('on-screen buttons, recommended default on touch') y sobre todo lo pide el sintoma: con arrastre el jugador se queda mirando una pantalla sin nada que tocar, que es su queja textual. Con botones las dos flechas aparecen en el mismo instante del fallo, porque paintPedals cuelga de activeScheme.
- **name**: test de rotacion / test de esquema — **value**: isCoarse() = pointer:coarse  /  isHandheld() = coarse && !hover:hover — **why**: En un portatil con pantalla tactil (maxTouchPoints 10, pointer:fine, hover:hover) los dos tests actuales dan falso positivo por la rama de maxTouchPoints, y el juego se presenta de lado en un ordenador y encima elige giroscopio. maxTouchPoints solo entra si el navegador no tiene consultas de puntero. El hover solo interviene en el esquema: si un WebView antiguo miente con hover, el peor caso es un movil que arranca con arrastre (un toque para arreglarlo) en vez de un movil sin girar.
- **name**: GYRO_WAIT_MS — **value**: 1500 ms — **why**: Espera a la PRIMERA lectura tras conceder el permiso. Un sensor que va a entregar datos entrega el primer evento por debajo de 300 ms, asi que hay cinco veces de margen, y es lo que fija design/spec.md para el respaldo automatico. Conceder el permiso no es tener sensor: en un iframe sin allow="gyroscope" el evento no llega jamas y no hay API para preguntarlo.
- **name**: GYRO_STALE_MS — **value**: 500 ms (ya en el codigo) — **why**: Silencio que convierte el sensor en dormido. El sensor mas lento que se ve reporta a 10 Hz, o sea que 500 ms son cinco lecturas perdidas: no hay falso positivo, y medio segundo de manillar centrandose es sobrevivible a 200 km/h. Sin este vigilante, gyro.active subia y no habia quien lo bajase: medido, steer 0,49 congelado cinco segundos despues del ultimo evento.
- **name**: TILT_FULL_MIN / TILT_FULL_MAX — **value**: 10 / 34 grados — **why**: Recorte del angulo de tope, que es TILT_FULL/sens. Con el rango de sensibilidad 0,4-2,0 de la especificacion, sin recorte el extremo bajo pediria 55 grados de alabeo, que es inalcanzable sin perder de vista la pantalla; por encima de 34 grados hay que mover los antebrazos en vez de las munecas. Y por debajo de 10 la zona muerta de 1,6 grados se come una quinta parte del recorrido y el temblor de mano (~0,5 grados) pasa a valer un 6% de la direccion.
- **name**: rango del deslizador de sensibilidad — **value**: 40-200 (era 50-200) — **why**: design/spec.md:121 dice 0,4-2,0. El minimo de 50 no llegaba abajo, y con la sensibilidad ya aplicada en la unidad correcta de cada esquema (angulo / ganancia de pixeles / velocidad de barrido) el extremo bajo es util y no destructivo: medido, con 0,4 los botones siguen llegando al tope, en 783 ms.
- **name**: amplitud de la sacudida — **value**: this.shake * 2.5 grados por unidad (era * 12) — **why**: Medido sobre 200 fotogramas con el addShake(1.5) del choque: pico de 18,28 grados de cabeceo, 10,67 de guinada y 17,58 de balanceo, o sea la camara mirando al asfalto justo cuando el jugador quiere ver que ha pasado. Con 2,5 el pico baja a unos 4,1 grados, que se lee como un golpe seco. Los 0,15-0,6 grados de la marcha normal (SHAKE_DEG) se quedan como estan: coinciden con design/spec.md:103 y el pico medido sin choque es de 2,04 grados.
- **name**: BTN_RATE — **value**: 3,2 topes/s escalado por la sensibilidad (ya en el codigo) — **why**: Medido: 783 / 317 / 167 ms hasta el tope para sensibilidades 0,4 / 1 / 2, y el tope se alcanza siempre. Es lo unico regulable en un mando digital: multiplicar la salida (que ya esta recortada a +-1) solo impedia llegar al tope por debajo de 1 y no hacia nada por encima. Ojo al techo: game.js:170 limita el manillar a 5,5 topes/s (182 ms), asi que por encima de sens 1,7 el ajuste satura.
- **name**: transform en horizontal — **value**: rotate(0deg), nunca none — **why**: Identidad, pero un transform distinto de none es lo que convierte al escenario en bloque contenedor de sus descendientes position:fixed. Con none, esos hijos medirian el viewport en horizontal y el escenario en vertical, y el CSS se comportaria distinto segun la orientacion por un motivo que no tiene nada que ver con girar. Una de las investigaciones proponia none: descartado.
- **name**: remapeo de muescas con html.rot — **value**: --sa-t=inset-right, --sa-r=inset-bottom, --sa-b=inset-left, --sa-l=inset-top — **why**: Se deriva de la matriz medida: local +x va hacia ABAJO en la pantalla y local +y hacia la IZQUIERDA, luego el borde superior fisico es el borde IZQUIERDO del juego y el derecho fisico es el de ARRIBA. Los cuatro nombres rotan un paso. El CSS ya lo tiene bien; lo que estaba mal era el comentario (decia DERECHO), y lo que falta es que el HUD y las pantallas lean tambien --sa-l y --sa-r, porque hoy no tienen margen lateral y la muesca cae exactamente sobre la distancia.
- **name**: medida del renderer — **value**: clientWidth/clientHeight o los numeros de layoutStage; jamas getBoundingClientRect — **why**: Medido: con el escenario girado, canvas.clientWidth/clientHeight da 844x390 (caja de maquetacion, sin transformar) y getBoundingClientRect da 390x844 (caja ya transformada). Con el segundo, camera.aspect sale invertido y el resultado es la moto descentrada y el horizonte torcido. Y setSize(w, h, false) hay que mantenerlo: el CSS ya tiene el lienzo al 100% del escenario.
- **name**: una sola rotacion, siempre rotate(90deg) — **value**: sin stageSpin ni rotate(-90deg) — **why**: Una investigacion proponia que el giroscopio eligiera el sentido segun a que lado gire el jugador el telefono. Descartado: haria que la presentacion dependiera de una lectura viva, con lo que la imagen puede voltear 180 grados en mitad de una carrera por una lectura suelta; rompe la matriz unica sobre la que descansan mapPointer y toda la prueba de regresion; y no existe cuando el respaldo es 'buttons', porque ahi no hay sensor del que decidir. El alabeo es invariante frente a la rotacion por CSS, asi que la direccion funciona igual si el jugador sujeta el movil del otro lado: lo unico que ve al reves es la imagen, y girar el telefono al otro lado es el gesto natural.
- **name**: sensibilidad global, no por esquema — **value**: un unico state.sens — **why**: design/spec.md:121 la quiere por esquema. Se aplaza a proposito: ahora que cada cadena la aplica en su unidad (angulo / ganancia de pixeles / velocidad de barrido), un unico multiplicador significa lo mismo en los tres ('lo nervioso que va'), mientras que por esquema exige convertir state.sens en objeto, migrar los guardados y aceptar que un NaN ahi deja el manillar muerto sin ningun sintoma. Ninguna de las cinco quejas del jugador es de sensibilidad; lo que si se corrige gratis es el rango (40-200).
- **name**: unidades del HUD — **value**: vmin, no vw/vh ni custom properties — **why**: Otra investigacion proponia --vw/--vh escritas por JS. Descartado: con el escenario rotado el lado corto del escenario ES el lado corto fisico (stage.height = innerWidth), asi que vmin ya es correcto en las dos orientaciones con cero JS, mientras que la custom property necesita una escritura por relayout y degrada a nada si layoutStage no llega a correr. El fichero en disco ya usa vmin en los doce sitios.
- **name**: distribucion de los mandos — **value**: la que ya hay (--pad/--sec/--horn/--gap/--edge) — **why**: Una investigacion pedia un rediseno completo con --pad-gas/--pad-brake y mover el velocimetro. Ya esta hecho de otra forma y funciona: medido par a par en 390x844, 844x390 y 1180x820 no hay NI UN solape entre los cinco mandos, el velocimetro, la barra de revoluciones y la fila superior. Lo unico que le falta es desaparecer cuando no se conduce.

### test_plan

- Ejecutar el guion completo, que es la puerta de todo lo demas: `cd /home/user/General-Assets-Games/redline-rider && node build.mjs && node tools/controls.test.mjs`. Sirve un http efimero sobre el repo (index.html carga los GLB por fetch y file:// no vale) y lanza chromium con --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader, porque sin WebGL three.js no arranca y el gancho window.__rr no aparece nunca. Devuelve 0 o 1, asi que sirve de regresion en cualquier maquina.
- Presentacion en horizontal, viewport 390x844 vertical: html.rot puesto; getComputedStyle(stage).transform estrictamente 'matrix(0, 1, -1, 0, 390, 0)'; stage.getBoundingClientRect() estrictamente {0,0,390,844}. Esta ultima es la asercion que fija el transform-origin Y el orden de la lista de transformaciones a la vez, y no hay forma de que pase por casualidad: con origen 50% 50% la caja se va a x=(844+390)/2, y con 'rotate(90deg) translateX(390px)' la matriz sale con e=0 (verificado en Chromium) y la caja se queda fuera por la izquierda y 390 px mas abajo.
- Sin cartel de girar: `page.locator('text=/gira el|gire el|rotate your|tourne|vire o/i').count() === 0` con el juego en vertical y conduciendo.
- Relacion de aspecto del renderer: gl.clientWidth/clientHeight = 844x390 (caja de maquetacion) y camera.aspect = 844/390 con 0,01 de holgura. Es la comprobacion directa de 'lo mal ubicada la moto': si aspect saliera menor que 1, el mundo iria aplastado. Y el buffer del lienzo tiene que seguir al escenario, no al viewport.
- mapPointer contra el propio navegador, dos aserciones independientes. Primera: `new DOMMatrixReadOnly(getComputedStyle(stage).transform).inverse()` tiene que dar (0,-1,1,0,0,390) componente por componente con 1e-9 de holgura (hay que comparar por diferencia y no con igualdad estricta, porque una componente sale -0). Segunda, y la mas valiosa: en cada pointerdown sobre #gl, mapPointer(e) tiene que coincidir con e.offsetX/e.offsetY con 1 px de holgura, porque el navegador los calcula aplicando su propia inversa. Chromium redondea offset a entero, de ahi el pixel. Los puntos se eligen en el espacio LOCAL y se llevan a pantalla con la matriz, filtrados con elementFromPoint: pinchar en coordenadas de pagina a ojo acaba dando en el boton de pausa, que con el escenario girado cae donde uno no lo espera, deja el juego pausado y hace fallar todo lo siguiente por un motivo inventado.
- Signo del giroscopio, sin telefono y sin CDP: se despachan eventos 'deviceorientation' sinteticos sobre window, que es el mismo camino que recorre un movil real hasta onOrient. Los (beta, gamma) se DERIVAN de la postura fisica (cabeceo desde la horizontal y alabeo horario visto por el jugador) en vez de repetir la formula del modulo, asi la prueba la contrasta en vez de copiarla. Dos posturas, cabeceo 60 (movil en vertical en la mano) y cabeceo 90 (movil vertical, que es la postura del caso girado por CSS), y cuatro alabeos cada una. Criterio: sign(steer) == sign(alabeo horario) con |steer| > 0,05, y el neutro por debajo de 0,05. Medido sobre el codigo actual: -20 grados dan -0,854 y -0,841; +20 dan +0,849 y +0,852. Con el signo de gx negado esto sale al reves en las dos posturas.
- Invariancia del alabeo, que es la tesis: |steer(cabeceo 60, +20) - steer(cabeceo 90, +20)| < 0,12. Es la asercion que caza a quien vuelva a meter gamma en el camino, porque la ganancia gamma/alabeo depende del cabeceo (1,53 a 60 grados, 4,50 a 90) y con el movil exactamente vertical gamma se clava en +-90 y da la misma lectura para alabeos opuestos.
- Sensor dormido: dejar de emitir 700 ms y avanzar 120 fotogramas de juego. |input.steer| < 0,05 y gyroStatus() === 'stale'. Sin el vigilante, el ultimo angulo se quedaba dentro y el manillar pegado a medio giro: es 'controles pegados al recuperar el foco'.
- Movil tumbado en la mesa (cabeceo 4 grados): el alabeo no esta definido y la direccion tiene que decaer a menos de 0,05, no congelarse. Si se queda pegada, ha vuelto el 'return' sin tocar raw.
- Eje del arrastre tal como lo ve el JUGADOR: la direccion 'derecha' se saca de la propia matriz (transformPoint de (100,0) menos (0,0)) en vez de suponerla, porque con el escenario girado la derecha del jugador es fisicamente HACIA ABAJO en el movil. Arrastrar en ese eje da steer > 0,05 y el opuesto < -0,05. Y arrastre rancio: pointerdown, releaseAll, pointermove al otro extremo -> |steer| < 0,05, o el manillar da un tiron a tope al volver de segundo plano.
- Multitactil, cuatro gestos: (a) dos punteros, uno en #p-gas y otro en #p-right -> throttle 1 y steer > 0,05 en el mismo fotograma; (b) dos dedos sobre el MISMO gas, levantar uno -> throttle sigue en 1; (c) pulsar izquierda, pulsar derecha, soltar derecha -> steer < -0,05 (medido 0,000 hoy: es el defecto vivo); (d) gas pulsado, releaseAll, pulsar con OTRO pointerId -> throttle 1 y sin la clase .press colgada, o el gas queda muerto el resto de la partida.
- Mandos en pausa: __rr.ui.show('pause') y comprobar que los cinco tienen opacity 0 y pointerEvents none. Medido hoy: opacity 1 y pointerEvents auto, con el HUD encendido y la capa de pausa comiendose los toques.
- Sensibilidad: para 0,4 / 1 / 2, los botones tienen que llegar a |steer| > 0,995 en los tres casos y el tiempo hasta el tope tiene que decrecer (medido 783 / 317 / 167 ms). Y tiltFullDeg() recortado: <= 34 con sens 0,4 y >= 10 con sens 2. Lo que NO puede pasar es que el tope sea inalcanzable por debajo de 1 ni que el deslizador sea inerte por encima.
- Respaldo sin sensor, que es la reproduccion de 'pedi giroscopio y tengo otra cosa': `page.addInitScript(() => { delete window.DeviceOrientationEvent; })`, poner state.scheme = 'tilt' y entrar a conducir. wantedScheme() sigue siendo 'tilt', activeScheme() es 'buttons' (no 'touch'), gyroStatus() es 'unsupported', #pedals lleva la clase btns, #p-left es visible, y #scheme-hint tiene texto traducido (no empieza por 'sch.', que es lo que devuelve t() cuando falta una clave).
- Portatil con pantalla tactil, que Playwright no puede emular con un perfil (hasTouch fuerza pointer:coarse y hover:none): se falsea matchMedia en addInitScript devolviendo coarse=false y hover=true, con maxTouchPoints 10, en un viewport de 800x1200. html.rot NO puesto, transform exactamente 'matrix(1, 0, 0, 1, 0, 0)' (identidad, que confirma que no se escribio none y que el bloque contenedor de los hijos fixed no cambia con la orientacion), y defaultScheme() 'touch'.
- Muescas remapeadas sin muesca real: `page.addStyleTag({ content:'html.rot{--sa-l:47px;--sa-r:34px;--sa-t:44px;--sa-b:21px}' })` y leer los estilos calculados. #hudtop paddingLeft 59px (12+47, el borde IZQUIERDO del juego, que es el superior fisico donde esta la camara), paddingRight 46px, top 53px; #speedo bottom 31px; #s-settings paddingLeft 63px y paddingRight 50px. Si el CSS volviera a leer env() directo o se quedara sin margen lateral, los tres primeros no se mueven de 12/12/9.
- Camara: anular game.crash para que la medida sea determinista (un choque congela setRider y se mediria un fotograma de sacudida), poner shake 1.5 y avanzar 200 fotogramas. Pico de desviacion del cabeceo respecto de PITCH0 por debajo de 6 grados (medido hoy: 18,28). Y con la direccion a fondo, |camera.position.x| < 0,35 m, que es la comprobacion de que la moto no se va del encuadre al tumbar; en recto, < 0,05. Campo horizontal < 100 grados y vertical < 70: nada de ojo de pez.
- Relayout idempotente: instrumentar el setter de stage.style.transform y llamar veinte veces a layoutStage() sin cambiar el tamano. Cero escrituras. Sin la guarda, cada evento de visualViewport (barra de direcciones, teclado, pinza) reescribe width, height y transform sobre una capa compuesta a pantalla completa.
- Al terminar, reconstruir los tres artefactos y comprobar el empaquetado, porque esto se compila a un IIFE clasico y se abre tambien desde file://: `node build.mjs && node build.mjs --cdn && node build.mjs --single`, y despues grep de 'id="stage"', 'html.rot', 'pedals:not(.ride)' y 'scheme-hint' en index.html. Y el recuento de las once claves nuevas de i18n: cada una tiene que aparecer cuatro veces, porque una clave que falte en un idioma no lanza ningun error, t() devuelve la clave cruda y el jugador ve 'sch.stale' en su pantalla de ajustes.
- Ultima pasada con los guiones que ya hay en el repo, para no romper nada de lo que arreglo: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/frame-test.mjs --shots` (encuadre y ajuste de mallas al colisionador) y `node tools/probe_mobile.mjs`. Las capturas de --shots se miran DESPUES de que los numeros pasen, nunca para decidir.

### risks

- El arbol se esta moviendo bajo los pies: src/controls.js y src/main.js se reescribieron a las 08:16, DESPUES de que las seis investigaciones tomaran sus medidas, y por eso la mayoria de sus hallazgos ya no existen. Antes de aplicar cualquier paso hay que volver a comprobar el md5 de los ficheros que toca (hoy controls.js 607ebe1dd0e4a5194c244a8d4b8577c8, main.js 41e25a697d639eb3f33664fa1b3d44d6, template.html a258d38d06846c8b303ab7fa6419b857, ui.js 0be4efa199d7530a981f92df0c59ae9b, world.js 114d5576c0b3cf28d4108aeb59e9c487, i18n.js 0bc8f1b6d98b8e5283fa4fdfa94248e5): si han cambiado, los bloques -/+ no van a encajar y hay que releer.
- El paso 3 cambia el esquema por defecto en un movil sin sensor de 'tilt' (que degradaba a arrastre) a 'buttons', y esa decision se toma en cada arranque porque state.scheme sigue en null. Un jugador que ya venia con 'tilt' guardado a mano no cambia de esquema, pero uno que nunca toco el selector si: en un movil sin giroscopio pasa a ver dos flechas donde antes no veia nada. Es el arreglo, pero es un cambio visible que conviene anunciar en la nota de version.
- El respaldo a 'buttons' hace aparecer las dos flechas de giro en la esquina inferior izquierda, que con el esquema de arrastre es justo donde el pulgar apoya. No hay conflicto porque los dos esquemas son exclusivos, pero si alguien anade mas adelante un arrastre de respaldo simultaneo, las flechas le van a robar el inicio del desliz.
- game.js:170 limita el manillar a 5,5 topes/s (182 ms hasta el tope). BTN_RATE escalado por la sensibilidad llega a 6,4 topes/s con sens 2, asi que por encima de sens 1,72 el ajuste de sensibilidad en botones SATURA y el jugador mueve el deslizador sin notar nada. No lo cambio porque ese limite es la inercia deliberada del manillar y tocarlo altera la conduccion entera; queda documentado para no perder una tarde buscandolo.
- La sensibilidad sigue siendo global y design/spec.md:121 la quiere por esquema. Es una desviacion consciente de la especificacion: convertir state.sens en objeto exige migrar los guardados, y un NaN ahi deja el manillar muerto sin ningun sintoma visible. Si se implementa despues, la migracion tiene que llevar revision de ajustes, no solo un valor por defecto.
- El paso 4 hace que enableGyro() tarde hasta 1500 ms en resolver cuando no hay sensor. Se llama sin await desde el gesto de la pantalla de carga, asi que el arranque no se bloquea, pero el aviso al jugador aparece hasta un segundo y medio despues de entrar al menu. Es el precio de no degradar en silencio; si molesta, se baja a 1000 ms sin perder correccion en un aparato real (primer evento por debajo de 300 ms).
- requestPermission de iOS tiene que ser la PRIMERA instruccion del manejador del gesto. Hoy lo es porque enableGyro llama a requestPermission de forma sincrona antes de su primer await, y ui.js:78 la invoca desde un pointerdown. El dia que alguien meta un `await audio.unlock()` por delante en onBootDone, iOS niega el permiso con NotAllowedError y esto no se puede reproducir en headless: el CDP no emula requestPermission. Es el unico punto del plan que la prueba no cubre.
- La prueba del paso 13 despacha eventos 'deviceorientation' sinteticos, que ejercitan onOrient pero NO el camino del permiso ni el arranque real del sensor. Cubre el signo, la invariancia, el cero, el sensor dormido y el movil tumbado; no cubre que iOS pida el permiso, que Android lo entregue en un iframe con allow="gyroscope", ni la primera rafaga sucia al volver de segundo plano. Esos cuatro casos siguen necesitando un telefono y hay que probarlos a mano antes de publicar.
- Bajar la sacudida de 12 a 2,5 grados por unidad hace el choque notablemente menos violento. Es lo correcto (18 grados era la camara mirando al suelo), pero si alguien pedia mas impacto, el sitio es addShake(1.5) en game.js:305 o SHAKE_DEG, nunca el factor de la sacudida: subirlo vuelve a mandar la camara al asfalto.
- El paso 9 anade un cuarto boton a .btnstack de la pausa. Solo aparece cuando se conduce con giroscopio, pero en un escenario de 390 px de alto (movil pequeno girado) la pila puede quedar apretada: conviene mirar una captura en 568x320 antes de dar el paso por bueno.
- template.html es un fichero que otro agente puede estar tocando (design/mobile-research.* aparecen modificados en git status). Los pasos 8 y 9 son los mas grandes ahi: si hay conflicto, aplicar primero el 8 (correccion de defectos) y dejar el 9 (reordenacion de interfaz) para el final.
- La asercion del buffer del paso 1 (`buf[0] === round(844 * min(2, dpr))`) da por hecha la calidad 'high', que es la que fija setQuality con cap 2 y escala 1. Si la prueba se corriera con otra calidad, el numero cambia y falla por el motivo equivocado: por eso ride() fija state.quality = 'high' antes de arrancar.
