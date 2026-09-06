/* ══════════════════════ EL PROGRESO Y LA REJA DE NIVELES ══════════════════════
   Lo que separa un casual adictivo de un minijuego: que lo que hiciste QUEDE.
   Sin progreso guardado, un rompecabezas de doscientos niveles es el nivel 1
   doscientas veces — no hay a qué volver.

   TRES COSAS QUE ESTO TIENE QUE HACER BIEN:

   1. NO PUEDE FALLAR SI NO HAY DISCO. `localStorage` TIRA en una ventana
      privada, y esto se abre desde enlaces todo el tiempo. Todo va envuelto en
      `try`: sin disco el juego se juega igual y lo único que se pierde es el
      progreso, que es infinitamente mejor que una pantalla en blanco.
   2. LO QUE SE GUARDA ES LO MEJOR, NO LO ÚLTIMO. Rejugar un nivel que ya salió
      con tres estrellas y hacerlo con una no puede BAJARLE la nota: eso castiga
      justamente al que vuelve a jugar.
   3. EL FORMATO TIENE QUE SOBREVIVIR A UN JSON ROTO. Una versión anterior del
      juego, un dedo en la consola, media escritura: `JSON.parse` tira y ahí se
      cae el módulo entero. Va con `try` y con respaldo a vacío. */

const PROG = { est: {}, ultimo: 1 };
const P_CLAVE = 'cas_' + JUEGO.id + '_prog';

function progCarga(){
  try {
    const s = localStorage.getItem(P_CLAVE);
    if (!s) return;
    const o = JSON.parse(s);
    if (o && typeof o === 'object'){
      if (o.est && typeof o.est === 'object') PROG.est = o.est;
      if (o.ultimo) PROG.ultimo = o.ultimo|0;
    }
  } catch(e){ PROG.est = {}; PROG.ultimo = 1; }
}
function progGuarda(){
  try { localStorage.setItem(P_CLAVE, JSON.stringify(PROG)); } catch(e){}
}
/* cuántos niveles tiene este juego; los de puntaje devuelven 0 */
function progTotal(){ return JUEGO.nivelesTotal || 0; }
/* el 1 siempre está abierto; el resto pide que el anterior esté hecho */
function progAbierto(n){ return n <= 1 || PROG.est[n-1] != null; }
function progHecho(n){ return PROG.est[n] != null; }
function progEstrellas(n){ return PROG.est[n] || 0; }
/* el primero que falta: es el nivel que abre el botón JUGAR, así que quien
   vuelve al juego sigue donde estaba en vez de tener que buscarlo en la reja */
function progSiguiente(){
  const T = progTotal();
  for (let n = 1; n <= T; n++) if (!progHecho(n)) return n;
  return T;                      /* están todos: se queda en el último */
}
function progGana(n, estrellas){
  const e = Math.max(1, Math.min(3, estrellas|0));
  if (!(PROG.est[n] > e)) PROG.est[n] = e;   /* nunca baja la nota */
  PROG.ultimo = Math.max(PROG.ultimo, Math.min(progTotal(), n+1));
  progGuarda();
}
function progContados(){
  let n = 0, e = 0;
  for (const k in PROG.est){ n++; e += PROG.est[k]|0; }
  return { hechos: n, estrellas: e };
}

/* ── LA REJA SE ARMA UNA VEZ Y DESPUÉS SÓLO SE REPINTA ──
   Doscientos botones creados de nuevo en cada visita al selector son doscientos
   nodos que el navegador tiene que descartar y volver a hacer, y encima se
   pierde la posición del deslizamiento: el jugador vuelve del nivel 140 y la
   reja lo deja arriba de todo, mirando el 1. */
let _rejaHecha = false;
function rejaArma(){
  const T = progTotal();
  if (_rejaHecha || !T) return;
  const r = $('rejaN');
  r.innerHTML = '';
  for (let n = 1; n <= T; n++){
    const b = document.createElement('button');
    b.className = 'nv';
    b.dataset.n = n;
    b.innerHTML = '<span class="num">' + n + '</span><span class="es"></span>';
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const k = +b.dataset.n;
      if (!progAbierto(k)) return;
      son('clic');
      empieza(k);
    });
    r.appendChild(b);
  }
  /* el alto de la reja sale de lo que sobra entre el título y el botón MENÚ; en
     px y no en vh porque el marco puede ser más chico que la ventana */
  r.style.maxHeight = Math.round(caja.clientHeight * 0.66) + 'px';
  _rejaHecha = true;
}
function rejaPinta(){
  const T = progTotal();
  if (!T) return;
  const r = $('rejaN');
  for (const b of r.children){
    const n = +b.dataset.n;
    const ab = progAbierto(n), e = progEstrellas(n);
    b.classList.toggle('trabado', !ab);
    b.classList.toggle('hecho', e > 0);
    b.disabled = !ab;
    b.querySelector('.es').textContent = e ? '★'.repeat(e) : '';
  }
}
function verNiveles(){
  MODO = 'niveles';
  rejaArma();
  rejaPinta();
  verPantalla('pNiveles');
  /* deja a la vista el primero que falta: con doscientos niveles, abrir la reja
     arriba de todo obliga a deslizar medio minuto para llegar a donde uno iba */
  const b = $('rejaN').querySelector('[data-n="' + progSiguiente() + '"]');
  if (b) $('rejaN').scrollTop = Math.max(0, b.offsetTop - $('rejaN').clientHeight*0.35);
}
