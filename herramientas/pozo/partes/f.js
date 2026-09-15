/* ============================================================
   f.js — EL JUEGO. Fisica, combate, salas y pisos.
   Todo lo que decide algo pasa por aca; e.js solo dibuja lo que
   este archivo deja escrito en JU.
   ============================================================ */

/* La entrada del jugador. La escribe h.js (dedo o teclado) y la escribe
   el auto-jugador: LOS DOS POR EL MISMO SITIO. Con dos caminos, el bot
   estaria jugando otro juego y que gane no probaria nada. */
const ENT = {x:0, y:0, fuego:false, esq:false, usar:false};

/* el auto-jugador */
const BOT = {on:false, modo:'honesto', t:0, dir:0, trab:0, ux:0, uy:0, barr:true};
/* LA VENTANA DE LA ESQUIVA DEL BOT, y cuantos rumbos prueba. 0,55 s es lo que
   tarda en cruzar el pasillo peligroso caminando; 16 rumbos son 22,5 grados,
   la mitad de lo que mide un cuerpo a distancia de pelea. */
const BOT_VENT = .55;   /* cuanto adelante mira el bot una bala */
const BOT_DIRS = 16;    /* rumbos que prueba el bot contra un abanico */
/* registro de golpes recibidos: piso, clase, corazones, vida que quedo */
const DANO_LOG = [];
/* y lo que se curo: la otra mitad de la economia de un piso */
const CURA_LOG = [];
const VIDA_LOG = [];   /* con cuanta vida se ENTRA a cada piso */
let BALA_D = -1;       /* cuanto viajo la bala que esta pegando (-1 = no es bala) */
const BALA_N = {sale:0, pega:0};  /* tasa de acierto: dice si el problema es el enemigo o el que esquiva */
/* COFRES: cuantos HABIA en el piso y cuantos se ABRIERON. Con una sola columna
   no se distingue "no lo encuentra" de "lo encuentra y lo pierde", y esas dos
   cosas se arreglan al reves una de la otra. */
const COF_LOG = [];

let MEJ_OPC = [];          // las tres mejoras que se ofrecen al bajar

/* ---------- utilidades ---------- */
const angDif = (a,b) => { let d = (a-b) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; };
const hip = (x,y) => Math.sqrt(x*x + y*y);

/* ---------- que celda frena ----------
   La boca de una puerta es celda LIBRE en s.m (la abre el generador),
   asi que lo que la traba mientras la sala no esta limpia vive aca.
   Es la misma cuenta que dibuja las barras: si fueran dos, el jugador
   veria una reja y la atravesaria. */
function enBoca(s, cx, cy){
  for (const k in s.puertas){
    const p = PUERTA_C[k];
    if (k === 'n' || k === 's'){ if (cy === p.y && Math.abs(cx - p.x) <= 1) return k; }
    else                       { if (cx === p.x && Math.abs(cy - p.y) <= 1) return k; }
  }
  return null;
}
function bloq(s, cx, cy){
  if (cx < 0 || cy < 0 || cx >= SALA_W || cy >= SALA_H) return true;
  if (s.m[cy*SALA_W + cx]) return true;
  if (!s.limpia && enBoca(s, cx, cy)) return true;
  return false;
}

/* empuje fuera de los muros: punto mas cercano de la celda contra el
   circulo. Empujar por la normal conserva la componente tangencial,
   o sea que deslizarse por una pared sale gratis. */
function corrige(o, r, s){
  for (let it = 0; it < 2; it++){
    const c0x = Math.max(0, Math.floor((o.x-r)/CELDA)), c1x = Math.min(SALA_W-1, Math.floor((o.x+r)/CELDA));
    const c0y = Math.max(0, Math.floor((o.y-r)/CELDA)), c1y = Math.min(SALA_H-1, Math.floor((o.y+r)/CELDA));
    let toco = false;
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++){
      if (!bloq(s, cx, cy)) continue;
      const bx = cx*CELDA, by = cy*CELDA;
      const px = Math.max(bx, Math.min(o.x, bx+CELDA));
      const py = Math.max(by, Math.min(o.y, by+CELDA));
      const dx = o.x-px, dy = o.y-py, d2 = dx*dx + dy*dy;
      if (d2 >= r*r) continue;
      toco = true;
      if (d2 > 1e-5){
        const d = Math.sqrt(d2);
        o.x += dx/d * (r-d); o.y += dy/d * (r-d);
      } else {
        /* el centro cayo DENTRO de la celda: ahi la normal es degenerada
           y hay que salir por el eje de menor penetracion */
        const mx = bx+CELDA/2, my = by+CELDA/2;
        const ox = (CELDA/2 + r) - Math.abs(o.x-mx), oy = (CELDA/2 + r) - Math.abs(o.y-my);
        if (ox < oy) o.x += (o.x < mx ? -ox : ox); else o.y += (o.y < my ? -oy : oy);
      }
    }
    if (!toco) break;
  }
  o.x = Math.max(r, Math.min(MUNDO_W - r, o.x));
  o.y = Math.max(r, Math.min(MUNDO_H - r, o.y));
}

/* ---------- efectos ---------- */
function esquirlas(x, y, col, n){
  for (let i = 0; i < n; i++){
    const a = Math.random()*6.2832, v = 40 + Math.random()*150;
    JU.par.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, r:2+Math.random()*3,
                 a:Math.random()*6.28, va:(Math.random()-.5)*14, t:.35+Math.random()*.3,
                 tv:.65, col, tipo:'astilla'});
  }
}
function aro(x, y, r, col){
  JU.par.push({x, y, vx:0, vy:0, r, a:0, va:0, t:.34, tv:.34, col, tipo:'aro'});
}
function flota(x, y, txt, tam, col){
  JU.flot.push({x, y, txt:String(txt), tam, col, t:.72, tv:.72, vy:-34});
}
function sacude(n){ JU.sac = Math.max(JU.sac, n); }

/* ---------- el jugador ---------- */
function nuevoJugador(){
  return {
    x:MUNDO_W/2, y:MUNDO_H/2, vx:0, vy:0,
    vida:J_VIDAS, vidaMax:J_VIDAS,
    ener:E_MAX0, eMax:E_MAX0, eRec:E_REC0, eEsp:0,
    arma:0, mira:-1.5708, miraJoy:-1.5708, blanco:null,
    fase:0, andando:false,
    inv:0, cd:0, rec:0, fog:0,
    esqT:0, esqCd:0, esqVx:0, esqVy:0, aterr:0,
    mDano:1, mVel:1, mEsq:1, mCad:1, mVbala:1,
  };
}

/* ---------- arranque ---------- */
function arrancaPartida(){
  JU.piso = 1; JU.bajas = 0; JU.monedas = 0; JU.seg = 0; JU.gano = false;
  JU.lento = 0; JU.hitstop = 0; JU.t = 0; JU.sac = 0; JU.fog = 0; JU.rojo = 0;
  JU.P = nuevoJugador();
  entraPiso(1, (Math.random()*1e9)|0);
  JU.modo = 'juega';
}

function entraPiso(n, sem){
  JU.piso = n;
  VIDA_LOG.push({p:n, v:JU.P.vida, a:ARMAS[JU.P.arma].id, md:+JU.P.mDano.toFixed(2)});
  JU.pisoObj = generaPiso(n, sem === undefined ? JU.pisoObj.sem : sem);
  JU.pisoObj.sem = sem === undefined ? JU.pisoObj.sem : sem;
  /* VA DESPUES DE GENERAR: antes, `pisoObj` todavia es el piso ANTERIOR — o sea
     que contaria los cofres del piso que se acaba de dejar. */
  COF_LOG.push({p:n, hay:JU.pisoObj.salas.filter(x => x.cofre).length, abrio:0});
  entraSala(0, null);
  aviso(T('piso', n));
}

