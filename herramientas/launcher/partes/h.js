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

/* ── MOSTRAR UNA POSE ES UNA PREVIA CON VENCIMIENTO ──
   Poniéndole `.on` a mano y nada más, la mascota se queda encendida para
   siempre —cerrar el panel la dejaba plantada en el escritorio, que es
   exactamente lo que esta vuelta vino a sacar—. Se anota HASTA CUÁNDO se la
   pidió y la decisión la sigue tomando `mascMira`, que es el único que sabe la
   regla; cada botón que se toca corre el vencimiento. */
const ASIS_PREVIA = 6000;
let ASIS_PT = 0;
function asisMascota(n){
  clearTimeout(MASC_CICLO); clearTimeout(ASIS_PT);
  MASC_PREVIA = Date.now() + ASIS_PREVIA;
  MASC_ULT = Date.now(); mascPone(n);
  mascMira();
  MASC_CICLO = setTimeout(mascOcio, ASIS_PREVIA);
  ASIS_PT = setTimeout(mascMira, ASIS_PREVIA + 40);
}

/* ══════════ QUIÉN CONTESTA ══════════

   ── TRES PROVEEDORES, Y DOS SON GRATIS ──
   Pedirle al dueño una tarjeta de crédito para que su launcher entienda «agrandá
   las apps» no tiene sentido, así que el que viene puesto es **Gemini**, que da
   una llave sin tarjeta en aistudio.google.com. Anthropic queda para el que ya
   tiene llave y Groq para el que quiera velocidad.

   ── Y LOS TRES TIENEN QUE PODER LLAMARSE DESDE UN NAVEGADOR ──
   Ésta es la condición dura y no se cumple sola: la interfaz se carga desde
   `file:///android_asset/`, así que el `fetch` sale con `Origin: null` y el
   servidor tiene que contestar con CORS permisivo o el navegador no deja LEER
   la respuesta. Medido contra los tres endpoints con ese origen exacto:
   Anthropic devuelve `Access-Control-Allow-Origin: *` —pero sólo si el
   encabezado `anthropic-dangerous-direct-browser-access` va en el preflight—,
   Groq devuelve `*`, y Google **repite el origen que le mandes**, `null`
   incluido, que según la especificación es justo lo que hace falta.
   **Cerebras quedó afuera**: pasa el preflight y después contesta los errores
   SIN un solo encabezado de CORS, o sea que un 401 sería ilegible.

   Cada proveedor sabe tres cosas y nada más: cómo se autentica, qué cuerpo
   arma y cómo se lee lo que vuelve. Todo lo demás —la tabla de acciones, la
   validación, el intérprete de respaldo, los tres modos de falla— es el mismo
   para los tres. */
