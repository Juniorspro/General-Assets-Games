
/* ══════════════════════════ EL DIBUJO, EN 3D ══════════════════════════
   ── LA JUGABILIDAD SIGUE SIENDO DEL PLANO XY, Y ESO NO ES UNA CONCESION ──
   El genero ES de dos ejes: se avanza y se salta, y nada mas. Lo que pasa a ser
   tridimensional es el MUNDO — los bloques se extruyen, el cubo tumbea de verdad,
   hay luz, sombra de contacto y perspectiva. Meter el juego en tres ejes seria
   otro juego, no este mejor dibujado.

   ── LA CAMARA MIRA DERECHO POR −Z, Y ESA ES LA DECISION QUE SOSTIENE TODO ──
   Con la camara inclinada, la proyeccion deja de ser lineal y la x de un pico en
   pantalla depende de su altura: en un juego donde hay que despegar en un bloque
   exacto, eso es injugable. Mirando derecho, x e y son EXACTAMENTE lineales sobre
   el plano de juego, y el volumen igual se lee: la camara va a la altura del
   medio de la banda visible, o sea POR ENCIMA de los bloques bajos, asi que se
   les ve la cara de arriba. Es el mismo encuadre de cualquier 2,5D.

   ── Y TODO COMPARTE EL PLANO z = 0 POR DELANTE ──
   Los solidos se extruyen hacia ATRAS (z de −PROF a 0) y el jugador tambien
   (z de −0,86 a 0). Si el cubo asomara hacia la camara, la perspectiva lo
   agrandaria un 4,5 % y con el a un 30 % del ancho eso lo correria 0,18 bloques
   respecto de los picos: se veria desalineado justo donde hay que medir. */

const cv = $('cv');
let ANCHO = 0, ALTO = 0, ESC = 1, U = 20;   /* U = pixeles por bloque, para las sondas */
const PROF = 1.6;                            /* cuanto se extruyen los solidos */
/* ── EL PISO SE EXTRUYE CUARENTA Y SEIS BLOQUES Y NO 1,6 ──
   Con la camara a 2,77 de alto, una superficie horizontal de 1,6 de fondo se ve
   como una FRANJA de dos centimetros y por encima aparece cielo a la altura del
   suelo: medido en la foto, el piso era una banda y arriba de ella el horizonte
   estaba roto. Extruido hasta la niebla, el suelo se pierde en el fondo y eso es
   justamente lo que hace que la escena se lea a profunda. */
/* ── Y ES LARGO PORQUE SU BORDE LEJANO NO PUEDE VERSE ──
   Con 70 bloques, la niebla se come el 56 % en el borde y quedaba una LINEA DURA
   cruzando la pantalla: las torres de las tres capas cortaban todas en esa misma
   fila y se leian como apoyadas en una repisa, no a tres distancias. Con 140 la
   niebla se lleva el 96 % y el suelo se funde con el cielo en el horizonte, asi
   que cada torre corta donde le toca por su propia z. */
const PROF_PISO = 140;
/* ── EL TECHO DE UN PASILLO NO SE EXTRUYE COMO EL SUELO, Y ESO SE MIDIO ──
   El suelo mide 140 de fondo porque tiene que llegar hasta donde la niebla lo
   cierra: con densidad 0,013, un 95 % de niebla cae en 133 bloques, asi que el
   numero esta derivado y no elegido. Un TECHO no: su cara de abajo no recibe sol
   —solo ambiente y el rebote del hemisferico— asi que extruida 140 bloques es una
   cuna casi negra de un tercio de pantalla, y su cara de +X, que la niebla lleva
   al color del horizonte, aparece adentro del pasillo como dos triangulos beige
   cruzando la banda de juego (medido en el tramo de la onda). Con 6,5 de fondo el
   techo se lee a viga —el mismo lenguaje que los bloques, que miden 1,6— y las
   dos caras problematicas se quedan en un canto. */
const PROF_TECHO = 6.5;
const FOV_Y = 50;

const ren = new T.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
ren.setClearColor(0x05060a, 1);
ren.outputColorSpace = T.SRGBColorSpace;
ren.toneMapping = T.ACESFilmicToneMapping;
ren.toneMappingExposure = 1.15;
ren.shadowMap.enabled = true;
ren.shadowMap.type = T.PCFSoftShadowMap;
ren.info.autoReset = false;

const esc3 = new T.Scene();
const cam = new T.PerspectiveCamera(FOV_Y, 2, 0.1, 260);
/* mira derecho por −Z: sin rotacion, y por eso la proyeccion es lineal */
esc3.add(cam);

/* ══════════ LA LUZ ══════════
   Una direccional con sombra —que es lo unico que apoya al cubo sobre el piso— y
   un hemisferico que le pone color al ambiente. Y el hemisferico NO puede tener
   el suelo negro: una cara que no mira al cielo recibiria cero, que es lo que en
   ECO dejo un ovalo malva plano y en BARRIO las casas en silueta. */
/* ── LA SOMBRA ES UNA PISTA, NO UN AGUJERO ──
   Con la direccional a 2,1 y poco ambiente, la zona sombreada quedaba casi negra
   y en el pasillo de la nave las sombras de las paredes de arriba se leian a
   manchones sueltos sobre el piso. Bajando la direccional y subiendo el ambiente,
   una sombra oscurece a la mitad en vez de borrar: la de contacto del cubo se
   sigue viendo —que es la que importa— y las otras pasan a ser un matiz. */
const sol = new T.DirectionalLight(0xffffff, 1.45);
sol.position.set(7, 12, 9);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
sol.shadow.camera.near = 1; sol.shadow.camera.far = 60;
sol.shadow.bias = -0.0012; sol.shadow.normalBias = 0.03;
esc3.add(sol);
esc3.add(sol.target);
const hemi = new T.HemisphereLight(0x9fc8ff, 0x2a2f3d, 0.70);
esc3.add(hemi);
/* ── Y UN AMBIENTE PARO, QUE HACE FALTA POR UNA RAZON DE JUEGO ──
   En gravedad invertida se camina sobre la CARA DE ABAJO del techo, y una cara
   que mira al piso no recibe nada de una direccional de arriba: sin ambiente,
   la superficie que hay que pisar sale negra. */
const amb = new T.AmbientLight(0x4a5570, 0.95);
esc3.add(amb);
/* la niebla es densa a proposito: es lo que come el borde lejano del suelo. En el
   plano de juego (z ~ 0) no tiñe nada; a 46 bloques se lleva una cuarta parte y a
   125 —donde vive la capa lejana— casi todo, que es lo que la deja como una
   insinuacion en el horizonte en vez de un dibujo. */
const NIEBLA = new T.FogExp2(0x101c30, 0.013);
esc3.fog = NIEBLA;

/* ══════════ LOS MATERIALES ══════════
   Uno por familia y no uno por objeto: cada material es un programa compilado y
   una llamada de dibujo. El color del tema se reescribe al cambiar de nivel. */
/* ══════════ EL CEL SHADING, Y POR QUE ES FINO ══════════
   ── LA LUZ SE ESCALONA EN CINCO PASOS, NO EN DOS ──
   `MeshToonMaterial` reparte la luz segun un mapa de degradado de N texeles: con
   dos o tres, la escena se lee a dibujo animado de television y las caras de un
   cubo se vuelven parches planos que compiten con los picos. Con CINCO pasos y
   los dos de arriba muy juntos, lo que queda es un escalon en la sombra y una
   cara iluminada casi continua: se lee a dibujado sin que el bloque deje de ser
   un bloque. El pedido dice «cell shading muy fino», y fino es esto: el
   escalonado se nota en la penumbra y no en la luz. */
function mapaToon(){
  const d = new Uint8Array([46, 96, 150, 205, 236]);
  const t = new T.DataTexture(d, 5, 1, T.RedFormat);
  t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true;
  return t;
}
const TOON = mapaToon();
const matSol  = new T.MeshToonMaterial({ color: 0x171e2d, gradientMap: TOON });
const matPiso = new T.MeshToonMaterial({ color: 0x2a3448, gradientMap: TOON });
const matCanto = new T.MeshBasicMaterial({ color: 0x2de2a8 });
const matPico = new T.MeshToonMaterial({ color: 0xeef4ff, emissive: 0x7f8fa6, emissiveIntensity: 0.35, gradientMap: TOON });
const matPad  = new T.MeshBasicMaterial({ color: 0xffffff });
const matOrbe = new T.MeshBasicMaterial({ color: 0xffffff });
const matSierra = new T.MeshToonMaterial({ color: 0xdfe7f2, emissive: 0x445064, emissiveIntensity: 0.4, gradientMap: TOON });
const matMoneda = new T.MeshToonMaterial({ color: 0xffd447, emissive: 0x8a6a10, emissiveIntensity: 0.7, gradientMap: TOON });
/* ── EL CONTORNO ES UNA CASCARA DADA VUELTA, DE ANCHO CONSTANTE EN EL MUNDO ──
   Es el truco de siempre: la misma malla, un poco mas grande, dibujada por su
   cara de ATRAS, asi que lo unico que asoma es un borde alrededor de la
   silueta. Lo que no es lo de siempre es como se agranda: escalando la matriz de
   la instancia, un bloque de doce bloques de ancho tendria un borde doce veces
   mas grueso que uno de uno. Aca la cascara se infla en el shader UN NUMERO FIJO
   DE BLOQUES —`uAncho`— dividido por la escala de cada instancia, que se lee de
   las columnas de `instanceMatrix`. Un bloque de 0,04 son dos pixeles en un
   telefono: eso es «muy fino». Los solidos se inflan por `sign(position)` —una
   caja crece derecho en sus tres ejes— y las piezas redondas por la normal. */
