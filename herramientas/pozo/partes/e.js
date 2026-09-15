/* ============================================================
   e.js — el dibujo. Todo por codigo: ni una imagen, ni una fuente
   de afuera. Lo unico que se le pide al lienzo es que rellene.
   ============================================================ */

function medir(){
  const m = $('#marco');
  /* EL MARCO ES DE TELEFONO, NO 9:16. Con 9:16 en un telefono de hoy
     —412x892, o sea 9:19,5— el marco queda en 412x732 y se pierden CIENTO
     SESENTA pixeles de pantalla en dos bandas negras, justo en el aparato
     en el que se juega. La proporcion sale de las dos variables del CSS,
     asi que hay un solo numero. */
  const R = 412 / 892;
  const w = Math.min(window.innerWidth,  window.innerHeight * R);
  const h = Math.min(window.innerHeight, window.innerWidth  / R);
  m.style.width = w + 'px'; m.style.height = h + 'px';
  AN = Math.round(w); AL = Math.round(h);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  CV.width = Math.round(AN * dpr); CV.height = Math.round(AL * dpr);
  CX.setTransform(dpr, 0, 0, dpr, 0, 0);
  /* la sala ENTERA entra en el cuadro: en un teléfono lo que mata es que
     te dispare algo que no ves. El lado que aprieta decide la escala. */
  ESC = Math.min(AN / MUNDO_W, (AL - HUD_ALTO) / MUNDO_H);
  OX = (AN - MUNDO_W * ESC) / 2;
  OY = HUD_ALTO + (AL - HUD_ALTO - MUNDO_H * ESC) / 2;
}

/* ---------- utilidades ---------- */
function redondo(x,y,w,h,r){
  CX.beginPath();
  CX.moveTo(x+r,y); CX.arcTo(x+w,y,x+w,y+h,r); CX.arcTo(x+w,y+h,x,y+h,r);
  CX.arcTo(x,y+h,x,y,r); CX.arcTo(x,y,x+w,y,r); CX.closePath();
}
function disco(x,y,r){ CX.beginPath(); CX.arc(x,y,r,0,6.2832); CX.fill(); }
const lerp = (a,b,t) => a + (b-a)*t;

/* ---------- el suelo y los muros ---------- */
/* el piso se hornea UNA vez por sala en un lienzo aparte: dibujarlo
   baldosa por baldosa en cada cuadro son 187 rellenos por cuadro para
   obtener siempre el mismo dibujo. */
let PISO_LI = null, PISO_CX = null, PISO_CLAVE = '';
/* ---------- los sprites generados ----------
   NADA DE ESTO REEMPLAZA EL DIBUJO POR CODIGO HASTA QUE LLEGA. Un data URI se
   decodifica de forma asincronica, asi que una pieza que naciera esperando su
   imagen daria cuadros vacios: cada sitio dibuja lo suyo y el sprite lo pisa
   cuando decodifico. Un base64 roto cuesta UNA pieza, no una pantalla en negro.

   Y EL TAMANO EN MUNDO SALE DE `IMGM`, que lo escribe el horneado. Escrito aca
   al lado, el dia que una pieza cambie de caja el dibujo y el horneado dirian
   cosas distintas y nadie se enteraria. */
const IMG = {};
let IMG_N = 0, IMG_TOT = 0;
/* que asset viste que parte del menu. Con el nombre de la clase y el de la
   variable derivados de UNA tabla, agregar una placa nueva es una linea y no
   tres sitios que se pueden desincronizar. */
const UI_PIEL = { boton:'b', boton_oro:'bo', logo:'logo' };
function pielPon(k){
  const n = UI_PIEL[k];
  document.documentElement.style.setProperty('--pl-' + n, 'url(' + IMGB[k] + ')');
  document.body.classList.add('pl-' + n);
}
(function(){
  if (typeof IMGB !== 'object' || !IMGB) return;
  for (const k in IMGB){
    IMG_TOT++;
    const im = new Image();
    im.onload = () => { IMG[k] = im; IMG_N++; if (UI_PIEL[k]) pielPon(k); };
    im.src = IMGB[k];
  }
})();

/* EL TENIDO SE GUARDA, porque componer cuesta un lienzo entero y la bala se
   dibuja cientos de veces por segundo. `multiply` conserva el sombreado del
   sprite —por eso la bala se genera BLANCA, para que el color del arma siga
   siendo informacion— y el `destination-in` le devuelve su propio alfa, que la
   pasada de color se habia comido. `plano` es el fogonazo de recibir un tiro:
   ahi la silueta tiene que irse a blanco entero. */
