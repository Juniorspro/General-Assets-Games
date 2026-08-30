
/* ══════════════════════════ ADENTRO DE LA CUEVA ══════════════════════════
   Hasta acá la cueva era una boca tapada que decía «no se puede pasar». Ahora
   se entra, con la antorcha, y adentro está TODO: el pasillo largo, los
   murciélagos, la sangre, los tres cuerpos y la llave.

   POR QUÉ ES UN VOLUMEN APARTE Y NO UN AGUJERO EN EL TERRENO.
   El mundo de este juego es un mapa de alturas: `H(x,z)` da UNA altura por
   punto, así que no puede tener techo — un túnel de verdad necesita dos
   superficies sobre el mismo (x,z) y eso un mapa de alturas no lo representa.
   Se podría hundir el terreno y poner un techo encima, pero entonces el suelo
   del pasillo seguiría siendo la ladera y el pasillo iría cuesta arriba.
   Así que adentro el piso y las paredes son PROPIOS y `H()` no manda: es la
   misma decisión que la sala de práctica de Eco, y por el mismo motivo —ahí
   también las colisiones del laberinto habrían dejado al jugador clavado—.

   LA COLISIÓN ES UNA POLILÍNEA CON ANCHO, y no una grilla ni una lista de
   cajas. Un pasillo es una curva; preguntarle a la curva «cuál es tu punto más
   cercano» da de una sola vez la distancia a la pared, la altura del piso y
   cuánto se avanzó. Con cajas habría que mantener dos descripciones del mismo
   pasillo —la que se dibuja y la que choca— y el día que no coincidan el
   jugador atraviesa una pared. */

/* ── LA PIEDRA DE ADENTRO ──
   Es otra que la de la boca, y por una razón medible: la de afuera (`texPiedra`)
   es un moteado claro y CÁLIDO —#9c9282— hecho para verse de día. Adentro la
   única luz es naranja, y una piedra cálida iluminada de naranja, pasada por la
   saturación del post, devuelve una pared rosa. Ésta es fría y oscura, así que
   la que pone el color es la antorcha y la piedra sólo la devuelve.
   Y lleva GRIETAS, no manchitas. El post posteriza a nueve niveles: un moteado
   de un píxel se promedia en el mipmap y desaparece, mientras que una grieta
   negra de dos píxeles de ancho sobrevive a cualquier reducción y es lo único
   que hace que una pared se lea a roca y no a cartón. */
const texCueva = lienzoTex(64, (g, n) => {
  moteado(g, n, '#a8a49e', '#c4c0b8', '#7a766f', 0.5);
  /* vetas: caminos que bajan torcidos, no líneas rectas */
  for (let i = 0; i < 7; i++){
    let x = Math.random()*n, y = 0;
    g.strokeStyle = '#4a4740'; g.lineWidth = 1 + (Math.random()*2|0);
    g.beginPath(); g.moveTo(x, y);
    while (y < n){ y += 3 + Math.random()*4; x += (Math.random()-0.5)*7; g.lineTo(x, y); }
    g.stroke();
  }
  /* y unas lajas claras, que es lo que le da el relieve al posterizar */
  for (let i = 0; i < 26; i++){
    const x = (Math.random()*n)|0, y = (Math.random()*n)|0;
    const w = 3 + (Math.random()*9|0), h = 2 + (Math.random()*5|0);
    g.fillStyle = Math.random() < 0.5 ? '#d0ccc4' : '#6b6862';
    g.fillRect(x, y, w, h);
  }
});
/* SIN `flatShading`, Y ES LA DIFERENCIA ENTRE UN PASILLO Y UN AGUJERO NEGRO.
   `flatShading` le dice a three.js que calcule la normal de cada cara con el
   producto vectorial de sus vertices, o sea que IGNORA el atributo `normal` que
   uno escribio. Las normales de este tubo estan puestas a mano y apuntan hacia
   adentro —que es donde esta el jugador—; las que deduce el flat shading salen
   del orden de los vertices, y en las caras donde ese orden quedo al reves la
   pared devolvia cero luz. Medido: con flat shading la antorcha a 4,4 veces su
   potencia dejaba el destino de render en 37 sobre 255; sin el, el mismo cuadro
   con la antorcha normal da mas del doble. El aspecto facetado no se pierde: lo
   pone el posterizado a nueve niveles, no el material.

   Y VA A DOS CARAS, que es lo que hacia que el pasillo no tuviera paredes. El
   descarte de caras traseras NO mira el atributo `normal`: mira el ORDEN de los
   vertices. Las normales de este tubo estan bien puestas —apuntan hacia
   adentro— pero el orden con el que se emiten el techo y las dos paredes las
   deja de espaldas al jugador, asi que se descartaban antes de sombrearse.
   Medido con un material de normales: el tunel entero salia de un solo verde
   —(0,1,0), o sea PISO— y arriba no habia nada. Todo el rato que pase subiendo
   la luz estaba iluminando un pasillo que solo tenia suelo; por eso subir el
   ambiente cuatro veces movia el brillo dos puntos: no habia donde rebotar. */
const matRocaCueva = new T.MeshLambertMaterial({ map: texCueva, side: T.DoubleSide });

/* EL PASILLO ES ANGOSTO A PROPOSITO. Empezo en 3,4 de medio ancho —8,6 metros
   de lado a lado con la pared de piedra— y eso no se lee a pasillo: se lee a
   galpon. Y encima rompia la luz, porque con las paredes a cuatro metros la
   antorcha no llegaba a ninguna y lo unico iluminado era el piso. A 2,2 el
   pasillo mide 6,2 de pared a pared, las dos entran en el cuadro a la vez y la
   antorcha las toca. */
const CUEVA_ANCHO = 2.2;          /* medio ancho útil del pasillo */
const CUEVA_ALTO  = 3.1;
let ENCUEVA = false;              /* el jugador está adentro */
let CUEVA_G = null;               /* la malla del interior */
let CUEVA_EJE = null;             /* la polilínea: [{x,z,y,d}] con d acumulada */
let CUEVA_LARGO = 0;

/* arma la polilínea desde la boca hacia adentro del cerro. Los quiebres son
   pocos y anchos: un pasillo que dobla cada cinco metros no se lee a pasillo
   largo, se lee a laberinto, y lo que se pidió es que sea LARGO. */
