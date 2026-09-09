/* ══════════════════════ LAS TABLAS ══════════════════════ */

const $ = s => document.querySelector(s);
const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

/* la baldosa ya armada de cada app del cajón; ver `cajCacheLimpia` en e.js */
let CAJ_NODO = new Map();
/* con qué filtro se pintó la lista del cajón por última vez: `null` es «hay que
   pintarla». Abrir el cajón con la lista ya pintada para '' no la repinta. */
let CAJ_ULT_Q = null;
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
        oOcultar: 'Ocultar del cajón', oMostrar: 'Mostrar en el cajón',
        oOculta: 'Oculta', oMostrada: 'De vuelta en el cajón',
        sugTit: 'Las que más usás',
        dtapFalta: 'Falta el permiso de accesibilidad',
        pInsig: 'Punto de notificación', pSug: 'Fila de sugeridas',
        pDtap: 'Doble toque para bloquear', pOcultas: 'Apps ocultas',
        pCopia: 'Copia de seguridad',
        pCopiaPh: 'Pegá acá una copia para restaurarla',
        pCopiaSac: 'Sacar copia', pCopiaPon: 'Restaurar',
        pCopiaLista: 'Copiala de ahí', pCopiaOk: 'Restaurada',
        pCopiaMala: 'Eso no es una copia', pCopiaVacia: 'Pegá la copia primero',
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
        aPorIA: 'contestó la IA',
        aFondo: 'Fondo: {0}', aIcoFondo: 'Fondo de los iconos: {0}', aWidget: 'Widget: {0}', aOscuro: 'Fondo oscurecido al {0} %', aQHora: 'Son las {0}', aQFecha: 'Hoy es {0}', aQBateria: 'Tenés {0} % de batería', aQApps: 'Tenés {0} apps instaladas', aQLuna: 'La luna está {0}, al {1} %', aPorLocal: 'contestó el launcher',
        aSinRed: 'no se pudo conectar', aLlaveMal: 'la llave no sirve ({0})',
        aFalla: 'la API falló ({0})', aNiega: 'el modelo no quiso contestar', aOcupado: 'el servicio gratis está ocupado',
        aLlaveTit: 'Tu llave de {0}. Se guarda sólo en este teléfono y nunca sale de acá salvo para la consulta que vos escribís.',
        aLlavePh: 'sk-ant-…', aGuardar: 'Guardar', aBorrar: 'Borrar', aGratis: 'gratis', aSinLlaveNom: 'Sin llave',
        aConLlave: 'Con llave: contesta {0}.', aSinLlave: 'Sin llave: contesta el launcher. Tocá ⚙ para poner la tuya — Gemini y Groq la dan gratis.',
        aLlaveOk: 'Llave guardada', aLlaveFuera: 'Llave borrada',
        aNombre: 'Asistente',
        pTit: 'Personalizar', pMascota: 'Mascota', pTamano: 'Tamaño', pPose: 'Pose',
        pSi: 'Sí', pNo: 'No', pChica: 'Chica', pMedia: 'Media', pGrande: 'Grande',
        pQuieto: 'Quieta', pBaila: 'Bailando', pSaluda: 'Saludando', pMando: 'Jugando',
        pDuerme: 'Durmiendo', pIconos: 'Tamaño de los iconos', pColumnas: 'Columnas',
        pPack: 'Pack Aero de iconos', nTit: 'NOTIFICACIONES', nLimpiar: 'Limpiar', nVacio: 'Nada nuevo', nAhora: 'ahora', nMin: 'hace {0} min', nHora: 'hace {0} h', nPide: 'Para ver tus notificaciones acá, Android pide que lo habilites a mano. Es la única cosa de este launcher que no se puede prender desde adentro.', nPermitir: 'Habilitar', nEspera: 'Habilitado. Esperando a que Android conecte el servicio…', nSinPuente: 'Vista previa: sin conexión con el sistema no hay notificaciones que leer.', ccPie: 'Los que llevan ↗ abren el panel del sistema: desde Android 10 una app no puede prender el wifi ni los datos por su cuenta.', ccAtajo: 'Abriría: {0}', cc_wifi: 'Wi-Fi', cc_datos: 'Datos', cc_bt: 'Bluetooth', cc_linterna: 'Linterna', cc_avion: 'Avión', cc_rotar: 'Rotación', cc_dnd: 'No molestar', cc_ubicacion: 'Ubicación', cc_bateria: 'Batería', cc_nfc: 'NFC', cc_ajustes: 'Ajustes', cc_cam: 'Cámara', cc_barra: 'Notificaciones', cc_rapidos: 'Ajustes rápidos', cc_recientes: 'Recientes', cc_bloquear: 'Bloquear', aPide: 'Bajar la barra de notificaciones, ver recientes y bloquear la pantalla son acciones del sistema: hace falta el permiso de accesibilidad. No lee nada de lo que hay en pantalla.', aEspera: 'Accesibilidad habilitada. Esperando a que Android conecte el servicio…', aSinPuente: 'Vista previa: sin conexión con el sistema no hay barra que bajar.', bvPack: 'Elegí tus iconos', bvPackD: 'Todos son de vidrio Aero. Se puede cambiar cuando quieras desde Personalizar.', bvReja: '¿De qué tamaño?', bvRejaD: 'Cuántas apps entran en cada fila del escritorio.', bvGrande: 'Grandes', bvMedia: 'Medianos', bvChica: 'Chicos', bvMini: 'Muchos', bvCajon: '¿Cómo querés el cajón?', bvCajonD: 'Por letras pone un encabezado por letra; todo junto es una sola reja, y el riel del costado resalta las de esa letra.', bvCam: '¿Qué cámara abre una cámara?', bvCamD: 'La Aero es la de este launcher: vidrio líquido y fondo Frutiger.', bvCC: '¿Centro de control propio?', bvCCD: 'Bajando el dedo en el escritorio se abre uno de vidrio, en vez del panel del sistema.', bvSig: 'Seguir', bvListo: 'Listo', bvAtras: 'Atrás', pCam: 'Al tocar una cámara', pPreg: 'Preguntar', pCC: 'Centro de control propio', pCajon: 'Cajón de apps', pPorLetras: 'Por letras', pJunto: 'Todo junto',
        pk_aero:'Aero',pk_vidrio:'Vidrio puro',pk_burbuja:'Burbuja',pk_bliss:'Colina',pk_tinta:'Tinta',pk_neon:'Neón',pk_generado:'Generado',pk_cristal:'Cristal',pk_nativo:'El del sistema', pIcono: 'Fondo de los iconos', pAgua: 'Agua', pPasto: 'Pasto', pNube: 'Nubes',
        /* ── la cámara Aero ── */
        caElegi:'¿Con cuál sacás la foto?', caElegiD:'Aero es la de este launcher: vidrio líquido y fondo Frutiger. La del sistema es la que tenés puesta.',
        caAero:'CÁMARA AERO', caSistema:'Cámara del sistema', caCam:'Cámara Aero',
        caAbriendo:'Abriendo la cámara…', caPermiso:'Tocá acá y permití la cámara', caFalla:'No se pudo abrir', caSinCam:'Todavía no hay imagen', caSinSis:'No hay una cámara del sistema',
        caAspecto:'Relación de aspecto', caNoct:'Nocturno', caEstab:'Estabilizar', caTele:'Teleprónter', caConfig:'Configuración',
        caF_origin:'Origin', caF_bn:'B/N', caF_mejora:'Mejora',
        cmPro:'Pro', cmVideo:'Video', cmFoto:'Foto', cmRetrato:'Retrato', cmDoc:'Documentos', cmDual:'Video dual', cmPano:'Panorámica', cmLapso:'Time-lapse', cmLenta:'Cámara lenta',
        caAjustes:'Ajustes de cámara', caTab_foto:'Foto', caTab_video:'Video', caTab_general:'General',
        caMarca:'Marca de agua', caIA:'Recomendaciones con IA', caFocal:'Distancia focal predeterminada de la cámara principal',
        caFormato:'Formato de imagen', caCalidad:'Calidad de imagen', caMedicion:'Preferencias de medición',
        caSelfie:'Ajustes de Selfie', caObtura:'Tipo de obturador', caVista:'Parámetros de visualización (Foto)',
        caSeguir:'Enfocar y seguir el movimiento', caSeguirD:'Identifique un sujeto automáticamente o toque dos veces para bloquear el enfoque automático. Disponible en los modos Foto y Pro.',
        caLente:'Corregir distorsión de la lente', caLenteD:'Corregir distorsión de la lente en fotografías',
        caOff:'Desactivado', caOn:'Activado', ca23:'23mm', ca35:'35mm', ca50:'50mm',
        caJPG:'JPG', caHEIF:'HEIF', caRAW:'RAW', caAlta:'Alta', caMedia:'Media', caBaja:'Baja',
        caRostro:'Rostro', caCentro:'Centro', caMatriz:'Matriz',
        cvCodec:'Codificador de video', cvHEVC:'HEVC', cvH264:'H.264', cvAudio:'Ajustes de audio',
        cvSeguirD:'Identifique un sujeto automáticamente o toque dos veces para bloquear el enfoque automático. Disponible en el modo Video, admite hasta 4K/30FPS.',
        cvHDR:'HDR10+', cvHDRD:'Grabe videos de alta resolución en HDR10+/HDR10 para optimizar los colores y el rango dinámico.',
        cvFps:'Tasa de fotogramas automática', cvFpsD:'Reduzca automáticamente la tasa de fotogramas de los videos en entornos con poca luz o alta temperatura',
        cgReja:'Cuadrículas', cg33:'3 × 3', cg44:'4 × 4',
        cgSalva:'Salvapantallas', cgSalvaD:'Cuando utilice la cámara durante más de 3 minutos, se mostrará el salvapantallas para ahorrar batería.',
        cgGuarda:'Conservar los ajustes', cgGuardaD:'Conservar el modo utilizado anteriormente en lugar de restablecer automáticamente las preferencias predeterminadas',
        cgDiseno:'Diseño de la función', cgModos:'Modos de cámara', cgColor:'Color de la interfaz de la cámara',
        cgSonido:'Sonido del disparador', cgPeli:'Película', cgClasico:'Clásico', cgSuave:'Suave',
        cgObtur:'Sonido del obturador', cgObturD:'Esta función no está disponible para momentos en vivo',
        cgVol:'Función de los botones de volumen', cgInfo:'Guardar información de la ubicación',
        pAcento: 'Color de acento', pOscuro: 'Oscurecer el fondo', pIdioma: 'Idioma',
        pMedir: 'Medir los cuadros de cada gesto',
        pMedeUno: '{0} \u00b7 {1} cuadros \u00b7 mediana {2} ms \u00b7 p90 {3} \u00b7 {4} perdidos',
        pMedeSube: 'AL SUBIR', pMedeBaja: 'AL BAJAR', pMedeScroll: 'SCROLLEANDO',
        pMedeCC: 'BAJANDO EL CENTRO', pMedeCCS: 'SUBIENDO EL CENTRO',
        aNombreP: 'Personalizar',
        cCarpeta: 'Carpeta', cSacada: 'La saqué de la carpeta',
        fgGenar: 'Generar', fgGenando: 'Generando…', fgGenPh: 'Describí un fondo…', fgGenOk: 'Fondo nuevo', fgNoGen: 'No se pudo generar. Probá de nuevo.', fgSinRed: 'Generar necesita conexión con el sistema', fg_i1: 'acuario con peces y burbujas', fg_i2: 'pasto con rocío al amanecer', fg_i3: 'nubes sobre un cielo celeste', fg_i4: 'isla con una palmera', fg_i5: 'atardecer sobre el mar', fg_i6: 'burbujas de vidrio bajo el agua', fgTit: 'Fondo de pantalla', fgFab: 'De fábrica', fgPropio: 'La tuya',
        fgWid: 'Widgets', wLleno: 'No entran más widgets: sacá uno',
        wCargando: 'Cargando', wBateria: 'Batería', wNotaPh: 'Escribí algo…',
        wPone: 'Poné una fecha', wHoy: 'Es hoy', wFaltan: 'Faltan', wPasaron: 'Pasaron',
        wDia: 'Día', wMes: 'Mes', wAnio: 'Año', wDado: 'Tocá para tirar', wTareaPh: 'Anotá una tarea…',
        wNivel: 'Nivel', wPlano: 'Nivelado', wSinSensor: 'Sin sensor',
        wLunaNueva: 'Luna nueva', wLunaCre: 'Creciente', wLunaCuartoC: 'Cuarto creciente',
        wLunaGibC: 'Gibosa creciente', wLunaLlena: 'Luna llena', wLunaGibM: 'Gibosa menguante',
        wLunaCuartoM: 'Cuarto menguante', wLunaMen: 'Menguante',
        w_reloj: 'Reloj', w_horaGrande: 'Hora grande', w_analogico: 'Reloj de agujas',
        w_fecha: 'Fecha', w_semana: 'La semana', w_calendario: 'Calendario',
        w_bateria: 'Batería', w_cronometro: 'Cronómetro', w_temporizador: 'Temporizador',
        w_contador: 'Contador', w_nota: 'Nota', w_frase: 'Frase del día',
        w_cuenta: 'Cuenta de días', w_luna: 'Fase de la luna', w_nivel: 'Nivel',
        w_atajos: 'Atajos', w_tareas: 'Tareas', w_dado: 'Dado', w_mundo: 'Otras ciudades',
        w_progreso: 'Cuánto va',
        fgNoPudo: 'No pude leer esa imagen', fgGrande: 'Esa imagen no entra: probá con otra',
        fgCancel: 'Cancelar', fgTarda: 'El generador tarda: son unos treinta segundos', fgOcupado: 'El generador está ocupado. Probá de nuevo en un minuto.', fgSinNet: 'Sin internet', fgViejo: 'Actualizá la app: esta versión se traba al generar',
        fg_isla: 'Isla', fg_pasto: 'Pasto', fg_nube: 'Nubes', fg_burbujas: 'Burbujas',
        fg_arrecife: 'Arrecife', fg_atardecer: 'Atardecer', fg_lluvia: 'Lluvia', fg_hielo: 'Hielo',
        cDockLleno: 'El dock está lleno: va al escritorio',
        cPie: 'Mantené una app para sacarla de la carpeta',
        iNombre: 'Pantalla de inicio', iTit: 'Pantalla de inicio',
        iSoy: 'Aero ES tu pantalla de inicio.',
        iNoSoy: 'Aero NO es tu pantalla de inicio.',
        iPoner: 'Ponerme como inicio', iSalir: 'Dejar de ser el inicio',
        iComo: 'Al salir, el teléfono se va solo al otro launcher. Aero queda en el cajón de apps, así que se puede volver cuando quieras.',
        iSolo: 'No hay otra pantalla de inicio instalada: salir dejaría el teléfono sin ninguna.',
        iApagado: 'Ahora mismo Aero ni siquiera se ofrece como pantalla de inicio.',
        iHecho: 'Listo', iNoPudo: 'No se pudo',
        dias: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
        meses: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                'septiembre','octubre','noviembre','diciembre'] },
  en: { s_madrugada: 'Good night', s_manana: 'Good morning', s_tarde: 'Good afternoon', s_noche: 'Good evening',
        letras: 'Letters',
        busca: 'Search apps and the web', todas: 'All apps', fijar: 'Pin to home',
        soltar: 'Remove from home', info: 'App info', borrar: 'Uninstall',
        oOcultar: 'Hide from drawer', oMostrar: 'Show in drawer',
        oOculta: 'Hidden', oMostrada: 'Back in the drawer',
        sugTit: 'Most used',
        dtapFalta: 'Accessibility permission missing',
        pInsig: 'Notification dot', pSug: 'Suggestions row',
        pDtap: 'Double tap to lock', pOcultas: 'Hidden apps',
        pCopia: 'Backup',
        pCopiaPh: 'Paste a backup here to restore it',
        pCopiaSac: 'Make backup', pCopiaPon: 'Restore',
        pCopiaLista: 'Copy it from there', pCopiaOk: 'Restored',
        pCopiaMala: "That's not a backup", pCopiaVacia: 'Paste the backup first',
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
        aPorIA: 'answered by the AI',
        aFondo: 'Wallpaper: {0}', aIcoFondo: 'Icon backdrop: {0}', aWidget: 'Widget: {0}', aOscuro: 'Wallpaper dimmed to {0}%', aQHora: 'It is {0}', aQFecha: 'Today is {0}', aQBateria: 'You have {0}% battery', aQApps: 'You have {0} apps installed', aQLuna: 'The moon is {0}, {1}% lit', aPorLocal: 'answered by the launcher',
        aSinRed: 'could not connect', aLlaveMal: 'the key does not work ({0})',
        aFalla: 'the API failed ({0})', aNiega: 'the model declined to answer', aOcupado: 'the free service is busy',
        aLlaveTit: 'Your {0} key. It is stored on this phone only and never leaves it except for the request you type.',
        aLlavePh: 'sk-ant-…', aGuardar: 'Save', aBorrar: 'Delete', aGratis: 'free', aSinLlaveNom: 'No key',
        aConLlave: 'With a key: {0} answers.', aSinLlave: 'No key: the launcher answers. Tap ⚙ to add yours — Gemini and Groq give one for free.',
        aLlaveOk: 'Key saved', aLlaveFuera: 'Key deleted',
        aNombre: 'Assistant',
        pTit: 'Personalize', pMascota: 'Mascot', pTamano: 'Size', pPose: 'Pose',
        pSi: 'On', pNo: 'Off', pChica: 'Small', pMedia: 'Medium', pGrande: 'Large',
        pQuieto: 'Idle', pBaila: 'Dancing', pSaluda: 'Waving', pMando: 'Playing',
        pDuerme: 'Sleeping', pIconos: 'Icon size', pColumnas: 'Columns',
        pPack: 'Aero icon pack', nTit: 'NOTIFICATIONS', nLimpiar: 'Clear', nVacio: 'Nothing new', nAhora: 'now', nMin: '{0} min ago', nHora: '{0} h ago', nPide: 'To see your notifications here, Android needs you to enable it by hand. It is the one thing in this launcher that cannot be turned on from the inside.', nPermitir: 'Enable', nEspera: 'Enabled. Waiting for Android to connect the service…', nSinPuente: 'Preview: with no system bridge there are no notifications to read.', ccPie: 'The ones marked ↗ open the system panel: since Android 10 an app cannot turn Wi-Fi or mobile data on by itself.', ccAtajo: 'Would open: {0}', cc_wifi: 'Wi-Fi', cc_datos: 'Mobile data', cc_bt: 'Bluetooth', cc_linterna: 'Torch', cc_avion: 'Airplane', cc_rotar: 'Rotation', cc_dnd: 'Do not disturb', cc_ubicacion: 'Location', cc_bateria: 'Battery', cc_nfc: 'NFC', cc_ajustes: 'Settings', cc_cam: 'Camera', cc_barra: 'Notifications', cc_rapidos: 'Quick settings', cc_recientes: 'Recents', cc_bloquear: 'Lock', aPide: 'Pulling down the notification bar, opening recents and locking the screen are system actions: they need the accessibility permission. It reads nothing of what is on screen.', aEspera: 'Accessibility enabled. Waiting for Android to connect the service…', aSinPuente: 'Preview: with no system bridge there is no bar to pull down.', bvPack: 'Pick your icons', bvPackD: 'They are all Aero glass. You can change this any time from Personalize.', bvReja: 'What size?', bvRejaD: 'How many apps fit in each home-screen row.', bvGrande: 'Large', bvMedia: 'Medium', bvChica: 'Small', bvMini: 'Many', bvCajon: 'How do you want the drawer?', bvCajonD: 'By letter adds a heading per letter; all together is one grid, and the side rail highlights the ones with that letter.', bvCam: 'Which camera opens a camera?', bvCamD: 'Aero is the one built into this launcher: liquid glass and a Frutiger backdrop.', bvCC: 'Your own control centre?', bvCCD: 'Swiping down on the home screen opens a glass one instead of the system panel.', bvSig: 'Next', bvListo: 'Done', bvAtras: 'Back', pCam: 'When a camera is tapped', pPreg: 'Ask', pCC: 'Own control centre', pCajon: 'App drawer', pPorLetras: 'By letter', pJunto: 'All together',
        pk_aero:'Aero',pk_vidrio:'Pure glass',pk_burbuja:'Bubble',pk_bliss:'Hillside',pk_tinta:'Ink',pk_neon:'Neon',pk_generado:'Generated',pk_cristal:'Crystal',pk_nativo:'System icon', pIcono: 'Icon backdrop', pAgua: 'Water', pPasto: 'Grass', pNube: 'Clouds',
        caElegi:'Which one takes the shot?', caElegiD:'Aero is this launcher\u2019s: liquid glass over a Frutiger backdrop. System is the one you already use.',
        caAero:'AERO CAMERA', caSistema:'System camera', caCam:'Aero Camera',
        caAbriendo:'Opening the camera\u2026', caPermiso:'Tap here and allow the camera', caFalla:'Could not open', caSinCam:'No image yet', caSinSis:'No system camera found',
        caAspecto:'Aspect ratio', caNoct:'Night', caEstab:'Stabilise', caTele:'Teleprompter', caConfig:'Settings',
        caF_origin:'Origin', caF_bn:'B/W', caF_mejora:'Enhance',
        cmPro:'Pro', cmVideo:'Video', cmFoto:'Photo', cmRetrato:'Portrait', cmDoc:'Documents', cmDual:'Dual video', cmPano:'Panorama', cmLapso:'Time-lapse', cmLenta:'Slow motion',
        caAjustes:'Camera settings', caTab_foto:'Photo', caTab_video:'Video', caTab_general:'General',
        caMarca:'Watermark', caIA:'AI recommendations', caFocal:'Default focal length of the main camera',
        caFormato:'Image format', caCalidad:'Image quality', caMedicion:'Metering preference',
        caSelfie:'Selfie settings', caObtura:'Shutter type', caVista:'Preview parameters (Photo)',
        caSeguir:'Focus and track motion', caSeguirD:'Identify a subject automatically, or double tap to lock autofocus. Available in Photo and Pro modes.',
        caLente:'Correct lens distortion', caLenteD:'Correct lens distortion in photographs',
        caOff:'Off', caOn:'On', ca23:'23mm', ca35:'35mm', ca50:'50mm',
        caJPG:'JPG', caHEIF:'HEIF', caRAW:'RAW', caAlta:'High', caMedia:'Medium', caBaja:'Low',
        caRostro:'Face', caCentro:'Centre', caMatriz:'Matrix',
        cvCodec:'Video encoder', cvHEVC:'HEVC', cvH264:'H.264', cvAudio:'Audio settings',
        cvSeguirD:'Identify a subject automatically, or double tap to lock autofocus. Available in Video mode, up to 4K/30FPS.',
        cvHDR:'HDR10+', cvHDRD:'Record high-resolution video in HDR10+/HDR10 to optimise colour and dynamic range.',
        cvFps:'Automatic frame rate', cvFpsD:'Automatically lower the video frame rate in low light or high temperature',
        cgReja:'Grid lines', cg33:'3 \u00d7 3', cg44:'4 \u00d7 4',
        cgSalva:'Screensaver', cgSalvaD:'After 3 minutes of camera use the screensaver appears to save battery.',
        cgGuarda:'Keep settings', cgGuardaD:'Keep the mode used last instead of resetting to the defaults',
        cgDiseno:'Feature layout', cgModos:'Camera modes', cgColor:'Camera interface colour',
        cgSonido:'Shutter tone', cgPeli:'Film', cgClasico:'Classic', cgSuave:'Soft',
        cgObtur:'Shutter sound', cgObturD:'Not available for live moments',
        cgVol:'Volume button action', cgInfo:'Save location information',
        pAcento: 'Accent colour', pOscuro: 'Dim the wallpaper', pIdioma: 'Language',
        pMedir: 'Measure frames on every gesture',
        pMedeUno: '{0} \u00b7 {1} frames \u00b7 median {2} ms \u00b7 p90 {3} \u00b7 {4} dropped',
        pMedeSube: 'OPENING', pMedeBaja: 'CLOSING', pMedeScroll: 'SCROLLING',
        pMedeCC: 'SHADE DOWN', pMedeCCS: 'SHADE UP',
        aNombreP: 'Personalize',
        cCarpeta: 'Folder', cSacada: 'Taken out of the folder',
        fgGenar: 'Generate', fgGenando: 'Generating…', fgGenPh: 'Describe a wallpaper…', fgGenOk: 'New wallpaper', fgNoGen: 'Could not generate. Try again.', fgSinRed: 'Generating needs the system bridge', fg_i1: 'aquarium with fish and bubbles', fg_i2: 'dewy grass at sunrise', fg_i3: 'clouds over a bright blue sky', fg_i4: 'island with a palm tree', fg_i5: 'sunset over the sea', fg_i6: 'glass bubbles underwater', fgTit: 'Wallpaper', fgFab: 'Default', fgPropio: 'Yours',
        fgWid: 'Widgets', wLleno: 'No room for more widgets: remove one',
        wCargando: 'Charging', wBateria: 'Battery', wNotaPh: 'Write something…',
        wPone: 'Pick a date', wHoy: 'Today', wFaltan: 'Days to go', wPasaron: 'Days since',
        wDia: 'Day', wMes: 'Month', wAnio: 'Year', wDado: 'Tap to roll', wTareaPh: 'Add a task…',
        wNivel: 'Level', wPlano: 'Level', wSinSensor: 'No sensor',
        wLunaNueva: 'New moon', wLunaCre: 'Waxing crescent', wLunaCuartoC: 'First quarter',
        wLunaGibC: 'Waxing gibbous', wLunaLlena: 'Full moon', wLunaGibM: 'Waning gibbous',
        wLunaCuartoM: 'Last quarter', wLunaMen: 'Waning crescent',
        w_reloj: 'Clock', w_horaGrande: 'Big clock', w_analogico: 'Analogue clock',
        w_fecha: 'Date', w_semana: 'This week', w_calendario: 'Calendar',
        w_bateria: 'Battery', w_cronometro: 'Stopwatch', w_temporizador: 'Timer',
        w_contador: 'Counter', w_nota: 'Note', w_frase: 'Quote of the day',
        w_cuenta: 'Day counter', w_luna: 'Moon phase', w_nivel: 'Spirit level',
        w_atajos: 'Shortcuts', w_tareas: 'To-do', w_dado: 'Die', w_mundo: 'World clock',
        w_progreso: 'Progress',
        fgNoPudo: "Couldn't read that image", fgGrande: "That image doesn't fit: try another",
        fgCancel: 'Cancel', fgTarda: 'The generator is slow: about thirty seconds', fgOcupado: 'The generator is busy. Try again in a minute.', fgSinNet: 'No internet', fgViejo: 'Update the app: this build freezes while generating',
        fg_isla: 'Island', fg_pasto: 'Grass', fg_nube: 'Clouds', fg_burbujas: 'Bubbles',
        fg_arrecife: 'Reef', fg_atardecer: 'Sunset', fg_lluvia: 'Rain', fg_hielo: 'Ice',
        cDockLleno: 'The dock is full: it goes to the desktop',
        cPie: 'Hold an app to take it out of the folder',
        iNombre: 'Home screen', iTit: 'Home screen',
        iSoy: 'Aero IS your home screen.',
        iNoSoy: 'Aero is NOT your home screen.',
        iPoner: 'Make me the home screen', iSalir: 'Stop being the home screen',
        iComo: 'When you leave, the phone goes to the other launcher on its own. Aero stays in the app drawer, so you can come back whenever you want.',
        iSolo: 'There is no other home screen installed: leaving would leave the phone without one.',
        iApagado: 'Right now Aero is not even offering itself as a home screen.',
        iHecho: 'Done', iNoPudo: 'Could not',
        dias: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        meses: ['January','February','March','April','May','June','July','August',
                'September','October','November','December'] },
  pt: { s_madrugada: 'Boa noite', s_manana: 'Bom dia', s_tarde: 'Boa tarde', s_noche: 'Boa noite',
        letras: 'Letras',
        busca: 'Buscar apps e na web', todas: 'Todos os apps', fijar: 'Fixar na tela inicial',
        soltar: 'Remover da tela inicial', info: 'Informações do app', borrar: 'Desinstalar',
        oOcultar: 'Ocultar da gaveta', oMostrar: 'Mostrar na gaveta',
        oOculta: 'Oculto', oMostrada: 'De volta na gaveta',
        sugTit: 'Mais usados',
        dtapFalta: 'Falta a permissão de acessibilidade',
        pInsig: 'Ponto de notificação', pSug: 'Linha de sugeridos',
        pDtap: 'Toque duplo para bloquear', pOcultas: 'Apps ocultos',
        pCopia: 'Cópia de segurança',
        pCopiaPh: 'Cole aqui uma cópia para restaurá-la',
        pCopiaSac: 'Fazer cópia', pCopiaPon: 'Restaurar',
        pCopiaLista: 'Copie de lá', pCopiaOk: 'Restaurada',
        pCopiaMala: 'Isso não é uma cópia', pCopiaVacia: 'Cole a cópia primeiro',
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
        aPorIA: 'respondeu a IA',
        aFondo: 'Papel de parede: {0}', aIcoFondo: 'Fundo dos ícones: {0}', aWidget: 'Widget: {0}', aOscuro: 'Fundo escurecido a {0} %', aQHora: 'São {0}', aQFecha: 'Hoje é {0}', aQBateria: 'Você tem {0} % de bateria', aQApps: 'Você tem {0} apps instalados', aQLuna: 'A lua está {0}, a {1} %', aPorLocal: 'respondeu o launcher',
        aSinRed: 'não deu para conectar', aLlaveMal: 'a chave não serve ({0})',
        aFalla: 'a API falhou ({0})', aNiega: 'o modelo não quis responder', aOcupado: 'o serviço grátis está ocupado',
        aLlaveTit: 'Sua chave de {0}. Fica guardada só neste telefone e nunca sai daqui, a não ser na consulta que você escreve.',
        aLlavePh: 'sk-ant-…', aGuardar: 'Salvar', aBorrar: 'Apagar', aGratis: 'grátis', aSinLlaveNom: 'Sem chave',
        aConLlave: 'Com chave: responde {0}.', aSinLlave: 'Sem chave: responde o launcher. Toque ⚙ para pôr a sua — Gemini e Groq dão uma de graça.',
        aLlaveOk: 'Chave salva', aLlaveFuera: 'Chave apagada',
        aNombre: 'Assistente',
        pTit: 'Personalizar', pMascota: 'Mascote', pTamano: 'Tamanho', pPose: 'Pose',
        pSi: 'Sim', pNo: 'Não', pChica: 'Pequeno', pMedia: 'Médio', pGrande: 'Grande',
        pQuieto: 'Parado', pBaila: 'Dançando', pSaluda: 'Acenando', pMando: 'Jogando',
        pDuerme: 'Dormindo', pIconos: 'Tamanho dos ícones', pColumnas: 'Colunas',
        pPack: 'Pacote de ícones Aero', nTit: 'NOTIFICAÇÕES', nLimpiar: 'Limpar', nVacio: 'Nada novo', nAhora: 'agora', nMin: 'há {0} min', nHora: 'há {0} h', nPide: 'Para ver suas notificações aqui, o Android pede que você habilite na mão. É a única coisa deste launcher que não se liga por dentro.', nPermitir: 'Habilitar', nEspera: 'Habilitado. Esperando o Android conectar o serviço…', nSinPuente: 'Prévia: sem ponte com o sistema não há notificações para ler.', ccPie: 'Os marcados com ↗ abrem o painel do sistema: desde o Android 10 um app não pode ligar o Wi-Fi nem os dados sozinho.', ccAtajo: 'Abriria: {0}', cc_wifi: 'Wi-Fi', cc_datos: 'Dados', cc_bt: 'Bluetooth', cc_linterna: 'Lanterna', cc_avion: 'Avião', cc_rotar: 'Rotação', cc_dnd: 'Não perturbe', cc_ubicacion: 'Localização', cc_bateria: 'Bateria', cc_nfc: 'NFC', cc_ajustes: 'Ajustes', cc_cam: 'Câmera', cc_barra: 'Notificações', cc_rapidos: 'Ajustes rápidos', cc_recientes: 'Recentes', cc_bloquear: 'Bloquear', aPide: 'Baixar a barra de notificações, ver recentes e bloquear a tela são ações do sistema: precisam da permissão de acessibilidade. Não lê nada do que está na tela.', aEspera: 'Acessibilidade habilitada. Esperando o Android conectar o serviço…', aSinPuente: 'Prévia: sem ponte com o sistema não há barra para baixar.', bvPack: 'Escolha seus ícones', bvPackD: 'Todos são de vidro Aero. Dá para mudar quando quiser em Personalizar.', bvReja: 'De que tamanho?', bvRejaD: 'Quantos apps cabem em cada linha da tela inicial.', bvGrande: 'Grandes', bvMedia: 'Médios', bvChica: 'Pequenos', bvMini: 'Muitos', bvCajon: 'Como quer a gaveta?', bvCajonD: 'Por letra coloca um cabeçalho por letra; tudo junto é uma grade só, e o trilho lateral destaca os dessa letra.', bvCam: 'Qual câmera abre uma câmera?', bvCamD: 'A Aero é a deste launcher: vidro líquido e fundo Frutiger.', bvCC: 'Central de controle própria?', bvCCD: 'Deslizando para baixo na tela inicial abre uma de vidro, em vez do painel do sistema.', bvSig: 'Seguir', bvListo: 'Pronto', bvAtras: 'Voltar', pCam: 'Ao tocar uma câmera', pPreg: 'Perguntar', pCC: 'Central de controle própria', pCajon: 'Gaveta de apps', pPorLetras: 'Por letra', pJunto: 'Tudo junto',
        pk_aero:'Aero',pk_vidrio:'Vidro puro',pk_burbuja:'Bolha',pk_bliss:'Colina',pk_tinta:'Tinta',pk_neon:'Néon',pk_generado:'Gerado',pk_cristal:'Cristal',pk_nativo:'Do sistema', pIcono: 'Fundo dos ícones', pAgua: 'Água', pPasto: 'Grama', pNube: 'Nuvens',
        caElegi:'Com qual voc\u00ea tira a foto?', caElegiD:'Aero \u00e9 a deste launcher: vidro l\u00edquido sobre um fundo Frutiger. A do sistema \u00e9 a que voc\u00ea j\u00e1 usa.',
        caAero:'C\u00c2MERA AERO', caSistema:'C\u00e2mera do sistema', caCam:'C\u00e2mera Aero',
        caAbriendo:'Abrindo a c\u00e2mera\u2026', caPermiso:'Toque aqui e permita a c\u00e2mera', caFalla:'N\u00e3o foi poss\u00edvel abrir', caSinCam:'Ainda n\u00e3o h\u00e1 imagem', caSinSis:'Nenhuma c\u00e2mera do sistema',
        caAspecto:'Propor\u00e7\u00e3o', caNoct:'Noturno', caEstab:'Estabilizar', caTele:'Telepr\u00f4mpter', caConfig:'Configura\u00e7\u00e3o',
        caF_origin:'Origin', caF_bn:'P/B', caF_mejora:'Melhorar',
        cmPro:'Pro', cmVideo:'V\u00eddeo', cmFoto:'Foto', cmRetrato:'Retrato', cmDoc:'Documentos', cmDual:'V\u00eddeo duplo', cmPano:'Panor\u00e2mica', cmLapso:'Time-lapse', cmLenta:'C\u00e2mera lenta',
        caAjustes:'Ajustes da c\u00e2mera', caTab_foto:'Foto', caTab_video:'V\u00eddeo', caTab_general:'Geral',
        caMarca:'Marca d\u2019\u00e1gua', caIA:'Recomenda\u00e7\u00f5es com IA', caFocal:'Dist\u00e2ncia focal padr\u00e3o da c\u00e2mera principal',
        caFormato:'Formato da imagem', caCalidad:'Qualidade da imagem', caMedicion:'Prefer\u00eancias de medi\u00e7\u00e3o',
        caSelfie:'Ajustes de Selfie', caObtura:'Tipo de obturador', caVista:'Par\u00e2metros de visualiza\u00e7\u00e3o (Foto)',
        caSeguir:'Focar e seguir o movimento', caSeguirD:'Identifique um sujeito automaticamente ou toque duas vezes para bloquear o foco autom\u00e1tico. Dispon\u00edvel nos modos Foto e Pro.',
        caLente:'Corrigir distor\u00e7\u00e3o da lente', caLenteD:'Corrigir distor\u00e7\u00e3o da lente nas fotografias',
        caOff:'Desativado', caOn:'Ativado', ca23:'23mm', ca35:'35mm', ca50:'50mm',
        caJPG:'JPG', caHEIF:'HEIF', caRAW:'RAW', caAlta:'Alta', caMedia:'M\u00e9dia', caBaja:'Baixa',
        caRostro:'Rosto', caCentro:'Centro', caMatriz:'Matriz',
        cvCodec:'Codificador de v\u00eddeo', cvHEVC:'HEVC', cvH264:'H.264', cvAudio:'Ajustes de \u00e1udio',
        cvSeguirD:'Identifique um sujeito automaticamente ou toque duas vezes para bloquear o foco autom\u00e1tico. Dispon\u00edvel no modo V\u00eddeo, at\u00e9 4K/30FPS.',
        cvHDR:'HDR10+', cvHDRD:'Grave v\u00eddeos de alta resolu\u00e7\u00e3o em HDR10+/HDR10 para otimizar as cores e a faixa din\u00e2mica.',
        cvFps:'Taxa de quadros autom\u00e1tica', cvFpsD:'Reduza automaticamente a taxa de quadros dos v\u00eddeos em ambientes com pouca luz ou alta temperatura',
        cgReja:'Grades', cg33:'3 \u00d7 3', cg44:'4 \u00d7 4',
        cgSalva:'Protetor de tela', cgSalvaD:'Ao usar a c\u00e2mera por mais de 3 minutos, o protetor de tela aparece para poupar bateria.',
        cgGuarda:'Conservar os ajustes', cgGuardaD:'Conservar o modo usado anteriormente em vez de restaurar as prefer\u00eancias padr\u00e3o',
        cgDiseno:'Desenho da fun\u00e7\u00e3o', cgModos:'Modos de c\u00e2mera', cgColor:'Cor da interface da c\u00e2mera',
        cgSonido:'Som do disparador', cgPeli:'Filme', cgClasico:'Cl\u00e1ssico', cgSuave:'Suave',
        cgObtur:'Som do obturador', cgObturD:'Este recurso n\u00e3o est\u00e1 dispon\u00edvel para momentos ao vivo',
        cgVol:'Fun\u00e7\u00e3o dos bot\u00f5es de volume', cgInfo:'Salvar informa\u00e7\u00e3o da localiza\u00e7\u00e3o',
        pAcento: 'Cor de destaque', pOscuro: 'Escurecer o fundo', pIdioma: 'Idioma',
        pMedir: 'Medir os quadros de cada gesto',
        pMedeUno: '{0} \u00b7 {1} quadros \u00b7 mediana {2} ms \u00b7 p90 {3} \u00b7 {4} perdidos',
        pMedeSube: 'AO ABRIR', pMedeBaja: 'AO FECHAR', pMedeScroll: 'ROLANDO',
        pMedeCC: 'ABRINDO O CENTRO', pMedeCCS: 'FECHANDO O CENTRO',
        aNombreP: 'Personalizar',
        cCarpeta: 'Pasta', cSacada: 'Tirei da pasta',
        fgGenar: 'Gerar', fgGenando: 'Gerando…', fgGenPh: 'Descreva um fundo…', fgGenOk: 'Fundo novo', fgNoGen: 'Não deu para gerar. Tente de novo.', fgSinRed: 'Gerar precisa da ponte com o sistema', fg_i1: 'aquário com peixes e bolhas', fg_i2: 'grama com orvalho ao amanhecer', fg_i3: 'nuvens num céu azul claro', fg_i4: 'ilha com uma palmeira', fg_i5: 'pôr do sol sobre o mar', fg_i6: 'bolhas de vidro debaixo da água', fgTit: 'Papel de parede', fgFab: 'De fábrica', fgPropio: 'Sua',
        fgWid: 'Widgets', wLleno: 'Não cabem mais widgets: tire um',
        wCargando: 'Carregando', wBateria: 'Bateria', wNotaPh: 'Escreva algo…',
        wPone: 'Escolha uma data', wHoy: 'É hoje', wFaltan: 'Faltam', wPasaron: 'Passaram',
        wDia: 'Dia', wMes: 'Mês', wAnio: 'Ano', wDado: 'Toque para rolar', wTareaPh: 'Anote uma tarefa…',
        wNivel: 'Nível', wPlano: 'Nivelado', wSinSensor: 'Sem sensor',
        wLunaNueva: 'Lua nova', wLunaCre: 'Crescente', wLunaCuartoC: 'Quarto crescente',
        wLunaGibC: 'Gibosa crescente', wLunaLlena: 'Lua cheia', wLunaGibM: 'Gibosa minguante',
        wLunaCuartoM: 'Quarto minguante', wLunaMen: 'Minguante',
        w_reloj: 'Relógio', w_horaGrande: 'Hora grande', w_analogico: 'Relógio de ponteiros',
        w_fecha: 'Data', w_semana: 'A semana', w_calendario: 'Calendário',
        w_bateria: 'Bateria', w_cronometro: 'Cronômetro', w_temporizador: 'Temporizador',
        w_contador: 'Contador', w_nota: 'Nota', w_frase: 'Frase do dia',
        w_cuenta: 'Contagem de dias', w_luna: 'Fase da lua', w_nivel: 'Nível',
        w_atajos: 'Atalhos', w_tareas: 'Tarefas', w_dado: 'Dado', w_mundo: 'Outras cidades',
        w_progreso: 'Quanto já foi',
        fgNoPudo: 'Não consegui ler essa imagem', fgGrande: 'Essa imagem não cabe: tente outra',
        fgCancel: 'Cancelar', fgTarda: 'O gerador demora: uns trinta segundos', fgOcupado: 'O gerador está ocupado. Tente de novo num minuto.', fgSinNet: 'Sem internet', fgViejo: 'Atualize o app: esta versão trava ao gerar',
        fg_isla: 'Ilha', fg_pasto: 'Grama', fg_nube: 'Nuvens', fg_burbujas: 'Bolhas',
        fg_arrecife: 'Recife', fg_atardecer: 'Pôr do sol', fg_lluvia: 'Chuva', fg_hielo: 'Gelo',
        cDockLleno: 'A dock está cheia: vai para a área de trabalho',
        cPie: 'Segure um app para tirá-lo da pasta',
        iNombre: 'Tela inicial', iTit: 'Tela inicial',
        iSoy: 'O Aero É a sua tela inicial.',
        iNoSoy: 'O Aero NÃO é a sua tela inicial.',
        iPoner: 'Colocar como tela inicial', iSalir: 'Deixar de ser a tela inicial',
        iComo: 'Ao sair, o telefone vai sozinho para o outro launcher. O Aero fica na gaveta de apps, então dá para voltar quando quiser.',
        iSolo: 'Não há outra tela inicial instalada: sair deixaria o telefone sem nenhuma.',
        iApagado: 'Agora mesmo o Aero nem se oferece como tela inicial.',
        iHecho: 'Pronto', iNoPudo: 'Não deu',
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
/* ── SUSTITUYE {0}, {1}, … Y NO SÓLO {0} ──
   Con un solo argumento, la frase de la luna salía «está menguante, al {1} %»:
   el marcador crudo a la vista. */
function T(k){
  let s = String((TXT[LANG] || TXT.es)[k] || k);
  for (let i = 1; i < arguments.length; i++)
    s = s.split('{' + (i - 1) + '}').join(arguments[i]);
  return s;
}

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

/* ── DEVUELVE SI PUDO, Y ESO HACE FALTA EN UN SOLO SITIO ──
   Casi todo lo que se guarda acá son números y banderas: que un ajuste no se
   escriba no cambia nada de lo que se ve. La imagen de fondo propia sí, y puede
   no entrar en la cuota — ahí hay que poder decirlo en vez de dejar al usuario
   mirando un fondo que no cambió sin ninguna explicación. */
function guarda(k, v){
  try { localStorage.setItem('aero_' + k, JSON.stringify(v)); return true; }
  catch (e){ return false; }
}
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
