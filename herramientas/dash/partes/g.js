
/* ══════════════════════ EL ESTADO, EL PROGRESO Y EL AUTO-JUGADOR ══════════════════════ */

const DT = 1/60;                 /* paso fijo */
let SIN_RELOJ = false;           /* lo usa la sonda para poder adelantar */
const EST = {
  p: 'carga',                    /* la pantalla */
  nivel: 0, intentos: 0, pct: 0, mejor: 0,
  practica: false, corriendo: false,
  muerto: 0,                     /* reloj de la pausa de la muerte */
  pedido: 0,                     /* el salto pedido, guardado unas centesimas */
  gano: false,
  chk: null,                     /* el punto de control de practica */
  x0: 0                          /* el bloque desde el que arranco este intento */
};

/* ══════════ EL PROGRESO GUARDADO ══════════
   Por nivel: el mejor porcentaje, las tres monedas y si esta hecho. Y el
   `try/catch` no es ceremonia: en una ventana privada `localStorage` TIRA, y una
   red que tira no es una red. */
const PROG = { niv: [], icono: { forma: 0, c1: 0, c2: 1 }, lang: null,
               cal: 'media', mus: 70, fx: 80 };
for (let i = 0; i < NIVELES.length; i++) PROG.niv.push({ mejor: 0, mon: [false, false, false], hecho: false });

function cargaProg(){
  try {
    const s = localStorage.getItem('rotor_v1');
    if (!s) return;
    const o = JSON.parse(s);
    if (o.niv) for (let i = 0; i < PROG.niv.length && i < o.niv.length; i++){
      const a = o.niv[i], b = PROG.niv[i];
      b.mejor = +a.mejor || 0; b.hecho = !!a.hecho;
      if (a.mon) for (let k = 0; k < 3; k++) b.mon[k] = !!a.mon[k];
    }
    if (o.icono){ ICONO.forma = o.icono.forma | 0; ICONO.c1 = o.icono.c1 | 0; ICONO.c2 = o.icono.c2 | 0; }
    if (o.lang && TXT[o.lang]) LANG = o.lang;
    if (o.cal && CALIDADES[o.cal]) CALIDAD = o.cal;
    if (o.mus != null) VOL_MUS = cl(+o.mus, 0, 100)/100;
    if (o.fx != null) VOL_FX = cl(+o.fx, 0, 100)/100;
  } catch(e){}
}
function guardaProg(){
  try {
    localStorage.setItem('rotor_v1', JSON.stringify({
      niv: PROG.niv, icono: ICONO, lang: LANG, cal: CALIDAD,
      mus: Math.round(VOL_MUS*100), fx: Math.round(VOL_FX*100)
    }));
  } catch(e){}
}

/* ══════════ UN PASO ══════════
   ── LA X LA PONE EL RELOJ CUANDO HAY RELOJ, Y SE INTEGRA CUANDO NO ──
   Las dos cosas pasan por `pasoCuerpo`, o sea por LA MISMA fisica: si el bot
   tuviera la suya, ganar no probaria nada. Lo unico que cambia es de donde sale
   la x — del tema en la partida de verdad, integrada en el bot y en el respaldo
   sin audio. */
function avanza(c, med, dt, apretado, xForzada){
  c.x = (xForzada == null) ? c.x + med.v*dt : xForzada;
  pasoCuerpo(c, med, dt, apretado);
}

/* ── EL HUECO LIBRE EN UNA X, Y SE DEVUELVE EL MAS ANCHO ──
   La primera version buscaba «el hueco que contiene a la nave», y eso tiene dos
   defectos que se ven en la medicion: la respuesta depende de donde este la nave,
   y si la nave YA esta metida en una pared no contiene a ninguno — medido, con la
   nave a y 6,29 dentro de la pared de arriba la funcion devolvia el pasillo
   entero libre y el piloto apuntaba al medio del pasillo, que era justo la pared.
   El mas ancho no depende de nada: en un pasillo con dos paredes, el hueco de la
   pared ES el intervalo libre mas ancho. La banda va de 0 a 9,2 porque el pasillo
   se construye asi. */