function ejeCueva(c){
  const a = c.mira;                /* hacia dónde mira la boca */
  const dx = -Math.sin(a), dz = -Math.cos(a);   /* hacia adentro */
  const px = -dz, pz = dx;                       /* el costado */
  /* [avance, corrimiento lateral] de cada punto, en metros */
  const trazo = [[0,0],[9,0],[19,-3.5],[31,-4.2],[42,1.5],[54,3.0],[64,1.0],[74,0]];
  const pts = [];
  let acum = 0, ax = null, az = null;
  for (let i = 0; i < trazo.length; i++){
    const [av, la] = trazo[i];
    const x = c.x + dx*av + px*la;
    const z = c.z + dz*av + pz*la;
    /* el piso baja despacio: entrar a una cueva es meterse en el cerro, y una
       leve pendiente hacia abajo es lo que hace que se sienta que uno se está
       metiendo en vez de caminar por un pasillo horizontal */
    const y = c.h - 0.25 - av*0.045;
    if (ax !== null) acum += Math.hypot(x-ax, z-az);
    pts.push({ x, z, y, d: acum });
    ax = x; az = z;
  }
  CUEVA_LARGO = acum;
  return pts;
}

/* el punto más cercano de la polilínea: devuelve dónde cae, a qué distancia
   lateral, la altura del piso ahí y cuánto se avanzó por el pasillo */
function cercaEje(x, z){
  let mejor = null;
  for (let i = 0; i < CUEVA_EJE.length - 1; i++){
    const a = CUEVA_EJE[i], b = CUEVA_EJE[i+1];
    const ex = b.x - a.x, ez = b.z - a.z;
    const L2 = ex*ex + ez*ez || 1;
    let t = ((x - a.x)*ex + (z - a.z)*ez) / L2;
    t = cl(t, 0, 1);
    const cx = a.x + ex*t, cz = a.z + ez*t;
    const d = Math.hypot(x - cx, z - cz);
    if (!mejor || d < mejor.d)
      mejor = { d, cx, cz, y: lerp(a.y, b.y, t), avance: a.d + (b.d - a.d)*t,
                nx: ex, nz: ez };
  }
  return mejor;
}

/* ── la malla del pasillo ──
   Cuatro tiras por tramo —piso, dos paredes y techo— fundidas en UNA malla.
   Es un tubo cerrado a propósito: si faltara el techo se vería el cielo desde
   adentro del cerro, y si faltara una pared se vería el bosque. */
