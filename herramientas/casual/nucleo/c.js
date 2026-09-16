/* ══════════════════════ LA CINEMÁTICA ══════════════════════
   Cuatro o cinco planos de tres segundos, dibujados en el MISMO lienzo con la
   misma tinta que el juego. Nada de fotos: una imagen pegada arriba de un juego
   de dos colores se ve pegada arriba, y eso ya costó una vuelta en POMPOM.

   TRES REGLAS, Y LAS TRES SALEN DE HABERSE EQUIVOCADO ANTES:

   1. ES UNA FUNCIÓN DEL TIEMPO, NO UNA MÁQUINA DE ESTADOS. `cinePon(t)` recibe
      el segundo y dibuja. Por eso la prueba puede fotografiar el segundo 7,4
      sin esperar siete segundos, y por eso los defectos de encuadre se
      encuentran mirando un instante en vez de mirando el código.

   2. SE PUEDE SALTEAR, CON GRACIA DE MEDIO SEGUNDO. Una cinemática obligatoria
      se ve una vez; vista cinco veces es un peaje, y un minijuego se abre
      veinte veces. La gracia no es capricho: el mismo toque que apretó JUGAR
      llega a veces como un segundo evento y se la comería entera — es
      exactamente la guarda que hizo falta en BARRIO y en POMPOM.

   3. SÓLO LA PRIMERA VEZ. Después queda en su botón del menú. */
const CINE = { on: false, t: 0, dur: 0, plano: -1, gracia: 0, alTerminar: null };

function cineArranca(alTerminar){
  CINE.on = true; CINE.t = 0; CINE.plano = -1; CINE.gracia = 0.55;
  CINE.alTerminar = alTerminar || null;
  CINE.dur = JUEGO.planos.reduce((a, p) => a + p.dur, 0);
  MODO = 'cine';
  $('cine').classList.add('on');
  $('salta').classList.add('on');
  $('hud').classList.remove('on');
  for (const p of document.querySelectorAll('.pan')) p.classList.remove('on');
}
function cineSalta(){
  if (!CINE.on || CINE.gracia > 0) return;
  cineTermina();
}
function cineTermina(){
  CINE.on = false;
  $('cine').classList.remove('on');
  $('salta').classList.remove('on');
  const f = CINE.alTerminar; CINE.alTerminar = null;
  if (f) f();
}
/* qué plano cae en el segundo `t`, y cuánto lleva ese plano corrido */
function cineDonde(t){
  let acum = 0;
  for (let i = 0; i < JUEGO.planos.length; i++){
    const p = JUEGO.planos[i];
    if (t < acum + p.dur || i === JUEGO.planos.length - 1)
      return { i, p, u: Math.max(0, Math.min(1, (t - acum) / p.dur)) };
    acum += p.dur;
  }
  return { i: 0, p: JUEGO.planos[0], u: 0 };
}
function cinePon(t){
  const d = cineDonde(t);
  /* el pie se escribe SÓLO cuando cambia de plano: escribir en el DOM en cada
     cuadro obliga al navegador a recalcular el layout sesenta veces por segundo
     para poner el mismo texto */
  if (d.i !== CINE.plano){
    CINE.plano = d.i;
    $('cine').textContent = d.p.pie ? TX(d.p.pie) : '';
  }
  g.save();
  d.p.dibuja(g, d.u, t);
  g.restore();
  /* entra y sale de negro: un corte seco desde el menú se lee a error */
  const fEnt = Math.min(1, t / 0.5);
  const fSal = Math.min(1, Math.max(0, (CINE.dur - t) / 0.5));
  const k = 1 - Math.min(fEnt, fSal);
  if (k > 0.001){ g.fillStyle = 'rgba(7,7,11,' + k.toFixed(3) + ')'; g.fillRect(0, 0, AN, AL); }
}
function cinePaso(dt){
  if (CINE.gracia > 0) CINE.gracia -= dt;
  CINE.t += dt;
  if (CINE.t >= CINE.dur) cineTermina();
}

/* ── HERRAMIENTAS DE DIBUJO QUE LOS CINCO JUEGOS COMPARTEN ──
   No es una biblioteca por prolijidad: es que un redondeo o un degradado
   escritos cinco veces terminan siendo cinco cosas distintas, y entonces los
   cinco juegos dejan de verse de la misma familia. */
function caja2(x, y, w, h, r, relleno, borde){
  g.beginPath();
  const rr = Math.min(r, w/2, h/2);
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
  if (relleno){ g.fillStyle = relleno; g.fill(); }
  if (borde){ g.strokeStyle = borde; g.lineWidth = 3; g.stroke(); }
}
function texto(s, x, y, tam, col, peso, alin){
  g.fillStyle = col || '#f2eee6';
  g.font = (peso || 800) + ' ' + tam + 'px ui-sans-serif,system-ui,sans-serif';
  g.textAlign = alin || 'center';
  g.textBaseline = 'middle';
  g.fillText(s, x, y);
}
function disco(x, y, r, col){
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}
/* el grano: lo mismo que en los juegos 3D del repo, un plano de un solo color
   se lee a plástico y con grano se lee a superficie */
function grano(x, y, w, h, k, n){
  g.save();
  for (let i = 0; i < (n || 90); i++){
    g.fillStyle = 'rgba(255,255,255,' + (Math.random()*k).toFixed(3) + ')';
    g.fillRect(x + Math.random()*w, y + Math.random()*h, 2, 2);
  }
  g.restore();
}
const suave = (u) => u*u*(3 - 2*u);
