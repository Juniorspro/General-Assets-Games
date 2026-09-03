import { leerFecha, casoNormal } from "./_pub.js";

/* ---------------------------------------------------------------------------
   Lo que convierte texto suelto (y el flyer, si hay) en una publicación.
   Lo usan las dos rutas que piensan: /api/asistente, cuando el dueño le cuenta
   algo, y /api/sugerir, cuando el botón «Nuevo» lee los posteos de Instagram.
   Está acá y no repetido en cada una porque cada arreglo de calidad tiene que
   valer para las dos.
   --------------------------------------------------------------------------- */

/* Texto suelto. Es el que mejor le pone nombre a la fiesta. */
const MODELO = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
/* Multimodal, sólo para leer el flyer. Es el que no pide aceptar licencia. */
const MODELO_OJO = "@cf/meta/llama-4-scout-17b-16e-instruct";

export const COLORES = ["magenta","violeta","oro","verde","cian","rojo","naranja","blanco"];

const ESQUEMA = {
  type: "object",
  properties: {
    titulo: { type: "string",
      description: "Nombre corto de la fiesta, dos a seis palabras, sin emojis ni hashtags ni arrobas ni " +
        "comillas. Ej: Halloween 2026, Cowboy Night, Fiesta Zonal de la Primavera. OJO: «IBLO», «IbLo» e " +
        "«IBLO Eventos» son la productora que organiza, NUNCA el nombre de la fiesta. Nunca copies el texto " +
        "entero acá." },
    subtitulo: { type: "string",
      description: "Bajada de cuatro a ocho palabras. Vacío si no hay con qué armarla." },
    fecha: { type: "string",
      description: "La fecha del evento en formato DD.MM.AA, por ejemplo 25.10.26. Vacío si el texto no dice fecha." },
    cuando: { type: "string",
      description: "La misma fecha y hora en formato AAAA-MM-DDTHH:MM de 24 horas, por ejemplo 2026-10-25T00:00. Si no dijeron hora usá 22:00. Vacío si no hay fecha." },
    lugar: { type: "string",
      description: "Dónde es, tal como lo nombraron. Ej: Club Juventud. Vacío si no lo dicen." },
    hora: { type: "string",
      description: "La hora tal como la dijeron, por ejemplo '00:00 hs' o 'open 00:30'. Vacío si no la dicen." },
    detalle: { type: "string",
      description: "Dos o tres frases en español rioplatense con voseo, con energía pero sin exagerar, usando SOLO datos del texto. Sin emojis, sin hashtags, sin comillas." },
    precio: { type: "string",
      description: "El precio tal como lo dijeron, con signo $ y separador de miles. Ej: $10.000 general. Vacío si no hablan de plata." },
    color: { type: "string", enum: COLORES,
      description: "El que pegue con la temática: Halloween rojo, primavera o realeza oro, cowboy o wéstern naranja, invierno o hielo cian, glitter o euphoria violeta. Si no hay pista, magenta." },
  },
  required: ["titulo","subtitulo","fecha","cuando","lugar","hora","detalle","precio","color"],
};

