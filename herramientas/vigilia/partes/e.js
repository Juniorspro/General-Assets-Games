
/* ══════════════════════ EL DIBUJO ══════════════════════ */
const lienzo = document.getElementById('c');
const marco = document.getElementById('marco');
const render = new T.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' });
render.setPixelRatio(1);
render.outputColorSpace = T.SRGBColorSpace;
render.toneMapping = T.ACESFilmicToneMapping;
render.toneMappingExposure = 1.05;
render.shadowMap.enabled = true; render.shadowMap.type = T.PCFSoftShadowMap;
render.info.autoReset = false;

const escena = new T.Scene();
escena.fog = new T.FogExp2(0x0a0a0c, 0.085);
/* ── VERTICAL NATIVO Y CAMPO VERTICAL ──
   El juego se agarra como se agarra el telefono, asi que el marco no se gira.
   El campo se declara VERTICAL porque es el lado que no cambia: en un 9:16 un
   fov horizontal de 70 daria 110 de vertical y el cuarto saldria de ojo de pez. */
const cam = new T.PerspectiveCamera(68, 9/16, 0.04, 46);

let CALIDAD = 'media', PIX = 2.4, RT = null;
const HUD_PX = { w: 420, h: 760 };

/* ══════════ EL POST: PIXELADO Y SATURACION ══════════
   La escena no se dibuja en la pantalla: se dibuja en un destino CHICO y ese
   destino se estira con NEAREST. El pixelado no es un filtro encima — es la
   razon por la que esto corre en un telefono viejo, y de paso es el estilo. */
