# Un distrito en gaussianas 3D, con el color trazado por Cycles

**8.931.298 gaussianas anisótropas** sobre 744 × 744 m de piso y 570 × 570 m de
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
| Escena | 54 edificios de 19 a 117 m · 191.865 caras · follaje de cartas con alfa |
| Superficie | 360.050 triángulos · 2.568.912 m² · paso de muestreo 0,44 m |
| Cobertura | 62,8 % de las muestras quedó con color · **6,90 cámaras de media** |

Las mismas fotos dan la nube a cualquier densidad; lo único que cambia es el
`--total` del proyector. Cinco escalones, todos del mismo distrito:

| Nube | Gaussianas | Archivo | Grano | Dónde |
|---|---|---|---|---|
| **distrito 4×** | **35.027.775** | **1.069 MB** | **0,25 m** | todo el distrito, `.splat` suelto |
| núcleo 4× | 14.790.347 | 451,4 MB | 0,26 m | 300 × 300 m, `.splat` suelto |
| paseo | 949.931 | 29,0 MB | 0,47 m | `caminar.html`, 100 × 100 m |
| completa | 8.931.298 | 272,6 MB | 0,52 m | `.splat` suelto, se arrastra al visor |
| media | 3.000.000 | 91,6 MB | 0,90 m | `.splat` suelto |
| grande en html | 900.000 | 27,5 MB | 1,64 m | un archivo, doble clic |
| web | 450.000 | 13,7 MB | 2,32 m | `distrito.html`, entra en 15 MB |

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

La cobertura bajó de 80 % a 63 % y está bien: el follaje son cartas con alfa,
así que la mayor parte de la carta es transparente y la prueba de profundidad
descarta esas muestras. Lo que queda son gaussianas sobre hoja visible, que es
exactamente lo que se busca.

**Y a qué distancia se lee como una foto.** El detalle de un splat no lo pone
la cantidad de gaussianas sino su **grano**: cuántos metros mide cada una. Con
grano de un metro, a 300 m o más cada gaussiana ocupa un par de píxeles y la
nube se lee como una toma aérea, pero en la vereda, con la cámara a 20 m de la
fachada, ocupa cien píxeles y se ve lo que es: una nube de elipses. Para que la
calle se viera igual hacían falta unos nueve millones de gaussianas, y ahí
están: con grano de **0,52 m** las ventanas de la fachada de enfrente se
cuentan una por una.

**El 4× sobre el distrito entero** son 44 millones de muestras: paso de
muestreo **0,21 m**, la mitad exacta del anterior, o sea cuatro veces la
densidad. Para que entrara hubo que dar vuelta el proyector —las 184 fotos van
a RAM (719 MB en medias) y las muestras se procesan por bloques, cada bloque
contra las 184 tomas— porque guardar un acumulador por muestra para 57 millones
de muestras eran seis gigas y no entraban. De paso cada EXR se lee una vez y no
una por bloque.

Y hubo que subir el techo del visor: el empaquetado metía 1.024 gaussianas por
fila de textura, con lo que no pasaba de 16,7 millones. Ahora el ancho se
elige tan chico como se pueda y se duplica hasta que la nube entre en el alto
que admite la placa, y el shader recibe la máscara y el corrimiento en vez de
tenerlos cableados.

**Y el límite de verdad no era ése.** Un splat no puede ser más realista que
las fotos con las que se pinta. Después de subir a nueve millones seguía sin
parecer una foto, y el problema estaba antes: la escena. Renderizando **un
fotograma** a 1280 px con curva de cámara —`mirar-foto.py`, tres minutos— se ve
de una qué falla, y sobre eso se itera. Ahí aparecieron el follaje facetado,
los faroles como losas, los semáforos como andamios, el mosaico repetido en las
49 fachadas y las copas flotando por un bug de apilado del tronco. Esa lista
está abajo. El techo que queda ya no es el splat: es que los autos son cajas y
la gente son tres cajas.

