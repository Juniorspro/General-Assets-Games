
/* ══════════════════════════ EL JUEGO ══════════════════════════ */
const J = {
  modo: 'carga',       /* carga · idioma · menu · juega · fin */
  nivel: 1, vidas: M.vidas, hechos: 0, mejor: 0,
  lento: 0,            /* 0 normal, 1 camara lenta */
  apretado: false, dedo: null, angBase: 0,
  t: 0, msg: '', msgT: 0, fin: '', trazo: null
};

/* ── EL RELOJ DEL MUNDO Y EL DE LA PANTALLA SON DOS ──
   La camara lenta estira el tiempo del MUNDO; la interfaz, el fundido y el
   propio arrastre del dedo van a velocidad real. Ralentizando los dos, soltar
   el dedo tardaria en registrarse y el juego se leeria a colgado y no a camara
   lenta. Es la misma leccion de ARCO. */
function pasoJuego(dt){
  const obj = J.apretado ? 1 : 0;
  J.lento += cl((obj - J.lento)*dt/M.entraLento, -1, 1);
  J.lento = cl(J.lento, 0, 1);
  post.uniforms.uLento.value = J.lento;
  $('lento').classList.toggle('on', J.lento > 0.35);

  if (J.msgT > 0) J.msgT = Math.max(0, J.msgT - dt);
  if (J.modo !== 'juega') return;

  const dtm = dt*lerp(1, M.lento, J.lento);
  J.t += dtm;
  /* ── PASO FIJO Y NO EL `dt` DEL CUADRO ──
     Un telefono a 30 y una notebook a 144 tienen que jugar el MISMO juego: con
     el dt del cuadro el rebote y el alcance del retroceso salen distintos, y eso
     no es una diferencia de rendimiento, es otro juego. */
  ACU += dtm;
  let n = 0;
  while (ACU >= PASO && n < 8){ simula(PASO); ACU -= PASO; n++; }
  if (n >= 8) ACU = 0;
}
const PASO = 1/120;
let ACU = 0;

function simula(dt){
  pasoPistola(dt);
  pasoBalas(dt, alGolpe);
  pasoLadrones(dt, alGolpe);
  if (vivos() === 0 && J.modo === 'juega') gana();
}

function alGolpe(que, x, y, obj){
  if (que === 'ladron'){ son('mata'); chispas(x, y, 16, 0xff5a4a); sacude(0.5); }
  else if (que === 'caja'){ son('caja'); chispas(x, y, 12, 0xc9a06a); sacude(0.3); }
  else if (que === 'muro'){ chispas(x, y, 5, 0xfff0c0); }
  else if (que === 'lad_tira'){ son('ladtira'); }
  else if (que === 'yo'){ pierdeVida(); }
}

function pierdeVida(){
  J.vidas--;
  son('daño'); sacude(1.0); chispas(P.x, P.y, 22, 0xff3c2a);
  if (J.vidas <= 0){ pierde(); return; }
  aviso(TX('vidas') + ' ' + J.vidas, 0.9);
  pistolaPone(0, 0.9);
  pintaHud();
}

function empieza(n){
  J.nivel = n; J.vidas = M.vidas; J.t = 0; ACU = 0;
  generaNivel(n);
  construyeEscena();
  pistolaPone(0, 0.9);
  J.modo = 'juega';
  $('menu').classList.remove('on'); $('fin').classList.remove('on');
  $('pista').textContent = n <= 2 ? TX('p1') : '';
  pintaHud();
  musQuiere('juego');
}

function gana(){
  J.modo = 'fin'; J.fin = 'gano';
  J.hechos = Math.max(J.hechos, J.nivel);
  guarda();
  son('gana');
  const ult = J.nivel >= NIVELES;
  $('fTitulo').textContent = ult ? TX('fin') : TX('gano');
  $('fSub').textContent = TX('nivel') + ' ' + J.nivel;
  $('fTexto').textContent = ult ? TX('finT') : '';
  $('bSigue').textContent = ult ? TX('menu') : TX('sigue');
  $('bSigue').dataset.ult = ult ? '1' : '';
  $('fin').classList.add('on');
  musQuiere('menu');
}

function pierde(){
  J.modo = 'fin'; J.fin = 'perdio';
  son('pierde');
  $('fTitulo').textContent = TX('perdio');
  $('fSub').textContent = TX('nivel') + ' ' + J.nivel;
  $('fTexto').textContent = '';
  $('bSigue').textContent = TX('reintenta');
  $('bSigue').dataset.ult = '';
  $('fin').classList.add('on');
  musQuiere('menu');
}

function aviso(t, seg){ J.msg = t; J.msgT = seg || 1.1;
  $('aviso').textContent = t; $('aviso').classList.add('on'); }

