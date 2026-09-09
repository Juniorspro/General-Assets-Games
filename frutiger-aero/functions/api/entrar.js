/* Entrar con Google.
 *
 * EL TOKEN SE COMPRUEBA DEL LADO DEL SERVIDOR. Un JWT es texto firmado, y
 * leerlo sin verificar la firma es leer lo que el que lo mando quiso escribir:
 * cualquiera se arma uno con el correo del vecino y entra como el. Aca se lo
 * damos a Google para que diga si es suyo, y ademas se comprueba `aud` —para
 * quien es—, que es el chequeo que casi siempre falta: un token valido de OTRA
 * aplicacion tambien esta firmado por Google.
 *
 * ENTRAR CON GOOGLE DA UNA CUENTA DE VERDAD, la misma que se crea con usuario y
 * contrasenia. Antes devolvia un nombre y una foto que vivian en el navegador y
 * nada mas: se podia «entrar» y despues no publicar, no pedir el acceso, no
 * tener perfil. Una puerta que no lleva a ningun lado es peor que ninguna.
 *
 * LA CUENTA SE ATA AL `sub`, NO AL CORREO. El correo de Google se puede cambiar,
 * y una direccion de una empresa se puede reasignar a otra persona cuando el
 * primero se va. El `sub` es el numero de la cuenta y no cambia nunca: atarse
 * al correo es dejar que el que herede la direccion herede el perfil.
 *
 * EL NOMBRE DE USUARIO LO ELIGE LA PERSONA. Derivarlo del correo publicaria
 * medio correo de cada uno como direccion del perfil, y ademas quedan feos
 * («tomas.j.1998»). Asi que la primera vez se pide, con uno sugerido al lado.
 */
import { firmar, iguales, darPase, leerPase } from "./_firma.js";
import { darSesion, quienEs, claveVale,
         RE_USUARIO, RESERVADOS, limpio, json } from "./_social.js";

const CADUCA = 10 * 60e3;   /* el ticket para elegir usuario: diez minutos */

/* --- el numero de un solo uso ---
   Sin esto, un token de Google robado (de un registro, de una extension) sirve
   para entrar hasta que vence, una hora despues. Con esto solo sirve para ESTE
   inicio de sesion: el token lleva adentro un numero que pidio esta pagina y
   que este servidor firmo hace un rato. No hace falta guardarlo en ningun lado
   —la firma y la fecha viajan con el— asi que no cuesta una tabla. */
async function darNumero(secreto) {
  const t = Date.now().toString(36);
  const r = [...crypto.getRandomValues(new Uint8Array(9))]
    .map((x) => x.toString(16).padStart(2, "0")).join("");
  return t + "." + r + "." + (await firmar(secreto, "nonce:" + t + "." + r)).slice(0, 24);
}
async function numeroVale(secreto, n) {
  const p = String(n || "").split(".");
  if (p.length !== 3) return false;
  const t = parseInt(p[0], 36);
  if (!t || Date.now() - t > CADUCA || t - Date.now() > 60e3) return false;
  return iguales(p[2], (await firmar(secreto, "nonce:" + p[0] + "." + p[1])).slice(0, 24));
}

export const onRequestGet = async ({ env }) => {
  if (!env.SECRETO) return json({ error: "sin SECRETO" }, 503);
  return json({ numero: await darNumero(env.SECRETO) });
};