/* El modelo a veces escribe la palabra «falta» en vez de dejar el campo vacío. */
const VACIO = /^(falta|faltante|no especificado|sin datos|n\/?a|ninguno|desconocido|-{1,3})$/i;
const limpiar = (v, n) => {
  const t = String(v == null ? "" : v).replace(/^["'\s,.:;]+|["'\s,.:;]+$/g, "").slice(0, n);
  return VACIO.test(t) ? "" : t;
};
/* los pies de foto de Instagram vienen cargados de emojis, hashtags y arrobas */
export const sinAdornos = (t) =>
  String(t || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, " ")
    .replace(/#[\wÀ-ſ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* Un título de más de ocho palabras es el texto entero copiado, no un nombre. */
function tituloSano(t) {
  const limpio = limpiar(t, 90).replace(/@\S+/g, "").replace(/\s+/g, " ").trim();
  if (!limpio) return "";
  if (limpio.split(" ").length > 8) return "";
  if (/^ib\s*lo( eventos)?$/i.test(limpio)) return "";   // es la productora, no la fiesta
  return casoNormal(limpio);
}

/* Mira el flyer y devuelve lo que dice, en texto plano. No decide nada. */
async function leerFlyer(env, imagen) {
  const r = await env.AI.run(MODELO_OJO, {
    messages: [{ role: "user", content: [
      { type: "text", text:
        "Es el flyer de una fiesta. Transcribí en castellano TODO el texto que se lee: nombre de la " +
        "fiesta, fecha, hora, lugar, precios, quién toca. Después, en una línea aparte que empiece con " +
        "«Onda:», describí en pocas palabras la estética (colores, temática). No inventes nada que no se lea." },
      { type: "image_url", image_url: { url: imagen } },
    ] }],
    max_tokens: 400,
    temperature: 0.1,
  });
  const t = r?.response ?? r?.choices?.[0]?.message?.content ?? "";
  return String(t).trim().slice(0, 1200);
}

/* Escribe el texto del aviso. Suelto, no dentro del esquema: en modo json_schema
   el modelo contesta de dos palabras. */
async function escribirDetalle(env, p, fuente) {
  const datos = [
    "Evento: " + p.titulo,
    p.subtitulo ? "De qué va: " + p.subtitulo : "",
    p.fecha  ? "Fecha: " + p.fecha : "",
    p.lugar  ? "Lugar: " + p.lugar : "",
    p.hora   ? "Hora: " + p.hora : "",
    p.precio ? "Entradas: " + p.precio : "",
  ].filter(Boolean).join(". ");
  const r = await env.AI.run(MODELO, {
    messages: [
      { role: "system", content:
        "Escribís el texto de un aviso para IBLO Eventos, productora de fiestas de Margarita Belén, Chaco. " +
        "Español rioplatense con voseo, con energía pero sin exagerar. Dos o tres frases, máximo 45 palabras. " +
        "Usá SOLO los datos que te doy, no agregues ninguno. Sin emojis, sin hashtags, sin arrobas, " +
        "sin comillas. Devolvé únicamente el texto." },
      { role: "user", content: datos + "\n" + fuente },
    ],
    max_tokens: 200,
    temperature: 0.55,
  });
  const t = String(r?.response || "").trim()
    .replace(/^["'«»]+|["'«»]+$/g, "").replace(/@\S+/g, "").replace(/\s+/g, " ");
  return t.length > 20 ? t.slice(0, 400) : "";
}

/* El corazón. Devuelve { propuesta, cuandoMs, leyoFlyer } o { error, codigo }. */
export async function proponer(env, texto, imagen) {
  texto = sinAdornos(texto).slice(0, 900);
  if (!texto && !imagen) return { error: "Contame qué querés publicar.", codigo: 400 };

  let delFlyer = "";
  if (imagen) { try { delFlyer = await leerFlyer(env, imagen); } catch {} }

  const fuente = [
    texto ? "Lo que escribió el dueño: " + texto : "",
    delFlyer ? "Lo que dice el flyer que mandó: " + delFlyer : "",
  ].filter(Boolean).join("\n");
  if (!fuente) return { error: "No pude leer ni el texto ni la imagen. Escribime qué querés publicar.", codigo: 422 };

  const hoy = new Date().toISOString().slice(0, 10);
  const sistema =
    "Extraés datos de avisos de fiestas de IBLO Eventos, una productora de Margarita Belén, Chaco. " +
    "Completás cada campo del esquema con lo que dice el texto. NO INVENTES: si un dato no está, dejá el campo vacío. " +
    "Hoy es " + hoy + "; si dicen día y mes sin año, usá el próximo que todavía no pasó. " +
    "Si además te paso lo que dice un flyer y no coincide con lo que escribió el dueño, MANDA LO QUE ESCRIBIÓ EL DUEÑO: " +
    "el flyer sólo sirve para completar lo que él no dijo.";

  async function extraer(fuenteTexto) {
    const r = await env.AI.run(MODELO, {
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: "el 6 de junio cowboy night en el club juventud, opening 00:30, entradas 8 mil" },
        { role: "assistant", content: JSON.stringify({
            titulo:"Cowboy Night", subtitulo:"Noche wéstern con toro mecánico",
            fecha:"06.06.26", cuando:"2026-06-06T00:30", lugar:"Club Juventud", hora:"opening 00:30",
            detalle:"Se viene la Cowboy Night en el Club Juventud. Abrimos 00:30 y entrás de bota y sombrero.",
            precio:"$8.000", color:"naranja" }) },
        { role: "user", content: fuenteTexto },
      ],
      max_tokens: 700,
      temperature: 0.2,
      response_format: { type: "json_schema", json_schema: ESQUEMA },
    });
    const crudo = typeof r?.response === "string" ? r.response : JSON.stringify(r?.response ?? "");
    const a = crudo.indexOf("{"), z = crudo.lastIndexOf("}");
    if (a < 0 || z <= a) return null;
    try { return JSON.parse(crudo.slice(a, z + 1)); } catch { return null; }
  }

  let d = null;
  try {
    d = await extraer(fuente);
    /* Si el flyer contradice al dueño el modelo a veces se planta y devuelve el
       título vacío. En ese caso probamos otra vez con lo que él escribió, nada más. */
    if ((!d || !tituloSano(d.titulo)) && texto && delFlyer) {
      d = await extraer("Lo que escribió el dueño: " + texto);
    }
  } catch {
    return { error: "La IA no respondió. Probá de nuevo o cargalo a mano.", codigo: 502 };
  }
  if (!d) return { error: "No pude entender eso. Probá contándolo más simple.", codigo: 422 };

  const p = {
    titulo: tituloSano(d.titulo),
    subtitulo: casoNormal(limpiar(d.subtitulo, 90)),
    fecha: "",
    cuando: "",
    lugar: casoNormal(limpiar(d.lugar, 90)),
    hora: limpiar(d.hora, 30),
    detalle: limpiar(d.detalle, 400),
    precio: limpiar(d.precio, 60),
    color: COLORES.indexOf(String(d.color || "").trim()) >= 0 ? String(d.color).trim() : "magenta",
  };

  /* La fecha la entendemos nosotros: el modelo la escribe en cualquier formato. */
  const fech = leerFecha(d.cuando, p.hora) || leerFecha(d.fecha, p.hora);
  if (fech) {
    p.fecha = fech.texto;
    p.cuando = new Date(fech.ms - 3 * 3600e3).toISOString().slice(0, 16);
    if (!p.hora) p.hora = fech.hora;
  }

  /* «22:00» solo queda seco en la web; «22:00 hs» es como se dice */
  if (/^\d{1,2}[:.]\d{2}$/.test(p.hora)) p.hora = p.hora.replace(".", ":") + " hs";

  if (!p.titulo) {
    return { error: imagen
      ? "De esa foto no saqué el nombre de la fiesta. Escribime abajo cómo se llama y de qué va."
      : "No saqué de ahí ni el nombre del evento. Contame un poco más.", codigo: 422 };
  }

  /* El tipo lo decide el código, no el modelo: en el esquema se equivocaba siempre.
     Igual pesa poco: en la web las solapas miran el contenido, así que una fiesta
     con entradas a la venta aparece en «Próximamente» y en «Entradas» a la vez. */
  p.tipo = fech ? "proximamente" : p.precio ? "entrada" : "aviso";

  try {
    const t = await escribirDetalle(env, p, fuente);
    if (t) p.detalle = t;
  } catch {}

  /* Lo que falta lo sacamos de la salida, no de lo que diga el modelo:
     listaba campos que sí había completado. */
  const NOMBRES = { fecha:"la fecha", lugar:"el lugar", hora:"la hora", precio:"el precio",
                    subtitulo:"una bajada", detalle:"el texto" };
  p.falta = Object.keys(NOMBRES).filter((k) => !p[k]).map((k) => NOMBRES[k]);

  return { propuesta: p, cuandoMs: fech ? fech.ms : 0, leyoFlyer: !!delFlyer };
}
