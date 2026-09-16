/* ══════════════════ LA BIENVENIDA ══════════════════

   Pedido textual: «que tengamos las opciones para personalizar al entrar a la
   app por primera vez, donde puedas elegir packs de íconos […] también que te
   deje elegir el tamaño de cuadrículas, si querés el float bar que es la barra
   flotante de la cámara, si querés la barra de notificaciones líquid glass,
   etc […] también que si quieres que el cajón de apps sea todo así por letras
   o todo junto».

   ── LO QUE SE ELIGE SE VE MIENTRAS SE ELIGE ──
   Un pack de iconos elegido de una lista de nombres es una elección a ciegas:
   «Burbuja» no dice nada hasta que se ve. Cada opción dibuja SUS baldosas de
   verdad, con las mismas funciones que usa el escritorio —`icoAero` y
   `ponReja`— así que lo que se ve en la bienvenida es exactamente lo que va a
   quedar. Dos dibujantes para lo mismo terminan mostrando dos cosas.

   ── Y NO SE PUEDE PERDER ──
   Sale una sola vez, pero todo lo que decide vive también en Personalizar: una
   pantalla de bienvenida que es el ÚNICO sitio donde se puede elegir algo es
   una decisión que se toma cansado y no se puede corregir. */

const BIENV_APPS = ['tiktok', 'whatsapp', 'spotify', 'camara'];
/* el icono que le corresponde a cada cantidad de columnas: los mismos cuatro
   escalones que el deslizador de Personalizar, para que las dos pantallas no
   ofrezcan tamaños distintos */
const BV_ICO = { '3': 92, '4': 72, '5': 56, '6': 46 };

const BIENV = [
  { id: 'pack',  tit: 'bvPack',  sub: 'bvPackD',
    ops: () => PACKS.filter(p => !p.nativo).map(p => [p.id, T('pk_' + p.id)]),
    lee: () => packHoy().id,
    pon: v => { guarda('icoPack', v); ICO_CACHE_LIMPIA(); rejaRepinta(); },
    muestra: true },

  /* ── EL TAMAÑO SE ELIGE POR COLUMNAS, NO POR PÍXELES ──
     La primera versión guardaba «columnas|píxeles» y NINGUNA opción quedaba
     marcada, porque el tamaño de fábrica no cae justo en ninguno de los cuatro
     pares. Lo que el dueño elige es cuántas apps entran en una fila; el tamaño
     del icono sale de eso. */
  { id: 'reja',  tit: 'bvReja',  sub: 'bvRejaD',
    ops: () => [['3', T('bvGrande')], ['4', T('bvMedia')], ['5', T('bvChica')],
                ['6', T('bvMini')]],
    lee: () => String(COLS),
    pon: v => { ponReja(BV_ICO[v] || ICO, +v); rejaRepinta(); },
    muestra: true },

  { id: 'cajon', tit: 'bvCajon', sub: 'bvCajonD',
    ops: () => [['1', T('pPorLetras')], ['0', T('pJunto')]],
    lee: () => lee('cajLetras', 1) ? '1' : '0',
    pon: v => { guarda('cajLetras', v === '1' ? 1 : 0); pintaCajon($('#busca2').value); } },

  { id: 'cam',   tit: 'bvCam',   sub: 'bvCamD',
    ops: () => [['aero', T('caAero')], ['preg', T('pPreg')], ['sis', T('caSistema')]],
    lee: () => camModoApp(),
    pon: v => { guarda('camApp', v); } },

  { id: 'cc',    tit: 'bvCC',    sub: 'bvCCD',
    ops: () => [['1', T('pSi')], ['0', T('pNo')]],
    lee: () => lee('ccOn', 1) ? '1' : '0',
    pon: v => { guarda('ccOn', v === '1' ? 1 : 0); } }
];

let BV_PASO = 0;

function bvArma(){
  if ($('#bienv')) return;
  const d = document.createElement('div');
  d.id = 'bienv';
  d.innerHTML =
    '<div id="bvCaja" class="vid">' +
      '<div id="bvPuntos"></div>' +
      '<div id="bvTit"></div><div id="bvSub"></div>' +
      '<div id="bvPrev"></div>' +
      '<div id="bvOps"></div>' +
      '<div id="bvPie">' +
        '<button id="bvAtras" class="bvBt sec"></button>' +
        '<button id="bvSig" class="bvBt"></button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(d);
  if (typeof vidrioPieza === 'function') vidrioPieza($('#bvCaja'));
  $('#bvSig').addEventListener('click', () => bvVa(1));
  $('#bvAtras').addEventListener('click', () => bvVa(-1));
}

