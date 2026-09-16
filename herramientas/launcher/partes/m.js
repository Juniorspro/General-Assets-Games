/* ══════════════════════ LA CÁMARA AERO ══════════════════════

   Pedido: «crea una cámara personalizada o sea que no abra la cámara normal
   sino que al abrirla te deje elegir entre la frutiger o la normal con un
   botón, agrégale todo liquid glass y de fondo una foto frutiger que solamente
   se verán en las partes que no se vean la cámara», con ocho capturas de la
   cámara del teléfono para replicar.

   ── POR QUÉ EL VISOR ES UNA TARJETA Y NO PANTALLA COMPLETA ──
   Es la mitad del pedido y no una decisión de gusto: «de fondo una foto
   frutiger que SOLAMENTE se verán en las partes que no se vean la cámara». Con
   el visor a sangre no queda una sola parte donde el fondo se vea, así que el
   fondo no existiría. El visor va como tarjeta redondeada con margen: el fondo
   es el marco, y cambiar la relación de aspecto lo agranda o lo achica, o sea
   que la foto aparece y desaparece por la misma perilla que ya está en la
   cámara de verdad.

   ── Y EL SELECTOR ES NUESTRO, NO EL DE ANDROID ──
   Registrar la actividad como manejadora de cámara haría que Android muestre
   SU diálogo de desambiguación, que es feo y que el dueño puede sellar con
   «siempre» sin querer. Un selector propio se ve como el resto del launcher,
   no se puede sellar por accidente, y funciona igual sea Aero el inicio o no.
   El botón «del sistema» va por el intent estándar de foto fija: así abre la
   que el dueño tenga puesta y el launcher no adivina ningún paquete. */

const CAM_PKG = 'aero.camara';

/* Los modos son los de las capturas, en el mismo orden y con el mismo del medio
   al abrir. Cada uno declara qué barra de arriba le toca y qué obturador:
   `disp` rojo para los que graban, blanco para los que sacan una foto. */
const CAM_MODOS = [
  { id: 'pro',     k: 'cmPro',    disp: 'foto',  res: '50MP' },
  { id: 'video',   k: 'cmVideo',  disp: 'grabar', res: '4K',  fps: '30', hdr: true },
  { id: 'foto',    k: 'cmFoto',   disp: 'foto',  res: '12MP' },
  { id: 'retrato', k: 'cmRetrato', disp: 'foto', res: '12MP' },
  { id: 'doc',     k: 'cmDoc',    disp: 'foto',  res: '12MP', filtros: true },
  { id: 'dual',    k: 'cmDual',   disp: 'grabar', res: '1080', fps: '30' },
  { id: 'pano',    k: 'cmPano',   disp: 'foto',  res: 'PANO' },
  { id: 'lapso',   k: 'cmLapso',  disp: 'lapso', res: '1080', fps: '30' },
  { id: 'lenta',   k: 'cmLenta',  disp: 'grabar', res: '1080', fps: '240' }
];

/* Las relaciones de la captura: la 9:16 llena casi todo y la 1:1 deja el marco
   Frutiger a la vista de punta a punta. */
const CAM_ASPECTOS = [
  { id: '9:16', r: 9/16 }, { id: '3:4', r: 3/4 }, { id: '1:1', r: 1 }, { id: 'full', r: 0 }
];

const CAM = {
  on: false, modo: 2, cara: 'environment', zoom: 1, asp: 1,
  flujo: null, arrancando: false, err: '', permiso: null,
  filtro: 'origin', grabando: false, t0: 0, reloj: null,
  ajustes: false, tab: 'foto', panel: false,
  ops: {}, tomas: 0, ultima: null
};

/* ── LOS AJUSTES SON UNA TABLA Y NO UNA PANTALLA ESCRITA A MANO ──
   Son treinta y pico de filas repartidas en tres pestañas; escritas como HTML
   habría que acordarse del rótulo, del valor, del guardado y de la traducción
   en cada una. Declaradas, la pantalla se arma sola y agregar una fila es un
   renglón. Es la misma decisión que ya ordenó el panel de Personalizar. */
