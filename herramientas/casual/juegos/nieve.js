/* ══════════════════════════════ NIEVE ══════════════════════════════
   Se baja una ladera esquivando arboles, y no hay boton de frenar.

   ── EL VERBO ES CONDUCIR, Y ES EL UNICO DE LA FAMILIA QUE NO SE SUELTA ──
   ARCO elige un vector y mira; PENAL dibuja un camino y mira; DUELO elige un
   instante; SALTO elige un numero. Los cuatro son UNA decision y despues
   espectaculo. Aca el dedo no se levanta nunca: se inclina a un lado y al otro
   durante toda la bajada, y cada cuadro es una correccion.

   ── Y LO QUE HACE QUE HAYA UN JUEGO ADENTRO ES QUE GIRAR CUESTA VELOCIDAD ──
   Derecho se baja rapido; inclinado, el canto de los esquis frena. Asi que
   inclinarse temprano —que es lo comodo— llega bien a la puerta y llega LENTO,
   y el reloj no perdona. La decision no es «hacia donde», es «cuanto antes».
   Sin ese costo, la conduccion optima es «inclinarse a fondo siempre» y el
   juego se juega solo. */

const N_NIVELES = 50;
const N_MEDIA = 310;           /* medio ancho de la pista, en unidades de diseno */
const N_VLAT = 270;            /* velocidad lateral con la inclinacion a fondo */
const N_FRENO = 0.44;          /* cuanto frena inclinarse a fondo */
const N_RAMPA = 5.0;           /* cuanto tarda la inclinacion en llegar, por segundo */
const N_ANCHO = 30;            /* medio ancho del esquiador, para el choque */
const N_PIE = 0.60;            /* donde va el esquiador, en fraccion del alto */

let N_puerta = [];             /* {y, cx, g, t} */
let N_deco = [];               /* arboles de adorno, fuera de la pista */
let N_x = 0, N_y = 0, N_inc = 0, N_incMeta = 0, N_vy = 0;
let N_vyBase = 0, N_fase = 'baja';   /* baja · choca · fin */
let N_nivel = 1, N_paso = 0, N_meta = 0, N_vidas = 0;
let N_msg = '', N_msgT = 0, N_reloj = 0, N_lento = 0;
let N_dedo = null, N_dedo0 = 0, N_x0 = 0;
let N_azar = 7;
function nAz(){ N_azar = (N_azar*1664525 + 1013904223) >>> 0; return N_azar / 4294967296; }

const JT = {
  es: { sub:'Arrastrá para inclinarte. Derecho vas más rápido.',
        c1:'Arrastrá el dedo: el esquiador se inclina.',
        c2:'Inclinarse FRENA. Enderezate apenas pasaste.',
        c3:'Cincuenta laderas.',
        nivelC:'LADERA', pasoC:'PUERTAS', vidasC:'VIDAS',
        buen:'¡BIEN!', choque:'¡ÁRBOL!', llego:'¡ABAJO!' },
  en: { sub:'Drag to lean. Straight down is faster.',
        c1:'Drag your finger: the skier leans.',
        c2:'Leaning SLOWS you. Straighten up right after the gate.',
        c3:'Fifty slopes.',
        nivelC:'SLOPE', pasoC:'GATES', vidasC:'LIVES',
        buen:'NICE!', choque:'TREE!', llego:'YOU MADE IT!' },
  pt: { sub:'Arraste para inclinar. Reto você desce mais rápido.',
        c1:'Arraste o dedo: o esquiador se inclina.',
        c2:'Inclinar FREIA. Endireite assim que passar.',
        c3:'Cinquenta encostas.',
        nivelC:'ENCOSTA', pasoC:'PORTAS', vidasC:'VIDAS',
        buen:'BOA!', choque:'ÁRVORE!', llego:'CHEGOU!' }
};
const PIEL = { ac:'#5aa8d8', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tensa', pierde:'grito', gana:'gana',
                    clic:'clic', roza:'tira' };
const AMB = {
  foto: 'f_nieve',
  cielo: ['#8fa8bc', '#dde8f0'],
  haz: 0.10,
  vineta: 0.34,
  part: { n: 26, dir: 'baja', forma: 'disco', col: '#ffffff',
          r0: 1.4, r1: 4.2, v0: 40, v1: 130, amp: 60, gira: 0,
          a0: 0.18, a1: 0.55 }
};

