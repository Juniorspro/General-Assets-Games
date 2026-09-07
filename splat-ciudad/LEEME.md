# Un distrito en gaussianas 3D

**187.397 gaussianas anisótropas** sobre 570 × 570 m, en un `.splat` de 5,7 MB,
dibujadas por un rasterizador escrito a mano en WebGL 2. Sin librerías.

## Lo que esto es y lo que no

**Lo que no es: fotogrametría.** Un splat "de verdad" se entrena: cientos de
fotos, COLMAP para sacar las cámaras, y media hora o varias horas de una GPU
con CUDA optimizando millones de gaussianas por descenso de gradiente. **Acá no
hay GPU** —Mesa por software, ya medido en `herramientas/neko/LEEME.md`— así
que entrenar uno no es lento, es imposible.

**Lo que sí es:** todo el resto del asunto, hecho de punta a punta.

- El **formato**: `ciudad.splat` es el `.splat` estándar de 32 bytes por
  gaussiana (posición, escala lineal, RGBA, cuaternión mapeado a bytes). Lo
  abren los visores que ya andan por ahí, no sólo éste.
- La **matemática**: covarianza 3D desde escala y rotación, proyección a la
  elipse en pantalla por el jacobiano de la perspectiva, autovectores de la 2×2
  para los ejes, campana evaluada por fragmento, alfa premultiplicado.
- El **orden**: son translúcidas y no hay test de profundidad, así que el orden
  de dibujo importa y cambia con la cámara. Ordenar 187.000 con `sort()` son
  ~20 ms por cuadro; acá se ordena **por conteo** sobre la profundidad
  cuantizada a 16 bits —lineal, no n log n— y **en un worker**: 5-7 ms sin
  frenar el dibujo.
- Las **gaussianas** salen de la ciudad de `telarana/ciudad.py`: se muestrea la
  superficie proporcional al área, se lee el color de la textura en la UV, se
  cocina la luz del sol y del cielo adentro del color (como hace un splat
  entrenado) y cada gaussiana queda **apoyada sobre la superficie**: dos ejes
  anchos en el plano de la cara y uno finito en la normal, que es la forma que
  toman las gaussianas entrenadas sobre una pared.

## Uso

```sh
python3 -m http.server -d visor 8091          # el visor, leyendo ciudad.splat
python3 hacer-splat.py ../telarana/ciudad-raw.glb visor/ciudad.splat 300000
```

`distrito.html` es lo mismo en **un archivo de 7,6 MB** que se abre con doble
clic: el rasterizador empaquetado con esbuild en un script clásico y las
gaussianas en base64, porque desde `file://` no hay módulos ES ni `fetch`.

**El visor lee cualquier `.splat`.** Si consegués una captura de verdad —Luma,
Polycam, SuperSplat— dejala como `visor/ciudad.splat` y se abre igual.

## Las cuatro que costaron

1. **Los uniforms compartidos necesitan la misma precisión en los dos
   shaders.** El vértice declaraba `precision highp int` y el fragmento sólo la
   de `float`, así que un `uniform int` común no linkeaba:
   *"Uniform `modo` is not linkable between attached shaders"*.
2. **El suelo del `.glb` mide 4000 × 4000 m** y se comía el 90 % de las
   gaussianas, dejando una separación media de 11,68 m. Hay que recortar al
   distrito y pesar cada cara por la fracción que cae adentro.
3. **Las cajas por piso son cerradas.** Antepecho, vidrio e interior tienen
   caras de arriba y de abajo que están tapadas para siempre: un splat
   entrenado no tiene gaussianas ahí porque ninguna cámara las vio. Tirando las
   caras con normal casi vertical, la superficie a cubrir baja de 1,93 a
   0,86 millones de m².
4. **La vista de arranque a 180 m de altura no se entendía**: el plano del
   suelo llenaba el cuadro y los edificios quedaban como flecos. A la altura de
   la calle se lee de una.
