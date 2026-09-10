/* ══════════════════════════════════════════════════════════════════════════
   I · EL TUTORIAL

   SE ENTRA ACA Y NO AL MENU LA PRIMERA VEZ. El unico verbo de este juego es
   arrastrar el dedo hacia atras, y nada en la pantalla dice que se pueda
   hacer eso: un cartel en el menu se saltea, y lo que se saltea es
   exactamente lo que despues no se entiende.

   CUATRO PASOS Y CADA UNO ESPERA A QUE SE HAGA LA COSA. No se pasan leyendo:
   el 2 no aparece hasta que el arrastre paso de la mitad, el 3 hasta que la
   flecha salio, y el 4 hasta que fallo la primera. Es la misma regla que ya
   ordeno los tutoriales de ECO, RECREO, DUNA y MEKO.

   Y EL RIVAL NO TIRA. Un tutorial en el que se puede perder ensena miedo y
   no la mecanica: el jugador sale corriendo antes de entender que el viento
   empuja. Esta parado ahi porque hace falta un blanco, y nada mas.

   EL MUNDO ESTA ESCRITO A MANO Y NO GENERADO, y es la unica pieza del juego
   que lo esta: cada paso nombra una cosa concreta —el viento, la distancia—
   y una geometria que cambia cada vez no se puede nombrar. Llano y sin un
   solo obstaculo, porque lo que se ensena es el arco y no el terreno.     */

const TUT_VIENTO = 2.4;   /* se ve y se oye, y no alcanza para hacer imposible el tiro */

function mundoTuto() {
  const M = nuevoMundo(NX, NY, NZ);
  const B = BIOMAS.pradera;
  M.n = -1; M.paleta = B.pal; M.bio = 'pradera'; M.forma = 'llano';
  M.viento = TUT_VIENTO; M.rival = '—'; M.prec = 0;
  const h = [];
  for (let x = 0; x < NX; x++) h.push(6);
  M.h = h;
  for (let x = 0; x < NX; x++) for (let y = 0; y < 6; y++) {
    const t = (y === 5) ? B.sup : B.base;
    for (let z = 0; z < NZ; z++) pon(M, x, y, z, t);
  }
  M.pisoA = altura(M, XA);
  M.pisoB = altura(M, XB);
  return M;
}

function cargaTuto() {
  JU.n = -1;
  $('carga').classList.remove('ido');
  $('cBarra').style.width = '18%';
  verPanel(null);
  setTimeout(() => {
    arqSuelta();
    const M = mundoTuto();
    $('cBarra').style.width = '78%';
    arranca(M, true);
    PROG.visto = 1; guardaProg();
    $('cBarra').style.width = '100%';
    setTimeout(() => $('carga').classList.add('ido'), 60);
  }, 40);
}

/* el paso avanza con lo que el jugador HIZO, no con un reloj. Y el orden no
   importa: si alguien tira fuerte de una, los pasos 1 y 2 ya estan hechos. */
function tutAvanza(ev, k) {
  if (!JU.tuto || JU.fin) return;
  const p = JU.paso;
  if (ev === 'arrastra') {
    if (p < 1) { JU.paso = 1; HUD_ANT = ''; }
    if (p < 2 && k > 0.5) { JU.paso = 2; HUD_ANT = ''; }
  } else if (ev === 'tira') {
    if (p < 3) { JU.paso = 3; HUD_ANT = ''; }
  } else if (ev === 'falla') {
    if (p < 4) { JU.paso = 4; HUD_ANT = ''; }
  }
}

/* auditoria: un tutorial que no se puede terminar es peor que ninguno, y la
   unica forma de saberlo es resolverlo con el mismo resolvedor que los doce
   duelos. Comprueba ademas que el viento del tutorial NO lo haga imposible
   —barriendo con y sin viento— y que la boca del arco nazca al aire.     */
function auditaTuto() {
  const M = mundoTuto();
  const a = resuelve(M, 0, M.viento);
  const sinV = resuelve(M, 0, 0);
  const O = bocaDe(M, 0);
  const libre = en(M, Math.floor(O.x), Math.floor(O.y), ZC) === VACIO;
  return { ok: !!a && !!sinV && libre, v: a ? +a.v.toFixed(2) : null,
           ang: a ? +(Math.atan2(a.vy, a.vx) * 180 / Math.PI).toFixed(1) : null,
           libre, viento: M.viento, pisoA: M.pisoA, pisoB: M.pisoB };
}
