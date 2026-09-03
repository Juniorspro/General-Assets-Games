#!/usr/bin/env python3
"""Arma juegos-pc/Puerta_Blanca.html desde base.html + los assets horneados.

    python3 herramientas/puerta/armar.py

LAS PARTES SON LA FUENTE Y EL HTML ES LA SALIDA. base.html es el juego tal como
llego; todo lo que agregamos vive aca y en assets/puerta/. Editar el HTML de
salida a mano es trabajo que el proximo armado pisa.

Cada parche lleva su ancla y un assert: si el dia de manana base.html cambia y
el ancla no esta, esto FALLA EN VOZ ALTA en vez de escribir un archivo a medias.
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
BASE = os.path.join(AQUI, 'base.html')
SAL = os.path.join(RAIZ, 'juegos-pc', 'Puerta_Blanca.html')
ASSETS = os.path.join(RAIZ, 'assets', 'puerta')

import base64

def b64(p):
    return base64.b64encode(io.open(p, 'rb').read()).decode('ascii')


def cambiar(s, viejo, nuevo, que):
    assert viejo in s, 'no esta el ancla de: ' + que
    assert s.count(viejo) == 1, 'el ancla de %s aparece %d veces' % (que, s.count(viejo))
    return s.replace(viejo, nuevo, 1)


s = io.open(BASE, encoding='utf8').read()
# UNA COPIA INTACTA PARA CORTAR BLOQUES ENTEROS. Los parches chicos se hacen con
# `cambiar(s, viejo, nuevo)`, que exige que el ancla sea unica; pero reemplazar
# los cien renglones de las flores o del pasto pide el texto EXACTO del original,
# y `s` ya viene con parches encima. Cortando de `base` el ancla es el original y
# el assert de `cambiar` sigue comprobando que ese bloque este una sola vez.
base = s
n0 = len(s)

# SOLO_SONDAS=1 arma el CONTROL: base.html con las sondas y nada mas. Sin esto no
# hay forma de medir cuanto costaba el nivel ANTES, porque el juego no exponia
# ninguna sonda — que es justamente por lo que hubo que agregarlas.
SOLO = os.environ.get('SOLO_SONDAS') == '1'
if SOLO:
    SAL = os.path.join(RAIZ, 'juegos-pc', '.control_puerta.html')

# ══════════════════════════════════════════════════════════════════════════════
# 1 · LOS ASSETS, ANTES DEL SCRIPT DEL JUEGO
# ══════════════════════════════════════════════════════════════════════════════
cielo_b64 = b64(os.path.join(ASSETS, 'cielo360.webp'))
pasto_js = io.open(os.path.join(ASSETS, 'pasto.js'), encoding='utf8').read()
flores_js = io.open(os.path.join(ASSETS, 'flores.js'), encoding='utf8').read()
n6_js = io.open(os.path.join(ASSETS, 'n6.js'), encoding='utf8').read()
pbr_js = io.open(os.path.join(ASSETS, 'pbr.js'), encoding='utf8').read()
campo_js = io.open(os.path.join(ASSETS, 'campo.js'), encoding='utf8').read()
audio_js = io.open(os.path.join(ASSETS, 'audio.js'), encoding='utf8').read()

assets = """
<script>
/* ═════════════════ LOS ASSETS DEL NIVEL 1, GENERADOS ═════════════════
   Cielo equirectangular, pasto y cuatro flores reales, todo de Rezona Lab y
   horneado con herramientas/puerta/. Van en su propio <script> a proposito:
   asi la parte del juego que uno lee no empieza con medio mega de base64. */
window.__PB_CIELO = '%s';
%s%s%s%s%s%s</script>
""" % (cielo_b64, pasto_js, flores_js, n6_js, pbr_js, campo_js, audio_js)

s = s if SOLO else cambiar(s, '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
            + assets, 'bloque de assets')

# ══════════════════════════════════════════════════════════════════════════════
# 2 · LECTOR DE GLB
# ══════════════════════════════════════════════════════════════════════════════
LECTOR = r"""
  // ==================================================================
  // Lector de GLB minimo
  // ==================================================================
  // NO se usa GLTFLoader a proposito: este juego depende de que llegue three y
  // de nada mas, y lo que hay que leer lo generamos nosotros — un nodo, una
  // malla y cuatro accesores. El cargador de three es otra descarga de un CDN
  // que puede no llegar.
  function pbGLB(b64) {
    const bin = atob(b64);
    const buf = new ArrayBuffer(bin.length);
    const u8 = new Uint8Array(buf);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('no es GLB');
    let off = 12, js = null, bn = null;
    const total = dv.getUint32(8, true);
    while (off < total) {
      const n = dv.getUint32(off, true), t = dv.getUint32(off + 4, true);
      if (t === 0x4E4F534A) js = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, n)));
      else bn = new Uint8Array(buf, off + 8, n);
      off += 8 + n + ((4 - n % 4) % 4);
    }
    const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
    const ARR = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
                  5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    function leer(i) {
      const a = js.accessors[i], v = js.bufferViews[a.bufferView];
      const A = ARR[a.componentType], c = COMP[a.type];
      const base = (v.byteOffset || 0) + (a.byteOffset || 0);
      return { datos: new A(bn.buffer, bn.byteOffset + base, a.count * c),
               comp: c, norm: A !== Float32Array };
    }
    const grupo = new THREE.Group();
    const nodos = js.nodes || [];
    function rec(i, padre) {
      const n = nodos[i], o = new THREE.Object3D();
      if (n.matrix) { o.matrix.fromArray(n.matrix); o.matrix.decompose(o.position, o.quaternion, o.scale); }
      else {
        if (n.translation) o.position.fromArray(n.translation);
        if (n.rotation) o.quaternion.fromArray(n.rotation);
        if (n.scale) o.scale.fromArray(n.scale);
      }
      padre.add(o);
      if (n.mesh !== undefined) {
        for (const pr of js.meshes[n.mesh].primitives) {
          const g = new THREE.BufferGeometry();
          const pos = leer(pr.attributes.POSITION);
          g.setAttribute('position', new THREE.BufferAttribute(pos.datos, 3));
          if (pr.attributes.NORMAL !== undefined) {
            g.setAttribute('normal', new THREE.BufferAttribute(leer(pr.attributes.NORMAL).datos, 3));
          }
          if (pr.attributes.COLOR_0 !== undefined) {
            // EL NUMERO DE COMPONENTES SALE DEL ACCESOR Y LA NORMALIZACION DE
            // QUE EL ARRAY NO SEA DE FLOATS. gltfpack devuelve COLOR_0 en VEC4
            // de bytes normalizados AUNQUE se le pase -noq; leido como tres
            // floats sin normalizar, la flor sale blanco puro con motas de
            // colores. Ni falla ni avisa.
            const c = leer(pr.attributes.COLOR_0);
            if (c.comp === 4) {
              const d = c.datos, k = c.norm ? (d instanceof Uint8Array ? 255 : 65535) : 1;
              const n3 = new Float32Array(d.length / 4 * 3);
              for (let j = 0, q = 0; j < d.length; j += 4) {
                n3[q++] = d[j] / k; n3[q++] = d[j + 1] / k; n3[q++] = d[j + 2] / k;
              }
              g.setAttribute('color', new THREE.BufferAttribute(n3, 3));
            } else {
              g.setAttribute('color', new THREE.BufferAttribute(c.datos, 3, c.norm));
            }
          }
          if (pr.indices !== undefined) g.setIndex(new THREE.BufferAttribute(leer(pr.indices).datos, 1));
          if (!g.attributes.normal) g.computeVertexNormals();
          o.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial()));
        }
      }
      (n.children || []).forEach((c) => rec(c, o));
    }
    (js.scenes[js.scene || 0].nodes).forEach((r) => rec(r, grupo));
    return grupo;
  }

  // Devuelve UNA geometria con la transformacion de los nodos ya horneada, que
  // es lo que hace falta para instanciarla: un InstancedMesh no puede llevar la
  // jerarquia del GLB adentro.
  function pbGeoDe(b64) {
    const g = pbGLB(b64);
    g.updateMatrixWorld(true);
    const mallas = [];
    g.traverse((o) => { if (o.isMesh) mallas.push(o); });
    if (!mallas.length) throw new Error('el GLB no trae mallas');
    const geo = mallas[0].geometry.clone();
    geo.applyMatrix4(mallas[0].matrixWorld);
    return geo;
  }
