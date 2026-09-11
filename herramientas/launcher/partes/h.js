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
/* qué cámara del sistema tocó el dueño: el botón «del sistema» del selector la
   abre a ella y no una que el launcher haya adivinado */
let CAM_SIS = '';
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
              hace: v => verCajon(v === 'abrir'), dice: v => T('aCajon', v) },

  /* ── LO QUE ESTA VUELTA AGREGÓ AL ESCRITORIO TAMBIÉN SE PIDE HABLANDO ──
     La tabla es una sola y la leen el esquema que se le manda al modelo, el
     intérprete local y el ejecutor: con tres listas, el día que se agrega una
     acción el modelo pide cosas que nadie sabe hacer — y eso NO falla, contesta
     bien y no pasa nada. */
  /* ── `uno` PUEDE SER UNA FUNCIÓN, Y HACE FALTA ──
     `WID_ORDEN` es un `const` de `w.js`, que se evalúa DESPUÉS de este archivo:
     leerlo acá al armar la tabla tira `Cannot access before initialization` y se
     lleva el módulo entero — ni siquiera `typeof` lo salva, sobre una zona
     muerta `typeof` también tira. Es la novena vez en este repo. Como función,
     se lee cuando alguien la pide, que es siempre después del arranque. */
  fondo:    { uno: () => ['fab'].concat(FONDOS_ORDEN),
              hace: v => { fondoPone(v); if (typeof fgPinta === 'function') fgPinta(); },
              dice: v => T('aFondo', T(v === 'fab' ? 'fgFab' : 'fg_' + v)) },
  icoFondo: { uno: ['agua', 'pasto', 'nube', 'no'],
              hace: v => { guarda('icoTex', v); persIcono(); rejaRepinta(); },
              dice: v => T('aIcoFondo', T(v === 'no' ? 'pNo' : 'p' + v[0].toUpperCase() + v.slice(1))) },
  widget:   { uno: () => WID_ORDEN,
              /* alterna: pedirlo dos veces lo saca, que es lo que uno espera de
                 «poné el cronómetro» dicho dos veces */
              hace: v => { const l = WID.slice(), i = l.indexOf(v);
                           if (i >= 0) l.splice(i, 1);
                           else { if (l.length >= WID_MAX) l.shift(); l.push(v); }
                           widPone(l); },
              dice: v => T('aWidget', T('w_' + v)) },
  oscuro:   { num: [0, 70], hace: v => { guarda('oscuro', v); persOscuro(); },
              dice: v => T('aOscuro', v) }
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
  /* ── EL QUE NO PIDE NADA, Y ES EL QUE VIENE PUESTO ──
     El reporte fue «la IA no anda, yo quiero que ya ande, no que pongamos
     nuestra key». Tiene razón en el síntoma: sin llave el asistente caía al
     intérprete local y lo decía, o sea que de fábrica NO había modelo.
     Pollinations es un relevo público que contesta sin llave ninguna y con
     `Access-Control-Allow-Origin: *` — medido con el preflight desde
     `Origin: null`, que es el que manda un WebView cargado de
     `file:///android_asset/`. Es el que arranca elegido.

     ── Y ES DE ALGUIEN MÁS, ASÍ QUE PUEDE DEJAR DE ESTAR ──
     Un servicio gratis y sin llave lo paga otro. Por eso no reemplaza a nada:
     los tres de llave siguen para el que quiera algo que dependa sólo de él, y
     el intérprete local sigue debajo de todo. Si esto se cae, el asistente
     sigue contestando y dice por qué. */
  /* ── EL QUE NO PIDE LLAVE, Y VA POR GET ──
     Se probó el POST a `/openai`, que es la forma que uno escribiría, y desde
     una IP anónima devuelve **402 Payment Required**: ese camino es para
     cuentas. El que sí contesta sin llave es el GET con el pedido en la ruta
     —medido acá, 200 con una respuesta de verdad— y tiene
     `access-control-allow-origin: *` con `Origin: null`, que es lo único que
     decide si un WebView puede leer la respuesta.
     Y está limitado por IP: la misma consulta contesta 200 una vez y 402 la
     siguiente. Por eso el intérprete de la casa se amplió tanto — es el que va a
     contestar la mayoría de las veces, y el panel dice siempre cuál de los dos
     fue. */
  libre: {
    /* el nombre pasa por la tabla: escrito acá salía «Sin llave» también con el
       launcher en inglés, y es lo que la firma de cada respuesta muestra */
    nombre: () => T('aSinLlaveNom'), gratis: true, sinLlave: true, ph: '', donde: 'pollinations.ai',
    url: 'https://text.pollinations.ai/',
    /* el sistema va acortado: acá viaja en la URL, y el largo de una URL tiene
       tope en cualquier servidor */
    corto: true,
    pide: (sis, txt) => ({
      url: 'https://text.pollinations.ai/' + encodeURIComponent(txt)
           + '?system=' + encodeURIComponent(sis) + '&referrer=aero',
      opts: { method: 'GET' }
    }),
    /* contesta texto pelado, no JSON: se raspa el objeto de adentro */
    leeTxt: s => { const t = asisRaspa(s); return t ? { txt: t } : null; }
  },
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

