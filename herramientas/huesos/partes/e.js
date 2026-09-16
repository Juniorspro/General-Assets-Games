/* ══════════════════════════════════════════════════════════════════════════
   LA ESCENA — renderer, pixelado, luces y suelo
   ══════════════════════════════════════════════════════════════════════════ */
let ren, esc, cam, camObj, RT, escPost, camPost, matPost, reloj;
let solLuz, ambLuz, hemLuz;
let CALIDAD = 'media', PLATAF = 'movil';
let ANCHO = 16, ALTO = 9;          // el marco, en píxeles de pantalla

/* ── EL PIXELADO NO ES UN FILTRO ENCIMA: ES LA RESOLUCIÓN ──────────────────
   La escena se dibuja en un destino CHICO y ese destino se estira con NEAREST.
   Un `filter` de CSS satura y desenfoca pero el navegador ya rellenó todos los
   píxeles: no ahorra nada. Así, el escalón que se ve ES el escalón de verdad,
   y de paso es lo que hace que esto corra en un teléfono.                   */
const POST_FS = `
precision highp float;
uniform sampler2D tD;
uniform vec2 uTam;
uniform float uSat, uPost, uVin, uGrano, uSangre, uT, uFogo, uLineas;
varying vec2 vUv;
/* ── Y SE VUELVE A CODIFICAR A sRGB, QUE NO ES UN DETALLE ────────────────
   El destino de render se declara con colorSpace SRGBColorSpace, así que el
   hardware guarda los píxeles codificados Y LOS DECODIFICA AL MUESTREAR. Lo
   que entra a este shader es LINEAL. Y three inyecta el colorspace_fragment
   sólo en SUS materiales: una pasada de post con ShaderMaterial propio
   escribe lo que le den, tal cual. Sin esta línea la pantalla muestra lineal:
   medido, el destino en 36,6 y la captura en 3,7 —o sea el mismo número
   pasado por la curva, 36/255 en sRGB son 0,0168 en lineal, que es el byte
   4,3—. Es el mismo defecto que costó una vuelta en CUBOS y otra en PUERTA
   BLANCA, y no se ve como un error de color: se ve como un juego oscuro.  */
vec3 aSRGB(vec3 c){
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
             step(vec3(0.0031308), c));
}
void main(){
  vec3 c = aSRGB(texture2D(tD, vUv).rgb);
  // saturación
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  // posterizado: los escalones son la mitad del estilo. Sin ellos, un cielo
  // en degradado se ve suave y moderno aunque esté pixelado.
  c = floor(c * uPost + 0.5) / uPost;
  // grano ANCLADO A LA PANTALLA del destino chico, así tiene el tamaño del
  // píxel gordo y no titila más fino que todo lo demás
  vec2 p = floor(vUv * uTam);
  float g = fract(sin(dot(p, vec2(12.9898, 78.233)) + uT * 0.017) * 43758.5453);
  c += (g - 0.5) * uGrano;
  // viñeta, normalizada POR EJE: en un marco 16:9, medir la distancia al
  // centro sin normalizar trata el cuadro como un cuadrado y la esquina se
  // va a negro mientras el borde de arriba casi no se toca
  vec2 d = (vUv - 0.5) * vec2(1.0, 0.62);
  float v = 1.0 - dot(d, d) * uVin;
  c *= clamp(v, 0.0, 1.0);
  // el golpe en la cara va DESPUÉS del posterizado, o sea luz en el ojo y no
  // luz en la escena
  c = mix(c, vec3(0.46, 0.05, 0.03), uSangre * (0.25 + 0.75 * dot(d, d) * 3.0));
  /* ── LAS LÍNEAS DE VELOCIDAD ──────────────────────────────────────────
     Son la firma de un plano de anime y cuestan seis líneas: el ángulo se
     parte en sectores, cada sector se prende o no con un azar propio y
     arranca a su propio radio. Sin el radio distinto por sector se ven como
     una rueda de rayos —o sea un dibujo— y no como velocidad.
     VAN DESPUÉS DEL POSTERIZADO Y DE LA VIÑETA a propósito: son luz en el
     ojo, igual que el golpe en la cara, y pasadas por los escalones de color
     quedarían dentadas justo en el borde, que es lo único que tienen.    */
  if (uLineas > 0.001) {
    vec2 q = (vUv - 0.5) * vec2(1.0, 0.5625);
    float r = length(q) * 2.6;
    float ang = atan(q.y, q.x) * 8.0;
    float sec = floor(ang);
    float a1 = fract(sin(sec * 12.9898 + 4.1) * 43758.5453);
    float a2 = fract(sin(sec * 78.2330 + 1.7) * 43758.5453);
    float ini = 0.30 + a1 * 0.42;
    float fino = smoothstep(0.50, 0.30, abs(fract(ang) - 0.5));
    c += smoothstep(ini, ini + 0.16, r) * fino * step(0.42, a2) * uLineas * 0.80;
  }
  // el fogonazo del remate: lo ÚLTIMO, porque tiene que tapar todo
  c = mix(c, vec3(1.0), uFogo);
  gl_FragColor = vec4(c, 1.0);
}`;

