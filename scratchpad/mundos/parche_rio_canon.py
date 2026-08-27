#!/usr/bin/env python3
"""EL RIO DEL CAÑON. Faltaba, y su propio guion habla de el todo el tiempo.

El subtitulo del mundo es «el cañon rojo · bajar al rio y encontrar el paso». Los
personajes hablan de el: «nunca vi el rio tan alto en el septimo mes», «el rio sube
de noche y baja al mediodia», «este año el rio se comio el escalon de abajo». Y el
rio NO EXISTIA: la unica agua del mundo era la poza del pozo, que aparece en el
capitulo 5. El fondo de la garganta era roca seca — y encima estaba tapado por la
falda del horizonte, asi que ni se veia.

Ahora existe, con el agua de PANTANO y la paleta que se pidio: MARRON DE BARRO en
la orilla, porque un rio de cañon rojo arrastra tierra, y verde oscuro en el hondo.

COMO SE CONSTRUYE, y por que asi:

  · EL CAUCE SALE DEL TERRENO, no de una curva a mano. La garganta se talla sobre
    `eje = .78x + .62z`, asi que el rio va por `eje = 0`: la direccion es la
    perpendicular al gradiente, normalizada. Si mañana se mueve el cañon, el rio se
    mueve con el.
  · EL NIVEL DEL AGUA se mide: a lo largo del eje se busca el fondo mas bajo en una
    ventana y se le suma 1,35 m; despues se SUAVIZA tres veces, porque un rio no
    escalona cada ocho metros. Con un plano plano de punta a punta el agua salia por
    encima de la roca en la mitad del recorrido: la garganta no es horizontal.
  · LA PROFUNDIDAD VA EN UN ATRIBUTO POR VERTICE, calculada al armar: nivel menos
    terreno, partido 2,6. De ahi salen las tres cosas que hacen que se vea como
    agua y no como una calcomania: el color de barro en el bajio, la ola que se
    aplana al llegar a la orilla, y el alfa que se desvanece en la ribera en vez de
    cortar con el canto del poligono.
  · LA MALLA SE ARMA EN COORDENADAS DE MUNDO, sin rotaciones. Un PlaneGeometry
    girado dos veces —una para acostarlo y otra para orientarlo al eje— vuelve
    ilegible que eje es cual dentro del sombreador; asi, `position.xz` ES el mundo.
  · Y EL ESPEJO ELIGE. El mundo ya tenia un Reflector para la poza del pozo, y una
    segunda pasada de render entera no se paga dos veces: el mismo espejo se pone
    en la superficie del agua MAS CERCANA, sea la poza o el rio. En el rio ademas
    viaja con el jugador, porque el rio cruza el mapa entero.

No bloquea el paso a proposito: la huella acaba de quedar caminable de punta a
punta y meter una pared de agua en el fondo de la garganta la volveria a cortar.
"""
import pathlib, re, sys

p = pathlib.Path('/home/user/mundos/assets/mundos/canon.html')
s = p.read_text(encoding='utf-8')
o = s
err = []

