
/* ══════════════════════ EL DIBUJO ══════════════════════
   Todo por codigo: no hay un solo asset. Y todo late con el compas, que es lo
   que hace que un fondo plano se lea a pista de baile y no a papel tapiz.
   El pulso sale del MISMO numero que coloca los obstaculos, asi que la imagen y
   la musica no pueden desincronizarse. */
const cv = $('cv'), cx = cv.getContext('2d');
let ANCHO = 0, ALTO = 0, ESC = 1, U = 20;   /* U = pixeles por bloque */
const PART = [];

function mide(){
  /* ── EL MARCO SE GIRA SI LA PANTALLA ES VERTICAL ──
     Y adentro va todo, asi que el HUD y los menus quedan alineados por
     construccion. En una pantalla apaisada no se gira nada. */
  const W = innerWidth, H = innerHeight;
  const vert = H > W;
  const m = $('marco');
  const aw = vert ? H : W, ah = vert ? W : H;
  m.className = vert ? 'girado' : 'derecho';
  m.style.width = aw + 'px'; m.style.height = ah + 'px';
  const q = CALIDADES[CALIDAD].esc;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  ANCHO = Math.round(aw*q*dpr); ALTO = Math.round(ah*q*dpr);
  cv.width = ANCHO; cv.height = ALTO;
  U = ANCHO/VISTA_ANCHO;
  ESC = q*dpr;
}
addEventListener('resize', mide);

/* la camara: el jugador va fijo a un tercio del ancho, que es lo que deja ver
   lo que viene sin dejar de ver donde se esta */
const CAM = { x: 0, y: 0 };
/* ── DONDE VA EL JUGADOR EN EL CUADRO ──
   Al 30 % jugando: deja 14 bloques de aviso, que es tres saltos y medio. Y al
   82 % en el demo del menu, porque la columna de botones vive centrada entre el
   26 % y el 74 % del ancho: con el cubo al 30 % el demo pasaba justo POR DETRAS
   de los botones y no se veia. */
let CAM_OFS = 0.30;
function ponCam(dt){
  CAM.x = JUG.x - VISTA_ANCHO*CAM_OFS;
  /* en cubo la camara casi no se mueve en vertical —si lo hiciera, el salto se
     leeria a que el mundo baja— y en nave sigue al jugador porque ahi el
     recorrido vertical es el juego */
  /* ── EN NAVE LA CAMARA NO SIGUE A LA NAVE: CENTRA EL PASILLO ──
     El pasillo entero entra en pantalla, asi que seguirla en vertical solo hace
     que las paredes se muevan y cuesten mas de leer. Y el numero no se escribe a
     mano: sale de centrar [0, ALTO_PASILLO] en la banda que `py()` deja ver, asi
     que se acomoda solo a cualquier proporcion de pantalla. */
  const obj = JUG.modo === 'nave'
    ? ALTO_PASILLO*0.5 - ALTO/(2*U) + 0.9
    : JUG.grav < 0
      ? ALTO_GRAV*0.5 - ALTO/(2*U) + 0.9
      : cl(JUG.y*0.22 - 1.6, -1.6, 5);
  CAM.y += (obj - CAM.y)*Math.min(1, dt*6);
}
const px = (x) => (x - CAM.x)*U;
const py = (y) => ALTO - (y - CAM.y)*U - U*0.9;

