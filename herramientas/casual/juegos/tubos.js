/* ══════════════════════════════ TUBOS ══════════════════════════════
   Tubos con bolas de colores mezcladas. Se pasa una bola de un tubo a otro y
   sólo se puede apoyar sobre una del mismo color o en un tubo vacío. Gana
   cuando cada tubo tiene un solo color.

   POR QUE ESTE GENERO: es el rompecabezas mas puro que existe para telefono —
   un solo verbo (tocar un tubo), cero destreza, y la dificultad sale de la
   cantidad de colores y no de la velocidad. Se puede jugar con una mano en el
   colectivo y se puede dejar a mitad de un nivel.

   ── UN NIVEL GENERADO Y NO COMPROBADO ES UN NIVEL ROTO QUE TODAVIA NO SE SABE ──
   Es la regla del repo y acá es todo el trabajo. NO se generan bolas al azar y
   se cruzan los dedos: se arranca del estado RESUELTO y se aplica una serie de
   movidas legales AL REVES, así que la solución existe por construcción. Y
   encima corre un solver que la encuentra, porque «existe» y «se encuentra en
   un rato razonable» no son lo mismo: un nivel cuya única solución tiene
   cuarenta movidas exactas es imposible de jugar aunque sea resoluble. El
   solver devuelve el largo del camino más corto, y de ahí sale el presupuesto
   de movidas para las tres estrellas. */

const T_NIVELES = 200;
const T_ALTO = 4;                  /* bolas por tubo */
/* ── LOS DOCE COLORES ESTAN SEPARADOS A PROPOSITO ──
   En un nivel de once colores, dos tonos parecidos no son un detalle estetico:
   el jugador apoya una bola sobre la equivocada y pierde una movida por algo
   que no pudo ver. La primera paleta tenia amarillo y amarillo-verdoso, y verde
   y turquesa, los cuatro pegados. Esta separa por TONO y ademas por claridad —
   hay un blanco y un marron, que no se confunden con nada. */
const T_COL = ['#e0553f','#3fa9e0','#63c96a','#f2c33c','#b06ae0','#f2f0e8',
               '#e0873f','#3f4fb0','#2f8f5f','#e05f9b','#4fd8c6','#8a6a4a'];

let T_tubos = [];                  /* [[color,...], ...] de abajo hacia arriba */
let T_nCol = 4, T_nTubos = 6, T_vacios = 2;
let T_sel = -1, T_movs = 0, T_tope = 30, T_min = 10;
let T_hist = [];
let T_anim = null;                 /* la bola que viaja */
let T_azar = 1;
let T_cam = null;              /* el camino corto que encontro el solver */

function tAz(){ T_azar = (T_azar*1664525 + 1013904223) >>> 0; return T_azar / 4294967296; }

/* ── LA DIFICULTAD SALE DEL NIVEL Y ES MONOTONA ──
   Con la cantidad de colores al azar, el nivel 7 puede salir mas dificil que el
   40 y el jugador siente que el juego no lo respeta. Sube por tramos: colores
   de 3 a 11, y los tubos libres bajan de 2 a 1 en la segunda mitad, que es el
   salto de dificultad de verdad — con un solo tubo libre hay que pensar. */
function tConf(n){
  /* ── DOS TUBOS LIBRES SIEMPRE, Y ESO SALIO DE UNA MEDICION ──
     Con uno solo la dificultad sube, si, pero el nivel se vuelve tan profundo
     que el propio solver no lo puede comprobar: medido con la auditoria, los
     niveles 195 a 200 —once colores y un tubo libre— caian en la red de
     seguridad y salian con `min: 1`, o sea un regalo de una movida, y nada
     fallaba. Un nivel que no se puede comprobar no se publica.
     La dificultad la ponen los colores, que es lo que de verdad se siente. */
  const col = Math.min(T_COL.length - 1, 3 + Math.floor((n - 1)/22));
  return { col, vac: 2, tubos: col + 2 };
}

function tClonar(t){ return t.map(a => a.slice()); }
function tCima(a){ return a.length ? a[a.length-1] : -1; }
/* la regla, en un solo sitio: la usan el jugador, el generador y el solver. Con
   tres copias, el solver aprueba un juego que no existe. */
