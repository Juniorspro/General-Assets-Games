
/* ══════════════════════════ EL JUEGO ══════════════════════════ */
const J = {
  modo: 'carga',       /* carga · idioma · menu · juega · fin */
  nivel: 1, vidas: M.vidas, hechos: 0, mejor: 0,
  lento: 0,            /* 0 normal, 1 camara lenta */
  apretado: false, dedo: null, angBase: 0,
  t: 0, msg: '', msgT: 0, fin: '', trazo: null
};

/* ── EL RELOJ DEL MUNDO Y EL DE LA PANTALLA SON DOS ──
   La camara lenta estira el tiempo del MUNDO; la interfaz, el fundido y el
   propio arrastre del dedo van a velocidad real. Ralentizando los dos, soltar
   el dedo tardaria en registrarse y el juego se leeria a colgado y no a camara
   lenta. Es la misma leccion de ARCO. */
function pasoJuego(dt){
  const obj = J.apretado ? 1 : 0;
  J.lento += cl((obj - J.lento)*dt/M.entraLento, -1, 1);
  J.lento = cl(J.lento, 0, 1);
  post.uniforms.uLento.value = J.lento;
  $('lento').classList.toggle('on', J.lento > 0.35);

  if (J.msgT > 0) J.msgT = Math.max(0, J.msgT - dt);
  /* ── EL TUTORIAL VA CON EL RELOJ DE PANTALLA Y NO CON EL DEL MUNDO ──
     `dtm` esta multiplicado por 0,16 mientras se mantiene apretado: un paso de
     dos segundos duraria doce, o sea que el paso que PIDE mantener apretado
     seria el mas largo del tutorial. */
  TUT.pon(dt);
  if (J.modo !== 'juega') return;

  const dtm = dt*lerp(1, M.lento, J.lento);
  J.t += dtm;
  /* ── PASO FIJO Y NO EL `dt` DEL CUADRO ──
     Un telefono a 30 y una notebook a 144 tienen que jugar el MISMO juego: con
     el dt del cuadro el rebote y el alcance del retroceso salen distintos, y eso
     no es una diferencia de rendimiento, es otro juego. */
  ACU += dtm;
  let n = 0;
  while (ACU >= PASO && n < 8){ simula(PASO); ACU -= PASO; n++; }
  if (n >= 8) ACU = 0;
}
const PASO = 1/120;
let ACU = 0;

function simula(dt){
  pasoPistola(dt);
  pasoBalas(dt, alGolpe);
  pasoLadrones(dt, alGolpe);
  if (vivos() === 0 && J.modo === 'juega') gana();
}

function alGolpe(que, x, y, obj){
  if (que === 'ladron'){ TUT.mato(); son('mata'); chispas(x, y, 16, 0xff5a4a); sacude(0.5); }
  else if (que === 'caja'){ son('caja'); chispas(x, y, 12, 0xc9a06a); sacude(0.3); }
  else if (que === 'muro'){ chispas(x, y, 5, 0xfff0c0); }
  else if (que === 'lad_tira'){ son('ladtira'); }
  else if (que === 'yo'){ pierdeVida(); }
}

function pierdeVida(){
  J.vidas--;
  son('daño'); sacude(1.0); chispas(P.x, P.y, 22, 0xff3c2a);
  if (J.vidas <= 0){ pierde(); return; }
  aviso(TX('vidas') + ' ' + J.vidas, 0.9);
  pistolaPone(0, 0.9);
  pintaHud();
}

function empieza(n){
  J.nivel = n; J.vidas = M.vidas; J.t = 0; ACU = 0;
  generaNivel(n);
  construyeEscena();
  pistolaPone(0, 0.9);
  J.modo = 'juega';
  $('menu').classList.remove('on'); $('fin').classList.remove('on');
  $('pista').textContent = (n <= 2 && TUT.hecho) ? TX('p1') : '';
  $('tut').classList.remove('on');
  /* el tutorial vive en el nivel 1: es el unico con tres ladrones y un solo
     hueco, o sea el unico donde «subi un piso» significa una sola cosa */
  if (n === 1 && (!TUT.hecho || TUT.pedido)){ TUT.pedido = false; TUT.arranca(); }
  else TUT.on = false;
  pintaHud();
  musQuiere('juego');
}

