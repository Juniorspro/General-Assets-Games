/* ══════════════════════════════ SALTO ══════════════════════════════
   Rocas flotando sobre un cañón, y hay que ir de una a la otra.

   ── EL VERBO ES CARGAR: EL TIEMPO SE CAMBIA POR DISTANCIA ──
   Se aprieta y la barra sube; se suelta y el salto mide lo que llegó a cargar.
   Nada más. No hay dirección que elegir —siempre se va hacia adelante— así que
   toda la decisión es CUÁNTO, y el error se paga en las dos direcciones: corto
   te caés antes, largo te pasás de la roca.

   Eso es distinto de todo lo demás de la familia. ARCO elige un vector, PENAL
   un camino, DUELO un instante y PESCA una modulación; acá se elige UN NÚMERO,
   y lo que lo vuelve difícil es que las rocas SE MUEVEN mientras uno carga.

   ── Y POR ESO LA CARGA NO SE PUEDE PENSAR CON CALMA ──
   Con rocas quietas, la carga correcta se calcula una vez y el juego termina.
   Moviéndose, el número correcto cambia mientras se lo está cargando: hay que
   apuntarle a dónde VA a estar. */

const V_NIVELES = 55;
const V_G = 2100;              /* la gravedad del salto, en píxeles de diseño */
const V_VMIN = 520, V_VMAX = 1180;
const V_CARGA = 0.95;          /* segundos de carga completa */
const V_PIE = 0.70;            /* dónde caen las rocas, en fracción del alto */

let V_roca = [];               /* {x, y, w, vx, x0, amp, per, fase} */
let V_yo = null;               /* {x, y, vx, vy, enR, aire} */
let V_fase = 'listo';          /* listo · carga · vuela · cae · fin */
let V_carga = 0, V_t = 0, V_cam = 0;
let V_nivel = 1, V_paso = 0, V_meta = 0, V_vidas = 0;
let V_msg = '', V_msgT = 0, V_lento = 0;
let V_azar = 9;
function vAz(){ V_azar = (V_azar*1664525 + 1013904223) >>> 0; return V_azar / 4294967296; }

const JT = {
  es: { sub:'Apretá para cargar. Soltá y saltás lo que cargaste.',
        c1:'Apretá y sostené: la barra es la distancia.',
        c2:'Las rocas se mueven. Apuntale a donde VA a estar.',
        c3:'Cincuenta y cinco cañones.',
        nivelC:'CAÑÓN', pasoC:'ROCAS', vidasC:'VIDAS',
        buen:'¡BIEN!', corto:'CORTO', largo:'TE PASASTE', llego:'¡LLEGASTE!' },
  en: { sub:'Hold to charge. Let go and you jump what you charged.',
        c1:'Press and hold: the bar is the distance.',
        c2:'The rocks move. Aim where it WILL be.',
        c3:'Fifty-five canyons.',
        nivelC:'CANYON', pasoC:'ROCKS', vidasC:'LIVES',
        buen:'NICE!', corto:'SHORT', largo:'OVERSHOT', llego:'YOU MADE IT!' },
  pt: { sub:'Segure para carregar. Solte e pula o que carregou.',
        c1:'Aperte e segure: a barra é a distância.',
        c2:'As rochas se movem. Mire onde ELA VAI estar.',
        c3:'Cinquenta e cinco cânions.',
        nivelC:'CÂNION', pasoC:'ROCHAS', vidasC:'VIDAS',
        buen:'BOA!', corto:'CURTO', largo:'PASSOU', llego:'CHEGOU!' }
};
const PIEL = { ac:'#c4763c', tela:'fondo' };
const SON_ALIAS = { bien:'clava', toque:'tensa', pierde:'grito', gana:'gana',
                    clic:'clic', caida:'tira' };
const AMB = {
  foto: 'f_salto',
  cielo: ['#c4763c', '#2a1a12'],
  haz: 0.16,
  vineta: 0.42,
  part: { n: 12, dir: 'sube', forma: 'disco', col: '#f0d8b0',
          r0: 1.2, r1: 3.0, v0: 6, v1: 20, amp: 46, gira: 0,
          a0: 0.05, a1: 0.16 }
};

