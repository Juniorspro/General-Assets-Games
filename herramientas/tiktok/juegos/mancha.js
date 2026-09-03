/* ══════════════════════════ MANCHA ══════════════════════════
   Cuarenta y cinco segundos, una cancha y cuatro manchas. La tuya pinta por
   donde pasa; las otras tres también. Al final gana el que pintó más.

   ES EL ÚNICO DE LOS CINCO QUE SE JUEGA CONTRA ALGUIEN, y está por eso: los
   otros cuatro se pierden contra uno mismo, y este se pierde contra tres tipos
   que se ven en la pantalla haciendo lo que uno debería haber hecho. Eso es lo
   que hace que la revancha sea inmediata — es la lección del *Splatoon* de
   móvil y de los cinco de fiesta que TikTok tiene en prueba.

   ── PINTAR ES UNA GRILLA, NO UN DIBUJO ──
   La decisión que ordena todo. La pintura NO se guarda como trazos: se guarda
   como una grilla de celdas con su dueño. Eso da tres cosas de una:
     · el marcador es EXACTO y se cuenta sumando, no midiendo píxeles;
     · pisar la pintura de otro es asignar un número, o sea que robar sale
       gratis y no hace falta ninguna lógica de capas;
     · y el dibujo se hornea en un lienzo aparte y sólo se repintan las celdas
       QUE CAMBIARON. Sin eso serían cuatrocientos rellenos por cuadro para
       dibujar algo que cambia en cinco celdas.
   Es la misma técnica que la grilla gruesa de RASPÁ, y por la misma razón:
   `getImageData` por cuadro es cientos de miles de bytes para contestar un
   número que se puede llevar sumado. */

const JT = {
  es: { sub: 'Pintá más que los otros tres.\nPisar su pintura la roba.',
        tuyo: 'TUYO', balde: '¡BROCHA GORDA!', bomba: '¡BOMBA!', racha: 'RACHA', finBien: '¡LA CANCHA ES TUYA!', finMal: 'TE PINTARON MÁS',
        c1: 'Una cancha vacía.',
        c2: 'Y otros tres.',
        c3: 'Pintá con el dedo.',
        c4: 'Cuarenta y cinco segundos.' },
  en: { sub: 'Paint more than the other three.\nStepping on their paint steals it.',
        tuyo: 'YOURS', balde: 'BIG BRUSH!', bomba: 'BOMB!', racha: 'STREAK', finBien: 'THE FIELD IS YOURS!', finMal: 'THEY OUT-PAINTED YOU',
        c1: 'An empty field.',
        c2: 'And three others.',
        c3: 'Paint with your finger.',
        c4: 'Forty-five seconds.' },
  pt: { sub: 'Pinte mais que os outros três.\nPisar na tinta deles rouba.',
        tuyo: 'SEU', balde: 'ROLO GRANDE!', bomba: 'BOMBA!', racha: 'SEQUÊNCIA', finBien: 'A QUADRA É SUA!', finMal: 'PINTARAM MAIS QUE VOCÊ',
        c1: 'Uma quadra vazia.',
        c2: 'E outros três.',
        c3: 'Pinte com o dedo.',
        c4: 'Quarenta e cinco segundos.' }
};

/* el 0 es siempre el jugador. Los cuatro colores son de la misma familia que el
   resto de los cinco juegos, y el del jugador es el más claro de los cuatro:
   en una cancha con cuatro manchas mezcladas, la propia tiene que poder
   encontrarse de una ojeada. */
/* la piel del menú: acá el telón es el piso de la cancha, porque este juego no
   tiene fondo propio — lo que se mira es la cancha */
const PIEL = { ac: '#e8b46a', tela: 'piso', rachaFin: false };
const SON_ALIAS = { bien: 'splat', poder: 'power', combo: 'combo' };

const DUE = ['#e8b46a', '#3f8f5c', '#3a63b8', '#9a5fb8'];
const CEL = 40;
const DUR = 45;
const R_PINTA = 38;
/* ── LOS DOS OBJETOS DE LA CANCHA ──
   Uno cada nueve segundos y nunca los dos a la vez. Están por lo mismo que los
   poderes de SEGUIDORES: sin ellos, la partida es cuarenta y cinco segundos de
   la misma acción y la única decisión es a dónde ir. Con ellos hay un momento
   en el que conviene DEJAR de pintar para ir a buscar algo, y eso es una
   decisión con costo.
     · el BALDE engorda la brocha un 80 % por siete segundos
     · la BOMBA pinta de golpe un círculo de tres celdas de radio */
