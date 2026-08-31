# Plan: Redline Rider en movil

## Resumen

Confirmo las dos tesis matematicas y corrijo la premisa de partida de casi todas las investigaciones: el arbol de trabajo ya NO es el que describen. `src/controls.js` y `src/main.js` se reescribieron a las 08:16 y ya traen aplicado lo gordo (el signo de gx, `stageW` cacheado, `held` como conjunto, `drag` a nivel de modulo, `releaseAll` vaciando los mandos, el vigilante de sensor dormido, la sensibilidad en la unidad correcta de cada esquema, y `main.js` sin persistir el esquema deducido). Medido en Chromium headless: la sensibilidad de botones ya llega SIEMPRE al tope (783/317/167 ms para 0,4/1/2), el gas ya no queda muerto tras `releaseAll`, el arrastre ya no da el tiron, y el giroscopio ya da el signo bueno en las dos posturas.

TESIS DEL ALABEO: CORRECTA, y el codigo en disco (controls.js:165-166) ya la implementa bien. Verificado con 300.000 triples aleatorios: `(cos B*sin G, -sin B, -cos B*cos G)` es exactamente `R^T*(0,0,-1)` con `R = Rz(a)Rx(b)Ry(g)`, error maximo 0,00e+0; con el signo negado el error llega a 2,0. `roll = atan2(gx, -gy)` devuelve el alabeo fisico EXACTO a cualquier cabeceo (probado de 30 a 90 grados, error nulo), y el alabeo es invariante frente a la rotacion por CSS porque rotar el contenido gira alrededor del MISMO eje sobre el que se mide, asi que solo anade una constante que borra el cero. De punta a punta con eventos sinteticos: -20 grados de alabeo horario dan steer -0,854 en vertical y -0,841 en horizontal; +20 dan +0,849 y +0,852. No hay nada que cambiar aqui.

MATEMATICA DE mapPointer: CORRECTA. Medido en Chromium con un viewport de 390x844: `getComputedStyle(stage).transform` es `matrix(0, 1, -1, 0, 390, 0)`, o sea local (x,y) -> pantalla (390-y, x); `DOMMatrixReadOnly(...).inverse()` da (0,-1,1,0,0,390), que componente por componente ES `x = clientY, y = W - clientX`, exactamente controls.js:119. El `getBoundingClientRect()` del escenario da {0,0,390,844}: encaje perfecto. El orden contrario (`rotate(90deg) translateX(W)`) da e=0 en vez de e=W, o sea la caja fuera de pantalla. Y `canvas.clientWidth/clientHeight` da 844x390 (caja de maquetacion) frente a 390x844 del rect transformado, asi que el renderer mide bien. No hay nada que cambiar aqui tampoco.

Lo que SIGUE ROTO, todo medido: (1) el respaldo del giroscopio cae a ARRASTRE, que deja al jugador sin nada visible que tocar — es su queja literal; (2) `defaultScheme()` usa `'ontouchstart' in window` mientras la rotacion usa `pointer:coarse`, asi que un portatil tactil gira el juego 90 grados Y elige giroscopio; (3) soltar la flecha derecha con la izquierda pulsada deja el giro en 0,000 (medido) en vez de volver a la izquierda; (4) los cinco mandos siguen visibles y clicables en PAUSA (opacity 1, pointerEvents auto); (5) `#hudtop` y `.screen` no llevan margen de seguridad horizontal, y con el escenario girado el borde IZQUIERDO del juego ES la muesca fisica, justo donde estan la distancia y la puntuacion; (6) la sacudida de camara llega a 18,28 grados de cabeceo tras un choque (medido, pico sobre 200 fotogramas) y la camara se queda mirando al suelo; (7) `enableGyro()` resuelve true con solo el permiso, y quien decide si hay sensor es un `setTimeout(1600)` que solo existe en la pantalla de ajustes; (8) `gyroStatus()` dice 'denied' a quien nunca ha denegado nada, y no hay ni una cadena traducida para los cinco estados, asi que la interfaz solo sabe decir "no hay giroscopio"; (9) el indicador de inclinacion divide por un 22 clavado a mano y con sens 2 el punto se queda a mitad de recorrido; (10) no hay `-webkit-touch-callout` ni guarda global de `contextmenu`, y una pulsacion larga sobre el lienzo (que ES la superficie de arrastre) saca el menu de Android; (11) los comentarios de controls.js:106-108 y template.html:14-17 dicen que el borde superior fisico pasa a ser el DERECHO del juego, y es el IZQUIERDO — el CSS esta bien, el comentario invita a "arreglarlo" al reves; (12) `layoutStage()` reescribe el transform en cada evento de `visualViewport`, sin guarda de igualdad.