Lo que la nube completa deja al descubierto es el límite siguiente, que ya no
son las gaussianas: las fotos son de 640 px. Una gaussiana de 0,48 m vista
desde una cámara a 150 m ocupa un píxel, así que el vecindario de 3 × 3 con el
que se promedia el color abarca tres veces la gaussiana y la emborrona. Las
superficies que ninguna cámara vio de cerca son las que salen lavadas.

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

## Caminar por adentro

El visor tiene primera persona: **WASD**, mouse para mirar, **Shift** corre,
**V** atraviesa paredes, **Esc** sale. En el celular, la mitad izquierda de la
pantalla es la palanca y la derecha la mirada. `caminar.html` arranca ya
caminando; en los demás está el botón *Caminar por adentro*, o la tecla **F**.

El choque no sabe nada de la escena: al cargar se arma una **rejilla de
ocupación** de 1,5 m contando las gaussianas que caen entre 0,7 y 3,2 m de
altura. Una pared llena la celda, la vereda no aporta ninguna porque queda
abajo de la franja, y el umbral sale del grano de la nube. Así el mismo visor
camina cualquier `.splat` que se le suelte, venga de donde venga.

Dos cosas que costaron y son propias de mirar desde 1,68 m:

- **El piso se abre en huecos.** Un disco apoyado en el asfalto, visto de canto,
  colapsa a una raya y entre disco y disco se ve el fondo. Por eso el proyector
  tiene `--pisos`, que le sube la densidad al piso, y `--grosor`, que engorda
  las gaussianas contra la normal para que no colapsen. La calzada arranca con
  peso 0,30 porque desde el aire ocupa muchísima área y poco detalle; caminando
  es justo al revés.
- **Un recorrido no entra en un HTML si es uniforme.** El envío tiene tope de
  30 MiB, o sea un millón de gaussianas. Con `ralear.py --centro --r0 --pmin` el
  raleo es radial: densidad entera donde arrancás y cada vez más rala hacia el
  borde, con las gaussianas agrandadas por la raíz de lo que se ralea para que
  no queden agujeros.

## Uso