RIO = r"""
/* ======================== EL RIO DEL FONDO DE LA GARGANTA ===================
   El guion de este mundo habla del rio todo el tiempo —«bajar al rio y encontrar
   el paso», «el rio sube de noche y baja al mediodia», «este año el rio se comio
   el escalon de abajo»— y el rio no existia: la unica agua era la poza del pozo,
   que aparece en el capitulo 5. El fondo de la garganta era roca seca.

   EL CAUCE SALE DEL TERRENO. La garganta se talla sobre `eje = .78x + .62z`, asi
   que el rio va por `eje = 0` y su direccion es la perpendicular al gradiente,
   normalizada: si mañana se mueve el cañon, el rio se mueve con el.

   LA MALLA SE ARMA EN COORDENADAS DE MUNDO, sin rotaciones. Un plano girado dos
   veces —una para acostarlo, otra para orientarlo al eje— vuelve ilegible que eje
   es cual dentro del sombreador; asi `position.xz` ES el mundo. */
const RIO = (() => {
  const gl = Math.hypot(.78, .62);
  const ux = .62 / gl, uz = -.78 / gl;     /* a lo largo del cauce */
  const nx = .78 / gl, nz = .62 / gl;      /* de orilla a orilla */
  const LAR = 1300, ANC = 38, NL = 150, NA = 8;

  /* EL NIVEL SE MIDE. Con un plano horizontal de punta a punta el agua salia por
     encima de la roca en medio recorrido: la garganta no es horizontal. Se busca
     el fondo mas bajo en una ventana y se le suma 1,35 m. */
  const NIV = new Float32Array(NL + 1);
  for (let i = 0; i <= NL; i++){
    const t = (i / NL - .5) * LAR;
    let m = 1e9;
    for (let d = -16; d <= 16; d += 8)
      for (let sv = -12; sv <= 12; sv += 6)
        m = Math.min(m, H(ux * (t + d) + nx * sv, uz * (t + d) + nz * sv));
    NIV[i] = m + 1.35;
  }
  /* y se SUAVIZA: un rio no escalona cada ocho metros */
  for (let k = 0; k < 4; k++)
    for (let i = 1; i < NL; i++) NIV[i] = (NIV[i - 1] + NIV[i] * 2 + NIV[i + 1]) * .25;

  const V = [], PR = [], IX = [];
  for (let i = 0; i <= NL; i++){
    const t = (i / NL - .5) * LAR;
    for (let j = 0; j <= NA; j++){
      const sv = (j / NA - .5) * ANC;
      const x = ux * t + nx * sv, z = uz * t + nz * sv;
      V.push(x, NIV[i], z);
      /* PROFUNDIDAD POR VERTICE: de aca salen el color de barro del bajio, la ola
         que se aplana en la orilla y el alfa que se desvanece en la ribera. */
      PR.push(cl((NIV[i] - H(x, z)) / 2.6, 0, 1));
    }
  }
  for (let i = 0; i < NL; i++)
    for (let j = 0; j < NA; j++){
      const a = i * (NA + 1) + j, b = a + NA + 1;
      IX.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(V, 3));
  g.setAttribute('aProf', new T.Float32BufferAttribute(PR, 1));
  g.setIndex(IX);
  g.computeVertexNormals();

  const RU = { value: 0 };
  /* MARRON DE BARRO en la orilla —un rio de cañon rojo arrastra tierra— y verde
     oscuro en el hondo, que es el «pozo verde» del guion. */
  const mat = new T.MeshStandardMaterial({ color: 0x14251b, roughness: .22,
    metalness: .6, transparent: true, opacity: .95, envMapIntensity: .5 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = RU;
    sh.uniforms.tOla = { value: TX.agua };
    mat.userData.sh = sh;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uT;attribute float aProf;varying vec2 vWp;varying float vD;varying float vProf;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vWp = position.xz;
        vProf = aProf;
        /* dominio deformado: las crestas serpentean en vez de ser rectas */
        vec2 pw = position.xz + vec2(sin(position.z * .13 + uT * .31),
                                     cos(position.x * .11 - uT * .24)) * 3.2;
        float hh = sin(pw.x * .36 + uT * 1.15) * .34
                 + cos(pw.y * .31 - uT * .92) * .27
                 + sin((pw.x + pw.y) * .68 + uT * 1.7) * .16;
        transformed.y += hh * .085 * smoothstep(0.0, 0.35, vProf);
        vD = -(modelViewMatrix * vec4(transformed, 1.0)).z;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uT;uniform sampler2D tOla;varying vec2 vWp;varying float vD;varying float vProf;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 aguaG;
        {
          float lejos = clamp(1.0 - vD / 190.0, .35, 1.0);
          vec2 uvA = vWp * .075 + vec2(uT * .022,  uT * .016);
          vec2 uvB = vWp * .24  + vec2(-uT * .034, uT * .028);
          vec2 uvC = vWp * .66  + vec2(uT * .052, -uT * .041);
          float e2 = .02;
          float n1 = texture2D(tOla, uvA).r, n2 = texture2D(tOla, uvB).r, n3 = texture2D(tOla, uvC).r;
          aguaG = vec2(
            (texture2D(tOla, uvA + vec2(e2, 0.)).r - n1) * 2.2 +
            (texture2D(tOla, uvB + vec2(e2, 0.)).r - n2) * 2.7 +
            (texture2D(tOla, uvC + vec2(e2, 0.)).r - n3) * 1.6,
            (texture2D(tOla, uvA + vec2(0., e2)).r - n1) * 2.2 +
            (texture2D(tOla, uvB + vec2(0., e2)).r - n2) * 2.7 +
            (texture2D(tOla, uvC + vec2(0., e2)).r - n3) * 1.6) * lejos;
        }
        /* barro en la orilla -> verde hondo en el medio */
        diffuseColor.rgb = mix(vec3(.335, .215, .135), vec3(.075, .145, .105),
                               smoothstep(0.0, 0.58, vProf));
        /* la ribera se desvanece: nada de canto de poligono */
        diffuseColor.a *= smoothstep(0.0, 0.20, vProf);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        /* en el bajio hay barro y espuma, no espejo */
        roughnessFactor = mix(.88, roughnessFactor, smoothstep(0.0, 0.45, vProf));`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        normal = normalize(normal + vec3(aguaG.x, aguaG.y, 0.0));`);
  };
  const malla = new T.Mesh(g, mat);
  malla.frustumCulled = false;      /* cruza el mapa entero */
  malla.renderOrder = 1;
  scene.add(malla);

  /* la altura del agua donde estas, para que el espejo se apoye en ella */
  const nivelEn = (x, z) => {
    const t = x * ux + z * uz;
    const i = Math.round((t / LAR + .5) * NL);
    return NIV[Math.max(0, Math.min(NL, i))];
  };
  /* a que distancia del eje del cauce estas */
  const fuera = (x, z) => Math.abs(x * nx + z * nz);
  return { malla, mat, reloj: RU, nivelEn, fuera, ANC,
           tick: dt => { RU.value += dt; } };
})();
window.__RIO = RIO;
"""

