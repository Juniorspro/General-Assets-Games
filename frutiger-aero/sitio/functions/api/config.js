/* Devuelve el identificador de cliente de Google, si hay uno configurado.
   NO está en el código a propósito: se pone como variable de entorno en el
   panel de Cloudflare (Pages -> Settings -> Variables) y así se cambia sin
   volver a publicar el sitio. No es un secreto —viaja al navegador igual— pero
   sí es algo que cambia de proyecto en proyecto. */
export const onRequestGet = ({ env }) =>
  new Response(JSON.stringify({ google: env.GOOGLE_CLIENT_ID || null }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
