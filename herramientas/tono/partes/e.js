/* ══════════════════════ EL DIBUJO ══════════════════════
   Un panel negro con lo mínimo encima: las líneas de la escala, un aro por cada
   escalón que se cruza, y el dedo.

   ── SE BORRA ENTERO EN CADA CUADRO, Y ES UNA DECISIÓN ──
   Lo bonito sería pintar negro al 30 % encima del cuadro anterior: el rastro
   sale gratis. Pero entonces lo que se ve depende de lo que pasó antes, así que
   una captura deja de ser una medición. El rastro sale de la lista de aros y
   del recorrido guardado del dedo, que son datos y se pueden auditar. */

let LZ = null, CX = null, ANC = 0, ALT = 0, PXR = 1;

function lienzoPon(c){
  LZ = c; CX = c.getContext('2d', { alpha: false });
  lienzoMide();
}
function lienzoMide(){
  if (!LZ) return;
  const r = LZ.getBoundingClientRect();
  /* topado en 2: las líneas guía son de un píxel y a densidad 1 salen gruesas,
     pero por encima de 2 se rellena el doble para no ver un solo píxel más */
  PXR = Math.min(2, window.devicePixelRatio || 1);
  ANC = Math.max(1, Math.round(r.width));
  ALT = Math.max(1, Math.round(r.height));
  LZ.width = Math.round(ANC*PXR); LZ.height = Math.round(ALT*PXR);
  if (CX) CX.setTransform(PXR, 0, 0, PXR, 0, 0);
}

function yDeAlt(a){ return (1 - cl(a, 0, 1))*ALT; }
function col(a, l, o){ return 'hsla(' + matizDe(a).toFixed(0) + ',92%,' + l + '%,' + o + ')'; }

/* ── LAS LÍNEAS SE ENCIENDEN DONDE ESTÁ EL DEDO ──
   Todas visibles siempre es una grilla, y una grilla no es un panel negro. Al
   6 % se adivinan; cerca del dedo suben, así que la escala aparece justo cuando
   hace falta y desaparece cuando no. */
function pintaGuias(){
  const n = nGuias(), lib = libreAct(), pasoG = n > 1 ? 1/(n - 1) : 1;
  const fs = Math.max(9, Math.round(ALT*0.0145));
  CX.font = '600 ' + fs + 'px system-ui,sans-serif';
  for (let i = 0; i < n; i++){
    const a = altDeGuia(i), y = Math.round(yDeAlt(a)) + 0.5;
    const oct = esOctava(i);
    let k = oct ? 0.155 : (lib ? 0.045 : 0.070);
    /* ── LA CERCANÍA SE MIDE EN ALTURA Y NO EN ÍNDICES ──
       Así la misma cuenta vale para once escalones de escala y para veinticinco
       semitonos de la regla libre. */
    for (const id in DEDOS) k = Math.max(k, 0.60*Math.max(0, 1 - Math.abs(a - DEDOS[id].a)/(3.2*pasoG)));
    if (JU.on && JU.luz === i && !lib) k = Math.max(k, 0.85*cl(JU.luzT/JU_ON, 0, 1));
    CX.strokeStyle = col(a, oct ? 74 : 64, k);
    CX.lineWidth = oct ? 1.4 : 1;
    CX.beginPath();
    /* ── EN LIBRE LAS MARCAS SON CORTAS, Y ESA ES TODA LA DIFERENCIA ──
       Una línea que cruza la pantalla se lee a escalón: el dedo la busca. Una
       marca en el borde se lee a la marca de una regla: informa y no encierra. */
    if (lib && !oct){
      const w = ANC*0.085;
      CX.moveTo(0, y); CX.lineTo(w, y);
      CX.moveTo(ANC - w, y); CX.lineTo(ANC, y);
    } else { CX.moveTo(0, y); CX.lineTo(ANC, y); }
    CX.stroke();
    if (oct){
      /* ── LA PRIMERA Y LA ÚLTIMA CAEN EN EL BORDE ──
         Con la línea de base centrada, la mitad del nombre queda fuera de la
         pantalla: la de arriba cuelga hacia abajo y la de abajo se apoya. */
      CX.textBaseline = i === n - 1 ? 'top' : i === 0 ? 'bottom' : 'middle';
      CX.fillStyle = col(a, 74, Math.min(0.92, k + 0.12));
      CX.fillText(nombreDeGuia(i), 10, y + (i === n - 1 ? 3 : i === 0 ? -3 : 0));
    }
  }
}

