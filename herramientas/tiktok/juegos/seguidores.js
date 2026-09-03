/* ══════════════════════════ SEGUIDORES ══════════════════════════
   Caen corazones y caen haters. Los corazones se juntan, los haters se
   esquivan. Tres vidas. El marcador son los seguidores.

   ES EL MOLDE DEL CAÍDO —el de *Fruit Frenzy*, uno de los catorce que TikTok
   tiene en prueba— y está acá por una razón que no es la mecánica: es el único
   de los cinco cuyo marcador **es** la métrica de la aplicación en la que vive.
   Un número de seguidores subiendo no hay que explicarlo, y perder tres vidas
   se lee a que te cancelaron. Eso es lo que hace que el resultado se quiera
   mostrar, que es lo único que un minijuego de una red social necesita.

   ── EL DEDO NO ARRASTRA AL PERSONAJE, LO LLAMA ──
   Ésta es la decisión que ordena el control entero. Si el personaje se pegara
   al dedo, tocar en el borde izquierdo lo TELETRANSPORTARÍA ahí, y en un juego
   donde un hater a media pantalla te cuesta una vida, un salto de trescientos
   píxeles es una muerte que el jugador no produjo. Y peor: obligaría a poner el
   dedo ENCIMA del personaje, o sea a taparlo con la mano justo en el borde de
   abajo, que es donde vive.
   Así que el dedo pone un DESTINO y el personaje va hacia él con velocidad
   máxima. Se puede tocar en cualquier parte de la pantalla, el pulgar nunca
   tapa nada, y el movimiento tiene un techo — o sea que esquivar es una
   decisión con costo y no un teletransporte. */

const JT = {
  es: { sub: 'Juntá los corazones.\nEsquivá los haters. Tres vidas.',
        seg: 'SEGUIDORES', vidas: 'VIDAS',
        c1: 'Empezás con cero.',
        c2: 'Los corazones caen.',
        c3: 'Los haters también.',
        c4: 'Movete con el dedo.' },
  en: { sub: 'Catch the hearts.\nDodge the haters. Three lives.',
        seg: 'FOLLOWERS', vidas: 'LIVES',
        c1: 'You start at zero.',
        c2: 'Hearts fall.',
        c3: 'So do haters.',
        c4: 'Slide your finger.' },
  pt: { sub: 'Pegue os corações.\nDesvie dos haters. Três vidas.',
        seg: 'SEGUIDORES', vidas: 'VIDAS',
        c1: 'Você começa em zero.',
        c2: 'Os corações caem.',
        c3: 'Os haters também.',
        c4: 'Deslize o dedo.' }
};

/* ── LAS TRES COSAS QUE CAEN ──
   Dos alcanzarían para el juego (una buena y una mala) y la tercera está por lo
   que le hace a la CURVA: sin el rayo, la única forma de que el número suba más
   rápido es que caigan más corazones, y más corazones es menos hueco para
   esquivar. El rayo sube el número sin apretar el tablero. */
/* la piel del menú y los sonidos generados */
const PIEL = { ac: '#e0553f', tela: 'fondo' };
const SON_ALIAS = { bien: 'cor', mal: 'hater' };

const COSAS = {
  corazon: { r: 34, col: '#e0553f', vale: 1 },
  rayo:    { r: 32, col: '#e8c34a', vale: 5 },
  hater:   { r: 36, col: '#2a2a36', vale: 0 }
};

const VMAX = 1100;                  /* px de diseño por segundo: cruzar el marco cuesta 0,65 s */
const R_JUG = 42;
const R_TOCA = 62;                  /* el blanco es generoso a propósito: lo que tiene que
                                       costar es LLEGAR, no clavar el píxel */
const YJ = () => AL - 230;          /* el personaje vive anclado abajo, así que sale del alto */

const S = {
  x: 360, tx: 360, vidas: 3, seg: 0, t: 0, cd: 0, inv: 0,
  cosas: [], pisos: 0, aviso: 0, guino: 0
};

