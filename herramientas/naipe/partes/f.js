
/* ============================================================
   f.js — LAS PANTALLAS

   Aca vive la maqueta y nada mas: donde cae cada cosa, que zona
   registra y que pasa cuando el dedo la toca. La regla del juego
   esta en `c.js` y el dibujo en `e.js`; este archivo no decide si
   una jugada es legal ni como se dibuja una carta.

   El toque entra por UNA funcion (`toca`) que pregunta la zona.
   Con un manejador por pantalla, la que nadie prueba se queda sin
   el arreglo que se le hizo a las otras.
   ============================================================ */

const HUD_Y = 10,  HUD_H = 40;
const COM_Y = 58,  COM_H = 92,  COM_W = 70;
const PUN_Y = 158, PUN_H = 94;
const MESA_Y = 262, MESA_H = 196;
const CONS_Y = 470, CONS_H = 78, CONS_W = 74;
const MANO_Y = 576, MANO_H = 106, CARTA_W = 72;
const BOT_Y = 712,  BOT_H = 50;
const PIE_Y = 784;
const ALZA = 18;                 /* cuanto sube una carta elegida */

let ORDEN_TOC = 0;               /* el ultimo toque, para la animacion del boton */
let COM_SEL = -1;                /* comodin elegido en la tienda, para vender */

/* --- avisos --- */
let AVI_T = 0;
function avisa(s){
  if (!HAY_DOM) return;
  const e = $('#aviso'); if (!e) return;
  e.textContent = s; e.style.opacity = 1; AVI_T = 1.9;
}
function pista(s){
  if (!HAY_DOM) return;
  const e = $('#pista'); if (!e) return;
  e.textContent = s || ''; e.style.opacity = s ? 1 : 0;
}
function aviPaso(dt){
  if (AVI_T > 0){ AVI_T -= dt; if (AVI_T <= 0 && HAY_DOM){ const e=$('#aviso'); if (e) e.style.opacity = 0; } }
}

/* ============================================================
   LO QUE SE VE SIEMPRE
   ============================================================ */
function pintaHud(){
  const cg = CIEGAS[JU.ciegaIx];
  txtB('ANTE ' + JU.ante + '/8', 14, HUD_Y + 13, 13, '#f4f1e8', 'left');
  txtB(tt('ciegas', cg.id), 14, HUD_Y + 31, 10, JU.ciegaIx === 2 ? '#fe5f55' : '#93a3a0', 'left');
  txtB('$' + JU.dinero, AN - 14, HUD_Y + 13, 16, '#ffd166', 'right');
  txtB(T('ronda') + ' ' + JU.ronda, AN - 14, HUD_Y + 31, 10, '#93a3a0', 'right');
  /* la pausa va en el HUD y no en un boton del DOM: el DOM de este
     juego son los paneles, y un boton flotando encima del fieltro
     se lee a otra aplicacion */
  const bx = AN / 2 - 19;
  caja(bx, HUD_Y + 2, 38, 34, 10, 'rgba(0,0,0,.34)', 'rgba(255,255,255,.18)', 1.5);
  for (let i = 0; i < 3; i++){
    CX.fillStyle = '#93a3a0';
    CX.fillRect(bx + 11, HUD_Y + 11 + i * 6, 16, 2);
  }
  zona('pausa', bx, HUD_Y, 38, 38);
}

function pintaComodines(){
  const n = COM_RANURAS;
  const paso = (AN - 20 - COM_W) / (n - 1);
  for (let i = 0; i < n; i++){
    const x = 10 + paso * i, k = JU.com[i];
    if (!k){ pintaRanura(x, COM_Y, COM_W, COM_H, true); continue; }
    pintaComodin(x, COM_Y, COM_W, COM_H, k, { sel: COM_SEL === i });
    zona('com', x, COM_Y, COM_W, COM_H, i);
  }
}

