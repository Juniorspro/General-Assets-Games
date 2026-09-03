
/* ══════════════════ LA TABLA, EL BOL Y EL AGUA ══════════════════
   Es la mitad del juego. Tres cuerpos encadenados y cada uno se pierde de una
   forma distinta:

     · el BOL se desliza sobre la tabla   → si llega al borde, se cae y perdés
     · el AGUA chapotea dentro del bol    → si se derrama toda, perdés
     · y la TABLA es lo único que manejás

   DOS CUERPOS Y NO UNO, y ahí está el diseño: si el bol estuviera clavado a la
   tabla, el juego sería «no inclines». Con el bol suelto, inclinar de más lo
   MANDA, y para frenarlo hay que inclinar al revés en el momento justo — o sea
   que se puede corregir un error, y corregir es lo que hace que haya destreza y
   no sólo castigo. */
const TABLA = { r: 0.30 };                 /* radio útil: más allá, el bol se cae */
const BOL = {
  x: 0, z: 0, vx: 0, vz: 0,                /* posición sobre la tabla, en metros */
  agua: 1,                                 /* 1 = lleno */
  ox: 0, oz: 0, ovx: 0, ovz: 0,            /* la ola de adentro */
  cayo: false, derramo: 0
};
/* g está bajo a propósito. Con 9,8 el bol cruza los treinta centímetros en
   medio segundo y no hay forma humana de corregir: se vuelve un juego de no
   respirar. Con 3,4 hay como un segundo y medio de margen, que es el tiempo que
   tarda una persona en darse cuenta de que se está yendo y reaccionar. */
const G_BOL = 3.4;
const ROCE_BOL = 1.9;
/* la ola: un resorte amortiguado dentro del bol. Su frecuencia está DEBAJO de
   la del bol a propósito, así que después de un susto el agua sigue moviéndose
   cuando el bol ya se frenó — y ese resto es el que te derrama encima. */
const OLA_W = 7.4, OLA_Z = 0.28, R_BOL = 0.075;

function pasoBol(dt, sacudida){
  const inc = inclinacion();
  /* la aceleración sale directo de la pendiente: la componente horizontal del
     «arriba» de la tabla ES el seno del ángulo, así que no hace falta un asin */
  let ax = -inc.x * G_BOL, az = -inc.z * G_BOL;
  if (sacudida){ ax += sacudida.x; az += sacudida.z; }
  BOL.vx += ax * dt; BOL.vz += az * dt;
  const f = Math.min(1, ROCE_BOL * dt);
  BOL.vx -= BOL.vx * f; BOL.vz -= BOL.vz * f;
  BOL.x += BOL.vx * dt; BOL.z += BOL.vz * dt;

  const d = Math.hypot(BOL.x, BOL.z);
  if (d > TABLA.r && !BOL.cayo){ BOL.cayo = true; }

  /* ── EL AGUA: LA OLA SIGUE A LA ACELERACIÓN DEL BOL, NO A LA INCLINACIÓN ──
     Si siguiera a la inclinación, inclinar despacio derramaría igual que un
     sacudón, y eso es falso: el agua se sale cuando algo CAMBIA de golpe. */
  const oax = -OLA_W*OLA_W*BOL.ox - 2*OLA_Z*OLA_W*BOL.ovx - ax*0.55;
  const oaz = -OLA_W*OLA_W*BOL.oz - 2*OLA_Z*OLA_W*BOL.ovz - az*0.55;
  BOL.ovx += oax * dt; BOL.ovz += oaz * dt;
  BOL.ox += BOL.ovx * dt; BOL.oz += BOL.ovz * dt;
  const o = Math.hypot(BOL.ox, BOL.oz);
  /* se derrama sólo lo que se pasa del borde del bol, y en proporción: así un
     roce cuesta una gota y un sacudón cuesta un chorro */
  if (o > R_BOL * 0.62){
    const exceso = o - R_BOL * 0.62;
    BOL.agua = Math.max(0, BOL.agua - exceso * 2.6 * dt * 60 * dt);
    BOL.derramo = Math.min(1, exceso / (R_BOL*0.5));
    /* y la ola se recorta al borde: sin esto crece sin techo y el bol se vacía
       de un cuadro al otro */
    const k = (R_BOL*0.62) / o;
    BOL.ox *= k; BOL.oz *= k;
  } else BOL.derramo = Math.max(0, BOL.derramo - dt*3);
  return BOL;
}

function reiniciaBol(){
  BOL.x = BOL.z = BOL.vx = BOL.vz = 0;
  BOL.ox = BOL.oz = BOL.ovx = BOL.ovz = 0;
  BOL.agua = 1; BOL.cayo = false; BOL.derramo = 0;
}

