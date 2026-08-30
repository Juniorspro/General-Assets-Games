
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

const geoCaja = new T.BoxGeometry(1, 1, 1);
const geoPlano = new T.PlaneGeometry(1, 1);
const geoCil = new T.CylinderGeometry(0.5, 0.5, 1, 8);

/* los colores de las casas: apagados y con poca saturación, porque de noche y
   bajo un farol naranja cualquier color vivo se va a marrón o a lila */
const COLORES_CASA = [0x9aa0a6, 0xb0a89a, 0x8e9aa4, 0xa89c92, 0x94a09a,
                      0xa9a2ae, 0x9c9184, 0x87919c];
const COLORES_TECHO = [0x6a7079, 0x5e6b74, 0x74697a, 0x6b6a5e];
const COLORES_CERCA = [0x7a6d5a, 0x6e6f68, 0x86745e, 0x5f6a64];

/* ── UNA CASA ──
   Devuelve las piezas ya colocadas en el marco de la cuadra. Está escrita para
   que la casa MIRE a −Z y se la rota al colocarla: escribirla cuatro veces, una
   por cada lado de la cuadra, es la forma más rápida de que tres de los cuatro
   lados terminen con la puerta contra el jardín de atrás. */
function armaCasa(P, ancho, fondo){
  const dosPisos = az() < 0.34;
  const h = dosPisos ? 5.8 : 3.3;
  const cCasa = COLORES_CASA[azi(0, COLORES_CASA.length-1)];
  const cTecho = COLORES_TECHO[azi(0, COLORES_TECHO.length-1)];
  const w = ancho, d = fondo;

  P.pared.push({ g: geoCaja, p:[0, h/2, 0], s:[w, h, d], c: cCasa, u:[w/1.9, h/1.9] });
  /* el zócalo de ladrillo: media casa de un barrio así lo tiene, y es lo que
     apoya la casa en el suelo en vez de dejarla flotando sobre el pasto */
  P.ladrillo.push({ g: geoCaja, p:[0, 0.28, 0], s:[w+0.16, 0.56, d+0.16], c: 0xffffff, u:[w/1.2, 0.4] });
  P.techo.push({ g: geoGablete(w + 0.9, d + 0.9, dosPisos ? 2.1 : 2.5), p:[0, h, 0], c: cTecho });

  /* LA PUERTA Y EL PORCHE VAN AL FRENTE, o sea a −Z */
  P.puerta.push({ g: geoCaja, p:[azr(-w*0.22, w*0.22), 1.06, -d/2 - 0.06], s:[0.95, 2.12, 0.12] });
  const porche = az() < 0.62;
  if (porche){
    P.pared.push({ g: geoCaja, p:[0, 0.22, -d/2 - 0.9], s:[w*0.7, 0.44, 1.8], c: 0xc8c8c8, u:[w*0.4, 1] });
    P.techo.push({ g: geoCaja, p:[0, 2.6, -d/2 - 0.9], s:[w*0.76, 0.16, 2.0], c: cTecho, u:[w*0.4, 1] });
    for (const sx of [-1, 1])
      P.pared.push({ g: geoCil, p:[sx*w*0.32, 1.3, -d/2 - 1.7], s:[0.16, 2.6, 0.16], c: 0xd0d0d0 });
  }

  /* LAS VENTANAS. La de adelante siempre; las de los costados sólo a veces,
     porque una casa con ventanas en las cuatro caras se lee a maqueta. Y UNA DE
     CADA SIETE ESTÁ ENCENDIDA: más que eso y el barrio deja de estar dormido,
     que es de lo que se trata. */
  const ponVentana = (x, y, z, w2, h2, rotY) => {
    const encendida = az() < 0.135;
    const tele = encendida && az() < 0.30;
    P.marco.push({ g: geoCaja, p:[x, y, z], s: rotY ? [0.14, h2+0.22, w2+0.22] : [w2+0.22, h2+0.22, 0.14] });
    const cap = encendida ? (tele ? P.luzTv : P.luzVent) : P.vidrio;
    cap.push({ g: geoCaja, p:[x + (rotY ? 0.05 : 0), y, z + (rotY ? 0 : -0.05)],
               s: rotY ? [0.10, h2, w2] : [w2, h2, 0.10] });
    /* Y EL CRUCERO: dos listones que parten el vidrio. Sin ellos una ventana es
       un rectángulo oscuro y podría ser cualquier cosa; con ellos se lee a
       ventana desde treinta metros. */
    P.marco.push({ g: geoCaja, p:[x + (rotY?0.08:0), y, z + (rotY?0:-0.08)],
                   s: rotY ? [0.06, h2, 0.07] : [0.07, h2, 0.06] });
  };
  const yv = 1.75;
  ponVentana(-w*0.30, yv, -d/2 - 0.02, 1.15, 1.30, false);
  ponVentana( w*0.30, yv, -d/2 - 0.02, 1.15, 1.30, false);
  if (dosPisos){
    ponVentana(-w*0.28, yv + 2.7, -d/2 - 0.02, 1.0, 1.15, false);
    ponVentana( w*0.28, yv + 2.7, -d/2 - 0.02, 1.0, 1.15, false);
  }
  if (az() < 0.7) ponVentana(-w/2 - 0.02, yv, azr(-d*0.2, d*0.2), 1.0, 1.15, true);
  if (az() < 0.7) ponVentana( w/2 + 0.02, yv, azr(-d*0.2, d*0.2), 1.0, 1.15, true);

  if (az() < 0.45)
    P.ladrillo.push({ g: geoCaja, p:[azr(-w*0.3, w*0.3), h + 1.6, azr(-d*0.2, d*0.2)],
                      s:[0.72, 2.6, 0.72], c: 0xffffff, u:[0.5, 1.6] });
  return { h, w, d };
}

