/* ══════════════════════ LA GALERÍA DE FONDOS ══════════════════════

   Se abre manteniendo el dedo en un hueco vacío del escritorio, que es el gesto
   de cualquier launcher — y es el único sitio donde ese gesto no compite con
   nada: sobre una app ya significa «agarrarla».

   ── SE APLICA AL TOCAR, SIN BOTÓN DE ACEPTAR ──
   Un fondo se elige MIRÁNDOLO, y una miniatura de 120 px no dice cómo se ve
   detrás del reloj, del vidrio del widget y del dock. La galería se pinta encima
   del escritorio de verdad con la lista corrida hacia abajo, así que al tocar
   uno se ve el cambio en el sitio donde va a vivir. Un botón de aceptar
   obligaría a cerrar la hoja para enterarse de lo que se eligió.

   ── Y LA IMAGEN PROPIA SE ACHICA ANTES DE GUARDARLA ──
   Una foto de un teléfono son doce megapíxeles: como data URI son cuatro megas y
   `localStorage` tiene entre cinco y diez para TODO el origen — guardarla cruda
   revienta la cuota y con ella se van también las apps fijadas y los ajustes.
   Se recorta a 9:16 y se lleva a 824 de ancho, que es exactamente lo mismo que
   hace `hornear_fondos.py` con las ocho: 100 a 150 KB. */

const FG_ANCHO = 824;          /* el mismo que el de las ocho horneadas */
const FG_CAL = 0.82;

function fgLista(){
  const l = [{ k: 'fab', n: T('fgFab'), u: IMG_FONDO }];
  for (const k of FONDOS_ORDEN) l.push({ k: k, n: T('fg_' + k), u: FONDOS[k] });
  const p = lee('fondoPropio', '');
  if (p) l.push({ k: 'propio', n: T('fgPropio'), u: p });
  return l;
}

/* ══════════ LA SOLAPA DE WIDGETS ══════════
   Tocar uno lo agrega o lo saca, y se ve en el acto detrás de la hoja — que es
   por lo que la galería no ocupa la pantalla entera. */
function fgWPinta(){
  const r = $('#fgWid');
  r.textContent = '';
  for (const k of WID_ORDEN){
    const d = document.createElement('div');
    const i = WID.indexOf(k);
    d.className = 'fgW' + (i >= 0 ? ' sel' : '');
    d.dataset.k = k;
    d.appendChild(wEl('fgWN', T('w_' + k)));
    /* el número dice EN QUÉ ORDEN quedó, que es lo que uno quiere saber cuando
       hay tres puestos y el de arriba no es el que se acaba de tocar */
    d.appendChild(wEl('fgWT', i >= 0 ? String(i + 1) : '+'));
    r.appendChild(d);
  }
}

function fgSolapa(t){
  $('#fondos').classList.toggle('wid', t === 'widgets');
  $$('.fgTab').forEach(n => n.classList.toggle('on', n.dataset.t === t));
  if (t === 'widgets') fgWPinta(); else fgPinta();
}

function fgPinta(){
  $('#fgTit') && ($('#fgTit').textContent = T('fgTit'));
  $$('.fgTab').forEach(n => { n.textContent = T(n.dataset.t === 'widgets' ? 'fgWid' : 'fgTit'); });
  const r = $('#fgRejilla');
  r.textContent = '';
  const sel = lee('fondoSel', 'fab');
  for (const f of fgLista()){
    const d = document.createElement('div');
    d.className = 'fgIt' + (f.k === sel ? ' sel' : '');
    d.dataset.k = f.k;
    const t = document.createElement('div');
    t.className = 'fgMini';
    t.style.backgroundImage = 'url(' + f.u + ')';
    d.appendChild(t);
    const n = document.createElement('div');
    n.className = 'fgNom'; n.textContent = f.n;
    d.appendChild(n);
    r.appendChild(d);
  }
}

function fgAbre(){
  fgPinta();
  if ($('#fondos').classList.contains('wid')) fgWPinta();
  $('#fondos').classList.add('on');
  document.body.classList.add('fg');
  vibra(12);
}

function fgCierra(){
  $('#fondos').classList.remove('on');
  document.body.classList.remove('fg');
}

/* ── LA FOTO PROPIA: RECORTE AL CENTRO Y REESCALADO ──
   Devuelve una promesa con el data URI ya chico, o null si no se pudo leer. */
