/* ══════════════════════ LAS TABLAS ══════════════════════ */

const $ = s => document.querySelector(s);
const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
function cl(v, a, b){ return v < a ? a : v > b ? b : v; }

/* ── EL PUENTE PUEDE NO ESTAR, Y ESO NO ES UN ERROR ──
   Abierto en un navegador —para probarlo, o porque alguien lo miró en la
   computadora— `AND` no existe. En vez de dejar la pantalla negra, se arma un
   puente de mentira con apps de ejemplo: se ve el escritorio entero y lo único
   que no pasa es que algo se abra. Es lo mismo que hacen los juegos de este repo
   con los assets que todavía no decodificaron. */
const HAY_AND = typeof AND !== 'undefined' && AND && typeof AND.apps === 'function';

const TXT = {
  es: { s_madrugada: 'Buenas noches', s_manana: 'Buen día', s_tarde: 'Buenas tardes', s_noche: 'Buenas noches',
        letras: 'Letras',
        busca: 'Buscar apps y en la web', todas: 'Todas las apps', fijar: 'Fijar en el inicio',
        soltar: 'Quitar del inicio', info: 'Información de la app', borrar: 'Desinstalar',
        nada: 'Sin resultados', web: 'Buscar «{0}» en la web', fijado: 'Fijada',
        soltado: 'Quitada del inicio', ajustes: 'Ajustes', inicio: 'Elegir pantalla de inicio',
        sinPuente: 'Vista previa — sin conexión con el sistema',
        aTit: 'Asistente', aPide: 'Pedile algo al launcher…',
        aHola: 'Hola. Puedo agrandar los iconos, cambiar las columnas, abrir o fijar apps, buscar en la web y hacer bailar a la mascota. Probá: «agrandá las apps».',
        aNoEntiendo: 'No entendí eso. Probá con: agrandá los iconos · 5 columnas · abrí Spotify · fijá WhatsApp · buscá recetas',
        aIconos: 'Iconos en {0} px', aColumnas: '{0} columnas', aAbrir: 'Abro {0}',
        aFijar: '{0} fijada en el inicio', aSoltar: '{0} fuera del inicio',
        aBuscar: 'Busco «{0}» en la web', aIdioma: 'Idioma: {0}',
        aMascota: 'La mascota: {0}', aCajon: 'Cajón: {0}',
        aPorIA: 'contestó la IA', aPorLocal: 'contestó el launcher',
        aSinRed: 'no se pudo conectar', aLlaveMal: 'la llave no sirve ({0})',
        aFalla: 'la API falló ({0})', aNiega: 'el modelo no quiso contestar',
        aLlaveTit: 'Tu llave de {0}. Se guarda sólo en este teléfono y nunca sale de acá salvo para la consulta que vos escribís.',
        aLlavePh: 'sk-ant-…', aGuardar: 'Guardar', aBorrar: 'Borrar', aGratis: 'gratis',
        aConLlave: 'Con llave: contesta {0}.', aSinLlave: 'Sin llave: contesta el launcher. Tocá ⚙ para poner la tuya — Gemini y Groq la dan gratis.',
        aLlaveOk: 'Llave guardada', aLlaveFuera: 'Llave borrada',
        aNombre: 'Asistente',
        pTit: 'Personalizar', pMascota: 'Mascota', pTamano: 'Tamaño', pPose: 'Pose',
        pSi: 'Sí', pNo: 'No', pChica: 'Chica', pMedia: 'Media', pGrande: 'Grande',
        pQuieto: 'Quieta', pBaila: 'Bailando', pSaluda: 'Saludando', pMando: 'Jugando',
        pDuerme: 'Durmiendo', pIconos: 'Tamaño de los iconos', pColumnas: 'Columnas',
        pAcento: 'Color de acento', pOscuro: 'Oscurecer el fondo', pIdioma: 'Idioma',
        aNombreP: 'Personalizar',
        dias: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
        meses: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                'septiembre','octubre','noviembre','diciembre'] },
  en: { s_madrugada: 'Good night', s_manana: 'Good morning', s_tarde: 'Good afternoon', s_noche: 'Good evening',
        letras: 'Letters',
        busca: 'Search apps and the web', todas: 'All apps', fijar: 'Pin to home',
        soltar: 'Remove from home', info: 'App info', borrar: 'Uninstall',
        nada: 'No results', web: 'Search the web for “{0}”', fijado: 'Pinned',
        soltado: 'Removed from home', ajustes: 'Settings', inicio: 'Choose home app',
        sinPuente: 'Preview — no system bridge',
        aTit: 'Assistant', aPide: 'Ask the launcher for something…',
        aHola: 'Hi. I can make the icons bigger, change the columns, open or pin apps, search the web and make the mascot dance. Try: “make the apps bigger”.',
        aNoEntiendo: 'I did not get that. Try: bigger icons · 5 columns · open Spotify · pin WhatsApp · search recipes',
        aIconos: 'Icons at {0} px', aColumnas: '{0} columns', aAbrir: 'Opening {0}',
        aFijar: '{0} pinned to home', aSoltar: '{0} removed from home',
        aBuscar: 'Searching the web for “{0}”', aIdioma: 'Language: {0}',
        aMascota: 'Mascot: {0}', aCajon: 'Drawer: {0}',
        aPorIA: 'answered by the AI', aPorLocal: 'answered by the launcher',
        aSinRed: 'could not connect', aLlaveMal: 'the key does not work ({0})',
        aFalla: 'the API failed ({0})', aNiega: 'the model declined to answer',
        aLlaveTit: 'Your {0} key. It is stored on this phone only and never leaves it except for the request you type.',
        aLlavePh: 'sk-ant-…', aGuardar: 'Save', aBorrar: 'Delete', aGratis: 'free',
        aConLlave: 'With a key: {0} answers.', aSinLlave: 'No key: the launcher answers. Tap ⚙ to add yours — Gemini and Groq give one for free.',
        aLlaveOk: 'Key saved', aLlaveFuera: 'Key deleted',
        aNombre: 'Assistant',
        pTit: 'Personalize', pMascota: 'Mascot', pTamano: 'Size', pPose: 'Pose',
        pSi: 'On', pNo: 'Off', pChica: 'Small', pMedia: 'Medium', pGrande: 'Large',
        pQuieto: 'Idle', pBaila: 'Dancing', pSaluda: 'Waving', pMando: 'Playing',
        pDuerme: 'Sleeping', pIconos: 'Icon size', pColumnas: 'Columns',
        pAcento: 'Accent colour', pOscuro: 'Dim the wallpaper', pIdioma: 'Language',
        aNombreP: 'Personalize',
        dias: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        meses: ['January','February','March','April','May','June','July','August',
                'September','October','November','December'] },
  pt: { s_madrugada: 'Boa noite', s_manana: 'Bom dia', s_tarde: 'Boa tarde', s_noche: 'Boa noite',
        letras: 'Letras',
        busca: 'Buscar apps e na web', todas: 'Todos os apps', fijar: 'Fixar na tela inicial',
        soltar: 'Remover da tela inicial', info: 'Informações do app', borrar: 'Desinstalar',
        nada: 'Sem resultados', web: 'Buscar «{0}» na web', fijado: 'Fixado',
        soltado: 'Removido', ajustes: 'Configurações', inicio: 'Escolher tela inicial',
        sinPuente: 'Prévia — sem ponte com o sistema',
        aTit: 'Assistente', aPide: 'Peça algo ao launcher…',
        aHola: 'Olá. Posso aumentar os ícones, mudar as colunas, abrir ou fixar apps, buscar na web e fazer o mascote dançar. Tente: «aumente os apps».',
        aNoEntiendo: 'Não entendi. Tente: ícones maiores · 5 colunas · abrir Spotify · fixar WhatsApp · buscar receitas',
        aIconos: 'Ícones em {0} px', aColumnas: '{0} colunas', aAbrir: 'Abrindo {0}',
        aFijar: '{0} fixado na tela inicial', aSoltar: '{0} removido da tela inicial',
        aBuscar: 'Buscando «{0}» na web', aIdioma: 'Idioma: {0}',
        aMascota: 'Mascote: {0}', aCajon: 'Gaveta: {0}',
        aPorIA: 'respondeu a IA', aPorLocal: 'respondeu o launcher',
        aSinRed: 'não deu para conectar', aLlaveMal: 'a chave não serve ({0})',
        aFalla: 'a API falhou ({0})', aNiega: 'o modelo não quis responder',
        aLlaveTit: 'Sua chave de {0}. Fica guardada só neste telefone e nunca sai daqui, a não ser na consulta que você escreve.',
        aLlavePh: 'sk-ant-…', aGuardar: 'Salvar', aBorrar: 'Apagar', aGratis: 'grátis',
        aConLlave: 'Com chave: responde {0}.', aSinLlave: 'Sem chave: responde o launcher. Toque ⚙ para pôr a sua — Gemini e Groq dão uma de graça.',
        aLlaveOk: 'Chave salva', aLlaveFuera: 'Chave apagada',
        aNombre: 'Assistente',
        pTit: 'Personalizar', pMascota: 'Mascote', pTamano: 'Tamanho', pPose: 'Pose',
        pSi: 'Sim', pNo: 'Não', pChica: 'Pequeno', pMedia: 'Médio', pGrande: 'Grande',
        pQuieto: 'Parado', pBaila: 'Dançando', pSaluda: 'Acenando', pMando: 'Jogando',
        pDuerme: 'Dormindo', pIconos: 'Tamanho dos ícones', pColumnas: 'Colunas',
        pAcento: 'Cor de destaque', pOscuro: 'Escurecer o fundo', pIdioma: 'Idioma',
        aNombreP: 'Personalizar',
        dias: ['domingo','segunda','terça','quarta','quinta','sexta','sábado'],
        meses: ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto',
                'setembro','outubro','novembro','dezembro'] }
};
let LANG = (function(){
  /* ── EL IDIOMA ELEGIDO SOBREVIVE A UNA RECARGA ──
     Salía sólo de `navigator.language`, así que cambiarlo desde el asistente
     duraba hasta que Android matara el proceso. Se guarda; lo del navegador
     queda de valor de fábrica. */
  try { const g = JSON.parse(localStorage.getItem('aero_lang') || 'null');
        if (g && TXT[g]) return g; } catch (e){}
  return (navigator.language || 'es').slice(0, 2);
})();
if (!TXT[LANG]) LANG = 'es';
function T(k, a){ const s = (TXT[LANG] || TXT.es)[k] || k; return a === undefined ? s : String(s).replace('{0}', a); }