"""
s = s if SOLO else cambiar(s, '  // ==================================================================\n'
               '  // Sky dome + sun + clouds\n',
            LECTOR + '\n  // ==================================================================\n'
                     '  // Sky dome + sun + clouds\n', 'lector de GLB')

# ══════════════════════════════════════════════════════════════════════════════
# 3 · EL CIELO PASA A SER LA FOTO
# ══════════════════════════════════════════════════════════════════════════════
# El horizonte lo dice la propia foto (medido por hornear_cielo.py): con la
# niebla de otro color aparece una banda a la altura del horizonte, porque el
# suelo se funde a un gris y el cielo de arriba es otro.
s = s if SOLO else cambiar(s, "  const FOG_COLOR = 0xd3e2ea;",
            "  const FOG_COLOR = 0x97bcd9;   // medido sobre la panoramica: el color de su horizonte",
            'color de niebla')

s = s if SOLO else cambiar(s, """    uniforms: {
      uTop: { value: SKY_TOP },
      uHorizon: { value: SKY_HORIZON },
      uSunDir: { value: SUN_DIR },
      uSunColor: { value: new THREE.Color(0xfff0c4) }
    },""",
            """    uniforms: {
      uTop: { value: SKY_TOP },
      uHorizon: { value: SKY_HORIZON },
      uSunDir: { value: SUN_DIR },
      uSunColor: { value: new THREE.Color(0xfff0c4) },
      // LA FOTO NO REEMPLAZA AL DEGRADADO HASTA QUE LLEGA. Un data URI se
      // decodifica de forma asincronica, asi que el domo nace con el degradado
      // dibujado por codigo —que ya funcionaba— y la panoramica lo pisa cuando
      // decodifica. Si no decodifica, hay cielo igual.
      uTex: { value: null },
      uUsaTex: { value: 0 },
      // cuanto hay que girar la foto para que su parte mas brillante caiga
      // donde esta el sol que tira las sombras. Con el sol de la foto de un
      // lado y el de la escena del otro, la luz se contradice y eso se ve.
      uGiro: { value: 1.312 }
    },""", 'uniforms del cielo')

s = s if SOLO else cambiar(s, """      'uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor;',
      'varying vec3 vDir;',
      'void main(){',
      '  vec3 d = normalize(vDir);',
      '  float t = clamp(d.y * 1.25, 0.0, 1.0);',
      '  vec3 col = mix(uHorizon, uTop, pow(t, 0.7));',""",
            """      'uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor;',
      'uniform sampler2D uTex; uniform float uUsaTex; uniform float uGiro;',
      'varying vec3 vDir;',
      'void main(){',
      '  vec3 d = normalize(vDir);',
      '  float t = clamp(d.y * 1.25, 0.0, 1.0);',
      '  vec3 col = pow(mix(uHorizon, uTop, pow(t, 0.7)), vec3(2.2));',
      // La panoramica se muestrea POR DIRECCION y no por la UV de la esfera:
      // asi el mapeo no depende de como este partida la geometria del domo y,
      // sobre todo, se la puede girar con un uniform para alinear su sol.
      '  if (uUsaTex > 0.5) {',
      '    float u = atan(d.z, d.x) + uGiro;',
      '    u = fract(u * 0.15915494 + 0.5);',
      '    float v = clamp(0.5 - asin(clamp(d.y, -1.0, 1.0)) * 0.31830989, 0.0, 1.0);',
      // DE sRGB A LINEAL AL MUESTREAR. En un ShaderMaterial propio, texture2D
      // devuelve el texel CRUDO —three inyecta la conversion solo en sus
      // materiales— y mas abajo el encodings_fragment lo codifica a sRGB otra
      // vez: codificado dos veces, todo se va al blanco. Medido con el cielo
      // puesto: mirando 43 grados hacia arriba el cuadro daba (220,223,225),
      // gris, cuando el cenit de la panoramica es 0x2fb3ed.
      '    vec3 tx = texture2D(uTex, vec2(u, v)).rgb;',
      '    col = pow(tx, vec3(2.2));',
      '  }',""", 'shader del cielo')

# El brillo del sol se suma SOLO sobre el degradado: la foto ya trae el suyo, y
# dos soles en el mismo cielo se ven como dos soles.
s = s if SOLO else cambiar(s, """      '  col += uSunColor * pow(sd, 90.0) * 1.1;',
      '  col += uSunColor * pow(sd, 6.0) * 0.22;',""",
            """      '  float soloDeg = 1.0 - uUsaTex;',
      '  col += uSunColor * pow(sd, 90.0) * 1.1 * soloDeg;',
      '  col += uSunColor * pow(sd, 6.0) * 0.22 * soloDeg;',""", 'sol del cielo')

s = s if SOLO else cambiar(s, """      '  col = mix(col, uHorizon * 0.88, smoothstep(0.02, -0.25, d.y));',""",
            """      '  col = mix(col, uHorizon * 0.88, smoothstep(0.02, -0.25, d.y) * soloDeg);',""",
            'oscurecido bajo el horizonte')

# la carga de la panoramica, justo despues de crear el domo
s = s if SOLO else cambiar(s, """  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);""",
            """  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  if (window.__PB_CIELO) {
    const imgCielo = new Image();
    imgCielo.onload = function () {
      const t = new THREE.Texture(imgCielo);
      t.wrapS = THREE.RepeatWrapping;          // da la vuelta: la costura se
      t.wrapT = THREE.ClampToEdgeWrapping;     // coso en el horneado, en 0,00
      // flipY EN FALSE, Y ES LO QUE DECIDE SI EL CIELO ESTA AL DERECHO.
      // three sube la textura invertida por omision, asi que la fila 0 de la
      // imagen —que en una equirect ES EL CENIT— termina en v=1, y este shader
      // la busca en v=0. Medido con el defecto puesto: barriendo el cabeceo, el
      // azul BAJABA al mirar hacia arriba (azul-rojo 41 cerca del horizonte
      // contra 19 en lo alto) cuando en la propia imagen va de 65 a 188. O sea
      // que el cielo estaba dado vuelta: el horizonte palido arriba y el cenit
      // pegado al suelo.
      t.flipY = false;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      t.needsUpdate = true;
      skyMat.uniforms.uTex.value = t;
      skyMat.uniforms.uUsaTex.value = 1;
      skyMat.needsUpdate = true;
    };
    imgCielo.src = 'data:image/webp;base64,' + window.__PB_CIELO;
  }""", 'carga de la panoramica')

# ══════════════════════════════════════════════════════════════════════════════
# 4 · EL SUELO PASA A SER LA FOTO
# ══════════════════════════════════════════════════════════════════════════════
s = s if SOLO else cambiar(s, """  const ground = new THREE.Mesh(groundGeo, groundMat);""",
            """  // LA FOTO DE PASTO, con su escala contada y su tinte recalculado.
  // La repeticion no se copia del lienzo dibujado: sale de cuantos metros cubre
  // LA FOTO. Medido con la autocorrelacion de la imagen, la foto cubre ~0,5 m;
  // sobre los 360 m del terreno eso serian ~720 repeticiones, y pasados quince
  // metros el resultado es ruido sub-texel. El compromiso esta en PASTO_M, y lo
  // que sostiene el detalle cerca son las briznas 3D, que son geometria.
  const PASTO_M = 1.2;
  if (window.__PB_PASTO) {
    const imgPasto = new Image();
    imgPasto.onload = function () {
      const t = new THREE.Texture(imgPasto);
      // los dos bordes que se tocan pasan a ser EL MISMO borde, asi que no hay
      // costura posible; coserla a mano ensucia el centro, que es lo que mas se
      // mira
      t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
      const rep = (AREA_LIMIT * 2.4) / PASTO_M;
      t.repeat.set(rep, rep);
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      t.needsUpdate = true;
      groundMat.map = t;
      groundMat.bumpMap = t;
      if (window.__PB_PASTO_TINTE !== undefined) groundMat.color.setHex(window.__PB_PASTO_TINTE);
      groundMat.needsUpdate = true;
    };
    imgPasto.src = 'data:image/webp;base64,' + window.__PB_PASTO;
  }

  const ground = new THREE.Mesh(groundGeo, groundMat);""", 'foto de pasto')

# ══════════════════════════════════════════════════════════════════════════════
# 5 · LAS SONDAS
# ══════════════════════════════════════════════════════════════════════════════
# El juego no exponia ninguna. Sin esto no hay forma de afirmar que algo mejoro:
# una captura dice como se ve, no cuanto cuesta ni si la textura llego.
SONDAS = r"""
  // ==================================================================
  // Sondas para el banco de pruebas
  // ==================================================================
  window.__pb = {
    // OJO: renderer.info se pone a cero al empezar cada render(), asi que
    // leerlo despues del cuadro deja solo la ultima pasada. Con autoReset en
    // false se cuenta el cuadro entero, pasada de sombra incluida.
    est: function () {
      const i = renderer.info.render;
      return { llamadas: i.calls, triangulos: i.triangles, nivel: gameState, empezado: levelStarted,
                geometrias: renderer.info.memory.geometries,
                texturas: renderer.info.memory.textures };
    },
    // mueve la vista sin tocar el resto del estado
    ver: function (o) {
      if (o.x !== undefined) player.position.x = o.x;
      if (o.z !== undefined) player.position.z = o.z;
      if (o.yaw !== undefined) { yaw = o.yaw; player.rotation.y = yaw; }
      if (o.pitch !== undefined) { pitch = o.pitch; pitchObj.rotation.x = pitch; }
      renderer.render(scene, camera);
      return { x: +player.position.x.toFixed(2), z: +player.position.z.toFixed(2),
               yaw: +yaw.toFixed(3), pitch: +pitch.toFixed(3) };
    },
    cielo: function () {
      const u = skyMat.uniforms;
      const t = u.uTex.value;
      return { usaFoto: u.uUsaTex.value === 1,
               ancho: t && t.image ? t.image.width : 0,
               alto: t && t.image ? t.image.height : 0,
               giro: u.uGiro.value,
               nubesSprite: cloudGroup.visible ? clouds.length : 0,
               niebla: scene.fog ? '#' + scene.fog.color.getHexString() : 'sin' };
    },
    suelo: function () {
      const m = groundMat.map;
      return { foto: !!(m && m.image && m.image.width),
               ancho: m && m.image ? m.image.width : 0,
               repite: m ? +m.repeat.x.toFixed(1) : 0,
               tinte: '#' + groundMat.color.getHexString() };
    },
    // lee el bufer de verdad: una captura puede mentir por el CSS de encima,
    // esto no
    brillo: function (bandas) {
      const n = bandas || 5;
      const g = renderer.getContext();
      const w = g.drawingBufferWidth, h = g.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      renderer.render(scene, camera);
      g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, px);
      const out = [];
      for (let b = 0; b < n; b++) {
        // readPixels devuelve la primera fila ABAJO, asi que la banda 0 es la
        // de arriba de la pantalla si se recorre al reves
        const y0 = Math.floor(h * (n - 1 - b) / n), y1 = Math.floor(h * (n - b) / n);
        let r = 0, gg = 0, bb = 0, c = 0;
        for (let y = y0; y < y1; y += 2) for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4; r += px[i]; gg += px[i + 1]; bb += px[i + 2]; c++;
        }
        out.push({ r: Math.round(r / c), g: Math.round(gg / c), b: Math.round(bb / c) });
      }
      return out;
    },
    // para aislar a un sospechoso: apagar UNA cosa y volver a medir dice mas
    // que mirar la foto entera
    nubes: function (v) { cloudGroup.visible = !!v; return cloudGroup.visible; },
    flores: function () {
      return window.__pbFlores || { estado: 'no hay' };
    }
  };
  renderer.info.autoReset = false;
"""
s = cambiar(s, """  function animate() {
    requestAnimationFrame(animate);""",
            SONDAS + """
  function animate() {
    requestAnimationFrame(animate);
    renderer.info.reset();""", 'sondas')

# ══════════════════════════════════════════════════════════════════════════════
# 6 · LAS FLORES GIGANTES DE VERDAD
# ══════════════════════════════════════════════════════════════════════════════
GIGANTES = r"""
  // --- Flores gigantes: cuatro modelos generados, plantados sobre el campo ---
  // Las 240 flores instanciadas de mas arriba siguen estando: son el campo. Estas
  // son otra cosa —cuatro especies reales de cinco a once metros— y por eso van
  // aparte y en pocas unidades. Una instancia por especie: cuatro llamadas de
  // dibujo, haya seis o haya veinte.
  const GIG_ESPECIES = [
    { n: 'girasol',   alto: [7.5, 11.0] },
    { n: 'amapola',   alto: [5.5, 8.5] },
    { n: 'margarita', alto: [6.0, 9.0] },
    { n: 'tulipan',   alto: [5.0, 8.0] }
  ];
  const gigObstaculos = [];
  window.__pbFlores = { especies: 0, puestas: 0, triangulos: 0, errs: [] };

  (function plantarGigantes() {
    if (!window.__PB_FLORES) { window.__pbFlores.errs.push('no llegaron los assets'); return; }
    const N_POR = LOW ? 5 : 7;
    const usados = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const vp = new THREE.Vector3(), vs = new THREE.Vector3();

    GIG_ESPECIES.forEach(function (esp) {
      const b64 = window.__PB_FLORES[esp.n];
      if (!b64) { window.__pbFlores.errs.push('falta ' + esp.n); return; }
      let geo;
      // SI UNA FLOR NO DECODIFICA SE PIERDE ESA FLOR Y NO EL NIVEL. El campo ya
      // esta dibujado por codigo: esto se suma encima, no lo reemplaza.
      try { geo = pbGeoDe(b64); }
      catch (err) { window.__pbFlores.errs.push(esp.n + ': ' + err.message); return; }

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.78, metalness: 0.0,
        side: THREE.DoubleSide      // un petalo es una lamina: de canto no se ve
      });
      const im = new THREE.InstancedMesh(geo, mat, N_POR);
      im.castShadow = true;
      im.receiveShadow = false;
      im.frustumCulled = false;     // el centro de la instancia no es el de la flor

      let puestas = 0, guarda = 0;
      while (puestas < N_POR && guarda < N_POR * 60) {
        guarda++;
        const ang = Math.random() * Math.PI * 2;
        // ni encima del claro donde uno aparece ni encima de la puerta de salida,
        // que se materializa en el centro
        const r = 30 + Math.sqrt(Math.random()) * (AREA_LIMIT - 62);
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        let choca = false;
        for (let k = 0; k < usados.length; k++) {
          const dx = usados[k].x - x, dz = usados[k].z - z;
          if (dx * dx + dz * dz < 22 * 22) { choca = true; break; }
        }
        if (choca) continue;
        const alto = esp.alto[0] + Math.random() * (esp.alto[1] - esp.alto[0]);
        // el modelo viene de 1,0 de alto y con la base en y=0, asi que la escala
        // ES la altura en metros
        e.set(rand(-0.05, 0.05), Math.random() * Math.PI * 2, rand(-0.05, 0.05));
        q.setFromEuler(e);
        vp.set(x, terrainH(x, z) - 0.12, z);
        vs.set(alto, alto, alto);
        m4.compose(vp, q, vs);
        im.setMatrixAt(puestas, m4);
        const obs = { x: x, z: z, radius: 0.28 + alto * 0.022 };
        gigObstaculos.push(obs);
        (window.__pbFlores.pos || (window.__pbFlores.pos = [])).push(
          { esp: esp.n, x: +x.toFixed(1), z: +z.toFixed(1), alto: +alto.toFixed(1) });
        usados.push({ x: x, z: z });
        puestas++;
      }
      im.count = puestas;
      im.instanceMatrix.needsUpdate = true;
      fieldGroup.add(im);
      window.__pbFlores.especies++;
      window.__pbFlores.puestas += puestas;
      window.__pbFlores.triangulos += (geo.index ? geo.index.count / 3 : 0) * puestas;
    });
  })();
