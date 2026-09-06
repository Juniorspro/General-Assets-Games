
/* ══════════════════════════ LAS CALLES ══════════════════════════
   El asfalto es UN plano que cubre los doscientos setenta y cuatro metros, y
   encima van las veredas de cada cuadra. Al revés —una losa de asfalto por
   calle— serían sesenta piezas para dibujar una superficie continua, con una
   costura visible en cada cruce.

   LAS LÍNEAS VAN CORTADAS Y NO CORRIDAS. Una raya continua en el medio de una
   calle de barrio no existe: lo que hay son rayas de dos metros cada seis, y
   ese ritmo es lo que da velocidad al caminar. */
let sueloMesh = null, lineasMesh = null;
function armaCalles(){
  /* EL PLANO SE PASA DEL BARRIO POR DOS CUADRAS. Las cuadras de borde viven
     afuera de la reja de calles, así que con el plano justo al tamaño del
     damero quedarían apoyadas en el vacío — y el borde del plano se ve como una
     línea recta contra la niebla, que es peor que no tener borde. */
  const EXT = LADO + PASO*2.4;
  const g = new T.PlaneGeometry(EXT, EXT);
  sueloMesh = new T.Mesh(g, matAsfalto);
  sueloMesh.rotation.x = -Math.PI/2;
  sueloMesh.receiveShadow = true;
  matAsfalto.map.repeat.set(EXT/2.4, EXT/2.4);
  escena.add(sueloMesh);

  const piezas = [];
  const raya = 2.0, hueco = 4.0;
  for (const e of EJES){
    for (let t = -MITAD; t < MITAD; t += raya + hueco){
      /* el cruce no lleva raya: pintar la línea a través de una bocacalle es lo
         que delata a un damero generado */
      const enCruce = (v) => EJES.some(q => Math.abs(v - q) < CALLE*0.8);
      if (!enCruce(t + raya/2))
        piezas.push({ g: geoPlano, p:[e, 0.014, t + raya/2], r:[-Math.PI/2, 0, 0], s:[0.16, raya, 1] });
      if (!enCruce(t + raya/2))
        piezas.push({ g: geoPlano, p:[t + raya/2, 0.014, e], r:[-Math.PI/2, 0, Math.PI/2], s:[0.16, raya, 1] });
    }
  }
  const geo = fundir(piezas);
  lineasMesh = new T.Mesh(geo, new T.MeshLambertMaterial({ color: 0xb9b2a0 }));
  lineasMesh.receiveShadow = false;
  escena.add(lineasMesh);
}

/* ══════════════════════════ LOS FAROLES Y LOS CABLES ══════════════════════════
   Un farol cada media cuadra, alternando de vereda. Poste, brazo curvo y la
   cabeza, más el cable que va del brazo de uno al del siguiente.

   Y ACÁ ESTÁ LA DECISIÓN DE FONDO DEL JUEGO: HAY CIENTO VEINTE FAROLES Y SEIS
   LUCES. Una `PointLight` por farol es imposible —el renderer directo compila un
   shader con TODAS las luces adentro y ciento veinte reventarían el límite de
   uniformes de cualquier teléfono—, y bajar la cantidad de faroles arruinaría el
   barrio. Así que los faroles son geometría y las luces son SEIS objetos que se
   mudan cada cuadro a los seis faroles más cercanos. Lo que se ve a treinta
   metros de un farol es su cabeza encendida y su halo, no la luz que tira sobre
   el asfalto; a diez metros sí, y a diez metros nunca hay más de seis. */
/* ── EL HALO NO ES UN CONO ──
   La primera versión era un cono aditivo, que es lo que uno dibujaría pensando
   en «el aire iluminado debajo del farol». No funciona, y el motivo se ve en
   cuanto se saca una captura: un cono TIENE SILUETA. Su borde es una recta que
   corta el cielo, así que sobre un fondo casi negro y con mezcla aditiva lo que
   aparece es una pirámide pálida y sólida — medido, dos o tres superpuestas
   tapaban media pantalla. Bajarle la opacidad no lo arregla: lo hace más
   tenue y sigue siendo una pirámide.

   Lo que no tiene silueta es un DEGRADADO RADIAL, y para que un degradado radial
   funcione desde cualquier ángulo tiene que mirar a la cámara. Noventa y seis
   `Sprite` serían noventa y seis llamadas de dibujo, así que van como una malla
   instanciada con el encaramiento hecho en el vertex shader: una llamada, y el
   brillo se calcula por PÍXEL en vez de por vértice, que es de donde salía el
   borde duro.

   Y SE APAGA CON LA DISTANCIA. Sin eso, los noventa y seis halos del barrio se
   suman contra el horizonte y la niebla queda con una banda naranja. */