/* ══════════ EL GENERADOR ══════════
   Tres cosas crecen: el hueco entre rocas, cuánto se mueven, y cuántas hay que
   encadenar. Y el ancho de la roca BAJA, que es lo que hace que pasarse duela.

   ── Y CADA SALTO SE COMPRUEBA CONTRA EL ALCANCE REAL ──
   El alcance máximo sale de la física (`vMax` y la caída hasta el piso), así que
   un hueco mayor que eso es un nivel imposible por construcción. Se calcula, no
   se estima. */
function vAlcance(v){
  /* sale horizontal: el tiempo hasta volver a la altura de la roca es 2·vy/g,
     pero acá el salto es plano con gravedad, así que el vuelo dura lo que tarda
     en caer `V_SUBE` y volver */
  const t = 2*Math.sqrt(2*V_SUBE/V_G);
  return v*t;
}
const V_SUBE = 150;            /* cuánto sube el salto, fijo: la fuerza va al LARGO */

function vGenera(n){
  V_azar = (n*2654435761) >>> 0;
  for (let i = 0; i < 5; i++) vAz();
  const k = Math.min(1, (n - 1)/48);
  const cant = 4 + Math.floor(k*7);
  const alcMax = vAlcance(V_VMAX), alcMin = vAlcance(V_VMIN);

  /* ── PRIMERO LAS ROCAS Y DESPUÉS DÓNDE VAN, Y ESE ORDEN IMPORTA ──
     La distancia que hay que saltar es de CENTRO A CENTRO, y depende del ancho
     y del vaivén de la roca de DESTINO — que en un bucle que coloca sobre la
     marcha todavía no existe. La primera versión sumaba `ancho/2 + hueco +
     ancho/2` con un hueco acotado como si fuera la distancia entre centros:
     medido, doscientos setenta y seis pares de cincuenta y cinco niveles con la
     separación por encima del alcance máximo, o sea saltos que no se pueden
     hacer ni cargando a fondo. */
  const r = [];
  for (let i = 0; i <= cant; i++){
    /* ── EL ANCHO SALE DE LA TASA DEL BOT AL AZAR, NO DEL GUSTO ──
       Caer en la roca es caer dentro de su ancho, asi que la ventana de carga
       util es `ancho / (alcanceMax − alcanceMin)` = ancho/499. Con rocas de 190
       a 226 eso da casi la mitad del recorrido de la barra: medido, el bot que
       carga AL AZAR acertaba el 61,7 % de sus saltos, o sea que el numero que el
       juego pide elegir casi no importaba. Con 118 a 148 la ventana baja a un
       cuarto. */
    const ancho = 118 - k*52 + vAz()*30;
    const amp = (i === 0 || n <= 6) ? 0 : 24 + k*110;
    r.push({ x0: 0, x: 0, y: AL*V_PIE, w: ancho,
             amp, per: 1.6 + vAz()*1.8, fase: vAz()*6.283,
             dir: vAz() < 0.5 ? 1 : -1 });
  }
  r[0].x0 = 150;
  for (let i = 1; i < r.length; i++){
    const A = r[i - 1], B = r[i];
    /* el techo: en el peor instante —las dos rocas separadas al máximo— el salto
       a fondo tiene que seguir cayendo DENTRO de la de enfrente */
    const techo = alcMax + B.w*0.30 - (A.amp + B.amp)*1.10;
    /* y el piso: en el mejor instante, la carga mínima no puede pasarse de largo */
    const piso = alcMin - B.w*0.30 + (A.amp + B.amp)*1.10 + 50;
    let d = alcMin + 90 + k*(alcMax - alcMin)*0.82;
    d = Math.max(piso, Math.min(techo, d));
    /* y si el vaivén se comió la ventana entera, se lo achica: es preferible una
       roca que se mueve menos a un salto que no existe */
    if (techo < piso){
      const q = Math.max(0, (alcMax - alcMin - B.w*0.6 - 50)/2.2)/Math.max(1, A.amp + B.amp);
      A.amp *= q; B.amp *= q;
      d = (alcMax + alcMin)/2;
    }
    B.x0 = A.x0 + d;
  }
  for (const z of r) z.x = z.x0;
  return { r, meta: cant, vidas: 3 };
}

