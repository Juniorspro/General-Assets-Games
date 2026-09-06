/* ══════════════════════ EL FONDO ══════════════════════

   ── ES UNA FOTO, Y ESO ES LA OPTIMIZACIÓN ──
   Antes esto era un lienzo procedural: ocho cielos interpolados por hora, nubes,
   agua, rayos de sol, burbujas y hojas, redibujado treinta veces por segundo
   sobre toda la pantalla. Medido, 0,205 ms de JavaScript por cuadro **más** el
   relleno de 412×892 píxeles, y encima cada `backdrop-filter` del vidrio vuelve
   a leer esos píxeles. Una foto no cuesta un solo cuadro: el compositor la sube
   a la GPU una vez y no la vuelve a tocar nunca.

   Lo único que se mueve es una deriva de veinticuatro segundos hecha con
   `transform`, que el compositor resuelve solo — no pasa por JavaScript ni por
   el hilo principal, así que sigue costando cero.

   Lo que quedó de la versión anterior es la idea de que el fondo tiene que
   RESPONDER: al abrir el cajón se acerca un poco. Eso es lo que hace que la
   hoja esmerilada se lea a hoja sobre algo y no a pantalla nueva. */

let FONDO_EL = null, FONDO_OK = false;

function fondoInit(){
  FONDO_EL = $('#fondo');

  /* ── LA FOTO ENTRA CUANDO LLEGA, NO ANTES ──
     Es un data URI de 113 KB: decodificarlo es asincrónico. Poniéndola como
     `background-image` de una, el primer cuadro es un rectángulo vacío. Se
     precarga en un `Image` y recién cuando decodificó se enciende, con el
     degradado de respaldo debajo mientras tanto. */
  const im = new Image();
  im.onload = () => {
    FONDO_EL.style.backgroundImage = 'url(' + IMG_FONDO + ')';
    FONDO_EL.classList.add('ok');
    FONDO_OK = true;
  };
  im.onerror = () => { FONDO_OK = false; };   /* queda el degradado, que ya se ve */
  im.src = IMG_FONDO;
}

/* ── EL FONDO SE ACERCA CUANDO SE ABRE EL CAJÓN ──
   Una clase y nada más: la transición la hace el compositor. */
function fondoProfundo(v){
  if (FONDO_EL) FONDO_EL.classList.toggle('hondo', !!v);
}