const OBJ_CADA = 9;
const BALDE_DUR = 7;
const BOMBA_R = 3.2;            /* en celdas */
const VEL_JUG = 430;
const VEL_BOT = 395;      /* apenas más lentos: con la misma velocidad, tres bots
                             que nunca se equivocan de camino ganan siempre */

const M = {
  cols: 0, filas: 0, x0: 0, y0: 0, w: 0, h: 0,
  rej: null, of: null, og: null,
  t: 0, cuenta: [0, 0, 0, 0], libres: 0,
  yo: null, bots: [], toque: false,
  objs: [], objCd: 0, balde: 0, avisoP: 0, txtP: '', robadas: 0
};

const JUEGO = {
  id: 'mancha', vivo: false, gano: false, marca: 0, resta: null,

  planos: [
    { dur: 2.0, pie: 'c1', dibuja: (g, u) => { fondoMan(g); canchaCine(g, u, 0); } },
    { dur: 2.2, pie: 'c2', dibuja: (g, u) => { fondoMan(g); canchaCine(g, 1, u*0.4); } },
    { dur: 2.2, pie: 'c3', dibuja: (g, u) => { fondoMan(g); canchaCine(g, 1, 0.4 + u*0.4); } },
    { dur: 2.2, pie: 'c4', dibuja: (g, u) => {
        fondoMan(g); canchaCine(g, 1, 0.8);
        /* el reloj de la cinemática: el número bajando es lo único que este
           juego tiene de urgente, así que se muestra antes de jugar */
        texto(Math.ceil(45 - suave(u)*45) + '', 360, AL*0.5, 120,
              'rgba(242,238,230,.90)');
      } }
  ],

  arranca(){
    armaCancha();
    M.t = 0; M.toque = false;
    M.objs.length = 0; M.objCd = 4.5; M.balde = 0; M.avisoP = 0; M.txtP = '';
    M.robadas = 0; M.tomados = 0;
    M.yo = mancha(0, M.x0 + M.w*0.5, M.y0 + M.h*0.78);
    M.bots = [
      mancha(1, M.x0 + M.w*0.15, M.y0 + M.h*0.14, 'virgen'),
      mancha(2, M.x0 + M.w*0.85, M.y0 + M.h*0.14, 'ladron'),
      mancha(3, M.x0 + M.w*0.85, M.y0 + M.h*0.78, 'recto')
    ];
    JUEGO.vivo = true; JUEGO.gano = false; JUEGO.marca = 0;
    JUEGO.resta = 1;
  },

  paso(dt){
    M.t += dt;
    JUEGO.resta = 1 - M.t/DUR;

    /* ── EL JUGADOR VA HACIA EL DEDO Y NO SE PEGA A ÉL ──
       Por lo mismo que en SEGUIDORES: pegada al dedo, la mancha se
       teletransportaría y pintaría una línea que nadie recorrió — o sea que
       tocar en la otra punta pintaría la otra punta sin cruzar la cancha. Con
       techo de velocidad, la pintura es exactamente el camino que se hizo. */
    if (M.toque) mueveHacia(M.yo, TOQUE.x, TOQUE.y, VEL_JUG, dt);
    if (M.balde > 0) M.balde = Math.max(0, M.balde - dt);
    if (M.avisoP > 0) M.avisoP -= dt;
    pinta1(M.yo);
    objsPaso(dt);

    for (const b of M.bots){
      if (b.balde > 0) b.balde = Math.max(0, b.balde - dt);
      b.cd -= dt;
      if (b.cd <= 0 || cerca(b, b.tx, b.ty, 26)){ b.cd = 0.35; destinoBot(b); }
      mueveHacia(b, b.tx, b.ty, VEL_BOT, dt);
      pinta1(b);
    }

    PUNTOS = Math.round(M.cuenta[0] / (M.cols*M.filas) * 100);
    JUEGO.marca = PUNTOS + '%';

    if (M.t >= DUR){
      JUEGO.vivo = false;
      JUEGO.gano = M.cuenta[0] > Math.max(M.cuenta[1], M.cuenta[2], M.cuenta[3]);
    }
  },

  fondo(g){ fondoMan(g); },

  pinta(g){
    revisaLienzo();
    g.drawImage(M.of, M.x0, M.y0);
    /* el borde de la cancha: sin él la pintura flota sobre el fondo y no se sabe
       dónde termina lo que se puede pintar */
    caja2(M.x0 - 3, M.y0 - 3, M.w + 6, M.h + 6, 14, null, 'rgba(242,238,230,.20)');
    for (const o of M.objs) objDibujo(g, o);
    for (const b of M.bots) manchaDibujo(g, b);
    manchaDibujo(g, M.yo, true);
    barra(g);
    if (M.avisoP > 0){
      g.globalAlpha = Math.min(1, M.avisoP*1.5);
      texto(M.txtP, 360, M.y0 - 34, 34, '#ffd76a');
      g.globalAlpha = 1;
    }
  },

  baja(x, y){ M.toque = true; TOQUE.x = x; TOQUE.y = y; },
  mueve(x, y){ M.toque = true; TOQUE.x = x; TOQUE.y = y; },
  sube(){ M.toque = false; },

  pintaTextos(){},

  juegaSolo(n, azar){
    JUEGO.arranca();
    let v = 0;
    /* el bot honesto que juega por el jugador usa LA MISMA cabeza que el bot
       ladrón, o sea la mejor estrategia que el juego tiene escrita. Si el
       jugador automático usara una peor, ganarle no probaría nada. */
    const yo = M.yo;
    yo.perso = 'virgen'; yo.cd = 0;
    while (JUEGO.vivo && v < n){
      if (azar){
        if (v % 24 === 0){ yo.tx = M.x0 + Math.random()*M.w; yo.ty = M.y0 + Math.random()*M.h; }
      } else {
        yo.cd -= PASO;
        if (yo.cd <= 0 || cerca(yo, yo.tx, yo.ty, 26)){ yo.cd = 0.35; destinoBot(yo); }
      }
      M.toque = false;
      mueveHacia(yo, yo.tx, yo.ty, VEL_JUG, PASO);
      JUEGO.paso(PASO);
      v++;
    }
    const tot = M.cols*M.filas;
    return { vueltas: v, segundos: +(v/60).toFixed(1),
             celdas: tot, libres: M.libres,
             cuenta: M.cuenta.slice(), pct: M.cuenta.map(c => +(c/tot*100).toFixed(1)),
             puntos: PUNTOS, gano: JUEGO.gano, vivo: JUEGO.vivo,
             robadas: M.robadas, objetos: M.tomados || 0, racha: COMBO.max };
  }
};