const CAM_AJ = {
  foto: [
    { k: 'caMarca',  tipo: 'ops', ops: ['caOff','caOn'], def: 0 },
    { k: 'caIA',     tipo: 'ir' },
    { k: 'caFocal',  tipo: 'ops', ops: ['ca23','ca35','ca50'], def: 1 },
    { k: 'caFormato',tipo: 'ops', ops: ['caJPG','caHEIF','caRAW'], def: 0 },
    { k: 'caCalidad',tipo: 'ops', ops: ['caAlta','caMedia','caBaja'], def: 0 },
    { k: 'caMedicion',tipo:'ops', ops: ['caRostro','caCentro','caMatriz'], def: 0 },
    { k: 'caSelfie', tipo: 'ir' },
    { k: 'caObtura', tipo: 'ir' },
    { k: 'caSeguir', tipo: 'sw', def: 1, sub: 'caSeguirD' },
    { k: 'caLente',  tipo: 'sw', def: 1, sub: 'caLenteD' },
    { k: 'caVista',  tipo: 'ir' }
  ],
  video: [
    { k: 'cvCodec',  tipo: 'ops', ops: ['cvHEVC','cvH264'], def: 0 },
    { k: 'cvAudio',  tipo: 'ir' },
    { k: 'caSeguir', tipo: 'sw', def: 0, sub: 'cvSeguirD', id: 'vSeguir' },
    { k: 'cvHDR',    tipo: 'sw', def: 1, sub: 'cvHDRD' },
    { k: 'cvFps',    tipo: 'sw', def: 1, sub: 'cvFpsD' }
  ],
  general: [
    { k: 'cgReja',   tipo: 'ops', ops: ['caOff','cg33','cg44'], def: 0 },
    { k: 'cgSalva',  tipo: 'sw', def: 1, sub: 'cgSalvaD' },
    { k: 'cgGuarda', tipo: 'ir', sub: 'cgGuardaD' },
    { k: 'cgDiseno', tipo: 'ir' },
    { k: 'cgModos',  tipo: 'ir' },
    { k: 'cgColor',  tipo: 'ir' },
    { k: 'cgSonido', tipo: 'ops', ops: ['cgPeli','cgClasico','cgSuave'], def: 0 },
    { k: 'cgObtur',  tipo: 'sw', def: 1, sub: 'cgObturD' },
    { k: 'cgVol',    tipo: 'ir' },
    { k: 'cgInfo',   tipo: 'sw', def: 1 }
  ]
};

function camAj(k, id){ const c = (id || k); return CAM.ops[c]; }
function camAjPon(c, v){ CAM.ops[c] = v; guarda('cam_' + c, v); }
function camAjCarga(){
  for (const t in CAM_AJ) for (const f of CAM_AJ[t]){
    const c = f.id || f.k;
    CAM.ops[c] = +lee('cam_' + c, f.def == null ? 0 : f.def);
  }
}

function camModo(){ return CAM_MODOS[CAM.modo]; }

/* ── ABRIR: PRIMERO EL SELECTOR ──
   Y sólo si hay más de una opción. En un aparato sin cámara del sistema el
   selector tendría un botón, que no es un selector: es un peaje. */
/* ── LA CÁMARA AERO ES LA PREDETERMINADA ──
   Pedido textual: «que la cámara siempre sea la predeterminada». O sea que el
   selector deja de aparecer en cada toque: tocar una cámara abre ésta y ya.
   Un cartel que pregunta lo mismo todos los días no es una elección, es un
   peaje — la elección se hace UNA vez y vive en `camApp`, que se puede mover
   desde Personalizar y desde la pantalla de bienvenida.
     · `aero`  abre la de este launcher (de fábrica)
     · `preg`  vuelve el selector de la vuelta 124
     · `sis`   ni siquiera intercepta: abre la que el teléfono tenga puesta */