function pintaConsumibles(){
  const x0 = 10;
  for (let i = 0; i < CONS_RANURAS; i++){
    const x = x0 + (CONS_W + 8) * i, C = JU.cons[i];
    if (!C){ pintaRanura(x, CONS_Y, CONS_W, CONS_H, true); continue; }
    pintaCons(x, CONS_Y, CONS_W, CONS_H, C, {});
    zona('cons', x, CONS_Y, CONS_W, CONS_H, i);
  }
  /* a la derecha, el jefe: su regla es la unica informacion que
     cambia lo que conviene jugar, asi que tiene que estar a la vista
     y no en un cartel que ya se fue */
  if (JU.ciegaIx === 2){
    const x = x0 + (CONS_W + 8) * CONS_RANURAS + 6, w = AN - x - 10;
    pintaPanel(x, CONS_Y, w, CONS_H, 'rgba(60,14,16,.55)');
    txt(tt('jefesN', JU.jefe), x + w / 2, CONS_Y + 20, 12, '#fe5f55', 'center', 900);
    envuelve(tt('jefesD', JU.jefe), x + w / 2, CONS_Y + 40, w - 12, 9, '#e9c9c6');
  }
}

/* parte un texto en renglones que entren en `w`: en tres idiomas la
   misma descripcion mide distinto y un `slice` corta palabras */
function envuelve(s, cx, y, w, px, col){
  envuelveLineas(s, w, px, 700).slice(0, 3).forEach((l, i) => txt(l, cx, y + i * (px + 3), px, col, 'center', 700));
}

function pintaMano(){
  const n = JU.mano.length;
  if (!n) return;
  const h = MANO_H;
  const paso = n > 1 ? Math.min(CARTA_W + 6, (AN - 20 - CARTA_W) / (n - 1)) : 0;
  const ancho = CARTA_W + paso * (n - 1);
  const x0 = (AN - ancho) / 2;
  const jefe = cieganJefe();
  for (let i = 0; i < n; i++){
    const c = JU.mano[i], x = x0 + paso * i;
    const sel = JU.sel.indexOf(i) >= 0;
    pintaCarta(x, MANO_Y, CARTA_W, h, c,
               { sel, alza: sel ? ALZA : 0, muerta: jefeMata(jefe, c) });
    /* la zona NO sube con la carta: la de al lado tapa su mitad
       derecha, asi que el blanco util es la franja que asoma — y
       eso es lo mismo esté elegida o no */
    zona('carta', x, MANO_Y - ALZA, i === n - 1 ? CARTA_W : paso, h + ALZA, i);
  }
}

function pintaBotones(){
  const w = 116, hu = (AN - w * 2 - 30) ;
  const puede = JU.sel.length > 0;
  const jl = puede && legal(JU.sel.map(i => JU.mano[i])) && JU.manos > 0;
  pintaBoton(12, BOT_Y, w, BOT_H, T('jugarM'), '#6ece8a', !jl);
  if (jl) zona('jugar', 12, BOT_Y, w, BOT_H);
  const xd = AN - 12 - w;
  const dl = puede && JU.desc > 0;
  pintaBoton(xd, BOT_Y, w, BOT_H, T('descartar'), '#fe5f55', !dl);
  if (dl) zona('descartar', xd, BOT_Y, w, BOT_H);
  /* el orden va en el medio y es chico: se toca pocas veces */
  const xo = 12 + w + 8, wo = xd - xo - 8;
  pintaBoton(xo, BOT_Y + 8, wo, BOT_H - 16,
             ORDEN_MANO === 'palo' ? T('ordenP') : T('ordenR'), '#3fa9f5', false);
  zona('orden', xo, BOT_Y, wo, BOT_H);
}

function pintaPie(){
  const cel = (AN - 24) / 3;
  const dat = [[T('manos'), JU.manos, '#3fa9f5'],
               [T('desc'),  JU.desc,  '#fe5f55'],
               [T('dinero'), '$' + JU.dinero, '#ffd166']];
  dat.forEach((d, i) => {
    const x = 12 + cel * i;
    pintaPanel(x + 3, PIE_Y, cel - 6, 44);
    txt(d[0], x + cel / 2, PIE_Y + 13, 9, '#93a3a0', 'center', 700);
    txt(String(d[1]), x + cel / 2, PIE_Y + 30, 17, d[2], 'center', 900);
  });
}

