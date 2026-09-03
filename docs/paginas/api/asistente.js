import { json, preflight, exigirSesion } from "./_comun.js";
export const onRequestOptions = preflight;

const MODELO = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const COLORES = ["magenta","violeta","oro","verde","cian","rojo","naranja","blanco"];

const ESQUEMA = {
  type: "object",
  properties: {
    tipo: { type: "string", enum: ["evento","entrada"],
      description: "'entrada' si el texto habla de vender o anunciar entradas o precios; si no, 'evento'." },
    titulo: { type: "string",
      description: "Nombre corto del evento, sin comillas ni puntuación sobrante. Ej: Halloween 2026." },
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
    falta: { type: "array", items: { type: "string" },
      description: "Nombres de los campos que quedaron vacíos porque el texto no los decía." },
  },
  required: ["tipo","titulo","subtitulo","fecha","cuando","lugar","hora","detalle","precio","color","falta"],
};

export async function onRequestPost({ request, env }) {
  if (!(await exigirSesion(request, env))) return json({ error: "Volvé a iniciar sesión." }, 401);
  if (!env.AI) return json({ error: "La IA no está disponible." }, 503);

  let b; try { b = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const texto = String(b.texto || "").slice(0, 900).trim();
  if (!texto) return json({ error: "Contame qué querés publicar." }, 400);

  const hoy = new Date().toISOString().slice(0, 10);
  const sistema =
    "Extraés datos de avisos de fiestas de IBLO Eventos, una productora de Margarita Belén, Chaco. " +
    "Completás cada campo del esquema con lo que dice el texto. NO INVENTES: si un dato no está, dejá el campo vacío " +
    "y poné su nombre en 'falta'. Hoy es " + hoy + "; si dicen día y mes sin año, usá el próximo que todavía no pasó.";

  let crudo = "";
  try {
    const r = await env.AI.run(MODELO, {
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: "el 6 de junio cowboy night en el club juventud, opening 00:30, entradas 8 mil" },
        { role: "assistant", content: JSON.stringify({
            tipo:"entrada", titulo:"Cowboy Night", subtitulo:"Noche wéstern con toro mecánico",
            fecha:"06.06.26", cuando:"2026-06-06T00:30", lugar:"Club Juventud", hora:"opening 00:30",
            detalle:"Se viene la Cowboy Night en el Club Juventud. Abrimos 00:30 y entrás de bota y sombrero.",
            precio:"$8.000", color:"naranja", falta:[] }) },
        { role: "user", content: texto },
      ],
      max_tokens: 700,
      temperature: 0.2,
      response_format: { type: "json_schema", json_schema: ESQUEMA },
    });
    crudo = typeof r?.response === "string" ? r.response : JSON.stringify(r?.response ?? "");
  } catch (e) {
    return json({ error: "La IA no respondió. Probá de nuevo o cargalo a mano." }, 502);
  }

  const a = crudo.indexOf("{"), z = crudo.lastIndexOf("}");
  let d = null;
  if (a >= 0 && z > a) { try { d = JSON.parse(crudo.slice(a, z + 1)); } catch {} }
  if (!d) return json({ error: "No pude entender eso. Probá contándolo más simple." }, 422);

  // el modelo a veces escribe la palabra "falta" en vez de dejar el campo vacío
  const VACIO = /^(falta|faltante|no especificado|sin datos|n\/?a|ninguno|desconocido|-{1,3})$/i;
  const limpiar = (v, n) => {
    const t = String(v == null ? "" : v).replace(/^["'\s,.:;]+|["'\s,.:;]+$/g, "").slice(0, n);
    return VACIO.test(t) ? "" : t;
  };
  const hablaDePlata = /\bentradas?\b|\bprecintos?\b|\bpreventa\b|\$|\bmil\b|\bvip\b|\bvender\b|\bventa\b/i.test(texto);
  const salida = {
    tipo: hablaDePlata ? "entrada" : "evento",
    titulo: limpiar(d.titulo, 90),
    subtitulo: limpiar(d.subtitulo, 90),
    fecha: limpiar(d.fecha, 30),
    cuando: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(d.cuando || "").trim()) ? String(d.cuando).trim() : "",
    lugar: limpiar(d.lugar, 90),
    hora: limpiar(d.hora, 30),
    detalle: limpiar(d.detalle, 400),
    precio: limpiar(d.precio, 60),
    color: COLORES.indexOf(String(d.color || "").trim()) >= 0 ? String(d.color).trim() : "magenta",
    falta: Array.isArray(d.falta) ? d.falta.slice(0, 8).map((x) => limpiar(x, 30)).filter(Boolean) : [],
  };
  if (!salida.titulo) return json({ error: "No saqué de ahí ni el nombre del evento. Contame un poco más." }, 422);

  // el detalle sale mejor pidiéndolo suelto que dentro del esquema
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
        { role: "user", content: datos + "\nTexto original del dueño: " + texto },
      ],
      max_tokens: 200,
      temperature: 0.55,
    });
    const t2 = String(r2?.response || "").trim().replace(/^["'«»]+|["'«»]+$/g, "").replace(/\s+/g, " ");
    if (t2.length > 20) salida.detalle = t2.slice(0, 400);
  } catch {}

  return json({ propuesta: salida });
}
