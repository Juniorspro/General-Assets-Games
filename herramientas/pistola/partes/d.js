
/* ══════════════════════════ EL NIVEL ══════════════════════════
   Una TORRE de losas con un hueco en cada una. Y esa es la decision de diseño
   entera: la losa es lo que TAPA la linea de tiro a los de arriba, asi que
   matar a todos obliga a subir, y subir obliga a usar el retroceso. Sin las
   losas, la pistola se queda en el suelo apuntando y el juego se resuelve sin
   moverse — que es exactamente lo que la fisica esta para evitar.

   Todo lo del mundo son cajas alineadas a los ejes, asi que el choque y el
   trazado de la bala son la misma prueba para todo. */
const MUNDO = { losas: [], cajas: [], acero: [], lad: [], huecos: [], alto: 0, pisos: 0 };

function esRect(x, y, w, h, t){ return { x, y, w, h, t }; }

/* ── EL GENERADOR ──
   Cinco cosas crecen con el nivel: los pisos, los ladrones, cuanto acero hay
   —que es lo que tapa el tiro—, cada cuanto disparan y cuanto se angosta el
   hueco. Y una BAJA: el hueco de la losa, que es por donde se sube. */
function generaNivel(n){
  sem(n*2654435761 + 17);
  const k = (n - 1)/(NIVELES - 1);
  const pisos = 3 + Math.round(k*4);
  const hueco = 1.75 - k*0.55;
  const A = M.ancho/2;

  MUNDO.losas.length = 0; MUNDO.cajas.length = 0;
  MUNDO.acero.length = 0; MUNDO.lad.length = 0; MUNDO.huecos.length = 0;
  MUNDO.pisos = pisos;
  MUNDO.alto = pisos*M.piso + 3.2;

  /* el suelo y las dos paredes: la torre es cerrada, asi que la pistola rebota
     y no se puede perder. Un juego de fisica en el que el heroe se va de la
     pantalla no es dificil, es injugable. */
  MUNDO.losas.push(esRect(-A, -1.2, A*2, 1.2, 'piso'));
  MUNDO.losas.push(esRect(-A - 1, -1.2, 1, MUNDO.alto + 3, 'pared'));
  MUNDO.losas.push(esRect(A, -1.2, 1, MUNDO.alto + 3, 'pared'));
  MUNDO.losas.push(esRect(-A, MUNDO.alto, A*2, 1, 'techo'));

  for (let p = 1; p <= pisos; p++){
    const y = p*M.piso;
    /* ── EL HUECO NO CAE DONDE SEA: SE ALTERNA DE LADO ──
       Con los huecos sorteados libres, dos seguidos caen en la misma columna y
       el nivel se pasa subiendo en linea recta sin doblar. Alternando, cada
       piso obliga a cruzar, que es donde el retroceso se convierte en una
       decision y no en un boton de subir. */
    const lado = (p % 2 === 0) ? 1 : -1;
    const hx = lado*azr(A*0.28, A*0.62);
    /* ── LA LOSA ES GRUESA A PROPOSITO ──
       Con 42 centimetros y la camara de tres cuartos, el piso es una LINEA: no
       hay canto que ilumine y la torre se lee a un dibujo plano. A setenta se le
       ve el espesor, que es lo unico que dice que es un piso. */
    MUNDO.losas.push(esRect(-A, y, (hx - hueco/2) + A, 0.70, 'losa'));
    MUNDO.losas.push(esRect(hx + hueco/2, y, A - (hx + hueco/2), 0.70, 'losa'));
    /* ── EL HUECO SE ANOTA, NO SE VUELVE A DEDUCIR ──
       El auto-jugador tiene que apuntar AL HUECO cuando el ladron que le toca
       esta arriba: con el ladron como unico destino, la pistola tira contra el
       canto de la losa y se queda rebotando debajo. Deducirlo restando losas en
       otro sitio seria una segunda cuenta que se desincroniza. */
    MUNDO.huecos.push({ y, x: hx, w: hueco });

    /* ── LO QUE VA EN CADA PISO SALE DE RANURAS Y NO DE SORTEAR UN X ──
       Sorteando la posicion y despues «corriendola si cae en el hueco», dos
       cosas que caen cerca del hueco se corren AL MISMO sitio: medido con la
       sonda de proyeccion, los dos ladrones del piso 1 caian los dos en x =
       0,108 de pantalla, uno adentro del otro. Con ranuras discretas y sin
       repetir, eso no puede pasar. */
    /* ── Y LA SEPARACION DE LAS RANURAS SALE DE LO QUE MIDE LO MAS ANCHO ──
       Estaban cada 0,70 m, y un ladron (0,68 de ancho) al lado de una caja
       (0,84) suman 0,76 de medias anchuras: la auditoria encontro QUINCE
       ladrones metidos adentro de una caja. Con 0,84 de paso no puede pasar,
       porque 0,34 + 0,42 = 0,76 < 0,84. */
    const ran = [];
    for (const x of [-2.1, -1.26, -0.42, 0.42, 1.26, 2.1])
      if (Math.abs(x - hx) > hueco/2 + 0.50) ran.push(x);
    for (let q = ran.length - 1; q > 0; q--){
      const r = (az()*(q + 1))|0; const t = ran[q]; ran[q] = ran[r]; ran[r] = t;
    }
    let ri = 0;
    const toma = () => (ri < ran.length ? ran[ri++] : null);

    const cuantos = 1 + (az() < k*0.85 ? 1 : 0);
    for (let i = 0; i < cuantos; i++){
      const x = toma();
      if (x === null) break;
      MUNDO.lad.push({ x, y: y + 0.70, vivo: true, t: azr(0, 2.4),
                       espera: 3.4 - k*1.5, avisa: 0, mira: 0, tira: 0,
                       /* ── EL PRIMER TIRO NO PUEDE TARDAR TRES SEGUNDOS ──
                          Medido, el auto-jugador honesto limpia un piso en poco
                          mas de un segundo desde que entra: con la espera
                          inicial en 1,2-3,0 s el ladron no llegaba a encender el
                          laser NUNCA y las diez partidas terminaban con cero
                          muertes. Llegar a un piso tiene que doler. */
                       cd: azr(0.35, 1.15) });
    }

    /* el acero: vertical, cuelga de la losa hacia abajo. Es lo que hace que el
       tiro desde abajo no sirva y haya que meterse en el piso */
    if (az() < 0.35 + k*0.45){
      const ax = toma();
      if (ax !== null){
        let h = azr(1.1, 2.0);
        /* ── PERO CUELGA SOBRE EL PISO DE ABAJO, QUE TIENE SUS PROPIAS RANURAS ──
           Las ranuras de cada piso se barajan por separado, asi que un ladron
           del piso de abajo puede caer justo en la misma columna: la auditoria
           encontro dos metidos adentro de una placa. Se acorta hasta que deje de
           tocarlos — un acero corto sigue tapando el tiro, uno adentro de un
           ladron lo vuelve imposible de matar. */
        for (const l of MUNDO.lad)
          if (Math.abs(l.x - ax) < 0.34 + 0.14 + 0.06)
            h = Math.min(h, Math.max(0, y - (l.y + 1.5) - 0.06));
        if (h > 0.45) MUNDO.acero.push(esRect(ax - 0.14, y - h, 0.28, h, 'acero'));
      }
    }
    /* y las cajas de madera, que SI se rompen de un tiro: son la unica cosa del
       nivel que el jugador puede cambiar */
    if (az() < 0.55){
      const cx = toma();
      if (cx !== null)
        MUNDO.cajas.push(Object.assign(esRect(cx - 0.42, y + 0.70, 0.84, 0.84, 'caja'),
                                       { viva: true }));
    }
  }
  return MUNDO;
}

