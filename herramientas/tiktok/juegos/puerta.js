/* ══════════════════════════ PUERTA ══════════════════════════
   Sos el de la puerta del boliche. Llega gente de a uno y decidís SÍ o NO.

   LA IDEA ENTERA ES QUE LA REGLA NO SE DICE. Cada tanto cambia, y la única
   forma de saber cuál es ahora es equivocarse una vez. Eso es lo que hace que
   el juego sea de JUICIO y no de reflejos — que es el molde que de verdad
   funciona en TikTok: la mitad de los catorce que están en prueba ahí son de
   decidir, no de destreza, porque lo que se filma es la cara del que se dio
   cuenta tarde.

   Y HAY UNA REGLA DE JUSTICIA QUE NO SE PUEDE SALTEAR: el primer error después
   de un cambio de regla NO CUESTA VIDA. Un juego no puede cobrarte información
   que no tenías forma de tener; sin esa excepción, «la regla cambió» es una
   trampa y el jugador deja de jugar en la tercera partida. El error gratis ES
   el aviso de que cambió — y encima el cartel de arriba de la puerta titila,
   así que a las dos o tres veces el jugador descubre el aviso por su cuenta.
   Descubrir un aviso engancha; leerlo en un tutorial, no. */

const JT = {
  es: { sub: 'Sos el de la puerta. Dejás entrar o no.\nLa regla cambia sola y nadie te la dice.',
        si: 'ENTRA', no: 'NO', vidas: 'VIDAS', cambio: 'CAMBIÓ LA REGLA',
        gratis: 'ESTE NO TE COSTÓ NADA',
        c1: 'Viernes. La cola da la vuelta a la manzana.',
        c2: 'El encargado te da la lista de quiénes pueden entrar.',
        c3: 'Y la quema adelante tuyo.',
        c4: 'Arreglate.' },
  en: { sub: "You work the door. Let them in, or don't.\nThe rule changes on its own and nobody tells you.",
        si: 'IN', no: 'NO', vidas: 'LIVES', cambio: 'THE RULE CHANGED',
        gratis: 'THAT ONE WAS FREE',
        c1: 'Friday night. The queue goes around the block.',
        c2: 'The manager hands you the list of who gets in.',
        c3: 'And burns it in front of you.',
        c4: 'Figure it out.' },
  pt: { sub: 'Você é o da porta. Deixa entrar ou não.\nA regra muda sozinha e ninguém te avisa.',
        si: 'ENTRA', no: 'NÃO', vidas: 'VIDAS', cambio: 'A REGRA MUDOU',
        gratis: 'ESSA FOI DE GRAÇA',
        c1: 'Sexta. A fila dá a volta no quarteirão.',
        c2: 'O gerente te dá a lista de quem pode entrar.',
        c3: 'E queima na sua frente.',
        c4: 'Se arranja.' }
};

/* ── LOS COLORES SON POCOS Y BIEN SEPARADOS ──
   Una de las seis reglas es «sólo los de tal color», así que los colores tienen
   que distinguirse de un vistazo en un teléfono chico y de noche. Cuatro muy
   distintos entre sí valen más que ocho parecidos: con ocho, la regla del color
   deja de ser deducible y pasa a ser adivinar. */
/* la piel del menú: el color de acento y qué imagen hace de telón. Los cinco
   juegos comparten la estructura del menú y no el color. */
const PIEL = { ac: '#e8b46a', tela: 'fondo' };

/* los sonidos generados que reemplazan a los osciladores. Si una muestra no
   decodificó, suena el sintetizado de siempre — un juego mudo por un
   decodificador es peor que un juego con bips. */
const SON_ALIAS = { bien: 'pase', mal: 'no' };

const ROPA = [
  { n: 'rojo',    c: '#c8412f' },
  { n: 'verde',   c: '#3f8f5c' },
  { n: 'azul',    c: '#3a63b8' },
  { n: 'amarillo',c: '#c9a227' }
];

/* las seis reglas. Cada una mira UN rasgo y nada más: una regla compuesta
   («con lentes y sin gorro») no se puede deducir de un error, y todo el juego
   se apoya en que un error alcance. */
