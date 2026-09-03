/* ══════════════════ EL AMBIENTE: LO QUE HACE QUE UN FONDO SEA UN LUGAR ══════════════════

   Los seis juegos se dibujaban sobre un degradado de dos colores. Un degradado
   no está mal —es limpio y no le pelea el cuadro al juego— pero está QUIETO, y
   una pantalla en la que lo único que se mueve son las fichas que uno toca se
   lee a maqueta. Lo que la vuelve un lugar son tres cosas, y ninguna de las
   tres se ve de frente:

   1. LA FOTO, que pone la materia (madera, fieltro, agua, placa de circuito).
   2. ALGO QUE SE MUEVE DESPACIO Y NO ES DEL JUEGO — hojas que caen, burbujas
      que suben, polvo en el haz de luz. Tiene que ser LENTO: cualquier cosa que
      se mueva a la velocidad de las fichas compite con ellas, y en un juego de
      puntería eso no es decoración, es ruido.
   3. LA LUZ: un haz que barre y una viñeta. La viñeta no es maquillaje —empuja
      la vista al centro, que es exactamente donde está el juego.

   Y VA EN EL NÚCLEO Y NO EN CADA JUEGO por la razón de siempre: escrito seis
   veces son seis cosas parecidas y los seis dejan de verse de la misma familia.
   Cada juego declara `AMB` y nada más. */

const AMB_DEF = { foto: null, cielo: ['#141821', '#090b10'], niebla: null,
                  part: null, haz: 0, vineta: 0.42, granoK: 0,
                  /* cuánto MÁS grande que el marco se dibuja la foto, para que
                     sobre alto y se la pueda correr. Sólo TORRE lo usa. */
                  despK: 0 };
/* el desplazamiento lo escribe el juego, de 0 (abajo del todo) a 1 (arriba) */
let AMB_DESP = 0;
let _amb = null, _ambT = 0;
function ambCfg(){
  if (!_amb) _amb = Object.assign({}, AMB_DEF,
                                  (typeof AMB !== 'undefined' && AMB) ? AMB : {});
  return _amb;
}

/* ── LAS PARTÍCULAS DE FONDO ──
   Son un array fijo que se recicla por módulo, no una lista que crece: el fondo
   corre en TODAS las pantallas —menú, cinemática, partida, panel de final— así
   que una lista que crece con el tiempo se come el cuadro en un menú que quedó
   abierto tres minutos. */
const AMBP = [];
let _ambN = 0;
function ambSiembra(){
  const c = ambCfg();
  AMBP.length = 0; _ambN = 0;
  if (!c.part) return;
  _ambN = c.part.n || 0;
  for (let i = 0; i < _ambN; i++) AMBP.push(ambNace(true));
}
function ambNace(inicial){
  const p = ambCfg().part;
  const arr = p.dir === 'sube' ? -1 : 1;
  return {
    x: Math.random()*AN,
    /* al sembrar se reparten por todo el alto; después nacen fuera del marco,
       porque si no aparecen de la nada en el medio de la pantalla */
    y: inicial ? Math.random()*AL : (arr > 0 ? -40 : AL + 40),
    r: p.r0 + Math.random()*(p.r1 - p.r0),
    v: (p.v0 + Math.random()*(p.v1 - p.v0))*arr,
    fase: Math.random()*6.283,
    /* la deriva de costado sale de un seno, y su FRECUENCIA es propia de cada
       partícula: con una sola frecuencia las cuarenta se mecen a la vez y se
       lee a una fila, no a cosas sueltas */
    w: 0.25 + Math.random()*0.55,
    amp: p.amp*(0.4 + Math.random()*0.9),
    gi: Math.random()*6.283, vgi: (Math.random() - 0.5)*p.gira,
    a: p.a0 + Math.random()*(p.a1 - p.a0)
  };
}
function ambPaso(dt){
  _ambT += dt;
  if (AMBP.length !== _ambN) ambSiembra();
  const c = ambCfg();
  if (!c.part) return;
  for (let i = 0; i < AMBP.length; i++){
    const p = AMBP[i];
    p.y += p.v*dt;
    p.fase += p.w*dt;
    p.gi += p.vgi*dt;
    if (p.v > 0 ? p.y > AL + 60 : p.y < -60) AMBP[i] = ambNace(false);
  }
}
function ambPintaPart(){
  const c = ambCfg();
  if (!c.part) return;
  const f = c.part.forma || 'disco';
  for (const p of AMBP){
    const x = p.x + Math.sin(p.fase)*p.amp;
    g.globalAlpha = p.a;
    if (f === 'burbuja'){
      /* una burbuja no es un disco: es un anillo con un punto de luz arriba a la
         izquierda. Con un disco liso se lee a moneda. */
      g.strokeStyle = c.part.col; g.lineWidth = Math.max(1, p.r*0.22);
      g.beginPath(); g.arc(x, p.y, p.r, 0, 7); g.stroke();
      g.globalAlpha = p.a*0.9;
      disco(x - p.r*0.34, p.y - p.r*0.34, p.r*0.24, c.part.col);
    } else if (f === 'hoja'){
      g.save(); g.translate(x, p.y); g.rotate(p.gi);
      g.fillStyle = c.part.col;
      g.beginPath();
      g.ellipse(0, 0, p.r, p.r*0.44, 0, 0, 7);
      g.fill();
      g.restore();
    } else if (f === 'raya'){
      /* una chispa que sube deja estela: un disco solo se lee a mota */
      g.strokeStyle = c.part.col;
      g.lineWidth = Math.max(1, p.r*0.7);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, p.y); g.lineTo(x, p.y + (p.v > 0 ? -1 : 1)*p.r*4.5);
      g.stroke();
    } else {
      disco(x, p.y, p.r, c.part.col);
    }
  }
  g.globalAlpha = 1;
}