function entraSala(ix, ladoSale){
  const P = JU.pisoObj, s = P.salas[ix];
  JU.salaIx = ix; JU.sala = s;
  JU.bal.length = 0; JU.eba.length = 0; JU.par.length = 0; JU.flot.length = 0;
  JU.enemV = [];
  JU.puerta = 0;

  if (!s.limpia){
    /* el azar del enemigo sale de la SALA y no del orden en que se entra:
       asi una semilla describe una partida aunque el jugador vaya y vuelva */
    const r = rng(P.sem * 9973 + P.n * 131 + ix * 17 + 3);
    for (const sp of s.enem) JU.enemV.push(nuevoEnem(sp, r));
    if (!JU.enemV.length) s.limpia = true;
  }
  s.visitada = true;

  if (ladoSale){
    const L = LADOS.find(l => l.k === ladoSale);
    const d = dentroDe(L.op);
    JU.P.x = (d.x + .5) * CELDA; JU.P.y = (d.y + .5) * CELDA;
  } else {
    JU.P.x = MUNDO_W/2; JU.P.y = MUNDO_H/2;
    corrige(JU.P, J_R, s);
  }
  JU.P.vx = 0; JU.P.vy = 0; JU.P.esqT = 0;

  if (s.tipo === 'jefe' && !s.limpia){ aviso(T('jefeAhi')); son('jefe'); sacude(7); }
  else if (s.esc && s.limpia) aviso(T('escalera'));
  hudPinta();
}

function nuevoEnem(sp, r){
  const D = ENEM[sp.cl];
  return {cl:sp.cl, x:(sp.cx+.5)*CELDA, y:(sp.cy+.5)*CELDA,
          vida:D.v, vidaMax:D.v, vivo:true,
          cd:.25 + r()*1.0, avisa:0, alt:false,
          fase:r()*6.2832, mira:1.5708, flash:0, golpe:0};
}

/* ---------- disparar ---------- */
function eligeBlanco(P){
  let mej = null, mp = 1e9;
  for (const e of JU.enemV){
    if (!e.vivo) continue;
    const dx = e.x-P.x, dy = e.y-P.y, d = hip(dx,dy);
    if (d > MIRA_ALC) continue;
    const dif = Math.abs(angDif(Math.atan2(dy,dx), P.miraJoy));
    /* el cono manda; fuera de el vale igual pero pesa mucho mas, asi que
       apuntar con el joystick decide y no tener joystick no deja sin mira */
    const p = d + dif*70 + (dif > MIRA_CONO ? 900 : 0);
    if (p < mp){ mp = p; mej = e; }
  }
  return mej;
}

function dispara(P){
  const A = ARMAS[P.arma];
  if (P.cd > 0 || P.ener < A.e) return;
  const ang = P.mira;
  const radial = (A.s === 0 && A.n > 1);   // la CRUZ es literalmente una cruz
  for (let i = 0; i < A.n; i++){
    const a = radial ? ang + i/A.n*6.2832
                     : ang + (i - (A.n-1)/2) * A.s * 1.35 + (Math.random()-.5)*A.s;
    const v = A.v * P.mVbala;
    JU.bal.push({x:P.x + Math.cos(ang)*16, y:P.y + Math.sin(ang)*16,
                 vx:Math.cos(a)*v, vy:Math.sin(a)*v, r:3 + A.d*.06,
                 col:A.col, d:A.d * P.mDano, vida:A.a / v});
  }
  P.ener -= A.e; P.eEsp = E_ESP;
  P.cd = A.c / P.mCad;
  P.fog = 1; P.rec = 1;
  P.vx -= Math.cos(ang) * A.r * .22; P.vy -= Math.sin(ang) * A.r * .22;
  JU.fog = Math.min(1, JU.fog + A.d*.006);
  sacude(A.r * .012);
  son(A.d >= 20 ? 'tiraG' : 'tira');
}

function balaE(x, y, a, v, d, col, de){
  /* `x0,y0` es de donde salio: sirve para medir a que DISTANCIA pega una bala,
     que es lo unico que dice si el enemigo a distancia esta peleando de lejos
     o se te vino encima. */
  BALA_N.sale++;
  JU.eba.push({x, y, x0:x, y0:y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, r:BALA_R, col, d, vida:2.6, de});
}

/* ---------- daño ---------- */
/* UNA SOLA PUERTA PARA EL BOTIN. Se muere de dos formas —a golpes y reventando—
   y las dos hacen lo mismo: vivo=false, bajas++, revisaLimpia(). Con la tirada
   escrita en los dos sitios, el dia que se agregue una tercera muerte esa no
   suelta nada y nadie se entera. */
function caeBotin(e, hito){
  const P = JU.P;
  if (P.vida >= P.vidaMax) return;              /* con la barra llena no cae */
  const D = ENEM[e.cl];
  /* EL JEFE SUELTA SIEMPRE, y no es un regalo: una pelea que cuesta tres
     corazones y no devuelve ninguno es el problema del piso 4 concentrado. */
  if (!hito && !D.jefe && Math.random() >= P_COR) return;
  const s = JU.sala;
  if (!s.cor) s.cor = [];
  s.cor.push({x:e.x, y:e.y, t:0});
}

/* levantar un corazon: lo llama pasoJug, y la cura se topa en el maximo */
function tomaCor(c){
  const P = JU.P;
  const antes = P.vida;
  P.vida = Math.min(P.vidaMax, P.vida + 1);
  /* SE ANOTA LO QUE CURO DE VERDAD y no "un corazon". Uno levantado con la
     barra llena cura CERO, y contar corazones en vez de curacion deja la
     economia describiendo un juego mas generoso que el que se juega. */
  CURA_LOG.push({p:JU.piso, c:P.vida - antes});
  c.tomado = true;
  flota(c.x, c.y - 14, '+1', 15, '#ef4b5c');
  esquirlas(c.x, c.y, '#ef4b5c', 8);
  son('cura'); hudPinta();
}

function danoEnem(e, d){
  const D = ENEM[e.cl];
  e.vida -= d; e.flash = 1; e.golpe = 1;
  JU.hitstop = Math.max(JU.hitstop, .035);
  flota(e.x, e.y - D.r - 6, Math.round(d), 13, '#ffffff');
  /* EL JEFE SUELTA A MITAD DE BARRA. Medido: el piso 5 cobraba 7,5 corazones de
     una barra de 7 —mas que la barra entera— contra 4,2 de sus dos vecinos. Una
     pelea larga bajo fuego sin nada que levantar en el medio no es dificil, es
     una cuenta regresiva. Con los hitos la pelea pasa a tener mitades y hay algo
     que ganar adentro. */
  if (D.jefe && e.vida > 0){
    if (!e.hitos) e.hitos = D.hitos ? D.hitos.slice() : [];
    while (e.hitos.length && e.vida <= D.v * e.hitos[0]){
      e.hitos.shift();
      caeBotin(e, true);
    }
  }
  if (e.vida <= 0){
    e.vivo = false; JU.bajas++;
    esquirlas(e.x, e.y, D.col, D.jefe ? 30 : 12);
    aro(e.x, e.y, D.r*1.4, D.col);
    son('muere');
    if (D.jefe){ JU.lento = .95; sacude(11); JU.fog = 1; }
    caeBotin(e);
    revisaLimpia();
  } else son('pega');
}

/* `de` es la clase que pego. No cambia una sola regla del juego: existe para
   poder MEDIR de que se muere uno, que es la unica forma de ajustar la economia
   sin adivinar. */
