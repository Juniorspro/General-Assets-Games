/* ══════════════════════════════════════════════════════════════════════════
   H · EL DUELO, EL HUD Y LOS PANELES

   TODO EL TURNO PASA POR UNA MAQUINA DE CUATRO ESTADOS —apunta · vuela ·
   espera · fin— y por una sola funcion de tiro (`tira`). El jugador y el
   rival entran por AHI los dos: con dos caminos, el rival estaria jugando un
   juego que no existe y la auditoria aprobaria duelos que no se pueden
   pelear. Es la misma regla que el resolvedor y el choque ya comparten.

   Y LA FLECHA QUE SE VE ES LA QUE SE VOLO. `vuela()` devuelve el recorrido
   muestreado; la animacion lo INTERPOLA en vez de volver a integrar. Con dos
   integradores, la flecha dibujada podria caer en un sitio y el dano
   aplicarse en otro — y eso no falla ruidosamente: se ve como punteria mala.
   ══════════════════════════════════════════════════════════════════════════ */

const JU = {
  n: 0, M: null, va: VIDA_MAX, vb: VIDA_MAX, turno: 0,
  est: 'apunta', t: 0, flechas: 0, aciertos: 0,
  fin: false, tuto: false, paso: 0, pausa: false,
};
const VU = { on: false, pts: null, r: null, t: 0, dur: 0, vx: 0, vy: 0, w: 0, quien: 0 };
const RIV = { d: null, k: 0 };      /* el tiro del rival, resuelto una sola vez */
const RIV_TENSA = 0.72;             /* lo que tarda en tensar, a la vista */
const DT_PTS = 13 * PASO_F;

/* ── PANELES ────────────────────────────────────────────────────────────── */
let PAN = null;
/* `on` MUESTRA Y `abre` ES OTRA COSA: `abre` es el velo partido —cerrado
   arriba y abajo, abierto en el medio— que sólo lleva el menú, para que el
   duelo se vea correr detrás. Toggleando `abre` como si fuera la
   visibilidad, ningún panel llegaba a `display:grid` y la interfaz entera
   quedaba invisible; lo cantó el banco: el click al idioma no encontraba
   nada que tocar.                                                         */
function verPanel(id) {
  for (const p of document.querySelectorAll('.pan')) p.classList.toggle('on', p.id === id);
  PAN = id;
  document.body.classList.toggle('conPanel', !!id);
  /* Y ACA SE AJUSTA EL TITULO, no al escribirlo: un elemento en display:none
     mide cero, asi que `pintaFin` —que corre ANTES de abrir el panel— no
     tiene con que medir y se rinde. Medido: el titulo quedaba en 55,62 px
     con la palabra pidiendo 455 y la caja dando 419.                      */
  if (id) titTodos();
}

/* ── EL HUD ───────────────────────────────────────────────────────────────
   Se escribe SOLO CUANDO CAMBIA. Escribir en el DOM cada cuadro obliga al
   navegador a recalcular el layout sesenta veces por segundo para poner el
   mismo texto — y en la barra de vida eso es el 90 % de los cuadros.      */
let HUD_ANT = '';
function pintaHud() {
  const M = JU.M; if (!M) return;
  const a = Math.max(0, JU.va), b = Math.max(0, JU.vb);
  const w = M.viento;
  const firma = a + '|' + b + '|' + JU.turno + '|' + JU.est + '|' + LANG + '|' + JU.n + '|' + (JU.tuto ? 1 : 0);
  if (firma === HUD_ANT) return;
  HUD_ANT = firma;
  $('vIzq').querySelector('i').style.width = (a / VIDA_MAX * 100) + '%';
  $('vDer').querySelector('i').style.width = (b / VIDA_MAX * 100) + '%';
  $('vIzq').querySelector('b').textContent = a;
  $('vDer').querySelector('b').textContent = b;
  $('nIzq').textContent = TX('vos');
  $('nDer').textContent = JU.tuto ? '—' : (M.rival || '');
  /* el viento con su FLECHA: un numero con signo hay que leerlo y traducirlo
     a un lado; una flecha se ve de reojo mientras se apunta */
  $('viento').innerHTML = Math.abs(w) < 0.2
    ? '<u>' + TX('calma') + '</u>'
    : '<u>' + TX('viento') + '</u> ' + (w > 0 ? '▶' : '◀') + ' ' + Math.abs(w).toFixed(1);
  $('duelo').textContent = JU.tuto ? TX('tutTit') : TX('duelo', JU.n + 1);
  /* Y EL TURNO DEL RIVAL SE ANUNCIA. Estaba en blanco: el rival se tomaba
     casi un segundo pensando sin una sola senial en pantalla, asi que desde
     afuera el juego se veia trabado y despues aparecia una flecha de la
     nada. Lo que faltaba no era la flecha, era saber que le tocaba a el. */
  const pi = JU.tuto ? TX('tut' + Math.min(4, JU.paso + 1))
    : (JU.turno === 0
        ? (JU.est === 'apunta' ? TX('pistaTira') : '')
        : ((JU.est === 'piensa' || JU.est === 'vuela') ? TX('pistaRival') : ''));
  /* la pista arranca en `opacity:0` y la enciende su clase: escribiendo sólo
     el texto, los cuatro pasos del tutorial no se leen en ninguna parte */
  $('pista').textContent = pi;
  $('pista').classList.toggle('on', !!pi);
  $('nIzq').classList.toggle('act', JU.turno === 0);
  $('nDer').classList.toggle('act', JU.turno === 1);
}
function avisa(tx, ms) {
  const e = $('aviso'); e.textContent = tx; e.classList.add('on');
  clearTimeout(avisa._t); avisa._t = setTimeout(() => e.classList.remove('on'), ms || 1300);
}
/* el numero del dano SALE DEL PUNTO DEL IMPACTO, proyectado con la misma
   camara: puesto en un sitio fijo del HUD no diria a quien le pegaron.    */