const JUEGO = {
  id: 'seguidores', vivo: false, gano: false, marca: 0, resta: null,

  planos: [
    { dur: 2.2, pie: 'c1', dibuja: (g, u) => {
        fondoSeg(g, 0);
        muneco(g, 360, AL*0.58, 1.5, 0);
        texto('0', 360, AL*0.34, 96, 'rgba(242,238,230,' + (0.25 + 0.55*suave(u)).toFixed(2) + ')');
      } },
    { dur: 2.2, pie: 'c2', dibuja: (g, u) => {
        fondoSeg(g, u*40);
        for (let i = 0; i < 5; i++){
          const p = (u + i*0.2) % 1;
          corazon(g, 110 + i*125, -40 + p*(AL*0.72), 30, '#e0553f');
        }
        muneco(g, 360, AL*0.78, 1.2, 0);
      } },
    { dur: 2.2, pie: 'c3', dibuja: (g, u) => {
        fondoSeg(g, 40 + u*40);
        for (let i = 0; i < 3; i++){
          const p = (u + i*0.33) % 1;
          hater(g, 160 + i*200, -40 + p*(AL*0.72), 34);
        }
        muneco(g, 360, AL*0.78, 1.2, 0.4);
      } },
    { dur: 2.4, pie: 'c4', dibuja: (g, u) => {
        fondoSeg(g, 80 + u*40);
        /* el personaje cruza siguiendo un dedo dibujado: el control contado sin
           una palabra, que es para lo que sirve una cinemática de tres segundos */
        const x = 200 + suave(u)*320;
        muneco(g, x, AL*0.78, 1.2, 0);
        /* el dedo va en 0,845 del alto y no en 0,90: el pie de la cinematica vive
           a 9vh del borde, o sea desde 0,88 del alto de diseño para abajo, y con
           0,90 el dedo quedaba dibujado ENCIMA de la frase que lo explica */
        g.globalAlpha = 0.5;
        disco(200 + suave(Math.min(1, u*1.15))*320, AL*0.845, 30, '#f2eee6');
        g.globalAlpha = 1;
        corazon(g, 520, AL*0.42, 30, '#e0553f');
      } }
  ],

  arranca(){
    S.x = S.tx = AN/2;
    S.vidas = 3; S.seg = 0; S.t = 0; S.cd = 0.7; S.inv = 0;
    S.cosas.length = 0; S.pisos = 0; S.aviso = 0; S.guino = 0;
    JUEGO.vivo = true; JUEGO.gano = false; JUEGO.marca = '0'; JUEGO.resta = null;
  },

  paso(dt){
    S.t += dt;
    if (S.inv > 0) S.inv -= dt;
    if (S.aviso > 0) S.aviso -= dt;
    if (S.guino > 0) S.guino -= dt;

    /* ── EL PERSONAJE VA AL DESTINO CON TECHO DE VELOCIDAD ── */
    const d = S.tx - S.x, m = VMAX*dt;
    S.x += Math.abs(d) <= m ? d : Math.sign(d)*m;
    S.x = Math.max(80, Math.min(AN - 80, S.x));

    /* la dificultad es el tiempo y nada más: no hay niveles ni tandas, así que
       no hay un escalón donde el juego cambie de golpe */
    /* ── LOS TRES NUMEROS DE LA DIFICULTAD SALIERON DE MEDIR, NO DE ESTIMAR ──
       Con la primera tanda (una cosa cada 0,85 s bajando a 0,30 y el 20-50 % de
       haters) el auto-jugador AL AZAR sobrevivia los cincuenta segundos enteros
       perdiendo UNA vida: o sea que quedarse en el medio moviendose sin mirar era
       una partida ganada, y entonces el juego no tenia ninguna decision adentro.
       Con estos tres el que mira aguanta y el que no, muere. */
    const vel = Math.min(760, 280 + S.t*11);
    const cada = Math.max(0.22, 0.78 - S.t*0.014);

    S.cd -= dt;
    if (S.cd <= 0){ S.cd = cada*(0.75 + Math.random()*0.5); suelta(vel); }

    const yj = YJ();
    for (let i = S.cosas.length - 1; i >= 0; i--){
      const c = S.cosas[i];
      c.y += c.v*dt;
      c.gi += dt*c.gv;
      if (c.y > AL + 70){
        S.cosas.splice(i, 1);
        continue;
      }
      const dx = c.x - S.x, dy = c.y - yj;
      if (dx*dx + dy*dy < R_TOCA*R_TOCA){
        S.cosas.splice(i, 1);
        if (c.k === 'hater') golpe();
        else {
          S.seg += COSAS[c.k].vale;
          PUNTOS = S.seg;
          S.guino = 0.22;
          son('bien');
        }
      }
    }
    JUEGO.marca = fmt(S.seg);
  },

  fondo(g){
    /* el feed generado, con un velo: sin él los corazones rojos y los haters
       oscuros compiten con el neón rosa y cian del fondo, y en un juego de
       esquivar lo que hay que ver es lo que cae */
    if (dibCubre('fondo')){
      g.fillStyle = 'rgba(9,9,15,.52)'; g.fillRect(0, 0, AN, AL);
      grano(0, 0, AN, AL, 0.018, 40);
    } else fondoSeg(g, S.t*90);
  },

  pinta(g){
    for (const c of S.cosas) cosa(g, c);
    /* parpadea mientras es invulnerable: si no, recibir un golpe y seguir vivo
       se ve igual que recibir un golpe y no haberlo recibido */
    const ver = S.inv <= 0 || Math.floor(S.inv*14) % 2 === 0;
    if (ver && !munecoSprite(g, S.x, YJ() + 30, 1, S.guino > 0)) muneco(g, S.x, YJ(), 1, 0, S.guino > 0);
    vidasDibujo(g);
  },

  baja(x){ S.tx = Math.max(80, Math.min(AN - 80, x)); },
  pinta2(){},
  mueve(x){ S.tx = Math.max(80, Math.min(AN - 80, x)); },

  pintaTextos(){},

  /* ── EL AUTO-JUGADOR ──
     Dos versiones, y la comparación entre las dos es la prueba de que el juego
     tiene decisión adentro: uno que mira qué cae aguanta, uno que se mueve al
     azar muere en segundos. Si los dos duraran lo mismo, el juego sería una
     animación. */
  juegaSolo(n, azar){
    JUEGO.arranca();
    let v = 0;
    while (JUEGO.vivo && v < n){
      S.tx = azar ? 80 + Math.random()*(AN - 160) : decideSeg();
      JUEGO.paso(PASO);
      v++;
    }
    return { vueltas: v, segundos: +(v/60).toFixed(1), seguidores: S.seg,
             puntos: PUNTOS, vidas: S.vidas, golpes: S.pisos,
             cosas: S.cosas.length, vivo: JUEGO.vivo };
  }
};