const TINTE = new Map();
function tinta(k, col, plano){
  const im = IMG[k]; if (!im) return null;
  const cl = k + '|' + col + (plano ? '|p' : '');
  let c = TINTE.get(cl); if (c) return c;
  c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = plano ? 'source-in' : 'multiply';
  x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  if (!plano){ x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0); }
  TINTE.set(cl, c);
  return c;
}

/* dibuja centrado en (x,y) con la caja de mundo que declaro el horneado.
   Devuelve false si el sprite todavia no llego, y ese false ES la puerta que
   deja el dibujo por codigo en pie. */
function dibSpr(k, x, y, col, plano, escX, escY){
  const im = IMG[k]; if (!im) return false;
  const m = (typeof IMGM === 'object' && IMGM) ? IMGM[k] : null; if (!m) return false;
  const f = col ? tinta(k, col, plano) : im;
  const w = m[0] * (escX === undefined ? 1 : escX), h = m[1] * (escY === undefined ? 1 : escY);
  CX.drawImage(f, x - w/2, y - h/2, w, h);
  return true;
}
function haySpr(k){ return !!IMG[k]; }
/* el ancho de mundo declarado por el horneado. Sirve para escalar un sprite
   contra una medida del juego —el radio de una bala cambia con el arma— sin
   escribir su caja dos veces. */
function sprAncho(k){ const m = (typeof IMGM === 'object' && IMGM) ? IMGM[k] : null; return m ? m[0] : 0; }

function horneaPiso(s, piso){
  const cl = s.ix + '|' + piso + '|' + s.pat;
  if (PISO_CLAVE === cl) return;
  PISO_CLAVE = cl;
  if (!PISO_LI){ PISO_LI = document.createElement('canvas'); PISO_CX = PISO_LI.getContext('2d'); }
  PISO_LI.width = MUNDO_W; PISO_LI.height = MUNDO_H;
  const c = PISO_CX;
  const tono = Math.min(1, (piso-1) / 9);
  const baseR = Math.round(lerp(30, 44, tono)), baseG = Math.round(lerp(36, 28, tono)),
        baseB = Math.round(lerp(50, 40, tono));
  c.fillStyle = 'rgb(' + baseR + ',' + baseG + ',' + baseB + ')';
  c.fillRect(0,0,MUNDO_W,MUNDO_H);
  /* baldosas con variacion por celda: un piso de un solo color se lee a
     prototipo, y la variacion sale del indice, no del azar (tiene que ser
     el mismo dibujo cada vez que se entra a la sala) */
  for (let y = 0; y < SALA_H; y++) for (let x = 0; x < SALA_W; x++){
    if (s.m[y*SALA_W+x]) continue;
    const h = ((x*73 + y*151 + s.ix*37) % 17) / 17;
    const d = Math.round(h * 9 - 3);
    /* la baldosa generada va ENTERA y sin recortar: recortada, su costura se ve
       como una reja sobre el piso completo. El manchado por celda se queda
       ENCIMA — sin el, ciento ochenta y siete baldosas identicas se leen a
       empapelado por mucha textura que tengan. */
    if (haySpr('piso')) c.drawImage(IMG.piso, x*CELDA, y*CELDA, CELDA, CELDA);
    else { c.fillStyle = 'rgb(' + (baseR+d) + ',' + (baseG+d) + ',' + (baseB+d) + ')';
           c.fillRect(x*CELDA+1, y*CELDA+1, CELDA-2, CELDA-2); }
    c.globalAlpha = haySpr('piso') ? .26 : 1;
    if (haySpr('piso')){
      c.fillStyle = 'rgb(' + (baseR+d*2) + ',' + (baseG+d*2) + ',' + (baseB+d*2) + ')';
      c.fillRect(x*CELDA, y*CELDA, CELDA, CELDA);
    }
    c.globalAlpha = 1;
    if (h > .86){ c.fillStyle = 'rgba(255,255,255,.028)';
      c.fillRect(x*CELDA+7, y*CELDA+7, CELDA-14, CELDA-14); }
  }
  /* muros: cara de arriba clara y frente oscuro — el canto es lo unico
     que separa un bloque de una mancha */
  for (let y = 0; y < SALA_H; y++) for (let x = 0; x < SALA_W; x++){
    const v = s.m[y*SALA_W+x]; if (!v) continue;
    const X = x*CELDA, Y = y*CELDA;
    const arriba = y > 0 && s.m[(y-1)*SALA_W+x];
    if (haySpr('muro')) c.drawImage(IMG.muro, X, Y, CELDA, CELDA);
    else { c.fillStyle = v === 2 ? '#2a3044' : '#232838'; c.fillRect(X, Y, CELDA, CELDA); }
    if (v === 2 && haySpr('muro')){
      c.globalAlpha = .34; c.fillStyle = '#3b4460'; c.fillRect(X, Y, CELDA, CELDA);
      c.globalAlpha = 1;
    }
    if (!arriba){
      /* la CIMA del muro es otra baldosa: es lo unico que separa una pared de
         una mancha oscura vista desde arriba. */
      if (haySpr('muro_cima')) c.drawImage(IMG.muro_cima, X, Y, CELDA, 12);
      else { c.fillStyle = v === 2 ? '#3b4460' : '#333a52'; c.fillRect(X, Y, CELDA, 9); }
      c.fillStyle = 'rgba(255,255,255,.07)';
      c.fillRect(X, Y, CELDA, 2);
    }
    c.fillStyle = 'rgba(0,0,0,.30)';
    c.fillRect(X, Y+CELDA-5, CELDA, 5);
  }
}