function pintaHud(){
  $('fNivel').textContent = TX('nivel') + ' ' + J.nivel + '/' + NIVELES;
  $('fVidas').textContent = TX('vidas') + ' ' + J.vidas;
  $('fLadrones').textContent = TX('ladrones') + ' ' + vivos();
}

function guarda(){
  try { localStorage.setItem('pistola_hechos', String(J.hechos)); } catch(e){}
}
function carga(){
  try {
    J.hechos = parseInt(localStorage.getItem('pistola_hechos') || '0', 10) || 0;
    const c = localStorage.getItem('pistola_cal');
    if (c && CALIDADES[c]) CALIDAD = c;
    const l = localStorage.getItem('pistola_lang');
    if (l && TXT[l]) { LANG = l; return true; }
  } catch(e){}
  return false;
}

/* ══════════════════════════ EL AUTO-JUGADOR ══════════════════════════
   ── SIRVE PARA DOS COSAS Y LAS DOS HACEN FALTA ──
   Es la auditoria —un nivel generado y no jugado es un nivel roto que todavia
   no se sabe— y es la unica prueba de que hay una decision adentro: si el que
   elige el angulo mirando el mundo termina igual que el que dispara al azar,
   apuntar no importa y el juego es un boton.

   El honesto NO usa una formula: prueba. Para cada angulo candidato traza la
   bala con el MISMO rayo del juego y vuela el retroceso con la MISMA fisica,
   ochenta centesimas hacia adelante. Es la regla que ya ordeno CASTILLO, PENAL
   y GRUA en este repo. */
function botMeta(){
  const bajo = MUNDO.lad.filter(l => l.vivo).sort((a, b) => a.y - b.y)[0];
  if (!bajo) return null;
  /* ── SI EL QUE TOCA ESTA ARRIBA, EL DESTINO ES EL HUECO Y NO EL LADRON ──
     Con el ladron como unico destino, «acercarse» empuja contra el canto de la
     losa: medido, la pistola se quedaba en maxY 4,47 debajo de una losa a 4,60,
     600 tiros y CERO muertos. Es la misma leccion que en NIEVE, donde apuntar al
     medio de la puerta tiraba a la basura medio hueco de ventaja. */
  const h = MUNDO.huecos.filter(q => q.y > P.y + 0.35 && q.y < bajo.y)
                        .sort((a, b) => a.y - b.y)[0];
  if (h) return { x: h.x, y: h.y + 1.4, hueco: true };
  return { x: bajo.x, y: bajo.y + 0.7, hueco: false };
}

function botElige(ciego){
  const N = 48;
  let mejor = null, mejorP = -1e9;
  const bajo = botMeta();
  for (let i = 0; i < N; i++){
    const ang = i*(6.283/N);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let p = 0;
    const h = rayo(P.x + dx*M.boca, P.y + dy*M.boca, dx, dy, 26, false);
    if (h && h.tipo === 'ladron') p += 1000 - h.t*4;
    else if (h && h.tipo === 'caja') p += 12;
    /* y despues, donde queda uno: el tiro que mata pero te deja clavado abajo
       cuesta el turno siguiente */
    const c = { x: P.x, y: P.y, vx: P.vx, vy: P.vy, ang, cd: 0, apoyada: false };
    aplicaRetro(c, ang);
    for (let s = 0; s < 120; s++) pasoCuerpo(c, 1/120);
    if (bajo){
      /* acercarse al ladron mas bajo que queda vivo: es la unica direccion que
         siempre sirve, porque hay que matarlos a todos */
      const d0 = Math.hypot(P.x - bajo.x, P.y - bajo.y);
      const d1 = Math.hypot(c.x - bajo.x, c.y - bajo.y);
      p += (d0 - d1)*40;
      /* y ganar altura vale, porque las losas tapan el tiro desde abajo */
      p += (c.y - P.y)*14;
      /* ── Y SE PREMIA HABER CRUZADO EL HUECO, no haberse acercado a el ──
         Acercarse al hueco desde abajo y quedarse pegado a la losa puntua casi
         igual que atravesarlo, asi que sin este termino el bot se queda un
         palmo por debajo para siempre. */
      if (bajo.hueco && c.y > bajo.y - 0.6) p += 260;
    }
    /* las balas enemigas en vuelo: pasar por donde va una es perder una vida */
    for (const b of BAL){
      if (b.mia || ciego) continue;
      const ax = c.x - b.x, ay = c.y - b.y;
      const t = cl(ax*b.dx + ay*b.dy, 0, b.v*0.8);
      const ex = ax - b.dx*t, ey = ay - b.dy*t;
      if (ex*ex + ey*ey < 0.36) p -= 400;
    }
    if (p > mejorP){ mejorP = p; mejor = ang; }
  }
  return mejor;
}

