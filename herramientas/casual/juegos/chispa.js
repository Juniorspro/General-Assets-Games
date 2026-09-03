/* ══════════════════════════════ CHISPA ══════════════════════════════
   Una reja de caños desordenados. Se toca un caño y gira noventa grados. Gana
   cuando la corriente sale de la fuente y llega a todos.

   POR QUE ESTE GENERO: es el unico de los cinco que se puede resolver del todo
   con la cabeza antes de tocar nada, y encima da una respuesta VISUAL inmediata
   —el caño se enciende— asi que el jugador aprende la regla sin que nadie se la
   explique. Y no tiene azar: dos personas con el mismo nivel tienen el mismo
   problema.

   ── LOS NIVELES SE PUEDEN RESOLVER POR CONSTRUCCION, Y ESO NO ES UN ATAJO ──
   Se genera un ARBOL DE EXPANSION sobre la reja —desde la fuente, en orden al
   azar— y la mascara de cada celda es el conjunto de aristas del arbol que la
   tocan. En esa orientacion la corriente llega a todas las celdas: es una
   propiedad del arbol, no algo que haya que comprobar. Despues se gira cada
   caño al azar. O sea que la solucion existe SIEMPRE y ademas se sabe cual es,
   asi que el minimo de giros es exacto y se puede pedir de vuelta: para cada
   caño, cuantos noventa grados le faltan.

   Y ESE MINIMO ES LA VARA DE LAS TRES ESTRELLAS. Con un numero escrito a mano
   —«veinte giros»— la vara no tendria nada que ver con el nivel: uno de 4x5
   necesita ocho giros y uno de 7x9 casi cuarenta. */

const C_NIVELES = 150;
/* las cuatro direcciones en orden N E S O, que es el orden de los bits de la
   mascara: girar noventa grados a la derecha es rotar los bits uno a la
   izquierda, y eso es lo que hace que girar sea una linea */
const C_DX = [0, 1, 0, -1], C_DY = [-1, 0, 1, 0];

let C_W = 5, C_H = 6;
let C_m = [];                  /* la mascara de cada celda, 0..15 */
let C_sol = [];                /* la mascara resuelta: de ahi sale el minimo */
let C_on = [];                 /* si la corriente llega */
let C_fx = 0, C_fy = 0;        /* la fuente */
let C_giros = 0, C_min = 0, C_hist = [];
let C_lat = 0;                 /* el latido del encendido, cosmético */
let C_azar = 3;
let C_gi = [];                 /* el giro dibujado, para que se vea girar */
function cAz(){ C_azar = (C_azar*1664525 + 1013904223) >>> 0; return C_azar / 4294967296; }

const cIx = (x, y) => y*C_W + x;
function cRot(m, k){
  k = ((k % 4) + 4) % 4;
  return ((m << k) | (m >> (4 - k))) & 15;
}
/* cuantos giros de noventa le faltan a la celda para quedar como la solucion.
   Un cano recto tiene dos orientaciones validas y una cruz cuatro, asi que se
   toma el MINIMO — sin eso el minimo saldria mas alto que el real y las tres
   estrellas serian imposibles. */
function cFaltan(i){
  for (let k = 0; k < 4; k++) if (cRot(C_m[i], k) === C_sol[i]) return k;
  return 0;
}
function cMinimo(){
  let s = 0;
  for (let i = 0; i < C_m.length; i++) s += cFaltan(i);
  return s;
}

function cConf(n){
  const w = Math.min(7, 4 + Math.floor((n - 1)/34));
  const h = Math.min(9, 5 + Math.floor((n - 1)/22));
  return { w, h };
}