function tPuede(t, i, j){
  if (i === j) return false;
  const a = t[i], b = t[j];
  if (!a.length) return false;
  if (b.length >= T_ALTO) return false;
  if (!b.length) return true;
  return tCima(a) === tCima(b);
}
function tHecho(t){
  for (const a of t){
    if (!a.length) continue;
    if (a.length !== T_ALTO) return false;
    for (const c of a) if (c !== a[0]) return false;
  }
  return true;
}

/* ══════════ EL SOLVER: A* CON UNA COTA POR TUBO ══════════
   ── LA PRIMERA VERSION GENERABA NIVELES TRIVIALES, Y ESO SE MIDIO ──
   Arrancaba del estado resuelto y aplicaba movidas legales AL REVES. Suena
   correcto —la solucion existe por construccion— y en la practica no sirve: un
   paseo al azar sobre el grafo de estados DESHACE lo que acaba de hacer, asi
   que el tablero se queda a dos o tres movidas de estar resuelto. Medido con la
   auditoria sobre los primeros cuarenta niveles: `cortoMin 2` y `cortoMax 4`,
   o sea que el nivel 40 —cinco colores— se resolvia en cuatro movidas. Eso no
   es un rompecabezas, es un boton.

   Lo que si funciona es al reves: se REPARTEN las bolas al azar y se comprueba
   que se puede resolver. Un reparto al azar esta lejos del estado resuelto por
   construccion, y lo que hay que demostrar —que hay salida— lo demuestra el
   solver, que es el que ademas devuelve el largo.

   Y ES A* Y NO ANCHURA. La anchura pura visita millones de estados en un nivel
   de once colores y se planta en el tope sin contestar; con la cota de abajo
   encuentra el camino corto visitando unos miles. La cota es exacta y no una
   corazonada: en un tubo cuya bola de abajo es de color c, TODAS las que estan
   por encima del primer cambio de color tienen que salir, y cada una cuesta al
   menos una movida. Nunca sobreestima, asi que el camino que devuelve es el
   mas corto de verdad. */
function tClave(t){
  return t.map(a => a.join(',')).sort().join('|');
}
function tCota(t){
  let h = 0;
  for (const a of t){
    if (!a.length) continue;
    let p = -1;
    for (let i = 1; i < a.length; i++) if (a[i] !== a[0]){ p = i; break; }
    if (p >= 0) h += a.length - p;
  }
  return h;
}
/* ── EL MINIMO ES LA COTA Y NO EL CAMINO MAS CORTO ──
   A* con esta cota encuentra el camino exacto hasta unos siete colores y de ahi
   en adelante se planta: medido, el nivel 150 costaba 260 ms y el 200 no
   contestaba. Y no hace falta el camino exacto para nada — lo que hace falta
   son dos cosas distintas:

     · que el nivel SE PUEDA resolver  -> lo demuestra encontrar UNA solucion
     · una vara justa para las estrellas -> la da la cota, que es exacta y
       gratis: «tantas bolas tienen que salir de su tubo, y cada una cuesta al
       menos una movida». Nadie puede hacerlo en menos que eso, asi que tres
       estrellas es la cota con un poco de aire.

   O sea que la busqueda deja de tener que ser optima y pasa a ser en
   PROFUNDIDAD con las movidas ordenadas, que es lo que la vuelve barata.

   ── Y LAS DOS PODAS SON SEGURAS, NO CORAZONADAS ──
   1. Mover un tubo YA UNIFORME a un tubo vacio no puede hacer falta: lo unico
      que cambia es cual de los dos tubos esta vacio, y un tubo vacio es un tubo
      vacio. 2. Un tubo uniforme y LLENO ya esta terminado y no se toca.
   Sin las dos, la busqueda se pasa la vida barajando tubos que ya estan
   ordenados. */
