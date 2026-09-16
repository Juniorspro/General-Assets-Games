/* ══════════════════════════════ PENAL ══════════════════════════════
   Un arco, una barrera que salta y un arquero que se tira. Se patea
   arrastrando el dedo desde la pelota — y lo que decide el tiro no es sólo
   hacia dónde va el dedo: es CÓMO va.

   ── EL VERBO ES LA CURVA DEL DEDO, Y POR ESO NO ES ARCO CON OTRO DIBUJO ──
   En ARCO y en CASTILLO el arrastre es un vector: de dónde a dónde, y nada más.
   Acá el dedo dibuja un CAMINO, y lo que importa es cuánto se aparta ese camino
   de la recta que une sus dos puntas. Arrastrando derecho la pelota va derecha;
   arrastrando en arco, la pelota se abre y vuelve. Es la misma cantidad de
   gesto y es otra decisión: hay que elegir la trayectoria entera, no el
   destino.

   Y hace falta que sea así, porque la barrera tapa el camino recto: los tiros
   que entran son los que la rodean.

   ── LA PROFUNDIDAD ES UN NÚMERO Y LA PANTALLA ES UNA PROYECCIÓN ──
   La pelota vive en tres números —lateral, alto y distancia al arco— y se
   dibuja proyectando. Sin profundidad, «rodear la barrera» no significa nada:
   la barrera y el arco estarían en el mismo plano. */

const P_DIST = 11.0;           /* metros del punto de penal al arco */
const P_ANCHO = 7.32;          /* el arco, en metros de verdad */
const P_ALTO = 2.44;
const P_G = 9.8;
const P_VMAX = 26;             /* m/s: un penal fuerte anda por ahí */
const P_NIVELES = 50;

let P_bola = null;             /* {x,y,z,vx,vy,vz,giro} en metros */
let P_traza = [];
let P_barrera = [];            /* {x, alt, salta, t0} */
let P_arq = null;              /* {x, vx, lado, t0, reflejo} */
let P_fase = 'apunta';         /* apunta · vuela · resuelve */
let P_t = 0, P_nivel = 1, P_tiros = 0, P_tope = 0, P_goles = 0, P_meta = 0;
let P_arr = null;              /* {p:[{x,y}], t0} — el CAMINO del dedo */
let P_msg = '', P_msgT = 0, P_lento = 0;
let P_azar = 7;
function pAz(){ P_azar = (P_azar*1664525 + 1013904223) >>> 0; return P_azar / 4294967296; }

/* ══════════ LOS TEXTOS ══════════ */
const JT = {
  es: { sub:'Arrastrá desde la pelota. Si curvás el dedo, curva la pelota.',
        c1:'Arrastrá desde la pelota para patear.',
        c2:'La barrera tapa el camino recto. Curvá el dedo.',
        c3:'El arquero se tira. Cincuenta tandas.',
        nivelC:'TANDA', tirosC:'GOLES', metaC:'META',
        gol:'¡GOL!', ataja:'¡LA SACÓ!', palo:'AL PALO', afuera:'AFUERA',
        barrera:'LA BARRERA', fuera:'FUERA DE LA META' },
  en: { sub:'Drag from the ball. Curve your finger, curve the ball.',
        c1:'Drag from the ball to shoot.',
        c2:'The wall blocks the straight path. Curve your finger.',
        c3:'The keeper dives. Fifty rounds.',
        nivelC:'ROUND', tirosC:'GOALS', metaC:'TARGET',
        gol:'GOAL!', ataja:'SAVED!', palo:'OFF THE POST', afuera:'WIDE',
        barrera:'THE WALL', fuera:'OUTSIDE THE TARGET' },
  pt: { sub:'Arraste da bola. Se curvar o dedo, a bola curva.',
        c1:'Arraste da bola para chutar.',
        c2:'A barreira tapa o caminho reto. Curve o dedo.',
        c3:'O goleiro se joga. Cinquenta rodadas.',
        nivelC:'RODADA', tirosC:'GOLS', metaC:'META',
        gol:'GOL!', ataja:'DEFENDEU!', palo:'NA TRAVE', afuera:'PRA FORA',
        barrera:'A BARREIRA', fuera:'FORA DA META' }
};
const PIEL = { ac:'#4ec46a', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tensa', pierde:'grito', gana:'gana',
                    clic:'clic', caida:'tira' };
const AMB = {
  foto: 'f_penal',
  cielo: ['#1c2f4a', '#0d1420'],
  haz: 0.16,
  vineta: 0.44,
  part: { n: 10, dir: 'sube', forma: 'disco', col: '#dff0ff',
          r0: 1.0, r1: 2.4, v0: 5, v1: 16, amp: 30, gira: 0,
          a0: 0.05, a1: 0.14 }
};

/* ══════════ EL GENERADOR ══════════
   Tres cosas crecen con el nivel y ninguna es «más rápido»: la barrera se
   ensancha, el arquero reacciona antes, y la META se achica. La meta es lo que
   convierte una tanda en un problema: no alcanza con hacer gol, hay que hacerlo
   en la mitad que el nivel pide. */