function cGenera(n){
  const cf = cConf(n);
  C_W = cf.w; C_H = cf.h;
  C_azar = (n*2654435761 + 99991) >>> 0;
  const N = C_W*C_H;
  C_sol = new Array(N).fill(0);
  /* la fuente arranca en el borde de abajo, que es de donde uno espera que
     venga la corriente en una pantalla vertical */
  C_fx = Math.floor(cAz()*C_W); C_fy = C_H - 1;
  /* ── EL ARBOL SE ARMA CON UNA FRONTERA AL AZAR (PRIM) ──
     Con una busqueda en profundidad sale un arbol de pasillos larguisimos y
     casi sin ramas: el nivel se resuelve en una tira y no se siente un
     rompecabezas. Con la frontera al azar el arbol se ramifica, o sea que hay
     cruces y T, que son las piezas interesantes. */
  const vis = new Array(N).fill(false);
  vis[cIx(C_fx, C_fy)] = true;
  const front = [];
  const empuja = (x, y) => {
    for (let d = 0; d < 4; d++){
      const nx = x + C_DX[d], ny = y + C_DY[d];
      if (nx < 0 || ny < 0 || nx >= C_W || ny >= C_H) continue;
      if (vis[cIx(nx, ny)]) continue;
      front.push([x, y, d, nx, ny]);
    }
  };
  empuja(C_fx, C_fy);
  while (front.length){
    const k = Math.floor(cAz()*front.length);
    const [x, y, d, nx, ny] = front[k];
    front[k] = front[front.length-1]; front.pop();
    if (vis[cIx(nx, ny)]) continue;
    vis[cIx(nx, ny)] = true;
    C_sol[cIx(x, y)] |= (1 << d);
    C_sol[cIx(nx, ny)] |= (1 << ((d + 2) % 4));
    empuja(nx, ny);
  }
  /* ── NO SE DESORDENA TODO, Y ESO SALIO DE MEDIR EL NIVEL 1 ──
     Girando las veinte celdas al azar, el minimo del nivel 1 salia en TREINTA
     giros: son un giro y medio por caño, o sea el nivel entero rehecho de cero
     antes de que el jugador sepa la regla. Eso no es dificultad, es trabajo.
     La fraccion de caños que se toca arranca en el 45 % y llega al 100 % cerca
     del nivel 90, asi que la dificultad crece por dos lados a la vez —la reja
     se agranda y el desorden se completa— y el primer nivel se resuelve en unos
     nueve giros.
     Y se pide un piso de caños mal puestos igual: un desorden que por
     casualidad deje el tablero casi resuelto es un regalo publicado como
     nivel. */
  const frac = Math.min(1, 0.45 + (n - 1)*0.0062);
  let m = null;
  for (let intento = 0; intento < 8; intento++){
    m = C_sol.slice();
    let mal = 0;
    for (let i = 0; i < N; i++){
      if (cAz() > frac) continue;
      /* uno, dos o tres cuartos de vuelta: cero seria no tocarlo, y eso ya lo
         decide la fraccion de arriba */
      m[i] = cRot(m[i], 1 + Math.floor(cAz()*3));
      if (m[i] !== C_sol[i]) mal++;
    }
    if (mal >= Math.max(3, Math.ceil(N*frac*0.55))) break;
  }
  return { m, sol: C_sol.slice(), fx: C_fx, fy: C_fy, w: C_W, h: C_H };
}

/* ── LA CORRIENTE PIDE QUE LOS DOS CAÑOS SE MIREN ──
   Con «este caño apunta al de al lado» alcanzaría para que la corriente pase
   por un caño que apunta a una pared. El paso existe sólo si el vecino apunta
   de vuelta, que es lo que hace que girar un caño apague media reja de golpe —
   y eso es lo que se ve y lo que engancha. */
function cCorriente(){
  const N = C_W*C_H;
  C_on = new Array(N).fill(false);
  const i0 = cIx(C_fx, C_fy);
  C_on[i0] = true;
  const pila = [[C_fx, C_fy]];
  while (pila.length){
    const [x, y] = pila.pop();
    const m = C_m[cIx(x, y)];
    for (let d = 0; d < 4; d++){
      if (!(m & (1 << d))) continue;
      const nx = x + C_DX[d], ny = y + C_DY[d];
      if (nx < 0 || ny < 0 || nx >= C_W || ny >= C_H) continue;
      const j = cIx(nx, ny);
      if (C_on[j]) continue;
      if (!(C_m[j] & (1 << ((d + 2) % 4)))) continue;
      C_on[j] = true;
      pila.push([nx, ny]);
    }
  }
  let n = 0;
  for (const v of C_on) if (v) n++;
  return n;
}
function cHecho(){ return cCorriente() === C_W*C_H; }

