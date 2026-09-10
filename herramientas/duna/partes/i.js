
/* ══════════════════════════════════════════════════════════════════════════
   EL RIDER DIBUJADO
   ──────────────────────────────────────────────────────────────────────────
   Es lo que el pedido nombra —"animaciones tan buenas"— y no se consigue con
   mas cuadros: se consigue con TRES cosas, y ninguna es un sprite.

     1. UNA POSE QUE SALE DEL ESTADO, no de un reloj. Agachado, encogido,
        brazos abiertos y inclinacion son cuatro numeros que persiguen su
        objetivo con un resorte; el objetivo lo pone lo que el cuerpo esta
        haciendo. Asi el rider se agacha porque va rapido y se encoge porque
        esta girando, y no porque el cuadro 7 diga eso.
     2. LA BUFANDA, que es fisica de verdad —una cadena de verlet colgada del
        cuello— y por lo tanto NUNCA se repite igual. Es lo unico del juego
        que reacciona a algo que el jugador no controla, y a treinta pixeles
        de alto es la mitad de lo que se lee del personaje.
     3. LA ARENA. Un rider bajando una duna sin levantar arena se lee a
        calcomania deslizandose.

   Y TODO VA DE UN SOLO COLOR. El suelo es lo claro y lo que se apoya en el
   es negro: dibujar una cara, un color de campera o un reflejo rompe el
   estilo entero. Lo que distingue al rider de un cactus es que se MUEVE.

   EL COSTO DE ESTO ES CASI CERO y conviene decir por que: el cuerpo son
   nueve capsulas —lineas gruesas con punta redonda— la bufanda son diez
   puntos y la arena son como mucho noventa discos de tres pixeles. No hay
   una sola imagen que decodificar ni un solo triangulo.                   */

const RIDER_ESC = 1.0;                 // metros; el cuerpo se escribe en metros
const BUF_N = 10, BUF_SEG = 0.17;      // 1,53 m de bufanda
const ARE_MAX = 96;                    // tope de granos vivos
const EST_MAX = 60, EST_DT = 0.035;    // la estela de la tabla

/* la pose suavizada. Son objetivos que se persiguen, no valores que se
   escriben: sin el resorte, pasar de suelo a aire cambia la silueta en un
   cuadro y eso se lee a que el dibujo se cambio, no a que el cuerpo se movio */
const POSE = { ag: 0.3, tk: 0, br: 0.2, ln: 0, sq: 0 };

const BUF = [];                        // {x,y,px,py} en METROS de mundo
const ARE = [];                        // los granos
const EST = [];                        // {x,y} de la tabla
let EST_T = 0;

function riderVisReinicia() {
  BUF.length = 0;
  const nx = R.x, ny = R.y + 1.45;
  for (let i = 0; i < BUF_N; i++) BUF.push({ x: nx - i * BUF_SEG, y: ny, px: nx - i * BUF_SEG, py: ny });
  ARE.length = 0; EST.length = 0; EST_T = 0;
  POSE.ag = 0.3; POSE.tk = 0; POSE.br = 0.2; POSE.ln = 0; POSE.sq = 0;
}

/* ── LA POSE ──────────────────────────────────────────────────────────────
   Cuatro escalares y de ahi sale todo el cuerpo. El que mas trabaja es `tk`:
   encogerse es lo unico que hace que una voltereta se lea a voltereta y no a
   un palo girando, porque lo que el ojo sigue en un giro es la SILUETA, y
   una silueta compacta gira legible y una abierta se vuelve un molinete.  */
