/* ══════════════════ EL JUGO Y LA RACHA ══════════════════
   Lo que separa un minijuego de una demostración de una mecánica. Va en el
   núcleo y no en cada juego por la razón de siempre —cinco copias divergen— y
   porque acá hay algo más: la RACHA es una segunda capa de juego que los cinco
   heredan de una.

   ── POR QUÉ UN MULTIPLICADOR Y NO PUNTOS MÁS GRANDES ──
   Un minijuego de cuarenta segundos con un solo verbo tiene un problema de
   diseño concreto: la décima vez que hacés la cosa vale lo mismo que la
   primera, así que a los quince segundos ya sabés cuánto vas a sacar. Con el
   multiplicador la partida tiene una CURVA: los primeros cuatro aciertos valen
   uno, el quinto vale dos, y a partir de ahí cada error no cuesta un punto,
   cuesta la escalera entera. Eso convierte «tocar bien» en «no cortar la
   racha», que es una decisión aunque el verbo sea el mismo.

   Y LA VENTANA ES DE TIEMPO Y NO SÓLO DE ACIERTOS: dudar también corta. En un
   juego que se filma, eso es lo que hace que el jugador se apure. */

const COMBO = { n: 0, t: 0, mult: 1, max: 0, brillo: 0 };
const COMBO_VENT = 2.8;          /* segundos de gracia entre dos aciertos */
const COMBO_ESC = 4;             /* aciertos por escalón */
const COMBO_TOPE = 5;            /* x5 y no más: con x10 la última partida borra
                                    todas las anteriores y el récord deja de
                                    querer decir algo */

function comboCero(){
  COMBO.n = 0; COMBO.t = 0; COMBO.mult = 1; COMBO.brillo = 0;
  pintaCombo();
}
function comboSuma(){
  COMBO.n++;
  COMBO.t = COMBO_VENT;
  const m = Math.min(COMBO_TOPE, 1 + Math.floor(COMBO.n / COMBO_ESC));
  if (m !== COMBO.mult){
    COMBO.mult = m;
    COMBO.brillo = 1;
    /* el escalón suena, y suena distinto de un acierto: si sonara igual, subir
       de multiplicador no se notaría hasta mirar el número */
    son('combo');
    sacude(0.35);
  }
  if (COMBO.n > COMBO.max) COMBO.max = COMBO.n;
  pintaCombo();
}
function comboCorta(){
  if (COMBO.n === 0 && COMBO.mult === 1) return;
  COMBO.n = 0; COMBO.mult = 1; COMBO.t = 0; COMBO.brillo = 0;
  pintaCombo();
}
function comboPaso(dt){
  if (COMBO.brillo > 0) COMBO.brillo -= dt*2.2;
  if (COMBO.t <= 0) return;
  COMBO.t -= dt;
  if (COMBO.t <= 0) comboCorta();
  else if (COMBO.mult > 1) pintaCombo();
}

/* la ficha del multiplicador vive en DOM como el resto del HUD: es un número
   que tiene que quedar nítido en cualquier densidad de pantalla. Y se escribe
   sólo cuando cambia, salvo la barra de la ventana, que es un ancho. */
let _comboUlt = '';
function pintaCombo(){
  const e = $('combo');
  if (!e) return;
  const v = COMBO.mult > 1 ? ('x' + COMBO.mult) : '';
  if (v !== _comboUlt){ e.textContent = v; _comboUlt = v; e.classList.toggle('on', !!v); }
  const b = $('comboB');
  if (b) b.style.width = (COMBO.t > 0 ? (COMBO.t/COMBO_VENT*100) : 0).toFixed(0) + '%';
}

/* ── SUMAR PUNTOS PASA POR UN SOLO SITIO ──
   Acá se aplica el multiplicador, se sube la racha y sale el número flotante.
   Repartido, cada juego tendría que acordarse de las tres cosas y la primera
   que se olvide es el número, que es justo lo que hace que el punto se sienta
   ganado. */