const JT = {
  es: { sub:'Girá los caños hasta que la corriente llegue a todos.',
        c1:'La corriente sale de acá.',
        c2:'Tocá un caño y gira noventa grados.',
        c3:'Cuando llega a todos, listo. Menos giros, más estrellas.',
        girosC:'GIROS', apagados:'APAGADOS' },
  en: { sub:'Rotate the pipes until the current reaches every one.',
        c1:'The current comes from here.',
        c2:'Tap a pipe and it turns ninety degrees.',
        c3:'Reach them all and you are done. Fewer turns, more stars.',
        girosC:'TURNS', apagados:'DARK' },
  pt: { sub:'Gire os tubos até a corrente chegar em todos.',
        c1:'A corrente sai daqui.',
        c2:'Toque num tubo e ele gira noventa graus.',
        c3:'Quando chega em todos, pronto. Menos giros, mais estrelas.',
        girosC:'GIROS', apagados:'APAGADOS' }
};
const PIEL = { ac:'#f2c33c', tela:'fondo' };
const SON_ALIAS = { bien:'fusion', toque:'clic', pierde:'perder', gana:'gana', clic:'clic' };

/* ══════════ EL AMBIENTE ══════════
   Una placa de circuito de cerca. Las chispas suben dibujadas como RAYA y no
   como punto, porque una chispa que sube deja estela: con un disco se lee a
   mota de polvo, que es lo contrario de lo que este juego cuenta. */
const AMB = {
  foto: 'f_chispa',
  cielo: ['#12121c', '#0c0c14'],
  haz: 0.05,
  vineta: 0.46,
  granoK: 0.020,
  part: { n: 18, dir: 'sube', forma: 'raya', col: '#7fe8ff',
          r0: 1.2, r1: 2.6, v0: 40, v1: 110, amp: 22, gira: 0,
          a0: 0.10, a1: 0.30 }
};


let CG = { s: 80, x0: 0, y0: 0 };
function cGeo(){
  /* la celda sale del ancho Y del alto disponibles, así que una reja de 7x9
     entra en un teléfono corto igual que una de 4x5 */
  const dispW = AN - 48, dispH = AL - 170 - 170;
  CG.s = Math.floor(Math.min(dispW/C_W, dispH/C_H));
  CG.x0 = (AN - CG.s*C_W)/2;
  CG.y0 = 170 + (dispH - CG.s*C_H)/2;
}
function cCelXY(x, y){ return { x: CG.x0 + x*CG.s + CG.s/2, y: CG.y0 + y*CG.s + CG.s/2 }; }

