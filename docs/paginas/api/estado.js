import { json, preflight } from "./_comun.js";
export const onRequestOptions = preflight;
/* sólo para que la app sepa si el servidor y la IA están vivos */
export async function onRequestGet({ env }) {
  return json({ ok: !!env.DB, ia: !!env.AI });
}