function asisProv(){ const p = lee('prov', 'libre'); return ASIS_PROV[p] ? p : 'libre'; }

/* ── LO QUE VUELVE DE UN MODELO SIN MODO JSON HAY QUE RASPARLO ──
   Los tres de llave piden el esquema y devuelven JSON pelado. El relevo libre
   no lo garantiza: puede venir con ```json alrededor, o con una frase antes.
   Se busca el primer objeto con llaves balanceadas — cortando en el primer `}`
   se parte cualquier respuesta que tenga un array de acciones adentro. */
function asisRaspa(txt){
  const s = String(txt).trim();
  try { JSON.parse(s); return s; } catch (e) {}
  const i = s.indexOf('{');
  if (i < 0) return null;
  let n = 0, dentro = false, esc = false;
  for (let j = i; j < s.length; j++){
    const c = s[j];
    if (esc){ esc = false; continue; }
    if (c === '\\'){ esc = true; continue; }
    if (c === '"'){ dentro = !dentro; continue; }
    if (dentro) continue;
    if (c === '{') n++;
    else if (c === '}'){ n--; if (!n){ const p = s.slice(i, j+1);
                                       try { JSON.parse(p); return p; } catch (e){ return null; } } }
  }
  return null;
}
function asisLlave(p){ return lee('llave_' + (p || asisProv()), ''); }
/* el nombre de un proveedor puede ser una cadena —las tres marcas, que no se
   traducen— o una función, para el que sí */
function asisNomProv(P){ return typeof P.nombre === 'function' ? P.nombre() : P.nombre; }

/* ── LA LISTA DE ACCIONES SALE DE LA TABLA ──
   Escrita a mano al lado de `ASIS_ACC`, el día que se agrega una acción el
   modelo no se entera y sigue pidiendo sólo las nueve viejas. */
function asisAcciones(){
  return Object.keys(ASIS_ACC).map(k => {
    const d = ASIS_ACC[k];
    const dom = d.num ? '<' + d.num[0] + '..' + d.num[1] + '>'
              : d.app ? '<paquete>'
              : d.txt ? '<texto>'
              : '<' + (typeof d.uno === 'function' ? d.uno() : d.uno).join('|') + '>';
    return '\u00b7 ' + k + ' ' + dom;
  }).join('\n');
}

/* `corto` es para el proveedor sin llave, que manda el sistema EN LA URL: ahí
   las treinta apps no entran y lo que importa es la lista de acciones. */
function asisSistema(corto){
  const L = APPS.filter(a => a.p !== ASIS_PKG)
                .map(a => a.n + ' = ' + a.p).join('\n');
  if (corto)
    return 'Sos el asistente de un launcher de Android. Contestá SÓLO con un objeto '
      + 'JSON {"respuesta":"una frase corta","acciones":[{"hacer":"...","valor":"..."}]}.\n'
      + 'ACCIONES:\n' + asisAcciones()
      + '\nEstado: iconos ' + ICO + ', columnas ' + COLS + ', idioma ' + LANG + '.';
  return 'Sos el asistente de Aero, un launcher de Android. El usuario te pide cosas ' +
    'sobre su pantalla de inicio y vos devolvés JSON con las acciones que el launcher sabe hacer.\n\n' +
    'ACCIONES:\n' + asisAcciones() + '\n\n' +
    'El estado ahora: iconos ' + ICO + ', columnas ' + COLS + ', idioma ' + LANG + '.\n\n' +
    'APPS INSTALADAS (nombre = paquete; usá el paquete):\n' + L + '\n\n' +
    'Contestá SÓLO con JSON: {"respuesta": "una frase corta en el idioma del usuario", ' +
    '"acciones": [{"hacer": "...", "valor": "..."}]}. ' +
    'Si te piden algo que no está en la lista, devolvé acciones vacías y decilo en la respuesta.';
}