function ambFotoDesp(k, despK, u){
  const o = IMG[k];
  if (!o || !o.ok){ return; }
  const H = AL*(1 + despK);
  const e = Math.max(AN/o.im.width, H/o.im.height);
  const w = o.im.width*e, h = o.im.height*e;
  /* u=0 muestra el borde de ABAJO de la foto y u=1 el de arriba: en TORRE eso
     es el suelo al empezar y el cielo alto al llegar */
  const y = -(h - AL)*(1 - Math.max(0, Math.min(1, u)));
  g.drawImage(o.im, (AN - w)/2, y, w, h);
}

/* ── EL HAZ DE LUZ ──
   Dos cuñas claras que bajan desde arriba y se abren, con las dos frecuencias
   sin múltiplo común entre sí para que el barrido no se repita nunca igual. Es
   lo más barato que existe para que un plano de un solo color deje de leerse a
   plástico, y es la misma lección del grano de los juegos 3D del repo. */
function ambHaz(k){
  if (k <= 0) return;
  for (let i = 0; i < 2; i++){
    const t = _ambT*(i ? 0.055 : 0.083) + i*2.1;
    const cx = AN*(0.5 + Math.sin(t)*0.42);
    const an = AN*(0.16 + 0.05*Math.sin(t*1.7));
    const gr = g.createLinearGradient(0, 0, 0, AL*0.82);
    gr.addColorStop(0, 'rgba(255,246,224,' + (k*(i ? 0.5 : 0.75)).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,246,224,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(cx - an*0.30, 0);
    g.lineTo(cx + an*0.30, 0);
    g.lineTo(cx + an*1.9, AL*0.82);
    g.lineTo(cx - an*1.9, AL*0.82);
    g.closePath(); g.fill();
  }
}

/* ── LA VIÑETA ──
   Va SIEMPRE y va última: cierra los bordes y empuja la vista al medio. Y va
   sobre el fondo y no sobre el juego, porque oscurecer las fichas de las puntas
   sería quitarle contraste justo a lo que hay que tocar. */
function ambVineta(k){
  if (k <= 0) return;
  const r = Math.max(AN, AL)*0.78;
  const gr = g.createRadialGradient(AN/2, AL*0.48, r*0.34, AN/2, AL*0.48, r);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,' + k.toFixed(3) + ')');
  g.fillStyle = gr; g.fillRect(0, 0, AN, AL);
}

/* ── EL DESTELLO ──
   Un pulso de color desde los bordes cuando pasa algo bueno. Es el hermano del
   sacudón: el sacudón dice «golpe» y el destello dice «bien». Los dos juntos
   en el mismo acontecimiento se leen a error, así que cada juego elige.
   Y va DESPUÉS de la viñeta, o sea encima del fondo pero debajo del juego: un
   fogonazo por encima de las fichas las tapa justo en el cuadro en que el
   jugador está mirando qué pasó. */