Y lo que NO hay que tocar, contra lo que piden las investigaciones: la geometria de los mandos ya no tiene ni un solape (medido par a par en 390x844, 844x390 y 1180x820: cero), el velocimetro ya esta abajo al centro, y las unidades ya son `vmin`.

## Pasos

### 1. src/i18n.js

**Que:** Anadir las cadenas de estado del control en los cuatro idiomas. Va PRIMERO porque t() devuelve la clave cruda cuando falta (i18n.js:185), asi que sin esto el paso 11 escribe literalmente 'sch.stale' en la pantalla del jugador.

**Por que:** El jugador dice "interfaz vertical cuando quiero giroscopio para jugar": pidio inclinacion, el juego se la nego y no le dijo por que. Sin estas cadenas no hay forma de contarselo, y los pasos 4, 6 y 11 dependen de que existan. Se anaden en los cuatro idiomas de golpe porque t() cae a ingles cuando falta una clave, y una mezcla de idiomas en la misma pantalla es peor que un texto ausente.

```
En el bloque es, sustituir la linea:

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
    'sch.fallback':'direction aux boutons',
```

### 2. src/controls.js

**Que:** Dos banderas independientes para las flechas de giro, en lugar de un solo signo. Medido: pulsar izquierda, pulsar derecha y soltar derecha deja el giro en 0,000 con la izquierda todavia pulsada.

**Por que:** Es el unico defecto de multitactil que el probe sigue cazando, y aparece en el gesto mas normal del esquema de botones: cruzar de una flecha a la otra sin levantar. Derivar el estado de dos banderas en vez de latir un signo hace el fallo estructuralmente imposible, y ademas deja el paso 3 (respaldo a botones) apoyado en un mando que funciona: no tiene sentido enviar al jugador a las flechas si las flechas se atascan.

```
Sustituir la linea 46:

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
+  btnL = btnR = false;
```

### 3. src/controls.js

**Que:** Un unico test de aparato para todo el modulo, y respaldo a BOTONES en vez de a arrastre. Hoy hay dos tests que tienen que coincidir y no coinciden: coarsePointer() decide si se gira la pantalla y defaultScheme() decide el esquema, con criterios distintos.

**Por que:** Resuelve dos quejas de una vez. "Interfaz vertical cuando quiero giroscopio": el respaldo silencioso al arrastre es exactamente eso, y mandarlo a botones lo hace visible sin ningun cartel. "Que este girado 90 grados... sino que ya este rotado": la rotacion se queda, pero solo en aparatos que de verdad se sujetan con la mano, porque hoy un portatil tactil cumple el test por la rama de maxTouchPoints. Un solo test exportado hace imposible que las dos decisiones vuelvan a divergir.

```
Sustituir las lineas 70-73:

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
}
```

### 4. src/controls.js

**Que:** enableGyro() resuelve solo cuando ha llegado una lectura de VERDAD, gyroStatus() distingue 'aun no pedido' de 'denegado', y se exporta el angulo de tope efectivo con su recorte.

**Por que:** Cierra el lazo de la queja "pedi giroscopio y tengo otra cosa": ahora hay un instante determinista en el que se sabe si hay sensor, y un estado con nombre para contarlo. Sin la espera, la decision de degradar se tomaba en un setTimeout de la pantalla de ajustes que main.js ni siquiera ejecuta, asi que en el arranque normal nadie se enteraba nunca. Y tiltFullDeg centraliza el angulo de tope para que el indicador del paso 10 y la fisica no puedan discrepar.

```
Sustituir las lineas 30-37:

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
+    const full = tiltFullDeg();
```

### 5. src/controls.js

**Que:** Guarda de igualdad en layoutStage, caja del escenario cacheada (fuera reflows por evento de puntero), guarda global de menu contextual y gestos, y correccion del comentario que miente sobre las muescas.