function pGenera(n){
  P_azar = (n*2246822519) >>> 0;
  for (let i = 0; i < 5; i++) pAz();
  const nb = Math.min(5, 1 + Math.floor((n - 1)/9));
  const bx = (pAz() - 0.5)*1.6;
  const b = [];
  for (let i = 0; i < nb; i++)
    b.push({ x: bx + (i - (nb - 1)/2)*0.52, alt: 1.72 + pAz()*0.12,
             salta: pAz() < 0.55, t0: 0.20 + pAz()*0.30 });
  /* el arquero: `reflejo` es cuánto tarda en elegir lado, y baja con el nivel */
  const arq = { x: 0, vx: 0, lado: 0, t0: 0,
                reflejo: Math.max(0.13, 0.42 - (n - 1)*0.006),
                alcance: 2.5 + Math.min(1.5, (n - 1)*0.03) };
  /* la meta: un lado del arco, y a partir del nivel 20 una esquina */
  const lado = pAz() < 0.5 ? -1 : 1;
  const alto = n > 19 && pAz() < 0.6;
  /* ── EL ARO NO BAJA DE 1,15, Y ESE PISO SE MIDIO ──
     Con el aro cayendo a 0,75 el bot honesto —que prueba dos mil doscientos
     tiros por nivel— metia el 30 % y ganaba veinte de cincuenta: si el que
     tiene control perfecto no llega, una persona con el dedo no llega nunca. */
  const meta = { x: lado*(P_ANCHO/2 - 1.30), y: alto ? P_ALTO - 0.55 : 0.75,
                 r: Math.max(1.15, 1.95 - (n - 1)*0.016) };
  pAcota(meta);
  return { b, arq, meta, tope: 5, goles: Math.min(4, 2 + Math.floor((n - 1)/16)) };
}

/* ── EL ARO TIENE QUE CABER ADENTRO DEL ARCO ──
   Medido en la captura, con el centro a 2,81 m del medio y radio 1,95 el aro
   llegaba a 4,76 contra los 3,66 del poste: SE SALIA por el costado, y medio aro
   dibujado fuera del arco no dice donde hay que meterla, dice cualquier cosa. */
function pAcota(m){
  m.r = Math.min(m.r, P_ANCHO/2 - Math.abs(m.x) + 0.35,
                 P_ALTO - m.y + 0.45, m.y + 0.60);
  m.r = Math.max(0.85, m.r);
}

/* ══════════ LA PROYECCIÓN ══════════
   El arco está a P_DIST y la cámara detrás de la pelota. Un punto a distancia
   `z` del arco se dibuja con la escala de su profundidad, así que la barrera
   —que está a 9,15 m— tapa MENOS arco cuanto más lejos esté de él. Eso es lo
   que hace que rodearla sea geometría y no una regla escrita. */
const P_OJO = 6.2;             /* la cámara, metros DETRÁS del punto de penal */
const P_ALTOC = 1.6;           /* y a la altura de los ojos de alguien */
const P_FOCO = 1500;           /* píxeles·metro: sale del ancho del arco, ver abajo */
const P_HZ = 0.34;             /* la línea del horizonte, en fracción del alto */
function pProy(x, y, z){
  /* ── LA CUENTA, Y LA PRIMERA VERSIÓN LA TENÍA DADA VUELTA ──
     `z` son metros desde el ARCO hacia la cámara, así que la pelota arranca en
     z = 11 y el arco está en z = 0. La cámara vive en z = 11 + 6,2 = 17,2, o sea
     que la distancia a un punto es `17,2 − z`. Estaba escrito `z + 6,2`, que
     para el arco da 6,2 y para la pelota 17,2: EXACTAMENTE AL REVÉS. Medido en
     la captura, el arco salía más ancho que la pantalla y la pelota no se veía.

     Y LA CÁMARA TIENE ALTURA. Con el ojo a ras del piso, todo lo que esté en el
     suelo cae en la MISMA fila de pantalla sea cual sea su distancia, así que no
     hay perspectiva: la cancha se lee a una franja plana. Con el ojo a 1,6 m el
     suelo converge al horizonte, que es lo que da la profundidad.

     `P_FOCO` sale del ancho del arco y no de un gusto: 7,32 m a 17,2 m tienen
     que entrar en unos 640 de los 720 de diseño, y de ahí 640·17,2/7,32 ≈ 1500. */
  const d = Math.max(0.6, (P_DIST + P_OJO) - z);
  const e = P_FOCO/d;
  return { x: AN/2 + x*e, y: AL*P_HZ - (y - P_ALTOC)*e, e };
}

function pCam(){}