const JUEGO = {
  id: 'salto',
  tipo: 'niveles',
  nivelesTotal: V_NIVELES,
  vivo: true, gano: false, estrellas: 0, finP: '',
  get marca(){ return V_paso; },
  get sub(){ return TX('pasoC'); },
  get ficI(){ return TX('nivelC') + ' ' + NIVEL; },
  get ficD(){ return TX('vidasC') + ' ' + V_vidas; },
  get resta(){ return V_meta ? Math.max(0, 1 - V_paso/V_meta) : 0; },

  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){ vDemo(g, u, 0); } },
    { dur: 3.4, pie: 'c2', dibuja(g, u){ vDemo(g, u, 1); } },
    { dur: 3.0, pie: 'c3', dibuja(g, u){ vDemo(g, u, 2); } }
  ],

  arranca(n){
    V_nivel = n || 1;
    const G = vGenera(V_nivel);
    V_roca = G.r; V_meta = G.meta; V_vidas = G.vidas;
    V_paso = 0;
    this.vivo = true; this.gano = false; this.estrellas = 0; this.finP = '';
    V_msg = ''; V_msgT = 0; V_lento = 0; V_t = 0;
    this.pone(0);
  },

  pone(i){
    V_paso = i;
    vMueve(0);
    const r = V_roca[i];
    V_yo = { x: r.x, y: r.y, vx: 0, vy: 0, enR: i, aire: 0 };
    V_fase = 'listo'; V_carga = 0;
    V_cam = r.x;
    V_esc = vEscMeta();
  },

  paso(dt){
    const dtm = V_lento > 0 ? dt*0.3 : dt;
    if (V_lento > 0) V_lento = Math.max(0, V_lento - dt);
    if (V_msgT > 0) V_msgT = Math.max(0, V_msgT - dt);
    V_t += dtm;
    vMueve(dtm);
    V_esc += (vEscMeta() - V_esc)*Math.min(1, dtm*3.5);

    if (V_fase === 'carga'){
      V_carga = Math.min(1, V_carga + dtm/V_CARGA);
      const r = V_roca[V_yo.enR];
      V_yo.x = r.x; V_yo.y = r.y;
      V_cam += (V_yo.x - V_cam)*Math.min(1, dtm*6);
      return;
    }
    if (V_fase === 'listo'){
      const r = V_roca[V_yo.enR];
      V_yo.x = r.x; V_yo.y = r.y;
      V_cam += (V_yo.x - V_cam)*Math.min(1, dtm*6);
      return;
    }
    if (V_fase === 'vuela'){
      const yAntes = V_yo.y;
      V_yo.vy += V_G*dtm;
      V_yo.x += V_yo.vx*dtm; V_yo.y += V_yo.vy*dtm;
      V_yo.aire += dtm;
      V_cam += (V_yo.x - V_cam)*Math.min(1, dtm*5);
      /* ── SÓLO SE ATERRIZA CAYENDO, Y ESO NO ES UN DETALLE ──
         Sin la condición de `vy > 0`, el salto se «aterriza» en el cuadro en
         que despega —la altura es la misma— y todos los saltos miden cero. */
      /* ── SE ATERRIZA EN EL CUADRO EN QUE SE CRUZA LA TAPA, Y NO DESPUES ──
         Con la condicion `y >= tapa` a secas, el cuadro siguiente la sigue
         cumpliendo: el heroe sigue cayendo Y AVANZANDO —hasta seiscientos
         pixeles antes de tocar el fondo del canon— y se «apoya» en cualquier
         roca por la que pase de costado. Medido, eso mas que duplicaba la
         ventana de carga: el bot que carga AL AZAR acertaba el 51 % de sus
         saltos donde la geometria da 22 %. */
      if (V_yo.vy > 0 && yAntes < V_roca[0].y && V_yo.y >= V_roca[0].y){
        for (let i = 0; i < V_roca.length; i++){
          const r = V_roca[i];
          if (Math.abs(V_yo.x - r.x) <= r.w/2){
            V_yo.y = r.y; V_yo.vy = 0; V_yo.vx = 0;
            if (i > V_yo.enR){ this.llega(i); }
            else { V_yo.enR = i; V_fase = 'listo'; V_carga = 0; }
            return;
          }
        }
      }
      if (V_yo.y > AL*V_PIE + 260){ this.cae(); }
      return;
    }
    if (V_fase === 'cae'){
      V_yo.vy += V_G*dtm; V_yo.y += V_yo.vy*dtm; V_yo.x += V_yo.vx*dtm;
      if (V_t > 1.1) this.rearma();
      return;
    }
  },

  llega(i){
    const salto = i - V_yo.enR;
    V_yo.enR = i;
    V_paso = Math.max(V_paso, i);
    V_fase = 'listo'; V_carga = 0;
    V_msg = 'buen'; V_msgT = 0.8;
    son('bien', 0.85); sacude(0.2);
    if (i >= V_roca.length - 1){
      this.gano = true;
      this.estrellas = V_vidas >= 3 ? 3 : (V_vidas === 2 ? 2 : 1);
      this.finP = TX('vidasC') + ' ' + V_vidas;
      V_msg = 'llego'; V_msgT = 1.5;
      son('gana', 1); destella('#ffd76a', 0.9);
      this.vivo = false;
    }
  },

  cae(){
    V_fase = 'cae'; V_t = 0;
    V_vidas--;
    V_msg = V_yo.x < V_roca[Math.min(V_roca.length - 1, V_yo.enR + 1)].x ? 'corto' : 'largo';
    V_msgT = 1.2;
    son('pierde', 0.9); sacude(0.4); destella('#ff6a5a', 0.7);
  },

  rearma(){
    if (V_vidas <= 0){ this.vivo = false; return; }
    /* se vuelve a la ÚLTIMA roca pisada y no al principio: rehacer ocho saltos
       por errar el noveno es la forma más rápida de que alguien cierre el juego */
    this.pone(V_yo.enR);
  },

  fondo(g){},
  pinta(g){ vPinta(g); },

  baja(){
    if (MODO !== 'juega' || V_fase !== 'listo') return;
    V_fase = 'carga'; V_carga = 0; son('toque', 0.5);
  },
  mueve(){},
  sube(){
    if (V_fase !== 'carga') return;
    this.salta(V_carga);
  },

  salta(c){
    const v = V_VMIN + Math.max(0, Math.min(1, c))*(V_VMAX - V_VMIN);
    V_yo.vx = v;
    V_yo.vy = -Math.sqrt(2*V_G*V_SUBE);
    V_yo.aire = 0;
    V_fase = 'vuela';
    son('caida', 0.85);
  },

  /* ══════════ EL AUTO-JUGADOR ══════════
     El honesto CALCULA la carga que hace falta para caer en el medio de la roca
     de enfrente, teniendo en cuenta dónde va a estar cuando llegue. El otro
     carga al azar. Si el número no importara, los dos llegarían igual. */
  juegaSolo(n, azar){
    let gana = 0, malos = [], saltos = 0, buenos = 0;
    const dt = 1/60;
    for (let niv = 1; niv <= (n || V_NIVELES); niv++){
      this.arranca(niv);
      let v = 0;
      while (this.vivo && v < 9000){
        v++;
        if (V_fase === 'listo'){
          const c = azar ? Math.random() : vCarga(V_yo.enR);
          const antes = V_yo.enR;
          this.salta(c);
          saltos++;
          while (V_fase === 'vuela' && v < 9000){ this.paso(dt); v++; }
          if (V_yo.enR > antes) buenos++;
          continue;
        }
        this.paso(dt);
      }
      if (this.gano) gana++; else malos.push(niv);
    }
    return JSON.stringify({ niveles: (n || V_NIVELES), gana,
                            malos: malos.slice(0, 10), nMalos: malos.length,
                            saltos, buenos,
                            tasa: saltos ? +(buenos/saltos).toFixed(3) : 0 });
  },

  /* ── LA AUDITORÍA: QUE CADA HUECO SE PUEDA SALTAR ──
     Se comprueba el PEOR instante de cada par: la roca de enfrente en su
     extremo más lejano. Si ni con la carga máxima se llega, el nivel es
     imposible y no difícil. */
  audita(a, b){
    const malos = [];
    let minM = 9, maxM = 0, minH = 9999, maxH = 0;
    for (let n = (a || 1); n <= (b || V_NIVELES); n++){
      const G = vGenera(n);
      for (let i = 0; i < G.r.length - 1; i++){
        const A = G.r[i], B = G.r[i + 1];
        const lejos = (B.x0 + B.amp) - (A.x0 - A.amp);
        const cerca = (B.x0 - B.amp) - (A.x0 + A.amp);
        const alcMax = vAlcance(V_VMAX) + B.w/2;
        const alcMin = vAlcance(V_VMIN) - B.w/2;
        if (lejos > alcMax) malos.push([n, 'hueco ' + Math.round(lejos) + ' > alcance ' + Math.round(alcMax)]);
        if (cerca < alcMin) malos.push([n, 'roca ' + i + ' demasiado cerca']);
        minH = Math.min(minH, cerca); maxH = Math.max(maxH, lejos);
        /* el margen: cuánta ventana de carga hay, en fracción del recorrido */
        const m = (Math.min(alcMax, lejos + B.w) - Math.max(alcMin, cerca - B.w))
                  / (vAlcance(V_VMAX) - vAlcance(V_VMIN));
        minM = Math.min(minM, m); maxM = Math.max(maxM, m);
      }
      if (G.r.length < 3) malos.push([n, 'muy pocas rocas']);
    }
    return JSON.stringify({ niveles: (b || V_NIVELES) - (a || 1) + 1,
                            malos: malos.slice(0, 8), nMalos: malos.length,
                            hueco: [Math.round(minH), Math.round(maxH)],
                            margen: [+minM.toFixed(2), +maxM.toFixed(2)] });
  },

  ver(){
    return JSON.stringify({
      nivel: V_nivel, fase: V_fase, paso: V_paso, meta: V_meta,
      vidas: V_vidas, carga: +V_carga.toFixed(2),
      yo: V_yo ? [Math.round(V_yo.x), Math.round(V_yo.y)] : null,
      rocas: V_roca.length, msg: V_msg,
      /* las rocas y el alcance, que es lo unico con lo que se puede decidir si
         la ventana de carga es angosta o el nivel es un pasillo */
      x: V_roca.map(z => Math.round(z.x0)),
      w: V_roca.map(z => Math.round(z.w)),
      alc: [Math.round(vAlcance(V_VMIN)), Math.round(vAlcance(V_VMAX))],
      vivo: this.vivo, gano: this.gano, est: this.estrellas });
  },
  cfg(o){
    if (o.salta != null) this.salta(o.salta);
    if (o.auto) this.salta(vCarga(V_yo.enR));
    if (o.pasos) for (let i = 0; i < o.pasos; i++) this.paso(1/60);
    return this.ver();
  }
};

