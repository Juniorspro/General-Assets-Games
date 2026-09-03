import { json, preflight } from "./_comun.js";
import { CADA, sincronizar } from "./_ig.js";
export const onRequestOptions = preflight;

export async function onRequestGet({ env, request }) {
  if (!env.DB) return json({ posts: [] });
  const forzar = new URL(request.url).searchParams.get("ahora") === "1";
  const est = await env.DB.prepare("SELECT ultima FROM estado_ig WHERE id = 1").first();
  const vencido = !est || Date.now() - est.ultima > CADA;

  let aviso = null;
  if (vencido || forzar) {
    try { aviso = await sincronizar(env); }
    catch (e) { aviso = { error: String(e).slice(0, 120) }; }
  }
  const r = await env.DB.prepare(
    "SELECT codigo, texto, imagen, tipo, publicado FROM ig ORDER BY publicado DESC LIMIT 40"
  ).all();
  return new Response(JSON.stringify({ posts: r.results || [], sync: aviso }), {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8",
               "Cache-Control": "public, max-age=120" },
  });
}
