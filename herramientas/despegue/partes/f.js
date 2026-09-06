
/* ══════════════════════ EL HUD Y LAS PANTALLAS ══════════════════════ */
const $ = (id) => document.getElementById(id);
const PANS = ['pIdioma', 'pMenu', 'pTaller', 'pEstilos', 'pAjustes', 'pPausa', 'pFin'];
let PANTALLA = 'pIdioma';
function pantalla(n){
  PANTALLA = n;
  for (const p of PANS) $(p).classList.toggle('on', p === n);
  document.body.classList.toggle('jugando', n === '' );
  if (n === 'pMenu') camaArranca();
  if (n === 'pMenu' || n === 'pTaller' || n === 'pEstilos' || n === 'pAjustes' || n === 'pFin') camaAgacha(0.9);
  if (n === '') camaAgacha(0.55);
}

/* ── TODOS LOS TEXTOS SALEN DE LA TABLA Y SE VUELVEN A PINTAR JUNTOS ──
   Cambiar de idioma con el taller abierto tiene que cambiar el taller: por eso
   `repinta` vuelve a escribir todo, incluidas las listas que se generan. */
function repinta(){
  $('mSub').textContent = TX('sub'); $('bLanzar').textContent = TX('lanzar'); $('bTaller').textContent = TX('taller');
  $('bEstilos').textContent = TX('estilos'); $('bAjustes').textContent = TX('ajustes'); $('mPie').textContent = TX('pie');
  $('mSaldo').textContent = '● ' + fmtMon(PROG.monedas) + ' · ' + TX('record') + ' ' + altTexto(PROG.record);
  $('tTit').textContent = TX('taller'); $('tSub').textContent = TX('elegi'); $('tVolver').textContent = TX('volver');
  $('tabMej').textContent = TX('mejoras'); $('tabRaf').textContent = TX('rafagas');
  $('eTit').textContent = TX('estilos'); $('eSub').textContent = TX('pintura'); $('eVolver').textContent = TX('volver');
  $('aTit').textContent = TX('ajustes'); $('aSub').textContent = TX('idioma') + ' · ' + TX('calidad'); $('aVolver').textContent = TX('volver');
  $('aMusL').textContent = TX('musica'); $('aFxL').textContent = TX('fx'); $('aBorrar').textContent = TX('borrar');
  $('pTit').textContent = TX('pausa'); $('pSub').textContent = TX('ayudaPad'); $('bSigo').textContent = TX('sigo'); $('bAbandona').textContent = TX('abandona');
  $('fOtra').textContent = TX('otra'); $('fTaller').textContent = TX('taller'); $('fMenu').textContent = TX('menu');
  $('combL').textContent = TX('comb');
  $('aIdi').innerHTML = ''; for (const l of ['es', 'en', 'pt']){ const b = document.createElement('button'); b.className = 'bt' + (l === LANG ? ' sel' : ''); b.textContent = { es: 'Castellano', en: 'English', pt: 'Português' }[l]; b.onclick = () => { LANG = l; guardaProg(); repinta(); son('toque'); }; $('aIdi').appendChild(b); }
  $('aCal').innerHTML = ''; for (const c of ['baja', 'media', 'alta']){ const b = document.createElement('button'); b.className = 'bt' + (c === CALIDAD ? ' sel' : ''); b.textContent = TX(c); b.onclick = () => { CALIDAD = c; guardaProg(); medir(); repinta(); son('toque'); }; $('aCal').appendChild(b); }
  $('aMus').value = Math.round(VOL_MUS*100); $('aFx').value = Math.round(VOL_FX*100);
  pintaTaller(); pintaEstilos(); pintaRafBoton();
  if (RUN && RUN.fase === 'fin') pintaFin();
}
function altTexto(m){ const a = fmtAlt(m); return a.n + ' ' + a.u; }

