const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

export const onRequestOptions = () => new Response(null, { headers: CORS });

export async function onRequestPost({ request, env }) {
  let cuerpo;
  try { cuerpo = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const texto = String(cuerpo.texto || "").slice(0, 900).trim();
  if (!texto) return json({ error: "falta el texto" }, 400);
  if (!env.AI) return json({ error: "sin IA disponible" }, 503);

  const sistema =
    "Sos el community manager de IBLO Eventos, una productora de fiestas de Margarita Belén, Chaco. " +
    "Reescribís avisos de venta de entradas en español rioplatense (voseo), con energía pero sin exagerar. " +
    "Reglas estrictas: no inventes datos que no estén en el texto (ni fechas, ni lugares, ni precios, ni nombres). " +
    "Máximo 40 palabras, dos o tres frases. Sin hashtags, sin emojis, sin comillas. " +
    "Devolvé únicamente el texto final, nada más.";

  try {
    const r = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: texto },
      ],
      max_tokens: 180,
      temperature: 0.6,
    });
    let salida = String(r?.response || "").trim()
      .replace(/^["'«»]+|["'«»]+$/g, "")
      .replace(/\s+/g, " ");
    if (!salida) return json({ error: "sin respuesta" }, 502);
    return json({ texto: salida });
  } catch (e) {
    return json({ error: "falló la IA", detalle: String(e).slice(0, 200) }, 502);
  }
}
