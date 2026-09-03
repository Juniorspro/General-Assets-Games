import { json, preflight } from "./_comun.js";
export const onRequestOptions = preflight;
/* dice si ya existe la cuenta del dueño, para saber qué pantalla mostrar */
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM usuarios").first();
  return json({ hayCuenta: (r?.n || 0) > 0, ia: !!env.AI });
}