function tCamDFS(t0, tope){
  const visto = new Set();
  const cam = [];
  let vis = 0;
  const LIM = tope || 300000;
  function rec(t){
    if (tHecho(t)) return true;
    if (++vis > LIM) return false;
    const k = tClave(t);
    if (visto.has(k)) return false;
    visto.add(k);
    const ops = [];
    for (let i = 0; i < t.length; i++){
      const a = t[i];
      if (!a.length) continue;
      const uni = a.every(c => c === a[0]);
      if (uni && a.length === T_ALTO) continue;
      for (let j = 0; j < t.length; j++){
        if (!tPuede(t, i, j)) continue;
        const b = t[j];
        if (uni && !b.length) continue;
        /* el orden importa muchisimo: apoyar sobre el mismo color acerca al
           final y mandar a un vacio solo gasta el recurso escaso */
        let pr = 0;
        if (b.length) pr += 3;
        if (b.length && b.every(c => c === b[0])) pr += 2;
        if (a.length > 1 && a[a.length-2] !== a[a.length-1]) pr += 1;
        if (a.length === 1) pr += 1;          /* vaciar un tubo libera un vacio */
        ops.push([pr, i, j]);
      }
    }
    ops.sort((p, q) => q[0] - p[0]);
    for (const o of ops){
      const n = tClonar(t);
      n[o[2]].push(n[o[1]].pop());
      cam.push([o[1], o[2]]);
      if (rec(n)) return true;
      cam.pop();
    }
    return false;
  }
  return rec(t0) ? cam.slice() : null;
}

/* ── EL REPARTO ES FISHER-YATES Y NO `sort(() => azar - 0.5)` ──
   Ese comparador no es consistente, asi que el reparto que devuelve depende del
   algoritmo de ordenamiento del navegador y no es uniforme en ninguno. Ya costo
   una vuelta en POMPOM. */
function tReparte(cf){
  const b = [];
  for (let c = 0; c < cf.col; c++) for (let k = 0; k < T_ALTO; k++) b.push(c);
  for (let i = b.length - 1; i > 0; i--){
    const j = Math.floor(tAz()*(i+1));
    const v = b[i]; b[i] = b[j]; b[j] = v;
  }
  const t = [];
  for (let i = 0; i < cf.col; i++) t.push(b.slice(i*T_ALTO, (i+1)*T_ALTO));
  for (let v = 0; v < cf.vac; v++) t.push([]);
  return t;
}

/* ── Y NO SE ACEPTA CUALQUIER REPARTO ──
   Un reparto puede caer casi ordenado por casualidad, y un nivel de once
   colores que se resuelve en seis movidas rompe la promesa de que la
   dificultad sube. Se pide un minimo que crece con los colores, y si en diez
   repartos ninguno llega, se toma el mas largo de los que si tenian salida. */
function tGenera(n){
  const cf = tConf(n);
  T_nCol = cf.col; T_vacios = cf.vac; T_nTubos = cf.tubos;
  T_azar = (n*2654435761 + 12345) >>> 0;
  /* la cota que se pide crece con los colores: un reparto que cae casi ordenado
     por casualidad rompe la promesa de que la dificultad sube */
  const minCota = Math.max(6, Math.round(cf.col*2.1));
  let mejor = null, mejorC = null, mejorH = -1;
  for (let intento = 0; intento < 12; intento++){
    const t = tReparte(cf);
    if (tHecho(t)) continue;
    const h = tCota(t);
    if (h <= mejorH) continue;
    const cam = tCamDFS(tClonar(t), 300000);
    if (!cam) continue;                 /* sin salida comprobada: se descarta */
    mejorH = h; mejor = t; mejorC = cam;
    if (h >= minCota) break;
  }
  if (!mejor){
    mejor = [];
    for (let c = 0; c < cf.col; c++) mejor.push([c, c, c, c]);
    for (let v = 0; v < cf.vac; v++) mejor.push([]);
    mejor[mejor.length-1].push(mejor[0].pop());
    mejorC = [[mejor.length-1, 0]];
    mejorH = 1;
  }
  return { t: mejor, min: mejorH, cam: mejorC, largo: mejorC.length };
}