const JUEGO = {
  id: 'chispa',
  tipo: 'niveles',
  nivelesTotal: C_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return C_giros; },
  get sub(){ return TX('girosC'); },
  get ficI(){ return TX('nivel') + ' ' + NIVEL; },
  get ficD(){ return '★★★ ' + C_min; },
  resta: null,
  get puedeDeshacer(){ return C_hist.length > 0; },

  planos: [
    { dur: 2.8, pie: 'c1', dibuja(g, u){
        cFondo(g);
        cDemo(g, u, 0);
      } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){
        cFondo(g);
        cDemo(g, u, 1);
      } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){
        cFondo(g);
        cDemo(g, u, 2);
      } }
  ],

  arranca(n){
    const gen = cGenera(n || 1);
    C_m = gen.m; C_sol = gen.sol;
    C_gi = new Array(C_m.length).fill(0);
    C_giros = 0; C_hist.length = 0; C_lat = 0;
    C_min = cMinimo();
    cGeo();
    cCorriente();
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
  },

  paso(dt){
    cGeo();
    if (C_lat > 0) C_lat = Math.max(0, C_lat - dt*2.2);
    /* el giro dibujado se acerca a cero: sin esto el caño CAMBIA de orientación
       en un cuadro y no se ve girar, se ve parpadear */
    for (let i = 0; i < C_gi.length; i++)
      if (C_gi[i] !== 0) C_gi[i] += (0 - C_gi[i]) * Math.min(1, dt*13);
  },

  baja(px, py){
    if (!this.vivo) return;
    cGeo();
    const x = Math.floor((px - CG.x0)/CG.s), y = Math.floor((py - CG.y0)/CG.s);
    if (x < 0 || y < 0 || x >= C_W || y >= C_H) return;
    const i = cIx(x, y);
    C_hist.push(i);
    C_m[i] = cRot(C_m[i], 1);
    C_gi[i] = -Math.PI/2;          /* nace girado al revés y vuelve: eso ES el giro */
    C_giros++;
    const antes = C_on.filter(Boolean).length;
    const ahora = cCorriente();
    if (ahora > antes){ son('bien', 0.55 + Math.min(0.4, (ahora-antes)*0.06)); C_lat = 1; }
    else son('toque', 0.55);
    /* ── EL PREMIO PARCIAL ES PRENDER CAÑOS, NO GANAR ──
       Sin nada que pagar hasta el final, un nivel de 7x9 son cuarenta giros sin
       una sola señal de que va bien. Cada caño que se enciende paga. */
    if (ahora > antes){
      const p = cCelXY(x, y);
      sumaPuntos((ahora - antes)*8, p.x, p.y - CG.s*0.6);
      chispas(p.x, p.y, Math.min(16, 4 + (ahora-antes)*2), '#ffd76a', 110);
    }
    if (ahora === C_W*C_H){
      this.gano = true;
      /* tres estrellas es el minimo exacto mas un 20 %: el minimo es alcanzable
         por construccion, asi que la vara no es un deseo */
      const vara3 = Math.max(C_min, Math.ceil(C_min*1.2));
      this.estrellas = C_giros <= vara3 ? 3 : (C_giros <= C_min*2 ? 2 : 1);
      this.finP = TX('girosC') + ' ' + C_giros + '  ·  ★★★ ' + vara3;
      destella('#7fe8ff', 1.0);
      sacude(0.3);
      this.vivo = false;
    }
  },

  deshacer(){
    if (!C_hist.length) return;
    const i = C_hist.pop();
    C_m[i] = cRot(C_m[i], 3);
    C_gi[i] = Math.PI/2;
    C_giros = Math.max(0, C_giros - 1);
    cCorriente();
  },

  fondo(g){ cGeo(); cFondo(g); },

  pinta(g){
    const s = CG.s;
    /* la reja primero: sin las celdas dibujadas, los caños flotan y no se ve
       dónde termina uno y empieza el otro */
    for (let y = 0; y < C_H; y++) for (let x = 0; x < C_W; x++){
      const p = cCelXY(x, y), i = cIx(x, y);
      g.fillStyle = C_on[i] ? 'rgba(242,195,60,.07)' : 'rgba(255,255,255,.028)';
      caja2(p.x - s/2 + 2, p.y - s/2 + 2, s - 4, s - 4, 8, g.fillStyle, null);
    }
    for (let y = 0; y < C_H; y++) for (let x = 0; x < C_W; x++)
      cCano(g, x, y, C_m[cIx(x, y)], C_on[cIx(x, y)], C_gi[cIx(x, y)],
            x === C_fx && y === C_fy);
    /* los apagados que quedan: es el único número que importa mientras se
       juega, y va en el tablero y no arriba porque ahí se mira */
    const off = C_W*C_H - C_on.filter(Boolean).length;
    if (off > 0)
      texto(off + ' ' + TX('apagados'), AN/2, CG.y0 - 22, 22,
            'rgba(242,238,230,.42)', '700', 'center');
  },

  /* ── EL AUTO-JUGADOR JUEGA LA SOLUCION QUE EL GENERADOR SABE ──
     No es hacer trampa: es lo unico que demuestra que la solucion del generador
     se puede JUGAR tocando celdas —o sea que girar en el juego y girar en el
     generador son la misma operacion—. Y que los giros que gasta coincidan con
     el minimo calculado es la prueba de que la cuenta de `cFaltan` es correcta;
     si difieren, hay dos definiciones de «girado». */
  juegaSolo(n, azar){
    const res = [];
    const desde = Math.max(1, n || 1);
    const hasta = Math.min(C_NIVELES, desde + (azar ? 11 : 23));
    for (let nv = desde; nv <= hasta; nv++){
      /* por la cadena de verdad: `empieza` pone el nivel y `termina` guarda
         las estrellas, asi que el progreso queda probado y no supuesto */
      empieza(nv);
      const esperado = C_min;
      if (azar){
        /* el que gira al azar: por lejos no llega, y esa distancia es la que
           dice que el nivel pide pensar */
        for (let k = 0; k < esperado*3 && this.vivo; k++){
          const x = Math.floor(cAz()*C_W), y = Math.floor(cAz()*C_H);
          this.baja(cCelXY(x, y).x, cCelXY(x, y).y);
        }
      } else {
        for (let y = 0; y < C_H && this.vivo; y++) for (let x = 0; x < C_W && this.vivo; x++){
          const i = cIx(x, y);
          let f = cFaltan(i);
          const p = cCelXY(x, y);
          for (let k = 0; k < f && this.vivo; k++) this.baja(p.x, p.y);
        }
      }
      if (!this.vivo) termina();
      res.push({ n: nv, min: esperado, giros: C_giros, gano: !!this.gano,
                 est: this.estrellas, apagados: C_W*C_H - C_on.filter(Boolean).length,
                 reja: C_W + 'x' + C_H });
    }
    const malos = res.filter(r => !r.gano);
    return { probados: res.length, ganados: res.length - malos.length,
             malos: malos.map(r => ({ n: r.n, apagados: r.apagados })),
             /* si los giros jugados no son el mínimo, `cFaltan` y el juego no
                están de acuerdo en qué es «girar» */
             desajuste: res.filter(r => r.gano && r.giros !== r.min).map(r => r.n),
             est3: res.filter(r => r.est === 3).length,
             muestra: res.slice(0, 6) };
  },

  audita(desde, hasta){
    let mMin = 999, mMax = 0, mSum = 0, n = 0;
    const rotos = [], faciles = [];
    for (let nv = desde; nv <= hasta; nv++){
      const gen = cGenera(nv);
      C_m = gen.m; C_sol = gen.sol;
      /* que la SOLUCION prenda todo: es la propiedad del árbol y por eso tiene
         que valer siempre. Si falla, el generador no está armando un árbol. */
      const guard = C_m;
      C_m = gen.sol.slice();
      const todo = cCorriente() === C_W*C_H;
      C_m = guard;
      if (!todo) rotos.push(nv);
      /* y que ningun brazo de la solucion apunte afuera de la reja: es una
         propiedad del arbol y por eso tiene que valer en los ciento cincuenta */
      for (let y = 0; y < C_H; y++) for (let x = 0; x < C_W; x++){
        const mm = gen.sol[cIx(x,y)];
        for (let d = 0; d < 4; d++){
          if (!(mm & (1<<d))) continue;
          const nx = x+C_DX[d], ny = y+C_DY[d];
          if (nx<0||ny<0||nx>=C_W||ny>=C_H){ if (rotos.indexOf(nv) < 0) rotos.push(nv); }
        }
      }
      const mn = cMinimo();
      /* un nivel que nace resuelto o casi es un regalo publicado como nivel.
         La vara sigue la fraccion de desorden: pedirle al nivel 1 el mismo
         minimo que al 150 seria pedirle que no sea el nivel 1. */
      const fr = Math.min(1, 0.45 + (nv - 1)*0.0062);
      if (mn < Math.ceil(C_W*C_H*fr*0.45)) faciles.push(nv);
      mMin = Math.min(mMin, mn); mMax = Math.max(mMax, mn); mSum += mn; n++;
    }
    return { desde, hasta, solucionRota: rotos, muyFaciles: faciles,
             minMin: mMin, minMax: mMax, minMedio: +(mSum/Math.max(1,n)).toFixed(1) };
  },

  ver(){
    const off = C_W*C_H - C_on.filter(Boolean).length;
    return { nivel: NIVEL, reja: C_W + 'x' + C_H, giros: C_giros, min: C_min,
             apagados: off, hecho: off === 0, hist: C_hist.length,
             fuente: [C_fx, C_fy], celda: CG.s,
             /* ── LO QUE SE COMPRUEBA ES LA SOLUCION Y NO EL TABLERO A MEDIO JUGAR ──
                La primera version contaba los brazos de caños encendidos que
                apuntan afuera de la reja y devolvia 1 en el nivel 1: yo lo lei
                como una fuga y NO LO ES — un caño girado a medio jugar puede
                perfectamente apuntar a la pared, es un brazo muerto y nada mas
                (la corriente ya no pasa: `cCorriente` comprueba los limites).
                Lo que si seria un defecto de verdad es que la SOLUCION tenga un
                brazo apuntando afuera, porque entonces el arbol estaria mal
                armado y la mascara resuelta no seria la del arbol. Eso tiene
                que ser cero siempre. */
             solFuera: (() => { let k = 0;
               for (let y = 0; y < C_H; y++) for (let x = 0; x < C_W; x++){
                 const m = C_sol[cIx(x,y)];
                 for (let d = 0; d < 4; d++){
                   if (!(m & (1<<d))) continue;
                   const nx = x+C_DX[d], ny = y+C_DY[d];
                   if (nx<0||ny<0||nx>=C_W||ny>=C_H) k++;
                 }
               } return k; })(),
             /* y los brazos muertos del tablero actual, que son informacion y
                no un error: sirven para ver de un numero si el jugador dejo
                caños mirando la pared */
             brazosMuertos: (() => { let k = 0;
               for (let y = 0; y < C_H; y++) for (let x = 0; x < C_W; x++){
                 const m = C_m[cIx(x,y)];
                 for (let d = 0; d < 4; d++){
                   if (!(m & (1<<d))) continue;
                   const nx = x+C_DX[d], ny = y+C_DY[d];
                   if (nx<0||ny<0||nx>=C_W||ny>=C_H) k++;
                 }
               } return k; })() };
  }
};

