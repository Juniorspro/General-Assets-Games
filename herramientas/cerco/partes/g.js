/* ══════════════════════════════════════════════════════════════════════════
   g.js · EL TUTORIAL: cuatro cosas que HACER y una que mirar
   ──────────────────────────────────────────────────────────────────────────
   CADA PASO ESPERA A QUE SE HAGA LA COSA. Un tutorial que avanza con el reloj
   se saltea leyendo, y lo que se saltea es exactamente lo que despues no se
   entiende. Los cuatro primeros pasos tienen una CONDICION medida sobre el
   mismo modelo que juega el juego —el rumbo del cuerpo, la estela, los
   cerrados, las celdas ganadas— asi que no se puede pasar sin entender.

   Y NO HAY RIVAL (`riv: 0`). Con uno, el tutorial tiene un cuerpo suelto que
   puede pisarte la estela en el medio del paso 3 y dejarte esperando una
   condicion que acaba de romper. Nadie aprende a cercar mientras lo cazan.
   Lo que se pierde es la regla que no se puede practicar solo —que te corten—
   y por eso el paso 5 es un cartel y no una prueba: es la unica del juego que
   no se puede ensayar sin alguien enfrente.

   SE PUEDE SALTEAR, y no es una cortesia: `PROG.visto` se pone en cero DESPUES
   de leer el disco, o sea que esto sale CADA VEZ que se abre el juego.
   Obligatorio una vez es un tutorial; obligatorio siempre es un peaje.
   ══════════════════════════════════════════════════════════════════════ */

const TUT = { on: false, paso: 0, t: 0, fin: 0 };

/* el minimo que un cartel tiene que estar en pantalla antes de que su
   condicion pueda darse por cumplida: si no, un paso que ya estaba hecho
   —el dedo venia arrastrando— parpadea y no lo lee nadie. */
const TUT_LEER = 0.9;
const TUT_CIERRE = 2.6;   /* el paso 5 no se hace, se mira */

/* EL PLANETA DEL TUTORIAL ES CHICO Y PELADO. Con n=12 la circunferencia son
   48 celdas contra las 19 de la vista: un cuarto de vuelta entra en pantalla
   de una, asi que se ve de donde se salio mientras se vuelve. En un tutorial
   sin mapa chico —esta apagado— eso es lo unico que reemplaza al mapa. Sin
   piedras, porque ninguno de los cinco pasos habla de piedras.

   Y CHICO TIENE UN SEGUNDO TRABAJO EN LA ESFERA: 864 celdas es el unico
   tamano en el que el paso 4 —«una vuelta grande», 40 celdas ganadas— es una
   fraccion del planeta que se ve crecer. En uno de 8.664 son el 0,46 % y la
   vuelta no se nota.                                                        */
function tutCfg() {
  return {
    mundo: -1, nivel: -1, pat: 'vacio', n: 12, riv: 0,
    per: 0.6, meta: 1.1, seg: 0, sem: 20260911,
  };
}

/* cuanto terreno cuenta como «una vuelta grande». La casa son 5x5 = 25
   celdas, asi que 40 es rodear una superficie mas ancha que la propia casa:
   se llega con una vuelta de nueve por nueve y no se llega pegandose a la
   pared de casa, que es justo la diferencia que el paso 4 quiere ensenar. */
const TUT_GRANDE = 40;

const TUT_PASOS = [
  { k: 'tut1', ok: () => P.giros >= 1 },
  { k: 'tut2', ok: () => P.yo.estela >= 5 },
  { k: 'tut3', ok: () => P.yo.cerros >= 1 },
  { k: 'tut4', ok: () => P.ganUlt >= TUT_GRANDE },
  { k: 'tut5', ok: () => false },            /* este se mira, no se hace */
];

function tutArranca() {
  TUT.on = true; TUT.paso = 0; TUT.t = 0; TUT.fin = 0;
  partidaArranca(-1, -1, true);
  cl2($('tSalt'), 'on', true);
  $('tSalt').textContent = TX('salt');
  tutPista();
}

function tutPista() {
  const p = TUT_PASOS[TUT.paso];
  const e = $('pista');
  if (!p) { cl2(e, 'on', false); return; }
  e.textContent = TX(p.k);
  cl2(e, 'on', true);
}

function tutPaso(dt) {
  if (!TUT.on || !P.on || P.pausa || P.fin) return;
  TUT.t += dt;
  const p = TUT_PASOS[TUT.paso];
  if (!p) return;

  /* el ultimo no tiene condicion: se queda el rato que tarda en leerse y
     cierra por el mismo camino que gana un nivel, asi que la fanfarria, el
     marcador y el panel son los de siempre y no una segunda contabilidad. */
  if (TUT.paso === TUT_PASOS.length - 1) {
    if (TUT.t >= TUT_CIERRE) termina('gana');
    return;
  }

  if (TUT.t < TUT_LEER || !p.ok()) return;
  TUT.paso++; TUT.t = 0;
  son('des');
  tutPista();
}

/* EL CIERRE PASA POR `finPon` Y NO ESCRIBE EL PANEL A MANO: cambiar de idioma
   con el panel puesto tiene que repintarlo, y el unico que sabe repintarlo es
   el pintor. Con dos, el del tutorial es el que se queda viejo.            */
function tutFin() {
  TUT.on = false;
  cl2($('pista'), 'on', false);
  cl2($('tSalt'), 'on', false);
  PROG.visto = 1; guardaProg();
  finPon({ tuto: true });
  verPanel('pFin');
}

/* saltear deja el tutorial por hecho y devuelve al MENU y no al juego: el que
   lo salteo no eligio todavia que jugar. El que lo termina si —por eso su
   panel ofrece JUGAR—.                                                     */
function tutSalta() {
  if (!TUT.on) return;
  TUT.on = false;
  son('ui');
  PROG.visto = 1; guardaProg();
  partidaSale();
  vaMenu();
}