function camModoApp(){ return lee('camApp', 'aero'); }

function camAbre(){
  const modo = camModoApp();
  if (modo === 'sis'){ camSistema(); return; }
  camArma();
  CAM.on = true;
  $('#cam').classList.add('on');
  if (modo === 'preg') camPanel(true);
  else { camPanel(false); camArranca(); }
  camPinta();
}

/* la del sistema, por el mismo camino que el botón del selector */
function camSistema(){
  if (HAY_AND && CAM_SIS && AND.abrir(CAM_SIS)) return;
  if (HAY_AND && AND.camara) { AND.camara(); return; }
  avisa(T('caSinSis'));
}

function camCierra(){
  CAM.on = false;
  camPara();
  $('#cam').classList.remove('on');
  camPanel(false);
  CAM.ajustes = false;
  $('#cam').classList.remove('conAjustes');
}

function camPanel(v){
  CAM.panel = !!v;
  $('#cam').classList.toggle('eligiendo', CAM.panel);
}

/* ── EL VISOR ──
   `getUserMedia` y nada más: el WebView ya tiene el permiso concedido por
   `ClienteArchivo`. Lo que sí hay que hacer es preguntar ANTES si el permiso
   del sistema está puesto — una pantalla negra con un error no dice qué
   hacer, un cartel que dice «tocá para permitir» sí. */
async function camArranca(){
  if (CAM.arrancando) return;
  CAM.arrancando = true; CAM.err = '';
  camPinta();
  try {
    if (HAY_AND && AND.camaraOk && !AND.camaraOk()){
      CAM.permiso = false; CAM.arrancando = false;
      if (AND.camaraPide) AND.camaraPide();
      camPinta(); return;
    }
  } catch (e) {}
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      throw new Error('sinApi');
    camPara();
    /* `ideal` y no `exact`: una notebook no tiene trasera, y con `exact` se
       queda sin cámara por pedir algo que no existe. Es la misma lección que
       ya costó una vuelta en RezUno. */
    const f = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: CAM.cara }, width: { ideal: 1280 }, height: { ideal: 960 } }
    });
    CAM.flujo = f;
    const v = $('#camVid');
    v.srcObject = f;
    /* el espejo es de la FRONTAL y nada más: espejando la trasera, mover la
       mano a la derecha mueve la imagen a la izquierda */
    const st = f.getVideoTracks()[0] ? f.getVideoTracks()[0].getSettings() : {};
    const cara = st.facingMode || CAM.cara;
    v.classList.toggle('espejo', cara !== 'environment');
    await v.play().catch(() => {});
    CAM.permiso = true;
  } catch (e) {
    CAM.err = (e && e.name) || 'error';
    CAM.permiso = (CAM.err === 'NotAllowedError') ? false : CAM.permiso;
  }
  CAM.arrancando = false;
  camPinta();
}

function camPara(){
  if (CAM.flujo){ for (const t of CAM.flujo.getTracks()) t.stop(); CAM.flujo = null; }
  const v = $('#camVid'); if (v) v.srcObject = null;
}

/* la respuesta del diálogo de Android llega por acá */
window.__camPermiso = ok => {
  CAM.permiso = !!ok;
  if (ok && CAM.on) camArranca(); else camPinta();
};

function camDaVuelta(){
  CAM.cara = (CAM.cara === 'environment') ? 'user' : 'environment';
  camArranca();
}

/* ── LA FOTO ──
   Se dibuja el cuadro del video a un lienzo del tamaño del recorte que se está
   viendo. Sacarla del video entero daría una foto que no es la que el visor
   prometía, y en una cámara eso es lo único que no se puede permitir. */
