# -*- coding: utf-8 -*-
"""El lado del juego de las texturas PBR: derivar, escalar y aplicar.

LO QUE VIAJA EN EL HTML ES UNA FOTO POR TEXTURA Y NADA MAS. El relieve y la
rugosidad se derivan de ella EN EL NAVEGADOR, que es la tuberia que este repo ya
tenia en Campo de Tiro y en BARRIO. Dos razones, y la segunda es la que importa:
pedir los mapas como imagenes aparte serian cuarenta y seis descargas mas, y
sobre todo habria relieve que no cuadra con lo que se ve — derivado de la MISMA
imagen, cuadra por construccion.

Y LA ESCALA SE MIDE, NO SE COPIA. Es la regla 6 del horneado: para cada material
se calcula cuantos metros cubre un mosaico —area del triangulo en el mundo sobre
su area en UV, dividido por la repeticion— y la repeticion nueva sale de que ese
numero pase a ser los metros que la foto de verdad muestra.

LA UNIDAD ES EL MATERIAL, Y ESO COSTO DOS MEDICIONES. Primero agrupe por NOMBRE:
`biblio_wall` es a la vez la pared (clon a 9x1,4) y EL CIELORRASO (1x1 estirado
sobre 61 metros), asi que la mediana de los dos juntos le daba al cielorraso
media baldosa sobre sesenta metros — peor que el lienzo que venia a reemplazar.
Agrupando por TEXTURA seguia mal: `biblio_carpet` es la misma textura en una
alfombra de 16x12 m y en EL VESTIDO DE LA MUNECA, que mide centimetros. Un
material, en cambio, se usa para una sola clase de superficie.
"""

