
/* ══════════════════════════ LA PISTOLA ══════════════════════════
   Es el personaje y es un cuerpo rigido de cuatro numeros: posicion, velocidad,
   angulo y velocidad angular. No hay «suelo» ni «salto»: hay gravedad, rebote y
   retroceso, y todo lo que el jugador puede hacer es elegir CUANDO disparar.

   ── EL RETROCESO ES EL MOTOR, NO UN EFECTO ──
   Cada tiro empuja al reves del caño y le mete un tiron al giro. Eso es todo el
   control que hay: el juego consiste en gastar tiros para moverse y en que cada
   tiro que se gasta para moverse es un tiro que no mata a nadie. */
const P = { x: 0, y: 0.9, vx: 0, vy: 0, ang: 0, vang: 0,
            cd: 0, vivo: true, apoyada: false };
const BAL = [];        /* las balas del jugador y las de los ladrones */
const R_PIS = M.largo*0.46;

function pistolaPone(x, y){
  P.x = x; P.y = y; P.vx = 0; P.vy = 0;
  P.ang = 0.6; P.vang = 0; P.cd = 0; P.vivo = true; P.apoyada = false;
  BAL.length = 0;
}

/* ── EL CHOQUE VA CONTRA CAJAS ALINEADAS Y CON EL EJE DE MENOR PENETRACION ──
   Es la misma regla que en CASTILLO: con la normal sacada del centro a centro,
   una pistola medio metida en una losa se resuelve HACIA ADENTRO y la atraviesa.
   El eje por el que menos entro es el unico que no se equivoca. */
/* ── EL CHOQUE Y EL PASO TRABAJAN SOBRE UN CUERPO CUALQUIERA, NO SOBRE `P` ──
   Es lo que le permite al auto-jugador PROBAR un tiro antes de darlo: copia el
   estado, lo vuela ochenta centesimas y mira donde termina. Con la fisica atada
   a la pistola de verdad habria que escribir una segunda fisica para el bot, y
   entonces el bot estaria jugando otro juego. */
function chocaCuerpo(P){
  P.apoyada = false;
  for (const r of solidos()){
    const cx = cl(P.x, r.x, r.x + r.w), cy = cl(P.y, r.y, r.y + r.h);
    const dx = P.x - cx, dy = P.y - cy;
    const d2 = dx*dx + dy*dy;
    if (d2 > R_PIS*R_PIS) continue;
    let nx, ny;
    if (d2 > 1e-8){ const d = Math.sqrt(d2); nx = dx/d; ny = dy/d;
                    P.x = cx + nx*R_PIS; P.y = cy + ny*R_PIS; }
    else {
      /* el centro cayo DENTRO de la caja: la normal es degenerada y hay que
         sacarla del eje por el que menos hay que empujar */
      const iz = P.x - r.x, de = r.x + r.w - P.x;
      const ab = P.y - r.y, ar = r.y + r.h - P.y;
      const m = Math.min(iz, de, ab, ar);
      if (m === iz){ nx = -1; ny = 0; P.x = r.x - R_PIS; }
      else if (m === de){ nx = 1; ny = 0; P.x = r.x + r.w + R_PIS; }
      else if (m === ab){ nx = 0; ny = -1; P.y = r.y - R_PIS; }
      else { nx = 0; ny = 1; P.y = r.y + r.h + R_PIS; }
    }
    const vn = P.vx*nx + P.vy*ny;
    if (vn < 0){
      P.vx -= (1 + M.rebote)*vn*nx;
      P.vy -= (1 + M.rebote)*vn*ny;
      /* ── EL ROCE DEL GOLPE SE CONVIERTE EN GIRO ──
         Una pistola que rebota sin girar se lee a pelota. La componente
         TANGENCIAL del golpe es la que la hace voltear, que es exactamente lo
         que pasa con un objeto largo que cae de canto. */
      /* ── EL REBOTE YA NO LA HACE VOLTEAR ──
         Un objeto largo que cae de canto voltea, si; pero aca el angulo ES la
         punteria, asi que un rebote que lo mueve le esta sacando la mira de las
         manos al jugador justo cuando acaba de chocar. */
      P.vx *= 0.82; P.vy *= 0.82;
    }
    if (ny > 0.55) P.apoyada = true;
  }
}

