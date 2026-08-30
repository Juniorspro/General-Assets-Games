
/* ══════════════════════════ LA LLUVIA ══════════════════════════
   Cuatro mil gotas y CERO trabajo de JavaScript por cuadro. Ésa es la decisión
   entera y conviene explicarla, porque la forma obvia no sirve: con un
   `InstancedMesh` normal hay que componer y escribir cuatro mil matrices en
   cada cuadro —o sea cuatro mil `compose` más cuatro mil escrituras a un
   Float32Array— y eso solo ya se come el presupuesto de un teléfono.

   Acá la caída la calcula el VERTEX SHADER a partir de una semilla por gota y
   del reloj: la gota cae, llega abajo y vuelve a aparecer arriba con un módulo.
   Lo único que se manda por cuadro son dos números —el reloj y dónde está la
   cámara—, y la caja de lluvia se mueve con el jugador por construcción.

   Y CADA GOTA MIRA A LA CÁMARA. Una tira vertical es un plano, y un plano visto
   de canto no tiene un solo píxel: girando la cabeza, la mitad de la lluvia
   desaparecería. El eje horizontal de cada tira se calcula en el shader como el
   producto cruzado entre la vertical y la dirección a la cámara, así que
   siempre se ve de frente sin ser un billboard completo — la tira sigue
   inclinada con el viento, que es lo que hace que la lluvia tenga dirección. */
const LLUVIA = { caja: 44, alto: 26, malla: null, mat: null };
function armaLluvia(){
  const n = CFG.gotas;
  const g = new T.InstancedBufferGeometry();
  /* una tira: dos triángulos con u en [-0.5,0.5] y v en [0,1] */
  g.setAttribute('position', new T.BufferAttribute(new Float32Array([
    -0.5,0,0,  0.5,0,0,  0.5,1,0,  -0.5,0,0,  0.5,1,0,  -0.5,1,0 ]), 3));
  const sem = new Float32Array(n*4);
  for (let i = 0; i < n; i++){
    sem[i*4]   = azr(-LLUVIA.caja, LLUVIA.caja);
    sem[i*4+1] = azr(0, LLUVIA.alto);
    sem[i*4+2] = azr(-LLUVIA.caja, LLUVIA.caja);
    sem[i*4+3] = azr(0.72, 1.35);                 /* velocidad y largo */
  }
  g.setAttribute('semilla', new T.InstancedBufferAttribute(sem, 4));
  g.instanceCount = n;
  LLUVIA.mat = new T.ShaderMaterial({
    uniforms: {
      t: { value: 0 }, camXZ: { value: new T.Vector2() }, camPos: { value: new T.Vector3() },
      caja: { value: LLUVIA.caja }, alto: { value: LLUVIA.alto },
      viento: { value: new T.Vector2(0.30, 0.16) },
      col: { value: new T.Color(0xa8c6e6) }, op: { value: 0.34 }
    },
    vertexShader: `
      attribute vec4 semilla;
      uniform float t, caja, alto, op;
      uniform vec2 camXZ, viento;
      uniform vec3 camPos;
      varying float vA;
      void main(){
        /* la caja de lluvia se centra en la cámara redondeando a la unidad: sin
           redondear, la nube entera se desliza con el jugador y la lluvia se ve
           quieta respecto de uno, que es lo contrario de lo que pasa */
        vec2 c = floor(camXZ);
        float x = c.x + semilla.x + viento.x * t * semilla.w * 6.0;
        float z = c.y + semilla.z + viento.y * t * semilla.w * 6.0;
        x = c.x + mod(x - c.x + caja, caja*2.0) - caja;
        z = c.y + mod(z - c.y + caja, caja*2.0) - caja;
        float y = mod(semilla.y - t * semilla.w * 17.0, alto);
        vec3 base = vec3(x, y, z);
        vec3 hacia = camPos - base;
        float d = length(hacia);
        vec3 lado = normalize(cross(vec3(0.0, 1.0, 0.0), hacia / max(d, 0.001)));
        vec3 tira = vec3(viento.x, -1.0, viento.y) * (0.62 * semilla.w);
        vec3 p = base + lado * position.x * 0.035 + tira * position.y;
        /* se apaga con la distancia en vez de con niebla: una gota gris a
           cuarenta metros no es lluvia, es ruido */
        vA = op * (1.0 - smoothstep(6.0, caja * 0.85, d)) * smoothstep(0.7, 2.2, d);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 col; varying float vA;
      void main(){ gl_FragColor = vec4(col, vA); }`,
    transparent: true, depthWrite: false, side: T.DoubleSide
  });
  LLUVIA.malla = new T.Mesh(g, LLUVIA.mat);
  LLUVIA.malla.frustumCulled = false;    /* la caja sigue a la cámara: recortarla es apagarla */
  escena.add(LLUVIA.malla);
}
function pasoLluvia(){
  if (!LLUVIA.mat) return;
  LLUVIA.mat.uniforms.t.value = RELOJ.value;
  LLUVIA.mat.uniforms.camXZ.value.set(JUG.x, JUG.z);
  LLUVIA.mat.uniforms.camPos.value.copy(cam.position);
}

/* ── LAS SALPICADURAS ──
   Anillos chatos que crecen y se apagan en el suelo, alrededor del jugador. Son
   pocas —ciento veinte— y por eso sí se pueden mover desde JavaScript; y son
   LO QUE HACE QUE LA LLUVIA TOQUE EL PISO. Sin ellas el agua cae y desaparece,
   que es exactamente como se ve una lluvia mal hecha. */
