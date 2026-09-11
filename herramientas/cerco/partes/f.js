/* ══════════════════════════════════════════════════════════════════════════
   f.js · LA PARTIDA: el dedo, las vidas, el reloj y el marcador
   ──────────────────────────────────────────────────────────────────────────
   EL DEDO NO ES UN JOYSTICK, ES UN GESTO. Un joystick fijo en una esquina se
   pelea con el tablero —que ocupa la pantalla entera— y encima obliga a
   mirarlo. Aca se arrastra donde uno quiera: lo que se lee es el
   DESPLAZAMIENTO desde el ultimo cambio de rumbo, y cuando pasa la zona
   muerta se dobla y el ancla se muda al dedo. O sea: una pasada de dedo es
   UNA vuelta, y encadenar vueltas es seguir arrastrando.

   Y LO QUE SE ESCRIBE ES `p.ped`, que es EL MISMO campo que usan los bots y
   el auto-jugador. Si el dedo escribiera `dx`/`dy` directo, el jugador podria
   doblar a mitad de celda y los bots no: dos fisicas distintas en el mismo
   tablero, y la auditoria estaria aprobando un juego que nadie juega.

   EL BUFFER DE UNA VUELTA es la unica pieza que no esta en el modelo. A 5,4
   celdas por segundo un tic dura 185 ms: dos toques mas rapidos que eso
   —bajar y doblar en la misma pasada— pisarian el primero. Se guarda UNA
   sola vuelta pendiente y se suelta en cuanto `tic` consumio la anterior.
   Con mas de una el cuerpo dejaria de responder a lo ultimo que se pidio.
   ══════════════════════════════════════════════════════════════════════ */

const P = {
  on: false, pausa: false, fin: null, tuto: false, arena: false,
  m: 0, nv: 0, cfg: null, M: null, yo: null,
  seg: 0, cortesVistos: 0, pct: 0, mejor: 0, casi: false, ganUlt: 0,
  giros: 0, gdx: 0, gdy: 0,
  /* EL PUESTO Y LA TAJADA SE FOTOGRAFIAN EN EL ULTIMO TIC CON VIDA. En la
     arena morir BORRA el terreno, asi que preguntando DESPUES del corte el
     panel de fin diria «8º con 0 %» siempre —es exactamente lo que el banco
     informo la primera vez, y no era el juego: era la medicion—.           */
  posUlt: 8, pctUlt: 0, primero: false, tab: null,
  hCor: [], hPct: '', hMeta: '', hRel: '', hPoco: false, hNiv: '', hTab: '',
};

/* ══════════════════════ EL DEDO ══════════════════════ */
const ENT = { id: null, ax: 0, ay: 0, ejeX: 0, cola: null };
const ENT_MIN = 15;     /* px de zona muerta: un toque no dobla             */
const ENT_HIST = 1.30;  /* cuanto le tiene que ganar el otro eje para valer */

/* UNA SOLA PUERTA para el dedo, el teclado y el tutorial. Con dos caminos, el
   que nadie prueba —el teclado— se desincroniza el dia que se toque el otro. */
function entPide(dx, dy) {
  const p = P.yo;
  if (!p || !P.on || P.pausa || P.fin) return false;
  if (dx === p.dx && dy === p.dy) return false;
  if (dx === -p.dx && dy === -p.dy) return false;   /* media vuelta: suicidio */
  if (p.ped) {
    /* `tic` todavia no consumio la anterior: se guarda la nueva y sale en
       cuanto se libere el campo. */
    if (p.ped[0] === dx && p.ped[1] === dy) return false;
    ENT.cola = [dx, dy];
    return true;
  }
  p.ped = [dx, dy];
  return true;
}
/* corre DESPUES de `paso`: ahi `tic` ya vacio `ped` y el pendiente puede
   entrar sin pisar nada. */
