
/* ══════════════════════ EL DIBUJO ══════════════════════
   ── EL COHETE NO SE MUEVE: SE MUEVE EL MUNDO ──
   El cohete vive siempre en el origen y la camara lo mira desde el frente
   (por −Z, sin inclinar), a un 35 % del alto del cuadro. Todo lo demas se
   coloca en `(o.hm − h)/mpu(h)`: la escala en metros por unidad crece con la
   altura, asi que el cohete mide lo mismo a 50 m y a 50.000 km y lo que cambia
   es cuanto mundo pasa por segundo. La plataforma y el suelo se van para abajo
   en los primeros segundos y no vuelven hasta el proximo lanzamiento. */
const cv = document.getElementById('cv');
const render = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance' });
render.outputColorSpace = T.SRGBColorSpace;
render.toneMapping = T.ACESFilmicToneMapping; render.toneMappingExposure = 1.05;
const escena = new T.Scene();
const cam = new T.PerspectiveCamera(58, 0.46, 0.1, 400);
/* la camara se pone por la CUENTA: hay que ver ±6 unidades de ancho en z = 0 */
let CAM_D = 22, CAM_Y = 3.6;
const HUD_PX = { w: 412, h: 892 };
function medir(){
  const w = cv.clientWidth || 412, h = cv.clientHeight || 892;
  HUD_PX.w = w; HUD_PX.h = h;
  document.documentElement.style.setProperty('--mw', w + 'px');
  const esc = CALIDADES[CALIDAD].esc;
  render.setPixelRatio(Math.min(devicePixelRatio || 1, 2)*esc);
  render.setSize(w, h, false);
  cam.aspect = w/h; cam.updateProjectionMatrix();
  const tanV = Math.tan(cam.fov*Math.PI/360);
  CAM_D = 5.9/(cam.aspect*tanV);
  /* el cohete al 35 % del alto: el centro de la vista queda 0,3 del semialto por arriba */
  CAM_Y = CAM_D*tanV*0.30;
  cam.position.set(0, CAM_Y, CAM_D); cam.lookAt(0, CAM_Y, 0);
  ponCielo();
}
addEventListener('resize', medir);

/* ══════════ LAS LUCES ══════════ */
const luzSol = new T.DirectionalLight(0xfff2e0, 2.2); luzSol.position.set(4, 8, 6); escena.add(luzSol);
const luzHemi = new T.HemisphereLight(0xbfdcff, 0x5a4a3a, 0.9); escena.add(luzHemi);
const luzLlama = new T.PointLight(0xff9a3a, 0, 14, 1.6); luzLlama.position.set(0, -1.6, 0.6);
/* ── EL MUNDO CERCANO VA EN UN GRUPO QUE SE PUEDE CORRER ──
   En el menu el cohete tiene que quedar en el hueco del velo, arriba del cuadro.
   Bajar la camara no sirve: queda DEBAJO del suelo y lo que se ve es la cara de
   abajo del pasto (medido: los dos quintos de arriba del cuadro en negro). Se
   corre el mundo hacia arriba y la camara no se toca. */
const mundo = new T.Group(); escena.add(mundo); mundo.add(luzLlama);

/* ══════════ FUNDIR PIEZAS EN UNA MALLA ══════════
   Un obstaculo creible son cuatro o cinco piezas, y veinte obstaculos sueltos
   son cien llamadas de dibujo. Se funden con su color en los vertices y cada
   clase de obstaculo es UNA malla instanciada. */
function fundir(piezas){
  const pos = [], nor = [], col = [];
  const c = new T.Color(), m = new T.Matrix4(), nm = new T.Matrix3();
  for (const p of piezas){
    let g = p.g.index ? p.g.toNonIndexed() : p.g;
    m.compose(new T.Vector3(...(p.p || [0, 0, 0])), new T.Quaternion().setFromEuler(new T.Euler(...(p.r || [0, 0, 0]))), new T.Vector3(...(p.s || [1, 1, 1])));
    nm.getNormalMatrix(m);
    const P = g.attributes.position, N = g.attributes.normal;
    c.set(p.c);
    const v = new T.Vector3();
    for (let i = 0; i < P.count; i++){
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
    }
  }
  const G = new T.BufferGeometry();
  G.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  G.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  G.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  return G;
}
const matVert = new T.MeshLambertMaterial({ vertexColors: true });
const matVertBrillo = new T.MeshLambertMaterial({ vertexColors: true, emissive: 0x222222 });

/* ══════════ EL CIELO ══════════
   Un plano pegado detras de todo con un degradado de dos colores —el de arriba y
   el de abajo de la capa, fundidos por la altura entre una capa y la siguiente—
   y estrellas que aparecen a partir de los 20 km. Sin niebla: arriba no hay
   aire y abajo el degradado ya hace el trabajo. */
/* ── Y CON LAS FOTOS DE REZONA CUANDO LLEGAN ──
   Cinco cielos generados —dia con cumulos, cirros de gran altura, la estratosfera
   con el borde azul del aire, el espacio con la Via Lactea y el espacio profundo
   con una nebulosa— se funden de a dos por altura (`uTexA`, `uTexB`, `uMix`) y se
   mezclan con el degradado por `uHay`, que pasa a 1 cuando las cinco decodificaron.
   La foto se recorta a «cover»: el marco es mas angosto que la imagen. */