function huecoLibre(x, alto){
  const B0 = 0, B1 = alto || ALTO_PASILLO;
  const iv = [];
  for (const r of cerca(MUNDO.iSol, x)){
    if (r.x > x || r.x + r.w < x) continue;
    const a = Math.max(B0, r.y), b = Math.min(B1, r.y + r.h);
    if (b > a) iv.push([a, b]);
  }
  iv.sort((p, q) => p[0] - q[0]);
  let lo = B0, ancho = -1, mejor = [B0, B1];
  for (const [a, b] of iv){
    if (a - lo > ancho){ ancho = a - lo; mejor = [lo, a]; }
    if (b > lo) lo = b;
  }
  if (B1 - lo > ancho){ mejor = [lo, B1]; }
  return mejor;
}

/* ══════════════════════ EL AUTO-JUGADOR ══════════════════════
   ── ES LO UNICO QUE PRUEBA QUE UN NIVEL SE PUEDE PASAR ──
   El generador tira patrones y no declara la solucion; el bot la encuentra. Si
   no llega al 100 %, el nivel se rechaza y se vuelve a tirar con otra semilla.

   ── Y LA RAMIFICACION VA A UN SOLO NIVEL DE PROFUNDIDAD ──
   Ramificar cada decision es exponencial: con horizonte de 45 pasos y dos
   opciones por paso son millones de pasos de fisica por decision. Lo que se hace
   en su lugar es ramificar UNA vez —apretar ahora o no— y adentro de cada rama
   usar una politica REACTIVA: saltar cuando, sin saltar, se muere dentro de
   medio tiempo. Con «nunca salta» adentro, una cadena de tres picos mata las dos
   ramas y el bot elige a ciegas; con la reactiva, las cadenas se resuelven sin
   ramificar. */
function copia(c){
  /* ── LA COPIA LLEVA `carga` Y `apretado`, Y NO ES UN DETALLE ──
     El robot carga el salto mientras el dedo siga abajo, asi que sin `carga` el
     rollout prueba un salto que no existe; y cuatro de los ocho modos se manejan
     con FLANCOS, o sea que sin `apretado` el flanco se dispara en el primer paso
     de cada rama y la rama mide otro juego. */
  return { x: c.x, y: c.y, vy: c.vy, grav: c.grav, modo: c.modo,
           piso: c.piso, vivo: c.vivo, giro: c.giro, apretado: c.apretado,
           carga: c.carga, mira: c.mira,
           /* los orbes gastados son del INTENTO: la copia se los lleva para que
              un rollout no le gaste un orbe al cuerpo de verdad */
           uso: c.uso ? c.uso.slice() : null };
}

function botOrbeCerca(c){
  for (let i = 0; i < MUNDO.orbes.length; i++){
    if (c.uso && c.uso[i]) continue;
    const o = MUNDO.orbes[i];
    if (Math.abs(o.x - c.x) < 1.4 && Math.abs(o.y - (c.y + 0.43)) < 1.4) return true;
  }
  return false;
}

/* ── EL PILOTO ──
   Dos cosas, y las dos salieron de una muerte medida:
   · SE BARRE HACIA ADELANTE hasta encontrar la pared que viene. Con una sola
     muestra a tres bloques, una pared de 1,2 de ancho se ve durante 0,12 s: la
     nave se enteraba pegada a ella. El barrido la encuentra a diez bloques.
   · Y SE APUNTA CON LA VELOCIDAD, NO CON LA POSICION. La nave ACELERA, asi que
     una regla de «subo si estoy abajo» se pasa de largo y oscila; pidiendole una
     velocidad proporcional al error, frena antes de llegar. */