/* ══════════════════════════ UNA CUADRA ══════════════════════════
   Vereda, cordón, césped, seis casas —tres mirando a cada calle— con su
   jardincito, su cerca, su entrada de auto y a veces un árbol.

   TRES POR LADO Y SÓLO EN DOS LADOS, y eso salió de una cuenta y no del gusto.
   Con casas en los cuatro lados, las de las esquinas se pisan: una casa ocupa
   trece metros hacia adentro contando el jardín, y el rincón de trece por trece
   lo reclaman las dos. Con tres casas mirando al norte y tres al sur quedan doce
   metros de fondo entre las de una fila y las de la otra —o sea patios— y los
   lados de este y oeste se llenan con cercas medianeras, que es exactamente
   como está armado cualquier barrio de damero. */
const JARDIN = 5.2;
const COLIS = [];   /* cajas alineadas a los ejes, para el choque */

function armaCuadra(bi, bj){
  const x0 = EJES[bi] + CALLE/2, z0 = EJES[bj] + CALLE/2;
  const x1 = x0 + LOTE, z1 = z0 + LOTE;
  const cx = (x0 + x1)/2, cz = (z0 + z1)/2;
  const P = { pared:[], techo:[], ladrillo:[], vidrio:[], luzVent:[], luzTv:[],
              marco:[], puerta:[], madera:[], reja:[], vereda:[], pasto:[],
              tronco:[], copa:[] };

  /* LA VEREDA: cuatro losas alrededor. Van con la altura de un cordón de
     verdad (15 cm) porque su cara lateral ES el cordón — modelarlo aparte sería
     una pieza más para el mismo píxel. */
  const vy = 0.15;
  P.vereda.push({ g: geoCaja, p:[cx, vy/2, z0 + VEREDA/2], s:[LOTE, vy, VEREDA], u:[LOTE/1.6, VEREDA/1.6] });
  P.vereda.push({ g: geoCaja, p:[cx, vy/2, z1 - VEREDA/2], s:[LOTE, vy, VEREDA], u:[LOTE/1.6, VEREDA/1.6] });
  P.vereda.push({ g: geoCaja, p:[x0 + VEREDA/2, vy/2, cz], s:[VEREDA, vy, LOTE - VEREDA*2], u:[VEREDA/1.6, (LOTE-VEREDA*2)/1.6] });
  P.vereda.push({ g: geoCaja, p:[x1 - VEREDA/2, vy/2, cz], s:[VEREDA, vy, LOTE - VEREDA*2], u:[VEREDA/1.6, (LOTE-VEREDA*2)/1.6] });

  /* el césped, apenas por encima de la vereda para que no peleen por el mismo
     píxel (z-fighting): dos planos a la misma altura parpadean */
  const li = LOTE - VEREDA*2;
  P.pasto.push({ g: geoPlano, p:[cx, vy + 0.012, cz], r:[-Math.PI/2, 0, 0], s:[li, li, 1], u:[li/2.4, li/2.4] });

  /* ── LAS SEIS CASAS ── */
  const anchoLote = li / 3;
  for (const lado of [0, 1]){          /* 0 = mira al norte (−Z), 1 = al sur */
    const rot = lado ? Math.PI : 0;
    for (let k = 0; k < 3; k++){
      const a = azr(9.6, 11.8), d = azr(7.4, 9.2);
      const px = x0 + VEREDA + anchoLote * (k + 0.5) + azr(-0.9, 0.9);
      const frente = lado ? (z1 - VEREDA - JARDIN) : (z0 + VEREDA + JARDIN);
      const pz = frente + (lado ? -1 : 1) * d/2;

      /* la casa se arma mirando a −Z y se coloca girada: escribirla dos veces
         es la forma más rápida de que una de las dos filas termine con la
         puerta contra el patio */
      const sub = { pared:[], techo:[], ladrillo:[], vidrio:[], luzVent:[], luzTv:[],
                    marco:[], puerta:[] };
      const info = armaCasa(sub, a, d);
      const co = Math.cos(rot), si = Math.sin(rot);
      for (const cap of Object.keys(sub)) for (const z of sub[cap]){
        const p = z.p || [0,0,0];
        z.p = [px + p[0]*co + p[2]*si, p[1], pz - p[0]*si + p[2]*co];
        z.r = [(z.r||[0,0,0])[0], (z.r||[0,0,0])[1] + rot, (z.r||[0,0,0])[2]];
        P[cap].push(z);
      }
      CASAS.push({ x: px, z: pz, w: a, d: d, rot });
      COLIS.push({ x0: px - a/2 - 0.2, x1: px + a/2 + 0.2,
                   z0: pz - d/2 - 0.2, z1: pz + d/2 + 0.2 });

      /* ── LA ENTRADA DE AUTO ──
         Va del cordón hasta el costado de la casa. Sin ella el jardín es un
         rectángulo de pasto y la casa no tiene cómo llegar a la calle. */
      const dx = px + (az() < 0.5 ? -1 : 1) * (a/2 + 1.5);
      const largo = JARDIN + VEREDA + 0.6;
      const dz = lado ? (z1 - largo/2) : (z0 + largo/2);
      P.vereda.push({ g: geoCaja, p:[dx, vy + 0.02, dz], s:[3.1, vy, largo], u:[2, largo/1.6] });

      /* ── LA CERCA DEL FRENTE ──
         Una tabla de noventa centímetros con la veta y las juntas dibujadas, y
         NO cincuenta piquetes sueltos: un cerco de doce metros son cincuenta y
         cinco piquetes, y por ciento cincuenta casas son ocho mil cajas para
         algo que a veinte metros y de noche es una silueta. La textura ya trae
         la separación entre tablas. */
      const cercaZ = lado ? (z1 - VEREDA - 0.25) : (z0 + VEREDA + 0.25);
      const hc = azr(0.85, 1.05);
      const cCerca = COLORES_CERCA[azi(0, COLORES_CERCA.length-1)];
      const alambre = az() < 0.34;
      const anchoC = anchoLote - 0.6;
      const cxC = x0 + VEREDA + anchoLote * (k + 0.5);
      /* el hueco de la vereda de entrada: la cerca va en dos tramos */
      const hueco = 1.5;
      for (const sx of [-1, 1]){
        const w2 = anchoC/2 - hueco/2;
        if (w2 <= 0.3) continue;
        const xx = cxC + sx * (hueco/2 + w2/2);
        if (alambre)
          P.reja.push({ g: geoPlano, p:[xx, hc/2 + vy, cercaZ], s:[w2, hc, 1], u:[w2/0.9, hc/0.9] });
        else
          P.madera.push({ g: geoCaja, p:[xx, hc/2 + vy, cercaZ], s:[w2, hc, 0.11], c: cCerca, u:[w2/1.1, hc/1.1] });
        COLIS.push({ x0: xx - w2/2, x1: xx + w2/2, z0: cercaZ - 0.3, z1: cercaZ + 0.3 });
      }
      /* y las medianeras, que son las que hacen los patios */
      if (k < 2){
        const xm = x0 + VEREDA + anchoLote * (k + 1);
        const zm = lado ? (z1 - VEREDA - li*0.28) : (z0 + VEREDA + li*0.28);
        const lm = li * 0.5;
        P.madera.push({ g: geoCaja, p:[xm, hc/2 + vy, zm], s:[0.11, hc, lm], c: cCerca, u:[lm/1.1, hc/1.1] });
        COLIS.push({ x0: xm - 0.3, x1: xm + 0.3, z0: zm - lm/2, z1: zm + lm/2 });
      }

      /* el buzón, en el cordón: es lo más chico que hay y es lo que dice que
         acá vive alguien */
      P.madera.push({ g: geoCil, p:[cxC - anchoLote*0.34, vy + 0.55, cercaZ + (lado ? 0.5 : -0.5)],
                      s:[0.09, 1.1, 0.09], c: 0x5a5a5a });
      P.marco.push({ g: geoCaja, p:[cxC - anchoLote*0.34, vy + 1.22, cercaZ + (lado ? 0.5 : -0.5)],
                     s:[0.24, 0.20, 0.40] });

      /* un árbol en el jardín, una de cada dos veces */
      if (az() < 0.5){
        const tx = px + (az() < 0.5 ? -1 : 1) * azr(a*0.5 + 1.2, a*0.5 + 2.6);
        const tz = frente + (lado ? 1 : -1) * azr(1.4, 3.2);
        const th = azr(4.2, 6.4);
        P.tronco.push({ g: geoCil, p:[tx, vy + th*0.32, tz], s:[0.32, th*0.64, 0.32] });
        P.copa.push({ g: new T.ConeGeometry(azr(1.7, 2.5), th*0.72, 6), p:[tx, vy + th*0.72, tz] });
        COLIS.push({ x0: tx - 0.35, x1: tx + 0.35, z0: tz - 0.35, z1: tz + 0.35 });
      }
    }
  }

  /* ── FUNDIR Y COLGAR ──
     Un grupo por cuadra, y NO una sola malla para el barrio entero: con todo
     fundido no hay recorte por frustum posible y las veinticinco cuadras se
     dibujan siempre, mire uno donde mire. Por cuadra, el recorte tira las que
     están detrás y el apagado por distancia tira las que la niebla ya se comió. */
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
  pon(P.marco, matMarco, false);
  pon(P.puerta, matPuerta, false);
  pon(P.vidrio, matVidrio, false);
  pon(P.luzVent, matLuzVent, false);
  pon(P.luzTv, matLuzVentF, false);
  pon(P.madera, matMaderaV, true);
  pon(P.reja, matReja, false);
  pon(P.tronco, matTronco, true);
  pon(P.copa, matCopa, true);
  g.userData.cx = cx; g.userData.cz = cz;
  escena.add(g);
  GRUPOS.push(g);
  return { casas: 6 };
}