function riderVis(dt, x, y, ang) {
  dt = Math.min(dt, 1 / 30);
  const vn = clamp((R.s - 10) / 22, 0, 1);
  const gira = Math.min(1, Math.abs(R.rot) / (GIRO_V * 0.55));

  let ag, tk, br, ln;
  if (R.cuerda) {          // colgado: rodillas flojas y brazos abiertos para el equilibrio
    ag = 0.42; tk = 0; br = 1.0; ln = 0.10;
  } else if (R.suelo) {    // apoyado: cuanto mas rapido, mas agachado y mas adelante
    /* LOS BRAZOS VAN ABIERTOS Y NO PEGADOS AL CUERPO. Con `br` en 0,2 las dos
       manos quedan POR DEBAJO del hombro y la silueta se lee CORRIENDO —es lo
       que salio en la captura—: lo que dice "va sobre una tabla" es un brazo
       adelante y otro atras, casi horizontales, que es como se equilibra
       cualquiera sobre algo que se desliza.
       Y EL AGACHE BAJO DE 0,70 A 0,32. Con 0,46 por velocidad el cuerpo medido
       quedaba en 1,64 m de alto contra una tabla de 2,08: la tabla medida 1,27
       veces el rider, y en la captura lo que se leia era una tabla enorme con
       un bulto encima. La tabla se acorto y el cuerpo se enderezo: 1,76 contra
       1,72, o sea uno a uno, que es la proporcion de una tabla de verdad. */
    ag = 0.16 + 0.32 * vn; tk = 0; br = 0.54 + 0.30 * vn; ln = 0.16 + 0.34 * vn;
  } else if (gira > 0.25) {// girando: encogido
    ag = 0.86; tk = 1; br = 0.05; ln = 0.30;
  } else {                 // en el aire y derecho: estirado, que es lo que dice "estoy volando"
    ag = 0.06; tk = 0; br = 0.85; ln = 0.05;
  }
  if (!R.vivo) { ag = 0.95; tk = 0.6; br = 1.0; }

  const k = 1 - Math.pow(0.00002, dt);          // ~90 ms
  POSE.ag = mezcla(POSE.ag, ag + R.sacude * 0.55, k);
  POSE.tk = mezcla(POSE.tk, tk, k);
  POSE.br = mezcla(POSE.br, br, k);
  POSE.ln = mezcla(POSE.ln, ln, k);
  /* el aplaste es el aterrizaje, y va CON EL ANCLA EN LOS PIES: escalando
     desde el centro el cuerpo se hunde en la arena la mitad de lo que se
     aplasta, y entonces el golpe se lee a que atraveso el suelo */
  POSE.sq = mezcla(POSE.sq, R.sacude, 1 - Math.pow(0.0008, dt));

  bufandaPaso(dt, x, y, ang);
  arenaPaso(dt, x, y, ang);
  estelaPaso(dt, x, y);
}

/* ── LA BUFANDA ───────────────────────────────────────────────────────────
   Verlet: cada punto se acuerda de donde estaba, y de esa diferencia sale su
   velocidad. No hay que escribir "la bufanda va hacia atras" en ningun lado
   —va hacia atras porque el cuello se le escapa— y por eso al frenar se
   adelanta sola, al girar se enrosca y al caer flota. Eso es lo que ninguna
   animacion dibujada da.
   VA EN COORDENADAS DE MUNDO Y NO DEL CUERPO: pegada al cuerpo giraria con
   el, o sea que en una voltereta la bufanda daria la vuelta rigida al lado
   de la cabeza en vez de quedarse atras, que es lo que hace una tela.     */