const REGLAS = [
  { id: 'sinGorro',  ok: (p) => !p.gorro },
  { id: 'conLentes', ok: (p) => p.lentes },
  { id: 'sinBotella',ok: (p) => !p.botella },
  { id: 'conPase',   ok: (p) => p.pase },
  /* ── «CABEZA CUADRADA» SE FUE Y ENTRÓ «BUFANDA», Y ES POR EL SPRITE ──
     La regla vieja miraba la forma de la cabeza, y eso se podía dibujar cuando
     la persona era un montón de cajas. Con el cuerpo generado la cabeza es la
     que es: lo que se puede agregar encima son PRENDAS. Una bufanda al cuello
     se ve de un vistazo en un teléfono chico, que es la única condición que un
     rasgo tiene que cumplir acá. */
  { id: 'bufanda',   ok: (p) => p.bufanda },
  { id: 'color',     ok: (p, r) => p.ropa === r.color }
];

const P = {
  vidas: 3, aciertos: 0, regla: null, desdeCambio: 0, gratis: false,
  per: null, fase: 'entra', ft: 0, limite: 2.6, cartel: 0, aviso: 0, avisoT: 0
};

const JUEGO = {
  id: 'puerta', vivo: false, gano: false,
  marca: 0, resta: null,

  /* ══════════ LA CINEMÁTICA ══════════ */
  planos: [
    { dur: 3.2, pie: 'c1', dibuja: (g, u) => {
        fondoCalle(g, 0.35);
        /* la cola: siluetas que se van hacia el fondo, cada vez más chicas y más
           oscuras. Es lo único que hace que se lea «hay mucha gente» sin dibujar
           mucha gente. */
        for (let i = 0; i < 9; i++){
          const k = i/8;
          const x = 150 + k*520 + Math.sin(u*2 + i)*4;
          const s = 1 - k*0.62;
          siluetaCola(g, x, 900 - k*250, s, 0.30 + (1-k)*0.45);
        }
      } },
    { dur: 3.0, pie: 'c2', dibuja: (g, u) => {
        fondoCalle(g, 0.5);
        /* la lista: un papel que entra desde abajo */
        const y = 900 - suave(Math.min(1, u*1.6))*260;
        g.save(); g.translate(360, y); g.rotate(-0.06);
        caja2(-150, -100, 300, 200, 8, '#e8e2d2', 'rgba(0,0,0,.3)');
        for (let i = 0; i < 6; i++){
          g.fillStyle = 'rgba(30,28,26,.55)';
          g.fillRect(-118, -70 + i*26, 200 - (i%3)*44, 7);
        }
        g.restore();
      } },
    { dur: 2.8, pie: 'c3', dibuja: (g, u) => {
        fondoCalle(g, 0.5 + u*0.3);
        const y = 640;
        g.save(); g.translate(360, y); g.rotate(-0.06 + u*0.12);
        /* el papel se consume DESDE ABAJO: dibujar la llama encima de un papel
           entero se lee a papel con una llama al lado */
        const q = suave(u);
        caja2(-150, -100, 300, 200*(1 - q*0.92), 8, '#e8e2d2', null);
        for (let i = 0; i < 5; i++){
          const fx = -140 + Math.random()*280;
          const fy = -100 + 200*(1 - q*0.92) + Math.random()*40;
          disco(fx, fy, 6 + Math.random()*18, i % 2 ? 'rgba(228,120,40,.55)' : 'rgba(240,190,70,.5)');
        }
        g.restore();
        /* el humo */
        for (let i = 0; i < 12; i++)
          disco(360 + Math.sin(i*1.7 + u*3)*60, 560 - i*34 - u*90, 14 + i*3,
                'rgba(120,118,124,' + (0.16 - i*0.011).toFixed(3) + ')');
      } },
    { dur: 2.6, pie: 'c4', dibuja: (g, u) => {
        fondoCalle(g, 0.9);
        /* solo, de espaldas, delante de la puerta */
        puertaDibujo(g, 1);
        siluetaCola(g, 360, 1010, 1.5, 0.9);
      } }
  ],

  arranca(){
    P.vidas = 3; P.aciertos = 0; P.desdeCambio = 0; P.gratis = false;
    P.cartel = 0; P.aviso = 0; P.avisoT = 0;
    P.limite = 2.6;
    nuevaRegla();
    P.gratis = false;          /* la primera regla de la partida no da error gratis
                                  porque todavía no hubo ninguna: nada cambió */
    nuevaPersona();
    JUEGO.vivo = true; JUEGO.gano = false; JUEGO.marca = 0;
  },

  paso(dt){
    if (P.cartel > 0) P.cartel -= dt;
    if (P.avisoT > 0) P.avisoT -= dt;
    P.ft += dt;
    if (P.fase === 'entra'){
      if (P.ft >= 0.34){ P.fase = 'decide'; P.ft = 0; }
    } else if (P.fase === 'decide'){
      /* ── EL RELOJ NO ES DECORACIÓN: ES LA MITAD DEL JUEGO ──
         Sin límite, el jugador se queda mirando y deduce con calma, y entonces
         no hay minijuego. Con límite, tiene que decidir con lo que sabe. */
      JUEGO.resta = 1 - P.ft / P.limite;
      if (P.ft >= P.limite) resuelve(null);
    } else if (P.fase === 'sale'){
      if (P.ft >= 0.42) nuevaPersona();
    }
  },

  fondo(g){
    /* la foto generada de la entrada del boliche, con un velo encima: sin el
       velo compite con la puerta dibujada y con la persona, que son las dos
       cosas que hay que mirar. Y la vereda se vuelve a pintar a la altura de
       `SU()`, porque de ahí salen la persona, los botones y las vidas: si la
       línea del suelo de la foto y la del juego no coinciden, la persona
       aparece flotando. */
    if (dibCubre('fondo')){
      g.fillStyle = 'rgba(7,7,13,.44)'; g.fillRect(0, 0, AN, AL);
      g.fillStyle = 'rgba(8,8,14,.80)'; g.fillRect(0, SU(), AN, AL - SU());
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, SU()); g.lineTo(AN, SU()); g.stroke();
      grano(0, 0, AN, AL, 0.02, 40);
    } else fondoCalle(g, 1);
  },

  pinta(g){
    puertaDibujo(g, 1);
    if (P.per) dibujaPersona(g, P.per);
    botones(g);
    vidas(g);
    /* el cartel del cambio de regla: el aviso que el jugador descubre solo */
    if (P.cartel > 0){
      const k = Math.min(1, P.cartel/0.9);
      g.globalAlpha = k * (0.55 + 0.45*Math.abs(Math.sin(P.cartel*22)));
      /* el cartel va DEBAJO del letrero de la puerta y no arriba: arriba se
         encimaba con el marcador del HUD, que es DOM y vive en la franja de
         arriba — medido en la captura, «CAMBIÓ LA REGLA» salía cruzado con el
         número. */
      /* SU()−786 caía ADENTRO de la caja del letrero (que va de SU()−854 a
         SU()−758) y el texto salía cruzado con las tres flechas. Va arriba del
         letrero, y sigue lejos del marcador del HUD. */
      texto(TX('cambio'), 360, SU() - 882, 30, '#f0d060');
      g.globalAlpha = 1;
    }
    if (P.avisoT > 0){
      g.globalAlpha = Math.min(1, P.avisoT/0.7);
      texto(TX('gratis'), 360, SU() - 178, 24, '#8fd6a8');
      g.globalAlpha = 1;
    }
  },

  baja(x, y){
    if (P.fase !== 'decide') return;
    /* el verbo: la mitad izquierda es NO y la derecha es SÍ. Dos botones
       dibujados abajo dicen cuál es cuál, pero se puede tocar en cualquier
       parte de su mitad — en un juego de un segundo y medio, obligar a acertar
       un botón chico convierte un juego de juicio en uno de puntería. */
    resuelve(x > 360);
  },

  pintaTextos(){},

  /* ── EL JUGADOR AUTOMÁTICO ──
     Dos: uno que SABE la regla, que prueba que la partida se puede sostener y
     que el bucle no se traba; y uno que contesta al azar, que prueba que las
     vidas se gastan y que el juego se termina. Sin el segundo, un defecto en el
     final del juego no se descubre nunca. */
  juegaSolo(n, azar){
    /* `azar` en true contesta al azar: es lo que prueba que las vidas se gastan
       y que la partida TERMINA. Sin esa segunda corrida, un defecto en el final
       del juego no se descubre nunca — el jugador que sabe la regla no pierde. */
    JUEGO.arranca();
    let vueltas = 0, cambios = 0, reglaAnt = P.regla.id + (P.regla.color || '');
    while (JUEGO.vivo && vueltas < n){
      /* ── OCHO PASOS NO ALCANZABAN PARA LLEGAR A DECIDIR ──
         La persona tarda 0,34 s en entrar, o sea VEINTIÚN pasos de 1/60. Con
         ocho, `JUEGO.baja` salía por la guarda de fase y no hacía nada: medido,
         400 vueltas devolvían 133 aciertos y las tres vidas intactas, que
         parecía un juego fácil y era un jugador automático que no jugaba. */
      for (let i = 0; i < 60 && P.fase !== 'decide' && JUEGO.vivo; i++) JUEGO.paso(1/60);
      if (!JUEGO.vivo) break;
      const bien = P.regla.ok(P.per, P.regla);
      JUEGO.baja(azar ? (Math.random() < 0.5 ? 100 : 600) : (bien ? 600 : 100), 1100);
      const r = P.regla.id + (P.regla.color || '');
      if (r !== reglaAnt){ cambios++; reglaAnt = r; }
      for (let i = 0; i < 40 && P.fase === 'sale' && JUEGO.vivo; i++) JUEGO.paso(1/60);
      vueltas++;
    }
    return { vueltas, puntos: PUNTOS, aciertos: P.aciertos, vidas: P.vidas,
             cambios, vivo: JUEGO.vivo, limite: +P.limite.toFixed(2) };
  }
};

