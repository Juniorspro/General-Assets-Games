
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
              vivo: true, giro: 0, apretado: false, carga: 0, mira: -1 };

function jugPone(c, x){
  c.x = x; c.y = 0; c.vy = 0; c.grav = 1; c.modo = 'cubo';
  c.piso = true; c.vivo = true; c.giro = 0; c.apretado = false;
  c.carga = 0; c.mira = -1;
  /* ── LOS ORBES USADOS VIVEN EN EL CUERPO Y NO EN EL MUNDO ──
     Un orbe se gasta por INTENTO, y el bot corre docenas de intentos imaginarios
     por cuadro: con la marca en `MUNDO.orbes[i].usado`, un rollout que engancha
     el orbe siguiente lo deja gastado para el cuerpo de verdad, y el jugador
     llega a un orbe que ya nadie puede tocar. Medido: el bot moria en el segundo
     orbe de la cadena del final por esto y no por la geometria. La marca es del
     cuerpo, `copia()` se la lleva, y el mundo solo se entera de lo que gasta el
     jugador —que es lo que el dibujo necesita para apagarlo. */
  c.uso = new Uint8Array(MUNDO.orbes.length);
}

/* la caja del jugador: un poco mas chica que su celda, que es lo que hace que
   pasar raspando un pico se sienta a pasar raspando y no a morir de casualidad */
function caja(c){
  const h = JUG_LADO;
  return { x: c.x - h/2, y: c.y, w: h, h: h };
}
const pisa = (A, B) => A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y;

/* ── LA CARA DE ENFRENTE, QUE ES LO QUE LA ARANA NECESITA ──
   Devuelve la `y` a la que quedaria el cuerpo apoyado en la superficie opuesta, o
   `null` si no hay ninguna. Se busca la MAS CERCANA, que es la que la arana
   alcanza: con la mas lejana, un tramo con dos techos teletransportaria por
   encima del de al lado. */