"""
s = s if SOLO else cambiar(s, '  // --- Exit door + beacon ---',
            GIGANTES + '\n  // --- Exit door + beacon ---', 'flores gigantes')

# LOS OBSTACULOS DE LAS GIGANTES SE VUELVEN A PONER CUANDO SE REARMA LA LISTA.
# applyFlowerDensity VACIA flowerObstacles y la rellena con las del campo; sin
# esto, cambiar la calidad en caliente hace que los tallos de once metros dejen
# de existir para el choque y se los pueda atravesar.
s = s if SOLO else cambiar(s, """      for (let i = 0; i < n && i < arr.length; i++) flowerObstacles.push(arr[i]);
    }
  }""",
            """      for (let i = 0; i < n && i < arr.length; i++) flowerObstacles.push(arr[i]);
    }
    if (typeof gigObstaculos !== 'undefined') {
      for (let i = 0; i < gigObstaculos.length; i++) flowerObstacles.push(gigObstaculos[i]);
    }
  }""", 'obstaculos de las gigantes')

# Y AL ARRANCAR EL NIVEL TAMBIEN, porque la lista se arma antes de que existan
s = s if SOLO else cambiar(s, "      obstacles = flowerObstacles;",
            """      obstacles = flowerObstacles;
      if (typeof gigObstaculos !== 'undefined') {
        for (let gi = 0; gi < gigObstaculos.length; gi++) {
          if (flowerObstacles.indexOf(gigObstaculos[gi]) < 0) flowerObstacles.push(gigObstaculos[gi]);
        }
      }""", 'obstaculos al arrancar')

# LAS NUBES DE SPRITE SE APAGAN EN EL CAMPO. Son manchas de un lienzo de 128 px
# puestas por delante de una panoramica fotografica: lo unico que aportan es
# lavarla. Medido apagandolas con la sonda: el cuadro no cambia de color, o sea
# que no estaban sumando nada visible, solo costando dibujo. Y quietas ademas
# van con el pedido de menos movimiento.
s = s if SOLO else cambiar(s, """      skyDome.visible = true;
      cloudGroup.visible = true;""",
            """      skyDome.visible = true;
      cloudGroup.visible = false;""", 'apagar nubes sprite')

# ══════════════════════════════════════════════════════════════════════════════
# 7 · EL NIVEL 6: EL LOCAL DE COMIDA RAPIDA Y LA ARANA
# ══════════════════════════════════════════════════════════════════════════════
sys.path.insert(0, AQUI)
import campo
import menu
import orden
import despertar
import sonido
import nivel6
import red

# la ficha del menu, despues del nivel 5
# LA FICHA DEL NIVEL 6 EN EL MENU YA NO VA: el selector de niveles se fue entero.

# el HUD y el aviso de atrapado, al lado de los otros
s = s if SOLO else cambiar(s, '    <div id="vhs-hud">',
            nivel6.HUD + nivel6.TRAP_DIV + '    <div id="vhs-hud">', 'HUD del nivel 6')

s = s if SOLO else cambiar(s, '  #vhs-hud {', nivel6.CSS + '\n  #vhs-hud {', 'CSS del nivel 6')

# el juego entero
s = s if SOLO else cambiar(s, '  // ==================================================================\n'
                              '  // Game state\n',
            nivel6.JS + '\n  // ==================================================================\n'
                        '  // Game state\n', 'nivel 6')

# ---- cableado ----
s = s if SOLO else cambiar(s, """  function hideAllLevels() {
    roomGroup.visible = false;""",
            """  function hideAllLevels() {
    storeGroup.visible = false;
    stHud.style.display = 'none';
    stTrap.style.display = 'none';
    roomGroup.visible = false;""", 'esconder el local')

# el local es interior: ni domo ni nubes, y una niebla corta que hace que el
# fondo de cada ambiente se pierda antes de la pared siguiente
s = s if SOLO else cambiar(s, """    } else if (mode === 'field') {
      scene.background = null;""",
            """    } else if (mode === 'store') {
      scene.background = new THREE.Color(0x05060a);
      scene.fog = new THREE.FogExp2(0x0a0c12, 0.030);
      setFieldLights(false);
      setRoomLights(false);
      setFarmLights(false);
      dunAmbient.visible = false;
      libAmbient.visible = false;
      schoolAmbient.visible = false;
      skyDome.visible = false;
      cloudGroup.visible = false;
    } else if (mode === 'field') {
      scene.background = null;""", 'entorno del local')

s = s if SOLO else cambiar(s, """      resetDungeon(true);
      if (n === 0) enterRoom();""",
            """      resetDungeon(true);
      resetStore(true);
      if (n === 0) enterRoom();""", 'reset del local al elegir nivel')

s = s if SOLO else cambiar(s, """      else if (n === 4) enterLibrary();
      else enterDungeon();""",
            """      else if (n === 4) enterLibrary();
      else if (n === 5) enterDungeon();
      else enterStore();""", 'entrar al nivel 6')

# LA PUERTA DEL CALABOZO YA NO TERMINA EL JUEGO: LLEVA AL LOCAL
s = s if SOLO else cambiar(s, """        transitioning = true;
        endTitle.innerHTML = '⛓️ Saliste del calabozo';
        endText.textContent = 'Encendiste las tres antorchas y cruzaste el portón con el verdugo pisándote los talones. Fin de esta versión de la demo.';
        transitionToEnd();
        return;""",
            """        transitioning = true;
        pbSiguiente();
        return;""", 'salida del calabozo al que toque')

s = s if SOLO else cambiar(s, """        else if (kind === 'exec' || kind === 'axe') resetDungeon();""",
            """        else if (kind === 'exec' || kind === 'axe') resetDungeon();
        else if (kind === 'spider') resetStore();""", 'reinicio tras el screamer')

s = s if SOLO else cambiar(s, """    } else if (gameState === 'dungeon') {
      player.position.y = 0;
      updateDungeonLogic(delta, elapsed);
    }""",
            """    } else if (gameState === 'dungeon') {
      player.position.y = 0;
      updateDungeonLogic(delta, elapsed);
    } else if (gameState === 'store') {
      player.position.y = 0;
      updateStoreLogic(delta, elapsed);
    }""", 'bucle del nivel 6')

s = s if SOLO else cambiar(s, """       gameState === 'library' || gameState === 'dungeon');""",
            """       gameState === 'library' || gameState === 'dungeon' || gameState === 'store');""",
            'correr en el local')

# PEGADO A LA TELA NO SE CAMINA, y va en el mismo sitio donde el juego ya frena
# al que esta escondido: dos maneras distintas de quedarse quieto terminan
# desincronizandose el dia que se toque una.
s = s if SOLO else cambiar(s, """    if (hiding) { rawLen = 0; inputX = 0; inputZ = 0; running = false; }""",
            """    const pegado = (gameState === 'store' && ST.atrapado > 0);
    if (hiding || pegado) { rawLen = 0; inputX = 0; inputZ = 0; running = false; }""",
            'no caminar pegado a la tela')

s = s if SOLO else cambiar(s, """      dunGroup.visible = false;
      dunHud.style.display = 'none';
      hideBtn.style.display = 'none';
      hideMask.style.display = 'none';
      hiding = null;
      hideCd = 0;""",
            """      dunGroup.visible = false;
      dunHud.style.display = 'none';
      storeGroup.visible = false;
      stHud.style.display = 'none';
      stTrap.style.display = 'none';
      hideBtn.style.display = 'none';
      hideMask.style.display = 'none';
      hiding = null;
      hideCd = 0;""", 'apagar el local al terminar')

# la sonda del nivel 6
s = cambiar(s, """    flores: function () {""",
            """    // fuerza el final del calabozo para poder PROBAR la cadena 5 -> 6 sin
    // encender las tres antorchas a mano. La salida del calabozo esta detras de
    // dunDone, asi que sin esto el enlace no se puede verificar y habria que
    // darlo por bueno leyendo el codigo.
    ganaCalabozo: function () { dunDone = true; return dunDone; },
    // por que NO salta el agarron: las tres condiciones que lo bloquean
    porQueNoAgarra: function () {
      return { grace: +ST.grace.toFixed(2), catchGuard: +catchGuard.toFixed(2),
               transitioning: transitioning, screamActivo: scream.active,
               d: +Math.hypot(player.position.x - ARA.g.position.x,
                              player.position.z - ARA.g.position.z).toFixed(2) };
    },
    local: function () {
      return { partes: ST_ORDEN.map(function (i) { return !!ST.tengo[i]; }),
               puestas: ST.puestas, hecho: ST.hecho,
               atrapado: +ST.atrapado.toFixed(2),
               telas: stTelas.length, telasUsadas: stTelas.filter(function (w) { return w.usada; }).length,
               arana: { estado: ARA.estado,
                        x: +ARA.g.position.x.toFixed(1), z: +ARA.g.position.z.toFixed(1),
                        d: +Math.hypot(player.position.x - ARA.g.position.x,
                                       player.position.z - ARA.g.position.z).toFixed(1),
                        vel: +ARA.vel.toFixed(2) },
               texturas: stTexPuestas };
    },
    // LA AUDITORIA DEL LOCAL. Prueba que se pueda JUGAR y no que las cajas no
    // se pisen: una rejilla de 20 cm, cada celda libre si el CENTRO del jugador
    // cabe ahi —fuera de toda caja inflada por su radio y de todo circulo— y un
    // relleno desde donde aparece. Si una parte no cae dentro del relleno, el
    // nivel no se puede terminar. Eso es exactamente lo que pasaba con el
    // corredor de 85 cm del bano contra un jugador de 84, y con las
    // estanterias del deposito: dos numeros que ninguna captura muestra.
    auditoria: function () {
      const R = 0.42, PASO = 0.2;
      const x0 = ST_BOUNDS.minX + R, x1 = ST_BOUNDS.maxX - R;
      const z0 = ST_BOUNDS.minZ + R, z1 = ST_BOUNDS.maxZ - R;
      const NX = Math.floor((x1 - x0) / PASO) + 1, NZ = Math.floor((z1 - z0) / PASO) + 1;
      function libre(x, z) {
        for (let i = 0; i < stBoxes.length; i++) {
          const b = stBoxes[i];
          if (x > b.minX - R && x < b.maxX + R && z > b.minZ - R && z < b.maxZ + R) return false;
        }
        for (let i = 0; i < stObs.length; i++) {
          const o = stObs[i], rr = o.radius + R;
          if ((x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) < rr * rr) return false;
        }
        return true;
      }
      const ok = new Uint8Array(NX * NZ), vis = new Uint8Array(NX * NZ);
      for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++)
        ok[i * NZ + j] = libre(x0 + i * PASO, z0 + j * PASO) ? 1 : 0;
      const si = Math.round((0 - x0) / PASO), sj = Math.round((-13 - z0) / PASO);
      const raiz = si * NZ + sj;
      if (!ok[raiz]) return { error: 'el jugador aparece dentro de un obstaculo' };
      const cola = [raiz]; vis[raiz] = 1; let alc = 1;
      const VEC = [[1,0],[-1,0],[0,1],[0,-1]];
      while (cola.length) {
        const c = cola.pop(), i = Math.floor(c / NZ), j = c % NZ;
        for (let k = 0; k < 4; k++) {
          const a = i + VEC[k][0], b = j + VEC[k][1];
          if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
          const d = a * NZ + b;
          if (vis[d] || !ok[d]) continue;
          vis[d] = 1; cola.push(d); alc++;
        }
      }
      function llega(x, z) {
        const ri = Math.round((x - x0) / PASO), rj = Math.round((z - z0) / PASO);
        const rad = Math.ceil(1.2 / PASO);
        for (let a = ri - rad; a <= ri + rad; a++) for (let b = rj - rad; b <= rj + rad; b++) {
          if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
          if (!vis[a * NZ + b]) continue;
          const dx = (x0 + a * PASO) - x, dz = (z0 + b * PASO) - z;
          if (dx * dx + dz * dz < 1.44) return true;
        }
        return false;
      }
      // Y CADA PARTE, ADEMAS, TIENE QUE VERSE: flota a 1,15 m, asi que una caja
      // que la contenga la vuelve invisible aunque se la pueda juntar de al lado.
      function dentro(x, z, y) {
        for (let i = 0; i < stBoxes.length; i++) {
          const b = stBoxes[i];
          if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && y > b.y0 && y < b.y1) {
            return +b.y1.toFixed(2);
          }
        }
        return 0;
      }
      const partes = {};
      stPartes.forEach(function (p) {
        partes[p.id] = { llega: llega(p.x, p.z), tapada: dentro(p.x, p.z, p.base) };
      });
      const arcos = [];
      ST_ARCOS.forEach(function (a) {
        const A = ST_NODOS[a[0]], B = ST_NODOS[a[1]];
        const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const pasos = Math.max(2, Math.ceil(L / 0.25));
        let alto = 0, donde = null;
        for (let k = 0; k <= pasos; k++) {
          const t = k / pasos, x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t;
          for (let i = 0; i < stBoxes.length; i++) {
            const b = stBoxes[i];
            if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && b.y1 > alto) {
              alto = b.y1; donde = [+x.toFixed(1), +z.toFixed(1)];
            }
          }
        }
        if (alto > 1.2) arcos.push({ arco: a, alto: +alto.toFixed(2), en: donde });
      });
      // Y EL GRAFO TIENE QUE SER CONEXO: si un nodo queda suelto, la tabla de
      // saltos devuelve el destino tal cual y la arana se va derecho hacia el,
      // atravesando lo que haya en el medio. Con veintiocho nodos y arcos
      // escritos a mano eso es un olvido de una linea.
      const alc2 = new Uint8Array(ST_NODOS.length); alc2[0] = 1;
      const cola2 = [0];
      for (let qi = 0; qi < cola2.length; qi++) {
        const nn = cola2[qi];
        for (let j = 0; j < ST_VEC[nn].length; j++) {
          if (!alc2[ST_VEC[nn][j]]) { alc2[ST_VEC[nn][j]] = 1; cola2.push(ST_VEC[nn][j]); }
        }
      }
      const nodosAislados = [];
      for (let i = 0; i < ST_NODOS.length; i++) if (!alc2[i]) nodosAislados.push(i);
      // y los nodos: uno metido dentro de un mueble hace que el BFS mande a la
      // arana a un sitio que no existe
      const nodosSucios = [];
      ST_NODOS.forEach(function (p, i) {
        const h = dentro(p[0], p[1], 1.5);
        if (h) nodosSucios.push({ nodo: i, alto: h });
      });
      // y DONDE quedan las celdas libres que el relleno no alcanza: un hueco
      // suelto es normal (el rincon detras de una estanteria), pero si son
      // muchas o caen en un ambiente entero es que falta un paso
      const sueltas = [];
      for (let i = 0; i < NX && sueltas.length < 8; i++)
        for (let j = 0; j < NZ && sueltas.length < 8; j++)
          if (ok[i * NZ + j] && !vis[i * NZ + j])
            sueltas.push([+(x0 + i * PASO).toFixed(1), +(z0 + j * PASO).toFixed(1)]);
      return { celdas: NX * NZ,
               libres: ok.reduce(function (a, v) { return a + v; }, 0),
               alcanzadas: alc, sueltas: sueltas, partes: partes,
               bandeja: llega(ST_BANDEJA.x, ST_BANDEJA.z),
               salida: llega(ST_SALIDA.x, ST_SALIDA.z),
               nodos: ST_NODOS.length, arcos: ST_ARCOS.length,
               arcosSucios: arcos, nodosSucios: nodosSucios,
               nodosAislados: nodosAislados, fusion: stFusion };
    },
    // EL INVENTARIO DE TEXTURAS PROCEDURALES, con LOS METROS QUE CUBRE CADA
    // MOSAICO medidos y no supuestos. Es la regla 6 del horneado: sin ese numero
    // una foto de ladrillo sale con hiladas de 22 cm y la pared se lee a casa de
    // munecas. Y no se puede deducir del codigo —depende de la geometria, de la
    // UV y de la repeticion a la vez— asi que se mide sobre las mallas que de
    // verdad la usan: area del triangulo en el mundo dividida por su area en UV
    // da metros por unidad de UV, y eso sobre la repeticion da metros por
    // mosaico. Devuelve tambien el promedio de color EN LINEAL, que es lo que la
    // regla 7 necesita para recalcular el tinte cuando entre la foto.
    texturas: function () {
      const acc = {};
      const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
      const _ab = new THREE.Vector3(), _ac = new THREE.Vector3(), _n = new THREE.Vector3();
      scene.traverse(function (o) {
        if (!o.isMesh || !o.geometry) return;
        const g = o.geometry, pos = g.attributes.position, uv = g.attributes.uv;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(function (m) {
          if (!m) return;
          ['map', 'bumpMap', 'normalMap', 'roughnessMap'].forEach(function (slot) {
            const t = m[slot];
            if (!t || !t.userData || !t.userData.pbNombre) return;
            const nom = t.userData.pbNombre;
            // SE AGRUPA POR (nombre · repeticion): el mismo lienzo con dos
            // repeticiones cubre metros distintos, y la mediana de los dos no
            // describe a ninguno de los dos.
            const clave = nom + '@' + (+t.repeat.x.toFixed(2)) + 'x' + (+t.repeat.y.toFixed(2));
            const A = acc[clave] || (acc[clave] = { nom: nom, mallas: 0, mats: 0, ranuras: {}, mpm: [],
                                               rep: [t.repeat.x, t.repeat.y],
                                               lienzo: t.image ? t.image.width : 0 });
            A.mats++; A.ranuras[slot] = (A.ranuras[slot] || 0) + 1;
            if (!pos || !uv || A.mpm.length >= 24) return;
            A.mallas++;
            o.updateWorldMatrix(true, false);
            const idx = g.index;
            const tri = idx ? idx.count / 3 : pos.count / 3;
            for (let k = 0; k < Math.min(tri, 40); k++) {
              const i0 = idx ? idx.getX(k * 3) : k * 3;
              const i1 = idx ? idx.getX(k * 3 + 1) : k * 3 + 1;
              const i2 = idx ? idx.getX(k * 3 + 2) : k * 3 + 2;
              _a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
              _b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
              _c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
              _ab.subVectors(_b, _a); _ac.subVectors(_c, _a);
              const areaW = 0.5 * _n.crossVectors(_ab, _ac).length();
              const u0 = uv.getX(i0), v0 = uv.getY(i0);
              const areaU = 0.5 * Math.abs((uv.getX(i1) - u0) * (uv.getY(i2) - v0) -
                                           (uv.getX(i2) - u0) * (uv.getY(i1) - v0));
              if (areaU < 1e-9 || areaW < 1e-9) continue;
              const mpu = Math.sqrt(areaW / areaU);
              const r = Math.max(t.repeat.x, 0.0001);
              A.mpm.push(mpu / r);
            }
          });
        });
      });
      // el promedio de color de cada lienzo, EN LINEAL
      Object.keys(PB_PROC).forEach(function (nom) {
        const t = PB_PROC[nom];
        const clave = nom + '@' + (+t.repeat.x.toFixed(2)) + 'x' + (+t.repeat.y.toFixed(2));
        const A = acc[clave] || (acc[clave] = { nom: nom, mallas: 0, mats: 0, ranuras: {}, mpm: [],
                                            rep: [t.repeat.x, t.repeat.y],
                                            lienzo: t.image ? t.image.width : 0 });
        try {
          const img = t.image;
          const cc = document.createElement('canvas');
          cc.width = cc.height = 48;
          const xx = cc.getContext('2d');
          xx.drawImage(img, 0, 0, 48, 48);
          const d = xx.getImageData(0, 0, 48, 48).data;
          let r = 0, g2 = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) {
            r += Math.pow(d[i] / 255, 2.2); g2 += Math.pow(d[i + 1] / 255, 2.2); b += Math.pow(d[i + 2] / 255, 2.2);
          }
          const nn = d.length / 4;
          A.lin = [+(r / nn).toFixed(4), +(g2 / nn).toFixed(4), +(b / nn).toFixed(4)];
        } catch (e) { A.lin = null; }
      });
      const out = {};
      Object.keys(acc).sort().forEach(function (k) {
        const A = acc[k];
        A.mpm.sort(function (x, y) { return x - y; });
        out[k] = { nom: A.nom, mats: A.mats, mallas: A.mallas, ranuras: A.ranuras,
                   rep: [+A.rep[0].toFixed(2), +A.rep[1].toFixed(2)], lienzo: A.lienzo,
                   metrosPorMosaico: A.mpm.length ? +A.mpm[Math.floor(A.mpm.length / 2)].toFixed(3) : null,
                   mpmMin: A.mpm.length ? +A.mpm[0].toFixed(3) : null,
                   mpmMax: A.mpm.length ? +A.mpm[A.mpm.length - 1].toFixed(3) : null,
                   lin: A.lin };
      });
      return out;
    },
    // LAS OCHO PATAS, UNA POR UNA: si es de adelante, donde tiene el pie y la
    // rodilla en el mundo, y donde cae el pie en el marco de la arana. Es la
    // unica forma de comprobar que el susto levanta LA MITAD DE ADELANTE y no
    // media arana de costado — con `(i % 4) < 2` levantaba las cuatro del lado
    // derecho y en movimiento eso no se distingue de una pose cualquiera.
    araPatas: function () {
      ARA.g.updateMatrixWorld(true);
      return ARA.patas.map(function (p, i) {
        const pie = new THREE.Vector3(3.2, 0, 0).applyMatrix4(p.tPiv.matrixWorld);
        const rod = new THREE.Vector3(0, 0, 0).applyMatrix4(p.tPiv.matrixWorld);
        const loc = ARA.g.worldToLocal(pie.clone());
        return { i: i, del: p.delantera, az: +p.az.toFixed(2),
                 pieY: +pie.y.toFixed(2), rodY: +rod.y.toFixed(2),
                 adel: +loc.z.toFixed(2), lado: +loc.x.toFixed(2),
                 lat: +Math.abs(loc.x).toFixed(2) };
      });
    },
    // QUE MIRA LA CAMARA DURANTE EL SUSTO. Los ojos viven en el +Z local y el
    // abdomen en el -Z, asi que alcanza con proyectar los dos: si el abdomen
    // esta mas cerca del lente que los ojos, la arana esta de espaldas y el
    // plano muestra la panza. Y de paso, donde caen los ojos en la pantalla.
    araFrente: function () {
      ARA.g.updateMatrixWorld(true);
      const pOjo = new THREE.Vector3(0, 1.80, 1.44).applyMatrix4(ARA.g.matrixWorld);
      const pAbd = new THREE.Vector3(0, 1.78, -1.25).applyMatrix4(ARA.g.matrixWorld);
      const cam = camera.matrixWorldInverse || new THREE.Matrix4().copy(camera.matrixWorld).invert();
      const vOjo = pOjo.clone().applyMatrix4(cam), vAbd = pAbd.clone().applyMatrix4(cam);
      const nOjo = pOjo.clone().project(camera);
      return { ojoCamZ: +vOjo.z.toFixed(2), abdCamZ: +vAbd.z.toFixed(2),
               deFrente: vOjo.z > vAbd.z,
               ojoPantalla: { x: +((nOjo.x + 1) / 2).toFixed(3), y: +((1 - nOjo.y) / 2).toFixed(3) } };
    },
    // pone al jugador donde haga falta para probar sin caminar veinte metros
    irA: function (x, z) { player.position.set(x, 0, z); return { x: x, z: z }; },
    arana: function (x, z) { ARA.g.position.set(x, ARA_Y, z); return 'ok'; },
    // ADELANTA EL RELOJ DE LA ARAÑA, que es la unica forma de MEDIR el tope de
    // telas. El banco dibuja por software y corre a la quinta parte del reloj de
    // pared: llegar al tope tejiendo cada 18-26 s son diez minutos de espera, y
    // una prueba que no se puede correr no prueba nada. Esto llama al mismo paso
    // que el bucle, con el mismo delta topado, asi que mide el juego y no una
    // maqueta.
    aranaAdelanta: function (segundos) {
      const dt = 0.05;
      const n = Math.min(20000, Math.round((segundos || 60) / dt));
      // y se cuenta CUANTO TIEMPO PASA EN RONDA, que es el unico momento en que
      // teje: si la arana esta en caza, el reloj del tejido no corre y el tope
      // no se alcanza nunca — sin este numero, "no llego al tope" no distingue
      // un tope que sobra de un tejido que no funciona
      let enRonda = 0, sitioMalo = 0, cerca = 0;
      for (let i = 0; i < n; i++) {
        araPaso(dt, i * dt);
        if (ARA.estado === 'ronda') {
          enRonda += dt;
          const d2 = Math.hypot(player.position.x - ARA.g.position.x,
                                player.position.z - ARA.g.position.z);
          if (d2 <= 7) cerca += dt;
          else if (!stSitioDeTela(ARA.g.position.x, ARA.g.position.z)) sitioMalo += dt;
        }
      }
      return { telas: stTelas.length, usadas: stTelas.filter(function (w) { return w.usada; }).length,
               estado: ARA.estado, tejeCd: +ARA.tejeCd.toFixed(1),
               sRonda: +enRonda.toFixed(1), sCaza: +((n * dt) - enRonda).toFixed(1),
               sCerca: +cerca.toFixed(1), sSitioMalo: +sitioMalo.toFixed(1) };
    },
    // GIGANTE ES UN NUMERO, no una impresion: la caja envolvente de la arana
    // con las patas abiertas, en metros
    // apaga los velos de VHS para fotografiar. NO cambia el juego: son cuatro
    // divs de CSS por encima del lienzo, y con el grano y el glitch puestos no
    // hay forma de juzgar si una cosa oscura se ve o no.
    limpio: function (v) {
      ['grade', 'vignette', 'vhs-hud', 'vhs-tracking'].forEach(function (id) {
        const e = document.getElementById(id);
        if (e) e.style.visibility = v ? 'hidden' : '';
      });
      // el glitch NO es CSS: sale de una pasada de post-proceso con su render
      // target. Sin apagarlo, media captura sale con la imagen partida en
      // bandas y no hay forma de juzgar si algo se ve.
      // UNA LINEA QUE CORRE TODOS LOS CUADROS GANA SIEMPRE CONTRA UNA QUE
      // CORRE UNA VEZ: apagarlo aca no alcanzaba porque updateTape se lo vuelve
      // a subir con la cercania de la entidad. Va una bandera que el bucle
      // respeta.
      window.__pbLimpio = !!v;
      if (v) { glitchT = 0; postU.uGlitch.value = 0; postU.uRoll.value = 0; postU.uDread.value = 0; }
      return !!v;
    },
    // el metodo que ya sirvio con las flores: apagar UNA cosa y contar cuantos
    // pixeles cambian dice si se ve; mirar la foto, no
    aranaVer: function (v) { ARA.g.visible = !!v; return ARA.g.visible; },
    aranaCaja: function () {
      ARA.g.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(ARA.g);
      return { ancho: +(b.max.x - b.min.x).toFixed(2),
               alto: +(b.max.y - b.min.y).toFixed(2),
               largo: +(b.max.z - b.min.z).toFixed(2),
               piso: +b.min.y.toFixed(2) };
    },
    flores: function () {""", 'sonda del local')



# ══════════════════════════════════════════════════════════════════════════════
# 8 · EL REGISTRO DE TEXTURAS PROCEDURALES
# ══════════════════════════════════════════════════════════════════════════════
# Cada lienzo dibujado por codigo lleva ahora su nombre en `userData`, y eso es
# lo unico que hace falta para que la foto lo encuentre despues: no hay que
# saber que material la usa ni donde se creo el material. `Texture.clone()`
# copia userData en r128, asi que las clonadas con otra repeticion —wallLong,
# libWallLong, dunWallLong— se reconocen igual.
s = s if SOLO else cambiar(s,
    """  // draws a shape 9 times (wrapped) so the tile is seamless""",
    """  const PB_PROC = {};
  function pbNombra(o, pre) {
    Object.keys(o).forEach(function (k) {
      const t = o[k];
      // `userData` NO SIEMPRE ESTA: la build minificada de r128 no lo inicializa
      // en el constructor de Texture, asi que asignar dentro tira. Se crea.
      if (t && t.isTexture) {
        if (!t.userData) t.userData = {};
        t.userData.pbNombre = pre + '_' + k;
        PB_PROC[pre + '_' + k] = t;
      }
    });
    return o;
  }

  // draws a shape 9 times (wrapped) so the tile is seamless""",
    'pbNombra')