/* ══════════ EL GENERADOR ══════════
   Cuatro cosas crecen: la velocidad, cuanto se corre la puerta siguiente, cada
   cuanto vienen, y —al reves— cuanto mide el hueco.

   ── Y CADA PAR SE ACOTA CONTRA EL ALCANCE LATERAL DE VERDAD ──
   Cuanto se puede correr entre dos puertas no es una constante: depende de
   cuanto tarda el tramo, y el tramo tarda mas si uno va inclinado, que es
   justamente cuando se corre. El peor caso es el mejor para moverse (a fondo,
   lento) y el mejor para el reloj (derecho, rapido): se toma el de a fondo con
   un descuento por la rampa, porque la inclinacion no llega en un cuadro. */
function nAlcance(dy, vy){
  const t = dy / (vy*(1 - N_FRENO));
  /* la rampa se come el principio del tramo: llegar a la inclinacion completa
     cuesta 1/N_RAMPA segundos y en ese rato se corre la mitad */
  return N_VLAT*Math.max(0, t - 1.0/N_RAMPA);
}

function nGenera(n){
  N_azar = (n*2246822519) >>> 0;
  for (let i = 0; i < 5; i++) nAz();
  const k = Math.min(1, (n - 1)/44);
  const cant = 8 + Math.floor(k*16);
  const vy = 420 + k*280;
  const dy = 470 - k*130;
  const hueco = 132 - k*54;             /* MEDIO hueco de la puerta */
  const alc = nAlcance(dy, vy);

  const p = [];
  let cx = 0;
  for (let i = 0; i < cant; i++){
    const g = hueco + nAz()*22;
    if (i > 0){
      /* ── EL CORRIMIENTO SALE DEL ALCANCE, NO DE UN NUMERO A MANO ──
         Entrando por el borde de la puerta anterior ya se tiene medio hueco de
         ventaja, asi que lo que hay que recorrer de verdad es el corrimiento
         menos los dos medios huecos. Se pide como fraccion del alcance para que
         la dificultad sea la MISMA a cualquier velocidad. */
      const q = 0.32 + k*0.42;
      const paso = (alc*q + (g + p[i-1].g)*0.30)*(nAz() < 0.5 ? -1 : 1);
      cx = cx + paso;
    }
    /* la puerta entera tiene que caber en la pista: si no, un lado del hueco es
       el banco de nieve y el hueco de verdad mide la mitad */
    cx = Math.max(-(N_MEDIA - g - 6), Math.min(N_MEDIA - g - 6, cx));
    p.push({ y: 620 + i*dy, cx, g, t: Math.floor(nAz()*3) });
  }

  /* los arboles de adorno van FUERA de la pista y no chocan: son lo unico que
     dice que uno se esta moviendo cuando la nieve es un plano blanco */
  const d = [];
  const largo = p[p.length-1].y + 900;
  for (let y = 200; y < largo; y += 90){
    for (const s of [-1, 1])
      if (nAz() < 0.72)
        d.push({ x: s*(N_MEDIA + 40 + nAz()*230), y: y + nAz()*70,
                 t: Math.floor(nAz()*3), e: 0.8 + nAz()*0.6 });
  }
  return { p, d, vy, dy, alc, meta: cant, largo, vidas: 3 };
}