/* ============================================================
   EL PANEL DE PUNTUACION

   Es lo unico que contesta "¿me alcanza?", asi que muestra las dos
   cifras que se multiplican Y el objetivo, no una sola.
   ============================================================ */
function pintaPuntos(){
  pintaPanel(10, PUN_Y, AN - 20, PUN_H);
  /* arriba: cuanto hay que llegar y cuanto va */
  txt(T('objetivo'), 24, PUN_Y + 16, 9, '#93a3a0', 'left', 700);
  txt(String(JU.objetivo), 24, PUN_Y + 34, 20, '#fe5f55', 'left', 900);
  txt(String(JU.puntaje), AN - 24, PUN_Y + 30, 26,
      JU.puntaje >= JU.objetivo ? '#6ece8a' : '#f4f1e8', 'right', 900);
  /* la barra: un numero contra otro no dice cuanto falta de un vistazo */
  const bw = AN - 48, bx = 24, by = PUN_Y + 46;
  caja(bx, by, bw, 6, 3, 'rgba(0,0,0,.35)', null);
  const f = Math.min(1, JU.puntaje / Math.max(1, JU.objetivo));
  if (f > 0) caja(bx, by, Math.max(4, bw * f), 6, 3, f >= 1 ? '#6ece8a' : '#ffd166', null);

  /* abajo: fichas × mult de lo que esta elegido, o de la animacion */
  let f2 = 0, m2 = 0, nom = '';
  if (JU.anim){ f2 = JU.anim.f; m2 = JU.anim.m; nom = tt('manosN', JU.anim.r.tipo); }
  else if (JU.sel.length){
    const p = previo(JU.sel.map(i => JU.mano[i]));
    if (p){ f2 = p.fichas; m2 = p.mult; nom = tt('manosN', p.tipo) + '  ' + T('nivelSube', p.lv); }
  }
  const y = PUN_Y + 74;
  if (nom){
    txt(nom, 24, y - 12, 10, '#cfe0dc', 'left', 700);
    const sf = String(Math.round(f2)), sm = String(Math.round(m2 * 100) / 100);
    const wf = anchoTxt(sf, 18, 900), wm = anchoTxt(sm, 18, 900);
    const tot = wf + wm + 44, x0 = AN - 24 - tot;
    caja(x0, y - 12, wf + 16, 24, 5, '#3fa9f5', null);
    txt(sf, x0 + wf / 2 + 8, y, 18, '#0e1618', 'center', 900);
    txt('×', x0 + wf + 24, y, 15, '#f4f1e8', 'center', 900);
    caja(x0 + wf + 36, y - 12, wm + 16, 24, 5, '#fe5f55', null);
    txt(sm, x0 + wf + 44 + wm / 2, y, 18, '#0e1618', 'center', 900);
  } else {
    txt(T('elegiCartas', SEL_MAX), AN / 2, y, 10, '#6e7f7c', 'center', 700);
  }
}

/* ============================================================
   LA MESA

   Mientras se elige, muestra las cartas elegidas en grande; al
   tirar, las mismas cartas puntuando una por una. Es la misma
   funcion porque es la misma fila: cambiando de sitio entre la
   vista previa y la jugada, la mano "salta" justo cuando hay que
   mirarla.
   ============================================================ */