function pintaOndas(){
  CX.globalCompositeOperation = 'lighter';
  const r0 = Math.min(ANC, ALT)*0.44;
  for (const o of ONDAS){
    const u = cl(o.t/o.vida, 0, 1);
    const r = 10 + r0*Math.sqrt(u)*o.k;          /* crece rápido y frena, como una onda */
    const op = (1 - u)*(1 - u)*0.80*o.k;
    if (op < 0.004) continue;
    CX.strokeStyle = col(o.na, 70, op);
    CX.lineWidth = Math.max(0.6, 4.6*(1 - u)*o.k);
    CX.beginPath(); CX.arc(o.nx*ANC, yDeAlt(o.na), r, 0, 6.2832); CX.stroke();
  }
  CX.globalCompositeOperation = 'source-over';
}

function pintaDedo(d){
  const x = d.nx*ANC, a = d.a, y = yDeAlt(a);
  CX.globalCompositeOperation = 'lighter';

  /* ── LA BARRA ES LO QUE HACE LEGIBLE LA ALTURA ──
      Un punto dice dónde está el dedo; la barra dice en qué nota cayó, que es
      lo que el jugador tiene que poder ver de reojo. */
  const g = CX.createLinearGradient(0, 0, ANC, 0);
  const cerca = col(a, 74, 0.50), lejos = col(a, 74, 0);
  g.addColorStop(0, lejos);
  g.addColorStop(cl(d.nx - 0.42, 0.001, 0.999), lejos);
  g.addColorStop(cl(d.nx, 0.002, 0.998), cerca);
  g.addColorStop(cl(d.nx + 0.42, 0.003, 1), lejos);
  g.addColorStop(1, lejos);
  CX.fillStyle = g;
  CX.fillRect(0, y - 1.5, ANC, 3);

  /* el rastro: por dónde vino el dedo */
  if (d.hist.length > 1){
    for (let i = 1; i < d.hist.length; i++){
      const p = d.hist[i - 1], q = d.hist[i];
      const op = 0.30*(1 - cl(q.t/0.40, 0, 1));
      if (op < 0.006) continue;
      CX.strokeStyle = col(q.na, 68, op);
      CX.lineWidth = 1 + 4.5*(1 - cl(q.t/0.40, 0, 1));
      CX.lineCap = 'round';
      CX.beginPath();
      CX.moveTo(p.nx*ANC, yDeAlt(p.na)); CX.lineTo(q.nx*ANC, yDeAlt(q.na));
      CX.stroke();
    }
  }

  /* el disco, con halo: el radio sale del volumen, que es el eje horizontal */
  const R = Math.min(ANC, ALT)*(0.070 + 0.060*d.vol);
  const rg = CX.createRadialGradient(x, y, 0, x, y, R);
  rg.addColorStop(0, col(a, 96, 1));
  rg.addColorStop(0.16, col(a, 80, 0.78));
  rg.addColorStop(0.42, col(a, 66, 0.30));
  rg.addColorStop(1, col(a, 60, 0));
  CX.fillStyle = rg;
  CX.beginPath(); CX.arc(x, y, R, 0, 6.2832); CX.fill();

  CX.globalCompositeOperation = 'source-over';
}

/* ── LA NOTA QUE EL JUEGO ESTÁ TOCANDO TIENE QUE VERSE, NO ADIVINARSE ──
   En REPETÍ no hay dedo, así que sin esto lo único que queda del sonido es un
   aro que se abre: hay que MIRAR a qué altura nació. El disco es el mismo que
   deja un dedo, o sea que el jugador ve exactamente lo que tiene que repetir. */
function pintaLuz(){
  if (!JU.on || JU.luz < 0 || JU.luzT <= 0) return;
  const a = altDeIdx(JU.luz), x = ANC*0.5, y = yDeAlt(a);
  const k = cl(JU.luzT/JU_ON, 0, 1);
  CX.globalCompositeOperation = 'lighter';
  const R = Math.min(ANC, ALT)*0.115*(0.55 + 0.45*k);
  const rg = CX.createRadialGradient(x, y, 0, x, y, R);
  rg.addColorStop(0, col(a, 96, k));
  rg.addColorStop(0.18, col(a, 82, 0.72*k));
  rg.addColorStop(0.46, col(a, 68, 0.26*k));
  rg.addColorStop(1, col(a, 60, 0));
  CX.fillStyle = rg;
  CX.beginPath(); CX.arc(x, y, R, 0, 6.2832); CX.fill();
  CX.fillStyle = col(a, 78, 0.34*k);
  CX.fillRect(0, y - 1.5, ANC, 3);
  CX.globalCompositeOperation = 'source-over';
}

function pinta(){
  if (!CX) return;
  CX.fillStyle = '#000';
  CX.fillRect(0, 0, ANC, ALT);
  pintaGuias();
  pintaOndas();
  pintaLuz();
  for (const id in DEDOS) pintaDedo(DEDOS[id]);
}