/* ── DÓNDE ESTÁ CADA ROCA: UNA FUNCIÓN DEL TIEMPO ──
   Guardadas como posición integrada, dos rocas con el mismo período se
   desincronizarían con el redondeo; como función del reloj no pueden. */
let V_reloj = 0;
function vMueve(dt){
  V_reloj += dt;
  for (const r of V_roca)
    r.x = r.x0 + Math.sin(V_reloj*(6.283/r.per) + r.fase)*r.amp*r.dir;
}

/* ── LA CARGA QUE HACE FALTA, RESUELTA HACIA ADELANTE ──
   La roca de enfrente se mueve, así que el blanco depende de cuánto dure el
   vuelo — y el vuelo depende de la carga. Se itera tres veces: con el vuelo
   fijo la cuenta es cerrada, y tres pasadas alcanzan porque el movimiento es
   chico al lado del hueco. */
function vCarga(i){
  const A = V_roca[i], B = V_roca[Math.min(V_roca.length - 1, i + 1)];
  const T = 2*Math.sqrt(2*V_SUBE/V_G);
  let v = (B.x - A.x)/T;
  for (let k = 0; k < 3; k++){
    const bx = B.x0 + Math.sin((V_reloj + T)*(6.283/B.per) + B.fase)*B.amp*B.dir;
    v = (bx - A.x)/T;
  }
  return Math.max(0, Math.min(1, (v - V_VMIN)/(V_VMAX - V_VMIN)));
}