function armaRender(lienzo) {
  ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' });
  ren.setPixelRatio(1);
  ren.outputColorSpace = THREE.SRGBColorSpace;
  ren.toneMapping = THREE.ACESFilmicToneMapping;
  ren.toneMappingExposure = 1.06;
  ren.shadowMap.enabled = true;
  ren.shadowMap.type = THREE.PCFSoftShadowMap;
  ren.info.autoReset = false;

  esc = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.12, 400);
  cam.rotation.order = 'YXZ';   // girar-y-cabecear; con XYZ el horizonte se ladea

  RT = new THREE.WebGLRenderTarget(320, 180, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat, colorSpace: THREE.SRGBColorSpace,
  });
  escPost = new THREE.Scene();
  camPost = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  matPost = new THREE.ShaderMaterial({
    uniforms: {
      tD: { value: RT.texture }, uTam: { value: new THREE.Vector2(320, 180) },
      uSat: { value: 1.16 }, uPost: { value: 22 }, uVin: { value: 1.30 },
      uGrano: { value: 0.035 }, uSangre: { value: 0 }, uT: { value: 0 },
      uFogo: { value: 0 }, uLineas: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: POST_FS, depthTest: false, depthWrite: false,
  });
  escPost.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matPost));

  solLuz = new THREE.DirectionalLight(0xd6cdb4, 1.05);
  solLuz.position.set(24, 40, 16);
  solLuz.castShadow = true;
  /* LA CAJA DE SOMBRA SIGUE AL JUGADOR Y ES CHICA. Un mapa de sombra cubre un
     área fija: una caja del tamaño del mundo reparte 2048 texels sobre 216
     metros —9 por metro— y la sombra de un esqueleto sale hecha un peine.
     Con 26 m de caja son 79 por metro. */
  const s = solLuz.shadow;
  s.camera.left = -13; s.camera.right = 13; s.camera.top = 13; s.camera.bottom = -13;
  s.camera.near = 1; s.camera.far = 96;
  s.bias = -0.0016; s.normalBias = 0.028;
  esc.add(solLuz); esc.add(solLuz.target);

  ambLuz = new THREE.AmbientLight(0x5a6158, 0.42);
  esc.add(ambLuz);
  /* el hemisférico NO puede tener el suelo en negro: reparte según hacia dónde
     mira la cara, así que con el suelo negro toda cara que mire abajo —o sea
     la panza de cada copa y la cara interior de cada arco— recibe cero */
  hemLuz = new THREE.HemisphereLight(0x8fa0a8, 0x3b3a33, 0.55);
  esc.add(hemLuz);

  reloj = new THREE.Clock();
  camObj = new THREE.Object3D();
}

/* el marco: apaisado adentro de un teléfono vertical, girado y no encogido */
function ajustaMarco() {
  const W = innerWidth, H = innerHeight, m = document.getElementById('marco');
  const girar = H > W;
  ANCHO = girar ? H : W; ALTO = girar ? W : H;
  m.style.width = ANCHO + 'px'; m.style.height = ALTO + 'px';
  /* EL MARCO VA GIRADO, ASÍ QUE `vh` NO ES SU ALTO: es el de la VENTANA, que
     acá es el lado LARGO. Con los huecos del menú en `2.4vh` salían de 21 px
     en un cuadro de 412 y la columna medía 410 —dos píxeles de aire— así que
     una pantalla un poco más baja, o una traducción con una línea más, la
     recorta ARRIBA Y ABAJO a la vez, porque va centrada. Lo que el CSS tiene
     que leer es esto. */
  m.style.setProperty('--mh', ALTO + 'px');
  m.style.setProperty('--mw', ANCHO + 'px');
  m.style.transform = 'translate(-50%,-50%)' + (girar ? ' rotate(90deg)' : '');
  document.body.classList.toggle('girado', girar);
  if (!ren) return;
  ren.setSize(ANCHO, ALTO, false);
  cam.aspect = ANCHO / ALTO; cam.updateProjectionMatrix();
  aplicaCalidad(CALIDAD);
}

function aplicaCalidad(c) {
  CALIDAD = c;
  const C = CAL[c];
  const w = Math.max(96, Math.round(ANCHO / C.pix)), h = Math.max(54, Math.round(ALTO / C.pix));
  RT.setSize(w, h);
  matPost.uniforms.uTam.value.set(w, h);
  /* el mapa de sombra hay que SOLTARLO A MANO: three.js no recrea la textura
     porque cambie mapSize, se queda con la de antes y el cambio no hace nada */
  if (solLuz.shadow.map) { solLuz.shadow.map.dispose(); solLuz.shadow.map = null; }
  solLuz.castShadow = C.sombra > 0;
  if (C.sombra) solLuz.shadow.mapSize.set(C.sombra, C.sombra);
  cam.far = C.vista + 24; cam.updateProjectionMatrix();
  if (typeof vegCalidad === 'function') vegCalidad(C.veg);
}
