
/* ══════════════════════════ AJUSTES Y CÁMARA ══════════════════════════ */
const CFG = {
  /* ── EL PIXELADO ──
     La escena NO se dibuja en la pantalla: se dibuja en un destino de render
     más chico y ese destino se estira con NEAREST. Eso no es un filtro puesto
     encima — es la razón por la que esto corre en un teléfono, porque lo que
     siempre paga en un juego de noche con faroles es el RELLENO de píxeles.
     VA EN 1,7 Y NO EN 2,4: se pidió «pixelación SUAVE». En un marco de 892×412
     el 1,7 deja el destino en 525×242, o sea que el escalón se ve —los cables,
     las rejas y la lluvia salen con el borde escalonado, que es lo que da el
     aire— pero un número de casa a veinte metros se sigue distinguiendo. En 2,4
     los postes y los cables se empastan contra el cielo.
     Y ES DECIMAL A PROPÓSITO: `medir()` divide y redondea, así que el ajuste no
     tiene por qué ser entero — con enteros no hay nada entre «casi limpio» y
     «empastado». */
  pix: 1.7,
  /* el color: de noche y bajo la lluvia lo que hay es poco contraste y mucho
     azul, así que la saturación va BAJA y el tinte se pone a mano */
  sat: 0.86, bri: 1.30, con: 1.15,
  /* CUÁNTOS ESCALONES DE COLOR. Acá también «suave»: 26 bandas por canal se ven
     como una imagen de consola vieja y no como un póster de cuatro colores. Con
     9 —que es lo que usa LEMI— un cielo nocturno, que es un degradado de arriba
     abajo, sale a rayas horizontales bien marcadas. */
  pos: 26,
  grano: 0.055,
  niebla: 0.0165,
  gotas: 2600, sombras: true, charcos: true,
  linterna: false
};
/* ── LAS TRES CALIDADES ──
   Cambian lo que CUESTA y no lo que el barrio es: las mismas veinticinco
   cuadras, las mismas casas y los mismos faroles en las tres. Lo que se mueve
   es cuántos píxeles hay que rellenar, cuántas gotas se dibujan, cuántos
   faroles tienen luz de verdad y si hay sombras. */
const CALIDADES = {
  baja:  { pix: 2.4, gotas: 1100, sombras: false, charcos: false, luces: 4, grano: 0.045 },
  media: { pix: 1.7, gotas: 2600, sombras: true,  charcos: true,  luces: 6, grano: 0.055 },
  alta:  { pix: 1.25, gotas: 4200, sombras: true, charcos: true,  luces: 8, grano: 0.062 }
};
let CALIDAD = 'media';

const $ = (id) => document.getElementById(id);
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

const ren = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
ren.setPixelRatio(1);            /* el pixelado lo hace el destino de render */
ren.shadowMap.enabled = true;
ren.shadowMap.type = T.PCFSoftShadowMap;
ren.outputColorSpace = T.SRGBColorSpace;
$('escenario').appendChild(ren.domElement);

const escena = new T.Scene();
/* LA NIEBLA ES EXPONENCIAL Y NO LINEAL, y es media atmósfera del juego. Con
   lluvia y de noche, lo que hay a cuarenta metros se ve peor que lo que hay a
   veinte por una curva que no es una recta; y de paso resuelve el problema de
   que un damero de cinco por cinco tiene calles de doscientos setenta metros
   que se verían enteras hasta el horizonte. */
escena.fog = new T.FogExp2(0x0a1018, CFG.niebla);

const cam = new T.PerspectiveCamera(70, 2, 0.1, 420);
cam.rotation.order = 'YXZ';

/* ── EL DESTINO DE RENDER Y LA PASADA DE COLOR ──
   Todo se dibuja acá adentro y recién después se estira. La corrección de
   gamma va A MANO: three.js aplica `outputColorSpace` SÓLO cuando dibuja en el
   buffer de pantalla, así que con un `WebGLRenderTarget` la imagen llega en
   LINEAL — y sin convertirla, la noche sale casi negra con un tinte verdoso.
   Es la misma trampa que ya costó una medición en RECREO. */
