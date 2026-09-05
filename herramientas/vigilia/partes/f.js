
/* ══════════════════════ EL HUD Y LAS PANTALLAS ══════════════════════ */
const $ = (i) => document.getElementById(i);
let LANG = 'es', PANTALLA = '';
const PROG = { mejor: 0, partidas: 0 };
const CLAVE = 'vigilia_v1';

function tl(o){ return typeof o === 'string' ? o : (o[LANG] || o.es); }
function TT(k){ return (TXT[LANG] || TXT.es)[k] || (TXT.es[k] || k); }

function cargaProg(){
  try { const s = localStorage.getItem(CLAVE); if (!s) return false;
    const d = JSON.parse(s); Object.assign(PROG, d.p || {});
    LANG = d.lang || LANG; CALIDAD = d.cal || CALIDAD;
    VOL_MUS = d.vm != null ? d.vm : VOL_MUS; VOL_FX = d.vf != null ? d.vf : VOL_FX;
    return true; } catch(e){ return false; }
}
function guardaProg(){
  try { localStorage.setItem(CLAVE, JSON.stringify({ p: PROG, lang: LANG, cal: CALIDAD, vm: VOL_MUS, vf: VOL_FX })); } catch(e){}
}
function pantalla(n){
  PANTALLA = n;
  for (const p of document.querySelectorAll('.pan')) p.classList.toggle('on', p.id === n);
  document.body.classList.toggle('juega', n === '');
}
function repinta(){
  $('mSub').textContent = TT('sub');
  $('bJugar').textContent = TT('jugar');
  $('bAjustes').textContent = TT('ajustes');
  $('mPie').textContent = TT('pie');
  $('mSensor').textContent = GIRO.ok ? TT('conGiro') : (GIRO.pedido ? TT('sinGiro') : TT('permiso'));
  $('aTit').textContent = TT('ajustes');
  $('aMusL').textContent = TT('musica'); $('aFxL').textContent = TT('efectos');
  $('aBorrar').textContent = TT('borrar'); $('aVolver').textContent = TT('volver');
  $('pTit').textContent = TT('pausa'); $('pSeguir').textContent = TT('seguir'); $('pMenuB').textContent = TT('menu');
  $('fOtra').textContent = TT('otra'); $('fMenu').textContent = TT('menu');
  for (const b of document.querySelectorAll('#pAjustes .bt[data-cal]')){
    b.textContent = TT(b.dataset.cal); b.classList.toggle('sel', b.dataset.cal === CALIDAD);
  }
  for (const b of document.querySelectorAll('#pAjustes .bt[data-lang]')) b.classList.toggle('sel', b.dataset.lang === LANG);
  $('aMus').value = Math.round(VOL_MUS*100); $('aFx').value = Math.round(VOL_FX*100);
}
/* ── LA BARRA DE AGUA ES EL MARCADOR ──
   No hay puntaje: lo unico que importa es cuanta agua queda y cuanto falta.
   Dos barras y el nombre del cuarto, y nada mas — un HUD cargado en un juego a
   oscuras es lo unico que se ve. */
let ULT_AGUA = -1, ULT_T = -1, ULT_CUARTO = -1;
function pintaHud(){
  const R = RUN; if (!R) return;
  const a = Math.round(cl(R.h/AGUA_H0, 0, 1)*100);
  if (a !== ULT_AGUA){ $('bAgua').firstElementChild.style.width = a + '%'; ULT_AGUA = a; }
  const t = Math.round(cl(R.t/DUR, 0, 1)*100);
  if (t !== ULT_T){ $('bTiempo').firstElementChild.style.width = t + '%'; ULT_T = t; }
  if (R.cuarto !== ULT_CUARTO){
    ULT_CUARTO = R.cuarto;
    const id = MUNDO.cuartos[R.cuarto].def.id;
    $('rot').textContent = (NOM_CUARTO[LANG] || NOM_CUARTO.es)[id] || id;
  }
}
let AVISO_T = 0;
function aviso(txt, seg){ $('aviso').textContent = txt; $('aviso').style.opacity = '1'; AVISO_T = seg || 2.4; }
function avisoPaso(dt){ if (AVISO_T > 0){ AVISO_T -= dt; if (AVISO_T <= 0) $('aviso').style.opacity = '0'; } }
function pintaFin(){
  const R = RUN;
  const gano = R.fin === 'gana';
  $('fPor').textContent = gano ? TT('ganaste') : (R.fin === 'cayo' ? TT('cayo') : TT('perdiste'));
  $('fNum').textContent = gano ? '3:00' : (Math.floor(R.t/60) + ':' + String(Math.floor(R.t%60)).padStart(2, '0'));
  const id = MUNDO.cuartos[R.cuarto].def.id;
  $('fDet').textContent = gano ? (R.dados + ' ' + TT('sustos'))
    : TT('cuarto') + ' ' + ((NOM_CUARTO[LANG] || NOM_CUARTO.es)[id] || id);
  const m = Math.floor(PROG.mejor/60) + ':' + String(Math.floor(PROG.mejor%60)).padStart(2, '0');
  $('fMejor').textContent = TT('mejor') + ' ' + m + ' · ' + TT('de') + ' 3:00';
}
