/* ══════════════════════ EL PANEL Y EL JUEGO ══════════════════════
   Acá vive todo lo que decide QUÉ suena: dónde cae cada altura de la pantalla,
   qué le pasa a un dedo que se queda apoyado y se mueve, y el modo REPETÍ.

   ── NO TOCA NI EL DOM NI EL LIENZO, Y ESO NO ES PROLIJIDAD ──
   Si la lógica del panel viviera adentro del dibujo, no habría forma de
   auditarla sin un navegador. Así, la secuencia de REPETÍ y el mapa de alturas
   se pueden correr en node y comprobar que ninguna nota se sale del panel. */

/* ══════════ LO QUE SE GUARDA ══════════ */
function guarda(k, v){ try { localStorage.setItem('tono_' + k, String(v)); } catch (e) {} }
function lee(k, d){
  try { const v = localStorage.getItem('tono_' + k); return v === null ? d : v; }
  catch (e){ return d; }
}
function leeN(k, d){ const v = parseFloat(lee(k, NaN)); return isFinite(v) ? v : d; }

/* ══════════ LOS AJUSTES DEL PANEL ══════════ */
const PAN = {
  esc: 0,                    /* índice en ESCALAS */
  tono: 0,                   /* 0..11, cuánto se corre la tónica */
  oct: OCTAVAS,              /* cuántas octavas abarca el panel */
  libre: true,               /* el panel sin escalones: cualquier altura, cualquier nota */
  inst: INSTRS.length ? INSTRS[0].id : 'acoustic_grand_piano'
};

/* ── EL PANEL ES LIBRE, Y ESA ES LA REGLA DE FÁBRICA ──
   Cayendo en una escala, dos dedos cualesquiera afinan y una melodía se puede
   repetir; pero el dedo se queda pegado a once escalones y lo que se pidió es un
   continuo. Así que la cuantización deja de ser del juego y pasa a ser DEL MODO:
   TOCAR va libre, y REPETÍ —que tiene que poder comparar una nota con otra—
   cuantiza siempre, con la escala como su única regla y su única dificultad. */
function libreAct(){ return PAN.libre && !JU.on; }
function midiDeAlt(a){ return instAct().base + PAN.tono + cl(a, 0, 1)*12*PAN.oct; }

/* ── LAS GUÍAS DEL MODO LIBRE SON LOS DOCE SEMITONOS, NO LOS GRADOS ──
   No son escalones: son las marcas de una regla. Por eso en libre se dibujan
   cortas, desde los bordes, y sólo la octava cruza la pantalla entera. */
function nGuias(){ return libreAct() ? 12*PAN.oct + 1 : nGrados(); }
function altDeGuia(i){ const n = nGuias(); return n > 1 ? cl(i, 0, n - 1)/(n - 1) : 0.5; }
function midiDeGuia(i){ return libreAct() ? midiDeAlt(altDeGuia(i)) : midiDeIdx(i); }
function nombreDeGuia(i){ const m = Math.round(midiDeGuia(i)); return NOTA_NOM[((m % 12) + 12) % 12]; }
function esOctava(i){ return libreAct() ? (i % 12) === 0 : (i % escAct().g.length) === 0; }

function escAct(){ return ESCALAS[cl(PAN.esc, 0, ESCALAS.length - 1)]; }
function instAct(){ return POR_ID[PAN.inst] || INSTRS[0] || { base: 48, sost: 0 }; }

/* ── CUÁNTOS ESCALONES TIENE EL PANEL ──
   Los grados de la escala por las octavas, MÁS UNO: la tónica de arriba es la
   que cierra el alcance. Sin ese uno, el panel termina en el grado anterior y
   deslizar hasta el borde no llega nunca a la octava. */
function nGrados(){ return escAct().g.length*PAN.oct + 1; }

function midiDeIdx(i){
  const E = escAct(), L = E.g.length;
  const n = nGrados();
  i = cl(Math.round(i), 0, n - 1);
  const o = Math.floor(i/L), d = i - o*L;
  return instAct().base + PAN.tono + o*12 + E.g[d];
}

