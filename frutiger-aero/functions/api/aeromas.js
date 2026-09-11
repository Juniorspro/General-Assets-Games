/* Aero+, la zona de donantes: lo que hay adentro y lo que cada uno se guarda.
 *
 * EL ACCESO SE PREGUNTA ACÁ, NO SE CREE. La pantalla puede mentir —basta con
 * abrir la consola y poner `acceso = true`— así que cada respuesta de este
 * archivo mira la columna `acceso` de la base antes de contestar. Si alguien
 * fuerza la interfaz, la ve vacía: no hay nada que sacar de una pantalla que no
 * trae los datos.
 *
 * LO QUE SE PERSONALIZA SE GUARDA EN LA CUENTA, NO EN EL NAVEGADOR. El marco y
 * la banda se ven en el muro, o sea que los tiene que ver otra gente: guardarlos
 * en `localStorage` sería que cada uno se viera lindo solo para sí mismo. El
 * tema del escritorio sí es de cada uno, pero también va en la cuenta, para que
 * te siga cuando entrás desde el teléfono.
 */
import { quienEs, limpio, json } from "./_social.js";
import { darPase } from "./_firma.js";

/* Lo que se puede elegir vive acá y NO en el navegador. Si la lista estuviera
   del lado de la página, cualquiera podría pedir «marco: el-que-yo-invente» y
   guardarlo; después el muro pinta eso y ya es un agujero para todos los que
   miren. Se comprueba contra estas listas y lo que no está, no entra. */
export const MARCOS = ["", "agua", "oro", "vidrio"];
export const BANDAS = ["", "cristal", "pasto", "nocturno", "oceano", "cielo"];
export const FONDOS = ["cristal", "pasto", "nocturno", "oceano", "cielo"];

/* LA TIENDA. El catálogo vive acá y no en la página: si estuviera del lado del
   navegador, cambiar de precio a «gratis» o agregarse una app sería editar un
   objeto en la consola. Además, agregar la próxima es tocar una sola lista.

   El `archivo` es lo que se le pide a `/apps/…`, que está detrás de su propia
   puerta: la lista y la descarga se comprueban por separado, porque proteger
   sólo la lista es proteger el índice y no el libro. */
export const TIENDA = [
  {
    id: "aero-launcher",
    nombre: "Aero Launcher",
    version: "beta 39",
    que: "El escritorio de Frutiger Aero, pero de verdad: reemplaza la pantalla " +
         "de inicio de tu teléfono Android.",
    archivo: "aero-launcher-39.apk",
    icono: "img/zona/app-launcher.webp",
    peso: "2,2 MB",
    para: "Android",
    /* Se dice lo que pide ANTES de bajarlo y no después. Un launcher necesita
       estos permisos para hacer su trabajo, pero son fuertes y quien instala
       tiene derecho a saberlo sin tener que leer la pantalla de Android. */
    permisos: [
      "Accesibilidad — para poder bloquear la pantalla y abrir apps",
      "Notificaciones — para mostrarlas en el escritorio",
      "Cámara — para el fondo en vivo",
      "Desinstalar apps — para el botón de quitar del menú",
    ],
    aviso: "Está en beta y la hago yo. Android te va a avisar que viene de " +
           "fuera de Play Store: es normal cuando el que la hizo te la pasa directo.",
  },
];

const APPS = [
  { id: "temas",   nombre: "Estudio de temas",  icono: "i-vidrio",
    que: "Cambiá el fondo, el color del vidrio y guardalo en tu cuenta." },
  { id: "perfil",  nombre: "Perfil+",           icono: "i-personaje",
    que: "Marco del retrato, banda y lema. Se ve en el muro." },
  { id: "galeria", nombre: "Galería",           icono: "i-ventana",
    que: "Los fondos en grande, para bajar y usar donde quieras." },
  { id: "fabrica", nombre: "Fábrica de fondos",  icono: "i-fabrica",
    que: "Pedí un fondo con palabras y la máquina te lo dibuja." },
  { id: "tienda",  nombre: "Tienda",            icono: "i-orbe",
    que: "Las apps que hago, gratis para vos por haber colaborado." },
];

async function donante(env, request) {
  const yo = await quienEs(env, request);
  if (!yo) return null;
  const u = await env.DB.prepare(
    "SELECT id, usuario, nombre, acceso, marco, banda, lema, tema, zona_desde " +
    "FROM usuarios WHERE id = ?").bind(yo.u).first();
  return u && u.acceso ? u : null;
}

export const onRequestGet = async ({ request, env }) => {
  if (!env.DB || !env.SECRETO) return json({ error: "sin configurar" }, 503);
  const u = await donante(env, request);
  if (!u) return json({ error: "Esto es para los que colaboraron." }, 403);

  /* la primera vez se anota, y sirve para saludar distinto */
  let estrena = false;
  if (!u.zona_desde) {
    estrena = true;
    await env.DB.prepare("UPDATE usuarios SET zona_desde = ? WHERE id = ?")
      .bind(Date.now(), u.id).run();
  }

  const n = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM usuarios WHERE zona_desde IS NOT NULL").first();

  return json({ apps: APPS, tienda: TIENDA, pase: await darPase(env.SECRETO, { u: u.id }, 2),
                fondos: FONDOS, marcos: MARCOS.filter(Boolean),
                bandas: BANDAS.filter(Boolean), estrena, cuantos: n.n,
                yo: { usuario: u.usuario, nombre: u.nombre, marco: u.marco,
                      banda: u.banda, lema: u.lema, tema: u.tema } });
};

export const onRequestPost = async ({ request, env }) => {
  if (!env.DB || !env.SECRETO) return json({ error: "sin configurar" }, 503);
  const u = await donante(env, request);
  if (!u) return json({ error: "Esto es para los que colaboraron." }, 403);

  let c;
  try { c = await request.json(); } catch { return json({ error: "cuerpo ilegible" }, 400); }

  if (c.hacer === "guardar") {
    const marco = MARCOS.includes(c.marco) ? c.marco : "";
    const banda = BANDAS.includes(c.banda) ? c.banda : "";
    const lema = limpio(c.lema, 80);

    /* el tema es del navegador y no lo mira nadie más, pero igual se recorta:
       una cadena sin tope es una forma barata de llenarle la base a alguien */
    let tema = "";
    try {
      const t = JSON.parse(String(c.tema || "{}"));
      tema = JSON.stringify({
        fondo: FONDOS.includes(t.fondo) ? t.fondo : "cristal",
        tono: Math.min(360, Math.max(0, parseInt(t.tono, 10) || 210)),
        sat: Math.min(100, Math.max(0, parseInt(t.sat, 10) || 52)),
        vidrio: Math.min(100, Math.max(0, parseInt(t.vidrio, 10) || 82)),
      });
    } catch { tema = ""; }

    await env.DB.prepare(
      "UPDATE usuarios SET marco = ?, banda = ?, lema = ?, tema = ? WHERE id = ?")
      .bind(marco, banda, lema, tema, u.id).run();
    return json({ ok: true, marco, banda, lema, tema });
  }

  return json({ error: "no sé qué hacer" }, 400);
};