import pbr
s = s if SOLO else cambiar(s,
    """  // draws a shape 9 times (wrapped) so the tile is seamless""",
    pbr.JS + """\n  // draws a shape 9 times (wrapped) so the tile is seamless""",
    'el modulo de texturas PBR')

for lit, pre, que in [
    ("""    wall: makeWallTexture()\n  };""", 'campo', 'campo'),
    ("""    rust: makeMetalTex('#6b4a33')\n  };""", 'granja', 'granja'),
    ("""    locker: makeLockerTex()\n  };""", 'escuela', 'escuela'),
    ("""    stone: makeStoneTex()\n  };""", 'biblio', 'biblioteca'),
]:
    s = s if SOLO else cambiar(s, lit, lit + "\n  pbNombra(%s, '%s');" % (
        {'campo':'TEX','granja':'FTEX','escuela':'STEX','biblio':'LTEX'}[pre], pre), 'nombrar ' + que)

# LAS CLONADAS NO HEREDAN `userData`. `Texture.copy` lo copia en la fuente de
# three.js, pero en esta build minificada de r128 no: medido, `escuela_wall`
# aparecia con CERO materiales porque las paredes largas usan `wallLong`, que es
# un clon, y el clon llegaba sin nombre. Se nombran las cuatro a mano.
s = s if SOLO else cambiar(s, """  wallShort.repeat.set(2, 1);""",
    """  wallShort.repeat.set(2, 1);
  wallLong.userData = { pbNombre: 'escuela_wall' };
  wallShort.userData = { pbNombre: 'escuela_wall' };""", 'nombrar los clones de la escuela')