/* ══════════ LA LLAMADA ══════════
   Una sola, para los tres: lo que cambia es el proveedor, no el camino. */
async function asisIA(txt){
  let id = asisProv();
  const k = asisLlave(id);
  /* ── UN PROVEEDOR DE LLAVE SIN LLAVE NO ES UN ERROR: ES EL QUE NO ES ──
     Antes eso caía derecho al intérprete y el dueño veía que no había modelo
     sin entender qué le faltaba. Ahora se prueba el que no pide nada. */
  if (!k && !ASIS_PROV[id].sinLlave) id = 'libre';
  const P = ASIS_PROV[id];
  if (!P.sinLlave && !asisLlave(id)) return { modo: 'local' };
  let r;
  const sis = asisSistema(P.corto);
  try {
    if (P.pide){
      const q = P.pide(sis, txt);
      r = await fetch(q.url, q.opts);
    } else {
      r = await fetch(P.url, { method: 'POST', headers: P.cab(asisLlave(id)),
                               body: JSON.stringify(P.cuerpo(sis, txt)) });
    }
  } catch (e){ return { modo: 'local', porque: T('aSinRed') }; }
  /* ── 402 Y 429 NO SON UNA LLAVE MAL: SON LA COLA DEL SERVICIO GRATIS ──
     Diciendo «la llave no sirve» sobre un proveedor que no usa llave, el dueño
     se pone a buscar una llave que no hace falta. */
  if (r.status === 402 || r.status === 429) return { modo: 'local', porque: T('aOcupado') };
  if (r.status === 401 || r.status === 403) return { modo: 'local', porque: T('aLlaveMal', r.status) };
  /* Google contesta 400 con API_KEY_INVALID en vez de 401: un 400 en la primera
     llamada es casi siempre la llave, y decir «la API falló (400)» manda al
     dueño a buscar el problema donde no está */
  if (r.status === 400 && id === 'gemini') return { modo: 'local', porque: T('aLlaveMal', 400) };
  if (!r.ok) return { modo: 'local', porque: T('aFalla', r.status) };
  let o;
  if (P.leeTxt){
    let s2;
    try { s2 = await r.text(); } catch (e){ return { modo: 'local', porque: T('aFalla', '?') }; }
    o = P.leeTxt(s2);
  } else {
    let j;
    try { j = await r.json(); } catch (e){ return { modo: 'local', porque: T('aFalla', '?') }; }
    o = P.lee(j);
  }
  if (!o) return { modo: 'local', porque: T('aFalla', '0') };
  if (o.corte) return { modo: 'local', porque: T('aNiega') };
  try {
    const d = JSON.parse(o.txt);
    return { modo: 'ia', prov: asisNomProv(P), respuesta: String(d.respuesta || ''),
             acciones: Array.isArray(d.acciones) ? d.acciones : [] };
  } catch (e){ return { modo: 'local', porque: T('aFalla', '·') }; }
}

/* ══════════ EL INTÉRPRETE DE SIN-LLAVE ══════════
   No compite con el modelo y no lo intenta: entiende las frases que la gente
   escribe de verdad en un launcher, en los tres idiomas, y para lo demás dice
   que no entendió. Lo que lo hace útil es que las mismas acciones de la tabla
   son las que ejecuta, así que lo que aprende uno usándolo sin llave sigue
   valiendo con llave. */
