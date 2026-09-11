/* ══════════════════════ EL SECUENCIADOR ══════════════════════
   La grilla, el reloj y la grabación.

   ── EL RELOJ ES EL DE AUDIO, Y SE PLANIFICA CON ANTICIPACIÓN ──
   Un `requestAnimationFrame` se atrasa cuando el navegador pierde cuadros y se
   PARA en segundo plano: un ritmo colgado de ahí se arrastra. Cada 25 ms se
   agendan todos los pasos que caen en los próximos 120 ms sobre
   `AudioContext.currentTime`, que es el único reloj que no se corre. */

const SEC = {
  bpm: BPM_DEF, compases: COMPASES_DEF,
  pistas: {}, mudas: {},
  tocando: false, t0: 0, pasoProx: 0, tProx: 0,
  estado: 'quieto',            /* quieto · cuenta · grabando */
  modo: null,                  /* percu · melo */
  tG0: 0, pasoVer: 0,
  inst: 'acoustic_grand_piano',
  esc: 1, tonica: 0, metro: true, retardo: 0.030, sens: 1,
  ultResumen: null
};
const CAP = { golpes: [], tono: [] };
let AGENDA = null;

function secPasos(){ return SEC.compases*PASOS_COMPAS; }
function segPaso(){ return 60/SEC.bpm/4; }
function segVuelta(){ return segPaso()*secPasos(); }

function secLimpiaTodo(){
  for (const p of PISTAS){
    SEC.pistas[p.id] = new Array(secPasos()).fill(0);
    if (SEC.mudas[p.id] === undefined) SEC.mudas[p.id] = false;
  }
}
function secRedimensiona(n){
  const viejo = SEC.pistas, vp = viejo.bombo ? viejo.bombo.length : 0;
  SEC.compases = cl(n, 1, 4);
  const np = secPasos();
  for (const p of PISTAS){
    const a = new Array(np).fill(0), b = viejo[p.id] || [];
    /* al agrandar se repite lo que había, que es lo que uno espera de un loop */
    for (let i = 0; i < np; i++) a[i] = vp ? b[i % vp] : 0;
    SEC.pistas[p.id] = a;
  }
}
secLimpiaTodo();

/* ══════════ TRANSPORTE ══════════ */
function secPlay(){
  if (!audioDespierta()) return false;
  if (SEC.tocando) return true;
  SEC.tocando = true;
  SEC.pasoProx = 0;
  SEC.t0 = AC.currentTime + 0.10;
  SEC.tProx = SEC.t0;
  if (!AGENDA) AGENDA = setInterval(secAgenda, 25);
  secAgenda();
  return true;
}
function secStop(){
  SEC.tocando = false;
  if (AGENDA){ clearInterval(AGENDA); AGENDA = null; }
  if (SEC.estado !== 'quieto') secCorta();
}
function secPasoAhora(){
  if (!SEC.tocando || !AC) return 0;
  const d = AC.currentTime - SEC.t0;
  if (d < 0) return 0;
  return Math.floor(d/segPaso()) % secPasos();
}
function secVuelta(){
  if (!SEC.tocando || !AC) return 0;
  return Math.floor(Math.max(0, AC.currentTime - SEC.t0)/segVuelta());
}

const LOOK = 0.12;
function secAgenda(){
  if (!SEC.tocando || !AC) return;
  const sp = segPaso(), np = secPasos();
  let n = 0;
  while (SEC.tProx < AC.currentTime + LOOK && n++ < 64){
    secDispara(SEC.pasoProx, SEC.tProx);
    /* ── LA GRABACIÓN EMPIEZA EN EL PASO CERO, NO CUANDO SE APRETÓ ──
       Así el compás que falta hasta que la vuelta cierra ES la cuenta regresiva,
       sin una máquina de estados aparte, y lo grabado arranca en el uno. */
    if (SEC.estado === 'cuenta' && SEC.pasoProx === 0){
      SEC.estado = 'grabando'; SEC.tG0 = SEC.tProx;
      CAP.golpes.length = 0; CAP.tono.length = 0;
    } else if (SEC.estado === 'grabando' && SEC.pasoProx === 0 && SEC.tProx > SEC.tG0 + 0.001){
      secCierra();
    }
    SEC.pasoProx = (SEC.pasoProx + 1) % np;
    SEC.tProx += sp;
  }
}

function secDispara(p, t){
  for (const q of PISTAS){
    const v = SEC.pistas[q.id][p];
    if (!v || SEC.mudas[q.id]) continue;
    if (q.perc) golpe(q.id, t, 1);
    else {
      /* ── UNA NOTA REPETIDA EN PASOS SEGUIDOS ES UNA NOTA LARGA ──
         Disparándola en cada paso, un tarareo sostenido sale ametrallado. */
      const ant = SEC.pistas.melo[(p - 1 + secPasos()) % secPasos()];
      if (ant === v && p !== 0) continue;
      let dur = 1, np = secPasos();
      while (dur < np && SEC.pistas.melo[(p + dur) % np] === v) dur++;
      nota(SEC.inst, v, t, dur*segPaso()*0.94, 0.70);
    }
  }
  if (SEC.metro || SEC.estado !== 'quieto'){
    if (p % 16 === 0) golpe('clickF', t, 1);
    else if (p % 4 === 0) golpe('click', t, 1);
  }
}

/* ══════════ GRABAR ══════════ */
function secGraba(modo){
  if (!audioDespierta()) return false;
  if (SEC.estado !== 'quieto'){ secCorta(); return false; }
  if (!SEC.tocando) secPlay();
  SEC.modo = modo; SEC.estado = 'cuenta';
  CAP.golpes.length = 0; CAP.tono.length = 0;
  if (oidoListo()) oidoCalibra();
  return true;
}
function secCorta(){ SEC.estado = 'quieto'; SEC.modo = null; }