s = s if SOLO else cambiar(s, """  libWallLong.repeat.set(9, 1.4);""",
    """  libWallLong.repeat.set(9, 1.4);
  libWallLong.userData = { pbNombre: 'biblio_wall' };""", 'nombrar el clon de la biblioteca')
s = s if SOLO else cambiar(s, """  dunWallLong.repeat.set(8, 1.1);""",
    """  dunWallLong.repeat.set(8, 1.1);
  dunWallLong.userData = { pbNombre: 'calabozo_wall' };""", 'nombrar el clon del calabozo')

s = s if SOLO else cambiar(s,
    """  const DTEX = { floor: makeFlagstoneTex(), wall: makeDunWallTex(), straw: makeStrawTex() };""",
    """  const DTEX = { floor: makeFlagstoneTex(), wall: makeDunWallTex(), straw: makeStrawTex() };
  pbNombra(DTEX, 'calabozo');""", 'nombrar calabozo')

s = s if SOLO else cambiar(s, """  const PORC = makePorcelainTex();""",
    """  const PORC = makePorcelainTex();
  pbNombra({ piel: PORC }, 'muneca');""", 'nombrar la muneca')
s = s if SOLO else cambiar(s, """  const NECRO = makeNecroticTex();""",
    """  const NECRO = makeNecroticTex();
  pbNombra({ piel: NECRO }, 'simio');""", 'nombrar el simio')
s = s if SOLO else cambiar(s, """  const BUTCHER = makeButcherSkinTex();""",
    """  const BUTCHER = makeButcherSkinTex();
  pbNombra({ piel: BUTCHER }, 'verdugo');""", 'nombrar el verdugo')
s = s if SOLO else cambiar(s, """  const HOODTEX = makeHoodTex();""",
    """  const HOODTEX = makeHoodTex();
  pbNombra({ tela: HOODTEX }, 'capucha');""", 'nombrar la capucha')
s = s if SOLO else cambiar(s, """  const SKIN = makeSkinMaps();""",
    """  const SKIN = makeSkinMaps();
  // la criatura no tiene mapa de color: makeSkinMaps devuelve relieve y
  // rugosidad sobre un color plano. Se nombra el relieve, que es el que una
  // foto de piel puede mejorar de verdad.
  pbNombra({ piel: SKIN.bump }, 'criatura');""", 'nombrar la criatura')


# ══════════════════════════════════════════════════════════════════════════════
# ARREGLOS DEL NIVEL 6 QUE VIVEN EN base.html
# ══════════════════════════════════════════════════════════════════════════════

# EL SCREAMER DE LA ARANA ENCUADRABA A LA CRIATURA DEL NIVEL 1. `kind` llega
# como 'spider' y no habia una sola rama que lo mirara, asi que caia al else:
# el plano del susto movia `entityGroup` —el bicho del campo— hasta la cara del
# jugador y lo posaba con poseEntity, mientras la arana se quedaba quieta donde
# te habia agarrado. El `scream.ref` que se le pasa no lo leia nadie.
s = s if SOLO else cambiar(s,
    """    const isExec = scream.kind === 'exec' || scream.kind === 'axe';
    const target = isExec ? execu.g : (isSaw ? doll.g : (isApe ? ape.g : (isWrap ? batman.g : (isBat ? scream.ref.g : (isDog ? dogGroup : entityGroup)))));""",
    """    const isExec = scream.kind === 'exec' || scream.kind === 'axe';
    const isSpider = scream.kind === 'spider';
    const target = isSpider ? ARA.g : (isExec ? execu.g : (isSaw ? doll.g : (isApe ? ape.g : (isWrap ? batman.g : (isBat ? scream.ref.g : (isDog ? dogGroup : entityGroup))))));""",
    'el screamer apunta a la arana')