const ANCHO_CONTORNO = 0.042;
function matContorno(porNormal){
  const m = new T.MeshBasicMaterial({ color: 0x07080e, side: T.BackSide, fog: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uAncho = { value: ANCHO_CONTORNO };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uAncho;')
      .replace('#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 escI = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        #else
          vec3 escI = vec3(1.0);
        #endif
        ` + (porNormal ? 'transformed += normalize(normal)*uAncho/escI;'
                       : 'transformed += sign(position)*uAncho/escI;'));
    m.userData.sh = sh;
  };
  return m;
}
const matBordeCaja = matContorno(false);
const matBordeRedondo = matContorno(true);
/* el contorno de los picos es del color del pico oscurecido y no negro: un pico
   blanco con borde negro se lee a dibujo de otro juego encima del nuestro */
const matBordePico = matContorno(true); matBordePico.color.setHex(0x1a2030);
const matPortalAro = new T.MeshBasicMaterial({ color: 0xffffff });
const matPortalFondo = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.26,
                                                 depthWrite: false, side: T.DoubleSide });
/* los adornos de adentro del mapa: piedra mate detras del plano de juego, y las
   luces sin luz, que es lo que las hace leer a luces */
const matAdorno = new T.MeshToonMaterial({ color: 0x1e2536, gradientMap: TOON });
const matAdornoLuz = new T.MeshBasicMaterial({ color: 0xffffff });
/* la capa de ADELANTE: translucida a proposito. Lo que pasa por delante del
   jugador no puede tapar un pico, asi que se ve a traves, y no escribe
   profundidad para que dos que se crucen no se recorten */
const matFrente = new T.MeshBasicMaterial({ transparent: true, opacity: 0.44, depthWrite: false,
                                            color: 0xffffff, fog: false });
/* el portal late con el compas: la matriz de cada uno se reescribe por cuadro,
   que son ocho matrices y ninguna llamada de dibujo */
/* ── Y EL PORTAL DE VELOCIDAD ES MAS CHICO Y MAS BAJO ──
   En GD el portal de velocidad no es un ovalo de piso a techo: es una flecha
   baja que se cruza sin poder esquivarla. Aca es el mismo ovalo a un tercio de
   alto, apoyado abajo, del color de la velocidad a la que lleva. */
function ponPortales(pulso){
  if (!INST.portalAro) return;
  const s = 1 + pulso*0.05;
  MUNDO.portales.forEach((p, i) => {
    const vel = p.t === 'vel';
    _m4.compose(new T.Vector3(p.x, vel ? 2.0 : 5.2, -PROF/2 + 0.35), _q.identity(),
                new T.Vector3((vel ? 0.62 : 0.95)*s, (vel ? 2.1 : 5.4)*s, 1));
    INST.portalAro.setMatrixAt(i, _m4); INST.portalFondo.setMatrixAt(i, _m4);
  });
  INST.portalAro.instanceMatrix.needsUpdate = true;
  INST.portalFondo.instanceMatrix.needsUpdate = true;
  matPortalFondo.opacity = 0.20 + pulso*0.18;
}
/* ── EL FALDON DEL SUELO VA SIN LUZ, Y ESA ES LA RAZON DE QUE EXISTA ──
   La cara de adelante del piso, con Lambert y una luz casi vertical, medida en la
   captura daba (1, 3, 7): negra. Son ochenta y cinco pixeles de los 412 —el 21 %
   de la pantalla— sin un solo dato. Un material SIN LUZ no depende del angulo ni
   de la sombra y no puede salir negro; el degradado vertical le da el aire de
   estar iluminado desde arriba, que es lo que hace que se lea a canto de terreno. */
function lienzoFaldon(){
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#8a8a8a'); gr.addColorStop(1, '#1d1d1d');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const matFaldon = new T.MeshBasicMaterial({ map: lienzoFaldon(), color: 0x3d4a63 });
/* ── UN FALDON DE COSTADO SE PROBO, SE MIDIO Y SE DESCARTO ──
   La cuna oscura de la esquina de arriba parecia ser el CORTE de la losa del
   techo —140 bloques de fondo vistos desde cinco al costado— asi que se le puso
   el mismo faldon sin luz que a la cara de adelante. Y no era: pintando la
   escena con las NORMALES, la cuna resulto DOS superficies encimadas —una que
   mira a +X, que era el faldon nuevo, y detras una que mira ABAJO, que es la cara
   de abajo del techo—. O sea que el faldon tapaba con un plano claro un problema
   que estaba detras. Y encima un plano sin luz no puede ganar en los dos sitios:
   medido, con 0x2b344a se veia demasiado OSCURO contra el cielo de atardecer y
   demasiado CLARO adentro del pasillo de la onda, donde salia como dos triangulos
   beige cruzando la pantalla. Lo que si arreglo la cuna fue la niebla: llevada al
   color del horizonte medido de la foto, el corte se disuelve solo. */

const GEO = {
  caja: new T.BoxGeometry(1, 1, 1),
  /* el pico es una piramide de cuatro caras: `ConeGeometry` con cuatro lados */
  pico: new T.ConeGeometry(0.72, 1, 4, 1),
  esfera: new T.SphereGeometry(0.5, 14, 10),
  aro: new T.TorusGeometry(0.40, 0.09, 8, 18),
  sierra: new T.CylinderGeometry(0.5, 0.5, 0.28, 12),
  part: new T.BoxGeometry(1, 1, 1),
  /* el portal de Geometry Dash es un OVALO y no una columna: un anillo en el
     plano XY que se estira en Y, con un relleno translucido */
  aroPortal: new T.TorusGeometry(1, 0.075, 8, 40),
  disco: new T.CircleGeometry(1, 40),
  /* el anillo de la explosion y la cupula del ovni */
  anillo: new T.TorusGeometry(1, 0.06, 6, 40),
  cupula: new T.SphereGeometry(0.5, 16, 8, 0, Math.PI*2, 0, Math.PI/2)
};

/* ══════════ EL CIELO Y LA REJA ══════════
   El cielo va PEGADO A LA CAMARA, asi que no tiene paralaje: es un telon. La reja
   va PLANTADA EN EL MUNDO a z = −28 y su paralaje sale de la perspectiva, gratis
   y sin un solo numero que mantener — que es justo lo que en 2D habia que escribir
   a mano con un factor 0,5. */
/* ── EL CIELO EN EL HORIZONTE VALE EXACTAMENTE LO QUE LA NIEBLA ──
   Y ese numero no se elige: se resuelve. El cielo es un gris multiplicado por
   `CIELO_K` veces el color del nivel, y la niebla es ese color a secas, asi que
   para que el borde lejano del suelo se funda con el cielo hace falta
   `gris_lineal · CIELO_K = 1`, o sea gris 0,4545 en lineal = 180 en sRGB. Con
   otro valor queda una LINEA DURA cruzando la pantalla a la altura del horizonte
   —medida en la captura— y las tres capas de torres cortan todas en esa misma
   fila, asi que se leen apoyadas en una repisa en vez de a tres distancias.
   Por debajo del horizonte el gris se queda quieto: ahi el suelo tapa todo, y si
   siguiera bajando el poco que asoma entre las torres delataria el empalme. */
const CIELO_K = 2.2;
function lienzoCielo(){
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  const gris = Math.round(255*Math.pow(1/CIELO_K, 1/2.2));
  const hex = '#' + gris.toString(16).padStart(2, '0').repeat(3);
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, hex);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  g.fillStyle = hex; g.fillRect(0, 64, 4, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const matCielo = new T.MeshBasicMaterial({ map: lienzoCielo(), depthWrite: false, fog: false });
const cielo = new T.Mesh(new T.PlaneGeometry(1, 1), matCielo);
cielo.renderOrder = -10; cielo.frustumCulled = false;
cam.add(cielo);

/* ══════════ EL TELON DE FOTO ══════════
   ── VA PEGADO A LA CAMARA, IGUAL QUE EL CIELO ──
   Puesto en el mundo habria que resolver la perspectiva: un punto en y = 0 a
   ciento noventa unidades NO cae en la misma linea de pantalla que el piso, que
   esta a diez — cae veinte veces mas cerca del centro. Pegado a la camara, el
   paralaje se hace corriendo la TEXTURA, y el borde de abajo se coloca resolviendo
   la unica ecuacion que hay: dos puntos caen en la misma linea de pantalla cuando
   `y/dist` coincide, o sea `y_telon = -190·camY/camZ`.

   ── Y SE REPITE EN ESPEJO ──
   Ninguna de estas fotos es continua por los bordes y coserlas ensucia el centro,
   que es lo que mas se mira. Con `MirroredRepeat` la copia de al lado va dada
   vuelta, o sea que los dos bordes que se tocan son EL MISMO borde: la costura no
   puede existir. Es la regla que ya ordeno las texturas de BARRIO. */
const TELON_Z = -190, TELON_COPIAS = 1.25, TELON_PARALAJE = 0.10;
const matTelon = new T.MeshBasicMaterial({ transparent: true, opacity: 0,
                                           depthWrite: false, fog: false });
const telon = new T.Mesh(new T.PlaneGeometry(1, 1), matTelon);
telon.renderOrder = -9; telon.frustumCulled = false; telon.visible = false;
cam.add(telon);
const TELON_TEX = {};
let telonProp = 2.36;
/* ── LA FOTO NO REEMPLAZA NADA HASTA QUE LLEGA ──
   Un data URI se decodifica de forma asincronica: el telon nace apagado y se
   enciende cuando la textura esta lista. Si una falla, ese nivel se dibuja como
   se dibujaba antes —cielo en degradado y las tres capas de rombos— y no hay un
   solo cuadro en negro. */
function telonCarga(){
  if (typeof IMG === 'undefined') return;
  for (const k of ['p0']){
    const t = new T.TextureLoader().load(IMG[k], () => { TELON_TEX[k].listo = true; });
    t.wrapS = T.MirroredRepeatWrapping; t.wrapT = T.ClampToEdgeWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.repeat.set(TELON_COPIAS, 1);
    TELON_TEX[k] = { tex: t, listo: false,
                     prop: (IMG_TAM[k][0]/IMG_TAM[k][1]) };
  }
  decoCarga();
}
/* ── QUE PIEZAS ESTAN APAGADAS A MANO ──
   Lo consulta el dibujo, y no alcanza con poner `visible = false` desde afuera:
   el telon y la decoracion se prenden solos en cada cuadro —dependen de si su
   textura ya decodifico— asi que un apagado externo dura exactamente un cuadro y
   la foto de diagnostico sale con la pieza puesta. Ya paso: cuatro capturas de
   aislamiento salieron identicas y me llevaron a descartar dos piezas que en
   realidad nunca se habian apagado. */
const OCULTO = {};
function ponTelon(){
  const e = TELON_TEX.p0;
  if (!e || !e.listo || OCULTO.telon){ telon.visible = false; return; }
  if (matTelon.map !== e.tex){ matTelon.map = e.tex; matTelon.needsUpdate = true;
                               telonProp = e.prop; }
  /* la opacidad va hacia lo que pide el estilo: en el neon y en el blanco el
     telon se apaga, y apagado no se dibuja */
  const obj = ESTILO.telon;
  matTelon.opacity += (obj - matTelon.opacity)*0.08;
  if (Math.abs(matTelon.opacity - obj) < 0.01) matTelon.opacity = obj;
  telon.visible = matTelon.opacity > 0.01;
  if (!telon.visible) return;
  /* el corrimiento de la textura ES el paralaje: mover la camara un bloque tiene
     que correr la imagen `p` bloques de pantalla, o sea `p/VISTA_ANCHO` del ancho
     del plano, o sea eso por las copias que caben */
  e.tex.offset.x = -CAM.x*TELON_PARALAJE*TELON_COPIAS/VISTA_ANCHO;
  const H = Math.abs(TELON_Z)*Math.tan(FOV_Y*Math.PI/360);
  const w = 2*H*cam.aspect*1.02, h = w/telonProp;
  const abajo = -Math.abs(TELON_Z)*cam.position.y/Math.max(0.001, cam.position.z);
  telon.position.set(0, abajo + h*0.5, TELON_Z);
  telon.scale.set(w, h, 1);
}

function lienzoReja(){
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, n, n);
  g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  g.strokeRect(0.5, 0.5, n - 1, n - 1);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}
const texReja = lienzoReja();
const matReja = new T.MeshBasicMaterial({ map: texReja, color: 0x2de2a8, transparent: true,
                                          opacity: 0.16, depthWrite: false, alphaMap: texReja });
const reja = new T.Mesh(new T.PlaneGeometry(2600, 300), matReja);
reja.position.set(600, 70, -175);
texReja.repeat.set(2600/4, 300/4);          /* una celda cada cuatro bloques: la grilla del compas */
esc3.add(reja);

/* ══════════ LA DECORACION DE FONDO: SPRITES EN PARALAJE ══════════
   ── EL PARALAJE NO SE PROGRAMA: SALE DE LA PERSPECTIVA ──
   Los sprites van PLANTADOS en el mundo a tres profundidades y su velocidad
   relativa es la que la camara les da. En 2D esto eran tres factores que habia
   que mantener a mano; en 3D es geometria y no puede desincronizarse.

   ── Y LO QUE SE FUE SON LOS ROMBOS ──
   Antes el fondo eran tres capas de rombos y torres dibujados por codigo, con un
   estilo por nivel. Con UN nivel y una foto de horizonte detras, esas capas
   dejaban de aportar silueta y solo ensuciaban: lo que aporta ahora son trece
   objetos DIBUJADOS —cristales, arcos, nubes, engranajes, palmeras, faroles— que
   es lo que el pedido llama sprites de fondo.

   ── UNA MALLA POR SPRITE, Y NO UN ATLAS CON UN SHADER ──
   Un atlas con UV por instancia pide parchear el shader; trece mallas
   instanciadas cuestan trece llamadas de dibujo y ninguna linea de GLSL. A
   diecinueve llamadas de base, trece mas no mueven el cuadro, y cada sprite
   conserva su propia transparencia y su propia proporcion. */
/* ── LAS TRES CAPAS, Y CADA SPRITE VIVE EN UNA SOLA ──
   La primera version ponia los TRECE sprites en las TRES capas con nueve copias
   cada uno: 351 objetos sobre 332 bloques, o sea uno por bloque. Medido en la
   foto, lo que aparecio no fue profundidad sino una CINTA continua de calcomanias
   pegada a la altura del juego, con los mismos valores que el nivel — los orbes
   amarillos del final se perdian contra un arbusto. Con un sprite por capa la
   cinta se parte en tres, y cada capa estrena su propio vocabulario de formas,
   que es lo que de verdad se lee a distancia. */
/* ── EL TAMANO APARENTE SE CUENTA, Y ERA DE BLOQUE ──
   Un objeto a `z` se ve `9,9/(9,9+|z|)` veces su tamano, porque el plano de juego
   esta a 9,9 de la camara. Con la capa de cerca a −34 y 3,4 de alto, un sprite del
   fondo aparecia midiendo **un bloque** — o sea exactamente lo que mide un
   obstaculo, y en el pasillo de la onda una estrella del fondo se leia a moneda.
   Las tres capas estan puestas para que NINGUNA pase de un bloque aparente: 0,36
   a 0,81 · 0,39 a 0,86 · 0,48 a 1,07, y la ultima encima llega con un 76 % de
   niebla. Y el fondo no se va mas lejos que eso porque la niebla lo cerraria: con
   densidad 0,013, a 150 bloques no queda nada que mirar. */
const DECO_Z = [-34, -60, -92];              /* cerca, medio, lejos */
const DECO_ESC = [2.6, 4.4, 8.0];            /* alto en bloques por capa */
/* ── Y LA PERSPECTIVA AEREA VA POR INSTANCIA, NO POR MATERIAL ──
   Una malla tiene UN color y sus instancias viven en las tres capas, asi que el
   tinte por capa tiene que ir en `instanceColor`. Sin el, la capa de 124 bloques
   sale igual de viva que la de 34 y las tres se leen a la misma distancia: eso
   es exactamente lo que hacia que el fondo se pegara encima del nivel. */
/* ── Y LA CAPA DE CERCA TAMBIEN SE APAGA, PORQUE COMPITE ──
   Medido en la foto del pasillo de la onda: con la capa de cerca al 0,92 una
   estrella del fondo se ve del mismo tamano y del mismo valor que un bloque, y
   en un pasillo donde hay que esquivar eso no es decoracion, es un obstaculo que
   no existe. El fondo tiene que estar CLARAMENTE detras en valor, no solo en z. */
const DECO_BRI = [0.86, 0.72, 0.58];         /* cuanto sobrevive de cada capa */
const DECO_N = [4, 6, 8];                    /* copias: pocas y grandes cerca */
const DEC = [];
function decoCarga(){
  if (typeof DECO === 'undefined' || !DECO.length) return;
  for (let i = 0; i < DECO.length; i++){
    const e = DECO[i];
    const t = new T.TextureLoader().load(e.d, () => { DEC[i].listo = true; });
    t.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshBasicMaterial({ map: t, transparent: false, alphaTest: 0.45,
                                          depthWrite: true, color: 0xffffff });
    /* la capa la decide el indice del sprite: un sprite = una distancia */
    const capa = i % DECO_Z.length;
    const m = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, DECO_N[capa]);
    m.frustumCulled = false; m.renderOrder = -5; m.visible = false;
    esc3.add(m);
    DEC.push({ mat, malla: m, prop: e.p, listo: false, capa });
  }
}
/* ── Y SE REPARTEN CON UN AZAR CON SEMILLA, NO CON `Math.random` ──
   Si el sitio de cada objeto se sorteara por cuadro, el fondo parpadearia; y si
   se sorteara al arrancar, el nivel se veria distinto en cada intento. Con la
   posicion como semilla, el fondo ES parte del nivel. */
function armaDeco(N){
  if (!DEC.length) return;
  for (let i = 0; i < DEC.length; i++){
    const D = DEC[i], m = D.malla, capa = D.capa;
    const n = DECO_N[capa];
    const paso = (MUNDO.largo + 90)/n;
    /* flotar o apoyarse no puede depender de la capa: si dependiera, todas las
       nubes quedarian a la misma distancia y el cielo se leeria a una sola capa */
    const flota = ((((i*2654435761) >>> 0) % 5) < 2);
    for (let j = 0; j < n; j++){
      const h = ((((i*2654435761 + j*40503 + capa*1013904223) >>> 0) ^ 0x9e3779b9) >>> 0)/4294967296;
      const h2 = (((i*374761393 + j*668265263 + capa*2246822519) >>> 0))/4294967296;
      const alto = DECO_ESC[capa]*(0.62 + 0.76*h2);
      const ancho = alto*D.prop;
      /* apoyado se hunde un poco en la losa —asi el borde de abajo no dibuja una
         linea recta de punta a punta— y flotando sube con la capa */
      const y = flota ? 5.0 + h*7.5 + capa*2.2 : alto*0.5 - alto*0.16;
      const x = -30 + (j + h)*paso;
      _m4.compose(_v.set(x, y, DECO_Z[capa] + h2*6),
                  _q.identity(), _v2.set(ancho, alto, 1));
      m.setMatrixAt(j, _m4);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  }
}

/* ── LAS MOTAS LEJANAS ──
   Son lo unico del fondo que se mueve por su cuenta, y late con el compas: un
   cielo perfectamente quieto detras de un juego de ritmo se lee a papel tapiz.
   Van instanciadas y su posicion sale de una semilla, asi que no hay estado que
   guardar ni un array de doscientas cosas que recorrer en JavaScript. */
const matMotas = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true,
                                           opacity: 0.5, depthWrite: false });
const MOTAS_TOPE = 180;
const mMotas = new T.InstancedMesh(new T.PlaneGeometry(1, 1), matMotas, MOTAS_TOPE);
mMotas.frustumCulled = false; mMotas.renderOrder = -6;
esc3.add(mMotas);

/* ══════════ LAS MALLAS DEL NIVEL ══════════
   Se rearman cuando cambia el nivel, y el disparador es una REVISION que
   `generaNivel` incrementa: con una llamada explicita, el dia que se agregue un
   camino que genere un nivel (el demo del menu, una sonda) se olvida y se dibuja
   el nivel anterior. */
let REV3D = -1;
const INST = { sol: null, piso: null, canto: null, pico: null, pad: null, orbe: null,
               faldon: null };
const SUELTOS = [];                          /* sierras, monedas y portales */

function tiraInst(k){
  if (INST[k]){ esc3.remove(INST[k]); INST[k].dispose(); INST[k] = null; }
}
function nuevaInst(k, geo, mat, n, sombra){
  tiraInst(k);
  if (!n) return null;
  const m = new T.InstancedMesh(geo, mat, n);
  m.frustumCulled = false;
  m.castShadow = !!sombra; m.receiveShadow = !!sombra;
  esc3.add(m); INST[k] = m; return m;
}

const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _v = new T.Vector3(),
      _v2 = new T.Vector3(), _e = new T.Euler();
function ponCaja(malla, i, x, y, w, h, z, d){
  _m4.compose(new T.Vector3(x + w/2, y + h/2, (z == null ? -PROF/2 : z)),
              _q.identity(), new T.Vector3(w, h, d == null ? PROF : d));
  malla.setMatrixAt(i, _m4);
}

function mundo3D(){
  const N = NIVELES[MUNDO.nivel];
  ponPaleta(N);

  /* los solidos van en DOS mallas —el piso y el resto— porque son dos colores y
     un `InstancedMesh` tiene un solo material */
  const pisos = MUNDO.sol.filter(r => r.t === 'piso' || r.t === 'techo');
  const cajas = MUNDO.sol.filter(r => r.t !== 'piso' && r.t !== 'techo');
  /* ── EL PISO RECIBE SOMBRA PERO NO LA PROYECTA ──
     Es una losa de cuarenta y seis bloques de fondo: proyectando, el techo del
     pasillo de la nave sombrea el suelo ENTERO y lo que aparece son manchones
     oscuros con el borde del mapa de sombra dibujado. Medido en la foto del
     tramo de nave, tres manchas en el medio del pasillo. Proyectan los bloques y
     el jugador, que son lo que hay que poder apoyar. */
  const mp = nuevaInst('piso', GEO.caja, matPiso, pisos.length, false);
  mp.receiveShadow = true;
  pisos.forEach((r, i) => {
    const d = r.t === 'techo' ? PROF_TECHO : PROF_PISO;
    ponCaja(mp, i, r.x, r.y, r.w, r.h, -d/2, d);
  });
  mp.instanceMatrix.needsUpdate = true;

  /* el faldon: un plano por delante de la cara de adelante de cada piso */
  const mf = nuevaInst('faldon', new T.PlaneGeometry(1, 1), matFaldon, pisos.length, false);
  pisos.forEach((r, i) => {
    _m4.compose(new T.Vector3(r.x + r.w/2, r.y + r.h/2, 0.012), _q.identity(),
                new T.Vector3(r.w, r.h, 1));
    mf.setMatrixAt(i, _m4);
  });
  mf.instanceMatrix.needsUpdate = true;

  const mc = nuevaInst('sol', GEO.caja, matSol, cajas.length, true);
  cajas.forEach((r, i) => ponCaja(mc, i, r.x, r.y, r.w, r.h));
  if (mc) mc.instanceMatrix.needsUpdate = true;
  /* ── LA CASCARA DEL CONTORNO COMPARTE LAS MATRICES, NO LAS COPIA ──
     Es la misma geometria con el material de contorno y EL MISMO buffer de
     matrices de instancia: si se copiara, el dia que un bloque se mueva el borde
     se queda donde estaba. Y como `frustumCulled` esta apagado en las dos, la
     cascara no puede desaparecer un cuadro antes que su bloque. */
  const mcb = nuevaInst('solBorde', GEO.caja, matBordeCaja, cajas.length, false);
  if (mcb){ mcb.instanceMatrix = mc.instanceMatrix; mcb.renderOrder = -1; }

  /* ── EL CANTO LUMINOSO VA EN LA CARA EN LA QUE SE APOYA ──
     Arriba en el piso y los bloques; ABAJO en un techo, porque ahi se apoya por
     debajo. Dibujado siempre arriba, el techo del tramo de gravedad invertida
     quedaba con su linea del lado que no se ve y el cubo colgaba de la nada. */
/* ── Y ES UN LABIO EN EL CANTO DE ADELANTE, NO UNA TAPA ──
     Cubriendo el fondo entero, lo que se ve desde arriba es una SUPERFICIE
     luminosa de bloque y medio: medido en la foto, el suelo salia como una losa
     de menta y el juego se leia a plataforma de otro color. El labio se ve de
     frente y de refilon, y la cara de arriba queda oscura, que es como se lee un
     borde encendido. */
  const gr = 0.14, lab = 0.22;
  const mk = nuevaInst('canto', GEO.caja, matCanto, MUNDO.sol.length, false);
  MUNDO.sol.forEach((r, i) => {
    const arriba = r.t !== 'techo';
    ponCaja(mk, i, r.x, arriba ? r.y + r.h - gr : r.y, r.w, gr, 0.01, lab);
  });
  mk.instanceMatrix.needsUpdate = true;

  /* los picos: una piramide, y los invertidos son la misma girada media vuelta */
  const picos = MUNDO.mat.filter(r => r.t === 'pico' || r.t === 'picoInv');
  const mi = nuevaInst('pico', GEO.pico, matPico, picos.length, true);
  picos.forEach((r, i) => {
    const inv = r.t === 'picoInv';
    _e.set(0, Math.PI/4, inv ? Math.PI : 0);
    _m4.compose(new T.Vector3(r.x + r.w/2, r.y + r.h/2, -PROF/2),
                _q.setFromEuler(_e), new T.Vector3(1, r.h, 1));
    mi.setMatrixAt(i, _m4);
  });
  if (mi) mi.instanceMatrix.needsUpdate = true;
  const mib = nuevaInst('picoBorde', GEO.pico, matBordePico, picos.length, false);
  if (mib){ mib.instanceMatrix = mi.instanceMatrix; mib.renderOrder = -1; }

  /* ── LOS ADORNOS DE ADENTRO DEL MAPA ──
     Columnas, capiteles, postes y cadenas detras del plano de juego —en dos
     mallas, la piedra y las luces— con su cascara de contorno. Salen de
     `MUNDO.adornos`, que el generador arma por tramo con el estilo de cada uno. */
  const ad = (MUNDO.adornos || []);
  const piedra = ad.filter(a => a.t !== 'luz'), luces = ad.filter(a => a.t === 'luz');
  const mad = nuevaInst('adorno', GEO.caja, matAdorno, piedra.length, false);
  piedra.forEach((a, i) => ponCaja(mad, i, a.x, a.y, a.w, a.h, a.z, a.d));
  if (mad){ mad.instanceMatrix.needsUpdate = true; mad.receiveShadow = true; }
  const madb = nuevaInst('adornoBorde', GEO.caja, matBordeCaja, piedra.length, false);
  if (madb){ madb.instanceMatrix = mad.instanceMatrix; madb.renderOrder = -1; }
  const mal = nuevaInst('adornoLuz', GEO.caja, matAdornoLuz, luces.length, false);
  luces.forEach((a, i) => ponCaja(mal, i, a.x, a.y, a.w, a.h, a.z, a.d));
  if (mal) mal.instanceMatrix.needsUpdate = true;
  armaFrente();

  const mpa = nuevaInst('pad', GEO.caja, matPad, MUNDO.pads.length, false);
  MUNDO.pads.forEach((p, i) => ponCaja(mpa, i, p.x, p.y + 0.02, 1, 0.20, -PROF/2, PROF*0.8));
  if (mpa) mpa.instanceMatrix.needsUpdate = true;

  /* ── LOS ORBES VAN CADA UNO DE SU COLOR, Y ES INFORMACION ──
     En este genero el color del orbe ES la regla: amarillo salta, rosa salta
     poco, rojo salta mucho, azul da vuelta la gravedad. Con todos del mismo
     color habria que aprenderse de memoria cual es cual, y eso no es dificultad.
     Sale gratis: `setColorAt` sobre la misma malla instanciada. */
  const mo = nuevaInst('orbe', GEO.aro, matOrbe, MUNDO.orbes.length, false);
  MUNDO.orbes.forEach((o, i) => {
    _m4.compose(new T.Vector3(o.x, o.y, -PROF/2 + 0.5), _q.identity(),
                new T.Vector3(1, 1, 1));
    mo.setMatrixAt(i, _m4);
    mo.setColorAt(i, _c.setStyle(ORBE_COL[o.t] || '#ffd447'));
  });
  if (mo){ mo.instanceMatrix.needsUpdate = true;
           if (mo.instanceColor) mo.instanceColor.needsUpdate = true; }
  /* y los pads igual */
  MUNDO.pads.forEach((p, i) => {
    if (INST.pad) INST.pad.setColorAt(i, _c.setStyle(PAD_COL[p.t] || '#ffd447'));
  });
  if (INST.pad && INST.pad.instanceColor) INST.pad.instanceColor.needsUpdate = true;

  /* ── LAS SIERRAS, LAS MONEDAS Y LOS PORTALES VAN SUELTOS ──
     Son pocos —cinco, tres y ocho— y CADA UNO SE MUEVE POR SU CUENTA: girar una
     instancia obliga a reescribir su matriz cada cuadro y a subir el buffer
     entero, que para ocho objetos cuesta mas que ocho llamadas de dibujo. */
  for (const m of SUELTOS) esc3.remove(m);
  SUELTOS.length = 0;
  for (const s of MUNDO.sierras){
    const m = new T.Mesh(GEO.sierra, matSierra);
    m.position.set(s.x, s.y, -PROF/2);
    m.scale.set(s.r*2.1, 1, s.r*2.1);
    m.rotation.x = Math.PI/2;
    m.userData.sierra = s; m.castShadow = true;
    esc3.add(m); SUELTOS.push(m);
  }
  for (const c of MUNDO.monedas){
    const m = new T.Mesh(GEO.aro, matMoneda);
    m.position.set(c.x, c.y, -PROF/2 + 0.5);
    m.scale.setScalar(0.95);
    m.userData.moneda = c;
    esc3.add(m); SUELTOS.push(m);
  }
  /* ── LOS PORTALES SON OVALOS, COMO EN GD, Y VAN INSTANCIADOS ──
     Eran ocho columnas translucidas, o sea ocho llamadas de dibujo para ocho
     cajas. Un portal de Geometry Dash es un ovalo alto con borde y relleno del
     color del modo al que lleva: el borde es un toro estirado en Y y el relleno
     un disco, y los ocho van en DOS mallas instanciadas con el color por
     instancia. Es alto —5,4 bloques de semieje— porque el disparador es solo la
     x y hay que poder entrar a cualquier altura del pasillo. */
  const np = MUNDO.portales.length;
  const ma = nuevaInst('portalAro', GEO.aroPortal, matPortalAro, np, false);
  const mfp = nuevaInst('portalFondo', GEO.disco, matPortalFondo, np, false);
  if (ma){
    ma.instanceColor = new T.InstancedBufferAttribute(new Float32Array(np*3), 3);
    mfp.instanceColor = new T.InstancedBufferAttribute(new Float32Array(np*3), 3);
    mfp.renderOrder = 1;
    MUNDO.portales.forEach((p, i) => {
      _c.set(p.t === 'vel' ? (VEL_COL[p.k] || '#5ad9ff') : (MODO_COL[p.t] || '#2de2a8'));
      ma.setColorAt(i, _c); mfp.setColorAt(i, _c);
    });
    ma.instanceColor.needsUpdate = true; mfp.instanceColor.needsUpdate = true;
    ponPortales(0);
  }

  armaDeco(N);
  armaMotas(N);

  REV3D = MUNDO.rev;
}

/* ── LAS MOTAS SE REPARTEN POR EL NIVEL Y A TRES PROFUNDIDADES ──
   Cuantas hay lo dice el nivel; donde cae cada una sale de su indice, asi que no
   hay estado que guardar ni un array que recorrer en JavaScript. */
function armaMotas(N){
  /* las motas: repartidas por el nivel y a tres profundidades */
  const nm = Math.min(MOTAS_TOPE, N.motas || 90);
  for (let i = 0; i < MOTAS_TOPE; i++){
    if (i >= nm){ _m4.compose(_v.set(0, -999, 0), _q.identity(), _v2.set(0, 0, 0)); }
    else {
      const h = ((i*2246822519) >>> 0)/4294967296, h2 = ((i*3266489917) >>> 0)/4294967296;
      const s = (0.10 + h2*0.22)*3.2;
      _m4.compose(_v.set(-30 + h*(MUNDO.largo + 90), 3 + h2*22, -80 - h*70),
                  _q.identity(), _v2.set(s, s, 1));
    }
    mMotas.setMatrixAt(i, _m4);
  }
  mMotas.instanceMatrix.needsUpdate = true;
}

/* ══════════ LA CAPA DE ADELANTE ══════════
   ── LO QUE EL PEDIDO LLAMA «TODO POR ENFRENTE, NO SOLO POR ATRAS» ──
   Los mismos sprites del fondo, plantados a z POSITIVA —entre la camara y el
   plano de juego— asi que pasan por delante del jugador y su paralaje es mayor
   que el del nivel: es lo que en GD hace la capa de «foreground». Tres reglas,
   las tres por el juego y no por la imagen:
   · TRANSLUCIDA al 44 %: lo que va por delante puede cruzarse con un pico, y un
     pico tapado es una muerte que no se ve venir. (Al 30 % y con cinco por tramo
     no existia: medido, apagarla movia el brillo medio 0,5 sobre 255.)
   · SOLO EN LOS TRAMOS QUE LA PIDEN (`frente` en la tabla): puesta en los
     dieciocho seria ruido permanente y dejaria de leerse como un cambio.
   · Y CHICA: a z = 4,2 la perspectiva agranda 1,74 veces, asi que un sprite de
     0,9 bloques se ve de 1,6. Mas grande que eso compite con el nivel. */
const FRENTE_Z = 4.2, FRENTE_N = 16, FRE = [];
function armaFrente(){
  for (const m of FRE) esc3.remove(m);
  FRE.length = 0;
  if (!DEC.length) return;
  const tramos = (MUNDO.tramos || []).filter(T => T.frente);
  if (!tramos.length) return;
  /* cuatro sprites distintos, elegidos por indice fijo para que sean los mismos
     en cada intento; cada uno con su malla porque cada uno tiene su textura */
  const idx = [2, 5, 7, 10].filter(i => i < DEC.length);
  idx.forEach((i, k) => {
    const D = DEC[i];
    const mat = matFrente.clone(); mat.map = D.mat.map; mat.alphaTest = 0.2;
    const n = tramos.length*FRENTE_N;
    const m = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, n);
    m.frustumCulled = false; m.renderOrder = 20;
    let j = 0;
    for (const T of tramos){
      const paso = T.w/FRENTE_N;
      for (let q = 0; q < FRENTE_N; q++){
        const h = ((((i*2654435761 + q*40503 + k*1013904223 + (T.x | 0)*7919) >>> 0) ^ 0x9e3779b9) >>> 0)/4294967296;
        const h2 = (((i*374761393 + q*668265263 + (T.x | 0)*2246822519) >>> 0))/4294967296;
        const alto = 0.50 + 0.36*h2, ancho = alto*D.prop;
        /* ── EN LOS DOS MARGENES DE LA PANTALLA, Y ESO ES UNA CUENTA ──
           Un punto a z = 4,2 se proyecta como si estuviera en
           `camY + (y − camY)·9,9/(9,9 − 4,2)`, o sea 1,74 veces mas lejos del
           centro. La banda visible sobre el plano de juego es camY ± 4,6, asi
           que en el plano de adelante se ve solo camY ± 2,65: con la camara en
           2,8, de 0,2 a 5,4. La primera version los ponia en y 5,4 a 8,4 y en
           −1,2 a −2,0 —«arriba y abajo del cuadro»— y medido eso es FUERA del
           cuadro: de 180 instancias, una en pantalla, y en el borde. El margen
           de arriba es y 4,75 a 5,25 (se proyecta en 6,2 a 7,1) y el de abajo
           0,55 a 0,95 (se proyecta en el faldon, −1,1 a −0,4). Y van dieciseis
           por sprite y tramo: con nueve, medido, habia UNA en pantalla. */
        const y = h < 0.6 ? 4.75 + h*0.5 : 0.55 + h2*0.4;
        const x = T.x + (q + 0.2 + 0.6*h)*paso + k*paso*0.25;
        _m4.compose(_v.set(x, y, FRENTE_Z + k*0.15), _q.identity(), _v2.set(ancho, alto, 1));
        m.setMatrixAt(j++, _m4);
      }
    }
    m.count = j; m.instanceMatrix.needsUpdate = true;
    m.userData.deco = D;
    esc3.add(m); FRE.push(m);
  });
}

/* ══════════ EL BARRIDO ══════════
   ── EL CAMBIO DE TRAMO SE ANUNCIA CON UNA CORTINA QUE CRUZA LA PANTALLA ──
   Es la transicion de GD: una franja del color nuevo que barre de izquierda a
   derecha en medio segundo, por delante de todo. Va pegada a la camara —como el
   cielo— asi que no depende de donde este el jugador, y su borde es un degradado
   para que no se lea a rectangulo pegado encima. Se dispara desde `paletaPaso`,
   en el MISMO cuadro en que cambia el color, asi que las dos cosas no pueden
   desincronizarse. */
function lienzoBarrido(){
  const c = document.createElement('canvas'); c.width = 64; c.height = 4;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(255,255,255,1)');
  gr.addColorStop(0.65, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const matBarrido = new T.MeshBasicMaterial({ map: lienzoBarrido(), transparent: true, opacity: 0.62,
                                             depthWrite: false, depthTest: false, fog: false, color: 0xffffff });
const mBarrido = new T.Mesh(new T.PlaneGeometry(1, 1), matBarrido);
mBarrido.renderOrder = 40; mBarrido.frustumCulled = false; mBarrido.visible = false;
cam.add(mBarrido);
const BARRE = { t: 0, T: 0.55 };
function barre(col){ BARRE.t = BARRE.T; matBarrido.color.set(col); }
function barrePaso(dt){
  if (BARRE.t <= 0){ mBarrido.visible = false; return; }
  BARRE.t = Math.max(0, BARRE.t - dt);
  const k = 1 - BARRE.t/BARRE.T;
  const z = -1.2, H = Math.abs(z)*Math.tan(FOV_Y*Math.PI/360), W = H*cam.aspect;
  const ancho = W*0.9;
  mBarrido.visible = true;
  /* de izquierda a derecha, frenando al final: la cortina llega y se disuelve */
  const x = -W - ancho*0.5 + (2*W + ancho)*(1 - Math.pow(1 - k, 2));
  mBarrido.position.set(x, 0, z);
  mBarrido.scale.set(ancho, 2*H*1.05, 1);
  matBarrido.opacity = 0.62*(1 - k*k);
}

/* ══════════ LA PALETA ══════════
   Los materiales son compartidos, asi que cambiar de nivel es reescribir seis
   colores y no reconstruir nada. */
const _c = new T.Color();
const _p1 = new T.Color(), _p2 = new T.Color();
const _pDeco = new T.Color(0xffffff);
const _pa1 = new T.Color(), _pa2 = new T.Color();
const _pb1 = new T.Color(), _pb2 = new T.Color();
const palHex = (v) => (v[0] << 16) | (v[1] << 8) | v[2];

/* ══════════ LOS TRES ESTILOS ══════════
   ── UN ESTILO ES UN PUÑADO DE NUMEROS SOBRE LOS MISMOS MATERIALES ──
   `sol` es el de siempre: el telon de foto, cielo claro, reja tenue. `neon` es
   GD de noche: sin telon, cielo casi negro, la reja fuerte y el canto encendido,
   los bloques mas oscuros. `blanco` es el minimalismo: cielo claro casi blanco,
   bloques oscuros que se recortan, la reja apagada, el pico del color del acento
   en vez de blanco —sobre blanco un pico blanco no existe—. Se aplican con el
   color del tramo y se funden con el, asi que un cambio de estilo es el mismo
   fundido de siete bloques que un cambio de color. */
const ESTILOS = {
  sol:    { telon: 1.0, cieloK: CIELO_K, reja: 0.11, rejaPulso: 0.10, canto: 1.0, picoBlanco: 1, solK: 0.55, pisoK: 0.60, exp: 1.10, motas: 0.28 },
  neon:   { telon: 0.0, cieloK: 0.55,    reja: 0.30, rejaPulso: 0.26, canto: 1.35, picoBlanco: 1, solK: 0.30, pisoK: 0.36, exp: 1.02, motas: 0.55 },
  blanco: { telon: 0.0, cieloK: 3.6,     reja: 0.05, rejaPulso: 0.04, canto: 0.9,  picoBlanco: 0, solK: 0.40, pisoK: 0.46, exp: 1.18, motas: 0.10 }
};
let ESTILO = ESTILOS.sol, ESTILO_NOM = 'sol';
function estiloDe(x){
  const T0 = tramoDe(x);
  return (T0 && ESTILOS[T0.estilo]) ? T0.estilo : 'sol';
}

function ponColores(C1, C2){
  const E = ESTILO;
  matCanto.color.copy(C2).multiplyScalar(E.canto);
  matReja.color.copy(C2);
  /* las capas van del color del tema, y la de CERCA mas apagada: si las tres
     tuvieran el mismo brillo, la profundidad se perderia — lo que da distancia
     no es el tamano sino que lo lejano tenga menos contraste */
  /* la decoracion se tinta A MEDIAS con el acento del tramo: los sprites traen
     su propio color y multiplicarlos por un acento saturado los deja de barro.
     A medias, el cambio de tramo se ve tambien en el fondo. */
  _pDeco.copy(C2).lerp(_c.setHex(0xffffff), 0.68);
  matMotas.color.copy(C2).lerp(_c.setHex(0xffffff), 0.55);
  /* el telon se tinta con el acento del tramo, pero SOLO a medias: la foto ya
     trae su color y multiplicarla por un acento saturado la deja de barro. A
     medias, el cambio de tramo se ve tambien en el horizonte. */
  matTelon.color.copy(C2).lerp(_c.setHex(0xffffff), 0.58);
  matPad.color.setHex(0xffd447);
  /* el cielo se tinta con el color del nivel, y el degradado ya trae la forma */
  matCielo.color.copy(C1).multiplyScalar(E.cieloK);
  /* el pico: blanco en los estilos oscuros, del acento en el blanco */
  if (E.picoBlanco){ matPico.color.setHex(0xeef4ff); matPico.emissive.setHex(0x7f8fa6); }
  else { matPico.color.copy(C2); matPico.emissive.copy(C2).multiplyScalar(0.35); }
  matAdornoLuz.color.copy(C2).lerp(_c.setHex(0xffffff), 0.35);
  /* los adornos van del color del tema hacia una piedra oscura; en el estilo
     blanco el tema ES claro, asi que ahi se toman del acento: sobre un cielo
     casi blanco una columna clara no existe */
  if (E.picoBlanco) matAdorno.color.copy(C1).lerp(_c.setHex(0x1e2536), 0.6);
  else matAdorno.color.copy(C2).lerp(_c.setHex(0x222a3a), 0.5);
  /* ── EL BLOQUE Y EL PISO SALEN DEL COLOR DEL TEMA, PERO POR DEBAJO DEL CIELO ──
     Estaban en dos azules grises escritos a mano, y eso se veia: en el nivel 3
     —que es rojo— el piso salia AZUL y el techo del pasillo de la nave se leia a
     un agujero negro con un labio rosa. Y no se pueden derivar multiplicando sin
     mas: el cielo es `C1 · 2,2`, asi que un multiplicador cerca de eso deja el
     bloque del color del cielo y los muros se ven como rayas flotando (eso ya
     paso). Y multiplicar tampoco sirve: el `C1` del nivel 3 es casi negro, asi
     que `C1 · 1,55` seguia siendo negro — medido en la foto del pasillo de la
     nave, el techo daba **(3, 0, 3)** sobre 255, o sea un agujero. Lo que
     funciona es MEZCLAR hacia un piso de gris: el bloque se queda con el tinte
     del tema y con un valor que no puede caer a cero, y el piso va un escalon
     por encima del bloque, que es lo que los separa. */
  matSol.color.copy(C1).lerp(_c.setHex(0x2b3448), E.solK);
  matPiso.color.copy(C1).lerp(_c.setHex(0x3d4a66), E.pisoK);
  matFaldon.color.copy(C1).lerp(_c.setHex(0x3d4a63), E.pisoK);
  /* en el estilo blanco el cielo es casi blanco y los bloques tienen que ser
     OSCUROS para recortarse: se les baja el valor a la mitad */
  if (!E.picoBlanco){ matSol.color.multiplyScalar(0.45); matPiso.color.multiplyScalar(0.5); matFaldon.color.multiplyScalar(0.5); }
  /* ── Y EL SUELO DEL HEMISFERICO NO PUEDE SER EL COLOR DEL TEMA A SECAS ──
     Un `HemisphereLight` reparte segun hacia donde mira la cara: toda cara que
     mire al PISO recibe `groundColor`, y con el `C1` de este nivel —un ciruela
     casi negro— la cara de abajo del techo de un pasillo sale negra. Son losas
     de ciento cuarenta bloques de fondo, asi que eso no es un matiz: es una cuna
     oscura que cruza un tercio de la pantalla. Lo que rebota desde abajo es el
     suelo iluminado por el atardecer, asi que el color de rebote se mezcla hacia
     el horizonte medido — es la misma cuenta que la niebla y por la misma razon. */
  hemi.color.copy(C2);
  if (typeof IMG_HOR !== 'undefined'){
    hemi.groundColor.setRGB(C1.r*0.55 + IMG_HOR[0]*0.45,
                            C1.g*0.55 + IMG_HOR[1]*0.45,
                            C1.b*0.55 + IMG_HOR[2]*0.45);
  } else hemi.groundColor.copy(C1);
  /* la niebla se crea UNA vez: pasar de sin-niebla a con-niebla obliga a
     recompilar todos los shaders, y hacerlo al cambiar de nivel seria un tiron
     justo en el primer cuadro de la partida */
  /* ── Y LA NIEBLA VA AL COLOR DEL HORIZONTE DE LO QUE HAY DETRAS ──
     Con el cielo en degradado la cuenta cerraba sola: el cielo es `C1 · 2,2` y
     su horizonte es gris `1/2,2`, asi que la niebla es `C1` a secas y el borde
     lejano del suelo se funde. Con el TELON DE FOTO puesto, el horizonte ya no
     es ese gris: es el de la foto. Medido, `C1` de este nivel es un ciruela casi
     negro contra un atardecer naranja, y eso se ve — todo lo que recede sale de
     un color que no esta en ninguna parte del cuadro, y el corte del techo del
     pasillo cruzaba media pantalla como una cuna negra. El color del horizonte
     se mide al hornear (`IMG_HOR`, el promedio en lineal de las ultimas filas
     del recorte, que es justo la fila que cae en y = 0) y se multiplica por el
     tinte del telon, que es lo que el material le hace a la foto: asi la niebla
     y el horizonte son el MISMO producto y no dos cuentas que se separan. */
  /* ── Y CON EL TELON APAGADO LA NIEBLA VUELVE AL CIELO DEL ESTILO ──
     Sin foto detras, el horizonte es el cielo en degradado: `C1 · cieloK` en el
     borde de arriba y gris `1/CIELO_K` abajo, o sea que la niebla es `C1` por la
     relacion entre los dos. En el estilo blanco eso da un gris claro y en el neon
     casi negro, que es lo que hay detras en cada caso. */
  if (typeof IMG_HOR !== 'undefined' && telon.visible && E.telon > 0){
    const tc = matTelon.color;
    NIEBLA.color.setRGB(IMG_HOR[0]*tc.r, IMG_HOR[1]*tc.g, IMG_HOR[2]*tc.b);
  } else NIEBLA.color.copy(C1).multiplyScalar(E.cieloK/CIELO_K);
  sol.color.setHex(0xffffff);
}

/* ── EL COLOR CAMBIA POR TRAMOS, Y EL TRAMO SALE DE LA X ──
   Es lo que hace el genero: cada tanto el fondo entero cambia de color, y eso es
   lo unico que hace que un tema de dos minutos no se sienta un pasillo. El tramo
   NO se cuenta con el reloj de audio sino con la x del jugador —128 bloques son
   32 tiempos, o sea ocho compases— por dos razones: sin audio (el bot, la sonda)
   el reloj de la musica no existe, y como la x SALE del reloj, contar bloques es
   contar compases. El fundido tambien va por x, asi que no depende del `dt` y
   sale igual a 30 y a 144 cuadros. */
/* ── Y EL TRAMO SALE DE LA TABLA DEL NIVEL, NO DE UN MODULO ──
   Con un modulo de 128 bloques el color cambiaba cada ocho compases, que servia
   para un nivel de un solo modo. Aca los tramos SON los modos: el color cambia en
   el portal, o sea en el mismo cuadro en que cambian las reglas, y eso es lo que
   hace que el cambio se vea antes de que se sienta. */
const PAL_FUNDE = 5;
const PAL = { i: -1, x0: 0, listo: false };
function paletaPaso(N){
  const P = (N.pals && N.pals.length) ? N.pals : [[N.col, N.col2]];
  const T0 = tramoDe(JUG.x);
  const sec = T0 ? (T0.pal % P.length) : 0;
  if (sec !== PAL.i){
    if (PAL.i < 0){ _pa1.setHex(palHex(P[sec][0])); _pa2.setHex(palHex(P[sec][1])); }
    else { _pa1.copy(_p1); _pa2.copy(_p2); }
    const nuevo = PAL.i >= 0;
    _pb1.setHex(palHex(P[sec][0])); _pb2.setHex(palHex(P[sec][1]));
    /* ── Y EL CAMBIO SE ANUNCIA CON UN DESTELLO DEL COLOR NUEVO ──
       Sin el destello el cambio se lee a que el juego cambio de nivel; con el, se
       lee a un cambio de tramo del tema. Va DESPUES de fijar el color de destino,
       porque el destello se pinta de ese color. */
    if (nuevo){ destella('#' + _pb2.getHexString(), 0.52); sacude(0.16); barre('#' + _pb2.getHexString()); }
    PAL.i = sec; PAL.x0 = T0 ? T0.x : JUG.x; PAL.listo = false;
    /* el estilo del tramo entra con el color: es la misma decision */
    const en = estiloDe(JUG.x);
    if (en !== ESTILO_NOM){ ESTILO_NOM = en; ESTILO = ESTILOS[en]; }
  }
  if (PAL.listo) return;
  const k = cl((JUG.x - PAL.x0)/PAL_FUNDE, 0, 1);
  _p1.copy(_pa1).lerp(_pb1, k); _p2.copy(_pa2).lerp(_pb2, k);
  ponColores(_p1, _p2);
  /* una vez terminado el fundido no se vuelve a escribir: son veinte materiales
     y el color no cambia hasta el tramo siguiente */
  if (k >= 1) PAL.listo = true;
}
function ponPaleta(N){
  PAL.i = -1;
  paletaPaso(N);
  /* ── Y EL TELON SE PLANTA EN LO QUE PIDE EL ESTILO, SIN FUNDIDO ──
     `ponPaleta` es «poner la paleta de una»: la llaman el armado del nivel y la
     sonda que fotografia un instante. El fundido del telon es por cuadro, asi
     que sin esto la foto del estilo blanco salia con el atardecer al 92 %
     detras —medido— y el primer cuadro de una partida arrancaba con el telon del
     tramo anterior. */
  matTelon.opacity = ESTILO.telon;
}

/* ══════════ EL JUGADOR ══════════
   Se rearma al cambiar el icono, no cada cuadro. Y es EL MISMO objeto que se ve
   en el demo del menu, asi que el icono que se elige es el que se juega — no hay
   una segunda vista previa que pueda decir otra cosa. */
const FORMAS = ['cubo', 'diamante', 'redondo'];
const COLES = ['#2de2a8', '#5ad9ff', '#ffd447', '#ff6ad5', '#ff7a4a', '#b07aff'];
const ICONO = { forma: 0, c1: 0, c2: 1 };

/* ── EL APLASTE VA EN UN GRUPO DE AFUERA, Y LA RAZON ES EL ORDEN ──
   La matriz local de un objeto es T·R·S, o sea que la escala se aplica en los
   ejes YA GIRADOS: con el aplaste en el mismo grupo que el giro, un cubo tumbado
   noventa grados se aplastaria de costado. En un grupo padre la escala va
   despues de la rotacion y el aplaste sigue el eje Y del mundo, que es donde
   esta el piso. */
const gSq = new T.Group();
const gJug = new T.Group();
gSq.add(gJug);
esc3.add(gSq);
/* el resorte del aplaste: `sq` positivo es achatado y negativo estirado */
const SQ = { v: 0, x: 0 };
function golpeaSq(f){ SQ.v += f; }
/* ── Y LOS TRES NUMEROS DEL RESORTE SALEN DE UNA CUENTA, NO DE TANTEAR ──
   El pico de un resorte al que se le da un empujon `v0` vale `v0/ω` **sin
   amortiguamiento**, y el tiempo hasta ese pico es un cuarto de periodo. La
   primera version tenia ω = 7,6 con empujones de 0,18: medido, el pico daba
   **2,4 %** de deformacion, o sea invisible. Con ω = 13 (k = 169) y ζ = 0,35
   —que es lo que deja UN rebote, y es lo que separa la goma de la gelatina—
   quedo en 7,7 %, y ahi aparecio la parte que me faltaba de la cuenta: **el
   amortiguamiento se come el 36 % del pico**, porque el factor vale
   `exp(-ζ·arccos(ζ)/√(1-ζ²))` = 0,64. O sea que el empujon para un 14 % no es
   1,8 sino 3,2 — y ese numero se comprobo midiendo la curva, no derivandolo:
   pico **-14,0 %** a los 0,12 s. */
const SQ_W = 13, SQ_K = SQ_W*SQ_W, SQ_C = 2*0.35*SQ_W;
function sqPaso(dt){
  SQ.v += (-SQ_K*SQ.x - SQ_C*SQ.v)*dt;
  SQ.x += SQ.v*dt;
  SQ.x = cl(SQ.x, -0.34, 0.34);
}
const matJugA = new T.MeshToonMaterial({ color: 0x2de2a8, emissive: 0x0e5a44, emissiveIntensity: 0.55, gradientMap: TOON });
/* ── EL ICONO LLEVA SU CONTORNO PIEZA POR PIEZA ──
   Cada malla del icono con material A —el cuerpo, el fuselaje, el torso— recibe
   una cascara hermana: misma geometria, material de contorno, hija del mismo
   grupo asi que hereda posicion, giro y escala. El borde del icono es lo que en
   GD lo separa del fondo a cualquier color: un cubo verde sobre un tramo verde
   sigue teniendo silueta. */
function conBorde(m, redondo){
  const b = new T.Mesh(m.geometry, redondo ? matBordeRedondo : matBordeCaja);
  b.position.copy(m.position); b.rotation.copy(m.rotation); b.scale.copy(m.scale);
  b.renderOrder = -1;
  return b;
}
const matJugB = new T.MeshBasicMaterial({ color: 0x5ad9ff });
/* la cupula del ovni: vidrio, o sea el color secundario casi transparente */
const matDomo = new T.MeshBasicMaterial({ color: 0x5ad9ff, transparent: true, opacity: 0.32,
                                          depthWrite: false, side: T.DoubleSide });
let jugCuerpo = null;
/* las piezas que se animan por su cuenta: las piernas del robot, la helice del
   columpio, las patas de la arana */
const JUGP = { piernas: [], helice: null, patas: [] };

/* ── EL CUBO ES EL PERSONAJE, Y LOS VEHICULOS LO LLEVAN ──
   En Geometry Dash la nave, el ovni y el columpio no REEMPLAZAN al icono: lo
   transportan. El cubo va sentado arriba de la nave, adentro de la cupula del
   ovni y colgado del rotor del columpio. Con la primera version —un cono por
   nave— el jugador perdia a su personaje en cada portal y lo recuperaba en el
   siguiente. Asi que el cubo (o el rombo, o la bola que se eligio en el menu) es
   UNA funcion y los vehiculos la llaman a escala. */
function cuboIcono(esc){
  const g = new T.Group();
  if (FORMAS[ICONO.forma] === 'diamante'){
    const cu = new T.Mesh(new T.OctahedronGeometry(0.62), matJugA);
    cu.castShadow = true; g.add(cu); g.add(conBorde(cu, true));
    const nu = new T.Mesh(new T.OctahedronGeometry(0.30), matJugB);
    nu.position.z = 0.42; g.add(nu);
  } else if (FORMAS[ICONO.forma] === 'redondo'){
    const cu = new T.Mesh(GEO.esfera, matJugA);
    cu.scale.setScalar(JUG_LADO*1.08); cu.castShadow = true; g.add(cu); g.add(conBorde(cu, true));
    const nu = new T.Mesh(GEO.esfera, matJugB);
    nu.scale.setScalar(JUG_LADO*0.46); nu.position.z = 0.34; g.add(nu);
  } else {
    const cu = new T.Mesh(GEO.caja, matJugA);
    cu.scale.setScalar(JUG_LADO); cu.castShadow = true; g.add(cu); g.add(conBorde(cu, false));
    /* ── EL CUBO DE GD TIENE MARCO ──
       Un borde del color secundario en la cara de adelante, que es lo que
       separa el icono 1 de una caja lisa: cuatro listones finos alrededor de la
       cara, y adentro la cara con los dos ojos y la boca. */
    const L = JUG_LADO, e = L*0.09;
    for (const [sx, sy, w, h] of [[0, L/2 - e/2, L, e], [0, -L/2 + e/2, L, e],
                                  [-L/2 + e/2, 0, e, L], [L/2 - e/2, 0, e, L]]){
      const li = new T.Mesh(GEO.caja, matJugB);
      li.scale.set(w, h, L*0.08); li.position.set(sx, sy, L*0.50); g.add(li);
    }
    /* la cara: dos ojos y no un cuadrado, que es lo que en GD hace que un cubo
       sea alguien y no una caja */
    for (const sx of [-0.19, 0.19]){
      const oj = new T.Mesh(GEO.caja, matJugB);
      oj.scale.set(JUG_LADO*0.22, JUG_LADO*0.30, JUG_LADO*0.10);
      oj.position.set(sx, 0.06, JUG_LADO*0.47); g.add(oj);
    }
    const bo = new T.Mesh(GEO.caja, matJugB);
    bo.scale.set(JUG_LADO*0.46, JUG_LADO*0.09, JUG_LADO*0.10);
    bo.position.set(0, -0.22, JUG_LADO*0.47); g.add(bo);
  }
  g.scale.setScalar(esc || 1);
  return g;
}
function cajita(mat, sx, sy, sz, x, y, z, rz){
  const m = new T.Mesh(GEO.caja, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z || 0);
  if (rz) m.rotation.z = rz;
  return m;
}

function ponIcono(){
  while (gJug.children.length) gJug.remove(gJug.children[0]);
  matJugA.color.set(COLES[ICONO.c1]);
  matJugA.emissive.set(COLES[ICONO.c1]).multiplyScalar(0.30);
  matJugB.color.set(COLES[ICONO.c2]);
  matDomo.color.set(COLES[ICONO.c2]);
  JUGP.piernas = []; JUGP.helice = null; JUGP.patas = [];
  /* ── UNA SILUETA POR MODO, Y NO ES ADORNO ──
     Con la misma forma en los ocho modos, el jugador no sabe con que reglas esta
     jugando hasta que toca y ve lo que pasa. La silueta es lo que dice, sin
     texto, que ahora se vuela o que ahora se da vuelta la gravedad. Y cada una
     copia la de Geometry Dash, que es lo que se pidio: la nave con su aleta
     trasera y el cubo montado, el ovni con la cupula, la onda que es una flecha,
     el robot con dos piernas, la arana con sus patas, el columpio con el rotor. */
  const M = JUG.modo;
  const g = new T.Group();
  if (M === 'nave'){
    /* fuselaje chato, trompa, aleta dorsal inclinada hacia atras y quilla:
       la silueta de la nave 1 de GD, vista de costado */
    /* ── EL FUSELAJE TIENE QUE SER MAS GRANDE QUE EL CUBO ──
       Con 0,26 de alto la nave se leia a una tabla debajo del cubo (medido en
       la foto: el cubo montado ocupaba mas que la nave). En GD la nave es el
       vehiculo y el cubo es el pasajero, asi que el fuselaje mide 0,42 de alto y
       el cubo va medio HUNDIDO en el, como en una cabina abierta. */
    const fu = cajita(matJugA, 1.02, 0.42, 0.52, -0.04, -0.14); fu.castShadow = true; g.add(fu); g.add(conBorde(fu, false));
    g.add(cajita(matJugB, 1.06, 0.08, 0.56, -0.04, -0.06));              /* la franja */
    const tr = new T.Mesh(new T.ConeGeometry(0.20, 0.42, 10), matJugB);
    tr.rotation.z = -Math.PI/2; tr.position.set(0.68, -0.14, 0); g.add(tr);
    g.add(cajita(matJugB, 0.34, 0.44, 0.08, -0.42, 0.18, 0, 0.62));     /* aleta */
    g.add(cajita(matJugB, 0.26, 0.16, 0.08, -0.40, -0.40, 0, -0.35));   /* quilla */
    const cu = cuboIcono(0.50); cu.position.set(0.06, 0.16, 0); g.add(cu);
  } else if (M === 'columpio'){
    /* el swing copter: el cubo colgado de un rotor. La helice gira en `ponJug` */
    const cu = cuboIcono(0.70); cu.position.y = -0.08; g.add(cu);
    g.add(cajita(matJugB, 0.07, 0.24, 0.07, 0, 0.36));
    const he = cajita(matJugB, 0.96, 0.05, 0.14, 0, 0.50);
    g.add(he); JUGP.helice = he;
  } else if (M === 'bola'){
    /* la bola rueda: el aro y el punto son lo que hace visible el giro */
    const cu = new T.Mesh(GEO.esfera, matJugA);
    cu.scale.setScalar(0.88); cu.castShadow = true; g.add(cu); g.add(conBorde(cu, true));
    const ar = new T.Mesh(GEO.aro, matJugB);
    ar.scale.setScalar(0.92); ar.position.z = 0.16; g.add(ar);
    const pu = new T.Mesh(GEO.esfera, matJugB);
    pu.scale.setScalar(0.16); pu.position.set(0, 0.24, 0.40); g.add(pu);
  } else if (M === 'ovni'){
    /* el plato con su borde, y el cubo ADENTRO de la cupula de vidrio */
    const pl = new T.Mesh(new T.CylinderGeometry(0.34, 0.58, 0.20, 18), matJugA);
    pl.position.y = -0.22; pl.castShadow = true; g.add(pl); g.add(conBorde(pl, true));
    const bo = new T.Mesh(GEO.aro, matJugB);
    bo.scale.set(1.36, 1.36, 0.7); bo.rotation.x = Math.PI/2; bo.position.y = -0.20; g.add(bo);
    const cu = cuboIcono(0.44); cu.position.y = 0.06; g.add(cu);
    const do_ = new T.Mesh(GEO.cupula, matDomo);
    do_.scale.set(0.84, 0.72, 0.84); do_.position.y = -0.12; g.add(do_);
  } else if (M === 'onda'){
    /* la flecha: un dardo chato apuntando adelante, con su franja. En GD la onda
       es una punta de flecha y nada mas, y la cinta que deja es el personaje */
    const cu = new T.Mesh(new T.ConeGeometry(0.36, 0.96, 3), matJugA);
    cu.rotation.z = -Math.PI/2; cu.rotation.y = Math.PI/6; cu.scale.z = 0.55;
    cu.castShadow = true; g.add(cu); g.add(conBorde(cu, true));
    g.add(cajita(matJugB, 0.34, 0.09, 0.30, -0.16, 0, 0.02));
  } else if (M === 'robot'){
    /* torso, cabeza y dos piernas con pie; las piernas se animan en `ponJug` */
    const to = cajita(matJugA, 0.58, 0.50, 0.46, 0, 0.16); to.castShadow = true; g.add(to); g.add(conBorde(to, false));
    g.add(cajita(matJugB, 0.30, 0.18, 0.30, 0.06, 0.50));
    g.add(cajita(matJugB, 0.10, 0.08, 0.10, 0.22, 0.52, 0.16));      /* el ojo */
    for (const sx of [-0.17, 0.17]){
      const pi = new T.Group(); pi.position.set(sx, -0.08, 0);
      pi.add(cajita(matJugA, 0.16, 0.28, 0.20, 0, -0.14));
      pi.add(cajita(matJugB, 0.28, 0.10, 0.26, 0.04, -0.32));
      g.add(pi); JUGP.piernas.push(pi);
    }
  } else if (M === 'arana'){
    const cu = cajita(matJugA, 0.74, 0.34, 0.54, -0.04, 0.02); cu.castShadow = true; g.add(cu); g.add(conBorde(cu, false));
    const ca = new T.Mesh(GEO.esfera, matJugB);
    ca.scale.setScalar(0.34); ca.position.set(0.40, 0.06, 0); g.add(ca);
    /* ocho patas, cuatro por lado, con la rodilla por ENCIMA del lomo: es la
       silueta de arana y no de ladrillo con palitos */
    /* ── LAS PATAS VAN EN EL PLANO DE JUEGO, NO HACIA LA CAMARA ──
       Giradas en X las rodillas se apilaban ENCIMA del lomo y la arana se leia a
       un ladrillo con una mata de rayas arriba (medido en dos fotos). La silueta
       de la arana de GD es de perfil: cuatro arcos que salen del cuerpo hacia
       adelante y hacia atras, con la rodilla arriba y el pie en el piso. Asi que
       cada pata es un arco en el plano XY —muslo hacia afuera y arriba, tibia
       hacia abajo— y lo unico que va en z es un escalon chico para que las dos de
       cada lado no se pisen. */
    [[-0.34, -1], [-0.16, -1], [0.12, 1], [0.30, 1]].forEach(([px, lado], i) => {
      const pa = new T.Group(); pa.position.set(px, 0.10, (i % 2 ? 0.14 : -0.14));
      const mu = cajita(matJugB, 0.11, 0.40, 0.11, lado*0.12, 0.16, 0, -lado*0.75);
      const ti = cajita(matJugB, 0.11, 0.46, 0.11, lado*0.30, -0.04, 0, lado*0.35);
      pa.add(mu); pa.add(ti);
      g.add(pa); JUGP.patas.push(pa);
    });
  } else {
    g.add(cuboIcono(1));
  }
  jugCuerpo = g;
  gJug.add(g);
}

/* ══════════ LA ESTELA ══════════
   ── LA ONDA DEJA UNA CINTA, Y LA CINTA ES EL PERSONAJE ──
   En Geometry Dash la onda es una punta de flecha de medio bloque; lo que se ve
   es la cinta gruesa del color primario que deja por donde paso, y que dibuja el
   zigzag entero. Los otros modos dejan el rastro fino de la opcion «trail». Es
   UNA malla: una tira de dos vertices por muestra que se reconstruye por cuadro,
   con el ancho cayendo con la edad — asi la cola se afina en vez de cortarse. */
const EST_N = 64;
const ESTELA = { p: [], ancho: 0.10, vida: 0.32 };
const geoEstela = new T.BufferGeometry();
geoEstela.setAttribute('position', new T.BufferAttribute(new Float32Array(EST_N*2*3), 3));
{
  const idx = [];
  for (let i = 0; i < EST_N - 1; i++){
    const a = i*2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  geoEstela.setIndex(idx);
}
const matEstela = new T.MeshBasicMaterial({ color: 0x2de2a8, transparent: true, opacity: 0.88,
                                            depthWrite: false, side: T.DoubleSide });
const mEstela = new T.Mesh(geoEstela, matEstela);
mEstela.frustumCulled = false; mEstela.renderOrder = 2;
esc3.add(mEstela);
/* ── SE MUESTREA EN EL PASO DE FISICA, NO AL DIBUJAR ──
   Las sondas adelantan cientos de pasos sin dibujar un cuadro: si la estela se
   muestreara en `pinta`, la foto de una corrida del bot saldria con un solo
   segmento. Va en `efePaso`, que es lo que las sondas ya adelantan. */
function estelaPaso(dt){
  const P = ESTELA.p;
  for (let i = P.length - 1; i >= 0; i--){ P[i].a += dt; if (P[i].a > ESTELA.vida) P.splice(i, 1); }
  if (!JUG.vivo || !EST.corriendo) return;
  const onda = JUG.modo === 'onda';
  ESTELA.ancho = onda ? 0.36 : 0.09;
  ESTELA.vida = onda ? 0.62 : 0.30;
  const cx = JUG.x - (onda ? 0.30 : 0.10), cy = JUG.y + JUG_LADO*0.5;
  const u = P[P.length - 1];
  /* un salto de mas de tres bloques es una reaparicion o un teletransporte: la
     cinta no puede unir los dos sitios */
  if (u && Math.hypot(cx - u.x, cy - u.y) > 3){ P.length = 0; return; }
  if (!u || Math.hypot(cx - u.x, cy - u.y) > 0.08) P.push({ x: cx, y: cy, a: 0 });
  while (P.length > EST_N) P.shift();
}
function armaEstela(){
  const P = ESTELA.p, at = geoEstela.attributes.position, A = at.array;
  const n = P.length;
  if (n < 2){ mEstela.visible = false; return; }
  mEstela.visible = true;
  matEstela.color.set(COLES[ICONO.c1]);
  const z = -JUG_LADO*0.5 - 0.02;
  for (let i = 0; i < EST_N; i++){
    const j = Math.min(i, n - 1), p = P[j];
    const q = P[Math.min(j + 1, n - 1)], r = P[Math.max(j - 1, 0)];
    let dx = q.x - r.x, dy = q.y - r.y;
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const k = 1 - p.a/ESTELA.vida;
    const w = ESTELA.ancho*(0.25 + 0.75*k)*(j === n - 1 ? 1 : 1);
    const nx = -dy*w, ny = dx*w;
    A[i*6 + 0] = p.x + nx; A[i*6 + 1] = p.y + ny; A[i*6 + 2] = z;
    A[i*6 + 3] = p.x - nx; A[i*6 + 4] = p.y - ny; A[i*6 + 5] = z;
  }
  at.needsUpdate = true;
  geoEstela.setDrawRange(0, Math.max(0, (n - 1)*6));
}

/* ══════════ LAS PARTICULAS ══════════
   Una sola malla instanciada con el tope de la calidad: las que no se usan van a
   escala cero, que cuesta una matriz y ni una llamada de dibujo. */
const PART = [];
const PART_TOPE = 160;
const matPart = new T.MeshBasicMaterial({ color: 0xffffff });
const mPart = new T.InstancedMesh(GEO.part, matPart, PART_TOPE);
mPart.frustumCulled = false;
mPart.instanceColor = new T.InstancedBufferAttribute(new Float32Array(PART_TOPE*3), 3);
esc3.add(mPart);

/* ── UN SOLO EMISOR, Y CADA EFECTO LE PASA SUS NUMEROS ──
   `o` es opcional: `ang`/`esp` el cono de salida (radianes; sin `ang` es radial),
   `v0`/`v1` la velocidad, `vx0`/`vy0` una velocidad base, `g` la gravedad (26 si
   no se dice, 0 para un chorro), `t` la vida, `s0`/`s1` el tamano, `gira` si las
   esquirlas rotan. Con un emisor por efecto, el dia que cambie el tope de calidad
   hay que acordarse en cinco sitios. */
function chispas(x, y, n, c, o){
  o = o || {};
  const tope = Math.min(PART_TOPE, CALIDADES[CALIDAD].part);
  const v0 = o.v0 == null ? 2 : o.v0, v1 = o.v1 == null ? 11 : o.v1;
  const s0 = o.s0 == null ? 0.10 : o.s0, s1 = o.s1 == null ? 0.30 : o.s1;
  const t = o.t == null ? 0.6 : o.t;
  for (let i = 0; i < n && PART.length < tope; i++){
    const a = o.ang == null ? Math.random()*6.2832 : o.ang + (Math.random() - 0.5)*(o.esp == null ? 0.6 : o.esp);
    const v = v0 + Math.random()*(v1 - v0);
    PART.push({ x: x + (o.dx || 0)*(Math.random() - 0.5), y: y + (o.dy || 0)*(Math.random() - 0.5),
                z: -PROF/2 + Math.random()*1.2,
                vx: (o.vx0 || 0) + Math.cos(a)*v, vy: (o.vy0 || 0) + Math.sin(a)*v,
                t: t*(0.55 + Math.random()*0.45), t0: t, s: s0 + Math.random()*(s1 - s0), c,
                g: o.g == null ? 26 : o.g,
                r: Math.random()*6.2832, vr: o.gira ? (Math.random() - 0.5)*18 : 0 });
  }
}
function pasoPart(dt){
  for (let i = PART.length - 1; i >= 0; i--){
    const p = PART[i];
    p.t -= dt; if (p.t <= 0){ PART.splice(i, 1); continue; }
    p.vy -= p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.r += p.vr*dt;
  }
  explPaso(dt);
}

/* ══════════ LA EXPLOSION ══════════
   ── LA MUERTE DE GEOMETRY DASH SON TRES COSAS A LA VEZ ──
   El icono desaparece, una nube de esquirlas de sus dos colores sale radial con
   gravedad y girando, y un ANILLO blanco se abre desde el punto del golpe y se
   apaga. El anillo es lo que le da escala al golpe: sin el, las esquirlas se leen
   a confeti. Va como una malla que se escala y se desvanece, y su reloj corre en
   `pasoPart`, que las sondas ya adelantan. */
const EXPL = { t: 0, T: 0.46, x: 0, y: 0 };
/* ── EL ANILLO VA SIN PRUEBA DE PROFUNDIDAD, PORQUE ES UN DIBUJO ENCIMA ──
   Medido en tres cuadros de una muerte contra un pico: el anillo salia por la
   MITAD, con la parte de abajo tapada por la losa del piso, porque el centro del
   golpe esta a medio bloque del suelo. En GD la explosion es una capa 2D sobre
   todo el nivel, asi que aca el anillo y el fogonazo no prueban profundidad. */
const matAnillo = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0,
                                            depthWrite: false, depthTest: false, side: T.DoubleSide });
const mAnillo = new T.Mesh(GEO.anillo, matAnillo);
mAnillo.visible = false; mAnillo.frustumCulled = false; mAnillo.renderOrder = 30;
esc3.add(mAnillo);
const matDisco = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0,
                                           depthWrite: false, depthTest: false, side: T.DoubleSide });
const mDisco = new T.Mesh(GEO.disco, matDisco);
mDisco.visible = false; mDisco.frustumCulled = false; mDisco.renderOrder = 30;
esc3.add(mDisco);
function explota(x, y){
  EXPL.t = EXPL.T; EXPL.x = x; EXPL.y = y;
  const o = { v0: 3, v1: 12, s0: 0.12, s1: 0.30, t: 0.8, gira: true, g: 18 };
  chispas(x, y, 26, COLES[ICONO.c1], o);
  chispas(x, y, 14, COLES[ICONO.c2], o);
  chispas(x, y, 10, '#ffffff', { v0: 4, v1: 10, s0: 0.08, s1: 0.16, t: 0.45, gira: true, g: 10 });
  matAnillo.color.set(COLES[ICONO.c1]);
}
function explPaso(dt){
  if (EXPL.t <= 0){ mAnillo.visible = false; mDisco.visible = false; return; }
  EXPL.t = Math.max(0, EXPL.t - dt);
  const k = 1 - EXPL.t/EXPL.T;             /* 0 al golpe, 1 al final */
  const z = -JUG_LADO*0.5 + 0.05;
  /* el anillo crece rapido y frena: raiz, no lineal */
  const r = 0.35 + Math.sqrt(k)*3.2;
  mAnillo.visible = true;
  mAnillo.position.set(EXPL.x, EXPL.y, z); mAnillo.scale.set(r, r, 1);
  matAnillo.opacity = 0.95*(1 - k)*(1 - k);
  /* el disco es el fogonazo: dura la quinta parte */
  const kd = cl(k*5, 0, 1);
  mDisco.visible = kd < 1;
  mDisco.position.set(EXPL.x, EXPL.y, z - 0.01);
  const rd = 0.3 + kd*1.9; mDisco.scale.set(rd, rd, 1);
  matDisco.opacity = 0.9*(1 - kd);
}

/* ══════════ EL TAMANO ══════════ */
function mide(){
  /* ── EL MARCO SE GIRA SI LA PANTALLA ES VERTICAL ──
     Y adentro va todo, asi que el HUD y los menus quedan alineados por
     construccion. En una pantalla apaisada no se gira nada. */
  const W = innerWidth, H = innerHeight;
  const vert = H > W;
  const m = $('marco');
  const aw = vert ? H : W, ah = vert ? W : H;
  m.className = vert ? 'girado' : 'derecho';
  m.style.width = aw + 'px'; m.style.height = ah + 'px';
  const q = CALIDADES[CALIDAD].esc;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  ESC = q*dpr;
  ren.setPixelRatio(ESC);
  ren.setSize(aw, ah, false);
  ANCHO = ren.domElement.width; ALTO = ren.domElement.height;
  cam.aspect = aw/ah;
  cam.updateProjectionMatrix();
  U = ANCHO/VISTA_ANCHO;
  /* ── LA DISTANCIA DE LA CAMARA SALE DE UNA CUENTA ──
     Se quieren ver `VISTA_ANCHO` bloques de ancho sobre el plano z = 0:
     `D = (ancho/2) / (aspecto · tan(fov/2))`. Escrita a mano, cambiar el campo o
     la proporcion de pantalla cambiaria cuantos bloques de aviso hay. */
  CAM.d = (VISTA_ANCHO*0.5)/(cam.aspect*Math.tan(FOV_Y*Math.PI/360));
  CAM.alto = VISTA_ANCHO/cam.aspect;
  /* el telon del cielo, pegado a la camara y justo por delante del plano lejano */
  const zc = -200;
  cielo.position.set(0, 0, zc);
  cielo.scale.set(2*Math.abs(zc)*Math.tan(FOV_Y*Math.PI/360)*cam.aspect*1.05,
                  2*Math.abs(zc)*Math.tan(FOV_Y*Math.PI/360)*1.05, 1);
}
addEventListener('resize', mide);

/* ══════════════════════ LOS EFECTOS ══════════════════════
   ── EL SACUDON ES SOLO TRASLACION, Y ESO NO ES UN DETALLE ──
   Girar la camara rompe la linealidad de la x, que es la propiedad de la que
   depende que se pueda despegar en un bloque exacto. Una traslacion pura de una
   camara que mira derecho la conserva EXACTAMENTE, y un acercamiento tambien
   —escala a los dos por igual, asi que el cubo y el pico siguen alineados—. Por
   eso los dos efectos de camara de este juego son esos dos y ningun otro.

   ── Y EL LATIDO ES UN ACERCAMIENTO, NO UN TEMBLOR ──
   A 128 BPM el pulso son 2,1 Hz, y por encima de un hertz cualquier movimiento
   se lee a temblor por chico que sea: es la leccion que en BARRIO costo una
   vuelta entera. Un 0,8 % de acercamiento en el golpe no se lee a temblor, se
   lee a que el mundo respira con el tema. */
const EFE = { sac: 0, zoom: 0, hit: 0 };
let _sacX = 0, _sacY = 0;
function sacude(f){ if (f > EFE.sac) EFE.sac = Math.min(1.4, f); }
function acerca(f){ EFE.zoom = f; }

function efePaso(dt){
  estelaPaso(dt);
  barrePaso(dt);
  EFE.sac = Math.max(0, EFE.sac - dt*3.4);
  EFE.zoom += (0 - EFE.zoom)*Math.min(1, dt*4.5);
  const a = EFE.sac*EFE.sac;                   /* al cuadrado: cae mas natural */
  _sacX = (Math.random()*2 - 1)*a*0.42;
  _sacY = (Math.random()*2 - 1)*a*0.42;
}

/* ── EL DESTELLO Y LA VIÑETA VIVEN EN EL DOM ──
   Cuestan cero triangulos y se componen en la GPU del navegador. Y el destello
   se escribe SOLO cuando cambia: en cero, no se toca el DOM. */
const elFlash = $('flash');
let FLA = 0, FLA_ANT = -1;
function destella(col, f){ FLA = Math.max(FLA, f); elFlash.style.setProperty('--fc', col); }
function flaPaso(dt){
  FLA = Math.max(0, FLA - dt*2.6);
  const v = +FLA.toFixed(3);
  if (v !== FLA_ANT){ FLA_ANT = v; elFlash.style.opacity = v; }
}

/* ══════════ LA CAMARA ══════════
   `CAM.y` es el CENTRO de la banda visible, no un desplazamiento: con la camara
   mirando derecho, el centro de la banda ES la altura de la camara, asi que la
   cuenta de «el piso al 80 % del alto» sale de una linea. */
const CAM = { x: 0, y: 3, d: 10, alto: 9.2 };
let CAM_OFS = 0.30;
function ponCam(dt){
  CAM.x = JUG.x - VISTA_ANCHO*CAM_OFS;
  const H = CAM.alto*0.5;
  /* ── EN NAVE Y EN GRAVEDAD INVERTIDA SE CENTRA EL PASILLO ──
     Los dos entran enteros en pantalla, asi que seguir al jugador en vertical
     solo hace que las paredes se muevan y cuesten mas de leer. */
  const obj = JUG.modo === 'nave' ? ALTO_PASILLO*0.5
            : JUG.grav < 0 ? ALTO_GRAV*0.5
            /* el piso queda al 80 % del alto: `centro = 0,6·semialto` */
            : cl(H*0.6 + JUG.y*0.20, H*0.6, H*0.6 + 3.2);
  CAM.y += (obj - CAM.y)*Math.min(1, dt*6);
  const t = musTiempo();
  const pul = t == null ? 0 : Math.pow(1 - (((t % 1) + 1) % 1), 3);
  const d = CAM.d*(1 - 0.012*pul + EFE.zoom);
  cam.position.set(CAM.x + VISTA_ANCHO*0.5 + _sacX, CAM.y + _sacY, d);
  cam.rotation.set(0, 0, 0);
  /* la caja de sombra sigue al jugador: repartida sobre el nivel entero, la
     sombra de un cubo mediria dos texels y temblaria */
  /* ── LA LUZ VA CASI DE ARRIBA, Y ESO NO ES ESTETICA ──
     Con el foco corrido nueve bloques hacia la camara, la sombra de una pared
     salia larga y hacia atras: en perspectiva se veia DESPEGADA de su pared, y
     en el pasillo de la nave eran cuatro manchones sueltos sobre el piso. A 63
     grados de elevacion la sombra mide medio alto del objeto y queda debajo de
     el, que es lo que la vuelve informacion en vez de ruido. */
  sol.position.set(JUG.x + 7, CAM.y + 16, 3);
  sol.target.position.set(JUG.x, CAM.y, -PROF/2);
  const s = sol.shadow.camera;
  s.left = -13; s.right = 13; s.top = 13; s.bottom = -13;
  s.updateProjectionMatrix();
}

/* ══════════ UN CUADRO ══════════ */
const _v3 = new T.Vector3();
let MODO3D = '';
/* ── EL JUGADOR SE COLOCA EN UNA FUNCION Y NO ADENTRO DEL PINTADO ──
   La sonda mide con el cuadro congelado y sin dibujar, asi que leyendo la
   posicion del grupo lo que se lee es la del ultimo cuadro dibujado: medido, el
   anclaje del aplaste daba 0,3171 de error, que es exactamente la altura a la
   que estaba el jugador cuando se dibujo por ultima vez. Con la colocacion
   aparte, la sonda la llama ella y mide el instante que pidio.
   Es la quinta vez en este repo que una medicion sale mal por leer un estado que
   solo se pone al dibujar. */
function ponJug(){
  gSq.visible = JUG.vivo;
  if (JUG.vivo){
    /* ── EL APLASTE SE ANCLA EN LA CARA QUE TOCA, NO EN EL CENTRO ──
       La escala de un grupo va alrededor de su origen, y el origen estaba en el
       centro del cubo: aplastado media deformacion, el cubo se HUNDE la mitad de
       eso en el piso y estirado flota. Anclando la cara de apoyo —la de abajo
       apoyado, la de arriba con la gravedad invertida— el contacto se queda
       quieto, que es lo unico que hace que la deformacion se lea a deformacion.
       Y el volumen se conserva: si no, el cubo cambia de tamano en vez de
       deformarse. */
    const k = SQ.x, alto = JUG_LADO*(1 - k);
    const cy = JUG.grav > 0 ? JUG.y + alto*0.5 : JUG.y + JUG_LADO - alto*0.5;
    gSq.position.set(JUG.x, cy, -JUG_LADO*0.5);
    gSq.scale.set(1 + k*0.55, 1 - k, 1 + k*0.25);
    gJug.rotation.z = JUG.modo === 'nave' ? JUG.giro : -JUG.giro;
    /* con la gravedad al reves el vehiculo va DADO VUELTA: el cubo cuelga de la
       nave y la cupula del ovni mira al piso, que es lo que hace GD */
    gJug.rotation.x = (JUG.grav < 0 && JUG.modo !== 'cubo' && JUG.modo !== 'bola') ? Math.PI : 0;
    /* las piezas que se animan por su cuenta, con la x del jugador como fase:
       asi el paso del robot avanza con el cuerpo y no con el reloj, que es lo
       unico que evita que los pies patinen */
    if (JUGP.helice) JUGP.helice.rotation.y = JUG.x*4.2;
    if (JUGP.piernas.length){
      const f = JUG.piso ? Math.sin(JUG.x*4.4)*0.62 : 0.35;
      JUGP.piernas[0].rotation.z = JUG.piso ? f : f;
      JUGP.piernas[1].rotation.z = JUG.piso ? -f : f;
    }
    if (JUGP.patas.length){
      JUGP.patas.forEach((pa, i) => {
        const f = Math.sin(JUG.x*5.0 + i*1.6)*0.28;
        pa.rotation.z = f;
      });
    }
  }
  armaEstela();
}

function pinta(){
  if (REV3D !== MUNDO.rev) mundo3D();
  /* la nave y el cubo son mallas distintas, asi que el icono se rearma al cambiar
     de modo — una vez, no en cada cuadro */
  if (MODO3D !== JUG.modo){ MODO3D = JUG.modo; ponIcono(); }
  const t = musTiempo();
  /* el pulso: 1 en el golpe y cae hasta el siguiente. Sale del reloj de la
     musica, asi que la imagen y el tema no pueden desincronizarse. */
  const pulso = t == null ? 0 : Math.pow(1 - (((t % 1) + 1) % 1), 3);

  /* el color del tramo: cambia solo con la x y funde en siete bloques */
  paletaPaso(NIVELES[EST.nivel]);
  ponTelon();

  /* el canto y la reja laten con el compas: es lo unico estetico del juego y no
     cuesta ni una llamada de dibujo, porque los materiales son compartidos */
  matReja.opacity = ESTILO.reja + pulso*ESTILO.rejaPulso;
  /* el fondo late con el compas, y CADA CAPA CON SU FUERZA: latiendo todas
     igual, las tres se leen como una sola imagen y el paralaje deja de contar */
  /* la decoracion late con el compas: cada capa con su fuerza, porque latiendo
     todas igual las tres se leen como una sola imagen y el paralaje deja de
     contar. Va por el COLOR y no por la opacidad: los sprites usan `alphaTest`
     —recorte duro, sin ordenar transparencias— y un material opaco no tiene
     opacidad que mover. */
  for (let i = 0; i < DEC.length; i++){
    const D = DEC[i];
    if (!D.listo || OCULTO.deco){ D.malla.visible = false; continue; }
    D.malla.visible = true;
    /* el tinte del tramo por cuanto sobrevive de su capa: es la perspectiva
       aerea, y es lo unico que separa el fondo del nivel */
    D.mat.color.copy(_pDeco).multiplyScalar(DECO_BRI[D.capa]*(1 + pulso*0.10));
  }
  matMotas.opacity = ESTILO.motas + pulso*0.42;
  ren.toneMappingExposure = ESTILO.exp + pulso*0.12;
  /* la capa de adelante se enciende solo en los tramos que la piden; las mallas
     estan puestas en esos tramos, asi que fuera de ellos no hay nada que dibujar
     en pantalla igual — pero si nada que recorrer */
  for (const m of FRE){
    const D = m.userData.deco;
    m.visible = !!D.listo && !OCULTO.frente;
    if (m.visible) m.material.color.copy(_p2).lerp(_c.setHex(0xffffff), 0.5);
  }

  /* el jugador */
  ponJug();

  /* lo que se mueve por su cuenta */
  for (const m of SUELTOS){
    const u = m.userData;
    if (u.sierra) m.rotation.y = (t || 0)*2.4;
    else if (u.moneda){
      m.visible = !u.moneda.tomada;
      m.rotation.y = (t || 0)*1.9;
      m.position.y = u.moneda.y + Math.sin((t || 0)*2.2)*0.14;
    }
  }
  ponPortales(pulso);
  if (INST.orbe){
    /* un orbe usado se apaga, y eso hay que poder verlo: es la diferencia entre
       «no llegue» y «ya lo gaste» */
    let algo = false;
    MUNDO.orbes.forEach((o, i) => { if (o.usado) algo = true; });
    matOrbe.color.setHex(0xffd447);
    matOrbe.opacity = 1; matOrbe.transparent = false;
    if (algo){
      MUNDO.orbes.forEach((o, i) => {
        const s = o.usado ? 0.55 : 1;
        _m4.compose(new T.Vector3(o.x, o.y, -PROF/2 + 0.5), _q.identity(),
                    new T.Vector3(s, s, s));
        INST.orbe.setMatrixAt(i, _m4);
      });
      INST.orbe.instanceMatrix.needsUpdate = true;
    }
  }

  /* las particulas */
  const n = Math.min(PART.length, PART_TOPE);
  for (let i = 0; i < PART_TOPE; i++){
    if (i < n){
      const p = PART[i], k = cl(p.t/p.t0, 0.15, 1), s = p.s*k;
      _e.set(0, 0, p.r);
      _m4.compose(_v3.set(p.x, p.y, p.z), _q.setFromEuler(_e), new T.Vector3(s, s, s));
      mPart.setMatrixAt(i, _m4);
      _c.set(p.c); mPart.setColorAt(i, _c);
    } else {
      _m4.compose(_v3.set(0, -999, 0), _q.identity(), new T.Vector3(0, 0, 0));
      mPart.setMatrixAt(i, _m4);
    }
  }
  mPart.instanceMatrix.needsUpdate = true;
  if (mPart.instanceColor) mPart.instanceColor.needsUpdate = true;

  ren.info.reset();
  ren.render(esc3, cam);
}

/* ── EL BRILLO SE LEE DEL BUFER, Y HAY QUE DIBUJAR PRIMERO ──
   Un lienzo WebGL sin `preserveDrawingBuffer` sale en cero si se lo copia con
   `drawImage`: la unica lectura honesta es `readPixels` justo despues de un
   render. Es la misma leccion que en ECO. */
function brilloDe(){
  pinta();
  const gl = ren.getContext();
  const w = ren.domElement.width, h = ren.domElement.height;
  const px = new Uint8Array(w*h*4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let m = 0, mx = 0;
  for (let i = 0; i < px.length; i += 4){
    const l = 0.2126*px[i] + 0.7152*px[i+1] + 0.0722*px[i+2];
    m += l; if (l > mx) mx = l;
  }
  return { medio: +(m/(w*h)).toFixed(1), max: Math.round(mx), w, h };
}

function partDe(){
  return { n: PART.length, count: mPart.count, vis: mPart.visible,
           cull: mPart.frustumCulled, mat: !!mPart.material,
           tope: Math.min(PART_TOPE, CALIDADES[CALIDAD].part),
           m0: Array.from(mPart.instanceMatrix.array.slice(0, 16)).map(v => +v.toFixed(2)),
           padre: mPart.parent ? mPart.parent.type : null };
}

const _cajaCubo = new T.Box3();
function cuboDe(){
  ponJug();
  gSq.updateMatrixWorld(true);
  _cajaCubo.setFromObject(gSq);
  /* la caja envolvente crece con el GIRO, asi que para comprobar el anclaje hay
     que mirar la cara de apoyo sin el giro: sale de la posicion y la escala que
     el objeto tiene puestas, no de repetir la cuenta del dibujo */
  const eY = gSq.scale.y, py = gSq.position.y;
  const pie = py - JUG_LADO*eY*0.5, techo = py + JUG_LADO*eY*0.5;
  return { abajo: +_cajaCubo.min.y.toFixed(4), arriba: +_cajaCubo.max.y.toFixed(4),
           alto: +(_cajaCubo.max.y - _cajaCubo.min.y).toFixed(4),
           ancho: +(_cajaCubo.max.x - _cajaCubo.min.x).toFixed(4),
           pie: +pie.toFixed(4), techo: +techo.toFixed(4),
           ancla: +((JUG.grav > 0 ? pie - JUG.y : techo - (JUG.y + JUG_LADO))).toFixed(4),
           altoG: +(JUG_LADO*eY).toFixed(4), anchoG: +(JUG_LADO*gSq.scale.x).toFixed(4),
           pieJug: +JUG.y.toFixed(4), grav: JUG.grav, sq: +SQ.x.toFixed(4) };
}
function efeDe(){
  return { sac: +EFE.sac.toFixed(3), zoom: +EFE.zoom.toFixed(4), hit: +EFE.hit.toFixed(3),
           sq: +SQ.x.toFixed(3), sqv: +SQ.v.toFixed(3), flash: +FLA.toFixed(3),
           /* cuanto se corre la camara, en bloques, y cuanto cambia el encuadre */
           sacBloques: +Math.hypot(_sacX, _sacY).toFixed(3),
           camD: +cam.position.z.toFixed(3), camDBase: +CAM.d.toFixed(3),
           deco: DEC.length, decoListos: DEC.filter(d => d.listo).length,
           motas: +matMotas.opacity.toFixed(3) };
}

function costoDe(){
  const r = ren.info.render, mm = ren.info.memory;
  return { llamadas: r.calls, triangulos: r.triangles, geo: mm.geometries, tex: mm.textures,
           programas: ren.info.programs ? ren.info.programs.length : -1 };
}

/* ── PROYECTAR UN PUNTO DEL MUNDO A FRACCIONES DE PANTALLA ──
   Es la sonda con la que se ajusta el encuadre: «el piso al 80 %» se mide, no se
   estima. Y con la camara mirando derecho tiene que salir LINEAL en x, que es la
   propiedad de la que depende que se pueda apuntar. */
function proy(x, y){
  /* ── LA MATRIZ SE PONE AL DIA ACA, Y NO ES UN DETALLE ──
     `Object3D.matrixWorld` se recalcula al DIBUJAR, asi que proyectar justo
     despues de mover la camara usa la matriz del cuadro anterior: medido, la
     sonda devolvia al jugador en −0,595 del ancho con la camara puesta donde
     corresponde. Es la cuarta vez en este repo que una medicion sale mal por
     esto — en PISTOLA y en RECREO costo una vuelta cada una. */
  cam.updateMatrixWorld(true);
  _v3.set(x, y, 0).project(cam);
  return [(_v3.x + 1)/2, (1 - _v3.y)/2];
}