const JUEGO = {
  id: 'penal',
  tipo: 'niveles',
  nivelesTotal: P_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return P_goles; },
  get sub(){ return TX('tirosC'); },
  get ficI(){ return TX('nivelC') + ' ' + NIVEL; },
  get ficD(){ return TX('tirosC') + ' ' + P_goles + '/' + P_meta; },
  get resta(){ return P_tope ? Math.max(0, 1 - P_tiros/P_tope) : 0; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ pDemo(g, u, 0); } },
    { dur: 3.6, pie: 'c2', dibuja(g, u){ pDemo(g, u, 1); } },
    { dur: 3.2, pie: 'c3', dibuja(g, u){ pDemo(g, u, 2); } }
  ],

  arranca(n){
    P_nivel = n || 1;
    const G = pGenera(P_nivel);
    P_barrera = G.b; P_arq = G.arq; this.meta = G.meta;
    P_tope = G.tope; P_meta = G.goles;
    /* ── Y LA TANDA SE COMPRUEBA ANTES DE JUGARLA ──
       Un nivel generado y no jugado es un nivel roto que todavia no se sabe:
       medido, cuatro de cincuenta salian SIN NINGUN TIRO POSIBLE —la barrera
       tapaba el unico hueco que el aro dejaba— y eso no se ve mirando la
       barrera, porque lo que decide es si alguna curva la rodea a tiempo.
       Se afloja de a poco y se vuelve a comprobar: primero el aro, y si aun asi
       no hay tiro, se saca un tipo de la barrera. */
    for (let i = 0; i < 6 && !pBusca(this.meta, true).entra; i++){
      /* el aro se topa en 2,4: mas grande se sale del arco por los costados y
         deja de decir donde hay que meterla, que es para lo que existe */
      /* al aflojar, el aro crece Y se corre hacia el centro: creciendo solo, se
         sale por el costado del arco y deja de decir donde hay que meterla */
      this.meta.r = Math.min(2.4, this.meta.r*1.14);
      this.meta.x *= 0.88;
      pAcota(this.meta);
      if (i >= 2 && P_barrera.length > 1) P_barrera.pop();
    }
    P_tiros = 0; P_goles = 0;
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
    P_msg = ''; P_msgT = 0; P_lento = 0;
    this.pone();
  },

  pone(){
    P_bola = { x: 0, y: 0.11, z: P_DIST, vx: 0, vy: 0, vz: 0, giro: 0 };
    P_traza = []; P_arr = null; P_fase = 'apunta'; P_t = 0;
    P_arq.x = 0; P_arq.vx = 0; P_arq.lado = 0; P_arq.t0 = 0;
    for (const b of P_barrera) b.t0 = 0.20 + ((b.x*97)%13)/13*0.3;
  },

  paso(dt){
    const dtm = P_lento > 0 ? dt*0.3 : dt;
    if (P_lento > 0) P_lento = Math.max(0, P_lento - dt);
    if (P_msgT > 0) P_msgT = Math.max(0, P_msgT - dt);
    if (P_fase !== 'vuela'){
      if (P_fase === 'resuelve'){
        P_t += dt;
        if (P_t > 1.35) this.sigue();
      }
      return;
    }
    P_t += dtm;
    const b = P_bola;
    /* ── EL EFECTO MAGNUS: LA CURVA ES UNA ACELERACIÓN LATERAL ──
       Y va atada a la velocidad, que es lo que hace que una pelota lenta
       casi no doble: con una aceleración constante, un tiro flojo se iría a
       la tribuna. */
    const v = Math.hypot(b.vx, b.vz) || 1;
    b.vx += b.giro*v*dtm;
    b.vy -= P_G*dtm;
    b.x += b.vx*dtm; b.y += b.vy*dtm; b.z -= b.vz*dtm;
    if (b.y < 0.11){ b.y = 0.11; b.vy = Math.abs(b.vy)*0.45; }
    P_traza.push({ x: b.x, y: b.y, z: b.z });
    if (P_traza.length > 90) P_traza.shift();

    /* el arquero elige lado cuando ya vio salir la pelota */
    P_arq.t0 += dtm;
    if (P_arq.lado === 0 && P_arq.t0 > P_arq.reflejo){
      /* ── ADIVINA CON EL DATO QUE TIENE, NO CON EL FUTURO ──
         Extrapola la trayectoria RECTA desde donde está la pelota. Con la
         posición final exacta sería imbatible; con la recta, un tiro con curva
         lo manda para el lado equivocado — que es exactamente el premio de
         curvar. */
      const t = b.z/Math.max(1, b.vz);
      P_arq.lado = (b.x + b.vx*t) < 0 ? -1 : 1;
    }
    if (P_arq.lado){
      const obj = P_arq.lado*Math.min(P_arq.alcance, P_ANCHO/2);
      P_arq.x += (obj - P_arq.x)*Math.min(1, dtm*5.5);
    }

    /* la barrera: cada uno salta en su instante */
    for (const w of P_barrera)
      w.y = (w.salta && P_t > w.t0 && P_t < w.t0 + 0.55)
            ? Math.sin((P_t - w.t0)/0.55*Math.PI)*0.55 : 0;

    /* ¿pegó en la barrera? está a 9,15 m del arco */
    if (b.z <= P_DIST - 9.15 + 0.2 && b.z > P_DIST - 9.15 - 0.4){
      for (const w of P_barrera){
        if (Math.abs(b.x - w.x) < 0.30 && b.y < w.alt + (w.y || 0) + 0.12){
          this.termina('barrera'); return;
        }
      }
    }
    if (b.z <= 0){ this.cruza(); return; }
    if (P_t > 4 || Math.abs(b.x) > 14) this.termina('afuera');
  },

  cruza(){
    const b = P_bola;
    const dentro = Math.abs(b.x) < P_ANCHO/2 - 0.11 && b.y < P_ALTO - 0.11;
    const palo = Math.abs(Math.abs(b.x) - P_ANCHO/2) < 0.22 ||
                 Math.abs(b.y - P_ALTO) < 0.22;
    if (!dentro){ this.termina(palo ? 'palo' : 'afuera'); return; }
    /* ── EL ARQUERO ATAJA POR DISTANCIA, NO POR LADO ──
        Con «adivinó el lado, ataja» un tiro al ángulo sería igual de atajable
        que uno al medio, y entonces la meta no significaría nada. */
    const d = Math.hypot(b.x - P_arq.x, b.y - 0.95);
    if (d < 1.15){ this.termina('ataja'); return; }
    /* ── Y EL ARO CUENTA, QUE SI NO ES UN ADORNO ──
       Dibujado y sin consecuencia, el nivel le esta pidiendo algo al jugador que
       despues no mira: la dificultad se lee a arbitraria porque LO ES. Con el
       aro puesto, la tanda no pide «meté goles» sino «meté goles ahi», y eso es
       lo que obliga a elegir la curva en vez de patear fuerte al medio. */
    const dm = Math.hypot(b.x - this.meta.x, b.y - this.meta.y);
    if (dm > this.meta.r){ this.termina('fuera'); return; }
    this.termina('gol');
  },

  termina(k){
    P_msg = k; P_msgT = 1.3;
    P_fase = 'resuelve'; P_t = 0;
    P_tiros++;
    if (k === 'gol'){
      P_goles++;
      son('gana', 0.9); destella('#7fe08a', 0.8); sacude(0.3);
      P_lento = 0.45;
    } else {
      son(k === 'ataja' ? 'pierde' : 'caida', 0.8);
      if (k === 'ataja') sacude(0.25);
    }
  },

  sigue(){
    if (P_goles >= P_meta){
      this.gano = true;
      this.estrellas = P_tiros <= P_meta ? 3 : (P_tiros <= P_meta + 1 ? 2 : 1);
      this.finP = TX('tirosC') + ' ' + P_goles + '/' + P_tiros;
      this.vivo = false; return;
    }
    if (P_tiros >= P_tope){ this.vivo = false; return; }
    this.pone();
  },

  /* ── LA TENSIÓN: EL VECTOR Y LA CURVA SALEN DEL MISMO CAMINO ──
     `dir` y `fuerza` son las dos puntas; `curva` es cuánto se apartó el dedo de
     la recta entre ellas, con SIGNO. Se mide en el punto más alejado y no en el
     promedio: un promedio se cancela solo en una ese, y una ese no es una
     curva. */
  tension(){
    if (!P_arr || P_arr.p.length < 2) return { ang: 1.2, f: 0, cur: 0 };
    const p = P_arr.p, a = p[0], b = p[p.length - 1];
    const dx = a.x - b.x, dy = a.y - b.y;
    const L = Math.hypot(dx, dy);
    if (L < 8) return { ang: 1.2, f: 0, cur: 0 };
    let peor = 0;
    for (const q of p){
      /* producto cruz normalizado: la distancia con signo a la recta */
      const s = ((b.x - a.x)*(q.y - a.y) - (b.y - a.y)*(q.x - a.x))/L;
      if (Math.abs(s) > Math.abs(peor)) peor = s;
    }
    return { ang: Math.atan2(-dy, dx), f: Math.min(1, L/240),
             cur: Math.max(-1, Math.min(1, peor/70)) };
  },

  patea(ang, f, cur){
    const v = Math.max(0.25, Math.min(1, f))*P_VMAX;
    /* el ángulo del arrastre da altura y apertura; `cur` da el efecto */
    const sub = Math.max(0.05, Math.min(1.25, Math.sin(ang)));
    const lat = Math.cos(ang);
    P_bola.vz = v*Math.max(0.35, Math.abs(Math.cos(Math.min(1.2, Math.abs(ang) - 0.9))));
    P_bola.vx = lat*v*0.42;
    P_bola.vy = sub*v*0.42;
    P_bola.giro = -cur*0.85;
    P_traza = [];
    P_fase = 'vuela'; P_t = 0;
    P_arq.t0 = 0; P_arq.lado = 0;
    son('caida', 0.9); sacude(0.12);
  },

  baja(px, py){
    if (MODO !== 'juega' || P_fase !== 'apunta') return;
    P_arr = { p: [{ x: px, y: py }] };
    son('toque', 0.5);
  },
  mueve(px, py){
    if (!P_arr) return;
    const u = P_arr.p[P_arr.p.length - 1];
    if (Math.hypot(px - u.x, py - u.y) > 5) P_arr.p.push({ x: px, y: py });
    if (P_arr.p.length > 90) P_arr.p.shift();
  },
  sube(){
    if (!P_arr || P_fase !== 'apunta'){ P_arr = null; return; }
    const t = this.tension();
    P_arr = null;
    if (t.f < 0.12) return;
    this.patea(t.ang, t.f, t.cur);
  },

  fondo(g){},
  pinta(g){ pPinta(g); },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto BUSCA la curva: prueba unas cuantas y se queda con la que llega
     a la meta esquivando la barrera. El otro patea al bulto. Si curvar no
     sirviera, los dos harían la misma cantidad de goles. */
  juegaSolo(n, azar){
    let gana = 0, malos = [], goles = 0, tiros = 0;
    const dt = 1/60;
    for (let niv = 1; niv <= (n || P_NIVELES); niv++){
      this.arranca(niv);
      let v = 0;
      while (this.vivo && v < 6000){
        v++;
        if (P_fase === 'apunta'){
          const s = azar
            ? { ang: 0.6 + Math.random()*0.9, f: 0.5 + Math.random()*0.5,
                cur: (Math.random() - 0.5)*1.6 }
            : pBusca(this.meta);
          this.patea(s.ang, s.f, s.cur);
          tiros++;
          continue;
        }
        this.paso(dt);
      }
      goles += P_goles;
      if (this.gano) gana++; else malos.push(niv);
    }
    return JSON.stringify({ niveles: (n || P_NIVELES), gana,
                            malos: malos.slice(0, 10), nMalos: malos.length,
                            tiros, goles,
                            tasa: tiros ? +(goles/tiros).toFixed(3) : 0 });
  },

  /* ── LA AUDITORÍA: QUE LA TANDA SE PUEDA GANAR ──
     Se busca un tiro que entre, y si NO existe el nivel es imposible por
     construcción. Es la única forma de saberlo: mirar la barrera no alcanza,
     porque lo que decide es si alguna curva la rodea a tiempo. */
  audita(a, b){
    const malos = [];
    let minD = 9, maxD = 0;
    for (let n = (a || 1); n <= (b || P_NIVELES); n++){
      this.arranca(n);
      const s = pBusca(this.meta, true);
      if (!s || !s.entra) malos.push([n, 'sin tiro posible']);
      else { minD = Math.min(minD, s.dist); maxD = Math.max(maxD, s.dist); }
      if (P_barrera.length > 5) malos.push([n, 'barrera muy ancha']);
      if (this.meta.r < 0.7) malos.push([n, 'meta muy chica']);
    }
    return JSON.stringify({ niveles: (b || P_NIVELES) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            dist: [+minD.toFixed(2), +maxD.toFixed(2)] });
  },

  ver(){
    return JSON.stringify({
      nivel: P_nivel, fase: P_fase, tiros: P_tiros, tope: P_tope,
      goles: P_goles, meta: P_meta,
      bola: P_bola ? [+P_bola.x.toFixed(2), +P_bola.y.toFixed(2), +P_bola.z.toFixed(2)] : null,
      giro: P_bola ? +P_bola.giro.toFixed(3) : 0,
      barrera: P_barrera.length, arq: [+P_arq.x.toFixed(2), P_arq.lado],
      msg: P_msg, vivo: this.vivo, gano: this.gano, est: this.estrellas });
  },
  cfg(o){
    if (o.patea) this.patea(o.patea[0], o.patea[1], o.patea[2] || 0);
    if (o.busca){ const s = pBusca(this.meta, true); return JSON.stringify(s); }
    if (o.auto){ const s = pBusca(this.meta); this.patea(s.ang, s.f, s.cur); }
    return this.ver();
  }
};