/* ══════════════════════════ EL TUTORIAL GUIADO ══════════════════════════
   ── CADA PASO ESPERA A QUE HAGAS LA COSA ──
   No son seis carteles seguidos: son seis cosas que hacer, y hasta que no se
   hacen el tutorial no avanza. Un tutorial que se pasa leyendo se saltea, y lo
   que se saltea es exactamente lo que despues no se entiende. Es la regla que
   ya ordeno el de ECO y el de RECREO en este repo.

   ── Y LOS LADRONES NO TIRAN HASTA QUE APRENDISTE A DISPARAR ──
   Un tutorial en el que se puede morir enseña miedo, no la mecanica: el jugador
   sale corriendo antes de entender que el retroceso lo mueve. Los ladrones se
   despiertan recien en el paso 5, que es cuando ya mato a uno.

   ── SE VE UNA VEZ, Y DESPUES ESTA EN EL MENU ──
   Obligatorio la primera vez y repetible a mano: obligado siempre es un peaje,
   y este juego se vuelve a abrir muchas veces. */
const TUT = {
  on: false, paso: 0, t: 0, hecho: false, matoUno: false,
  /* cuanto hay que sostener el gatillo para que el paso 3 se de por entendido:
     dos segundos de camara lenta es lo que tarda la pistola en dar media vuelta,
     o sea lo que hace falta para VER que gira sola */
  SOSTEN: 2.0,
  arranca(){
    this.on = true; this.paso = 0; this.t = 0; this.matoUno = false;
    /* los ladrones se duermen: se les corre el reloj, no se les toca la logica,
       asi que el que se despierta en el paso 5 es el mismo ladron de siempre */
    for (const l of MUNDO.lad){ l.cd = 999; l.avisa = 0; }
    this.pinta();
  },
  termina(){
    this.on = false; this.hecho = true;
    for (const l of MUNDO.lad) l.cd = azr(0.6, 1.8);
    $('tut').classList.remove('on');
    try { localStorage.setItem('pistola_tut', '1'); } catch(e){}
  },
  /* el paso 5 lo dispara `alGolpe`, que es quien sabe que murio un ladron */
  mato(){ if (this.on) this.matoUno = true; },
  pinta(){
    const e = $('tut');
    e.textContent = TX('t' + this.paso);
    e.classList.add('on');
  },
  pon(dt){
    if (!this.on || J.modo !== 'juega') return;
    this.t += dt;
    const p = this.paso;
    let listo = false;
    if (p === 0) listo = this.t > 2.2;                       /* sos la pistola */
    else if (p === 1) listo = J.apretado;                    /* mantene */
    else if (p === 2){                                       /* mira y gira */
      if (!J.apretado){ this.paso = 1; this.t = 0; this.pinta(); return; }
      listo = this.t > this.SOSTEN;
    }
    else if (p === 3) listo = this.matoUno;                  /* solta y mata */
    else if (p === 4){                                       /* subi un piso */
      listo = P.y > M.piso + 0.4;
      if (listo){ for (const l of MUNDO.lad) l.cd = azr(0.6, 1.8); }
    }
    else if (p === 5){ if (vivos() === 0) this.termina(); return; }
    if (listo){ this.paso++; this.t = 0; this.pinta(); }
  }
};

function gana(){
  J.modo = 'fin'; J.fin = 'gano';
  J.hechos = Math.max(J.hechos, J.nivel);
  guarda();
  son('gana');
  const ult = J.nivel >= NIVELES;
  $('fTitulo').textContent = ult ? TX('fin') : TX('gano');
  $('fSub').textContent = TX('nivel') + ' ' + J.nivel;
  $('fTexto').textContent = ult ? TX('finT') : '';
  $('bSigue').textContent = ult ? TX('menu') : TX('sigue');
  $('bSigue').dataset.ult = ult ? '1' : '';
  $('fin').classList.add('on');
  musQuiere('menu');
}

