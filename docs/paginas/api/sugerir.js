import { json, preflight, exigirSesion } from "./_comun.js";
import { limpiarPublicacion } from "./_pub.js";
import { proponer } from "./_ia.js";
import { sincronizar } from "./_ig.js";
import { traerHistorias, bajarMedio } from "./_historias.js";
export const onRequestOptions = preflight;

/* El botón «Nuevo» de la app: mira lo último de Instagram —las publicaciones del
   feed y las historias— y arma las que valen la pena, pero NO las sube. Devuelve
   los candidatos para que el dueño los mire y toque publicar el que quiera.
   Un posteo no se propone dos veces: al publicarlo queda su código en `origen`. */

const CUENTA    = "iblo_eventos";
const TOPE      = 4;    /* por vuelta; la app encadena vueltas y va mostrando el avance */
const MINIMO    = 30;   /* pie de foto más corto que esto no se mira */
const GRACIA    = 6 * 3600e3;

/* Un pie de foto que no nombra ni una fecha ni un precio no anuncia nada: son las
   fotos de la fiesta del finde, los agradecimientos, los memes. Se descartan sin
   gastar una llamada a la IA, y de paso evita que invente una fecha que no existe.
   A las historias no se les aplica: no tienen texto, la imagen es todo. */
const FECHA_SUELTA = /\b\d{1,2}\s*[/.\-]\s*\d{1,2}\b|\b\d{1,2}\s+de\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)/i;
const PLATA = /\$\s*\d|\b\d{1,3}\s*mil\b|\bpreventa\b|\bentradas?\b.{0,20}\b\d/i;
export function pareceAviso(texto) {
  const t = String(texto || "");
  return FECHA_SUELTA.test(t) || PLATA.test(t);
}

/* Los códigos de historia se guardan con prefijo para no chocar con los del feed */
const claveHistoria = (id) => "st:" + id;