/* ---------- las puertas ---------- */
function dibPuertas(s){
  const P = JU.P;
  const abierta = s.limpia;
  for (const k in s.puertas){
    const p = PUERTA_C[k];
    const horiz = (k === 'n' || k === 's');
    const w = horiz ? CELDA*3 : CELDA, h = horiz ? CELDA : CELDA*3;
    const x = horiz ? (p.x-1)*CELDA : p.x*CELDA;
    const y = horiz ? p.y*CELDA : (p.y-1)*CELDA;
    if (abierta){
      /* abierta: un umbral oscuro y una flecha que late hacia afuera */
      CX.fillStyle = '#080b12'; CX.fillRect(x, y, w, h);
      const L = LADOS.find(L => L.k === k);
      const cx0 = x + w/2, cy0 = y + h/2;
      const pul = .45 + .55 * (0.5 + 0.5*Math.sin(JU.t*5));
      CX.save(); CX.globalAlpha = pul * .85;
      CX.fillStyle = '#ffc857';
      CX.translate(cx0 + L.dx*7, cy0 + L.dy*7);
      CX.rotate(Math.atan2(L.dy, L.dx) + Math.PI/2);
      CX.beginPath(); CX.moveTo(0,-11); CX.lineTo(9,6); CX.lineTo(-9,6); CX.closePath(); CX.fill();
      CX.restore();
    } else {
      /* cerrada: reja de barrotes */
      CX.fillStyle = '#121622'; CX.fillRect(x, y, w, h);
      /* un barrote es UN sprite repetido seis veces, no una imagen de reja: asi
         la misma pieza sirve para la puerta horizontal y para la vertical, que
         miden distinto. */
      const hayR = haySpr('reja');
      CX.fillStyle = '#4a3c2a';
      if (horiz) for (let i = 0; i < 6; i++){
        const bx = x + 5 + i*(w-10)/6 + 2.5;
        if (hayR) dibSpr('reja', bx, y + h/2, null, false, 1, (h-6)/42);
        else CX.fillRect(bx - 2.5, y+3, 5, h-6);
      }
      else for (let i = 0; i < 6; i++){
        const by = y + 5 + i*(h-10)/6 + 2.5;
        if (hayR){ CX.save(); CX.translate(x + w/2, by); CX.rotate(Math.PI/2);
                   dibSpr('reja', 0, 0, null, false, 1, (w-6)/42); CX.restore(); }
        else CX.fillRect(x+3, by - 2.5, w-6, 5);
      }
      CX.fillStyle = 'rgba(0,0,0,.35)'; CX.fillRect(x, y, w, h);
    }
  }
}