const cieloMat = new T.ShaderMaterial({
  uniforms: { uArr: { value: new T.Color(0x3f8fd8) }, uAba: { value: new T.Color(0x9ed3ff) }, uEst: { value: 0 }, uT: { value: 0 },
              uTexA: { value: null }, uTexB: { value: null }, uMix: { value: 0 }, uHay: { value: 0 }, uAsp: { value: 1 } },
  depthWrite: false, depthTest: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`,
  fragmentShader: `
    uniform vec3 uArr, uAba; uniform float uEst, uT, uMix, uHay, uAsp; uniform sampler2D uTexA, uTexB; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
    void main(){
      vec3 c = mix(uAba, uArr, smoothstep(0.0, 1.0, vUv.y));
      if (uHay > 0.0){
        vec2 cu = vec2(0.5 + (vUv.x - 0.5)*uAsp, vUv.y);
        vec3 f = mix(texture2D(uTexA, cu).rgb, texture2D(uTexB, cu).rgb, uMix);
        c = mix(c, f, uHay);
      }
      /* estrellas: una reja de celdas, un punto por celda, con brillo al azar */
      vec2 g = vUv*vec2(60.0, 130.0);
      vec2 id = floor(g), f = fract(g) - 0.5;
      float h = hash(id);
      float d = length(f - (vec2(hash(id + 1.3), hash(id + 7.1)) - 0.5)*0.8);
      float est = smoothstep(0.08, 0.0, d)*step(0.82, h)*(0.6 + 0.4*sin(uT*2.0 + h*40.0));
      c += vec3(est)*uEst*(1.0 - uHay);
      gl_FragColor = vec4(c, 1.0);
    }`
});
const cielo = new T.Mesh(new T.PlaneGeometry(2, 2), cieloMat); cielo.frustumCulled = false; cielo.renderOrder = -10; escena.add(cielo);
const _cA = new T.Color(), _cB = new T.Color();
function ponCielo(h){
  h = h == null ? (RUN ? RUN.h : 0) : h;
  const c = capaDe(h), C = CAPAS[c], S = CAPAS[Math.min(CAPAS.length - 1, c + 1)];
  /* la fraccion se toma en escala logaritmica: las capas van de a decadas */
  const k = S === C ? 0 : cl(Math.log(Math.max(1, h)/Math.max(1, C.h))/Math.log(Math.max(2, S.h)/Math.max(1, C.h)), 0, 1);
  cieloMat.uniforms.uArr.value.set(C.arr).lerp(_cA.set(S.arr), k);
  cieloMat.uniforms.uAba.value.set(C.aba).lerp(_cB.set(S.aba), k);
  cieloMat.uniforms.uEst.value = cl((h - 15000)/60000, 0, 1);
  /* las fotos: un par y su mezcla, por tramos de altura en escala logaritmica */
  if (CIELOS.listo){
    const T5 = CIELOS.tex;
    /* [desde, hasta, foto de abajo, foto de arriba]: entre tramos la foto se queda */
    const tramos = [[1500, 12000, 0, 1], [12000, 45000, 1, 2], [45000, 200000, 2, 3], [1e8, 1e10, 3, 4]];
    let a = 0, b = 0, kk = 0;
    for (const [h0, h1, i, j] of tramos){
      if (h >= h1){ a = b = j; kk = 0; }
      else if (h >= h0){ a = i; b = j; kk = Math.log(h/h0)/Math.log(h1/h0); break; }
      else break;
    }
    cieloMat.uniforms.uTexA.value = T5[a]; cieloMat.uniforms.uTexB.value = T5[b]; cieloMat.uniforms.uMix.value = kk;
    cieloMat.uniforms.uHay.value = 1; cieloMat.uniforms.uAsp.value = Math.min(1, (cam.aspect)/(512/917));
  }
  /* la luz baja con el aire: en el espacio el sol es duro y el hemisferio se apaga */
  const aire = aireEn(h);
  luzHemi.intensity = 0.25 + 0.65*aire; luzSol.intensity = 2.2 + 0.8*(1 - aire);
}

/* ══════════ LOS ASSETS DE REZONA ══════════
   ── NADA REEMPLAZA A LO DIBUJADO HASTA QUE LLEGA ──
   El cohete, los tres arboles, los cinco cielos y los tres planetas viven en
   `ASSETS_B64`. Se piden al arrancar; mientras decodifican se ve la version por
   codigo, y cada uno pisa la suya cuando esta: un base64 roto cuesta una pieza. */
const CIELOS = { tex: [], listo: false, pedidos: 0 };
const GLB = { cohete: null, arboles: {}, fallas: [] };
const cargadorGLTF = new GLTFLoader();
const cargadorTex = new T.TextureLoader();
function cargaAssets(){
  if (typeof ASSETS_B64 === 'undefined') return;
  const A = ASSETS_B64;
  const nombres = ['cielo_dia', 'cielo_alto', 'cielo_estratosfera', 'cielo_espacio', 'cielo_profundo'];
  let n = 0;
  nombres.forEach((k, i) => {
    if (!A[k]) return;
    cargadorTex.load(A[k], (t) => { t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; CIELOS.tex[i] = t; if (++n === 5) CIELOS.listo = true; }, undefined, () => GLB.fallas.push(k));
  });
  for (const [k, obj] of [['tierra', tierra], ['luna', luna], ['marte', marte]]){
    if (!A[k]) continue;
    cargadorTex.load(A[k], (t) => { t.colorSpace = T.SRGBColorSpace; obj.material.map.dispose(); obj.material.map = t; obj.material.needsUpdate = true; obj.foto = true; }, undefined, () => GLB.fallas.push(k));
  }
  if (A.cohete) cargadorGLTF.load(A.cohete, (g) => { let m = null; g.scene.traverse(o => { if (o.isMesh && !m) m = o; }); if (m){ GLB.cohete = m; COHETE.niv = ''; armaCohete(); } }, undefined, () => GLB.fallas.push('cohete'));
  for (const k of ['pino', 'roble', 'cipres']){
    if (!A[k]) continue;
    cargadorGLTF.load(A[k], (g) => { let m = null; g.scene.traverse(o => { if (o.isMesh && !m) m = o; }); if (m){ GLB.arboles[k] = m; plantaArboles(); } }, undefined, () => GLB.fallas.push(k));
  }
}

/* ══════════ LA PLATAFORMA Y LA TORRE ══════════ */
const suelo = new T.Group(); mundo.add(suelo);
{
  const G = fundir([
    { g: new T.CylinderGeometry(70, 70, 0.3, 48), c: '#4a5a3a', p: [0, -1.55, 0] },
    { g: new T.CylinderGeometry(9, 9, 0.3, 24), c: '#55663f', p: [0, -1.35, 0] },
    { g: new T.CylinderGeometry(2.4, 2.6, 0.35, 16), c: '#7a7f88', p: [0, -1.05, 0] },
    { g: new T.BoxGeometry(0.5, 0.5, 0.5), c: '#3a3f48', p: [1.1, -0.9, 1.1] }, { g: new T.BoxGeometry(0.5, 0.5, 0.5), c: '#3a3f48', p: [-1.1, -0.9, 1.1] },
    { g: new T.BoxGeometry(0.5, 0.5, 0.5), c: '#3a3f48', p: [1.1, -0.9, -1.1] }, { g: new T.BoxGeometry(0.5, 0.5, 0.5), c: '#3a3f48', p: [-1.1, -0.9, -1.1] },
    /* la torre */
    { g: new T.BoxGeometry(0.6, 6.0, 0.6), c: '#c8342a', p: [-2.4, 1.8, -0.7] },
    { g: new T.BoxGeometry(0.14, 6.0, 0.14), c: '#e8e8e8', p: [-1.95, 1.8, -0.3] },
    { g: new T.BoxGeometry(0.14, 6.0, 0.14), c: '#e8e8e8', p: [-2.85, 1.8, -0.3] },
    { g: new T.BoxGeometry(1.4, 0.14, 1.4), c: '#e8e8e8', p: [-2.4, 4.9, -0.7] },
    { g: new T.BoxGeometry(0.18, 1.6, 0.18), c: '#ffd447', p: [-2.4, 5.7, -0.7] },
    { g: new T.SphereGeometry(0.18, 8, 6), c: '#ff3a1a', p: [-2.4, 6.55, -0.7] }
  ]);
  const m = new T.Mesh(G, matVert); suelo.add(m);
  /* arboles: conos a los costados, que es lo que hace que los primeros 60 m
     se lean como subir */
  const arb = [];
  for (let i = 0; i < 26; i++){
    const x = (i % 2 ? 1 : -1)*(4.5 + (i*0.73) % 5.5), z = -3 - (i*1.31) % 7;
    const hh = 1.4 + (i*0.37) % 1.8;
    arb.push({ g: new T.ConeGeometry(0.6 + (i*0.17) % 0.5, hh, 7), c: i % 3 ? '#2e6b3a' : '#3a8a48', p: [x, -1.2 + hh/2, z] });
    arb.push({ g: new T.CylinderGeometry(0.1, 0.12, 0.5, 5), c: '#5a3a22', p: [x, -1.3, z] });
  }
  suelo.conos = new T.Mesh(fundir(arb), matVert); suelo.add(suelo.conos);
  /* los mismos sitios y alturas, para los arboles generados */
  suelo.sitios = [];
  for (let i = 0; i < 26; i++){
    const x = (i % 2 ? 1 : -1)*(4.5 + (i*0.73) % 5.5), z = -3 - (i*1.31) % 7;
    const hh = 1.4 + (i*0.37) % 1.8;
    suelo.sitios.push({ x, z, h: hh*1.35, esp: ['pino', 'roble', 'cipres'][i % 3], giro: i*2.1 });
  }
  /* los brazos que sueltan el cohete: dos, y se abren al encender */
  suelo.brazos = [];
  for (const s of [-1, 1]){
    const b = new T.Group(); b.position.set(-2.1, 0.9 + s*0.6, -0.4);
    const bm = new T.Mesh(new T.BoxGeometry(1.7, 0.16, 0.16), new T.MeshLambertMaterial({ color: 0xe8e8e8 }));
    bm.position.x = 0.85; b.add(bm);
    const pin = new T.Mesh(new T.BoxGeometry(0.16, 0.5, 0.5), new T.MeshLambertMaterial({ color: 0xc8342a })); pin.position.x = 1.7; b.add(pin);
    suelo.add(b); suelo.brazos.push(b);
  }
}

/* ── LOS ARBOLES DE REZONA: UNA MALLA INSTANCIADA POR ESPECIE ──
   Tres modelos de Tripo con su textura de color; los conos se apagan recien
   cuando las tres especies llegaron, asi nunca hay un sitio vacio. La altura de
   cada arbol es la del cono que reemplaza: el modelo mide 1 de alto y se escala. */
function plantaArboles(){
  if (!GLB.arboles.pino || !GLB.arboles.roble || !GLB.arboles.cipres) return;
  if (suelo.arboles) return;
  suelo.arboles = [];
  const _mm = new T.Matrix4(), _qq = new T.Quaternion(), _pp = new T.Vector3(), _ss = new T.Vector3();
  for (const esp of ['pino', 'roble', 'cipres']){
    const src = GLB.arboles[esp];
    const g = src.geometry; g.computeBoundingBox();
    const bb = g.boundingBox, alto = bb.max.y - bb.min.y;
    const sitios = suelo.sitios.filter(s => s.esp === esp);
    const im = new T.InstancedMesh(g, src.material, sitios.length);
    sitios.forEach((s, i) => {
      const k = s.h/alto;
      _qq.setFromEuler(new T.Euler(0, s.giro, 0));
      _mm.compose(_pp.set(s.x, -1.2 - bb.min.y*k, s.z), _qq, _ss.set(k, k, k)); im.setMatrixAt(i, _mm);
    });
    im.instanceMatrix.needsUpdate = true; suelo.add(im); suelo.arboles.push(im);
  }
  suelo.conos.visible = false;
}

/* ══════════ EL COHETE ══════════
   ── UN ESTILO ES UNA TEXTURA DIBUJADA POR CODIGO ──
   El fuselaje lleva un lienzo de 128×384: el color base, el patron encima y
   las bandas. Los veinticuatro estilos salen de la misma funcion con otros
   numeros. Y las mejoras SE VEN: el tanque alarga el cuerpo, las aletas crecen,
   el motor suma toberas, el escudo pone una burbuja, el iman dos aros. */
function pintaEstilo(E, c2, w, h, sinVentana){
  c2.fillStyle = E.base; c2.fillRect(0, 0, w, h);
  const f = E.franja;
  c2.fillStyle = f;
  const patron = E.patron;
  if (patron === 'bandas'){ for (let y = h*0.18; y < h*0.9; y += h*0.22) c2.fillRect(0, y, w, h*0.06); }
  if (patron === 'damero'){ const n = 6, s = w/n; for (let i = 0; i < n; i++) for (let j = 0; j < h/s; j++) if ((i + j) % 2) c2.fillRect(i*s, j*s, s, s); }
  if (patron === 'rayas'){ for (let i = 0; i < 14; i++){ c2.beginPath(); c2.moveTo(0, i*h/7 - 20); c2.lineTo(w, i*h/7 + 20); c2.lineTo(w, i*h/7 + 20 + h/18); c2.lineTo(0, i*h/7 - 20 + h/18); c2.fill(); } }
  if (patron === 'llamas'){
    for (let k = 0; k < 2; k++){
      c2.fillStyle = k ? E.punta : f;
      for (let x = -10; x < w + 10; x += 14){
        c2.beginPath(); c2.moveTo(x, h); c2.quadraticCurveTo(x + 4, h*0.7 - k*20, x + 7, h*0.55 - k*40 - (x*7 % 30)); c2.quadraticCurveTo(x + 10, h*0.7 - k*20, x + 14, h); c2.fill();
      }
    }
  }
  if (patron === 'puntos'){ for (let i = 0; i < 40; i++){ c2.beginPath(); c2.arc(((i*37) % w), ((i*91) % h), 5 + (i % 3)*3, 0, 6.29); c2.fill(); } }
  if (patron === 'camo'){ const cs = [f, E.punta, E.aleta]; for (let i = 0; i < 26; i++){ c2.fillStyle = cs[i % 3]; c2.beginPath(); c2.ellipse((i*53) % w, (i*71) % h, 14 + (i % 4)*6, 9 + (i % 3)*5, i, 0, 6.29); c2.fill(); } }
  if (patron === 'zigzag'){ c2.lineWidth = 6; c2.strokeStyle = f; for (let y = 20; y < h; y += 44){ c2.beginPath(); for (let x = 0; x <= w; x += 16) c2.lineTo(x, y + ((x/16) % 2 ? 10 : -10)); c2.stroke(); } }
  if (patron === 'grietas'){ c2.lineWidth = 3; c2.strokeStyle = f; for (let i = 0; i < 14; i++){ c2.beginPath(); let x = (i*41) % w, y = (i*67) % h; c2.moveTo(x, y); for (let k = 0; k < 6; k++){ x += ((i + k)*13 % 21) - 10; y += 8 + (k*i) % 16; c2.lineTo(x, y); } c2.stroke(); } }
  if (patron === 'estrellas'){ c2.fillStyle = '#ffffff'; for (let i = 0; i < 60; i++){ const r = 0.6 + (i % 4)*0.5; c2.beginPath(); c2.arc((i*47) % w, (i*83) % h, r, 0, 6.29); c2.fill(); } c2.fillStyle = f; for (let i = 0; i < 6; i++){ c2.beginPath(); c2.ellipse((i*61) % w, (i*97) % h, 22, 10, i*0.7, 0, 6.29); c2.globalAlpha = 0.35; c2.fill(); c2.globalAlpha = 1; } }
  if (patron === 'arcoiris'){ const cs = ['#ff3a3a', '#ff9a2a', '#ffd447', '#3ad35a', '#3a8fff', '#8a4aff']; cs.forEach((cc, i) => { c2.fillStyle = cc; c2.fillRect(0, h*0.3 + i*h*0.055, w, h*0.055); }); }
  /* la banda de la cintura y la ventanilla, en todos */
  c2.fillStyle = f; c2.fillRect(0, h*0.12, w, h*0.035);
  if (sinVentana) return;
  c2.fillStyle = '#1a2230'; c2.beginPath(); c2.arc(w*0.5, h*0.28, w*0.11, 0, 6.29); c2.fill();
  c2.fillStyle = '#7ad9ff'; c2.beginPath(); c2.arc(w*0.5, h*0.28, w*0.08, 0, 6.29); c2.fill();
  c2.fillStyle = 'rgba(255,255,255,.35)'; c2.beginPath(); c2.arc(w*0.47, h*0.265, w*0.03, 0, 6.29); c2.fill();
}
function texturaEstilo(E, sinVentana){
  const c = document.createElement('canvas'); c.width = 128; c.height = 384;
  pintaEstilo(E, c.getContext('2d'), 128, 384, sinVentana);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
const cohete = new T.Group(); mundo.add(cohete);
let COHETE = { estilo: null, niv: '' };
function armaCohete(){
  const E = ESTILOS.find(e => e.id === PROG.estilo) || ESTILOS[0];
  const niv = Object.values(PROG.niv).join(',');
  if (COHETE.estilo === E.id && COHETE.niv === niv && cohete.children.length && (!!cohete.glb === !!GLB.cohete)) return;
  COHETE = { estilo: E.id, niv };
  while (cohete.children.length) { const c = cohete.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); if (o.material) o.material.dispose(); }); }
  const n = (k) => PROG.niv[k] | 0;
  const largo = 2.1 + 0.09*n('tanque'), r = 0.44;
  const metal = E.metal || 0, fant = E.fantasma ? 0.55 : 1;
  const mapa = texturaEstilo(E);
  const matCuerpo = new T.MeshStandardMaterial({ map: mapa, metalness: metal, roughness: metal ? 0.25 : 0.55, transparent: !!E.fantasma, opacity: fant });
  const matPunta = new T.MeshStandardMaterial({ color: E.punta, metalness: metal, roughness: metal ? 0.25 : 0.5, transparent: !!E.fantasma, opacity: fant });
  const matAleta = new T.MeshStandardMaterial({ color: E.aleta, metalness: metal*0.5, roughness: 0.5, transparent: !!E.fantasma, opacity: fant });
  const matMetal = new T.MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.9, roughness: 0.35 });
  const cuerpo = new T.Mesh(new T.CylinderGeometry(r, r*1.04, largo, 24, 1, true), matCuerpo); cohete.add(cuerpo);
  /* la nariz: mas afilada con el fuselaje */
  const hp = 0.75 + 0.07*n('fuselaje');
  const punta = new T.Mesh(new T.ConeGeometry(r, hp, 24), matPunta); punta.position.y = largo/2 + hp/2; cohete.add(punta);
  const cintura = new T.Mesh(new T.TorusGeometry(r*1.02, 0.03, 8, 24), matMetal); cintura.rotation.x = Math.PI/2; cintura.position.y = largo/2 - 0.02; cohete.add(cintura);
  /* las aletas: tres o cuatro, y crecen con el nivel */
  const na = n('aletas') >= 5 ? 4 : 3, ea = 1 + 0.09*n('aletas');
  const fg = new T.BufferGeometry();
  const av = new Float32Array([0, 0, 0,  0.55*ea, -0.55*ea, 0,  0, -0.95*ea, 0,   0, 0, 0,  0, -0.95*ea, 0,  0.55*ea, -0.55*ea, 0]);
  fg.setAttribute('position', new T.BufferAttribute(av, 3)); fg.computeVertexNormals();
  for (let i = 0; i < na; i++){
    const a = new T.Group(); a.rotation.y = i*Math.PI*2/na;
    const f = new T.Mesh(fg, matAleta); f.position.set(r*0.95, -largo/2 + 0.7*ea, 0); a.add(f);
    const f2 = f.clone(); f2.rotation.y = Math.PI; f2.position.z = 0.001; a.add(f2);
    cohete.add(a);
  }
  /* las toberas: una, dos o tres segun el motor */
  const nt = n('motor') >= 7 ? 3 : (n('motor') >= 4 ? 2 : 1), rt = nt === 1 ? 0.27 : 0.17;
  cohete.toberas = [];
  for (let i = 0; i < nt; i++){
    const a = nt === 1 ? 0 : i*Math.PI*2/nt, d = nt === 1 ? 0 : 0.15;
    const tb = new T.Mesh(new T.CylinderGeometry(rt*0.6, rt, 0.28, 16, 1, true), matMetal);
    tb.material.side = T.DoubleSide;
    tb.position.set(Math.cos(a)*d*1.4, -largo/2 - 0.14, Math.sin(a)*d*1.4); cohete.add(tb); cohete.toberas.push(tb);
  }
  const falda = new T.Mesh(new T.CylinderGeometry(r*1.04, r*1.12, 0.18, 24, 1, true), matAleta); falda.position.y = -largo/2 - 0.05; cohete.add(falda);
  /* el escudo: una burbuja apenas visible, mas cuanto mas nivel */
  if (n('escudo') > 0){
    const esc = new T.Mesh(new T.SphereGeometry(Math.max(largo, 1.6)*0.72, 20, 14), new T.MeshBasicMaterial({ color: 0x7ad9ff, transparent: true, opacity: 0.06 + 0.02*n('escudo'), depthWrite: false, side: T.DoubleSide }));
    esc.scale.y = 1.35; esc.position.y = 0.1; cohete.add(esc); cohete.escudo = esc;
  }
  /* el iman: dos aros que giran */
  if (n('iman') > 0){
    cohete.aros = [];
    for (let i = 0; i < 2; i++){
      const ar = new T.Mesh(new T.TorusGeometry(r*1.5 + i*0.08, 0.02, 6, 24), new T.MeshBasicMaterial({ color: 0xffd447, transparent: true, opacity: 0.5 }));
      ar.rotation.x = Math.PI/2 + 0.2*(i ? -1 : 1); ar.position.y = -largo/2 + 0.7; cohete.add(ar); cohete.aros.push(ar);
    }
  }
  cohete.largo = largo; cohete.nt = nt;
  /* la llama: un cono aditivo por tobera, mas el nucleo blanco */
  cohete.llamas = [];
  for (const tb of cohete.toberas){
    const g = new T.Group(); g.position.copy(tb.position); g.position.y -= 0.16;
    const ext = new T.Mesh(new T.ConeGeometry(rt*1.15, 1.9, 12, 1, true), new T.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    ext.rotation.x = Math.PI; ext.position.y = -0.95; g.add(ext);
    const nuc = new T.Mesh(new T.ConeGeometry(rt*0.62, 1.2, 10, 1, true), new T.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    nuc.rotation.x = Math.PI; nuc.position.y = -0.6; g.add(nuc);
    cohete.add(g); cohete.llamas.push({ g, ext, nuc });
  }
  cohete.position.y = 0;
  cohete.base = -largo/2 - 0.3;
  /* ── EL COHETE DE REZONA, CON LA PINTURA PROYECTADA POR POSICION ──
     El modelo de Tripo trae su textura —rivetes, paneles, la ventanilla— con un
     atlas de islas: pintarle el patron del estilo en esas UV lo dejaria hecho
     pedazos. La pintura se muestrea con una UV CILINDRICA calculada en el shader a
     partir de la posicion local (angulo alrededor del eje, altura), y multiplica
     al albedo de Tripo: los detalles quedan y el color y las bandas son del estilo.
     Lo dibujado por codigo se apaga, la llama, el escudo y los aros se quedan. */
  if (GLB.cohete){
    const src = GLB.cohete, g = src.geometry; g.computeBoundingBox();
    const bb = g.boundingBox, alto = bb.max.y - bb.min.y, k = (largo + hp + 0.3)/alto;
    const pat = texturaEstilo(E, true);
    const mat = new T.MeshStandardMaterial({ map: src.material.map, metalness: metal, roughness: metal ? 0.3 : 0.5, transparent: !!E.fantasma, opacity: fant });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uPatron = { value: pat }; sh.uniforms.uBB = { value: new T.Vector2(bb.min.y, bb.max.y) };
      sh.vertexShader = 'varying vec3 vPosL;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosL = position;');
      sh.fragmentShader = 'uniform sampler2D uPatron; uniform vec2 uBB; varying vec3 vPosL;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\nvec2 cu = vec2(atan(vPosL.z, vPosL.x)/6.2832 + 0.5, (vPosL.y - uBB.x)/(uBB.y - uBB.x));\ndiffuseColor.rgb *= texture2D(uPatron, cu).rgb*1.25;');
    };
    const m = new T.Mesh(g, mat);
    m.scale.setScalar(k); m.position.y = -(bb.min.y + bb.max.y)/2*k;
    cohete.add(m); cohete.glb = m;
    for (const c of cohete.children) if (c !== m && !cohete.llamas.some(L => L.g === c) && c !== cohete.escudo && !(cohete.aros || []).includes(c)) c.visible = false;
    /* las llamas cuelgan de la base del modelo */
    cohete.base = bb.min.y*k + m.position.y - 0.1;
    cohete.llamas.forEach((L, i) => { const a = nt === 1 ? 0 : i*Math.PI*2/nt, d = nt === 1 ? 0 : 0.2; L.g.position.set(Math.cos(a)*d, cohete.base, Math.sin(a)*d); });
  }
}

/* ══════════ EL HUMO Y LAS ESQUIRLAS ══════════
   ── UNA SOLA MALLA INSTANCIADA, CON EL ALFA POR INSTANCIA ──
   La camara mira derecho por −Z, asi que un plano en +Z ya esta de frente: no
   hay que orientar cada particula. El alfa va en un atributo propio porque
   `MeshBasicMaterial` no tiene alfa por instancia, y sin alfa una particula que
   se apaga es una que desaparece de golpe. */
const PART_N = CALIDADES.alta.part;
const partMat = new T.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uMapa: { value: null } },
  vertexShader: `attribute float aAlfa; attribute vec3 aCol; varying float vA; varying vec3 vC; varying vec2 vUv;
    void main(){ vA = aAlfa; vC = aCol; vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D uMapa; varying float vA; varying vec3 vC; varying vec2 vUv;
    void main(){ float a = texture2D(uMapa, vUv).a*vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`
});
{
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  partMat.uniforms.uMapa.value = new T.CanvasTexture(c);
}
const partGeo = new T.PlaneGeometry(1, 1);
partGeo.setAttribute('aAlfa', new T.InstancedBufferAttribute(new Float32Array(PART_N), 1));
partGeo.setAttribute('aCol', new T.InstancedBufferAttribute(new Float32Array(PART_N*3), 3));
const partes = new T.InstancedMesh(partGeo, partMat, PART_N); partes.frustumCulled = false; mundo.add(partes);
const PART = []; for (let i = 0; i < PART_N; i++) PART.push({ vivo: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, t: 0, dur: 1, s: 1, c: [1, 1, 1], g: 0 });
const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _v3 = new T.Vector3(), _s3 = new T.Vector3();
function particula(o){
  const tope = CALIDADES[CALIDAD].part;
  for (let i = 0; i < tope; i++){ const p = PART[i]; if (!p.vivo){ Object.assign(p, o, { vivo: true, t: 0 }); return p; } }
  return null;
}
function partesPaso(dt){
  const tope = CALIDADES[CALIDAD].part;
  for (let i = 0; i < PART_N; i++){
    const p = PART[i];
    if (!p.vivo || i >= tope){ _s3.set(0, 0, 0); _m4.compose(_v3.set(0, -99, 0), _q, _s3); partes.setMatrixAt(i, _m4); continue; }
    p.t += dt; if (p.t >= p.dur){ p.vivo = false; _s3.set(0, 0, 0); _m4.compose(_v3.set(0, -99, 0), _q, _s3); partes.setMatrixAt(i, _m4); continue; }
    const k = p.t/p.dur;
    p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    const s = p.s*(0.4 + 1.6*k);
    _m4.compose(_v3.set(p.x, p.y, p.z), _q, _s3.set(s, s, 1)); partes.setMatrixAt(i, _m4);
    partGeo.attributes.aAlfa.setX(i, (1 - k)*(k < 0.15 ? k/0.15 : 1)*p.a);
    partGeo.attributes.aCol.setXYZ(i, p.c[0], p.c[1], p.c[2]);
  }
  partes.instanceMatrix.needsUpdate = true; partGeo.attributes.aAlfa.needsUpdate = true; partGeo.attributes.aCol.needsUpdate = true;
}

/* ══════════ LOS OBSTACULOS Y LAS MONEDAS ══════════ */
const OBJ_N = 28;
function geoCosa(k){
  const cil = (r1, r2, h, n) => new T.CylinderGeometry(r1, r2, h, n || 10);
  switch (k){
    case 'pajaro': return fundir([
      { g: new T.SphereGeometry(0.16, 8, 6), c: '#2a2a30', s: [1.6, 1, 1] },
      { g: new T.BoxGeometry(0.55, 0.05, 0.16), c: '#3a3a42', p: [-0.3, 0.05, 0], r: [0, 0, 0.3] },
      { g: new T.BoxGeometry(0.55, 0.05, 0.16), c: '#3a3a42', p: [0.3, 0.05, 0], r: [0, 0, -0.3] },
      { g: new T.ConeGeometry(0.05, 0.16, 5), c: '#ffb02a', p: [0.28, 0, 0], r: [0, 0, -1.57] }]);
    case 'globo': return fundir([
      { g: new T.SphereGeometry(0.6, 14, 10), c: '#e0332a', p: [0, 0.35, 0], s: [1, 1.15, 1] },
      { g: new T.SphereGeometry(0.6, 14, 10), c: '#ffd447', p: [0, 0.35, 0], s: [0.5, 1.16, 1.01] },
      { g: new T.BoxGeometry(0.34, 0.26, 0.34), c: '#8a5a2a', p: [0, -0.6, 0] },
      { g: cil(0.01, 0.01, 0.5, 4), c: '#555', p: [0.12, -0.3, 0.12] }, { g: cil(0.01, 0.01, 0.5, 4), c: '#555', p: [-0.12, -0.3, -0.12] }]);
    case 'nube': case 'cirro': return fundir([
      { g: new T.SphereGeometry(0.9, 12, 9), c: '#ffffff', p: [0, 0, 0], s: [1.6, 0.8, 1] },
      { g: new T.SphereGeometry(0.7, 12, 9), c: '#f4f8ff', p: [-1.1, -0.1, 0.2], s: [1.2, 0.8, 1] },
      { g: new T.SphereGeometry(0.75, 12, 9), c: '#f8fbff', p: [1.0, -0.05, -0.1], s: [1.3, 0.85, 1] },
      { g: new T.SphereGeometry(0.6, 12, 9), c: '#ffffff', p: [0.2, 0.45, 0.1] }]);
    case 'avion': return fundir([
      { g: cil(0.16, 0.16, 1.8, 12), c: '#eef2f8', r: [0, 0, 1.57] },
      { g: new T.ConeGeometry(0.16, 0.4, 12), c: '#eef2f8', p: [1.1, 0, 0], r: [0, 0, -1.57] },
      { g: new T.BoxGeometry(0.5, 0.05, 1.9), c: '#d8dde6', p: [0.1, -0.05, 0] },
      { g: new T.BoxGeometry(0.3, 0.05, 0.7), c: '#d8dde6', p: [-0.8, 0.05, 0] },
      { g: new T.BoxGeometry(0.3, 0.45, 0.05), c: '#e0332a', p: [-0.85, 0.25, 0] },
      { g: cil(0.1, 0.1, 0.4, 8), c: '#5a6070', p: [0.15, -0.16, 0.55], r: [0, 0, 1.57] }, { g: cil(0.1, 0.1, 0.4, 8), c: '#5a6070', p: [0.15, -0.16, -0.55], r: [0, 0, 1.57] }]);
    case 'jet': return fundir([
      { g: new T.ConeGeometry(0.14, 1.6, 8), c: '#5a6478', r: [0, 0, -1.57] },
      { g: new T.BoxGeometry(0.9, 0.04, 1.1), c: '#4a5468', p: [-0.35, 0, 0], r: [0, 0, 0] },
      { g: new T.BoxGeometry(0.25, 0.35, 0.04), c: '#4a5468', p: [-0.7, 0.18, 0] },
      { g: cil(0.08, 0.1, 0.4, 8), c: '#ff7a2a', p: [-0.95, 0, 0], r: [0, 0, 1.57] }]);
    case 'globoAlto': return fundir([
      { g: new T.SphereGeometry(0.9, 14, 10), c: '#eef2f8', p: [0, 0.5, 0], s: [1, 1.2, 1] },
      { g: new T.BoxGeometry(0.3, 0.3, 0.3), c: '#c8ceda', p: [0, -1.1, 0] },
      { g: cil(0.01, 0.01, 0.9, 4), c: '#888', p: [0, -0.55, 0] }]);
    case 'meteoro': return fundir([
      { g: new T.IcosahedronGeometry(0.4, 0), c: '#6a4a3a' },
      { g: new T.IcosahedronGeometry(0.25, 0), c: '#ff9a3a', p: [0.25, 0.2, 0] },
      { g: new T.ConeGeometry(0.3, 1.4, 8), c: '#ffb02a', p: [0.0, 0.9, 0], s: [1, 1, 0.5] }]);
    case 'chatarra': return fundir([
      { g: new T.BoxGeometry(0.5, 0.35, 0.4), c: '#8a94a8' }, { g: cil(0.05, 0.05, 0.9, 6), c: '#5a6070', p: [0.2, 0.3, 0], r: [0.4, 0, 0.5] },
      { g: new T.BoxGeometry(0.6, 0.04, 0.3), c: '#2b5cd8', p: [-0.4, 0.1, 0], r: [0, 0, 0.3] }]);
    case 'satelite': return fundir([
      { g: new T.BoxGeometry(0.5, 0.6, 0.5), c: '#c8ceda' }, { g: new T.BoxGeometry(1.6, 0.05, 0.5), c: '#2b3a8a', p: [1.15, 0, 0] }, { g: new T.BoxGeometry(1.6, 0.05, 0.5), c: '#2b3a8a', p: [-1.15, 0, 0] },
      { g: cil(0.25, 0.02, 0.3, 10), c: '#eef2f8', p: [0, 0.5, 0] }, { g: cil(0.02, 0.02, 0.6, 4), c: '#888', p: [0, -0.5, 0] }]);
    case 'estacion': return fundir([
      { g: cil(0.3, 0.3, 1.2, 10), c: '#d8dde6', r: [0, 0, 1.57] }, { g: cil(0.35, 0.35, 0.8, 10), c: '#c8ceda', p: [0, 0, 0], r: [1.57, 0, 0] },
      { g: new T.BoxGeometry(2.2, 0.05, 0.6), c: '#2b3a8a', p: [0, 0.55, 0] }, { g: new T.BoxGeometry(2.2, 0.05, 0.6), c: '#2b3a8a', p: [0, -0.55, 0] },
      { g: new T.BoxGeometry(0.06, 1.2, 0.06), c: '#888', p: [0.7, 0, 0] }, { g: new T.BoxGeometry(0.06, 1.2, 0.06), c: '#888', p: [-0.7, 0, 0] }]);
    case 'asteroide': return fundir([
      { g: new T.IcosahedronGeometry(0.9, 1), c: '#6a6058', s: [1.2, 0.9, 1] }, { g: new T.IcosahedronGeometry(0.5, 0), c: '#5a5048', p: [0.7, 0.3, 0.2] }, { g: new T.IcosahedronGeometry(0.35, 0), c: '#7a7068', p: [-0.6, -0.4, 0.3] }]);
    default: return new T.SphereGeometry(0.5, 8, 6);
  }
}
const COSAS_M = {};
for (const k in COSAS){
  if (!COSAS[k].r) continue;
  const im = new T.InstancedMesh(geoCosa(k), k === 'nube' || k === 'cirro' ? new T.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false }) : matVert, OBJ_N);
  im.frustumCulled = false; im.count = 0; mundo.add(im); COSAS_M[k] = im;
}
const monedasM = new T.InstancedMesh(new T.TorusGeometry(0.28, 0.11, 8, 18), new T.MeshStandardMaterial({ color: 0xffd447, metalness: 0.8, roughness: 0.3, emissive: 0x6a4a00 }), 90);
monedasM.frustumCulled = false; monedasM.count = 0; mundo.add(monedasM);

/* ══════════ LA TIERRA, LA LUNA Y MARTE ══════════
   La Tierra es una esfera de verdad —radio 6.371 km en las unidades del
   momento— centrada debajo del cohete: aparece cuando la escala la hace entrar
   en el cuadro, a unos 30 km, y se va achicando. La Luna y Marte son esferas
   fijas de cuatro unidades puestas a la altura de su capa: pasan por la
   pantalla como pasa todo lo demas. */
function texturaPlaneta(base, manchas, n, agua){
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 128);
  sem(7);
  for (let i = 0; i < n; i++){ x.fillStyle = manchas[i % manchas.length]; x.beginPath(); x.ellipse(az()*256, az()*128, 8 + az()*40, 6 + az()*22, az()*3, 0, 6.29); x.fill(); }
  if (agua){ x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 30; i++){ x.beginPath(); x.ellipse(az()*256, az()*128, 10 + az()*30, 3 + az()*6, 0, 0, 6.29); x.fill(); } }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const tierra = new T.Mesh(new T.SphereGeometry(1, 96, 64), new T.MeshLambertMaterial({ map: texturaPlaneta('#2b5cd8', ['#3a8a48', '#6a8a3a', '#c8b88a'], 18, true) }));
tierra.visible = false; escena.add(tierra);
const atmos = new T.Mesh(new T.SphereGeometry(1.02, 96, 64), new T.MeshBasicMaterial({ color: 0x7ad9ff, transparent: true, opacity: 0.22, side: T.BackSide, depthWrite: false })); tierra.add(atmos);
const luna = new T.Mesh(new T.SphereGeometry(3.6, 32, 24), new T.MeshLambertMaterial({ map: texturaPlaneta('#b8b8b0', ['#8a8a84', '#9a9a94', '#78786f'], 40) })); luna.visible = false; escena.add(luna);
const marte = new T.Mesh(new T.SphereGeometry(4.2, 32, 24), new T.MeshLambertMaterial({ map: texturaPlaneta('#b0492a', ['#7a3018', '#d07a4a', '#e8a06a'], 30) })); marte.visible = false; escena.add(marte);
const solLejos = new T.Mesh(new T.SphereGeometry(2.2, 24, 16), new T.MeshBasicMaterial({ color: 0xfff2a0 })); solLejos.visible = false; escena.add(solLejos);

/* el anillo de la rafaga y el destello del final */
const anillo = new T.Mesh(new T.RingGeometry(0.5, 0.62, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
mundo.add(anillo);

/* ══════════ COLOCAR TODO SEGUN EL ESTADO ══════════ */
const EFE = { t: 0, sacX: 0, sacY: 0, expl: 0, humoAcum: 0, giro: 0, fx: null };
let H_DIB = 0, X_DIB = 0;   /* la altura y la x interpoladas que usa el dibujo */
function pinta(dt, frac){
  const R = RUN;
  EFE.t += dt;
  const h = R ? lerp(R.hPrev == null ? R.h : R.hPrev, R.h, frac) : 0;
  const x = R ? lerp(R.xPrev == null ? R.x : R.xPrev, R.x, frac) : 0;
  H_DIB = h; X_DIB = x;
  const m = mpu(h);
  ponCielo(h);
  camaPaso(cl((Math.log10(Math.max(1, h)) - 2)/5, 0, 1));
  /* el suelo baja con la altura */
  /* el suelo esta en metros de verdad (5 por unidad al arrancar): con la escala
     creciendo se achica, que es lo que hace la altura, y a los 3 km ya no se ve */
  const escS = 5/m;
  suelo.scale.setScalar(escS);
  suelo.position.y = -h/m + ((cohete.base || -1.35) + 1.2)*escS; suelo.visible = h < 3000;
  const enc = R && (R.fase === 'vuelo' || (R.fase === 'cuenta' && R.tc > 2.2));
  const abre = R ? cl((R.fase === 'vuelo' ? 1 : (R.tc - 2.6)/0.6), 0, 1) : 0;
  for (const b of suelo.brazos) b.rotation.y = -abre*1.3;
  /* el cohete: en x, inclinado hacia donde va, temblando al encender */
  const inclina = R ? -R.vx*0.06 : 0;
  const tiembla = R && R.fase === 'cuenta' ? R.empujeK*0.03 : (R && R.sacude ? R.sacude*0.06 : 0);
  cohete.position.set(x + (Math.random() - 0.5)*tiembla, (Math.random() - 0.5)*tiembla, 0);
  cohete.rotation.z = inclina;
  if (!R || R.fase === 'menu'){
    /* en el menu gira despacio sobre la plataforma */
    EFE.giro += dt*0.5; cohete.rotation.y = EFE.giro; cohete.position.x = 0;
  } else cohete.rotation.y += dt*0.3;
  if (cohete.aros) cohete.aros.forEach((a, i) => { a.rotation.z += dt*(i ? -1.5 : 1.2); });
  if (cohete.escudo){ const gk = R ? R.sacude : 0; cohete.escudo.material.opacity = 0.05 + 0.02*(PROG.niv.escudo | 0) + gk*0.4; }
  /* la llama sigue al empuje, con parpadeo */
  const k = R ? R.empujeK*(R.comb > 0 || R.fase === 'cuenta' ? 1 : 0) : 0;
  const boost = R ? R.boostK : 0;
  const colR = R && R.raf && R.boostK > 0.05 ? new T.Color(R.raf.col) : null;
  for (const L of cohete.llamas || []){
    const fl = 0.85 + Math.random()*0.3;
    const s = k*(1 + boost*0.8)*fl;
    L.g.scale.set(1 + boost*0.4, s, 1 + boost*0.4); L.g.visible = s > 0.02;
    if (colR) L.ext.material.color.copy(colR); else L.ext.material.color.setHex(0xff7a2a);
  }
  luzLlama.intensity = k*(2.2 + boost*2)*(0.9 + Math.random()*0.2);
  luzLlama.position.set(x, -cohete.largo/2 - 0.8, 0.6);
  /* el humo: solo con aire. En el vacio no hay humo, hay llama */
  const aire = aireEn(h);
  if (R && k > 0.1 && aire > 0.02){
    EFE.humoAcum += dt*(R.fase === 'cuenta' ? 90 : 40)*aire*k;
    const enPad = R.fase === 'cuenta' || h < 12;
    while (EFE.humoAcum > 1){
      EFE.humoAcum--;
      const ang = Math.random()*6.28, sp = enPad ? 3 + Math.random()*3 : 0.6;
      const g = 0.55 + Math.random()*0.35;
      particula({ x: x + (Math.random() - 0.5)*0.3, y: enPad ? -cohete.largo/2 - 0.9 : -cohete.largo/2 - 1.2, z: -0.2 + Math.random()*0.4,
        vx: enPad ? Math.cos(ang)*sp : (Math.random() - 0.5)*0.8, vy: enPad ? 0.2 + Math.random()*0.5 : -(R.v/m)*0.6 - 2, g: enPad ? 0 : 0,
        dur: enPad ? 1.6 + Math.random() : 0.5 + Math.random()*0.5, s: enPad ? 1.2 : 0.7, a: 0.55, c: [g, g*0.98, g*0.95] });
    }
  }
  /* el sacudon de la camara: por golpe y por rafaga */
  const sac = R ? R.sacude*0.35 + R.boostK*0.12 : 0;
  /* ── EN EL MENU LA CAMARA BAJA Y MIRA HACIA ABAJO ──
     El cohete tiene que quedar en el hueco del velo, arriba del cuadro. Correrlo
     hacia arriba o bajar la camara deja el lente DEBAJO del suelo, y lo que se ve
     es la cara de abajo del pasto (medido: los dos quintos de arriba del cuadro
     en negro). La camara se queda justo por encima del suelo y mira unos grados
     hacia abajo: el cohete cae al 37 % del alto, en el hueco, y el pasto llena el resto. */
  const menu = (!R || PANTALLA !== '') && !(R && R.fase === 'fin');
  const yObj = menu ? -1.0 : CAM_Y, mObj = menu ? -3.4 : CAM_Y;
  EFE.camY = EFE.camY == null ? yObj : EFE.camY + (yObj - EFE.camY)*Math.min(1, dt*4);
  EFE.miraY = EFE.miraY == null ? mObj : EFE.miraY + (mObj - EFE.miraY)*Math.min(1, dt*4);
  cam.position.set((Math.random() - 0.5)*sac, EFE.camY + (Math.random() - 0.5)*sac, CAM_D);
  cam.lookAt(0, EFE.miraY, 0);
  /* los obstaculos */
  for (const kk in COSAS_M) COSAS_M[kk].count = 0;
  if (R){
    for (const o of R.obs){
      if (!o.vivo) continue;
      const im = COSAS_M[o.k]; if (!im || im.count >= OBJ_N) continue;
      const dy = (o.hm - h)/m; if (dy < -16 || dy > 30) continue;
      const bob = Math.sin(EFE.t*1.5 + o.fase)*0.15;
      const rz = o.k === 'meteoro' ? -0.7 : (o.k === 'asteroide' || o.k === 'chatarra' ? EFE.t*0.4 + o.fase : 0);
      const ry = o.k === 'satelite' || o.k === 'estacion' ? EFE.t*0.2 + o.fase : (o.vx < 0 ? Math.PI : 0);
      _q.setFromEuler(new T.Euler(0, ry, rz));
      const sc = o.r/(COSAS[o.k].r) ;
      _m4.compose(_v3.set(o.x, dy + bob, -0.5), _q, _s3.set(sc, sc, sc));
      im.setMatrixAt(im.count++, _m4);
    }
    monedasM.count = 0;
    for (const o of R.mon){
      if (!o.vivo || monedasM.count >= 90) continue;
      const dy = (o.hm - h)/m; if (dy < -16 || dy > 30) continue;
      _q.setFromEuler(new T.Euler(0, EFE.t*2.5 + o.hm*0.01, 0));
      _m4.compose(_v3.set(o.x, dy, 0), _q, _s3.set(1, 1, 1)); monedasM.setMatrixAt(monedasM.count++, _m4);
    }
  } else monedasM.count = 0;
  for (const kk in COSAS_M) COSAS_M[kk].instanceMatrix.needsUpdate = true;
  monedasM.instanceMatrix.needsUpdate = true;
  /* la Tierra */
  /* ── LA TIERRA: EL RADIO SE TOPA Y EL BORDE SUBE ──
     A escala real la esfera mide miles de unidades y el plano lejano la corta;
     ademas el suelo esta siempre a 25 unidades, asi que la Tierra no entraria
     nunca en el cuadro. El radio visible se topa en 50 y el borde sube de −25 a
     −6 entre los 25 y los 400 km: primero es un horizonte curvo, despues una
     bola que se achica hasta ser un punto pasada la geoestacionaria. */
  tierra.visible = h > 25000;
  if (tierra.visible){
    /* el tope del radio bajo de 300 a 80 midiendo: con 300 la parte visible de la
       esfera es 1/125 de la vuelta y la foto de 1024 px cae en ocho pixeles, o sea una
       mancha borrosa; con 50 se ve la curva y sesenta pixeles de textura */
    const rT = Math.min(50, R_T/m), arriba = -25 + 19*cl((h - 25000)/375000, 0, 1);
    tierra.scale.setScalar(rT); tierra.position.set(0, arriba - rT, -rT*0.15 - 4); tierra.rotation.y = EFE.t*0.01;
  }
  /* la Luna y Marte, a su altura */
  for (const [obj, hh, xx] of [[luna, 3.84e8, 3.2], [marte, 7.8e10, -3.0], [solLejos, 3e11, 3.5]]){
    const dy = (hh - h)/m; obj.visible = dy > -20 && dy < 40; if (obj.visible){ obj.position.set(xx, dy, -6); obj.rotation.y = EFE.t*0.05; }
  }
  /* el anillo de la rafaga */
  if (R && R.boostK > 0){ anillo.visible = true; anillo.position.set(x, -cohete.largo/2 - 0.4, 0.3); const s = 1 + (1 - R.boostK)*6; anillo.scale.set(s, s, 1); anillo.material.opacity = R.boostK*0.8; if (R.raf) anillo.material.color.set(R.raf.col); }
  else anillo.visible = false;
  partesPaso(dt);
  render.render(escena, cam);
}
/* la explosion: cincuenta esquirlas de tres colores y el cohete que desaparece */
function explota(){
  const x = X_DIB;
  for (let i = 0; i < 60; i++){
    const a = Math.random()*6.28, sp = 2 + Math.random()*7;
    const cs = [[1, 0.6, 0.2], [1, 0.3, 0.1], [0.9, 0.9, 0.9], [0.3, 0.3, 0.3]][i % 4];
    particula({ x, y: (Math.random() - 0.5)*1.2, z: 0.2, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, g: -4, dur: 0.6 + Math.random()*0.8, s: 0.6 + Math.random()*0.8, a: 0.9, c: cs });
  }
  cohete.visible = false; luzLlama.intensity = 0;
}
function esquirlasGolpe(){
  const x = X_DIB;
  for (let i = 0; i < 14; i++){ const a = Math.random()*6.28, sp = 1 + Math.random()*4; particula({ x, y: 0.3, z: 0.3, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, g: -3, dur: 0.4 + Math.random()*0.4, s: 0.35, a: 0.9, c: [1, 0.8, 0.4] }); }
}
function chispasMoneda(x, y){
  for (let i = 0; i < 6; i++){ const a = Math.random()*6.28; particula({ x, y, z: 0.4, vx: Math.cos(a)*2, vy: Math.sin(a)*2, g: 0, dur: 0.35, s: 0.25, a: 0.9, c: [1, 0.85, 0.3] }); }
}
