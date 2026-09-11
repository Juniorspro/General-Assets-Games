
/* ══════════════════════════ LA PARTIDA ══════════════════════════ */
/* `meta` arranca en 120 —el largo que se le PIDE al generador— y `empieza()` la
   reescribe con el largo que de verdad salió. */
const JUEGO = { d: 0, vel: 1.05, t: 0, semilla: 1, meta: 120, vivo: false, causa: '' };
const META_PEDIDA = 120;
/* 1,05 m/s es un paso de alguien que lleva algo y no quiere volcarlo. Con 1,6
   —que fue el primer valor— el pasillo pasa volando, las esquinas llegan antes
   de que el bol se estabilice y todo el juego es corregir. */

function empieza(){
  JUEGO.semilla = (Date.now() ^ (Math.random()*1e9)) >>> 0;
  const info = armaCamino(JUEGO.semilla, META_PEDIDA);
  /* ── LA META SALE DEL PASILLO CONSTRUIDO ──
     Era la constante 120 y el pasillo puede salir más corto (el generador no se
     puede cruzar consigo mismo, así que a veces se acorrala). Con dos números
     distintos para la misma cosa, el jugador caminaba más allá de la puerta
     hasta un final que no existe. Uno solo, y no pueden discrepar. */
  JUEGO.meta = Math.round(LARGO_TOTAL);
  armaMapa();
  armaCatalogo();
  armaAgenda();
  reiniciaBol();
  armaTabla();
  JUEGO.d = 0; JUEGO.t = 0; JUEGO.vivo = true; JUEGO.causa = '';
  SUSTOS_AGUANTADOS = 0;
  MODO = 'juega';
  for (const p of document.querySelectorAll('.pan')) p.classList.remove('on');
  $('hud').classList.add('on');
  $('neg').classList.remove('on');
  aviso(TX('aEmpieza'));
  return info;
}

function termina(gano){
  JUEGO.vivo = false;
  MODO = 'fin';
  const m = Math.round(JUEGO.d);
  try {
    const r = +(localStorage.getItem('pulso_record') || 0);
    if (m > r) localStorage.setItem('pulso_record', String(m));
  } catch(e){}
  $('finTit').textContent = TX(gano ? 'finGano' : 'finPerdio');
  $('finSub').textContent = gano ? TX('finGanoS', m, SUSTOS_AGUANTADOS)
                                 : TX('finPerdioS', Math.max(0, Math.round(JUEGO.meta - JUEGO.d)));
  $('hud').classList.remove('on');
  $('fin').classList.add('on');
  if (!gano) son('golpe', 1);
}

let _avT = 0;
function aviso(txt, ms){
  $('av').textContent = txt;
  $('av').classList.add('on');
  _avT = (ms || 2200) / 1000;
}

function pasoJuego(dt){
  if (!JUEGO.vivo) return;
  JUEGO.t += dt;
  JUEGO.d += JUEGO.vel * dt;

  /* los sustos que toca disparar */
  for (const a of AGENDA){
    if (!a.hecho && JUEGO.d >= a.d){ a.hecho = true; disparaSusto(a.s); }
  }
  const sac = pasoSusto(dt);
  LUZ.paso(dt);

  /* ── EL PASO TAMBIÉN SACUDE, y es lo que hace que caminar cueste ──
     Sin esto el bol sólo se mueve cuando el jugador inclina, y quedarse quieto
     sería gratis. Cada pisada mete un golpecito vertical que se traduce en un
     empujón chico y aleatorio: es el ruido de fondo contra el que hay que
     mantener el pulso. */
  const fase = JUEGO.d * Math.PI / 0.72;
  const pisada = Math.sin(fase);
  const sacP = { x: Math.cos(fase*1.7) * 0.30, z: pisada * 0.22 };
  const total = sac ? { x: sac.x + sacP.x, z: sac.z + sacP.z } : sacP;
  pasoBol(dt, total);

  if (BOL.cayo && !JUEGO.causa){ JUEGO.causa = 'bol'; termina(false); return; }
  if (BOL.agua <= 0.02 && !JUEGO.causa){ JUEGO.causa = 'agua'; termina(false); return; }
  if (JUEGO.d >= JUEGO.meta){ termina(true); return; }

  /* el aviso de que se está yendo: sale del bol, no de un temporizador */
  const r = Math.hypot(BOL.x, BOL.z) / TABLA.r;
  if (r > 0.72 && _avT <= 0) aviso(TX(r > 0.88 ? 'aCasi' : 'aTiembla'), 900);
}

function ponCamara(){
  /* `puntoCamino` y no `enCamino`: la primera es la curva con las esquinas
     redondeadas y la segunda la quebrada exacta. El rumbo sale de la derivada
     de la curva, así que hay que caminar por la MISMA curva — con la quebrada,
     mirada y avance vuelven a discrepar en cada vuelta. */
  const p = puntoCamino(JUEGO.d);
  const yaw = rumboEn(JUEGO.d);
  /* el cabeceo del paso, chico: es una persona que camina despacio con las dos
     manos ocupadas, no alguien corriendo */
  const fase = JUEGO.d * Math.PI / 0.72;
  cam.position.set(p.x + Math.cos(fase)*0.018, 1.58 + Math.abs(Math.sin(fase))*0.016, p.z);
  cam.rotation.set(0, yaw, Math.cos(fase)*0.006);
}

function pintaHud(dt){
  $('dist').textContent = Math.round(JUEGO.d) + ' / ' + JUEGO.meta + ' m';
  const b = $('aguaB');
  b.style.width = (BOL.agua*100).toFixed(1) + '%';
  b.classList.toggle('poco', BOL.agua < 0.34);
  if (_avT > 0){ _avT -= dt; if (_avT <= 0) $('av').classList.remove('on'); }
}
