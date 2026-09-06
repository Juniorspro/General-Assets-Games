/* ══════════════════════ PERSONALIZACIÓN ══════════════════════

   ── LO QUE SE TOCA ACÁ CAMBIA LO QUE ESTÁ DETRÁS, ASÍ QUE SE VE ──
   Es una hoja translúcida y no una pantalla aparte: mover el tamaño del icono
   contra un panel opaco es mover un número a ciegas. Todo se aplica en el acto
   y se guarda; no hay botón de aceptar, porque no hay nada que confirmar.

   ── Y SE ARMA DE UNA TABLA ──
   Cada control declara cómo se lee su valor, qué hace al cambiarlo y qué
   opciones tiene. Escrito control por control, el día que se agregue uno hay
   que acordarse del pintado, del guardado y del repintado; así es una entrada
   más en `PERS`. */

const PERS_PKG = 'ai.rezona.aero.personalizar';

const PERS_ACENTOS = ['#7fe3ff', '#a8e85c', '#ffd166', '#ff8fab',
                      '#c9a2ff', '#7dffd4', '#ff9f6e', '#ffffff'];

/* los tres tamaños de la mascota en el escritorio, con su alto derivado de la
   proporción del lienzo: escritos a mano, el muñeco sale estirado */
const PERS_MASC = { chica: 148, media: 214, grande: 282 };

const PERS = [
  { tit: 'pMascota', tipo: 'ops', clave: 'mascOn',
    ops: () => [['1', T('pSi')], ['0', T('pNo')]],
    lee: () => lee('mascOn', 1) ? '1' : '0',
    pon: v => { guarda('mascOn', v === '1' ? 1 : 0); mascMira(); } },

  { tit: 'pTamano', tipo: 'ops', ver: () => !!lee('mascOn', 1),
    ops: () => [['chica', T('pChica')], ['media', T('pMedia')], ['grande', T('pGrande')]],
    lee: () => lee('mascTam', 'media'),
    pon: v => { guarda('mascTam', v); mascSitio(); } },

  /* ── LAS CINCO POSES SON BOTONES, Y ESA ES LA RESPUESTA A «NO SÉ DÓNDE ESTÁ» ──
     El modelo tiene cinco animaciones y hasta ahora salían solas: no había forma
     de VERLAS a pedido. Acá se tocan y el muñeco de atrás las hace. */
  { tit: 'pPose', tipo: 'ops', ver: () => !!lee('mascOn', 1),
    ops: () => [['quieto', T('pQuieto')], ['baila', T('pBaila')], ['saluda', T('pSaluda')],
                ['mando', T('pMando')], ['duerme', T('pDuerme')]],
    lee: () => MASC_HOY,
    pon: v => { asisMascota(v); } },

  { tit: 'pIconos', tipo: 'rango', min: 40, max: 92, paso: 4,
    lee: () => ICO, sufijo: ' px',
    pon: v => { ponReja(v, null); rejaRepinta(); } },

  { tit: 'pColumnas', tipo: 'rango', min: 3, max: 6, paso: 1,
    lee: () => COLS, sufijo: '',
    pon: v => { ponReja(null, v); rejaRepinta(); } },

  { tit: 'pAcento', tipo: 'colores',
    lee: () => lee('acento', PERS_ACENTOS[0]),
    pon: v => { guarda('acento', v); persAcento(); } },

  { tit: 'pOscuro', tipo: 'rango', min: 0, max: 70, paso: 5,
    lee: () => lee('oscuro', 0), sufijo: ' %',
    pon: v => { guarda('oscuro', v); persOscuro(); } },

  { tit: 'pIdioma', tipo: 'ops',
    ops: () => [['es', 'Castellano'], ['en', 'English'], ['pt', 'Português']],
    lee: () => LANG,
    pon: v => { LANG = v; guarda('lang', v); repintaIdioma(); persPinta(); } }
];

/* ── LO QUE SE GUARDA SE APLICA AL ARRANCAR, Y DESDE UN SOLO SITIO ──
   Repartido por el arranque, el día que se agregue un ajuste queda uno que se
   guarda y no se restituye — y eso se ve como «no me guardó nada». */
function persAplica(){
  persAcento();
  persOscuro();
}
function persAcento(){
  document.documentElement.style.setProperty('--acento', lee('acento', PERS_ACENTOS[0]));
}
/* ── OSCURECER ES UN VELO, NO UN `brightness` SOBRE EL FONDO ──
   Un filtro sobre `#fondo` obliga al compositor a repintar la foto entera; un
   velo con `background` es una capa más que ya está ahí. */
function persOscuro(){
  const v = cl(+lee('oscuro', 0), 0, 70)/100;
  $('#oscuro').style.opacity = String(v);
}

function persAbre(){
  cierraMenu(); asisCierra();
  persPinta();
  $('#pers').classList.add('on');
  $('#velo').classList.add('on');
}
function persCierra(){
  $('#pers').classList.remove('on');
  $('#velo').classList.remove('on');
}

function persPinta(){
  $('#persTit').textContent = T('pTit');
  const c = $('#persCuerpo'); c.innerHTML = '';
  for (const g of PERS){
    if (g.ver && !g.ver()) continue;
    const caja = document.createElement('div'); caja.className = 'pGrupo';
    const t = document.createElement('div'); t.className = 'pTit'; t.textContent = T(g.tit);
    caja.appendChild(t);
    const f = document.createElement('div'); f.className = 'pFila';
    if (g.tipo === 'ops'){
      const val = String(g.lee());
      for (const [v, txt] of g.ops()){
        const b = document.createElement('div');
        b.className = 'pOp' + (v === val ? ' sel' : '');
        b.textContent = txt;
        b.addEventListener('click', () => { g.pon(v); vibra(10); persPinta(); });
        f.appendChild(b);
      }
    } else if (g.tipo === 'colores'){
      const val = g.lee();
      for (const col of PERS_ACENTOS){
        const b = document.createElement('div');
        b.className = 'pCol' + (col === val ? ' sel' : '');
        b.style.background = col;
        b.addEventListener('click', () => { g.pon(col); vibra(10); persPinta(); });
        f.appendChild(b);
      }
    } else {
      const r = document.createElement('input');
      r.type = 'range'; r.className = 'pRango';
      r.min = g.min; r.max = g.max; r.step = g.paso; r.value = g.lee();
      const n = document.createElement('div'); n.className = 'pVal';
      n.textContent = r.value + g.sufijo;
      /* ── SE APLICA MIENTRAS SE ARRASTRA ──
         Con `change` el cambio se ve recién al soltar, o sea que el dedo mueve
         un número y la pantalla no contesta hasta el final. El repintado de la
         reja es un `innerHTML` de la página visible, que es barato. */
      r.addEventListener('input', () => { n.textContent = r.value + g.sufijo; g.pon(+r.value); });
      f.appendChild(r); f.appendChild(n);
    }
    caja.appendChild(f); c.appendChild(caja);
  }
}

function persInit(){
  $('#persCerrar').addEventListener('click', persCierra);
  persAplica();
}