const SALPICA = { n: 220, malla: null, d: [] };
const _mS = new T.Matrix4(), _vS = new T.Vector3(), _qS = new T.Quaternion(), _sS = new T.Vector3();
function armaSalpicaduras(){
  /* MÁS CHICAS DE LO QUE PARECE QUE TIENEN QUE SER. La primera versión medía
     medio metro de radio y en la captura lo que había en el piso eran anillos
     de tiza: una salpicadura de lluvia mide un palmo, y lo que la hace leer no
     es el tamaño sino que haya muchas y que duren poco. */
  const g = new T.RingGeometry(0.075, 0.125, 7);
  g.rotateX(-Math.PI/2);
  SALPICA.malla = new T.InstancedMesh(g, matSalpica, SALPICA.n);
  SALPICA.malla.frustumCulled = false;
  SALPICA.malla.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let i = 0; i < SALPICA.n; i++) SALPICA.d.push({ x:0, z:0, t: az() });
  escena.add(SALPICA.malla);
}
function pasoSalpicaduras(dt){
  if (!SALPICA.malla) return;
  _qS.identity();
  for (let i = 0; i < SALPICA.n; i++){
    const s = SALPICA.d[i];
    s.t -= dt * 2.6;
    if (s.t <= 0){
      s.t = 1;
      const a = az()*6.283, r = Math.sqrt(az()) * 13;
      s.x = JUG.x + Math.cos(a)*r; s.z = JUG.z + Math.sin(a)*r;
      s.y = alturaSuelo(s.x, s.z);
    }
    const u = 1 - s.t;
    const k = u * 1.9 + 0.25;
    _vS.set(s.x, (s.y || 0) + 0.02, s.z);
    _sS.set(k, 1, k);
    _mS.compose(_vS, _qS, _sS);
    SALPICA.malla.setMatrixAt(i, _mS);
  }
  SALPICA.malla.instanceMatrix.needsUpdate = true;
}

/* ══════════════════════════ LOS AUTOS ESTACIONADOS ══════════════════════════
   Uno cada tanto contra el cordón. No son un adorno: son lo único que rompe la
   línea recta de la calle, y de noche sus vidrios y sus ópticas son lo que
   devuelve el reflejo del farol a la altura de los ojos. */
const AUTOS = [];
function armaAutos(){
  const chapa = [], vidrio = [], luz = [], rueda = [];
  const colores = [0x2c333c, 0x3a3128, 0x27303a, 0x36313a, 0x2b3630, 0x3b2f2f];
  for (const e of EJES){
    for (let k = 0; k < CUADRAS*2; k++){
      if (az() > 0.42) continue;
      const t = -MITAD + CALLE + azr(0, 1) * 8 + k * (PASO/2);
      if (Math.abs(t) > MITAD - 6) continue;
      if (EJES.some(q => Math.abs(t - q) < CALLE*1.2)) continue;
      const enZ = az() < 0.5;
      const s = az() < 0.5 ? 1 : -1;
      const x = enZ ? e + s*(CALLE/2 - 1.15) : t;
      const z = enZ ? t : e + s*(CALLE/2 - 1.15);
      const rot = enZ ? 0 : Math.PI/2;
      const c = colores[azi(0, colores.length-1)];
      const L = azr(4.1, 4.8), A = 1.82, H = 0.72;
      const pu = (arr, g, p, ss, cc) => {
        const co = Math.cos(rot), si = Math.sin(rot);
        arr.push({ g, p:[x + p[0]*co + p[2]*si, p[1], z - p[0]*si + p[2]*co],
                   r:[0, rot, 0], s: ss, c: cc });
      };
      pu(chapa, geoCaja, [0, 0.62, 0], [A, H, L], c);
      pu(chapa, geoCaja, [0, 1.16, -0.25], [A*0.86, 0.62, L*0.52], c);
      pu(vidrio, geoCaja, [0, 1.18, -0.25], [A*0.88, 0.44, L*0.53], 0xffffff);
      pu(luz, geoCaja, [0, 0.62, L/2 + 0.02], [A*0.72, 0.14, 0.06], 0xffffff);
      for (const sx of [-1, 1]) for (const sz of [-1, 1])
        pu(rueda, geoCil, [sx*A*0.46, 0.32, sz*L*0.31], [0.62, 0.22, 0.62], 0x101216);
      AUTOS.push({ x, z });
      COLIS.push({ x0: x - (enZ ? A/2 : L/2) - 0.2, x1: x + (enZ ? A/2 : L/2) + 0.2,
                   z0: z - (enZ ? L/2 : A/2) - 0.2, z1: z + (enZ ? L/2 : A/2) + 0.2 });
    }
  }
  /* las ruedas van acostadas: un cilindro nace parado sobre +Y */
  for (const r of rueda) r.r = [r.r[0], r.r[1], Math.PI/2];
  const add = (arr, mat, sombra) => {
    const g = fundir(arr); if (!g) return;
    const m = new T.Mesh(g, mat); m.castShadow = !!sombra; m.receiveShadow = true;
    escena.add(m);
  };
  add(chapa, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }), true);
  add(vidrio, matAutoV, false);
  add(luz, matAutoL, false);
  add(rueda, new T.MeshLambertMaterial({ color: 0x101216, flatShading: true }), true);
}
