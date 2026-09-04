
/* ══════════════════════ EL JUGADOR Y LOS MODOS ══════════════════════
   ── LA X NO SE INTEGRA: SALE DEL RELOJ DE LA MUSICA ──
   `x = tiempoMusical · 4 bloques`. Integrando la x con la fisica, una tanda de
   cuadros perdidos correria el nivel respecto del tema y el juego dejaria de
   estar en tiempo — que es el unico defecto que este genero no se puede permitir.
   Lo que si se integra es la Y, que es lo que el jugador controla.

   ── Y ES UN CUERPO CUALQUIERA, NO `J` ──
   Asi el auto-jugador puede PROBAR un salto antes de darlo: copia el estado, lo
   vuela un tiempo y mira si sobrevive. Con la fisica atada al jugador de verdad
   habria que escribir una segunda fisica para el bot, y entonces el bot estaria
   jugando otro juego. */
const JUG = { x: 0, y: 0, vy: 0, grav: 1, modo: 'cubo', piso: false,
              vivo: true, giro: 0, apretado: false };

function jugPone(c, x){
  c.x = x; c.y = 0; c.vy = 0; c.grav = 1; c.modo = 'cubo';
  c.piso = true; c.vivo = true; c.giro = 0; c.apretado = false;
}

/* la caja del jugador: un poco mas chica que su celda, que es lo que hace que
   pasar raspando un pico se sienta a pasar raspando y no a morir de casualidad */
function caja(c){
  const h = JUG_LADO;
  return { x: c.x - h/2, y: c.y, w: h, h: h };
}
const pisa = (A, B) => A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y;

/* ── EL CHOQUE RESUELVE PRIMERO LA Y Y DESPUES PREGUNTA POR LA X ──
   Es la regla del genero: por arriba se apoya, de costado se muere. Con la X
   resuelta primero, el cubo trepa las paredes y el juego se vuelve trivial. */
function chocaCuerpo(c, med, dt){
  /* ── CAERSE DEL MUNDO MATA, Y ESO NO ERA OBVIO ──
     Medido: sin plano de muerte, caer en un hueco no mata a nadie — la y se va a
     −7753 y el jugador SIGUE avanzando por debajo del nivel hasta la meta. O sea
     que el bot que apretaba al azar terminaba los tres temas al 100 %, que es la
     firma exacta de un juego en el que nada importa. Con el plano, el hueco pasa
     a ser el unico obstaculo que castiga apretar sin parar. */
  if (c.y < -3 || c.y > 20){ c.vivo = false; return; }
  c.piso = false;
  const b = caja(c);
  for (const r of cerca(MUNDO.iSol, c.x)){
    if (!pisa(b, r)) continue;
    const dArriba = (r.y + r.h) - b.y;          /* cuanto entro por abajo */
    const dAbajo = (b.y + b.h) - r.y;           /* cuanto entro por arriba */
    const dIzq = (b.x + b.w) - r.x;
    const dDer = (r.x + r.w) - b.x;
    const vert = Math.min(dArriba, dAbajo), hor = Math.min(dIzq, dDer);
    /* ── EL EJE DE MENOR PENETRACION ES EL UNICO QUE NO SE EQUIVOCA ──
       Es la misma regla que en CASTILLO y en PISTOLA. Con la normal sacada de
       centro a centro, un cubo medio metido en una losa se resuelve HACIA ADENTRO. */
    if (vert <= hor + 0.02){
      /* ── EL GOLPE DEL ATERRIZAJE SE MIDE ANTES DE PONER LA VELOCIDAD EN CERO ──
         Y sale del propio `vy`, asi que un salto largo aplasta mas que un
         escaloncito. Solo para el jugador de verdad: `chocaCuerpo` la corren
         tambien las copias del bot, y si el bot sacudiera la camara los efectos
         irian por un camino que el dedo no recorre. */
      const golpe = Math.abs(c.vy);
      if (dArriba < dAbajo){
        /* apoyado sobre la cara de arriba del solido */
        if (c.vy <= 0.001 || c.grav > 0){ c.y = r.y + r.h; c.vy = 0; if (c.grav > 0) c.piso = true; }
        else { c.y = r.y + r.h; c.vy = 0; }
      } else {
        c.y = r.y - b.h; c.vy = 0; if (c.grav < 0) c.piso = true;
      }
      if (c === JUG && c.piso && golpe > 4){
        golpeaSq(Math.min(4.2, golpe*0.16));
        sacude(Math.min(0.30, golpe*0.010));
      }
      b.y = c.y;
    } else {
      /* entro de costado: en este genero eso es morirse */
      c.vivo = false; return;
    }
  }
  for (const r of cerca(MUNDO.iMat, c.x)) if (pisa(caja(c), r)){ c.vivo = false; return; }
}

