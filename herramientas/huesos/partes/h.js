/* ══════════════════════════════════════════════════════════════════════════
   EL RIG Y LAS ANIMACIONES — un esqueleto de pivotes y poses que son
   funciones del tiempo
   ══════════════════════════════════════════════════════════════════════════
   NO SE IMPORTA NINGÚN CLIP. Con un rig propio, ESCRIBIR la curva es más
   corto que describirla, y mezclar dos animaciones es evaluarlas y
   promediarlas — que es todo lo que un crossfade es. Es lo que ya funcionó
   en RECREO: cero descargas, cero retarget, y los ejes se saben porque los
   pusimos nosotros.

   CADA ARTICULACIÓN ES UN PIVOTE puesto DONDE ESTÁ LA ARTICULACIÓN, con la
   pieza colgando media longitud más abajo. Así girar el pivote gira el hueso
   alrededor de su punta de arriba, que es lo que hace un codo. Con la pieza
   centrada en el pivote, doblar el codo parte el antebrazo por la mitad.   */

/* ── UNA GEOMETRÍA POR PIEZA, CON VARIAS CAJAS FUNDIDAS ────────────────────
   Un esqueleto con costillas sueltas serían cinco mallas más POR bicho. Las
   costillas van fundidas adentro de la geometría del pecho y el color va en
   los vértices, así que el kit entero usa UN material.                     */
