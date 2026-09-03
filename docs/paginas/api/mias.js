import { json, preflight, exigirSesion } from "./_comun.js";
export const onRequestOptions = preflight;
/* lo que ve el dueño en la app: incluye las dadas de baja */
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  const usuario = await exigirSesion(request, env);
  if (!usuario) return json({ error: "Volvé a iniciar sesión." }, 401);
  const r = await env.DB.prepare(
    "SELECT id, titulo, descripcion, precio, imagen, estado, creado FROM entradas ORDER BY creado DESC LIMIT 60"
  ).all();
  return json({ usuario, entradas: r.results || [] });
}
