/* ══════════════════════════════════════════════════════════════════════════
   LAS TEXTURAS — los sprites generados y los tres suelos
   ══════════════════════════════════════════════════════════════════════════
   REGLA DE ESTE REPO: lo generado NO reemplaza nada hasta que llega. Todo
   nace con un lienzo dibujado por código y la foto lo pisa cuando decodifica.
   Un base64 que no decodifica cuesta una pieza, no una pantalla vacía.     */

const TEX = {};                    // clave -> THREE.Texture
const MAT_SPR = {};                // clave -> material de billboard
const MAT_SUELO = {};              // zona -> material del piso
let TEX_LISTAS = 0, TEX_FALLADAS = 0;

/* CUÁNTOS METROS CUBRE CADA FOTO DE SUELO. Sin esta cuenta el prado sale de
   casa de muñecas o de gigante, y es la regla 6 del horneado: la escala no se
   elige, se cuenta sobre la imagen. Estas tres se pidieron con el detalle a
   escala de "un metro y medio de suelo", así que ése es el número.          */
const SUELO_M = { s_bosque: 2.6, s_piedra: 2.2, s_ceniza: 3.0, s_pantano: 2.8, s_osario: 2.4 };
/* ── EL TINTE VA CASI EN BLANCO, Y ES LA REGLA 7 ─────────────────────────
   three.js multiplica `map × color`, así que el tinte del material es un tinte
   SOBRE la foto. Los tres anteriores —0x8f9a7e y compañía— se escribieron
   contra el lienzo de respaldo y valen 0,27 en lineal: multiplicados por una
   foto de bosque que mide 0,042, el suelo daba 0,011 y salía NEGRO (medido:
   9,4 sobre 255 en las tres franjas de abajo, contra 120 con el suelo pelado).
   Ahora el ALBEDO lo pone el horneado —`nivela()`, que lleva cada foto a su
   objetivo— y acá queda sólo el empujón de color, con la luma cerca de 1: si
   el tinte volviera a bajar la luma estaría corrigiendo dos veces lo mismo. */
const SUELO_TINTE = { s_bosque: 0xf2ffe8, s_piedra: 0xf8f6ff, s_ceniza: 0xfff6ec,
                      s_pantano: 0xeafff0, s_osario: 0xfffaf0 };

function texDe(url, cb) {
  const t = new THREE.Texture();
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  const im = new Image();
  im.onload = () => {
    t.image = im; t.needsUpdate = true; TEX_LISTAS++;
    if (cb) cb(t);
  };
  im.onerror = () => { TEX_FALLADAS++; };
  im.src = url;
  return t;
}

/* ── EL RESPALDO DIBUJADO ──────────────────────────────────────────────────
   No es un cuadrado de color: un cuadrado se lee a error. Es una silueta de
   la familia que le toca, así que mientras la foto no llegue el bosque sigue
   siendo un bosque.                                                        */
