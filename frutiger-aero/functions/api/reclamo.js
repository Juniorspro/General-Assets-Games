/* «Ya transferí»: el que pago deja el numero de operacion y espera el visto.
 *
 * POR QUE A MANO Y NO AUTOMATICO: ninguna billetera que pueda usar un menor de
 * edad en Argentina entrega credenciales de cobro. Mercado Pago abre cuentas
 * desde los 13 con permiso de un adulto y deja RECIBIR transferencias, pero no
 * vender: sin Checkout Pro no hay token ni aviso automatico. Asi que alguien
 * tiene que mirar el comprobante. Lo que si se puede es que mirarlo cueste dos
 * toques en vez de una conversacion por WhatsApp.
 *
 * EL PEDIDO NO DA NADA POR SI SOLO. Solo entra en una cola. Quien aprueba es el
 * que tiene la clave de administrador, y recien ahi la cuenta queda habilitada.
 */
import { quienEs, limpio, json } from "./_social.js";

export const onRequestPost = async ({ request, env }) => {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  const yo = await quienEs(env, request);
  if (!yo) return json({ error: "Entrá con tu cuenta para pedir el acceso." }, 401);

  let c;
  try { c = await request.json(); } catch { return json({ error: "cuerpo ilegible" }, 400); }

  const refer = limpio(c.refer, 80);
  if (refer.length < 4)
    return json({ error: "Poné el número de operación del comprobante." }, 400);

  const u = await env.DB.prepare("SELECT acceso FROM usuarios WHERE id = ?").bind(yo.u).first();
  if (u && u.acceso) return json({ ya: true });

  const medio = ["transferencia", "paypal", "otro"].includes(c.medio) ? c.medio : "otro";

  try {
    await env.DB.prepare(
      "INSERT INTO reclamos (usuario, medio, refer, monto, nota, creado) VALUES (?,?,?,?,?,?)")
      .bind(yo.u, medio, refer, limpio(c.monto, 20), limpio(c.nota, 200), Date.now()).run();
  } catch {
    /* el indice unico parcial no deja dos pedidos en espera de la misma
       persona: insistir no acelera nada y solo llena la cola */
    return json({ error: "Ya tenés un pedido esperando. Te avisamos apenas lo veamos." }, 409);
  }
  return json({ ok: true });
};

/* como va lo mio */
export const onRequestGet = async ({ request, env }) => {
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  const yo = await quienEs(env, request);
  if (!yo) return json({ error: "sin sesión" }, 401);
  const r = await env.DB.prepare(
    "SELECT estado, creado FROM reclamos WHERE usuario = ? ORDER BY creado DESC LIMIT 1")
    .bind(yo.u).first();
  return json({ reclamo: r || null });
};
