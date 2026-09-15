
/* ============================================================
   EL TUTORIAL. Cinco pasos, y cada uno ESPERA A QUE SE HAGA LA
   COSA: un tutorial que se pasa leyendo se saltea, y lo que se
   saltea es exactamente lo que despues no se entiende.
   Se ve cada vez que se abre el juego, porque guardaLee() pone
   GUARDA.visto en cero DESPUES de leer el disco: dentro de la
   sesion sigue valiendo, asi que no vuelve a salir entre piso y
   piso.
   ============================================================ */
const TUT = {on:false, p:0, fin:0, rec:0, disp:0, esq:0,
             px:0, py:0, fog0:0, esq0:0, piso0:1};

/* Las condiciones son del JUEGO y no de un reloj: no se puede
   avanzar sin haber hecho la cosa. */
const TUT_PASOS = [
  {k:'pTuto1', ok:() => TUT.rec  >= 150},
  {k:'pTuto2', ok:() => TUT.disp >= 3},
  {k:'pTuto3', ok:() => TUT.esq  >= 1},
  {k:'pTuto4', ok:() => JU.sala && JU.sala.limpia && JU.sala.tipo !== 'entrada'},
  {k:'pTuto5', ok:() => JU.piso > TUT.piso0},
];

function tutArranca(){
  TUT.on = !GUARDA.visto;
  TUT.p = 0; TUT.fin = 0; TUT.rec = 0; TUT.disp = 0; TUT.esq = 0;
  TUT.fog0 = 0; TUT.esq0 = 0; TUT.piso0 = 1;
  TUT.px = JU.P ? JU.P.x : 0; TUT.py = JU.P ? JU.P.y : 0;
  tutRepinta();
}

/* Corta sin marcar visto: el que murio en el paso dos no aprendio
   nada, asi que la partida siguiente se lo vuelve a ensenar. */
function tutCorta(){
  TUT.on = false; TUT.fin = 0;
  pista(null);
}

function tutRepinta(){
  if (!TUT.on){ pista(null); return; }
  if (TUT.fin > 0) pista(T('tutoFin'));
  else pista(T(TUT_PASOS[TUT.p].k));
}

function tutPaso(dt){
  if (!TUT.on) return;
  const P = JU.P;

  /* cuanto se movio de verdad, no cuanto se empujo el joystick */
  TUT.rec += hip(P.x - TUT.px, P.y - TUT.py);
  TUT.px = P.x; TUT.py = P.y;

  /* el disparo y la esquiva se leen por FLANCO sobre el propio
     estado del jugador: asi no hace falta un contador aparte que
     se pueda desincronizar del juego */
  if (P.fog >= .999 && TUT.fog0 < .999) TUT.disp++;
  TUT.fog0 = P.fog;
  if (P.esqT > 0 && TUT.esq0 <= 0) TUT.esq++;
  TUT.esq0 = P.esqT;

  if (TUT.fin > 0){
    TUT.fin -= dt;
    if (TUT.fin <= 0){ TUT.on = false; pista(null); }
    return;
  }

  if (TUT_PASOS[TUT.p].ok()){
    TUT.p++;
    son('ui');
    if (TUT.p >= TUT_PASOS.length){
      TUT.fin = 2.4;
      GUARDA.visto = 1; guardaEscribe();   // se marca al TERMINARLO
      aviso(T('tutoFin'));
    }
    tutRepinta();
  }
}
