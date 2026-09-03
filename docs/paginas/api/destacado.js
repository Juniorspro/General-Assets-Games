import { json, preflight, exigirSesion } from "./_comun.js";
export const onRequestOptions = preflight;

const COLORES = {
  magenta:"#ff1e8e", violeta:"#c34bff", oro:"#e8bf4e", verde:"#2ce65a",
  cian:"#2fd8e8", rojo:"#ff2020", naranja:"#e8863a", blanco:"#f4f1f6",
};

/* lo que lee la web */
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ destacado: null });
  const d = await env.DB.prepare("SELECT * FROM destacado WHERE id = 1").first();
  return new Response(JSON.stringify({ destacado: d && d.activo ? d : null, colores: COLORES }), {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8",
               "Cache-Control": "public, max-age=30" },
  });
}

/* lo que guarda la app */
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  if (!(await exigirSesion(request, env))) return json({ error: "Volvé a iniciar sesión." }, 401);

  let b; try { b = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const t = (v, n) => String(v || "").trim().slice(0, n);
  const titulo = t(b.titulo, 90), subtitulo = t(b.subtitulo, 90), fecha = t(b.fecha, 30);
  const lugar = t(b.lugar, 90), hora = t(b.hora, 30), detalle = t(b.detalle, 400);
  const color = COLORES[b.color] ? b.color : "magenta";
  const activo = b.activo === false ? 0 : 1;
  let cuando = Number(b.cuando || 0);            // milisegundos, para la cuenta regresiva
  if (!Number.isFinite(cuando) || cuando < 0) cuando = 0;

  if (activo && !titulo) return json({ error: "Falta el título del evento." }, 400);

  await env.DB.prepare(
    `INSERT INTO destacado (id, titulo, subtitulo, fecha, cuando, lugar, hora, detalle, color, activo, tocado)
     VALUES (1,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET titulo=excluded.titulo, subtitulo=excluded.subtitulo,
       fecha=excluded.fecha, cuando=excluded.cuando, lugar=excluded.lugar, hora=excluded.hora,
       detalle=excluded.detalle, color=excluded.color, activo=excluded.activo, tocado=excluded.tocado`
  ).bind(titulo, subtitulo, fecha, cuando, lugar, hora, detalle, color, activo, Date.now()).run();
  return json({ ok: true });
}
