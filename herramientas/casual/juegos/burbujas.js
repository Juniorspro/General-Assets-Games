/* ══════════════════════════════ BURBUJAS ══════════════════════════════
   Se apunta con el dedo y se dispara. Tres o más del mismo color que se toquen
   revientan, y lo que queda colgando sin agarre se cae.

   POR QUE ESTE GENERO: es el unico de los cinco donde el jugador puede pensar
   un tiro y ejecutarlo mal, o pensarlo mal y ejecutarlo bien — o sea que tiene
   dos habilidades distintas encima de la misma mecanica. Y el rebote en las
   paredes es lo que lo hace enganchar: el tiro imposible existe.

   ── LA REJA ES HEXAGONAL Y ESO ORDENA TODO LO DEMAS ──
   Las filas pares llevan `COLS` burbujas y las impares `COLS-1`, corridas medio
   diametro. De ahi salen los vecinos, y los vecinos son los que deciden el
   racimo y quien queda colgando. Escritos a mano por fila darian seis casos;
   salen de la paridad de la fila en dos lineas. */

const B_NIVELES = 120;
const B_COLS = 9;
const B_COL = ['#e0553f','#3fa9e0','#f2c33c','#63c96a','#b06ae0','#4fd8c6','#e0873f'];

let B_g = [];                  /* B_g[fila][col] = color, o -1 */
let B_r = 36, B_x0 = 36, B_y0 = 150, B_paso = 62;
let B_bola = null;             /* la que viaja */
let B_cola = [];               /* la actual y la siguiente */
let B_ang = -Math.PI/2, B_apunta = false;
let B_tiros = 0, B_tope = 30, B_quedan = 0, B_pop = 0;
let B_azar = 5;
let B_caen = [];               /* las que se caen, cosmético */
function bAz(){ B_azar = (B_azar*1664525 + 1013904223) >>> 0; return B_azar / 4294967296; }

function bAncho(f){ return (f & 1) ? B_COLS - 1 : B_COLS; }
function bXY(f, c){
  return { x: B_x0 + B_r + c*B_r*2 + ((f & 1) ? B_r : 0), y: B_y0 + f*B_paso };
}
/* los seis vecinos de una celda: los dos de su fila y dos arriba y dos abajo,
   y cuáles son los de arriba depende de la paridad */
function bVec(f, c){
  const p = f & 1;
  return [[f, c-1], [f, c+1],
          [f-1, p ? c : c-1], [f-1, p ? c+1 : c],
          [f+1, p ? c : c-1], [f+1, p ? c+1 : c]];
}
/* ── EL CHOQUE SE BUSCA CERCA Y NO EN TODA LA REJA, Y ESO SE MIDIO ──
   La primera version escaneaba las ochenta y una celdas en cada subpaso. En el
   juego se nota poco —tres subpasos por cuadro— pero el buscador de angulo
   simula CINCUENTA Y TRES tiros por disparo, y ahi son millones de
   comparaciones: el auto-jugador de veinte niveles no termino en diez minutos.
   La burbuja solo puede chocar con una celda que este a menos de dos radios, o
   sea su fila y las dos de al lado, y tres columnas: nueve celdas en vez de
   ochenta y una. Y va en UNA funcion, que la usan el juego, el buscador y la
   mira — con tres copias, el buscador aprobaria tiros que el juego no hace. */
function bChoca(g0, bx, by){
  if (by < B_y0) return true;
  const f0 = Math.round((by - B_y0)/B_paso);
  const lim = (B_r*1.86)*(B_r*1.86);
  for (let f = f0 - 1; f <= f0 + 1; f++){
    if (f < 0 || f >= g0.length) continue;
    const an = bAncho(f);
    const c0 = Math.round((bx - B_x0 - B_r - ((f & 1) ? B_r : 0)) / (B_r*2));
    for (let c = c0 - 1; c <= c0 + 1; c++){
      if (c < 0 || c >= an || g0[f][c] < 0) continue;
      const p = bXY(f, c);
      const dx = p.x - bx, dy = p.y - by;
      if (dx*dx + dy*dy < lim) return true;
    }
  }
  return false;
}
/* la celda libre mas cercana, pegada al techo o a otra burbuja */
function bCelda(g0, bx, by){
  const f0 = Math.round((by - B_y0)/B_paso);
  let mf = -1, mc = -1, md = 1e9;
  for (let f = Math.max(0, f0 - 2); f <= f0 + 2; f++){
    while (f >= g0.length) g0.push(new Array(bAncho(g0.length)).fill(-1));
    for (let c = 0; c < bAncho(f); c++){
      if (g0[f][c] >= 0) continue;
      if (f > 0){
        let ap = false;
        for (const [nf, nc] of bVec(f, c)){
          if (nf < 0 || nf >= g0.length || nc < 0 || nc >= bAncho(nf)) continue;
          if (g0[nf][nc] >= 0){ ap = true; break; }
        }
        if (!ap) continue;
      }
      const p = bXY(f, c);
      const d = (p.x - bx)*(p.x - bx) + (p.y - by)*(p.y - by);
      if (d < md){ md = d; mf = f; mc = c; }
    }
  }
  return mf < 0 ? null : [mf, mc];
}
function bDe(f, c){
  if (f < 0 || f >= B_g.length || c < 0 || c >= bAncho(f)) return -2;   /* afuera */
  return B_g[f][c];
}

