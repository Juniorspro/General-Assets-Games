
/* ══════════════════════════ FUNDIR PIEZAS ══════════════════════════
   Una casa son veinte piezas y una cuadra son ocho casas. Sueltas, cada pieza
   es una llamada de dibujo, y con sombras se paga DOS veces porque la pasada de
   sombra vuelve a recorrer la escena entera. Fundidas por material, una cuadra
   cuesta ocho llamadas midan lo que midan sus doscientas piezas.

   Y FUNDE TAMBIÉN EL COLOR, EN LOS VÉRTICES. Ésa es la parte que hace que la
   fusión no cueste variedad: sin color por vértice, todas las casas de la
   cuadra tendrían que compartir el color del material —o sea que serían la
   misma casa repetida ocho veces— y la única salida sería un material por casa,
   que es exactamente lo que se estaba tratando de evitar. three.js multiplica
   `map × vertexColor × material.color`, así que el tinte por casa sale gratis.

   EL ÍNDICE VA EN Uint32 y no en Uint16: una cuadra pasa cómodo los 65.535
   vértices, y el desborde no avisa — dibuja triángulos que apuntan a cualquier
   lado. */
const _mF = new T.Matrix4(), _eF = new T.Euler(), _qF = new T.Quaternion(),
      _vF = new T.Vector3(), _sF = new T.Vector3(), _nF = new T.Matrix3(),
      _cF = new T.Color();