/* ---------- el jugador ---------- */
function dibJugador(P){
  const x = P.x, y = P.y;
  /* sombra: lo unico que lo apoya en el piso */
  CX.fillStyle = 'rgba(0,0,0,.34)';
  CX.save(); CX.translate(x, y+12); CX.scale(1, .42); disco(0,0,13); CX.restore();

  /* parpadeo de invencibilidad: se salta un cuadro de cada dos */
  if (P.inv > 0 && Math.floor(JU.t*22) % 2 === 0) return;

  const ang = P.mira;
  const mirDer = Math.cos(ang) >= 0;
  /* aplaste: estirado en la direccion en que va durante la esquiva */
  let sx = 1, sy = 1;
  if (P.esqT > 0){ const u = P.esqT / ESQ_T; sx = 1 + .30*u; sy = 1 - .22*u; }
  else if (P.aterr > 0){ sx = 1 + .18*P.aterr; sy = 1 - .16*P.aterr; }

  CX.save(); CX.translate(x, y);
  CX.rotate(Math.sin(P.fase*.5) * .035);           // cabeceo del paso
  CX.scale(sx, sy);

  /* piernas: la cadencia sale de la velocidad, no de un reloj. Los centros de
     las dos piezas son los mismos que los de las cajas dibujadas por codigo
     —esquina + media caja— asi el muneco no se corre al llegar los sprites. */
  const sw = Math.sin(P.fase) * (P.andando ? 6.2 : 0);
  const pyI = 4 - Math.max(0, sw)*.5, pyD = 4 + Math.max(0,-sw)*.5;
  if (!dibSpr('pj_pierna', -7.5 + sw*.5 + 3, pyI + 6) ||
      !dibSpr('pj_pierna',  1.5 - sw*.5 + 3, pyD + 6)){
    CX.fillStyle = '#2b3550';
    redondo(-7.5 + sw*.5, pyI, 6, 12, 3); CX.fill();
    redondo( 1.5 - sw*.5, pyD, 6, 12, 3); CX.fill();
  }
  /* cuerpo */
  if (!dibSpr('pj_cuerpo', 0, .5)){
    CX.fillStyle = '#4c6ea8'; redondo(-10, -8, 20, 17, 7); CX.fill();
    CX.fillStyle = 'rgba(255,255,255,.10)'; redondo(-10, -8, 20, 6, 5); CX.fill();
  }
  /* cabeza. EL SPRITE SE LLEVA TAMBIEN EL VISOR: con la banda dibujada encima de
     una cabeza generada se ven dos dibujantes. Que el sprite se CORRA hacia donde
     apunta es lo que reemplaza al visor — y el encaramiento de verdad ya lo dice
     el brazo, que gira la vuelta entera. */
  if (!dibSpr('pj_cabeza', Math.cos(ang)*1.6, -14 + Math.sin(ang)*1.2)){
    CX.fillStyle = '#e9d7b8'; disco(0, -14, 8.5);
    CX.fillStyle = '#1a2334';
    CX.save(); CX.translate(Math.cos(ang)*3.2, -14 + Math.sin(ang)*2.4);
    redondo(-5.5, -2.4, 11, 4.6, 2.2); CX.fill(); CX.restore();
    CX.fillStyle = 'rgba(255,255,255,.16)'; redondo(-8.5, -22, 17, 5, 3); CX.fill();
  }

  /* el brazo con el arma: apunta de verdad a donde va la bala */
  const A = ARMAS[P.arma];
  CX.save(); CX.rotate(ang);
  const rec = P.rec > 0 ? P.rec * 6 : 0;            // retroceso a la vista
  /* el brazo se ACORTA con el retroceso, asi que su sprite se escala en x y se
     recentra: estirandolo entero, el arma se despegaria de la mano. */
  if (!dibSpr('pj_brazo', 3 + (10 - rec)/2, 0, null, false, (10 - rec)/10, 1)){
    CX.fillStyle = '#e9d7b8'; redondo(3, -3, 10 - rec, 6, 3); CX.fill();
  }
  /* el arma entera es UN sprite: el codigo la dibuja en x 11..29, o sea centrada
     en 20 y de 18 de largo, y la caja horneada (22x9) la cubre con un poco de aire. */
  if (!dibSpr('arma_' + P.arma, 20 - rec, 0)){
    CX.fillStyle = '#2a3142'; redondo(11 - rec, -3.6, 15, 7.2, 2.5); CX.fill();
    CX.fillStyle = A.col;    redondo(24 - rec, -2.2, 5, 4.4, 1.8); CX.fill();
  }
  if (P.fog > 0){                                    // fogonazo
    CX.globalAlpha = P.fog;
    CX.fillStyle = A.col; disco(31 - rec, 0, 5 + 7*P.fog);
    CX.fillStyle = '#fff'; disco(30 - rec, 0, 2 + 4*P.fog);
    CX.globalAlpha = 1;
  }
  CX.restore();
  CX.restore();
}

