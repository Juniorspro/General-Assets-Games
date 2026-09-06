/* ══════════════════════ EL GIROSCOPIO Y LA SACUDIDA ══════════════════════
   Dos cosas distintas que salen del mismo aparato: cuanto esta INCLINADO el
   telefono (`deviceorientation`) y cuando lo SACUDEN (`devicemotion`). La
   primera es una posicion y la segunda un acontecimiento, y por eso se leen de
   dos eventos y no de uno.

   ── POR QUE NO SE USA LA CAMARA PARA ESTO ──
   Es la leccion de BARRIO: para saber para donde esta mirando el jugador, lo
   obvio seria detectar la cara. Y no hace falta — el telefono YA sabe como esta
   orientado, sin camara, sin modelo y sin un milisegundo de deteccion. La
   orientacion del aparato ES la postura del jugador, porque el aparato lo tiene
   en la mano.

   ── LAS CINCO COSAS QUE HAY QUE HACER BIEN, Y CADA UNA COSTO UNA VUELTA ──
   1. EL PERMISO DE iOS. Desde iOS 13, `deviceorientation` no dispara hasta que
      `DeviceOrientationEvent.requestPermission()` se llama DENTRO de un gesto
      del usuario. Llamado en el arranque, la promesa se rechaza y el juego se
      queda sin sensor sin decir por que.
   2. EL CERO ES LA POSTURA EN LA QUE SE EMPEZO. Nadie juega con el telefono
      perfectamente vertical: con un cero absoluto, el juego arranca inclinado.
   3. ZONA MUERTA. Una mano nunca esta quieta, y sin zona muerta el mundo
      tiembla despacio todo el tiempo. 1,6 grados, que es lo que se midio en
      BARRIO.
   4. LA VUELTA CORTA. `beta` y `gamma` dan la vuelta: cruzando de 179 a -179 la
      diferencia cruda son 358 grados y el mundo pega media vuelta.
   5. LA SACUDIDA SE MIDE EN EL CAMBIO Y NO EN LA MAGNITUD. La gravedad ya son
      9,8: mirando el modulo de la aceleracion, el telefono quieto parece estar
      sacudiendose siempre. Lo que distingue una sacudida es que el vector
      CAMBIE rapido. */

const GIRO = {
  estado: 'no',        /* no · pidiendo · lista · negado · sin · insegura */
  on: false,
  x: 0, y: 0,          /* la inclinacion, de -1 a 1, ya con cero y zona muerta */
  crudo: { b: 0, g: 0, a: 0 },
  cero: { b: 0, g: 0, a: 0 },
  hayCero: false,
  n: 0,                /* eventos recibidos: distingue «no hay sensor» de «no llego ninguno» */
  sac: 0,              /* fuerza de la ultima sacudida, decae */
  sacN: 0,
  sacPico: 0,
  _sacFrio: 0,
  _ult: null,
  /* ── LO QUE CADA JUEGO AJUSTA ──
     `rango` son los grados de inclinacion que valen 1: un laberinto quiere poco
     (se juega con muñeca) y una camara quiere mas. `recentra` es la constante de
     tiempo con la que el cero persigue la postura actual — un juego de mirar la
     quiere para que dejar el telefono torcido no te deje mirando al techo, y un
     laberinto NO la quiere, porque ahi el cero es el nivel del piso. */
  rango: 30,
  recentra: 0,
  zona: 1.6
};
const GIRO_SAC_UMB = 22;      /* m/s^2 de CAMBIO para que cuente como sacudida */
const GIRO_SAC_FRIO = 0.42;   /* segundos entre dos sacudidas */

