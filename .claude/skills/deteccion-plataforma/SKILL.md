---
name: deteccion-plataforma
description: >-
  Detección automática de plataforma (PC vs móvil) con adaptación de entrada e
  interfaz sin configuración del usuario. Úsala al portar o crear juegos/apps web
  que deben funcionar tanto con teclado+mouse como con controles táctiles,
  cambiando la UI y las instrucciones automáticamente según el dispositivo activo.
---

# Detección automática de plataforma cruzada

Objetivo: la entrada y la interfaz se adaptan solas por dispositivo, con **cero
configuración del usuario**. Un mismo archivo funciona en PC y en móvil, y hace
*hot-swap* si el usuario cambia de método de entrada en caliente.

## 1. Detección de plataforma

En la carga, decidir la plataforma:

```js
function detectPlatform(){
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const touch  = (navigator.maxTouchPoints || 0) > 0;
  return (touch && coarse) ? 'mobile' : 'pc';
}
```

- Se trata como **MÓVIL** solo si tiene soporte táctil **Y** puntero grueso
  (`navigator.maxTouchPoints > 0` **y** `matchMedia('(pointer: coarse)')`).
- En cualquier otro caso: **PC**.
- Revalidar en `resize`/`orientationchange`.

## 2. Hot-swap (cambio en caliente)

El método de entrada activo manda, no solo el hardware:

- Primer **toque** en una laptop con pantalla táctil → cambia a UI móvil.
- Un **movimiento de mouse** o **pulsación de tecla** → vuelve a UI de PC.

```js
let platform = detectPlatform();
function setPlatform(p){
  if (p === platform) return;
  platform = p;
  document.body.classList.toggle('platform-pc', p === 'pc');
  document.body.classList.toggle('platform-mobile', p === 'mobile');
  refreshInstrucciones(); // repinta textos e íconos de la plataforma activa
}
addEventListener('touchstart', () => setPlatform('mobile'), {passive:true});
addEventListener('mousemove',  () => setPlatform('pc'));
addEventListener('keydown',    () => setPlatform('pc'));
```

La visibilidad de la UI se controla por CSS con las clases del `<body>`:

```css
body.platform-pc    #joystick, body.platform-pc    .touch-btn { display:none !important; }
body.platform-mobile #kbdHint,  body.platform-mobile .pc-only   { display:none !important; }
```

## 3. Modo PC

- **Controles:** teclado + mouse. WASD/flechas para moverse, mouse para mirar/apuntar
  (usar *pointer lock* en primera persona), clic para acciones, `Esc` para pausa.
- **UI:** SOLO instrucciones de PC. Una pista breve de teclado/mouse en la pantalla
  de inicio y una leyenda de teclas compacta en el primer *spawn* que se desvanece a
  los ~5 s.
- **Prohibido:** cero UI táctil en pantalla — sin joystick virtual, sin botones táctiles.

## 4. Modo móvil

- **UI táctil automática:** joystick virtual izquierdo (base ~110 px, pulgar ~45 px,
  devuelve un vector normalizado); botones de acción flotantes a la derecha ≥ 44×44 px
  con íconos claros; arrastrar en la mitad derecha para mirar/apuntar; *haptics* en
  eventos clave.
- Añadir asistencia ligera de puntería y un *toggle* de disparo/interacción automática
  donde se necesite apuntar con precisión.
- **UI:** SOLO instrucciones táctiles (una pista de una línea "arrastra para mirar,
  toca para actuar" que se desvanece).
- **Prohibido:** ninguna referencia al teclado en el texto de la UI móvil. Nunca decir
  "presiona E" en un teléfono; decir "toca".

## 5. Reglas compartidas

- Cada instrucción, cadena de tutorial y etiqueta de botón se escribe **una vez por
  plataforma** en una tabla de cadenas tecleada por plataforma:

  ```js
  const STR = {
    pickup: { pc: 'Presiona E para recoger', mobile: 'Toca para recoger' },
    jump:   { pc: 'Espacio para saltar',     mobile: 'Toca ↑ para saltar' },
  };
  const t = (k) => STR[k][platform];
  ```

- El juego **siempre** muestra la cadena de la plataforma activa (`t('pickup')`).
- Ambos modos deben ser jugables de principio a fin. Probar el bucle completo en un
  visor **móvil** y en **escritorio** antes de darlo por hecho.