/* Y SE REPINTA CADA CUADRO MIENTRAS DURA: con la camara moviendose, un
   numero colocado una sola vez se despega del sitio donde pego la flecha. */
const GOL = { on: false, x: 0, y: 0 };
function golpeEn(x, y, tx, cab) {
  const e = $('golpe');
  e.textContent = tx; e.className = cab ? 'cab on' : 'on';
  GOL.on = true; GOL.x = x; GOL.y = y; golpeMueve();
  clearTimeout(golpeEn._t);
  golpeEn._t = setTimeout(() => { e.className = ''; GOL.on = false; }, 1000);
}
function golpeMueve() {
  if (!GOL.on) return;
  const p = mundoAPant(GOL.x, GOL.y), e = $('golpe');
  e.style.left = p.x + 'px'; e.style.top = p.y + 'px';
}

/* ── IDIOMA ───────────────────────────────────────────────────────────────
   Repinta TODO: el menu, los paneles, la reja de duelos, el HUD y la pista.
   Sin el HUD y la pista, cambiar de idioma en partida deja la mitad de la
   pantalla en el anterior — ya costo una vuelta en MEKO.                  */
/* EL TITULO SE MIDE Y SE ACHICA HASTA QUE ENTRA, y no es coqueteria: el h1
   sale de `--mw * 0.135` con espaciado de 0,22em, o sea unos 47 px por letra
   en un marco de 412. Medido en la captura del final, «¡GANASTE!» —nueve
   letras— pedia 420 px de los 379 que tiene la caja: la palabra salia CORTADA
   por el canto derecho y, peor, al desbordar un flex con align-items:center
   arrastraba los tres botones fuera del eje. Y no se arregla con un numero
   mas chico porque el largo cambia con el idioma: «VOCE VENCEU!» son doce.
   Una sola pasada alcanza —el ancho del texto es lineal en el cuerpo de la
   letra, porque el espaciado va en em— asi que se mide, se divide y listo. */
/* EL ANCHO DISPONIBLE SALE DEL MARCO Y NO DEL PADRE, y eso no es un detalle:
   `.caja` es un item de grilla, o sea `min-width:auto`, asi que NO PUEDE
   ACHICARSE POR DEBAJO DEL CONTENIDO — con el titulo en nowrap el padre crece
   hasta contenerlo y medirlo contra el padre devuelve «entra» siempre. Es un
   lazo: la cosa que se quiere medir mueve la regla. El marco no se mueve.  */
function titAjusta(el) {
  if (!el || !el.textContent) return;
  el.style.fontSize = '';
  el.style.whiteSpace = 'nowrap';
  const mm = $('marco');
  const hay = Math.min(430, ((mm ? mm.clientWidth : 412) - 40) * 0.92);
  if (hay <= 0) return;
  const base = parseFloat(getComputedStyle(el).fontSize) || 0;
  const w = el.scrollWidth;
  if (!base || !w || w <= hay) return;
  el.style.fontSize = (base * hay / w).toFixed(2) + 'px';
}
function titTodos() { for (const el of document.querySelectorAll('h1')) titAjusta(el); }