/* esquivar primero y juntar después: un corazón vale uno y un hater vale un
   tercio de la partida, así que ni la mejor recolección paga un golpe */
function decideSeg(){
  const yj = YJ();
  let peor = null, mejor = null;
  for (const c of S.cosas){
    if (c.y > yj + 50) continue;
    const dt = (yj - c.y) / c.v;
    if (c.k === 'hater'){
      if (Math.abs(c.x - S.x) < 190 && dt < 0.95 && (!peor || dt < peor.dt)) peor = { c, dt };
    } else if (!mejor || dt < mejor.dt) mejor = { c, dt };
  }
  if (peor) return peor.c.x < AN/2 ? AN - 90 : 90;
  return mejor ? mejor.c.x : S.x;
}

function golpe(){
  if (S.inv > 0) return;
  S.vidas--; S.pisos++; S.inv = 0.75;
  S.aviso = 0.9;
  son('mal');
  fogonazo(0.30);
  if (S.vidas <= 0){
    JUEGO.vivo = false;
    /* «bien» es haber llegado a cien seguidores: sin un umbral, el cartel del
       final dice lo mismo con tres seguidores y con trescientos */
    JUEGO.gano = S.seg >= 100;
  }
}

/* ── DÓNDE CAE CADA COSA, Y LA REGLA QUE HACE QUE SEA JUGABLE ──
   Un hater y un corazón que llegan al mismo tiempo y pegados uno al otro no son
   una decisión: son una moneda al aire, porque juntar el corazón ES chocar el
   hater. Así que un hater no nace al lado de algo que valga puntos.

   Y ACÁ HUBO UN DEFECTO MÍO QUE SÓLO SE VIO MIDIENDO. La primera versión
   comparaba contra CUALQUIER cosa que estuviera en pantalla (`c.y > -260`, que
   para una cosa viva es siempre verdadero), y cada corazón bloqueaba 300 px de
   los 560 que hay: con ocho cosas en el aire no quedaba un solo sitio libre, se
   agotaban los doce intentos y el respaldo soltaba un corazón. O sea que casi
   no salían haters.
   Lo cantó el auto-jugador al azar: sobrevivía SETENTA SEGUNDOS con CERO
   golpes juntando sesenta corazones — y eso no puede ser azar, porque si toca
   la mitad de los corazones tiene que tocar también su parte de los haters.
   Los tres números de la dificultad y el auto-jugador daban todos resultados
   plausibles y ninguno medía lo que yo creía.

   Lo que importa no es la distancia en x contra todo, es contra lo que llega EN
   EL MISMO MOMENTO: dos cosas separadas 230 px de altura son 0,4 s de caída y
   ya no se cruzan. */
