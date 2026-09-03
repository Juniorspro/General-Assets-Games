/* ══════════════════════ LOS TRES IDIOMAS ══════════════════════
   La pantalla de idioma va ANTES del menú, que es la lección de los otros seis
   juegos de este repo: elegir el idioma adentro de un menú ya escrito en un
   idioma que no entendés no sirve de nada, porque para cuando lo encontrás ya
   leíste todo sin entenderlo.

   Y NO SE GUARDA NADA EN DISCO. `localStorage` TIRA en una ventana privada, y
   un minijuego que se abre desde un enlace se abre en ventanas raras todo el
   tiempo. El idioma sale de `navigator.language` y el jugador lo cambia con los
   tres botones chicos del menú. La única cosa que sí se intenta guardar es el
   récord, y va envuelta en `try` justamente porque puede tirar. */
let LANG = 'en';
const TXB = {
  es: { jugar:'JUGAR', como:'CÓMO SE JUEGA', otra:'OTRA VEZ', menu:'MENÚ',
        mejor:'MEJOR', salta:'TOCÁ PARA SALTEAR', pts:'PUNTOS',
        finBien:'¡BIEN!', finMal:'SE TERMINÓ', nuevoRec:'RÉCORD NUEVO',
        racha:'RACHA', niveles:'NIVELES', nivel:'NIVEL', movs:'MOVIDAS',
        deshacer:'DESHACER', reiniciar:'REINICIAR', salir:'SALIR',
        seguir:'SEGUIR', ganaste:'¡NIVEL LISTO!', perdiste:'NO SALIÓ',
        proximo:'SIGUIENTE', progreso:'{0} DE {1}',
        gNo:'Se juega inclinando el teléfono', gSi:'Giroscopio listo',
        gSin:'Este aparato no tiene giroscopio · se juega con el dedo',
        gNeg:'Permiso de movimiento negado · se juega con el dedo',
        gIns:'Sin HTTPS no hay sensores · se juega con el dedo',
        mNo:'Se juega con la mano por la cámara', mSi:'Cámara lista',
        mPerm:'Permiso de cámara negado · se juega tocando',
        mCam:'No hay cámara · se juega tocando',
        mCdn:'No se pudo bajar el detector · se juega tocando',
        mMod:'No arrancó el detector · se juega tocando',
        mIns:'Sin HTTPS no hay cámara · se juega tocando' },
  en: { jugar:'PLAY', como:'HOW TO PLAY', otra:'AGAIN', menu:'MENU',
        mejor:'BEST', salta:'TAP TO SKIP', pts:'POINTS',
        finBien:'NICE!', finMal:'GAME OVER', nuevoRec:'NEW RECORD',
        racha:'STREAK', niveles:'LEVELS', nivel:'LEVEL', movs:'MOVES',
        deshacer:'UNDO', reiniciar:'RESTART', salir:'EXIT',
        seguir:'CONTINUE', ganaste:'LEVEL CLEAR!', perdiste:'NO LUCK',
        proximo:'NEXT', progreso:'{0} OF {1}',
        gNo:'Tilt the phone to play', gSi:'Gyroscope ready',
        gSin:'This device has no gyroscope · play with your finger',
        gNeg:'Motion permission denied · play with your finger',
        gIns:'No sensors without HTTPS · play with your finger',
        mNo:'Play with your hand through the camera', mSi:'Camera ready',
        mPerm:'Camera permission denied · play by tapping',
        mCam:'No camera · play by tapping',
        mCdn:'Could not download the detector · play by tapping',
        mMod:'The detector did not start · play by tapping',
        mIns:'No camera without HTTPS · play by tapping' },
  pt: { jugar:'JOGAR', como:'COMO JOGAR', otra:'DE NOVO', menu:'MENU',
        mejor:'MELHOR', salta:'TOQUE PARA PULAR', pts:'PONTOS',
        finBien:'BOA!', finMal:'ACABOU', nuevoRec:'NOVO RECORDE',
        racha:'SEQUÊNCIA', niveles:'NÍVEIS', nivel:'NÍVEL', movs:'JOGADAS',
        deshacer:'DESFAZER', reiniciar:'REINICIAR', salir:'SAIR',
        seguir:'CONTINUAR', ganaste:'NÍVEL FEITO!', perdiste:'NÃO DEU',
        proximo:'PRÓXIMO', progreso:'{0} DE {1}',
        gNo:'Jogue inclinando o telefone', gSi:'Giroscópio pronto',
        gSin:'Este aparelho não tem giroscópio · jogue com o dedo',
        gNeg:'Permissão de movimento negada · jogue com o dedo',
        gIns:'Sem HTTPS não há sensores · jogue com o dedo',
        mNo:'Jogue com a mão pela câmera', mSi:'Câmera pronta',
        mPerm:'Permissão de câmera negada · jogue tocando',
        mCam:'Sem câmera · jogue tocando',
        mCdn:'Não baixou o detector · jogue tocando',
        mMod:'O detector não iniciou · jogue tocando',
        mIns:'Sem HTTPS não há câmera · jogue tocando' }
};
/* ── LA TABLA DEL JUEGO SE FUSIONA CON LA DEL NÚCLEO, NO LA REEMPLAZA ──
   Cada juego trae sus propias frases y hereda las siete del núcleo. Si cada
   juego tuviera que repetir «JUGAR» y «MENÚ» en tres idiomas, serían veintiún
   cadenas duplicadas por juego y la primera que se corrija va a quedar
   corregida en uno solo. */
const TXT = {};
for (const l of ['es','en','pt']) TXT[l] = Object.assign({}, TXB[l], (JT[l] || {}));

function TX(k, ...a){
  let s = (TXT[LANG] && TXT[LANG][k]) != null ? TXT[LANG][k]
        : (TXT.es[k] != null ? TXT.es[k] : k);
  /* los patrones con hueco: `{0}` se reemplaza por el argumento. Una frase con
     un número adentro no se puede armar concatenando, porque el número no cae
     en el mismo lugar en los tres idiomas. */
  return String(s).replace(/\{(\d)\}/g, (_, i) => a[i] != null ? a[i] : '');
}

function pintaIdioma(){
  document.documentElement.lang = LANG;
  for (const e of document.querySelectorAll('[data-i18n]'))
    e.textContent = TX(e.dataset.i18n);
  for (const b of document.querySelectorAll('[data-lang]'))
    b.classList.toggle('p', b.dataset.lang === LANG);
  $('salta').textContent = TX('salta');
  if (window.pintaJuego) window.pintaJuego();
}

function ponIdioma(l){ LANG = l; pintaIdioma(); }

/* el idioma del aparato, y sólo si es uno de los tres */
(() => {
  const n = (navigator.language || 'en').slice(0,2).toLowerCase();
  if (n === 'es' || n === 'pt') LANG = n;
})();