function bufandaPaso(dt, x, y, ang) {
  if (!BUF.length) riderVisReinicia();
  const c = Math.cos(ang), s = Math.sin(ang);
  const nx = x + (-0.05 * c - 1.38 * s), ny = y + (-0.05 * s + 1.38 * c);
  BUF[0].x = nx; BUF[0].y = ny; BUF[0].px = nx; BUF[0].py = ny;

  /* EL AMORTIGUAMIENTO ES EL VIENTO, y tenia que ser mucho mas fuerte. En
     verlet, la resistencia del aire y la amortiguacion son la MISMA cosa: la
     velocidad es la diferencia con el cuadro anterior, asi que frenarla es
     exactamente frenarla contra el aire quieto. Con 0,986 por paso cada punto
     se llevaba puesta la velocidad del cuello y viajaba CON el, o sea que la
     tela quedaba flotando al lado de la cabeza en vez de quedarse atras:
     medido, 1,53 m de bufanda ocupaban 0,42 m — un ovillo, invisible a
     treinta pixeles. Con 0,88 el punto casi no avanza solo y lo unico que lo
     mueve es la cuerda tirando: la bufanda se va atras y se estira.
     PERO CON 0,88 SE PASO PARA EL OTRO LADO: medido en la captura, una RECTA
     perfecta saliendo del cuello —una antena, no una tela—. A veinte metros
     por segundo una bufanda VA tensa, eso es cierto; lo que le faltaba es la
     ondulacion. Con 0,94 por paso la punta conserva algo de vida propia y la
     turbulencia no se apaga entre cuadro y cuadro.                        */
  const dt2 = dt * dt, amort = Math.pow(0.024, dt);
  const wy = -R.vy * 0.30;
  for (let i = 1; i < BUF.length; i++) {
    const p = BUF[i], f = i / (BUF.length - 1);
    const vx = (p.x - p.px) * amort, vy = (p.y - p.py) * amort;
    p.px = p.x; p.py = p.y;
    /* la turbulencia AFLOJA hacia la punta: con el mismo temblor en los diez
       puntos la bufanda ondula rigida como un cable, y lo que la hace tela es
       que la punta se sacude mas que la raiz */
    const ax = Math.sin(TIEMPO * 5.1 + i * 2.3) * 44 * f;
    const ay = -13 + wy * (0.3 + 0.7 * f) + Math.cos(TIEMPO * 7.3 + i * 1.7) * 62 * f;
    p.x += vx + ax * dt2; p.y += vy + ay * dt2;
  }
  for (let it = 0; it < 3; it++) {
    for (let i = 1; i < BUF.length; i++) {
      const a = BUF[i - 1], b = BUF[i];
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 1e-5) { dx = -0.1; dy = 0; d = 0.1; }
      const f = (d - BUF_SEG) / d;
      b.x -= dx * f; b.y -= dy * f;                 // solo se mueve el hijo: el cuello manda
    }
    /* Y UNA CADENA SIN RIGIDEZ SE OVILLA. Las restricciones de distancia
       conservan el largo de cada tramo y no dicen NADA del angulo entre dos,
       asi que una tela puede doblarse sobre si misma y quedar hecha un bollo
       sin violar ninguna. Empujar cada punto hacia el medio de sus dos
       vecinos es lo que la endereza, y es lo unico que separa una bufanda de
       un collar de cuentas. Va DENTRO del lazo para que la distancia lo
       corrija despues, si no la tela se acorta.
       Y ES 0,05 Y NO 0,22: con 0,22 aplicado tres veces por cuadro la cadena
       queda PERFECTAMENTE recta, que es el defecto opuesto y se ve igual de
       mal. Lo que hace falta es lo justo para que no se oville, no para que
       no se doble — una tela se dobla, ahi esta la gracia.                */
    for (let i = 1; i < BUF.length - 1; i++) {
      const a = BUF[i - 1], b = BUF[i], c = BUF[i + 1];
      b.x += ((a.x + c.x) * 0.5 - b.x) * 0.05;
      b.y += ((a.y + c.y) * 0.5 - b.y) * 0.05;
    }
  }
  /* Y ARRASTRA POR LA ARENA. Cuesta una comparacion por punto y es lo que
     hace que bajar pegado a una duna se sienta pegado a la duna. */
  /* Y EL CHOQUE NO PUEDE MOVER LA POSICION SOLA. En verlet la velocidad ES la
     diferencia con el cuadro anterior, asi que subir un punto sin subir
     tambien su `py` le REGALA velocidad hacia arriba igual a lo que penetro
     — y a sesenta cuadros por segundo eso se acumula. Medido en la primera
     captura: la bufanda se enroscaba POR ENCIMA DE LA CABEZA en vez de ir
     atras, y se leia a antena. Es el defecto clasico de una colision verlet.
     Subiendo los dos, el punto se apoya con velocidad vertical cero. */
  for (let i = 1; i < BUF.length; i++) {
    const p = BUF[i], py = terrY(p.x);
    if (hayPiso(p.x) && p.y < py + 0.06) {
      p.y = py + 0.06; p.py = p.y;
      p.px += (p.x - p.px) * 0.35;          // y roza: la arena frena la tela
    }
  }
}

/* ── LA ARENA ─────────────────────────────────────────────────────────────
   Sale de la COLA de la tabla y no de su centro, que es de donde sale de
   verdad, y va hacia atras con la mitad de la velocidad del rider: emitida
   quieta se ve como una nube que el rider deja atras, y lo que tiene que
   verse es una estela que lo persigue.                                    */
