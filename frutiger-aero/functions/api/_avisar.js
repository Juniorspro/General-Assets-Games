/* Avisos: en el sitio siempre, por correo si algun dia se puede.
 *
 * EL CORREO NECESITA UN DOMINIO PROPIO Y NO LO HAY. Los servicios de envio
 * (Resend y los demas) solo dejan escribirle a cualquiera desde un dominio
 * verificado; con un `.pages.dev` prestado no se puede verificar nada, y lo que
 * salga de un remitente de prueba cae en spam o directamente lo rechazan.
 *
 * Por eso el aviso DENTRO del sitio no es el plan B: es el que siempre corre y
 * el que siempre llega. El correo se suma encima cuando exista RESEND_API_KEY y
 * CORREO_DESDE, sin tocar nada mas. Si el envio falla, se traga el error: que
 * no salga un mail no puede impedir que alguien reciba el acceso que pago.
 */
export async function avisar(env, usuario, texto, tipo) {
  await env.DB.prepare(
    "INSERT INTO avisos (usuario, texto, tipo, creado) VALUES (?,?,?,?)")
    .bind(usuario, texto, tipo || "info", Date.now()).run();

  if (!env.RESEND_API_KEY || !env.CORREO_DESDE) return;
  const u = await env.DB.prepare("SELECT correo, nombre FROM usuarios WHERE id = ?")
    .bind(usuario).first();
  if (!u || !u.correo) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY,
                 "content-type": "application/json" },
      body: JSON.stringify({
        from: env.CORREO_DESDE,
        to: [u.correo],
        subject: "Frutiger Aero",
        text: (u.nombre || "Hola") + ",\n\n" + texto +
              "\n\nEntrá en https://frutiger-aero-86q.pages.dev\n",
      }),
    });
  } catch { /* el aviso del sitio ya quedó: el correo es un extra */ }
}
