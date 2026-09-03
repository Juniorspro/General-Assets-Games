/* ══════════════════════════ EL RARO ══════════════════════════
   Una grilla de cosas idénticas y una distinta. Tocás la distinta. La grilla
   crece y el reloj se acorta.

   ES EL MÁS SIMPLE DE LOS CINCO Y ES A PROPÓSITO: es el molde de *Tap the
   Difference*, uno de los catorce que TikTok tiene en prueba, y funciona por
   una razón que no es la dificultad — engancha por VERGÜENZA. Fallar uno fácil
   da bronca, y la bronca es lo que hace que alguien toque «otra vez». Un juego
   que se pierde por no llegar se abandona; uno que se pierde por no ver, no.

   Y LA DIFERENCIA ES SIEMPRE DE UNA SOLA CLASE POR RONDA: o el tono, o el
   tamaño, o el giro, o la forma. Mezclando dos, el ojo no sabe qué buscar y el
   juego pasa de «mirar» a «barrer la grilla uno por uno», que es otro juego y
   es más aburrido. */

const JT = {
  es: { sub: 'Uno es distinto. Tocalo.\nCada acierto agranda la grilla.',
        nivel: 'NIVEL',
        c1: 'Todos iguales.',
        c2: 'Casi todos.',
        c3: 'Encontralo antes de que se acabe.' },
  en: { sub: 'One is different. Tap it.\nEvery hit makes the grid bigger.',
        nivel: 'LEVEL',
        c1: 'All the same.',
        c2: 'Almost all.',
        c3: 'Find it before time runs out.' },
  pt: { sub: 'Um é diferente. Toque nele.\nCada acerto aumenta a grade.',
        nivel: 'NÍVEL',
        c1: 'Todos iguais.',
        c2: 'Quase todos.',
        c3: 'Ache antes do tempo acabar.' }
};

/* ── LOS TONOS SON DE LA MISMA FAMILIA ──
   La ficha base es siempre del mismo color y la distinta cambia POCO. Con dos
   colores muy distintos el juego se resuelve sin mirar, y con doce colores
   deja de ser el mismo juego. */
/* la piel del menú y el sonido */
const PIEL = { ac: '#f0d060', tela: 'fondo' };
const SON_ALIAS = {};

const TONOS = ['#e0553f', '#3f8f5c', '#3a63b8', '#c9a227', '#9a5fb8', '#2fa3a3'];

const R = {
  nivel: 1, cols: 2, filas: 3, raro: 0, tipo: 'tono', base: 0,
  t: 0, limite: 6.5, fallos: 0, aviso: 0, brillo: 0
};

const JUEGO = {
  id: 'raro', vivo: false, gano: false, marca: 0, resta: null,

  planos: [
    { dur: 2.4, pie: 'c1', dibuja: (g, u) => {
        fondoRaro(g);
        rejaCine(g, 3, 4, -1, u);
      } },
    { dur: 2.4, pie: 'c2', dibuja: (g, u) => {
        fondoRaro(g);
        rejaCine(g, 3, 4, 7, u);
      } },
    { dur: 2.6, pie: 'c3', dibuja: (g, u) => {
        fondoRaro(g);
        /* la grilla crece: es el juego entero contado sin una palabra */
        const n = 3 + Math.floor(suave(u)*3);
        rejaCine(g, n, n + 1, 5, u);
      } }
  ],

  arranca(){
    R.nivel = 1; R.fallos = 0; R.aviso = 0; R.brillo = 0;
    nivelRaro();
    JUEGO.vivo = true; JUEGO.gano = false; JUEGO.marca = 0;
  },

  paso(dt){
    if (R.aviso > 0) R.aviso -= dt;
    if (R.brillo > 0) R.brillo -= dt*2.4;
    R.t += dt;
    JUEGO.resta = 1 - R.t / R.limite;
    if (R.t >= R.limite){ JUEGO.vivo = false; JUEGO.gano = R.nivel > 8; }
  },

  fondo(g){
    /* el foco generado: en un juego de MIRAR, el fondo tiene que empujar la
       vista al centro y no tener nada propio que mirar. Por eso se pidió una
       luz y nada más. */
    if (!dibCubre('fondo')) fondoRaro(g);
  },

  pinta(g){
    const c = celda();
    for (let j = 0; j < R.filas; j++) for (let i = 0; i < R.cols; i++){
      const k = j*R.cols + i;
      ficha(g, c.x0 + i*c.p + c.p/2, c.y0 + j*c.p + c.p/2, c.p*0.40, k === R.raro);
    }
    /* el destello del acierto: sale de la ficha que se tocó, no de la pantalla.
       Un fogonazo de pantalla completa en un juego de mirar te deja sin ver la
       grilla nueva justo cuando aparece. */
    if (R.brillo > 0){
      const p = R.ultimo || { x: AN/2, y: AL/2 };
      g.globalAlpha = Math.min(1, R.brillo);
      disco(p.x, p.y, c.p*0.55*(1.2 - R.brillo*0.5), 'rgba(255,255,255,.22)');
      g.globalAlpha = 1;
    }
    /* el rotulo del nivel va ABAJO, sobre la barra del reloj: arriba de la
       grilla caia justo sobre la palabra PUNTOS del HUD —medido en la captura,
       «NIVEL 1» cruzado con «PUNTOS»— y el HUD vive en DOM, asi que el lienzo
       no puede saber que esta ahi si no se lo mide. */
    texto(TX('nivel') + ' ' + R.nivel, 360, AL - 104, 26, 'rgba(242,238,230,.42)');
  },

  baja(x, y){
    const c = celda();
    const i = Math.floor((x - c.x0) / c.p), j = Math.floor((y - c.y0) / c.p);
    if (i < 0 || j < 0 || i >= R.cols || j >= R.filas) return;
    const k = j*R.cols + i;
    if (k === R.raro){
      R.ultimo = { x: c.x0 + i*c.p + c.p/2, y: c.y0 + j*c.p + c.p/2 };
      R.brillo = 1;
      R.nivel++; PUNTOS = R.nivel - 1; JUEGO.marca = PUNTOS;
      son('bien');
      nivelRaro();
    } else {
      /* ── TOCAR MAL CUESTA TIEMPO, NO UNA VIDA ──
         Con vidas, el jugador toca de a una y con miedo, y el juego se vuelve
         lento. Cobrando un segundo y medio, tocar rápido y equivocarse sigue
         siendo mejor que quedarse mirando — que es lo que tiene que premiar un
         juego de reacción. */
      R.t += 1.5;
      R.fallos++;
      son('mal');
      fogonazo(0.20);
      if (R.t >= R.limite){ JUEGO.vivo = false; JUEGO.gano = R.nivel > 8; }
    }
  },

  juegaSolo(n, azar){
    JUEGO.arranca();
    let v = 0;
    while (JUEGO.vivo && v < n){
      const c = celda();
      let k = R.raro;
      if (azar) k = (Math.random()*(R.cols*R.filas))|0;
      const i = k % R.cols, j = Math.floor(k / R.cols);
      JUEGO.baja(c.x0 + i*c.p + c.p/2, c.y0 + j*c.p + c.p/2);
      JUEGO.paso(1/60);
      v++;
    }
    return { vueltas: v, puntos: PUNTOS, nivel: R.nivel, fallos: R.fallos,
             cols: R.cols, filas: R.filas, limite: +R.limite.toFixed(2), vivo: JUEGO.vivo };
  }
};