/* la altura del dedo, de 0 abajo a 1 arriba, cae en el escalón más cercano */
function idxDeAlt(a){ return Math.round(cl(a, 0, 1)*(nGrados() - 1)); }
function altDeIdx(i){ const n = nGrados(); return n > 1 ? cl(i, 0, n - 1)/(n - 1) : 0.5; }

/* el nombre de la nota, para la línea guía */
function nombreDeIdx(i){ const m = midiDeIdx(i); return NOTA_NOM[((m % 12) + 12) % 12]; }

/* ── EL COLOR SALE DE LA ALTURA ──
   Sobre negro, un arcoíris entero pasa por verdes que se ensucian. De cian a
   magenta pasando por azul y violeta es frío-a-caliente sin salir de la familia
   que un panel negro aguanta. */
function matizDe(a){ return 195 + cl(a, 0, 1)*145; }

/* el eje horizontal es la segunda dimensión: a la izquierda tapado y suave, a
   la derecha abierto y fuerte */
function volDeX(x){ return 0.30 + 0.70*cl(x, 0, 1); }
function briDeX(x){ return 0.20 + 0.80*cl(x, 0, 1); }

/* ══════════ LOS DEDOS ══════════ */
const DEDOS = {};              /* id de puntero -> dedo vivo */
const ONDAS = [];              /* aros que se abren y se apagan */

function onda(nx, na, k){
  ONDAS.push({ nx, na, t: 0, vida: 0.90, k: k === undefined ? 1 : k });
  while (ONDAS.length > 48) ONDAS.shift();
}

function dedoAbajo(id, nx, na){
  const lib = libreAct(), i = idxDeAlt(na);
  const a = lib ? cl(na, 0, 1) : altDeIdx(i);
  const midi = lib ? midiDeAlt(na) : midiDeIdx(i);
  const vol = volDeX(nx), bri = briDeX(nx);
  const v = abre(PAN.inst, midi, vol, bri);
  DEDOS[id] = { nx, na, a, midi, idx: i, v, vol, bri, t: 0, hist: [{ nx, na: a, t: 0 }] };
  onda(nx, a, 1);
  juegoToque(i);
  return DEDOS[id];
}

/* ── MOVER NO VUELVE A DISPARAR LA NOTA, LA EMPUJA ──
   Ésa es toda la mecánica: el dedo sigue apoyado, la voz sigue viva, y lo único
   que cambia es hacia dónde apunta. Y por lo mismo, deslizar NO cuenta como una
   nota nueva en REPETÍ: si contara, corregir sería perder. */
function dedoMueve(id, nx, na){
  const d = DEDOS[id]; if (!d) return;
  const lib = libreAct(), i = idxDeAlt(na);
  d.nx = nx; d.na = na;
  d.vol = volDeX(nx); d.bri = briDeX(nx);
  const a = lib ? cl(na, 0, 1) : altDeIdx(i);
  d.midi = lib ? midiDeAlt(na) : midiDeIdx(i);
  /* el rastro es DÓNDE ESTUVO EL DEDO, o sea un hecho del panel y no del dibujo:
     por eso vive acá y se puede auditar sin abrir un navegador */
  d.hist.push({ nx, na: a, t: 0 });
  while (d.hist.length > 26) d.hist.shift();
  /* ── EN LIBRE EL ARO SALE CADA TANTOS SEMITONOS, NO EN CADA CUADRO ──
     Uno por muestra serían sesenta aros por segundo, o sea una mancha; uno cada
     semitono deja el mismo rastro que en snap y dice cuánto se recorrió. */
  if (lib){ if (Math.abs(d.midi - (d.ondaMidi === undefined ? d.midi - 9 : d.ondaMidi)) >= 1){ d.ondaMidi = d.midi; onda(nx, a, 0.62); } }
  else if (i !== d.idx){ onda(nx, a, 0.62); }
  d.idx = i; d.a = a;
  mueve(d.v, d.midi, d.vol, d.bri);
}

function dedoArriba(id){
  const d = DEDOS[id]; if (!d) return;
  apaga(d.v);
  delete DEDOS[id];
}

function dedosSoltar(){ for (const k of Object.keys(DEDOS)) dedoArriba(k); }
function nDedos(){ return Object.keys(DEDOS).length; }