/* ══════════════════════ LAS REGLAS Y LA GENTE ══════════════════════ */
function nuevaRegla(){
  const ant = P.regla;
  let r;
  let intento = 0;
  do {
    r = Object.assign({}, REGLAS[(Math.random()*REGLAS.length)|0]);
    if (r.id === 'color') r.color = (Math.random()*ROPA.length)|0;
    intento++;
  } while (ant && r.id === ant.id && r.color === ant.color && intento < 20);
  P.regla = r;
  P.desdeCambio = 0;
  P.gratis = true;
  P.cartel = 1.6;
}

function nuevaPersona(){
  const p = {
    gorro: Math.random() < 0.45, lentes: Math.random() < 0.45,
    botella: Math.random() < 0.35, pase: Math.random() < 0.40,
    bufanda: Math.random() < 0.45,
    ropa: (Math.random()*ROPA.length)|0,
    piel: ['#c99a72','#9a6b47','#e0b48c','#7a5236'][(Math.random()*4)|0],
    alto: 0.94 + Math.random()*0.14
  };
  /* ── SE FUERZA QUE EL RASGO DE LA REGLA SE VEA REPARTIDO ──
     Con atributos puramente al azar puede tocar una racha de siete que cumplen,
     y entonces «SÍ» a todo funciona y el jugador no aprende nada. Una de cada
     dos personas, más o menos, tiene que ser la que hay que rechazar: eso es lo
     que convierte la regla en información. */
  if (Math.random() < 0.5) forzar(p, !P.regla.ok(p, P.regla));
  P.per = p;
  P.fase = 'entra'; P.ft = 0;
  JUEGO.resta = 1;
}
/* pone o saca el rasgo que la regla mira, para que la persona cumpla o no */
function forzar(p, aQuePase){
  const r = P.regla;
  if (r.id === 'sinGorro') p.gorro = !aQuePase;
  else if (r.id === 'conLentes') p.lentes = aQuePase;
  else if (r.id === 'sinBotella') p.botella = !aQuePase;
  else if (r.id === 'conPase') p.pase = aQuePase;
  else if (r.id === 'bufanda') p.bufanda = aQuePase;
  else if (r.id === 'color'){
    if (aQuePase) p.ropa = r.color;
    else if (p.ropa === r.color) p.ropa = (r.color + 1 + ((Math.random()*3)|0)) % ROPA.length;
  }
}