const JUEGO = {
  id: 'nieve',
  tipo: 'niveles',
  nivelesTotal: N_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return N_paso; },
  get sub(){ return TX('pasoC'); },
  get ficI(){ return TX('nivelC') + ' ' + NIVEL; },
  get ficD(){ return TX('vidasC') + ' ' + N_vidas; },
  get resta(){ return N_meta ? Math.max(0, 1 - N_paso/N_meta) : 0; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ nDemo(g, u, 0); } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){ nDemo(g, u, 1); } },
    { dur: 3.0, pie: 'c3', dibuja(g, u){ nDemo(g, u, 2); } }
  ],

  arranca(n){
    N_nivel = n || 1;
    const G = nGenera(N_nivel);
    N_puerta = G.p; N_deco = G.d; N_meta = G.meta;
    N_vyBase = G.vy; N_largo = G.largo; N_vidas = G.vidas;
    N_paso = 0; N_reloj = 0; N_lento = 0;
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
    N_msg = ''; N_msgT = 0;
    this.pone(0);
  },

  /* se retoma en la puerta ya pasada y no arriba de todo: rehacer quince
     puertas por errar la dieciseis es lo que hace que alguien cierre el juego */
  pone(i){
    N_paso = i;
    const p = N_puerta[i];
    N_y = i === 0 ? 0 : p.y + 40;
    N_x = i === 0 ? 0 : p.cx;
    N_inc = 0; N_incMeta = 0; N_vy = N_vyBase;
    N_fase = 'baja'; N_dedo = null;
  },

  paso(dt){
    if (N_msgT > 0) N_msgT = Math.max(0, N_msgT - dt);
    if (N_lento > 0){ N_lento = Math.max(0, N_lento - dt); dt *= 0.32; }
    N_reloj += dt;

    if (N_fase === 'choca'){
      N_vy = Math.max(0, N_vy - 900*dt);
      N_y += N_vy*dt;
      if (N_reloj > 1.0) this.rearma();
      return;
    }
    if (N_fase !== 'baja') return;

    /* la inclinacion no salta: llega con rampa, y esa rampa es la mitad del
       juego — sin ella, corregir en el ultimo metro seria gratis */
    N_inc += (N_incMeta - N_inc)*Math.min(1, dt*N_RAMPA);
    N_vy = N_vyBase*(1 - N_FRENO*Math.abs(N_inc));
    const yA = N_y;
    N_y += N_vy*dt;
    N_x += N_inc*N_VLAT*dt;

    /* el banco de nieve no mata: frena y devuelve. Matar contra el borde seria
       castigar el unico error que no se ve venir */
    if (Math.abs(N_x) > N_MEDIA){
      N_x = Math.sign(N_x)*N_MEDIA;
      N_incMeta = 0; N_inc *= 0.4;
    }

    /* ── LA PUERTA SE JUZGA EN EL CUADRO EN QUE SE LA CRUZA ──
       Con `y >= puerta.y` a secas, la condicion la siguen cumpliendo los cuadros
       de despues: el mismo par de arboles vuelve a golpear cuadro tras cuadro
       mientras se lo pasa, y una puerta acertada por medio pixel se convierte en
       tres choques. Ya paso en SALTO con las rocas. */
    for (let i = N_paso; i < N_puerta.length; i++){
      const p = N_puerta[i];
      if (yA < p.y && N_y >= p.y){
        if (Math.abs(N_x - p.cx) + N_ANCHO > p.g){ this.choca(i); return; }
        N_paso = i + 1;
        son('bien', 0.55); comboSuma();
        chispas(AN/2 + N_x, AL*N_PIE, 5, '#ffffff', 130);
        if (N_paso >= N_puerta.length){ this.termina(); return; }
      }
    }
  },

  choca(i){
    N_fase = 'choca'; N_reloj = 0; N_lento = 0.45;
    N_vidas--;
    N_msg = 'choque'; N_msgT = 1.2;
    comboCorta();
    son('pierde', 0.9); sacude(0.5); destella('#ff6a5a', 0.6);
  },

  rearma(){
    if (N_vidas <= 0){ this.vivo = false; return; }
    this.pone(N_paso);
  },

  termina(){
    this.gano = true;
    this.estrellas = N_vidas >= 3 ? 3 : (N_vidas === 2 ? 2 : 1);
    this.finP = TX('vidasC') + ' ' + N_vidas;
    N_msg = 'llego'; N_msgT = 1.6;
    son('gana', 1); destella('#ffffff', 0.9);
    this.vivo = false;
  },

  fondo(g){},
  pinta(g){ nPinta(g); },

  /* ── EL DEDO MANDA UNA POSICION Y NO UN LADO ──
     Con dos mitades de pantalla la inclinacion es todo o nada y no hay forma de
     hacer una correccion chica, que es de lo que se trata conducir. El
     arrastre desde donde se apoyo el dedo da inclinacion proporcional. */
  baja(x, y){ if (MODO !== 'juega') return; N_dedo0 = x; N_x0 = N_inc; },
  mueve(x, y){
    if (MODO !== 'juega' || N_fase !== 'baja') return;
    N_incMeta = Math.max(-1, Math.min(1, N_x0 + (x - N_dedo0)/190));
  },
  sube(){ },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto conduce: mira la puerta siguiente, calcula cuanto le falta
     correrse y cuanto tiempo le queda, y se inclina lo justo — y se endereza en
     cuanto esta alineado, que es lo que le devuelve la velocidad. El otro se
     inclina al azar. Si conducir no importara, los dos bajarian igual. */
  juegaSolo(n, azar){
    let gana = 0, malos = [], puertas = 0, buenas = 0, choques = 0, tiempo = 0;
    const dt = 1/60;
    for (let niv = 1; niv <= (n || N_NIVELES); niv++){
      this.arranca(niv);
      let v = 0, ult = 0, azT = 0;
      const p0 = N_paso;
      while (this.vivo && !this.gano && v < 24000){
        v++;
        if (azar){
          azT -= dt;
          if (azT <= 0){ N_incMeta = Math.random()*2 - 1; azT = 0.22; }
        } else N_incMeta = nConduce();
        const antes = N_paso, chA = N_vidas;
        this.paso(dt);
        if (N_paso > antes){ puertas += N_paso - antes; buenas += N_paso - antes; }
        if (N_vidas < chA){ choques++; puertas++; }
        tiempo += dt;
      }
      if (this.gano) gana++; else malos.push(niv);
    }
    return JSON.stringify({ niveles: (n || N_NIVELES), gana,
                            malos: malos.slice(0, 10), nMalos: malos.length,
                            puertas, buenas, choques,
                            tasa: puertas ? +(buenas/puertas).toFixed(3) : 0,
                            seg: +tiempo.toFixed(1) });
  },

  /* ── LA AUDITORIA: QUE CADA PUERTA SE PUEDA ALCANZAR DESDE LA ANTERIOR ──
     Se compara el corrimiento que hay que hacer contra el alcance lateral de
     verdad, con la rampa descontada. Y ademas que la puerta entre en la pista y
     que el hueco sea mas ancho que el esquiador: un hueco de veinte pixeles no
     es dificil, es imposible. */
  audita(a, b){
    const malos = [];
    let minM = 9, maxM = 0, minG = 9999;
    for (let n = (a || 1); n <= (b || N_NIVELES); n++){
      const G = nGenera(n);
      for (let i = 0; i < G.p.length; i++){
        const P = G.p[i];
        if (P.g - N_ANCHO < 14) malos.push([n, 'hueco ' + Math.round(P.g) + ' muy angosto']);
        if (Math.abs(P.cx) + P.g > N_MEDIA + 1) malos.push([n, 'puerta ' + i + ' fuera de la pista']);
        minG = Math.min(minG, P.g);
        if (i === 0) continue;
        const A = G.p[i-1];
        const falta = Math.abs(P.cx - A.cx) - (P.g + A.g)*0.30;
        const alc = nAlcance(P.y - A.y, G.vy);
        if (falta > alc) malos.push([n, 'puerta ' + i + ': ' + Math.round(falta) + ' > ' + Math.round(alc)]);
        const m = falta/Math.max(1, alc);
        minM = Math.min(minM, m); maxM = Math.max(maxM, m);
      }
    }
    return JSON.stringify({ niveles: (b || N_NIVELES) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            exig: [+minM.toFixed(2), +maxM.toFixed(2)],
                            huecoMin: Math.round(minG) });
  },

  ver(){
    const p = N_puerta[Math.min(N_paso, N_puerta.length - 1)];
    return JSON.stringify({
      nivel: N_nivel, fase: N_fase, paso: N_paso, meta: N_meta, vidas: N_vidas,
      x: Math.round(N_x), y: Math.round(N_y),
      inc: +N_inc.toFixed(2), vy: Math.round(N_vy), vyMax: Math.round(N_vyBase),
      prox: p ? [Math.round(p.cx), Math.round(p.g), Math.round(p.y)] : null,
      deco: N_deco.length, msg: N_msg,
      vivo: this.vivo, gano: this.gano, est: this.estrellas });
  },
  cfg(o){
    if (o.inc != null){ N_incMeta = o.inc; }
    if (o.auto) N_incMeta = nConduce();
    if (o.pasos) for (let i = 0; i < o.pasos; i++){
      if (o.auto) N_incMeta = nConduce();
      this.paso(1/60);
    }
    return this.ver();
  }
};
let N_largo = 0;