export async function onRequestPost({ request, env }) {
  const usuario = await exigirSesion(request, env);
  if (!usuario) return json({ error: "Volvé a iniciar sesión." }, 401);
  if (!env.AI) return json({ error: "La IA no está disponible." }, 503);
  if (!env.DB) return json({ error: "sin base de datos" }, 503);

  /* Lo que ya se usó alguna vez, sea posteo o historia, y lo que ya se miró y no
     servía. Sin lo segundo, tocar «Buscar» de nuevo volvía a masticar los mismos
     y nunca avanzaba al resto. */
  const usados = new Set(
    ((await env.DB.prepare(
      "SELECT origen FROM publicaciones WHERE origen IS NOT NULL"
    ).all()).results || []).map((r) => r.origen)
  );
  for (const r of ((await env.DB.prepare("SELECT clave FROM revisados").all()).results || [])) {
    usados.add(r.clave);
  }

  const descartadas = [];

  /* Se anota sólo lo que no va a cambiar por volver a intentarlo. Un «no la pude
     leer» es pasajero y merece otra oportunidad la próxima vez. */
  const anotar = (clave, motivo) =>
    env.DB.prepare("INSERT OR IGNORE INTO revisados (clave, motivo, cuando) VALUES (?,?,?)")
      .bind(clave, motivo, Date.now()).run().catch(() => {});
  const cola = [];      /* lo que se va a pensar, en orden de prioridad */

  /* ---------- 1. las historias, que son lo más fresco ---------- */
  let hist = { historias: [] };
  try { hist = await traerHistorias(CUENTA); } catch (e) { hist = { error: String(e).slice(0, 90) }; }

  for (const h of hist.historias || []) {
    if (usados.has(claveHistoria(h.id))) continue;
    cola.push({ de: "historia", clave: claveHistoria(h.id), medio: h.medio });
  }
  const historiasNuevas = cola.length;

  /* ---------- 2. las publicaciones del feed ---------- */
  let sync = null;
  try { sync = await sincronizar(env); } catch (e) { sync = { error: String(e).slice(0, 120) }; }

  const r = await env.DB.prepare(
    `SELECT codigo, texto, imagen FROM ig WHERE length(texto) >= ? ORDER BY publicado DESC LIMIT 12`
  ).bind(MINIMO).all();

  for (const post of r.results || []) {
    if (usados.has(post.codigo)) continue;
    if (!pareceAviso(post.texto)) {
      descartadas.push({ codigo: post.codigo, de: "publicación", por: "no anuncia nada, son fotos o saludos" });
      await anotar(post.codigo, "no anuncia nada");
      continue;
    }
    cola.push({ de: "publicacion", clave: post.codigo, texto: post.texto, imagenYa: post.imagen || "" });
  }

  if (!cola.length) {
    return json({ candidatos: [], descartadas, revisados: 0, sync,
                  historias: hist.error ? { error: hist.error } : { total: (hist.historias || []).length },
                  sinNovedad: true });
  }

  const quedan = Math.max(0, cola.length - TOPE);
  const mirar = cola.slice(0, TOPE);

  /* ---------- 3. pensarlas, de a una ----------
     En paralelo la IA se degrada y devuelve cualquier cosa; medido y sufrido. */
  const candidatos = [];
  const ahora = Date.now();

  for (const it of mirar) {
    let imagen = it.imagenYa || "";
    if (it.de === "historia") {
      try { imagen = await bajarMedio(it.medio); } catch { imagen = ""; }
      if (!imagen) {
        descartadas.push({ codigo: it.clave, de: "historia", por: "no pude bajar la imagen" });
        continue;
      }
      /* El dueño sube el mismo flyer en varias historias seguidas. Antes se
         gastaba una lectura de IA en cada una para descubrir después que eran
         la misma. Con una huella de la imagen se saltean sin gastar nada. */
      const huella = "h:" + imagen.length + ":" +
        imagen.slice(200, 260) + imagen.slice(-40);
      if (usados.has(huella)) {
        descartadas.push({ codigo: it.clave, de: "historia", por: "es la misma imagen que otra" });
        await anotar(it.clave, "imagen repetida");
        continue;
      }
      usados.add(huella);
      await anotar(huella, "huella de imagen");

      /* La guardamos igual que un posteo: así al publicar la app manda sólo el
         código y la foto no viaja de vuelta —son cientos de kilobytes— y de paso
         queda registrada para no volver a bajarla. */
      await env.DB.prepare(
        "INSERT OR IGNORE INTO ig (codigo, texto, imagen, tipo, publicado, guardado) VALUES (?,?,?,?,?,?)"
      ).bind(it.clave, "", imagen, "historia", Date.now(), Date.now()).run();
    }

    let res;
    try { res = await proponer(env, it.texto || "", imagen, { sinRedactar: true }); }
    catch { res = { error: "no la pude leer" }; }
    if (res.error) { descartadas.push({ codigo: it.clave, de: it.de, por: res.error }); continue; }

    const p = res.propuesta, ms = res.cuandoMs;

    if (ms && ms < ahora - GRACIA) {
      descartadas.push({ codigo: it.clave, de: it.de, por: "la fecha ya pasó" });
      await anotar(it.clave, "fecha vieja"); continue;
    }
    if (!ms && !p.precio) {
      descartadas.push({ codigo: it.clave, de: it.de, por: "no dice ni fecha ni precio" });
      await anotar(it.clave, "sin fecha ni precio"); continue;
    }

    const { error, fila } = limpiarPublicacion({ ...p, cuando: ms, destacado: false });
    if (error) { descartadas.push({ codigo: it.clave, de: it.de, por: error }); continue; }

    /* Dos historias seguidas suelen ser de la misma fiesta: la primera con el
       flyer y la segunda con el precio. Si ya hay un candidato igual en esta
       misma tanda, no se ofrece dos veces; se le completa lo que le falte. */
    const igual = candidatos.find((c) =>
      c.titulo.toLowerCase() === fila.titulo.toLowerCase() ||
      (ms > 0 && c.cuando > 0 && Math.abs(c.cuando - ms) < 43200000));
    if (igual) {
      for (const campo of ["subtitulo","detalle","fecha","lugar","hora","precio"]) {
        if (!igual[campo] && fila[campo]) igual[campo] = fila[campo];
      }
      if (!igual.cuando && ms) igual.cuando = ms;
      igual.juntadas = (igual.juntadas || 1) + 1;
      continue;
    }

    /* ¿ya hay una publicación de esta misma fiesta? Mismo día o mismo nombre.
       No la descartamos: puede traer un dato que a la otra le falta —el precio,
       casi siempre, porque en la historia lo ponen y en el posteo no—. */
    const repe = await env.DB.prepare(
      `SELECT id, titulo, precio, imagen FROM publicaciones
       WHERE estado = 'publicada'
         AND ((? > 0 AND cuando > 0 AND abs(cuando - ?) < 43200000) OR lower(titulo) = lower(?))
       LIMIT 1`
    ).bind(ms, ms, fila.titulo).first();

    let yaEsta = null;
    if (repe) {
      const suma = [];
      if (fila.precio && !repe.precio) suma.push("el precio");
      if (fila.imagen && !repe.imagen) suma.push("la foto");
      yaEsta = { id: repe.id, titulo: repe.titulo, suma };
      if (!suma.length) {
        /* nada nuevo que aportar: se anota el origen para no volver a mirarla */
        await env.DB.prepare(
          "UPDATE publicaciones SET origen = ? WHERE id = ? AND origen IS NULL"
        ).bind(it.clave, repe.id).run();
        descartadas.push({ codigo: it.clave, de: it.de,
                           por: "ya estaba publicada («" + repe.titulo + "»)" });
        await anotar(it.clave, "ya publicada"); continue;
      }
    }

    /* la foto no viaja: ya está del lado del servidor, se busca por el código */
    const { imagen: _f, ...liviana } = fila;
    candidatos.push({ ...liviana, codigo: it.clave, de: it.de, conFoto: !!imagen,
                      yaEsta, falta: p.falta || [] });
  }

  return json({
    candidatos, descartadas, revisados: mirar.length, quedan, sync,
    historias: hist.error ? { error: hist.error } : { total: (hist.historias || []).length, nuevas: historiasNuevas },
  });
}
