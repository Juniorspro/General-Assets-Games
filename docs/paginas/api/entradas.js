import { json, preflight, exigirSesion } from "./_comun.js";
export const onRequestOptions = preflight;

/* lo que ve la web: las entradas publicadas */
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ entradas: [] });
  const r = await env.DB.prepare(
    "SELECT id, titulo, descripcion, precio, imagen, creado FROM entradas WHERE estado='publicada' ORDER BY creado DESC LIMIT 40"
  ).all();
  return new Response(JSON.stringify({ entradas: r.results || [] }), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=30",
    },
  });
}

/* publicar: sólo con sesión */
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  const usuario = await exigirSesion(request, env);
  if (!usuario) return json({ error: "Volvé a iniciar sesión." }, 401);

  let b; try { b = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const titulo = String(b.titulo || "").trim().slice(0, 120);
  const descripcion = String(b.descripcion || "").trim().slice(0, 1200);
  const precio = String(b.precio || "").trim().slice(0, 60);
  const imagen = String(b.imagen || "");

  if (!titulo) return json({ error: "Falta el título de la entrada." }, 400);
  if (!descripcion) return json({ error: "Falta la descripción." }, 400);
  if (imagen && !/^data:image\/(webp|jpeg|png);base64,/.test(imagen))
    return json({ error: "La imagen no tiene un formato válido." }, 400);
  if (imagen.length > 900000) return json({ error: "La imagen pesa demasiado." }, 413);

  const r = await env.DB.prepare(
    "INSERT INTO entradas (titulo, descripcion, precio, imagen, estado, autor, creado) VALUES (?,?,?,?,'publicada',?,?)"
  ).bind(titulo, descripcion, precio, imagen, usuario, Date.now()).run();
  return json({ id: r.meta?.last_row_id, ok: true });
}

/* bajar una publicación */
export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  const usuario = await exigirSesion(request, env);
  if (!usuario) return json({ error: "Volvé a iniciar sesión." }, 401);
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return json({ error: "falta el id" }, 400);
  await env.DB.prepare("UPDATE entradas SET estado='baja' WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