function sprRespaldo(fam, v, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const az = semilla(v * 977 + fam.length * 31);
  const osc = '#1d2320', med = '#2e382d', cla = '#3d4a38';
  g.clearRect(0, 0, w, h);
  if (fam === 'arboles') {
    g.fillStyle = osc; g.fillRect(w * 0.42, h * 0.40, w * 0.16, h * 0.60);
    for (let i = 0; i < 22; i++) {
      const a = az() * 6.283, r = az() * 0.42;
      g.fillStyle = i % 3 ? med : cla;
      g.beginPath();
      g.ellipse(w * (0.5 + Math.cos(a) * r), h * (0.26 + Math.sin(a) * r * 0.60),
                w * 0.16, h * 0.10, 0, 0, 6.283);
      g.fill();
    }
  } else if (fam === 'ruinas') {
    g.fillStyle = '#3a3a3d';
    g.fillRect(w * 0.16, h * 0.18, w * 0.68, h * 0.82);
    g.fillStyle = '#2a2a2d';
    for (let i = 0; i < 9; i++) g.fillRect(w * 0.16, h * (0.24 + i * 0.086), w * 0.68, 2);
    g.clearRect(w * 0.38, h * 0.52, w * 0.24, h * 0.48);
  } else if (fam === 'rocas') {
    g.fillStyle = '#45443f';
    g.beginPath(); g.ellipse(w * 0.5, h * 0.72, w * 0.42, h * 0.30, 0, 0, 6.283); g.fill();
    g.fillStyle = '#55544d';
    g.beginPath(); g.ellipse(w * 0.42, h * 0.60, w * 0.24, h * 0.20, 0, 0, 6.283); g.fill();
  } else {  // arbustos, plantas, helechos: matas de hojas
    const n = fam === 'arbustos' ? 26 : 14;
    for (let i = 0; i < n; i++) {
      const a = -1.57 + (az() - 0.5) * 2.2, l = h * (0.45 + az() * 0.50);
      g.strokeStyle = i % 2 ? med : cla;
      g.lineWidth = Math.max(2, w * 0.035);
      g.beginPath(); g.moveTo(w * 0.5, h);
      g.quadraticCurveTo(w * 0.5 + Math.cos(a) * l * 0.5, h - l * 0.55,
                         w * 0.5 + Math.cos(a) * l * 0.9, h - l);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
  return t;
}

function sueloRespaldo(k) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), az = semilla(k.length * 613);
  /* el respaldo lleva el ALBEDO puesto, igual que la foto nivelada: con los
     grises viejos —0,056 de luma lineal por 0,27 de tinte— el suelo dibujado
     por código salía tan negro como el fotográfico */
  const base = { s_bosque: '#525f48', s_piedra: '#7d7b74', s_ceniza: '#6a655e',
                 s_pantano: '#3b4a3c', s_osario: '#8d887a' }[k] || '#525f48';
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(az() * 46) - 23;
    g.fillStyle = `rgba(${128 + v},${128 + v},${120 + v},0.11)`;
    g.fillRect(az() * 128, az() * 128, 1 + az() * 3, 1 + az() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function armaTexturas() {
  /* los 24 sprites. `alphaTest` y NO `transparent`: un material transparente
     no escribe profundidad, así que dos billboards cruzados se dibujan en el
     orden equivocado y se ve el de atrás por delante. Es la lección de las
     cercas de piquetes de BARRIO.                                          */
  for (const fam in SPR_MAN) SPR_MAN[fam].forEach((p, i) => {
    const t = SPR[p.k] ? texDe(SPR[p.k]) : sprRespaldo(fam, i, p.w, p.h);
    if (SPR[p.k]) {
      // mientras no llegue, la silueta dibujada; el material la cambia solo
      const r = sprRespaldo(fam, i, p.w, p.h);
      MAT_SPR[p.k] = new THREE.MeshLambertMaterial({
        map: r, alphaTest: 0.42, side: THREE.DoubleSide, transparent: false,
      });
      const im = new Image();
      im.onload = () => {
        t.image = im; t.needsUpdate = true; TEX_LISTAS++;
        MAT_SPR[p.k].map = t; MAT_SPR[p.k].needsUpdate = true;
        r.dispose();
      };
      im.onerror = () => { TEX_FALLADAS++; };
      im.src = SPR[p.k];
    } else {
      MAT_SPR[p.k] = new THREE.MeshLambertMaterial({
        map: t, alphaTest: 0.42, side: THREE.DoubleSide, transparent: false,
      });
    }
    TEX[p.k] = t;
  });

  /* los tres suelos */
  ZONAS.forEach(Z => {
    const k = Z.suelo, rep = 1;   // la repetición la pone la geometría, en metros
    const resp = sueloRespaldo(k);
    resp.repeat.set(rep, rep);
    const m = new THREE.MeshLambertMaterial({ map: resp, color: SUELO_TINTE[k] });
    MAT_SUELO[k] = m;
    if (!SUELO_IMG || !SUELO_IMG[k]) return;
    const im = new Image();
    im.onload = () => {
      const t = new THREE.Texture(im);
      t.colorSpace = THREE.SRGBColorSpace;
      /* MirroredRepeat y no Repeat: al modelo se le pidió "sin costura" y
         ninguna imagen generada lo es de verdad. Coserlas a mano ensucia el
         centro, que es lo que más se mira; con el espejo, los dos bordes que
         se tocan SON el mismo borde y la costura no puede existir.          */
      t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestMipmapLinearFilter;
      t.anisotropy = 4;
      t.needsUpdate = true; TEX_LISTAS++;
      m.map = t; m.needsUpdate = true; resp.dispose();
    };
    im.onerror = () => { TEX_FALLADAS++; };
    im.src = SUELO_IMG[k];
  });
}

/* cuántas veces se repite la foto de una zona sobre N metros de suelo */
function sueloRep(zi, metros) {
  const k = ZONAS[zi].suelo;
  return metros / (SUELO_M[k] || 2.5);
}