function armaTunel(){
  const g = new T.Group();
  const pos = [], nor = [], uvs = [];
  const A = CUEVA_ANCHO + 0.9, H2 = CUEVA_ALTO;
  /* LAS UV SE CALCULAN, Y SIN ELLAS EL PASILLO NO TIENE TEXTURA.
     La primera version armaba la geometria con `position` y `normal` y nada
     mas. Un `map` sin coordenadas no falla ni avisa: WebGL le pasa (0,0) al
     atributo que falta, asi que los setenta y seis metros de pasillo salian
     pintados con UN SOLO texel de la piedra. En pantalla eso es un pasillo de
     carton — paredes de color plano y liso, que es justo lo que delata a un
     decorado. Van en metros: 2,2 m por vuelta de textura a lo largo y otro
     tanto a lo ancho, asi que la piedra mide lo mismo en el piso, en la pared y
     en el techo por construccion. */
  const quad = (p1, p2, p3, p4, n, u0, u1, v0, v1) => {
    const P = [p1, p2, p3, p1, p3, p4];
    const U = [[u0,v0],[u1,v0],[u1,v1],[u0,v0],[u1,v1],[u0,v1]];
    for (let i = 0; i < 6; i++){
      pos.push(P[i][0], P[i][1], P[i][2]); nor.push(n[0], n[1], n[2]);
      uvs.push(U[i][0], U[i][1]);
    }
  };
  const ESC = 1 / 2.2;
  /* LAS JUNTAS VAN A INGLETE, y sin eso el tubo tiene agujeros.
     La primera versión calculaba la perpendicular DE CADA TRAMO por separado,
     así que en cada quiebre los dos tramos terminaban en dos aristas distintas
     y quedaba una cuña abierta: medido en la captura, por esas cuñas se veía el
     cielo y el bosque desde adentro del cerro. La perpendicular de un PUNTO es
     la bisectriz de sus dos tramos, y así el tramo que llega y el que sale
     comparten exactamente los mismos vértices. */
  const M = [];
  for (let i = 0; i < CUEVA_EJE.length; i++){
    const a = CUEVA_EJE[i];
    const ant = CUEVA_EJE[i-1], sig = CUEVA_EJE[i+1];
    let dx = 0, dz = 0;
    if (ant){ const L = Math.hypot(a.x-ant.x, a.z-ant.z) || 1; dx += (a.x-ant.x)/L; dz += (a.z-ant.z)/L; }
    if (sig){ const L = Math.hypot(sig.x-a.x, sig.z-a.z) || 1; dx += (sig.x-a.x)/L; dz += (sig.z-a.z)/L; }
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    /* el ancho y el alto respiran a lo largo: un tubo de sección constante se
       lee a caño, no a cueva */
    /* Y AL FINAL EL PASILLO SE ABRE. Los ultimos catorce metros son una sala:
       ahi estan los tres cuerpos y ahi se planta el camello, que mide 3,90 y no
       entra en un techo de 3,10 —le quedaria la cabeza metida en la roca justo
       en el plano en el que hay que verle la cara—. Y de paso el pasillo gana lo
       que le faltaba: llegar a algun lado. Un tubo de setenta y seis metros que
       termina en una tapa es un tubo; uno que termina en una sala es una cueva. */
    const sala = cl((a.d - (CUEVA_LARGO - 14)) / 8, 0, 1);
    const w = A * (0.86 + Math.sin(a.d*0.21)*0.14) * (1 + sala*0.55);
    const h = H2 * (0.88 + Math.sin(a.d*0.17 + 1.3)*0.12) * (1 + sala*0.62);
    M.push({ x: a.x, y: a.y, z: a.z, px: -dz, pz: dx, w, h });
  }
  for (let i = 0; i < M.length - 1; i++){
    const a = M[i], b = M[i+1];
    const aI = [a.x + a.px*a.w, a.y, a.z + a.pz*a.w], aD = [a.x - a.px*a.w, a.y, a.z - a.pz*a.w];
    const bI = [b.x + b.px*b.w, b.y, b.z + b.pz*b.w], bD = [b.x - b.px*b.w, b.y, b.z - b.pz*b.w];
    const aIt = [aI[0], a.y + a.h, aI[2]], aDt = [aD[0], a.y + a.h, aD[2]];
    const bIt = [bI[0], b.y + b.h, bI[2]], bDt = [bD[0], b.y + b.h, bD[2]];
    const u0 = a.d*ESC, u1 = b.d*ESC;
    const wA = a.w*2*ESC, hA = a.h*ESC;
    quad(aI, bI, bD, aD, [0, 1, 0], u0, u1, 0, wA);            /* piso */
    quad(aIt, aI, bI, bIt, [-a.px, 0, -a.pz], u0, u1, 0, hA);  /* pared izquierda */
    quad(aD, aDt, bDt, bD, [a.px, 0, a.pz], u0, u1, 0, hA);    /* pared derecha */
    quad(aIt, bIt, bDt, aDt, [0, -1, 0], u0, u1, 0, wA);       /* techo */
  }
  /* Y LOS DOS EXTREMOS SE TAPAN CON LA MISMA SECCIÓN, no con un plano suelto.
     Un `PlaneGeometry` de tamaño fijo puesto al final no coincide con el ancho
     de ahí —que respira— y deja marco: por ese marco entraba luz. Construido
     con los mismos cuatro vértices de la sección, cierra exacto por
     construcción. La boca se tapa también, y por eso el pasillo no se ve desde
     afuera: la boca de piedra que ya estaba es la que se ve. */
  for (const [k, sg] of [[0, 1], [M.length-1, -1]]){
    const a = M[k];
    const I = [a.x + a.px*a.w, a.y, a.z + a.pz*a.w], D = [a.x - a.px*a.w, a.y, a.z - a.pz*a.w];
    const It = [I[0], a.y + a.h, I[2]], Dt = [D[0], a.y + a.h, D[2]];
    /* la boca se tapa un pelo por DETRÁS del arco de piedra, para que el arco
       siga siendo lo que se ve desde afuera */
    const w2 = a.w*2*ESC, h2 = a.h*ESC;
    if (sg > 0) quad(It, Dt, D, I, [0, 0, 1], 0, w2, 0, h2);
    else quad(I, D, Dt, It, [0, 0, -1], 0, w2, 0, h2);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  const m = new T.Mesh(geo, matRocaCueva);
  m.receiveShadow = true;
  g.add(m);
  return g;
}

/* ── LOS MURCIÉLAGOS ──
   Van INSTANCIADOS: veintiocho bichos sueltos serían veintiocho llamadas de
   dibujo en un pasillo que se dibuja con una. Un murciélago es un cuerpito y
   dos alas, y lo único que hace falta para que se lea es que las alas BATAN —a
   un bicho quieto colgado del techo no se le ve la especie—. */
const geoBicho = (() => {
  const piezas = [
    { g: new T.BoxGeometry(0.10, 0.09, 0.20), p: [0, 0, 0], r: [0,0,0] },
    { g: new T.BoxGeometry(0.07, 0.06, 0.07), p: [0, 0.02, 0.13], r: [0,0,0] }
  ];
  return fundir(piezas);
})();
const geoAla = new T.BoxGeometry(0.34, 0.02, 0.16);
const matBicho = new T.MeshLambertMaterial({ color: 0x241d22, flatShading: true });
const MURCIS = { n: 0, cuerpo: null, alaI: null, alaD: null, datos: [] };

function armaMurcielagos(){
  const N = 26;
  MURCIS.n = N;
  MURCIS.cuerpo = new T.InstancedMesh(geoBicho, matBicho, N);
  MURCIS.alaI = new T.InstancedMesh(geoAla, matBicho, N);
  MURCIS.alaD = new T.InstancedMesh(geoAla, matBicho, N);
  for (const m of [MURCIS.cuerpo, MURCIS.alaI, MURCIS.alaD]){
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
  }
  MURCIS.datos = [];
  for (let i = 0; i < N; i++){
    /* repartidos a lo largo del pasillo, cada uno con su órbita y su fase: sin
       la fase los veintiséis baten las alas al mismo tiempo y se ve una máquina */
    MURCIS.datos.push({
      d: 6 + Math.random()*(CUEVA_LARGO - 10),
      r: 0.7 + Math.random()*1.5,
      a: Math.random()*6.283,
      w: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random()*0.9),
      alt: 1.5 + Math.random()*1.5,
      fase: Math.random()*6.283,
      bat: 13 + Math.random()*7
    });
  }
  return [MURCIS.cuerpo, MURCIS.alaI, MURCIS.alaD];
}
const _mB = new T.Matrix4(), _qB = new T.Quaternion(), _eB = new T.Euler();
const _vB = new T.Vector3(), _sB = new T.Vector3(1,1,1);
function pasoMurcielagos(t){
  if (!MURCIS.cuerpo) return;
  for (let i = 0; i < MURCIS.n; i++){
    const b = MURCIS.datos[i];
    b.a += b.w * 0.016;
    /* dónde cae ese avance sobre la polilínea */
    const p = puntoEje(b.d);
    const cx = p.x + p.px * Math.cos(b.a) * b.r;
    const cz = p.z + p.pz * Math.cos(b.a) * b.r;
    const cy = p.y + b.alt + Math.sin(b.a*2.1 + b.fase)*0.28;
    /* mira hacia donde va: la tangente de su propia órbita */
    const rumbo = Math.atan2(-p.px*Math.sin(b.a)*b.w, -p.pz*Math.sin(b.a)*b.w);
    _eB.set(0, rumbo, 0);
    _qB.setFromEuler(_eB);
    _vB.set(cx, cy, cz);
    _mB.compose(_vB, _qB, _sB);
    MURCIS.cuerpo.setMatrixAt(i, _mB);
    /* las alas: el mismo sitio, girando sobre Z para batir */
    const ba = Math.sin(t*b.bat + b.fase) * 0.9;
    for (const [ala, sg] of [[MURCIS.alaI, 1], [MURCIS.alaD, -1]]){
      _eB.set(0, rumbo, sg*0.5 + sg*ba);
      _qB.setFromEuler(_eB);
      _vB.set(cx + Math.cos(rumbo)*sg*0.16, cy, cz - Math.sin(rumbo)*sg*0.16);
      _mB.compose(_vB, _qB, _sB);
      ala.setMatrixAt(i, _mB);
    }
  }
  MURCIS.cuerpo.instanceMatrix.needsUpdate = true;
  MURCIS.alaI.instanceMatrix.needsUpdate = true;
  MURCIS.alaD.instanceMatrix.needsUpdate = true;
}
/* dónde cae un avance `d` sobre la polilínea, con su perpendicular */
function puntoEje(d){
  const E = CUEVA_EJE;
  for (let i = 0; i < E.length - 1; i++){
    const a = E[i], b = E[i+1];
    if (d <= b.d || i === E.length - 2){
      const t = cl((d - a.d) / ((b.d - a.d) || 1), 0, 1);
      let ex = b.x - a.x, ez = b.z - a.z;
      const L = Math.hypot(ex, ez) || 1; ex /= L; ez /= L;
      return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), y: lerp(a.y, b.y, t),
               ex, ez, px: -ez, pz: ex };
    }
  }
  const a = E[0];
  return { x: a.x, z: a.z, y: a.y, ex: 1, ez: 0, px: 0, pz: 1 };
}

