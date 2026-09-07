# Un distrito en gaussianas 3D, con el color trazado por Cycles

**1.680.402 gaussianas anisótropas** sobre 744 × 744 m de piso y 570 × 570 m de
ciudad, dibujadas por un rasterizador escrito a mano en WebGL 2. Sin librerías.
El color de cada gaussiana **no** sale de una textura: sale de mirar en qué
píxel cayó esa gaussiana en cada una de **184 fotos trazadas con Cycles** y
promediar lo que las cámaras vieron ahí. Que es exactamente de dónde lo saca un
splat entrenado.

| | |
|---|---|
| Escena | 49 edificios de 15 a 132 m · 155.166 caras · 31 mallas |
| Fotos | 184 tomas de 640 px · lente de 20 mm · 96 muestras · color y profundidad en EXR |
| Render | 2 h 16 min de Cycles en CPU, 4 núcleos, sin GPU |
| Superficie | 208.276 triángulos · 1.797.613 m² · paso de muestreo 1,00 m |
| Cobertura | 81,4 % de las muestras vio dos cámaras o más · **6,85 cámaras de media** |
| Nube completa | 1.680.402 gaussianas · 51,3 MB · grano 1,21 m |
| Nube grande | 900.000 · 27,5 MB · grano 1,58 m |
| Nube web | 450.000 · 13,7 MB · grano 2,24 m — la que va en `distrito.html` |

## Lo que esto es y lo que no

**Lo que no es: fotogrametría.** Un splat entrenado se entrena: cientos de
fotos reales, COLMAP para sacar las cámaras, y de media hora a varias horas de
una GPU con CUDA moviendo, escalando y rotando millones de gaussianas por
descenso de gradiente. **Acá no hay GPU** —Mesa por software, medido en
`herramientas/neko/LEEME.md`— así que entrenar uno no es lento: es imposible.

**Lo que sí es, y es la mitad interesante del asunto:** la forma sale de la
geometría, pero **el color sale de las fotos**, con prueba de visibilidad por
z-buffer, promedio ponderado por coseno de incidencia y curva fílmica. El
resultado hereda todo lo que calculó el trazador de caminos: sombras suaves,
oclusión en los patios, rebote del asfalto en los zócalos, cielo azul en las
fachadas que no ven el sol.

**Y a qué distancia se lee como una foto.** El detalle de un splat no lo pone
la cantidad de gaussianas sino su **grano**, y el grano acá es de un metro. A
300 m o más cada gaussiana ocupa un par de píxeles y la nube se lee como una
toma aérea; en la vereda, con la cámara a 20 m de la fachada, cada gaussiana
ocupa cien píxeles y se ve lo que es: una nube de elipses. Para que la calle se
viera igual de bien harían falta unos 9 millones de gaussianas, o 290 MB.

## Cómo funciona

`ciudad.py` arma la escena en Blender y la fotografía. Cuatro familias de
cámaras, porque cada escala se lee distinto: **cruces** (dos fachadas y la
cebra), **media calle** (la fachada de frente, que es donde el ángulo rasante
arruinaba el color), **peatón** a 1,70 m y **aéreas oblicuas** a 95-215 m. De
cada toma se guardan dos EXR: color en medias y **profundidad** en float.

`proyectar.py` corre adentro de Blender —así lee los EXR y la escena sin
intermediarios— y hace lo siguiente:

1. **Muestrea la superficie** proporcional a área × peso del material. El peso
   es un multiplicador de densidad: la calzada se lleva 0,30 y el follaje 2,30,
   así que las gaussianas se gastan donde hay detalle.
2. **Refuerza las caras finas.** Un parteluz de 15 cm por 130 m tiene 19 m²: con
   densidad de superficie le caen 47 muestras, una cada 2,8 m, y para tapar el
   hueco la gaussiana sale de 0,17 × 1,4 m, que en pantalla es un chorreado
   vertical de 5 m. En una cara fina lo que hay que igualar es el paso **a lo
   largo**, no el área.
3. **Proyecta cada muestra** en cada foto y la acepta sólo si la profundidad
   coincide. El pase Z de Cycles es la distancia **al plano** de la cámara, no
   radial: medido, la mediana del residuo daba 4,3 contra 40,4.
4. **Promedia un vecindario de 3 × 3 píxeles** con la profundidad de acuerdo.
   Son nueve muestras independientes del trazador, así que el ruido baja como
   si hubiera nueve veces más muestras por píxel: 96 rinden como ~860, y por
   las 6,85 cámaras de media, como ~5.900.
5. **Pondera por coseno de incidencia** y descarta lo que sólo se vio de canto.
   Ahí estaba el moteado blanco de los bordes.
6. **Curva fílmica y sRGB.** La toma es lineal: sin curva, el hormigón al sol
   recorta en 1,0 y todo el frente sale blanco lavado.
7. **Arma la gaussiana apoyada en la superficie**: dos ejes en el plano de la
   cara y uno finito en la normal, que es la forma que toman las gaussianas
   entrenadas sobre una pared. El eje corto va hacia lo fino de la cara, así
   una pieza delgada sale como una elipse fina y larga en vez de un disco que
   la desborda.