function pintaMesa(){
  const A = JU.anim;
  const cs = A ? A.r.cuentan : (JU.sel.length ? JU.sel.map(i => JU.mano[i]) : []);
  const todas = A ? A.cs : cs;
  if (!todas.length){
    txt(T('elegiCiega'), AN / 2, MESA_Y + MESA_H / 2, 11, '#4f615e', 'center', 700);
    return;
  }
  const w = 76, h = 108;
  const paso = Math.min(w + 10, (AN - 24 - w) / Math.max(1, todas.length - 1));
  const x0 = (AN - (w + paso * (todas.length - 1))) / 2;
  const y = MESA_Y + 22;
  todas.forEach((c, i) => {
    const vivo = !A || A.brilla === c;
    const cuenta = cs.indexOf(c) >= 0;
    pintaCarta(x0 + paso * i, y, w, h, c,
               { alza: vivo && A ? 10 : 0, muerta: A ? !cuenta : false });
  });
  /* el numerito que sale de la carta que acaba de puntuar */
  if (A && A.pop && A.popT > 0){
    const i = todas.indexOf(A.brilla);
    const px = x0 + paso * Math.max(0, i) + w / 2;
    const a = Math.min(1, A.popT / .30);
    CX.globalAlpha = a;
    txtB(A.pop, px, y - 14 - (1 - a) * 16, 17, A.popC, 'center', 900);
    CX.globalAlpha = 1;
  }
  if (A && A.fin){
    txtB('+' + A.r.total, AN / 2, MESA_Y + MESA_H - 14, 26, '#ffd166', 'center', 900);
  }
}

/* ============================================================
   LA ANIMACION DE PUNTUAR

   Recorre el mismo `log` que devolvio `puntua`, asi que lo que se
   ve sumar ES lo que se sumo: con una cuenta propia, la animacion
   podria terminar en un numero distinto del que el juego ya cobro.
   ============================================================ */
const ANIM_PASO = 0.15, ANIM_FIN = 0.75;
function animArranca(r, cs){
  const M = MANOS[r.tipo];
  const ev = [];
  r.log.forEach(L => ev.push({ t:'c', L }));
  r.comLog.forEach(L => ev.push({ t:'j', L }));
  JU.anim = {
    r, cs, ev, i: -1, t: 0, fin: false,
    f: M.f + M.df * (r.lv - 1), m: M.m + M.dm * (r.lv - 1),
    brilla: null, pop: '', popC: '#fff', popT: 0,
  };
}
function animPaso(dt){
  const A = JU.anim; if (!A) return;
  A.t += dt;
  if (A.popT > 0) A.popT -= dt;
  if (A.fin){
    if (A.t >= ANIM_FIN){ JU.anim = null; tiraCierra(); }
    return;
  }
  while (A.t >= ANIM_PASO && A.i < A.ev.length - 1){
    A.t -= ANIM_PASO;
    A.i++;
    const e = A.ev[A.i];
    if (e.t === 'c'){
      const L = e.L;
      A.brilla = L.c;
      if (L.nada){ A.pop = '—'; A.popC = '#6e7f7c'; son('mal'); }
      else {
        A.f += L.df; A.m += L.dm;
        if (L.dm > 0){ A.pop = '+' + Math.round(L.dm * 100) / 100; A.popC = '#fe5f55'; son('mult'); }
        else          { A.pop = '+' + Math.round(L.df);            A.popC = '#3fa9f5'; son('ficha'); }
      }
    } else {
      const L = e.L;
      A.f += L.df; A.m += L.dm;
      A.brilla = null;
      A.pop = (L.dm ? '+' + Math.round(L.dm * 100) / 100 : '+' + Math.round(L.df));
      A.popC = '#ffd166'; son('comodin');
      avisa(tt('comN', L.k));
    }
    A.popT = .32;
  }
  if (A.i >= A.ev.length - 1 && A.t >= ANIM_PASO){
    A.fin = true; A.t = 0; A.f = A.r.fichas; A.m = A.r.mult;
    son(A.r.total >= JU.objetivo ? 'gana' : 'ficha');
  }
}
/* lo que pasa DESPUES de la animacion, que es donde el juego avanza */
function tiraCierra(){
  JU.jugadas = [];
  if (gano()){
    JU.modo = 'puntua';
    JU.pago = pagoRonda();
    son('gana');
  } else if (perdio()){
    JU.modo = 'fin';
    finMuestra(false);
  }
}

/* ============================================================
   PANTALLA DE CIEGA
   ============================================================ */
