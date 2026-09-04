
/* ══════════════════════ EL NIVEL ══════════════════════
   ── SE ARMA PEGANDO PATRONES SOBRE LA GRILLA DEL COMPAS ──
   Un patron mide un compas —cuatro tiempos, o sea dieciseis bloques— y todo lo
   que pone cae en corcheas. Asi «el nivel va al ritmo» no es algo que haya que
   sincronizar: es lo unico que el generador sabe hacer.

   ── Y UN NIVEL GENERADO Y NO JUGADO ES UN NIVEL ROTO QUE TODAVIA NO SE SABE ──
   Es la regla que en este repo ya costo siete niveles imposibles en Maicol y una
   nube 37 de 42 en BARRIO. El generador tira, y despues el auto-jugador de `g.js`
   lo tiene que terminar al 100 %: si no llega, se rechaza y se vuelve a tirar con
   otra semilla. El validador y el juego comparten la MISMA fisica, asi que el
   validador no puede aprobar un juego que no existe. */
const MUNDO = {
  largo: 0,            /* en bloques */
  sol: [],             /* solidos: se para arriba, se muere de costado */
  mat: [],             /* mortales: picos y sierras */
  pads: [], orbes: [], portales: [], monedas: [],
  sierras: [],         /* solo para dibujar: su caja mortal ya esta en `mat` */
  techo: [],           /* tramos con techo, para gravedad y nave */
  nivel: 0, med: null,
  /* los indices arrancan vacios: `cerca()` se puede llamar antes de generar */
  iSol: [], iMat: []
};

const rect = (x, y, w, h, t) => ({ x, y, w, h, t });

/* ── LOS PATRONES ──
   Cada uno declara lo que pone y NADA MAS: no declara la solucion. La solucion
   la encuentra el auto-jugador, que es lo que garantiza que exista de verdad.
   `d` es la dificultad minima de nivel en la que el patron puede salir. */
const PATRONES = [
  { n: 'vacio', d: 1, pon(){} },
  { n: 'pico1', d: 1, pon(P, x){ P.pico(x + 8); } },
  { n: 'pico2', d: 1, pon(P, x){ P.pico(x + 4); P.pico(x + 12); } },
  { n: 'dobles', d: 1, pon(P, x){ P.pico(x + 7); P.pico(x + 8); } },
  { n: 'pico3', d: 2, pon(P, x){ P.pico(x + 4); P.pico(x + 9); P.pico(x + 14); } },
  /* ── TRES PICOS SEGUIDOS NO SE PUEDEN PASAR, Y ES ARITMETICA ──
     El salto deja la caja por encima de los 0,82 de un pico durante 3,25 bloques
     (`9,6·u(1−u) > 0,82` da u de 0,094 a 0,906, y el salto mide 4). Tres picos
     pegados ocupan 3,50 contando el ancho de la caja: no hay despegue que sirva.
     Dos si (2,50), y por eso `dobles` existe y este patron paso a ser otra cosa:
     un muro del que hay que saltar TARDE, porque bajarse caminando aterriza justo
     encima de los dos picos. Eso es una prueba de tiempo y no de reflejo. */
  { n: 'trampa', d: 3, pon(P, x){
      P.bloque(x + 6, 0, 1.2, 1.6); P.pico(x + 8); P.pico(x + 9);
    } },
  /* ── LA PLATAFORMA VA A 1,6 Y NO A 2,0, Y ES ARITMETICA ──
     El apice del salto son 2,4 bloques, asi que una plataforma cuya cara de
     arriba este en 2,6 NO SE PUEDE ALCANZAR: se podia pasar por debajo saltando
     los dos picos, pero la moneda de arriba era imposible y la plataforma era
     decoracion. Con la cara en 2,2 se aterriza encima con 0,2 de sobra. */
  { n: 'plata', d: 1, pon(P, x){
      P.bloque(x + 6, 1.6, 5, 0.6);
      P.pico(x + 7); P.pico(x + 9);
      P.moneda(x + 8.5, 3.4);
    } },
  /* ── EL HUECO SE MIDE CONTRA EL SALTO, NO SE ELIGE ──
     El salto mide 4,00 bloques exactos. Para pararse en el labio la caja tiene
     que solaparlo, y para aterrizar tambien: la ventana de despegue mide
     `4,86 − ancho` bloques, y encima hay que restarle los 0,34 que la caja baja
     en un paso, porque aterrizar con menos solape que eso se resuelve como
     choque de costado, o sea muerte. Con 4,0 de hueco la ventana queda en 0,52
     bloques = 3,7 pasos: injugable. De ahi salen 3,0 · 3,5 · 3,9. */
  { n: 'hueco', d: 1, pon(P, x, dif){ const w = [0, 2.7, 3.0, 3.3][dif];
      P.hueco(x + 6, x + 6 + w); } },
  { n: 'escalera', d: 2, pon(P, x){
      P.bloque(x + 5, 0, 2, 1); P.bloque(x + 8, 0, 2, 2); P.bloque(x + 11, 0, 2, 3);
    } },
  { n: 'sierra', d: 2, pon(P, x){ P.sierra(x + 8, 0.75, 0.85); } },
  /* ── EL PAD Y SU MURO: EL SITIO DEL MURO SALE DEL VUELO, NO SE ELIGE ──
     El pad lanza con raiz de dos veces el impulso, o sea que el apice es el
     doble: 4,8 bloques. Con el muro a 4,6 de alto habia 0,2 de margen y el
     lanzamiento NO LO CLAREABA — medido, el bot moria ahi en los dos niveles que
     usan el patron. En vueltas de pad, `y = 4h·u(√2−u)`, asi que la bajada cruza
     los 3,0 bloques en u = 1,140, o sea **4,56 bloques despues del pad** — y ese
     numero no depende del tempo, porque `v·T` son siempre 4 bloques. El muro va
     ahi. Y la moneda va en el apice (u = 0,707 → 2,83 bloques), que es el unico
     sitio del vuelo al que se llega. */
  { n: 'pad', d: 2, pon(P, x){
      P.pad(x + 5); P.bloque(x + 9, 0, 1.4, 3.0); P.moneda(x + 7.8, 4.4);
    } },
  { n: 'orbe', d: 2, pon(P, x){ P.hueco(x + 5, x + 12); P.orbe(x + 8, 2.2); } },
  { n: 'muro', d: 3, pon(P, x){ P.bloque(x + 7, 0, 1.2, 2); P.pico(x + 12); } },
  { n: 'sierras2', d: 3, pon(P, x){ P.sierra(x + 5, 0.75, 0.8); P.sierra(x + 12, 0.75, 0.8); } }
];

