/* Verifica el token de Google DEL LADO DEL SERVIDOR y devuelve el perfil.
 *
 * POR QUÉ NO SE DECODIFICA EN EL NAVEGADOR: un JWT es texto firmado, y leerlo
 * sin comprobar la firma es leer lo que el que lo mandó quiso escribir.
 * Cualquiera podría armarse uno y entrar con el nombre y la foto que se le
 * antoje. Acá se lo damos a Google para que diga si es suyo y si es para esta
 * aplicación (`aud`), que es el chequeo que casi siempre falta.
 *
 * Lo que devuelve no se guarda en ninguna base: vuelve al navegador y vive ahí.
 * Este escritorio no tiene nada que proteger, y pedirle la cuenta a alguien
 * para después guardarle los datos sin necesidad sería cobrarle de más. */
export const onRequestPost = async ({ request, env }) => {
  const mal = (m, c = 400) =>
    new Response(JSON.stringify({ error: m }), {
      status: c,
      headers: { "content-type": "application/json; charset=utf-8" },
    });

  if (!env.GOOGLE_CLIENT_ID) return mal("sin GOOGLE_CLIENT_ID configurado", 503);

  let cuerpo;
  try { cuerpo = await request.json(); } catch { return mal("cuerpo ilegible"); }
  const token = cuerpo && cuerpo.credential;
  if (typeof token !== "string" || token.length > 4096) return mal("falta el token");

  const r = await fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token)
  );
  if (!r.ok) return mal("token rechazado por Google", 401);
  const d = await r.json();

  // los tres chequeos que importan: para quién es, quién lo firmó, y si vive
  if (d.aud !== env.GOOGLE_CLIENT_ID) return mal("el token es de otra aplicación", 401);
  if (d.iss !== "accounts.google.com" && d.iss !== "https://accounts.google.com")
    return mal("emisor inesperado", 401);
  if (Number(d.exp) * 1000 < Date.now()) return mal("token vencido", 401);

  return new Response(
    JSON.stringify({
      nombre: d.name || d.given_name || (d.email || "").split("@")[0] || "Invitado",
      foto: d.picture || null,
      correo: d.email || null,
    }),
    { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }
  );
};