function pintaIdioma() {
  $('mSub').textContent = TX('sub');
  $('bJugar').textContent = TX('jugar');
  $('bTuto').textContent = TX('tuto');
  $('bDuelos').textContent = TX('duelos');
  $('bAjustes').textContent = TX('ajustes');
  $('mPie').textContent = TX('pie');
  $('dTit').textContent = TX('duelos');
  $('dSub').textContent = TX('duelosSub');
  $('dVolver').textContent = TX('volver');
  $('aTit').textContent = TX('ajTit');
  $('aMusL').textContent = TX('musica');
  $('aFxL').textContent = TX('efectos');
  $('aIdiL').textContent = TX('idioma');
  $('aCalL').textContent = TX('calidad');
  $('aBorrar').textContent = TX('borrar');
  $('aVolver').textContent = TX('volver');
  $('pTit').textContent = TX('pausa');
  $('pSub').textContent = TX('pausaSub');
  $('bSigo').textContent = TX('seguir');
  $('bReini2').textContent = TX('reiniciar');
  $('bSalir').textContent = TX('salir');
  $('fRe').textContent = TX('reiniciar');
  $('fMenu').textContent = TX('salir');
  $('cSub').textContent = TX('cargando');
  pintaCal(); pintaDuelos();
  HUD_ANT = ''; pintaHud();
  if (PAN === 'pFin') pintaFin();
  titTodos();
}
function pintaCal() {
  const c = $('aCal'); c.innerHTML = '';
  for (const k of ['baja', 'media', 'alta']) {
    const b = document.createElement('button');
    b.className = 'bt' + (PROG.cal === k ? ' sel' : '');
    b.textContent = TX(k === 'baja' ? 'calB' : k === 'media' ? 'calM' : 'calA');
    b.onclick = () => { PROG.cal = k; guardaProg(); aplicaCalidad(); pintaCal(); son('ui'); };
    c.appendChild(b);
  }
  const i = $('aIdi'); i.innerHTML = '';
  for (const k of ['es', 'en', 'pt']) {
    const b = document.createElement('button');
    b.className = 'bt' + (LANG === k ? ' sel' : '');
    b.textContent = k.toUpperCase();
    b.onclick = () => { LANG = k; guardaProg(); pintaIdioma(); son('ui'); };
    i.appendChild(b);
  }
}
function pintaDuelos() {
  const g = $('gDue'); if (!g) return;
  g.innerHTML = '';
  for (let n = 0; n < DUELOS; n++) {
    const b = document.createElement('button');
    const ab = abierto(n), he = PROG.hechos.indexOf(n) >= 0;
    b.className = 'nb' + (he ? ' hecho' : '') + (ab ? '' : ' trabado');
    b.innerHTML = (n + 1) + '<i>' + (he ? '✓' : ab ? '' : '·') + '</i>';
    if (ab) b.onclick = () => { son('ui'); cargaDuelo(n); };
    g.appendChild(b);
  }
  const he = PROG.hechos.length;
  $('dSub').textContent = TX('duelosSub') + ' · ' + TX('de', he, DUELOS);
}
function pintaFin() {
  const g = JU.tuto ? true : JU.vb <= 0;
  $('fTit').textContent = JU.tuto ? TX('tutGana') : (g ? TX('gana') : TX('pierde'));
  $('fSub').textContent = JU.tuto ? TX('tutGanaSub') : (g ? TX('ganaSub') : TX('pierdeSub'));
  $('fDatos').textContent = JU.tuto ? TX('tutDatos') : TX('datos', JU.flechas, JU.aciertos);
  const hay = !JU.tuto && g && JU.n + 1 < DUELOS;
  $('fSig').style.display = hay ? '' : 'none';
  $('fSig').textContent = TX('siguiente');
  titAjusta($('fTit'));
}

/* ── CARGA ────────────────────────────────────────────────────────────────
   El tutorial pasa por la MISMA carga que un duelo y lo unico que cambia es
   de donde sale el mundo: con una carga propia, cada cosa que se agregue a
   `cargaDuelo` hay que acordarse de agregarla dos veces.                  */