function bGeo(){
  /* el radio sale del ancho: nueve columnas en 720 con margen. Y el margen es
     el mismo a los dos lados, porque el rebote se calcula contra él. */
  B_r = Math.floor((AN - 24) / (B_COLS*2));
  B_x0 = (AN - B_COLS*B_r*2)/2;
  B_paso = Math.round(B_r*1.732);
  /* el techo arranca debajo del HUD: con 168 la primera fila quedaba pegada al
     rotulo QUEDAN, medido en la captura */
  B_y0 = 196 + B_r;
}
/* la línea de la que se dispara y la de perder */
function bCanon(){ return { x: AN/2, y: AL - 190 }; }
function bMuerte(){ return AL - 250; }

/* ── EL RACIMO: RELLENO POR VECINOS DEL MISMO COLOR ──
   Y lo usan el jugador y el auto-jugador, o sea que hay UNA regla. Con dos, el
   validador aprueba tiros que el juego no acepta. */
function bRacimo(f0, c0){
  const col = bDe(f0, c0);
  if (col < 0) return [];
  const vis = new Set([f0 + ',' + c0]);
  const pila = [[f0, c0]], out = [[f0, c0]];
  while (pila.length){
    const [f, c] = pila.pop();
    for (const [nf, nc] of bVec(f, c)){
      if (bDe(nf, nc) !== col) continue;
      const k = nf + ',' + nc;
      if (vis.has(k)) continue;
      vis.add(k); pila.push([nf, nc]); out.push([nf, nc]);
    }
  }
  return out;
}
/* ── LO QUE QUEDA COLGANDO SE CAE, Y ES LA MITAD DE LA GRACIA ──
   Sin esto, reventar tres burbujas revienta tres burbujas. Con esto, un tiro
   bien puesto se lleva media pantalla, y ESO es lo que hace que valga la pena
   pensar el tiro. Se calcula al revés: lo que está agarrado del techo se marca
   desde la fila 0, y todo lo demás se cae. */
function bColgando(){
  const ag = new Set();
  const pila = [];
  for (let c = 0; c < bAncho(0); c++) if (B_g[0][c] >= 0){ ag.add('0,' + c); pila.push([0, c]); }
  while (pila.length){
    const [f, c] = pila.pop();
    for (const [nf, nc] of bVec(f, c)){
      if (bDe(nf, nc) < 0) continue;
      const k = nf + ',' + nc;
      if (ag.has(k)) continue;
      ag.add(k); pila.push([nf, nc]);
    }
  }
  const out = [];
  for (let f = 0; f < B_g.length; f++) for (let c = 0; c < bAncho(f); c++)
    if (B_g[f][c] >= 0 && !ag.has(f + ',' + c)) out.push([f, c]);
  return out;
}
function bCuenta(){
  let n = 0;
  for (let f = 0; f < B_g.length; f++) for (let c = 0; c < bAncho(f); c++)
    if (B_g[f][c] >= 0) n++;
  return n;
}
function bColores(){
  const s = new Set();
  for (let f = 0; f < B_g.length; f++) for (let c = 0; c < bAncho(f); c++)
    if (B_g[f][c] >= 0) s.add(B_g[f][c]);
  return [...s];
}

/* ── LA COLA NO DA COLORES QUE NO SIRVEN ──
   Con un color al azar de la paleta, en un tablero de dos colores se recibe una
   burbuja de un tercer color que no puede reventar nada: eso no es dificultad,
   es un tiro perdido que el jugador no pudo evitar. Sale de los colores que
   HAY en el tablero. */