# el rio se arma despues del terreno y de H, y antes del jugador
anc = "/* --------------------------- REMOLINOS DE ARENA ----------------------------"
if s.count(anc) == 1:
    s = s.replace(anc, RIO + '\n' + anc, 1)
else:
    err.append('el ancla de los remolinos aparece %d veces' % s.count(anc))

# el reloj de la ola, en el bucle
A = "    if (window.__AGUAU) window.__AGUAU.value += dt;"
B = ("    if (window.__AGUAU) window.__AGUAU.value += dt;\n"
     "    if (window.__RIO) window.__RIO.tick(dt);")
if s.count(A) == 1:
    s = s.replace(A, B, 1)
else:
    err.append('el reloj del agua aparece %d veces' % s.count(A))

# EL ESPEJO ELIGE: la poza o el rio, el que este mas cerca
A = """  ESPEJO.tick = () => {
    if (!ESPEJO.m) return;
    /* el espejo sigue al disco y solo se dibuja si el agua esta a la vista y
       cerca: de lejos la segunda pasada se paga sin que se note */
    ESPEJO.m.position.set(aguaMesh.position.x, aguaMesh.position.y - .04,
                          aguaMesh.position.z);
    const d = Math.hypot(px - aguaMesh.position.x, pz - aguaMesh.position.z);
    ESPEJO.m.visible = ESPEJO.on && aguaMesh.visible && d < ESPEJO.lejos;
  };"""
B = """  ESPEJO.tick = () => {
    if (!ESPEJO.m) return;
    /* EL ESPEJO ELIGE. Hay dos aguas —la poza del pozo y el rio del fondo— y una
       segunda pasada de render entera no se paga dos veces: el mismo espejo se
       apoya en la superficie MAS CERCANA. En el rio ademas viaja con el jugador,
       porque el rio cruza el mapa entero y su centro no dice nada.
       Y de lejos se apaga: la pasada se paga sin que se note. */
    const dPoza = aguaMesh.visible
      ? Math.hypot(px - aguaMesh.position.x, pz - aguaMesh.position.z) : 1e9;
    const R = window.__RIO;
    const dRio = R ? Math.max(0, R.fuera(px, pz) - R.ANC * .5) : 1e9;
    if (dRio < dPoza && dRio < ESPEJO.lejos){
      ESPEJO.m.position.set(px, R.nivelEn(px, pz) - .04, pz);
      ESPEJO.m.visible = ESPEJO.on;
    } else {
      ESPEJO.m.position.set(aguaMesh.position.x, aguaMesh.position.y - .04,
                            aguaMesh.position.z);
      ESPEJO.m.visible = ESPEJO.on && aguaMesh.visible && dPoza < ESPEJO.lejos;
    }
  };"""
if s.count(A) == 1:
    s = s.replace(A, B, 1)
else:
    err.append('el tick del espejo aparece %d veces' % s.count(A))

# un gancho de prueba
A = "  pozo(){ return { abierto: POZO.abierto,"
B = ("  rio(){ const R = window.__RIO; if (!R) return null;\n"
     "    return { nivel: +R.nivelEn(px, pz).toFixed(2), fuera: +R.fuera(px, pz).toFixed(1),\n"
     "      suelo: +H(px, pz).toFixed(2), tri: R.malla.geometry.index.count / 3,\n"
     "      espejo: window.__ESPEJO ? window.__ESPEJO.m.visible : null }; },\n"
     + A)
if s.count(A) == 1:
    s = s.replace(A, B, 1)
else:
    err.append('el gancho del pozo aparece %d veces' % s.count(A))

if err:
    print('\n'.join('  !! ' + e for e in err)); sys.exit(1)
p.write_text(s, encoding='utf-8')
print('  canon: el rio del fondo de la garganta (%+d bytes)' % (len(s) - len(o)))