/* ══════════ EL TALLER ══════════ */
let TAB = 'mej';
function pintaTaller(){
  $('tSaldo').textContent = '● ' + fmtMon(PROG.monedas);
  $('tabMej').classList.toggle('sel', TAB === 'mej'); $('tabRaf').classList.toggle('sel', TAB === 'raf');
  const L = $('lMej'); L.innerHTML = '';
  if (TAB === 'mej'){
    for (const M of MEJORAS){
      const n = PROG.niv[M.id] | 0, tope = n >= NIVEL_TOPE, p = tope ? 0 : precioMejora(M.id, n);
      const d = document.createElement('div'); d.className = 'mej';
      d.innerHTML = `<div class="ic">${M.ic}</div><div class="cu"><div class="n">${TL(M.nom)} <span style="opacity:.55;font-weight:600">${n}/${NIVEL_TOPE}</span></div><div class="d">${TL(M.des)}</div><div class="pt">${Array.from({ length: NIVEL_TOPE }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div></div>`;
      const b = document.createElement('button'); b.className = 'bt' + (tope ? '' : (PROG.monedas >= p ? ' p' : ''));
      b.textContent = tope ? TX('tope') : '● ' + fmtMon(p); if (tope || PROG.monedas < p) b.disabled = true;
      b.onclick = () => { if (compraMejora(M.id) === 'ok'){ son('compra'); armaCohete(); } else son('no'); repinta(); };
      d.appendChild(b); L.appendChild(d);
    }
  } else {
    for (const R of RAFAGAS){
      const n = PROG.raf[R.id] | 0, bloq = PROG.capaMax < R.capa, tope = n >= RAF_TOPE, p = tope ? 0 : precioRafaga(R.id, n);
      const eq = PROG.rafEq === R.id;
      const d = document.createElement('div'); d.className = 'mej'; if (bloq) d.style.opacity = 0.55;
      const que = R.tipo === 'dv' ? `+${Math.round(rafagaValor(R, Math.max(1, n)))} m/s` : `×${rafagaValor(R, Math.max(1, n)).toFixed(1)} · ${R.dur} s`;
      const cargas = rafagaCargas(R, Math.max(1, n));
      const min = R.hMin ? ` · ${TX('rafMin')} ${altTexto(R.hMin)}` : '';
      d.innerHTML = `<div class="ic" style="background:${R.col}33">${R.ic}</div><div class="cu"><div class="n">${TL(R.nom)} <span style="opacity:.55;font-weight:600">${n}/${RAF_TOPE}</span></div><div class="d">${bloq ? TX('bloq') + ' ' + TL(CAPAS[R.capa].nom) : que + ' · ×' + cargas + min}</div><div class="pt">${Array.from({ length: RAF_TOPE }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div></div>`;
      const b = document.createElement('button');
      if (bloq){ b.className = 'bt'; b.textContent = TX('rafBloq'); b.disabled = true; }
      else if (n > 0 && !eq){ b.className = 'bt eq'; b.textContent = TX('equipar'); b.onclick = () => { equipaRafaga(R.id); son('toque'); repinta(); }; }
      else if (tope){ b.className = 'bt eq'; b.textContent = TX('equipada'); b.disabled = true; }
      else { b.className = 'bt' + (PROG.monedas >= p ? ' p' : ''); b.textContent = (n ? TX('mejorar') + ' ' : '') + '● ' + fmtMon(p); if (PROG.monedas < p) b.disabled = true;
             b.onclick = () => { if (compraRafaga(R.id) === 'ok'){ equipaRafaga(R.id); son('compra'); } else son('no'); repinta(); }; }
      d.appendChild(b);
      if (eq && !tope && n > 0){ const e2 = document.createElement('div'); e2.style.cssText = 'font:800 9px/1 system-ui;color:#8ef0c4;writing-mode:vertical-rl;letter-spacing:.1em'; e2.textContent = TX('equipada'); d.appendChild(e2); }
      L.appendChild(d);
    }
  }
}

/* ══════════ LOS ESTILOS ══════════
   ── LA FICHA ES UN COHETE, NO UNA MUESTRA DE TELA ──
   La textura sola en un cuadrado es un pedazo de pared con una ventanilla. Se
   recorta con la silueta del cohete —cuerpo, nariz y aletas— y la textura se
   pinta adentro: asi la ficha dice como va a quedar el cohete y no de que color
   es la pintura. */