function resuelve(dejaEntrar){
  const debia = P.regla.ok(P.per, P.regla);
  const bien = dejaEntrar !== null && dejaEntrar === debia;
  P.per.entro = dejaEntrar === true;
  P.fase = 'sale'; P.ft = 0;
  JUEGO.resta = null;
  if (bien){
    P.aciertos++; PUNTOS = P.aciertos; JUEGO.marca = P.aciertos;
    P.desdeCambio++;
    son('bien');
    fogonazo(0.10);
    /* ── SE ACELERA, Y ES LO ÚNICO QUE HACE DE CURVA ──
       De 2,6 s a 1,15 s en veinte aciertos. Un minijuego no necesita niveles:
       necesita que la misma cosa se vuelva más difícil sin avisar. */
    P.limite = Math.max(1.15, 2.6 - P.aciertos*0.072);
    /* cada siete aciertos cambia la regla */
    if (P.desdeCambio >= 7) nuevaRegla();
  } else {
    son('mal');
    fogonazo(0.34);
    if (P.gratis){
      /* el error gratis: el primero después de un cambio no cuesta vida */
      P.gratis = false;
      P.avisoT = 1.5;
    } else {
      P.vidas--;
      if (P.vidas <= 0){ JUEGO.vivo = false; JUEGO.gano = P.aciertos >= 20; }
    }
  }
}

