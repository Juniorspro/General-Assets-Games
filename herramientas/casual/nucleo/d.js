/* ══════════════════ LOS ASSETS GENERADOS ══════════════════
   Las imágenes y el sonido están generados con Rezona y horneados en base64
   dentro del archivo por `herramientas/casual/hornear.py`. Este módulo es lo
   único que los conoce: los juegos piden `IMG.pj` o `dibCuadro('pj', 2, …)` y
   no saben de dónde salió.

   ── Y NADA REEMPLAZA NADA HASTA QUE LLEGA ──
   Es la regla del repo y acá pesa más que en ningún otro juego: un data URI se
   decodifica de forma ASINCRÓNICA, así que un juego que naciera esperando la
   foto daría un cuadro —o veinte— en negro justo en el primer segundo, que es
   el único que un minijuego tiene para engancharte. Todo lo dibujado por código
   sigue en pie y la imagen lo PISA cuando está lista. Si una no decodifica,
   cuesta esa pieza y no la pantalla. */

const IMG = {}, SON = {};
let AS_LISTAS = 0, AS_PEDIDAS = 0, AS_FALLADAS = 0;

function cargaImg(){
  if (typeof AS === 'undefined' || !AS.img) return;
  for (const k in AS.img){
    const m = AS.img[k];
    const o = { ok: false, n: m.n || 1, w: m.w || 0, h: m.h || 0,
                im: new Image(), msk: null, cache: {} };
    IMG[k] = o; AS_PEDIDAS++;
    o.im.onload = () => {
      o.ok = true; AS_LISTAS++;
      if (!o.w){ o.w = o.im.width; o.h = o.im.height; }
    };
    o.im.onerror = () => { AS_FALLADAS++; };
    o.im.src = m.d;
    if (m.m){ o.msk = new Image(); o.msk.src = m.m; }
  }
}

/* el sonido necesita el contexto, así que se carga cuando el contexto existe —
   o sea con el primer toque. Ningún navegador deja sonar nada antes de un
   gesto, así que decodificar antes sería trabajo tirado. */
let _sonPedido = false;
function cargaSon(){
  if (_sonPedido || !AUD || typeof AS === 'undefined' || !AS.son) return;
  _sonPedido = true;
  for (const k in AS.son){
    const b = atob(AS.son[k]);
    const ab = new ArrayBuffer(b.length), v = new Uint8Array(ab);
    for (let i = 0; i < b.length; i++) v[i] = b.charCodeAt(i);
    AUD.decodeAudioData(ab, (buf) => {
      SON[k] = buf;
      /* ── Y SI EL TEMA QUE HACE FALTA ERA ESTE, ARRANCA AHORA ──
         `decodeAudioData` es asincronico, asi que el primer pedido de musica
         casi siempre llega ANTES de que el buffer exista: sin esto, el menu
         se quedaria con la cama de osciladores para siempre y el tema
         generado no sonaria nunca. */
      if (_musK === k) musQuiere(k);
    }, () => {});
  }
}

/* ══════════ LA MÚSICA ══════════
   Va con `BufferSource` en bucle y no con un `<audio loop>`: el loop de un
   `<audio>` vuelve al cero con un hueco de milisegundos y en un tema de nueve
   segundos eso se escucha en cada vuelta. Más la cola fundida sobre la cabeza,
   que la pone el horneado.

   Y SE CRUZAN, no se cortan: el menú y la partida son dos temas, y un corte en
   seco entre los dos se lee a error y no a que empezó el juego. */
const MUS_VOL = { menu: 0.30, mus: 0.26 };
let MUS = null;