function sumaPuntos(n, x, y){
  comboSuma();
  const g0 = n * COMBO.mult;
  PUNTOS += g0;
  if (x != null) flota('+' + g0, x, y, COMBO.mult > 1 ? '#ffd76a' : '#f2eee6',
                       COMBO.mult > 1 ? 44 : 34);
  return g0;
}

/* ══════════ PARTÍCULAS ══════════
   Con gravedad y con roce, y el color lo elige quien las tira. Son la
   diferencia entre «el bicho desapareció» y «le pegué»: sin nada, un objeto que
   se va del cuadro se lee a error de dibujo. */
const PART = [];
const PART_TOPE = 220;           /* tope duro: sin él, una racha larga en MANCHA
                                    llena el array y el cuadro se cae */
function chispas(x, y, n, col, fuerza){
  const f = fuerza || 1;
  for (let i = 0; i < n && PART.length < PART_TOPE; i++){
    const a = Math.random()*6.283, v = (90 + Math.random()*260)*f;
    PART.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v - 60*f,
                r: 3 + Math.random()*6, t: 0.38 + Math.random()*0.42, T: 0, col });
  }
}
function partPaso(dt){
  for (let i = PART.length - 1; i >= 0; i--){
    const p = PART[i];
    p.T += dt;
    if (p.T >= p.t){ PART.splice(i, 1); continue; }
    p.vy += 1500*dt;
    p.vx *= 1 - 2.2*dt;
    p.x += p.vx*dt; p.y += p.vy*dt;
  }
}

/* ══════════ NÚMEROS FLOTANTES ══════════ */
const FLOT = [];
function flota(txt, x, y, col, tam){
  if (FLOT.length > 24) FLOT.shift();
  FLOT.push({ txt, x, y, col: col || '#f2eee6', tam: tam || 34, t: 0.9, T: 0 });
}
function flotPaso(dt){
  for (let i = FLOT.length - 1; i >= 0; i--){
    const f = FLOT[i];
    f.T += dt;
    if (f.T >= f.t) FLOT.splice(i, 1);
  }
}

/* ══════════ SACUDÓN ══════════
   Se aplica SÓLO a la capa del juego y no al fondo: sacudiendo el fondo
   aparecen dos franjas negras en los bordes, y eso se ve peor que no sacudir.
   Y decae rápido: un sacudón de medio segundo no es un golpe, es un terremoto. */
let SAC = 0;
function sacude(k){ SAC = Math.min(1.4, SAC + k); }
function sacPaso(dt){ if (SAC > 0) SAC = Math.max(0, SAC - dt*4.2); }
function sacAplica(){
  if (SAC <= 0.002) return false;
  const k = SAC*SAC;               /* al cuadrado: el final del sacudón se apaga
                                      y no queda un temblor largo y parejo */
  g.save();
  g.translate((Math.random() - 0.5)*26*k, (Math.random() - 0.5)*26*k);
  return true;
}

/* los tres cosméticos van con el `dt` del reloj y no con el paso fijo: son
   dibujo, así que tienen que verse igual de suaves a 30 y a 120 cuadros. La
   ventana de la racha NO está acá — vive adentro de la simulación, porque en
   dos de los cinco juegos el multiplicador es física y no puntos. */
function jugoPaso(dt){
  partPaso(dt); flotPaso(dt); sacPaso(dt);
}
function jugoPinta(){
  for (const p of PART){
    const u = 1 - p.T/p.t;
    g.globalAlpha = Math.min(1, u*1.8);
    disco(p.x, p.y, p.r*u, p.col);
  }
  g.globalAlpha = 1;
  for (const f of FLOT){
    const u = f.T/f.t;
    g.globalAlpha = Math.min(1, (1 - u)*2.2);
    /* sube y frena: con velocidad constante se lee a texto que se desliza */
    texto(f.txt, f.x, f.y - 80*(1 - (1 - u)*(1 - u)), f.tam*(1 + 0.14*(1 - u)), f.col);
    g.globalAlpha = 1;
  }
}
function jugoCero(){ PART.length = 0; FLOT.length = 0; SAC = 0; comboCero(); }
