import { json, preflight, exigirSesion } from "./_comun.js";
import { TIPOS, COLORES, CAMPOS, ORDEN, SOLAPAS, filtroSolapa, limpiarPublicacion, guardar } from "./_pub.js";
export const onRequestOptions = preflight;

/* Lo que lee la web. Sin sesión: es público. `?tipo=` filtra una solapa. */
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ publicaciones: [], colores: COLORES });

  const q = new URL(request.url).searchParams;
  const solapa = q.get("solapa") || "";
  const tipo = q.get("tipo") || "";

  /* `solapa` es lo que usa la web; `tipo` queda para lo que ya lo pedía así */
  const f = SOLAPAS.includes(solapa) ? filtroSolapa(solapa) : null;
  const porTipo = !f && TIPOS.includes(tipo);
  const donde = f ? f.donde : porTipo ? "tipo = ?" : "1 = 1";
  const args = f ? f.args : porTipo ? [tipo] : [];

  const r = await env.DB.prepare(
    `SELECT ${CAMPOS} FROM publicaciones
     WHERE estado = 'publicada' AND (${donde}) ${f ? f.orden : ORDEN} LIMIT 60`
  ).bind(...args).all();

  return new Response(
    JSON.stringify({ publicaciones: r.results || [], colores: COLORES }),
    { headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=30",
      } }
  );
}

/* Publicar. Sólo con sesión. */
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  const usuario = await exigirSesion(request, env);
  if (!usuario) return json({ error: "Volvé a iniciar sesión." }, 401);

  let b; try { b = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const { error, fila } = limpiarPublicacion(b);
  if (error) return json({ error }, 400);

  const id = await guardar(env, fila, usuario);
  return json({ ok: true, id, publicacion: { id, ...fila } });
}

/* Bajar una publicación. */
export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  if (!(await exigirSesion(request, env))) return json({ error: "Volvé a iniciar sesión." }, 401);
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return json({ error: "falta el id" }, 400);
  await env.DB.prepare(
    "UPDATE publicaciones SET estado = 'baja', tocado = ? WHERE id = ?"
  ).bind(Date.now(), id).run();
  return json({ ok: true });
}