function fgAchica(archivo){
  return new Promise(res => {
    const lr = new FileReader();
    lr.onerror = () => res(null);
    lr.onload = () => {
      const im = new Image();
      im.onerror = () => res(null);
      im.onload = () => {
        try {
          let w = im.naturalWidth, h = im.naturalHeight;
          /* recorte al centro a 9:16, que es lo que el teléfono va a mostrar */
          let cx = 0, cy = 0, cw = w, ch = h;
          if (w/h > 9/16){ cw = Math.round(h*9/16); cx = Math.round((w - cw)/2); }
          else { ch = Math.round(w*16/9); cy = Math.round((h - ch)/2); }
          const dw = Math.min(FG_ANCHO, cw), dh = Math.round(dw*ch/cw);
          const cv = document.createElement('canvas');
          cv.width = dw; cv.height = dh;
          cv.getContext('2d').drawImage(im, cx, cy, cw, ch, 0, 0, dw, dh);
          /* JPEG y no WebP: un WebView viejo puede no saber CODIFICAR webp
             —decodificarlo sí— y `toDataURL` devuelve un PNG de tres megas sin
             avisar. Con JPEG el formato está garantizado desde siempre. */
          res(cv.toDataURL('image/jpeg', FG_CAL));
        } catch (e) { res(null); }
      };
      im.src = lr.result;
    };
    lr.readAsDataURL(archivo);
  });
}

/* ══════════ FONDOS GENERADOS, GRATIS Y SIN LLAVE ══════════

   Pedido textual: «que los fondos de pantalla sean generales siempre con el
   prompt y una imagen predeterminada que te pasaré las cuales servirán para que
   la IA gratuita debes buscar, se guíe».

   ── LA IA GRATUITA, Y POR QUÉ ESTA ──
   La condición dura es la misma que ya se midió con el asistente en la vuelta
   122: la interfaz se carga desde `file:///android_asset/`, así que todo sale
   con `Origin: null`. Pero acá no hace falta CORS: la imagen se baja del lado
   de Java, que no tiene navegador que le ponga reglas. Lo único que hace falta
   es un endpoint que devuelva una imagen con un GET y sin llave, y de los que
   se probaron el que cumple es Pollinations — medido: 200, `image/jpeg`,
   45.118 bytes, con el logo apagado.

   ── Y LA «IMAGEN PREDETERMINADA» ES UNA RECETA, NO UN ARCHIVO ──
   Para que un generador se guíe por una imagen hay que poder mandársela, y
   mandarla implica subirla a algún sitio: una foto del teléfono no tiene URL.
   Lo que una imagen de referencia sirve para conseguir —que los ocho fondos se
   vean de la misma familia— se consigue igual con un PREFIJO de estilo fijo,
   que es lo que `FG_RECETA` es. El texto del dueño se agrega detrás. */
const FG_URL = 'https://image.pollinations.ai/prompt/';
const FG_RECETA = 'Frutiger Aero wallpaper, glossy translucent surfaces, water '
  + 'droplets, lens flare, saturated blues and greens, clean bright sky, '
  + 'photorealistic, vertical phone wallpaper, no text, no watermark, no logo';
const FG_IDEAS = ['fg_i1', 'fg_i2', 'fg_i3', 'fg_i4', 'fg_i5', 'fg_i6'];

let FG_GEN = false;

/* la imagen que baja el puente pasa por EL MISMO achicado que la foto propia:
   se recorta a 9:16 y se lleva a 824 de ancho. Un fondo generado que no pase
   por ahí revienta la cuota igual que una foto de doce megapíxeles. */
function fgDeDataURI(d){
  return new Promise(res => {
    const im = new Image();
    im.onerror = () => res(null);
    im.onload = () => {
      try {
        let w = im.naturalWidth, h = im.naturalHeight;
        let cx = 0, cy = 0, cw = w, ch = h;
        if (w/h > 9/16){ cw = Math.round(h*9/16); cx = Math.round((w - cw)/2); }
        else { ch = Math.round(w*16/9); cy = Math.round((h - ch)/2); }
        const dw = Math.min(FG_ANCHO, cw), dh = Math.round(dw*ch/cw);
        const cv = document.createElement('canvas');
        cv.width = dw; cv.height = dh;
        cv.getContext('2d').drawImage(im, cx, cy, cw, ch, 0, 0, dw, dh);
        res(cv.toDataURL('image/jpeg', FG_CAL));
      } catch (e) { res(null); }
    };
    im.src = d;
  });
}