/* ── LA SANGRE ──
   En el piso y también en las PAREDES, y esa es la diferencia entre un rastro y
   una escena: algo que se arrastra deja marcas abajo; algo que se golpea contra
   la roca las deja a la altura del pecho. Van todas fundidas en una malla. */
/* LA SANGRE DE ADENTRO ES OTRO MATERIAL QUE LA DE AFUERA, y no por gusto.
   `MeshBasicMaterial` no recibe luz, asi que su color llega crudo al
   post-proceso, y ahi lo espera el x2,2 de saturacion: el rojo del rastro de
   afuera —que sobre pasto verde y a la luz de la luna se lee a sangre— adentro
   salia como un rojo de aerosol, mas brillante que la antorcha que
   supuestamente lo ilumina. Afuera tiene que RESALTAR sobre el pasto, que para
   eso es un rastro que hay que seguir; adentro tiene que ser LO MAS OSCURO del
   piso. Son dos trabajos opuestos y por eso son dos materiales. */
const matSangreCueva = new T.MeshBasicMaterial({ color: 0x39100c });

function armaSangreCueva(){
  const piezas = [];
  for (let i = 0; i < 52; i++){
    const d = 3 + Math.random()*(CUEVA_LARGO - 5);
    const p = puntoEje(d);
    const lado = (Math.random()-0.5)*2;
    if (Math.random() < 0.62){
      /* charco en el piso */
      const s = 0.25 + Math.random()*0.75;
      const x = p.x + p.px*lado*CUEVA_ANCHO, z = p.z + p.pz*lado*CUEVA_ANCHO;
      piezas.push({ g: new T.CircleGeometry(s, 7), p: [x, p.y + 0.03, z],
                    r: [-Math.PI/2, 0, Math.random()*3] });
    } else {
      /* salpicadura en la pared, a la altura a la que golpea un cuerpo */
      const sg = lado > 0 ? 1 : -1;
      const s = 0.18 + Math.random()*0.42;
      const x = p.x + p.px*sg*(CUEVA_ANCHO+0.55), z = p.z + p.pz*sg*(CUEVA_ANCHO+0.55);
      piezas.push({ g: new T.CircleGeometry(s, 6),
                    p: [x, p.y + 0.7 + Math.random()*1.3, z],
                    r: [0, Math.atan2(-p.px*sg, -p.pz*sg), Math.random()*3] });
    }
  }
  return new T.Mesh(fundir(piezas), matSangreCueva);
}

/* ── LOS TRES CUERPOS ──
   Son los MISMOS personajes de la cinemática, con su ropa: Sofi, Tato y Vera.
   Que sean los mismos es toda la escena — un cuerpo genérico no dice nada;
   reconocer la campera verde de la que estaba sentada al lado tuyo, sí. Es la
   misma regla que en la apertura hace que cada uno tenga su color.

   LA POSE ES UNA SOLA FUNCIÓN CON UNA VARIANTE POR CUERPO, y no tres poses
   escritas a mano: lo que hace que un cuerpo se lea a muerto no es el detalle
   sino que las articulaciones estén en ángulos que un vivo NO sostiene —el
   brazo torcido hacia atrás, el cuello vencido, una pierna cruzada bajo la
   otra— y eso se parametriza. */
let CUERPOS = [];
function poseMuerto(p, v){
  const u = p.userData;
  u.cadera.position.y = 0.16*u.e;
  u.torso.rotation.set(1.42 + v*0.10, v*0.5, 0.22 - v*0.3);
  u.cuello.rotation.set(-0.95 + v*0.25, 0.7*v, 0.4);
  const A = [[-2.35, 0.20], [-0.55, -1.75], [-1.90, -0.30]];
  const P = [[-1.55, 1.35], [-0.35, 0.25], [-1.10, 0.80]];
  for (const [k, sx] of [['i',-1],['d',1]]){
    const j = (k === 'i' ? 0 : 1) + (v > 0.5 ? 1 : 0);
    u.br[k].hombro.rotation.set(A[j % 3][0], sx*0.6*v, sx*(0.5 + v*0.4));
    u.br[k].codo.rotation.set(A[j % 3][1], 0, 0);
    u.pi[k].musl.rotation.set(P[j % 3][0], 0, sx*(0.35 + v*0.5));
    u.pi[k].rod.rotation.set(P[j % 3][1], 0, 0);
  }
}
function armaCuerpos(){
  CUERPOS = [];
  /* al fondo del pasillo, amontonados pero no encimados */
  const base = CUEVA_LARGO - 7;
  for (let i = 1; i < AMIGOS.length; i++){
    const p = armaPersona(AMIGOS[i]);
    const d = base + (i-1)*1.9;
    const q = puntoEje(d);
    const lado = ((i % 2) ? 1 : -1) * (0.8 + (i*0.4) % 1.2);
    p.position.set(q.x + q.px*lado, q.y, q.z + q.pz*lado);
    p.rotation.y = Math.atan2(q.ex, q.ez) + (i*1.7);
    /* SE ACUESTAN GIRANDO EL GRUPO ENTERO y no hueso por hueso: tumbar a alguien
       es una rotación del cuerpo, y hacerlo con las articulaciones deja los
       pies apoyados en el aire donde estaban. */
    p.rotation.x = Math.PI*0.5 * (0.82 + (i%3)*0.06);
    poseMuerto(p, (i-1)/2);
    escena.add(p);
    CUERPOS.push(p);
  }
}