function pierde(){
  J.modo = 'fin'; J.fin = 'perdio';
  son('pierde');
  $('fTitulo').textContent = TX('perdio');
  $('fSub').textContent = TX('nivel') + ' ' + J.nivel;
  $('fTexto').textContent = '';
  $('bSigue').textContent = TX('reintenta');
  $('bSigue').dataset.ult = '';
  $('fin').classList.add('on');
  musQuiere('menu');
}

function aviso(t, seg){ J.msg = t; J.msgT = seg || 1.1;
  $('aviso').textContent = t; $('aviso').classList.add('on'); }

function pintaHud(){
  $('fNivel').textContent = TX('nivel') + ' ' + J.nivel + '/' + NIVELES;
  $('fVidas').textContent = TX('vidas') + ' ' + J.vidas;
  $('fLadrones').textContent = TX('ladrones') + ' ' + vivos();
}

function guarda(){
  try { localStorage.setItem('pistola_hechos', String(J.hechos)); } catch(e){}
}
function carga(){
  try { TUT.hecho = localStorage.getItem('pistola_tut') === '1'; } catch(e){}
  try {
    J.hechos = parseInt(localStorage.getItem('pistola_hechos') || '0', 10) || 0;
    const c = localStorage.getItem('pistola_cal');
    if (c && CALIDADES[c]) CALIDAD = c;
    const l = localStorage.getItem('pistola_lang');
    if (l && TXT[l]) { LANG = l; return true; }
  } catch(e){}
  return false;
}

/* ══════════════════════════ EL AUTO-JUGADOR ══════════════════════════
   ── SIRVE PARA DOS COSAS Y LAS DOS HACEN FALTA ──
   Es la auditoria —un nivel generado y no jugado es un nivel roto que todavia
   no se sabe— y es la unica prueba de que hay una decision adentro: si el que
   elige el angulo mirando el mundo termina igual que el que dispara al azar,
   apuntar no importa y el juego es un boton.

   El honesto NO usa una formula: prueba. Para cada angulo candidato traza la
   bala con el MISMO rayo del juego y vuela el retroceso con la MISMA fisica,
   ochenta centesimas hacia adelante. Es la regla que ya ordeno CASTILLO, PENAL
   y GRUA en este repo. */
function botMeta(){
  const bajo = MUNDO.lad.filter(l => l.vivo).sort((a, b) => a.y - b.y)[0];
  if (!bajo) return null;
  /* ── SI EL QUE TOCA ESTA ARRIBA, EL DESTINO ES EL HUECO Y NO EL LADRON ──
     Con el ladron como unico destino, «acercarse» empuja contra el canto de la
     losa: medido, la pistola se quedaba en maxY 4,47 debajo de una losa a 4,60,
     600 tiros y CERO muertos. Es la misma leccion que en NIEVE, donde apuntar al
     medio de la puerta tiraba a la basura medio hueco de ventaja. */
  const h = MUNDO.huecos.filter(q => q.y > P.y + 0.35 && q.y < bajo.y)
                        .sort((a, b) => a.y - b.y)[0];
  if (h) return { x: h.x, y: h.y + 1.4, hueco: true };
  return { x: bajo.x, y: bajo.y + 0.7, hueco: false };
}

/* ── Y AHORA EL BOT NO ELIGE UN ANGULO: ELIGE UN MOMENTO ──
   Con el giro puesto por el par del disparo, «probar 48 angulos» describe un
   juego que ya no existe — el angulo no se puede elegir, viene dado por la
   fisica. Lo unico que hay es una decision binaria por cuadro: soltar ahora o
   dejar que la pistola siga girando. Si el bot siguiera fijando `P.ang` a mano
   estaria jugando OTRO juego, y entonces que ganara no probaria nada. */