/* le pregunta a Google si el token es suyo y si es para nosotros */
async function abrirToken(env, token, numero) {
  if (typeof token !== "string" || token.length > 4096) return { error: "falta el token" };

  /* Se consulta a Google en vez de verificar la firma aca con sus claves
     publicas. Es un viaje de red mas por inicio de sesion, y a mucho volumen
     conviene lo otro; a esta escala, cambiarlo seria escribir un cache de
     claves para ahorrar 200 ms una vez por persona por dia. */
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" +
                        encodeURIComponent(token));
  if (!r.ok) return { error: "Google rechazó el token", codigo: 401 };
  const d = await r.json();

  if (d.aud !== env.GOOGLE_CLIENT_ID) return { error: "el token es de otra aplicación", codigo: 401 };
  if (d.iss !== "accounts.google.com" && d.iss !== "https://accounts.google.com")
    return { error: "emisor inesperado", codigo: 401 };
  if (Number(d.exp) * 1000 < Date.now()) return { error: "token vencido", codigo: 401 };
  if (!d.sub) return { error: "token sin cuenta", codigo: 401 };
  /* un correo sin confirmar no prueba nada: no se usa para nada que importe */
  if (d.email && d.email_verified !== "true" && d.email_verified !== true) d.email = "";

  /* el numero tiene que ser el que pidio ESTA pagina hace un rato, y tiene que
     venir adentro del token: si viniera solo al costado, cualquiera lo copia */
  if (!iguales(String(d.nonce || ""), String(numero || "")) ||
      !(await numeroVale(env.SECRETO, numero)))
    return { error: "Se venció el inicio de sesión. Probá de nuevo.", codigo: 401 };

  return { sub: String(d.sub), correo: limpio(d.email, 120),
           nombre: limpio(d.name || d.given_name, 40) ||
                   limpio((d.email || "").split("@")[0], 40) || "Invitado",
           foto: /^https:\/\//.test(d.picture || "") ? d.picture : null };
}

/* lo que se guarda del que ya entro pero todavia no eligio nombre de usuario */
const darTicket = (secreto, g) =>
  darPase(secreto, { g: g.sub, c: g.correo, m: g.nombre }, CADUCA / 86400e3);

/* «tomas.perez@gmail.com» -> «tomasperez», libre. Es una sugerencia: se puede
   borrar y poner cualquier otra cosa. */
async function sugerir(env, g) {
  let base = (g.correo.split("@")[0] || g.nombre)
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "").slice(0, 14);
  if (base.length < 3) base = "aero" + base;
  for (let i = 0; i < 12; i++) {
    const n = i ? base + i : base;
    if (RESERVADOS.has(n) || !RE_USUARIO.test(n)) continue;
    const ya = await env.DB.prepare("SELECT id FROM usuarios WHERE usuario = ?").bind(n).first();
    if (!ya) return n;
  }
  return "";
}

const comoYo = (u) => ({ id: u.id, usuario: u.usuario, nombre: u.nombre,
                         retrato: u.retrato, sobre: u.sobre, cobro: u.cobro });