/* ── LA BÚSQUEDA DEL TIRO: SE SIMULA, NO SE DESPEJA ──
   Con el efecto Magnus atado a la velocidad no hay forma cerrada, así que se
   barren ángulo, fuerza y curva y se simula cada uno con la MISMA física del
   juego, incluida la barrera. Es lo mismo que hace kBotTiro en CASTILLO y por
   la misma razón: lo que importa no es pasar por un punto, es llegar. */
/* ── Y LA SIMULACION INCLUYE AL ARQUERO ──
   Sin el, `pBusca` devolvia el tiro que MAS SE ACERCA a la meta, y el arquero
   se lo comia: medido, el bot honesto metia el 21,7 % de sus tiros teniendo un
   tiro que entra en los cincuenta niveles. Lo que importa no es pasar por un
   punto: es que el tiro sobreviva a todo lo que hay en el camino. Es la misma
   leccion que en CASTILLO. */
function pSim(ang, f, cur, meta){
  const v = Math.max(0.25, Math.min(1, f))*P_VMAX;
  const sub = Math.max(0.05, Math.min(1.25, Math.sin(ang)));
  const b = { x: 0, y: 0.11, z: P_DIST,
              vz: v*Math.max(0.35, Math.abs(Math.cos(Math.min(1.2, Math.abs(ang) - 0.9)))),
              vx: Math.cos(ang)*v*0.42, vy: sub*v*0.42, giro: -cur*0.85 };
  const dt = 1/240;
  let ax = 0, lado = 0, t = 0;
  for (let i = 0; i < 900; i++){
    t += dt;
    const vv = Math.hypot(b.vx, b.vz) || 1;
    b.vx += b.giro*vv*dt; b.vy -= P_G*dt;
    b.x += b.vx*dt; b.y += b.vy*dt; b.z -= b.vz*dt;
    if (b.y < 0.11){ b.y = 0.11; b.vy = Math.abs(b.vy)*0.45; }
    if (lado === 0 && t > P_arq.reflejo){
      const tt = b.z/Math.max(1, b.vz);
      lado = (b.x + b.vx*tt) < 0 ? -1 : 1;
    }
    if (lado){
      const obj = lado*Math.min(P_arq.alcance, P_ANCHO/2);
      ax += (obj - ax)*Math.min(1, dt*5.5);
    }
    if (b.z <= P_DIST - 9.15 + 0.2 && b.z > P_DIST - 9.15 - 0.4)
      for (const w of P_barrera)
        if (Math.abs(b.x - w.x) < 0.30 && b.y < w.alt + 0.12) return null;
    if (b.z <= 0){
      const dentro = Math.abs(b.x) < P_ANCHO/2 - 0.11 && b.y < P_ALTO - 0.11;
      if (!dentro) return null;
      if (Math.hypot(b.x - ax, b.y - 0.95) < 1.15) return null;
      const d = Math.hypot(b.x - meta.x, b.y - meta.y);
      if (d > meta.r) return null;
      return { x: b.x, y: b.y, d };
    }
  }
  return null;
}