function pinta(){
  const N = NIVELES[MUNDO.nivel];
  const t = musTiempo();
  /* el pulso: 1 en el golpe y cae hasta el siguiente. Es la unica variable
     estetica del juego y sale del reloj de la musica. */
  const pulso = t == null ? 0 : Math.pow(1 - (((t % 1) + 1) % 1), 3);
  const c1 = N.col, c2 = N.col2;

  /* ── EL FONDO: DOS CAPAS Y UN LATIDO ──
     Un color plano detras no da velocidad: sin nada respecto de lo cual moverse,
     avanzar treinta bloques se ve igual que avanzar uno. */
  const g = cx.createLinearGradient(0, 0, 0, ALTO);
  const k = 0.16 + pulso*0.14;
  g.addColorStop(0, `rgb(${(c1[0]*(1+k))|0},${(c1[1]*(1+k))|0},${(c1[2]*(1+k))|0})`);
  g.addColorStop(1, `rgb(${(c1[0]*0.45)|0},${(c1[1]*0.45)|0},${(c1[2]*0.45)|0})`);
  cx.fillStyle = g; cx.fillRect(0, 0, ANCHO, ALTO);

  /* la reja de fondo, a media velocidad: es lo mas barato que existe para dar
     paralaje y encima marca la grilla del compas */
  cx.save();
  cx.globalAlpha = 0.10 + pulso*0.10;
  cx.strokeStyle = `rgb(${c2[0]},${c2[1]},${c2[2]})`;
  cx.lineWidth = Math.max(1, U*0.035);
  const x0 = Math.floor(CAM.x*0.5/4)*4;
  cx.beginPath();
  for (let i = -1; i < VISTA_ANCHO/2 + 3; i++){
    const X = (x0 + i*4 - CAM.x*0.5)*U;
    cx.moveTo(X, 0); cx.lineTo(X, ALTO);
  }
  for (let j = 0; j < 8; j++){
    const Y = ALTO - (j*4 - CAM.y*0.5)*U;
    cx.moveTo(0, Y); cx.lineTo(ANCHO, Y);
  }
  cx.stroke();
  cx.restore();

  /* ── LAS FORMAS DEL FONDO ──
     Los dos tercios de arriba del cuadro estaban vacios: en cubo el nivel vive
     entre 0 y 2,4 bloques y la pantalla mide 9,2. Un cielo liso ahi arriba no da
     velocidad ni escala. Van rombos y barras grandes a 0,35 de la camara, con la
     forma sacada de la POSICION y no de un azar por cuadro —si no, parpadean— y
     latiendo con el compas, que es lo unico que las ata al tema. */
  cx.save();
  cx.globalAlpha = 0.055 + pulso*0.05;
  cx.fillStyle = `rgb(${c2[0]},${c2[1]},${c2[2]})`;
  const fx = CAM.x*0.35, f0 = Math.floor(fx/9)*9;
  for (let i = -1; i < VISTA_ANCHO/9 + 3; i++){
    const bx = f0 + i*9;
    const h = ((bx*2654435761) >>> 0)/4294967296;
    const X = (bx - fx)*U + (h*4 - 2)*U, S = U*(2.6 + h*3.2);
    const Y = ALTO*(0.12 + h*0.40);
    cx.beginPath();
    if (h < 0.45){
      cx.moveTo(X, Y - S); cx.lineTo(X + S, Y); cx.lineTo(X, Y + S); cx.lineTo(X - S, Y);
      cx.closePath();
    } else if (h < 0.78){
      cx.rect(X - S*0.35, Y - S, S*0.7, S*2);
    } else {
      cx.moveTo(X - S, Y + S); cx.lineTo(X, Y - S); cx.lineTo(X + S, Y + S); cx.closePath();
    }
    cx.fill();
  }
  cx.restore();

  /* ── Y UN DESTELLO EN CADA GOLPE DE BOMBO ──
     No es un velo de pantalla completa: es un borde, asi que no lava el centro
     justo cuando hay que mirar los picos. Es la leccion de `destella()` en los
     casuales. */
  if (pulso > 0.35){
    const r = cx.createRadialGradient(ANCHO/2, ALTO/2, ALTO*0.30, ANCHO/2, ALTO/2, ALTO*0.95);
    r.addColorStop(0, 'rgba(0,0,0,0)');
    r.addColorStop(1, `rgba(${c2[0]},${c2[1]},${c2[2]},${(pulso - 0.35)*0.34})`);
    cx.fillStyle = r; cx.fillRect(0, 0, ANCHO, ALTO);
  }

  const vx0 = CAM.x - 2, vx1 = CAM.x + VISTA_ANCHO + 2;
  /* ── LOS SOLIDOS, Y EL SUELO TIENE QUE LEERSE A SUELO ──
     Con el mismo relleno que el fondo, la mitad de abajo de la pantalla era del
     color del cielo con una raya verde en el medio: no se leia a piso, se leia a
     una linea flotando. Va mas oscuro que el fondo, con rayas verticales que se
     mueven con la camara —que es lo unico que dice que se avanza rapido— y el
     canto luminoso encima, que es lo que dice donde se puede apoyar. */
  for (const r of MUNDO.sol){
    if (r.x + r.w < vx0 || r.x > vx1) continue;
    const X = px(r.x), Y = py(r.y + r.h), W = r.w*U, H = r.h*U;
    const piso = r.t === 'piso' || r.t === 'techo';
    /* ── EL COLOR DEL BLOQUE NO SE DERIVA DEL FONDO ──
       Estaba en `c1 × 1,15` y el fondo arranca en `c1 × 1,16`: en el nivel 3, que
       es casi negro, salian EXACTAMENTE del mismo color y los muros del pasillo se
       veian como rayas naranjas flotando. Va un oscuro propio con contorno del
       color del tema, que es lo que da silueta en las tres paletas. */
    cx.fillStyle = piso
      ? `rgb(${(c1[0]*0.34)|0},${(c1[1]*0.34)|0},${(c1[2]*0.40)|0})`
      : 'rgb(13,16,26)';
    cx.fillRect(X, Y, W, H);
    if (!piso){
      cx.save();
      cx.globalAlpha = 0.45;
      cx.strokeStyle = `rgb(${c2[0]},${c2[1]},${c2[2]})`;
      cx.lineWidth = Math.max(1, U*0.05);
      cx.strokeRect(X, Y, W, H);
      cx.restore();
    }
    if (piso){
      cx.save();
      cx.beginPath(); cx.rect(X, Y, W, H); cx.clip();
      cx.globalAlpha = 0.30;
      cx.strokeStyle = `rgb(${c2[0]},${c2[1]},${c2[2]})`;
      cx.lineWidth = Math.max(1, U*0.03);
      cx.beginPath();
      const b0 = Math.floor(Math.max(r.x, vx0)/2)*2;
      for (let bx = b0; bx < Math.min(r.x + r.w, vx1); bx += 2){
        cx.moveTo(px(bx), Y); cx.lineTo(px(bx), Y + H);
      }
      cx.stroke();
      cx.restore();
    }
    /* ── EL CANTO LUMINOSO VA EN LA CARA EN LA QUE SE APOYA ──
       En un techo eso es la cara de ABAJO. Dibujado siempre arriba, el techo del
       tramo de gravedad invertida quedaba con su linea fuera del cuadro y el cubo
       se veia colgando de la nada. */
    const gr2 = Math.max(1.5, U*0.10);
    cx.fillStyle = `rgb(${c2[0]},${c2[1]},${c2[2]})`;
    cx.fillRect(X, r.t === 'techo' ? Y + H - gr2 : Y, W, gr2);
  }
  /* los picos */
  for (const r of MUNDO.mat){
    if (r.x + r.w < vx0 || r.x > vx1) continue;
    if (r.t === 'sierra') continue;
    const inv = r.t === 'picoInv';
    const X = px(r.x - 0.18), W = (r.w + 0.36)*U;
    const Yb = py(inv ? r.y + r.h : r.y), Yp = py(inv ? r.y : r.y + r.h);
    cx.beginPath();
    cx.moveTo(X, Yb); cx.lineTo(X + W, Yb); cx.lineTo(X + W/2, Yp);
    cx.closePath();
    cx.fillStyle = '#f4f8ff'; cx.fill();
    cx.strokeStyle = `rgba(${c2[0]},${c2[1]},${c2[2]},.9)`;
    cx.lineWidth = Math.max(1, U*0.06); cx.stroke();
  }
  /* las sierras, que giran con el reloj de la musica */
  for (const s of MUNDO.sierras){
    if (s.x < vx0 || s.x > vx1) continue;
    const X = px(s.x), Y = py(s.y), R = s.r*U;
    cx.save(); cx.translate(X, Y); cx.rotate((t || 0)*2.4);
    cx.fillStyle = '#dfe7f2';
    for (let i = 0; i < 8; i++){
      cx.rotate(Math.PI/4);
      cx.beginPath(); cx.moveTo(-R*0.30, 0); cx.lineTo(0, -R*1.05); cx.lineTo(R*0.30, 0);
      cx.closePath(); cx.fill();
    }
    cx.fillStyle = `rgb(${c2[0]},${c2[1]},${c2[2]})`;
    cx.beginPath(); cx.arc(0, 0, R*0.42, 0, 6.2832); cx.fill();
    cx.restore();
  }
  /* los pads y los orbes */
  for (const p of MUNDO.pads){
    if (p.x < vx0 || p.x > vx1) continue;
    cx.fillStyle = '#ffd447';
    cx.fillRect(px(p.x), py(p.y + 0.22), U, U*0.22);
  }
  for (const o of MUNDO.orbes){
    if (o.x < vx0 || o.x > vx1) continue;
    const X = px(o.x), Y = py(o.y);
    cx.save();
    cx.globalAlpha = o.usado ? 0.25 : 0.55 + pulso*0.45;
    cx.strokeStyle = '#ffd447'; cx.lineWidth = Math.max(2, U*0.11);
    cx.beginPath(); cx.arc(X, Y, U*0.42, 0, 6.2832); cx.stroke();
    cx.restore();
  }
  /* los portales: una columna de color, que es como se anuncian en el genero */
  for (const p of MUNDO.portales){
    if (p.x < vx0 || p.x > vx1) continue;
    const col = p.t === 'grav' ? '#ffd447' : p.t === 'norm' ? '#5ad9ff'
              : p.t === 'nave' ? '#ff6ad5' : '#2de2a8';
    const X = px(p.x), Yp = py(0);
    cx.save(); cx.globalAlpha = 0.85;
    cx.fillStyle = col;
    cx.fillRect(X - U*0.14, 0, U*0.28, Yp);
    cx.restore();
  }
  /* las monedas */
  for (const m of MUNDO.monedas){
    if (m.tomada || m.x < vx0 || m.x > vx1) continue;
    const X = px(m.x), Y = py(m.y) + Math.sin((t || 0)*2.2)*U*0.12;
    cx.save();
    cx.fillStyle = '#ffd447'; cx.strokeStyle = '#7a5a10'; cx.lineWidth = Math.max(1, U*0.05);
    cx.beginPath(); cx.arc(X, Y, U*0.36, 0, 6.2832); cx.fill(); cx.stroke();
    cx.restore();
  }

  /* ── EL RESPLANDOR SOBRE LA LINEA DEL PISO ──
     Es lo que hace que el suelo se lea a suelo iluminado y no a un rectangulo
     oscuro pegado abajo. Va DESPUES de los solidos y antes del jugador. */
  {
    const Yp = py(JUG.grav < 0 ? ALTO_GRAV : 0);
    if (JUG.grav > 0 && Yp > 0 && Yp < ALTO){
      const gr = cx.createLinearGradient(0, Yp - U*2.2, 0, Yp);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, `rgba(${c2[0]},${c2[1]},${c2[2]},${0.09 + pulso*0.07})`);
      cx.fillStyle = gr; cx.fillRect(0, Yp - U*2.2, ANCHO, U*2.2);
    }
  }

  /* ── EL JUGADOR ──
     El icono es una forma con dos colores, como en el genero: uno de relleno y
     uno de detalle, que es lo que hace que dos iconos se distingan de lejos. */
  /* ── LA Y QUE SE LE PASA ES LA DE LA BASE, NO LA DE LA TAPA ──
     `dibujaIcono` apoya su caja EN la Y que recibe, asi que pasandole la tapa
     (`y + lado`) el cubo se dibujaba 0,86 bloques mas arriba: medido en la
     captura, treinta pixeles flotando sobre la linea del piso. */
  if (JUG.vivo) dibujaIcono(cx, px(JUG.x), py(JUG.y), U*JUG_LADO, JUG.giro,
                            JUG.modo === 'nave', ICONO);

  /* las particulas: la estela del cubo y las esquirlas de la muerte */
  for (const p of PART){
    cx.save(); cx.globalAlpha = cl(p.t/p.t0, 0, 1)*0.9;
    cx.fillStyle = p.c;
    const s = U*p.s*cl(p.t/p.t0, 0.2, 1);
    cx.fillRect(px(p.x) - s/2, py(p.y) - s/2, s, s);
    cx.restore();
  }
}