function pintaCiega(){
  pintaFieltro();
  const cg = CIEGAS[JU.ciegaIx];
  const jefe = JU.ciegaIx === 2;
  txtB('ANTE ' + JU.ante + '/8', AN / 2, 150, 13, '#93a3a0');
  txtB(tt('ciegas', cg.id), AN / 2, 196, 26, jefe ? '#fe5f55' : '#f4f1e8');
  if (jefe){
    txtB(tt('jefesN', JU.jefe), AN / 2, 244, 17, '#ffd166');
    envuelve(tt('jefesD', JU.jefe), AN / 2, 276, AN - 60, 12, '#e9c9c6');
  }
  pintaPanel(56, 340, AN - 112, 104);
  txt(T('objetivo'), AN / 2, 366, 10, '#93a3a0', 'center', 700);
  txt(String(objetivoDe()), AN / 2, 396, 32, '#fe5f55', 'center', 900);
  txt(T('pago') + '  $' + CIEGAS[JU.ciegaIx].pago, AN / 2, 426, 11, '#ffd166', 'center', 700);
  pintaBoton(AN / 2 - 90, 486, 180, 52, T('jugarCiega'), '#6ece8a', false);
  zona('ciegaVa', AN / 2 - 90, 486, 180, 52);
  /* los comodines se ven aca: es lo que se acaba de comprar y lo
     que decide si esta ciega se puede o no */
  pintaComodines();
}

/* ============================================================
   PANTALLA DE VICTORIA DE RONDA
   ============================================================ */
function pintaPuntua(){
  pintaFieltro();
  txtB(T('ganaste'), AN / 2, 210, 22, '#6ece8a');
  const cg = CIEGAS[JU.ciegaIx];
  const fil = [[tt('ciegas', cg.id), '$' + cg.pago],
               [T('manosSobra') + ' ×' + JU.manos, '$' + JU.manos],
               [T('interes'), '$' + interes()]];
  let y = 290;
  pintaPanel(50, 268, AN - 100, 132);
  fil.forEach(f => {
    txt(f[0], 72, y, 11, '#cfe0dc', 'left', 700);
    txt(f[1], AN - 72, y, 13, '#ffd166', 'right', 900);
    y += 30;
  });
  caja(72, y - 12, AN - 144, 1.5, 0, 'rgba(244,241,232,.18)', null);
  txt('$' + JU.pago, AN - 72, y + 8, 20, '#ffd166', 'right', 900);
  pintaBoton(AN / 2 - 90, 442, 180, 52, T('tienda'), '#ffd166', false);
  zona('aTienda', AN / 2 - 90, 442, 180, 52);
}

/* ============================================================
   LA TIENDA
   ============================================================ */