const JT = {
  es: { sub:'Pasá las bolas de tubo en tubo hasta que cada uno tenga un color.',
        c1:'Cada tubo, un color.',
        c2:'Sólo se apoya sobre el mismo color, o en un tubo vacío.',
        c3:'Menos movidas, más estrellas.',
        movsC:'MOV' },
  en: { sub:'Move balls tube to tube until each one holds a single colour.',
        c1:'One colour per tube.',
        c2:'It only stacks on the same colour, or an empty tube.',
        c3:'Fewer moves, more stars.',
        movsC:'MOV' },
  pt: { sub:'Passe as bolas de tubo em tubo até cada um ter uma cor.',
        c1:'Cada tubo, uma cor.',
        c2:'Só encaixa na mesma cor, ou num tubo vazio.',
        c3:'Menos jogadas, mais estrelas.',
        movsC:'JOG' }
};
const PIEL = { ac:'#3fa9e0', tela:'fondo' };
const SON_ALIAS = { bien:'fusion', toque:'suelta', pierde:'perder',
                    gana:'gana', clic:'clic' };

/* ══════════ EL AMBIENTE ══════════
   Repisa de botica en penumbra. El polvo flotando en el haz frío es lo que hace
   que un estante de vidrio se lea a un sitio con aire adentro, y es lo más
   barato que hay: dieciséis discos de dos píxeles. */
const AMB = {
  foto: 'f_tubos',
  cielo: ['#0e2436', '#08161f'],
  haz: 0.09,
  vineta: 0.40,
  part: { n: 20, dir: 'cae', forma: 'disco', col: '#9fd8ee',
          r0: 1.4, r1: 3.4, v0: 7, v1: 22, amp: 34, gira: 0,
          a0: 0.08, a1: 0.22 }
};

/* ══════════ LA GEOMETRIA DE LOS TUBOS ══════════
   Sale de cuántos hay: con posiciones escritas a mano, el nivel de once colores
   —trece tubos— se sale del marco. Dos filas cuando no entran en una. */
let TG = { r: 30, ax: 0, filas: [] };
function tGeo(){
  const nt = T_tubos.length;
  const porFila = nt <= 7 ? nt : Math.ceil(nt/2);
  const filas = nt <= 7 ? 1 : 2;
  /* el radio de la bola sale del ancho disponible, así que trece tubos entran
     igual que seis y no hay un caso de pantalla que se rompa */
  const anchoU = (AN - 60) / porFila;
  const r = Math.max(13, Math.min(34, anchoU*0.33));
  const w = r*2 + 10;
  const altoT = T_ALTO*r*2 + 26;
  /* ── EL BLOQUE SE CENTRA EN LA BANDA LIBRE, NO EN LA PANTALLA ──
     Arriba viven el marcador y las dos fichas (unos 170 de diseño) y abajo los
     tres botones de partida (unos 150). Centrando en `AL/2` a secas, con dos
     filas quedaba un hueco de trescientos píxeles debajo de la última — medido
     en la captura del nivel 200. La banda libre es lo que hay entre las dos
     cosas, y el bloque se centra ahí. */
  const total = filas*altoT + (filas-1)*46;
  const y0 = 170 + ((AL - 150) - 170 - total)/2;
  const F = [];
  for (let f = 0; f < filas; f++){
    const desde = f*porFila, hasta = Math.min(nt, desde + porFila);
    const cn = hasta - desde;
    const anchoT = cn*w + (cn-1)*(anchoU - w)*0.55;
    const x0 = (AN - anchoT)/2 + w/2;
    for (let i = desde; i < hasta; i++){
      F.push({ i, x: x0 + (i - desde)*(anchoT - w)/Math.max(1, cn-1),
               y: y0 + f*(altoT + 46), w, h: altoT });
    }
  }
  TG = { r, w, altoT, filas, tubos: F };
}
function tPos(i){
  for (const t of TG.tubos) if (t.i === i) return t;
  return TG.tubos[0];
}
/* dónde queda la bola k (desde abajo) de un tubo */
function tBolaXY(i, k){
  const p = tPos(i), r = TG.r;
  return { x: p.x, y: p.y + p.h - 14 - r - k*r*2 };
}