**Por que:** Tres cosas que no cambian el comportamiento visible pero quitan tres landmines: el bucle de reflows que dispara visualViewport en cuanto el jugador roza la barra de direcciones, el reflow sincrono por evento de puntero (que en un arrastre a 120 Hz es medible), y el menu contextual saliendo sobre la superficie de direccion. El comentario corregido es igual de importante: es el que haria que el siguiente que toque el HUD invierta un remapeo de muescas que esta bien, y lo he verificado por matriz.

```
Anadir junto a stageW, tras la linea 55:

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
  document.addEventListener('dblclick', e => e.preventDefault());
```

### 6. src/main.js

**Que:** Actuar sobre el resultado de enableGyro (avisar y repintar), usar wantedScheme, pasar la medida del escenario al renderer y soltar los mandos al ocultar la pagina.

**Por que:** Sin reaccionar al resultado, el respaldo del paso 3 y el estado del paso 4 no llegan nunca al jugador en el arranque normal: solo se evaluaban dentro de la pantalla de ajustes. Pasar la medida a world.resize elimina el `clientWidth || innerWidth` como fuente de verdad, que es el camino por el que el renderer puede arrancar con la relacion de aspecto invertida y dejar "la moto mal ubicada" en el primer fotograma.

```
Sustituir el bloque de onBootDone (lineas 59-67):

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
+  addEventListener('pagehide', () => { controls.releaseAll(); save(); });
```

### 7. src/world.js

**Que:** Bajar la amplitud de la sacudida de camara y aceptar medidas explicitas en resize(), con cache y sin getBoundingClientRect.

**Por que:** 18,28 grados de cabeceo tras un choque es una camara que apunta al suelo, y es lo que hace que el juego se sienta "mal ubicado" precisamente en el momento en que el jugador esta mirando. Y resize con medida explicita cierra el camino por el que el renderer puede quedarse con la relacion de aspecto del viewport (390x844) en vez de la del escenario (844x390), que es la version grave y silenciosa del mismo sintoma.

```
Sustituir la linea 538:

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
+    this.resize();
```

### 8. template.html

**Que:** Margen de seguridad en los cuatro lados del HUD y de las pantallas, mandos ocultos cuando no se conduce, guardas tactiles que faltan, y correccion del comentario del remapeo de muescas.

**Por que:** El HUD se apartaba de la muesca por el lado equivocado, y con el escenario girado eso significa que la distancia y la puntuacion caen justo debajo de la camara frontal: parte de "lo mal ubicada" es esto. Los mandos visibles en pausa son la otra mitad: cinco botones encendidos que no responden se leen como un juego roto. Y las guardas tactiles son las que impiden que una pulsacion larga sobre la superficie de direccion abra el menu del sistema.

```
Sustituir el comentario de las lineas 14-17 (el bloque html.rot de las lineas 18-21 NO se toca, esta bien):

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
+  .ctlwrap{display:flex;align-items:center;gap:9px}
```

### 9. template.html

**Que:** Reordenar los ajustes para que el grupo de control vaya primero y se explique, con linea de estado, filas condicionales y numero de sensibilidad; y CENTRAR tambien en la pausa.

**Por que:** "Interfaz vertical cuando quiero giroscopio" es, en la practica, que el selector de control estaba enterrado entre dos deslizadores de audio y que la fila del giroscopio se veia con cualquier esquema sin hacer nada. Con el grupo arriba, una frase que dice el estado real y las filas que solo salen cuando sirven, el jugador puede ver y arreglar su propio problema. CENTRAR en la pausa es el remate: el momento en que uno nota el centro desviado es a 200 km/h.

```
Sustituir el bloque de filas de ajustes (lineas 278-297) por:

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
     </div>
```

### 10. src/ui.js

**Que:** Clase ride en los mandos, repintado al cambiar de pantalla, indicador escalado por el angulo de tope real y estados del indicador.

**Por que:** El indicador es la unica prueba visible de que el signo del giroscopio es el bueno y de que el permiso se concedio; con el 22 clavado mentia en cuanto se tocaba la sensibilidad. Y la clase ride es la que apaga los cinco mandos en pausa, que es la mitad visible de "los botones de avanzar y frenar visibles": no molestan mientras se conduce, molestan cuando no se conduce.