function botNave(c, med){
  const alto = ALTO_MODO[c.modo] || ALTO_PASILLO;
  let obj = alto*0.5 - JUG_LADO*0.5;
  /* ── EL BARRIDO ARRANCA DETRAS Y NO DELANTE, Y ESO COSTO UNA MUERTE MEDIDA ──
     Con el barrido desde +0,4, la pared que el cuerpo esta ATRAVESANDO deja de
     verse en cuanto su borde de adelante queda atras del ojo del barrido: medido
     en la onda, a x 150,9 el piloto ya apuntaba al hueco de la pared SIGUIENTE
     —2,2 bloques mas arriba— y el cuerpo, que mide 0,86, choco el labio de la
     pared en la que todavia estaba a x 151,43. Hay que mirar desde media caja
     para atras: mientras el cuerpo siga adentro de la ranura, la ranura es el
     destino. */
  for (let d = -0.6; d <= 10; d += 0.4){
    const h = huecoLibre(c.x + d, alto);
    if (h[1] - h[0] < alto - 1.2){ obj = (h[0] + h[1])*0.5 - JUG_LADO*0.5; break; }
  }
  /* ── Y LA ONDA NO SE PILOTEA CON VELOCIDAD, PORQUE NO TIENE INERCIA ──
     Su velocidad vertical es instantanea: pidiendole una velocidad proporcional
     al error, el mando oscila en cada cuadro y la diagonal se rompe en dientes.
     Lo que corresponde es una banda muerta: se sube si esta por debajo del
     destino, se baja si esta por encima, y en el medio se queda con lo que
     traia. */
  if (c.modo === 'onda'){
    const e = (obj - c.y)*c.grav;
    if (e > 0.12) return c.grav > 0;
    if (e < -0.12) return c.grav < 0;
    return c.apretado;
  }
  const tope = c.modo === 'columpio' ? med.colMax : med.naveMax;
  const vObj = cl((obj - c.y)*6.0, -tope, tope);
  return (c.vy < vObj) === (c.grav > 0);
}

/* ── LA POLITICA: SALTAR EN EL ULTIMO MOMENTO POSIBLE ──
   La primera version saltaba «cuando veia la muerte dentro de `mira` pasos», y
   eso no es lo mismo: en un hueco, ver el hueco y saltar da un despegue
   DEMASIADO TEMPRANO y se cae del otro lado. Medido, los cuatro fallos de los
   niveles 2 y 3 eran exactamente eso —`plano: true`, o sea caido al vacio, y uno
   golpeando el labio de enfrente de costado a 0,11 bloques de haberlo pisado—.

   La ventana de despegue de un hueco `w` sale de tres cosas y da poco: para
   pararse en el labio la caja tiene que solaparlo (0,43), para aterrizar tambien,
   y encima el solape del aterrizaje tiene que ser MAYOR que lo que la caja baja
   en un paso (`imp/60`), porque con menos el eje de menor penetracion resuelve
   como choque de costado, o sea muerte. Queda `4,86 − imp/60 − w`: con w = 3,5
   eso es una ventana de un bloque, seis pasos. Saltar «cuando se ve» la pierde
   entera; saltar en el ultimo momento la clava.

   Y se escribe en dos rollouts cortos: si esperando un paso y saltando en el
   siguiente todavia se vive, se espera. */
function botVive(c, med, n, apretaPrimero){
  const d = copia(c);
  for (let i = 0; i < n; i++){
    avanza(d, med, DT, i === 0 ? apretaPrimero : false);
    if (!d.vivo) return false;
    if (d.x >= MUNDO.largo) return true;
  }
  return true;
}
/* ── QUIEN PUEDE DECIDIR EN EL AIRE Y QUIEN NO ──
   La guarda «en el aire el toque no hace nada» es del CUBO, y aplicada a los ocho
   modos deja tres sin jugar: el ovni salta en el aire, la arana se teletransporta
   en el aire, y el robot tiene que SEGUIR apretando mientras sube o no carga. Con
   la guarda puesta para todos, el bot suelta el boton en el primer cuadro de cada
   salto de robot y el modo entero deja de existir. */