const JUEGO = {
  id: 'tubos',
  tipo: 'niveles',
  nivelesTotal: T_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return T_movs; },
  get sub(){ return TX('movs'); },
  get ficI(){ return TX('nivel') + ' ' + NIVEL; },
  /* la ficha dice la vara de las tres estrellas y no el tope: el jugador no
     puede perder por movidas —siempre queda una movida legal con dos tubos
     libres— asi que un «tope» seria un numero que no significa nada */
  get ficD(){ return '★★★ ' + T_tope; },
  resta: null,
  get puedeDeshacer(){ return T_hist.length > 0 && !T_anim; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){
        tFondo(g);
        tDemo(g, [[0,0,0,0],[1,1,1,1],[2,2,2,2],[]], -1, u);
      } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){
        tFondo(g);
        /* una movida legal contada en tres tiempos: se agarra, viaja, encaja */
        const s = suave(Math.min(1, u*1.25));
        tDemo(g, [[0,1,1],[1,0,0,0],[2,2],[]], 0, u, s);
      } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){
        tFondo(g);
        tDemo(g, [[0,0,0,0],[1,1,1,1],[2,2,2,2],[3,3,3,3]], -1, u);
        const e = Math.min(3, 1 + Math.floor(u*3.2));
        texto('★'.repeat(e) + '☆'.repeat(3-e), AN/2, AL*0.30, 46, '#ffd76a', '800', 'center');
      } }
  ],

  arranca(n){
    const gen = tGenera(n || 1);
    T_tubos = gen.t;
    T_min = gen.min;
    T_cam = gen.cam;
    /* ── EL PRESUPUESTO DE MOVIDAS SALE DEL SOLVER ──
       Escrito a mano sería un número que no tiene nada que ver con el nivel: en
       uno de once colores el camino más corto son cuarenta movidas y en uno de
       tres son ocho. Tres estrellas es el óptimo con un poco de aire, dos es el
       doble, una es llegar. */
    /* la vara de las tres estrellas: la cota mas un 25 % y dos movidas. Nadie
       puede bajar de la cota, asi que esto es alcanzable y ajustado. */
    T_tope = Math.max(6, Math.round(T_min*1.25) + 2);
    T_movs = 0; T_sel = -1; T_hist.length = 0; T_anim = null;
    tGeo();
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
  },

  paso(dt){
    tGeo();
    if (T_anim){
      T_anim.t += dt / T_anim.T;
      if (T_anim.t >= 1){
        const a = T_anim; T_anim = null;
        T_tubos[a.j].push(a.c);
        son('bien', 0.6);
        const p = tBolaXY(a.j, T_tubos[a.j].length - 1);
        chispas(p.x, p.y, 7, T_COL[a.c], 90);
        /* el tubo que se completa paga: es el unico premio parcial que este
           juego tiene, y sin el no hay nada que celebrar hasta el final */
        const b = T_tubos[a.j];
        if (b.length === T_ALTO && b.every(c => c === b[0])){
          sumaPuntos(50, p.x, p.y - 40);
          chispas(p.x, p.y - 20, 18, T_COL[b[0]], 200);
          sacude(0.18);
          /* ── DESTELLO EN VEZ DE FOGONAZO ──
          El fogonazo es un velo blanco de pantalla completa: sube el brillo de
          TODO, tablero incluido, justo en el cuadro en que el jugador está
          mirando qué pasó. El destello es un radial con el centro transparente,
          así que pinta los bordes y deja el medio limpio — y encima lleva el
          COLOR del acontecimiento, que dice qué pasó sin escribir nada. */
          destella(T_COL[b[0]], 0.6);
        }
        if (tHecho(T_tubos)){
          this.gano = true;
          this.estrellas = T_movs <= T_tope ? 3
                         : (T_movs <= Math.round(T_min*1.9) ? 2 : 1);
          this.finP = TX('movsC') + ' ' + T_movs + '  ·  ★★★ ' + T_tope;
          this.vivo = false;
        } else if (!tHayMovida()){
          /* no deberia pasar con dos tubos libres, pero un tablero trabado sin
             aviso seria un nivel del que no se puede salir ni reiniciando */
          this.gano = false; this.vivo = false;
        }
      }
    }
  },

  baja(x, y){
    if (T_anim) return;
    const i = tCual(x, y);
    if (i < 0){ T_sel = -1; return; }
    if (T_sel < 0){
      if (!T_tubos[i].length) return;
      T_sel = i; son('toque');
      return;
    }
    if (i === T_sel){ T_sel = -1; son('clic'); return; }
    if (tPuede(T_tubos, T_sel, i)){
      T_hist.push([T_sel, i]);
      const c = T_tubos[T_sel].pop();
      const de = tBolaXY(T_sel, T_tubos[T_sel].length);
      const p = tPos(i);
      T_anim = { i: T_sel, j: i, c, t: 0, T: 0.20,
                 x0: de.x, y0: de.y, x1: p.x, y1: p.y - 34 };
      T_movs++;
      T_sel = -1;
    } else {
      /* la movida ilegal no se come el toque: se pasa la seleccion al tubo
         nuevo si tiene bolas. Sin eso, tocar dos tubos que no pegan obliga a
         tocar tres veces y el juego se siente pegajoso. */
      son('mal', 0.5);
      T_sel = T_tubos[i].length ? i : -1;
    }
  },

  deshacer(){
    if (!T_hist.length || T_anim) return;
    const [i, j] = T_hist.pop();
    T_tubos[i].push(T_tubos[j].pop());
    T_movs = Math.max(0, T_movs - 1);
    T_sel = -1;
  },

  fondo(g){ tGeo(); tFondo(g); },

  pinta(g){
    for (const p of TG.tubos){
      const i = p.i;
      /* ── LA ENTRADA EN ESCENA ──
         Cada tubo llega en su turno, creciendo desde su base y con el rebote
         que trae `entradaK`. Y en régimen `entradaK` devuelve 1, así que el
         `scale` es la identidad y en partida esto no cuesta nada: no hay un
         segundo camino de dibujo que se pueda desincronizar del primero. */
      const ke = entradaK(i, TG.tubos.length);
      if (ke <= 0) continue;
      const esc = ke < 1;
      if (esc){
        g.save();
        /* se escala desde la BASE del tubo y no desde su centro: creciendo desde
           el centro, el tubo se hunde en la mesa la mitad de su alto */
        g.translate(p.x, p.y + p.h);
        g.scale(1, ke);
        g.translate(-p.x, -(p.y + p.h));
      }
      tTubo(g, p, i === T_sel);
      const a = T_tubos[i];
      for (let k = 0; k < a.length; k++){
        const b = tBolaXY(i, k);
        /* la de arriba del tubo elegido se levanta: es lo unico que dice «esta
           es la que se va a mover» sin escribir nada */
        const alza = (i === T_sel && k === a.length-1) ? 16 : 0;
        tBola(g, b.x, b.y - alza, TG.r, a[k]);
      }
      if (esc) g.restore();
    }
    if (T_anim){
      /* el arco: la bola sube, cruza y baja. En linea recta atraviesa los tubos
         del medio y se lee a que pasa por adentro del vidrio. */
      const u = Math.min(1, T_anim.t);
      const cima = Math.min(T_anim.y0, T_anim.y1) - 90;
      const x = T_anim.x0 + (T_anim.x1 - T_anim.x0)*u;
      const y = (1-u)*(1-u)*T_anim.y0 + 2*(1-u)*u*cima + u*u*T_anim.y1;
      tBola(g, x, y, TG.r, T_anim.c);
    }
  },

  /* ── EL AUTO-JUGADOR ES EL SOLVER JUGANDO ──
     No es un adorno: es la unica forma de comprobar que un nivel se puede
     terminar POR EL CAMINO QUE USA EL JUGADOR —tocando tubos— y no solo en la
     cabeza del generador. Si el solver dice 12 movidas y jugando salen 14, hay
     una regla que no es la misma en los dos sitios. */
  juegaSolo(n, azar){
    const res = [];
    /* `n` es el nivel por el que empezar: sin eso el auto-jugador solo puede
       probar los primeros veinticuatro, y los que se rompen son los de arriba */
    const desde = Math.max(1, n || 1);
    const hasta = Math.min(T_NIVELES, desde + (azar ? 11 : 23));
    for (let nv = desde; nv <= hasta; nv++){
      /* ── POR LA CADENA DE VERDAD Y NO POR `arranca` ──
         Llamando a `arranca` directo, el auto-jugador probaba que el nivel
         se puede resolver y NO probaba nada de lo que pasa al resolverlo:
         `empieza` es quien pone el nivel y `termina` quien guarda las
         estrellas, asi que el progreso quedaba sin una sola prueba. */
      empieza(nv);
      const camino = T_cam;
      let mov = 0;
      if (camino){
        for (const [i, j] of camino){
          this.baja(tPos(i).x, tPos(i).y + 40);
          this.baja(tPos(j).x, tPos(j).y + 40);
          /* el viaje de la bola dura 0,20 s: sin adelantar el reloj la movida
             no se termina nunca y el tablero se queda igual */
          for (let k = 0; k < 16; k++) this.paso(1/60);
          mov++;
        }
      }
      if (!this.vivo) termina();
      res.push({ n: nv, cota: T_min, largo: camino ? camino.length : -1,
                 jugadas: mov, gano: !!this.gano,
                 est: this.estrellas, hecho: tHecho(T_tubos) });
    }
    const malos = res.filter(r => !r.gano);
    return { probados: res.length, ganados: res.length - malos.length,
             malos: malos.map(r => r.n),
             /* que las movidas del solver y las jugadas coincidan es la prueba
                de que la regla es UNA: si difieren, hay dos reglas */
             /* que las movidas del solver y las jugadas coincidan es la prueba
                de que la regla es UNA: si difieren, hay dos reglas */
             desajuste: res.filter(r => r.jugadas !== r.largo).map(r => r.n),
             est3: res.filter(r => r.est === 3).length,
             est: [1,2,3].map(k => res.filter(r => r.est === k).length),
             muestra: res.slice(0, 6) };
  },

  /* ── LA AUDITORIA: TODOS LOS NIVELES, NO UNA MUESTRA ──
     Doscientos niveles generados y comprobados de a uno. Un solo nivel sin
     salida en el 137 es un juego que se corta ahi para siempre, y eso no se ve
     jugando los primeros diez. */
  audita(desde, hasta){
    const red = [];
    let cMin = 999, cMax = 0, cSum = 0, lMin = 999, lMax = 0, lSum = 0, n = 0;
    for (let nv = desde; nv <= hasta; nv++){
      const gen = tGenera(nv);
      /* la red de seguridad devuelve cota 1: si aparece, ES el defecto — un
         nivel de regalo publicado como si fuera del nivel 200 */
      if (gen.min <= 1){ red.push(nv); continue; }
      cMin = Math.min(cMin, gen.min); cMax = Math.max(cMax, gen.min); cSum += gen.min;
      lMin = Math.min(lMin, gen.largo); lMax = Math.max(lMax, gen.largo); lSum += gen.largo;
      n++;
    }
    return { desde, hasta, enRed: red, ok: n,
             cotaMin: cMin, cotaMax: cMax, cotaMedia: +(cSum/Math.max(1,n)).toFixed(1),
             largoMin: lMin, largoMax: lMax, largoMedio: +(lSum/Math.max(1,n)).toFixed(1) };
  },

  ver(){
    return { nivel: NIVEL, tubos: T_tubos.map(a => a.join(',')), movs: T_movs,
             cota: T_min, vara3: T_tope, camino: T_cam ? T_cam.length : -1, sel: T_sel, hist: T_hist.length,
             hecho: tHecho(T_tubos), hayMovida: tHayMovida(),
             geo: { r: TG.r, filas: TG.filas, n: TG.tubos.length } };
  }
};