function danoJug(d, de){
  const P = JU.P;
  if (P.inv > 0 || JU.modo !== 'juega') return;
  /* LA TABLA DE DANO NO PUEDE SER PLANA. Con /14 redondeado, SIETE DE OCHO clases
     costaban exactamente un corazon: un rozon de tirador salia lo mismo que el
     abrazo de un bruto, asi que lo unico que importaba era CUANTOS golpes, no de
     que. Con /9 la bomba, el bruto y los dos jefes pasan a dos, que es lo que hace
     que se pueda aprender a que tenerle miedo. Y no endurece el juego: dos de
     siete corazones es menos proporcion que uno de cinco. */
  const c = Math.max(1, Math.round(d / 9));
  P.vida -= c; P.inv = J_INV;
  JU.rojo = 1; JU.hitstop = Math.max(JU.hitstop, .07); sacude(8);
  esquirlas(P.x, P.y, '#ef4b5c', 9);
  flota(P.x, P.y - 24, '-' + c, 16, '#ef4b5c');
  son('dano');
  /* EN QUE ESTADO ESTABA LA ESQUIVA AL COBRAR. `cd` > 0 quiere decir que
     ni se podia esquivar; `esqT` > 0 que se esquivo y la invencibilidad se
     habia vencido ANTES de que la bala llegara. Son dos defectos distintos
     y se arreglan con numeros opuestos. */
  DANO_LOG.push({p:JU.piso, de:de||'?', c, v:P.vida, dist:BALA_D, t:JU.t,
                 cd:+P.esqCd.toFixed(2), esqT:+P.esqT.toFixed(2)});
  hudPinta();
  if (P.vida <= 0) pierde();
}

function explota(e){
  const D = ENEM[e.cl];
  aro(e.x, e.y, D.expl, D.col);
  esquirlas(e.x, e.y, D.col, 22);
  sacude(10); JU.fog = Math.max(JU.fog, .8);
  const P = JU.P;
  if (hip(P.x-e.x, P.y-e.y) < D.expl + J_R) danoJug(D.d, e.cl);
  for (const o of JU.enemV){
    if (o === e || !o.vivo) continue;
    if (hip(o.x-e.x, o.y-e.y) < D.expl + ENEM[o.cl].r) danoEnem(o, D.d*.6);
  }
  e.vivo = false; JU.bajas++;
  son('muere');
  caeBotin(e);
  revisaLimpia();
}

/* ---------- la sala se limpia ---------- */
function revisaLimpia(){
  const s = JU.sala;
  if (s.limpia) return;
  for (const e of JU.enemV) if (e.vivo) return;
  s.limpia = true; JU.puerta = 1;
  son('limpia'); aviso(T('salaLimpia'));
  if (s.esc) aviso(T('escalera'));
  hudPinta();
}

/* ---------- ataque enemigo ---------- */
function enemAtaca(e, ang, d){
  const D = ENEM[e.cl];
  e.golpe = 1;
  if (D.expl){ explota(e); return; }
  if (D.f > 0){
    e.alt = !e.alt;
    const anillo = !!D.jefe && e.alt;
    for (let i = 0; i < D.f; i++){
      const a = anillo ? ang + i/D.f*6.2832
                       : ang + (i - (D.f-1)/2) * ABAN_PASO;
      balaE(e.x, e.y, a, D.vb, D.d, D.col, e.cl);
    }
    son('tiraG');
  } else {
    /* cuerpo a cuerpo: se resuelve al TERMINAR el aviso, asi que salirse
       de ahi durante la telegrafia es lo que hace que esquivar exista */
    const P = JU.P;
    if (hip(P.x-e.x, P.y-e.y) < D.a + J_R + 10) danoJug(D.d, e.cl);
    son('pega');
  }
}

/* ---------- pasos ---------- */
function pasoJugador(dt){
  const P = JU.P, s = JU.sala;
  P.inv   = Math.max(0, P.inv - dt);
  P.cd    = Math.max(0, P.cd - dt);
  P.esqCd = Math.max(0, P.esqCd - dt);
  P.rec   = Math.max(0, P.rec - dt*6);
  P.fog   = Math.max(0, P.fog - dt*9);
  P.aterr = Math.max(0, P.aterr - dt*5);
  P.eEsp  = Math.max(0, P.eEsp - dt);
  if (P.eEsp <= 0) P.ener = Math.min(P.eMax, P.ener + P.eRec * dt);

  const ex = ENT.x, ey = ENT.y;
  const m = hip(ex, ey);
  if (m > .12) P.miraJoy = Math.atan2(ey, ex);

  /* esquiva */
  if (ENT.esq && P.esqT <= 0 && P.esqCd <= 0){
    let dx = ex, dy = ey;
    if (m <= .12){ dx = Math.cos(P.mira); dy = Math.sin(P.mira); }
    const l = hip(dx,dy) || 1;
    P.esqT = ESQ_T; P.esqCd = ESQ_CD / P.mEsq;
    P.esqVx = dx/l * ESQ_VEL; P.esqVy = dy/l * ESQ_VEL;
    P.inv = Math.max(P.inv, ESQ_INV);
    esquirlas(P.x, P.y, '#8ce0ff', 6);
    son('esquiva');
  }

  let vx, vy;
  if (P.esqT > 0){
    P.esqT -= dt;
    const u = Math.max(0, P.esqT / ESQ_T);
    vx = P.esqVx * (.35 + .65*u); vy = P.esqVy * (.35 + .65*u);
    if (P.esqT <= 0) P.aterr = 1;
  } else {
    const v = J_VEL * P.mVel;
    vx = (m > .12 ? ex/Math.max(1,m) : 0) * v;
    vy = (m > .12 ? ey/Math.max(1,m) : 0) * v;
    /* el retroceso del arma se va con roce, no de golpe */
    P.vx *= Math.pow(.0009, dt); P.vy *= Math.pow(.0009, dt);
    vx += P.vx; vy += P.vy;
  }
  const ax = P.x, ay = P.y;
  P.x += vx*dt; P.y += vy*dt;
  corrige(P, J_R, s);

  /* LA CADENCIA SALE DE LA DISTANCIA: con un reloj, los pies patinan
     en cuanto cambia la velocidad. */
  const rec = hip(P.x-ax, P.y-ay);
  P.andando = rec > .6;
  P.fase += rec / J_PASO * Math.PI;

  /* mira */
  P.blanco = eligeBlanco(P);
  const obj = P.blanco ? Math.atan2(P.blanco.y-P.y, P.blanco.x-P.x) : P.miraJoy;
  P.mira += angDif(obj, P.mira) * Math.min(1, dt*20);

  if (ENT.fuego) dispara(P);

  /* monedas */
  for (const c of s.mon){
    if (c.tomada) continue;
    if (hip(P.x - (c.cx+.5)*CELDA, P.y - (c.cy+.5)*CELDA) < 22){
      c.tomada = true; JU.monedas++;
      flota((c.cx+.5)*CELDA, (c.cy+.5)*CELDA - 12, '+1', 12, '#e8c06a');
      son('moneda'); hudPinta();
    }
  }

  /* corazones sueltos */
  if (s.cor) for (const c of s.cor){
    if (c.tomado) continue;
    c.t += dt;
    if (hip(P.x - c.x, P.y - c.y) < COR_R) tomaCor(c);
  }

  /* cofre */
  if (s.cofre && !s.cofre.abierto){
    const d = hip(P.x - (s.cofre.cx+.5)*CELDA, P.y - (s.cofre.cy+.5)*CELDA);
    /* EL COFRE DICE QUE TIENE. El boton decia USAR y nada mas: se peleaban tres
       enemigos para despues cambiar el arma a ciegas, y una de cada tres es un
       bajon. Con el nombre y la flecha, tomarlo pasa a ser una decision. */
    const ah = d < 34;
    if (ah && !s.cofre.visto){
      s.cofre.visto = true;
      const mej = dps(ARMA_ID[s.cofre.arma], P) > dps(P.arma, P);
      aviso(TARMA(s.cofre.arma) + (mej ? ' ▲' : ' ▼'));
    }
    cerca(ah ? 'cofre' : null);
    if (d < 34 && ENT.usar){
      s.cofre.abierto = true;
      if (COF_LOG.length) COF_LOG[COF_LOG.length-1].abrio++;
      P.arma = ARMA_ID[s.cofre.arma];
      aviso(T('tomaste', TARMA(s.cofre.arma)));
      esquirlas((s.cofre.cx+.5)*CELDA, (s.cofre.cy+.5)*CELDA, '#ffc857', 16);
      son('cofre'); hudPinta();
    }
  } else cerca(null);
  ENT.usar = false;

  /* escalera */
  if (s.esc && s.limpia){
    if (hip(P.x - (s.esc.cx+.5)*CELDA, P.y - (s.esc.cy+.5)*CELDA) < 26) bajaPiso();
  }

  /* puertas: la celda del jugador es una boca y la sala esta limpia */
  if (s.limpia){
    const cx = Math.floor(P.x/CELDA), cy = Math.floor(P.y/CELDA);
    const k = enBoca(s, cx, cy);
    if (k && s.vec[k] !== undefined){ son('puerta'); entraSala(s.vec[k], k); }
  }
}