function camDispara(){
  const m = camModo();
  if (m.disp !== 'foto'){ camGraba(); return; }
  const v = $('#camVid');
  if (!v || !v.videoWidth) { avisa(T('caSinCam')); return; }
  const r = CAM_ASPECTOS[CAM.asp].r;
  let cw = v.videoWidth, ch = v.videoHeight;
  if (r > 0){
    /* el mismo «cover» que hace el CSS del visor */
    if (cw / ch > r) cw = Math.round(ch * r); else ch = Math.round(cw / r);
  }
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  if (v.classList.contains('espejo')){ g.translate(cw, 0); g.scale(-1, 1); }
  g.drawImage(v, (v.videoWidth - cw)/2, (v.videoHeight - ch)/2, cw, ch, 0, 0, cw, ch);
  if (m.filtros && CAM.filtro !== 'origin') camFiltro(g, cw, ch);
  CAM.ultima = c.toDataURL('image/jpeg', 0.9);
  CAM.tomas++;
  camFogonazo();
  camPinta();
  return { w: cw, h: ch };
}

/* los tres del modo Documentos, que es donde la cámara de verdad los pone */
function camFiltro(g, w, h){
  const d = g.getImageData(0, 0, w, h), p = d.data;
  if (CAM.filtro === 'bn'){
    for (let i = 0; i < p.length; i += 4){
      const y = 0.299*p[i] + 0.587*p[i+1] + 0.114*p[i+2];
      p[i] = p[i+1] = p[i+2] = y;
    }
  } else {
    /* «Mejora»: blanquea el papel y aprieta la tinta, que es lo que un escáner
       hace de verdad — no es subir el contraste a ojo */
    for (let i = 0; i < p.length; i += 4){
      for (let k = 0; k < 3; k++){
        let x = (p[i+k] - 96) * 1.9 + 96;
        p[i+k] = x < 0 ? 0 : x > 255 ? 255 : x;
      }
    }
  }
  g.putImageData(d, 0, 0);
}

function camFogonazo(){
  const f = $('#camFlash');
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}

function camGraba(){
  CAM.grabando = !CAM.grabando;
  if (CAM.grabando){
    CAM.t0 = Date.now();
    CAM.reloj = setInterval(camReloj, 250);
  } else {
    clearInterval(CAM.reloj); CAM.reloj = null;
  }
  camPinta();
}
function camReloj(){
  const s = Math.floor((Date.now() - CAM.t0)/1000);
  const e = $('#camTiempo');
  if (e) e.textContent = String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}

function camPonModo(i){
  if (i < 0 || i >= CAM_MODOS.length) return;
  if (CAM.grabando) camGraba();
  CAM.modo = i;
  camPinta();
}

/* ══════════════════ EL DIBUJO ══════════════════ */