/* ══════════════════════ LA CANCHA ══════════════════════ */

/* la cancha se arma en cada partida porque el ALTO DE DISEÑO depende de la
   pantalla: una grilla clavada al arrancar el módulo saldría corta o larga en
   cualquier teléfono que no sea el que se probó */
function armaCancha(){
  const y0 = 210, y1 = AL - 165, m = 34;
  M.cols = Math.floor((AN - m*2) / CEL);
  M.filas = Math.floor((y1 - y0) / CEL);
  M.w = M.cols*CEL; M.h = M.filas*CEL;
  M.x0 = Math.round((AN - M.w)/2); M.y0 = Math.round(y0 + (y1 - y0 - M.h)/2);
  M.rej = new Int8Array(M.cols*M.filas).fill(-1);
  M.cuenta = [0, 0, 0, 0];
  M.libres = M.cols*M.filas;
  M.of = document.createElement('canvas');
  M.of.width = M.w; M.of.height = M.h;
  M.og = M.of.getContext('2d');
  M.og.clearRect(0, 0, M.w, M.h);
  /* el suelo de la cancha va HORNEADO en el lienzo de pintura y no dibujado
     encima: así lo que queda sin pintar se ve como piso y no como un agujero */
  /* la foto del piso de cancha. El patrón se crea con el contexto del lienzo de
     pintura y no con el del juego: `createPattern` queda atado al contexto que
     lo creó y usado en otro no pinta nada. */
  const o = IMG.piso;
  let puesto = false;
  if (o && o.ok){
    const pt = M.og.createPattern(o.im, 'repeat');
    if (pt){ M.og.fillStyle = pt; M.og.fillRect(0, 0, M.w, M.h);
             M.og.fillStyle = 'rgba(10,10,16,.42)'; M.og.fillRect(0, 0, M.w, M.h);
             puesto = true; }
  }
  if (!puesto){
    M.og.fillStyle = '#1b1b24';
    M.og.fillRect(0, 0, M.w, M.h);
    M.og.strokeStyle = 'rgba(242,238,230,.045)';
    M.og.lineWidth = 1;
    for (let i = 1; i < M.cols; i++){
      M.og.beginPath(); M.og.moveTo(i*CEL, 0); M.og.lineTo(i*CEL, M.h); M.og.stroke();
    }
    for (let j = 1; j < M.filas; j++){
      M.og.beginPath(); M.og.moveTo(0, j*CEL); M.og.lineTo(M.w, j*CEL); M.og.stroke();
    }
  }
}