/* ---------- los enemigos ---------- */
function dibEnem(e){
  const D = ENEM[e.cl], x = e.x, y = e.y, r = D.r;
  CX.fillStyle = 'rgba(0,0,0,.32)';
  CX.save(); CX.translate(x, y + r*.82); CX.scale(1, .40); disco(0,0,r); CX.restore();

  /* telegrafia: el bicho se ABRE antes de pegar. Sin aviso, pegar es
     una sorpresa y no una decision del jugador. */
  const av = e.avisa > 0 ? 1 - e.avisa / D.t : 0;
  let s = 1 + (e.avisa > 0 ? .22 * Math.sin(av * Math.PI) : 0);
  if (e.golpe > 0) s *= 1 + .18 * e.golpe;            // hitstop visible
  const late = e.cl === 'bomba' ? 1 + .12*Math.sin(JU.t*14) : 1;

  CX.save(); CX.translate(x, y);
  CX.rotate(Math.sin(e.fase) * .10);
  CX.scale(s * late, (2 - s) * late);

  const blanco = e.flash > 0;
  const col = blanco ? '#ffffff' : D.col;

  /* EL HALO DEL JEFE ES UNA LUZ, NO GEOMETRIA: va debajo del cuerpo lo dibuje
     quien lo dibuje, asi que sale del if y no se reemplaza nunca. */
  if (D.jefe){
    const gh = CX.createRadialGradient(0,0,r*.2, 0,0,r*1.25);
    gh.addColorStop(0, blanco ? '#fff' : '#ffffff22');
    gh.addColorStop(1, col + '00');
    CX.fillStyle = gh; disco(0,0,r*1.25);
  }

  /* el sprite generado pisa al cuerpo y SOLO al cuerpo. El canon de tirador y
     torreta y la corona del jefe se siguen dibujando ENCIMA: el canon es lo unico
     que dice hacia donde apuntan y la corona gira, asi que ninguno de los dos
     puede venir horneado adentro de la foto — por eso se pidieron sin canon. */
  if (dibSpr('en_' + e.cl, 0, 0, blanco ? '#ffffff' : null, true)){
    if (e.cl === 'tirador'){
      CX.save(); CX.rotate(e.mira); CX.fillStyle = '#2a3142';
      redondo(r*.5, -2.6, r*1.0, 5.2, 2); CX.fill(); CX.restore();
    } else if (e.cl === 'torreta'){
      CX.save(); CX.rotate(e.mira); CX.fillStyle = col;
      for (let i = 0; i < 3; i++){ CX.rotate(2.094); redondo(r*.7,-3,r*.8,6,2); CX.fill(); }
      CX.restore();
    } else if (D.jefe){
      CX.fillStyle = col;
      const pu = e.cl === 'jefe2' ? 8 : 6;
      for (let i = 0; i < pu; i++){
        const a = i/pu*6.2832 + JU.t*.5;
        CX.save(); CX.rotate(a); redondo(r*.92, -3.4, r*.40, 6.8, 3); CX.fill(); CX.restore();
      }
    }
  } else if (e.cl === 'baba'){
    CX.fillStyle = col; disco(0, 0, r);
    CX.fillStyle = 'rgba(0,0,0,.20)'; disco(0, r*.3, r*.72);
    CX.fillStyle = '#12161f'; disco(-r*.34, -r*.2, r*.20); disco(r*.34, -r*.2, r*.20);
  } else if (e.cl === 'corredor'){
    CX.fillStyle = col;
    CX.beginPath(); CX.moveTo(0,-r*1.15); CX.lineTo(r*.9, r*.8); CX.lineTo(-r*.9, r*.8);
    CX.closePath(); CX.fill();
    CX.fillStyle = '#12161f'; disco(-r*.3, 0, r*.18); disco(r*.3, 0, r*.18);
  } else if (e.cl === 'tirador'){
    CX.fillStyle = col; redondo(-r, -r, r*2, r*2, r*.5); CX.fill();
    CX.fillStyle = 'rgba(0,0,0,.24)'; redondo(-r*.7, -r*.7, r*1.4, r*.7, 3); CX.fill();
    CX.fillStyle = '#12161f'; disco(0, r*.15, r*.30);
    CX.save(); CX.rotate(e.mira); CX.fillStyle='#2a3142';
    redondo(r*.5, -2.6, r*1.0, 5.2, 2); CX.fill(); CX.restore();
  } else if (e.cl === 'torreta'){
    CX.fillStyle = '#2a3142'; disco(0, 0, r*1.05);
    CX.fillStyle = col; disco(0, 0, r*.78);
    CX.fillStyle = '#12161f'; disco(0, 0, r*.30);
    CX.save(); CX.rotate(e.mira);
    CX.fillStyle = col; for (let i = 0; i < 3; i++){ CX.rotate(2.094); redondo(r*.7,-3,r*.8,6,2); CX.fill(); }
    CX.restore();
  } else if (e.cl === 'bomba'){
    CX.fillStyle = col; disco(0, 0, r);
    CX.fillStyle = 'rgba(255,255,255,.22)'; disco(-r*.3, -r*.3, r*.3);
    CX.strokeStyle = '#12161f'; CX.lineWidth = 2.4;
    CX.beginPath(); CX.arc(0,0,r*.62, .6, 2.6); CX.stroke();
  } else if (e.cl === 'bruto'){
    CX.fillStyle = col; redondo(-r, -r*.9, r*2, r*1.8, r*.42); CX.fill();
    CX.fillStyle = 'rgba(0,0,0,.22)'; redondo(-r*.8, -r*.2, r*1.6, r*.9, 5); CX.fill();
    CX.fillStyle = '#12161f'; redondo(-r*.6,-r*.55, r*.44, r*.24, 2); CX.fill();
    redondo(r*.16,-r*.55, r*.44, r*.24, 2); CX.fill();
    CX.fillStyle = col; redondo(-r*1.35,-r*.4, r*.4, r*1.0, 4); CX.fill();
    redondo(r*.95,-r*.4, r*.4, r*1.0, 4); CX.fill();
  } else {   /* los dos jefes: mismo cuerpo, distinta corona */
    CX.fillStyle = col; disco(0, 0, r);
    CX.fillStyle = 'rgba(0,0,0,.26)'; disco(0, r*.24, r*.74);
    CX.fillStyle = '#0d1017';
    disco(-r*.36,-r*.18, r*.17); disco(r*.36,-r*.18, r*.17); disco(0,-r*.42, r*.13);
    CX.fillStyle = col;
    const pu = e.cl === 'jefe2' ? 8 : 6;
    for (let i = 0; i < pu; i++){
      const a = i/pu*6.2832 + JU.t*.5;
      CX.save(); CX.rotate(a); redondo(r*.92, -3.4, r*.40, 6.8, 3); CX.fill(); CX.restore();
    }
  }
  CX.restore();

  /* barra de vida sólo si le falta algo y sólo en los grandes */
  if (e.vida < e.vidaMax && (D.jefe || D.v >= 40)){
    const w = D.jefe ? 56 : 30;
    CX.fillStyle = 'rgba(0,0,0,.55)'; CX.fillRect(x-w/2, y-r-13, w, 5);
    CX.fillStyle = D.jefe ? '#ef4b5c' : '#ffc857';
    CX.fillRect(x-w/2, y-r-13, w * Math.max(0, e.vida/e.vidaMax), 5);
  }
}