function camArma(){
  if ($('#cam')) return;
  camAjCarga();
  const d = document.createElement('div');
  d.id = 'cam';
  d.innerHTML =
    '<div id="camFondo"></div>' +
    '<div id="camElige" class="vid">' +
      '<div class="ceTit"></div><div class="ceSub"></div>' +
      '<button id="ceAero" class="ceBt"></button>' +
      '<button id="ceSis" class="ceBt sec"></button>' +
      '<button id="ceNo" class="ceX">✕</button>' +
    '</div>' +
    '<div id="camTop" class="vid">' +
      '<button id="camFlash2" class="ctB"></button>' +
      '<button id="camChev" class="ctPil">⌄</button>' +
      '<span id="camRes" class="ctT"></span><span id="camFps" class="ctT"></span>' +
    '</div>' +
    '<div id="camVisorC"><div id="camVisor">' +
      '<video id="camVid" playsinline autoplay muted></video>' +
      '<div id="camReja"></div>' +
      '<div id="camHdr">HDR10+</div>' +
      '<div id="camEstado"></div>' +
      '<div id="camFlash"></div>' +
      '<div id="camRec"><span class="pt"></span><span id="camTiempo">00:00</span></div>' +
      '<div id="camZoom" class="vid"></div>' +
    '</div></div>' +
    '<div id="camFiltros" class="vid"></div>' +
    '<div id="camRapido" class="vid"></div>' +
    /* ── LA REPISA ──
       Los modos y el obturador van sobre UNA pieza de vidrio y no sueltos
       sobre la foto: el fondo Frutiger es un acuario con peces y burbujas, o
       sea lo más ocupado que hay, y nueve rótulos de catorce píxeles encima no
       se leen. El vidrio es además lo que se pidió. */
    '<div id="camPie" class="vid">' +
      '<div id="camModos"></div>' +
      '<div id="camBarra">' +
        '<button id="camThumb"></button>' +
        '<button id="camDisp"><span></span></button>' +
        '<button id="camFlip">⟳</button>' +
      '</div>' +
    '</div>' +
    '<div id="camAj" class="vid">' +
      '<div class="cajTop"><button id="cajAtras">←</button><span class="cajTit"></span>' +
        '<button id="cajI">i</button></div>' +
      '<div class="cajTabs"><button data-t="foto"></button><button data-t="video"></button>' +
        '<button data-t="general"></button></div>' +
      '<div class="cajCuerpo"></div>' +
    '</div>';
  document.body.appendChild(d);
  /* ── EL FONDO, Y DEGRADA ──
     El degradado del CSS es lo que se ve mientras la foto decodifica, y lo que
     queda si el base64 no llega. Un launcher que se cae porque una imagen no
     cargó no es un launcher. */
  if (typeof CAM_FONDO === 'string' && CAM_FONDO)
    d.querySelector('#camFondo').style.backgroundImage = 'url(' + CAM_FONDO + ')';
  if (typeof vidrioPieza === 'function')
    for (const e of d.querySelectorAll('.vid')) vidrioPieza(e);

  $('#ceAero').onclick = () => { camPanel(false); camArranca(); };
  $('#ceSis').onclick = () => {
    camPanel(false); camCierra();
    if (!HAY_AND){ avisa(T('sinPuente')); return; }
    /* si el dueño tocó una cámara concreta, se abre ESA; si entró por el icono
       de la cámara Aero no hay ninguna elegida y va el intent estándar, que
       abre la que el sistema tenga puesta */
    if (CAM_SIS && AND.abrir && AND.abrir(CAM_SIS)) return;
    if (AND.camaraSistema && AND.camaraSistema()) return;
    avisa(T('caSinSis'));
  };
  $('#ceNo').onclick = camCierra;
  $('#camDisp').onclick = camDispara;
  $('#camFlip').onclick = camDaVuelta;
  $('#camChev').onclick = () => {
    const r = $('#camRapido'); r.classList.toggle('on');
    $('#camChev').textContent = r.classList.contains('on') ? '⌃' : '⌄';
  };
  $('#camThumb').onclick = () => { if (CAM.ultima) camMira(); };
  $('#camFlash2').onclick = () => { CAM.flash = !CAM.flash; camPinta(); };
  $('#cajAtras').onclick = () => { CAM.ajustes = false; $('#cam').classList.remove('conAjustes'); };
  for (const b of $$('#camAj .cajTabs button'))
    b.onclick = () => { CAM.tab = b.dataset.t; camAjPinta(); };
  $('#camEstado').onclick = () => { if (CAM.permiso === false) camArranca(); };
}

function camMira(){
  if (!CAM.ultima) return;
  const v = document.createElement('div');
  v.id = 'camVer';
  v.innerHTML = '<img src="' + CAM.ultima + '"><button>✕</button>';
  v.querySelector('button').onclick = () => v.remove();
  document.body.appendChild(v);
}

