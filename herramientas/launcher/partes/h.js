/* ══════════════════════ EL ASISTENTE ══════════════════════

   ── LA LLAVE ES DEL DUEÑO DEL TELÉFONO Y NO SALE DE AHÍ ──
   Es la decisión de fondo y de ella cuelga todo lo demás, igual que en CUBOS.
   Esto es una interfaz que corre adentro de un WebView: no hay servidor donde
   esconder una llave, y meter una en el HTML sería repartirla a cualquiera que
   descomprima el APK. Así que la pone el dueño, se guarda **sólo** en el
   `localStorage` de su aparato, y lo único que sale de ahí es lo que él
   escribió más la lista de sus apps.

   De eso se siguen tres cosas, y las tres son obligatorias:

   · **SIN LLAVE EL ASISTENTE FUNCIONA IGUAL.** Un asistente que no arranca sin
     una llave de API no es una app: es una pantalla de error. Lo que contesta
     entonces es el intérprete de acá abajo, que entiende un puñado de frases en
     los tres idiomas. Es menos, y es honesto.
   · **LA PANTALLA DICE SIEMPRE QUIÉN CONTESTÓ.** Una respuesta sin autor no
     significa nada: no es lo mismo «no entendí» de un modelo que de veinte
     expresiones regulares.
   · **Y SI LA LLAMADA FALLA, SE CAE AL INTÉRPRETE Y SE DICE POR QUÉ.** Sin red,
     con la llave mal, o si el modelo se niega: en los tres casos el asistente
     sigue contestando y el motivo queda a la vista.

   ── SE LLAMA CON `fetch` A MANO Y NO CON EL SDK ──
   El SDK oficial es un paquete de npm: acá no hay bundler, y bajarlo de un CDN
   convertiría «una interfaz que anda» en «una interfaz que anda si el CDN
   contesta» — que es justo lo que este launcher no puede permitirse, porque es
   la pantalla de inicio del teléfono. Lo único que el SDK agrega sobre esta
   llamada es un encabezado, `anthropic-dangerous-direct-browser-access`, que
   está copiado de su propio código y sin el cual la API no le contesta a un
   navegador. */

const ASIS_PKG = 'ai.rezona.aero.asistente';
const ASIS_MOD = 'claude-opus-5';

/* ══════════ LO QUE EL ASISTENTE PUEDE HACER ══════════
   ── UNA SOLA TABLA, Y LA LEEN LOS TRES ──
   El esquema que se le manda al modelo, el intérprete de sin-llave y el
   ejecutor salen de acá. Con tres listas, el día que se agregue una acción hay
   que acordarse en tres sitios y el modelo va a pedir cosas que nadie sabe
   hacer — que es el defecto más difícil de ver, porque no falla: contesta bien
   y no pasa nada. */
const ASIS_ACC = {
  iconos:   { num: [40, 92],  hace: v => { ponReja(v, null); rejaRepinta(); },
              dice: v => T('aIconos', v) },
  columnas: { num: [3, 6],    hace: v => { ponReja(null, v); rejaRepinta(); },
              dice: v => T('aColumnas', v) },
  abrir:    { app: true,      hace: p => abre(p),        dice: p => T('aAbrir', asisNom(p)) },
  fijar:    { app: true,      hace: p => { if (!fijado(p)) alterna(p); },
              dice: p => T('aFijar', asisNom(p)) },
  soltar:   { app: true,      hace: p => { if (fijado(p)) alterna(p); },
              dice: p => T('aSoltar', asisNom(p)) },
  buscar:   { txt: true,      hace: q => aLaWeb(q),      dice: q => T('aBuscar', q) },
  idioma:   { uno: ['es', 'en', 'pt'],
              hace: v => { LANG = v; guarda('lang', v); repintaIdioma(); },
              dice: v => T('aIdioma', v) },
  mascota:  { uno: ['quieto', 'baila', 'saluda', 'mando', 'duerme'],
              hace: v => { asisMascota(v); }, dice: v => T('aMascota', v) },
  cajon:    { uno: ['abrir', 'cerrar'],
              hace: v => verCajon(v === 'abrir'), dice: v => T('aCajon', v) }
};

/* el nombre de una app a partir de su paquete, para poder decir «abro Spotify»
   y no «abro com.spotify.music» */
function asisNom(p){ const a = POR_PKG[p]; return a ? a.n : p; }

