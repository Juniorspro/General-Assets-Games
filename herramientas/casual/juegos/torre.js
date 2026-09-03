/* ══════════════════════════════ TORRE ══════════════════════════════
   Un bloque va y viene arriba de la torre. Se toca, cae, y lo que sobresale se
   CORTA. Si no queda nada apoyado, se termina.

   POR QUE ESTE GENERO: un solo toque, cero aprendizaje, y una tension que sube
   sola — cada piso deja el bloque mas angosto, asi que el ultimo error es
   siempre inminente. Y el premio del acierto perfecto no es un numero: es que
   el bloque RECUPERA ancho, o sea que jugar bien alarga la partida. Eso es lo
   que hace que se juegue otra vez y no es una decision de puntaje.

   ── EL CORTE ES LA MECANICA ENTERA, Y ES ARITMETICA ──
   El bloque nuevo se queda con la interseccion con el de abajo y nada mas. No
   hay fisica: un bloque que se cae y rueda seria imposible de apuntar. Lo que
   se simula es la pieza cortada cayendo, que es cosmetico y por eso puede ser
   tan barato como se quiera. */

const R_ALTO = 46;             /* alto de cada piso */
const R_W0 = 460;              /* ancho del primer bloque */
const R_MIN = 16;              /* por debajo de esto no se puede apuntar y se pierde */
const R_PERF = 5;              /* tolerancia del perfecto, en unidades de diseño */
const R_PREMIO = 22;           /* lo que devuelve un perfecto */
const R_CAM = 0.16;            /* cuánto se acerca la cámara por piso, suavizado */

const R_TONOS = 16;            /* colores del degradado de la torre */
let R_pisos = [];              /* {x, w, y} de abajo hacia arriba */
let R_mov = null;              /* el bloque que va y viene */
let R_caidas = [];             /* los pedazos cortados, cayendo */
let R_camY = 0, R_camMeta = 0;
let R_perf = 0, R_n = 0, R_mejorAncho = 0;
let R_azar = 99;
function rAz(){ R_azar = (R_azar*1664525 + 1013904223) >>> 0; return R_azar / 4294967296; }

/* ── EL COLOR SALE DEL NUMERO DE PISO Y NO DEL AZAR ──
   Con colores al azar la torre se lee a pila de ladritos de colores; con un
   degradado que gira despacio se lee a UNA torre, y de paso el jugador ve
   cuanto subio sin mirar el numero. */
function rColor(i){
  const t = (i % R_TONOS) / R_TONOS;
  const h = (t*360 + 190) % 360;
  return 'hsl(' + h.toFixed(0) + ',52%,' + (52 + 10*Math.sin(i*0.7)).toFixed(0) + '%)';
}
function rColorOsc(i){
  const t = (i % R_TONOS) / R_TONOS;
  const h = (t*360 + 190) % 360;
  return 'hsl(' + h.toFixed(0) + ',52%,' + (30 + 6*Math.sin(i*0.7)).toFixed(0) + '%)';
}

/* la base de la torre en pantalla: el piso 0 va cerca de abajo y la cámara sube */
function rBaseY(){ return AL - 150; }
function rPisoY(i){ return rBaseY() - i*R_ALTO + R_camY; }

function rNuevoMov(){
  const ult = R_pisos[R_pisos.length-1];
  const w = ult.w;
  /* la velocidad sube con la altura pero se topa: mas alla de cierto punto no
     es dificultad, es loteria. Y el lado del que entra alterna, asi que el
     jugador no puede aprenderse un ritmo. */
  const v = Math.min(560, 240 + R_pisos.length*9);
  const izq = R_pisos.length % 2 === 0;
  R_mov = { x: izq ? -w/2 - 10 : AN + w/2 + 10, w, v: izq ? v : -v,
            i: R_pisos.length, cae: 0, y: 0 };
}

const JT = {
  es: { sub:'Tocá para soltar el bloque. Lo que sobra se corta.',
        c1:'Un bloque que va y viene.',
        c2:'Lo que sobresale se corta, y el bloque se angosta.',
        c3:'Clavalo justo y recuperás ancho.',
        alto:'ALTO', perf:'¡JUSTO!', anchoC:'ANCHO' },
  en: { sub:'Tap to drop the block. Whatever hangs off gets cut.',
        c1:'A block sliding back and forth.',
        c2:'The overhang is sliced off and the block gets narrower.',
        c3:'Nail it dead centre and you win width back.',
        alto:'HEIGHT', perf:'PERFECT!', anchoC:'WIDTH' },
  pt: { sub:'Toque para soltar o bloco. O que sobra é cortado.',
        c1:'Um bloco que vai e volta.',
        c2:'O que sobra é cortado e o bloco fica mais estreito.',
        c3:'Acerte no meio e recupera largura.',
        alto:'ALTURA', perf:'CERTEIRO!', anchoC:'LARGURA' }
};
const PIEL = { ac:'#4fd8c6', tela:'fondo' };
const SON_ALIAS = { bien:'apoya', toque:'corta', pierde:'perder',
                    gana:'gana', clic:'clic', caida:'apoya' };