function fundir(piezas){
  if (!piezas.length) return null;
  let nv = 0, ni = 0;
  const prep = piezas.map(z => {
    const g = z.g;
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3),
        uv = new Float32Array(nv*2), col = new Float32Array(nv*3);
  const idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  piezas.forEach((z, k) => {
    const g = prep[k];
    const p = z.p || [0,0,0], r = z.r || [0,0,0], s = z.s || [1,1,1];
    _eF.set(r[0], r[1], r[2]); _qF.setFromEuler(_eF);
    _mF.compose(_vF.set(p[0], p[1], p[2]), _qF, _sF.set(s[0], s[1], s[2]));
    _nF.getNormalMatrix(_mF);
    _cF.set(z.c === undefined ? 0xffffff : z.c);
    const ap = g.attributes.position, an = g.attributes.normal, au = g.attributes.uv;
    for (let i = 0; i < ap.count; i++){
      _vF.fromBufferAttribute(ap, i).applyMatrix4(_mF);
      pos[(vo+i)*3] = _vF.x; pos[(vo+i)*3+1] = _vF.y; pos[(vo+i)*3+2] = _vF.z;
      if (an){ _vF.fromBufferAttribute(an, i).applyMatrix3(_nF).normalize();
        nor[(vo+i)*3] = _vF.x; nor[(vo+i)*3+1] = _vF.y; nor[(vo+i)*3+2] = _vF.z; }
      if (au){ uv[(vo+i)*2] = au.getX(i) * (z.u ? z.u[0] : 1);
               uv[(vo+i)*2+1] = au.getY(i) * (z.u ? z.u[1] : 1); }
      /* SI LA PIEZA YA TRAE COLOR POR VÉRTICE, SE MULTIPLICA en vez de
         pisarse: el cono del halo trae su degradado horneado y sin esto la
         fusión lo reemplazaría por un color plano, o sea que volvería a ser una
         pirámide sólida. */
      const ac = g.attributes.color;
      if (ac){
        col[(vo+i)*3] = _cF.r * ac.getX(i);
        col[(vo+i)*3+1] = _cF.g * ac.getY(i);
        col[(vo+i)*3+2] = _cF.b * ac.getZ(i);
      } else {
        col[(vo+i)*3] = _cF.r; col[(vo+i)*3+1] = _cF.g; col[(vo+i)*3+2] = _cF.b;
      }
    }
    if (g.index){ const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx[io+i] = gi[i] + vo;
      io += gi.length;
    } else { for (let i = 0; i < ap.count; i++) idx[io+i] = vo + i; io += ap.count; }
    vo += ap.count;
  });
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.BufferAttribute(nor, 3));
  out.setAttribute('uv', new T.BufferAttribute(uv, 2));
  out.setAttribute('color', new T.BufferAttribute(col, 3));
  out.setIndex(new T.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

/* ══════════════════════════ LA MEDIDA DEL BARRIO ══════════════════════════
   Cinco por cinco cuadras. Todo lo demás sale de tres números y por eso el
   barrio se puede agrandar cambiando uno solo: si las medidas estuvieran
   escritas cuadra por cuadra, mover una calle sería mover cien cosas. */
const CUADRAS = 5;
const LOTE = 44;        /* lo que mide una cuadra por dentro */
const CALLE = 9;        /* de cordón a cordón */
const VEREDA = 2.6;
const PASO = LOTE + CALLE;                 /* 53 m de eje a eje */
const LADO = CUADRAS * PASO + CALLE;       /* 274 m de punta a punta */
const MITAD = LADO / 2;
/* los ejes de las seis calles en cada sentido */
const EJES = [];
for (let i = 0; i <= CUADRAS; i++) EJES.push(-MITAD + CALLE/2 + i * PASO);

/* semilla fija: el barrio tiene que ser el MISMO en cada partida y en cada
   teléfono, porque si no «la casa de la esquina» deja de querer decir algo */
let SEM = 20260830;
function az(){ SEM = (SEM * 1664525 + 1013904223) % 4294967296; return SEM / 4294967296; }
const azr = (a, b) => a + az() * (b - a);
const azi = (a, b) => Math.floor(azr(a, b + 1));

const GRUPOS = [];      /* las veinticinco cuadras, para prenderlas y apagarlas */
const CASAS = [];       /* {x,z,w,d,rot} para el choque */
const FAROLES = [];     /* {x,z,y} */

/* ── EL TECHO A DOS AGUAS ──
   Un prisma triangular escrito a mano: ocho triángulos. Con una caja aplastada
   el techo se lee a tapa, y con una pirámide de cuatro lados se lee a torre —
   lo que hace que una casa parezca una casa es el gablete. */
function geoGablete(w, d, h){
  const x = w/2, z = d/2;
  const v = [
    -x,0,-z,  x,0,-z,  x,0,z,  -x,0,z,        /* base */
    0,h,-z,   0,h,z                            /* la cumbrera */
  ];
  const f = [ 0,1,4,  1,2,5,  1,5,4,  2,3,5,  3,0,4,  3,4,5,  0,3,2,  0,2,1 ];
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
  g.setIndex(f);
  g.computeVertexNormals();
  /* SIN UV UNA TEXTURA NO FALLA NI AVISA: WebGL le pasa (0,0) al atributo que
     falta y el techo entero sale pintado con UN SOLO texel, o sea de un color
     plano. Ya costó una vuelta con el túnel de LEMI. Se proyectan sobre el
     plano XZ, que para un techo es lo correcto. */
  const p = g.attributes.position, uv = new Float32Array(p.count*2);
  for (let i = 0; i < p.count; i++){
    uv[i*2] = (p.getX(i) + x) / 2.2;
    uv[i*2+1] = (p.getZ(i) + z + p.getY(i)) / 2.2;
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  return g;
}

/* ── LA PIRÁMIDE DEL TECHO A CUATRO AGUAS ──
   Base de dos por dos en y=0 y punta en y=1, así que escalándola por
   `[ancho/2, alto, fondo/2]` queda del tamaño que se pida. Escrita a mano y no
   con un `ConeGeometry` de cuatro lados porque ése nace centrado en su altura y
   girado cuarenta y cinco grados: acomodarlo son dos correcciones que hay que
   acordarse cada vez que se lo use. */
function geoPiramide(){
  const v = [-1,0,-1,  1,0,-1,  1,0,1,  -1,0,1,  0,1,0];
  const f = [0,1,4, 1,2,4, 2,3,4, 3,0,4, 0,3,2, 0,2,1];
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
  g.setIndex(f);
  g.computeVertexNormals();
  const p = g.attributes.position, uv = new Float32Array(p.count*2);
  for (let i = 0; i < p.count; i++){
    uv[i*2] = (p.getX(i) + 1) * 0.5;
    uv[i*2+1] = (p.getZ(i) + 1 + p.getY(i)*1.4) * 0.5;
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  return g;
}

const geoCaja = new T.BoxGeometry(1, 1, 1);
const geoPlano = new T.PlaneGeometry(1, 1);
const geoCil = new T.CylinderGeometry(0.5, 0.5, 1, 8);

/* los colores de las casas: apagados y con poca saturación, porque de noche y
   bajo un farol naranja cualquier color vivo se va a marrón o a lila */
const COLORES_CASA = [0x9aa0a6, 0xb0a89a, 0x8e9aa4, 0xa89c92, 0x94a09a,
                      0xa9a2ae, 0x9c9184, 0x87919c];
const COLORES_TECHO = [0x6a7079, 0x5e6b74, 0x74697a, 0x6b6a5e];
const COLORES_CERCA = [0x7a6d5a, 0x6e6f68, 0x86745e, 0x5f6a64];

const COLORES_PUERTA = [0x5a3b2a, 0x2f4638, 0x3a3f52, 0x6a2d2a, 0x4a4340];

/* ══════════════════════════ UNA CASA ══════════════════════════
   Se arma MIRANDO A −Z y se la rota al colocarla. Escribirla cuatro veces —una
   por cada lado de la cuadra— es la forma más rápida de que tres de los cuatro
   lados terminen con la puerta contra el patio de atrás.

   Y ESTÁ HECHA DE LO QUE SE MIRA. La primera versión era una caja, un techo a
   dos aguas y dos ventanas: de lejos pasaba, y de cerca —que es donde uno
   camina— era una caja. Lo que hace que una casa se lea a casa no es el volumen
   grande sino los BORDES: el alero que sobresale y tira su sombra, la fascia
   blanca debajo, el zócalo de ladrillo que la apoya en el suelo, el alféizar de
   cada ventana, la canaleta y su bajada. Son piezas de diez centímetros y son
   las únicas que se ven a tres metros. */
function armaCasa(P, ancho, fondo){
  const pisos = az() < 0.36 ? 2 : 1;
  const hPiso = 3.05;
  const h = pisos * hPiso;
  const cCasa = COLORES_CASA[azi(0, COLORES_CASA.length-1)];
  const cTecho = COLORES_TECHO[azi(0, COLORES_TECHO.length-1)];
  const cPuerta = COLORES_PUERTA[azi(0, COLORES_PUERTA.length-1)];
  const w = ancho, d = fondo;
  const base = 0.55;                 /* el zócalo, o sea a qué altura está el piso */
  const ALERO = 0.55;

  /* EL ZÓCALO DE LADRILLO. Sin él la casa nace del pasto, y una casa que nace
     del pasto se lee a caja apoyada encima. */
  P.ladrillo.push({ g: geoCaja, p:[0, base/2, 0], s:[w+0.22, base, d+0.22], u:[(w+0.22)/METROS.ladrillo, base/METROS.ladrillo] });
  /* los muros */
  P.pared.push({ g: geoCaja, p:[0, base + h/2, 0], s:[w, h, d], c: cCasa, u:[w/METROS.tabla, h/METROS.tabla] });

  /* ── EL TECHO ──
     Tres formas y las tres con ALERO: el vuelo del techo por fuera de la pared
     es lo que hace la sombra horizontal debajo del borde, y esa sombra es el
     rasgo que más dice «casa» de todos. Un techo al ras se lee a maqueta. */
  const yT = base + h;
  const tipo = az();
  const hT = pisos === 2 ? azr(1.9, 2.4) : azr(2.2, 2.9);
  if (tipo < 0.42){          /* dos aguas con el gablete al frente */
    P.techo.push({ g: geoGablete(w + ALERO*2, d + ALERO*2, hT), p:[0, yT, 0], c: cTecho, u:[1/METROS.teja, 1/METROS.teja] });
    /* el frontón: el triángulo de pared que queda bajo el gablete, y va del
       color de la casa y no del techo */
    P.pared.push({ g: geoGablete(w, 0.16, hT*0.94), p:[0, yT, 0], c: cCasa, u:[1/METROS.tabla, 1/METROS.tabla] });
  } else if (tipo < 0.74){   /* dos aguas con la cumbrera a lo largo */
    P.techo.push({ g: geoGablete(d + ALERO*2, w + ALERO*2, hT), p:[0, yT, 0], r:[0, Math.PI/2, 0], c: cTecho, u:[1/METROS.teja, 1/METROS.teja] });
    P.pared.push({ g: geoGablete(d, 0.16, hT*0.94), p:[0, yT, 0], r:[0, Math.PI/2, 0], c: cCasa, u:[1/METROS.tabla, 1/METROS.tabla] });
  } else {                   /* a cuatro aguas */
    P.techo.push({ g: geoPiramide(), p:[0, yT, 0],
                   s:[(w + ALERO*2)/2, hT, (d + ALERO*2)/2], c: cTecho,
                   u:[(w + ALERO*2)/METROS.teja, (d + ALERO*2)/METROS.teja] });
  }
  /* LA FASCIA: la tabla blanca que cierra el canto del alero. Es lo que separa
     el techo de la pared cuando los dos están en penumbra. */
  for (const sz of [-1, 1])
    P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[0, yT + 0.07, sz*(d/2 + ALERO)], s:[w + ALERO*2, 0.17, 0.09] });
  for (const sx of [-1, 1])
    P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[sx*(w/2 + ALERO), yT + 0.07, 0], s:[0.09, 0.17, d + ALERO*2] });
  /* LA CANALETA Y SU BAJADA. Una casa con lluvia y sin canaleta es una casa a
     la que no le llueve nunca. */
  P.carp.push({ c: C_MARCO,  g: geoCaja, p:[0, yT - 0.06, -(d/2 + ALERO - 0.05)], s:[w + ALERO*1.6, 0.11, 0.13] });
  const bx = (az() < 0.5 ? -1 : 1) * (w/2 + ALERO - 0.16);
  P.carp.push({ c: C_MARCO,  g: geoCaja, p:[bx, base + h/2, -(d/2 + 0.10)], s:[0.10, h, 0.10] });

  /* ── LA PUERTA, EL PORCHE Y LOS ESCALONES ──
     Y LOS ESCALONES NO SON UN DETALLE: el piso de la casa está a cincuenta y
     cinco centímetros del pasto por el zócalo, así que sin escalones la puerta
     queda flotando y el porche es una repisa. */
  const px = azr(-w*0.18, w*0.18);
  const anchoP = Math.min(w*0.62, 4.6);
  const fondoP = 2.0;
  const zP = -(d/2 + fondoP/2);
  P.vereda.push({ g: geoCaja, p:[px, base/2 + 0.03, zP], s:[anchoP, base + 0.06, fondoP], u:[anchoP/METROS.vereda, fondoP/METROS.vereda] });
  for (let k = 0; k < 3; k++)
    P.vereda.push({ g: geoCaja, p:[px, base*(k+0.5)/3, -(d/2 + fondoP + 0.16*(3-k) - 0.08)],
                    s:[1.55, base*(k+1)/3, 0.34], u:[1.55/METROS.vereda, 0.34/METROS.vereda] });
  /* el techito del porche y sus columnas */
  const yPor = base + 2.42;
  P.techo.push({ g: geoCaja, p:[px, yPor, zP - 0.12], s:[anchoP + 0.5, 0.16, fondoP + 0.5], c: cTecho, u:[anchoP/METROS.teja, fondoP/METROS.teja] });
  P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[px, yPor - 0.13, zP - 0.12 - (fondoP + 0.5)/2], s:[anchoP + 0.5, 0.14, 0.08] });
  for (const sx of [-1, 1]){
    const cxp = px + sx*(anchoP/2 - 0.16);
    P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[cxp, base + 1.2, zP - fondoP/2 + 0.18], s:[0.15, 2.4, 0.15] });
    /* la baranda: dos travesaños y el pasamanos */
    if (az() < 0.7){
      P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[cxp, base + 0.92, zP], s:[0.09, 0.07, fondoP - 0.1] });
      P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[cxp, base + 0.50, zP], s:[0.07, 0.06, fondoP - 0.1] });
    }
  }
  P.puerta.push({ g: geoCaja, p:[px, base + 1.08, -(d/2 + 0.07)], s:[1.0, 2.16, 0.12], c: cPuerta });
  P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[px, base + 1.08, -(d/2 + 0.10)], s:[1.20, 2.36, 0.07] });
  /* el picaporte y el número, que son lo más chico que hay y lo que dice que
     acá vive alguien */
  P.carp.push({ c: C_MARCO,  g: geoCaja, p:[px + 0.36, base + 1.02, -(d/2 + 0.15)], s:[0.09, 0.09, 0.09] });
  P.emisivo.push({ c: C_NUM,  g: geoCaja, p:[px + anchoP/2 - 0.30, base + 1.95, -(d/2 + 0.13)], s:[0.30, 0.14, 0.05] });

  /* ── EL GARAJE ──
     Una de cada tres. Y cuando lo hay, la entrada de auto va a parar acá: una
     entrada que muere contra una pared lisa es una entrada que no lleva a
     ningún lado. */
  const garaje = az() < 0.34 && w > 10.2;
  const gx = px > 0 ? -(w/2 - 1.9) : (w/2 - 1.9);
  if (garaje){
    P.puerta.push({ g: geoCaja, p:[gx, base + 1.15, -(d/2 + 0.06)], s:[3.3, 2.30, 0.12], c: 0x8b8b8b });
    for (let k = 0; k < 5; k++)
      P.carp.push({ c: C_MARCO,  g: geoCaja, p:[gx, base + 0.14 + k*0.46, -(d/2 + 0.13)], s:[3.34, 0.05, 0.04] });
    P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[gx, base + 1.15, -(d/2 + 0.16)], s:[3.55, 2.52, 0.08] });
  }

  /* ── LAS VENTANAS ──
     Cada una lleva marco, cruceros, alféizar y a veces postigos. El alféizar es
     la pieza que más se nota: es lo único que sobresale de la pared y por eso
     es lo único que atrapa la luz de un farol de costado. */
  const ponVentana = (x, y, z, aw, ah, eje) => {
    const encendida = az() < 0.15;
    const tele = encendida && az() < 0.28;
    const n = eje === 'x';
    const S = (bx2, by, bz) => n ? [bz, by, bx2] : [bx2, by, bz];
    P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[x, y, z], s: S(aw + 0.20, ah + 0.20, 0.11) });
    const cap = encendida ? P.emisivo : P.vidrio;
    const cLuz = tele ? C_TV : C_VENT;
    cap.push({ g: geoCaja, p:[x + (n ? 0.04 : 0), y, z - (n ? 0 : 0.04)], s: S(aw, ah, 0.08), c: cLuz });
    P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[x + (n ? 0.06 : 0), y, z - (n ? 0 : 0.06)], s: S(0.06, ah, 0.05) });
    P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[x + (n ? 0.06 : 0), y, z - (n ? 0 : 0.06)], s: S(aw, 0.06, 0.05) });
    /* el alféizar, que sobresale */
    P.carp.push({ c: C_BLANCO,  g: geoCaja, p:[x + (n ? 0.06 : 0), y - ah/2 - 0.12, z - (n ? 0 : 0.06)], s: S(aw + 0.34, 0.09, 0.20) });
    if (az() < 0.42) for (const sg of [-1, 1])
      P.madera.push({ g: geoCaja, p: n ? [x + 0.03, y, z + sg*(aw/2 + 0.20)] : [x + sg*(aw/2 + 0.20), y, z - 0.03],
                      s: S(0.34, ah + 0.10, 0.06), c: cCasa, u:[0.34/METROS.tabla, (ah+0.1)/METROS.tabla] });
  };
  const yv = base + 1.55;
  const zf = -(d/2 + 0.02);
  if (!garaje || gx > 0) ponVentana(-w*0.30, yv, zf, 1.25, 1.45, 'z');
  if (!garaje || gx < 0) ponVentana( w*0.30, yv, zf, 1.25, 1.45, 'z');
  if (pisos === 2){
    ponVentana(-w*0.29, yv + hPiso, zf, 1.05, 1.20, 'z');
    ponVentana( w*0.29, yv + hPiso, zf, 1.05, 1.20, 'z');
    if (az() < 0.5) ponVentana(0, yv + hPiso, zf, 0.95, 1.10, 'z');
  }
  for (const sx of [-1, 1]) if (az() < 0.8){
    ponVentana(sx*(w/2 + 0.02), yv, azr(-d*0.26, d*0.20), 1.05, 1.25, 'x');
    if (pisos === 2 && az() < 0.7)
      ponVentana(sx*(w/2 + 0.02), yv + hPiso, azr(-d*0.26, d*0.20), 0.95, 1.10, 'x');
  }

  /* la chimenea, con su capucha */
  if (az() < 0.5){
    const chx = azr(-w*0.28, w*0.28), chz = azr(-d*0.16, d*0.24);
    P.ladrillo.push({ g: geoCaja, p:[chx, yT + hT*0.55, chz], s:[0.78, hT*1.5, 0.72], u:[0.78/METROS.ladrillo, hT*1.5/METROS.ladrillo] });
    P.carp.push({ c: C_MARCO,  g: geoCaja, p:[chx, yT + hT*1.32, chz], s:[0.94, 0.10, 0.88] });
  }
  /* el aire acondicionado o los tachos, contra el costado */
  if (az() < 0.55){
    const sx = az() < 0.5 ? -1 : 1;
    P.carp.push({ c: C_MARCO,  g: geoCaja, p:[sx*(w/2 + 0.42), 0.32, azr(-d*0.2, d*0.2)], s:[0.72, 0.64, 0.72] });
  }
  return { h: base + h + hT, w, d, px, gx: garaje ? gx : null, anchoP, fondoP };
}

