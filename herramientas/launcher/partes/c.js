/* ══════════════════════ EL FONDO ══════════════════════
   Frutiger Aero: cielo saturado, luz volumétrica, burbujas con brillo, hojas y
   agua. Todo dibujado por código — un fondo de pantalla es una foto que pesa
   megas, se ve igual siempre y no puede cambiar con la hora.

   ── LO QUE NO SE MUEVE SE DIBUJA UNA VEZ ──
   El cielo, las nubes y el agua se pintan en un lienzo aparte y sólo se rehacen
   cuando cambia el minuto o el tamaño de la pantalla. Por cuadro se COPIA, que
   es una operación y no cuarenta degradados. Sin esto, cada cuadro son unos
   treinta `createRadialGradient` a pantalla completa.

   ── Y EL FONDO CORRE A 30 Y NO A 60, A PROPÓSITO ──
   Cada pieza de vidrio tiene `backdrop-filter`: el compositor tiene que recortar
   lo de atrás, desenfocarlo, saturarlo y —en las refractadas— desplazarlo, CADA
   VEZ QUE EL FONDO CAMBIA. Con burbujas que suben cinco píxeles por segundo,
   treinta cuadros no se distinguen de sesenta y el filtro se paga la mitad de
   las veces. */

let LZ, CX, ANC = 0, ALT = 0, PXR = 1;
let FONDO = null, FCX = null, FONDO_MIN = -1;
/* -1 = la hora de verdad. La sonda la fija para fotografiar los ocho cielos. */
let HORA_FIJA = -1;
let SPR_BUR = null, SPR_HOJA = null, SPR_DEST = null;
const BUR = [], HOJ = [], DEST = [];
let CAL = 1;                    /* 1 = todo · 0.6 = menos piezas · 0.35 = mínimo */
let T0 = 0, TPREV = 0, ACUM = 0, CORRE = true;
const FPS_FONDO = 30;

/* ── EL CIELO CAMBIA CON LA HORA DE VERDAD ──
   Es la mitad de lo que hace que un escritorio se sienta vivo, y sale gratis:
   son cuatro paletas y una interpolación. */
const CIELOS = [
  { h: 0,  c: ['#050f2e','#0a1f4a','#123a6b','#1d5484'], sol: '#7fb0e8', luz: .18, est: 1 },
  /* ── EL TRAMO DE MADRUGADA NECESITA UN PUNTO EN EL MEDIO ──
     Con un solo salto de 0 a 5 la interpolación es lineal, así que a las 2 de
     la mañana el cielo ya iba al 40% del amanecer: medido, el borde de abajo
     daba rgb(108,112,122), un gris de las seis y media. La madrugada es plana
     y el amanecer pasa en una hora, así que hace falta el punto de las 4. */
  { h: 4,  c: ['#071335','#0d244f','#153f6f','#215a89'], sol: '#87b6ea', luz: .20, est: .96 },
  { h: 5,  c: ['#182a52','#4a3a6b','#a55a72','#e39a6a'], sol: '#ffd9a0', luz: .42, est: .35 },
  { h: 7,  c: ['#1d6fc0','#3f9fdc','#7fcbef','#c6ecfb'], sol: '#fff6d8', luz: .80, est: 0 },
  { h: 12, c: ['#1466bd','#3aa3e0','#7ed3f2','#d5f2fd'], sol: '#ffffff', luz: 1.0, est: 0 },
  { h: 17, c: ['#1b5fa8','#4f9ad2','#9ec9e8','#f0d9b8'], sol: '#fff0c8', luz: .82, est: 0 },
  { h: 19, c: ['#26315e','#7a4a78','#d4746a','#f6b073'], sol: '#ffc48a', luz: .46, est: .25 },
  { h: 21, c: ['#080f30','#101f48','#16345f','#1e4a75'], sol: '#8fb8e8', luz: .20, est: .9 },
  { h: 24, c: ['#050f2e','#0a1f4a','#123a6b','#1d5484'], sol: '#7fb0e8', luz: .18, est: 1 }
];
function mezclaHex(a, b, k){
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa>>16)&255) + (((pb>>16)&255) - ((pa>>16)&255))*k);
  const g = Math.round(((pa>>8)&255) + (((pb>>8)&255) - ((pa>>8)&255))*k);
  const z = Math.round((pa&255) + ((pb&255) - (pa&255))*k);
  return 'rgb(' + r + ',' + g + ',' + z + ')';
}
/* el argumento son HORAS, de 0 a 24 — no una fracción del día. Se llamaba
   `hFrac` y eso ya costó una medición: la sonda le pasó `h/24` y el mediodía
   devolvió el cielo de las dos de la mañana, con las estrellas en 0,93. */
