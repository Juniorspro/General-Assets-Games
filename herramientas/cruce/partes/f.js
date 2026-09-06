
/* ══════════════════════ EL HUD Y LAS PANTALLAS ══════════════════════ */
const $ = (id) => document.getElementById(id);
const PANS = ['pIdioma', 'pMenu', 'pPieles', 'pAjustes', 'pPausa', 'pFin'];
let PANTALLA = 'pIdioma';
function pantalla(n){
  PANTALLA = n;
  for (const p of PANS) $(p).classList.toggle('on', p === n);
  document.body.classList.toggle('jugando', n === '');
  if (n === 'pMenu') camaArranca();
  camaAgacha(n === '' ? 0.6 : 0.9);
}
/* ── TODOS LOS TEXTOS SE VUELVEN A ESCRIBIR JUNTOS ──
   Cambiar de idioma con la tienda abierta tiene que cambiar la tienda, asi que
   `repinta` reescribe todo, incluidas las listas que se generan. */
function repinta(){
  $('mSub').textContent = TX('sub'); $('bJugar').textContent = TX('jugar'); $('bPieles').textContent = TX('pieles');
  $('bAjustes').textContent = TX('ajustes'); $('mPie').textContent = TX('pie');
  $('mSaldo').textContent = '● ' + fmtMon(PROG.monedas) + ' · ' + TX('record') + ' ' + PROG.record;
  $('kTit').textContent = TX('pieles'); $('kSub').textContent = TX('elegi'); $('kVolver').textContent = TX('volver');
  $('aTit').textContent = TX('ajustes'); $('aSub').textContent = TX('idioma') + ' · ' + TX('calidad'); $('aVolver').textContent = TX('volver');
  $('aMusL').textContent = TX('musica'); $('aFxL').textContent = TX('fx'); $('aBorrar').textContent = TX('borrar');
  $('pTit').textContent = TX('pausa'); $('pSub').textContent = TX('ayuda'); $('bSigo').textContent = TX('sigo'); $('bAbandona').textContent = TX('abandona');
  $('fOtra').textContent = TX('otra'); $('fPieles').textContent = TX('pieles'); $('fMenu').textContent = TX('menu');
  $('tren').textContent = TX('tren');
  $('aIdi').innerHTML = ''; for (const l of ['es', 'en', 'pt']){ const b = document.createElement('button'); b.className = 'bt' + (l === LANG ? ' sel' : ''); b.textContent = { es: 'Castellano', en: 'English', pt: 'Português' }[l]; b.onclick = () => { LANG = l; guardaProg(); repinta(); son('toque'); }; $('aIdi').appendChild(b); }
  $('aCal').innerHTML = ''; for (const c of ['baja', 'media', 'alta']){ const b = document.createElement('button'); b.className = 'bt' + (c === CALIDAD ? ' sel' : ''); b.textContent = TX(c); b.onclick = () => { CALIDAD = c; guardaProg(); medir(); repinta(); son('toque'); }; $('aCal').appendChild(b); }
  $('aMus').value = Math.round(VOL_MUS*100); $('aFx').value = Math.round(VOL_FX*100);
  pintaPieles();
  if (RUN && RUN.fase === 'fin') pintaFin();
}

/* ══════════ LA TIENDA ══════════ */
function pintaPieles(){
  $('kSaldo').textContent = '● ' + fmtMon(PROG.monedas);
  const G = $('gPiel'); G.innerHTML = '';
  for (const P of PIELES){
    const tiene = PROG.pieles.includes(P.id), sel = PROG.piel === P.id;
    const d = document.createElement('div'); d.className = 'piel' + (sel ? ' sel' : '') + (tiene ? '' : ' bloq');
    const c = document.createElement('canvas'); c.width = 96; c.height = 96; pintaFicha(P, c.getContext('2d'), 96, 96); d.appendChild(c);
    if (!tiene){ const k = document.createElement('div'); k.className = 'cand'; k.textContent = P.desb.pts != null ? '🔒' : '●'; d.appendChild(k); }
    const s = document.createElement('span');
    /* el rotulo bloqueado va corto —el numero y nada mas— porque la ficha mide
       ochenta pixeles y «LLEGÁ A 140» se corta en «LLEGÁ A 1…» */
    s.textContent = tiene ? TL(P.nom) : (P.desb.pts != null ? '▲ ' + P.desb.pts : '● ' + fmtMon(P.desb.mon));
    d.appendChild(s);
    d.onclick = () => {
      if (tiene){ eligePiel(P.id); son('toque'); armaCarpincho(); }
      else { const r = compraPiel(P.id); if (r === 'ok'){ eligePiel(P.id); son('compra'); armaCarpincho(); } else son('no'); }
      repinta();
    };
    G.appendChild(d);
  }
}

/* ══════════ EL HUD ══════════ */
let ULT_PTS = -1, AYUDA_T = 0;
function pintaHud(){
  const R = RUN; if (!R) return;
  if (R.filaMax !== ULT_PTS){ ULT_PTS = R.filaMax; $('pts').textContent = R.filaMax; }
  $('rec').textContent = TX('record') + ' ' + Math.max(PROG.record, R.filaMax);
  $('mon').textContent = '● ' + R.monedas;
  $('tren').classList.toggle('on', !!R.avisoTren);
  /* ── LA AYUDA APARECE Y SE VA ──
     Un cartel fijo en la pantalla de un juego que dura minutos deja de leerse a
     los diez segundos y a partir de ahi solo tapa. Sale al empezar y vuelve si
     el jugador se queda quieto, que es cuando de verdad no sabe que hacer. */
  const q = R.quieto;
  $('ayuda').textContent = R.t < 3.2 ? TX('ayuda') : (q > 2.6 ? TX('ayuda2') : '');
}
function destello(col, k){
  const f = $('flash'); f.style.setProperty('--fc', col); f.style.transition = 'none'; f.style.opacity = k;
  requestAnimationFrame(() => { f.style.transition = 'opacity .4s'; f.style.opacity = 0; });
}

/* ══════════ EL RESULTADO ══════════ */
function pintaFin(){
  const R = RUN;
  $('fL').textContent = R.nuevoRec ? TX('nuevoRec') : TX('filas');
  $('fPts').textContent = R.filaMax;
  $('fComo').textContent = TX('m_' + (R.fin === 'carancho' ? 'carancho' : R.fin === 'deriva' ? 'deriva' : R.fin)) || '';
  $('fTx').textContent = TX('ganaste') + ' ● ' + fmtMon(R.ganado) + ' · ' + TX('mon') + ' ' + fmtMon(PROG.monedas) + ' · ' + TX('record') + ' ' + PROG.record;
  $('fNuevo').innerHTML = '';
  for (const id of R.nuevas || []){ const P = PIELES.find(p => p.id === id); const s = document.createElement('span'); s.className = 'nuevo'; s.textContent = TX('nuevo') + ' ' + TX('piel') + ': ' + TL(P.nom); $('fNuevo').appendChild(s); }
}