/* ── REPINTAR ES DE ACÁ Y NO DE `ponReja` ──
   `ponReja` es aritmética y estado; que además repinte la ataría al DOM y no se
   la podría llamar desde el arranque, antes de que haya apps. */
function rejaRepinta(){ calculaFilas(); pintaInicio(); pintaDock(); pintaCajon($('#busca2').value); }

/* la mascota se fuerza por el mismo camino que usa el ocio, y se le corre el
   reloj para que el ocio no la pise al cuadro siguiente */
function asisMascota(n){
  const m = $('#mascota');
  clearTimeout(MASC_T); clearTimeout(MASC_CICLO);
  m.classList.add('on'); l3Corre(true);
  MASC_ULT = Date.now(); mascPone(n);
  MASC_CICLO = setTimeout(mascOcio, 6000);
}

/* ══════════ EL ESQUEMA ══════════
   Se arma DE LA TABLA. Escrito a mano al lado, se separa de ella el día que se
   toque cualquiera de los dos. */
function asisEsquema(){
  return {
    type: 'object',
    properties: {
      respuesta: { type: 'string', description: 'Una frase corta para el usuario, en su idioma.' },
      acciones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            hacer: { type: 'string', enum: Object.keys(ASIS_ACC) },
            valor: { type: 'string', description: 'El argumento: un número, un nombre de paquete, un texto o una de las opciones.' }
          },
          required: ['hacer', 'valor'],
          additionalProperties: false
        }
      }
    },
    required: ['respuesta', 'acciones'],
    additionalProperties: false
  };
}

function asisSistema(){
  const L = APPS.filter(a => a.p !== ASIS_PKG)
                .map(a => a.n + ' = ' + a.p).join('\n');
  return 'Sos el asistente de Aero, un launcher de Android. El usuario te pide cosas ' +
    'sobre su pantalla de inicio y vos devolvés acciones que el launcher sabe hacer.\n\n' +
    'ACCIONES:\n' +
    '· iconos <40..92>      el lado del icono en píxeles (agrandar/achicar las apps)\n' +
    '· columnas <3..6>      cuántas apps por fila\n' +
    '· abrir <paquete>      abre una app\n' +
    '· fijar <paquete>      la pone en el escritorio\n' +
    '· soltar <paquete>     la saca del escritorio\n' +
    '· buscar <texto>       busca eso en la web\n' +
    '· idioma <es|en|pt>\n' +
    '· mascota <quieto|baila|saluda|mando|duerme>\n' +
    '· cajon <abrir|cerrar> el cajón de todas las apps\n\n' +
    'El estado ahora: iconos ' + ICO + ', columnas ' + COLS + ', idioma ' + LANG + '.\n\n' +
    'APPS INSTALADAS (nombre = paquete; usá el paquete):\n' + L + '\n\n' +
    'Contestá con una frase corta en el idioma del usuario y la lista de acciones. ' +
    'Si te piden algo que no está en la lista, devolvé acciones vacías y decilo.';
}

/* ══════════ LA LLAMADA ══════════ */
async function asisIA(txt){
  const k = lee('llave', '');
  if (!k) return { modo: 'local' };
  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': k,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: ASIS_MOD,
        max_tokens: 700,
        system: asisSistema(),
        messages: [{ role: 'user', content: txt }],
        output_config: { format: { type: 'json_schema', schema: asisEsquema() } }
      })
    });
  } catch (e){ return { modo: 'local', porque: T('aSinRed') }; }
  if (r.status === 401 || r.status === 403) return { modo: 'local', porque: T('aLlaveMal', r.status) };
  if (!r.ok) return { modo: 'local', porque: T('aFalla', r.status) };
  let j;
  try { j = await r.json(); } catch (e){ return { modo: 'local', porque: T('aFalla', '?') }; }
  /* la negativa llega con HTTP 200 y no como error: sin esto se lee como una
     respuesta vacía y el asistente parece roto */
  if (j.stop_reason === 'refusal') return { modo: 'local', porque: T('aNiega') };
  const b = (j.content || []).find(c => c.type === 'text');
  if (!b) return { modo: 'local', porque: T('aFalla', '0') };
  try {
    const o = JSON.parse(b.text);
    return { modo: 'ia', respuesta: String(o.respuesta || ''),
             acciones: Array.isArray(o.acciones) ? o.acciones : [] };
  } catch (e){ return { modo: 'local', porque: T('aFalla', '·') }; }
}

