/* El catálogo de la tienda: leerlo lo puede cualquiera que tenga acceso, y
 * cargarlo sólo el jefe.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO. El catálogo vivía adentro de `aeromas.js`, así
 * que publicar una app era editar código y desplegar. O sea que el dueño del
 * sitio no podía subir nada sin que otro le tocara el repositorio: una tienda
 * que sólo carga el que programa no es una tienda, es una lista.
 *
 * LAS DOS FORMAS DE PONER EL ARCHIVO NO SON LA MISMA COSA, y esto es lo único
 * importante de todo el archivo:
 *
 *   `archivo` — vive en /apps/ de este sitio y pasa por la puerta de
 *               `functions/apps/`: sin pase válido contesta 403. Es lo único
 *               que de verdad queda para los que colaboraron. Hay que
 *               desplegarlo, o sea que lo carga quien tenga el repositorio.
 *
 *   `enlace`  — vive afuera (MediaFire, Drive, lo que sea). Se carga en el
 *               momento y sin desplegar nada, pero ES PÚBLICO: cualquiera con
 *               el link lo baja, tenga cuenta o no. La pantalla lo dice con
 *               todas las letras antes de guardar, porque es una decisión de
 *               quien publica y no un detalle técnico que se pueda esconder.
 *
 * Si están los dos, manda `archivo`, que es el que protege.
 */
import { quienEs, limpio, json } from "./_social.js";

const TOPE_APPS = 60;

async function quienSos(env, request) {
  const yo = await quienEs(env, request);
  if (!yo) return null;
  const u = await env.DB.prepare(
    "SELECT id, acceso, jefe, bloqueado FROM usuarios WHERE id = ?").bind(yo.u).first();
  if (!u || u.bloqueado) return null;
  return (u.acceso || u.jefe) ? u : null;
}

/* Un nombre de archivo y nada más. Esto se pega adentro de «/apps/<archivo>»,
   así que una barra o un «..» acá serían una forma de pedir cualquier cosa del
   sitio desde una fila de la base. */
const ARCHIVO_VALE = /^[A-Za-z0-9._-]{1,120}$/;

/* Sólo http y https. El enlace termina en el `href` de un botón: un
   `javascript:` guardado en la base sería código de alguien ejecutándose en la
   pantalla del que entra. Se comprueba acá aunque la página también lo mire,
   porque la página se puede saltear y esto no. */
function enlaceVale(u) {
  if (!u) return true;                       /* vacío es válido: no hay enlace */
  if (u.length > 500) return false;
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:";
  } catch { return false; }
}

export const onRequestGet = async ({ request, env }) => {
  if (!env.DB || !env.SECRETO) return json({ error: "sin configurar" }, 503);
  const u = await quienSos(env, request);
  if (!u) return json({ error: "Esto es para los que colaboraron." }, 403);
  return json({ tienda: await leerTienda(env), jefe: !!u.jefe });
};

export async function leerTienda(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, version, que, para, peso, archivo, enlace, icono, " +
    "permisos, aviso FROM tienda ORDER BY orden, id").all();
  return (results || []).map((a) => ({
    ...a,
    /* los permisos se guardan uno por línea y viajan como lista: la pantalla no
       tiene por qué saber cómo están guardados */
    permisos: String(a.permisos || "").split("\n").map((x) => x.trim()).filter(Boolean),
  }));
}

export const onRequestPost = async ({ request, env }) => {
  if (!env.DB || !env.SECRETO) return json({ error: "sin configurar" }, 503);
  const u = await quienSos(env, request);
  if (!u) return json({ error: "Esto es para los que colaboraron." }, 403);
  if (!u.jefe) return json({ error: "La tienda la carga el dueño del sitio." }, 403);

  let c;
  try { c = await request.json(); } catch { return json({ error: "cuerpo ilegible" }, 400); }

  if (c.hacer === "borrar") {
    const id = parseInt(c.id, 10);
    if (!id) return json({ error: "cuál" }, 400);
    await env.DB.prepare("DELETE FROM tienda WHERE id = ?").bind(id).run();
    return json({ tienda: await leerTienda(env) });
  }

  if (c.hacer !== "guardar") return json({ error: "no sé hacer eso" }, 400);

  const nombre = limpio(c.nombre, 60);
  if (nombre.length < 2) return json({ error: "Ponele un nombre a la app." }, 400);

  const archivo = limpio(c.archivo, 120);
  if (archivo && !ARCHIVO_VALE.test(archivo)) {
    return json({ error: "El nombre del archivo sólo puede tener letras, números, punto, guion y guion bajo." }, 400);
  }

  const enlace = limpio(c.enlace, 500);
  if (!enlaceVale(enlace)) {
    return json({ error: "El enlace tiene que empezar con https:// (o http://)." }, 400);
  }
  if (!archivo && !enlace) {
    return json({ error: "Falta de dónde se baja: un archivo de /apps/ o un enlace." }, 400);
  }

  /* los permisos llegan como texto de varias líneas y se guardan igual */
  const permisos = String(c.permisos == null ? "" : c.permisos)
    .split("\n").map((x) => limpio(x, 120)).filter(Boolean).slice(0, 12).join("\n");

  const campos = {
    nombre,
    version: limpio(c.version, 30),
    que: limpio(c.que, 400),
    para: limpio(c.para, 40),
    peso: limpio(c.peso, 20),
    archivo, enlace,
    icono: limpio(c.icono, 200),
    permisos,
    aviso: limpio(c.aviso, 400),
    orden: Math.min(999, Math.max(0, parseInt(c.orden, 10) || 0)),
  };

  const id = parseInt(c.id, 10);
  const ahora = Date.now();

  if (id) {
    await env.DB.prepare(
      "UPDATE tienda SET nombre=?, version=?, que=?, para=?, peso=?, archivo=?, " +
      "enlace=?, icono=?, permisos=?, aviso=?, orden=?, tocado=? WHERE id=?")
      .bind(campos.nombre, campos.version, campos.que, campos.para, campos.peso,
            campos.archivo, campos.enlace, campos.icono, campos.permisos,
            campos.aviso, campos.orden, ahora, id).run();
  } else {
    /* un tope, porque una tienda de mil filas es una base llena por accidente */
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM tienda").first();
    if (n.n >= TOPE_APPS) return json({ error: "Ya hay " + TOPE_APPS + " apps; borrá alguna." }, 400);
    await env.DB.prepare(
      "INSERT INTO tienda (nombre, version, que, para, peso, archivo, enlace, " +
      "icono, permisos, aviso, orden, creado, tocado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(campos.nombre, campos.version, campos.que, campos.para, campos.peso,
            campos.archivo, campos.enlace, campos.icono, campos.permisos,
            campos.aviso, campos.orden, ahora, ahora).run();
  }

  return json({ tienda: await leerTienda(env) });
};