/* si la pantalla cambió de tamaño en medio de la partida, la grilla y el lienzo
   dejan de corresponder. Es el único caso en que hay que rearmar, y rearmar
   pierde la pintura — que es infinitamente mejor que dibujar la pintura corrida
   media cancha. */
function revisaLienzo(){
  /* y sólo con la partida en curso: en la pantalla de final rearmar pondría
     `vivo` en true detrás del panel y borraría la cancha que el jugador está
     mirando. Ahí la grilla vieja y el lienzo viejo siguen siendo coherentes
     entre ellos, así que dibujarlos sale bien aunque no quede centrado. */
  if (MODO !== 'juega') return;
  const y0 = 210, y1 = AL - 165, m = 34;
  const cols = Math.floor((AN - m*2) / CEL), filas = Math.floor((y1 - y0) / CEL);
  if (cols !== M.cols || filas !== M.filas) JUEGO.arranca();
}

/* ── LA CELDA SE PINTA CON UNA SALPICADURA GENERADA, RECORTADA A LA CELDA ──
   El sello se dibuja 1,7 veces más grande que la celda y girado, así que el
   borde de lo pintado tiene forma de pintura y dos celdas vecinas se funden en
   una mancha sola. Y va RECORTADO a la celda, que es la parte que importa: si
   el dibujo se pasara de la celda, el jugador vería pintura suya donde el
   marcador dice que no tiene nada — y el marcador sale de la grilla. El dibujo
   nunca puede prometer más de lo que la cuenta reconoce.

   El sello se hornea teñido una vez por color (`tenido` lo guarda), así que
   pintar una celda son dos operaciones de lienzo y no cuatro. */
function celdaColor(i, j, d){
  const x0 = i*CEL, y0 = j*CEL;
  const sc = tenido('salpica', DUE[d]);
  if (sc){
    M.og.save();
    M.og.beginPath(); M.og.rect(x0, y0, CEL, CEL); M.og.clip();
    M.og.translate(x0 + CEL/2, y0 + CEL/2);
    /* el giro sale de la celda y no del azar: al azar, cada repintado de la
       misma celda la gira de nuevo y la cancha titila */
    M.og.rotate(((i*7 + j*13) % 8) * 0.7854);
    /* ── EL SELLO TIENE QUE TAPAR LA CELDA, Y ESO SE MIDE EN LA CAPTURA ──
       La mancha del sello ocupa poco mas de la mitad de su cuadro, asi que
       dibujado a 0,85 de la celda cubria 37 px de los 40 y quedaba un hueco en
       las cuatro esquinas: la cancha se leia a LUNARES y no a pintura. A 1,3 la
       mancha central pasa la celda entera y el recorte se queda con el borde
       organico, que es lo unico que se queria del sello. */
    const r = CEL*1.30;
    M.og.drawImage(sc, -r, -r, r*2, r*2);
    M.og.restore();
    return;
  }
  M.og.fillStyle = DUE[d];
  M.og.fillRect(x0, y0, CEL, CEL);
}

/* pinta el disco de una mancha sobre la grilla. Sólo toca las celdas cuyo
   CENTRO cae adentro del radio: con el borde alcanzaría, la mancha pintaría una
   celda tocándola con un píxel y el trazo saldría más gordo de lo que se ve. */