/* ---------- balas, particulas, numeros ---------- */
function dibBalas(){
  for (const b of JU.bal.concat(JU.eba)){
    const col = b.col;
    /* estela: sin ella, una bala rapida es un parpadeo */
    CX.strokeStyle = col; CX.globalAlpha = .28; CX.lineWidth = b.r*1.5; CX.lineCap = 'round';
    CX.beginPath(); CX.moveTo(b.x - b.vx*.022, b.y - b.vy*.022); CX.lineTo(b.x, b.y); CX.stroke();
    CX.globalAlpha = 1;
    /* la bala se genero BLANCA a proposito y se TINE con el color del arma: el
       color es informacion —dice de quien es el tiro— asi que no puede venir
       horneado. Y el radio sale del arma, asi que el sprite se escala contra su
       propio ancho de mundo en vez de llevarlo escrito al lado. */
    const kb = 2*b.r / (sprAncho('bala') || 1);
    if (!dibSpr('bala', b.x, b.y, col, false, kb, kb)){
      CX.fillStyle = col; disco(b.x, b.y, b.r);
      CX.fillStyle = 'rgba(255,255,255,.75)'; disco(b.x - b.vx*.004, b.y - b.vy*.004, b.r*.45);
    }
  }
  CX.globalAlpha = 1;
}
function dibPart(){
  for (const p of JU.par){
    const u = p.t / p.tv;
    CX.globalAlpha = Math.max(0, u);
    CX.fillStyle = p.col;
    if (p.tipo === 'aro'){
      CX.strokeStyle = p.col; CX.lineWidth = 2 + 3*u; CX.globalAlpha = u*.8;
      CX.beginPath(); CX.arc(p.x, p.y, p.r * (1.6 - u), 0, 6.2832); CX.stroke();
    } else {
      CX.save(); CX.translate(p.x, p.y); CX.rotate(p.a);
      CX.fillRect(-p.r, -p.r*.5, p.r*2*u + 1, p.r);
      CX.restore();
    }
  }
  CX.globalAlpha = 1;
}
function dibFlot(){
  CX.textAlign = 'center';
  for (const f of JU.flot){
    const u = f.t / f.tv;
    CX.globalAlpha = Math.min(1, u*2);
    CX.font = '900 ' + f.tam + 'px system-ui';
    CX.fillStyle = '#000'; CX.fillText(f.txt, f.x+1, f.y+1);
    CX.fillStyle = f.col;  CX.fillText(f.txt, f.x, f.y);
  }
  CX.globalAlpha = 1; CX.textAlign = 'left';
}

