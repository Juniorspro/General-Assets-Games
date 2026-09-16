/* ══════════════════════ LA PANTALLA DE INICIO ══════════════════════

   ── SER EL INICIO ES UN COMPONENTE, NO UN AJUSTE ──
   El manifiesto tiene DOS puertas y no una: `.Principal` con `LAUNCHER`, que es
   el icono en el cajón del otro launcher y **no se apaga nunca**, y el alias
   `.Inicio` con `HOME`, que es el puesto. Apagando el alias, Android se queda
   sin Aero entre los candidatos y se va al que quede — si queda uno solo, sin
   preguntar. Eso es lo que se pidió: ponerlo, y después sacarlo solo.

   ── Y NO SE PUEDE DEJAR AL TELÉFONO SIN NINGUNO ──
   Si Aero fuera el único inicio instalado, apagarlo dejaría el aparato con la
   tecla HOME apuntando a la nada. El puente los cuenta y el botón se apaga con
   el motivo escrito al lado, que es distinto de que no haga nada. */

const INI_PKG = 'ai.rezona.aero.inicio';

/* Sin puente —la vista previa del navegador— no hay rol que pedir ni componente
   que apagar. Se contesta un estado plausible para poder ver la pantalla. */
function iniEstado(){
  if (!HAY_AND) return { soy: false, otros: 1, ofrece: true, real: false };
  try {
    const j = JSON.parse(AND.inicio());
    return { soy: !!j.soy, otros: +j.otros || 0, ofrece: j.ofrece !== false, real: true };
  } catch (e) { return { soy: false, otros: 0, ofrece: true, real: false }; }
}

function iniPinta(){
  const e = iniEstado();
  $('#iniTit').textContent = T('iTit');
  const c = $('#iniCuerpo'); c.innerHTML = '';

  const linea = (cls, txt) => {
    const d = document.createElement('div'); d.className = cls; d.textContent = txt;
    c.appendChild(d); return d;
  };
  const boton = (cls, txt, fn) => {
    const d = document.createElement('div'); d.className = 'iBtn ' + cls; d.textContent = txt;
    d.addEventListener('click', fn);
    c.appendChild(d); return d;
  };

  linea('iEst', e.soy ? T('iSoy') : T('iNoSoy'));
  if (!e.ofrece) linea('iNota', T('iApagado'));

  /* ── LOS DOS BOTONES ESTÁN SIEMPRE, Y EL QUE NO CORRESPONDE SE APAGA ──
     Escondiendo el que no aplica, la hoja cambia de forma entre una visita y la
     siguiente y hay que volver a buscar dónde estaba cada cosa. */
  boton(e.soy ? '' : 'pri', T('iPoner'), () => {
    if (!HAY_AND){ avisa(T('sinPuente')); return; }
    vibra(12);
    try { AND.ponerInicio(); } catch (x) { avisa(T('iNoPudo')); }
    /* el diálogo del rol vuelve por `onActivityResult`, que repinta */
    setTimeout(iniPinta, 700);
  }).classList.toggle('no', e.soy && e.ofrece);

  const puede = e.otros >= 1 && e.ofrece;
  boton(e.soy ? 'pri' : '', T('iSalir'), () => {
    if (!HAY_AND){ avisa(T('sinPuente')); return; }
    vibra(12);
    let ok = false;
    try { ok = AND.salirInicio(); } catch (x) {}
    avisa(ok ? T('iHecho') : T('iNoPudo'));
    iniPinta();
  }).classList.toggle('no', !puede);

  linea('iNota', e.otros >= 1 ? T('iComo') : T('iSolo'));
}

function iniAbre(){
  cierraMenu(); asisCierra(); persCierra();
  iniPinta();
  $('#ini').classList.add('on');
  $('#velo').classList.add('on');
}
function iniCierra(){
  $('#ini').classList.remove('on');
  if (!$('#asis').classList.contains('on') && !$('#pers').classList.contains('on'))
    $('#velo').classList.remove('on');
}

function iniInit(){
  $('#iniCerrar').addEventListener('click', iniCierra);
  /* volver del diálogo del sistema tiene que actualizar lo que la hoja dice: si
     no, uno acaba de ponerlo como inicio y la pantalla sigue diciendo que no */
  const antes = window.__alVolver;
  window.__alVolver = function(){
    if (typeof antes === 'function') antes();
    if ($('#ini').classList.contains('on')) iniPinta();
  };
}