function pasoEnem(dt){
  const P = JU.P, s = JU.sala;
  for (const e of JU.enemV){
    if (!e.vivo) continue;
    const D = ENEM[e.cl];
    e.flash = Math.max(0, e.flash - dt*6);
    e.golpe = Math.max(0, e.golpe - dt*7);
    const dx = P.x-e.x, dy = P.y-e.y, d = hip(dx,dy) || 1;
    const ang = Math.atan2(dy,dx);
    e.mira += angDif(ang, e.mira) * Math.min(1, dt*7);
    e.cd -= dt;

    if (e.avisa > 0){
      e.avisa -= dt;
      if (e.avisa <= 0) enemAtaca(e, ang, d);
      continue;                    /* mientras avisa NO se mueve: eso es la ventana */
    }
    /* LA MISMA CUENTA QUE MATA UNA BALA. Un tirador que dispara a traves de
       una pared no falla: mata al jugador desde un sitio al que no se puede
       contestar, y eso no se lee a dificultad, se lee a error. */
    const ve = visto(s, e.x, e.y, P.x, P.y);
    if (ve && d < D.a && e.cd <= 0){ e.avisa = D.t; e.cd = D.c; continue; }
    if (D.s <= 0) continue;

    let mx = dx/d, my = dy/d;
    /* SIN LINEA DE VISTA SE CAMINA EL CAMPO. Derecho al jugador, un muro en el
       medio deja al bicho empujando contra la pared para siempre — y como las
       bocas se cierran mientras la sala esta sucia, eso TRABA LA PARTIDA
       tambien para una persona. Con vista se va derecho, que es lo que hace
       que la carga se lea a carga y no a patrulla. */
    if (!ve){
      const c = bajaCampo(eneCampo(s, Math.floor(P.x/CELDA), Math.floor(P.y/CELDA)),
                          Math.floor(e.x/CELDA), Math.floor(e.y/CELDA), 1);
      if (c){
        const tx = (c.x+.5)*CELDA - e.x, ty = (c.y+.5)*CELDA - e.y;
        const tl = hip(tx,ty) || 1;
        mx = tx/tl; my = ty/tl;
      }
    }
    /* separacion: sin esto se apilan y son un solo blanco */
    for (const o of JU.enemV){
      if (o === e || !o.vivo) continue;
      const ox = e.x-o.x, oy = e.y-o.y, od = hip(ox,oy);
      const min = D.r + ENEM[o.cl].r;
      if (od < min && od > .01){ mx += ox/od * (min-od)/min * 1.7; my += oy/od * (min-od)/min * 1.7; }
    }
    const ml = hip(mx,my) || 1;
    const v = D.s;
    const bx = e.x, by = e.y;
    e.x += mx/ml * v * dt; e.y += my/ml * v * dt;
    corrige(e, D.r, s);
    e.fase += hip(e.x-bx, e.y-by) / 24;
  }
  JU.enemV = JU.enemV.filter(e => e.vivo);
}

function pasoBalas(dt){
  const P = JU.P, s = JU.sala;
  for (let i = JU.bal.length-1; i >= 0; i--){
    const b = JU.bal[i];
    b.x += b.vx*dt; b.y += b.vy*dt; b.vida -= dt;
    let fuera = b.vida <= 0 || bloq(s, Math.floor(b.x/CELDA), Math.floor(b.y/CELDA));
    if (!fuera) for (const e of JU.enemV){
      if (!e.vivo) continue;
      if (hip(e.x-b.x, e.y-b.y) < ENEM[e.cl].r + b.r){ danoEnem(e, b.d); fuera = true; break; }
    }
    if (fuera){ esquirlas(b.x, b.y, b.col, 3); JU.bal.splice(i,1); }
  }
  for (let i = JU.eba.length-1; i >= 0; i--){
    const b = JU.eba[i];
    b.x += b.vx*dt; b.y += b.vy*dt; b.vida -= dt;
    let fuera = b.vida <= 0 || bloq(s, Math.floor(b.x/CELDA), Math.floor(b.y/CELDA));
    if (!fuera && hip(P.x-b.x, P.y-b.y) < J_R + b.r){ BALA_D = hip(b.x-b.x0, b.y-b.y0); BALA_N.pega++; danoJug(b.d, b.de); BALA_D = -1; fuera = true; }
    if (fuera){ esquirlas(b.x, b.y, b.col, 2); JU.eba.splice(i,1); }
  }
}

function pasoEfectos(dt){
  for (let i = JU.par.length-1; i >= 0; i--){
    const p = JU.par[i];
    p.t -= dt;
    if (p.tipo !== 'aro'){
      p.x += p.vx*dt; p.y += p.vy*dt;
      p.vx *= Math.pow(.02, dt); p.vy *= Math.pow(.02, dt);
      p.a += p.va*dt;
    }
    if (p.t <= 0) JU.par.splice(i,1);
  }
  for (let i = JU.flot.length-1; i >= 0; i--){
    const f = JU.flot[i];
    f.t -= dt; f.y += f.vy*dt; f.vy *= Math.pow(.05, dt);
    if (f.t <= 0) JU.flot.splice(i,1);
  }
  JU.fog  = Math.max(0, JU.fog - dt*4.5);
  JU.rojo = Math.max(0, JU.rojo - dt*2.2);
  JU.sac  = Math.max(0, JU.sac - dt*46);
  JU.sacX = (Math.random()*2-1) * JU.sac;
  JU.sacY = (Math.random()*2-1) * JU.sac;
  if (JU.puerta > 0) JU.puerta = Math.max(0, JU.puerta - dt*1.6);
}

/* ---------- EL PASO ---------- */
function paso(dt){
  if (JU.modo !== 'juega') return;
  JU.seg += dt;
  /* el hitstop y la camara lenta escalan dt para TODO, asi que el
     auto-jugador los paga igual que el dedo */
  if (JU.hitstop > 0){ JU.hitstop -= dt; dt *= .14; }
  else if (JU.lento > 0){ JU.lento -= dt; dt *= .34; }
  JU.t += dt;
  if (BOT.on) botPaso(dt);
  tutPaso(dt);
  pasoJugador(dt);
  if (JU.modo !== 'juega') return;      // pudo morir o bajar de piso
  pasoEnem(dt);
  pasoBalas(dt);
  pasoEfectos(dt);
}