/* ---------- cosas del suelo ---------- */
function dibCosas(s){
  /* monedas */
  for (const m of s.mon){
    if (m.tomada) continue;
    const y = m.cy*CELDA + CELDA/2 + Math.sin(JU.t*3 + m.cx) * 2.5;
    CX.fillStyle = 'rgba(0,0,0,.30)';
    CX.save(); CX.translate(m.cx*CELDA+CELDA/2, m.cy*CELDA+CELDA/2+8); CX.scale(1,.4); disco(0,0,6); CX.restore();
    if (!dibSpr('moneda', m.cx*CELDA+CELDA/2, y)){
      CX.fillStyle = '#e8c06a'; disco(m.cx*CELDA+CELDA/2, y, 6);
      CX.fillStyle = '#fff3cd'; disco(m.cx*CELDA+CELDA/2 - 1.6, y - 1.6, 2.4);
    }
  }
  /* corazones sueltos: dos lobulos y una punta, que a siete pixeles es todo
     lo que se lee. Laten y flotan para distinguirse de la moneda, que es lo
     otro chiquito que hay en el suelo. */
  if (s.cor) for (const c of s.cor){
    if (c.tomado) continue;
    const pul = 1 + .10*Math.sin(c.t*6), y = c.y + Math.sin(c.t*2.6)*2.5;
    CX.fillStyle = 'rgba(0,0,0,.30)';
    CX.save(); CX.translate(c.x, c.y+9); CX.scale(1,.4); disco(0,0,7); CX.restore();
    const g = CX.createRadialGradient(c.x,y,1, c.x,y,16);
    g.addColorStop(0,'rgba(239,75,92,.35)'); g.addColorStop(1,'rgba(239,75,92,0)');
    CX.fillStyle = g; disco(c.x, y, 16);
    CX.save(); CX.translate(c.x, y); CX.scale(pul, pul);
    if (!dibSpr('corazon', 0, 0)){
      CX.fillStyle = '#ef4b5c';
      CX.beginPath();
      CX.moveTo(0, 7);
      CX.bezierCurveTo(-9, 0, -7, -8, 0, -3.2);
      CX.bezierCurveTo(7, -8, 9, 0, 0, 7);
      CX.closePath(); CX.fill();
      CX.fillStyle = 'rgba(255,255,255,.45)'; disco(-2.6, -2.2, 1.7);
    }
    CX.restore();
  }

  /* cofre */
  if (s.cofre){
    const c = s.cofre, X = c.cx*CELDA+CELDA/2, Y = c.cy*CELDA+CELDA/2;
    CX.fillStyle = 'rgba(0,0,0,.34)';
    CX.save(); CX.translate(X, Y+13); CX.scale(1,.4); disco(0,0,17); CX.restore();
    /* el cofre son DOS sprites y no uno con la tapa aparte: abierto y cerrado se
       dibujan distinto de la cintura para arriba, asi que partirlo obligaria a
       registrar la bisagra en la foto. */
    if (!dibSpr(c.abierto ? 'cofre_abi' : 'cofre_cer', X, Y - 4)){
    CX.fillStyle = '#6b4a2a'; redondo(X-17, Y-4, 34, 17, 4); CX.fill();
    if (c.abierto){
      CX.fillStyle = '#3a2716'; redondo(X-17, Y-19, 34, 12, 4); CX.fill();
      CX.fillStyle = '#1a1208'; CX.fillRect(X-14, Y-3, 28, 6);
    } else {
      CX.fillStyle = '#7d5730';
      CX.beginPath(); CX.moveTo(X-17, Y-4); CX.lineTo(X-17, Y-10);
      CX.quadraticCurveTo(X, Y-22, X+17, Y-10); CX.lineTo(X+17, Y-4); CX.closePath(); CX.fill();
      CX.fillStyle = '#ffc857'; CX.fillRect(X-3.5, Y-10, 7, 11);
      CX.fillStyle = 'rgba(255,255,255,.14)';
      CX.beginPath(); CX.moveTo(X-17,Y-8); CX.quadraticCurveTo(X,Y-20,X+17,Y-8);
      CX.lineTo(X+17,Y-10); CX.quadraticCurveTo(X,Y-22,X-17,Y-10); CX.closePath(); CX.fill();
    }
    }
  }
  /* la escalera: solo cuando la sala esta limpia */
  if (s.esc && s.limpia){
    const X = s.esc.cx*CELDA+CELDA/2, Y = s.esc.cy*CELDA+CELDA/2;
    const pul = .55 + .45*Math.sin(JU.t*3);
    const g = CX.createRadialGradient(X,Y,2, X,Y,44);
    g.addColorStop(0, 'rgba(255,200,87,' + (.30*pul) + ')');
    g.addColorStop(1, 'rgba(255,200,87,0)');
    CX.fillStyle = g; disco(X, Y, 44);
    if (!dibSpr('escalera', X, Y)){
      CX.fillStyle = '#080b12'; redondo(X-22, Y-20, 44, 40, 5); CX.fill();
      for (let i = 0; i < 5; i++){
        const w = 40 - i*6;
        CX.fillStyle = 'rgb(' + (54+i*9) + ',' + (48+i*8) + ',' + (62+i*10) + ')';
        CX.fillRect(X - w/2, Y - 18 + i*8, w, 6);
      }
    }
    CX.strokeStyle = 'rgba(255,200,87,' + (.55*pul) + ')'; CX.lineWidth = 2;
    CX.strokeRect(X-22, Y-20, 44, 40);
  }
}

