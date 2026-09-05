
/* ══════════════════════ EL MUNDO Y LA SIMULACION ══════════════════════
   Este archivo no toca el DOM ni three.js, y eso no es prolijidad: se puede
   importar en node y correr los tres minutos enteros mil veces en un segundo.
   Toda la fisica del tablon, del bol y del agua se afino asi, midiendo, y no
   mirando la pantalla. */

const DT = 1/60;
/* ── CUANTO SACUDE UN SUSTO, EN m/s^2 POR UNIDAD DE PESO ──
   Barrido de 6 a 11 sobre 24 semillas, mirando las dos cosas a la vez:
     6  -> quedarse quieto GANA 20 de 24. No hay juego.
     7  -> quieto 6 de 24, el bot 23 de 24 con 27% de agua. Este.
     8  -> el bol se cae 14 de 24 hasta con el bot. Injugable.
    10  -> nadie llega, ni jugando bien.
   O sea que el numero no se eligio: es donde la diferencia entre hacer algo y
   no hacer nada es mas grande sin que el juego se vuelva una loteria. */
/* ── EL SUSTO NO TE TUMBA: LO QUE TE TUMBA ES TU MANO ──
   Pedido textual del jugador: *"que no nos hagan tumbar a proposito por mas que
   nos agarren, nosotros si mantenemos bien el giro todo bien"*. Y tenia razon:
   con 5,6 el que sostenia el telefono DERECHO perdia 34 de 40 partidas, o sea
   que el susto ganaba solo y hacer bien las cosas no alcanzaba.

   Con 4,0 el barrido sobre 40 semillas da:

     K_SUS   bot   derecho   sacudiendo      agua que queda (derecho)
      5,6     40       6          2                 0,04
      4,6     40      37         18                 0,18
     *4,0*    40    * 40 *       32                 0,33
      3,4     40      40         39                 0,53

   O sea que 4,0 es el ultimo valor en el que sostener el telefono derecho gana
   SIEMPRE y sacudirlo sigue costando ocho partidas de cuarenta. Por debajo, el
   que lo sacude tambien gana y no queda juego. El susto pasa a ser lo que es:
   una razon para que la mano se te mueva, no un castigo escrito.

   ── Y CON DIEZ SUSTOS MAS EL NUMERO NO SE MOVIO, QUE NO ERA LO ESPERABLE ──
   Con 47 sustos apilados al final daba 40/40 y 0,33 de agua; con 57 repartidos
   parejo da 40/40 y 0,332. Identico, y tiene una razon fisica: la frecuencia
   del chapoteo SUBE cuando queda menos agua (`omegaChapoteo` depende de h), asi
   que un empujon cuesta mas caro sobre un bol vacio. Amontonar los pesados al
   final los cobraba justo donde mas duelen; repartidos, diez sustos mas salen
   igual de caros que los cuarenta y siete anteriores. */
const K_SUS = 4.0;
const A_TAB = 6.0;              /* y el tiron que ademas se le ve al tablon */
const R_CAZUELA = 2.6;          /* radio de curvatura del hueco donde apoya el bol */
let PERTURBA = 1;               /* la sonda del modo libre apaga el cabeceo */

/* ══════════ EL CAMINO ══════════
   Las catorce habitaciones se encadenan sobre una grilla: cada una tiene su
   largo y, al salir, dobla un cuarto de vuelta o sigue derecho. Se arma una
   sola vez y de ahi salen la posicion del jugador, las paredes y los props. */