function botPuntua(ang, ciego){
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let p = 0;
  const h = rayo(P.x + dx*M.boca, P.y + dy*M.boca, dx, dy, 26, false);
  if (h && h.tipo === 'ladron') p += 1000 - h.t*4;
  else if (h && h.tipo === 'caja') p += 12;
  /* y despues, donde queda uno: el tiro que mata pero te deja clavado abajo
     cuesta el turno siguiente */
  const c = { x: P.x, y: P.y, vx: P.vx, vy: P.vy, ang, vang: P.vang,
              cd: 0, apoyada: false };
  aplicaRetro(c, ang);
  for (let s = 0; s < 120; s++) pasoCuerpo(c, 1/120);
  const meta = botMeta();
  if (meta){
    const d0 = Math.hypot(P.x - meta.x, P.y - meta.y);
    const d1 = Math.hypot(c.x - meta.x, c.y - meta.y);
    p += (d0 - d1)*40;
    /* ganar altura vale, porque las losas tapan el tiro desde abajo */
    p += (c.y - P.y)*14;
    /* ── Y SE PREMIA HABER CRUZADO EL HUECO, no haberse acercado a el ──
       Acercarse al hueco desde abajo y quedarse pegado a la losa puntua casi
       igual que atravesarlo, asi que sin este termino el bot se queda un palmo
       por debajo para siempre. */
    if (meta.hueco && c.y > meta.y - 0.6) p += 260;
  }
  /* las balas enemigas en vuelo: pasar por donde va una es perder una vida */
  for (const b of BAL){
    if (b.mia || ciego) continue;
    const ax = c.x - b.x, ay = c.y - b.y;
    const t = cl(ax*b.dx + ay*b.dy, 0, b.v*0.8);
    const ex = ax - b.dx*t, ey = ay - b.dy*t;
    if (ex*ex + ey*ey < 0.36) p -= 400;
  }
  return p;
}

/* ── Y PARA DECIDIR HAY QUE MIRAR ADELANTE, NO SOLO AHORA ──
   Soltar en el mejor angulo DE ESTE CUADRO no es jugar bien: casi siempre
   conviene dejar que gire un poco mas. Pero el giro SE FRENA, asi que dejar
   pasar el ultimo angulo util deja la pistola quieta apuntando a una pared, y
   la unica forma de volver a mover la punteria es gastar un tiro. Esa es la
   economia del juego entera.

   ── LAS DOS PREGUNTAS TIENEN RESOLUCIONES DISTINTAS, Y ESO COSTO CUATRO NIVELES ──
   La primera version miraba adelante con CATORCE muestras repartidas en los 5,5
   radianes que le quedan de giro: 22 grados por muestra. Un ladron a cinco
   metros mide 0,68 de ancho, o sea OCHO GRADOS — cabe entero entre dos muestras.
   Medido, el bot honesto se quedaba en 6 de 10 y perdia justo los niveles
   llenos (7 a 10), porque en un piso con muchos ladrones desperdiciaba las
   ventanas de tiro.
   La cuenta que hace falta no es una: son dos, y cada una se puede permitir lo
   suyo. «¿viene un angulo que mata?» es un rayo y nada mas, asi que se barre
   FINO —cada tres grados, mas fino que el blanco mas chico—. «¿desde donde
   conviene empujarse?» necesita volar la fisica un segundo, asi que se mira
   grueso, que para una decision de movimiento alcanza. */
const BOT_FINO = 0.052;         /* rad: tres grados, la mitad de lo que mide el
                                   blanco mas chico a la distancia mas larga */
function botMata(ang){
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const h = rayo(P.x + dx*M.boca, P.y + dy*M.boca, dx, dy, 26, false);
  return !!(h && h.tipo === 'ladron');
}

/* ── Y HAY UN CASO EN EL QUE ESPERAR ES MORIRSE ──
   Esperar la ventana de tiro significa QUEDARSE QUIETO, y quedarse quieto
   adentro de un laser encendido es perder una vida. Medido, el bot honesto
   perdia el nivel 10 «sin vidas» con 9 de 14 ladrones todavia vivos: no se
   quedaba sin reloj, se moria. Con un laser apuntandole, el tiro deja de ser
   punteria y pasa a ser desplazamiento — que es exactamente la decision que el
   juego quiere que el jugador tome. */