/* ── COMO SE CONDUCE, ESCRITO UNA VEZ ──
   Falta lateral dividido por el tiempo que queda da la velocidad lateral que
   hace falta; sobre N_VLAT da la inclinacion. Y con zona muerta: enderezarse en
   cuanto uno esta adentro del hueco es lo que devuelve la velocidad, y es
   exactamente la decision que el juego pide. */
function nConduce(){
  const i = Math.min(N_paso, N_puerta.length - 1);
  const p = N_puerta[i];
  if (!p) return 0;
  /* ── SE APUNTA AL BORDE QUE MIRA A LA PUERTA SIGUIENTE, NO AL MEDIO ──
     Entrar por el medio es tirar a la basura medio hueco de ventaja, y la
     cuenta del generador ya cuenta con ella: el corrimiento que hay que hacer
     entre dos puertas se mide de borde a borde y no de centro a centro. */
  const q = N_puerta[i + 1];
  const libre = Math.max(0, p.g - N_ANCHO - 8);
  const meta = p.cx + (q ? Math.sign(q.cx - p.cx)*Math.min(libre, libre*0.75) : 0);
  const d = meta - N_x;
  const dy = Math.max(20, p.y - N_y);
  /* ── LA RAMPA SE DESCUENTA DEL TIEMPO, NO SE COMPENSA CON UN FACTOR A OJO ──
     La inclinacion llega con constante 1/N_RAMPA, asi que de los `T` segundos
     que quedan solo se puede contar con `T - 1/N_RAMPA` a inclinacion plena.
     Con un factor fijo la correccion queda bien a una sola distancia: corta
     cuando falta poco y exagerada cuando falta mucho. */
  let inc = 0;
  for (let k = 0; k < 2; k++){
    const T = dy/Math.max(60, N_vyBase*(1 - N_FRENO*Math.abs(inc)));
    inc = Math.max(-1, Math.min(1, d/(N_VLAT*Math.max(0.05, T - 1/N_RAMPA))));
  }
  /* enderezarse en cuanto se esta adentro del hueco es lo que devuelve la
     velocidad, y es exactamente la decision que el juego pide */
  if (Math.abs(meta - N_x) < libre*0.5 && Math.abs(inc) < 0.40) return 0;
  return inc;
}

