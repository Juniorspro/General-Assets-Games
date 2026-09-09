/* La cola de pedidos, para el que administra.
 *
 * EL ADMINISTRADOR ES UNA CUENTA, NO UNA CONTRASENIA COMPARTIDA. Escribir la
 * misma clave en cada pantalla es una llave suelta: no se sabe quien entro, no
 * se le puede sacar el acceso a uno solo, y si se filtra hay que cambiarla para
 * todos. Ahora se entra con el mismo usuario y contrasenia que cualquiera, y la
 * cuenta lleva una marca.
 *
 * COMO SE NOMBRA AL PRIMERO: con la clave vieja, una sola vez. Quien la sepa y
 * este con su sesion abierta se convierte en jefe. Despues no se usa mas.
 *
 * APROBAR HACE TRES COSAS: marca el pedido, habilita la cuenta, y AVISA. Sin lo
 * tercero la persona pago y tiene que adivinar cuando mirar.
 */
import { quienEs, iguales, json } from "./_social.js";
import { avisar } from "./_avisar.js";

async function jefe(env, request) {
  const yo = await quienEs(env, request);
  if (!yo) return null;
  const u = await env.DB.prepare("SELECT id, usuario, jefe FROM usuarios WHERE id = ?")
    .bind(yo.u).first();
  return u && u.jefe ? u : null;
}

export const onRequestPost = async ({ request, env }) => {
  if (!env.DB) return json({ error: "sin configurar" }, 503);

  let c;
  try { c = await request.json(); } catch { return json({ error: "cuerpo ilegible" }, 400); }

  /* ------------------------------------------------- nombrar al primero */
  if (c.hacer === "nombrarme") {
    const yo = await quienEs(env, request);
    if (!yo) return json({ error: "Entrá con tu cuenta primero." }, 401);
    if (!env.CLAVE_ADMIN || !iguales(String(c.clave || ""), env.CLAVE_ADMIN)) {
      await new Promise((r) => setTimeout(r, 500));
      return json({ error: "clave incorrecta" }, 403);
    }
    await env.DB.prepare("UPDATE usuarios SET jefe = 1 WHERE id = ?").bind(yo.u).run();
    return json({ ok: true });
  }

  const j = await jefe(env, request);
  if (!j) return json({ error: "No sos administrador." }, 403);

  /* --------------------------------------------------------- ver la cola */
  if (c.hacer === "ver") {
    const { results } = await env.DB.prepare(
      "SELECT r.id, r.medio, r.refer, r.monto, r.nota, r.creado, r.foto_tipo, " +
      "       u.usuario, u.nombre, u.correo " +
      "FROM reclamos r JOIN usuarios u ON u.id = r.usuario " +
      "WHERE r.estado = 'espera' ORDER BY r.creado ASC LIMIT 50").all();
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE acceso = 1").first();
    return json({ pedidos: results, conAcceso: n.n, yo: j.usuario });
  }

  /* ------------------------------------------------------------ resolver */
  if (c.hacer === "aprobar" || c.hacer === "rechazar") {
    const id = parseInt(c.id, 10);
    if (!id) return json({ error: "pedido inválido" }, 400);
    const r = await env.DB.prepare(
      "SELECT usuario FROM reclamos WHERE id = ? AND estado = 'espera'").bind(id).first();
    if (!r) return json({ error: "Ese pedido ya no está esperando." }, 404);

    const aprueba = c.hacer === "aprobar";
    /* la foto se borra al resolver: la base no es un album, y el comprobante
       ya cumplio su unica funcion */
    await env.DB.prepare(
      "UPDATE reclamos SET estado = ?, visto = ?, quien_vio = ?, foto = NULL, foto_tipo = '' " +
      "WHERE id = ?")
      .bind(aprueba ? "aprobado" : "rechazado", Date.now(), j.id, id).run();

    if (aprueba) {
      await env.DB.prepare("UPDATE usuarios SET acceso = 1 WHERE id = ?").bind(r.usuario).run();
      await avisar(env, r.usuario,
        "¡Listo! Confirmamos tu transferencia y la zona de donantes ya te quedó abierta.",
        "bueno");
    } else {
      await avisar(env, r.usuario,
        "No pudimos encontrar tu transferencia. Si creés que hay un error, " +
        "volvé a mandar el comprobante con el número completo.", "malo");
    }
    return json({ ok: true });
  }

  /* --------------------------------------- moderar: ocultar o suspender */
  if (c.hacer === "ocultar") {
    await env.DB.prepare("UPDATE publicaciones SET oculto = 1 WHERE id = ?")
      .bind(parseInt(c.id, 10)).run();
    return json({ ok: true });
  }
  if (c.hacer === "suspender") {
    await env.DB.prepare("UPDATE usuarios SET bloqueado = 1 WHERE usuario = ? AND jefe = 0")
      .bind(String(c.usuario || "").toLowerCase()).run();
    return json({ ok: true });
  }

  return json({ error: "no sé qué hacer" }, 400);
};

/* el comprobante, solo para el administrador */
export const onRequestGet = async ({ request, env }) => {
  if (!env.DB) return new Response("no", { status: 503 });
  const j = await jefe(env, request);
  if (!j) return new Response("no", { status: 403 });
  const id = parseInt(new URL(request.url).searchParams.get("foto") || "0", 10);
  const r = await env.DB.prepare("SELECT foto, foto_tipo FROM reclamos WHERE id = ?")
    .bind(id).first();
  if (!r || !r.foto) return new Response("no hay", { status: 404 });
  return new Response(r.foto, {
    headers: { "content-type": r.foto_tipo || "image/jpeg", "cache-control": "no-store" },
  });
};