/* ══════════════════════════ ENTRAR Y SALIR ══════════════════════════ */
function construyeCueva(){
  if (CUEVA_G || !CUEVA) return;
  CUEVA_EJE = ejeCueva(CUEVA);
  CUEVA_G = new T.Group();
  CUEVA_G.add(armaTunel());
  CUEVA_G.add(armaSangreCueva());
  for (const m of armaMurcielagos()) CUEVA_G.add(m);
  escena.add(CUEVA_G);
  armaCuerpos();
  /* LA LLAVE VA AL FONDO, entre los cuerpos: es lo que se pidió —que todo esté
     adentro— y de paso resuelve solo el problema de que antes estaba tirada en
     el pasto sin ninguna razón para estar ahí. */
  const q = puntoEje(CUEVA_LARGO - 3.2);
  const g = new T.Group();
  g.position.set(q.x, q.y, q.z);
  const anillo = new T.Mesh(new T.TorusGeometry(0.13, 0.028, 4, 10), matLlave);
  anillo.rotation.x = Math.PI/2; anillo.position.y = 0.12;
  g.add(anillo);
  for (let j = 0; j < 2; j++){
    const ll = new T.Mesh(new T.BoxGeometry(0.05, 0.012, 0.24), matLlave);
    ll.position.set(0.10 + j*0.05, 0.12, 0.12);
    ll.rotation.y = j*0.4;
    g.add(ll);
  }
  CUEVA_G.add(g);
  /* LA COSA USABLE SE MUDA A DONDE QUEDÓ LA LLAVE. Se registró al armar las
     misiones —cuando el pasillo todavía no existía— con la posición de la boca;
     acá recién se sabe dónde cayó el fondo. Si no se actualizara, el cartel de
     «agarrar las llaves» aparecería en la entrada y la llave estaría setenta
     metros más adentro. */
  if (MIS.llaves){
    MIS.llaves.x = q.x; MIS.llaves.z = q.z; MIS.llaves.malla = g;
  }
  esconde(false);
}
/* el interior se dibuja SOLO cuando se está adentro. Es un tubo cerrado metido
   dentro del cerro: desde afuera no se ve, pero igual se paga en llamadas de
   dibujo y en sombras, y no hay razón para pagarlo los primeros diez minutos. */
function esconde(v){
  if (CUEVA_G) CUEVA_G.visible = v;

  for (const p of CUERPOS) p.visible = v;
  mundoFuera(!v);
}

/* Y EL MUNDO DE AFUERA SE APAGA MIENTRAS SE ESTA ADENTRO, y no es un ahorro:
   es lo unico que tapa un defecto que no se arregla con geometria. El pasillo
   baja 4,5 cm por metro y el cerro no baja igual, asi que a partir de la mitad
   la SUPERFICIE DEL TERRENO le pasa por adentro al tubo y se ve el pasto verde
   cruzando la pared. Medido en la captura de los 52 m: una mancha verde que
   ocupaba un cuarto del cuadro. Bajarle el piso al pasillo lo corre unos metros
   mas lejos pero no lo resuelve, porque el mapa de alturas no tiene agujero.
   Estando adentro no hay un solo pixel de afuera que sea legitimo, asi que se
   apaga entero — terreno, agua, cielo, pasto, flores, nubes, arboles y el
   camello. De paso el pasillo pasa a dibujarse con casi nada. */
function mundoFuera(v){
  for (const o of [terreno, agua, cielo, pastoMesh, floresMesh, nubes, CAM3])
    if (o) o.visible = v;
  for (const g of GRUPOS) if (g) g.visible = v;
  /* la niebla NO se toca: `f.js` le escribe el color todos los cuadros y
     ponerla en null tira ahi mismo. Y no hace falta, porque empieza a los
     120 m y el pasillo mide 76. */
}

/* entrar: se funde a negro, se lleva al jugador a la boca por dentro y se
   vuelve. El fundido no es adorno — el salto de posición sin él se lee como un
   error, y encima tapa el cuadro en el que el mundo de afuera se apaga. */
function entraCueva(){
  if (ENCUEVA) return;
  construyeCueva();
  if (!CUEVA_EJE) return;
  $('cVelo').classList.add('ver');
  $('cine').classList.add('on');
  setTimeout(() => {
    ENCUEVA = true;
    esconde(true);
    const p = puntoEje(1.5);
    JUG.x = p.x; JUG.z = p.z; JUG.y = p.y;
    /* MIRANDO HACIA ADENTRO. En este motor el frente es (-sin yaw, -cos yaw),
       asi que para mirar en la direccion (ex,ez) el rumbo es atan2(-ex,-ez) y
       nada mas. Estaba con un `+ PI` de mas, o sea que al entrar a la cueva el
       jugador aparecia MIRANDO LA BOCA: lo primero que veia era la tapa de
       piedra de la entrada a dos metros, y el pasillo le quedaba a la espalda.
       Medido con la sonda de los cuerpos: los tres daban `delante: false`
       parado a siete metros de ellos. */
    JUG.yaw = Math.atan2(-p.ex, -p.ez);
    JUG.pitch = -0.05; JUG.vy = 0; JUG.aire = false;
    $('cVelo').classList.remove('ver');
    setTimeout(() => $('cine').classList.remove('on'), 520);
  }, 620);
}
function saleCueva(){
  if (!ENCUEVA) return;
  ENCUEVA = false;
  esconde(false);
  const c = CUEVA;
  JUG.x = c.frenteX; JUG.z = c.frenteZ; JUG.y = H(JUG.x, JUG.z);
  JUG.vy = 0; JUG.aire = false;
}

/* ── LA COLISIÓN DE ADENTRO ──
   Se llama DESPUÉS de mover al jugador y lo devuelve al pasillo. Es lo único
   que choca en todo el juego: afuera se camina libre sobre el mapa de alturas.
   Y salir por la boca no es un choque sino una salida, así que sólo se recorta
   cuando ya se entró de verdad. */