function camPinta(){
  if (!$('#cam')) return;
  const m = camModo();
  $('.ceTit').textContent = T('caElegi');
  $('.ceSub').textContent = T('caElegiD');
  $('#ceAero').textContent = T('caAero');
  $('#ceSis').textContent = T('caSistema');
  $('#camRes').textContent = m.res;
  $('#camFps').textContent = m.fps || '';
  $('#camFps').style.display = m.fps ? '' : 'none';
  $('#camHdr').style.display = (m.hdr && camAj('cvHDR')) ? '' : 'none';
  /* `⚡̸` es un rayo MÁS un carácter combinante de tachado, y una tipografía que
     no lo compone dibuja los dos al lado: en la captura salía «⚡/». Dos
     glifos que existen solos. */
  $('#camFlash2').textContent = CAM.flash ? '⚡' : '⊘';
  $('#camFlash2').classList.toggle('act', !!CAM.flash);

  /* la relación decide cuánto se ve del fondo: es la misma perilla */
  const a = CAM_ASPECTOS[CAM.asp];
  const vc = $('#camVisorC');
  vc.style.setProperty('--asp', a.r || '');
  vc.classList.toggle('lleno', a.r === 0);

  /* la reja de la pestaña General */
  const rj = camAj('cgReja');
  $('#camReja').className = rj === 1 ? 'r33' : rj === 2 ? 'r44' : '';

  /* estado del visor */
  const e = $('#camEstado');
  if (CAM.arrancando) e.textContent = T('caAbriendo');
  else if (CAM.permiso === false) e.textContent = T('caPermiso');
  else if (CAM.err) e.textContent = T('caFalla') + ' · ' + CAM.err;
  else e.textContent = '';
  e.classList.toggle('on', !!e.textContent);

  /* obturador */
  const dp = $('#camDisp');
  dp.className = m.disp + (CAM.grabando ? ' grabando' : '');
  $('#camRec').classList.toggle('on', CAM.grabando);

  /* miniatura */
  const th = $('#camThumb');
  th.style.backgroundImage = CAM.ultima ? 'url(' + CAM.ultima + ')' : '';
  th.classList.toggle('vacia', !CAM.ultima);

  camModosPinta(); camZoomPinta(); camRapidoPinta(); camFiltrosPinta();
  if (CAM.ajustes) camAjPinta();
}

function camModosPinta(){
  const c = $('#camModos'); c.innerHTML = '';
  CAM_MODOS.forEach((m, i) => {
    const b = document.createElement('button');
    b.textContent = T(m.k);
    b.className = (i === CAM.modo) ? 'act' : '';
    b.onclick = () => camPonModo(i);
    c.appendChild(b);
  });
  /* el activo al medio: un carrusel que no centra el elegido obliga a
     buscarlo, y en una cámara lo que se mira es el visor */
  const act = c.children[CAM.modo];
  if (act) c.scrollLeft = act.offsetLeft - (c.clientWidth - act.offsetWidth)/2;
}

const CAM_ZOOM = [0.6, 1, 2];
function camZoomPinta(){
  const c = $('#camZoom'); c.innerHTML = '';
  for (const z of CAM_ZOOM){
    const b = document.createElement('button');
    b.textContent = (z === 1) ? '1x' : String(z);
    b.className = (z === CAM.zoom) ? 'act' : '';
    b.onclick = () => { CAM.zoom = z; camAplicaZoom(); camPinta(); };
    c.appendChild(b);
  }
}
/* ── EL ZOOM ES DEL RECORTE Y NO UNA LENTE ──
   Una webcam no tiene tres lentes, así que 0,6 no puede abrir más campo del que
   la cámara da: lo que se hace es recortar. Se dice acá para que nadie lo lea
   como un cambio de lente que no existe. */
function camAplicaZoom(){
  const v = $('#camVid'); if (!v) return;
  v.style.transform = 'scale(' + Math.max(1, CAM.zoom) + ')';
}