function pintaTienda(){
  pintaFieltro();
  txtB(T('tienda'), 14, 28, 18, '#ffd166', 'left');
  txtB('$' + JU.dinero, AN - 14, 28, 20, '#ffd166', 'right');

  /* lo que ya se tiene, arriba: comprar sin ver las ranuras que
     quedan es comprar a ciegas */
  pintaComodines();
  const Tn = JU.tienda; if (!Tn) return;

  /* los dos articulos */
  const w = 150, h = 176, y = 172;
  const x0 = (AN - (w * 2 + 12)) / 2;
  Tn.it.forEach((it, i) => {
    const x = x0 + (w + 12) * i;
    if (it.ido){ pintaRanura(x, y, w, h, true); return; }
    pintaPanel(x, y, w, h);
    if (it.t === 'comodin') pintaComodin(x + 22, y + 14, w - 44, 104, it.k, {});
    else                    pintaCons(x + 30, y + 14, w - 60, 104, { t:it.t, k:it.k }, {});
    const d = it.t === 'comodin' ? tt('comD', it.k)
            : it.t === 'tarot'   ? tt('tarD', it.k)
            : T('planeta', tt('manosN', it.k));
    envuelve(d, x + w / 2, y + 132, w - 14, 8.5, '#93a3a0');
    const pu = JU.dinero >= it.pre;
    pintaBoton(x + 30, y + h - 34, w - 60, 26, '$' + it.pre, '#6ece8a', !pu);
    zona('compra', x, y, w, h, i);
  });

  /* los sobres */
  const sw = 150, sh = 62, sy = y + h + 14;
  Tn.sobres.forEach((s, i) => {
    const x = x0 + (sw + 12) * i;
    if (s.ido){ pintaRanura(x, sy, sw, sh, true); return; }
    pintaPanel(x, sy, sw, sh, 'rgba(48,26,66,.55)');
    txt(tt('sobreN', s.k), x + sw / 2, sy + 22, 10, '#c47bff', 'center', 900);
    const pu = JU.dinero >= s.pre;
    pintaBoton(x + 30, sy + 34, sw - 60, 20, '$' + s.pre, '#c47bff', !pu);
    zona('sobre', x, sy, sw, sh, i);
  });

  /* reroll y salida */
  const by = sy + sh + 18;
  const rr2 = JU.dinero >= Tn.reroll;
  pintaBoton(14, by, 150, 44, T('rerollT', Tn.reroll), '#3fa9f5', !rr2);
  if (rr2) zona('reroll', 14, by, 150, 44);
  pintaBoton(AN - 164, by, 150, 44, T('siguiente'), '#6ece8a', false);
  zona('salirTienda', AN - 164, by, 150, 44);

  /* los consumibles y el boton de vender, que solo existe con un
     comodin elegido: un boton de vender siempre visible es una
     venta accidental esperando */
  pintaConsumibles();
  if (COM_SEL >= 0 && JU.com[COM_SEL]){
    const pre = Math.max(1, Math.floor((COM[JU.com[COM_SEL]].pre || 4) / 2));
    const bx = AN / 2 - 80, byy = CONS_Y + CONS_H + 12;
    pintaBoton(bx, byy, 160, 38, T('vender') + '  $' + pre, '#fe5f55', false);
    zona('vender', bx, byy, 160, 38);
  }
}

/* ============================================================
   EL SOBRE
   ============================================================ */
function pintaSobre(){
  pintaFieltro();
  const S = JU.sobre; if (!S) return;
  txtB(tt('sobreN', S.k), AN / 2, 130, 18, '#c47bff');
  txtB(T('elegiSobre'), AN / 2, 162, 11, '#93a3a0');
  const n = S.op.length;
  const w = Math.min(104, (AN - 40 - (n - 1) * 10) / n), h = w * 1.42;
  const x0 = (AN - (w * n + 10 * (n - 1))) / 2, y = 250;
  S.op.forEach((o, i) => {
    const x = x0 + (w + 10) * i;
    if (o.ido){ pintaRanura(x, y, w, h, true); return; }
    if      (o.t === 'comodin') pintaComodin(x, y, w, h, o.k, {});
    else if (o.t === 'carta')   pintaCarta(x, y, w, h, o.c, {});
    else                        pintaCons(x, y, w, h, o, {});
    zona('sobreOp', x, y, w, h, i);
  });
  const d = S.op.map(o => o.t === 'comodin' ? tt('comD', o.k)
                        : o.t === 'tarot'   ? tt('tarD', o.k)
                        : o.t === 'planeta' ? T('planeta', tt('manosN', o.k)) : '')
                 .filter(Boolean)[0];
  if (d) envuelve(d, AN / 2, y + h + 26, AN - 50, 10, '#93a3a0');
  pintaBoton(AN / 2 - 80, 520, 160, 44, T('saltarSobre'), '#93a3a0', false);
  zona('sobreSale', AN / 2 - 80, 520, 160, 44);
}

/* ============================================================
   LA PARTIDA
   ============================================================ */
function pintaJuega(){
  pintaFieltro();
  pintaHud();
  pintaComodines();
  pintaPuntos();
  pintaMesa();
  pintaConsumibles();
  if (!JU.anim){ pintaMano(); pintaBotones(); }
  pintaPie();
}

function pinta(){
  zonaLimpia();
  CX.clearRect(0, 0, AN, AL);
  switch (JU.modo){
    case 'ciega':  pintaCiega();  break;
    case 'puntua': pintaPuntua(); break;
    case 'tienda': pintaTienda(); break;
    case 'sobre':  pintaSobre();  break;
    case 'juega':  pintaJuega();  break;
    default:       pintaFieltro();
  }
  if (typeof tutoPinta === 'function') tutoPinta();
}

