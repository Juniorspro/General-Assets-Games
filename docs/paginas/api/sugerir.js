import { json, preflight, exigirSesion } from "./_comun.js";
import { limpiarPublicacion, guardar } from "./_pub.js";
import { proponer, sinAdornos } from "./_ia.js";
import { sincronizar } from "./_ig.js";
export const onRequestOptions = preflight;

/* El botón «Nuevo» de la app: trae lo último de Instagram y publica en la web
   lo que sirva. Un posteo por publicación, y nunca dos veces el mismo (queda
   guardado el código del posteo en `origen`). */

const CUANTOS = 5;      /* posteos que revisa por toque */
const MINIMO  = 30;     /* pie de foto más corto que esto no se mira */
const GRACIA  = 6 * 3600e3;

/* Un pie de foto que no nombra ni una fecha ni un precio no anuncia nada: son las
   fotos de la fiesta del finde, los agradecimientos, los memes. Se descartan sin
   gastar una llamada a la IA, y de paso evita que invente una fecha que no existe. */
const FECHA_SUELTA = /\b\d{1,2}\s*[/.\-]\s*\d{1,2}\b|\b\d{1,2}\s+de\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)/i;
const PLATA = /\$\s*\d|\b\d{1,3}\s*mil\b|\bpreventa\b|\bentradas?\b.{0,20}\b\d/i;
export function pareceAviso(texto) {
  const t = String(texto || "");
  return FECHA_SUELTA.test(t) || PLATA.test(t);
}

export async function onRequestPost({ request, env }) {
  const usuario = await exigirSesion(request, env);
  if (!usuario) return json({ error: "Volvé a iniciar sesión." }, 401);
  if (!env.AI) return json({ error: "La IA no está disponible." }, 503);
  if (!env.DB) return json({ error: "sin base de datos" }, 503);

  /* primero traemos lo último de Instagram, para pensar con datos frescos */
  let sync = null;
  try { sync = await sincronizar(env); } catch (e) { sync = { error: String(e).slice(0, 120) }; }

  /* los posteos que todavía no se usaron para publicar nada */
  const r = await env.DB.prepare(
    `SELECT codigo, texto, imagen, publicado FROM ig
     WHERE length(texto) >= ?
       AND codigo NOT IN (SELECT origen FROM publicaciones WHERE origen IS NOT NULL)
     ORDER BY publicado DESC LIMIT ?`
  ).bind(MINIMO, CUANTOS).all();
  const posts = r.results || [];
  if (!posts.length) return json({ creadas: [], descartadas: [], revisados: 0, sync, sinNovedad: true });

  const descartadas = [];
  const candidatos = posts.filter((p) => {
    if (pareceAviso(p.texto)) return true;
    descartadas.push({ codigo: p.codigo, por: "no anuncia nada, son fotos o saludos" });
    return false;
  });

  /* Cada posteo se piensa con el mismo motor que usa el asistente: el pie de
     foto hace de «lo que dijo el dueño» y la foto de flyer. Todos a la vez. */
  const pensados = await Promise.all(
    candidatos.map((p) =>
      proponer(env, p.texto, p.imagen || "").catch(() => ({ error: "no la pude leer" }))
    )
  );

  const ahora = Date.now();
  const creadas = [];

  for (let i = 0; i < candidatos.length; i++) {
    const post = candidatos[i], res = pensados[i];
    if (res.error) { descartadas.push({ codigo: post.codigo, por: res.error }); continue; }

    const p = res.propuesta, ms = res.cuandoMs;

    /* un aviso de una fiesta que ya pasó no es novedad */
    if (ms && ms < ahora - GRACIA) {
      descartadas.push({ codigo: post.codigo, por: "la fecha ya pasó" });
      continue;
    }
    /* sin fecha y sin precio no hay nada que anunciar */
    if (!ms && !p.precio) {
      descartadas.push({ codigo: post.codigo, por: "no dice ni fecha ni precio" });
      continue;
    }

    /* El dueño suele tener la fiesta ya cargada a mano antes de postearla en IG.
       Si hay una publicada con la misma fecha (mismo día) o el mismo nombre, es
       la misma: no la duplicamos, sólo dejamos anotado de qué posteo salió para
       no volver a mirarlo. */
    const repe = await env.DB.prepare(
      `SELECT id, titulo FROM publicaciones
       WHERE estado = 'publicada'
         AND ((? > 0 AND cuando > 0 AND abs(cuando - ?) < 43200000)
              OR lower(titulo) = lower(?))
       LIMIT 1`
    ).bind(ms, ms, p.titulo).first();
    if (repe) {
      await env.DB.prepare(
        "UPDATE publicaciones SET origen = ? WHERE id = ? AND origen IS NULL"
      ).bind(post.codigo, repe.id).run();
      descartadas.push({ codigo: post.codigo, por: "ya estaba publicada («" + repe.titulo + "»)" });
      continue;
    }

    const { error, fila } = limpiarPublicacion({
      ...p,
      cuando: ms,
      imagen: post.imagen || "",
      destacado: false,   // la portada la gana sola la fecha más cercana
    });
    if (error) { descartadas.push({ codigo: post.codigo, por: error }); continue; }

    const id = await guardar(env, fila, usuario, post.codigo);
    /* la foto no vuelve en la respuesta: son cientos de kilobytes cada una */
    const { imagen, ...sinFoto } = fila;
    creadas.push({ id, ...sinFoto, conFoto: !!imagen, codigo: post.codigo });
  }

  return json({ creadas, descartadas, revisados: posts.length, sync });
}