function pBusca(meta, detalle){
  let mej = null;
  /* ── LA REJA DE BUSQUEDA ES DENSA A PROPOSITO ──
     Una persona tiene control continuo; el bot tiene una reja. Con 7x5x13 la
     auditoria daba QUINCE niveles «sin tiro posible» que en realidad si tienen
     uno — o sea que la prueba estaba midiendo la reja y no el juego. Con
     11x8x25 son 2.200 simulaciones por nivel, que en un barrido de cincuenta
     tardan un segundo y cambian la respuesta. */
  for (let ia = 0; ia <= 10; ia++){
    const ang = 0.50 + ia*(1.40 - 0.50)/10;
    for (let iff = 0; iff <= 7; iff++){
      const f = 0.48 + iff*0.075;
      for (let ic = 0; ic <= 24; ic++){
        const cur = -1 + ic*2/24;
        const r = pSim(ang, f, cur, meta);
        if (!r) continue;
        const s = r.d;
        if (!mej || s < mej.s) mej = { ang, f, cur, s, x: r.x, y: r.y };
      }
    }
  }
  if (!mej) return detalle ? { entra: false } : { ang: 1.0, f: 0.8, cur: 0 };
  if (detalle) return { entra: true, ang: +mej.ang.toFixed(2), f: +mej.f.toFixed(2),
                        cur: +mej.cur.toFixed(2), dist: +mej.s.toFixed(2),
                        cae: [+mej.x.toFixed(2), +mej.y.toFixed(2)] };
  return mej;
}