function tHayMovida(){
  for (let i = 0; i < T_tubos.length; i++) for (let j = 0; j < T_tubos.length; j++)
    if (tPuede(T_tubos, i, j)) return true;
  return false;
}
/* ── EL BLANCO ES EL TUBO ENTERO Y CON AIRE ──
   Un tubo mide 70 px de ancho en un teléfono; pidiendo el toque exacto se falla
   todo el tiempo. El blanco se infla y se resuelve por el más cercano, así que
   lo que cuesta es decidir y no acertar el píxel. */
function tCual(x, y){
  let mejor = -1, mejorD = 1e9;
  for (const p of TG.tubos){
    const dx = Math.abs(x - p.x) - p.w/2, dy = Math.abs(y - (p.y + p.h/2)) - p.h/2;
    const d = Math.max(0, dx) + Math.max(0, dy);
    if (d < mejorD){ mejorD = d; mejor = p.i; }
  }
  return mejorD < 70 ? mejor : -1;
}

function tBola(g, x, y, r, c){
  const col = T_COL[c] || '#888';
  if (dibCuadro('bolas', c, x, y + r, r*2, false)) return;
  const gr = g.createRadialGradient(x - r*0.34, y - r*0.36, r*0.06, x, y, r*1.04);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.30, col);
  gr.addColorStop(1, 'rgba(0,0,0,.55)');
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = gr; g.fill();
  g.beginPath();
  g.ellipse(x - r*0.32, y - r*0.38, r*0.26, r*0.15, -0.7, 0, 7);
  g.fillStyle = 'rgba(255,255,255,.50)'; g.fill();
}