function botPuede(c){
  const m = c.modo;
  if (m === 'ovni' || m === 'arana') return true;
  if (m === 'robot') return c.piso || c.vy*c.grav > 0;
  return c.piso || botOrbeCerca(c);
}

/* ── UN ORBE NO SE ESPERA: SU VENTANA ES EL MOMENTO ──
   La politica de «saltar en el ultimo momento» es la correcta para un hueco y es
   la equivocada para una cadena de orbes. La ventana de un orbe mide 1,9 bloques
   de ancho, y esperando hasta el final de la primera se llega al borde de la
   segunda: medido, el bot cruzaba el vacio del final rozando cada ventana y
   moria en la tercera. Lo que hace un jugador es MANTENER apretado en una cadena,
   y eso es lo que hace esto — con el rollout comprobando igual, asi que no puede
   aprobar un orbe que mate. */
function botReactiva(c, med, mira){
  if (PILOTO[c.modo]) return botNave(c, med);
  if (!botPuede(c)) return false;
  if (!c.piso && botOrbeCerca(c)) return true;
  const d = copia(c); avanza(d, med, DT, false);
  if (!d.vivo) return true;                        /* un paso mas y se muere */
  if (botVive(d, med, mira, true)) return false;   /* saltando el que viene, vive */
  return botVive(c, med, mira, true);              /* hay que saltar ahora */
}

/* rueda con esa politica y devuelve si sobrevive: el AVANCE no informa nada,
   porque la x sale del reloj y avanza igual se salte o no */
function botRueda(c0, med, pasos, mira){
  const c = copia(c0);
  for (let i = 0; i < pasos; i++){
    avanza(c, med, DT, botReactiva(c, med, mira));
    if (!c.vivo) return false;
    if (c.x >= MUNDO.largo) return true;
  }
  return true;
}

/* ── Y EL HORIZONTE LARGO ES PARA LO QUE «TARDE» NO RESUELVE ──
   Subirse a una plataforma o pisar un pad pide saltar TEMPRANO, y ahi esperar no
   sirve. La regla es la misma de siempre: si esperar sobrevive el horizonte
   largo, se espera; si no, se aprieta. */
function botElige(c, med, pasos, mira){
  if (PILOTO[c.modo]) return botNave(c, med);
  if (!botPuede(c)) return false;
  /* con un orbe en la ventana se prueba APRETAR primero, por lo de arriba; sin
     orbe se prueba ESPERAR primero, que es lo que clava el despegue de un hueco */
  const prim = !c.piso && botOrbeCerca(c);
  const A = copia(c); avanza(A, med, DT, prim);
  if (A.vivo && botRueda(A, med, pasos, mira)) return prim;
  const B = copia(c); avanza(B, med, DT, !prim);
  if (B.vivo && botRueda(B, med, pasos, mira)) return !prim;
  return prim;
}

/* juega el nivel que ya esta en MUNDO y devuelve cuanto llego */
function juegaSolo(opt){
  const o = opt || {};
  const med = MUNDO.med;
  const azar = !!o.azar;
  /* el horizonte en PASOS sale del tempo, no de un numero a mano: un salto dura
     un tiempo, asi que mirar 1,6 tiempos es mirar poco mas de un salto */
  const pasos = Math.ceil(1.6*60/med.bpm*60);
  /* el vuelo dura un tiempo exacto, asi que `mira` tiene que pasar de 60 pasos
     por tiempo: con menos, el rollout corta antes de aterrizar y no ve el labio */
  const mira = Math.ceil(1.35*60/med.bpm*60);
  /* `x0` corre la fase de entrada: el nivel de verdad no se empieza en el paso
     exacto en que el bot lo audita, y un tramo que solo se pasa desde una fase es
     un tramo que se pasa por casualidad */
  const c = {}; jugPone(c, o.x0 || 0);
  for (const ob of MUNDO.orbes) ob.usado = false;
  let i = 0, tope = Math.ceil((MUNDO.largo/med.v)*60) + 400;
  let mon = 0;
  while (c.vivo && c.x < MUNDO.largo && i < tope){
    const a = azar ? (az() < 0.10) : botElige(c, med, pasos, mira);
    avanza(c, med, DT, a);
    for (const m of MUNDO.monedas)
      if (!m.tomada && Math.abs(m.x - c.x) < 0.7 && Math.abs(m.y - (c.y + 0.43)) < 0.8){
        m.tomada = true; mon++;
      }
    i++;
  }
  return { pct: Math.round(cl(c.x/MUNDO.largo, 0, 1)*100), pasos: i, vivo: c.vivo,
           murioEn: c.vivo ? -1 : Math.round(c.x), monedas: mon, largo: MUNDO.largo };
}