/* ══════════════════════════════ EL DIBUJO ══════════════════════════════ */

function pArco(g){
  /* el arco, dibujado con la misma proyección que la pelota: así el travesaño
     y el palo caen exactamente donde la pelota los va a cruzar */
  const s = P_ANCHO/2, h = P_ALTO;
  const a = pProy(-s, 0, 0), b = pProy(s, 0, 0);
  const c = pProy(-s, h, 0), d = pProy(s, h, 0);
  /* la red: líneas finas, y es lo único que da la profundidad del arco */
  g.save();
  g.beginPath();
  g.moveTo(c.x, c.y); g.lineTo(d.x, d.y); g.lineTo(b.x, b.y); g.lineTo(a.x, a.y);
  g.closePath();
  g.fillStyle = 'rgba(240,246,255,.07)'; g.fill();
  g.clip();
  g.strokeStyle = 'rgba(240,246,255,.20)'; g.lineWidth = 1.2;
  for (let i = 0; i <= 20; i++){
    const x = -s + i*(2*s/20);
    const p0 = pProy(x, 0, 0), p1 = pProy(x, h, 0);
    g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
  }
  for (let i = 0; i <= 8; i++){
    const y = i*(h/8);
    const p0 = pProy(-s, y, 0), p1 = pProy(s, y, 0);
    g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
  }
  g.restore();
  /* los tres palos, gruesos y claros: son el límite del juego */
  g.strokeStyle = '#f2f6ff'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y);
  g.lineTo(d.x, d.y); g.lineTo(b.x, b.y); g.stroke();
}

function pMeta(g, meta){
  /* ── LA META SE DIBUJA, Y NO ES UN ADORNO ──
     El nivel no pide «hacer gol» sino «hacer gol ahí»: sin el aro, el jugador
     no tiene forma de saber qué le están pidiendo y la dificultad se lee a
     arbitraria. */
  const p = pProy(meta.x, meta.y, 0);
  const r = meta.r*p.e;
  const la = 0.45 + 0.25*Math.sin(performance.now()*0.004);
  g.save();
  g.globalAlpha = la;
  g.strokeStyle = '#ffd76a'; g.lineWidth = 4;
  g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.stroke();
  g.setLineDash([8, 10]);
  g.beginPath(); g.arc(p.x, p.y, r*0.62, 0, 7); g.stroke();
  g.restore();
}