/* ══════════════════════════════ EL DIBUJO ══════════════════════════════ */

/* ── LA CÁMARA SE ALEJA HASTA QUE ENTREN LAS DOS ROCAS ──
   Sin zoom, con el jugador en el medio y el hueco de 483 a 910 unidades de
   diseño, la roca de enfrente cae en 843 sobre un ancho de 720: FUERA DE LA
   PANTALLA. Y este juego pide apuntarle a dónde va a estar — con el blanco
   invisible no hay nada que apuntar. El jugador va al 32 % del ancho y la
   escala sale de la separación que hay que mostrar. */
let V_esc = 1;
function vEscMeta(){
  if (!V_yo || !V_roca.length) return 1;
  const A = V_roca[V_yo.enR] || V_roca[0];
  const B = V_roca[Math.min(V_roca.length - 1, V_yo.enR + 1)];
  const d = Math.abs(B.x - A.x) + B.w*0.6 + 180;
  return Math.max(0.42, Math.min(1, AN*0.62/d));
}
function vCam(g){
  g.save();
  g.translate(AN*0.32, AL*V_PIE);
  g.scale(V_esc, V_esc);
  g.translate(-V_cam, -AL*V_PIE);
}

function vRoca(g, r, i){
  const y = r.y;
  /* la sombra del vacío: una franja bajo la roca que la despega del fondo */
  g.save(); g.globalAlpha = 0.3;
  g.beginPath(); g.ellipse(r.x, y + 8, r.w*0.5, 10, 0, 0, 7);
  g.fillStyle = '#000'; g.fill(); g.restore();
  const k = r.w > 200 ? 0 : (r.w > 140 ? 1 : 2);
  if (!dibCuadroWH('v_roca', k, r.x, y + 40, r.w*1.1, 118)){
    g.fillStyle = '#6b4a34';
    g.beginPath();
    g.moveTo(r.x - r.w/2, y);
    g.lineTo(r.x + r.w/2, y);
    g.lineTo(r.x + r.w*0.32, y + 62);
    g.lineTo(r.x - r.w*0.10, y + 92);
    g.lineTo(r.x - r.w*0.36, y + 48);
    g.closePath(); g.fill();
    g.fillStyle = '#7fb85a';
    g.fillRect(r.x - r.w/2, y - 9, r.w, 12);
    g.strokeStyle = 'rgba(24,14,10,.5)'; g.lineWidth = 3;
    g.strokeRect(r.x - r.w/2, y - 9, r.w, 12);
  }
  /* ── LA MARCA DE LA ROCA QUE SIGUE ──
     Sin ella, en una fila de rocas iguales no hay forma de saber cuál es la
     próxima, y el juego pasa a ser adivinar hacia dónde se avanza. */
  if (i === V_yo.enR + 1){
    const la = 0.4 + 0.3*Math.sin(performance.now()*0.005);
    g.save(); g.globalAlpha = la;
    g.strokeStyle = '#ffd76a'; g.lineWidth = 4;
    g.beginPath();
    g.moveTo(r.x - 16, y - 34); g.lineTo(r.x, y - 16); g.lineTo(r.x + 16, y - 34);
    g.stroke(); g.restore();
  }
}