```sh
# la escena y las 184 fotos (2 h 16 min en CPU). Deja ciudad3.blend y ~/foto3
python3 hacer-hojas.py hojas.png 512    # la textura de follaje, con alfa
blender -b -P ciudad.py -- --vistas 184 --muestras 96 --px 640

# un fotograma solo, para mirar la escena como foto antes de gastar dos horas
blender -b ciudad4.blend -P mirar-foto.py -- --px 1280 --muestras 200 \
        --lente 35 --ojo 92,-46.5,1.75 --blanco -200,-49,26 --salida ref.png

# la nube completa, y de la misma corrida una versión rala (unos 50 min)
blender -b ciudad4.blend -P proyectar.py -- --fotos ~/foto4 \
        --salida ciudad-11M.splat --total 11000000 --caja 285 --apron 372 \
        --chico ciudad-3M.splat --nchico 3000000
python3 ralear.py ciudad-11M.splat visor/ciudad.splat 450000

# el núcleo a cuatro veces la densidad, y de ahí el recorrido a pie
blender -b ciudad4.blend -P proyectar.py -- --fotos ~/foto4 \
        --salida nucleo-4x.splat --total 20000000 --caja 150 --apron 190
blender -b ciudad4.blend -P proyectar.py -- --fotos ~/foto4 \
        --salida paseo.splat --total 1500000 --caja 50 --apron 74 \
        --centro 52,52 --pisos 5 --grosor 0.30
# el distrito entero a cuatro veces la densidad: 57 millones de muestras
blender -b ciudad4.blend -P proyectar.py -- --fotos ~/foto4 \
        --salida distrito-4x.splat --total 44000000 --caja 285 --apron 372 \
        --bloque 5500000
python3 recortar.py nucleo-4x.splat corte.splat 52 -52 60     # x, z, radio
python3 ralear.py paseo.splat paseo-final.splat 950000 --centro 52,-52 --r0 26 --pmin 0.55
python3 armar-html.py visor paseo-final.splat caminar.html --pie --brillo 1.35

# un recorte: --caja es el radio y --centro lo corre a un cruce
blender -b ciudad4.blend -P proyectar.py -- --fotos ~/foto4 \
        --salida esquina.splat --total 520000 --caja 78 --apron 118 --centro 52,52

python3 -m http.server -d visor 8091     # el visor leyendo visor/ciudad.splat
python3 armar-html.py visor visor/ciudad.splat distrito.html
python3 armar-html.py visor - visor-suelto.html   # visor vacío, 25 KB

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

**El visor lee cualquier `.splat`**, y se le puede arrastrar el archivo a la
ventana. Es la única forma de mirar la nube completa: 284 MB adentro de una
página no entran, y el `.html` de un solo archivo tiene techo en el millón de
gaussianas. `visor-suelto.html` es el visor vacío, 25 KB,
que pide el archivo y después lee lo que le sueltes —incluida una captura de
verdad de Luma, Polycam o SuperSplat—.

A nueve millones el visor mueve 284 MB de datos y 284 MB de textura, así que:
manda las posiciones solas al worker del orden (12 bytes por gaussiana en vez
de 32), suelta la nube anterior si le sueltan otra, y si la textura no entra en
la placa lo dice en vez de dibujar negro.

Medido fuera del navegador, con los 9.313.478: el empaquetado tarda **3,9 s**,
la textura sale de 2048 × 9096 —284 MB, y el índice de fila llega a 9.095, bien
abajo del máximo de 16.384— y el orden por conteo tarda **182 ms** (48,8 ms con
tres millones). En Chromium sin cabeza con SwiftShader la nube completa no
llegó a dibujar un cuadro: **hace falta una placa de verdad**. Verificado en el
navegador hasta 3.000.000.

`hacer-splat.py` es la versión anterior, la que sacaba el color de la textura y
cocinaba la luz a mano. Queda porque es la mitad del camino y se compara bien.

## Un panorama convertido en pura pintura

`pano-splat.py` es el otro camino a un splat, y el más corto: **no hay escena
que renderizar**. Entra una equirectangular y sale una nube donde cada
gaussiana es UN PÍXEL del panorama puesto en el lugar del espacio de donde vino
ese píxel. Sin malla, sin texturas, sin assets, sin entrenamiento: color y
posición, que es lo que un splat es.

El panorama es `cielo360-rezona.png`, generado con Rezona: laguna turquesa,
cúmulos, lomas verdes, burbujas de jabón y peces tropicales. Frutiger Aero.

**De dónde sale la distancia.** Un panorama trae la dirección de cada píxel
pero no su distancia. En un mundo de laguna la geometría la regala:

* Mirando para abajo el rayo pega en el plano del agua, y eso es exacto:
  `t = altura_del_ojo / -sen(elevación)`. El agua queda con perspectiva **de
  verdad** y aguanta que uno se mueva.
* Mirando al horizonte o para arriba —cielo, nubes, las lomas del fondo— no hay
  dónde pegar: va a una cúpula de 520 m, donde el paralaje ya no se nota.
* Más allá de `--rsuelo` (180 m por omisión) el agua también se va a la cúpula.
  Si no, los anillos del agua lejana se separan —el estirón radial crece con el
  cuadrado de la distancia— y desde un ojo corrido se ven las rendijas negras
  entre anillo y anillo.

**El tamaño de cada gaussiana** es lo que subtiende su píxel a esa distancia:
las del agua van apoyadas en el plano (normal para arriba) y estiradas a lo
largo del rayo, porque un píxel visto de canto cubre un rectángulo largo; las
de la cúpula van de cara al ojo. Por eso la nube no tiene huecos ni de cerca ni
de lejos.

**El raleo del agua de cerca.** Bajo los pies un píxel del panorama tapa tres
centímetros de agua: la mitad de las gaussianas se amontonaban en un círculo de
dos metros donde ya no se distingue ninguna. Se saltean filas y columnas hasta
que cada gaussiana mida `--grano` **o** lo que `--ang` subtiende a esa distancia
—el menor de los dos, porque cinco centímetros a un metro de los pies son dos
grados de vista y se ven los pegotes—, y las que sobreviven se agrandan por el
mismo factor. Lo que se libera se gasta en `--super`, que es donde sí se ve.

**El muestreo es Catmull-Rom**, no el píxel vecino. Sin interpolar, subir
`--super` multiplica gaussianas sin agregar nada y el cielo sale escalonado;
bilineal arregla eso pero deja todo blando. Bicúbico mantiene el filo del
horizonte y del borde de las nubes.

```sh
# la nube grande: 5,0 M de gaussianas, 153 MB
python3 pano-splat.py cielo360-rezona.png pano.splat --super 3