/* ══════════════════════════ UN LOTE ══════════════════════════
   La casa, el jardín, la entrada de auto, la vereda de acceso y las cercas, en
   un marco LOCAL: `u` corre a lo largo de la calle y `v` entra en la cuadra.
   Todo lo del lote se escribe una sola vez en ese marco y se lo lleva al mundo
   con la base del lado que toque, así que las cuatro orientaciones salen del
   mismo código. Escribirlo cuatro veces —que es lo que hacía la versión
   anterior con dos— es la forma más rápida de que tres de los cuatro lados
   terminen con la puerta contra el patio. */
const JARDIN = 5.4;
const COLIS = [];
/* los cuatro lados de una cuadra: `u` a lo largo, `v` hacia adentro, y cuánto
   hay que girar la casa para que mire a la calle */
const LADOS = [
  { ux: 1, uz: 0, vx: 0, vz: 1, rot: 0 },              /* norte: mira a −Z */
  { ux:-1, uz: 0, vx: 0, vz:-1, rot: Math.PI },        /* sur */
  { ux: 0, uz:-1, vx: 1, vz: 0, rot: Math.PI/2 },      /* oeste: mira a −X */
  { ux: 0, uz: 1, vx:-1, vz: 0, rot:-Math.PI/2 }       /* este */
];

