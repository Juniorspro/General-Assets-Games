/* ══════════════════════ EL JUEZ DE VERDAD ══════════════════════
   El pedido era «una IA de verdad que vea tu trabajo y te dé una puntuación», y
   eso es literal: se fotografia la obra desde tres angulos, se mandan las tres
   fotos a la API de Claude y vuelve un puntaje con lo que vio.

   ── LA LLAVE ES DEL JUGADOR Y NO SALE DE SU TELEFONO ──
   Este juego es UN ARCHIVO que se abre en un navegador: no hay servidor donde
   esconder una llave, y meter una en el HTML seria repartirla. Asi que la pone
   el jugador, se guarda solo en `localStorage` de su aparato, y lo unico que se
   manda a `api.anthropic.com` son las tres fotos y el tema. Sin llave el juego
   se juega igual: puntua el juez de la casa, y la pantalla del final dice
   siempre CUAL de los dos puntuo.

   ── Y SE LLAMA POR `fetch` A MANO Y NO CON EL SDK ──
   El SDK oficial es un paquete de npm: acá no hay bundler ni node_modules, y
   bajarlo de un CDN convertiria «un archivo que anda» en «un archivo que anda
   si el CDN contesta». Lo unico que el SDK agrega sobre esta llamada es el
   encabezado de abajo, que esta copiado de su propio codigo. */
const API = 'https://api.anthropic.com/v1/messages';
const MODELOS = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'];
let LLAVE = '', MODELO = MODELOS[0];

function cargaLlave(){
  try { LLAVE = localStorage.getItem('cubos_llave') || ''; MODELO = localStorage.getItem('cubos_modelo') || MODELOS[0]; }
  catch (e) { LLAVE = ''; }
  if (MODELOS.indexOf(MODELO) < 0) MODELO = MODELOS[0];
}
function guardaLlave(k){
  LLAVE = (k || '').trim();
  try { if (LLAVE) localStorage.setItem('cubos_llave', LLAVE); else localStorage.removeItem('cubos_llave'); } catch (e) {}
  return !!LLAVE;
}
function ponModelo(m){ if (MODELOS.indexOf(m) >= 0){ MODELO = m; try { localStorage.setItem('cubos_modelo', m); } catch (e) {} } return MODELO; }
function hayLlave(){ return !!LLAVE; }

/* ══════════ LAS FOTOS ══════════
   Tres angulos y no uno: de frente, una obra hueca se lee a pared, y desde
   arriba una torre se lee a punto. Tres cuartos de un lado, tres cuartos del
   otro y planta es lo que un jurado humano miraria.

   ── SE LEEN DEL DESTINO DE RENDER Y NO DEL LIENZO ──
   `canvas.toDataURL` sobre un contexto WebGL sin `preserveDrawingBuffer`
   devuelve negro apenas el navegador da vuelta el buffer, y activarlo cuesta
   una copia en CADA cuadro para sacar tres fotos por ronda. */
const VISTAS = [[0.78, 0.42], [3.92, 0.42], [0.78, 1.30]];
let rtFoto = null, cvFoto = null;
function fotoObra(lado, calidad){
  const L = lado || 448;
  if (!rtFoto){ rtFoto = new T.WebGLRenderTarget(L, L, { minFilter: T.LinearFilter, magFilter: T.LinearFilter }); }
  else if (rtFoto.width !== L) rtFoto.setSize(L, L);
  if (!cvFoto){ cvFoto = document.createElement('canvas'); }
  cvFoto.width = cvFoto.height = L;
  const ctx = cvFoto.getContext('2d');
  const c2 = new T.PerspectiveCamera(46, 1, 0.1, 400);
  const centro = new T.Vector3(N/2, Math.min(9, Math.max(4, altoObra()*0.55)), N/2);
  const guardaMira = gMira.visible, guardaFan = gFantasma.visible, guardaMarco = gMarco.visible;
  gMira.visible = false; gFantasma.visible = false; gMarco.visible = false;
  const fotos = [];
  const px = new Uint8Array(L*L*4);
  for (const [ang, alt] of VISTAS){
    const d = 26;
    c2.position.set(centro.x + Math.sin(ang)*d*Math.cos(alt), centro.y + Math.sin(alt)*d,
                    centro.z + Math.cos(ang)*d*Math.cos(alt));
    c2.lookAt(centro); c2.updateMatrixWorld(true);
    render.setRenderTarget(rtFoto); render.clear(); render.render(escena, c2);
    render.readRenderTargetPixels(rtFoto, 0, 0, L, L, px);
    /* `readRenderTargetPixels` devuelve las filas de abajo hacia arriba */
    const im = ctx.createImageData(L, L);
    for (let y = 0; y < L; y++){
      const s = (L - 1 - y)*L*4, d2 = y*L*4;
      im.data.set(px.subarray(s, s + L*4), d2);
    }
    ctx.putImageData(im, 0, 0);
    fotos.push(cvFoto.toDataURL('image/jpeg', calidad || 0.72).split(',')[1]);
  }
  render.setRenderTarget(null);
  gMira.visible = guardaMira; gFantasma.visible = guardaFan; gMarco.visible = guardaMarco;
  return fotos;
}
function altoObra(){
  for (let y = ALTO - 1; y >= 0; y--) for (let k = 0; k < N*N; k++)
    if (REJA[y*N*N + k]) return y + 1;
  return 1;
}