/* ══════════ EL INTÉRPRETE DE SIN-LLAVE ══════════
   No compite con el modelo y no lo intenta: entiende las frases que la gente
   escribe de verdad en un launcher, en los tres idiomas, y para lo demás dice
   que no entendió. Lo que lo hace útil es que las mismas acciones de la tabla
   son las que ejecuta, así que lo que aprende uno usándolo sin llave sigue
   valiendo con llave. */
const ASIS_MAS = /\b(grande|grandes|agranda|agrandar|agrandá|m[aá]s grande|bigger|larger|enlarge|maior|aumenta)\b/i;
const ASIS_MEN = /\b(chico|chicos|peque|peque[nñ]|achic|m[aá]s chico|smaller|menor|reduz|reduc)\b/i;

function asisLocal(txt){
  const t = norm(txt), acc = [];
  const num = (t.match(/\b(\d{1,2})\b/) || [])[1];

  if (/\b(icono|iconos|app|apps|aplicacion|aplicaciones|icon|icons)\b/.test(t) &&
      (ASIS_MAS.test(t) || ASIS_MEN.test(t) || num))
    acc.push({ hacer: 'iconos', valor: num && +num >= 40 ? num : (ASIS_MAS.test(t) ? ICO + 12 : ICO - 12) });

  if (/\b(columna|columnas|column|columns|coluna|colunas|fila|filas)\b/.test(t) && num)
    acc.push({ hacer: 'columnas', valor: num });

  if (/\b(abri|abrir|abre|open|abra)\b/.test(t)){
    const a = asisBuscaApp(txt);
    if (a) acc.push({ hacer: 'abrir', valor: a.p });
  }
  if (/\b(fija|fijar|anclar|pin|fixar)\b/.test(t)){
    const a = asisBuscaApp(txt);
    if (a) acc.push({ hacer: 'fijar', valor: a.p });
  }
  if (/\b(solta|soltar|saca|sacar|quita|quitar|unpin|remove|remover)\b/.test(t)){
    const a = asisBuscaApp(txt);
    if (a) acc.push({ hacer: 'soltar', valor: a.p });
  }
  if (/\b(baila|bailar|dance|dan[cç]a)\b/.test(t)) acc.push({ hacer: 'mascota', valor: 'baila' });
  else if (/\b(duerme|dormir|sleep|dorme)\b/.test(t)) acc.push({ hacer: 'mascota', valor: 'duerme' });
  else if (/\b(saluda|saludar|wave|acena)\b/.test(t)) acc.push({ hacer: 'mascota', valor: 'saluda' });

  if (/\b(ingles|english|ingl[eê]s)\b/.test(t)) acc.push({ hacer: 'idioma', valor: 'en' });
  else if (/\b(castellano|espanol|spanish|espanhol)\b/.test(t)) acc.push({ hacer: 'idioma', valor: 'es' });
  else if (/\b(portugues|portuguese)\b/.test(t)) acc.push({ hacer: 'idioma', valor: 'pt' });

  const b = txt.match(/\b(?:busc\w*|search|pesquis\w*)\s+(?:de\s+)?["“]?([^"”]+)["”]?$/i);
  if (b && !acc.length) acc.push({ hacer: 'buscar', valor: b[1].trim() });

  return { modo: 'local', acciones: acc,
           respuesta: acc.length ? '' : T('aNoEntiendo') };
}

/* la app que nombra la frase: se mira el nombre y se toma el más largo que
   aparezca, así «play store» no se resuelve a «Play» */
function asisBuscaApp(txt){
  const t = norm(txt);
  let mej = null;
  for (const a of APPS){
    if (a.p === ASIS_PKG) continue;
    const n = norm(a.n);
    if (n.length > 2 && t.indexOf(n) >= 0 && (!mej || n.length > norm(mej.n).length)) mej = a;
  }
  return mej;
}

/* ══════════ EJECUTAR ══════════
   Todo lo que llega —del modelo o del intérprete— pasa por acá, y acá se
   COMPRUEBA: un número fuera de rango se recorta, un paquete que no existe se
   descarta y una acción que no está en la tabla se ignora. El modelo puede
   inventar; el launcher no puede obedecerle a ciegas. */
function asisHace(acciones){
  const hechas = [];
  for (const a of (acciones || [])){
    const d = ASIS_ACC[a && a.hacer];
    if (!d) continue;
    let v = a.valor;
    if (d.num){
      v = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
      if (!isFinite(v)) continue;
      v = cl(v, d.num[0], d.num[1]);
    } else if (d.uno){
      v = String(v || '').toLowerCase();
      if (d.uno.indexOf(v) < 0) continue;
    } else if (d.app){
      if (!POR_PKG[v]){
        const b = asisBuscaApp(String(v || ''));
        if (!b) continue;
        v = b.p;
      }
    } else if (d.txt){
      v = String(v || '').trim();
      if (!v) continue;
    }
    try { d.hace(v); hechas.push(d.dice(v)); } catch (e){ }
  }
  return hechas;
}

/* ══════════ LA PANTALLA ══════════ */
let ASIS_PENSANDO = false;

function asisDi(quien, txt){
  const l = $('#asLista');
  const d = document.createElement('div');
  d.className = 'asMsg as-' + quien;
  d.textContent = txt;
  l.appendChild(d);
  l.scrollTop = l.scrollHeight;
  return d;
}

function asisAbre(){
  cierraMenu(); verCajon(false);
  $('#asis').classList.add('on');
  $('#velo').classList.add('on');
  asisIdioma();
  setTimeout(() => $('#asTxt').focus(), 120);
}
function asisCierra(){
  $('#asis').classList.remove('on');
  $('#velo').classList.remove('on');
  $('#asLlaveCaja').classList.remove('on');
}

async function asisManda(){
  if (ASIS_PENSANDO) return;
  const e = $('#asTxt'), txt = e.value.trim();
  if (!txt) return;
  e.value = '';
  asisDi('yo', txt);
  ASIS_PENSANDO = true;
  const p = asisDi('bot', '···');
  let r = await asisIA(txt);
  if (r.modo === 'local'){
    const l = asisLocal(txt);
    l.porque = r.porque;
    r = l;
  }
  p.remove();
  const hechas = asisHace(r.acciones);
  const cuerpo = [];
  if (r.respuesta) cuerpo.push(r.respuesta);
  if (hechas.length) cuerpo.push('✓ ' + hechas.join('\n✓ '));
  if (!cuerpo.length) cuerpo.push(T('aNoEntiendo'));
  const d = asisDi('bot', cuerpo.join('\n'));
  /* ── QUIÉN CONTESTÓ VA SIEMPRE, Y NO ES UN DETALLE ──
     Sin esto, «no entendí» del intérprete y «no entendí» del modelo se leen
     igual, y el dueño no tiene forma de saber si le falta poner la llave. */
  const f = document.createElement('div');
  f.className = 'asFirma';
  f.textContent = (r.modo === 'ia' ? T('aPorIA') : T('aPorLocal')) +
                  (r.porque ? ' · ' + r.porque : '');
  d.appendChild(f);
  $('#asLista').scrollTop = $('#asLista').scrollHeight;
  ASIS_PENSANDO = false;
}

/* ══════════ IDIOMA ══════════ */
function asisIdioma(){
  $('#asTit').textContent = T('aTit');
  $('#asTxt').placeholder = T('aPide');
  $('#asLlave').placeholder = T('aLlavePh');
  $('#asAyuda').textContent = lee('llave', '') ? T('aConLlave') : T('aSinLlave');
  $('#asLlaveTit').textContent = T('aLlaveTit');
  $('#asGuardar').textContent = T('aGuardar');
  $('#asBorrar').textContent = T('aBorrar');
}

function asisInit(){
  $('#asCerrar').addEventListener('click', asisCierra);
  $('#asMandar').addEventListener('click', asisManda);
  $('#asTxt').addEventListener('keydown', ev => { if (ev.key === 'Enter') asisManda(); });
  $('#asConf').addEventListener('click', () => {
    const c = $('#asLlaveCaja');
    c.classList.toggle('on');
    if (c.classList.contains('on')) $('#asLlave').value = lee('llave', '');
  });
  $('#asGuardar').addEventListener('click', () => {
    const v = $('#asLlave').value.trim();
    guarda('llave', v); $('#asLlave').value = '';
    $('#asLlaveCaja').classList.remove('on');
    asisIdioma(); avisa(v ? T('aLlaveOk') : T('aLlaveFuera'));
  });
  $('#asBorrar').addEventListener('click', () => {
    guarda('llave', ''); $('#asLlave').value = '';
    asisIdioma(); avisa(T('aLlaveFuera'));
  });
  asisIdioma();
  asisDi('bot', T('aHola'));
}
