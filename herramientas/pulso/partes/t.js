
/* ══════════════════════════ LOS TEXTOS ══════════════════════════
   Nada de texto suelto en el código: todo sale de acá. La función se llama TX y
   no `t` — una global de una letra la pisa cualquier cosa, y cuando se pisa no
   falla el idioma, falla TODO, porque no queda un solo texto que no pase por
   ahí. Ya pasó en Z Force. */
const LANG = {
  es: {
    mSub: 'Llevás una tabla con un bol lleno de agua.\nEl pasillo hace el resto.',
    mJugar: 'EMPEZAR', mOpc: 'OPCIONES',
    mRecord: (m) => 'más lejos: ' + m + ' m',
    oTit: 'OPCIONES', oCalidad: 'CALIDAD', oSens: 'SENSIBILIDAD',
    oSustos: 'SUSTOS', oIdioma: 'IDIOMA', oVolver: 'VOLVER',
    oBaja: 'BAJA', oMedia: 'MEDIA', oAlta: 'ALTA',
    oSuave: 'SUAVE', oNormal: 'NORMAL', oDura: 'DURA',
    oPocos: 'POCOS', oTodos: 'TODOS',
    cTit: 'SOSTENÉ LA TABLA',
    cSub: 'Agarrá el teléfono como lo vas a llevar y no lo muevas.\nEsa posición es «derecho».',
    cListo: 'ASÍ ESTÁ BIEN',
    cGiro: 'giroscopio: listo', cSinGiro: 'sin giroscopio — se juega arrastrando el dedo',
    cPide: 'tocá para permitir el sensor',
    aEmpieza: 'no la dejes caer', aTiembla: 'se está yendo', aCasi: 'CASI',
    finGano: 'LLEGASTE', finPerdio: 'SE CAYÓ',
    finGanoS: (m, s) => m + ' metros · ' + s + ' sustos aguantados',
    finPerdioS: (m) => 'a ' + m + ' metros de la puerta',
    fOtra: 'DE NUEVO', fMenu: 'MENÚ'
  },
  en: {
    mSub: 'You are carrying a board with a bowl full of water.\nThe corridor does the rest.',
    mJugar: 'START', mOpc: 'OPTIONS',
    mRecord: (m) => 'furthest: ' + m + ' m',
    oTit: 'OPTIONS', oCalidad: 'QUALITY', oSens: 'SENSITIVITY',
    oSustos: 'SCARES', oIdioma: 'LANGUAGE', oVolver: 'BACK',
    oBaja: 'LOW', oMedia: 'MEDIUM', oAlta: 'HIGH',
    oSuave: 'GENTLE', oNormal: 'NORMAL', oDura: 'HARSH',
    oPocos: 'FEWER', oTodos: 'ALL',
    cTit: 'HOLD THE BOARD',
    cSub: 'Hold the phone the way you will carry it, and keep still.\nThat position becomes «level».',
    cListo: 'THAT IS RIGHT',
    cGiro: 'gyroscope: ready', cSinGiro: 'no gyroscope — drag your finger instead',
    cPide: 'tap to allow the sensor',
    aEmpieza: 'do not drop it', aTiembla: 'it is sliding', aCasi: 'ALMOST',
    finGano: 'YOU MADE IT', finPerdio: 'IT FELL',
    finGanoS: (m, s) => m + ' metres · ' + s + ' scares held',
    finPerdioS: (m) => m + ' metres from the door',
    fOtra: 'AGAIN', fMenu: 'MENU'
  },
  pt: {
    mSub: 'Você leva uma tábua com uma tigela cheia de água.\nO corredor faz o resto.',
    mJugar: 'COMEÇAR', mOpc: 'OPÇÕES',
    mRecord: (m) => 'mais longe: ' + m + ' m',
    oTit: 'OPÇÕES', oCalidad: 'QUALIDADE', oSens: 'SENSIBILIDADE',
    oSustos: 'SUSTOS', oIdioma: 'IDIOMA', oVolver: 'VOLTAR',
    oBaja: 'BAIXA', oMedia: 'MÉDIA', oAlta: 'ALTA',
    oSuave: 'SUAVE', oNormal: 'NORMAL', oDura: 'DURA',
    oPocos: 'POUCOS', oTodos: 'TODOS',
    cTit: 'SEGURE A TÁBUA',
    cSub: 'Segure o telefone como vai carregá-lo e não mexa.\nEssa posição vira «reto».',
    cListo: 'ASSIM ESTÁ BOM',
    cGiro: 'giroscópio: pronto', cSinGiro: 'sem giroscópio — jogue arrastando o dedo',
    cPide: 'toque para permitir o sensor',
    aEmpieza: 'não deixe cair', aTiembla: 'está escorregando', aCasi: 'QUASE',
    finGano: 'VOCÊ CHEGOU', finPerdio: 'CAIU',
    finGanoS: (m, s) => m + ' metros · ' + s + ' sustos aguentados',
    finPerdioS: (m) => 'a ' + m + ' metros da porta',
    fOtra: 'DE NOVO', fMenu: 'MENU'
  }
};
let IDIOMA = 'es';
const TX = (k, ...a) => {
  const v = (LANG[IDIOMA] && LANG[IDIOMA][k]) !== undefined ? LANG[IDIOMA][k] : LANG.es[k];
  return typeof v === 'function' ? v(...a) : (v === undefined ? k : v);
};
const $ = (id) => document.getElementById(id);

function pintaIdioma(){
  for (const el of document.querySelectorAll('[data-i18n]')){
    const t = TX(el.getAttribute('data-i18n'));
    el.textContent = t;
    if (String(t).indexOf('\n') >= 0) el.style.whiteSpace = 'pre-line';
  }
  /* los guards existen para el arranque —cuando estas funciones todavía no se
     declararon— y NO para saltear la llamada siempre. Cada una se asigna a
     `window` al final de su archivo. Es la lección que en RECREO dejó el filtro
     sin repintarse nunca. */
  if (window.pintaOpciones) window.pintaOpciones();
  if (window.pintaMenu) window.pintaMenu();
}