# y su altura: terrainH() devuelve el relieve del CAMPO, y el local esta en y=0
s = s if SOLO else cambiar(s,
    """    const gy = (isWrap || isSaw || isApe || isExec) ? player.position.y
      : (isBat ? (player.position.y + 1.5) : (isDog ? 0 : terrainH(fx, fz)));""",
    """    const gy = isSpider ? 0 : ((isWrap || isSaw || isApe || isExec) ? player.position.y
      : (isBat ? (player.position.y + 1.5) : (isDog ? 0 : terrainH(fx, fz))));""",
    'la arana se apoya en el piso del local')


# LA DISTANCIA DEL PLANO: los otros seis sustos son cabezas humanas y se
# resuelven a ochenta centimetros. Fotografiada, la arana a esa distancia es un
# muro de bultos rosados —el abdomen mide 1,9 m de ancho y las patas 27 cm de
# grosor— y no se lee ni el cuerpo ni los colmillos. Con la caja envolvente en
# 6,7 x 3,2 x 6,3 m el plano tiene que abrirse: a 2,2 m entran la cara, los dos
# quelIceros y las cuatro patas de adelante levantandose por los bordes.
s = s if SOLO else cambiar(s,
    """    const dist = isWrap ? lerp(1.9, 0.5, Math.min(1, k * 1.5)) : lerp(2.3, 0.8, Math.min(1, k * 1.9));""",
    """    // 5,4 -> 3,05 Y NO 4,6 -> 2,2, y el motivo es una resta que costo dos
    // capturas: `dist` coloca el ORIGEN del grupo, y en los otros seis sustos
    // la cara esta a diez o veinte centimetros del origen. La de la arana esta
    // a 1,44 m —sus ocho ojos viven en z = +1,44 local— asi que con el origen a
    // 2,2 la cara terminaba a 76 CENTIMETROS del lente: medido con araFrente(),
    // ojoCamZ -0,87. Un racimo de ojos de 38 cm a esa distancia no se lee, tapa.
    // Con 3,05 la cara queda a 1,6 m, que es donde entra entera.
    const dist = isSpider ? lerp(5.4, 3.05, Math.min(1, k * 1.7))
      : (isWrap ? lerp(1.9, 0.5, Math.min(1, k * 1.5)) : lerp(2.3, 0.8, Math.min(1, k * 1.9)));""",
    'el plano de la arana se abre')
s = s if SOLO else cambiar(s,
    """      flashSpot.intensity = (Math.random() < 0.22 ? 2.5 : 8.5);
      flashFill.intensity = 1.4;
    } else {
      poseEntity(delta, elapsed * 3, { moving: true, speed: 8, frozen: false, lunge: true });""",
    """      flashSpot.intensity = (Math.random() < 0.22 ? 2.5 : 8.5);
      flashFill.intensity = 1.4;
    } else if (isSpider) {
      araGrito(k, elapsed);
      // 2,6 y no 7,5: el foco cuelga de la camara con decay 1,3, asi que lo que
      // esta a dos metros recibe tres veces y media mas que lo que esta a
      // cuatro. Medido en la captura, con la intensidad de los sustos humanos
      // la quitina salia BLANCO PURO y no se distinguia una pata de la panza.
      flashSpot.intensity = (Math.random() < 0.28 ? 0.5 : 1.1);
      flashFill.intensity = 0.25;
    } else {
      poseEntity(delta, elapsed * 3, { moving: true, speed: 8, frozen: false, lunge: true });""",
    'la pose de la arana en el screamer')

# la camara mira los quelIceros y no el piso: sus ojos viven en y=1,78 y con la
# EL CABECEO SE MIDE CONTRA LA CARA Y NO CONTRA EL ORIGEN. La cara de la arana
# esta 1,44 m mas cerca del lente que su grupo, asi que con `dist` el angulo
# salia casi la mitad de lo que hace falta y los ocho ojos quedaban por encima
# del centro del cuadro (medido: y 0,413 en vez de 0,50).
s = s if SOLO else cambiar(s,
    """    const want = Math.atan2(headY - (player.position.y + EYE_HEIGHT), Math.max(dist, 0.3));""",
    """    const distCara = isSpider ? Math.max(dist - 1.44, 0.5) : dist;
    const want = Math.atan2(headY - (player.position.y + EYE_HEIGHT), Math.max(distCara, 0.3));""",
    'el cabeceo del susto apunta a la cara')

# encabritada suben a 2,2
s = s if SOLO else cambiar(s,
    """    const headY = isExec ? (player.position.y + 2.2) : (isSaw ? (player.position.y + 2.5) : (isApe ? (player.position.y + 1.9)""",
    """    const headY = isSpider ? 2.2 : (isExec ? (player.position.y + 2.2) : (isSaw ? (player.position.y + 2.5) : (isApe ? (player.position.y + 1.9)""",
    'la camara del screamer mira la cara de la arana')

s = s if SOLO else cambiar(s,
    """      : (isWrap ? 2.35 : (isBat ? (player.position.y + 1.55) : (isDog ? 1.6 : 3.05)))));""",
    """      : (isWrap ? 2.35 : (isBat ? (player.position.y + 1.55) : (isDog ? 1.6 : 3.05))))));""",
    'cerrar el parentesis del headY')

# LA CERCANIA SE QUEDABA PUESTA AL TERMINAR EL JUEGO: nadie la baja, y el
# bucle deja de llamar a updateMovement en 'end' pero updateTape sigue
# corriendo, asi que la pantalla final heredaba el glitch del ultimo cuadro con
# la cosa encima. Es de todos los niveles, no solo del local.
s = s if SOLO else cambiar(s, """      arrowEl.style.display = 'none';
      distEl.style.display = 'none';
      staticEl.style.opacity = '0';
      vignetteEl.style.opacity = '0';""",
    """      arrowEl.style.display = 'none';
      distEl.style.display = 'none';
      staticEl.style.opacity = '0';
      entityProximity = 0;
      shakeAmount = 0;
      vignetteEl.style.opacity = '0';""", 'la pantalla final sin glitch heredado')

s = s if SOLO else cambiar(s, """  function updateTape(delta, elapsed) {
    glitchCd -= delta;""",
            """  function updateTape(delta, elapsed) {
    if (window.__pbLimpio) {
      postU.uGlitch.value = 0; postU.uRoll.value = 0; postU.uDread.value = 0;
      vhsTracking.style.opacity = '0';
      return;
    }
    glitchCd -= delta;""", 'apagar el post para medir')


# ══════════════════════════════════════════════════════════════════════════════
# 10 · EL CAMPO DEL NIVEL 1: FLORES, MARIPOSAS Y PASTO
# ══════════════════════════════════════════════════════════════════════════════

# LAS SEIS FOTOS DEL CAMPO NO PASAN POR LA TUBERIA PBR, y no es un olvido: esa
# tuberia mide cuantos metros cubre un mosaico y reescala la repeticion, y todo
# eso sale de que la textura SE REPITA. Un petalo no se repite —la foto se mapea
# una vez, u a lo ancho y v de la base a la punta— asi que reescalarla seria
# estirar el dibujo. Van en su propio blob y pisan el lienzo cuando decodifican.
s = s if SOLO else cambiar(s, """  const TEX = {
    grass: makeGrassTexture(),""",
    """  function pbCampoFoto(b64, nom, srgb) {
    // NACE CON EL LIENZO PUESTO Y LA FOTO LO PISA CUANDO LLEGA. Un data URI se
    // decodifica de forma asincronica, asi que un material que naciera esperando
    // la foto daria veinte cuadros en negro; y una que falle cuesta una
    // superficie, no el nivel.
    const t = new THREE.Texture();
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    if (srgb && THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    const im = new Image();
    im.onload = function () {
      t.image = im; t.needsUpdate = true;
      if (window.__pbCampoTex) window.__pbCampoTex.push(nom);
    };
    im.onerror = function () { if (window.__pbCampoErr) window.__pbCampoErr.push(nom); };
    im.src = 'data:image/webp;base64,' + b64;
    return t;
  }
  window.__pbCampoTex = [];
  window.__pbCampoErr = [];
  const CAMPO = window.__PB_CAMPO || null;

  const TEX = {
    grass: makeGrassTexture(),""", 'el cargador de las fotos del campo')

# y el intercambio: el lienzo queda de respaldo si la foto no llega
s = s if SOLO else cambiar(s, """    petal: makePetalTexture(),
    center: makeCenterTexture(),""",
    """    petal: (CAMPO && CAMPO.petal) ? pbCampoFoto(CAMPO.petal.b64, 'petal', true) : makePetalTexture(),
    petal2: (CAMPO && CAMPO.petal2) ? pbCampoFoto(CAMPO.petal2.b64, 'petal2', true) : makePetalTexture(),
    center: (CAMPO && CAMPO.center) ? pbCampoFoto(CAMPO.center.b64, 'center', true) : makeCenterTexture(),
    bfly: (CAMPO && CAMPO.bfly) ? CAMPO.bfly.map(function (b, i) {
      return pbCampoFoto(b, 'bfly' + i, true);
    }) : null,""", 'las fotos del petalo, el disco y las mariposas')

# ── la geometria del petalo, aparte de makePetalGeo ──
s = s if SOLO else cambiar(s, """  // Bends a cylinder into an organic curved stalk""",
    campo.PETALO + """
  // Bends a cylinder into an organic curved stalk""", 'makePetalGeo2')

# ── las tres especies reemplazan al modelo unico ──
i0 = base.index("  // --- Giant flowers: real procedural petals, instanced by part ---")
i1 = base.index("  const FLOWER_COUNT = Q.flowers;")
s = s if SOLO else cambiar(s, base[i0:i1],
    "  // --- Giant flowers: three procedural species, instanced by part ---\n"
    + campo.ESPECIES + campo.MATERIALES + "\n", 'las tres especies de flor')

# ── el plantado ──
i2 = base.index("  // hidden flowers must stop colliding, or you bump into thin air")
s = s if SOLO else cambiar(s, base[i1:i2], campo.PLANTADO + "\n", 'el plantado por manchones')

# ── el pasto ──
i3 = base.index("  // --- Grass: 3x3 instanced patches that follow the player ---")
i4 = base.index("  // --- Giant flowers: real procedural petals, instanced by part ---")
s = s if SOLO else cambiar(s, base[i3:i4], campo.PASTO + "\n", 'el pasto denso con anillo exterior')

# ── las mariposas ──
i5 = base.index("  // --- Butterflies ---")
i6 = base.index("  // --- Pickup bursts ---")
s = s if SOLO else cambiar(s, base[i5:i6], campo.MARIPOSAS + "\n", 'las mariposas con textura')

i7 = base.index("    // Butterflies\n    for (const b of butterflies) {")
i8 = base.index("    // Rainbow flowers: hue cycling, sparkles, pickup")
s = s if SOLO else cambiar(s, base[i7:i8], campo.VUELO.lstrip('\n') + "\n", 'el vuelo de las mariposas')

# ── los presupuestos ──
# EL PASTO SUBE MUCHO Y LAS FLORES NO. El pedido fue "pasto en mas cantidad", y
# la geometria nueva de las flores ya gasta menos triangulos por flor que la
# vieja —la margarita tiene 27 petalos de 20 triangulos donde antes habia 18 de
# 24, y el disco bajo de 246 a 224— asi que el presupuesto que se libera va al
# pasto, que es lo que se pidio.
s = s if SOLO else cambiar(s, """    flowers: LOW ? 170 : 240,
    bladesPerPatch: LOW ? 190 : 430,
    clouds: LOW ? 9 : 16,
    butterflies: LOW ? 6 : 12,""",
    """    flowers: LOW ? 170 : 240,
    bladesPerPatch: LOW ? 520 : 1150,
    bladesFar: LOW ? 130 : 300,
    clouds: LOW ? 9 : 16,
    butterflies: LOW ? 10 : 18,""", 'el presupuesto de pasto y mariposas')


