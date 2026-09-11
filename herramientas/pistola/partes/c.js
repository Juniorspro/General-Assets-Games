
/* ══════════════════════════ LA ESCENA ══════════════════════════
   ── SE DIBUJA EN UN DESTINO MAS CHICO Y SE ESTIRA ──
   Eso no es un filtro puesto encima: es la razon por la que esto corre en un
   telefono. Lo que siempre paga en un juego con sombras y niebla es el RELLENO
   de pixeles, y bajarlo es la unica palanca que funciona en los dos extremos. */
const ren = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
ren.setPixelRatio(1);
ren.outputColorSpace = T.SRGBColorSpace;
ren.toneMapping = T.ACESFilmicToneMapping;
ren.toneMappingExposure = 1.22;
ren.shadowMap.enabled = true;
ren.shadowMap.type = T.PCFSoftShadowMap;
document.body.appendChild(ren.domElement);

const esc = new T.Scene();
esc.background = new T.Color(0x0e1119);
esc.fog = new T.Fog(0x0e1119, 26, 62);

/* ── LA CAMARA ES DE PERSPECTIVA Y ESTA DE TRES CUARTOS ──
   Un juego «3D» filmado de frente perfecto se ve 2D: todo cae en el mismo plano
   y no hay una sola arista que revele el volumen. Corriendo la camara un poco al
   costado y arriba, las cajas muestran DOS caras y la torre se lee a torre. Y no
   mas: pasado un cuarto de vuelta la trayectoria de la bala deja de leerse, que
   es lo unico que hay que poder juzgar. */
/* ── LA DISTANCIA SALE DE UNA CUENTA Y NO DE TANTEAR ──
   La torre mide 5,4 m de ancho y tiene que entrar entera: con 46 grados de
   campo VERTICAL y una pantalla de 412x892 —o sea 0,462 de relacion— el ancho
   visible es el alto por 0,462, asi que para ver 5,4 de ancho hay que ver 11,7
   de alto, y eso son 13,8 metros de distancia. Con la camara mas cerca la torre
   sale cortada por los costados; con la camara mas lejos la pistola, que mide
   62 centimetros, baja de cuarenta pixeles y deja de leerse. */
const CAM_Z = 13.8, CAM_X = 2.2, CAM_Y = 1.4;
const cam = new T.PerspectiveCamera(46, 1, 0.1, 120);
let camMira = new T.Vector3(0, 0, 0);

/* la luz: una direccional con sombra —la que da forma— mas un hemisferico que
   evita que lo que no mira a la luz quede en negro absoluto */
/* ── LAS INTENSIDADES SON FISICAS Y POR ESO SON GRANDES ──
   Desde r155 three usa unidades fisicas: la BRDF divide por pi, asi que un 1,35
   de direccional sobre un gris medio devuelve 0,05 de luminancia — medido con
   `__P.brillo()`, la escena entera daba 23 sobre 255 con el maximo en 124. No
   faltaba una luz, faltaba escala. */
const sol = new T.DirectionalLight(0xfff0d8, 3.4);
sol.position.set(7, 16, 11);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
/* ── LA CAJA DE SOMBRA HAY QUE DARLA, Y ES LO QUE PONIA TODO NEGRO ──
   Una direccional trae la camara de sombra en ±5 por omision, y esta torre mide
   9 de ancho por 20 de alto: todo lo que caia fuera de esos diez metros se
   muestreaba FUERA del mapa y volvia en sombra. Medido en la captura, la escena
   entera salia negra menos una caja. No es que faltara luz: es que sobraba
   sombra. */
sol.shadow.camera.near = 1; sol.shadow.camera.far = 46;
sol.shadow.camera.left = -8; sol.shadow.camera.right = 8;
sol.shadow.camera.top = 12; sol.shadow.camera.bottom = -12;
sol.shadow.camera.updateProjectionMatrix();
sol.shadow.bias = -0.0016; sol.shadow.normalBias = 0.03;
esc.add(sol, sol.target);
/* ── EL HEMISFERICO NO PUEDE TENER EL SUELO EN NEGRO ──
   Reparte segun hacia donde mira la cara: con el suelo en negro, toda cara que
   no mire al cielo recibe CERO, y en un interior eso son las cuatro paredes. Ya
   costo una vuelta en Eco y otra en BARRIO. */