/* ══════════ LA VALIDACION ══════════
   Se tira, se juega, y si no se termina se cambia la semilla. Es lo que evita
   que exista un nivel imposible. */
function armaNivel(id){
  for (let s = 1; s <= 40; s++){
    generaNivel(id, s);
    const r = juegaSolo({});
    if (r.pct >= 100){ MUNDO.semilla = s; return r; }
  }
  /* si cuarenta semillas no dan uno jugable, algo esta mal en el generador y hay
     que saberlo: dejar el ultimo es dejar un nivel imposible en el juego */
  MUNDO.semilla = 0;
  return null;
}

function audita(){
  const out = [];
  for (let i = 0; i < NIVELES.length; i++){
    const t0 = performance.now();
    const r = armaNivel(i);
    const azar = juegaSolo({ azar: true });
    out.push({ nivel: i, nom: NIVELES[i].nom, semilla: MUNDO.semilla,
               ok: !!r && r.pct >= 100, pct: r ? r.pct : -1, pasos: r ? r.pasos : -1,
               monedas: r ? r.monedas : -1, azarPct: azar.pct,
               largo: MUNDO.largo, sol: MUNDO.sol.length, mat: MUNDO.mat.length,
               ms: Math.round(performance.now() - t0) });
  }
  return out;
}

/* ══════════════════════ LA PARTIDA ══════════════════════ */
const CHK = { lista: [] };

function snapshot(){
  return { c: copia(JUG), orbes: MUNDO.orbes.map(o => o.usado),
           mon: MUNDO.monedas.map(m => m.tomada) };
}
function restaura(s){
  const c = s.c;
  JUG.x = c.x; JUG.y = c.y; JUG.vy = c.vy; JUG.grav = c.grav; JUG.modo = c.modo;
  JUG.piso = c.piso; JUG.vivo = true; JUG.giro = c.giro; JUG.apretado = false;
  for (let i = 0; i < MUNDO.orbes.length; i++) MUNDO.orbes[i].usado = s.orbes[i];
  for (let i = 0; i < MUNDO.monedas.length; i++) MUNDO.monedas[i].tomada = s.mon[i];
}

/* las semillas validadas se buscan UNA vez, en la pantalla de carga: validar al
   entrar a un nivel serian dos segundos de nada justo cuando el jugador ya toco */
const SEMILLAS = [];
function preparaNiveles(){
  for (let i = 0; i < NIVELES.length; i++){ armaNivel(i); SEMILLAS[i] = MUNDO.semilla; }
  return SEMILLAS.slice();
}

function arranca(nivel){
  EST.nivel = nivel;
  generaNivel(nivel, SEMILLAS[nivel] || 1);
  EST.mejor = PROG.niv[nivel].mejor;
  EST.gano = false; EST.muerto = 0;
  CHK.lista.length = 0;
  reintenta(true);
}

/* ── REINTENTAR NO ES VOLVER A CERO SI HAY PUNTO DE CONTROL ──
   Es la unica concesion del genero: sin practica, un tema de treinta compases se
   aprende de memoria a fuerza de repetir los primeros cinco. */