function cieloDe(hora){
  let i = 0;
  while (i < CIELOS.length - 2 && CIELOS[i+1].h <= hora) i++;
  const a = CIELOS[i], b = CIELOS[i+1];
  const k = cl((hora - a.h)/Math.max(.001, b.h - a.h), 0, 1);
  return { c: a.c.map((x, j) => mezclaHex(x, b.c[j], k)),
           sol: mezclaHex(a.sol, b.sol, k),
           luz: a.luz + (b.luz - a.luz)*k,
           est: a.est + (b.est - a.est)*k };
}

/* azar con semilla: el cielo tiene que ser EL MISMO al volver al escritorio, y
   con Math.random las nubes se reparten distinto cada vez que se repinta */
function rnd(s){ let x = s; return () => { x = (x*1664525 + 1013904223) >>> 0; return x/4294967296; }; }

/* ══════════ LOS SPRITES ══════════
   Una burbuja son tres degradados radiales. Con cuarenta en pantalla a sesenta
   cuadros eso son siete mil degradados por segundo; dibujada UNA vez en un
   lienzo de 128 px y copiada escalada, son cuarenta `drawImage`. */
function spriteBurbuja(){
  const n = 128, c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d'), r = n/2 - 2;
  /* el cuerpo: casi transparente en el medio, porque una burbuja es una cáscara */
  let g = x.createRadialGradient(n/2, n/2, r*0.22, n/2, n/2, r);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(.72, 'rgba(190,240,255,.07)');
  g.addColorStop(.93, 'rgba(215,250,255,.30)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(n/2, n/2, r, 0, 7); x.fill();
  /* el borde iridiscente: es lo que la separa de un círculo blanco */
  x.globalCompositeOperation = 'lighter';
  for (const [ang, col] of [[.7,'rgba(120,255,220,.55)'],[2.4,'rgba(255,170,240,.42)'],
                            [4.1,'rgba(150,200,255,.50)'],[5.4,'rgba(255,240,160,.34)']]){
    const gx = n/2 + Math.cos(ang)*r*.82, gy = n/2 + Math.sin(ang)*r*.82;
    const q = x.createRadialGradient(gx, gy, 0, gx, gy, r*.55);
    q.addColorStop(0, col); q.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = q; x.beginPath(); x.arc(n/2, n/2, r, 0, 7); x.fill();
  }
  /* el reflejo especular: el punto que dice de dónde viene la luz */
  const sx = n*.36, sy = n*.30;
  let s = x.createRadialGradient(sx, sy, 0, sx, sy, r*.34);
  s.addColorStop(0, 'rgba(255,255,255,.95)'); s.addColorStop(.5, 'rgba(255,255,255,.28)');
  s.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = s; x.beginPath(); x.arc(sx, sy, r*.34, 0, 7); x.fill();
  /* y un contraluz abajo, chico: sin él la esfera se lee a disco */
  s = x.createRadialGradient(n*.63, n*.74, 0, n*.63, n*.74, r*.22);
  s.addColorStop(0, 'rgba(255,255,255,.42)'); s.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = s; x.beginPath(); x.arc(n*.63, n*.74, r*.22, 0, 7); x.fill();
  return c;
}
function spriteHoja(){
  const n = 96, c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(n*.2, n*.1, n*.8, n*.9);
  g.addColorStop(0, 'rgba(190,245,120,.92)');
  g.addColorStop(.5, 'rgba(126,211,33,.86)');
  g.addColorStop(1, 'rgba(74,158,40,.80)');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(n*.5, n*.06);
  x.bezierCurveTo(n*.94, n*.30, n*.90, n*.74, n*.5, n*.96);
  x.bezierCurveTo(n*.10, n*.74, n*.06, n*.30, n*.5, n*.06);
  x.fill();
  /* la nervadura y el brillo: una hoja plana de un color se lee a gota verde */
  x.strokeStyle = 'rgba(255,255,255,.42)'; x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(n*.5, n*.10); x.lineTo(n*.5, n*.92); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 1.1;
  for (let i = 1; i <= 5; i++){
    const y = n*(.16 + i*.13);
    x.beginPath(); x.moveTo(n*.5, y); x.lineTo(n*.5 + n*.24, y + n*.07); x.stroke();
    x.beginPath(); x.moveTo(n*.5, y); x.lineTo(n*.5 - n*.24, y + n*.07); x.stroke();
  }
  const b = x.createLinearGradient(n*.3, n*.15, n*.55, n*.5);
  b.addColorStop(0, 'rgba(255,255,255,.34)'); b.addColorStop(1, 'rgba(255,255,255,0)');
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = b; x.fillRect(0, 0, n, n);
  return c;
}
function spriteDestello(){
  const n = 64, c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(n/2, n/2, 0, n/2, n/2, n/2);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(.25, 'rgba(210,245,255,.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, n, n);
  return c;
}

/* ══════════ EL LIENZO DEL FONDO ══════════ */
function pintaFondo(){
  if (!FONDO) return;
  const W = FONDO.width, H = FONDO.height, x = FCX;
  const d = new Date();
  const hf = HORA_FIJA >= 0 ? HORA_FIJA : d.getHours() + d.getMinutes()/60;
  const C = cieloDe(hf);
  x.clearRect(0, 0, W, H);

  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.c[0]); g.addColorStop(.34, C.c[1]);
  g.addColorStop(.66, C.c[2]); g.addColorStop(1, C.c[3]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  const R = rnd(20260906);

  /* estrellas, sólo de noche */
  if (C.est > 0.02){
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++){
      const px = R()*W, py = R()*H*.62, r = .6 + R()*1.5;
      x.globalAlpha = C.est*(.25 + R()*.6);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    x.globalAlpha = 1;
  }

  /* el sol o la luna, con su halo */
  const solX = W*.74, solY = H*.13;
  x.globalCompositeOperation = 'lighter';
  let h = x.createRadialGradient(solX, solY, 0, solX, solY, W*.62);
  h.addColorStop(0, 'rgba(255,255,255,' + (.42*C.luz + .10).toFixed(3) + ')');
  h.addColorStop(.18, 'rgba(255,250,220,' + (.17*C.luz + .04).toFixed(3) + ')');
  h.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = h; x.fillRect(0, 0, W, H);
  h = x.createRadialGradient(solX, solY, 0, solX, solY, W*.085);
  h.addColorStop(0, C.sol); h.addColorStop(.42, 'rgba(255,255,255,.30)');
  h.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = h; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';

  /* ── LAS NUBES SON MANCHAS BLANDAS Y SIN BORDE ──
     Una elipse blanca tiene contorno y se lee a mancha de pintura. Cada nube son
     seis a nueve bolas con degradado radial que se superponen, que es lo que le
     da el borde deshilachado. */
  const nubes = Math.round(9*CAL) + 3;
  for (let i = 0; i < nubes; i++){
    const cx = R()*W*1.2 - W*.1, cy = H*(.05 + R()*.44);
    const s = (.10 + R()*.16)*W, op = (.30 + R()*.42)*(.45 + C.luz*.55);
    for (let k = 0; k < 7; k++){
      const ox = cx + (R() - .5)*s*1.7, oy = cy + (R() - .5)*s*.42;
      const rr = s*(.32 + R()*.42);
      const q = x.createRadialGradient(ox, oy - rr*.2, 0, ox, oy, rr);
      q.addColorStop(0, 'rgba(255,255,255,' + (op*.85).toFixed(3) + ')');
      q.addColorStop(.55, 'rgba(248,253,255,' + (op*.42).toFixed(3) + ')');
      q.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = q; x.beginPath(); x.arc(ox, oy, rr, 0, 7); x.fill();
    }
  }

  /* ── EL AGUA CIERRA EL CUADRO POR ABAJO ──
     Sin ella el degradado del cielo llega hasta el borde y se lee a papel
     pintado. Con una banda de agua, las burbujas tienen de dónde salir. */
  const aguaY = H*.80;
  const ag = x.createLinearGradient(0, aguaY, 0, H);
  ag.addColorStop(0, 'rgba(30,140,190,.30)');
  ag.addColorStop(.35, 'rgba(20,110,175,.55)');
  ag.addColorStop(1, 'rgba(8,58,110,.80)');
  x.fillStyle = ag; x.fillRect(0, aguaY, W, H - aguaY);
  /* las crestas: líneas horizontales que se acortan y se separan con la
     distancia, que es lo que da la perspectiva de una superficie */
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++){
    const t = i/26, y = aguaY + Math.pow(t, 1.7)*(H - aguaY);
    const largo = W*(.10 + R()*.34), px = R()*W;
    x.globalAlpha = (.05 + R()*.13)*(.4 + C.luz*.6);
    x.fillStyle = '#dff6ff';
    x.fillRect(px, y, largo, 1 + t*2.2);
  }
  x.globalAlpha = 1;
  /* el reflejo del sol sobre el agua */
  const rg = x.createLinearGradient(solX, aguaY, solX, H);
  rg.addColorStop(0, 'rgba(255,250,220,' + (.30*C.luz).toFixed(3) + ')');
  rg.addColorStop(1, 'rgba(255,250,220,0)');
  x.fillStyle = rg;
  x.beginPath(); x.moveTo(solX - W*.05, aguaY); x.lineTo(solX + W*.05, aguaY);
  x.lineTo(solX + W*.20, H); x.lineTo(solX - W*.20, H); x.closePath(); x.fill();
  x.globalCompositeOperation = 'source-over';

  FONDO_MIN = HORA_FIJA >= 0 ? -2 - Math.round(HORA_FIJA*60) : d.getHours()*60 + d.getMinutes();
}

/* ══════════ LAS PIEZAS QUE SE MUEVEN ══════════ */
function siembra(){
  BUR.length = 0; HOJ.length = 0; DEST.length = 0;
  const nb = Math.round(26*CAL), nh = Math.round(9*CAL), nd = Math.round(14*CAL);
  for (let i = 0; i < nb; i++) BUR.push(nuevaBur(true));
  for (let i = 0; i < nh; i++) HOJ.push(nuevaHoja(true));
  for (let i = 0; i < nd; i++) DEST.push({ x: Math.random(), y: Math.random()*.7,
    r: .004 + Math.random()*.012, f: .3 + Math.random()*1.1, p: Math.random()*7 });
}
function nuevaBur(inicial){
  return { x: Math.random(), y: inicial ? Math.random()*1.15 : 1.06 + Math.random()*.2,
           r: .012 + Math.random()*.055, v: .020 + Math.random()*.055,
           d: (Math.random() - .5)*.05, f: .25 + Math.random()*.75, p: Math.random()*7,
           o: .35 + Math.random()*.55 };
}
function nuevaHoja(inicial){
  return { x: Math.random(), y: inicial ? Math.random() : -.15,
           s: .022 + Math.random()*.032, v: .018 + Math.random()*.032,
           d: (Math.random() - .5)*.06, a: Math.random()*7, va: (Math.random() - .5)*1.1,
           f: .3 + Math.random()*.8, p: Math.random()*7, o: .30 + Math.random()*.34 };
}

function fondoMide(){
  const c = $('#lienzo');
  LZ = c; CX = c.getContext('2d', { alpha: false });
  /* ── EL PIXEL RATIO SE TOPA, Y ACÁ MÁS QUE EN NINGÚN LADO ──
     Un teléfono de 3x con pantalla completa son doce millones de píxeles por
     cuadro, y encima cada `backdrop-filter` los vuelve a leer. Con 1,5 el
     degradado del cielo se ve exactamente igual: no hay un solo borde nítido en
     todo el fondo. */
  PXR = Math.min(1.5, window.devicePixelRatio || 1);
  ANC = Math.max(1, Math.round(innerWidth)); ALT = Math.max(1, Math.round(innerHeight));
  c.width = Math.round(ANC*PXR); c.height = Math.round(ALT*PXR);
  c.style.width = ANC + 'px'; c.style.height = ALT + 'px';
  CX.setTransform(PXR, 0, 0, PXR, 0, 0);

  /* ── EL FONDO FIJO TRABAJA EN PÍXELES DE VERDAD, SIN TRANSFORMACIÓN ──
     `pintaFondo()` toma W y H de `FONDO.width/height`, o sea del tamaño del
     búfer. Poniéndole encima el `setTransform(PXR…)` del lienzo de adelante, el
     cielo se dibujaría a PXR veces su tamaño y sólo entraría la esquina de
     arriba a la izquierda. Es la trampa de siempre: dos lienzos, dos unidades. */
  FONDO = document.createElement('canvas');
  FONDO.width = c.width; FONDO.height = c.height;
  FCX = FONDO.getContext('2d');
  FONDO_MIN = -1;
  pintaFondo();
}

function fondoInit(){
  SPR_BUR = spriteBurbuja(); SPR_HOJA = spriteHoja(); SPR_DEST = spriteDestello();
  fondoMide();
  siembra();
  addEventListener('resize', () => { fondoMide(); siembra(); });
}

function fondoPaso(dt, t){
  for (let i = 0; i < BUR.length; i++){
    const b = BUR[i];
    b.y -= b.v*dt; b.x += b.d*dt*.35;
    if (b.y < -.12) BUR[i] = nuevaBur(false);
  }
  for (let i = 0; i < HOJ.length; i++){
    const h = HOJ[i];
    h.y += h.v*dt; h.x += h.d*dt*.5; h.a += h.va*dt;
    if (h.y > 1.14) HOJ[i] = nuevaHoja(false);
  }
}

function fondoPinta(t){
  if (!CX || !FONDO) return;
  /* el fondo fijo se rehace cuando cambia el minuto, no por cuadro */
  const d = new Date();
  const m = HORA_FIJA >= 0 ? -2 - Math.round(HORA_FIJA*60) : d.getHours()*60 + d.getMinutes();
  if (m !== FONDO_MIN) pintaFondo();

  CX.setTransform(1, 0, 0, 1, 0, 0);
  CX.drawImage(FONDO, 0, 0);
  CX.setTransform(PXR, 0, 0, PXR, 0, 0);

  CX.globalCompositeOperation = 'lighter';

  /* ── LOS RAYOS DE LUZ ──
     Cuñas claras que salen del sol. Es lo más «Aero» que hay y cuesta cuatro
     triángulos; se apagan en la calidad mínima porque son puro relleno. */
  if (CAL > .5){
    const solX = ANC*.74, solY = ALT*.13;
    for (let i = 0; i < 5; i++){
      const a = -1.15 + i*.30 + Math.sin(t*.00013 + i)*0.045;
      const w = .045 + Math.sin(t*.00021 + i*2.1)*.022;
      const L = ALT*1.5;
      const g = CX.createLinearGradient(solX, solY, solX + Math.cos(a)*L, solY + Math.sin(a)*L);
      g.addColorStop(0, 'rgba(255,252,225,.16)');
      g.addColorStop(.45, 'rgba(220,245,255,.06)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      CX.fillStyle = g;
      CX.beginPath(); CX.moveTo(solX, solY);
      CX.lineTo(solX + Math.cos(a - w)*L, solY + Math.sin(a - w)*L);
      CX.lineTo(solX + Math.cos(a + w)*L, solY + Math.sin(a + w)*L);
      CX.closePath(); CX.fill();
    }
  }

  /* destellos: puntos de luz que laten, la mota de polvo iluminada */
  for (const q of DEST){
    const s = ANC*q.r*(1.6 + Math.sin(t*.001*q.f + q.p)*.5);
    CX.globalAlpha = .30 + Math.sin(t*.0012*q.f + q.p)*.24;
    CX.drawImage(SPR_DEST, q.x*ANC - s, q.y*ALT - s, s*2, s*2);
  }
  CX.globalAlpha = 1;
  CX.globalCompositeOperation = 'source-over';

  /* las burbujas, con su bamboleo */
  for (const b of BUR){
    const s = ANC*b.r;
    const px = (b.x + Math.sin(t*.0006*b.f + b.p)*.035)*ANC;
    CX.globalAlpha = b.o;
    CX.drawImage(SPR_BUR, px - s, b.y*ALT - s, s*2, s*2);
  }
  CX.globalAlpha = 1;

  /* las hojas van GIRANDO, que es lo que las separa de una mancha que cae */
  for (const h of HOJ){
    const s = ANC*h.s;
    const px = (h.x + Math.sin(t*.0005*h.f + h.p)*.05)*ANC;
    CX.save();
    CX.translate(px, h.y*ALT);
    CX.rotate(h.a);
    /* el aplaste simula que la hoja se da vuelta en el aire: sin esto giran como
       una calcomanía y se ve plano */
    CX.scale(1, .35 + Math.abs(Math.cos(h.a*.7))*.65);
    CX.globalAlpha = h.o;
    CX.drawImage(SPR_HOJA, -s, -s, s*2, s*2);
    CX.restore();
  }
  CX.globalAlpha = 1;
}

/* ── EL VIGÍA: SI NO LLEGA, SE BAJA SOLO ──
   Un escritorio que va a diez cuadros por segundo es peor que uno sin burbujas.
   Se mide, y si el cuadro se pasa del presupuesto se sacan piezas y se apagan
   los rayos. No hay ajuste que tocar porque nadie entra a los ajustes de su
   escritorio a bajarle los gráficos. */
let VIG_N = 0, VIG_S = 0, VIG_LISTO = 0;
function vigia(ms, ahora){
  if (ahora < VIG_LISTO) return;
  VIG_S += ms; VIG_N++;
  if (VIG_N < 60) return;
  const med = VIG_S/VIG_N; VIG_S = 0; VIG_N = 0;
  if (med > 26 && CAL > .36){ CAL = CAL > .7 ? .6 : .35; siembra(); VIG_LISTO = ahora + 3000; }
}

function fondoBucle(t){
  requestAnimationFrame(fondoBucle);
  if (!CORRE) return;
  if (!T0) { T0 = t; TPREV = t; return; }
  const dt = Math.min(.25, (t - TPREV)/1000); TPREV = t;
  ACUM += dt;
  const paso = 1/FPS_FONDO;
  if (ACUM < paso) return;
  ACUM = Math.min(ACUM - paso, paso);
  const m0 = performance.now();
  fondoPaso(paso, t);
  fondoPinta(t);
  vigia(performance.now() - m0, t);
}