export const onRequestPost = async ({ request, env }) => {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: "Google no está configurado en este sitio." }, 503);
  if (!env.DB) return json({ error: "sin base de datos" }, 503);
  if (!env.SECRETO) return json({ error: "sin SECRETO" }, 503);

  let c;
  try { c = await request.json(); } catch { return json({ error: "cuerpo ilegible" }, 400); }

  /* ---------------------------------------------- 2º paso: elegir usuario */
  if (c.hacer === "registrar" || c.hacer === "vincular") {
    const t = await leerPase(env.SECRETO, String(c.ticket || ""));
    if (!t || !t.g) return json({ error: "Se venció el registro. Volvé a entrar con Google." }, 401);

    const tomada = await env.DB.prepare("SELECT id FROM usuarios WHERE google = ?")
      .bind(t.g).first();
    if (tomada) return json({ error: "Esa cuenta de Google ya está en uso." }, 409);

    /* «ya tengo cuenta acá»: se pega Google a la cuenta que ya existe, pero
       recien despues de que escriba su contrasenia. Si alcanzara con decir el
       nombre de usuario, entrar con Google seria una forma de meterse en la
       cuenta de cualquiera. */
    if (c.hacer === "vincular") {
      const usuario = String(c.usuario || "").toLowerCase().trim();
      const u = await env.DB.prepare("SELECT * FROM usuarios WHERE usuario = ?")
        .bind(usuario).first();
      const guardada = u ? u.clave : "pbkdf2$100000$" + "00".repeat(16) + "$" + "00".repeat(32);
      const bien = await claveVale(String(c.clave || ""), guardada);
      if (!u || !bien) return json({ error: "Usuario o contraseña incorrectos." }, 403);
      if (u.bloqueado) return json({ error: "Esta cuenta está suspendida." }, 403);
      if (u.google) return json({ error: "Esa cuenta ya tiene otro Google pegado." }, 409);

      await env.DB.prepare("UPDATE usuarios SET google = ?, correo = ? WHERE id = ?")
        .bind(t.g, t.c || u.correo || "", u.id).run();
      return json({ pase: await darSesion(env.SECRETO, u.id, u.usuario), yo: comoYo(u) });
    }

    const usuario = String(c.usuario || "").toLowerCase().trim();
    if (!RE_USUARIO.test(usuario))
      return json({ error: "El usuario va en minúsculas, de 3 a 20, sin espacios." }, 400);
    if (RESERVADOS.has(usuario)) return json({ error: "Ese nombre está reservado." }, 400);
    const ya = await env.DB.prepare("SELECT id FROM usuarios WHERE usuario = ?")
      .bind(usuario).first();
    if (ya) return json({ error: "Ese usuario ya está tomado." }, 409);

    /* la columna de la contrasenia no queda vacia sino con algo que NUNCA puede
       dar: `claveVale` solo acepta «pbkdf2$...», asi que esta cuenta no se
       puede abrir escribiendo nada en el formulario de siempre. */
    const retrato = limpio(c.retrato, 60) || "m-saludando";
    const r = await env.DB.prepare(
      "INSERT INTO usuarios (usuario, nombre, clave, retrato, correo, google, creado) " +
      "VALUES (?,?,?,?,?,?,?)")
      .bind(usuario, limpio(c.nombre, 40) || t.m || usuario, "google-sin-clave",
            retrato, t.c || "", t.g, Date.now()).run();

    const id = r.meta.last_row_id;
    return json({ pase: await darSesion(env.SECRETO, id, usuario),
                  yo: { id, usuario, nombre: limpio(c.nombre, 40) || t.m || usuario, retrato } });
  }

  /* ------------------------------------------------- 1º paso: el token */
  const g = await abrirToken(env, c.credential, c.numero);
  if (g.error) return json({ error: g.error }, g.codigo || 400);

  const u = await env.DB.prepare("SELECT * FROM usuarios WHERE google = ?").bind(g.sub).first();
  if (u) {
    if (u.bloqueado) return json({ error: "Esta cuenta está suspendida." }, 403);
    /* el nombre y la foto de Google pueden haber cambiado desde la ultima vez */
    if (g.correo && g.correo !== u.correo)
      await env.DB.prepare("UPDATE usuarios SET correo = ? WHERE id = ?").bind(g.correo, u.id).run();
    return json({ pase: await darSesion(env.SECRETO, u.id, u.usuario),
                  yo: comoYo(u), foto: g.foto });
  }

  /* ya esta adentro con su cuenta y toca Google: se pegan, sin preguntar nada */
  const yo = await quienEs(env, request);
  if (yo) {
    const mia = await env.DB.prepare("SELECT * FROM usuarios WHERE id = ?").bind(yo.u).first();
    if (mia && !mia.google) {
      await env.DB.prepare("UPDATE usuarios SET google = ?, correo = ? WHERE id = ?")
        .bind(g.sub, g.correo || mia.correo || "", mia.id).run();
      return json({ pase: await darSesion(env.SECRETO, mia.id, mia.usuario),
                    yo: comoYo(mia), foto: g.foto, pegada: true });
    }
  }

  return json({ nuevo: true, ticket: await darTicket(env.SECRETO, g),
                sugerido: await sugerir(env, g),
                nombre: g.nombre, correo: g.correo, foto: g.foto });
};
