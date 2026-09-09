/* Los avisos de quien esta mirando. */
import { quienEs, json } from "./_social.js";

export const onRequestGet = async ({ request, env }) => {
  if (!env.DB) return json({ avisos: [] });
  const yo = await quienEs(env, request);
  if (!yo) return json({ avisos: [] });
  const { results } = await env.DB.prepare(
    "SELECT id, texto, tipo, leido, creado FROM avisos WHERE usuario = ? " +
    "ORDER BY creado DESC LIMIT 20").bind(yo.u).all();
  return json({ avisos: results, sinLeer: results.filter((a) => !a.leido).length });
};

export const onRequestPost = async ({ request, env }) => {
  if (!env.DB) return json({ ok: true });
  const yo = await quienEs(env, request);
  if (!yo) return json({ error: "sin sesión" }, 401);
  await env.DB.prepare("UPDATE avisos SET leido = 1 WHERE usuario = ?").bind(yo.u).run();
  return json({ ok: true });
};