let ARE_ac = 0, ARE_golpe = 0;
function arenaSuelta(x, y, ang, n, fuerza) {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 0; i < n && ARE.length < ARE_MAX; i++) {
    const o = -0.55 - Math.random() * 0.55;
    const a = Math.random() * 2.2 + 0.6;
    ARE.push({
      x: x + o * c, y: y + o * s + 0.05,
      vx: -R.vx * (0.10 + Math.random() * 0.26) - Math.cos(a) * fuerza * 1.4,
      vy: Math.sin(a) * fuerza * 2.6 + Math.random() * 1.4,
      t: 0, T: 0.42 + Math.random() * 0.55, r: 0.055 + Math.random() * 0.11,
    });
  }
}
function arenaPaso(dt, x, y, ang) {
  if (R.vivo && (R.suelo || R.cuerda) && R.polvo > 0.12) {
    ARE_ac += R.polvo * 78 * dt;
    const n = Math.floor(ARE_ac); ARE_ac -= n;
    if (n > 0) arenaSuelta(x, y, ang, n, 0.35 + R.polvo * 0.75);
  } else ARE_ac = 0;
  if (R.sacude > 0.30 && !ARE_golpe) { ARE_golpe = 1; arenaSuelta(x, y, ang, 16, 1.5); }
  if (R.sacude < 0.12) ARE_golpe = 0;

  for (let i = ARE.length - 1; i >= 0; i--) {
    const p = ARE[i];
    p.t += dt;
    if (p.t >= p.T) { ARE.splice(i, 1); continue; }
    p.vy -= 11 * dt; p.vx *= Math.pow(0.30, dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    const py = terrY(p.x);
    if (hayPiso(p.x) && p.y < py) { p.y = py; p.vy = 0; p.vx *= Math.pow(0.02, dt); }
  }
}

/* ── LA ESTELA ────────────────────────────────────────────────────────────
   Un surco que se apaga. No es adorno: es lo unico que dice cuanto se
   recorrio en el ultimo segundo, y en un juego que corre a treinta metros
   por segundo sobre un fondo que se repite, eso es lo que da velocidad.  */
function estelaPaso(dt, x, y) {
  EST_T -= dt;
  if (EST_T <= 0 && R.vivo && (R.suelo || R.cuerda)) {
    EST_T = EST_DT;
    EST.push({ x, y });
    if (EST.length > EST_MAX) EST.shift();
  }
  while (EST.length && EST[0].x < CAM.x - 6) EST.shift();
}

/* ── EL DIBUJO ────────────────────────────────────────────────────────────
   Todo en metros y en el marco del cuerpo: se traslada al punto de apoyo, se
   gira, se escala a pixeles, y de ahi en mas el cuerpo se escribe con las
   medidas de una persona. Sin esto habria que meter senos y cosenos en cada
   articulacion, que es como se termina con un codo que sale del hombro.  */
function _hueso(ax, ay, bx, by, w) {
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  ctx.lineWidth = w; ctx.stroke();
}

function pintaEstela() {
  if (EST.length < 2) return;
  ctx.strokeStyle = rgb(mezclaC(PAL.su, PAL.si, 0.30), 1);
  ctx.lineWidth = Math.max(1.5, 0.16 * ESC);
  ctx.lineCap = 'round';
  const n = EST.length;
  for (let i = 1; i < n; i++) {
    ctx.globalAlpha = (i / n) * 0.55;
    ctx.beginPath();
    ctx.moveTo(sx(EST[i - 1].x), sy(EST[i - 1].y));
    ctx.lineTo(sx(EST[i].x), sy(EST[i].y));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function pintaArena() {
  if (!ARE.length) return;
  /* del color de una SOMBRA sobre la arena y no de un blanco: el suelo ya es
     lo mas claro del cuadro, asi que una nube clara sobre arena clara no
     existe. Es la inversion del estilo aplicada tambien al polvo. */
  const c = mezclaC(PAL.su, PAL.si, 0.34);
  for (let i = 0; i < ARE.length; i++) {
    const p = ARE[i], v = 1 - p.t / p.T;
    ctx.globalAlpha = v * v * 0.60;
    ctx.fillStyle = rgb(c, 1);
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), Math.max(0.8, p.r * ESC * (0.5 + v)), 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function pintaRider(x, y, ang) {
  const ag = POSE.ag, tk = POSE.tk, br = POSE.br, ln = POSE.ln, sq = POSE.sq;
  const col = rgb(PAL.si, 1);

  /* la bufanda va PRIMERO y en coordenadas de mundo: esta detras del cuerpo
     y encima puede quedar bajo la tabla al arrastrarse por la arena */
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(sx(BUF[0].x), sy(BUF[0].y));
  for (let i = 1; i < BUF.length - 1; i++) {
    const p = BUF[i], q = BUF[i + 1];
    ctx.quadraticCurveTo(sx(p.x), sy(p.y), sx((p.x + q.x) / 2), sy((p.y + q.y) / 2));
  }
  ctx.lineWidth = Math.max(1.6, 0.135 * ESC);
  ctx.stroke();

  ctx.save();
  ctx.translate(sx(x), sy(y));
  ctx.rotate(-ang);                                  // la y de pantalla va al reves
  ctx.scale(ESC * RIDER_ESC, -ESC * RIDER_ESC);      // de aca en mas: metros, y hacia arriba
  ctx.scale(1 + sq * 0.20, 1 - sq * 0.26);           // aplaste anclado en los pies

  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  /* LA TABLA. Va con las puntas levantadas y no como una raya: una raya
     recta bajo una duna curva se despega en las dos puntas y se lee a error
     de dibujo, y ademas es la silueta que dice "esto es una tabla".
     MIDE 1,76 Y NO 2,08, y el numero sale de una proporcion medida: el cuerpo
     con el agache de crucero llega a 1,72 m de alto, asi que una tabla de 2,08
     media 1,21 veces el rider — en la captura se leia una tabla enorme con
     alguien encima y no alguien sobre una tabla. Una tabla de verdad mide como
     el que la usa.                                                        */
  ctx.beginPath();
  ctx.moveTo(-0.86, 0.10); ctx.quadraticCurveTo(-0.46, -0.06, 0, -0.06);
  ctx.quadraticCurveTo(0.52, -0.06, 0.90, 0.13);
  ctx.lineWidth = 0.135; ctx.stroke();

  /* LAS PIERNAS SON UNA POSTURA DE TABLA Y NO UNA ZANCADA, y la diferencia es
     de tres centimetros: con las dos rodillas en la misma x —los dos por
     delante de los dos pies— el cuerpo se lee CORRIENDO, que es exactamente
     lo que salio en la primera captura. Cada rodilla va sobre SU pie y lo que
     las abre es la cadera baja y atras: eso es una postura de tabla vista de
     costado, y se reconoce por la A que forman las piernas.               */
  const PIE_A = -0.42, PIE_D = 0.40;
  const cadY = 0.80 - 0.32 * ag - 0.16 * tk, cadX = -0.10 - 0.12 * ln - 0.06 * ag;
  const rodY = 0.46 - 0.17 * ag - 0.12 * tk;
  const rodA = PIE_A + 0.20 + 0.10 * ag, rodD = PIE_D - 0.05 + 0.12 * ag;
  _hueso(PIE_A, 0.02, rodA, rodY, 0.115);
  _hueso(rodA, rodY, cadX - 0.03, cadY, 0.125);
  _hueso(PIE_D, 0.02, rodD, rodY - 0.02, 0.115);
  _hueso(rodD, rodY - 0.02, cadX + 0.05, cadY, 0.125);

  // el tronco: se inclina hacia adelante con la velocidad y se enrosca al girar
  const homY = cadY + 0.56 - 0.10 * tk, homX = cadX + 0.20 + 0.26 * ln + 0.14 * tk;
  _hueso(cadX, cadY, homX, homY, 0.19);

  /* LOS BRAZOS. Uno adelante y otro ATRAS, y el de atras tiene que LLEGAR
     atras: con la mano trasera a 0,42 m del hombro lo que se dibujaba era un
     muñon, y en la captura el unico brazo que se leia era el delantero — o sea
     una sola linea saliendo del torso, que es la silueta de alguien corriendo.
     Lo que dice "equilibrio sobre algo que se desliza" es la CRUZ: dos manos
     lejos del cuerpo y a los dos lados.                                    */
  const maY = homY + (-0.30 + 0.46 * br) - 0.20 * tk;
  const maX = homX + (0.22 + 0.42 * br) + 0.18 * tk;
  const coX = homX + 0.16 - 0.02 * br, coY = homY - 0.24 + 0.12 * br;
  _hueso(homX, homY, coX, coY, 0.085);
  _hueso(coX, coY, maX, maY, 0.085);
  const bx = homX - 0.44 - 0.30 * br, by = homY - 0.26 + 0.30 * br;
  const cbX = homX - 0.24, cbY = homY - 0.24 + 0.06 * br;
  _hueso(homX, homY, cbX, cbY, 0.085);
  _hueso(cbX, cbY, bx, by, 0.085);

  /* LA CABEZA, CON CUELLO. Medido con la pose de crucero, el centro del disco
     caia a 0,264 m del hombro y entre el radio de la cabeza y el medio grosor
     del torso ya habia 0,280: se pisaban, y lo que se veia era un bulto sin
     cuello — una sola mancha de hombro-a-craneo. Va mas arriba, un poco mas
     chica, y con un cuello dibujado: sin el cuello la cabeza queda flotando,
     que es peor que pegada.                                               */
  const cueX = homX + 0.06 + 0.03 * ln, cueY = homY + 0.15;
  _hueso(homX, homY, cueX, cueY, 0.105);
  const cabX = homX + 0.11 + 0.06 * ln, cabY = homY + 0.36;
  ctx.beginPath(); ctx.arc(cabX, cabY, 0.165, 0, 6.2832); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cabX - 0.18, cabY + 0.05);
  ctx.quadraticCurveTo(cabX - 0.32, cabY - 0.10, cabX - 0.19, cabY - 0.21);
  ctx.lineTo(cabX - 0.02, cabY - 0.13);
  ctx.closePath(); ctx.fill();

  ctx.restore();
}