const JUEGO = {
  id: 'torre',
  tipo: 'puntos',
  vivo: true, gano: false,
  get marca(){ return PUNTOS; },
  get sub(){ return TX('pts'); },
  get ficI(){ return TX('alto') + ' ' + R_n; },
  get ficD(){ return TX('anchoC') + ' ' + Math.round(R_pisos.length ? R_pisos[R_pisos.length-1].w : 0); },
  resta: null,

  planos: [
    { dur: 2.8, pie: 'c1', dibuja(g, u){
        rFondo(g);
        rDemo(g, 3, null);
        /* el bloque cruzando: es la unica cosa que se mueve en el plano y por
           eso es lo que el ojo sigue */
        const x = AN/2 + Math.sin(u*4.2)*230;
        rBloque(g, x, rBaseY() - 3*R_ALTO - R_ALTO/2, 300, 3);
      } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){
        rFondo(g);
        rDemo(g, 3, null);
        /* cae desalineado, se corta, y el pedazo se va: los tres tiempos de la
           mecanica en un plano y sin una palabra */
        const s = suave(Math.min(1, u*1.5));
        const y0 = rBaseY() - 3*R_ALTO - R_ALTO*5;
        const y1 = rBaseY() - 3*R_ALTO - R_ALTO/2;
        const y = y0 + (y1 - y0)*s;
        const off = 92;
        if (s < 0.995){
          rBloque(g, AN/2 + off, y, 300, 3);
        } else {
          const q = Math.min(1, (u - 0.665)*3);
          rBloque(g, AN/2 + off/2 + 104, y1, 300 - 2*off + 2*off, 3);
          /* el pedazo cortado, girando y cayendo */
          g.save();
          g.globalAlpha = Math.max(0, 1 - q);
          rBloque(g, AN/2 + 300/2 - off/2 + 60, y1 + q*q*420, off*2, 3, q*1.6);
          g.restore();
        }
      } },
    { dur: 3.0, pie: 'c3', dibuja(g, u){
        rFondo(g);
        rDemo(g, 5, null);
        const y = rBaseY() - 5*R_ALTO - R_ALTO/2;
        rBloque(g, AN/2, y, 300, 5);
        const p = 0.4 + 0.6*Math.abs(Math.sin(u*6));
        texto(TX('perf'), AN/2, y - 46, 34, 'rgba(255,215,106,' + p.toFixed(2) + ')', '800', 'center');
      } }
  ],

  arranca(){
    R_pisos.length = 0;
    R_pisos.push({ x: AN/2, w: R_W0 });
    R_caidas.length = 0;
    R_camY = 0; R_camMeta = 0; R_perf = 0; R_n = 0;
    R_mejorAncho = R_W0;
    R_azar = (Date.now() ^ 0x5bf03635) >>> 0;
    rNuevoMov();
    this.vivo = true; this.gano = false;
  },

  paso(dt){
    /* la cámara persigue la meta con un lerp: moviéndola de golpe cada piso, la
       torre salta cuarenta y seis píxeles y se lee a error de dibujo */
    R_camMeta = Math.max(0, (R_pisos.length - 5)*R_ALTO);
    R_camY += (R_camMeta - R_camY) * Math.min(1, dt/R_CAM);
    if (R_perf > 0) R_perf = Math.max(0, R_perf - dt*1.7);

    if (R_mov && !R_mov.cae){
      R_mov.x += R_mov.v*dt;
      /* rebota en los bordes CONTANDO SU PROPIO ANCHO, si no la mitad del
         bloque se va de la pantalla y no se puede ver dónde está */
      const lim = AN - R_mov.w/2;
      if (R_mov.x > lim && R_mov.v > 0){ R_mov.x = lim; R_mov.v *= -1; }
      if (R_mov.x < R_mov.w/2 && R_mov.v < 0){ R_mov.x = R_mov.w/2; R_mov.v *= -1; }
    } else if (R_mov && R_mov.cae){
      /* el bloque soltado baja rapido hasta su sitio: sin esa caida el piso
         nuevo APARECE, y aparecer no se lee a apoyarse */
      R_mov.cae += dt*7.5;
      if (R_mov.cae >= 1) this.apoya();
    }
    for (let i = R_caidas.length - 1; i >= 0; i--){
      const c = R_caidas[i];
      c.vy += 2600*dt; c.y += c.vy*dt; c.gi += c.vgi*dt;
      if (c.y > AL + 200) R_caidas.splice(i, 1);
    }
  },

  baja(){
    if (!R_mov || R_mov.cae) return;
    R_mov.cae = 0.0001;
    son('toque', 0.7);
  },

  apoya(){
    const m = R_mov, ult = R_pisos[R_pisos.length-1];
    R_mov = null;
    const i0 = Math.max(m.x - m.w/2, ult.x - ult.w/2);
    const i1 = Math.min(m.x + m.w/2, ult.x + ult.w/2);
    const w = i1 - i0;
    if (w <= 0){
      /* no toca nada: el bloque entero se cae y se termina */
      R_caidas.push({ x: m.x, w: m.w, i: m.i, y: 0, vy: 40, gi: 0, vgi: 3.4 });
      son('pierde');
      sacude(0.5);
      this.vivo = false;
      return;
    }
    const des = Math.abs(m.x - ult.x);
    let nw = w, nx = (i0 + i1)/2;
    if (des <= R_PERF){
      /* ── EL PERFECTO DEVUELVE ANCHO, Y ESO ES LA MITAD DEL JUEGO ──
         Sin premio, la partida es una cuenta regresiva que siempre termina
         igual: cada piso angosta y a los treinta ya no se puede apuntar.
         Devolviendo ancho, jugar bien ALARGA la partida — o sea que el techo
         de la partida lo pone la puntería y no el reloj. */
      nw = Math.min(R_W0, w + R_PREMIO);
      nx = ult.x;
      R_perf = 1;
      sumaPuntos(20 + R_pisos.length*2, nx, rPisoY(m.i) - 30);
      chispas(nx, rPisoY(m.i), 16, '#ffd76a', 220);
      fogonazo(0.20);
      sacude(0.16);
      son('bien', 1);
    } else {
      /* los dos pedazos cortados: pueden ser dos, uno de cada lado */
      const iz = (ult.x - ult.w/2) - (m.x - m.w/2);
      const de = (m.x + m.w/2) - (ult.x + ult.w/2);
      if (iz > 0.5) R_caidas.push({ x: m.x - m.w/2 + iz/2, w: iz, i: m.i, y: 0, vy: 30, gi: 0, vgi: -2.6 });
      if (de > 0.5) R_caidas.push({ x: m.x + m.w/2 - de/2, w: de, i: m.i, y: 0, vy: 30, gi: 0, vgi: 2.6 });
      comboCorta();
      sumaPuntos(6 + R_pisos.length, nx, rPisoY(m.i) - 26);
      son('caida', 0.8);
      sacude(0.06);
    }
    R_pisos.push({ x: nx, w: nw });
    R_n = R_pisos.length - 1;
    R_mejorAncho = Math.max(R_mejorAncho, nw);
    /* ── SE PIERDE POR ANCHO Y NO POR UN CONTADOR ──
        Por debajo de dieciséis unidades de diseño el bloque mide seis píxeles en
        un teléfono: apuntar deja de ser una habilidad y pasa a ser suerte. Ahí
        el juego se termina, que es más honesto que dejar al jugador tirando
        monedas. */
    if (nw < R_MIN){
      son('pierde');
      sacude(0.5);
      this.vivo = false;
      return;
    }
    rNuevoMov();
  },

  fondo(g){ rFondo(g); },

  pinta(g){
    /* sólo los pisos que entran en el cuadro: con doscientos pisos, dibujarlos
       todos son doscientos rectángulos por cuadro para pintar lo que está
       trescientos píxeles por debajo del borde */
    const desde = Math.max(0, R_pisos.length - Math.ceil(AL/R_ALTO) - 2);
    for (let i = desde; i < R_pisos.length; i++){
      const p = R_pisos[i];
      rBloque(g, p.x, rPisoY(i) - R_ALTO/2, p.w, i);
    }
    for (const c of R_caidas){
      g.save();
      g.globalAlpha = Math.max(0, 1 - c.y/(AL*0.9));
      rBloque(g, c.x, rPisoY(c.i) - R_ALTO/2 + c.y, c.w, c.i, c.gi);
      g.restore();
    }
    if (R_mov){
      const y = rPisoY(R_mov.i) - R_ALTO/2;
      if (R_mov.cae){
        const s = Math.min(1, R_mov.cae);
        rBloque(g, R_mov.x, y - (1-s)*R_ALTO*5.5, R_mov.w, R_mov.i);
      } else {
        rBloque(g, R_mov.x, y - R_ALTO*5.5, R_mov.w, R_mov.i);
        /* ── LA GUIA DE LA ORILLA, QUE ES LO QUE HACE QUE SE PUEDA APUNTAR ──
           Con el bloque a doscientos cincuenta píxeles por encima de la torre,
           el ojo no puede comparar dos bordes tan separados. Las dos líneas
           punteadas bajan los bordes del bloque de abajo hasta el de arriba, y
           entonces clavarlo es hacer coincidir dos líneas y no adivinar. */
        const u = R_pisos[R_pisos.length-1];
        g.save();
        g.globalAlpha = 0.30;
        g.strokeStyle = '#f2eee6'; g.lineWidth = 2; g.setLineDash([8, 10]);
        for (const bx of [u.x - u.w/2, u.x + u.w/2]){
          g.beginPath(); g.moveTo(bx, y - R_ALTO*5.5); g.lineTo(bx, rPisoY(R_pisos.length-1)); g.stroke();
        }
        g.setLineDash([]);
        g.restore();
      }
    }
    if (R_perf > 0){
      const y = rPisoY(R_pisos.length-1) - 50;
      texto(TX('perf'), AN/2, y, 30 + R_perf*10,
            'rgba(255,215,106,' + R_perf.toFixed(2) + ')', '800', 'center');
    }
  },

  /* ══════════ EL AUTO-JUGADOR ══════════
     ── LAS DOS PRIMERAS VERSIONES NO MEDIAN NADA, Y ESO SE VIO EN LOS NUMEROS ──
     El honesto predecia con precision de cuadro y sacaba 262 perfectos de 262
     sin fallar uno: correcto para una maquina e INUTIL como medicion, porque
     con el perfecto devolviendo ancho la partida no se termina nunca y el
     numero no dice si el juego es bueno, dice que el bot no es humano.
     Y el azaroso soltaba con un 3,5 % por cuadro desde que el bloque nace FUERA
     de la pantalla, asi que soltaba antes de llegar a la torre y moria en el
     piso 0 con 0 puntos. Dos numeros ciertos y ninguno comparable.

     Ahora el honesto apunta y se EQUIVOCA como una persona —un error de hasta
     tres cuadros, que a la velocidad de arriba son unas veintiocho unidades— y
     el azaroso suelta en un punto cualquiera del recorrido, ya adentro del
     cuadro. Ahi los dos numeros hablan de lo mismo. */
  juegaSolo(n, azar){
    this.arranca();
    R_azar = 4242;
    let perfectos = 0, pisos0 = 0, esperaErr = -1;
    for (let i = 0; i < n && this.vivo; i++){
      if (R_mov && !R_mov.cae){
        const u = R_pisos[R_pisos.length-1];
        if (azar){
          /* sólo cuando el bloque ya está en cuadro: soltarlo antes es perder
             en el primer piso y eso no compara con nada */
          if (R_mov.x > 70 && R_mov.x < AN - 70 && rAz() < 0.055) this.baja();
        } else {
          const sig = R_mov.x + R_mov.v*(1/60);
          const d0 = Math.abs(R_mov.x - u.x), d1 = Math.abs(sig - u.x);
          if (esperaErr < 0 && d1 > d0 && d0 < 40) esperaErr = Math.floor(rAz()*4);
          if (esperaErr === 0){ this.baja(); esperaErr = -1; }
          else if (esperaErr > 0) esperaErr--;
        }
      }
      const antes = R_perf;
      this.paso(1/60);
      if (R_perf > antes) perfectos++;
      pisos0 = R_pisos.length - 1;
      if (!R_mov || R_mov.cae) esperaErr = -1;
    }
    return { puntos: PUNTOS, pisos: pisos0, perfectos,
             ancho: +(R_pisos.length ? R_pisos[R_pisos.length-1].w : 0).toFixed(1),
             vivo: !!this.vivo, pasos: n };
  },

  ver(){
    return { pisos: R_pisos.length - 1, ancho: +R_pisos[R_pisos.length-1].w.toFixed(1),
             cam: +R_camY.toFixed(1), meta: +R_camMeta.toFixed(1),
             mov: R_mov ? { x: +R_mov.x.toFixed(1), w: +R_mov.w.toFixed(1),
                            v: +R_mov.v.toFixed(0), cae: +R_mov.cae.toFixed(2) } : null,
             caidas: R_caidas.length, perf: +R_perf.toFixed(2),
             /* que la torre siga apoyada: un piso que no se solapa con el de
                abajo seria un corte mal calculado, y eso no se ve en una foto */
             sueltos: (() => { let k = 0;
               for (let i = 1; i < R_pisos.length; i++){
                 const a = R_pisos[i-1], b = R_pisos[i];
                 if (Math.min(a.x+a.w/2, b.x+b.w/2) - Math.max(a.x-a.w/2, b.x-b.w/2) <= 0) k++;
               } return k; })() };
  }
};