```
Sustituir show() (lineas 42-49):

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
  }
```

### 11. src/ui.js

**Que:** Linea de estado del control, filas condicionales, numero de sensibilidad y selector de esquema que dice POR QUE no hay giroscopio en vez de degradar en silencio.

**Por que:** Cierra la queja del giroscopio por el lado del jugador: ya no hay ningun camino por el que el juego cambie de mando sin decirlo. La frase de estado traduce los seis estados de gyroStatus, distingue "aun no te lo he pedido" de "lo denegaste", y cuando degrada dice a que degrada. Y quitar el setTimeout(1600) elimina la unica deteccion de sensor que existia, que ademas solo corria si el jugador entraba en ajustes.

```
Sustituir el bloque del selector de esquema y el boton de centrar (lineas 246-269):

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
+    this.paintSens();
```

### 12. package.json

**Que:** Declarar playwright como dependencia de desarrollo y un guion para la prueba de mandos. Hoy playwright se resuelve como enlace global (npm ls lo marca extraneous), asi que funciona por casualidad en esta maquina y en ninguna otra.

**Por que:** El plan de pruebas entero es un guion de Playwright. Sin la dependencia declarada, la prueba pasa aqui y falla en la siguiente maquina por el motor de pruebas y no por el juego, que es la peor forma de perder una tarde.

```
Sustituir las dos ultimas lineas:

-  "devDependencies": { "esbuild": "^0.25.0" }
-}
+  "devDependencies": { "esbuild": "^0.25.0", "playwright": "^1.56.0" }
+}

Y anadir en "scripts", tras la linea de "dev":

    "test:controls": "node build.mjs && node tools/controls.test.mjs",
```

### 13. tools/controls.test.mjs

**Que:** Prueba de regresion completa de mandos y presentacion, sin telefono: viewport vertical, eventos de orientacion sinteticos y medidas sobre el DOM y el renderer. Falla contra el codigo de hoy y pasa con los pasos 1-11 aplicados.

**Por que:** Todo se comprueba sin telefono: viewport vertical, eventos de orientacion despachados por el mismo camino que un movil real, y medidas sobre la matriz calculada, el DOM y el renderer. Las dos aserciones que valen mas son las que fijan acoplamientos que hoy son de palabra: `stage.getBoundingClientRect()` estrictamente igual a {0,0,390,844} (si el transform-origin o el orden de la lista cambian, esto se va y no hay forma de que pase por casualidad) y `mapPointer == e.offsetX/offsetY` (la inversa la calcula el navegador, asi que si alguien pone rotate(-90deg) la prueba falla en vez de dejar el dedo del reves en silencio).

```
/* Regresion de mandos y presentacion. Sin telefono: viewport vertical, eventos de orientacion
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
process.exit(fails ? 1 : 0);
```

### 14. index.html

**Que:** Reconstruir los tres artefactos y comprobar que los marcadores criticos y las traducciones sobrevivieron al empaquetado.

**Por que:** El juego se compila a un IIFE clasico y se abre tambien desde file://, asi que hay cosas que funcionan en modulos y no empaquetadas. Y una clave de i18n que falte en un idioma no lanza ningun error: solo se ve mirando la pantalla en ese idioma, que es lo que nadie hace.

```
cd /home/user/General-Assets-Games/redline-rider
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

node tools/controls.test.mjs
```

## Constantes