/* ── LA GRILLA CRECE POR ÁREA Y NO POR LADO ──
   Subiendo un lado por nivel, del nivel 6 al 7 la grilla pasa de 36 a 49
   fichas: un salto del 36 % que se siente a pared. Creciendo de a uno por vez
   —una columna, después una fila— cada nivel agrega una tira y la curva es
   pareja. Y se topa en 6×9: más chico que eso una ficha mide 50 px de lado y
   deja de poder tocarse con un pulgar. */
function nivelRaro(){
  const n = R.nivel;
  R.cols = Math.min(6, 2 + Math.floor(n/2));
  R.filas = Math.min(9, 3 + Math.floor((n+1)/2));
  R.limite = Math.max(2.2, 6.5 - n*0.30);
  R.t = 0;
  R.raro = (Math.random() * (R.cols*R.filas)) | 0;
  R.base = (Math.random()*TONOS.length)|0;
  /* una sola clase de diferencia por ronda, y se endurece con el nivel */
  const clases = n < 3 ? ['tono'] : n < 6 ? ['tono','tamano'] : ['tono','tamano','giro','forma'];
  R.tipo = clases[(Math.random()*clases.length)|0];
  /* cuánto se diferencia: al principio salta a la vista, después hay que
     buscarlo. Es la única curva de dificultad además del reloj. */
  R.delta = Math.max(0.18, 0.62 - n*0.035);
  JUEGO.resta = 1;
}

/* dónde cae la grilla: centrada, con margen, y siempre por encima de la franja
   de abajo. Se calcula del alto de diseño porque el alto depende de la pantalla. */
function celda(){
  const m = 40;
  const alto = AL - 300;                 /* deja lugar arriba para el marcador */
  const p = Math.min((AN - m*2) / R.cols, alto / R.filas);
  return { p, x0: (AN - p*R.cols)/2, y0: 190 + (alto - p*R.filas)/2 };
}

/* ── LAS FICHAS SON SEIS OBJETOS GENERADOS ──
   Y eso cambia el juego más de lo que parece: con discos de color, «uno es
   distinto» es un ejercicio de laboratorio; con un pato de goma entre seis
   patos de goma, es un juego. Las cuatro clases de diferencia siguen andando
   sobre un objeto: el tono es un lavado de color encima, el tamaño una escala,
   el giro una rotación —y un objeto asimétrico SÍ se puede girar, que era el
   único caso que un disco no podía— y la forma es otro objeto.

   El lavado se hornea una vez por objeto y por color: pintarlo por cuadro
   serían tres operaciones de lienzo por ficha y hay hasta cincuenta y cuatro
   fichas en pantalla. */