/* ── LA REJA ES DE CUATRO Y LAS FILAS SE CUENTAN ──
   Cuatro columnas es lo que entra cómodo en un teléfono con iconos de 60 px y
   nombre debajo. Las filas por página NO son un número escrito: salen de medir
   el alto que quedó libre después del reloj, la búsqueda y el dock, así que un
   teléfono corto muestra menos y uno largo más, en vez de cortar la última. */
let COLS = 4, ICO = 60, ALTO_AP = 92;

/* ── AGRANDAR UN ICONO ES MOVER TRES NÚMEROS, NO UNO ──
   El alto de una celda es el icono más el nombre y el aire; y `calculaFilas`
   divide por ese alto, así que agrandando sólo el icono la última fila queda
   cortada por el dock. Los tres salen de acá y de ningún otro sitio. */
function ponReja(ico, cols){
  ICO = cl(Math.round(ico || ICO), 40, 92);
  COLS = cl(Math.round(cols || COLS), 3, 6);
  ALTO_AP = ICO + 32;
  const r = document.documentElement.style;
  r.setProperty('--ico', ICO + 'px');
  r.setProperty('--icoImg', Math.round(ICO*0.767) + 'px');
  r.setProperty('--cols', COLS);
  guarda('ico', ICO); guarda('cols', COLS);
  return { ico: ICO, cols: COLS, alto: ALTO_AP };
}

function guarda(k, v){ try { localStorage.setItem('aero_' + k, JSON.stringify(v)); } catch (e) {} }
function lee(k, d){
  try { const v = localStorage.getItem('aero_' + k); return v === null ? d : JSON.parse(v); }
  catch (e){ return d; }
}

/* sin acentos y en minúscula: es como se busca con el dedo */
function norm(s){
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function vibra(ms){ try { if (HAY_AND && AND.vibra) AND.vibra(ms || 12); } catch (e) {} }

let AVISO_T = 0;
function avisa(t){
  const e = $('#aviso'); e.textContent = t; e.classList.add('on');
  clearTimeout(AVISO_T); AVISO_T = setTimeout(() => e.classList.remove('on'), 1900);
}