/* ---------- la mira: un aro sobre el enemigo elegido ---------- */
function dibMira(){
  const b = JU.P.blanco;
  if (!b || !b.vivo) return;
  const r = ENEM[b.cl].r + 7 + Math.sin(JU.t*8)*1.5;
  CX.strokeStyle = 'rgba(255,200,87,.85)'; CX.lineWidth = 2;
  for (let i = 0; i < 4; i++){
    const a = i*1.5708 + JU.t*.8;
    CX.beginPath(); CX.arc(b.x, b.y, r, a+.18, a+1.39); CX.stroke();
  }
}

/* ---------- el cuadro entero ---------- */
function dibuja(){
  CX.setTransform(CV.width/AN, 0, 0, CV.height/AL, 0, 0);
  CX.fillStyle = '#05070b'; CX.fillRect(0, 0, AN, AL);
  if (!JU.pisoObj) return;
  const s = JU.sala;
  horneaPiso(s, JU.piso);

  CX.save();
  CX.translate(OX + JU.sacX, OY + JU.sacY);
  CX.scale(ESC, ESC);

  CX.drawImage(PISO_LI, 0, 0);
  dibPuertas(s);
  dibCosas(s);
  for (const p of JU.par) if (p.atras) { /* dibujadas abajo */ }
  /* orden por y: lo de abajo tapa lo de arriba, que es lo que da profundidad */
  const lista = [];
  for (const e of JU.enemV) if (e.vivo) lista.push({y:e.y, f:() => dibEnem(e)});
  lista.push({y: JU.P.y, f:() => dibJugador(JU.P)});
  lista.sort((a,b) => a.y - b.y);
  for (const o of lista) o.f();

  dibBalas();
  dibMira();
  dibPart();
  dibFlot();

  /* viñeta: empuja la vista al centro */
  const g = CX.createRadialGradient(MUNDO_W/2, MUNDO_H/2, MUNDO_H*.34,
                                    MUNDO_W/2, MUNDO_H/2, MUNDO_H*.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.52)');
  CX.fillStyle = g; CX.fillRect(0, 0, MUNDO_W, MUNDO_H);
  CX.restore();

  /* fogonazo de pantalla: el golpe se SIENTE, no solo se ve */
  if (JU.fog > 0){
    CX.fillStyle = 'rgba(255,255,255,' + (JU.fog*.33) + ')';
    CX.fillRect(0, 0, AN, AL);
  }
  if (JU.rojo > 0){
    CX.fillStyle = 'rgba(239,75,92,' + (JU.rojo*.30) + ')';
    CX.fillRect(0, 0, AN, AL);
  }
}