/* ── LOS TRAMOS DE NAVE ──
   Un pasillo con techo y aperturas. La nave no se apoya en nada, asi que lo unico
   que la mata es el techo, el piso y los bloques: sin techo, «volar» seria subir
   sin limite y el modo no significaria nada. */
function tramoNave(P, x, largo, dif){
  P.techo.push(rect(x, ALTO_PASILLO, largo, 1.4, 'techo'));
  P.sol.push(rect(x, ALTO_PASILLO, largo, 1.4, 'techo'));
  /* ── LA PRIMERA PARED VA A OCHO BLOQUES Y NO A SEIS ──
     La nave entra pegada al piso y tiene que trepar hasta el hueco: con la pared
     a seis bloques son medio segundo para subir hasta cuatro, contando la
     aceleracion, y eso no alcanza. */
  const n = Math.floor((largo - 8)/8);
  for (let i = 0; i < n; i++){
    const bx = x + 8 + i*8;
    /* una pared de arriba y una de abajo, dejando un hueco de tres bloques: con
       menos de tres la nave no pasa ni con la trayectoria perfecta */
    const hueco = 3.4 + (3 - dif)*0.5;
    const abajo = azr(0.6, Math.max(0.9, ALTO_PASILLO - 0.4 - hueco));
    P.bloque(bx, 0, 1.2, abajo);
    P.bloque(bx, abajo + hueco, 1.2, ALTO_PASILLO - (abajo + hueco));
  }
}