/* ============================================================
   EL DEDO
   ============================================================ */
function toca(px, py){
  if (typeof tutoToque === 'function' && tutoToque(px, py)) return;
  const z = zonaEn(px, py);
  if (!z) { COM_SEL = -1; pista(''); return; }
  son('ui');
  switch (z.id){
    case 'carta': {
      const i = z.dat, k = JU.sel.indexOf(i);
      if (k >= 0) JU.sel.splice(k, 1);
      else if (JU.sel.length < SEL_MAX) JU.sel.push(i);
      else { avisa(T('elegiCartas', SEL_MAX)); return; }
      son('elige');
      break;
    }
    case 'jugar':     accionTira();     break;
    case 'descartar': accionDescarta(); break;
    case 'orden':     ordena(ORDEN_MANO === 'rango' ? 'palo' : 'rango'); son('baraja'); break;
    case 'com':
      COM_SEL = COM_SEL === z.dat ? -1 : z.dat;
      pista(tt('comN', JU.com[z.dat]) + ' · ' + tt('comD', JU.com[z.dat]));
      break;
    case 'cons':      accionCons(z.dat); break;
    case 'ciegaVa':   JU.modo = 'juega'; pista(''); break;
    case 'aTienda':   cieganCierra(); COM_SEL = -1; break;
    case 'compra':
      if (!tiendaCompra(z.dat)) avisa(JU.dinero < JU.tienda.it[z.dat].pre ? T('sinPlata') : T('sinSitio'));
      else son('compra');
      break;
    case 'sobre':
      if (!sobreCompra(z.dat)) avisa(T('sinPlata'));
      else { JU.modo = 'sobre'; son('compra'); }
      break;
    case 'sobreOp':
      if (!sobreElige(z.dat)) avisa(T('sinSitio'));
      else { son('compra'); if (JU.sobre.hechas >= JU.sobre.elige){ JU.sobre = null; JU.modo = 'tienda'; } }
      break;
    case 'sobreSale': JU.sobre = null; JU.modo = 'tienda'; break;
    case 'reroll':    if (tiendaReroll()) son('baraja'); break;
    case 'vender': {
      const k = JU.com[COM_SEL];
      JU.dinero += Math.max(1, Math.floor((COM[k].pre || 4) / 2));
      JU.com.splice(COM_SEL, 1); COM_SEL = -1; son('plata');
      break;
    }
    case 'salirTienda': vaCiega(); break;
    case 'pausa':     pausaAbre(); break;
  }
}

function accionTira(){
  const cs = JU.sel.map(i => JU.mano[i]);
  const r = tira(cs);
  if (!r){ avisa(T('elegiCartas', SEL_MAX)); son('mal'); return; }
  animArranca(r, cs);
  son('carta');
}
function accionDescarta(){
  const cs = JU.sel.map(i => JU.mano[i]);
  if (!descarta(cs)){ son('mal'); return; }
  son('baraja');
}
/* Un consumible se usa con lo que este elegido: el tarot pide
   cartas y el planeta no, y `consUsa` ya sabe cual es cual. */
function accionCons(i){
  const C = JU.cons[i];
  const cs = JU.sel.map(k => JU.mano[k]);
  if (!consUsa(i, cs)){
    const T2 = C.t === 'tarot' ? TAROT[C.k] : null;
    avisa(T2 ? T('elegiCartas', T2.sel) : T('sinSitio'));
    son('mal');
    return;
  }
  son(C.t === 'planeta' ? 'sube' : 'compra');
  if (C.t === 'planeta') avisa(T('planeta', tt('manosN', C.k)));
  ordena();
}

/* --- pasar de la tienda a la ciega siguiente --- */
function vaCiega(){
  cieganNueva();
  JU.modo = 'ciega';
  COM_SEL = -1;
  if (JU.ante > 8){ JU.modo = 'fin'; finMuestra(true); }
}
