
/* ============================================================
   EL TUTORIAL

   Cinco pasos, y CADA UNO ESPERA A QUE SE HAGA LA COSA. Un
   tutorial que se pasa leyendo se saltea, y lo que se saltea es
   exactamente lo que despues no se entiende — la leccion que este
   repo ya pago en MEKO, FLECHAS y RezUno.

   De ahi sale la decision que ordena el archivo entero: EL
   TUTORIAL NO SE COME LOS TOQUES. `tutoToque` devuelve true
   unicamente sobre su propio boton de saltear; todo lo demas pasa
   de largo al juego, porque el juego es lo que hay que hacer.

   Y ningun paso puede quedarse trabado: cada condicion tiene una
   salida por si el camino que esperaba no ocurre (la ciega se gana
   con la primera mano y no hay ocasion de descartar, o se pierde y
   no hay tienda). Un tutorial trabado es peor que ninguno.
   ============================================================ */

const TUTO = { on:false, i:0, t:0, fin:0, mem:{ man:0, desc:0 } };

function tutoArranca(){
  TUTO.on = true; TUTO.fin = 0;
  tutoEntra(0);
}
function tutoCorta(){
  TUTO.on = false; TUTO.fin = 0;
  GUARDA.visto = 1; guardaEscribe();
}
/* al entrar a un paso se guarda contra QUE se compara: los
   contadores del juego son acumulados, asi que "descarto" es
   "bajo respecto de cuando el paso empezo" y no un numero fijo */
function tutoEntra(i){
  TUTO.i = i; TUTO.t = 0;
  TUTO.mem.man = JU.totManos;
  TUTO.mem.desc = JU.desc;
}

/* La condicion de cada paso. El `||` de la segunda parte es la
   salida: si el juego se fue del sitio donde ese paso se podia
   hacer, el paso se da por hecho en vez de esperar para siempre. */
const TUTO_LISTO = [
  () => JU.totManos > TUTO.mem.man,
  () => (JU.ultima && !JU.anim) || JU.modo !== 'juega',
  () => JU.desc < TUTO.mem.desc || JU.modo !== 'juega',
  () => JU.modo === 'tienda' || JU.modo === 'fin',
  () => JU.modo === 'ciega' || JU.modo === 'juega' || JU.modo === 'fin',
];

/* Donde mirar en cada paso. Se calcula y no se escribe a mano:
   los botones y la mano salen de las mismas constantes que los
   dibujan, asi que mover el HUD no deja al tutorial senalando
   un sitio vacio. */
function tutoFoco(){
  const w = 116;
  /* un contorno latiendo sobre una pantalla donde esa cosa no se
     esta dibujando senala un sitio vacio, asi que el foco se apaga
     cuando su blanco no esta en pantalla */
  const enMesa = JU.modo === 'juega';
  const enFila = JU.modo === 'juega' || JU.modo === 'ciega';
  switch (TUTO.i){
    case 0: case 1: case 2: if (!enMesa) return null; break;
    case 3: if (!enFila) return null; break;
  }
  switch (TUTO.i){
    case 0: return [10, MANO_Y - ALZA - 4, AN - 20, MANO_H + ALZA + 8];
    case 1: return [10, PUN_Y, AN - 20, PUN_H];
    case 2: return [AN - 12 - w, BOT_Y, w, BOT_H];
    case 3: return [10, COM_Y, AN - 20, COM_H];
    default: return null;
  }
}
/* la ficha se va al lado contrario del foco: un cartel encima de
   la cosa que el cartel manda a mirar no ensena nada */
const TUTO_Y = [300, 604, 300, 300, 392];

const TUTO_BW = 120, TUTO_BH = 34;
function tutoSaltarCaja(){ return [AN - 12 - TUTO_BW, 12, TUTO_BW, TUTO_BH]; }

function tutoPaso(dt){
  if (!TUTO.on) return;
  TUTO.t += dt;
  if (TUTO.fin > 0){
    TUTO.fin -= dt;
    if (TUTO.fin <= 0) tutoCorta();
    return;
  }
  /* medio segundo de piso antes de mirar la condicion: si no, un
     paso cuya condicion ya esta cumplida al entrar pasa de largo
     sin que a nadie le de tiempo de leerlo */
  if (TUTO.t < 0.5) return;
  if (!TUTO_LISTO[TUTO.i]()) return;
  son('sube');
  if (TUTO.i >= TUTO_LISTO.length - 1){ TUTO.fin = 1.6; return; }
  tutoEntra(TUTO.i + 1);
}

function tutoPinta(){
  if (!TUTO.on) return;
  const f = TUTO_FIN_VER();
  if (f) return;

  /* el foco: un contorno que late. No se oscurece el resto —
     con un velo encima, las cartas que hay que elegir se leen
     apagadas justo cuando hay que elegirlas */
  const fo = tutoFoco();
  if (fo){
    const k = 0.5 + 0.5 * Math.sin(JU.t * 4.4);
    CX.save();
    CX.strokeStyle = '#ffd166';
    CX.globalAlpha = 0.45 + 0.45 * k;
    CX.lineWidth = 3;
    rr(fo[0] - 3, fo[1] - 3, fo[2] + 6, fo[3] + 6, 12);
    CX.stroke();
    CX.restore();
  }

  tutoFicha(TUTO_TXT()[TUTO.i], (TUTO.i + 1) + '/' + TUTO_LISTO.length);

  const b = tutoSaltarCaja();
  pintaBoton(b[0], b[1], b[2], b[3], T('saltar'), '#93a3a0', false);
}

/* el cierre: la misma ficha, sin numero y sin boton */
function TUTO_FIN_VER(){
  if (TUTO.fin <= 0) return false;
  tutoFicha(T('tutoFin'), '');
  return true;
}

const TUTO_TXT = () => (LANG[IDIOMA] && LANG[IDIOMA].tuto) || LANG.es.tuto;

function tutoFicha(s, num){
  const w = AN - 48, x = 24;
  const y = TUTO.fin > 0 ? 392 : TUTO_Y[TUTO.i];
  /* el alto sale de cuantas lineas entran de verdad: en tres
     idiomas la misma frase mide distinto y un alto fijo deja la
     ultima linea afuera o media ficha vacia */
  const ls = envuelveLineas(s, w - 28, 15, 700);
  const h = 22 + ls.length * 20 + (num ? 16 : 0);
  CX.save();
  CX.shadowColor = 'rgba(0,0,0,.55)'; CX.shadowBlur = 16; CX.shadowOffsetY = 4;
  caja(x, y, w, h, 14, '#161d20', '#ffd166', 2);
  CX.restore();
  if (num) txt(num, x + w - 14, y + 16, 9, '#ffd166', 'right', 900);
  ls.forEach((l, i) => txt(l, x + w / 2, y + 26 + i * 20 + (num ? 8 : 0), 15,
                           '#f4f1e8', 'center', 700));
}

/* SOLO el boton de saltear se come el toque. Todo lo demas tiene
   que llegar al juego: el paso se aprueba haciendo la cosa. */
function tutoToque(px, py){
  if (!TUTO.on || TUTO.fin > 0) return false;
  const b = tutoSaltarCaja();
  if (px >= b[0] && px <= b[0] + b[2] && py >= b[1] && py <= b[1] + b[3]){
    son('ui');
    tutoCorta();
    return true;
  }
  return false;
}