const postEsc = new T.Scene();
const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMat = new T.ShaderMaterial({
  uniforms: { tex: { value: null }, sat: { value: 0.62 }, bandas: { value: 30.0 },
              vin: { value: 1.15 }, grano: { value: 0.055 }, t: { value: 0 },
              rojo: { value: 0 }, blanco: { value: 0 }, borroso: { value: 0 } },
  vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    precision highp float;
    uniform sampler2D tex; uniform float sat, bandas, vin, grano, t, rojo, blanco, borroso;
    varying vec2 v;
    float az(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
    void main(){
      vec2 uv = v;
      /* el desenfoque del susto: cuatro muestras, y solo cuando hace falta */
      vec3 c = texture2D(tex, uv).rgb;
      if (borroso > 0.001){
        float r = borroso*0.012;
        c = (c + texture2D(tex, uv + vec2(r, 0.0)).rgb + texture2D(tex, uv - vec2(r, 0.0)).rgb
               + texture2D(tex, uv + vec2(0.0, r)).rgb + texture2D(tex, uv - vec2(0.0, r)).rgb)*0.2;
      }
      /* ── LA SATURACION SE MIDE CONTRA LA LUMA, NO CONTRA EL PROMEDIO ──
         Con el promedio de los tres canales, desaturar CAMBIA EL BRILLO: un
         rojo puro y un verde puro tienen el mismo promedio y no se ven igual
         de claros. Acá se BAJA la saturacion, que es lo que hace que un cuarto
         a oscuras se lea a foto vieja y no a dibujo. */
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      /* un tinte frio en las sombras y calido en las luces: es lo que separa la
         penumbra de la lampara sin subir el contraste */
      c = mix(c*vec3(0.93, 0.96, 1.05), c*vec3(1.05, 1.00, 0.93), smoothstep(0.10, 0.55, l));
      /* ── EL POSTERIZADO VA CON TRAMADO ──
         Cuantizar un degradado sin tramar deja anillos, y una lampara en un
         cuarto ES un degradado. Media banda de ruido ordenado antes de cortar
         cambia los anillos por grano, que es justamente lo que este juego
         quiere que se vea. */
      float tr = (az(floor(uv*vec2(940.0, 1720.0))) - 0.5)/bandas;
      c = floor((c + tr)*bandas + 0.5)/bandas;
      /* ── LA VIÑETA SE MIDE EN LA FORMA DEL MARCO, NO EN UV ──
         «distance(uv, 0.5)» trata el cuadro como un CUADRADO, asi que en un
         marco 9:16 el borde de arriba queda a la misma distancia del centro que
         el de costado. Medido con la cuenta a mano: en el medio de arriba
         multiplicaba por 0,50 y en la esquina por 0,003 —negro puro—, o sea que
         la viñeta se comia el tercio superior de la pantalla entera. Eso es lo
         que hacia parecer que los cuartos no tenian luz: la fisica daba mas de
         cien sobre 255 en la pared y el post la borraba despues. Normalizando
         cada eje por su propio medio lado, la viñeta es una elipse con la forma
         del marco: el borde pierde un cuarto y la esquina la mitad. */
      vec2 p = (uv - 0.5)*2.0;
      float d = dot(p, p);
      c *= 1.0 - vin*d*0.20;
      c += (az(uv*vec2(940.0, 1720.0) + t) - 0.5)*grano;
      c = mix(c, vec3(0.55, 0.03, 0.03), rojo*0.55);
      c = mix(c, vec3(1.0), blanco);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`
});
postEsc.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));

function medir(){
  const w = marco.clientWidth || 420, h = marco.clientHeight || 760;
  HUD_PX.w = w; HUD_PX.h = h;
  marco.style.setProperty('--mw', w + 'px');
  const C = CALIDADES[CALIDAD]; PIX = C.pix;
  render.setSize(w, h, false);
  cam.aspect = w/h; cam.updateProjectionMatrix();
  const rw = Math.max(90, Math.round(w*C.esc/PIX)), rh = Math.max(160, Math.round(h*C.esc/PIX));
  if (RT) RT.dispose();
  RT = new T.WebGLRenderTarget(rw, rh, { minFilter: T.NearestFilter, magFilter: T.NearestFilter,
        depthBuffer: true, colorSpace: T.SRGBColorSpace });
  postMat.uniforms.tex.value = RT.texture;
  render.shadowMap.enabled = !!C.sombra;
  if (SOL){ SOL.castShadow = !!C.sombra; if (C.sombra) SOL.shadow.mapSize.set(C.sombra, C.sombra);
    if (SOL.shadow.map){ SOL.shadow.map.dispose(); SOL.shadow.map = null; } }
  escena.fog.density = 0.085*C.niebla;
}
addEventListener('resize', () => medir());

/* ══════════ LAS LUCES ══════════
   Lo unico que ilumina de verdad son las lamparas de cada cuarto: una luz
   puntual que se muda a la lampara mas cercana, mas un hemisferico casi negro
   para que las caras que miran al piso no queden en cero. */
/* ── EL HEMISFERICO ES LO QUE IMPIDE EL NEGRO PURO ──
   Con la lampara sola, un pasillo con luz 0,16 quedaba en cinco sobre 255: no
   es penumbra, es una pantalla apagada. Un poco de cielo azul frio levanta el
   piso sin tocar el contraste que da la lampara. */
escena.add(new T.HemisphereLight(0x39435e, 0x241c14, 1.15));
const SOL = new T.DirectionalLight(0xffe6c4, 0.0);      /* el que proyecta sombra: se mueve con la lampara */
SOL.castShadow = true;
SOL.shadow.camera.left = -5; SOL.shadow.camera.right = 5;
SOL.shadow.camera.top = 5; SOL.shadow.camera.bottom = -5;
SOL.shadow.camera.near = 0.4; SOL.shadow.camera.far = 22;
SOL.shadow.bias = -0.0016; SOL.shadow.normalBias = 0.035;
escena.add(SOL); escena.add(SOL.target);
/* ── LA LAMPARA VA CON CAIDA FISICA Y CON INTENSIDAD DE LAMPARA ──
   Con decaimiento 1,6 e intensidad 7 la pared quedaba en un pixel sobre 255 y
   el cuarto salia NEGRO ENTERO: en la foto no habia mas que el tablon. La caida
   correcta es el cuadrado, y entonces la intensidad tiene que ser la de una
   bombita: a cuatro metros deja la pared en torno a los cincuenta sobre 255,
   que es una casa a oscuras y no una pantalla apagada. */
/* ── LA CAIDA NO PUEDE SER EL CUADRADO ADENTRO DE UN CUARTO ──
   `1/d²` describe una bombita colgada en el vacio. En un cuarto, la mayor parte
   de lo que se ve es el SEGUNDO rebote —pared, piso, techo— y eso cae mucho mas
   despacio. Con el cuadrado, una lampara a dos metros y una pared a cinco
   quedan a razon de seis a uno y no hay intensidad que sirva para las dos: o se
   quema lo de cerca o se apaga lo de lejos. Con 1,35 la razon cae a dos y pico y
   una sola lampara alcanza a iluminar su tramo de cuarto. */
const LUZ = new T.PointLight(0xffd9a0, 40, 15, 1.35); escena.add(LUZ);
const LUZ2 = new T.PointLight(0xa8bcd8, 0, 11, 1.35); escena.add(LUZ2);
/* ── UNA LUZ MINIMA PEGADA AL CUERPO ──
   Sin ella el tablon queda negro entre lampara y lampara, y el tablon es lo
   unico que el jugador TIENE que ver. Alcance corto: se apaga antes de llegar
   al piso, asi que no rompe la regla de que la casa esta a oscuras. */
/* ── LA VELA ES LA LUZ DEL JUEGO ──
   Con las lamparas del techo solas, medido franja por franja, cuatro de los
   cinco cuartos fotografiados daban menos de siete sobre 255: no es penumbra,
   es una pantalla apagada, y en un juego de miedo no ver NADA no da miedo, da
   la sensacion de que se rompio. La salida honesta no es subir el ambiente
   —eso aplana todo— sino ponerle una VELA al tablon: es la imagen clasica de
   una vigilia, justifica que se vea lo que uno lleva, y ademas la luz cuelga
   del tablon, asi que inclinarse tambien mueve las sombras del cuarto. */
/* ── Y LA VELA MENOS TODAVIA ──
   Esta a veinte centimetros del tablon y la pared esta a dos metros y medio:
   con el cuadrado eso son ciento cincuenta y seis a uno, y en la foto se veia
   exactamente asi —el tablon quemado a blanco y el cuarto entero negro—. Con
   1,1 la razon baja a doce. */
const LUZ_MANO = new T.PointLight(0xffb05a, 22, 9, 1.1);
/* ── LA COSA NECESITA SU PROPIA LUZ, Y NO ES UN CAPRICHO ──
   Medido con la sonda: en el susto de la figura que cruza el pasillo, la
   criatura estaba visible, delante de la camara y ocupando el 14 % del ancho
   por el 22 % del alto —o sea que se estaba dibujando— y EN LA FOTO NO SE VEIA.
   La razon es que a siete metros no le llega ni la vela ni la lampara, asi que
   queda del mismo valor que la pared que tiene detras, y dos cosas del mismo
   valor son una sola. Una luz propia, puesta entre la camara y el actor, es lo
   unico que lo separa del fondo; y de paso lo MODELA, que es lo que hace que un
   bulto se lea a cuerpo. Se enciende solo mientras hay un actor a la vista. */
const LUZ_SUS = new T.PointLight(0xd8cfc2, 0, 9, 1.0); escena.add(LUZ_SUS);

/* ══════════ FUNDIR PIEZAS ══════════ */
/* ── LAS UV SALEN DE LA NORMAL DOMINANTE ──
   Todo lo que se funde acá son cajas alineadas, asi que proyectar sobre el
   plano al que mira cada cara ES el mapeo correcto, y sale en tres lineas. Van
   en METROS: sin eso una pared de doce metros y un zocalo de diez centimetros
   muestran la misma cantidad de revoque. */
function fundir(piezas){
  const pos = [], nor = [], col = [], uvs = [];
  const c = new T.Color(), m = new T.Matrix4(), nm = new T.Matrix3(), v = new T.Vector3();
  for (const p of piezas){
    const g = p.g.index ? p.g.toNonIndexed() : p.g;
    m.compose(new T.Vector3(...(p.p || [0, 0, 0])), new T.Quaternion().setFromEuler(new T.Euler(...(p.r || [0, 0, 0]))), new T.Vector3(...(p.s || [1, 1, 1])));
    nm.getNormalMatrix(m); const P = g.attributes.position, N = g.attributes.normal; c.set(p.c);
    for (let i = 0; i < P.count; i++){
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
      const px = pos[pos.length - 3], py = pos[pos.length - 2], pz = pos[pos.length - 1];
      const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
      if (ay >= ax && ay >= az) uvs.push(px, pz);
      else if (ax >= az) uvs.push(pz, py);
      else uvs.push(px, py);
    }
  }
  const G = new T.BufferGeometry();
  G.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  G.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  G.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  G.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  return G;
}
const matVert = new T.MeshLambertMaterial({ vertexColors: true });
/* ── LA PARED NECESITA GRANO, Y NO ES SOLO ESTETICA ──
   Una superficie de color liso iluminada por una lampara es un degradado suave,
   y el posterizado de la pasada final lo corta en ANILLOS: en la foto los
   cuartos salian como bandas de arcoiris concentricas. Un revoque de 128 px
   rompe el degradado antes de que lo cuantice nadie. */
function texRevoque(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2600; i++){
    const v = 118 + Math.floor(Math.random()*74);
    x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
    x.fillRect(Math.random()*128 | 0, Math.random()*128 | 0, 1 + (Math.random()*2 | 0), 1);
  }
  for (let i = 0; i < 26; i++){
    x.strokeStyle = 'rgba(70,66,62,0.30)'; x.lineWidth = 1;
    x.beginPath(); const px = Math.random()*128, py = Math.random()*128;
    x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5)*46, py + (Math.random() - 0.5)*46); x.stroke();
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.MirroredRepeatWrapping;
  t.magFilter = T.NearestFilter; t.minFilter = T.LinearMipmapLinearFilter;
  t.repeat.set(0.62, 0.62);      /* una copia cada 1,6 m */
  return t;
}
const matCuarto = new T.MeshLambertMaterial({ vertexColors: true, map: texRevoque() });

/* ══════════ LOS ASSETS DE REZONA ══════════ */
const GLB = { fallas: [], listos: [] };
const cargadorGLTF = new GLTFLoader();
const MODS = ['tablon', 'bol', 'criatura', 'puerta', 'silla', 'ropero', 'cama', 'tele', 'muneca', 'lampara', 'cuadro'];
/* el tablon y el bol estan a treinta centimetros de la vela: son los dos que
   mas hay que bajar. La criatura casi no, porque se la ve una vez y de lejos. */
const TINTE_MOD = { tablon: 0.26, bol: 0.30, cuadro: 0.62, criatura: 0.80, lampara: 0.85 };
function cargaAssets(){
  if (typeof ASSETS_B64 === 'undefined') return;
  const A = ASSETS_B64;
  if (A.titulo){
    const im = document.getElementById('logo');
    im.onload = () => { im.style.display = 'block'; document.getElementById('mTit').style.display = 'none'; };
    im.onerror = () => GLB.fallas.push('titulo');
    im.src = A.titulo;
  }
  for (const k of MODS){
    if (!A[k]) continue;
    cargadorGLTF.load(A[k], (g) => {
      let m = null; g.scene.traverse(o => { if (o.isMesh && !m) m = o; });
      if (!m) return;
      m.geometry.computeBoundingBox();
      /* ── EL MODELO GENERADO VIENE CON REFLECTANCIA DE ESTUDIO ──
         Tripo hornea la foto sobre fondo claro y bien iluminado, asi que la
         madera del tablon devuelve cerca del 45 % de lo que le llega mientras
         que la pared de esta casa devuelve el 9 %. Con la misma luz encima, eso
         son cinco a uno: medido en la foto, el tablon salia como una banda
         amarilla QUEMADA ocupando el tercio de abajo de la pantalla y el cuarto
         se leia negro al lado. Se le baja el color —que en three.js multiplica
         al mapa— hasta ponerlo en el rango del cuarto; lo que decide lo que se
         ve pasa a ser la vela, que es de lo que se trata. */
      if (m.material){
        m.material = m.material.clone();
        m.material.color.multiplyScalar(TINTE_MOD[k] || 0.55);
      }
      GLB[k] = m; GLB.listos.push(k);
      /* ── LA CRIATURA NO ES UN PROP, ASI QUE `ponModelo` NO LA ALCANZA ──
         `armaActores()` corre al evaluar el modulo, o sea ANTES de que el GLB
         decodifique, asi que la figura se quedaba con el molde de capsulas para
         siempre: medido con la sonda, los treinta y tres sustos se dibujaban con
         un maniqui de 992 triangulos y sin textura, y el modelo generado —que
         cargaba bien y figuraba en `listos`— no lo usaba nadie. */
      if (k === 'criatura') armaActores(); else ponModelo(k);
    }, undefined, () => GLB.fallas.push(k));
  }
}
/* ── EL MODELO SE ESCALA A LA MEDIDA QUE EL JUEGO YA USA ──
   Tripo devuelve la malla en una caja de lado 2 y sin escala fisica: lo que
   decide el tamano es el juego. `alto` lleva la ALTURA a los metros pedidos,
   que en muebles es lo que se mira; el tablon y el bol van por su LARGO,
   porque de ese numero cuelga la fisica. */
function ajusta(m, obj, eje, apoyaBase){
  const bb = m.geometry.boundingBox, t = new T.Vector3(); bb.getSize(t);
  const ref = eje === 'y' ? t.y : Math.max(t.x, t.z);
  const k = obj/Math.max(0.001, ref);
  const gr = new T.Group(), h = m.clone();
  h.scale.setScalar(k);
  h.position.set(-(bb.min.x + bb.max.x)/2*k, apoyaBase === false ? -(bb.min.y + bb.max.y)/2*k : -bb.min.y*k,
                 -(bb.min.z + bb.max.z)/2*k);
  gr.add(h); gr.updateMatrixWorld(true);
  gr.userData.caja = new T.Vector3(t.x*k, t.y*k, t.z*k);
  return gr;
}
const ALTO_MOD = { puerta: 2.05, silla: 0.92, ropero: 2.00, cama: 0.62, tele: 0.48, muneca: 0.42,
                   lampara: 0.30, cuadro: 0.68, criatura: 1.92 };
const PROC = {};   /* la version dibujada por codigo de cada modelo */
const MOLDE = {};  /* el grupo que se clona para plantar uno */

function geoCaja(w, h, d, c){ return fundir([{ g: new T.BoxGeometry(w, h, d), c, p: [0, h/2, 0] }]); }
function armaProc(){
  PROC.puerta = fundir([{ g: new T.BoxGeometry(0.92, 2.05, 0.07), c: '#3a2b20', p: [0, 1.02, 0] },
                        { g: new T.SphereGeometry(0.045, 6, 5), c: '#8a7a52', p: [0.34, 1.02, 0.06] }]);
  PROC.silla = fundir([{ g: new T.BoxGeometry(0.42, 0.05, 0.42), c: '#3a2c1e', p: [0, 0.45, 0] },
                       { g: new T.BoxGeometry(0.40, 0.45, 0.05), c: '#33261a', p: [0, 0.68, -0.19] },
                       { g: new T.BoxGeometry(0.05, 0.45, 0.05), c: '#2e2218', p: [0.17, 0.22, 0.17] },
                       { g: new T.BoxGeometry(0.05, 0.45, 0.05), c: '#2e2218', p: [-0.17, 0.22, 0.17] },
                       { g: new T.BoxGeometry(0.05, 0.45, 0.05), c: '#2e2218', p: [0.17, 0.22, -0.17] },
                       { g: new T.BoxGeometry(0.05, 0.45, 0.05), c: '#2e2218', p: [-0.17, 0.22, -0.17] }]);
  PROC.ropero = geoCaja(1.05, 2.0, 0.55, '#31251a');
  PROC.cama = fundir([{ g: new T.BoxGeometry(1.0, 0.20, 2.0), c: '#4a4640', p: [0, 0.42, 0] },
                      { g: new T.BoxGeometry(1.0, 0.55, 0.06), c: '#6a6660', p: [0, 0.60, -1.0] }]);
  PROC.tele = geoCaja(0.52, 0.46, 0.44, '#4a463c');
  PROC.muneca = fundir([{ g: new T.SphereGeometry(0.09, 8, 7), c: '#d8c8b8', p: [0, 0.34, 0] },
                        { g: new T.BoxGeometry(0.16, 0.26, 0.10), c: '#8a6a72', p: [0, 0.14, 0] }]);
  PROC.lampara = fundir([{ g: new T.ConeGeometry(0.14, 0.16, 8, 1, true), c: '#5a5248', p: [0, 0.22, 0] },
                         { g: new T.SphereGeometry(0.05, 7, 6), c: '#fff0c0', p: [0, 0.10, 0] }]);
  PROC.cuadro = fundir([{ g: new T.BoxGeometry(0.52, 0.68, 0.05), c: '#3a2c1c', p: [0, 0, 0] },
                        { g: new T.BoxGeometry(0.40, 0.54, 0.02), c: '#241c18', p: [0, 0, 0.03] }]);
  PROC.criatura = fundir([{ g: new T.CapsuleGeometry(0.17, 0.70, 4, 8), c: '#54504a', p: [0, 1.10, 0] },
                          { g: new T.SphereGeometry(0.14, 8, 7), c: '#5e594f', p: [0, 1.76, 0], s: [0.9, 1.15, 0.95] },
                          { g: new T.CapsuleGeometry(0.055, 0.62, 3, 6), c: '#54504a', p: [0.26, 1.12, 0], r: [0, 0, 0.12] },
                          { g: new T.CapsuleGeometry(0.055, 0.62, 3, 6), c: '#54504a', p: [-0.26, 1.12, 0], r: [0, 0, -0.12] },
                          { g: new T.CapsuleGeometry(0.07, 0.66, 3, 6), c: '#4b473f', p: [0.10, 0.36, 0] },
                          { g: new T.CapsuleGeometry(0.07, 0.66, 3, 6), c: '#4b473f', p: [-0.10, 0.36, 0] }]);
  PROC.tablon = fundir([{ g: new T.BoxGeometry(TAB_L, 0.035, TAB_A), c: '#5a4530', p: [0, 0.017, 0] }]);
  PROC.bol = fundir([{ g: new T.CylinderGeometry(BOL_R*1.06, BOL_R*0.72, BOL_BORDE, 16, 1, true), c: '#c8c0b0', p: [0, BOL_BORDE/2, 0] },
                     { g: new T.CylinderGeometry(BOL_R*0.72, BOL_R*0.72, 0.012, 14), c: '#b8b0a2', p: [0, 0.006, 0] }]);
  for (const k in PROC) MOLDE[k] = new T.Mesh(PROC[k], matVert);
}
armaProc();

/* al llegar el modelo generado, se reemplaza el molde y se repintan las copias */
const PLANTADOS = [];   /* { k, obj, padre, pos, rot, esc } */
function ponModelo(k){
  if (!GLB[k]) return;
  if (k === 'tablon' || k === 'bol'){ armaTablon(); return; }
  const alto = ALTO_MOD[k] || 1;
  const molde = ajusta(GLB[k], alto, 'y', k !== 'cuadro');
  let m = null; molde.traverse(o => { if (o.isMesh && !m) m = o; });
  if (!m) return;
  m.castShadow = true; m.receiveShadow = true;
  MOLDE[k] = molde;
  for (const P of PLANTADOS){
    if (P.k !== k) continue;
    const nuevo = molde.clone();
    nuevo.position.copy(P.obj.position); nuevo.rotation.copy(P.obj.rotation); nuevo.scale.copy(P.obj.scale);
    P.padre.remove(P.obj); P.padre.add(nuevo); P.obj = nuevo;
  }
}
function planta(k, padre, x, y, z, rotY, esc){
  const o = (MOLDE[k].clone ? MOLDE[k].clone() : new T.Mesh(PROC[k], matVert));
  o.position.set(x, y, z); o.rotation.y = rotY || 0; if (esc) o.scale.setScalar(esc);
  o.traverse(q => { if (q.isMesh){ q.castShadow = true; q.receiveShadow = true; } });
  padre.add(o);
  PLANTADOS.push({ k, obj: o, padre, });
  return o;
}

/* ══════════ LOS CATORCE CUARTOS ══════════
   Cada uno se funde en UNA malla: piso, techo, dos paredes y la pared del
   fondo con el hueco de la puerta. Sueltas serian seis llamadas de dibujo por
   cuarto y hay tres a la vista. Los props van aparte porque algunos se mueven.
   Los cuartos se ARMAN TODOS AL EMPEZAR y se prenden y apagan por distancia:
   construir uno en la mitad de la caminata es un tiron justo cuando no puede
   haberlo. */
const ALBEDO = 5.6;
const cuartosG = [];
function armaCuartos(){
  for (const g of cuartosG){ escena.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  cuartosG.length = 0;
  for (let i = 0; i < MUNDO.cuartos.length; i++){
    const q = MUNDO.cuartos[i], D = q.def;
    const G = new T.Group();
    G.position.set(q.x, q.y, q.z); G.rotation.y = q.gir;
    /* en local: x de costado, z NEGATIVO hacia adelante */
    const A = D.ancho/2, H = D.alto, L = D.largo, GR = 0.16;
    /* ── EL COLOR DE LA PARED ES REFLECTANCIA, NO OSCURIDAD ──
       La paleta esta escrita casi negra porque el cuarto tiene que verse
       oscuro, y eso es pedirle a la textura lo que tiene que hacer la LUZ: con
       un albedo de 0,02 en lineal no hay lampara que alcance. Se sube por un
       factor y la penumbra la pone la lampara, que es lo unico que ilumina. */
    const c0 = new T.Color(D.col).multiplyScalar(ALBEDO);
    const cP = c0.clone().multiplyScalar(0.80), cT = c0.clone().multiplyScalar(0.62);
    const piezas = [
      { g: new T.BoxGeometry(D.ancho, GR, L), c: '#' + cP.getHexString(), p: [0, -GR/2 - (D.baja||0)/2, -L/2], r: [(D.baja||0)/L, 0, 0] },
      { g: new T.BoxGeometry(D.ancho, GR, L), c: '#' + cT.getHexString(), p: [0, H + GR/2, -L/2] },
      { g: new T.BoxGeometry(GR, H, L), c: '#' + c0.getHexString(), p: [A + GR/2, H/2, -L/2] },
      { g: new T.BoxGeometry(GR, H, L), c: '#' + c0.getHexString(), p: [-A - GR/2, H/2, -L/2] }
    ];
    /* ── EL FONDO, CON EL HUECO DE LA PUERTA ──
       Tres cajas: dos jambas y el dintel. Sin la pared del fondo se ve el vacio
       de afuera del cuarto, que es lo que mas delata a una maqueta. */
    /* ── EL HUECO DE LA PUERTA MIDE UNA PUERTA ──
       Con 1,02 de medio ancho el vano se comia 1,88 de los 3,0 del pasillo: lo
       que se veia al frente era casi todo agujero, y un agujero no refleja. Una
       puerta mide 1,10 de ancho. */
    const HP = 2.06, AP = 0.55;
    piezas.push({ g: new T.BoxGeometry(A - AP + GR, H, GR), c: '#' + c0.getHexString(), p: [(A + AP)/2, H/2, -L - GR/2] });
    piezas.push({ g: new T.BoxGeometry(A - AP + GR, H, GR), c: '#' + c0.getHexString(), p: [-(A + AP)/2, H/2, -L - GR/2] });
    if (H > HP) piezas.push({ g: new T.BoxGeometry(AP*2, H - HP, GR), c: '#' + c0.getHexString(), p: [0, (H + HP)/2, -L - GR/2] });
    /* y el zocalo, que es lo unico que da escala a un cuarto vacio */
    piezas.push({ g: new T.BoxGeometry(D.ancho, 0.11, 0.03), c: '#' + c0.clone().multiplyScalar(1.5).getHexString(), p: [0, 0.055, -L + 0.02] });
    const m = new T.Mesh(fundir(piezas), matCuarto);
    m.receiveShadow = true; m.castShadow = false;
    G.add(m);
    /* los props */
    for (const p of D.props){
      const [k, px, pz, py, pared] = p;
      const o = planta(k, G, px, py, -pz, pared === 1 ? (px > 0 ? -Math.PI/2 : Math.PI/2) : (pared === 3 ? Math.PI : 0));
      if (k === 'lampara'){ (q.lamparas || (q.lamparas = [])).push({ x: px, y: py, z: -pz }); }
      if (k === 'tele') q.tele = o;
      if (k === 'silla' && !q.silla) q.silla = o;
      if (k === 'ropero' && !q.ropero) q.ropero = o;
      if (k === 'cuadro' && !q.cuadro) q.cuadro = o;
      if (k === 'puerta' && !q.puerta) q.puerta = o;
    }
    escena.add(G); cuartosG.push(G);
  }
}

/* ══════════ EL CUERPO, LA CAMARA Y EL TABLON ══════════
   El tablon cuelga del CUERPO y no de la camara: uno lleva la bandeja con las
   manos, asi que girar la cabeza no la mueve. Y por eso mirar a los costados no
   te saca el bol de la vista — lo que se gira es el cuerpo entero. */
const cuerpo = new T.Group(); escena.add(cuerpo);
const cabeza = new T.Group(); cabeza.position.y = OJO; cuerpo.add(cabeza); cabeza.add(cam);
/* ── LA CAMARA MIRA UN POCO PARA ABAJO, Y ES FIJO ──
   Con el telefono inclinandose para balancear, usar TAMBIEN la inclinacion para
   mirar seria pelearle al control. El cabeceo se clava en 19 grados hacia abajo:
   con un campo vertical de 68 eso deja el cuarto en los dos tercios de arriba y
   el bol en el tercio de abajo, medido. Lo unico que el giro del telefono mueve
   es hacia donde se mira de costado. */
cam.rotation.x = -0.27;
/* ── A QUE DISTANCIA VA EL TABLON ──
   Medido proyectando el bol a fracciones de pantalla: a 0,50 m del cuerpo el
   bol ocupaba el 78% del ancho, o sea que tapaba la habitacion entera. El
   ancho aparente es 2·atan(R/d) sobre los 34,6 grados que abre el marco: a
   0,72 queda en el 43%, que es un plato llevado con los brazos estirados. */
const manos = new T.Group(); manos.position.set(0, 1.18, -0.72); cuerpo.add(manos);
const tablonG = new T.Group(); manos.add(tablonG);
const bolG = new T.Group(); tablonG.add(bolG);
/* la vela va colgada del TABLON, no de las manos: asi la llama se inclina */

let aguaM = null, tablonM = null, bolM = null, llamaM = null;
function armaTablon(){
  while (tablonG.children.length){ const c = tablonG.children.pop(); if (c !== bolG && c.geometry) c.geometry.dispose(); }
  tablonG.add(bolG);
  /* el tablon: el largo manda porque de el sale el margen del deslizamiento */
  tablonM = GLB.tablon ? ajusta(GLB.tablon, TAB_L, 'xz', true) : new T.Mesh(PROC.tablon, matVert);
  if (GLB.tablon){
    const cj = tablonM.userData.caja;
    tablonM.scale.set(1, Math.min(1, 0.05/Math.max(0.001, cj.y)), TAB_A/Math.max(0.001, cj.z));
  }
  tablonM.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  tablonG.add(tablonM);
  /* la vela: un cabo, la llama y la luz. Va a un costado para no tapar el bol. */
  const cabo = new T.Mesh(fundir([
    { g: new T.CylinderGeometry(0.017, 0.019, 0.11, 8), c: '#ddd4c0', p: [0, 0.055, 0] },
    { g: new T.CylinderGeometry(0.028, 0.030, 0.012, 10), c: '#6a5a3a', p: [0, 0.006, 0] }
  ]), matVert);
  cabo.position.set(TAB_L*0.36, 0.03, -0.055); cabo.castShadow = true; tablonG.add(cabo);
  llamaM = new T.Mesh(new T.ConeGeometry(0.016, 0.055, 7),
    new T.MeshBasicMaterial({ color: 0xffd07a, toneMapped: false }));
  llamaM.position.set(TAB_L*0.36, 0.055 + 0.11 + 0.02, -0.055); tablonG.add(llamaM);
  LUZ_MANO.position.set(TAB_L*0.36, 0.20, -0.055); tablonG.add(LUZ_MANO);
  /* las manos: dos formas simples agarrando las puntas. Sin ellas el tablon
     flota y el juego se lee a camara con un objeto pegado. */
  const mano = fundir([
    { g: new T.CapsuleGeometry(0.045, 0.10, 3, 7), c: '#8a6d58', p: [0, 0, 0.03], r: [1.3, 0, 0] },
    { g: new T.CapsuleGeometry(0.016, 0.07, 2, 5), c: '#8a6d58', p: [0.030, 0.018, -0.035], r: [1.05, 0, 0] },
    { g: new T.CapsuleGeometry(0.016, 0.07, 2, 5), c: '#8a6d58', p: [0.000, 0.020, -0.038], r: [1.05, 0, 0] },
    { g: new T.CapsuleGeometry(0.016, 0.07, 2, 5), c: '#8a6d58', p: [-0.030, 0.018, -0.035], r: [1.05, 0, 0] }
  ]);
  for (const s of [-1, 1]){
    const h = new T.Mesh(mano, matVert);
    h.position.set(s*(TAB_L/2 - 0.045), -0.03, 0.02); h.rotation.y = s > 0 ? 0.25 : -0.25;
    h.castShadow = true; tablonG.add(h);
  }
  /* el bol */
  while (bolG.children.length){ const c = bolG.children.pop(); if (c.geometry) c.geometry.dispose(); }
  bolM = GLB.bol ? ajusta(GLB.bol, BOL_R*2, 'xz', true) : new T.Mesh(PROC.bol, matVert);
  if (GLB.bol){ const cj = bolM.userData.caja; bolM.scale.setY(Math.min(2.2, (BOL_BORDE*1.15)/Math.max(0.001, cj.y))); }
  bolM.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  bolG.add(bolM);
  /* ── EL AGUA ES UN DISCO INCLINADO, Y ESO ES EXACTO ──
     La superficie libre ES un plano: la altura media y las dos pendientes que
     la simulacion ya calcula lo definen entero. No hace falta una malla de
     olas para dibujar bien lo que la fisica dice. */
  aguaM = new T.Mesh(new T.CircleGeometry(BOL_R*0.94, 22),
    new T.MeshStandardMaterial({ color: 0x14303e, roughness: 0.08, metalness: 0.32,
      transparent: true, opacity: 0.94, side: T.DoubleSide }));
  aguaM.rotation.x = -Math.PI/2;
  bolG.add(aguaM);
}
armaTablon();

/* ══════════ LOS ACTORES DE LOS SUSTOS ══════════
   Un puñado de piezas que viven apagadas y se prenden donde hace falta. Con una
   malla por susto serian treinta y tres cosas en la escena para mostrar una. */
const actorG = new T.Group(); escena.add(actorG);
let figura = null;
function armaActores(){
  if (figura){ actorG.remove(figura); figura.traverse(o => { if (o.geometry && o.geometry !== PROC.criatura) o.geometry.dispose(); }); }
  figura = new T.Group();
  const m = GLB.criatura ? ajusta(GLB.criatura, ALTO_MOD.criatura, 'y', true) : new T.Mesh(PROC.criatura, matVert);
  m.traverse(o => { if (o.isMesh){ o.castShadow = true; } });
  figura.add(m); figura.visible = false; actorG.add(figura);
}
armaActores();
const manoG = new T.Group(); manoG.visible = false; actorG.add(manoG);
{
  const g = fundir([
    { g: new T.CapsuleGeometry(0.055, 0.30, 4, 8), c: '#6e675d', p: [0, 0.16, 0] },
    { g: new T.SphereGeometry(0.055, 8, 6), c: '#786f63', p: [0, 0.34, 0] },
    { g: new T.CapsuleGeometry(0.014, 0.11, 2, 5), c: '#786f63', p: [0.035, 0.42, 0], r: [0, 0, -0.2] },
    { g: new T.CapsuleGeometry(0.014, 0.12, 2, 5), c: '#786f63', p: [0.012, 0.44, 0] },
    { g: new T.CapsuleGeometry(0.014, 0.12, 2, 5), c: '#786f63', p: [-0.012, 0.44, 0] },
    { g: new T.CapsuleGeometry(0.014, 0.10, 2, 5), c: '#786f63', p: [-0.036, 0.42, 0], r: [0, 0, 0.2] }
  ]);
  const h = new T.Mesh(g, matVert); h.castShadow = true; manoG.add(h);
}
/* la nube de bichos: una malla instanciada, porque noventa polillas sueltas son
   noventa llamadas de dibujo para tapar la pantalla dos segundos */
const bichosM = new T.InstancedMesh(new T.PlaneGeometry(0.05, 0.03),
  new T.MeshBasicMaterial({ color: 0x6a5f4a, side: T.DoubleSide, transparent: true, opacity: 0.9 }), 120);
bichosM.visible = false; bichosM.frustumCulled = false; actorG.add(bichosM);
/* la cara que aparece en el agua: un plano con ojos y boca dibujados */
function texCara(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(210,200,188,0.92)';
  x.beginPath(); x.ellipse(64, 66, 34, 44, 0, 0, 6.3); x.fill();
  x.fillStyle = '#0a0a0c';
  x.beginPath(); x.ellipse(50, 56, 7, 10, 0, 0, 6.3); x.fill();
  x.beginPath(); x.ellipse(78, 56, 7, 10, 0, 0, 6.3); x.fill();
  x.beginPath(); x.ellipse(64, 92, 11, 16, 0, 0, 6.3); x.fill();
  const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter;
  t.generateMipmaps = false; return t;
}
const caraM = new T.Mesh(new T.PlaneGeometry(0.17, 0.21),
  new T.MeshBasicMaterial({ map: texCara(), transparent: true, depthWrite: false }));
caraM.visible = false; bolG.add(caraM);
const sangreM = new T.Mesh(new T.PlaneGeometry(3.0, 3.0),
  new T.MeshBasicMaterial({ color: 0x4a0808, transparent: true, opacity: 0.85 }));
sangreM.rotation.x = -Math.PI/2; sangreM.visible = false; actorG.add(sangreM);

/* ══════════ LOS SUSTOS, DIBUJADOS ══════════
   Veintitres clases. Cada una es una funcion del tiempo: recibe cuanto lleva
   corrido el susto entre 0 y 1 y deja los actores donde van. Nada de esto es
   una imagen que aparece: son cosas que le pasan a la habitacion. */
const EFE = { t: 0, luzK: 1, blanco: 0, rojo: 0, borroso: 0, sacude: 0, mirarA: 0, techoY: 0, estira: 0 };
const _v = new T.Vector3(), _v2 = new T.Vector3();
function adelanteDe(){ return _v.set(-Math.sin(cuerpo.rotation.y), 0, -Math.cos(cuerpo.rotation.y)); }
function costadoDe(){ return _v2.set(Math.cos(cuerpo.rotation.y), 0, -Math.sin(cuerpo.rotation.y)); }
function ponActor(o, ade, lado, alto){
  const a = adelanteDe().clone(), l = costadoDe().clone();
  o.position.set(cuerpo.position.x + a.x*ade + l.x*lado, cuerpo.position.y + alto, cuerpo.position.z + a.z*ade + l.z*lado);
  o.visible = true;
}
function miraAlJugador(o){ o.rotation.y = Math.atan2(cuerpo.position.x - o.position.x, cuerpo.position.z - o.position.z); }

function animaSusto(S, u, R){
  const P = S.p || {}, q = MUNDO.cuartos[R.cuarto], D = q.def;
  const golpe = u < 0.12 ? u/0.12 : Math.exp(-(u - 0.12)*5.0);
  switch (S.clase){
    case 'figura': {
      figura.visible = true;
      if (P.modo === 'cruza'){ ponActor(figura, P.d, lerp(-D.ancho*0.42, D.ancho*0.42, u), 0);
        figura.rotation.y = cuerpo.rotation.y + Math.PI/2; }
      else if (P.modo === 'acerca'){ ponActor(figura, lerp(P.d, 2.4, u*u), 0, 0); miraAlJugador(figura); }
      else if (P.modo === 'gatea'){ ponActor(figura, lerp(P.d, 2.2, u), lerp(0.7, -0.7, u), 0.10);
        figura.rotation.set(1.15, cuerpo.rotation.y + 0.6, 0); }
      else if (P.modo === 'patas'){ ponActor(figura, lerp(6.2, 2.6, u), lerp(-0.8, 0.8, u), 0);
        figura.rotation.set(0, cuerpo.rotation.y + 1.2, 0); figura.scale.setScalar(0.22); }
      else { /* encima */ ponActor(figura, lerp(P.d, 0.55, Math.min(1, u*1.7)), 0, 0); miraAlJugador(figura);
        EFE.borroso = golpe*1.2; }
      if (P.modo !== 'patas') figura.scale.setScalar(1);
      break; }
    case 'mano': {
      manoG.visible = true;
      if (P.desde === 'abajo'){ ponActor(manoG, 2.0, 0.34, lerp(-0.60, 1.35, Math.min(1, u*2.2))); manoG.rotation.set(0, cuerpo.rotation.y, 0); }
      else { /* toca el tablon desde abajo */ manoG.position.copy(manos.getWorldPosition(new T.Vector3()));
        manoG.position.y += lerp(-0.85, -0.12, Math.min(1, u*2.4)); manoG.rotation.set(0, cuerpo.rotation.y, 0); }
      break; }
    case 'luz': {
      if (P.modo === 'negro'){ EFE.luzK = u < 0.62 ? 0.02 : 1.0;
        if (u >= 0.62 && P.cara){ figura.visible = true; ponActor(figura, 0.8, 0, 0); miraAlJugador(figura); EFE.borroso = 1.4; } }
      else { EFE.luzK = (Math.sin(u*46) > 0 ? 1 : 0.06);
        if (P.multitud){ figura.visible = Math.sin(u*46) < 0;
          ponActor(figura, 3.0 + Math.sin(u*9)*1.0, Math.sin(u*13)*0.55, 0); miraAlJugador(figura); } }
      break; }
    case 'cae': { manoG.visible = false; figura.visible = true;
      ponActor(figura, P.d, 0.5, lerp(P.alto, -0.2, u*u)); figura.rotation.set(0.2, cuerpo.rotation.y + 2.4, u*3.0); break; }
    case 'desliza': { const o = q.silla || q.ropero; if (o){ o.userData.dx = lerp(0, P.d, u); o.rotation.z = Math.sin(u*20)*0.05; } break; }
    case 'espejo': { figura.visible = true; ponActor(figura, 2.9, 0, 0); figura.rotation.y = cuerpo.rotation.y;
      figura.scale.setScalar(1); if (u > 0.55) figura.rotation.y = cuerpo.rotation.y + Math.PI*Math.min(1, (u - 0.55)*3.4); break; }
    case 'agua': {
      if (P.modo === 'cara'){ caraM.visible = true; caraM.position.set(0, R.h + 0.004 + Math.sin(u*3)*0.004, 0);
        caraM.rotation.set(-Math.PI/2, 0, 0); caraM.material.opacity = Math.sin(Math.min(1, u)*Math.PI); }
      else if (P.modo === 'manos'){ manoG.visible = true;
        manoG.position.copy(bolG.getWorldPosition(new T.Vector3()));
        manoG.position.y += lerp(-0.25, 0.16, Math.min(1, u*2.0)); manoG.scale.setScalar(0.44);
        manoG.rotation.set(0, cuerpo.rotation.y + u*3, 0); }
      else { aguaM.material.color.setHex(0x0a0405); }
      break; }
    case 'piso': { EFE.sacude = golpe*0.9; EFE.techoY = -Math.sin(u*Math.PI)*0.22; break; }
    case 'pared': { manoG.visible = true; ponActor(manoG, 1.6, Math.min(0.34, D.ancho/2 - 0.12), 1.45);
      manoG.rotation.set(0, cuerpo.rotation.y - Math.PI/2, 1.5708); manoG.scale.setScalar(1); break; }
    case 'bichos': { bichosM.visible = true;
      const M = new T.Matrix4(), a = adelanteDe().clone(), l = costadoDe().clone();
      for (let i = 0; i < 120; i++){
        const f = i*0.618, r = 0.5 + (i % 7)*0.22, an = f*17 + EFE.t*3.4 + i;
        const d = lerp(2.6, 0.35, u) + Math.sin(an)*0.3;
        M.makeTranslation(cuerpo.position.x + a.x*d + l.x*Math.cos(an)*r,
                          cuerpo.position.y + 1.1 + Math.sin(an*1.7)*r*0.8,
                          cuerpo.position.z + a.z*d + l.z*Math.cos(an)*r);
        bichosM.setMatrixAt(i, M);
      }
      bichosM.instanceMatrix.needsUpdate = true; break; }
    case 'rueda': { figura.visible = true; figura.scale.setScalar(0.19);
      ponActor(figura, lerp(P.d, 1.8, u*u), 0, 0); figura.rotation.set(u*22, cuerpo.rotation.y, 0);
      if (u > 0.78){ figura.scale.setScalar(1); ponActor(figura, 0.7, 0, 0); miraAlJugador(figura); EFE.borroso = 1.0; } break; }
    case 'techo': { if (P.cierra){ EFE.estira = -Math.sin(u*Math.PI)*0.55; }
      else EFE.techoY = -Math.sin(u*Math.PI)*P.baja; break; }
    case 'aliento': { EFE.borroso = Math.sin(u*Math.PI)*1.6; EFE.luzK = 1 - Math.sin(u*Math.PI)*0.35; break; }
    case 'cuadro': { const o = q.cuadro; if (o){ o.rotation.z = Math.sin(u*30)*0.16;
        if (u > 0.5){ figura.visible = true; ponActor(figura, 1.1, 0, 0); miraAlJugador(figura); } } break; }
    case 'sangre': { sangreM.visible = true;
      sangreM.position.set(cuerpo.position.x, cuerpo.position.y + 0.015, cuerpo.position.z);
      sangreM.scale.setScalar(0.2 + u*1.5); sangreM.material.opacity = 0.85*Math.min(1, u*2.2);
      EFE.rojo = Math.sin(u*Math.PI)*0.35; break; }
    case 'ventana': { EFE.blanco = golpe*0.55; EFE.sacude = golpe*1.2;
      figura.visible = true; ponActor(figura, 2.4, -Math.min(0.55, D.ancho*0.24), 0.15); miraAlJugador(figura); break; }
    case 'mueble': { const o = q.ropero || q.silla; if (o){ o.rotation.y = Math.sin(u*24)*0.09; }
      if (u > 0.45){ figura.visible = true; ponActor(figura, 2.6, -0.55, 0); miraAlJugador(figura); } break; }
    case 'estira': { EFE.estira = Math.sin(u*Math.PI)*0.85;
      figura.visible = true; ponActor(figura, 9.5, 0, 0); miraAlJugador(figura); break; }
    case 'detras': { EFE.mirarA = Math.sin(u*Math.PI)*0.9;
      figura.visible = u > 0.5; ponActor(figura, -2.2, 0.35, 0); miraAlJugador(figura); break; }
    case 'cuerpo': { figura.visible = true; ponActor(figura, 3.2, Math.min(0.75, D.ancho*0.26), lerp(2.6, -0.9, u*u));
      figura.rotation.set(1.5, cuerpo.rotation.y, u*5); break; }
    case 'copia': { figura.visible = true; ponActor(figura, 2.2, 0, 0);
      figura.rotation.y = cuerpo.rotation.y + Math.PI + LOOK.yaw*1.4; break; }
    case 'tele': { const o = q.tele; EFE.luzK = 0.35 + (Math.sin(u*70) > 0 ? 0.5 : 0);
      if (o){ LUZ2.position.copy(o.getWorldPosition(new T.Vector3())); LUZ2.position.y += 0.4;
        LUZ2.intensity = 26*(Math.sin(u*70) > 0 ? 1 : 0.2); }
      if (u > 0.6){ figura.visible = true; ponActor(figura, 2.6, 0, 0); miraAlJugador(figura); } break; }
    case 'puerta': { const o = P.mueble ? (q.ropero || q.puerta) : (q.puerta || q.ropero);
      if (o){ o.rotation.y += (P.lado > 0 ? 1 : -1)*Math.min(1, u*P.vel)*0.02; }
      EFE.sacude = golpe*0.8; if (P.mueble && u > 0.5){ figura.visible = true;
        ponActor(figura, 1.9, P.lado*1.1, 0); miraAlJugador(figura); } break; }
  }
}

/* ══════════ LA MIRADA ══════════
   Solo de costado, y con tope: el cabeceo lo pone el juego para que el bol
   siempre este en cuadro. */
const LOOK = { yaw: 0, obj: 0 };

/* ══════════ PINTAR ══════════ */
let F_LUZ = 0;
function pinta(dt){
  const R = RUN;
  EFE.t += dt;
  EFE.luzK = 1; EFE.blanco = 0; EFE.rojo = 0; EFE.borroso = 0; EFE.sacude = 0;
  EFE.mirarA = 0; EFE.techoY = 0; EFE.estira = 0;
  figura.visible = false; manoG.visible = false; bichosM.visible = false;
  caraM.visible = false; sangreM.visible = false;
  manoG.scale.setScalar(1); LUZ2.intensity = 0;
  if (aguaM) aguaM.material.color.setHex(0x14303e);

  const p = puntoEn(R ? R.s : 0);
  cuerpo.position.set(p.x, p.y, p.z);
  const objYaw = p.gir + LOOK.yaw;
  cuerpo.rotation.y += (objYaw - cuerpo.rotation.y)*Math.min(1, dt*7);

  /* el susto que este corriendo */
  if (R && R.susto) animaSusto(R.susto, Math.min(1, R.sustoT/R.susto.dur), R);
  /* la luz del susto va DELANTE del actor, hacia la camara: puesta detras lo
     deja en silueta contra una pared que ya esta oscura, o sea invisible */
  const actor = figura && figura.visible ? figura : (manoG.visible ? manoG : null);
  if (actor){
    actor.getWorldPosition(_v2);
    const cp = cam.getWorldPosition(_v);
    const dx = cp.x - _v2.x, dz = cp.z - _v2.z, dd = Math.max(0.6, Math.hypot(dx, dz));
    const f = Math.min(1.25, dd*0.42)/dd;
    LUZ_SUS.position.set(_v2.x + dx*f, _v2.y + 1.35, _v2.z + dz*f);
    /* ── Y CRECE CON LA DISTANCIA, PORQUE SI NO QUEMA LO DE CERCA ──
       El foco se planta a un metro y cuarto del actor pase lo que pase, asi que
       con una intensidad fija una mano a un metro del ojo recibe lo mismo que
       una figura a siete: medido, la mano salia como una mancha blanca sin
       forma que ocupaba media pantalla. Lo que hay que igualar no es la
       distancia al foco sino cuanto se ve del actor, o sea la distancia a la
       CAMARA. */
    LUZ_SUS.intensity = Math.min(17, 1.6 + 1.9*dd)*EFE.luzK;
  } else LUZ_SUS.intensity = 0;

  /* el cabeceo del paso mas el sacudon del susto */
  const sac = (R ? R.temblor*0.55 : 0) + EFE.sacude;
  cabeza.position.set((R ? R.camX*0.4 : 0) + (Math.random() - 0.5)*sac*0.09,
                      OJO + (R ? R.camY : 0) + (Math.random() - 0.5)*sac*0.09 + EFE.techoY*0.3, 0);
  cabeza.rotation.z = (R ? R.camX*0.10 : 0) + (Math.random() - 0.5)*sac*0.05 + EFE.mirarA*0.10;
  cabeza.rotation.y = EFE.mirarA*3.5;

  /* ── EL TABLON Y EL BOL ── */
  if (R){
    tablonG.rotation.set(R.tz, 0, -R.tx);
    bolG.position.set(R.bx, 0.028, R.bz);
    if (aguaM){
      aguaM.position.set(0, 0.012 + R.h, 0);
      /* la superficie es un plano: la inclinacion se dibuja acotada a lo que la
         geometria del bol permite, porque un disco mas inclinado que el borde
         saldria atravesando la ceramica */
      const lim = (BOL_BORDE - R.h)/BOL_R;
      aguaM.rotation.set(-Math.PI/2 + cl(R.az, -lim, lim), 0, cl(-R.ax, -lim, lim));
      aguaM.scale.setScalar(R.h > 0.004 ? 1 : 0.001);
    }
  }
  manos.position.y = 1.18 + (R ? R.camY*0.5 : 0);

  /* ── LA LUZ SE MUDA A LA LAMPARA DEL CUARTO ── */
  const qi = R ? R.cuarto : 0, q = MUNDO.cuartos[qi];
  /* ── SE MUDA A LA LAMPARA MAS CERCANA, Y POR ESO HAY VARIAS POR CUARTO ──
     Con UNA lampara en un cuarto de once metros, la mayor parte de la caminata
     se hace a seis u ocho metros de la unica luz que hay: medido, el zaguan
     —que tiene la lampara mas fuerte de la casa— daba tres sobre 255 en el
     borde de arriba del cuadro y el pasillo daba treinta y seis, o sea que lo
     que decidia el brillo no era la potencia sino la DISTANCIA. Ahora cada
     cuarto lleva dos o tres repartidas a lo largo y la luz se muda a la que
     tiene mas cerca; el resto de las lamparas siguen siendo geometria. */
  let mejorL = null, mejorD = 1e9;
  if (q && q.lamparas){
    const E = new T.Euler(0, q.gir, 0);
    for (const L of q.lamparas){
      _v2.set(L.x, L.y, L.z).applyEuler(E).add(_v.set(q.x, q.y, q.z));
      const d = (_v2.x - cuerpo.position.x)**2 + (_v2.z - cuerpo.position.z)**2;
      if (d < mejorD){ mejorD = d; mejorL = _v2.clone(); }
    }
  }
  /* la luz cuelga medio metro por debajo de la lampara: pegada al techo, la
     unica cara que ve es el techo, y el techo mira para abajo */
  if (mejorL) LUZ.position.set(mejorL.x, mejorL.y - 0.45, mejorL.z);
  else LUZ.position.set(cuerpo.position.x, cuerpo.position.y + 2.2, cuerpo.position.z);
  /* el parpadeo: dos senos que no son multiplos, asi que no se repite igual */
  F_LUZ += dt;
  const flick = 0.86 + Math.sin(F_LUZ*11.3)*0.07 + Math.sin(F_LUZ*3.7)*0.07;
  const baseLuz = q ? q.def.luz : 0.2;
  LUZ.intensity = 155*baseLuz*flick*EFE.luzK;
  /* la llama titila con dos senos que no son multiplos: uno solo se repite
     igual y el ojo lo aprende en tres segundos */
  const vel = 0.86 + Math.sin(F_LUZ*17.7)*0.09 + Math.sin(F_LUZ*6.3)*0.07;
  LUZ_MANO.intensity = 22*vel*(0.35 + 0.65*EFE.luzK);
  if (llamaM){ llamaM.scale.set(0.8 + vel*0.3, 0.7 + vel*0.5, 0.8 + vel*0.3); }
  /* la sombra sale de la vela y apunta adelante: es la unica luz que se mueve
     con el jugador, asi que es la unica cuya sombra se puede leer */
  const pv = tablonG.getWorldPosition(_v2);
  const ad = adelanteDe();
  SOL.position.set(pv.x, pv.y + 0.30, pv.z);
  SOL.target.position.set(pv.x + ad.x*3, pv.y - 1.0, pv.z + ad.z*3);
  SOL.target.updateMatrixWorld();
  SOL.intensity = 0.55*EFE.luzK;
  if (q) escena.fog.color.setHex(q.def.col).multiplyScalar(0.55);

  /* solo se dibujan los cuartos de al lado: el resto no puede aportar un pixel */
  for (let i = 0; i < cuartosG.length; i++) cuartosG[i].visible = Math.abs(i - qi) <= 1;

  /* el pasillo que se estira: la camara se acerca y el campo se abre, que es
     el zoom de vertigo — la habitacion se alarga sin que nada se mueva */
  cam.fov = 68 + EFE.estira*22;
  cam.updateProjectionMatrix();

  postMat.uniforms.t.value = EFE.t;
  postMat.uniforms.blanco.value = EFE.blanco;
  postMat.uniforms.rojo.value = Math.max(EFE.rojo, R && R.h < AGUA_H0*0.25 ? (1 - R.h/(AGUA_H0*0.25))*0.30 : 0);
  postMat.uniforms.borroso.value = EFE.borroso;

  render.info.reset();
  render.setRenderTarget(RT); render.render(escena, cam);
  render.setRenderTarget(null); render.render(postEsc, postCam);
}