function generaNivel(id, semilla){
  const N = NIVELES[id];
  sem((semilla || 1)*7919 + id*104729 + 11);
  const M = MUNDO;
  M.nivel = id; M.med = medidasDe(N.bpm);
  M.sol.length = 0; M.mat.length = 0; M.pads.length = 0; M.orbes.length = 0;
  M.portales.length = 0; M.monedas.length = 0; M.sierras.length = 0; M.techo.length = 0;
  M.largo = N.compases*16;

  /* la caja de herramientas que los patrones usan. Va como metodos y no como
     funciones sueltas para que un patron no pueda escribir en otra cosa. */
  const huecos = [];
  const P = {
    sol: M.sol, techo: M.techo,
    pico(x){ M.mat.push(rect(x + 0.18, 0, 0.64, 0.82, 'pico')); },
    bloque(x, y, w, h){ M.sol.push(rect(x, y, w, h, 'bloque')); },
    sierra(x, y, r){ M.sierras.push({ x, y, r });
                     M.mat.push(rect(x - r*0.66, y - r*0.66, r*1.32, r*1.32, 'sierra')); },
    pad(x){ M.pads.push({ x, y: 0 }); },
    orbe(x, y){ M.orbes.push({ x, y, usado: false }); },
    moneda(x, y){ if (M.monedas.length < 3) M.monedas.push({ x, y, tomada: false }); },
    hueco(a, b){ huecos.push([a, b]); }
  };

  /* ── EL PRIMER COMPAS Y EL ULTIMO VAN VACIOS ──
     Aparecer al lado de un pico no es dificultad, es una emboscada; y terminar
     justo sobre un obstaculo convierte el 99 % en una loteria. */
  const compases = N.compases;
  const usables = PATRONES.filter(p => p.d <= N.dif);
  const conNave = N.modos.indexOf('nave') >= 0;
  const conGrav = N.modos.indexOf('gravedad') >= 0;
  let c = 2;
  while (c < compases - 2){
    const x = c*16;
    /* ── LOS TRAMOS ESPECIALES SE ANUNCIAN CON UN PORTAL Y OCUPAN COMPASES ENTEROS ──
       A mitad de compas, el cambio de modo cae en contratiempo y se lee a error. */
    if (conNave && c > 5 && c % 9 === 0 && c + 4 < compases - 2){
      M.portales.push({ x: x + 1, t: 'nave' });
      tramoNave(P, x, 64, N.dif);
      M.portales.push({ x: x + 62, t: 'cubo' });
      c += 4; continue;
    }
    if (conGrav && c > 3 && c % 7 === 0 && c + 3 < compases - 2){
      M.portales.push({ x: x + 1, t: 'grav' });
      M.techo.push(rect(x, ALTO_GRAV, 48, 1.2, 'techo'));
      M.sol.push(rect(x, ALTO_GRAV, 48, 1.2, 'techo'));
      /* los picos del tramo invertido cuelgan del techo */
      for (let k = 0; k < 3; k++){
        const bx = x + 6 + k*16;
        M.mat.push(rect(bx + 0.18, ALTO_GRAV - 0.82, 0.64, 0.82, 'picoInv'));
      }
      M.portales.push({ x: x + 46, t: 'norm' });
      c += 3; continue;
    }
    const pat = usables[azi(0, usables.length - 1)];
    pat.pon(P, x, N.dif);
    c++;
  }

  /* ── EL PISO SE ARMA AL FINAL, DESCONTANDO LOS HUECOS ──
     Al revés —piso entero y después agujerearlo— habría que partir rectángulos
     que ya existen, y eso deja bordes duplicados que el choque resuelve dos veces. */
  huecos.sort((a, b) => a[0] - b[0]);
  let px = -20;
  for (const [a, b] of huecos){
    if (a > px) M.sol.push(rect(px, -6, a - px, 6, 'piso'));
    px = Math.max(px, b);
  }
  M.sol.push(rect(px, -6, M.largo + 40 - px, 6, 'piso'));
  /* la pared del final: no se puede pasar de largo */
  M.sol.push(rect(M.largo + 2, -6, 4, 30, 'meta'));
  indexaMundo();
  return M;
}

/* ── EL SITIO EN BLOQUES DE UN TIEMPO DE COMPAS, Y AL REVES ──
   Estas dos son la juntura entre la musica y el nivel, y por eso viven en un
   solo sitio: con la cuenta escrita en dos lados, el dia que cambie
   `BLOQ_POR_TIEMPO` una de las dos queda apuntando a otro juego. */
const xDeTiempo = (t) => t*BLOQ_POR_TIEMPO;
const tiempoDeX = (x) => x/BLOQ_POR_TIEMPO;

/* ══════════ EL INDICE POR BLOQUE ══════════
   Sin esto el choque recorre los ~250 rectangulos del nivel en CADA paso, y el
   auto-jugador da varios miles de pasos por rama: validar tres niveles pasaria
   de segundos a minutos. Cada balde `i` guarda lo que se solapa con [i-1, i+2),
   asi que consultando por el bloque del jugador no hace falta mirar los vecinos.
   EL DESPLAZAMIENTO NO ES DECORATIVO: el piso arranca en x = -20 y la meta
   termina en largo+6, asi que sin corrimiento los indices negativos se recortan
   a cero y el primer bloque del nivel se consulta en el balde equivocado. */
const IDX_OFS = 26;
const VACIO = [];
function indexaLista(lista, largo){
  const idx = new Array(largo + IDX_OFS*2);
  for (const r of lista){
    const a = cl(Math.floor(r.x) - 1 + IDX_OFS, 0, idx.length - 1);
    const b = cl(Math.ceil(r.x + r.w) + 1 + IDX_OFS, 0, idx.length - 1);
    for (let i = a; i <= b; i++){ (idx[i] || (idx[i] = [])).push(r); }
  }
  for (let i = 0; i < idx.length; i++) if (!idx[i]) idx[i] = VACIO;
  return idx;
}
function cerca(idx, x){
  const i = Math.floor(x) + IDX_OFS;
  return (i >= 0 && i < idx.length) ? idx[i] : VACIO;
}
function indexaMundo(){
  MUNDO.iSol = indexaLista(MUNDO.sol, MUNDO.largo + 40);
  MUNDO.iMat = indexaLista(MUNDO.mat, MUNDO.largo + 40);
}