function armaLote(P, L, ox, oz, anchoLote, fondoLote, conVecinoIzq){
  const mundo = (u, v) => [ox + L.ux*u + L.vx*v, oz + L.uz*u + L.vz*v];
  /* una caja del marco local al mundo: `au` es su medida a lo largo y `av` la
     que entra, y girar noventa grados las intercambia */
  const caja = (cap, u, v, y, au, ah, av, c, uu) => {
    const [x, z] = mundo(u, v);
    cap.push({ g: geoCaja, p:[x, y, z], r:[0, L.rot, 0], s:[au, ah, av], c, u: uu });
    return [x, z];
  };
  const colis = (u, v, au, av) => {
    const [x, z] = mundo(u, v);
    const ex = Math.abs(L.ux)*au/2 + Math.abs(L.vx)*av/2;
    const ez = Math.abs(L.uz)*au/2 + Math.abs(L.vz)*av/2;
    COLIS.push({ x0: x - ex, x1: x + ex, z0: z - ez, z1: z + ez });
  };

  const a = azr(9.8, 12.2), d = azr(7.6, 9.6);
  const vCasa = JARDIN + d/2;
  const [cx, cz] = mundo(0, vCasa);

  const sub = { pared:[], techo:[], ladrillo:[], vidrio:[], emisivo:[],
                carp:[], puerta:[], madera:[], vereda:[], verde:[] };
  const info = armaCasa(sub, a, d);
  const co = Math.cos(L.rot), si = Math.sin(L.rot);
  for (const cap of Object.keys(sub)) for (const z of sub[cap]){
    const p = z.p || [0,0,0];
    z.p = [cx + p[0]*co + p[2]*si, p[1], cz - p[0]*si + p[2]*co];
    z.r = [(z.r||[0,0,0])[0], (z.r||[0,0,0])[1] + L.rot, (z.r||[0,0,0])[2]];
    P[cap].push(z);
  }
  CASAS.push({ x: cx, z: cz, w: a, d, rot: L.rot });
  colis(0, vCasa, a + 0.4, d + 0.4);
  /* y el porche, que sobresale y en el que uno se choca igual */
  colis(info.px, JARDIN - info.fondoP/2, info.anchoP + 0.3, info.fondoP + 0.3);

  /* ── LA VEREDA DE ACCESO ──
     De la puerta del cerco a los escalones del porche. Es la pieza que CONECTA
     la casa con la calle: sin ella el cerco tiene una puerta que da al pasto y
     el porche unos escalones que bajan a la nada. */
  caja(P.vereda, info.px, JARDIN/2, 0.155, 1.30, 0.02, JARDIN + 0.6, undefined, [1.30/METROS.vereda, (JARDIN+0.6)/METROS.vereda]);

  /* ── LA ENTRADA DE AUTO ──
     Va del cordón al garaje si lo hay, y si no al costado de la casa. Una
     entrada que muere contra una pared lisa no lleva a ningún lado. */
  const du = info.gx !== null ? info.gx : (info.px > 0 ? -(a/2 + 1.7) : (a/2 + 1.7));
  const largoD = info.gx !== null ? (JARDIN + 0.6) : (JARDIN + 2.6);
  caja(P.vereda, du, largoD/2 - 0.3, 0.152, 3.2, 0.02, largoD, undefined, [3.2/METROS.vereda, largoD/METROS.vereda]);

  /* ── LAS CERCAS ──
     Postes cada dos metros y medio, dos travesaños y un paño de piquetes
     recortado con alfa. La puerta del frente cae EXACTAMENTE sobre la vereda de
     acceso: un portón corrido de la vereda es lo que hace que un barrio se vea
     generado. */
  const cCerca = COLORES_CERCA[azi(0, COLORES_CERCA.length-1)];
  const hC = 1.12;
  const tramo = (u0, u1, v0, v1) => {
    const du2 = u1 - u0, dv = v1 - v0;
    const largo = Math.hypot(du2, dv);
    if (largo < 0.4) return;
    const um = (u0+u1)/2, vm = (v0+v1)/2;
    const alo = Math.abs(du2) > Math.abs(dv);      /* corre a lo largo o hacia adentro */
    const [x, z] = mundo(um, vm);
    const rr = L.rot + (alo ? 0 : Math.PI/2);
    /* el paño: un plano con la textura de piquetes */
    P.piquete.push({ g: geoPlano, p:[x, 0.15 + hC*0.46, z], r:[0, rr, 0],
                     s:[largo, hC*0.92, 1], c: cCerca, u:[largo/METROS.piquete, 1] });
    /* los travesaños, por detrás */
    for (const yy of [0.15 + hC*0.24, 0.15 + hC*0.72])
      P.madera.push({ g: geoCaja, p:[x, yy, z], r:[0, rr, 0],
                      s:[largo, 0.075, 0.055], c: cCerca, u:[largo/METROS.madera, 1] });
    /* los postes, cada 2,5 m y siempre uno en cada punta */
    const n = Math.max(1, Math.round(largo / 2.5));
    for (let k = 0; k <= n; k++){
      const t = k/n;
      const [px2, pz2] = mundo(u0 + du2*t, v0 + dv*t);
      P.madera.push({ g: geoCaja, p:[px2, 0.15 + hC*0.55, pz2], r:[0, rr, 0],
                      s:[0.115, hC*1.10, 0.115], c: cCerca, u:[0.115/METROS.madera, hC*1.1/METROS.madera] });
      P.carp.push({ c: C_MARCO,  g: geoCaja, p:[px2, 0.15 + hC*1.10, pz2], r:[0, rr, 0], s:[0.155, 0.06, 0.155] });
    }
    const ex = Math.abs(mundo(u1,v1)[0] - mundo(u0,v0)[0])/2 + 0.16;
    const ez = Math.abs(mundo(u1,v1)[1] - mundo(u0,v0)[1])/2 + 0.16;
    COLIS.push({ x0: x - ex, x1: x + ex, z0: z - ez, z1: z + ez });
  };
  const mu = anchoLote/2 - 0.10;
  const vF = 0.42, vFondo = fondoLote - 0.5;
  /* frente, con el hueco de la puerta centrado en la vereda de acceso */
  tramo(-mu, info.px - 0.75, vF, vF);
  tramo(info.px + 0.75, mu, vF, vF);
  /* los dos postes del portón, más altos: es lo que hace que se lea a entrada */
  for (const sg of [-1, 1]){
    const [gx2, gz2] = mundo(info.px + sg*0.75, vF);
    P.madera.push({ g: geoCaja, p:[gx2, 0.15 + hC*0.72, gz2], r:[0, L.rot, 0],
                    s:[0.15, hC*1.44, 0.15], c: cCerca, u:[0.15/METROS.madera, hC*1.44/METROS.madera] });
    P.carp.push({ c: C_MARCO,  g: geoCaja, p:[gx2, 0.15 + hC*1.46, gz2], r:[0, L.rot, 0], s:[0.20, 0.07, 0.20] });
  }
  /* medianera: SÓLO la de un lado, porque la del otro la pone el vecino. Con
     las dos, cada límite entre lotes queda con dos cercas superpuestas — y eso
     no se ve como una cerca más gruesa, se ve como un parpadeo entre dos planos
     que pelean el mismo píxel. */
  if (conVecinoIzq) tramo(-mu, -mu, vF, vFondo);
  /* y el fondo del lote */
  tramo(-mu, mu, vFondo, vFondo);

  /* el buzón, al lado del portón y sobre la vereda */
  const [bx2, bz2] = mundo(info.px - 1.55, 0.05);
  P.madera.push({ g: geoCil, p:[bx2, 0.15 + 0.55, bz2], s:[0.085, 1.1, 0.085], c: 0x6a6055 });
  P.carp.push({ c: C_MARCO,  g: geoCaja, p:[bx2, 0.15 + 1.24, bz2], r:[0, L.rot, 0], s:[0.42, 0.22, 0.26] });

  /* un árbol o un arbusto en el jardín */
  if (az() < 0.55){
    const [tx, tz] = mundo(info.px + (az() < 0.5 ? -1 : 1) * azr(2.6, mu - 0.6), azr(1.6, JARDIN - 1.2));
    const th = azr(4.4, 7.2);
    P.verde.push({ c: C_TRONCO,  g: geoCil, p:[tx, 0.15 + th*0.30, tz], s:[0.34, th*0.60, 0.34] });
    P.verde.push({ c: C_COPA,  g: new T.ConeGeometry(azr(1.8, 2.7), th*0.78, 7), p:[tx, 0.15 + th*0.74, tz] });
    COLIS.push({ x0: tx - 0.38, x1: tx + 0.38, z0: tz - 0.38, z1: tz + 0.38 });
  }
  for (let k = 0; k < 2; k++) if (az() < 0.6){
    const [ax, azz] = mundo(azr(-mu + 0.6, mu - 0.6), azr(0.9, JARDIN - 0.8));
    P.verde.push({ c: C_COPA,  g: new T.SphereGeometry(azr(0.42, 0.72), 6, 4), p:[ax, 0.15 + 0.42, azz] });
  }
}