/* ══════════ LA PREGUNTA ══════════ */
const ESQUEMA = {
  type: 'object',
  properties: {
    puntaje: { type: 'integer', minimum: 0, maximum: 100 },
    titulo:  { type: 'string', description: 'Qué te parece que es, en 4 palabras o menos' },
    bueno:   { type: 'string', description: 'Una frase corta con lo mejor que tiene' },
    mejorar: { type: 'string', description: 'Una frase corta con lo que le falta' }
  },
  required: ['puntaje', 'titulo', 'bueno', 'mejorar'],
  additionalProperties: false
};
const IDIOMA_JUEZ = { es: 'castellano rioplatense', en: 'English', pt: 'português' };

async function juzgaIA(tema, lang){
  const fotos = fotoObra();
  const texto = [
    'Sos el jurado de un build battle estilo Minecraft. El jugador tuvo unos minutos y una',
    'parcela de 16 x 16 x 16 bloques, y el tema que le tocó fue: «' + tema + '».',
    '',
    'Te paso tres fotos de lo que construyó: tres cuartos de un lado, tres cuartos del otro,',
    'y una vista desde arriba. Es siempre la misma obra.',
    '',
    'Puntuá de 0 a 100 mirando tres cosas: cuánto se parece al tema, cuánto trabajo tiene',
    'encima (forma, detalle, uso del color) y si se lee bien de lejos. Sé honesto: una torre',
    'de cubos apilados no es un 80. Pero acordate de que son bloques de un metro y de que tuvo',
    'poquitos minutos, así que no le pidas realismo.',
    '',
    'Contestá en ' + (IDIOMA_JUEZ[lang] || IDIOMA_JUEZ.es) + ', corto, sin adornos.'
  ].join('\n');
  const cuerpo = {
    model: MODELO,
    max_tokens: 8000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
    messages: [{ role: 'user', content:
      fotos.map(d => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } }))
        .concat([{ type: 'text', text: texto }]) }]
  };
  const ab = new AbortController();
  const reloj = setTimeout(() => ab.abort(), 60000);
  let r;
  try {
    r = await fetch(API, { method: 'POST', signal: ab.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': LLAVE,
        'anthropic-version': '2023-06-01',
        /* el encabezado que el propio SDK manda cuando se le pide
           `dangerouslyAllowBrowser`: sin el, la API no contesta a un navegador */
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(cuerpo) });
  } catch (e){
    clearTimeout(reloj);
    throw new Error(e.name === 'AbortError' ? 'tardó demasiado' : 'no se pudo conectar');
  }
  clearTimeout(reloj);
  if (!r.ok){
    let det = '';
    try { const j = await r.json(); det = (j.error && j.error.message) || ''; } catch (e) {}
    if (r.status === 401) throw new Error('la llave no sirve (401)');
    if (r.status === 429) throw new Error('demasiadas preguntas seguidas (429)');
    throw new Error('la API contestó ' + r.status + (det ? ': ' + det.slice(0, 120) : ''));
  }
  const j = await r.json();
  if (j.stop_reason === 'refusal') throw new Error('el modelo no quiso contestar');
  const bloque = (j.content || []).find(b => b.type === 'text');
  if (!bloque) throw new Error('vino sin texto');
  let d;
  try { d = JSON.parse(bloque.text); } catch (e){ throw new Error('no se entendió la respuesta'); }
  return { puntaje: cl(Math.round(d.puntaje), 0, 100), titulo: d.titulo || '',
           bueno: d.bueno || '', mejorar: d.mejorar || '', juez: 'ia', modelo: j.model || MODELO,
           uso: j.usage || null };
}

/* ══════════ EL QUE DECIDE ══════════
   Con llave pregunta; sin llave —o si la pregunta falla— puntua el de la casa,
   y en los dos casos devuelve QUIEN puntuo. Un juego que se queda colgado
   porque no hay internet no es un juego. */
async function juzga(tema, lang){
  const m = mideObra();
  if (m.vacio) return { puntaje: 0, titulo: '', bueno: '', mejorar: '', juez: 'local', vacio: true, medida: m };
  if (!hayLlave()) return { ...juezCasa(m), medida: m };
  try {
    const r = await juzgaIA(tema, lang);
    return { ...r, medida: m };
  } catch (e){
    return { ...juezCasa(m), medida: m, fallo: e.message || 'error' };
  }
}
/* el juez de la casa arma su frase con lo que MIDIO, que es lo unico que sabe:
   decir «se parece poco al tema» seria mentir, porque no puede saberlo */
function juezCasa(m){
  const p = m.partes;
  const flojo = Object.keys(p).sort((a, b) => p[a] - p[b])[0];
  const fuerte = Object.keys(p).sort((a, b) => p[b] - p[a])[0];
  return { puntaje: m.puntaje, titulo: '', juez: 'local', clave: { flojo, fuerte },
           bueno: '', mejorar: '' };
}