const CERCA_Y = 230;

function suelta(vel){
  const pHater = Math.min(0.56, 0.24 + S.t*0.009);
  const pRayo = S.t > 8 ? 0.07 : 0;
  const r = Math.random();
  const k = r < pRayo ? 'rayo' : (r < pRayo + pHater ? 'hater' : 'corazon');
  let x = 0, sirve = false;
  for (let i = 0; i < 12 && !sirve; i++){
    x = 80 + Math.random()*(AN - 160);
    sirve = true;
    for (const c of S.cosas){
      if (c.y > CERCA_Y) continue;                 /* ya bajó: no comparte el momento */
      /* un hater al lado de algo que se junta necesita el doble de aire que dos
         cosas del mismo signo, que sólo necesitan no taparse */
      const min = (k === 'hater') !== (c.k === 'hater') ? 150 : 90;
      if (Math.abs(c.x - x) < min){ sirve = false; break; }
    }
  }
  /* si en doce intentos no hay sitio, el tablero está lleno arriba y NO se
     suelta nada. El respaldo anterior soltaba un corazón, y eso es lo que
     rompía la mezcla: el caso raro dejaba de ser raro y se convirtió en la
     mitad de las tiradas. Perder un cuarto de segundo de tirada no se nota;
     soltar la cosa equivocada, sí. */
  if (!sirve) return;
  S.cosas.push({ k, x, y: -60, v: vel*(0.88 + Math.random()*0.24),
                 gi: Math.random()*6, gv: (Math.random() - 0.5)*2.2 });
}

const fmt = (n) => n >= 1000 ? (n/1000).toFixed(1).replace('.', ',') + ' K' : String(n);

/* ══════════════════════ DIBUJO ══════════════════════ */

/* el fondo es un feed que baja: rectángulos de «publicaciones» desplazándose.
   Cuesta seis rellenos y es lo que dice en qué aplicación pasa esto sin escribir
   una palabra ni bajar una imagen. */
function fondoSeg(g, off){
  const d = g.createLinearGradient(0, 0, 0, AL);
  d.addColorStop(0, '#0e0e16'); d.addColorStop(1, '#16161f');
  g.fillStyle = d; g.fillRect(0, 0, AN, AL);
  const paso = 330, o = off % paso;
  g.globalAlpha = 0.055;
  for (let y = -paso + o; y < AL + paso; y += paso){
    caja2(56, y, AN - 112, 250, 26, '#f2eee6', null);
    g.fillStyle = '#07070b';
    g.fillRect(86, y + 210, 220, 12);
  }
  g.globalAlpha = 1;
  grano(0, 0, AN, AL, 0.022, 60);
}