function vHeroe(g){
  const y = V_yo.y;
  const salta = V_fase === 'vuela' || V_fase === 'cae';
  const alto = 128;
  g.save();
  g.translate(V_yo.x, y);
  /* agachado mientras carga: el cuerpo dice cuánta fuerza lleva */
  const ag = V_fase === 'carga' ? V_carga*0.30 : 0;
  g.scale(1, 1 - ag);
  if (!dibCuadro('v_heroe', salta ? 1 : 0, 0, 0, alto/(1 - ag))){
    caja2(-16, -alto*0.55, 32, alto*0.55, 9, '#8a6134', 'rgba(24,14,10,.6)');
    disco(0, -alto*0.68, alto*0.16, '#e8b48a');
    g.strokeStyle = '#3a2418'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-8, -alto*0.55); g.lineTo(salta ? -22 : -10, -alto*0.10);
    g.moveTo(8, -alto*0.55); g.lineTo(salta ? 24 : 10, -alto*0.10);
    g.stroke();
  }
  g.restore();
}

/* ── LA BARRA DE CARGA VA PEGADA AL HÉROE Y NO EN EL HUD ──
   La carga se lee mientras se mira el salto: puesta arriba, obliga a mirar a
   otro lado justo en el segundo en que hay que decidir. */
function vBarra(g){
  const x = V_yo.x, y = V_yo.y - 128;
  const w = 120, h = 16;
  caja2(x - w/2 - 2, y - 2, w + 4, h + 4, 9, 'rgba(12,10,8,.6)', 'rgba(255,255,255,.2)');
  const c = V_carga > 0.92 ? '#ff6a5a' : (V_carga > 0.55 ? '#ffd76a' : '#7fe08a');
  caja2(x - w/2, y, Math.max(4, w*V_carga), h, 7, c, null);
  /* y la marca de la carga que hace falta: es la ayuda que hace que el primer
     nivel se entienda sin leer nada, y desaparece pasado el 6 */
  if (V_nivel <= 6){
    const q = vCarga(V_yo.enR);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x - w/2 + w*q, y - 6); g.lineTo(x - w/2 + w*q, y + h + 6);
    g.stroke();
  }
}

