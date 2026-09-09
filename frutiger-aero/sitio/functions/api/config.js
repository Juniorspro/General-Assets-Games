/* Lo que la pagina necesita saber del servidor y cambia de instalacion en
   instalacion: el identificador de Google y los datos de cobro.
 *
 * NADA DE ESTO ESTA EN EL CODIGO a proposito. Son variables de entorno, que se
 * ponen en Cloudflare Pages -> Settings -> Variables, y asi se cambian sin
 * volver a publicar el sitio. No son secretos —un alias de Mercado Pago y un
 * usuario de PayPal viajan al navegador y son publicos por definicion, es como
 * cobran— pero si son cosas que cambian, y tenerlas escritas obliga a un
 * despliegue por cada correccion.
 *
 * Si falta alguna, la pagina lo dice en pantalla en lugar de mostrar un boton
 * que no lleva a ningun lado.
 */
export const onRequestGet = ({ env }) => {
  const pago = {};
  if (env.PAGO_MP_ALIAS) pago.mpAlias = env.PAGO_MP_ALIAS;
  if (env.PAGO_MP_LINK)  pago.mpLink  = env.PAGO_MP_LINK;
  if (env.PAGO_PAYPAL)   pago.paypal  = env.PAGO_PAYPAL;

  return new Response(JSON.stringify({
    google: env.GOOGLE_CLIENT_ID || null,
    pago: Object.keys(pago).length ? pago : null,
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
};