const MUNDO = { cuartos: [], largo: 0 };
function armaMundo(){
  MUNDO.cuartos.length = 0;
  let x = 0, z = 0, gir = 0, s0 = 0, y = 0;
  for (const C of CUARTOS){
    /* ── EL ADELANTE TIENE QUE SER EL MISMO QUE EL DE three.js ──
       Girando un objeto `g` sobre Y, su -Z local cae en (-sin g, -cos g). Con
       `+sin` el caminante salia para un lado y la habitacion se extendia para
       el otro: desde la segunda habitacion —la primera que dobla— la camara
       quedaba FUERA de la geometria, y en la foto eso se ve como que el cuarto
       esta a oscuras. Medido, el pasillo daba 1,6 sobre 255 en las cinco
       franjas mientras el zaguan daba 111. */
    const dx = -Math.sin(gir), dz = -Math.cos(gir);
    const q = { def: C, s0, s1: s0 + C.largo, x, z, y, gir, dx, dz,
                cx: x + dx*C.largo/2, cz: z + dz*C.largo/2, baja: C.baja || 0 };
    MUNDO.cuartos.push(q);
    x += dx*C.largo; z += dz*C.largo; s0 += C.largo; y -= (C.baja || 0);
    gir += (C.giro || 0)*Math.PI/2;
  }
  MUNDO.largo = s0;
  return MUNDO;
}
function cuartoEn(s){
  const L = MUNDO.cuartos;
  for (let i = 0; i < L.length; i++) if (s < L[i].s1) return i;
  return L.length - 1;
}
/* la posicion del cuerpo a `s` metros de camino */
function puntoEn(s){
  const i = cuartoEn(cl(s, 0, MUNDO.largo - 0.01)), q = MUNDO.cuartos[i];
  const u = cl(s - q.s0, 0, q.def.largo);
  return { i, q, x: q.x + q.dx*u, z: q.z + q.dz*u, y: q.y - q.baja*(u/q.def.largo), gir: q.gir, u };
}

/* ══════════ LA AGENDA DE SUSTOS ══════════
   ── EL PRIMER MINUTO TIENE QUE ASUSTAR IGUAL QUE EL ULTIMO ──
   Reporte textual: *"al final nomas da miedo"*. Y no era una impresion, era
   literal: esta funcion ORDENABA la agenda por peso, asi que el primer minuto
   se llevaba los sustos mas flojos y TODOS los agarres caian en el ultimo.
   Medido sobre la version anterior:

       0- 60 s : 12 sustos · k medio 0,39 · maximo 0,55 · 0 que te vengan encima
      60-120 s : 15 sustos · k medio 0,56 · maximo 0,70 · 0
     120-180 s : 20 sustos · k medio 0,93 · maximo 1,15 · LOS SIETE agarres

   O sea que la mitad del arsenal no existia hasta el minuto dos. Ahora se
   reparte en TRES MAZOS por peso y cada bloque de tres saca uno de cada mazo:
   desde el arranque hay un pesado cada tres sustos. El orden DENTRO del bloque
   se baraja, porque un mazo tras otro en el mismo orden se escucha a
   metronomo. Los DOS PRIMEROS salen igual del mazo flojo: son ocho segundos
   para aprender el gesto, y sin eso el primer sacudon llega antes de que el
   jugador sepa que el telefono se inclina. */
function armaAgenda(semilla){
  sem(semilla);
  const orden0 = SUSTOS.map((S, i) => ({ S, i, r: S.k + azr(-0.10, 0.10) }))
    .sort((a, b) => a.r - b.r).map(o => o.S);
  /* `final` sale del reparto: es el ultimo pase, siempre */
  const iF = orden0.findIndex(S => S.id === 'final');
  const cierre = iF >= 0 ? orden0.splice(iF, 1)[0] : null;
  /* los dos de gracia, del mazo mas flojo */
  const gracia = orden0.splice(0, 2);
  /* ── Y EL TERCERO SIEMPRE ES UNO QUE SE TE PONE EN LA CARA ──
     Repartiendo a ciegas, cual de los diez pesados sale primero es suerte de
     semilla: medido, el primer cara a cara caia en el segundo 36, o sea a un
     tercio del juego. Dos de gracia para aprender el gesto y al TERCERO ya se
     sabe a que se esta jugando. */
  const iC = orden0.findIndex(S => S.clase === 'bCarga' || S.clase === 'bEncima');
  const primero = iC >= 0 ? orden0.splice(iC, 1)[0] : null;
  const t3 = Math.ceil(orden0.length/3);
  const mazo = [orden0.slice(0, t3), orden0.slice(t3, 2*t3), orden0.slice(2*t3)];
  /* cada mazo se baraja: sin esto, dentro del mazo pesado los sustos salen de
     menor a mayor y la escalera vuelve por la ventana */
  for (const m of mazo) for (let i = m.length - 1; i > 0; i--){ const j = azi(0, i), x = m[i]; m[i] = m[j]; m[j] = x; }
  const orden = gracia.slice();
  if (primero) orden.push(primero);
  while (mazo[0].length || mazo[1].length || mazo[2].length){
    const b = [];
    for (const m of mazo) if (m.length) b.push(m.shift());
    for (let i = b.length - 1; i > 0; i--){ const j = azi(0, i), x = b[i]; b[i] = b[j]; b[j] = x; }
    for (const S of b) orden.push(S);
  }
  if (cierre) orden.push(cierre);
  const n = orden.length, hue = [];
  for (let i = 0; i < n - 1; i++) hue.push(lerp(HUECO0, HUECO1, i/(n - 2)));
  /* ── EL HUECO NO PUEDE SER MENOR QUE LO QUE DURA EL SUSTO QUE TERMINA ──
     Con cincuenta y siete sustos en dos minutos y medio el hueco medio cae a
     2,9 s, y hay sustos de 3,0: medido, tres se pisaban con el siguiente. Un
     susto encima de otro no da el doble de miedo, da ruido. El reparto sigue
     dando la FORMA —ancho al principio, apretado al final— y la duracion pone
     el PISO; el factor se busca por biseccion para que la suma siga entrando en
     los tres minutos. */
  const T0 = 6.5, T1 = DUR - 6.0;
  const piso = i => orden[i].dur + 0.35;
  const suma = f => { let s = 0; for (let i = 0; i < n - 1; i++) s += Math.max(hue[i]*f, piso(i)); return s; };
  let lo = 0, hi = (T1 - T0)/Math.max(1e-6, hue.reduce((a, b) => a + b, 0)), k = hi;
  if (suma(hi) > T1 - T0){ for (let it = 0; it < 40; it++){ k = (lo + hi)/2; if (suma(k) > T1 - T0) hi = k; else lo = k; } k = lo; }
  const ag = []; let t = T0;
  for (let i = 0; i < n; i++){ ag.push({ S: orden[i], t, dir: azr(0, 6.283) });
    if (i < n - 1) t += Math.max(hue[i]*k, piso(i)); }
  return ag;
}