function recortaCueva(){
  if (!ENCUEVA || !CUEVA_EJE) return;
  const p = cercaEje(JUG.x, JUG.z);
  const tope = CUEVA_ANCHO - 0.55;
  if (p.d > tope){
    const k = tope / p.d;
    JUG.x = p.cx + (JUG.x - p.cx) * k;
    JUG.z = p.cz + (JUG.z - p.cz) * k;
  }
  /* el piso es el del pasillo, no el del terreno */
  JUG.y = lerp(JUG.y, p.y, 0.5);
  /* y por la boca se sale */
  if (p.avance < 0.4 && MIS.i >= 5) saleCueva();
}
/* LA ALTURA DEL PISO PARA CUALQUIERA, adentro o afuera. `H()` es el mapa de
   alturas de la isla, o sea la LADERA DEL CERRO: usada adentro devuelve el techo
   de la montaña, veinte metros por encima de la cabeza. Medido: el camello de la
   escena de la llave aparecia a y=29,45 con el jugador en 19,76 — nueve metros
   y medio en el aire, o sea fuera del cuadro por arriba, y la escena del susto
   no mostraba nada. Y no alcanzaba con arreglarlo al plantarlo: `pasoCamello()`
   lo vuelve a apoyar en `H()` todos los cuadros. */
function pisoDe(x, z){
  if (ENCUEVA && CUEVA_EJE){
    const p = cercaEje(x, z);
    if (p.d < CUEVA_ANCHO + 1.4) return p.y;
  }
  return H(x, z);
}

/* qué tan adentro está, de 0 a 1: lo usa la luz para apagar el mundo de afuera */
function hondoCueva(){
  if (!ENCUEVA || !CUEVA_EJE) return 0;
  const p = cercaEje(JUG.x, JUG.z);
  return cl(p.avance / 8, 0, 1);
}

/* ══════════════════════════ CORRER ROTO ══════════════════════════
   Después de mirar arriba no se corre: se cojea. Y no es sólo «más lento» —
   bajar un número no se lee como estar herido, se lee como que el juego se
   puso pesado—. Son tres cosas a la vez, y las tres tienen que estar:

   1. LA VELOCIDAD BAJA Y EL CORRER CASI NO SUMA. Sano, correr da 12,8 contra
      5,8 de caminar; roto, 6,4 contra 4,6. El camello embiste a 7,4: o sea que
      ahora te alcanza, y llegar al auto deja de ser un trámite.
   2. LA CÁMARA COJEA. Un paso apoya y el otro se hunde: el balanceo va a la
      MITAD de la frecuencia del paso, que es lo que distingue una renguera de
      un temblor. Sin esto, «lento» es lo único que se percibe.
   3. Y CADA TANTO LA PIERNA NO RESPONDE. Se traba, se cae y hay que volver a
      levantarse. Es lo único que convierte la huida en algo que se juega en vez
      de mantener el dedo apretado. */
/* EL LATIDO DEL ROJO. Va por el uniforme del post y no por una animación de
   CSS: adentro del destino de render sale pixelado y posterizado como todo lo
   demás. Y late más fuerte justo cuando la pierna falla, que es lo único que
   convierte el filtro en información en vez de decoración. */
const ROJO = { on: false, t: 0 };
function pasoRojo(dt){
  ROJO.t += dt;
  const base = ROJO.on ? 0.62 + Math.sin(ROJO.t*2.9)*0.14 : 0;
  const golpe = (ROTO.cae > 0) ? 0.34 : 0;
  const v = cl(base + golpe, 0, 1);
  postMat.uniforms.rojo.value += (v - postMat.uniforms.rojo.value) * Math.min(1, dt*4.5);
}

const ROTO = { on: false, t: 0, cae: 0, prox: 0, fase: 0 };
function rompePierna(){
  ROTO.on = true; ROTO.t = 0; ROTO.cae = 0;
  /* el primer tropiezo no cae de una: dar tres pasos y desplomarse antes de
     entender que estás herido se lee a bug */
  ROTO.prox = 6.5 + Math.random()*4;
}
function pasoRoto(dt){
  if (!ROTO.on) return;
  ROTO.t += dt;
  if (ROTO.cae > 0){
    ROTO.cae -= dt;
    if (ROTO.cae <= 0) ROTO.prox = 7 + Math.random()*6;
    return;
  }
  /* sólo se traba si se está moviendo: caerse parado es una broma pesada */
  if (AND.v > 1.2){
    ROTO.prox -= dt;
    if (ROTO.prox <= 0){
      ROTO.cae = 1.35;
      AND.golpe = 0.85;
      son2('paso', 1.0);
      aviso(TX('aTrabado'));
    }
  }
}
/* cuánto se puede mover ahora: 0 mientras se está en el piso */
function factorRoto(){
  if (!ROTO.on) return 1;
  if (ROTO.cae > 0) return 0;
  return 1;
}

/* ══════════════════════════ SUBIRSE Y ESCAPAR ══════════════════════════
   Es lo último que pasa, así que no puede ser un cartel. Tres tiempos: la
   cámara entra a la camioneta y se sienta al volante, el motor arranca —al
   segundo intento, que un arranque limpio no tiene tensión— y el auto se va
   mientras el camello sale del monte demasiado tarde. */