function musPon(k){
  if (!AUD) return;
  if (MUS && MUS.k === k) return;
  if (MUS){
    const v = MUS; MUS = null;
    v.gn.gain.cancelScheduledValues(AUD.currentTime);
    v.gn.gain.setTargetAtTime(0.0001, AUD.currentTime, 0.28);
    setTimeout(() => { try { v.src.stop(); } catch(e){} }, 1200);
  }
  if (!k || !SON[k]) return;
  const src = AUD.createBufferSource();
  src.buffer = SON[k]; src.loop = true;
  const gn = AUD.createGain(); gn.gain.value = 0.0001;
  src.connect(gn); gn.connect(MAESTRO);
  src.start();
  gn.gain.setTargetAtTime(MUS_VOL[k] != null ? MUS_VOL[k] : 0.26, AUD.currentTime, 0.35);
  MUS = { k, src, gn };
}
/* ── QUE TEMA QUIERE EL JUEGO ──
   Un solo sitio decide si suena la muestra o la cama de osciladores, y se
   acuerda de lo que se le pidio para poder arrancarlo cuando el buffer llegue.
   Repartido en cinco llamadas, el dia que se agregue una pantalla va a quedar
   una sin musica y nadie se va a enterar hasta jugarla. */
let _musK = null;
function musQuiere(k){
  _musK = k;
  cargaSon();
  if (k && SON[k]){ camaFondo(false); musPon(k); return; }
  musPon(null);
  camaFondo(!!k);
}

/* la música se agacha mientras suena algo importante: si compiten, el
   acontecimiento deja de ser un acontecimiento y pasa a ser un matiz */
function musAgacha(k, seg){
  if (!MUS) return;
  const g0 = MUS_VOL[MUS.k] != null ? MUS_VOL[MUS.k] : 0.26;
  MUS.gn.gain.cancelScheduledValues(AUD.currentTime);
  MUS.gn.gain.setTargetAtTime(g0*k, AUD.currentTime, 0.05);
  MUS.gn.gain.setTargetAtTime(g0, AUD.currentTime + (seg || 0.5), 0.25);
}

/* ══════════ EL SONIDO: LA MUESTRA PRIMERO Y EL OSCILADOR DE RED ══════════
   `son()` sigue siendo el de siempre —está medido y funciona— y esto lo
   ENVUELVE: si el juego declaró un alias y la muestra decodificó, suena la
   muestra; si no, suena el sintetizado. Un juego mudo por un decodificador es
   peor que un juego con bips, y ya pasó una vez en este repo. */
const _sonProc = son;
son = function(tipo, k){
  if (!AUD || SILENCIO) return;
  const al = (typeof SON_ALIAS !== 'undefined' && SON_ALIAS) ? SON_ALIAS[tipo] : null;
  if (al && SON[al]){
    if (tipo === 'bien') _racha = Math.min(_racha + 1, 14);
    else if (tipo === 'mal' || tipo === 'gana' || tipo === 'pierde') _racha = 0;
    const src = AUD.createBufferSource();
    src.buffer = SON[al];
    const gn = AUD.createGain();
    gn.gain.value = (k == null ? 1 : k) * 0.85;
    src.connect(gn); gn.connect(MAESTRO);
    src.start();
    return;
  }
  _sonProc(tipo, k);
};

/* ══════════ DIBUJO ══════════ */

/* el fondo se dibuja por COVER y no estirado: la imagen viene 720x1280 y el
   alto de diseño se mueve entre 1100 y 1760 según la pantalla, así que
   estirándola la entrada del boliche sale aplastada en un teléfono largo */
function dibCubre(k){
  const o = IMG[k];
  if (!o || !o.ok) return false;
  const e = Math.max(AN/o.im.width, AL/o.im.height);
  const w = o.im.width*e, h = o.im.height*e;
  g.drawImage(o.im, (AN - w)/2, (AL - h)/2, w, h);
  return true;
}

/* un cuadro de una hoja de sprites, centrado en x y APOYADO en y (los pies),
   que es como se piensa un personaje. `esp` lo espeja. */
function dibCuadro(k, i, x, y, alto, esp, lienzo){
  const o = IMG[k];
  if (!o || !o.ok) return false;
  const src = lienzo || o.im;
  const e = alto / o.h, w = o.w*e;
  g.save();
  g.translate(x, y);
  if (esp) g.scale(-1, 1);
  g.drawImage(src, (i % o.n)*o.w, 0, o.w, o.h, -w/2, -alto, w, alto);
  g.restore();
  return true;
}