/* ELEGIR MEJORA ES UNA DECISION DEL JUEGO, no un sorteo. Estaba escrita cinco
   veces —al azar en juega(), siempre la 0 en las otras cuatro sondas y al azar en
   la demo— asi que el bot "honesto" tiraba a la moneda la unica decision que el
   juego le pide entre piso y piso. Con una sola funcion no puede haber dos
   criterios, y el del azar sigue siendo el control. */
/* LO QUE NO MUEVE EL DPS SE ORDENA A MANO; LO QUE SI, SE MIDE (abajo).
   `cad` esta ULTIMO y no es un descuido: con el ciclo real de un arma
   (`max(cadencia, E_ESP + energia/recarga)`) el cuello de botella es la
   ENERGIA en las diez armas, asi que subir la cadencia vale exactamente CERO
   por ciento de dano por segundo — medido en las diez. Para que la cadencia
   empiece a importar en la escopeta hace falta llevar la recarga a 60, o sea
   SIETE mejoras de `rec` sobre las nueve que dan los diez pisos. */
const MEJ_PREF = ['esq','ener','vel','bala','cad'];
function mejorElige(modo){
  if (!MEJ_OPC.length) return 0;
  if (modo === 'azar') return (Math.random() * MEJ_OPC.length) | 0;
  const P = JU.P, falta = P.vidaMax - P.vida;
  const ix = id => MEJ_OPC.findIndex(m => m.id === id);
  /* cura llena al maximo y vida sube el techo curando uno: con la barra baja
     manda la cura, con la barra llena manda el techo */
  if (falta >= 2 && ix('cura') >= 0) return ix('cura');
  if (ix('vida') >= 0) return ix('vida');
  if (falta >= 1 && ix('cura') >= 0) return ix('cura');
  /* LA MEJORA DE ATAQUE SE DERIVA, NO SE ESCRIBE. La lista de antes ponia
     `dano` primero y `cad` segundo, que es el orden que sale de la tabla de
     cadencias — la misma cuenta que mentia en `dps` y que hacia que el bot
     llegara al jefe con la peor arma. Con el ciclo real, `rec` le gana a `dano`
     en 7 de las 10 armas (escopeta +28% contra +18%, canon +31%) y `cad` vale
     cero en las diez. Aca no se elige un orden: se le aplica cada mejora a una
     COPIA de los numeros del jugador y se queda la que mas sube el dps del arma
     que lleva puesta, con la funcion `f` de la propia mejora. Asi, cambiar un
     numero de MEJORAS mueve la eleccion solo y no hay dos listas que se puedan
     desincronizar. */
  const base = dps(P.arma, P);
  let mej = -1, gan = 1e-9;
  for (let i = 0; i < MEJ_OPC.length; i++){
    const q = {eRec:P.eRec, eMax:P.eMax, mDano:P.mDano, mCad:P.mCad,
               mVel:P.mVel, mEsq:P.mEsq, mVbala:P.mVbala,
               vida:P.vida, vidaMax:P.vidaMax};
    MEJ_OPC[i].f(q);
    const g = dps(P.arma, q) - base;
    if (g > gan){ gan = g; mej = i; }
  }
  if (mej >= 0) return mej;
  for (const id of MEJ_PREF){ const i = ix(id); if (i >= 0) return i; }
  return 0;
}

/* ---------- bajar, morir, ganar ---------- */
function bajaPiso(){
  son('baja');
  if (JU.piso >= PISOS){ gana(); return; }
  JU.modo = 'mejora';
  MEJ_OPC = [];
  const pool = MEJORAS.slice();
  /* CON LA BARRA BAJA, UNA DE LAS TRES ES CURA. No es un regalo: curarse sigue
     costando la mejora del piso, o sea que se paga con no crecer. Lo que saca es
     la VARIANZA DEL SORTEO — cura y vida son 2 de 9, asi que el 42% de los pisos
     no ofrecia ninguna forma de recuperar, y eso mataba corridas buenas por una
     tirada y no por como se jugo. */
  if (JU.P.vida <= JU.P.vidaMax - 2){
    const i = pool.findIndex(m => m.id === 'cura');
    if (i >= 0) MEJ_OPC.push(pool.splice(i, 1)[0]);
  }
  while (MEJ_OPC.length < 3 && pool.length)
    MEJ_OPC.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]);
  pintaMejoras();
  verPan('#pMejora');
}
function eligeMejora(i){
  const m = MEJ_OPC[i]; if (!m) return;
  m.f(JU.P);
  son('mejora');
  JU.modo = 'juega';
  verPan(null);
  entraPiso(JU.piso + 1, (Math.random()*1e9)|0);
  hudPinta();
}
function gana(){
  JU.gano = true; JU.modo = 'fin';
  GUARDA.rec = Math.max(GUARDA.rec, PISOS); guardaEscribe();
  son('gana');
  pintaFin(); verPan('#pFin');
}
function pierde(){
  JU.gano = false; JU.modo = 'fin';
  GUARDA.rec = Math.max(GUARDA.rec, JU.piso); guardaEscribe();
  esquirlas(JU.P.x, JU.P.y, '#8ce0ff', 20);
  son('pierde');
  pintaFin(); verPan('#pFin');
}

/* ============================================================
   EL AUTO-JUGADOR. Escribe en ENT, o sea que entra por el mismo
   sitio que el dedo: si termina el juego, el juego se termina.
   ============================================================ */
function rutaSalas(desde, hasta){
  const P = JU.pisoObj;
  const pre = {}; pre[desde] = -1;
  const q = [desde];
  for (let i = 0; i < q.length; i++){
    const s = P.salas[q[i]];
    if (q[i] === hasta) break;
    for (const k in s.vec){
      const j = s.vec[k];
      if (pre[j] === undefined){ pre[j] = q[i]; q.push(j); }
    }
  }
  if (pre[hasta] === undefined) return [];
  const r = []; let c = hasta;
  while (c !== desde){ r.unshift(c); c = pre[c]; }
  return r;
}

/* CUANTO PEGA UN ARMA POR SEGUNDO. UNA cuenta y la usan el bot, el cartel del
   cofre y la sonda: con dos, el cartel diria una cosa y el bot elegiria otra.
   Es una aproximacion y conviene decirlo: cuenta los `n` perdigones como si
   los cinco pegaran, asi que sobrestima a la escopeta y a la cruz de lejos.
   Para decidir "esto es mejor que lo que llevo" alcanza; para balancear las
   diez armas entre si, no. */
/* EL DPS ES EL QUE VA HACIA ADELANTE, NO EL DE LA TABLA. La cruz tira sus
   cuatro balas a los cuatro puntos cardinales (`radial` en `dispara`), asi que
   contra UN blanco pega una de cada cuatro: 23,9 de dano por segundo y no 95,7.
   Con la cuenta de la tabla era la mas alta de las diez por un factor de cuatro
   y en realidad es la mas floja, asi que `cofreVale` —que la usa— rechazaba
   TODO lo demas desde el piso 4 y el bot llegaba al 10 con la peor arma posible
   contra un jefe, que es un blanco solo y encima sin escolta (medido: la sala
   del jefe2 se limpia en las 12 corridas que mueren ahi). El arma no cambia:
   sigue siendo la que limpia a los que te rodean. Lo que cambia es que la
   cuenta deje de mentir. */