/* la vuelta corta: la diferencia entre dos angulos, siempre en (-180, 180] */
function giroDelta(a, b){
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function giroEvento(e){
  if (e.beta == null && e.gamma == null) return;   /* el evento existe y viene vacio */
  GIRO.n++;
  GIRO.crudo.b = e.beta || 0;
  GIRO.crudo.g = e.gamma || 0;
  GIRO.crudo.a = e.alpha || 0;
  if (!GIRO.hayCero) giroCero();
  GIRO.on = true;
  giroCalcula();
}
function giroCero(){
  GIRO.cero.b = GIRO.crudo.b; GIRO.cero.g = GIRO.crudo.g; GIRO.cero.a = GIRO.crudo.a;
  GIRO.hayCero = true;
}
function giroCalcula(){
  /* en vertical, `gamma` es inclinar de costado y `beta` adelante y atras */
  const dg = giroDelta(GIRO.crudo.g, GIRO.cero.g);
  const db = giroDelta(GIRO.crudo.b, GIRO.cero.b);
  const z = GIRO.zona;
  const ap = (d) => {
    const s = Math.sign(d), m = Math.abs(d);
    if (m <= z) return 0;
    return Math.max(-1, Math.min(1, s*(m - z)/GIRO.rango));
  };
  GIRO.x = ap(dg);
  GIRO.y = ap(db);
}

/* ── LA SACUDIDA ──
   Se mira el CAMBIO del vector de aceleracion entre dos eventos. Y con
   `accelerationIncludingGravity`, que es la que existe en todos los aparatos —
   `acceleration` sin gravedad la informa solo una parte de ellos, y la
   diferencia entre dos lecturas ya le quita la gravedad, porque la gravedad no
   cambia. */
function giroMocion(e){
  const a = e.accelerationIncludingGravity || e.acceleration;
  if (!a || a.x == null) return;
  const p = GIRO._ult;
  GIRO._ult = { x: a.x, y: a.y, z: a.z };
  if (!p) return;
  const d = Math.hypot(a.x - p.x, a.y - p.y, a.z - p.z);
  GIRO.sacPico = Math.max(GIRO.sacPico, d);
  if (d > GIRO_SAC_UMB && GIRO._sacFrio <= 0){
    GIRO._sacFrio = GIRO_SAC_FRIO;
    giroSacudida(Math.min(1, (d - GIRO_SAC_UMB)/34 + 0.35));
  }
}
/* quien quiera enterarse se cuelga de acá: el juego pone `GIRO.alSacudir` */
function giroSacudida(k){
  GIRO.sac = Math.max(GIRO.sac, k);
  GIRO.sacN++;
  if (GIRO.alSacudir) GIRO.alSacudir(k);
}

function giroPaso(dt){
  if (GIRO._sacFrio > 0) GIRO._sacFrio = Math.max(0, GIRO._sacFrio - dt);
  if (GIRO.sac > 0) GIRO.sac = Math.max(0, GIRO.sac - dt*3.2);
  /* el recentrado va DESPACIO y solo cuando el juego lo pide: rapido, el mundo
     se endereza solo mientras uno lo esta inclinando y no se puede jugar */
  if (GIRO.recentra > 0 && GIRO.hayCero){
    const k = Math.min(1, dt/GIRO.recentra);
    GIRO.cero.b += giroDelta(GIRO.crudo.b, GIRO.cero.b)*k;
    GIRO.cero.g += giroDelta(GIRO.crudo.g, GIRO.cero.g)*k;
    giroCalcula();
  }
}

/* ── SE PIDE DENTRO DE UN GESTO, Y DEVUELVE SI QUEDO ANDANDO ──
   Y no bloquea: si el permiso se niega o el aparato no tiene sensor, el juego
   tiene que seguir siendo jugable con el dedo. Cada juego trae su respaldo. */
async function giroPide(){
  if (GIRO.estado === 'lista' || GIRO.estado === 'pidiendo') return GIRO.on;
  GIRO.estado = 'pidiendo';
  /* sin HTTPS los sensores no existen en varios navegadores, y ahi no hay
     permiso que negar: ni preguntan. Es la causa mas facil de confundir con un
     error del juego. */
  if (!window.isSecureContext && location.protocol !== 'file:'){
    GIRO.estado = 'insegura'; return false;
  }
  if (typeof DeviceOrientationEvent === 'undefined'){ GIRO.estado = 'sin'; return false; }
  const DOE = DeviceOrientationEvent, DME = window.DeviceMotionEvent;
  try {
    if (DOE && typeof DOE.requestPermission === 'function'){
      const r = await DOE.requestPermission();
      if (r !== 'granted'){ GIRO.estado = 'negado'; return false; }
    }
    if (DME && typeof DME.requestPermission === 'function'){
      try { await DME.requestPermission(); } catch(e){}
    }
  } catch(e){ GIRO.estado = 'negado'; return false; }
  addEventListener('deviceorientation', giroEvento, { passive: true });
  addEventListener('devicemotion', giroMocion, { passive: true });
  GIRO.estado = 'lista';
  /* ── Y SE COMPRUEBA QUE LLEGUE ALGO ──
     En una notebook `deviceorientation` se registra sin error y NUNCA dispara:
     el estado diria «lista» con el sensor muerto, y el juego esperaria para
     siempre una inclinacion que no va a llegar. A los 1,2 s, si no llego ni un
     evento, se declara sin sensor y entra el respaldo. */
  setTimeout(() => { if (GIRO.n === 0 && GIRO.estado === 'lista') GIRO.estado = 'sin'; }, 1200);
  return true;
}

function giroVer(){
  return { estado: GIRO.estado, on: GIRO.on, n: GIRO.n,
           x: +GIRO.x.toFixed(3), y: +GIRO.y.toFixed(3),
           crudo: [Math.round(GIRO.crudo.b), Math.round(GIRO.crudo.g)],
           cero: [Math.round(GIRO.cero.b), Math.round(GIRO.cero.g)],
           sac: +GIRO.sac.toFixed(2), sacN: GIRO.sacN,
           sacPico: +GIRO.sacPico.toFixed(1),
           rango: GIRO.rango, recentra: GIRO.recentra };
}