/* ══════════ EL INTÉRPRETE DE LA CASA ══════════

   ── ES EL QUE MÁS VECES VA A CONTESTAR, Y POR ESO SE AMPLIÓ ──
   Lo que se pidió es que la IA ande SIN que el dueño ponga una llave. Se buscó
   y se midió: de los proveedores con CORS abierto desde `Origin: null`, el
   único que contesta sin llave es Pollinations, y anónimo está limitado por IP
   —medido acá: la misma consulta devuelve 200 una vez y 402 la siguiente—. O
   sea que un launcher que dependa de eso anda a veces. Lo honesto es que el
   launcher se conteste a sí mismo todo lo que puede, y ésta es esa parte.

   ── Y CONTESTA PREGUNTAS, NO SÓLO ÓRDENES ──
   «¿Qué hora es?» no tiene acción: tiene respuesta. Sin esto, la mitad de lo que
   uno le escribe a un asistente cae en «no entendí», que es la forma más rápida
   de que nadie lo vuelva a abrir. */

/* ── UN PEDIDO SE PARTE EN VERBO Y OBJETO ──
   Escrito con un `if` por combinación, «poné el fondo de pasto» y «fondo pasto»
   son dos reglas distintas y la segunda no existe hasta que alguien la escribe.
   Acá el verbo es opcional y lo que decide es el objeto. */
const A_MAS = /\b(agrand\w*|grand\w*|aument\w*|sub[ei]\w*|bigger|larger|increase|maior\w*)\b/;
const A_MEN = /\b(achic\w*|chic\w*|reduc\w*|reduz\w*|baj\w*|smaller|decrease|menor\w*|peque\w*)\b/;

/* ── LAS PREGUNTAS QUE EL LAUNCHER PUEDE CONTESTAR SOLO ──
   Todas salen de datos que ya tiene: el reloj, la batería, la lista de apps. Ni
   red ni permisos nuevos. */
function asisPregunta(t){
  const d = new Date(), tx = TXT[LANG] || TXT.es;
  if (/\b(hora|hour|time|horas)\b/.test(t) && !/\b(reloj|widget)\b/.test(t))
    return T('aQHora', dosD(d.getHours()) + ':' + dosD(d.getMinutes()));
  if (/\b(fecha|dia|date|day|hoje|hoy|today)\b/.test(t))
    return T('aQFecha', tx.dias[d.getDay()] + ' ' + d.getDate() + ' ' + tx.meses[d.getMonth()]);
  if (/\b(bateria|battery|pila|carga)\b/.test(t))
    return T('aQBateria', bateriaAhora().n);
  if (/\b(cuantas|cuantos|how\s+many|quantas)\b/.test(t) && /\b(app|apps|aplicacion\w*)\b/.test(t))
    return T('aQApps', APPS.length);
  if (/\b(luna|moon|lua)\b/.test(t)){
    const SIN = 29.530588853, nv = Date.UTC(2000, 0, 6, 18, 14);
    const f = (((Date.now() - nv)/86400000) % SIN + SIN) % SIN / SIN;
    const nom = ['wLunaNueva', 'wLunaCre', 'wLunaCuartoC', 'wLunaGibC', 'wLunaLlena',
                 'wLunaGibM', 'wLunaCuartoM', 'wLunaMen'];
    return T('aQLuna', T(nom[Math.round(f*8) % 8]),
             Math.round((1 - Math.cos(f*2*Math.PI))/2*100));
  }
  /* sin `\\b` al final: «podés» normaliza a «podes» y el límite de palabra no cae
     después de «pod» */
  if (/(que\s+pod|que\s+sab|what\s+can|\bayuda|\bhelp|\bajuda)/.test(t)) return T('aHola');
  return '';
}