/* ── LO QUE FRENA A LA PISTOLA Y LO QUE FRENA A LA BALA NO ES LO MISMO ──
   La caja de madera para la pistola pero la bala la ROMPE, y el acero para a
   las dos. Con una sola lista, romper una caja de un tiro seria imposible o el
   acero seria decorativo. */
function solidos(){
  const s = MUNDO.losas.concat(MUNDO.acero);
  for (const c of MUNDO.cajas) if (c.viva) s.push(c);
  return s;
}

/* ── EL TRAZADO DE LA BALA ──
   Devuelve el primer impacto: contra un ladron, contra una caja o contra el
   mundo. Es la MISMA cuenta que usa la auditoria para preguntarse si un tiro
   entra — con dos cuentas, la auditoria aprobaria un juego que no existe. */
function rayo(x, y, dx, dy, largo, ignoraLad){
  let mejor = null, td = largo;
  const prueba = (r, tipo, obj) => {
    /* rebanada: el clasico contra una caja alineada a los ejes */
    let t0 = 0, t1 = td;
    for (const [p, d, a, b] of [[x, dx, r.x, r.x + r.w], [y, dy, r.y, r.y + r.h]]){
      if (Math.abs(d) < 1e-6){ if (p < a || p > b) return; continue; }
      let ta = (a - p)/d, tb = (b - p)/d;
      if (ta > tb){ const q = ta; ta = tb; tb = q; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return;
    }
    if (t0 >= 0 && t0 < td){ td = t0; mejor = { t: t0, tipo, obj }; }
  };
  if (!ignoraLad)
    for (const l of MUNDO.lad)
      if (l.vivo) prueba(esRect(l.x - 0.34, l.y, 0.68, 1.5), 'ladron', l);
  for (const c of MUNDO.cajas) if (c.viva) prueba(c, 'caja', c);
  for (const r of MUNDO.acero) prueba(r, 'acero', r);
  for (const r of MUNDO.losas) prueba(r, 'losa', r);
  return mejor;
}