function botPeligro(){
  for (const l of MUNDO.lad){
    if (!l.vivo || l.avisa <= 0) continue;
    const ox = l.x + Math.cos(l.tira)*0.5, oy = l.y + 0.78 + Math.sin(l.tira)*0.5;
    const ax = P.x - ox, ay = P.y - oy;
    const t = Math.max(0, ax*Math.cos(l.tira) + ay*Math.sin(l.tira));
    const ex = ax - Math.cos(l.tira)*t, ey = ay - Math.sin(l.tira)*t;
    if (ex*ex + ey*ey < 0.42*0.42) return true;
  }
  /* y una bala enemiga ya en vuelo cuenta igual */
  for (const b of BAL){
    if (b.mia) continue;
    const ax = P.x - b.x, ay = P.y - b.y;
    const t = Math.max(0, ax*b.dx + ay*b.dy);
    const ex = ax - b.dx*t, ey = ay - b.dy*t;
    if (t < b.v*0.5 && ex*ex + ey*ey < 0.42*0.42) return true;
  }
  return false;
}

function botDispara(ciego){
  /* cuanto le queda de giro: la integral de vang con roce es vang/roceAng */
  const resto = P.vang/M.roceAng;
  const sig = resto >= 0 ? 1 : -1;
  if (botMata(P.ang)) return true;              /* el tiro entra: siempre */
  if (Math.abs(resto) < 0.10) return true;      /* sin giro no hay eleccion */

  /* ¿viene una ventana de tiro antes de que el giro se apague? entonces esperar
     — salvo que haya un laser encima, porque ahi esperar es quedarse quieto */
  const huir = !ciego && botPeligro();
  if (!huir){
    const n = Math.min(360, Math.floor(Math.abs(resto)/BOT_FINO));
    for (let i = 1; i <= n; i++)
      if (botMata(P.ang + sig*i*BOT_FINO)) return false;
  }

  /* ── NO HAY TIRO QUE MATE: ESTE SE GASTA EN MOVERSE, Y SE GASTA BIEN ──
     Con «disparar salvo que venga algo mucho mejor», el bot tiraba 2.349 veces
     para 68 muertos —una tasa de 0,029— porque cualquier angulo mediocre pasaba
     el filtro y la pistola se la pasaba rebotando. Ahora tiene que estar en el
     mejor de la vuelta que le queda Y que ese mejor sirva para algo: si toda la
     vuelta es mala, conviene dejar que el giro se apague y recien ahi gastar el
     tiro, que es lo que hace la escapatoria de arriba. */
  const ahora = botPuntua(P.ang, ciego);
  let mejor = ahora;
  const G = 10;
  for (let i = 1; i <= G; i++)
    mejor = Math.max(mejor, botPuntua(P.ang + resto*(i/G), ciego));
  /* con peligro encima no se puede esperar a la vuelta perfecta: se sale de la
     linea con lo que haya */
  if (huir) return ahora >= mejor - 160;
  if (mejor < 6) return false;
  return ahora >= mejor - 45;
}

function juegaSolo(azar, tope, ciego){
  const dt = 1/120;
  let gana = 0, malos = [], tiros = 0, matados = 0, vueltas = 0, muertes = 0;
  for (let n = 1; n <= NIVELES; n++){
    generaNivel(n);
    pistolaPone(0, 0.9);
    let vidas = M.vidas, v = 0, ok = false;
    const alGolpeBot = (que, x, y, obj) => {
      if (que === 'ladron') matados++;
      if (que === 'yo'){ vidas--; pistolaPone(0, 0.9); }
    };
    /* ── EL PRESUPUESTO DE CUADROS ESCALA CON EL NIVEL ──
       Estaba fijo en 26.000 para los diez. El nivel 10 tiene 14 ladrones y 7
       pisos: jugado suelto se gana 14 de 14 en 188 tiros, pero dentro de la
       tanda —y despues de una muerte, que devuelve la pistola al suelo— no le
       alcanzaba el reloj y se anotaba como nivel imposible. Un limite de
       medicion que hace fallar la medicion no mide nada. */
    const TOPE = tope || (9000 + MUNDO.lad.length*2600);
    while (v < TOPE){
      v++; vueltas++;
      /* ── LOS DOS JUEGAN EL MISMO JUEGO: SOLO CAMBIA CUANDO SUELTAN ──
         Ninguno de los dos toca `P.ang`, porque el jugador tampoco puede. El del
         azar suelta cuando le toca; el honesto mira el mundo y espera el
         angulo. Si los dos terminan igual, elegir el momento no importa y el
         juego es un boton. */
      if (P.cd <= 0 && (azar ? Math.random() < 0.02 : botDispara(ciego))){
        const dx = Math.cos(P.ang), dy = Math.sin(P.ang);
        P.cd = M.cadencia;
        BAL.push({ x: P.x + dx*M.boca, y: P.y + dy*M.boca,
                   dx, dy, v: M.bala, t: 1.3, mia: true });
        aplicaRetro(P, P.ang);
        tiros++;
      }
      pasoCuerpo(P, dt);
      pasoBalas(dt, alGolpeBot);
      pasoLadrones(dt, alGolpeBot);
      if (vivos() === 0){ ok = true; break; }
      if (vidas <= 0){ muertes++; break; }
    }
    /* por que fallo importa mas que que fallo: «se quedo sin vidas» y «se quedo
       sin reloj» piden arreglos opuestos, y con un solo numero no se distinguen */
    if (ok) gana++; else malos.push([n, vidas <= 0 ? 'sin vidas' : 'sin reloj',
                                     vivos() + ' vivos de ' + MUNDO.lad.length]);
  }
  return JSON.stringify({ niveles: NIVELES, gana, malos, nMalos: malos.length,
                          tiros, matados, muertes, vueltas,
                          tasa: tiros ? +(matados/tiros).toFixed(3) : 0 });
}