/* ══════════════════════ EL DIBUJO ══════════════════════
   TODO LO QUE VA ABAJO SE ANCLA AL PISO Y NO A UN NÚMERO. El alto de diseño
   depende de la forma de la pantalla —lo decide `medir()`— así que un `y = 1030`
   escrito a mano queda bien en un teléfono y mal en el de al lado. `SU()` es la
   línea de la vereda y de ahí salen la puerta, la persona, los botones y las
   vidas. */
const SU = () => AL - 250;
function fondoCalle(g, k){
  /* de noche, con la vereda mojada y el resplandor del cartel. El degradado va
     de arriba oscuro a abajo un poco menos: al revés se lee a día nublado. */
  const d = g.createLinearGradient(0, 0, 0, AL);
  d.addColorStop(0, '#0a0a12'); d.addColorStop(0.55, '#12121c'); d.addColorStop(1, '#191520');
  g.fillStyle = d; g.fillRect(0, 0, AN, AL);
  /* el resplandor de la puerta */
  const r = g.createRadialGradient(360, SU() - 330, 40, 360, SU() - 330, 520);
  r.addColorStop(0, 'rgba(226,150,60,' + (0.20*k).toFixed(3) + ')');
  r.addColorStop(1, 'rgba(226,150,60,0)');
  g.fillStyle = r; g.fillRect(0, 0, AN, AL);
  /* la vereda */
  g.fillStyle = '#0e0e16'; g.fillRect(0, SU(), AN, AL - SU());
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, SU()); g.lineTo(AN, SU()); g.stroke();
  grano(0, 0, AN, AL, 0.03, 70);
}