/* ── LA BROCHA CRECE CON LA RACHA, Y NO CON PUNTOS ──
   En los otros cuatro juegos el multiplicador de la racha da puntos. Acá el
   marcador es el porcentaje de la cancha —que es el resultado de verdad y no se
   puede multiplicar sin mentir— así que la racha paga en MECÁNICA: cada escalón
   engorda la brocha un 12 %. Es la misma capa compartida usada de otra forma, y
   se siente más que un número.
   La racha se sube robando celdas de otro (`pinta1` la cuenta), o sea que
   premia meterse en el territorio ajeno en vez de pintar el piso vacío. */
function radioPinta(e){
  if (e.d !== 0) return R_PINTA * (e.balde > 0 ? 1.8 : 1);
  return R_PINTA * (M.balde > 0 ? 1.8 : 1) * (1 + (COMBO.mult - 1)*0.12);
}

function pinta1(e){
  const r = radioPinta(e), r2 = r*r;
  const i0 = Math.max(0, Math.floor((e.x - r - M.x0)/CEL));
  const i1 = Math.min(M.cols - 1, Math.floor((e.x + r - M.x0)/CEL));
  const j0 = Math.max(0, Math.floor((e.y - r - M.y0)/CEL));
  const j1 = Math.min(M.filas - 1, Math.floor((e.y + r - M.y0)/CEL));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){
    const cx = M.x0 + i*CEL + CEL/2, cy = M.y0 + j*CEL + CEL/2;
    const dx = cx - e.x, dy = cy - e.y;
    if (dx*dx + dy*dy > r2) continue;
    const k = j*M.cols + i, ant = M.rej[k];
    if (ant === e.d) continue;
    if (ant < 0) M.libres--; else M.cuenta[ant]--;
    M.rej[k] = e.d; M.cuenta[e.d]++;
    celdaColor(i, j, e.d);
    if (e.d === 0){
      e.son = (e.son || 0) + 1;
      /* robar sube la racha; pintar piso vacío no. Sin esa distinción la racha
         se sostiene sola caminando por el vacío y deja de querer decir nada. */
      if (ant > 0){
        M.robadas++;
        /* cada CATORCE y no cada cuatro: con cuatro, un pincelazo sobre pintura
           ajena llegaba a x5 en un segundo y la brocha ancha pasaba a ser el
           estado normal — o sea que la racha dejaba de ser una decisión. Con
           catorce hay que sostener el robo unos segundos, y pintar piso vacío
           (que es lo seguro) no la sube nunca. */
        if (M.robadas % 14 === 0) comboSuma();
      }
    }
  }
  /* el sonido va por celdas pintadas y no por cuadro: con un sonido por cuadro
     serían sesenta por segundo, o sea ruido blanco. Es la misma corrección que
     las pisadas de Maicol. */
  if (e.d === 0 && e.son >= 5){ e.son = 0; son('raspa', 0.7); }
}

/* ══════════════════════ LOS OBJETOS ══════════════════════ */

function objsPaso(dt){
  M.objCd -= dt;
  if (M.objCd <= 0 && M.objs.length === 0 && M.t < DUR - 6){
    M.objCd = OBJ_CADA;
    /* nace lejos del jugador: naciendo encima, agarrarlo no cuesta nada y deja
       de ser una decisión */
    let x = 0, y = 0;
    for (let i = 0; i < 14; i++){
      x = M.x0 + 40 + Math.random()*(M.w - 80);
      y = M.y0 + 40 + Math.random()*(M.h - 80);
      if (Math.hypot(x - M.yo.x, y - M.yo.y) > Math.min(M.w, M.h)*0.42) break;
    }
    M.objs.push({ k: Math.random() < 0.55 ? 'balde' : 'bomba', x, y, gi: 0 });
  }
  for (let i = M.objs.length - 1; i >= 0; i--){
    const o = M.objs[i];
    o.gi += dt*3;
    /* lo agarra CUALQUIERA, y eso es lo que lo hace una carrera: si sólo lo
       pudiera agarrar el jugador, sería un regalo y no un objeto */
    const todos = [M.yo].concat(M.bots);
    for (const e of todos){
      if (Math.hypot(e.x - o.x, e.y - o.y) > R_PINTA + 26) continue;
      M.objs.splice(i, 1);
      if (o.k === 'balde'){
        if (e.d === 0){ M.balde = BALDE_DUR; M.avisoP = 1.2; M.txtP = TX('balde');
                        M.tomados = (M.tomados || 0) + 1; son('poder'); sacude(0.35); }
        else e.balde = BALDE_DUR;
        chispas(o.x, o.y, 18, DUE[e.d]);
      } else {
        bomba(o.x, o.y, e.d);
        if (e.d === 0){ M.avisoP = 1.2; M.txtP = TX('bomba'); M.tomados = (M.tomados || 0) + 1; }
        son('bien', 1.2);
        sacude(0.8);
        chispas(o.x, o.y, 26, DUE[e.d], 1.4);
      }
      break;
    }
  }
}