/* ══════════════════════════════ EL DIBUJO ══════════════════════════════ */

function nSY(wy){ return AL*N_PIE - (wy - N_y); }

function nPinta(g){
  /* la nieve: el patron corrido con el mundo. Sin esto la ladera es un plano
     blanco y bajar a 750 pixeles por segundo se ve exactamente igual que estar
     quieto. */
  const pat = patron('n_piso');
  if (pat){
    g.save();
    g.translate(AN/2 - N_x*0.18, -((N_y*0.62) % 512));
    g.globalAlpha = 0.5; g.fillStyle = pat;
    g.fillRect(-AN, -512, AN*3, AL + 1200);
    g.restore();
  }

  /* los bancos de nieve: dicen donde termina la pista */
  for (const s of [-1, 1]){
    const x = AN/2 + s*N_MEDIA;
    g.save();
    g.globalAlpha = 0.30;
    g.fillStyle = '#7f97ad';
    g.fillRect(s < 0 ? -AN : x, 0, AN, AL);
    g.restore();
    g.strokeStyle = 'rgba(90,120,150,.55)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, AL); g.stroke();
  }

  /* la huella del esquiador, para que se lea que uno viene bajando */
  g.strokeStyle = 'rgba(150,175,200,.45)'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 14; i++){
    const yy = AL*N_PIE + i*22;
    const xx = AN/2 + N_x - N_inc*i*i*0.9;
    if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
  }
  g.stroke();

  for (const d of N_deco){
    const sy = nSY(d.y);
    if (sy < -220 || sy > AL + 120) continue;
    nArbol(g, AN/2 + d.x, sy, d.t, 148*d.e, 0.55);
  }
  for (let i = 0; i < N_puerta.length; i++){
    const p = N_puerta[i];
    const sy = nSY(p.y);
    if (sy < -260 || sy > AL + 120) continue;
    /* ── LA BANDERITA ES EL ENUNCIADO ──
       Con dos arboles y nada mas, una puerta no se distingue de dos arboles que
       casualmente quedaron cerca, y el juego pasa a ser adivinar por donde. */
    const prox = i === N_paso;
    /* ── LA CINTA ES EL ENUNCIADO, Y POR ESO ES LO MAS BRILLANTE DEL CUADRO ──
       Con dos arboles y nada mas, una puerta no se distingue de dos arboles que
       casualmente quedaron cerca. La de la puerta que toca late; las de mas
       abajo se ven apagadas, que es lo que dice cual es la proxima sin escribir
       una palabra. */
    const la = prox ? 0.62 + 0.24*Math.sin(performance.now()*0.005) : 0.22;
    g.save();
    g.globalAlpha = la;
    g.fillStyle = prox ? '#ffd76a' : '#ffffff';
    g.fillRect(AN/2 + p.cx - p.g, sy - (prox ? 7 : 4), p.g*2, prox ? 14 : 8);
    g.restore();
    /* ── LOS POSTES SE PLANTAN POR SU BORDE DE ADENTRO, NO POR SU CENTRO ──
       Cada uno de los tres obstaculos tiene otro ancho —el penasco mide el
       doble que el pino— asi que puestos todos a la misma distancia del canto
       de la cinta, el penasco se metia cincuenta y cuatro unidades DENTRO del
       hueco: el dibujo prometia menos paso del que las reglas dan, y el jugador
       corrige de mas por algo que no existe. El ancho sale de la proporcion del
       propio cuadro y no de un numero a mano. */
    const a = p.t, b = (p.t + 1) % 3;
    nArbol(g, AN/2 + p.cx - p.g - nArbW(a) - 6, sy, a, N_ARB_H[a], 1);
    nArbol(g, AN/2 + p.cx + p.g + nArbW(b) + 6, sy, b, N_ARB_H[b], 1);
  }

  nEsqui(g);

  if (N_msgT > 0){
    const al = Math.min(1, N_msgT/0.4);
    const col = N_msg === 'llego' ? '127,224,138' : '255,106,90';
    texto(TX(N_msg), AN/2, AL*0.30, N_msg === 'llego' ? 58 : 44,
          'rgba(' + col + ',' + al.toFixed(2) + ')', '800', 'center');
  }
  /* ── EL CONTADOR VA SOLO EN LA CINEMATICA ──
     En partida el HUD ya escribe `marca` y `sub`, o sea el mismo numero y la
     misma palabra: medido en la captura, «2 / 8» dibujado en el lienzo caia
     justo encima de «2 · PUERTAS» del DOM. Dos veces el mismo dato es peor que
     ninguna, porque el que sobra tapa al que manda. */
  if (MODO !== 'juega')
    texto(N_paso + ' / ' + N_meta, AN/2, AL*0.115, 26,
          'rgba(30,44,60,.60)', '800', 'center');
  nVelo(g);
  if (MODO === 'juega' && N_paso === 0)
    texto(TX('c1'), AN/2, AL*0.255, 22, 'rgba(30,44,60,.70)', '700', 'center');
}

