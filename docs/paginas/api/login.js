import { json, preflight, derivar, iguales, emitirSesion } from "./_comun.js";
export const onRequestOptions = preflight;
export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.SECRETO) return json({ error: "sin base de datos" }, 503);
  let b; try { b = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const usuario = String(b.usuario || "").trim().toLowerCase();
  const clave = String(b.clave || "");
  const u = await env.DB.prepare("SELECT usuario, hash, sal FROM usuarios WHERE usuario = ?").bind(usuario).first();
  const malo = json({ error: "Usuario o contraseña incorrectos." }, 401);
  if (!u) { await derivar(clave, "sal-falsa-para-tardar-lo-mismo"); return malo; }
  if (!iguales(await derivar(clave, u.sal), u.hash)) return malo;
  return json({ usuario: u.usuario, sesion: await emitirSesion(u.usuario, env.SECRETO) });
}