let haloMat = null;
function armaHalos(pts){
  const g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array([
    -1,-1,0,  1,-1,0,  1,1,0,  -1,-1,0,  1,1,0,  -1,1,0 ]), 3));
  g.setAttribute('uv', new T.BufferAttribute(new Float32Array([
    0,0, 1,0, 1,1, 0,0, 1,1, 0,1 ]), 2));
  const off = new Float32Array(pts.length*3);
  pts.forEach((p, i) => { off[i*3] = p[0]; off[i*3+1] = p[1]; off[i*3+2] = p[2]; });
  g.setAttribute('centro', new T.InstancedBufferAttribute(off, 3));
  g.instanceCount = pts.length;
  haloMat = new T.ShaderMaterial({
    uniforms: { camPos: { value: new T.Vector3() }, r: { value: 3.4 },
                col: { value: new T.Color(0xffc98a) }, fuerza: { value: 0.62 } },
    vertexShader: `
      attribute vec3 centro;
      uniform vec3 camPos; uniform float r;
      varying vec2 vUv; varying float vD;
      void main(){
        vUv = uv;
        vec3 hacia = camPos - centro;
        float d = length(hacia);
        vec3 f = hacia / max(d, 0.001);
        vec3 lado = normalize(cross(vec3(0.0,1.0,0.0), f));
        vec3 arriba = cross(f, lado);
        vec3 p = centro + (lado * position.x + arriba * position.y) * r;
        vD = d;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 col; uniform float fuerza;
      varying vec2 vUv; varying float vD;
      void main(){
        float q = length(vUv - 0.5) * 2.0;
        /* el núcleo va a la cuarta y el resplandor al cuadrado: sin el núcleo
           el halo es una nube sin lámpara adentro */
        float a = pow(max(1.0 - q, 0.0), 2.2) * 0.55 + pow(max(1.0 - q, 0.0), 9.0) * 0.9;
        a *= fuerza * (1.0 - smoothstep(24.0, 96.0, vD));
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false
  });
  const m = new T.Mesh(g, haloMat);
  m.frustumCulled = false;
  escena.add(m);
  return m;
}
let posteMesh = null, cabezaMesh = null, haloMesh = null, cableMesh = null;
const LUCES = [];
function armaFaroles(){
  const piezas = [], cabezas = [], halos = [], cables = [];
  const brazo = 1.9, altoPoste = 7.4;
  /* los faroles van sobre la vereda, o sea corridos del eje de la calle */
  const off = CALLE/2 + 0.9;
  const pon = (x, z, dir) => {
    /* `dir` es hacia dónde apunta el brazo: siempre hacia la calle */
    const bx = x + dir[0]*brazo*0.5, bz = z + dir[1]*brazo*0.5;
    piezas.push({ g: geoCil, p:[x, altoPoste/2, z], s:[0.17, altoPoste, 0.17] });
    piezas.push({ g: geoCil, p:[bx, altoPoste - 0.15, bz],
                  r:[dir[1] ? Math.PI/2 : 0, 0, dir[0] ? Math.PI/2 : 0],
                  s:[0.11, brazo, 0.11] });
    const hx = x + dir[0]*brazo, hz = z + dir[1]*brazo;
    piezas.push({ g: geoCaja, p:[hx, altoPoste - 0.30, hz], s:[0.62, 0.20, 0.44] });
    cabezas.push({ g: geoCaja, p:[hx, altoPoste - 0.44, hz], s:[0.52, 0.10, 0.36] });
    /* EL HALO ES UN CONO SIN LUZ Y ADITIVO, no un `SpotLight`. Lo que se ve
       alrededor de un farol bajo la lluvia es el aire iluminado, y eso no lo da
       ninguna luz de three.js: hay que dibujarlo. Un cono aditivo apuntando al
       piso es el truco de siempre y cuesta cero. */
    halos.push([hx, altoPoste - 0.52, hz]);
    FAROLES.push({ x: hx, z: hz, y: altoPoste - 0.44 });
    return [hx, hz, altoPoste - 0.44];
  };

  for (let i = 0; i <= CUADRAS; i++){
    const e = EJES[i];
    /* las que corren en Z */
    let ant = null;
    for (let k = 0; k <= CUADRAS*2; k++){
      const z = -MITAD + CALLE/2 + k * (PASO/2);
      if (Math.abs(z) > MITAD - 2) continue;
      const s = (k % 2) ? 1 : -1;
      const p = pon(e + s*off, z, [-s, 0]);
      if (ant) cables.push([ant, p]);
      ant = p;
    }
    /* y las que corren en X */
    ant = null;
    for (let k = 0; k <= CUADRAS*2; k++){
      const x = -MITAD + CALLE/2 + k * (PASO/2);
      if (Math.abs(x) > MITAD - 2) continue;
      if (EJES.some(q => Math.abs(x - q) < CALLE)) continue;   /* no en el cruce */
      const s = (k % 2) ? 1 : -1;
      const p = pon(x, e + s*off, [0, -s]);
      if (ant) cables.push([ant, p]);
      ant = p;
    }
  }

  posteMesh = new T.Mesh(fundir(piezas), matPoste);
  posteMesh.castShadow = true;
  escena.add(posteMesh);
  cabezaMesh = new T.Mesh(fundir(cabezas), matFarol);
  escena.add(cabezaMesh);
  haloMesh = armaHalos(halos);

  /* ── EL CABLE ──
     Una CATENARIA y no una recta, y es la diferencia entre un cable y un palo:
     lo que se reconoce de un cable colgado es que se hunde en el medio. Van
     todos fundidos en una malla de tubos de cuatro lados. */
  const tubos = [];
  for (const [a, b] of cables){
    const dx = b[0]-a[0], dz = b[1]-a[1];
    const L = Math.hypot(dx, dz);
    if (L > PASO * 0.8) continue;          /* no se cablea a través de un cruce */
    const N = 7, hund = L * 0.055;
    for (let s = 0; s < N; s++){
      const t0 = s/N, t1 = (s+1)/N;
      const y0 = a[2] + (b[2]-a[2])*t0 - hund*Math.sin(Math.PI*t0)*2;
      const y1 = a[2] + (b[2]-a[2])*t1 - hund*Math.sin(Math.PI*t1)*2;
      const x0 = a[0]+dx*t0, z0 = a[1]+dz*t0, x1 = a[0]+dx*t1, z1 = a[1]+dz*t1;
      const lx = x1-x0, ly = y1-y0, lz = z1-z0;
      const len = Math.hypot(lx, ly, lz);
      tubos.push({ g: geoCil,
        p:[(x0+x1)/2, (y0+y1)/2, (z0+z1)/2],
        r:[Math.atan2(Math.hypot(lx, lz), ly) * (lz >= 0 ? 1 : -1) * 0 + 0, 0, 0],
        s:[0.05, len, 0.05], q: [lx, ly, lz] });
    }
  }
  /* ORIENTAR UN CILINDRO ENTRE DOS PUNTOS NO SE HACE CON DOS ÁNGULOS DE EULER:
     hay que llevar su eje +Y sobre la dirección, y eso es un cuaternión. Con
     Euler hay que elegir un orden y acertarle al signo del cuadrante, que es de
     donde salen los cables que apuntan para cualquier lado. */
  const _q = new T.Quaternion(), _e = new T.Euler(), _u = new T.Vector3(0,1,0), _d = new T.Vector3();
  for (const t of tubos){
    _d.set(t.q[0], t.q[1], t.q[2]).normalize();
    _q.setFromUnitVectors(_u, _d);
    _e.setFromQuaternion(_q, 'XYZ');
    t.r = [_e.x, _e.y, _e.z];
    delete t.q;
  }
  cableMesh = new T.Mesh(fundir(tubos), matCable);
  escena.add(cableMesh);

  /* las seis (u ocho) luces que se mudan */
  const n = CALIDADES[CALIDAD].luces;
  for (let i = 0; i < n; i++){
    const l = new T.PointLight(0xffb469, 0, 26, 1.9);
    l.castShadow = false;
    escena.add(l);
    LUCES.push(l);
  }
  /* UNA SOLA de las seis proyecta sombra, y es la más cercana. Cada luz con
     sombra es una pasada entera de la escena desde su punto de vista: seis
     serían siete pasadas por cuadro. Con una, el poste y la cerca que uno tiene
     al lado tiran su sombra —que es lo único que se mira— y las otras cinco
     iluminan. */
  if (CFG.sombras){
    LUCES[0].castShadow = true;
    LUCES[0].shadow.mapSize.set(1024, 1024);
    LUCES[0].shadow.camera.near = 0.4;
    LUCES[0].shadow.camera.far = 26;
    /* `bias` SOLO NO ALCANZA, y hay que empujarlo tan lejos que despega la
       sombra del objeto. `normalBias` corre el punto de muestreo a lo largo de
       la NORMAL de la superficie, que es donde el error de profundidad
       realmente está: con él puesto, el bias puede bajar a la mitad y el acné
       desaparece igual sin que la sombra se despegue del pie del poste. */
    LUCES[0].shadow.bias = -0.002;
    LUCES[0].shadow.normalBias = 0.02;
  }
}

/* el billboard necesita saber dónde está la cámara: es lo único que se le
   manda por cuadro, y sin eso los noventa y seis halos se quedan mirando al
   punto donde estaba la cámara cuando se construyeron */
function pasoHalos(){ if (haloMat) haloMat.uniforms.camPos.value.copy(cam.position); }

/* cada cuadro: las luces se mudan a los faroles más cercanos */
const _ordFar = [];
function pasoFaroles(){
  _ordFar.length = 0;
  for (let i = 0; i < FAROLES.length; i++){
    const f = FAROLES[i];
    const d = (f.x - JUG.x)*(f.x - JUG.x) + (f.z - JUG.z)*(f.z - JUG.z);
    if (d < 3200) _ordFar.push({ i, d });
  }
  _ordFar.sort((a, b) => a.d - b.d);
  for (let k = 0; k < LUCES.length; k++){
    const o = _ordFar[k];
    if (!o){ LUCES[k].intensity = 0; continue; }
    const f = FAROLES[o.i];
    LUCES[k].position.set(f.x, f.y, f.z);
    /* PARPADEAN, y cada uno con su propio ritmo. Un farol de sodio viejo late;
       ciento veinte latiendo al unísono se leerían como que la pantalla
       parpadea, así que la fase sale del índice del farol. */
    const p = 0.90 + Math.sin(RELOJ.value*2.1 + o.i*2.7)*0.05
                   + Math.sin(RELOJ.value*11.3 + o.i)*0.03;
    LUCES[k].intensity = 26 * p * (1 - cl(o.d/3200, 0, 1)*0.35);
  }
}

/* ══════════════════════════ LOS CHARCOS ══════════════════════════
   Lo que hace que una calle se lea MOJADA no es que sea más oscura: es que
   refleja los faroles en una raya larga. El asfalto es lo único de la escena con
   especular, y encima de eso van estos parches aditivos debajo de cada farol —
   el reflejo estirado en el sentido de la calle, que es lo que hace el agua
   sobre un asfalto con textura direccional. */
let charcoMesh = null;
function armaCharcos(){
  if (!CFG.charcos) return;
  const piezas = [];
  for (const f of FAROLES){
    /* dos parches cruzados: uno ancho, que es el charco redondo debajo del
       farol, y otro estirado, que es el reflejo alargándose calle abajo */
    piezas.push({ g: geoPlano, p:[f.x, 0.020, f.z], r:[-Math.PI/2, 0, 0], s:[8.5, 8.5, 1] });
    piezas.push({ g: geoPlano, p:[f.x, 0.022, f.z], r:[-Math.PI/2, 0, 0], s:[3.4, 14.0, 1] });
    piezas.push({ g: geoPlano, p:[f.x, 0.024, f.z], r:[-Math.PI/2, 0, Math.PI/2], s:[3.4, 14.0, 1] });
  }
  charcoMesh = new T.Mesh(fundir(piezas), matCharco);
  escena.add(charcoMesh);
}

/* ══════════════════════════ EL CIELO, LA LUNA Y EL RELÁMPAGO ══════════════════════════ */
let ambiente = null, luna = null, rayoLuz = null, cielo = null;
function armaCielo(){
  cielo = new T.Mesh(new T.SphereGeometry(400, 16, 10), matCielo);
  escena.add(cielo);
  /* EL AMBIENTE VA MUY BAJO Y AZUL. Con un ambiente alto los faroles dejan de
     importar y el barrio se ve como un día nublado; lo que hace la noche es que
     lo único que ilumina de verdad esté a diez metros. */
  /* MEDIDO EN LA PRIMERA CAPTURA: con 0,55 las casas eran siluetas negras y lo
     único que se veía del barrio eran los faroles. Una noche de verdad tiene
     cielo nublado encima, y un cielo nublado sobre una ciudad NO es negro:
     rebota la luz de la propia ciudad. Con 1,05 arriba y casi nada abajo, las
     paredes se leen y el suelo sigue oscuro, que es lo que hace que los faroles
     sigan importando. */
  /* Y EL COLOR DE ABAJO NO PUEDE SER NEGRO. Un `HemisphereLight` reparte según
     hacia dónde mira la cara: con el suelo en negro, TODA cara que no mire al
     cielo —o sea las cuatro paredes de cada casa— recibe cero. Medido en la
     captura, metido en un patio y de frente a una medianera el cuadro era negro
     en un noventa por ciento. Con el suelo en un azul muy oscuro, las paredes
     apenas se despegan del cielo, que es lo que hace una noche nublada. */
  ambiente = new T.HemisphereLight(0x2b3d55, 0x161d27, 1.30);
  escena.add(ambiente);
  /* la luna: una direccional muy floja, sólo para que las caras que no miran a
     ningún farol no queden en negro absoluto */
  luna = new T.DirectionalLight(0x9fb6d8, 0.80);
  luna.position.set(-60, 90, 40);
  escena.add(luna);
  /* Y EL RELÁMPAGO ES OTRA DIRECCIONAL, apagada, que se enciende de golpe. Va
     como luz de escena y no como un velo blanco encima: lo que hace un
     relámpago es que por un cuarto de segundo se vea TODO el barrio con sombras
     duras desde otra dirección, y eso un velo no lo puede fingir. */
  rayoLuz = new T.DirectionalLight(0xd8e6ff, 0);
  rayoLuz.position.set(80, 120, -60);
  escena.add(rayoLuz);
}

const RAYO = { prox: 9, t: 0, dur: 0, fase: 0 };
function pasoRayo(dt){
  RAYO.prox -= dt;
  if (RAYO.prox <= 0 && RAYO.t <= 0){
    RAYO.t = RAYO.dur = azr(0.42, 0.85);
    RAYO.prox = azr(16, 46);
    RAYO.fase = 0;
    /* el trueno llega DESPUÉS, y el retardo es la distancia: es lo único que
       convierte dos efectos en un solo fenómeno */
    const d = azr(0.8, 4.2);
    setTimeout(() => son('trueno', cl(1.1 - d/5, 0.25, 1)), d * 1000);
  }
  if (RAYO.t > 0){
    RAYO.t -= dt;
    const u = 1 - RAYO.t / RAYO.dur;
    /* DOS DESTELLOS Y NO UNO. Un relámpago casi nunca es un solo golpe de luz:
       es un golpe, un hueco corto y otro más flojo. Con uno solo se lee a que
       alguien apretó un interruptor. */
    const k = Math.max(Math.exp(-u*14) , Math.exp(-Math.abs(u-0.30)*26) * 0.62);
    rayoLuz.intensity = k * 2.6;
    $('rayo').style.opacity = (k * 0.30).toFixed(3);
    if (RAYO.t <= 0){ rayoLuz.intensity = 0; $('rayo').style.opacity = '0'; }
  }
}