function arranca(M, tuto) {
  JU.M = M; JU.tuto = !!tuto;
  JU.va = JU.vb = VIDA_MAX; JU.turno = 0; JU.est = 'apunta'; JU.t = 0;
  JU.flechas = 0; JU.aciertos = 0; JU.fin = false; JU.paso = 0; JU.pausa = false;
  VU.on = false;
  construyeMundo(M);
  arqEntra(M);
  RIV.d = null; RIV.k = 0;
  flechaOculta(); previaOculta(); limpiaClavadas();
  /* la camara se PLANTA y no lerpea: viniendo del duelo anterior, el primer
     medio segundo del duelo nuevo seria un viaje que nadie pidio */
  camSuelta(); camPlanta();
  musRaiz(RAICES[(M.paleta || 0) % RAICES.length]);
  auViento(M.viento);
  verPanel(null);
  HUD_ANT = ''; pintaHud();
  document.body.classList.add('jugando');
}
function cargaDuelo(n) {
  JU.n = n;
  $('carga').classList.remove('ido');
  $('cBarra').style.width = '18%';
  verPanel(null);
  setTimeout(() => {
    arqSuelta();
    const M = generaMundo(n);
    $('cBarra').style.width = '78%';
    arranca(M, false);
    $('cBarra').style.width = '100%';
    setTimeout(() => $('carga').classList.add('ido'), 60);
  }, 40);
}

/* ── EL TIRO ──────────────────────────────────────────────────────────────
   UNA sola funcion, y la usan el dedo y el rival. */
function tira(l, vx, vy) {
  const M = JU.M;
  const O = bocaDe(M, l);
  const r = vuela(M, O.x, O.y, vx, vy, M.viento, l);
  VU.on = true; VU.pts = r.pts; VU.r = r; VU.t = 0; VU.dur = r.t;
  VU.vx = vx; VU.vy = vy; VU.w = M.viento; VU.quien = l;
  JU.est = 'vuela'; JU.t = 0;
  JU.flechas++;
  arqTira(l); son('tira'); son('vuela');
  previaOculta();
  auTensaCero();
  if (l === 0) tutAvanza('tira');
}

/* ── EL IMPACTO ──────────────────────────────────────────────────────────
   El crater se cava MEDIA CELDA MAS ALLA del punto de impacto, en la
   direccion del vuelo: cavado en el punto justo, la flecha clavada queda
   flotando en el aire que ella misma acaba de abrir. Asi queda en el labio,
   que es donde de verdad se clavaria una punta que entro y estallo.       */
function impacto(r) {
  const M = JU.M;
  camFoco(r.x, r.y);      /* la camara se queda donde pego */
  if (r.fin === 'arq') {
    const dn = danoDe(r);
    if (r.quien === 0) JU.va -= dn; else { JU.vb -= dn; if (VU.quien === 0) JU.aciertos++; }
    /* SI EL GOLPE MATA SE SABE ACA Y NO EN `termina`: el que se muere se
       queda en el piso, y para eso el tumbo tiene que enterarse en el mismo
       cuadro — enterandose despues, el cuerpo ya se levanto. */
    arqRecibe(r.quien, r.cab, dn, (r.quien === 0 ? JU.va : JU.vb) <= 0);
    son(r.cab ? 'cabeza' : 'pega');
    golpeEn(r.x, r.y, '-' + dn, r.cab);
    if (r.cab) avisa(TX('cabezazo'), 1100);
    estalla(r.x, r.y, LADRILLO, r.cab ? 1.3 : 0.9);
    flechaOculta();
  } else if (r.fin === 'suelo') {
    const dur = !esRompeT(r.tipo);
    const ang = Math.atan2(VU.vy - G * r.t, VU.vx + VU.w * r.t);
    if (dur) { son('clava', r.tipo); clavaFlecha(r.x, r.y, ang); }
    else {
      son('rompe');
      estalla(r.x, r.y, r.tipo, 1);
      const n = crater(M, r.x + Math.cos(ang) * 0.5, r.y + Math.sin(ang) * 0.5, CRATER_R);
      if (n > 0) rehaceTerreno();
      clavaFlecha(r.x, r.y, ang);
      /* los dos arqueros pueden haber quedado mas abajo: la meseta esta
         protegida, pero un crater al lado le cambia el piso a nadie — se
         relee igual, que cuesta dos lecturas y no puede desincronizarse */
      for (let l = 0; l < 2; l++) if (ARQ[l]) {
        const p = l ? M.pisoB : M.pisoA;
        arqPiso(l, p); ARQ[l].boca = bocaDe(M, l);
      }
    }
    flechaOculta();
  } else {
    son('falla'); avisa(TX('falla'), 900);
    flechaOculta();
  }
  if (r.fin !== 'arq' || r.quien === VU.quien) tutAvanza('falla');
  HUD_ANT = '';
}