function asisLocal(txt){
  const t = norm(txt), acc = [];
  const num = (t.match(/\b(\d{1,3})\b/) || [])[1];

  /* ── LOS OBJETOS SE BUSCAN POR NOMBRE TRADUCIDO ──
     «poné el fondo de pasto» tiene que andar en los tres idiomas sin tres listas
     de sinónimos: los nombres ya están en la tabla de textos. */
  /* ── Y EN LOS TRES IDIOMAS A LA VEZ, NO EN EL QUE ESTÁ PUESTO ──
     Medido: con el launcher en inglés, «poné el fondo de arrecife» no encontraba
     nada, porque `T('fg_arrecife')` devolvía «Reef». Uno le escribe al asistente
     en SU idioma, tenga el launcher el que tenga. Se prueba contra la clave y
     contra las tres tablas. */
  const porNombre = (claves, pre) => {
    for (const k of claves){
      const cands = [k];
      for (const L in TXT) if (TXT[L][pre + k]) cands.push(TXT[L][pre + k]);
      for (const c of cands){
        const n = norm(c);
        if (n && n.length > 2 && t.indexOf(n) >= 0) return k;
      }
    }
    return null;
  };

  if (/\b(icono|iconos|app|apps|aplicacion|aplicaciones|icon|icons|[ií]cone|[ií]cones)\b/.test(t) &&
      !/\b(fondo|textura|agua|pasto|nube|backdrop|water|grass|cloud)\b/.test(t) &&
      (A_MAS.test(t) || A_MEN.test(t) || num))
    acc.push({ hacer: 'iconos', valor: num && +num >= 40 ? num : (A_MAS.test(t) ? ICO + 12 : ICO - 12) });

  if (/\b(columna|columnas|column|columns|coluna|colunas|fila|filas)\b/.test(t) && num)
    acc.push({ hacer: 'columnas', valor: num });

  /* el fondo de pantalla */
  if (/\b(fondo|wallpaper|papel|pantalla|background)\b/.test(t) &&
      !/\b(icono|iconos|icon|icons|[ií]cone)\b/.test(t)){
    const k = porNombre(['fab'].concat(typeof FONDOS_ORDEN !== 'undefined' ? FONDOS_ORDEN : []),
                        'fg_') ||
              (/\b(fabrica|default|padrao)\b/.test(t) ? 'fab' : null);
    if (k) acc.push({ hacer: 'fondo', valor: k });
  }
  /* la textura de los iconos */
  if (/\b(icono|iconos|icon|icons|[ií]cone|[ií]cones)\b/.test(t) &&
      /\b(fondo|textura|backdrop|agua|pasto|nube|water|grass|cloud|nuvem|grama|agua)\b/.test(t)){
    const k = /\b(agua|water)\b/.test(t) ? 'agua'
            : /\b(pasto|grass|grama|cesped)\b/.test(t) ? 'pasto'
            : /\b(nube|nubes|cloud|clouds|nuvem|nuvens)\b/.test(t) ? 'nube'
            : /\b(no|nada|ninguno|none|off|sin)\b/.test(t) ? 'no' : null;
    if (k) acc.push({ hacer: 'icoFondo', valor: k });
  }
  /* ── LOS WIDGETS PIDEN UN VERBO DE PONER O SACAR ──
     Con el nombre solo era demasiado ancho y se veía midiendo: «¿cuánta batería
     tengo?» y «¿cómo está la luna?» ponían el widget en vez de contestar, porque
     «batería» y «luna» son nombres de widget. Con verbo, una pregunta sigue
     siendo una pregunta. */
  const VERBO_W = /\b(pon[eé]\w*|poner|coloc\w*|agreg\w*|anad\w*|met[eé]\w*|sac[aá]\w*|sacar|quit\w*|saq\w*|add|put|set|remove|show)\b/;
  if (/\b(widget|widgets)\b/.test(t) || VERBO_W.test(t)){
    const k = porNombre(WID_ORDEN, 'w_');
    if (k) acc.push({ hacer: 'widget', valor: k });
  }
  const hayWidget = acc.some(x => x.hacer === 'widget');
  if (/\b(oscurec\w*|oscuro|dim|escurec\w*)\b/.test(t) && num)
    acc.push({ hacer: 'oscuro', valor: num });

  if (/\b(abri|abrir|abre|open|abra|anda|ir)\b/.test(t)){
    const a = asisBuscaApp(txt);
    if (a) acc.push({ hacer: 'abrir', valor: a.p });
  }
  if (!hayWidget && /\b(fij\w*|ancl\w*|pin|fixar|pon[eé]\w*|poner)\b/.test(t) &&
      /\b(inicio|escritorio|home|desktop|tela)\b/.test(t)){
    const a = asisBuscaApp(txt);
    if (a) acc.push({ hacer: 'fijar', valor: a.p });
  }
  /* ── Y SI YA HUBO WIDGET, NO SE BUSCA ADEMÁS UNA APP ──
     «sacá el reloj» daba DOS acciones: sacaba el widget de reloj y además
     desfijaba la app Reloj del escritorio. Una frase, una cosa. */
  if (!hayWidget && /\b(solt\w*|sac[aá]\w*|sacar|quit\w*|unpin|remove|remover|tir\w*)\b/.test(t)){
    const a = asisBuscaApp(txt);
    if (a) acc.push({ hacer: 'soltar', valor: a.p });
  }
  /* con la raíz y no con la palabra: «baile», «duerma» y «bailando» son la misma
     orden, y una lista de conjugaciones no se termina nunca */
  if (/\b(bail\w*|danc\w*|dan[cç]\w*)\b/.test(t)) acc.push({ hacer: 'mascota', valor: 'baila' });
  else if (/\b(duerm\w*|dorm\w*|sleep\w*)\b/.test(t)) acc.push({ hacer: 'mascota', valor: 'duerme' });
  else if (/\b(salud\w*|wave|acen\w*)\b/.test(t)) acc.push({ hacer: 'mascota', valor: 'saluda' });
  else if (/\b(jueg\w*|jug\w*|play|mando|jog\w*)\b/.test(t)) acc.push({ hacer: 'mascota', valor: 'mando' });

  if (/\b(cajon|cajita|drawer|gaveta)\b/.test(t))
    acc.push({ hacer: 'cajon', valor: /\b(cerra\w*|cierra|close|fecha\w*)\b/.test(t) ? 'cerrar' : 'abrir' });

  if (/\b(ingles|english|ingl[eê]s)\b/.test(t)) acc.push({ hacer: 'idioma', valor: 'en' });
  else if (/\b(castellano|espanol|spanish|espanhol)\b/.test(t)) acc.push({ hacer: 'idioma', valor: 'es' });
  else if (/\b(portugues|portuguese)\b/.test(t)) acc.push({ hacer: 'idioma', valor: 'pt' });

  /* ── EL VERBO SE BUSCA EN EL TEXTO NORMALIZADO Y EL TÉRMINO SE SACA DEL CRUDO ──
     `\\w` en JavaScript es `[A-Za-z0-9_]`: no incluye acentos, así que `busc\\w*`
     sobre «buscá recetas» corta en «busc» y el `\\s+` que sigue se topa con la
     «á» y no matchea. Sobre `norm(txt)` la palabra es «busca» y sí. El término
     se recorta del original por posición para no devolverlo sin acentos. */
  const vb = t.match(/\b(?:busc\w*|search|pesquis\w*|googlea\w*)\s+(?:de\s+)?/);
  if (vb && !acc.length){
    const q = txt.slice(vb.index + vb[0].length).replace(/^["“]|["”]$/g, '').trim();
    if (q) acc.push({ hacer: 'buscar', valor: q });
  }

  /* ── UN NOMBRE DE APP SOLO ES «ABRILA» ──
     Es lo que uno escribe cuando no está pensando en darle una orden a nadie. Va
     último para no ganarle a nada: «fijá Spotify» ya se resolvió arriba. */
  if (!acc.length){
    const a = asisBuscaApp(txt);
    if (a && norm(a.n).length > 2) acc.push({ hacer: 'abrir', valor: a.p });
  }

  /* ── LAS PREGUNTAS VAN AL FINAL Y SÓLO SI NO HUBO ACCIÓN ──
     «poné el widget de la hora» tiene la palabra «hora» adentro y no es una
     pregunta por la hora. */
  const q = acc.length ? '' : asisPregunta(t);
  return { modo: 'local', acciones: acc,
           respuesta: acc.length ? '' : (q || T('aNoEntiendo')) };
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
      const lista = typeof d.uno === 'function' ? d.uno() : d.uno;
      v = String(v || '').toLowerCase();
      if (lista.indexOf(v) < 0) continue;
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
    b.textContent = asisNomProv(P) + (P.gratis ? ' · ' + T('aGratis') : '');
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
  $('#asAyuda').textContent = asisLlave() ? T('aConLlave', asisNomProv(P)) : T('aSinLlave');
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