function bSorteaColor(){
  const cs = bColores();
  if (!cs.length) return 0;
  return cs[Math.floor(bAz()*cs.length)];
}
function bLlenaCola(){
  while (B_cola.length < 2) B_cola.push(bSorteaColor());
  /* y si un color de la cola dejó de existir en el tablero, se cambia: lo
     mismo de arriba, pero después de un tiro que se llevó el último de su
     color */
  const cs = bColores();
  for (let i = 0; i < B_cola.length; i++)
    if (cs.length && cs.indexOf(B_cola[i]) < 0) B_cola[i] = bSorteaColor();
}

function bConf(n){
  /* ── LA CURVA SE RETOCO PORQUE LOS NIVELES ALTOS ERAN IMPOSIBLES ──
     La primera version llegaba a NUEVE filas y SIETE colores, y medido con el
     auto-jugador sobre los niveles 100 a 119: limpio CERO de veinte. No era el
     presupuesto de tiros —varios terminaron con veinte tiros de sobra y
     perdieron por llegar a la linea de abajo—: era que un tablero de nueve
     filas con siete colores no se puede vaciar hasta cero, porque con siete
     colores los racimos casi no se forman y cada burbuja que se pega empuja el
     tablero mas abajo.

     Y la auditoria del generador NO lo veia, porque mira como NACE el tablero y
     no si se puede terminar. Lo unico que lo encontro fue jugarlo.

     La dificultad pasa a venir de la densidad y del presupuesto, que son las
     dos palancas que no rompen la partida: cinco colores como maximo y siete
     filas como maximo. */
  const col = Math.min(5, 3 + Math.floor((n - 1)/40));
  const filas = Math.min(7, 4 + Math.floor((n - 1)/24));
  /* la densidad sube con el nivel: con todo lleno desde el nivel 1 no hay por
     dónde entrar y el primer tiro es a ciegas */
  const dens = Math.min(0.90, 0.62 + n*0.0022);
  return { col, filas, dens };
}
function bGenera(n){
  const cf = bConf(n);
  B_azar = (n*2246822519 + 7717) >>> 0;
  const g = [];
  for (let f = 0; f < cf.filas; f++){
    const fila = [];
    for (let c = 0; c < bAncho(f); c++){
      /* la fila 0 va siempre llena: es la que agarra del techo, y con agujeros
         la mitad del tablero nace colgando y se cae en el primer cuadro */
      const lleno = f === 0 ? true : bAz() < cf.dens;
      fila.push(lleno ? Math.floor(bAz()*cf.col) : -1);
    }
    g.push(fila);
  }
  /* ── LO QUE NACE COLGANDO SE SACA ANTES DE EMPEZAR ──
     Medido con la auditoria: sesenta burbujas en ciento veinte niveles nacian
     sin agarre del techo, o sea que el nivel arrancaba cayendose solo y el
     jugador se llevaba un regalo que no jugo. Con el tablero ya armado, la
     misma funcion que decide quien se cae en partida dice quien no tendria que
     haber nacido. */
  const guard = B_g; B_g = g;
  for (const [f, c] of bColgando()) g[f][c] = -1;
  B_g = guard;
  return { g, col: cf.col, filas: cf.filas };
}

const JT = {
  es: { sub:'Apuntá y dispará. Tres del mismo color revientan.',
        c1:'Apuntá con el dedo y soltá.',
        c2:'Tres del mismo color que se toquen, revientan.',
        c3:'Lo que queda colgando se cae solo. Limpiá el tablero.',
        tirosC:'TIROS', quedanC:'QUEDAN' },
  en: { sub:'Aim and shoot. Three of a colour pop.',
        c1:'Aim with your finger and let go.',
        c2:'Three touching bubbles of a colour pop.',
        c3:'Anything left hanging falls. Clear the board.',
        tirosC:'SHOTS', quedanC:'LEFT' },
  pt: { sub:'Mire e atire. Três da mesma cor estouram.',
        c1:'Mire com o dedo e solte.',
        c2:'Três da mesma cor que se toquem estouram.',
        c3:'O que fica pendurado cai sozinho. Limpe o tabuleiro.',
        tirosC:'TIROS', quedanC:'FALTAM' }
};
const PIEL = { ac:'#3fa9e0', tela:'fondo' };
const SON_ALIAS = { bien:'pop', toque:'tiro', pierde:'perder', gana:'gana', clic:'clic' };

