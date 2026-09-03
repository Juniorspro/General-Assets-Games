/* Todo lo que el dueño publica vive en una sola tabla: `publicaciones`.
   El `tipo` decide en qué solapa de la web aparece. */

export const TIPOS = ["proximamente", "entrada", "aviso"];

export const COLORES = {
  magenta: "#ff1e8e", violeta: "#c34bff", oro: "#e8bf4e", verde: "#2ce65a",
  cian: "#2fd8e8", rojo: "#ff2020", naranja: "#e8863a", blanco: "#f4f1f6",
};

export const CAMPOS =
  "id, tipo, titulo, subtitulo, detalle, fecha, cuando, lugar, hora, precio, color, imagen, destacado, creado";

/* El orden con el que se leen: lo que todavía no pasó primero y por fecha,
   y lo que no tiene fecha (los avisos) por cuándo se cargó. */
export const ORDEN =
  "ORDER BY (cuando IS NULL OR cuando = 0) ASC, cuando ASC, creado DESC";

/* Las solapas de la web no miran el `tipo`, miran el contenido. Así una fiesta
   con entradas a la venta sale en las dos y el dueño no tiene que elegir bien:
     próximamente → todo lo que tiene fecha y todavía no pasó
     entradas     → todo lo que tiene precio y sigue vigente
     avisos       → lo que no tiene ni fecha ni precio
   La gracia de las seis horas es que una fiesta no desaparece de la web
   mientras todavía se está haciendo. */
const GRACIA = 6 * 3600e3;

export function filtroSolapa(solapa, ahora = Date.now()) {
  const vigente = ahora - GRACIA;
  if (solapa === "proximamente")
    return { donde: "cuando > ?", args: [vigente],
             orden: "ORDER BY cuando ASC" };
  if (solapa === "entradas")
    return { donde: "precio <> '' AND (cuando = 0 OR cuando IS NULL OR cuando > ?)", args: [vigente],
             orden: "ORDER BY (cuando IS NULL OR cuando = 0) ASC, cuando ASC, creado DESC" };
  if (solapa === "avisos")
    return { donde: "(precio = '' OR precio IS NULL) AND (cuando = 0 OR cuando IS NULL)", args: [],
             orden: "ORDER BY creado DESC" };
  return { donde: "1 = 1", args: [], orden: ORDEN };
}
export const SOLAPAS = ["proximamente", "entradas", "avisos"];

const t = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

/* Deja el cuerpo del pedido listo para guardar. Devuelve {error} si algo no va. */
export function limpiarPublicacion(b) {
  const tipo = TIPOS.includes(b.tipo) ? b.tipo : "aviso";
  const titulo = t(b.titulo, 120);
  if (!titulo) return { error: "Falta el título." };

  const imagen = String(b.imagen || "");
  if (imagen && !/^data:image\/(webp|jpeg|png);base64,/.test(imagen))
    return { error: "La imagen no tiene un formato que podamos guardar." };
  if (imagen.length > 900000)
    return { error: "La imagen pesa demasiado, sacale peso o mandá otra." };

  let cuando = Number(b.cuando || 0);
  if (!Number.isFinite(cuando) || cuando < 0) cuando = 0;

  return {
    fila: {
      tipo,
      titulo,
      subtitulo: t(b.subtitulo, 120),
      detalle: t(b.detalle, 1200),
      fecha: t(b.fecha, 30),
      cuando,
      lugar: t(b.lugar, 120),
      hora: t(b.hora, 30),
      precio: t(b.precio, 60),
      color: COLORES[b.color] ? b.color : "magenta",
      imagen,
      /* sólo un «próximamente» puede ocupar el cartel de la portada */
      destacado: tipo === "proximamente" && b.destacado !== false ? 1 : 0,
    },
  };
}

/* Guarda una publicación nueva. Si es la destacada, le saca el cartel a la anterior. */
export async function guardar(env, fila, autor) {
  const ahora = Date.now();
  if (fila.destacado) {
    await env.DB.prepare(
      "UPDATE publicaciones SET destacado = 0 WHERE destacado = 1"
    ).run();
  }
  const r = await env.DB.prepare(
    `INSERT INTO publicaciones
       (tipo, titulo, subtitulo, detalle, fecha, cuando, lugar, hora, precio,
        color, imagen, destacado, estado, autor, creado, tocado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'publicada',?,?,?)`
  ).bind(
    fila.tipo, fila.titulo, fila.subtitulo, fila.detalle, fila.fecha, fila.cuando,
    fila.lugar, fila.hora, fila.precio, fila.color, fila.imagen, fila.destacado,
    autor, ahora, ahora
  ).run();
  return r.meta?.last_row_id;
}