/* la bomba pinta un círculo entero de una: es el único momento del juego en que
   se gana cancha sin caminarla */
function bomba(x, y, d){
  const r = BOMBA_R*CEL, r2 = r*r;
  const i0 = Math.max(0, Math.floor((x - r - M.x0)/CEL));
  const i1 = Math.min(M.cols - 1, Math.floor((x + r - M.x0)/CEL));
  const j0 = Math.max(0, Math.floor((y - r - M.y0)/CEL));
  const j1 = Math.min(M.filas - 1, Math.floor((y + r - M.y0)/CEL));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){
    const cx = M.x0 + i*CEL + CEL/2, cy = M.y0 + j*CEL + CEL/2;
    if ((cx - x)*(cx - x) + (cy - y)*(cy - y) > r2) continue;
    const k = j*M.cols + i, ant = M.rej[k];
    if (ant === d) continue;
    if (ant < 0) M.libres--; else M.cuenta[ant]--;
    M.rej[k] = d; M.cuenta[d]++;
    celdaColor(i, j, d);
  }
}

function objDibujo(g, o){
  const e = IMG.items;
  const r = 30*(1 + 0.10*Math.sin(o.gi));
  g.globalAlpha = 0.30;
  disco(o.x, o.y, r*1.5, o.k === 'balde' ? '#f2eee6' : '#e0553f');
  g.globalAlpha = 1;
  if (e && e.ok){
    g.drawImage(e.im, (o.k === 'balde' ? 0 : 1)*e.w, 0, e.w, e.h,
                o.x - r, o.y - r, r*2, r*2);
    return;
  }
  caja2(o.x - r*0.7, o.y - r*0.7, r*1.4, r*1.4, r*0.3,
        o.k === 'balde' ? '#f2eee6' : '#20202a', '#0b0b10');
}

/* ══════════════════════ LAS MANCHAS ══════════════════════ */

function mancha(d, x, y, perso){
  return { d, x, y, tx: x, ty: y, cd: 0, perso: perso || null, balde: 0,
           dx: Math.random() - 0.5, dy: Math.random() - 0.5, son: 0, gi: Math.random()*6 };
}

function mueveHacia(e, tx, ty, vel, dt){
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  const m = vel*dt;
  if (d <= m){ e.x = tx; e.y = ty; }
  else { e.x += dx/d*m; e.y += dy/d*m; }
  e.x = Math.max(M.x0 + 12, Math.min(M.x0 + M.w - 12, e.x));
  e.y = Math.max(M.y0 + 12, Math.min(M.y0 + M.h - 12, e.y));
  e.gi += dt*8;
}

const cerca = (e, x, y, r) => (e.x - x)*(e.x - x) + (e.y - y)*(e.y - y) < r*r;

/* ── LOS TRES BOTS SON TRES CABEZAS DISTINTAS ──
   Tres bots con la misma regla se leen a UN bot copiado tres veces: los tres
   van al mismo sitio, se apilan, y la cancha queda con un rincón peleado y el
   resto vacío. Con tres personalidades la cancha se llena de otra forma cada
   partida y el jugador puede aprender a quién conviene molestar:
     virgen → va a lo que no pintó nadie. Es el que más cancha gana si lo dejás.
     ladrón → va a la pintura DEL QUE VA GANANDO. Empezó yendo siempre a la del
              jugador y estaba mal, y se vio midiendo: el auto-jugador honesto
              perdía 21,6 % contra 29,7 y 30,8 de dos bots a los que nadie les
              robaba, o sea que uno de cada tres rivales existía sólo para
              hundirlo. Contra el que va ganando es justo —y de paso mantiene la
              partida cerca hasta el final, que es lo que hace que valga jugarla.
     recto  → va derecho y rebota. No es tonto: es el que atraviesa el medio y
              te ensucia el camino sin querer, o sea lo impredecible. */