function pasoCuerpo(P, dt){
  P.vy -= M.g*dt;
  P.x += P.vx*dt; P.y += P.vy*dt;
  chocaCuerpo(P);
  /* apoyada y quieta: se frena del todo, si no tiembla para siempre */
  if (P.apoyada && Math.abs(P.vy) < 0.5){
    P.vx *= Math.exp(-3.2*dt);
  }
  if (P.cd > 0) P.cd = Math.max(0, P.cd - dt);
}
function pasoPistola(dt){ pasoCuerpo(P, dt); }

/* el retroceso escrito una vez: lo usan el disparo de verdad y la prueba del
   auto-jugador, asi que no pueden predecir cosas distintas */
function aplicaRetro(c, ang){
  c.vx -= Math.cos(ang)*M.retro;
  c.vy -= Math.sin(ang)*M.retro;
}

function dispara(){
  if (P.cd > 0 || !P.vivo) return false;
  P.cd = M.cadencia;
  const dx = Math.cos(P.ang), dy = Math.sin(P.ang);
  BAL.push({ x: P.x + dx*M.boca, y: P.y + dy*M.boca,
             dx, dy, v: M.bala, t: 1.3, mia: true });
  /* el empujon y el tiron: los dos deterministas, para que el jugador pueda
     aprenderlos y para que el auto-jugador pueda preverlos */
  aplicaRetro(P, P.ang);
  return true;
}

/* ── LAS BALAS AVANZAN POR TRAMOS Y NO POR PASOS ──
   A 46 m/s y a 60 cuadros, una bala salta 77 centimetros por cuadro: contra el
   punto, atraviesa un ladron de 68 de ancho una vez de cada dos. Es el mismo
   defecto que ya costo una vuelta en BURBUJAS y otra en ARCO. */
function pasoBalas(dt, alGolpe){
  for (let i = BAL.length - 1; i >= 0; i--){
    /* ── LA LISTA PUEDE VACIARSE ADENTRO DEL PROPIO BUCLE ──
       `alGolpe('yo', …)` termina en `pierdeVida`, que llama a `pistolaPone`, que
       hace `BAL.length = 0`: el indice que quedaba pendiente ya no existe.
       Medido con el auto-jugador del azar, eso tiraba `Cannot read properties of
       undefined (reading 't')` y se llevaba la partida entera — y no es del bot:
       es el camino de perder una vida, que es el que un jugador recorre. */
    const b = BAL[i];
    if (!b) continue;
    b.t -= dt;
    const largo = b.v*dt;
    const h = rayo(b.x, b.y, b.dx, b.dy, largo, !b.mia);
    if (h){
      const ix = b.x + b.dx*h.t, iy = b.y + b.dy*h.t;
      if (h.tipo === 'ladron' && b.mia){ h.obj.vivo = false; alGolpe('ladron', ix, iy, h.obj); }
      else if (h.tipo === 'caja' && b.mia){ h.obj.viva = false; alGolpe('caja', ix, iy, h.obj); }
      else alGolpe('muro', ix, iy, null);
      BAL.splice(i, 1);
      continue;
    }
    b.x += b.dx*largo; b.y += b.dy*largo;
    /* la bala del ladron contra la pistola: circulo contra segmento */
    if (!b.mia && P.vivo){
      const ax = P.x - b.x, ay = P.y - b.y;
      const proy = cl(ax*b.dx + ay*b.dy, 0, largo);
      const ex = ax - b.dx*proy, ey = ay - b.dy*proy;
      if (ex*ex + ey*ey < (R_PIS + 0.11)*(R_PIS + 0.11)){
        alGolpe('yo', b.x, b.y, null);
        BAL.splice(i, 1); continue;
      }
    }
    if (b.t <= 0) BAL.splice(i, 1);
  }
}
