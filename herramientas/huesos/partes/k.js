/* ══════════════════════════════════════════════════════════════════════════
   EL DAÑO, LA XP Y LAS ZONAS — una sola cuenta, y la usan todos
   ══════════════════════════════════════════════════════════════════════════
   El golpe del jugador se resuelve en UNA función. Con la cuenta escrita en
   el sitio del jugador y otra vez en el del auto-jugador, el auto-jugador
   estaría probando un juego que no existe.                                */

let ZONA_ACT = 0, PART = 'menu', FIN_T = 0, GANO = false;
let SANGRE = 0, SACUDE = 0, AVISO = '', AVISO_T = 0;

/* ¿este esqueleto entra en el arco del golpe? */
function enArco(e, x, z, rumbo, alc, arco) {
  const R = alc + ESQ[e.cl].radio;
  const dx = e.x - x, dz = e.z - z, d2 = dx * dx + dz * dz;
  if (d2 > R * R) return false;
  const d = Math.sqrt(d2);
  if (d < 0.05) return true;
  const c = (dx * Math.sin(rumbo) + dz * Math.cos(rumbo)) / d;
  return c > Math.cos(arco * 0.5);
}

function jugResuelveGolpe() {
  const g = J_COMBO[JUG.golpe];
  const mult = 1 + (JUG.nivel - 1) * NIV_DANO;
  let n = 0;
  for (const e of ESQS) {
    if (!e.vive || e.est === 'muere') continue;
    if (!enArco(e, JUG.x, JUG.z, JUG.rumbo, g.alc, g.arco)) continue;
    esqRecibe(e, Math.round(g.dano * mult), e.x - JUG.x, e.z - JUG.z, g.empuje);
    n++;
    /* SÓLO EL REMATE BARRE. Los dos primeros son tajos y le dan a UNO: si
       los tres pegaran a todos, una turba de seis se limpia machacando el
       botón y las clases dejan de significar algo. */
    if (JUG.golpe < J_COMBO.length - 1) break;
  }
  if (n) { SACUDE = Math.max(SACUDE, JUG.golpe === 2 ? 0.30 : 0.16); son('impacto'); }
  return n;
}

const TALLY = { golpes: 0, dano: 0, porCl: {}, esquivados: 0 };
function jugRecibe(dano, dx, dz, empuje, cl) {
  if (JUG.muerto) return;
  /* LOS CUADROS DE INVENCIBILIDAD DEL ESQUIVE SON LA MITAD DEL JUEGO: sin
     ellos esquivar es "correr un poco" y el aviso de carga no sirve de nada */
  if (JUG.esqT > 0 && (J_ESQ_T - JUG.esqT) < J_ESQ_INV) { TALLY.esquivados++; son('roza'); return; }
  if (JUG.invT > 0) return;
  JUG.vida -= dano;
  TALLY.golpes++; TALLY.dano += dano; TALLY.porCl[cl || '?'] = (TALLY.porCl[cl || '?'] || 0) + 1;
  JUG.invT = 0.42; JUG.danoT = 0.32;
  const l = Math.hypot(JUG.x - dx, JUG.z - dz) || 1;
  JUG.vx += (JUG.x - dx) / l * empuje;
  JUG.vz += (JUG.z - dz) / l * empuje;
  SANGRE = Math.min(1, SANGRE + 0.55);
  SACUDE = Math.max(SACUDE, 0.34);
  son('dano');
  if (JUG.vida <= 0) {
    JUG.vida = 0; JUG.muerto = true; JUG.muerteT = 0; JUG.golpe = -1; JUG.esqT = 0;
    son('muere'); PART = 'fin'; GANO = false; FIN_T = 0;
  }
}

function jugGanaXp(n) {
  JUG.xp += n;
  while (JUG.xp >= JUG.xpSig) {
    JUG.xp -= JUG.xpSig; JUG.nivel++;
    JUG.xpSig = XP_NIVEL(JUG.nivel);
    JUG.vidaMax += NIV_VIDA;
    /* SUBIR DE NIVEL CURA. Sin eso, la recompensa de matar a diez llega justo
       cuando no queda vida para usarla y la progresión se siente un castigo */
    JUG.vida = Math.min(JUG.vidaMax, JUG.vida + NIV_VIDA * 2.2);
    avisa(T('subiste', JUG.nivel));
    son('nivel');
  }
}

function avisa(txt, seg) { AVISO = txt; AVISO_T = seg || 2.6; }

/* ── LAS ZONAS ─────────────────────────────────────────────────────────────
   Una zona se abre cuando la anterior quedó limpia. Es lo único que
   convierte "matar esqueletos" en una partida con principio y final.      */
function zonasPaso(dt) {
  const quedan = esqVivos(ZONA_ACT);
  if (quedan === 0 && ZONA_ACT < ZONAS.length - 1) {
    ZONA_ACT++;
    /* ── LIMPIAR UNA ZONA ES EL PUNTO DE CONTROL ───────────────────────────
       Antes abrir la siguiente era PURO COSTO: te la ganabas con la vida por
       la mitad y entrabas a pelear contra cosas del doble de vida. Medido con
       el bot en tres semillas: doce bajas, nivel 2, muerto en la ceniza, las
       tres veces — el juego no se podía terminar. Curar entero y regalar un
       nivel es lo que convierte la puerta en un respiro y no en un embudo. */
    JUG.vida = JUG.vidaMax;
    jugGanaXp(JUG.xpSig - JUG.xp);
    avisa(T('abre') + ' · ' + T('z' + ZONAS[ZONA_ACT].id), 3.4);
    son('zona');
  } else if (quedan === 0 && ZONA_ACT === ZONAS.length - 1 && PART === 'juego') {
    PART = 'fin'; GANO = true; FIN_T = 0; son('gana');
  }
}

/* la niebla, el cielo y la luz salen de la zona EN LA QUE ESTÁ EL JUGADOR y
   no de la que le toca matar: lo que hay que ver es dónde estás parado */
const _CN = new THREE.Color(), _CC = new THREE.Color(), _CL = new THREE.Color();
let ZONA_VIS = 0;
function zonaMezcla(dt) {
  const zi = zonaDe(JUG.x, JUG.z), Z = ZONAS[zi];
  if (!esc.fog) { esc.fog = new THREE.FogExp2(Z.niebla, Z.nieblaD); esc.background = new THREE.Color(Z.cielo); ZONA_VIS = zi; }
  const k = 1 - Math.exp(-1.9 * dt);
  esc.fog.color.lerp(_CN.setHex(Z.niebla), k);
  esc.fog.density = mez(esc.fog.density, Z.nieblaD * (CALIDAD === 'baja' ? 1.22 : 1), k);
  esc.background.lerp(_CC.setHex(Z.cielo), k);
  solLuz.color.lerp(_CL.setHex(Z.luz), k);
  solLuz.intensity = mez(solLuz.intensity, Z.sol, k);
  ambLuz.intensity = mez(ambLuz.intensity, Z.amb, k);
  hemLuz.intensity = mez(hemLuz.intensity, Z.amb * 1.62, k);
  ZONA_VIS = zi;
}