/* ── LA AUDITORIA DEL MAPA ──
   Lo que el auto-jugador no puede contestar: si el nivel esta bien FORMADO.
   Un ladron dentro de una losa, un hueco que no se puede cruzar o un piso sin
   ladrones son defectos que el bot tapa jugando alrededor. */
function audita(){
  const malos = [];
  let minL = 99, maxL = 0, minH = 99;
  for (let n = 1; n <= NIVELES; n++){
    generaNivel(n);
    const A = M.ancho/2;
    if (MUNDO.lad.length === 0) malos.push([n, 'sin ladrones']);
    minL = Math.min(minL, MUNDO.lad.length); maxL = Math.max(maxL, MUNDO.lad.length);
    for (let i = 0; i < MUNDO.lad.length; i++){
      const l = MUNDO.lad[i];
      if (Math.abs(l.x) + 0.34 > A) malos.push([n, 'ladron ' + i + ' fuera de la torre']);
      /* ── QUE NO ESTE METIDO EN NADA, Y SE PRUEBA CONTRA LO QUE HAY ──
         Un ladron dentro de una caja o de una placa de acero es imposible de
         matar: la bala choca con lo que lo tapa antes de llegar. */
      for (const r of MUNDO.acero.concat(MUNDO.cajas))
        if (l.x + 0.34 > r.x && l.x - 0.34 < r.x + r.w &&
            l.y + 1.5 > r.y && l.y < r.y + r.h)
          malos.push([n, 'ladron ' + i + ' metido en ' + r.t]);
      /* y que tenga PISO: uno flotando sobre el hueco se lee a error */
      let piso = false;
      for (const r of MUNDO.losas)
        if (Math.abs(l.y - (r.y + r.h)) < 0.02 && l.x > r.x - 0.1 && l.x < r.x + r.w + 0.1)
          piso = true;
      if (!piso) malos.push([n, 'ladron ' + i + ' sin piso']);
    }
    /* el hueco de cada losa tiene que dejar pasar a la pistola */
    for (let p = 1; p <= MUNDO.pisos; p++){
      const y = p*M.piso;
      const tr = MUNDO.losas.filter(r => Math.abs(r.y - y) < 0.01 && r.t === 'losa');
      if (tr.length === 2){
        const h = Math.min(tr[0].x + tr[0].w, tr[1].x) < Math.max(tr[0].x + tr[0].w, tr[1].x)
                ? Math.abs(tr[1].x - (tr[0].x + tr[0].w)) : 0;
        minH = Math.min(minH, h);
        if (h < R_PIS*2 + 0.25) malos.push([n, 'hueco del piso ' + p + ' de ' + h.toFixed(2)]);
      }
    }
  }
  return JSON.stringify({ niveles: NIVELES, malos: malos.slice(0, 10),
                          nMalos: malos.length, ladrones: [minL, maxL],
                          huecoMin: +minH.toFixed(2) });
}