const FINAL = {
  on: false, t: 0, dur: 12.0, x0: 0, z0: 0,
  arranca(){
    if (this.on || !AUTO) return;
    this.on = true; this.t = 0;
    MODO = 'final';
    ROTO.on = false;
    ROJO.on = false;
    $('hud').classList.remove('on');
    $('pista').classList.remove('on');
    $('cine').classList.add('on');
    requestAnimationFrame(() => $('cine').classList.add('abre'));
    $('cSaltar').style.display = 'none';
    this.x0 = AUTO.x; this.z0 = AUTO.z;
    /* Y LA ANTORCHA SE APAGA. Cuelga de la camara, asi que en un plano de
       afuera —donde el jugador ya no es el ojo sino alguien que se sube a una
       camioneta— quedaba una llama flotando en el medio del cuadro. */
    if (MIS.antorchaMalla) MIS.antorchaMalla.visible = false;
    /* el camello sale del monte por donde uno vino: llega tarde, y que llegue
       tarde es el final.
       Y SE PIDE EL MODELO ANTES DE MIRARLO. `CAM3` se arma la primera vez que el
       bicho aparece, o sea en la escena de la llave; si por lo que sea todavia
       no existe, el guard `if (CAM3)` dejaba la persecucion final sin
       perseguidor y el ultimo plano quedaba siendo una camioneta que se va sola.
       Medido en el banco entrando directo a la ultima mision: `bicho: [0,0]`. */
    ponCamello();
    if (CAM3){
      BICHO.modo = 'quieto';
      BICHO.x = AUTO.x - Math.sin(AUTO.ry)*26;
      BICHO.z = AUTO.z - Math.cos(AUTO.ry)*26;
      BICHO.ry = AUTO.ry;
    }
    son2('fuego', 0.6);
  },
  paso(dt){
    this.t += dt;
    const t = this.t;
    const a = AUTO;
    /* ── LA CAMARA NUNCA ENTRA A LA CABINA, Y ESO SE DECIDIO MIRANDO ──
       La primera version ponia el ojo «al volante»: 35 cm adelante y 42 al
       costado del origen de la camioneta, a 1,42 de alto. Medido en la captura,
       desde el segundo tres el cuadro entero eran DOS PANELES ROJOS y una franja
       celeste: el ojo quedaba dentro de la chapa. Y no es cuestion de correr los
       numeros — esta camioneta no tiene interior modelado, asi que cualquier
       punto «adentro» es adentro de una caja cerrada.
       Lo que si tiene es un exterior que se ve bien. Asi que el plano es de
       afuera: uno se acerca a la puerta, el motor falla y arranca, y la camara
       se queda PLANTADA EN EL PISO mientras la camioneta se va. Un plano fijo
       con algo que se aleja es la forma mas vieja que hay de decir «se
       escaparon», y encima deja lugar en el cuadro para lo que importa: el
       bicho saliendo del monte cuando ya es tarde. */
    const sube = cl(t/2.4, 0, 1);
    /* 2 · arranca al segundo intento */
    if (t > 3.0 && t < 3.1) son2('mal', 0.8);
    if (t > 4.3 && t < 4.4) son2('bomba', 0.9);
    /* 3 · se va */
    const anda = cl((t - 4.6)/6.0, 0, 1);
    const rec = anda*anda * 92;
    a.g.position.set(a.x + Math.sin(a.ry)*rec, a.y, a.z + Math.cos(a.ry)*rec);
    /* LA CAMARA VA DE TRES CUARTOS Y NO PEGADA A LA PUERTA. Puesta a dos metros
       del costado —que suena a «al lado de la puerta»— la camioneta mide mas de
       dos de ancho, asi que quedaba a UN metro de la chapa: medido en la
       captura, los primeros cuatro segundos eran un rectangulo rojo de punta a
       punta. Un vehiculo se lee entero o no se lee, y para eso hay que estar a
       una distancia parecida a su largo. Se arranca a seis metros y se acerca
       despacio a cinco: el acercamiento es lo que hace que el plano no sea una
       foto fija mientras no pasa nada. */
    const px = -Math.cos(a.ry), pz = Math.sin(a.ry);      /* el costado */
    const acerca = 6.2 - cl(t/4.2, 0, 1) * 1.1;
    const camx = a.x + px*acerca - Math.sin(a.ry)*3.4;
    const camz = a.z + pz*acerca - Math.cos(a.ry)*3.4;
    cam.position.set(camx, a.y + 1.72, camz);
    /* EL SACUDON DEL ARRANQUE VA EN LA CAMARA. Un motor que no prende se oye y
       ademas se SIENTE: sin el temblor, el sonido de fallar y el de arrancar son
       dos ruidos sobre una imagen quieta. */
    const tiemble = (t > 3.0 && t < 3.5) ? (3.5 - t)*0.06
                  : (t > 4.3 && t < 5.0) ? (5.0 - t)*0.05 : 0;
    if (tiemble > 0){
      cam.position.x += (Math.random()-0.5)*tiemble;
      cam.position.y += (Math.random()-0.5)*tiemble;
    }
    /* la camara MIRA a la camioneta mientras se va, y al final se queda mirando
       por donde sale el bicho */
    const bl = (CAM3 && t > 6.2) ? cl((t - 6.2)/2.2, 0, 1) : 0;
    const mira = new T.Vector3(
      lerp(a.g.position.x, BICHO.x, bl*0.55),
      a.y + 1.0 - sube*0.0,
      lerp(a.g.position.z, BICHO.z, bl*0.55));
    cam.lookAt(mira);
    cam.fov = 62 - sube*4; cam.updateProjectionMatrix();
    /* el camello sale del monte cuando ya arrancó */
    if (CAM3 && t > 5.4){
      const k = cl((t - 5.4)/4.5, 0, 1);
      BICHO.x = a.x - Math.sin(a.ry)*(26 - k*20);
      BICHO.z = a.z - Math.cos(a.ry)*(26 - k*20);
      CAM3.position.set(BICHO.x, pisoDe(BICHO.x, BICHO.z), BICHO.z);
      CAM3.rotation.y = BICHO.ry;
      animaCamello(CAM3, RELOJ.value, 0.34);
    }
    const idx = t < 5.0 ? 'f0' : t < 9.5 ? 'f1' : 'f2';
    if (idx !== this.txt){
      this.txt = idx;
      const el = $('cTexto');
      el.classList.remove('ver');
      setTimeout(() => { el.textContent = TX(idx); el.classList.add('ver'); }, 180);
    }
    $('cVelo').classList.toggle('ver', t > this.dur - 1.6);
    if (t >= this.dur) this.termina();
  },
  termina(){
    this.on = false;
    MODO = 'fin';
    $('obj').classList.remove('on');
    ROJO.on = false;
    /* se queda en negro con el nombre: no hay pantalla de derrota en este juego
       y tampoco hay una de victoria con puntaje. Terminó. */
  }
};

/* ── LA LUZ DE ADENTRO ──
   Adentro no hay sol ni luna: la única luz es la antorcha. Se apaga el mundo de
   afuera en vez de mover la antorcha, porque la antorcha ya está calibrada para
   la noche y tocarla desincronizaría las dos escenas. Se cruza con `hondoCueva`
   —cuánto se avanzó— así que en la boca todavía entra algo de día, que es lo
   que hace que se sienta que uno se está METIENDO. */
let _luzGuardada = null;
/* EL AMBIENTE DE ADENTRO SON DOS COLORES DISTINTOS, Y ESA DIFERENCIA ES TODA LA
   FORMA DEL PASILLO. Un `HemisphereLight` reparte segun hacia donde mira la
   cara: arriba manda `color`, abajo `groundColor`. Puestos los dos en el mismo
   gris —que es lo que hice para sacarle el azul— todas las caras reciben
   EXACTAMENTE lo mismo, y el resultado medido fue un ovalo malva plano en el que
   no se distinguia el piso del techo ni de las paredes: un pasillo sin aristas.
   Con el de arriba claro y el de abajo casi negro, el piso se enciende, el techo
   se apaga y las paredes quedan a mitad de camino — que es lo que hace la luz de
   una cueva, donde lo unico que ilumina esta a la altura de la mano.
   Y los dos son NEUTROS: el post satura por 1,25 y cualquier resto de azul en
   una superficie grande y plana se convierte en cielo nocturno. */