function puertaDibujo(g, k){
  const y0 = SU() - 700;
  /* ── EL VANO NO ES UN RECTÁNGULO NEGRO ──
     Con la foto generada detrás, un negro opaco de 340x730 en el medio se lee a
     agujero en la imagen: medido en la captura, tapaba la mitad del boliche.
     Ahora es un degradado que se abre hacia abajo —la luz que sale de adentro—
     así que el visitante queda parado EN un vano iluminado y el fondo se sigue
     viendo por arriba. */
  const d = g.createLinearGradient(0, y0, 0, SU());
  d.addColorStop(0, 'rgba(8,8,13,.94)');
  d.addColorStop(0.62, 'rgba(14,11,16,.86)');
  d.addColorStop(1, 'rgba(60,34,18,.70)');
  caja2(190, y0, 340, 700, 8, d, null);
  /* el resplandor del umbral: es lo que separa al visitante del fondo */
  const r = g.createRadialGradient(360, SU() - 90, 20, 360, SU() - 90, 300);
  r.addColorStop(0, 'rgba(232,180,106,.26)');
  r.addColorStop(1, 'rgba(232,180,106,0)');
  g.fillStyle = r; g.fillRect(190, y0, 340, 700);
  g.strokeStyle = 'rgba(232,180,120,.42)'; g.lineWidth = 7;
  g.strokeRect(190, y0, 340, 700);

  /* el cartel de arriba: es el que titila cuando cambia la regla, y es el aviso
     que el jugador descubre solo.
     LAS TRES BARRAS VAN DIBUJADAS Y NO ESCRITAS: el glifo que había ('◗') lo
     resuelve la tipografía del sistema, o sea que sale distinto en Android, en
     iPhone y en Windows — medido en la captura salían tres lunas. */
  const enc = P.cartel > 0 ? (0.4 + 0.6*Math.abs(Math.sin(P.cartel*22))) : 1;
  caja2(236, y0 - 118, 248, 88, 12, 'rgba(18,16,24,.90)', 'rgba(232,180,120,.34)');
  g.globalAlpha = 0.26 + 0.74*enc;
  for (let i = 0; i < 3; i++){
    const x = 286 + i*64;
    g.shadowColor = '#e8b46a'; g.shadowBlur = 18;
    caja2(x, y0 - 92, 36, 36, 18, '#e8b46a', null);
    g.shadowBlur = 0;
  }
  g.globalAlpha = 1;
}

/* la silueta de la cola: sólo contorno, sin cara. Una silueta con cara ya no es
   una silueta y deja de leerse a «uno más de la fila». */
function siluetaCola(g, x, y, s, a){
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(8,8,14,' + a.toFixed(3) + ')';
  g.beginPath(); g.arc(0, -150, 42, 0, 7); g.fill();
  caja2(-52, -108, 104, 150, 26, 'rgba(8,8,14,' + a.toFixed(3) + ')', null);
  g.restore();
}

/* ══════════════ LA PERSONA ══════════════
   El cuerpo es un sprite generado con Rezona (cuatro cuadros, la ropa BLANCA a
   propósito) y los RASGOS DE LAS REGLAS se siguen dibujando por código encima.

   Ese reparto no es una comodidad: las seis reglas necesitan que un rasgo esté
   o no esté, y una imagen generada no se puede pedir «con gorro y sin lentes»
   sesenta veces sin que cambie la persona entera. Así que la persona es una y
   los rasgos son cuatro cosas que se le ponen — y ahí el jugador puede deducir,
   porque lo único que cambia entre dos visitantes es exactamente lo que la
   regla mira.

   Y LA ROPA SE TIÑE, LA PIEL NO: el sprite se generó de blanco y `tenido()` lo
   pinta con la máscara de lo blanco, que la calculó el horneado. Un tinte sobre
   el sprite entero deja un tipo verde, no un tipo con remera verde.

   ── LA MEDIDA ES EL ALTO DE LA CABEZA, Y ES LA MEDIANA DE LOS CUATRO ──
   El horneado mide, cuadro por cuadro, la coronilla y el cuello (el punto más
   angosto del perfil de anchos). De ahí salen el centro y el alto de la cabeza,
   y todos los rasgos se ubican en proporción a ese alto: con desplazamientos en
   píxeles, el gorro le queda bien a un visitante alto y metido en la frente al
   bajo.
   El alto sale de la MEDIANA de los cuatro cuadros y sólo el centro se toma por
   cuadro: una cabeza no cambia de tamaño cuando alguien levanta los brazos, y
   en el cuadro del saludo la medición se ensucia. */
const ALTO_PJ = 430;

function medianaCab(){
  const o = IMG.gente;
  if (!o || !o.ok || !AS.img.gente.cab) return null;
  const ds = AS.img.gente.cab.map(c => c[2]).slice().sort((a, b) => a - b);
  return ds[ds.length >> 1];
}