/* ══════════ EL ESTADO ══════════ */
let RUN = null;
function arrancaRun(semilla){
  armaMundo();
  RUN = {
    fase: 'juega', t: 0, s: 0, fase_paso: 0, semilla,
    /* el tablon: dos angulos y sus velocidades */
    tx: 0, tz: 0, vtx: 0, vtz: 0, obx: 0, obz: 0,
    /* el bol sobre el tablon */
    bx: 0, bz: 0, vbx: 0, vbz: 0, pega: true,
    /* el agua: inclinacion de la superficie y su profundidad */
    ax: 0, az: 0, vax: 0, vaz: 0, h: AGUA_H0,
    /* lo que sacude */
    sac: 0, sacx: 0, sacz: 0, latx: 0, latz: 0, susto: null, sustoT: 0,
    agenda: armaAgenda(semilla), prox: 0, dados: 0, derramado: 0,
    fin: null, cuarto: 0, eventos: [], camX: 0, camY: 0, temblor: 0
  };
  return RUN;
}
/* la inclinacion que pide el jugador, en radianes, ya acotada */
function pideTilt(tx, tz){
  if (!RUN) return;
  RUN.obx = cl(tx, -0.55, 0.55);
  RUN.obz = cl(tz, -0.55, 0.55);
}

/* ══════════ UN PASO ══════════ */
function paso(){
  const R = RUN; if (!R || R.fase !== 'juega') return;
  R.t += DT;
  R.s += VEL*DT;
  R.cuarto = cuartoEn(R.s);

  /* ── EL CABECEO DEL PASO ES LA PERTURBACION DE FONDO ──
     Sin el, con el telefono quieto el agua se queda quieta y el juego no pide
     nada hasta el primer susto. Caminar YA mueve el bol. Pero va CHICO: con
     una amplitud grande, caminar solo llegaba a 0,18 rad de superficie contra
     0,227 de volcar, o sea que el susto casi no cambiaba nada. */
  const wPaso = 2*Math.PI*VEL/ZANCADA;
  R.fase_paso += wPaso*DT;
  const bobY = Math.sin(R.fase_paso*2)*0.020;
  const bobX = Math.sin(R.fase_paso)*0.026;
  const accPasoX = -Math.sin(R.fase_paso)*0.010*wPaso*wPaso*PERTURBA;

  /* ── EL SUSTO ── */
  const ag = R.agenda;
  if (R.prox < ag.length && R.t >= ag[R.prox].t){
    const a = ag[R.prox++];
    R.susto = a.S; R.sustoT = 0; R.dados++;
    R.sacx = Math.cos(a.dir); R.sacz = Math.sin(a.dir);
    R.eventos.push('susto:' + a.S.id);
  }
  let env = 0;
  if (R.susto){
    R.sustoT += DT;
    const u = R.sustoT/R.susto.dur;
    if (u >= 1){ R.susto = null; R.sustoT = 0; }
    else {
      /* ── EL TIRON ES CORTO Y AL PRINCIPIO ──
         Un susto no es una fuerza sostenida: es un golpe. Sube en nueve
         centesimas y cae en medio segundo, que es lo que tarda una mano en
         reaccionar y volver. */
      env = u < 0.09 ? u/0.09 : Math.exp(-(u - 0.09)*7.5);
      env *= R.susto.k;
    }
  }
  R.sac = env;
  R.temblor += (env - R.temblor)*Math.min(1, DT*18);

  /* ── EL SUSTO SACUDE EL BOL DE COSTADO, NO INCLINA LA TABLA ──
     Esto es la decision de fondo del juego y la primera version la tenia al
     reves. Con el susto entrando como torque sobre el tablon, el RESORTE de las
     manos lo devolvia solo en tres decimas y el jugador no tenia nada que
     hacer: medido, quedarse quieto ganaba 12 de 12. Un susto de verdad te
     mueve el brazo ENTERO, o sea que traslada el bol — y el agua responde a la
     aceleracion lateral, no a la inclinacion. Contrarrestarla es inclinar el
     bol HACIA donde se va el agua, que es lo que hace cualquiera que lleva un
     plato de sopa. */
  R.latx = env*K_SUS*R.sacx + accPasoX;
  R.latz = env*K_SUS*R.sacz;

  /* ── EL TABLON ──
     Un resorte de segundo orden entre lo que pide el telefono y donde esta la
     madera: las manos no son instantaneas. El susto le pega un tiron chico —
     lo justo para que se VEA que temblo— y el trabajo pesado lo hace la
     aceleracion lateral de arriba. */
  const accX = OM_TAB*OM_TAB*(R.obx - R.tx) - 2*ZETA_TAB*OM_TAB*R.vtx + env*A_TAB*R.sacx;
  const accZ = OM_TAB*OM_TAB*(R.obz - R.tz) - 2*ZETA_TAB*OM_TAB*R.vtz + env*A_TAB*R.sacz;
  R.vtx += accX*DT; R.vtz += accZ*DT;
  R.tx = cl(R.tx + R.vtx*DT, -0.9, 0.9);
  R.tz = cl(R.tz + R.vtz*DT, -0.9, 0.9);

  /* ── EL BOL SE PUEDE DESLIZAR, Y ESO ES LO QUE SE PIERDE PRIMERO ──
     Roce de Coulomb: mientras la fuerza a lo largo del tablon no pase de
     mu·g·cos(inclinacion), el bol esta pegado. El angulo al que arranca a
     resbalar es atan(mu) = 22,8 grados y no es un numero elegido: es el roce
     entre ceramica y madera. En el marco del tablon, que acelera, la fuerza es
     la gravedad sobre la pendiente MENOS la aceleracion lateral. */
  const inc = Math.hypot(R.tx, R.tz);
  const cosT = Math.cos(inc);
  const fx = G*Math.sin(R.tx) - R.latx;
  const fz = G*Math.sin(R.tz) - R.latz;
  const fmod = Math.hypot(fx, fz), tope = MU*G*cosT;
  const vmod = Math.hypot(R.vbx, R.vbz);
  if (R.pega && fmod <= tope && vmod < 0.02){ R.vbx = 0; R.vbz = 0; }
  else {
    R.pega = false;
    let axb = fx, azb = fz;
    if (vmod > 1e-4){ axb -= tope*R.vbx/vmod; azb -= tope*R.vbz/vmod; }
    else if (fmod > tope){ axb -= tope*fx/fmod; azb -= tope*fz/fmod; }
    /* ── EL TABLON TIENE UNA CAZUELA GASTADA, Y ESO NO ES UNA LICENCIA ──
       Es una tabla con un hueco tallado donde apoya el bol, como cualquier
       bandeja rustica. Sin el, el bol hace una caminata al azar de cinco
       centimetros por susto y sobre treinta y tres eso son veintinueve de
       desvio contra veinte de margen: se caia casi siempre y no habia nada que
       el jugador pudiera hacer, porque enderezarlo cuesta pasar los veintidos
       grados de resbale y ahi ya se volco el agua. La cazuela tiene 2,6 m de
       radio de curvatura, o sea que devuelve muy despacio. */
    axb -= G*R.bx/R_CAZUELA; azb -= G*R.bz/R_CAZUELA;
    R.vbx += axb*DT; R.vbz += azb*DT;
    R.vbx *= 0.994; R.vbz *= 0.994;
    if (Math.hypot(R.vbx, R.vbz) < 0.012 && fmod <= tope){ R.vbx = 0; R.vbz = 0; R.pega = true; }
  }
  R.bx = cl(R.bx + R.vbx*DT, -1, 1);
  R.bz = cl(R.bz + R.vbz*DT, -1, 1);
  const margenX = TAB_L/2 - BOL_R, margenZ = TAB_A/2 - BOL_R;
  if (Math.abs(R.bx) > margenX || Math.abs(R.bz) > margenZ){ termina('cayo'); return; }

  /* ── EL AGUA ──
     Primer modo de chapoteo. `s` es la pendiente de la superficie en el marco
     del bol, positiva cuando el agua es mas honda del lado +x. En reposo vale
     la inclinacion del bol menos la aceleracion lateral sobre g. Y omega
     DEPENDE DE CUANTA AGUA QUEDA: con el bol casi vacio el chapoteo se vuelve
     rapido y nervioso, que es exactamente lo que pasa de verdad. */
  const om = omegaChapoteo(R.h);
  const objX = R.tx - R.latx/G;
  const objZ = R.tz - R.latz/G;
  R.vax += (om*om*(objX - R.ax) - 2*ZETA_AGUA*om*R.vax)*DT;
  R.vaz += (om*om*(objZ - R.az) - 2*ZETA_AGUA*om*R.vaz)*DT;
  R.ax += R.vax*DT; R.az += R.vaz*DT;

  /* ── SE VUELCA CUANDO LA SUPERFICIE PASA EL BORDE ──
     Con la superficie inclinada `s`, el agua del lado bajo llega a h + |s|·R.
     Con el bol lleno hasta 0,050 y el borde en 0,075, eso da 0,227 rad, o sea
     trece grados. Y ojo con lo que sigue: al vaciarse, VOLCAR CUESTA MAS —con
     h en 0,025 el umbral se va a 0,455— asi que el juego se defiende solo de
     la espiral de la muerte. */
  const s = Math.hypot(R.ax, R.az);
  const sobra = R.h + s*BOL_R - BOL_BORDE;
  if (sobra > 0){
    const dh = Math.min(R.h, sobra*3.4*DT);
    R.h -= dh; R.derramado += dh;
    R.vax *= 0.90; R.vaz *= 0.90;
    R.eventos.push('derrama');
  }
  if (R.h <= 0.0035){ R.h = 0; termina('seco'); return; }

  R.camX = bobX; R.camY = bobY;
  if (R.t >= DUR || R.s >= MUNDO.largo - 0.6){ termina('gana'); return; }
}
function termina(por){
  const R = RUN; R.fase = 'fin'; R.fin = por;
  R.eventos.push('fin:' + por);
}

