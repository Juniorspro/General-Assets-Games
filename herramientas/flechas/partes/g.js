/* ══════════════════════════════════════════════════════════════════════════
   G · EL TUTORIAL
   Cuatro pasos, y CADA UNO ESPERA A QUE SE HAGA LA COSA: un tutorial que se
   pasa leyendo se saltea, y lo que se saltea es justo lo que despues no se
   entiende. Se ve APENAS EMPIEZA el juego —pedido textual— y vuelve a verse
   en cada arranque, porque la marca se descarta al leer el disco.
   ══════════════════════════════════════════════════════════════════════════ */

/* EL UNICO TABLERO ESCRITO A MANO DE TODO EL JUEGO, y tiene que serlo: cada
   paso nombra una flecha concreta («ésa no puede», «la que estorba») y un
   tablero que cambia cada vez no puede decir eso. Igual se COMPRUEBA con la
   misma regla que los 120 generados — ver `__F.audTut()`.                  */
function tabTutorial() {
  const T = nuevoTab(5, 6);
  const cels = [
    [[2, 1], [2, 0]],                 /* A · arriba, la cabeza en el borde  */
    [[0, 2], [1, 2]],                 /* B · derecha, tapada por C          */
    [[2, 2], [3, 2]],                 /* C · derecha, libre — es la que estorba */
    [[0, 4], [1, 4], [2, 4]],         /* D · derecha, tapada por E          */
    [[4, 5], [4, 4]],                 /* E · arriba, libre                  */
  ];
  for (let i = 0; i < cels.length; i++) {
    const p = { i, cel: cels[i], fuera: false };
    T.piezas.push(p); pon(T, p);
  }
  T.tut = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  T.orden = [4, 3, 2, 1, 0];
  return T;
}

const TUT = { paso: 0 };
function tutArranca() { TUT.paso = 0; tutPinta(); }
function tutPinta() { pistaVer('tut' + (TUT.paso + 1)); }

/* Que se puede tocar en cada paso. Cerrar el resto no es paternalismo: con
   todo abierto, el paso 2 —«ésa no puede»— depende de que el jugador toque
   justo la que el cartel nombra, y si toca otra el cartel miente.          */
function tutDeja(p) {
  const K = JU.T.tut;
  if (TUT.paso === 0) return p.i === K.A;
  if (TUT.paso === 1) return p.i === K.B;
  if (TUT.paso === 2) return p.i === K.C;
  return true;
}
function tutMira(ev, p) {
  const K = JU.T.tut;
  if (TUT.paso === 0 && ev === 'saca' && p.i === K.A) { TUT.paso = 1; tutPinta(); return; }
  if (TUT.paso === 1 && ev === 'falla' && p.i === K.B) { TUT.paso = 2; tutPinta(); return; }
  if (TUT.paso === 2 && ev === 'saca' && p.i === K.C) { TUT.paso = 3; tutPinta(); return; }
}