# el html de un solo archivo, que arranca parado en el agua
python3 armar-html.py visor pano.splat laguna-aero.html --pie --niebla 0 \
  --correa 9 --encuadres '[{"blanco":[0,1.5,0],"dist":7,"yaw":0,"pit":0.05,"fov":62}]' \
  --titulo "Laguna Aero 360"
```

Tres banderas nuevas del visor, todas para este caso:

* `--niebla 0` apaga la perspectiva aérea del shader. Está para que la torre del
  fondo no salga tan nítida como la de adelante, pero acá el panorama **ya trae
  su bruma pintada** y a 520 m la del shader se comía el 23 % del cielo.
* `--correa 9` limita a nueve metros lo que se puede caminar desde el origen. El
  color de cada gaussiana se midió UNA sola vez, desde ese punto: alejarse no
  muestra más mundo, muestra el truco.
* `--encuadres` reemplaza los cuatro encuadres de maqueta, que en una nube de
  panorama no significan nada porque no hay un "afuera" desde donde mirarla.

**El techo de esto es el panorama.** 1376x688 píxeles: `--super 3` interpola
hasta 4128x2064 y de ahí para arriba no hay más información que sacar. Lo
honesto es decirlo: la nube es tan nítida como la imagen que entró.

## Un mundo con relieve y objetos, sin escena que renderizar

`pano-splat.py` da un plano de agua y una cúpula: hermoso y plano. `mundo-splat.py`
es lo otro —relieve real, islas, palmeras, pasto, burbujas, cromados y vidrios
en 3D— **sin Blender y sin trazar una sola toma**. La geometría se construye en
numpy y el color sale del panorama, que es la fotografía de ese mundo.

**Cómo se ilumina**, que es de lo que depende que parezca real y no un dibujo:

* La ambiente es el panorama entero integrado contra el coseno, resuelto con
  nueve armónicos esféricos (`pano.Entorno.irradiancia`). Una cara que mira al
  cielo recibe azul; una que mira al agua, turquesa. Eso solo ya separa las
  formas sin ninguna sombra.
* El sol se busca en el panorama: dirección y color del percentil 99,85 de
  luminancia sobre el horizonte. Su **intensidad no se puede leer de la
  imagen** —el disco viene recortado en blanco en 8 bits— así que se calibra
  contra el cielo: en exterior la directa es unas cuatro veces y media la
  irradiancia del cielo.
* La sombra sale de un barrido de horizonte sobre la grilla de alturas, no de
  trazar rayos: con el sol a 57° ninguna sombra pasa de veintiún metros, así
  que veinticuatro pasos de un metro alcanzan.
* Los albedos son albedos de verdad: arena 0,40, pasto 0,10, roca 0,21. Con los
  colores que uno pondría a ojo (una arena "beige" 0,80) el sol los manda
  arriba de 1 y la curva filmica los devuelve **blancos**: la playa salía nieve.
* El agua son dos capas. El fondo de arena con la absorción del agua encima
  —por eso el turquesa es turquesa: es arena vista a través de dos metros de
  agua— y la superficie semitransparente con Fresnel, que refleja el panorama
  y le suma el lóbulo del sol que el panorama no puede traer.

```sh
# el mundo grande: 2,3 M de gaussianas
python3 mundo-splat.py cielo360-rezona.png mundo.splat --grano 0.037 --crece 0.003 --dens 1.5
# el de teléfono: 791 mil
python3 mundo-splat.py cielo360-rezona.png cel.splat --grano 0.085 --crece 0.006 --dens 0.8 --cielo 2
```

## Comprimir: el formato .splz

Un `.splat` son 32 bytes por gaussiana en float32 e **intercalados**, que es lo
peor para comprimir. `splz.py` los deja en 17 antes de gzip y en unos 10
después. Tres cosas, en este orden de importancia:

1. **Orden de Morton.** Se ordenan por posición entrelazada bit a bit: las
   vecinas en el archivo son vecinas en el espacio. Sin esto nada de lo demás
   sirve.
2. **Columnas.** Todas las x juntas, después las y, después los colores. Cada
   columna se parece a sí misma.
3. **Cuantización por bloque.** Cada 8192 gaussianas lleva su propia caja y las
   posiciones van en 16 bits DENTRO de esa caja, guardadas como diferencia con
   la anterior en aritmética de 16 bits —da la vuelta y se reconstruye exacto
   con una suma acumulada—, con el byte alto separado del bajo. Cuantizar
   contra la caja global sería inservible: diez centímetros por paso.

Medido sobre el mundo grande: 71,1 MB de `.splat` → 37,9 MB de `.splz` → **21,9
MB con gzip, el 57 % de lo que pesaba el `.splat.gz`**. El corrimiento en el
percentil 99,9 es 0,58 del tamaño de la propia gaussiana, o sea invisible. El
visor lo desarma en `desplz()` y sube a la GPU exactamente lo mismo: esto es
tamaño de archivo, no de memoria de video.

## Teléfono

* **Detección por tipo de puntero**, no por ancho de ventana ni user agent: una
  notebook con pantalla táctil no es un teléfono y una ventana angosta tampoco.
* **Palanca en pantalla.** Antes el código ya caminaba con el tacto —"la mitad
  izquierda mueve"— pero no se veía por ningún lado, y un mando invisible no
  existe. Ahora hay círculo, perilla que sigue el dedo, y botones de correr,
  mirar arriba, pantalla completa y datos.
* **Resolución propia.** En un teléfono hay tres píxeles físicos por punto y la
  GPU no da abasto: se rasteriza a 1,05 y el navegador estira. Es la diferencia
  entre veinte cuadros y seis.
* **Pellizco** para el campo visual, que es la única forma de acercar sin
  caminar.
* Nada de *pointer lock*, que en un teléfono no existe.
* Y la nube aparte: 791 mil gaussianas en un html de 10,3 MB.

## Lo que costó, medido

1. **Playwright no puede sacarle una foto a esto.** Con SwiftShader y un millón
   de gaussianas cada cuadro tarda decenas de segundos, y `page.screenshot`
   espera a que la página quede quieta: se queda esperando para siempre. Las
   vistas de este archivo se revisaron con `mirar.py`, que es un z-buffer de
   puntos en numpy — pero ojo, dibuja discos duros sin mezcla y **exagera los
   grumos de cerca**: el visor de verdad los funde.
2. **Estuve puliendo el lado equivocado.** Tres vueltas de densidad,
   rasterizador y orden de dibujo cuando lo que delataba la nube estaba en la
   escena. El fotograma de referencia debió ser lo primero, no lo último.
3. **El follaje eran icoesferas macizas de 80 caras en verde plano.** Las
   facetas se marcaban y era el delator número uno. La solución que usa todo el
   mundo son cartas cruzadas con una textura de hojas recortada por alfa, y esa
   textura se puede dibujar con numpy sin bajar nada.
4. **Los tres tramos del tronco no se apilaban.** El de arriba terminaba en
   `h*0,40` y la copa empezaba en `h*0,86` menos el radio: dos metros y medio
   de aire y las copas flotando.
5. **Abajo del horizonte el HDRI es negro.** A 175 m de altura los rayos casi
   horizontales pasan de largo el telón y traen ese negro: en la toma aérea
   quedaba una banda negra sobre la silueta. Va mezclado con bruma.
6. **A nueve millones de muestras el proyector no entraba en memoria.** Las
   homogéneas se armaban adentro del lazo (374 MB por toma), el vector a la
   cámara se normalizaba entero (280 MB) y la etapa de forma iba en doble
   precisión (medio giga sólo para las matrices de rotación). Con las
   homogéneas armadas una vez, el coseno por contracción y float32 de ahí en
   adelante, el pico baja a algo que la máquina aguanta. Para proyectar sobran
   seis dígitos: a 400 m del centro el error de float32 es de cuatro
   centésimas de milímetro.
7. **El orden de dibujo estaba invertido.** La clave de profundidad iba negada,
   así que el conteo ascendente dibujaba de cerca a lejos y, con alfa "sobre",
   el piso del fondo terminaba pintado **encima de la ciudad**: se veía una
   explanada con los edificios apenas asomando en el horizonte. Un signo.
8. **Firefox se comía 2,6 de los 4 núcleos** girando el visor viejo, y el
   render tardaba 138 s por toma. Cerrándolo bajó a 38 s.
9. **SwiftShader tarda segundos por cuadro** con medio millón de gaussianas, así
   que una captura tomada justo después de mover la cámara sale del cuadro
   anterior. Media hora perdida persiguiendo un bug que no existía. Para juzgar
   geometría conviene `mirar.py`, que es un z-buffer de puntos en numpy y no
   necesita navegador.
10. **`file_slots.new()` devuelve el socket, no la ranura.** Para que el color
    salga en medias y la profundidad en float hay que tocar
    `sal.file_slots[0].format`, no lo que devolvió `new()`.
11. **El piso del distrito son dos triángulos de 288.000 m²** y un recorte por
    centroide no los puede tratar: o entra entero o no entra. Hay que
    subdividirlos —cuatro hijos por vuelta hasta 12 m de lado— antes de recortar.
12. **La cara de abajo de la losa, del cordón y de las rayas no la ve nadie**, y
    se llevaba el 9 % de las muestras. Tirando lo que mira para abajo a ras del
    piso, la cobertura sube de 62,8 % a 76,2 %.
13. **Los emisores están calibrados para la noche.** De día, en toma lineal, cada
    farol quedaba muy arriba de 1 y salía como una bola blanca flotando en la
    calle. Van atenuados por material antes de la curva.
14. **Si el plano del suelo termina donde termina la ciudad, la nube flota como
    una maqueta.** Hay que dejar una franja de piso más allá del recorte y
    quedarse con lo que alguna cámara aérea vio. Y entonces hay que encuadrar por
    la caja de lo **construido**, no por la de la nube, o los edificios quedan en
    una franja del medio.
15. **Los uniforms compartidos necesitan la misma precisión en los dos
    shaders.** El vértice declaraba `precision highp int` y el fragmento sólo
    la de `float`, así que un `uniform int` común no linkeaba: *"Uniform `modo`
    is not linkable between attached shaders"*.
16. **Con dos programas hay que usar VAO.** El estado de atributos es global; el
    cielo y las gaussianas se pisaban el `vertexAttribPointer`.
17. **Con un panorama, la mitad de las gaussianas caen bajo los pies.** El
    reparto de píxeles de una equirectangular es uniforme en ángulo, y el
    hemisferio de abajo es la mitad: 1,89 de 3,79 millones se amontonaban en un
    círculo de dos metros. Raleadas por tamaño quedan 700 mil y la nube se ve
    igual de cerca y mejor de lejos.
18. **El estirón radial del agua lejana abre rendijas.** El paso entre anillos
    crece con el cuadrado de la distancia y el largo de la gaussiana estaba
    topeado: pasados los 211 m quedaban franjas negras entre anillo y anillo.
    Desde el origen no se ven —se miran de canto—, desde veinte metros al
    costado sí. Se arregla mandando el agua lejana a la cúpula, no subiendo el
    tope.
19. **`--super` sin interpolar no hace nada.** Repetía el píxel vecino: cuatro
    veces las gaussianas, la misma imagen escalonada y el archivo por las nubes.
20. **Los dos marcos que parecían obvios eran ZURDOS.** (azimutal, radial,
    arriba) en el agua y (tangente, tangente, -rayo) en la cúpula: los dos con
    determinante -1. De una matriz zurda la extracción del cuaternión saca
    cualquier cosa, y el resultado en el visor no fue un error sino algo peor
    —las lomas del horizonte abiertas en un abanico de rayas verdes—. El tercer
    eje sale del producto vectorial de los otros dos, nunca a ojo. `mirar.py`
    no lo ve: dibuja discos y no mira la orientación. **Ese preview no sirve
    para validar orientaciones, sólo color y cobertura.**
21. **El salteo azimutal con paso fijo abre la costura.** El ancho de la fila
    casi nunca es múltiplo del paso y lo que sobra queda como una rendija al
    dar la vuelta. Se reparte una cantidad de columnas por fila y se colocan
    parejas.
22. **La trama se ve en el BORDE del cuadro, no en el medio.** El paso entre
    gaussianas de la cúpula da un píxel en el centro y ahí se promedia solo;
    contra el borde la perspectiva estira lo horizontal y los valles entre
    campanas dejan pasar el cielo procedural, que es de otro color. Se cierra
    con más solape (`--sigma`), más opacidad (`--alfa`) y engordando la elipse
    en pantalla (`--tam`), no con más gaussianas.
23. **El rasterizador dibujaba TODAS las gaussianas de la mitad de su tamaño.**
    El atajo clásico —`mayor = sqrt(2·λ)` con el cuadrado de -2 a 2 y
    `exp(-|p|²)` en el fragmento— hace que el borde del cuadrado caiga a 1,41
    sigma y que la campana baje cuatro veces más rápido de lo que debería. En
    una nube densa no se nota, porque se tapa sola. En una superficie
    muestreada justo —una cúpula de cielo, un plano de agua— se abre una
    **rejilla por la que pasa el fondo**, y se ve como un abanico gris en el
    cielo. Costó cinco capturas y una prueba con el fondo en magenta darse
    cuenta de que el hueco era de verdad y no un problema de cobertura: la
    separación angular entre gaussianas de la cúpula era perfectamente uniforme
    (9,12 mrad, percentil 50 igual al 100) y el sigma era 11,87. El eje ahora
    mide 3 sigma y el fragmento usa `exp(-1,125·|p|²)`, que es la campana que
    corresponde.
24. **La prueba del fondo magenta.** Cuando algo del cielo "se ve rayado" hay
    dos hipótesis: faltan gaussianas o falta opacidad. Pintar el cielo
    procedural de magenta y volver a mirar las separa en una sola captura. Si
    las rayas salen magenta, es el fondo pasando: opacidad. Media hora de
    hipótesis contra treinta segundos de edición.
25. **El teselado de un objeto no puede depender de su distancia al ORIGEN**
    en un mundo que se camina. Las burbujas se teselaban según lo lejos que
    estuvieran del centro del mundo, y una burbuja lejos del centro puede
    quedar a un metro de la cara: sesenta gaussianas transparentes ahí se leen
    como una malla mosquitera. Sale del radio de la burbuja y nada más.
26. **Un anillo de lomas de 360° no deja mar abierto en ningún rumbo.** El
    relieve tiene que abrirse y cerrarse con el azimut, y volver a hundirse
    antes del borde del mundo, o donde termina la grilla queda un escalón.