function reintenta(nuevo){
  const chk = (EST.practica && CHK.lista.length) ? CHK.lista[CHK.lista.length - 1] : null;
  for (const o of MUNDO.orbes) o.usado = false;
  if (chk){ restaura(chk); }
  else {
    for (const m of MUNDO.monedas) m.tomada = false;
    jugPone(JUG, 0);
  }
  EST.x0 = JUG.x;
  EST.pct = Math.round(cl(JUG.x/MUNDO.largo, 0, 1)*100);
  EST.corriendo = true; EST.muerto = 0; EST.gano = false;
  if (!nuevo) EST.intentos++;
  PART.length = 0;
  CAM.x = JUG.x - VISTA_ANCHO*CAM_OFS;
  musArranca(EST.nivel, tiempoDeX(JUG.x));
}

/* ── LA GUARDA IBA AL REVES, Y SE LLEVABA LA PARTIDA ──
   Decia `if (!JUG.vivo) return`, y a `muere()` se la llama JUSTO cuando `vivo`
   acaba de pasar a false: o sea que salia sin hacer nada y `corriendo` quedaba en
   true. Medido con la sonda: el jugador seguia cayendo hasta y = −197 con el
   juego «corriendo», sin morir, sin reintentar y sin contar el intento. Lo que
   hay que preguntar es si la partida sigue en pie, no si el cuerpo esta vivo. */
function muere(){
  if (!EST.corriendo) return;
  JUG.vivo = false; EST.corriendo = false; EST.muerto = 0.75;
  /* ── LA MUERTE SE SIENTE, Y SON CUATRO COSAS A LA VEZ ──
     Las esquirlas dicen que el cubo se rompio, el destello y el sacudon que fue
     un golpe, el acercamiento que la partida se termino, y el `hit` FRENA EL
     JUEGO cuatro cuadros: sin ese freno, el cuadro en que se choca y el cuadro
     en que ya no hay cubo son el mismo y no se llega a ver que paso. */
  explota(JUG.x, JUG.y + JUG_LADO*0.5);
  destella('#ff5a4a', 1.0); sacude(1.2); acerca(0.08);
  EFE.hit = 0.07;
  son('muere'); musPara();
}

function gana(){
  EST.gano = true; EST.corriendo = false; EST.pct = 100;
  const P = PROG.niv[EST.nivel];
  /* ── EL MODO PRACTICA NO PUNTUA ──
     Con puntos de control, «cien por ciento» dejaria de querer decir nada. Lo
     que si guarda son las monedas: son lo que la practica existe para juntar. */
  if (!EST.practica){ P.mejor = 100; P.hecho = true; }
  for (let i = 0; i < MUNDO.monedas.length && i < 3; i++)
    if (MUNDO.monedas[i].tomada) P.mon[i] = true;
  guardaProg(); son('gana'); musPara();
  destella('#8ef0c4', 1.0); acerca(-0.10);
  chispas(JUG.x, JUG.y + 0.5, 30, COLES[ICONO.c1]);
}

/* ── UN PASO DE PARTIDA ──
   La x sale del reloj de la musica; si no hay audio se integra, asi el juego se
   puede jugar igual sin sonido. */