/* ── EL ICONO, DIBUJADO EN UNA FUNCION QUE SIRVE PARA LAS DOS COSAS ──
   La usa el juego y la usa la vista previa del menu: con dos dibujantes, el
   icono que se elige no es el que se juega. */
const FORMAS = ['cubo', 'diamante', 'redondo'];
const COLES = ['#2de2a8', '#5ad9ff', '#ffd447', '#ff6ad5', '#ff7a4a', '#b07aff'];
const ICONO = { forma: 0, c1: 0, c2: 1 };

function dibujaIcono(g, X, Y, S, giro, nave, ic){
  g.save(); g.translate(X, Y - S/2); g.rotate(giro);
  const A = COLES[ic.c1], B = COLES[ic.c2];
  if (nave){
    /* la nave es un triangulo: hacia donde apunta es la unica cosa que hay que
       leer, y un triangulo la dice sin texto */
    g.fillStyle = A;
    g.beginPath(); g.moveTo(S*0.62, 0); g.lineTo(-S*0.5, -S*0.42); g.lineTo(-S*0.5, S*0.42);
    g.closePath(); g.fill();
    g.fillStyle = B;
    g.beginPath(); g.arc(-S*0.05, 0, S*0.19, 0, 6.2832); g.fill();
  } else if (FORMAS[ic.forma] === 'diamante'){
    g.fillStyle = A;
    g.beginPath(); g.moveTo(0, -S*0.62); g.lineTo(S*0.62, 0); g.lineTo(0, S*0.62);
    g.lineTo(-S*0.62, 0); g.closePath(); g.fill();
    g.fillStyle = B;
    g.beginPath(); g.moveTo(0, -S*0.28); g.lineTo(S*0.28, 0); g.lineTo(0, S*0.28);
    g.lineTo(-S*0.28, 0); g.closePath(); g.fill();
  } else if (FORMAS[ic.forma] === 'redondo'){
    g.fillStyle = A; g.beginPath(); g.arc(0, 0, S*0.52, 0, 6.2832); g.fill();
    g.fillStyle = B; g.beginPath(); g.arc(0, 0, S*0.24, 0, 6.2832); g.fill();
  } else {
    g.fillStyle = A; g.fillRect(-S/2, -S/2, S, S);
    g.fillStyle = B; g.fillRect(-S*0.22, -S*0.22, S*0.44, S*0.44);
  }
  g.restore();
}

function chispas(x, y, n, c){
  const tope = CALIDADES[CALIDAD].part;
  for (let i = 0; i < n && PART.length < tope; i++){
    const a = az()*6.2832, v = azr(2, 11);
    PART.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v,
                t: azr(0.25, 0.6), t0: 0.6, s: azr(0.12, 0.3), c });
  }
}
function pasoPart(dt){
  for (let i = PART.length - 1; i >= 0; i--){
    const p = PART[i];
    p.t -= dt; if (p.t <= 0){ PART.splice(i, 1); continue; }
    p.vy -= 26*dt; p.x += p.vx*dt; p.y += p.vy*dt;
  }
}