let DEST = 0, DEST_C = '#ffd76a';
function destella(col, k){ DEST = Math.min(1, DEST + (k || 0.7)); DEST_C = col || '#ffd76a'; }
function destPaso(dt){ if (DEST > 0) DEST = Math.max(0, DEST - dt*2.6); }
function ambDestello(){
  if (DEST <= 0.004) return;
  const k = DEST*DEST;
  const r = Math.max(AN, AL)*0.8;
  const gr = g.createRadialGradient(AN/2, AL*0.48, r*0.42, AN/2, AL*0.48, r);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, hexA(DEST_C, k*0.55));
  g.fillStyle = gr; g.fillRect(0, 0, AN, AL);
}
function hexA(h, a){
  const n = parseInt(h.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
}

/* ── Y ACÁ SE ARMA TODO, EN ORDEN ──
   cielo → foto → haz → partículas → niebla del suelo → viñeta → destello.
   El orden importa y no es arbitrario: la foto va sobre el cielo porque puede
   no llegar (y entonces el cielo es lo que se ve); el haz va DEBAJO de las
   partículas porque lo que hace que un haz se lea a haz es el polvo que flota
   dentro de él, no la cuña sola. */
/* ── Y VA PARTIDO EN DOS, CON EL JUEGO EN EL MEDIO ──
   Ésta es la decisión de arquitectura de la capa y no es cosmética. Si el
   ambiente se dibujara entero y después el juego encima, la viñeta quedaría
   DEBAJO de las fichas y no cerraría nada; y si el juego dibujara primero, su
   mesa taparía la foto. Lo que va detrás es el lugar (cielo, foto, luz, cosas
   flotando) y lo que va delante es la ATMÓSFERA (niebla del suelo, grano,
   viñeta, destello), que tiene que pasar por encima de las piezas del juego
   para que el juego esté DENTRO del cuadro y no pegado arriba.

   En el medio, cada juego pinta sólo lo suyo: la mesa de FRUTAS, el techo del
   tablero de BURBUJAS, las nubes que bajan de TORRE. Ninguno vuelve a pintar un
   degradado de pantalla completa — ése es trabajo del ambiente y hacerlo dos
   veces es tapar la foto. */
function ambAtras(){
  const c = ambCfg();
  const gr = g.createLinearGradient(0, 0, 0, AL);
  gr.addColorStop(0, c.cielo[0]);
  gr.addColorStop(1, c.cielo[1]);
  g.fillStyle = gr; g.fillRect(0, 0, AN, AL);
  /* ── LA FOTO, Y EN TORRE SE MUEVE ──
     Con la foto clavada, el cielo de TORRE contradice a sus propias nubes —que
     bajan con la cámara— y subir cuarenta pisos se ve igual que subir dos, que
     es justo el defecto que las nubes existen para arreglar. Así que la foto se
     dibuja `despK` más alta de lo que hace falta y se corre con la cámara: lo
     que sobra es exactamente el recorrido, o sea que nunca puede quedar un
     hueco por construcción. */
  if (c.foto){
    if (c.despK > 0) ambFotoDesp(c.foto, c.despK, AMB_DESP);
    else dibCubre(c.foto);
  }
  ambHaz(c.haz);
  ambPintaPart();
  if (c.niebla){
    /* la niebla del borde de abajo: es lo que apoya el juego sobre el fondo en
       vez de dejarlo flotando encima de una foto */
    const n = g.createLinearGradient(0, AL*0.62, 0, AL);
    n.addColorStop(0, hexA(c.niebla, 0));
    n.addColorStop(1, hexA(c.niebla, 0.75));
    g.fillStyle = n; g.fillRect(0, AL*0.62, AN, AL*0.38);
  }
  /* ── Y LA VIÑETA VA ACÁ, DETRÁS DEL JUEGO, Y ES A PROPÓSITO ──
     Encima se vería más «de película», y sería un error medible: oscurecería
     las fichas de los bordes justo en los juegos cuyo tablero llega al ancho
     entero —la jarra de FRUTAS, la reja de CHISPA—, o sea que le quitaría
     contraste a lo único que hay que tocar. La viñeta es del LUGAR, no de la
     lente. */
  ambVineta(c.vineta);
}
function ambAdelante(){
  const c = ambCfg();
  if (c.granoK > 0) grano(0, 0, AN, AL, c.granoK, 140);
  /* el destello sí va encima, y puede: es un radial con el centro transparente,
     así que pinta los bordes y no tapa el tablero */
  ambDestello();
}