function destinoBot(b){
  if (b.perso === 'recto'){
    /* rebote: se elige un punto lejano en la dirección que traía y se corrige
       cuando la pared queda cerca */
    if (b.x < M.x0 + 60 || b.x > M.x0 + M.w - 60) b.dx = -b.dx;
    if (b.y < M.y0 + 60 || b.y > M.y0 + M.h - 60) b.dy = -b.dy;
    const n = Math.hypot(b.dx, b.dy) || 1;
    b.tx = b.x + b.dx/n*260; b.ty = b.y + b.dy/n*260;
    b.tx = Math.max(M.x0 + 20, Math.min(M.x0 + M.w - 20, b.tx));
    b.ty = Math.max(M.y0 + 20, Math.min(M.y0 + M.h - 20, b.ty));
    return;
  }
  /* ── EL BLANCO SE BUSCA POR MUESTREO Y NO BARRIENDO LA GRILLA ──
     Barrer cuatrocientas celdas por bot y por cuadro son setenta mil pruebas
     por segundo para contestar algo que casi no cambia en dieciséis
     milisegundos. Se prueban treinta celdas al azar y se toma la mejor: la
     decisión sale igual de buena y el costo es fijo. Y como se recalcula cada
     0,35 s, un blanco apenas peor no se nota. */
  /* quién va ganando, y si es él mismo se comporta como el que pinta lo virgen:
     un ladrón que se robara su propia pintura no haría nada */
  let lider = 0;
  for (let d = 1; d < 4; d++) if (M.cuenta[d] > M.cuenta[lider]) lider = d;
  if (b.perso === 'ladron' && lider === b.d) lider = -9;
  let mejorD = 1e9, mx = b.x, my = b.y, hay = false;
  for (let n = 0; n < 30; n++){
    const i = (Math.random()*M.cols)|0, j = (Math.random()*M.filas)|0;
    const v = M.rej[j*M.cols + i];
    const sirve = b.perso === 'ladron' ? (v === lider || v < 0) : (v !== b.d);
    if (!sirve) continue;
    const cx = M.x0 + i*CEL + CEL/2, cy = M.y0 + j*CEL + CEL/2;
    let d = Math.hypot(cx - b.x, cy - b.y);
    /* ── Y NO PUEDE ELEGIR LA CELDA DE AL LADO ──
       Con la cancha llena, la celda ajena más cercana está siempre a un paso, y
       entonces el bot se queda oscilando en dos metros cuadrados: medido, el
       auto-jugador «honesto» sacaba 27,8 % y el que se movía AL AZAR le ganaba
       con 33,8 %, que es la firma exacta de una estrategia que no viaja. Con un
       mínimo de dos celdas y media el bot recorre, y de paso deja de verse
       tonto en pantalla. */
    if (d < CEL*2.5) continue;
    /* al ladrón le interesa TU pintura más que el piso vacío, así que el piso
       vacío se penaliza en vez de descartarse: descartándolo, con la cancha sin
       una celda tuya el bot se queda quieto */
    if (b.perso === 'ladron' && v < 0) d *= 2.4;
    if (d < mejorD){ mejorD = d; mx = cx; my = cy; hay = true; }
  }
  if (!hay){ mx = M.x0 + Math.random()*M.w; my = M.y0 + Math.random()*M.h; }
  b.tx = mx; b.ty = my;
}

function manchaDibujo(g, e, mio){
  /* la bola generada, teñida del color del jugador. Se generó BLANCA a propósito
     para que los cuatro salgan del mismo dibujo: cuatro bolas generadas serían
     cuatro personajes distintos y en una cancha con cuatro manchas eso es una
     cosa más que aprender. */
  if (IMG.bola && IMG.bola.ok){
    const r = R_PINTA*1.34;
    g.globalAlpha = 0.22;
    disco(e.x, e.y, r*1.20, DUE[e.d]);
    g.globalAlpha = 1;
    dibSello('bola', e.x, e.y, r, Math.sin(e.gi*0.5)*0.10, DUE[e.d]);
    if (mio){
      g.strokeStyle = '#f2eee6'; g.lineWidth = 4;
      g.beginPath(); g.arc(e.x, e.y, R_PINTA + 6, 0, 7); g.stroke();
    }
    return;
  }
  /* la mancha tiene contorno claro sólo si es la del jugador: en una cancha con
     cuatro discos del mismo tamaño, el color no alcanza para encontrar el
     propio en medio segundo, y medio segundo en un juego de 45 s es mucho */
  const r = R_PINTA;
  g.save(); g.translate(e.x, e.y);
  g.globalAlpha = 0.22;
  disco(0, 0, r*1.30, DUE[e.d]);
  g.globalAlpha = 1;
  disco(0, 0, r, DUE[e.d]);
  if (mio){
    g.strokeStyle = '#f2eee6'; g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, r + 5, 0, 7); g.stroke();
  }
  /* dos ojos que miran hacia donde va: es lo único que separa un disco de un
     personaje, y cuesta dos arcos */
  const dx = Math.max(-1, Math.min(1, (e.tx - e.x)/90));
  const dy = Math.max(-1, Math.min(1, (e.ty - e.y)/90));
  disco(-9 + dx*5, -5 + dy*5, 7, '#20202a');
  disco(9 + dx*5, -5 + dy*5, 7, '#20202a');
  g.restore();
}