# ══════════════════════════════════════════════════════════════════════════════
# 11 · LAS REDES CONTRA EL CRASHEO
# ══════════════════════════════════════════════════════════════════════════════

# EL AYUDANTE VA ARRIBA DE TODO EL MODULO, y eso es lo que hace que alcance con
# un parche. Las declaraciones `function` estan izadas con su cuerpo, asi que
# desde el primer renglon ya se las puede reasignar; y `addEventListener` captura
# el VALOR de la referencia al registrarse, asi que envolverlas antes de los
# veinticinco registros las cubre todas — incluido el proximo que se agregue.
s = s if SOLO else cambiar(s, """  const player = new THREE.Object3D();""",
    red.AYUDANTE + """
  const player = new THREE.Object3D();""", 'el ayudante de las redes')

# EL CUADRO BAJO RED, EN CUATRO PARCHES CHICOS
s = s if SOLO else cambiar(s, "  function animate() {", red.VIGIA + "\n  function animate() {", 'el vigia de NaN')
s = s if SOLO else cambiar(s, red.DELTA_VIEJO, red.DELTA, 'el delta comprobado')
s = s if SOLO else cambiar(s, red.CATCH_VIEJO, red.CATCH, 'el catch del bucle')
s = s if SOLO else cambiar(s, red.MEDIO_VIEJO, red.MEDIO, 'lo que estaba suelto entre los try')
s = s if SOLO else cambiar(s, red.FADE_VIEJO, red.FADE, 'el fundido de las transiciones')

# LA PERDIDA DE CONTEXTO SIN LAZO DE RECARGAS. Ancla literal y no un corte: las
# sondas viven ENTRE este listener y `function animate`, asi que cortar de uno a
# otro se las lleva puestas.
s = s if SOLO else cambiar(s, red.CTX_VIEJO, red.CONTEXTO.strip(), 'la perdida de contexto')

# `?bajo` ARRANCA EN CALIDAD BAJA. Es a donde recarga la perdida de contexto, y
# tambien sirve para que alguien con un telefono justo entre directo por ahi.
s = s if SOLO else cambiar(s, """  let quality = LOW ? 'media' : 'alta';""",
    """  let quality = (location.search.indexOf('bajo') >= 0) ? 'baja' : (LOW ? 'media' : 'alta');""",
    'el arranque en calidad baja')


# ══════════════════════════════════════════════════════════════════════════════
# 12 · EL MENU PRINCIPAL: EMPEZAR, CALIDAD E IDIOMA
# ══════════════════════════════════════════════════════════════════════════════
s = s if SOLO else cambiar(s, menu.VIEJO_SUB, menu.NUEVO_SUB, 'el subtitulo del menu')
s = s if SOLO else cambiar(s, menu.VIEJO_Q, menu.NUEVO_Q, 'empezar, calidad e idioma')
# el selector de niveles se va entero
j4 = s.index('      <div class="levels">')
j5 = s.index('      <button id="menu-play"')
s = s if SOLO else cambiar(s, s[j4:j5], '', 'sacar el selector de niveles')
s = s if SOLO else cambiar(s, '  #vhs-hud {', menu.CSS + '\n  #vhs-hud {', 'el CSS del menu')

# el idioma va DESPUES de `menuResume` —lo usa `pbPintaIdioma`— y antes del
# cableado, que necesita `startLevel` y `quality`
s = s if SOLO else cambiar(s, "  let levelStarted = false;",
    "  let levelStarted = false;" + menu.JS + orden.JS + despertar.JS + despertar.SALTA, 'el idioma, el orden y el despertar')
s = s if SOLO else cambiar(s, "  menuResume.addEventListener('click', closeMenu);",
    menu.WIRE + "  menuResume.addEventListener('click', closeMenu);", 'el cableado del menu')

# la lista de niveles ya no esta, asi que el listener que la recorria tampoco; y
# el atajo se muda a una sonda para que los quince planes del banco sigan
# pudiendo probar el nivel 6
s = s if SOLO else cambiar(s, """  Array.prototype.forEach.call(menuEl.querySelectorAll('.lv'), (el) => {
    el.addEventListener('click', () => { startLevel(parseInt(el.getAttribute('data-lv'), 10)); });
  });
""", '', 'sacar el listener de las fichas')

# la calidad elegida se marca
s = s if SOLO else cambiar(s, """    postCap = high ? 486 : (med ? 400 : 320);
    if (postReady) resizePost();""",
    """    postCap = high ? 486 : (med ? 400 : 320);
    if (postReady) resizePost();
    try { pbMarcaCalidad(); } catch (e) {}""", 'marcar la calidad elegida')

s = s if SOLO else cambiar(s, """  window.__pb = {""",
    """  window.__pb = {
    // EL ATAJO A UN NIVEL, que antes eran las fichas del menu. Sin esto los
    // planes del banco no pueden probar el nivel 6 y una prueba que no se puede
    // correr no prueba nada.
    nivel: function (n) { startLevel(n | 0); return n | 0; },
    // EL ORDEN SORTEADO, para poder comprobar que no se repite y que los seis
    // estan. `mezcla` sortea de nuevo y devuelve el orden nuevo.
    orden: function () { return { orden: PB_ORDEN.slice(), paso: pbPaso }; },
    mezcla: function () { return pbMezclaOrden(); },
    siguiente: function () { pbSiguiente(); return { paso: pbPaso, orden: PB_ORDEN.slice() }; },
    // DESPERTARSE. `desp(t)` congela la animacion en ese segundo para poder
    // fotografiarla; `desp()` sin numero devuelve el estado y la descongela.
    desp: function (t) {
      if (typeof t === 'number') { PB_DESP.fijo = true; PB_DESP.t = t; pbDespiertaPaso(0); }
      else PB_DESP.fijo = false;
      return { on: PB_DESP.on, t: +PB_DESP.t.toFixed(3), parp: +pbParpado(PB_DESP.t).toFixed(3),
               ojo: +pitchObj.position.y.toFixed(3), alabeo: +camera.rotation.z.toFixed(3),
               cabeceo: +pitchObj.rotation.x.toFixed(3),
               bandas: PB_PARP_A.style.height, habla: PB_HABLA.style.opacity,
               frase: PB_HABLA.textContent.slice(0, 40) };
    },
    // EL SONIDO. `audio()` dice cuantos decodificaron y que cama esta puesta;
    // `oye(n)` dispara uno y devuelve el nivel MEDIDO en el maestro.
    audio: function () {
      return { declarados: Object.keys(PB_SON_B).length, decodificados: pbSonListo,
               fallados: pbSonFalla, cama: PB_CAMA.nom, suena: !!PB_CAMA.src,
               nivel: pbSonNivel() };
    },
    oye: function (n) { const ok = pbSon(n, 1); return { sono: ok, nivel: pbSonNivel() }; },
    idioma: function (i) { if (i) { pbIdi = i; pbPintaIdioma(); } return pbIdi; },""",
    'la sonda de nivel e idioma')

# LA PANTALLA DE ARRANQUE SE VA: el menu es lo primero que se ve
s = s if SOLO else cambiar(s, menu.VIEJO_BOOT, '', 'sacar el marcado del boot')
s = s if SOLO else cambiar(s, menu.VIEJO_OPENBOOT, '', 'sacar openBoot y las fichas de calidad')
s = s if SOLO else cambiar(s, menu.VIEJO_QCARD_SEL, '', 'sacar el marcado de las fichas de calidad')
s = s if SOLO else cambiar(s, menu.VIEJO_BOOTEL, '', 'sacar la referencia al boot')
s = s if SOLO else cambiar(s, "  openBoot();", "  openMenu();", 'abrir el menu al arrancar')
s = s if SOLO else cambiar(s, menu.VIEJO_OPEN, menu.NUEVO_OPEN, 'empezar solo sin partida')

# LAS SEIS SALIDAS PASAN POR UNA SOLA PUERTA
for que, viejo, nvo in orden.SALIDAS:
    s = s if SOLO else cambiar(s, viejo, nvo, que)
s = s if SOLO else cambiar(s, orden.VIEJO_STORE, orden.NUEVO_STORE, 'la puerta de servicio del local')
s = s if SOLO else cambiar(s, orden.VIEJO_START, orden.NUEVO_START, 'el paso al saltar a un nivel')

# DESPERTARSE EN EL PISO
s = s if SOLO else cambiar(s, despertar.MARCA, despertar.MARCADO, 'el marcado de los parpados')
s = s if SOLO else cambiar(s, "  #vhs-hud {", despertar.CSS + "\n  #vhs-hud {", 'el CSS de despertarse')
s = s if SOLO else cambiar(s, despertar.VIEJO_ROOM, despertar.NUEVO_ROOM, 'arrancar la animacion en el cuarto')
s = s if SOLO else cambiar(s, despertar.VIEJO_LOOP, despertar.NUEVO_LOOP, 'el bucle mientras se despierta')

# LOS SONIDOS GENERADOS
s = s if SOLO else cambiar(s, "  function showToast(text, duration) {",
    sonido.JS + "\n  function showToast(text, duration) {", 'el modulo de sonido')

# las diez funciones de sonido intentan la muestra ANTES del oscilador
for firma, son, vol in sonido.MUESTRAS:
    viejo = "  function %s {" % firma
    s = s if SOLO else cambiar(s, viejo,
        viejo + "\n    if (pbSon('%s', %s)) return;   // la muestra manda; el oscilador es la red" % (son, vol),
        'la muestra de ' + son)

# las acciones, cada una en su disparador
for ancl, son, vol in sonido.ACCIONES:
    esp = ancl[:len(ancl) - len(ancl.lstrip())]
    s = s if SOLO else cambiar(s, ancl,
        "%spbSon('%s', %s);\n%s" % (esp, son, vol, ancl), 'el sonido de ' + son)

# LA CAMA DEL SITIO: se pide todos los cuadros y `pbCama` sale sola si no
# cambio. Va contra `gameState` y no contra `setEnvironment`, que agrupa
# ambientes de luz y no de sonido.
s = s if SOLO else cambiar(s, "    updateTape(delta, elapsedTime);",
    "    if (PB_CAMA_DE[gameState]) pbCama(PB_CAMA_DE[gameState]);\n    updateTape(delta, elapsedTime);",
    'la cama del sitio')

# LA PISADA VA ATADA A LA FASE DEL CABECEO: el mismo numero mueve la camara y
# dispara el sonido, asi que no se pueden desincronizar.
s = s if SOLO else cambiar(s, "    const bobRoll = Math.sin(bobTimer * 0.5) * bobAmp * 0.3;",
    "    const bobRoll = Math.sin(bobTimer * 0.5) * bobAmp * 0.3;\n    pbPasoSuena(bobTimer, isMoving && bobAmp > 0.012);",
    'la pisada')

# la puerta de cada nivel suena al cruzarla
s = s if SOLO else cambiar(s, "    fadeTo(() => { pbEntra(PB_ORDEN[pbPaso]); });",
    "    pbSon('a_puerta', 0.9);\n    fadeTo(() => { pbEntra(PB_ORDEN[pbPaso]); });", 'la puerta al pasar de nivel')

# LOS AVISOS PASAN POR LA TABLA: un solo parche cubre los cincuenta que hay
s = s if SOLO else cambiar(s, """  function showToast(text, duration) {
    toastEl.textContent = text;""",
    """  function showToast(text, duration) {
    toastEl.textContent = pbTrad(text);""", 'traducir los avisos')

