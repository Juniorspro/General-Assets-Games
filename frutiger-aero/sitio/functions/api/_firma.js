/* Firmas HMAC, compartidas por todo lo que da o revisa acceso.
 *
 * NO HAY BASE DE DATOS Y NO HACE FALTA. Un pase es un texto firmado con una
 * clave que solo conoce el servidor: se puede leer, pero no se puede fabricar
 * ni cambiar sin invalidar la firma. Si alguien edita la fecha de vencimiento,
 * la firma deja de dar y el pase se cae.
 *
 * Lo que esto NO resuelve, y hay que saberlo: no se puede revocar un pase suelto
 * sin una lista. Si algun dia hace falta echar a alguien, se cambia SECRETO y
 * se caen todos a la vez. Para un proyecto de esta escala alcanza.
 */

const cod = new TextEncoder();

const b64u = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function llave(secreto) {
  return crypto.subtle.importKey("raw", cod.encode(secreto),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function firmar(secreto, texto) {
  const k = await llave(secreto);
  return b64u(await crypto.subtle.sign("HMAC", k, cod.encode(texto)));
}

/* Comparacion en tiempo constante. Con === el tiempo que tarda en fallar
   depende de cuantos caracteres coincidieron, y eso alcanza para adivinar una
   firma de a un caracter por vez. Es paranoia barata: son diez lineas. */
export function iguales(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* --- el pase: lo que guarda el navegador de quien ya pago --- */
export async function darPase(secreto, datos, dias = 3650) {
  const cuerpo = { ...datos, exp: Date.now() + dias * 86400e3 };
  const txt = b64u(cod.encode(JSON.stringify(cuerpo)));
  return txt + "." + await firmar(secreto, txt);
}

export async function leerPase(secreto, pase) {
  if (typeof pase !== "string" || pase.length > 1024) return null;
  const p = pase.split(".");
  if (p.length !== 2) return null;
  if (!iguales(p[1], await firmar(secreto, p[0]))) return null;
  try {
    const d = JSON.parse(atob(p[0].replace(/-/g, "+").replace(/_/g, "/")));
    return d.exp > Date.now() ? d : null;
  } catch { return null; }
}

/* --- los codigos para las transferencias en pesos ---
   Prex no avisa a nadie cuando entra plata: no tiene webhooks ni API publica.
   Asi que esa via es a mano, y el codigo es lo que se manda despues de ver el
   comprobante. Va firmado igual, para que nadie invente uno. */
export async function darCodigo(secreto, n) {
  const id = n.toString(36).toUpperCase().padStart(4, "0");
  const t = (await firmar(secreto, "codigo:" + id)).slice(0, 6).toUpperCase();
  return "FA-" + id + "-" + t;
}

export async function codigoVale(secreto, codigo) {
  if (typeof codigo !== "string") return false;
  const m = /^FA-([0-9A-Z]{4,8})-([0-9A-Z_-]{6})$/.exec(codigo.trim().toUpperCase());
  if (!m) return false;
  const t = (await firmar(secreto, "codigo:" + m[1])).slice(0, 6).toUpperCase();
  return iguales(m[2], t);
}
