import { json, preflight, exigirSesion } from "./_comun.js";
import { limpiarPublicacion, guardar } from "./_pub.js";
export const onRequestOptions = preflight;

/* Texto suelto. */
const MODELO = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
/* Multimodal, para cuando el dueño manda el flyer. Es el que no pide aceptar licencia. */
const MODELO_OJO = "@cf/meta/llama-4-scout-17b-16e-instruct";

const COLORES = ["magenta","violeta","oro","verde","cian","rojo","naranja","blanco"];

const ESQUEMA = {
  type: "object",
  properties: {
    titulo: { type: "string",
      description: "Nombre corto del evento, sin comillas ni puntuación sobrante. Ej: Halloween 2026." },
    subtitulo: { type: "string",
      description: "Bajada de cuatro a ocho palabras. Vacío si no hay con qué armarla." },
    fecha: { type: "string",
      description: "La fecha del evento en formato DD.MM.AA, por ejemplo 25.10.26. Vacío si no dice fecha." },
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
    falta: { type: "array", items: { type: "string" },
      description: "Nombres de los campos que quedaron vacíos porque el texto no los decía." },
  },
  required: ["titulo","subtitulo","fecha","cuando","lugar","hora","detalle","precio","color","falta"],
};

/* El modelo a veces escribe la palabra «falta» en vez de dejar el campo vacío. */
const VACIO = /^(falta|faltante|no especificado|sin datos|n\/?a|ninguno|desconocido|-{1,3})$/i;
/* Los flyers vienen todos en mayúscula y el título quedaba GRITANDO.
   Sólo la baja si TODO el texto está en mayúscula; si el dueño escribió
   «Halloween IBLO» respetamos su mezcla. */