function camRapidoPinta(){
  const c = $('#camRapido');
  if (c.dataset.hecho) { c.querySelector('.crAsp span').textContent = CAM_ASPECTOS[CAM.asp].id; return; }
  c.dataset.hecho = '1';
  c.innerHTML =
    '<button class="crAsp"><b></b><span></span></button>' +
    '<button class="crNoc"><b>◐</b><span></span></button>' +
    '<button class="crEst"><b>⊡</b><span></span></button>' +
    '<button class="crTel"><b>≡</b><span></span></button>' +
    '<button class="crCfg"><b>⚙</b><span></span></button>';
  c.querySelector('.crAsp b').textContent = CAM_ASPECTOS[CAM.asp].id;
  c.querySelector('.crAsp span').textContent = T('caAspecto');
  c.querySelector('.crNoc span').textContent = T('caNoct');
  c.querySelector('.crEst span').textContent = T('caEstab');
  c.querySelector('.crTel span').textContent = T('caTele');
  c.querySelector('.crCfg span').textContent = T('caConfig');
  c.querySelector('.crAsp').onclick = () => {
    CAM.asp = (CAM.asp + 1) % CAM_ASPECTOS.length;
    c.querySelector('.crAsp b').textContent = CAM_ASPECTOS[CAM.asp].id;
    camPinta();
  };
  c.querySelector('.crCfg').onclick = () => {
    CAM.ajustes = true; $('#cam').classList.add('conAjustes');
    c.classList.remove('on'); $('#camChev').textContent = '⌄';
    camAjPinta();
  };
  for (const q of ['.crNoc', '.crEst', '.crTel'])
    c.querySelector(q).onclick = ev => ev.currentTarget.classList.toggle('act');
}

const CAM_FILTROS = ['origin', 'bn', 'mejora'];
function camFiltrosPinta(){
  const c = $('#camFiltros');
  const hay = !!camModo().filtros;
  c.classList.toggle('on', hay);
  if (!hay){ c.innerHTML = ''; return; }
  c.innerHTML = '';
  for (const f of CAM_FILTROS){
    const b = document.createElement('button');
    b.textContent = T('caF_' + f);
    b.className = (f === CAM.filtro) ? 'act' : '';
    b.onclick = () => { CAM.filtro = f; camPinta(); };
    c.appendChild(b);
  }
}

/* ── LA PANTALLA DE AJUSTES ──
   Las tres pestañas de las capturas, armadas de `CAM_AJ`. */
function camAjPinta(){
  const a = $('#camAj');
  a.querySelector('.cajTit').textContent = T('caAjustes');
  for (const b of $$('#camAj .cajTabs button')){
    b.textContent = T('caTab_' + b.dataset.t);
    b.classList.toggle('act', b.dataset.t === CAM.tab);
  }
  const c = a.querySelector('.cajCuerpo'); c.innerHTML = '';
  let grupo = document.createElement('div'); grupo.className = 'cajG';
  for (const f of CAM_AJ[CAM.tab]){
    const id = f.id || f.k;
    const fila = document.createElement('div'); fila.className = 'cajF';
    const izq = document.createElement('div'); izq.className = 'cajL';
    const t = document.createElement('div'); t.className = 'cajN'; t.textContent = T(f.k);
    izq.appendChild(t);
    if (f.sub){ const s = document.createElement('div'); s.className = 'cajS'; s.textContent = T(f.sub); izq.appendChild(s); }
    fila.appendChild(izq);
    if (f.tipo === 'sw'){
      const sw = document.createElement('button');
      sw.className = 'cajSw' + (camAj(f.k, f.id) ? ' on' : '');
      sw.onclick = () => { camAjPon(id, camAj(f.k, f.id) ? 0 : 1); camPinta(); camAjPinta(); };
      fila.appendChild(sw);
    } else if (f.tipo === 'ops'){
      const v = document.createElement('button'); v.className = 'cajV';
      v.textContent = T(f.ops[camAj(f.k, f.id) % f.ops.length]) + ' ›';
      v.onclick = () => { camAjPon(id, (camAj(f.k, f.id) + 1) % f.ops.length); camPinta(); camAjPinta(); };
      fila.appendChild(v);
    } else {
      const v = document.createElement('span'); v.className = 'cajV'; v.textContent = '›';
      fila.appendChild(v);
    }
    grupo.appendChild(fila);
  }
  c.appendChild(grupo);
}