function vPinta(g){
  vCam(g);
  /* la pared del cañón, dos capas a distinta velocidad: es lo único que dice
     que uno avanza cuando todas las rocas se parecen */
  const pat = patron('v_piedra');
  for (let capa = 0; capa < 2; capa++){
    const vel = capa ? 0.55 : 0.28, alto = capa ? 210 : 340;
    const off = V_cam*(1 - vel);
    g.save();
    g.translate(off, 0);
    g.fillStyle = capa ? 'rgba(96,54,34,.55)' : 'rgba(64,36,24,.55)';
    const y0 = AL*V_PIE + (capa ? 130 : 210);
    g.fillRect(V_cam - off - AN, y0, AN*3, AL);
    if (pat && capa === 1){
      g.save();
      g.beginPath(); g.rect(V_cam - off - AN, y0, AN*3, AL); g.clip();
      g.globalAlpha = 0.35; g.fillStyle = pat;
      g.fillRect(V_cam - off - AN, y0, AN*3, AL);
      g.restore();
    }
    g.restore();
  }

  for (let i = 0; i < V_roca.length; i++) vRoca(g, V_roca[i], i);
  vHeroe(g);
  if (V_fase === 'carga') vBarra(g);
  g.restore();

  if (V_msgT > 0){
    const al = Math.min(1, V_msgT/0.4);
    const col = (V_msg === 'buen' || V_msg === 'llego') ? '127,224,138' : '255,106,90';
    texto(TX(V_msg), AN/2, AL*0.30, V_msg === 'llego' ? 58 : 42,
          'rgba(' + col + ',' + al.toFixed(2) + ')', '800', 'center');
  }
  /* el contador de rocas: es el marcador del nivel */
  texto(V_paso + ' / ' + V_meta, AN/2, AL*0.115, 26,
        'rgba(242,238,230,.6)', '800', 'center');
  if (MODO === 'juega' && V_fase === 'listo' && V_paso === 0)
    texto(TX('c1'), AN/2, AL - 250, 22, 'rgba(242,238,230,.62)', '700', 'center');
}

/* ══════════ LA CINEMÁTICA ══════════ */
function vDemo(g, u, plano){
  const gn = V_nivel, gf = V_fase, gc = V_carga, gy = V_yo, gr = V_roca;
  const gp = V_paso, gm = V_msg, gmt = V_msgT, gcam = V_cam, gt = V_reloj;

  const G = vGenera(plano === 2 ? 30 : 3);
  V_roca = G.r; V_meta = G.meta; V_vidas = 3; V_paso = 0;
  V_msg = ''; V_msgT = 0; V_reloj = plano === 1 ? u*3 : 0;
  JUEGO.pone(1);
  if (plano === 0){ V_fase = 'carga'; V_carga = u; }
  else if (plano === 1){
    JUEGO.salta(vCarga(1));
    const dt = 1/120;
    for (let s = 0; s < 0.05 + u*0.55 && V_fase === 'vuela'; s += dt) JUEGO.paso(dt);
  } else {
    V_paso = G.meta; V_msg = 'llego'; V_msgT = 1.4;
    JUEGO.pone(Math.min(G.r.length - 1, 3));
  }
  ambAtras();
  vPinta(g);
  ambAdelante();

  V_nivel = gn; V_fase = gf; V_carga = gc; V_yo = gy; V_roca = gr;
  V_paso = gp; V_msg = gm; V_msgT = gmt; V_cam = gcam; V_reloj = gt;
}
