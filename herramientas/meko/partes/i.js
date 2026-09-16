/* ══════════════════════════════════════════════════════════════════════════
   I · EL TUTORIAL

   SE ENTRA ACA Y NO AL MENU AL ABRIR EL JUEGO. Un juego cuyo unico verbo es
   «tocar un bloque» tiene un problema: nada en la pantalla dice que se pueda
   tocar un bloque. Un cartel de texto en el menu no lo arregla —se saltea— y
   lo que se saltea es exactamente lo que despues no se entiende.

   CUATRO PASOS Y CADA UNO ESPERA A QUE SE HAGA LA COSA. No se pueden pasar
   leyendo: el paso 2 no aparece hasta que el robot camino, el 3 hasta que el
   diorama giro, el 4 hasta que la pieza se movio. Es la misma regla que ya
   ordeno el tutorial de ECO, el de RECREO y el de DUNA — y la razon por la
   que el orden no importa: si el jugador toca la pieza naranja antes de
   caminar, el paso simplemente ya esta hecho.

   EL MUNDO ESTA ESCRITO A MANO Y NO GENERADO, y es la unica pieza de este
   juego que lo esta. El generador tira niveles validos; un tutorial necesita
   una forma CONOCIDA —dos mesetas, un hueco y una sola pieza que lo cierra—
   porque cada paso nombra una cosa concreta de la pantalla. Un tutorial cuya
   geometria cambia cada vez no puede decir «el bloque de allá».            */

const TUTO_PAL = 3;                       /* la verde: es la mas legible de las cuatro */

function mundoTuto() {
  const M = nuevoMundo(9, 6, 7);
  /* las dos mesetas: x 1..3 y x 5..7, con el hueco en x=4. La cara de arriba
     queda en y=2, o sea que las celdas pisables son (x,2,z).               */
  const meseta = (x0, x1) => {
    for (let x = x0; x <= x1; x++) for (let z = 2; z <= 4; z++) {
      pon(M, x, 0, z, PIEDRA);
      pon(M, x, 1, z, PASTO);
    }
  };
  meseta(1, 3); meseta(5, 7);
  /* CINCO PIEZAS DE ADORNO, TODAS EN z=2, Y ESO NO ES UN GUSTO: LA CAMARA
     MIRA DESDE +X +Z, ASI QUE z=4 ES EL FRENTE. Con adornos ahi, un bloque
     puesto en (x,2,4) le queda ENCIMA en pantalla al bloque de (x,1,3) que
     hay que tocar — medido: tocando el pixel del dorado con un adorno
     delante, el rayo pegaba en el adorno y el robot terminaba en (7,3,4) en
     vez de (7,2,4). Un tutorial cuyo unico paso preciso se puede fallar por
     una decoracion no ensena, frustra.
     Y x=3,4,5 se dejan LIBRES en z=2: por ahi pasa el cruce cuando el puente
     llega, asi que un adorno ahi no tapa nada — cierra el nivel. */
  pon(M, 1, 2, 2, LADRILLO); pon(M, 1, 3, 2, LADRILLO);
  pon(M, 2, 2, 2, LADRILLO);
  pon(M, 7, 2, 2, MADERA);   pon(M, 7, 3, 2, MADERA);

  /* LA META ES LA CELDA EN LA QUE EL ROBOT SE PARA y el bloque de abajo es el
     dorado: al reves, el rombo flotaria sobre un bloque que nadie pisa.
     VA EN LA FILA DE ADELANTE (z=4) justamente por lo de arriba: es el unico
     bloque del tutorial que hay que tocar con punteria, asi que no puede
     tener nada delante. */
  M.meta = [7, 2, 4];
  pon(M, 7, 1, 4, META);
  M.ini = [1, 2, 3];

  /* EL PUENTE ESTA APARCADO FUERA DE LA FILA POR LA QUE SE CRUZA. En z=1 no
     toca ninguna de las dos mesetas —empiezan en z=2— asi que el hueco es
     infranqueable hasta que alguien lo toca, que es todo el punto del paso 3.
     Un paso: se toca una vez y el puente esta. */
  M.mec = [{ tipo: 'puente', cel: [[4, 1, 1]], dir: [0, 0, 1], pasos: 1, bloq: METAL }];
  M.paleta = TUTO_PAL;
  /* el plan sale del mismo resolvedor que el de los veinte niveles: el
     tutorial tiene que estar comprobado como cualquier otro nivel, y ademas
     el panel de victoria lee `M.plan` */
  M.plan = resuelve(M);
  return M;
}

/* el tutorial pasa por la MISMA carga que un nivel —la pantalla, el diorama,
   el robot, la musica— y lo unico que cambia es de donde sale el mundo. Con
   una carga propia, cada cosa que se agregue a `cargaNivel` hay que acordarse
   de agregarla aca tambien. */
function cargaTuto() {
  JU.n = -1; JU.tuto = true;
  $('carga').classList.remove('ido');
  $('cBarra').style.width = '18%';
  clearTimeout(JU.ganaT);
  verPanel(null);
  setTimeout(() => {
    const M = mundoTuto();
    JU.M = M; JU.E = estados0(M); JU.toques = 0; JU.fin = false;
    JU.mecT = 9; JU.mecI = -1;
    JU.hizoAndar = false; JU.hizoMec = false; JU.hizoGirar = false; JU.pistaK = null;
    $('cBarra').style.width = '78%';
    construyeDiorama(M);
    robEntra(M.ini);
    musRaiz(RAICES[TUTO_PAL % RAICES.length]);
    pintaHud();
    $('cBarra').style.width = '100%';
    setTimeout(() => $('carga').classList.add('ido'), 60);
  }, 40);
}

/* auditoria: un tutorial que no se puede terminar es peor que ninguno, y la
   unica forma de saberlo es resolverlo con el mismo BFS que los demas.
   Comprueba ademas que el hueco sea de VERDAD infranqueable sin tocar la
   pieza — sin eso el paso 3 se saltea solo y el tutorial no ensena nada.  */
function auditaTuto() {
  const M = mundoTuto();
  const plan = M.plan;
  const sinMec = resuelve(M, [0]);       /* con el mecanismo congelado en e=0 */
  const v = plan ? verificaPlan(M, plan) : { ok: false, por: 'sin plan' };
  const ok = !!plan && !sinMec && v.ok;
  return { ok, toques: plan ? plan.length : 0, sinMec: !sinMec, por: v.por,
           plan: plan ? plan.map(a => a.t === 'mec' ? 'mec' + a.i : 'ir' + a.c.join(',')) : null };
}