/* ══════════ EL BLOQUE ══════════
   Tres cosas y las tres se ven: la cara con degradado vertical, la franja
   oscura de abajo —que es lo que da el espesor y hace que la pila se lea a
   pila y no a rayas— y el filo claro de arriba. */
function rBloque(g, x, y, w, i, gi){
  if (w <= 0) return;
  const h = R_ALTO;
  g.save();
  g.translate(x, y);
  if (gi) g.rotate(gi);
  if (dibCuadro('bloques', i % 8, 0, h/2, h, false)){ g.restore(); return; }
  const gr = g.createLinearGradient(0, -h/2, 0, h/2);
  gr.addColorStop(0, rColor(i));
  gr.addColorStop(1, rColorOsc(i));
  g.fillStyle = gr;
  g.beginPath();
  const r = Math.min(7, w*0.16);
  g.moveTo(-w/2 + r, -h/2);
  g.lineTo(w/2 - r, -h/2); g.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
  g.lineTo(w/2, h/2 - r); g.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
  g.lineTo(-w/2 + r, h/2); g.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
  g.lineTo(-w/2, -h/2 + r); g.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.22)';
  g.fillRect(-w/2 + r*0.4, -h/2, Math.max(0, w - r*0.8), 3);
  g.fillStyle = 'rgba(0,0,0,.26)';
  g.fillRect(-w/2 + r*0.4, h/2 - 5, Math.max(0, w - r*0.8), 5);
  g.restore();
}