/* ── LO QUE SE VE: LA TABLA Y EL BOL EN LAS MANOS ── */
let gTabla = null, mBol = null, mAgua = null, gCae = null;
function armaTabla(){
  if (gTabla) return;
  const g = new T.Group();
  /* ── LA TABLA NO PROYECTA SOMBRA, Y NO ES UN AHORRO ──
     Está a setenta centímetros del lente y la linterna sale del lente: con
     `castShadow` puesto, la tabla le tapa el cono a TODO el pasillo — medido en
     la captura, el corredor entero quedaba negro y sólo se veía el bol. Una
     tabla que uno lleva en las manos no puede hacerle sombra a lo que uno mira. */
  const t = new T.Mesh(new T.BoxGeometry(0.62, 0.020, 0.42), matMadera);
  t.castShadow = false; t.receiveShadow = true;
  g.add(t);
  /* un listón en cada punta: es lo que hace que se lea a tabla y no a rectángulo
     flotando, y de paso dice dónde están los bordes que importan */
  for (const s of [-1, 1]){
    const l = new T.Mesh(new T.BoxGeometry(0.62, 0.026, 0.022), matMadera);
    l.position.set(0, 0.022, s*0.199);
    l.castShadow = false;
    g.add(l);
  }
  gTabla = g;
  cam.add(g);

  const b = new T.Group();
  const cuenco = new T.Mesh(new T.CylinderGeometry(R_BOL, R_BOL*0.76, 0.058, 20, 1, true), matCeram);
  cuenco.material = matCeram.clone(); cuenco.material.side = T.DoubleSide;
  const base = new T.Mesh(new T.CylinderGeometry(R_BOL*0.76, R_BOL*0.76, 0.006, 20), matCeram);
  base.position.y = -0.029;
  b.add(cuenco); b.add(base);
  b.castShadow = false;
  mAgua = new T.Mesh(new T.CircleGeometry(R_BOL*0.93, 24), matAgua);
  mAgua.rotation.x = -Math.PI/2;
  b.add(mAgua);
  mBol = b;
  gTabla.add(b);

  /* ── LA TABLA VIVE EN SU PROPIA CAPA, CON SU PROPIA LUZ ──
     La linterna sale del lente y la tabla está a sesenta y seis centímetros del
     lente: le entra el centro del haz de lleno. Medido con `brillo()`, el bol
     salía en 248 de 255 —un disco blanco sin forma— haya la pared que haya
     detrás, y bajarle el color al material no alcanza porque el problema no es
     el color, es que está adentro del foco.
     En three.js una luz sólo alcanza a los objetos que comparten capa con ella.
     La tabla, el bol y el agua pasan a la capa 2; la linterna se queda en la 0,
     así que deja de tocarlos; y la capa 2 tiene una luz propia, tenue y cálida,
     que es la que se merece algo que uno lleva en las manos. La cámara habilita
     las dos capas, si no la tabla no se dibujaría. */
  gTabla.traverse(o => o.layers.set(2));
  cam.layers.enable(2);
}

function ponTabla(){
  if (!gTabla) return;
  const inc = inclinacion();
  /* la tabla se dibuja INCLINADA lo que dice el sensor, y ésa es la única
     realimentación honesta: el jugador tiene que ver lo mismo que el bol siente */
  /* la tabla se levanta hasta que se vea ENTERA: a −0,40 y 0,62 el borde de
     abajo caía fuera del cuadro y sólo se veía el bol flotando. Medido a 66° de
     campo, a 0,70 m entran 0,91 m de alto, así que −0,30 deja la tabla en el
     tercio de abajo con los dos listones adentro. */
  gTabla.position.set(0, -0.335, -0.66);
  gTabla.rotation.set(Math.asin(Math.max(-1, Math.min(1, inc.z))) * 0.9,
                      0,
                      -Math.asin(Math.max(-1, Math.min(1, inc.x))) * 0.9);
  const y = 0.011 + 0.029;
  mBol.position.set(BOL.x, y, BOL.z);
  /* la ola: el disco de agua se inclina y baja con lo que queda */
  mAgua.position.y = -0.006 + BOL.agua * 0.036;
  mAgua.rotation.z = -BOL.ox * 5.5;
  mAgua.rotation.x = -Math.PI/2 + BOL.oz * 5.5;
  mAgua.scale.setScalar(0.55 + BOL.agua * 0.45);
  mBol.visible = !BOL.cayo;
}
