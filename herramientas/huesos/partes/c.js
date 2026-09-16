/* ══════════════════════════════════════════════════════════════════════════
   Lo mínimo: azar con semilla, matemática y el reloj
   ══════════════════════════════════════════════════════════════════════════ */

/* EL AZAR VA CON SEMILLA Y NO ES UN CAPRICHO: un mundo distinto en cada
   partida hace que «el claro de la izquierda» deje de querer decir algo, y
   —peor— hace que el validador apruebe un mapa que el jugador no va a ver. */
function semilla(s) {
  let a = s >>> 0;
  return function () {
    a += 0x6D2B79F5; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* un azar CLAVADO a una posición: la misma celda devuelve siempre lo mismo,
   sin gastar el generador compartido — que es lo que hace que agregar una
   mata no corra de sitio todas las casas, como pasó en LEMI */
function azarEn(x, z, k) {
  let h = Math.imul(((x | 0) + 0x9E3779B9) ^ ((z | 0) * 0x85EBCA6B), 0xC2B2AE35) ^ (k * 0x27D4EB2F);
  h = Math.imul(h ^ (h >>> 13), 0x1B873593);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const lim = (v, a, b) => v < a ? a : (v > b ? b : v);
const mez = (a, b, t) => a + (b - a) * t;
/* amortiguado INDEPENDIENTE DEL CUADRO: `a += (b-a)*k` a 30 y a 144 cuadros
   converge distinto, o sea que la cámara se siente otra en cada aparato */
const amort = (a, b, l, dt) => mez(a, b, 1 - Math.exp(-l * dt));
const suav = t => t * t * (3 - 2 * t);
/* la vuelta CORTA entre dos ángulos: sin esto, cruzar de +179 a -179 pega
   media vuelta y el personaje gira para el lado largo */
function angDif(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
function angAmort(a, b, l, dt) { return a + angDif(a, b) * (1 - Math.exp(-l * dt)); }

const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const largo2 = (x, z) => Math.sqrt(x * x + z * z);

/* ── DÓNDE EMPIEZA CADA ZONA ───────────────────────────────────────────────
   Una sola función, y la usan la siembra, el suelo, la niebla, el spawn de
   esqueletos y el HUD. Con la cuenta repartida, el HUD dice una zona y el
   suelo dibuja otra — y eso no falla, se ve mal.                            */
function zonaDe(x, z) {
  const d = largo2(x, z);
  for (let i = 0; i < ZONAS.length; i++) if (d < ZONAS[i].r) return i;
  return ZONAS.length - 1;
}