function tTubo(g, p, sel){
  const x0 = p.x - p.w/2, y0 = p.y, w = p.w, h = p.h, rr = w*0.45;
  g.save();
  /* el interior: un velo con degradado. Con el tubo transparente del todo, las
     bolas quedan flotando en fila y no se lee que están DENTRO de algo. */
  g.globalAlpha = 0.18;
  const gr = g.createLinearGradient(x0, y0, x0 + w, y0);
  gr.addColorStop(0, '#dff2ff'); gr.addColorStop(0.5, '#7ba7c4'); gr.addColorStop(1, '#22384a');
  g.fillStyle = gr;
  caja2(x0, y0, w, h, rr, gr, null);
  g.restore();
  g.save();
  g.lineWidth = sel ? 6 : 4;
  g.strokeStyle = sel ? '#ffd76a' : 'rgba(214,240,255,.52)';
  /* la U: abierto arriba. Cerrando el contorno arriba se lee a frasco tapado y
     el jugador no ve por dónde entra la bola. */
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x0, y0 + h - rr);
  g.quadraticCurveTo(x0, y0 + h, x0 + rr, y0 + h);
  g.lineTo(x0 + w - rr, y0 + h);
  g.quadraticCurveTo(x0 + w, y0 + h, x0 + w, y0 + h - rr);
  g.lineTo(x0 + w, y0);
  g.stroke();
  g.globalAlpha = 0.30;
  g.lineWidth = 3; g.strokeStyle = '#ffffff';
  g.beginPath(); g.moveTo(x0 + 7, y0 + 18); g.lineTo(x0 + 7, y0 + h - 24); g.stroke();
  g.restore();
}