const CHICAS = new Set(["de","del","la","las","el","los","y","en","a","con","por","para","un","una"]);
/* siglas que se escriben en mayúscula aunque el resto baje */
const SIGLAS = new Set(["iblo","dj","djs","vip","mc","rrpp","led","after","bs","as"]);
function casoNormal(t) {
  if (!t) return t;
  const puroAlto = t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(t);
  const puroBajo = t === t.toLowerCase() && /[a-záéíóúñ]{3}/.test(t);
  if (!puroAlto && !puroBajo) return t;
  return t.toLowerCase().split(/(\s+|[-/])/).map((p, i) => {
    if (!/[a-záéíóúñ]/.test(p)) return p;
    if (SIGLAS.has(p)) return p.toUpperCase();
    if (i > 0 && CHICAS.has(p)) return p;
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join("");
}

const limpiar = (v, n) => {
  const t = String(v == null ? "" : v).replace(/^["'\s,.:;]+|["'\s,.:;]+$/g, "").slice(0, n);
  return VACIO.test(t) ? "" : t;
};

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

export async function onRequestPost({ request, env }) {
  const usuario = await exigirSesion(request, env);
  if (!usuario) return json({ error: "Volvé a iniciar sesión." }, 401);
  if (!env.AI) return json({ error: "La IA no está disponible." }, 503);

  let b; try { b = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const texto = String(b.texto || "").slice(0, 900).trim();
  const imagen = String(b.imagen || "");
  const publicar = b.publicar === true;

  if (imagen && !/^data:image\/(webp|jpeg|png);base64,/.test(imagen))
    return json({ error: "Esa imagen no la puedo leer. Mandá una foto o captura común." }, 400);
  if (imagen.length > 900000)
    return json({ error: "La imagen pesa demasiado. Sacale una captura más chica." }, 413);
  if (!texto && !imagen) return json({ error: "Contame qué querés publicar." }, 400);

  /* Si vino flyer, primero lo leemos y lo sumamos a lo que escribió el dueño. */
  let delFlyer = "";
  if (imagen) {
    try { delFlyer = await leerFlyer(env, imagen); } catch {}
  }
  const fuente = [
    texto ? "Lo que escribió el dueño: " + texto : "",
    delFlyer ? "Lo que dice el flyer que mandó: " + delFlyer : "",
  ].filter(Boolean).join("\n");
  if (!fuente) return json({ error: "No pude leer ni el texto ni la imagen. Escribime qué querés publicar." }, 422);

  const hoy = new Date().toISOString().slice(0, 10);
  const sistema =
    "Extraés datos de avisos de fiestas de IBLO Eventos, una productora de Margarita Belén, Chaco. " +
    "Completás cada campo del esquema con lo que dice el texto. NO INVENTES: si un dato no está, dejá el campo vacío " +
    "y poné su nombre en 'falta'. Hoy es " + hoy + "; si dicen día y mes sin año, usá el próximo que todavía no pasó. " +
    "Si además te paso lo que dice un flyer y no coincide con lo que escribió el dueño, MANDA LO QUE ESCRIBIÓ EL DUEÑO: " +
    "el flyer sólo sirve para completar lo que él no dijo. Nunca dejes 'titulo' vacío si alguna de las dos fuentes " +
    "nombra la fiesta.";

  async function extraer(fuenteTexto) {
    const r = await env.AI.run(MODELO, {
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: "el 6 de junio cowboy night en el club juventud, opening 00:30, entradas 8 mil" },
        { role: "assistant", content: JSON.stringify({
            titulo:"Cowboy Night", subtitulo:"Noche wéstern con toro mecánico",
            fecha:"06.06.26", cuando:"2026-06-06T00:30", lugar:"Club Juventud", hora:"opening 00:30",
            detalle:"Se viene la Cowboy Night en el Club Juventud. Abrimos 00:30 y entrás de bota y sombrero.",
            precio:"$8.000", color:"naranja", falta:[] }) },
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
    if ((!d || !d.titulo) && texto && delFlyer) d = await extraer("Lo que escribió el dueño: " + texto);
  } catch (e) {
    return json({ error: "La IA no respondió. Probá de nuevo o cargalo a mano." }, 502);
  }
  if (!d) return json({ error: "No pude entender eso. Probá contándolo más simple." }, 422);

  const salida = {
    titulo: casoNormal(limpiar(d.titulo, 90)),
    subtitulo: casoNormal(limpiar(d.subtitulo, 90)),
    fecha: limpiar(d.fecha, 30),
    cuando: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(d.cuando || "").trim()) ? String(d.cuando).trim() : "",
    lugar: casoNormal(limpiar(d.lugar, 90)),
    hora: limpiar(d.hora, 30),
    detalle: limpiar(d.detalle, 400),
    precio: limpiar(d.precio, 60),
    color: COLORES.indexOf(String(d.color || "").trim()) >= 0 ? String(d.color).trim() : "magenta",
  };
  if (!salida.titulo)
    return json({ error: imagen
      ? "De esa foto no saqué el nombre de la fiesta. Escribime abajo cómo se llama y de qué va."
      : "No saqué de ahí ni el nombre del evento. Contame un poco más." }, 422);

  /* El tipo lo decide el código, no el modelo: en el esquema se equivocaba siempre.
     Igual pesa poco: en la web las solapas miran el contenido, así que una fiesta
     con entradas a la venta aparece en «Próximamente» y en «Entradas» a la vez. */
  salida.tipo = salida.cuando ? "proximamente" : salida.precio ? "entrada" : "aviso";

  /* El detalle sale mejor pidiéndolo suelto que dentro del esquema. */
  try {
    const datos = [
      "Evento: " + salida.titulo,
      salida.fecha  ? "Fecha: " + salida.fecha : "",
      salida.lugar  ? "Lugar: " + salida.lugar : "",
      salida.hora   ? "Hora: " + salida.hora : "",
      salida.precio ? "Entradas: " + salida.precio : "",
    ].filter(Boolean).join(". ");
    const r2 = await env.AI.run(MODELO, {
      messages: [
        { role: "system", content:
          "Escribís el texto de un aviso para IBLO Eventos, productora de fiestas de Margarita Belén, Chaco. " +
          "Español rioplatense con voseo, con energía pero sin exagerar. Dos o tres frases, máximo 45 palabras. " +
          "Usá SOLO los datos que te doy, no agregues ninguno. Sin emojis, sin hashtags, sin comillas. " +
          "Devolvé únicamente el texto." },
        { role: "user", content: datos + "\n" + fuente },
      ],
      max_tokens: 200,
      temperature: 0.55,
    });
    const t2 = String(r2?.response || "").trim().replace(/^["'«»]+|["'«»]+$/g, "").replace(/\s+/g, " ");
    if (t2.length > 20) salida.detalle = t2.slice(0, 400);
  } catch {}

  /* Lo que falta lo sacamos de la salida, no de lo que diga el modelo:
     listaba campos que sí había completado. */
  const NOMBRES = { fecha:"la fecha", lugar:"el lugar", hora:"la hora", precio:"el precio",
                    subtitulo:"una bajada", detalle:"el texto" };
  salida.falta = Object.keys(NOMBRES).filter((k) => !salida[k]).map((k) => NOMBRES[k]);

  /* Modo «publicá vos»: la IA lo sube sola y devuelve lo que quedó publicado. */
  if (publicar) {
    if (!env.DB) return json({ error: "sin base de datos" }, 503);
    const cuandoMs = salida.cuando ? Date.parse(salida.cuando + ":00") : 0;
    const { error, fila } = limpiarPublicacion({
      ...salida,
      imagen,
      cuando: Number.isFinite(cuandoMs) ? cuandoMs : 0,
      destacado: false,   // la portada la gana sola la fiesta más cercana
    });
    if (error) return json({ error, propuesta: salida }, 400);
    const id = await guardar(env, fila, usuario);
    return json({ publicada: { id, ...fila }, propuesta: salida, leyoFlyer: !!delFlyer });
  }

  return json({ propuesta: salida, leyoFlyer: !!delFlyer });
}