/* ── LA MUESTRA SON BALDOSAS DE VERDAD ──
   Se arman con `icoAero`, o sea con la misma función que arma las del cajón,
   pero PROBANDO cada opción sin dejarla puesta: se guarda lo que había, se
   pone la opción, se dibuja y se devuelve. Así cada fila muestra su pack en vez
   de mostrar cuatro veces el que está elegido. */
function bvMuestra(g, valor){
  const c = document.createElement('div');
  c.className = 'bvM';
  const anteC = COLS, anteI = ICO;
  const antePack = lee('icoPack', 1);
  if (g.id === 'pack') guarda('icoPack', valor);
  if (g.id === 'reja') ponReja(BV_ICO[valor] || ICO, +valor);
  ICO_CACHE_LIMPIA();
  for (const k of BIENV_APPS){
    const b = document.createElement('div');
    b.className = 'baldosa';
    /* el paquete de muestra: el primero de la lista del glifo, para que
       `glifoDe` encuentre exactamente ese símbolo */
    const pk = (ICO_PKG[k] && ICO_PKG[k][0]) || k;
    if (!icoAero(b, pk, k)) b.classList.add('vidrioPuro');
    if (g.id === 'reja') b.style.setProperty('--ico', Math.round((BV_ICO[valor] || 72)*0.44) + 'px');
    c.appendChild(b);
  }
  guarda('icoPack', antePack);
  if (g.id === 'reja') ponReja(anteI, anteC);
  ICO_CACHE_LIMPIA();
  return c;
}

function bvPinta(){
  const g = BIENV[BV_PASO];
  $('#bvTit').textContent = T(g.tit);
  $('#bvSub').textContent = T(g.sub);
  const p = $('#bvPuntos'); p.innerHTML = '';
  for (let i = 0; i < BIENV.length; i++){
    const e = document.createElement('i');
    if (i === BV_PASO) e.className = 'act';
    p.appendChild(e);
  }
  const o = $('#bvOps'); o.innerHTML = '';
  $('#bvPrev').innerHTML = '';
  const val = String(g.lee());
  for (const [v, txt] of g.ops()){
    const f = document.createElement('div');
    f.className = 'bvOp' + (v === val ? ' sel' : '');
    if (g.muestra) f.appendChild(bvMuestra(g, v));
    const t = document.createElement('span'); t.textContent = txt;
    f.appendChild(t);
    f.addEventListener('click', () => { g.pon(v); vibra(10); bvPinta(); });
    o.appendChild(f);
  }
  $('#bvAtras').textContent = T('bvAtras');
  $('#bvAtras').style.visibility = BV_PASO ? '' : 'hidden';
  $('#bvSig').textContent = BV_PASO === BIENV.length - 1 ? T('bvListo') : T('bvSig');
}

function bvVa(d){
  const n = BV_PASO + d;
  if (n < 0) return;
  if (n >= BIENV.length){ bvCierra(); return; }
  BV_PASO = n; vibra(8); bvPinta();
}

function bvAbre(){
  bvArma(); BV_PASO = 0; bvPinta();
  const e = $('#bienv');
  e.style.visibility = 'visible';
  requestAnimationFrame(() => e.classList.add('on'));
  document.body.classList.add('bienv');
}
function bvCierra(){
  guarda('bienvVisto', 1);
  $('#bienv').classList.remove('on');
  document.body.classList.remove('bienv');
  setTimeout(() => { const e = $('#bienv'); if (e) e.remove(); }, 400);
}

/* ── SE ABRE UNA VEZ, Y DESPUÉS ESTÁ EN PERSONALIZAR ──
   `bienvVisto` se escribe al cerrar y no al abrir: cerrando la app a la mitad,
   la próxima vez vuelve a preguntar en vez de dejar al dueño con la mitad de
   las opciones sin elegir y sin saber que existían. */
function bvInit(){
  if (lee('bienvVisto', 0)) return;
  bvAbre();
}
