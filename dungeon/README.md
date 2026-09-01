# El plano — mansión en primera persona

`elplano.html`, un solo archivo de 0,94 MB. Sale del plano dibujado a mano
(`plano-original.jpg`), **girado 90°**, en tres niveles conectados por
escaleras que suben y bajan de verdad, con el look de mansión de las
capturas: papel damasco rojo, zócalo crema, parquet de nogal y arañas.

## La escala es el truco

El pedido era sentirse chico y que las habitaciones se hagan enormes, así que
todo sale de estos tres números:

| | |
|---|---|
| Ojo del jugador | **0,55 m** (agachado 0,34) |
| Alto de pared | **7 m** |
| Ancho de pasillo | **2,2 m** |

Un pasillo de 2,2 m visto desde 55 cm de altura se lee como una nave de
catedral, y el farol no llega arriba: las paredes se pierden en negro. Eso es
lo que agranda el lugar, más que el tamaño real del mapa.

**FOV 100**, que abre a 106 al correr.

## Las paredes

No son una textura sola: son bandas, como en las fotos.

| | |
|---|---|
| Zócalo crema | 0 → 1,05 m |
| Moldura de madera | 1,05 → 1,18 m |
| Papel damasco rojo | 1,18 → 6,55 m |
| Cornisa | 6,55 → 7 m |

La moldura va **baja** a propósito: desde 55 cm de altura, un zócalo a la
altura real (2,5 m) se come toda la vista y no se ve el papel. Con la moldura
a 1,05 el rojo domina, que es como se ve en las capturas.

Las arañas colgando del techo son la única luz fija, y roperos y cómodas
contra las paredes llenan las salas — de paso dan una referencia de tamaño,
que es de lo que se trata todo esto.

## Deslizamiento

`ESPACIO` / `X`, o el botón **DESLIZAR** en táctil. Dura 0,85 s y es corto y
violento a propósito:

- la dirección **se fija al arrancar**: no se dobla en el aire
- la cámara cae de golpe a **19 cm** y vuelve suave
- **rola 0,16 rad** hacia un lado, con temblor encima
- el **FOV pega un tirón de 22°** (100 → 122) y decae
- la velocidad arranca en 8,2 m/s y se apaga sola

Se engancha en el `keydown` y no leyendo la tecla cada frame: un toque corto
puede caer entero entre dos frames y perderse, justo cuando más rápido va
todo.

## Los agujeros en las paredes

Unos 20 por nivel: huecos rectangulares de **62 cm** al pie de algunas
paredes, que comunican dos espacios de verdad (sólo se abren donde hay
espacio abierto a los dos lados).

**De pie no pasás** — te frena a 1,36 m. Agachado o deslizando, cruzás. Son
atajos para cuando estás escapando, no puertas.

## Controles

- **WASD / flechas** moverse · **Shift** correr · **C** agacharse
- **Espacio / X** deslizarse
- **Mouse** mirar (click para tomar el puntero)
- **Táctil**: joystick abajo a la izquierda, botón **DESLIZAR** a la derecha,
  el resto de la pantalla para mirar

**Carrera automática:** el joystick no tiene botón de correr. Pasado el **70%**
del recorrido y empujando hacia arriba, arranca a correr solo; más abajo, la
velocidad es proporcional a cuánto lo empujaste.

**Inclinación al moverse:** la cámara rola hacia el lado al que te desplazás y
un poco más al girar, como si el cuerpo acompañara, más un balanceo suave al
caminar que se acentúa corriendo.

## El mapa

Tres niveles de 31×31 celdas:

| Nivel | | Salas grandes |
|---|---|---|
| **Nivel alto** | +8,2 m | una nave de 13×13 y dos galerías |
| **Planta baja** | 0 | patio de 8×8, sala de 7×7 y una de 9×9 |
| **Cisternas** | −8,2 m | cuatro cisternas cuadradas |

El laberinto **se genera** en vez de escribirse a mano: el plano dibujado es
justamente un laberinto de pasillos angostos, y un backtracker da eso sin
riesgo de dejar un cuarto sin salida. Encima se recortan las salas grandes
—que es lo que pediste, no seguir el plano al pie de la letra— y se rompen
unas 30 paredes sueltas para que tenga vueltas: un laberinto perfecto es un
árbol y te obliga a desandar todo el tiempo.

Después la grilla entera se gira 90°.

## Las escaleras

Cuatro: **dos suben** a la planta alta y **dos bajan** a las cisternas.

Lo que se ve son peldaños de verdad (una rampa lisa no se lee como escalera),
pero el movimiento usa una función de altura suave, así que no hace falta
física ni te traba en un escalón.

El detalle que costó: las celdas de la rampa están **excluidas del piso plano
de cada nivel**. Los dos niveles ocupan el mismo XZ, así que si la rampa y el
piso son ambos candidatos, el piso plano gana siempre por estar más cerca de
tu altura actual — y la escalera no sube nunca.

## Rendimiento

- Paredes, pisos y techos de cada nivel se juntan en **tiras horizontales** y
  se suben como una sola malla, no como mil cajas.
- Las UV se reproyectan desde la posición de mundo: las cajas traen UV 0..1
  por cara, así que un tramo largo de pared estiraría la textura.
- Sólo se dibuja el nivel donde estás y el de al lado. Son tres laberintos
  enteros y el farol proyecta sombra sobre todo lo visible.

## Archivos

```
src/map.js      la grilla, las escaleras, colisión y altura de superficie
src/main.js     motor, jugador, controles, cámara
src/build.py    bundlea con esbuild y mete las texturas como data URLs
src/shell.html  HUD y joystick
texturas/       papel damasco, zócalo crema y parquet de nogal
plano-original.jpg   el dibujo del que salió
```

### Reconstruir

```bash
cd /home/user/lemi-game/dungeon && python3 build.py salida.html
```

## Debug

```js
window.__DUNGEON   // posición, altura, nivel, si corre, roll y fov
```