/* ── Y UNA VARIANTE CON ANCHO PROPIO, QUE HACE FALTA MAS DE LO QUE PARECE ──
   `dibCuadro` saca el ancho de la proporción del cuadro, que es lo correcto para
   un personaje. Pero un bloque de TORRE se CORTA: su ancho cambia piso a piso,
   así que dibujar el sprite proporcional deja el bloque angosto con la imagen
   entera del ancho — o sea que lo que se ve no es lo que choca. Acá el ancho y
   el alto los pone quien llama, y el sprite se estira. */
function dibCuadroWH(k, i, x, y, w, h, lienzo){
  const o = IMG[k];
  if (!o || !o.ok) return false;
  const src = lienzo || o.im;
  g.drawImage(src, (i % o.n)*o.w, 0, o.w, o.h, x - w/2, y - h/2, w, h);
  return true;
}

/* ── EL TEÑIDO: LA HOJA SE PINTA UNA VEZ Y SE GUARDA ──
   El personaje se generó con la ropa BLANCA para poder pintarla del color que
   la regla pida. Pintar por cuadro serían tres operaciones de lienzo sesenta
   veces por segundo para obtener siempre lo mismo: se hornea una hoja por
   color la primera vez que se pide y después son copias.

   `multiply` sobre blanco devuelve el color exacto y sobre el contorno oscuro
   lo deja oscuro, que es justo lo que tiene que pasar. Y donde la máscara es
   transparente no cambia nada, así que la piel y el pelo no se tocan. */
function tenido(k, color){
  const o = IMG[k];
  if (!o || !o.ok) return null;
  if (o.cache[color]) return o.cache[color];
  /* ── Y NO SE CACHEA UN TEÑIDO HECHO SIN LA MÁSCARA ──
     La máscara es una segunda imagen y decodifica DESPUÉS de la hoja. Sin esta
     guarda, el primer cuadro teñía con la hoja entera de máscara —o sea todo el
     sprite, piel incluida— y GUARDABA eso para siempre: medido en la captura,
     el visitante salía azul de la cara a las zapatillas.
     Mientras la máscara no esté, se devuelve la hoja cruda sin teñir y sin
     guardar nada: un visitante de blanco por dos cuadros es infinitamente mejor
     que uno pintado entero por el resto de la partida. */
  if (AS.img[k] && AS.img[k].m && !(o.msk && o.msk.complete)) return o.im;
  const c = document.createElement('canvas');
  c.width = o.im.width; c.height = o.im.height;
  const x = c.getContext('2d');
  x.drawImage(o.im, 0, 0);
  const t = document.createElement('canvas');
  t.width = c.width; t.height = c.height;
  const y = t.getContext('2d');
  /* la máscara es la de la ropa si la hay; si no, el sprite entero (que en ese
     caso se generó blanco a propósito, como la bola de MANCHA) */
  y.drawImage(o.msk && o.msk.complete ? o.msk : o.im, 0, 0);
  y.globalCompositeOperation = 'source-in';
  y.fillStyle = color; y.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'multiply';
  x.drawImage(t, 0, 0);
  o.cache[color] = c;
  return c;
}

/* una textura como patrón repetible, guardada. Se hornean embaldosadas de
   verdad (la banda del borde fundida sobre el opuesto), así que se repiten sin
   espejo y sin costura. */
function patron(k){
  const o = IMG[k];
  if (!o || !o.ok) return null;
  if (!o.pat) o.pat = g.createPattern(o.im, 'repeat');
  return o.pat;
}

/* un sello (la salpicadura, la bola) teñido y girado. El sello se horneó con el
   RGB en blanco puro, así que el color sale exacto y no multiplicado por lo que
   la generación hubiera puesto de gris. */
function dibSello(k, x, y, r, gi, color){
  const c = tenido(k, color);
  if (!c) return false;
  g.save();
  g.translate(x, y);
  if (gi) g.rotate(gi);
  g.drawImage(c, -r, -r, r*2, r*2);
  g.restore();
  return true;
}

function asEstado(){
  return { pedidas: AS_PEDIDAS, listas: AS_LISTAS, falladas: AS_FALLADAS,
           son: Object.keys(SON).length,
           mus: MUS ? MUS.k : null };
}