function cajas(lista) {
  const P = [], N = [], C = [];
  const CA = [   // las seis caras de un cubo unitario: normal y cuatro esquinas
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
    [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
  ];
  const c = new THREE.Color();
  for (const b of lista) {
    const hw = b.w / 2, hh = b.h / 2, hd = b.d / 2;
    c.setHex(b.c === undefined ? 0xffffff : b.c).convertSRGBToLinear();
    const rx = b.rx || 0, ry = b.ry || 0, rz = b.rz || 0;
    const e = new THREE.Euler(rx, ry, rz, 'YXZ'), m = new THREE.Matrix4().makeRotationFromEuler(e);
    const v = new THREE.Vector3(), nn = new THREE.Vector3();
    for (const [nor, esq] of CA) {
      nn.set(nor[0], nor[1], nor[2]).applyMatrix4(m).normalize();
      const q = esq.map(s => {
        v.set(s[0] * hw, s[1] * hh, s[2] * hd).applyMatrix4(m);
        return [v.x + (b.x || 0), v.y + (b.y || 0), v.z + (b.z || 0)];
      });
      for (const t of [[0, 1, 2], [0, 2, 3]]) for (const i of t) {
        P.push(q[i][0], q[i][1], q[i][2]);
        N.push(nn.x, nn.y, nn.z);
        C.push(c.r, c.g, c.b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}

/* ── LAS DOS RECETAS ───────────────────────────────────────────────────────
   Mismos nombres de hueso en las dos, así que UNA sola tabla de poses mueve
   al caballero y a los cuatro esqueletos. Lo que cambia son las cajas.     */
/* LA TABLA DE HUESOS SE CALCULA UNA VEZ. El caballero y los cuatro esqueletos
   comparten el mismo esqueleto de pivotes, y `armaCuerpo` es lo único que la
   lee: construir las dieciocho geometrías de la receta catorce veces —una por
   bicho— sólo para tirarlas ya era caro con cajas, y con mallas generadas de
   por medio es clonar y fundir doce mallas catorce veces. */
let _HUESOS = null;
function huesosBase() {
  return _HUESOS || (_HUESOS = {
      pelvis: { padre: null, y: 0.94 },
      torso:  { padre: 'pelvis', y: 0.02 },
      pecho:  { padre: 'torso', y: 0.24 },
      cuello: { padre: 'pecho', y: 0.26 },
      hombroI:{ padre: 'pecho', y: 0.20, x: 0.21 },
      hombroD:{ padre: 'pecho', y: 0.20, x: -0.21 },
      anteI:  { padre: 'hombroI', y: -0.28 },
      anteD:  { padre: 'hombroD', y: -0.28 },
      musloI: { padre: 'pelvis', y: -0.06, x: 0.11 },
      musloD: { padre: 'pelvis', y: -0.06, x: -0.11 },
      pantI:  { padre: 'musloI', y: -0.44 },
      pantD:  { padre: 'musloD', y: -0.44 },
  });
}
const ALTO_ESQ = 1.66;
const cuerpoEsq = () => armaCuerpo({ alto: ALTO_ESQ, huesos: huesosBase() });

/* LOS CUATRO MIEMBROS SE ESCRIBEN UNA VEZ Y NO OCHO. Izquierda y derecha son
   la misma pieza, y el brazo derecho encima lleva la espada colgada: con las
   ocho escritas a mano, el día que se mueva un centímetro la placa queda en
   siete y no en ocho, y eso no falla — sale un caballero con un brazo torcido.

   LA SECCIÓN SE ENGORDA Y EL LARGO NO. `pon3palo` escala uniforme al largo,
   que es de donde cuelga el rig; pero un brazal de Tripo es más fino que el
   brazo que tiene que envolver (0,229 de sección contra los 0,12 de la caja),
   así que `gr` lo abre a lo ancho SIN tocar el largo. Medido en el horneado:
   brazal 0,229 · guante 0,374 · quijote 0,422 · greba 0,288.               */
function brazoArriba(TELA) {
  return fundeGeo([
    cajas([{ w: 0.12, h: 0.30, d: 0.13, y: -0.15, c: TELA }]),
    hay3('brazal') ? pon3palo('brazal', 0.31, 0, 0.01, 0, 0, 0, 1.9)
      /* el casquete del hombro sólo existe SIN peto: el peto trae sus dos
         hombreras y las dos capas juntas se leen a bulto */
      : cajas([{ w: 0.17, h: 0.10, d: 0.17, y: 0.01, c: 0x8f979f }]),
  ]);
}
function brazoAbajo(PIEL, CUERO) {
  return fundeGeo([
    cajas([{ w: 0.10, h: 0.26, d: 0.11, y: -0.13, c: PIEL },
           { w: 0.12, h: 0.11, d: 0.13, y: -0.30, c: CUERO }]),
    hay3('guante') ? pon3palo('guante', 0.38, 0, 0.01, 0, 0, 0, 1.0) : null,
  ]);
}
function muslo(CUERO) {
  return fundeGeo([
    cajas([{ w: 0.14, h: 0.44, d: 0.15, y: -0.22, c: CUERO }]),
    hay3('quijote') ? pon3palo('quijote', 0.46, 0, 0.01, 0, 0, 0, 0.80) : null,
  ]);
}
function canilla(OSC) {
  return fundeGeo([
    cajas([{ w: 0.12, h: 0.42, d: 0.13, y: -0.21, c: 0x3b2b1e },
           { w: 0.14, h: 0.09, d: 0.26, y: -0.44, z: 0.05, c: OSC }]),
    hay3('greba') ? pon3palo('greba', 0.50, 0, 0.01, 0, 0, 0, 1.0) : null,
  ]);
}

function recetaHeroe() {
  const PIEL = 0xb98a63, CUERO = 0x4a3526, ACERO = 0x7d848c, TELA = 0x6b2b2a, OSC = 0x2a2420;
  return {
    alto: 1.72, nombre: 'heroe',
    huesos: huesosBase(),
    piezas: {
      pelvis: fundeGeo([
        cajas([{ w: 0.30, h: 0.16, d: 0.20, y: -0.05, c: CUERO }]),
        hay3('faldar') ? pon3caja('faldar', 0.38, 0.26, 0.30, 0, -0.10, 0) : null,
      ]),
      torso:  cajas([{ w: 0.34, h: 0.26, d: 0.21, y: 0.12, c: TELA }]),
      /* ── LA ARMADURA (vuelta 153) ─────────────────────────────────────
         Seis piezas más de Tripo, y entran por el MISMO camino que el yelmo
         y la espada: reemplazan la geometría de una pieza y nada más. El rig
         de pivotes, las once poses, el patinaje cero y el kit instanciado
         siguen intactos — que es exactamente lo que un `SkinnedMesh` habría
         costado (ver `herramientas/huesos/pedir_caballero.py`).

         LA CAJA DE ABAJO SE QUEDA SÓLO DONDE NO ESTORBA. En los brazos y las
         piernas la placa envuelve al miembro, así que la caja queda por
         dentro y no se ve; en el pecho no, porque el peto trae sus hombreras
         y su quillón y las tres cajas de acero le asomarían por debajo. Ahí
         lo que sobrevive es la capa de tela y la correa, que es lo que se ve
         si el blob no decodifica.                                          */
      pecho:  hay3('peto') ? fundeGeo([
        cajas([{ w: 0.34, h: 0.28, d: 0.20, y: 0.13, c: TELA }]),   // la cota de abajo
        pon3caja('peto', 0.44, 0.34, 0.27, 0, 0.145, 0.005),
      ]) : cajas([
        { w: 0.40, h: 0.30, d: 0.24, y: 0.13, c: ACERO },
        { w: 0.42, h: 0.05, d: 0.26, y: 0.25, c: 0x9aa2ab },     // hombrera de arriba
        { w: 0.10, h: 0.24, d: 0.26, y: 0.13, c: 0x8f979f },     // el filo del peto
        { w: 0.44, h: 0.06, d: 0.06, y: 0.06, z: 0.12, c: CUERO }, // correa
      ]),
      /* EL YELMO Y LA ESPADA DEL HÉROE TAMBIÉN SON MALLA GENERADA, y no es
         un extra: en tercera persona el caballero está en pantalla el cien
         por cien del tiempo y ocupa el 24 % del alto, así que es lo que más
         se mira del juego. La cabeza de piel se queda debajo del yelmo —doce
         triángulos— para que si la malla no llegara no quedara un cuello sin
         nada encima.                                                      */
      cuello: fundeGeo([
        cajas([{ w: 0.12, h: 0.08, d: 0.12, y: 0.04, c: PIEL },
               { w: 0.21, h: 0.22, d: 0.21, y: 0.19, c: PIEL }]),   // cabeza
        hay3('yelmo') ? pon3caja('yelmo', 0.245, 0.280, 0.245, 0, 0.205, 0.005)
          : cajas([
            { w: 0.23, h: 0.10, d: 0.23, y: 0.28, c: 0x8d949c },      // el yelmo
            { w: 0.24, h: 0.05, d: 0.05, y: 0.20, z: 0.11, c: OSC },  // la ranura
            { w: 0.05, h: 0.13, d: 0.05, y: 0.24, z: 0.11, c: 0x8d949c }, // nasal
          ]),
      ]),
      hombroI: brazoArriba(TELA), hombroD: brazoArriba(TELA),
      anteI:  brazoAbajo(PIEL, CUERO),
      /* LA ESPADA CUELGA DEL ANTEBRAZO DERECHO Y NO DE LA ESCENA. Así la
         lleva la mano por construcción y no hay dos animaciones que se
         puedan desincronizar — la lección del leño de LEMI.                */
      anteD:  fundeGeo([
        brazoAbajo(PIEL, CUERO),
        hay3('esphero') ? pon3palo('esphero', 0.95, 0, -0.31, 0)
          : cajas([
            { w: 0.19, h: 0.05, d: 0.06, y: -0.36, c: 0x6a5238 },  // guarda
            { w: 0.05, h: 0.09, d: 0.05, y: -0.44, c: 0x4a3a28 },  // puño
            { w: 0.07, h: 0.86, d: 0.03, y: -0.83, c: 0xa9b2bb },  // hoja
            { w: 0.03, h: 0.86, d: 0.035, y: -0.83, c: 0xd6dde3 }, // el filo
          ]),
      ]),
      musloI: muslo(CUERO), musloD: muslo(CUERO),
      pantI:  canilla(OSC),  pantD:  canilla(OSC),
    },
  };
}


/* ══════════════ LAS PIEZAS 3D, Y CÓMO ENTRAN AL KIT ══════════════════════
   `i_3d.js` trae doce mallas generadas con Rezona (Tripo), con la textura ya
   horneada en los vértices y NORMALIZADAS: las de modo 'caja' vienen centradas
   con su arista mayor en 1, las de modo 'palo' paradas sobre −Y con largo 1 y
   el agarre en el origen. Colocarlas es trabajo de la receta, que es donde ya
   viven los metros.

   REEMPLAZAN LA GEOMETRÍA DE UNA PIEZA Y NADA MÁS. El rig sigue siendo el de
   pivotes, las nueve poses siguen siendo funciones del tiempo, el patinaje
   sigue en cero y el kit sigue costando UNA llamada de dibujo por pieza haya
   uno o haya catorce bichos. Un `SkinnedMesh` riggeado habría costado las
   cuatro cosas — ver el encabezado de `herramientas/huesos/pedir_3d.py`.

   Y CADA UNA SE DECODIFICA EN SU PROPIO `try`: un blob roto cuesta ESA pieza
   —que se queda con su caja— y no el módulo entero. Acá no hay nada
   asincrónico: un blob de geometría es `atob` y una vista tipada, así que a
   diferencia de una imagen no hace falta cambiarle la geometría al kit
   después.                                                                */
function h3Geo(b64) {
  const s = atob(b64), n = s.length, u8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8[i] = s.charCodeAt(i);
  const dv = new DataView(u8.buffer);
  const nv = dv.getUint32(0, true), ni = dv.getUint32(4, true);
  const mn = [dv.getFloat32(8, true), dv.getFloat32(12, true), dv.getFloat32(16, true)];
  const ra = [dv.getFloat32(20, true), dv.getFloat32(24, true), dv.getFloat32(28, true)];
  let o = 32;
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++)
    pos[i * 3 + k] = mn[k] + dv.getUint16(o + i * 6 + k * 2, true) / 65535 * ra[k];
  o += nv * 6; if (o & 1) o++;
  const nor = new Float32Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) nor[i] = dv.getInt8(o + i) / 127;
  o += nv * 3; if (o & 1) o++;
  /* EL COLOR PASA POR LA MISMA CADENA QUE `cajas()` —`setHex` y después
     `convertSRGBToLinear`— y no por una conversión propia. No es que la cadena
     esté bien: en three r169 `setHex` YA lleva de sRGB al espacio de trabajo,
     así que el juego entero convierte dos veces y sus colores salen más
     oscuros de lo que dice el hexadecimal. Pero ésa es la calibración contra la
     que están elegidos los cincuenta colores del juego: una pieza generada que
     convirtiera «bien» sería la única cosa clara de un mundo oscuro.       */
  const col = new Float32Array(nv * 3), c = new THREE.Color();
  for (let i = 0; i < nv; i++) {
    c.setHex((u8[o + i * 3] << 16) | (u8[o + i * 3 + 1] << 8) | u8[o + i * 3 + 2]).convertSRGBToLinear();
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  o += nv * 3; if (o & 1) o++;
  const idx = new Uint16Array(ni);
  for (let i = 0; i < ni; i++) idx[i] = dv.getUint16(o + i * 2, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

const H3 = {};
let H3_FALLAS = [];
(() => {
  if (typeof H3_B64 === 'undefined') return;
  for (const k in H3_B64) {
    try { H3[k] = h3Geo(H3_B64[k]); } catch (e) { H3_FALLAS.push(k); }
  }
})();

/* ¿hay malla para esta pieza? Todo lo que la use pregunta por acá, así que
   apagar el 3D para medir el antes y el después es una sola bandera.

   ACÁ HUBO UN DIAGNÓSTICO MÍO QUE ERA FALSO Y CONVIENE DEJARLO ESCRITO. Medido
   con las doce mallas puestas, la silueta del bicho a 2,8 m se partía en
   noventa manchas con la mayor en el 27 %, contra setenta y cinco y el 61 % de
   las cajas, y de ahí concluí que «anatómicamente un esqueleto es casi todo
   agujeros y a treinta y cinco píxeles eso parte la silueta». Era mentira: lo
   que estaba roto eran DOS COSAS DEL HORNEADO, y las dos se ven en un dibujo y
   no en el código.
     · Las tres piezas centrales venían MIRANDO A −X y `modo:'caja'` no orienta
       nada, así que el ajuste uniforme al mínimo agarraba el eje corto: el
       costillar entraba con 0,105 m de ancho contra los 0,34 de la caja (31 %)
       y la pelvis con 0,091 contra 0,24. O sea que las dos masas que hacen que
       un esqueleto se lea como UNA silueta desaparecían.
     · Y `suelda()` revolvía el búfer de índices —una `argsort` de más—, así que
       la malla salía una maraña de púas. En un palo eso se sigue leyendo a
       palo, y por eso duró.
   Con las dos cosas arregladas el costillar tiene sus doce pares de costillas,
   el cráneo sus cuencas y la pelvis sus dos agujeros, y las catorce mallas le
   ganan a las cajas. */
/* CUÁNTO SE ENGORDAN LOS HUESOS, Y POR QUÉ HAY QUE ENGORDARLOS.
   Un esqueleto de verdad es mucho más fino que el muñeco de cajas que
   reemplaza, y las cajas eran gordas a propósito: medido a 2,2 m, el bicho de
   cajas cubre el 26,4 % de su propia caja envolvente y el de mallas el 14,9 %.
   A 372×172 un húmero de siete centímetros mide UN píxel, así que la mitad del
   esqueleto se promedia con el pasto y el bicho se despinta. `H3_GR` engorda la
   SECCIÓN de los huesos largos sin tocar su largo —el largo es de lo que cuelga
   el rig— y `H3_KC` deja que las piezas de caja se pasen un poco de la caja que
   reemplazan. Los dos salen de barrer y medir la cobertura contra las cajas.
   Y NO TOCAN NI LAS ARMAS NI LA CORONA NI EL YELMO: una espada engordada al
   doble es un garrote, y ahí la silueta ESTRECHA es justamente lo que dice de
   qué clase es el bicho.
   Y NO SE ARREGLA CON EMISIVO, que fue lo primero que probé: el hueso se lee
   como una silueta MÁS OSCURA que el pasto, así que un piso de emisivo lo sube
   hasta el valor del fondo y lo BORRA — medido, el contraste cae de 8,5 a 4,9
   y en la captura el bicho desaparece.

   LOS DOS NÚMEROS SE ELIGIERON MIRANDO LA FOTO A SU RESOLUCIÓN DE VERDAD, y
   eso es la mitad del trabajo: la captura del banco viene estirada 2,4 veces
   —el cuadro son 892×412 y el destino de render 372×172— así que juzgar a 4×
   sobre la captura es juzgar a DIEZ veces lo que ve el jugador, y ahí las
   mallas ganan siempre porque se les ve la anatomía. Devuelta a 43×49, que es
   lo que el bruto mide de verdad a distancia de pelea, la cuenta cambia:

     cajas       cubre 48,5 %   contra 21,1   ← silueta limpia, pero un maniquí
     gr 1,90     cubre 44,9 %   contra 18,5   ← se desarma, se pierde en el pasto
     gr 2,40     cubre 48,1 %   contra 18,8   ← empata a las cajas Y se le ven los huesos
     gr 3,00     cubre 52,0 %   contra 19,0   ← los hombros se vuelven una barra
     gr 3,80     cubre 59,6 %   contra 18,3   ← un bulto

   O sea que 2,40 es el primer valor en el que la malla cubre lo mismo que la
   caja. Por debajo el bicho se despinta y por encima deja de ser un esqueleto.
   Lo que sigue perdiendo la malla es CONTRASTE (18,8 contra 21,1), y eso no
   tiene arreglo: el pasto se ve por entre las costillas. */
let H3_GR = 2.40, H3_KC = 1.40;
let H3_ON = true;
/* apaga PIEZAS SUELTAS sin tocar el resto, para poder medir cuáles ganan y
   cuáles rompen. Vacío a propósito: con el búfer de índices arreglado y las
   tres piezas centrales orientadas, las catorce mallas le ganan a las cajas.
   Lo usa `__H.tresPieza(k, v)` desde el banco. */
const H3_NO = {};
const hay3 = k => H3_ON && !H3_NO[k] && H3[k] !== undefined;

/* mete la malla en LA MISMA CAJA que dibujaba `cajas()`: escala UNIFORME y la
   más chica de las tres, así entra por construcción y no se estira — una
   calavera estirada por eje sale ovalada */
function pon3caja(k, w, h, d, cx, cy, cz, kc) {
  const g = H3[k].clone();
  g.computeBoundingBox();
  const b = g.boundingBox, ex = b.max.x - b.min.x, ey = b.max.y - b.min.y, ez = b.max.z - b.min.z;
  const e = Math.min(w / ex, h / ey, d / ez) * (kc || 1);
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
  g.scale(e, e, e); g.translate(cx, cy, cz);
  return g;
}

/* un palo viene con largo 1 colgando del origen: escala uniforme al largo que
   pide la receta, se inclina si hace falta y se corre a donde va el agarre.
   `fr` corre el agarre A LO LARGO DEL PROPIO PALO —una lanza se agarra por el
   tercio de atrás, no por la punta— y por eso el desplazamiento va sobre la
   dirección del palo YA GIRADO y no sobre −Y.                              */
const _EJEX = new THREE.Vector3(1, 0, 0);
function pon3palo(k, L, dx, dy, dz, gx, fr, gr) {
  const g = H3[k].clone();
  /* el LARGO es exacto —de ahí cuelga el rig— y lo que engorda es la SECCIÓN */
  g.scale(L * (gr || 1), L, L * (gr || 1));
  if (gx) g.rotateX(gx);
  if (fr) {
    const d = new THREE.Vector3(0, -1, 0).applyAxisAngle(_EJEX, gx || 0).multiplyScalar(-L * fr);
    g.translate(d.x, d.y, d.z);
  }
  g.translate(dx || 0, dy || 0, dz || 0);
  return g;
}

/* junta cajas y mallas en UNA geometría: el kit tiene una malla instanciada
   por pieza, así que una pieza es una geometría y no una lista */
function fundeGeo(lista) {
  const gs = lista.filter(Boolean);
  if (gs.length === 1 && !gs[0].index) return gs[0];
  let nv = 0, ni = 0;
  for (const g of gs) {
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
  }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3);
  /* el índice va en Uint32 y no en Uint16: un desborde de 65.535 no avisa,
     dibuja triángulos que apuntan a cualquier lado */
  const I = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of gs) {
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    P.set(p.array.subarray(0, p.count * 3), vo * 3);
    N.set(n.array.subarray(0, n.count * 3), vo * 3);
    C.set(c.array.subarray(0, c.count * 3), vo * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) I[io++] = g.index.array[i] + vo;
    else for (let i = 0; i < p.count; i++) I[io++] = i + vo;
    vo += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

/* ── EL LARGO DEL ARMA SALE DEL ALCANCE ────────────────────────────────────
   `alc` vale 1,85 · 2,85 · 2,35 · 3,05 y las cuatro clases mostraban HOY la
   MISMA hoja de 0,62: o sea que el número con el que el jugador decide si
   entra o espera no se veía por ningún lado, y el lancero —que llega medio
   metro más lejos que el bruto— parecía llegar igual. Derivado no puede
   mentir, y se comprueba con `__H.armas()`.
   El divisor es la escala del cuerpo, porque `raiz.scale` la multiplica
   después: lo que tiene que seguir al alcance es el largo EN EL MUNDO.     */
const ARMA_BASE = 0.62;
const ARMA_DE = { peon: 'armaPeon', lancero: 'armaLanza', bruto: 'armaMazo', rey: 'armaReal' };
const ARMA_MALLA = { armaPeon: 'espada', armaLanza: 'lanza', armaMazo: 'mazo', armaReal: 'espadon' };
const largoArma = cl => (ARMA_BASE + ESQ[cl].alc - ESQ.peon.alc) / ESQ[cl].esc;

function recetaEsq() {
  const HUE = 0xd6d0bd, OSC = 0x1a1714, OXI = 0x6a5a48, ORO = 0xc8a13a;
  const cost = [];
  for (let i = 0; i < 4; i++)                       // la caja torácica
    cost.push({ w: 0.26 - i * 0.018, h: 0.030, d: 0.19 - i * 0.012, y: 0.24 - i * 0.055, c: HUE });
  return {
    alto: ALTO_ESQ, nombre: 'esq',
    huesos: huesosBase(),                           // MISMO esqueleto de pivotes
    piezas: piezasEsq(HUE, OSC, OXI, ORO, cost),
    /* una pieza cuyo nombre NO es un hueso dice de cuál cuelga */
    hueso: { corona: 'cuello', capa: 'pecho',
             armaPeon: 'anteD', armaLanza: 'anteD', armaMazo: 'anteD', armaReal: 'anteD' },
  };
}

/* ── LAS PIEZAS DEL ESQUELETO ──────────────────────────────────────────────
   Cada una es «las cajas que quedan» más «la malla generada, si llegó». Lo que
   la malla reemplaza sale de la lista de cajas; lo que no —el muñón del
   cuello, la capa de tela— se queda. Así apagar el 3D con `__H.tres(false)`
   devuelve EXACTAMENTE el juego de antes, que es lo único que permite medir el
   antes y el después en el mismo binario.                                  */
function piezasEsq(HUE, OSC, OXI, ORO, cost) {
  const P = {};

  P.pelvis = hay3('pelvis')
    ? pon3caja('pelvis', 0.26, 0.180, 0.16, 0, -0.0725, 0, H3_KC)
    : cajas([{ w: 0.24, h: 0.13, d: 0.15, y: -0.05, c: HUE },
             { w: 0.06, h: 0.10, d: 0.10, y: -0.11, x: 0.08, c: HUE },
             { w: 0.06, h: 0.10, d: 0.10, y: -0.11, x: -0.08, c: HUE }]);

  P.torso = cajas([{ w: 0.07, h: 0.28, d: 0.07, y: 0.13, c: HUE }]);   // la columna lumbar

  P.pecho = hay3('costillar')
    ? pon3caja('costillar', 0.34, 0.300, 0.19, 0, 0.130, 0, H3_KC)
    : cajas(cost.concat([
        { w: 0.06, h: 0.30, d: 0.06, y: 0.13, c: HUE },                  // esternón
        { w: 0.34, h: 0.04, d: 0.05, y: 0.26, c: HUE },                  // clavículas
      ]));

  /* el muñón del cuello NO se va con la calavera: es lo que la une al pecho */
  P.cuello = fundeGeo([
    cajas([{ w: 0.05, h: 0.09, d: 0.05, y: 0.04, c: HUE }]),
    hay3('craneo') ? pon3caja('craneo', 0.19, 0.215, 0.225, 0, 0.1625, 0.010, H3_KC)
      : cajas([
        { w: 0.19, h: 0.18, d: 0.20, y: 0.18, c: HUE },                  // el cráneo
        { w: 0.15, h: 0.07, d: 0.06, y: 0.09, z: 0.09, c: HUE },         // mandíbula
        /* LAS CUENCAS SON LO ÚNICO QUE HACE QUE UNA CAJA SEA UNA CALAVERA:
           dos huecos oscuros y la nariz. Sin eso, a diez metros y con niebla
           es un ladrillo claro. Con la malla generada esto sobra.          */
        { w: 0.055, h: 0.055, d: 0.04, y: 0.20, x: 0.045, z: 0.095, c: OSC },
        { w: 0.055, h: 0.055, d: 0.04, y: 0.20, x: -0.045, z: 0.095, c: OSC },
        { w: 0.03, h: 0.035, d: 0.03, y: 0.155, z: 0.10, c: OSC },
      ]),
  ]);

  /* EL MISMO HÚMERO HACE DE BRAZO Y DE ANTEBRAZO, Y EL MISMO FÉMUR DE MUSLO Y
     DE TIBIA, escalados. Son cuatro huesos largos con la misma silueta —tallo
     fino y dos cabezas— y a la escala a la que se ven (un brazo mide veintiséis
     centímetros en un juego que dibuja a 372×172) la diferencia anatómica no
     llega a un píxel. Lo que sí cuesta es la memoria: cuatro mallas distintas
     serían cuatro geometrías más para dibujar lo mismo.                    */
  const brazo = (L) => hay3('humero') ? pon3palo('humero', L, 0, 0.015, 0, 0, 0, H3_GR)
    : cajas([{ w: 0.055, h: L, d: 0.055, y: -L / 2, c: HUE },
             { w: 0.10, h: 0.07, d: 0.10, y: 0.00, c: HUE }]);
  const pierna = (L) => hay3('femur') ? pon3palo('femur', L, 0, 0.015, 0, 0, 0, H3_GR)
    : cajas([{ w: 0.062, h: L, d: 0.062, y: -L / 2, c: HUE }]);
  const mano = () => hay3('mano') ? pon3caja('mano', 0.105, 0.120, 0.080, 0, -0.300, 0.005, H3_KC)
    : cajas([{ w: 0.09, h: 0.09, d: 0.05, y: -0.29, c: HUE }]);
  /* el pie generado lleva el tobillo, así que es ALTO: con la caja de 0,08
     que dibujaba el cubo, el ajuste al mínimo lo dejaba de la mitad de
     largo. La caja de destino sube a 0,16 y baja un poco, así el tobillo
     PISA la tibia en vez de dejar un hueco en la juntura. */
  const pie = () => hay3('pie') ? pon3caja('pie', 0.100, 0.160, 0.215, 0, -0.470, 0.030, H3_KC)
    : cajas([{ w: 0.09, h: 0.06, d: 0.20, y: -0.45, z: 0.04, c: HUE }]);

  P.hombroI = brazo(0.315); P.hombroD = brazo(0.315);
  P.anteI = fundeGeo([brazo(0.275), mano()]);
  P.anteD = fundeGeo([brazo(0.275), mano()]);
  P.musloI = pierna(0.455); P.musloD = pierna(0.455);
  P.pantI = fundeGeo([pierna(0.435), pie()]);
  P.pantD = fundeGeo([pierna(0.435), pie()]);

  /* ── LO QUE HACE QUE UN REY SE LEA A REY ────────────────────────────────
     Las cuatro clases comparten la MISMA receta y sólo se distinguen por la
     escala y el tinte, así que el jefe salía idéntico al primer bicho que uno
     mata — medido en la foto de la ceniza: la misma silueta, un 86 % más
     grande. Corona y capa cuelgan de huesos que ya existen, así que se mueven
     con la cabeza y con el pecho solas. Y NO CUESTAN UN BICHO MÁS: son mallas
     instanciadas cuya matriz queda en CERO para todo el que no sea rey.   */
  P.corona = hay3('corona')
    ? pon3caja('corona', 0.245, 0.205, 0.245, 0, 0.335, 0)
    : cajas([
        { w: 0.23, h: 0.055, d: 0.23, y: 0.295, c: ORO },
        { w: 0.045, h: 0.12, d: 0.045, y: 0.375, z: 0.095, c: ORO },
        { w: 0.045, h: 0.12, d: 0.045, y: 0.375, z: -0.095, c: ORO },
        { w: 0.045, h: 0.12, d: 0.045, y: 0.375, x: 0.095, c: ORO },
        { w: 0.045, h: 0.12, d: 0.045, y: 0.375, x: -0.095, c: ORO },
        { w: 0.05, h: 0.05, d: 0.05, y: 0.445, z: 0.095, c: 0x7d1420 },
      ]);
  P.capa = cajas([
    { w: 0.40, h: 0.10, d: 0.06, y: 0.235, z: -0.085, c: 0x5e1420 },   // el cuello
    { w: 0.34, h: 0.52, d: 0.035, y: -0.05, z: -0.105, c: 0x4a1019 },
    { w: 0.13, h: 0.30, d: 0.03, y: -0.44, z: -0.115, x: -0.09, c: 0x3d0d15 },
    { w: 0.11, h: 0.22, d: 0.03, y: -0.50, z: -0.115, x: 0.08, c: 0x3d0d15 },
  ]);

  /* UN ARMA POR CLASE, con la misma máquina de matriz cero que la corona.
     El largo sale de `largoArma`, o sea del ALCANCE, así que no puede mentir.
     LA LANZA VA INCLINADA HACIA ADELANTE y agarrada por el tercio de atrás,
     que es como se lleva una lanza: colgando recta, 1,53 × 1,06 de escala se
     meten ochenta centímetros bajo el piso — y encima una pica vertical no
     muestra el alcance, que es todo el punto de que el lancero llegue más
     lejos que el bruto.                                                    */
  for (const cl in ARMA_DE) {
    const k = ARMA_DE[cl], L = largoArma(cl), m = ARMA_MALLA[k];
    /* −93° deja la lanza casi horizontal apuntando adelante y agarrada por el
       quinto de atrás: es como se lleva una lanza y —lo que importa— es la
       única postura en la que se VE que llega más lejos que el mazo del bruto */
    const gx = cl === 'lancero' ? -1.62 : 0, fr = cl === 'lancero' ? 0.22 : 0;
    P[k] = hay3(m) ? pon3palo(m, L, 0, -0.34, 0, gx, fr)
      : cajas([{ w: 0.055, h: L, d: 0.025, y: -0.34 - L / 2 + fr * L, rx: gx, c: 0x8d8574 },
               { w: 0.05, h: 0.05, d: 0.05, y: -0.34, c: OXI }]);
  }
  return P;
}

/* vuelve a armar las geometrías del kit con lo que `hay3` diga ahora. Sólo lo
   usa la sonda `__H.tres()`: el juego no lo necesita porque un blob no es una
   imagen y ya está decodificado antes del primer cuadro. */
function rehaceKit(kit, receta) {
  if (!kit) return 0;
  const r = receta(); let n = 0;
  for (const k in kit.mallas) {
    if (!r.piezas[k]) continue;
    kit.mallas[k].geometry.dispose();
    kit.mallas[k].geometry = r.piezas[k];
    n++;
  }
  return n;
}
const esqRehacePiezas = () =>
  rehaceKit(ESQ_KIT, recetaEsq) + rehaceKit(JUG && JUG.kit, recetaHeroe);

/* ── EL KIT: UNA MALLA INSTANCIADA POR PIEZA ───────────────────────────────
   Catorce esqueletos sueltos serían catorce por dieciocho = 252 llamadas de
   dibujo. Con un InstancedMesh por PIEZA son DIECIOCHO, haya uno o haya
   catorce, porque la pieza `pecho` del bicho 7 es la instancia 7 de la misma
   malla.                                                                  */
function armaKit(receta, cupo) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mallas = {};
  for (const k in receta.piezas) {
    const im = new THREE.InstancedMesh(receta.piezas[k], mat, cupo);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    im.count = 0;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cupo * 3).fill(1), 3);
    esc.add(im); mallas[k] = im;
  }
  return { receta, mat, mallas, cupo, n: 0 };
}

/* el cuerpo son PIVOTES y nada más: sin mallas, así que crear catorce cuesta
   catorce objetos vacíos y el dibujo lo hace el kit */
function armaCuerpo(receta) {
  const h = {}, raiz = new THREE.Object3D();
  for (const k in receta.huesos) {
    const d = receta.huesos[k], o = new THREE.Object3D();
    o.position.set(d.x || 0, d.y || 0, d.z || 0);
    o.rotation.order = 'YXZ';
    (d.padre ? h[d.padre] : raiz).add(o);
    h[k] = o;
  }
  /* la altura de la cadera es el CERO de la pose: `poseAplica` le suma el
     rebote encima, así que tiene que salir de la receta y no de un número
     escrito en la función de mezcla */
  return { raiz, h, baseY: receta.huesos.pelvis.y, alto: receta.alto };
}

/* escribe en el kit la pose de todos los cuerpos vivos; una pasada, sin
   crear un solo objeto */
const _KM = new THREE.Matrix4();
const _KCERO = new THREE.Matrix4().makeScale(0, 0, 0);
function kitPinta(kit, cuerpos) {
  const hs = kit.receta.hueso || {};
  let n = 0;
  for (const c of cuerpos) {
    if (!c.vive) continue;
    c.cuerpo.raiz.updateMatrixWorld(true);
    /* UNA PIEZA QUE NO LE TOCA A ESTE CUERPO VA CON MATRIZ CERO y no se
       saltea: las instancias de un InstancedMesh son un rango contiguo, así
       que saltear una correría el índice y el bicho 7 pintaría la cabeza del
       8. Una matriz de escala cero no dibuja un solo píxel.               */
    for (const k in kit.mallas)
      kit.mallas[k].setMatrixAt(n, (c.sin && c.sin[k]) ? _KCERO : c.cuerpo.h[hs[k] || k].matrixWorld);
    if (c.tinte !== undefined) for (const k in kit.mallas) kit.mallas[k].setColorAt(n, c.tinte);
    n++;
    if (n >= kit.cupo) break;
  }
  for (const k in kit.mallas) {
    const m = kit.mallas[k];
    m.count = n; m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  kit.n = n;
}

/* ══════════════════════════════════════════════════════════════════════════
   LAS POSES — cada una es una función del tiempo a doce rotaciones
   ══════════════════════════════════════════════════════════════════════════
   EL RITMO DEL CICLO NO ES UN NÚMERO AL LADO: sale de la velocidad y de la
   zancada (`ω = 2π·v / zancada`). Escrito a mano, el pie patina en cuanto
   cambia la velocidad — el defecto que en RECREO tenía a Baldi a 2,7 metros
   por paso.                                                                */
const POSE = {};
const _P = {};   // el destino de la pose: se rellena y se mezcla, sin alojar

function poseCero(p) {
  p.pelX = 0; p.pelY = 0; p.pelZ = 0; p.alt = 0;
  p.troX = 0; p.troY = 0; p.troZ = 0;
  p.pecX = 0; p.pecY = 0; p.pecZ = 0;
  p.cueX = 0; p.cueY = 0;
  p.hIX = 0.05; p.hIZ = 0.16; p.hIY = 0;
  p.hDX = 0.05; p.hDZ = -0.16; p.hDY = 0;
  p.aIX = -0.28; p.aDX = -0.28;
  p.mIX = 0; p.mDX = 0; p.pIX = 0; p.pDX = 0;
  return p;
}

/* quieto: respira, se balancea y CAMBIA EL PESO de una pierna a la otra. El
   cambio de peso es lo que más se nota y lo que menos se ve venir; sin él
   una pose de reposo se lee a maniquí que sube y baja.                     */
POSE.quieto = (p, t) => {
  poseCero(p);
  const r = Math.sin(t * 1.55), peso = Math.sin(t * 0.37);
  p.alt = r * 0.012;
  p.pecX = -0.05 + r * 0.035;
  p.cueX = 0.04 - r * 0.03;
  p.cueY = Math.sin(t * 0.29) * 0.22;
  p.pelZ = peso * 0.045;
  p.troZ = -peso * 0.030;
  p.hIZ += 0.05 + r * 0.020; p.hDZ -= 0.05 + r * 0.020;
  p.hIX += peso * 0.05; p.hDX -= peso * 0.05;
  p.aIX -= 0.16; p.aDX -= 0.20;
  p.mIX = -peso * 0.05; p.mDX = peso * 0.05;
};

/* caminar y correr son la MISMA curva con otra amplitud: son el mismo gesto
   a otra velocidad, y con dos curvas sueltas se separan al mezclarlas.

   ── HACIA DÓNDE CAMINA ESTE CICLO ────────────────────────────────────────
   MEDIDO y no supuesto (`__H.ejeH('musloI','x',0.5)` → `dz −0.211`): con el
   hueso colgando de −Y, **rotación positiva del muslo es PIERNA ATRÁS**. De
   ahí sale todo lo demás:

     · `mIX = +sin(f)` ⇒ la izquierda está ATRÁS en f=π/2 (despegue) y
       ADELANTE en f=3π/2 (apoyo del talón). El apoyo va de 3π/2 a π/2 y el
       vuelo de π/2 a 3π/2.
     · el brazo va contralateral y ya estaba bien: `hIX` es más negativo en
       f=π/2 —y rotación negativa manda la mano a +Z, o sea adelante— así que
       el brazo izquierdo está adelante justo cuando la pierna izquierda está
       atrás.
     · LA RODILLA ES LA QUE ESTABA DADA VUELTA. Iba con
       `max(0, −sin(f − 0.55))`, que pica en f=5,26 — donde la pierna está en
       su punto MÁS ADELANTADO. O sea: se plantaba con la rodilla doblada y
       la estiraba barriendo hacia adelante, que es literalmente caminar de
       espaldas. Y no era visible en ninguna sonda: `patina()` mide CUÁNTO
       barre el pie y no HACIA DÓNDE, así que un ciclo dado vuelta le daba el
       mismo 0 % de patinaje. Lo destapó `__H.marcha()`, que mira el SIGNO del
       barrido durante el apoyo: daba `+0,428` con el cuerpo yendo a +Z.
       La rodilla se dobla en el VUELO, y pica poco después del despegue.  */
function poseAndar(p, f, k) {
  poseCero(p);
  const s = Math.sin(f), c = Math.cos(f);
  p.mIX = s * 0.86 * k; p.mDX = -s * 0.86 * k;
  /* EL CLIP DURO DEJA UN CODO EN LA DERIVADA justo donde la rodilla se
     bloquea, y a esa velocidad eso se lee a tranco de juguete. Una potencia
     por encima de 1 sobre la parte positiva la deja con derivada cero en el
     cruce, así que entra y sale sin escalón. */
  p.pIX = (rodilla(f) * 1.36 + 0.16) * k;
  p.pDX = (rodilla(f + Math.PI) * 1.36 + 0.16) * k;
  p.hIX = 0.05 - s * 0.62 * k; p.hDX = 0.05 + s * 0.62 * k;
  p.aIX = -0.28 - (0.42 + s * 0.30) * k; p.aDX = -0.28 - (0.42 - s * 0.30) * k;
  /* el rebote va al DOBLE de la frecuencia del vaivén, porque hay DOS
     pisadas por ciclo; a la misma frecuencia el cuerpo cojea */
  p.alt = -Math.abs(c) * 0.055 * k;
  p.pelY = -s * 0.16 * k;         // la cadera bascula…
  p.troY = s * 0.13 * k;          // …y el tronco gira al revés
  p.pelZ = c * 0.045 * k;
  p.pecX = -0.10 * k - Math.abs(c) * 0.05 * k;
  p.cueX = 0.09 * k;              // la cabeza compensa el rebote
}
/* la rodilla de UNA pierna: el pico grande del vuelo más el amortiguado de
   la carga —los quince grados que una rodilla dobla justo después de apoyar
   el talón—. Sin ese segundo, la pierna de apoyo queda RECTA todo el apoyo y
   el cuerpo se lee a zanco. */
function rodilla(f) {
  /* el vuelo va de f=π/2 (despegue) a f=3π/2 (apoyo del talón) y la rodilla
     pica cerca del 30 % del vuelo, o sea f≈2,4 */
  const v = Math.sin(f - 0.85);
  const vue = v > 0 ? Math.pow(v, 1.5) : 0;
  /* la carga es JUSTO DESPUÉS del talón (f≈5,1), no en el medio del apoyo:
     puesta en el medio la pierna de apoyo se dobla donde tiene que sostener
     y el cuerpo se hunde en la mitad del paso */
  const g = Math.sin(f - 3.53);
  const car = g > 0 ? Math.pow(g, 2.6) * 0.20 : 0;
  return vue + car;
}
POSE.camina = (p, t, v) => poseAndar(p, t, 0.62);
POSE.corre = (p, t, v) => {
  poseAndar(p, t, 1.0);
  p.pecX -= 0.16; p.cueX += 0.13;   // inclinado hacia adelante
  p.troX = -0.10;
};

/* el combo: cada golpe es CARGA (se junta) → ACTIVO (el latigazo) → FIN
   (la recuperación). `u` va de 0 a 1 sobre el golpe entero.                */
function poseTajo(p, u, lado, alto) {
  poseCero(p);
  const car = 0.28, act = 0.46;
  let k;
  if (u < car) k = -suav(u / car);                       // atrás
  else if (u < act) k = mez(-1, 1, suav((u - car) / (act - car)));
  else k = mez(1, 0, suav((u - act) / (1 - act)));
  const s = lado;
  p.pelY = -k * 0.42 * s; p.troY = -k * 0.34 * s; p.pecY = -k * 0.30 * s;
  p.cueY = k * 0.30 * s;                                 // mira lo que corta
  p.pecX = -0.10 - k * 0.14;
  p.hDX = 0.05 - 0.30 - k * 1.15 - alto * 0.55;
  p.hDZ = -0.16 - 0.50 * (1 - k) * s;
  p.aDX = -0.28 - 0.90 * (1 - Math.abs(k)) - 0.15;
  p.hIX = 0.05 + k * 0.42; p.hIZ = 0.16 + 0.30;
  p.aIX = -0.28 - 0.70;
  p.mIX = -k * 0.30 * s * 0.4; p.mDX = k * 0.30 * s * 0.4;
  p.alt = -Math.abs(k) * 0.045;
}
POSE.golpe0 = (p, u) => poseTajo(p, u, +1, 0);
POSE.golpe1 = (p, u) => poseTajo(p, u, -1, 0);
/* el tercero es de arriba abajo y no de costado: si los tres fueran el mismo
   tajo espejado, el remate no se leería como remate */
POSE.golpe2 = (p, u) => {
  poseCero(p);
  const car = 0.36, act = 0.54;
  let k;
  if (u < car) k = -suav(u / car);
  else if (u < act) k = mez(-1, 1, suav((u - car) / (act - car)));
  else k = mez(1, 0, suav((u - act) / (1 - act)));
  p.pecX = -0.14 + k * 0.52;
  p.troX = k * 0.24;
  p.cueX = 0.10 - k * 0.20;
  p.hDX = 0.05 - 1.05 - k * 1.95;   // de por encima de la cabeza al piso
  p.hDZ = -0.16 - 0.12;
  p.hIX = 0.05 - 0.85 - k * 1.55; p.hIZ = 0.16 + 0.12;
  p.aDX = -0.10 - Math.max(0, -k) * 0.55;
  p.aIX = -0.10 - Math.max(0, -k) * 0.55;
  p.mIX = -0.22 - k * 0.16; p.mDX = 0.30 + k * 0.10;
  p.pIX = 0.30; p.pDX = 0.16;
  p.alt = -0.06 - Math.max(0, k) * 0.16;
};

/* esquive: se agacha y se tira; el cuerpo se cierra, que es lo único que lo
   distingue de "caminar rápido" en un cuadro suelto */
POSE.esquiva = (p, u) => {
  poseCero(p);
  const k = Math.sin(u * Math.PI);
  p.alt = -k * 0.42;
  p.pecX = -k * 0.95; p.troX = -k * 0.30; p.cueX = k * 0.75;
  p.mIX = k * 1.20; p.mDX = k * 0.95;
  p.pIX = k * 1.55; p.pDX = k * 1.30;
  p.hIX = 0.05 - k * 0.75; p.hDX = 0.05 - k * 0.60;
  p.aIX = -0.28 - k * 1.35; p.aDX = -0.28 - k * 1.20;
};

/* ── LA RUEDA: UNA VUELTA ENTERA, Y EL PIVOTE ES LA CADERA ─────────────────
   La pelvis es la RAÍZ de todo el esqueleto —el torso y los dos muslos
   cuelgan de ella— así que girarla en X da un salto mortal del cuerpo entero
   sin tocar una sola articulación más. Lo único que hay que agregar es
   ENCOGERSE: girando estirado, la cabeza y los pies barren un metro de radio
   y a mitad de vuelta la mitad del cuerpo queda bajo tierra.
   EL SENTIDO SE DERIVA Y SE MIDE. Rx(θ) manda (0,1,0) a (0,cosθ,senθ): con θ
   positivo la coronilla se va hacia +Z, que es hacia adelante. Y la cadera
   BAJA mientras dura, porque un cuerpo hecho un ovillo tiene el centro a
   medio metro del piso y no a noventa y cuatro centímetros.                */
POSE.rueda = (p, u) => {
  poseCero(p);
  const t = lim(u, 0, 1);
  /* el ovillo entra en el primer cuarto y sale en el último: encogido de
     punta a punta, el arranque y la salida se ven a saltito y no a rueda */
  const o = suav(Math.min(1, t * 4.2)) * suav(Math.min(1, (1 - t) * 4.2));
  p.pelX = t * 6.283;
  p.alt = -0.46 * o;
  p.troX = -0.30 * o; p.pecX = -0.50 * o; p.cueX = 0.62 * o;
  p.mIX = -1.95 * o; p.mDX = -1.75 * o;      // rodillas al pecho
  p.pIX = 2.05 * o; p.pDX = 1.90 * o;        // y los talones a la cola
  p.hIX = 0.05 - 1.35 * o; p.hDX = 0.05 - 1.15 * o;
  p.hIZ = 0.16 + 0.30 * o; p.hDZ = -0.16 - 0.30 * o;
  p.aIX = -0.28 - 1.55 * o; p.aDX = -0.28 - 1.40 * o;
};

/* ── EL REMATE ─────────────────────────────────────────────────────────────
   Cuatro tiempos y el arma va de POR ENCIMA DE LA CABEZA AL PISO, que es lo
   único que hace que un golpe se lea a remate y no a un tajo más.
   EL ÁNGULO DEL HOMBRO NO SE TANTEA: el brazo cuelga por el −Y del hombro y
   Rx(θ) lo manda a (0,−cosθ,−senθ), así que la mano queda arriba con θ ≈ −π
   y abajo y adelante con θ ≈ −0,8. Los dos números salen de ahí y la
   medición los comprueba: `__H.medirPose('remate')` tiene que dar la mano
   BAJANDO más de un metro entre el aire y el impacto.                     */
POSE.remate = (p, u) => {
  poseCero(p);
  const T = J_REM_T, TT = T[0] + T[1] + T[2] + T[3];
  const a = T[0] / TT, b = (T[0] + T[1]) / TT, c = (T[0] + T[1] + T[2]) / TT;
  let sub, baja, gol, sal;
  if (u < a)      { sub = suav(u / a); baja = 0; gol = 0; sal = 0; }
  else if (u < b) { sub = 1; baja = suav((u - a) / (b - a)); gol = 0; sal = 0; }
  else if (u < c) { sub = 1; baja = 1; gol = suav((u - b) / (c - b)); sal = 0; }
  else            { sub = 1; baja = 1; gol = 1; sal = suav((u - c) / (1 - c)); }
  /* `k` es cuánto bajó el arma: 0 arriba de todo, 1 clavada en el piso. Sube
     mientras se salta y se cae —el arma se lleva atrás y arriba— y CAE ENTERA
     en los ciento veinte milisegundos del impacto. */
  const k = gol;
  const arr = (1 - sal);                       // se levanta del suelo al final
  /* el brazo del arma: de −2,95 (por encima de la cabeza) a −0,80 (al piso) */
  p.hDX = mez(-0.55, -2.95, sub * (1 - k * 0.02)) + k * 2.15;
  p.hIX = mez(-0.55, -2.75, sub) + k * 1.95;
  p.hDZ = -0.16 - 0.10 * (1 - k);
  p.hIZ = 0.16 + 0.10 * (1 - k);
  p.aDX = -0.10 - 0.45 * (1 - k) * sub;
  p.aIX = -0.10 - 0.45 * (1 - k) * sub;
  /* el tronco: se arquea hacia atrás juntando el golpe y se dobla al caer */
  p.pecX = mez(-0.05, -0.62, sub) * (1 - k) + k * 0.72;
  p.troX = mez(0, -0.24, sub) * (1 - k) + k * 0.30;
  p.cueX = mez(0, 0.34, sub) * (1 - k) + k * 0.18;   // mira lo que va a partir
  /* las piernas: encogidas en el aire y UNA RODILLA EN EL PISO al caer. Las
     dos rectas al aterrizar se leen a alguien que se cayó parado. */
  const air = sub * (1 - baja * 0.35) * (1 - k);
  p.mIX = -1.65 * air - k * 1.55 * arr; p.pIX = 1.85 * air + k * 1.90 * arr;
  p.mDX = -0.95 * air + k * 0.55 * arr; p.pDX = 1.10 * air + k * 0.30 * arr;
  p.alt = -0.10 * air - k * 0.46 * arr;
};

/* recibir: el tronco se va para atrás y los brazos se abren. Dura poco y por
   eso vale la pena que sea grande — un cuadro y medio de lectura */
POSE.dano = (p, u) => {
  poseCero(p);
  const k = Math.sin(Math.min(1, u) * Math.PI);
  p.pecX = k * 0.55; p.troX = k * 0.28; p.cueX = -k * 0.42;
  p.hIX = 0.05 + k * 0.85; p.hDX = 0.05 + k * 0.70;
  p.hIZ = 0.16 + k * 0.45; p.hDZ = -0.16 - k * 0.45;
  p.aIX = -0.28 - k * 0.35; p.aDX = -0.28 - k * 0.35;
  p.alt = -k * 0.10; p.pIX = k * 0.30; p.pDX = k * 0.22;
};

/* morirse: se DESARMA. Se le va la altura, se le abren las piernas y la
   cabeza cae al final — un fundido a invisible se lee a error de dibujo */
POSE.muere = (p, u) => {
  poseCero(p);
  const k = suav(Math.min(1, u));
  p.alt = -k * 1.05;
  p.pelX = k * 0.35; p.pecX = k * 0.95; p.troX = k * 0.55;
  p.cueX = -k * 0.30 + suav(Math.max(0, (u - 0.55) / 0.45)) * 1.35;
  p.mIX = -k * 1.45; p.mDX = -k * 1.15;
  p.pIX = k * 1.85; p.pDX = k * 1.55;
  p.hIX = 0.05 + k * 1.75; p.hDX = 0.05 + k * 1.55;
  p.hIZ = 0.16 + k * 0.60; p.hDZ = -0.16 - k * 0.60;
  p.pelZ = k * 0.42;
};

/* la carga del esqueleto: levanta el arma y SE QUEDA. El aviso es lo que
   hace justa la pelea, así que tiene que durar y verse desde atrás */
POSE.carga = (p, u) => {
  poseCero(p);
  const k = suav(Math.min(1, u));
  p.hDX = 0.05 - k * 2.35; p.hDZ = -0.16 - k * 0.30;
  p.aDX = -0.28 + k * 0.20;
  p.pecX = -k * 0.20; p.troY = k * 0.28; p.pelY = k * 0.20;
  p.cueX = k * 0.14;
  p.hIX = 0.05 - k * 0.55; p.hIZ = 0.16 + k * 0.42;
  p.alt = -k * 0.06;
};
POSE.tajo = (p, u) => poseTajo(p, u, +1, 0.35);

/* ── LA MEZCLA ─────────────────────────────────────────────────────────────
   Un corte entre dos poses se ve aunque el bicho esté a veinte metros. La
   mezcla es promediar las dos evaluaciones, que es todo lo que un crossfade
   es cuando las poses son funciones.                                       */
const _PA = poseCero({}), _PB = poseCero({});
function poseAplica(cuerpo, nom, arg, nom2, arg2, k) {
  POSE[nom](_PA, arg || 0);
  if (nom2 && k > 0.001) {
    POSE[nom2](_PB, arg2 || 0);
    for (const q in _PA) _PA[q] = mez(_PA[q], _PB[q], k);
  }
  const h = cuerpo.h, p = _PA;
  h.pelvis.position.y = cuerpo.baseY + p.alt;
  h.pelvis.rotation.set(p.pelX, p.pelY, p.pelZ);
  h.torso.rotation.set(p.troX, p.troY, p.troZ);
  h.pecho.rotation.set(p.pecX, p.pecY, p.pecZ);
  h.cuello.rotation.set(p.cueX, p.cueY, 0);
  h.hombroI.rotation.set(p.hIX, p.hIY, p.hIZ);
  h.hombroD.rotation.set(p.hDX, p.hDY, p.hDZ);
  h.anteI.rotation.x = p.aIX; h.anteD.rotation.x = p.aDX;
  h.musloI.rotation.x = p.mIX; h.musloD.rotation.x = p.mDX;
  h.pantI.rotation.x = p.pIX; h.pantD.rotation.x = p.pDX;
}

/* ── LA ZANCADA SE MIDE SOBRE EL PROPIO CICLO ──────────────────────────────
   `pasos/s = velocidad ÷ zancada`, y la zancada la trae la ANIMACIÓN: es
   cuánto barre el pie hacia atrás mientras está apoyado, por dos pasos que
   hay en un ciclo. Con un número escrito al lado, el pie patina en cuanto se
   toca la amplitud del ciclo — y eso no falla, se ve.                      */
const PASO_M = {};
function midePaso(nom) {
  const c = armaCuerpo(recetaHeroe());
  let mn = 1e9, mx = -1e9;
  const v = new THREE.Vector3();
  for (let i = 0; i <= 48; i++) {
    poseAplica(c, nom, i / 48 * Math.PI * 2, null, 0, 0);
    c.raiz.position.set(0, 0, 0); c.raiz.rotation.y = 0;
    c.raiz.updateMatrixWorld(true);
    v.set(0, -0.44, 0).applyMatrix4(c.h.pantI.matrixWorld);
    mn = Math.min(mn, v.z); mx = Math.max(mx, v.z);
  }
  return (mx - mn) * 2;          // dos pasos por ciclo
}
function midePasos() { PASO_M.camina = midePaso('camina'); PASO_M.corre = midePaso('corre'); }
/* la zancada de AHORA sale de mezclar las dos con la misma `k` con la que se
   mezclan las poses: si no, al pasar de caminar a correr el pie patina justo
   en la transición, que es cuando más se mira */
function zancada(k) { return mez(PASO_M.camina || 1.35, PASO_M.corre || 2.04, lim(k, 0, 1)); }