function dibujaPersona(g, p){
  /* entra desde la izquierda y sale para el lado que le tocó: si los dos salen
     por el mismo lado, no se ve qué se decidió */
  let dx = 0, al = 1;
  if (P.fase === 'entra'){ const u = suave(Math.min(1, P.ft/0.34)); dx = -300*(1-u); }
  else if (P.fase === 'sale'){
    const u = suave(Math.min(1, P.ft/0.42));
    dx = (p.entro ? 60 : -420) * u;
    al = 1 - u*0.85;
  }
  const X = 360 + dx;
  const lienzo = tenido('gente', ROPA[p.ropa].c);
  const cabs = (typeof AS !== 'undefined' && AS.img.gente) ? AS.img.gente.cab : null;

  if (lienzo && cabs){
    /* el cuadro: llega con los brazos levantados —pidiendo entrar— y después se
       queda esperando con un balanceo de tres cuadros. Un personaje clavado en
       una pose mientras el reloj corre se lee a imagen y no a alguien esperando. */
    const i = P.fase === 'entra' ? 3
            : (P.fase === 'sale' ? (p.entro ? 3 : 0)
            : [0, 1, 2, 1][Math.floor(P.ft*3.4) % 4]);
    const alto = ALTO_PJ*p.alto;
    const o = IMG.gente, e = alto/o.h;
    g.save();
    g.globalAlpha = al;
    dibCuadro('gente', i, X, SU(), alto, false, lienzo);
    /* de la medición del horneado a coordenadas de pantalla */
    const c = cabs[i] || cabs[0];
    const d = medianaCab()*e;
    const hx = X + (c[0] - o.w/2)*e;
    const hy = SU() - alto + c[1]*e;
    rasgos(g, p, hx, hy, d, e);
    g.restore();
    return;
  }

  /* ── EL RESPALDO DIBUJADO POR CÓDIGO NO SE BORRA ──
     Un data URI se decodifica de forma asincrónica: sin esto, los primeros
     cuadros de la primera partida —o toda la partida si la imagen no
     decodifica— no tendrían a nadie en la puerta. */
  g.save();
  g.globalAlpha = al;
  g.translate(X, SU() - 330);
  g.scale(p.alto, p.alto);
  caja2(-104, -40, 208, 250, 34, ROPA[p.ropa].c, 'rgba(0,0,0,.28)');
  disco(0, -120, 78, p.piel);
  g.strokeStyle = 'rgba(0,0,0,.24)'; g.lineWidth = 3;
  g.beginPath(); g.arc(0, -120, 78, 0, 7); g.stroke();
  disco(-28, -134, 9, '#20202a'); disco(28, -134, 9, '#20202a');
  g.restore();
  rasgos(g, p, 360 + dx, SU() - 330 - 198*p.alto, 156*p.alto, p.alto);
}

/* los cuatro rasgos, todos en proporción al diámetro medido de la cabeza: con
   desplazamientos en píxeles, el gorro le queda bien a un visitante alto y
   metido en la frente al bajo */