esc.add(new T.HemisphereLight(0x8fa8c8, 0x3a352c, 1.55));
esc.add(new T.AmbientLight(0x5a6478, 0.85));
/* ── Y UNA SEGUNDA DIRECCIONAL DE RELLENO, SIN SOMBRA ──
   Lo que quedaba negro no era «poca luz»: era la SOMBRA de las losas sobre la
   pared del fondo, y ahi solo llega el ambiente. Subir el ambiente aplana la
   escena entera; una direccional fria desde el otro lado levanta lo que esta en
   sombra y deja el contraste donde estaba. Es la clave y el relleno de toda la
   vida. */
const relleno = new T.DirectionalLight(0x7c9ad0, 2.05);
relleno.position.set(-8, 5, 13);
esc.add(relleno, relleno.target);

/* ══════════ EL DESTINO DE RENDER Y EL ESTIRADO ══════════ */
let RT = null, post = null, escP = null, camP = null;
function armaPost(){
  escP = new T.Scene();
  camP = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  post = new T.ShaderMaterial({
    uniforms: { tDif: { value: null }, uVin: { value: 0.34 },
                uGrano: { value: 0.035 }, uT: { value: 0 }, uLento: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tDif;
      uniform float uVin, uGrano, uT, uLento;
      float ruido(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      void main(){
        vec3 c = texture2D(tDif, vUv).rgb;
        /* ── LA CAMARA LENTA SE VE, Y NO SOLO SE SIENTE ──
           Con el tiempo frenado y la imagen igual, el jugador no sabe si el
           juego se ralentizo o se colgo. Un tinte frio y una desaturacion
           parcial lo dicen sin escribir nada. */
        float gris = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(c, vec3(gris*0.82, gris*0.92, gris*1.18), uLento*0.55);
        float d = distance(vUv, vec2(0.5));
        c *= 1.0 - uVin*d*d*1.9;
        c += (ruido(vUv*vec2(1024.) + uT) - 0.5)*uGrano;
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  const q = new T.Mesh(new T.PlaneGeometry(2, 2), post);
  q.frustumCulled = false;
  escP.add(q);
}
armaPost();

let ANC = 1, ALT = 1;
function mide(){
  ANC = innerWidth; ALT = innerHeight;
  ren.setSize(ANC, ALT, false);
  cam.aspect = ANC/ALT;
  cam.updateProjectionMatrix();
  const k = CALIDADES[CALIDAD].esc;
  const w = Math.max(2, Math.round(ANC*k)), h = Math.max(2, Math.round(ALT*k));
  if (RT) RT.dispose();
  RT = new T.WebGLRenderTarget(w, h, { minFilter: T.LinearFilter, magFilter: T.LinearFilter });
  /* ── EL DESTINO DE RENDER SE MARCA COMO sRGB, Y NO ES UN DETALLE ──
     `outputColorSpace` solo se aplica cuando three dibuja en la PANTALLA; a un
     render target le escribe en lineal salvo que su textura diga otra cosa. Y un
     `ShaderMaterial` propio devuelve el texel CRUDO —three inyecta la conversion
     solo en sus materiales— asi que la pasada de post estaba escribiendo valores
     lineales sobre un framebuffer que se lee como sRGB: medido en la captura, la
     escena entera salia casi negra. Marcando el destino, la primera pasada
     codifica y la segunda copia. Es la misma trampa que en PUERTA BLANCA, dada
     vuelta. */
  RT.texture.colorSpace = T.SRGBColorSpace;
  post.uniforms.tDif.value = RT.texture;
}
addEventListener('resize', mide);

function aplicaCalidad(k){
  CALIDAD = k;
  const c = CALIDADES[k];
  ren.shadowMap.enabled = c.sombras;
  /* ── EL MAPA DE SOMBRA VIEJO HAY QUE SOLTARLO A MANO ──
     three.js no recrea la textura porque cambie `enabled`: se queda con la de
     antes y el cambio no hace nada. Ya paso en RezUno. */
  if (sol.shadow.map){ sol.shadow.map.dispose(); sol.shadow.map = null; }
  esc.traverse(o => { if (o.isMesh) o.receiveShadow = o.castShadow = c.sombras && !o.userData.noSom; });
  mide();
  try { localStorage.setItem('pistola_cal', k); } catch(e){}
}