const _lavado = {};
function objetoLavado(i, col, k){
  const o = IMG.objetos;
  if (!o || !o.ok) return null;
  const cl = i + '|' + col + '|' + k.toFixed(2);
  if (_lavado[cl]) return _lavado[cl];
  const c = document.createElement('canvas');
  c.width = o.w; c.height = o.h;
  const x = c.getContext('2d');
  x.drawImage(o.im, i*o.w, 0, o.w, o.h, 0, 0, o.w, o.h);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = k;
  x.fillStyle = col; x.fillRect(0, 0, o.w, o.h);
  _lavado[cl] = c;
  return c;
}

function fichaSprite(g, x, y, r, raro){
  const o = IMG.objetos;
  if (!o || !o.ok) return false;
  let i = R.base % o.n, rr = r*1.55, gi = 0, lav = null;
  if (raro){
    if (R.tipo === 'tono') lav = objetoLavado(i, '#f2eee6', R.delta*0.42);
    else if (R.tipo === 'tamano') rr = r*1.55*(1 - R.delta*0.30);
    else if (R.tipo === 'giro') gi = R.delta*0.70;
    else if (R.tipo === 'forma') i = (R.base + 1 + (R.nivel % (o.n - 1))) % o.n;
  }
  g.save();
  g.translate(x, y);
  if (gi) g.rotate(gi);
  if (lav) g.drawImage(lav, -rr, -rr*lav.height/lav.width, rr*2, rr*2*lav.height/lav.width);
  else g.drawImage(o.im, i*o.w, 0, o.w, o.h, -rr, -rr*o.h/o.w, rr*2, rr*2*o.h/o.w);
  g.restore();
  return true;
}

function ficha(g, x, y, r, raro){
  if (fichaSprite(g, x, y, r, raro)) return;
  /* ── CUANDO LA DIFERENCIA ES EL GIRO, TODAS LAS FICHAS SON GOTAS ──
     Un disco girado es el mismo disco: la diferencia de giro no existiría y la
     ronda sería imposible. La gota tiene un lado en punta, así que el giro se
     ve — pero sólo si TODAS son gotas, porque si sólo la rara lo fuera, la
     diferencia sería la forma y no el giro. */
  let col = TONOS[R.base], rr = r, gi = 0;
  let forma = R.tipo === 'giro' ? 'gota' : 'disco';
  if (raro){
    if (R.tipo === 'tono') col = mezcla(TONOS[R.base], '#f2eee6', R.delta*0.55);
    else if (R.tipo === 'tamano') rr = r * (1 - R.delta*0.30);
    else if (R.tipo === 'giro') gi = R.delta*0.55;
    else if (R.tipo === 'forma') forma = 'caja';
  }
  g.save();
  g.translate(x, y); g.rotate(gi);
  if (forma === 'caja') caja2(-rr, -rr, rr*2, rr*2, rr*0.28, col, null);
  else if (forma === 'gota'){
    /* una gota tiene un lado en punta, así que el giro SE VE. Un disco girado
       es el mismo disco y la diferencia de giro no existiría. */
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, -rr*1.15);
    g.quadraticCurveTo(rr, -rr*0.2, 0, rr*1.05);
    g.quadraticCurveTo(-rr, -rr*0.2, 0, -rr*1.15);
    g.fill();
  } else disco(0, 0, rr, col);
  /* un brillo arriba a la izquierda: es lo que hace que la ficha se lea a
     objeto y no a mancha de color, y cuesta un arco */
  g.globalAlpha = 0.16;
  disco(-rr*0.30, -rr*0.34, rr*0.42, '#ffffff');
  g.globalAlpha = 1;
  g.restore();
}

/* mezcla dos colores en hexadecimal. Va acá y no en el núcleo porque es el
   único juego que lo necesita. */
function mezcla(a, b, k){
  const pa = [1,3,5].map(i => parseInt(a.substr(i,2),16));
  const pb = [1,3,5].map(i => parseInt(b.substr(i,2),16));
  return 'rgb(' + pa.map((v,i) => Math.round(v + (pb[i]-v)*k)).join(',') + ')';
}

function fondoRaro(g){
  const d = g.createLinearGradient(0, 0, 0, AL);
  d.addColorStop(0, '#101018'); d.addColorStop(1, '#191922');
  g.fillStyle = d; g.fillRect(0, 0, AN, AL);
  grano(0, 0, AN, AL, 0.025, 60);
}

/* la grilla de la cinemática: `raro` en -1 quiere decir «ninguno es distinto» */
function rejaCine(g, cols, filas, raro, u){
  const m = 90, alto = AL - 520;
  const p = Math.min((AN - m*2)/cols, alto/filas);
  const x0 = (AN - p*cols)/2, y0 = 260 + (alto - p*filas)/2;
  for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++){
    const k = j*cols + i;
    const esRaro = k === raro;
    const r = p*0.36 * (esRaro ? (1 - 0.22*suave(Math.min(1, u*2))) : 1);
    disco(x0 + i*p + p/2, y0 + j*p + p/2, r,
          esRaro ? '#f0d060' : '#3a63b8');
  }
}
