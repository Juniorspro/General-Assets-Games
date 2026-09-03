import { json, preflight, exigirSesion } from "./_comun.js";
export const onRequestOptions = preflight;

/* Genera el adorno de una publicación: un objeto suelto sobre pantalla verde.
   El recorte lo hace la app en el teléfono, con canvas: el verde se saca ahí y
   no acá, porque el plan gratis de Workers corta a los 10 ms de CPU y pasar un
   millón de píxeles no entra. */

const MODELO = "@cf/black-forest-labs/flux-1-schnell";
const MODELO_TEXTO = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/* Las estéticas de la casa, resueltas sin gastar una llamada. La clave es lo que
   se busca en el título y en el texto; el valor es qué objeto pedirle al modelo. */
const CONOCIDOS = [
  [/west|wést|cowboy|vaquer|far ?west|rodeo/i,        "a brown leather cowboy hat"],
  [/halloween|terror|zombi|calabaza/i,                 "a carved glowing Halloween pumpkin"],
  [/primavera|flor|jardin|jardín/i,                    "a bouquet of bright spring flowers"],
  [/rey|reina|realeza|corona|coronaci/i,               "a golden royal crown with red velvet"],
  [/euphoria|glitter|brillo|purpurina/i,               "a shiny disco ball covered in glitter"],
  [/ice|hielo|invierno|nieve|frozen/i,                 "a cluster of blue ice crystals"],
  [/pirata|corsario|calavera/i,                        "a black pirate tricorn hat"],
  [/semaforo|semáforo/i,                               "a small traffic light with glowing lights"],
  [/audio ?car|parlante|sonido|bass/i,                 "a big black concert speaker"],
  [/egresad|promo|graduaci/i,                          "a graduation cap with a golden tassel"],
  [/amigo|amistad/i,                                   "two clinking beer mugs"],
  [/cumple|aniversario/i,                              "a slice of birthday cake with a candle"],
  [/navidad|fin de año|año nuevo/i,                    "a bunch of golden party balloons"],
  [/carnaval|murga|comparsa/i,                         "a colorful feathered carnival mask"],
  [/verano|playa|pool|pileta/i,                        "a pair of sunglasses and a tropical drink"],
];

/* Si no pega ninguna, que lo elija la IA: una cosa sola, nombrada en inglés. */
async function elegirObjeto(env, pista) {
  const r = await env.AI.run(MODELO_TEXTO, {
    messages: [
      { role: "system", content:
        "You name ONE physical prop object that represents a party theme, for a product photo. " +
        "Answer with a short English noun phrase and nothing else, 3 to 7 words, starting with 'a' or 'an'. " +
        "It must be a single inanimate object. Never people, never faces, never text or logos. " +
        "Examples: a brown leather cowboy hat / a carved glowing pumpkin / a golden royal crown." },
      { role: "user", content: pista },
    ],
    max_tokens: 40,
    temperature: 0.4,
  });
  const t = String(r?.response || "").trim().split("\n")[0]
    .replace(/^["'`\s.\-*]+|["'`\s.]+$/g, "").slice(0, 70);
  return /^(a|an|the)\s/i.test(t) ? t : "";
}

export function objetoDe(texto) {
  for (const [re, objeto] of CONOCIDOS) if (re.test(texto)) return objeto;
  return "";
}

const ENCUADRE =
  ", single object, centered, full object visible with margin around it, studio product photo, " +
  "sharp focus, isolated on a completely flat solid chroma key green screen background, " +
  "pure bright #00FF00 green, uniform background with no gradient, no vignette, no shadow on the " +
  "background, no floor, no text, no watermark, no people, " +
  /* el rebote verde de la pantalla sobre el objeto es lo que dejaba halo al recortar */
  "the object itself has no green tint and no green reflections on it, flat even lighting";

export async function onRequestPost({ request, env }) {
  if (!(await exigirSesion(request, env))) return json({ error: "Volvé a iniciar sesión." }, 401);
  if (!env.AI) return json({ error: "La IA no está disponible." }, 503);

  let b; try { b = await request.json(); } catch { return json({ error: "cuerpo inválido" }, 400); }
  const pista = String(b.pista || "").slice(0, 300).trim();
  /* el dueño puede escribir él mismo qué quiere: «un sombrero de paja» */
  const pedido = String(b.objeto || "").slice(0, 90).trim();

  if (!pista && !pedido) return json({ error: "Decime de qué va la fiesta." }, 400);

  let objeto = pedido;
  let deDonde = "pedido";
  if (!objeto) {
    objeto = objetoDe(pista);
    deDonde = "tabla";
    if (!objeto) {
      try { objeto = await elegirObjeto(env, pista); deDonde = "ia"; } catch {}
    }
    if (!objeto) { objeto = "a shiny disco ball"; deDonde = "por defecto"; }
  }

  let img = "";
  try {
    const r = await env.AI.run(MODELO, { prompt: objeto + ENCUADRE, steps: 6 });
    img = String(r?.image || "");
  } catch (e) {
    return json({ error: "No pude generar el adorno. Probá de nuevo." }, 502);
  }
  if (!img) return json({ error: "El generador no devolvió nada. Probá de nuevo." }, 502);

  return json({ objeto, deDonde, imagen: "data:image/jpeg;base64," + img });
}
