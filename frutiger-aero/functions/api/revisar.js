/* La cola de pedidos, para el que administra. Ver, aprobar, rechazar.
 *
 * Se pide con la clave de administrador en cada llamada. Se compara en tiempo
 * constante y se espera medio segundo antes de contestar mal, igual que en la
 * fabrica de codigos: son dos lineas y sacan del juego a los intentos a lo
 * bruto.
 *
 * APROBAR ESCRIBE EN DOS LADOS Y ES A PROPOSITO: marca el pedido y habilita la
 * cuenta. Quedan los dos registros —quien pidio que, y quien quedo habilitado—
 * para poder reconstruir despues por que alguien tiene acceso.
 */
import { iguales, json } from "./_social.js";

const clave = (env, c) => env.CLAVE_ADMIN && iguales(String(c || ""), env.CLAVE_ADMIN);

export const onRequestPost = async ({ request, env }) => {
  if (!env.DB || !env.CLAVE_ADMIN) return json({ error: "sin configurar" }, 503);

  let c;
  try { c = await request.json(); } catch { return json({ error: "cuerpo ilegible" }, 400); }

  if (!clave(env, c.clave)) {
    await new Promise((r) => setTimeout(r, 500));
    return json({ error: "clave incorrecta" }, 403);
  }

  /* --------------------------------------------------------- ver la cola */
  if (c.hacer === "ver") {
    const { results } = await env.DB.prepare(
      "SELECT r.*, u.usuario, u.nombre FROM reclamos r JOIN usuarios u ON u.id = r.usuario " +
      "WHERE r.estado = 'espera' ORDER BY r.creado ASC LIMIT 50").all();
    const n = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM usuarios WHERE acceso = 1").first();
    return json({ pedidos: results, conAcceso: n.n });
  }

  /* ------------------------------------------------------------ resolver */
  if (c.hacer === "aprobar" || c.hacer === "rechazar") {
    const id = parseInt(c.id, 10);
    if (!id) return json({ error: "pedido inválido" }, 400);
    const r = await env.DB.prepare("SELECT usuario FROM reclamos WHERE id = ? AND estado = 'espera'")
      .bind(id).first();
    if (!r) return json({ error: "Ese pedido ya no está esperando." }, 404);

    const estado = c.hacer === "aprobar" ? "aprobado" : "rechazado";
    await env.DB.prepare("UPDATE reclamos SET estado = ?, visto = ? WHERE id = ?")
      .bind(estado, Date.now(), id).run();
    if (estado === "aprobado")
      await env.DB.prepare("UPDATE usuarios SET acceso = 1 WHERE id = ?").bind(r.usuario).run();
    return json({ ok: true });
  }

  /* --------------------------------------- moderar: ocultar o suspender */
  if (c.hacer === "ocultar") {
    await env.DB.prepare("UPDATE publicaciones SET oculto = 1 WHERE id = ?")
      .bind(parseInt(c.id, 10)).run();
    return json({ ok: true });
  }
  if (c.hacer === "suspender") {
    await env.DB.prepare("UPDATE usuarios SET bloqueado = 1 WHERE usuario = ?")
      .bind(String(c.usuario || "").toLowerCase()).run();
    return json({ ok: true });
  }

  return json({ error: "no sé qué hacer" }, 400);
};