function fgUrl(texto){
  const p = FG_RECETA + (texto ? ', ' + texto : '');
  return FG_URL + encodeURIComponent(p)
       + '?width=768&height=1376&nologo=true&seed=' + Math.floor(Math.random()*1e6);
}

/* ══════════ BAJAR SIN CONGELAR EL LAUNCHER ══════════

   ── EL DEFECTO, MEDIDO ──
   Esto llamaba a `AND.baja(url)` y esperaba el `return`. Una llamada al puente
   es SÍNCRONA: el hilo de JavaScript del WebView se queda parado hasta que Java
   contesta, y ese hilo es el que repinta la página, atiende el dedo y dibuja el
   agua. Medido contra el generador de verdad, nueve pedidos seguidos: **seis
   imágenes y tres 500**, con tiempos de **1,7 a 45,7 segundos**. O sea que
   tocar GENERAR tildaba el launcher casi un minuto — y encima el botón nunca
   llegaba a decir «generando», porque el repintado necesita justo el hilo que
   quedó bloqueado. Desde afuera eso se ve como que el botón no hace nada.

   ── Y LOS TRES 500 ERAN TRANSITORIOS ──
   Los tres traían un 429 adentro (`community_model_rate_limit`) y el pedido
   siguiente andaba. El reintento vive del lado de Java, que es el único que ve
   el código HTTP; acá lo único que hay que hacer es no mentir mientras espera.

   `bajaAsinc` puede no existir: un APK viejo tiene puente y no tiene ese
   método. Ahí se avisa y NO se llama al síncrono — un launcher tildado
   cuarenta y cinco segundos es peor que un cartel que dice qué actualizar. */
const FG_BAJAS = {};
let FG_NUM = 0;

window.__bajaFin = function(id, dato, motivo){
  const p = FG_BAJAS[id]; if (!p) return;   /* cancelado: la respuesta se descarta */
  delete FG_BAJAS[id];
  p(dato || '', motivo || 'no');
};

function fgBaja(url){
  return new Promise(res => {
    const id = 'b' + (++FG_NUM);
    FG_BAJAS[id] = (d, m) => res({ d: d, m: m });
    FG_ACT = id;
    try { AND.bajaAsinc(id, url); }
    catch (e) { delete FG_BAJAS[id]; res({ d: '', m: 'no' }); }
  });
}

/* el id de la bajada en curso: cancelar es olvidarse de ella, no interrumpir la
   red — el hilo de Java termina igual y su respuesta cae en un `FG_BAJAS` que
   ya no la tiene. Interrumpirla de verdad no compra nada y sí complica el
   puente. */
let FG_ACT = null, FG_RELOJ = 0, FG_T0 = 0;

async function fgGenera(texto){
  if (FG_GEN) return;
  const and = (typeof AND !== 'undefined' && AND) ? AND : null;
  if (!and || typeof and.baja !== 'function'){ avisa(T('fgSinRed')); return; }
  if (typeof and.bajaAsinc !== 'function'){ avisa(T('fgViejo')); return; }
  FG_GEN = true; FG_T0 = Date.now();
  fgGenPinta();
  /* el cartel de «tarda» sale a los cuatro segundos y no de entrada: el caso
     rápido son 1,7 s y avisarlo siempre convierte lo normal en una excusa */
  FG_RELOJ = setInterval(fgGenPinta, 500);
  const av = setTimeout(() => { if (FG_GEN) avisa(T('fgTarda')); }, 4000);
  const r = await fgBaja(fgUrl(texto));
  clearTimeout(av); clearInterval(FG_RELOJ); FG_RELOJ = 0;
  if (!FG_GEN) return;                      /* lo cancelaron mientras bajaba */
  FG_GEN = false; FG_ACT = null;
  fgGenPinta();
  if (!r.d){
    avisa(T(r.m === 'servidor' ? 'fgOcupado' : r.m === 'red' ? 'fgSinNet' : 'fgNoGen'));
    return;
  }
  const chico = await fgDeDataURI(r.d);
  if (!chico){ avisa(T('fgNoPudo')); return; }
  if (!guarda('fondoPropio', chico)){ avisa(T('fgGrande')); return; }
  fondoPone('propio');
  fgPinta();
  avisa(T('fgGenOk'));
}

