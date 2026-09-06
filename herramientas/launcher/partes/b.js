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
  es: { busca: 'Buscar apps y en la web', todas: 'Todas las apps', fijar: 'Fijar en el inicio',
        soltar: 'Quitar del inicio', info: 'Información de la app', borrar: 'Desinstalar',
        nada: 'Sin resultados', web: 'Buscar «{0}» en la web', fijado: 'Fijada',
        soltado: 'Quitada del inicio', ajustes: 'Ajustes', inicio: 'Elegir pantalla de inicio',
        sinPuente: 'Vista previa — sin conexión con el sistema',
        dias: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
        meses: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                'septiembre','octubre','noviembre','diciembre'] },
  en: { busca: 'Search apps and the web', todas: 'All apps', fijar: 'Pin to home',
        soltar: 'Remove from home', info: 'App info', borrar: 'Uninstall',
        nada: 'No results', web: 'Search the web for “{0}”', fijado: 'Pinned',
        soltado: 'Removed from home', ajustes: 'Settings', inicio: 'Choose home app',
        sinPuente: 'Preview — no system bridge',
        dias: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        meses: ['January','February','March','April','May','June','July','August',
                'September','October','November','December'] },
  pt: { busca: 'Buscar apps e na web', todas: 'Todos os apps', fijar: 'Fixar na tela inicial',
        soltar: 'Remover da tela inicial', info: 'Informações do app', borrar: 'Desinstalar',
        nada: 'Sem resultados', web: 'Buscar «{0}» na web', fijado: 'Fixado',
        soltado: 'Removido', ajustes: 'Configurações', inicio: 'Escolher tela inicial',
        sinPuente: 'Prévia — sem ponte com o sistema',
        dias: ['domingo','segunda','terça','quarta','quinta','sexta','sábado'],
        meses: ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto',
                'setembro','outubro','novembro','dezembro'] }
};
let LANG = (navigator.language || 'es').slice(0, 2);
if (!TXT[LANG]) LANG = 'es';
function T(k, a){ const s = (TXT[LANG] || TXT.es)[k] || k; return a === undefined ? s : String(s).replace('{0}', a); }

/* ── LA REJA ES DE CUATRO Y LAS FILAS SE CUENTAN ──
   Cuatro columnas es lo que entra cómodo en un teléfono con iconos de 60 px y
   nombre debajo. Las filas por página NO son un número escrito: salen de medir
   el alto que quedó libre después del reloj, la búsqueda y el dock, así que un
   teléfono corto muestra menos y uno largo más, en vez de cortar la última. */
const COLS = 4, ALTO_AP = 92;

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
