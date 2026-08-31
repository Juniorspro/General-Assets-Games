# Helix Jump

Clon de Helix Jump en un solo archivo HTML. Sin dependencias, sin build, sin assets externos:
todo el arte es vectorial dibujado en canvas y el audio está sintetizado con WebAudio.

## Jugar

Abre `index.html` en cualquier navegador (funciona con `file://`, no necesita servidor).

## Controles

| Entrada | Acción |
|---|---|
| Arrastrar (ratón o dedo) | Girar la torre |
| `←` `→` / `A` `D` | Girar la torre |
| Stick izquierdo o D-pad del mando | Girar la torre |
| `Espacio` / `Enter` / toque | Empezar o reintentar |

Las teclas están enlazadas a códigos físicos (`KeyA`, `ArrowLeft`), así que funcionan en
teclados con distribución no latina.

## Reglas

- La pelota cae sola: gira la torre para alinear un hueco debajo de ella.
- Cada nivel que atraviesas es 1 punto. Encadenar varios niveles en una misma caída da
  puntos extra de combo.
- Las plataformas **rojas con filo blanco** son letales: tocarlas termina la partida.
  Ninguna paleta de zona usa rojo, así que el peligro nunca se confunde con una plataforma normal.
- La dificultad sube con la profundidad: huecos más estrechos, más plataformas letales y
  caída más rápida (con velocidad terminal para que siga siendo jugable).
- La paleta cambia cada 8 niveles; el récord se guarda en `localStorage`.

## Estructura

- `index.html` — juego completo (lógica, render y audio).
- `design/assets.csv` — manifiesto de assets: cada elemento visual y sonoro con su técnica
  de producción y la fórmula de estilo que comparte.

Textos de interfaz en `STRINGS` (es / en, se elige por `navigator.language`).