- `gx del giroscopio` = +cos(beta)·sin(gamma)  (ya correcto en src/controls.js:165) — Verificado con 300.000 triples aleatorios contra abajo_aparato = R^T·(0,0,-1) = -(tercera fila de R) con R = Rz(a)Rx(b)Ry(g): error maximo 0,00e+0. Con el signo negado el error llega a 2,0, que es un espejo en X y niega el alabeo en TODA postura. Una de las investigaciones lo reportaba como bug vivo: ya no lo es, el arbol de trabajo lo tiene bien. No tocar.
- `inversa de mapPointer` = x = clientY, y = W - clientX  (ya correcto en src/controls.js:119) — Con transform-origin 0 0 y translateX(W) rotate(90deg), Chromium calcula matrix(0, 1, -1, 0, 390, 0) sobre un viewport de 390x844, o sea local (x,y) -> pantalla (W - y, x). Su inversa, leida del propio DOMMatrix, es (0,-1,1,0,0,390): componente por componente ES esa formula. El getBoundingClientRect del escenario da {0,0,390,844}. No tocar; blindar con la prueba del paso 13.
- `respaldo del giroscopio` = 'buttons' (hoy 'touch') — Lo pide design/spec.md ('on-screen buttons, recommended default on touch') y sobre todo lo pide el sintoma: con arrastre el jugador se queda mirando una pantalla sin nada que tocar, que es su queja textual. Con botones las dos flechas aparecen en el mismo instante del fallo, porque paintPedals cuelga de activeScheme.
- `test de rotacion / test de esquema` = isCoarse() = pointer:coarse  /  isHandheld() = coarse && !hover:hover — En un portatil con pantalla tactil (maxTouchPoints 10, pointer:fine, hover:hover) los dos tests actuales dan falso positivo por la rama de maxTouchPoints, y el juego se presenta de lado en un ordenador y encima elige giroscopio. maxTouchPoints solo entra si el navegador no tiene consultas de puntero. El hover solo interviene en el esquema: si un WebView antiguo miente con hover, el peor caso es un movil que arranca con arrastre (un toque para arreglarlo) en vez de un movil sin girar.
- `GYRO_WAIT_MS` = 1500 ms — Espera a la PRIMERA lectura tras conceder el permiso. Un sensor que va a entregar datos entrega el primer evento por debajo de 300 ms, asi que hay cinco veces de margen, y es lo que fija design/spec.md para el respaldo automatico. Conceder el permiso no es tener sensor: en un iframe sin allow="gyroscope" el evento no llega jamas y no hay API para preguntarlo.
- `GYRO_STALE_MS` = 500 ms (ya en el codigo) — Silencio que convierte el sensor en dormido. El sensor mas lento que se ve reporta a 10 Hz, o sea que 500 ms son cinco lecturas perdidas: no hay falso positivo, y medio segundo de manillar centrandose es sobrevivible a 200 km/h. Sin este vigilante, gyro.active subia y no habia quien lo bajase: medido, steer 0,49 congelado cinco segundos despues del ultimo evento.
- `TILT_FULL_MIN / TILT_FULL_MAX` = 10 / 34 grados — Recorte del angulo de tope, que es TILT_FULL/sens. Con el rango de sensibilidad 0,4-2,0 de la especificacion, sin recorte el extremo bajo pediria 55 grados de alabeo, que es inalcanzable sin perder de vista la pantalla; por encima de 34 grados hay que mover los antebrazos en vez de las munecas. Y por debajo de 10 la zona muerta de 1,6 grados se come una quinta parte del recorrido y el temblor de mano (~0,5 grados) pasa a valer un 6% de la direccion.
- `rango del deslizador de sensibilidad` = 40-200 (era 50-200) — design/spec.md:121 dice 0,4-2,0. El minimo de 50 no llegaba abajo, y con la sensibilidad ya aplicada en la unidad correcta de cada esquema (angulo / ganancia de pixeles / velocidad de barrido) el extremo bajo es util y no destructivo: medido, con 0,4 los botones siguen llegando al tope, en 783 ms.
- `amplitud de la sacudida` = this.shake * 2.5 grados por unidad (era * 12) — Medido sobre 200 fotogramas con el addShake(1.5) del choque: pico de 18,28 grados de cabeceo, 10,67 de guinada y 17,58 de balanceo, o sea la camara mirando al asfalto justo cuando el jugador quiere ver que ha pasado. Con 2,5 el pico baja a unos 4,1 grados, que se lee como un golpe seco. Los 0,15-0,6 grados de la marcha normal (SHAKE_DEG) se quedan como estan: coinciden con design/spec.md:103 y el pico medido sin choque es de 2,04 grados.
- `BTN_RATE` = 3,2 topes/s escalado por la sensibilidad (ya en el codigo) — Medido: 783 / 317 / 167 ms hasta el tope para sensibilidades 0,4 / 1 / 2, y el tope se alcanza siempre. Es lo unico regulable en un mando digital: multiplicar la salida (que ya esta recortada a +-1) solo impedia llegar al tope por debajo de 1 y no hacia nada por encima. Ojo al techo: game.js:170 limita el manillar a 5,5 topes/s (182 ms), asi que por encima de sens 1,7 el ajuste satura.
- `transform en horizontal` = rotate(0deg), nunca none — Identidad, pero un transform distinto de none es lo que convierte al escenario en bloque contenedor de sus descendientes position:fixed. Con none, esos hijos medirian el viewport en horizontal y el escenario en vertical, y el CSS se comportaria distinto segun la orientacion por un motivo que no tiene nada que ver con girar. Una de las investigaciones proponia none: descartado.
- `remapeo de muescas con html.rot` = --sa-t=inset-right, --sa-r=inset-bottom, --sa-b=inset-left, --sa-l=inset-top — Se deriva de la matriz medida: local +x va hacia ABAJO en la pantalla y local +y hacia la IZQUIERDA, luego el borde superior fisico es el borde IZQUIERDO del juego y el derecho fisico es el de ARRIBA. Los cuatro nombres rotan un paso. El CSS ya lo tiene bien; lo que estaba mal era el comentario (decia DERECHO), y lo que falta es que el HUD y las pantallas lean tambien --sa-l y --sa-r, porque hoy no tienen margen lateral y la muesca cae exactamente sobre la distancia.
- `medida del renderer` = clientWidth/clientHeight o los numeros de layoutStage; jamas getBoundingClientRect — Medido: con el escenario girado, canvas.clientWidth/clientHeight da 844x390 (caja de maquetacion, sin transformar) y getBoundingClientRect da 390x844 (caja ya transformada). Con el segundo, camera.aspect sale invertido y el resultado es la moto descentrada y el horizonte torcido. Y setSize(w, h, false) hay que mantenerlo: el CSS ya tiene el lienzo al 100% del escenario.
- `una sola rotacion, siempre rotate(90deg)` = sin stageSpin ni rotate(-90deg) — Una investigacion proponia que el giroscopio eligiera el sentido segun a que lado gire el jugador el telefono. Descartado: haria que la presentacion dependiera de una lectura viva, con lo que la imagen puede voltear 180 grados en mitad de una carrera por una lectura suelta; rompe la matriz unica sobre la que descansan mapPointer y toda la prueba de regresion; y no existe cuando el respaldo es 'buttons', porque ahi no hay sensor del que decidir. El alabeo es invariante frente a la rotacion por CSS, asi que la direccion funciona igual si el jugador sujeta el movil del otro lado: lo unico que ve al reves es la imagen, y girar el telefono al otro lado es el gesto natural.
- `sensibilidad global, no por esquema` = un unico state.sens — design/spec.md:121 la quiere por esquema. Se aplaza a proposito: ahora que cada cadena la aplica en su unidad (angulo / ganancia de pixeles / velocidad de barrido), un unico multiplicador significa lo mismo en los tres ('lo nervioso que va'), mientras que por esquema exige convertir state.sens en objeto, migrar los guardados y aceptar que un NaN ahi deja el manillar muerto sin ningun sintoma. Ninguna de las cinco quejas del jugador es de sensibilidad; lo que si se corrige gratis es el rango (40-200).
- `unidades del HUD` = vmin, no vw/vh ni custom properties — Otra investigacion proponia --vw/--vh escritas por JS. Descartado: con el escenario rotado el lado corto del escenario ES el lado corto fisico (stage.height = innerWidth), asi que vmin ya es correcto en las dos orientaciones con cero JS, mientras que la custom property necesita una escritura por relayout y degrada a nada si layoutStage no llega a correr. El fichero en disco ya usa vmin en los doce sitios.
- `distribucion de los mandos` = la que ya hay (--pad/--sec/--horn/--gap/--edge) — Una investigacion pedia un rediseno completo con --pad-gas/--pad-brake y mover el velocimetro. Ya esta hecho de otra forma y funciona: medido par a par en 390x844, 844x390 y 1180x820 no hay NI UN solape entre los cinco mandos, el velocimetro, la barra de revoluciones y la fila superior. Lo unico que le falta es desaparecer cuando no se conduce.

## Plan de pruebas

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

## Riesgos

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
