/* ============================================================
   c.js — EL MODELO. No toca ni el DOM ni el lienzo, asi que
   `b.js`+`c.js` se concatenan y se importan en node: la
   auditoria y los auto-jugadores corren sin navegador.

   Y aca vive la regla que sostiene el juego entero:

     LA PUNTUACION ES **UNA** FUNCION.

   `puntua()` la llaman el detector de mano, la vista previa que
   el jugador mira antes de tirar, la jugada de verdad, el
   auto-jugador y el auditor. Con dos cuentas, la vista previa
   promete un puntaje que el juego no paga — y eso no falla:
   miente.
   ============================================================ */

/* --- azar con semilla ---
   Con Math.random una partida no se puede reproducir, y sin
   reproducir no hay auditoria. */
function rngNuevo(s){
  let a = s >>> 0;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const az  = () => JU.rng ? JU.rng() : Math.random();
const azI = n => Math.floor(az() * n);
function mezcla(a){
  for (let i = a.length - 1; i > 0; i--){
    const j = azI(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* --- la baraja --- */
let _cid = 0;
function carta(p, r){ return { p, r, me:'', ed:'', se:'', id:++_cid }; }
function mazoNuevo(){
  const m = [];
  for (let p = 0; p < 4; p++) for (const r of RANGOS) m.push(carta(p, r));
  return m;
}

/* ============================================================
   DETECCION DE MANO

   La piedra no tiene rango ni palo, asi que no entra en la
   deteccion — pero SI puntua (son 50 fichas). El comodin vale
   cualquier palo para el color y nada mas.
   ============================================================ */
function grupear(vivas){
  const porR = {};
  vivas.forEach(c => { (porR[c.r] = porR[c.r] || []).push(c); });
  const gs = Object.values(porR).sort((a, b) => b.length - a.length || b[0].r - a[0].r);
  const g0 = gs[0] ? gs[0].length : 0;
  const g1 = gs[1] ? gs[1].length : 0;

  /* color: cinco cartas del mismo palo; el comodin se acomoda al que haya */
  let col = false;
  if (vivas.length >= 5){
    const fijas = vivas.filter(c => c.me !== 'comodin');
    col = !fijas.length || fijas.every(c => c.p === fijas[0].p);
  }

  return { gs, g0, g1, esc:escaleraDe(vivas), col };
}

function escaleraDe(vivas){
  if (vivas.length < 5) return false;
  const rs = [...new Set(vivas.map(c => c.r))];
  if (rs.length !== 5) return false;
  rs.sort((a, b) => a - b);
  let seguidas = true;
  for (let i = 1; i < 5; i++) if (rs[i] !== rs[i-1] + 1) seguidas = false;
  if (seguidas) return true;
  /* el as tambien vale abajo: A 2 3 4 5 */
  return rs[0] === 2 && rs[1] === 3 && rs[2] === 4 && rs[3] === 5 && rs[4] === 14;
}

/* `contiene` no es `es igual a`: un full CONTIENE un par, y por
   eso el comodin que paga "si la mano tiene un par" se dispara
   con un full. Es la regla del juego original. */
function contiene(g, t){
  if (t === 'par')      return g.g0 >= 2;
  if (t === 'doblepar') return (g.g0 >= 2 && g.g1 >= 2) || g.g0 >= 4;
  if (t === 'trio')     return g.g0 >= 3;
  if (t === 'escalera') return g.esc;
  if (t === 'color')    return g.col;
  return false;
}

/* Devuelve el tipo y CUALES cartas cuentan. En color, escalera,
   full y las de cinco cuentan las cinco; en un par cuentan dos.
   Esa lista es la que despues puntua de izquierda a derecha. */
function detecta(cs){
  const vivas = cs.filter(c => c.me !== 'piedra');
  const piedras = cs.filter(c => c.me === 'piedra');
  const g = grupear(vivas);
  const todo = () => cs.slice();

  let tipo, cuentan;
  if      (g.g0 >= 5 && g.col)               { tipo = 'familiareal';   cuentan = todo(); }
  else if (g.g0 >= 3 && g.g1 >= 2 && g.col)  { tipo = 'florimperial';  cuentan = todo(); }
  else if (g.g0 >= 5)                        { tipo = 'cincoiguales';  cuentan = todo(); }
  else if (g.esc && g.col)                   { tipo = 'escaleracolor'; cuentan = todo(); }
  else if (g.g0 >= 4)                        { tipo = 'poker';         cuentan = g.gs[0].slice(); }
  else if (g.g0 >= 3 && g.g1 >= 2)           { tipo = 'full';          cuentan = todo(); }
  else if (g.col)                            { tipo = 'color';         cuentan = todo(); }
  else if (g.esc)                            { tipo = 'escalera';      cuentan = todo(); }
  else if (g.g0 >= 3)                        { tipo = 'trio';          cuentan = g.gs[0].slice(); }
  else if (g.g0 >= 2 && g.g1 >= 2)           { tipo = 'doblepar';      cuentan = g.gs[0].concat(g.gs[1]); }
  else if (g.g0 >= 2)                        { tipo = 'par';           cuentan = g.gs[0].slice(); }
  else {
    tipo = 'alta';
    let alta = null;
    vivas.forEach(c => { if (!alta || c.r > alta.r) alta = c; });
    cuentan = alta ? [alta] : [];
  }

  /* la piedra siempre cuenta, sea cual sea la mano */
  if (!cuentan.length || cuentan !== cs) piedras.forEach(c => { if (cuentan.indexOf(c) < 0) cuentan.push(c); });

  /* de izquierda a derecha, en el orden en que estan sobre la mesa */
  cuentan.sort((a, b) => cs.indexOf(a) - cs.indexOf(b));
  return { tipo, cuentan, g };
}

/* --- el jefe puede MATAR cartas: no dan fichas ni mult, pero
   siguen contando para que tipo de mano es --- */
function jefeMata(jefe, c){
  const J = JEFES[jefe];
  return !!(J && J.muerto && J.muerto(c));
}

/* ============================================================
   LA PUNTUACION

   El orden es el del juego original y no es negociable, porque
   los multiplicadores no conmutan: `x2` antes o despues de `+10`
   da numeros distintos.

     1. la base de la mano, en SU nivel
     2. cada carta que cuenta, de izquierda a derecha
     3. las que se quedaron en la mano (acero, sello rojo)
     4. cada comodin, de izquierda a derecha
     5. fichas x mult

   `sim:true` es la vista previa: no tira los dados de la carta
   de suerte ni rompe el cristal. Un preview que gasta suerte
   mostraria un numero que la jugada de verdad no repite.
   ============================================================ */
function puntua(cs, o){
  o = o || {};
  const enMano   = o.enMano   || [];
  const com      = o.com      || [];
  const niv      = o.niv      || {};
  const jefe     = o.jefe     !== undefined ? o.jefe     : '';
  const x        = o.x        || {};
  const descRest = o.descRest !== undefined ? o.descRest : 0;
  const sim      = !!o.sim;

  const det = detecta(cs);
  const M   = MANOS[det.tipo];
  const lv  = niv[det.tipo] || 1;

  let fichas = M.f + M.df * (lv - 1);
  let mult   = M.m + M.dm * (lv - 1);
  let dinero = 0;
  const rotas = [], log = [];
  const muerta = c => jefeMata(jefe, c);

  /* 2) las cartas que cuentan */
  for (const c of det.cuentan){
    if (muerta(c)){ log.push({ c, nada:true }); continue; }
    const veces = c.se === 'rojo' ? 2 : 1;   /* el sello rojo la dispara dos veces */
    for (let v = 0; v < veces; v++){
      const f0 = fichas, m0 = mult;
      fichas += fichasDe(c);
      if      (c.me === 'bonus')   fichas += 30;
      else if (c.me === 'mult')    mult   += 4;
      else if (c.me === 'cristal') mult   *= 2;
      else if (c.me === 'suerte' && !sim){
        if (az() < 0.20)   mult   += 20;
        if (az() < 1 / 15) dinero += 20;
      }
      if      (c.ed === 'foil') fichas += 50;
      else if (c.ed === 'holo') mult   += 10;
      else if (c.ed === 'poli') mult   *= 1.5;
      if (c.se === 'oro') dinero += 3;
      log.push({ c, df:fichas - f0, dm:mult - m0 });
    }
    /* el cristal se rompe una de cada cuatro, DESPUES de puntuar */
    if (c.me === 'cristal' && !sim && az() < 0.25) rotas.push(c);
  }

  /* 3) las que se quedaron en la mano */
  for (const c of enMano){
    if (muerta(c) || c.me !== 'acero') continue;
    const veces = c.se === 'rojo' ? 2 : 1;
    for (let v = 0; v < veces; v++){ mult *= 1.5; log.push({ c, mano:true }); }
  }

  /* 4) los comodines. Cuentan los palos de las cartas que puntuaron;
        el comodin-carta vale para los cuatro. */
  const cta = [0, 0, 0, 0];
  for (const c of det.cuentan){
    if (muerta(c) || c.me === 'piedra') continue;
    if (c.me === 'comodin'){ cta[0]++; cta[1]++; cta[2]++; cta[3]++; }
    else cta[c.p]++;
  }

  const C = {
    fichas, mult, dinero, cta, enMano, descRest,
    jugadas: det.cuentan, tipo: det.tipo, x,
    tiene: t => contiene(det.g, t),
  };
  const comLog = [];
  for (const k of com){
    const J = COM[k];
    if (!J || !J.f) continue;
    const f0 = C.fichas, m0 = C.mult;
    if (J.f(C)) comLog.push({ k, df:C.fichas - f0, dm:C.mult - m0, m0 });
  }

  return {
    tipo: det.tipo, lv, cuentan: det.cuentan,
    fichas: C.fichas, mult: C.mult,
    total: Math.round(C.fichas * C.mult),
    dinero: C.dinero, rotas, log, comLog,
  };
}

/* La vista previa es LA MISMA funcion con `sim`. */
function previo(cs){
  if (!cs.length) return null;
  return puntua(cs, {
    enMano: JU.mano.filter(c => cs.indexOf(c) < 0),
    com: JU.com, niv: JU.niv, jefe: cieganJefe(), descRest: JU.desc, x: JU.comX, sim:true,
  });
}
const cieganJefe = () => JU.ciegaIx === 2 ? JU.jefe : '';

/* ============================================================
   LO QUE EL JEFE CAMBIA
   ============================================================ */
function manosDe(){
  let m = MANOS_BASE;
  JU.com.forEach(k => { if (COM[k] && COM[k].manos) m += COM[k].manos; });
  const J = JEFES[cieganJefe()];
  if (J && J.manos) m += J.manos;
  return Math.max(1, m);
}
function descDe(){
  let d = DESC_BASE;
  JU.com.forEach(k => { if (COM[k] && COM[k].desc) d += COM[k].desc; });
  const J = JEFES[cieganJefe()];
  if (J && J.desc) d += J.desc;
  return Math.max(0, d);
}
function manoTam(){
  let t = MANO_TAM;
  JU.com.forEach(k => { if (COM[k] && COM[k].mano) t += COM[k].mano; });
  return t;
}

/* Si la jugada es legal. La usan el boton de TIRAR (para
   apagarlo) y el auto-jugador: con dos cuentas el boton diria
   que se puede y el juego lo rechazaria. */
function legalBase(cs){
  if (!cs.length || cs.length > SEL_MAX) return false;
  const J = JEFES[cieganJefe()];
  if (!J || !J.regla) return true;
  if (J.regla === 'cinco' && cs.length !== 5) return false;
  const t = detecta(cs).tipo;
  if (J.regla === 'norepite' && JU.jugadasRonda.indexOf(t) >= 0) return false;
  if (J.regla === 'unatipo' && JU.jugadasRonda.length && JU.jugadasRonda[0] !== t) return false;
  return true;
}

/* SI NINGUNA JUGADA ES LEGAL, TODAS LO SON.
   LA BOCA obliga a repetir el tipo de la primera mano. Con ocho
   cartas que no lo arman y sin descartes, las 218 combinaciones
   quedan ilegales y la partida no puede seguir NI terminar: medido,
   el auto-jugador se cortaba en el ante 1.2 sin morir. Una regla
   que puede volver el juego injugable no es una regla, es una
   trampa. Vale igual para EL OJO y para EL PSIQUICO.
   Y la salida pasa POR `legal`, que es lo que leen el boton TIRAR,
   la jugada de verdad y el auto-jugador: con dos cuentas, el boton
   se veria apagado sobre una mano que si se puede tirar. */
let TRAB_K = '', TRAB_V = false;
function trabado(){
  if (!JU.mano.length) return false;
  const k = JU.mano.map(c => c.id).join(',') + '|' + JU.jugadasRonda.join(',')
          + '|' + JU.ante + '.' + JU.ciegaIx;
  if (k === TRAB_K) return TRAB_V;
  TRAB_K = k; TRAB_V = true;
  const subs = subconjuntos(JU.mano, SEL_MAX);
  for (let i = 0; i < subs.length; i++)
    if (legalBase(subs[i])){ TRAB_V = false; break; }
  return TRAB_V;
}

function legal(cs){
  if (!cs.length || cs.length > SEL_MAX) return false;
  return legalBase(cs) || trabado();
}

/* ============================================================
   EL MAZO EN JUEGO
   ============================================================ */
let ORDEN_MANO = 'rango';
function ordena(m){
  if (m) ORDEN_MANO = m;
  if (ORDEN_MANO === 'palo') JU.mano.sort((a, b) => a.p - b.p || b.r - a.r);
  else                       JU.mano.sort((a, b) => b.r - a.r || a.p - b.p);
}
function robaHasta(){
  const t = manoTam();
  while (JU.mano.length < t && JU.mazo.length) JU.mano.push(JU.mazo.pop());
  ordena();
}
function saca(cs){
  cs.forEach(c => { const i = JU.mano.indexOf(c); if (i >= 0) JU.mano.splice(i, 1); });
  JU.sel = [];
}

/* ============================================================
   TIENDA Y SOBRES
   ============================================================ */
function comSorteo(){
  const r = az();
  /* EL 5% DEL ORIGINAL ACA ES CERO. Con 2 ranuras, 58% de comodin y
     nueve rondas, un 5% de raro son 0,5 apariciones por partida — y los
     cuatro multiplicativos (vela, espejo, obelisco, fogata) viven ahi.
     El censo lo canto: `obelisco` salia 3 veces en 120 partidas contra
     30 de `medio`. Con 20% se da vuelta —obelisco 39, fogata 38,
     espejo 37, vela 35 son los CUATRO mas tenidos— y el techo de
     puntaje pasa de 15.980 a 32.542 en el ante 4. */
  const rar = r < 0.50 ? 0 : (r < 0.80 ? 1 : 2);
  for (let i = 0; i < 3; i++){
    const lista = COM_POR_RAR[(rar + i) % 3].filter(k => JU.com.indexOf(k) < 0);
    if (lista.length) return lista[azI(lista.length)];
  }
  return '';
}
function tiendaItem(){
  const r = az();
  if (r < 0.58){
    const k = comSorteo();
    if (k) return { t:'comodin', k, pre: COM[k].pre };
  }
  if (r < 0.80) return { t:'tarot',   k: TAROT_ID[azI(TAROT_ID.length)],     pre: PRECIO_TAROT };
  return          { t:'planeta', k: PLANETA_ID[azI(PLANETA_ID.length)], pre: PRECIO_PLANETA };
}
function sobreItem(){
  const ks = Object.keys(SOBRES);
  const k = ks[azI(ks.length)];
  return { k, pre: SOBRES[k].pre };
}
function tiendaArma(){
  const it = [];
  for (let i = 0; i < TIENDA_SLOTS; i++) it.push(tiendaItem());
  JU.tienda = { it, sobres:[sobreItem(), sobreItem()], reroll: REROLL_BASE };
}
function tiendaReroll(){
  if (!JU.tienda || JU.dinero < JU.tienda.reroll) return false;
  JU.dinero -= JU.tienda.reroll;
  JU.tienda.reroll++;
  JU.tienda.it = JU.tienda.it.map(() => tiendaItem());
  return true;
}
function tiendaCompra(i){
  const it = JU.tienda && JU.tienda.it[i];
  if (!it || it.ido || JU.dinero < it.pre) return false;
  if (it.t === 'comodin' && JU.com.length >= COM_RANURAS) return false;
  if (it.t !== 'comodin' && it.t !== 'planeta' && JU.cons.length >= CONS_RANURAS) return false;
  JU.dinero -= it.pre;
  if      (it.t === 'comodin') JU.com.push(it.k);
  else if (it.t === 'planeta') planetaUsa(it.k);
  else                         JU.cons.push({ t:it.t, k:it.k });
  it.ido = true;
  return true;
}
function sobreCompra(i){
  const s = JU.tienda && JU.tienda.sobres[i];
  if (!s || s.ido || JU.dinero < s.pre) return false;
  JU.dinero -= s.pre;
  s.ido = true;
  const S = SOBRES[s.k];
  const op = [];
  for (let j = 0; j < S.n; j++){
    if      (S.tipo === 'tarot')   op.push({ t:'tarot',   k: TAROT_ID[azI(TAROT_ID.length)] });
    else if (S.tipo === 'planeta') op.push({ t:'planeta', k: PLANETA_ID[azI(PLANETA_ID.length)] });
    else if (S.tipo === 'comodin'){ const k = comSorteo(); if (k) op.push({ t:'comodin', k }); }
    else                           op.push({ t:'carta',   c: cartaSobre() });
  }
  JU.sobre = { k:s.k, op, elige:S.elige, hechas:0 };
  return true;
}
/* Una carta de sobre viene con mejora: si no, seria una carta mas del mazo. */
function cartaSobre(){
  const c = carta(azI(4), RANGOS[azI(RANGOS.length)]);
  if (az() < 0.70) c.me = MEJORAS[azI(MEJORAS.length)];
  if (az() < 0.20) c.ed = EDICIONES[azI(EDICIONES.length)];
  if (az() < 0.12) c.se = SELLOS[azI(SELLOS.length)];
  return c;
}
function sobreElige(i){
  const S = JU.sobre; if (!S || S.hechas >= S.elige) return false;
  const op = S.op[i]; if (!op || op.ido) return false;
  if      (op.t === 'comodin'){ if (JU.com.length >= COM_RANURAS) return false; JU.com.push(op.k); }
  else if (op.t === 'planeta'){ planetaUsa(op.k); }
  else if (op.t === 'tarot')  { if (JU.cons.length >= CONS_RANURAS) return false; JU.cons.push({ t:'tarot', k:op.k }); }
  else                        { JU.mazo.push(op.c); mezcla(JU.mazo); }
  op.ido = true; S.hechas++;
  return true;
}

/* ============================================================
   TAROT Y PLANETA
   ============================================================ */
function planetaUsa(k){ JU.niv[k] = (JU.niv[k] || 1) + 1; comSube('subeP', {}); }

/* El tarot pide cartas elegidas: `sel` dice CUANTAS. 0 = ninguna. */
function tarotUsa(k, cs){
  const T = TAROT[k]; if (!T) return false;
  const n = cs ? cs.length : 0;
  if (T.sel && (n === 0 || n > T.sel)) return false;
  if (!T.sel && n) return false;
  if (T.me)   cs.forEach(c => { c.me = T.me; });
  if (T.palo !== undefined) cs.forEach(c => { c.p = T.palo; });
  if (T.dinero === 'doble') JU.dinero = Math.min(JU.dinero * 2, JU.dinero + 20);
  else if (T.dinero)        JU.dinero += T.dinero;
  return true;
}
function consUsa(i, cs){
  const c = JU.cons[i]; if (!c) return false;
  const ok = c.t === 'tarot' ? tarotUsa(c.k, cs) : (planetaUsa(c.k), true);
  if (ok){ JU.cons.splice(i, 1); JU.sel = []; }
  return ok;
}

/* ============================================================
   ECONOMIA

   El interes es lo que hace que guardar plata sea una decision:
   $1 por cada $5 en mano, con techo. Sin techo, la corrida se
   gana ahorrando y comprar deja de tener costo.
   ============================================================ */
function interes(){ return Math.min(Math.floor(JU.dinero / INTERES_PASO), INTERES_TOPE); }
function rentaDe(){
  let r = CIEGAS[JU.ciegaIx].pago;
  JU.com.forEach(k => { if (COM[k] && COM[k].renta) r += COM[k].renta; });
  return r;
}
function pagoRonda(){
  const oroEnMano = JU.mano.filter(c => c.me === 'oro').length * 3;
  return rentaDe() + interes() + JU.manos + oroEnMano;
}

/* ============================================================
   LA CORRIDA
   ============================================================ */
function objetivoDe(){
  const cg = CIEGAS[JU.ciegaIx];
  let v = baseAnte(JU.ante) * cg.mult;
  const J = JEFES[cieganJefe()];
  if (J && J.esc) v *= J.esc;
  return Math.round(v);
}

function partidaNueva(semilla){
  JU.rng = rngNuevo(semilla === undefined ? (Math.random() * 1e9) | 0 : semilla);
  JU.ante = 1; JU.ronda = 1; JU.ciegaIx = 0;
  JU.dinero = 4; JU.com = []; JU.comX = {}; JU.cons = []; JU.niv = {}; JU.vistas = {};
  JU.totManos = 0; JU.mejorMano = 0; JU.consUsado = -1;
  JU.tienda = null; JU.sobre = null; JU.ultima = null; JU.anim = null;
  JU.baraja = mazoNuevo();
  JU.jefe = JEFES_ID[azI(JEFES_ID.length)];
  cieganNueva();
}

/* Cada ciega arranca con el mazo entero barajado de nuevo: lo
   descartado vuelve. */
function cieganNueva(){
  JU.objetivo = objetivoDe();
  JU.puntaje = 0;
  JU.manos = manosDe();
  JU.desc  = descDe();
  JU.jugadasRonda = [];
  JU.mazo = mezcla(JU.baraja.slice());
  JU.mano = []; JU.jugadas = []; JU.descartadas = []; JU.sel = [];
  robaHasta();
  JU.modo = 'juega';
}

/* Tirar. Devuelve el resultado de `puntua` o null si es ilegal. */
function tira(cs){
  if (!legal(cs) || JU.manos <= 0) return null;
  const r = puntua(cs, {
    enMano: JU.mano.filter(c => cs.indexOf(c) < 0),
    com: JU.com, niv: JU.niv, jefe: cieganJefe(), descRest: JU.desc, x: JU.comX,
  });
  JU.puntaje += r.total;
  JU.manos--;
  JU.totManos++;
  JU.dinero += r.dinero;
  if (r.total > JU.mejorMano) JU.mejorMano = r.total;
  /* el obelisco mira la mas jugada ANTES de contar esta: si no, la
     primera mano de la partida siempre seria "la mas jugada". */
  comSube('sube', { tipo:r.tipo, masJug:masJugada(),
                    figuras: cs.some(c => c.r >= 11 && c.r <= 13) });
  JU.vistas[r.tipo] = (JU.vistas[r.tipo] || 0) + 1;
  JU.jugadasRonda.push(r.tipo);
  /* el cristal roto sale del mazo para siempre */
  r.rotas.forEach(c => { const i = JU.baraja.indexOf(c); if (i >= 0) JU.baraja.splice(i, 1); });
  saca(cs);
  JU.jugadas = cs;
  JU.ultima = r;
  if (JU.puntaje < JU.objetivo) robaHasta();
  return r;
}

/* ============================================================
   LO QUE CRECE CRECE ACA, NO EN `puntua`
   `puntua` es la MISMA funcion que dibuja la vista previa, y la
   vista previa se recalcula en cada toque: con el incremento
   adentro, mirar una mano la haria subir sin jugarla.
   Y los tres ganchos leen la MISMA tabla que el efecto, asi que no
   hay dos listas de comodines que crecen que se puedan
   desincronizar.
   ============================================================ */
function comSube(campo, ctx){
  JU.com.forEach(k => {
    const J = COM[k]; if (!J || !J[campo]) return;
    JU.comX[k] = J[campo](JU.comX[k] || 0, ctx);
  });
}
/* cual es la mano mas jugada de la partida: la necesita el obelisco,
   que paga por VARIAR y no por repetir. */
function masJugada(){
  let m = '', n = -1;
  Object.keys(JU.vistas).forEach(k => { if (JU.vistas[k] > n){ n = JU.vistas[k]; m = k; } });
  return m;
}

function descarta(cs){
  if (!cs.length || cs.length > SEL_MAX || JU.desc <= 0) return false;
  JU.desc--;
  comSube('baja', {});
  saca(cs);
  JU.descartadas = JU.descartadas.concat(cs);
  robaHasta();
  return true;
}

const gano  = () => JU.puntaje >= JU.objetivo;
const perdio= () => !gano() && JU.manos <= 0;

/* Cerrar la ciega: cobrar y abrir la tienda. */
function cieganCierra(){
  JU.dinero += pagoRonda();
  if (JU.ciegaIx === 2) comSube('subeJ', {});   /* se gano un jefe */
  JU.ciegaIx++;
  if (JU.ciegaIx > 2){
    JU.ciegaIx = 0; JU.ante++;
    JU.jefe = JEFES_ID[azI(JEFES_ID.length)];
  }
  JU.ronda++;
  tiendaArma();
  JU.modo = 'tienda';
}

/* ============================================================
   AUTO-JUGADOR Y AUDITORIA

   Lo unico que prueba que hay una decision adentro es que el
   que elige bien le gane al que elige al azar. Y los dos juegan
   POR EL MISMO CAMINO: `tira()` y `descarta()`, no escribiendo
   el puntaje a mano.
   ============================================================ */
function subconjuntos(m, tope){
  const out = [];
  const n = Math.min(m.length, 12);
  for (let mask = 1; mask < (1 << n); mask++){
    let k = 0, x = mask;
    while (x){ k += x & 1; x >>= 1; }
    if (k > tope) continue;
    const s = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s.push(m[i]);
    out.push(s);
  }
  return out;
}

function mejorJugada(){
  let mejor = null, mt = -1;
  for (const s of subconjuntos(JU.mano, SEL_MAX)){
    if (!legal(s)) continue;
    const r = puntua(s, {
      enMano: JU.mano.filter(c => s.indexOf(c) < 0),
      com: JU.com, niv: JU.niv, jefe: cieganJefe(), descRest: JU.desc, x: JU.comX, sim:true,
    });
    if (r.total > mt){ mt = r.total; mejor = s; }
  }
  return mejor ? { cs: mejor, total: mt } : null;
}

/* EL BOT NO COMPRA LO MAS BARATO: compra lo que mas le sirve.
   Comprar por precio es comprar planetas de $3 para siempre y no
   juntar nunca para un comodin que multiplica — medido, con esa
   politica el honesto muere en el ante 2.

   Y guarda reserva, porque el interes paga por tener plata
   quieta: gastar hasta el ultimo peso cuesta $1 por cada $5 que
   uno no dejo en la mano. */
/* LA FAVORITA ES LA MAS JUGADA, Y NO LA QUE MAS PAGA POR NIVEL.
   Probe pesarla por cuanto vale su nivel —un nivel de `poker` son
   +30 fichas y +3 mult sobre 60 y 7, y uno de `par` son +15 y +1
   sobre 10 y 2, o sea nueve veces mas— y MIDIO PEOR: honesto 3,16 a
   3,08 y con plata infinita 4,16 a 4,04. La razon es que un nivel
   solo se cobra cuando la mano SALE, y `vistas` estima mal justo las
   manos raras: multiplicar esa estimacion por un delta nueve veces
   mas grande amplifica el error en vez de corregirlo. */
const botFavorita = () => {
  let m = '', n = -1;
  Object.keys(JU.vistas).forEach(k => { if (JU.vistas[k] > n){ n = JU.vistas[k]; m = k; } });
  return m || 'par';
};

/* LO QUE VALE UN COMODIN NO ES SU PRECIO: SE MIDE.
   Se lo aplica a la ULTIMA mano que el bot jugo de verdad —con
   `puntua`, la misma funcion del juego— y lo que vale es cuanto la
   multiplica. Con el precio, uno que suma +4 de multiplicador y uno
   que lo triplica valen igual si cuestan igual, y los que CRECEN
   valen lo MENOS de todo, porque arrancan en cero.
   Por eso cada uno que crece declara `proy`: a cuanto llega en un
   ante. Ese numero es lo unico escrito a mano; la comparacion la
   sigue haciendo puntua, asi que no hay una segunda tabla de cuanto
   pega cada comodin que se pueda desincronizar de la de verdad. */
function comVale(k){
  const J = COM[k]; if (!J) return 0;
  const u = JU.ultima;
  if (!u || !u.cuentan || !u.cuentan.length) return J.pre;   /* todavia no jugo nada */
  const x = Object.assign({}, JU.comX);
  if (J.proy) x[k] = J.proy;
  const o = { enMano:[], niv:JU.niv, jefe:'', descRest:JU.desc, x, sim:true };
  const sin = puntua(u.cuentan, Object.assign({}, o, { com:JU.com }));
  const con = puntua(u.cuentan, Object.assign({}, o, { com:JU.com.concat([k]) }));
  if (!sin.total) return J.pre;
  /* EL PISO ES EL PRECIO, Y NO ES UN DETALLE: es lo que hace que la
     medicion SUME en vez de reemplazar. `puntua` se corre contra UNA
     mano recordada, asi que un comodin cuyo efecto no aplica a esa
     mano —uno de palo, uno de un tipo de mano, o `acero` y `baron`,
     que miran las cartas EN MANO— devuelve cero y el bot lo descarta
     para siempre. O sea que esto detecta un bonus y no puede
     demostrar la ausencia de uno. Y la escala tiene que ser la misma
     que la de los sobres (8/6/4 en `botTienda`) o el bot compra
     sobres toda la partida: medido sin piso, los comodines por
     partida caen de 3,68 a 3,01. */
  return Math.max(J.pre, (con.total / sin.total - 1) * 24);
}

function botValor(it){
  if (it.t === 'comodin') return JU.com.length >= COM_RANURAS ? 0 : comVale(it.k);
  if (it.t === 'planeta') return it.k === botFavorita() ? 7 : 1;
  if (it.t === 'tarot'){
    /* sin ranura libre un consumible no se puede ni guardar */
    if (JU.cons.length >= CONS_RANURAS) return 0;
    return botTarotVale(it.k);
  }
  return 0;
}
/* CUANTO VALE UN TAROT PARA EL BOT, y sale de si lo sabe usar. Los
   que mejoran cartas dejan la mejora puesta para el resto de la
   partida; los de plata pagan una vez; los de palo solo valen si la
   mano ya esta cerca de un color. Lo que no sabe usar vale cero, y
   por eso no lo compra: con dos ranuras, un tarot inutilizable las
   tapa y el bot se queda sin poder comprar planetas. */
function botTarotVale(k){
  const T = TAROT[k]; if (!T) return 0;
  if (T.me) return 6;
  if (T.dinero) return 3;
  if (T.palo !== undefined) return 2;
  return 0;
}

/* EL BOT NO USABA LO QUE COMPRABA. Los planetas se quedaban en
   `cons` hasta el final de la partida: medido, el honesto se plantaba
   en el ante 2,79 porque sin subir de nivel la mano que juega no hay
   con que seguir la curva de las ciegas (300, 800, 2000, 5000...).
   Un auto-jugador que no juega el mismo juego que el jugador esta
   midiendo otro juego, y entonces el numero que devuelve no describe
   el juego sino al bot. */
function botConsumibles(){
  for (let i = JU.cons.length - 1; i >= 0; i--){
    const c = JU.cons[i];
    /* un planeta guardado no hace nada y un nivel no se puede
       deshacer: no hay ninguna razon para esperar */
    if (c.t === 'planeta'){ consUsa(i, []); continue; }
    const T = TAROT[c.k]; if (!T) continue;
    if (!T.sel){ consUsa(i, []); continue; }
    if (T.me){
      /* a las mas gordas SIN mejora: una mejora encima de otra la pisa */
      const cs = JU.mano.filter(x => !x.me)
                        .sort((a, b) => fichasDe(b) - fichasDe(a))
                        .slice(0, T.sel);
      if (cs.length) consUsa(i, cs);
      continue;
    }
    if (T.palo !== undefined){
      /* cambiar tres cartas de palo solo sirve si con eso se llega
         al color: con dos del palo puestas, tres mas hacen cinco */
      const porP = [0, 0, 0, 0];
      JU.mano.forEach(x => porP[x.p]++);
      if (porP[T.palo] < 2) continue;
      const cs = JU.mano.filter(x => x.p !== T.palo)
                        .sort((a, b) => fichasDe(b) - fichasDe(a))
                        .slice(0, T.sel);
      if (cs.length === T.sel) consUsa(i, cs);
    }
  }
}
function botSobre(){
  const S = JU.sobre; if (!S) return;
  while (S.hechas < S.elige){
    let ix = -1, iv = -1;
    S.op.forEach((o, i) => {
      if (o.ido) return;
      let v = 0;
      if      (o.t === 'planeta') v = o.k === botFavorita() ? 9 : 2;
      else if (o.t === 'comodin') v = JU.com.length >= COM_RANURAS ? 0 : COM[o.k].pre;
      else if (o.t === 'carta')   v = 3;
      if (v > iv){ iv = v; ix = i; }
    });
    if (ix < 0 || !sobreElige(ix)) break;
  }
  JU.sobre = null;
}
/* QUE SE TIRA. La version anterior tiraba "lo que no entra en la
   mejor mano de AHORA", y eso no persigue nada: con un par en la
   mano se quedaba con dos cartas y robaba seis a ver que sale.
   Lo que se guarda es lo que PUEDE crecer — las cartas repetidas
   (un par se hace trio, un trio se hace poker) y el palo mayoritario
   SI YA HAY CUATRO. Con tres midio PEOR — ante 2,45 contra 2,77 —
   porque perseguir un color desde tres tira cartas buenas a cambio
   de un tiro que casi nunca entra; desde cuatro falta una sola y
   paga. El resto se tira empezando por lo que menos fichas da. */
function botDescarte(){
  const m = JU.mano;
  if (!m.length) return [];
  const porR = {}, porP = [0,0,0,0];
  m.forEach(c => { porR[c.r] = (porR[c.r] || 0) + 1; porP[c.p]++; });
  let pMax = 0;
  for (let p = 1; p < 4; p++) if (porP[p] > porP[pMax]) pMax = p;
  const guarda = c => porR[c.r] >= 2 || (porP[pMax] >= 4 && c.p === pMax)
                   || c.me === 'piedra' || c.ed || c.se;
  let fuera = m.filter(c => !guarda(c));
  /* si no sobra nada, la mano ya es toda "util": se tira lo mas flojo */
  if (!fuera.length) fuera = m.slice();
  fuera.sort((a, b) => fichasDe(a) - fichasDe(b));
  return fuera.slice(0, Math.min(SEL_MAX, m.length - 1));
}

function botTienda(){
  /* SIN COMODINES NO SE GUARDA UN PESO. El interes paga $1 por cada
     $5 quietos; un comodin de $4 que suma +4 de multiplicador paga
     eso en la primera mano y sigue pagando todas las demas. Medido,
     con reserva desde el ante 1 el bot llegaba al ante 2 con CERO
     comodines y $7 en la mano. */
  const reserva = JU.com.length < 2 ? 0 : Math.min(3 + JU.ante * 2, 15);
  for (let g = 0; g < 12; g++){
    let ix = -1, iv = 0;
    JU.tienda.it.forEach((it, i) => {
      if (!it || it.ido) return;
      const v = botValor(it);
      if (v <= 0 || it.pre > JU.dinero - reserva) return;
      if (v > iv){ iv = v; ix = i; }
    });
    /* el sobre celeste da TRES planetas para elegir: es la unica
       forma de subir la mano que uno juega y no una al azar */
    let sx = -1, sv = 0;
    JU.tienda.sobres.forEach((s, i) => {
      if (!s || s.ido || s.pre > JU.dinero - reserva) return;
      const v = s.k === 'celeste' ? 8 : s.k === 'bufon' ? 6 : s.k === 'estandar' ? 4 : 0;
      if (v > sv){ sv = v; sx = i; }
    });
    if (sv > iv && sx >= 0){ if (!sobreCompra(sx)) break; botSobre(); continue; }
    if (ix < 0) break;
    if (!tiendaCompra(ix)) break;
  }
}

function juegaSolo(semilla, modo, topeAnte){
  const azarPuro = modo === 'azar';
  topeAnte = topeAnte || 8;
  partidaNueva(semilla);
  let vueltas = 0;
  while (JU.ante <= topeAnte && vueltas++ < 4000){
    if (JU.modo === 'juega'){
      if (!azarPuro) botConsumibles();
      let jugada;
      if (azarPuro){
        const ss = subconjuntos(JU.mano, SEL_MAX).filter(legal);
        jugada = ss.length ? { cs: ss[azI(ss.length)], total:0 } : null;
      } else {
        jugada = mejorJugada();
      }
      if (!jugada) break;
      /* SE DESCARTA CONTRA LA CUOTA DE ESTA MANO, NO CONTRA EL
         OBJETIVO ENTERO. Con `falta` a secas ninguna primera mano
         llega nunca —300 puntos no salen de un par— asi que el bot
         quemaba los tres descartes de arrancada y despues jugaba lo
         que le tocara: medido en la semilla 1074, tres descartes y
         despues manos de 76, 64, 36 y 15. Con cuatro manos por
         delante, a esta le toca un cuarto. */
      const falta = JU.objetivo - JU.puntaje;
      const cuota = falta / Math.max(1, JU.manos);
      if (!azarPuro && JU.desc > 0 && jugada.total < cuota && JU.manos > 1){
        const fuera = botDescarte();
        if (fuera.length){ descarta(fuera); continue; }
      }
      if (azarPuro && JU.desc > 0 && az() < 0.35){
        const fuera = mezcla(JU.mano.slice()).slice(0, 1 + azI(SEL_MAX));
        if (fuera.length){ descarta(fuera); continue; }
      }
      tira(jugada.cs);
      if (gano())  { cieganCierra(); continue; }
      if (perdio()) break;
    } else if (JU.modo === 'tienda'){
      if (!azarPuro) botTienda();
      cieganNueva();
    } else break;
  }
  return {
    ante: JU.ante, ronda: JU.ronda, dinero: JU.dinero,
    manos: JU.totManos, mejor: JU.mejorMano,
    com: JU.com.length, niveles: Object.keys(JU.niv).length,
    gano: JU.ante > topeAnte,
  };
}

function audita(n, modo, topeAnte){
  n = n || 40;
  const rs = [];
  for (let i = 0; i < n; i++) rs.push(juegaSolo(1000 + i * 37, modo, topeAnte));
  const med = k => rs.reduce((a, r) => a + r[k], 0) / rs.length;
  return {
    n, modo: modo || 'honesto',
    gana: rs.filter(r => r.gano).length,
    ante: +med('ante').toFixed(2),
    ronda: +med('ronda').toFixed(2),
    manos: +med('manos').toFixed(1),
    mejor: Math.round(med('mejor')),
    com: +med('com').toFixed(2),
  };
}

/* Auditoria del detector: cada mano tiene que reconocerse como
   si misma. Con una sola cuenta rota, el juego paga otra cosa
   de la que muestra. */
function auditaManos(){
  const C = (p, r, e) => { const c = carta(p, r); if (e) c.me = e; return c; };
  const casos = [
    ['familiareal',   [C(0,10),C(0,10),C(0,10),C(0,10),C(0,10)]],
    ['florimperial',  [C(0,9),C(0,9),C(0,9),C(0,4),C(0,4)]],
    ['cincoiguales',  [C(0,7),C(1,7),C(2,7),C(3,7),C(0,7)]],
    ['escaleracolor', [C(1,5),C(1,6),C(1,7),C(1,8),C(1,9)]],
    ['poker',         [C(0,3),C(1,3),C(2,3),C(3,3),C(0,9)]],
    ['full',          [C(0,5),C(1,5),C(2,5),C(0,8),C(1,8)]],
    ['color',         [C(2,2),C(2,5),C(2,9),C(2,11),C(2,13)]],
    ['escalera',      [C(0,2),C(1,3),C(2,4),C(3,5),C(0,6)]],
    ['escalera',      [C(0,14),C(1,2),C(2,3),C(3,4),C(0,5)]],
    ['trio',          [C(0,4),C(1,4),C(2,4),C(0,9),C(1,12)]],
    ['doblepar',      [C(0,4),C(1,4),C(2,9),C(3,9),C(0,12)]],
    ['par',           [C(0,4),C(1,4),C(2,9),C(3,11),C(0,13)]],
    ['alta',          [C(0,2),C(1,5),C(2,9),C(3,11),C(0,13)]],
  ];
  const malos = [];
  casos.forEach(([esp, cs]) => { const t = detecta(cs).tipo; if (t !== esp) malos.push(esp + '->' + t); });
  /* el comodin-carta cierra un color que le falta un palo */
  const wild = [C(2,2),C(2,5),C(2,9),C(2,11),C(0,13,'comodin')];
  if (detecta(wild).tipo !== 'color') malos.push('comodin->' + detecta(wild).tipo);
  /* la piedra no rompe la mano y SI puntua */
  const conP = [C(0,4),C(1,4),C(2,9),C(3,11),C(0,2,'piedra')];
  const dp = detecta(conP);
  if (dp.tipo !== 'par') malos.push('piedra->' + dp.tipo);
  if (dp.cuentan.filter(c => c.me === 'piedra').length !== 1) malos.push('piedra-no-cuenta');
  return { n: casos.length + 2, malos };
}
