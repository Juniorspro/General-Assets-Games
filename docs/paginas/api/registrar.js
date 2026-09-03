import { json, preflight, derivar, nuevaSal, emitirSesion } from "./_comun.js";
export const onRequestOptions = preflight;
/* sólo funciona la primera vez: crea la cuenta del dueño y cierra la puerta */
export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.SECRETO) return json({ error: "sin base de datos" }, 503);
  const ya = await env.DB.prepare("SELECT COUNT(*) AS n FROM usuarios").first();
  if ((ya?.n || 0) > 0) return json({ error: "La cuenta ya está creada." }, 409);

  let b; try { b = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const usuario = String(b.usuario || "").trim().toLowerCase();
  const clave = String(b.clave || "");
  if (!/^[a-z0-9._-]{3,32}$/.test(usuario)) return json({ error: "El usuario va sin espacios, de 3 a 32 letras o números." }, 400);
  if (clave.length < 8) return json({ error: "La contraseña necesita al menos 8 caracteres." }, 400);

  const sal = nuevaSal();
  const hash = await derivar(clave, sal);
  await env.DB.prepare("INSERT INTO usuarios (usuario, hash, sal, creado) VALUES (?,?,?,?)")
    .bind(usuario, hash, sal, Date.now()).run();
  return json({ usuario, sesion: await emitirSesion(usuario, env.SECRETO) });
}