/* ══════════ EL CAÑO ══════════
   Un brazo por cada bit de la máscara, más el cubo del centro. Y el encendido
   no es sólo otro color: lleva un halo y el centro más claro, porque en una
   reja de sesenta caños un cambio de tono no se ve de una ojeada. */
function cCano(g, x, y, m, on, gi, fuente){
  const p = cCelXY(x, y), s = CG.s;
  const gr = s*0.20, largo = s*0.5;
  /* ── LA ENTRADA EN ESCENA, EN DIAGONAL ──
     El índice no es `cIx(x,y)` sino `x+y`: por índice de celda la reja se llena
     fila por fila y se lee a una barra que baja, y en diagonal se lee a que la
     reja se armó desde una esquina. Es el mismo número de líneas y se ve
     completamente distinto. */
  const ke = entradaK(x + y, C_W + C_H - 2);
  if (ke <= 0) return;
  g.save();
  g.translate(p.x, p.y);
  if (ke < 1) g.scale(ke, ke);
  if (gi) g.rotate(gi);
  const col = on ? '#f2c33c' : '#4a5a68';
  const bor = on ? '#8a6410' : '#26313b';
  if (on){
    g.save();
    g.globalAlpha = 0.16 + 0.10*C_lat;
    g.beginPath(); g.arc(0, 0, s*0.52, 0, 7);
    g.fillStyle = '#f2c33c'; g.fill();
    g.restore();
  }
  /* ── EL METAL GENERADO VA SOBRE EL CAÑO APAGADO Y NO SOBRE EL ENCENDIDO ──
     Un caño con corriente tiene que leerse por su COLOR, que es la única señal
     de que la corriente llegó; poniéndole la foto encima, el dorado se ensucia
     con la veta y el jugador pierde de un cuadro a otro la información que este
     juego entero existe para dar. El apagado, en cambio, no informa nada más que
     «no llega», así que ahí la textura es todo ganancia. */
  const met = on ? null : patron('metal');
  g.lineCap = 'butt';
  for (let d = 0; d < 4; d++){
    if (!(m & (1 << d))) continue;
    g.save();
    g.rotate(d*Math.PI/2);        /* d=0 es el norte y rotar lleva a E, S, O */
    g.fillStyle = bor;
    g.fillRect(-gr/2 - 2, -largo, gr + 4, largo + 2);
    g.fillStyle = col;
    g.fillRect(-gr/2, -largo, gr, largo + 2);
    if (met){ g.globalAlpha = 0.62; g.fillStyle = met;
              g.fillRect(-gr/2, -largo, gr, largo + 2); g.globalAlpha = 1; }
    /* la veta clara del medio: es lo que hace que un brazo se lea a caño y no a
       un palito, y cuesta un rectángulo */
    g.fillStyle = on ? 'rgba(255,255,255,.30)' : 'rgba(255,255,255,.07)';
    g.fillRect(-gr*0.20, -largo, gr*0.22, largo);
    g.restore();
  }
  /* el cubo del centro: sin él, dos brazos opuestos se leen a dos palitos
     separados y una curva se lee a una L rota */
  const cs = gr*1.42;
  g.fillStyle = bor;
  caja2(-cs/2 - 2, -cs/2 - 2, cs + 4, cs + 4, 4, bor, null);
  g.fillStyle = col;
  caja2(-cs/2, -cs/2, cs, cs, 3, col, null);
  if (met){ g.globalAlpha = 0.62; caja2(-cs/2, -cs/2, cs, cs, 3, met, null);
            g.globalAlpha = 1; }
  if (fuente){
    /* la fuente: un disco propio, porque es la única celda que el jugador tiene
       que poder encontrar de una ojeada */
    g.beginPath(); g.arc(0, 0, s*0.20, 0, 7);
    g.fillStyle = '#fff6d0'; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#f2c33c'; g.stroke();
  } else if (on){
    g.beginPath(); g.arc(0, 0, gr*0.30, 0, 7);
    g.fillStyle = '#fff6d0'; g.fill();
  }
  g.restore();
}