const ASIS_PROV = {
  gemini: {
    nombre: 'Google Gemini', gratis: true, ph: 'AIza…',
    donde: 'aistudio.google.com',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    cab: k => ({ 'content-type': 'application/json', 'x-goog-api-key': k }),
    cuerpo: (sis, txt) => ({
      systemInstruction: { parts: [{ text: sis }] },
      contents: [{ role: 'user', parts: [{ text: txt }] }],
      generationConfig: {
        temperature: 0, maxOutputTokens: 700,
        responseMimeType: 'application/json',
        /* el esquema de Google lleva los tipos en MAYÚSCULA y no acepta
           `additionalProperties`: es otro dialecto, no el mismo con otro nombre */
        responseSchema: {
          type: 'OBJECT',
          properties: {
            respuesta: { type: 'STRING' },
            acciones: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
              hacer: { type: 'STRING', enum: Object.keys(ASIS_ACC) },
              valor: { type: 'STRING' } }, required: ['hacer', 'valor'] } }
          },
          required: ['respuesta', 'acciones']
        }
      }
    }),
    lee: j => {
      const c = (j.candidates || [])[0];
      if (!c) return null;
      /* `SAFETY` y `MAX_TOKENS` cortan el JSON a la mitad: sin esta guarda el
         `JSON.parse` tira y se lee como si la API hubiera fallado */
      if (c.finishReason && c.finishReason !== 'STOP') return { corte: c.finishReason };
      const t = (c.content && c.content.parts || []).map(x => x.text).join('');
      return t ? { txt: t } : null;
    }
  },
  groq: {
    nombre: 'Groq', gratis: true, ph: 'gsk_…', donde: 'console.groq.com',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    cab: k => ({ 'content-type': 'application/json', 'authorization': 'Bearer ' + k }),
    cuerpo: (sis, txt) => ({
      model: 'llama-3.3-70b-versatile', temperature: 0, max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sis }, { role: 'user', content: txt }]
    }),
    lee: j => {
      const c = (j.choices || [])[0];
      if (!c) return null;
      return c.message && c.message.content ? { txt: c.message.content } : null;
    }
  },
  anthropic: {
    nombre: 'Anthropic', gratis: false, ph: 'sk-ant-…', donde: 'console.anthropic.com',
    url: 'https://api.anthropic.com/v1/messages',
    cab: k => ({ 'content-type': 'application/json', 'x-api-key': k,
                 'anthropic-version': '2023-06-01',
                 /* sin este encabezado la API no le contesta a un navegador, y
                    encima es lo que hace que el preflight devuelva CORS */
                 'anthropic-dangerous-direct-browser-access': 'true' }),
    cuerpo: (sis, txt) => ({
      model: 'claude-opus-5', max_tokens: 700, system: sis,
      messages: [{ role: 'user', content: txt }],
      output_config: { format: { type: 'json_schema', schema: {
        type: 'object',
        properties: {
          respuesta: { type: 'string' },
          acciones: { type: 'array', items: { type: 'object', properties: {
            hacer: { type: 'string', enum: Object.keys(ASIS_ACC) },
            valor: { type: 'string' } },
            required: ['hacer', 'valor'], additionalProperties: false } }
        },
        required: ['respuesta', 'acciones'], additionalProperties: false } } }
    }),
    lee: j => {
      /* la negativa llega con HTTP 200 y no como error */
      if (j.stop_reason === 'refusal') return { corte: 'refusal' };
      const b = (j.content || []).find(c => c.type === 'text');
      return b ? { txt: b.text } : null;
    }
  }
};

function asisProv(){ const p = lee('prov', 'gemini'); return ASIS_PROV[p] ? p : 'gemini'; }
function asisLlave(p){ return lee('llave_' + (p || asisProv()), ''); }

function asisSistema(){
  const L = APPS.filter(a => a.p !== ASIS_PKG)
                .map(a => a.n + ' = ' + a.p).join('\n');
  return 'Sos el asistente de Aero, un launcher de Android. El usuario te pide cosas ' +
    'sobre su pantalla de inicio y vos devolvés JSON con las acciones que el launcher sabe hacer.\n\n' +
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
    'Contestá SÓLO con JSON: {"respuesta": "una frase corta en el idioma del usuario", ' +
    '"acciones": [{"hacer": "...", "valor": "..."}]}. ' +
    'Si te piden algo que no está en la lista, devolvé acciones vacías y decilo en la respuesta.';
}

/* ══════════ LA LLAMADA ══════════
   Una sola, para los tres: lo que cambia es el proveedor, no el camino. */