JS = r"""
  // ==================================================================
  // TEXTURAS PBR: la foto, el relieve derivado y la escala medida
  // ==================================================================
  const PB_PBR_USOS = {};     // nombre -> [{mat, ranura, tex, acc, mpm, esc}]
  const PB_PBR_TEX = {};      // nombre -> [texturas procedurales distintas]
  const PB_PBR_INFO = {};     // nombre -> {lin, tinte, rMedia}
  let pbPbrPuestas = 0, pbPbrFallos = 0, pbPbrSueltas = 0, pbPbrSueltasMb = 0, pbPbrFaltan = 0;

  // ---- una sola pasada por la escena, y de ahi sale todo ----
  function pbPbrJunta() {
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
    const _ab = new THREE.Vector3(), _ac = new THREE.Vector3(), _n = new THREE.Vector3();
    const porMat = new Map();   // material -> { ranura -> uso }
    scene.traverse(function (o) {
      if (!o.material) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const g = o.geometry, pos = g && g.attributes.position, uv = g && g.attributes.uv;
      ms.forEach(function (m) {
        if (!m) return;
        ['map', 'bumpMap', 'normalMap', 'roughnessMap'].forEach(function (ranura) {
          const t = m[ranura];
          if (!t || !t.userData || !t.userData.pbNombre) return;
          const nom = t.userData.pbNombre;
          if (!window.__PB_PBR || !window.__PB_PBR[nom]) return;
          let porRanura = porMat.get(m);
          if (!porRanura) { porRanura = {}; porMat.set(m, porRanura); }
          let u = porRanura[ranura];
          if (!u) {
            u = { mat: m, ranura: ranura, tex: t, acc: [] };
            porRanura[ranura] = u;
            (PB_PBR_USOS[nom] = PB_PBR_USOS[nom] || []).push(u);
            const lista = PB_PBR_TEX[nom] = PB_PBR_TEX[nom] || [];
            if (lista.indexOf(t) < 0) lista.push(t);
          }
          // los metros que cubre un mosaico, medidos sobre esta malla
          if (!pos || !uv || u.acc.length >= 48) return;
          o.updateWorldMatrix(true, false);
          const idx = g.index, tri = idx ? idx.count / 3 : pos.count / 3;
          for (let k = 0; k < Math.min(tri, 12); k++) {
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
            u.acc.push(Math.sqrt(areaW / areaU) / Math.max(t.repeat.x, 0.0001));
          }
        });
      });
    });
    Object.keys(PB_PBR_USOS).forEach(function (nom) {
      PB_PBR_USOS[nom].forEach(function (u) {
        const a = u.acc.sort(function (x, y) { return x - y; });
        u.mpm = a.length ? a[Math.floor(a.length / 2)] : null;
        u.acc = null;
      });
    });
    // y el promedio de color del lienzo EN LINEAL, que es lo que la regla 7
    // necesita: three.js multiplica map x color, asi que el color del material
    // es un TINTE sobre la imagen y cambiar la foto sin recalcularlo corre el
    // color de toda la superficie
    Object.keys(PB_PBR_TEX).forEach(function (nom) {
      const t = PB_PBR_TEX[nom][0];
      const inf = PB_PBR_INFO[nom] = PB_PBR_INFO[nom] || {};
      try {
        const cc = document.createElement('canvas');
        cc.width = cc.height = 48;
        const xx = cc.getContext('2d');
        xx.drawImage(t.image, 0, 0, 48, 48);
        const d = xx.getImageData(0, 0, 48, 48).data;
        let r = 0, g2 = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += Math.pow(d[i] / 255, 2.2);
          g2 += Math.pow(d[i + 1] / 255, 2.2);
          b += Math.pow(d[i + 2] / 255, 2.2);
        }
        const n = d.length / 4;
        inf.lin = [r / n, g2 / n, b / n];
      } catch (e) { inf.lin = null; }
    });
  }

  // ---- el relieve y la rugosidad, derivados de la propia foto ----
  // El gradiente ENVUELVE por los bordes: la textura se repite, asi que leer
  // clavado en el borde deja una linea de relieve falso en cada costura.
  function pbPbrDeriva(img, fNrm, cRug) {
    // A LA MITAD DE LADO, Y NO ES UN RECORTE A OJO: el relieve es la DERIVADA de
    // la luminancia, o sea un dato de baja frecuencia, y el juego dibuja a
    // resolucion reducida con el filtro de VHS encima. A la mitad cuesta la
    // cuarta parte de memoria de video y no se distingue.
    const w = Math.max(64, img.width >> 1), h = Math.max(64, img.height >> 1);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, w, h);
    const src = x.getImageData(0, 0, w, h).data;
    // LA ALTURA SE LEE EN LINEAL. En sRGB los oscuros pesan de mas y el relieve
    // sale con pozos donde solo hay una mancha de color.
    const L = new Float32Array(w * h);
    let media = 0;
    for (let i = 0, p = 0; i < src.length; i += 4, p++) {
      const v = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
      L[p] = Math.pow(v, 2.2);
      media += L[p];
    }
    media /= L.length;
    const nd = new Uint8ClampedArray(w * h * 4);
    const rd = new Uint8ClampedArray(w * h * 4);
    let rMedia = 0;
    for (let y = 0; y < h; y++) {
      const yA = ((y - 1 + h) % h) * w, yB = ((y + 1) % h) * w, y0 = y * w;
      for (let px = 0; px < w; px++) {
        const i = y0 + px;
        const dx = (L[y0 + ((px + 1) % w)] - L[y0 + ((px - 1 + w) % w)]) * fNrm * 6;
        const dy = (L[yB + px] - L[yA + px]) * fNrm * 6;
        const nl = Math.sqrt(dx * dx + dy * dy + 1);
        const j = i * 4;
        nd[j] = ((-dx / nl) * 0.5 + 0.5) * 255;
        nd[j + 1] = ((dy / nl) * 0.5 + 0.5) * 255;
        nd[j + 2] = ((1 / nl) * 0.5 + 0.5) * 255;
        nd[j + 3] = 255;
        // LA RUGOSIDAD NO PUEDE PASAR DE 1: three.js MULTIPLICA
        // `material.roughness` por el canal verde, asi que un mapa no puede
        // subir la rugosidad, solo bajarla. Va de 1-c a 1 y despues el escalar
        // del material se compensa por la media medida — sin eso, cada mapa
        // baja la rugosidad de TODOS los materiales que lo usan y se lleva
        // puesto el valor que cada uno tenia calibrado.
        const v = 1 - cRug * Math.max(0, Math.min(1, (L[i] - media) / Math.max(media, 0.02) * 0.5 + 0.5));
        rMedia += v;
        const g = v * 255;
        rd[j] = g; rd[j + 1] = g; rd[j + 2] = g; rd[j + 3] = 255;
      }
    }
    rMedia /= (w * h);
    function tex(datos) {
      const cc = document.createElement('canvas');
      cc.width = w; cc.height = h;
      cc.getContext('2d').putImageData(new ImageData(datos, w, h), 0, 0);
      const t = new THREE.CanvasTexture(cc);
      t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    }
    return { normal: tex(nd), rough: tex(rd), rMedia: rMedia };
  }

  // ---- y en un telefono la foto entra a la mitad de lado ----
  // EL PRECIO DE ESTAS FOTOS NO SON BYTES DE HTML SINO MEMORIA DE VIDEO: medido,
  // 32,3 MB en 40 texturas contra 77,1 en 112. Y eso es lo que de verdad mata
  // una pestaña en un telefono modesto — no una excepcion, el navegador la cierra
  // y no hay `try` que lo agarre. A la mitad de lado cuesta la CUARTA PARTE, y no
  // se ve: en el escalon bajo el juego dibuja a `postScale` 0,36 con tope de 320
  // px y el filtro de VHS encima.
  function pbPbrChica(img) {
    if (!LOW && location.search.indexOf('bajo') < 0) return img;
    const w = Math.max(64, img.width >> 1), h = Math.max(64, img.height >> 1);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c;
  }

  // ---- poner una foto ----
  function pbPbrPon(nom, img) {
    const d = window.__PB_PBR[nom];
    const usos = PB_PBR_USOS[nom];
    if (!d || !usos || !usos.length) return;
    const der = pbPbrDeriva(img, d.nrm, d.rug);
    const inf = PB_PBR_INFO[nom] || {};
    // el factor de tinte: promedio del lienzo dividido por el de la foto, EN
    // LINEAL, y topado en 1 porque un color por encima del blanco quema
    let f = [1, 1, 1];
    if (inf.lin) {
      f = [0, 1, 2].map(function (i) {
        return Math.min(1, inf.lin[i] / Math.max(d.lin[i], 0.002));
      });
    }
    inf.tinte = f; inf.rMedia = der.rMedia;
    // ── EL COLOR SE DEDUPLICA POR LA REPETICION QUE LE TOCA ──
    // `granja_metal` lo usan trece materiales con seis escalas distintas. Lo que
    // los distingue es la repeticion, no el material, y la repeticion se
    // cuantiza a pasos de 19 % —un escalon que el ojo no ve— asi que quedan un
    // punado en vez de uno por material.
    //
    // ── Y EL RELIEVE Y LA RUGOSIDAD NO SE CLONAN, PORQUE r128 TIENE UNA SOLA
    // TRANSFORMACION DE UV POR MATERIAL. Comprobado en el propio bundle: elige
    // el primero de map, specularMap, displacementMap, normalMap, bumpMap,
    // roughnessMap... y copia SU matriz en el uniform `uvTransform`, que usan
    // todos. O sea que con `map` puesto, la repeticion del mapa de normales no
    // la lee nadie: clonarlo por escala eran ciento y pico de subidas a la GPU
    // para mostrar dos imagenes. Van compartidos, y sale gratis que el relieve
    // cuadre con la foto — es la MISMA transformacion, no dos que hay que
    // mantener iguales.
    const porRep = new Map();
    const porRepNrm = new Map();
    const compensados = new Set();
    usos.forEach(function (u) {
      // LA ESCALA: la repeticion nueva sale de que los metros por mosaico
      // —medidos sobre las mallas de ESTE material— pasen a ser los que la foto
      // de verdad muestra. Topada, porque una medicion mala no puede producir
      // una repeticion de cinco mil.
      let esc = u.mpm ? u.mpm / d.m : 1;
      esc = Math.pow(2, Math.round(Math.log2(esc) * 4) / 4);   // pasos de 19 %
      esc = Math.max(0.05, Math.min(80, esc));
      u.esc = esc;
      const m = u.mat;
      const rx = u.tex.repeat.x * esc, ry = u.tex.repeat.y * esc;
      const clave = rx.toFixed(3) + '|' + ry.toFixed(3) + '|' +
                    u.tex.offset.x.toFixed(3) + '|' + u.tex.offset.y.toFixed(3);
      if (u.ranura === 'map') {
        let nt = porRep.get(clave);
        if (!nt) {
          nt = new THREE.Texture(pbPbrChica(img));
          nt.wrapS = nt.wrapT = THREE.MirroredRepeatWrapping;
          nt.repeat.set(rx, ry);
          nt.offset.copy(u.tex.offset);
          nt.anisotropy = renderer.capabilities.getMaxAnisotropy();
          if (THREE.sRGBEncoding) nt.encoding = THREE.sRGBEncoding;
          nt.needsUpdate = true;
          porRep.set(clave, nt);
        }
        m.map = nt;
        m.color.setRGB(Math.pow(Math.pow(m.color.r, 2.2) * f[0], 1 / 2.2),
                       Math.pow(Math.pow(m.color.g, 2.2) * f[1], 1 / 2.2),
                       Math.pow(Math.pow(m.color.b, 2.2) * f[2], 1 / 2.2));
      }
      // el bumpMap dibujado se va: un mapa de normales del mismo relieve dice
      // lo mismo y ademas dice para donde
      m.bumpMap = null;
      // SIN `map` el que manda la transformacion es el mapa de normales, asi
      // que ahi si hace falta uno por escala. Es el caso de la criatura, que no
      // tiene color de textura: `makeSkinMaps` devuelve relieve sobre un color
      // plano.
      let nn = der.normal, rr = der.rough;
      if (!m.map) {
        let par = porRepNrm.get(clave);
        if (!par) {
          const a = der.normal.clone(); a.repeat.set(rx, ry); a.offset.copy(u.tex.offset); a.needsUpdate = true;
          const b = der.rough.clone();  b.repeat.set(rx, ry); b.offset.copy(u.tex.offset); b.needsUpdate = true;
          par = { nrm: a, rug: b };
          porRepNrm.set(clave, par);
        }
        nn = par.nrm; rr = par.rug;
      }
      m.normalMap = nn;
      if (m.normalScale) m.normalScale.set(1, 1);
      // NO SE PISA UNA RUGOSIDAD QUE YA ESTABA. `makeSkinMaps` devuelve su
      // propio mapa de rugosidad calibrado sobre los materiales de la criatura;
      // reemplazarlo por uno derivado de otra imagen cambia algo que nadie pidio.
      if (m.roughness !== undefined && (!m.roughnessMap || m.roughnessMap === rr)) {
        m.roughnessMap = rr;
        // y el escalar se compensa por la media medida: el mapa MULTIPLICA, asi
        // que sin esto todo material que lo use pierde rugosidad de golpe
        if (!compensados.has(m)) {
          compensados.add(m);
          m.roughness = Math.min(1, m.roughness / Math.max(der.rMedia, 0.2));
        }
      }
      m.needsUpdate = true;
    });
    inf.texturas = porRep.size + porRepNrm.size * 2 + 2;
    inf.mats = usos.length;
    pbPbrPuestas++;
  }

  // ---- y el lienzo que ya no usa nadie se suelta ----
  // three.js NO LIBERA una textura porque deje de estar en un material: la
  // subida a la GPU vive hasta que alguien llama a dispose(). Sin esta pasada
  // los treinta lienzos siguen ocupando memoria de video para no dibujar nada.
  // Es segura POR CONSTRUCCION: se recorre la escena, se junta todo lo que
  // sigue referenciado —los seis sprites del campo, que no tienen foto, y
  // cualquier ranura que se decidio no pisar— y se suelta solo el resto.
  function pbPbrBarre() {
    const vivas = new Set();
    scene.traverse(function (o) {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        if (!m) return;
        ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap',
         'emissiveMap', 'alphaMap', 'aoMap', 'specularMap', 'displacementMap',
         'envMap', 'lightMap'].forEach(function (k) { if (m[k]) vivas.add(m[k]); });
      });
    });
    let n = 0, b = 0;
    Object.keys(PB_PROC).forEach(function (nom) {
      const t = PB_PROC[nom];
      if (!t || vivas.has(t)) return;
      if (t.image && t.image.width) b += t.image.width * t.image.height * 4 * 1.34;
      t.dispose();
      // y el lienzo tambien: son 256 a 512 px de RGBA en memoria del proceso
      // que ya no dibuja nadie
      if (t.image && t.image.width) { t.image.width = t.image.height = 1; }
      n++;
    });
    pbPbrSueltas = n;
    pbPbrSueltasMb = +(b / 1048576).toFixed(1);
    return n;
  }

  // ---- arranque: se juntan los usos y se piden las fotos ----
  // NO REEMPLAZAN NADA HASTA QUE LLEGAN: el juego nace con los lienzos
  // dibujados, que ya funcionan, y cada foto pisa lo suyo cuando decodifica.
  // Una que falle cuesta una superficie, no un nivel.
  function pbPbrArranca() {
    if (!window.__PB_PBR) return;
    // EL CONTROL ES EL MISMO BINARIO CON ESTA LINEA APAGADA. Comparar contra el
    // commit anterior mide dos cosas a la vez —los arreglos y las fotos— y
    // ademas ese HTML no tiene las sondas nuevas, asi que no se puede preguntar
    // lo mismo a los dos. Con `?nopbr` el juego se queda con sus lienzos.
    if (location.search.indexOf('nopbr') >= 0) return;
    pbPbrJunta();
    const nombres = Object.keys(window.__PB_PBR).filter(function (n) { return !!PB_PBR_USOS[n]; });
    pbPbrFaltan = nombres.length;
    // el barrido va cuando TERMINARON TODAS, y no por foto: una que falle deja
    // su lienzo en uso y hay que poder distinguirlo del que ya nadie mira
    function lista() { if (--pbPbrFaltan <= 0) pbPbrBarre(); }
    nombres.forEach(function (nom) {
      const img = new Image();
      img.onload = function () {
        try { pbPbrPon(nom, img); } catch (e) { pbPbrFallos++; console.error('[pbr]', nom, e); }
        lista();
      };
      img.onerror = function () { pbPbrFallos++; lista(); };
      img.src = 'data:image/webp;base64,' + window.__PB_PBR[nom].b64;
    });
  }
"""