const dps = (i, P) => { const A = ARMAS[i];
  const nDir = (A.s === 0 && A.n > 1) ? 1 : A.n;
  const eRec = (P && P.eRec) || E_REC0;
  const md = (P && P.mDano) || 1, mc = (P && P.mCad) || 1;
  /* EL CICLO LO PONE EL QUE SEA MAS LENTO: la cadencia o la energia. Con la
     cadencia sola, la aguja "sostiene" 57 de dano por segundo y su tanque da
     33 tiros de 0,07 s, o sea DOS SEGUNDOS Y MEDIO de fuego; despues dispara a
     la tasa de la recarga y mide 7,4. Contra una sala de cuatro babas la
     diferencia no existe —la pelea entera cabe en un tanque— pero contra un
     jefe de 760 puntos de vida es la unica cuenta que describe algo. */
  return A.d * nDir * md / Math.max(A.c / mc, E_ESP + A.e / eRec); };

/* SI VALE LA PENA IR A ESE COFRE. UNA puerta y TRES que la llaman —el destino
   entre salas, el destino dentro de la sala y el dedo del bot— porque con la
   condicion repartida el bot camina hasta un cofre que despues no abre y se
   queda plantado ahi para siempre: medido asi, el piso medio se derrumbo de
   6,04 a 2,96 con las mejores armas que el juego llego a darle. Decir que no
   tiene que significar SEGUIR. */
const cofreVale = c => !!c && !c.abierto &&
  dps(ARMA_ID[c.arma], JU.P) > dps(JU.P.arma, JU.P);

/* ---------- COMO SE MUEVE EL BOT ----------
   NO alcanza con mirar 62 px adelante y probar ocho angulos: eso es un
   buscador de minimos locales, y medido se clavaba DOSCIENTOS cuadros
   contra un muro interior con la sala limpia y la puerta a cinco metros
   (sala 0 del piso 1, ENT.x=1 empujando contra la celda 6,8). La sala es
   una reja de 11x17: un campo de distancias es exacto y cuesta nada.

   EL CAMPO SALE DE bloq(), o sea LA MISMA cuenta que frena al jugador.
   Con dos, el bot caminaria por un mapa que no es el que choca — y que
   llegue no probaria que se puede llegar. */
function haceCampo(s, tx, ty){
  const d = new Int16Array(SALA_W * SALA_H).fill(-1);
  if (bloq(s, tx, ty)) return d;
  const q = [ty * SALA_W + tx]; d[q[0]] = 0;
  for (let i = 0; i < q.length; i++){
    const c = q[i], x = c % SALA_W, y = (c / SALA_W) | 0;
    for (const L of LADOS){
      const nx = x + L.dx, ny = y + L.dy;
      if (nx < 0 || ny < 0 || nx >= SALA_W || ny >= SALA_H) continue;
      const k = ny * SALA_W + nx;
      if (d[k] >= 0 || bloq(s, nx, ny)) continue;
      d[k] = d[c] + 1; q.push(k);
    }
  }
  return d;
}
/* DOS CACHES Y NO UNA. El bot y los bichos piden campos con destinos
   distintos en el mismo cuadro: con una sola, cada llamada pisa a la otra
   y el BFS se rehace dos veces por cuadro para nada. */
function campoCache(C, s, tx, ty){
  const lim = s.limpia ? 1 : 0;
  if (C.s === s && C.cx === tx && C.cy === ty && C.lim === lim) return C.d;
  C.s = s; C.cx = tx; C.cy = ty; C.lim = lim; C.d = haceCampo(s, tx, ty);
  return C.d;
}
const BOTC = {s:null, cx:-1, cy:-1, lim:-1, d:null};
const ENEC = {s:null, cx:-1, cy:-1, lim:-1, d:null};
const botCampo = (s, tx, ty) => campoCache(BOTC, s, tx, ty);
const eneCampo = (s, tx, ty) => campoCache(ENEC, s, tx, ty);

/* baja `n` vecinos por el campo y devuelve la celda a la que hay que ir.
   Devuelve null si la celda de origen no tiene camino al destino. */
function bajaCampo(d, cx, cy, n){
  if (cx < 0 || cy < 0 || cx >= SALA_W || cy >= SALA_H) return null;
  if (d[cy*SALA_W + cx] < 0) return null;
  let x = cx, y = cy;
  for (let paso = 0; paso < n; paso++){
    let mx = -1, my = -1, mv = d[y*SALA_W + x];
    for (const L of LADOS){
      const nx = x + L.dx, ny = y + L.dy;
      if (nx < 0 || ny < 0 || nx >= SALA_W || ny >= SALA_H) continue;
      const v = d[ny*SALA_W + nx];
      if (v >= 0 && v < mv){ mv = v; mx = nx; my = ny; }
    }
    if (mx < 0) break;
    x = mx; y = my;
    if (mv === 0) break;
  }
  return {x, y};
}

/* ---------- LINEA DE VISTA ----------
   Es la MISMA cuenta que mata una bala (`bloq`), no una parecida: con dos,
   el bot decidiria que tiene tiro donde la bala choca, o al reves. Se
   muestrea cada 10 px y la celda mide 48, asi que no se saltea ninguna. */
function visto(s, ax, ay, bx, by){
  const dx = bx-ax, dy = by-ay, L = Math.sqrt(dx*dx + dy*dy);
  const n = Math.max(1, Math.ceil(L / 10));
  for (let i = 1; i < n; i++){
    const x = ax + dx*i/n, y = ay + dy*i/n;
    if (bloq(s, Math.floor(x/CELDA), Math.floor(y/CELDA))) return false;
  }
  return true;
}

/* mira si hay pared en una direccion antes de meterse de cabeza */
function botLibre(dx, dy){
  const P = JU.P, s = JU.sala;
  for (let t = 20; t <= 62; t += 14){
    if (bloq(s, Math.floor((P.x+dx*t)/CELDA), Math.floor((P.y+dy*t)/CELDA))) return false;
  }
  return true;
}
function botVa(tx, ty){
  const P = JU.P;
  let dx = tx-P.x, dy = ty-P.y;
  const d = hip(dx,dy) || 1; dx /= d; dy /= d;
  if (!botLibre(dx,dy)){
    for (const g of [.6,-.6,1.2,-1.2,1.9,-1.9,2.6,-2.6]){
      const c = Math.cos(g), sn = Math.sin(g);
      const nx = dx*c - dy*sn, ny = dx*sn + dy*c;
      if (botLibre(nx,ny)){ dx = nx; dy = ny; break; }
    }
  }
  ENT.x = dx; ENT.y = dy;
}

/* va a una CELDA por el campo, bajando de a un vecino. Se apunta dos
   celdas adelante y no una: apuntando a la de al lado el rumbo cambia
   noventa grados en cada borde y el cuerpo va a los tirones. */
function botCelda(tx, ty){
  const P = JU.P, s = JU.sala;
  tx = Math.max(0, Math.min(SALA_W-1, tx|0));
  ty = Math.max(0, Math.min(SALA_H-1, ty|0));
  const cx = Math.floor(P.x/CELDA), cy = Math.floor(P.y/CELDA);
  if (cx === tx && cy === ty){ botVa((tx+.5)*CELDA, (ty+.5)*CELDA); return; }
  const c = bajaCampo(botCampo(s, tx, ty), cx, cy, 2);
  if (!c){ botVa((tx+.5)*CELDA, (ty+.5)*CELDA); return; }   // no hay camino
  botVa((c.x+.5)*CELDA, (c.y+.5)*CELDA);
}
function botPunto(px, py){
  botCelda(Math.floor(px/CELDA), Math.floor(py/CELDA));
}