const JUEGO = {
  id: 'burbujas',
  tipo: 'niveles',
  nivelesTotal: B_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return B_quedan; },
  get sub(){ return TX('quedanC'); },
  get ficI(){ return TX('nivel') + ' ' + NIVEL; },
  get ficD(){ return TX('tirosC') + ' ' + (B_tope - B_tiros); },
  get resta(){ return B_tope ? Math.max(0, (B_tope - B_tiros)/B_tope) : null; },
  /* no hay `deshacer`: un tiro ya salio y no se puede devolver. El nucleo ve
     que el metodo no esta y no dibuja el boton. */
  puedeDeshacer: false,

  planos: [
    { dur: 2.8, pie: 'c1', dibuja(g, u){
        bFondo(g);
        bDemo(g, 3);
        const a = -Math.PI/2 + Math.sin(u*3.4)*0.55;
        bMira(g, a, 1);
        bBurbuja(g, bCanon().x, bCanon().y, B_r, 0);
      } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){
        bFondo(g);
        bDemo(g, 3);
        /* tres del mismo color creciendo y reventando: la regla sin palabras */
        const s = Math.min(1, u*1.5);
        const cen = bXY(1, 3);
        for (let i = 0; i < 3; i++){
          const p = bXY(1, 2 + i);
          if (s < 0.8) bBurbuja(g, p.x, p.y, B_r, 0);
          else {
            const q = (s - 0.8)/0.2;
            g.save(); g.globalAlpha = 1 - q;
            bBurbuja(g, p.x, p.y, B_r*(1 + q*0.5), 0);
            g.restore();
          }
        }
        if (s >= 0.8) disco(cen.x, cen.y, B_r*(1 + (s-0.8)*7), 'rgba(224,85,63,.16)');
      } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){
        bFondo(g);
        /* las de arriba se van y las de abajo caen: eso es lo que hace que un
           tiro valga media pantalla */
        const s = suave(Math.min(1, u*1.3));
        for (let f = 0; f < 4; f++) for (let c = 0; c < bAncho(f); c++){
          const p = bXY(f, c);
          if (f === 0 && c > 2 && c < 6) continue;
          const cae = f > 0 && c > 2 && c < 6;
          g.save();
          if (cae){ g.globalAlpha = 1 - s; }
          bBurbuja(g, p.x, p.y + (cae ? s*s*520 : 0), B_r, (f + c) % 4);
          g.restore();
        }
      } }
  ],

  arranca(n){
    bGeo();
    const gen = bGenera(n || 1);
    B_g = gen.g;
    B_cola.length = 0;
    B_azar = ((n||1)*77771 + 3) >>> 0;
    bLlenaCola();
    B_bola = null; B_caen.length = 0;
    B_ang = -Math.PI/2; B_apunta = false;
    B_tiros = 0; B_pop = 0;
    B_quedan = bCuenta();
    /* ── EL PRESUPUESTO DE TIROS SALE DE LA CANTIDAD DE BURBUJAS ──
       Escrito a mano sería un número que no tiene nada que ver con el tablero:
       un nivel de treinta burbujas y uno de setenta necesitan presupuestos
       distintos. Un tiro bueno se lleva tres o más, así que el piso teórico es
       burbujas/3; con el doble hay aire para errar y sigue exigiendo pensar. */
    /* ── EL PRESUPUESTO SALIO DE MEDIR, NO DE ESTIMAR ──
       Con `quedan/3 * 2` el auto-jugador limpiaba TRES niveles de veinte y en
       los otros diecisiete se quedaba sin tiros con una a trece burbujas
       puestas. La cuenta ingenua supone que cada tiro se lleva tres, y eso es
       falso justo al final: una burbuja aislada no puede reventar hasta que
       tenga dos compañeras del mismo color al lado, o sea que cuesta TRES
       tiros y no uno. El presupuesto es el piso teorico por tres y medio, y
       eso es lo que el auto-jugador demuestra que alcanza. */
    /* ── Y EL PISO IMPORTA MAS QUE EL FACTOR EN LOS TABLEROS CHICOS ──
       Con `max(16, ...)` el auto-jugador limpiaba veinte de veinte; despues
       BAJE EL TECHO 28 unidades para que la primera fila no quedara pegada al
       HUD, y con eso cambiaron todas las trayectorias y dos niveles —el 5 y el
       12— se quedaron sin tiros con una y dos burbujas puestas. El presupuesto
       estaba justo y no se sabia. En un tablero chico cada burbuja cuesta mas,
       porque hay menos vecinos con los que armar racimo: el piso sube a 18 y se
       le suman cuatro de aire. LECCION: cualquier cambio de geometria mueve el
       resultado del auto-jugador, asi que hay que volver a correrlo. */
    B_tope = Math.max(18, Math.ceil(B_quedan/3 * 4.0) + 5);
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
  },

  paso(dt){
    bGeo();
    for (let i = B_caen.length - 1; i >= 0; i--){
      const c = B_caen[i];
      c.vy += 2400*dt; c.y += c.vy*dt; c.x += c.vx*dt;
      if (c.y > AL + 80) B_caen.splice(i, 1);
    }
    if (B_pop > 0) B_pop = Math.max(0, B_pop - dt*2.4);
    if (!B_bola) return;
    /* ── SE AVANZA EN PASOS CHICOS Y NO DE UN SALTO ──
       A 1500 unidades por segundo, un paso de 1/60 son veinticinco unidades: la
       burbuja pasa POR ENCIMA de otra sin tocarla y se clava en el techo. Con
       subpasos de un cuarto de radio eso no puede pasar. */
    const v = 1500;
    let resta = v*dt;
    const sub = B_r*0.25;
    while (resta > 0 && B_bola){
      const d = Math.min(sub, resta);
      resta -= d;
      B_bola.x += Math.cos(B_bola.a)*d;
      B_bola.y += Math.sin(B_bola.a)*d;
      /* el rebote: contra las paredes de la reja y no contra el borde de la
         pantalla, porque la reja tiene margen y si no la burbuja se clavaría
         media unidad afuera de la primera columna */
      if (B_bola.x < B_x0 + B_r){ B_bola.x = B_x0 + B_r; B_bola.a = Math.PI - B_bola.a; son('clic', 0.35); }
      if (B_bola.x > AN - B_x0 - B_r){ B_bola.x = AN - B_x0 - B_r; B_bola.a = Math.PI - B_bola.a; son('clic', 0.35); }
      if (bChoca(B_g, B_bola.x, B_bola.y)){ this.pega(); break; }
      if (B_bola.y > AL + 60){ B_bola = null; break; }
    }
  },

  /* la burbuja se clava en la celda LIBRE más cercana a donde llegó */
  pega(){
    const b = B_bola; B_bola = null;
    if (!b) return;
    const cel = bCelda(B_g, b.x, b.y);
    if (!cel) return;
    const mf = cel[0], mc = cel[1];
    B_g[mf][mc] = b.col;
    const rac = bRacimo(mf, mc);
    if (rac.length >= 3){
      for (const [f, c] of rac){
        const p = bXY(f, c);
        chispas(p.x, p.y, 8, B_COL[B_g[f][c]], 150);
        B_g[f][c] = -1;
      }
      son('bien', 0.8);
      sumaPuntos(rac.length*10, bXY(mf, mc).x, bXY(mf, mc).y - 30);
      B_pop = 1;
      sacude(0.10 + rac.length*0.012);
      const cae = bColgando();
      if (cae.length){
        for (const [f, c] of cae){
          const p = bXY(f, c);
          B_caen.push({ x: p.x, y: p.y, vx: (bAz()-0.5)*120, vy: -60, col: B_g[f][c] });
          B_g[f][c] = -1;
        }
        /* lo que se cae paga el doble: es el premio del tiro pensado, y sin la
           diferencia de puntos reventar tres al azar valdría lo mismo */
        sumaPuntos(cae.length*20, AN/2, AL*0.5);
        fogonazo(0.22);
        sacude(0.24);
        son('gana', 0.5);
      }
    } else {
      son('caida', 0.5);
    }
    B_quedan = bCuenta();
    bLlenaCola();
    if (B_quedan === 0){
      this.gano = true;
      const usados = B_tiros;
      /* tres estrellas es gastar menos de la mitad del presupuesto: es el mismo
         criterio que en TUBOS —la vara sale del tablero y no de un número
         escrito— y ahí se puede medir si es alcanzable */
      this.estrellas = usados <= Math.ceil(B_tope*0.5) ? 3
                     : (usados <= Math.ceil(B_tope*0.75) ? 2 : 1);
      this.finP = TX('tirosC') + ' ' + usados + ' / ' + B_tope;
      this.vivo = false;
      return;
    }
    /* ── SE PIERDE POR TIROS O POR LLEGAR ABAJO, Y LAS DOS TIENEN QUE ESTAR ──
       Solo por tiros, un tablero que baja hasta el cañón sigue jugable y se ve
       roto. Solo por altura, un nivel casi limpio se estira para siempre. */
    let bajo = false;
    for (let f = B_g.length - 1; f >= 0 && !bajo; f--)
      for (let c = 0; c < bAncho(f); c++)
        if (B_g[f][c] >= 0 && bXY(f, c).y + B_r > bMuerte()){ bajo = true; break; }
    if (bajo || B_tiros >= B_tope){ this.gano = false; this.vivo = false; }
  },

  baja(x, y){ B_apunta = true; this.mueve(x, y); },
  mueve(x, y){
    if (!B_apunta) return;
    const c = bCanon();
    let a = Math.atan2(y - c.y, x - c.x);
    /* el ángulo se topa: apuntando casi horizontal la burbuja rebota para
       siempre entre las dos paredes y nunca llega a nada */
    const lim = 1.30;
    if (a > -Math.PI/2 + lim) a = -Math.PI/2 + lim;
    if (a < -Math.PI/2 - lim) a = -Math.PI/2 - lim;
    B_ang = a;
  },
  sube(){
    if (!B_apunta) return;
    B_apunta = false;
    this.dispara();
  },
  dispara(){
    if (B_bola || !B_cola.length) return false;
    const c = bCanon();
    B_bola = { x: c.x, y: c.y, a: B_ang, col: B_cola.shift() };
    bLlenaCola();
    B_tiros++;
    son('toque', 0.8);
    return true;
  },

  fondo(g){ bGeo(); bFondo(g); },

  pinta(g){
    /* la línea de perder: se ve siempre, porque es información permanente y no
       un aviso — a diferencia de la de FRUTAS, que sólo importa cuando amenaza */
    g.save();
    g.globalAlpha = 0.22;
    g.strokeStyle = '#e0553f'; g.lineWidth = 3; g.setLineDash([14, 12]);
    g.beginPath(); g.moveTo(0, bMuerte()); g.lineTo(AN, bMuerte()); g.stroke();
    g.setLineDash([]);
    g.restore();
    for (let f = 0; f < B_g.length; f++) for (let c = 0; c < bAncho(f); c++){
      if (B_g[f][c] < 0) continue;
      const p = bXY(f, c);
      bBurbuja(g, p.x, p.y, B_r, B_g[f][c]);
    }
    for (const c of B_caen) bBurbuja(g, c.x, c.y, B_r, c.col);
    if (B_bola) bBurbuja(g, B_bola.x, B_bola.y, B_r, B_bola.col);
    const c = bCanon();
    if (!B_bola) bMira(g, B_ang, B_apunta ? 1 : 0.4);
    /* el cañón: la que se dispara adentro y la siguiente al costado y más
       chica. Sin la siguiente no se puede planear dos tiros, y planear dos
       tiros es de lo que vive este juego. */
    bCanonDib(g, c.x, c.y, B_r);
    if (B_cola[0] !== undefined && !B_bola) bBurbuja(g, c.x, c.y, B_r, B_cola[0]);
    if (B_cola[1] !== undefined) bBurbuja(g, c.x + B_r*2.6, c.y + 6, B_r*0.66, B_cola[1]);
  },

  /* ── EL AUTO-JUGADOR ES LO QUE DEMUESTRA QUE UN NIVEL SE PUEDE LIMPIAR ──
     Un tablero generado y no jugado es un nivel roto que todavia no se sabe.
     Prueba los angulos de a poco, simula el tiro con la MISMA fisica del juego
     —el mismo rebote, el mismo choque— y se queda con el que revienta mas. Si
     ninguno revienta nada, tira al que deja la burbuja mas arriba, que es lo
     que hace una persona cuando no ve jugada. */
  juegaSolo(n, azar){
    const res = [];
    /* `n` es el nivel por el que empezar: sin eso el auto-jugador solo puede
       probar los primeros veinte, y los que se rompen son los de arriba */
    const desde = Math.max(1, n || 1);
    const hasta = Math.min(B_NIVELES, desde + (azar ? 7 : 19));
    for (let nv = desde; nv <= hasta; nv++){
      /* por la cadena de verdad: `empieza` pone el nivel y `termina` guarda
         las estrellas, asi que el progreso queda probado y no supuesto */
      empieza(nv);
      let vueltas = 0;
      while (this.vivo && vueltas < 4000){
        if (!B_bola){
          if (azar) B_ang = -Math.PI/2 + (bAz()-0.5)*2.4;
          else B_ang = bMejorAngulo(B_cola[0]);
          this.dispara();
        }
        this.paso(1/60);
        vueltas++;
      }
      if (!this.vivo) termina();
      res.push({ n: nv, gano: !!this.gano, tiros: B_tiros, tope: B_tope,
                 est: this.estrellas, quedan: B_quedan });
    }
    const malos = res.filter(r => !r.gano);
    return { probados: res.length, limpiados: res.length - malos.length,
             malos: malos.map(r => ({ n: r.n, quedan: r.quedan, tiros: r.tiros + '/' + r.tope })),
             est3: res.filter(r => r.est === 3).length,
             muestra: res.slice(0, 6) };
  },

  audita(desde, hasta){
    const out = [];
    let minB = 999, maxB = 0, sumB = 0, n = 0, colgados = 0;
    for (let nv = desde; nv <= hasta; nv++){
      const gen = bGenera(nv);
      const guard = B_g; B_g = gen.g;
      const b = bCuenta();
      /* una burbuja que nace colgando se cae en el primer cuadro y el nivel
         arranca con un regalo: se cuenta, porque no se ve jugando */
      colgados += bColgando().length;
      B_g = guard;
      if (b < 6) out.push(nv);
      minB = Math.min(minB, b); maxB = Math.max(maxB, b); sumB += b; n++;
    }
    return { desde, hasta, muyChicos: out, colgadosAlNacer: colgados,
             burbMin: minB, burbMax: maxB, burbMedia: +(sumB/Math.max(1,n)).toFixed(1) };
  },

  ver(){
    return { nivel: NIVEL, filas: B_g.length, quedan: B_quedan,
             tiros: B_tiros, tope: B_tope, cola: B_cola.slice(),
             ang: +B_ang.toFixed(3), bola: !!B_bola, caen: B_caen.length,
             colgando: bColgando().length,
             colores: bColores().length,
             geo: { r: B_r, x0: +B_x0.toFixed(1), y0: B_y0, paso: B_paso,
                    muerte: Math.round(bMuerte()) } };
  }
};