/* ── EL MARCADOR ES UNA BARRA Y NO CUATRO NÚMEROS ──
   Cuatro porcentajes hay que leerlos y compararlos, y eso no se hace mientras
   se mueve el dedo. Una barra apilada dice quién va ganando de una ojeada, y el
   tramo propio va con su contorno claro para poder encontrarlo. */
function barra(g){
  const y = M.y0 + M.h + 30, h = 18, x0 = M.x0, w = M.w;
  const tot = M.cols*M.filas;
  caja2(x0, y, w, h, 9, 'rgba(255,255,255,.07)', null);
  let x = x0;
  for (let d = 0; d < 4; d++){
    const ww = w*M.cuenta[d]/tot;
    if (ww > 0.6){
      g.fillStyle = DUE[d];
      g.fillRect(x, y, ww, h);
      if (d === 0){ g.strokeStyle = '#f2eee6'; g.lineWidth = 2; g.strokeRect(x, y, ww, h); }
    }
    x += ww;
  }
  texto(TX('tuyo') + ' ' + Math.round(M.cuenta[0]/tot*100) + '%',
        x0, y - 22, 22, 'rgba(242,238,230,.55)', 700, 'left');
}

function fondoMan(g){
  const d = g.createLinearGradient(0, 0, 0, AL);
  d.addColorStop(0, '#0d0d14'); d.addColorStop(1, '#14141c');
  g.fillStyle = d; g.fillRect(0, 0, AN, AL);
  grano(0, 0, AN, AL, 0.02, 50);
}

/* la cancha de la cinemática: `llena` es cuánta pintura hay y `manchas` si se
   dibujan los cuatro. Se usa la MISMA proporción de cancha que el juego para
   que la cinemática no muestre otra cosa de la que se va a jugar. */
function canchaCine(g, manchas, llena){
  const m = 90, y0 = 300, y1 = AL - 300;
  const w = AN - m*2, h = y1 - y0;
  caja2(m, y0, w, h, 14, '#1b1b24', 'rgba(242,238,230,.20)');
  const c = 52, cols = Math.floor(w/c), filas = Math.floor(h/c);
  for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++){
    /* un patrón fijo y no al azar: al azar, cada cuadro de la cinemática
       repinta la cancha entera de otro color y parpadea */
    const k = ((i*7 + j*13) % 100) / 100;
    if (k > llena) continue;
    g.fillStyle = DUE[(i + j*3) % 4];
    g.fillRect(m + i*c + 2, y0 + j*c + 2, c - 4, c - 4);
  }
  if (manchas > 0){
    const pos = [[0.5, 0.78], [0.16, 0.16], [0.84, 0.16], [0.84, 0.78]];
    for (let d = 0; d < 4; d++){
      if (d > 0 && manchas < 1) continue;
      const p = pos[d];
      const x = m + w*p[0], y = y0 + h*p[1];
      g.globalAlpha = 0.22; disco(x, y, 46, DUE[d]); g.globalAlpha = 1;
      disco(x, y, 34, DUE[d]);
      disco(x - 8, y - 4, 6, '#20202a'); disco(x + 8, y - 4, 6, '#20202a');
      if (d === 0){ g.strokeStyle = '#f2eee6'; g.lineWidth = 3;
                    g.beginPath(); g.arc(x, y, 39, 0, 7); g.stroke(); }
    }
  }
}