/* ── UN PASO DE FISICA ──
   Paso fijo: un telefono a 30 y una notebook a 144 tienen que jugar el mismo
   juego, si no el salto mide distinto y los patrones dejan de servir. */
function pasoCuerpo(c, med, dt, apretado){
  c.apretado = !!apretado;
  if (c.modo === 'nave'){
    /* la nave: mantener acelera hacia arriba y soltar hacia abajo. Lo que se
       controla es la CURVA, no la velocidad — con velocidad directa se lee a
       ascensor y deja de haber inercia que administrar. */
    c.vy += (apretado ? med.naveA : -med.naveA)*dt*c.grav;
    c.vy = cl(c.vy, -med.naveMax, med.naveMax);
    c.giro = cl(c.vy/med.naveMax, -1, 1)*0.5;
  } else {
    /* ── MANTENER APRETADO SALTA EN CADENA, Y VA ACA Y NO EN EL DEDO ──
       Es la regla del genero, y ponerlo dentro del paso de fisica es lo que hace
       que el jugador y el bot usen EL MISMO camino. Estaba solo en el manejador
       del toque, o sea que `avanza()` no saltaba nunca: medido, el bot que
       apretaba en cada paso moria en el mismo pico y en la misma x (39,8) que el
       que no apretaba nunca — la firma exacta de una entrada que no hace nada. */
    if (apretado) intentaSalto(c, med);
    c.vy -= med.g*dt*c.grav;
    /* el cubo gira mientras esta en el aire y se endereza al caer: es lo unico
       que dice, sin texto, que el cubo no controla nada mientras vuela */
    if (!c.piso) c.giro += med.v*dt*0.42*c.grav;
    else c.giro = Math.round(c.giro/(Math.PI/2))*(Math.PI/2);
  }
  c.y += c.vy*dt;
  chocaCuerpo(c, med, dt);
  if (!c.vivo) return;

  /* ── EL PAD LANZA SIN QUE HAYA QUE TOCAR; EL ORBE HAY QUE TOCARLO ──
     Es la diferencia del genero y hay que respetarla: el pad es geometria, el
     orbe es una decision. */
  const b = caja(c);
  for (const p of MUNDO.pads){
    if (Math.abs(p.x + 0.5 - c.x) < 0.75 && Math.abs(c.y - p.y) < 0.5 && c.grav > 0){
      c.vy = med.impPad*c.grav; c.piso = false;
      if (c === JUG){ son('pad'); golpeaSq(-4.7); sacude(0.40); destella('#ffd447', 0.42); }
    }
  }
  for (const o of MUNDO.orbes){
    if (o.usado || !apretado) continue;
    if (Math.abs(o.x - c.x) < 0.95 && Math.abs(o.y - (c.y + 0.43)) < 0.95){
      c.vy = med.imp*c.grav; o.usado = true;
      if (c === JUG){ son('salta'); golpeaSq(-3.7); destella('#ffd447', 0.30); }
    }
  }
  for (const p of MUNDO.portales){
    if (Math.abs(p.x - c.x) > 0.55) continue;
    let cambio = false;
    if (p.t === 'grav' && c.grav > 0){ c.grav = -1; c.vy = 0; cambio = true; }
    else if (p.t === 'norm' && c.grav < 0){ c.grav = 1; c.vy = 0; cambio = true; }
    else if (p.t === 'nave' && c.modo !== 'nave'){ c.modo = 'nave'; cambio = true; }
    else if (p.t === 'cubo' && c.modo !== 'cubo'){ c.modo = 'cubo'; cambio = true; }
    /* ── UN CAMBIO DE MODO SE ANUNCIA CON UN TIRON DE CAMARA ──
       Es lo unico que dice, sin texto, que las reglas acaban de cambiar. */
    if (cambio && c === JUG){
      son('portal'); acerca(0.09); sacude(0.34);
      destella(p.t === 'nave' ? '#ff6ad5' : p.t === 'grav' ? '#ffd447' : '#5ad9ff', 0.5);
    }
  }
}

/* ── SALTAR ES UNA SOLA FUNCION, Y LA LLAMAN EL DEDO Y EL BOT ──
   Con dos caminos, el dia que el salto cambie el bot estaria midiendo otro
   juego. Y en el cubo solo se puede saltar DESDE EL PISO, que es la regla del
   genero: mantener apretado salta en cadena porque el toque queda pedido. */
function intentaSalto(c, med){
  if (c.modo === 'nave') return false;
  if (!c.piso) return false;
  c.vy = med.imp*c.grav; c.piso = false;
  if (c === JUG){ son('salta'); golpeaSq(-3.3); }
  return true;
}