function fgCancela(){
  if (!FG_GEN) return;
  if (FG_ACT) delete FG_BAJAS[FG_ACT];
  FG_GEN = false; FG_ACT = null;
  if (FG_RELOJ){ clearInterval(FG_RELOJ); FG_RELOJ = 0; }
  fgGenPinta();
}

function fgGenPinta(){
  const b = $('#fgGenB'); if (!b) return;
  /* ── EL SEGUNDERO NO ES ADORNO ──
     El caso lento son 45 s. Un botón que dice «Generando…» y no cambia en
     cuarenta segundos se lee a colgado; con los segundos a la vista se lee a
     que está trabajando, que es lo que de verdad está pasando. */
  const seg = FG_GEN ? Math.round((Date.now() - FG_T0) / 1000) : 0;
  b.textContent = FG_GEN ? T('fgGenando') + ' ' + seg + 's' : T('fgGenar');
  b.disabled = FG_GEN;
  /* por CLASE y no por `style.display`: la regla base es `display:none` y un
     `style` vacío no la vence — poner el valor a mano ataría el JS al display
     que hoy tiene el botón. */
  const c = $('#fgGenX');
  if (c){ c.classList.toggle('on', FG_GEN); c.textContent = T('fgCancel'); }
  const i = $('#fgGenT'); if (i) i.disabled = FG_GEN;
}

async function fgPropia(archivo){
  if (!archivo) return;
  const d = await fgAchica(archivo);
  if (!d){ avisa(T('fgNoPudo')); return; }
  /* ── SI NO ENTRA EN LA CUOTA, HAY QUE DECIRLO ──
     `setItem` tira QuotaExceededError. Guardando y siguiendo como si nada,
     `fondoPone('propio')` no encuentra la imagen, cae al de fábrica, y desde
     afuera eso se ve como que tocar «la tuya» no hace nada. */
  if (!guarda('fondoPropio', d)){ avisa(T('fgGrande')); return; }
  fondoPone('propio');
  fgPinta();
}

function fgIdeasPinta(){
  const c = $('#fgIdeas'); if (!c) return;
  c.textContent = '';
  for (const k of FG_IDEAS){
    const d = document.createElement('div');
    d.className = 'fgId'; d.textContent = T(k);
    d.addEventListener('click', () => { $('#fgGenT').value = T(k); fgGenera(T(k)); });
    c.appendChild(d);
  }
}

function fgInit(){
  $('#fgX').addEventListener('click', fgCierra);
  $('#fgGenT').placeholder = T('fgGenPh');
  $('#fgGenB').addEventListener('click', () => fgGenera($('#fgGenT').value.trim()));
  $('#fgGenX').addEventListener('click', fgCancela);
  $('#fgGenT').addEventListener('keydown', e => {
    if (e.key === 'Enter') fgGenera($('#fgGenT').value.trim());
  });
  fgGenPinta(); fgIdeasPinta();
  $('#fgRejilla').addEventListener('click', e => {
    const it = e.target.closest('.fgIt');
    if (!it) return;
    fondoPone(it.dataset.k);
    fgPinta();
    vibra(8);
  });
  $$('.fgTab').forEach(n => n.addEventListener('click', () => fgSolapa(n.dataset.t)));
  $('#fgWid').addEventListener('click', e => {
    const it = e.target.closest('.fgW');
    if (!it) return;
    const k = it.dataset.k, i = WID.indexOf(k);
    const l = WID.slice();
    if (i >= 0) l.splice(i, 1);
    else {
      /* ── EL TOPE NO ES UN CAPRICHO ──
         `#hoja` es lo que queda después de los widgets: con cinco apilados no
         entra una sola fila de apps y el escritorio deja de ser un escritorio.
         Medido: el catálogo llega a 196 px de alto en el calendario. */
      if (l.length >= WID_MAX){ avisa(T('wLleno')); return; }
      l.push(k);
    }
    widPone(l);
    fgWPinta();
    vibra(10);
  });
  const inp = $('#fgArch');
  $('#fgMia').addEventListener('click', () => inp.click());
  inp.addEventListener('change', () => { fgPropia(inp.files && inp.files[0]); inp.value = ''; });
}