function tFondo(g){
  /* el degradado y la foto los pone `ambAtras()` */
  /* la mesa de vidrio: una banda con brillo. Es lo unico que apoya los tubos en
     algo y cuesta dos rectangulos. */
  g.fillStyle = 'rgba(255,255,255,.035)';
  g.fillRect(0, AL*0.62, AN, AL*0.38);
  g.fillStyle = 'rgba(255,255,255,.06)';
  g.fillRect(0, AL*0.62, AN, 3);
}

/* la demo de la cinemática: los mismos tubos y las mismas bolas, así que lo que
   se ve en la escena es exactamente lo que se ve jugando */
function tDemo(g, tubos, mueve, u, s){
  const guard = T_tubos;
  T_tubos = tubos;
  tGeo();
  for (const p of TG.tubos){
    tTubo(g, p, mueve === p.i);
    const a = T_tubos[p.i];
    for (let k = 0; k < a.length; k++){
      if (mueve === p.i && k === a.length-1 && s != null) continue;
      const b = tBolaXY(p.i, k);
      tBola(g, b.x, b.y, TG.r, a[k]);
    }
  }
  if (mueve >= 0 && s != null){
    const a = tubos[mueve];
    const c = a[a.length-1];
    const de = tBolaXY(mueve, a.length-1);
    const p1 = tPos(1);
    const x1 = p1.x, y1 = tBolaXY(1, tubos[1].length).y;
    const cima = Math.min(de.y, y1) - 100;
    const x = de.x + (x1 - de.x)*s;
    const y = (1-s)*(1-s)*de.y + 2*(1-s)*s*cima + s*s*y1;
    tBola(g, x, y, TG.r, c);
  }
  T_tubos = guard;
  tGeo();
}
