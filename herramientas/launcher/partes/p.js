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
/* ── Y SON CHICOS A PROPÓSITO ──
   La mascota vive apoyada sobre el teclado, o sea ENCIMA de los resultados de
   la búsqueda. Con 214 px de ancho se comía la mitad de lo que uno acaba de
   pedir; a 148 ocupa una fila y media y el muñeco se sigue leyendo. */
const PERS_MASC = { chica: 112, media: 148, grande: 196 };

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

  /* ── EL ESTILO DE ICONO SE APLICA A TODAS LAS APPS, NO A UNA LISTA ──
     Lo que se pidió es «íconos personalizados de Play Store y más de 50 apps,
     por ejemplo TikTok su logo aero y de fondo agua». Una lista de cincuenta
     logos redibujados envejece con cada app que se instala y deja afuera a la
     51.ª — y encima serían marcas ajenas metidas en el APK. Lo que sí vale para
     TODAS es el TRATAMIENTO: el icono de verdad de cada app, que es su logo, con
     el fondo Aero detrás. */
  /* ── EL PACK AERO ──
     Se puede apagar, y no es una concesión: el pack redibuja el logo de las
     apps conocidas, y hay quien prefiere ver el icono con el que la app se
     reconoce en cualquier otro teléfono. Apagado, todo vuelve al icono del
     sistema sobre la baldosa Aero, que es lo que había. */
  { tit: 'pPack', tipo: 'ops',
    ops: () => [[1, T('pSi')], [0, T('pNo')]],
    lee: () => +lee('icoPack', 1),
    pon: v => { guarda('icoPack', +v); ICO_CACHE_LIMPIA(); rejaRepinta(); } },

  { tit: 'pIcono', tipo: 'ops',
    ops: () => [['agua', T('pAgua')], ['pasto', T('pPasto')], ['nube', T('pNube')],
                ['no', T('pNo')]],
    lee: () => lee('icoTex', 'agua'),
    pon: v => { guarda('icoTex', v); persIcono(); rejaRepinta(); } },

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
  persIcono();
}
/* ── LA TEXTURA DEL ICONO ES UNA VARIABLE Y UNA CLASE ──
   La variable la lee `.baldosa` y también los estilos EN LÍNEA de las baldosas
   con inicial, que la nombran con `var(--bTex, none)`. La clase enciende la
   sombra fuerte del icono y el velo, que sólo hacen falta cuando hay textura. */
function persIcono(){
  const k = lee('icoTex', 'agua');
  /* el velo va de primera capa: es lo que separa un logo claro de las cáusticas
     sin taparlas */
  const u = (typeof BALDOSAS !== 'undefined' && BALDOSAS[k])
    ? 'radial-gradient(closest-side,rgba(2,20,42,.30),rgba(2,20,42,0) 76%), url('
      + BALDOSAS[k] + ')'
    : 'none';
  document.documentElement.style.setProperty('--bTex', u);
  document.body.classList.toggle('icoTex', u !== 'none');
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

/* ── LA HOJA MUEVE A LA MASCOTA, PORQUE ES LO QUE TAPA ABAJO ──
   `mascSitio` se llama DESPUÉS de pintar y de encender la hoja: su alto sale de
   `offsetHeight`, y una hoja que todavía no tiene contenido ni clase mide otra
   cosa. Al cerrar, la misma llamada la devuelve a donde manda la regla. */
function persAbre(){
  cierraMenu(); asisCierra();
  persPinta();
  $('#pers').classList.add('on');
  $('#velo').classList.add('on');
  document.body.classList.add('pers');
  mascSitio();
}
function persCierra(){
  $('#pers').classList.remove('on');
  $('#velo').classList.remove('on');
  document.body.classList.remove('pers');
  MASC_PREVIA = 0;          /* cerrar el panel termina la previa: no hay qué mirar */
  mascSitio();
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