/* ══════════ EL AUTO-JUGADOR ══════════
   Sin el no hay forma de saber si los tres minutos se pueden pasar. La politica
   es la de cualquiera que lleva un plato de sopa: se inclina el tablon HACIA
   donde se fue el agua y se frena con la velocidad de la superficie. */
/* ── EL SIGNO DEL BOT SALE DE LA ECUACION, NO DE PROBAR ──
   La pendiente en reposo vale `tx - lat/g`, o sea que SUBIR la inclinacion sube
   la pendiente. Para bajar el agua que ya se fue a un lado hay que inclinar
   para el OTRO. Con el signo al reves —que es el que puse primero— el lazo se
   vuelve inestable y el bol se vacia en cuatro segundos: medido, 12 de 12. */
/* Barridas 49 combinaciones: la mejor es KP = 0, o sea SIN termino
   proporcional. Y tiene explicacion: el agua es un resonante con zeta 0,055, o
   sea un pico de 1/(2·zeta) = 9 veces, y cerrar un lazo proporcional a traves
   de el lo hace sonar. Lo que sirve es INYECTAR AMORTIGUAMIENTO: inclinar
   contra la VELOCIDAD de la superficie, que es lo que hace la mano de quien
   lleva un plato lleno sin pensarlo. */
let BOT_KP = 0.0, BOT_KD = 0.10;
function botTilt(retardo){
  const R = RUN;
  const r = retardo || 0;
  return [cl(-BOT_KP*R.ax - BOT_KD*R.vax, -0.5, 0.5)*(1 - r),
          cl(-BOT_KP*R.az - BOT_KD*R.vaz, -0.5, 0.5)*(1 - r)];
}
function juegaSolo(semilla, modo){
  arrancaRun(semilla);
  const R = RUN; let n = 0;
  while (R.fase === 'juega' && n < 60*DUR + 600){
    if (modo === 'quieto') pideTilt(0, 0);
    else if (modo === 'azar') pideTilt(azr(-0.4, 0.4), azr(-0.4, 0.4));
    else { const d = botTilt(modo === 'torpe' ? 0.35 : 0); pideTilt(d[0], d[1]); }
    paso(); n++;
  }
  return { t: +R.t.toFixed(1), fin: R.fin, agua: +(R.h/AGUA_H0).toFixed(3), sustos: R.dados,
           cuarto: R.cuarto, derramado: +R.derramado.toFixed(4), pasos: n };
}