/* lo llama el bucle de dibujo con lo que el oído leyó en ese cuadro */
function secOye(o){
  if (!o || SEC.estado !== 'grabando') return;
  if (SEC.modo === 'percu'){
    if (o.onset && o.tipo) CAP.golpes.push({ t: o.t, tipo: o.tipo, G: o.G, A: o.A });
  } else if (o.midi !== null){
    CAP.tono.push({ t: o.t, midi: o.midi, cl: o.claridad, rms: o.rms });
  }
}

/* ══════════ DE LO OÍDO A LA GRILLA ══════════
   ── LA CUANTIZACIÓN ES LO QUE CONVIERTE UN TARAREO EN UN PATRÓN ──
   Nadie canta sobre la reja. Pegando cada golpe al dieciseisavo más cercano, un
   ritmo torcido suena a máquina; y de paso el jitter del detector —que a sesenta
   cuadros son dieciséis milisegundos— deja de importar, porque un paso a 96 BPM
   dura ciento cincuenta y seis. */
function pasoDe(t){
  const sp = segPaso(), np = secPasos();
  return ((Math.round((t - SEC.retardo - SEC.tG0)/sp) % np) + np) % np;
}
function secCierra(){
  const np = secPasos(), res = { modo: SEC.modo, golpes: 0, notas: 0, por: {} };
  if (SEC.modo === 'percu'){
    for (const g of CAP.golpes){
      const p = pasoDe(g.t);
      if (!SEC.pistas[g.tipo]) continue;
      SEC.pistas[g.tipo][p] = 1;
      res.por[g.tipo] = (res.por[g.tipo] || 0) + 1;
      res.golpes++;
    }
  } else {
    const sp = segPaso(), cubos = [];
    for (let i = 0; i < np; i++) cubos.push([]);
    for (const f of CAP.tono){
      if (f.cl < 0.60) continue;
      const d = f.t - SEC.retardo - SEC.tG0;
      if (d < -sp*0.5) continue;
      const p = ((Math.floor(d/sp) % np) + np) % np;
      cubos[p].push(f.midi);
    }
    const nuevo = new Array(np).fill(0);
    /* cuántas lecturas caben en un paso: pedir casi la mitad es lo que separa una
       nota cantada de un chasquido que dejó dos lecturas con tono. Sale del ritmo
       del oído y no de un número a mano — con un 45 escrito ahí, cambiar ese
       ritmo dejaría el filtro pidiendo una fracción distinta sin que nada avise */
    const porPaso = sp*1000/OIDO_MS;
    const espera = Math.max(2, Math.round(porPaso*0.45));
    for (let i = 0; i < np; i++){
      const c = cubos[i];
      if (c.length < espera) continue;
      c.sort((a, b) => a - b);
      const med = c[Math.floor(c.length/2)];
      nuevo[i] = aEscala(med, SEC.esc, SEC.tonica);
      res.notas++;
    }
    SEC.pistas.melo = nuevo;
  }
  SEC.estado = 'quieto'; SEC.modo = null;
  SEC.ultResumen = res;
  return res;
}

/* ══════════ EDICIÓN A MANO ══════════
   La detección nunca sale perfecta, y sin poder corregir un golpe la frustración
   es total: la grilla es tocable y eso es la mitad del programa. */
function secToca(pista, paso){
  const a = SEC.pistas[pista]; if (!a || paso < 0 || paso >= a.length) return null;
  if (pista === 'melo'){
    if (a[paso]) a[paso] = 0;
    else {
      let m = 0;
      for (let k = 1; k < a.length; k++){ const q = a[(paso - k + a.length) % a.length]; if (q){ m = q; break; } }
      a[paso] = m || 60;
      if (AC && !SEC.tocando) nota(SEC.inst, a[paso], AC.currentTime + 0.01, 0.25, 0.7);
    }
  } else {
    a[paso] = a[paso] ? 0 : 1;
    if (a[paso] && AC && !SEC.tocando) golpe(pista, AC.currentTime + 0.01, 1);
  }
  return a[paso];
}
function secTranspone(n){
  const a = SEC.pistas.melo;
  for (let i = 0; i < a.length; i++) if (a[i]) a[i] = cl(a[i] + n, 24, 96);
}
function secBorra(pista){ const a = SEC.pistas[pista]; if (a) a.fill(0); }
function secMuda(pista){ SEC.mudas[pista] = !SEC.mudas[pista]; return SEC.mudas[pista]; }
function secVacio(){ return PISTAS.every(p => SEC.pistas[p.id].every(v => !v)); }
/* un ritmo de arranque: bombo en los tiempos fuertes, caja en el dos y el
   cuatro, charles en las corcheas y cuatro notas de una pentatónica menor —
   o sea lo mínimo que se lee como música y no como casillas al azar */
function secDemo(){
  secLimpiaTodo();
  const np = secPasos();
  for (let i = 0; i < np; i++){
    const q = i % 16;
    if (q === 0 || q === 6 || q === 10) SEC.pistas.bombo[i] = 1;
    if (q === 4 || q === 12) SEC.pistas.caja[i] = 1;
    if (q % 2 === 0) SEC.pistas.charles[i] = 1;
  }
  const mel = [[0, 60], [4, 63], [8, 67], [12, 65]];
  for (let c = 0; c < np/16; c++) for (const [q, m] of mel) SEC.pistas.melo[c*16 + q] = m + (c % 2 ? 0 : 0);
}