function pBarrera(g){
  /* de atrás hacia adelante no hace falta: están todos a la misma distancia.
     Sí importa el orden lateral, para que la silueta se lea como una fila. */
  const z = P_DIST - 9.15;
  const ord = P_barrera.slice().sort((a, b) => a.x - b.x);
  for (const w of ord){
    const sy = w.y || 0;
    const p = pProy(w.x, sy, z), q = pProy(w.x, w.alt + sy, z);
    const an = 0.46*p.e;
    /* ── VA POR ALTO Y NO ESTIRADO ──
       `dibCuadroWH` estira el sprite al ancho y al alto que se le den, que es lo
       correcto para un bloque de CASTILLO —cambia de forma piso a piso— y lo
       incorrecto para una persona: estirada se deforma. El alto lo pone la
       proyeccion y el ancho sale de la proporcion del cuadro. */
    if (!dibCuadro('p_gente', 0, p.x, p.y, p.y - q.y)){
      caja2(p.x - an/2, q.y, an, p.y - q.y, an*0.28, '#2f4f7a', 'rgba(10,14,22,.6)');
      disco(p.x, q.y - an*0.30, an*0.34, '#e8b48a');
      /* las manos delante de la cara: es lo que dice que esto es una barrera */
      caja2(p.x - an*0.42, q.y + an*0.55, an*0.84, an*0.30, an*0.14,
            '#e8b48a', 'rgba(10,14,22,.5)');
    }
    /* la sombra de contacto, sólo si está en el piso */
    if (sy < 0.02){
      g.save(); g.globalAlpha = 0.3;
      g.beginPath(); g.ellipse(p.x, p.y, an*0.62, an*0.16, 0, 0, 7);
      g.fillStyle = '#000'; g.fill(); g.restore();
    }
  }
}

function pArquero(g){
  const p = pProy(P_arq.x, 0, 0.4), q = pProy(P_arq.x, 1.85, 0.4);
  const an = 0.62*p.e;
  const tir = Math.abs(P_arq.x) > 0.3;
  /* y el que se tira se ESPEJA segun el lado: el sprite volvio volando hacia la
     derecha, asi que sin espejo el arquero se tira siempre para el mismo lado */
  if (!dibCuadro('p_arquero', tir ? 1 : 0, p.x, p.y, p.y - q.y, tir && P_arq.x < 0)){
    g.save();
    if (tir){ g.translate(p.x, (p.y + q.y)/2); g.rotate(Math.sign(P_arq.x)*0.55);
              g.translate(-p.x, -(p.y + q.y)/2); }
    caja2(p.x - an/2, q.y, an, p.y - q.y, an*0.26, '#c4553c', 'rgba(10,14,22,.6)');
    disco(p.x, q.y - an*0.26, an*0.30, '#e8b48a');
    /* los guantes, bien abiertos: son lo que hay que evitar */
    for (const s of [-1, 1])
      disco(p.x + s*an*0.78, q.y + an*0.30, an*0.24, '#ffd76a');
    g.strokeStyle = 'rgba(10,14,22,.5)'; g.lineWidth = 3;
    for (const s of [-1, 1]){
      g.beginPath();
      g.moveTo(p.x + s*an*0.30, q.y + an*0.34);
      g.lineTo(p.x + s*an*0.72, q.y + an*0.30);
      g.stroke();
    }
    g.restore();
  }
}

function pBolaDib(g){
  const b = P_bola;
  const p = pProy(b.x, b.y, b.z);
  const r = Math.max(3, 0.11*p.e);
  /* la sombra en el pasto: es lo único que dice a qué ALTURA va */
  const s = pProy(b.x, 0, b.z);
  g.save(); g.globalAlpha = 0.32;
  g.beginPath(); g.ellipse(s.x, s.y, r*1.1, r*0.36, 0, 0, 7);
  g.fillStyle = '#000'; g.fill(); g.restore();
  if (!dibCuadro('p_bola', 0, p.x, p.y + r, r*2)){
    disco(p.x, p.y, r, '#f5f7fa');
    g.strokeStyle = '#5a6070'; g.lineWidth = Math.max(1, r*0.14);
    g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.stroke();
    g.fillStyle = '#2f3540';
    for (let i = 0; i < 5; i++){
      const a = i*1.256 + b.z*0.4;
      g.beginPath();
      g.arc(p.x + Math.cos(a)*r*0.45, p.y + Math.sin(a)*r*0.45, r*0.22, 0, 7);
      g.fill();
    }
  }
}