# ══════════════════════════════════════════════════════════════════════════════
# 9 · EL ARRANQUE DE LAS TEXTURAS PBR, Y LA SONDA QUE LAS MIDE
# ══════════════════════════════════════════════════════════════════════════════
# VA JUSTO ANTES DE `animate()` Y NO ANTES. `pbPbrJunta()` recorre la escena una
# sola vez para averiguar que material usa cada lienzo y cuantos metros cubre un
# mosaico, asi que tiene que correr cuando los SIETE niveles ya estan
# construidos —los seis de base.html mas el local, que se arma en el cuerpo del
# modulo—. Llamado antes, la mitad de los materiales no existe todavia y esas
# superficies se quedarian con el lienzo para siempre, sin fallar.
s = s if SOLO else cambiar(s, """  animate();
})();""",
    """  pbPbrArranca();
  animate();
})();""", 'arrancar las texturas PBR')

s = s if SOLO else cambiar(s, """    flores: function () {""",
    """    // que llego de verdad: cuantas fotos se pusieron, con que repeticion
    // nueva, cuanto tinte y con que rugosidad efectiva. Sin esto, "las texturas
    // estan puestas" no se puede afirmar — un base64 que no decodifica deja la
    // superficie con su lienzo y no avisa.
    pbr: function () {
      const r = { puestas: pbPbrPuestas, fallos: pbPbrFallos, sueltas: pbPbrSueltas, sueltasMb: pbPbrSueltasMb,
                  declaradas: window.__PB_PBR ? Object.keys(window.__PB_PBR).length : 0,
                  lienzos: Object.keys(PB_PROC).length, tex: [] };
      Object.keys(PB_PBR_INFO).sort().forEach(function (n) {
        const i = PB_PBR_INFO[n], d = (window.__PB_PBR || {})[n] || {};
        const usos = PB_PBR_USOS[n] || [];
        // LAS ESCALAS QUE SALIERON, UNA POR GRUPO: una sola cifra por nombre
        // promedia superficies que no tienen nada que ver —la alfombra de la
        // biblioteca y el vestido de la muneca son la misma textura— y esa
        // media es exactamente el numero que ya dio dos respuestas malas.
        const g = {};
        usos.forEach(function (u) {
          const k = (u.esc || 0).toFixed(2);
          if (!g[k]) g[k] = { esc: +k, mats: 0, mpm: u.mpm ? +u.mpm.toFixed(3) : null,
                              rep0: +u.tex.repeat.x.toFixed(2),
                              rep: +(u.tex.repeat.x * (u.esc || 1)).toFixed(2) };
          g[k].mats++;
        });
        r.tex.push({ n: n, mats: usos.length, texGpu: i.texturas || 0, mFoto: d.m || null,
                     grupos: Object.keys(g).sort().map(function (k) { return g[k]; }),
                     tinte: i.tinte ? i.tinte.map(function (v) { return +v.toFixed(3); }) : null,
                     rMedia: i.rMedia ? +i.rMedia.toFixed(3) : null,
                     // `puesta` NO se puede juzgar por la ranura original: en la
                     // criatura era `bumpMap` y se anula a proposito. Lo que
                     // prueba que la foto entro es el mapa de normales derivado.
                     puesta: !!(usos[0] && usos[0].mat.normalMap) });
      });
      return r;
    },
    // EL CAMPO: que salio de verdad. Sin esto, "hay mas pasto" y "hay tres
    // especies" son dos frases: lo que se puede afirmar es cuantas briznas hay,
    // a que distancia llega la ultima, y cuantos manchones de cada especie.
    campo: function () {
      let briznas = 0, cerca = 0, lejos = 0, maxD = 0;
      grassPatches.forEach(function (p) {
        briznas += p.mesh.count;
        if (p.cel.lejos) lejos++; else cerca++;
        const d = Math.hypot(p.mesh.position.x - player.position.x,
                             p.mesh.position.z - player.position.z) + GRASS_CELL * 0.71;
        if (p.mesh.visible && d > maxD) maxD = d;
      });
      const porEsp = [0, 0, 0], triEsp = [], cerc = [null, null, null];
      const _mm = new THREE.Matrix4(), _v = new THREE.Vector3();
      flowerChunks.forEach(function (m) {
        const k = m[1].userData.esp;
        if (k === undefined) return;
        porEsp[k] += m[1].count;
        for (let i = 0; i < m[1].count; i++) {
          m[1].getMatrixAt(i, _mm);
          _v.setFromMatrixPosition(_mm).add(m[1].position);
          const d = Math.hypot(_v.x, _v.z);
          if (!cerc[k] || d < cerc[k].d) cerc[k] = { d: +d.toFixed(1), x: +_v.x.toFixed(1), z: +_v.z.toFixed(1) };
        }
      });
      FLOWER_SP.forEach(function (sp) {
        triEsp.push({ petalos: sp.petalGeo.index.count / 3, disco: sp.centerGeo.index.count / 3 });
      });
      return {
        briznas: briznas, parchesCerca: cerca, parchesLejos: lejos,
        alcance: +maxD.toFixed(1),
        flores: flowerChunks.length ? flowerChunks.reduce(function (a, m) { return a + m[1].count; }, 0) : 0,
        manchones: flowerChunks.length, porEspecie: porEsp,
        triangulosPorFlor: triEsp,
        triTallo: flowerStemGeo.index.count / 3,
        mariposas: butterflies.length,
        fotos: (window.__pbCampoTex || []).slice(), fallos: (window.__pbCampoErr || []).slice(),
        // la flor MAS CERCANA de cada especie, para poder fotografiar las tres
        cercanas: cerc,
        // y donde esta la mariposa mas cercana, con su tamaño EN PANTALLA: que
        // exista y que este en cuadro son dos cosas distintas, y ya costo una
        // vuelta en LEMI dar por bueno un bicho que se proyectaba detras de la
        // camara
        mariposa: (function () {
          let mej = null;
          butterflies.forEach(function (b) {
            const d = Math.hypot(b.g.position.x - player.position.x,
                                 b.g.position.z - player.position.z);
            if (!mej || d < mej.d) mej = { d: +d.toFixed(1), b: b };
          });
          if (!mej) return null;
          const p3 = mej.b.g.position;
          const v = p3.clone().project(camera);
          return { d: mej.d, x: +p3.x.toFixed(1), y: +p3.y.toFixed(2), z: +p3.z.toFixed(1),
                   pantalla: { x: +((v.x + 1) / 2).toFixed(3), y: +((1 - v.y) / 2).toFixed(3) },
                   delante: v.z < 1,
                   aleteo: +mej.b.pl.rotation.z.toFixed(2) };
        })()
      };
    },
    // LA MARIPOSA, PLANTADA DELANTE DE LA CAMARA Y MEDIDA EN PIXELES. Que se
    // proyecte dentro del rectangulo no prueba que se dibuje: ya costo una
    // vuelta en LEMI dar por bueno un camello que el frustum descartaba. Esta
    // mueve la mariposa a tres metros del ojo y devuelve la caja del ala en
    // fracciones de pantalla mas el estado del material.
    bfPrueba: function (d) {
      if (!butterflies.length) return null;
      const b = butterflies[0];
      const dd = d || 3;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      b.home.set(player.position.x + fx * dd, 0, player.position.z + fz * dd);
      b.rad = 0; b.hgt = EYE_HEIGHT;
      b.g.position.set(b.home.x, player.position.y + EYE_HEIGHT, b.home.z);
      b.pl.rotation.z = -0.62; b.pr.rotation.z = 0.62;   // la pose de reposo
      b.g.updateMatrixWorld(true);
      renderer.render(scene, camera);
      const ala = b.pr.children[0];
      const g = ala.geometry, pos = g.attributes.position;
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9, delante = true;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(ala.matrixWorld).project(camera);
        if (v.z >= 1) delante = false;
        x0 = Math.min(x0, (v.x + 1) / 2); x1 = Math.max(x1, (v.x + 1) / 2);
        y0 = Math.min(y0, (1 - v.y) / 2); y1 = Math.max(y1, (1 - v.y) / 2);
      }
      const m = ala.material;
      return { caja: { x: [+x0.toFixed(3), +x1.toFixed(3)], y: [+y0.toFixed(3), +y1.toFixed(3)] },
               delante: delante, visible: ala.visible && b.g.visible,
               mapa: !!(m.map && m.map.image && m.map.image.width),
               lado: m.map && m.map.image ? m.map.image.width : 0,
               alphaTest: m.alphaTest, transparente: m.transparent,
               escala: +b.g.scale.x.toFixed(2) };
    },
    // ROMPE ALGO A PROPOSITO. Una red sin probar no es una red: esto mete la
    // falla y despues se comprueba que el juego SIGUE JUGABLE, que es lo unico
    // que importa. 'cuadro' hace tirar updateTape una vez por cuadro —el caso
    // que dejaba la imagen congelada para siempre—, 'nan' mete un NaN en la
    // posicion, 'toque' hace tirar onTouchEnd —el dedo que no se suelta— y
    // 'nivel' hace tirar la construccion de un nivel.
    romper: function (que) {
      if (que === 'cuadro') { updateTape = function () { throw new Error('falla inyectada en el cuadro'); }; }
      else if (que === 'nan') { player.position.x = NaN; yaw = NaN; }
      else if (que === 'nanfijo') { pbSano.vale = false; player.position.set(NaN, NaN, NaN); }
      else if (que === 'toque') { onTouchEnd = function () { throw new Error('falla inyectada en el toque'); }; }
      else if (que === 'nivel') { hideAllLevels = function () { throw new Error('falla inyectada en el nivel'); }; }
      else if (que === 'contexto') {
        const ext = renderer.getContext().getExtension('WEBGL_lose_context');
        if (!ext) return 'no hay WEBGL_lose_context';
        ext.loseContext();
      } else return 'no se que es ' + que;
      return 'roto: ' + que;
    },
    // el estado de las redes: fallas atrapadas, NaN recuperados y si el juego
    // sigue dibujando
    red: function () {
      return { fallas: window.__pbFallas.slice(0, 8), nans: pbNaNs,
               errBucle: loopErrors, errRender: renderErrors,
               pausado: paused, llamadas: renderer.info.render.calls,
               sanoVale: pbSano.vale };
    },
    // LO QUE CUESTAN LAS FOTOS EN MEMORIA DE VIDEO, que es el precio real de
    // esta vuelta: no son bytes de HTML sino texturas subidas a la GPU.
    pbrMem: function () {
      const v = new Set(); let n = 0, b = 0;
      const R = function (t) {
        if (!t || v.has(t)) return; v.add(t);
        const im = t.image; if (!im || !im.width) return;
        n++; b += im.width * im.height * 4 * 1.34;   // 1,34 por los mipmaps
      };
      scene.traverse(function (o) {
        if (!o.material) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          if (!m) return;
          ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap',
           'emissiveMap', 'alphaMap', 'aoMap'].forEach(function (k) { R(m[k]); });
        });
      });
      return { texturas: n, mb: +(b / 1048576).toFixed(1) };
    },
    // el inventario de lienzos: cuales quedaron SIN foto y por que
    pbrSinFoto: function () {
      const falta = [];
      Object.keys(PB_PROC).forEach(function (n) {
        if (!window.__PB_PBR || !window.__PB_PBR[n]) falta.push(n + ' (no se genero)');
        else if (!PB_PBR_USOS[n]) falta.push(n + ' (ningun material la usa)');
      });
      return falta;
    },
    flores: function () {""", 'la sonda de las texturas PBR')

io.open(SAL, 'w', encoding='utf8').write(s)
print('%s  %d -> %d bytes' % (SAL, n0, len(s)))