El visor agrega dos cosas que no están en las fotos: **cielo** calculado por
dirección de rayo (degradé, bruma y sol en la misma dirección que tenía la
escena) y **perspectiva aérea** por distancia. Sin ellas la torre del fondo
está tan nítida como la de adelante, y eso es lo que hace que una nube no
parezca una foto.

## Uso

```sh
# la escena y las 184 fotos (2 h 16 min en CPU). Deja ciudad3.blend y ~/foto3
blender -b -P ciudad.py -- --vistas 184 --muestras 96 --px 640

# la nube completa, y de la misma corrida una versión rala
blender -b ciudad3.blend -P proyectar.py -- --fotos ~/foto3 \
        --salida distrito-completo.splat --total 1600000 --caja 285 --apron 372
python3 ralear.py distrito-completo.splat visor/ciudad.splat 450000

# un recorte: --caja es el radio y --centro lo corre a un cruce
blender -b ciudad3.blend -P proyectar.py -- --fotos ~/foto3 \
        --salida esquina.splat --total 520000 --caja 78 --apron 118 --centro 52,52

python3 -m http.server -d visor 8091     # el visor leyendo visor/ciudad.splat
python3 armar-html.py visor visor/ciudad.splat distrito.html

python3 mirar.py visor/ciudad.splat ojo.png --ojo 250,150,300 --blanco 0,45,0
node foto-visor.mjs http://127.0.0.1:8091/index.html visor.png 30000
```

`distrito.html` es el visor en **un archivo** que se abre con doble clic: el
rasterizador empaquetado con esbuild en un script clásico y las gaussianas en
base64 con gzip, porque desde `file://` no hay módulos ES ni `fetch`. Como
base64 infla un tercio, van comprimidas y las descomprime la página con
`DecompressionStream`, que no es una API de red y por eso anda igual en
`file://` y en el sandbox de un artifact. Medido: 0,78×, o sea un 28 % más de
gaussianas en el mismo presupuesto de bytes.

**El visor lee cualquier `.splat`.** Si consegués una captura de verdad —Luma,
Polycam, SuperSplat— dejala como `visor/ciudad.splat` y se abre igual.

`hacer-splat.py` es la versión anterior, la que sacaba el color de la textura y
cocinaba la luz a mano. Queda porque es la mitad del camino y se compara bien.

## Lo que costó, medido

1. **El orden de dibujo estaba invertido.** La clave de profundidad iba negada,
   así que el conteo ascendente dibujaba de cerca a lejos y, con alfa "sobre",
   el piso del fondo terminaba pintado **encima de la ciudad**: se veía una
   explanada con los edificios apenas asomando en el horizonte. Un signo.
2. **Firefox se comía 2,6 de los 4 núcleos** girando el visor viejo, y el
   render tardaba 138 s por toma. Cerrándolo bajó a 38 s.
3. **SwiftShader tarda segundos por cuadro** con medio millón de gaussianas, así
   que una captura tomada justo después de mover la cámara sale del cuadro
   anterior. Media hora perdida persiguiendo un bug que no existía. Para juzgar
   geometría conviene `mirar.py`, que es un z-buffer de puntos en numpy y no
   necesita navegador.
4. **`file_slots.new()` devuelve el socket, no la ranura.** Para que el color
   salga en medias y la profundidad en float hay que tocar
   `sal.file_slots[0].format`, no lo que devolvió `new()`.
5. **El piso del distrito son dos triángulos de 288.000 m²** y un recorte por
   centroide no los puede tratar: o entra entero o no entra. Hay que
   subdividirlos —cuatro hijos por vuelta hasta 12 m de lado— antes de recortar.
6. **La cara de abajo de la losa, del cordón y de las rayas no la ve nadie**, y
   se llevaba el 9 % de las muestras. Tirando lo que mira para abajo a ras del
   piso, la cobertura sube de 62,8 % a 76,2 %.
7. **Los emisores están calibrados para la noche.** De día, en toma lineal, cada
   farol quedaba muy arriba de 1 y salía como una bola blanca flotando en la
   calle. Van atenuados por material antes de la curva.
8. **Si el plano del suelo termina donde termina la ciudad, la nube flota como
   una maqueta.** Hay que dejar una franja de piso más allá del recorte y
   quedarse con lo que alguna cámara aérea vio. Y entonces hay que encuadrar por
   la caja de lo **construido**, no por la de la nube, o los edificios quedan en
   una franja del medio.
9. **Los uniforms compartidos necesitan la misma precisión en los dos shaders.**
   El vértice declaraba `precision highp int` y el fragmento sólo la de `float`,
   así que un `uniform int` común no linkeaba: *"Uniform `modo` is not linkable
   between attached shaders"*.
10. **Con dos programas hay que usar VAO.** El estado de atributos es global; el
    cielo y las gaussianas se pisaban el `vertexAttribPointer`.