/* ── EL BUSCADOR DE ANGULO SIMULA EL TIRO DE VERDAD ──
   Con geometría a mano habría que rehacer el rebote y el choque, y ahí serían
   dos físicas distintas: el buscador aprobaría tiros que el juego no hace. Esto
   copia el tablero, dispara, y mira qué pasó. */
function bMejorAngulo(col){
  const c = bCanon();
  let mejor = -Math.PI/2, mejorP = -1e9;
  /* veintisiete angulos y no cincuenta y tres: la reja tiene nueve columnas,
     asi que dos angulos separados menos de un grado apuntan a la misma celda y
     el segundo es trabajo tirado */
  for (let k = -13; k <= 13; k++){
    const a = -Math.PI/2 + k*0.096;
    if (Math.abs(a + Math.PI/2) > 1.30) continue;
    const r = bSimula(c.x, c.y, a, col);
    if (!r) continue;
    /* lo que se revienta pesa, lo que se cae pesa el doble, y quedar arriba
       vale un poco: es el mismo orden de premios que el juego paga */
    /* revienta > se cae > arrima. Y quedar abajo resta, porque una burbuja
       cerca de la linea de muerte acerca la derrota. */
    const bajo = bXY(r.f, r.c).y + B_r > bMuerte() - B_paso ? -30 : 0;
    const p = r.pop*10 + r.cae*22 + (r.vec||0)*5 + (B_g.length - r.f)*0.4 + bajo;
    if (p > mejorP){ mejorP = p; mejor = a; }
  }
  return mejor;
}
function bSimula(x, y, a, col){
  const g0 = B_g.map(f => f.slice());
  let bx = x, by = y, ba = a;
  const sub = B_r*0.4;
  /* ── EL TOPE DE SUBPASOS SALE DE UNA CUENTA Y NO DE UN NUMERO GRANDE ──
     Con 2000 subpasos de nueve unidades el tiro recorre dieciocho mil unidades,
     o sea doce pantallas: eran mil novecientos subpasos gastados despues de que
     la burbuja ya se clavo o ya se fue. El recorrido mas largo posible es la
     pantalla entera rebotando, y con 300 pasos de 0,4 radios eso sobra. */
  for (let i = 0; i < 300; i++){
    bx += Math.cos(ba)*sub; by += Math.sin(ba)*sub;
    if (bx < B_x0 + B_r){ bx = B_x0 + B_r; ba = Math.PI - ba; }
    if (bx > AN - B_x0 - B_r){ bx = AN - B_x0 - B_r; ba = Math.PI - ba; }
    if (!bChoca(g0, bx, by)){ if (by > AL) return null; continue; }
    const cel = bCelda(g0, bx, by);
    if (!cel) return null;
    const guard = B_g; B_g = g0;
    /* los vecinos del mismo color ANTES de poner la burbuja: es lo que dice si
       el tiro CONSTRUYE un racimo. Sin este termino el bot solo veia los tiros
       que revientan ya, y cuando no habia ninguno tiraba a cualquier parte —
       medido, limpiaba tres niveles de veinte y se quedaba sin tiros con una o
       dos burbujas puestas. Una persona en cambio arrima de a una. */
    let vec = 0;
    for (const [nf, nc] of bVec(cel[0], cel[1]))
      if (bDe(nf, nc) === col) vec++;
    g0[cel[0]][cel[1]] = col;
    const rac = bRacimo(cel[0], cel[1]);
    let pop = 0, cae = 0;
    if (rac.length >= 3){
      pop = rac.length;
      for (const [f, cc] of rac) g0[f][cc] = -1;
      cae = bColgando().length;
    }
    B_g = guard;
    return { f: cel[0], c: cel[1], pop, cae, vec };
  }
  return null;
}