function rDemo(g, n, _){
  for (let i = 0; i <= n; i++){
    const w = R_W0 - i*34;
    rBloque(g, AN/2 + Math.sin(i*1.3)*16, rBaseY() - i*R_ALTO - R_ALTO/2, w, i);
  }
}

function rFondo(g){
  if (dibCubre('fondo')) return;
  const gr = g.createLinearGradient(0, 0, 0, AL);
  gr.addColorStop(0, '#0b1e2c');
  gr.addColorStop(0.5, '#16374a');
  gr.addColorStop(1, '#2a5566');
  g.fillStyle = gr; g.fillRect(0, 0, AN, AL);
  /* ── LAS NUBES SE MUEVEN CON LA CAMARA, Y ESO ES TODA LA SENSACION DE SUBIR ──
     Con el fondo quieto, la torre crece y la pantalla no dice nada: subir
     cuarenta pisos se ve igual que subir dos. Las nubes bajan a un tercio de la
     camara y se repiten por modulo, asi que siempre hay nubes y nunca hay una
     costura adentro del cuadro. */
  const desp = (R_camY*0.34) % 420;
  g.fillStyle = 'rgba(255,255,255,.055)';
  for (let k = -1; k < Math.ceil(AL/420) + 1; k++){
    const y = k*420 + desp;
    g.beginPath();
    g.ellipse(AN*0.24, y + 60, 190, 44, 0, 0, 7); g.fill();
    g.beginPath();
    g.ellipse(AN*0.78, y + 250, 230, 52, 0, 0, 7); g.fill();
  }
  /* el suelo, sólo mientras la cámara no subió: dibujado siempre, se ve una
     banda marrón flotando a cincuenta pisos de altura */
  const sy = rBaseY() + R_camY;
  if (sy < AL + 40){
    g.fillStyle = '#1b2a1a';
    g.fillRect(0, sy, AN, AL - sy + 40);
    g.fillStyle = 'rgba(255,255,255,.05)';
    g.fillRect(0, sy, AN, 3);
  }
}
