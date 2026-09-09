/* Da el pase de acceso anticipado. Dos caminos, y ninguno confia en el cliente.
 *
 * 1 · PAYPAL, AUTOMATICO. El navegador manda el numero de orden que le devolvio
 *     PayPal. Eso solo NO PRUEBA NADA: cualquiera puede inventar un numero. Asi
 *     que el servidor le pregunta a PayPal por esa orden con sus propias
 *     credenciales y mira tres cosas: que este COMPLETED, que el dinero haya
 *     ido a NUESTRA cuenta, y que llegue al minimo. Recien ahi firma el pase.
 *
 * 2 · CODIGO, A MANO. Prex no avisa a nadie cuando entra plata —no tiene
 *     webhooks ni API publica—, asi que las transferencias en pesos se miran a
 *     ojo y se manda un codigo. El codigo va firmado: no se puede inventar.
 *
 * Lo que este archivo NO puede hacer, dicho de frente: verificar una
 * transferencia a Prex. No existe forma. Si en algun momento la via en pesos
 * tiene que ser automatica, hay que cobrar por Mercado Pago, que si tiene API.
 */
import { darPase, codigoVale } from "./_firma.js";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const API = (env) => env.PAYPAL_MODO === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function fichaPaypal(env) {
  const r = await fetch(API(env) + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      authorization: "Basic " + btoa(env.PAYPAL_CLIENT_ID + ":" + env.PAYPAL_SECRET),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) return null;
  return (await r.json()).access_token;
}

export const onRequestPost = async ({ request, env }) => {
  if (!env.SECRETO) return json({ error: "falta SECRETO" }, 503);

  let c;
  try { c = await request.json(); } catch { return json({ error: "cuerpo ilegible" }, 400); }

  /* ---------------------------------------------------------- por codigo */
  if (c.codigo) {
    if (!(await codigoVale(env.SECRETO, c.codigo)))
      return json({ error: "Ese código no es válido. Fijate que esté completo." }, 403);
    return json({ pase: await darPase(env.SECRETO, { via: "codigo" }) });
  }

  /* ---------------------------------------------------------- por PayPal */
  if (c.orden) {
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET)
      return json({ error: "PayPal todavía no está configurado" }, 503);
    if (typeof c.orden !== "string" || !/^[A-Z0-9]{6,32}$/i.test(c.orden))
      return json({ error: "orden inválida" }, 400);

    const ficha = await fichaPaypal(env);
    if (!ficha) return json({ error: "no pude hablar con PayPal" }, 502);

    const r = await fetch(API(env) + "/v2/checkout/orders/" + c.orden, {
      headers: { authorization: "Bearer " + ficha },
    });
    if (!r.ok) return json({ error: "PayPal no reconoce esa orden" }, 403);
    const o = await r.json();

    if (o.status !== "COMPLETED")
      return json({ error: "El pago figura como " + o.status + ", no como completado." }, 402);

    const u = (o.purchase_units || [])[0] || {};
    const pago = ((u.payments || {}).captures || [])[0] || {};

    /* que el dinero haya ido a NUESTRA cuenta: sin esto, alguien pega el numero
       de una orden suya, pagada a otro, y entra igual */
    const nuestro = env.PAYPAL_MERCHANT_ID;
    const destino = (pago.payee || u.payee || {}).merchant_id;
    if (nuestro && destino && destino !== nuestro)
      return json({ error: "Ese pago no fue a esta cuenta." }, 403);

    const monto = parseFloat((pago.amount || u.amount || {}).value || "0");
    const minimo = parseFloat(env.ACCESO_MINIMO_USD || "1");
    if (!(monto >= minimo))
      return json({ error: "El acceso anticipado arranca en US$ " + minimo + "." }, 402);

    return json({
      pase: await darPase(env.SECRETO, { via: "paypal", ord: c.orden.slice(-8) }),
      monto,
    });
  }

  return json({ error: "falta el código o la orden" }, 400);
};
