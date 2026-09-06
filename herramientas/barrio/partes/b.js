
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
  linterna: false,
  tercera: false        /* la cámara detrás del personaje */
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
/* EL SEGUNDO DESTINO ES SÓLO PARA LA CABEZA DE LA CINEMÁTICA, y existe por una
   razón concreta: el plano de la cara pide el fondo DESENFOCADO y la cara
   NÍTIDA. Dibujando todo junto no hay forma de separarlos sin un mapa de
   profundidad; con dos pasadas —el mundo en `rt` y la cabeza sola en `rtH`— la
   composición es una línea de shader. Y la cabeza va al MISMO tamaño reducido,
   porque a resolución completa sería lo único sin pixelar de la pantalla. */
let rtH = null;
const postMat = new T.ShaderMaterial({
  uniforms: {
    tex:  { value: null },
    sat:  { value: CFG.sat }, bri: { value: CFG.bri }, con: { value: CFG.con },
    pos:  { value: CFG.pos }, vig: { value: 0.62 }, grano: { value: CFG.grano },
    t:    { value: 0 },
    /* el agua en el lente: no es una gota dibujada sino una ondulación muy
       suave del muestreo, que es lo que hace un vidrio mojado */
    agua: { value: 0.55 },
    /* ── LO QUE SÓLO EXISTE EN LA CINEMÁTICA ──
       `dof` es el desenfoque del fondo, `cara` dice si hay que componer encima
       la pasada de la cabeza, `abe` es la aberración cromática del lente y
       `asp` es la proporción del cuadro — sin ella el bokeh sale ovalado,
       porque un desplazamiento en UV mide distinto en X que en Y.
       LOS TRES ARRANCAN EN CERO Y EL JUEGO NO PAGA NADA: el `if` de abajo deja
       una sola muestra por píxel mientras no haya cinemática. */
    texH: { value: null },
    dof:  { value: 0 }, cara: { value: 0 }, abe: { value: 0 }, asp: { value: 2 },
    /* `dofS` es el desenfoque del SUJETO, y existe para el plano de las
       pastillas: un enfoque que se hace no es el fondo que se aclara, es lo que
       uno mira lo que se resuelve. Con un solo `dof` el fondo se desenfoca y el
       sujeto nace nítido, que es exactamente lo que un rack focus no hace. */
    dofS: { value: 0 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tex, texH;
    uniform float sat, bri, con, pos, vig, grano, t, agua, dof, cara, abe, asp, dofS;
    varying vec2 vUv;
    float ruido(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    /* ── EL DESENFOQUE DEL FONDO ──
       Trece muestras en espiral de ángulo áureo. La espiral no es coquetería:
       con un anillo regular de doce puntos el desenfoque de un farol sale como
       doce copias del farol en círculo, que es exactamente lo que se ve cuando
       un desenfoque está mal muestreado. Repartidas por raíz del índice, la
       densidad queda pareja en el disco.
       Y VA CON EL MUESTREO NEAREST DEL DESTINO, que es lo correcto acá: este
       juego se dibuja a 1/1,7 y se estira con NEAREST, así que un desenfoque
       suave por interpolación sería lo ÚNICO liso del cuadro y se leería como
       un elemento pegado encima. */
    vec3 borrosa(vec2 uv, float r){
      vec3 s = texture2D(tex, uv).rgb;
      for (int i = 0; i < 12; i++){
        float a = float(i) * 2.39996323;
        float d = sqrt((float(i) + 0.5) / 12.0) * r;
        s += texture2D(tex, uv + vec2(cos(a) / asp, sin(a)) * d).rgb;
      }
      return s / 13.0;
    }
    void main(){
      vec2 uv = vUv;
      /* EL AGUA EN EL LENTE VA ANTES DE MUESTREAR, o sea que deforma la imagen
         en vez de pintarse encima. Dos senos lentos de frecuencias que no son
         múltiplos entre sí: así el ciclo no se repite nunca igual y no se lee
         como una animación. La amplitud es de menos de un píxel del destino de
         render — más que eso ya no es un vidrio mojado, es estar borracho. */
      float on = sin(uv.y*38.0 + t*1.7) * sin(uv.x*23.0 - t*1.1);
      uv += vec2(on, on*0.6) * 0.0016 * agua;
      vec2 dd = uv - 0.5;
      float ka = abe * dot(dd, dd);
      vec3 c;
      if (dof > 0.002) c = borrosa(uv, dof * 0.017);
      else if (ka > 0.0) {
        /* LA ABERRACIÓN VA SÓLO DONDE HAY ALGO NÍTIDO. Un fondo ya desenfocado
           no puede mostrar franjas de color en un borde que no tiene: hacerlo
           igual cuesta veintiséis muestras más para no cambiar un píxel. */
        c = texture2D(tex, uv).rgb;
        c.r = texture2D(tex, uv + dd * ka).r;
        c.b = texture2D(tex, uv - dd * ka).b;
      } else c = texture2D(tex, uv).rgb;
      /* LA CABEZA SE COMPONE ANTES DE LA GAMMA. Los dos destinos guardan color
         LINEAL, así que mezclarlos después de convertir a sRGB daría un borde
         más claro de lo que corresponde alrededor de la silueta. */
      if (cara > 0.5){
        /* EL SUJETO DESENFOCADO SE MEZCLA POR SU ALFA DESENFOCADO, y por eso la
           silueta se ablanda sola: un objeto fuera de foco no tiene borde. */
        vec4 h;
        if (dofS > 0.002){
          h = texture2D(texH, uv); float w = 1.0;
          for (int i = 0; i < 8; i++){
            float ang = float(i) * 2.39996;
            float rr = dofS * 0.017 * sqrt((float(i) + 0.5) / 8.0);
            h += texture2D(texH, uv + vec2(cos(ang)*rr/asp, sin(ang)*rr)); w += 1.0;
          }
          h /= w;
        } else h = texture2D(texH, uv);
        if (h.a > 0.0){
          vec3 hc = h.rgb;
          if (dofS <= 0.002){
            hc.r = texture2D(texH, uv + dd * ka).r;
            hc.b = texture2D(texH, uv - dd * ka).b;
          }
          c = mix(c, hc, clamp(h.a, 0.0, 1.0));
        }
      }
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
  if (rtH) rtH.dispose();
  rtH = new T.WebGLRenderTarget(rw, rh, {
    minFilter: T.NearestFilter, magFilter: T.NearestFilter,
    depthBuffer: true, colorSpace: T.LinearSRGBColorSpace
  });
  postMat.uniforms.texH.value = rtH.texture;
  postMat.uniforms.asp.value = W / H2;
}
window.addEventListener('resize', () => { clearTimeout(window.__rz); window.__rz = setTimeout(medir, 220); });

const RELOJ = { value: 0 };
let MODO = 'menu';         /* menu · cine · juego */
let PAUSA = false;