function pasoJuego(dt, apretado){
  if (!EST.corriendo) return;
  const med = MUNDO.med;
  /* `SIN_RELOJ` lo pone la sonda: la x sale del reloj de audio, que en una
     tanda sincronica no avanza, asi que sin este interruptor no hay forma de
     adelantar la simulacion sin esperarla en tiempo real. Y no es un atajo: es
     el mismo camino que usa el juego cuando no hay audio. */
  const t = SIN_RELOJ ? null : musTiempo();
  const xf = t == null ? null : cl(EST.x0 + xDeTiempo(t), EST.x0, MUNDO.largo + 8);
  /* ── EL SALTO PEDIDO SE GUARDA UNAS CENTESIMAS ──
     Un toque puede durar menos que un paso de fisica —16 ms— y entonces se
     perderia entero. Con el pedido guardado, un toque cortito cuenta igual. */
  const ap = apretado || EST.pedido > 0;
  EST.pedido = Math.max(0, EST.pedido - dt);
  avanza(JUG, med, dt, ap, xf);
  for (const m of MUNDO.monedas)
    if (!m.tomada && Math.abs(m.x - JUG.x) < 0.7 && Math.abs(m.y - (JUG.y + 0.43)) < 0.8){
      m.tomada = true; son('moneda');
      chispas(m.x, m.y, 14, '#ffd447');
      destella('#ffd447', 0.34); sacude(0.16);
    }
  /* ── EL CHORRO DE LA NAVE, COMO EN GD: MAS LARGO MIENTRAS SE MANTIENE ──
     Sale de la cola y va hacia atras a la mitad de la velocidad del nivel, sin
     gravedad; apretando salen tres por paso y mas grandes. Es lo que en GD dice
     que la nave empuja, y es informacion: se ve si el dedo esta abajo. */
  const m = JUG.modo;
  if (m === 'nave' || m === 'columpio'){
    const arriba = JUG.grav > 0 ? 1 : -1;
    const cx = m === 'nave' ? JUG.x - 0.62 : JUG.x - 0.30;
    const cy = JUG.y + JUG_LADO*0.5 - (m === 'nave' ? 0.12*arriba : 0);
    chispas(cx, cy, ap ? 3 : 1, ap ? '#fff1a8' : COLES[ICONO.c2],
            { ang: Math.PI, esp: 0.45, v0: 1.5, v1: 4.5, vx0: -med.v*0.45, g: 0,
              t: ap ? 0.30 : 0.20, s0: 0.08, s1: ap ? 0.26 : 0.16, dy: 0.10 });
  } else if (m === 'robot' && ap && JUG.vy*JUG.grav > 0){
    /* el robot empuja con los pies mientras carga: chispas hacia abajo */
    chispas(JUG.x, JUG.y + (JUG.grav > 0 ? 0 : JUG_LADO), 2, '#ffa14a',
            { ang: JUG.grav > 0 ? -Math.PI/2 : Math.PI/2, esp: 0.9, v0: 2, v1: 5, g: 0,
              t: 0.22, s0: 0.08, s1: 0.18, dx: 0.4 });
  } else if (JUG.piso && Math.random() < 0.35){
    chispas(JUG.x - 0.4, JUG.y + (JUG.grav > 0 ? 0.05 : JUG_LADO - 0.05), 1, COLES[ICONO.c2],
            { v0: 1, v1: 4, t: 0.35, s0: 0.06, s1: 0.14 });
  }
  if (!JUG.vivo){ muere(); return; }
  EST.pct = Math.round(cl(JUG.x/MUNDO.largo, 0, 1)*100);
  if (!EST.practica && EST.pct > PROG.niv[EST.nivel].mejor){
    PROG.niv[EST.nivel].mejor = EST.pct; EST.mejor = EST.pct;
  }
  if (JUG.x >= MUNDO.largo){ gana(); return; }
  /* ── LOS PUNTOS DE CONTROL SE PONEN SOLOS Y EN SITIO SEGURO ──
     Uno puesto justo antes de un pico convierte la practica en una trampa: se
     reaparece muriendo. Se exige piso, seis bloques de avance y nada mortal en
     los dos bloques que vienen. */
  if (EST.practica && JUG.piso && JUG.modo === 'cubo' && JUG.grav > 0){
    const ult = CHK.lista.length ? CHK.lista[CHK.lista.length - 1].c.x : -99;
    if (JUG.x - ult > 6 && seguro(JUG.x)){
      CHK.lista.push(snapshot());
      chispas(JUG.x, JUG.y + 0.3, 4, '#2de2a8');
    }
  }
}

function seguro(x){
  for (let d = 0; d <= 2.2; d += 0.4)
    for (const r of cerca(MUNDO.iMat, x + d))
      if (r.x < x + d + 0.6 && r.x + r.w > x + d - 0.6) return false;
  return true;
}

function toca(){
  if (!EST.corriendo) return false;
  EST.pedido = 0.12;
  return true;
}