/* ── EL PASO DEL DUELO ───────────────────────────────────────────────────*/
function duePaso(dt) {
  const M = JU.M; if (!M || JU.pausa) return;
  JU.t += dt;
  golpeMueve();

  if (JU.est === 'vuela') {
    VU.t += dt;
    const u = Math.min(VU.t, VU.dur);
    const i = u / DT_PTS, i0 = Math.min(VU.pts.length / 2 - 1, Math.floor(i));
    const i1 = Math.min(VU.pts.length / 2 - 1, i0 + 1), k = cl(i - i0, 0, 1);
    const x = mez(VU.pts[i0 * 2], VU.pts[i1 * 2], k);
    const y = mez(VU.pts[i0 * 2 + 1], VU.pts[i1 * 2 + 1], k);
    /* el rumbo sale de la VELOCIDAD en forma cerrada, no de restar dos
       posiciones dibujadas: en el apice vy cruza el cero y con posiciones la
       flecha pega un tiron justo ahi. */
    flechaPon(x, y, VU.vx + VU.w * u, VU.vy - G * u);
    camFoco(x, y);
    if (VU.t >= VU.dur) {
      VU.on = false;
      impacto(VU.r);
      JU.est = 'espera'; JU.t = 0;
    }
  } else if (JU.est === 'espera') {
    /* un respiro DESPUES del impacto: cortando al turno siguiente en el
       mismo cuadro, el golpe no se llega a ver y el duelo se lee a una
       sucesion de numeros. */
    if (JU.t < 0.95) return;
    /* EL TURNO NO PASA CON ALGUIEN EN EL PISO: el que acaba de recibir es
       justo el que tiene que tirar, y la caja de choque esta clavada en su
       columna — tirando desde el suelo, el dibujo y el blanco dirian cosas
       distintas. El que se murio no cuenta: ese no se levanta. */
    if (arqCayendo()) return;
    if (JU.va <= 0 || JU.vb <= 0) { termina(); return; }
    /* EN EL TUTORIAL EL TURNO NO PASA Y UN SOLO ACIERTO ALCANZA: el rival
       esta ahi de blanco, no de rival, y tres impactos para terminar de
       aprender a arrastrar el dedo son dos de mas. */
    if (JU.tuto) {
      if (JU.vb < VIDA_MAX) { termina(); return; }
      JU.est = 'apunta'; JU.t = 0; HUD_ANT = ''; arqQuieto(0); return;
    }
    JU.turno = 1 - JU.turno;
    JU.est = JU.turno === 0 ? 'apunta' : 'piensa';
    JU.t = 0; HUD_ANT = '';
    camSuelta();          /* la camara se abre otra vez al plano de espera */
    son('turno');
    if (JU.turno === 0) arqQuieto(0); else { RIV.d = null; RIV.k = 0; }
  } else if (JU.est === 'piensa') {
    /* EL RIVAL TENSA A LA VISTA, y eso no es adorno: antes apuntaba y
       soltaba EN EL MISMO CUADRO, o sea que el unico aviso de que la flecha
       venia era la flecha. Ahora el tiro se resuelve UNA vez —volver a
       resolverlo por cuadro daria un rival distinto en cada uno— y la
       tension sube de cero a fondo mientras el arco se llena. */
    if (!RIV.d) { RIV.d = tiroRival(M, M.prec, Math.random); RIV.k = 0; }
    RIV.k = Math.min(1, RIV.k + dt / RIV_TENSA);
    const ang = Math.atan2(RIV.d.vy, RIV.d.vx);
    arqApunta(1, ang, RIV.k * 0.9);
    if (RIV.k >= 1 && JU.t >= RIV_TENSA + 0.18) { const d = RIV.d; RIV.d = null; tira(1, d.vx, d.vy); }
  }
  pintaHud();
}

function termina() {
  JU.fin = true; JU.est = 'fin';
  const gano = JU.vb <= 0 && JU.va > 0;
  arqFin(0, gano); arqFin(1, !gano);
  /* EL ORDEN IMPORTA: `arqFin` es quien decide si el perdedor se queda en el
     piso, asi que preguntar por el muerto ANTES devuelve siempre null.     */
  const mu = arqMuerto();
  if (mu) camFoco(mu.x, mu.y); else camSuelta();
  son(gano ? 'gana' : 'pierde');
  if (gano && !JU.tuto && PROG.hechos.indexOf(JU.n) < 0) { PROG.hechos.push(JU.n); guardaProg(); }
  clearTimeout(termina._t);
  termina._t = setTimeout(() => { pintaFin(); verPanel('pFin'); }, 1500);
}