function pTrazaDib(g){
  if (P_traza.length < 2) return;
  g.beginPath();
  let n = 0;
  for (const q of P_traza){
    const p = pProy(q.x, q.y, q.z);
    if (n++ === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
  }
  g.strokeStyle = 'rgba(255,246,224,.42)'; g.lineWidth = 4;
  g.lineCap = 'round'; g.stroke();
}

/* ── EL CAMINO DEL DEDO SE DIBUJA MIENTRAS SE ARRASTRA ──
   Es la única forma de que el jugador vea que la CURVA cuenta: con un vector
   recto entre el principio y el final, curvar el dedo no se distinguiría de
   arrastrar derecho, y el verbo del juego quedaría escondido. */
function pDedo(g){
  const p = P_arr.p;
  if (p.length < 2) return;
  g.save();
  g.strokeStyle = 'rgba(255,246,224,.30)'; g.lineWidth = 3;
  g.setLineDash([6, 8]);
  g.beginPath(); g.moveTo(p[0].x, p[0].y);
  g.lineTo(p[p.length - 1].x, p[p.length - 1].y); g.stroke();
  g.restore();
  g.beginPath(); g.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y);
  const t = JUEGO.tension();
  g.strokeStyle = Math.abs(t.cur) > 0.25 ? '#ffd76a' : 'rgba(255,246,224,.85)';
  g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  /* la previsualización: dónde cruzaría la línea de gol con este gesto */
  const r = pSim(t.ang, t.f, t.cur, { x: 0, y: 0 });
  if (r){
    const q = pProy(r.x, r.y, 0);
    g.strokeStyle = 'rgba(255,215,106,.8)'; g.lineWidth = 3;
    g.beginPath(); g.arc(q.x, q.y, 14, 0, 7); g.stroke();
  }
}

function pPinta(g){
  /* el pasto: una franja con su horizonte, y las dos líneas del área, que son
     lo que da la escala de distancia */
  const hz = AL*P_HZ;
  const pat = patron('p_pasto');
  g.fillStyle = '#2f6b3a';
  g.fillRect(0, hz, AN, AL - hz);
  if (pat){
    g.save();
    g.beginPath(); g.rect(0, hz, AN, AL - hz); g.clip();
    g.globalAlpha = 0.7; g.fillStyle = pat; g.fillRect(0, hz, AN, AL);
    g.restore();
  }
  g.strokeStyle = 'rgba(255,255,255,.30)'; g.lineWidth = 3;
  for (const z of [0.02, 5.5, 16.5]){
    const a = pProy(-20, 0, z), b = pProy(20, 0, z);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  for (const x of [-9.16, 9.16]){
    const a = pProy(x, 0, 0), b = pProy(x, 0, 16.5);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }

  pArco(g);
  pMeta(g, JUEGO.meta);
  pArquero(g);
  pTrazaDib(g);
  pBarrera(g);
  pBolaDib(g);
  if (P_arr && P_fase === 'apunta') pDedo(g);

  if (P_msgT > 0){
    const al = Math.min(1, P_msgT/0.4);
    const col = P_msg === 'gol' ? '127,224,138'
              : (P_msg === 'ataja' ? '255,106,90' : '242,238,230');
    texto(TX(P_msg), AN/2, AL*0.30, P_msg === 'gol' ? 62 : 44,
          'rgba(' + col + ',' + al.toFixed(2) + ')', '800', 'center');
  }
  if (MODO === 'juega' && P_fase === 'apunta' && !P_arr && P_tiros === 0)
    texto(TX('c1'), AN/2, AL - 250, 22, 'rgba(242,238,230,.62)', '700', 'center');
}

/* ══════════ LA CINEMÁTICA ══════════ */
function pDemo(g, u, plano){
  const gn = P_nivel, gf = P_fase, gt = P_t, ga = P_arr, gb = P_bola;
  const gz = P_traza, gm = P_msg, gmt = P_msgT, gti = P_tiros;
  const gmeta = JUEGO.meta;

  const G = pGenera(plano === 2 ? 30 : 6);
  P_barrera = G.b; P_arq = G.arq; JUEGO.meta = G.meta;
  P_tiros = 0; P_msg = ''; P_msgT = 0; P_arr = null;
  JUEGO.pone();

  if (plano === 0){
    /* el arrastre CURVO, que es el verbo entero */
    const n = 2 + Math.floor(u*22);
    P_arr = { p: [] };
    for (let i = 0; i < n; i++){
      const k = i/22;
      P_arr.p.push({ x: AN*0.50 + Math.sin(k*3.0)*90*k,
                     y: AL*0.62 + k*230 });
    }
  } else {
    const s = pBusca(JUEGO.meta);
    JUEGO.patea(s.ang, s.f, plano === 1 ? s.cur : s.cur);
    const dt = 1/240, T = plano === 1 ? 0.05 + u*0.62 : 0.05 + u*0.80;
    for (let k = 0; k < T; k += dt) JUEGO.paso(dt);
    if (plano === 2){ P_msg = 'gol'; P_msgT = 1.4; }
  }
  /* ── Y LA CINEMATICA DIBUJA SU PROPIO AMBIENTE ──
     En modo `cine` el bucle no llama a `ambAtras`. */
  ambAtras();
  pPinta(g);
  ambAdelante();

  P_nivel = gn; P_fase = gf; P_t = gt; P_arr = ga; P_bola = gb;
  P_traza = gz; P_msg = gm; P_msgT = gmt; P_tiros = gti; JUEGO.meta = gmeta;
}