/* ══════════════════════════ UNA CUADRA ══════════════════════════
   `lados` dice cuáles de los cuatro lados llevan casas. Las veinticinco de
   adentro llevan norte y sur —tres y tres— y las del BORDE llevan sólo el lado
   que mira a la calle.

   POR QUÉ HAY CUADRAS DE BORDE: sin ellas, parado en la calle exterior y
   mirando hacia afuera no hay NADA — el barrio termina en un plano de asfalto y
   niebla, y eso se lee a maqueta recortada. Con una vuelta de casas más y una
   línea de árboles detrás, el barrio se cierra: para donde uno mire hay
   vecindario, que es exactamente lo que se pidió. Y no cuestan lo que
   parecería, porque sólo se ven de un lado y el apagado por distancia se las
   come apenas uno se mete dos cuadras adentro. */
function ejeDe(i){ return -MITAD + CALLE/2 + i * PASO; }

function armaCuadra(bi, bj, lados){
  const x0 = ejeDe(bi) + CALLE/2, z0 = ejeDe(bj) + CALLE/2;
  const x1 = x0 + LOTE, z1 = z0 + LOTE;
  const cx = (x0 + x1)/2, cz = (z0 + z1)/2;
  const P = { pared:[], techo:[], ladrillo:[], vidrio:[], emisivo:[],
              carp:[], puerta:[], madera:[], piquete:[], vereda:[],
              pasto:[], verde:[] };

  const vy = 0.15;
  const li = LOTE - VEREDA*2;
  /* LA VEREDA VA SÓLO DONDE HAY CALLE. En una cuadra de borde, tres de sus
     cuatro lados dan al campo: poner vereda ahí sería una vereda que no lleva a
     ningún lado y que encima delata que la cuadra está cortada. */
  const conCalle = [ bj >= 0 && bj <= CUADRAS, bj >= -1 && bj < CUADRAS,
                     bi >= 0 && bi <= CUADRAS, bi >= -1 && bi < CUADRAS ];
  if (conCalle[0]) P.vereda.push({ g: geoCaja, p:[cx, vy/2, z0 + VEREDA/2], s:[LOTE, vy, VEREDA], u:[LOTE/METROS.vereda, VEREDA/METROS.vereda] });
  if (conCalle[1]) P.vereda.push({ g: geoCaja, p:[cx, vy/2, z1 - VEREDA/2], s:[LOTE, vy, VEREDA], u:[LOTE/METROS.vereda, VEREDA/METROS.vereda] });
  if (conCalle[2]) P.vereda.push({ g: geoCaja, p:[x0 + VEREDA/2, vy/2, cz], s:[VEREDA, vy, LOTE - VEREDA*2], u:[VEREDA/METROS.vereda, (LOTE-VEREDA*2)/METROS.vereda] });
  if (conCalle[3]) P.vereda.push({ g: geoCaja, p:[x1 - VEREDA/2, vy/2, cz], s:[VEREDA, vy, LOTE - VEREDA*2], u:[VEREDA/METROS.vereda, (LOTE-VEREDA*2)/METROS.vereda] });
  /* el césped, apenas por encima: dos planos a la misma altura pelean por el
     mismo píxel y parpadean */
  P.pasto.push({ g: geoPlano, p:[cx, vy + 0.012, cz], r:[-Math.PI/2, 0, 0], s:[li, li, 1], u:[li/METROS.pasto, li/METROS.pasto] });

  const anchoLote = li / 3, fondoLote = li / 2;
  for (const s of lados){
    const L = LADOS[s];
    for (let k = 0; k < 3; k++){
      const t = anchoLote * (k + 0.5) - li/2;
      let ox, oz;
      if (s === 0){ ox = cx + t; oz = z0 + VEREDA; }
      else if (s === 1){ ox = cx - t; oz = z1 - VEREDA; }
      else if (s === 2){ ox = x0 + VEREDA; oz = cz - t; }
      else { ox = x1 - VEREDA; oz = cz + t; }
      armaLote(P, L, ox, oz, anchoLote, fondoLote, k > 0);
    }
  }

  const g = new T.Group();
  const pon = (piezas, mat, sombra) => {
    const geo = fundir(piezas);
    if (!geo) return;
    const m = new T.Mesh(geo, mat);
    m.castShadow = !!sombra; m.receiveShadow = true;
    g.add(m);
  };
  pon(P.vereda, matVereda, false);
  pon(P.pasto, matPasto, false);
  pon(P.pared, matPared, true);
  pon(P.ladrillo, matLadrilloV, true);
  pon(P.techo, matTechoV, true);
  pon(P.carp, matCarp, true);
  pon(P.puerta, matPuertaV, false);
  pon(P.vidrio, matVidrio, false);
  pon(P.emisivo, matEmisivo, false);
  pon(P.madera, matMaderaV, true);
  pon(P.piquete, matPiquete, true);
  pon(P.verde, matVerde, true);
  g.userData.cx = cx; g.userData.cz = cz;
  escena.add(g);
  GRUPOS.push(g);
  return { casas: lados.length * 3 };
}