/* ══════════ AUDITORIAS ══════════ */
function auditaAgenda(semilla){
  const ag = armaAgenda(semilla);
  const ids = new Set(ag.map(a => a.S.id));
  let minHue = 1e9, maxHue = 0;
  for (let i = 1; i < ag.length; i++){ const d = ag[i].t - ag[i-1].t; if (d < minHue) minHue = d; if (d > maxHue) maxHue = d; }
  const porCuarto = {};
  for (const a of ag){ const s = VEL*a.t, i = cuartoEn(s); porCuarto[i] = (porCuarto[i]||0) + 1; }
  return { n: ag.length, unicos: ids.size, t0: +ag[0].t.toFixed(1), t1: +ag[ag.length-1].t.toFixed(1),
           hueco: [+minHue.toFixed(2), +maxHue.toFixed(2)], ultimo: ag[ag.length-1].S.id,
           cuartosConSusto: Object.keys(porCuarto).length, porCuarto };
}
/* la frecuencia y el amortiguamiento del agua, medidos sobre la propia
   simulacion: una constante escrita no prueba que el sistema haga eso */
function midePileta(){
  arrancaRun(1);
  PERTURBA = 0;                 /* el cabeceo del paso fuerza a 1 Hz y tapa el modo libre */
  const R = RUN; R.agenda = [];
  R.ax = 0.18; R.vax = 0;                       /* se la suelta inclinada y se la deja */
  const ser = [];
  for (let i = 0; i < 400; i++){ pideTilt(0, 0);
    const bak = R.h; paso(); R.h = bak;          /* sin derrame, para medir el modo */
    ser.push(R.ax); }
  const cruces = [];
  for (let i = 1; i < ser.length; i++) if (ser[i-1] > 0 && ser[i] <= 0) cruces.push(i);
  const per = cruces.length > 1 ? (cruces[cruces.length-1] - cruces[0])/(cruces.length-1)*DT : 0;
  let p1 = 0, p2 = 0;
  for (let i = 0; i < 60; i++) p1 = Math.max(p1, Math.abs(ser[i]));
  for (let i = 240; i < 300; i++) p2 = Math.max(p2, Math.abs(ser[i]));
  PERTURBA = 1;
  return { periodo: +per.toFixed(3), hz: +(1/Math.max(1e-6, per)).toFixed(2),
           teorico: +(omegaChapoteo(AGUA_H0)/(2*Math.PI)).toFixed(2),
           caida: +(p2/Math.max(1e-6, p1)).toFixed(3) };
}
/* el angulo al que el bol arranca a resbalar */
function mideResbale(){
  PERTURBA = 0;
  for (let a = 0; a < 0.9; a += 0.005){
    arrancaRun(1); const R = RUN; R.agenda = [];
    for (let i = 0; i < 90; i++){ pideTilt(a, 0); R.h = AGUA_H0; paso(); if (R.fase !== 'juega') break; }
    if (Math.abs(RUN.bx) > 0.004){ PERTURBA = 1;
      return { rad: +a.toFixed(3), grados: +(a*57.2958).toFixed(1), teorico: +(Math.atan(MU)*57.2958).toFixed(1) }; }
  }
  PERTURBA = 1; return null;
}