function caraDeEnfrente(c){
  const h = JUG_LADO;
  let mejor = null;
  for (const r of cerca(MUNDO.iSol, c.x)){
    if (r.x > c.x + h/2 || r.x + r.w < c.x - h/2) continue;
    if (c.grav > 0){
      /* apoyado en el piso: la cara de enfrente es la de abajo de algo de arriba */
      if (r.y < c.y + h - 0.02) continue;
      const d = r.y - h;
      if (mejor == null || d < mejor) mejor = d;
    } else {
      if (r.y + r.h > c.y + 0.02) continue;
      const d = r.y + r.h;
      if (mejor == null || d > mejor) mejor = d;
    }
  }
  return mejor;
}

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
  /* ── EL FLANCO SE CALCULA ANTES DE PISAR `apretado` ──
     Cuatro de los ocho modos se manejan con TOQUES y no con MANTENER —la bola,
     el ovni, la arana y el robot— asi que hace falta saber si el dedo acaba de
     bajar. Y va aca adentro, no en el manejador del dedo: asi el bot entra por
     el mismo camino y su decision es la misma decision. */
  const flanco = !!apretado && !c.apretado;
  c.apretado = !!apretado;
  const M = c.modo;

  if (M === 'nave'){
    /* la nave: mantener acelera hacia arriba y soltar hacia abajo. Lo que se
       controla es la CURVA, no la velocidad — con velocidad directa se lee a
       ascensor y deja de haber inercia que administrar. */
    c.vy += (apretado ? med.naveA : -med.naveA)*dt*c.grav;
    c.vy = cl(c.vy, -med.naveMax, med.naveMax);
    c.giro = cl(c.vy/med.naveMax, -1, 1)*0.5;

  } else if (M === 'columpio'){
    /* ── EL COLUMPIO ES LA GRAVEDAD QUE SE DA VUELTA, NO UN MOTOR ──
       Es la diferencia con la nave y es la que hace que se sienta otro modo: la
       nave EMPUJA mientras se mantiene, y el columpio invierte la gravedad, asi
       que el arco es simetrico y no hay techo de velocidad que lo aplaste.
       Igual lleva tope, porque sin el, un pasillo largo lo pone a caer mas rapido
       de lo que el pasillo mide. */
    const dir = apretado ? 1 : -1;
    c.vy += med.colA*dt*c.grav*dir;
    c.vy = cl(c.vy, -med.colMax, med.colMax);
    c.giro = cl(c.vy/med.colMax, -1, 1)*0.42;
    c.mira = dir;

  } else if (M === 'onda'){
    /* ── LA ONDA VA A CUARENTA Y CINCO GRADOS EXACTOS, Y ESO SALE DE UNA CUENTA ──
       No hay aceleracion ni inercia: la velocidad vertical es la MISMA que la
       horizontal, asi que la trayectoria es una diagonal perfecta. Y como la x
       sale del reloj —`v` bloques por segundo— la vertical es `v` y nada mas.
       Por eso este modo es el mas dificil del genero: no perdona un cuadro. */
    c.vy = (apretado ? 1 : -1)*med.v*c.grav;
    c.giro = (apretado ? 1 : -1)*c.grav*0.72;

  } else if (M === 'bola'){
    /* la bola no salta: cada toque DA VUELTA la gravedad, y solo apoyada. En el
       aire el toque no hace nada, que es lo que obliga a tocar en el momento. */
    if (flanco && c.piso){
      c.grav = -c.grav; c.piso = false; c.vy = 0;
      if (c === JUG){ son('salta'); golpeaSq(-2.6); destella('#7ad9ff', 0.22); }
    }
    c.vy -= med.g*dt*c.grav;
    /* la bola RUEDA: el giro sale del avance y no del tiempo en el aire */
    c.giro -= med.v*dt*0.55*c.grav;

  } else if (M === 'ovni'){
    /* el ovni salta EN EL AIRE, tantas veces como se toque. Lo que lo acota es
       que el impulso es chico —dos bloques de apice contra los 2,4 del cubo— asi
       que subir cuesta varios toques y cada uno se paga. */
    if (flanco){
      c.vy = med.impOvni*c.grav; c.piso = false;
      if (c === JUG){ son('salta'); golpeaSq(-2.8); destella('#c9a7ff', 0.20); }
    }
    c.vy -= med.g*dt*c.grav;
    c.giro = cl(c.vy/med.impOvni, -1, 1)*0.16;

  } else if (M === 'robot'){
    /* ── EL ROBOT CARGA EL SALTO MIENTRAS SE MANTIENE ──
       El impulso arranca en el minimo y sube mientras el dedo siga abajo, hasta
       `robotT` segundos. De ahi sale un apice variable —de 1,54 a 3,52 bloques—
       y con eso el modo pide algo que ningun otro pide: MEDIR cuanto tiempo se
       aprieta. Se implementa poniendo la velocidad, no sumando fuerza: sumando,
       el apice depende del cuadro en que se suelte y no del tiempo apretado. */
    if (flanco && c.piso){
      c.piso = false; c.carga = 0; c.vy = med.robotMin*c.grav;
      if (c === JUG){ son('salta'); golpeaSq(-2.4); }
    }
    if (apretado && c.carga != null && c.carga < med.robotT && c.vy*c.grav > 0){
      c.carga += dt;
      const k = cl(c.carga/med.robotT, 0, 1);
      c.vy = (med.robotMin + (med.robotMax - med.robotMin)*k)*c.grav;
    }
    c.vy -= med.g*dt*c.grav;
    if (!c.piso) c.giro += med.v*dt*0.20*c.grav;
    else c.giro = 0;

  } else if (M === 'arana'){
    /* ── LA ARANA NO SALTA: SE TELETRANSPORTA A LA OTRA CARA ──
       Y eso no se puede escribir como un impulso: hay que BUSCAR la superficie
       de enfrente, porque si no hay ninguna el toque no puede hacer nada. Con un
       impulso, un toque sin techo mandaria la arana al vacio. */
    if (flanco){
      const d = caraDeEnfrente(c);
      if (d != null){
        c.y = d; c.grav = -c.grav; c.vy = 0; c.piso = true;
        if (c === JUG){ son('portal'); golpeaSq(2.2); sacude(0.18);
                        destella('#ff7ae0', 0.26); }
      }
    }
    c.vy -= med.g*dt*c.grav;
    c.giro = 0;

  } else {
    /* ── EL CUBO: MANTENER APRETADO SALTA EN CADENA, Y VA ACA Y NO EN EL DEDO ──
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
  /* ── LOS PADS SON GEOMETRIA Y LOS ORBES SON UNA DECISION ──
     El pad lanza al pisarlo, se quiera o no; el orbe hay que APRETARLO estando
     encima. Es la diferencia del genero y hay que respetarla, porque es lo que
     convierte un orbe en una prueba de tiempo y un pad en una consecuencia. */
  for (const p of MUNDO.pads){
    if (Math.abs(p.x + 0.5 - c.x) > 0.75) continue;
    if (Math.abs(c.y - p.y) > 0.55) continue;
    const k = PAD_K[p.t] || 1;
    if (p.t === 'azul'){
      /* el pad azul da vuelta la gravedad y empuja hacia el otro lado */
      c.grav = -c.grav; c.vy = med.imp*0.86*c.grav;
    } else c.vy = med.impPad*k*c.grav;
    c.piso = false;
    if (c === JUG){ son('pad'); golpeaSq(-4.7*Math.min(1.2, k)); sacude(0.40);
                    destella(PAD_COL[p.t] || '#ffd447', 0.42); }
  }
  /* ── LOS OCHO ORBES DE GEOMETRY DASH ──
     amarillo salta medio, rosa poco, rojo mucho, azul da vuelta la gravedad,
     verde salta Y la da vuelta, negro clava hacia abajo, arana pega a la cara de
     enfrente y el de guion empuja. Cada uno es una linea, y estan todos en la
     MISMA lista porque lo que los distingue es el tipo y no el camino. */
  for (let oi = 0; oi < MUNDO.orbes.length; oi++){
    const o = MUNDO.orbes[oi];
    if (!apretado || (c.uso && c.uso[oi])) continue;
    if (Math.abs(o.x - c.x) > 0.95 || Math.abs(o.y - (c.y + 0.43)) > 0.95) continue;
    const t = o.t || 'amar';
    if (t === 'azul'){ c.grav = -c.grav; c.vy = med.imp*0.62*c.grav; }
    else if (t === 'verde'){ c.grav = -c.grav; c.vy = med.imp*c.grav; }
    else if (t === 'negro'){ c.vy = -med.imp*1.15*c.grav; }
    else if (t === 'arana'){
      const d = caraDeEnfrente(c);
      if (d == null) continue;                 /* sin cara de enfrente no sirve */
      c.y = d; c.grav = -c.grav; c.vy = 0; c.piso = true;
    }
    else c.vy = med.imp*(ORBE_K[t] || 1)*c.grav;
    c.piso = false;
    if (c.uso) c.uso[oi] = 1;
    if (c === JUG){
      o.usado = true;
      son(t === 'negro' ? 'pad' : 'salta');
      golpeaSq(t === 'negro' ? 3.4 : -3.7*(ORBE_K[t] || 1));
      destella(ORBE_COL[t] || '#ffd447', 0.30);
      if (t === 'azul' || t === 'verde' || t === 'arana') sacude(0.20);
    }
  }
  for (const p of MUNDO.portales){
    if (Math.abs(p.x - c.x) > 0.55) continue;
    let cambio = false;
    if (p.t === 'grav'){ if (c.grav > 0){ c.grav = -1; c.vy = 0; cambio = true; } }
    else if (p.t === 'norm'){ if (c.grav < 0){ c.grav = 1; c.vy = 0; cambio = true; } }
    else if (MODOS[p.t]){
      if (c.modo !== p.t){
        c.modo = p.t; c.carga = 0; c.giro = 0; cambio = true;
        /* ── AL CAMBIAR DE MODO LA VELOCIDAD SE ACOMODA AL MODO NUEVO ──
           La onda va a 45 grados exactos y la nave tiene tope: entrando con la
           velocidad de una caida de cubo, el primer cuadro del tramo nuevo saldria
           de la trayectoria antes de que el jugador toque nada. */
        if (p.t === 'onda' || p.t === 'nave' || p.t === 'columpio') c.vy = 0;
      }
    }
    /* ── UN CAMBIO DE MODO SE ANUNCIA CON UN TIRON DE CAMARA ──
       Es lo unico que dice, sin texto, que las reglas acaban de cambiar. */
    if (cambio && c === JUG){
      son('portal'); acerca(0.09); sacude(0.34);
      destella(MODO_COL[p.t] || '#5ad9ff', 0.5);
    }
  }
}

/* ── SALTAR ES UNA SOLA FUNCION, Y LA LLAMAN EL DEDO Y EL BOT ──
   Con dos caminos, el dia que el salto cambie el bot estaria midiendo otro
   juego. Y en el cubo solo se puede saltar DESDE EL PISO, que es la regla del
   genero: mantener apretado salta en cadena porque el toque queda pedido. */
function intentaSalto(c, med){
  if (c.modo !== 'cubo') return false;
  if (!c.piso) return false;
  c.vy = med.imp*c.grav; c.piso = false;
  if (c === JUG){ son('salta'); golpeaSq(-3.3); }
  return true;
}