const _CUEVA_ARRIBA = new T.Color(0xaeaeb0);
const _CUEVA_ABAJO  = new T.Color(0x141312);
/* los tres numeros de la luz de adentro, sueltos para poder barrerlos desde el
   banco en vez de recompilar por cada prueba */
/* los cuatro numeros de la luz de adentro. Salieron de barrer combinaciones y
   mirar la captura final, no del gusto: con la antorcha por encima de 1 el
   posterizado convierte su caida en seis anillos naranjas concentricos —el
   pasillo se lee a atardecer— y por debajo de 2 de ambiente el fondo del
   pasillo cae entero del lado del cero. */
const LUZC = { amb: 3.4, ant: 0.10, dist: -0.25, sat: 1.25 };
function luzCueva(dt){
  const h = hondoCueva();
  if (h <= 0){
    if (_luzGuardada){
      ambiente.intensity = _luzGuardada.a;
      ambiente.color.copy(_luzGuardada.c);
      if (_luzGuardada.g) ambiente.groundColor.copy(_luzGuardada.g);
      luna.intensity = _luzGuardada.l;
      sol.intensity = _luzGuardada.s;
      relleno.intensity = _luzGuardada.r;
      postMat.uniforms.vig.value = _luzGuardada.v;
      postMat.uniforms.sat.value = _luzGuardada.sa;
      _luzGuardada = null;
    }
    return;
  }
  if (!_luzGuardada) _luzGuardada = { a: ambiente.intensity, l: luna.intensity,
                                     s: sol.intensity, r: relleno.intensity,
                                     v: postMat.uniforms.vig.value,
                                     sa: postMat.uniforms.sat.value,
                                     c: ambiente.color.clone(),
                                     g: ambiente.groundColor ? ambiente.groundColor.clone() : null };
  const k = 1 - h;
  /* EL AMBIENTE DE ADENTRO ES UN VALOR ABSOLUTO Y NO UNA FRACCIÓN DEL DE
     AFUERA. Puesto como fracción, de noche —que es cuando se entra— el de
     afuera ya vale casi nada y el resultado era negro puro: medido, el cuadro
     final daba 4,5 de brillo medio sobre 255. Una cueva con una antorcha
     encendida no es negra: las paredes devuelven luz. */
  /* Y EL NÚMERO SALE DE LA CUENTA DEL POST-PROCESO, no del gusto.
     El destino de render guarda en sRGB y el shader lo decodifica a lineal, así
     que un 0,16 guardado entra como 0,022. Después: ×1,6 de brillo → 0,036;
     el contraste de 1,10 empuja los oscuros HACIA ABAJO —(0,036−0,5)·1,1+0,5 =
     0,011—; y el posterizado de nueve niveles manda a CERO todo lo que quede
     bajo 1/18 = 0,056. O sea que el pasillo tiene que llegar a la pantalla con
     unos 70 de 255 en el destino de render para no salir negro. Medido: con
     0,62 de ambiente daba 41 y la captura final 5,0 sobre 255. */
  ambiente.intensity = _luzGuardada.a * k + LUZC.amb * h;
  luna.intensity = _luzGuardada.l * k;
  sol.intensity = _luzGuardada.s * k;
  /* Y EL RELLENO TAMBIEN SE APAGA, que era el que pintaba la cueva de AZUL.
     Es una direccional celeste (HSL 0,58) que existe para que la sombra del sol
     no sea negra; adentro del cerro no tiene ningun sentido y era la unica luz
     de color que quedaba encendida. En la captura el techo salia turquesa y la
     pared de la izquierda azul marino, y yo lo estaba atribuyendo al color del
     ambiente —que ya estaba en gris neutro— cuando el ambiente no tenia nada
     que ver. */
  relleno.intensity = _luzGuardada.r * k;
  /* Y EL COLOR DEL AMBIENTE TAMBIEN CAMBIA. Afuera es el cielo: azul arriba y
     tierra abajo. Adentro no hay cielo — la unica luz de color es la antorcha,
     que es naranja, y el ambiente tiene que ser lo CONTRARIO para que la piedra
     se lea a piedra: gris apenas frio. Con el ambiente calido de afuera puesto
     al doble, mas la antorcha, el pasillo salia de un naranja parejo de punta a
     punta y no se distinguia el piso de la pared. */
  ambiente.color.copy(_luzGuardada.c).lerp(_CUEVA_ARRIBA, h);
  if (ambiente.groundColor) ambiente.groundColor.copy(_luzGuardada.g).lerp(_CUEVA_ABAJO, h);
  /* Y LA VIÑETA SE AFLOJA ADENTRO, que si no el post-proceso se come el
     pasillo. La cuenta: la viñeta multiplica las esquinas por 0,16 y el
     posterizado de nueve niveles manda a NEGRO PURO todo lo que quede por
     debajo de 1/18 = 0,055. Con el pasillo alrededor de 0,10, la mitad del
     cuadro caía del lado del cero. Afuera la viñeta sirve para empujar la vista
     al centro; adentro eso ya lo hace el propio pasillo. */
  postMat.uniforms.vig.value = _luzGuardada.v * (k + 0.22*h);
  /* Y LA SATURACION BAJA ADENTRO, que es lo que faltaba y no se arregla con
     luces. El post multiplica el color por 2,2 —afuera eso es lo que hace que
     el pasto y el mar se lean— pero adentro la UNICA luz de color es la
     antorcha, que es naranja: saturar por 2,2 una piedra gris iluminada de
     naranja devuelve una pared ROJA. Medido en la captura, el pasillo entero
     salia entre bordo y oliva y no habia forma de distinguir el piso de la
     pared. Con 1,25 la piedra vuelve a ser piedra y la sangre sigue leyendose,
     porque la sangre ya es roja de por si. */
  postMat.uniforms.sat.value = lerp(_luzGuardada.sa, LUZC.sat, h);
  /* y la antorcha, que adentro es la única luz que hay */
  const g = MIS.antorchaMalla;
  if (g) for (const o of g.children) if (o.isPointLight && o.userData.base){
    o.intensity = o.userData.base.i * (1 + h*LUZC.ant);
    o.distance = o.userData.base.d * (1 + h*LUZC.dist);
  }
}