/* ══════════════════════════ LO QUE HAY DETRÁS DEL BORDE ══════════════════════════
   Una franja de árboles y matorral pegada a la última fila de casas. No es
   decoración: es lo que TAPA el final del mundo. Con la niebla sola, mirando
   hacia afuera desde la calle exterior se ve el plano de asfalto perdiéndose en
   gris — y un plano que se pierde en gris se lee a que ahí se acabó el juego.
   Con los árboles, lo que hay detrás del barrio es más barrio que no se ve. */
function armaArboleda(){
  const tronco = [], copa = [];
  const borde = MITAD + LOTE;
  for (let k = 0; k < 900; k++){
    const lado = azi(0, 3);
    let x, z;
    const t = azr(-borde - 6, borde + 6), p2 = azr(1.5, 26);
    if (lado === 0){ x = t; z = -borde - p2; }
    else if (lado === 1){ x = t; z = borde + p2; }
    else if (lado === 2){ x = -borde - p2; z = t; }
    else { x = borde + p2; z = t; }
    const h = azr(5.5, 11.5);
    tronco.push({ g: geoCil, p:[x, h*0.28, z], s:[0.36, h*0.56, 0.36], c: C_TRONCO });
    copa.push({ g: new T.ConeGeometry(azr(2.0, 3.4), h*0.82, 6), p:[x, h*0.72, z], c: C_COPA });
  }
  const m1 = new T.Mesh(fundir(tronco.concat(copa)), matVerde);
  m1.receiveShadow = true;
  escena.add(m1);
  ARBOLEDA.push(m1);
}
const ARBOLEDA = [];