function panelPaso(dt){
  for (const k in DEDOS){
    const d = DEDOS[k];
    d.t += dt;
    for (let i = d.hist.length - 1; i >= 0; i--){
      d.hist[i].t += dt;
      if (d.hist[i].t > 0.40 && i < d.hist.length - 1) d.hist.splice(i, 1);
    }
  }
  for (let i = ONDAS.length - 1; i >= 0; i--){
    const o = ONDAS[i]; o.t += dt;
    if (o.t >= o.vida) ONDAS.splice(i, 1);
  }
}

/* ══════════════════════ REPETÍ ══════════════════════
   Suena una secuencia de notas y hay que repetirla tocando el panel a la misma
   altura. Cada ronda agrega una.

   ── LA ESCALA ES LA DIFICULTAD, Y NO HACE FALTA UNA PERILLA MÁS ──
   Con la pentatónica el panel tiene once escalones de ochenta píxeles; con la
   cromática tiene veinticinco de treinta y cinco. La misma secuencia se vuelve
   mucho más difícil sin cambiar una sola regla. */
const JU_ANTES = 0.65, JU_ON = 0.40, JU_HUECO = 0.18, JU_TRAS = 0.60;

const JU = { on: false, fase: 'espera', ronda: 0, sec: [], paso: 0, i: -1, t: 0,
             rec: 0, luz: -1, luzT: 0 };

function juegoArranca(){
  sem((Date.now() & 0x7fffffff) || 1);
  JU.on = true; JU.ronda = 0; JU.sec = []; JU.paso = 0; JU.rec = leeN('rec', 0);
  JU.luz = -1; JU.luzT = 0;
  rondaNueva();
}
function juegoCorta(){ JU.on = false; JU.fase = 'espera'; }

function rondaNueva(){
  JU.ronda++;
  const n = nGrados();
  let x = azi(0, n - 1), g = 0;
  /* dos veces la misma nota seguida no se distingue de una sola sostenida */
  while (JU.sec.length && x === JU.sec[JU.sec.length - 1] && g++ < 24) x = azi(0, n - 1);
  JU.sec.push(x);
  JU.paso = 0; JU.i = -1; JU.t = -JU_ANTES; JU.fase = 'muestra';
}

function juegoPaso(dt){
  if (!JU.on) return;
  JU.t += dt;
  if (JU.luzT > 0){ JU.luzT -= dt; if (JU.luzT <= 0) JU.luz = -1; }
  if (JU.fase === 'muestra'){
    const per = JU_ON + JU_HUECO;
    while (JU.i < JU.sec.length - 1 && JU.t >= (JU.i + 1)*per){
      JU.i++;
      const idx = JU.sec[JU.i];
      pico(PAN.inst, midiDeIdx(idx), JU_ON, 0.78);
      onda(0.5, altDeIdx(idx), 1);
      JU.luz = idx; JU.luzT = JU_ON;
    }
    if (JU.i >= JU.sec.length - 1 && JU.t >= JU.sec.length*per){
      JU.fase = 'turno'; JU.paso = 0;
    }
  } else if (JU.fase === 'bien'){
    if (JU.t >= JU_TRAS) rondaNueva();
  }
}

/* devuelve true si el toque contó y era el correcto */
function juegoToque(idx){
  if (!JU.on || JU.fase !== 'turno') return false;
  if (idx === JU.sec[JU.paso]){
    JU.paso++;
    if (JU.paso >= JU.sec.length){
      if (JU.ronda > JU.rec){ JU.rec = JU.ronda; guarda('rec', JU.rec); }
      JU.fase = 'bien'; JU.t = 0;
      /* la tónica dos octavas arriba, floja: dice «esa era» sin taparla */
      pico(PAN.inst, midiDeIdx(nGrados() - 1) + 12, 0.5, 0.30);
    }
    return true;
  }
  JU.fase = 'fin'; JU.t = 0;
  /* una segunda menor abajo de todo: eso no se puede leer como otra cosa */
  pico(PAN.inst, midiDeIdx(0) - 5, 0.9, 0.85);
  pico(PAN.inst, midiDeIdx(0) - 4, 0.9, 0.85);
  return false;
}