function botPaso(dt){
  const P = JU.P, s = JU.sala;
  BOT.t += dt;
  ENT.fuego = false; ENT.esq = false; ENT.usar = false; ENT.x = 0; ENT.y = 0;

  if (BOT.modo === 'azar'){
    if (BOT.t > .40){ BOT.t = 0; BOT.dir = Math.random()*6.2832; }
    ENT.x = Math.cos(BOT.dir); ENT.y = Math.sin(BOT.dir);
    ENT.fuego = Math.random() < .6;
    ENT.usar = Math.random() < .05;
    return;
  }

  /* --- honesto --- */
  ENT.fuego = true;
  /* NO SE TOMA UN ARMA PEOR. `P.arma = ARMA_ID[s.cofre.arma]` toma lo que haya
     a ciegas, asi que cambiar la cruz (95,7) por el orbe (27,3) es legal y
     triplica lo que dura cada sala. Medido al enrutar el bot al cofre sin este
     filtro: el piso 4 salia con `orbe:6` y el piso medio BAJO de 6,04 a 5,38 —
     o sea que ir al cofre sin mirar cuesta mas de lo que da. */
  ENT.usar = cofreVale(JU.sala.cofre) || !JU.sala.cofre;

  /* EL AVISO ES LA VENTANA, Y EL BOT NO LA JUGABA. Un bicho cuerpo a cuerpo se
     queda QUIETO mientras avisa y resuelve el golpe al terminar contra su
     alcance: salirse de ahi es la respuesta y es la mitad del juego. El bot
     solo reaccionaba a las BALAS, asi que contra baba, corredor, bomba y
     bruto se comia el golpe siempre — medido, 1,91 de vida por mil pasos. */
  let av = null, ad = 1e9;
  for (const e of JU.enemV){
    if (!e.vivo || e.avisa <= 0) continue;
    const D = ENEM[e.cl];
    if (D.f > 0 && !D.expl) continue;        // ese tira, no pega
    /* el radio que importa es el de SU golpe: la bomba revienta en 78 y un
       baba pega en 26, asi que un solo numero esquivaria de mas o de menos */
    const alc = (D.expl || D.a) + J_R + 10;
    const d = hip(e.x-P.x, e.y-P.y);
    /* 30 px de margen: una esquiva recorre 71, asi que disparandola al borde
       del golpe se sale con aire y no se gasta el enfriamiento de gusto */
    if (d > alc + 30) continue;
    if (d < ad){ ad = d; av = e; }
  }
  if (av){
    const dx = P.x-av.x, dy = P.y-av.y, l = hip(dx,dy) || 1;
    ENT.x = dx/l; ENT.y = dy/l;
    /* LA ESQUIVA NO SE GASTA SI CAMINANDO ALCANZA, y es una cuenta: el bicho
       pega al terminar el aviso contra SU alcance, asi que hay que estar mas
       lejos que `alc` para entonces. Caminando se recorre vel*avisa. Gastarla
       de gusto contra un baba deja al bot sin esquiva para la bala que si le
       iba a dar — y desde el piso 3 las dos cosas pasan a la vez. */
    const alcAv = (ENEM[av.cl].expl || ENEM[av.cl].a) + J_R + 10;
    const llego = ad + J_VEL * P.mVel * av.avisa;
    if (llego < alcAv + 14 && P.esqCd <= 0) ENT.esq = true;
    return;
  }

  /* LA BALA QUE HAY QUE ESQUIVAR ES LA QUE VA A PEGAR, no la que se acerca.
     Con "se acerca" el bot gastaba la esquiva en balas que pasaban a dos
     cuerpos de distancia; con dos tiradores en abanico eso es la mitad de los
     disparos. Se calcula el punto de paso mas cercano —t = -(r·v)/|v|²— y se
     mide el TIEMPO que falta, no los pixeles: una bala de 300 px/s y una de 640
     no dan el mismo aviso a la misma distancia. */
  let peligro = null, pt = 1e9;
  const amen = [];
  for (const b of JU.eba){
    const rx = P.x-b.x, ry = P.y-b.y;
    const v2 = b.vx*b.vx + b.vy*b.vy; if (v2 < 1) continue;
    const t = (rx*b.vx + ry*b.vy) / v2;
    if (t <= 0 || t > BOT_VENT) continue;            // ya paso, o falta demasiado
    const mx = rx - b.vx*t, my = ry - b.vy*t, m = hip(mx,my);
    if (m > J_R + b.r + 10) continue;                // pasa de largo
    b.mx = mx; b.my = my; b.m = m; amen.push(b);
    if (t < pt){ pt = t; peligro = b; }
  }
  if (peligro){
    /* PARA QUE LADO SALIRSE, y es UNA cuenta para los dos casos. El vector que
       va del punto de paso de la bala al cuerpo (`m`) apunta justo para donde
       hay que irse: alejarse del eje. Con la bala derecho al centro ese vector
       es ruido, y ahi recien se cae al perpendicular con el signo de la
       velocidad que ya se traia — girar 180 grados a mitad de camino tira a la
       basura lo que se venia acumulando. */
    const lv = hip(peligro.vx, peligro.vy) || 1;
    let nx, ny;
    if (peligro.m > 3){ nx = peligro.mx/peligro.m; ny = peligro.my/peligro.m; }
    else {
      nx = -peligro.vy/lv; ny = peligro.vx/lv;
      if (nx*P.vx + ny*P.vy < 0){ nx = -nx; ny = -ny; }
    }
    /* CONTRA UN ABANICO NO SE ESQUIVA UNA BALA, SE ESQUIVA EL ABANICO. Salirse
       del eje de la primera mete el cuerpo en el de la segunda, y eso no se ve
       como "no esquiva": se ve como que esquiva y le pegan igual. Medido antes
       de esto, de 73 golpes del jefe2 --que abre 233 grados con doce balas-- 73
       llegaron con la esquiva RECARGANDO y uno solo con la esquiva libre.
       Con mas de una amenaza se prueban 16 rumbos y se elige el que deja menos
       impactos; con una sola la cuenta de arriba ya es la respuesta y el
       barrido no corre, asi que las salas normales no cambian.

       MEDIDO CON EL MISMO BINARIO detras de `BOT.barr`, dos muestras de 90
       corridas por lado (la sonda `jefeMide` devuelve `barr` en el resultado
       justo para que se pueda comprobar cual lado corrio):

                        llegan al 10   ganan    tasa    me embocan
         sin barrido      52 y 56      22 y 26   44,4%   0,082 / 0,091
         CON barrido      59 y 60      44 y 45   74,8%   0,070 / 0,067

       Cuarenta y siete decimas de sigma, y las dos muestras de cada lado dan
       lo mismo. El mecanismo se lee en la ultima columna: come menos balas,
       que es exactamente lo que el barrido promete.

       Y HAY UNA LECCION DE MEDICION QUE VALE MAS QUE LA TABLA. La primera vez
       que se probo esto, el parametro `barr` NO EXISTIA en la sonda: se le
       pasaba un tercer argumento que se ignoraba en silencio, los dos lados
       corrian con el barrido ENCENDIDO, y el 60 contra 40 que salio se leyo
       como que el barrido perdia — y con ese numero falso se saco el barrido
       del juego. Lo que lo delato fue un `assert` del parche. Por eso la sonda
       devuelve `barr` ahora: un lado que no cambio se ve de una en el log. */
    if (BOT.barr && amen.length > 1){
      /* la velocidad efectiva a lo largo de la ventana, que no es la de punta:
         la esquiva recorre 105 px en 0,17 s y despues se sigue caminando */
      const vel = P.esqCd <= 0
        ? (ESQ_VEL*ESQ_T + J_VEL*P.mVel*(BOT_VENT - ESQ_T)) / BOT_VENT
        : J_VEL * P.mVel;
      let mx2 = nx, my2 = ny, mejP = 1e9;
      for (let k = 0; k <= BOT_DIRS; k++){
        let dx, dy;
        /* el rumbo 16 es el que elegiria una sola bala: entra como candidato
           para que el caso de siempre pueda ganar por su cuenta */
        if (k === BOT_DIRS){ dx = nx; dy = ny; }
        else { const a = k * 6.2832 / BOT_DIRS; dx = Math.cos(a); dy = Math.sin(a); }
        let pen = 0;
        for (const b of amen){
          const rx = b.x-P.x, ry = b.y-P.y;
          const wx = b.vx - dx*vel, wy = b.vy - dy*vel;
          const w2 = wx*wx + wy*wy; if (w2 < 1) continue;
          let t = -(rx*wx + ry*wy) / w2;
          if (t < 0) t = 0; else if (t > BOT_VENT) t = BOT_VENT;
          const mm = hip(rx + wx*t, ry + wy*t), lim = J_R + b.r;
          /* un impacto pesa cien y un roce pesa lo que le falta para ser roce:
             asi un rumbo que no pega nunca le gana a uno que pega una vez, y
             entre dos que no pegan gana el que pasa mas lejos */
          pen += mm < lim ? 100 + (lim - mm) : Math.max(0, lim + 30 - mm);
        }
        /* Y NO SE ESQUIVA CONTRA UNA PARED NI HACIA UN CUERPO. El barrido
           elegia mirando SOLO las balas, asi que la respuesta correcta contra el
           abanico podia ser clavarse en un muro o caminar derecho a un bruto:
           medido con el barrido a ciegas, el jefe2 bajo de 21 muertes a 14 y el
           bruto SUBIO de 10 a 17. Un muro pesa menos que un impacto --mejor
           raspar la pared que comerse la bala-- y meterse en el alcance de un
           cuerpo pesa lo mismo que el impacto, porque cuesta lo mismo. */
        if (!botLibre(dx, dy)) pen += 60;
        for (const e of JU.enemV){
          if (!e.vivo) continue;
          const D2 = ENEM[e.cl];
          if (D2.f > 0 && !D2.expl) continue;
          const ex = e.x - (P.x + dx*vel*BOT_VENT), ey = e.y - (P.y + dy*vel*BOT_VENT);
          const de = hip(ex, ey), alc2 = (D2.expl || D2.a) + J_R + 10;
          if (de < alc2 + 40) pen += alc2 + 40 - de;
        }
        /* a igualdad gana el mas parecido al de una bala: sin esto el rumbo
           salta de un cuadro al otro y no se recorre ninguno */
        pen += (1 - (dx*nx + dy*ny)) * .5;
        if (pen < mejP){ mejP = pen; mx2 = dx; my2 = dy; }
      }
      nx = mx2; ny = my2;
    }
    if (P.esqCd <= 0){ ENT.esq = true; ENT.x = nx; ENT.y = ny; return; }
    /* SIN ESQUIVA TAMBIEN SE SALE, CAMINANDO. Medido: de 292 balas que pegaron,
       288 llegaron con la esquiva en enfriamiento y CERO llegaron tarde — o sea
       que la esquiva anda y lo que faltaba es la respuesta para cuando no esta.
       Y alcanza de sobra: el pasillo peligroso mide 27 px de ancho y caminando
       se recorren 113 en los 0,55 s de la ventana. Sin esto el bot se caia al
       bloque de pelea y seguia orbitando con una bala encima. */
    botVa(P.x + nx*90, P.y + ny*90);
    return;
  }

  /* UN CORAZON EN EL PISO SOLO EXISTE SI YA TE PEGARON: `caeBotin` no suelta
     nada con la barra llena. Asi que levantarlo no es un desvio, es la otra
     mitad de la economia del piso — y el bot no la jugaba: no hay UNA linea
     sobre `s.cor` en todo `botPaso`. Medido, el piso 5 cobraba 6,29 y curaba
     0,71, o sea que lo que se levantaba era de casualidad, pasandole por
     encima mientras se orbitaba. Un auto-jugador que se saltea una mecanica
     entera no esta midiendo el juego que se juega.
     CON LA SALA LIMPIA SE VA SIEMPRE —es gratis, el corazon no se vence— y
     PELEANDO solo si falta mas de uno y hay linea limpia: cruzar la sala a
     ciegas por media curacion cuesta mas de lo que devuelve. */
  if (s.cor && P.vida < P.vidaMax){
    let cc = null, cd = 1e9;
    for (const c of s.cor){
      if (c.tomado) continue;
      const d = hip(c.x-P.x, c.y-P.y);
      if (d < cd){ cd = d; cc = c; }
    }
    if (cc && (s.limpia || (P.vida <= P.vidaMax-2 && visto(s, P.x, P.y, cc.x, cc.y)))){
      /* EL ULTIMO TRAMO VA DERECHO AL CORAZON Y NO A SU CELDA. `botPunto` deja
         en el CENTRO de la celda y el radio de levantar son 26 px sobre una
         celda de 48: un corazon contra la esquina de su celda queda a 34 y no
         se levanta nunca — el bot llegaria, se plantaria encima y no lo tomaria. */
      if (cd < 70) botVa(cc.x, cc.y); else botPunto(cc.x, cc.y);
      return;
    }
  }

  if (!s.limpia){
    /* pelear: sostener distancia del mas cercano */
    let m = null, md = 1e9;
    for (const e of JU.enemV){
      if (!e.vivo) continue;
      const d = hip(e.x-P.x, e.y-P.y);
      if (d < md){ md = d; m = e; }
    }
    if (m){
      /* SIN TIRO NO HAY DISTANCIA QUE MANTENER. El plante de PELEA_D supone
         que la bala llega; con una pared en el medio lo unico que hace es
         quedarse quieto a tiro de nadie. */
      if (!visto(s, P.x, P.y, m.x, m.y)){ botPunto(m.x, m.y); return; }
      const dx = (P.x-m.x)/(md||1), dy = (P.y-m.y)/(md||1);
      const quiero = PELEA_D;
      if (md < quiero-25)      botPunto(P.x + dx*90, P.y + dy*90);
      else if (md > quiero+55) botPunto(m.x, m.y);
      else {                                   // orbitar
        botPunto(P.x - dy*80, P.y + dx*80);
      }
    }
    return;
  }

  /* limpia: a la escalera, o a la puerta que lleva hacia ella */
  if (s.esc){ botCelda(s.esc.cx, s.esc.cy); return; }
  if (cofreVale(s.cofre)){ botCelda(s.cofre.cx, s.cofre.cy); return; }
  /* AL COFRE ANTES QUE A LA ESCALERA, y esto no es una preferencia del bot: es
     la unica forma de que el bot juegue el juego que se juega. El cofre cuelga
     de una RAMA muerta del camino (c.js: `extra` -> tipo 'cofre'), asi que la
     ruta mas corta a la escalera NO PASA POR EL NUNCA — y el unico codigo de
     cofre que habia miraba `s.cofre` de la sala en la que ya se estaba parado.
     Medido antes de tocar nada: 1 a 2 cofres por piso del 2 al 8 y **CERO
     abiertos en 24 corridas**, o sea que el bot terminaba los nueve pisos con
     la pistola pelada (34,6 de dano por segundo contra 95,7 de la cruz) y el
     dano por segundo se quedaba plano en 69-82 mientras los pisos escalaban.
     Y el desvio NO ES GRATIS: la sala del cofre trae tres enemigos, asi que se
     paga con una pelea. Esa es exactamente la apuesta que el juego propone. */
  let destino = JU.pisoObj.salas.findIndex(x => cofreVale(x.cofre));
  if (destino < 0) destino = JU.pisoObj.salas.findIndex(x => x.esc);
  const r = rutaSalas(JU.salaIx, destino < 0 ? 0 : destino);
  const sig = r.length ? r[0] : -1;
  let kk = null;
  for (const k in s.vec) if (s.vec[k] === sig) kk = k;
  if (!kk) for (const k in s.vec){ kk = k; break; }
  if (kk){
    const p = PUERTA_C[kk];
    botCelda(p.x, p.y);
  }
}