function pintaFicha(E, x, w, h){
  x.fillStyle = '#0d1220'; x.fillRect(0, 0, w, h);
  const tex = document.createElement('canvas'); tex.width = 64; tex.height = 192; pintaEstilo(E, tex.getContext('2d'), 64, 192);
  const cx = w/2, r = w*0.17, top = h*0.12, base = h*0.86;
  x.save(); x.beginPath(); x.rect(cx - r, top + h*0.2, 2*r, base - top - h*0.2); x.clip();
  x.drawImage(tex, cx - r, top + h*0.2, 2*r, base - top - h*0.2); x.restore();
  x.fillStyle = E.punta; x.beginPath(); x.moveTo(cx - r, top + h*0.2); x.quadraticCurveTo(cx - r*0.6, top, cx, top); x.quadraticCurveTo(cx + r*0.6, top, cx + r, top + h*0.2); x.fill();
  x.fillStyle = E.aleta;
  x.beginPath(); x.moveTo(cx - r, base - h*0.22); x.lineTo(cx - r*2.1, base); x.lineTo(cx - r, base); x.fill();
  x.beginPath(); x.moveTo(cx + r, base - h*0.22); x.lineTo(cx + r*2.1, base); x.lineTo(cx + r, base); x.fill();
  x.fillStyle = '#3a3f48'; x.fillRect(cx - r*0.55, base, r*1.1, h*0.05);
  const g = x.createLinearGradient(0, base + h*0.05, 0, h); g.addColorStop(0, 'rgba(255,200,80,.9)'); g.addColorStop(1, 'rgba(255,90,30,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(cx - r*0.45, base + h*0.05); x.lineTo(cx, h); x.lineTo(cx + r*0.45, base + h*0.05); x.fill();
  /* un brillo de costado, que es lo que hace que se lea a cilindro */
  const b = x.createLinearGradient(cx - r, 0, cx + r, 0); b.addColorStop(0, 'rgba(0,0,0,.35)'); b.addColorStop(0.35, 'rgba(255,255,255,.18)'); b.addColorStop(1, 'rgba(0,0,0,.4)');
  x.save(); x.beginPath(); x.rect(cx - r, top, 2*r, base - top); x.clip(); x.fillStyle = b; x.fillRect(cx - r, top, 2*r, base - top); x.restore();
}
function pintaEstilos(){
  $('eSaldo').textContent = '● ' + fmtMon(PROG.monedas);
  const G = $('gEst'); G.innerHTML = '';
  for (const E of ESTILOS){
    const tiene = PROG.estilos.includes(E.id), sel = PROG.estilo === E.id;
    const d = document.createElement('div'); d.className = 'est' + (sel ? ' sel' : '') + (tiene ? '' : ' bloq');
    const c = document.createElement('canvas'); c.width = 96; c.height = 96; pintaFicha(E, c.getContext('2d'), 96, 96); d.appendChild(c);
    if (!tiene){ const k = document.createElement('div'); k.className = 'cand'; k.textContent = E.desb.capa != null ? '🔒' : '●'; d.appendChild(k); }
    const s = document.createElement('span');
    s.textContent = tiene ? TL(E.nom) : (E.desb.capa != null ? TX('capa') + ' ' + E.desb.capa : '● ' + fmtMon(E.desb.monedas));
    d.appendChild(s);
    d.onclick = () => {
      if (tiene){ eligeEstilo(E.id); son('toque'); armaCohete(); }
      else { const r = compraEstilo(E.id); if (r === 'ok'){ eligeEstilo(E.id); son('compra'); armaCohete(); } else son('no'); }
      repinta();
    };
    G.appendChild(d);
  }
}

/* ══════════ EL HUD ══════════ */
let CAPA_T = 0, ULT_ALT = -1;
function pintaHud(){
  const R = RUN; if (!R) return;
  const a = fmtAlt(Math.max(0, H_DIB));
  $('alt').firstChild.nodeValue = a.n; $('altU').textContent = a.u;
  $('vel').textContent = fmtVel(R.v) + (R.h >= H_ESPACIO ? ' · ×' + Math.round(multTiempo(R.h)).toLocaleString('de-DE') : '');
  $('combI').style.height = (100*cl(R.comb/R.P.comb, 0, 1)).toFixed(1) + '%';
  $('mon').textContent = '● ' + R.monedas;
  $('ayuda').textContent = R.fase === 'cuenta' ? TX('ayudaPad') : (R.sinComb ? TX('sinComb') : (R.t < 6 ? TX('ayudaVuelo') : ''));
  if (R.fase === 'cuenta'){
    const i = Math.min(3, Math.floor(R.tc/0.8)); const g = $('grande');
    if (g.dataset.i !== String(i)){ g.dataset.i = i; g.textContent = TX('cuenta')[i]; g.classList.add('on'); son(i === 3 ? 'ya' : 'cuenta'); }
  } else if ($('grande').dataset.i){ $('grande').dataset.i = ''; $('grande').classList.remove('on'); }
  if (R.planea && !$('grande').dataset.max){ $('grande').dataset.max = '1'; $('grande').textContent = TX('maximo'); $('grande').classList.add('on'); }
  $('tiempo').textContent = TX('tiempo') + ' ' + R.t.toFixed(1) + ' s'; $('tiempo').classList.toggle('hay', R.fase === 'vuelo');
  pintaRafBoton();
}
function pintaRafBoton(){
  const R = RUN, b = $('bRaf');
  if (!R || !R.raf){ b.classList.remove('hay'); return; }
  b.classList.add('hay');
  $('rafN').textContent = TL(R.raf.nom); $('rafC').textContent = '×' + R.cargas;
  const puede = R.cargas > 0 && R.h >= R.raf.hMin && R.boostT <= 0 && R.fase === 'vuelo';
  b.classList.toggle('vacio', !puede);
  b.style.background = `radial-gradient(circle at 40% 35%, ${R.raf.col}, #3a2a1e 75%)`;
}
function muestraCapa(c){
  const C = CAPAS[c];
  $('capaN').textContent = TL(C.nom); $('capaS').textContent = TX('capa') + ' ' + c + '/' + (CAPAS.length - 1) + ' · ' + altTexto(C.h);
  $('capa').classList.add('on'); CAPA_T = 2.6;
}
function hudPaso(dt){
  if (CAPA_T > 0){ CAPA_T -= dt; if (CAPA_T <= 0) $('capa').classList.remove('on'); }
}
function destello(col, k){
  const f = $('flash'); f.style.setProperty('--fc', col); f.style.transition = 'none'; f.style.opacity = k;
  requestAnimationFrame(() => { f.style.transition = 'opacity .45s'; f.style.opacity = 0; });
}

/* ══════════ EL RESULTADO ══════════ */
function pintaFin(){
  const R = RUN;
  $('fL').textContent = R.fin === 'explota' ? TX('explota') : (R.fin === 'fin' ? TX('fin') : TX('llegaste'));
  const a = fmtAlt(R.hmax); $('fAlt').innerHTML = a.n + ' <small>' + a.u + '</small>';
  const C = CAPAS[R.capaFin];
  $('fCapa').textContent = TL(C.nom) + (R.nuevoRec ? ' · ' + TX('nuevoRec') : '');
  $('fTx').textContent = (R.fin === 'fin' ? TX('finT') + ' ' : '') + TX('ganaste') + ' ● ' + fmtMon(R.ganado) + ' · ' + TX('mon') + ' ' + fmtMon(PROG.monedas) + ' · ' + TX('tiempo') + ' ' + R.t.toFixed(1) + ' s';
  $('fNuevo').innerHTML = '';
  for (const id of R.nuevos || []){ const E = ESTILOS.find(e => e.id === id); const s = document.createElement('span'); s.className = 'nuevo'; s.textContent = TX('nuevo') + ' ' + TX('estilo') + ': ' + TL(E.nom); $('fNuevo').appendChild(s); }
}
