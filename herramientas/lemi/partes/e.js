/* ══════════════════════════ EL PIXELADO ══════════════════════════
   La escena entera va a un render target chico con filtro NEAREST, y este
   material lo estira a pantalla completa haciendo de paso el grado de color.
   Trabaja sobre valores YA en sRGB —el render target los codifica al
   escribir— así que saturación y brillo se comportan como uno espera de esas
   dos palabras, y no como una curva rara en espacio lineal. */
let rt = null;
const postMat = new T.ShaderMaterial({
  uniforms: {
    tex:  { value: null },
    sat:  { value: CFG.sat },
    bri:  { value: CFG.bri },
    con:  { value: CFG.con },
    pos:  { value: CFG.pos },
    vig:  { value: 0.46 }
  },
  vertexShader: `varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tex; uniform float sat, bri, con, pos, vig; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tex, vUv).rgb;
      c *= bri;
      c = (c - 0.5) * con + 0.5;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      /* LA VIÑETA VA ANTES DE LAS BANDAS. Puesta después quedaba como un
         degradado suave encima de una imagen escalonada, y se notaba que era un
         filtro pegado. Cortada en los mismos niveles de color, el oscurecimiento
         de las esquinas avanza a saltos igual que el resto del cuadro. */
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      c *= 1.0 - r2 * vig - r2 * r2 * vig * 1.35;
      if (pos > 1.5){ c = floor(c * pos + 0.5) / pos; }   /* bandas de color */
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

let W = 1, H2 = 1, GIRADO = false;
CFG.girar = true;

/* ══════ COORDENADAS DEL ESCENARIO ══════
   Con el escenario girado, un dedo que cruza la pantalla de izquierda a derecha
   se mueve en VERTICAL en coordenadas de ventana. Si los controles leen
   `clientX/clientY` a secas, mirar y caminar quedan cruzados y espejados.
   Todo lo que toca el dedo pasa por acá.

   El escenario se coloca con `rotate(90deg) translateY(-100%)` y origen arriba
   a la izquierda, así que un punto local (x,y) cae en la ventana en
   (altoEscenario - y, x). Invirtiéndolo: x = clientY, y = anchoVentana - clientX. */
function pt(e){
  if (!GIRADO) return { x: e.clientX, y: e.clientY };
  return { x: e.clientY, y: window.innerWidth - e.clientX };
}
/* el rectángulo de un elemento, también en coordenadas del escenario. Un giro
   de 90° deja el rectángulo alineado a los ejes, así que la conversión es exacta */
function rectEsc(el){
  const r = el.getBoundingClientRect();
  if (!GIRADO) return { x: r.left, y: r.top, w: r.width, h: r.height };
  return { x: r.top, y: window.innerWidth - r.right, w: r.height, h: r.width };
}

function medir(){
  const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
  /* se gira sólo si hace falta: aparato en vertical y la opción encendida */
  GIRADO = !!CFG.girar && vh > vw;
  document.body.classList.toggle('girado', GIRADO);
  W = GIRADO ? vh : vw;
  H2 = GIRADO ? vw : vh;
  const esc = document.getElementById('escenario');
  esc.style.width = W + 'px'; esc.style.height = H2 + 'px';
  /* EL ALTO DEL ESCENARIO, PUBLICADO COMO VARIABLE, y hace falta porque con el
     escenario GIRADO las unidades `vh` del CSS miden el eje equivocado: `vh` es
     el alto de la VENTANA, y con el teléfono en vertical eso son los 892 px del
     lado largo mientras que el alto del cuadro jugable son los 412 del corto.
     Medido: un `max-height:20vh` daba 178 px —el 20 % de 892— y el logo del menú
     empujaba el pie fuera del marco. Todo lo que se mida en proporción al alto
     del cuadro tiene que usar `--eh`, no `vh`. */
  esc.style.setProperty('--eh', H2 + 'px');
  esc.style.setProperty('--ew', W + 'px');
  ren.setSize(W, H2, false);
  cam.aspect = W / H2; cam.updateProjectionMatrix();
  const w = Math.max(1, Math.ceil(W / CFG.pix)), h = Math.max(1, Math.ceil(H2 / CFG.pix));
  if (rt) rt.dispose();
  rt = new T.WebGLRenderTarget(w, h, {
    minFilter: T.NearestFilter, magFilter: T.NearestFilter,
    depthBuffer: true, stencilBuffer: false,
    colorSpace: T.SRGBColorSpace       /* codifica al escribir: ver comentario de arriba */
  });
  postMat.uniforms.tex.value = rt.texture;
}

/* ══════════════════════════ CÁMARA Y CONTROLES ══════════════════════════ */
const JUG = { x: 0, z: 0, y: 0, vy: 0, aire: false, yaw: 0, pitch: -0.06, vuela: false, agacha: false };
const OJO = 1.72, VEL = 6.4, CORRE = 12.8, GRAV = 22, SALTO = 8.2;
let corre = false;
/* estado del CABECEO: fase del paso, amplitudes suavizadas y el golpe al caer */
const AND = { fase: 0, v: 0, ojo: OJO, roll: 0, dip: 0, lado: 0, fov: 66, golpe: 0 };
function saltar(){
  if (JUG.vuela || JUG.aire || PAUSA) return;
  JUG.vy = SALTO * (JUG.agacha ? 0.72 : 1); JUG.aire = true;
}
function ponAgacha(v){
  JUG.agacha = !!v;
  const b = document.getElementById('acAgacha');
  if (b) b.classList.toggle('on', JUG.agacha);
}
const teclas = {};
const movV = { x: 0, y: 0 };

/* dónde empezar: un punto de la isla que esté sobre la playa y no empinado */
/* BARRIDO EN REJILLA, NO SORTEO. Antes tiraba 900 puntos al azar y si ninguno
   servía te dejaba en el origen —que puede estar bajo el agua—. Ahora recorre
   una rejilla y se queda con el MEJOR candidato, así siempre hay respuesta y
   además es la misma para la misma isla. */
function ubicaInicio(){
  let mejor = null, mejorP = -1e9;
  for (let gx = -0.72; gx <= 0.72; gx += 0.045){
    for (let gz = -0.72; gz <= 0.72; gz += 0.045){
      const x = gx*MITAD, z = gz*MITAD;
      const h = H(x, z);
      if (h < PLAYA + 0.4) continue;
      const s = pendiente(x, z);
      if (s > 0.36) continue;
      /* se premia lo llano y una altura de mirador, y se castiga el borde */
      const p = (1 - s*2) * 3 + (1 - Math.abs(h - 13)/22) * 2.4 - Math.hypot(gx, gz);
      if (p > mejorP){ mejorP = p; mejor = { x, z, h }; }
    }
  }
  if (!mejor){
    /* isla toda sumergida (puede pasar con una semilla mala): se sube el punto */
    mejor = { x: 0, z: 0, h: Math.max(H(0,0), PLAYA + 1.2) };
  }
  JUG.x = mejor.x; JUG.z = mejor.z; JUG.y = mejor.h;
  JUG.vy = 0; JUG.aire = false; JUG.vuela = false;
  JUG.yaw = Math.atan2(mejor.x, mejor.z);   /* mismo signo que arriba */
}

addEventListener('keydown', e => {
  teclas[e.code] = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') corre = true;
  /* LA BARRA ESPACIADORA HACE DOS COSAS SEGÚN DÓNDE ESTÉS, y no puede hacer las
     dos: con el minijuego abierto bombea, y si no, salta. Saltando con el
     inflador en pantalla, el personaje pegaría brincos detrás del panel. */
  if (e.code === 'Space'){
    e.preventDefault();
    if (typeof MINI !== 'undefined' && MINI.on) MINI.golpe(); else saltar();
  }
  if (e.code === 'KeyE'){ e.preventDefault(); if (typeof MIS !== 'undefined') MIS.usa(); }
  if (e.code === 'ControlLeft' || e.code === 'ControlRight'){ e.preventDefault(); ponAgacha(true); }
  if (e.code === 'KeyF'){ JUG.vuela = !JUG.vuela; JUG.vy = 0; aviso(TX(JUG.vuela ? 'aVuelo' : 'aSuelo')); }
  if (e.code === 'Escape') pausa(!PAUSA);
  modoPC(true);
});
addEventListener('keyup', e => {
  teclas[e.code] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') corre = false;
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') ponAgacha(false);
});

/* ratón: al hacer clic se toma el puntero, que es lo natural en PC */
lienzo.addEventListener('click', () => {
  if (document.body.classList.contains('pc') && !document.pointerLockElement)
    lienzo.requestPointerLock();
});
addEventListener('mousemove', e => {
  if (document.pointerLockElement === lienzo){
    JUG.yaw -= e.movementX * 0.0024;
    JUG.pitch = cl(JUG.pitch - e.movementY * 0.0024, -1.35, 1.35);
  }
});
addEventListener('mousedown', e => { if (e.pointerType !== 'touch') modoPC(true); }, true);

/* dedo: mitad derecha mira, palanca abajo a la izquierda mueve */
const DED = { mira: null, mov: null };
lienzo.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  modoPC(false);
  const q = pt(e);
  if (q.x > W*0.42 && !DED.mira) DED.mira = { id: e.pointerId, x: q.x, y: q.y };
}, { passive: true });
lienzo.addEventListener('pointermove', e => {
  if (DED.mira && DED.mira.id === e.pointerId){
    const q = pt(e);
    JUG.yaw -= (q.x - DED.mira.x) * 0.0052;
    JUG.pitch = cl(JUG.pitch - (q.y - DED.mira.y) * 0.0052, -1.35, 1.35);
    DED.mira.x = q.x; DED.mira.y = q.y;
  }
}, { passive: true });
const sueltaDedo = e => { if (DED.mira && DED.mira.id === e.pointerId) DED.mira = null; };
lienzo.addEventListener('pointerup', sueltaDedo);
lienzo.addEventListener('pointercancel', sueltaDedo);

/* ── la palanca dibujada ── */
const joyCv = document.querySelector('#joy canvas'), jg = joyCv.getContext('2d');
function joyDibuja(){
  const n = 300, c = n/2, R = n/2 - 12;
  jg.clearRect(0,0,n,n);
  jg.strokeStyle = 'rgba(126,227,160,.55)'; jg.lineWidth = 3;
  jg.beginPath(); jg.arc(c,c,R,0,6.283); jg.stroke();
  jg.fillStyle = 'rgba(8,18,28,.35)'; jg.fill();
  const px = c + movV.x*R*0.55, py = c + movV.y*R*0.55;
  jg.beginPath(); jg.arc(px, py, 34, 0, 6.283);
  jg.fillStyle = 'rgba(126,227,160,.85)'; jg.fill();
}
let jd = null;
$('joy').addEventListener('pointerdown', e => {
  e.preventDefault(); modoPC(false);
  jd = e.pointerId; $('joy').setPointerCapture(e.pointerId); joyMueve(e);
});
$('joy').addEventListener('pointermove', e => { if (jd === e.pointerId) joyMueve(e); });
const joySuelta = e => { if (jd === e.pointerId){ jd = null; movV.x = movV.y = 0; joyDibuja(); } };
$('joy').addEventListener('pointerup', joySuelta);
$('joy').addEventListener('pointercancel', joySuelta);
function joyMueve(e){
  const r = rectEsc($('joy')), q = pt(e);
  let dx = (q.x - (r.x + r.w/2)) / (r.w/2);
  let dy = (q.y - (r.y + r.h/2)) / (r.h/2);
  const d = Math.hypot(dx, dy);
  if (d > 1){ dx /= d; dy /= d; }
  movV.x = dx; movV.y = dy;
  /* la palanca a fondo ya no fuerza correr: para eso está el botón, y así se
     puede caminar despacio sin que se dispare sola */
  joyDibuja();
}
joyDibuja();

function modoPC(v){
  if (document.body.classList.contains('pc') === v) return;
  document.body.classList.toggle('pc', v);
}
/* de arranque se mira lo que el aparato PUEDE hacer, no con qué se lo tocó */
try {
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) modoPC(true);
  else if (matchMedia('(pointer:fine)').matches && !matchMedia('(pointer:coarse)').matches) modoPC(true);
} catch(e){ modoPC(true); }

/* ══════════════════════════ FÍSICA ══════════════════════════ */
function fisica(dt){
  let mx = movV.x, my = movV.y;
  if (teclas.KeyW) my -= 1; if (teclas.KeyS) my += 1;
  if (teclas.KeyA) mx -= 1; if (teclas.KeyD) mx += 1;
  if (teclas.ArrowLeft) JUG.yaw += 2.1*dt; if (teclas.ArrowRight) JUG.yaw -= 2.1*dt;
  if (teclas.ArrowUp) JUG.pitch = cl(JUG.pitch + 1.6*dt, -1.35, 1.35);
  if (teclas.ArrowDown) JUG.pitch = cl(JUG.pitch - 1.6*dt, -1.35, 1.35);
  const m = Math.hypot(mx, my);
  if (m > 1){ mx /= m; my /= m; }
  /* agachado se anda a la mitad y no se puede correr, que es lo que hace que
     agacharse sea una decisión y no un botón de adorno */
  const sp = (JUG.agacha ? VEL*0.42 : (corre ? CORRE : VEL)) * (JUG.vuela ? 2.6 : 1);
  AND.v = Math.hypot(vxAnt, vzAnt);
  const sy = Math.sin(JUG.yaw), cy = Math.cos(JUG.yaw);
  const vx = (-sy * -my + cy * mx) * sp;
  const vz = (-cy * -my - sy * mx) * sp;
  vxAnt = vx; vzAnt = vz; ladoAnt = mx;

  JUG.x = cl(JUG.x + vx*dt, -MITAD+3, MITAD-3);
  JUG.z = cl(JUG.z + vz*dt, -MITAD+3, MITAD-3);

  const suelo = Math.max(H(JUG.x, JUG.z), MAR - 0.6);
  if (JUG.vuela){
    if (teclas.Space) JUG.y += sp*0.6*dt;
    if (teclas.ShiftLeft) JUG.y -= sp*0.6*dt;
    JUG.y = Math.max(JUG.y, suelo + 0.5);
  } else {
    if (JUG.aire){
      JUG.vy -= GRAV*dt; JUG.y += JUG.vy*dt;
      if (JUG.y <= suelo){
        /* EL GOLPE AL CAER: cuanto más fuerte, más se hunde la cámara. Es medio
           segundo de nada y es lo que hace que un salto se sienta con peso. */
        AND.golpe = Math.min(0.42, Math.max(0, -JUG.vy) * 0.032);
        JUG.y = suelo; JUG.vy = 0; JUG.aire = false;
      }
    } else {
      /* el ojo persigue al suelo en vez de pegarse: sin esto cada escalón del
         terreno es un tirón vertical */
      JUG.y = lerp(JUG.y, suelo, Math.min(1, dt*11));
      if (Math.abs(suelo - JUG.y) > 3) JUG.y = suelo;
    }
  }
  ponCam(dt);
}
let vxAnt = 0, vzAnt = 0, ladoAnt = 0;

/* ══════════════════════════ EL CABECEO ══════════════════════════
   Lo que separa una cámara que flota de una que camina. Cuatro cosas a la vez,
   todas atadas a la MISMA fase del paso para que no se peleen:

     · sube y baja dos veces por zancada (el apoyo de cada pie);
     · se corre de lado una vez por zancada, en contrafase;
     · se INCLINA sobre su eje —el roll— que es lo que de verdad se lee como
       caminar, y además se ladea al andar de costado;
     · abre el campo de visión al correr y lo cierra al frenar.

   Las amplitudes se persiguen con lerp en vez de saltar: si el cabeceo aparece
   de golpe al empezar a andar, se nota como un tirón. */
function ponCam(dt){
  const rapido = cl(AND.v / CORRE, 0, 1);
  const andando = cl(AND.v / VEL, 0, 1);
  const enSuelo = !JUG.aire && !JUG.vuela;

  /* la fase avanza con la velocidad: los pasos se aceleran solos al correr */
  const faseAnt = AND.fase;
  if (enSuelo) AND.fase += dt * (2.7 + AND.v * 0.62);
  else AND.fase += dt * 1.2;

  /* LA PISADA VA ATADA A LA FASE DEL PASO Y NO A UN TEMPORIZADOR. Un reloj
     aparte se desincroniza del cabeceo en cuanto cambia la velocidad, y ahí el
     sonido deja de caer donde cae el pie. Hay DOS apoyos por vuelta —uno por
     pierna— así que suena cada vez que la fase cruza un múltiplo de π. Es la
     misma corrección que en Maicol convirtió veinticuatro pisadas por segundo
     superpuestas —o sea ruido blanco— en un trote.
     Y sólo si se está moviendo de verdad: parado, la fase igual avanza. */
  if (enSuelo && AND.v > 0.6 && MODO === 'juego' && !PAUSA){
    if (Math.floor(AND.fase / Math.PI) !== Math.floor(faseAnt / Math.PI))
      son2('paso', 0.55 + cl(AND.v / CORRE, 0, 1) * 0.45);
  }

  /* EL BALANCEO EMPIEZA AL CAMINAR, no al correr. La amplitud arranca en un
     valor propio en cuanto te movés y el correr sólo la agranda; antes crecía
     desde cero con la velocidad y a paso normal casi no se veía. */
  const amp = enSuelo ? cl(andando * 1.35, 0, 1) : 0;
  const base = amp > 0.02 ? 0.052 : 0;
  const arriba = Math.abs(Math.sin(AND.fase)) * (base + rapido*0.052) * amp;
  const costado = Math.cos(AND.fase) * (0.042 + rapido*0.042) * amp;

  /* BALANCEO QUIETO: la respiración. Con la cámara clavada del todo el mundo
     parece una foto; con esto respira sin marear. */
  const quieto = cl(1 - andando*1.6, 0, 1) * (enSuelo ? 1 : 0);
  const resp = Math.sin(RELOJ.value * 1.05) * 0.020 * quieto;
  const respLado = Math.sin(RELOJ.value * 0.58 + 1.2) * 0.014 * quieto;
  const respRoll = Math.sin(RELOJ.value * 0.47 + 2.1) * 0.0075 * quieto;

  /* el ojo: altura de pie o agachado, persiguiendo para que no salte */
  const objOjo = OJO * (JUG.agacha ? 0.74 : 1);   /* menos hondo que antes */
  AND.ojo = lerp(AND.ojo, objOjo, Math.min(1, dt*9));
  AND.golpe = lerp(AND.golpe, 0, Math.min(1, dt*6));
  AND.lado = lerp(AND.lado, ladoAnt, Math.min(1, dt*7));

  /* roll: el vaivén del paso más la inclinación al andar de costado */
  const objRoll = Math.cos(AND.fase) * (0.020 + rapido*0.022) * amp
                - AND.lado * 0.062 + respRoll;
  AND.roll = lerp(AND.roll, objRoll, Math.min(1, dt*10));

  /* el campo de visión se abre al correr: la sensación de velocidad sale de acá */
  const objFov = 66 + rapido*9 - (JUG.agacha ? 3 : 0);
  AND.fov = lerp(AND.fov, objFov, Math.min(1, dt*3.4));
  if (Math.abs(cam.fov - AND.fov) > 0.02){ cam.fov = AND.fov; cam.updateProjectionMatrix(); }

  const sy = Math.sin(JUG.yaw), cy = Math.cos(JUG.yaw);
  cam.position.set(
    JUG.x + cy * (costado + respLado),
    JUG.y + AND.ojo + arriba + resp - AND.golpe,
    JUG.z - sy * (costado + respLado)
  );
  cam.rotation.order = 'YXZ';
  cam.rotation.y = JUG.yaw;
  /* un pelo de cabeceo vertical en cada apoyo, y el hundimiento del aterrizaje */
  cam.rotation.x = JUG.pitch + Math.sin(AND.fase*2) * 0.006 * amp - AND.golpe*0.55;
  cam.rotation.z = AND.roll;
}