/* ── EL VELOCIMETRO NO ES ADORNO: ES EL COSTO DE GIRAR ──
   El freno del canto no se ve mirando la pantalla —todo se mueve— asi que sin
   un numero el jugador no tiene forma de descubrir que enderezarse sirve. */
function nVelo(g){
  const w = 220, h = 12, x = AN/2 - w/2, y = AL*0.205;
  const q = N_vy/Math.max(1, N_vyBase);
  caja2(x - 2, y - 2, w + 4, h + 4, 8, 'rgba(20,32,44,.28)', null);
  caja2(x, y, Math.max(6, w*q), h, 6,
        q > 0.85 ? '#7fe08a' : (q > 0.68 ? '#ffd76a' : '#ff9a6a'), null);
}

/* el penasco es chato y ancho: dibujado al alto de un pino mide ciento sesenta
   de ancho y deja de leerse a piedra */
const N_ARB_H = [200, 200, 130];
function nArbW(t){
  const o = IMG['n_arbol'];
  const p = o && o.ok ? (o.w/o.h) : (t === 2 ? 0.80 : 0.37);
  return N_ARB_H[t]*p*0.5;
}
function nArbol(g, x, y, t, alto, al){
  g.save();
  g.globalAlpha = al;
  if (!dibCuadro('n_arbol', t, x, y + alto*0.16, alto)){
    if (t === 2){ disco(x, y, alto*0.20, '#8a949c'); }
    else {
      g.fillStyle = '#5a4030';
      g.fillRect(x - alto*0.05, y - alto*0.22, alto*0.10, alto*0.30);
      g.fillStyle = t ? '#6a5a48' : '#2f6a44';
      g.beginPath();
      g.moveTo(x, y - alto); g.lineTo(x + alto*0.30, y - alto*0.20);
      g.lineTo(x - alto*0.30, y - alto*0.20); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)';
      g.beginPath();
      g.moveTo(x, y - alto); g.lineTo(x + alto*0.16, y - alto*0.58);
      g.lineTo(x - alto*0.16, y - alto*0.58); g.closePath(); g.fill();
    }
  }
  g.restore();
}