function juegaSolo(azar, tope, ciego){
  const dt = 1/120;
  let gana = 0, malos = [], tiros = 0, matados = 0, vueltas = 0, muertes = 0;
  for (let n = 1; n <= NIVELES; n++){
    generaNivel(n);
    pistolaPone(0, 0.9);
    let vidas = M.vidas, v = 0, ok = false;
    const alGolpeBot = (que, x, y, obj) => {
      if (que === 'ladron') matados++;
      if (que === 'yo'){ vidas--; pistolaPone(0, 0.9); }
    };
    while (v < (tope || 26000)){
      v++; vueltas++;
      if (P.cd <= 0){
        P.ang = azar ? Math.random()*6.283 : botElige(ciego);
        P.vang = 0;
        const dx = Math.cos(P.ang), dy = Math.sin(P.ang);
        P.cd = M.cadencia;
        BAL.push({ x: P.x + dx*M.boca, y: P.y + dy*M.boca,
                   dx, dy, v: M.bala, t: 1.3, mia: true });
        aplicaRetro(P, P.ang);
        tiros++;
      }
      pasoCuerpo(P, dt);
      pasoBalas(dt, alGolpeBot);
      pasoLadrones(dt, alGolpeBot);
      if (vivos() === 0){ ok = true; break; }
      if (vidas <= 0){ muertes++; break; }
    }
    if (ok) gana++; else malos.push(n);
  }
  return JSON.stringify({ niveles: NIVELES, gana, malos, nMalos: malos.length,
                          tiros, matados, muertes, vueltas,
                          tasa: tiros ? +(matados/tiros).toFixed(3) : 0 });
}

/* ── LA AUDITORIA DEL MAPA ──
   Lo que el auto-jugador no puede contestar: si el nivel esta bien FORMADO.
   Un ladron dentro de una losa, un hueco que no se puede cruzar o un piso sin
   ladrones son defectos que el bot tapa jugando alrededor. */
function audita(){
  const malos = [];
  let minL = 99, maxL = 0, minH = 99;
  for (let n = 1; n <= NIVELES; n++){
    generaNivel(n);
    const A = M.ancho/2;
    if (MUNDO.lad.length === 0) malos.push([n, 'sin ladrones']);
    minL = Math.min(minL, MUNDO.lad.length); maxL = Math.max(maxL, MUNDO.lad.length);
    for (let i = 0; i < MUNDO.lad.length; i++){
      const l = MUNDO.lad[i];
      if (Math.abs(l.x) + 0.34 > A) malos.push([n, 'ladron ' + i + ' fuera de la torre']);
      /* ── QUE NO ESTE METIDO EN NADA, Y SE PRUEBA CONTRA LO QUE HAY ──
         Un ladron dentro de una caja o de una placa de acero es imposible de
         matar: la bala choca con lo que lo tapa antes de llegar. */
      for (const r of MUNDO.acero.concat(MUNDO.cajas))
        if (l.x + 0.34 > r.x && l.x - 0.34 < r.x + r.w &&
            l.y + 1.5 > r.y && l.y < r.y + r.h)
          malos.push([n, 'ladron ' + i + ' metido en ' + r.t]);
      /* y que tenga PISO: uno flotando sobre el hueco se lee a error */
      let piso = false;
      for (const r of MUNDO.losas)
        if (Math.abs(l.y - (r.y + r.h)) < 0.02 && l.x > r.x - 0.1 && l.x < r.x + r.w + 0.1)
          piso = true;
      if (!piso) malos.push([n, 'ladron ' + i + ' sin piso']);
    }
    /* el hueco de cada losa tiene que dejar pasar a la pistola */
    for (let p = 1; p <= MUNDO.pisos; p++){
      const y = p*M.piso;
      const tr = MUNDO.losas.filter(r => Math.abs(r.y - y) < 0.01 && r.t === 'losa');
      if (tr.length === 2){
        const h = Math.min(tr[0].x + tr[0].w, tr[1].x) < Math.max(tr[0].x + tr[0].w, tr[1].x)
                ? Math.abs(tr[1].x - (tr[0].x + tr[0].w)) : 0;
        minH = Math.min(minH, h);
        if (h < R_PIS*2 + 0.25) malos.push([n, 'hueco del piso ' + p + ' de ' + h.toFixed(2)]);
      }
    }
  }
  return JSON.stringify({ niveles: NIVELES, malos: malos.slice(0, 10),
                          nMalos: malos.length, ladrones: [minL, maxL],
                          huecoMin: +minH.toFixed(2) });
}