async function asisIA(txt){
  const id = asisProv(), P = ASIS_PROV[id], k = asisLlave(id);
  if (!k) return { modo: 'local' };
  let r;
  try {
    r = await fetch(P.url, { method: 'POST', headers: P.cab(k),
                             body: JSON.stringify(P.cuerpo(asisSistema(), txt)) });
  } catch (e){ return { modo: 'local', porque: T('aSinRed') }; }
  if (r.status === 401 || r.status === 403) return { modo: 'local', porque: T('aLlaveMal', r.status) };
  /* Google contesta 400 con API_KEY_INVALID en vez de 401: un 400 en la primera
     llamada es casi siempre la llave, y decir «la API falló (400)» manda al
     dueño a buscar el problema donde no está */
  if (r.status === 400 && id === 'gemini') return { modo: 'local', porque: T('aLlaveMal', 400) };
  if (!r.ok) return { modo: 'local', porque: T('aFalla', r.status) };
  let j;
  try { j = await r.json(); } catch (e){ return { modo: 'local', porque: T('aFalla', '?') }; }
  const o = P.lee(j);
  if (!o) return { modo: 'local', porque: T('aFalla', '0') };
  if (o.corte) return { modo: 'local', porque: T('aNiega') };
  try {
    const d = JSON.parse(o.txt);
    return { modo: 'ia', prov: P.nombre, respuesta: String(d.respuesta || ''),
             acciones: Array.isArray(d.acciones) ? d.acciones : [] };
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
  f.textContent = (r.modo === 'ia' ? T('aPorIA') + ' · ' + r.prov : T('aPorLocal')) +
                  (r.porque ? ' · ' + r.porque : '');
  d.appendChild(f);
  $('#asLista').scrollTop = $('#asLista').scrollHeight;
  ASIS_PENSANDO = false;
}

/* ══════════ LA FILA DE PROVEEDORES ══════════
   Se pinta de la tabla, así que agregar uno es agregar una entrada y nada más.
   Y **la llave es por proveedor**: con una sola, cambiar de Gemini a Groq
   mandaría la llave de Google a Groq y el dueño vería un 401 sin entender por
   qué, después de haber pegado una llave que funciona. */
function asisProvPinta(){
  const f = $('#asProvs'); f.innerHTML = '';
  const act = asisProv();
  for (const id in ASIS_PROV){
    const P = ASIS_PROV[id];
    const b = document.createElement('div');
    b.className = 'pOp' + (id === act ? ' sel' : '');
    b.textContent = P.nombre + (P.gratis ? ' · ' + T('aGratis') : '');
    b.addEventListener('click', () => {
      guarda('prov', id); vibra(10);
      $('#asLlave').value = asisLlave(id);
      asisIdioma();
    });
    f.appendChild(b);
  }
}

/* ══════════ IDIOMA ══════════ */
function asisIdioma(){
  const P = ASIS_PROV[asisProv()];
  $('#asTit').textContent = T('aTit');
  $('#asTxt').placeholder = T('aPide');
  $('#asLlave').placeholder = P.ph;
  $('#asAyuda').textContent = asisLlave() ? T('aConLlave', P.nombre) : T('aSinLlave');
  $('#asLlaveTit').textContent = T('aLlaveTit', P.donde);
  $('#asGuardar').textContent = T('aGuardar');
  $('#asBorrar').textContent = T('aBorrar');
  asisProvPinta();
}

function asisInit(){
  $('#asCerrar').addEventListener('click', asisCierra);
  $('#asMandar').addEventListener('click', asisManda);
  $('#asTxt').addEventListener('keydown', ev => { if (ev.key === 'Enter') asisManda(); });
  $('#asConf').addEventListener('click', () => {
    const c = $('#asLlaveCaja');
    c.classList.toggle('on');
    if (c.classList.contains('on')) $('#asLlave').value = asisLlave();
  });
  $('#asGuardar').addEventListener('click', () => {
    const v = $('#asLlave').value.trim();
    guarda('llave_' + asisProv(), v); $('#asLlave').value = '';
    $('#asLlaveCaja').classList.remove('on');
    asisIdioma(); avisa(v ? T('aLlaveOk') : T('aLlaveFuera'));
  });
  $('#asBorrar').addEventListener('click', () => {
    guarda('llave_' + asisProv(), ''); $('#asLlave').value = '';
    asisIdioma(); avisa(T('aLlaveFuera'));
  });
  asisIdioma();
  asisDi('bot', T('aHola'));
}