function bBurbuja(g, x, y, r, ci){
  const col = B_COL[ci] || '#888';
  /* ── UNA SOLA BURBUJA BLANCA Y LAS SIETE SALEN TENIDAS ──
     Es una generacion en vez de siete, y ademas no puede pasar que dos colores
     queden con brillos distintos: el brillo especular y el borde de luz son
     literalmente los mismos pixeles en las siete. `tenido()` multiplica sobre
     blanco, asi que el color sale exacto y el gris del cuerpo se convierte en
     el sombreado. */
  if (dibSello('burbujas', x, y, r, 0, col)) return;
  const gr = g.createRadialGradient(x - r*0.32, y - r*0.34, r*0.05, x, y, r*1.02);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.26, col);
  gr.addColorStop(1, 'rgba(0,0,0,.50)');
  g.beginPath(); g.arc(x, y, r*0.96, 0, 7); g.fillStyle = gr; g.fill();
  g.beginPath();
  g.ellipse(x - r*0.30, y - r*0.36, r*0.24, r*0.13, -0.7, 0, 7);
  g.fillStyle = 'rgba(255,255,255,.52)'; g.fill();
}

/* la mira: puntos que se van achicando y NO una línea. Una línea recta miente
   —no muestra el rebote— y encima tapa las burbujas que hay que mirar. */