function rasgos(g, p, hx, hy, d, e){
  /* los tres números de abajo salieron de mirar la captura y no de estimar: con
     los ojos en 0,46 del diámetro y radio 0,19 los lentes salían del tamaño de
     unas antiparras y apoyados en la frente */
  const oy = hy + d*0.50;
  if (p.lentes){
    /* y todavia mas chicos: en la captura los lentes tapaban de la ceja al
       pomulo, o sea antiparras. Un lente ocupa un cuarto del ancho de la cara. */
    const r = d*0.115, sx = d*0.165;
    g.strokeStyle = '#12121a'; g.lineWidth = Math.max(3, d*0.055);
    g.beginPath(); g.arc(hx - sx, oy, r, 0, 7); g.stroke();
    g.beginPath(); g.arc(hx + sx, oy, r, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(hx - sx + r, oy); g.lineTo(hx + sx - r, oy); g.stroke();
    g.fillStyle = 'rgba(180,215,240,.24)';
    g.beginPath(); g.arc(hx - sx, oy, r*0.9, 0, 7); g.fill();
    g.beginPath(); g.arc(hx + sx, oy, r*0.9, 0, 7); g.fill();
  }
  if (p.gorro){
    /* la visera va del lado de afuera y la copa tapa la coronilla: un gorro
       apoyado más arriba se lee a sombrero flotando */
    /* una gorra y no un casco: la copa va CHATA —de 0,03 a 0,26 del diámetro— y
       la visera sale de un lado. Con la copa alta se leía a casco de moto. */
    g.fillStyle = '#26262f';
    g.beginPath();
    g.moveTo(hx - d*0.50, hy + d*0.30);
    g.quadraticCurveTo(hx, hy - d*0.04, hx + d*0.50, hy + d*0.30);
    g.closePath(); g.fill();
    caja2(hx - d*0.54, hy + d*0.25, d*1.08, d*0.12, d*0.06, '#1c1c24', null);
    caja2(hx + d*0.32, hy + d*0.27, d*0.44, d*0.10, d*0.05, '#20202a', null);
  }
  if (p.bufanda){
    /* la bufanda es una banda al CUELLO: con 0,92 de diametro de ancho y 0,30 de
       alto, mas la punta colgando, en la captura se leia a torso rojo y tapaba
       la remera — que es justo el otro rasgo que hay que poder ver */
    /* la banda va en el CUELLO, que en el perfil medido es el punto angosto a
       0,72 del alto de la cabeza — en 0,97 caía sobre los hombros y se leía a
       babero, no a bufanda. Y mide 0,46 y no 0,64: más ancha que el cuello para
       que se vea envuelta, no tan ancha como la cabeza. */
    const y = hy + d*0.72;
    caja2(hx - d*0.23, y, d*0.46, d*0.22, d*0.10, '#c8412f', 'rgba(0,0,0,.25)');
    caja2(hx + d*0.04, y + d*0.18, d*0.15, d*0.50, d*0.07, '#b03a2a', null);
  }
  if (p.pase){
    const y = hy + d*1.34;
    g.strokeStyle = 'rgba(240,238,230,.75)'; g.lineWidth = Math.max(2, d*0.04);
    g.beginPath(); g.moveTo(hx - d*0.18, y); g.lineTo(hx - d*0.04, y + d*0.44); g.stroke();
    caja2(hx - d*0.22, y + d*0.42, d*0.38, d*0.28, d*0.04, '#f0eee6', 'rgba(0,0,0,.35)');
    g.fillStyle = 'rgba(40,40,48,.75)';
    g.fillRect(hx - d*0.17, y + d*0.50, d*0.27, d*0.035);
    g.fillRect(hx - d*0.17, y + d*0.58, d*0.19, d*0.035);
  }
  if (p.botella){
    /* pegada al cuerpo y a la altura de la mano: a 0,86 del diámetro quedaba
       flotando al costado y no se leía a «la trae en la mano» */
    const x = hx + d*0.62, y = hy + d*2.05;
    caja2(x, y, d*0.24, d*0.66, d*0.06, '#2f6f3f', 'rgba(0,0,0,.3)');
    g.fillStyle = '#2f6f3f'; g.fillRect(x + d*0.07, y - d*0.16, d*0.10, d*0.18);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(x + d*0.04, y + d*0.10, d*0.06, d*0.42);
  }
}

function botones(g){
  const act = P.fase === 'decide';
  const y = AL - 184;
  g.globalAlpha = act ? 1 : 0.34;
  caja2(40, y, 300, 128, 22, 'rgba(200,65,47,.20)', 'rgba(200,65,47,.75)');
  texto(TX('no'), 190, y + 64, 42, '#e0785f');
  caja2(380, y, 300, 128, 22, 'rgba(63,143,92,.20)', 'rgba(63,143,92,.75)');
  texto(TX('si'), 530, y + 64, 42, '#7fd0a0');
  g.globalAlpha = 1;
}

function vidas(g){
  for (let i = 0; i < 3; i++)
    disco(300 + i*60, AL - 220, 16, i < P.vidas ? '#e0553f' : 'rgba(255,255,255,.13)');
}
