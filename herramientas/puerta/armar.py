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

assets = """
<script>
/* ═════════════════ LOS ASSETS DEL NIVEL 1, GENERADOS ═════════════════
   Cielo equirectangular, pasto y cuatro flores reales, todo de Rezona Lab y
   horneado con herramientas/puerta/. Van en su propio <script> a proposito:
   asi la parte del juego que uno lee no empieza con medio mega de base64. */
window.__PB_CIELO = '%s';
%s%s</script>
""" % (cielo_b64, pasto_js, flores_js)

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
      return { llamadas: i.calls, triangulos: i.triangles, empezado: levelStarted,
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

io.open(SAL, 'w', encoding='utf8').write(s)
print('%s  %d -> %d bytes' % (SAL, n0, len(s)))