function bMira(g, a, alfa){
  const c = bCanon();
  let x = c.x, y = c.y, ang = a;
  g.save();
  g.globalAlpha = 0.30 + 0.45*alfa;
  const sub = B_r*0.5;
  for (let i = 0; i < 46; i++){
    x += Math.cos(ang)*sub*2; y += Math.sin(ang)*sub*2;
    if (x < B_x0 + B_r){ x = B_x0 + B_r; ang = Math.PI - ang; }
    if (x > AN - B_x0 - B_r){ x = AN - B_x0 - B_r; ang = Math.PI - ang; }
    if (y < B_y0) break;
    /* la mira se corta donde chocaría: así muestra exactamente hasta dónde
       llega el tiro, rebote incluido */
    if (bChoca(B_g, x, y)) break;
    g.beginPath();
    g.arc(x, y, Math.max(1.6, 5 - i*0.09), 0, 7);
    g.fillStyle = '#f2eee6'; g.fill();
  }
  g.restore();
}
function bCanonDib(g, x, y, r){
  g.save();
  g.beginPath(); g.arc(x, y, r*1.34, 0, 7);
  g.fillStyle = 'rgba(7,7,11,.55)'; g.fill();
  g.lineWidth = 4; g.strokeStyle = 'rgba(242,238,230,.34)'; g.stroke();
  g.restore();
}
function bDemo(g, filas){
  bGeo();
  for (let f = 0; f < filas; f++) for (let c = 0; c < bAncho(f); c++){
    const p = bXY(f, c);
    bBurbuja(g, p.x, p.y, B_r, (f*2 + c) % 5);
  }
}
function bFondo(g){
  if (dibCubre('fondo')) return;
  const gr = g.createLinearGradient(0, 0, 0, AL);
  gr.addColorStop(0, '#101a3a');
  gr.addColorStop(0.55, '#16274f');
  gr.addColorStop(1, '#0a1024');
  g.fillStyle = gr; g.fillRect(0, 0, AN, AL);
  /* el techo del que cuelgan: sin él la primera fila flota y no se entiende de
     qué está agarrado el tablero */
  g.fillStyle = 'rgba(242,238,230,.10)';
  g.fillRect(0, 0, AN, B_y0 - B_r*0.9);
  g.fillStyle = 'rgba(242,238,230,.18)';
  g.fillRect(0, B_y0 - B_r*0.9 - 4, AN, 4);
}