/* ── LOS TRES ICONOS SON UNA HOJA GENERADA, Y EL ORDEN NO SE ADIVINA ──
   La hoja se pidió con los tres en un orden explícito —corazón, rayo, hater— y
   acá se lee por ÍNDICE. Si algún día la hoja se regenera en otro orden, esto
   es el único sitio que hay que tocar. */
const ICONO = { corazon: 0, rayo: 1, hater: 2 };

function cosa(g, c){
  const o = IMG.iconos;
  if (o && o.ok){
    const r = COSAS[c.k].r*1.42;      /* el icono trae su propio aire alrededor */
    g.save();
    g.translate(c.x, c.y);
    g.rotate(Math.sin(c.gi)*(c.k === 'hater' ? 0.14 : 0.20));
    g.drawImage(o.im, ICONO[c.k]*o.w, 0, o.w, o.h, -r, -r, r*2, r*2);
    g.restore();
    return;
  }
  /* el respaldo dibujado por código: mientras la hoja no decodifique, y para
     siempre si no decodifica nunca */
  if (c.k === 'corazon') corazon(g, c.x, c.y, COSAS.corazon.r, COSAS.corazon.col, c.gi);
  else if (c.k === 'rayo') rayo(g, c.x, c.y, COSAS.rayo.r, c.gi);
  else hater(g, c.x, c.y, COSAS.hater.r, c.gi);
}

function corazon(g, x, y, r, col, gi){
  g.save(); g.translate(x, y); if (gi) g.rotate(Math.sin(gi)*0.18);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, r*0.92);
  g.bezierCurveTo(-r*1.42, -r*0.26, -r*0.56, -r*1.16, 0, -r*0.34);
  g.bezierCurveTo(r*0.56, -r*1.16, r*1.42, -r*0.26, 0, r*0.92);
  g.fill();
  g.globalAlpha = 0.30;
  disco(-r*0.34, -r*0.42, r*0.26, '#ffffff');
  g.globalAlpha = 1;
  g.restore();
}

function rayo(g, x, y, r, gi){
  g.save(); g.translate(x, y); if (gi) g.rotate(Math.sin(gi)*0.22);
  g.fillStyle = COSAS.rayo.col;
  g.beginPath();
  g.moveTo(-r*0.26, -r*1.05); g.lineTo(r*0.46, -r*0.14); g.lineTo(r*0.06, -r*0.10);
  g.lineTo(r*0.34, r*1.05); g.lineTo(-r*0.48, r*0.06); g.lineTo(-r*0.06, r*0.02);
  g.closePath(); g.fill();
  g.restore();
}

/* ── EL HATER SE LEE POR LA SILUETA, NO POR LA CARA ──
   A treinta píxeles de radio y cayendo, dos ojos y una boca no se distinguen de
   dos ojos y otra boca. Lo que sí se distingue en un cuadro es el CONTORNO: el
   corazón es redondo y blando, el hater es una punta hacia abajo. Los ojos van
   igual, pero son la confirmación y no la información. */
function hater(g, x, y, r, gi){
  g.save(); g.translate(x, y); if (gi) g.rotate(Math.sin(gi)*0.14);
  g.fillStyle = COSAS.hater.col;
  g.beginPath();
  g.moveTo(-r, -r*0.72);
  g.lineTo(r, -r*0.72);
  g.lineTo(r*0.62, r*0.30);
  g.lineTo(0, r*1.08);
  g.lineTo(-r*0.62, r*0.30);
  g.closePath(); g.fill();
  g.strokeStyle = '#e0553f'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(-r*0.60, -r*0.44); g.lineTo(-r*0.16, -r*0.20); g.stroke();
  g.beginPath(); g.moveTo(r*0.60, -r*0.44); g.lineTo(r*0.16, -r*0.20); g.stroke();
  disco(-r*0.34, -r*0.02, r*0.13, '#e0553f');
  disco(r*0.34, -r*0.02, r*0.13, '#e0553f');
  g.restore();
}