function nEsqui(g){
  const x = AN/2 + N_x, y = AL*N_PIE;
  g.save(); g.globalAlpha = 0.28;
  g.beginPath(); g.ellipse(x, y + 8, 34, 11, 0, 0, 7); g.fillStyle = '#000'; g.fill();
  g.restore();
  const k = N_inc < -0.22 ? 1 : (N_inc > 0.22 ? 2 : 0);
  g.save();
  g.translate(x, y);
  g.rotate(N_inc*0.22);
  if (N_fase === 'choca') g.rotate(Math.min(1.3, N_reloj*3.4));
  if (!dibCuadro('n_esqui', k, 0, 0, 150)){
    g.fillStyle = '#e8532f';
    caja2(-24, -104, 48, 62, 12, '#e8532f', 'rgba(20,32,44,.5)');
    disco(0, -118, 22, '#e8b48a');
    g.strokeStyle = '#3a2418'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-20, -20); g.lineTo(-26, 6);
    g.moveTo(20, -20); g.lineTo(26, 6);
    g.stroke();
  }
  g.restore();
}

/* ══════════ LA CINEMATICA ══════════ */
function nDemo(g, u, plano){
  const gp = N_puerta, gd = N_deco, gx = N_x, gy = N_y, gi = N_inc;
  const gm = N_incMeta, gv = N_vy, gb = N_vyBase, gf = N_fase;
  const gn = N_nivel, gs = N_paso, gt = N_meta, gms = N_msg, gmt = N_msgT;

  JUEGO.arranca(plano === 2 ? 26 : 3);
  N_msg = ''; N_msgT = 0;
  if (plano === 0){
    N_incMeta = Math.sin(u*6.283)*0.9;
    for (let s = 0; s < 40; s++) JUEGO.paso(1/60);
  } else if (plano === 1){
    const dt = 1/90;
    for (let s = 0; s < 1.2 + u*2.4; s += dt){ N_incMeta = nConduce(); JUEGO.paso(dt); }
  } else {
    const dt = 1/90;
    for (let s = 0; s < 2.6; s += dt){ N_incMeta = nConduce(); JUEGO.paso(dt); }
    N_msg = 'llego'; N_msgT = 1.4;
  }
  ambAtras();
  nPinta(g);
  ambAdelante();

  N_puerta = gp; N_deco = gd; N_x = gx; N_y = gy; N_inc = gi;
  N_incMeta = gm; N_vy = gv; N_vyBase = gb; N_fase = gf;
  N_nivel = gn; N_paso = gs; N_meta = gt; N_msg = gms; N_msgT = gmt;
}