let rt = null;
const postMat = new T.ShaderMaterial({
  uniforms: {
    tex:  { value: null },
    sat:  { value: CFG.sat }, bri: { value: CFG.bri }, con: { value: CFG.con },
    pos:  { value: CFG.pos }, vig: { value: 0.62 }, grano: { value: CFG.grano },
    t:    { value: 0 },
    /* el agua en el lente: no es una gota dibujada sino una ondulación muy
       suave del muestreo, que es lo que hace un vidrio mojado */
    agua: { value: 0.55 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tex; uniform float sat, bri, con, pos, vig, grano, t, agua;
    varying vec2 vUv;
    float ruido(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      /* EL AGUA EN EL LENTE VA ANTES DE MUESTREAR, o sea que deforma la imagen
         en vez de pintarse encima. Dos senos lentos de frecuencias que no son
         múltiplos entre sí: así el ciclo no se repite nunca igual y no se lee
         como una animación. La amplitud es de menos de un píxel del destino de
         render — más que eso ya no es un vidrio mojado, es estar borracho. */
      float on = sin(uv.y*38.0 + t*1.7) * sin(uv.x*23.0 - t*1.1);
      uv += vec2(on, on*0.6) * 0.0016 * agua;
      vec3 c = texture2D(tex, uv).rgb;
      c = pow(max(c, 0.0), vec3(1.0/2.2));          /* lineal -> sRGB */
      c *= bri;
      c = (c - 0.5) * con + 0.5;
      float g = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(g), c, sat);
      /* EL TINTE DE LA NOCHE VA EN LAS SOMBRAS Y NO EN TODO EL CUADRO. Tiñendo
         parejo, los faroles —que son lo único cálido que hay— salen azules
         también, y ahí se pierde el único contraste de color del juego. */
      c += vec3(-0.010, 0.004, 0.030) * (1.0 - g);
      float r2 = dot(vUv - 0.5, vUv - 0.5);
      c *= 1.0 - smoothstep(0.06, 0.72, r2) * vig;
      /* el grano va anclado a la PANTALLA y no al mundo: es ruido de sensor de
         una cámara mala, no polvo pegado a las paredes */
      c += (ruido(floor(vUv * 620.0) + floor(t*11.0)) - 0.5) * grano;
      if (pos > 1.5) c = floor(c * pos + 0.5) / pos;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
  depthTest: false, depthWrite: false
});
const postEsc = new T.Scene();
const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
{
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]), 3));
  g.setAttribute('uv', new T.BufferAttribute(new Float32Array([0,0, 2,0, 0,2]), 2));
  postEsc.add(new T.Mesh(g, postMat));
}

/* ── EL MARCO ──
   El juego se dibuja apaisado. En un teléfono vertical eso son dos opciones: o
   se encoge a una franja del once por ciento de la pantalla, o se GIRA. Se
   gira, y se gira el escenario entero para que el HUD acompañe. */
let W = 0, H2 = 0, GIRADO = false;
function medir(){
  const w = window.innerWidth, h = window.innerHeight;
  GIRADO = h > w;
  W = GIRADO ? h : w; H2 = GIRADO ? w : h;
  document.body.classList.toggle('girado', GIRADO);
  const e = $('escenario');
  e.style.width = W + 'px'; e.style.height = H2 + 'px';
  document.documentElement.style.setProperty('--eh', H2 + 'px');
  cam.aspect = W / H2; cam.updateProjectionMatrix();
  ren.setSize(W, H2, false);
  const rw = Math.max(64, Math.round(W / CFG.pix)), rh = Math.max(64, Math.round(H2 / CFG.pix));
  if (rt) rt.dispose();
  rt = new T.WebGLRenderTarget(rw, rh, {
    minFilter: T.NearestFilter, magFilter: T.NearestFilter,
    depthBuffer: true, colorSpace: T.LinearSRGBColorSpace
  });
  postMat.uniforms.tex.value = rt.texture;
}
window.addEventListener('resize', () => { clearTimeout(window.__rz); window.__rz = setTimeout(medir, 220); });

const RELOJ = { value: 0 };
let MODO = 'menu';         /* menu · juego */
let PAUSA = false;