/* el personaje: cabeza, cuerpo y un teléfono en la mano. Con `guino` puesto se
   agranda un instante — es el acuse de recibo del acierto, y va en el
   personaje y no en la pantalla porque un fogonazo de pantalla completa en un
   juego de esquivar te deja sin ver lo que viene. */
/* ── EL PERSONAJE: CUATRO CUADROS Y LOS ELIGE EL ESTADO ──
   No es una animación en bucle: el cuadro sale de lo que el jugador está
   haciendo —se inclina hacia donde se mueve y festeja cuando junta— así que la
   animación ES información y no decoración. Con un ciclo por tiempo, el
   personaje se movería igual estando quieto y el juego se leería a video. */
function munecoSprite(g, x, y, esc, guino){
  const o = IMG.pj;
  if (!o || !o.ok) return false;
  const v = S.tx - S.x;
  const i = guino ? 3 : (v > 26 ? 2 : (v < -26 ? 1 : 0));
  const alto = 310*esc*(guino ? 1.06 : 1);
  /* el aro de luz: es lo único que este personaje tiene de streamer y no está
     en el sprite, así que se dibuja detrás */
  /* el aro de luz, tenue y cálido: al 13 % de blanco se leía a disco gris
     detrás de la cabeza y no a luz */
  g.globalAlpha = 0.10;
  disco(x, y - alto*0.70, alto*0.30, '#ffd9a0');
  g.globalAlpha = 1;
  dibCuadro('pj', i, x, y, alto);
  return true;
}

function muneco(g, x, y, esc, enojo, guino){
  const e = esc*(guino ? 1.10 : 1);
  g.save(); g.translate(x, y); g.scale(e, e);
  /* el aro de luz: lo único que este personaje tiene de streamer, y es un arco */
  g.globalAlpha = 0.12;
  disco(0, -18, 74, '#f2eee6');
  g.globalAlpha = 1;
  caja2(-34, -14, 68, 78, 22, '#3a63b8', null);
  disco(0, -34, 34, '#e8c39a');
  g.fillStyle = '#20202a';
  g.beginPath(); g.arc(0, -46, 34, Math.PI*1.06, Math.PI*1.94); g.fill();
  disco(-12, -32, 5, '#20202a'); disco(12, -32, 5, '#20202a');
  g.strokeStyle = '#20202a'; g.lineWidth = 4; g.beginPath();
  if (enojo){ g.arc(0, -14, 12, Math.PI*1.15, Math.PI*1.85); }
  else { g.arc(0, -24, 12, Math.PI*0.15, Math.PI*0.85); }
  g.stroke();
  caja2(26, 4, 22, 34, 6, '#20202a', null);
  caja2(29, 8, 16, 26, 3, '#7fd0a0', null);
  g.restore();
}

/* las vidas van DIBUJADAS y no en el HUD, y no es capricho: el HUD sólo tiene
   el número y la barra, y agregarle una tercera cosa obligaría a traducirla y
   a acomodarla contra las otras dos en cada tamaño de pantalla. Tres corazones
   chicos no necesitan una palabra. */
function vidasDibujo(g){
  for (let i = 0; i < 3; i++){
    const lleno = i < S.vidas;
    g.globalAlpha = lleno ? 1 : 0.20;
    const o = IMG.iconos;
    if (o && o.ok) g.drawImage(o.im, 0, 0, o.w, o.h, 74 + i*54 - 24, 175 - 24, 48, 48);
    else corazon(g, 74 + i*54, 175, 17, lleno ? '#e0553f' : '#f2eee6');
    g.globalAlpha = 1;
  }
  if (S.aviso > 0){
    g.globalAlpha = Math.min(1, S.aviso*1.6);
    texto('−1', 74 + S.vidas*54, 130, 34, '#e0553f');
    g.globalAlpha = 1;
  }
}