/* la demo: una reja chiquita de verdad, con los mismos caños y la misma
   corriente, así que lo que se ve en la escena es lo que se ve jugando */
function cDemo(g, u, etapa){
  const gm = C_m, gs = C_sol, gw = C_W, gh = C_H, gf = [C_fx, C_fy], gg = C_gi;
  const dg = cGenera(7);
  C_m = dg.sol.slice(); C_sol = dg.sol.slice();
  C_gi = new Array(C_m.length).fill(0);
  if (etapa === 0){
    /* sólo la fuente encendida: se desarma todo menos ella */
    for (let i = 0; i < C_m.length; i++) if (i !== cIx(C_fx, C_fy)) C_m[i] = cRot(C_m[i], 1);
  } else if (etapa === 1){
    const k = Math.floor(u*4) % 4;
    for (let i = 0; i < C_m.length; i++) if (i % 3 === 0) C_m[i] = cRot(C_m[i], 1);
    const c = cIx(Math.floor(C_W/2), Math.floor(C_H/2));
    C_m[c] = cRot(dg.sol[c], k);
    C_gi[c] = -(u*4 % 1)*Math.PI/2;
  }
  cGeo();
  cCorriente();
  const s = CG.s;
  for (let y = 0; y < C_H; y++) for (let x = 0; x < C_W; x++){
    const p = cCelXY(x, y), i = cIx(x, y);
    const f = C_on[i] ? 'rgba(242,195,60,.07)' : 'rgba(255,255,255,.028)';
    caja2(p.x - s/2 + 2, p.y - s/2 + 2, s - 4, s - 4, 8, f, null);
  }
  for (let y = 0; y < C_H; y++) for (let x = 0; x < C_W; x++)
    cCano(g, x, y, C_m[cIx(x, y)], C_on[cIx(x, y)], C_gi[cIx(x, y)],
          x === C_fx && y === C_fy);
  if (etapa === 2){
    const e = Math.min(3, 1 + Math.floor(u*3.2));
    texto('★'.repeat(e) + '☆'.repeat(3-e), AN/2, CG.y0 - 30, 42, '#ffd76a', '800', 'center');
  }
  C_m = gm; C_sol = gs; C_W = gw; C_H = gh; C_fx = gf[0]; C_fy = gf[1]; C_gi = gg;
  cGeo();
  cCorriente();
}

function cFondo(g){
  /* el degradado y la foto los pone `ambAtras()`: acá queda la trama de puntos */
  /* una trama de puntos: es lo unico que hace que el fondo no sea un degradado
     liso, y va anclada al mundo asi que no titila */
  g.fillStyle = 'rgba(255,255,255,.035)';
  for (let y = 40; y < AL; y += 56) for (let x = 26; x < AN; x += 56){
    g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
  }
}