function entSuelta() {
  const p = P.yo;
  if (!p || !ENT.cola) return;
  if (p.ped) return;
  if (!(ENT.cola[0] === -p.dx && ENT.cola[1] === -p.dy) &&
      !(ENT.cola[0] === p.dx && ENT.cola[1] === p.dy)) p.ped = ENT.cola;
  ENT.cola = null;
}

function entBaja(e) {
  if (!P.on || P.pausa || P.fin) return;
  if (ENT.id !== null) return;
  ENT.id = e.pointerId; ENT.ax = e.clientX; ENT.ay = e.clientY; ENT.ejeX = 0;
  try { e.target.setPointerCapture(e.pointerId); } catch (x) {}
}
function entMueve(e) {
  if (ENT.id !== e.pointerId) return;
  const dx = e.clientX - ENT.ax, dy = e.clientY - ENT.ay;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < ENT_MIN && ay < ENT_MIN) return;
  /* HISTERESIS SOBRE EL EJE Y NO SOBRE LA DISTANCIA: en una diagonal, con
     `ax > ay` a secas el eje dominante parpadea y el cuerpo hace zigzag. El
     otro eje tiene que GANARLE por un tercio para robarle el turno.        */
  let eje;                                   /* 1 horizontal · 2 vertical   */
  if (ENT.ejeX === 1)      eje = ay > ax * ENT_HIST ? 2 : 1;
  else if (ENT.ejeX === 2) eje = ax > ay * ENT_HIST ? 1 : 2;
  else                     eje = ax >= ay ? 1 : 2;
  if (eje === 1 ? ax < ENT_MIN : ay < ENT_MIN) return;
  entPide(...(eje === 1 ? [dx > 0 ? 1 : -1, 0] : [0, dy > 0 ? 1 : -1]));
  /* EL ANCLA SE MUDA HAYA DOBLADO O NO: si no, un arrastre largo deja el
     desplazamiento saturado y la vuelta siguiente se dispara con un pixel. */
  ENT.ax = e.clientX; ENT.ay = e.clientY; ENT.ejeX = eje;
}
function entSube(e) {
  if (ENT.id !== e.pointerId) return;
  ENT.id = null; ENT.ejeX = 0;
}
const ENT_TEC = {
  ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1],
  KeyD: [1, 0], KeyA: [-1, 0], KeyS: [0, 1], KeyW: [0, -1],
};
function entTecla(e) {
  const d = ENT_TEC[e.code];
  if (d) { entPide(d[0], d[1]); e.preventDefault(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (P.on && !P.fin) pausaPon(!P.pausa); }
}
function entInit() {
  const c = $('cv');
  c.addEventListener('pointerdown', entBaja);
  c.addEventListener('pointermove', entMueve);
  c.addEventListener('pointerup', entSube);
  c.addEventListener('pointercancel', entSube);
  addEventListener('keydown', entTecla);
}

/* ══════════════════════ LA PARTIDA ══════════════════════ */
function partidaArranca(m, nv, tuto, arena) {
  P.m = m; P.nv = nv; P.tuto = !!tuto; P.arena = !!arena;
  /* entrar a un nivel de verdad apaga el tutorial, y va ACA porque esta es la
     unica puerta por la que se entra a una partida —`juega`, el boton de
     siguiente, la sonda—. En `juega` sola, la proxima puerta que se agregue
     entra con la pista del tutorial puesta encima del nivel 1-1.           */
  if (!P.tuto) { TUT.on = false; cl2($('tSalt'), 'on', false); cl2($('pista'), 'on', false); }
  P.cfg = P.arena ? cfgArena() : (tuto ? tutCfg() : cfgNivel(m, nv));
  P.M = generaMapa(P.cfg);
  P.yo = P.M.jug[0];
  /* el tope de cortes es lo que hace que la tercera vida sea la ultima: sin
     el, `paso` revive para siempre y las vidas serian un numero que baja.
     EN LA ARENA ES UNA, y es la mitad de por que la arena es otro juego: el
     corte no cuesta terreno, cuesta la corrida entera.                     */
  P.yo.topeCortes = P.tuto ? 1e9 : (P.arena ? 1 : VIDAS);
  P.seg = P.cfg.seg;
  P.on = true; P.pausa = false; P.fin = null;
  P.cortesVistos = 0; P.pct = 0; P.mejor = 0; P.casi = false; P.ganUlt = 0;
  P.giros = 0; P.gdx = P.yo.dx; P.gdy = P.yo.dy;
  P.posUlt = 1 + P.cfg.riv; P.pctUlt = 0; P.primero = false; P.tab = null;
  P.hCor = []; P.hPct = ''; P.hMeta = ''; P.hRel = ''; P.hPoco = false;
  P.hNiv = ''; P.hTab = '';
  vpNuevo(P.M);
  hudArma();
  hudPinta(true);
  cl2($('velo'), 'off', false);
  cl2($('hud'), 'off', false);
  cl2($('pie'), 'off', P.tuto);
  cl2($('mini'), 'off', P.tuto);
  cl2($('tabla'), 'off', !P.arena);
  auAbre(0);
  return P.M;
}

function partidaPaso(dt) {
  if (!P.on || P.pausa || P.fin) return;
  const M = P.M, yo = P.yo;
  paso(M, dt);
  entSuelta();
  const gan = vpTras(M);
  P.ganUlt = gan[1];

  /* LAS VUELTAS SE CUENTAN POR EL RUMBO QUE EL CUERPO TOMO, no por los toques
     que se pidieron: un pedido puede quedar en la cola y no salir nunca, y el
     tutorial estaria dando por hecho un gesto que no ocurrio.              */
  if (yo.dx !== P.gdx || yo.dy !== P.gdy) { P.giros++; P.gdx = yo.dx; P.gdy = yo.dy; }

  /* ── lo que gano este cuadro ── */
  if (gan[1] > 0) {
    son('tierra', gan[1]);
    if (gan[1] >= 90) avisa(TX('avTierra'));
  }
  /* ── los cortes ── */
  if (yo.cortes !== P.cortesVistos) {
    P.cortesVistos = yo.cortes;
    son('corte');
    hudPinta(true);
    /* EN LA ARENA EL PRIMER CORTE CIERRA, y se corta ACA y no mas abajo: el
       `return` tiene que ganarle a la lectura de la tajada, porque el terreno
       ya se libero y leerlo despues del corte devuelve cero.               */
    /* Y SIN AVISO: «SIN VIDAS» mentiria, porque en la arena no hay vidas que
       gastar —hay una y es la corrida—. Que el cartel no quede debajo del
       panel lo resuelve `avisaCorta`, que corre desde `termina`.            */
    if (P.arena) { termina('arena'); return; }
    if (!P.tuto && yo.cortes >= VIDAS) { avisa(TX('avSinVidas')); termina('vidas'); return; }
    avisa(TX('avCorte'));
  }

  P.pct = tajada(M, 1);
  if (P.pct > P.mejor) P.mejor = P.pct;
  auAbre(P.cfg.meta > 0 ? P.pct / P.cfg.meta : 0);

  if (P.arena) {
    /* la foto del ultimo tic con vida: el puesto y la tajada que el panel de
       fin va a mostrar. Ver el comentario de `P.posUlt`.                   */
    const tb = tablaPos(M);
    P.tab = tb;                       /* `hudArena` la reusa: recontar dos veces por cuadro es
                                         barrer el tablero entero de gusto.                    */
    P.pctUlt = P.pct;
    P.posUlt = tb.findIndex((f) => f.id === 1) + 1;
    /* EL RELOJ SUBE EN VEZ DE BAJAR: acá no hay plazo, así que lo único que
       un número de tiempo puede decir es cuánto aguantaste — que es
       literalmente el marcador de este modo.                               */
    P.seg += dt;
    /* IR PRIMERO SE AVISA UNA SOLA VEZ. Con el aviso cada vez que se cruza el
       puesto, en una pelea pareja el cartel parpadea varias veces por segundo
       y deja de querer decir algo.                                         */
    /* Y PIDE VENTAJA DE VERDAD, no ganar el desempate. `tablaPos` desempata
       por id y el jugador es el 1, asi que en el primer cuadro —con los ocho
       en 0,3 %— el cartel salia SIEMPRE: un «vas primero» que aparece antes
       de haber hecho nada no dice nada. Con medio cuerpo de ventaja sobre el
       segundo, el cartel vuelve a significar algo.                          */
    const vent = P.posUlt === 1 ? tb[0].pct - tb[1].pct : 0;
    if (!P.primero && vent > ARENA_VENT) { P.primero = true; son('casi'); avisa(TX('avPrimero')); }
    else if (P.primero && P.posUlt > 2) P.primero = false;
    hudPinta(false);
    return;
  }

  if (!P.tuto) {
    if (!P.casi && P.pct >= P.cfg.meta * 0.82 && P.pct < P.cfg.meta) {
      P.casi = true; son('casi'); avisa(TX('avCasi'));
    }
    if (P.pct >= P.cfg.meta) { termina('gana'); return; }
    P.seg -= dt;
    if (P.seg <= 0) { P.seg = 0; termina('tiempo'); return; }
  }
  hudPinta(false);
}

function termina(fin) {
  P.fin = fin;
  avisaCorta();
  const perf = fin === 'gana' && P.yo.cortes === 0;
  if (fin === 'gana') {
    son(perf ? 'perf' : 'gana');
    if (!P.tuto) anota(P.m, P.nv, perf);
  } else son('pierde');
  /* LA FANFARRIA PIDE SILENCIO Y SE LEVANTA SOLA. La cama es un pad sostenido
     y el remate dura dos segundos: sin agachar, las dos suenan a la vez y no se
     escucha ninguna. Va con duracion —a diferencia de la de la pausa, que dura
     lo que dure la pausa y la levanta quien despausa—.                       */
  auAgacha(0.25, 2.2);
  hudPinta(true);
  if (P.tuto) { tutFin(); return; }
  if (P.arena) {
    /* EL RECORD ES EL PICO Y NO LA TAJADA DEL FINAL, y es la unica lectura
       honesta: al morir el terreno se libera, asi que la del final es cero
       por construccion. Lo que uno recuerda de una corrida es cuanto llego a
       tener, no cuanto le quedaba en el ultimo cuadro.                     */
    const rec = P.mejor > (PROG.rec || 0);
    if (rec) PROG.rec = P.mejor;
    if (P.yo.matas > (PROG.recB || 0)) PROG.recB = P.yo.matas;
    guardaProg();
    finPon({ tuto: false, arena: true, pos: P.posUlt, pct: P.mejor,
             matas: P.yo.matas, seg: P.seg, rec, recAnt: PROG.rec });
    verPanel('pFin');
    return;
  }
  finPon({ tuto: false, fin, perf, pct: P.pct, meta: P.cfg.meta, cortes: P.yo.cortes, m: P.m, nv: P.nv });
  verPanel('pFin');
}

function pausaPon(v) {
  if (!P.on || P.fin) return;
  P.pausa = !!v;
  if (P.pausa) { son('ui'); auAgacha(0.22); verPanel('pPausa'); }
  else { auAgacha(1); verPanel(null); }
}

function partidaSale() {
  P.on = false; P.pausa = false; P.fin = null;
  /* Y EL TUTORIAL SE APAGA ACA, no en quien lo cierra. Hay TRES caminos que
     sacan al jugador de una partida —terminarla, saltearla y la PAUSA, que
     durante el tutorial tambien tiene su SALIR— y con la bandera apagada solo
     en los dos primeros, salir desde la pausa dejaba `TUT.on` prendido: medido,
     el nivel 1-1 arrancaba con `tutOn: true` y la pista del tutorial puesta
     encima. Apagarlo en el unico sitio por el que pasan los tres es la unica
     forma de que el proximo camino que se agregue no lo vuelva a perder.     */
  TUT.on = false;
  cl2($('velo'), 'off', true);
  cl2($('hud'), 'off', true);
  cl2($('pie'), 'off', true);
  cl2($('mini'), 'off', true);
  cl2($('tabla'), 'off', true);
  cl2($('pista'), 'on', false);
  cl2($('tSalt'), 'on', false);
  auAgacha(1); auAbre(0);
}

/* siguiente nivel: el ultimo del ultimo mundo no tiene siguiente, y un boton
   que lleva a la nada se lee a juego roto. */
function partidaSig() {
  let m = P.m, nv = P.nv + 1;
  if (nv >= NIV_MUNDO) { m++; nv = 0; }
  if (m >= MUNDOS.length) return null;
  return [m, nv];
}

/* ══════════════════════ EL MARCADOR ══════════════════════
   TODO SE ESCRIBE SOLO CUANDO CAMBIA. `textContent` ensucia el layout aunque
   el valor sea el mismo, y aca hay cuatro numeros por cuadro a sesenta por
   segundo: doscientos cuarenta reflujos para pintar lo mismo.              */
function cl2(el, c, v) { if (el) el.classList.toggle(c, !!v); }

function hudArma() {
  const v = $('vidas');
  v.innerHTML = '';
  P.hCor = [];
  const t = $('tabla');
  t.innerHTML = '';
  P.hTab = '';
  if (P.arena) {
    /* LAS OCHO FILAS SE ARMAN UNA VEZ Y DESPUES SOLO SE ESCRIBEN. Rehaciendo
       el HTML por cuadro son ocho nodos nuevos sesenta veces por segundo para
       mostrar lo mismo, y encima el navegador rehace el layout en cada una. */
    for (let i = 0; i < 1 + P.cfg.riv; i++) {
      const f = document.createElement('div');
      f.className = 'tf';
      f.innerHTML = '<span class="tn"></span><i class="tc"></i><span class="tp"></span>';
      t.appendChild(f);
    }
    return;   /* una vida no es un corazon que se gasta: es la corrida entera */
  }
  if (P.tuto) return;
  for (let i = 0; i < VIDAS; i++) {
    const d = document.createElement('div');
    d.className = 'cor';
    v.appendChild(d); P.hCor.push(d);
  }
}

function fmtReloj(s) {
  s = Math.max(0, Math.ceil(s));
  const m = (s / 60) | 0, r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

function hudPinta(todo) {
  const M = P.M, cfg = P.cfg;
  if (!M) return;

  /* la barra: la tajada de cada uno, y la marca de la meta */
  const bs = $('barra').getElementsByTagName('i');
  if (M.sucio) recuenta(M);
  for (let i = 0; i < bs.length; i++) {
    const id = i + 1;
    const w = id <= (1 + cfg.riv) && M.libres > 0 ? M.cuenta[id] / M.libres : 0;
    bs[i].style.width = (w * 100).toFixed(2) + '%';
    if (todo) bs[i].style.background = COLS[id] ? COLS[id].t : 'transparent';
  }
  if (todo) {
    $('meta').style.left = (cl(cfg.meta, 0, 1) * 100).toFixed(2) + '%';
    $('meta').style.display = (P.tuto || P.arena) ? 'none' : 'block';
  }

  if (P.arena) { hudArena(todo); return; }

  if (!P.tuto) {
    const pc = Math.round(P.pct * 100) + '%';
    if (pc !== P.hPct) { $('pct').firstElementChild.textContent = pc; P.hPct = pc; }
    const mt = TX('metaR', Math.round(cfg.meta * 100));
    if (mt !== P.hMeta) { $('pctR').textContent = mt; P.hMeta = mt; }
    const rl = fmtReloj(P.seg);
    if (rl !== P.hRel) { $('reloj').firstElementChild.textContent = rl; P.hRel = rl; }
    const poco = P.seg <= 10.5;
    if (poco !== P.hPoco) { cl2($('reloj'), 'poco', poco); P.hPoco = poco; }
    if (todo) $('relR').textContent = TX('tiempo');
  }

  if (todo) {
    const nv = P.tuto ? TX('tutTit') : TX('nivel', P.m + 1, P.nv + 1);
    if (nv !== P.hNiv) {
      $('nrN').textContent = nv;
      $('nrM').textContent = P.tuto ? '' : nomMundo(P.m);
      P.hNiv = nv;
    }
    for (let i = 0; i < P.hCor.length; i++) {
      const ida = i < P.yo.cortes;
      const d = P.hCor[P.hCor.length - 1 - i];   /* se gastan de derecha a izquierda */
      if (ida && !d.classList.contains('ida')) {
        d.classList.add('ida', 'late');
        setTimeout(() => d.classList.remove('late'), 520);
      } else if (!ida) d.classList.remove('ida', 'late');
    }
  }
}

/* ── EL MARCADOR DE LA ARENA ──────────────────────────────────────────────
   Los dos numeros del pie cambian de significado y no de sitio: donde iba la
   meta va el puesto, y donde iba el reloj van las bajas. Reusar los mismos
   elementos no es ahorro de HTML — es que quien juega ya sabe DONDE mirar, y
   moverle los numeros de lugar entre un modo y otro le cuesta esa costumbre.  */
function hudArena(todo) {
  const M = P.M;
  const t = P.tab || tablaPos(M);
  const pc = (P.pct * 100).toFixed(1) + '%';
  if (pc !== P.hPct) { $('pct').firstElementChild.textContent = pc; P.hPct = pc; }
  if (todo) $('pctR').textContent = TX('terreno');

  const ba = String(P.yo.matas);
  if (ba !== P.hRel) { $('reloj').firstElementChild.textContent = ba; P.hRel = ba; }
  if (todo) { $('relR').textContent = TX('bajas'); cl2($('reloj'), 'poco', false); P.hPoco = false; }

  const ps = TX('pos', P.posUlt);
  if (ps !== P.hNiv) {
    $('nrN').textContent = ps;
    $('nrM').textContent = TX('puesto');
    P.hNiv = ps;
  }

  /* LA TABLA SE ESCRIBE SOLO CUANDO CAMBIA, y la firma es el texto entero:
     con ocho filas a sesenta cuadros por segundo son casi mil quinientas
     escrituras de DOM por segundo para mostrar el mismo reparto.           */
  const fs = $('tabla').children;
  let firma = '';
  for (let i = 0; i < fs.length && i < t.length; i++) firma += t[i].id + ':' + Math.round(t[i].pct * 1000) + (t[i].vivo ? '' : 'x') + '|';
  if (firma === P.hTab) return;
  P.hTab = firma;
  for (let i = 0; i < fs.length && i < t.length; i++) {
    const f = fs[i], d = t[i], c = COLS[d.id];
    f.children[0].textContent = String(d.pos);
    f.children[1].style.background = c ? c.t : 'transparent';
    f.children[2].textContent = (d.pct * 100).toFixed(1) + '%';
    cl2(f, 'yo', d.id === 1);
    cl2(f, 'muerto', !d.vivo);
  }
}

/* ── el aviso corto ── */
let AV_T = 0;
function avisa(txt, ms) {
  const a = $('aviso');
  a.textContent = txt;
  cl2(a, 'on', true);
  clearTimeout(AV_T);
  AV_T = setTimeout(() => cl2(a, 'on', false), ms || 900);
}
/* Y SE LO BAJA AL ABRIR EL PANEL, desde `termina` y de ningun otro sitio. El
   aviso flota en la franja del medio, que es justo donde el panel escribe el
   subtitulo, y el panel es translucido a proposito: cualquier cartel que
   siguiera puesto se lee POR DETRAS del texto del final. Fotografiado dos
   veces, con dos avisos distintos —«SIN VIDAS» primero y «¡TIERRA!» despues—,
   asi que la cuenta no es «sacar el aviso que molesta» sino que el que abre el
   panel baje el que haya.                                                   */
function avisaCorta() { clearTimeout(AV_T); cl2($('aviso'), 'on', false); }

/* ── el panel de fin ──
   SE PINTA DESDE UNA FUNCION Y NO DESDE EL SITIO QUE GANO: cambiar de idioma
   con el panel puesto tiene que repintarlo, y para eso hay que poder volver a
   pintarlo sin volver a ganar. Por eso el estado se guarda en `FIN`.
   Y LO PINTA UNA SOLA FUNCION PARA LOS DOS CIERRES —el del nivel y el del
   tutorial—: con dos pintores, el dia que se agregue un campo uno de los dos
   se queda corto, y el que se queda corto es siempre el que nadie mira.   */
let FIN = null;
function finPon(o) { FIN = o; finPinta(); }
function finPinta() {
  if (!FIN) return;
  const f = FIN;
  if (f.arena) {
    $('fTit').textContent = TX('arenaFin');
    $('fSub').textContent = TX('arenaFinSub', f.pos);
    /* EL SINGULAR ES UNA FRASE ENTERA Y NO UN SUFIJO: en ingles son «kill» y
       «kills», dos palabras distintas en la tabla. Es la leccion que la vuelta
       165 ya habia pagado con «1 cortes», y volvio con otro contador.       */
    $('fDatos').textContent = TX(f.matas === 1 ? 'arenaD1' : 'arenaD',
                                 (f.pct * 100).toFixed(1), f.matas, fmtReloj(f.seg))
      + ' · ' + (f.rec ? TX('arenaNuevo') : TX('arenaRec', (f.recAnt * 100).toFixed(1)));
    $('fSig').style.display = '';
    $('fSig').textContent = TX('arenaOtra');
    /* REINTENTAR NO EXISTE ACA, y no es un olvido: una arena no se «reintenta»
       —no hay un nivel al que volver— asi que el boton y OTRA VEZ harian
       exactamente lo mismo con dos nombres distintos.                       */
    $('fRe').style.display = 'none';
    $('fMenu').textContent = TX('menuCorto');
    return;
  }
  $('fRe').style.display = '';
  if (f.tuto) {
    $('fTit').textContent = TX('tutGana');
    $('fSub').textContent = TX('tutGanaSub');
    $('fDatos').textContent = TX('tutDatos');
    $('fSig').style.display = '';
    $('fSig').textContent = TX('jugar');
    $('fRe').textContent = TX('tuto');
    $('fMenu').textContent = TX('menuCorto');
    return;
  }
  const gana = f.fin === 'gana';
  $('fTit').textContent = TX(gana ? (f.perf ? 'ganaPerf' : 'gana') : (f.fin === 'vidas' ? 'pierdeV' : 'pierdeT'));
  /* UN CORTE NO SON «1 cortes», y el singular es una FRASE por idioma y no un
     sufijo: en ingles son «cut»/«cuts», dos palabras distintas. Y el numero de
     vidas del subtitulo sale de VIDAS y no escrito en palabras — con «tres»
     puesto a mano, cambiar VIDAS deja la frase mintiendo sin que nada falle. */
  $('fSub').textContent = TX(gana ? (f.perf ? 'ganaPerfSub' : 'ganaSub') : (f.fin === 'vidas' ? 'pierdeVSub' : 'pierdeTSub'), VIDAS);
  $('fDatos').textContent = f.cortes === 1
    ? TX('datos1', Math.round(f.pct * 100), Math.round(f.meta * 100))
    : TX('datos', Math.round(f.pct * 100), Math.round(f.meta * 100), f.cortes);
  const sig = gana ? partidaSig() : null;
  $('fSig').style.display = sig ? '' : 'none';
  $('fSig').textContent = TX('siguiente');
  $('fRe').textContent = TX('reintentar');
  $('fMenu').textContent = TX('menuCorto');
}
